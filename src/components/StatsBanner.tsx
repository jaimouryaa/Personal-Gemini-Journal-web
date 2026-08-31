/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Flame, BookOpen, Compass, Award } from 'lucide-react';
import { JournalEntry } from '../types';

interface StatsBannerProps {
  entries: JournalEntry[];
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ entries }) => {
  const totalEntries = entries.length;
  const totalTurns = entries.reduce((acc, curr) => acc + (curr.turns?.length || 0), 0);

  // Calculate unique active days
  const activeDays = new Set(
    entries.map((e) => new Date(e.createdAt).toISOString().split('T')[0])
  ).size;

  // Most common mood
  const moodCounts: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.mood) {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    }
  });

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Reflective';

  return (
    <div
      id="reflection-stats-banner"
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
    >
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
          <BookOpen className="w-3.5 h-3.5 text-zinc-300" />
          <span>Total Entries</span>
        </div>
        <div className="font-serif text-2xl font-bold text-zinc-100">{totalEntries}</div>
      </div>

      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>AI Exchanges</span>
        </div>
        <div className="font-serif text-2xl font-bold text-zinc-100">{totalTurns}</div>
      </div>

      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>Active Days</span>
        </div>
        <div className="font-serif text-2xl font-bold text-zinc-100">{activeDays}</div>
      </div>

      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Primary Tone</span>
        </div>
        <div className="font-serif text-base font-bold text-zinc-100 truncate">
          {dominantMood}
        </div>
      </div>
    </div>
  );
};
