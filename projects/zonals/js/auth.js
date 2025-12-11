// Authentication Functions

// Check if username is available (case-insensitive)
async function isUsernameAvailable(username) {
  const usernameKey = username.toLowerCase();
  const doc = await db.collection('usernames').doc(usernameKey).get();
  return !doc.exists;
}

function sanitizeUsername(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function generateAvailableUsername(base) {
  let candidate = sanitizeUsername(base) || 'user';
  if (candidate.length < 3) candidate = `user${Math.floor(Math.random() * 1000)}`;

  // Try candidate, then append numbers
  if (await isUsernameAvailable(candidate)) return candidate;
  for (let i = 1; i <= 50; i++) {
    const trial = `${candidate}${i}`;
    if (await isUsernameAvailable(trial)) return trial;
  }
  return `user${Date.now()}`;
}

// Ensure a user has a username and mapping in usernames collection
async function ensureUsernameMapping(user) {
  if (!user) return;
  const userRef = db.collection('users').doc(user.uid);
  const doc = await userRef.get();
  const data = doc.exists ? doc.data() : {};
  const profile = data.profile || {};
  let username = profile.username || '';

  if (!username) {
    const base = (user.email && user.email.split('@')[0]) || user.displayName || 'user';
    username = await generateAvailableUsername(base);
    await userRef.set({
      profile: {
        ...profile,
        username,
        phone: profile.phone || data.phone || '',
        contactNumber: profile.contactNumber || profile.phone || data.phone || ''
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  const key = username.toLowerCase();
  const unameDoc = await db.collection('usernames').doc(key).get();
  if (!unameDoc.exists) {
    await db.collection('usernames').doc(key).set({
      uid: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

// Sign up new user
// Added username (required) and phone (optional)
async function signUp(email, password, displayName, username, phone = '') {
  try {
    const usernameKey = (username || '').trim().toLowerCase();
    if (!usernameKey) {
      return { success: false, error: 'Username is required' };
    }

    // Enforce allowed characters for username
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(usernameKey)) {
      return { success: false, error: 'Username can only contain letters, numbers, and underscores' };
    }

    // Ensure username is unique via usernames collection
    const available = await isUsernameAvailable(usernameKey);
    if (!available) {
      return { success: false, error: 'Username already taken. Please choose another.' };
    }

    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: displayName });
    
    // Create user document in Firestore with proper error handling
    try {
      await db.collection('users').doc(userCredential.user.uid).set({
        email: email,
        displayName: displayName,
        phone: phone || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        profile: {
          name: displayName,
          username: usernameKey,
          phone: phone || '',
          subjects: [],
          preferences: {
            studyInterval: 45,
            breakInterval: 10,
            exerciseInterval: 15
          }
        },
        todos: [] // Initialize empty todos array
      });

      // Create usernames mapping document for fast lookup
      await db.collection('usernames').doc(usernameKey).set({
        uid: userCredential.user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (firestoreError) {
      console.error('Firestore error during signup:', firestoreError);
      // User is created but Firestore write failed - this is okay, they can still use the app
      // The document will be created on first data write
    }
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: error.message };
  }
}

// Sign in existing user
async function signIn(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Google sign-in with username auto-provision
async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    await ensureUserDocument(user);
    await ensureUsernameMapping(user);

    return { success: true, user };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return { success: false, error: error.message };
  }
}

// Sign out user
async function signOut() {
  try {
    await auth.signOut();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Check if user is authenticated
function checkAuth() {
  return new Promise((resolve) => {
    auth.onAuthStateChanged((user) => {
      resolve(user);
    });
  });
}

// Get current user
function getCurrentUser() {
  return auth.currentUser;
}

// Ensure user document exists with all required fields
async function ensureUserDocument(user) {
  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      await db.collection('users').doc(user.uid).set({
        email: user.email || '',
        displayName: user.displayName || '',
        phone: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        profile: {
          name: user.displayName || '',
          username: '',
          phone: '',
          contactNumber: '', // backward compatibility
          subjects: [],
          preferences: {
            studyInterval: 45,
            breakInterval: 10,
            exerciseInterval: 15
          }
        },
        todos: []
      });
    } else {
      // Ensure all required fields exist - use set with merge to add fields if missing
      const data = userDoc.data();
      const updates = {};
      
      if (!data.hasOwnProperty('todos')) {
        updates.todos = [];
      }
      
      if (!data.profile) {
        updates.profile = {
          name: data.displayName || '',
          username: '',
          phone: '',
          contactNumber: '',
          subjects: data.profile?.subjects || [],
          preferences: data.profile?.preferences || {
            studyInterval: 45,
            breakInterval: 10,
            exerciseInterval: 15
          }
        };
      } else {
        // Ensure profile fields exist - merge with existing profile
        const profileUpdate = { ...data.profile };
        if (!data.profile.hasOwnProperty('name')) {
          profileUpdate.name = data.displayName || '';
        }
        if (!data.profile.hasOwnProperty('username')) {
          profileUpdate.username = '';
        }
        if (!data.profile.hasOwnProperty('phone')) {
          profileUpdate.phone = data.profile.contactNumber || '';
        }
        if (!data.profile.hasOwnProperty('contactNumber')) {
          profileUpdate.contactNumber = profileUpdate.phone || '';
        }
        updates.profile = profileUpdate;
      }
      
      if (Object.keys(updates).length > 0) {
        try {
          await db.collection('users').doc(user.uid).set(updates, { merge: true });
          console.log('User document fields updated');
        } catch (updateError) {
          console.error('Error updating user document:', updateError);
          // If update fails, try to continue anyway
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error ensuring user document:', error);
    return false;
  }
}

// Save user activity log
async function saveActivityLog(activityType, duration, subject = null) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'User not authenticated' };
  
  try {
    // Ensure user document exists first
    await ensureUserDocument(user);
    
    const logEntry = {
      type: activityType, // 'study', 'break', 'exercise'
      duration: duration,
      subject: subject,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      date: new Date().toISOString().split('T')[0]
    };
    
    await db.collection('users').doc(user.uid).collection('activityLogs').add(logEntry);
    return { success: true };
  } catch (error) {
    console.error('Error saving activity log:', error);
    // Check if it's a permission error
    if (error.message && error.message.includes('permission')) {
      return { success: false, error: 'Permission denied. Please check your Firestore security rules. See README.md for setup instructions.' };
    }
    return { success: false, error: error.message };
  }
}

// Manually log study or exercise time
async function logManualActivity(activityType, duration, subject = null) {
  return await saveActivityLog(activityType, duration, subject);
}

// Save quiz score
async function saveQuizScore(score, totalQuestions, answers) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'User not authenticated' };
  
  try {
    const quizResult = {
      score: score,
      totalQuestions: totalQuestions,
      percentage: (score / totalQuestions) * 100,
      answers: answers,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      date: new Date().toISOString().split('T')[0]
    };
    
    await db.collection('users').doc(user.uid).collection('quizResults').add(quizResult);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Save routine
async function saveRoutine(routine) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'User not authenticated' };
  
  try {
    // Ensure user document exists first
    await ensureUserDocument(user);
    
    await db.collection('users').doc(user.uid).collection('routines').add({
      ...routine,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving routine:', error);
    if (error.message && error.message.includes('permission')) {
      return { success: false, error: 'Permission denied. Please check your Firestore security rules. See README.md for setup instructions.' };
    }
    return { success: false, error: error.message };
  }
}

// Save todos to Firestore (user-specific)
async function saveTodosToFirestore(todos) {
  const user = getCurrentUser();
  if (!user) {
    console.error('User not authenticated for saving todos');
    return { success: false, error: 'User not authenticated' };
  }
  
  try {
    // Ensure user document exists
    await ensureUserDocument(user);
    
    console.log('Saving todos to Firestore:', todos);
    
    // Update todos in user document
    await db.collection('users').doc(user.uid).update({
      todos: todos || [],
      todosUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Todos saved successfully to Firestore');
    return { success: true };
  } catch (error) {
    console.error('Error saving todos:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    if (error.message && error.message.includes('permission')) {
      return { success: false, error: 'Permission denied. Please check your Firestore security rules.' };
    }
    
    // If update fails, try set with merge
    try {
      console.log('Retrying with set() and merge...');
      await db.collection('users').doc(user.uid).set({
        todos: todos || [],
        todosUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log('Todos saved successfully using set() with merge');
      return { success: true };
    } catch (retryError) {
      console.error('Retry also failed:', retryError);
      return { success: false, error: retryError.message || error.message };
    }
  }
}

// Get todos from Firestore (user-specific)
async function getTodosFromFirestore() {
  const user = getCurrentUser();
  if (!user) return [];
  
  try {
    // Ensure user document exists
    await ensureUserDocument(user);
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      return data.todos || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching todos:', error);
    return [];
  }
}

// Get user profile from Firestore
async function getUserProfile() {
  const user = getCurrentUser();
  if (!user) return null;
  
  try {
    await ensureUserDocument(user);
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (userDoc.exists) {
      const data = userDoc.data();
      return {
        name: data.displayName || data.profile?.name || '',
        username: data.profile?.username || '',
        email: data.email || user.email || '',
        phone: data.profile?.phone || data.phone || '',
        contactNumber: data.profile?.contactNumber || data.profile?.phone || data.phone || '',
        subjects: data.profile?.subjects || [],
        preferences: data.profile?.preferences || {}
      };
    }
    
    // Return default values if document doesn't exist
    return {
      name: user.displayName || '',
      username: '',
      email: user.email || '',
      phone: '',
      contactNumber: '',
      subjects: [],
      preferences: {}
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return {
      name: user.displayName || '',
      username: '',
      email: user.email || '',
      phone: '',
      contactNumber: '',
      subjects: [],
      preferences: {}
    };
  }
}

// Save user profile to Firestore
async function saveUserProfile(profileData) {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }
  
  try {
    await ensureUserDocument(user);
    
    // Update Firebase Auth display name if name changed
    if (profileData.name && profileData.name !== user.displayName) {
      try {
        await user.updateProfile({ displayName: profileData.name });
      } catch (updateError) {
        console.error('Error updating display name:', updateError);
        // Continue even if display name update fails
      }
    }
    
    // Get existing profile data to preserve subjects and preferences
    const userDoc = await db.collection('users').doc(user.uid).get();
    const existingData = userDoc.exists ? userDoc.data() : {};
    const existingProfile = existingData.profile || {};
    
    // Update Firestore document - preserve existing profile fields
    const updateData = {
      displayName: profileData.name || '',
      email: profileData.email || user.email || '',
      profile: {
        ...existingProfile, // Preserve existing profile data
        name: profileData.name || '',
        username: profileData.username || '',
        contactNumber: profileData.contactNumber || '',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Use merge to preserve existing data
    await db.collection('users').doc(user.uid).set(updateData, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error saving user profile:', error);
    if (error.message && error.message.includes('permission')) {
      return { success: false, error: 'Permission denied. Please check your Firestore security rules.' };
    }
    return { success: false, error: error.message };
  }
}

// Save computed stats (productivity & wellness) for sharing with friends
async function saveUserStats(productivityScore, wellnessScore) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'User not authenticated' };

  try {
    await ensureUserDocument(user);
    await db.collection('users')
      .doc(user.uid)
      .collection('stats')
      .doc('latest')
      .set({
        productivityScore: productivityScore || 0,
        wellnessScore: wellnessScore || 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error saving user stats:', error);
    return { success: false, error: error.message };
  }
}

// Export functions globally
if (typeof window !== 'undefined') {
  window.getTodosFromFirestore = getTodosFromFirestore;
  window.saveTodosToFirestore = saveTodosToFirestore;
  window.logManualActivity = logManualActivity;
  window.ensureUserDocument = ensureUserDocument;
  window.saveRoutine = saveRoutine;
  window.getUserProfile = getUserProfile;
  window.saveUserProfile = saveUserProfile;
  window.isUsernameAvailable = isUsernameAvailable;
  window.saveUserStats = saveUserStats;
  window.signInWithGoogle = signInWithGoogle;
}

// Get user activity logs (user-specific)
async function getUserActivityLogs(days = 7) {
  const user = getCurrentUser();
  if (!user) return [];
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const snapshot = await db.collection('users')
      .doc(user.uid)
      .collection('activityLogs')
      .where('timestamp', '>=', cutoffDate)
      .orderBy('timestamp', 'desc')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp || { toDate: () => new Date() }
      };
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    // Fallback: try without date filter
    try {
      const snapshot = await db.collection('users')
        .doc(user.uid)
        .collection('activityLogs')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp || { toDate: () => new Date() }
        };
      });
    } catch (err) {
      console.error('Error fetching activity logs (fallback):', err);
      return [];
    }
  }
}

