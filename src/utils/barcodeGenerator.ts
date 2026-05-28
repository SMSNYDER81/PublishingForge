/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// EAN check-character patterns definition
const L_CODES = [
  "0001101", // 0
  "0011001", // 1
  "0010011", // 2
  "0111101", // 3
  "0100011", // 4
  "0110001", // 5
  "0101111", // 6
  "0111011", // 7
  "0110111", // 8
  "0001011"  // 9
];

const G_CODES = [
  "0100111", // 0
  "0110011", // 1
  "0011011", // 2
  "0100001", // 3
  "0011101", // 4
  "0111001", // 5
  "0000101", // 6
  "0010001", // 7
  "0001001", // 8
  "0010111"  // 9
];

const R_CODES = [
  "1110010", // 0
  "1100110", // 1
  "1101100", // 2
  "1000010", // 3
  "1011100", // 4
  "1001110", // 5
  "1010000", // 6
  "1000100", // 7
  "1001000", // 8
  "1110100"  // 9
];

const PARITY_TABLE = [
  ["L", "L", "L", "L", "L", "L"], // 0
  ["L", "L", "G", "L", "G", "G"], // 1
  ["L", "L", "G", "G", "L", "G"], // 2
  ["L", "L", "G", "G", "G", "L"], // 3
  ["L", "G", "L", "L", "G", "G"], // 4
  ["L", "G", "G", "L", "L", "G"], // 5
  ["L", "G", "G", "G", "L", "L"], // 6
  ["L", "G", "L", "G", "L", "G"], // 7
  ["L", "G", "L", "G", "G", "L"], // 8
  ["L", "G", "G", "L", "G", "L"]  // 9
];

// EAN-5 Parity Table: O is L-code, E is G-code
const EAN5_PARITY_TABLE = [
  ["G", "G", "L", "L", "L"], // 0
  ["G", "L", "G", "L", "L"], // 1
  ["G", "L", "L", "G", "L"], // 2
  ["G", "L", "L", "L", "G"], // 3
  ["L", "G", "G", "L", "L"], // 4
  ["L", "L", "G", "G", "L"], // 5
  ["L", "L", "L", "G", "G"], // 6
  ["L", "G", "L", "G", "L"], // 7
  ["L", "G", "L", "L", "G"], // 8
  ["L", "L", "G", "L", "G"]  // 9
];

/**
 * Normalizes input ISBN to 13 digits and recalculates/calculates EAN-13.
 * Supports converting 10-digit ISBN to 13-digit.
 */
export function normalizeISBN(isbn: string): string {
  const digits = isbn.replace(/[^\dX]/gi, '');
  if (digits.length === 10) {
    // Convert ISBN-10 to ISBN-13
    const base12 = "978" + digits.substring(0, 9);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const num = parseInt(base12.charAt(i), 10);
      sum += (i % 2 === 0) ? num : num * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return base12 + checkDigit;
  }
  
  if (digits.length === 13) {
    // If check digit is incorrect, let's recalculate to get the standard EAN barcode
    const base12 = digits.substring(0, 12);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const num = parseInt(base12.charAt(i), 10);
      sum += (i % 2 === 0) ? num : num * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return base12 + checkDigit;
  }
  
  // Return stripped digits or fallback
  return digits;
}

/**
 * Format ISBN string with dashes for beautiful professional presentation
 */
export function formatISBN(isbn13: string): string {
  if (isbn13.length !== 13) return isbn13;
  return `${isbn13.substring(0, 3)}-${isbn13.substring(3, 4)}-${isbn13.substring(4, 9)}-${isbn13.substring(9, 12)}-${isbn13.substring(12)}`;
}

/**
 * Formats user input price to 5 digit EAN-5 code or parses standard input
 * E.g., "19.99" -> "51999" (5 for USD + 1999 cents)
 * "12.00" -> "51200"
 * "$9.95" -> "50995"
 * "" -> "90000" (no price)
 */
export function getEAN5PriceCode(priceStr: string, currency: string = '5'): string {
  const cleaned = priceStr.trim().replace(/[^\d.]/g, '');
  if (!cleaned) return "90000"; // Code for no price
  
  // If it's already a 5 digit number code, keep it
  if (/^\d{5}$/.test(cleaned)) {
    return cleaned;
  }
  
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return "90000";
  
  const cents = Math.round(parsed * 100);
  if (cents > 9999) {
    // If cents exceeds 4 digits, cap it or fallback to no price
    return "90000";
  }
  
  const paddedCents = cents.toString().padStart(4, '0');
  return currency + paddedCents;
}

/**
 * Encodes an EAN-13 string into solid 1 and 0 array.
 * Length of EAN-13 code is 13 digits.
 * Return binary modules string (width=95)
 */
export function encodeEAN13(digits: string): string | null {
  if (digits.length !== 13 || !/^\d+$/.test(digits)) return null;
  
  const firstDigit = parseInt(digits.charAt(0), 10);
  const leftGroup = digits.substring(1, 7);
  const rightGroup = digits.substring(7, 13);
  
  const paritySequence = PARITY_TABLE[firstDigit];
  if (!paritySequence) return null;
  
  let result = "101"; // Start Guard
  
  // Encode Left 6 digits
  for (let i = 0; i < 6; i++) {
    const digit = parseInt(leftGroup.charAt(i), 10);
    const encodingType = paritySequence[i];
    if (encodingType === "L") {
      result += L_CODES[digit];
    } else {
      result += G_CODES[digit];
    }
  }
  
  result += "01010"; // Center Guard
  
  // Encode Right 6 digits
  for (let i = 0; i < 6; i++) {
    const digit = parseInt(rightGroup.charAt(i), 10);
    result += R_CODES[digit];
  }
  
  result += "101"; // End Guard
  
  return result;
}

/**
 * Encodes an EAN-5 price string into solid 1 and 0 array.
 * Length of EAN-5 code is 5 digits.
 * Return binary modules string (width=47)
 */
export function encodeEAN5(digits: string): string | null {
  if (digits.length !== 5 || !/^\d+$/.test(digits)) return null;
  
  // Calculates checksum to select parity mapping
  let d1 = parseInt(digits.charAt(0), 10);
  let d2 = parseInt(digits.charAt(1), 10);
  let d3 = parseInt(digits.charAt(2), 10);
  let d4 = parseInt(digits.charAt(3), 10);
  let d5 = parseInt(digits.charAt(4), 10);
  
  // Formula: (sum of odd * 3) + (sum of even * 9)
  let total = (d1 + d3 + d5) * 3 + (d2 + d4) * 9;
  let checksum = total % 10;
  
  const paritySequence = EAN5_PARITY_TABLE[checksum];
  if (!paritySequence) return null;
  
  let result = "1011"; // Start Guard
  
  for (let i = 0; i < 5; i++) {
    const digit = parseInt(digits.charAt(i), 10);
    const encodingType = paritySequence[i];
    if (encodingType === "L") {
      result += L_CODES[digit];
    } else {
      result += G_CODES[digit];
    }
    
    // For digits 0,1,2,3 - add separator "01" after them
    if (i < 4) {
      result += "01";
    }
  }
  
  return result;
}

export interface BarcodeRenderData {
  ean13Modules: string;
  ean5Modules: string | null;
  ean13Text: string;
  ean5Text: string | null;
  isValid: boolean;
}

/**
 * Retrieves the comprehensive modules and formatting for the requested ISBN and price
 */
export function getBarcodeData(isbn: string, priceStr?: string): BarcodeRenderData {
  const normISBN = normalizeISBN(isbn || "9781234567897");
  const isbnValid = normISBN.length === 13 && /^\d+$/.test(normISBN);
  
  const ean13Modules = encodeEAN13(isbnValid ? normISBN : "9781234567897") || "";
  const formattedISBNText = formatISBN(isbnValid ? normISBN : "9781234567897");
  
  let ean5Modules: string | null = null;
  let formattedPriceText: string | null = null;
  
  if (priceStr && priceStr.trim()) {
    const ean5Code = getEAN5PriceCode(priceStr);
    ean5Modules = encodeEAN5(ean5Code);
    if (ean5Code === "90000") {
      formattedPriceText = "90000";
    } else {
      // E.g., show $19.99 for human readable
      const numericPart = parseFloat(priceStr.trim().replace(/[^\d.]/g, ''));
      if (!isNaN(numericPart)) {
        formattedPriceText = `$${numericPart.toFixed(2)}`;
      } else {
        formattedPriceText = ean5Code;
      }
    }
  }
  
  return {
    ean13Modules,
    ean5Modules,
    ean13Text: formattedISBNText,
    ean5Text: formattedPriceText,
    isValid: isbnValid
  };
}

/**
 * Draws the real-time barcode onto an HTML5 Canvas Context.
 */
export function drawBarcodeToCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  isbn: string,
  priceStr?: string
) {
  const bd = getBarcodeData(isbn, priceStr);
  
  // Background white fill
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, height);
  
  // Compute horizontal dimensions
  // Total modules: EAN-13 handles 95. If EAN-5 is active, add 9 (whitespace) + 47 (modules) = 151 modules
  const hasEan5 = bd.ean5Modules !== null;
  const numModules = hasEan5 ? 151 : 95;
  
  // Padding inside the barcode box: 5px on the left/right, 4px on the top
  const padX = Math.max(4, width * 0.05);
  const padY = Math.max(3, height * 0.06);
  const drawW = width - (padX * 2);
  const drawH = height - (padY * 2);
  
  const mWidth = drawW / numModules;
  
  // Bar height metrics: guards are drawn full height down to make room for text.
  // Standard bars leave 20% height at the bottom for human readable numbers.
  const guardYEnd = y + padY + drawH - 8;
  const barYEnd = y + padY + drawH - 12;
  
  // 1. Draw EAN-13 bars
  ctx.fillStyle = "#000000";
  for (let i = 0; i < bd.ean13Modules.length; i++) {
    if (bd.ean13Modules.charAt(i) === "1") {
      const isGuard = i < 3 || (i >= 45 && i < 50) || i >= 92;
      const barHeight = isGuard ? (guardYEnd - (y + padY)) : (barYEnd - (y + padY));
      ctx.fillRect(x + padX + i * mWidth, y + padY, mWidth + 0.1, barHeight);
    }
  }
  
  // 2. Draw EAN-5 bars if present
  if (hasEan5 && bd.ean5Modules) {
    const ean5StartX = x + padX + (95 + 9) * mWidth;
    for (let i = 0; i < bd.ean5Modules.length; i++) {
      if (bd.ean5Modules.charAt(i) === "1") {
        // EAN-5 bars all draw to standard height barYEnd (no guards extension below)
        const barHeight = barYEnd - (y + padY);
        // EAN-5 digits text is printed ABOVE the barcode, but we can print standard height
        ctx.fillRect(ean5StartX + i * mWidth, y + padY, mWidth + 0.1, barHeight);
      }
    }
  }
  
  // 3. Draw Human Readable Text
  ctx.fillStyle = "#000000";
  ctx.font = `bold ${Math.floor(height * 0.15)}px sans-serif`;
  ctx.textBaseline = "bottom";
  
  // ISBN text at the top or bottom of EAN-13
  const textY = y + height - 2;
  
  // Draw first digit outside the guard
  ctx.textAlign = "left";
  ctx.fillText(bd.ean13Text.charAt(0), x + padX - (padX * 0.6), textY);
  
  // Draw left 6 digits inside left segment
  ctx.textAlign = "center";
  const leftGroupStr = bd.ean13Text.substring(2, 8).replace(/-/g, '');
  const leftX = x + padX + (3 + 21) * mWidth;
  ctx.fillText(leftGroupStr, leftX, textY);
  
  // Draw right 6 digits inside right segment
  const rightGroupStr = bd.ean13Text.substring(8).replace(/-/g, '');
  const rightX = x + padX + (50 + 21) * mWidth;
  ctx.fillText(rightGroupStr, rightX, textY);
  
  // If EAN-5 text is present, draw it ABOVE the EAN-5 barcode
  if (hasEan5 && bd.ean5Text) {
    ctx.textAlign = "center";
    ctx.font = `bold ${Math.floor(height * 0.13)}px sans-serif`;
    const ean5StartX = x + padX + (95 + 9) * mWidth;
    const ean5MidX = ean5StartX + 23.5 * mWidth;
    ctx.textBaseline = "top";
    ctx.fillText(bd.ean5Text, ean5MidX, y + 2);
  }
  
  // Draw standard text of "ISBN: " at the very top of barcode if room exists
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.font = `${Math.floor(height * 0.10)}px sans-serif`;
  ctx.fillText("ISBN " + bd.ean13Text, x + width / 2, y + 1);
}
