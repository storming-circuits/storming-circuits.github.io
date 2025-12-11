function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function initFriendStatsPage() {
  const friendUid = getQueryParam('uid');
  const container = document.getElementById('friendStatsContent');

  if (!friendUid) {
    container.innerHTML = '<p class="no-activities">No friend selected.</p>';
    return;
  }

  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = '<p class="no-activities">Please sign in.</p>';
    return;
  }

  try {
    // Check friendship
    const friendDoc = await db.collection('users').doc(user.uid).collection('friends').doc(friendUid).get();
    if (!friendDoc.exists) {
      container.innerHTML = '<p class="no-activities">❌ You do not have permission to view this user\'s stats.</p>';
      return;
    }

    // Load stats
    const statsDoc = await db.collection('users').doc(friendUid).collection('stats').doc('latest').get();
    if (!statsDoc.exists) {
      container.innerHTML = '<p class="no-activities">No stats available for this user yet.</p>';
      return;
    }

    const stats = statsDoc.data();
    const updatedAt = stats.updatedAt?.toDate ? stats.updatedAt.toDate() : null;
    const updatedText = updatedAt ? updatedAt.toLocaleString() : 'Recently';

    container.innerHTML = `
      <div class="score-cards" style="margin-bottom:1rem;">
        <div class="score-card productivity">
          <div class="score-icon">📊</div>
          <div class="score-content">
            <h3>Productivity Score</h3>
            <div class="score-value">${stats.productivityScore ?? 0}</div>
            <p class="score-label">Last updated: ${updatedText}</p>
          </div>
        </div>
        <div class="score-card wellness">
          <div class="score-icon">💚</div>
          <div class="score-content">
            <h3>Wellness Score</h3>
            <div class="score-value">${stats.wellnessScore ?? 0}</div>
            <p class="score-label">Last updated: ${updatedText}</p>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Friend stats error:', error);
    container.innerHTML = `<p class="no-activities">Error: ${error.message}</p>`;
  }
}

// Export global
if (typeof window !== 'undefined') {
  window.initFriendStatsPage = initFriendStatsPage;
}

