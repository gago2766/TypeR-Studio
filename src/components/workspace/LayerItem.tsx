import React, { memo } from 'react';
import { MangaLayer } from '../../types';
import { formatFontFamily } from '../../utils';

interface LayerItemProps {
  layer: MangaLayer;
  isActive: boolean;
  activeTool: string;
  onSetActiveLayer: (layer: MangaLayer | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<MangaLayer>, saveToHistory?: boolean) => void;
  onLayerDragStart: (layer: MangaLayer, e: React.MouseEvent) => void;
  onLayerTouchStart: (layer: MangaLayer, e: React.TouchEvent) => void;
  setRotateState: (state: any) => void;
  setProportionalResizeState: (state: any) => void;
  setTopStretchState: (state: any) => void;
  setBottomStretchState: (state: any) => void;
  setLeftStretchState: (state: any) => void;
  setRightStretchState: (state: any) => void;
  hasPushedHistoryRef: React.MutableRefObject<boolean>;
  buildSvgPath: (points: Array<{ x: number; y: number }>) => string;
}

export const LayerItem = memo(function LayerItem({
  layer,
  isActive,
  onUpdateLayer,
  onLayerDragStart,
  onLayerTouchStart,
  setRotateState,
  setProportionalResizeState,
  setTopStretchState,
  setBottomStretchState,
  setLeftStretchState,
  setRightStretchState,
  hasPushedHistoryRef,
  buildSvgPath,
}: LayerItemProps) {
  if (layer.hidden) return null;

  const isTransparent =
    !layer.style.bgColor ||
    layer.style.bgColor === 'transparent' ||
    layer.style.bgColor === 'rgba(0,0,0,0)' ||
    layer.style.bgColor === 'rgba(0, 0, 0, 0)';

  const style = layer.style;
  const hasStroke = style.strokeWidth && style.strokeWidth > 0;
  const hasGradient =
    style.gradient &&
    style.gradient.enabled &&
    style.gradient.colors &&
    style.gradient.colors.length >= 2;

  let gradientCss = undefined;
  if (hasGradient && style.gradient) {
    gradientCss = `linear-gradient(${style.gradient.angle || 90}deg, ${style.gradient.colors.join(', ')})`;
  }

  const isArabicText = /[\u0600-\u06FF]/.test(layer.text);
  const safeLetterSpacing = isArabicText
    ? '0px'
    : !layer.style.letterSpacing ||
      layer.style.letterSpacing === '0px' ||
      parseFloat(layer.style.letterSpacing) === 0
    ? 'normal'
    : layer.style.letterSpacing;

  return (
    <div
      id={`layer-${layer.id}`}
      onMouseDown={e => onLayerDragStart(layer, e)}
      onTouchStart={e => onLayerTouchStart(layer, e)}
      style={{
        left: layer.left,
        top: layer.top,
        width: layer.width,
        height: layer.height,
        backgroundColor: isTransparent ? 'transparent' : layer.style.bgColor,
        transform: `rotate(${layer.angle || 0}deg) ${layer.flippedY ? 'scaleY(-1)' : ''}`,
        transformOrigin: 'center center',
        ...(isActive
          ? {
              border: layer.type === 'image' ? '2px solid #007acc' : '3px double #007acc',
              outline: '1px solid rgba(0, 122, 204, 0.4)',
              outlineOffset: '1px',
            }
          : {}),
      }}
      className={`absolute cursor-move flex items-center justify-center text-center p-0.5 border border-transparent z-10 box-border hover:border-gray-400/60 text-layer ${
        isActive ? 'z-30' : ''
      }`}
    >
      {layer.type === 'image' && layer.imageSrc && (
        <img
          src={layer.imageSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'fill',
            pointerEvents: 'none',
          }}
          alt="Overlay Layer"
        />
      )}

      {layer.type === 'path' && layer.pathPoints && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <path
            d={buildSvgPath(layer.pathPoints)}
            stroke={layer.strokeColor || '#000000'}
            strokeWidth={layer.strokeWidth || 3}
            fill={layer.fillColor || 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {(!layer.type || layer.type === 'text') && (
        <div
          style={{
            fontFamily: formatFontFamily(layer.style.fontFamily),
            color: hasGradient ? 'transparent' : layer.style.color,
            background: gradientCss,
            WebkitBackgroundClip: hasGradient ? 'text' : undefined,
            backgroundClip: hasGradient ? 'text' : undefined,
            fontSize: layer.style.fontSize,
            fontWeight: layer.style.fontWeight,
            fontStyle: layer.style.fontStyle,
            textDecoration: layer.style.textDecoration,
            textAlign: layer.style.textAlign,
            lineHeight: layer.style.lineHeight,
            letterSpacing: safeLetterSpacing,
            outline: 'none',
            backgroundColor: 'transparent',
            direction: 'rtl',
            unicodeBidi: 'plaintext',
            fontFeatureSettings: '"liga" 1, "calt" 1, "curs" 1',
            fontVariantLigatures: 'normal',
            textRendering: 'geometricPrecision',
            fontKerning: 'normal',
            wordBreak: 'keep-all',
            WebkitTextStroke: hasStroke
              ? `${style.strokeWidth}px ${style.strokeColor || '#ffffff'}`
              : undefined,
            paintOrder: hasStroke ? 'stroke fill' : undefined,
          }}
          contentEditable
          suppressContentEditableWarning
          onBlur={e => {
            onUpdateLayer(layer.id, { text: e.target.innerText });
          }}
          className="w-full h-full flex flex-col justify-center select-text whitespace-pre-wrap select-none overflow-hidden text-layer-inner"
        >
          {layer.text}
        </div>
      )}

      {isActive && (
        <>
          {/* مقبض التدوير 🔄 */}
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              const el = document.getElementById(`layer-${layer.id}`);
              if (!el) return;
              const rect = el.getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);

              hasPushedHistoryRef.current = false;

              setRotateState({
                layerId: layer.id,
                centerX: cx,
                centerY: cy,
                startAngle,
                initialLayerAngle: layer.angle || 0,
              });
            }}
            onTouchStart={e => {
              e.preventDefault();
              e.stopPropagation();
              const el = document.getElementById(`layer-${layer.id}`);
              if (!el) return;
              const rect = el.getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              const touch = e.touches[0];
              const startAngle = Math.atan2(touch.clientY - cy, touch.clientX - cx) * (180 / Math.PI);

              hasPushedHistoryRef.current = false;

              setRotateState({
                layerId: layer.id,
                centerX: cx,
                centerY: cy,
                startAngle,
                initialLayerAngle: layer.angle || 0,
              });
            }}
            style={{
              position: 'absolute',
              top: '-14px',
              right: '-14px',
            }}
            className="w-7 h-7 bg-white text-gray-800 border-2 border-neutral-800 rounded-full flex items-center justify-center text-sm shadow-md hover:scale-110 active:scale-95 transition-transform cursor-alias z-40 select-none"
            title="تدوير الطبقة بأي زاوية"
          >
            🔄
          </button>

          {/* مقابض التمديد والتكبير للأطراف */}
          {layer.type !== 'image' && (
            <>
              {/* تكبير متناسق بالزاوية */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const startFS = parseFloat(layer.style.fontSize) || 16;
                  hasPushedHistoryRef.current = false;

                  setProportionalResizeState({
                    layerId: layer.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    startWidth: parseFloat(layer.width) || 120,
                    startHeight: parseFloat(layer.height) || 80,
                    startLeft: parseFloat(layer.left) || 0,
                    startTop: parseFloat(layer.top) || 0,
                    startFS,
                  });
                }}
                onTouchStart={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const startFS = parseFloat(layer.style.fontSize) || 16;
                  hasPushedHistoryRef.current = false;
                  const touch = e.touches[0];

                  setProportionalResizeState({
                    layerId: layer.id,
                    startX: touch.clientX,
                    startY: touch.clientY,
                    startWidth: parseFloat(layer.width) || 120,
                    startHeight: parseFloat(layer.height) || 80,
                    startLeft: parseFloat(layer.left) || 0,
                    startTop: parseFloat(layer.top) || 0,
                    startFS,
                  });
                }}
                style={{
                  position: 'absolute',
                  bottom: '-14px',
                  right: '-14px',
                }}
                className="w-7 h-7 bg-white text-gray-800 border-2 border-neutral-800 rounded-full flex items-center justify-center text-sm shadow-md hover:scale-110 active:scale-95 transition-transform cursor-se-resize z-40 select-none"
                title="تكبير أو تصغير الصندوق بشكل متناسق"
              >
                ⤡
              </button>

              {/* مقبض تمديد للأعلى ↕️ */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  hasPushedHistoryRef.current = false;
                  setTopStretchState({
                    layerId: layer.id,
                    startY: e.clientY,
                    startHeight: parseFloat(layer.height) || 80,
                    startTop: parseFloat(layer.top) || 0,
                  });
                }}
                onTouchStart={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const touch = e.touches[0];
                  hasPushedHistoryRef.current = false;
                  setTopStretchState({
                    layerId: layer.id,
                    startY: touch.clientY,
                    startHeight: parseFloat(layer.height) || 80,
                    startTop: parseFloat(layer.top) || 0,
                  });
                }}
                onDoubleClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUpdateLayer(layer.id, { flippedY: !layer.flippedY });
                }}
                style={{
                  position: 'absolute',
                  top: '-24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
                className="w-6 h-6 bg-white text-gray-800 border border-neutral-600 rounded flex items-center justify-center text-[11px] shadow hover:scale-110 active:scale-90 transition-transform cursor-row-resize z-40 select-none"
                title="تمديد طول صندوق النص للأعلى (نقر مزدوج للعكس)"
              >
                ↕️
              </button>

              {/* مقبض تمديد للأسفل ↕️ */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  hasPushedHistoryRef.current = false;
                  setBottomStretchState({
                    layerId: layer.id,
                    startY: e.clientY,
                    startHeight: parseFloat(layer.height) || 80,
                    startTop: parseFloat(layer.top) || 0,
                  });
                }}
                onTouchStart={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const touch = e.touches[0];
                  hasPushedHistoryRef.current = false;
                  setBottomStretchState({
                    layerId: layer.id,
                    startY: touch.clientY,
                    startHeight: parseFloat(layer.height) || 80,
                    startTop: parseFloat(layer.top) || 0,
                  });
                }}
                style={{
                  position: 'absolute',
                  bottom: '-24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
                className="w-6 h-6 bg-white text-gray-800 border border-neutral-600 rounded flex items-center justify-center text-[11px] shadow hover:scale-110 active:scale-90 transition-transform cursor-row-resize z-40 select-none"
                title="تمديد ارتفاع صندوق النص لأسفل"
              >
                ↕️
              </button>

              {/* مقبض تمديد لليسار ↔️ */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  hasPushedHistoryRef.current = false;
                  setLeftStretchState({
                    layerId: layer.id,
                    startX: e.clientX,
                    startWidth: parseFloat(layer.width) || 120,
                    startLeft: parseFloat(layer.left) || 0,
                  });
                }}
                onTouchStart={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const touch = e.touches[0];
                  hasPushedHistoryRef.current = false;
                  setLeftStretchState({
                    layerId: layer.id,
                    startX: touch.clientX,
                    startWidth: parseFloat(layer.width) || 120,
                    startLeft: parseFloat(layer.left) || 0,
                  });
                }}
                style={{
                  position: 'absolute',
                  left: '-24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
                className="w-6 h-6 bg-white text-gray-800 border border-neutral-600 rounded flex items-center justify-center text-[11px] shadow hover:scale-110 active:scale-90 transition-transform cursor-col-resize z-40 select-none"
                title="تمديد عرض صندوق النص لليسار"
              >
                ↔️
              </button>

              {/* مقبض تمديد لليمين ↔️ */}
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  hasPushedHistoryRef.current = false;
                  setRightStretchState({
                    layerId: layer.id,
                    startX: e.clientX,
                    startWidth: parseFloat(layer.width) || 120,
                    startLeft: parseFloat(layer.left) || 0,
                  });
                }}
                onTouchStart={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const touch = e.touches[0];
                  hasPushedHistoryRef.current = false;
                  setRightStretchState({
                    layerId: layer.id,
                    startX: touch.clientX,
                    startWidth: parseFloat(layer.width) || 120,
                    startLeft: parseFloat(layer.left) || 0,
                  });
                }}
                style={{
                  position: 'absolute',
                  right: '-24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
                className="w-6 h-6 bg-white text-gray-800 border border-neutral-600 rounded flex items-center justify-center text-[11px] shadow hover:scale-110 active:scale-90 transition-transform cursor-col-resize z-40 select-none"
                title="تمديد عرض صندوق النص لليمين"
              >
                ↔️
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
});
