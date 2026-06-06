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

const TATWEEL_CONNECTORS = new Set('بتثجحخسشصضطظعغفقكلمنهيئةبتثجحخسشصضطظعغفقكلمنهيئ'.split(''));

export function canTatweel(ch: string): boolean {
  return TATWEEL_CONNECTORS.has(ch);
}

export function tatweelLine(
  text: string,
  targetWidth: number,
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string,
  strength: number
): string {
  const TATWEEL = 'ـ';
  let words = text.split(' ');
  
  let eligibleIndices: number[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i].length > 2) {
      for (let j = 0; j < words[i].length - 1; j++) {
        if (canTatweel(words[i][j])) {
          eligibleIndices.push(i);
          break;
        }
      }
    }
  }

  if (eligibleIndices.length === 0) return text;

  eligibleIndices.sort((a, b) => words[b].length - words[a].length);
  let targetIndices = eligibleIndices.slice(0, 2);

  let attempts = 0;
  const MAX = strength * 15;

  while (attempts < MAX) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    const w = ctx.measureText(words.join(' ')).width;
    if (w >= targetWidth * 0.97) break;

    let inserted = false;
    let wordIdx = targetIndices[attempts % targetIndices.length];
    let word = words[wordIdx];
    
    for (let j = 0; j < word.length - 1; j++) {
      if (canTatweel(word[j])) {
        words[wordIdx] = word.slice(0, j + 1) + TATWEEL + word.slice(j + 1);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      targetIndices = targetIndices.filter(idx => idx !== wordIdx);
      if (targetIndices.length === 0) break;
    }
    attempts++;
  }
  return words.join(' ');
}

export function wrapTextToShape(
  text: string,
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval', // 👈 تغيير circular إلى بيضاوية رأسية vertical_oval تلبية لطلبك
  maxW: number,
  maxH: number,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
  tracking: number,
  marginPercent: number = 10 // القيمة الافتراضية للهامش هي 10%
): { lines: string[]; optimalFontSize: number } {
  const lineH = fontSize * lineHeight;
  
  // تقسيم النص بناءً على فواصل الأسطر اليدوية للحفاظ على رغبة المستخدم
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

  // دالة الحساب الهندسي الفائق لعرض السطر الأقصى بناءً على موقعه الرأسي ليتطابق مع رسوماتك بدقة 100%
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
    let ellipseFactor = Math.sqrt(1 - clampedY * clampedY);
    
    let shapeMultiplier = 1.0;
    
    if (bubbleType === 'normal_oval') {
      shapeMultiplier = 0.94;
      // موازنة دقيقة لضمان عدم ضيق أطراف السطر الأول والأخير
      ellipseFactor = Math.max(0.55, ellipseFactor);
    } else if (bubbleType === 'vertical_oval') {
      // بيضاوية رأسية مطولة: انحناء حاد وعميق للأطراف العلوية والسفلية ليعطي مظهر الاستطالة العمودي
      shapeMultiplier = 0.93;
      ellipseFactor = Math.max(0.38, ellipseFactor);
    } else if (bubbleType === 'thought_cloud') {
      shapeMultiplier = 0.88;
      // تلطيف حدة الانحناء لتجعل السطور ممتلئة وعريضة في الأعلى والأسفل لتناسب سحابة التفكير
      ellipseFactor = Math.max(0.65, Math.pow(ellipseFactor, 0.7));
    } else if (bubbleType === 'spiky_shout') {
      shapeMultiplier = 0.75; // هامش أمان إضافي لحماية الكلمات من زوايا ومسامير الصراخ الحادة
      ellipseFactor = Math.max(0.48, ellipseFactor);
    }
    
    return maxW * ellipseFactor * padFactor * shapeMultiplier;
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

  // توزيع الكلمات ديناميكياً بشكل متوازن تماماً لمنع بقاء كلمة وحيدة في السطر الأخير
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

  // في حال فشل الالتفاف الهندسي الدقيق للفقاعة، نلجأ للتقسيم العادي كخطة احتياطية
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

  // 👈 تطبيق تمطيط الأسطر (الكشيدة) تلقائياً لتوسيع الحروف حتى تملأ المساحة الهندسية المخصصة لكل سطر بنسبة 100%
  const stretchedLines = bestLines.map((line, idx) => {
    if (!line.trim() || bubbleType === 'narrative_box') return line;
    const limit = getWidthLimit(idx, bestLines.length);
    // تمطيط الكلمات لملء الفراغ بدقة متناهية مطابقة للرسومات
    return tatweelLine(line, limit, ctx!, fontSize, fontFamily, 4);
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
  marginPercent: number = 10 // القيمة الافتراضية للهامش هي 10%
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
