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
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'circular',
  maxW: number,
  maxH: number,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
  tracking: number,
  marginPercent: number = 10 // القيمة الافتراضية للهامش هي 10%
): { lines: string[]; optimalFontSize: number } {
  const lineH = fontSize * lineHeight;
  
  // نقوم بتقسيم النص بناءً على السطور الجديدة للحفاظ على المسافات والأسطر الفارغة التي يتركها المستخدم
  const inputLines = text.split('\n');
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.direction = 'rtl'; // حل مشكلة اتجاه الفواصل أثناء حساب المساحات لفقاعات الترجمة للصور المصدّرة
  }

  const measureWidth = (str: string) => {
    if (!ctx) return str.length * fontSize * 0.6;
    return ctx.measureText(str).width + str.length * tracking;
  };

  // حساب دقيق للحد المسموح به لكل سطر بناءً على موقعه الرأسي ومظهر الفقاعة وهامش الأمان
  const getWidthLimit = (lineIndex: number, totalLines: number) => {
    const padFactor = 1 - (marginPercent / 100);

    // الصندوق المستطيل مساحته ثابتة دائماً لجميع الأسطر
    if (bubbleType === 'narrative_box') {
      return maxW * padFactor;
    }
    
    if (totalLines <= 1) {
      let singleLineFactor = 0.82;
      if (bubbleType === 'spiky_shout') singleLineFactor = 0.70;
      if (bubbleType === 'thought_cloud') singleLineFactor = 0.76;
      return maxW * singleLineFactor * padFactor;
    }
    
    // حساب الارتفاع الرأسي الإجمالي وتحديد موضع السطر الحالي بالنسبة للمنتصف
    const totalLinesHeight = totalLines * lineH;
    const centerYOffset = -(totalLinesHeight / 2) + (lineIndex * lineH) + (lineH / 2);
    
    // تطبيع الموضع الرأسي على نصف ارتفاع الإطار لإجراء عملية القطع الناقص الرياضية
    const semiHeight = maxH / 2;
    const normalizedY = centerYOffset / Math.max(1, semiHeight);
    
    // التأكد من بقاء القيمة بين -0.99 و 0.99 لتجنب أخطاء الجذر التربيعي
    const clampedY = Math.max(-0.99, Math.min(0.99, normalizedY));
    const ellipseFactor = Math.sqrt(1 - clampedY * clampedY);
    
    // معاملات أمان مخصصة لكل شكل لحمايته من التموجات أو المسامير الحادة
    let shapeMultiplier = 1.0;
    if (bubbleType === 'normal_oval') {
      shapeMultiplier = 0.94; // هامش إضافي للفقاعات البيضاوية الاعتيادية لوجود الذيل
    } else if (bubbleType === 'circular') {
      shapeMultiplier = 1.0;  // دائرية نقية مستفيدة من كامل المساحة الهندسية
    } else if (bubbleType === 'thought_cloud') {
      shapeMultiplier = 0.86; // تفادي نتوءات السحابة الداخلية
    } else if (bubbleType === 'spiky_shout') {
      shapeMultiplier = 0.74; // تفادي المسامير والأسنان الحادة المدببة لفقاعات الصراخ
    }
    
    return maxW * ellipseFactor * padFactor * shapeMultiplier;
  };

  // محاكاة سريعة لحساب عدد الأسطر الإجمالي التقريبي بعد التفاف الكلمات لتحديد حدود الفقاعة بدقة
  let tempTotalLines = 0;
  inputLines.forEach(paragraph => {
    const pWords = paragraph.trim().split(/\s+/).filter(Boolean);
    if (pWords.length === 0) {
      tempTotalLines++;
      return;
    }
    let currentLineWords: string[] = [];
    pWords.forEach(word => {
      const testLine = [...currentLineWords, word].join(' ');
      if (measureWidth(testLine) <= maxW * 0.8) {
        currentLineWords.push(word);
      } else {
        tempTotalLines++;
        currentLineWords = [word];
      }
    });
    if (currentLineWords.length > 0) tempTotalLines++;
  });

  const estimatedTotalLines = Math.max(1, tempTotalLines);
  const finalLines: string[] = [];
  let currentLineIdx = 0;

  // التوزيع الفعلي مع احترام الأسطر الفارغة يدوياً وتطبيق الالتفاف الهندسي لكل جزء
  for (let i = 0; i < inputLines.length; i++) {
    const paragraph = inputLines[i];
    const pWords = paragraph.trim().split(/\s+/).filter(Boolean);

    // إذا كان السطر فارغاً تماماً (مسافة سطر تركها المستخدم)
    if (pWords.length === 0) {
      finalLines.push('');
      currentLineIdx++;
      continue;
    }

    let currentLineWords: string[] = [];
    for (let w = 0; w < pWords.length; w++) {
      const word = pWords[w];
      const testLine = [...currentLineWords, word].join(' ');
      const limit = getWidthLimit(currentLineIdx, estimatedTotalLines);

      if (measureWidth(testLine) <= limit) {
        currentLineWords.push(word);
      } else {
        if (currentLineWords.length > 0) {
          finalLines.push(currentLineWords.join(' '));
        }
        currentLineWords = [word];
        currentLineIdx++;
      }
    }
    if (currentLineWords.length > 0) {
      finalLines.push(currentLineWords.join(' '));
      currentLineIdx++;
    }
  }

  return { lines: finalLines, optimalFontSize: fontSize };
}

export function calculateOptimalFontSizeForShape(
  text: string,
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'circular',
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
    // التأكد من ملاءمة الارتفاع الإجمالي أيضاً تماشياً مع الهامش الرأسي المطلوب
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
