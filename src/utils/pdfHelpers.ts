/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, rgb, StandardFonts, PDFFont, degrees } from 'pdf-lib';
import { PlatformId, TrimSizeId, CoverSettings, InteriorSettings, Chapter } from '../types';
import { PLATFORMS, TRIM_SIZES, FONTS_LIST } from './presets';

// Helper: convert inches to points
export const inchesToPts = (inches: number) => inches * 72;

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
  dropCapChar?: string;
  dropCapLinesCount?: number;
  dropCapColor?: string;
  dropCapOffset?: number;
}

export interface LayoutPage {
  pageNumber: number;
  chapterTitle?: string;
  lines: LayoutLine[];
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
  charWidthApprox: number = 0.42 // approximation helper when measuring text offline / canvas
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
      titleLines.push({ text: '', isHeading: false });
    }
    titleLines.push({ text: settings.bookTitle.toUpperCase(), isHeading: true });
    
    if (settings.bookSubtitle) {
      titleLines.push({ text: '', isHeading: false });
      titleLines.push({ text: settings.bookSubtitle, isHeading: false });
    }
    
    for (let i = 0; i < 3; i++) {
      titleLines.push({ text: '', isHeading: false });
    }
    titleLines.push({ text: 'BY', isHeading: false });
    titleLines.push({ text: '', isHeading: false });
    titleLines.push({ text: settings.authorName.toUpperCase(), isHeading: false });
    
    for (let i = 0; i < 6; i++) {
      titleLines.push({ text: '', isHeading: false });
    }
    if (settings.publisherName) {
      titleLines.push({ text: settings.publisherName, isHeading: false });
    }

    pagesList.push({
      pageNumber: pageNumber++,
      lines: titleLines
    });
  }

  if (settings.includeCopyrightPage) {
    const copyrightLines: LayoutLine[] = [];
    copyrightLines.push({ text: 'COPYRIGHT PAGE', isHeading: true });
    copyrightLines.push({ text: '', isHeading: false });
    copyrightLines.push({ 
      text: `Copyright © ${settings.copyrightYear || '2026'} by ${settings.authorName || 'Author'}.`, 
      isHeading: false 
    });
    copyrightLines.push({ text: '', isHeading: false });
    
    // Wrap copyright text nicely
    const contentWidthPts = widthPts - inchesToPts(settings.insideMargin) - inchesToPts(settings.outsideMargin);
    const textToWrap = 'All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.';
    const wrappedCopyright = wrapParagraph_internal(textToWrap, contentWidthPts);
    
    for (const wrapLine of wrappedCopyright) {
      copyrightLines.push({ text: wrapLine, isHeading: false });
    }
    
    if (settings.isbn) {
      copyrightLines.push({ text: '', isHeading: false });
      copyrightLines.push({ text: `ISBN: ${settings.isbn}`, isHeading: false });
    }
    
    copyrightLines.push({ text: '', isHeading: false });
    copyrightLines.push({ text: `Published by ${settings.publisherName || 'PublishingForge Printer'}`, isHeading: false });

    pagesList.push({
      pageNumber: pageNumber++,
      lines: copyrightLines
    });
  }

  // Helper to split paragraph text into wrap-compliant lines based on page width
  function wrapParagraph_internal(text: string, maxWidthPts: number, isH1: boolean = false): string[] {
    const fontSize = isH1 ? h1Size : bodySize;
    const avgCharWidth = fontSize * charWidthApprox;
    const maxChars = Math.floor(maxWidthPts / avgCharWidth);

    const words = text.split(/\s+/);
    const linesStr: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const spacing = currentLine ? ' ' : '';
      const testLine = currentLine + spacing + word;
      if (testLine.length > maxChars && currentLine) {
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

    // H1 Chapter header alignment
    const alignStyle = settings.chapterTitleAlign || 'center';
    const headingText = alignStyle === 'fancy-frame' ? `[ ${chap.title.toUpperCase()} ]` : chap.title;
    currentLines.push({ 
      text: headingText, 
      isHeading: true,
      align: alignStyle === 'fancy-frame' ? 'center' : alignStyle,
      isFancyFrame: alignStyle === 'fancy-frame'
    });

    if (settings.showOrnament && settings.chapterOrnament !== 'none') {
      let ornamentText = '✦   ✦   ✦';
      if (settings.chapterOrnament === 'floral-leaf') {
        ornamentText = '❦   ❊   ❦';
      } else if (settings.chapterOrnament === 'divider-bar') {
        ornamentText = '═════════ ❃ ═════════';
      }
      currentLines.push({ text: ornamentText, isHeading: false, isOrnament: true });
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
      if (pIdx === 0 && settings.showDropCap && pText.trim().length > 0) {
        const rawTrimmed = pText.trim();
        const dropCapChar = rawTrimmed.charAt(0);
        const pRestText = rawTrimmed.slice(1);
        const dropCapLinesCount = settings.dropCapLines || 3;
        const dropCapOffsetVal = 24 + (settings.bodyFontSize - 11) * 2; // adaptive indented spacing
        
        // Wrap drop-cap paragraph with alternating margins
        const wrappedLines: string[] = [];
        const fontScale = bodySize * charWidthApprox;
        const words = pRestText.split(/\s+/);
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const isIndentedRow = wrappedLines.length < dropCapLinesCount;
          const activeMaxWidth = isIndentedRow ? (contentWidthPts - dropCapOffsetVal) : contentWidthPts;
          const maxChars = Math.max(8, Math.floor(activeMaxWidth / fontScale));

          if (testLine.length > maxChars && currentLine) {
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
            dropCapChar: li === 0 ? dropCapChar : undefined,
            dropCapOffset: isIndentedRow ? dropCapOffsetVal : undefined,
            dropCapLinesCount: dropCapLinesCount,
            dropCapColor: settings.dropCapColor || '#4f46e5'
          });
        }
      } else {
        // Ordinary paragraph layout logic
        const shouldIndent = settings.paragraphStyle === 'indent' && pIdx > 0;
        const displayPrefix = shouldIndent ? '      ' : ''; // indent approximation
        const textToWrap = displayPrefix + pText;
        const wrappedLines = wrapParagraph_internal(textToWrap, contentWidthPts, false);

        for (const line of wrappedLines) {
          currentLines.push({ text: line, isHeading: false });
        }
      }

      // Add a spacer line if block spacing is selected
      if (settings.paragraphStyle === 'block') {
        currentLines.push({ text: '', isHeading: false });
      }
    }

    // Pack layout lines into physical pages
    const topM = inchesToPts(settings.topMargin);
    const bottomM = inchesToPts(settings.bottomMargin);
    const availableHeightPts = heightPts - topM - bottomM - 36; // leave room for headers/footers

    let activePageLines: LayoutLine[] = [];
    let currentHeightSum = 0;

    for (let i = 0; i < currentLines.length; i++) {
      const line = currentLines[i];
      const lineSpacing = line.isHeading ? h1Leading : leading;

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

/**
 * Generates the full high-fidelity composite cover wrapping Mode A or Mode B to printable PDF
 */
export async function compileCoverPDF(settings: CoverSettings, coverImageBlob: Blob | null, backImageBlob: Blob | null): Promise<Blob> {
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

  // 1. Draw solid background panels across the computed boundaries (Mode A)
  const spineBg = hexToColorVec(settings.spineBgColor);
  const backBg = hexToColorVec(settings.backBgColor);
  
  // Fill background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: totalWidthPts,
    height: totalHeightPts,
    color: backBg,
  });

  // Specifically paint spine
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
    // Fits exact calculated front cover boundary
    page.drawImage(embedImg, {
      x: frontLeftPts,
      y: 0,
      width: frontCoverWidthPts,
      height: totalHeightPts,
    });
  }

  // Embedded optional back cover image
  if (backImageBlob) {
    const imgBytes = await backImageBlob.arrayBuffer();
    const embedBackImg = backImageBlob.type === 'image/png' 
      ? await pdfDoc.embedPng(imgBytes) 
      : await pdfDoc.embedJpg(imgBytes);
    
    const backImageWidth = settings.binding === 'hardcover-jacket' ? backCoverWidthPts + flapWidthPts : backCoverWidthPts;
    page.drawImage(embedBackImg, {
      x: 0,
      y: 0,
      width: backImageWidth,
      height: totalHeightPts,
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

  // Draw back cover details if in custom front mode
  if (settings.mode === 'front') {
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const textColor = hexToColorVec(settings.backTextColor);

    const backCoverContentStartX = settings.binding === 'hardcover-jacket' ? flapWidthPts + inchesToPts(0.6) : inchesToPts(0.6);

    // Draw description synopsis
    if (settings.backDescription) {
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

    // Barcode space
    if (settings.showBarcodePlaceholder) {
      const barcodeX = settings.binding === 'hardcover-jacket' ? flapWidthPts + inchesToPts(0.6) : inchesToPts(0.6);
      page.drawRectangle({
        x: barcodeX,
        y: inchesToPts(0.6),
        width: 100,
        height: 60,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });
      page.drawText('ISBN BARCODE PLACEHOLDER', {
        x: barcodeX + 5,
        y: inchesToPts(1.0),
        size: 6,
        font: timesRoman,
        color: rgb(0.4, 0.4, 0.4),
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
  onProgress?: (val: number) => void
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  const trimSize = TRIM_SIZES.find(t => t.id === settings.trimId) || TRIM_SIZES[3];
  const widthInches = trimSize.id === 'custom' ? settings.customWidth : trimSize.width;
  const heightInches = trimSize.id === 'custom' ? settings.customHeight : trimSize.height;

  const widthPts = inchesToPts(widthInches);
  const heightPts = inchesToPts(heightInches);

  // Generate layouts
  const renderedPages = typesetManuscript(chapters, settings);

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

    // Header Setup
    if (settings.showRunningHeaders && pData.pageNumber > 2) {
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

    // Lines Typesetting Render Loop
    let cursorY = heightPts - topM - 12;
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

        // Draw double decorative fancy frames rules if enabled
        if (line.isFancyFrame) {
          const borderYTop = cursorY + h1Size + 2;
          const borderYBottom = cursorY - 6;
          // draw top bar
          page.drawLine({
            start: { x: leftMargin, y: borderYTop },
            end: { x: widthPts - rightMargin, y: borderYTop },
            thickness: 1,
            color: rgb(0.15, 0.15, 0.15),
          });
          // draw bottom bar
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

        page.drawText(lineText, {
          x: activeX,
          y: cursorY,
          size: bodySize,
          font: fontRegular,
          color: rgb(0.15, 0.15, 0.15),
        });
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
