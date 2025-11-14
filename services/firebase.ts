
// Import the functions you need from the SDKs you need
// FIX: Switched to Firebase v8 compat imports to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

let app: firebase.app.App | null = null;
let db: firebase.firestore.Firestore | null = null;
let isFirebaseEnabled = false;

// Only initialize Firebase if all config values are present
if (Object.values(firebaseConfig).every(value => value)) {
  try {
    // FIX: Updated initialization to use Firebase v8 compat syntax.
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    isFirebaseEnabled = true;
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase configuration is missing or incomplete. Running in offline mode with mock data. Please check your .env file.");
}

export { db, isFirebaseEnabled };