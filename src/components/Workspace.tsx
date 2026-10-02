import React, { useRef, useState, useEffect, useCallback } from 'react';
import { MangaLayer, TurboTypesetData, QuickPresetType } from '../types';
import { calculateOptimalFontSize } from '../utils';
import { LayerItem } from './workspace/LayerItem';

interface WorkspaceProps {
  mangaSrc: string;
  activeTool: 'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand' | 'pen';
  setActiveTool: (tool: 'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand' | 'pen') => void;
  wandDimensions: { imgW: number; imgH: number; dispW: number; dispH: number; x: number; y: number; w: number; h: number } | null;
  layers: MangaLayer[];
  activeLayer: MangaLayer | null;
  onSetActiveLayer: (layer: MangaLayer | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<MangaLayer>, saveToHistory?: boolean) => void;
  onAddSelectionBounds: (bounds: { left: number; top: number; width: number; height: number }) => void;
  onWandSelect: (clickX: number, clickY: number) => void;
  selectionBox: { left: number; top: number; width: number; height: number; visible: boolean } | null;
  setSelectionBox: React.Dispatch<React.SetStateAction<{ left: number; top: number; width: number; height: number; visible: boolean } | null>>;
  autoFitText: boolean;
  wandCanvasRef: React.RefObject<HTMLCanvasElement | null>;

  cleaningCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentPageCleaningDataUrl?: string;
  onUpdateCleaningDataUrl?: (url: string) => void;
  brushColor: string;
  brushSize: number;
  stampSource: { x: number; y: number } | null;
  setStampSource: (pos: { x: number; y: number } | null) => void;
  isSettingStampSource: boolean;
  setIsSettingStampSource: (val: boolean) => void;
  onColorPicked?: (color: string) => void;

  watermarkEnabled: boolean;
  watermarkType: 'text' | 'image';
  watermarkText: string;
  watermarkImage: string | null;
  watermarkOpacity: number;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkSize: number;
  onDuplicateLayer?: (layerId: string) => void;
  onSavePresetFromStyle?: (style: any) => void;

  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;

  onAddPenLayer?: (points: Array<{ x: number; y: number }>, isClosed: boolean) => void;
  onContentAwareFill?: () => void;

  // 🚀 ميزات التسريع الخارقة
  turboMode?: boolean;
  onToggleTurboMode?: () => void;
  onTurboTypeset?: (data: TurboTypesetData) => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onUndoGesture?: () => void;
  activeQuickPreset?: QuickPresetType;
  onSelectQuickPreset?: (preset: QuickPresetType) => void;
}

export const Workspace = React.memo(function Workspace({
  mangaSrc,
  activeTool,
  setActiveTool, 
  wandDimensions, 
  layers,
  activeLayer,
  onSetActiveLayer,
  onUpdateLayer,
  onAddSelectionBounds,
  onWandSelect,
  selectionBox,
  setSelectionBox,
  autoFitText,
  wandCanvasRef,

  cleaningCanvasRef,
  currentPageCleaningDataUrl,
  onUpdateCleaningDataUrl,
  brushColor,
  brushSize,
  stampSource,
  setStampSource,
  isSettingStampSource,
  setIsSettingStampSource,
  onColorPicked,

  watermarkEnabled,
  watermarkType,
  watermarkText,
  watermarkImage,
  watermarkOpacity,
  watermarkPosition,
  watermarkSize,
  onDuplicateLayer,
  onSavePresetFromStyle,

  zoom,
  setZoom,

  onAddPenLayer,
  onContentAwareFill,

  turboMode = false,
  onToggleTurboMode,
  onTurboTypeset,
  onNextPage,
  onPrevPage,
  onUndoGesture,
  activeQuickPreset = 'normal',
  onSelectQuickPreset,
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastDrawnUrlRef = useRef<string>('');

  const pendingUpdatesRef = useRef<{ layerId: string; updates: Partial<MangaLayer> } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const hasPushedHistoryRef = useRef<boolean>(false);

  const pendingZoomRef = useRef<number | null>(null);
  const zoomRafIdRef = useRef<number | null>(null);

  const pendingSelectionBoxRef = useRef<typeof selectionBox>(null);
  const selectionBoxRafIdRef = useRef<number | null>(null);

  const [guides, setGuides] = useState<{
    vertical: number | null;
    horizontal: number | null;
    bounds: { left: number; top: number; right: number; bottom: number } | null;
  }>({ vertical: null, horizontal: null, bounds: null });
  const pendingGuidesRef = useRef<typeof guides | null>(null);
  const guidesRafIdRef = useRef<number | null>(null);

  const twoFingerSwipeRef = useRef<{ startX: number; startY: number; startTime: number } | null>(null);

  const flushUpdates = useCallback(() => {
    if (pendingUpdatesRef.current) {
      onUpdateLayer(pendingUpdatesRef.current.layerId, pendingUpdatesRef.current.updates, false);
      pendingUpdatesRef.current = null;
    }
    rafIdRef.current = null;
  }, [onUpdateLayer]);

  const flushZoom = useCallback(() => {
    if (pendingZoomRef.current !== null) {
      setZoom(pendingZoomRef.current);
      pendingZoomRef.current = null;
    }
    zoomRafIdRef.current = null;
  }, [setZoom]);

  const flushSelectionBox = useCallback(() => {
    if (pendingSelectionBoxRef.current !== null) {
      setSelectionBox(pendingSelectionBoxRef.current);
      pendingSelectionBoxRef.current = null;
    }
    selectionBoxRafIdRef.current = null;
  }, [setSelectionBox]);

  const flushGuides = useCallback(() => {
    if (pendingGuidesRef.current !== null) {
      setGuides(pendingGuidesRef.current);
      pendingGuidesRef.current = null;
    }
    guidesRafIdRef.current = null;
  }, [setGuides]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (zoomRafIdRef.current !== null) cancelAnimationFrame(zoomRafIdRef.current);
      if (selectionBoxRafIdRef.current !== null) cancelAnimationFrame(selectionBoxRafIdRef.current);
      if (guidesRafIdRef.current !== null) cancelAnimationFrame(guidesRafIdRef.current);
    };
  }, []);

  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [dim, setDim] = useState<{ w: number; h: number }>({ w: 600, h: 800 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const [penPoints, setPenPoints] = useState<Array<{ x: number; y: number }>>([]);

  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number | null>(null);

  const [layerPinchState, setLayerPinchState] = useState<{
    layerId: string;
    initialDistX: number;
    initialDistY: number;
    initialDistTotal: number;
    startWidth: number;
    startHeight: number;
    startLeft: number;
    startTop: number;
    midX: number;
    midY: number;
  } | null>(null);

  const [dragState, setDragState] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    layerId: string;
    pos: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const [rotateState, setRotateState] = useState<{
    layerId: string;
    centerX: number;
    centerY: number;
    startAngle: number;
    initialLayerAngle: number;
  } | null>(null);

  const [proportionalResizeState, setProportionalResizeState] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startLeft: number;
    startTop: number;
    startFS: number;
  } | null>(null);

  const [topStretchState, setTopStretchState] = useState<{
    layerId: string;
    startY: number;
    startHeight: number;
    startTop: number;
  } | null>(null);

  const [bottomStretchState, setBottomStretchState] = useState<{
    layerId: string;
    startY: number;
    startHeight: number;
    startTop: number;
  } | null>(null);

  const [leftStretchState, setLeftStretchState] = useState<{
    layerId: string;
    startX: number;
    startWidth: number;
    startLeft: number;
  } | null>(null);

  const [rightStretchState, setRightStretchState] = useState<{
    layerId: string;
    startX: number;
    startWidth: number;
    startLeft: number;
  } | null>(null);

  const handleImageLoad = () => {
    const img = imageRef.current;
    
    const canvas = wandCanvasRef.current;
    if (img && canvas) {
      canvas.width = img.offsetWidth;
      canvas.height = img.offsetHeight;
      canvas.style.width = `${img.offsetWidth}px`;
      canvas.style.height = `${img.offsetHeight}px`;
    }

    if (img) {
      setDim({ w: img.offsetWidth || 600, h: img.offsetHeight || 800 });
    }

    const cleaningCanvas = cleaningCanvasRef.current;
    if (img && cleaningCanvas) {
      if (cleaningCanvas.width !== img.naturalWidth || cleaningCanvas.height !== img.naturalHeight) {
        cleaningCanvas.width = img.naturalWidth;
        cleaningCanvas.height = img.naturalHeight;
      }
      
      if (currentPageCleaningDataUrl !== lastDrawnUrlRef.current) {
        const ctx = cleaningCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, cleaningCanvas.width, cleaningCanvas.height);
          if (currentPageCleaningDataUrl) {
            const storedImg = new Image();
            storedImg.onload = () => {
              ctx.drawImage(storedImg, 0, 0);
            };
            storedImg.src = currentPageCleaningDataUrl;
          }
        }
        lastDrawnUrlRef.current = currentPageCleaningDataUrl || '';
      }
    }
  };

  useEffect(() => {
    handleImageLoad();
  }, [mangaSrc, currentPageCleaningDataUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = 0.1;
        setZoom(prev => {
          const next = e.deltaY < 0 ? prev + factor : prev - factor;
          return Math.max(0.1, Math.min(next, 4.0));
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [setZoom]);

  const buildSvgPath = (points: Array<{ x: number; y: number }>) => {
    if (!points || points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  const handleFinalizePenPath = (isClosed: boolean) => {
    if (penPoints.length < 2) return;
    if (onAddPenLayer) {
      onAddPenLayer(penPoints, isClosed);
    }
    setPenPoints([]);
  };

  const triggerWandSelectInternal = (clickX: number, clickY: number) => {
    const img = imageRef.current;
    if (!img || !img.naturalWidth) return;

    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;
    const px = Math.round(clickX * scaleX);
    const py = Math.round(clickY * scaleY);
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    if (px < 0 || px >= imgW || py < 0 || py >= imgH) return;

    onWandSelect(clickX, clickY);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStartNative = (e: TouchEvent) => {
      if (e.touches.length === 3) {
        if (e.cancelable) e.preventDefault();
        if (onUndoGesture) onUndoGesture();
        return;
      }

      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        twoFingerSwipeRef.current = {
          startX: (t1.clientX + t2.clientX) / 2,
          startY: (t1.clientY + t2.clientY) / 2,
          startTime: Date.now(),
        };

        if (activeLayer && activeLayer.type === 'image') {
          const wrapper = imageWrapperRef.current;
          if (wrapper) {
            const rect = wrapper.getBoundingClientRect();
            const touch1X = (t1.clientX - rect.left) / zoom;
            const touch1Y = (t1.clientY - rect.top) / zoom;
            const touch2X = (t2.clientX - rect.left) / zoom;
            const touch2Y = (t2.clientY - rect.top) / zoom;

            const layerLeft = parseFloat(activeLayer.left) || 0;
            const layerTop = parseFloat(activeLayer.top) || 0;
            const layerWidth = parseFloat(activeLayer.width) || 100;
            const layerHeight = parseFloat(activeLayer.height) || 100;

            const isInside = 
              (touch1X >= layerLeft - 40 && touch1X <= layerLeft + layerWidth + 40 && touch1Y >= layerTop - 40 && touch1Y <= layerTop + layerHeight + 40) ||
              (touch2X >= layerLeft - 40 && touch2X <= layerLeft + layerWidth + 40 && touch2Y >= layerTop - 40 && touch2Y <= layerTop + layerHeight + 40);

            if (isInside) {
              if (e.cancelable) e.preventDefault();
              hasPushedHistoryRef.current = false;

              const distX = Math.abs(t1.clientX - t2.clientX);
              const distY = Math.abs(t1.clientY - t2.clientY);
              const totalDist = Math.sqrt(distX * distX + distY * distY);

              setLayerPinchState({
                layerId: activeLayer.id,
                initialDistX: Math.max(10, distX),
                initialDistY: Math.max(10, distY),
                initialDistTotal: Math.max(10, totalDist),
                startWidth: layerWidth,
                startHeight: layerHeight,
                startLeft: layerLeft,
                startTop: layerTop,
                midX: (t1.clientX + t2.clientX) / 2,
                midY: (t1.clientY + t2.clientY) / 2,
              });
              return;
            }
          }
        }

        setIsPanning(true);
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        
        setPanStart({
          x: midX,
          y: midY,
          scrollLeft: container.scrollLeft || 0,
          scrollTop: container.scrollTop || 0,
        });

        const dist = Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);
        initialPinchDistRef.current = dist;
        initialZoomRef.current = zoom;
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const target = e.target as HTMLElement;

        if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('button')) {
          return;
        }

        if (activeTool === 'hand' || activeTool === 'zoom') {
          setIsPanning(true);
          setPanStart({
            x: touch.clientX,
            y: touch.clientY,
            scrollLeft: container.scrollLeft || 0,
            scrollTop: container.scrollTop || 0,
          });
          return;
        }

        if (e.cancelable) e.preventDefault();

        const wrapper = imageWrapperRef.current;
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        const clickX = (touch.clientX - rect.left) / zoom;
        const clickY = (touch.clientY - rect.top) / zoom;

        if (activeTool === 'pen') {
          setPenPoints(prev => [...prev, { x: clickX, y: clickY }]);
          return;
        }

        if (activeTool === 'magic_wand' || turboMode) {
          triggerWandSelectInternal(clickX, clickY);
          return;
        }

        if (activeTool === 'marquee') {
          setIsDrawing(true);
          setStartPos({ x: clickX, y: clickY });
          
          pendingSelectionBoxRef.current = {
            left: clickX,
            top: clickY,
            width: 0,
            height: 0,
            visible: true,
          };
          if (selectionBoxRafIdRef.current === null) {
            selectionBoxRafIdRef.current = requestAnimationFrame(flushSelectionBox);
          }
          return;
        }

        const drawingTools = ['brush', 'eraser', 'clone_stamp', 'color_picker'];
        if (drawingTools.includes(activeTool)) {
          const img = imageRef.current;
          if (!img) return;
          const scaleX = img.naturalWidth / img.offsetWidth;
          const scaleY = img.naturalHeight / img.offsetHeight;
          const natX = clickX * scaleX;
          const natY = clickY * scaleY;

          if (activeTool === 'color_picker') {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 1;
            tempCanvas.height = 1;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCtx.drawImage(img, natX, natY, 1, 1, 0, 0, 1, 1);
              const pixelData = tempCtx.getImageData(0, 0, 1, 1).data;
              const hex = "#" + ((1 << 24) + (pixelData[0] << 16) + (pixelData[1] << 8) + pixelData[2]).toString(16).slice(1);
              if (onColorPicked) onColorPicked(hex);
            }
            return;
          }

          if (activeTool === 'clone_stamp' && isSettingStampSource) {
            setStampSource({ x: natX, y: natY });
            setIsSettingStampSource(false);
            return;
          }

          setIsDrawing(true);
          setStartPos({ x: clickX, y: clickY });

          const canvas = cleaningCanvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.beginPath();
              ctx.moveTo(natX, natY);

              if (activeTool === 'brush') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = brushColor;
                ctx.lineWidth = brushSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineTo(natX, natY);
                ctx.stroke();
              } else if (activeTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
                ctx.lineWidth = brushSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineTo(natX, natY);
                ctx.stroke();
              } else if (activeTool === 'clone_stamp' && stampSource) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(natX, natY, brushSize / 2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(
                  img,
                  stampSource.x - brushSize / 2,
                  stampSource.y - brushSize / 2,
                  brushSize,
                  brushSize,
                  natX - brushSize / 2,
                  natY - brushSize / 2,
                  brushSize,
                  brushSize
                );
                ctx.restore();
              }
            }
          }
        }
      }
    };

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (layerPinchState && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const currentDistTotal = Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);
        const scale = currentDistTotal / layerPinchState.initialDistTotal;

        const currentMidX = (t1.clientX + t2.clientX) / 2;
        const currentMidY = (t1.clientY + t2.clientY) / 2;
        const dx = (currentMidX - layerPinchState.midX) / zoom;
        const dy = (currentMidY - layerPinchState.midY) / zoom;

        let newW = Math.round(layerPinchState.startWidth * scale);
        let newH = Math.round(layerPinchState.startHeight * scale);

        const widthDiff = newW - layerPinchState.startWidth;
        const heightDiff = newH - layerPinchState.startHeight;
        let newLeft = Math.round(layerPinchState.startLeft - widthDiff / 2 + dx);
        let newTop = Math.round(layerPinchState.startTop - heightDiff / 2 + dy);

        const SNAP_THRESHOLD = 14;

        if (newLeft <= SNAP_THRESHOLD && newLeft + newW >= dim.w - SNAP_THRESHOLD) {
          newLeft = 0;
          newW = dim.w;
        } else {
          if (newLeft < 0) newLeft = 0;
          if (newLeft + newW > dim.w) {
            newW = Math.min(newW, dim.w);
            if (newLeft + newW > dim.w) newLeft = Math.max(0, dim.w - newW);
          }
        }

        if (newTop <= SNAP_THRESHOLD && newTop + newH >= dim.h - SNAP_THRESHOLD) {
          newTop = 0;
          newH = dim.h;
        } else {
          if (newTop < 0) newTop = 0;
          if (newTop + newH > dim.h) {
            newH = Math.min(newH, dim.h);
            if (newTop + newH > dim.h) newTop = Math.max(0, dim.h - newH);
          }
        }

        if (!hasPushedHistoryRef.current) {
          onUpdateLayer(layerPinchState.layerId, {}, true);
          hasPushedHistoryRef.current = true;
        }

        pendingUpdatesRef.current = {
          layerId: layerPinchState.layerId,
          updates: {
            width: `${newW}px`,
            height: `${newH}px`,
            left: `${newLeft}px`,
            top: `${newTop}px`,
          }
        };
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(flushUpdates);
        }
        return;
      }

      if (isPanning && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        const dx = midX - panStart.x;
        const dy = midY - panStart.y;
        container.scrollLeft = panStart.scrollLeft - dx;
        container.scrollTop = panStart.scrollTop - dy;

        if (initialPinchDistRef.current && initialZoomRef.current) {
          const dist = Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);
          const factor = dist / initialPinchDistRef.current;
          const nextZoom = Math.max(0.15, Math.min(initialZoomRef.current * factor, 4.0));
          
          pendingZoomRef.current = nextZoom;
          if (zoomRafIdRef.current === null) {
            zoomRafIdRef.current = requestAnimationFrame(flushZoom);
          }
        }
        return;
      }

      if (isPanning && (activeTool === 'hand' || activeTool === 'zoom') && e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - panStart.x;
        const dy = touch.clientY - panStart.y;
        container.scrollLeft = panStart.scrollLeft - dx;
        container.scrollTop = panStart.scrollTop - dy;
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];

        if (isDrawing || dragState || proportionalResizeState || rotateState || topStretchState || bottomStretchState || leftStretchState || rightStretchState || resizeState) {
          if (e.cancelable) e.preventDefault();
        }

        if (isDrawing && activeTool === 'marquee' && selectionBox) {
          const wrapper = imageWrapperRef.current;
          if (!wrapper) return;
          const rect = wrapper.getBoundingClientRect();
          const clickX = (touch.clientX - rect.left) / zoom;
          const clickY = (touch.clientY - rect.top) / zoom;

          const left = Math.min(startPos.x, clickX);
          const top = Math.min(startPos.y, clickY); 
          const width = Math.abs(clickX - startPos.x);
          const height = Math.abs(clickY - startPos.y); 

          pendingSelectionBoxRef.current = {
            left,
            top,
            width,
            height,
            visible: true,
          };
          if (selectionBoxRafIdRef.current === null) {
            selectionBoxRafIdRef.current = requestAnimationFrame(flushSelectionBox);
          }
          return;
        }

        if (isDrawing && ['brush', 'eraser', 'clone_stamp'].includes(activeTool)) {
          const wrapper = imageWrapperRef.current;
          if (!wrapper) return;
          const rect = wrapper.getBoundingClientRect();
          const clickX = (touch.clientX - rect.left) / zoom;
          const clickY = (touch.clientY - rect.top) / zoom;

          const img = imageRef.current;
          if (!img) return;
          const scaleX = img.naturalWidth / img.offsetWidth;
          const scaleY = img.naturalHeight / img.offsetHeight;
          const natX = clickX * scaleX;
          const natY = clickY * scaleY;

          const canvas = cleaningCanvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              if (activeTool === 'brush') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = brushColor;
                ctx.lineWidth = brushSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineTo(natX, natY);
                ctx.stroke();
              } else if (activeTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
                ctx.lineWidth = brushSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineTo(natX, natY);
                ctx.stroke();
              } else if (activeTool === 'clone_stamp' && stampSource) {
                const startNatX = startPos.x * scaleX;
                const startNatY = startPos.y * scaleY;
                const dx = natX - startNatX;
                const dy = natY - startNatY;
                const srcCurrX = stampSource.x + dx;
                const srcCurrY = stampSource.y + dy;

                ctx.save();
                ctx.beginPath();
                ctx.arc(natX, natY, brushSize / 2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(
                  img,
                  stampSource.x - brushSize / 2,
                  stampSource.y - brushSize / 2,
                  brushSize,
                  brushSize,
                  natX - brushSize / 2,
                  natY - brushSize / 2,
                  brushSize,
                  brushSize
                );
                ctx.restore();
              }
            }
          }
          return;
        }

        if (dragState) {
          let dx = (touch.clientX - dragState.startX) / zoom;
          let dy = (touch.clientY - dragState.startY) / zoom;
          let newLeft = dragState.startLeft + dx;
          let newTop = dragState.startTop + dy;

          const currentL = layers.find(l => l.id === dragState.layerId);
          const layerWidth = parseFloat(currentL?.width || '120') || 120;
          const layerHeight = parseFloat(currentL?.height || '80') || 80;

          if (currentL?.type === 'image') {
            newLeft = Math.max(0, Math.min(newLeft, dim.w - layerWidth));
            newTop = Math.max(0, Math.min(newTop, dim.h - layerHeight));
          }

          if (wandDimensions && activeLayer && activeLayer.id === dragState.layerId) {
            const dsx = wandDimensions.dispW / wandDimensions.imgW;
            const dsy = wandDimensions.dispH / wandDimensions.imgH;
            const bubbleLeft = wandDimensions.x * dsx;
            const bubbleTop = wandDimensions.y * dsy;
            const bubbleWidth = wandDimensions.w * dsx;
            const bubbleHeight = wandDimensions.h * dsy;
            const bubbleCenterX = bubbleLeft + bubbleWidth / 2;
            const bubbleCenterY = bubbleTop + bubbleHeight / 2;

            const snapThreshold = 6;
            let snapX: number | null = null;
            let snapY: number | null = null;

            const proposedCenterX = newLeft + layerWidth / 2;
            const proposedCenterY = newTop + layerHeight / 2;

            if (Math.abs(proposedCenterX - bubbleCenterX) < snapThreshold) {
              newLeft = bubbleCenterX - layerWidth / 2;
              snapX = bubbleCenterX;
            }
            if (Math.abs(proposedCenterY - bubbleCenterY) < snapThreshold) {
              newTop = bubbleCenterY - layerHeight / 2;
              snapY = bubbleCenterY;
            }

            pendingGuidesRef.current = {
              vertical: snapX,
              horizontal: snapY,
              bounds: {
                left: bubbleLeft,
                top: bubbleTop,
                right: bubbleLeft + bubbleWidth,
                bottom: bubbleTop + bubbleHeight
              }
            };
            if (guidesRafIdRef.current === null) {
              guidesRafIdRef.current = requestAnimationFrame(flushGuides);
            }
          }

          if (!hasPushedHistoryRef.current) {
            onUpdateLayer(dragState.layerId, {}, true);
            hasPushedHistoryRef.current = true;
          }

          pendingUpdatesRef.current = {
            layerId: dragState.layerId,
            updates: {
              left: `${newLeft}px`,
              top: `${newTop}px`,
            }
          };
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(flushUpdates);
          }
          return;
        }

        if (resizeState) {
          const dx = (touch.clientX - resizeState.startX) / zoom;
          const dy = (touch.clientY - resizeState.startY) / zoom;
          let newW = resizeState.startWidth;
          let newH = resizeState.startHeight;
          let newLeft = resizeState.startLeft;
          let newTop = resizeState.startTop;
          const MIN_SIZE = 25;

          const pos = resizeState.pos;
          if (pos.includes('e')) newW = Math.max(MIN_SIZE, resizeState.startWidth + dx);
          if (pos.includes('s')) newH = Math.max(MIN_SIZE, resizeState.startHeight + dy);
          if (pos.includes('w')) {
            newW = Math.max(MIN_SIZE, resizeState.startWidth - dx);
            newLeft = resizeState.startLeft + (resizeState.startWidth - newW);
          }
          if (pos.includes('n')) {
            newH = Math.max(MIN_SIZE, resizeState.startHeight - dy);
            newTop = resizeState.startTop + (resizeState.startHeight - newH);
          }

          newLeft = Math.max(0, newLeft);
          newTop = Math.max(0, newTop);
          if (newLeft + newW > dim.w) newW = Math.max(MIN_SIZE, dim.w - newLeft);
          if (newTop + newH > dim.h) newH = Math.max(MIN_SIZE, dim.h - newTop);

          const layer = layers.find(l => l.id === resizeState.layerId);
          const updates: Partial<MangaLayer> = {
            width: `${newW}px`,
            height: `${newH}px`,
            left: `${newLeft}px`,
            top: `${newTop}px`,
          };

          if (layer && autoFitText) {
            const fontSz = calculateOptimalFontSize(
              layer.text,
              newW,
              newH,
              layer.style.fontFamily,
              layer.style.lineHeight,
              parseFloat(layer.style.letterSpacing) || 0
            );
            updates.style = {
              ...layer.style,
              fontSize: `${fontSz}px`,
            };
          }

          if (!hasPushedHistoryRef.current) {
            onUpdateLayer(resizeState.layerId, {}, true);
            hasPushedHistoryRef.current = true;
          }

          pendingUpdatesRef.current = {
            layerId: resizeState.layerId,
            updates: updates
          };
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(flushUpdates);
          }
          return;
        }

        if (proportionalResizeState) {
          const dx = (touch.clientX - proportionalResizeState.startX) / zoom;
          const scale = Math.max(0.1, 1 + (dx / proportionalResizeState.startWidth));
          
          let newW = Math.max(20, Math.round(proportionalResizeState.startWidth * scale));
          const layer = layers.find(l => l.id === proportionalResizeState.layerId);
          
          if (layer) {
            const aspectRatio = proportionalResizeState.startHeight / proportionalResizeState.startWidth;

            if (layer.type === 'image') {
              const maxAllowedW = dim.w - proportionalResizeState.startLeft;
              const maxAllowedH = dim.h - proportionalResizeState.startTop;
              newW = Math.min(newW, maxAllowedW, dim.w);
              if (newW * aspectRatio > maxAllowedH) {
                newW = Math.max(20, Math.round(maxAllowedH / aspectRatio));
              }
            } else {
              const maxAllowedW = dim.w - proportionalResizeState.startLeft;
              newW = Math.min(newW, maxAllowedW);
            }

            const newH = Math.max(20, Math.round(newW * aspectRatio));
            const newFS = Math.max(8, Math.round(proportionalResizeState.startFS * (newW / proportionalResizeState.startWidth)));

            if (!hasPushedHistoryRef.current) {
              onUpdateLayer(proportionalResizeState.layerId, {}, true);
              hasPushedHistoryRef.current = true;
            }

            pendingUpdatesRef.current = {
              layerId: proportionalResizeState.layerId,
              updates: {
                width: `${newW}px`,
                height: `${newH}px`,
                style: {
                  ...layer.style,
                  fontSize: `${newFS}px`
                }
              }
            };
            if (rafIdRef.current === null) {
              rafIdRef.current = requestAnimationFrame(flushUpdates);
            }
          }
          return;
        }

        if (topStretchState) {
          const dy = (touch.clientY - topStretchState.startY) / zoom;
          let newTop = Math.round(topStretchState.startTop + dy);
          if (newTop < 0) newTop = 0;
          const newH = Math.max(25, Math.round(topStretchState.startTop + topStretchState.startHeight - newTop));

          const layer = layers.find(l => l.id === topStretchState.layerId);
          const updates: Partial<MangaLayer> = { height: `${newH}px`, top: `${newTop}px` };

          if (layer && autoFitText) {
            const fontSz = calculateOptimalFontSize(
              layer.text,
              parseFloat(layer.width) || 120,
              newH,
              layer.style.fontFamily,
              layer.style.lineHeight,
              parseFloat(layer.style.letterSpacing) || 0
            );
            updates.style = { ...layer.style, fontSize: `${fontSz}px` };
          }

          if (!hasPushedHistoryRef.current) {
            onUpdateLayer(topStretchState.layerId, {}, true);
            hasPushedHistoryRef.current = true;
          }

          pendingUpdatesRef.current = { layerId: topStretchState.layerId, updates };
          if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flushUpdates);
          return;
        }

        if (bottomStretchState) {
          const dy = (touch.clientY - bottomStretchState.startY) / zoom;
          let newH = Math.max(25, Math.round(bottomStretchState.startHeight + dy));
          const maxAllowedH = dim.h - bottomStretchState.startTop;
          newH = Math.min(newH, maxAllowedH);

          const layer = layers.find(l => l.id === bottomStretchState.layerId);
          const updates: Partial<MangaLayer> = { height: `${newH}px` };

          if (layer && autoFitText) {
            const fontSz = calculateOptimalFontSize(
              layer.text,
              parseFloat(layer.width) || 120,
              newH,
              layer.style.fontFamily,
              layer.style.lineHeight,
              parseFloat(layer.style.letterSpacing) || 0
            );
            updates.style = { ...layer.style, fontSize: `${fontSz}px` };
          }

          if (!hasPushedHistoryRef.current) {
            onUpdateLayer(bottomStretchState.layerId, {}, true);
            hasPushedHistoryRef.current = true;
          }

          pendingUpdatesRef.current = { layerId: bottomStretchState.layerId, updates };
          if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flushUpdates);
          return;
        }

        if (leftStretchState) {
          const dx = (touch.clientX - leftStretchState.startX) / zoom;
          let newLeft = Math.round(leftStretchState.startLeft + dx);
          if (newLeft < 0) newLeft = 0;
          const newW = Math.max(25, Math.round(leftStretchState.startLeft + leftStretchState.startWidth - newLeft));

          if (!hasPushedHistoryRef.current) {
            onUpdateLayer(leftStretchState.layerId, {}, true);
            hasPushedHistoryRef.current = true;
          }

          pendingUpdatesRef.current = {
            layerId: leftStretchState.layerId,
            updates: { width: `${newW}px`, left: `${newLeft}px` }
          };
          if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flushUpdates);
          return;
        }

        if (rightStretchState) {
          const dx = (touch.clientX - rightStretchState.startX) / zoom;
          let newW = Math.max(25, Math.round(rightStretchState.startWidth + dx));
          const maxAllowedW = dim.w - rightStretchState.startLeft;
          newW = Math.min(newW, maxAllowedW);

          if (!hasPushedHistoryRef.current) {
            onUpdateLayer(rightStretchState.layerId, {}, true);
            hasPushedHistoryRef.current = true;
          }

          pendingUpdatesRef.current = { layerId: rightStretchState.layerId, updates: { width: `${newW}px` } };
          if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flushUpdates);
          return;
        }

        if (rotateState) {
          const currentAngle = Math.atan2(touch.clientY - rotateState.centerY, touch.clientX - rotateState.centerX) * (180 / Math.PI);
          const dAngle = currentAngle - rotateState.startAngle;
          const finalAngle = Math.round((rotateState.initialLayerAngle + dAngle) % 360);

          if (!hasPushedHistoryRef.current) {
            onUpdateLayer(rotateState.layerId, {}, true);
            hasPushedHistoryRef.current = true;
          }

          pendingUpdatesRef.current = {
            layerId: rotateState.layerId,
            updates: { angle: finalAngle }
          };
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(flushUpdates);
          }
          return;
        }
      }
    };

    const handleTouchEndNative = (e: TouchEvent) => {
      if (twoFingerSwipeRef.current && e.touches.length === 0) {
        const endTime = Date.now();
        const duration = endTime - twoFingerSwipeRef.current.startTime;

        if (duration < 450) {
          const changedTouch = e.changedTouches[0];
          if (changedTouch) {
            const dx = changedTouch.clientX - twoFingerSwipeRef.current.startX;
            const dy = changedTouch.clientY - twoFingerSwipeRef.current.startY;

            if (Math.abs(dx) > 85 && Math.abs(dy) < 70) {
              if (dx < 0 && onNextPage) {
                onNextPage();
              } else if (dx > 0 && onPrevPage) {
                onPrevPage();
              }
            }
          }
        }
        twoFingerSwipeRef.current = null;
      }

      handleMouseUp();
      setLayerPinchState(null);
      initialPinchDistRef.current = null;
      initialZoomRef.current = null;
    };

    container.addEventListener('touchstart', handleTouchStartNative, { passive: false });
    container.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    container.addEventListener('touchend', handleTouchEndNative, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStartNative);
      container.removeEventListener('touchmove', handleTouchMoveNative);
      container.removeEventListener('touchend', handleTouchEndNative);
    };
  }, [
    activeTool,
    zoom,
    brushColor,
    brushSize,
    stampSource,
    isPanning,
    panStart,
    isDrawing,
    startPos,
    dragState,
    layerPinchState,
    proportionalResizeState,
    rotateState,
    topStretchState,
    bottomStretchState,
    leftStretchState,
    rightStretchState,
    resizeState,
    layers,
    activeLayer,
    wandDimensions,
    dim,
    turboMode,
    onUndoGesture,
    onNextPage,
    onPrevPage,
    flushUpdates,
    flushZoom,
    flushSelectionBox,
    flushGuides
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'zoom') {
      e.preventDefault();
      const zoomFactor = 0.25;
      if (e.altKey || e.shiftKey) {
        setZoom(prev => Math.max(0.1, prev - zoomFactor));
      } else {
        setZoom(prev => Math.min(4.0, prev + zoomFactor));
      }
      return;
    }

    if (activeTool === 'hand' || e.button === 1) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current?.scrollLeft || 0,
        scrollTop: containerRef.current?.scrollTop || 0,
      });
      return;
    }

    const wrapper = imageWrapperRef.current;
    if (!wrapper || e.button !== 0) return;

    const img = imageRef.current;
    if (!img) return;

    const rect = wrapper.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;

    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;
    const natX = clickX * scaleX;
    const natY = clickY * scaleY;

    if (activeTool === 'pen') {
      e.preventDefault();
      setPenPoints(prev => [...prev, { x: clickX, y: clickY }]);
      return;
    }

    if (activeTool === 'clone_stamp' && isSettingStampSource) {
      setStampSource({ x: natX, y: natY });
      setIsSettingStampSource(false);
      return;
    }

    if (activeTool === 'color_picker') {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 1;
      tempCanvas.height = 1;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, natX, natY, 1, 1, 0, 0, 1, 1);
        const pixelData = tempCtx.getImageData(0, 0, 1, 1).data;
        const hex = "#" + ((1 << 24) + (pixelData[0] << 16) + (pixelData[1] << 8) + pixelData[2]).toString(16).slice(1);
        if (onColorPicked) onColorPicked(hex);
      }
      return;
    }

    if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'clone_stamp') {
      setIsDrawing(true);
      setStartPos({ x: clickX, y: clickY });

      const canvas = cleaningCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.beginPath();
          ctx.moveTo(natX, natY);

          if (activeTool === 'brush') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineTo(natX, natY);
            ctx.stroke();
          } else if (activeTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineTo(natX, natY);
            ctx.stroke();
          } else if (activeTool === 'clone_stamp' && stampSource) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(natX, natY, brushSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
              img,
              stampSource.x - brushSize / 2,
              stampSource.y - brushSize / 2,
              brushSize,
              brushSize,
              natX - brushSize / 2,
              natY - brushSize / 2,
              brushSize,
              brushSize
            );
            ctx.restore();
          }
        }
      }
      return;
    }

    const target = e.target as HTMLElement;
    if (target !== imageRef.current && target !== wrapper && !target.classList.contains('selection-box-bg')) {
      return;
    }

    if (activeTool === 'magic_wand' || turboMode) {
      triggerWandSelectInternal(clickX, clickY);
    } else {
      setIsDrawing(true);
      setStartPos({ x: clickX, y: clickY });
      
      pendingSelectionBoxRef.current = {
        left: clickX,
        top: clickY,
        width: 0,
        height: 0,
        visible: true,
      };
      if (selectionBoxRafIdRef.current === null) {
        selectionBoxRafIdRef.current = requestAnimationFrame(flushSelectionBox);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && containerRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.scrollLeft = panStart.scrollLeft - dx;
      containerRef.current.scrollTop = panStart.scrollTop - dy;
      return;
    }

    const wrapper = imageWrapperRef.current;
    if (!wrapper) return;

    if (isDrawing && (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'clone_stamp')) {
      const rect = wrapper.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / zoom;
      const clickY = (e.clientY - rect.top) / zoom;

      const img = imageRef.current;
      if (!img) return;
      const scaleX = img.naturalWidth / img.offsetWidth;
      const scaleY = img.naturalHeight / img.offsetHeight;
      const natX = clickX * scaleX;
      const natY = clickY * scaleY;

      const canvas = cleaningCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (activeTool === 'brush') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineTo(natX, natY);
            ctx.stroke();
          } else if (activeTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineTo(natX, natY);
            ctx.stroke();
          } else if (activeTool === 'clone_stamp' && stampSource) {
            const startNatX = startPos.x * scaleX;
            const startNatY = startPos.y * scaleY;
            const dx = natX - startNatX;
            const dy = natY - startNatY;
            const srcCurrX = stampSource.x + dx;
            const srcCurrY = stampSource.y + dy;

            ctx.save();
            ctx.beginPath();
            ctx.arc(natX, natY, brushSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
              img,
              srcCurrX - brushSize / 2,
              srcCurrY - brushSize / 2,
              brushSize,
              brushSize,
              natX - brushSize / 2,
              natY - brushSize / 2,
              brushSize,
              brushSize
            );
            ctx.restore();
          }
        }
      }
      return;
    }

    if (isDrawing && selectionBox) {
      const rect = wrapper.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / zoom;
      const currentY = (e.clientY - rect.top) / zoom;

      const left = Math.min(startPos.x, currentX);
      const top = Math.min(startPos.y, currentY);
      const width = Math.abs(currentX - startPos.x);
      const height = Math.abs(currentY - startPos.y);

      pendingSelectionBoxRef.current = {
        left,
        top,
        width,
        height,
        visible: true,
      };
      if (selectionBoxRafIdRef.current === null) {
        selectionBoxRafIdRef.current = requestAnimationFrame(flushSelectionBox);
      }
    } else if (dragState) {
      let dx = (e.clientX - dragState.startX) / zoom;
      let dy = (e.clientY - dragState.startY) / zoom;
      let newLeft = dragState.startLeft + dx;
      let newTop = dragState.startTop + dy;

      const currentL = layers.find(l => l.id === dragState.layerId);
      const layerWidth = parseFloat(currentL?.width || '120') || 120;
      const layerHeight = parseFloat(currentL?.height || '80') || 80;

      if (currentL?.type === 'image') {
        newLeft = Math.max(0, Math.min(newLeft, dim.w - layerWidth));
        newTop = Math.max(0, Math.min(newTop, dim.h - layerHeight));
      }

      if (wandDimensions && activeLayer && activeLayer.id === dragState.layerId) {
        const dsx = wandDimensions.dispW / wandDimensions.imgW;
        const dsy = wandDimensions.dispH / wandDimensions.imgH;
        const bubbleLeft = wandDimensions.x * dsx;
        const bubbleTop = wandDimensions.y * dsy;
        const bubbleWidth = wandDimensions.w * dsx;
        const bubbleHeight = wandDimensions.h * dsy;
        const bubbleCenterX = bubbleLeft + bubbleWidth / 2;
        const bubbleCenterY = bubbleTop + bubbleHeight / 2;

        const snapThreshold = 6;
        let snapX: number | null = null;
        let snapY: number | null = null;

        const proposedCenterX = newLeft + layerWidth / 2;
        const proposedCenterY = newTop + layerHeight / 2;

        if (Math.abs(proposedCenterX - bubbleCenterX) < snapThreshold) {
          newLeft = bubbleCenterX - layerWidth / 2;
          snapX = bubbleCenterX;
        }
        if (Math.abs(proposedCenterY - bubbleCenterY) < snapThreshold) {
          newTop = bubbleCenterY - layerHeight / 2;
          snapY = bubbleCenterY;
        }

        pendingGuidesRef.current = {
          vertical: snapX,
          horizontal: snapY,
          bounds: {
            left: bubbleLeft,
            top: bubbleTop,
            right: bubbleLeft + bubbleWidth,
            bottom: bubbleTop + bubbleHeight
          }
        };
        if (guidesRafIdRef.current === null) {
          guidesRafIdRef.current = requestAnimationFrame(flushGuides);
        }
      }

      if (!hasPushedHistoryRef.current) {
        onUpdateLayer(dragState.layerId, {}, true);
        hasPushedHistoryRef.current = true;
      }

      pendingUpdatesRef.current = {
        layerId: dragState.layerId,
        updates: {
          left: `${newLeft}px`,
          top: `${newTop}px`,
        }
      };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushUpdates);
      }
    } else if (resizeState) {
      const dx = (e.clientX - resizeState.startX) / zoom;
      const dy = (e.clientY - resizeState.startY) / zoom;
      let newW = resizeState.startWidth;
      let newH = resizeState.startHeight;
      let newLeft = resizeState.startLeft;
      let newTop = resizeState.startTop;
      const MIN_SIZE = 25;

      const pos = resizeState.pos;
      if (pos.includes('e')) newW = Math.max(MIN_SIZE, resizeState.startWidth + dx);
      if (pos.includes('s')) newH = Math.max(MIN_SIZE, resizeState.startHeight + dy);
      if (pos.includes('w')) {
        newW = Math.max(MIN_SIZE, resizeState.startWidth - dx);
        newLeft = resizeState.startLeft + (resizeState.startWidth - newW);
      }
      if (pos.includes('n')) {
        newH = Math.max(MIN_SIZE, resizeState.startHeight - dy);
        newTop = resizeState.startTop + (resizeState.startHeight - newH);
      }

      newLeft = Math.max(0, newLeft);
      newTop = Math.max(0, newTop);
      if (newLeft + newW > dim.w) newW = Math.max(MIN_SIZE, dim.w - newLeft);
      if (newTop + newH > dim.h) newH = Math.max(MIN_SIZE, dim.h - newTop);

      const layer = layers.find(l => l.id === resizeState.layerId);
      const updates: Partial<MangaLayer> = {
        width: `${newW}px`,
        height: `${newH}px`,
        left: `${newLeft}px`,
        top: `${newTop}px`,
      };

      if (layer && autoFitText) {
        const fontSz = calculateOptimalFontSize(
          layer.text,
          newW,
          newH,
          layer.style.fontFamily,
          layer.style.lineHeight,
          parseFloat(layer.style.letterSpacing) || 0
        );
        updates.style = {
          ...layer.style,
          fontSize: `${fontSz}px`,
        };
      }

      if (!hasPushedHistoryRef.current) {
        onUpdateLayer(resizeState.layerId, {}, true);
        hasPushedHistoryRef.current = true;
      }

      pendingUpdatesRef.current = {
        layerId: resizeState.layerId,
        updates: updates
      };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushUpdates);
      }
    } else if (rotateState) {
      const currentAngle = Math.atan2(e.clientY - rotateState.centerY, e.clientX - rotateState.centerX) * (180 / Math.PI);
      const dAngle = currentAngle - rotateState.startAngle;
      const finalAngle = Math.round((rotateState.initialLayerAngle + dAngle) % 360);

      if (!hasPushedHistoryRef.current) {
        onUpdateLayer(rotateState.layerId, {}, true);
        hasPushedHistoryRef.current = true;
      }

      pendingUpdatesRef.current = {
        layerId: rotateState.layerId,
        updates: { angle: finalAngle }
      };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushUpdates);
      }
    } else if (proportionalResizeState) {
      const dx = (e.clientX - proportionalResizeState.startX) / zoom;
      const scale = Math.max(0.1, 1 + (dx / proportionalResizeState.startWidth));
      
      let newW = Math.max(20, Math.round(proportionalResizeState.startWidth * scale));
      const layer = layers.find(l => l.id === proportionalResizeState.layerId);
      
      if (layer) {
        const aspectRatio = proportionalResizeState.startHeight / proportionalResizeState.startWidth;

        if (layer.type === 'image') {
          const maxAllowedW = dim.w - proportionalResizeState.startLeft;
          const maxAllowedH = dim.h - proportionalResizeState.startTop;
          newW = Math.min(newW, maxAllowedW, dim.w);
          if (newW * aspectRatio > maxAllowedH) {
            newW = Math.max(20, Math.round(maxAllowedH / aspectRatio));
          }
        } else {
          const maxAllowedW = dim.w - proportionalResizeState.startLeft;
          newW = Math.min(newW, maxAllowedW);
        }

        const newH = Math.max(20, Math.round(newW * aspectRatio));
        const newFS = Math.max(8, Math.round(proportionalResizeState.startFS * (newW / proportionalResizeState.startWidth)));

        if (!hasPushedHistoryRef.current) {
          onUpdateLayer(proportionalResizeState.layerId, {}, true);
          hasPushedHistoryRef.current = true;
        }

        pendingUpdatesRef.current = {
          layerId: proportionalResizeState.layerId,
          updates: {
            width: `${newW}px`,
            height: `${newH}px`,
            style: {
              ...layer.style,
              fontSize: `${newFS}px`
            }
          }
        };
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(flushUpdates);
        }
      }
    } else if (topStretchState) {
      const dy = (e.clientY - topStretchState.startY) / zoom;
      let newTop = Math.round(topStretchState.startTop + dy);
      if (newTop < 0) newTop = 0;
      const newH = Math.max(25, Math.round(topStretchState.startTop + topStretchState.startHeight - newTop));

      const layer = layers.find(l => l.id === topStretchState.layerId);
      const updates: Partial<MangaLayer> = { height: `${newH}px`, top: `${newTop}px` };

      if (layer && autoFitText) {
        const fontSz = calculateOptimalFontSize(
          layer.text,
          parseFloat(layer.width) || 120,
          newH,
          layer.style.fontFamily,
          layer.style.lineHeight,
          parseFloat(layer.style.letterSpacing) || 0
        );
        updates.style = { ...layer.style, fontSize: `${fontSz}px` };
      }

      if (!hasPushedHistoryRef.current) {
        onUpdateLayer(topStretchState.layerId, {}, true);
        hasPushedHistoryRef.current = true;
      }

      pendingUpdatesRef.current = { layerId: topStretchState.layerId, updates };
      if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flushUpdates);
    } else if (bottomStretchState) {
      const dy = (e.clientY - bottomStretchState.startY) / zoom;
      let newH = Math.max(25, Math.round(bottomStretchState.startHeight + dy));
      const maxAllowedH = dim.h - bottomStretchState.startTop;
      newH = Math.min(newH, maxAllowedH);

      const layer = layers.find(l => l.id === bottomStretchState.layerId);
      const updates: Partial<MangaLayer> = { height: `${newH}px` };

      if (layer && autoFitText) {
        const fontSz = calculateOptimalFontSize(
          layer.text,
          parseFloat(layer.width) || 120,
          newH,
          layer.style.fontFamily,
          layer.style.lineHeight,
          parseFloat(layer.style.letterSpacing) || 0
        );
        updates.style = { ...layer.style, fontSize: `${fontSz}px` };
      }

      if (!hasPushedHistoryRef.current) {
        onUpdateLayer(bottomStretchState.layerId, {}, true);
        hasPushedHistoryRef.current = true;
      }

      pendingUpdatesRef.current = { layerId: bottomStretchState.layerId, updates };
      if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flushUpdates);
    } else if (leftStretchState) {
      const dx = (e.clientX - leftStretchState.startX) / zoom;
      let newLeft = Math.round(leftStretchState.startLeft + dx);
      if (newLeft < 0) newLeft = 0;
      const newW = Math.max(25, Math.round(leftStretchState.startLeft + leftStretchState.startWidth - newLeft));

      if (!hasPushedHistoryRef.current) {
        onUpdateLayer(leftStretchState.layerId, {}, true);
        hasPushedHistoryRef.current = true;
      }

      pendingUpdatesRef.current = {
        layerId: leftStretchState.layerId,
        updates: { width: `${newW}px`, left: `${newLeft}px` }
      };
      if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flushUpdates);
    } else if (rightStretchState) {
      const dx = (e.clientX - rightStretchState.startX) / zoom;
      let newW = Math.max(25, Math.round(rightStretchState.startWidth + dx));
      const maxAllowedW = dim.w - rightStretchState.startLeft;
      newW = Math.min(newW, maxAllowedW);

      if (!hasPushedHistoryRef.current) {
        onUpdateLayer(rightStretchState.layerId, {}, true);
        hasPushedHistoryRef.current = true;
      }

      pendingUpdatesRef.current = { layerId: rightStretchState.layerId, updates: { width: `${newW}px` } };
      if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flushUpdates);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing && (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'clone_stamp')) {
      setIsDrawing(false);
      const canvas = cleaningCanvasRef.current;
      if (canvas && onUpdateCleaningDataUrl) {
        const url = canvas.toDataURL();
        lastDrawnUrlRef.current = url;
        onUpdateCleaningDataUrl(url);
      }
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      if (selectionBox && selectionBox.width >= 10 && selectionBox.height >= 10) {
        onAddSelectionBounds({
          left: selectionBox.left,
          top: selectionBox.top,
          width: selectionBox.width,
          height: selectionBox.height,
        });
      }
    }
    if (dragState) setDragState(null);
    if (resizeState) setResizeState(null);
    if (rotateState) setRotateState(null);
    if (proportionalResizeState) setProportionalResizeState(null);
    if (topStretchState) setTopStretchState(null);
    if (bottomStretchState) setBottomStretchState(null);
    if (leftStretchState) setLeftStretchState(null);
    if (rightStretchState) setRightStretchState(null);
    if (layerPinchState) setLayerPinchState(null);
    setGuides({ vertical: null, horizontal: null, bounds: null });
  };

  useEffect(() => {
    const isDraggingSomething = !!(
      dragState ||
      resizeState ||
      rotateState ||
      proportionalResizeState ||
      topStretchState ||
      bottomStretchState ||
      leftStretchState ||
      rightStretchState ||
      isPanning ||
      layerPinchState ||
      (isDrawing && selectionBox)
    );

    if (!isDraggingSomething) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const simulatedEvent = {
        clientX: e.clientX,
        clientY: e.clientY,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        target: e.target,
      } as unknown as React.MouseEvent;
      handleMouseMove(simulatedEvent);
    };

    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [
    dragState,
    resizeState,
    rotateState,
    proportionalResizeState,
    topStretchState,
    bottomStretchState,
    leftStretchState,
    rightStretchState,
    isPanning,
    layerPinchState,
    isDrawing,
    selectionBox,
    zoom,
  ]);

  const handleLayerDragStart = (layer: MangaLayer, e: React.MouseEvent) => {
    if (['brush', 'eraser', 'clone_stamp', 'color_picker', 'zoom', 'hand', 'pen'].includes(activeTool)) return; 

    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.classList.contains('resize-handle') ||
      target.classList.contains('delete-handle-btn')
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    onSetActiveLayer(layer);

    hasPushedHistoryRef.current = false;

    setDragState({
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: parseFloat(layer.left) || 0,
      startTop: parseFloat(layer.top) || 0,
    });
  };

  const handleLayerTouchStart = (layer: MangaLayer, e: React.TouchEvent) => {
    if (['brush', 'eraser', 'clone_stamp', 'color_picker', 'zoom', 'hand', 'pen'].includes(activeTool)) return; 

    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.classList.contains('resize-handle') ||
      target.classList.contains('delete-handle-btn')
    ) {
      return;
    }

    onSetActiveLayer(layer);

    if (e.touches.length === 1) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      hasPushedHistoryRef.current = false;

      const touch = e.touches[0];
      setDragState({
        layerId: layer.id,
        startX: touch.clientX,
        startY: touch.clientY,
        startLeft: parseFloat(layer.left) || 0,
        startTop: parseFloat(layer.top) || 0,
      });
    }
  };

  return (
    <div
      ref={containerRef}
      id="workspace-container"
      className="flex-grow overflow-auto flex justify-center items-start p-4 relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        cursor: activeTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : activeTool === 'zoom' ? 'zoom-in' : 'default',
      }}
    >
      <div 
        style={{
          width: `${dim.w * zoom}px`,
          height: `${dim.h * zoom}px`,
          position: 'relative',
        }}
        className="mx-auto"
      >
        <div
          ref={imageWrapperRef}
          id="image-wrapper"
          onMouseDown={handleMouseDown}
          style={{
            width: `${dim.w}px`,
            height: `${dim.h}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          className="bg-black shadow-2xl select-none"
        >
        <img
          ref={imageRef}
          id="manga-img"
          src={mangaSrc}
          alt="Manga Page"
          onLoad={handleImageLoad}
          className="block max-w-full h-auto"
          referrerPolicy="no-referrer"
        />

        <canvas
          ref={cleaningCanvasRef}
          id="cleaning-canvas"
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
        />

        {activeTool === 'pen' && penPoints.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-40">
            <path
              d={buildSvgPath(penPoints)}
              stroke={brushColor || '#007acc'}
              strokeWidth={3}
              fill="none"
              strokeDasharray="4 4"
            />
            {penPoints.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={5}
                fill={idx === 0 ? '#ff3b30' : '#007acc'}
                stroke="#ffffff"
                strokeWidth={1.5}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (idx === 0 && penPoints.length > 2) {
                    handleFinalizePenPath(true);
                  }
                }}
              />
            ))}
          </svg>
        )}

        {activeTool === 'pen' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#1e1e1e]/95 border border-[#3c3c3c] rounded-lg px-3 py-2 flex items-center gap-3 z-50 shadow-2xl select-none">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              ✒️ أداة القلم النشطة
            </span>
            <div className="w-[1px] h-4 bg-gray-700" />
            <button
              onClick={() => handleFinalizePenPath(false)}
              disabled={penPoints.length < 2}
              className="bg-[#007acc] hover:bg-[#0062a3] text-white disabled:opacity-40 disabled:cursor-not-allowed rounded px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
            >
              ✓ رسم المسار
            </button>
            <button
              onClick={() => handleFinalizePenPath(true)}
              disabled={penPoints.length < 3}
              className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
            >
              ☖ مسار مغلق (تعبئة)
            </button>
            <button
              onClick={() => setPenPoints([])}
              disabled={penPoints.length === 0}
              className="bg-red-800/80 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded px-2 py-1 text-[11px] font-bold transition cursor-pointer"
            >
              ✕ مسح
            </button>
          </div>
        )}

        {stampSource && imageRef.current && (
          <div
            style={{
              left: `${stampSource.x / (imageRef.current.naturalWidth / imageRef.current.offsetWidth || 1)}px`,
              top: `${stampSource.y / (imageRef.current.naturalHeight / imageRef.current.offsetHeight || 1)}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute border border-red-500 bg-red-500/20 w-4 h-4 rounded-full pointer-events-none z-30 flex items-center justify-center after:content-[''] after:w-2 after:h-[1px] after:bg-red-500 before:content-[''] before:h-2 before:w-[1px] before:bg-red-500"
            title="مصدر الختم"
          />
        )}

        {watermarkEnabled && (
          <div
            style={{
              opacity: watermarkOpacity,
              fontSize: `${watermarkSize}px`,
              transition: 'all 0.2s',
            }}
            className={`absolute pointer-events-none select-none z-[12] ${
              watermarkPosition === 'top-left' ? 'top-4 left-4' :
              watermarkPosition === 'top-right' ? 'top-4 right-4' :
              watermarkPosition === 'bottom-left' ? 'bottom-4 left-4' :
              'bottom-4 right-4'
            }`}
          >
            {watermarkType === 'text' ? (
              <span 
                style={{
                  fontFamily: 'Tahoma, sans-serif',
                  textShadow: '1px 1px 3px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.8), 1px -1px 3px rgba(0,0,0,0.8), -1px 1px 3px rgba(0,0,0,0.8)',
                }}
                className="text-white font-bold tracking-wide whitespace-nowrap block"
              >
                {watermarkText}
              </span>
            ) : (
              watermarkImage && (
                <img
                  src={watermarkImage}
                  style={{
                    width: `${watermarkSize * 4}px`,
                    height: 'auto',
                  }}
                  className="object-contain block max-w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
                  alt="Watermark logo"
                />
              )
            )}
          </div>
        )}

        {dragState && guides.bounds && (
          <div className="absolute inset-0 pointer-events-none z-20">
            <div 
              style={{
                left: `${guides.bounds.left}px`,
                top: `${guides.bounds.top}px`,
                width: `${guides.bounds.right - guides.bounds.left}px`,
                height: `${guides.bounds.bottom - guides.bounds.top}px`,
              }}
              className="absolute border border-dashed border-[#8e44ad]/40"
            />
            {guides.vertical !== null && (
              <div 
                style={{
                  left: `${guides.vertical}px`,
                  top: `${guides.bounds.top}px`,
                  height: `${guides.bounds.bottom - guides.bounds.top}px`,
                }}
                className="absolute border-l border-dashed border-[#007acc] w-0 -translate-x-1/2 flex items-center justify-center before:content-[''] before:w-1.5 before:h-1.5 before:bg-[#007acc] before:rounded-full after:content-[''] after:w-1.5 after:h-1.5 after:bg-[#007acc] after:rounded-full after:absolute after:bottom-0"
              />
            )}
            {guides.horizontal !== null && (
              <div 
                style={{
                  top: `${guides.horizontal}px`,
                  left: `${guides.bounds.left}px`,
                  width: `${guides.bounds.right - guides.bounds.left}px`,
                }}
                className="absolute border-t border-dashed border-[#007acc] h-0 -translate-y-1/2 flex items-center justify-center before:content-[''] before:w-1.5 before:h-1.5 before:bg-[#007acc] before:rounded-full before:absolute before:left-0 after:content-[''] after:w-1.5 after:h-1.5 after:bg-[#007acc] after:rounded-full after:absolute after:right-0"
              />
            )}
          </div>
        )}

        <canvas
          ref={wandCanvasRef}
          id="wand-canvas"
          className="absolute top-0 left-0 pointer-events-none z-20"
        />

        {selectionBox && selectionBox.visible && (
          <div
            id="selection-box"
            style={{
              left: `${selectionBox.left}px`,
              top: `${selectionBox.top}px`,
              width: `${selectionBox.width}px`,
              height: `${selectionBox.height}px`,
              display: 'block',
            }}
            className="absolute border-2 border-dashed border-[#4CAF50] bg-[#4CAF50]/10 pointer-events-none z-20 selection-box-bg"
          >
            {selectionBox.width >= 25 && selectionBox.height >= 15 && onContentAwareFill && (
              <div className="absolute -top-8 right-0 pointer-events-auto flex gap-1 z-30">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onContentAwareFill();
                  }}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold py-1 px-2 rounded shadow-lg transition flex items-center gap-1 cursor-pointer whitespace-nowrap border border-emerald-500"
                  title="تعبئة مع مراعاة المحتوى لمسح النص وإصلاح الخلفية تلقائياً"
                >
                  <span>🪄 Content Aware Fill</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 🗂️ حلقة تكرار رسم الطبقات الفردية (مستخرجة عبر LayerItem) */}
        {layers.map(layer => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isActive={activeLayer?.id === layer.id}
            activeTool={activeTool}
            onSetActiveLayer={onSetActiveLayer}
            onUpdateLayer={onUpdateLayer}
            onLayerDragStart={handleLayerDragStart}
            onLayerTouchStart={handleLayerTouchStart}
            setRotateState={setRotateState}
            setProportionalResizeState={setProportionalResizeState}
            setTopStretchState={setTopStretchState}
            setBottomStretchState={setBottomStretchState}
            setLeftStretchState={setLeftStretchState}
            setRightStretchState={setRightStretchState}
            hasPushedHistoryRef={hasPushedHistoryRef}
            buildSvgPath={buildSvgPath}
          />
        ))}
      </div>
    </div>
  </div>
);
});
