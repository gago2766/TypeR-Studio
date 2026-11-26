// START OF FILE TypeR-Studio2-main/src/utils.ts

import { BubbleShapeType, ImageExportFormat, ExtractedStyleResult, GradientColorStop } from './types';
import { whitenRegionPixels, adaptiveInkThresholds } from './utils/whitenCore';
import type { WhitenMode, WhitenUsed } from './utils/whitenCore';

export function rgbToHex(rgb: string): string {
  if (!rgb || rgb === 'transparent' || rgb === 'rgba(0,0,0,0)' || rgb === 'rgba(0, 0, 0, 0)') return '#ffffff';
  if (rgb.startsWith('#')) return rgb;
  const rgbValues = rgb.match(/\d+/g);
  if (!rgbValues) return '#ffffff';
  const r = parseInt(rgbValues[0]);
  const g = parseInt(rgbValues[1]);
  const b = parseInt(rgbValues[2]);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/** يحوّل لوناً سداسياً (#rgb أو #rrggbb) إلى [r,g,b]؛ يعيد fallback عند صيغة غير صالحة */
export function hexToRgb(hex: string | undefined | null, fallback: [number, number, number] = [255, 255, 255]): [number, number, number] {
  if (!hex || !hex.startsWith('#')) return fallback;
  const h = hex.substring(1);
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
  if (full.length !== 6) return fallback;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return fallback;
  return [r, g, b];
}

/** هل لون البذرة داكن (سطوع أقل من العتبة)؟ يُستخدم لاختيار لون النص الافتراضي في الفقاعات الداكنة */
export function isDarkSeedColor(hex: string | undefined | null, threshold = 95): boolean {
  if (!hex || !hex.startsWith('#')) return false;
  const [r, g, b] = hexToRgb(hex, [0, 0, 0]);
  return 0.299 * r + 0.587 * g + 0.114 * b < threshold;
}

// 🟢 الحروف العربية التي تتصل من الجهتين
const DUAL_JOINING_CONNECTORS = new Set('بتثجحخسشصضطظعغفقكلمنهيئ'.split(''));

// 🔴 الحروف التي لا يمكن أن تسبقها أو تليها كشيدة
const NON_RIGHT_CONNECTORS = new Set(['ء', ' ', '\t', '\n', '،', '؟', '!', '.', ':', '؛', '»', '«', ')', ']', '(', '[']);

// 🌟 تصنيف قوة موضع التمطيط لمنع التشققات والحفاظ على التحام الكلمة
const HIGH_PRIORITY_CONNECTORS = new Set('سشصضطظعغفقكه'.split(''));
const MEDIUM_PRIORITY_CONNECTORS = new Set('محجخن'.split(''));
const TEETH_LETTERS = new Set('بتثنيئ'.split(''));

// فحص قابلية الحرف للاتصال بما بعده
export function canTatweel(ch: string): boolean {
  return DUAL_JOINING_CONNECTORS.has(ch);
}

// فحص الحركات التشكيلية
export function isDiacritic(ch: string): boolean {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return (code >= 0x064B && code <= 0x065F) || code === 0x0670;
}

export function removeTatweel(text: string): string {
  return text.replace(/\u0640/g, '');
}

/**
 * 🌟 دالة ذكية لتطبيع النصوص والوسوم العربية لضمان المطابقة التامة للأنماط والخطوط
 * تقوم بتوحيد الهمزات والألف والتاء المربوطة والياء وإزالة علامات الترقيم والأقواس
 */
export function normalizeArabicForTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '') // إزالة علامات الاتجاه والمحارف الخفية
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // إزالة التشكيل والكشيدات
    .replace(/[أإآٱ]/g, 'ا') // توحيد الألف
    .replace(/ة/g, 'ه') // توحيد التاء المربوطة
    .replace(/ى/g, 'ي') // توحيد الألف المقصورة والياء
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\[\]\(\)\{\}:：\-_/\\"'`~،,.*#]/g, '') // تنظيف الأقواس والنقطتين والعلامات
    .toLowerCase()
    .trim();
}

const NON_ARABIC_PREFIX = /^[^\u0621-\u064A\u064B-\u065F\u0670-\u06D3\u06D5\uFB50-\uFDFF\uFE70-\uFEFC]+/;
const NON_ARABIC_SUFFIX = /[^\u0621-\u064A\u064B-\u065F\u0670-\u06D3\u06D5\uFB50-\uFDFF\uFE70-\uFEFC]+$/;

function splitWord(word: string) {
  const prefixMatch = word.match(NON_ARABIC_PREFIX);
  const suffixMatch = word.match(NON_ARABIC_SUFFIX);
  const prefix = prefixMatch ? prefixMatch[0] : '';
  const suffix = suffixMatch ? suffixMatch[0] : '';
  const core = word.substring(prefix.length, word.length - suffix.length);
  return { prefix, core, suffix };
}

// 🧠 فحص دقيق لموضع التمطيط لضمان عدم حدوث تشققات في الخط
export function isValidTatweelPosition(word: string, charIndex: number): boolean {
  if (charIndex < 0 || charIndex >= word.length - 1) return false;

  const currentChar = word[charIndex];
  if (!DUAL_JOINING_CONNECTORS.has(currentChar)) return false;

  let nextIdx = charIndex + 1;
  while (nextIdx < word.length && isDiacritic(word[nextIdx])) {
    nextIdx++;
  }
  if (nextIdx >= word.length) return false;

  const nextChar = word[nextIdx];
  if (NON_RIGHT_CONNECTORS.has(nextChar)) return false;

  // منع الكشيدة بعد اللام إذا تلتها ألف
  if (currentChar === 'ل' && (nextChar === 'ا' || nextChar === 'أ' || nextChar === 'إ' || nextChar === 'آ')) {
    return false;
  }

  // منع الكشيدة بين الأسنان المتتالية لتفادي تشويه السنون وظهور شقوق
  if (TEETH_LETTERS.has(currentChar) && TEETH_LETTERS.has(nextChar)) {
    return false;
  }

  // منع الكشيدة بعد اللام إذا تلتها ميم لتجنب كسر محرف (لم) في بعض الخطوط
  if (currentChar === 'ل' && nextChar === 'م') {
    return false;
  }

  return true;
}

// 🛡️ اختيار أفضل موضع مد متناسق واحد في الكلمة لمنع تشتيت الكلمة إلى شقوق
export function getBestAnchorInWord(word: string): number {
  const { prefix, core } = splitWord(word);
  if (core.length < 3) return -1;

  let bestIdx = -1;
  let bestScore = -1;

  for (let i = 0; i < core.length - 1; i++) {
    const fullIdx = prefix.length + i;
    if (isValidTatweelPosition(word, fullIdx)) {
      const ch = word[fullIdx];
      let score = 1;
      if (HIGH_PRIORITY_CONNECTORS.has(ch)) score = 5;
      else if (MEDIUM_PRIORITY_CONNECTORS.has(ch)) score = 3;
      else if (TEETH_LETTERS.has(ch)) score = 2;

      if (i >= Math.floor(core.length / 2)) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = fullIdx;
      }
    }
  }

  return bestIdx;
}

// 🧠 سياق كانفاس مشترك لإعادة الاستخدام السريع وتفادي استهلاك الذاكرة
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

function getSharedCtx(): CanvasRenderingContext2D {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
    sharedCtx = sharedCanvas.getContext('2d', { willReadFrequently: true });
  }
  return sharedCtx!;
}

// 🛡️ دالة لتنظيف وتأمين صيغة الخط لـ CSS لضمان عدم رفض المتصفح للخطوط ذات المسافات والأرقام
export function formatFontFamily(fontFamily?: string): string {
  if (!fontFamily) return 'sans-serif';
  const clean = fontFamily.replace(/['"]/g, '').trim();
  if (!clean) return 'sans-serif';
  if (clean.includes(',')) {
    return clean;
  }
  return `'${clean}', sans-serif`;
}

// 🛡️ دالة لتنظيف وتأمين صيغة الخط قبل تمريرها للكانفاس
export function formatFontFamilyForCanvas(fontFamily: string): string {
  if (!fontFamily) return 'sans-serif';
  const cleanName = fontFamily.replace(/['"]/g, '').trim();
  if (cleanName.includes(',')) {
    return cleanName;
  }
  return `'${cleanName}', sans-serif`;
}

// 🆕 دالة ذكية لتجميع الكلمات ومنع علامات الترقيم اليتيمة
export function getSmartWords(text: string): string[] {
  const clean = text.replace(/\u0640/g, '');
  const rawWords = clean.trim().split(/\s+/).filter(Boolean);
  const words: string[] = [];
  
  for (let i = 0; i < rawWords.length; i++) {
    const word = rawWords[i];
    if (/^[؟!،؛.:»«)\]]+$/.test(word) && words.length > 0) {
      words[words.length - 1] += " " + word;
    } else {
      words.push(word);
    }
  }
  return words;
}

// 🆕 قياس العرض الدقيق والآمن للنصوص العربية RTL مع مراعاة الحركات
export function measureTextWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  fontFamily: string,
  tracking: number
): number {
  ctx.save();
  ctx.font = `${fontSize}px ${formatFontFamilyForCanvas(fontFamily)}`;
  ctx.direction = 'rtl';
  const metrics = ctx.measureText(text);
  let w = metrics.width;
  
  if (w === 0 && text.length > 0) {
    w = text.length * fontSize * 0.52;
  }
  
  ctx.restore();
  return w + (tracking > 0 && text.length > 1 ? (text.length - 1) * tracking : 0);
}

// 🆕 حساب الارتفاع المطابق لتمثيل CSS داخل متصفحات الويب
export function calculateActualTextHeight(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  fontSize: number,
  fontFamily: string,
  lineHeight: number
): number {
  if (!lines || lines.length === 0) return 0;
  const lineH = Math.max(fontSize, fontSize * lineHeight);
  return lines.length * lineH;
}

// ⚡ خوارزمية ذكية متقدمة لتوزيع وموازنة الكلمات على الأسطر هندسياً
export function balanceWordsIntoLines(
  words: string[],
  lineCount: number,
  maxW: number,
  bubbleType: BubbleShapeType,
  padFactor: number,
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string,
  tracking: number,
  geom?: ProfileGeom
): string[] {
  if (!words || words.length === 0) return [];
  if (lineCount <= 1 || words.length <= 1) return [words.join(' ')];

  const K = Math.max(1, Math.min(lineCount, words.length));
  const N = words.length;
  const wordWidths = words.map(w => measureTextWidth(ctx, w, fontSize, fontFamily, tracking));
  const spaceWidth = measureTextWidth(ctx, ' ', fontSize, fontFamily, tracking);

  const limits = Array.from({ length: K }, (_, i) => maxW * padFactor * getLineWidthRatio(i, K, bubbleType, geom));

  const ratios = Array.from({ length: K }, (_, i) => getLineWidthRatio(i, K, bubbleType, geom));
  const sumRatios = ratios.reduce((a, b) => a + b, 0) || 1;
  const totalWordsWidth = wordWidths.reduce((a, b) => a + b, 0) + (N - K) * spaceWidth;
  const targets = ratios.map(r => (totalWordsWidth * r) / sumRatios);

  const getSublineWidth = (start: number, end: number): number => {
    if (start >= end) return 0;
    let w = 0;
    for (let idx = start; idx < end; idx++) {
      w += wordWidths[idx];
    }
    w += (end - start - 1) * spaceWidth;
    return w;
  };

  const dp: number[][] = Array.from({ length: K + 1 }, () => Array(N + 1).fill(Infinity));
  const parent: number[][] = Array.from({ length: K + 1 }, () => Array(N + 1).fill(-1));

  dp[0][0] = 0;

  for (let k = 1; k <= K; k++) {
    const limitK = limits[k - 1] || (maxW * padFactor);
    const targetK = targets[k - 1];

    for (let i = k; i <= N; i++) {
      for (let j = k - 1; j < i; j++) {
        if (dp[k - 1][j] === Infinity) continue;

        const w = getSublineWidth(j, i);
        let cost = 0;

        if (w > limitK) {
          const overflow = w - limitK;
          cost = 50000 + overflow * 80;
        } else {
          const diff = w - targetK;
          cost = diff * diff;
        }

        const totalCost = dp[k - 1][j] + cost;
        if (totalCost < dp[k][i]) {
          dp[k][i] = totalCost;
          parent[k][i] = j;
        }
      }
    }
  }

  let curr = N;
  const partition: number[] = [];
  for (let k = K; k >= 1; k--) {
    const p = parent[k][curr];
    if (p === -1) break;
    partition.unshift(p);
    curr = p;
  }

  if (partition.length === K) {
    const lines: string[] = [];
    let start = 0;
    for (let k = 0; k < K; k++) {
      const end = k === K - 1 ? N : partition[k + 1];
      lines.push(words.slice(start, end).join(' '));
      start = end;
    }
    return lines.filter(l => l.trim().length > 0);
  }

  const fallbackLines: string[][] = Array.from({ length: K }, () => []);
  let currentLine = 0;
  let currentLineWidth = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wWidth = wordWidths[i];
    const remainingWords = words.length - i;
    const remainingLines = K - currentLine;

    if (remainingWords <= remainingLines && fallbackLines[currentLine].length > 0 && currentLine < K - 1) {
      currentLine++;
      currentLineWidth = 0;
    } else if (fallbackLines[currentLine].length > 0 && currentLine < K - 1) {
      const limit = limits[currentLine] || (maxW * padFactor);
      const projectedWidth = currentLineWidth + spaceWidth + wWidth;
      if (projectedWidth > limit) {
        currentLine++;
        currentLineWidth = 0;
      }
    }

    if (currentLine >= K) {
      currentLine = K - 1;
    }

    if (!fallbackLines[currentLine]) {
      fallbackLines[currentLine] = [];
    }

    fallbackLines[currentLine].push(word);
    currentLineWidth = currentLineWidth === 0 ? wWidth : currentLineWidth + spaceWidth + wWidth;
  }

  return fallbackLines.filter(l => l && l.length > 0).map(l => l.join(' '));
}

export function calculateOptimalFontSize(
  text: string,
  containerWidth: number,
  containerHeight: number,
  fontFamily: string,
  lineHeight: number,
  tracking: number
): number {
  const MIN = 10;
  const safeW = Math.max(20, containerWidth);
  const safeH = Math.max(20, containerHeight);
  const MAX = Math.min(120, Math.floor(safeH * 0.92));
  if (MAX <= MIN) return MIN;

  const paddingX = safeW * 0.02;
  const paddingY = safeH * 0.02;
  const availW = Math.max(15, safeW - paddingX * 2);
  const availH = Math.max(15, safeH - paddingY * 2);

  const ctx = getSharedCtx();
  ctx.save();
  ctx.font = `${MIN}px ${formatFontFamilyForCanvas(fontFamily)}`;
  ctx.direction = 'rtl';

  const allWords = getSmartWords(text);
  if (allWords.length === 0) {
    ctx.restore();
    return 18;
  }

  let lo = MIN;
  let hi = MAX;
  let best = MIN;
  const precision = 1.0;

  while (hi - lo >= precision) {
    const mid = Math.round((lo + hi) / 2);
    ctx.font = `${mid}px ${formatFontFamilyForCanvas(fontFamily)}`;

    const lineH = mid * lineHeight;
    const maxL = Math.max(1, Math.floor(availH / lineH));
    
    let fits = true;
    let currentLineWidth = 0;
    let linesUsed = 1;
    const spaceW = ctx.measureText(' ').width;

    for (let i = 0; i < allWords.length; i++) {
      const w = ctx.measureText(allWords[i]).width + (tracking > 0 ? tracking : 0);
      if (currentLineWidth === 0) {
        currentLineWidth = w;
      } else if (currentLineWidth + spaceW + w <= availW) {
        currentLineWidth += spaceW + w;
      } else {
        linesUsed++;
        currentLineWidth = w;
        if (linesUsed > maxL || currentLineWidth > availW) {
          fits = false;
          break;
        }
      }
    }

    if (fits) {
      best = mid;
      lo = mid + precision;
    } else {
      hi = mid - precision;
    }
  }

  ctx.restore();
  return best;
}

// ⚡ تمطيط تلقائي أنيق يحافظ على التحام الكلمة دون شقوق
export function tatweelLineLight(
  line: string,
  targetWidth: number,
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string
): string {
  const TATWEEL = 'ـ';
  const TARGET_FILL = 0.94;

  ctx.font = `${fontSize}px ${formatFontFamilyForCanvas(fontFamily)}`;
  let currentWidth = ctx.measureText(line).width;

  if (currentWidth >= targetWidth * 0.88) return line;

  const words = line.split(' ');
  if (words.length === 0) return line;

  const candidates: Array<{ wordIndex: number; word: string; anchorIdx: number; coreLength: number }> = [];

  words.forEach((word, wi) => {
    const { core } = splitWord(word);
    const anchorIdx = getBestAnchorInWord(word);
    if (anchorIdx !== -1) {
      candidates.push({
        wordIndex: wi,
        word,
        anchorIdx,
        coreLength: core.length,
      });
    }
  });

  if (candidates.length === 0) return line;

  candidates.sort((a, b) => b.coreLength - a.coreLength);
  const chosen = candidates[0];

  let currentWord = chosen.word;
  let insertIdx = chosen.anchorIdx + 1;
  while (insertIdx < currentWord.length && isDiacritic(currentWord[insertIdx])) {
    insertIdx++;
  }

  for (let round = 0; round < 6; round++) {
    currentWord = currentWord.slice(0, insertIdx) + TATWEEL + currentWord.slice(insertIdx);
    const testWords = [...words];
    testWords[chosen.wordIndex] = currentWord;
    currentWidth = ctx.measureText(testWords.join(' ')).width;
    if (currentWidth >= targetWidth * TARGET_FILL) {
      return testWords.join(' ');
    }
  }

  const finalWords = [...words];
  finalWords[chosen.wordIndex] = currentWord;
  return finalWords.join(' ');
}

// ⚡ تمطيط السطر المتوازن مع ضمان عدم وجود شقوق
export function tatweelLine(
  text: string,
  targetWidth: number,
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string,
  strength: number = 3
): string {
  const TATWEEL = 'ـ';
  let words = text.split(' ');

  ctx.font = `${fontSize}px ${formatFontFamilyForCanvas(fontFamily)}`;
  let currentWidth = ctx.measureText(words.join(' ')).width;
  if (currentWidth >= targetWidth * 0.96) return text;

  const wordAnchors: Array<{ wordIndex: number; anchorIdx: number }> = [];
  words.forEach((word, wordIdx) => {
    const anchorIdx = getBestAnchorInWord(word);
    if (anchorIdx !== -1) {
      wordAnchors.push({ wordIndex: wordIdx, anchorIdx });
    }
  });

  if (wordAnchors.length === 0) return text;

  let attempts = 0;
  const maxAttempts = strength * 12;

  while (attempts < maxAttempts) {
    currentWidth = ctx.measureText(words.join(' ')).width;
    if (currentWidth >= targetWidth * 0.97) break;

    const item = wordAnchors[attempts % wordAnchors.length];
    const word = words[item.wordIndex];

    let insertIdx = item.anchorIdx + 1;
    while (insertIdx < word.length && isDiacritic(word[insertIdx])) {
      insertIdx++;
    }

    if (insertIdx <= word.length) {
      words[item.wordIndex] = word.slice(0, insertIdx) + TATWEEL + word.slice(insertIdx);
    }

    attempts++;
  }

  return words.join(' ');
}

// 🆕 دالة التمطيط اليدوي التدريجي بالخطوة دون إحداث فجوات
export function stepTatweel(
  text: string,
  stepCount: number = 1,
  selectedText?: string
): string {
  const TATWEEL = 'ـ';
  if (!text || stepCount <= 0) return text;

  if (selectedText && selectedText.trim().length > 0) {
    const sel = selectedText.trim();
    if (!text.includes(sel)) return text;

    const anchorIdx = getBestAnchorInWord(sel);
    if (anchorIdx === -1) return text;

    let insertIdx = anchorIdx + 1;
    while (insertIdx < sel.length && isDiacritic(sel[insertIdx])) {
      insertIdx++;
    }

    const tatweels = TATWEEL.repeat(stepCount);
    const modifiedWord = sel.slice(0, insertIdx) + tatweels + sel.slice(insertIdx);
    return text.replace(sel, modifiedWord);
  }

  const lines = text.split('\n');
  const modifiedLines = lines.map(line => {
    const words = line.split(' ');
    if (words.length === 0) return line;

    let bestWi = -1;
    let maxLen = 0;
    let bestAnchor = -1;

    words.forEach((w, wi) => {
      const { core } = splitWord(w);
      const anchor = getBestAnchorInWord(w);
      if (anchor !== -1 && core.length > maxLen) {
        maxLen = core.length;
        bestWi = wi;
        bestAnchor = anchor;
      }
    });

    if (bestWi === -1 || bestAnchor === -1) return line;

    const targetWord = words[bestWi];
    let insertIdx = bestAnchor + 1;
    while (insertIdx < targetWord.length && isDiacritic(targetWord[insertIdx])) {
      insertIdx++;
    }

    const tatweels = TATWEEL.repeat(stepCount);
    words[bestWi] = targetWord.slice(0, insertIdx) + tatweels + targetWord.slice(insertIdx);
    return words.join(' ');
  });

  return modifiedLines.join('\n');
}

export interface BubbleMetrics {
  innerRect: { x: number; y: number; w: number; h: number };
  centerX: number;
  centerY: number;
  avgLineWidth: number;
  fillRatio: number;
}

export function measureBubbleFromMask(
  mask: Uint8Array,
  imgW: number,
  imgH: number,
  bboxX: number,
  bboxY: number,
  bboxW: number,
  bboxH: number
): BubbleMetrics {
  const maxX = bboxX + bboxW;
  const maxY = bboxY + bboxH;

  let totalPixels = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = bboxY; y < maxY; y += 2) {
    const rowOffset = y * imgW;
    for (let x = bboxX; x < maxX; x += 2) {
      if (mask[rowOffset + x] === 1) {
        totalPixels += 4;
        sumX += x * 4;
        sumY += y * 4;
      }
    }
  }

  const centerX = totalPixels > 0 ? sumX / totalPixels : bboxX + bboxW / 2;
  const centerY = totalPixels > 0 ? sumY / totalPixels : bboxY + bboxH / 2;
  const fillRatio = totalPixels > 0 ? totalPixels / (bboxW * bboxH) : 0.80;

  const usableRatio = fillRatio > 0.85 ? 0.94 : 0.84;
  const innerW = Math.max(25, Math.round(bboxW * usableRatio));
  const innerH = Math.max(25, Math.round(bboxH * usableRatio));
  const innerX = Math.round(centerX - innerW / 2);
  const innerY = Math.round(centerY - innerH / 2);

  return {
    innerRect: {
      x: Math.max(bboxX, innerX),
      y: Math.max(bboxY, innerY),
      w: innerW,
      h: innerH,
    },
    centerX,
    centerY,
    avgLineWidth: innerW,
    fillRatio,
  };
}

// ============================================================================
// 📐 مواصفات تنسيق النص لكل شكل فقاعة (مقاسة من الصور المرجعية)
// ============================================================================

/** هامش الأمان الافتراضي (يقابل marginPercent = 10) */
const PAD_DEFAULT = 0.95;

/**
 * نمط تنسيق النص داخل الفقاعة:
 *  - classic: التنسيق السابق (الافتراضي)
 *  - reference: التنسيق المقيس من الصور المرجعية (صندوق نص أصغر وتضيّق هندسي للأسطر)
 */
export type BubbleLayoutMode = 'classic' | 'reference';
let bubbleLayoutMode: BubbleLayoutMode = 'classic';
export function setBubbleLayoutMode(mode: BubbleLayoutMode): void {
  bubbleLayoutMode = mode === 'reference' ? 'reference' : 'classic';
}
export function getBubbleLayoutMode(): BubbleLayoutMode {
  return bubbleLayoutMode;
}

export interface BubbleLayoutSpec {
  /** ellipse: عرض الأسطر يتضيّق نحو الطرفين، box: عرض ثابت */
  family: 'ellipse' | 'box';
  /** أقصى عرض للسطر الأوسط كنسبة من عرض جسم الفقاعة */
  widthFrac: number;
  /** الارتفاع الكلي لكتلة النص كنسبة من ارتفاع جسم الفقاعة */
  heightFrac: number;
  /** ملف التضيّق الاحتياطي عند عدم معرفة ارتفاع الحاوية: [نسبة الطرف، الأس] */
  fallback: [number, number];
}

export const BUBBLE_LAYOUT_SPECS: Record<BubbleShapeType, BubbleLayoutSpec> = {
  normal_oval:   { family: 'ellipse', widthFrac: 0.89, heightFrac: 0.72, fallback: [0.60, 1.6] },
  vertical_oval: { family: 'ellipse', widthFrac: 0.81, heightFrac: 0.68, fallback: [0.76, 2.0] },
  spiky_shout:   { family: 'ellipse', widthFrac: 0.66, heightFrac: 0.70, fallback: [0.78, 2.0] },
  thought_cloud: { family: 'ellipse', widthFrac: 0.76, heightFrac: 0.70, fallback: [0.68, 1.2] },
  dark_bubble:   { family: 'ellipse', widthFrac: 0.89, heightFrac: 0.72, fallback: [0.60, 1.6] },
  narrative_box: { family: 'box',     widthFrac: 0.85, heightFrac: 0.76, fallback: [1, 1] },
  system_box:    { family: 'box',     widthFrac: 0.85, heightFrac: 0.76, fallback: [1, 1] },
};

export function getBubbleLayoutSpec(bubbleType?: BubbleShapeType | null): BubbleLayoutSpec {
  return BUBBLE_LAYOUT_SPECS[bubbleType || 'normal_oval'] || BUBBLE_LAYOUT_SPECS.normal_oval;
}

export interface ProfileGeom {
  /** ارتفاع طبقة النص (صندوق النص) */
  layerH: number;
  /** ارتفاع السطر الواحد (حجم الخط × تباعد الأسطر) */
  lineH: number;
}

/**
 * نسبة العرض المسموح للسطر رقم lineIndex (من 0) إلى عرض صندوق النص.
 * في الأشكال البيضاوية والسحابية والمسننة: عرض الوتر الهندسي للقطع الناقص عند الحافة الأبعد للسطر،
 * وهو ما يطابق توزيع الأسطر في الصور المرجعية (قصير ثم طويل ثم قصير).
 * في الصناديق: عرض ثابت.
 */
export function getLineWidthRatio(
  lineIndex: number,
  totalLines: number,
  bubbleType: BubbleShapeType,
  geom?: ProfileGeom
): number {
  if (bubbleLayoutMode === 'classic') {
    // ← التنسيق السابق كما كان
    if (bubbleType === 'narrative_box' || bubbleType === 'system_box') return 0.98;
    if (totalLines <= 1) return 0.96;
    const midC = (totalLines - 1) / 2;
    const tC = Math.abs(lineIndex - midC) / (midC || 1);
    switch (bubbleType) {
      case 'normal_oval':   return 0.78 + 0.22 * (1 - Math.pow(tC, 1.6));
      case 'vertical_oval': return 0.70 + 0.28 * (1 - Math.pow(tC, 1.4));
      case 'spiky_shout':   return 0.58 + 0.42 * (1 - Math.pow(tC, 2.2));
      case 'thought_cloud': return 0.76 + 0.22 * (1 - Math.pow(tC, 1.7));
      case 'dark_bubble':   return 0.80 + 0.20 * (1 - Math.pow(tC, 1.6));
      default:              return 0.90;
    }
  }

  const spec = getBubbleLayoutSpec(bubbleType);
  if (spec.family === 'box') return 1;

  if (geom && geom.layerH > 0 && geom.lineH > 0) {
    const center = (totalLines - 1) / 2;
    const yFar = Math.abs(lineIndex - center) * geom.lineH + geom.lineH / 2;
    const bodyHalfH = geom.layerH / (2 * spec.heightFrac);
    const u = Math.min(0.96, yFar / bodyHalfH);
    return Math.max(0.4, Math.sqrt(1 - u * u));
  }

  if (totalLines <= 1) return 0.97;
  const mid = (totalLines - 1) / 2;
  const t = Math.abs(lineIndex - mid) / (mid || 1);
  const [base, p] = spec.fallback;
  return base + (1 - base) * (1 - Math.pow(t, p));
}

/**
 * يقيس "جسم" الفقاعة من القناع باستبعاد الذيل والنتوءات الرفيعة:
 * الصفوف التي عرضها ≥ 45% من أعرض صف، ثم الأعمدة التي ارتفاعها ≥ 45% من أطول عمود ضمنها.
 */
export function measureBubbleBody(
  mask: Uint8Array,
  imgW: number,
  imgH: number,
  bboxX: number,
  bboxY: number,
  bboxW: number,
  bboxH: number
): { x: number; y: number; w: number; h: number; cx: number; cy: number } {
  const x0 = Math.max(0, bboxX);
  const y0 = Math.max(0, bboxY);
  const x1 = Math.min(imgW, bboxX + bboxW);
  const y1 = Math.min(imgH, bboxY + bboxH);
  const fallback = {
    x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0),
    cx: (x0 + x1) / 2, cy: (y0 + y1) / 2,
  };
  if (x1 <= x0 || y1 <= y0) return fallback;

  const rowW = new Int32Array(y1 - y0);
  let maxRow = 0;
  for (let y = y0; y < y1; y++) {
    let c = 0;
    const off = y * imgW;
    for (let x = x0; x < x1; x++) c += mask[off + x];
    rowW[y - y0] = c;
    if (c > maxRow) maxRow = c;
  }
  if (maxRow === 0) return fallback;

  let ty0 = -1, ty1 = -1;
  for (let i = 0; i < rowW.length; i++) {
    if (rowW[i] >= maxRow * 0.45) {
      if (ty0 < 0) ty0 = i;
      ty1 = i;
    }
  }
  if (ty0 < 0) return fallback;

  const colH = new Int32Array(x1 - x0);
  let maxCol = 0;
  for (let y = y0 + ty0; y <= y0 + ty1; y++) {
    const off = y * imgW;
    for (let x = x0; x < x1; x++) colH[x - x0] += mask[off + x];
  }
  for (let i = 0; i < colH.length; i++) if (colH[i] > maxCol) maxCol = colH[i];
  if (maxCol === 0) return fallback;

  let tx0 = -1, tx1 = -1;
  for (let i = 0; i < colH.length; i++) {
    if (colH[i] >= maxCol * 0.45) {
      if (tx0 < 0) tx0 = i;
      tx1 = i;
    }
  }
  if (tx0 < 0) return fallback;

  const bx = x0 + tx0;
  const by = y0 + ty0;
  const bw = tx1 - tx0 + 1;
  const bh = ty1 - ty0 + 1;
  return { x: bx, y: by, w: bw, h: bh, cx: bx + bw / 2, cy: by + bh / 2 };
}

export function computeLayerBoundsFromWand(params: {
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
  scaleX: number;
  scaleY: number;
  marginPercent: number;
  mask?: Uint8Array | null;
  imgW?: number;
  imgH?: number;
  bubbleType?: BubbleShapeType | null;
}): { left: number; top: number; width: number; height: number } {
  const { bboxX, bboxY, bboxW, bboxH, scaleX, scaleY, mask, imgW, imgH, bubbleType } = params;

  const safeScaleX = scaleX > 0 ? scaleX : 1;
  const safeScaleY = scaleY > 0 ? scaleY : 1;

  const dispX = bboxX / safeScaleX;
  const dispY = bboxY / safeScaleY;
  const dispW = Math.max(25, bboxW / safeScaleX);
  const dispH = Math.max(25, bboxH / safeScaleY);

  if (bubbleLayoutMode === 'classic' && mask && mask.length > 0 && imgW && imgH && bboxW > 0 && bboxH > 0) {
    // ← التنسيق السابق كما كان
    const metrics = measureBubbleFromMask(mask, imgW, imgH, bboxX, bboxY, bboxW, bboxH);
    const { innerRect } = metrics;
    const shrinkFactor = bubbleType === 'spiky_shout' ? 0.72 : 1.0;
    const innerDispW = Math.max(25, (innerRect.w * shrinkFactor) / safeScaleX);
    const innerDispH = Math.max(25, (innerRect.h * shrinkFactor) / safeScaleY);
    const trueCenterX = metrics.centerX / safeScaleX;
    const trueCenterY = metrics.centerY / safeScaleY;
    return {
      left:   Math.round(Math.max(0, trueCenterX - innerDispW / 2)),
      top:    Math.round(Math.max(0, trueCenterY - innerDispH / 2)),
      width:  Math.round(innerDispW),
      height: Math.round(innerDispH),
    };
  }

  if (mask && mask.length > 0 && imgW && imgH && bboxW > 0 && bboxH > 0) {
    // صندوق النص يُحسب من جسم الفقاعة (دون الذيل) ومن مواصفات الشكل المقيسة من الصور المرجعية
    const body = measureBubbleBody(mask, imgW, imgH, bboxX, bboxY, bboxW, bboxH);
    const spec = getBubbleLayoutSpec(bubbleType);

    const layerWpx = (body.w * spec.widthFrac) / PAD_DEFAULT;
    const layerHpx = body.h * spec.heightFrac;

    const innerDispW = Math.max(25, layerWpx / safeScaleX);
    const innerDispH = Math.max(25, layerHpx / safeScaleY);

    const trueCenterX = body.cx / safeScaleX;
    const trueCenterY = body.cy / safeScaleY;
    const finalLeft = Math.max(0, trueCenterX - innerDispW / 2);
    const finalTop  = Math.max(0, trueCenterY - innerDispH / 2);

    return {
      left:   Math.round(finalLeft),
      top:    Math.round(finalTop),
      width:  Math.round(innerDispW),
      height: Math.round(innerDispH),
    };
  }

  const padX = dispW * 0.04;
  const padY = dispH * 0.04;

  return {
    left:   Math.max(0, Math.round(dispX + padX)),
    top:    Math.max(0, Math.round(dispY + padY)),
    width:  Math.max(25, Math.round(dispW - padX * 2)),
    height: Math.max(25, Math.round(dispH - padY * 2)),
  };
}

// ============================================================================
// 🔎 تصنيف شكل الفقاعة إلى أقرب الأشكال المرجعية (بيضاوية، رأسية، صراخ، تفكير، صندوق)
// ============================================================================

export interface BubbleShapeAnalysis {
  type: BubbleShapeType;
  aspect: number;
  rect: number;
  peaks: number;
  roughP90: number;
}

const SHAPE_BINS = 180;

/** أعلى تحدّب يُحاوَل معه فصل الفقاعات المتشابكة (قيمة أعلى = منطقة محدبة لا تحتاج فصلاً) */
const SPLIT_MAX_SOLIDITY = 0.93;

function circularMovingAverage(v: Float32Array, w: number): Float32Array {
  const n = v.length;
  const out = new Float32Array(n);
  const half = Math.floor(w / 2);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = -half; k <= half; k++) sum += v[(i + k + n) % n];
    out[i] = sum / (2 * half + 1);
  }
  return out;
}

/**
 * يصنّف شكل الفقاعة من قناعها (يُفترض أن ثقوب النص مملوءة):
 *  - صندوق: مستطيل تقريباً (ملء الصندوق المحيط ≥ 0.97)
 *  - صراخ: حافة شديدة التعرّج بنتوءات كثيرة
 *  - تفكير: حافة متموّجة بفصوص سحابية
 *  - بيضاوية: حافة ملساء؛ رأسية إن كانت أقرب للمربع/الطولية، وإلا عادية
 */
export function classifyBubbleShape(
  mask: Uint8Array,
  imgW: number,
  imgH: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): BubbleShapeAnalysis {
  const bboxW = bounds.maxX - bounds.minX + 1;
  const bboxH = bounds.maxY - bounds.minY + 1;
  const body = measureBubbleBody(mask, imgW, imgH, bounds.minX, bounds.minY, bboxW, bboxH);
  const aspect = body.w / Math.max(1, body.h);
  const result = (type: BubbleShapeType, rect = 0, peaks = 0, roughP90 = 0): BubbleShapeAnalysis =>
    ({ type, aspect, rect, peaks, roughP90 });

  if (body.w < 20 || body.h < 20) return result(aspect < 1.12 ? 'vertical_oval' : 'normal_oval');

  const x0 = body.x, y0 = body.y, x1 = body.x + body.w, y1 = body.y + body.h;

  // الكتلة والمركز والعزوم داخل الجسم
  let area = 0, sx = 0, sy = 0;
  for (let y = y0; y < y1; y++) {
    const off = y * imgW;
    for (let x = x0; x < x1; x++) {
      if (mask[off + x] === 1) { area++; sx += x; sy += y; }
    }
  }
  if (area === 0) return result('normal_oval');
  const rect = area / (body.w * body.h);
  if (rect >= 0.97) return result('narrative_box', rect);

  // الملف الشعاعي والعزوم يُحسبان على كامل المنطقة (بما فيها القمم) كي تُغطى كل الاتجاهات
  const fx0 = Math.max(0, bounds.minX), fx1 = Math.min(imgW, bounds.maxX + 1);
  const fy0 = Math.max(0, bounds.minY), fy1 = Math.min(imgH, bounds.maxY + 1);
  let fArea = 0, fsx = 0, fsy = 0;
  for (let y = fy0; y < fy1; y++) {
    const off = y * imgW;
    for (let x = fx0; x < fx1; x++) {
      if (mask[off + x] === 1) { fArea++; fsx += x; fsy += y; }
    }
  }
  const cx = fsx / fArea, cy = fsy / fArea;
  let sxx = 0, syy = 0, sxy = 0;
  for (let y = fy0; y < fy1; y++) {
    const off = y * imgW;
    for (let x = fx0; x < fx1; x++) {
      if (mask[off + x] === 1) {
        const dx = x - cx, dy = y - cy;
        sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
      }
    }
  }
  sxx /= fArea; syy /= fArea; sxy /= fArea;
  const tr = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc, l2 = Math.max(1e-6, tr / 2 - disc);
  const A = 2 * Math.sqrt(l1), Bm = 2 * Math.sqrt(l2);
  const angle = Math.abs(sxy) < 1e-9 && sxx >= syy ? 0 : Math.atan2(l1 - sxx, sxy);

  // الملف الشعاعي للحافة نسبةً إلى القطع الناقص المطابق (أبعد نقطة في كل اتجاه)
  const prof = new Float32Array(SHAPE_BINS).fill(NaN);
  const isIn = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < imgW && y < imgH && mask[y * imgW + x] === 1;
  for (let y = fy0; y < fy1; y++) {
    for (let x = fx0; x < fx1; x++) {
      if (mask[y * imgW + x] !== 1) continue;
      if (isIn(x - 1, y) && isIn(x + 1, y) && isIn(x, y - 1) && isIn(x, y + 1)) continue;
      const dx = x - cx, dy = y - cy;
      const th = Math.atan2(dy, dx);
      const r = Math.hypot(dx, dy);
      const rel = th - angle;
      const re = (A * Bm) / Math.sqrt((Bm * Math.cos(rel)) ** 2 + (A * Math.sin(rel)) ** 2);
      const rn = r / re;
      const bin = Math.min(SHAPE_BINS - 1, Math.floor(((th + Math.PI) / (2 * Math.PI)) * SHAPE_BINS));
      if (!(prof[bin] >= rn)) prof[bin] = rn;
    }
  }
  // ملء الفراغات بالاستيفاء الدائري
  const known: number[] = [];
  for (let i = 0; i < SHAPE_BINS; i++) if (!Number.isNaN(prof[i])) known.push(i);
  if (known.length < SHAPE_BINS * 0.5) return result(aspect < 1.12 ? 'vertical_oval' : 'normal_oval', rect);
  for (let i = 0; i < SHAPE_BINS; i++) {
    if (!Number.isNaN(prof[i])) continue;
    let prev = i, next = i, dp = 0, dn = 0;
    while (Number.isNaN(prof[prev])) { prev = (prev - 1 + SHAPE_BINS) % SHAPE_BINS; dp++; }
    while (Number.isNaN(prof[next])) { next = (next + 1) % SHAPE_BINS; dn++; }
    prof[i] = (prof[prev] * dn + prof[next] * dp) / (dp + dn);
  }

  const sm = circularMovingAverage(prof, 3);
  const low = circularMovingAverage(prof, 23);
  const hp = new Float32Array(SHAPE_BINS);
  for (let i = 0; i < SHAPE_BINS; i++) hp[i] = sm[i] - low[i];

  let peaks = 0;
  for (let i = 0; i < SHAPE_BINS; i++) {
    if (hp[i] > 0.025 && sm[i] >= sm[(i - 3 + SHAPE_BINS) % SHAPE_BINS] && sm[i] >= sm[(i + 3) % SHAPE_BINS]) peaks++;
  }
  const abs = Array.from(hp, v => Math.abs(v)).sort((a, b) => a - b);
  const roughP90 = abs[Math.floor(abs.length * 0.9)];

  if (peaks >= SHAPE_THRESHOLDS.spikyPeaks || roughP90 >= SHAPE_THRESHOLDS.spikyRough) {
    return result('spiky_shout', rect, peaks, roughP90);
  }
  if (peaks >= SHAPE_THRESHOLDS.cloudPeaks || roughP90 >= SHAPE_THRESHOLDS.cloudRough) {
    return result('thought_cloud', rect, peaks, roughP90);
  }
  return result(aspect < SHAPE_THRESHOLDS.verticalAspect ? 'vertical_oval' : 'normal_oval', rect, peaks, roughP90);
}

/**
 * التصنيف السابق (كثافة الملء + تذبذب المسافات + عدد مقاطع الحافة). يُستخدم في النمط الكلاسيكي.
 */
export function classifyBubbleShapeLegacy(
  mask: Uint8Array,
  imgW: number,
  imgH: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): BubbleShapeType {
  const { minX, maxX, minY, maxY } = bounds;
  const foundW = maxX - minX + 1;
  const foundH = maxY - minY + 1;

  // مقاطع حافة القناع (أفقية ورأسية)
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const borderX0 = Math.max(0, minX - 1);
  const borderX1 = Math.min(imgW - 1, maxX + 1);
  const borderY0 = Math.max(0, minY - 1);
  const borderY1 = Math.min(imgH - 1, maxY + 1);

  for (let y = borderY0; y <= borderY1; y++) {
    let inRun = false;
    let rStart = 0;
    for (let x = borderX0; x <= borderX1 + 1; x++) {
      const above = (y > 0 && x <= borderX1) ? mask[(y - 1) * imgW + x] : 0;
      const below = (y < imgH && x <= borderX1) ? mask[y * imgW + x] : 0;
      const isEdge = above !== below;
      if (isEdge && !inRun) { inRun = true; rStart = x; }
      if (!isEdge && inRun) { segs.push({ x1: rStart, y1: y, x2: x, y2: y }); inRun = false; }
    }
  }
  for (let x = borderX0; x <= borderX1; x++) {
    let inRun = false;
    let rStart = 0;
    for (let y = borderY0; y <= borderY1 + 1; y++) {
      const left = (x > 0 && y <= borderY1) ? mask[y * imgW + (x - 1)] : 0;
      const right = (x < imgW && y <= borderY1) ? mask[y * imgW + x] : 0;
      const isEdge = left !== right;
      if (isEdge && !inRun) { inRun = true; rStart = y; }
      if (!isEdge && inRun) { segs.push({ x1: x, y1: rStart, x2: x, y2: y }); inRun = false; }
    }
  }

  let activePixels = 0, sumX = 0, sumY = 0;
  for (let y = minY; y <= maxY; y++) {
    const rowOffset = y * imgW;
    for (let x = minX; x <= maxX; x++) {
      if (mask[rowOffset + x] === 1) { activePixels++; sumX += x; sumY += y; }
    }
  }
  if (activePixels === 0) return 'normal_oval';

  const aspect = foundW / foundH;
  const centerX = sumX / activePixels;
  const centerY = sumY / activePixels;
  const bboxArea = foundW * foundH;
  const density = activePixels / bboxArea;

  let totalDist = 0;
  const dists: number[] = [];
  segs.forEach(sg => {
    const midX = (sg.x1 + sg.x2) / 2;
    const midY = (sg.y1 + sg.y2) / 2;
    const dist = Math.sqrt((midX - centerX) * (midX - centerX) + (midY - centerY) * (midY - centerY));
    dists.push(dist);
    totalDist += dist;
  });
  const avgDist = totalDist / (dists.length || 1);
  let distVar = 0;
  dists.forEach(d => { distVar += (d - avgDist) * (d - avgDist); });
  const shapeCV = Math.sqrt(distVar / (dists.length || 1)) / (avgDist || 1);

  if (density >= 0.85) return 'narrative_box';
  if (shapeCV > 0.125 || (segs.length / Math.sqrt(bboxArea) > 5.5)) return 'spiky_shout';
  if (shapeCV > 0.082 && segs.length / Math.sqrt(bboxArea) > 3.0) return 'thought_cloud';
  if (aspect >= 0.5 && aspect <= 1.45) return 'vertical_oval';
  return 'normal_oval';
}

// عتبات التصنيف (مضبوطة على الصور المرجعية؛ تُعدَّل بعد المعايرة)
export const SHAPE_THRESHOLDS = {
  spikyPeaks: 15,
  spikyRough: 0.06,
  cloudPeaks: 5,
  cloudRough: 0.032,
  verticalAspect: 1.12,
};

// يمطّط السطر نحو عرضه المستهدف؛ في الأشكال البيضاوية يبقى السطر الأخير قصيراً طبيعياً (نهاية الفقرة)
// إلا إن كان قريباً من عرضه المستهدف، أما في الصناديق فتُمطَّط كل الأسطر لتتساوى كما في الصور المرجعية.
function stretchLineForShape(
  line: string,
  idx: number,
  total: number,
  bubbleType: BubbleShapeType,
  targetW: number,
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string
): string {
  if (bubbleLayoutMode === 'reference' && getBubbleLayoutSpec(bubbleType).family === 'ellipse' && idx === total - 1) {
    ctx.font = `${fontSize}px ${formatFontFamilyForCanvas(fontFamily)}`;
    if (ctx.measureText(line).width < targetW * 0.8) return line;
  }
  return tatweelLineLight(line, targetW, ctx, fontSize, fontFamily);
}

export function wrapTextToShape(
  text: string,
  bubbleType: BubbleShapeType,
  maxW: number,
  maxH: number,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
  tracking: number,
  marginPercent: number = 10,
  lineCountOverride?: number,
  applyStretch: boolean = true
): { lines: string[]; unstretchedLines: string[]; optimalFontSize: number } {
  const safeW = Math.max(25, maxW);
  const safeH = Math.max(25, maxH);
  const padFactor = Math.max(0.88, 1 - (marginPercent / 100) * 0.5);
  const lineH = Math.max(12, fontSize * lineHeight);

  const ctx = getSharedCtx();
  ctx.font = `${fontSize}px ${formatFontFamilyForCanvas(fontFamily)}`;
  ctx.direction = 'rtl';
  const geom: ProfileGeom = { layerH: safeH, lineH };

  const allWords = getSmartWords(text);

  if (allWords.length === 0) {
    return { lines: [''], unstretchedLines: [''], optimalFontSize: fontSize };
  }

  const maxLinesFromHeight = Math.max(1, Math.floor(safeH / lineH));
  const minL = lineCountOverride ?? 1;
  const maxL = lineCountOverride ?? maxLinesFromHeight;

  let bestLines: string[] = [];

  for (let linesCount = minL; linesCount <= maxL; linesCount++) {
    const balanced = balanceWordsIntoLines(
      allWords,
      linesCount,
      safeW,
      bubbleType,
      padFactor,
      ctx,
      fontSize,
      fontFamily,
      tracking,
      geom
    );

    let fits = true;
    for (let i = 0; i < balanced.length; i++) {
      const ratio = getLineWidthRatio(i, balanced.length, bubbleType, geom);
      const limit = safeW * padFactor * ratio;
      const w = measureTextWidth(ctx, balanced[i], fontSize, fontFamily, tracking);
      if (w > limit) {
        fits = false;
        break;
      }
    }

    if (fits || linesCount === maxL) {
      bestLines = balanced;
      if (fits) break;
    }
  }

  if (bestLines.length === 0) bestLines = [allWords.join(' ')];

  const unstretchedLines = [...bestLines];

  const stretchedLines = bestLines.map((line, idx) => {
    if (applyStretch) {
      const ratio = getLineWidthRatio(idx, bestLines.length, bubbleType, geom);
      const targetW = safeW * padFactor * ratio;
      return stretchLineForShape(line, idx, bestLines.length, bubbleType, targetW, ctx, fontSize, fontFamily);
    }
    return line;
  });

  return { lines: stretchedLines, unstretchedLines, optimalFontSize: fontSize };
}

export function calculateOptimalFontSizeForShape(
  text: string,
  bubbleType: BubbleShapeType,
  containerWidth: number,
  containerHeight: number,
  fontFamily: string,
  lineHeight: number,
  tracking: number,
  marginPercent: number = 10,
  lineCountOverride?: number,
  applyStretch: boolean = true
): { fontSize: number; textWithBreaks: string } {
  if (!text || text.trim() === '') {
    return { fontSize: 18, textWithBreaks: '' };
  }

  const safeW = Math.max(25, containerWidth);
  const safeH = Math.max(25, containerHeight);
  const padFactor = Math.max(0.88, 1 - (marginPercent / 100) * 0.5);
  const ctx = getSharedCtx();

  let low = 10;
  let high = Math.max(low, Math.min(120, Math.floor(safeH * 0.88)));
  let bestFontSize = low;
  let bestLines: string[] = [text];
  const precision = 1.0;

  while (high - low >= precision) {
    const mid = Math.round((low + high) / 2);

    const { unstretchedLines } = wrapTextToShape(
      text,
      bubbleType,
      safeW,
      safeH,
      mid,
      fontFamily,
      lineHeight,
      tracking,
      marginPercent,
      lineCountOverride,
      false
    );

    const totalH = calculateActualTextHeight(ctx, unstretchedLines, mid, fontFamily, lineHeight);
    let fits = totalH <= safeH && unstretchedLines.length > 0;

    if (fits) {
      const geomMid: ProfileGeom = { layerH: safeH, lineH: Math.max(12, mid * lineHeight) };
      for (let i = 0; i < unstretchedLines.length; i++) {
        const ratio = getLineWidthRatio(i, unstretchedLines.length, bubbleType, geomMid);
        const limit = safeW * padFactor * ratio;
        const w = measureTextWidth(ctx, unstretchedLines[i], mid, fontFamily, tracking);
        if (w > limit) {
          fits = false;
          break;
        }
      }
    }

    if (fits) {
      bestFontSize = mid;
      bestLines = unstretchedLines;
      low = mid + precision;
    } else {
      high = mid - precision;
    }
  }

  let finalText = bestLines.join('\n');
  if (applyStretch) {
    const geomBest: ProfileGeom = { layerH: safeH, lineH: Math.max(12, bestFontSize * lineHeight) };
    const stretched = bestLines.map((line, idx) => {
      const ratio = getLineWidthRatio(idx, bestLines.length, bubbleType, geomBest);
      const targetW = safeW * padFactor * ratio;
      return stretchLineForShape(line, idx, bestLines.length, bubbleType, targetW, ctx, bestFontSize, fontFamily);
    });
    finalText = stretched.join('\n');
  }

  return { fontSize: bestFontSize, textWithBreaks: finalText };
}

export function stretchSelectedText(
  fullText: string,
  selectedText: string,
  bubbleType: BubbleShapeType,
  maxW: number,
  fontSize: number,
  fontFamily: string,
  tracking: number,
  marginPercent: number = 10,
  layerH?: number,
  lineHeight?: number
): string {
  const ctx = getSharedCtx();
  ctx.font = `${fontSize}px ${formatFontFamilyForCanvas(fontFamily)}`;
  ctx.direction = 'rtl';

  const safeW = Math.max(25, maxW);
  const padFactor = Math.max(0.88, 1 - (marginPercent / 100) * 0.5);
  const lines = fullText.split('\n');
  const totalLines = lines.length;

  const stretchedLines = lines.map((line, idx) => {
    if (line.includes(selectedText) && selectedText.trim().length > 0) {
      const geomSel: ProfileGeom | undefined = layerH && lineHeight
        ? { layerH, lineH: Math.max(12, fontSize * lineHeight) }
        : undefined;
      const ratio = getLineWidthRatio(idx, totalLines, bubbleType, geomSel);
      const targetW = safeW * padFactor * ratio;
      return tatweelLineLight(line, targetW, ctx, fontSize, fontFamily);
    }
    return line;
  });

  return stretchedLines.join('\n');
}

// ============================================================================
// 🩹 رقع التنظيف: حفظ التعديلات للمناطق المتغيّرة فقط (بدل ترميز الصفحة كاملة PNG عند كل عملية)
// ============================================================================

export interface CleaningTile { x: number; y: number; w: number; h: number; data: ImageData }
export interface CleaningPatch { tiles: CleaningTile[] }

const PATCH_TILE = 256;

/** يلتقط محتوى طبقة التنظيف الحالي في المستطيل (مقسّماً إلى بلاطات) قبل تعديله */
export function captureCleaningPatch(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  canvasW: number,
  canvasH: number
): CleaningPatch {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(canvasW, Math.ceil(rect.x + rect.w));
  const y1 = Math.min(canvasH, Math.ceil(rect.y + rect.h));
  const tiles: CleaningTile[] = [];
  for (let ty = y0; ty < y1; ty += PATCH_TILE * 2) {
    for (let tx = x0; tx < x1; tx += PATCH_TILE * 2) {
      const w = Math.min(PATCH_TILE * 2, x1 - tx);
      const h = Math.min(PATCH_TILE * 2, y1 - ty);
      if (w > 0 && h > 0) tiles.push({ x: tx, y: ty, w, h, data: ctx.getImageData(tx, ty, w, h) });
    }
  }
  return { tiles };
}

/** يستبدل محتوى البلاطات في اللوحة بمحتوى الرقعة ويعيد رقعة تحمل المحتوى الذي استُبدل (للإعادة/التراجع) */
export function swapCleaningPatch(ctx: CanvasRenderingContext2D, patch: CleaningPatch): CleaningPatch {
  const replaced: CleaningPatch = {
    tiles: patch.tiles.map(t => ({ x: t.x, y: t.y, w: t.w, h: t.h, data: ctx.getImageData(t.x, t.y, t.w, t.h) })),
  };
  // بترتيب عكسي: عند تداخل البلاطات (عدة تبييضات في عملية واحدة) يبقى الأقدم محتوى نهائياً
  for (let i = patch.tiles.length - 1; i >= 0; i--) {
    const t = patch.tiles[i];
    ctx.putImageData(t.data, t.x, t.y);
  }
  return replaced;
}

/** يدمج عدة رقع في رقعة واحدة (لعملية تمسّ أكثر من منطقة) */
export function mergeCleaningPatches(patches: Array<CleaningPatch | null | undefined>): CleaningPatch {
  const tiles: CleaningTile[] = [];
  for (const p of patches) if (p) tiles.push(...p.tiles);
  return { tiles };
}

/**
 * متتبّع ضربات الفرشاة: يلتقط البلاطات الملموسة قبل أن تُرسم عليها الضربة لأول مرة،
 * فيتكوّن في نهاية الضربة رقعة التراجع دون نسخ اللوحة كاملة.
 */
export class CleaningStrokeTracker {
  private tiles = new Map<string, CleaningTile>();
  private last: { x: number; y: number } | null = null;

  reset(): void {
    this.tiles.clear();
    this.last = null;
  }

  hasChanges(): boolean {
    return this.tiles.size > 0;
  }

  /** يُستدعى قبل رسم المقطع من النقطة السابقة إلى (x, y) */
  touch(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, x: number, y: number, brushSize: number): void {
    const r = brushSize / 2 + 3;
    const from = this.last || { x, y };
    const minX = Math.max(0, Math.floor(Math.min(from.x, x) - r));
    const minY = Math.max(0, Math.floor(Math.min(from.y, y) - r));
    const maxX = Math.min(canvasW, Math.ceil(Math.max(from.x, x) + r));
    const maxY = Math.min(canvasH, Math.ceil(Math.max(from.y, y) + r));
    this.last = { x, y };
    if (maxX <= minX || maxY <= minY) return;
    const tx0 = Math.floor(minX / PATCH_TILE), tx1 = Math.floor((maxX - 1) / PATCH_TILE);
    const ty0 = Math.floor(minY / PATCH_TILE), ty1 = Math.floor((maxY - 1) / PATCH_TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const key = `${tx},${ty}`;
        if (this.tiles.has(key)) continue;
        const x = tx * PATCH_TILE, y = ty * PATCH_TILE;
        const w = Math.min(PATCH_TILE, canvasW - x), h = Math.min(PATCH_TILE, canvasH - y);
        if (w <= 0 || h <= 0) continue;
        this.tiles.set(key, { x, y, w, h, data: ctx.getImageData(x, y, w, h) });
      }
    }
  }

  toPatch(): CleaningPatch {
    return { tiles: Array.from(this.tiles.values()) };
  }
}

// ============================================================================
// 🧼 التبييض: يستبدل بكسلات الحبر (الحروف وهالتها) فقط بلون مستوفى من خلفية الفقاعة المجاورة،
//     فيبقى تدرج الفقاعة وتظليلها كما هو بدل طمسها كلها بلون واحد.
// ============================================================================

/**
 * @param pageData بكسلات الصفحة الأصلية RGBA (إن وُجدت يُستخدم التبييض الذكي، وإلا يُملأ القناع بلون ثابت)
 * @returns رقعة المحتوى السابق للمنطقة (للتراجع)، أو null إن لم يتغير شيء
 */
export interface WhitenOptions {
  /** طريقة التبييض (الافتراضي auto) */
  mode?: WhitenMode;
  /** توسيع يدوي للقناع بالبكسل (يلتقط نصاً/مؤثرات صوتية منفصلة قريبة من الفقاعة) */
  expandPx?: number;
  /** التقاط الحروف الملامسة للإطار (تجريبي) */
  touchingGlyphs?: boolean;
  /** يُستدعى بالطريقة التي استُخدمت فعلاً */
  onInfo?: (used: WhitenUsed) => void;
}

/** أكبر هامش (بكسل) تحتاجه whitenMaskArea حول صندوق الفقاعة؛ يجب أن تغطيه نافذة صفوف الصفحة التي يمرّرها المستدعي */
export const WHITEN_PAGE_MARGIN = 48;

export function whitenMaskArea(
  canvas: HTMLCanvasElement,
  mask: Uint8Array,
  imgW: number,
  imgH: number,
  fillColorHex: string = '#ffffff',
  bbox?: { x: number; y: number; w: number; h: number },
  pageData?: Uint8ClampedArray | null,
  tolerance: number = 20,
  /** رقم أول صف في pageData داخل الصفحة (الصفحات الطويلة تُقرأ بنافذة صفوف فقط) */
  pageRowOffset: number = 0,
  options?: WhitenOptions
): CleaningPatch | null {
  if (!canvas || !mask || mask.length === 0 || imgW <= 0 || imgH <= 0) return null;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  if (canvas.width !== imgW || canvas.height !== imgH) {
    canvas.width = imgW;
    canvas.height = imgH;
  }

  // هامش حول الصندوق: لتنعيم الحافة (بكسل)، والتوسيع اليدوي يحتاج هامشاً أوسع
  const expandPx = Math.max(0, Math.min(12, Math.round(options?.expandPx ?? 0)));
  const margin = bbox ? Math.min(WHITEN_PAGE_MARGIN, 3 + (expandPx > 0 ? expandPx + 20 : 0)) : 0;
  const startX = bbox ? Math.max(0, bbox.x - margin) : 0;
  const startY = bbox ? Math.max(0, bbox.y - margin) : 0;
  const endX = bbox ? Math.min(imgW, bbox.x + bbox.w + margin) : imgW;
  const endY = bbox ? Math.min(imgH, bbox.y + bbox.h + margin) : imgH;
  const regionW = endX - startX;
  const regionH = endY - startY;
  if (regionW <= 0 || regionH <= 0) return null;

  const imgData = ctx.getImageData(startX, startY, regionW, regionH);
  const data = imgData.data;
  // نسخة المحتوى السابق للتراجع
  const before = new ImageData(new Uint8ClampedArray(data), regionW, regionH);

  const [seedR, seedG, seedB] = hexToRgb(fillColorHex);

  let touched = 0;

  // نافذة الصفوف المتاحة من بكسلات الصفحة: يجب أن تغطي منطقة القناع كلها وإلا يُستخدم التعبئة بلون ثابت
  const pageRows = pageData ? Math.floor(pageData.length / (imgW * 4)) : 0;
  if (pageData && startY >= pageRowOffset && startY + regionH <= pageRowOffset + pageRows) {
    // النواة: فقاعة مصمتة → ملء صافٍ بلون البذرة؛ متدرجة/شفافة → كشف حبر محلي + توسيع كافٍ + نشر خلفية؛ منقوشة → ملء بالأمثلة
    const res = whitenRegionPixels({
      data,
      regionW,
      regionH,
      mask,
      imgW,
      startX,
      startY,
      pageData,
      pageRowOffset,
      seed: [seedR, seedG, seedB],
      tolerance,
      inpaint: (rgba, W, H, unknown) => {
        exemplarInpaint(rgba, W, H, unknown, { patchRadius: 3, maxCandidates: 1400 });
      },
      mode: options?.mode,
      expandPx,
      touchingGlyphs: options?.touchingGlyphs,
    });
    touched = res.touched;
    options?.onInfo?.(res.used);
  } else {
    // بدون بكسلات الصفحة: ملء القناع بلون ثابت كما في السابق
    for (let localY = 0; localY < regionH; localY++) {
      const maskRow = (startY + localY) * imgW;
      const dataRow = localY * regionW;
      for (let localX = 0; localX < regionW; localX++) {
        if (mask[maskRow + startX + localX] === 1) {
          const p = (dataRow + localX) * 4;
          data[p] = seedR; data[p + 1] = seedG; data[p + 2] = seedB; data[p + 3] = 255;
          touched++;
        }
      }
    }
  }

  if (touched === 0) return null;
  ctx.putImageData(imgData, startX, startY);
  return { tiles: [{ x: startX, y: startY, w: regionW, h: regionH, data: before }] };
}

// ============================================================================
// 🪄 خوارزمية ذكية مطورة لـ Content Aware Fill
// ============================================================================

// ============================================================================
// 🧩 محرك الملء بالأمثلة (Exemplar-based inpainting، أسلوب Criminisi):
//   يملأ الجزء المجهول بنسخ رقع من أنسب أمثلة معلومة في المحيط، مع أولوية للحواف والخطوط
//   كي تستمر البنية (خطوط، نقش، شبكة نقاط) بدل ملئها بلون مسطّح.
// ============================================================================

export interface ExemplarOptions {
  patchRadius?: number;
  maxCandidates?: number;
  seed?: number;
}

// بديل بسيط جداً عند انعدام الأمثلة: نشر متوسط الجيران المعلومين طبقة بعد طبقة
function diffuseFill(data: Uint8ClampedArray, W: number, H: number, unknown: Uint8Array): void {
  let remaining = 0;
  for (let i = 0; i < unknown.length; i++) if (unknown[i]) remaining++;
  let guard = 0;
  while (remaining > 0 && guard++ < W + H) {
    const idxs: number[] = [];
    const vals: number[] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!unknown[i]) continue;
        let r = 0, g = 0, b = 0, c = 0;
        const add = (j: number) => {
          if (!unknown[j]) { r += data[j * 4]; g += data[j * 4 + 1]; b += data[j * 4 + 2]; c++; }
        };
        if (x > 0) add(i - 1);
        if (x < W - 1) add(i + 1);
        if (y > 0) add(i - W);
        if (y < H - 1) add(i + W);
        if (c > 0) { idxs.push(i); vals.push(r / c, g / c, b / c); }
      }
    }
    if (idxs.length === 0) break;
    for (let k = 0; k < idxs.length; k++) {
      const i = idxs[k];
      data[i * 4] = vals[k * 3];
      data[i * 4 + 1] = vals[k * 3 + 1];
      data[i * 4 + 2] = vals[k * 3 + 2];
      data[i * 4 + 3] = 255;
      unknown[i] = 0;
      remaining--;
    }
  }
  if (remaining > 0) {
    for (let i = 0; i < unknown.length; i++) {
      if (unknown[i]) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 255; data[i * 4 + 3] = 255; }
    }
  }
}

/**
 * يملأ البكسلات التي mask = 1 داخل data (RGBA) بالمكان. يعيد عدد البكسلات المملوءة.
 */
export function exemplarInpaint(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  mask: Uint8Array,
  opts: ExemplarOptions = {}
): number {
  const R = Math.max(2, opts.patchRadius ?? 3);
  const n = W * H;
  const unknown = new Uint8Array(n);
  let remaining = 0;
  for (let i = 0; i < n; i++) {
    if (mask[i]) { unknown[i] = 1; remaining++; }
  }
  if (remaining === 0) return 0;
  const total = remaining;

  // مجاميع تراكمية للبكسلات المجهولة الأصلية: للتحقق السريع من أن الرقعة المصدر سليمة بالكامل
  const SW = W + 1;
  const S = new Int32Array(SW * (H + 1));
  for (let y = 0; y < H; y++) {
    let rowSum = 0;
    for (let x = 0; x < W; x++) {
      rowSum += unknown[y * W + x];
      S[(y + 1) * SW + x + 1] = S[y * SW + x + 1] + rowSum;
    }
  }
  const unknownIn = (x0: number, y0: number, x1: number, y1: number): number =>
    S[(y1 + 1) * SW + x1 + 1] - S[y0 * SW + x1 + 1] - S[(y1 + 1) * SW + x0] + S[y0 * SW + x0];

  // مراكز الرقع المصدر الصالحة (كلها معلومة)
  let candList: number[] = [];
  for (let y = R; y < H - R; y++) {
    for (let x = R; x < W - R; x++) {
      if (unknownIn(x - R, y - R, x + R, y + R) === 0) candList.push(y * W + x);
    }
  }
  if (candList.length === 0) {
    diffuseFill(data, W, H, unknown);
    return total;
  }
  const rand = mulberry32(opts.seed ?? 1337);
  const maxC = opts.maxCandidates ?? 1400;
  if (candList.length > maxC) {
    for (let i = 0; i < maxC; i++) {
      const j = i + Math.floor(rand() * (candList.length - i));
      const t = candList[i]; candList[i] = candList[j]; candList[j] = t;
    }
    candList = candList.slice(0, maxC);
  }
  const nc = candList.length;
  const candX = new Int32Array(nc);
  const candY = new Int32Array(nc);
  for (let c = 0; c < nc; c++) {
    candX[c] = candList[c] % W;
    candY[c] = (candList[c] / W) | 0;
  }

  const gray = new Float32Array(n);
  const conf = new Float32Array(n);
  const srcPix = new Int32Array(n).fill(-1);
  const prio = new Float32Array(n);
  const patchConf = new Float32Array(n);
  const inFront = new Uint8Array(n);
  const front: number[] = [];
  for (let i = 0; i < n; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    conf[i] = unknown[i] ? 0 : 1;
  }

  const known = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= W || y >= H ? 0 : unknown[y * W + x] ? 0 : 1;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!unknown[i]) continue;
      if (known(x - 1, y) || known(x + 1, y) || known(x, y - 1) || known(x, y + 1)) {
        inFront[i] = 1;
        front.push(i);
      }
    }
  }
  if (front.length === 0) {
    diffuseFill(data, W, H, unknown);
    return total;
  }

  // أولوية الملء = الثقة × قوة الحافة العمودية على جبهة الملء (تستمر الخطوط أولاً)
  const calcPriority = (i: number) => {
    const x = i % W;
    const y = (i - x) / W;
    let cs = 0;
    let cnt = 0;
    for (let dy = -R; dy <= R; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -R; dx <= R; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= W) continue;
        cnt++;
        cs += conf[yy * W + xx];
      }
    }
    const C = cs / cnt;
    const nx = known(x + 1, y) - known(x - 1, y);
    const ny = known(x, y + 1) - known(x, y - 1);
    let gx = 0, gy = 0, gcx = 0, gcy = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (!known(xx, yy)) continue;
        if (known(xx + 1, yy) && known(xx - 1, yy)) { gx += gray[yy * W + xx + 1] - gray[yy * W + xx - 1]; gcx++; }
        if (known(xx, yy + 1) && known(xx, yy - 1)) { gy += gray[(yy + 1) * W + xx] - gray[(yy - 1) * W + xx]; gcy++; }
      }
    }
    if (gcx) gx /= gcx * 2;
    if (gcy) gy /= gcy * 2;
    const nlen = Math.sqrt(nx * nx + ny * ny);
    let D = 0.001;
    if (nlen > 0) D = Math.abs(-gy * nx + gx * ny) / (nlen * 255) + 0.001;
    prio[i] = C * D;
    patchConf[i] = C;
  };
  for (let k = 0; k < front.length; k++) calcPriority(front[k]);

  const side = 2 * R + 1;
  const tdx = new Int32Array(side * side);
  const tdy = new Int32Array(side * side);
  const tr = new Float32Array(side * side);
  const tg = new Float32Array(side * side);
  const tb = new Float32Array(side * side);
  let m = 0;
  let best = Infinity;
  let bestC = -1;
  const tryCand = (cx: number, cy: number) => {
    let ssd = 0;
    for (let k = 0; k < m; k++) {
      const cp = ((cy + tdy[k]) * W + cx + tdx[k]) * 4;
      const dr = tr[k] - data[cp];
      const dg = tg[k] - data[cp + 1];
      const db = tb[k] - data[cp + 2];
      ssd += dr * dr + dg * dg + db * db;
      if (ssd >= best) return;
    }
    best = ssd;
    bestC = cy * W + cx;
  };

  let guard = 0;
  const maxIter = total + 16;
  while (remaining > 0 && guard++ < maxIter) {
    // أعلى أولوية على الجبهة
    let bi = -1;
    let bp = -1;
    for (let j = 0; j < front.length;) {
      const i = front[j];
      if (!unknown[i]) {
        front[j] = front[front.length - 1];
        front.pop();
        continue;
      }
      if (prio[i] > bp) { bp = prio[i]; bi = i; }
      j++;
    }
    if (bi < 0) break;
    const px = bi % W;
    const py = (bi - px) / W;

    // بكسلات الرقعة الهدف المعلومة
    m = 0;
    for (let dy = -R; dy <= R; dy++) {
      const yy = py + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -R; dx <= R; dx++) {
        const xx = px + dx;
        if (xx < 0 || xx >= W) continue;
        const q = yy * W + xx;
        if (!unknown[q]) {
          tdx[m] = dx; tdy[m] = dy;
          const p4 = q * 4;
          tr[m] = data[p4]; tg[m] = data[p4 + 1]; tb[m] = data[p4 + 2];
          m++;
        }
      }
    }

    best = Infinity;
    bestC = -1;

    // مرشحون مترابطون: إزاحات استعملها الجيران المملوءون (تحافظ على الطور في الأنماط المتكررة)
    let nCo = 0;
    for (let dy = -R; dy <= R && nCo < 8; dy++) {
      const yy = py + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -R; dx <= R && nCo < 8; dx++) {
        const xx = px + dx;
        if (xx < 0 || xx >= W) continue;
        const sp = srcPix[yy * W + xx];
        if (sp < 0) continue;
        const sx = sp % W;
        const sy = (sp - sx) / W;
        const cx = px + (sx - xx);
        const cy = py + (sy - yy);
        if (cx < R || cy < R || cx >= W - R || cy >= H - R) continue;
        if (unknownIn(cx - R, cy - R, cx + R, cy + R) !== 0) continue;
        tryCand(cx, cy);
        nCo++;
      }
    }
    for (let c = 0; c < nc; c++) tryCand(candX[c], candY[c]);
    if (bestC < 0) bestC = candY[0] * W + candX[0];

    const sx0 = bestC % W;
    const sy0 = (bestC - sx0) / W;
    const cfill = patchConf[bi];
    const newFront: number[] = [];
    for (let dy = -R; dy <= R; dy++) {
      const yy = py + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -R; dx <= R; dx++) {
        const xx = px + dx;
        if (xx < 0 || xx >= W) continue;
        const q = yy * W + xx;
        if (!unknown[q]) continue;
        const s = (sy0 + dy) * W + (sx0 + dx);
        data[q * 4] = data[s * 4];
        data[q * 4 + 1] = data[s * 4 + 1];
        data[q * 4 + 2] = data[s * 4 + 2];
        data[q * 4 + 3] = data[s * 4 + 3];
        gray[q] = gray[s];
        conf[q] = cfill;
        srcPix[q] = s;
        unknown[q] = 0;
        inFront[q] = 0;
        remaining--;
      }
    }
    // جبهة جديدة: الجيران المجهولون للبكسلات التي صارت معلومة + إعادة حساب الأولويات القريبة
    for (let dy = -R - 1; dy <= R + 1; dy++) {
      const yy = py + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -R - 1; dx <= R + 1; dx++) {
        const xx = px + dx;
        if (xx < 0 || xx >= W) continue;
        const q = yy * W + xx;
        if (unknown[q] && !inFront[q] && (known(xx - 1, yy) || known(xx + 1, yy) || known(xx, yy - 1) || known(xx, yy + 1))) {
          inFront[q] = 1;
          front.push(q);
          newFront.push(q);
        }
      }
    }
    for (let j = 0; j < front.length; j++) {
      const i = front[j];
      if (!unknown[i]) continue;
      const ix = i % W;
      const iy = (i - ix) / W;
      if (Math.abs(ix - px) <= R + 1 && Math.abs(iy - py) <= R + 1) calcPriority(i);
    }
  }

  if (remaining > 0) diffuseFill(data, W, H, unknown);
  return total;
}

function contentAwareFillByPatches(
  targetCtx: CanvasRenderingContext2D,
  sourceImg: HTMLImageElement,
  rect: { x: number; y: number; width: number; height: number },
  mask?: Uint8Array | null,
  imgW?: number,
  imgH?: number,
  maskOnly: boolean = false
): void {
  const w = imgW || sourceImg.naturalWidth;
  const h = imgH || sourceImg.naturalHeight;
  if (w <= 0 || h <= 0) return;

  // نافذة عمل حول الهدف تشمل أمثلة كافية من المحيط (بدل لوحة بحجم الصفحة كاملة)
  const margin = Math.max(24, Math.min(120, Math.round(Math.max(rect.width, rect.height) * 0.6)));
  const minX = Math.max(0, Math.floor(rect.x) - margin);
  const minY = Math.max(0, Math.floor(rect.y) - margin);
  const maxX = Math.min(w, Math.ceil(rect.x + rect.width) + margin);
  const maxY = Math.min(h, Math.ceil(rect.y + rect.height) + margin);
  const regionW = maxX - minX;
  const regionH = maxY - minY;
  if (regionW <= 0 || regionH <= 0) return;

  const canvas = document.createElement('canvas');
  canvas.width = regionW;
  canvas.height = regionH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(sourceImg, minX, minY, regionW, regionH, 0, 0, regionW, regionH);
  if (targetCtx.canvas && targetCtx.canvas.width > 0 && targetCtx.canvas.height > 0) {
    ctx.drawImage(targetCtx.canvas, minX, minY, regionW, regionH, 0, 0, regionW, regionH);
  }
  const imgData = ctx.getImageData(0, 0, regionW, regionH);

  const localMask = new Uint8Array(regionW * regionH);
  let maskedCount = 0;
  let dMinX = regionW, dMinY = regionH, dMaxX = -1, dMaxY = -1;
  for (let ly = 0; ly < regionH; ly++) {
    const gy = minY + ly;
    for (let lx = 0; lx < regionW; lx++) {
      const gx = minX + lx;
      const insideRect = gx >= rect.x && gx < rect.x + rect.width && gy >= rect.y && gy < rect.y + rect.height;
      let masked = insideRect;
      if (mask && mask.length === w * h) {
        masked = maskOnly ? mask[gy * w + gx] === 1 : (mask[gy * w + gx] === 1 || insideRect);
      }
      if (masked) {
        localMask[ly * regionW + lx] = 1;
        maskedCount++;
        if (lx < dMinX) dMinX = lx;
        if (lx > dMaxX) dMaxX = lx;
        if (ly < dMinY) dMinY = ly;
        if (ly > dMaxY) dMaxY = ly;
      }
    }
  }
  if (maskedCount === 0) return;

  // مناطق كبيرة: رقع أكبر لتقليل عدد الخطوات
  const patchRadius = maskedCount > 40000 ? 5 : 3;
  exemplarInpaint(imgData.data, regionW, regionH, localMask, { patchRadius, maxCandidates: 1400 });

  targetCtx.putImageData(imgData, minX, minY, dMinX, dMinY, dMaxX - dMinX + 1, dMaxY - dMinY + 1);
}

// ============================================================================
// 🪄 Content Aware Fill للمستطيل: تبييض النص وإعادة رسم الخلفية (متدرجة، ملساء، أو منقوشة)
// ============================================================================

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function medianOfNumbers(values: number[]): number {
  const a = values.slice().sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// فلتر وسيط أحادي البعد لإزالة بقع الحبر من حواف المستطيل
function medianSmooth(p: Float32Array, win: number): Float32Array {
  const out = new Float32Array(p.length);
  const half = win >> 1;
  const buf: number[] = [];
  for (let i = 0; i < p.length; i++) {
    buf.length = 0;
    for (let k = -half; k <= half; k++) {
      const j = Math.min(p.length - 1, Math.max(0, i + k));
      buf.push(p[j]);
    }
    out[i] = medianOfNumbers(buf);
  }
  return out;
}

const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

/**
 * يعيد عدد البكسلات المعالجة، أو -1 إن تعذّرت الطريقة الذكية (يُستخدم البديل بالرقع).
 * 1) تقدير الخلفية المتوقعة من إطار المستطيل (استيفاء من الأطراف الأربعة: يحافظ على التدرج بأي اتجاه).
 * 2) اكتشاف الحبر بعتبة تتكيف مع تفاوت الخلفية وتوسيعه ليشمل حواف الحروف المضببة.
 * 3) ملء الحبر فقط: استيفاء مع ضجيج خفيف للخلفيات الملساء، أو نسخ رقع للخلفيات المنقوشة.
 */
function smartRectFill(
  targetCtx: CanvasRenderingContext2D,
  sourceImg: HTMLImageElement,
  rect: { x: number; y: number; width: number; height: number },
  w: number,
  h: number
): number {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(w, Math.ceil(rect.x + rect.width));
  const y1 = Math.min(h, Math.ceil(rect.y + rect.height));
  const bw = x1 - x0;
  const bh = y1 - y0;
  if (bw < 4 || bh < 4) return -1;

  const ring = Math.max(3, Math.min(20, Math.round(Math.min(bw, bh) * 0.12)));
  const rx0 = Math.max(0, x0 - ring);
  const ry0 = Math.max(0, y0 - ring);
  const rx1 = Math.min(w, x1 + ring);
  const ry1 = Math.min(h, y1 + ring);
  const rw = rx1 - rx0;
  const rh = ry1 - ry0;

  const nTop = y0 - ry0;
  const nBottom = ry1 - y1;
  const nLeft = x0 - rx0;
  const nRight = rx1 - x1;
  if (nTop + nBottom === 0 || nLeft + nRight === 0) return -1;

  const canvas = document.createElement('canvas');
  canvas.width = rw;
  canvas.height = rh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return -1;
  ctx.drawImage(sourceImg, rx0, ry0, rw, rh, 0, 0, rw, rh);
  if (targetCtx.canvas && targetCtx.canvas.width > 0 && targetCtx.canvas.height > 0) {
    ctx.drawImage(targetCtx.canvas, rx0, ry0, rw, rh, 0, 0, rw, rh);
  }
  const img = ctx.getImageData(0, 0, rw, rh);
  const d = img.data;
  const at = (px: number, py: number) => ((py - ry0) * rw + (px - rx0)) * 4;

  const mk = (len: number) => [new Float32Array(len), new Float32Array(len), new Float32Array(len)];
  const top = mk(bw);
  const bottom = mk(bw);
  const left = mk(bh);
  const right = mk(bh);

  const range = (a: number, b: number): number[] => {
    const r: number[] = [];
    for (let i = a; i < b; i++) r.push(i);
    return r;
  };
  // انحراف بكسلات كل ضلع عن وسيطها: يكشف النقش (شبكة نقاط، خطوط) الذي تُخفيه الأوساط.
  // يُحسب لكل ضلع على حدة كي لا يُحسب إطار فقاعة أو رسم على ضلع واحد نقشاً.
  const sideDevSum = [0, 0, 0, 0];
  const sideDevCount = [0, 0, 0, 0];
  const buildH = (prof: Float32Array[], rows: number[], side: number) => {
    for (let x = 0; x < bw; x++) {
      for (let c = 0; c < 3; c++) {
        const vals: number[] = [];
        for (const py of rows) vals.push(d[at(x0 + x, py) + c]);
        const med = medianOfNumbers(vals);
        prof[c][x] = med;
        for (const v of vals) { sideDevSum[side] += Math.abs(v - med); sideDevCount[side]++; }
      }
    }
  };
  const buildV = (prof: Float32Array[], cols: number[], side: number) => {
    for (let y = 0; y < bh; y++) {
      for (let c = 0; c < 3; c++) {
        const vals: number[] = [];
        for (const px of cols) vals.push(d[at(px, y0 + y) + c]);
        const med = medianOfNumbers(vals);
        prof[c][y] = med;
        for (const v of vals) { sideDevSum[side] += Math.abs(v - med); sideDevCount[side]++; }
      }
    }
  };

  if (nTop > 0) buildH(top, range(y0 - nTop, y0), 0);
  if (nBottom > 0) buildH(bottom, range(y1, y1 + nBottom), 1);
  if (nLeft > 0) buildV(left, range(x0 - nLeft, x0), 2);
  if (nRight > 0) buildV(right, range(x1, x1 + nRight), 3);
  // الجانب المفقود (حافة الصورة) يُنسخ من الجانب المقابل
  if (nTop === 0) for (let c = 0; c < 3; c++) top[c].set(bottom[c]);
  if (nBottom === 0) for (let c = 0; c < 3; c++) bottom[c].set(top[c]);
  if (nLeft === 0) for (let c = 0; c < 3; c++) left[c].set(right[c]);
  if (nRight === 0) for (let c = 0; c < 3; c++) right[c].set(left[c]);

  // مقياس خشونة الخلفية لكل ضلع (التذبذب عالي التردد على الأوساط) والانحراف عن الوسيط
  const sideHf: number[] = [];
  const sideDev: number[] = [];
  [top, bottom, left, right].forEach((prof, si) => {
    const hasSide = si === 0 ? nTop > 0 : si === 1 ? nBottom > 0 : si === 2 ? nLeft > 0 : nRight > 0;
    if (!hasSide) return; // الضلع المنسوخ من المقابل لا يُحتسب مرتين
    let hs = 0;
    let hc = 0;
    for (let c = 0; c < 3; c++) {
      const p = prof[c];
      for (let i = 1; i < p.length - 1; i++) {
        hs += Math.abs(p[i] - (p[i - 1] + p[i + 1]) / 2);
        hc++;
      }
    }
    sideHf.push(hc ? hs / hc : 0);
    sideDev.push(sideDevCount[si] ? sideDevSum[si] / sideDevCount[si] : 0);
  });
  // نقش حقيقي = على ثلاثة أضلاع من أربعة على الأقل (ثاني أصغر قيمة). ضلع واحد فيه إطار أو رسم لا يكفي.
  const kth = (arr: number[]) => {
    const a = arr.slice().sort((x, y) => x - y);
    if (a.length === 0) return 0;
    return a[Math.min(a.length - 1, a.length >= 4 ? 1 : 0)];
  };
  const texture = kth(sideHf);
  const ringDev = kth(sideDev);

  // خلفية منقوشة (نقاط، خطوط، شبكة): نملأ المستطيل كله بالأمثلة من المحيط بدل تسطيحه بلون واحد
  if (texture > 7 || ringDev > 5) {
    const gm = new Uint8Array(w * h);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) gm[y * w + x] = 1;
    }
    contentAwareFillByPatches(targetCtx, sourceImg, rect, gm, w, h, true);
    return bw * bh;
  }

  for (const prof of [top, bottom, left, right]) {
    for (let c = 0; c < 3; c++) prof[c] = medianSmooth(prof[c], 7);
  }

  const corner = (a: Float32Array[], ai: number, b: Float32Array[], bi: number) =>
    [0, 1, 2].map(c => (a[c][ai] + b[c][bi]) / 2);
  const c00 = corner(top, 0, left, 0);
  const c10 = corner(top, bw - 1, right, 0);
  const c01 = corner(bottom, 0, left, bh - 1);
  const c11 = corner(bottom, bw - 1, right, bh - 1);

  // الخلفية المتوقعة (Coons patch)
  const bg = new Float32Array(bw * bh * 3);
  for (let y = 0; y < bh; y++) {
    const t = (y + 0.5) / bh;
    for (let x = 0; x < bw; x++) {
      const s = (x + 0.5) / bw;
      const o = (y * bw + x) * 3;
      for (let c = 0; c < 3; c++) {
        const v =
          (1 - t) * top[c][x] + t * bottom[c][x] +
          (1 - s) * left[c][y] + s * right[c][y] -
          ((1 - s) * (1 - t) * c00[c] + s * (1 - t) * c10[c] + (1 - s) * t * c01[c] + s * t * c11[c]);
        bg[o + c] = clamp255(v);
      }
    }
  }

  // اكتشاف الحبر
  const tau = Math.max(26, Math.min(70, 26 + 4 * texture));
  const tau2 = tau * tau;
  const ink = new Uint8Array(bw * bh);
  let inkCount = 0;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const p = at(x0 + x, y0 + y);
      const o = (y * bw + x) * 3;
      const dr = d[p] - bg[o];
      const dg = d[p + 1] - bg[o + 1];
      const db = d[p + 2] - bg[o + 2];
      if (dr * dr + dg * dg + db * db > tau2) {
        ink[y * bw + x] = 1;
        inkCount++;
      }
    }
  }
  if (inkCount === 0) return 0;
  if (inkCount > bw * bh * 0.8) {
    ink.fill(1); // المستطيل يغطي محتوى غريباً بالكامل: يُستبدل كله
  }

  // توسيع الحبر ليشمل حواف الحروف المضببة
  const grow = Math.max(2, Math.min(4, Math.round(Math.min(bw, bh) * 0.04)));
  const dsum = boxWindowSum(ink, bw, bh, grow);
  const dil = new Uint8Array(bw * bh);
  let dilCount = 0;
  for (let i = 0; i < dil.length; i++) {
    if (dsum[i] > 0) { dil[i] = 1; dilCount++; }
  }

  // خلفية ملساء/متدرجة: استيفاء مع ضجيج خفيف وحواف مُنعَّمة
  const soft = boxWindowSum(dil, bw, bh, 1);
  const rand = mulberry32(20260101);
  const noiseAmp = Math.min(3, texture * 0.9);
  const out = new ImageData(bw, bh);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x;
      const p = at(x0 + x, y0 + y);
      const o = i * 4;
      const a = dil[i] ? 1 : soft[i] / 9;
      for (let c = 0; c < 3; c++) {
        const base = d[p + c];
        if (a > 0) {
          const n = noiseAmp > 0 ? (rand() + rand() + rand() - 1.5) * noiseAmp : 0;
          const f = clamp255(bg[i * 3 + c] + n);
          out.data[o + c] = Math.round(base * (1 - a) + f * a);
        } else {
          out.data[o + c] = base;
        }
      }
      out.data[o + 3] = 255;
    }
  }
  targetCtx.putImageData(out, x0, y0);
  return dilCount;
}

/**
 * Content Aware Fill:
 *  - مع تحديد بالعصا السحرية: الملء بالرقع داخل المنطقة المحددة (الفقاعة).
 *  - مع المستطيل: تبييض النص وإعادة رسم الخلفية (يحافظ على التدرج والخلفية السليمة).
 * يعيد عدد البكسلات المعالجة (0 = لم يُعثر على نص).
 */
export function contentAwareFillLocal(
  targetCtx: CanvasRenderingContext2D,
  sourceImg: HTMLImageElement,
  rect: { x: number; y: number; width: number; height: number },
  mask?: Uint8Array | null,
  imgW?: number,
  imgH?: number
): number {
  const w = imgW || sourceImg.naturalWidth;
  const h = imgH || sourceImg.naturalHeight;
  if (w <= 0 || h <= 0) return 0;

  if (mask && mask.length === w * h) {
    contentAwareFillByPatches(targetCtx, sourceImg, rect, mask, w, h, false);
    return 1;
  }

  const n = smartRectFill(targetCtx, sourceImg, rect, w, h);
  if (n >= 0) return n;

  contentAwareFillByPatches(targetCtx, sourceImg, rect, null, w, h, false);
  return 1;
}

// ============================================================================
// 📦 دوال التصدير والترميز الآمنة
// ============================================================================

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      if (res && res.includes(',') && res.split(',')[1].length > 10) {
        resolve(res);
      } else {
        reject(new Error('فشل قراءة البايتات من الـ Blob'));
      }
    };
    reader.onerror = () => reject(new Error('خطأ في FileReader'));
    reader.readAsDataURL(blob);
  });
}

export function exportCanvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageExportFormat = 'webp',
  qualityPercent: number = 95
): Promise<Blob> {
  const quality = Math.max(0.01, Math.min(1.0, qualityPercent / 100));

  const isSuperTall = canvas.width > 16300 || canvas.height > 16300;
  let targetFormat = format;
  if (isSuperTall && format === 'webp') {
    targetFormat = 'jpeg';
  }

  const mimeType = targetFormat === 'png' ? 'image/png' : targetFormat === 'jpeg' ? 'image/jpeg' : 'image/webp';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
          return;
        }

        canvas.toBlob(
          (jpegBlob) => {
            if (jpegBlob && jpegBlob.size > 0) {
              resolve(jpegBlob);
            } else {
              canvas.toBlob(
                (pngBlob) => {
                  if (pngBlob && pngBlob.size > 0) {
                    resolve(pngBlob);
                  } else {
                    reject(new Error('تعذر ترميز الصورة بالكامل'));
                  }
                },
                'image/png'
              );
            }
          },
          'image/jpeg',
          quality
        );
      },
      mimeType,
      quality
    );
  });
}

export function exportCanvasToDataURL(
  canvas: HTMLCanvasElement,
  format: ImageExportFormat = 'webp',
  qualityPercent: number = 95
): string {
  const isSuperTall = canvas.width > 16300 || canvas.height > 16300;
  let targetFormat = format;
  if (isSuperTall && format === 'webp') {
    targetFormat = 'jpeg';
  }

  const mimeType = targetFormat === 'png' ? 'image/png' : targetFormat === 'jpeg' ? 'image/jpeg' : 'image/webp';
  const quality = Math.max(0.01, Math.min(1.0, qualityPercent / 100));

  try {
    const raw = canvas.toDataURL(mimeType, quality);
    if (raw && raw.length > 30 && raw.includes(',') && raw.split(',')[1].length > 10) {
      return raw;
    }
  } catch (err) {
    console.warn('فشل toDataURL، جاري استخدام البدائل...', err);
  }

  try {
    const jpeg = canvas.toDataURL('image/jpeg', quality);
    if (jpeg && jpeg.length > 30 && jpeg.includes(',') && jpeg.split(',')[1].length > 10) {
      return jpeg;
    }
  } catch (_) {}

  return canvas.toDataURL('image/png');
}

export async function exportCanvasToSafeDataURL(
  canvas: HTMLCanvasElement,
  format: ImageExportFormat = 'webp',
  qualityPercent: number = 95
): Promise<string> {
  try {
    const blob = await exportCanvasToBlob(canvas, format, qualityPercent);
    const dataUrl = await blobToDataURL(blob);
    if (dataUrl && dataUrl.includes(',') && dataUrl.split(',')[1].length > 10) {
      return dataUrl;
    }
  } catch (err) {
    console.warn('استخدام الملاذ الاحتياطي الآمن:', err);
  }

  return exportCanvasToDataURL(canvas, format, qualityPercent);
}

// ============================================================================
// 🎨 خوارزمية استخراج التدرج اللوني والـ Stroke من مساحة التحديد بدقة المواضع
// ============================================================================

export function extractGradientAndStrokeFromSelection(
  img: HTMLImageElement,
  rect: { x: number; y: number; width: number; height: number },
  mask?: Uint8Array | null,
  imgW?: number,
  imgH?: number
): ExtractedStyleResult | null {
  if (!img || !img.naturalWidth || rect.width < 5 || rect.height < 5) return null;

  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  const scaleX = naturalW / (img.offsetWidth || naturalW);
  const scaleY = naturalH / (img.offsetHeight || naturalH);

  const realX = Math.max(0, Math.floor(rect.x * scaleX));
  const realY = Math.max(0, Math.floor(rect.y * scaleY));
  const realW = Math.min(naturalW - realX, Math.ceil(rect.width * scaleX));
  const realH = Math.min(naturalH - realY, Math.ceil(rect.height * scaleY));

  if (realW <= 0 || realH <= 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = realW;
  canvas.height = realH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, realX, realY, realW, realH, 0, 0, realW, realH);
  const imgData = ctx.getImageData(0, 0, realW, realH);
  const data = imgData.data;

  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
  for (let x = 0; x < realW; x++) {
    const topIdx = (0 * realW + x) * 4;
    const botIdx = ((realH - 1) * realW + x) * 4;
    bgR += data[topIdx] + data[botIdx];
    bgG += data[topIdx + 1] + data[botIdx + 1];
    bgB += data[topIdx + 2] + data[botIdx + 2];
    bgCount += 2;
  }
  for (let y = 0; y < realH; y++) {
    const leftIdx = (y * realW + 0) * 4;
    const rightIdx = (y * realW + (realW - 1)) * 4;
    bgR += data[leftIdx] + data[rightIdx];
    bgG += data[leftIdx + 1] + data[rightIdx + 1];
    bgB += data[leftIdx + 2] + data[rightIdx + 2];
    bgCount += 2;
  }

  bgR = Math.round(bgR / (bgCount || 1));
  bgG = Math.round(bgG / (bgCount || 1));
  bgB = Math.round(bgB / (bgCount || 1));

  interface SampledPixel {
    r: number;
    g: number;
    b: number;
    x: number;
    y: number;
    dist: number;
  }

  const textPixels: SampledPixel[] = [];

  for (let y = 0; y < realH; y++) {
    for (let x = 0; x < realW; x++) {
      const idx = (y * realW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 50) continue;

      const dr = r - bgR;
      const dg = g - bgG;
      const db = b - bgB;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      if (dist > 35) {
        textPixels.push({ r, g, b, x, y, dist });
      }
    }
  }

  if (textPixels.length < 15) {
    return null;
  }

  // 🌟 استخراج 3 شرائح لونية (أعلى، وسط، أسفل) للحصول على التدرج الكامل كما في الصورة المرفقة
  const topSlice = textPixels.filter(p => p.y < realH * 0.33);
  const midSlice = textPixels.filter(p => p.y >= realH * 0.33 && p.y <= realH * 0.66);
  const bottomSlice = textPixels.filter(p => p.y > realH * 0.66);

  const getDominantColor = (pixels: SampledPixel[]): { r: number; g: number; b: number } => {
    if (pixels.length === 0) return { r: 255, g: 255, b: 255 };
    pixels.sort((a, b) => b.dist - a.dist);
    const slice = pixels.slice(0, Math.max(5, Math.floor(pixels.length * 0.35)));
    let sr = 0, sg = 0, sb = 0;
    slice.forEach(p => {
      sr += p.r;
      sg += p.g;
      sb += p.b;
    });
    return {
      r: Math.round(sr / slice.length),
      g: Math.round(sg / slice.length),
      b: Math.round(sb / slice.length),
    };
  };

  const cTop = getDominantColor(topSlice.length > 0 ? topSlice : textPixels);
  const cMid = getDominantColor(midSlice.length > 0 ? midSlice : textPixels);
  const cBottom = getDominantColor(bottomSlice.length > 0 ? bottomSlice : textPixels);

  const hex1 = "#" + ((1 << 24) + (cTop.r << 16) + (cTop.g << 8) + cTop.b).toString(16).slice(1);
  const hexMid = "#" + ((1 << 24) + (cMid.r << 16) + (cMid.g << 8) + cMid.b).toString(16).slice(1);
  const hex2 = "#" + ((1 << 24) + (cBottom.r << 16) + (cBottom.g << 8) + cBottom.b).toString(16).slice(1);

  // فحص إذا كان اللون الأوسط مميزاً وبارزاً
  const hasDistinctMid = Math.abs(cMid.r - cTop.r) > 25 || Math.abs(cMid.g - cTop.g) > 25 || Math.abs(cMid.b - cTop.b) > 25;

  const colorsList = hasDistinctMid ? [hex1, hexMid, hex2] : [hex1, hex2];
  const stopsList = hasDistinctMid ? [0, 0.5, 1.0] : [0, 1.0];
  const colorStopsList: GradientColorStop[] = hasDistinctMid
    ? [{ color: hex1, offset: 0 }, { color: hexMid, offset: 0.5 }, { color: hex2, offset: 1.0 }]
    : [{ color: hex1, offset: 0 }, { color: hex2, offset: 1.0 }];

  let strokeColor = '#ffffff';
  let strokeWidth = 0;

  const textAvgLum = (cTop.r * 0.299 + cTop.g * 0.587 + cTop.b * 0.114);
  const bgAvgLum = (bgR * 0.299 + bgG * 0.587 + bgB * 0.114);

  if (textAvgLum < 100 && bgAvgLum > 140) {
    strokeColor = '#ffffff';
    strokeWidth = 2.5;
  } else if (textAvgLum > 150 && bgAvgLum < 90) {
    strokeColor = '#000000';
    strokeWidth = 2.5;
  } else {
    strokeColor = bgAvgLum > 128 ? '#ffffff' : '#000000';
    strokeWidth = 2;
  }

  return {
    color1: hex1,
    color2: hex2,
    colors: colorsList,
    stops: stopsList,
    colorStops: colorStopsList,
    angle: 90,
    strokeColor,
    strokeWidth,
    textColor: hex1,
  };
}

// ===================================================
// IndexedDB - حفظ الخطوط الدائمة في الهاتف
// ===================================================

export interface StoredFont {
  name: string;
  data: ArrayBuffer;
}

const DB_NAME   = 'TypeRStudioFontsDB';
const STORE_NAME = 'fonts';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror        = () => reject(request.error);
    request.onsuccess      = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
  });
}

export async function saveFont(name: string, data: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store       = transaction.objectStore(STORE_NAME);
    const request     = store.put({ name, data });
    request.onerror   = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getFonts(): Promise<StoredFont[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store       = transaction.objectStore(STORE_NAME);
      const request     = store.getAll();
      request.onerror   = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (error) {
    console.error('Error loading fonts from IndexedDB:', error);
    return [];
  }
}

export function saveFavoriteFonts(favs: string[]): void {
  try {
    localStorage.setItem('typer_studio_fav_fonts', JSON.stringify(favs));
  } catch (e) {
    console.error('Error saving favorite fonts:', e);
  }
}

export function getFavoriteFonts(): string[] {
  try {
    const favs = localStorage.getItem('typer_studio_fav_fonts');
    return favs ? JSON.parse(favs) : [];
  } catch (e) {
    console.error('Error getting favorite fonts:', e);
    return [];
  }
}

// ============================================================
// 🔪 تنقية منطقة العصا السحرية: قطع التسرب عبر الفجوات الضيقة + فصل الفقاعات المتشابكة
// ============================================================

// مجموع نافذة مربعة (2r+1)² حول كل بكسل بالمجاميع التراكمية (O(n)). خارج الحدود = صفر.
function boxWindowSum(src: Uint8Array, w: number, h: number, r: number): Int32Array {
  const horiz = new Int32Array(w * h);
  const pre = new Int32Array(w + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) pre[x + 1] = pre[x] + src[row + x];
    for (let x = 0; x < w; x++) {
      const a = Math.max(0, x - r);
      const b = Math.min(w, x + r + 1);
      horiz[row + x] = pre[b] - pre[a];
    }
  }
  const out = new Int32Array(w * h);
  const preCol = new Int32Array(h + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) preCol[y + 1] = preCol[y] + horiz[y * w + x];
    for (let y = 0; y < h; y++) {
      const a = Math.max(0, y - r);
      const b = Math.min(h, y + r + 1);
      out[y * w + x] = preCol[b] - preCol[a];
    }
  }
  return out;
}

export interface MaskBounds { minX: number; maxX: number; minY: number; maxY: number }

// يملأ الجزر الصغيرة المحاطة بالكامل بالمنطقة (حروف النص الأصلي داخل الفقاعة) حتى لا تُقطّع المنطقة عند الفتح المورفولوجي.
// الخطوط الشعاعية الطويلة الرفيعة (الفقاعات الشمسية) لا تُملأ لأنها تشكّل جدران الفجوات.
function fillTextIslands(local: Uint8Array, bw: number, bh: number, maxDim: number): Uint8Array {
  const n = bw * bh;
  const outside = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0, qt = 0;
  const pushIf = (i: number) => {
    if (!local[i] && !outside[i]) { outside[i] = 1; queue[qt++] = i; }
  };
  for (let x = 0; x < bw; x++) { pushIf(x); pushIf((bh - 1) * bw + x); }
  for (let y = 0; y < bh; y++) { pushIf(y * bw); pushIf(y * bw + bw - 1); }
  while (qh < qt) {
    const pos = queue[qh++];
    const cx = pos % bw;
    const cy = (pos - cx) / bw;
    if (cx > 0) pushIf(pos - 1);
    if (cx < bw - 1) pushIf(pos + 1);
    if (cy > 0) pushIf(pos - bw);
    if (cy < bh - 1) pushIf(pos + bw);
  }

  const work = new Uint8Array(local);
  const seen = new Uint8Array(n);
  const comp = new Int32Array(n);
  for (let start = 0; start < n; start++) {
    if (local[start] || outside[start] || seen[start]) continue;
    let ch = 0, ct = 0;
    comp[ct++] = start;
    seen[start] = 1;
    let minX = bw, maxX = 0, minY = bh, maxY = 0;
    while (ch < ct) {
      const pos = comp[ch++];
      const cx = pos % bw;
      const cy = (pos - cx) / bw;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
      const nb = [cx > 0 ? pos - 1 : -1, cx < bw - 1 ? pos + 1 : -1, cy > 0 ? pos - bw : -1, cy < bh - 1 ? pos + bw : -1];
      for (let k = 0; k < 4; k++) {
        const np = nb[k];
        if (np >= 0 && !local[np] && !outside[np] && !seen[np]) { seen[np] = 1; comp[ct++] = np; }
      }
    }
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const dim = Math.max(w, h);
    const minDim = Math.min(w, h);
    const density = ct / (w * h);
    const aspect = dim / Math.max(1, minDim);
    // حرف أو علامة ترقيم: صغير الحجم، كثيف، ومتوازن الأبعاد (قياسات حقيقية: الأبعاد ≤ 66px، الكثافة ≥ 0.25، النسبة ≤ 5.3).
    // الخطوط الشعاعية الطويلة الرفيعة (الفقاعات الشمسية) لا تُملأ لأنها جدران الفجوات.
    const textLike = dim <= 10 || (dim <= maxDim && density >= 0.22 && aspect <= 7);
    if (textLike) {
      for (let k = 0; k < ct; k++) work[comp[k]] = 1;
    }
  }
  return work;
}

// أصغر مكوّن متصل بنقطة البداية داخل المصفوفة المتآكلة (أو أقرب بكسل متآكل لها)
function seedComponent(eroded: Uint8Array, bw: number, bh: number, sx: number, sy: number, r: number): { comp: Uint8Array; count: number } | null {
  let startIdx = -1;
  if (eroded[sy * bw + sx]) {
    startIdx = sy * bw + sx;
  } else {
    const search = r * 2 + 4;
    let bestD = Infinity;
    for (let dy = -search; dy <= search; dy++) {
      const yy = sy + dy;
      if (yy < 0 || yy >= bh) continue;
      for (let dx = -search; dx <= search; dx++) {
        const xx = sx + dx;
        if (xx < 0 || xx >= bw) continue;
        if (eroded[yy * bw + xx]) {
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; startIdx = yy * bw + xx; }
        }
      }
    }
  }
  if (startIdx < 0) return null;
  const comp = new Uint8Array(bw * bh);
  const queue = new Int32Array(bw * bh);
  let qh = 0, qt = 0;
  queue[qt++] = startIdx;
  comp[startIdx] = 1;
  while (qh < qt) {
    const pos = queue[qh++];
    const cx = pos % bw;
    const cy = (pos - cx) / bw;
    if (cx > 0 && eroded[pos - 1] && !comp[pos - 1]) { comp[pos - 1] = 1; queue[qt++] = pos - 1; }
    if (cx < bw - 1 && eroded[pos + 1] && !comp[pos + 1]) { comp[pos + 1] = 1; queue[qt++] = pos + 1; }
    if (cy > 0 && eroded[pos - bw] && !comp[pos - bw]) { comp[pos - bw] = 1; queue[qt++] = pos - bw; }
    if (cy < bh - 1 && eroded[pos + bw] && !comp[pos + bw]) { comp[pos + bw] = 1; queue[qt++] = pos + bw; }
  }
  return { comp, count: qt };
}

function erodeMask(src: Uint8Array, bw: number, bh: number, r: number): Uint8Array {
  const win = (2 * r + 1) * (2 * r + 1);
  const sums = boxWindowSum(src, bw, bh, r);
  const out = new Uint8Array(bw * bh);
  for (let i = 0; i < out.length; i++) out[i] = sums[i] === win ? 1 : 0;
  return out;
}

// تمديد المكوّن بنفس القطر ثم تقييده بالمنطقة الأصلية
function dilateWithin(comp: Uint8Array, work: Uint8Array, bw: number, bh: number, r: number) {
  const dsum = boxWindowSum(comp, bw, bh, r);
  const result = new Uint8Array(bw * bh);
  let area = 0, nMinX = Infinity, nMaxX = -1, nMinY = Infinity, nMaxY = -1;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x;
      if (dsum[i] > 0 && work[i] === 1) {
        result[i] = 1;
        area++;
        if (x < nMinX) nMinX = x;
        if (x > nMaxX) nMaxX = x;
        if (y < nMinY) nMinY = y;
        if (y > nMaxY) nMaxY = y;
      }
    }
  }
  return { result, area, nMinX, nMaxX, nMinY, nMaxY };
}

/** نسبة مساحة المنطقة إلى مساحة غلافها المحدب (1 = محدبة تماماً). الفقاعة الواحدة محدبة تقريباً، والمتشابكة أقل */
function maskSolidity(work: Uint8Array, bw: number, bh: number, area: number): number {
  const pts: Array<[number, number]> = [];
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x;
      if (!work[i]) continue;
      const edge = x === 0 || y === 0 || x === bw - 1 || y === bh - 1 ||
        !work[i - 1] || !work[i + 1] || !work[i - bw] || !work[i + bw];
      if (edge) pts.push([x, y]);
    }
  }
  if (pts.length < 3) return 1;
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Array<[number, number]> = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Array<[number, number]> = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  const hull = lower.concat(upper);
  let a2 = 0;
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i];
    const [x2, y2] = hull[(i + 1) % hull.length];
    a2 += x1 * y2 - x2 * y1;
  }
  const hullArea = Math.abs(a2) / 2;
  return hullArea > 0 ? Math.min(1, area / hullArea) : 1;
}

export interface RefineOptions {
  /** المنطقة وصلت إلى حدود البحث (نصف القطر / المستطيل): مشتبه بها بالتسرب */
  hitCap?: boolean;
  /** حدود البحث الداخلية (المستطيل) إن وُجدت */
  limits?: MaskBounds;
  /** السماح بفصل الفقاعات المتشابكة (فصان متصلان بعنق واسع) */
  allowSplit?: boolean;
  /** السماح بقطع التسرب عبر الفجوات الضيقة */
  allowLeakCut?: boolean;
}

/**
 * يُنقّي منطقة العصا السحرية ويعدّل mask في مكانه ويعيد الحدود الجديدة:
 *  1) قطع التسرب عبر الفجوات الضيقة (الفقاعات الشمسية والمسننة) بفتح مورفولوجي.
 *  2) فصل الفقاعات المتشابكة: يُبقي الفص الذي نقرتَ عليه فقط.
 * حروف النص الأصلي داخل الفقاعة تُملأ مؤقتاً قبل التحليل حتى لا تُقطّع المنطقة.
 */
export function refineMaskRegion(
  mask: Uint8Array,
  imgW: number,
  imgH: number,
  bounds: MaskBounds,
  seedX: number,
  seedY: number,
  opts: RefineOptions = {}
): MaskBounds & { changed: boolean; area: number; density: number } {
  const bw = bounds.maxX - bounds.minX + 1;
  const bh = bounds.maxY - bounds.minY + 1;
  const unchanged = (area: number, density: number) => ({ ...bounds, changed: false, area, density });
  if (bw < 12 || bh < 12) return unchanged(0, 0);

  const local = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) {
    const gy = bounds.minY + y;
    for (let x = 0; x < bw; x++) {
      if (mask[gy * imgW + bounds.minX + x] === 1) local[y * bw + x] = 1;
    }
  }

  const maxIslandDim = Math.max(30, Math.round(Math.min(imgW, imgH) * 0.09));
  const work = fillTextIslands(local, bw, bh, maxIslandDim);

  let area0 = 0;
  for (let i = 0; i < work.length; i++) area0 += work[i];
  if (area0 === 0) return unchanged(0, 0);
  const density0 = area0 / (bw * bh);

  const sx = seedX - bounds.minX;
  const sy = seedY - bounds.minY;
  if (sx < 0 || sy < 0 || sx >= bw || sy >= bh) return unchanged(area0, density0);

  const limits = opts.limits;
  const touchesLimits = (b: MaskBounds): boolean => {
    if (!limits) return false;
    return b.minX <= limits.minX + 1 || b.maxX >= limits.maxX - 1 ||
           b.minY <= limits.minY + 1 || b.maxY >= limits.maxY - 1;
  };

  const commit = (result: Uint8Array, area: number, nMinX: number, nMaxX: number, nMinY: number, nMaxY: number) => {
    for (let y = 0; y < bh; y++) {
      const gy = bounds.minY + y;
      for (let x = 0; x < bw; x++) {
        mask[gy * imgW + bounds.minX + x] = result[y * bw + x];
      }
    }
    const nw = nMaxX - nMinX + 1;
    const nh = nMaxY - nMinY + 1;
    return {
      minX: bounds.minX + nMinX,
      maxX: bounds.minX + nMaxX,
      minY: bounds.minY + nMinY,
      maxY: bounds.minY + nMaxY,
      changed: true,
      area,
      density: area / (nw * nh),
    };
  };

  const scale = Math.max(1, imgW / 800);
  const minDim = Math.min(bw, bh);

  // ---- 1) قطع التسرب عبر الفجوات الضيقة ----
  const leaky = !!opts.hitCap || touchesLimits(bounds) || density0 < 0.55;
  if (opts.allowLeakCut !== false && leaky) {
    const maxR = Math.max(2, Math.floor(minDim / 5));
    const radii = Array.from(new Set(
      [2, 3, 4, 6, 8, 11, 15, 20, 28].map(r => Math.max(1, Math.round(r * scale))).filter(r => r <= maxR)
    )).sort((a, b) => a - b);

    for (const r of radii) {
      const eroded = erodeMask(work, bw, bh, r);
      const sc = seedComponent(eroded, bw, bh, sx, sy, r);
      if (!sc) break;
      const d = dilateWithin(sc.comp, work, bw, bh, r);
      if (d.area === 0) continue;
      const nb: MaskBounds = {
        minX: bounds.minX + d.nMinX, maxX: bounds.minX + d.nMaxX,
        minY: bounds.minY + d.nMinY, maxY: bounds.minY + d.nMaxY,
      };
      const density1 = d.area / ((d.nMaxX - d.nMinX + 1) * (d.nMaxY - d.nMinY + 1));
      if (!touchesLimits(nb) && density1 >= 0.6 && d.area < area0 * 0.92) {
        return commit(d.result, d.area, d.nMinX, d.nMaxX, d.nMinY, d.nMaxY);
      }
    }
  }

  // ---- 2) فصل الفقاعات المتشابكة (فقط إن لم تكن المنطقة محدبة تقريباً، وهذا يوفّر معظم الوقت) ----
  if (opts.allowSplit && maskSolidity(work, bw, bh, area0) < SPLIT_MAX_SOLIDITY) {
    for (const rf of [0.05, 0.07, 0.09, 0.12, 0.16]) {
      const r = Math.max(3, Math.round(rf * minDim));
      if (r * 2 + 2 >= minDim) break;
      const eroded = erodeMask(work, bw, bh, r);
      // عدّ المكوّنات المتآكلة الكبيرة
      const seen = new Uint8Array(bw * bh);
      const q = new Int32Array(bw * bh);
      const sizes: number[] = [];
      for (let st = 0; st < eroded.length; st++) {
        if (!eroded[st] || seen[st]) continue;
        let h = 0, t = 0;
        q[t++] = st;
        seen[st] = 1;
        while (h < t) {
          const pos = q[h++];
          const cx = pos % bw;
          const cy = (pos - cx) / bw;
          if (cx > 0 && eroded[pos - 1] && !seen[pos - 1]) { seen[pos - 1] = 1; q[t++] = pos - 1; }
          if (cx < bw - 1 && eroded[pos + 1] && !seen[pos + 1]) { seen[pos + 1] = 1; q[t++] = pos + 1; }
          if (cy > 0 && eroded[pos - bw] && !seen[pos - bw]) { seen[pos - bw] = 1; q[t++] = pos - bw; }
          if (cy < bh - 1 && eroded[pos + bw] && !seen[pos + bw]) { seen[pos + bw] = 1; q[t++] = pos + bw; }
        }
        sizes.push(t);
      }
      if (sizes.length < 2) continue;
      const largest = Math.max(...sizes);
      const substantial = sizes.filter(sz => sz >= largest * 0.2).length;
      if (substantial < 2) continue;

      const sc = seedComponent(eroded, bw, bh, sx, sy, r);
      if (!sc) continue;
      const d = dilateWithin(sc.comp, work, bw, bh, r);
      if (d.area === 0) continue;
      const nw = d.nMaxX - d.nMinX + 1;
      const nh = d.nMaxY - d.nMinY + 1;
      const density1 = d.area / (nw * nh);
      if (d.area < area0 * 0.85 && d.area >= area0 * 0.15 && density1 >= 0.6) {
        return commit(d.result, d.area, d.nMinX, d.nMaxX, d.nMinY, d.nMaxY);
      }
    }
  }

  return unchanged(area0, density0);
}

// ============================================================================
// 🫧 تحليل الفقاعة من نقطة: تعبئة العصا + قطع التسرب + فصل المتشابكة + ملء ثقوب النص + تصنيف الشكل
//    (دالة نقية تُستخدم في النقر اليدوي وفي الاكتشاف التلقائي لكل فقاعات الصفحة)
// ============================================================================

// ⚡ طابور التعبئة الفيضية يُعاد استخدامه بين النقرات والفقاعات (كان يُحجز من جديد: 4 بايت × عدد بكسلات الصفحة)
let scratchQueue: Int32Array | null = null;
function getScratchQueue(n: number): Int32Array {
  if (!scratchQueue || scratchQueue.length < n) scratchQueue = new Int32Array(n);
  return scratchQueue;
}
// ينمو الطابور بحسب الحاجة الفعلية (ضعف السعة) بدل حجز حجم الصفحة كلها بصورة دائمة
function growScratchQueue(cur: Int32Array): Int32Array {
  const next = new Int32Array(cur.length * 2);
  next.set(cur);
  scratchQueue = next;
  return next;
}

export interface BubbleAnalysis {
  mask: Uint8Array;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  /** نقطة البداية الفعلية المستخدمة بعد التصحيح (نقر على حرف ينتقل لأقرب بياض) */
  px: number;
  py: number;
  seedColor: string;
  isDarkBubble: boolean;
  shape: BubbleShapeType;
}

// اتجاهات الجيران الأربعة (ثابتة: لا تُنشأ من جديد في كل تعبئة)
const FILL_DXS = [-1, 1, 0, 0];
const FILL_DYS = [0, 0, -1, 1];

/**
 * يقدّر تسامحاً مناسباً لمستوى ضجيج الصفحة (JPEG مضغوط) حول نقطة النقر.
 * يعيد قيمة ≥ base دائماً (يرفع التسامح عند الضجيج فقط ولا يخفضه، كي لا يقطع الفقاعات المتدرجة).
 */
export function estimateAutoTolerance(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  px: number,
  py: number,
  base: number
): number {
  const R = 30;
  const x0 = Math.max(0, px - R), x1 = Math.min(imgW - 2, px + R);
  const y0 = Math.max(0, py - R), y1 = Math.min(imgH - 2, py + R);
  let sum = 0, cnt = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * imgW + x) * 4;
      for (let k = 0; k < 2; k++) {
        const j = k === 0 ? i + 4 : i + imgW * 4;
        const dr = data[i] - data[j], dg = data[i + 1] - data[j + 1], db = data[i + 2] - data[j + 2];
        const d = Math.sqrt(dr * dr + dg * dg + db * db);
        if (d < 24) { sum += d; cnt++; } // أزواج مسطحة فقط (الحواف تُستبعد)
      }
    }
  }
  if (cnt < 200) return base;
  const noise = sum / cnt;
  return Math.max(base, Math.min(48, Math.round(10 + 7 * noise)));
}

export function analyzeBubbleAt(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  pxIn: number,
  pyIn: number,
  opts: { tolerance: number; minBubbleSize: number }
): BubbleAnalysis | { error: 'transparent' } {
  const wandTolerance = opts.tolerance;
  const minBubbleSize = opts.minBubbleSize;
  let px = pxIn;
  let py = pyIn;
  if (px < 0 || px >= imgW || py < 0 || py >= imgH) return { error: 'transparent' };

    let si = (py * imgW + px) * 4;
    let sA = data[si + 3];
    if (sA < 30) {
      return { error: 'transparent' };
    }

    let sR = data[si], sG = data[si + 1], sB = data[si + 2];
    let seedLuminance = 0.299 * sR + 0.587 * sG + 0.114 * sB;

    let isDarkBubble = seedLuminance < 85;
    if (seedLuminance >= 85 && seedLuminance < 140) {
      let maxLum = seedLuminance;
      let bestX = px;
      let bestY = py;
      const searchR = Math.min(30, Math.floor(imgW * 0.04));
      
      for (let dy = -searchR; dy <= searchR; dy += 2) {
        const ny = py + dy;
        if (ny < 0 || ny >= imgH) continue;
        for (let dx = -searchR; dx <= searchR; dx += 2) {
          const nx = px + dx;
          if (nx < 0 || nx >= imgW) continue;
          const nsi = (ny * imgW + nx) * 4;
          if (data[nsi + 3] < 50) continue;
          const lum = 0.299 * data[nsi] + 0.587 * data[nsi + 1] + 0.114 * data[nsi + 2];
          if (lum > maxLum) {
            maxLum = lum;
            bestX = nx;
            bestY = ny;
          }
        }
      }
      if (maxLum > 140) {
        px = bestX;
        py = bestY;
        si = (py * imgW + px) * 4;
        sR = data[si];
        sG = data[si + 1];
        sB = data[si + 2];
        seedLuminance = maxLum;
      }
    }

    const tolerance = wandTolerance;
    const pageArea = imgW * imgH;
    let sharedQueue = getScratchQueue(Math.min(imgW * imgH, 1 << 16));

    // 🔁 تعبئة فيضية من نقطة بداية معيّنة بحدود بحث قابلة للضبط (مع إيقاف مبكر إن تجاوزت مساحة معقولة)
    const runFill = (
      seedX: number,
      seedY: number,
      rangeFrac: number,
      distFrac: number | null,
      maxArea?: number
    ) => {
      const sIdx = (seedY * imgW + seedX) * 4;
      const fR = data[sIdx], fG = data[sIdx + 1], fB = data[sIdx + 2];
      const fLum = 0.299 * fR + 0.587 * fG + 0.114 * fB;
      // عتبات الحبر تتكيف مع سطوع لون البذرة (تغطي المنطقة الوسطى 85–140 التي كانت بلا قاعدة)
      const inkThr = adaptiveInkThresholds(fLum);
      const fMask = new Uint8Array(imgW * imgH);

      const rangeX = Math.max(150, Math.floor(imgW * rangeFrac));
      const rangeY = Math.max(150, Math.floor(imgH * rangeFrac));
      const lim = {
        minX: Math.max(0, seedX - rangeX),
        maxX: Math.min(imgW - 1, seedX + rangeX),
        minY: Math.max(0, seedY - rangeY),
        maxY: Math.min(imgH - 1, seedY + rangeY),
      };
      const maxDist = distFrac === null ? Infinity : Math.min(imgW, imgH) * distFrac;

      let fMinX = seedX, fMaxX = seedX, fMinY = seedY, fMaxY = seedY;
      let fHead = 0, fTail = 0;
      sharedQueue[fTail++] = seedY * imgW + seedX;
      fMask[seedY * imgW + seedX] = 1;
      let aborted = false;
      let hitCap = false;

      while (fHead < fTail) {
        if (maxArea !== undefined && fTail > maxArea) { aborted = true; break; }
        const pos = sharedQueue[fHead++];
        const cx = pos % imgW;
        const cy = (pos - cx) / imgW;

        if (cx < fMinX) fMinX = cx;
        if (cx > fMaxX) fMaxX = cx;
        if (cy < fMinY) fMinY = cy;
        if (cy > fMaxY) fMaxY = cy;

        for (let d = 0; d < 4; d++) {
          const nx = cx + FILL_DXS[d];
          const ny = cy + FILL_DYS[d];

          if (nx < 0 || nx >= imgW || ny < 0 || ny >= imgH) continue;

          let blockedByCap = nx < lim.minX || nx > lim.maxX || ny < lim.minY || ny > lim.maxY;
          if (!blockedByCap && maxDist !== Infinity) {
            const ddx = nx - seedX;
            const ddy = ny - seedY;
            if (Math.sqrt(ddx * ddx + ddy * ddy) > maxDist) blockedByCap = true;
          }

          const np = ny * imgW + nx;
          if (fMask[np]) continue;

          const ni = np * 4;
          const nR = data[ni];
          const nG = data[ni + 1];
          const nB = data[ni + 2];
          const nA = data[ni + 3];

          if (nA < 30) continue;

          const dr = nR - fR;
          const dg = nG - fG;
          const db = nB - fB;
          let matches = Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance;

          if (matches) {
            const nLum = 0.299 * nR + 0.587 * nG + 0.114 * nB;
            if (inkThr.dark !== null && nLum < inkThr.dark) matches = false;
            else if (inkThr.light !== null && nLum > inkThr.light) matches = false;
          }

          if (matches) {
            if (blockedByCap) {
              // المنطقة "تريد" أن تتوسع خارج حدود البحث: فقاعة ضخمة أو تسرب
              hitCap = true;
              continue;
            }
            fMask[np] = 1;
            if (fTail >= sharedQueue.length) sharedQueue = growScratchQueue(sharedQueue);
            sharedQueue[fTail++] = np;
          }
        }
      }

      return {
        mask: fMask,
        bounds: { minX: fMinX, maxX: fMaxX, minY: fMinY, maxY: fMaxY },
        limits: lim,
        lum: fLum,
        r: fR,
        g: fG,
        b: fB,
        area: fTail,
        aborted,
        hitCap,
      };
    };

    const countInBounds = (m: Uint8Array, b: { minX: number; maxX: number; minY: number; maxY: number }) => {
      let c = 0;
      for (let y = b.minY; y <= b.maxY; y++) {
        const row = y * imgW;
        for (let x = b.minX; x <= b.maxX; x++) c += m[row + x];
      }
      return c;
    };

    // حدود البحث الداخلية فقط (حافة الصورة نفسها ليست قيدًا)
    const effectiveLimits = (lim: { minX: number; maxX: number; minY: number; maxY: number }) => ({
      minX: lim.minX > 0 ? lim.minX : -Infinity,
      maxX: lim.maxX < imgW - 1 ? lim.maxX : Infinity,
      minY: lim.minY > 0 ? lim.minY : -Infinity,
      maxY: lim.maxY < imgH - 1 ? lim.maxY : Infinity,
    });

    const finalizeFill = (f: ReturnType<typeof runFill>, seedX: number, seedY: number, leakCut: boolean) => {
      const eff = effectiveLimits(f.limits);
      let b = { ...f.bounds };
      // 🔪 قطع التسرب (عند الاشتباه فقط) + فصل الفقاعات المتشابكة؛ حروف النص الأصلي لا تؤثر في التحليل
      const ref = refineMaskRegion(f.mask, imgW, imgH, b, seedX, seedY, {
        hitCap: f.hitCap,
        limits: eff,
        allowSplit: true,
        allowLeakCut: leakCut,
      });
      if (ref.changed) {
        b = { minX: ref.minX, maxX: ref.maxX, minY: ref.minY, maxY: ref.maxY };
      }
      const area = ref.changed ? countInBounds(f.mask, b) : f.area;
      const density = ref.density || (area / Math.max(1, (b.maxX - b.minX + 1) * (b.maxY - b.minY + 1)));
      const touches = b.minX <= eff.minX + 1 || b.maxX >= eff.maxX - 1 || b.minY <= eff.minY + 1 || b.maxY >= eff.maxY - 1;
      return { ...f, bounds: b, area, density, touches };
    };

    // الفقاعة العادية: السلوك المعتاد (بحث محدود) مع فصل المتشابكة.
    // إن حاولت المنطقة تجاوز حدود البحث (فقاعة ضخمة أو تسرب) نجرّب بحثاً واسعاً ثم نقطع التسرب.
    const fillWithGuards = (seedX: number, seedY: number) => {
      const small = runFill(seedX, seedY, 0.35, 0.38);
      if (!small.hitCap) return finalizeFill(small, seedX, seedY, false);

      const big = runFill(seedX, seedY, 0.9, null, Math.floor(pageArea * 0.45));
      if (!big.aborted) {
        const fb = finalizeFill(big, seedX, seedY, true);
        if (!fb.touches && fb.area <= pageArea * 0.45 && fb.density >= 0.6) return fb;
      }
      return finalizeFill(small, seedX, seedY, true);
    };

    let fill = fillWithGuards(px, py);

    // 🔤 النقر على حرف داخل فقاعة فاتحة: الناتج صغير وكثيف الحبر → أعد المحاولة من أقرب مساحة بيضاء مفتوحة
    if (fill.lum < 110) {
      const fw = fill.bounds.maxX - fill.bounds.minX + 1;
      const fh = fill.bounds.maxY - fill.bounds.minY + 1;
      const density = fill.area / Math.max(1, fw * fh);
      const looksLikeGlyph = fill.area < pageArea * 0.003 || (density < 0.55 && fill.area < pageArea * 0.01);
      if (looksLikeGlyph) {
        const R2 = Math.max(24, Math.round(Math.min(imgW, imgH) * 0.06));
        const lumAt = (x: number, y: number): number => {
          if (x < 0 || x >= imgW || y < 0 || y >= imgH) return -1;
          const i = (y * imgW + x) * 4;
          if (data[i + 3] < 50) return -1;
          return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        };
        let bestD = Infinity, bx = -1, by = -1;
        for (let dy = -R2; dy <= R2; dy++) {
          for (let dx = -R2; dx <= R2; dx++) {
            const d2 = dx * dx + dy * dy;
            if (d2 >= bestD || d2 > R2 * R2) continue;
            const nx = px + dx;
            const ny = py + dy;
            // بكسل أبيض يحيط به أبيض (مساحة مفتوحة وليس حافة حرف)
            if (lumAt(nx, ny) >= 170 && lumAt(nx - 3, ny) >= 170 && lumAt(nx + 3, ny) >= 170 &&
                lumAt(nx, ny - 3) >= 170 && lumAt(nx, ny + 3) >= 170) {
              bestD = d2;
              bx = nx;
              by = ny;
            }
          }
        }
        if (bx >= 0) {
          const alt = fillWithGuards(bx, by);
          const altW = alt.bounds.maxX - alt.bounds.minX + 1;
          const altH = alt.bounds.maxY - alt.bounds.minY + 1;
          if (alt.area > fill.area * 3 && altW >= minBubbleSize && altH >= minBubbleSize) {
            fill = alt;
            px = bx;
            py = by;
          }
        }
      }
    }

    const mask = fill.mask;
    let minX = fill.bounds.minX;
    let maxX = fill.bounds.maxX;
    let minY = fill.bounds.minY;
    let maxY = fill.bounds.maxY;
    sR = fill.r;
    sG = fill.g;
    sB = fill.b;
    seedLuminance = fill.lum;
    isDarkBubble = seedLuminance < 85;
    const hexColor = "#" + ((1 << 24) + (sR << 16) + (sG << 8) + sB).toString(16).slice(1);

    const localW = maxX - minX + 3;
    const localH = maxY - minY + 3;
    const localVisited = new Uint8Array(localW * localH);
    const localQueue = new Int32Array(localW * localH);
    let lHead = 0, lTail = 0;

    const isMaskSet = (gx: number, gy: number): boolean => {
      if (gx < 0 || gx >= imgW || gy < 0 || gy >= imgH) return false;
      return mask[gy * imgW + gx] === 1;
    };

    for (let lx = 0; lx < localW; lx++) {
      const gx = minX - 1 + lx;
      const gyTop = minY - 1;
      const idxTop = 0 * localW + lx;
      if (!isMaskSet(gx, gyTop)) {
        localVisited[idxTop] = 1;
        localQueue[lTail++] = idxTop;
      }
      const gyBottom = maxY + 1;
      const idxBottom = (localH - 1) * localW + lx;
      if (!isMaskSet(gx, gyBottom)) {
        localVisited[idxBottom] = 1;
        localQueue[lTail++] = idxBottom;
      }
    }

    for (let ly = 0; ly < localH; ly++) {
      const gy = minY - 1 + ly;
      const gxLeft = minX - 1;
      const idxLeft = ly * localW + 0;
      if (!isMaskSet(gxLeft, gy)) {
        if (localVisited[idxLeft] === 0) {
          localVisited[idxLeft] = 1;
          localQueue[lTail++] = idxLeft;
        }
      }
      const gxRight = maxX + 1;
      const idxRight = ly * localW + (localW - 1);
      if (!isMaskSet(gxRight, gy)) {
        if (localVisited[idxRight] === 0) {
          localVisited[idxRight] = 1;
          localQueue[lTail++] = idxRight;
        }
      }
    }

    while (lHead < lTail) {
      const pos = localQueue[lHead++];
      const lx = pos % localW;
      const ly = Math.floor(pos / localW);

      for (let k = 0; k < 4; k++) {
        const np = k === 0 ? (lx > 0 ? pos - 1 : -1)
          : k === 1 ? (lx < localW - 1 ? pos + 1 : -1)
          : k === 2 ? (ly > 0 ? pos - localW : -1)
          : (ly < localH - 1 ? pos + localW : -1);
        if (np < 0 || localVisited[np] === 1) continue;
        const nlx = np % localW;
        const nly = Math.floor(np / localW);
        const gx = minX - 1 + nlx;
        const gy = minY - 1 + nly;

        if (!isMaskSet(gx, gy)) {
          localVisited[np] = 1;
          localQueue[lTail++] = np;
        }
      }
    }

    for (let ly = 1; ly < localH - 1; ly++) {
      const gy = minY - 1 + ly;
      if (gy < 0 || gy >= imgH) continue;
      for (let lx = 1; lx < localW - 1; lx++) {
        const gx = minX - 1 + lx;
        if (gx < 0 || gx >= imgW) continue;
        const idx = ly * localW + lx;
        if (localVisited[idx] === 0 && mask[gy * imgW + gx] === 0) {
          mask[gy * imgW + gx] = 1;
        }
      }
    }


  const shape: BubbleShapeType = isDarkBubble
    ? 'dark_bubble'
    : bubbleLayoutMode === 'classic'
      ? classifyBubbleShapeLegacy(mask, imgW, imgH, { minX, maxX, minY, maxY })
      : classifyBubbleShape(mask, imgW, imgH, { minX, maxX, minY, maxY }).type;

  return { mask, bounds: { minX, maxX, minY, maxY }, px, py, seedColor: hexColor, isDarkBubble, shape };
}
