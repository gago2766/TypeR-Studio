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

// استبعاد التاء المربوطة والهمزة على السطر من قائمة الحروف المتصلة باليسار لمنع التمطيط بعدها
const TATWEEL_CONNECTORS = new Set('بتثجحخسشصضطظعغفقكلمنهيئ'.split(''));

export function canTatweel(ch: string): boolean {
  return TATWEEL_CONNECTORS.has(ch);
}

// دالة مساعدة لفصل الكلمة العربية عن أي علامات ترقيم تحيط بها لضمان دقة حساب طول الكلمة
function splitWord(word: string) {
  const prefixMatch = word.match(/^[^\u0621-\u064A\u0671-\u06D3]+/);
  const suffixMatch = word.match(/[^\u0621-\u064A\u0671-\u06D3]+$/);
  const prefix = prefixMatch ? prefixMatch[0] : '';
  const suffix = suffixMatch ? suffixMatch[0] : '';
  const core = word.substring(prefix.length, word.length - suffix.length);
  return { prefix, core, suffix };
}

// خوارزمية ذكية ومتطورة لتوزيع الكشيدات والتمطيط بالتساوي عبر الكلمات الكبيرة فقط
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
  if (currentWidth >= targetWidth * 0.96) return text; // النص مناسب للمساحة ولا يحتاج لتمطيط إضافي

  // العثور على جميع الحروف والروابط القابلة للمد والتمطيط داخل الكلمات لتوزيع متناسق
  const eligiblePositions: Array<{ wordIndex: number; charIndex: number }> = [];
  words.forEach((word, wordIdx) => {
    const parts = splitWord(word);
    // تفعيل التمطيط للكلمات الكبيرة فقط (5 أحرف أو أكثر) واستبعاد الكلمات القصيرة (2 أو 3 أو 4 أحرف)
    if (parts.core.length >= 5) {
      // إيقاف التمطيط قبل نهاية الكلمة (المرور حتى الحرف قبل الأخير فقط)
      for (let i = 0; i < parts.core.length - 1; i++) {
        if (canTatweel(parts.core[i])) {
          eligiblePositions.push({ 
            wordIndex: wordIdx, 
            charIndex: parts.prefix.length + i 
          });
        }
      }
    }
  });

  if (eligiblePositions.length === 0) return text;

  // إدخال الكشيدات تدريجياً وبالتناوب على جميع المواضع المؤهلة لوزن الأسطر هندسياً
  let attempts = 0;
  const maxAttempts = strength * 25;

  while (attempts < maxAttempts) {
    currentWidth = ctx.measureText(words.join(' ')).width;
    if (currentWidth >= targetWidth * 0.97) {
      break; // تم الوصول للعرض الهندسي المثالي للسطر بنجاح
    }

    const pos = eligiblePositions[attempts % eligiblePositions.length];
    const word = words[pos.wordIndex];
    
    words[pos.wordIndex] = word.slice(0, pos.charIndex + 1) + TATWEEL + word.slice(pos.charIndex + 1);
    
    // تحديث إزاحة المواضع المتبقية للكلمة التي تم تمطيطها
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
  bubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval',
  maxW: number,
  maxH: number,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
  tracking: number,
  marginPercent: number = 10, // القيمة الافتراضية للهامش هي 10%
  lineCountOverride?: number // التمرير الحسابي المباشر لعدد الأسطر
): { lines: string[]; unstretchedLines: string[]; optimalFontSize: number } {
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
    
    // حساب الموضع الهندسي المتناظر t للأسطر ليعطي نسب مطابقة بدقة لملف PDF
    const t = (totalLines <= 1) ? 0 : Math.abs((lineIndex - (totalLines - 1) / 2) / ((totalLines - 1) / 2));
    
    let ratio = 1.0;
    
    if (bubbleType === 'normal_oval') {
      // بيضاوية السطر الأول والأخير متطابقين، المتوسطين متطابقين، والمنتصف هو الأكبر
      ratio = 1.0 - 0.45 * Math.pow(t, 1.5);
    } else if (bubbleType === 'vertical_oval') {
      // بيضاوية مطولة رأسياً: الأول والأخير الأصغر، الثاني والخامس المتوسطين، الثالث والرابع الأكبر
      ratio = 1.0 - 0.55 * Math.pow(t, 1.2);
    } else if (bubbleType === 'thought_cloud') {
      // التفكير أعرض قليلاً من العادية
      ratio = 1.0 - 0.35 * Math.pow(t, 1.4);
    } else if (bubbleType === 'spiky_shout') {
      // الصراخ: الأول والأخير متطابقين، الثاني والخامس متطابقين، الثالث والرابع متطابقين والمنتصف الأكبر
      ratio = 1.0 - 0.6 * Math.pow(t, 2.2);
    }
    
    return maxW * ratio * padFactor;
  };

  // تجمع كل الكلمات النصية
  const allWords: string[] = [];
  inputLines.forEach(p => {
    const words = p.trim().split(/\s+/).filter(Boolean);
    allWords.push(...words);
  });

  if (allWords.length === 0) {
    return { lines: [''], unstretchedLines: [''], optimalFontSize: fontSize };
  }

  // تحديد المدى الحسابي للأسطر (الالتزام بـ lineCountOverride إن وجد)
  let minLinesCount = lineCountOverride !== undefined ? lineCountOverride : 1;
  let maxLinesCount = lineCountOverride !== undefined ? lineCountOverride : Math.max(1, Math.floor((maxH * (1 - marginPercent / 100)) / lineH));

  let bestLines: string[] = [];

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
        // إذا كانت كلمة واحدة أطول من الحد، ندرجها ونسمح لها بالبقاء في السطر
        if (wordIndex < allWords.length) {
          currentLineWords.push(allWords[wordIndex]);
          wordIndex++;
        } else {
          success = false;
          break;
        }
      }
      currentLines.push(currentLineWords.join(' '));
    }

    if (success && wordIndex >= allWords.length) {
      bestLines = currentLines;
      break;
    }
  }

  // في حال فرض عدد أسطر يدوي وتعذر حسابه تلقائياً بالتساوي، نلجأ إلى تقسيم تقريبي متوازن
  if (bestLines.length === 0 && lineCountOverride !== undefined) {
    const chunkCount = Math.max(1, Math.ceil(allWords.length / lineCountOverride));
    for (let i = 0; i < lineCountOverride; i++) {
      const chunk = allWords.slice(i * chunkCount, (i + 1) * chunkCount);
      if (chunk.length > 0) {
        bestLines.push(chunk.join(' '));
      }
    }
  }

  // خطة احتياطية عامة
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

  // تطبيق الكشيدة والتمطيط التلقائي بعناية في أول سطر وآخر سطر فقط لتطابق هيكلية الأشكال 100%
  const stretchedLines = bestLines.map((line, idx) => {
    if (!line.trim()) return line;
    const limit = getWidthLimit(idx, bestLines.length);

    // تفعيل التمطيط للسطر الأول والأخير فقط
    if (idx === 0 || idx === bestLines.length - 1) {
      return tatweelLine(line, limit, ctx!, fontSize, fontFamily, 4);
    }
    return line;
  });

  return { lines: stretchedLines, unstretchedLines: bestLines, optimalFontSize: fontSize };
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
  let low = 8;
  let high = Math.min(80, Math.floor(containerHeight * 0.9));
  let bestFontSize = 14;
  let bestText = text;

  const padFactor = 1 - (marginPercent / 100);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const measureWidth = (str: string, fSize: number) => {
    if (!ctx) return str.length * fSize * 0.55;
    ctx.font = `${fSize}px ${fontFamily}`;
    return ctx.measureText(str).width + (str.length > 0 ? (str.length - 1) * tracking : 0);
  };

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

    const totalLinesHeight = lines.length * mid * lineHeight;
    let fits = totalLinesHeight <= containerHeight * padFactor && lines.length > 0;

    // فحص حاسم للتحقق من أن عرض جميع الكلمات والأسطر لا يتجاوز الحدود القصوى للأشكال مع الهامش
    if (fits) {
      const getWidthLimit = (lineIndex: number, totalLines: number) => {
        const pad = 1 - (marginPercent / 100);
        if (bubbleType === 'narrative_box') {
          return containerWidth * pad;
        }
        const t = (totalLines <= 1) ? 0 : Math.abs((lineIndex - (totalLines - 1) / 2) / ((totalLines - 1) / 2));
        let ratio = 1.0;
        if (bubbleType === 'normal_oval') {
          ratio = 1.0 - 0.45 * Math.pow(t, 1.5);
        } else if (bubbleType === 'vertical_oval') {
          ratio = 1.0 - 0.55 * Math.pow(t, 1.2);
        } else if (bubbleType === 'thought_cloud') {
          ratio = 1.0 - 0.35 * Math.pow(t, 1.4);
        } else if (bubbleType === 'spiky_shout') {
          ratio = 1.0 - 0.6 * Math.pow(t, 2.2);
        }
        return containerWidth * ratio * pad;
      };

      for (let i = 0; i < unstretchedLines.length; i++) {
        const limit = getWidthLimit(i, unstretchedLines.length);
        const w = measureWidth(unstretchedLines[i], mid);
        if (w > limit) {
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

// دالة لحفظ الخطوط المفضلة بشكل تلقائي ومستمر
export function saveFavoriteFonts(favs: string[]): void {
  try {
    localStorage.setItem('typer_studio_fav_fonts', JSON.stringify(favs));
  } catch (e) {
    console.error('Error saving favorite fonts:', e);
  }
}

// دالة لاسترجاع الخطوط المفضلة عند تشغيل التطبيق
export function getFavoriteFonts(): string[] {
  try {
    const favs = localStorage.getItem('typer_studio_fav_fonts');
    return favs ? JSON.parse(favs) : [];
  } catch (e) {
    console.error('Error getting favorite fonts:', e);
    return [];
  }
}
