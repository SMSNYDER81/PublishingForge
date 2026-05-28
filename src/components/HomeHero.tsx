/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BookOpen, Palette, HelpCircle, ShieldCheck, Heart, Award } from 'lucide-react';

interface HomeHeroProps {
  onSelectTool: (tool: 'cover' | 'interior' | 'blog') => void;
  onOpenGuides: () => void;
}

export default function HomeHero({ onSelectTool, onOpenGuides }: HomeHeroProps) {
  return (
    <div id="home-hero-container" className="max-w-6xl mx-auto px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-12 border-b border-gray-100 pb-10">
        <span className="text-xs tracking-[0.25em] font-mono text-indigo-600 uppercase font-bold">
          Concept &amp; Utility Workspace · Forge Suite
        </span>
        <h1 className="text-5xl md:text-6xl font-serif text-slate-900 font-extrabold mt-3 tracking-tight">
          Publishing<span className="text-indigo-600 font-sans font-bold">Forge</span>
        </h1>
        <p className="font-serif italic text-lg text-slate-600 mt-2 max-w-xl mx-auto">
          Free KDP &amp; IngramSpark Full-Wrap Cover Builder + Book Interior Formatter
        </p>

        <div className="flex flex-wrap justify-center gap-6 mt-6 text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-md">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            100% Client-Side Parsing
          </span>
          <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-md">
            <Award className="w-4 h-4 text-amber-600" />
            Print-Ready PDF Exports
          </span>
          <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-md">
            <Heart className="w-4 h-4 text-rose-600" />
            No Account Required
          </span>
        </div>
      </div>

      {/* Two Main Tools Split */}
      <div className="grid md:grid-cols-2 gap-8 items-stretch mb-12">
        {/* Tool 1: Cover Builder */}
        <div 
          id="cover-installer-card"
          onClick={() => onSelectTool('cover')}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-8 shadow-xs transition-style duration-300 hover:-translate-y-1 hover:border-indigo-600/40 hover:shadow-md"
        >
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-indigo-500/5 transition-all group-hover:scale-150" />
          
          <div className="flex items-center justify-between mb-6">
            <div className="rounded-lg bg-indigo-50 p-3 text-indigo-700 border border-indigo-100">
              <Palette className="h-7 w-7" />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-full uppercase">
              Tool 1
            </span>
          </div>

          <h3 className="text-2xl font-serif font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Full-Wrap Cover Builder
          </h3>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Generate KDP layout templates instantly. Compose gorgeous paperback &amp; hardcover wrappers in your custom sizes with calculated safe spine widths, margins, and bleed boundaries.
          </p>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <span className="text-[10px] font-mono text-slate-400 block mb-2 tracking-wider">UPLOAD CAPABILITIES</span>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-mono bg-indigo-50/50 text-indigo-700 px-2 py-1 rounded border border-indigo-100/30">Front Covers (JPG/PNG)</span>
              <span className="text-[10px] font-mono bg-indigo-50/50 text-indigo-700 px-2 py-1 rounded border border-indigo-100/30">Pre-made Full Layouts</span>
            </div>
          </div>

          <div className="mt-6 text-sm font-mono font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Build Book Cover &rarr;
          </div>
        </div>

        {/* Tool 2: Interior Formatter */}
        <div 
          id="interior-formatter-card"
          onClick={() => onSelectTool('interior')}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-8 shadow-xs transition-style duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-md"
        >
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/5 transition-all group-hover:scale-150" />
          
          <div className="flex items-center justify-between mb-6">
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700 border border-emerald-100">
              <BookOpen className="h-7 w-7" />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2.5 py-1 rounded-full uppercase">
              Tool 2
            </span>
          </div>

          <h3 className="text-2xl font-serif font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
            Interior Formatting Engine
          </h3>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Flow written manuscript files into perfectly compliant paper dimensions with mirror printer gutter margins, elegant drop cap styling, ornaments, and running custom header decorations.
          </p>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <span className="text-[10px] font-mono text-slate-400 block mb-2 tracking-wider">UPLOAD CAPABILITIES</span>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-mono bg-emerald-50/55 text-emerald-700 px-2 py-1 rounded border border-emerald-100/30">Manuscripts (.DOCX)</span>
              <span className="text-[10px] font-mono bg-emerald-50/55 text-emerald-700 px-2 py-1 rounded border border-emerald-100/30">Raw Draft Manuscripts (.TXT)</span>
            </div>
          </div>

          <div className="mt-6 text-sm font-mono font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Format Manuscript &rarr;
          </div>
        </div>
      </div>

      {/* Honest Positioning & Explanations Card */}
      <div className="bg-amber-50/40 border border-amber-200/50 rounded-xl p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-amber-50 p-2 text-amber-700 border border-amber-200/40 shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-slate-900 text-lg">
              The "No-Hype" Architectural Manifesto
            </h4>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Unlike online cloud templates that lock down formatting elements or charge subscription fees, **PublishingForge** works 100% locally on your computer’s browser. Your private intellectual property is never sent to a backend server.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 items-center">
              <button 
                onClick={onOpenGuides}
                className="text-xs font-mono font-semibold text-slate-600 hover:text-slate-800 hover:underline"
              >
                Read Publishing Guidelines &amp; Core Constraints &rarr;
              </button>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <button 
                onClick={() => onSelectTool('blog')}
                className="text-xs font-mono font-bold text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                Explore SEO Rich Blog &amp; Search Mockups &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
