// FIX: Removed reference to 'vite/client' as types are now globally handled by vite-env.d.ts to fix type resolution errors.

// Import the functions you need from the SDKs you need
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

// Your web app's Firebase configuration
// FIX: Switched from import.meta.env to process.env to resolve runtime errors.
// Environment variables are now injected via Vite's `define` config.
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

// Check for missing keys for better debugging
// We check values instead of keys to ensure they are not undefined strings
const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length === 0) {
  try {
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }
    db = firebase.firestore();
    auth = firebase.auth();
    
    // Enable offline persistence to handle temporary disconnects gracefully
    db.enablePersistence().catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Firebase persistence failed: Multiple tabs open.');
        } else if (err.code == 'unimplemented') {
            console.warn('Firebase persistence not supported by browser.');
        }
    });

    isFirebaseEnabled = true;
    console.log("Firebase initialized successfully connected to:", firebaseConfig.projectId);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Running in OFFLINE/MOCK mode. Missing Firebase config keys:", missingKeys.join(', '));
  console.warn("Please ensure your .env file exists and variables start with VITE_");
}

export { db, auth, isFirebaseEnabled };