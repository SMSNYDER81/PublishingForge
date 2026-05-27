/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Sparkles, FileText, User, Palette, Bookmark, ArrowRight, Loader2, 
  CheckCircle2, AlertTriangle, Key, ChevronDown, ChevronUp, Copy, Check 
} from 'lucide-react';

interface AIAssistantProps {
  onApplyBlurb?: (text: string) => void;
  onApplyBio?: (text: string) => void;
  onApplyAesthetics?: (colors: { spineBgColor: string; backBgColor: string; spineTextColor: string }) => void;
  currentBookTitle?: string;
  defaultGenre?: string;
}

type AITab = 'blurb' | 'bio' | 'aesthetics' | 'chapters';

export default function AIAssistant({ 
  onApplyBlurb, 
  onApplyBio, 
  onApplyAesthetics,
  currentBookTitle = '',
  defaultGenre = 'Fiction'
}: AIAssistantProps) {
  const [activeTab, setActiveTab] = useState<AITab>('blurb');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [setupNeeded, setSetupNeeded] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Custom LocalStorage User API key override
  const [customKey, setCustomKey] = useState<string>(() => {
    return localStorage.getItem('user_gemini_api_key') || '';
  });
  const [showKeyConfig, setShowKeyConfig] = useState<boolean>(false);

  // Form parameters
  const [genre, setGenre] = useState<string>(defaultGenre);
  const [tone, setTone] = useState<string>('Compelling & Dramatic');
  const [targetAudience, setTargetAudience] = useState<string>('Young Adult & General Fiction');
  const [textInput, setTextInput] = useState<string>('');
  const [extraPrompt, setExtraPrompt] = useState<string>('');

  // Results cache
  const [blurbResult, setBlurbResult] = useState<string>('');
  const [bioResult, setBioResult] = useState<string>('');
  const [aestheticResult, setAestheticResult] = useState<string>('');
  const [chapterResult, setChapterResult] = useState<string>('');

  const genresList = [
    'Fiction / Novel',
    'Sci-Fi & Fantasy',
    'Mystery & Thriller',
    'Romance / Drama',
    'Biography & Memoir',
    'Self-Help & Business',
    'History & Politics',
    'Workbook / Journals',
    'Poetry & Essays'
  ];

  const tonesList = [
    'Compelling & Dramatic',
    'Highly Professional & Authoritative',
    'Warm, Friendly & Inspiring',
    'Mysterious & Intense',
    'Academic & Educational',
    'Creative & Playful'
  ];

  const handleTabChange = (tab: AITab) => {
    setActiveTab(tab);
    setError(null);
    setSuccessMsg(null);
    
    // Set helpful initial template drafts depending on the tab
    if (tab === 'blurb' && !textInput) {
      setTextInput("Five people are stranded on a low-energy mining colony where forging scrap is the only survival key. When an ancient scribe manuscript arrives, everything changes.");
    } else if (tab === 'bio' && !textInput) {
      setTextInput("P. Smith lives in Oregon. He studied blacksmithing and wrote two books about historical crafts. He likes cats.");
    } else if (tab === 'chapters' && !textInput) {
      setTextInput(currentBookTitle || "The Sparks of Creation: A story of memory-keepers in a soot-stained world.");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeAIMagic = async () => {
    setLoading(true);
    setError(null);
    setSetupNeeded(false);
    setSuccessMsg(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customKey.trim()) {
        headers['X-Gemini-API-Key'] = customKey.trim();
      }

      const response = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: activeTab,
          text: textInput,
          genre,
          tone,
          targetAudience,
          extraPrompt
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to call AI Forge Service');
      }

      if (data.setupNeeded) {
        setSetupNeeded(true);
        setError(data.error);
        return;
      }

      if (!data.success) {
        throw new Error(data.error || 'Server reported generation failure.');
      }

      // Save results
      if (activeTab === 'blurb') {
        setBlurbResult(data.result);
      } else if (activeTab === 'bio') {
        setBioResult(data.result);
      } else if (activeTab === 'aesthetics') {
        setAestheticResult(data.result);
      } else if (activeTab === 'chapters') {
        setChapterResult(data.result);
      }

      setSuccessMsg('AI optimization completed successfully!');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Parse Hex Colors out of Aesthetic suggestion to apply back directly!
  const getColorsFromAestheticText = (text: string) => {
    const hexRegex = /#([a-fA-F0-9]{6})/g;
    const matches = text.match(hexRegex);
    if (matches && matches.length >= 2) {
      return {
        spineBgColor: matches[0],
        backBgColor: matches[1],
        spineTextColor: matches[2] || '#ffffff'
      };
    }
    return null;
  };

  const currentResult = () => {
    if (activeTab === 'blurb') return blurbResult;
    if (activeTab === 'bio') return bioResult;
    if (activeTab === 'aesthetics') return aestheticResult;
    return chapterResult;
  };

  return (
    <div id="ai-assistant-panel" className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl overflow-hidden shadow-xl transition-all duration-300">
      
      {/* Dynamic Header Block */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-indigo-950/40 p-4 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500/10 p-1.5 rounded-md text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-indigo-400 tracking-wider font-bold block uppercase">
              Publishing Forge Assistant
            </span>
            <h4 className="font-serif font-bold text-sm tracking-tight text-white">
              AI Design &amp; Copy Studio
            </h4>
          </div>
        </div>
        <div className="text-slate-400 hover:text-white transition-colors">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 md:p-5 space-y-4 font-sans">
          
          {/* Custom API Key input drawer info */}
          <div className="bg-slate-950/40 p-2.5 text-[11px] rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Key className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              API Key Mode: {customKey.trim() ? (
                <span className="text-emerald-400 font-bold font-mono">Custom Key (Active)</span>
              ) : (
                <span className="text-slate-400 font-mono text-[10px]">Default Server Key</span>
              )}
            </span>
            <button 
              type="button"
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="text-indigo-400 hover:text-indigo-300 underline font-mono font-bold hover:no-underline transition-all"
            >
              {showKeyConfig ? 'Hide Key Configuration' : 'Change Key'}
            </button>
          </div>

          {showKeyConfig && (
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-slate-300 uppercase">Your Personal Gemini Key</span>
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[10px] text-indigo-400 hover:underline font-bold"
                >
                  Get free key &rarr;
                </a>
              </div>
              <input
                type="password"
                value={customKey}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomKey(val);
                  if (val.trim()) {
                    localStorage.setItem('user_gemini_api_key', val.trim());
                  } else {
                    localStorage.removeItem('user_gemini_api_key');
                  }
                }}
                placeholder="Paste Gemini API Key (AIzaSy...)"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono tracking-wider placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-400 leading-normal">
                Setting your own key saves it privately inside your browser&#39;s LocalStorage. This keeps your usage completely independent, allowing the host owner to keep the website live without paying for massive API bills!
              </p>
            </div>
          )}
          
          {/* Main Option Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-850 text-center">
            <button
              onClick={() => handleTabChange('blurb')}
              className={`py-1.5 px-1 rounded text-[11px] font-mono font-bold tracking-tight transition-all flex flex-col items-center gap-1 ${activeTab === 'blurb' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              title="Optimize back-cover description"
            >
              <FileText className="w-3.5 h-3.5" />
              Blurb
            </button>
            <button
              onClick={() => handleTabChange('bio')}
              className={`py-1.5 px-1 rounded text-[11px] font-mono font-bold tracking-tight transition-all flex flex-col items-center gap-1 ${activeTab === 'bio' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              title="Formulate Author Bio"
            >
              <User className="w-3.5 h-3.5" />
              Bio
            </button>
            <button
              onClick={() => handleTabChange('aesthetics')}
              className={`py-1.5 px-1 rounded text-[11px] font-mono font-bold tracking-tight transition-all flex flex-col items-center gap-1 ${activeTab === 'aesthetics' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              title="Aesthetic recommendations"
            >
              <Palette className="w-3.5 h-3.5" />
              Design
            </button>
            <button
              onClick={() => handleTabChange('chapters')}
              className={`py-1.5 px-1 rounded text-[11px] font-mono font-bold tracking-tight transition-all flex flex-col items-center gap-1 ${activeTab === 'chapters' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              title="Brainstorm Chapter names"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Topics
            </button>
          </div>

          {/* Form Content Controls */}
          <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-850/50">
            {/* Genre and Tone Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">BOOK GENRE</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-600"
                >
                  {genresList.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">TONE / FEEL</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-600"
                >
                  {tonesList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">TARGET AUDIENCE</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Young Adults, Professional Architects, Avid Sci-Fi readers"
                className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Input Data text */}
            {activeTab !== 'aesthetics' && (
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  {activeTab === 'blurb' && 'DRAFT PLOT / OUTLINE OR SYNOPSIS'}
                  {activeTab === 'bio' && 'YOUR DRAFT AUTHOR BIOGRAPHY & BACKGROUND'}
                  {activeTab === 'chapters' && 'BOOK CORE CONCEPT / THEMES'}
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-850 rounded p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                  placeholder={
                    activeTab === 'blurb' ? "Enter short details of main character, world, stakes..." :
                    activeTab === 'bio' ? "Enter author background, location, passions, prior releases..." :
                    "Provide what the book is about to brainstorm creative chapter headers..."
                  }
                />
              </div>
            )}

            {/* Additional Custom directives */}
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">ADDITIONAL SPECIFIC REQUESTS (OPTIONAL)</label>
              <input
                type="text"
                value={extraPrompt}
                onChange={(e) => setExtraPrompt(e.target.value)}
                placeholder="e.g. Include keywords: high energy, old world. Keep it under 100 words."
                className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Run Button */}
            <button
              onClick={executeAIMagic}
              disabled={loading}
              className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-slate-400 p-2 text-xs font-mono font-bold tracking-wider rounded-md text-white transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Suggestions
                </>
              )}
            </button>
          </div>

          {/* Setup Indicator Warnings */}
          {setupNeeded && (
            <div className="bg-amber-950/40 border border-amber-850/50 p-3 rounded-lg flex items-start gap-2.5 text-xs">
              <Key className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300 font-mono">Secret Configuration Missing</p>
                <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                  To power the live AI assistant, click the **Settings icon** (in the bottom-left of AI Studio), find the **Secrets** section, and add a secret named: <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400 font-bold font-mono">GEMINI_API_KEY</code>.
                </p>
              </div>
            </div>
          )}

          {/* Success Alerts */}
          {successMsg && !error && (
            <div className="bg-emerald-950/30 border border-emerald-900/40 p-2.5 rounded-lg flex items-center gap-2 text-xs text-emerald-300 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Alerts */}
          {error && !setupNeeded && (
            <div className="bg-rose-950/30 border border-rose-900/40 p-2.5 rounded-lg flex items-start gap-2 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="font-mono text-[11px]">
                <p className="font-bold">Error compiling suggestion</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Result Visualization Display Card */}
          {currentResult() && (
            <div className="space-y-3 p-3.5 bg-slate-950/90 border border-slate-800 rounded-lg">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
                  AI Recommended Output
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(currentResult()!)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded transition-all"
                    title="Copy to Clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Wrapped Output Area */}
              <div className="text-xs text-slate-200 leading-relaxed font-sans max-h-56 overflow-y-auto whitespace-pre-wrap pr-1 border-b border-slate-850/30 pb-3" id="ai-formatted-result-box">
                {currentResult()}
              </div>

              {/* Action Apply Triggers */}
              <div className="flex justify-end gap-2 pt-1 font-mono text-[10px]">
                {activeTab === 'blurb' && onApplyBlurb && (
                  <button
                    onClick={() => {
                      onApplyBlurb(blurbResult);
                      setSuccessMsg('Applied blurb directly to form!');
                    }}
                    className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1"
                  >
                    Apply to Covers <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {activeTab === 'bio' && onApplyBio && (
                  <button
                    onClick={() => {
                      onApplyBio(bioResult);
                      setSuccessMsg('Applied biography directly to form!');
                    }}
                    className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1"
                  >
                    Apply to Author Bio <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {activeTab === 'aesthetics' && onApplyAesthetics && (
                  <button
                    onClick={() => {
                      const colors = getColorsFromAestheticText(aestheticResult);
                      if (colors) {
                        onApplyAesthetics(colors);
                        setSuccessMsg('Applied recommended palette hex codes!');
                      } else {
                        setError('No hex colors formatted. Please try again or copy manually.');
                      }
                    }}
                    className="bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1"
                  >
                    Apply Cover Palette <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
