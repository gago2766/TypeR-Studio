import { describe, it, expect } from 'vitest';
import { whitenRegionPixels, adaptiveInkThresholds } from '../src/utils/whitenCore';
import { exemplarInpaint } from '../src/utils';
import { makePage, rectMask, rng, strokeAlpha, TEXT_STROKES } from './helpers';
import type { Stroke } from './helpers';

const W = 320, H = 220;
const inpaint = (rgba: Uint8ClampedArray, w: number, h: number, u: Uint8Array) => {
  exemplarInpaint(rgba, w, h, u, { patchRadius: 3, maxCandidates: 1400 });
};

/** يشغّل النواة ويعيد: النتيجة + أكبر انحراف مرئي عن الخلفية الحقيقية في أماكن الحروف */
function run(bg: (x: number, y: number) => number[], seed: [number, number, number], opts: Record<string, unknown> = {}) {
  const page = makePage(W, H, bg);
  const clean = new Uint8ClampedArray(W * H * 4);
  const res = whitenRegionPixels({
    data: clean, regionW: W, regionH: H, mask: rectMask(W, H, 20), imgW: W,
    startX: 0, startY: 0, pageData: page, pageRowOffset: 0, seed, tolerance: 20, inpaint, ...opts,
  });
  let sum = 0, cnt = 0, ghost = 0, offWhite = 0;
  for (let y = 20; y < H - 20; y++) {
    for (let x = 20; x < W - 20; x++) {
      const i = (y * W + x) * 4;
      const [r] = bg(x, y);
      const vis = clean[i + 3] > 0 ? clean[i] : page[i];
      if (strokeAlpha(x, y, TEXT_STROKES, 2.6) > 0.01) {
        const dev = Math.abs(vis - r);
        sum += dev; cnt++;
        if (dev > 8) ghost++;
      }
      if (vis !== 255 && r === 255) offWhite++;
    }
  }
  return { res, meanDev: sum / cnt, ghost, offWhite };
}

describe('الفقاعة البيضاء المصمتة', () => {
  it('تُملأ بالأبيض الصافي دون أي أثر للحروف', () => {
    const r = run(() => [255, 255, 255], [255, 255, 255]);
    expect(r.res.used).toBe('solid');
    expect(r.ghost).toBe(0);
    expect(r.meanDev).toBe(0);
    expect(r.offWhite).toBe(0);
  });

  it('مع ضجيج JPEG تبقى مصمتة وبلا شبح', () => {
    const rand = rng(7);
    const r = run(() => { const v = 255 - Math.floor(rand() * 4); return [v, v, v]; }, [253, 253, 253]);
    expect(r.res.used).toBe('solid');
    expect(r.ghost).toBe(0);
  });
});

describe('الفقاعة المتدرجة (شفافة مظلّلة)', () => {
  it('يختفي أثر الحروف تقريباً (أقل من 1% من بكسلاتها)', () => {
    const r = run((x) => { const v = 200 + Math.round((x / W) * 40); return [v, v, v + 5]; }, [215, 215, 220]);
    expect(r.res.used).toBe('smart');
    expect(r.meanDev).toBeLessThan(4);
    expect(r.ghost).toBeLessThan(400);
  });
});

describe('الفقاعة المنقوشة', () => {
  const checker = (x: number, y: number) => { const v = ((x >> 2) + (y >> 2)) % 2 ? 205 : 225; return [v, v, v]; };
  it('يُستخدم الملء بالأمثلة ويحافظ على النقش', () => {
    const r = run(checker, [215, 215, 215]);
    expect(r.res.used).toBe('exemplar');
    expect(r.meanDev).toBeLessThan(3);
  });
  it('وضع smart القسري ينعّم النقش (انحراف أكبر)', () => {
    const smart = run(checker, [215, 215, 215], { mode: 'smart' });
    const auto = run(checker, [215, 215, 215]);
    expect(smart.res.used).toBe('smart');
    expect(smart.meanDev).toBeGreaterThan(auto.meanDev);
  });
});

describe('أوضاع التبديل اليدوي', () => {
  it('solid يملأ القناع كله حتى على خلفية متدرجة', () => {
    const r = run((x) => { const v = 200 + Math.round((x / W) * 40); return [v, v, v]; }, [215, 215, 215], { mode: 'solid' });
    expect(r.res.used).toBe('solid');
  });
  it('exemplar قسري على خلفية ناعمة يعمل', () => {
    const r = run((x) => { const v = 200 + Math.round((x / W) * 40); return [v, v, v]; }, [215, 215, 215], { mode: 'exemplar' });
    expect(r.res.used).toBe('exemplar');
  });
});

describe('الحافة والتوسيع', () => {
  // فقاعة بيضاء بإطار أسود سمكه 3px على خلفية رمادية، وSFX منفصل خارجها
  const BW = 400, BH = 300, cx = 200, cy = 150, a = 150, b = 100, border = 3;
  const inEll = (x: number, y: number, ra: number, rb: number) => ((x - cx) / ra) ** 2 + ((y - cy) / rb) ** 2 <= 1;
  const inner: Stroke[] = [[170, 120, 260, 123], [160, 150, 250, 153]];
  const sfx: Stroke[] = [[354, 140, 372, 143], [354, 150, 366, 153]];

  function build() {
    const page = new Uint8ClampedArray(BW * BH * 4);
    const isBorder = new Uint8Array(BW * BH);
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      const i = y * BW + x;
      let v = 200;
      const inn = inEll(x, y, a - border, b - border), out = inEll(x, y, a, b);
      if (inn) v = 255; else if (out) { v = 15; isBorder[i] = 1; }
      const al = Math.max(inn ? strokeAlpha(x, y, inner, 1.5) : 0, strokeAlpha(x, y, sfx, 1.5));
      v = v * (1 - al) + 10 * al;
      page.set([v, v, v, 255], i * 4);
    }
    // قناع: تعبئة فيضية داخل الفقاعة + ملء ثقوب الحروف المغلقة
    const mask = new Uint8Array(BW * BH);
    const q: number[] = [100 * BW + cx]; mask[100 * BW + cx] = 1;
    while (q.length) {
      const i = q.pop()!; const x = i % BW, y = (i / BW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= BW || ny >= BH) continue;
        const j = ny * BW + nx; if (mask[j]) continue;
        if (Math.abs(page[j * 4] - 255) * 1.732 <= 20) { mask[j] = 1; q.push(j); }
      }
    }
    const outside = new Uint8Array(BW * BH); const q2: number[] = [];
    for (let x = 0; x < BW; x++) q2.push(x, (BH - 1) * BW + x);
    for (let y = 0; y < BH; y++) q2.push(y * BW, y * BW + BW - 1);
    for (const i of q2) outside[i] = 1;
    while (q2.length) {
      const i = q2.pop()!; const x = i % BW, y = (i / BW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= BW || ny >= BH) continue;
        const j = ny * BW + nx; if (outside[j] || mask[j]) continue; outside[j] = 1; q2.push(j);
      }
    }
    for (let i = 0; i < BW * BH; i++) if (!outside[i] && !mask[i]) mask[i] = 1;
    let minX = BW, maxX = 0, minY = BH, maxY = 0;
    for (let i = 0; i < BW * BH; i++) if (mask[i]) { const x = i % BW, y = (i / BW) | 0; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    return { page, mask, isBorder, minX, maxX, minY, maxY };
  }

  function whiten(opts: Record<string, unknown>) {
    const s = build();
    const margin = Math.min(48, 3 + ((opts.expandPx as number) > 0 ? (opts.expandPx as number) + 20 : 0));
    const sx = Math.max(0, s.minX - margin), sy = Math.max(0, s.minY - margin);
    const ex = Math.min(BW, s.maxX + 1 + margin), ey = Math.min(BH, s.maxY + 1 + margin);
    const rw = ex - sx, rh = ey - sy;
    const clean = new Uint8ClampedArray(rw * rh * 4);
    whitenRegionPixels({ data: clean, regionW: rw, regionH: rh, mask: s.mask, imgW: BW, startX: sx, startY: sy, pageData: s.page, pageRowOffset: 0, seed: [255, 255, 255], tolerance: 20, inpaint, ...opts });
    const vis = (x: number, y: number) => {
      if (x < sx || x >= ex || y < sy || y >= ey) return s.page[(y * BW + x) * 4];
      const k = ((y - sy) * rw + (x - sx)) * 4;
      return clean[k + 3] > 0 ? clean[k] : s.page[(y * BW + x) * 4];
    };
    let borderPx = 0, borderKept = 0, sfxLeft = 0, innerLeft = 0, innerNotWhite = 0;
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      const i = y * BW + x, v = vis(x, y);
      if (s.isBorder[i] && strokeAlpha(x, y, inner.concat(sfx), 1.5) < 0.05) { borderPx++; if (Math.abs(v - s.page[i * 4]) <= 60) borderKept++; }
      if (!inEll(x, y, a + 4, b + 4) && strokeAlpha(x, y, sfx, 1.5) > 0.3 && v < 120) sfxLeft++;
      if (inEll(x, y, a - border - 1, b - border - 1)) {
        if (strokeAlpha(x, y, inner, 1.5) > 0.3 && v < 120) innerLeft++;
        if (v !== 255) innerNotWhite++;
      }
    }
    return { borderIntact: borderKept / borderPx, sfxLeft, innerLeft, innerNotWhite };
  }

  it('الإطار الأسود يبقى سليماً والداخل أبيض صافٍ', () => {
    const r = whiten({});
    expect(r.borderIntact).toBeGreaterThan(0.999);
    expect(r.innerLeft).toBe(0);
    expect(r.innerNotWhite).toBe(0);
  });

  it('بدون توسيع يبقى الـ SFX الخارجي كما هو', () => {
    const r = whiten({ expandPx: 0 });
    expect(r.sfxLeft).toBeGreaterThan(0);
  });

  it('التوسيع اليدوي يزيل الـ SFX المنفصل دون المساس بالإطار', () => {
    const before = whiten({ expandPx: 0 }).sfxLeft;
    const r = whiten({ expandPx: 12 });
    expect(r.sfxLeft).toBeLessThan(before * 0.2);
    expect(r.borderIntact).toBeGreaterThan(0.995);
  });
});

describe('عتبات السطوع التكيفية', () => {
  it('تطابق القيم القديمة عند الأبيض والأسود', () => {
    expect(adaptiveInkThresholds(255)).toEqual({ dark: 85, light: null });
    expect(adaptiveInkThresholds(130 + 0.1)).toEqual({ dark: 85, light: Math.max(130, 130.1 + (255 - 130.1) * 0.5) });
    expect(adaptiveInkThresholds(30)).toEqual({ dark: null, light: 130 });
  });
  it('تغطي المنطقة الوسطى (85–120) التي كانت بلا قاعدة', () => {
    const t = adaptiveInkThresholds(100);
    expect(t.dark).toBe(50);
    expect(t.light).toBeCloseTo(177.5);
  });
});
