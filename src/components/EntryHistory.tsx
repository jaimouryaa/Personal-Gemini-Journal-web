/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Calendar,
  Sparkles,
  ArrowRight,
  Trash2,
  Download,
  MessageSquare,
  Tag,
  Filter,
  Eye,
  Edit3,
} from 'lucide-react';
import { JournalEntry } from '../types';

interface EntryHistoryProps {
  entries: JournalEntry[];
  isLoading: boolean;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onNewEntry: () => void;
}

export const EntryHistory: React.FC<EntryHistoryProps> = ({
  entries,
  isLoading,
  onSelectEntry,
  onDeleteEntry,
  onNewEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtered entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      !searchQuery.trim() ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.initialPrompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      entry.turns.some((t) => t.content.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMood = selectedMood === 'All' || entry.mood === selectedMood;

    return matchesSearch && matchesMood;
  });

  const allMoods = ['All', ...Array.from(new Set(entries.map((e) => e.mood).filter(Boolean)))];

  // Export entry to markdown file download
  const handleExportMarkdown = (entry: JournalEntry) => {
    const dateStr = new Date(entry.createdAt).toLocaleDateString();
    let mdContent = `# ${entry.title}\n\n`;
    mdContent += `**Date:** ${dateStr}\n`;
    mdContent += `**Mood:** ${entry.mood || 'N/A'}\n`;
    mdContent += `**Mode:** ${entry.mode}\n`;
    mdContent += `**Tags:** ${(entry.tags || []).map((t) => `#${t}`).join(' ')}\n\n`;

    if (entry.summary) {
      mdContent += `## Gemini Summary\n`;
      mdContent += `> ${entry.summary.headline}\n\n`;
      if (entry.summary.keyThemes?.length) {
        mdContent += `### Key Themes\n`;
        entry.summary.keyThemes.forEach((th) => (mdContent += `- ${th}\n`));
        mdContent += `\n`;
      }
      if (entry.summary.actionItems?.length) {
        mdContent += `### Action Items\n`;
        entry.summary.actionItems.forEach((act) => (mdContent += `- ${act}\n`));
        mdContent += `\n`;
      }
    }

    mdContent += `## Dialogue Transcript\n\n`;
    entry.turns.forEach((turn, idx) => {
      mdContent += `### ${turn.role === 'user' ? 'User' : 'Gemini AI'}\n`;
      mdContent += `${turn.content}\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entry.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'reflection'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const confirmAndDelete = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this reflection entry from Firestore?')) {
      setDeletingId(entryId);
      try {
        await onDeleteEntry(entryId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div id="entry-history-container" className="space-y-6">
      {/* Header and Search Filters */}
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-zinc-100">
            Reflection History
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Your saved multi-turn dialogues and AI syntheses isolated in Cloud Firestore
          </p>
        </div>

        {/* Search Input */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="search-entries-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past reflections..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl focus:bg-[#18181d] focus:border-zinc-600 focus:outline-hidden placeholder:text-zinc-500"
            />
          </div>

          <button
            id="btn-new-entry-history"
            type="button"
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>+ New Reflection</span>
          </button>
        </div>
      </div>

      {/* Mood Filters */}
      {allMoods.length > 2 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="text-zinc-400 font-medium shrink-0">Filter Mood:</span>
          {allMoods.map((m) => (
            <button
              key={m}
              id={`filter-mood-${m?.toLowerCase() || 'all'}`}
              type="button"
              onClick={() => setSelectedMood(m || 'All')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                selectedMood === m
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* List / Grid of Entries */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 animate-pulse space-y-3"
            >
              <div className="h-4 bg-zinc-800 rounded w-3/4" />
              <div className="h-3 bg-zinc-900 rounded w-1/2" />
              <div className="h-16 bg-zinc-900/60 rounded" />
            </div>
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div
          id="no-entries-card"
          className="bg-[#121215] border border-zinc-800 rounded-2xl p-12 text-center text-zinc-400"
        >
          <Calendar className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
          <h3 className="font-serif font-bold text-zinc-200 text-lg mb-1">
            {searchQuery ? 'No matching reflections found' : 'No reflections recorded yet'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-6">
            {searchQuery
              ? 'Try modifying your search keywords or clearing mood filters.'
              : 'Begin your first conversation with Gemini to capture reflections and build your private wisdom archive.'}
          </p>
          <button
            type="button"
            onClick={onNewEntry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
            <span>Start First Entry</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => {
            const firstUserPrompt = entry.turns.find((t) => t.role === 'user')?.content || entry.initialPrompt;

            return (
              <div
                key={entry.id}
                id={`history-card-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className="bg-[#131317] border border-zinc-800/90 hover:border-zinc-700 hover:bg-[#18181d] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h3 className="font-serif font-bold text-base text-zinc-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                        {entry.title || 'Untitled Reflection'}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(entry.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{entry.mode.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {/* Mood Chip */}
                    {entry.mood && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/10 border border-amber-400/30 text-amber-300 shrink-0">
                        {entry.mood}
                      </span>
                    )}
                  </div>

                  {/* Summary / Snippet */}
                  {entry.summary ? (
                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 my-3 text-xs text-zinc-300">
                      <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[10px] uppercase mb-1">
                        <Sparkles className="w-3 h-3" />
                        <span>AI Synthesis</span>
                      </div>
                      <p className="line-clamp-2 italic text-zinc-400">
                        "{entry.summary.headline}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 line-clamp-2 my-3 italic">
                      "{firstUserPrompt}"
                    </p>
                  )}

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {entry.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs text-zinc-500 mt-2">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{entry.turns.length} exchange{entry.turns.length === 1 ? '' : 's'}</span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      id={`btn-export-${entry.id}`}
                      type="button"
                      onClick={() => handleExportMarkdown(entry)}
                      title="Export Markdown"
                      className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`btn-delete-${entry.id}`}
                      type="button"
                      onClick={(e) => confirmAndDelete(e, entry.id)}
                      disabled={deletingId === entry.id}
                      title="Delete Entry"
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`btn-open-${entry.id}`}
                      type="button"
                      onClick={() => onSelectEntry(entry)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors ml-1 cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
