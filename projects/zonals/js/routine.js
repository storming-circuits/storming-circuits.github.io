// Routine Generator Functions

// Generate optimized study routine
function generateRoutine(subjects, totalTime, studyInterval = 45, breakInterval = 10, exerciseInterval = 15) {
  const routine = [];
  let remainingTime = totalTime;
  let subjectIndex = 0;
  let sessionNumber = 1;
  
  while (remainingTime > 0 && subjects.length > 0) {
    // Study session
    const studyDuration = Math.min(studyInterval, remainingTime);
    if (studyDuration > 0) {
      const currentSubject = subjects[subjectIndex % subjects.length];
      routine.push({
        type: 'study',
        subject: currentSubject,
        duration: studyDuration,
        sessionNumber: sessionNumber,
        description: `Focus on ${currentSubject}`
      });
      remainingTime -= studyDuration;
      subjectIndex++;
    }
    
    // Break or Exercise (alternate)
    if (remainingTime > 0) {
      const isExercise = sessionNumber % 2 === 0;
      const breakDuration = isExercise ? Math.min(exerciseInterval, remainingTime) : Math.min(breakInterval, remainingTime);
      
      if (breakDuration > 0) {
        routine.push({
          type: isExercise ? 'exercise' : 'break',
          duration: breakDuration,
          sessionNumber: sessionNumber,
          description: isExercise 
            ? 'Exercise: Jumping Jacks, Push-ups, or Stretching'
            : 'Break: Rest, Meditation, or Light Activity'
        });
        remainingTime -= breakDuration;
      }
    }
    
    sessionNumber++;
    
    // Safety check to prevent infinite loop
    if (remainingTime < 5) break;
  }
  
  return routine;
}

// Calculate routine statistics
function calculateRoutineStats(routine) {
  const stats = {
    totalTime: 0,
    studyTime: 0,
    breakTime: 0,
    exerciseTime: 0,
    studySessions: 0,
    breakSessions: 0,
    exerciseSessions: 0
  };
  
  routine.forEach(item => {
    stats.totalTime += item.duration;
    if (item.type === 'study') {
      stats.studyTime += item.duration;
      stats.studySessions++;
    } else if (item.type === 'break') {
      stats.breakTime += item.duration;
      stats.breakSessions++;
    } else if (item.type === 'exercise') {
      stats.exerciseTime += item.duration;
      stats.exerciseSessions++;
    }
  });
  
  return stats;
}

// Format time in minutes
function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

// Display routine
function displayRoutine(routine, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found!`);
    return;
  }
  
  if (!routine || routine.length === 0) {
    console.error('Routine is empty or invalid!');
    container.innerHTML = '<p style="color: red; padding: 1rem;">Error: Generated routine is empty. Please try again.</p>';
    return;
  }
  
  console.log('Displaying routine with', routine.length, 'items');
  
  const stats = calculateRoutineStats(routine);
  
  let html = `
    <div class="routine-stats">
      <h3>Routine Summary</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total Time</span>
          <span class="stat-value">${formatTime(stats.totalTime)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Study Time</span>
          <span class="stat-value">${formatTime(stats.studyTime)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Break Time</span>
          <span class="stat-value">${formatTime(stats.breakTime)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Exercise Time</span>
          <span class="stat-value">${formatTime(stats.exerciseTime)}</span>
        </div>
      </div>
    </div>
    <div class="routine-timeline">
      <h3>Your Study Plan</h3>
  `;
  
  routine.forEach((item, index) => {
    const icon = item.type === 'study' ? '📚' : item.type === 'exercise' ? '💪' : '☕';
    const colorClass = item.type === 'study' ? 'study-item' : item.type === 'exercise' ? 'exercise-item' : 'break-item';
    
    html += `
      <div class="routine-item ${colorClass}">
        <div class="routine-icon">${icon}</div>
        <div class="routine-content">
          <h4>${item.description}</h4>
          <p class="routine-duration">Duration: ${item.duration} minutes</p>
          ${item.subject ? `<p class="routine-subject">Subject: ${item.subject}</p>` : ''}
        </div>
        <div class="routine-number">${index + 1}</div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// Start routine timer
let currentRoutineIndex = 0;
let currentTimer = null;
let routineTimer = null;
let isPaused = false;
let pausedTimeRemaining = null;
let currentRoutineData = null;
let currentOnComplete = null;
let currentOnUpdate = null;

function startRoutine(routine, onComplete, onUpdate) {
  if (routine.length === 0) return;
  
  currentRoutineIndex = 0;
  isPaused = false;
  pausedTimeRemaining = null;
  currentRoutineData = routine;
  currentOnComplete = onComplete;
  currentOnUpdate = onUpdate;
  startCurrentSession(routine, onComplete, onUpdate);
}

function startCurrentSession(routine, onComplete, onUpdate) {
  if (currentRoutineIndex >= routine.length) {
    if (onComplete) onComplete();
    return;
  }
  
  const currentItem = routine[currentRoutineIndex];
  // Use paused time if resuming, otherwise start fresh
  let timeRemaining = pausedTimeRemaining !== null ? pausedTimeRemaining : currentItem.duration * 60;
  pausedTimeRemaining = null;
  
  if (onUpdate) {
    onUpdate({
      item: currentItem,
      index: currentRoutineIndex,
      total: routine.length,
      timeRemaining: timeRemaining
    });
  }
  
  routineTimer = setInterval(() => {
    if (isPaused) return; // Don't decrement if paused
    
    timeRemaining--;
    currentTimeRemaining = timeRemaining;
    currentSessionItem = currentItem;
    
    if (onUpdate) {
      onUpdate({
        item: currentItem,
        index: currentRoutineIndex,
        total: routine.length,
        timeRemaining: timeRemaining
      });
    }
    
    if (timeRemaining <= 0) {
      clearInterval(routineTimer);
      routineTimer = null;
      
      // Save activity log
      if (typeof saveActivityLog === 'function') {
        saveActivityLog(
          currentItem.type,
          currentItem.duration,
          currentItem.subject || null
        );
      }
      
      // Move to next session
      currentRoutineIndex++;
      setTimeout(() => {
        startCurrentSession(routine, onComplete, onUpdate);
      }, 1000);
    }
  }, 1000);
}

// Global variables to track timer state
let currentTimeRemaining = 0;
let currentSessionItem = null;

function pauseRoutine() {
  isPaused = true;
  // Get current time from display
  const timerElement = document.getElementById('timerTime');
  if (timerElement) {
    const timeText = timerElement.textContent;
    const [mins, secs] = timeText.split(':').map(Number);
    pausedTimeRemaining = mins * 60 + secs;
    currentTimeRemaining = pausedTimeRemaining;
  }
}

function resumeRoutine() {
  if (!currentRoutineData || !currentOnComplete || !currentOnUpdate) return;
  if (pausedTimeRemaining === null) return;
  
  isPaused = false;
  // Restart the current session with the paused time
  if (routineTimer) {
    clearInterval(routineTimer);
    routineTimer = null;
  }
  
  // Restart timer with remaining time
  const currentItem = currentRoutineData[currentRoutineIndex];
  let timeRemaining = pausedTimeRemaining;
  pausedTimeRemaining = null;
  
  if (currentOnUpdate) {
    currentOnUpdate({
      item: currentItem,
      index: currentRoutineIndex,
      total: currentRoutineData.length,
      timeRemaining: timeRemaining
    });
  }
  
  routineTimer = setInterval(() => {
    if (isPaused) return;
    
    timeRemaining--;
    currentTimeRemaining = timeRemaining;
    
    if (currentOnUpdate) {
      currentOnUpdate({
        item: currentItem,
        index: currentRoutineIndex,
        total: currentRoutineData.length,
        timeRemaining: timeRemaining
      });
    }
    
    if (timeRemaining <= 0) {
      clearInterval(routineTimer);
      routineTimer = null;
      
      // Save activity log
      if (typeof saveActivityLog === 'function') {
        saveActivityLog(
          currentItem.type,
          currentItem.duration,
          currentItem.subject || null
        );
      }
      
      // Move to next session
      currentRoutineIndex++;
      setTimeout(() => {
        startCurrentSession(currentRoutineData, currentOnComplete, currentOnUpdate);
      }, 1000);
    }
  }, 1000);
}

function stopRoutine() {
  if (routineTimer) {
    clearInterval(routineTimer);
    routineTimer = null;
  }
  currentRoutineIndex = 0;
  isPaused = false;
  pausedTimeRemaining = null;
  currentRoutineData = null;
  currentOnComplete = null;
  currentOnUpdate = null;
}

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Export all functions for use in HTML
if (typeof window !== 'undefined') {
  window.generateRoutine = generateRoutine;
  window.displayRoutine = displayRoutine;
  window.formatTimer = formatTimer;
  window.startRoutine = startRoutine;
  window.stopRoutine = stopRoutine;
  window.pauseRoutine = pauseRoutine;
  window.resumeRoutine = resumeRoutine;
  window.calculateRoutineStats = calculateRoutineStats;
}

