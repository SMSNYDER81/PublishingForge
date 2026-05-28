/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlatformId = 'kdp' | 'ingram' | 'lulu' | 'd2d';

export interface PlatformPreset {
  id: PlatformId;
  name: string;
  minPages: number;
  spineFormula: {
    white: number; // thickness per page in inches
    cream: number;
    color: number;
  };
  getMargins: (pageCount: number) => {
    inside: number; // inches
    outside: number;
    top: number;
    bottom: number;
  };
}

export type TrimSizeId = '5x8' | '5.25x8' | '5.5x8.5' | '6x9' | '6.14x9.21' | '7x10' | '8.5x11' | 'custom';

export interface TrimPreset {
  id: TrimSizeId;
  name: string;
  width: number; // inches
  height: number; // inches
  commonUse: string;
}

export type BindingType = 'paperback' | 'hardcover' | 'hardcover-case' | 'hardcover-jacket';
export type PaperColor = 'white' | 'cream' | 'color';

export interface CoverSettings {
  platform: PlatformId;
  binding: BindingType;
  trimId: TrimSizeId;
  customWidth: number;
  customHeight: number;
  paperColor: PaperColor;
  pageCount: number;
  flapWidth?: number; // dust jacket flap width in inches
  
  // Design Settings
  mode: 'front' | 'full'; 
  spineBgColor: string;
  spineTextColor: string;
  spineTitle: string;
  spineAuthor: string;
  spineFont: string;
  spineFontSize: number;
  
  backBgColor: string;
  backTextColor: string;
  backDescription: string;
  backAuthorBio: string;
  showBarcodePlaceholder: boolean;
  barcodeISBN?: string;
  barcodePrice?: string;

  // Custom Image Transform settings in inches
  frontImageX?: number;
  frontImageY?: number;
  frontImageWidth?: number;
  frontImageHeight?: number;

  backImageX?: number;
  backImageY?: number;
  backImageWidth?: number;
  backImageHeight?: number;
}

export interface InteriorSettings {
  platform: PlatformId;
  trimId: TrimSizeId;
  customWidth: number;
  customHeight: number;
  
  // Margins
  insideMargin: number; // inches
  outsideMargin: number;
  topMargin: number;
  bottomMargin: number;
  
  // Typography
  bodyFont: string;
  bodyFontSize: number; // pt
  lineSpacing: number; // multiplier e.g. 1.3
  paragraphStyle: 'indent' | 'block';
  indentSize: number; // inches e.g. 0.35
  justification: 'justify' | 'left';
  
  // Style Options
  chapterStartNewPage: boolean;
  chapterNumberStyle: 'arabic' | 'roman' | 'spelled' | 'none';
  showDropCap: boolean;
  dropCapLines?: number; // 2 or 3 lines high
  dropCapColor?: string; // hex colour for drop caps
  chapterOrnament?: 'triple-star' | 'floral-leaf' | 'divider-bar' | 'none';
  chapterTitleAlign?: 'center' | 'left' | 'fancy-frame';
  showOrnament: boolean;
  
  // Front Matter
  includeTitlePage: boolean;
  includeCopyrightPage: boolean;
  bookTitle: string;
  bookSubtitle: string;
  authorName: string;
  publisherName: string;
  copyrightYear: string;
  isbn: string;
  
  // Header / Footer
  showRunningHeaders: boolean;
  headerEvenText: string; // e.g. "Book Title"
  headerOddText: string;  // e.g. "Author Name"
  pageNumberPosition: 'bottom-center' | 'bottom-outer' | 'bottom-inner' | 'top-center' | 'top-outer';
}

export interface Chapter {
  id: string;
  title: string;
  paragraphs: string[];
}
