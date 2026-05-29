/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, rgb, StandardFonts, PDFFont, degrees } from 'pdf-lib';
import { PlatformId, TrimSizeId, CoverSettings, InteriorSettings, Chapter } from '../types';
import { PLATFORMS, TRIM_SIZES, FONTS_LIST } from './presets';
import { getBarcodeData } from './barcodeGenerator';

// Helper: convert inches to points
export const inchesToPts = (inches: number) => inches * 72;

// Helper: approximate the width of a string in a serif font
export function measureTextSerifApprox(text: string, fontSize: number): number {
  let relativeWidthSum = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const charCode = text.charCodeAt(i);
    
    // Average character width relative to 1000
    let w = 500; 
    
    if (charCode >= 97 && charCode <= 122) { // lowercase a-z
      const lowercaseWidths: Record<string, number> = {
        a: 480, b: 500, c: 444, d: 500, e: 444, f: 333, g: 500, h: 500, i: 278, j: 278,
        k: 500, l: 278, m: 778, n: 500, o: 500, p: 500, q: 500, r: 333, s: 389, t: 278,
        u: 500, v: 500, w: 722, x: 500, y: 500, z: 444
      };
      w = lowercaseWidths[char] || 480;
    } else if (charCode >= 65 && charCode <= 90) { // uppercase A-Z
      const uppercaseWidths: Record<string, number> = {
        A: 722, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 778, I: 389, J: 389,
        K: 722, L: 611, M: 889, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 556, T: 667,
        U: 722, V: 722, W: 944, X: 722, Y: 722, Z: 611
      };
      w = uppercaseWidths[char] || 700;
    } else if (charCode >= 48 && charCode <= 57) { // numbers 0-9
      w = 500;
    } else { // punctuation / spaces
      const specialWidths: Record<string, number> = {
        ' ': 250, '.': 250, ',': 250, ';': 250, ':': 250, '!': 333, '?': 444,
        '-': 333, '(': 333, ')': 333, '"': 400, "'": 250, '/': 400
      };
      w = specialWidths[char] || 350;
    }
    
    relativeWidthSum += w;
  }
  
  return (relativeWidthSum / 1000) * fontSize;
}

// Helper: Calculate exact drop cap offset based on character and height
export function getDropCapOffset(char: string, fontSize: number, numLines: number, leading: number): number {
  const dcFontSize = leading * numLines * 1.05;
  const charUpper = char.toUpperCase();
  let relWidth = 667; // default average
  if (charUpper === 'W') relWidth = 944;
  else if (charUpper === 'M') relWidth = 889;
  else if (charUpper === 'O' || charUpper === 'G' || charUpper === 'Q' || charUpper === 'D' || charUpper === 'H' || charUpper === 'U' || charUpper === 'N') relWidth = 722;
  else if (charUpper === 'C' || charUpper === 'K' || charUpper === 'R' || charUpper === 'A' || charUpper === 'B' || charUpper === 'E') relWidth = 667;
  else if (charUpper === 'F' || charUpper === 'P' || charUpper === 'T' || charUpper === 'V' || charUpper === 'X') relWidth = 611;
  else if (charUpper === 'S' || charUpper === 'L' || charUpper === 'Y' || charUpper === 'Z') relWidth = 556;
  else if (charUpper === 'J') relWidth = 389;
  else if (charUpper === 'I') relWidth = 333;

  const exactWidth = dcFontSize * (relWidth / 1000);
  return Math.ceil(exactWidth + 1.5);
}

// Helper: convert hex string to rgb color vector
export const hexToColorVec = (hex: string) => {
  if (!hex || hex.charAt(0) !== '#') return rgb(0, 0, 0);
  const cleanHex = hex.trim();
  const r = parseInt(cleanHex.substring(1, 3), 16) / 255;
  const g = parseInt(cleanHex.substring(3, 5), 16) / 255;
  const b = parseInt(cleanHex.substring(5, 7), 16) / 255;
  return rgb(r, g, b);
};

// Helper: Calculate Spine Width for Covers
export function calculateSpineWidth(platformId: PlatformId, paperColor: 'white' | 'cream' | 'color', pageCount: number): number {
  const platform = PLATFORMS[platformId];
  if (!platform) return 0;
  const multiplier = platform.spineFormula[paperColor] || platform.spineFormula.white;
  return pageCount * multiplier;
}

// Interfaces for structured layout lines and pages
export interface LayoutLine {
  text: string;
  isHeading: boolean;
  isOrnament?: boolean;
  align?: 'left' | 'center' | 'fancy-frame';
  isFancyFrame?: boolean;
  isFancyFrameTop?: boolean;
  dropCapChar?: string;
  dropCapLinesCount?: number;
  dropCapColor?: string;
  dropCapOffset?: number;
  
  // High-fidelity source tracking for interactive document editing
  chapId?: string;
  pIdx?: number;
  isTitle?: boolean;
  isLastLineOfParagraph?: boolean;
  isItalic?: boolean;
  isDedication?: boolean;
}

export interface LayoutPage {
  pageNumber: number;
  chapterTitle?: string;
  lines: LayoutLine[];
  isImagePage?: boolean;
  imageObj?: any;
  inlineImageTop?: any;
  inlineImageBottom?: any;
}

export function sanitizeForWinAnsi(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u201c\u201d]/g, '"') // double quotes “”
    .replace(/[\u2018\u2019]/g, "'") // single quotes ‘’
    .replace(/\u2014/g, '--')       // em-dash —
    .replace(/\u2013/g, '-')        // en-dash –
    .replace(/\u2026/g, '...')      // ellipsis …
    .replace(/\r?\n/g, ' ')         // newline to space
    .replace(/\t/g, ' ')            // tab to space
    .replace(/[^\x00-\xFF]/g, (char) => {
      const charCode = char.charCodeAt(0);
      if (charCode === 0x200B || charCode === 0xFEFF) return ''; // zero-width spaces
      if (charCode === 0x00A0) return ' '; // non-breaking space
      return '?'; // fallback for unsupported higher unicode
    });
}

/**
 * Super lightweight book typesetter.
 * Receives the settings and structured chapters, wraps text, and packs lines into mirror-margined print-ready pages.
 */
export function typesetManuscript(
  chapters: Chapter[],
  settings: InteriorSettings,
  charWidthApprox: number = 0.42, // approximation helper when measuring text offline / canvas
  interiorImages?: any[]
): LayoutPage[] {
  const trimSize = TRIM_SIZES.find(t => t.id === settings.trimId) || TRIM_SIZES[3]; // default 6x9
  const widthInches = trimSize.id === 'custom' ? settings.customWidth : trimSize.width;
  const heightInches = trimSize.id === 'custom' ? settings.customHeight : trimSize.height;

  const widthPts = inchesToPts(widthInches);
  const heightPts = inchesToPts(heightInches);

  // Layout parameters
  const bodySize = settings.bodyFontSize;
  const leading = bodySize * settings.lineSpacing;
  const h1Size = bodySize * 1.8;
  const h1Leading = h1Size * 1.3;

  const pagesList: LayoutPage[] = [];
  let pageNumber = 1;

  // Title Page & Copyright Page if included - formatted to avoid newline \n insertion
  if (settings.includeTitlePage) {
    const titleLines: LayoutLine[] = [];
    // Spacer lines represented by empty strings
    for (let i = 0; i < 4; i++) {
      titleLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
    }
    titleLines.push({ text: settings.bookTitle.toUpperCase(), isHeading: true, align: 'center', isLastLineOfParagraph: true });
    
    if (settings.bookSubtitle) {
      titleLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
      titleLines.push({ text: settings.bookSubtitle, isHeading: false, align: 'center', isLastLineOfParagraph: true });
    }
    
    for (let i = 0; i < 3; i++) {
      titleLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
    }
    titleLines.push({ text: 'BY', isHeading: false, align: 'center', isLastLineOfParagraph: true });
    titleLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
    titleLines.push({ text: settings.authorName.toUpperCase(), isHeading: false, align: 'center', isLastLineOfParagraph: true });
    
    for (let i = 0; i < 6; i++) {
      titleLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
    }
    if (settings.publisherName) {
      titleLines.push({ text: settings.publisherName, isHeading: false, align: 'center', isLastLineOfParagraph: true });
    }

    pagesList.push({
      pageNumber: pageNumber++,
      lines: titleLines
    });
  }

  if (settings.includeCopyrightPage) {
    const copyrightLines: LayoutLine[] = [];
    copyrightLines.push({ text: 'COPYRIGHT PAGE', isHeading: true, align: 'center', isLastLineOfParagraph: true });
    copyrightLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
    copyrightLines.push({ 
      text: `Copyright © ${settings.copyrightYear || '2026'} by ${settings.authorName || 'Author'}.`, 
      isHeading: false,
      align: 'center',
      isLastLineOfParagraph: true
    });
    copyrightLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
    
    // Wrap copyright text nicely
    const contentWidthPts = widthPts - inchesToPts(settings.insideMargin) - inchesToPts(settings.outsideMargin);
    const textToWrap = 'All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.';
    const wrappedCopyright = wrapParagraph_internal(textToWrap, contentWidthPts);
    
    for (let li = 0; li < wrappedCopyright.length; li++) {
      copyrightLines.push({ 
        text: wrappedCopyright[li], 
        isHeading: false,
        align: 'center',
        isLastLineOfParagraph: li === wrappedCopyright.length - 1 
      });
    }
    
    if (settings.isbn) {
      copyrightLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
      copyrightLines.push({ text: `ISBN: ${settings.isbn}`, isHeading: false, align: 'center', isLastLineOfParagraph: true });
    }
    
    copyrightLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
    copyrightLines.push({ text: `Published by ${settings.publisherName || 'PublishingForge Printer'}`, isHeading: false, align: 'center', isLastLineOfParagraph: true });

    pagesList.push({
      pageNumber: pageNumber++,
      lines: copyrightLines
    });
  }

  // Dedication Page typesetting
  if (settings.includeDedicationPage && settings.dedicationText) {
    const dedicationLines: LayoutLine[] = [];
    const contentWidthPts = widthPts - inchesToPts(settings.insideMargin) - inchesToPts(settings.outsideMargin);
    
    // Wrap paragraph text elegantly (using a slightly narrow column width ratio for visual balance)
    const wrappedDediLines = wrapParagraph_internal(settings.dedicationText, contentWidthPts * 0.82);
    
    // Position vertically: push to upper-middle (about 38% down the page)
    const bodySizeVal = settings.bodyFontSize;
    const leadingVal = bodySizeVal * settings.lineSpacing;
    const approxLinesPerPage = Math.floor((heightPts - inchesToPts(settings.topMargin) - inchesToPts(settings.bottomMargin) - 50) / leadingVal);
    const topPaddingLines = Math.max(3, Math.floor((approxLinesPerPage - wrappedDediLines.length) * 0.38));
    
    for (let s = 0; s < topPaddingLines; s++) {
      dedicationLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
    }
    
    // Top Ornaments
    if (settings.dedicationStyle === 'fancy') {
      let topOrnament = '❦';
      if (settings.chapterOrnament === 'triple-star') topOrnament = '✦   ✦   ✦';
      else if (settings.chapterOrnament === 'floral-leaf') topOrnament = '❦   ❊   ❦';
      else if (settings.chapterOrnament === 'divider-bar') topOrnament = '═══ ❃ ═══';
      dedicationLines.push({ text: topOrnament, isHeading: false, isOrnament: true, align: 'center', isLastLineOfParagraph: true });
      dedicationLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
    }
    
    for (let dli = 0; dli < wrappedDediLines.length; dli++) {
      dedicationLines.push({
        text: wrappedDediLines[dli],
        isHeading: false,
        align: 'center',
        isItalic: true,
        isDedication: true,
        isLastLineOfParagraph: dli === wrappedDediLines.length - 1
      });
    }
    
    // Bottom Ornaments
    if (settings.dedicationStyle === 'fancy') {
      dedicationLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
      dedicationLines.push({ text: '❧', isHeading: false, isOrnament: true, align: 'center', isLastLineOfParagraph: true });
    } else if (settings.dedicationStyle === 'poetic') {
      dedicationLines.push({ text: '', isHeading: false, align: 'center', isLastLineOfParagraph: true });
      dedicationLines.push({ text: '❦   ❦   ❦', isHeading: false, isOrnament: true, align: 'center', isLastLineOfParagraph: true });
    }
    
    pagesList.push({
      pageNumber: pageNumber++,
      lines: dedicationLines
    });
  }

  // Helper to split paragraph text into wrap-compliant lines based on page width
  function wrapParagraph_internal(text: string, maxWidthPts: number, isH1: boolean = false): string[] {
    const fontSize = isH1 ? h1Size : bodySize;
    const words = text.split(/\s+/);
    const linesStr: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const spacing = currentLine ? ' ' : '';
      const testLine = currentLine + spacing + word;
      const testWidth = measureTextSerifApprox(testLine, fontSize);
      if (testWidth > maxWidthPts && currentLine) {
        linesStr.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      linesStr.push(currentLine);
    }
    return linesStr;
  }

  // TYPESETTING LOOP FOR EACH CHAPTER
  for (const chap of chapters) {
    let currentLines: LayoutLine[] = [];

    // H1 Chapter header alignment and wrapping
    const alignStyle = settings.chapterTitleAlign || 'center';
    const headingText = alignStyle === 'fancy-frame' ? `[ ${chap.title.toUpperCase()} ]` : chap.title;
    const defaultInsideM = inchesToPts(settings.insideMargin);
    const defaultOutsideM = inchesToPts(settings.outsideMargin);
    const contentWidthPts = widthPts - defaultInsideM - defaultOutsideM;
    const wrappedHeaderLines = wrapParagraph_internal(headingText, contentWidthPts, true);

    for (let hli = 0; hli < wrappedHeaderLines.length; hli++) {
      currentLines.push({ 
        text: wrappedHeaderLines[hli], 
        isHeading: true,
        align: alignStyle === 'fancy-frame' ? 'center' : alignStyle,
        isFancyFrame: alignStyle === 'fancy-frame' && hli === wrappedHeaderLines.length - 1,
        isFancyFrameTop: alignStyle === 'fancy-frame' && hli === 0,
        chapId: chap.id,
        isTitle: true
      });
    }

    if (settings.showOrnament && settings.chapterOrnament !== 'none') {
      let ornamentText = '✦   ✦   ✦';
      if (settings.chapterOrnament === 'floral-leaf') {
        ornamentText = '❦   ❊   ❦';
      } else if (settings.chapterOrnament === 'divider-bar') {
        ornamentText = '═════════ ❃ ═════════';
      }
      currentLines.push({ text: ornamentText, isHeading: false, isOrnament: true });
    }

    // Find the actual first body paragraph to apply the drop cap (heuristic)
    let dropCapPIdx = -1;
    if (settings.showDropCap) {
      for (let i = 0; i < chap.paragraphs.length; i++) {
        const text = chap.paragraphs[i].trim();
        if (!text) continue;
        // Search for a paragraph that has at least 8 words and 40 characters (excluding brief subtitles / metadata)
        if (text.split(/\s+/).length >= 8 && text.length >= 40) {
          dropCapPIdx = i;
          break;
        }
      }
      // Fallback: if no paragraph meets the body criteria, use the first non-empty paragraph
      if (dropCapPIdx === -1) {
        for (let i = 0; i < chap.paragraphs.length; i++) {
          if (chap.paragraphs[i].trim()) {
            dropCapPIdx = i;
            break;
          }
        }
      }
    }

    // Process paragraphs
    for (let pIdx = 0; pIdx < chap.paragraphs.length; pIdx++) {
      let pText = chap.paragraphs[pIdx];
      if (!pText.trim()) continue;

      const isOdd = pageNumber % 2 !== 0;
      const insideM = inchesToPts(settings.insideMargin);
      const outsideM = inchesToPts(settings.outsideMargin);
      const activeLeftMargin = isOdd ? insideM : outsideM;
      const activeRightMargin = isOdd ? outsideM : insideM;
      const contentWidthPts = widthPts - activeLeftMargin - activeRightMargin;

      // Drop Cap typesetting
      if (pIdx === dropCapPIdx && settings.showDropCap && pText.trim().length > 0) {
        const rawTrimmed = pText.trim();
        const dropCapChar = rawTrimmed.charAt(0);
        const pRestText = rawTrimmed.slice(1);
        const dropCapLinesCount = settings.dropCapLines || 3;
        
        // Exact glyph-based drop cap spacing calculation
        const dropCapOffsetVal = getDropCapOffset(dropCapChar, bodySize, dropCapLinesCount, leading);
        
        // Wrap drop-cap paragraph with alternating margins
        const wrappedLines: string[] = [];
        const words = pRestText.split(/\s+/);
        let currentLine = '';

        for (const word of words) {
          const spacing = currentLine ? ' ' : '';
          const testLine = currentLine + spacing + word;
          const isIndentedRow = wrappedLines.length < dropCapLinesCount;
          const activeMaxWidth = isIndentedRow ? (contentWidthPts - dropCapOffsetVal) : contentWidthPts;
          const testWidth = measureTextSerifApprox(testLine, bodySize);

          if (testWidth > activeMaxWidth && currentLine) {
            wrappedLines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          wrappedLines.push(currentLine);
        }

        // Push wrapped lines
        for (let li = 0; li < wrappedLines.length; li++) {
          const isIndentedRow = li < dropCapLinesCount;
          currentLines.push({
            text: wrappedLines[li],
            isHeading: false,
            isLastLineOfParagraph: li === wrappedLines.length - 1,
            dropCapChar: li === 0 ? dropCapChar : undefined,
            dropCapOffset: isIndentedRow ? dropCapOffsetVal : undefined,
            dropCapLinesCount: dropCapLinesCount,
            dropCapColor: settings.dropCapColor || '#4f46e5',
            chapId: chap.id,
            pIdx: pIdx
          });
        }
      } else {
        // Ordinary paragraph layout logic
        const isMetadata = dropCapPIdx !== -1 && pIdx < dropCapPIdx; // Centered subtitle or location metadata lines!
        const shouldIndent = settings.paragraphStyle === 'indent' && pIdx > 0 && !isMetadata;
        const displayPrefix = shouldIndent ? '      ' : ''; // indent approximation
        const textToWrap = displayPrefix + pText;
        const wrappedLines = wrapParagraph_internal(textToWrap, contentWidthPts, false);

        for (let li = 0; li < wrappedLines.length; li++) {
          currentLines.push({ 
            text: wrappedLines[li], 
            isHeading: false,
            isLastLineOfParagraph: li === wrappedLines.length - 1,
            align: isMetadata ? 'center' : 'left', // Center metadata!
            isItalic: isMetadata, // Make metadata italic for classic literary elegance!
            chapId: chap.id,
            pIdx: pIdx
          });
        }
      }

      // Add a spacer line if block spacing is selected
      if (settings.paragraphStyle === 'block') {
        currentLines.push({ 
          text: '', 
          isHeading: false,
          isLastLineOfParagraph: true,
          chapId: chap.id,
          pIdx: pIdx
        });
      }
    }

    // Pack layout lines into physical pages
    const topM = inchesToPts(settings.topMargin);
    const bottomM = inchesToPts(settings.bottomMargin);

    let activePageLines: LayoutLine[] = [];
    let currentHeightSum = 0;

    for (let i = 0; i < currentLines.length; i++) {
      const line = currentLines[i];
      const isChapterStartPage = line.isHeading && line.isTitle && activePageLines.length === 0;
      const chapterHeaderDrop = isChapterStartPage ? (heightPts * 0.14) : 0;
      const lineSpacing = line.isHeading ? h1Leading : leading;

      const hasTopImg = (interiorImages || []).some(img => img.pageNumber === pageNumber && img.layout === 'top');
      const hasBottomImg = (interiorImages || []).some(img => img.pageNumber === pageNumber && img.layout === 'bottom');
      const overheadHeight = (hasTopImg ? 130 : 0) + (hasBottomImg ? 130 : 0);
      let availableHeightPts = heightPts - topM - bottomM - 36 - overheadHeight;
      if (isChapterStartPage) {
        availableHeightPts -= chapterHeaderDrop;
      }

      if (currentHeightSum + lineSpacing > availableHeightPts) {
        pagesList.push({
          pageNumber: pageNumber++,
          chapterTitle: chap.title,
          lines: activePageLines
        });
        activePageLines = [];
        currentHeightSum = 0;
      }

      if (line.isHeading && settings.chapterStartNewPage && activePageLines.length > 0) {
        pagesList.push({
          pageNumber: pageNumber++,
          chapterTitle: chap.title,
          lines: activePageLines
        });
        activePageLines = [];
        currentHeightSum = 0;
      }

      activePageLines.push(line);
      currentHeightSum += lineSpacing;
    }

    if (activePageLines.length > 0) {
      pagesList.push({
        pageNumber: pageNumber++,
        chapterTitle: chap.title,
        lines: activePageLines
      });
    }
  }

  // Colophon & Printer's Mark typesetting (traditionally at the tail-end of premium publications)
  if (settings.includeColophonPage && settings.colophonText) {
    const colophonLines: LayoutLine[] = [];
    const contentWidthPts = widthPts - inchesToPts(settings.insideMargin) - inchesToPts(settings.outsideMargin);
    
    // Wrap paragraph text elegantly (using a narrow column width ratio for visual delicacy)
    const wrappedColLines = wrapParagraph_internal(settings.colophonText, contentWidthPts * 0.78);
    
    // Position vertically: push to lower-middle (about 52% down the page)
    const bodySizeVal = settings.bodyFontSize;
    const leadingVal = bodySizeVal * settings.lineSpacing;
    const approxLinesPerPage = Math.floor((heightPts - inchesToPts(settings.topMargin) - inchesToPts(settings.bottomMargin) - 50) / leadingVal);
    const topPaddingLines = Math.max(3, Math.floor((approxLinesPerPage - wrappedColLines.length) * 0.52));
    
    for (let s = 0; s < topPaddingLines; s++) {
      colophonLines.push({ text: '', isHeading: false });
    }
    
    // Beautiful header
    colophonLines.push({ text: 'COLOPHON', isHeading: false, isOrnament: true, align: 'center' });
    colophonLines.push({ text: '', isHeading: false });
    
    for (const cLine of wrappedColLines) {
      colophonLines.push({
        text: cLine,
        isHeading: false,
        align: 'center',
        isItalic: false,
        isDedication: true // flag isDedication to center and use secondary aesthetic text
      });
    }
    
    colophonLines.push({ text: '', isHeading: false });
    colophonLines.push({ text: '❧   ❦   ❧', isHeading: false, isOrnament: true, align: 'center' });
    
    pagesList.push({
      pageNumber: pageNumber++,
      lines: colophonLines
    });
  }

  // Post-process full-page images
  const fullPageImages = (interiorImages || [])
    .filter(img => img.layout === 'full-page')
    .sort((a, b) => a.pageNumber - b.pageNumber);

  for (const img of fullPageImages) {
    const targetIndex = Math.min(pagesList.length, Math.max(0, img.pageNumber - 1));
    pagesList.splice(targetIndex, 0, {
      pageNumber: 0, // reassigned below
      chapterTitle: 'Illustration',
      isImagePage: true,
      imageObj: img,
      lines: []
    });
  }

  // Re-assign logical/physical page numbers
  pagesList.forEach((p, idx) => {
    p.pageNumber = idx + 1;
  });

  // Attach inline images based on the finalized page numbers
  const inlineImages = (interiorImages || []).filter(img => img.layout !== 'full-page');
  for (const img of inlineImages) {
    const page = pagesList.find(p => p.pageNumber === img.pageNumber);
    if (page) {
      if (img.layout === 'top') {
        page.inlineImageTop = img;
      } else if (img.layout === 'bottom') {
        page.inlineImageBottom = img;
      }
    }
  }

  return pagesList;
}

/**
 * Fetch font helper from CDN
 */
export async function fetchFontAsUint8(url: string): Promise<Uint8Array> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to load font from URL ${url}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
export async function compileCoverPDF(
  settings: CoverSettings, 
  coverImageBlob: Blob | null, 
  backImageBlob: Blob | null,
  fullWrapBlob?: Blob | null
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  
  const trimSize = TRIM_SIZES.find(t => t.id === settings.trimId) || TRIM_SIZES[3];
  const trimWidth = trimSize.id === 'custom' ? settings.customWidth : trimSize.width;
  const trimHeight = trimSize.id === 'custom' ? settings.customHeight : trimSize.height;

  // spine width in inches
  const spineWidth = calculateSpineWidth(settings.platform, settings.paperColor, settings.pageCount);
  
  let totalWidthPts = 0;
  let totalHeightPts = 0;

  // Sheet and offset specifications based on physical layout bounds
  let flapWidthPts = 0;
  let backCoverWidthPts = 0;
  let spineWidthPts = inchesToPts(spineWidth);
  let frontCoverWidthPts = 0;

  let leftEdgePts = 0;
  let spineLeftPts = 0;
  let frontLeftPts = 0;

  if (settings.binding === 'hardcover-case') {
    // Case Laminate Hardcover: Board extensions adding 0.25", and wrap bleeds of 0.625" (5/8") all around
    const wrap = 0.625;
    totalHeightPts = inchesToPts(trimHeight + 0.25 + (wrap * 2));
    totalWidthPts = inchesToPts((trimWidth * 2) + spineWidth + 1.75);

    backCoverWidthPts = inchesToPts(trimWidth - 0.125 + wrap);
    const jointPts = inchesToPts(0.375);
    spineLeftPts = backCoverWidthPts + jointPts;
    frontLeftPts = spineLeftPts + spineWidthPts + jointPts;
    frontCoverWidthPts = inchesToPts(trimWidth - 0.125 + wrap);
  } else if (settings.binding === 'hardcover-jacket') {
    // Jacketed Hardcover Dust Cover: Left Flap + Back Cover + Spine + Front Cover + Right Flap + 0.125" bleed
    const flapWidth = settings.flapWidth || 3.25;
    const bleed = 0.125;
    totalHeightPts = inchesToPts(trimHeight + 0.25 + (bleed * 2));
    totalWidthPts = inchesToPts((flapWidth * 2) + ((trimWidth + 0.0625) * 2) + spineWidth + (bleed * 2));

    flapWidthPts = inchesToPts(flapWidth + bleed);
    backCoverWidthPts = inchesToPts(trimWidth + 0.0625);
    spineLeftPts = flapWidthPts + backCoverWidthPts;
    frontLeftPts = spineLeftPts + spineWidthPts;
    frontCoverWidthPts = inchesToPts(trimWidth + 0.0625);
  } else {
    // Paperback (default)
    const bleed = 0.125;
    totalHeightPts = inchesToPts(trimHeight + (bleed * 2));
    totalWidthPts = inchesToPts((trimWidth * 2) + spineWidth + (bleed * 2));

    backCoverWidthPts = inchesToPts(trimWidth + bleed);
    spineLeftPts = backCoverWidthPts;
    frontLeftPts = spineLeftPts + spineWidthPts;
    frontCoverWidthPts = inchesToPts(trimWidth + bleed);
  }

  const page = pdfDoc.addPage([totalWidthPts, totalHeightPts]);

  // Fill background
  const backBg = hexToColorVec(settings.backBgColor);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: totalWidthPts,
    height: totalHeightPts,
    color: backBg,
  });

  if (settings.mode === 'front') {
    // Specifically paint spine
    const spineBg = hexToColorVec(settings.spineBgColor);
    page.drawRectangle({
      x: spineLeftPts,
      y: 0,
      width: spineWidthPts,
      height: totalHeightPts,
      color: spineBg,
    });

    // Embedded image processing for front cover
    if (coverImageBlob) {
      const imgBytes = await coverImageBlob.arrayBuffer();
      let embedImg;
      if (coverImageBlob.type === 'image/png') {
        embedImg = await pdfDoc.embedPng(imgBytes);
      } else {
        embedImg = await pdfDoc.embedJpg(imgBytes);
      }
      
      const fx = settings.frontImageX !== undefined ? inchesToPts(settings.frontImageX) : 0;
      const fy = settings.frontImageY !== undefined ? inchesToPts(settings.frontImageY) : 0;
      const fWidth = settings.frontImageWidth !== undefined ? inchesToPts(settings.frontImageWidth) : frontCoverWidthPts;
      const fHeight = settings.frontImageHeight !== undefined ? inchesToPts(settings.frontImageHeight) : totalHeightPts;

      page.drawImage(embedImg, {
        x: frontLeftPts + fx,
        y: totalHeightPts - (fy + fHeight),
        width: fWidth,
        height: fHeight,
      });
    }

    // Embedded optional back cover image
    if (backImageBlob) {
      const imgBytes = await backImageBlob.arrayBuffer();
      const embedBackImg = backImageBlob.type === 'image/png' 
        ? await pdfDoc.embedPng(imgBytes) 
        : await pdfDoc.embedJpg(imgBytes);
      
      const bx = settings.backImageX !== undefined ? inchesToPts(settings.backImageX) : 0;
      const by = settings.backImageY !== undefined ? inchesToPts(settings.backImageY) : 0;
      const defaultBackWidth = settings.binding === 'hardcover-jacket' ? backCoverWidthPts + flapWidthPts : backCoverWidthPts;
      const bWidth = settings.backImageWidth !== undefined ? inchesToPts(settings.backImageWidth) : defaultBackWidth;
      const bHeight = settings.backImageHeight !== undefined ? inchesToPts(settings.backImageHeight) : totalHeightPts;

      page.drawImage(embedBackImg, {
        x: bx,
        y: totalHeightPts - (by + bHeight),
        width: bWidth,
        height: bHeight,
      });
    }

    // Draw spine text (Rotate 270 degrees clockwise or 90 degrees counter-clockwise)
    if (settings.spineTitle && spineWidth >= 0.25) {
      const font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const titleText = settings.spineTitle.toUpperCase();
      const authorText = settings.spineAuthor ? ` — ${settings.spineAuthor}` : '';
      const fullText = sanitizeForWinAnsi(titleText + authorText);

      // Center along vertical height
      const spineClientFontSize = settings.spineFontSize || 10;
      const textWidth = font.widthOfTextAtSize(fullText, spineClientFontSize);
      const startY = (totalHeightPts + textWidth) / 2; // Center centered
      const startX = spineLeftPts + (spineWidthPts / 2) - (spineClientFontSize * 0.35); // Center aligned spine

      page.drawText(fullText, {
        x: startX,
        y: startY,
        size: spineClientFontSize,
        font: font,
        color: hexToColorVec(settings.spineTextColor),
        rotate: degrees(-90), // Rotated spine text
      });
    }

    // Draw description synopsis
    if (settings.backDescription) {
      const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const textColor = hexToColorVec(settings.backTextColor);
      const backCoverContentStartX = settings.binding === 'hardcover-jacket' ? flapWidthPts + inchesToPts(0.6) : inchesToPts(0.6);

      const sanitizedBackDesc = sanitizeForWinAnsi(settings.backDescription);
      const synWords = sanitizedBackDesc.split(' ');
      let currentLine = '';
      let yOffset = totalHeightPts - inchesToPts(0.8);
      const startX = backCoverContentStartX;
      const maxWidth = backCoverWidthPts - inchesToPts(1.2);

      for (const w of synWords) {
        const test = currentLine ? currentLine + ' ' + w : w;
        if (timesRoman.widthOfTextAtSize(test, 10) > maxWidth) {
          page.drawText(currentLine, { x: startX, y: yOffset, size: 10, font: timesRoman, color: textColor });
          yOffset -= 15;
          currentLine = w;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) {
        page.drawText(currentLine, { x: startX, y: yOffset, size: 10, font: timesRoman, color: textColor });
      }
    }
  } else if (settings.mode === 'full' && fullWrapBlob) {
    // Embedded image processing for full precomposed wrap spread
    const imgBytes = await fullWrapBlob.arrayBuffer();
    const embedFullImg = fullWrapBlob.type === 'image/png' 
      ? await pdfDoc.embedPng(imgBytes) 
      : await pdfDoc.embedJpg(imgBytes);

    page.drawImage(embedFullImg, {
      x: 0,
      y: 0,
      width: totalWidthPts,
      height: totalHeightPts,
    });
  }

  // Draw barcode space (Common to both modes)
  if (settings.showBarcodePlaceholder) {
    const barcodeX = settings.binding === 'hardcover-jacket' ? flapWidthPts + inchesToPts(0.6) : inchesToPts(0.6);
    
    try {
      const bd = getBarcodeData(settings.barcodeISBN || '9781234567897', settings.barcodePrice);
      const hasEan5 = bd.ean5Modules !== null;
      const numModules = hasEan5 ? 151 : 95;

      // Draw background white box
      const barcodeW = hasEan5 ? 120 : 96;
      const barcodeH = 60;

      page.drawRectangle({
        x: barcodeX,
        y: inchesToPts(0.6),
        width: barcodeW,
        height: barcodeH,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });

      const padX = barcodeW * 0.05;
      const padY = barcodeH * 0.06;
      const drawW = barcodeW - (padX * 2);
      const drawH = barcodeH - (padY * 2);
      const mWidth = drawW / numModules;

      const guardYEnd = inchesToPts(0.6) + padY + 8; // leaves 8pt from bottom margin for text
      const barYEnd = inchesToPts(0.6) + padY + 12;

      const topY = inchesToPts(0.6) + padY + drawH;

      // Draw EAN13 bars
      for (let i = 0; i < bd.ean13Modules.length; i++) {
        if (bd.ean13Modules.charAt(i) === '1') {
          const isGuard = i < 3 || (i >= 45 && i < 50) || i >= 92;
          const barEndY = isGuard ? guardYEnd : barYEnd;
          page.drawRectangle({
            x: barcodeX + padX + i * mWidth,
            y: barEndY,
            width: mWidth,
            height: topY - barEndY,
            color: rgb(0, 0, 0),
          });
        }
      }

      // Draw EAN5 bars
      if (hasEan5 && bd.ean5Modules) {
        const ean5StartX = barcodeX + padX + (95 + 9) * mWidth;
        for (let i = 0; i < bd.ean5Modules.length; i++) {
          if (bd.ean5Modules.charAt(i) === '1') {
            page.drawRectangle({
              x: ean5StartX + i * mWidth,
              y: barYEnd,
              width: mWidth,
              height: topY - barYEnd,
              color: rgb(0, 0, 0),
            });
          }
        }
      }

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Draw numbers
      const textY = inchesToPts(0.6) + 2; // draw text at bottom

      // Main first digit (usually 9)
      page.drawText(bd.ean13Text.charAt(0), {
        x: barcodeX + padX - 5,
        y: textY,
        size: 6,
        font: fontBold,
        color: rgb(0, 0, 0)
      });

      // Left 6 digits
      const leftGroupStr = bd.ean13Text.substring(2, 8).replace(/-/g, '');
      page.drawText(leftGroupStr, {
        x: barcodeX + padX + 4,
        y: textY,
        size: 6,
        font: fontBold,
        color: rgb(0, 0, 0)
      });

      // Right 6 digits
      const rightGroupStr = bd.ean13Text.substring(8).replace(/-/g, '');
      page.drawText(rightGroupStr, {
        x: barcodeX + padX + 35,
        y: textY,
        size: 6,
        font: fontBold,
        color: rgb(0, 0, 0)
      });

      // Top ISBN text
      page.drawText("ISBN " + bd.ean13Text, {
        x: barcodeX + padX + 8,
        y: inchesToPts(0.6) + barcodeH - 5,
        size: 5.5,
        font: fontRegular,
        color: rgb(0, 0, 0)
      });

      // Draw EAN5 text if present
      if (hasEan5 && bd.ean5Text) {
        const ean5StartX = barcodeX + padX + (95 + 9) * mWidth;
        page.drawText(bd.ean5Text, {
          x: ean5StartX,
          y: inchesToPts(0.6) + barcodeH - 5,
          size: 5,
          font: fontBold,
          color: rgb(0, 0, 0)
        });
      }
    } catch (err) {
      console.error("Vector barcode rendering error:", err);
      const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText('ISBN BARCODE ERROR', {
        x: barcodeX + 5,
        y: inchesToPts(0.6) + 25,
        size: 6,
        font: fallbackFont,
        color: rgb(0.5, 0.1, 0.1),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Compiles a rich typeset multi-page PDF for book interiors
 */
export async function compileInteriorPDF(
  chapters: Chapter[],
  settings: InteriorSettings,
  onProgress?: (val: number) => void,
  interiorImages?: any[]
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  const trimSize = TRIM_SIZES.find(t => t.id === settings.trimId) || TRIM_SIZES[3];
  const widthInches = trimSize.id === 'custom' ? settings.customWidth : trimSize.width;
  const heightInches = trimSize.id === 'custom' ? settings.customHeight : trimSize.height;

  const widthPts = inchesToPts(widthInches);
  const heightPts = inchesToPts(heightInches);

  // Generate layouts with images Included!
  const renderedPages = typesetManuscript(chapters, settings, 0.42, interiorImages);

  // Load standard standard fonts
  let fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  let fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  let fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // Try loading chosen custom Google Font
  const selectedFont = FONTS_LIST.find(f => f.name === settings.bodyFont || f.id === settings.bodyFont);
  if (selectedFont && selectedFont.url) {
    try {
      const fontBytes = await fetchFontAsUint8(selectedFont.url);
      fontRegular = await pdfDoc.embedFont(fontBytes);
    } catch (e) {
      console.warn("Failed to load custom body font. Using standard Times Roman fallback.", e);
    }
  }

  const totalPagesCount = renderedPages.length;

  for (let i = 0; i < totalPagesCount; i++) {
    onProgress?.(Math.round(((i + 1) / totalPagesCount) * 100));

    const pData = renderedPages[i];
    const page = pdfDoc.addPage([widthPts, heightPts]);

    const isOdd = pData.pageNumber % 2 !== 0;

    // Margin mirror spacing values
    const insideM = inchesToPts(settings.insideMargin);
    const outsideM = inchesToPts(settings.outsideMargin);
    const topM = inchesToPts(settings.topMargin);
    const bottomM = inchesToPts(settings.bottomMargin);

    const leftMargin = isOdd ? insideM : outsideM;
    const rightMargin = isOdd ? outsideM : insideM;

    // Full Page Image Insertion
    if (pData.isImagePage && pData.imageObj) {
      const imgConf = pData.imageObj;
      if (imgConf.file) {
        try {
          const imgBytes = await imgConf.file.arrayBuffer();
          const embedImg = imgConf.file.type === 'image/png'
            ? await pdfDoc.embedPng(imgBytes)
            : await pdfDoc.embedJpg(imgBytes);

          const printableW = widthPts - leftMargin - rightMargin;
          const printableH = heightPts - topM - bottomM;

          const ratio = embedImg.width / embedImg.height;
          const pctScale = (imgConf.scale || 100) / 100;
          let drawW = printableW * pctScale;
          let drawH = drawW / ratio;

          if (drawH > printableH * pctScale) {
            drawH = printableH * pctScale;
            drawW = drawH * ratio;
          }

          const drawX = leftMargin + (printableW - drawW) / 2;
          const drawY = bottomM + (printableH - drawH) / 2;

          page.drawImage(embedImg, {
            x: drawX,
            y: drawY,
            width: drawW,
            height: drawH
          });

          if (imgConf.caption && imgConf.caption.trim()) {
            const captionText = sanitizeForWinAnsi(imgConf.caption);
            const capSize = 9;
            const capWidth = fontItalic.widthOfTextAtSize(captionText, capSize);
            const capX = (widthPts - capWidth) / 2;
            page.drawText(captionText, {
              x: capX,
              y: Math.max(bottomM - 12, drawY - 18),
              size: capSize,
              font: fontItalic,
              color: rgb(0.35, 0.35, 0.35)
            });
          }
        } catch (err) {
          console.error("Failed to embed full-page image:", err);
        }
      }

      // Draw footer page number
      if (pData.pageNumber > 0) {
        const pageStr = String(pData.pageNumber);
        const pNumWidth = fontRegular.widthOfTextAtSize(pageStr, 9);
        let pNumX = (widthPts - pNumWidth) / 2;
        if (settings.pageNumberPosition === 'bottom-outer') {
          pNumX = isOdd ? (widthPts - rightMargin - pNumWidth - 4) : (leftMargin + 4);
        } else if (settings.pageNumberPosition === 'bottom-inner') {
          pNumX = isOdd ? (leftMargin + 4) : (widthPts - rightMargin - pNumWidth - 4);
        }
        page.drawText(pageStr, {
          x: pNumX,
          y: bottomM - 16,
          size: 9,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });
      }
      continue; // Skip the rest of headers/text loop
    }

    // Header Setup
    const isChapterStart = (pData.lines || []).some(l => l.isHeading && l.isTitle);
    const showHeaderOnPage = settings.showRunningHeaders && pData.pageNumber > 2 && !isChapterStart;
    if (showHeaderOnPage) {
      const headerTextText = isOdd 
        ? (settings.headerOddText || settings.authorName).toUpperCase()
        : (settings.headerEvenText || settings.bookTitle).toUpperCase();
      
      const headerText = sanitizeForWinAnsi(headerTextText);
      const headWidth = fontRegular.widthOfTextAtSize(headerText, 8);
      const headX = (widthPts - headWidth) / 2;
      page.drawText(headerText, {
        x: headX,
        y: heightPts - topM + 12,
        size: 8,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
      });

      // Subtle rule under header
      page.drawLine({
        start: { x: leftMargin, y: heightPts - topM + 4 },
        end: { x: widthPts - rightMargin, y: heightPts - topM + 4 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
    }

    // Top Inline Image Insertion
    let imageTopHeight = 0;
    if (pData.inlineImageTop && pData.inlineImageTop.file) {
      try {
        const imgConf = pData.inlineImageTop;
        const imgBytes = await imgConf.file.arrayBuffer();
        const embedImg = imgConf.file.type === 'image/png'
          ? await pdfDoc.embedPng(imgBytes)
          : await pdfDoc.embedJpg(imgBytes);

        const printableW = widthPts - leftMargin - rightMargin;
        const ratio = embedImg.width / embedImg.height;

        const pctScale = (imgConf.scale || 100) / 100;
        const maxW = printableW * pctScale;
        let drawW = maxW;
        let drawH = drawW / ratio;

        if (drawH > 105) {
          drawH = 105;
          drawW = drawH * ratio;
        }

        const drawX = leftMargin + (printableW - drawW) / 2;
        const drawY = heightPts - topM - 12 - drawH;

        page.drawImage(embedImg, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH
        });

        let captionSp = 0;
        if (imgConf.caption && imgConf.caption.trim()) {
          const captionText = sanitizeForWinAnsi(imgConf.caption);
          const capSize = 7.5;
          const capWidth = fontItalic.widthOfTextAtSize(captionText, capSize);
          const capX = (widthPts - capWidth) / 2;
          page.drawText(captionText, {
            x: capX,
            y: drawY - 9,
            size: capSize,
            font: fontItalic,
            color: rgb(0.35, 0.35, 0.35)
          });
          captionSp = 12;
        }

        imageTopHeight = drawH + 18 + captionSp;
      } catch (err) {
        console.error("Failed to embed top inline image:", err);
      }
    }

    // Bottom Inline Image Insertion
    if (pData.inlineImageBottom && pData.inlineImageBottom.file) {
      try {
        const imgConf = pData.inlineImageBottom;
        const imgBytes = await imgConf.file.arrayBuffer();
        const embedImg = imgConf.file.type === 'image/png'
          ? await pdfDoc.embedPng(imgBytes)
          : await pdfDoc.embedJpg(imgBytes);

        const printableW = widthPts - leftMargin - rightMargin;
        const ratio = embedImg.width / embedImg.height;

        const pctScale = (imgConf.scale || 100) / 100;
        const maxW = printableW * pctScale;
        let drawW = maxW;
        let drawH = drawW / ratio;

        if (drawH > 105) {
          drawH = 105;
          drawW = drawH * ratio;
        }

        const drawX = leftMargin + (printableW - drawW) / 2;
        const drawY = bottomM;

        page.drawImage(embedImg, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH
        });

        if (imgConf.caption && imgConf.caption.trim()) {
          const captionText = sanitizeForWinAnsi(imgConf.caption);
          const capSize = 7.5;
          const capWidth = fontItalic.widthOfTextAtSize(captionText, capSize);
          const capX = (widthPts - capWidth) / 2;
          page.drawText(captionText, {
            x: capX,
            y: drawY + drawH + 3,
            size: capSize,
            font: fontItalic,
            color: rgb(0.35, 0.35, 0.35)
          });
        }
      } catch (err) {
        console.error("Failed to embed bottom inline image:", err);
      }
    }

    // Lines Typesetting Render Loop
    let cursorY = heightPts - topM - 12 - imageTopHeight;
    const firstLineLines = pData.lines[0];
    if (firstLineLines && firstLineLines.isHeading && firstLineLines.isTitle) {
      cursorY -= (heightPts * 0.14); // Elegant drop for chapter starter pages!
    }
    const bodySize = settings.bodyFontSize;
    const leading = bodySize * settings.lineSpacing;
    const h1Size = bodySize * 1.8;
    const h1Leading = h1Size * 1.3;

    for (const line of pData.lines) {
      const lineText = sanitizeForWinAnsi(line.text);
      
      if (line.isHeading) {
        const hAlign = line.align || 'center';
        let hX = leftMargin;
        if (hAlign === 'center') {
          const hWidth = fontBold.widthOfTextAtSize(lineText, h1Size);
          hX = (widthPts - hWidth) / 2;
        }
        cursorY -= h1Leading;

        // Draw top decorative fancy frame rule if enabled
        if (line.isFancyFrameTop) {
          const borderYTop = cursorY + h1Size + 4;
          page.drawLine({
            start: { x: leftMargin, y: borderYTop },
            end: { x: widthPts - rightMargin, y: borderYTop },
            thickness: 1,
            color: rgb(0.15, 0.15, 0.15),
          });
        }
        // Draw bottom decorative fancy frame rule if enabled
        if (line.isFancyFrame) {
          const borderYBottom = cursorY - 6;
          page.drawLine({
            start: { x: leftMargin, y: borderYBottom },
            end: { x: widthPts - rightMargin, y: borderYBottom },
            thickness: 0.5,
            color: rgb(0.25, 0.25, 0.25),
          });
        }

        page.drawText(lineText, {
          x: hX,
          y: cursorY,
          size: h1Size,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });
        cursorY -= line.isFancyFrame ? 18 : 12; // extra padding after heading
      } else if (line.isOrnament) {
        const oWidth = fontRegular.widthOfTextAtSize(lineText, 10);
        const oX = (widthPts - oWidth) / 2;
        page.drawText(lineText, {
          x: oX,
          y: cursorY,
          size: 10,
          font: fontRegular,
          color: rgb(0.35, 0.35, 0.35),
        });
        cursorY -= leading;
      } else {
        // Standard body paragraph line, with optional drop-cap offset and rendering
        let activeX = leftMargin;
        if (line.dropCapOffset) {
          activeX += line.dropCapOffset;
        }

        if (line.dropCapChar) {
          const numLines = line.dropCapLinesCount || 3;
          // Calculate drop-cap font size to stretch across numLines height
          const dcFontSize = leading * numLines * 1.05;
          const dcColor = line.dropCapColor ? hexToColorVec(line.dropCapColor) : rgb(0.31, 0.27, 0.9);
          
          // Drop cap baseline aligns with bottom line baseline of group
          const dcY = cursorY - (numLines - 1) * leading + 2;

          page.drawText(line.dropCapChar, {
            x: leftMargin,
            y: dcY,
            size: dcFontSize,
            font: fontBold, // bold serif drop cap representation
            color: dcColor,
          });
        }

        const words = lineText.trim().split(/\s+/).filter(Boolean);
        const shouldJustify = 
          settings.justification === 'justify' &&
          !!line.chapId && // Only justify actual chapter body lines (excludes title, copyright, dedication, colophon)
          !line.isLastLineOfParagraph &&
          line.align !== 'center' &&
          words.length > 1;

        if (shouldJustify) {
          // Calculate the total width of all words without spaces
          const useFont = line.isItalic ? fontItalic : fontRegular;
          let totalWordsWidth = 0;
          for (const word of words) {
            totalWordsWidth += useFont.widthOfTextAtSize(word, bodySize);
          }
          
          const maxLineX = widthPts - rightMargin;
          const totalSpacingUnits = words.length - 1;
          const availableSpace = maxLineX - activeX;
          const spacePerWordGap = (availableSpace - totalWordsWidth) / totalSpacingUnits;
          
          let currentWordX = activeX;
          for (let wi = 0; wi < words.length; wi++) {
            const word = words[wi];
            page.drawText(word, {
              x: currentWordX,
              y: cursorY,
              size: bodySize,
              font: useFont,
              color: rgb(0.12, 0.12, 0.12),
            });
            currentWordX += useFont.widthOfTextAtSize(word, bodySize) + spacePerWordGap;
          }
        } else {
          // Standard body line drawing, supporting centering and italicization
          const useFont = line.isItalic ? fontItalic : fontRegular;
          const useSize = line.isDedication ? bodySize * 0.95 : bodySize;
          const useColor = line.isDedication ? rgb(0.2, 0.2, 0.2) : rgb(0.12, 0.12, 0.12);
          
          let drawX = activeX;
          if (line.align === 'center') {
            const textWidth = useFont.widthOfTextAtSize(lineText, useSize);
            drawX = (widthPts - textWidth) / 2;
          }
          
          page.drawText(lineText, {
            x: drawX,
            y: cursorY,
            size: useSize,
            font: useFont,
            color: useColor,
          });
        }
        cursorY -= leading;
      }
    }

    // Footer Page Number Setup
    if (pData.pageNumber > 0) {
      const pageStr = String(pData.pageNumber);
      const pNumWidth = fontRegular.widthOfTextAtSize(pageStr, 9);
      
      let pNumX = (widthPts - pNumWidth) / 2; // default centered
      if (settings.pageNumberPosition === 'bottom-outer') {
        pNumX = isOdd ? (widthPts - rightMargin - pNumWidth - 4) : (leftMargin + 4);
      } else if (settings.pageNumberPosition === 'bottom-inner') {
        pNumX = isOdd ? (leftMargin + 4) : (widthPts - rightMargin - pNumWidth - 4);
      }

      page.drawText(pageStr, {
        x: pNumX,
        y: bottomM - 16,
        size: 9,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
