import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
};

let db:   firebase.firestore.Firestore | null = null;
let auth: firebase.auth.Auth           | null = null;
let isFirebaseEnabled = false;

const hasConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId;

if (hasConfig) {
  try {
    firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    db   = firebase.firestore();
    auth = firebase.auth();

    // ── SIN persistencia offline ──────────────────────────────────────────────
    // enablePersistence() fue eliminado — causaba crash de IndexedDB incompatible.
    // Firebase compat funciona correctamente en modo memoria (online-only).
    // La auth persistence se maneja por-sesión en apiService (checkbox "Recordarme").

    isFirebaseEnabled = true;
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
} else {
  console.warn('Running in OFFLINE/MOCK mode. Missing Firebase config.');
}

export { db, auth, isFirebaseEnabled };