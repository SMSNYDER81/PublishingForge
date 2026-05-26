/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, rgb, StandardFonts, PDFFont, degrees } from 'pdf-lib';
import { PlatformId, TrimSizeId, CoverSettings, InteriorSettings, Chapter } from '../types';
import { PLATFORMS, TRIM_SIZES, FONTS_LIST } from './presets';

// Helper: convert inches to points
export const inchesToPts = (inches: number) => inches * 72;

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
}

export interface LayoutPage {
  pageNumber: number;
  chapterTitle?: string;
  lines: LayoutLine[];
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

  // Title Page & Copyright Page if included
  if (settings.includeTitlePage) {
    pagesList.push({
      pageNumber: pageNumber++,
      lines: [
        { text: '\n\n\n\n', isHeading: false },
        { text: settings.bookTitle.toUpperCase(), isHeading: true },
        { text: settings.bookSubtitle ? '\n' + settings.bookSubtitle : '', isHeading: false },
        { text: '\n\n\nBY\n\n' + settings.authorName.toUpperCase(), isHeading: false },
        { text: '\n\n\n\n\n\n\n\n' + (settings.publisherName || ''), isHeading: false }
      ]
    });
  }

  if (settings.includeCopyrightPage) {
    pagesList.push({
      pageNumber: pageNumber++,
      lines: [
        { text: 'COPYRIGHT PAGE\n', isHeading: true },
        { text: `Copyright © ${settings.copyrightYear || '2026'} by ${settings.authorName || 'Author'}.`, isHeading: false },
        { text: 'All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.', isHeading: false },
        { text: settings.isbn ? `\nISBN: ${settings.isbn}` : '', isHeading: false },
        { text: `\nPublished by ${settings.publisherName || 'PublishingForge Printer'}`, isHeading: false }
      ]
    });
  }

  // Helper to split paragraph text into wrap-compliant lines based on page width
  const wrapParagraph = (text: string, maxWidthPts: number, isH1: boolean): string[] => {
    const fontSize = isH1 ? h1Size : bodySize;
    // Estimate max chars per line
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
  };

  // Typesetting Loop for Each Chapter
  for (const chap of chapters) {
    let currentLines: LayoutLine[] = [];

    // H1 Chapter header
    currentLines.push({ text: chap.title, isHeading: true });
    if (settings.showOrnament) {
      currentLines.push({ text: '✦ ✦ ✦', isHeading: false, isOrnament: true });
    }

    // Process paragraphs
    for (let pIdx = 0; pIdx < chap.paragraphs.length; pIdx++) {
      let pText = chap.paragraphs[pIdx];
      if (!pText.trim()) continue;

      // First-paragraph drop-cap convention: no indent for first paragraph.
      const shouldIndent = settings.paragraphStyle === 'indent' && pIdx > 0;
      const displayPrefix = shouldIndent ? '      ' : ''; // indent spacer approx
      const textToWrap = displayPrefix + pText;

      // Layout margins depend on Odd vs Even page positioning (Mirror margins)
      // Since margins can alternate, we fetch standard margins to measure remaining width
      const isOdd = pageNumber % 2 !== 0;
      const insideM = inchesToPts(settings.insideMargin);
      const outsideM = inchesToPts(settings.outsideMargin);
      const activeLeftMargin = isOdd ? insideM : outsideM;
      const activeRightMargin = isOdd ? outsideM : insideM;
      const contentWidthPts = widthPts - activeLeftMargin - activeRightMargin;

      const wrappedLines = wrapParagraph(textToWrap, contentWidthPts, false);

      for (const line of wrappedLines) {
        currentLines.push({ text: line, isHeading: false });
      }

      // Add a spacer line if block spacing is selected
      if (settings.paragraphStyle === 'block') {
        currentLines.push({ text: '', isHeading: false });
      }
    }

    // Now, pack this long stream of layout lines into physical pages!
    const topM = inchesToPts(settings.topMargin);
    const bottomM = inchesToPts(settings.bottomMargin);
    const availableHeightPts = heightPts - topM - bottomM - 36; // leave room for headers/footers

    let activePageLines: LayoutLine[] = [];
    let currentHeightSum = 0;

    for (let i = 0; i < currentLines.length; i++) {
      const line = currentLines[i];
      const lineSpacing = line.isHeading ? h1Leading : leading;

      if (currentHeightSum + lineSpacing > availableHeightPts) {
        // Page is full! Save it
        pagesList.push({
          pageNumber: pageNumber++,
          chapterTitle: chap.title,
          lines: activePageLines
        });
        activePageLines = [];
        currentHeightSum = 0;
      }

      // If chapter headings must absolutely start on a new page and this is an H1,
      // force page break unless current page is already empty
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

    // Append last page of chapter
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
  const bleed = 0.125; // standard KDP & Ingram bleed

  // Total flat dimensions in points
  const totalWidthPts = inchesToPts((trimWidth * 2) + spineWidth + (bleed * 2));
  const totalHeightPts = inchesToPts(trimHeight + (bleed * 2));

  const page = pdfDoc.addPage([totalWidthPts, totalHeightPts]);

  // Fill Background Base Color (Mode A)
  const hexToColorVec = (hex: string) => {
    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;
    return rgb(r, g, b);
  };

  // 1. Draw solid background across entire spread or back cover
  const spineBg = hexToColorVec(settings.spineBgColor);
  const backBg = hexToColorVec(settings.backBgColor);
  
  // Left side (Back cover)
  const leftEdgePts = 0;
  const backCoverWidthPts = inchesToPts(trimWidth + bleed);
  page.drawRectangle({
    x: leftEdgePts,
    y: 0,
    width: backCoverWidthPts,
    height: totalHeightPts,
    color: backBg,
  });

  // Center (Spine)
  const spineLeftPts = backCoverWidthPts;
  const spineWidthPts = inchesToPts(spineWidth);
  page.drawRectangle({
    x: spineLeftPts,
    y: 0,
    width: spineWidthPts,
    height: totalHeightPts,
    color: spineBg,
  });

  // Right side (Front cover)
  const frontLeftPts = spineLeftPts + spineWidthPts;
  const frontWidthPts = inchesToPts(trimWidth + bleed);
  page.drawRectangle({
    x: frontLeftPts,
    y: 0,
    width: frontWidthPts,
    height: totalHeightPts,
    color: backBg, // fallback
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
    // Stretch to exact bleed size of front cover
    page.drawImage(embedImg, {
      x: frontLeftPts,
      y: 0,
      width: frontWidthPts,
      height: totalHeightPts,
    });
  }

  // Embedded optional back cover image
  if (backImageBlob) {
    const imgBytes = await backImageBlob.arrayBuffer();
    const embedBackImg = backImageBlob.type === 'image/png' 
      ? await pdfDoc.embedPng(imgBytes) 
      : await pdfDoc.embedJpg(imgBytes);
    page.drawImage(embedBackImg, {
      x: 0,
      y: 0,
      width: backCoverWidthPts,
      height: totalHeightPts,
    });
  }

  // Draw spine text (Rotate 270 degrees clockwise or 90 degrees counter-clockwise)
  if (settings.spineTitle && spineWidth >= 0.25) {
    // Standard built-in serif font for pdf compilation safety
    const font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const titleText = settings.spineTitle.toUpperCase();
    const authorText = settings.spineAuthor ? ` — ${settings.spineAuthor}` : '';
    const fullText = titleText + authorText;

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

    // Draw description synopsis
    if (settings.backDescription) {
      const synWords = settings.backDescription.split(' ');
      let currentLine = '';
      let yOffset = totalHeightPts - inchesToPts(0.8);
      const startX = inchesToPts(0.6);
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
      page.drawRectangle({
        x: inchesToPts(0.6),
        y: inchesToPts(0.6),
        width: 100,
        height: 60,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });
      page.drawText('ISBN BARCODE PLACEHOLDER', {
        x: inchesToPts(0.65),
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
  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

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
      const headerText = isOdd 
        ? (settings.headerOddText || settings.authorName).toUpperCase()
        : (settings.headerEvenText || settings.bookTitle).toUpperCase();
      
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
      if (line.isHeading) {
        // Center Heading text
        const hWidth = fontBold.widthOfTextAtSize(line.text, h1Size);
        const hX = (widthPts - hWidth) / 2;
        cursorY -= h1Leading;
        page.drawText(line.text, {
          x: hX,
          y: cursorY,
          size: h1Size,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });
        cursorY -= 12; // extra padding after heading
      } else if (line.isOrnament) {
        // Center chapter star ornaments
        const oWidth = fontRegular.widthOfTextAtSize(line.text, 10);
        const oX = (widthPts - oWidth) / 2;
        page.drawText(line.text, {
          x: oX,
          y: cursorY,
          size: 10,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4),
        });
        cursorY -= leading;
      } else {
        // Standard body paragraph line
        // We will just left-align or fully-justify based on user settings
        // Full-justification requires measuring characters or simple spaced drawing.
        // For standard client compile, left-aligned has high safety and looks clean:
        page.drawText(line.text, {
          x: leftMargin,
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
