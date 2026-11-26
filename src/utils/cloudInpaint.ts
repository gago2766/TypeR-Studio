import { GoogleGenAI } from '@google/genai';

/**
 * ☁️ معالجة التبييض السحابية الذكية عبر Gemini API (أو Hugging Face كخيار احتياطي)
 */
export async function runCloudInpaint(
  sourceImg: HTMLImageElement,
  maskCanvas: HTMLCanvasElement,
  rect: { x: number; y: number; width: number; height: number },
  geminiApiKey?: string,
  hfToken?: string
): Promise<ImageData | null> {
  const cropW = Math.max(16, Math.round(rect.width));
  const cropH = Math.max(16, Math.round(rect.height));

  // 1. اقتطاع قطعة الفقاعة بدقة
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) return null;

  cropCtx.drawImage(
    sourceImg,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    cropW,
    cropH
  );

  const base64ImageWithPrefix = cropCanvas.toDataURL('image/png');
  const base64Image = base64ImageWithPrefix.split(',')[1];

  // 2. اقتطاع قطعة الماسك
  const maskCropCanvas = document.createElement('canvas');
  maskCropCanvas.width = cropW;
  maskCropCanvas.height = cropH;
  const maskCtx = maskCropCanvas.getContext('2d');
  if (!maskCtx) return null;

  maskCtx.drawImage(
    maskCanvas,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    cropW,
    cropH
  );
  const base64Mask = maskCropCanvas.toDataURL('image/png').split(',')[1];

  // =========================================================================
  // 🌟 الخيار الأول: المعالجة السحابية عبر Google Gemini API
  // =========================================================================
  if (geminiApiKey && geminiApiKey.trim()) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey.trim() });

      // محاولة استخدام نماذج توليد وتعديل الصور السحابية الرسمية من Gemini
      const modelsToTry = [
        'gemini-2.5-flash-image',
        'gemini-2.0-flash-exp',
        'imagen-3.0-generate-002',
      ];

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64Image,
                },
              },
              {
                text: 'Completely remove all text, dialog, speech bubble contents, and letters from this manga crop. Inpaint and restore the original background textures and colors cleanly without any text or artifacts.',
              },
            ],
            config: {
              responseModalities: ['IMAGE'],
            },
          });

          // استخراج صورة النتيجة من استجابة Gemini
          const candidates = response.candidates;
          if (candidates && candidates.length > 0) {
            const parts = candidates[0].content?.parts || [];
            for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                return await base64ToImageData(part.inlineData.data, cropW, cropH);
              }
            }
          }
        } catch (subErr) {
          console.warn(`تعذر النموذج ${modelName}، جاري تجربة البديل...`, subErr);
        }
      }
    } catch (geminiErr) {
      console.error('خطأ في استدعاء Gemini API:', geminiErr);
    }
  }

  // =========================================================================
  // 🌟 الخيار الثاني: المعالجة السحابية الاحتياطية عبر Hugging Face Inpainting
  // =========================================================================
  if (hfToken && hfToken.trim()) {
    try {
      const blobImage = dataURLtoBlob(base64ImageWithPrefix);
      const blobMask = dataURLtoBlob(maskCropCanvas.toDataURL('image/png'));

      const formData = new FormData();
      formData.append('image', blobImage);
      formData.append('mask_image', blobMask);

      const hfResponse = await fetch(
        'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfToken.trim()}`,
          },
          body: formData,
        }
      );

      if (hfResponse.ok) {
        const outBlob = await hfResponse.blob();
        return await blobToImageData(outBlob, cropW, cropH);
      }
    } catch (hfErr) {
      console.error('خطأ في استدعاء Hugging Face:', hfErr);
    }
  }

  // إذا لم يتوفر مفتاح API أو فشل الاتصال، نقوم بتفريغ الماسك بلون الخلفية كحل بديل فوري
  return fallbackClean(cropCtx, maskCtx, cropW, cropH);
}

/**
 * تحويل Base64 إلى ImageData بمقاسات مخصصة
 */
async function base64ToImageData(
  base64: string,
  width: number,
  height: number
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    img.onerror = reject;
    img.src = `data:image/png;base64,${base64}`;
  });
}

/**
 * تحويل Blob إلى ImageData بمقاسات مخصصة
 */
async function blobToImageData(
  blob: Blob,
  width: number,
  height: number
): Promise<ImageData> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * تحويل DataURL إلى Blob
 */
function dataURLtoBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * بديل محلي ناعم إذا لم يكن هناك إنترنت أو مفتاح API
 */
function fallbackClean(
  cropCtx: CanvasRenderingContext2D,
  maskCtx: CanvasRenderingContext2D,
  w: number,
  h: number
): ImageData {
  const imgData = cropCtx.getImageData(0, 0, w, h);
  const maskData = maskCtx.getImageData(0, 0, w, h);

  // حساب متوسط لون الحواف
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  for (let x = 0; x < w; x++) {
    const topIdx = x * 4;
    const botIdx = ((h - 1) * w + x) * 4;
    rSum += imgData.data[topIdx] + imgData.data[botIdx];
    gSum += imgData.data[topIdx + 1] + imgData.data[botIdx + 1];
    bSum += imgData.data[topIdx + 2] + imgData.data[botIdx + 2];
    count += 2;
  }

  const avgR = count > 0 ? Math.round(rSum / count) : 255;
  const avgG = count > 0 ? Math.round(gSum / count) : 255;
  const avgB = count > 0 ? Math.round(bSum / count) : 255;

  for (let i = 0; i < w * h; i++) {
    if (maskData.data[i * 4 + 3] > 20) {
      imgData.data[i * 4] = avgR;
      imgData.data[i * 4 + 1] = avgG;
      imgData.data[i * 4 + 2] = avgB;
      imgData.data[i * 4 + 3] = 255;
    }
  }

  return imgData;
}
