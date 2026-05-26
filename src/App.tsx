/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import HomeHero from './components/HomeHero';
import CoverBuilder from './components/CoverBuilder';
import InteriorFormatter from './components/InteriorFormatter';
import ManualOrGuideline from './components/ManualOrGuideline';
import { Sparkles, HelpCircle, FileText, ChevronRight } from 'lucide-react';

type ScreenId = 'home' | 'cover' | 'interior';

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [showGuides, setShowGuides] = useState<boolean>(false);

  return (
    <div id="forge-core-app" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans transition-colors duration-300">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-slate-100 border-b border-slate-800 shadow-sm py-4 px-6 md:px-10 flex items-center justify-between">
        <div 
          onClick={() => setScreen('home')}
          className="flex items-center gap-2 cursor-pointer group active:scale-[0.98]"
        >
          <div className="bg-indigo-600 text-white p-1 px-2 rounded font-black text-xs tracking-wider shrink-0 uppercase">
            PF
          </div>
          <span className="font-serif font-bold text-xl tracking-tight transition-colors group-hover:text-indigo-400">
            Publishing<span className="text-indigo-500 font-sans font-extrabold text-indigo-500">Forge</span>
          </span>
        </div>

        {/* Header navigation options */}
        <div className="flex items-center gap-4 text-xs font-mono font-bold text-slate-300">
          <button 
            onClick={() => setScreen('cover')}
            className={`transition-colors hover:text-indigo-400 ${screen === 'cover' ? 'text-indigo-400 font-extrabold underline decoration-2 underline-offset-4' : ''}`}
          >
            Cover Builder
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setScreen('interior')}
            className={`transition-colors hover:text-indigo-400 ${screen === 'interior' ? 'text-indigo-400 font-extrabold underline decoration-2 underline-offset-4' : ''}`}
          >
            Interior Formatter
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setShowGuides(true)}
            className="flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 px-2.5 py-1 rounded border border-indigo-500/20"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Specs &amp; FAQs
          </button>
        </div>
      </header>

      {/* Main Core View Swap */}
      <main className="flex-1 w-full flex flex-col py-8">
        
        {/* Guides Specs Overlay in standard Modal design */}
        {showGuides && (
          <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto px-4 py-8 flex justify-center backdrop-blur-xs">
            <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-200">
              <ManualOrGuideline onClose={() => setShowGuides(false)} />
            </div>
          </div>
        )}

        {/* Screen Switching */}
        {screen === 'home' && (
          <HomeHero 
            onSelectTool={(tool) => setScreen(tool)} 
            onOpenGuides={() => setShowGuides(true)}
          />
        )}

        {screen === 'cover' && (
          <CoverBuilder onBack={() => setScreen('home')} />
        )}

        {screen === 'interior' && (
          <InteriorFormatter onBack={() => setScreen('home')} />
        )}
      </main>

      {/* Core Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-10 px-6 md:px-10 mt-auto text-xs font-mono text-center md:text-left">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1.5">
            <span className="font-serif font-bold text-slate-100 text-sm block">
              Publishing<span className="text-indigo-400 font-sans font-bold">Forge</span>
            </span>
            <p className="max-w-sm text-slate-500 leading-normal">
              Part of the Forge self-publishing suite of utilities. Free, 100% browser-based formatting sandbox.
            </p>
          </div>

          <div className="space-y-2 text-slate-500 flex flex-col items-center md:items-end">
            <span className="bg-slate-800 px-2.5 py-1 rounded-md text-slate-400 block font-bold text-[10px] border border-slate-700/55">
              ca-pub-7814690967688754
            </span>
            <p>Made with love for independent authors · No user accounts required</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
