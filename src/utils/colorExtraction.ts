// src/utils/colorExtraction.ts

export interface ExtractedStyleResult {
  color1: string;
  color2: string;
  angle: number;
  strokeColor: string;
  strokeWidth: number;
  textColor: string;
}

// 🎨 خوارزمية ذكية لاستخراج التدرج اللوني والـ Stroke من مساحة التحديد في صورة المانجا
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
