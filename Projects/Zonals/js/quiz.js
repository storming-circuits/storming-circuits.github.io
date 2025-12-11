// Quiz Functions

// Quiz questions
const quizQuestions = [
  {
    id: 1,
    question: "What is the recommended study interval in the Pomodoro Technique?",
    options: ["25 minutes", "45 minutes", "60 minutes", "90 minutes"],
    correct: 0,
    explanation: "The Pomodoro Technique uses 25-minute focused study sessions followed by short breaks."
  },
  {
    id: 2,
    question: "What is Active Recall?",
    options: [
      "Reading notes multiple times",
      "Testing yourself on material without looking at notes",
      "Highlighting important text",
      "Summarizing in your own words"
    ],
    correct: 1,
    explanation: "Active Recall involves retrieving information from memory, which strengthens neural pathways."
  },
  {
    id: 3,
    question: "How often should you take breaks during long study sessions?",
    options: [
      "Never, to maintain focus",
      "Every 45-60 minutes",
      "Only when you feel tired",
      "Every 2-3 hours"
    ],
    correct: 1,
    explanation: "Regular breaks every 45-60 minutes help maintain focus and prevent mental fatigue."
  },
  {
    id: 4,
    question: "What is the primary benefit of exercise for studying?",
    options: [
      "It wastes time that could be spent studying",
      "It increases blood flow to the brain, improving cognitive function",
      "It makes you too tired to study",
      "It has no effect on learning"
    ],
    correct: 1,
    explanation: "Exercise increases blood flow to the brain, releases endorphins, and improves memory and cognitive function."
  },
  {
    id: 5,
    question: "What is Spaced Repetition?",
    options: [
      "Studying the same material repeatedly in one session",
      "Reviewing material at increasing intervals over time",
      "Cramming before exams",
      "Studying different subjects back-to-back"
    ],
    correct: 1,
    explanation: "Spaced Repetition involves reviewing material at gradually increasing intervals, which improves long-term retention."
  },
  {
    id: 6,
    question: "How much exercise is recommended daily for optimal brain health?",
    options: [
      "No exercise needed",
      "At least 15-30 minutes",
      "2-3 hours",
      "Only on weekends"
    ],
    correct: 1,
    explanation: "Even 15-30 minutes of daily exercise can significantly improve cognitive function and mental health."
  },
  {
    id: 7,
    question: "What is the Feynman Technique?",
    options: [
      "A method of speed reading",
      "Explaining concepts in simple terms as if teaching someone else",
      "Memorizing everything word-for-word",
      "Studying only in the morning"
    ],
    correct: 1,
    explanation: "The Feynman Technique involves explaining concepts simply, which helps identify gaps in understanding."
  },
  {
    id: 8,
    question: "Why are breaks important during study sessions?",
    options: [
      "They allow time for social media",
      "They help consolidate memory and prevent burnout",
      "They are unnecessary",
      "They only help if you sleep"
    ],
    correct: 1,
    explanation: "Breaks help the brain consolidate information, prevent burnout, and maintain long-term productivity."
  },
  {
    id: 9,
    question: "What type of exercise is best for study breaks?",
    options: [
      "Intense weightlifting",
      "Light to moderate activity like walking or stretching",
      "No exercise, only rest",
      "Competitive sports"
    ],
    correct: 1,
    explanation: "Light to moderate exercise during breaks improves focus without causing excessive fatigue."
  },
  {
    id: 10,
    question: "What is the ideal study-to-break ratio for maintaining productivity?",
    options: [
      "100% study, 0% break",
      "75% study, 25% break",
      "50% study, 50% break",
      "25% study, 75% break"
    ],
    correct: 1,
    explanation: "A 75:25 study-to-break ratio helps maintain focus while preventing burnout and promoting wellness."
  },
  {
    id: 11,
    question: "What happens to your brain during sleep that helps learning?",
    options: [
      "Nothing, sleep is just rest",
      "Memory consolidation and neural pathway strengthening",
      "Brain activity stops completely",
      "Only REM sleep helps"
    ],
    correct: 1,
    explanation: "Sleep is crucial for memory consolidation, where the brain strengthens neural connections formed during learning."
  },
  {
    id: 12,
    question: "What is Interleaving in study techniques?",
    options: [
      "Studying one subject for hours",
      "Mixing different topics or types of problems during study",
      "Studying only easy topics",
      "Avoiding difficult subjects"
    ],
    correct: 1,
    explanation: "Interleaving involves mixing different topics, which improves the brain's ability to distinguish between concepts."
  }
];

let currentQuestionIndex = 0;
let userAnswers = [];
let quizStarted = false;

// Initialize quiz
function initQuiz() {
  currentQuestionIndex = 0;
  userAnswers = [];
  quizStarted = false;
  displayQuestion();
}

// Display current question
function displayQuestion() {
  const container = document.getElementById('quiz-container');
  if (!container) return;
  
  if (currentQuestionIndex >= quizQuestions.length) {
    showQuizResults();
    return;
  }
  
  const question = quizQuestions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  const totalQuestions = quizQuestions.length;
  
  container.innerHTML = `
    <div class="quiz-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${(questionNumber / totalQuestions) * 100}%"></div>
      </div>
      <p class="progress-text">Question ${questionNumber} of ${totalQuestions}</p>
    </div>
    
    <div class="question-card">
      <h2 class="question-text">${question.question}</h2>
      <div class="options-container">
        ${question.options.map((option, index) => `
          <button class="option-btn" onclick="selectAnswer(${index})">
            ${option}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// Select answer
function selectAnswer(optionIndex) {
  const question = quizQuestions[currentQuestionIndex];
  userAnswers.push({
    questionId: question.id,
    selected: optionIndex,
    correct: question.correct,
    isCorrect: optionIndex === question.correct
  });
  
  // Highlight selected answer
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach((btn, idx) => {
    if (idx === optionIndex) {
      btn.classList.add('selected');
      if (idx === question.correct) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('incorrect');
      }
    } else if (idx === question.correct) {
      btn.classList.add('correct');
    }
    btn.disabled = true;
  });
  
  // Move to next question after a delay
  setTimeout(() => {
    currentQuestionIndex++;
    displayQuestion();
  }, 1500);
}

// Show quiz results
async function showQuizResults() {
  const container = document.getElementById('quiz-container');
  if (!container) return;
  
  const correctAnswers = userAnswers.filter(answer => answer.isCorrect).length;
  const totalQuestions = quizQuestions.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  
  let feedback = '';
  let feedbackClass = '';
  
  if (percentage >= 90) {
    feedback = 'Excellent! You have a great understanding of study-life balance!';
    feedbackClass = 'excellent';
  } else if (percentage >= 70) {
    feedback = 'Good job! You understand the basics well.';
    feedbackClass = 'good';
  } else if (percentage >= 50) {
    feedback = 'Not bad! Review the explanations to improve your knowledge.';
    feedbackClass = 'fair';
  } else {
    feedback = 'Keep learning! Review the study techniques and wellness tips.';
    feedbackClass = 'poor';
  }
  
  container.innerHTML = `
    <div class="quiz-results">
      <div class="results-header">
        <h2>Quiz Complete!</h2>
        <div class="score-circle ${feedbackClass}">
          <div class="score-value">${percentage}%</div>
          <div class="score-label">${correctAnswers}/${totalQuestions}</div>
        </div>
        <p class="feedback-text ${feedbackClass}">${feedback}</p>
      </div>
      
      <div class="results-breakdown">
        <h3>Question Review</h3>
        <div class="questions-review">
          ${quizQuestions.map((question, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = userAnswer.isCorrect;
            const selectedOption = question.options[userAnswer.selected];
            const correctOption = question.options[question.correct];
            
            return `
              <div class="review-item ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="review-header">
                  <span class="review-icon">${isCorrect ? '✓' : '✗'}</span>
                  <span class="review-question">${question.question}</span>
                </div>
                <div class="review-details">
                  <p class="review-answer ${isCorrect ? 'correct-text' : 'incorrect-text'}">
                    Your answer: ${selectedOption} ${isCorrect ? '(Correct!)' : '(Incorrect)'}
                  </p>
                  ${!isCorrect ? `<p class="review-correct">Correct answer: ${correctOption}</p>` : ''}
                  <p class="review-explanation">${question.explanation}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <div class="results-actions">
        <button class="btn-primary" onclick="saveQuizResults()">Save Results</button>
        <button class="btn-secondary" onclick="restartQuiz()">Retake Quiz</button>
        <a href="dashboard.html" class="btn-secondary">Go to Dashboard</a>
      </div>
    </div>
  `;
  
  // Save results automatically
  await saveQuizResults();
}

// Save quiz results to Firebase (user-specific)
async function saveQuizResults() {
  const user = getCurrentUser();
  if (!user) {
    alert('Please log in to save your quiz results.');
    return;
  }
  
  const correctAnswers = userAnswers.filter(answer => answer.isCorrect).length;
  const totalQuestions = quizQuestions.length;
  
  // Call saveQuizScore with correct parameter order: (score, totalQuestions, answers)
  const result = await saveQuizScore(correctAnswers, totalQuestions, userAnswers);
  
  if (result.success) {
    const saveBtn = document.querySelector('.results-actions .btn-primary');
    if (saveBtn) {
      saveBtn.textContent = '✓ Results Saved!';
      saveBtn.disabled = true;
    }
  } else {
    alert('Error saving results: ' + result.error);
  }
}

// Restart quiz
function restartQuiz() {
  initQuiz();
}

// Start quiz
function startQuiz() {
  quizStarted = true;
  const startScreen = document.getElementById('quiz-start-screen');
  const quizContainer = document.getElementById('quiz-container');
  
  if (startScreen) startScreen.style.display = 'none';
  if (quizContainer) quizContainer.style.display = 'block';
  
  initQuiz();
}

