// 🧼 نواة التبييض (دالة نقية بلا اعتماد على DOM كي يمكن اختبارها)
//
// أنماط التبييض:
//  - solid    : يملأ القناع كله بلون البذرة الصافي (أبيض تماماً للفقاعات البيضاء).
//  - smart    : كشف الحبر بالتباين المحلي + توسيع كافٍ لهالة الحروف + نشر الخلفية من الجيران.
//  - exemplar : كالسابق لكن الملء بمحرك الأمثلة (يحافظ على النقش والشبكات).
//  - auto     : يختار solid للفقاعات المصمتة، وexemplar للمنقوشة، وsmart للمتدرجة.
//
// إضافات الجودة:
//  - تنعيم حافة القناع: يزيل خط الهالة الرمادي الرفيع الملاصق لحدود الفقاعة.
//  - حروف تلامس الإطار: تُلتقط عبر الإغلاق الشكلي لقناع الفقاعة (التجاويف الضيقة التي تصنعها الحروف الملامسة).
//  - توسيع يدوي: يضيف إلى القناع المكوّنات الحبرية الصغيرة المنفصلة القريبة (نص/مؤثرات صوتية خارج الفقاعة) دون المساس بالإطار.
//  - عتبات سطوع تكيفية من توزيع سطوع الفقاعة بدل 85/130 الثابتتين.

export type WhitenMode = 'auto' | 'solid' | 'smart' | 'exemplar';
export type WhitenUsed = 'solid' | 'smart' | 'exemplar' | 'none';

export interface WhitenCoreParams {
  /** بكسلات المنطقة على لوحة التنظيف (RGBA) وتُعدَّل مباشرة */
  data: Uint8ClampedArray;
  regionW: number;
  regionH: number;
  /** قناع الصفحة كاملة */
  mask: Uint8Array;
  imgW: number;
  startX: number;
  startY: number;
  /** بكسلات الصفحة الأصلية (نافذة صفوف) */
  pageData: Uint8ClampedArray;
  pageRowOffset: number;
  seed: [number, number, number];
  tolerance: number;
  /** ملء بالأمثلة اختياري (يملأ البكسلات التي unknown=1 داخل rgba مباشرة) */
  inpaint?: (rgba: Uint8ClampedArray, W: number, H: number, unknown: Uint8Array) => void;
  mode?: WhitenMode;
  /** توسيع يدوي للقناع (بكسل، 0 = معطّل) يلتقط المكوّنات الحبرية الصغيرة المنفصلة القريبة */
  expandPx?: number;
  /** التقاط الحروف الملامسة للإطار (افتراضي: معطّل لأنه قد يقضم زاوية الإطار عند وصلة الذيل في بعض الصفحات) */
  touchingGlyphs?: boolean;
}

export interface WhitenCoreResult {
  touched: number;
  used: WhitenUsed;
}

/** أقصى بعد (RGB) عن لون البذرة يُعدّ "خلفية صافية" عند الحكم بأن الفقاعة مصمتة */
const SOLID_NEAR_DIST = 14;
/** أدنى نسبة بكسلات قريبة من البذرة لاعتبار الفقاعة مصمتة */
const SOLID_MIN_FRACTION = 0.55;
/** فرق السطوع عن الخلفية المحلية لاعتبار البكسل حبراً (للفقاعات غير المصمتة) */
const LOCAL_CONTRAST_T = 22;
/** متوسط فرق السطوع بين بكسلين متجاورين فوقه تُعدّ الخلفية منقوشة */
const TEXTURE_THRESHOLD = 3.5;
/** أكبر عدد بكسلات للملء بالأمثلة (فوقه يُستخدم النشر الناعم حتى لا تتجمد الواجهة) */
const EXEMPLAR_MAX_PIXELS = 60000;
/** سقف ما يضيفه التقاط الحروف الملامسة من القناع (حماية من تجاويف الذيل/الأشكال الغريبة) */
const TOUCHING_MAX_FRACTION = 0.04;

/**
 * عتبات السطوع التكيفية: تحت dark أو فوق light يُعدّ البكسل حبراً.
 * تطابق القيم القديمة (85 / 130) عند الفقاعات البيضاء والسوداء، وتغطي المنطقة الوسطى (85–140) التي كانت بلا قاعدة.
 */
export function adaptiveInkThresholds(refLum: number): { dark: number | null; light: number | null } {
  const dark = refLum > 120 ? 85 : refLum >= 85 ? refLum * 0.5 : null;
  const light = refLum < 85 ? 130 : refLum <= 140 ? Math.max(130, refLum + (255 - refLum) * 0.5) : null;
  return { dark, light };
}

function boxExtreme(src: Float32Array, W: number, H: number, r: number, takeMax: boolean, outsideZero = false): Float32Array {
  const tmp = new Float32Array(W * H);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      const a = Math.max(0, x - r), b = Math.min(W - 1, x + r);
      let v = src[row + a];
      for (let k = a + 1; k <= b; k++) {
        const s = src[row + k];
        if (takeMax ? s > v : s < v) v = s;
      }
      if (outsideZero && !takeMax && (x - r < 0 || x + r > W - 1) && v > 0) v = 0;
      tmp[row + x] = v;
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const a = Math.max(0, y - r), b = Math.min(H - 1, y + r);
      let v = tmp[a * W + x];
      for (let k = a + 1; k <= b; k++) {
        const s = tmp[k * W + x];
        if (takeMax ? s > v : s < v) v = s;
      }
      if (outsideZero && !takeMax && (y - r < 0 || y + r > H - 1) && v > 0) v = 0;
      out[y * W + x] = v;
    }
  }
  return out;
}

/** توسيع ثنائي بمقدار r بكسل (جوار 8) يُضيف البكسلات الجديدة إلى dst فقط (لا يُعدّل src) */
function dilateInto(src: Uint8Array, W: number, H: number, r: number): Uint8Array {
  let cur = src;
  for (let pass = 0; pass < r; pass++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (cur[i]) continue;
        let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= W) continue;
            if (cur[yy * W + xx]) { hit = true; break; }
          }
        }
        if (hit) next[i] = 1;
      }
    }
    cur = next;
  }
  return cur;
}

export function whitenRegionPixels(p: WhitenCoreParams): WhitenCoreResult {
  const { data, regionW, regionH, mask, imgW, startX, startY, pageData, pageRowOffset, seed, tolerance, inpaint } = p;
  const mode: WhitenMode = p.mode ?? 'auto';
  const expandPx = Math.max(0, Math.min(12, Math.round(p.expandPx ?? 0)));
  const touchingGlyphs = p.touchingGlyphs === true;
  const [seedR, seedG, seedB] = seed;
  const W = regionW, H = regionH;
  const n = W * H;

  // قناع محلي + سطوع وبعد اللون عن البذرة (من الصفحة الأصلية)
  const m = new Uint8Array(n);
  const lum = new Float32Array(n);
  const dist = new Float32Array(n);
  let maskCount = 0, nearCount = 0;
  for (let ly = 0; ly < H; ly++) {
    const gy = startY + ly;
    for (let lx = 0; lx < W; lx++) {
      const i = ly * W + lx;
      const gx = startX + lx;
      const pi = ((gy - pageRowOffset) * imgW + gx) * 4;
      const r = pageData[pi], g = pageData[pi + 1], b = pageData[pi + 2];
      lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      const dr = r - seedR, dg = g - seedG, db = b - seedB;
      dist[i] = Math.sqrt(dr * dr + dg * dg + db * db);
      if (mask[gy * imgW + gx] === 1) {
        m[i] = 1;
        maskCount++;
        if (dist[i] <= SOLID_NEAR_DIST) nearCount++;
      }
    }
  }
  if (maskCount === 0) return { touched: 0, used: 'none' };
  const solidLike = nearCount / maskCount >= SOLID_MIN_FRACTION;
  const rad = Math.max(3, Math.min(8, Math.round(imgW / 350)));

  // ───────── إضافات القناع قبل التبييض ─────────
  const added = new Uint8Array(n);

  // (2) حروف تلامس الإطار: تجاويف القناع الضيقة (الإغلاق الشكلي) المليئة بالحبر
  if (touchingGlyphs) {
    const mf = new Float32Array(n);
    for (let i = 0; i < n; i++) mf[i] = m[i];
    // نصف القطر يجب أن يغطي عرض تجويف الحرف بهالته (≈ 2–3 أضعاف سماكة الضربة)
    const rc = Math.max(6, Math.min(14, Math.round(imgW / 50)));
    const closed = boxExtreme(boxExtreme(mf, W, H, rc, true), W, H, rc, false, true);
    // حارس الإحاطة: البكسل داخل تجويف حرف ملامس يحيط به القناع من جانبين متقابلين خلال rc
    const farD = 32767;
    const dl = new Int16Array(n).fill(farD), dr2 = new Int16Array(n).fill(farD);
    const du = new Int16Array(n).fill(farD), dd = new Int16Array(n).fill(farD);
    for (let y = 0; y < H; y++) {
      let last = -farD;
      for (let x = 0; x < W; x++) { const i = y * W + x; if (m[i]) last = x; if (last > -farD) dl[i] = Math.min(farD, x - last); }
      last = farD * 2;
      for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (m[i]) last = x; if (last < farD * 2) dr2[i] = Math.min(farD, last - x); }
    }
    for (let x = 0; x < W; x++) {
      let last = -farD;
      for (let y = 0; y < H; y++) { const i = y * W + x; if (m[i]) last = y; if (last > -farD) du[i] = Math.min(farD, y - last); }
      last = farD * 2;
      for (let y = H - 1; y >= 0; y--) { const i = y * W + x; if (m[i]) last = y; if (last < farD * 2) dd[i] = Math.min(farD, last - y); }
    }
    const cand = new Uint8Array(n);
    let cnt = 0;
    for (let i = 0; i < n; i++) {
      if (m[i] || closed[i] <= 0.5 || dist[i] <= tolerance) continue;
      const bounded = (du[i] <= rc && dd[i] <= rc) || (dl[i] <= rc && dr2[i] <= rc);
      if (bounded) { cand[i] = 1; cnt++; }
    }
    if (cnt > 0 && cnt <= maskCount * TOUCHING_MAX_FRACTION) {
      const halo = dilateInto(cand, W, H, 1);
      for (let i = 0; i < n; i++) if (halo[i] && !m[i]) added[i] = 1;
    }
  }

  // (3) توسيع يدوي: مكوّنات حبرية صغيرة منفصلة (تباين محلي) تقع ضمن expandPx من القناع.
  //     الملاصق للقناع (الإطار) يُستثنى، وكذلك أي مكوّن كبير (رسم الخلفية).
  if (expandPx > 0) {
    const reach = dilateInto(m, W, H, expandPx);
    const exSeedLum = 0.299 * seedR + 0.587 * seedG + 0.114 * seedB;
    const inkOut = new Uint8Array(n);
    if (exSeedLum >= 110) {
      const cl = boxExtreme(boxExtreme(lum, W, H, rad, true), W, H, rad, false);
      for (let i = 0; i < n; i++) if (!m[i] && cl[i] - lum[i] > LOCAL_CONTRAST_T) inkOut[i] = 1;
    } else {
      const op = boxExtreme(boxExtreme(lum, W, H, rad, false), W, H, rad, true);
      for (let i = 0; i < n; i++) if (!m[i] && lum[i] - op[i] > LOCAL_CONTRAST_T) inkOut[i] = 1;
    }
    const maxArea = Math.max(400, Math.floor(0.06 * n));
    const seen = new Uint8Array(n);
    const stack = new Int32Array(n);
    const compBuf = new Int32Array(n);
    for (let s0 = 0; s0 < n; s0++) {
      if (!inkOut[s0] || seen[s0]) continue;
      let sp = 0, cl = 0, near = false, attached = false;
      stack[sp++] = s0; seen[s0] = 1;
      while (sp > 0) {
        const i = stack[--sp];
        compBuf[cl++] = i;
        if (reach[i]) near = true;
        const x = i % W;
        const l = x > 0 ? i - 1 : -1, r = x < W - 1 ? i + 1 : -1, u = i >= W ? i - W : -1, d = i + W < n ? i + W : -1;
        if ((l >= 0 && m[l]) || (r >= 0 && m[r]) || (u >= 0 && m[u]) || (d >= 0 && m[d])) attached = true;
        if (l >= 0 && inkOut[l] && !seen[l]) { seen[l] = 1; stack[sp++] = l; }
        if (r >= 0 && inkOut[r] && !seen[r]) { seen[r] = 1; stack[sp++] = r; }
        if (u >= 0 && inkOut[u] && !seen[u]) { seen[u] = 1; stack[sp++] = u; }
        if (d >= 0 && inkOut[d] && !seen[d]) { seen[d] = 1; stack[sp++] = d; }
      }
      if (near && !attached && cl <= maxArea) {
        const comp = new Uint8Array(n);
        for (let k = 0; k < cl; k++) comp[compBuf[k]] = 1;
        const halo = dilateInto(comp, W, H, 2);
        for (let i = 0; i < n; i++) if (halo[i] && !m[i]) added[i] = 1;
      }
    }
  }
  let addedCount = 0;
  for (let i = 0; i < n; i++) if (added[i]) { m[i] = 1; addedCount++; }
  maskCount += addedCount;

  // اختيار الطريقة
  let useSolid: boolean;
  if (mode === 'solid') useSolid = true;
  else if (mode === 'smart' || mode === 'exemplar') useSolid = false;
  else useSolid = solidLike;

  // ───────── 1) ملء صافٍ بلون البذرة + تنعيم حافة القناع ─────────
  if (useSolid) {
    let touched = 0;
    for (let i = 0; i < n; i++) {
      if (!m[i]) continue;
      const q = i * 4;
      data[q] = seedR; data[q + 1] = seedG; data[q + 2] = seedB; data[q + 3] = 255;
      touched++;
    }
    // (1) حلقة بكسل واحد خارج القناع: الهالة الفاتحة القريبة من لون الفقاعة تُمزج معه فيختفي الخط الرمادي
    const haloMax = tolerance * 2.2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (m[i]) continue;
        const adj = (x > 0 && m[i - 1]) || (x < W - 1 && m[i + 1]) || (y > 0 && m[i - W]) || (y < H - 1 && m[i + W]);
        if (!adj || dist[i] > haloMax || dist[i] < 1) continue;
        const pi = ((startY + y - pageRowOffset) * imgW + startX + x) * 4;
        const q = i * 4;
        data[q] = Math.round(seedR * 0.65 + pageData[pi] * 0.35);
        data[q + 1] = Math.round(seedG * 0.65 + pageData[pi + 1] * 0.35);
        data[q + 2] = Math.round(seedB * 0.65 + pageData[pi + 2] * 0.35);
        data[q + 3] = 255;
        touched++;
      }
    }
    return { touched, used: 'solid' };
  }

  // ───────── 2) فقاعة متدرجة/شفافة/منقوشة ─────────
  // سطوع وسيط الفقاعة (مدرج تكراري) + قطبية الحبر من ذيول التوزيع
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) if (m[i]) hist[Math.max(0, Math.min(255, Math.round(lum[i])))]++;
  let acc = 0, medianLum = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= maskCount / 2) { medianLum = v; break; } }
  let darkTail = 0, lightTail = 0;
  for (let i = 0; i < n; i++) {
    if (!m[i]) continue;
    if (lum[i] < medianLum - 60) darkTail++;
    else if (lum[i] > medianLum + 60) lightTail++;
  }
  const darkText = darkTail >= lightTail;
  const thr = adaptiveInkThresholds(medianLum);

  const tol2 = tolerance * tolerance;
  const ink = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!m[i]) continue;
    let isInk = dist[i] * dist[i] > tol2;
    if (!isInk) {
      if (darkText && thr.dark !== null && lum[i] < thr.dark) isInk = true;
      else if (!darkText && thr.light !== null && lum[i] > thr.light) isInk = true;
    }
    if (isInk) ink[i] = 1;
  }

  // كشف بالتباين مع الخلفية المحلية (يلتقط الحروف على خلفية متدرجة/منقوشة)
  if (darkText) {
    const closedL = boxExtreme(boxExtreme(lum, W, H, rad, true), W, H, rad, false);
    for (let i = 0; i < n; i++) if (m[i] && closedL[i] - lum[i] > LOCAL_CONTRAST_T) ink[i] = 1;
  } else {
    const openedL = boxExtreme(boxExtreme(lum, W, H, rad, false), W, H, rad, true);
    for (let i = 0; i < n; i++) if (m[i] && lum[i] - openedL[i] > LOCAL_CONTRAST_T) ink[i] = 1;
  }
  // ما أُضيف بالتوسيع اليدوي/الحروف الملامسة حبر بالتعريف
  for (let i = 0; i < n; i++) if (added[i]) ink[i] = 1;

  let inkCount = 0;
  for (let i = 0; i < n; i++) if (ink[i]) inkCount++;
  if (inkCount === 0) return { touched: 0, used: 'none' };

  // توسيع بنصف قطر متكيّف يغطي هالة التنعيم (داخل القناع فقط)
  const growR = Math.max(2, Math.min(4, 2 + Math.round(imgW / 1400)));
  let grown = new Uint8Array(ink);
  for (let pass = 0; pass < growR; pass++) {
    const next = new Uint8Array(grown);
    for (let ly = 0; ly < H; ly++) {
      for (let lx = 0; lx < W; lx++) {
        const i = ly * W + lx;
        if (grown[i] || !m[i]) continue;
        let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          const yy = ly + dy;
          if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = lx + dx;
            if (xx < 0 || xx >= W) continue;
            if (grown[yy * W + xx]) { hit = true; break; }
          }
        }
        if (hit) next[i] = 1;
      }
    }
    grown = next;
  }
  let grownCount = 0;
  for (let i = 0; i < n; i++) if (grown[i]) grownCount++;

  // ملء بالأمثلة: فرضاً (exemplar) أو تلقائياً للخلفيات المنقوشة؛ مع سقف حجم يحمي الواجهة من التجمّد
  if (inpaint && mode !== 'smart' && grownCount <= EXEMPLAR_MAX_PIXELS) {
    let useExemplar = mode === 'exemplar';
    if (!useExemplar) {
      let diffSum = 0, diffCnt = 0;
      for (let ly = 0; ly < H; ly++) {
        for (let lx = 0; lx < W - 1; lx++) {
          const i = ly * W + lx;
          if (!m[i] || grown[i] || !m[i + 1] || grown[i + 1]) continue;
          diffSum += Math.abs(lum[i] - lum[i + 1]);
          diffCnt++;
        }
      }
      useExemplar = diffCnt > 50 && diffSum / diffCnt > TEXTURE_THRESHOLD;
    }
    if (useExemplar) {
      const rgba = new Uint8ClampedArray(n * 4);
      for (let ly = 0; ly < H; ly++) {
        for (let lx = 0; lx < W; lx++) {
          const i = ly * W + lx;
          const pi = ((startY + ly - pageRowOffset) * imgW + startX + lx) * 4;
          rgba[i * 4] = pageData[pi]; rgba[i * 4 + 1] = pageData[pi + 1]; rgba[i * 4 + 2] = pageData[pi + 2]; rgba[i * 4 + 3] = 255;
        }
      }
      inpaint(rgba, W, H, new Uint8Array(grown));
      let t = 0;
      for (let i = 0; i < n; i++) {
        if (!grown[i]) continue;
        const q = i * 4;
        data[q] = rgba[q]; data[q + 1] = rgba[q + 1]; data[q + 2] = rgba[q + 2]; data[q + 3] = 255;
        t++;
      }
      return { touched: t, used: 'exemplar' };
    }
  }

  // نشر الخلفية: كل بكسل جديد = متوسط جيرانه المكتملين (بدون مصفوفات مؤقتة داخل الحلقة)
  const rr = new Float32Array(n), gg = new Float32Array(n), bb = new Float32Array(n);
  const done = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0, qt = 0;
  for (let ly = 0; ly < H; ly++) {
    for (let lx = 0; lx < W; lx++) {
      const i = ly * W + lx;
      if (grown[i] || !m[i]) continue;
      const pi = ((startY + ly - pageRowOffset) * imgW + startX + lx) * 4;
      rr[i] = pageData[pi]; gg[i] = pageData[pi + 1]; bb[i] = pageData[pi + 2];
      done[i] = 1;
      queue[qt++] = i;
    }
  }
  if (qt === 0) {
    for (let i = 0; i < n; i++) if (grown[i]) { rr[i] = seedR; gg[i] = seedG; bb[i] = seedB; done[i] = 1; }
  } else {
    while (qh < qt) {
      const i = queue[qh++];
      const lx = i % W;
      for (let k = 0; k < 4; k++) {
        const j = k === 0 ? (lx > 0 ? i - 1 : -1) : k === 1 ? (lx < W - 1 ? i + 1 : -1) : k === 2 ? (i >= W ? i - W : -1) : (i + W < n ? i + W : -1);
        if (j < 0 || done[j] || !grown[j]) continue;
        const jx = j % W;
        let sr = 0, sg = 0, sb = 0, c = 0;
        for (let t = 0; t < 4; t++) {
          const q = t === 0 ? (jx > 0 ? j - 1 : -1) : t === 1 ? (jx < W - 1 ? j + 1 : -1) : t === 2 ? (j >= W ? j - W : -1) : (j + W < n ? j + W : -1);
          if (q >= 0 && done[q]) { sr += rr[q]; sg += gg[q]; sb += bb[q]; c++; }
        }
        rr[j] = sr / c; gg[j] = sg / c; bb[j] = sb / c;
        done[j] = 1;
        queue[qt++] = j;
      }
    }
    for (let i = 0; i < n; i++) if (grown[i] && !done[i]) { rr[i] = seedR; gg[i] = seedG; bb[i] = seedB; }
  }

  // تنعيم خفيف للمنطقة المعبّأة فقط ثم الكتابة
  let touched = 0;
  for (let ly = 0; ly < H; ly++) {
    for (let lx = 0; lx < W; lx++) {
      const i = ly * W + lx;
      if (!grown[i]) continue;
      let sr = 0, sg = 0, sb = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = ly + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = lx + dx;
          if (xx < 0 || xx >= W) continue;
          const j = yy * W + xx;
          if (!m[j]) continue;
          sr += rr[j]; sg += gg[j]; sb += bb[j]; c++;
        }
      }
      const q = i * 4;
      data[q] = Math.round(c ? sr / c : rr[i]);
      data[q + 1] = Math.round(c ? sg / c : gg[i]);
      data[q + 2] = Math.round(c ? sb / c : bb[i]);
      data[q + 3] = 255;
      touched++;
    }
  }
  return { touched, used: 'smart' };
}
