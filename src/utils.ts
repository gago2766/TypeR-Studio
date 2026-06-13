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

// =====================================================
// التمطيط العربي (Tatweel / Kashida)
// =====================================================

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
 * تمطيط سطر واحد ليصل إلى targetWidth
 * - يُطبَّق فقط على كلمات ≥ 4 أحرف لتجنب المبالغة
 * - الحد الأقصى للكشيدات لكل حرف = 2 لمنع الشكل الغريب
 * - إذا كان الفرق صغيراً (< 15%) يتم توزيعه بخفة
 */
export function tatweelLine(
  text: string,
  targetWidth: number,
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string,
  strength: number = 3
): string {
  const TATWEEL = 'ـ';
  ctx.font = `${fontSize}px ${fontFamily}`;

  const currentWidth = ctx.measureText(text).width;
  // إذا كان النص يملأ أكثر من 96% من العرض المتاح فلا داعي للتمطيط
  if (currentWidth >= targetWidth * 0.96) return text;

  // إذا كان الفرق أقل من 8% فلا نمطط (النص مقبول بصرياً كما هو)
  const gap = (targetWidth - currentWidth) / targetWidth;
  if (gap < 0.08) return text;

  let words = text.split(' ');

  // جمع المواضع القابلة للتمطيط مع تتبع كم كشيدة أضيفت لكل موضع
  const eligiblePositions: Array<{
    wordIndex: number;
    charIndex: number;
    count: number;
  }> = [];

  words.forEach((word, wordIdx) => {
    const parts = splitWord(word);
    // فقط للكلمات ذات 4 أحرف عربية أو أكثر
    if (parts.core.length >= 4) {
      for (let i = 0; i < parts.core.length - 1; i++) {
        if (canTatweel(parts.core[i])) {
          eligiblePositions.push({
            wordIndex: wordIdx,
            charIndex: parts.prefix.length + i,
            count: 0,
          });
        }
      }
    }
  });

  if (eligiblePositions.length === 0) return text;

  // الحد الأقصى للكشيدات لكل موضع بناءً على strength
  // strength=1 → max 1, strength=2 → max 2, strength=3+ → max 2
  const maxPerPosition = Math.min(strength, 2);

  let attempts = 0;
  const maxAttempts = eligiblePositions.length * maxPerPosition;

  while (attempts < maxAttempts) {
    const measuredWidth = ctx.measureText(words.join(' ')).width;
    if (measuredWidth >= targetWidth * 0.96) break;

    // اختر الموضع الذي له أقل كشيدات (توزيع متساوٍ)
    const posIdx = attempts % eligiblePositions.length;
    const pos = eligiblePositions[posIdx];

    if (pos.count >= maxPerPosition) {
      attempts++;
      continue;
    }

    const word = words[pos.wordIndex];
    words[pos.wordIndex] =
      word.slice(0, pos.charIndex + 1) + TATWEEL + word.slice(pos.charIndex + 1);

    pos.count++;

    // تحديث مواضع نفس الكلمة
    eligiblePositions.forEach(p => {
      if (p.wordIndex === pos.wordIndex && p.charIndex > pos.charIndex) {
        p.charIndex += 1;
      }
    });

    attempts++;
  }

  return words.join(' ');
}

// =====================================================
// نسب عرض الأسطر لكل شكل فقاعة
// =====================================================

/**
 * t = 0 عند المنتصف ، t = 1 عند الأطراف
 * القيمة المُعادة = نسبة من (maxW * padFactor)
 */
function getLineWidthRatio(
  lineIndex: number,
  totalLines: number,
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval'
): number {
  if (bubbleType === 'narrative_box') return 1.0;
  if (totalLines === 1) return 0.88;

  const mid = (totalLines - 1) / 2;
  const t = Math.abs(lineIndex - mid) / mid; // 0..1

  switch (bubbleType) {
    case 'normal_oval':
      return 0.60 + 0.35 * (1 - Math.pow(t, 1.4));
    case 'vertical_oval':
      return 0.52 + 0.40 * (1 - Math.pow(t, 1.2));
    case 'spiky_shout':
      return 0.45 + 0.45 * (1 - Math.pow(t, 2.0));
    case 'thought_cloud':
      return 0.65 + 0.27 * (1 - Math.pow(t, 1.6));
    default:
      return 0.85;
  }
}

// =====================================================
// التفاف النص داخل الفقاعة
// =====================================================

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
    p.trim()
      .split(/\s+/)
      .filter(Boolean)
      .forEach(w => allWords.push(w));
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

      if (lineWords.length === 0 && wordIdx < allWords.length) {
        lineWords.push(allWords[wordIdx++]);
      }
      lines.push(lineWords.join(' '));
    }

    if (wordIdx >= allWords.length) {
      bestLines = lines;
      break;
    }

    // خطة احتياطية عند maxL
    if (linesCount === maxL) {
      const perLine = Math.ceil(allWords.length / maxL);
      const fallback: string[] = [];
      for (let i = 0; i < maxL; i++) {
        const chunk = allWords.slice(i * perLine, (i + 1) * perLine);
        if (chunk.length > 0) fallback.push(chunk.join(' '));
      }
      bestLines = fallback;
    }
  }

  if (bestLines.length === 0) bestLines = [allWords.join(' ')];

  const unstretchedLines = [...bestLines];

  // =====================================================
  // التمطيط التلقائي الخفيف على أول سطر وآخر سطر فقط
  // بشرط أن يكون السطر أقصر من 80% من الحد المتاح
  // =====================================================
  const stretchedLines = bestLines.map((line, idx) => {
    if (!line.trim()) return line;

    const isFirst = idx === 0;
    const isLast = idx === bestLines.length - 1;

    // لا نمطط الأسطر الوسطى
    if (!isFirst && !isLast) return line;

    // لا نمطط إذا كان هناك سطر واحد فقط (سيبدو مبالغاً)
    if (bestLines.length === 1) return line;

    const ratio = getLineWidthRatio(idx, bestLines.length, bubbleType);
    const targetW = maxW * padFactor * ratio;
    const currentW = ctx.measureText(line).width;

    // نمطط فقط إذا كان السطر يشغل بين 55% و 88% من العرض المتاح
    // (أقل من 55% = قد يبدو ممطوطاً جداً، أكثر من 88% = لا حاجة)
    const fill = currentW / targetW;
    if (fill < 0.55 || fill >= 0.88) return line;

    return tatweelLine(line, targetW, ctx, fontSize, fontFamily, 2);
  });

  return {
    lines: stretchedLines,
    unstretchedLines,
    optimalFontSize: fontSize,
  };
}

// =====================================================
// حساب حجم الخط الأمثل للفقاعة
// =====================================================

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

// =====================================================
// IndexedDB - حفظ واسترجاع الخطوط
// =====================================================

export interface StoredFont {
  name: string;
  data: ArrayBuffer;
}

const DB_NAME = 'TypeRStudioFontsDB';
const STORE_NAME = 'fonts';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
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
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ name, data });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getFonts(): Promise<StoredFont[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
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
