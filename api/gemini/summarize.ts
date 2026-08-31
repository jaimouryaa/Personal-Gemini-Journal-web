import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const MODEL_FALLBACK_LADDER = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro',
];

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) console.warn('GEMINI_API_KEY not configured');
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

async function generateContentWithFallback(promptConfig: {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
}): Promise<{ text: string; modelUsed: string }> {
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
      return { text: response.text || '', modelUsed: model };
    } catch (err: any) {
      console.warn(`Model "${model}" failed:`, err?.message);
      lastError = err;
    }
  }
  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { turns = [], title = '' } = body;
    if (!Array.isArray(turns) || turns.length === 0) {
      return res.status(400).json({ error: 'Non-empty "turns" array is required.' });
    }
    const conversationTranscript = turns
      .map((t: any) => `${t.role === 'user' ? 'User' : 'Gemini'}: ${t.content}`)
      .join('\n\n');
    const prompt = `Analyze the following user journal/reflection session:
---
${conversationTranscript}
---

Return a structured JSON object with this schema:
{
  "headline": "A concise 1-sentence synopsis of the core theme or breakthrough",
  "keyThemes": ["theme 1", "theme 2", "theme 3"],
  "actionItems": ["action item 1", "action item 2"],
  "sentiment": "positive" | "reflective" | "challenging" | "optimistic" | "neutral"
}

Output valid JSON only. No backticks or markdown fences.`;

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
    return res.json({ summary: summaryData, modelUsed: result.modelUsed });
  } catch (error: any) {
    console.error('Error in /api/gemini/summarize:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate session summary.' });
  }
}
