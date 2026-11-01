import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';

const USER_SESSION_KEY = '@dayafterday_user_session';
const LEGACY_CREDS_KEY = '@dayafterday_user_creds';

export interface UserRecord {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Remove legacy stored credentials to ensure raw passwords are never stored locally.
 */
export async function cleanupLegacyCredentials(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LEGACY_CREDS_KEY);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(LEGACY_CREDS_KEY);
    }
  } catch (err) {
    console.warn('[Auth] Note cleaning legacy credentials:', err);
  }
}

/**
 * Wait for Firebase Auth to finish checking and restoring the persisted session.
 * Resolves to the confirmed FirebaseUser if an active session exists, or null.
 */
export async function waitForAuthReady(): Promise<FirebaseUser | null> {
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    const current = auth.currentUser;
    console.log('[Auth] waitForAuthReady completed. Authenticated UID:', current ? current.uid : 'None');
    return current;
  } catch (err) {
    console.warn('[Auth] authStateReady error:', err);
    return auth.currentUser;
  }
}

/**
 * Returns the currently authenticated user's UID directly from Firebase Auth.
 */
export function getCurrentAuthenticatedUid(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

/**
 * Retrieve cached user from local storage (AsyncStorage + localStorage fallback).
 * If expectedUid is passed, verifies that the cached data belongs strictly to this user.
 */
export async function getCachedUser(expectedUid?: string): Promise<UserRecord | null> {
  try {
    let raw = await AsyncStorage.getItem(USER_SESSION_KEY);
    if (!raw && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(USER_SESSION_KEY);
    }
    if (raw) {
      const parsed = JSON.parse(raw) as UserRecord;
      if (expectedUid && parsed.userId !== expectedUid) {
        console.warn(`[Auth] Cached user UID mismatch (expected ${expectedUid}, found ${parsed.userId}). Rejecting cache.`);
        return null;
      }
      return parsed;
    }
  } catch (err) {
    console.warn('[Auth] Error reading cached user session:', err);
  }
  return null;
}

/**
 * Save user profile record to persistent local storage for fast display / offline support.
 * (Note: Never saves passwords or raw credentials).
 */
export async function saveUserSession(userRecord: UserRecord): Promise<void> {
  try {
    const json = JSON.stringify(userRecord);
    await AsyncStorage.setItem(USER_SESSION_KEY, json);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_SESSION_KEY, json);
    }
  } catch (err) {
    console.warn('[Auth] Error saving user session:', err);
  }
}

/**
 * Sign out and clear stored session and legacy credentials.
 */
export async function clearUserSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_SESSION_KEY);
    await AsyncStorage.removeItem(LEGACY_CREDS_KEY);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(USER_SESSION_KEY);
      localStorage.removeItem(LEGACY_CREDS_KEY);
    }
  } catch (err) {
    console.warn('[Auth] Error clearing cached session:', err);
  }
}

/**
 * Fetches user profile from Firestore 'userTable', with fallback to cached session or Auth profile.
 */
export async function fetchUserProfile(firebaseUser: FirebaseUser): Promise<UserRecord> {
  const uid = firebaseUser.uid;
  console.log('[Auth] Fetching user profile from Firestore userTable for UID:', uid);

  try {
    const userDocRef = doc(db, 'userTable', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data() as UserRecord;
      await saveUserSession(data);
      return data;
    }
  } catch (err) {
    console.warn('[Auth] Failed to fetch userTable doc from Firestore:', err);
  }

  // Fallback to locally cached user if matching UID
  const cached = await getCachedUser(uid);
  if (cached) {
    return cached;
  }

  // Construct fallback from Firebase Auth profile
  const timestamp = new Date().toISOString();
  const fallback: UserRecord = {
    userId: uid,
    name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User'),
    email: firebaseUser.email || '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    await setDoc(doc(db, 'userTable', uid), fallback);
  } catch (err) {
    console.warn('[Auth] Note writing fallback to userTable:', err);
  }

  await saveUserSession(fallback);
  return fallback;
}

/**
 * Sign up a new user with Firebase Auth and save their record in 'userTable' Firestore collection.
 */
export async function signUpUser(
  name: string,
  email: string,
  pass: string
): Promise<UserRecord> {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  console.log('[Auth] Creating new account for:', trimmedEmail);

  // 1. Create account with Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
  const firebaseUser = userCredential.user;

  // 2. Update Firebase Auth displayName
  try {
    await updateProfile(firebaseUser, { displayName: trimmedName });
  } catch (err) {
    console.warn('[Auth] Failed to update displayName:', err);
  }

  // 3. Create document in userTable collection with required schema
  const timestamp = new Date().toISOString();
  const userRecord: UserRecord = {
    userId: firebaseUser.uid,
    name: trimmedName,
    email: trimmedEmail,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    const userDocRef = doc(db, 'userTable', firebaseUser.uid);
    await setDoc(userDocRef, userRecord);
  } catch (err) {
    console.warn('[Auth] Failed to write to userTable collection in Firestore:', err);
  }

  // 4. Save session to local storage (no passwords)
  await saveUserSession(userRecord);

  console.log('[Auth] Sign up successful. User UID:', firebaseUser.uid);
  return userRecord;
}

/**
 * Log in an existing user with email or username and password.
 */
export async function loginUser(
  identifier: string,
  pass: string
): Promise<UserRecord> {
  let targetEmail = identifier.trim().toLowerCase();

  console.log('[Auth] Attempting login for:', targetEmail);

  // If user entered a username instead of an email, look up their email in userTable
  if (!targetEmail.includes('@')) {
    try {
      const q = query(
        collection(db, 'userTable'),
        where('name', '==', identifier.trim())
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const foundData = querySnapshot.docs[0].data() as UserRecord;
        if (foundData.email) {
          targetEmail = foundData.email.toLowerCase();
          console.log('[Auth] Resolved username to email:', targetEmail);
        }
      }
    } catch (err) {
      console.warn('[Auth] Username lookup note:', err);
    }
  }

  // 1. Sign in with Firebase Auth (session persistence is handled automatically by SDK)
  const userCredential = await signInWithEmailAndPassword(auth, targetEmail, pass);
  const firebaseUser = userCredential.user;

  console.log('[Auth] Firebase Auth sign-in successful. UID:', firebaseUser.uid);

  // 2. Fetch user profile from userTable
  const userRecord = await fetchUserProfile(firebaseUser);

  return userRecord;
}

/**
 * Sign out and clear stored session.
 */
export async function logoutUser(): Promise<void> {
  console.log('[Auth] Logging out user...');
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('[Auth] Sign out error:', err);
  }
  await clearUserSession();
  console.log('[Auth] User successfully logged out and local session cleared.');
}

/**
 * Subscribe to Firebase Auth state changes.
 */
export function subscribeToAuthState(
  callback: (user: UserRecord | null) => void
) {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    console.log('[Auth] onAuthStateChanged fired. Authenticated user:', firebaseUser ? firebaseUser.uid : 'null');
    if (firebaseUser) {
      try {
        const profile = await fetchUserProfile(firebaseUser);
        callback(profile);
      } catch (err) {
        console.warn('[Auth] Error retrieving profile on auth state change:', err);
        const fallback: UserRecord = {
          userId: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await saveUserSession(fallback);
        callback(fallback);
      }
    } else {
      await clearUserSession();
      callback(null);
    }
  });
}
