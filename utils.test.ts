import { describe, it, expect } from 'vitest';
import { hexToRgb, isDarkSeedColor, estimateAutoTolerance } from '../src/utils';
import { rng } from './helpers';

describe('hexToRgb / isDarkSeedColor', () => {
  it('يحلّل الصيغتين القصيرة والطويلة', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#fa0')).toEqual([255, 170, 0]);
    expect(hexToRgb('#102030')).toEqual([16, 32, 48]);
  });
  it('يعيد القيمة الاحتياطية للمدخلات غير الصالحة', () => {
    expect(hexToRgb(undefined)).toEqual([255, 255, 255]);
    expect(hexToRgb('red', [1, 2, 3])).toEqual([1, 2, 3]);
    expect(hexToRgb('#zzzzzz', [9, 9, 9])).toEqual([9, 9, 9]);
  });
  it('يميّز الفقاعة الداكنة', () => {
    expect(isDarkSeedColor('#101010')).toBe(true);
    expect(isDarkSeedColor('#ffffff')).toBe(false);
    expect(isDarkSeedColor(undefined)).toBe(false);
  });
});

describe('estimateAutoTolerance', () => {
  const W = 120, H = 120;
  function page(noise: number) {
    const r = rng(3);
    const d = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      const v = 245 + (r() - 0.5) * 2 * noise;
      d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
    }
    return d;
  }
  it('صفحة نظيفة: لا يخفض التسامح عن القاعدة', () => {
    expect(estimateAutoTolerance(page(0), W, H, 60, 60, 20)).toBe(20);
  });
  it('صفحة مضغوطة بضجيج: يرفع التسامح', () => {
    expect(estimateAutoTolerance(page(8), W, H, 60, 60, 20)).toBeGreaterThan(20);
  });
  it('لا يتجاوز السقف 48', () => {
    expect(estimateAutoTolerance(page(60), W, H, 60, 60, 20)).toBeLessThanOrEqual(48);
  });
});

import { analyzeBubbleAt } from '../src/utils';

describe('analyzeBubbleAt (تعبئة الفقاعة بعد تعديل العتبات)', () => {
  const W = 300, H = 220, cx = 150, cy = 110, a = 110, b = 80;
  const inEll = (x: number, y: number, ra: number, rb: number) => ((x - cx) / ra) ** 2 + ((y - cy) / rb) ** 2 <= 1;

  function bubblePage(fill: number) {
    const d = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = inEll(x, y, a - 3, b - 3) ? fill : inEll(x, y, a, b) ? 10 : 190;
      d.set([v, v, v, 255], (y * W + x) * 4);
      // نص داخلي: خط أسود/أبيض بحسب لون الفقاعة
      if (inEll(x, y, a - 3, b - 3) && x > 100 && x < 200 && y > 100 && y < 104) d.set(fill > 128 ? [10, 10, 10, 255] : [245, 245, 245, 255], (y * W + x) * 4);
    }
    return d;
  }

  it('فقاعة بيضاء: القناع يغطي الداخل كله بما فيه النص', () => {
    const r = analyzeBubbleAt(bubblePage(255), W, H, 60, 110, { tolerance: 20, minBubbleSize: 25 });
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    let area = 0;
    for (let i = 0; i < r.mask.length; i++) area += r.mask[i];
    const expected = Math.PI * (a - 3) * (b - 3);
    expect(area).toBeGreaterThan(expected * 0.97);
    expect(area).toBeLessThan(expected * 1.03);
    expect(r.isDarkBubble).toBe(false);
  });

  it('فقاعة داكنة: تُكتشف كداكنة والقناع يغطيها', () => {
    const r = analyzeBubbleAt(bubblePage(25), W, H, 60, 110, { tolerance: 20, minBubbleSize: 25 });
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.isDarkBubble).toBe(true);
    let area = 0;
    for (let i = 0; i < r.mask.length; i++) area += r.mask[i];
    expect(area).toBeGreaterThan(Math.PI * (a - 3) * (b - 3) * 0.95);
  });

  it('فقاعة رمادية متوسطة (المنطقة الميتة سابقاً 85–140) تُملأ بلا تسرّب خارج الإطار', () => {
    const r = analyzeBubbleAt(bubblePage(110), W, H, 60, 110, { tolerance: 20, minBubbleSize: 25 });
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    let leaked = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r.mask[y * W + x] && !inEll(x, y, a - 2, b - 2)) leaked++;
    expect(leaked).toBe(0);
  });
});
