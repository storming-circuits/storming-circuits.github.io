// Firebase Configuration
// Replace with your Firebase project credentials
  const firebaseConfig = {
    apiKey: "AIzaSyB2H7d8KibkE9M91bDuRip-GohbgtQeYmY",
    authDomain: "c1787jr1-zonals.firebaseapp.com",
    projectId: "c1787jr1-zonals",
    storageBucket: "c1787jr1-zonals.firebasestorage.app",
    messagingSenderId: "1060126001634",
    appId: "1:1060126001634:web:27287bf23e00797a03d1bb",
    measurementId: "G-REXP83QPSC"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other files
window.auth = auth;
window.db = db;

// Firestore rules reminder (apply in Firestore console):
// match /databases/{database}/documents {
//   match /users/{uid}/stats/{docId} {
//     allow read: if request.auth != null &&
//       exists(/databases/$(database)/documents/users/$(request.auth.uid)/friends/$(uid));
//     allow write: if request.auth != null && request.auth.uid == uid;
//   }
// }

