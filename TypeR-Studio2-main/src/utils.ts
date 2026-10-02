// TypeR-Studio2-main/src/utils.ts

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

      // تفضيل التمطيط في النصف الثاني أو ما قبل الحرف الأخير للاتساق
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
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval',
  padFactor: number,
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string,
  tracking: number
): string[] {
  if (!words || words.length === 0) return [];
  if (lineCount <= 1 || words.length <= 1) return [words.join(' ')];

  const K = Math.max(1, Math.min(lineCount, words.length));
  const N = words.length;
  const wordWidths = words.map(w => measureTextWidth(ctx, w, fontSize, fontFamily, tracking));
  const spaceWidth = measureTextWidth(ctx, ' ', fontSize, fontFamily, tracking);

  const limits = Array.from({ length: K }, (_, i) => maxW * padFactor * getLineWidthRatio(i, K, bubbleType));

  const ratios = Array.from({ length: K }, (_, i) => getLineWidthRatio(i, K, bubbleType));
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

  // العثور على أطول وأفضل كلمة يمكن تمديدها
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

  // فرز الكلمات حسب طولها لوضع التمطيط في الكلمة الأطول الأكثر اتساعاً
  candidates.sort((a, b) => b.coreLength - a.coreLength);
  const chosen = candidates[0];

  let currentWord = chosen.word;
  let insertIdx = chosen.anchorIdx + 1;
  while (insertIdx < currentWord.length && isDiacritic(currentWord[insertIdx])) {
    insertIdx++;
  }

  // تمديد الموضع المختار تدريجياً وبسلاسة
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

  // استخراج أفضل موضع مد واحد لكل كلمة صالحة
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

  // إذا كان هناك نص محدد
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

  // إذا لم يكن هناك تحديد، نبحث عن أنسب كلمة في السطر
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

  const usableRatio = fillRatio > 0.85 ? 0.94 : 0.86;
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

export function getLineWidthRatio(
  lineIndex: number,
  totalLines: number,
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval'
): number {
  if (bubbleType === 'narrative_box') return 1.0;
  if (totalLines <= 1) return 0.96;

  const mid = (totalLines - 1) / 2;
  const t = Math.abs(lineIndex - mid) / (mid || 1);

  switch (bubbleType) {
    case 'normal_oval':   return 0.78 + 0.22 * (1 - Math.pow(t, 1.6));
    case 'vertical_oval': return 0.70 + 0.28 * (1 - Math.pow(t, 1.4));
    case 'spiky_shout':   return 0.65 + 0.35 * (1 - Math.pow(t, 2.0));
    case 'thought_cloud': return 0.76 + 0.22 * (1 - Math.pow(t, 1.7));
    default:              return 0.90;
  }
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
  bubbleType?: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval' | null;
}): { left: number; top: number; width: number; height: number } {
  const { bboxX, bboxY, bboxW, bboxH, scaleX, scaleY, mask, imgW, imgH } = params;

  const safeScaleX = scaleX > 0 ? scaleX : 1;
  const safeScaleY = scaleY > 0 ? scaleY : 1;

  const dispX = bboxX / safeScaleX;
  const dispY = bboxY / safeScaleY;
  const dispW = Math.max(25, bboxW / safeScaleX);
  const dispH = Math.max(25, bboxH / safeScaleY);

  if (mask && mask.length > 0 && imgW && imgH && bboxW > 0 && bboxH > 0) {
    const metrics = measureBubbleFromMask(mask, imgW, imgH, bboxX, bboxY, bboxW, bboxH);
    const { innerRect } = metrics;

    const innerDispW = Math.max(25, innerRect.w / safeScaleX);
    const innerDispH = Math.max(25, innerRect.h / safeScaleY);

    const trueCenterX = metrics.centerX / safeScaleX;
    const trueCenterY = metrics.centerY / safeScaleY;
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
      tracking
    );

    let fits = true;
    for (let i = 0; i < balanced.length; i++) {
      const ratio = getLineWidthRatio(i, balanced.length, bubbleType);
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
      const ratio = getLineWidthRatio(idx, bestLines.length, bubbleType);
      const targetW = safeW * padFactor * ratio;
      return tatweelLineLight(line, targetW, ctx, fontSize, fontFamily);
    }
    return line;
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
      for (let i = 0; i < unstretchedLines.length; i++) {
        const ratio = getLineWidthRatio(i, unstretchedLines.length, bubbleType);
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
    const stretched = bestLines.map((line, idx) => {
      const ratio = getLineWidthRatio(idx, bestLines.length, bubbleType);
      const targetW = safeW * padFactor * ratio;
      return tatweelLineLight(line, targetW, ctx, bestFontSize, fontFamily);
    });
    finalText = stretched.join('\n');
  }

  return { fontSize: bestFontSize, textWithBreaks: finalText };
}

export function stretchSelectedText(
  fullText: string,
  selectedText: string,
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval',
  maxW: number,
  fontSize: number,
  fontFamily: string,
  tracking: number,
  marginPercent: number = 10
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
      const ratio = getLineWidthRatio(idx, totalLines, bubbleType);
      const targetW = safeW * padFactor * ratio;
      return tatweelLineLight(line, targetW, ctx, fontSize, fontFamily);
    }
    return line;
  });

  return stretchedLines.join('\n');
}

export function whitenMaskArea(
  canvas: HTMLCanvasElement,
  mask: Uint8Array,
  imgW: number,
  imgH: number,
  fillColorHex: string = '#ffffff',
  bbox?: { x: number; y: number; w: number; h: number }
): string {
  if (!canvas || !mask || mask.length === 0 || imgW <= 0 || imgH <= 0) {
    return canvas ? canvas.toDataURL() : '';
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL();

  if (canvas.width !== imgW || canvas.height !== imgH) {
    canvas.width = imgW;
    canvas.height = imgH;
  }

  const startX = bbox ? Math.max(0, bbox.x) : 0;
  const startY = bbox ? Math.max(0, bbox.y) : 0;
  const regionW = bbox ? Math.min(imgW - startX, bbox.w) : imgW;
  const regionH = bbox ? Math.min(imgH - startY, bbox.h) : imgH;

  if (regionW <= 0 || regionH <= 0) return canvas.toDataURL();

  const imgData = ctx.getImageData(startX, startY, regionW, regionH);
  const data = imgData.data;

  let fillR = 255, fillG = 255, fillB = 255, fillA = 255;
  if (fillColorHex.startsWith('#')) {
    const hex = fillColorHex.substring(1);
    if (hex.length === 3) {
      fillR = parseInt(hex[0] + hex[0], 16);
      fillG = parseInt(hex[1] + hex[1], 16);
      fillB = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      fillR = parseInt(hex.substring(0, 2), 16);
      fillG = parseInt(hex.substring(2, 4), 16);
      fillB = parseInt(hex.substring(4, 6), 16);
    }
  }

  for (let localY = 0; localY < regionH; localY++) {
    const globalY = startY + localY;
    const maskRow = globalY * imgW;
    const dataRow = localY * regionW;

    for (let localX = 0; localX < regionW; localX++) {
      const globalX = startX + localX;
      if (mask[maskRow + globalX] === 1) {
        const p = (dataRow + localX) * 4;
        data[p] = fillR;
        data[p + 1] = fillG;
        data[p + 2] = fillB;
        data[p + 3] = fillA;
      }
    }
  }

  ctx.putImageData(imgData, startX, startY);
  return canvas.toDataURL();
}

export function contentAwareFillLocal(
  targetCtx: CanvasRenderingContext2D,
  sourceImg: HTMLImageElement,
  rect: { x: number; y: number; width: number; height: number },
  mask?: Uint8Array | null,
  imgW?: number,
  imgH?: number
): void {
  const w = imgW || sourceImg.naturalWidth;
  const h = imgH || sourceImg.naturalHeight;

  if (w <= 0 || h <= 0) return;

  const margin = 28;
  const minX = Math.max(0, Math.floor(rect.x) - margin);
  const minY = Math.max(0, Math.floor(rect.y) - margin);
  const maxX = Math.min(w - 1, Math.ceil(rect.x + rect.width) + margin);
  const maxY = Math.min(h - 1, Math.ceil(rect.y + rect.height) + margin);

  const regionW = maxX - minX + 1;
  const regionH = maxY - minY + 1;
  if (regionW <= 0 || regionH <= 0) return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) return;

  tempCtx.drawImage(sourceImg, 0, 0);
  if (targetCtx.canvas) {
    tempCtx.drawImage(targetCtx.canvas, 0, 0);
  }

  const imgData = tempCtx.getImageData(minX, minY, regionW, regionH);
  const data = imgData.data;

  const localMask = new Uint8Array(regionW * regionH);
  let maskedCount = 0;

  const isMaskedGlobal = (gx: number, gy: number): boolean => {
    if (gx < 0 || gx >= w || gy < 0 || gy >= h) return false;
    const insideRect = gx >= rect.x && gx < rect.x + rect.width && gy >= rect.y && gy < rect.y + rect.height;
    if (mask && mask.length === w * h) {
      return mask[gy * w + gx] === 1 || insideRect;
    }
    return insideRect;
  };

  for (let ly = 0; ly < regionH; ly++) {
    const gy = minY + ly;
    for (let lx = 0; lx < regionW; lx++) {
      const gx = minX + lx;
      if (isMaskedGlobal(gx, gy)) {
        localMask[ly * regionW + lx] = 1;
        maskedCount++;
      }
    }
  }

  if (maskedCount === 0) return;

  const PATCH_R = 3;

  const candidateCenters: number[] = [];
  for (let ly = PATCH_R; ly < regionH - PATCH_R; ly += 2) {
    for (let lx = PATCH_R; lx < regionW - PATCH_R; lx += 2) {
      let isClean = true;
      for (let dy = -PATCH_R; dy <= PATCH_R; dy++) {
        for (let dx = -PATCH_R; dx <= PATCH_R; dx++) {
          const idx = (ly + dy) * regionW + (lx + dx);
          if (localMask[idx] !== 0) {
            isClean = false;
            break;
          }
        }
        if (!isClean) break;
      }
      if (isClean) {
        candidateCenters.push(ly * regionW + lx);
      }
    }
  }

  if (candidateCenters.length === 0) {
    for (let ly = PATCH_R; ly < regionH - PATCH_R; ly += 2) {
      for (let lx = PATCH_R; lx < regionW - PATCH_R; lx += 2) {
        let cleanCount = 0;
        for (let dy = -PATCH_R; dy <= PATCH_R; dy++) {
          for (let dx = -PATCH_R; dx <= PATCH_R; dx++) {
            const idx = (ly + dy) * regionW + (lx + dx);
            if (localMask[idx] === 0) cleanCount++;
          }
        }
        if (cleanCount >= 32) {
          candidateCenters.push(ly * regionW + lx);
        }
      }
    }
  }

  let unfilledCount = maskedCount;
  let iterations = 0;
  const maxIterations = 50;

  while (unfilledCount > 0 && iterations < maxIterations) {
    iterations++;

    const frontier: number[] = [];
    for (let ly = 0; ly < regionH; ly++) {
      for (let lx = 0; lx < regionW; lx++) {
        const idx = ly * regionW + lx;
        if (localMask[idx] === 1) {
          let hasKnownNeighbor = false;
          if (lx > 0 && localMask[idx - 1] !== 1) hasKnownNeighbor = true;
          else if (lx < regionW - 1 && localMask[idx + 1] !== 1) hasKnownNeighbor = true;
          else if (ly > 0 && localMask[idx - regionW] !== 1) hasKnownNeighbor = true;
          else if (ly < regionH - 1 && localMask[idx + regionW] !== 1) hasKnownNeighbor = true;

          if (hasKnownNeighbor) {
            frontier.push(idx);
          }
        }
      }
    }

    if (frontier.length === 0) break;

    let filledInThisPass = 0;

    for (let f = 0; f < frontier.length; f++) {
      const targetIdx = frontier[f];
      if (localMask[targetIdx] !== 1) continue;

      const tx = targetIdx % regionW;
      const ty = Math.floor(targetIdx / regionW);

      let bestCandidateIdx = -1;
      let minSSD = Infinity;

      const candStep = candidateCenters.length > 150 ? Math.floor(candidateCenters.length / 150) : 1;

      for (let c = 0; c < candidateCenters.length; c += candStep) {
        const candIdx = candidateCenters[c];
        const cx = candIdx % regionW;
        const cy = Math.floor(candIdx / regionW);

        let ssd = 0;
        let knownCount = 0;

        for (let dy = -PATCH_R; dy <= PATCH_R; dy++) {
          const tY = ty + dy;
          const cY = cy + dy;
          if (tY < 0 || tY >= regionH || cY < 0 || cY >= regionH) continue;

          for (let dx = -PATCH_R; dx <= PATCH_R; dx++) {
            const tX = tx + dx;
            const cX = cx + dx;
            if (tX < 0 || tX >= regionW || cX < 0 || cX >= regionW) continue;

            const tPos = tY * regionW + tX;
            if (localMask[tPos] !== 1) {
              const cPos = cY * regionW + cX;
              const tPix = tPos * 4;
              const cPix = cPos * 4;

              const dr = data[tPix] - data[cPix];
              const dg = data[tPix + 1] - data[cPix + 1];
              const db = data[tPix + 2] - data[cPix + 2];

              ssd += dr * dr + dg * dg + db * db;
              knownCount++;
            }
          }
        }

        if (knownCount > 0) {
          const normalizedSSD = ssd / knownCount;
          if (normalizedSSD < minSSD) {
            minSSD = normalizedSSD;
            bestCandidateIdx = candIdx;
          }
        }
      }

      if (bestCandidateIdx !== -1) {
        const cx = bestCandidateIdx % regionW;
        const cy = Math.floor(bestCandidateIdx / regionW);

        for (let dy = -PATCH_R; dy <= PATCH_R; dy++) {
          const tY = ty + dy;
          const cY = cy + dy;
          if (tY < 0 || tY >= regionH || cY < 0 || cY >= regionH) continue;

          for (let dx = -PATCH_R; dx <= PATCH_R; dx++) {
            const tX = tx + dx;
            const cX = cx + dx;
            if (tX < 0 || tX >= regionW || cX < 0 || cX >= regionW) continue;

            const tPos = tY * regionW + tX;
            if (localMask[tPos] === 1) {
              const cPos = cY * regionW + cX;
              const tPix = tPos * 4;
              const cPix = cPos * 4;

              data[tPix]     = data[cPix];
              data[tPix + 1] = data[cPix + 1];
              data[tPix + 2] = data[cPix + 2];
              data[tPix + 3] = data[cPix + 3];

              localMask[tPos] = 2;
              unfilledCount--;
              filledInThisPass++;
            }
          }
        }
      }
    }

    if (filledInThisPass === 0) {
      for (let ly = 0; ly < regionH; ly++) {
        for (let lx = 0; lx < regionW; lx++) {
          const idx = ly * regionW + lx;
          if (localMask[idx] === 1) {
            let minDist = Infinity;
            let nearestPix = -1;
            for (let dy = -8; dy <= 8; dy++) {
              for (let dx = -8; dx <= 8; dx++) {
                const ny = ly + dy;
                const nx = lx + dx;
                if (nx >= 0 && nx < regionW && ny >= 0 && ny < regionH) {
                  const nIdx = ny * regionW + nx;
                  if (localMask[nIdx] !== 1) {
                    const dist = dx * dx + dy * dy;
                    if (dist < minDist) {
                      minDist = dist;
                      nearestPix = nIdx * 4;
                    }
                  }
                }
              }
            }
            if (nearestPix !== -1) {
              const pix = idx * 4;
              data[pix]     = data[nearestPix];
              data[pix + 1] = data[nearestPix + 1];
              data[pix + 2] = data[nearestPix + 2];
              data[pix + 3] = data[nearestPix + 3];
              localMask[idx] = 2;
              unfilledCount--;
            }
          }
        }
      }
      break;
    }
  }

  targetCtx.putImageData(imgData, minX, minY);
}

// ============================================================================
// 🎨 خوارزمية ذكية لاستخراج التدرج اللوني والـ Stroke من مساحة التحديد في صورة المانجا
// ============================================================================

export interface ExtractedStyleResult {
  color1: string;
  color2: string;
  angle: number;
  strokeColor: string;
  strokeWidth: number;
  textColor: string;
}

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

  // 1. حساب متوسط لون الخلفية من أطراف التحديد
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

  // 2. تصفية بكسلات النص
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

  const topHalf = textPixels.filter(p => p.y < realH * 0.45);
  const bottomHalf = textPixels.filter(p => p.y > realH * 0.55);

  const getDominantColor = (pixels: SampledPixel[]): { r: number; g: number; b: number } => {
    if (pixels.length === 0) return { r: 255, g: 255, b: 255 };
    pixels.sort((a, b) => b.dist - a.dist);
    const topSlice = pixels.slice(0, Math.max(5, Math.floor(pixels.length * 0.3)));
    let sr = 0, sg = 0, sb = 0;
    topSlice.forEach(p => {
      sr += p.r;
      sg += p.g;
      sb += p.b;
    });
    return {
      r: Math.round(sr / topSlice.length),
      g: Math.round(sg / topSlice.length),
      b: Math.round(sb / topSlice.length),
    };
  };

  const cTop = getDominantColor(topHalf.length > 0 ? topHalf : textPixels);
  const cBottom = getDominantColor(bottomHalf.length > 0 ? bottomHalf : textPixels);

  const hex1 = "#" + ((1 << 24) + (cTop.r << 16) + (cTop.g << 8) + cTop.b).toString(16).slice(1);
  const hex2 = "#" + ((1 << 24) + (cBottom.r << 16) + (cBottom.g << 8) + cBottom.b).toString(16).slice(1);

  // 3. كشف الـ Stroke
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
    angle: 90,
    strokeColor,
    strokeWidth,
    textColor: hex1,
  };
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
