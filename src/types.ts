/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ReflectionMode =
  | 'deep_reflection'
  | 'executive_summary'
  | 'brainstorm_action'
  | 'cognitive_reframe'
  | 'socratic_inquiry';

export interface MessageTurn {
  id: string;
  role: 'user' | 'gemini';
  content: string;
  timestamp: number; // epoch ms
  modelUsed?: string;
}

export interface EntrySummary {
  headline: string;
  keyThemes: string[];
  actionItems?: string[];
  sentiment?: 'positive' | 'reflective' | 'challenging' | 'optimistic' | 'neutral';
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  initialPrompt: string;
  mode: ReflectionMode;
  turns: MessageTurn[];
  summary?: EntrySummary;
  mood?: string;
  tags?: string[];
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  isDraft?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface ReflectionStats {
  totalEntries: number;
  totalTurns: number;
  uniqueDays: number;
  activeStreak: number;
  topMoods: { mood: string; count: number }[];
}
