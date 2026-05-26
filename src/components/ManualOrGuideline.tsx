/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Info, HelpCircle, X, Scaling, AlertCircle 
} from 'lucide-react';

interface ManualOrGuidelineProps {
  onClose: () => void;
}

export default function ManualOrGuideline({ onClose }: ManualOrGuidelineProps) {
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

        {/* Short Answers */}
        <div>
          <h3 className="text-sm font-mono font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            Frequently Answered Questions
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-xs">How is my spine width accurately computed?</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                In print production, pigment weight dictates sheet thickness. We run exact, certified formulas (e.g. KDP White standard: 0.0025 inches/page; Cream paper: 0.002347 inches/page) against your precise page count to prevent trim overlaps.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 text-xs">Are my private books uploaded to servers?</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                No. PublishingForge acts as a client-side sandbox. All document processing, cover composting, and PDF compilation run local memory threads. Your creative manuscripts never touch the cloud.
              </p>
            </div>
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
