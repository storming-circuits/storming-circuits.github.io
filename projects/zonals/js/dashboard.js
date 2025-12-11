// Dashboard Functions

// Calculate productivity score
function calculateProductivityScore(logs) {
  const studyLogs = logs.filter(log => log.type === 'study');
  const totalStudyTime = studyLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
  
  // Productivity score based on study time (max 100)
  // Assuming 4 hours (240 mins) of study = 100 points
  const maxStudyTime = 240;
  const productivityScore = Math.min(100, Math.round((totalStudyTime / maxStudyTime) * 100));
  
  return productivityScore;
}

// Calculate wellness score
function calculateWellnessScore(logs) {
  const exerciseLogs = logs.filter(log => log.type === 'exercise');
  const breakLogs = logs.filter(log => log.type === 'break');
  
  const totalExerciseTime = exerciseLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
  const totalBreakTime = breakLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
  
  // Wellness score based on exercise and breaks
  // Exercise: 30 mins = 50 points, Breaks: 60 mins = 50 points
  const exerciseScore = Math.min(50, Math.round((totalExerciseTime / 30) * 50));
  const breakScore = Math.min(50, Math.round((totalBreakTime / 60) * 50));
  
  return exerciseScore + breakScore;
}

// Calculate study vs break balance
function calculateBalance(logs) {
  const studyTime = logs
    .filter(log => log.type === 'study')
    .reduce((sum, log) => sum + (log.duration || 0), 0);
  
  const breakTime = logs
    .filter(log => log.type === 'break' || log.type === 'exercise')
    .reduce((sum, log) => sum + (log.duration || 0), 0);
  
  const totalTime = studyTime + breakTime;
  
  if (totalTime === 0) {
    return { studyPercent: 0, breakPercent: 0, ratio: 'N/A' };
  }
  
  const studyPercent = Math.round((studyTime / totalTime) * 100);
  const breakPercent = 100 - studyPercent;
  
  // Ideal ratio is 75% study, 25% break
  let ratio = 'Balanced';
  if (studyPercent > 85) ratio = 'Too Much Study';
  else if (studyPercent < 60) ratio = 'Too Much Break';
  
  return {
    studyPercent,
    breakPercent,
    studyTime,
    breakTime,
    ratio
  };
}

// Get daily statistics
function getDailyStats(logs) {
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(log => log.date === today);
  
  return {
    today: calculateProductivityScore(todayLogs),
    todayWellness: calculateWellnessScore(todayLogs),
    todayStudyTime: todayLogs
      .filter(log => log.type === 'study')
      .reduce((sum, log) => sum + (log.duration || 0), 0),
    todayExerciseTime: todayLogs
      .filter(log => log.type === 'exercise')
      .reduce((sum, log) => sum + (log.duration || 0), 0)
  };
}

// Display dashboard with proper loading states
async function displayDashboard(userId) {
  const container = document.getElementById('dashboard-content');
  if (!container) return;
  
  // Show loading state
  container.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading your dashboard...</p>
    </div>
  `;
  
  try {
    // Load all data in parallel
    const [logs, routines, quizResults] = await Promise.all([
      loadActivityLogs(userId, 30),
      loadRoutineHistory(userId),
      loadQuizResults(userId)
    ]);
    
    const productivityScore = calculateProductivityScore(logs);
    const wellnessScore = calculateWellnessScore(logs);
    const balance = calculateBalance(logs);
    const dailyStats = getDailyStats(logs);

    // Persist sharable stats for friends
    if (typeof saveUserStats === 'function') {
      saveUserStats(productivityScore, wellnessScore).catch(err => console.error('Save stats error:', err));
    }
    
    // Update dashboard HTML
    updateDashboardHTML({
      productivityScore,
      wellnessScore,
      balance,
      dailyStats,
      logs: logs.slice(0, 10), // Show last 10 activities
      routines: routines.slice(0, 5), // Show last 5 routines
      quizResults: quizResults.slice(0, 5) // Show last 5 quiz results
    });
    
    // Draw charts after a small delay to ensure DOM is ready
    setTimeout(() => {
      drawProductivityChart(logs);
      drawBalanceChart(balance);
    }, 100);
    
    // Setup modal form handlers
    if (typeof setupManualLogForm === 'function') {
      setTimeout(setupManualLogForm, 100);
    }
    
    // Load todos
    if (typeof loadTodos === 'function') {
      setTimeout(loadTodos, 200);
    }
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
    container.innerHTML = `
      <div class="error-message">
        <h3>Error Loading Dashboard</h3>
        <p>${error.message}</p>
        <button class="btn-primary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// Load activity logs for a specific user
async function loadActivityLogs(userId, days = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const snapshot = await db.collection('users')
      .doc(userId)
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
    console.error('Error loading activity logs:', error);
    // If query fails (e.g., no index), try without date filter
    try {
      const snapshot = await db.collection('users')
        .doc(userId)
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
      console.error('Error loading activity logs (fallback):', err);
      return [];
    }
  }
}

// Load routine history
async function loadRoutineHistory(userId) {
  try {
    const snapshot = await db.collection('users')
      .doc(userId)
      .collection('routines')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error loading routine history:', error);
    return [];
  }
}

// Load quiz results
async function loadQuizResults(userId) {
  try {
    const snapshot = await db.collection('users')
      .doc(userId)
      .collection('quizResults')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error loading quiz results:', error);
    return [];
  }
}

// Routine Generator Functions
function generateStudyRoutine(subjects, totalTime, studyInterval = 45, breakInterval = 10, exerciseInterval = 15) {
  const routine = [];
  let currentTime = 0;
  let subjectIndex = 0;
  let sessionNumber = 1;
  
  // Exercise activities pool
  const exerciseActivities = [
    'Jumping Jacks',
    'Push-ups',
    'Squats',
    'Stretching',
    'Walking',
    'Meditation',
    'Deep Breathing',
    'Yoga',
    'Plank',
    'Neck Rolls'
  ];
  
  // Break activities pool
  const breakActivities = [
    'Meditation',
    'Deep Breathing',
    'Stretching',
    'Walking',
    'Hydration Break',
    'Eye Exercises',
    'Music Break',
    'Fresh Air'
  ];
  
  while (currentTime < totalTime) {
    // Add study session
    if (subjectIndex < subjects.length) {
      const subject = subjects[subjectIndex];
      const studyDuration = Math.min(studyInterval, totalTime - currentTime);
      
      if (studyDuration > 0) {
        routine.push({
          type: 'study',
          subject: subject,
          duration: studyDuration,
          sessionNumber: sessionNumber,
          startTime: currentTime,
          endTime: currentTime + studyDuration
        });
        currentTime += studyDuration;
        subjectIndex = (subjectIndex + 1) % subjects.length;
        sessionNumber++;
      }
    }
    
    // Add break or exercise after every 2 study sessions (Pomodoro-style)
    if (sessionNumber % 2 === 0 && currentTime < totalTime) {
      // Every 4th session, add exercise instead of break
      const isExercise = sessionNumber % 4 === 0;
      const activityType = isExercise ? 'exercise' : 'break';
      const activityDuration = isExercise ? exerciseInterval : breakInterval;
      const activityPool = isExercise ? exerciseActivities : breakActivities;
      const activity = activityPool[Math.floor(Math.random() * activityPool.length)];
      
      const breakDuration = Math.min(activityDuration, totalTime - currentTime);
      
      if (breakDuration > 0) {
        routine.push({
          type: activityType,
          activity: activity,
          duration: breakDuration,
          sessionNumber: sessionNumber,
          startTime: currentTime,
          endTime: currentTime + breakDuration
        });
        currentTime += breakDuration;
      }
    } else if (currentTime < totalTime && routine.length > 0) {
      // Add short break between study sessions
      const shortBreakDuration = Math.min(5, totalTime - currentTime);
      if (shortBreakDuration > 0) {
        routine.push({
          type: 'break',
          activity: breakActivities[Math.floor(Math.random() * breakActivities.length)],
          duration: shortBreakDuration,
          sessionNumber: sessionNumber,
          startTime: currentTime,
          endTime: currentTime + shortBreakDuration
        });
        currentTime += shortBreakDuration;
      }
    }
    
    // Safety check to prevent infinite loop
    if (routine.length > 100) break;
  }
  
  return routine;
}

// Pomodoro Timer
let pomodoroTimer = null;
let pomodoroTimeLeft = 0;
let pomodoroCurrentSession = null;
let pomodoroRoutine = [];
let pomodoroCurrentIndex = 0;
let pomodoroIsRunning = false;
let pomodoroFullscreenActive = false;

function showPomodoroSection() {
  const pomodoroSection = document.getElementById('pomodoroTimerSection');
  if (pomodoroSection) {
    pomodoroSection.style.display = 'block';
    pomodoroSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function enterPomodoroFullscreen() {
  const section = document.getElementById('pomodoroTimerSection');
  if (!section) return;

  pomodoroFullscreenActive = true;
  section.classList.add('pomodoro-fullscreen');

  if (!document.fullscreenElement && section.requestFullscreen) {
    try {
      await section.requestFullscreen();
    } catch (error) {
      console.warn('Fullscreen request failed', error);
    }
  }
}

function exitPomodoroFullscreen() {
  const section = document.getElementById('pomodoroTimerSection');
  pomodoroFullscreenActive = false;

  if (section) {
    section.classList.remove('pomodoro-fullscreen');
  }

  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

document.addEventListener('fullscreenchange', () => {
  const section = document.getElementById('pomodoroTimerSection');
  if (!document.fullscreenElement && section) {
    section.classList.remove('pomodoro-fullscreen');
    pomodoroFullscreenActive = false;
  }
});

function updatePomodoroControls() {
  const startBtn = document.getElementById('pomodoro-start-btn');
  const pauseBtn = document.getElementById('pomodoro-pause-btn');
  const stopBtn = document.getElementById('pomodoro-stop-btn');

  const hasSession = !!pomodoroCurrentSession;
  const isRunning = pomodoroIsRunning && !!pomodoroTimer;
  const canResume = hasSession && !isRunning && pomodoroTimeLeft > 0;

  if (startBtn) {
    startBtn.disabled = isRunning;
    startBtn.textContent = canResume ? '▶️ Resume' : isRunning ? '▶️ Running' : '▶️ Start';
  }

  if (pauseBtn) {
    pauseBtn.disabled = !isRunning;
  }

  if (stopBtn) {
    stopBtn.disabled = !hasSession;
  }
}

function handlePomodoroStart() {
  if (!currentRoutine || currentRoutine.length === 0) {
    alert('Please generate a routine first!');
    return;
  }

  // If no active session, start fresh. Otherwise resume from pause.
  if (!pomodoroCurrentSession || pomodoroTimeLeft <= 0 || pomodoroRoutine.length === 0) {
    startPomodoroTimer(currentRoutine);
  } else if (!pomodoroIsRunning || !pomodoroTimer) {
    resumePomodoroTimer();
  }
}

function startPomodoroTimer(routine) {
  if (!routine || routine.length === 0) {
    alert('Please generate a routine first!');
    return;
  }
  
  showPomodoroSection();
  enterPomodoroFullscreen();
  pomodoroRoutine = routine;
  pomodoroCurrentIndex = 0;
  pomodoroIsRunning = true;
  loadPomodoroSession(0);
  updatePomodoroControls();
}

function loadPomodoroSession(index) {
  if (index >= pomodoroRoutine.length) {
    // Routine complete
    pomodoroIsRunning = false;
    updatePomodoroDisplay('Routine Complete! 🎉', 0, null);
    exitPomodoroFullscreen();
    if (pomodoroTimer) {
      clearInterval(pomodoroTimer);
      pomodoroTimer = null;
    }
    updatePomodoroControls();
    return;
  }
  
  pomodoroCurrentIndex = index;
  pomodoroCurrentSession = pomodoroRoutine[index];
  pomodoroTimeLeft = pomodoroCurrentSession.duration * 60; // Convert to seconds
  
  updatePomodoroDisplay();
  startTimer();
}

function startTimer() {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
  }
  
  pomodoroIsRunning = true;
  updatePomodoroControls();

  pomodoroTimer = setInterval(() => {
    pomodoroTimeLeft--;
    
    if (pomodoroTimeLeft <= 0) {
      clearInterval(pomodoroTimer);
      pomodoroTimer = null;
      
      // Auto-advance to next session
      setTimeout(() => {
        loadPomodoroSession(pomodoroCurrentIndex + 1);
      }, 1000);
    } else {
      updatePomodoroDisplay();
    }
  }, 1000);
}

function pausePomodoroTimer() {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
    pomodoroIsRunning = false;
    updatePomodoroControls();
  }
}

function resumePomodoroTimer() {
  if (pomodoroTimeLeft > 0 && pomodoroCurrentSession) {
    enterPomodoroFullscreen();
    pomodoroIsRunning = true;
    startTimer();
    updatePomodoroControls();
  }
}

function stopPomodoroTimer() {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  }
  pomodoroIsRunning = false;
  pomodoroTimeLeft = 0;
  pomodoroCurrentSession = null;
  pomodoroCurrentIndex = 0;
  exitPomodoroFullscreen();
  updatePomodoroDisplay('Ready to Start', 0, null);
  updatePomodoroControls();
}

function updatePomodoroDisplay(customMessage = null, customTime = null, customSession = null) {
  const timerDisplay = document.getElementById('pomodoro-timer-display');
  const timerInfo = document.getElementById('pomodoro-timer-info');
  const timerControls = document.getElementById('pomodoro-timer-controls');
  
  if (!timerDisplay || !timerInfo) return;
  
  const session = customSession !== null ? customSession : pomodoroCurrentSession;
  const timeLeft = customTime !== null ? customTime : pomodoroTimeLeft;
  const message = customMessage !== null ? customMessage : null;
  
  if (message) {
    timerDisplay.textContent = message;
    timerInfo.innerHTML = '';
    const progressBar = document.getElementById('pomodoro-progress');
    if (progressBar) {
      progressBar.style.width = '0%';
    }
    return;
  }
  
  if (!session) {
    timerDisplay.textContent = '00:00';
    timerInfo.innerHTML = '<p>Generate a routine to start</p>';
    const progressBar = document.getElementById('pomodoro-progress');
    if (progressBar) {
      progressBar.style.width = '0%';
    }
    return;
  }
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  const sessionType = session.type === 'study' ? '📚 Study' : session.type === 'exercise' ? '💪 Exercise' : '☕ Break';
  const sessionInfo = session.type === 'study' 
    ? `${session.subject} - Session ${session.sessionNumber}`
    : `${session.activity} - Session ${session.sessionNumber}`;
  
  timerInfo.innerHTML = `
    <p><strong>${sessionType}</strong></p>
    <p>${sessionInfo}</p>
    <p>${pomodoroCurrentIndex + 1} of ${pomodoroRoutine.length} sessions</p>
  `;
  
  // Update progress
  const progressBar = document.getElementById('pomodoro-progress');
  if (progressBar) {
    const totalDuration = session.duration * 60;
    const progress = ((totalDuration - timeLeft) / totalDuration) * 100;
    progressBar.style.width = `${progress}%`;
  }
}

// Todo List Functions
let todos = [];

async function loadTodos() {
  try {
    if (typeof getTodosFromFirestore === 'function') {
      todos = await getTodosFromFirestore();
    } else {
      // Fallback to localStorage
      const stored = localStorage.getItem('todos');
      todos = stored ? JSON.parse(stored) : [];
    }
    renderTodos();
  } catch (error) {
    console.error('Error loading todos:', error);
    todos = [];
    renderTodos();
  }
}

async function saveTodos() {
  try {
    if (typeof saveTodosToFirestore === 'function') {
      await saveTodosToFirestore(todos);
    } else {
      // Fallback to localStorage
      localStorage.setItem('todos', JSON.stringify(todos));
    }
  } catch (error) {
    console.error('Error saving todos:', error);
  }
}

function addTodo(text) {
  if (!text.trim()) return;
  
  todos.push({
    id: Date.now().toString(),
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  });
  
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    renderTodos();
  }
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
}

function renderTodos() {
  const todoList = document.getElementById('todo-list');
  if (!todoList) return;
  
  if (todos.length === 0) {
    todoList.innerHTML = '<p class="no-activities">No todos yet. Add one above!</p>';
    return;
  }
  
  todoList.innerHTML = todos.map(todo => `
    <div class="todo-item ${todo.completed ? 'completed' : ''}">
      <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo('${todo.id}')">
      <span>${todo.text}</span>
      <button class="todo-delete" onclick="deleteTodo('${todo.id}')">&times;</button>
    </div>
  `).join('');
}

function updateDashboardHTML(data) {
  const container = document.getElementById('dashboard-content');
  if (!container) return;
  
  const scoreColor = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  };
  
  // Helper to safely format date
  const safeFormatDate = (timestamp) => {
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return formatDate(timestamp.toDate());
      }
      if (timestamp instanceof Date) {
        return formatDate(timestamp);
      }
      return 'Recently';
    } catch (e) {
      return 'Recently';
    }
  };
  
    container.innerHTML = `
    <div class="dashboard-header">
      <h2>Smart Educational and Productivity Portal</h2>
      <p class="dashboard-subtitle">A Modern solution to maintain our modern problems.</p>
      <button class="btn-primary" onclick="openActivityModal()" style="margin-top: 1rem;">➕ Log Manual Activity</button>
    </div>
    
    <div class="score-cards">
      <div class="score-card productivity ${scoreColor(data.productivityScore)}">
        <div class="score-icon">📊</div>
        <div class="score-content">
          <h3>Productivity Score</h3>
          <div class="score-value">${data.productivityScore}</div>
          <p class="score-label">Based on study time</p>
        </div>
      </div>
      
      <div class="score-card wellness ${scoreColor(data.wellnessScore)}">
        <div class="score-icon">💚</div>
        <div class="score-content">
          <h3>Wellness Score</h3>
          <div class="score-value">${data.wellnessScore}</div>
          <p class="score-label">Based on breaks & exercise</p>
        </div>
      </div>
      
      <div class="score-card balance">
        <div class="score-icon">⚖️</div>
        <div class="score-content">
          <h3>Balance Ratio</h3>
          <div class="score-value">${data.balance.ratio}</div>
          <p class="score-label">${data.balance.studyPercent}% Study / ${data.balance.breakPercent}% Break</p>
        </div>
      </div>
    </div>
    
    <div class="today-stats">
      <h3>Today's Activity</h3>
      <div class="today-grid">
        <div class="today-item">
          <span class="today-label">Study Time</span>
          <span class="today-value">${formatTime(data.dailyStats.todayStudyTime)}</span>
        </div>
        <div class="today-item">
          <span class="today-label">Exercise Time</span>
          <span class="today-value">${formatTime(data.dailyStats.todayExerciseTime)}</span>
        </div>
        <div class="today-item">
          <span class="today-label">Productivity</span>
          <span class="today-value">${data.dailyStats.today}/100</span>
        </div>
        <div class="today-item">
          <span class="today-label">Wellness</span>
          <span class="today-value">${data.dailyStats.todayWellness}/100</span>
        </div>
      </div>
    </div>
    
    <div class="charts-section">
      <div class="chart-container">
        <h3>Productivity Trend (Last 7 Days)</h3>
        <canvas id="productivityChart"></canvas>
      </div>
      <div class="chart-container">
        <h3>Study vs Break Balance</h3>
        <canvas id="balanceChart"></canvas>
      </div>
    </div>
    
    <!-- Routine Generator Section -->
    <div class="routine-generator-section" style="margin-top: 3rem;">
      <div class="form-card">
        <h2 style="margin-bottom: 1.5rem; color: var(--text-primary);">📅 Study Routine Generator</h2>
        <form id="routineGeneratorForm" onsubmit="handleGenerateRoutine(event)">
          <div class="form-group">
            <label for="routineSubjects">Subjects (comma-separated)</label>
            <input type="text" id="routineSubjects" placeholder="e.g., Math, Physics, Chemistry" required>
            <small>Enter subjects you want to study</small>
          </div>
          <div class="form-group">
            <label for="routineTime">Available Study Time (minutes)</label>
            <input type="number" id="routineTime" min="30" max="480" placeholder="e.g., 180" required>
            <small>Total time available for studying</small>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
            <div class="form-group">
              <label for="studyInterval">Study Interval (mins)</label>
              <input type="number" id="studyInterval" value="45" min="15" max="90">
            </div>
            <div class="form-group">
              <label for="breakInterval">Break Interval (mins)</label>
              <input type="number" id="breakInterval" value="10" min="5" max="30">
            </div>
            <div class="form-group">
              <label for="exerciseInterval">Exercise Interval (mins)</label>
              <input type="number" id="exerciseInterval" value="15" min="5" max="30">
            </div>
          </div>
          <button type="submit" class="btn-primary btn-full">Generate Routine</button>
        </form>
      </div>
      
      <!-- Generated Routine Display -->
      <div id="routineDisplay" style="display: none; margin-top: 2rem;">
        <div class="routine-display-section">
          <h3>Your Generated Study Routine</h3>
          <div id="routineStats" class="routine-stats"></div>
          <div id="routineTimeline" class="routine-timeline"></div>
          <div class="routine-actions">
            <button class="btn-primary" onclick="startPomodoroFromRoutine()">▶️ Start Pomodoro Timer</button>
            <button class="btn-secondary" onclick="saveRoutineToFirestore()">💾 Save Routine</button>
          </div>
        </div>
      </div>
      
      <!-- Pomodoro Timer Section -->
      <div id="pomodoroTimerSection" class="routine-timer-section" style="display: none; margin-top: 2rem;">
        <div class="timer-card">
          <div class="timer-header">
            <h3>⏱️ Pomodoro Timer</h3>
            <p>Stay focused and take breaks!</p>
          </div>
          <div class="timer-display">
            <div class="timer-circle">
              <span id="pomodoro-timer-display">00:00</span>
            </div>
          </div>
          <div class="timer-info" id="pomodoro-timer-info">
            <p>Ready to start</p>
          </div>
          <div style="width: 100%; max-width: 300px; margin: 1rem auto;">
            <div style="width: 100%; height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
              <div id="pomodoro-progress" style="height: 100%; background: var(--primary-color); width: 0%; transition: width 0.3s;"></div>
            </div>
          </div>
          <div class="timer-controls" id="pomodoro-timer-controls">
            <button class="btn-primary" id="pomodoro-start-btn" onclick="handlePomodoroStart()">▶️ Start</button>
            <button class="btn-secondary" id="pomodoro-pause-btn" onclick="pausePomodoroTimer()">⏸️ Pause</button>
            <button class="btn-secondary" id="pomodoro-stop-btn" onclick="stopPomodoroTimer()">⏹️ Stop</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Todo List Section -->
    <div class="todo-section">
      <div class="todo-card">
        <h2>✅ Todo List</h2>
        <form class="todo-form" onsubmit="handleAddTodo(event)">
          <input type="text" id="todo-input" placeholder="Add a new todo..." required>
          <button type="submit" class="btn-primary">Add</button>
        </form>
        <ul class="todo-list" id="todo-list">
          <p class="no-activities">Loading todos...</p>
        </ul>
      </div>
    </div>
    
    <div class="recent-activities">
      <h3>Recent Activities</h3>
      <div class="activity-list">
        ${data.logs.length > 0 ? data.logs.map(log => `
          <div class="activity-item">
            <span class="activity-icon">${log.type === 'study' ? '📚' : log.type === 'exercise' ? '💪' : '☕'}</span>
            <div class="activity-details">
              <span class="activity-type">${log.type.charAt(0).toUpperCase() + log.type.slice(1)}</span>
              ${log.subject ? `<span class="activity-subject">${log.subject}</span>` : ''}
              <span class="activity-duration">${log.duration} minutes</span>
            </div>
            <span class="activity-date">${safeFormatDate(log.timestamp)}</span>
          </div>
        `).join('') : '<p class="no-activities">No activities logged yet. Start a routine to see your progress!</p>'}
      </div>
    </div>
  `;
  
  // Load todos after HTML is rendered
  setTimeout(() => {
    loadTodos();
  }, 100);
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString();
}

// Draw productivity chart
function drawProductivityChart(logs) {
  const canvas = document.getElementById('productivityChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = 200;
  
  // Group logs by date for last 7 days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayLogs = logs.filter(log => log.date === dateStr);
    const score = calculateProductivityScore(dayLogs);
    last7Days.push({ date: dateStr, score });
  }
  
  const maxScore = 100;
  const padding = 40;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;
  
  // Draw axes
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();
  
  // Draw grid lines
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.strokeStyle = '#eee';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
    
    // Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.fillText((100 - i * 25).toString(), 5, y + 3);
  }
  
  // Draw line chart
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  last7Days.forEach((day, index) => {
    const x = padding + (chartWidth / (last7Days.length - 1)) * index;
    const y = canvas.height - padding - (day.score / maxScore) * chartHeight;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    // Draw point
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.stroke();
  
  // X-axis labels
  ctx.fillStyle = '#666';
  ctx.font = '10px Arial';
  last7Days.forEach((day, index) => {
    const x = padding + (chartWidth / (last7Days.length - 1)) * index;
    const date = new Date(day.date);
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    ctx.fillText(label, x - 15, canvas.height - padding + 15);
  });
}

// Draw balance chart (pie chart)
function drawBalanceChart(balance) {
  const canvas = document.getElementById('balanceChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = 200;
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) / 3;
  
  // Draw study portion
  const studyAngle = (balance.studyPercent / 100) * Math.PI * 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, 0, studyAngle);
  ctx.closePath();
  ctx.fillStyle = '#2196F3';
  ctx.fill();
  
  // Draw break portion
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, studyAngle, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#FF9800';
  ctx.fill();
  
  // Draw labels
  ctx.fillStyle = '#333';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  
  const studyLabelAngle = studyAngle / 2;
  const breakLabelAngle = studyAngle + (Math.PI * 2 - studyAngle) / 2;
  
  ctx.fillText(
    `${balance.studyPercent}% Study`,
    centerX + Math.cos(studyLabelAngle) * (radius * 0.6),
    centerY + Math.sin(studyLabelAngle) * (radius * 0.6)
  );
  
  ctx.fillText(
    `${balance.breakPercent}% Break`,
    centerX + Math.cos(breakLabelAngle) * (radius * 0.6),
    centerY + Math.sin(breakLabelAngle) * (radius * 0.6)
  );
}

// Routine Generator Handlers
let currentRoutine = null;

async function handleGenerateRoutine(event) {
  event.preventDefault();
  
  const subjectsInput = document.getElementById('routineSubjects').value;
  const totalTime = parseInt(document.getElementById('routineTime').value);
  const studyInterval = parseInt(document.getElementById('studyInterval').value) || 45;
  const breakInterval = parseInt(document.getElementById('breakInterval').value) || 10;
  const exerciseInterval = parseInt(document.getElementById('exerciseInterval').value) || 15;
  
  if (!subjectsInput.trim()) {
    alert('Please enter at least one subject');
    return;
  }
  
  if (totalTime < 30) {
    alert('Please enter at least 30 minutes of study time');
    return;
  }
  
  const subjects = subjectsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
  
  const routine = generateStudyRoutine(subjects, totalTime, studyInterval, breakInterval, exerciseInterval);
  currentRoutine = routine;
  
  displayRoutine(routine);
}

function displayRoutine(routine) {
  const routineDisplay = document.getElementById('routineDisplay');
  const routineStats = document.getElementById('routineStats');
  const routineTimeline = document.getElementById('routineTimeline');
  
  if (!routineDisplay || !routineStats || !routineTimeline) return;
  
  // Calculate stats
  const totalStudyTime = routine.filter(r => r.type === 'study').reduce((sum, r) => sum + r.duration, 0);
  const totalBreakTime = routine.filter(r => r.type === 'break').reduce((sum, r) => sum + r.duration, 0);
  const totalExerciseTime = routine.filter(r => r.type === 'exercise').reduce((sum, r) => sum + r.duration, 0);
  const totalTime = totalStudyTime + totalBreakTime + totalExerciseTime;
  const studySessions = routine.filter(r => r.type === 'study').length;
  
  routineStats.innerHTML = `
    <h3>Routine Statistics</h3>
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Total Time</span>
        <span class="stat-value">${formatTime(totalTime)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Study Time</span>
        <span class="stat-value">${formatTime(totalStudyTime)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Break Time</span>
        <span class="stat-value">${formatTime(totalBreakTime)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Exercise Time</span>
        <span class="stat-value">${formatTime(totalExerciseTime)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Study Sessions</span>
        <span class="stat-value">${studySessions}</span>
      </div>
    </div>
  `;
  
  routineTimeline.innerHTML = `
    <h3>Routine Timeline</h3>
    ${routine.map((item, index) => {
      const itemClass = item.type === 'study' ? 'study-item' : item.type === 'exercise' ? 'exercise-item' : 'break-item';
      const icon = item.type === 'study' ? '📚' : item.type === 'exercise' ? '💪' : '☕';
      const title = item.type === 'study' ? `Study: ${item.subject}` : item.activity;
      
      return `
        <div class="routine-item ${itemClass}">
          <div class="routine-number">${index + 1}</div>
          <div class="routine-icon">${icon}</div>
          <div class="routine-content">
            <h4>${title}</h4>
            <div class="routine-duration">${item.duration} minutes</div>
            ${item.type === 'study' ? `<div class="routine-subject">Session ${item.sessionNumber}</div>` : ''}
          </div>
        </div>
      `;
    }).join('')}
  `;
  
  routineDisplay.style.display = 'block';
  
  // Scroll to routine display
  routineDisplay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function startPomodoroFromRoutine() {
  if (!currentRoutine || currentRoutine.length === 0) {
    alert('Please generate a routine first!');
    return;
  }
  
  handlePomodoroStart();
}

async function saveRoutineToFirestore() {
  if (!currentRoutine || currentRoutine.length === 0) {
    alert('No routine to save!');
    return;
  }
  
  const user = getCurrentUser();
  if (!user) {
    alert('Please log in to save routines');
    return;
  }
  
  try {
    const routineData = {
      subjects: [...new Set(currentRoutine.filter(r => r.type === 'study').map(r => r.subject))],
      totalTime: currentRoutine.reduce((sum, r) => sum + r.duration, 0),
      sessions: currentRoutine.length,
      routine: currentRoutine,
      createdAt: new Date().toISOString()
    };
    
    if (typeof saveRoutine === 'function') {
      const result = await saveRoutine(routineData);
      if (result.success) {
        alert('Routine saved successfully!');
      } else {
        alert('Error saving routine: ' + result.error);
      }
    } else {
      alert('Save function not available');
    }
  } catch (error) {
    console.error('Error saving routine:', error);
    alert('Error saving routine: ' + error.message);
  }
}

// Todo List Handlers
function handleAddTodo(event) {
  event.preventDefault();
  const input = document.getElementById('todo-input');
  if (input && input.value.trim()) {
    addTodo(input.value);
    input.value = '';
  }
}

// Profile Functions
async function loadProfileData() {
  try {
    if (typeof getUserProfile === 'function') {
      const profile = await getUserProfile();
      
      if (profile) {
        const nameInput = document.getElementById('profileName');
        const usernameInput = document.getElementById('profileUsername');
        const emailInput = document.getElementById('profileEmail');
        const contactInput = document.getElementById('profileContact');
        
        if (nameInput) nameInput.value = profile.name || '';
        if (usernameInput) usernameInput.value = profile.username || '';
        if (emailInput) emailInput.value = profile.email || '';
        if (contactInput) contactInput.value = profile.contactNumber || '';
      }
    } else {
      console.error('getUserProfile function not available');
    }
  } catch (error) {
    console.error('Error loading profile data:', error);
    alert('Error loading profile: ' + error.message);
  }
}

async function handleProfileSave(event) {
  event.preventDefault();
  
  const name = document.getElementById('profileName').value.trim();
  const username = document.getElementById('profileUsername').value.trim();
  const email = document.getElementById('profileEmail').value.trim();
  const contactNumber = document.getElementById('profileContact').value.trim();
  
  if (!name || !username || !email) {
    alert('Please fill in all required fields (Name, Username, Email)');
    return;
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('Please enter a valid email address');
    return;
  }
  
  // Username validation (alphanumeric and underscore only)
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    alert('Username can only contain letters, numbers, and underscores');
    return;
  }
  
  const submitBtn = document.querySelector('#profileForm button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';
  
  try {
    if (typeof saveUserProfile === 'function') {
      const result = await saveUserProfile({
        name: name,
        username: username,
        email: email,
        contactNumber: contactNumber
      });
      
      if (result.success) {
        alert('Profile saved successfully!');
        closeProfileModal();
        // Optionally reload dashboard to show updated info
        const user = getCurrentUser();
        if (user) {
          displayDashboard(user.uid);
        }
      } else {
        alert('Error saving profile: ' + result.error);
      }
    } else {
      alert('Save function not available. Please refresh the page.');
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    alert('Error: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function handleProfileSummary() {
  const statusEl = document.getElementById('profileSummaryStatus');
  const summaryEl = document.getElementById('profileSummaryText');
  const button = document.getElementById('profileSummaryBtn');

  if (statusEl) statusEl.textContent = 'Generating with Gemini...';
  if (summaryEl) summaryEl.textContent = 'Please wait...';
  if (button) button.disabled = true;

  try {
    if (typeof getUserProfile !== 'function') throw new Error('Profile function unavailable');
    const profile = await getUserProfile();
    if (!profile) throw new Error('Unable to load profile');

    // Optionally attach lightweight stats in future
    const enrichedProfile = {
      ...profile,
      stats: null
    };

    if (typeof summarizeAccountWithAI !== 'function') {
      throw new Error('Gemini summary function not available');
    }

    const summary = await summarizeAccountWithAI(enrichedProfile);
    if (summaryEl) summaryEl.textContent = summary;
    if (statusEl) statusEl.textContent = 'AI summary generated';
  } catch (error) {
    console.error('Profile summary error:', error);
    if (summaryEl) summaryEl.textContent = 'Error: ' + error.message;
    if (statusEl) statusEl.textContent = 'Failed to summarize';
  } finally {
    if (button) button.disabled = false;
  }
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) {
    modal.style.display = 'none';
    const form = document.getElementById('profileForm');
    if (form) form.reset();
  }
}

// Friends modal controls
function openFriendsModal() {
  const modal = document.getElementById('friendsModal');
  if (modal) {
    modal.style.display = 'flex';
    if (typeof refreshRequestsAndFriends === 'function') {
      refreshRequestsAndFriends();
    }
  }
}

function closeFriendsModal() {
  const modal = document.getElementById('friendsModal');
  if (modal) {
    modal.style.display = 'none';
    const searchResult = document.getElementById('friendSearchResult');
    if (searchResult) searchResult.innerHTML = '';
    const searchInput = document.getElementById('friendSearchInput');
    if (searchInput) searchInput.value = '';
  }
}

// Close modals when clicking outside
window.addEventListener('click', (event) => {
  const activityModal = document.getElementById('activityModal');
  const profileModal = document.getElementById('profileModal');
  const friendsModal = document.getElementById('friendsModal');
  if (event.target === activityModal) closeActivityModal();
  if (event.target === profileModal) closeProfileModal();
  if (event.target === friendsModal) closeFriendsModal();
});

// Export functions globally
if (typeof window !== 'undefined') {
  window.handleGenerateRoutine = handleGenerateRoutine;
  window.startPomodoroFromRoutine = startPomodoroFromRoutine;
  window.saveRoutineToFirestore = saveRoutineToFirestore;
  window.handleAddTodo = handleAddTodo;
  window.toggleTodo = toggleTodo;
  window.deleteTodo = deleteTodo;
  window.startPomodoroTimer = startPomodoroTimer;
  window.handlePomodoroStart = handlePomodoroStart;
  window.pausePomodoroTimer = pausePomodoroTimer;
  window.resumePomodoroTimer = resumePomodoroTimer;
  window.stopPomodoroTimer = stopPomodoroTimer;
  window.loadTodos = loadTodos;
  window.loadProfileData = loadProfileData;
  window.handleProfileSave = handleProfileSave;
  window.closeProfileModal = closeProfileModal;
  window.handleProfileSummary = handleProfileSummary;
  window.openFriendsModal = openFriendsModal;
  window.closeFriendsModal = closeFriendsModal;
  window.openProfileModal = async function() {
    const modal = document.getElementById('profileModal');
    if (modal) {
      modal.style.display = 'flex';
      await loadProfileData();
    }
  };
}

