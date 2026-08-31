/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { JournalEntry } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase SDK
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const googleProvider = new GoogleAuthProvider();

// Ensure Google provider prompts for account selection cleanly
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Strict Undefined-Stripping Utility
 * Mandated by Production Directives to prevent Firestore SDK crash on undefined fields.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Ensure user document exists in isolated users path
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(
          userRef,
          stripUndefined({
            uid: result.user.uid,
            displayName: result.user.displayName || 'Anonymous User',
            email: result.user.email || '',
            photoURL: result.user.photoURL || '',
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
          }),
          { merge: true }
        );
      } else {
        await setDoc(
          userRef,
          {
            lastLoginAt: Date.now(),
          },
          { merge: true }
        );
      }
    }
    return result.user;
  } catch (error) {
    console.error('Firebase Authentication Error:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Firebase Sign Out Error:', error);
    throw error;
  }
}

/**
 * Save or update a Journal Entry in Firestore strictly isolated to user's document subtree:
 * users/{userId}/entries/{entryId}
 */
export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required for saving entries to isolated path');
  }
  if (!entry.id) {
    throw new Error('Entry ID is required');
  }

  const cleanEntry = stripUndefined({
    ...entry,
    userId,
    updatedAt: Date.now(),
  });

  const entryRef = doc(db, 'users', userId, 'entries', entry.id);
  await setDoc(entryRef, cleanEntry, { merge: true });
}

/**
 * Fetch all entries for a specific authenticated user
 */
export async function fetchUserJournalEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];

  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(entriesRef, orderBy('createdAt', 'desc'), limit(100));

  const querySnapshot = await getDocs(q);
  const entries: JournalEntry[] = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data() as JournalEntry;
    entries.push({
      ...data,
      id: docSnap.id,
    });
  });

  return entries;
}

/**
 * Delete a user's journal entry
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) {
    throw new Error('User ID and Entry ID are required to delete');
  }

  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryRef);
}
