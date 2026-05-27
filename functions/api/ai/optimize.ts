/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface Env {
  GEMINI_API_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    
    // Check if client supplied their own key in request headers first
    let apiKey = request.headers.get("x-gemini-api-key") || "";
    
    // If not supplied, fallback to the website owner's environment variable
    if (!apiKey) {
      apiKey = env.GEMINI_API_KEY || "";
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No Gemini API Key supplied. You can paste your own API key in the 'AI Settings' field of this assistant, or ask the website owner to configure GEMINI_API_KEY in their Cloudflare dashboard.",
          setupNeeded: true
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    // Parse request body
    const body: any = await request.json();
    const { action, text, genre, tone, targetAudience, extraPrompt } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action parameter is required' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Outline the specific prompts tailored to actions
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

Provide a list of 5-6 chapter titles with a 1-sentence synopsis/theme for each, styled in beautiful markdown description lists. Avoid generic labels like "Chapter 1: Summary", make them sound like real novels.`;
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call standard Google Gemini Developer Endpoints using modern REST structure 
    // This runs completely cloud-native on Cloudflare's high performance edge network
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Google Gemini API returned a server error: ${geminiResponse.statusText}. Details: ${JSON.stringify(errorData)}`
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const resJson: any = await geminiResponse.json();
    const generatedText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate suggestions.";

    return new Response(
      JSON.stringify({
        success: true,
        result: generatedText
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Error in Cloudflare Pages Serverless Function: ${err.message || err}`
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
