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

export function calculateOptimalFontSize(
  text: string,
  containerWidth: number,
  containerHeight: number,
  fontFamily: string,
  lineHeight: number,
  tracking: number
): number {
  const MIN = 8;
  const MAX = Math.min(120, Math.floor(containerHeight * 0.95));
  if (MAX <= MIN) return MIN;

  const paddingX = containerWidth * 0.04;
  const paddingY = containerWidth * 0.04;
  const availW = Math.max(10, containerWidth - paddingX * 2);
  const availH = Math.max(10, containerHeight - paddingY * 2);

  const testDiv = document.createElement('div');
  testDiv.style.cssText = `
    position: absolute;
    visibility: hidden;
    left: -9999px;
    top: -9999px;
    max-width: ${availW}px;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: ${fontFamily};
    line-height: ${lineHeight};
    letter-spacing: ${tracking}px;
    direction: rtl;
    unicode-bidi: plaintext;
  `;
  testDiv.textContent = text;
  document.body.appendChild(testDiv);

  let lo = MIN;
  let hi = MAX;
  let best = MIN;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    testDiv.style.fontSize = `${mid}px`;
    if (testDiv.offsetWidth <= availW && testDiv.offsetHeight <= availH) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  document.body.removeChild(testDiv);
  return best;
}

const TATWEEL_CONNECTORS = new Set('بتثجحخسشصضطظعغفقكلمنهيئ'.split(''));

export function canTatweel(ch: string): boolean {
  return TATWEEL_CONNECTORS.has(ch);
}

function splitWord(word: string) {
  const prefixMatch = word.match(/^[^\u0621-\u064A\u0671-\u06D3]+/);
  const suffixMatch = word.match(/[^\u0621-\u064A\u0671-\u06D3]+$/);
  const prefix = prefixMatch ? prefixMatch[0] : '';
  const suffix = suffixMatch ? suffixMatch[0] : '';
  const core = word.substring(prefix.length, word.length - suffix.length);
  return { prefix, core, suffix };
}

/**
 * تمطيط خفيف وجمالي لسطر واحد
 * - يعمل فقط عندما يكون السطر أقصر من الحد بنسبة 22% أو أكثر
 * - يختار أطول الكلمات أولاً للتوزيع الأجمل
 * - حد أقصى كشيدتان لكل كلمة
 * - يتوقف عند 90% من العرض المتاح
 */
export function tatweelLineLight(
  line: string,
  targetWidth: number,
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string
): string {
  const TATWEEL = 'ـ';
  const TARGET_FILL = 0.90;

  ctx.font = `${fontSize}px ${fontFamily}`;
  const currentWidth = ctx.measureText(line).width;

  if (currentWidth >= targetWidth * 0.78) return line;

  const words = line.split(' ');
  if (words.length < 2) return line;

  type TatweelPos = { wordIndex: number; charIndex: number; wordLength: number };
  const positions: TatweelPos[] = [];

  words.forEach((word, wi) => {
    const { prefix, core } = splitWord(word);
    if (core.length < 4) return;
    for (let ci = 0; ci < core.length - 1; ci++) {
      if (canTatweel(core[ci])) {
        positions.push({ wordIndex: wi, charIndex: prefix.length + ci, wordLength: core.length });
      }
    }
  });

  if (positions.length === 0) return line;

  positions.sort((a, b) => b.wordLength - a.wordLength);

  const tatweelCountPerWord: Record<number, number> = {};
  const currentWords = [...words];
  const charOffset: Record<number, number> = {};

  for (const pos of positions) {
    const wi = pos.wordIndex;
    if ((tatweelCountPerWord[wi] ?? 0) >= 2) continue;

    const offset = charOffset[wi] ?? 0;
    const realCharIdx = pos.charIndex + offset;
    const word = currentWords[wi];
    if (realCharIdx >= word.length - 1) continue;

    const newWord = word.slice(0, realCharIdx + 1) + TATWEEL + word.slice(realCharIdx + 1);
    currentWords[wi] = newWord;
    charOffset[wi] = (charOffset[wi] ?? 0) + 1;
    tatweelCountPerWord[wi] = (tatweelCountPerWord[wi] ?? 0) + 1;

    const newWidth = ctx.measureText(currentWords.join(' ')).width;
    if (newWidth >= targetWidth * TARGET_FILL) break;
  }

  return currentWords.join(' ');
}

/**
 * التمطيط اليدوي الكامل (زر التمطيط اليدوي فقط)
 */
export function tatweelLine(
  text: string,
  targetWidth: number,
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string,
  strength: number = 4
): string {
  const TATWEEL = 'ـ';
  let words = text.split(' ');

  ctx.font = `${fontSize}px ${fontFamily}`;
  let currentWidth = ctx.measureText(words.join(' ')).width;
  if (currentWidth >= targetWidth * 0.96) return text;

  const eligiblePositions: Array<{ wordIndex: number; charIndex: number }> = [];
  words.forEach((word, wordIdx) => {
    const parts = splitWord(word);
    if (parts.core.length >= 5) {
      for (let i = 0; i < parts.core.length - 1; i++) {
        if (canTatweel(parts.core[i])) {
          eligiblePositions.push({ wordIndex: wordIdx, charIndex: parts.prefix.length + i });
        }
      }
    }
  });

  if (eligiblePositions.length === 0) return text;

  let attempts = 0;
  const maxAttempts = strength * 25;

  while (attempts < maxAttempts) {
    currentWidth = ctx.measureText(words.join(' ')).width;
    if (currentWidth >= targetWidth * 0.97) break;

    const pos = eligiblePositions[attempts % eligiblePositions.length];
    const word = words[pos.wordIndex];
    words[pos.wordIndex] = word.slice(0, pos.charIndex + 1) + TATWEEL + word.slice(pos.charIndex + 1);

    eligiblePositions.forEach(p => {
      if (p.wordIndex === pos.wordIndex && p.charIndex > pos.charIndex) p.charIndex += 1;
    });

    attempts++;
  }
  return words.join(' ');
}

// =====================================================
// نسب عرض الأسطر لكل شكل فقاعة
// =====================================================

function getLineWidthRatio(
  lineIndex: number,
  totalLines: number,
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval'
): number {
  if (bubbleType === 'narrative_box') return 1.0;
  if (totalLines === 1) return 0.88;

  const mid = (totalLines - 1) / 2;
  const t = Math.abs(lineIndex - mid) / mid;

  switch (bubbleType) {
    case 'normal_oval':   return 0.60 + 0.35 * (1 - Math.pow(t, 1.4));
    case 'vertical_oval': return 0.52 + 0.40 * (1 - Math.pow(t, 1.2));
    case 'spiky_shout':   return 0.45 + 0.45 * (1 - Math.pow(t, 2.0));
    case 'thought_cloud': return 0.65 + 0.27 * (1 - Math.pow(t, 1.6));
    default:              return 0.85;
  }
}

// =====================================================
// حساب الأبعاد الدقيقة للفقاعة بعد تطبيق الهامش
// يُستخدم في App.tsx عند التحديد بالعصا السحرية
// =====================================================

/**
 * يحسب أبعاد صندوق النص الداخلي بناءً على أبعاد الفقاعة الخام ونسبة الهامش
 * marginPercent: 5 أو 10 أو 15
 * scaleX/scaleY: نسبة تحويل بكسل الصورة ← بكسل الشاشة
 */
export function computeLayerBoundsFromWand(params: {
  bboxX: number;      // x بكسل الصورة
  bboxY: number;      // y بكسل الصورة
  bboxW: number;      // عرض الفقاعة بكسل الصورة
  bboxH: number;      // ارتفاع الفقاعة بكسل الصورة
  scaleX: number;     // imgWidth / dispWidth
  scaleY: number;     // imgHeight / dispHeight
  marginPercent: number; // 5 أو 10 أو 15
}): { left: number; top: number; width: number; height: number } {
  const { bboxX, bboxY, bboxW, bboxH, scaleX, scaleY, marginPercent } = params;

  // تحويل من بكسل الصورة إلى بكسل الشاشة
  const dispX = bboxX / scaleX;
  const dispY = bboxY / scaleY;
  const dispW = bboxW / scaleX;
  const dispH = bboxH / scaleY;

  // تطبيق الهامش بشكل مستقل على المحورين
  // الهامش الأفقي والرأسي يُحسب كنسبة من البُعد الأصغر لحماية أشكال المستطيلات الطويلة
  const marginRatio = marginPercent / 100;
  const padX = dispW * marginRatio;
  const padY = dispH * marginRatio;

  return {
    left:   dispX + padX,
    top:    dispY + padY,
    width:  Math.max(20, dispW - padX * 2),
    height: Math.max(20, dispH - padY * 2),
  };
}

export function wrapTextToShape(
  text: string,
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval',
  maxW: number,
  maxH: number,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
  tracking: number,
  marginPercent: number = 10,
  lineCountOverride?: number
): { lines: string[]; unstretchedLines: string[]; optimalFontSize: number } {
  const padFactor = 1 - marginPercent / 100;
  const lineH = fontSize * lineHeight;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.direction = 'rtl';

  const measureWidth = (str: string) => {
    const w = ctx.measureText(str).width;
    return w + (str.length > 1 ? (str.length - 1) * tracking : 0);
  };

  const allWords: string[] = [];
  text.split('\n').forEach(p => {
    p.trim().split(/\s+/).filter(Boolean).forEach(w => allWords.push(w));
  });

  if (allWords.length === 0) {
    return { lines: [''], unstretchedLines: [''], optimalFontSize: fontSize };
  }

  const maxLinesFromHeight = Math.max(1, Math.floor((maxH * padFactor) / lineH));
  const minL = lineCountOverride ?? 1;
  const maxL = lineCountOverride ?? maxLinesFromHeight;

  let bestLines: string[] = [];

  for (let linesCount = minL; linesCount <= maxL; linesCount++) {
    const lines: string[] = [];
    let wordIdx = 0;

    for (let li = 0; li < linesCount && wordIdx < allWords.length; li++) {
      const ratio = getLineWidthRatio(li, linesCount, bubbleType);
      const limit = maxW * padFactor * ratio;
      let lineWords: string[] = [];

      while (wordIdx < allWords.length) {
        const test = [...lineWords, allWords[wordIdx]].join(' ');
        if (measureWidth(test) <= limit) {
          lineWords.push(allWords[wordIdx++]);
        } else {
          break;
        }
      }

      if (lineWords.length === 0) lineWords.push(allWords[wordIdx++]);
      lines.push(lineWords.join(' '));
    }

    if (wordIdx >= allWords.length) {
      bestLines = lines;
      break;
    }

    if (linesCount === maxL) {
      const perLine = Math.ceil(allWords.length / maxL);
      bestLines = [];
      for (let i = 0; i < maxL; i++) {
        const chunk = allWords.slice(i * perLine, (i + 1) * perLine);
        if (chunk.length > 0) bestLines.push(chunk.join(' '));
      }
    }
  }

  if (bestLines.length === 0) bestLines = [allWords.join(' ')];

  const unstretchedLines = [...bestLines];

  // تمطيط خفيف على أول سطر وآخر سطر فقط (إذا كان هناك سطران أو أكثر)
  const stretchedLines = bestLines.map((line, idx) => {
    if (bestLines.length < 2) return line;
    const isFirst = idx === 0;
    const isLast  = idx === bestLines.length - 1;
    if (!isFirst && !isLast) return line;

    const ratio = getLineWidthRatio(idx, bestLines.length, bubbleType);
    const targetW = maxW * padFactor * ratio;
    return tatweelLineLight(line, targetW, ctx, fontSize, fontFamily);
  });

  return { lines: stretchedLines, unstretchedLines, optimalFontSize: fontSize };
}

export function calculateOptimalFontSizeForShape(
  text: string,
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval',
  containerWidth: number,
  containerHeight: number,
  fontFamily: string,
  lineHeight: number,
  tracking: number,
  marginPercent: number = 10,
  lineCountOverride?: number
): { fontSize: number; textWithBreaks: string } {
  const padFactor = 1 - marginPercent / 100;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const measureWidth = (str: string, fSize: number) => {
    ctx.font = `${fSize}px ${fontFamily}`;
    const w = ctx.measureText(str).width;
    return w + (str.length > 1 ? (str.length - 1) * tracking : 0);
  };

  let low = 8;
  let high = Math.min(80, Math.floor(containerHeight * 0.9));
  let bestFontSize = low;
  let bestText = text;

  while (low <= high) {
    const mid = (low + high) >> 1;

    const { lines, unstretchedLines } = wrapTextToShape(
      text,
      bubbleType,
      containerWidth,
      containerHeight,
      mid,
      fontFamily,
      lineHeight,
      tracking,
      marginPercent,
      lineCountOverride
    );

    const totalH = lines.length * mid * lineHeight;
    let fits = totalH <= containerHeight * padFactor && lines.length > 0;

    if (fits) {
      for (let i = 0; i < unstretchedLines.length; i++) {
        const ratio = getLineWidthRatio(i, unstretchedLines.length, bubbleType);
        const limit = containerWidth * padFactor * ratio;
        if (measureWidth(unstretchedLines[i], mid) > limit) {
          fits = false;
          break;
        }
      }
    }

    if (fits) {
      bestFontSize = mid;
      bestText = lines.join('\n');
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return { fontSize: bestFontSize, textWithBreaks: bestText };
}

// ===================================================
// IndexedDB - حفظ الخطوط
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
