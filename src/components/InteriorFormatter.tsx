/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { 
  FileText, Upload, Settings, BookOpen, Scaling, Type, Download, 
  HelpCircle, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Sparkles,
  Maximize2, Minimize2, Image as ImageIcon, Plus, Trash2, ImagePlus
} from 'lucide-react';
import { InteriorSettings, Chapter } from '../types';
import { PLATFORMS, TRIM_SIZES, DEFAULT_BOOK_CONTENT } from '../utils/presets';
import { typesetManuscript, compileInteriorPDF, LayoutPage } from '../utils/pdfHelpers';
import AIAssistant from './AIAssistant';

interface InteriorFormatterProps {
  onBack: () => void;
}

export default function InteriorFormatter({ onBack }: InteriorFormatterProps) {
  // Parser and Settings state
  const [interiorImages, setInteriorImages] = useState<any[]>([]);
  const [settings, setSettings] = useState<InteriorSettings>({
    platform: 'kdp',
    trimId: '6x9',
    customWidth: 6.0,
    customHeight: 9.0,
    
    // Margins
    insideMargin: 0.500, // Gutter
    outsideMargin: 0.375,
    topMargin: 0.500,
    bottomMargin: 0.500,
    
    // Typography
    bodyFont: 'Times New Roman',
    bodyFontSize: 11,
    lineSpacing: 1.3,
    paragraphStyle: 'indent',
    indentSize: 0.35,
    justification: 'justify',
    
    // Style configurations
    chapterStartNewPage: true,
    chapterNumberStyle: 'arabic',
    showDropCap: true,
    dropCapLines: 3,
    dropCapColor: '#4f46e5',
    chapterOrnament: 'triple-star',
    chapterTitleAlign: 'center',
    showOrnament: true,
    
    // Front matter text elements
    includeTitlePage: true,
    includeCopyrightPage: true,
    includeDedicationPage: true,
    dedicationText: "For those who forge words in the dark, and the memory-keepers who carry them into the light.",
    dedicationStyle: 'classic',
    includeColophonPage: true,
    colophonText: "This copy was set in EB Garamond type, modeled after the historic sixteenth-century roman fonts of Claude Garamond, integrated with modern Cormorant digital revivals. The interior pages were composed dynamically by the client-side typesetter of the PublishingForge, adhering strictly to the highest trade printing design standards. Bound and distributed for dreamers and scribes everywhere.",
    bookTitle: 'The Sparks of Creation',
    bookSubtitle: 'A Chronicle of the Forge Era',
    authorName: 'D. Scribe',
    publisherName: 'PublishingForge Press',
    copyrightYear: '2026',
    isbn: '978-3-16-148410-0',
    
    // Running headers & page numbers
    showRunningHeaders: true,
    headerEvenText: 'THE SPARKS OF CREATION',
    headerOddText: 'BY D. SCRIBE',
    pageNumberPosition: 'bottom-center'
  });

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [fileName, setFileName] = useState<string>('Default Sample Manuscript');
  const [loading, setLoading] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  // Selected page index inside the visual book preview
  const [previewPageIndex, setPreviewPageIndex] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [paperStock, setPaperStock] = useState<'white' | 'cream' | 'vellum'>('cream');

  // State for block being edited inline like a Word document
  const [editingBlock, setEditingBlock] = useState<{
    chapId: string;
    pIdx?: number;
    isTitle: boolean;
    initialValue: string;
    currentValue: string;
  } | null>(null);

  // AI Dedication Wizard states
  const [showDedicationWizard, setShowDedicationWizard] = useState<boolean>(false);
  const [dedicateTarget, setDedicateTarget] = useState<string>('');
  const [dedicateTone, setDedicateTone] = useState<string>('Heartfelt & Deeply Emotional');
  const [dedicateLoading, setDedicateLoading] = useState<boolean>(false);
  const [dedicateResult, setDedicateResult] = useState<string>('');

  const generateDedication = async () => {
    if (!dedicateTarget.trim()) return;
    setDedicateLoading(true);
    setDedicateResult('');
    try {
      const response = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'dedication',
          text: dedicateTarget,
          tone: dedicateTone,
          genre: 'Fiction/Literature'
        })
      });
      if (!response.ok) {
        throw new Error('Failed to generate dedication');
      }
      const data = await response.json();
      setDedicateResult(data.result);
    } catch (err: any) {
      setDedicateResult(`Error: ${err?.message || 'Could not draft dedication options at this time. Please try again.'}`);
    } finally {
      setDedicateLoading(false);
    }
  };

  const startEditing = (chapId: string, pIdx: number | undefined, isTitle: boolean, text: string) => {
    let targetText = text;
    if (isTitle) {
      const chap = chapters.find(c => c.id === chapId);
      if (chap) targetText = chap.title;
    } else if (pIdx !== undefined) {
      const chap = chapters.find(c => c.id === chapId);
      if (chap && chap.paragraphs[pIdx] !== undefined) {
        targetText = chap.paragraphs[pIdx];
      }
    }
    
    setEditingBlock({
      chapId,
      pIdx,
      isTitle,
      initialValue: targetText,
      currentValue: targetText
    });
  };

  const saveEditing = () => {
    if (!editingBlock) return;
    
    const { chapId, pIdx, isTitle, currentValue } = editingBlock;
    
    if (isTitle) {
      setChapters(prev => prev.map(chap => {
        if (chap.id !== chapId) return chap;
        return { ...chap, title: currentValue };
      }));
    } else if (pIdx !== undefined) {
      setChapters(prev => prev.map(chap => {
        if (chap.id !== chapId) return chap;
        const updatedParas = [...chap.paragraphs];
        updatedParas[pIdx] = currentValue;
        return { ...chap, paragraphs: updatedParas };
      }));
    }
    
    setEditingBlock(null);
  };

  const cancelEditing = () => {
    setEditingBlock(null);
  };

  // Load sample content on boot
  useEffect(() => {
    loadSampleContent();
  }, []);

  // Sync margins on platform change
  useEffect(() => {
    const platform = PLATFORMS[settings.platform];
    const computedEstPages = Math.max(50, chapters.length * 15); // loose baseline count estimation
    if (platform) {
      const standardMargins = platform.getMargins(computedEstPages);
      setSettings(prev => ({
        ...prev,
        insideMargin: standardMargins.inside,
        outsideMargin: standardMargins.outside,
        topMargin: standardMargins.top,
        bottomMargin: standardMargins.bottom
      }));
    }
  }, [settings.platform, chapters.length]);

  const loadSampleContent = () => {
    const parsed = parseRawManuscript(DEFAULT_BOOK_CONTENT);
    setChapters(parsed);
    setFileName('Preloaded Sample Project.txt');
  };

  // Helper parsing logic to chop manuscript into structured Chapters
  const parseRawManuscript = (rawText: string): Chapter[] => {
    // Splits text looking for common boundaries like CHAPTER, Act, Section, Prologue, Epilogue, Introduction, Foreword, Preface
    const pattern = /(?:^|\n)(?=(?:Chapter|CHAPTER|Act|ACT|Section|SECTION|Prologue|PROLOGUE|Epilogue|EPILOGUE|Introduction|INTRODUCTION|Foreword|FOREWORD|Preface|PREFACE)\b)/g;
    const parts = rawText.split(pattern);
    
    const parsedChapters: Chapter[] = [];
    
    // Helper to check if a line is a section header
    const isHeadingLine = (line: string): boolean => {
      const u = line.toUpperCase();
      return (
        u.startsWith('CHAPTER') ||
        u.startsWith('ACT') ||
        u.startsWith('SECTION') ||
        u.startsWith('PROLOGUE') ||
        u.startsWith('EPILOGUE') ||
        u.startsWith('INTRODUCTION') ||
        u.startsWith('PREFACE') ||
        u.startsWith('FOREWORD')
      );
    };

    parts.forEach((block, idx) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return;

      const lines = trimmedBlock.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const firstLine = lines[0];
      let title = firstLine; // fallback
      let parasIdx = 1;

      // Check if title is clearly a chapter title or section heading
      if (isHeadingLine(firstLine)) {
        // Smart Title Consolidation:
        // If the first line is short (like "Chapter 1" or "Chapter I") and there's a second line that is also short (and not another header)
        if (lines.length > 1 && firstLine.length < 25 && lines[1].length < 60 && !isHeadingLine(lines[1])) {
          title = `${firstLine}: ${lines[1]}`;
          parasIdx = 2;
          
          // Let's also check if there is a third short subtitle, like location/date/author metadata (e.g. "? ? ?" or short text)
          if (lines.length > 2 && lines[2].length < 60 && !isHeadingLine(lines[2]) && (lines[2].startsWith('?') || lines[2].length < 35)) {
            title = `${title} — ${lines[2]}`;
            parasIdx = 3;
          }
        } else {
          title = firstLine;
          parasIdx = 1;
        }
      } else {
        // Fallback: if first line is not a standard header keyword but is short enough, use it as title
        if (firstLine.length < 50) {
          title = firstLine;
          parasIdx = 1;
        } else {
          title = `Section ${idx + 1}`;
          parasIdx = 0;
        }
      }

      parsedChapters.push({
        id: `chap-${idx}`,
        title: title,
        paragraphs: lines.slice(parasIdx)
      });
    });

    if (parsedChapters.length === 0) {
      // Fallback if no chapter splices found
      parsedChapters.push({
        id: 'chap-single',
        title: 'Book Manuscript Content',
        paragraphs: rawText.split('\n').map(l => l.trim()).filter(Boolean)
      });
    }

    return parsedChapters;
  };

  // Upload Word document parser using mammoth
  const handleDocxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        
        // mammoth raw text extractor
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        const parsed = parseRawManuscript(text);
        setChapters(parsed);
        setPreviewPageIndex(0);
      } catch (err) {
        console.error("Mammoth DOCX parsing failed:", err);
        alert("Unable to parse Word file. Converting file to standard DOCX version or uploading plain TXT instead is recommended.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Upload raw plain text files (.txt)
  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseRawManuscript(text);
      setChapters(parsed);
      setPreviewPageIndex(0);
      setLoading(false);
    };
    reader.readAsText(file);
  };

  // Generate typesetting page layout preview
  const previewPages: LayoutPage[] = typesetManuscript(chapters, settings, 0.45, interiorImages);
  const activePage = previewPages[previewPageIndex] || previewPages[0];

  // Run audit checks against industry standard KDP/Ingram constraints
  const auditCompliance = () => {
    const estimatedPages = previewPages.length;
    const platformDef = PLATFORMS[settings.platform];
    if (!platformDef) return { ok: true, message: 'Settings compliant' };

    const minInsideMargin = estimatedPages <= 150 ? 0.375 : estimatedPages <= 400 ? 0.50 : estimatedPages <= 600 ? 0.625 : 0.75;
    const minOutsideMargin = 0.25;

    if (settings.insideMargin < minInsideMargin) {
      return {
        ok: false,
        severity: 'warn',
        message: `Center gutter margin (${settings.insideMargin}") is too narrow for estimated ${estimatedPages} total pages. Standard minimum is ${minInsideMargin}". Center binding could cut off lines.`
      };
    }
    return { ok: true, message: 'All page dimensions and binding gutters pass compliance check.' };
  };

  const auditResult = auditCompliance();

  // Export fully built interior PDF
  const triggerExportInterior = async () => {
    setIsExporting(true);
    setExportProgress(10);
    try {
      const pdfBlob = await compileInteriorPDF(chapters, settings, (p) => {
        setExportProgress(Math.max(10, p));
      }, interiorImages);
      setExportProgress(100);

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PublishingForge-Interior-${settings.trimId}-${settings.platform}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 800);
    }
  };

  return (
    <div id="interior-formatter-main" className={`mx-auto px-4 py-6 transition-all duration-300 ${isExpanded ? 'max-w-7xl' : 'max-w-6xl'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-mono text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Selection
        </button>
        <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-bold">
          CLIENT INTERIOR FORMATTER ENGINE
        </span>
      </div>

      <div className={`grid ${isExpanded ? 'grid-cols-1' : 'lg:grid-cols-12'} gap-8 items-start transition-all duration-300`}>
        
        {/* LEFT COLUMN: settings sidebar */}
        <div className={`${isExpanded ? 'order-2 bg-slate-50 border border-slate-200 p-6 rounded-2xl grid md:grid-cols-2 xl:grid-cols-3 gap-6 space-y-0' : 'lg:col-span-5 space-y-6'} transition-all duration-300`}>
          
          {/* AI Companion Copy & Layout Studio */}
          <AIAssistant 
            currentBookTitle={settings.bookTitle || ''}
            defaultGenre="Fiction / Novel"
            onApplyBlurb={(text) => {
              setSettings(prev => ({
                ...prev,
                headerEvenText: text.slice(0, 45).toUpperCase(), // Apply a short header preview
                bookSubtitle: text.slice(0, 60)
              }));
            }}
            onApplyAesthetics={(colors) => {
              // Apply drop cap colors or match styling theme
              setSettings(prev => ({
                ...prev,
                dropCapColor: colors.spineBgColor // use recommended palette as drop cap accent color!
              }));
            }}
          />

          {/* Draggable File Uploader */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              Manuscript Upload Section
            </h3>
            
            <div className="border-2 border-dashed border-gray-200 hover:border-emerald-500/40 rounded-lg p-5 text-center transition-all bg-gray-50/50">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-700 font-mono">Upload manuscript draft</p>
              <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2">
                <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] font-bold py-2 px-3.5 rounded cursor-pointer transition-transform active:scale-[0.98]">
                  Select Word (.docx)
                  <input 
                    type="file" 
                    accept=".docx" 
                    onChange={handleDocxUpload}
                    className="hidden" 
                  />
                </label>
                <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-mono text-[11px] font-bold py-2 px-3.5 rounded cursor-pointer transition-transform active:scale-[0.98] border border-gray-200">
                  Select Text (.txt)
                  <input 
                    type="file" 
                    accept=".txt" 
                    onChange={handleTxtUpload}
                    className="hidden" 
                  />
                </label>
              </div>
            </div>

            {/* Current Loaded File Details */}
            <div className="mt-3.5 flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-100 text-xs font-mono">
              <span className="text-gray-500 font-bold">Active file:</span>
              <span className="font-bold text-gray-800 truncate max-w-[180px]" title={fileName}>
                {loading ? "Parsing Word file..." : fileName}
              </span>
            </div>
          </div>

          {/* Book Settings options */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-mono text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-600" />
              Format Options
            </h3>

            {/* Premium Aesthetic Templates & Material Stocks */}
            <div className="space-y-3 pb-3 border-b border-gray-100 font-mono text-xs">
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">AESTHETIC STYLE PRESETS</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    name: 'Literary',
                    icon: '❦',
                    desc: 'Georgia, Star ornament, indented paragraphs',
                    bodyFont: 'EB Garamond',
                    bodyFontSize: 11,
                    lineSpacing: 1.35,
                    chapterOrnament: 'triple-star' as const,
                    chapterTitleAlign: 'center' as const,
                    paragraphStyle: 'indent' as const,
                    dropCapColor: '#8b1e0f',
                    showDropCap: true,
                    dropCapLines: 3,
                  },
                  {
                    name: 'Modern',
                    icon: '✦',
                    desc: 'Baskerville Left-Ali, dividing bars, block text',
                    bodyFont: 'Libre Baskerville',
                    bodyFontSize: 10.5,
                    lineSpacing: 1.3,
                    chapterOrnament: 'divider-bar' as const,
                    chapterTitleAlign: 'left' as const,
                    paragraphStyle: 'block' as const,
                    dropCapColor: '#1e3a8a',
                    showDropCap: true,
                    dropCapLines: 2,
                  },
                  {
                    name: 'Luxury',
                    icon: '❀',
                    desc: 'Slender Cormorant Garamond, ornate titles',
                    bodyFont: 'Cormorant Garamond',
                    bodyFontSize: 11.5,
                    lineSpacing: 1.4,
                    chapterOrnament: 'floral-leaf' as const,
                    chapterTitleAlign: 'fancy-frame' as const,
                    paragraphStyle: 'indent' as const,
                    dropCapColor: '#065f46',
                    showDropCap: true,
                    dropCapLines: 4,
                  }
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setSettings(prev => ({
                        ...prev,
                        bodyFont: preset.bodyFont,
                        bodyFontSize: preset.bodyFontSize,
                        lineSpacing: preset.lineSpacing,
                        chapterOrnament: preset.chapterOrnament,
                        chapterTitleAlign: preset.chapterTitleAlign,
                        paragraphStyle: preset.paragraphStyle,
                        dropCapColor: preset.dropCapColor,
                        showDropCap: preset.showDropCap,
                        dropCapLines: preset.dropCapLines
                      }));
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center cursor-pointer transition-all ${
                      settings.bodyFont === preset.bodyFont
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 font-bold shadow-sm'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                    title={preset.desc}
                  >
                    <span className="text-sm mb-0.5">{preset.icon}</span>
                    <span className="text-[10px] uppercase font-bold tracking-tight">{preset.name}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">PAPER MATERIAL PREVIEW</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cream', name: 'Gutter Ivory', class: 'bg-[#FAF6EE] text-amber-900 border-amber-200' },
                    { id: 'white', name: 'Arctic Bright', class: 'bg-white text-gray-900 border-gray-200' },
                    { id: 'vellum', name: 'Antique Aged', class: 'bg-[#F4EFE6] text-orange-950 border-amber-300' }
                  ].map((stock) => (
                    <button
                      key={stock.id}
                      type="button"
                      onClick={() => setPaperStock(stock.id as any)}
                      className={`py-1 px-1 text-[9px] uppercase font-bold text-center border rounded cursor-pointer transition-all shrink-0 ${
                        paperStock === stock.id 
                          ? `${stock.class} ring-2 ring-emerald-600 shadow-sm font-black` 
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {stock.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Geometry settings */}
            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">TARGET PRINTER</label>
                  <select 
                    value={settings.platform} 
                    onChange={(e) => setSettings(p => ({ ...p, platform: e.target.value as any }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-gray-700"
                  >
                    <option value="kdp">Amazon KDP</option>
                    <option value="ingram">IngramSpark</option>
                    <option value="lulu">Lulu Publisher</option>
                    <option value="d2d">Draft2Digital</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">TRIM SIZE</label>
                  <select 
                    value={settings.trimId} 
                    onChange={(e) => setSettings(p => ({ ...p, trimId: e.target.value as any }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-gray-700"
                  >
                    {TRIM_SIZES.map(trim => (
                      <option key={trim.id} value={trim.id}>{trim.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Margins */}
              <div>
                <span className="block text-gray-400 font-bold mb-2">PAGE MARGIN ALIGNMENTS (INCHES)</span>
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded border border-gray-100">
                  <div>
                    <label className="block text-gray-500 text-[10px] mb-0.5">Inside (Gutter)</label>
                    <input 
                      type="number" 
                      step="0.025"
                      value={settings.insideMargin} 
                      onChange={(e) => setSettings(p => ({ ...p, insideMargin: parseFloat(e.target.value) || 0.5 }))}
                      className="w-full bg-white border border-gray-200 p-1 rounded font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-[10px] mb-0.5">Outside Boundary</label>
                    <input 
                      type="number" 
                      step="0.025"
                      value={settings.outsideMargin} 
                      onChange={(e) => setSettings(p => ({ ...p, outsideMargin: parseFloat(e.target.value) || 0.375 }))}
                      className="w-full bg-white border border-gray-200 p-1 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-[10px] mb-0.5">Top Margin</label>
                    <input 
                      type="number" 
                      step="0.025"
                      value={settings.topMargin} 
                      onChange={(e) => setSettings(p => ({ ...p, topMargin: parseFloat(e.target.value) || 0.5 }))}
                      className="w-full bg-white border border-gray-200 p-1 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-[10px] mb-0.5">Bottom Margin</label>
                    <input 
                      type="number" 
                      step="0.025"
                      value={settings.bottomMargin} 
                      onChange={(e) => setSettings(p => ({ ...p, bottomMargin: parseFloat(e.target.value) || 0.5 }))}
                      className="w-full bg-white border border-gray-200 p-1 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Typography options */}
              <div>
                <span className="block text-gray-400 font-bold mb-2">DESIGN TYPOGRAPHY</span>
                <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-100">
                  <div>
                    <label className="block text-gray-500 text-[10px] mb-1 font-bold">Body Font Family</label>
                    <select 
                      value={settings.bodyFont} 
                      onChange={(e) => setSettings(p => ({ ...p, bodyFont: e.target.value }))}
                      className="w-full bg-white border border-gray-200 p-1 rounded leading-tight text-gray-800 font-sans"
                    >
                      <option value="Times New Roman">Georgia serif (Times Roman Fallback)</option>
                      <option value="EB Garamond">EB Garamond (Elegant &amp; Traditional)</option>
                      <option value="Libre Baskerville">Baskerville (Crisp Book Type)</option>
                      <option value="Lora">Lora (Modern Digital/Print Editorial)</option>
                      <option value="Crimson Pro">Crimson Pro (Classic Roman Proportions)</option>
                      <option value="Cormorant Garamond">Cormorant Garamond (Delicate Slender Luxury)</option>
                      <option value="Playfair Display">Playfair Display (Classy Title Face)</option>
                      <option value="Cardo">Cardo (Scholar old-style serif)</option>
                      <option value="Cinzel">Cinzel (Formal Trajan Capital Face)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-500 text-[10px] mb-1">Body Font Size ({settings.bodyFontSize}pt)</label>
                      <input 
                        type="range" 
                        min="10" 
                        max="14" 
                        step="0.5"
                        value={settings.bodyFontSize} 
                        onChange={(e) => setSettings(p => ({ ...p, bodyFontSize: parseFloat(e.target.value) }))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[10px] mb-1">Line Spacing ({settings.lineSpacing}x)</label>
                      <input 
                        type="range" 
                        min="1.0" 
                        max="1.8" 
                        step="0.1"
                        value={settings.lineSpacing} 
                        onChange={(e) => setSettings(p => ({ ...p, lineSpacing: parseFloat(e.target.value) }))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-gray-500 text-[10px] mb-1 font-bold">Paragraph Spacing Style</label>
                      <select 
                        value={settings.paragraphStyle} 
                        onChange={(e) => setSettings(p => ({ ...p, paragraphStyle: e.target.value as any }))}
                        className="w-full bg-white border border-gray-200 p-1 rounded"
                      >
                        <option value="indent">First-Line Indented</option>
                        <option value="block">Block (Space Between)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-500 text-[10px] mb-1 font-bold">Running Header texts</label>
                      <select 
                        value={settings.showRunningHeaders ? 'on' : 'off'} 
                        onChange={(e) => setSettings(p => ({ ...p, showRunningHeaders: e.target.value === 'on' }))}
                        className="w-full bg-white border border-gray-200 p-1 rounded"
                      >
                        <option value="on">Header: Visible</option>
                        <option value="off">Header: Hidden</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Fine Book Styles */}
              <div>
                <span className="block text-gray-400 font-bold mb-2">ELEGANT CHAPTER LAYOUTS</span>
                <div className="space-y-3 p-3 bg-slate-50/50 border border-slate-200 rounded text-slate-800">
                  
                  {/* Drop caps section */}
                  <div className="space-y-2 border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="checkbox" 
                        id="drop-cap-checker"
                        checked={settings.showDropCap} 
                        onChange={(e) => setSettings(p => ({ ...p, showDropCap: e.target.checked }))}
                        className="accent-emerald-600 rounded"
                      />
                      <label htmlFor="drop-cap-checker" className="text-[11px] font-bold text-gray-700 cursor-pointer">
                        ENABLE CHAPTER DROP CAPS
                      </label>
                    </div>

                    {settings.showDropCap && (
                      <div className="grid grid-cols-2 gap-2.5 pl-5 pt-1">
                        <div>
                          <label className="block text-gray-500 text-[9px] mb-0.5">DROP CAP SCALING</label>
                          <select 
                            value={settings.dropCapLines || 3} 
                            onChange={(e) => setSettings(p => ({ ...p, dropCapLines: parseInt(e.target.value) || 3 }))}
                            className="w-full bg-white border border-gray-250 p-1 rounded text-[10px]"
                          >
                            <option value="2">2 Lines Tall (Compact)</option>
                            <option value="3">3 Lines Tall (Standard)</option>
                            <option value="4">4 Lines Tall (Fancy)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-500 text-[9px] mb-0.5">ACCENT COLOR</label>
                          <div className="flex gap-1.5 items-center">
                            <input 
                              type="color" 
                              value={settings.dropCapColor || '#4f46e5'} 
                              onChange={(e) => setSettings(p => ({ ...p, dropCapColor: e.target.value }))}
                              className="w-5 h-5 cursor-pointer rounded shrink-0 border border-gray-200"
                            />
                            <input 
                              type="text" 
                              value={settings.dropCapColor || '#4f46e5'} 
                              onChange={(e) => setSettings(p => ({ ...p, dropCapColor: e.target.value }))}
                              className="w-full text-[9px] bg-white border border-gray-200 p-1 rounded"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chapter decoration styles */}
                  <div className="grid grid-cols-2 gap-2 border-b border-gray-100 pb-2.5">
                    <div>
                      <label className="block text-gray-500 text-[9px] mb-1 font-bold">TITLE ALIGNMENT</label>
                      <select 
                        value={settings.chapterTitleAlign || 'center'} 
                        onChange={(e) => setSettings(p => ({ ...p, chapterTitleAlign: e.target.value as any }))}
                        className="w-full bg-white border border-gray-200 p-1 rounded text-[10px]"
                      >
                        <option value="center">Center</option>
                        <option value="left">Left-Aligned</option>
                        <option value="fancy-frame">Fancy Ornamental Frame</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-500 text-[9px] mb-1 font-bold">CHAPTER ORNAMENT</label>
                      <select 
                        value={settings.chapterOrnament || 'triple-star'} 
                        onChange={(e) => setSettings(p => ({ ...p, chapterOrnament: e.target.value as any }))}
                        className="w-full bg-white border border-gray-200 p-1 rounded text-[10px]"
                      >
                        <option value="none">No Ornament</option>
                        <option value="triple-star">✦ ✦ ✦ (Classic Star)</option>
                        <option value="floral-leaf">❦ ❦ (Floral Vine Leaf)</option>
                        <option value="divider-bar">═══ ✥ ═══ (Filigree Bar)</option>
                      </select>
                    </div>
                  </div>

                  {/* Show general ornament checkbox */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input 
                      type="checkbox" 
                      id="ornament-switch"
                      checked={settings.showOrnament} 
                      onChange={(e) => setSettings(p => ({ ...p, showOrnament: e.target.checked }))}
                      className="accent-emerald-600 rounded"
                    />
                    <label htmlFor="ornament-switch" className="text-[11px] font-bold text-gray-700 cursor-pointer">
                      RENDER DIVIDERS BETWEEN LESSONS
                    </label>
                  </div>

                </div>
              </div>

              {/* Advanced Book metadata and title settings */}
              <div>
                <span className="block text-gray-400 font-bold mb-2">FRONT MATTER INFO</span>
                <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="checkbox" 
                        id="title-page-chk"
                        checked={settings.includeTitlePage} 
                        onChange={(e) => setSettings(p => ({ ...p, includeTitlePage: e.target.checked }))}
                      />
                      <label htmlFor="title-page-chk" className="text-[10px] font-bold">Include Title Page</label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="checkbox" 
                        id="copyright-page-chk"
                        checked={settings.includeCopyrightPage} 
                        onChange={(e) => setSettings(p => ({ ...p, includeCopyrightPage: e.target.checked }))}
                      />
                      <label htmlFor="copyright-page-chk" className="text-[10px] font-bold">Include Copyright</label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 text-[10px] mb-0.5">Author Master Name</label>
                    <input 
                      type="text" 
                      value={settings.authorName} 
                      onChange={(e) => setSettings(p => ({ ...p, authorName: e.target.value, headerOddText: `BY ${e.target.value.toUpperCase()}` }))}
                      className="w-full bg-white border border-gray-200 p-1 rounded text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 text-[10px] mb-0.5">Book Title (Inside Headers)</label>
                    <input 
                      type="text" 
                      value={settings.bookTitle} 
                      onChange={(e) => setSettings(p => ({ ...p, bookTitle: e.target.value, headerEvenText: e.target.value.toUpperCase() }))}
                      className="w-full bg-white border border-gray-200 p-1 rounded text-gray-800"
                    />
                  </div>

                  {/* Luxury Front-Matter Additions */}
                  <div className="border-t border-gray-200/60 pt-3 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="checkbox" 
                          id="dedication-page-chk"
                          checked={settings.includeDedicationPage || false} 
                          onChange={(e) => setSettings(p => ({ ...p, includeDedicationPage: e.target.checked }))}
                        />
                        <label htmlFor="dedication-page-chk" className="text-[10px] font-bold text-gray-800">Include Dedication Page</label>
                      </div>
                      
                      {settings.includeDedicationPage && (
                        <button
                          type="button"
                          onClick={() => setShowDedicationWizard(!showDedicationWizard)}
                          className="text-[9px] px-1.5 py-0.5 font-bold rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 flex items-center gap-1 transition"
                        >
                          ✦ Draft with AI
                        </button>
                      )}
                    </div>

                    {settings.includeDedicationPage && (
                      <div className="space-y-2.5 pl-4 pb-2">
                        {showDedicationWizard && (
                          <div className="bg-amber-50/70 border border-amber-200/80 rounded p-2.5 space-y-2 mt-1">
                            <span className="block text-[9px] font-bold uppercase text-amber-800">AI Dedication Studio</span>
                            <div>
                              <label className="block text-[9px] text-amber-700">Dedicated To (e.g. My daughter, my chemistry teacher):</label>
                              <input 
                                type="text"
                                placeholder="..."
                                value={dedicateTarget}
                                onChange={(e) => setDedicateTarget(e.target.value)}
                                className="w-full bg-white border border-amber-200 p-1 rounded text-[10px] text-gray-800 mt-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="block text-[9px] text-amber-700">Aesthetic Tone:</label>
                                <select
                                  value={dedicateTone}
                                  onChange={(e) => setDedicateTone(e.target.value)}
                                  className="w-full bg-white border border-amber-200 p-0.5 rounded text-[9px]"
                                >
                                  <option>Heartfelt & Deeply Emotional</option>
                                  <option>Poetic & Mystical</option>
                                  <option>Sardonic & Funny</option>
                                  <option>Simple & Minimalist</option>
                                  <option>Academic & Scholarly</option>
                                </select>
                              </div>
                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={generateDedication}
                                  disabled={dedicateLoading || !dedicateTarget.trim()}
                                  className="w-full bg-gray-900 text-white rounded py-1 px-2 text-[9px] font-bold hover:bg-gray-800 disabled:opacity-50"
                                >
                                  {dedicateLoading ? 'Crafting...' : 'Build Drafts'}
                                </button>
                              </div>
                            </div>

                            {dedicateResult && (
                              <div className="bg-white rounded border border-amber-150 p-2 text-[10px] text-gray-800 max-h-36 overflow-y-auto font-serif">
                                <p className="font-sans font-bold text-[8px] text-amber-800 mb-1">CHOOSE AN OPTION BELOW:</p>
                                {dedicateResult.split(/\n\n+/).map((option, oIdx) => {
                                  if (!option.trim()) return null;
                                  const optionHeader = option.match(/\*\*(.*?)\*\*/)?.[1] || `Draft ${oIdx+1}`;
                                  const textToUse = option.replace(/\*\*(.*?)\*\*/g, '').replace(/^[-\*\s\d\.]+/g, '').trim();
                                  
                                  if (!textToUse) return null;
                                  return (
                                    <div key={oIdx} className="border-b border-gray-100 last:border-b-0 pb-1.5 mb-1.5 last:mb-0 last:pb-0">
                                      <span className="block text-[8px] uppercase font-bold text-gray-400">{optionHeader}</span>
                                      <p className="italic text-gray-700 my-0.5 leading-normal">{textToUse}</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSettings(p => ({ ...p, dedicationText: textToUse }));
                                          setShowDedicationWizard(false);
                                        }}
                                        className="text-[8px] text-amber-700 hover:underline font-bold"
                                      >
                                        Use this draft
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="block text-gray-500 text-[10px] mb-0.5">Style Style</label>
                          <select 
                            value={settings.dedicationStyle || 'classic'} 
                            onChange={(e) => setSettings(p => ({ ...p, dedicationStyle: e.target.value as any }))}
                            className="w-full bg-white border border-gray-200 p-0.5 rounded text-gray-800 text-[10px]"
                          >
                            <option value="classic">Classic Centered Italic</option>
                            <option value="minimal">Minimalist Clean (No Ornaments)</option>
                            <option value="poetic">Poetic Frame (Fleuron Starters)</option>
                            <option value="fancy">Ornate Victorian (Top & Bottom Scrolls)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-500 text-[10px] mb-0.5">Dedication Verse</label>
                          <textarea 
                            rows={2}
                            value={settings.dedicationText || ''} 
                            onChange={(e) => setSettings(p => ({ ...p, dedicationText: e.target.value }))}
                            className="w-full bg-white border border-gray-200 p-1 rounded text-gray-800 text-[10px] font-serif italic"
                            placeholder="To whom is this work dedicated?"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Luxury Colophon Page Additions */}
                  <div className="border-t border-gray-200/60 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="checkbox" 
                          id="colophon-page-chk"
                          checked={settings.includeColophonPage || false} 
                          onChange={(e) => setSettings(p => ({ ...p, includeColophonPage: e.target.checked }))}
                        />
                        <label htmlFor="colophon-page-chk" className="text-[10px] font-bold text-gray-800">Include Colophon Page</label>
                      </div>
                    </div>

                    {settings.includeColophonPage && (
                      <div className="space-y-1 pl-4 pb-2">
                        <label className="block text-gray-500 text-[10px] mb-0.5">Typography & Composition Notes</label>
                        <textarea 
                          rows={3}
                          value={settings.colophonText || ''} 
                          onChange={(e) => setSettings(p => ({ ...p, colophonText: e.target.value }))}
                          className="w-full bg-white border border-gray-200 p-1 rounded text-gray-800 text-[10px]"
                          placeholder="Typeface and manufacturing details..."
                        />
                        <p className="text-[8px] text-gray-400 leading-normal font-sans italic">
                          Colophons are printed on the very last page of the volume in premium literary presses, naming font families, type setters, and printing specs.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Images & Illustrations Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4 animate-fadeIn">
            <h3 className="text-sm font-mono text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              Images &amp; Illustrations
            </h3>

            <div className="space-y-3">
              <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">ADD ILLUSTRATION</label>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-gray-300 rounded p-3 cursor-pointer text-xs font-mono font-bold text-slate-700 transition active:scale-[0.98]">
                  <ImagePlus className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                  Upload Jpeg/Png Image
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const newImg = {
                        id: `img-${Date.now()}`,
                        name: file.name,
                        file: file,
                        url: URL.createObjectURL(file),
                        pageNumber: previewPageIndex + 1, // anchor to current page by default!
                        layout: 'full-page', // full-page by default
                        scale: 100,
                        caption: ''
                      };
                      setInteriorImages(p => [...p, newImg]);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[10px] text-gray-405 leading-normal font-mono">
                Illustrations can be placed as dedicated Full-Page plates or aligned dynamically inside content at the top or bottom boundaries of pages.
              </p>
            </div>

            {interiorImages.length > 0 && (
              <div className="space-y-3.5 pt-3 border-t border-gray-150">
                <span className="block text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider">
                  MANAGED ILLUSTRATIONS ({interiorImages.length})
                </span>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {interiorImages.map((img) => (
                    <div key={img.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5 relative">
                      <button
                        type="button"
                        onClick={() => {
                          setInteriorImages(p => p.filter(x => x.id !== img.id));
                        }}
                        className="absolute top-2 right-2 text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition"
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Image Thumbnail Header */}
                      <div className="flex gap-2.5 items-center">
                        <img 
                          src={img.url} 
                          alt="Thumbnail" 
                          className="w-10 h-10 object-cover bg-white rounded border border-gray-200 shrink-0" 
                        />
                        <div className="min-w-0 flex-1 leading-tight">
                          <p className="text-[11px] font-bold text-gray-800 truncate pr-5 font-mono">{img.name}</p>
                          <span className="text-[9px] text-gray-405 font-mono uppercase">
                            Size: {img.file ? (img.file.size / 1024).toFixed(0) : '0'} KB
                          </span>
                        </div>
                      </div>

                      {/* Config Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div>
                          <label className="block text-gray-400 mb-0.5 uppercase font-bold tracking-tight">PAGE ANCHOR</label>
                          <input 
                            type="number"
                            min="1"
                            max={previewPages.length}
                            value={img.pageNumber}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setInteriorImages(prev => prev.map(x => x.id === img.id ? { ...x, pageNumber: val } : x));
                            }}
                            className="w-full bg-white border border-gray-200 p-0.5 rounded text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-0.5 uppercase font-bold tracking-tight">LAYOUT ALIGN</label>
                          <select 
                            value={img.layout}
                            onChange={(e) => {
                              setInteriorImages(prev => prev.map(x => x.id === img.id ? { ...x, layout: e.target.value as any } : x));
                            }}
                            className="w-full bg-white border border-gray-200 p-0.5 rounded text-[9px]"
                          >
                            <option value="full-page">Dedicated Full-Page</option>
                            <option value="top">Inline Top Margins</option>
                            <option value="bottom">Inline Bottom Margins</option>
                          </select>
                        </div>
                      </div>

                      {/* Scale and Caption sliders */}
                      <div className="space-y-1.5 font-mono text-[10px]">
                        <div className="flex justify-between text-gray-400">
                          <span className="uppercase font-bold tracking-tight">SCALE BOUNDS</span>
                          <span className="font-bold text-gray-700">{img.scale}%</span>
                        </div>
                        <input
                          type="range"
                          min="40"
                          max="100"
                          step="5"
                          value={img.scale}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 100;
                            setInteriorImages(p => p.map(x => x.id === img.id ? { ...x, scale: val } : x));
                          }}
                          className="w-full accent-emerald-600 h-1 rounded cursor-pointer bg-gray-205"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-gray-400 mb-0.5 uppercase font-bold tracking-tight">ILLUSTRATION CAPTION</label>
                        <input
                          type="text"
                          value={img.caption}
                          placeholder="e.g. Plate I: Sunrise over the highlands."
                          onChange={(e) => {
                            setInteriorImages(p => p.map(x => x.id === img.id ? { ...x, caption: e.target.value } : x));
                          }}
                          className="w-full bg-white border border-gray-200 p-1 rounded text-[10px] text-gray-700 italic placeholder:not-italic focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: visual book preview */}
        <div className={`${isExpanded ? 'order-1 w-full' : 'lg:col-span-7'} space-y-6 transition-all duration-300`}>
          
          {/* COMPLIANCE AUDITOR BOARD */}
          <div className="bg-gray-900 text-white rounded-xl p-5 font-mono shadow-sm border border-gray-800">
            <span className="text-[9px] font-mono text-emerald-400 block mb-1 uppercase font-bold tracking-widest">
              AUTOMATED PRINT COMPLIANCE AUDITOR
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs divide-x divide-gray-800 mt-2">
              <div>
                <span className="text-gray-500 text-[10px] block">Estimated page count</span>
                <span className="font-bold text-white text-base">{previewPages.length} pages</span>
                <span className="text-emerald-400 text-[9px] block">({chapters.length} chapters parsed)</span>
              </div>
              <div className="pl-4">
                <span className="text-gray-500 text-[10px] block">Inside gutter margin</span>
                <span className="font-bold text-indigo-400 text-base">{settings.insideMargin}"</span>
                <span className="text-gray-400 text-[9px] block">({(settings.insideMargin*25.4).toFixed(1)} mm)</span>
              </div>
              <div className="pl-4">
                <span className="text-gray-500 text-[10px] block">Trim physical aspect</span>
                <span className="font-bold text-emerald-400 text-base">{TRIM_SIZES.find(t=>t.id===settings.trimId)?.name || 'Custom'}</span>
                <span className="text-gray-400 text-[9px] block">Book size standard</span>
              </div>
            </div>

            {/* Compliance Alerts dynamically computed */}
            <div className="mt-3.5 border-t border-gray-800 pt-3">
              {auditResult.ok ? (
                <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] rounded leading-normal">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{auditResult.message}</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] rounded leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{auditResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* REALISTIC PAGINATED BOOK PAGE VIEW */}
          <div className="bg-slate-100 rounded-xl border border-gray-200 p-4 md:p-6 shadow-even flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4 text-xs text-gray-500 font-mono">
              <span className="flex items-center gap-1.5 font-bold">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Simulated Page Visualizer {isExpanded ? "(Double-Spread Book Layout)" : "(Classic Page Mode)"}
              </span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-1 px-2 rounded-md font-bold text-[10.5px] cursor-pointer shadow-sm active:scale-95 transition-all"
                  title={isExpanded ? "Exit Full Screen" : "Full Screen Double Spread"}
                >
                  {isExpanded ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-emerald-600" />
                      Exit Full Screen
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                      Full Screen Double Spread
                    </>
                  )}
                </button>
                <span>
                  Page <span className="font-bold text-gray-900">{previewPageIndex + 1}</span> of {previewPages.length}
                </span>
              </div>
            </div>

            {/* Custom local page card renderer for dry typesetting */}
            {activePage ? (() => {
              const renderPageCard = (pData: LayoutPage, side: 'left' | 'right' | 'single') => {
                const isOdd = pData.pageNumber % 2 !== 0;
                
                // Dynamic page dimension scaling factor to map points accurately to the 320px screen representation
                const trimPreset = TRIM_SIZES.find(t => t.id === settings.trimId);
                const trimWidth = settings.trimId === 'custom' ? settings.customWidth : (trimPreset?.width || 5.5);
                const widthPts = trimWidth * 72;
                const previewScale = 320 / widthPts;

                // Gutter binding dynamic offsets inside vs outside margins
                const useLeftPadding = (side === 'left') 
                  ? `${Math.max(20, settings.outsideMargin * 40)}px`
                  : (side === 'right')
                  ? `${Math.max(20, settings.insideMargin * 40)}px`
                  : isOdd 
                  ? `${Math.max(20, settings.insideMargin * 40)}px` 
                  : `${Math.max(20, settings.outsideMargin * 40)}px`;

                const useRightPadding = (side === 'left')
                  ? `${Math.max(20, settings.insideMargin * 40)}px`
                  : (side === 'right')
                  ? `${Math.max(20, settings.outsideMargin * 40)}px`
                  : isOdd
                  ? `${Math.max(20, settings.outsideMargin * 40)}px`
                  : `${Math.max(20, settings.insideMargin * 40)}px`;

                const paperBgColor = paperStock === 'cream' 
                  ? '#FAF6EE' 
                  : paperStock === 'vellum' 
                  ? '#F4EFE6' 
                  : '#FFFFFF';

                // DEDICATED FULL-PAGE ILLUSTRATION CARD SHORT-CIRCUIT
                if (pData.isImagePage && pData.imageObj) {
                  return (
                    <div 
                      id={`page-card-${pData.pageNumber}`}
                      className="rounded shadow-md relative border border-gray-200 overflow-hidden text-center transition-all duration-300 flex flex-col justify-between"
                      style={{
                        width: '320px',
                        height: '460px',
                        backgroundColor: paperBgColor,
                        paddingLeft: useLeftPadding,
                        paddingRight: useRightPadding,
                        paddingTop: `${Math.max(25, settings.topMargin * 40)}px`,
                        paddingBottom: `${Math.max(25, settings.bottomMargin * 40)}px`,
                      }}
                    >
                      <div 
                        className="absolute top-0 bottom-0 w-1.5 bg-yellow-600/10 pointer-events-none"
                        style={{
                          left: side === 'left' ? 'auto' : side === 'right' ? '0px' : isOdd ? '0px' : 'auto',
                          right: side === 'left' ? '0px' : side === 'right' ? 'auto' : isOdd ? 'auto' : '0px',
                        }}
                      />

                      <div className="flex-1 flex flex-col items-center justify-center p-2">
                        <img 
                          src={pData.imageObj.url} 
                          alt={pData.imageObj.name}
                          className="object-contain shadow-sm rounded max-w-full max-h-[220px]"
                          style={{
                            width: `${pData.imageObj.scale || 100}%`
                          }}
                        />
                        {pData.imageObj.caption && (
                          <p className="text-[10px] italic text-gray-500 mt-3 font-serif line-clamp-2 px-4 leading-normal">
                            {pData.imageObj.caption}
                          </p>
                        )}
                      </div>

                      <div className="text-center text-[10px] font-bold text-gray-400 mt-2">
                        {pData.pageNumber}
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    id={`page-card-${pData.pageNumber}`}
                    className="rounded shadow-md relative border border-gray-200 overflow-hidden text-left transition-all duration-300"
                    style={{
                      width: '320px',
                      height: '460px',
                      backgroundColor: paperBgColor,
                      fontFamily: settings.bodyFont === 'Times New Roman' ? 'serif' : settings.bodyFont,
                      paddingLeft: useLeftPadding,
                      paddingRight: useRightPadding,
                      paddingTop: `${Math.max(25, settings.topMargin * 40)}px`,
                      paddingBottom: `${Math.max(25, settings.bottomMargin * 40)}px`,
                    }}
                  >
                    {/* Mirror Inside Binder Highlight Gutter Line visually */}
                    <div 
                      className="absolute top-0 bottom-0 w-1.5 bg-yellow-600/10 pointer-events-none"
                      style={{
                        left: side === 'left' ? 'auto' : side === 'right' ? '0px' : isOdd ? '0px' : 'auto',
                        right: side === 'left' ? '0px' : side === 'right' ? 'auto' : isOdd ? 'auto' : '0px',
                      }}
                    />

                    {/* Header page title */}
                    {settings.showRunningHeaders && pData.pageNumber > 2 && (
                      <div className="text-[9px] uppercase border-b border-gray-100 pb-1 text-center font-bold tracking-wider text-gray-400 absolute top-6 left-0 right-0 px-8 truncate">
                        {isOdd 
                          ? (settings.headerOddText || 'BY AUTHOR').toUpperCase() 
                          : (settings.headerEvenText || 'BOOK TITLE').toUpperCase()
                        }
                      </div>
                    )}

                    {/* Lines mapping visually */}
                    <div className="h-full flex flex-col justify-start overflow-hidden mt-2 text-xs leading-normal">
                      {pData.inlineImageTop && (
                        <div className="w-full flex flex-col items-center mb-3 pt-1 border-b border-gray-100 pb-1.5 shrink-0">
                          <img 
                            src={pData.inlineImageTop.url} 
                            alt={pData.inlineImageTop.name}
                            className="object-contain rounded"
                            style={{
                              maxHeight: '75px',
                              width: `${pData.inlineImageTop.scale || 100}%`
                            }}
                          />
                          {pData.inlineImageTop.caption && (
                            <p className="text-[8px] italic text-gray-400 text-center font-serif mt-1 leading-tight px-2 max-w-full">
                              {pData.inlineImageTop.caption}
                            </p>
                          )}
                        </div>
                      )}

                      {pData.lines.map((line, lIdx) => {
                        const isEditable = !!line.chapId;
                        const editStyleClass = isEditable 
                          ? 'cursor-pointer hover:bg-emerald-50 hover:outline hover:outline-dashed hover:outline-1 hover:outline-emerald-400 rounded px-1 transition-all'
                          : '';
                        const editTooltip = isEditable 
                          ? (line.isTitle ? "Double-click or click to edit chapter title" : "Double-click or click to edit paragraph block")
                          : undefined;

                        const handleLineClick = isEditable ? () => {
                          startEditing(line.chapId!, line.pIdx, !!line.isTitle, line.text);
                        } : undefined;

                        if (line.isHeading) {
                          let alignmentClass = 'text-center';
                          let borderClass = 'border-b border-gray-100 pb-1 mb-3 text-[11px] mt-2 font-black text-gray-900 leading-normal';
                          if (settings.chapterTitleAlign === 'left') {
                            alignmentClass = 'text-left';
                          } else if (settings.chapterTitleAlign === 'fancy-frame') {
                            alignmentClass = 'text-center border-t border-b border-indigo-150 py-1 my-2.5 tracking-wider text-indigo-600 font-serif uppercase';
                            borderClass = 'text-[10px] font-black';
                          }
                          return (
                            <div 
                              key={`preview-line-${lIdx}`} 
                              className={`${alignmentClass} ${borderClass} ${editStyleClass}`}
                              onClick={handleLineClick}
                              title={editTooltip}
                            >
                              {line.text}
                            </div>
                          );
                        } else if (line.isOrnament) {
                          let ornamentStr = '✦ ✦ ✦';
                          if (settings.chapterOrnament === 'floral-leaf') ornamentStr = '❦ ❦ ❦';
                          else if (settings.chapterOrnament === 'divider-bar') ornamentStr = '═══ ✥ ═══';
                          else if (settings.chapterOrnament === 'none') ornamentStr = '';
                          
                          const finalOrnamentText = (line.text && line.text.trim()) ? line.text : ornamentStr;
                          if (!finalOrnamentText) return null;
                          return (
                            <div key={`preview-line-${lIdx}`} className="text-center text-amber-600 my-1 font-mono text-[10px] tracking-widest">
                              {finalOrnamentText}
                            </div>
                          );
                        } else {
                          const hasDropCap = !!line.dropCapChar;
                          const dropCapLines = line.dropCapLinesCount || 3;
                          const accentColor = line.dropCapColor || '#4f46e5';
                          
                          const scaledFontSize = (settings.bodyFontSize || 11) * previewScale;
                          const scaledLineHeight = scaledFontSize * (settings.lineSpacing || 1.35);
  
                          // Calculate dynamic padding on screen using scaled dropCapOffset directly
                          const rawPadding = line.dropCapOffset ? (line.dropCapOffset * previewScale) : (dropCapLines === 2 ? 18 : dropCapLines === 4 ? 32 : 26);
                          const paddingVal = Math.max(12, rawPadding);
  
                          if (hasDropCap) {
                            const dcFontSize = (settings.bodyFontSize || 11) * (settings.lineSpacing || 1.35) * dropCapLines * 1.05;
                            const scaledDcFontSize = dcFontSize * previewScale;
                            return (
                              <div 
                                key={`preview-line-${lIdx}`} 
                                className={`relative select-none ${editStyleClass}`}
                                style={{
                                  paddingLeft: `${paddingVal}px`,
                                  fontSize: `${scaledFontSize}px`,
                                  lineHeight: `${scaledLineHeight}px`,
                                  marginBottom: `${scaledFontSize * 0.1}px`,
                                  color: '#1f2937'
                                }}
                                onClick={handleLineClick}
                                title={editTooltip}
                              >
                                {/* Large visible absolute drop cap letter */}
                                <span 
                                  className="absolute left-0 top-0 font-serif font-black leading-none"
                                  style={{
                                    fontSize: `${scaledDcFontSize}px`,
                                    color: accentColor,
                                    lineHeight: '0.85em',
                                    transform: 'scaleY(0.95)',
                                    transformOrigin: 'top left'
                                  }}
                                >
                                  {line.dropCapChar}
                                </span>
                                <span className={line.align === 'center' ? 'text-center block' : 'text-justify block'}>{line.text}</span>
                              </div>
                            );
                          }
  
                          // Add visual indentation spacing if we are in subsequent indented rows around the dropcap
                          const isIndentedRow = line.dropCapOffset !== undefined;
                          const alignClass = line.align === 'center' ? 'text-center' : 'text-justify';
                          const italicClass = line.isItalic ? 'italic text-emerald-900 font-serif font-medium tracking-wide' : '';
                          return (
                            <p 
                              key={`preview-line-${lIdx}`} 
                              className={`mb-0.5 ${alignClass} ${italicClass} ${editStyleClass}`}
                              style={{
                                paddingLeft: isIndentedRow ? `${paddingVal}px` : '0px',
                                fontSize: `${scaledFontSize}px`,
                                lineHeight: `${scaledLineHeight}px`,
                                color: '#1f2937'
                              }}
                              onClick={handleLineClick}
                              title={editTooltip}
                            >
                              {line.text}
                            </p>
                          );
                        }
                      })}

                      {pData.inlineImageBottom && (
                        <div className="w-full flex flex-col items-center mt-auto border-t border-gray-100 pt-1.5 shrink-0">
                          <img 
                            src={pData.inlineImageBottom.url} 
                            alt={pData.inlineImageBottom.name}
                            className="object-contain rounded"
                            style={{
                              maxHeight: '75px',
                              width: `${pData.inlineImageBottom.scale || 100}%`
                            }}
                          />
                          {pData.inlineImageBottom.caption && (
                            <p className="text-[8px] italic text-gray-400 text-center font-serif mt-1 leading-tight px-2 max-w-full">
                              {pData.inlineImageBottom.caption}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Page Number aligned centered */}
                    <div className="absolute bottom-5 left-0 right-0 text-center text-[10px] font-bold text-gray-400">
                      {pData.pageNumber}
                    </div>
                  </div>
                );
              };

              // Compute double spread indices
              const isEvenPage = activePage.pageNumber % 2 === 0;
              const leftPageIndex = isEvenPage ? previewPageIndex : previewPageIndex - 1;
              const rightPageIndex = isEvenPage ? previewPageIndex + 1 : previewPageIndex;
              const leftPageDef = leftPageIndex >= 0 ? previewPages[leftPageIndex] : null;
              const rightPageDef = rightPageIndex < previewPages.length ? previewPages[rightPageIndex] : null;

              return (
                <div className="w-full flex justify-center py-4 select-none relative">
                  {isExpanded ? (
                    <div className="flex flex-col md:flex-row items-center gap-6 justify-center bg-slate-200/40 p-4 rounded-xl border border-dashed border-slate-300">
                      {/* Left Page (Even) */}
                      {leftPageDef ? (
                        renderPageCard(leftPageDef, 'left')
                      ) : (
                        <div className="w-[320px] h-[460px] bg-slate-100/50 rounded border border-dashed border-gray-300 flex items-center justify-center text-[10px] font-mono text-gray-400">
                          [ FLYLEAF / START OF BOOK ]
                        </div>
                      )}

                      {/* Center spine gutter joint */}
                      <div className="hidden md:block w-3 h-[460px] bg-gradient-to-r from-gray-300 via-gray-200/60 to-gray-300 shadow-inner z-10 shrink-0 border-l border-r border-gray-300/40" />

                      {/* Right Page (Odd) */}
                      {rightPageDef ? (
                        renderPageCard(rightPageDef, 'right')
                      ) : (
                        <div className="w-[320px] h-[460px] bg-slate-100/50 rounded border border-dashed border-gray-300 flex items-center justify-center text-[10px] font-mono text-gray-400">
                          [ FLYLEAF / END OF BOOK ]
                        </div>
                      )}
                    </div>
                  ) : (
                    renderPageCard(activePage, 'single')
                  )}

                  {/* Word document style interactive overlay editor */}
                  {editingBlock && (
                    <div 
                      className="absolute bg-slate-950/95 rounded-md shadow-2xl flex flex-col justify-between p-5 z-50 text-white font-sans border border-slate-700 animate-fade-in"
                      style={{
                        width: '320px',
                        height: '460px',
                      }}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            {editingBlock.isTitle ? "Edit Chapter Title" : "Inline Text Block Editor"}
                          </span>
                          <span className="text-[8px] font-mono text-gray-400">
                            Ctrl+Enter to Save
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-300 leading-normal">
                          {editingBlock.isTitle 
                            ? "Editing chapter title. This instantly triggers reflow." 
                            : "Editing paragraph directly. Layout flows to subsequent pages."
                          }
                        </p>
                        <textarea
                          autoFocus
                          value={editingBlock.currentValue}
                          onChange={(e) => setEditingBlock(prev => prev ? { ...prev, currentValue: e.target.value } : null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              saveEditing();
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          className="w-full h-[240px] bg-slate-900 text-white rounded p-3 text-[11px] leading-relaxed border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans resize-none"
                          placeholder="Type content here..."
                          onFocus={(e) => {
                            // Put caret at the end of the text
                            const val = e.target.value;
                            e.target.value = '';
                            e.target.value = val;
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-1.5">
                        <button
                          onClick={cancelEditing}
                          className="hover:bg-white/5 text-gray-400 hover:text-white font-mono text-[9.5px] font-bold py-1.5 px-2.5 rounded cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEditing}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[9.5px] font-bold py-1.5 px-3.5 rounded cursor-pointer transition-colors shadow-md shadow-emerald-950/20"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="text-gray-400 font-mono text-xs">No pages styled yet. Please upload content.</div>
            )}

            {/* Pagination Visual control */}
            <div className="flex items-center gap-4 mt-2 font-mono">
              <button 
                onClick={() => setPreviewPageIndex(p => Math.max(0, p - 1))}
                disabled={previewPageIndex === 0}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 py-1.5 px-3 rounded-md text-xs font-bold disabled:opacity-40"
              >
                &larr; Prev Page
              </button>
              <span className="text-xs text-gray-500">
                P. <span className="font-bold text-gray-900">{previewPageIndex + 1}</span> / {previewPages.length}
              </span>
              <button 
                onClick={() => setPreviewPageIndex(p => Math.min(previewPages.length - 1, p + 1))}
                disabled={previewPageIndex >= previewPages.length - 1}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 py-1.5 px-3 rounded-md text-xs font-bold disabled:opacity-40"
              >
                Next Page &rarr;
              </button>
            </div>
          </div>

          {/* EXPORT OPTIONS BAR */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h4 className="font-serif font-black text-gray-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
              Print-Ready Book Export
            </h4>
            <p className="text-xs text-gray-500 font-mono leading-relaxed">
              Upon export, the pipeline styles the full {chapters.length} chapters, generates custom footers with page counts, and applies vector mirror bound metrics for the physical paperback binding.
            </p>

            {isExporting && (
              <div id="exporting-progress-slider" className="space-y-1.5 font-mono text-[10px] block">
                <div className="flex justify-between font-bold">
                  <span>Formatting book block chapters...</span>
                  <span>{exportProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded overflow-hidden">
                  <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={triggerExportInterior}
                disabled={isExporting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-xs font-mono font-bold px-6 py-3.5 rounded flex items-center gap-2 group transition-all"
              >
                <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                {isExporting ? "Compiling PDF signature..." : "Export Print-Ready Interior PDF"}
              </button>
              <span className="text-[10px] text-gray-400 font-mono">100% Secure local processing</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
