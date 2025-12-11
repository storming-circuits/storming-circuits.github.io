// Friends system logic

// Fetch a user's public profile summary
async function getUserProfileByUid(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    const data = doc.data();
    return {
      uid,
      username: data.profile?.username || '',
      email: data.email || '',
      phone: data.profile?.phone || data.phone || '',
      displayName: data.displayName || data.profile?.name || '',
    };
  } catch (error) {
    console.error('Error fetching user profile by uid:', error);
    return null;
  }
}

// Search user by username (fast path), email, or phone
async function searchUserByQuery(query) {
  const searchText = (query || '').trim().toLowerCase();
  if (!searchText) return null;

  try {
    // Username fast lookup
    const usernameDoc = await db.collection('usernames').doc(searchText).get();
    if (usernameDoc.exists) {
      const uid = usernameDoc.data().uid;
      const profile = await getUserProfileByUid(uid);
      return profile ? [profile] : [];
    }

    // Email search
    if (searchText.includes('@')) {
      const snap = await db.collection('users').where('email', '==', query.trim()).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data();
        return [{
          uid: doc.id,
          username: data.profile?.username || '',
          email: data.email || '',
          phone: data.profile?.phone || data.phone || '',
          displayName: data.displayName || data.profile?.name || '',
        }];
      }
    }

    // Phone search
    const phoneSnap = await db.collection('users').where('profile.phone', '==', query.trim()).limit(1).get();
    if (!phoneSnap.empty) {
      const doc = phoneSnap.docs[0];
      const data = doc.data();
      return [{
        uid: doc.id,
        username: data.profile?.username || '',
        email: data.email || '',
        phone: data.profile?.phone || data.phone || '',
        displayName: data.displayName || data.profile?.name || '',
      }];
    }
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }

  return [];
}

// Friend request actions
async function sendFriendRequest(targetUid) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  if (user.uid === targetUid) return { success: false, error: 'Cannot add yourself' };

  try {
    const now = firebase.firestore.FieldValue.serverTimestamp();

    // Create request in target inbox (use sender uid as doc id to keep unique)
    await db.collection('users').doc(targetUid)
      .collection('friendRequests')
      .doc(user.uid)
      .set({
        from: user.uid,
        status: 'pending',
        timestamp: now
      });

    // Track sent requests for the sender
    await db.collection('users').doc(user.uid)
      .collection('sentRequests')
      .doc(targetUid)
      .set({
        to: targetUid,
        status: 'pending',
        timestamp: now
      });

    return { success: true };
  } catch (error) {
    console.error('sendFriendRequest error:', error);
    return { success: false, error: error.message };
  }
}

async function acceptFriendRequest(requestId) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  try {
    const reqRef = db.collection('users').doc(user.uid).collection('friendRequests').doc(requestId);
    const reqDoc = await reqRef.get();
    if (!reqDoc.exists) return { success: false, error: 'Request not found' };
    const fromUid = reqDoc.data().from;

    // Update request status
    await reqRef.update({ status: 'accepted', handledAt: firebase.firestore.FieldValue.serverTimestamp() });

    // Update sender sentRequests
    await db.collection('users').doc(fromUid).collection('sentRequests').doc(user.uid)
      .set({ status: 'accepted', handledAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

    // Create friend links both ways
    await db.collection('users').doc(user.uid).collection('friends').doc(fromUid).set({ connectedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection('users').doc(fromUid).collection('friends').doc(user.uid).set({ connectedAt: firebase.firestore.FieldValue.serverTimestamp() });

    return { success: true };
  } catch (error) {
    console.error('acceptFriendRequest error:', error);
    return { success: false, error: error.message };
  }
}

async function declineFriendRequest(requestId) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  try {
    const reqRef = db.collection('users').doc(user.uid).collection('friendRequests').doc(requestId);
    const reqDoc = await reqRef.get();
    if (!reqDoc.exists) return { success: false, error: 'Request not found' };
    const fromUid = reqDoc.data().from;

    await reqRef.update({ status: 'declined', handledAt: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection('users').doc(fromUid).collection('sentRequests').doc(user.uid)
      .set({ status: 'declined', handledAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('declineFriendRequest error:', error);
    return { success: false, error: error.message };
  }
}

async function cancelFriendRequest(targetUid) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  try {
    // Remove from target inbox
    await db.collection('users').doc(targetUid).collection('friendRequests').doc(user.uid).delete().catch(() => {});
    // Update sender record
    await db.collection('users').doc(user.uid).collection('sentRequests').doc(targetUid)
      .set({ status: 'cancelled', handledAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('cancelFriendRequest error:', error);
    return { success: false, error: error.message };
  }
}

// Helpers to load lists
async function loadIncomingRequests() {
  const user = getCurrentUser();
  if (!user) return [];
  const snap = await db.collection('users').doc(user.uid)
    .collection('friendRequests')
    .orderBy('timestamp', 'desc')
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadSentRequests() {
  const user = getCurrentUser();
  if (!user) return [];
  const snap = await db.collection('users').doc(user.uid)
    .collection('sentRequests')
    .orderBy('timestamp', 'desc')
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadFriends() {
  const user = getCurrentUser();
  if (!user) return [];
  const snap = await db.collection('users').doc(user.uid)
    .collection('friends')
    .get();
  return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
}

// UI rendering
function renderUserCard(profile, actionButtons = '') {
  return `
    <div class="activity-item">
      <div class="activity-details">
        <span class="activity-type">${profile.username || profile.displayName || 'Unknown'}</span>
        <span class="activity-subject">${profile.email || ''}</span>
        ${profile.phone ? `<span class="activity-duration">${profile.phone}</span>` : ''}
      </div>
      <div style="display:flex; gap:0.5rem; align-items:center;">${actionButtons}</div>
    </div>
  `;
}

async function handleFriendSearch() {
  const input = document.getElementById('friendSearchInput');
  const resultDiv = document.getElementById('friendSearchResult');
  if (!input || !resultDiv) return;
  const query = input.value.trim();
  if (!query) {
    resultDiv.innerHTML = '<p class="no-activities">Enter a username, email, or phone.</p>';
    return;
  }
  resultDiv.innerHTML = '<p class="no-activities">Searching...</p>';

  try {
    const results = await searchUserByQuery(query);
    const user = getCurrentUser();
    if (!results || results.length === 0) {
      resultDiv.innerHTML = '<p class="no-activities">User not found.</p>';
      return;
    }

    const cards = await Promise.all(results.map(async (profile) => {
      if (user && profile.uid === user.uid) {
        return renderUserCard(profile, '<span class="activity-duration">This is you</span>');
      }

      const status = await getFriendStatus(profile.uid);
      let buttons = '';
      if (status === 'friends') {
        buttons = `<a class="btn-secondary" href="friend-stats.html?uid=${profile.uid}">View Stats</a>`;
      } else if (status === 'pending') {
        buttons = `<button class="btn-secondary" onclick="cancelFriendRequest('${profile.uid}')">Cancel Request</button>`;
      } else if (status === 'incoming') {
        buttons = `
          <button class="btn-primary" onclick="acceptFriendRequest('${profile.uid}')">Accept</button>
          <button class="btn-secondary" onclick="declineFriendRequest('${profile.uid}')">Decline</button>
        `;
      } else {
        buttons = `<button class="btn-primary" onclick="sendFriendRequest('${profile.uid}')">Send Request</button>`;
      }
      return renderUserCard(profile, buttons);
    }));

    resultDiv.innerHTML = cards.join('');
  } catch (error) {
    console.error('Search error:', error);
    resultDiv.innerHTML = `<p class="no-activities">Error: ${error.message}</p>`;
  }
}

// Determine relationship state with target
async function getFriendStatus(targetUid) {
  const user = getCurrentUser();
  if (!user) return 'none';

  // Friends
  const friendDoc = await db.collection('users').doc(user.uid).collection('friends').doc(targetUid).get();
  if (friendDoc.exists) return 'friends';

  // Incoming
  const incomingDoc = await db.collection('users').doc(user.uid).collection('friendRequests').doc(targetUid).get();
  if (incomingDoc.exists && incomingDoc.data().status === 'pending') return 'incoming';

  // Sent
  const sentDoc = await db.collection('users').doc(user.uid).collection('sentRequests').doc(targetUid).get();
  if (sentDoc.exists && sentDoc.data().status === 'pending') return 'pending';

  return 'none';
}

async function refreshRequestsAndFriends() {
  const incomingContainer = document.getElementById('incomingRequests');
  const sentContainer = document.getElementById('sentRequests');
  const friendsContainer = document.getElementById('friendsList');

  // Incoming
  const incoming = await loadIncomingRequests();
  if (incomingContainer) {
    if (incoming.length === 0) {
      incomingContainer.innerHTML = '<p class="no-activities">No incoming requests.</p>';
    } else {
      const cards = await Promise.all(incoming.map(async (req) => {
        const profile = await getUserProfileByUid(req.from);
        const info = profile || { username: req.from, email: '', phone: '' };
        return renderUserCard(info, `
          <button class="btn-primary" onclick="acceptFriendRequest('${req.id}')">Accept</button>
          <button class="btn-secondary" onclick="declineFriendRequest('${req.id}')">Decline</button>
        `);
      }));
      incomingContainer.innerHTML = cards.join('');
    }
  }

  // Sent
  const sent = await loadSentRequests();
  if (sentContainer) {
    if (sent.length === 0) {
      sentContainer.innerHTML = '<p class="no-activities">No sent requests.</p>';
    } else {
      const cards = await Promise.all(sent.map(async (req) => {
        const profile = await getUserProfileByUid(req.to || req.id);
        const info = profile || { username: req.to || req.id, email: '', phone: '' };
        return renderUserCard(info, `
          ${req.status === 'pending' ? `<button class="btn-secondary" onclick="cancelFriendRequest('${req.to || req.id}')">Cancel</button>` : `<span class="activity-duration">${req.status}</span>`}
        `);
      }));
      sentContainer.innerHTML = cards.join('');
    }
  }

  // Friends
  const friends = await loadFriends();
  if (friendsContainer) {
    if (friends.length === 0) {
      friendsContainer.innerHTML = '<p class="no-activities">No friends yet.</p>';
    } else {
      const cards = await Promise.all(friends.map(async (f) => {
        const profile = await getUserProfileByUid(f.uid);
        const info = profile || { username: f.uid, email: '' };
        return renderUserCard(info, `<a class="btn-primary" href="friend-stats.html?uid=${f.uid}">View Stats</a>`);
      }));
      friendsContainer.innerHTML = cards.join('');
    }
  }
}

function initFriendsPage() {
  refreshRequestsAndFriends();
}

// Export globally
if (typeof window !== 'undefined') {
  window.handleFriendSearch = handleFriendSearch;
  window.sendFriendRequest = sendFriendRequest;
  window.acceptFriendRequest = acceptFriendRequest;
  window.declineFriendRequest = declineFriendRequest;
  window.cancelFriendRequest = cancelFriendRequest;
  window.initFriendsPage = initFriendsPage;
  window.refreshRequestsAndFriends = refreshRequestsAndFriends;
}

