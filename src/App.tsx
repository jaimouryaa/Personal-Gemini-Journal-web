/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser, fetchUserJournalEntries, deleteJournalEntry } from './lib/firebase';
import { JournalEntry } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { JournalEditor } from './components/JournalEditor';
import { EntryHistory } from './components/EntryHistory';
import { StatsBanner } from './components/StatsBanner';
import { SecurityBadge } from './components/SecurityBadge';
import { ErrorBanner } from './components/ErrorBanner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // App Navigation State
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write');
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState<boolean>(false);

  // Global Error & Retry Management
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCallback, setRetryCallback] = useState<(() => void) | undefined>(undefined);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // 1. Subscribe to Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Fetch user-isolated Firestore entries
        loadEntries(currentUser.uid);
      } else {
        setEntries([]);
        setCurrentEntry(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch User Entries from Firestore
  const loadEntries = async (userId: string) => {
    setEntriesLoading(true);
    try {
      const userEntries = await fetchUserJournalEntries(userId);
      setEntries(userEntries);
    } catch (err: any) {
      console.error('Error fetching journal entries from Firestore:', err);
      setErrorMessage(`Could not load reflection history: ${err.message || 'Network error'}`);
      setRetryCallback(() => () => loadEntries(userId));
    } finally {
      setEntriesLoading(false);
    }
  };

  // 3. Auth Actions
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(`Sign-in failed: ${err.message || 'Google authentication error'}`);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setActiveTab('write');
      setCurrentEntry(null);
    } catch (err: any) {
      setErrorMessage(`Sign-out failed: ${err.message}`);
    }
  };

  // 4. Entry Handlers
  const handleNewEntry = () => {
    setCurrentEntry(null);
    setActiveTab('write');
  };

  const handleSelectEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setActiveTab('write');
  };

  const handleEntrySaved = (savedEntry: JournalEntry) => {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === savedEntry.id);
      if (exists) {
        return prev.map((e) => (e.id === savedEntry.id ? savedEntry : e));
      }
      return [savedEntry, ...prev];
    });
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      await deleteJournalEntry(user.uid, entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      if (currentEntry?.id === entryId) {
        setCurrentEntry(null);
      }
    } catch (err: any) {
      setErrorMessage(`Failed to delete reflection: ${err.message}`);
    }
  };

  const triggerError = (msg: string, retryFn?: () => void) => {
    setErrorMessage(msg);
    setRetryCallback(() => retryFn);
  };

  const executeRetry = async () => {
    if (!retryCallback) return;
    setIsRetrying(true);
    try {
      await retryCallback();
      setErrorMessage(null);
      setRetryCallback(undefined);
    } catch (e) {
      console.error('Retry failed:', e);
    } finally {
      setIsRetrying(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-zinc-400">
        <div className="w-10 h-10 border-2 border-zinc-800 border-t-amber-400 rounded-full animate-spin mb-4" />
        <p className="font-serif font-semibold text-zinc-100 text-lg tracking-wide">
          Loading AuraJournal...
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Initializing secure Firebase authentication & Firestore isolation
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col font-sans selection:bg-amber-400/20 selection:text-amber-200">
      {/* Navigation Header */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewEntry={handleNewEntry}
        onSignOut={handleSignOut}
        onSignIn={handleSignIn}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Error Banner with Retry */}
        <ErrorBanner
          message={errorMessage}
          onRetry={retryCallback ? executeRetry : undefined}
          onDismiss={() => {
            setErrorMessage(null);
            setRetryCallback(undefined);
          }}
          isRetrying={isRetrying}
        />

        {!user ? (
          /* Unauthenticated Landing View */
          <LandingPage onSignIn={handleSignIn} isAuthenticating={isAuthenticating} />
        ) : (
          /* Authenticated Dashboard View */
          <div id="authenticated-dashboard" className="space-y-6">
            {/* Quick Analytics / Reflection Stats Banner */}
            <StatsBanner entries={entries} />

            {/* Tab View: Active Editor vs Past Entries History */}
            {activeTab === 'write' ? (
              <JournalEditor
                key={currentEntry?.id || 'new'}
                userId={user.uid}
                initialEntry={currentEntry}
                onEntrySaved={handleEntrySaved}
                onError={triggerError}
              />
            ) : (
              <EntryHistory
                entries={entries}
                isLoading={entriesLoading}
                onSelectEntry={handleSelectEntry}
                onDeleteEntry={handleDeleteEntry}
                onNewEntry={handleNewEntry}
              />
            )}

            {/* Architecture / Privacy Guarantee Banner */}
            <div className="pt-8">
              <SecurityBadge />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#0d0d10] py-6 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-zinc-400">
            AuraJournal • Powered by Gemini 3.6 Flash & Cloud Firestore Isolation
          </span>
          <span className="text-[11px] text-zinc-600">
            Encrypted in transit & at rest • Strictly Owner-Bound Paths
          </span>
        </div>
      </footer>
    </div>
  );
}
