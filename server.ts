/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Mount json middleware
app.use(express.json());

// Initialize Gemini Client Safely based on provided or fallback system key
function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Global server check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// AI Optimization Route
app.post('/api/ai/optimize', async (req, res) => {
  const { action, text, genre, tone, targetAudience, extraPrompt } = req.body;
  const clientKey = req.headers['x-gemini-api-key'] as string | undefined;

  if (!action) {
    return res.status(400).json({ error: 'Action parameter is required' });
  }

  // Check if we have any valid key
  const finalKey = clientKey || process.env.GEMINI_API_KEY;
  if (!finalKey) {
    return res.json({
      success: false,
      error: 'No Gemini API Key supplied. You can paste your own API key in the AI Assistant settings, or ask the developer to configure GEMINI_API_KEY.',
      setupNeeded: true
    });
  }

  try {
    const ai = getGeminiClient(clientKey);
    let prompt = '';

    if (action === 'blurb') {
      prompt = `You are an elite, best-selling book marketing and copywriting expert. 
Your goal is to optimize a book's back-cover description (blurb) to convert browsing readers into eager buyers.

Genre: ${genre || 'General Fiction'}
Tone Style: ${tone || 'Compelling & Dramatic'}
Target Audience: ${targetAudience || 'General Readers'}
Draft Description:
"${text}"

${extraPrompt ? `Additional Constraints/Instructions: ${extraPrompt}` : ''}

Format Requirements:
- Start with a powerful, high-contrast hook sentence (bolded).
- Split the description into 2 to 3 punchy, evocative paragraphs.
- Keep standard KDP/IngramSpark formatting (avoid obscure unicode symbols that break print systems, plain text HTML bold <b> or standard formatting like bullet points or bold text is fine).
- Do not include meta labels like "Hook:" or "Paragraph 1:". Just output the optimized blurb text directly.`;
    } else if (action === 'bio') {
      prompt = `You are a high-level literary agent. Refine this author's biography to sound authoritative, compelling, and perfectly tailored for their genre.

Author Draft Bio:
"${text}"

Genre/Field: ${genre || 'General'}
Tone Theme: ${tone || 'Professional & Inspiring'}
Target Audience: ${targetAudience || 'General Readers'}

${extraPrompt ? `Additional Instructions: ${extraPrompt}` : ''}

Format Requirements:
- Write 1 to 2 clean, highly engaging paragraphs in third-person.
- Highlight their expertise, passion, or creative background nicely.
- Keep it under 150 words total, perfect for print jackets or KDP author panels.`;
    } else if (action === 'aesthetics') {
      prompt = `You are an experienced print book interior and cover designer.
Provide design suggestions based on the author's genre, themes, and goals.

Genre/Themes: ${genre || 'Drama'}
Target Audience: ${targetAudience || 'General'}
Tone/Vibe: ${tone || 'Classic'}

Recommend:
1. Standard Trim Size (e.g. 5x8, 5.5x8.5, 6x9, or 7x10) with layout rationale.
2. Premium Paper Color and Spine Weight strategy.
3. Interior Typography: Recommend a matching serif font style (classical, modern, technical) and styling tips.
4. Suggested Chapter Ornaments (such as triple-star, divider bars, botanical glyphs) and chapter headings layout.
5. Cover Color Palette: 3 matching hex color suggestions for Spine Background, Spine Text, and Front Cover image tint or backdrop, with design notes.

Deliver the design recommendation in rich markdown format, structured with beautiful sections, perfect for a designer's brief. Keep it warm, concise, and highly professional.`;
    } else if (action === 'chapters') {
      prompt = `You are a creative collaborative editor. Based on the following book overview or theme, please generate 5 to 6 imaginative, evocative chapter titles that follow a standard storytelling hook pattern.

Book Information / Idea / Summary:
"${text || 'A journey through a ruined world of iron smiths and memory-keepers'}"

Genre: ${genre || 'Fiction'}
Tone: ${tone || 'Evocative'}

Provide a list of 5-6 chapter titles with a 1-sentence synopsis/theme for each, styled in beautiful markdown description lists. Avoid generic labels like "Chapter 1: Summary", make them sound like real novels (e.g., 'The Hearth of Forgotten Tongues', 'Signs in the Slag').`;
    } else if (action === 'dedication') {
      prompt = `You are an elite, award-winning literary copy editor.
Generate three (3) distinct, beautiful, and deeply evocative book interior dedications.

The author wants to dedicate their book to: "${text || 'My family'}"
Vibe/Tone Style: ${tone || 'Heartfelt & Deeply Emotional'}
Book Genre: ${genre || 'Fiction'}

Format Specs:
- Draft 1 (Classic & Elegant): Poignant, ultra-brief, and perfectly balanced (1 short sentence).
- Draft 2 (Poetic & Moody): Rich with metaphorical imagery or emotional resonance (1-2 sentences).
- Draft 3 (Stylistic & Bold): A clever, funny, or highly unique option tailored to the requested tone (e.g., funny, academic, romantic).

Deliver only the three options. Display them with beautiful, clear headers such as "**Option 1: Traditional**" and do not include conversational introductions or signature lines. Use standard typographic symbols if helpful.`;
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const optimizedResult = response.text || 'Could not generate a response.';
    return res.json({
      success: true,
      result: optimizedResult
    });

  } catch (error: any) {
    console.error('Error generating with Gemini:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during call to Google Gemini.'
    });
  }
});

// Manage Vite / Static Assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
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
    console.log(`PublishingForge server running on http://localhost:${PORT}`);
  });
}

startServer();
