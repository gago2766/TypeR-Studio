// جلب المحرك المباشر ort المثبت بصفحة index.html
const ort = typeof window !== 'undefined' ? (window as any).ort : null;

if (ort && ort.env && ort.env.wasm) {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
}

let session: any = null;

// رابط نموذج LaMa الخفيف المضغوط
const MODEL_URL = 'https://huggingface.co/g-ronimo/lama/resolve/main/lama_int8.onnx';

export async function loadLamaModel() {
  if (!session) {
    try {
      const activeOrt = ort || (await import('onnxruntime-web'));
      session = await activeOrt.InferenceSession.create(MODEL_URL, {
        executionProviders: ['wasm'],
      });
      console.log('تم تحميل نموذج LaMa بنجاح! المدخلات المطلوبة:', session.inputNames);
    } catch (err: any) {
      console.error('فشل تحميل جلسة النموذج:', err?.message || JSON.stringify(err) || err);
      throw err;
    }
  }
  return session;
}

export async function runLamaInpaint(
  sourceImg: HTMLImageElement,
  maskCanvas: HTMLCanvasElement,
  rect: { x: number; y: number; width: number; height: number }
): Promise<ImageData | null> {
  try {
    const sess = await loadLamaModel();
    const MODEL_SIZE = 512;

    // 1. اقتطاع قطعة الفقاعة وتعديل قياسها
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = MODEL_SIZE;
    cropCanvas.height = MODEL_SIZE;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return null;

    cropCtx.drawImage(sourceImg, rect.x, rect.y, rect.width, rect.height, 0, 0, MODEL_SIZE, MODEL_SIZE);
    const imgData = cropCtx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);

    // 2. اقتطاع قطعة الماسك
    const maskCropCanvas = document.createElement('canvas');
    maskCropCanvas.width = MODEL_SIZE;
    maskCropCanvas.height = MODEL_SIZE;
    const maskCtx = maskCropCanvas.getContext('2d');
    if (!maskCtx) return null;

    maskCtx.drawImage(maskCanvas, rect.x, rect.y, rect.width, rect.height, 0, 0, MODEL_SIZE, MODEL_SIZE);
    const maskData = maskCtx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);

    // 3. دمج ألوان الصورة مع الماسك بـ 4 قنوات مدمجة (RGB + Mask = 4 Channels)
    const totalPixels = MODEL_SIZE * MODEL_SIZE;
    const tensor4ChData = new Float32Array(1 * 4 * totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      // القناة 0: الأحمر (Red)
      tensor4ChData[i] = imgData.data[i * 4] / 255.0;
      // القناة 1: الأخضر (Green)
      tensor4ChData[totalPixels + i] = imgData.data[i * 4 + 1] / 255.0;
      // القناة 2: الأزرق (Blue)
      tensor4ChData[2 * totalPixels + i] = imgData.data[i * 4 + 2] / 255.0;
      // القناة 3: الماسك (Mask)
      tensor4ChData[3 * totalPixels + i] = maskData.data[i * 4 + 3] > 10 ? 1.0 : 0.0;
    }

    const activeOrt = ort || (await import('onnxruntime-web'));
    // إنشاء Tensor بـ 4 قنوات مطابقة للمطلوب [1, 4, 512, 512]
    const inputTensor = new activeOrt.Tensor('float32', tensor4ChData, [1, 4, MODEL_SIZE, MODEL_SIZE]);

    // 4. ربط مدخلات النموذج
    const feeds: Record<string, any> = {};
    sess.inputNames.forEach((name: string) => {
      feeds[name] = inputTensor;
    });

    // 5. تشغيل الذكاء الاصطناعي
    const results = await sess.run(feeds);
    const outputTensor = results[sess.outputNames[0]] || Object.values(results)[0];
    const outFloat = outputTensor.data as Float32Array;

    // 6. استخراج النتيجة وبناء الصورة
    const outData = new Uint8ClampedArray(totalPixels * 4);
    for (let i = 0; i < totalPixels; i++) {
      outData[i * 4]     = Math.min(255, Math.max(0, outFloat[i] * 255));
      outData[i * 4 + 1] = Math.min(255, Math.max(0, outFloat[totalPixels + i] * 255));
      outData[i * 4 + 2] = Math.min(255, Math.max(0, outFloat[2 * totalPixels + i] * 255));
      outData[i * 4 + 3] = 255;
    }

    return new ImageData(outData, MODEL_SIZE, MODEL_SIZE);
  } catch (err: any) {
    console.error("خطأ تفصيلي أثناء معالجة LaMa:", err?.message || JSON.stringify(err) || err);
    return null;
  }
}
