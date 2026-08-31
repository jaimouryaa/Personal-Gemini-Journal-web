/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User } from 'firebase/auth';
import { Sparkles, LogOut, PlusCircle, History, BookOpen, Shield } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeTab: 'write' | 'history';
  onTabChange: (tab: 'write' | 'history') => void;
  onNewEntry: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  isSaving?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onTabChange,
  onNewEntry,
  onSignOut,
  onSignIn,
  isSaving,
}) => {
  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 bg-[#0f0f13]/90 backdrop-blur-md border-b border-zinc-800/80"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/60 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-lg text-zinc-100 tracking-tight">
                AuraJournal
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/80 text-amber-300 border border-zinc-700/60">
                Gemini 3.6 Flash
              </span>
            </div>
          </div>
        </div>

        {/* Center / Navigation items if authenticated */}
        {user && (
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800">
            <button
              id="nav-tab-write"
              type="button"
              onClick={() => onTabChange('write')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'write'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-400/90" />
              <span>Reflect</span>
            </button>
            <button
              id="nav-tab-history"
              type="button"
              onClick={() => onTabChange('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Past Entries</span>
            </button>
          </div>
        )}

        {/* Right side profile / actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                id="btn-new-entry-header"
                type="button"
                onClick={onNewEntry}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-zinc-900" />
                <span>New Session</span>
              </button>

              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                {user.photoURL ? (
                  <img
                    id="user-avatar-img"
                    src={user.photoURL}
                    alt={user.displayName || 'User profile'}
                    className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-zinc-200 leading-tight truncate max-w-[120px]">
                    {user.displayName || 'Journaler'}
                  </span>
                  <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                    {user.email || ''}
                  </span>
                </div>
                <button
                  id="btn-signout"
                  type="button"
                  onClick={onSignOut}
                  title="Sign out of your account"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors ml-1 cursor-pointer"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              id="btn-signin-nav"
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-sm cursor-pointer"
            >
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
