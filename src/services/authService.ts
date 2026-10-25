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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';

const USER_SESSION_KEY = '@dayafterday_user_session';

export interface UserRecord {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sign up a new user with Firebase Auth and save their record in 'userTable' Firestore collection
 */
export async function signUpUser(
  name: string,
  email: string,
  pass: string
): Promise<UserRecord> {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  // 1. Create account with Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
  const firebaseUser = userCredential.user;

  // 2. Update Firebase Auth displayName
  try {
    await updateProfile(firebaseUser, { displayName: trimmedName });
  } catch (err) {
    console.warn('Failed to update displayName:', err);
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
    console.warn('Failed to write to userTable collection in Firestore:', err);
  }

  // 4. Save session to local storage
  await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(userRecord));

  return userRecord;
}

/**
 * Log in an existing user with email or username and password
 */
export async function loginUser(
  identifier: string,
  pass: string
): Promise<UserRecord> {
  let targetEmail = identifier.trim().toLowerCase();

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
          targetEmail = foundData.email;
        }
      }
    } catch (err) {
      console.warn('Username query lookup note:', err);
    }
  }

  // 1. Sign in with Firebase Auth
  const userCredential = await signInWithEmailAndPassword(auth, targetEmail, pass);
  const firebaseUser = userCredential.user;

  // 2. Fetch user details from userTable collection
  let userRecord: UserRecord | null = null;
  try {
    const userDocRef = doc(db, 'userTable', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      userRecord = userDoc.data() as UserRecord;
    }
  } catch (err) {
    console.warn('Failed to fetch from userTable:', err);
  }

  // Fallback if document does not exist yet
  if (!userRecord) {
    const timestamp = new Date().toISOString();
    userRecord = {
      userId: firebaseUser.uid,
      name: firebaseUser.displayName || targetEmail.split('@')[0],
      email: firebaseUser.email || targetEmail,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    try {
      await setDoc(doc(db, 'userTable', firebaseUser.uid), userRecord);
    } catch {
      // Ignore
    }
  }

  // 3. Save session to local storage
  await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(userRecord));

  return userRecord;
}

/**
 * Sign out and clear stored session
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Sign out error:', err);
  }
  await AsyncStorage.removeItem(USER_SESSION_KEY);
}

/**
 * Retrieve cached user from local storage
 */
export async function getCachedUser(): Promise<UserRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw) as UserRecord;
    }
  } catch (err) {
    console.warn('Error reading cached user session:', err);
  }
  return null;
}

/**
 * Subscribe to Firebase Auth state changes
 */
export function subscribeToAuthState(
  callback: (user: UserRecord | null) => void
) {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      try {
        const userDocRef = doc(db, 'userTable', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data() as UserRecord;
          await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(data));
          callback(data);
          return;
        }
      } catch (err) {
        console.warn('Error reading userTable during auth state change:', err);
      }

      const fallback: UserRecord = {
        userId: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(fallback));
      callback(fallback);
    } else {
      await AsyncStorage.removeItem(USER_SESSION_KEY);
      callback(null);
    }
  });
}
