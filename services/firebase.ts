
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

// Use process.env directly as they are injected via vite.config.ts define
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
let auth: firebase.auth.Auth | null = null;
let isFirebaseEnabled = false;

// Check if critical keys are present
const hasConfig = 
    firebaseConfig.apiKey && 
    firebaseConfig.authDomain && 
    firebaseConfig.projectId;

if (hasConfig) {
  try {
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }
    db = firebase.firestore();
    auth = firebase.auth();
    
    // Explicitly set persistence to LOCAL to maintain sessions across refreshes
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(console.error);

    // Enable offline persistence
    db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Firebase persistence failed: Multiple tabs open.');
        } else if (err.code == 'unimplemented') {
            console.warn('Firebase persistence not supported by browser.');
        }
    });

    isFirebaseEnabled = true;
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Running in OFFLINE/MOCK mode. Missing Firebase config.");
}

export { db, auth, isFirebaseEnabled };
