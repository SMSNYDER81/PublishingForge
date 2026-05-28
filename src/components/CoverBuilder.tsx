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
import AIAssistant from './AIAssistant';
import { drawBarcodeToCanvas } from '../utils/barcodeGenerator';

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
    showBarcodePlaceholder: true,
    barcodeISBN: '9781234567897',
    barcodePrice: '19.99'
  });

  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [frontImgUrl, setFrontImgUrl] = useState<string>('');
  const [backImage, setBackImage] = useState<File | null>(null);
  const [backImgUrl, setBackImgUrl] = useState<string>('');
  
  // Ref for 2D Interactive Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);

  // Layout editor dragging / resizing state
  const [selectedImage, setSelectedImage] = useState<'front' | 'back' | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const isResizingRef = useRef<boolean>(false);
  const activeHandleRef = useRef<string | null>(null);
  const dragStartMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartImageRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });

  // Web-Safe preloaded images references to bypass browser download flicker
  const [frontImgLoaded, setFrontImgLoaded] = useState<boolean>(false);
  const [backImgLoaded, setBackImgLoaded] = useState<boolean>(false);
  const [fullWrapImgLoaded, setFullWrapImgLoaded] = useState<boolean>(false);
  const frontImgRef = useRef<HTMLImageElement | null>(null);
  const backImgRef = useRef<HTMLImageElement | null>(null);
  const fullWrapImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (frontImgUrl) {
      const img = new Image();
      img.src = frontImgUrl;
      img.onload = () => {
        frontImgRef.current = img;
        setFrontImgLoaded(prev => !prev); // toggle trigger redraw
      };
    } else {
      frontImgRef.current = null;
    }
  }, [frontImgUrl]);

  useEffect(() => {
    if (backImgUrl) {
      const img = new Image();
      img.src = backImgUrl;
      img.onload = () => {
        backImgRef.current = img;
        setBackImgLoaded(prev => !prev); // toggle trigger redraw
      };
    } else {
      backImgRef.current = null;
    }
  }, [backImgUrl]);

  const [fullWrapImgUrl, setFullWrapImgUrl] = useState<string>('');
  useEffect(() => {
    if (fullWrapImgUrl) {
      const img = new Image();
      img.src = fullWrapImgUrl;
      img.onload = () => {
        fullWrapImgRef.current = img;
        setFullWrapImgLoaded(prev => !prev); // toggle trigger redraw
      };
    } else {
      fullWrapImgRef.current = null;
    }
  }, [fullWrapImgUrl]);

  // Convert current physical specifications and custom layout transforms to coordinate pixels
  const getImageBounds = (scale: number) => {
    const flapWidthScale = (settings.binding === 'hardcover-jacket' ? (settings.flapWidth || 3.25) + 0.125 : 0) * scale;
    const backCoverWidthScale = backCoverWidthPts * scale;
    const spineWidthScale = calculatedSpine * scale;

    const spineStartX = settings.binding === 'hardcover-jacket' 
      ? flapWidthScale + backCoverWidthScale 
      : (settings.binding === 'hardcover-case' ? backCoverWidthScale + 0.375 * scale : backCoverWidthScale);
    const frontStartX = settings.binding === 'hardcover-jacket'
      ? spineStartX + spineWidthScale
      : (settings.binding === 'hardcover-case' ? spineStartX + spineWidthScale + 0.375 * scale : spineStartX + spineWidthScale);

    const frontStartXInches = frontStartX / scale;
    const frontWidthInches = frontCoverWidthPts / 72;

    const fx = settings.frontImageX !== undefined ? settings.frontImageX : 0;
    const fy = settings.frontImageY !== undefined ? settings.frontImageY : 0;
    const fw = settings.frontImageWidth !== undefined ? settings.frontImageWidth : frontWidthInches;
    const fh = settings.frontImageHeight !== undefined ? settings.frontImageHeight : totalFlatHeight;

    const backWidthInches = settings.binding === 'hardcover-jacket' ? (backCoverWidthPts / 72) + (settings.flapWidth || 3.25) + 0.125 : backCoverWidthPts / 72;

    const bx = settings.backImageX !== undefined ? settings.backImageX : 0;
    const by = settings.backImageY !== undefined ? settings.backImageY : 0;
    const bw = settings.backImageWidth !== undefined ? settings.backImageWidth : backWidthInches;
    const bh = settings.backImageHeight !== undefined ? settings.backImageHeight : totalFlatHeight;

    return {
      front: {
        x: (frontStartXInches + fx) * scale,
        y: fy * scale,
        w: fw * scale,
        h: fh * scale,
        origStartXInches: frontStartXInches,
        origWidthInches: frontWidthInches,
      },
      back: {
        x: bx * scale,
        y: by * scale,
        w: bw * scale,
        h: bh * scale,
        origStartXInches: 0,
        origWidthInches: backWidthInches,
      }
    };
  };

  const getMouseCoords = (e: React.MouseEvent<HTMLCanvasElement> | TouchEvent | any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getMouseCoords(e);
    const scale = canvas.width / totalFlatWidth;
    const bounds = getImageBounds(scale);

    // 1. Check if we clicked on a resize handle for the currently selected image
    if (selectedImage) {
      const activeBox = selectedImage === 'front' ? bounds.front : bounds.back;
      const handles = {
        TL: { x: activeBox.x, y: activeBox.y },
        TC: { x: activeBox.x + activeBox.w / 2, y: activeBox.y },
        TR: { x: activeBox.x + activeBox.w, y: activeBox.y },
        MR: { x: activeBox.x + activeBox.w, y: activeBox.y + activeBox.h / 2 },
        BR: { x: activeBox.x + activeBox.w, y: activeBox.y + activeBox.h },
        BC: { x: activeBox.x + activeBox.w / 2, y: activeBox.y + activeBox.h },
        BL: { x: activeBox.x, y: activeBox.y + activeBox.h },
        ML: { x: activeBox.x, y: activeBox.y + activeBox.h / 2 },
      };

      for (const [key, h] of Object.entries(handles)) {
        if (Math.abs(x - h.x) <= 8 && Math.abs(y - h.y) <= 8) {
          isResizingRef.current = true;
          activeHandleRef.current = key;
          dragStartMouseRef.current = { x, y };
          dragStartImageRef.current = { x: activeBox.x, y: activeBox.y, w: activeBox.w, h: activeBox.h };
          return;
        }
      }
    }

    // 2. Click front image body?
    if (frontImgUrl && x >= bounds.front.x && x <= bounds.front.x + bounds.front.w && y >= bounds.front.y && y <= bounds.front.y + bounds.front.h) {
      setSelectedImage('front');
      isDraggingRef.current = true;
      dragStartMouseRef.current = { x, y };
      dragStartImageRef.current = { x: bounds.front.x, y: bounds.front.y, w: bounds.front.w, h: bounds.front.h };
      return;
    }

    // 3. Click back image body?
    if (backImgUrl && x >= bounds.back.x && x <= bounds.back.x + bounds.back.w && y >= bounds.back.y && y <= bounds.back.y + bounds.back.h) {
      setSelectedImage('back');
      isDraggingRef.current = true;
      dragStartMouseRef.current = { x, y };
      dragStartImageRef.current = { x: bounds.back.x, y: bounds.back.y, w: bounds.back.w, h: bounds.back.h };
      return;
    }

    // 4. Clicked outside both
    setSelectedImage(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getMouseCoords(e);
    const scale = canvas.width / totalFlatWidth;
    const bounds = getImageBounds(scale);

    if (isResizingRef.current && selectedImage) {
      const dx = x - dragStartMouseRef.current.x;
      const dy = y - dragStartMouseRef.current.y;
      const start = dragStartImageRef.current;
      
      let newX = start.x;
      let newY = start.y;
      let newW = start.w;
      let newH = start.h;

      const handle = activeHandleRef.current;

      if (handle === 'TL') {
        newX = start.x + dx; newY = start.y + dy;
        newW = start.w - dx; newH = start.h - dy;
      } else if (handle === 'TR') {
        newY = start.y + dy;
        newW = start.w + dx; newH = start.h - dy;
      } else if (handle === 'BL') {
        newX = start.x + dx;
        newW = start.w - dx; newH = start.h + dy;
      } else if (handle === 'BR') {
        newW = start.w + dx; newH = start.h + dy;
      } else if (handle === 'TC') {
        newY = start.y + dy;
        newH = start.h - dy;
      } else if (handle === 'BC') {
        newH = start.h + dy;
      } else if (handle === 'ML') {
        newX = start.x + dx;
        newW = start.w - dx;
      } else if (handle === 'MR') {
        newW = start.w + dx;
      }

      // Constrain size to a minimum of 0.5 inches is extremely logical
      const minSizeInPx = 0.5 * scale;
      if (newW < minSizeInPx) {
        if (handle === 'TL' || handle === 'BL' || handle === 'ML') {
          newX = start.x + start.w - minSizeInPx;
        }
        newW = minSizeInPx;
      }
      if (newH < minSizeInPx) {
        if (handle === 'TL' || handle === 'TR' || handle === 'TC') {
          newY = start.y + start.h - minSizeInPx;
        }
        newH = minSizeInPx;
      }

      // Map back to inches
      if (selectedImage === 'front') {
        const fx_inches = (newX / scale) - bounds.front.origStartXInches;
        const fy_inches = newY / scale;
        const fw_inches = newW / scale;
        const fh_inches = newH / scale;

        setSettings(prev => ({
          ...prev,
          frontImageX: fx_inches,
          frontImageY: fy_inches,
          frontImageWidth: fw_inches,
          frontImageHeight: fh_inches,
        }));
      } else {
        const bx_inches = newX / scale;
        const by_inches = newY / scale;
        const bw_inches = newW / scale;
        const bh_inches = newH / scale;

        setSettings(prev => ({
          ...prev,
          backImageX: bx_inches,
          backImageY: by_inches,
          backImageWidth: bw_inches,
          backImageHeight: bh_inches,
        }));
      }
    } else if (isDraggingRef.current && selectedImage) {
      const dx = x - dragStartMouseRef.current.x;
      const dy = y - dragStartMouseRef.current.y;
      const start = dragStartImageRef.current;

      const newX = start.x + dx;
      const newY = start.y + dy;

      if (selectedImage === 'front') {
        const fx_inches = (newX / scale) - bounds.front.origStartXInches;
        const fy_inches = newY / scale;

        setSettings(prev => ({
          ...prev,
          frontImageX: fx_inches,
          frontImageY: fy_inches,
        }));
      } else {
        const bx_inches = newX / scale;
        const by_inches = newY / scale;

        setSettings(prev => ({
          ...prev,
          backImageX: bx_inches,
          backImageY: by_inches,
        }));
      }
    } else {
      // 3. Hovering styling cursor
      let cursorStyle = 'default';

      if (selectedImage) {
        const activeBox = selectedImage === 'front' ? bounds.front : bounds.back;
        const handles = {
          TL: { x: activeBox.x, y: activeBox.y },
          TC: { x: activeBox.x + activeBox.w / 2, y: activeBox.y },
          TR: { x: activeBox.x + activeBox.w, y: activeBox.y },
          MR: { x: activeBox.x + activeBox.w, y: activeBox.y + activeBox.h / 2 },
          BR: { x: activeBox.x + activeBox.w, y: activeBox.y + activeBox.h },
          BC: { x: activeBox.x + activeBox.w / 2, y: activeBox.y + activeBox.h },
          BL: { x: activeBox.x, y: activeBox.y + activeBox.h },
          ML: { x: activeBox.x, y: activeBox.y + activeBox.h / 2 },
        };

        let overHandle = false;
        for (const [key, h] of Object.entries(handles)) {
          if (Math.abs(x - h.x) <= 8 && Math.abs(y - h.y) <= 8) {
            overHandle = true;
            if (key === 'TL' || key === 'BR') cursorStyle = 'nwse-resize';
            else if (key === 'TR' || key === 'BL') cursorStyle = 'nesw-resize';
            else if (key === 'ML' || key === 'MR') cursorStyle = 'ew-resize';
            else if (key === 'TC' || key === 'BC') cursorStyle = 'ns-resize';
            break;
          }
        }

        if (!overHandle) {
          if (x >= activeBox.x && x <= activeBox.x + activeBox.w && y >= activeBox.y && y <= activeBox.y + activeBox.h) {
            cursorStyle = 'move';
          }
        }
      }

      // Check hover for unselected images to give a Pointer hint
      if (cursorStyle === 'default') {
        if (frontImgUrl && x >= bounds.front.x && x <= bounds.front.x + bounds.front.w && y >= bounds.front.y && y <= bounds.front.y + bounds.front.h) {
          cursorStyle = 'pointer';
        } else if (backImgUrl && x >= bounds.back.x && x <= bounds.back.x + bounds.back.w && y >= bounds.back.y && y <= bounds.back.y + bounds.back.h) {
          cursorStyle = 'pointer';
        }
      }

      canvas.style.cursor = cursorStyle;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isResizingRef.current = false;
    activeHandleRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getMouseCoords(e);
    const scale = canvas.width / totalFlatWidth;
    const bounds = getImageBounds(scale);

    if (selectedImage) {
      const activeBox = selectedImage === 'front' ? bounds.front : bounds.back;
      const handles = {
        TL: { x: activeBox.x, y: activeBox.y },
        TC: { x: activeBox.x + activeBox.w / 2, y: activeBox.y },
        TR: { x: activeBox.x + activeBox.w, y: activeBox.y },
        MR: { x: activeBox.x + activeBox.w, y: activeBox.y + activeBox.h / 2 },
        BR: { x: activeBox.x + activeBox.w, y: activeBox.y + activeBox.h },
        BC: { x: activeBox.x + activeBox.w / 2, y: activeBox.y + activeBox.h },
        BL: { x: activeBox.x, y: activeBox.y + activeBox.h },
        ML: { x: activeBox.x, y: activeBox.y + activeBox.h / 2 },
      };

      for (const [key, h] of Object.entries(handles)) {
        if (Math.abs(x - h.x) <= 16 && Math.abs(y - h.y) <= 16) { // slightly larger for fingers
          isResizingRef.current = true;
          activeHandleRef.current = key;
          dragStartMouseRef.current = { x, y };
          dragStartImageRef.current = { x: activeBox.x, y: activeBox.y, w: activeBox.w, h: activeBox.h };
          return;
        }
      }
    }

    if (frontImgUrl && x >= bounds.front.x && x <= bounds.front.x + bounds.front.w && y >= bounds.front.y && y <= bounds.front.y + bounds.front.h) {
      setSelectedImage('front');
      isDraggingRef.current = true;
      dragStartMouseRef.current = { x, y };
      dragStartImageRef.current = { x: bounds.front.x, y: bounds.front.y, w: bounds.front.w, h: bounds.front.h };
      return;
    }

    if (backImgUrl && x >= bounds.back.x && x <= bounds.back.x + bounds.back.w && y >= bounds.back.y && y <= bounds.back.y + bounds.back.h) {
      setSelectedImage('back');
      isDraggingRef.current = true;
      dragStartMouseRef.current = { x, y };
      dragStartImageRef.current = { x: bounds.back.x, y: bounds.back.y, w: bounds.back.w, h: bounds.back.h };
      return;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if ((isDraggingRef.current || isResizingRef.current) && selectedImage) {
      if (e.touches && e.touches.length > 0) {
        const fakeEv = {
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
        } as any;
        handleMouseMove(fakeEv);
      }
    }
  };

  const handleResetImageTransform = (type: 'front' | 'back') => {
    if (type === 'front') {
      setSettings(prev => {
        const copy = { ...prev };
        delete copy.frontImageX;
        delete copy.frontImageY;
        delete copy.frontImageWidth;
        delete copy.frontImageHeight;
        return copy;
      });
    } else {
      setSettings(prev => {
        const copy = { ...prev };
        delete copy.backImageX;
        delete copy.backImageY;
        delete copy.backImageWidth;
        delete copy.backImageHeight;
        return copy;
      });
    }
  };

  // Upload state for Mode B (Full wrap)
  const [fullWrapBlob, setFullWrapBlob] = useState<File | null>(null);
  const [fullWrapRatio, setFullWrapRatio] = useState<number>(0);
  const [fullWrapWidthPx, setFullWrapWidthPx] = useState<number>(0);
  const [fullWrapHeightPx, setFullWrapHeightPx] = useState<number>(0);

  // Calculate specifications based on physical binding style rules
  const trimPreset = TRIM_SIZES.find(t => t.id === settings.trimId) || TRIM_SIZES[3];
  const trimWidth = settings.trimId === 'custom' ? settings.customWidth : trimPreset.width;
  const trimHeight = settings.trimId === 'custom' ? settings.customHeight : trimPreset.height;

  const calculatedSpine = calculateSpineWidth(settings.platform, settings.paperColor, settings.pageCount);
  
  // Custom layout geometry specs
  const flapWidth = settings.flapWidth || 3.25;
  let computedBleed = 0.125;
  let totalFlatWidth = 0;
  let totalFlatHeight = 0;

  let backCoverWidthPts = 0;
  let frontCoverWidthPts = 0;

  if (settings.binding === 'hardcover-case') {
    computedBleed = 0.625; // standard turn-in
    totalFlatHeight = trimHeight + 0.25 + (computedBleed * 2);
    totalFlatWidth = (trimWidth * 2) + calculatedSpine + 1.75;
    backCoverWidthPts = trimWidth - 0.125 + computedBleed;
    frontCoverWidthPts = trimWidth - 0.125 + computedBleed;
  } else if (settings.binding === 'hardcover-jacket') {
    computedBleed = 0.125;
    totalFlatHeight = trimHeight + 0.25 + (computedBleed * 2);
    totalFlatWidth = (flapWidth * 2) + ((trimWidth + 0.0625) * 2) + calculatedSpine + (computedBleed * 2);
    backCoverWidthPts = trimWidth + 0.0625;
    frontCoverWidthPts = trimWidth + 0.0625;
  } else {
    computedBleed = 0.125;
    totalFlatHeight = trimHeight + (computedBleed * 2);
    totalFlatWidth = (trimWidth * 2) + calculatedSpine + (computedBleed * 2);
    backCoverWidthPts = trimWidth + computedBleed;
    frontCoverWidthPts = trimWidth + computedBleed;
  }

  // Pixel dimensions recommendations at 300 DPI
  const targetWidthPx = Math.round(totalFlatWidth * 300);
  const targetHeightPx = Math.round(totalFlatHeight * 300);

  // Mode B Upload dimensions handler
  const handleFullWrapUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFullWrapBlob(file);
      const url = URL.createObjectURL(file);
      setFullWrapImgUrl(url);
      const img = new Image();
      img.src = url;
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

    // Helper positions in coordinate pixels
    const flapWidthScale = (settings.binding === 'hardcover-jacket' ? (settings.flapWidth || 3.25) + 0.125 : 0) * scale;
    const backCoverWidthScale = backCoverWidthPts * scale;
    const spineWidthScale = calculatedSpine * scale;
    const frontCoverWidthScale = frontCoverWidthPts * scale;

    const spineStartX = settings.binding === 'hardcover-jacket' 
      ? flapWidthScale + backCoverWidthScale 
      : (settings.binding === 'hardcover-case' ? backCoverWidthScale + 0.375 * scale : backCoverWidthScale);
    const frontStartX = settings.binding === 'hardcover-jacket'
      ? spineStartX + spineWidthScale
      : (settings.binding === 'hardcover-case' ? spineStartX + spineWidthScale + 0.375 * scale : spineStartX + spineWidthScale);

    const bounds = getImageBounds(scale);

    if (settings.mode === 'full') {
      if (fullWrapImgUrl && fullWrapImgRef.current) {
        ctx.drawImage(fullWrapImgRef.current, 0, 0, drawWidth, drawHeight);
      } else {
        ctx.fillStyle = settings.backBgColor;
        ctx.fillRect(0, 0, drawWidth, drawHeight);

        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 15px serif';
        ctx.textAlign = 'center';
        ctx.fillText('[ Full Wrap Spread Artwork Placeholder ]', drawWidth / 2, drawHeight / 2);
      }
    } else {
      ctx.fillStyle = settings.backBgColor;
      ctx.fillRect(0, 0, drawWidth, drawHeight);

      ctx.fillStyle = settings.spineBgColor;
      ctx.fillRect(spineStartX, 0, spineWidthScale, drawHeight);

      // Draw back image if uploaded and loaded
      if (backImgUrl && backImgRef.current) {
        ctx.drawImage(backImgRef.current, bounds.back.x, bounds.back.y, bounds.back.w, bounds.back.h);
      }

      // Draw uploaded front image on front cover if uploaded and loaded
      if (frontImgUrl && frontImgRef.current) {
        ctx.drawImage(frontImgRef.current, bounds.front.x, bounds.front.y, bounds.front.w, bounds.front.h);
      } else if (!frontImgUrl) {
        // Draw placeholder front text
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 15px serif';
        ctx.textAlign = 'center';
        ctx.fillText('[ Front Cover Art Placeholder ]', frontStartX + (frontCoverWidthScale / 2), drawHeight / 2);
      }
    }

    // Draw boundaries guides, secondary overlays, spine rotated text
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
        const leftBound = (settings.binding === 'hardcover-jacket' ? flapWidthScale : 0) + 24;
        const wrapWidth = backCoverWidthScale - 48;

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
      if (settings.showBarcodePlaceholder) {
        const barcodeX = (settings.binding === 'hardcover-jacket' ? flapWidthScale : 0) + 24;
        const hasEan5 = !!settings.barcodePrice;
        const barcodeWidth = hasEan5 ? 110 : 90;
        const barcodeHeight = 55;
        
        drawBarcodeToCanvas(
          ctx,
          barcodeX,
          drawHeight - barcodeHeight - 20,
          barcodeWidth,
          barcodeHeight,
          settings.barcodeISBN || '9781234567897',
          settings.barcodePrice
        );
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
        const bleedPx = computedBleed * scale;

        // Draw Outer Bleed lines
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)'; // Rose color
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        
        // Left Trim Outer boundary
        ctx.strokeRect(bleedPx, bleedPx, drawWidth - (bleedPx * 2), drawHeight - (bleedPx * 2));
        
        // Draw spine safe markers
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'; // Blue color
        ctx.strokeRect(spineStartX, 0, spineWidthScale, drawHeight);

        // If jacket dust cover, draw the flap folds in dotted blue/green!
        if (settings.binding === 'hardcover-jacket') {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)'; // Green color
          ctx.beginPath();
          // Draw Left fold line
          ctx.moveTo(flapWidthScale, 0);
          ctx.lineTo(flapWidthScale, drawHeight);
          // Draw Right fold line
          ctx.moveTo(frontStartX + frontCoverWidthScale, 0);
          ctx.lineTo(frontStartX + frontCoverWidthScale, drawHeight);
          ctx.stroke();

          // Overlay flap labeling
          ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('Left Flap', flapWidthScale / 2, 20);
          ctx.fillText('Right Flap', (frontStartX + frontCoverWidthScale + drawWidth) / 2, 20);
        }

        // Overlay text description
        ctx.fillStyle = 'rgba(220, 38, 38, 0.7)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`← Outer Trim Bleed (${computedBleed.toFixed(3)}")`, bleedPx + 6, bleedPx + 14);

        ctx.fillStyle = 'rgba(37, 99, 235, 0.7)';
        ctx.fillText('Spine Safety Zones', spineStartX + spineWidthScale + 6, drawHeight - 14);
      }

      // Draw Selected Image outline & 8 grab handles
      if (selectedImage && (selectedImage === 'front' ? frontImgUrl : backImgUrl)) {
        const activeBox = selectedImage === 'front' ? bounds.front : bounds.back;

        ctx.strokeStyle = '#6366f1'; // Indigo select border
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(activeBox.x, activeBox.y, activeBox.w, activeBox.h);
        ctx.setLineDash([]); // Reset dash

        // Grab handles (8 coordinates)
        const handleSize = 8;
        const hHalf = handleSize / 2;
        const handles = [
          { x: activeBox.x, y: activeBox.y }, // TL
          { x: activeBox.x + activeBox.w / 2, y: activeBox.y }, // TC
          { x: activeBox.x + activeBox.w, y: activeBox.y }, // TR
          { x: activeBox.x + activeBox.w, y: activeBox.y + activeBox.h / 2 }, // MR
          { x: activeBox.x + activeBox.w, y: activeBox.y + activeBox.h }, // BR
          { x: activeBox.x + activeBox.w / 2, y: activeBox.y + activeBox.h }, // BC
          { x: activeBox.x, y: activeBox.y + activeBox.h }, // BL
          { x: activeBox.x, y: activeBox.y + activeBox.h / 2 }, // ML
        ];

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 1.5;
        for (const h of handles) {
          ctx.fillRect(h.x - hHalf, h.y - hHalf, handleSize, handleSize);
          ctx.strokeRect(h.x - hHalf, h.y - hHalf, handleSize, handleSize);
        }
      }
    }
  }, [
    settings, totalFlatWidth, totalFlatHeight, showGuides, frontImgUrl, backImgUrl,
    frontImgLoaded, backImgLoaded, selectedImage, fullWrapImgUrl, fullWrapImgLoaded
  ]);

  // Handle Cover Downloading
  const triggerDownloadCover = async () => {
    setIsCompiling(true);
    try {
      const pdfBlob = await compileCoverPDF(settings, frontImage, backImage, fullWrapBlob);
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
          {/* AI Creative Assistant Copy studio */}
          <AIAssistant 
            currentBookTitle={settings.spineTitle || ''}
            defaultGenre="Fiction / Novel"
            onApplyBlurb={(text) => {
              setSettings(prev => ({
                ...prev,
                backDescription: text
              }));
            }}
            onApplyBio={(text) => {
              setSettings(prev => ({
                ...prev,
                backAuthorBio: text
              }));
            }}
            onApplyAesthetics={(colors) => {
              setSettings(prev => ({
                ...prev,
                spineBgColor: colors.spineBgColor,
                backBgColor: colors.backBgColor,
                spineTextColor: colors.spineTextColor
              }));
            }}
          />

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
                  <option value="ingram">IngramSpark (All Cover Models)</option>
                  <option value="lulu">Lulu Publisher</option>
                  <option value="d2d">Draft2Digital Print</option>
                </select>
              </div>

              {/* Physical Binding Cover Style Selector */}
              <div>
                <label className="block text-gray-400 font-bold mb-1.5">BINDING &amp; COVER STYLE</label>
                <select 
                  value={settings.binding} 
                  onChange={(e) => setSettings(p => ({ ...p, binding: e.target.value as any }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-700 font-bold"
                >
                  <option value="paperback">Standard Paperback (Perfect Bound)</option>
                  <option value="hardcover-case">Hardcover Case Laminate (Printed Boards)</option>
                  <option value="hardcover-jacket">Hardcover Jacketed (with Dust Jacket Flaps)</option>
                </select>
              </div>

              {settings.binding === 'hardcover-jacket' && (
                <div id="jacket-flap-inputs" className="p-3 bg-indigo-50/50 border border-indigo-100 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-indigo-950 font-bold">UST JACKET FLAP WIDTH (IN)</label>
                    <span className="text-[10px] text-indigo-600 font-mono">Allowed: 2.5" – 5.0"</span>
                  </div>
                  <input 
                    type="number" 
                    step="0.25"
                    min="2.5"
                    max="5.0"
                    value={settings.flapWidth || 3.25} 
                    onChange={(e) => setSettings(p => ({ ...p, flapWidth: parseFloat(e.target.value) || 3.25 }))}
                    className="w-full bg-white border border-indigo-200 rounded p-2 text-indigo-900 font-bold font-mono"
                  />
                  <p className="text-[9px] text-indigo-600 font-sans leading-normal">
                    IngramSpark and major printers recommend 3.25" for books under 8.5" tall, and 3.50" to 4" for taller volumes.
                  </p>
                </div>
              )}

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

                {/* Cover Image Stretching and Position Controls Panel */}
                {(frontImgUrl || backImgUrl) && (
                  <div id="image-transform-controls" className="border border-slate-250 rounded-lg p-4 bg-indigo-50/25 space-y-3.5 font-mono text-[11px] text-slate-700">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-indigo-600 animate-pulse" />
                        COVER ART LAYOUT CONTROLS
                      </span>
                      <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase font-bold">Manual Overrides</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedImage(frontImgUrl ? 'front' : null)}
                        disabled={!frontImgUrl}
                        className={`py-1 px-2.5 rounded text-center border font-bold text-[10px] transition-all cursor-pointer ${
                          selectedImage === 'front' 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        Front Artwork
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedImage(backImgUrl ? 'back' : null)}
                        disabled={!backImgUrl}
                        className={`py-1 px-2.5 rounded text-center border font-bold text-[10px] transition-all cursor-pointer ${
                          selectedImage === 'back' 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        Back Artwork
                      </button>
                    </div>

                    {selectedImage ? (
                      <div className="space-y-3 pt-2.5 border-t border-dashed border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-950 uppercase text-[10px]">
                            {selectedImage === 'front' ? 'FRONT' : 'BACK'} IMAGE PLACEMENT
                          </span>
                          <button
                            type="button"
                            onClick={() => handleResetImageTransform(selectedImage)}
                            className="text-[10px] text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                          >
                            Reset Stretch
                          </button>
                        </div>

                        {/* X and Y positional offsets */}
                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <span className="block text-[9px] text-slate-400 uppercase mb-1 font-bold">X Offset</span>
                            <div className="flex items-center border border-slate-200 rounded overflow-hidden shadow-xs bg-white">
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedImage === 'front') {
                                    setSettings(p => ({ ...p, frontImageX: (p.frontImageX || 0) - 0.05 }));
                                  } else {
                                    setSettings(p => ({ ...p, backImageX: (p.backImageX || 0) - 0.05 }));
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs border-r border-slate-200 font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-full text-center py-1 text-slate-900 font-bold">
                                {selectedImage === 'front' 
                                  ? (settings.frontImageX || 0).toFixed(2) 
                                  : (settings.backImageX || 0).toFixed(2)
                                }"
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedImage === 'front') {
                                    setSettings(p => ({ ...p, frontImageX: (p.frontImageX || 0) + 0.05 }));
                                  } else {
                                    setSettings(p => ({ ...p, backImageX: (p.backImageX || 0) + 0.05 }));
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs border-l border-slate-200 font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="block text-[9px] text-slate-400 uppercase mb-1 font-bold">Y Offset</span>
                            <div className="flex items-center border border-slate-200 rounded overflow-hidden shadow-xs bg-white">
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedImage === 'front') {
                                    setSettings(p => ({ ...p, frontImageY: (p.frontImageY || 0) - 0.05 }));
                                  } else {
                                    setSettings(p => ({ ...p, backImageY: (p.backImageY || 0) - 0.05 }));
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs border-r border-slate-200 font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-full text-center py-1 text-slate-900 font-bold">
                                {selectedImage === 'front' 
                                  ? (settings.frontImageY || 0).toFixed(2) 
                                  : (settings.backImageY || 0).toFixed(2)
                                }"
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedImage === 'front') {
                                    setSettings(p => ({ ...p, frontImageY: (p.frontImageY || 0) + 0.05 }));
                                  } else {
                                    setSettings(p => ({ ...p, backImageY: (p.backImageY || 0) + 0.05 }));
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs border-l border-slate-200 font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Width and height scales */}
                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <span className="block text-[9px] text-slate-400 uppercase mb-1 font-bold">Width</span>
                            <div className="flex items-center border border-slate-200 rounded overflow-hidden shadow-xs bg-white">
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedImage === 'front') {
                                    const currW = settings.frontImageWidth !== undefined ? settings.frontImageWidth : (frontCoverWidthPts / 72);
                                    setSettings(p => ({ ...p, frontImageWidth: Math.max(0.2, currW - 0.1) }));
                                  } else {
                                    const defaultBackW = settings.binding === 'hardcover-jacket' ? (backCoverWidthPts / 72) + (settings.flapWidth || 3.25) + 0.125 : backCoverWidthPts / 72;
                                    const currW = settings.backImageWidth !== undefined ? settings.backImageWidth : defaultBackW;
                                    setSettings(p => ({ ...p, backImageWidth: Math.max(0.2, currW - 0.1) }));
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs border-r border-slate-200 font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-full text-center py-1 text-slate-900 font-bold">
                                {(selectedImage === 'front' 
                                  ? (settings.frontImageWidth !== undefined ? settings.frontImageWidth : (frontCoverWidthPts / 72)) 
                                  : (settings.backImageWidth !== undefined ? settings.backImageWidth : (settings.binding === 'hardcover-jacket' ? (backCoverWidthPts / 72) + (settings.flapWidth || 3.25) + 0.125 : backCoverWidthPts / 72))
                                ).toFixed(2)
                                }"
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedImage === 'front') {
                                    const currW = settings.frontImageWidth !== undefined ? settings.frontImageWidth : (frontCoverWidthPts / 72);
                                    setSettings(p => ({ ...p, frontImageWidth: currW + 0.1 }));
                                  } else {
                                    const defaultBackW = settings.binding === 'hardcover-jacket' ? (backCoverWidthPts / 72) + (settings.flapWidth || 3.25) + 0.125 : backCoverWidthPts / 72;
                                    const currW = settings.backImageWidth !== undefined ? settings.backImageWidth : defaultBackW;
                                    setSettings(p => ({ ...p, backImageWidth: currW + 0.1 }));
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs border-l border-slate-200 font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="block text-[9px] text-slate-400 uppercase mb-1 font-bold">Height</span>
                            <div className="flex items-center border border-slate-200 rounded overflow-hidden shadow-xs bg-white">
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedImage === 'front') {
                                    const currH = settings.frontImageHeight !== undefined ? settings.frontImageHeight : totalFlatHeight;
                                    setSettings(p => ({ ...p, frontImageHeight: Math.max(0.2, currH - 0.1) }));
                                  } else {
                                    const currH = settings.backImageHeight !== undefined ? settings.backImageHeight : totalFlatHeight;
                                    setSettings(p => ({ ...p, backImageHeight: Math.max(0.2, currH - 0.1) }));
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs border-r border-slate-200 font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-full text-center py-1 text-slate-900 font-bold">
                                {(selectedImage === 'front' 
                                  ? (settings.frontImageHeight !== undefined ? settings.frontImageHeight : totalFlatHeight) 
                                  : (settings.backImageHeight !== undefined ? settings.backImageHeight : totalFlatHeight)
                                ).toFixed(2)
                                }"
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedImage === 'front') {
                                    const currH = settings.frontImageHeight !== undefined ? settings.frontImageHeight : totalFlatHeight;
                                    setSettings(p => ({ ...p, frontImageHeight: currH + 0.1 }));
                                  } else {
                                    const currH = settings.backImageHeight !== undefined ? settings.backImageHeight : totalFlatHeight;
                                    setSettings(p => ({ ...p, backImageHeight: currH + 0.1 }));
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs border-l border-slate-200 font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 bg-indigo-50/40 rounded border border-indigo-100/30 text-[10px] text-indigo-700 leading-normal font-sans">
                          <strong>💡 Professional Tip:</strong> You can drag the cover layout or grab any of its 8 corner handles directly on the preview to adjust alignment and size visually!
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-slate-400 py-4 italic border-t border-slate-200 border-dashed text-[10px]">
                        Click on an uploaded image directly in the preview layout to activate interactive drag and stretch handles.
                      </p>
                    )}
                  </div>
                )}

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

                {/* Options & Live Barcode Generator */}
                <div id="barcode-controls-block" className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="barcode-checkbox"
                      checked={settings.showBarcodePlaceholder} 
                      onChange={(e) => setSettings(p => ({ ...p, showBarcodePlaceholder: e.target.checked }))}
                      className="accent-indigo-600"
                    />
                    <label htmlFor="barcode-checkbox" className="text-xs text-slate-700 font-bold uppercase tracking-wider cursor-pointer">
                      GENERATE ISBN &amp; PRICE BARCODE
                    </label>
                  </div>

                  {settings.showBarcodePlaceholder && (
                    <div className="p-3.5 bg-indigo-50/30 border border-indigo-100/50 rounded-lg space-y-3 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wider">ISBN Number (10 or 13)</label>
                          <input 
                            type="text"
                            value={settings.barcodeISBN || ''}
                            onChange={(e) => setSettings(p => ({ ...p, barcodeISBN: e.target.value }))}
                            placeholder="e.g. 9781234567897"
                            className="w-full bg-white border border-slate-200 rounded p-1.5 font-bold font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Price USD ($)</label>
                          <input 
                            type="text"
                            value={settings.barcodePrice || ''}
                            onChange={(e) => setSettings(p => ({ ...p, barcodePrice: e.target.value }))}
                            placeholder="e.g. 19.99 (EAN-5 code)"
                            className="w-full bg-white border border-slate-200 rounded p-1.5 font-bold font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                        Any 10-digit ISBN is upgraded to ISBN-13. An optional EAN-5 price addon will auto-append to standard publishing specs if a USD price is specified.
                      </p>
                    </div>
                  )}
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
            <div className="w-full max-w-full overflow-auto bg-slate-900/5 p-4 rounded-lg flex justify-center select-none">
              <canvas 
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                className="max-w-full shadow-lg border border-gray-300 rounded overflow-hidden select-none touch-none bg-slate-200"
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
