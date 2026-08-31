/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Shield, Lock, Brain, MessageSquare, Compass, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SecurityBadge } from './SecurityBadge';

interface LandingPageProps {
  onSignIn: () => void;
  isAuthenticating: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, isAuthenticating }) => {
  return (
    <div id="landing-page-container" className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-xs font-medium mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>AI-Powered Mindful Reflection & Private Journaling</span>
        </div>
        
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold text-zinc-100 tracking-tight leading-[1.15] mb-6">
          Your Private Sanctuary for Mindful Reflections & AI Insights.
        </h1>
        
        <p className="text-lg text-zinc-400 leading-relaxed mb-8 max-w-2xl mx-auto font-normal">
          Engage in meaningful multi-turn dialogues with Gemini 3.6 Flash to untangle thoughts, synthesize actionable breakthroughs, and preserve every journal reflection with guaranteed user-level Firestore isolation.
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="btn-landing-signin"
            type="button"
            onClick={onSignIn}
            disabled={isAuthenticating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-base transition-all shadow-lg hover:shadow-amber-400/10 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer"
          >
            {isAuthenticating ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                <span>Authenticating with Google...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google to Begin</span>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No passwords stored
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero cross-user visibility
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Persistent Firestore sync
          </span>
        </div>
      </div>

      {/* Feature Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 shadow-xs hover:border-zinc-700/80 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
            <Brain className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-zinc-100 text-lg mb-2">5 Reflection Modes</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Tailor Gemini's responses to Deep Insight, Executive Summaries, Brainstorming & Action Steps, Cognitive Reframing, or Socratic Inquiry.
          </p>
        </div>

        <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 shadow-xs hover:border-zinc-700/80 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 flex items-center justify-center mb-4">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-zinc-100 text-lg mb-2">Multi-Turn Dialogue</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Continue probing and expanding on your entries across multiple exchanges. Gemini maintains context to help you reach deeper clarity.
          </p>
        </div>

        <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 shadow-xs hover:border-zinc-700/80 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-zinc-100 text-lg mb-2">Strict User Isolation</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Every prompt, AI response, and summary is stored directly inside your authenticated user subtree in Firestore. No other user can access your data.
          </p>
        </div>
      </div>

      {/* Security Architecture Badge */}
      <SecurityBadge />
    </div>
  );
};
