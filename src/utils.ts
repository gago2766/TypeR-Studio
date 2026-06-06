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
    direction: rtl; /* يطابق اتجاه الرسم والتفاف الأسطر العربي الفعلي لحساب دقيق لحجم الخط */
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

// الروابط العربية المتناسقة التي تقبل التمديد والاتصال الأمامي
const TATWEEL_CONNECTORS = new Set('بتثجحخسشصضطظعغفقكلمنهي'.split(''));

export function canTatweel(ch: string): boolean {
  return TATWEEL_CONNECTORS.has(ch);
}

// 🧠 خوارزمية ذكية تمدد الكلمات الطويلة فقط لوزن السطور وجعلها تتلامس مع حواف الفقاعة بنسبة 100%
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
  if (currentWidth >= targetWidth * 0.96) return text; // السطر متناسق بالفعل

  // العثور على مواضع التمديد المؤهلة بشرط أن تكون الكلمة كبيرة
  const eligiblePositions: Array<{ wordIndex: number; charIndex: number }> = [];
  words.forEach((word, wordIdx) => {
    // 👈 ضعه فقط في الكلمات الكبيرة (5 أحرف أو أكثر) واستبعد الكلمات ذات الـ 2 و 3 و 4 أحرف
    if (word.length >= 5) {
      // 👈 حماية أطراف الكلمات: لا تضع التمديد في نهاية أو قبل نهاية الكلمة أبداً (i < word.length - 2)
      for (let i = 0; i < word.length - 2; i++) {
        if (canTatweel(word[i])) {
          eligiblePositions.push({ wordIndex: wordIdx, charIndex: i });
        }
      }
    }
  });

  if (eligiblePositions.length === 0) return text;

  // إدخال الكشيدات بالتناوب لتمديد السطر بانسجام تام ومطابقة العرض بنسبة 100%
  let attempts = 0;
  const maxAttempts = strength * 25;

  while (attempts < maxAttempts) {
    currentWidth = ctx.measureText(words.join(' ')).width;
    if (currentWidth >= targetWidth * 0.97) {
      break; // تم الوصول للعرض الهندسي المثالي
    }

    const pos = eligiblePositions[attempts % eligiblePositions.length];
    const word = words[pos.wordIndex];
    
    words[pos.wordIndex] = word.slice(0, pos.charIndex + 1) + TATWEEL + word.slice(pos.charIndex + 1);
    
    // تحديث إزاحة الحروف للكلمة الممتدة
    eligiblePositions.forEach(p => {
      if (p.wordIndex === pos.wordIndex && p.charIndex > pos.charIndex) {
        p.charIndex += 1;
      }
    });

    attempts++;
  }
  return words.join(' ');
}

export function wrapTextToShape(
  text: string,
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval', // بيضاوية رأسية vertical_oval
  maxW: number,
  maxH: number,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
  tracking: number,
  marginPercent: number = 10 // القيمة الافتراضية للهامش هي 10%
): { lines: string[]; optimalFontSize: number } {
  const lineH = fontSize * lineHeight;
  
  // تقسيم النص بناءً على فواصل الأسطر اليدوية للحفاظ على رغبة المترجم
  const inputLines = text.split('\n');
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.direction = 'rtl';
  }

  const measureWidth = (str: string) => {
    if (!ctx) return str.length * fontSize * 0.55;
    return ctx.measureText(str).width + (str.length > 0 ? (str.length - 1) * tracking : 0);
  };

  // دالة الحساب الهندسي الدقيق لعرض السطر الأقصى بناءً على موقعه الرأسي ومطابقة لصور الـ PDF تماماً
  const getWidthLimit = (lineIndex: number, totalLines: number) => {
    const padFactor = 1 - (marginPercent / 100);

    // الصناديق السردية المستطيلة عرضها ثابت ومحاذى دائماً بالتساوي
    if (bubbleType === 'narrative_box') {
      return maxW * padFactor;
    }
    
    if (totalLines <= 1) {
      let singleLineFactor = 0.85;
      if (bubbleType === 'spiky_shout') singleLineFactor = 0.72;
      if (bubbleType === 'thought_cloud') singleLineFactor = 0.78;
      return maxW * singleLineFactor * padFactor;
    }
    
    const totalLinesHeight = totalLines * lineH;
    const centerYOffset = -(totalLinesHeight / 2) + (lineIndex * lineH) + (lineH / 2);
    const semiHeight = maxH / 2;
    const normalizedY = centerYOffset / Math.max(1, semiHeight);
    
    const clampedY = Math.max(-0.99, Math.min(0.99, normalizedY));
    const t = Math.abs(clampedY); // معامل البُعد المتناظر عن المركز
    
    let ratio = 1.0;
    
    if (bubbleType === 'normal_oval') {
      // بيضاوية عادية: تناقص متناسق وسلس؛ الأطراف بنسبة 0.45 والسطور المتوسطة بنسبة 0.80
      ratio = 1 - 0.55 * Math.pow(t, 1.25);
    } else if (bubbleType === 'vertical_oval') {
      // بيضاوية رأسية مطولة: انحناء حاد وعميق للأطراف؛ الأطراف بنسبة 0.30 والمتوسطة بنسبة 0.65 والمركزية بنسبة 0.90
      ratio = 1 - 0.68 * Math.pow(t, 1.15);
    } else if (bubbleType === 'thought_cloud') {
      // تفكير سحابية: انتفاخ عريض وممتلئ؛ الأطراف بنسبة 0.55 والمتوسطة بنسبة 0.85
      ratio = 1 - 0.45 * Math.pow(t, 1.3);
    } else if (bubbleType === 'spiky_shout') {
      // صراخ حماسية: شكل برميلي عريض ومحمي من الأشواك؛ الأطراف بنسبة 0.45 والمتوسطة بنسبة 0.80 مع هامش أمان داخلي
      ratio = (1 - 0.55 * Math.pow(t, 2.0)) * 0.75;
    }
    
    return maxW * ratio * padFactor;
  };

  // تجميع كل كلمات النص المدخلة لفرزها ديناميكياً
  const allWords: string[] = [];
  inputLines.forEach(p => {
    const words = p.trim().split(/\s+/).filter(Boolean);
    allWords.push(...words);
  });

  if (allWords.length === 0) {
    return { lines: [''], optimalFontSize: fontSize };
  }

  // توزيع الكلمات ديناميكياً بشكل متوازن تماماً وبناءً على عروض الأسطر المتفاوتة هندسياً
  let bestLines: string[] = [];
  let minLinesCount = 1;
  let maxLinesCount = Math.max(1, Math.floor((maxH * (1 - marginPercent / 100)) / lineH));

  for (let linesCount = minLinesCount; linesCount <= maxLinesCount; linesCount++) {
    let currentLines: string[] = [];
    let wordIndex = 0;
    let success = true;

    for (let lineIndex = 0; lineIndex < linesCount; lineIndex++) {
      if (wordIndex >= allWords.length) break;

      const limit = getWidthLimit(lineIndex, linesCount);
      let currentLineWords: string[] = [];
      
      while (wordIndex < allWords.length) {
        const nextWord = allWords[wordIndex];
        const testLine = [...currentLineWords, nextWord].join(' ');
        if (measureWidth(testLine) <= limit) {
          currentLineWords.push(nextWord);
          wordIndex++;
        } else {
          break;
        }
      }

      if (currentLineWords.length === 0) {
        success = false;
        break;
      }
      currentLines.push(currentLineWords.join(' '));
    }

    if (success && wordIndex >= allWords.length) {
      bestLines = currentLines;
      break; // تم العثور على التوزيع الأنسب والأكثر موازنةً بين السطور!
    }
  }

  // خطة الاحتياط في حال لم ينجح التقسيم الهندسي المتكامل
  if (bestLines.length === 0) {
    let currentLineWords: string[] = [];
    let lineIndex = 0;
    for (let w = 0; w < allWords.length; w++) {
      const word = allWords[w];
      const testLine = [...currentLineWords, word].join(' ');
      const limit = getWidthLimit(lineIndex, 3);
      if (measureWidth(testLine) <= limit) {
        currentLineWords.push(word);
      } else {
        if (currentLineWords.length > 0) {
          bestLines.push(currentLineWords.join(' '));
        }
        currentLineWords = [word];
        lineIndex++;
      }
    }
    if (currentLineWords.length > 0) {
      bestLines.push(currentLineWords.join(' '));
    }
  }

  // 👈 تطبيق تمطيط الأسطر (الكشيدة) تلقائياً لتوسيع الحروف حتى تملأ المساحة الهندسية المخصصة لكل سطر بنسبة 100% ومطابقة للرسومات
  // (تم تمكين التمطيط التلقائي للصندوق المستطيل لضمان اصطفاف أسطره بنفس الحجم تماماً!)
  const stretchedLines = bestLines.map((line, idx) => {
    if (!line.trim()) return line;
    const limit = getWidthLimit(idx, bestLines.length);
    return tatweelLine(line, limit, ctx!, fontSize, fontFamily, 5); // تم استخدام قوة تمطيط مخصصة للصندوق لوزن حوافه بدقة متناهية
  });

  return { lines: stretchedLines, optimalFontSize: fontSize };
}

export function calculateOptimalFontSizeForShape(
  text: string,
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval', // 👈 بيضاوية رأسية vertical_oval
  containerWidth: number,
  containerHeight: number,
  fontFamily: string,
  lineHeight: number,
  tracking: number,
  marginPercent: number = 10
): { fontSize: number; textWithBreaks: string } {
  let low = 8;
  let high = Math.min(80, Math.floor(containerHeight * 0.9));
  let bestFontSize = 14;
  let bestText = text;

  const padFactor = 1 - (marginPercent / 100);

  while (low <= high) {
    const mid = (low + high) >> 1;
    const { lines } = wrapTextToShape(
      text,
      bubbleType,
      containerWidth,
      containerHeight,
      mid,
      fontFamily,
      lineHeight,
      tracking,
      marginPercent
    );

    const totalLinesHeight = lines.length * mid * lineHeight;
    if (totalLinesHeight <= containerHeight * padFactor && lines.length > 0) {
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
// قاعدة بيانات مدمجة (IndexedDB) لحفظ الخطوط في ذاكرة الهاتف الدائمة
// ===================================================

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

// دالة لحفظ الخط في الهاتف
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

// دالة لاسترجاع كافة الخطوط المحفوظة
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
