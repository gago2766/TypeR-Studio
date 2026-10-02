// src/utils/tatweel.ts

// 🟢 الحروف العربية التي تتصل من الجهتين
export const DUAL_JOINING_CONNECTORS = new Set('بتثجحخسشصضطظعغفقكلمنهيئ'.split(''));

// 🔴 الحروف التي لا يمكن أن تسبقها أو تليها كشيدة
export const NON_RIGHT_CONNECTORS = new Set(['ء', ' ', '\t', '\n', '،', '؟', '!', '.', ':', '؛', '»', '«', ')', ']', '(', '[']);

// 🌟 تصنيف قوة موضع التمطيط لمنع التشققات والحفاظ على التحام الكلمة
export const HIGH_PRIORITY_CONNECTORS = new Set('سشصضطظعغفقكه'.split(''));
export const MEDIUM_PRIORITY_CONNECTORS = new Set('محجخن'.split(''));
export const TEETH_LETTERS = new Set('بتثنيئ'.split(''));

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

export const NON_ARABIC_PREFIX = /^[^\u0621-\u064A\u064B-\u065F\u0670-\u06D3\u06D5\uFB50-\uFDFF\uFE70-\uFEFC]+/;
export const NON_ARABIC_SUFFIX = /[^\u0621-\u064A\u064B-\u065F\u0670-\u06D3\u06D5\uFB50-\uFDFF\uFE70-\uFEFC]+$/;

export function splitWord(word: string) {
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

// 🛡️ دالة لتنظيف وتأمين صيغة الخط قبل تمريرها للكانفاس
export function formatFontFamilyForCanvas(fontFamily: string): string {
  if (!fontFamily) return 'sans-serif';
  const cleanName = fontFamily.replace(/['"]/g, '').trim();
  if (cleanName.includes(',')) {
    return cleanName;
  }
  return `'${cleanName}', sans-serif`;
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
