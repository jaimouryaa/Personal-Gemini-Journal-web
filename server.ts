/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Mandatory Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize GoogleGenAI SDK lazily/safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable is not configured');
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

/**
 * Standard Helper with Resilient Model Fallback Ladder & Error Recovery Matrix
 */
async function generateContentWithFallback(
  promptConfig: {
    contents: any;
    systemInstruction?: string;
    temperature?: number;
  }
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: promptConfig.contents,
        config: {
          systemInstruction: promptConfig.systemInstruction,
          temperature: promptConfig.temperature ?? 0.7,
        },
      });

      const responseText = response.text || '';
      return { text: responseText, modelUsed: model };
    } catch (err: any) {
      console.warn(`Attempt with model "${model}" failed. Checking error recovery matrix...`, err?.message || err);
      lastError = err;
      const status = err?.status || err?.statusCode || (err?.message?.includes('429') ? 429 : 500);
      const isRecoverable = [503, 429, 404, 500, 400].includes(Number(status)) || err?.message?.includes('fetch failed');

      if (!isRecoverable && !err?.message?.includes('not found')) {
        // If not recoverable or unhandled, still try next model in ladder before giving up
      }
      // Continue to next model in the fallback ladder
    }
  }

  throw new Error(`All models in fallback ladder failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

/**
 * Multi-Turn Reflection & Journal Conversation Endpoint
 */
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    // 2. Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { prompt, history = [], mode = 'deep_reflection', title = 'Journal Entry' } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'Valid "prompt" string is required.' });
    }

    const modePrompts: Record<string, string> = {
      deep_reflection: `You are an empathetic, insightful philosophical reflection coach and journaling partner. 
Your goal is to help the user unpack their thoughts, identify underlying emotions, uncover cognitive blindspots gently, and provide meaningful perspective. 
Format your responses with clear markdown, incorporating thoughtful reflections and 1-2 open-ended inquiry questions at the end.`,
      executive_summary: `You are an executive thinking partner. 
Analyze the user's reflection, distill key themes, highlight actionable takeaways, and outline prioritized next steps. 
Use clear bullet points, bold headers, and high clarity markdown.`,
      brainstorm_action: `You are a creative strategist and problem-solving mentor. 
Generate actionable, creative ideas, potential pathways, experiments, and realistic steps to help the user navigate their situation. 
Organize suggestions by immediacy (Quick wins vs. Long-term strategies).`,
      cognitive_reframe: `You are a compassionate cognitive wellness coach. 
Help the user identify unhelpful cognitive distortions (catastrophizing, all-or-nothing thinking, emotional reasoning) gently, and provide realistic, empowering reframes grounded in self-compassion and agency.`,
      socratic_inquiry: `You are a master Socratic dialogue guide. 
Respond concisely with deep, perceptive questions that encourage the user to explore their assumptions, core values, and what is truly within their control.`,
    };

    const systemInstruction = modePrompts[mode] || modePrompts.deep_reflection;

    // Build multi-turn conversation structure
    const contents: any[] = [];

    if (Array.isArray(history) && history.length > 0) {
      for (const turn of history) {
        if (turn && typeof turn === 'object' && turn.content) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(turn.content) }],
          });
        }
      }
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt.trim() }],
    });

    const result = await generateContentWithFallback({
      contents,
      systemInstruction: `${systemInstruction}\n\nContext context title: "${title}". Respond directly to the user in a warm, respectful, constructive tone.`,
      temperature: 0.7,
    });

    return res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/reflect:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate AI reflection response.',
    });
  }
});

/**
 * Summarize Journal Entry Endpoint
 */
app.post('/api/gemini/summarize', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { turns = [], title = '' } = body;

    if (!Array.isArray(turns) || turns.length === 0) {
      return res.status(400).json({ error: 'Non-empty "turns" array is required for summarization.' });
    }

    const conversationTranscript = turns
      .map((t: any) => `${t.role === 'user' ? 'User' : 'Gemini'}: ${t.content}`)
      .join('\n\n');

    const prompt = `Analyze the following user journal/reflection session:
---
${conversationTranscript}
---

Return a structured JSON object with the following schema:
{
  "headline": "A concise 1-sentence synopsis of the core theme or breakthrough",
  "keyThemes": ["theme 1", "theme 2", "theme 3"],
  "actionItems": ["action item 1", "action item 2"],
  "sentiment": "positive" | "reflective" | "challenging" | "optimistic" | "neutral"
}

Ensure the response is valid JSON only. Do not wrap in backticks or markdown fences if possible.`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: 'You are a precise JSON summary extractor. Output strictly valid JSON without extra prose.',
      temperature: 0.2,
    });

    let summaryData: any = {};
    try {
      const cleanJson = result.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      summaryData = JSON.parse(cleanJson);
    } catch {
      summaryData = {
        headline: 'Reflection & Insight Session',
        keyThemes: ['Self-discovery', 'Mindfulness', 'Personal Growth'],
        actionItems: ['Review journal insights', 'Take a mindful pause'],
        sentiment: 'reflective',
      };
    }

    return res.json({
      summary: summaryData,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/summarize:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate session summary.',
    });
  }
});

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AuraJournal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
