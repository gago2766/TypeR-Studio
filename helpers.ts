// أدوات توليد صور اصطناعية لاختبار التبييض

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

export type Stroke = [number, number, number, number];

/** شفافية حرف مموّه الحواف (هالة غاوسية) من مجموعة ضربات مستطيلة */
export function strokeAlpha(x: number, y: number, strokes: Stroke[], sigma = 2.6): number {
  let a = 0;
  for (const [x0, y0, x1, y1] of strokes) {
    const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
    a = Math.max(a, d <= 0 ? 1 : Math.exp(-(d * d) / (2 * sigma * sigma)));
  }
  return a;
}

export const TEXT_STROKES: Stroke[] = [
  [60, 70, 200, 73], [60, 100, 240, 103], [80, 130, 260, 133], [70, 160, 180, 163],
];

export function makePage(W: number, H: number, bg: (x: number, y: number) => number[], strokes: Stroke[] = TEXT_STROKES, sigma = 2.6) {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = bg(x, y);
      const a = strokeAlpha(x, y, strokes, sigma);
      const i = (y * W + x) * 4;
      d[i] = r * (1 - a) + 10 * a;
      d[i + 1] = g * (1 - a) + 10 * a;
      d[i + 2] = b * (1 - a) + 10 * a;
      d[i + 3] = 255;
    }
  }
  return d;
}

export function rectMask(W: number, H: number, margin: number): Uint8Array {
  const m = new Uint8Array(W * H);
  for (let y = margin; y < H - margin; y++) for (let x = margin; x < W - margin; x++) m[y * W + x] = 1;
  return m;
}
