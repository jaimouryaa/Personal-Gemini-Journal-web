/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Save,
  Check,
  RefreshCw,
  Brain,
  ListTodo,
  Lightbulb,
  Compass,
  FileText,
  Copy,
  Tag,
  Smile,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Share2,
} from 'lucide-react';
import { JournalEntry, MessageTurn, ReflectionMode, EntrySummary } from '../types';
import { requestGeminiReflection, requestGeminiSummary } from '../lib/geminiClient';
import { saveJournalEntry } from '../lib/firebase';

interface JournalEditorProps {
  userId: string;
  initialEntry?: JournalEntry | null;
  onEntrySaved: (savedEntry: JournalEntry) => void;
  onError: (errorMessage: string, retryAction?: () => void) => void;
}

const MODES: { id: ReflectionMode; label: string; icon: any; description: string }[] = [
  {
    id: 'deep_reflection',
    label: 'Deep Insight',
    icon: Brain,
    description: 'Explore underlying feelings, identify blindspots, and gain emotional perspective.',
  },
  {
    id: 'executive_summary',
    label: 'Summary & Actions',
    icon: FileText,
    description: 'Distill structured key themes, actionable takeaways, and prioritized next steps.',
  },
  {
    id: 'brainstorm_action',
    label: 'Brainstorming',
    icon: Lightbulb,
    description: 'Generate fresh creative solutions, paths forward, and structured experiments.',
  },
  {
    id: 'cognitive_reframe',
    label: 'Cognitive Reframe',
    icon: Compass,
    description: 'Shift unhelpful cognitive distortions into self-compassionate, empowering mindsets.',
  },
  {
    id: 'socratic_inquiry',
    label: 'Socratic Inquiry',
    icon: HelpCircle,
    description: 'Probe deeper with perceptive questions exploring assumptions and core values.',
  },
];

const MOODS = [
  { id: 'Reflective', label: '🤔 Reflective' },
  { id: 'Grateful', label: '🌱 Grateful' },
  { id: 'Inspired', label: '✨ Inspired' },
  { id: 'Challenged', label: '🧗 Challenged' },
  { id: 'Calm', label: '🌊 Calm' },
  { id: 'Determined', label: '🎯 Determined' },
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  userId,
  initialEntry,
  onEntrySaved,
  onError,
}) => {
  const [entryId, setEntryId] = useState<string>(
    initialEntry?.id || `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );
  const [title, setTitle] = useState<string>(initialEntry?.title || '');
  const [mode, setMode] = useState<ReflectionMode>(initialEntry?.mode || 'deep_reflection');
  const [mood, setMood] = useState<string>(initialEntry?.mood || 'Reflective');
  const [turns, setTurns] = useState<MessageTurn[]>(initialEntry?.turns || []);
  const [summary, setSummary] = useState<EntrySummary | undefined>(initialEntry?.summary);
  const [tags, setTags] = useState<string[]>(initialEntry?.tags || ['Mindset', 'Growth']);
  const [tagInput, setTagInput] = useState<string>('');

  // Input states
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(initialEntry?.updatedAt || null);
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);

  const turnsEndRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  // Sync if initialEntry changes
  useEffect(() => {
    if (initialEntry) {
      setEntryId(initialEntry.id);
      setTitle(initialEntry.title || '');
      setMode(initialEntry.mode || 'deep_reflection');
      setMood(initialEntry.mood || 'Reflective');
      setTurns(initialEntry.turns || []);
      setSummary(initialEntry.summary);
      setTags(initialEntry.tags || ['Mindset', 'Growth']);
      setLastSavedTime(initialEntry.updatedAt || null);
    } else {
      // Reset for a fresh entry
      setEntryId(`entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
      setTitle('');
      setMode('deep_reflection');
      setMood('Reflective');
      setTurns([]);
      setSummary(undefined);
      setTags(['Mindset', 'Growth']);
      setLastSavedTime(null);
    }
  }, [initialEntry]);

  // Scroll to bottom on new turns
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isGenerating]);

  // Persist entry to Firestore
  const persistEntry = async (currentTurns: MessageTurn[], currentSummary?: EntrySummary) => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const entryTitle = title.trim() || (currentTurns[0]?.content.slice(0, 45) + '...') || 'Untitled Reflection';
      const updatedEntry: JournalEntry = {
        id: entryId,
        userId,
        title: entryTitle,
        initialPrompt: currentTurns[0]?.content || currentPrompt,
        mode,
        mood,
        tags,
        turns: currentTurns,
        summary: currentSummary || summary,
        createdAt: initialEntry?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await saveJournalEntry(userId, updatedEntry);
      setLastSavedTime(Date.now());
      onEntrySaved(updatedEntry);
    } catch (err: any) {
      console.error('Error saving to Firestore:', err);
      onError(`Failed to save entry to Firestore: ${err.message || 'Database error'}`, () => {
        persistEntry(currentTurns, currentSummary);
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Submit new prompt turn to Gemini
  const handleSendPrompt = async () => {
    if (!currentPrompt.trim() || isGenerating) return;

    const userText = currentPrompt.trim();
    const newTurnUser: MessageTurn = {
      id: `turn_u_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };

    const nextTurns = [...turns, newTurnUser];
    setTurns(nextTurns);
    setCurrentPrompt('');
    setIsGenerating(true);

    // Provide default title if empty
    if (!title.trim()) {
      setTitle(userText.slice(0, 40) + (userText.length > 40 ? '...' : ''));
    }

    try {
      const response = await requestGeminiReflection({
        prompt: userText,
        history: turns,
        mode,
        title: title || 'Reflection Entry',
      });

      const newTurnGemini: MessageTurn = {
        id: `turn_g_${Date.now()}`,
        role: 'gemini',
        content: response.reply,
        timestamp: response.timestamp || Date.now(),
        modelUsed: response.modelUsed,
      };

      const finalTurns = [...nextTurns, newTurnGemini];
      setTurns(finalTurns);

      // Persist guaranteed complete interaction turn to Firestore
      await persistEntry(finalTurns);
    } catch (err: any) {
      console.error('Error generating AI reflection:', err);
      onError(`Gemini reflection error: ${err.message || 'Network failure'}`, () => {
        handleSendPrompt();
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate structured summary
  const handleGenerateSummary = async () => {
    if (turns.length === 0 || isSummarizing) return;
    setIsSummarizing(true);

    try {
      const response = await requestGeminiSummary({
        turns,
        title: title || 'Reflection',
      });

      setSummary(response.summary);
      await persistEntry(turns, response.summary);
    } catch (err: any) {
      console.error('Error generating summary:', err);
      onError(`Summary generation error: ${err.message || 'Service error'}`, handleGenerateSummary);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Copy turn text
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTurnId(id);
    setTimeout(() => setCopiedTurnId(null), 2000);
  };

  // Add tag
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const cleanTag = tagInput.trim().replace(/^#/, '');
      if (!tags.includes(cleanTag)) {
        const updated = [...tags, cleanTag];
        setTags(updated);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div id="journal-editor-container" className="space-y-6">
      {/* Top Configuration Bar */}
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          {/* Title Input */}
          <div className="flex-1">
            <label htmlFor="entry-title-input" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Session Title
            </label>
            <input
              id="entry-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Unpacking today's career transition decision..."
              className="w-full text-lg font-serif font-bold text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:ring-0 border-b border-transparent focus:border-zinc-500 pb-1"
            />
          </div>

          {/* Status and Action Buttons */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>Saving to Firestore...</span>
                </>
              ) : lastSavedTime ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved to Cloud Firestore</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Unsaved Draft</span>
                </>
              )}
            </div>

            <button
              id="btn-manual-save"
              type="button"
              onClick={() => persistEntry(turns)}
              disabled={isSaving || turns.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Reflection Mode Selector */}
        <div className="pt-4">
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Gemini Reflection Focus & Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = mode === m.id;
              return (
                <button
                  key={m.id}
                  id={`mode-select-${m.id}`}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400/50 bg-zinc-800/90 text-zinc-100 shadow-md ring-1 ring-amber-400/20'
                      : 'border-zinc-800 bg-[#16161a] hover:bg-[#1c1c22] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-zinc-400'}`} />
                    <span className="font-semibold text-xs leading-tight">{m.label}</span>
                  </div>
                  <span className={`text-[11px] leading-tight line-clamp-2 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {m.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mood and Tag bar */}
        <div className="flex flex-wrap items-center gap-4 pt-4 mt-4 border-t border-zinc-800/80 text-xs">
          {/* Mood chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-medium">Mood:</span>
            <div className="flex flex-wrap gap-1">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  id={`mood-chip-${m.id.toLowerCase()}`}
                  type="button"
                  onClick={() => setMood(m.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    mood === m.id
                      ? 'bg-amber-400/15 border border-amber-400/40 text-amber-300 font-semibold shadow-xs'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <Tag className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <div className="flex flex-wrap items-center gap-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 text-[11px] border border-zinc-800"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id="tag-input-field"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ tag..."
                className="text-[11px] px-1.5 py-0.5 rounded border border-transparent focus:border-zinc-700 bg-zinc-900/60 text-zinc-200 focus:outline-hidden w-16"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Structured Summary Card if available */}
      {summary && (
        <div
          id="entry-summary-panel"
          className="bg-gradient-to-br from-[#16161a] to-[#121215] text-zinc-100 rounded-2xl p-6 shadow-md border border-amber-500/30"
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Gemini Session Synthesis
              </span>
            </div>
            {summary.sentiment && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900 border border-zinc-700 text-zinc-300 capitalize">
                Tone: {summary.sentiment}
              </span>
            )}
          </div>

          <h3 className="font-serif text-lg font-bold text-zinc-100 mb-4">
            "{summary.headline}"
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-300">
            {summary.keyThemes && summary.keyThemes.length > 0 && (
              <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400 block mb-1.5">
                  Key Themes Identified:
                </span>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {summary.keyThemes.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.actionItems && summary.actionItems.length > 0 && (
              <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400 block mb-1.5">
                  Actionable Steps & Inquiries:
                </span>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {summary.actionItems.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multi-Turn Conversation Area */}
      <div className="space-y-4">
        {turns.length === 0 ? (
          <div
            id="empty-turns-placeholder"
            className="bg-[#121215] border border-zinc-800 rounded-2xl p-10 text-center text-zinc-400"
          >
            <Brain className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <h4 className="font-serif font-bold text-zinc-200 text-lg mb-1">
              Begin Your Journaling Dialogue
            </h4>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-4">
              Write down whatever is on your mind—a challenging moment, a decision you are weighing, or thoughts on your progress.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  setCurrentPrompt(
                    'I am feeling overwhelmed by conflicting priorities at work and want to regain clarity.'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              >
                💡 "Feeling overwhelmed by work priorities..."
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPrompt(
                    'I had a breakthrough today regarding my creative project, but I am unsure how to structure next steps.'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              >
                ✨ "Had a breakthrough on a creative project..."
              </button>
            </div>
          </div>
        ) : (
          turns.map((turn, index) => {
            const isUser = turn.role === 'user';
            return (
              <div
                key={turn.id || index}
                id={`conversation-turn-${turn.id || index}`}
                className={`rounded-2xl p-5 transition-all ${
                  isUser
                    ? 'bg-[#151519] border border-zinc-800 shadow-xs'
                    : 'bg-[#101013] border border-zinc-800/90 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    {isUser ? (
                      <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 flex items-center justify-center text-xs font-bold">
                        U
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-xs font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="text-xs font-bold text-zinc-200">
                      {isUser ? 'Your Journal Reflection' : 'Gemini AI Perspective'}
                    </span>
                    {!isUser && turn.modelUsed && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                        {turn.modelUsed}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span>
                      {new Date(turn.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      id={`btn-copy-turn-${turn.id}`}
                      type="button"
                      onClick={() => handleCopyText(turn.id, turn.content)}
                      title="Copy text"
                      className="p-1 hover:text-zinc-200 hover:bg-zinc-800/60 rounded transition-colors cursor-pointer"
                    >
                      {copiedTurnId === turn.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Turn Body */}
                <div className="text-zinc-200 text-sm leading-relaxed prose prose-invert max-w-none">
                  {isUser ? (
                    <p className="whitespace-pre-wrap font-serif text-zinc-100 text-base">
                      {turn.content}
                    </p>
                  ) : (
                    <ReactMarkdown>{turn.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Live Generating Animation Indicator */}
        {isGenerating && (
          <div
            id="generating-indicator"
            className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 flex items-center gap-3 animate-pulse"
          >
            <div className="w-6 h-6 rounded-md bg-amber-400/20 border border-amber-400/30 text-amber-300 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold text-zinc-200 block">
                Gemini 3.6 Flash is reflecting...
              </span>
              <span className="text-[11px] text-zinc-500">
                Synthesizing context and analyzing underlying insights
              </span>
            </div>
          </div>
        )}

        <div ref={turnsEndRef} />
      </div>

      {/* Bottom Actions and Prompt Input */}
      <div className="sticky bottom-4 z-30 bg-[#121215]/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-xl">
        {/* Quick Follow-up Buttons if we have turns */}
        {turns.length > 0 && !isGenerating && (
          <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-zinc-800/80 text-xs">
            <span className="text-zinc-500 font-medium">Quick Prompts:</span>
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={isSummarizing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-medium transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSummarizing ? 'Synthesizing...' : 'Summarize & Extract Action Items'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentPrompt('What is one high-leverage action I can take right now to address this?');
                promptInputRef.current?.focus();
              }}
              className="px-2.5 py-1 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
            >
              🎯 High-leverage next step?
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentPrompt('What cognitive assumptions might I be making that I could re-evaluate?');
                promptInputRef.current?.focus();
              }}
              className="px-2.5 py-1 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
            >
              🧠 Challenge my assumptions
            </button>
          </div>
        )}

        {/* Textarea and Send Button */}
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={promptInputRef}
              id="prompt-textarea"
              rows={3}
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
              placeholder={
                turns.length === 0
                  ? 'Write your journal entry or reflection here... (Press Cmd+Enter or click Reflect)'
                  : 'Continue the dialogue with Gemini... (Press Cmd+Enter or click Reflect)'
              }
              className="w-full text-sm text-zinc-100 placeholder:text-zinc-600 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 focus:bg-[#18181d] focus:border-zinc-600 focus:outline-hidden resize-none"
            />
            <span className="absolute bottom-2 right-2 text-[10px] text-zinc-500">
              {currentPrompt.length} chars
            </span>
          </div>

          <button
            id="btn-send-prompt"
            type="button"
            onClick={handleSendPrompt}
            disabled={!currentPrompt.trim() || isGenerating}
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all disabled:opacity-40 shadow-xs cursor-pointer shrink-0"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-zinc-900" />
            ) : (
              <>
                <span>Reflect</span>
                <Send className="w-4 h-4 text-zinc-900" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
