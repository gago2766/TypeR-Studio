// TypeR-Studio2-main/src/utils.ts

// 📥 إعادة تصدير دوال الكشيدة والتمطيط العربي
export * from './utils/tatweel';

// 📥 إعادة تصدير دوال حفظ واسترجاع الخطوط وقاعدة البيانات
export * from './utils/fontStorage';

// 📥 إعادة تصدير خوارزمية استخراج التدرجات والـ Stroke
export * from './utils/colorExtraction';

// 📥 إعادة تصدير دوال قياس النصوص وتوزيع الفقاعات وحساب المقاس الأنسب
export * from './utils/textLayout';

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

// 🧼 دالة تبييض مساحة الماسك المحددة بلون محدد
export function whitenMaskArea(
  canvas: HTMLCanvasElement,
  mask: Uint8Array,
  imgW: number,
  imgH: number,
  fillColorHex: string = '#ffffff',
  bbox?: { x: number; y: number; w: number; h: number }
): string {
  if (!canvas || !mask || mask.length === 0 || imgW <= 0 || imgH <= 0) {
    return canvas ? canvas.toDataURL() : '';
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL();

  if (canvas.width !== imgW || canvas.height !== imgH) {
    canvas.width = imgW;
    canvas.height = imgH;
  }

  const startX = bbox ? Math.max(0, bbox.x) : 0;
  const startY = bbox ? Math.max(0, bbox.y) : 0;
  const regionW = bbox ? Math.min(imgW - startX, bbox.w) : imgW;
  const regionH = bbox ? Math.min(imgH - startY, bbox.h) : imgH;

  if (regionW <= 0 || regionH <= 0) return canvas.toDataURL();

  const imgData = ctx.getImageData(startX, startY, regionW, regionH);
  const data = imgData.data;

  let fillR = 255, fillG = 255, fillB = 255, fillA = 255;
  if (fillColorHex.startsWith('#')) {
    const hex = fillColorHex.substring(1);
    if (hex.length === 3) {
      fillR = parseInt(hex[0] + hex[0], 16);
      fillG = parseInt(hex[1] + hex[1], 16);
      fillB = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      fillR = parseInt(hex.substring(0, 2), 16);
      fillG = parseInt(hex.substring(2, 4), 16);
      fillB = parseInt(hex.substring(4, 6), 16);
    }
  }

  for (let localY = 0; localY < regionH; localY++) {
    const globalY = startY + localY;
    const maskRow = globalY * imgW;
    const dataRow = localY * regionW;

    for (let localX = 0; localX < regionW; localX++) {
      const globalX = startX + localX;
      if (mask[maskRow + globalX] === 1) {
        const p = (dataRow + localX) * 4;
        data[p] = fillR;
        data[p + 1] = fillG;
        data[p + 2] = fillB;
        data[p + 3] = fillA;
      }
    }
  }

  ctx.putImageData(imgData, startX, startY);
  return canvas.toDataURL();
}

// 🪄 دالة التعبئة التلقائية مع مراعاة المحتوى (Content-Aware Fill المحلي)
export function contentAwareFillLocal(
  targetCtx: CanvasRenderingContext2D,
  sourceImg: HTMLImageElement,
  rect: { x: number; y: number; width: number; height: number },
  mask?: Uint8Array | null,
  imgW?: number,
  imgH?: number
): void {
  const w = imgW || sourceImg.naturalWidth;
  const h = imgH || sourceImg.naturalHeight;

  if (w <= 0 || h <= 0) return;

  const margin = 28;
  const minX = Math.max(0, Math.floor(rect.x) - margin);
  const minY = Math.max(0, Math.floor(rect.y) - margin);
  const maxX = Math.min(w - 1, Math.ceil(rect.x + rect.width) + margin);
  const maxY = Math.min(h - 1, Math.ceil(rect.y + rect.height) + margin);

  const regionW = maxX - minX + 1;
  const regionH = maxY - minY + 1;
  if (regionW <= 0 || regionH <= 0) return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) return;

  tempCtx.drawImage(sourceImg, 0, 0);
  if (targetCtx.canvas) {
    tempCtx.drawImage(targetCtx.canvas, 0, 0);
  }

  const imgData = tempCtx.getImageData(minX, minY, regionW, regionH);
  const data = imgData.data;

  const localMask = new Uint8Array(regionW * regionH);
  let maskedCount = 0;

  const isMaskedGlobal = (gx: number, gy: number): boolean => {
    if (gx < 0 || gx >= w || gy < 0 || gy >= h) return false;
    const insideRect = gx >= rect.x && gx < rect.x + rect.width && gy >= rect.y && gy < rect.y + rect.height;
    if (mask && mask.length === w * h) {
      return mask[gy * w + gx] === 1 || insideRect;
    }
    return insideRect;
  };

  for (let ly = 0; ly < regionH; ly++) {
    const gy = minY + ly;
    for (let lx = 0; lx < regionW; lx++) {
      const gx = minX + lx;
      if (isMaskedGlobal(gx, gy)) {
        localMask[ly * regionW + lx] = 1;
        maskedCount++;
      }
    }
  }

  if (maskedCount === 0) return;

  const PATCH_R = 3;

  const candidateCenters: number[] = [];
  for (let ly = PATCH_R; ly < regionH - PATCH_R; ly += 2) {
    for (let lx = PATCH_R; lx < regionW - PATCH_R; lx += 2) {
      let isClean = true;
      for (let dy = -PATCH_R; dy <= PATCH_R; dy++) {
        for (let dx = -PATCH_R; dx <= PATCH_R; dx++) {
          const idx = (ly + dy) * regionW + (lx + dx);
          if (localMask[idx] !== 0) {
            isClean = false;
            break;
          }
        }
        if (!isClean) break;
      }
      if (isClean) {
        candidateCenters.push(ly * regionW + lx);
      }
    }
  }

  if (candidateCenters.length === 0) {
    for (let ly = PATCH_R; ly < regionH - PATCH_R; ly += 2) {
      for (let lx = PATCH_R; lx < regionW - PATCH_R; lx += 2) {
        let cleanCount = 0;
        for (let dy = -PATCH_R; dy <= PATCH_R; dy++) {
          for (let dx = -PATCH_R; dx <= PATCH_R; dx++) {
            const idx = (ly + dy) * regionW + (lx + dx);
            if (localMask[idx] === 0) cleanCount++;
          }
        }
        if (cleanCount >= 32) {
          candidateCenters.push(ly * regionW + lx);
        }
      }
    }
  }

  let unfilledCount = maskedCount;
  let iterations = 0;
  const maxIterations = 50;

  while (unfilledCount > 0 && iterations < maxIterations) {
    iterations++;

    const frontier: number[] = [];
    for (let ly = 0; ly < regionH; ly++) {
      for (let lx = 0; lx < regionW; lx++) {
        const idx = ly * regionW + lx;
        if (localMask[idx] === 1) {
          let hasKnownNeighbor = false;
          if (lx > 0 && localMask[idx - 1] !== 1) hasKnownNeighbor = true;
          else if (lx < regionW - 1 && localMask[idx + 1] !== 1) hasKnownNeighbor = true;
          else if (ly > 0 && localMask[idx - regionW] !== 1) hasKnownNeighbor = true;
          else if (ly < regionH - 1 && localMask[idx + regionW] !== 1) hasKnownNeighbor = true;

          if (hasKnownNeighbor) {
            frontier.push(idx);
          }
        }
      }
    }

    if (frontier.length === 0) break;

    let filledInThisPass = 0;

    for (let f = 0; f < frontier.length; f++) {
      const targetIdx = frontier[f];
      if (localMask[targetIdx] !== 1) continue;

      const tx = targetIdx % regionW;
      const ty = Math.floor(targetIdx / regionW);

      let bestCandidateIdx = -1;
      let minSSD = Infinity;

      const candStep = candidateCenters.length > 150 ? Math.floor(candidateCenters.length / 150) : 1;

      for (let c = 0; c < candidateCenters.length; c += candStep) {
        const candIdx = candidateCenters[c];
        const cx = candIdx % regionW;
        const cy = Math.floor(candIdx / regionW);

        let ssd = 0;
        let knownCount = 0;

        for (let dy = -PATCH_R; dy <= PATCH_R; dy++) {
          const tY = ty + dy;
          const cY = cy + dy;
          if (tY < 0 || tY >= regionH || cY < 0 || cY >= regionH) continue;

          for (let dx = -PATCH_R; dx <= PATCH_R; dx++) {
            const tX = tx + dx;
            const cX = cx + dx;
            if (tX < 0 || tX >= regionW || cX < 0 || cX >= regionW) continue;

            const tPos = tY * regionW + tX;
            if (localMask[tPos] !== 1) {
              const cPos = cY * regionW + cX;
              const tPix = tPos * 4;
              const cPix = cPos * 4;

              const dr = data[tPix] - data[cPix];
              const dg = data[tPix + 1] - data[cPix + 1];
              const db = data[tPix + 2] - data[cPix + 2];

              ssd += dr * dr + dg * dg + db * db;
              knownCount++;
            }
          }
        }

        if (knownCount > 0) {
          const normalizedSSD = ssd / knownCount;
          if (normalizedSSD < minSSD) {
            minSSD = normalizedSSD;
            bestCandidateIdx = candIdx;
          }
        }
      }

      if (bestCandidateIdx !== -1) {
        const cx = bestCandidateIdx % regionW;
        const cy = Math.floor(bestCandidateIdx / regionW);

        for (let dy = -PATCH_R; dy <= PATCH_R; dy++) {
          const tY = ty + dy;
          const cY = cy + dy;
          if (tY < 0 || tY >= regionH || cY < 0 || cY >= regionH) continue;

          for (let dx = -PATCH_R; dx <= PATCH_R; dx++) {
            const tX = tx + dx;
            const cX = cx + dx;
            if (tX < 0 || tX >= regionW || cX < 0 || cX >= regionW) continue;

            const tPos = tY * regionW + tX;
            if (localMask[tPos] === 1) {
              const cPos = cY * regionW + cX;
              const tPix = tPos * 4;
              const cPix = cPos * 4;

              data[tPix]     = data[cPix];
              data[tPix + 1] = data[cPix + 1];
              data[tPix + 2] = data[cPix + 2];
              data[tPix + 3] = data[cPix + 3];

              localMask[tPos] = 2;
              unfilledCount--;
              filledInThisPass++;
            }
          }
        }
      }
    }

    if (filledInThisPass === 0) {
      for (let ly = 0; ly < regionH; ly++) {
        for (let lx = 0; lx < regionW; lx++) {
          const idx = ly * regionW + lx;
          if (localMask[idx] === 1) {
            let minDist = Infinity;
            let nearestPix = -1;
            for (let dy = -8; dy <= 8; dy++) {
              for (let dx = -8; dx <= 8; dx++) {
                const ny = ly + dy;
                const nx = lx + dx;
                if (nx >= 0 && nx < regionW && ny >= 0 && ny < regionH) {
                  const nIdx = ny * regionW + nx;
                  if (localMask[nIdx] !== 1) {
                    const dist = dx * dx + dy * dy;
                    if (dist < minDist) {
                      minDist = dist;
                      nearestPix = nIdx * 4;
                    }
                  }
                }
              }
            }
            if (nearestPix !== -1) {
              const pix = idx * 4;
              data[pix]     = data[nearestPix];
              data[pix + 1] = data[nearestPix + 1];
              data[pix + 2] = data[nearestPix + 2];
              data[pix + 3] = data[nearestPix + 3];
              localMask[idx] = 2;
              unfilledCount--;
            }
          }
        }
      }
      break;
    }
  }

  targetCtx.putImageData(imgData, minX, minY);
}
