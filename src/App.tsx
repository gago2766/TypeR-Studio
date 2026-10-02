import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Upload, 
  Download, 
  Trash2, 
  Sparkles, 
  Settings, 
  Undo2, 
  Redo2, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  Files,
  Maximize2,
  FolderPlus,
  Folder,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';

import { 
  MangaPage, 
  MangaLayer, 
  TextStyle, 
  StyleFolder, 
  ProcessedLine, 
  CustomFont,
  TurboTypesetData,
  QuickPresetType,
  GradientPreset,
  TextGradient
} from './types';

import { 
  rgbToHex, 
  calculateOptimalFontSize, 
  tatweelLine,
  stepTatweel,
  wrapTextToShape,
  calculateOptimalFontSizeForShape,
  computeLayerBoundsFromWand,
  whitenMaskArea,
  getFonts,
  saveFont,
  saveFavoriteFonts,
  getFavoriteFonts,
  stretchSelectedText,
  contentAwareFillLocal,
  removeTatweel,
  formatFontFamilyForCanvas,
  extractGradientAndStrokeFromSelection
} from './utils';

import { FontManager } from './components/FontManager';
import { FloatingToolbar } from './components/FloatingToolbar';
import { Sidebar } from './components/Sidebar';
import { LayersPanel } from './components/LayersPanel';
import { Workspace } from './components/Workspace';
import { runLamaInpaint } from './utils/localInpaint';

// 📱 تعريف متغيرات Capacitor بشكل ديناميكي لتجنب أخطاء البناء في بيئات الويب وCI/CD
let Capacitor: any = null;
let Share: any = null;
let Filesystem: any = null;
let Directory: any = null;

if (typeof window !== 'undefined') {
  import('@capacitor/core')
    .then((m) => { Capacitor = m.Capacitor; })
    .catch(() => {});
  import('@capacitor/share')
    .then((m) => { Share = m.Share; })
    .catch(() => {});
  import('@capacitor/filesystem')
    .then((m) => { Filesystem = m.Filesystem; Directory = m.Directory; })
    .catch(() => {});
}

// 💾 واجهة السجل الموحد لجمع الطبقات والرسم معاً في لقطة واحدة للتراجع العام
export interface HistorySnapshot {
  layers: MangaLayer[];
  cleaningDataUrl: string;
}

// 🌈 قوالب تدريج لوني واستايلات أيقونية غنية مطابقة لبرامج التصميم الاحترافية
const DEFAULT_GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'grad_gold_frame', name: 'ذهب ملكي بإطار', colors: ['#ffd700', '#ff8800'], angle: 90, type: 'linear', strokeColor: '#fff2a8', strokeWidth: 2.5 },
  { id: 'grad_neon_cyan', name: 'نيون سيان مشع', colors: ['#00f2fe', '#4facfe'], angle: 90, type: 'linear', strokeColor: '#002244', strokeWidth: 2 },
  { id: 'grad_fire_shout', name: 'ناري حارق', colors: ['#ff0844', '#ffb199'], angle: 90, type: 'linear', strokeColor: '#2b0000', strokeWidth: 2.5 },
  { id: 'grad_chrome_metal', name: 'كروم معدني', colors: ['#e0e0e0', '#636e72'], angle: 90, type: 'linear', strokeColor: '#2d3436', strokeWidth: 2 },
  { id: 'grad_dark_purple', name: 'أرجواني مظلم', colors: ['#300050', '#800080'], angle: 90, type: 'linear', strokeColor: '#e056fd', strokeWidth: 2 },
  { id: 'grad_emerald_shine', name: 'زمرد لامع', colors: ['#00b09b', '#96c93d'], angle: 90, type: 'linear', strokeColor: '#004d40', strokeWidth: 2 },
  { id: 'grad_blue_electric', name: 'أزرق كهربائي', colors: ['#0575e6', '#00f260'], angle: 90, type: 'linear', strokeColor: '#ffffff', strokeWidth: 2 },
  { id: 'grad_ruby_blood', name: 'ياقوت دموي', colors: ['#870000', '#190a05'], angle: 90, type: 'linear', strokeColor: '#ff4d4d', strokeWidth: 2 },
  { id: 'grad_sunset', name: 'غروب ناري', colors: ['#ff512f', '#dd2476'], angle: 90, type: 'linear', strokeColor: '#ffffff', strokeWidth: 1.5 },
  { id: 'grad_black_white_frame', name: 'أسود بإطار ناصع', colors: ['#111111', '#222222'], angle: 90, type: 'linear', strokeColor: '#ffffff', strokeWidth: 3 },
];

// تهيئة البنية والأنماط الأولية بدون فرض أي خط نظام
const INITIAL_FOLDERS: StyleFolder[] = [
  {
    id: "folder_dialogue",
    name: "محادثات المانجا",
    styles: [
      { id: "style_normal", name: "عادي", fontSize: "auto", color: "#000000", bgColor: "transparent", tracking: 0, lineHeight: 1.25, textAlign: "center", fontFamily: "", tags: ["n", "normal", "عادي"], enabled: true, tagColor: "#FFF3B0", strokeColor: "#ffffff", strokeWidth: 0, updatedAt: 1 },
      { id: "style_thought", name: "تفكير داخلي", fontSize: "auto", color: "#444444", bgColor: "transparent", tracking: 0, lineHeight: 1.25, textAlign: "center", fontFamily: "", tags: ["t", "thought", "تفكير"], enabled: true, tagColor: "#A3E4D7", strokeColor: "#ffffff", strokeWidth: 0, updatedAt: 2 }
    ]
  },
  {
    id: "folder_sfx",
    name: "المؤثرات الصوتية",
    styles: [
      { id: "style_scream", name: "صراخ غاضب", fontSize: "auto", color: "#e81123", bgColor: "transparent", tracking: 1, lineHeight: 1.1, textAlign: "center", fontFamily: "", tags: ["s", "scream", "صراخ"], enabled: true, tagColor: "#FADBD8", strokeColor: "#ffffff", strokeWidth: 2, updatedAt: 3 }
    ]
  }
];

const DEFAULT_MANGA_SRC = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' style='background:%23222'><text x='50%' y='50%' fill='%23666' text-anchor='middle' font-family='sans-serif'>قم بسحب أو رفع صور الصفحات للبدء</text></svg>`;

export default function App() {
  const [pages, setPages] = useState<MangaPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(-1);
  const [mangaSrc, setMangaSrc] = useState<string>(DEFAULT_MANGA_SRC);
  const [zoom, setZoom] = useState<number>(1.0);

  const [fallbackFile, setFallbackFile] = useState<{ url: string; blob: Blob; filename: string } | null>(null);

  const [scriptInput, setScriptInput] = useState<string>('');
  const [parsedLines, setParsedLines] = useState<ProcessedLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);

  // ⚡ حالة تشغيل وضع النقرة الخارقة (Turbo 1-Click)
  const [turboMode, setTurboMode] = useState<boolean>(false);
  const turboModeRef = useRef<boolean>(false);

  useEffect(() => {
    turboModeRef.current = turboMode;
  }, [turboMode]);

  // 🎨 النمط السريع العائم المختار حالياً
  const [activeQuickPreset, setActiveQuickPreset] = useState<QuickPresetType>('normal');

  const [activeTool, setActiveTool] = useState<'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand' | 'pen'>('marquee');
  const [brushColor, setBrushColor] = useState<string>('#ffffff');
  const [brushSize, setBrushSize] = useState<number>(15);
  const [stampSource, setStampSource] = useState<{ x: number; y: number } | null>(null);
  const [isSettingStampSource, setIsSettingStampSource] = useState<boolean>(false);
  const cleaningCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [activeLayer, setActiveLayer] = useState<MangaLayer | null>(null);
  
  const pagesRef = useRef<MangaPage[]>([]);
  const currentPageIndexRef = useRef<number>(-1);
  const currentLineIndexRef = useRef<number>(-1);
  const parsedLinesRef = useRef<ProcessedLine[]>([]);
  const activeLayerRef = useRef<MangaLayer | null>(null);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
  }, [currentPageIndex]);

  useEffect(() => {
    currentLineIndexRef.current = currentLineIndex;
  }, [currentLineIndex]);

  useEffect(() => {
    parsedLinesRef.current = parsedLines;
  }, [parsedLines]);

  useEffect(() => {
    activeLayerRef.current = activeLayer;
  }, [activeLayer]);

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('typer_gemini_api_key') || '';
    } catch (e) {
      return '';
    }
  });

  const [hfToken, setHfToken] = useState<string>(() => {
    try {
      return localStorage.getItem('typer_hf_token') || '';
    } catch (e) {
      return '';
    }
  });

  useEffect(() => {
    setIsSidebarOpen(window.innerWidth >= 1024);
  }, []);

  // 💾 بدء تشغيل قائمة الخطوط المرفوعة فوراً وبشكل نقي
  const [customFonts, setCustomFonts] = useState<CustomFont[]>(() => {
    try {
      const savedMeta = localStorage.getItem('typer_custom_fonts_meta');
      return savedMeta ? JSON.parse(savedMeta) : [];
    } catch (e) {
      return [];
    }
  });

  const [favFonts, setFavFonts] = useState<string[]>(() => {
    return getFavoriteFonts();
  });

  // تحميل ملفات الخطوط الثنائية المرفوعة من IndexedDB
  useEffect(() => {
    const loadSavedFonts = async () => {
      try {
        const savedFonts = await getFonts();
        const loadedFontsList: CustomFont[] = [];
        
        for (const font of savedFonts) {
          try {
            const fontName = font.name.trim();

            const fontFace = new FontFace(fontName, font.data);
            await fontFace.load();
            document.fonts.add(fontFace);

            const blob = new Blob([font.data], { type: 'font/ttf' });
            const blobUrl = URL.createObjectURL(blob);
            let existingStyle = document.getElementById(`font-style-${fontName.replace(/\s+/g, '-')}`);
            if (!existingStyle) {
              const styleEl = document.createElement('style');
              styleEl.id = `font-style-${fontName.replace(/\s+/g, '-')}`;
              styleEl.textContent = `@font-face { font-family: '${fontName}'; src: url('${blobUrl}'); font-display: swap; }`;
              document.head.appendChild(styleEl);
            }

            loadedFontsList.push({ name: fontName, value: fontName, custom: true });
          } catch (err) {
            console.error("فشل تحميل الخط المحفوظ:", font.name, err);
          }
        }

        try {
          await document.fonts.ready;
        } catch (_) {}
        
        if (loadedFontsList.length > 0) {
          setCustomFonts(loadedFontsList);
          try {
            localStorage.setItem('typer_custom_fonts_meta', JSON.stringify(loadedFontsList));
          } catch (err) {
            console.error(err);
          }
        }
      } catch (error) {
        console.error("خطأ أثناء قراءة الخطوط من الذاكرة:", error);
      }
    };

    loadSavedFonts();
  }, []);

  const [autoFitText, setAutoFitText] = useState<boolean>(true);
  const [multiBubbleMode, setMultiBubbleMode] = useState<boolean>(false);
  const [wandTolerance, setWandTolerance] = useState<number>(20);
  const [minBubbleSize, setMinBubbleSize] = useState<number>(25);
  const [bubbleMargin, setBubbleMargin] = useState<number>(10);

  const [folders, setFolders] = useState<StyleFolder[]>(() => {
    try {
      const saved = localStorage.getItem('typer_studio_folders');
      return saved ? JSON.parse(saved) : INITIAL_FOLDERS;
    } catch (e) {
      return INITIAL_FOLDERS;
    }
  });
  
  const [selectedStyleId, setSelectedStyleId] = useState<string>(() => {
    try {
      return localStorage.getItem('typer_selected_style_id') || 'style_normal';
    } catch (e) {
      return 'style_normal';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('typer_selected_style_id', selectedStyleId);
    } catch (e) {
      console.error(e);
    }
  }, [selectedStyleId]);

  useEffect(() => {
    try {
      localStorage.setItem('typer_studio_folders', JSON.stringify(folders));
    } catch (e) {
      console.error('Error auto-saving folders:', e);
    }
  }, [folders]);

  // إعدادات الخط والنمط بدون فرض أي خط نظامي افتراضي
  const [fontFamily, setFontFamily] = useState<string>(() => {
    try {
      const savedMeta = localStorage.getItem('typer_custom_fonts_meta');
      const parsed = savedMeta ? JSON.parse(savedMeta) : [];
      return parsed.length > 0 ? parsed[0].value : '';
    } catch (e) {
      return '';
    }
  });

  const [fontSize, setFontSize] = useState<string>('auto');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [bgTransparent, setBgTransparent] = useState<boolean>(true);
  const [tracking, setTracking] = useState<number>(0);
  const [lineHeight, setLineHeight] = useState<number>(1.25);
  const [textAlign, setTextAlign] = useState<'center' | 'left' | 'right'>('center');
  const [bold, setBold] = useState<boolean>(false);
  const [italic, setItalic] = useState<boolean>(false);
  const [underline, setUnderline] = useState<boolean>(false);

  // 🖌️ حالات الحد الخارجي للخط (Stroke)
  const [strokeColor, setStrokeColor] = useState<string>('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState<number>(0);

  // 🌈 قوالب تدريج الألوان المحفوظة
  const [gradientPresets, setGradientPresets] = useState<GradientPreset[]>(() => {
    try {
      const saved = localStorage.getItem('typer_gradient_presets');
      return saved ? JSON.parse(saved) : DEFAULT_GRADIENT_PRESETS;
    } catch (e) {
      return DEFAULT_GRADIENT_PRESETS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('typer_gradient_presets', JSON.stringify(gradientPresets));
    } catch (e) {
      console.error(e);
    }
  }, [gradientPresets]);

  const [activeGradient, setActiveGradient] = useState<TextGradient | null>(null);

  const [showFontManager, setShowFontManager] = useState<boolean>(false);

  useEffect(() => {
    saveFavoriteFonts(favFonts);
  }, [favFonts]);

  const [tatweelStrength, setTatweelStrength] = useState<number>(2);
  const [tatweelMargin, setTatweelMargin] = useState<number>(5);

  const [manualTatweelStep, setManualTatweelStep] = useState<number>(1);
  const [selectionBox, setSelectionBox] = useState<{ left: number; top: number; width: number; height: number; visible: boolean } | null>(null);
  const [wandMask, setWandMask] = useState<Uint8Array | null>(null);
  const [detectedBubbleType, setDetectedBubbleType] = useState<'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval' | null>(null);
  const [autoApplyBubbleStyle, setAutoApplyBubbleStyle] = useState<boolean>(true);
  const [edgeSegments, setEdgeSegments] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; horiz: boolean }>>([]);
  
  const [bubbleQueue, setBubbleQueue] = useState<Array<{ 
    bboxX: number; 
    bboxY: number; 
    bboxW: number; 
    bboxH: number; 
    scaleX: number; 
    scaleY: number; 
    shape?: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval';
    mask?: Uint8Array;
    seedColor?: string;
    imgW?: number;
    imgH?: number;
    edgeSegments?: Array<{ x1: number; y1: number; x2: number; y2: number; horiz: boolean }>;
  }>>([]);

  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(false);
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [watermarkText, setWatermarkText] = useState<string>('فريق ترجمة المانجا');
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.4);
  const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const [watermarkSize, setWatermarkSize] = useState<number>(24);
  const [wandDimensions, setWandDimensions] = useState<{ imgW: number; imgH: number; dispW: number; dispH: number; x: number; y: number; w: number; h: number } | null>(null);

  const wandCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchOffsetRef = useRef<number>(0);
  const rAFRef = useRef<number | null>(null);

  const [history, setHistory] = useState<Record<number, { undo: HistorySnapshot[]; redo: HistorySnapshot[] }>>({});

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showExportSelectorModal, setShowExportSelectorModal] = useState<boolean>(false);
  const [checkedStylesForExport, setCheckedStylesForExport] = useState<string[]>([]);

  const [editingStyle, setEditingStyle] = useState<{ style: TextStyle; folderId: string } | null>(null);
  const [editFormName, setEditFormName] = useState('');
  const [editFormFolderId, setEditFormFolderId] = useState('');
  const [editFormFamily, setEditFormFamily] = useState('');
  const [editFormSize, setEditFormSize] = useState('auto');
  const [editFormColor, setEditFormColor] = useState('#000000');
  const [editFormBg, setEditFormBg] = useState('transparent');
  const [editFormTracking, setEditFormTracking] = useState(0);
  const [editFormLineHeight, setEditFormLineHeight] = useState(1.25);
  const [editFormAlign, setEditFormAlign] = useState<'center' | 'left' | 'right'>('center');
  const [editFormBold, setEditFormBold] = useState(false);
  const [editFormItalic, setEditFormItalic] = useState(false);
  const [editFormUnderline, setEditFormUnderline] = useState(false);
  const [editFormTags, setEditFormTags] = useState('');
  const [editFormTagColor, setEditFormTagColor] = useState('#FFF3B0');
  const [wandSeedColor, setWandSeedColor] = useState<string>('#ffffff');

  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; type?: 'error' | 'success' }>>([]);

  const addToast = (msg: string, type?: 'error' | 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  };

  const dataURLtoBlob = (dataUrl: string) => {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // 📤 مشاركة أي ملف مع التطبيقات
  const handleShareFile = async (content: string, filename: string, title: string) => {
    try {
      if (Capacitor && Capacitor.isNativePlatform() && Filesystem && Share && Directory) {
        await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Cache,
          encoding: 'utf8',
        });

        const fileUriResult = await Filesystem.getUri({
          directory: Directory.Cache,
          path: filename,
        });

        await Share.share({
          title,
          files: [fileUriResult.uri],
        });

        await Filesystem.deleteFile({
          directory: Directory.Cache,
          path: filename,
        });

        addToast('✓ تم فتح نافذة المشاركة لتطبيقاتك بنجاح 📤', 'success');
        return;
      }

      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: `ملف تايبر مانجا: ${filename} 📂`,
        });
        addToast('✓ تم فتح نافذة المشاركة لتطبيقاتك بنجاح 📤', 'success');
        return;
      }

      triggerDownload(blob, filename);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Sharing error:', err);
        addToast('❌ حدث خطأ أثناء فتح نافذة المشاركة', 'error');
      }
    }
  };

  const triggerDownload = async (blob: Blob, filename: string) => {
    const file = new File([blob], filename, { type: blob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
          text: `حفظ ${filename} من تطبيق تايبر مانجا 📱💾`,
        });
        addToast('✓ تم تفعيل ومشاركة الملف بنجاح 📤', 'success');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error("خطأ أثناء مشاركة الملف وحفظه:", err);
      }
    }

    const url = URL.createObjectURL(blob);
    const isImage = blob.type.startsWith('image/');
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isCapacitor = (window as any).Capacitor !== undefined;

    if (isImage && (isMobile || isCapacitor)) {
      setFallbackFile({ url, blob, filename });
      if (isCapacitor) {
        addToast('✓ تم تجهيز الصورة! اضغط على "مشاركة وحفظ" بالأسفل 📱', 'success');
      } else {
        addToast('✓ تم تجهيز الصورة! اضغط مطولاً لحفظها 📱', 'success');
      }
      return;
    }

    const dlLink = document.createElement('a');
    dlLink.download = filename;
    dlLink.href = url;
    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    addToast('✓ جاري بدء تحميل الملف بنجاح 📥', 'success');
  };

  const pushSnapshot = useCallback((customLayers?: MangaLayer[], customCleaningUrl?: string) => {
    const idx = currentPageIndexRef.current;
    if (idx === -1) return;
    const page = pagesRef.current[idx];
    if (!page) return;

    const activeLayers = customLayers !== undefined ? customLayers : [...page.layers];
    const activeCleaningUrl = customCleaningUrl !== undefined ? customCleaningUrl : (page.cleaningDataUrl || '');

    setHistory(prev => {
      const pageHist = prev[idx] || { undo: [], redo: [] };
      const newUndo = [...pageHist.undo.slice(-29), { layers: activeLayers, cleaningDataUrl: activeCleaningUrl }];
      return {
        ...prev,
        [idx]: {
          undo: newUndo,
          redo: []
        }
      };
    });
  }, []);

  const pushToHistory = useCallback((newLayersState: MangaLayer[]) => {
    const idx = currentPageIndexRef.current;
    const page = pagesRef.current[idx];
    pushSnapshot(newLayersState, page?.cleaningDataUrl || '');
  }, [pushSnapshot]);

  const handleUpdateLayer = useCallback((layerId: string, updates: Partial<MangaLayer>, saveToHistory = true) => {
    const idx = currentPageIndexRef.current;
    if (idx === -1) return;

    const page = pagesRef.current[idx];
    if (!page) return;
    const previousState = [...page.layers];

    if (saveToHistory) {
      pushToHistory(previousState);
    }

    setPages(prev =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        return {
          ...p,
          layers: p.layers.map(l => {
            if (l.id !== layerId) return l;
            
            let updatedLayer = { ...l, ...updates };
            
            if ('lineCountOverride' in updates && activeTool !== 'brush' && activeTool !== 'eraser' && activeTool !== 'clone_stamp') {
              const img = document.getElementById('manga-img') as HTMLImageElement;
              if (img && img.naturalWidth) {
                const layerWidth = parseFloat(updatedLayer.width) || 120;
                const layerHeight = parseFloat(updatedLayer.height) || 80;
                
                const shape = detectedBubbleType || 'normal_oval';
                
                const opt = calculateOptimalFontSizeForShape(
                  updatedLayer.text.replace(/\n/g, ' '),
                  shape,
                  layerWidth,
                  layerHeight,
                  updatedLayer.style.fontFamily,
                  updatedLayer.style.lineHeight,
                  parseFloat(updatedLayer.style.letterSpacing) || 0,
                  bubbleMargin,
                  updates.lineCountOverride,
                  true
                );
                
                updatedLayer.text = opt.textWithBreaks;
                updatedLayer.style = {
                  ...updatedLayer.style,
                  fontSize: `${opt.fontSize}px`
                };
              }
            }

            return updatedLayer;
          }),
        };
      })
    );

    if (activeLayerRef.current?.id === layerId) {
      setActiveLayer(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [activeTool, detectedBubbleType, bubbleMargin, pushToHistory]);

  const updateActiveStyleInFolders = useCallback((updates: Partial<TextStyle>) => {
    setFolders(prev =>
      prev.map(folder => ({
        ...folder,
        styles: folder.styles.map(s => {
          if (s.id !== selectedStyleId) return s;
          return { ...s, ...updates, updatedAt: Date.now() };
        })
      }))
    );
  }, [selectedStyleId]);

  // تحديث مباشر للنمط والطبقة النشطة في الوقت الحقيقي
  const handleUpdateActiveStyle = useCallback((updates: Partial<TextStyle>) => {
    updateActiveStyleInFolders(updates);
    if (activeLayerRef.current) {
      const currentStyle = activeLayerRef.current.style;
      const layerUpdates: any = {};
      if (updates.fontSize !== undefined) layerUpdates.fontSize = updates.fontSize === 'auto' ? currentStyle.fontSize : `${updates.fontSize}px`;
      if (updates.color !== undefined) layerUpdates.color = updates.color;
      if (updates.bgColor !== undefined) layerUpdates.bgColor = updates.bgColor;
      if (updates.tracking !== undefined) layerUpdates.letterSpacing = `${updates.tracking}px`;
      if (updates.lineHeight !== undefined) layerUpdates.lineHeight = updates.lineHeight;
      if (updates.textAlign !== undefined) layerUpdates.textAlign = updates.textAlign;
      if (updates.fontFamily !== undefined) layerUpdates.fontFamily = updates.fontFamily;
      if (updates.bold !== undefined) layerUpdates.fontWeight = updates.bold ? 'bold' : 'normal';
      if (updates.italic !== undefined) layerUpdates.fontStyle = updates.italic ? 'italic' : 'normal';
      if (updates.underline !== undefined) layerUpdates.textDecoration = updates.underline ? 'underline' : 'none';
      if (updates.strokeColor !== undefined) layerUpdates.strokeColor = updates.strokeColor;
      if (updates.strokeWidth !== undefined) layerUpdates.strokeWidth = updates.strokeWidth;
      if (updates.gradient !== undefined) layerUpdates.gradient = updates.gradient;

      handleUpdateLayer(activeLayerRef.current.id, {
        style: {
          ...currentStyle,
          ...layerUpdates
        }
      });
    }
  }, [handleUpdateLayer, updateActiveStyleInFolders]);

  // تحديث لون الـ Stroke فوراً في الطبقة النشطة
  const handleUpdateStrokeColor = useCallback((newColor: string) => {
    setStrokeColor(newColor);
    handleUpdateActiveStyle({ strokeColor: newColor });
  }, [handleUpdateActiveStyle]);

  // تحديث سمك الـ Stroke فوراً في الطبقة النشطة
  const handleUpdateStrokeWidth = useCallback((newWidth: number) => {
    setStrokeWidth(newWidth);
    handleUpdateActiveStyle({ strokeWidth: newWidth });
  }, [handleUpdateActiveStyle]);

  const handleSelectFontFamily = useCallback((newFont: string) => {
    setFontFamily(newFont);
    updateActiveStyleInFolders({ fontFamily: newFont });

    if (activeLayerRef.current) {
      handleUpdateLayer(activeLayerRef.current.id, {
        style: {
          ...activeLayerRef.current.style,
          fontFamily: newFont,
        }
      });
      addToast(`✓ تم تثبيت الخط "${newFont}" للنمط المحدد`, 'success');
    }
  }, [handleUpdateLayer, updateActiveStyleInFolders]);

  const handleDeleteLayer = useCallback((layerId: string) => {
    const idx = currentPageIndexRef.current;
    if (idx === -1) return;
    const page = pagesRef.current[idx];
    if (!page) return;
    const previousState = [...page.layers];

    setPages(prev =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        return {
          ...p,
          layers: p.layers.filter(l => l.id !== layerId),
        };
      })
    );

    if (activeLayerRef.current?.id === layerId) {
      setActiveLayer(null);
    }
    pushToHistory(previousState);
    addToast('تم حذف الطبقة بنجاح');
  }, [pushToHistory]);

  const handlePageChange = useCallback((index: number) => {
    const pgs = pagesRef.current;
    const currentIdx = currentPageIndexRef.current;
    if (index < 0 || index >= pgs.length) return;
    
    const currentPage = pgs[currentIdx];
    if (currentPage) {
      const activeLayers = Array.from(document.querySelectorAll('.text-layer')).map(el => {
        const hEl = el as HTMLElement;
        const lid = hEl.getAttribute('id')?.replace('layer-', '');
        const inner = hEl.querySelector('.text-layer-inner') as HTMLElement;
        const matchingLayer = currentPage.layers.find(l => l.id === lid);
        return {
          id: lid || '',
          text: inner?.innerText || '',
          left: hEl.style.left,
          top: hEl.style.top,
          width: hEl.style.width,
          height: hEl.style.height,
          hidden: hEl.style.visibility === 'hidden',
          style: matchingLayer ? matchingLayer.style : {
            fontSize: inner?.style.fontSize || '16px',
            color: inner?.style.color || '#000000',
            fontFamily: inner?.style.fontFamily || (customFonts[0]?.value || ''),
            fontWeight: inner?.style.fontWeight || 'normal',
            fontStyle: inner?.style.fontStyle || 'normal',
            textDecoration: inner?.style.textDecorationLine || 'none',
            textAlign: (inner?.style.textAlign as 'center' | 'left' | 'right') || 'center',
            lineHeight: parseFloat(inner?.style.lineHeight) || 1.25,
            letterSpacing: inner?.style.letterSpacing || '0px',
            bgColor: hEl.style.backgroundColor || 'transparent',
            strokeColor: '#ffffff',
            strokeWidth: 0,
          }
        } as MangaLayer;
      });
      pgs[currentIdx].layers = activeLayers;
    }

    setCurrentPageIndex(index);
    setMangaSrc(pgs[index].src);
    setActiveLayer(null);
    clearWandSelection();
    setSelectionBox(null);
  }, [customFonts]);

  // تصحيح فحص واستخراج الأسطر والوسوم وحذف النقطتين الرأسيتين مع علامة []:
  useEffect(() => {
    const rawLines = scriptInput.split('\n');
    const parsed: ProcessedLine[] = [];
    const customStyleTags = folders.flatMap(f => f.styles.flatMap(s => s.tags.map(t => t.toLowerCase())));

    rawLines.forEach((raw, idx) => {
      let text = raw.trim();
      if (!text) return;

      let isIgnored = false;
      let styleKey = 'default';
      let targetPageNum: number | null = null;

      const pageMatch = text.match(/^\[(?:Page|P|صفحة)\s*(\d+)\]/i);
      if (pageMatch) {
        targetPageNum = parseInt(pageMatch[1]);
      }

      if (text.startsWith('//') || text.startsWith('#')) {
        isIgnored = true;
      }

      if (!isIgnored && !targetPageNum) {
        const bracketMatch = text.match(/^\[(.*?)\]\s*(?:[:：]\s*)?(.*)/);
        if (bracketMatch) {
          styleKey = bracketMatch[1].toLowerCase().trim();
          text = bracketMatch[2].trim();
        } else {
          const sortedTags = [...customStyleTags].sort((a, b) => b.length - a.length);
          for (const tag of sortedTags) {
            if (!tag) continue;
            const escapedTag = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`^${escapedTag}\\s*(?:[:：]\\s*)?(.*)`, 'i');
            const match = text.match(regex);
            if (match) {
              styleKey = tag.toLowerCase().trim();
              text = match[1].trim();
              break;
            }
          }
        }
      }

      parsed.push({
        index: idx,
        raw,
        text,
        isIgnored: isIgnored || targetPageNum !== null,
        styleKey,
        targetPageNum,
      });
    });

    setParsedLines(parsed);
    if (parsed.length > 0 && currentLineIndex === -1) {
      handleSelectLine(0);
    }
  }, [scriptInput, folders]);

  const resolveStyleForLine = useCallback((styleKey: string): TextStyle | null => {
    if (!styleKey || styleKey === 'default') return null;
    const cleanKey = styleKey.toLowerCase().trim();

    let matched: TextStyle | null = null;
    for (const f of folders) {
      for (const s of f.styles) {
        if (s.enabled && s.tags.some(t => t.toLowerCase().trim() === cleanKey)) {
          matched = s;
          break;
        }
      }
      if (matched) break;
    }
    return matched;
  }, [folders]);

  const handleSelectLine = useCallback((index: number) => {
    const lines = parsedLinesRef.current.length > 0 ? parsedLinesRef.current : parsedLines;
    if (index < 0 || index >= lines.length) return;
    setCurrentLineIndex(index);
    currentLineIndexRef.current = index;
    const line = lines[index];

    if (line.targetPageNum !== null) {
      const targetIdx = line.targetPageNum - 1;
      if (targetIdx >= 0 && targetIdx < pagesRef.current.length) {
        handlePageChange(targetIdx);
      }
      if (index + 1 < lines.length) {
        handleSelectLine(index + 1);
      }
      return;
    }

    if (line.isIgnored) {
      if (index + 1 < lines.length) {
        handleSelectLine(index + 1);
      }
      return;
    }

    const matched = resolveStyleForLine(line.styleKey);
    if (matched) {
      setSelectedStyleId(matched.id);
    }
  }, [parsedLines, resolveStyleForLine, handlePageChange]);

  useEffect(() => {
    let style: TextStyle | null = null;
    folders.forEach(f => {
      const found = f.styles.find(s => s.id === selectedStyleId);
      if (found) style = found;
    });

    if (style) {
      setFontSize(style.fontSize === 'auto' ? 'auto' : `${style.fontSize}`);
      setTextColor(style.color);
      setBgColor(style.bgColor === 'transparent' ? '#ffffff' : style.bgColor);
      setBgTransparent(style.bgColor === 'transparent');
      setTracking(style.tracking);
      setLineHeight(style.lineHeight || 1.25);
      setTextAlign(style.textAlign);
      if (style.fontFamily) {
        setFontFamily(style.fontFamily);
      }
      setBold(!!style.bold);
      setItalic(!!style.italic);
      setUnderline(!!style.underline);
      setStrokeColor(style.strokeColor || '#ffffff');
      setStrokeWidth(style.strokeWidth || 0);
      setActiveGradient(style.gradient || null);
    }
  }, [selectedStyleId, folders]);

  const currentLayers = pages[currentPageIndex]?.layers || [];

  const handleDuplicateLayer = (layerId: string) => {
    if (currentPageIndex === -1 || !pages[currentPageIndex]) return;
    const page = pages[currentPageIndex];
    const layer = page.layers.find(l => l.id === layerId);
    if (!layer) return;

    const previousLayers = [...page.layers];
    const leftVal = parseFloat(layer.left) || 0;
    const topVal = parseFloat(layer.top) || 0;
    const layerWidth = parseFloat(layer.width) || 120;
    const layerHeight = parseFloat(layer.height) || 80;

    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    const maxWidth = imgEl?.offsetWidth || 600;
    const maxHeight = imgEl?.offsetHeight || 800;

    let newLeft = leftVal + 20;
    let newTop = topVal + 20;

    if (newLeft + layerWidth > maxWidth) newLeft = Math.max(0, maxWidth - layerWidth);
    if (newTop + layerHeight > maxHeight) newTop = Math.max(0, maxHeight - layerHeight);
    
    const newLayer: MangaLayer = {
      ...layer,
      id: `lid_${Date.now()}_dup_${Math.floor(Math.random() * 1000)}`,
      left: `${newLeft}px`,
      top: `${newTop}px`,
    };

    setPages(prev =>
      prev.map((p, idx) => {
        if (idx !== currentPageIndex) return p;
        return {
          ...p,
          layers: [...p.layers, newLayer],
        };
      })
    );
    
    pushToHistory(previousLayers);
    setActiveLayer(newLayer);
    addToast('✓ تم تكرار صندوق النص الحالي وتحديده بنجاح 📋', 'success');
  };

  const handleUndo = useCallback(() => {
    const idx = currentPageIndexRef.current;
    if (idx === -1) return;
    const page = pagesRef.current[idx];
    if (!page) return;
    
    const pageHist = history[idx];
    if (!pageHist || pageHist.undo.length === 0) {
      addToast('لا توجد خطوات سابقة للتراجع عنها', 'error');
      return;
    }

    const currentState: HistorySnapshot = {
      layers: page.layers,
      cleaningDataUrl: page.cleaningDataUrl || ''
    };

    const previousState = pageHist.undo[pageHist.undo.length - 1];

    setPages(prev =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        return {
          ...p,
          layers: previousState.layers,
          cleaningDataUrl: previousState.cleaningDataUrl || undefined
        };
      })
    );

    setHistory(prev => {
      const ph = prev[idx];
      return {
        ...prev,
        [idx]: {
          undo: ph.undo.slice(0, -1),
          redo: [...ph.redo, currentState]
        }
      };
    });

    setActiveLayer(null);
    addToast('✓ تراجع عن آخر خطوة موحدة ↩', 'success');
  }, [history]);

  const handleRedo = useCallback(() => {
    const idx = currentPageIndexRef.current;
    if (idx === -1) return;
    const page = pagesRef.current[idx];
    if (!page) return;

    const pageHist = history[idx];
    if (!pageHist || pageHist.redo.length === 0) {
      addToast('لا تتوفر خطوات لإعادة تطبيقها', 'error');
      return;
    }

    const currentState: HistorySnapshot = {
      layers: page.layers,
      cleaningDataUrl: page.cleaningDataUrl || ''
    };

    const nextState = pageHist.redo[pageHist.redo.length - 1];

    setPages(prev =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        return {
          ...p,
          layers: nextState.layers,
          cleaningDataUrl: nextState.cleaningDataUrl || undefined
        };
      })
    );

    setHistory(prev => {
      const ph = prev[idx];
      return {
        ...prev,
        [idx]: {
          undo: [...ph.undo, currentState],
          redo: ph.redo.slice(0, -1)
        }
      };
    });

    setActiveLayer(null);
    addToast('✓ إعادة تطبيق آخر خطوة موحدة ↪', 'success');
  }, [history]);

  const handleCleaningUndo = () => handleUndo();
  const handleCleaningRedo = () => handleRedo();

  const handleUpdateCleaningDataUrl = useCallback((url: string) => {
    const idx = currentPageIndexRef.current;
    if (idx === -1) return;
    const page = pagesRef.current[idx];
    if (!page) return;

    pushSnapshot(page.layers, page.cleaningDataUrl || '');

    setPages(prev =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        return { ...p, cleaningDataUrl: url };
      })
    );
  }, [pushSnapshot]);

  // ⚡ معالج النقرة الخارقة الموثوق
  const handleTurboTypeset = useCallback((data: TurboTypesetData) => {
    const idx = currentPageIndexRef.current;
    if (idx === -1) return;
    const page = pagesRef.current[idx];
    if (!page) return;

    const lines = parsedLinesRef.current.length > 0 ? parsedLinesRef.current : parsedLines;
    let lineIdx = currentLineIndexRef.current;
    
    if (lineIdx < 0 && lines.length > 0) {
      lineIdx = 0;
      setCurrentLineIndex(0);
      currentLineIndexRef.current = 0;
    }

    if (lineIdx < 0 || lineIdx >= lines.length) {
      addToast('❌ لا توجد أسطر ترجمة متبقية للإدراج', 'error');
      return;
    }

    const activeLine = lines[lineIdx];
    const rawTxt = activeLine.text;

    const canvas = cleaningCanvasRef.current;
    let newCleaningUrl = page.cleaningDataUrl || '';
    if (canvas && data.mask && data.mask.length > 0) {
      newCleaningUrl = whitenMaskArea(
        canvas,
        data.mask,
        data.imgW,
        data.imgH,
        data.seedColor || '#ffffff',
        { x: data.bboxX, y: data.bboxY, w: data.bboxW, h: data.bboxH }
      );
    }

    const bounds = computeLayerBoundsFromWand({
      bboxX: data.bboxX,
      bboxY: data.bboxY,
      bboxW: data.bboxW,
      bboxH: data.bboxH,
      scaleX: data.scaleX,
      scaleY: data.scaleY,
      marginPercent: bubbleMargin,
      mask: data.mask,
      imgW: data.imgW,
      imgH: data.imgH,
      bubbleType: data.shape,
    });

    const matchedStyle = resolveStyleForLine(activeLine.styleKey);

    let activeFont = matchedStyle && matchedStyle.fontFamily
      ? matchedStyle.fontFamily 
      : (fontFamily || (customFonts[0]?.value || ''));
    let activeColor = matchedStyle ? matchedStyle.color : '#000000';
    let activeLineH = matchedStyle ? (matchedStyle.lineHeight || 1.25) : (lineHeight || 1.25);
    let activeWeight = matchedStyle ? (matchedStyle.bold ? 'bold' : 'normal') : (bold ? 'bold' : 'normal');
    let activeFontStyle = matchedStyle ? (matchedStyle.italic ? 'italic' : 'normal') : (italic ? 'italic' : 'normal');
    let activeUnderline = matchedStyle ? !!matchedStyle.underline : underline;
    let activeTracking = matchedStyle ? matchedStyle.tracking : tracking;
    let activeTextAlign = matchedStyle ? matchedStyle.textAlign : (textAlign || 'center');
    let activeStrokeColor = matchedStyle?.strokeColor || strokeColor || '#ffffff';
    let activeStrokeWidth = matchedStyle?.strokeWidth !== undefined ? matchedStyle.strokeWidth : strokeWidth;
    let activeGrad = matchedStyle?.gradient || activeGradient || undefined;

    if (!matchedStyle) {
      if (activeQuickPreset === 'shout') {
        activeWeight = 'bold';
      } else if (activeQuickPreset === 'thought') {
        activeFontStyle = 'italic';
        activeColor = '#333333';
      } else if (activeQuickPreset === 'box') {
        activeWeight = 'bold';
      } else if (activeQuickPreset === 'whisper') {
        activeColor = '#666666';
        activeFontStyle = 'italic';
      } else {
        activeColor = textColor && textColor !== '#ffffff' ? textColor : '#000000';
      }
    }

    let finalFontSize = 16;
    let finalTextWithBreaks = rawTxt;

    try {
      const opt = calculateOptimalFontSizeForShape(
        rawTxt,
        data.shape || 'normal_oval',
        bounds.width,
        bounds.height,
        activeFont,
        activeLineH,
        activeTracking,
        bubbleMargin,
        undefined,
        true
      );
      finalFontSize = opt.fontSize || 16;
      finalTextWithBreaks = opt.textWithBreaks || rawTxt;
    } catch (err) {
      console.error('Turbo calculation fallback:', err);
      finalFontSize = calculateOptimalFontSize(rawTxt, bounds.width, bounds.height, activeFont, activeLineH, activeTracking);
      finalTextWithBreaks = rawTxt;
    }

    const newLayer: MangaLayer = {
      id: `lid_${Date.now()}_turbo_${Math.floor(Math.random() * 1000)}`,
      type: 'text',
      text: finalTextWithBreaks,
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      hidden: false,
      style: {
        fontSize: `${finalFontSize}px`,
        color: activeColor,
        fontFamily: activeFont,
        fontWeight: activeWeight,
        fontStyle: activeFontStyle,
        textDecoration: activeUnderline ? 'underline' : 'none',
        textAlign: activeTextAlign,
        lineHeight: activeLineH,
        letterSpacing: activeTracking > 0 ? `${activeTracking}px` : '0px',
        bgColor: 'transparent',
        strokeColor: activeStrokeColor,
        strokeWidth: activeStrokeWidth,
        gradient: activeGrad,
      },
    };

    pushSnapshot(page.layers, page.cleaningDataUrl || '');

    setPages(prev =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        return {
          ...p,
          layers: [...p.layers, newLayer],
          cleaningDataUrl: newCleaningUrl || p.cleaningDataUrl,
        };
      })
    );

    setActiveLayer(newLayer);

    if (lineIdx < lines.length - 1) {
      handleSelectLine(lineIdx + 1);
    }

    addToast(`⚡ تم التبييض والإدراج بنقرة واحدة! (${lineIdx + 1}/${lines.length}) [${matchedStyle ? matchedStyle.name : (activeFont ? activeFont.split(',')[0] : 'افتراضي')}]`, 'success');
  }, [
    parsedLines,
    bubbleMargin,
    fontFamily,
    textColor,
    lineHeight,
    bold,
    italic,
    underline,
    textAlign,
    tracking,
    strokeColor,
    strokeWidth,
    activeGradient,
    activeQuickPreset,
    resolveStyleForLine,
    pushSnapshot,
    handleSelectLine,
    customFonts
  ]);

  const handleSelectQuickPreset = (preset: QuickPresetType) => {
    setActiveQuickPreset(preset);
    if (preset === 'normal') {
      setBold(false);
      setItalic(false);
      setTextColor('#000000');
      setDetectedBubbleType('normal_oval');
    } else if (preset === 'shout') {
      setBold(true);
      setTextColor('#000000');
      setDetectedBubbleType('spiky_shout');
    } else if (preset === 'thought') {
      setItalic(true);
      setBold(false);
      setTextColor('#333333');
      setDetectedBubbleType('thought_cloud');
    } else if (preset === 'box') {
      setBold(true);
      setTextColor('#000000');
      setDetectedBubbleType('narrative_box');
    } else if (preset === 'whisper') {
      setTextColor('#666666');
      setItalic(true);
      setBold(false);
      setDetectedBubbleType('normal_oval');
    }
    addToast(`✓ تم تفعيل نمط: ${preset} للفقاعة القادمة`, 'success');
  };

  const preloadImageLayers = async (layers: MangaLayer[]): Promise<Map<string, HTMLImageElement>> => {
    const cache = new Map<string, HTMLImageElement>();
    const imgLayers = layers.filter(l => l.type === 'image' && l.imageSrc);
    
    const promises = imgLayers.map(l => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          cache.set(l.id, img);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = l.imageSrc!;
      });
    });
    
    await Promise.all(promises);
    return cache;
  };

  const handleMergeLayers = async () => {
    if (currentPageIndex === -1 || !pages[currentPageIndex]) return;
    const page = pages[currentPageIndex];
    if (page.layers.length === 0) {
      addToast('⚠️ لا توجد طبقات نصوص أو رسومات لدمجها حالياً', 'error');
      return;
    }

    const confirmMerge = window.confirm('هل أنت متأكد من دمج جميع الطبقات؟ سيتم دمج النصوص والصور المرفوعة ورسومات القلم مع صورة الخلفية نهائياً.');
    if (!confirmMerge) return;

    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    if (!imgEl || !imgEl.naturalWidth) {
      addToast('⚠️ لم يتم العثور على صورة المانجا لدمج الطبقات فوقها', 'error');
      return;
    }

    addToast('🔄 جاري تحميل الصور الملحقة لدمج الطبقات...', 'success');
    pushSnapshot(currentLayers, page.cleaningDataUrl || '');

    try {
      const imageCache = await preloadImageLayers(page.layers);
      const renderImg = new Image();
      renderImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = renderImg.naturalWidth;
        canvas.height = renderImg.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(renderImg, 0, 0);

        const scaleX = renderImg.naturalWidth / imgEl.offsetWidth;
        const scaleY = renderImg.naturalHeight / imgEl.offsetHeight;

        const applyMerge = () => {
          page.layers.forEach(l => {
            if (!l.hidden) {
              renderLayerToCanvasBuffer(ctx, l, scaleX, scaleY, imageCache);
            }
          });

          const mergedUrl = canvas.toDataURL('image/png');

          setPages(prev =>
            prev.map((p, idx) => {
              if (idx !== currentPageIndex) return p;
              return {
                ...p,
                layers: [],
                cleaningDataUrl: mergedUrl
              };
            })
          );

          setActiveLayer(null);
          addToast('✓ تم دمج وتسطيح جميع الطبقات مع الخلفية بنجاح! 📥🎨', 'success');
        };

        const cleaningUrl = page.cleaningDataUrl;
        if (cleaningUrl) {
          const cleaningImg = new Image();
          cleaningImg.onload = () => {
            ctx.drawImage(cleaningImg, 0, 0);
            applyMerge();
          };
          cleaningImg.src = cleaningUrl;
        } else {
          applyMerge();
        }
      };
      renderImg.src = page.src;
    } catch (err) {
      console.error(err);
      addToast('❌ فشل تحميل بعض الصور الملحقة أثناء عملية الدمج والتسوية', 'error');
    }
  };

  const handleWhitenWandSelection = () => {
    if (!wandMask || !wandDimensions) {
      addToast('⚠️ الرجاء تحديد مساحة بالعصا السحرية أولاً لتبييضها', 'error');
      return;
    }

    const canvas = cleaningCanvasRef.current;
    if (!canvas) {
      addToast('⚠️ لم يتم العثور على مساحة الرسم لتبييضها', 'error');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { imgW, imgH, x, y, w, h } = wandDimensions;
    
    if (canvas.width !== imgW || canvas.height !== imgH) {
      canvas.width = imgW;
      canvas.height = imgH;
    }

    const imgData = ctx.getImageData(0, 0, imgW, imgH);
    const data = imgData.data;

    let fillR = 255, fillG = 255, fillB = 255, fillA = 255;
    
    const activeColor = wandSeedColor || '#ffffff';
    if (activeColor.startsWith('#')) {
      const hex = activeColor.substring(1);
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

    for (let cy = y; cy < y + h; cy++) {
      if (cy < 0 || cy >= imgH) continue;
      for (let cx = x; cx < x + w; cx++) {
        if (cx < 0 || cx >= imgW) continue;
        const maskIdx = cy * imgW + cx;
        if (wandMask[maskIdx] === 1) {
          const pixelIdx = maskIdx * 4;
          data[pixelIdx] = fillR;
          data[pixelIdx + 1] = fillG;
          data[pixelIdx + 2] = fillB;
          data[pixelIdx + 3] = fillA;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const url = canvas.toDataURL();
    handleUpdateCleaningDataUrl(url);

    addToast('✓ تم تبييض المساحة المحددة بالعصا السحرية بنجاح 🧼🎨', 'success');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) as File[] : [];
    if (!files.length) return;

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    const newPages: MangaPage[] = [];

    let loaded = 0;
    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = ev => {
        newPages[idx] = {
          name: file.name,
          src: ev.target?.result as string,
          layers: [],
        };
        loaded++;
        if (loaded === files.length) {
          setPages(newPages);
          setCurrentPageIndex(0);
          setMangaSrc(newPages[0].src);
          addToast(`تم تحميل ${files.length} صفحة بنجاح`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const clearWandSelection = () => {
    setWandMask(null);
    setEdgeSegments([]);
    setWandDimensions(null);
    const canvas = wandCanvasRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
  };

  const handleWandSelect = (clickX: number, clickY: number) => {
    const img = document.getElementById('manga-img') as HTMLImageElement;
    if (!img || !img.naturalWidth) {
      addToast('لا توجد صورة محملة للاكتشاف', 'error');
      return;
    }

    const offCanvas = document.createElement('canvas');
    offCanvas.width = img.naturalWidth;
    offCanvas.height = img.naturalHeight;
    const octx = offCanvas.getContext('2d');
    if (!octx) return;
    octx.drawImage(img, 0, 0);

    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;
    const imgW = offCanvas.width;
    const imgH = offCanvas.height;
    let px = Math.round(clickX * scaleX);
    let py = Math.round(clickY * scaleY);

    if (px < 0 || px >= imgW || py < 0 || py >= imgH) return;

    const imgData = octx.getImageData(0, 0, imgW, imgH);
    const data = imgData.data;

    let si = (py * imgW + px) * 4;
    let sA = data[si + 3];
    if (sA < 30) {
      addToast('⚠️ اضغط داخل الفقاعة وليس على مساحة فارغة', 'error');
      return;
    }

    let sR = data[si], sG = data[si + 1], sB = data[si + 2];
    let seedLuminance = 0.299 * sR + 0.587 * sG + 0.114 * sB;

    if (seedLuminance < 130) {
      let maxLum = seedLuminance;
      let bestX = px;
      let bestY = py;
      const searchR = Math.min(35, Math.floor(imgW * 0.05));
      
      for (let dy = -searchR; dy <= searchR; dy += 2) {
        const ny = py + dy;
        if (ny < 0 || ny >= imgH) continue;
        for (let dx = -searchR; dx <= searchR; dx += 2) {
          const nx = px + dx;
          if (nx < 0 || nx >= imgW) continue;
          const nsi = (ny * imgW + nx) * 4;
          if (data[nsi + 3] < 50) continue;
          const lum = 0.299 * data[nsi] + 0.587 * data[nsi + 1] + 0.114 * data[nsi + 2];
          if (lum > maxLum) {
            maxLum = lum;
            bestX = nx;
            bestY = ny;
          }
        }
      }
      
      if (maxLum > 140) {
        px = bestX;
        py = bestY;
        si = (py * imgW + px) * 4;
        sR = data[si];
        sG = data[si + 1];
        sB = data[si + 2];
        seedLuminance = maxLum;
      }
    }

    const hexColor = "#" + ((1 << 24) + (sR << 16) + (sG << 8) + sB).toString(16).slice(1);
    setWandSeedColor(hexColor);

    const tolerance = wandTolerance;
    const mask = new Uint8Array(imgW * imgH);

    const searchRangeX = Math.max(150, Math.floor(imgW * 0.35));
    const searchRangeY = Math.max(150, Math.floor(imgH * 0.35));
    const minX_limit = Math.max(0, px - searchRangeX);
    const maxX_limit = Math.min(imgW - 1, px + searchRangeX);
    const minY_limit = Math.max(0, py - searchRangeY);
    const maxY_limit = Math.min(imgH - 1, py + searchRangeY);

    let minX = px, maxX = px, minY = py, maxY = py;
    const queue = new Int32Array(imgW * imgH);
    let head = 0, tail = 0;

    queue[tail++] = py * imgW + px;
    mask[py * imgW + px] = 1;

    const dirs = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 }
    ];

    while (head < tail) {
      const pos = queue[head++];
      const cx = pos % imgW;
      const cy = Math.floor(pos / imgW);

      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;

      for (let d = 0; d < 4; d++) {
        const dir = dirs[d];
        const nx = cx + dir.dx;
        const ny = cy + dir.dy;

        if (nx < minX_limit || nx > maxX_limit || ny < minY_limit || ny > maxY_limit) continue;

        const np = ny * imgW + nx;
        if (mask[np]) continue;

        const ni = np * 4;
        const nR = data[ni];
        const nG = data[ni + 1];
        const nB = data[ni + 2];
        const nA = data[ni + 3];

        if (nA < 30) continue;

        const dr = nR - sR;
        const dg = nG - sG;
        const db = nB - sB;
        const distToSeed = Math.sqrt(dr*dr + dg*dg + db*db);

        let matchesColor = distToSeed <= tolerance;

        if (seedLuminance > 120) {
          const targetLuminance = 0.299 * nR + 0.587 * nG + 0.114 * nB;
          if (targetLuminance < 85) matchesColor = false;
        } else if (seedLuminance < 85) {
          const targetLuminance = 0.299 * nR + 0.587 * nG + 0.114 * nB;
          if (targetLuminance > 130) matchesColor = false;
        }

        if (matchesColor) {
          mask[np] = 1;
          queue[tail++] = np;
        }
      }
    }

    const localW = maxX - minX + 3;
    const localH = maxY - minY + 3;
    const localVisited = new Uint8Array(localW * localH);
    const localQueue = new Int32Array(localW * localH);
    let lHead = 0, lTail = 0;

    const isMaskSet = (gx: number, gy: number): boolean => {
      if (gx < 0 || gx >= imgW || gy < 0 || gy >= imgH) return false;
      return mask[gy * imgW + gx] === 1;
    };

    for (let lx = 0; lx < localW; lx++) {
      const gx = minX - 1 + lx;
      const gyTop = minY - 1;
      const idxTop = 0 * localW + lx;
      if (!isMaskSet(gx, gyTop)) {
        localVisited[idxTop] = 1;
        localQueue[lTail++] = idxTop;
      }
      const gyBottom = maxY + 1;
      const idxBottom = (localH - 1) * localW + lx;
      if (!isMaskSet(gx, gyBottom)) {
        localVisited[idxBottom] = 1;
        localQueue[lTail++] = idxBottom;
      }
    }

    for (let ly = 0; ly < localH; ly++) {
      const gy = minY - 1 + ly;
      const gxLeft = minX - 1;
      const idxLeft = ly * localW + 0;
      if (!isMaskSet(gxLeft, gy)) {
        if (localVisited[idxLeft] === 0) {
          localVisited[idxLeft] = 1;
          localQueue[lTail++] = idxLeft;
        }
      }
      const gxRight = maxX + 1;
      const idxRight = ly * localW + (localW - 1);
      if (!isMaskSet(gxRight, gy)) {
        if (localVisited[idxRight] === 0) {
          localVisited[idxRight] = 1;
          localQueue[lTail++] = idxRight;
        }
      }
    }

    while (lHead < lTail) {
      const pos = localQueue[lHead++];
      const lx = pos % localW;
      const ly = Math.floor(pos / localW);

      const neighbors = [
        lx > 0 ? pos - 1 : -1,
        lx < localW - 1 ? pos + 1 : -1,
        ly > 0 ? pos - localW : -1,
        ly < localH - 1 ? pos + localW : -1
      ];

      for (let k = 0; k < 4; k++) {
        const np = neighbors[k];
        if (np < 0 || localVisited[np] === 1) continue;
        const nlx = np % localW;
        const nly = Math.floor(np / localW);
        const gx = minX - 1 + nlx;
        const gy = minY - 1 + nly;

        if (!isMaskSet(gx, gy)) {
          localVisited[np] = 1;
          localQueue[lTail++] = np;
        }
      }
    }

    for (let ly = 1; ly < localH - 1; ly++) {
      const gy = minY - 1 + ly;
      if (gy < 0 || gy >= imgH) continue;
      for (let lx = 1; lx < localW - 1; lx++) {
        const gx = minX - 1 + lx;
        if (gx < 0 || gx >= imgW) continue;
        const idx = ly * localW + lx;
        if (localVisited[idx] === 0 && mask[gy * imgW + gx] === 0) {
          mask[gy * imgW + gx] = 1;
        }
      }
    }

    const foundW = maxX - minX + 1;
    const foundH = maxY - minY + 1;

    if (foundW < minBubbleSize || foundH < minBubbleSize) {
      addToast('⚠️ لم تكتشف فقاعة متكاملة. جرب الضغط في منتصف بياض الفقاعة', 'error');
      return;
    }

    const segments: typeof edgeSegments = [];
    const borderX0 = Math.max(0, minX - 1);
    const borderX1 = Math.min(imgW - 1, maxX + 1);
    const borderY0 = Math.max(0, minY - 1);
    const borderY1 = Math.min(imgH - 1, maxY + 1);

    for (let y = borderY0; y <= borderY1; y++) {
      let inRun = false;
      let rStart = 0;
      for (let x = borderX0; x <= borderX1 + 1; x++) {
        const above = (y > 0 && x <= borderX1) ? mask[(y - 1) * imgW + x] : 0;
        const below = (y < imgH && x <= borderX1) ? mask[y * imgW + x] : 0;
        const isEdge = above !== below;

        if (isEdge && !inRun) {
          inRun = true;
          rStart = x;
        }
        if (!isEdge && inRun) {
          segments.push({ x1: rStart, y1: y, x2: x, y2: y, horiz: true });
          inRun = false;
        }
      }
    }

    for (let x = borderX0; x <= borderX1; x++) {
      let inRun = false;
      let rStart = 0;
      for (let y = borderY0; y <= borderY1 + 1; y++) {
        const left = (x > 0 && y <= borderY1) ? mask[y * imgW + (x - 1)] : 0;
        const right = (x < imgW && y <= borderY1) ? mask[y * imgW + x] : 0;
        const isEdge = left !== right;

        if (isEdge && !inRun) {
          inRun = true;
          rStart = y;
        }
        if (!isEdge && inRun) {
          segments.push({ x1: x, y1: rStart, x2: x, y2: y, horiz: false });
          inRun = false;
        }
      }
    }

    setWandMask(mask);
    setEdgeSegments(segments);

    let activePixels = 0;
    let sumX = 0;
    let sumY = 0;
    for (let y = minY; y <= maxY; y++) {
      const rowOffset = y * imgW;
      for (let x = minX; x <= maxX; x++) {
        if (mask[rowOffset + x] === 1) {
          activePixels++;
          sumX += x;
          sumY += y;
        }
      }
    }

    const aspect = foundW / foundH;
    let bType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval' = 'normal_oval';
    if (activePixels > 0) {
      const centerX = sumX / activePixels;
      const centerY = sumY / activePixels;
      const bboxArea = foundW * foundH;
      const density = activePixels / bboxArea;

      let totalDist = 0;
      let dists: number[] = [];
      segments.forEach(s => {
        const midX = (s.x1 + s.x2) / 2;
        const midY = (s.y1 + s.y2) / 2;
        const dist = Math.sqrt((midX - centerX) * (midX - centerX) + (midY - centerY) * (midY - centerY));
        dists.push(dist);
        totalDist += dist;
      });

      const avgDist = totalDist / (dists.length || 1);
      let distVar = 0;
      dists.forEach(d => {
        distVar += (d - avgDist) * (d - avgDist);
      });
      const stdDevDist = Math.sqrt(distVar / (dists.length || 1));
      const shapeCV = stdDevDist / (avgDist || 1);

      if (density >= 0.85) {
        bType = 'narrative_box';
      } else if (shapeCV > 0.125 || (segments.length / Math.sqrt(bboxArea) > 5.5)) {
        bType = 'spiky_shout';
      } else if (shapeCV > 0.082 && segments.length / Math.sqrt(bboxArea) > 3.0) {
        bType = 'thought_cloud';
      } else if (aspect >= 0.5 && aspect <= 1.45) {
        bType = 'vertical_oval';
      } else {
        bType = 'normal_oval';
      }
    }
    setDetectedBubbleType(bType);

    setWandDimensions({
      imgW,
      imgH,
      dispW: img.offsetWidth,
      dispH: img.offsetHeight,
      x: minX,
      y: minY,
      w: foundW,
      h: foundH,
    });

    if (turboModeRef.current) {
      handleTurboTypeset({
        bboxX: minX,
        bboxY: minY,
        bboxW: foundW,
        bboxH: foundH,
        scaleX,
        scaleY,
        shape: bType,
        mask: mask,
        seedColor: hexColor,
        imgW,
        imgH,
      });
      return;
    }

    if (activeLayer && !multiBubbleMode) {
      const previousLayers = [...currentLayers];
      
      const { left: layerLeft, top: layerTop, width: layerWidth, height: layerHeight } =
        computeLayerBoundsFromWand({
          bboxX: minX,
          bboxY: minY,
          bboxW: foundW,
          bboxH: foundH,
          scaleX,
          scaleY,
          marginPercent: bubbleMargin,
          mask,
          imgW,
          imgH,
          bubbleType: bType,
        });

      const opt = calculateOptimalFontSizeForShape(
        activeLayer.text.replace(/\n/g, ' '),
        bType,
        layerWidth,
        layerHeight,
        activeLayer.style.fontFamily,
        activeLayer.style.lineHeight,
        parseFloat(activeLayer.style.letterSpacing) || 0,
        bubbleMargin,
        activeLayer.lineCountOverride,
        true
      );

      let finalFontSize = opt.fontSize;
      let finalTxt = opt.textWithBreaks;

      if (fontSize !== 'auto') {
        const userCap = parseFloat(fontSize);
        if (!isNaN(userCap) && finalFontSize > userCap) {
          finalFontSize = userCap;
          const wrapRes = wrapTextToShape(
            activeLayer.text.replace(/\n/g, ' '),
            bType,
            layerWidth,
            layerHeight,
            userCap,
            activeLayer.style.fontFamily,
            activeLayer.style.lineHeight,
            parseFloat(activeLayer.style.letterSpacing) || 0,
            bubbleMargin,
            activeLayer.lineCountOverride,
            true
          );
          finalTxt = wrapRes.lines.join('\n');
        }
      }

      handleUpdateLayer(activeLayer.id, {
        left: `${layerLeft}px`,
        top: `${layerTop}px`,
        width: `${layerWidth}px`,
        height: `${layerHeight}px`,
        text: finalTxt,
        style: {
          ...activeLayer.style,
          fontSize: autoFitText ? `${finalFontSize}px` : activeLayer.style.fontSize,
        },
      });

      pushToHistory(previousLayers);
      addToast('✓ تم ملائمة وتوسيط النص للفقاعة الجديدة تلقائياً! 📐💬', 'success');
    }

    if (multiBubbleMode) {
      setBubbleQueue(prev => [...prev, {
        bboxX: minX,
        bboxY: minY,
        bboxW: foundW,
        bboxH: foundH,
        scaleX: scaleX,
        scaleY: scaleY,
        shape: bType,
        mask: mask,
        seedColor: hexColor,
        imgW,
        imgH,
        edgeSegments: segments,
      }]);
      addToast('أضيفت الفقاعة إلى قائمة الإدراج المتتابع', 'success');
    } else {
      if (!activeLayer && !turboModeRef.current) {
        addToast('✓ تم تحديد الفقاعة نجاحاً بالعصا');
      }
    }
  };

  useEffect(() => {
    const canvas = wandCanvasRef.current;
    if (!canvas) return;

    if (!wandMask && bubbleQueue.length === 0) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const activeDimensions = wandDimensions || (bubbleQueue.length > 0 ? {
      imgW: bubbleQueue[0].imgW || 600,
      imgH: bubbleQueue[0].imgH || 800,
      dispW: canvas.width,
      dispH: canvas.height,
    } : null);

    if (!activeDimensions) return;

    const { imgW, imgH, dispW, dispH } = activeDimensions;
    const dsx = dispW / imgW;
    const dsy = dispH / imgH;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const id = ctx.createImageData(canvas.width, canvas.height);
      const d = id.data;

      const drawPixelToData = (x: number, y: number, r = 0, g = 160, b = 255, a = 45) => {
        const dx = Math.round(x * dsx);
        const dy = Math.round(y * dsy);
        if (dx < 0 || dx >= canvas.width || dy < 0 || dy >= canvas.height) return;
        const di = (dy * canvas.width + dx) * 4;
        d[di] = r;
        d[di + 1] = g;
        d[di + 2] = b;
        d[di + 3] = a;
      };

      if (wandMask && wandDimensions) {
        const { x: minX, y: minY, w: foundW, h: hSize } = wandDimensions;
        const maxY = minY + hSize;
        const maxX = minX + foundW;
        for (let y = minY; y <= maxY; y++) {
          const row = y * imgW;
          for (let x = minX; x <= maxX; x++) {
            if (wandMask[row + x]) {
              drawPixelToData(x, y);
            }
          }
        }
      }

      bubbleQueue.forEach(b => {
        if (!b.mask) return;
        const maxX = b.bboxX + b.bboxW;
        const maxY = b.bboxY + b.bboxH;
        for (let y = b.bboxY; y <= maxY; y++) {
          const row = y * imgW;
          for (let x = b.bboxX; x <= maxX; x++) {
            if (b.mask[row + x]) {
              drawPixelToData(x, y, 76, 175, 80, 50); 
            }
          }
        }
      });

      ctx.putImageData(id, 0, 0);

      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 3]);

      const drawEdges = (segments: Array<{ x1: number; y1: number; x2: number; y2: number; horiz: boolean }>, isQueue = false) => {
        ctx.strokeStyle = isQueue ? '#76d7c4' : '#ffffff';
        ctx.lineDashOffset = -matchOffsetRef.current;
        ctx.beginPath();
        segments.forEach(s => {
          ctx.moveTo(s.x1 * dsx, s.y1 * dsy);
          ctx.lineTo(s.x2 * dsx, s.y2 * dsy);
        });
        ctx.stroke();

        ctx.strokeStyle = '#000000';
        ctx.lineDashOffset = -(matchOffsetRef.current + 4);
        ctx.beginPath();
        segments.forEach(s => {
          ctx.moveTo(s.x1 * dsx, s.y1 * dsy);
          ctx.lineTo(s.x2 * dsx, s.y2 * dsy);
        });
        ctx.stroke();
      };

      if (edgeSegments.length > 0) {
        drawEdges(edgeSegments, false);
      }

      bubbleQueue.forEach(b => {
        if (b.edgeSegments && b.edgeSegments.length > 0) {
          drawEdges(b.edgeSegments, true);
        }
      });

      ctx.restore();

      matchOffsetRef.current = (matchOffsetRef.current + 0.45) % 8;
      rAFRef.current = requestAnimationFrame(tick);
    };

    tick();
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, [wandMask, edgeSegments, wandDimensions, bubbleQueue]);

  // 📝 إدراج النص
  const handleInsertText = () => {
    const lines = parsedLinesRef.current.length > 0 ? parsedLinesRef.current : parsedLines;
    if (lines.length === 0 || currentLineIndex === -1) {
      addToast('❌ أدخل النص المترجم في الحقل الجانبي أولاً', 'error');
      return;
    }

    const img = document.getElementById('manga-img') as HTMLImageElement;
    if (!img || img.naturalWidth === 0) {
      addToast('❌ لا توجد صفحة مانجا نشطة حالياً', 'error');
      return;
    }

    const hasWand = (wandMask !== null) && wandDimensions;
    const hasMarquee = selectionBox && selectionBox.width >= 10 && selectionBox.height >= 10;

    if (!hasWand && !hasMarquee) {
      addToast('❌ حدد منطقة السحب أو اضغط بالعصا أولاً لإدراج النص', 'error');
      return;
    }

    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;

    let targetLeft = 0, targetTop = 0, targetWidth = 100, targetHeight = 65;

    if (hasWand && wandDimensions) {
      targetLeft = wandDimensions.x / scaleX;
      targetTop = wandDimensions.y / scaleY;
      targetWidth = wandDimensions.w / scaleX;
      targetHeight = wandDimensions.h / scaleY;
    } else if (selectionBox) {
      targetLeft = selectionBox.left;
      targetTop = selectionBox.top;
      targetWidth = selectionBox.width;
      targetHeight = selectionBox.height;
    }

    let layerLeft: number, layerTop: number, layerWidth: number, layerHeight: number;

    if (hasWand && wandDimensions) {
      const bounds = computeLayerBoundsFromWand({
        bboxX: wandDimensions.x,
        bboxY: wandDimensions.y,
        bboxW: wandDimensions.w,
        bboxH: wandDimensions.h,
        scaleX,
        scaleY,
        marginPercent: bubbleMargin,
        mask: wandMask,
        imgW: wandDimensions.imgW,
        imgH: wandDimensions.imgH,
        bubbleType: detectedBubbleType,
      });
      layerLeft   = bounds.left;
      layerTop    = bounds.top;
      layerWidth  = bounds.width;
      layerHeight = bounds.height;
    } else {
      const marginRatio = bubbleMargin / 100;
      const padX = targetWidth * marginRatio;
      const padY = targetHeight * marginRatio;
      layerLeft   = targetLeft + padX;
      layerTop    = targetTop  + padY;
      layerWidth = Math.max(20, targetWidth  - padX * 2);
      layerHeight = Math.max(20, targetHeight - padY * 2);
    }

    const activeLine = lines[currentLineIndex];
    const rawTxt = activeLine.text;
    let txt = rawTxt;
    let bType = detectedBubbleType;

    const matchedStyle = resolveStyleForLine(activeLine.styleKey);

    const activeFont = matchedStyle && matchedStyle.fontFamily
      ? matchedStyle.fontFamily 
      : (fontFamily || (customFonts[0]?.value || ''));
    const activeColor = matchedStyle ? matchedStyle.color : textColor;
    const activeLineH = matchedStyle ? (matchedStyle.lineHeight || 1.25) : lineHeight;
    const activeTracking = matchedStyle ? matchedStyle.tracking : tracking;
    const activeTextAlign = matchedStyle ? matchedStyle.textAlign : textAlign;
    const activeWeight = matchedStyle ? (matchedStyle.bold ? 'bold' : 'normal') : (bold ? 'bold' : 'normal');
    const activeFontStyle = matchedStyle ? (matchedStyle.italic ? 'italic' : 'normal') : (italic ? 'italic' : 'normal');
    const activeUnderline = matchedStyle ? !!matchedStyle.underline : underline;
    const activeStrokeCol = matchedStyle?.strokeColor || strokeColor || '#ffffff';
    const activeStrokeWid = matchedStyle?.strokeWidth !== undefined ? matchedStyle.strokeWidth : strokeWidth;
    const activeGrad = matchedStyle?.gradient || activeGradient || undefined;

    const layStyle = {
      fontSize: fontSize === 'auto' ? '' : `${parseFloat(fontSize)}px`,
      color: activeColor,
      fontFamily: activeFont,
      fontWeight: activeWeight,
      fontStyle: activeFontStyle,
      textDecoration: activeUnderline ? 'underline' : 'none',
      textAlign: activeTextAlign,
      lineHeight: activeLineH,
      letterSpacing: activeTracking > 0 ? `${activeTracking}px` : '0px',
      bgColor: bgTransparent ? 'transparent' : bgColor,
      strokeColor: activeStrokeCol,
      strokeWidth: activeStrokeWid,
      gradient: activeGrad,
    };

    let finalFontSize = 16;
    if (hasWand && bType) {
      const opt = calculateOptimalFontSizeForShape(
        rawTxt,
        bType,
        layerWidth,
        layerHeight,
        activeFont,
        activeLineH,
        activeTracking,
        bubbleMargin,
        undefined,
        true
      );
      finalFontSize = opt.fontSize;
      txt = opt.textWithBreaks;

      if (fontSize !== 'auto') {
        const userCap = parseFloat(fontSize);
        if (!isNaN(userCap) && finalFontSize > userCap) {
          finalFontSize = userCap;
          const wrapRes = wrapTextToShape(
            rawTxt,
            bType,
            layerWidth,
            layerHeight,
            userCap,
            activeFont,
            activeLineH,
            activeTracking,
            bubbleMargin,
            undefined,
            true
          );
          txt = wrapRes.lines.join('\n');
        }
      }
      layStyle.fontSize = `${finalFontSize}px`;
    } else if (!layStyle.fontSize) {
      const optSize = calculateOptimalFontSize(txt, layerWidth, layerHeight, activeFont, activeLineH, activeTracking);
      layStyle.fontSize = `${optSize}px`;
    }

    const newLayer: MangaLayer = {
      id: `lid_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      type: 'text',
      text: txt,
      left: `${layerLeft}px`,
      top: `${layerTop}px`,
      width: `${layerWidth}px`,
      height: `${layerHeight}px`,
      hidden: false,
      style: layStyle,
    };

    const previousLayers = [...currentLayers];
    setPages(prev =>
      prev.map((page, idx) => {
        if (idx !== currentPageIndex) return page;
        return {
          ...page,
          layers: [...page.layers, newLayer],
        };
      })
    );

    setActiveLayer(newLayer);
    pushToHistory(previousLayers);
    addToast('تم إدراج النص وتشكيل الطبقة بنجاح', 'success');

    if (currentLineIndex < lines.length - 1) {
      handleSelectLine(currentLineIndex + 1);
    }

    clearWandSelection();
    setSelectionBox(null);
  };

  // 📐 محاذاة النص
  const handleAlignText = useCallback(() => {
    if (!activeLayerRef.current) {
      addToast('❌ يرجى تحديد طبقة نصية لتعديل محاذاتها الهيكلية', 'error');
      return;
    }

    const img = document.getElementById('manga-img') as HTMLImageElement;
    if (!img || img.naturalWidth === 0) return;

    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;

    let targetLeft = 0;
    let targetTop = 0;
    let targetW = 0;
    let targetH = 0;
    let isWandAlign = false;

    const hasWand = wandDimensions !== null; 
    const hasMarquee = selectionBox && selectionBox.width >= 10 && selectionBox.height >= 10;

    if (hasWand && wandDimensions) {
      targetLeft = wandDimensions.x / scaleX;
      targetTop = wandDimensions.y / scaleY;
      targetW = wandDimensions.w / scaleX;
      targetH = wandDimensions.h / scaleY;
      isWandAlign = true;
    } else if (hasMarquee && selectionBox) {
      targetLeft = selectionBox.left;
      targetTop = selectionBox.top;
      targetW = selectionBox.width;
      targetH = selectionBox.height;
    } else {
      addToast('❌ حدد منطقة بالعصا السحرية أو ارسم مستطيل التحديد أولاً لمحاذاة النص بداخلها', 'error');
      return;
    }

    const previousLayers = [...currentLayers];

    let layerLeft: number, layerTop: number, layerWidth: number, layerHeight: number;

    if (isWandAlign && wandDimensions) {
      const bounds = computeLayerBoundsFromWand({
        bboxX: wandDimensions.x,
        bboxY: wandDimensions.y,
        bboxW: wandDimensions.w,
        bboxH: wandDimensions.h,
        scaleX,
        scaleY,
        marginPercent: bubbleMargin,
        mask: wandMask,            
        imgW: wandDimensions.imgW, 
        imgH: wandDimensions.imgH, 
        bubbleType: detectedBubbleType, 
      });
      layerLeft   = bounds.left;
      layerTop    = bounds.top;
      layerWidth  = bounds.width;
      layerHeight = bounds.height;
    } else {
      const marginRatio = bubbleMargin / 100;
      const padX = targetW * marginRatio;
      const padY = targetH * marginRatio;
      layerLeft   = targetLeft + padX;
      layerTop    = targetTop  + padY;
      layerWidth  = Math.max(20, targetW - padX * 2);
      layerHeight = Math.max(20, targetH - padY * 2);
    }

    let optSize = parseFloat(activeLayerRef.current.style.fontSize) || 16;
    let newText = activeLayerRef.current.text;

    if (isWandAlign && detectedBubbleType) {
      const opt = calculateOptimalFontSizeForShape(
        activeLayerRef.current.text.replace(/\n/g, ' '),
        detectedBubbleType,
        layerWidth,
        layerHeight,
        activeLayerRef.current.style.fontFamily,
        activeLayerRef.current.style.lineHeight,
        parseFloat(activeLayerRef.current.style.letterSpacing) || 0,
        bubbleMargin,
        activeLayerRef.current.lineCountOverride,
        true
      );
      optSize = opt.fontSize;
      newText = opt.textWithBreaks;

      if (fontSize !== 'auto') {
        const userCap = parseFloat(fontSize);
        if (!isNaN(userCap) && optSize > userCap) {
          optSize = userCap;
          const wrapRes = wrapTextToShape(
            activeLayerRef.current.text.replace(/\n/g, ' '),
            detectedBubbleType,
            layerWidth,
            layerHeight,
            userCap,
            activeLayerRef.current.style.fontFamily,
            activeLayerRef.current.style.lineHeight,
            parseFloat(activeLayerRef.current.style.letterSpacing) || 0,
            bubbleMargin,
            activeLayerRef.current.lineCountOverride,
            true
          );
          newText = wrapRes.lines.join('\n');
        }
      }
    } else {
      optSize = calculateOptimalFontSize(
        activeLayerRef.current.text,
        layerWidth,
        layerHeight,
        activeLayerRef.current.style.fontFamily,
        activeLayerRef.current.style.lineHeight,
        parseFloat(activeLayerRef.current.style.letterSpacing) || 0
      );
    }

    handleUpdateLayer(activeLayerRef.current.id, {
      left: `${layerLeft}px`,
      top: `${layerTop}px`,
      width: `${layerWidth}px`,
      height: `${layerHeight}px`,
      text: newText,
      style: {
        ...activeLayerRef.current.style,
        fontSize: autoFitText ? `${optSize}px` : activeLayerRef.current.style.fontSize,
      },
    });

    pushToHistory(previousLayers);
    setSelectionBox(null);
    clearWandSelection();
    addToast('تمت محاذاة وتوسيط النص داخل الفقاعة المحددة بنجاح 🎉', 'success');
  }, [currentLayers, wandDimensions, selectionBox, bubbleMargin, wandMask, detectedBubbleType, fontSize, autoFitText, handleUpdateLayer, pushToHistory]);

  const handleApplyTatweel = () => {
    if (!activeLayer) {
      addToast('❌ يرجى تحديد طبقة نصية لتطبيق التنسيق', 'error');
      return;
    }

    const lines = activeLayer.text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      addToast('❌ التمطيط الفوري يتطلب سطرين أو أكثر في الفقاعة لوزن المقاسات بيئياً', 'error');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontSz = parseFloat(activeLayer.style.fontSize) || 16;
    ctx.font = `${activeLayer.style.fontStyle} ${activeLayer.style.fontWeight} ${fontSz}px ${formatFontFamilyForCanvas(activeLayer.style.fontFamily)}`;

    const widths = lines.map(l => ctx.measureText(l).width);
    const maxW = Math.max(...widths);
    const targetW = maxW * (1 - tatweelMargin / 100);

    const stretched = lines.map((line, idx) => {
      const w = ctx.measureText(line).width;
      if (w >= targetW * 0.95) return line;
      
      if (idx === 0 || idx === lines.length - 1) {
        return tatweelLine(line, targetW, ctx, fontSz, activeLayer.style.fontFamily, tatweelStrength);
      }
      return line;
    });

    const previousLayers = [...currentLayers];
    handleUpdateLayer(activeLayer.id, {
      preTatweelText: activeLayer.text,
      text: stretched.join('\n'),
    });

    pushToHistory(previousLayers);
    addToast('✓ تم إطعام النص الكشيدات والتمطيط بالشكل المتوازن', 'success');
  };

  const handleUndoTatweel = () => {
    if (!activeLayer || !activeLayer.preTatweelText) {
      addToast('لا يتوفر تمطيط محفوظ للتراجع عنه في هذه الطبقة', 'error');
      return;
    }
    const previousLayers = [...currentLayers];
    handleUpdateLayer(activeLayer.id, {
      text: activeLayer.preTatweelText,
      preTatweelText: undefined,
    });
    pushToHistory(previousLayers);
    addToast('تراجع عن تمطيط الأسطر');
  };

  const handleRemoveAllTatweel = () => {
    if (!activeLayer) {
      addToast('❌ يرجى تحديد طبقة نصية لإلغاء التمطيط منها', 'error');
      return;
    }

    const cleanRawText = activeLayer.text.replace(/\u0640/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanRawText) return;

    const previousLayers = [...currentLayers];
    const layerWidth = parseFloat(activeLayer.width) || 120;
    const layerHeight = parseFloat(activeLayer.height) || 80;
    const shape = detectedBubbleType || 'normal_oval';

    const opt = calculateOptimalFontSizeForShape(
      cleanRawText,
      shape,
      layerWidth,
      layerHeight,
      activeLayer.style.fontFamily,
      activeLayer.style.lineHeight,
      parseFloat(activeLayer.style.letterSpacing) || 0,
      bubbleMargin,
      activeLayer.lineCountOverride,
      false
    );

    let finalFontSize = opt.fontSize;
    let finalTxt = opt.textWithBreaks;

    if (fontSize !== 'auto') {
      const userCap = parseFloat(fontSize);
      if (!isNaN(userCap) && finalFontSize > userCap) {
        finalFontSize = userCap;
        const wrapRes = wrapTextToShape(
          cleanRawText,
          shape,
          layerWidth,
          layerHeight,
          userCap,
          activeLayer.style.fontFamily,
          activeLayer.style.lineHeight,
          parseFloat(activeLayer.style.letterSpacing) || 0,
          bubbleMargin,
          activeLayer.lineCountOverride,
          false
        );
        finalTxt = wrapRes.lines.join('\n');
      }
    }

    handleUpdateLayer(activeLayer.id, {
      text: finalTxt,
      preTatweelText: activeLayer.text,
      style: {
        ...activeLayer.style,
        fontSize: autoFitText ? `${finalFontSize}px` : activeLayer.style.fontSize,
      },
    });

    pushToHistory(previousLayers);
    addToast('✓ تم إلغاء الكشيدات والحفاظ على ترتيب الأسطر هندسياً بنجاح 🧹', 'success');
  };

  const handleStepTatweel = (stepCount?: number) => {
    if (!activeLayer) {
      addToast('❌ يرجى تحديد طبقة نصية أولاً لزيادة التمطيط', 'error');
      return;
    }

    const step = stepCount !== undefined ? stepCount : manualTatweelStep;
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    const previousLayers = [...currentLayers];
    const updatedText = stepTatweel(activeLayer.text, step, selectedText);

    if (updatedText === activeLayer.text) {
      addToast('⚠️ لم يتم العثور على أحرف قابلة للتمديد في هذا الموضع', 'error');
      return;
    }

    handleUpdateLayer(activeLayer.id, {
      preTatweelText: activeLayer.text,
      text: updatedText,
    });

    pushToHistory(previousLayers);
    addToast(`✓ تم زيادة التمديد (+${step}) بنجاح ـ`, 'success');
  };

  const handleAddFolder = () => {
    const name = prompt('أدخل اسم المجلد الإداري الجديد للأنماط:');
    if (name) {
      setFolders(prev => [...prev, { id: `folder_${Date.now()}`, name, styles: [] }]);
      addToast(`مجلد "${name}" جاهز الآن`);
    }
  };

  const handleAddStyle = () => {
    if (folders.length === 0) {
      addToast('أضف مجلداً تصنيفياً أولاً لتجميع هذا النمط بداخله', 'error');
      return;
    }
    const name = prompt('أدخل اسم النمط الجديد:');
    if (!name) return;

    let targetFolderId = folders[0].id;

    if (folders.length > 1) {
      const folderListStr = folders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
      const selection = prompt(`اختر رقم المجلد لإضافة النمط إليه:\n${folderListStr}`, "1");
      if (selection) {
        const idx = parseInt(selection) - 1;
        if (idx >= 0 && idx < folders.length) {
          targetFolderId = folders[idx].id;
        }
      }
    }

    const newStyle: TextStyle = {
      id: `style_${Date.now()}`,
      name,
      fontSize: 'auto',
      color: '#000000',
      bgColor: 'transparent',
      tracking: 0,
      lineHeight: 1.25,
      textAlign: 'center',
      fontFamily: fontFamily || (customFonts[0]?.value || ''),
      tags: [name.toLowerCase()],
      enabled: true,
      tagColor: '#FFF3B0',
      strokeColor: '#ffffff',
      strokeWidth: 0,
      updatedAt: Date.now()
    };

    setFolders(prev =>
      prev.map(f => {
        if (f.id !== targetFolderId) return f;
        return { ...f, styles: [...f.styles, newStyle] };
      })
    );
    setSelectedStyleId(newStyle.id);
    addToast(`تم تكوين النمط "${name}" وتخزينه بنجاح`, 'success');
  };

  const handleDuplicateStyle = (style: TextStyle, folderId: string) => {
    const cloneStyle: TextStyle = {
      ...style,
      id: `style_${Date.now()}_copy`,
      name: `${style.name} (نسخة)`,
      tags: [...style.tags.map(t => `${t}_copy`)],
      updatedAt: Date.now()
    };

    setFolders(prev =>
      prev.map(f => {
        if (f.id !== folderId) return f;
        return { ...f, styles: [...f.styles, cloneStyle] };
      })
    );
    setSelectedStyleId(cloneStyle.id);
    addToast(`✓ تم نسخ وتحديد النمط "${cloneStyle.name}" جاهز للتطبيق 📋`, 'success');
  };

  const handleExportAllStyles = () => {
    if (folders.length === 0) {
      addToast('⚠️ لا توجد أنماط لتصديرها حالياً', 'error');
      return;
    }
    const jsonStr = JSON.stringify(folders, null, 2);
    handleShareFile(jsonStr, "all-manga-styles.json", "مشاركة كافة أنماط تايبر مانجا المخصصة");
  };

  const handleImportAllStyles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].styles) {
          setFolders(parsed);
          localStorage.setItem('typer_studio_folders', JSON.stringify(parsed));
          addToast(`✓ تم استيراد جميع المجلدات (${parsed.length}) والأنماط بنجاح! 📥`, 'success');
        } else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
          const importedFolder: StyleFolder = {
            id: `folder_imported_${Date.now()}`,
            name: "أنماط مستوردة",
            styles: parsed
          };
          setFolders(prev => [...prev, importedFolder]);
          addToast(`✓ تم استيراد الأنماط (${parsed.length}) في مجلد جديد بنجاح! 📥`, 'success');
        } else if (parsed && parsed.name && Array.isArray(parsed.styles)) {
          setFolders(prev => [...prev, parsed]);
          addToast(`✓ تم استيراد المجلد "${parsed.name}" بنجاح! 📥`, 'success');
        } else {
          addToast('❌ تنسيق ملف الاستيراد غير صالح', 'error');
        }
      } catch (err) {
        addToast('❌ فشل في قراءة محتوى ملف الـ JSON', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 🌈 تصدير ومشاركة قوالب تدريج الألوان
  const handleExportGradients = () => {
    if (gradientPresets.length === 0) {
      addToast('⚠️ لا توجد قوالب تدريج محفوظة لتصديرها', 'error');
      return;
    }
    const jsonStr = JSON.stringify(gradientPresets, null, 2);
    handleShareFile(jsonStr, "text-gradients.json", "مشاركة تدريجات ألوان نصوص تايبر مانجا");
  };

  // 🌈 استيراد قوالب تدريج الألوان
  const handleImportGradients = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].colors) {
          setGradientPresets(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newOnes = parsed.filter((p: GradientPreset) => !existingIds.has(p.id));
            return [...prev, ...newOnes];
          });
          addToast(`✓ تم استيراد عدد (${parsed.length}) تدريج لوني بنجاح! 📥`, 'success');
        } else {
          addToast('❌ تنسيق ملف تدريجات الألوان غير صالح', 'error');
        }
      } catch (err) {
        addToast('❌ فشل في قراءة ملف تدريجات الألوان', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 🌈 تطبيق تدريج لوني على الطبقة النشطة والنمط النشط
  const handleApplyGradientToActiveLayer = (gradient: TextGradient | null) => {
    setActiveGradient(gradient);
    updateActiveStyleInFolders({ gradient: gradient || undefined });

    if (activeLayerRef.current) {
      handleUpdateLayer(activeLayerRef.current.id, {
        style: {
          ...activeLayerRef.current.style,
          gradient: gradient || undefined,
        }
      });
      addToast(gradient ? '✓ تم تطبيق تدريج الألوان على النص بنجاح 🌈' : '✓ تم إزالة التدريج والعودة للون العادي', 'success');
    }
  };

  // 🔍 خوارزمية ذكية لاستخراج التدريج والـ Stroke من التحديد الحالي في صورة المانجا مباشرة
  const handleSampleGradientFromSelection = () => {
    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    if (!imgEl || !imgEl.naturalWidth) {
      addToast('❌ لم يتم العثور على صورة المانجا لاستخراج الألوان', 'error');
      return;
    }

    let rect = { x: 0, y: 0, width: 0, height: 0 };
    if (selectionBox && selectionBox.visible && selectionBox.width >= 5 && selectionBox.height >= 5) {
      rect = { x: selectionBox.left, y: selectionBox.top, width: selectionBox.width, height: selectionBox.height };
    } else if (wandDimensions && wandDimensions.w >= 5 && wandDimensions.h >= 5) {
      const scaleX = imgEl.naturalWidth / imgEl.offsetWidth;
      const scaleY = imgEl.naturalHeight / imgEl.offsetHeight;
      rect = {
        x: wandDimensions.x / scaleX,
        y: wandDimensions.y / scaleY,
        width: wandDimensions.w / scaleX,
        height: wandDimensions.h / scaleY,
      };
    } else {
      addToast('⚠️ يرجى تحديد النص بالمستطيل أو العصا أولاً لشفط تدريجه والـ Stroke', 'error');
      return;
    }

    const result = extractGradientAndStrokeFromSelection(
      imgEl,
      rect,
      wandMask,
      wandDimensions?.imgW,
      wandDimensions?.imgH
    );

    if (!result) {
      addToast('⚠️ لم يتم العثور على نص أو تباين لوني واضح داخل منطقة التحديد', 'error');
      return;
    }

    // 1. تحديث الألوان المستخرجة
    setTextColor(result.textColor);
    setStrokeColor(result.strokeColor);
    setStrokeWidth(result.strokeWidth);

    const newGrad: TextGradient = {
      enabled: true,
      type: 'linear',
      colors: [result.color1, result.color2],
      angle: result.angle,
    };
    setActiveGradient(newGrad);

    // 2. تطبيق على الطبقة النشطة إن وُجدت
    if (activeLayerRef.current) {
      handleUpdateLayer(activeLayerRef.current.id, {
        style: {
          ...activeLayerRef.current.style,
          color: result.textColor,
          strokeColor: result.strokeColor,
          strokeWidth: result.strokeWidth,
          gradient: newGrad,
        }
      });
    }

    // 3. حفظ النمط الجديد تلقائياً في شبكة الستايلات الأيقونية لسهولة استخدامه لاحقاً
    const newPreset: GradientPreset = {
      id: `grad_sample_${Date.now()}`,
      name: `مستخرج ${gradientPresets.length + 1}`,
      colors: [result.color1, result.color2],
      angle: result.angle,
      type: 'linear',
      strokeColor: result.strokeColor,
      strokeWidth: result.strokeWidth,
    };
    setGradientPresets(prev => [newPreset, ...prev]);

    updateActiveStyleInFolders({
      color: result.textColor,
      strokeColor: result.strokeColor,
      strokeWidth: result.strokeWidth,
      gradient: newGrad,
    });

    addToast('✓ تم شفط ألوان التدريج والـ Stroke من التحديد وحفظه في الاستايلات! 🎨✨', 'success');
  };

  // 🌈 نسخ تدريج النص من الطبقة النشطة أو التحديد الحالي
  const handleCopyGradientFromActiveLayer = () => {
    if (activeLayerRef.current && activeLayerRef.current.style.gradient && activeLayerRef.current.style.gradient.enabled) {
      setActiveGradient(activeLayerRef.current.style.gradient);
      addToast('✓ تم نسخ تدريج الألوان من النص بنجاح 📋', 'success');
      return;
    }

    // إذا لم تكن هناك طبقة نصية، ولكن المستخدم يحدد منطقة في الصورة، نشفط منها فوراً!
    if ((selectionBox && selectionBox.visible && selectionBox.width >= 5) || wandDimensions) {
      handleSampleGradientFromSelection();
      return;
    }

    addToast('❌ حدد طبقة نصية أو ارسم مستطيل تحديد فوق النص بالصورة لشفط ألوانه', 'error');
  };

  const handleDeleteFolder = (folderId: string) => {
    const target = folders.find(f => f.id === folderId);
    if (!target) return;
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف المجلد "${target.name}" وجميع الأنماط التنسيقية المندرجة بداخله؟`);
    if (!confirmDelete) return;

    setFolders(prev => prev.filter(f => f.id !== folderId));
    addToast(`✓ تم حذف المجلد "${target.name}" بنجاح`, 'success');
  };

  const handleSaveEditedStyle = (updatedStyle: TextStyle, targetFolderId: string) => {
    setFolders(prev => {
      const cleaned = prev.map(f => ({
        ...f,
        styles: f.styles.filter(s => s.id !== updatedStyle.id)
      }));
      return cleaned.map(f => {
        if (f.id !== targetFolderId) return f;
        return {
          ...f,
          styles: [...f.styles, updatedStyle]
        };
      });
    });
    setEditingStyle(null);
    addToast('✓ تم حفظ التعديلات على النمط بنجاح', 'success');
  };

  const handleDeleteStyle = (styleId: string) => {
    const confirmDelete = window.confirm('هل أنت متأكد من حذف هذا النمط التنسيقي نهائياً؟');
    if (!confirmDelete) return;

    setFolders(prev =>
      prev.map(f => ({
        ...f,
        styles: f.styles.filter(s => s.id !== styleId)
      }))
    );
    if (selectedStyleId === styleId) {
      setSelectedStyleId('style_normal');
    }
    setEditingStyle(null);
    addToast('✓ تم حذف النمط التنسيقي بنجاح', 'success');
  };

  const handleOpenEditStyle = (style: TextStyle, folderId: string) => {
    setEditingStyle({ style, folderId });
    setEditFormName(style.name);
    setEditFormFolderId(folderId);
    setEditFormFamily(style.fontFamily);
    setEditFormSize(style.fontSize === 'auto' ? 'auto' : `${style.fontSize}`);
    setEditFormColor(style.color);
    setEditFormBg(style.bgColor || 'transparent');
    setEditFormTracking(style.tracking);
    setEditFormLineHeight(style.lineHeight);
    setEditFormAlign(style.textAlign);
    setEditFormBold(!!style.bold);
    setEditFormItalic(!!style.italic);
    setEditFormUnderline(!!style.underline);
    setEditFormTags(style.tags.join(' '));
    setEditFormTagColor(style.tagColor || '#FFF3B0');
  };

  const handleCopyActiveLayerStyleToForm = () => {
    if (!activeLayer) {
      addToast('❌ حدد طبقة نصية نشطة في مسرح العمل أولاً لنسخ تنسيقها', 'error');
      return;
    }
    setEditFormFamily(activeLayer.style.fontFamily);
    setEditFormSize(activeLayer.style.fontSize.replace('px', '') || '16');
    setEditFormColor(activeLayer.style.color);
    setEditFormBg(activeLayer.style.bgColor);
    setEditFormTracking(parseFloat(activeLayer.style.letterSpacing) || 0);
    setEditFormLineHeight(activeLayer.style.lineHeight);
    setEditFormAlign(activeLayer.style.textAlign);
    setEditFormBold(activeLayer.style.fontWeight === 'bold');
    setEditFormItalic(activeLayer.style.fontStyle === 'italic');
    setEditFormUnderline(activeLayer.style.textDecoration === 'underline');
    addToast('✓ تم نسخ ومطابقة تنسيق الطبقة النشطة بنجاح', 'success');
  };

  const handleDuplicateFolder = (folderId: string) => {
    const target = folders.find(f => f.id === folderId);
    if (!target) return;

    const clone: StyleFolder = JSON.parse(JSON.stringify(target));
    clone.id = `folder_${Date.now()}`;
    clone.name = `${clone.name} (نسخة مكررة)`;
    clone.styles.forEach(s => { s.id = `style_${Math.random().toString(36).substring(2, 9)}`; });

    setFolders(prev => [...prev, clone]);
    addToast(`تم تكرار تصنيف "${target.name}"`);
  };

  const handleShareFolder = (folderId: string) => {
    const target = folders.find(f => f.id === folderId);
    if (!target) return;

    const jsonContent = JSON.stringify(target, null, 2);
    handleShareFile(jsonContent, `folder-${target.name}.json`, `مشاركة مجلد الأنماط: ${target.name}`);
  };

  const handleImportFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.name && Array.isArray(parsed.styles)) {
          parsed.id = `folder_${Date.now()}`;
          setFolders(prev => [...prev, parsed]);
          addToast(`تم استيراد المجلد "${parsed.name}" نجاحاً`, 'success');
        } else {
          addToast('هيكل ملف الاستيراد غير صالح لتصنيف المجلدات', 'error');
        }
      } catch (err) {
        addToast('فشل في قراءة ملف JSON المستورد', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 💾 تطبيق وحفظ التنسيق بما في ذلك الـ Stroke والتدريج
  const handleApplyStyleToActiveLayer = () => {
    const optFs = fontSize === 'auto' ? 'auto' : (parseFloat(fontSize) || 16);

    updateActiveStyleInFolders({
      fontFamily,
      fontSize: optFs,
      color: textColor,
      bgColor: bgTransparent ? 'transparent' : bgColor,
      tracking,
      lineHeight,
      textAlign,
      bold,
      italic,
      underline,
      strokeColor,
      strokeWidth,
      gradient: activeGradient || undefined,
    });

    if (activeLayer) {
      const prevLayers = [...currentLayers];
      const calcFs = fontSize === 'auto'
        ? calculateOptimalFontSize(
            activeLayer.text,
            parseFloat(activeLayer.width) || 120,
            parseFloat(activeLayer.height) || 80,
            fontFamily,
            lineHeight,
            tracking
          )
        : parseFloat(fontSize);

      handleUpdateLayer(activeLayer.id, {
        style: {
          fontSize: `${calcFs}px`,
          color: textColor,
          fontFamily: fontFamily,
          fontWeight: bold ? 'bold' : 'normal',
          fontStyle: italic ? 'italic' : 'normal',
          textDecoration: underline ? 'underline' : 'none',
          textAlign: textAlign,
          lineHeight: lineHeight,
          letterSpacing: tracking > 0 ? `${tracking}px` : '0px',
          bgColor: bgTransparent ? 'transparent' : bgColor,
          strokeColor: strokeColor,
          strokeWidth: strokeWidth,
          gradient: activeGradient || undefined,
        },
      });

      pushToHistory(prevLayers);
    }

    addToast('✓ تم تطبيق وحفظ التنسيق والحد الخارجي بنجاح 💾', 'success');
  };

  // 🖼️ رسم الطبقات للكانفاس مع دعم كامل للـ Stroke والتدريجات اللونية
  const renderLayerToCanvasBuffer = (
    ctx: CanvasRenderingContext2D,
    layer: MangaLayer,
    scaleX: number,
    scaleY: number,
    imageCache?: Map<string, HTMLImageElement>
  ) => {
    const left = parseFloat(layer.left) * scaleX;
    const top = parseFloat(layer.top) * scaleY;
    const width = parseFloat(layer.width) * scaleX;
    const height = parseFloat(layer.height) * scaleY;

    ctx.save();

    ctx.translate(left + width / 2, top + height / 2);
    ctx.rotate(((layer.angle || 0) * Math.PI) / 180);
    if (layer.flippedY) ctx.scale(1, -1);

    if (layer.type === 'image' && layer.imageSrc) {
      const img = imageCache?.get(layer.id);
      if (img) {
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
      }
      ctx.restore();
      return;
    }

    if (layer.type === 'path' && layer.pathPoints) {
      ctx.beginPath();
      const pts = layer.pathPoints;
      if (pts.length > 0) {
        const startX = (pts[0].x - parseFloat(layer.width) / 2) * scaleX;
        const startY = (pts[0].y - parseFloat(layer.height) / 2) * scaleY;
        ctx.moveTo(startX, startY);

        for (let i = 1; i < pts.length; i++) {
          const currX = (pts[i].x - parseFloat(layer.width) / 2) * scaleX;
          const currY = (pts[i].y - parseFloat(layer.height) / 2) * scaleY;
          ctx.lineTo(currX, currY);
        }

        if (layer.fillColor && layer.fillColor !== 'none') {
          ctx.fillStyle = layer.fillColor;
          ctx.fill();
        }
        ctx.strokeStyle = layer.strokeColor || '#000000';
        ctx.lineWidth = (layer.strokeWidth || 3) * scaleY;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    const style = layer.style;
    const fs = (parseFloat(style.fontSize) || 16) * scaleY;
    const col = style.color || '#000000';
    const bgCol = style.bgColor || 'transparent';

    if (bgCol !== 'transparent' && bgCol !== 'rgba(0,0,0,0)' && bgCol !== 'rgba(0, 0, 0, 0)') {
      ctx.fillStyle = bgCol;
      ctx.fillRect(-width / 2, -height / 2, width, height);
    }

    // إعداد تدريج الألوان إن وجد
    let fillStyle: string | CanvasGradient = col;
    if (style.gradient && style.gradient.enabled && style.gradient.colors && style.gradient.colors.length >= 2) {
      const angleRad = ((style.gradient.angle || 90) * Math.PI) / 180;
      const x1 = (-width / 2) * Math.cos(angleRad);
      const y1 = (-height / 2) * Math.sin(angleRad);
      const x2 = (width / 2) * Math.cos(angleRad);
      const y2 = (height / 2) * Math.sin(angleRad);

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      style.gradient.colors.forEach((c, idx) => {
        grad.addColorStop(idx / (style.gradient!.colors.length - 1), c);
      });
      fillStyle = grad;
    }

    ctx.fillStyle = fillStyle;
    const fWeight = style.fontWeight || 'normal';
    const fStyle = style.fontStyle || 'normal';
    ctx.font = `${fStyle} ${fWeight} ${fs}px ${formatFontFamilyForCanvas(style.fontFamily)}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = style.textAlign || 'center';
    ctx.direction = 'rtl';

    const rawLines = layer.text.split('\n');
    const lines: string[] = [];
    
    rawLines.forEach(rawLine => {
      const words = rawLine.split(' ');
      let currentLine = '';
      for (let n = 0; n < words.length; n++) {
        const word = words[n];
        if (!word && n > 0) continue;
        const test = currentLine ? currentLine + ' ' + word : word;
        if (ctx.measureText(test).width > width && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      } else if (rawLine === '') {
        lines.push('');
      }
    });

    const lineH = fs * (style.lineHeight || 1.25);
    const totalH = lines.length * lineH;
    const startY = -totalH / 2 + lineH / 2;
    const xPos = style.textAlign === 'right' ? width / 2 - 4
               : style.textAlign === 'left'  ? -width / 2 + 4
               : 0;

    const sWidth = (style.strokeWidth || 0) * scaleY;
    const sColor = style.strokeColor || '#ffffff';

    lines.forEach((lineVal, idx) => {
      const yPos = startY + idx * lineH;

      // 🖌️ رسم الـ Stroke الخارجي أولاً حتى لا يتداخل مع تعبئة النص الداخلي
      if (sWidth > 0) {
        ctx.save();
        ctx.strokeStyle = sColor;
        ctx.lineWidth = sWidth * 2;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(lineVal, xPos, yPos);
        ctx.restore();
      }

      // رسم ملء النص الداخلي
      ctx.fillText(lineVal, xPos, yPos);

      if (style.textDecoration === 'underline') {
        const metrics = ctx.measureText(lineVal);
        const ux = style.textAlign === 'center' ? xPos - metrics.width / 2 : xPos;
        ctx.fillRect(ux, yPos + fs * 0.55, metrics.width, Math.max(1, fs * 0.07));
      }
    });

    ctx.restore();
  };

  const drawWatermarkToCanvas = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    callback: () => void
  ) => {
    if (!watermarkEnabled) {
      callback();
      return;
    }

    ctx.save();
    ctx.globalAlpha = watermarkOpacity;

    const size = watermarkSize;
    const padding = Math.max(15, Math.min(width, height) * 0.03);

    let x = padding;
    let y = padding;

    if (watermarkPosition === 'top-left') {
      x = padding;
      y = padding;
    } else if (watermarkPosition === 'top-right') {
      x = width - padding;
      y = padding;
    } else if (watermarkPosition === 'bottom-left') {
      x = padding;
      y = height - padding;
    } else if (watermarkPosition === 'bottom-right') {
      x = width - padding;
      y = height - padding;
    }

    const finalize = () => {
      ctx.restore();
      callback();
    };

    if (watermarkType === 'text') {
      ctx.font = `bold ${size}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      if (watermarkPosition.includes('right')) {
        ctx.textAlign = 'right';
      } else {
        ctx.textAlign = 'left';
      }

      if (watermarkPosition.includes('bottom')) {
        ctx.textBaseline = 'bottom';
      } else {
        ctx.textBaseline = 'top';
      }

      ctx.fillText(watermarkText, x, y);
      finalize();
    } else if (watermarkType === 'image' && watermarkImage) {
      const wmImg = new Image();
      wmImg.onload = () => {
        const aspect = wmImg.width / wmImg.height;
        const w = size * 4;
        const h = w / aspect;

        let drawX = x;
        let drawY = y;

        if (watermarkPosition.includes('right')) {
          drawX = x - w;
        }
        if (watermarkPosition.includes('bottom')) {
          drawY = y - h;
        }

        ctx.drawImage(wmImg, drawX, drawY, w, h);
        finalize();
      };
      wmImg.onerror = () => {
        ctx.font = `bold ${size}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        if (watermarkPosition.includes('right')) {
          ctx.textAlign = 'right';
        } else {
          ctx.textAlign = 'left';
        }
        if (watermarkPosition.includes('bottom')) {
          ctx.textBaseline = 'bottom';
        } else {
          ctx.textBaseline = 'top';
        }
        ctx.fillText(watermarkText, x, y);
        finalize();
      };
      wmImg.src = watermarkImage;
    } else {
      finalize();
    }
  };

  const handleExportPNG = async () => {
    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    if (!imgEl || !imgEl.naturalWidth || pages.length === 0) {
      addToast('لا تتوفر صفحة مانجا نشطة لتصديرها', 'error');
      return;
    }

    addToast('🔄 جاري تحضير الصفحة للتصدير...', 'success');

    try {
      const imageCache = await preloadImageLayers(currentLayers);
      const canvas = document.createElement('canvas');
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(imgEl, 0, 0);

      const cleaningCanvas = cleaningCanvasRef.current;
      if (cleaningCanvas) {
        ctx.drawImage(cleaningCanvas, 0, 0);
      }

      const scaleX = imgEl.naturalWidth / imgEl.offsetWidth;
      const scaleY = imgEl.naturalHeight / imgEl.offsetHeight;

      currentLayers.forEach(l => {
        if (!l.hidden) {
          renderLayerToCanvasBuffer(ctx, l, scaleX, scaleY, imageCache);
        }
      });

      drawWatermarkToCanvas(ctx, canvas.width, canvas.height, () => {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const blob = dataURLtoBlob(dataUrl);
          triggerDownload(blob, `typer-translated-${pages[currentPageIndex]?.name || 'page'}.png`);
        } catch (e) {
          console.error(e);
          addToast('حدث خطأ أثناء معالجة الصورة وتصديرها', 'error');
        }
      });
    } catch (err) {
      console.error(err);
      addToast('❌ فشل تصدير الصورة لوجود خطأ في تحميل الطبقات', 'error');
    }
  };

  const handleShare = async () => {
    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    if (!imgEl || !imgEl.naturalWidth || pages.length === 0) {
      addToast('⚠️ لا تتوفر صفحة مانجا نشطة لمشاركتها', 'error');
      return;
    }

    addToast('🔄 جاري تحضير وتسطيح الصفحة للمشاركة...', 'success');

    try {
      const imageCache = await preloadImageLayers(currentLayers);
      const canvas = document.createElement('canvas');
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(imgEl, 0, 0);

      const cleaningCanvas = cleaningCanvasRef.current;
      if (cleaningCanvas) {
        ctx.drawImage(cleaningCanvas, 0, 0);
      }

      const scaleX = imgEl.naturalWidth / imgEl.offsetWidth;
      const scaleY = imgEl.naturalHeight / imgEl.offsetHeight;

      currentLayers.forEach(l => {
        if (!l.hidden) {
          renderLayerToCanvasBuffer(ctx, l, scaleX, scaleY, imageCache);
        }
      });

      drawWatermarkToCanvas(ctx, canvas.width, canvas.height, async () => {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const filename = `typer-translated-${pages[currentPageIndex]?.name || 'page'}.png`;

          if (Capacitor && Capacitor.isNativePlatform()) {
            try {
              if (!Filesystem || !Share || !Directory) {
                addToast('⚠️ جاري معالجة تفعيل حزم المشاركة، يرجى المحاولة بعد قليل...', 'error');
                return;
              }
              const base64Raw = dataUrl.split(',')[1] || dataUrl;
              
              await Filesystem.writeFile({
                path: filename,
                data: base64Raw,
                directory: Directory.Cache,
              });

              const fileUriResult = await Filesystem.getUri({
                directory: Directory.Cache,
                path: filename,
              });

              await Share.share({
                title: 'TypeR Studio - مشاركة ترجمة المانجا',
                files: [fileUriResult.uri],
              });

              await Filesystem.deleteFile({
                directory: Directory.Cache,
                path: filename,
              });

              addToast('✓ تم استدعاء قائمة المشاركة الأصلية بنجاح 📤', 'success');
            } catch (nativeErr) {
              console.error('Native sharing error:', nativeErr);
              addToast('❌ فشل استدعاء المشاركة الأصلية للنظام', 'error');
            }
            return;
          }

          const blob = dataURLtoBlob(dataUrl);
          const file = new File([blob], filename, { type: 'image/png' });

          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'TypeR Studio - مشاركة ترجمة المانجا',
              text: 'لقد قمت بترجمة صفحة مانجا باستخدام تطبيق تايبر ستوديو! 🚀🎨',
            });
            addToast('✓ تم فتح نافذة المشاركة لتطبيقاتك بنجاح 📤', 'success');
          } else {
            setFallbackFile({ url: dataUrl, blob, filename });
            addToast('⚠️ ميزة المشاركة المباشرة غير مدعومة في متصفحك. تم فتح نافذة الحفظ الاحتياطية.', 'error');
          }
        } catch (e: any) {
          console.error(e);
          if (e.name !== 'AbortError') {
            addToast('حدث خطأ أثناء محاولة مشاركة الصورة', 'error');
          }
        }
      });
    } catch (err) {
      console.error(err);
      addToast('❌ خطأ أثناء معالجة دمج طبقات الصور للمشاركة', 'error');
    }
  };

  const handleSaveState = () => {
    const stripPages = pages.map(p => ({
      name: p.name,
      layers: p.layers,
    }));

    const pkg = {
      folders,
      pages: stripPages,
      scriptInput,
      customFonts: customFonts.map(f => ({ name: f.name, value: f.value })),
      favFonts,
      gradientPresets,
      watermarkEnabled,
      watermarkType,
      watermarkText,
      watermarkImage,
      watermarkOpacity,
      watermarkPosition,
      watermarkSize,
      bubbleMargin,
    };

    try {
      localStorage.setItem('typer_studio_pro_state', JSON.stringify(pkg));
      addToast('✓ تم حفظ الحالة في المتصفح! (الصفحات ذاتها بحاجة لرفعها مرة أخرى بعد الاستعادة)', 'success');
    } catch {
      addToast('❌ تخزين البيانات ممتلئ! لم يتم حفظ الحالة', 'error');
    }
  };

  const handleRestoreState = () => {
    const data = localStorage.getItem('typer_studio_pro_state');
    if (!data) {
      addToast('لا توجد حالة محفوظة متوفرة مسبقاً', 'error');
      return;
    }

    try {
      const pkg = JSON.parse(data);
      if (pkg.folders) setFolders(pkg.folders);
      if (pkg.scriptInput) setScriptInput(pkg.scriptInput);
      if (pkg.favFonts) setFavFonts(pkg.favFonts);
      if (pkg.gradientPresets) setGradientPresets(pkg.gradientPresets);

      if (pkg.watermarkEnabled !== undefined) setWatermarkEnabled(pkg.watermarkEnabled);
      if (pkg.watermarkType !== undefined) setWatermarkType(pkg.watermarkType);
      if (pkg.watermarkText !== undefined) setWatermarkText(pkg.watermarkText);
      if (pkg.watermarkImage !== undefined) setWatermarkImage(pkg.watermarkImage);
      if (pkg.watermarkOpacity !== undefined) setWatermarkOpacity(pkg.watermarkOpacity);
      if (pkg.watermarkPosition !== undefined) setWatermarkPosition(pkg.watermarkPosition);
      if (pkg.watermarkSize !== undefined) setWatermarkSize(pkg.watermarkSize);
      if (pkg.bubbleMargin !== undefined) setBubbleMargin(pkg.bubbleMargin);

      if (pkg.pages && pages.length > 0) {
        setPages(prev =>
          prev.map(p => {
            const found = pkg.pages.find((x: any) => x.name === p.name);
            return found ? { ...p, layers: found.layers } : p;
          })
        );
      }

      addToast('✓ تمت استعادة الحالة التحريرية والتصنيفات بنجاح', 'success');
    } catch {
      addToast('❌ فشل في قراءة حزمة البيانات المحفوظة', 'error');
    }
  };

  const handleStretchSelected = useCallback(() => {
    if (!activeLayer) {
      addToast('❌ يرجى تحديد طبقة نصية لتطبيق التمطيط', 'error');
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    const previousLayers = [...currentLayers];
    const layerWidth = parseFloat(activeLayer.width) || 120;
    const fontSz = parseFloat(activeLayer.style.fontSize) || 16;
    const bType = detectedBubbleType || 'normal_oval';

    const textToStretch = selectedText.length > 0 ? selectedText : activeLayer.text;

    const updatedText = stretchSelectedText(
      activeLayer.text,
      textToStretch,
      bType,
      layerWidth,
      fontSz,
      activeLayer.style.fontFamily,
      parseFloat(activeLayer.style.letterSpacing) || 0,
      10
    );

    handleUpdateLayer(activeLayer.id, {
      preTatweelText: activeLayer.text,
      text: updatedText,
    });

    pushToHistory(previousLayers);
    addToast('✓ تم تطبيق التمطيط اليدوي على الجزء المحدد بنجاح', 'success');
  }, [activeLayer, currentLayers, detectedBubbleType, handleUpdateLayer, pushToHistory]);

  const handleApplyBubbleQueue = () => {
    if (bubbleQueue.length === 0) return;
    const lines = parsedLinesRef.current.length > 0 ? parsedLinesRef.current : parsedLines;
    if (lines.length === 0) {
      addToast('❌ الصق النص المعالج المترجم أولاً لتطبيقه على الفقاعات', 'error');
      return;
    }

    let lineIdx = currentLineIndex < 0 ? 0 : currentLineIndex;
    let pasteCount = 0;
    const prevLayers = [...currentLayers];
    const newAddedLayers: MangaLayer[] = [];

    const BUBBLE_MARGIN_10 = 10;

    bubbleQueue.forEach(b => {
      if (lineIdx >= lines.length) return;
      const line = lines[lineIdx];
      const lineText = line.text;

      const matchedStyle = resolveStyleForLine(line.styleKey);

      const activeFontFamily = matchedStyle && matchedStyle.fontFamily
        ? matchedStyle.fontFamily 
        : (fontFamily || (customFonts[0]?.value || ''));
      const activeColor = matchedStyle ? matchedStyle.color : textColor;
      const activeFontSize = matchedStyle ? (matchedStyle.fontSize === 'auto' ? 'auto' : `${matchedStyle.fontSize}`) : fontSize;
      const activeBold = matchedStyle ? !!matchedStyle.bold : bold;
      const activeItalic = matchedStyle ? !!matchedStyle.italic : italic;
      const activeUnderline = matchedStyle ? !!matchedStyle.underline : underline;
      const activeTextAlign = matchedStyle ? matchedStyle.textAlign : textAlign;
      const activeLineHeight = matchedStyle ? (matchedStyle.lineHeight || 1.25) : lineHeight;
      const activeTracking = matchedStyle ? matchedStyle.tracking : tracking;
      const activeStrokeCol = matchedStyle?.strokeColor || strokeColor || '#ffffff';
      const activeStrokeWid = matchedStyle?.strokeWidth !== undefined ? matchedStyle.strokeWidth : strokeWidth;
      const activeGrad = matchedStyle?.gradient || activeGradient || undefined;

      const layStyle = {
        fontSize: activeFontSize === 'auto' ? '' : `${parseFloat(activeFontSize)}px`,
        color: activeColor,
        fontFamily: activeFontFamily,
        fontWeight: activeBold ? 'bold' : 'normal',
        fontStyle: activeItalic ? 'italic' : 'normal',
        textDecoration: activeUnderline ? 'underline' : 'none',
        textAlign: activeTextAlign,
        lineHeight: activeLineHeight,
        letterSpacing: activeTracking > 0 ? `${activeTracking}px` : '0px',
        bgColor: 'transparent',
        strokeColor: activeStrokeCol,
        strokeWidth: activeStrokeWid,
        gradient: activeGrad,
      };

      const { left: layerLeft, top: layerTop, width: layerWidth, height: layerHeight } =
        computeLayerBoundsFromWand({
          bboxX: b.bboxX,
          bboxY: b.bboxY,
          bboxW: b.bboxW,
          bboxH: b.bboxH,
          scaleX: b.scaleX,
          scaleY: b.scaleY,
          marginPercent: BUBBLE_MARGIN_10,
          mask: b.mask,
          imgW: b.imgW,
          imgH: b.imgH,
          bubbleType: b.shape,
        });

      let activeText = lineText;
      if (b.shape) {
        const opt = calculateOptimalFontSizeForShape(
          lineText,
          b.shape,
          layerWidth,
          layerHeight,
          layStyle.fontFamily,
          layStyle.lineHeight,
          activeTracking,
          BUBBLE_MARGIN_10,
          undefined,
          true
        );

        let finalFontSize = opt.fontSize;
        activeText = opt.textWithBreaks;

        if (activeFontSize !== 'auto') {
          const userCap = parseFloat(activeFontSize);
          if (!isNaN(userCap) && finalFontSize > userCap) {
            finalFontSize = userCap;
            const wrapRes = wrapTextToShape(
              lineText,
              b.shape,
              layerWidth,
              layerHeight,
              userCap,
              layStyle.fontFamily,
              layStyle.lineHeight,
              activeTracking,
              BUBBLE_MARGIN_10,
              undefined,
              true
            );
            activeText = wrapRes.lines.join('\n');
          }
        }
        layStyle.fontSize = `${finalFontSize}px`;
      } else if (!layStyle.fontSize) {
        const optVal = calculateOptimalFontSize(lineText, layerWidth, layerHeight, activeFontFamily, activeLineHeight, activeTracking);
        layStyle.fontSize = `${optVal}px`;
      }

      newAddedLayers.push({
        id: `lid_${Date.now()}_batch_${Math.floor(Math.random()*10000)}`,
        type: 'text',
        text: activeText,
        left: `${layerLeft}px`,
        top: `${layerTop}px`,
        width: `${layerWidth}px`,
        height: `${layerHeight}px`,
        hidden: false,
        style: layStyle,
      });

      lineIdx++;
      pasteCount++;
    });

    setPages(prev =>
      prev.map((p, i) => {
        if (i !== currentPageIndex) return p;
        return { ...p, layers: [...p.layers, ...newAddedLayers] };
      })
    );

    if (lineIdx < lines.length) {
      handleSelectLine(lineIdx);
    }

    pushToHistory(prevLayers);
    setBubbleQueue([]);
    clearWandSelection();
    addToast(`✓ تم توزيع ولصق النص على عدد ${pasteCount} فقاعات دفعة واحدة بملء مثالي!`, 'success');
  };

  const handleWhitenBubbleQueue = () => {
    if (bubbleQueue.length === 0) {
      addToast('⚠️ قائمة الفقاعات فارغة، حدد فقاعات أولاً لتبييضها', 'error');
      return;
    }
    const canvas = cleaningCanvasRef.current;
    if (!canvas) {
      addToast('⚠️ لم يتم العثور على مساحة الرسم لتبييضها', 'error');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    if (!imgEl || !imgEl.naturalWidth) return;

    const imgW = imgEl.naturalWidth;
    const imgH = imgEl.naturalHeight;

    if (canvas.width !== imgW || canvas.height !== imgH) {
      canvas.width = imgW;
      canvas.height = imgH;
    }

    const imgData = ctx.getImageData(0, 0, imgW, imgH);
    const data = imgData.data;

    bubbleQueue.forEach(b => {
      if (!b.mask) return;
      const bx = b.bboxX;
      const by = b.bboxY;
      const bw = b.bboxW;
      const bh = b.bboxH;

      let fillR = 255, fillG = 255, fillB = 255, fillA = 255;
      const activeColor = b.seedColor || '#ffffff';
      if (activeColor.startsWith('#')) {
        const hex = activeColor.substring(1);
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

      for (let cy = by; cy < by + bh; cy++) {
        if (cy < 0 || cy >= imgH) continue;
        for (let cx = bx; cx < bx + bw; cx++) {
          if (cx < 0 || cx >= imgW) continue;
          const maskIdx = cy * imgW + cx;
          if (b.mask[maskIdx] === 1) {
            const pixelIdx = maskIdx * 4;
            data[pixelIdx] = fillR;
            data[pixelIdx + 1] = fillG;
            data[pixelIdx + 2] = fillB;
            data[pixelIdx + 3] = fillA;
          }
        }
      }
    });

    ctx.putImageData(imgData, 0, 0);

    const url = canvas.toDataURL();
    handleUpdateCleaningDataUrl(url);

    addToast(`✓ تم تبييض جميع الفقاعات المحددة بلونها الأصلي دفعة واحدة! 🧼🎨`, 'success');
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleInsertText();
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleAlignText();
      }

      if (activeLayer) {
        const step = e.ctrlKey ? 10 : 1;
        const leftVal = parseFloat(activeLayer.left) || 0;
        const topVal = parseFloat(activeLayer.top) || 0;

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleUpdateLayer(activeLayer.id, { top: `${topVal - step}px` });
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleUpdateLayer(activeLayer.id, { top: `${topVal + step}px` });
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleUpdateLayer(activeLayer.id, { left: `${leftVal - step}px` });
        }
        if (e.key === 'ArrowRight') {
          handleUpdateLayer(activeLayer.id, { left: `${leftVal + step}px` });
        }
      } else {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleSelectLine(currentLineIndex + 1);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleSelectLine(currentLineIndex - 1);
        }
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'clone_stamp') {
          handleCleaningUndo();
        } else {
          handleUndo();
        }
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'clone_stamp') {
          handleCleaningRedo();
        } else {
          handleRedo();
        }
      }

      if (e.key === 'Delete' && activeLayer) {
        handleDeleteLayer(activeLayer.id);
      }
      if (e.key === 'Escape') {
        clearWandSelection();
        setSelectionBox(null);
        setActiveLayer(null);
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [
    parsedLines,
    currentLineIndex,
    activeLayer,
    wandMask,
    wandDimensions,
    selectionBox,
    fontSize,
    textColor,
    bgColor,
    bgTransparent,
    fontFamily,
    lineHeight,
    tracking,
    bold,
    italic,
    underline,
    textAlign,
    activeTool,
    currentPageIndex,
    pages,
    history,
  ]);

  // 🌟 القائمة تعتمد فقط على الخطوط المرفوعة بدون أي خطوط نظامية دخيلة
  const allFontsList: CustomFont[] = [...customFonts];

  const tatweelPreviewText = activeLayer 
    ? activeLayer.text 
    : 'حدد سطر كتابة نصي بالمسرح لتفعيل الكشيدة';

  const handleAIInpaint = async () => {
    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    const cleaningCanvas = cleaningCanvasRef.current;

    if (!imgEl || !cleaningCanvas) {
      addToast('⚠️ لا تتوفر صفحة مانجا نشطة مع لوحة التنظيف', 'error');
      return;
    }

    let rect = { x: 0, y: 0, width: 200, height: 200 };
    if (wandDimensions) {
      rect = { x: wandDimensions.x, y: wandDimensions.y, width: wandDimensions.w, height: wandDimensions.h };
    } else if (selectionBox && selectionBox.visible && selectionBox.width >= 5) {
      rect = { x: selectionBox.left, y: selectionBox.top, width: selectionBox.width, height: selectionBox.height };
    } else {
      addToast('⚠️ حدد منطقة بالعصا السحرية أو بمستطيل التحديد أولاً للتبييض', 'error');
      return;
    }

    addToast('🧠 جاري التبييض بواسطة نموذج LaMa الذكي المحلي...', 'success');

    try {
      const resultImageData = await runLamaInpaint(imgEl, cleaningCanvas, rect);

      if (resultImageData) {
        const ctx = cleaningCanvas.getContext('2d');
        if (ctx) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = resultImageData.width;
          tempCanvas.height = resultImageData.height;
          tempCanvas.getContext('2d')?.putImageData(resultImageData, 0, 0);

          ctx.drawImage(tempCanvas, 0, 0, resultImageData.width, resultImageData.height, rect.x, rect.y, rect.width, rect.height);

          handleUpdateCleaningDataUrl(cleaningCanvas.toDataURL());
          clearWandSelection();
          setSelectionBox(null);

          addToast('✓ تم تنظيف وإعادة رسم الخلفية بالذكاء الاصطناعي بنجاح! 🎉', 'success');
        }
      } else {
        addToast('❌ تعذر تشغيل النموذج، تأكد من صحة رابط الملف ورابط الشبكة', 'error');
      }
    } catch (err: any) {
      console.error('AI Inpainting Error:', err);
      addToast('❌ حدث خطأ أثناء المعالجة بالذكاء الاصطناعي', 'error');
    }
  };

  const handleContentAwareFill = () => {
    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    if (!imgEl || !imgEl.naturalWidth || currentPageIndex === -1) {
      addToast('⚠️ لا تتوفر صفحة مانجا نشطة لتشغيل التعبئة الذكية', 'error');
      return;
    }

    const canvas = cleaningCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgW = imgEl.naturalWidth;
    const imgH = imgEl.naturalHeight;

    if (canvas.width !== imgW || canvas.height !== imgH) {
      canvas.width = imgW;
      canvas.height = imgH;
    }

    const scaleX = imgW / imgEl.offsetWidth;
    const scaleY = imgH / imgEl.offsetHeight;

    let targetRect = { x: 0, y: 0, width: 0, height: 0 };
    let activeMask = wandMask;

    if (selectionBox && selectionBox.visible && selectionBox.width >= 5) {
      targetRect = {
        x: selectionBox.left * scaleX,
        y: selectionBox.top * scaleY,
        width: selectionBox.width * scaleX,
        height: selectionBox.height * scaleY,
      };
    } else if (wandDimensions) {
      targetRect = {
        x: wandDimensions.x,
        y: wandDimensions.y,
        width: wandDimensions.w,
        height: wandDimensions.h,
      };
    } else {
      addToast('⚠️ يرجى رسم مستطيل تحديد أو الضغط بالعصا أولاً لاستخدام Content Aware Fill', 'error');
      return;
    }

    contentAwareFillLocal(ctx, imgEl, targetRect, activeMask, imgW, imgH);

    const url = canvas.toDataURL();
    handleUpdateCleaningDataUrl(url);

    setSelectionBox(null);
    clearWandSelection();

    addToast('✓ تم تطبيق Content Aware Fill محلياً بنجاح! 🪄✨', 'success');
  };

  const handleSelectBubbleShape = (shape: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval') => {
    setDetectedBubbleType(shape);
    
    addToast(`✓ تم تبديل شكل الفقاعة لـ: ${
      shape === 'normal_oval' ? 'بيضاوية عادية 💬' : 
      shape === 'spiky_shout' ? 'صراخ حماسية 💥' : 
      shape === 'thought_cloud' ? 'تفكير سحابية 💭' : 
      shape === 'narrative_box' ? 'صندوق مستطيل 📜' : 'بيضاوية رأسية 🔵'
    } 📐`, 'success');

    if (activeLayer) {
      const previousLayers = [...currentLayers];
      const layerWidth = parseFloat(activeLayer.width) || 120;
      const layerHeight = parseFloat(activeLayer.height) || 80;

      const opt = calculateOptimalFontSizeForShape(
        activeLayer.text.replace(/\n/g, ' '),
        shape,
        layerWidth,
        layerHeight,
        activeLayer.style.fontFamily,
        activeLayer.style.lineHeight,
        parseFloat(activeLayer.style.letterSpacing) || 0,
        bubbleMargin,
        activeLayer.lineCountOverride,
        true
      );

      handleUpdateLayer(activeLayer.id, {
        text: opt.textWithBreaks,
        style: {
          ...activeLayer.style,
          fontSize: `${opt.fontSize}px`
        }
      });

      pushToHistory(previousLayers);
    }
  };

  const handleAddPenLayer = (points: Array<{ x: number; y: number }>, isClosed: boolean) => {
    if (currentPageIndex === -1 || !pages[currentPageIndex]) return;
    const prevLayers = [...currentLayers];
    
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const w = Math.max(20, maxX - minX);
    const h = Math.max(20, maxY - minY);

    const relativePoints = points.map(p => ({
      x: p.x - minX,
      y: p.y - minY,
    }));

    const newLayer: MangaLayer = {
      id: `lid_${Date.now()}_path_${Math.floor(Math.random()*1000)}`,
      type: 'path',
      text: '',
      pathPoints: relativePoints,
      strokeColor: brushColor,
      strokeWidth: 4,
      fillColor: isClosed ? `${brushColor}33` : 'none',
      left: `${minX}px`,
      top: `${minY}px`,
      width: `${w}px`,
      height: `${h}px`,
      hidden: false,
      style: {
        fontSize: '',
        color: brushColor,
        fontFamily: (customFonts[0]?.value || ''),
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: '0px',
        bgColor: 'transparent',
      }
    };

    setPages(prev =>
      prev.map((page, idx) => {
        if (idx !== currentPageIndex) return page;
        return { ...page, layers: [...page.layers, newLayer] };
      })
    );
    setActiveLayer(newLayer);
    pushToHistory(prevLayers);
    addToast('✓ تم إنشاء مسار متجهي من القلم ورسمه بنجاح 🎉', 'success');
  };

  const handleAddImageOverlay = (base64Src: string, filename: string) => {
    if (currentPageIndex === -1 || !pages[currentPageIndex]) return;
    const prevLayers = [...currentLayers];

    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    const pageW = imgEl?.offsetWidth || 600;
    const pageH = imgEl?.offsetHeight || 800;

    const overlayImg = new Image();
    overlayImg.onload = () => {
      const aspect = (overlayImg.naturalWidth && overlayImg.naturalHeight)
        ? overlayImg.naturalWidth / overlayImg.naturalHeight
        : 1;

      let initW = Math.min(220, Math.round(pageW * 0.5));
      let initH = Math.round(initW / aspect);

      if (initH > pageH * 0.6) {
        initH = Math.round(pageH * 0.6);
        initW = Math.round(initH * aspect);
      }

      const initLeft = Math.max(10, Math.round((pageW - initW) / 2));
      const initTop = Math.max(10, Math.round((pageH - initH) / 3));

      const newLayer: MangaLayer = {
        id: `lid_${Date.now()}_img_${Math.floor(Math.random()*1000)}`,
        type: 'image',
        text: '',
        imageSrc: base64Src,
        left: `${initLeft}px`,
        top: `${initTop}px`,
        width: `${initW}px`,
        height: `${initH}px`,
        hidden: false,
        style: {
          fontSize: '',
          color: '#000000',
          fontFamily: (customFonts[0]?.value || ''),
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          lineHeight: 1.2,
          letterSpacing: '0px',
          bgColor: 'transparent',
        }
      };

      setPages(prev =>
        prev.map((page, idx) => {
          if (idx !== currentPageIndex) return page;
          return { ...page, layers: [...page.layers, newLayer] };
        })
      );
      setActiveLayer(newLayer);
      pushToHistory(prevLayers);
      addToast(`✓ تم إدراج الصورة "${filename}" متناسبة داخل الصفحة 🖼️`, 'success');
    };

    overlayImg.onerror = () => {
      const defaultSize = Math.min(180, Math.round(pageW * 0.5));
      const newLayer: MangaLayer = {
        id: `lid_${Date.now()}_img_${Math.floor(Math.random()*1000)}`,
        type: 'image',
        text: '',
        imageSrc: base64Src,
        left: `${Math.max(10, (pageW - defaultSize) / 2)}px`,
        top: `${Math.max(10, (pageH - defaultSize) / 2)}px`,
        width: `${defaultSize}px`,
        height: `${defaultSize}px`,
        hidden: false,
        style: {
          fontSize: '',
          color: '#000000',
          fontFamily: (customFonts[0]?.value || ''),
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          lineHeight: 1.2,
          letterSpacing: '0px',
          bgColor: 'transparent',
        }
      };

      setPages(prev =>
        prev.map((page, idx) => {
          if (idx !== currentPageIndex) return page;
          return { ...page, layers: [...page.layers, newLayer] };
        })
      );
      setActiveLayer(newLayer);
      pushToHistory(prevLayers);
      addToast(`✓ تم إدراج الصورة "${filename}" كطبقة نشطة بنجاح 🖼️`, 'success');
    };

    overlayImg.src = base64Src;
  };

  useEffect(() => {
    if (!activeLayer) return;
    const style = activeLayer.style;
    
    const parsedFs = style.fontSize.replace('px', '');
    setFontSize(parsedFs || 'auto');
    setTextColor(style.color);
    setBgColor(style.bgColor === 'transparent' ? '#ffffff' : style.bgColor);
    setBgTransparent(style.bgColor === 'transparent');
    setTracking(parseFloat(style.letterSpacing) || 0);
    setLineHeight(style.lineHeight);
    setTextAlign(style.textAlign);
    if (style.fontFamily) {
      setFontFamily(style.fontFamily);
    }
    setBold(style.fontWeight === 'bold');
    setItalic(style.fontStyle === 'italic');
    setUnderline(style.textDecoration === 'underline');
    setStrokeColor(style.strokeColor || '#ffffff');
    setStrokeWidth(style.strokeWidth || 0);
    setActiveGradient(style.gradient || null);
  }, [activeLayer?.id]);

  return (
    <div className="w-screen h-screen overflow-x-auto overflow-y-hidden bg-[#121212] antialiased">
      <div className="flex h-full min-w-[1240px] font-sans text-gray-300 relative overflow-hidden">
      
      {fallbackFile && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100000] flex flex-col items-center justify-center p-4 backdrop-blur-md cursor-pointer" 
          dir="rtl"
          onClick={() => {
            if (fallbackFile?.url) {
              try {
                URL.revokeObjectURL(fallbackFile.url);
              } catch (err) {
                console.error(err);
              }
            }
            setFallbackFile(null);
          }}
        >
          <div 
            className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-2xl p-5 w-full max-w-sm text-center flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 justify-center">
              <span>🎉 تم تجهيز صورتك بنجاح!</span>
            </h3>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              {Capacitor && Capacitor.isNativePlatform() ? (
                <>
                  يرجى استخدام زر <span className="text-green-400 font-bold">"مشاركة وحفظ الصورة"</span> بالأسفل لحفظها مباشرة في معرض الصور بهاتفك 📱💾
                </>
              ) : (
                <>
                  إذا لم يبدأ التحميل تلقائياً، 
                  <span className="text-yellow-400 font-bold"> اضغط مطولاً </span> 
                  على الصورة أدناه ثم اختر 
                  <span className="text-green-400 font-bold"> "حفظ الصورة" </span> 
                  أو 
                  <span className="text-green-400 font-bold"> "إضافة إلى الصور" </span> 
                  📱💾
                </>
              )}
            </p>
            <div className="bg-[#151515] border border-[#2d2d2d] rounded-lg p-2 flex items-center justify-center overflow-hidden max-h-[40vh]">
              <img
                src={fallbackFile.url}
                className="max-h-[35vh] max-w-full object-contain rounded shadow-lg pointer-events-auto"
                style={{
                  userSelect: 'auto',
                  WebkitUserSelect: 'auto',
                  WebkitTouchCallout: 'default'
                }}
                alt="Translated page preview"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!fallbackFile) return;

                  if (Capacitor && Capacitor.isNativePlatform()) {
                    try {
                      if (!Filesystem || !Share || !Directory) {
                        addToast('⚠️ حزم المشاركة غير جاهزة بعد، يرجى المحاولة لاحقاً', 'error');
                        return;
                      }
                      const reader = new FileReader();
                      reader.readAsDataURL(fallbackFile.blob);
                      reader.onloadend = async () => {
                        const base64Data = reader.result as string;
                        const base64Raw = base64Data.split(',')[1] || base64Data;

                        await Filesystem.writeFile({
                          path: fallbackFile.filename,
                          data: base64Raw,
                          directory: Directory.Cache,
                        });

                        const fileUriResult = await Filesystem.getUri({
                          directory: Directory.Cache,
                          path: fallbackFile.filename,
                        });

                        await Share.share({
                          title: fallbackFile.filename,
                          files: [fileUriResult.uri],
                        });

                        await Filesystem.deleteFile({
                          directory: Directory.Cache,
                          path: fallbackFile.filename,
                        });

                        addToast('✓ تم استدعاء قائمة المشاركة الأصلية بنجاح 📤', 'success');
                      };
                    } catch (nativeErr) {
                      console.error('Fallback native sharing error:', nativeErr);
                      addToast('❌ فشل استدعاء المشاركة الأصلية للنظام', 'error');
                    }
                    return;
                  }

                  const file = new File([fallbackFile.blob], fallbackFile.filename, { type: fallbackFile.blob.type });
                  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                      await navigator.share({
                        files: [file],
                        title: fallbackFile.filename,
                      });
                      addToast('✓ تم الحفظ والمشاركة بنجاح 📤', 'success');
                    } catch (err: any) {
                      if (err.name !== 'AbortError') {
                        addToast('فشل في فتح نافذة المشاركة، يرجى التحقق من تثبيت مكتبة المشاركة', 'error');
                      }
                    }
                  } else {
                    addToast('⚠️ نظام أندرويد بحاجة لمكتبة Capacitor Share للاتصال بالمعرض مباشرة', 'error');
                  }
                }}
                className="bg-green-600 text-white hover:bg-green-700 py-2 px-5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>📤 مشاركة وحفظ الصورة</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (fallbackFile?.url) {
                    try {
                      URL.revokeObjectURL(fallbackFile.url);
                    } catch (err) {
                      console.error(err);
                    }
                  }
                  setFallbackFile(null);
                }}
                className="bg-[#2d2d2d] text-gray-300 border border-[#3c3c3c] hover:bg-[#3d3d3d] py-2 px-5 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* لوحة التنبيهات المنبثقة */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[999999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border shadow-xl bg-[#2a2a2a] text-xs text-white min-w-[200px] justify-between pointer-events-auto transition animate-in slide-in-from-bottom-2 duration-150 ${
              t.type === 'error'
                ? 'border-red-600 bg-red-950/80 text-red-100'
                : t.type === 'success'
                ? 'border-green-600 bg-green-950/80 text-green-100'
                : 'border-[#3a3a3a]'
            }`}
          >
            <span className="flex-1 text-right">{t.msg}</span>
            {t.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            ) : t.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : null}
          </div>
        ))}
      </div>

      <FontManager
        isOpen={showFontManager}
        onClose={() => setShowFontManager(false)}
        customFonts={customFonts}
        setCustomFonts={setCustomFonts}
        favFonts={favFonts}
        setFavFonts={setFavFonts}
        selectedFont={fontFamily}
        onSelectFont={handleSelectFontFamily}
      />

      {showExportSelectorModal && (
        <div className="fixed inset-0 bg-black/85 z-[100000] flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-5 w-full max-w-sm text-right flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white border-b border-[#2d2d2d] pb-2 flex items-center gap-1.5 justify-end">
              <span>📤 مشاركة الأنماط المنسقة</span>
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const allIds: string[] = [];
                  folders.forEach(f => f.styles.forEach(s => allIds.push(s.id)));
                  setCheckedStylesForExport(allIds);
                }}
                className="bg-[#2d2d2d] text-white py-1 px-2.5 rounded text-[10px]"
              >
                تحديد الكل
              </button>
              <button
                onClick={() => setCheckedStylesForExport([])}
                className="bg-[#2d2d2d] text-white py-1 px-2.5 rounded text-[10px]"
              >
                إلغاء الكل
              </button>
            </div>
            <div className="bg-[#151515] border border-[#2d2d2d] rounded max-h-[160px] overflow-y-auto p-1 text-xs">
              {folders.flatMap(f => f.styles).map(s => {
                const isChecked = checkedStylesForExport.includes(s.id);
                return (
                  <label key={s.id} className="flex items-center gap-2.5 p-1.5 hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          checkedStylesForExport(prev => prev.filter(x => x !== s.id));
                        } else {
                          checkedStylesForExport(prev => [...prev, s.id]);
                        }
                      }}
                      className="accent-[#007acc]"
                    />
                    <span className="text-gray-300 truncate">{s.name}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  let stylesToExport: TextStyle[] = [];
                  folders.forEach(f => {
                    f.styles.forEach(s => {
                     if (checkedStylesForExport.includes(s.id)) stylesToExport.push(s);
                    });
                  });
                  if (stylesToExport.length === 0) {
                    addToast('اختر نمطاً واحداً على الأقل للمشاركة', 'error');
                    return;
                  }
                  const jsonStr = JSON.stringify(stylesToExport, null, 2);
                  handleShareFile(jsonStr, "custom-styles.json", "مشاركة أنماط نصوص تايبر");
                  setShowExportSelectorModal(false);
                }}
                className="bg-[#007acc] text-white py-1 px-4 rounded text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-[#0062a3]"
              >
                <span>مشاركة المحدد 📤</span>
              </button>
              <button
                onClick={() => setShowExportSelectorModal(false)}
                className="bg-[#2a2a2a] text-gray-300 py-1 px-4 rounded text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/85 z-[100000] flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-5 w-full max-w-md text-right flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-sm font-bold text-white border-b border-[#2d2d2d] pb-2 flex items-center gap-1.5 justify-end">
              <span>🔧 إعدادات تايبر المتكاملة</span>
            </h3>

            <div className="flex flex-col gap-3 text-xs text-gray-300">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={multiBubbleMode}
                  onChange={e => setMultiBubbleMode(e.target.checked)}
                  className="accent-[#007acc]"
                />
                <span>تفعيل وضع الفقاعات المتعددة (إدراج سريع متتابع)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoFitText}
                  onChange={e => setAutoFitText(e.target.checked)}
                  className="accent-[#007acc]"
                />
                <span>حسّن النص آلياً ليناسب حيز الفقاعة</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-blue-400">
                <input
                  type="checkbox"
                  checked={autoApplyBubbleStyle}
                  onChange={e => setAutoApplyBubbleStyle(e.target.checked)}
                  className="accent-[#007acc]"
                />
                <span>التعرف الذكي التلقائي وتطبيق الخط والتنسيق حسب الفقاعة 🤖✨</span>
              </label>
              <div className="flex justify-between items-center">
                <span>حساسية العصا السحرية (Tolerance)</span>
                <input
                  type="number"
                  min="1"
                  max="255"
                  value={wandTolerance}
                  onChange={e => setWandTolerance(parseInt(e.target.value) || 20)}
                  className="w-16 bg-[#2d2d2d] border border-[#2d2d2d] text-white rounded px-2.5 py-0.5 text-center text-xs"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>الحد الأدنى للفقاعات (بكسل)</span>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={minBubbleSize}
                  onChange={e => setMinBubbleSize(parseInt(e.target.value) || 25)}
                  className="w-16 bg-[#2d2d2d] border border-[#2d2d2d] text-white rounded px-2.5 py-0.5 text-center text-xs"
                />
              </div>
              
              <div className="flex justify-between items-center border-t border-[#2d2d2d] pt-3 mt-1">
                <span>هامش أمان أسطر الفقاعة:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="bubble_margin_setting"
                      checked={bubbleMargin === 5}
                      onChange={() => {
                        setBubbleMargin(5);
                        addToast('✓ تم تحديد هامش أمان 5% (ضيق) 📏', 'success');
                      }}
                      className="accent-[#007acc]"
                    />
                    <span>5% (ضيق)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="bubble_margin_setting"
                      checked={bubbleMargin === 10}
                      onChange={() => {
                        setBubbleMargin(10);
                        addToast('✓ تم تحديد هامش أمان 10% (افتراضي) 📏', 'success');
                      }}
                      className="accent-[#007acc]"
                    />
                    <span>10%</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="bubble_margin_setting"
                      checked={bubbleMargin === 15}
                      onChange={() => {
                        setBubbleMargin(15);
                        addToast('✓ تم تحديد هامش أمان 15% (تباعد أكبر) 📏', 'success');
                      }}
                      className="accent-[#007acc]"
                    />
                    <span>15%</span>
                  </label>
                </div>
              </div>

              <h3 className="text-sm font-bold text-white border-b border-[#2d2d2d]/30 pt-3 pb-1.5 flex items-center gap-1.5 justify-end">
                <span>🔑 مفتاح تشغيل الذكاء الاصطناعي (Gemini / Hugging Face)</span>
              </h3>
              <div className="flex flex-col gap-3 text-xs text-gray-300">
                <p className="text-[10px] text-gray-400 leading-normal">
                  مطلوب لتشغيل ميزة ممحاة الخلفية الذكية (Inpaint). يتم حفظ المفتاح محلياً بشكل آمن تماماً على هاتفك للعمل دوماً.
                </p>
                
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400">مفتاح Gemini API Key (تفضيل تلقائي):</span>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={e => {
                      setGeminiApiKey(e.target.value);
                      localStorage.setItem('typer_gemini_api_key', e.target.value);
                    }}
                    placeholder="أدخل مفتاح Gemini..."
                    className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-left text-xs font-mono focus:border-[#007acc] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400">رمز Hugging Face Token:</span>
                  <input
                    type="password"
                    value={hfToken}
                    onChange={e => {
                      setHfToken(e.target.value);
                      localStorage.setItem('typer_hf_token', e.target.value);
                    }}
                    placeholder="أدخل رمز hf_..."
                    className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-left text-xs font-mono focus:border-[#007acc] focus:outline-none"
                  />
                </div>
              </div>

            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="bg-[#007acc] text-white py-1 px-5 rounded-lg text-xs font-bold transition hover:bg-[#0062a3]"
              >
                تطبيق وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow flex flex-col h-full bg-[#0d0d0d] relative overflow-hidden min-w-0">
        <div className="px-2 sm:px-4 py-2 bg-[#1e1e1e] border-b border-[#2d2d2d] flex flex-wrap md:flex-nowrap justify-between items-center gap-2 text-xs text-gray-300 select-none">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] text-gray-500 bg-white/5 py-0.5 px-2 rounded">
              {pages.length > 0 && currentPageIndex !== -1
                ? `${pages[currentPageIndex].name}`
                : 'الملف الافتراضي'}
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-[10px] text-gray-500 truncate max-w-[150px] hidden sm:inline">
              {currentPageIndex !== -1 && currentLineIndex !== -1 && parsedLines[currentLineIndex]
                ? `السطر: ${parsedLines[currentLineIndex].text}`
                : 'منصة تايبر مانجا'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* ⚡ زر النقرة الخارقة والأيقونات السريعة */}
            <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#333] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => {
                  setTurboMode(!turboMode);
                  if (!turboMode) {
                    setActiveTool('magic_wand');
                  }
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer select-none ${
                  turboMode
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 animate-pulse'
                    : 'bg-[#252525] text-gray-300 hover:text-white hover:bg-[#333]'
                }`}
                title="تفعيل وضع النقرة الخارقة"
              >
                <span>⚡ {turboMode ? 'الخارقة: مفعل' : 'النقرة الخارقة'}</span>
              </button>

              <div className="flex items-center gap-0.5 px-0.5 border-r border-[#333]">
                <button
                  type="button"
                  onClick={() => handleSelectQuickPreset('normal')}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs transition cursor-pointer ${
                    activeQuickPreset === 'normal' ? 'bg-[#007acc] text-white scale-105 ring-1 ring-[#007acc]' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  }`}
                  title="نمط عادي"
                >
                  💬
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectQuickPreset('shout')}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs transition cursor-pointer ${
                    activeQuickPreset === 'shout' ? 'bg-red-600 text-white scale-105 ring-1 ring-red-600' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  }`}
                  title="نمط صراخ"
                >
                  💥
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectQuickPreset('thought')}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs transition cursor-pointer ${
                    activeQuickPreset === 'thought' ? 'bg-indigo-600 text-white scale-105 ring-1 ring-indigo-600' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  }`}
                  title="نمط تفكير"
                >
                  💭
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectQuickPreset('box')}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs transition cursor-pointer ${
                    activeQuickPreset === 'box' ? 'bg-teal-600 text-white scale-105 ring-1 ring-teal-600' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  }`}
                  title="نمط صندوق سرد"
                >
                  📜
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectQuickPreset('whisper')}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs transition cursor-pointer ${
                    activeQuickPreset === 'whisper' ? 'bg-gray-600 text-white scale-105 ring-1 ring-gray-600' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  }`}
                  title="نمط همس"
                >
                  🤫
                </button>
              </div>
            </div>

            {/* أدوات التحرير الأساسية */}
            <div className="flex items-center bg-[#252525] border border-[#2d2d2d] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setActiveTool('hand')}
                className={`py-1 px-2.5 rounded text-[11px] font-bold transition focus:outline-none cursor-pointer ${
                  activeTool === 'hand' ? 'bg-[#007acc] text-white' : 'hover:bg-[#333] text-gray-300'
                }`}
              >
                ✋ اليد
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('brush')}
                className={`py-1 px-2.5 rounded text-[11px] font-bold transition focus:outline-none cursor-pointer ${
                  activeTool === 'brush' ? 'bg-[#007acc] text-white' : 'hover:bg-[#333] text-gray-300'
                }`}
              >
                🖌️ الفرشاة
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('magic_wand')}
                className={`py-1 px-2.5 rounded text-[11px] font-bold transition focus:outline-none cursor-pointer ${
                  activeTool === 'magic_wand' ? 'bg-[#007acc] text-white' : 'hover:bg-[#333] text-gray-300'
                }`}
              >
                🪄 العصا
              </button>
            </div>

            {/* عناصر التحكم بالتكبير والتنقل بين الصفحات */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-[#252525] border border-[#2d2d2d] rounded-lg p-0.5 text-white">
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(0.1, prev - 0.25))}
                  className="py-1 px-2 hover:bg-[#333] hover:text-white rounded text-xs transition leading-none focus:outline-none cursor-pointer font-bold"
                  title="تصغير (-)"
                >
                  −
                </button>
                <span 
                  className="px-2 font-mono text-[11px] min-w-[45px] text-center cursor-pointer hover:text-[#007acc]"
                  onClick={() => setZoom(1.0)}
                  title="اضغط المزدوج لإعادة التعيين لـ 100%"
                  onDoubleClick={() => setZoom(1.0)}
                >
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(4.0, prev + 0.25))}
                  className="py-1 px-2 hover:bg-[#333] hover:text-white rounded text-xs transition leading-none focus:outline-none cursor-pointer font-bold"
                  title="تكبير (+)"
                >
                  +
                </button>
              </div>

              <div className="flex items-center bg-[#252525] border border-[#2d2d2d] rounded-lg p-0.5">
                <button
                  onClick={() => handlePageChange(currentPageIndex - 1)}
                  disabled={currentPageIndex <= 0}
                  className="py-1 px-2 hover:bg-[#333] hover:text-white rounded disabled:opacity-20 text-xs transition leading-none focus:outline-none cursor-pointer"
                >
                  &lt;
                </button>
                <span className="px-3 font-semibold text-[11px]">
                  {pages.length > 0 ? `${currentPageIndex + 1} / ${pages.length}` : '0 / 0'}
                </span>
                <button
                  onClick={() => handlePageChange(currentPageIndex + 1)}
                  disabled={currentPageIndex === -1 || currentPageIndex >= pages.length - 1}
                  className="py-1 px-2 hover:bg-[#333] hover:text-white rounded disabled:opacity-20 text-xs transition leading-none focus:outline-none cursor-pointer"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 px-2.5 rounded-lg transition cursor-pointer"
            >
              ⚙ الإعدادات
            </button>
            <button
              onClick={() => setCompactMode(!compactMode)}
              className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 px-2.5 rounded-lg transition"
            >
              ⇔ {compactMode ? 'طبيعي' : 'مدمج'}
            </button>
          </div>
        </div>

        <Workspace
          mangaSrc={mangaSrc}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          wandDimensions={wandDimensions}
          layers={currentLayers}
          activeLayer={activeLayer}
          onSetActiveLayer={setActiveLayer}
          onUpdateLayer={handleUpdateLayer}
          onAddSelectionBounds={(bounds) => {
            setSelectionBox({
              ...bounds,
              visible: true,
            });
          }}
          onWandSelect={handleWandSelect}
          selectionBox={selectionBox}
          setSelectionBox={setSelectionBox}
          autoFitText={autoFitText}
          wandCanvasRef={wandCanvasRef}
          cleaningCanvasRef={cleaningCanvasRef}
          currentPageCleaningDataUrl={pages[currentPageIndex]?.cleaningDataUrl}
          onUpdateCleaningDataUrl={handleUpdateCleaningDataUrl}
          brushColor={brushColor}
          brushSize={brushSize}
          stampSource={stampSource}
          setStampSource={setStampSource}
          isSettingStampSource={isSettingStampSource}
          setIsSettingStampSource={setIsSettingStampSource}
          onColorPicked={(pickedColor) => {
            setBrushColor(pickedColor);
            setActiveTool('brush');
            addToast('تمت مطابقة لون الخلفية وتطبيقه على الفرشاة بنجاح 🖌️', 'success');
          }}
          watermarkEnabled={watermarkEnabled}
          watermarkType={watermarkType}
          watermarkText={watermarkText}
          watermarkImage={watermarkImage}
          watermarkOpacity={watermarkOpacity}
          watermarkPosition={watermarkPosition}
          watermarkSize={watermarkSize}
          onDuplicateLayer={handleDuplicateLayer}
          zoom={zoom}
          setZoom={setZoom}
          onAddPenLayer={handleAddPenLayer}
          onContentAwareFill={handleContentAwareFill}
          turboMode={turboMode}
          onToggleTurboMode={() => setTurboMode(!turboMode)}
          onTurboTypeset={handleTurboTypeset}
          onNextPage={() => handlePageChange(currentPageIndex + 1)}
          onPrevPage={() => handlePageChange(currentPageIndex - 1)}
          onUndoGesture={handleUndo}
          activeQuickPreset={activeQuickPreset}
          onSelectQuickPreset={handleSelectQuickPreset}
        />

        <LayersPanel
          layers={currentLayers}
          activeLayer={activeLayer}
          onSetActiveLayer={setActiveLayer}
          onUpdateLayer={handleUpdateLayer}
          onDeleteLayer={handleDeleteLayer}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={!!(history[currentPageIndex]?.undo && history[currentPageIndex].undo.length > 0)}
          canRedo={!!(history[currentPageIndex]?.redo && history[currentPageIndex].redo.length > 0)}
          hasWandMask={wandMask !== null}
          onCancelWandSelection={clearWandSelection}
          multiBubbleMode={multiBubbleMode}
          bubbleQueueCount={bubbleQueue.length}
          onClearBubbleQueue={() => {
            setBubbleQueue([]);
            addToast('مسح قائمة الفقاعات المتعددة');
          }}
          onApplyBubbleQueue={handleApplyBubbleQueue}
          onWhitenBubbleQueue={handleWhitenBubbleQueue}
          allFonts={allFontsList}
          onMergeLayers={handleMergeLayers}
        />
      </div>

      <Sidebar
        onImageUpload={handleImageUpload}
        onExportPNG={handleExportPNG}
        onSaveState={handleSaveState}
        onLoadState={handleRestoreState}
        onShare={handleShare}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        wandTolerance={wandTolerance}
        brushColor={brushColor}
        setBrushColor={setBrushColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        stampSource={stampSource}
        setStampSource={setStampSource}
        isSettingStampSource={isSettingStampSource}
        setIsSettingStampSource={setIsSettingStampSource}
        scriptInput={scriptInput}
        setScriptInput={setScriptInput}
        parsedLines={parsedLines}
        currentLineIndex={currentLineIndex}
        onSelectLine={handleSelectLine}
        folders={folders}
        setFolders={setFolders}
        selectedStyleId={selectedStyleId}
        setSelectedStyleId={setSelectedStyleId}
        onDuplicateFolder={handleDuplicateFolder}
        onExportFolder={handleShareFolder}
        onImportFolder={handleImportFolder}
        onExportAllStyles={handleExportAllStyles}
        onImportAllStyles={handleImportAllStyles}
        onDuplicateStyle={handleDuplicateStyle}
        onAddFolder={handleAddFolder}
        onAddStyle={handleAddStyle}
        onOpenStylesExportSelector={() => setShowExportSelectorModal(true)}
        onUpdateActiveStyle={handleUpdateActiveStyle}
        fontFamily={fontFamily}
        setFontFamily={handleSelectFontFamily}
        fontSize={fontSize}
        setFontSize={setFontSize}
        textColor={textColor}
        setTextColor={setTextColor}
        bgColor={bgColor}
        setBgColor={setBgColor}
        bgTransparent={bgTransparent}
        setBgTransparent={setBgTransparent}
        tracking={tracking}
        setTracking={setTracking}
        lineHeight={lineHeight}
        setLineHeight={setLineHeight}
        textAlign={textAlign}
        setTextAlign={setTextAlign}
        bold={bold}
        setBold={setBold}
        italic={italic}
        setItalic={setItalic}
        underline={underline}
        setUnderline={setUnderline}
        allFonts={allFontsList}
        favFonts={favFonts}
        setFavFonts={setFavFonts}
        onOpenFontManager={() => setShowFontManager(true)}
        onApplyStyleToActiveLayer={handleApplyStyleToActiveLayer}
        strokeColor={strokeColor}
        setStrokeColor={handleUpdateStrokeColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={handleUpdateStrokeWidth}
        gradientPresets={gradientPresets}
        setGradientPresets={setGradientPresets}
        activeGradient={activeGradient}
        onApplyGradientToActiveLayer={handleApplyGradientToActiveLayer}
        onCopyGradientFromActiveLayer={handleCopyGradientFromActiveLayer}
        onSampleGradientFromSelection={handleSampleGradientFromSelection}
        onExportGradients={handleExportGradients}
        onImportGradients={handleImportGradients}
        tatweelStrength={tatweelStrength}
        setTatweelStrength={setTatweelStrength}
        tatweelMargin={tatweelMargin}
        setTatweelMargin={setTatweelMargin}
        onApplyTatweel={handleApplyTatweel}
        onUndoTatweel={handleUndoTatweel}
        onRemoveAllTatweel={handleRemoveAllTatweel}
        tatweelPreviewText={tatweelPreviewText}
        onPrevLine={() => handleSelectLine(currentLineIndex - 1)}
        onNextLine={() => handleSelectLine(currentLineIndex + 1)}
        onInsertText={handleInsertText}
        onAlignText={handleAlignText}
        onDrawingUndo={handleCleaningUndo}
        onDrawingRedo={handleCleaningRedo}
        canDrawingUndo={!!(history[currentPageIndex]?.undo && history[currentPageIndex].undo.length > 0)}
        canDrawingRedo={!!(history[currentPageIndex]?.redo && history[currentPageIndex].redo.length > 0)}
        onWhitenWandSelection={handleWhitenWandSelection}
        hasWandMask={wandMask !== null}
        onAIInpaint={handleAIInpaint}
        onContentAwareFill={handleContentAwareFill}
        hasSelectionBox={!!(selectionBox && selectionBox.visible && selectionBox.width >= 5)}
        detectedBubbleType={detectedBubbleType}
        onSelectBubbleShape={handleSelectBubbleShape}
        onDeleteFolder={handleDeleteFolder}
        onEditStyle={handleOpenEditStyle}
        onAddImageOverlay={handleAddImageOverlay}
        onStepTatweel={handleStepTatweel}
        manualTatweelStep={manualTatweelStep}
        setManualTatweelStep={setManualTatweelStep}
      />

      <FloatingToolbar
        activeLayer={activeLayer}
        onUpdateLayer={handleUpdateLayer}
        onDeleteLayer={handleDeleteLayer}
        allFonts={allFontsList}
        favFonts={favFonts}
        onOpenFontManager={() => setShowFontManager(true)}
        onStretchSelected={handleStretchSelected}
        onStepTatweel={handleStepTatweel}
        manualTatweelStep={manualTatweelStep}
        onSelectFont={handleSelectFontFamily}
      />

      {editingStyle && (
        <div className="fixed inset-0 bg-black/85 z-[100000] flex items-center justify-center p-4 backdrop-blur-xs select-none" dir="rtl">
          <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-5 w-full max-w-md text-right flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-2">
              <span className="text-sm font-bold text-white">⚙️ تحرير وتعديل النمط التنسيقي</span>
              <button 
                onClick={() => setEditingStyle(null)}
                className="text-gray-400 hover:text-white text-lg font-bold outline-none focus:outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">اسم النمط (Style name):</label>
              <input
                type="text"
                value={editFormName}
                onChange={e => setEditFormName(e.target.value)}
                className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#007acc]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">المجلد المستهدف (Folder):</label>
              <select
                value={editFormFolderId}
                onChange={e => setEditFormFolderId(e.target.value)}
                className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-xs outline-none cursor-pointer focus:border-[#007acc]"
              >
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCopyActiveLayerStyleToForm}
              className="w-full bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-xs py-2 rounded transition flex items-center justify-center gap-1.5 font-bold cursor-pointer"
            >
              <span>❐ نسخ تنسيق الطبقة النشطة (Copy layer style)</span>
            </button>

            <div className="bg-[#151515] border border-[#2d2d2d] rounded p-3 flex flex-col gap-3">
              <span className="text-[11px] text-gray-400 font-bold border-b border-[#2d2d2d] pb-1">إعدادات الخط والتنسيق:</span>

              <div className="flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">نوع الخط:</span>
                <select
                  value={editFormFamily}
                  onChange={e => setEditFormFamily(e.target.value)}
                  className="w-48 bg-[#2d2d2d] border border-[#3c3c3c] text-white rounded px-2 py-1 text-xs outline-none cursor-pointer"
                >
                  {allFontsList.map(f => (
                    <option key={f.value} value={f.value} style={{ fontFamily: `'${f.value}'` }}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-400">حجم الخط:</span>
                  <input
                    type="text"
                    value={editFormSize}
                    onChange={e => setEditFormSize(e.target.value)}
                    placeholder="Auto أو رقم"
                    className="bg-[#2d2d2d] border border-[#3c3c3c] text-white rounded px-2 py-1 text-xs text-center outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-400">تباعد الأسطر:</span>
                  <input
                    type="number"
                    step="0.05"
                    value={editFormLineHeight}
                    onChange={e => setEditFormLineHeight(parseFloat(e.target.value) || 1.25)}
                    className="bg-[#2d2d2d] border border-[#3c3c3c] text-white rounded px-2 py-1 text-xs text-center outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-400">تباعد الحروف:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={editFormTracking}
                    onChange={e => setEditFormTracking(parseFloat(e.target.value) || 0)}
                    className="bg-[#2d2d2d] border border-[#3c3c3c] text-white rounded px-2 py-1 text-xs text-center outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-400">لون النص:</span>
                  <input
                    type="color"
                    value={editFormColor}
                    onChange={e => setEditFormColor(e.target.value)}
                    className="w-full h-7 bg-transparent rounded cursor-pointer border-0 p-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-[#2d2d2d] pt-2">
                <div className="flex gap-1 justify-center">
                  <button
                    onClick={() => setEditFormBold(!editFormBold)}
                    className={`flex-1 py-1 text-xs font-bold rounded transition cursor-pointer ${
                      editFormBold ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                    }`}
                  >
                    B
                  </button>
                  <button
                    onClick={() => setEditFormItalic(!editFormItalic)}
                    className={`flex-1 py-1 text-xs italic rounded transition cursor-pointer ${
                      editFormItalic ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                    }`}
                  >
                    I
                  </button>
                  <button
                    onClick={() => setEditFormUnderline(!editFormUnderline)}
                    className={`flex-1 py-1 text-xs underline rounded transition cursor-pointer ${
                      editFormUnderline ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                    }`}
                  >
                    U
                  </button>
                </div>

                <div className="flex gap-1 justify-center">
                  <button
                    onClick={() => setEditFormAlign('right')}
                    className={`flex-1 py-1 text-xs rounded transition cursor-pointer ${
                      editFormAlign === 'right' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-300'
                    }`}
                    title="يمين"
                  >
                    ⇤
                  </button>
                  <button
                    onClick={() => setEditFormAlign('center')}
                    className={`flex-1 py-1 text-xs rounded transition cursor-pointer ${
                      editFormAlign === 'center' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-300'
                    }`}
                    title="وسط"
                  >
                    ≡
                  </button>
                  <button
                    onClick={() => setEditFormAlign('left')}
                    className={`flex-1 py-1 text-xs rounded transition cursor-pointer ${
                      editFormAlign === 'left' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-300'
                    }`}
                    title="يسار"
                  >
                    ⇥
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-bold">علامات الاختيار التلقائي (Tags):</label>
              <input
                type="text"
                value={editFormTags}
                onChange={e => setEditFormTags(e.target.value)}
                placeholder="مثال: scream shout s"
                className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#007acc]"
              />
            </div>

            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-gray-400 font-bold">لون التمييز التلقائي (Tag color):</span>
              <input
                type="color"
                value={editFormTagColor}
                onChange={e => setEditFormTagColor(e.target.value)}
                className="w-24 h-7 bg-transparent rounded cursor-pointer border-0 p-0"
              />
            </div>

            <div className="flex gap-2 justify-between border-t border-[#2d2d2d] pt-3">
              <button
                onClick={() => {
                  if (!editFormName.trim()) {
                    addToast('⚠️ يرجى إدخال اسم للنمط أولاً', 'error');
                    return;
                  }
                  const isSzAuto = editFormSize.trim().toLowerCase() === 'auto';
                  const formattedStyle: TextStyle = {
                    id: editingStyle.style.id,
                    name: editFormName,
                    fontSize: isSzAuto ? 'auto' : (parseFloat(editFormSize) || 16),
                    color: editFormColor,
                    bgColor: editFormBg,
                    tracking: editFormTracking,
                    lineHeight: editFormLineHeight,
                    textAlign: editFormAlign,
                    fontFamily: editFormFamily,
                    tags: editFormTags.split(' ').map(t => t.trim()).filter(Boolean),
                    enabled: editingStyle.style.enabled,
                    bold: editFormBold,
                    italic: editFormItalic,
                    underline: editFormUnderline,
                    tagColor: editFormTagColor,
                    strokeColor: editingStyle.style.strokeColor || '#ffffff',
                    strokeWidth: editingStyle.style.strokeWidth || 0,
                    gradient: editingStyle.style.gradient,
                    updatedAt: editingStyle.style.updatedAt || Date.now()
                  };
                  handleSaveEditedStyle(formattedStyle, editFormFolderId);
                }}
                className="bg-[#007acc] text-white hover:bg-[#0062a3] py-2 px-5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>💾 حفظ التغييرات</span>
              </button>
              <button
                onClick={() => handleDeleteStyle(editingStyle.style.id)}
                className="bg-red-950/80 border border-red-900/60 hover:bg-red-800 text-red-300 py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>🗑️ حذف النمط</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
