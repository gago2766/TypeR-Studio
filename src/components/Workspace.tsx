import React, { useRef, useState, useEffect } from 'react';
import { MangaLayer } from '../types';
import { calculateOptimalFontSize } from '../utils';

interface WorkspaceProps {
  mangaSrc: string;
  activeTool: 'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand';
  setActiveTool: (tool: 'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand') => void; // 👈 نُبقيها في الواجهة لتجنب أخطاء TypeScript
  wandDimensions: { imgW: number; imgH: number; dispW: number; dispH: number; x: number; y: number; w: number; h: number } | null; // 👈 نُبقيها في الواجهة لتجنب أخطاء TypeScript
  layers: MangaLayer[];
  activeLayer: MangaLayer | null;
  onSetActiveLayer: (layer: MangaLayer | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<MangaLayer>) => void;
  onAddSelectionBounds: (bounds: { left: number; top: number; width: number; height: number }) => void;
  onWandSelect: (clickX: number, clickY: number) => void;
  selectionBox: { left: number; top: number; width: number; height: number; visible: boolean } | null;
  setSelectionBox: React.Dispatch<React.SetStateAction<{ left: number; top: number; width: number; height: number; visible: boolean } | null>>;
  autoFitText: boolean;
  wandCanvasRef: React.RefObject<HTMLCanvasElement | null>;

  // Cleaning/Redrawing tools states
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

  // Watermark parameters
  watermarkEnabled: boolean;
  watermarkType: 'text' | 'image';
  watermarkText: string;
  watermarkImage: string | null;
  watermarkOpacity: number;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkSize: number;
  onDuplicateLayer?: (layerId: string) => void;
  onSavePresetFromStyle?: (style: any) => void;

  // 📐 استقبال قيم التحكم بالزووم المرفوعة للأعلى لربطها بالشريط العلوي
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
}

export function Workspace({
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

  // استقبال الخواص الجديدة للزووم
  zoom,
  setZoom,
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastDrawnUrlRef = useRef<string>('');

  // Zoom & Pan states (تم رفع حالة الـ zoom للأعلى كـ Prop)
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

  // 📐 حالة تخزين وتتبع خطوط الإرشاد وحواف الفقاعة النشطة
  const [guides, setGuides] = useState<{
    vertical: number | null;
    horizontal: number | null;
    bounds: { left: number; top: number; right: number; bottom: number } | null;
  }>({ vertical: null, horizontal: null, bounds: null });

  // مراجع لتتبع زوم اللمس بأصابع متعددة (Pinch to Zoom)
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number | null>(null);

  // Temporary drag & resize trackers to keep UI fluid
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

  const [leftStretchState, setLeftStretchState] = useState<{
    layerId: string;
    startX: number;
    startWidth: number;
    startLeft: number;
  } | null>(null);

  // Sync canvas size on load
  const handleImageLoad = () => {
    const img = imageRef.current;
    
    // Size wand canvas
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

    // Size high-res cleaning/redrawing canvas
    const cleaningCanvas = cleaningCanvasRef.current;
    if (img && cleaningCanvas) {
      if (cleaningCanvas.width !== img.naturalWidth || cleaningCanvas.height !== img.naturalHeight) {
        cleaningCanvas.width = img.naturalWidth;
        cleaningCanvas.height = img.naturalHeight;
      }
      
      if (currentPageCleaningDataUrl !== lastDrawnUrlRef.current) {
        // Load saved drawing state onto cleaning canvas
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

  // Support Ctrl/Cmd + Mouse Wheel for zoom in/out
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
  }, []);

  // نظام لمس احترافي متكامل للهواتف
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStartNative = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        setIsPanning(true);
        const t1 = e.touches[0];
        const t2 = e.touches[1];
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

        if (activeTool === 'magic_wand') {
          onWandSelect(clickX, clickY);
          return;
        }

        if (activeTool === 'marquee') {
          setIsDrawing(true);
          setStartPos({ x: clickX, y: clickY });
          setSelectionBox({
            left: clickX,
            top: clickY,
            width: 0,
            height: 0,
            visible: true,
          });
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
              } else if (activeTool === 'clone_stamp') {
                if (stampSource) {
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
      }
    };

    const handleTouchMoveNative = (e: TouchEvent) => {
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
          setZoom(nextZoom);
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

        if (isDrawing || dragState || proportionalResizeState || rotateState || topStretchState || leftStretchState) {
          if (e.cancelable) e.preventDefault();
        }

        if (isDrawing && activeTool === 'marquee' && selectionBox) {
          const wrapper = imageWrapperRef.current;
          if (!wrapper) return;
          const rect = wrapper.getBoundingClientRect();
          const clickX = (touch.clientX - rect.left) / zoom;
          const clickY = (touch.clientY - rect.top) / zoom;

          const left = Math.min(startPos.x, clickX);
          const top = Math.min(startPos.y, currentY);
          const width = Math.abs(clickX - startPos.x);
          const height = Math.abs(currentY - startPos.y);

          setSelectionBox({
            left,
            top,
            width,
            height,
            visible: true,
          });
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
              } else if (activeTool === 'clone_stamp') {
                if (stampSource) {
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
          }
          return;
        }

        if (dragState) {
          let dx = (touch.clientX - dragState.startX) / zoom;
          let dy = (touch.clientY - dragState.startY) / zoom;
          let newLeft = dragState.startLeft + dx;
          let newTop = dragState.startTop + dy;

          // 📐 إضافة المحاذاة المغناطيسية الذكية ورسم خطوط الإرشاد باللمس للهواتف
          if (wandDimensions && activeLayer && activeLayer.id === dragState.layerId) {
            const dsx = wandDimensions.dispW / wandDimensions.imgW;
            const dsy = wandDimensions.dispH / wandDimensions.imgH;
            const bubbleLeft = wandDimensions.x * dsx;
            const bubbleTop = wandDimensions.y * dsy;
            const bubbleWidth = wandDimensions.w * dsx;
            const bubbleHeight = wandDimensions.h * dsy;
            const bubbleCenterX = bubbleLeft + bubbleWidth / 2;
            const bubbleCenterY = bubbleTop + bubbleHeight / 2;

            const layerWidth = parseFloat(activeLayer.width) || 120;
            const layerHeight = parseFloat(activeLayer.height) || 80;

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

            setGuides({
              vertical: snapX,
              horizontal: snapY,
              bounds: {
                left: bubbleLeft,
                top: bubbleTop,
                right: bubbleLeft + bubbleWidth,
                bottom: bubbleTop + bubbleHeight
              }
            });
          }

          onUpdateLayer(dragState.layerId, {
            left: `${newLeft}px`,
            top: `${newTop}px`,
          });
          return;
        }

        if (proportionalResizeState) {
          const dx = (touch.clientX - proportionalResizeState.startX) / zoom;
          const dWidth = dx;
          const scale = Math.max(0.1, 1 + (dWidth / proportionalResizeState.startWidth));
          
          const newW = Math.max(20, Math.round(proportionalResizeState.startWidth * scale));
          const newH = Math.max(20, Math.round(proportionalResizeState.startHeight * scale));
          const newFS = Math.max(8, Math.round(proportionalResizeState.startFS * scale));

          const layer = layers.find(l => l.id === proportionalResizeState.layerId);
          if (layer) {
            onUpdateLayer(proportionalResizeState.layerId, {
              width: `${newW}px`,
              height: `${newH}px`,
              style: {
                ...layer.style,
                fontSize: `${newFS}px`
              }
            });
          }
          return;
        }

        if (rotateState) {
          const currentAngle = Math.atan2(touch.clientY - rotateState.centerY, touch.clientX - rotateState.centerX) * (180 / Math.PI);
          const dAngle = currentAngle - rotateState.startAngle;
          const finalAngle = Math.round((rotateState.initialLayerAngle + dAngle) % 360);
          onUpdateLayer(rotateState.layerId, { angle: finalAngle });
          return;
        }

        if (topStretchState) {
          const dy = (touch.clientY - topStretchState.startY) / zoom;
          const newH = Math.max(25, Math.round(topStretchState.startHeight - dy));
          const newTop = Math.round(topStretchState.startTop + dy);

          const layer = layers.find(l => l.id === topStretchState.layerId);
          const updates: Partial<MangaLayer> = {
            height: `${newH}px`,
            top: `${newTop}px`
          };

          if (layer && autoFitText) {
            const fontSz = calculateOptimalFontSize(
              layer.text,
              parseFloat(layer.width) || 120,
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

          onUpdateLayer(topStretchState.layerId, updates);
          return;
        }

        if (leftStretchState) {
          const dx = (touch.clientX - leftStretchState.startX) / zoom;
          const newW = Math.max(25, Math.round(leftStretchState.startWidth - dx));
          const newLeft = Math.round(leftStretchState.startLeft + dx);
          onUpdateLayer(leftStretchState.layerId, {
            width: `${newW}px`,
            left: `${newLeft}px`
          });
          return;
        }
      }
    };

    const handleTouchEndNative = () => {
      handleMouseUp();
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
    proportionalResizeState,
    rotateState,
    topStretchState,
    leftStretchState,
    layers,
    activeLayer,
    wandDimensions
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
          } else if (activeTool === 'clone_stamp') {
            if (stampSource) {
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
      return;
    }

    const target = e.target as HTMLElement;
    if (target !== imageRef.current && target !== wrapper && !target.classList.contains('selection-box-bg')) {
      return;
    }

    if (activeTool === 'magic_wand') {
      onWandSelect(clickX, clickY);
    } else {
      setIsDrawing(true);
      setStartPos({ x: clickX, y: clickY });
      setSelectionBox({
        left: clickX,
        top: clickY,
        width: 0,
        height: 0,
        visible: true,
      });
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
          } else if (activeTool === 'clone_stamp') {
            if (stampSource) {
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

      setSelectionBox({
        left,
        top,
        width,
        height,
        visible: true,
      });
    } else if (dragState) {
      let dx = (e.clientX - dragState.startX) / zoom;
      let dy = (e.clientY - dragState.startY) / zoom;
      let newLeft = dragState.startLeft + dx;
      let newTop = dragState.startTop + dy;

      // 📐 إضافة المحاذاة المغناطيسية الذكية ورسم خطوط الإرشاد
      if (wandDimensions && activeLayer && activeLayer.id === dragState.layerId) {
        const dsx = wandDimensions.dispW / wandDimensions.imgW;
        const dsy = wandDimensions.dispH / wandDimensions.imgH;
        const bubbleLeft = wandDimensions.x * dsx;
        const bubbleTop = wandDimensions.y * dsy;
        const bubbleWidth = wandDimensions.w * dsx;
        const bubbleHeight = wandDimensions.h * dsy;
        const bubbleCenterX = bubbleLeft + bubbleWidth / 2;
        const bubbleCenterY = bubbleTop + bubbleHeight / 2;

        const layerWidth = parseFloat(activeLayer.width) || 120;
        const layerHeight = parseFloat(activeLayer.height) || 80;

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

        setGuides({
          vertical: snapX,
          horizontal: snapY,
          bounds: {
            left: bubbleLeft,
            top: bubbleTop,
            right: bubbleLeft + bubbleWidth,
            bottom: bubbleTop + bubbleHeight
          }
        });
      }

      onUpdateLayer(dragState.layerId, {
        left: `${newLeft}px`,
        top: `${newTop}px`,
      });
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

      onUpdateLayer(resizeState.layerId, updates);
    } else if (rotateState) {
      const currentAngle = Math.atan2(e.clientY - rotateState.centerY, e.clientX - rotateState.centerX) * (180 / Math.PI);
      const dAngle = currentAngle - rotateState.startAngle;
      const finalAngle = Math.round((rotateState.initialLayerAngle + dAngle) % 360);
      onUpdateLayer(rotateState.layerId, { angle: finalAngle });
    } else if (proportionalResizeState) {
      const dx = (e.clientX - proportionalResizeState.startX) / zoom;
      const dWidth = dx;
      const scale = Math.max(0.1, 1 + (dWidth / proportionalResizeState.startWidth));
      
      const newW = Math.max(20, Math.round(proportionalResizeState.startWidth * scale));
      const newH = Math.max(20, Math.round(proportionalResizeState.startHeight * scale));
      const newFS = Math.max(8, Math.round(proportionalResizeState.startFS * scale));

      const layer = layers.find(l => l.id === proportionalResizeState.layerId);
      if (layer) {
        onUpdateLayer(proportionalResizeState.layerId, {
          width: `${newW}px`,
          height: `${newH}px`,
          style: {
            ...layer.style,
            fontSize: `${newFS}px`
          }
        });
      }
    } else if (topStretchState) {
      const dy = (e.clientY - topStretchState.startY) / zoom;
      const newH = Math.max(25, Math.round(topStretchState.startHeight - dy));
      const newTop = Math.round(topStretchState.startTop + dy);

      const layer = layers.find(l => l.id === topStretchState.layerId);
      const updates: Partial<MangaLayer> = {
        height: `${newH}px`,
        top: `${newTop}px`
      };

      if (layer && autoFitText) {
        const fontSz = calculateOptimalFontSize(
          layer.text,
          parseFloat(layer.width) || 120,
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

      onUpdateLayer(topStretchState.layerId, updates);
    } else if (leftStretchState) {
      const dx = (e.clientX - leftStretchState.startX) / zoom;
      const newW = Math.max(25, Math.round(leftStretchState.startWidth - dx));
      const newLeft = Math.round(leftStretchState.startLeft + dx);
      onUpdateLayer(leftStretchState.layerId, {
        width: `${newW}px`,
        left: `${newLeft}px`
      });
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
    if (dragState) {
      setDragState(null);
    }
    if (resizeState) {
      setResizeState(null);
    }
    if (rotateState) {
      setRotateState(null);
    }
    if (proportionalResizeState) {
      setProportionalResizeState(null);
    }
    if (topStretchState) {
      setTopStretchState(null);
    }
    if (leftStretchState) {
      setLeftStretchState(null);
    }
    // 📐 تنظيف خطوط الإرشاد تماماً فور انتهاء السحب يدوياً
    setGuides({ vertical: null, horizontal: null, bounds: null });
  };

  useEffect(() => {
    const isDraggingSomething = !!(
      dragState ||
      resizeState ||
      rotateState ||
      proportionalResizeState ||
      topStretchState ||
      leftStretchState ||
      isPanning ||
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
    leftStretchState,
    isPanning,
    isDrawing,
    selectionBox,
    zoom,
  ]);

  const handleLayerDragStart = (layer: MangaLayer, e: React.MouseEvent) => {
    if (['brush', 'eraser', 'clone_stamp', 'color_picker', 'zoom', 'hand'].includes(activeTool)) return;

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

    setDragState({
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: parseFloat(layer.left) || 0,
      startTop: parseFloat(layer.top) || 0,
    });
  };

  const handleLayerTouchStart = (layer: MangaLayer, e: React.TouchEvent) => {
    if (['brush', 'eraser', 'clone_stamp', 'color_picker', 'zoom', 'hand'].includes(activeTool)) return;

    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.classList.contains('resize-handle') ||
      target.classList.contains('delete-handle-btn')
    ) {
      return;
    }
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    onSetActiveLayer(layer);

    const touch = e.touches[0];
    setDragState({
      layerId: layer.id,
      startX: touch.clientX,
      startY: touch.clientY,
      startLeft: parseFloat(layer.left) || 0,
      startTop: parseFloat(layer.top) || 0,
    });
  };

  const handleResizeStart = (layer: MangaLayer, pos: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSetActiveLayer(layer);

    setResizeState({
      layerId: layer.id,
      pos,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: parseFloat(layer.width) || 120,
      startHeight: parseFloat(layer.height) || 80,
      startLeft: parseFloat(layer.left) || 0,
      startTop: parseFloat(layer.top) || 0,
    });
  };

  const handleDeleteLayerBtn = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const domEl = document.getElementById(`layer-${layerId}`);
    if (domEl) {
      onSetActiveLayer(null);
      domEl.remove();
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
      {/* Spacer layout that grows correctly when zoomed */}
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

        {/* Cleaning & redrawing Canvas Layer */}
        <canvas
          ref={cleaningCanvasRef}
          id="cleaning-canvas"
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
        />

        {/* Clone stamp visual anchor target */}
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

        {/* Live Watermark Overlay View */}
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

        {/* 📐 رسم خطوط الإرشاد والمحاذاة التفاعلية عند التوسيط أو الاقتراب من حواف الفقاعة */}
        {dragState && guides.bounds && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* حدود الفقاعة الأربعة كمستطيل متقطع */}
            <div 
              style={{
                left: `${guides.bounds.left}px`,
                top: `${guides.bounds.top}px`,
                width: `${guides.bounds.right - guides.bounds.left}px`,
                height: `${guides.bounds.bottom - guides.bounds.top}px`,
              }}
              className="absolute border border-dashed border-[#8e44ad]/40"
            />
            {/* خط الإرشاد الرأسي عند التوسيط الأفقي التام مع السنتر */}
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
            {/* خط الإرشاد الأفقي عند التوسيط العمودي التام مع السنتر */}
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

        {/* Dynamic Canvas representing Magic Wand bounds */}
        <canvas
          ref={wandCanvasRef}
          id="wand-canvas"
          className="absolute top-0 left-0 pointer-events-none z-20"
        />

        {/* Dash rectangular selection overlay box */}
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
          />
        )}

        {/* Layer bubbles list rendered dynamically */}
        {layers.map(layer => {
          if (layer.hidden) return null;
          const isActive = activeLayer?.id === layer.id;

          const isTransparent =
            !layer.style.bgColor ||
            layer.style.bgColor === 'transparent' ||
            layer.style.bgColor === 'rgba(0,0,0,0)' ||
            layer.style.bgColor === 'rgba(0, 0, 0, 0)';

          return (
            <div
              key={layer.id}
              id={`layer-${layer.id}`}
              onMouseDown={e => handleLayerDragStart(layer, e)}
              onTouchStart={e => handleLayerTouchStart(layer, e)}
              style={{
                left: layer.left,
                top: layer.top,
                width: layer.width,
                height: layer.height,
                backgroundColor: isTransparent ? 'transparent' : layer.style.bgColor,
                transform: `rotate(${layer.angle || 0}deg) ${layer.flippedY ? 'scaleY(-1)' : ''}`,
                transformOrigin: 'center center',
                ...(isActive ? {
                  border: '3px double #007acc',
                  outline: '1px solid rgba(0, 122, 204, 0.4)',
                  outlineOffset: '1px'
                } : {})
              }}
              className={`absolute cursor-move flex items-center justify-center text-center p-1 border border-transparent z-10 box-border hover:border-gray-400/60 ${
                isActive ? 'z-30' : ''
              }`}
            >
              {/* Inline Text Content block */}
              <div
                style={{
                  fontFamily: layer.style.fontFamily,
                  color: layer.style.color,
                  fontSize: layer.style.fontSize,
                  fontWeight: layer.style.fontWeight,
                  fontStyle: layer.style.fontStyle,
                  textDecoration: layer.style.textDecoration,
                  textAlign: layer.style.textAlign,
                  lineHeight: layer.style.lineHeight,
                  letterSpacing: layer.style.letterSpacing,
                  outline: 'none',
                  backgroundColor: 'transparent',
                  direction: 'rtl',
                  unicodeBidi: 'plaintext',
                }}
                contentEditable
                suppressContentEditableWarning
                onBlur={e => {
                  onUpdateLayer(layer.id, { text: e.target.innerText });
                }}
                className="w-full h-full flex flex-col justify-center select-text whitespace-pre-wrap select-none overflow-hidden"
              >
                {layer.text}
              </div>

              {/* Special Controls and Handles (Shown when active) */}
              {isActive && (
                <>
                  {/* --- 1. Corner Handles --- */}

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
                    title="تدوير النص بأي زاوية (لف النص يميناً أو يساراً)"
                  >
                    🔄
                  </button>

                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const startFS = parseFloat(layer.style.fontSize) || 16;
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
                    title="تكبير أو تصغير حجم صندوق النص (وبالتالي حجم الخط) بشكل متناسق"
                  >
                    ⤡
                  </button>


                  {/* --- 2. Side Handles --- */}
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      e.stopPropagation();
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
                    title="تمديد طول صندوق النص لتغيير الارتفاع"
                  >
                    ↕️
                  </button>

                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      e.stopPropagation();
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
                    title="تمديد عرض صندوق النص لتغيير نقطة بداية السطور من اليسار"
                  >
                    ↔️
                  </button>


                  {/* --- 3. Bottom Accessories --- */}

                </>
              )}
            </div>
          );
      })}
      </div>
    </div>
  </div>
);
}
