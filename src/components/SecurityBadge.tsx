/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Lock, Database, Sparkles } from 'lucide-react';

export const SecurityBadge: React.FC = () => {
  return (
    <div
      id="security-architecture-badge"
      className="bg-[#121215] border border-zinc-800 rounded-xl p-4 my-4 text-xs text-zinc-400"
    >
      <div className="flex items-center gap-2 font-semibold text-zinc-200 mb-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Enterprise-Grade Privacy & Data Isolation Architecture</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium text-zinc-300 block">User Identity Isolation</span>
            <span className="text-zinc-500">Google Sign-In via Firebase Auth. No raw passwords stored.</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Database className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium text-zinc-300 block">Scoped Firestore Rules</span>
            <span className="text-zinc-500">Strict path isolation (`users/$uid/entries/*`). Cross-user reads blocked.</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400/80 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium text-zinc-300 block">Server-Side AI Gateway</span>
            <span className="text-zinc-500">Gemini API keys securely handled in backend with resilient fallback.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
