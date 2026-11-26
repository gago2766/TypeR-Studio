import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';

export interface BrushLoupeHandle {
  /** يحدّث موضع الدائرة والنافذة المكبّرة (إحداثيات الشاشة + إحداثيات بكسلات الصورة الأصلية) */
  update: (p: { clientX: number; clientY: number; natX: number; natY: number }) => void;
  hide: () => void;
  hideLater: (ms?: number) => void;
}

interface BrushLoupeProps {
  imageRef: React.RefObject<HTMLImageElement | null>;
  cleaningCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  brushSize: number; // بكسلات الصورة الأصلية
  brushColor: string;
  zoom: number;
  tool: string;
}

const LOUPE_MARGIN = 8;
const NEAR_PAD = 36; // ابتعاد الفرشاة عن النافذة قبل أن تنتقل للجهة الأخرى

// يرسم جزءاً من مصدر داخل الوجهة مع قصّ الأجزاء الخارجة عن حدود المصدر
function drawClipped(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dw: number,
  dh: number
) {
  const ix0 = Math.max(0, sx);
  const iy0 = Math.max(0, sy);
  const ix1 = Math.min(srcW, sx + sw);
  const iy1 = Math.min(srcH, sy + sh);
  if (ix1 <= ix0 || iy1 <= iy0) return;
  const kx = dw / sw;
  const ky = dh / sh;
  ctx.drawImage(src, ix0, iy0, ix1 - ix0, iy1 - iy0, (ix0 - sx) * kx, (iy0 - sy) * ky, (ix1 - ix0) * kx, (iy1 - iy0) * ky);
}

/**
 * دائرة بحجم الفرشاة الفعلي + نافذة مكبّرة تُظهر مكان الرسم في أعلى الشاشة (يسار/يمين).
 * تتحدث مباشرة عبر DOM/canvas دون أي إعادة بناء لواجهة React أثناء الحركة.
 */
export const BrushLoupe = memo(
  forwardRef<BrushLoupeHandle, BrushLoupeProps>(function BrushLoupe(props, ref) {
    const propsRef = useRef(props);
    propsRef.current = props;

    const circleRef = useRef<HTMLDivElement>(null);
    const loupeRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const captionRef = useRef<HTMLDivElement>(null);

    const lastRef = useRef<{ clientX: number; clientY: number; natX: number; natY: number } | null>(null);
    const rafRef = useRef<number | null>(null);
    const hideTimerRef = useRef<number | null>(null);
    const visibleRef = useRef(false);
    const sideRef = useRef<'left' | 'right'>('left');

    // ⚡ نافذة صغيرة مخزَّنة من الصورة الأصلية: لا نرسم من الصورة الضخمة (قد تُفكَّك من جديد في كل إطار)
    // بل من هذه النافذة، وتُحدَّث فقط عندما تبتعد الفرشاة عنها
    const baseCacheRef = useRef<{ canvas: HTMLCanvasElement; x0: number; y0: number; w: number; h: number; key: string } | null>(null);
    const lastLoupeTsRef = useRef(0);
    const trailingRef = useRef<number | null>(null);
    const rectCacheRef = useRef<{ t: number; rect: DOMRect } | null>(null);

    const setVisible = (v: boolean) => {
      visibleRef.current = v;
      const d = v ? 'block' : 'none';
      if (circleRef.current) circleRef.current.style.display = d;
      if (loupeRef.current) loupeRef.current.style.display = d;
    };

    const render = () => {
      rafRef.current = null;
      const last = lastRef.current;
      const { imageRef, cleaningCanvasRef, containerRef, brushSize, brushColor, zoom, tool } = propsRef.current;
      const img = imageRef.current;
      const container = containerRef.current;
      const circle = circleRef.current;
      const loupe = loupeRef.current;
      const canvas = canvasRef.current;
      if (!last || !img || !container || !circle || !loupe || !canvas || !img.naturalWidth || !img.offsetWidth) {
        setVisible(false);
        return;
      }

      // ---------- الدائرة: قطرها = حجم الفرشاة الفعلي على الشاشة ----------
      const cssPerNat = zoom * (img.offsetWidth / img.naturalWidth);
      const dia = Math.max(6, brushSize * cssPerNat);
      circle.style.width = `${dia}px`;
      circle.style.height = `${dia}px`;
      circle.style.left = `${last.clientX}px`;
      circle.style.top = `${last.clientY}px`;
      circle.style.background = tool === 'brush' ? `${brushColor}33` : 'transparent';
      circle.style.borderStyle = tool === 'eraser' ? 'dashed' : 'solid';

      // ---------- النافذة المكبّرة (رسمها يُحدّ بـ ~30 إطاراً/ث؛ الدائرة تتحرك بلا تأخير) ----------
      const nowTs = performance.now();
      if (nowTs - lastLoupeTsRef.current < 33) {
        if (trailingRef.current === null) {
          trailingRef.current = window.setTimeout(() => {
            trailingRef.current = null;
            schedule();
          }, 36);
        }
        return;
      }
      lastLoupeTsRef.current = nowTs;

      const L = window.innerWidth < 420 ? 112 : 132;
      let cachedRect = rectCacheRef.current;
      if (!cachedRect || nowTs - cachedRect.t > 250) {
        cachedRect = { t: nowTs, rect: container.getBoundingClientRect() };
        rectCacheRef.current = cachedRect;
      }
      const cr = cachedRect.rect;
      const top = Math.max(cr.top, 0) + LOUPE_MARGIN;
      const leftX = cr.left + LOUPE_MARGIN;
      const rightX = cr.right - L - LOUPE_MARGIN;

      const near = (x0: number) =>
        last.clientX > x0 - NEAR_PAD && last.clientX < x0 + L + NEAR_PAD &&
        last.clientY > top - NEAR_PAD && last.clientY < top + L + NEAR_PAD;
      const nearLeft = near(leftX);
      const nearRight = near(rightX);
      if (nearLeft && !nearRight) sideRef.current = 'right';
      else if (nearRight && !nearLeft) sideRef.current = 'left';
      const x = sideRef.current === 'left' ? leftX : rightX;

      loupe.style.width = `${L}px`;
      loupe.style.height = `${L}px`;
      loupe.style.left = `${x}px`;
      loupe.style.top = `${top}px`;

      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const px = Math.round(L * dpr);
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      canvas.style.width = `${L}px`;
      canvas.style.height = `${L}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // المنطقة المعروضة (بكسلات أصلية): تتناسب مع حجم الفرشاة ليظهر محيطها واضحاً
      const region = Math.min(360, Math.max(40, brushSize * 3.2));
      const mag = px / region;
      const sx = last.natX - region / 2;
      const sy = last.natY - region / 2;

      ctx.save();
      ctx.clearRect(0, 0, px, px);
      ctx.fillStyle = '#1b1b1b';
      ctx.fillRect(0, 0, px, px);
      ctx.imageSmoothingEnabled = mag < 3;

      // الصورة الأصلية من النافذة المخزَّنة (تُحدَّث عند الحاجة فقط)
      const key = `${img.naturalWidth}x${img.naturalHeight}:${img.src.length}:${img.src.slice(0, 40)}:${img.src.slice(-40)}`;
      let bc = baseCacheRef.current;
      const needX0 = Math.max(0, Math.floor(sx));
      const needY0 = Math.max(0, Math.floor(sy));
      const needX1 = Math.min(img.naturalWidth, Math.ceil(sx + region));
      const needY1 = Math.min(img.naturalHeight, Math.ceil(sy + region));
      const covers = !!bc && bc.key === key && bc.x0 <= needX0 && bc.y0 <= needY0 &&
        bc.x0 + bc.w >= needX1 && bc.y0 + bc.h >= needY1;
      if (!covers && needX1 > needX0 && needY1 > needY0) {
        const cw = Math.min(img.naturalWidth, Math.max(1024, Math.ceil(region * 2.5)));
        const ch = Math.min(img.naturalHeight, Math.max(1024, Math.ceil(region * 2.5)));
        const cx0 = Math.max(0, Math.min(img.naturalWidth - cw, Math.round(last.natX - cw / 2)));
        const cy0 = Math.max(0, Math.min(img.naturalHeight - ch, Math.round(last.natY - ch / 2)));
        if (!bc) {
          bc = { canvas: document.createElement('canvas'), x0: 0, y0: 0, w: 0, h: 0, key: '' };
        }
        bc.canvas.width = cw;
        bc.canvas.height = ch;
        const bctx = bc.canvas.getContext('2d');
        if (bctx) {
          bctx.drawImage(img, cx0, cy0, cw, ch, 0, 0, cw, ch);
          bc.x0 = cx0; bc.y0 = cy0; bc.w = cw; bc.h = ch; bc.key = key;
          baseCacheRef.current = bc;
        }
      }
      bc = baseCacheRef.current;
      if (bc && bc.key === key) {
        drawClipped(ctx, bc.canvas, bc.w, bc.h, sx - bc.x0, sy - bc.y0, region, region, px, px);
      }
      const cc = cleaningCanvasRef.current;
      if (cc && cc.width > 0 && cc.height > 0) {
        drawClipped(ctx, cc, cc.width, cc.height, sx, sy, region, region, px, px);
      }

      // محيط الفرشاة وسط النافذة + علامة المركز
      const cx = px / 2;
      const cy = px / 2;
      const r = Math.max(3 * dpr, (brushSize / 2) * mag);
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.4 * dpr;
      ctx.strokeStyle = '#ffffff';
      if (tool === 'eraser') ctx.setLineDash([4 * dpr, 3 * dpr]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const t = 5 * dpr;
      ctx.lineWidth = 1 * dpr;
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.beginPath();
      ctx.moveTo(cx - t, cy); ctx.lineTo(cx + t, cy);
      ctx.moveTo(cx, cy - t); ctx.lineTo(cx, cy + t);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.6 * dpr;
      ctx.beginPath();
      ctx.moveTo(cx - t, cy); ctx.lineTo(cx + t, cy);
      ctx.moveTo(cx, cy - t); ctx.lineTo(cx, cy + t);
      ctx.stroke();
      ctx.restore();

      if (captionRef.current) {
        captionRef.current.textContent = `×${(mag / dpr).toFixed(1)} · ${Math.round(brushSize)}px`;
      }
      setVisible(true);
    };

    const schedule = () => {
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(render);
    };

    useImperativeHandle(
      ref,
      () => ({
        update: p => {
          if (hideTimerRef.current !== null) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
          }
          lastRef.current = p;
          schedule();
        },
        hide: () => {
          if (hideTimerRef.current !== null) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
          }
          lastRef.current = null;
          setVisible(false);
        },
        hideLater: (ms = 900) => {
          if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
          hideTimerRef.current = window.setTimeout(() => {
            hideTimerRef.current = null;
            lastRef.current = null;
            setVisible(false);
          }, ms);
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    // تغيّر الحجم/اللون/التكبير/الأداة أثناء العرض: أعد الرسم فوراً
    useEffect(() => {
      if (visibleRef.current) schedule();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.brushSize, props.brushColor, props.zoom, props.tool]);

    useEffect(
      () => () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
        if (trailingRef.current !== null) clearTimeout(trailingRef.current);
        baseCacheRef.current = null;
      },
      []
    );

    return (
      <>
        <div
          ref={circleRef}
          aria-hidden
          style={{
            display: 'none',
            position: 'fixed',
            zIndex: 9998,
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: '1.5px solid #ffffff',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(0,0,0,0.55)',
            boxSizing: 'border-box',
          }}
        />
        <div
          ref={loupeRef}
          aria-hidden
          style={{
            display: 'none',
            position: 'fixed',
            zIndex: 9999,
            pointerEvents: 'none',
            borderRadius: 14,
            overflow: 'hidden',
            border: '2px solid #ffffff',
            boxShadow: '0 4px 18px rgba(0,0,0,0.7)',
            background: '#1b1b1b',
          }}
        >
          <canvas ref={canvasRef} style={{ display: 'block' }} />
          <div
            ref={captionRef}
            style={{
              position: 'absolute',
              bottom: 3,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: 10,
              fontFamily: 'monospace',
              color: '#fff',
              textShadow: '0 0 3px #000, 0 0 3px #000',
            }}
          />
        </div>
      </>
    );
  })
);
