/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Palette, Info, ArrowLeft, Download, Eye, EyeOff, Layout, FileImage, 
  HelpCircle, CheckCircle2, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import { CoverSettings, PlatformId, TrimSizeId, BindingType, PaperColor } from '../types';
import { PLATFORMS, TRIM_SIZES } from '../utils/presets';
import { calculateSpineWidth, compileCoverPDF, inchesToPts } from '../utils/pdfHelpers';

interface CoverBuilderProps {
  onBack: () => void;
}

export default function CoverBuilder({ onBack }: CoverBuilderProps) {
  // Config state
  const [settings, setSettings] = useState<CoverSettings>({
    platform: 'kdp',
    binding: 'paperback',
    trimId: '6x9',
    customWidth: 6.0,
    customHeight: 9.0,
    paperColor: 'white',
    pageCount: 154,
    
    // Design settings
    mode: 'front',
    spineBgColor: '#1e293b',
    spineTextColor: '#f8fafc',
    spineTitle: 'The Sparks of Creation',
    spineAuthor: 'P. Smith',
    spineFont: 'Times New Roman',
    spineFontSize: 11,
    
    backBgColor: '#1e293b',
    backTextColor: '#cbd5e1',
    backDescription: 'A gripping journey through the furnaces of the post-Scarcity world. Where word smithing and metal forging collide to preserve humanity’s oldest languages.',
    backAuthorBio: 'D. Scribe is an expert archivist from the Border Spires.',
    showBarcodePlaceholder: true
  });

  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [frontImgUrl, setFrontImgUrl] = useState<string>('');
  const [backImage, setBackImage] = useState<File | null>(null);
  const [backImgUrl, setBackImgUrl] = useState<string>('');
  
  // Ref for 2D Interactive Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);

  // Upload state for Mode B (Full wrap)
  const [fullWrapBlob, setFullWrapBlob] = useState<File | null>(null);
  const [fullWrapRatio, setFullWrapRatio] = useState<number>(0);
  const [fullWrapWidthPx, setFullWrapWidthPx] = useState<number>(0);
  const [fullWrapHeightPx, setFullWrapHeightPx] = useState<number>(0);

  // Calculate specifications
  const trimPreset = TRIM_SIZES.find(t => t.id === settings.trimId) || TRIM_SIZES[3];
  const trimWidth = settings.trimId === 'custom' ? settings.customWidth : trimPreset.width;
  const trimHeight = settings.trimId === 'custom' ? settings.customHeight : trimPreset.height;

  const calculatedSpine = calculateSpineWidth(settings.platform, settings.paperColor, settings.pageCount);
  const bleed = 0.125; // standard bleed

  const totalFlatWidth = (trimWidth * 2) + calculatedSpine + (bleed * 2);
  const totalFlatHeight = trimHeight + (bleed * 2);

  // Pixel dimensions recommendations at 300 DPI
  const targetWidthPx = Math.round(totalFlatWidth * 300);
  const targetHeightPx = Math.round(totalFlatHeight * 300);

  // Mode B Upload dimensions handler
  const handleFullWrapUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFullWrapBlob(file);
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        setFullWrapWidthPx(img.width);
        setFullWrapHeightPx(img.height);
        setFullWrapRatio(img.width / img.height);
      };
    }
  };

  // Image upload handles for Mode A
  const handleFrontImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFrontImage(file);
      const url = URL.createObjectURL(file);
      setFrontImgUrl(url);

      // Simple Auto-Dominant Color Sampler
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 10;
        sampleCanvas.height = 10;
        const ctx = sampleCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 10, 10);
          const pixel = ctx.getImageData(5, 5, 1, 1).data;
          const hex = "#" + ("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
          // Suggest dominant palette
          setSettings(prev => ({
            ...prev,
            backBgColor: hex,
            spineBgColor: hex
          }));
        }
      };
    }
  };

  const handleBackImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackImage(file);
      setBackImgUrl(URL.createObjectURL(file));
    }
  };

  // Draw 2D Interactive Canvas Preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fixed drawing width
    const drawWidth = 720;
    const drawHeight = Math.round(drawWidth * (totalFlatHeight / totalFlatWidth));
    canvas.width = drawWidth;
    canvas.height = drawHeight;

    const scale = drawWidth / totalFlatWidth;

    // Background color setups
    ctx.fillStyle = settings.backBgColor;
    ctx.fillRect(0, 0, (trimWidth + bleed) * scale, drawHeight);

    // Spine background coloring
    const spineStartX = (trimWidth + bleed) * scale;
    const spineWidthScale = calculatedSpine * scale;
    ctx.fillStyle = settings.spineBgColor;
    ctx.fillRect(spineStartX, 0, spineWidthScale, drawHeight);

    // Front cover background coloring
    const frontStartX = spineStartX + spineWidthScale;
    ctx.fillStyle = settings.backBgColor;
    ctx.fillRect(frontStartX, 0, (trimWidth + bleed) * scale, drawHeight);

    // Draw uploaded front image on front cover if uploaded
    if (frontImgUrl) {
      const frontImg = new Image();
      frontImg.src = frontImgUrl;
      frontImg.onload = () => {
        ctx.drawImage(frontImg, frontStartX, 0, (trimWidth + bleed) * scale, drawHeight);
        drawGuidesAndTexts();
      };
    } else {
      // Draw placeholder front text
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 16px serif';
      ctx.textAlign = 'center';
      ctx.fillText('[ Front Cover Art Placeholder ]', frontStartX + ((trimWidth + bleed) * scale) / 2, drawHeight / 2);
    }

    // Draw back image if uploaded
    if (backImgUrl) {
      const backImg = new Image();
      backImg.src = backImgUrl;
      backImg.onload = () => {
        ctx.drawImage(backImg, 0, 0, (trimWidth + bleed) * scale, drawHeight);
        drawGuidesAndTexts();
      };
    }

    // Trigger initial render in case images are missing
    drawGuidesAndTexts();

    function drawGuidesAndTexts() {
      // Draw Synopsis / Back Description text
      if (settings.mode === 'front' && settings.backDescription && !backImgUrl) {
        ctx.fillStyle = settings.backTextColor;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        
        const textWords = settings.backDescription.split(' ');
        let currentLine = '';
        let yOffset = 45;
        const leftBound = 24;
        const wrapWidth = (trimWidth + bleed) * scale - 48;

        for (const word of textWords) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          if (ctx.measureText(testLine).width > wrapWidth) {
            ctx.fillText(currentLine, leftBound, yOffset);
            yOffset += 12;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          ctx.fillText(currentLine, leftBound, yOffset);
        }
      }

      // Barcode space
      if (settings.showBarcodePlaceholder && !backImgUrl) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.fillRect(24, drawHeight - 65, 80, 45);
        ctx.strokeRect(24, drawHeight - 65, 80, 45);
        ctx.fillStyle = '#64748b';
        ctx.font = '7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ISBN BARCODE', 64, drawHeight - 45);
        ctx.fillText('PLACEHOLDER', 64, drawHeight - 35);
      }

      // Render spine text rotated
      if (settings.spineTitle && calculatedSpine >= 0.25) {
        ctx.save();
        ctx.fillStyle = settings.spineTextColor;
        ctx.textAlign = 'center';
        ctx.font = `bold ${Math.max(8, settings.spineFontSize * 0.8)}px sans-serif`;
        
        const spineCenterX = spineStartX + (spineWidthScale / 2);
        const spineCenterY = drawHeight / 2;
        
        ctx.translate(spineCenterX, spineCenterY);
        ctx.rotate(-Math.PI / 2); // rotated
        ctx.fillText(`${settings.spineTitle.toUpperCase()}  ${settings.spineAuthor ? '— ' + settings.spineAuthor : ''}`, 0, 4);
        ctx.restore();
      }

      // Bleed & Safety guides
      if (showGuides) {
        const bleedPx = bleed * scale;

        // Draw Outer Bleed lines
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)'; // Rose color
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        
        // Left Trim Outer boundary
        ctx.strokeRect(bleedPx, bleedPx, drawWidth - (bleedPx * 2), drawHeight - (bleedPx * 2));
        
        // Draw spine safe markers
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'; // Blue color
        ctx.strokeRect(spineStartX, 0, spineWidthScale, drawHeight);

        // Overlay text description
        ctx.fillStyle = 'rgba(220, 38, 38, 0.7)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('← Bleed Margin Overlay (0.125")', bleedPx + 6, bleedPx + 14);

        ctx.fillStyle = 'rgba(37, 99, 235, 0.7)';
        ctx.fillText('Spine Safety Zones', spineStartX + spineWidthScale + 6, drawHeight - 14);
      }
    }
  }, [settings, totalFlatWidth, totalFlatHeight, showGuides, frontImgUrl, backImgUrl]);

  // Handle Cover Downloading
  const triggerDownloadCover = async () => {
    setIsCompiling(true);
    try {
      const pdfBlob = await compileCoverPDF(settings, frontImage, backImage);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PublishingForge-Cover-${settings.platform}-${settings.trimId}-${settings.pageCount}p.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div id="cover-builder-main-container" className="max-w-6xl mx-auto px-4 py-6">
      
      {/* Header back bar */}
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-mono text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Selection
        </button>
        <span className="text-xs font-mono text-gray-400">BUILD COMPONENT v1.02</span>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT / SETTINGS COLUMN: 5 columns */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-xl font-serif font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5 text-indigo-600" />
              Book Cover Geometry
            </h2>

            {/* Input Selection Panels */}
            <div className="space-y-4 text-xs font-mono">
              
              {/* Cover Creation Mode Selector */}
              <div>
                <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[10px]">COVER GENERATION MODE</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings(p => ({ ...p, mode: 'front' }))}
                    className={`py-2 px-3 border rounded text-center font-bold ${settings.mode === 'front' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    Compose Front cover
                  </button>
                  <button
                    onClick={() => setSettings(p => ({ ...p, mode: 'full' }))}
                    className={`py-2 px-3 border rounded text-center font-bold ${settings.mode === 'full' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    Upload Precomposed Spread
                  </button>
                </div>
              </div>

              {/* Platform Selector */}
              <div>
                <label className="block text-gray-400 font-bold mb-1.5">DISTRIBUTION PLATFORM</label>
                <select 
                  value={settings.platform} 
                  onChange={(e) => setSettings(p => ({ ...p, platform: e.target.value as PlatformId }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-700"
                >
                  <option value="kdp">Amazon KDP </option>
                  <option value="ingram">IngramSpark</option>
                  <option value="lulu">Lulu Publisher</option>
                  <option value="d2d">Draft2Digital Print</option>
                </select>
              </div>

              {/* Spine multipliers details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">PAPER COLOR</label>
                  <select 
                    value={settings.paperColor} 
                    onChange={(e) => setSettings(p => ({ ...p, paperColor: e.target.value as PaperColor }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-700"
                  >
                    <option value="white">White 50lb / 74gsm</option>
                    <option value="cream">Cream 50lb / 74gsm</option>
                    <option value="color">Premium Color paper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">BOOK PAGE COUNT</label>
                  <input 
                    type="number" 
                    min="24" 
                    max="830"
                    value={settings.pageCount} 
                    onChange={(e) => setSettings(p => ({ ...p, pageCount: Math.max(10, parseInt(e.target.value) || 24) }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-700 font-bold"
                  />
                </div>
              </div>

              {/* Trim Size Picker */}
              <div>
                <label className="block text-gray-400 font-bold mb-1.5">FINISHED BOOK TRIM SIZE</label>
                <select 
                  value={settings.trimId} 
                  onChange={(e) => setSettings(p => ({ ...p, trimId: e.target.value as TrimSizeId }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-700"
                >
                  {TRIM_SIZES.map(trim => (
                    <option key={trim.id} value={trim.id}>
                      {trim.name} — {trim.commonUse}
                    </option>
                  ))}
                </select>
              </div>

              {settings.trimId === 'custom' && (
                <div id="custom-inputs-spread" className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border border-gray-200 rounded">
                  <div>
                    <label className="block text-gray-400 mb-1">Custom Width (in)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={settings.customWidth} 
                      onChange={(e) => setSettings(p => ({ ...p, customWidth: parseFloat(e.target.value) || 6.0 }))}
                      className="w-full bg-white border border-gray-200 rounded p-1"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Custom Height (in)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={settings.customHeight} 
                      onChange={(e) => setSettings(p => ({ ...p, customHeight: parseFloat(e.target.value) || 9.0 }))}
                      className="w-full bg-white border border-gray-200 rounded p-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mode A: Composition Side settings */}
          {settings.mode === 'front' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-serif font-bold text-slate-900 border-b border-slate-100 pb-2">
                Artwork &amp; Composition controls
              </h3>

              <div className="text-xs font-mono space-y-4">
                {/* Image Upload triggers */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1">FRONT COVER ARTWORK (JPG/PNG)</label>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    onChange={handleFrontImage}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-mono file:bg-indigo-50 file:text-indigo-600 file:cursor-pointer hover:file:bg-indigo-100/70"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Uploaded covers auto-calculate matching backs</p>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">OPTIONAL FULL BACK COVER IMAGE</label>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    onChange={handleBackImage}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-mono file:bg-slate-100 file:text-slate-700 file:cursor-pointer hover:file:bg-slate-200"
                  />
                </div>

                {/* Cover color adjustments */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1">SPINE TONE</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={settings.spineBgColor} 
                        onChange={(e) => setSettings(p => ({ ...p, spineBgColor: e.target.value }))}
                        className="w-8 h-8 rounded shrink-0 border border-gray-200 cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={settings.spineBgColor} 
                        onChange={(e) => setSettings(p => ({ ...p, spineBgColor: e.target.value }))}
                        className="w-full text-xs font-mono border border-gray-200 rounded p-1 text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold mb-1">BACK/TEXT TONE</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={settings.backBgColor} 
                        onChange={(e) => setSettings(p => ({ ...p, backBgColor: e.target.value }))}
                        className="w-8 h-8 rounded shrink-0 border border-gray-200 cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={settings.backBgColor} 
                        onChange={(e) => setSettings(p => ({ ...p, backBgColor: e.target.value }))}
                        className="w-full text-xs font-mono border border-gray-200 rounded p-1 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Spine inputs */}
                <div>
                  <label className="block text-gray-400 font-bold mb-1">SPINE PRINT TITLE</label>
                  <input 
                    type="text" 
                    value={settings.spineTitle} 
                    onChange={(e) => setSettings(p => ({ ...p, spineTitle: e.target.value }))}
                    disabled={calculatedSpine < 0.25}
                    placeholder={calculatedSpine < 0.25 ? "Spine too thin (<0.25\")" : "Title text"}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">SPINE PRINT AUTHOR</label>
                  <input 
                    type="text" 
                    value={settings.spineAuthor} 
                    onChange={(e) => setSettings(p => ({ ...p, spineAuthor: e.target.value }))}
                    disabled={calculatedSpine < 0.25}
                    placeholder="Author text"
                    className="w-full bg-gray-50 border border-gray-200 rounded p-2"
                  />
                </div>

                {/* Back synopsis synopsis description */}
                <div>
                  <label className="block text-gray-400 font-bold mb-1">BACK COVER BLURB / SYNOPSIS</label>
                  <textarea 
                    value={settings.backDescription} 
                    onChange={(e) => setSettings(p => ({ ...p, backDescription: e.target.value }))}
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded p-2"
                  />
                </div>

                {/* Options */}
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="barcode-checkbox"
                    checked={settings.showBarcodePlaceholder} 
                    onChange={(e) => setSettings(p => ({ ...p, showBarcodePlaceholder: e.target.checked }))}
                    className="accent-indigo-600"
                  />
                  <label htmlFor="barcode-checkbox" className="text-xs text-slate-600 font-bold">RESERVE WHITE BOX FOR ISBN BARCODE</label>
                </div>
              </div>
            </div>
          )}

          {/* Mode B: Full Spread composition upload */}
          {settings.mode === 'full' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 font-mono text-xs">
              <h3 className="text-base font-serif font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileImage className="w-4 h-4 text-indigo-600" />
                Full spread upload
              </h3>
              
              <div className="p-3 bg-indigo-50 rounded text-indigo-700 text-[11px] leading-relaxed mb-4 border border-indigo-100/30">
                <strong>IngramSpark &amp; KDP compliant</strong> requirements specify files must be built including bleed parameters of 0.125" on all 4 sides. 
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">SELECT PRECOMPOSED SPREAD (JPG/PNG)</label>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  onChange={handleFullWrapUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-mono file:bg-indigo-50 file:text-indigo-600 file:cursor-pointer hover:file:bg-indigo-100/70"
                />
              </div>

              {fullWrapBlob && (
                <div className="border border-slate-200 rounded p-3 space-y-2 bg-slate-50 text-[11px]">
                  <p className="font-bold border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>UPLOAD METRICS</span>
                    <span className="text-indigo-600">VERIFICATION DONE</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Uploaded Width:</span>
                    <span className="font-bold text-slate-900">{fullWrapWidthPx} px</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Uploaded Height:</span>
                    <span className="font-bold text-gray-900">{fullWrapHeightPx} px</span>
                  </p>
                  <p className="flex justify-between">
                    <span>DPI estimate:</span>
                    <span className="font-bold text-gray-900">
                      {Math.round((fullWrapWidthPx / totalFlatWidth))} DPI (Standard Print is 300)
                    </span>
                  </p>

                  <div className="text-[11px] border-t border-gray-200 pt-1.5 mt-2 flex items-start gap-1 p-1 bg-white rounded">
                    {Math.round((fullWrapWidthPx / totalFlatWidth)) >= 240 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="text-gray-600">
                      {Math.round((fullWrapWidthPx / totalFlatWidth)) >= 240 
                        ? "DPI Resolution looks strong for print compression." 
                        : "DPI Resolution under 240. Cover output may register blurry on printing intake."
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT / PREVIEW COLUMN: 7 columns */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SIZER SPECIFICATION HUD */}
          <div className="bg-gray-900 text-white rounded-xl p-5 font-mono shadow-sm border border-gray-800">
            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest block mb-2 font-bold">
              PLATFORM SPECIFICATION METRIC ENGINE
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs divide-x divide-gray-800">
              <div className="pl-2">
                <span className="text-gray-500 block text-[10px]">Trim height</span>
                <span className="font-bold text-white text-base">{trimHeight}"</span>
                <span className="text-gray-400 block text-[9px] mt-0.5">({inchesToPts(trimHeight)} pt)</span>
              </div>
              <div className="pl-4">
                <span className="text-gray-500 block text-[10px]">Computed Spine</span>
                <span className="font-bold text-indigo-400 text-base">{calculatedSpine.toFixed(4)}"</span>
                <span className="text-gray-400 block text-[9px] mt-0.5">({inchesToPts(calculatedSpine).toFixed(1)} pt)</span>
              </div>
              <div className="pl-4">
                <span className="text-gray-500 block text-[10px]">Flat wrap width</span>
                <span className="font-bold text-white text-base">{totalFlatWidth.toFixed(3)}"</span>
                <span className="text-gray-400 block text-[9px] mt-0.5">({inchesToPts(totalFlatWidth).toFixed(1)} pt)</span>
              </div>
              <div className="pl-4">
                <span className="text-gray-500 block text-[10px]">Target pixels</span>
                <span className="font-bold text-emerald-400 text-base">{targetWidthPx}×{targetHeightPx}</span>
                <span className="text-gray-400 block text-[9px] mt-0.5">@ 300 DPI</span>
              </div>
            </div>

            {calculatedSpine < 0.25 && settings.mode === 'front' && (
              <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] rounded leading-relaxed">
                <strong>Notice:</strong> Your page count of {settings.pageCount} yields a spine thinner than 0.25". Self-publishing standards prohibit placing spine text below 0.25 inches.
              </div>
            )}
          </div>

          {/* SPREAD PREVIEW COVER CONTAINER */}
          <div className="bg-slate-100 rounded-xl border border-gray-200 p-4 md:p-6 shadow-inner flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1.5 font-bold">
                <Eye className="w-4 h-4 text-indigo-600" />
                Interactive Wrap Canvas Preview
              </span>
              <button 
                onClick={() => setShowGuides(!showGuides)}
                className="flex items-center gap-1 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded px-2.5 py-1"
              >
                {showGuides ? <EyeOff className="w-3 px-0.5 h-3" /> : <Eye className="w-3 px-0.5 h-3" />}
                Guides Template: {showGuides ? 'On' : 'Off'}
              </button>
            </div>

            {/* Canvas viewport */}
            <div className="w-full max-w-full overflow-auto bg-slate-900/5 p-4 rounded-lg flex justify-center">
              <canvas 
                ref={canvasRef}
                className="max-w-full shadow-lg border border-gray-300 rounded overflow-hidden"
              />
            </div>

            <div className="w-full grid grid-cols-3 gap-1.5 text-center font-mono text-[10px] text-gray-400 mt-4 leading-normal">
              <div>&larr; BACK PANEL COVER PANEL</div>
              <div className="font-bold text-blue-500">SPINE SPINE</div>
              <div>FRONT COVER COVER PANEL &rarr;</div>
            </div>
          </div>

          {/* EXPORT ACTION PANEL */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h4 className="font-serif font-bold text-gray-900 text-sm">Print-ready final export</h4>
            <p className="text-xs text-gray-500 leading-relaxed font-mono">
              We compile vector alignments containing proper points and color profiles natively in-browser. Ready for KDP Uploading.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={triggerDownloadCover}
                disabled={isCompiling}
                className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-xs font-mono font-bold px-6 py-3.5 rounded flex items-center gap-2 group transition-all"
              >
                <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                {isCompiling ? "Compiling cover spread..." : "Export Print-Ready Spread PDF"}
              </button>

              <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Local compile done (100% Client-side sandbox)
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
