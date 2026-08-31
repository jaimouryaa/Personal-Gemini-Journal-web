/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MessageTurn, ReflectionMode, EntrySummary } from '../types';

export interface ReflectResponse {
  reply: string;
  modelUsed: string;
  timestamp: number;
}

export interface SummarizeResponse {
  summary: EntrySummary;
  modelUsed: string;
}

/**
 * Call the backend server to generate Gemini AI reflection
 */
export async function requestGeminiReflection(params: {
  prompt: string;
  history?: MessageTurn[];
  mode?: ReflectionMode;
  title?: string;
}): Promise<ReflectResponse> {
  const res = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    let errorDetail = 'Failed to generate AI response';
    try {
      const errJson = await res.json();
      errorDetail = errJson.error || errorDetail;
    } catch {
      // fallback to status text
      errorDetail = `Server error (${res.status}): ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return await res.json();
}

/**
 * Call the backend server to summarize a journal session
 */
export async function requestGeminiSummary(params: {
  turns: MessageTurn[];
  title?: string;
}): Promise<SummarizeResponse> {
  const res = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    let errorDetail = 'Failed to generate summary';
    try {
      const errJson = await res.json();
      errorDetail = errJson.error || errorDetail;
    } catch {
      errorDetail = `Server error (${res.status}): ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return await res.json();
}
