/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Info, HelpCircle, X, Scaling, AlertCircle, ChevronDown, ChevronUp, Search, Palette, BookOpen, Sparkles, ShieldCheck 
} from 'lucide-react';

interface ManualOrGuidelineProps {
  onClose: () => void;
}

export default function ManualOrGuideline({ onClose }: ManualOrGuidelineProps) {
  const [faqTab, setFaqTab] = useState<'all' | 'seo' | 'covers' | 'interior' | 'general'>('all');
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>({
    'seo-p1': true // Expand the primary SEO simulator question by default for user guidance
  });

  const toggleFaq = (id: string) => {
    setExpandedFaqs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const faqCategories = [
    { id: 'all', label: 'All FAQs', icon: HelpCircle },
    { id: 'seo', label: 'SEO Blog & Simulator', icon: Search },
    { id: 'covers', label: 'Cover Builder', icon: Palette },
    { id: 'interior', label: 'Interior Formatter', icon: BookOpen },
    { id: 'general', label: 'Privacy & Safety', icon: ShieldCheck }
  ] as const;

  const faqItems = [
    {
      id: 'seo-p1',
      category: 'seo',
      question: 'What is the purpose of the SEO Blog & Search Simulator on this site?',
      answer: 'The SEO Blog & Simulator provides self-publishing authors with a high-fidelity visual and analytical preview of search metadata before printing or listing. It serves two distinct roles: first, it hosts curated, print-ready guides written by formatting and marketing experts; second, it provides an interactive "SERP & Social Preview" workspace where you can test how your book title, meta description, and URL slug will display in major store search outputs and across social media (such as search snippets and post previews), allowing you to craft high-conversion listings before publishing.'
    },
    {
      id: 'seo-p2',
      category: 'seo',
      question: 'How does the real-time SERP search simulator work?',
      answer: 'You simply type in your book\'s target title, marketing description, and desired permalink slug. The simulator runs real-time character boundary validators (e.g., flagging title tags longer than 60 characters or description tags outside the optimal 110-160 range to prevent truncation). It then renders a live mock visual search card matching the official Google standard and a responsive social media feed card to show you exactly what potential readers will see in search engines and shared posts.'
    },
    {
      id: 'seo-p3',
      category: 'seo',
      question: 'How does the Readability Sandbox and Keyword Density Tracker work?',
      answer: 'The Interactive Assessment tool calculates real-time metrics including total word count, paragraph structures, and an estimated Flesch-Kincaid readability index (such as Academic, Standard, or Simple Prose). It also automatically parses your text to detect the frequency and raw density of high-search-volume publishing industry keywords (like \'KDP\', \'Bleed\', \'Spine\', \'Formatting\'). It cross-evaluates these with a 5-step search-readiness checklist to make sure your marketing descriptions are highly optimized and ready for search engine crawlers.'
    },
    {
      id: 'seo-p4',
      category: 'seo',
      question: 'Can the system automatically rewrite or optimize my descriptions using AI?',
      answer: 'Yes! The simulator features an integrated AI Upgrade Studio powered by Gemini. By clicking "refine draft", the text is securely passed to Gemini with precise instruction parameters (such as targeting specific self-publishing genres, tones, or audiences). The AI automatically rewrites your outline into a highly persuasive, keyword-rich hook, bulleted lists, and structured paragraph formats, which you can easily preview and apply.'
    },
    {
      id: 'covers-p1',
      category: 'covers',
      question: 'How does the Cover Builder compute the exact spine width?',
      answer: 'Cover wrap dimensions are determined by your final page count and chosen paper color density. The builder calculates the spine width using official POD (Print-On-Demand) formulas. White paper is thinner (0.002252 inches/page), and cream paper is thicker (0.0025 inches/page). The builder takes these variables, calculates the spine fold positions, adds the necessary 0.125" wrap bleed to all sides, and outputs a certified print-ready PDF template matching your precise specifications.'
    },
    {
      id: 'covers-p2',
      category: 'covers',
      question: 'Can books of all page counts have printed text on the spine?',
      answer: 'No. Under Amazon KDP standards, your book must have at least 79 finished pages to safely accommodate written text on the cover spine. For books with 78 pages or fewer, KDP requires a completely solid background block on the spine area with zero characters to prevent alignment shifting errors during mechanical wrapping.'
    },
    {
      id: 'covers-p3',
      category: 'covers',
      question: 'How do I integrate my book\'s barcode onto the back cover wrap?',
      answer: 'The system features an integrated vector barcode generator. If you enter your 13-digit ISBN (International Standard Book Number), the tool generates an official, error-free vector barcode image. It places it on the safe rear quadrant of your full-wrap cover, ensuring it passes distributor barcode scanners with 100% accuracy.'
    },
    {
      id: 'interior-p1',
      category: 'interior',
      question: 'How does the Interior Formatter process .DOCX or .TXT manuscripts?',
      answer: 'When you select a manuscript file, the engine parses its paragraphs locally. It strips corrupt style guides, inline breaks, and hidden characters that disrupt professional printing presses. It then automatically maps your prose to perfectly uniform typography grids, inserts mirror gutter margins for comfortable binding, places elegant dropdown caps, and formats running header designs and page numbers across the output.'
    },
    {
      id: 'interior-p2',
      category: 'interior',
      question: 'What are gutter margins, and why are they necessary for interior pages?',
      answer: 'Because books are bound near the inner seam, a portion of each inside page gets swallowed by glue and folding constraints. Gutter margins add a proportional offset to the binding edges of mirror pages (outer vs inner borders). Our formatter auto-determines your page count and locks in standard scale guidelines (e.g., 0.375" under 150 pages up to 0.750" for thick manuscripts) to ensure text always stays readable and centered.'
    },
    {
      id: 'general-p1',
      category: 'general',
      question: 'Why is PublishingForge 100% free with no account required?',
      answer: 'PublishingForge was designed to democratize book publishing by providing a top-tier sandbox without hidden lock-ins, royalty commissions, or premium accounts. The platform runs entirely in-memory. If you wish to use the advanced AI features, you can easily use our default server keys or input your own personal, free Gemini API key to keep your usage entirely independent.'
    },
    {
      id: 'general-p2',
      category: 'general',
      question: 'Are my private manuscripts or cover graphics uploaded to external servers?',
      answer: 'Absolutely not. PublishingForge operates as an offline-first client-side utility workspace. All manuscript layout generation, cover composites, barcode generation, and PDF compilations are executed inside your browser\'s temporary memory threads. Your private intellectual property never touches the cloud, keeping your creative works 100% secure.'
    }
  ];

  const filteredFaqs = faqItems.filter(item => faqTab === 'all' || item.category === faqTab);

  return (
    <div id="guideline-specifications-modal" className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto shadow-2xl relative max-h-[85vh] overflow-y-auto">
      
      {/* Absolute Close Header Button */}
      <button 
        onClick={onClose}
        id="close-guideline-btn"
        className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors border border-slate-100 rounded-full p-1.5 bg-slate-50 hover:bg-slate-100 focus:outline-none"
        title="Close Guidelines"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Main Branding Header Block */}
      <div className="border-b border-slate-200 pb-5 mb-6">
        <span className="text-[10px] font-mono text-indigo-600 tracking-[0.2em] uppercase font-bold">
          Publisher specifications Portal
        </span>
        <h2 className="text-3xl font-serif text-slate-900 font-extrabold mt-1 tracking-tight">
          Specifications &amp; Print Standards
        </h2>
        <p className="text-slate-500 font-serif italic text-sm mt-1 max-w-2xl">
          Complete structural guide for margins, spine equations, sRGB rules, and print layout benchmarks.
        </p>
      </div>

      <div className="space-y-8">
        
        {/* Pitch statement */}
        <div className="bg-amber-50/55 border-l-4 border-amber-500 p-4 rounded-r">
          <h4 className="font-sans font-bold text-amber-900 text-sm flex items-center gap-1.5">
            <Info className="w-4 h-4 shrink-0 text-amber-700" />
            "Bring your manuscript content, not your Word formatting"
          </h4>
          <p className="text-xs text-amber-850 mt-1.5 leading-relaxed">
            Most book formatting failures on KDP and IngramSpark stem from inconsistent Word document spacing, corrupt embedded font links, or margin overrides. <strong>PublishingForge</strong> cleanses your manuscript, stripping corrupt styles, and generates a fresh, typographically perfect, aligned PDF from scratch.
          </p>
        </div>

        {/* Margins */}
        <div>
          <h3 className="text-sm font-mono font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Scaling className="w-4 h-4 text-indigo-600" />
            Mirror Gutter Requirements (Binding Edge)
          </h3>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Since books are bound along the inner fold, odd and even pages must automatically mirror themselves. This inside "gutter margin" prevents your text from being swallowed by the center binding glue.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
              <span className="text-[10px] font-mono text-indigo-700 tracking-wider uppercase font-bold block mb-3 border-b border-indigo-100 pb-1.5">
                Amazon KDP Paperback Gutter
              </span>
              <ul className="text-xs font-mono space-y-2 text-slate-700">
                <li className="flex justify-between border-b border-slate-100 pb-1">
                  <span>24 to 150 Pages</span>
                  <span className="font-bold text-indigo-600">0.375" Inside</span>
                </li>
                <li className="flex justify-between border-b border-slate-100 pb-1">
                  <span>151 to 400 Pages</span>
                  <span className="font-bold text-indigo-600">0.500" Inside</span>
                </li>
                <li className="flex justify-between border-b border-slate-100 pb-1">
                  <span>401 to 600 Pages</span>
                  <span className="font-bold text-indigo-600">0.625" Inside</span>
                </li>
                <li className="flex justify-between pb-1">
                  <span>601+ Pages</span>
                  <span className="font-bold text-indigo-600">0.750" Inside</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
              <span className="text-[10px] font-mono text-emerald-700 tracking-wider uppercase font-bold block mb-3 border-b border-emerald-100 pb-1.5">
                IngramSpark Standards
              </span>
              <ul className="text-xs font-mono space-y-2 text-slate-700">
                <li className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Inside Margin (Gutter)</span>
                  <span className="font-bold text-slate-900">0.500" Inside</span>
                </li>
                <li className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Outside Margin</span>
                  <span className="font-bold text-slate-900">0.375" Margin</span>
                </li>
                <li className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Top Margin</span>
                  <span className="font-bold text-slate-900">0.500" Margin</span>
                </li>
                <li className="flex justify-between pb-1">
                  <span>Bottom Margin</span>
                  <span className="font-bold text-slate-900">0.500" Margin</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Limits table */}
        <div>
          <h3 className="text-sm font-mono font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            Operational Boundaries &amp; Guidelines
          </h3>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Ensure your project structure coordinates cleanly with our standard layout engine guidelines:
          </p>

          <div className="border border-slate-200/80 rounded-xl divide-y divide-slate-100 text-xs overflow-hidden">
            <div className="p-3 bg-slate-50 font-mono grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-slate-400">
              <span className="col-span-4 md:col-span-3">Setting</span>
              <span className="col-span-2">Standard</span>
              <span className="col-span-6 md:col-span-7">Why &amp; Recommendation</span>
            </div>
            
            <div className="p-3 grid grid-cols-12 gap-2 items-center">
              <span className="col-span-4 md:col-span-3 font-semibold text-slate-800 font-serif">Uniform Word Spacing</span>
              <span className="col-span-2 text-indigo-600 font-mono text-[10px] font-bold">Standard</span>
              <p className="col-span-6 md:col-span-7 text-slate-600 leading-relaxed">
                Aggressive manual line-breaks or inline shapes are stripped to ensure clean, flowing book text.
              </p>
            </div>

            <div className="p-3 grid grid-cols-12 gap-2 items-center">
              <span className="col-span-4 md:col-span-3 font-semibold text-slate-800 font-serif">Nested Manuscript Tables</span>
              <span className="col-span-2 text-amber-600 font-mono text-[10px] font-bold">Simplified</span>
              <p className="col-span-6 md:col-span-7 text-slate-600 leading-relaxed">
                Extremely complex nested cell structures align automatically to reliable, classic rectangular grids.
              </p>
            </div>

            <div className="p-3 grid grid-cols-12 gap-2 items-center">
              <span className="col-span-4 md:col-span-3 font-semibold text-rose-700 font-serif">sRGB Color Ranges</span>
              <span className="col-span-2 text-amber-600 font-mono text-[10px] font-bold">Optimized</span>
              <p className="col-span-6 md:col-span-7 text-slate-600 leading-relaxed">
                High-fidelity sRGB files are compiled. Amazon KDP natively expects sRGB; IngramSpark processes sRGB files without issue.
              </p>
            </div>

            <div className="p-3 grid grid-cols-12 gap-2 items-center">
              <span className="col-span-4 md:col-span-3 font-semibold text-slate-800 font-serif">Footnotes &amp; Citations</span>
              <span className="col-span-2 text-emerald-600 font-mono text-[10px] font-bold">Endnotes</span>
              <p className="col-span-6 md:col-span-7 text-slate-600 leading-relaxed">
                Footnotes align right at the ends of chapters to preserve consistent margins throughout the book pages.
              </p>
            </div>
          </div>
        </div>

        {/* Expanded Rich Interactive FAQ Section */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="mb-6">
            <h3 className="text-sm font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Frequently Answered Questions
            </h3>
            <p className="text-xs text-slate-500 font-serif italic">
              Click any question below to toggle detailed guides, print formulas, and platform capabilities.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {faqCategories.map(cat => {
              const IconComponent = cat.icon;
              const isActive = faqTab === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFaqTab(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border outline-none cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Collapsible Accordion Grid */}
          <div className="space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map(item => {
                const isExpanded = !!expandedFaqs[item.id];
                return (
                  <div 
                    key={item.id} 
                    className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                      isExpanded 
                        ? 'border-indigo-200 bg-indigo-50/20 shadow-xs' 
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(item.id)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 select-none outline-none focus:bg-slate-50/50"
                    >
                      <span className="font-bold text-slate-900 text-xs md:text-sm leading-snug">
                        {item.question}
                      </span>
                      <span className="text-slate-400 shrink-0 p-1 bg-slate-50 border border-slate-100 rounded-md">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </span>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 animate-in fade-in duration-200 border-t border-slate-100/50">
                        <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
                          {item.answer}
                        </p>
                        
                        {/* Categorization Indicator Badge in Answer block */}
                        <div className="mt-3 flex justify-end">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/40">
                            Category: {item.category === 'seo' ? 'SEO & Simulator' : item.category === 'covers' ? 'Covers Builder' : item.category === 'interior' ? 'Interior' : 'Safety & Pricing'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 font-mono italic text-center py-6">
                No questions found under this category filter.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER CONFIRM SECTION */}
      <div className="mt-8 border-t border-slate-100 pt-5 text-center">
        <button 
          type="button"
          onClick={onClose}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold px-6 py-2.5 rounded-lg transition-all active:scale-[0.98]"
        >
          Close Specifications
        </button>
      </div>
    </div>
  );
}
