import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAC1o0bogfuvQEr79JiLzlfATwrCK0tXM8',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'dayafterday-7f319.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'dayafterday-7f319',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:241183198650:web:ee64e20841768691afa183',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// 1. Initialize Firebase App
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.warn('[Firebase] App initialization note:', error);
  app = getApps().length === 0 ? initializeApp(firebaseConfig, 'fallback-app') : getApp();
}

// 2. Initialize Firebase Auth with proper mobile & web persistence
// Mobile (iOS/Android): AsyncStorage via getReactNativePersistence
// Web: browserLocalPersistence
let persistence: any = undefined;
if (Platform.OS === 'web') {
  persistence = browserLocalPersistence;
} else {
  try {
    // In React Native Metro environment, getReactNativePersistence is exported by the react-native auth bundle
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const authModule = require('firebase/auth');
    const getRNP =
      authModule.getReactNativePersistence ||
      require('@firebase/auth/dist/rn/index.js').getReactNativePersistence;
    if (typeof getRNP === 'function') {
      persistence = getRNP(AsyncStorage);
      console.log('[Firebase] React Native AsyncStorage persistence configured for Auth');
    }
  } catch (err) {
    console.warn('[Firebase] React Native persistence initialization warning:', err);
  }
}

try {
  auth = initializeAuth(app, {
    persistence: persistence || browserLocalPersistence,
  });
} catch (error: any) {
  // If already initialized (e.g. during Fast Refresh / HMR), retrieve existing auth instance
  auth = getAuth(app);
}

// 3. Initialize Firestore
db = getFirestore(app);

export { app, auth, db };
