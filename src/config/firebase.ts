import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAC1o0bogfuvQEr79JiLzlfATwrCK0tXM8',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'dayafterday-7f319.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'dayafterday-7f319',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:241183198650:web:ee64e20841768691afa183',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn('Firebase initialization note:', error);
  app = getApps().length === 0 ? initializeApp(firebaseConfig, 'fallback-app') : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

if (Platform.OS === 'web') {
  try {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  } catch {}
}

export { app, auth, db };
