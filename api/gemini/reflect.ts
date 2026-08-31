import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const MODEL_FALLBACK_LADDER = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-2.0-flash-lite',
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
    const { prompt, history = [], mode = 'deep_reflection', title = 'Journal Entry' } = body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'Valid "prompt" string is required.' });
    }
    const modePrompts: Record<string, string> = {
      deep_reflection: `You are an empathetic, insightful philosophical reflection coach and journaling partner. Help the user unpack their thoughts, identify underlying emotions, uncover cognitive blindspots gently, and provide meaningful perspective. Format responses with clear markdown and 1-2 open-ended questions at the end.`,
      executive_summary: `You are an executive thinking partner. Analyze the user's reflection, distill key themes, highlight actionable takeaways, and outline prioritized next steps. Use clear bullet points, bold headers, and high clarity markdown.`,
      brainstorm_action: `You are a creative strategist and problem-solving mentor. Generate actionable, creative ideas, potential pathways, experiments, and realistic steps. Organize suggestions by immediacy (Quick wins vs. Long-term strategies).`,
      cognitive_reframe: `You are a compassionate cognitive wellness coach. Help the user identify unhelpful cognitive distortions gently, and provide realistic, empowering reframes grounded in self-compassion and agency.`,
      socratic_inquiry: `You are a master Socratic dialogue guide. Respond concisely with deep, perceptive questions that encourage the user to explore their assumptions, core values, and what is truly within their control.`,
    };
    const systemInstruction = modePrompts[mode] || modePrompts.deep_reflection;
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const turn of history) {
        if (turn && typeof turn === 'object' && turn.content) {
          contents.push({ role: turn.role === 'user' ? 'user' : 'model', parts: [{ text: String(turn.content) }] });
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: prompt.trim() }] });
    const result = await generateContentWithFallback({
      contents,
      systemInstruction: `${systemInstruction}\n\nContext title: "${title}". Respond directly to the user in a warm, respectful, constructive tone.`,
      temperature: 0.7,
    });
    return res.json({ reply: result.text, modelUsed: result.modelUsed, timestamp: Date.now() });
  } catch (error: any) {
    console.error('Error in /api/gemini/reflect:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate AI reflection response.' });
  }
}
