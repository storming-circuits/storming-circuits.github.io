# 📚 The Study-Life Balancer
A Modern solution to maintain our modern problems. SePP helps students create and maintain personalized planners.

## ✨ Features

1. **Smart Routine Generator** - Creates optimized study plans with alternating study, break, and exercise intervals
   - **AI-Powered Generation** - Optional Gemini API integration for personalized routines
   - Standard algorithm-based generation (no API key required)
2. **Activity Log & Analysis Dashboard** - Tracks productivity and wellness scores with visual analytics
3. **Wellness & Habits Quiz** - 12-question quiz on effective study methods and physical wellness
4. **Firebase Authentication** - Secure user authentication and data storage
5. **User-Specific Data** - All routines, activities, and quiz results are stored per user

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase Authentication, Firebase Firestore

## 📁 Project Structure

```
/study-life-balancer
│── index.html                 # Landing page
│── dashboard.html             # Analytics dashboard
│── quiz.html                  # Wellness quiz
│── routine-generator.html     # Study routine generator
│── login.html                 # User login
│── signup.html                # User registration
│
├── /css
│ └── style.css                # Main stylesheet
│
├── /js
│ ├── auth.js                  # Authentication functions
│ ├── routine.js               # Routine generator logic
│ ├── ai-routine.js            # AI-powered routine generation (Gemini API)
│ ├── dashboard.js             # Dashboard analytics
│ ├── quiz.js                  # Quiz functionality
│ └── firebase-config.js       # Firebase configuration
│
└── README.md                  # This file
```

## 📖 Usage Guide

### Creating an Account

1. Click "Sign Up" on the homepage
2. Enter your name, email, and password
3. Your account will be created and you'll be redirected to the dashboard

### Generating a Study Routine

1. Go to "Routine Generator"
2. Enter your subjects (comma-separated)
3. Set your available time and interval preferences
4. (Optional) Check "Use AI to generate optimized routine" for AI-powered generation
   - If using AI, you can optionally enter your Gemini API key
5. Click "Generate Routine"
6. Review your optimized study plan
7. Click "Start Routine" to begin with a timer
8. Optionally save the routine for later (requires login)

### Taking the Quiz

1. Go to "Quiz"
2. Click "Start Quiz"
3. Answer 12 questions about study methods and wellness
4. Review your results and explanations
5. Your score is automatically saved to your profile

### Viewing Your Dashboard

1. Go to "Dashboard" (requires login)
2. View your:
   - Productivity Score (based on study time)
   - Wellness Score (based on breaks & exercise)
   - Study vs Break Balance
   - Daily activity statistics
   - Productivity trends
   - Recent activity logs

## 🎯 Key Features Explained

### Smart Routine Generator

- Alternates between study sessions, breaks, and exercise
- Uses Pomodoro-style timing techniques
- Distributes subjects evenly across available time
- Includes todo list functionality

### Activity Tracking

- Automatically logs study, break, and exercise sessions
- Calculates productivity and wellness scores
- Tracks daily and weekly patterns
- Identifies burnout risks

### Quiz System

- 12 comprehensive questions
- Covers study techniques (Pomodoro, Active Recall, Spaced Repetition)
- Tests knowledge of exercise benefits
- Provides detailed explanations for each answer
- Tracks progress over time

## 🔒 Security Notes

- All user data is stored securely in Firebase
- Authentication is handled by Firebase Auth
- User data is isolated per user account
- Passwords are never stored in plain text

## 🐛 Troubleshooting

### Firebase Connection Issues

- Verify your Firebase configuration in `js/firebase-config.js`
- Check that Authentication and Firestore are enabled
- Ensure your Firestore database is created

### Authentication Errors

- Make sure Email/Password authentication is enabled in Firebase Console
- Check browser console for specific error messages
- Verify your email format is correct

### Data Not Saving

- Check that you're logged in
- Verify Firestore database is created and accessible
- Check browser console for errors
- Ensure Firestore security rules allow writes

## 📝 Notes

- The application uses localStorage for todo lists (no Firebase required)
- All activity logs require user authentication
- Quiz results are saved to Firestore for tracking progress
- Routines can be saved for future reference

## 🎨 Customization

You can customize the application by:

- Modifying color scheme in `css/style.css` (CSS variables)
- Adjusting study/break intervals in routine generator
- Adding more quiz questions in `js/quiz.js`
- Customizing dashboard metrics in `js/dashboard.js`

## 📄 License

This project is open source and available for educational purposes.

## 🤝 Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

---

**Built with ❤️ to help students achieve a healthy study-life balance**

