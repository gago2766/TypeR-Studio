import React, { useState, useEffect, useRef } from 'react';
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
  ShapePreset, 
  CustomFont 
} from './types';

import { 
  rgbToHex, 
  calculateOptimalFontSize, 
  tatweelLine,
  wrapTextToShape,
  calculateOptimalFontSizeForShape,
  getFonts,
  saveFont,
  saveFavoriteFonts,
  getFavoriteFonts
} from './utils';

import { FontManager } from './components/FontManager';
import { FloatingToolbar } from './components/FloatingToolbar';
import { Sidebar } from './components/Sidebar';
import { LayersPanel } from './components/LayersPanel';
import { Workspace } from './components/Workspace';
import { writePsd } from 'ag-psd';
import JSZip from 'jszip';

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

// تهيئة البنية والأنماط الافتراضية للعمل مع الحفاظ على الترتيب الأصلي
const INITIAL_FOLDERS: StyleFolder[] = [
  {
    id: "folder_dialogue",
    name: "محادثات المانجا",
    styles: [
      { id: "style_normal", name: "عادي", fontSize: "auto", color: "#000000", bgColor: "transparent", tracking: 0, lineHeight: 1.25, textAlign: "center", fontFamily: "Tahoma, sans-serif", tags: ["n", "normal"], enabled: true, tagColor: "#FFF3B0", updatedAt: 1 },
      { id: "style_thought", name: "تفكير داخلي", fontSize: "auto", color: "#444444", bgColor: "transparent", tracking: 0, lineHeight: 1.25, textAlign: "center", fontFamily: "Arial, sans-serif", tags: ["t", "thought"], enabled: true, tagColor: "#A3E4D7", updatedAt: 2 }
    ]
  },
  {
    id: "folder_sfx",
    name: "المؤثرات الصوتية",
    styles: [
      { id: "style_scream", name: "صراخ غاضب", fontSize: "auto", color: "#e81123", bgColor: "transparent", tracking: 1, lineHeight: 1.1, textAlign: "center", fontFamily: "Impact, sans-serif", tags: ["s", "scream"], enabled: true, tagColor: "#FADBD8", updatedAt: 3 }
    ]
  }
];

const INITIAL_PRESETS: ShapePreset[] = [
  { id: 'p1', name: 'عادي', color: '#000000', bg: 'transparent', font: 'Tahoma, sans-serif', size: 'auto', bold: false, italic: false, align: 'center', lh: 1.3, tracking: 0 },
  { id: 'p2', name: 'صراخ', color: '#000000', bg: 'transparent', font: 'Impact, sans-serif', size: 'auto', bold: true, italic: false, align: 'center', lh: 1.15, tracking: 1 },
  { id: 'p3', name: 'تفكير', color: '#333333', bg: 'transparent', font: 'Tahoma, sans-serif', size: 'auto', bold: false, italic: true, align: 'center', lh: 1.3, tracking: 0 },
  { id: 'p4', name: 'ناعم', color: '#1a1a6e', bg: 'transparent', font: "'Times New Roman', serif", size: 'auto', bold: false, italic: false, align: 'center', lh: 1.4, tracking: 0 },
];

const DEFAULT_MANGA_SRC = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' style='background:%23222'><text x='50%' y='50%' fill='%23666' text-anchor='middle' font-family='sans-serif'>قم بسحب أو رفع صور الصفحات للبدء</text></svg>`;

export default function App() {
  // إعدادات الصفحات والقائمة
  const [pages, setPages] = useState<MangaPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(-1);
  const [mangaSrc, setMangaSrc] = useState<string>(DEFAULT_MANGA_SRC);

  // 📥 كائن الصورة للتحميل الاحتياطي على الهواتف الذكية ونظام Capacitor
  const [fallbackFile, setFallbackFile] = useState<{ url: string; blob: Blob; filename: string } | null>(null);

  // إعدادات السيناريو والأسطر البرمجية المعالجة
  const [scriptInput, setScriptInput] = useState<string>('');
  const [parsedLines, setParsedLines] = useState<ProcessedLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);

  // الأدوات النشطة وإعدادات الفرشاة
  const [activeTool, setActiveTool] = useState<'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand'>('marquee');
  const [brushColor, setBrushColor] = useState<string>('#ffffff');
  const [brushSize, setBrushSize] = useState<number>(15);
  const [stampSource, setStampSource] = useState<{ x: number; y: number } | null>(null);
  const [isSettingStampSource, setIsSettingStampSource] = useState<boolean>(false);
  const cleaningCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // 🔑 مفتاح Gemini API المحفوظ محلياً وبشكل آمن تماماً على الهاتف مع معالجة الأخطاء
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('typer_gemini_api_key') || '';
    } catch (e) {
      return '';
    }
  });

  // 🔑 رمز الوصول الخاص بـ Hugging Face المحفوظ محلياً وتلقائياً بذاكرة الهاتف
  const [hfToken, setHfToken] = useState<string>(() => {
    try {
      return localStorage.getItem('typer_hf_token') || '';
    } catch (e) {
      return '';
    }
  });

  useEffect(() => {
    // تشغيل المظهر المتجاوب الافتراضي بناءً على أبعاد الشاشة
    setIsSidebarOpen(window.innerWidth >= 1024);
  }, []);

  // 💾 تأثير استعادة الخطوط تلقائياً من الذاكرة الدائمة عند فتح التطبيق
  useEffect(() => {
    const loadSavedFonts = async () => {
      try {
        const savedFonts = await getFonts();
        const loadedFontsList: CustomFont[] = [];
        
        for (const font of savedFonts) {
          try {
            const fontFace = new FontFace(font.name, font.data);
            await fontFace.load();
            document.fonts.add(fontFace);
            loadedFontsList.push({ name: font.name, value: font.name });
          } catch (err) {
            console.error("فشل تحميل الخط المحفوظ:", font.name, err);
          }
        }
        
        if (loadedFontsList.length > 0) {
          setCustomFonts(prev => [...prev, ...loadedFontsList]);
          addToast(`✓ تم تحميل ${loadedFontsList.length} خطوط محفوظة تلقائياً 💾`, 'success');
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
  
  // 📏 خيار هامش أمان أسطر الفقاعات
  const [bubbleMargin, setBubbleMargin] = useState<number>(10);

  // 👈 المجلدات والأنماط المنسقة مع استعادتها تلقائياً من التخزين المحلي عند فتح التطبيق
  const [folders, setFolders] = useState<StyleFolder[]>(() => {
    try {
      const saved = localStorage.getItem('typer_studio_folders');
      return saved ? JSON.parse(saved) : INITIAL_FOLDERS;
    } catch (e) {
      return INITIAL_FOLDERS;
    }
  });
  
  const [selectedStyleId, setSelectedStyleId] = useState<string>('style_normal');

  // مزامنة المجلدات والأنماط وحفظها تلقائياً وبشكل فوري عند حدوث أي تعديل (إضافة، حذف، تحرير)
  useEffect(() => {
    try {
      localStorage.setItem('typer_studio_folders', JSON.stringify(folders));
    } catch (e) {
      console.error('Error auto-saving folders:', e);
    }
  }, [folders]);

  // خصائص تنسيق خطوط النص للطبقة النشطة
  const [fontFamily, setFontFamily] = useState<string>('Tahoma, sans-serif');
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

  // إدارة وتفضيل الخطوط المخصصة
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  
  // استعادة الخطوط المفضلة تلقائيًا من الذاكرة المحلية عند بدء التشغيل
  const [favFonts, setFavFonts] = useState<string[]>(() => {
    return getFavoriteFonts();
  });
  const [showFontManager, setShowFontManager] = useState<boolean>(false);

  // حفظ الخطوط المفضلة تلقائياً في الذاكرة المحلية عند أي تعديل عليها
  useEffect(() => {
    saveFavoriteFonts(favFonts);
  }, [favFonts]);

  // قوالب الأشكال الجاهزة
  const [presets, setPresets] = useState<ShapePreset[]>(INITIAL_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // معايير التمطيط والكشيدة العربية
  const [tatweelStrength, setTatweelStrength] = useState<number>(2);
  const [tatweelMargin, setTatweelMargin] = useState<number>(5);
  const [activeLayer, setActiveLayer] = useState<MangaLayer | null>(null);

  // حدود صندوق الاختيار المرن يدوياً
  const [selectionBox, setSelectionBox] = useState<{ left: number; top: number; width: number; height: number; visible: boolean } | null>(null);

  // معلومات وقناع العصا السحرية للفقاعة المكتشفة
  const [wandMask, setWandMask] = useState<Uint8Array | null>(null);
  const [detectedBubbleType, setDetectedBubbleType] = useState<'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval' | null>(null); // 👈 تغيير circular لـ vertical_oval
  const [autoApplyBubbleStyle, setAutoApplyBubbleStyle] = useState<boolean>(true);
  const [edgeSegments, setEdgeSegments] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; horiz: boolean }>>([]);
  
  // صف انتظار الفقاعات المحدد للإدخال والتبييض الجماعي
  const [bubbleQueue, setBubbleQueue] = useState<Array<{ 
    bboxX: number; 
    bboxY: number; 
    bboxW: number; 
    bboxH: number; 
    scaleX: number; 
    scaleY: number; 
    shape?: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval'; // 👈 بيضاوية رأسية
    mask?: Uint8Array;
    seedColor?: string; // تبييض الفقاعات بلونها الأصلي
  }>>([]);

  // إعدادات العلامة المائية
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

  // 💾 السجل الموحد لكل صفحة: لقطات الطبقات والرسم معاً للتراجع الموحد والكامل
  const [history, setHistory] = useState<Record<number, { undo: HistorySnapshot[]; redo: HistorySnapshot[] }>>({});

  // حالات النوافذ المنبثقة
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showExportSelectorModal, setShowExportSelectorModal] = useState<boolean>(false);
  const [checkedStylesForExport, setCheckedStylesForExport] = useState<string[]>([]);

  // 👈 حالات إدارة نافذة تعديل الأنماط التفاعلية الجديدة
  const [editingStyle, setEditingStyle] = useState<{ style: TextStyle; folderId: string } | null>(null);
  const [editFormName, setEditFormName] = useState('');
  const [editFormFolderId, setEditFormFolderId] = useState('');
  const [editFormFamily, setEditFormFamily] = useState('Tahoma, sans-serif');
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
  const [wandSeedColor, setWandSeedColor] = useState<string>('#ffffff'); // لون تبييض الفقاعة المكتشف تلقائياً

  // قائمة إشعارات الـ Toast للتنبيهات السريعة
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; type?: 'error' | 'success' }>>([]);

  const addToast = (msg: string, type?: 'error' | 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  };

  // تحويل روابط Base64 النصية إلى كائنات Blob بشكل متناسق وموثوق
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

  // 📥 دالة التحميل والمشاركة العالمية المتوافقة مع الويب وWebView
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
        if (err.name === 'AbortError') {
          return;
        }
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

  // معالجة تغيير الصفحة وتنظيف التحديدات الحالية
  const handlePageChange = (index: number) => {
    if (index < 0 || index >= pages.length) return;
    
    const currentPage = pages[currentPageIndex];
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
            fontFamily: inner?.style.fontFamily || 'Tahoma, sans-serif',
            fontWeight: inner?.style.fontWeight || 'normal',
            fontStyle: inner?.style.fontStyle || 'normal',
            textDecoration: inner?.style.textDecorationLine || 'none',
            textAlign: (inner?.style.textAlign as 'center' | 'left' | 'right') || 'center',
            lineHeight: parseFloat(inner?.style.lineHeight) || 1.25,
            letterSpacing: inner?.style.letterSpacing || '0px',
            bgColor: hEl.style.backgroundColor || 'transparent',
          }
        } as MangaLayer;
      });
      pages[currentPageIndex].layers = activeLayers;
    }

    setCurrentPageIndex(index);
    setMangaSrc(pages[index].src);
    setActiveLayer(null);
    clearWandSelection();
    setSelectionBox(null);
  };

  // معالجة نصوص السيناريو وتقسيمها إلى أسطر وتصفيتها مع ميزة مطابقة وحذف علامات التنسيق المفتوحة والخاصة ذكياً
  useEffect(() => {
    const rawLines = scriptInput.split('\n');
    const parsed: ProcessedLine[] = [];

    // تجميع كافة الأوسمة المخصصة من الأنماط الحالية للتحقق الديناميكي منها
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
        // 1. أولاً: التحقق من التنسيق الافتراضي المحاط بأقواس مثل: [scream] نص
        const bracketMatch = text.match(/^\[(.*?)\]\s*(.*)/);
        if (bracketMatch) {
          styleKey = bracketMatch[1].toLowerCase();
          text = bracketMatch[2];
        } else {
          // 2. ثانياً: التحقق ديناميكياً من كافة العلامات المفتوحة والمخصصة (مثل "" أو SFX) لحذفها تماماً من الفقاعة
          // نقوم بترتيب العلامات من الأطول للأقصر لتفادي التعارض عند مطابقتها
          const sortedTags = [...customStyleTags].sort((a, b) => b.length - a.length);
          
          for (const tag of sortedTags) {
            if (!tag) continue;
            
            // صياغة تعبير منتظم مرن يطابق العلامة في بداية السطر متبوعة اختيارياً بمسافات أو نقطتين ومسافات
            const escapedTag = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            
            // يطابق العلامة في أول السطر متبوعة بنقطتين أو مسافات
            const regex = new RegExp(`^${escapedTag}\\s*(?:[:：]\\s*)?(.*)`, 'i');
            const match = text.match(regex);
            
            if (match) {
              styleKey = tag;
              text = match[1]; // حذف علامة التنسيق تماماً من النص المدخل والمحاذاة داخل الفقاعة!
              break; // التوقف فور مطابقة أول علامة مخصصة بنجاح
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
  }, [scriptInput, folders]); // 👈 تحديث الفرز الفوري للترجمة عند تعديل الأنماط أو المجلدات أو وسوم التحديد تلقائياً!

  const handleSelectLine = (index: number) => {
    if (index < 0 || index >= parsedLines.length) return;
    setCurrentLineIndex(index);
    const line = parsedLines[index];

    if (line.targetPageNum !== null) {
      const targetIdx = line.targetPageNum - 1;
      if (targetIdx >= 0 && targetIdx < pages.length) {
        handlePageChange(targetIdx);
      }
      if (index + 1 < parsedLines.length) {
        handleSelectLine(index + 1);
      }
      return;
    }

    if (line.isIgnored) {
      if (index + 1 < parsedLines.length) {
        handleSelectLine(index + 1);
      }
      return;
    }

    // تجميع كافة الأنماط المطابقة لعلامة السطر
    let matchingStyles: TextStyle[] = [];
    folders.forEach(f => {
      f.styles.forEach(s => {
        if (s.tags.includes(line.styleKey) && s.enabled) {
          matchingStyles.push(s);
        }
      });
    });

    if (matchingStyles.length > 0) {
      // ترتيب تصاعدي حسب تاريخ التعديل الأول/الأقدم ليعطي الأولوية للنمط الذي تم تعديله أولاً وبشكل مستقر تماماً
      matchingStyles.sort((a, b) => {
        const timeA = a.updatedAt || 0;
        const timeB = b.updatedAt || 0;
        return timeA - timeB;
      });
      setSelectedStyleId(matchingStyles[0].id);
    } else {
      setSelectedStyleId('style_normal');
    }
  };

  // مزامنة المتغيرات والأنماط بناءً على التغيير في التنسيق المحدد
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
      setFontFamily(style.fontFamily);
      setBold(!!style.bold);
      setItalic(!!style.italic);
      setUnderline(!!style.underline);
    }
  }, [selectedStyleId, folders]);

  const currentLayers = pages[currentPageIndex]?.layers || [];

  // 💾 دالة التقاط لقطة حالية للطبقات والرسم لتضمينها في عمليات التراجع
  const pushSnapshot = (customLayers?: MangaLayer[], customCleaningUrl?: string) => {
    if (currentPageIndex === -1) return;
    const activeLayers = customLayers !== undefined ? customLayers : [...currentLayers];
    const activeCleaningUrl = customCleaningUrl !== undefined ? customCleaningUrl : (pages[currentPageIndex]?.cleaningDataUrl || '');

    setHistory(prev => {
      const pageHist = prev[currentPageIndex] || { undo: [], redo: [] };
      const newUndo = [...pageHist.undo.slice(-29), { layers: activeLayers, cleaningDataUrl: activeCleaningUrl }];
      return {
        ...prev,
        [currentPageIndex]: {
          undo: newUndo,
          redo: []
        }
      };
    });
  };

  const pushToHistory = (newLayersState: MangaLayer[]) => {
    pushSnapshot(newLayersState, pages[currentPageIndex]?.cleaningDataUrl || '');
  };

  // دالة تحديث الطبقات المحدثة لاحتضان تفتيت الأسطر الفوري والتلقائي بناءً على lineCountOverride المختار
  const handleUpdateLayer = (layerId: string, updates: Partial<MangaLayer>) => {
    if (currentPageIndex === -1) return;
    const previousState = [...currentLayers];

    setPages(prev =>
      prev.map((page, idx) => {
        if (idx !== currentPageIndex) return page;
        return {
          ...page,
          layers: page.layers.map(l => {
            if (l.id !== layerId) return l;
            
            // تهيئة الكائن بعد دمج التعديلات
            let updatedLayer = { ...l, ...updates };
            
            // في حال تم تغيير خيار عدد الأسطر يدوياً، نعيد حساب التفاف السطور وحجم الخط فوراً
            if ('lineCountOverride' in updates && activeTool !== 'brush' && activeTool !== 'eraser' && activeTool !== 'clone_stamp') {
              const img = document.getElementById('manga-img') as HTMLImageElement;
              if (img && img.naturalWidth) {
                const layerWidth = parseFloat(updatedLayer.width) || 120;
                const layerHeight = parseFloat(updatedLayer.height) || 80;
                
                // تحديد شكل الفقاعة الحالية
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
                  updates.lineCountOverride // التمرير المباشر للقيمة الجديدة
                );
                
                updatedLayer.text = opt.textWithBreaks;
                updatedLayer.style = {
                  ...updatedLayer.style,
                  fontSize: `${opt.fontSize}px`
                };
              }
            }

            if (activeLayer?.id === layerId) {
              setActiveLayer(updatedLayer);
            }
            return updatedLayer;
          }),
        };
      })
    );

    pushToHistory(previousState);
  };

  const handleDeleteLayer = (layerId: string) => {
    if (currentPageIndex === -1) return;
    const previousState = [...currentLayers];

    setPages(prev =>
      prev.map((page, idx) => {
        if (idx !== currentPageIndex) return page;
        return {
          ...page,
          layers: page.layers.filter(l => l.id !== layerId),
        };
      })
    );

    if (activeLayer?.id === layerId) {
      setActiveLayer(null);
    }
    pushToHistory(previousState);
    addToast('تم حذف الطبقة بنجاح');
  };

  const handleDuplicateLayer = (layerId: string) => {
    if (currentPageIndex === -1 || !pages[currentPageIndex]) return;
    const page = pages[currentPageIndex];
    const layer = page.layers.find(l => l.id === layerId);
    if (!layer) return;

    const previousLayers = [...page.layers];
    const leftVal = parseFloat(layer.left) || 0;
    const topVal = parseFloat(layer.top) || 0;
    
    const newLayer: MangaLayer = {
      ...layer,
      id: `lid_${Date.now()}_dup_${Math.floor(Math.random() * 1000)}`,
      left: `${leftVal + 20}px`,
      top: `${topVal + 20}px`,
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

  const handleSavePresetFromStyle = (style: any) => {
    const name = prompt('أدخل اسم النمط الجديد لحفظه في القوالب:');
    if (!name) return;

    const newPreset: ShapePreset = {
      id: `p_${Date.now()}`,
      name,
      color: style.color || '#000000',
      bg: style.bgColor || 'transparent',
      font: style.fontFamily || 'Inter',
      size: !style.fontSize ? 'auto' : (parseFloat(style.fontSize) || 16),
      bold: style.fontWeight === 'bold',
      italic: style.fontStyle === 'italic',
      align: style.textAlign || 'center',
      lh: style.lineHeight || 1.3,
      tracking: parseFloat(style.letterSpacing) || 0,
    };

    setPresets(prev => [...prev, newPreset]);
    addToast('✓ أضيف نمط القالب الخاص بك بنجاح', 'success');
  };

  // 💾 التراجع الموحد والكامل للطبقات وتبييض الرسم معاً
  const handleUndo = () => {
    if (currentPageIndex === -1 || !pages[currentPageIndex]) return;
    const pageHist = history[currentPageIndex];
    if (!pageHist || pageHist.undo.length === 0) {
      addToast('لا توجد خطوات سابقة للتراجع عنها', 'error');
      return;
    }

    const currentState: HistorySnapshot = {
      layers: currentLayers,
      cleaningDataUrl: pages[currentPageIndex].cleaningDataUrl || ''
    };

    const previousState = pageHist.undo[pageHist.undo.length - 1];

    setPages(prev =>
      prev.map((page, idx) => {
        if (idx !== currentPageIndex) return page;
        return {
          ...page,
          layers: previousState.layers,
          cleaningDataUrl: previousState.cleaningDataUrl || undefined
        };
      })
    );

    setHistory(prev => {
      const ph = prev[currentPageIndex];
      return {
        ...prev,
        [currentPageIndex]: {
          undo: ph.undo.slice(0, -1),
          redo: [...ph.redo, currentState]
        }
      };
    });

    setActiveLayer(null);
    addToast('✓ تراجع عن آخر خطوة موحدة ↩', 'success');
  };

  // 💾 الإعادة الموحدة للرسم والطبقات
  const handleRedo = () => {
    if (currentPageIndex === -1 || !pages[currentPageIndex]) return;
    const pageHist = history[currentPageIndex];
    if (!pageHist || pageHist.redo.length === 0) {
      addToast('لا تتوفر خطوات لإعادة تطبيقها', 'error');
      return;
    }

    const currentState: HistorySnapshot = {
      layers: currentLayers,
      cleaningDataUrl: pages[currentPageIndex].cleaningDataUrl || ''
    };

    const nextState = pageHist.redo[pageHist.redo.length - 1];

    setPages(prev =>
      prev.map((page, idx) => {
        if (idx !== currentPageIndex) return page;
        return {
          ...page,
          layers: nextState.layers,
          cleaningDataUrl: nextState.cleaningDataUrl || undefined
        };
      })
    );

    setHistory(prev => {
      const ph = prev[currentPageIndex];
      return {
        ...prev,
        [currentPageIndex]: {
          undo: [...ph.undo, currentState],
          redo: ph.redo.slice(0, -1)
        }
      };
    });

    setActiveLayer(null);
    addToast('✓ إعادة تطبيق آخر خطوة موحدة ↪', 'success');
  };

  const handleCleaningUndo = () => handleUndo();
  const handleCleaningRedo = () => handleRedo();

  const handleUpdateCleaningDataUrl = (url: string) => {
    if (currentPageIndex === -1 || !pages[currentPageIndex]) return;
    
    pushSnapshot(currentLayers, pages[currentPageIndex].cleaningDataUrl || '');

    setPages(prev =>
      prev.map((page, idx) => {
        if (idx !== currentPageIndex) return page;
        return { ...page, cleaningDataUrl: url };
      })
    );
  };

  // 🧼 دمج مسارات الطبقات مع صورة الخلفية نهائياً
  const handleMergeLayers = () => {
    if (currentPageIndex === -1 || !pages[currentPageIndex]) return;
    const page = pages[currentPageIndex];
    if (page.layers.length === 0) {
      addToast('⚠️ لا توجد طبقات نصوص لدمجها حالياً في هذه الصفحة', 'error');
      return;
    }

    const confirmMerge = window.confirm('هل أنت متأكد من دمج جميع الطبقات؟ سيتم دمج النصوص مع صورة الخلفية نهائياً (يمكنك التراجع عن هذه الخطوة لاحقاً ↩).');
    if (!confirmMerge) return;

    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    if (!imgEl || !imgEl.naturalWidth) {
      addToast('⚠️ لم يتم العثور على صورة المانجا لدمج الطبقات فوقها', 'error');
      return;
    }

    pushSnapshot(currentLayers, page.cleaningDataUrl || '');

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
            renderLayerToCanvasBuffer(ctx, l, scaleX, scaleY);
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
        addToast('✓ تم دمج جميع الطبقات وتسطيحها مع الخلفية بنجاح! 📥🎨', 'success');
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
  };

  // تبييض المساحة النشطة المحددة بضربة العصا السحرية؛ تم تعديلها لتلوين الفقاعة بلونها المكتشف تلقائياً
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
    
    // استخدام لون الفقاعة الخلفي المكتشف بدقة (سواء أسود، ذهبي، أو أبيض) بدلاً من افتراض اللون الأبيض دائماً
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

  // معالجة رفع صور الصفحات وفرزها عددياً
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

  // مسح التحديدات المكتشفة بالعصا السحرية
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

  // خوارزمية العصا السحرية الدقيقة جداً (1 بكسل للتوقف الفوري عند الحواف والحدود ومنع تسريب الألوان)
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
    const px = Math.round(clickX * scaleX);
    const py = Math.round(clickY * scaleY);

    if (px < 0 || px >= imgW || py < 0 || py >= imgH) return;

    const imgData = octx.getImageData(0, 0, imgW, imgH);
    const data = imgData.data;

    const si = (py * imgW + px) * 4;
    const sA = data[si + 3];
    if (sA < 30) {
      addToast('⚠️ اضغط داخل الفقاعة وليس على مساحة فارغة', 'error');
      return;
    }
    const sR = data[si], sG = data[si + 1], sB = data[si + 2];
    const seedLuminance = 0.299 * sR + 0.587 * sG + 0.114 * sB; // 👈 حساب سطوع البكسل المستهدف للفقاعة

    // حفظ لون بكسل البداية للفقاعة المحددة لاستخدامه لاحقاً في التبييض التلقائي بلونها الأصلي
    const hexColor = "#" + ((1 << 24) + (sR << 16) + (sG << 8) + sB).toString(16).slice(1);
    setWandSeedColor(hexColor);

    const tolerance = wandTolerance;
    const mask = new Uint8Array(imgW * imgH);

    // حدد نطاق البحث المحلي حول نقطة النقرة لمنع تسريب التحديد لكامل الصفحة البيضاء
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

        if (nx < minX_limit || nx > maxX_limit || ny < minY_limit || ny > maxY_limit) {
          continue; 
        }

        const np = ny * imgW + nx;
        if (mask[np]) {
          continue; 
        }

        const ni = np * 4;
        const nR = data[ni];
        const nG = data[ni + 1];
        const nB = data[ni + 2];
        const nA = data[ni + 3];

        if (nA < 30) {
          continue; 
        }

        const dr = nR - sR;
        const dg = nG - sG;
        const db = nB - sB;
        const distToSeed = Math.sqrt(dr*dr + dg*dg + db*db);

        let matchesColor = distToSeed <= tolerance;

        // 🛡️ حاجز حماية صلب: منع عبور أو التحديد فوق الخطوط والحدود السوداء تماماً
        if (seedLuminance > 120) {
          const targetLuminance = 0.299 * nR + 0.587 * nG + 0.114 * nB;
          if (targetLuminance < 85) {
            matchesColor = false; 
          }
        } else if (seedLuminance < 85) {
          const targetLuminance = 0.299 * nR + 0.587 * nG + 0.114 * nB;
          if (targetLuminance > 130) {
            matchesColor = false;
          }
        }

        if (matchesColor) {
          mask[np] = 1;
          queue[tail++] = np;
        }
      }
    }

    // 💾 خوارزمية سد الفراغات والثقوب بالفقاعة لضمان دقة القناع
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
          isEdge = true;
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
    let bType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval' = 'normal_oval'; // 👈 تغيير circular لـ vertical_oval
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
      } else if (aspect >= 0.5 && aspect <= 1.45) { // 👈 تم كشف والتمييز التلقائي ليكون أكثر دقة للفقاعة الدائرية والعمودية الطويلة معاً
        bType = 'vertical_oval'; // 👈 التبديل لنمط بيضاوية رأسية
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

    // 👈 ربط وتحديث الطبقة النصية النشطة المحددة فوراً عند التحديد بالعصا السحرية لتبسيط العمل وتوزيع الحروف تلقائياً
    if (activeLayer && !multiBubbleMode) {
      const previousLayers = [...currentLayers];
      
      const targetLeft = minX / scaleX;
      const targetTop = minY / scaleY;
      const targetW = foundW / scaleX;
      const targetH = foundH / scaleY;

      const marginRatio = bubbleMargin / 100;
      const padX = targetW * marginRatio;
      const padY = targetH * marginRatio;
      const layerLeft = targetLeft + padX;
      const layerTop = targetTop + padY;
      const layerWidth = Math.max(20, targetW - padX * 2);
      const layerHeight = Math.max(20, targetH - padY * 2);

      const opt = calculateOptimalFontSizeForShape(
        // إزالة فواصل الأسطر لتوزيع الكلمات ديناميكياً بدقة
        activeLayer.text.replace(/\n/g, ' '),
        bType,
        layerWidth,
        layerHeight,
        activeLayer.style.fontFamily,
        activeLayer.style.lineHeight,
        parseFloat(activeLayer.style.letterSpacing) || 0,
        bubbleMargin,
        activeLayer.lineCountOverride // 👈 تمرير خيار عدد الأسطر الحالي للطبقة
      );

      handleUpdateLayer(activeLayer.id, {
        left: `${layerLeft}px`,
        top: `${layerTop}px`,
        width: `${layerWidth}px`,
        height: `${layerHeight}px`,
        text: opt.textWithBreaks,
        style: {
          ...activeLayer.style,
          fontSize: autoFitText ? `${opt.fontSize}px` : activeLayer.style.fontSize,
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
        seedColor: hexColor, // 👈 تبييض الفقاعات المتعددة بلونها الأصلي
      }]);
      addToast('أضيفت الفقاعة إلى قائمة الإدراج المتتابع', 'success');
    } else {
      if (!activeLayer) {
        addToast('✓ تم تحديد الفقاعة نجاحاً بالعصا');
      }
    }
  };

  // تأثير الرسوم المتحركة لمسارات قناع العصا السحرية
  useEffect(() => {
    if (!wandMask || !edgeSegments.length || !wandDimensions) return;

    const canvas = wandCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { imgW, imgH, dispW, dispH, x: minX, y: minY, w: foundW, h: hSize } = wandDimensions;
    const dsx = dispW / imgW;
    const dsy = dispH / imgH;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const id = ctx.createImageData(canvas.width, canvas.height);
      const d = id.data;
      const maxY = minY + hSize;
      const maxX = minX + foundW;

      for (let y = minY; y <= maxY; y++) {
        const row = y * imgW;
        for (let x = minX; x <= maxX; x++) {
          if (!wandMask[row + x]) continue;
          const dx = Math.round(x * dsx);
          const dy = Math.round(y * dsy);
          if (dx < 0 || dx >= canvas.width || dy < 0 || dy >= canvas.height) continue;
          const di = (dy * canvas.width + dx) * 4;
          d[di] = 0;
          d[di + 1] = 160;
          d[di + 2] = 255;
          d[di + 3] = 45;
        }
      }
      ctx.putImageData(id, 0, 0);

      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([5, 3]);
      ctx.lineDashOffset = -matchOffsetRef.current;
      ctx.beginPath();
      edgeSegments.forEach(s => {
        ctx.moveTo(s.x1 * dsx, s.y1 * dsy);
        ctx.lineTo(s.x2 * dsx, s.y2 * dsy);
      });
      ctx.stroke();

      ctx.strokeStyle = '#000000';
      ctx.lineDashOffset = -(matchOffsetRef.current + 4);
      ctx.beginPath();
      edgeSegments.forEach(s => {
        ctx.moveTo(s.x1 * dsx, s.y1 * dsy);
        ctx.lineTo(s.x2 * dsx, s.y2 * dsy); // 👈 تم تصحيح الارتفاع بنجاح هنا
      });
      ctx.stroke();
      ctx.restore();

      matchOffsetRef.current = (matchOffsetRef.current + 0.45) % 8;
      rAFRef.current = requestAnimationFrame(tick);
    };

    tick();
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, [wandMask, edgeSegments, wandDimensions]);

  // إدراج النصوص والترجمة بالفقاعة المحددة
  const handleInsertText = () => {
    if (parsedLines.length === 0 || currentLineIndex === -1) {
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

    const marginRatio = bubbleMargin / 100;
    const padX = targetWidth * marginRatio;
    const padY = targetHeight * marginRatio;
    const layerLeft = targetLeft + padX;
    const layerTop = targetTop + padY;
    const layerWidth = Math.max(20, targetWidth - padX * 2);
    const layerHeight = Math.max(20, targetHeight - padY * 2);

    const rawTxt = parsedLines[currentLineIndex].text;
    let txt = rawTxt;
    let bType = detectedBubbleType;

    const layStyle = {
      fontSize: fontSize === 'auto' ? '' : `${parseFloat(fontSize)}px`,
      color: textColor,
      fontFamily: fontFamily,
      fontWeight: bold ? 'bold' : 'normal',
      fontStyle: italic ? 'italic' : 'normal',
      textDecoration: underline ? 'underline' : 'none',
      textAlign: textAlign,
      lineHeight: lineHeight,
      letterSpacing: `${tracking}px`,
      bgColor: bgTransparent ? 'transparent' : bgColor,
    };

    if (hasWand && bType) {
      const opt = calculateOptimalFontSizeForShape(
        rawTxt,
        bType,
        layerWidth,
        layerHeight,
        fontFamily,
        lineHeight,
        tracking,
        bubbleMargin,
        activeLayer?.lineCountOverride
      );
      layStyle.fontSize = `${opt.fontSize}px`;
      txt = opt.textWithBreaks;
    } else if (!layStyle.fontSize) {
      const optSize = calculateOptimalFontSize(txt, layerWidth, layerHeight, fontFamily, lineHeight, tracking);
      layStyle.fontSize = `${optSize}px`;
    }

    const newLayer: MangaLayer = {
      id: `lid_${Date.now()}_${Math.floor(Math.random()*1000)}`,
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

    if (currentLineIndex < parsedLines.length - 1) {
      handleSelectLine(currentLineIndex + 1);
    }

    clearWandSelection();
    setSelectionBox(null);
  };

  // محاذاة وتوسيط النص ضمن منطقة التحديد يدوياً أو العصا السحرية للفقاعة المحددة
  const handleAlignText = () => {
    if (!activeLayer) {
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

    const hasWand = wandDimensions !== null; // 👈 تفادي قيود قناع العصا السحرية لتعمل المحاذاة دوماً بنسبة 100% بمجرد وجود التحديد
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

    // تطبيق هوامش الأمان للفقاعة
    const marginRatio = bubbleMargin / 100;
    const padX = targetW * marginRatio;
    const padY = targetH * marginRatio;
    const layerLeft = targetLeft + padX;
    const layerTop = targetTop + padY;
    const layerWidth = Math.max(20, targetW - padX * 2);
    const layerHeight = Math.max(20, targetH - padY * 2);

    let optSize = parseFloat(activeLayer.style.fontSize) || 16;
    let newText = activeLayer.text;

    // إذا كانت المحاذاة داخل العصا السحرية، نوزع النص ديناميكياً ليطابق شكل الفقاعة تماماً
    if (isWandAlign && detectedBubbleType) {
      const opt = calculateOptimalFontSizeForShape(
        // نزيل فواصل الأسطر الحالية لنعيد توزيع الكلمات بمرونة تامة مع الموازنة التلقائية
        activeLayer.text.replace(/\n/g, ' '),
        detectedBubbleType,
        layerWidth,
        layerHeight,
        activeLayer.style.fontFamily,
        activeLayer.style.lineHeight,
        parseFloat(activeLayer.style.letterSpacing) || 0,
        bubbleMargin,
        activeLayer.lineCountOverride // 👈 تمرير خيار عدد الأسطر الحالي للطبقة
      );
      optSize = opt.fontSize;
      newText = opt.textWithBreaks;
    } else {
      optSize = calculateOptimalFontSize(
        activeLayer.text,
        layerWidth,
        layerHeight,
        activeLayer.style.fontFamily,
        activeLayer.style.lineHeight,
        parseFloat(activeLayer.style.letterSpacing) || 0
      );
    }

    handleUpdateLayer(activeLayer.id, {
      left: `${layerLeft}px`,
      top: `${layerTop}px`,
      width: `${layerWidth}px`,
      height: `${layerHeight}px`,
      text: newText,
      style: {
        ...activeLayer.style,
        fontSize: autoFitText ? `${optSize}px` : activeLayer.style.fontSize,
      },
    });

    pushToHistory(previousLayers);
    setSelectionBox(null);
    clearWandSelection();
    addToast('تمت محاذاة وتوسيط النص داخل الفقاعة المحددة بنجاح 🎉', 'success');
  };

  // تطبيق الكشيدة والتمطيط العربي؛ التمطيط فقط على السطر الأول والأخير
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
    ctx.font = `${activeLayer.style.fontStyle} ${activeLayer.style.fontWeight} ${fontSz}px ${activeLayer.style.fontFamily}`;

    const widths = lines.map(l => ctx.measureText(l).width);
    const maxW = Math.max(...widths);
    const targetW = maxW * (1 - tatweelMargin / 100);

    const stretched = lines.map((line, idx) => {
      const w = ctx.measureText(line).width;
      if (w >= targetW * 0.95) return line;
      
      // 👈 تم تعديل دالة التمطيط يدوياً لتلتزم بالتمطيط للسطر الأول والأخير فقط
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

  // تطبيق القوالب المنسقة مسبقاً
  const handleApplyPreset = (pId: string) => {
    const preset = presets.find(x => x.id === pId);
    if (!preset) return;

    setActivePresetId(pId);
    setFontSize(preset.size === 'auto' ? 'auto' : `${preset.size}`);
    setTextColor(preset.color);
    setBgTransparent(preset.bg === 'transparent');
    setBgColor(preset.bg === 'transparent' ? '#ffffff' : preset.bg);
    setFontFamily(preset.font);
    setBold(preset.bold);
    setItalic(preset.italic);
    setLineHeight(preset.lh);
    setTracking(preset.tracking);
    setTextAlign(preset.align);

    if (activeLayer) {
      const prevLayers = [...currentLayers];
      const optFs = preset.size === 'auto' 
        ? calculateOptimalFontSize(
            activeLayer.text, 
            parseFloat(activeLayer.width) || 120, 
            parseFloat(activeLayer.height) || 80, 
            preset.font, 
            preset.lh, 
            preset.tracking
          ) 
        : preset.size;

      handleUpdateLayer(activeLayer.id, {
        style: {
          fontSize: `${optFs}px`,
          color: preset.color,
          fontFamily: preset.font,
          fontWeight: preset.bold ? 'bold' : 'normal',
          fontStyle: preset.italic ? 'italic' : 'normal',
          textDecoration: 'none',
          textAlign: preset.align,
          lineHeight: preset.lh,
          letterSpacing: `${preset.tracking}px`,
          bgColor: preset.bg,
        }
      });
      pushToHistory(prevLayers);
    }
    addToast(`تم تطبيق نمط الشكل: ${preset.name}`);
  };

  const handleSaveCurrentPreset = () => {
    const name = prompt('أدخل اسم النمط الجديد لحفظه في القوالب:');
    if (!name) return;

    const newPreset: ShapePreset = {
      id: `p_${Date.now()}`,
      name,
      color: textColor,
      bg: bgTransparent ? 'transparent' : bgColor,
      font: fontFamily,
      size: fontSize === 'auto' ? 'auto' : parseFloat(fontSize),
      bold: bold,
      italic: italic,
      align: textAlign,
      lh: lineHeight,
      tracking: tracking,
    };

    setPresets(prev => [...prev, newPreset]);
    addToast('✓ أضيف نمط القالب الخاص بك بنجاح', 'success');
  };

  // إدارة وهيكلة مجلدات الأنماط
  const handleAddFolder = () => {
    const name = prompt('أدخل اسم المجلد الإداري الجديد للأنماط:');
    if (name) {
      setFolders(prev => [...prev, { id: `folder_${Date.now()}`, name, styles: [] }]);
      addToast(`مجلد "${name}" جاهز الآن`);
    }
  };

  // دالة إضافة نمط تنسيقي مع خيار تحديد المجلد المستهدف فوراً
  const handleAddStyle = () => {
    if (folders.length === 0) {
      addToast('أضف مجلداً تصنيفياً أولاً لتجميع هذا النمط بداخله', 'error');
      return;
    }
    const name = prompt('أدخل اسم النمط الجديد:');
    if (!name) return;

    let targetFolderId = folders[0].id;

    // تمكين خيار اختيار المجلد المستهدف عند وجود مجلدين أو أكثر
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
      fontFamily: 'Arial, sans-serif',
      tags: [name.toLowerCase()],
      enabled: true,
      tagColor: '#FFF3B0', // تلوين افتراضي جذاب لتمييز السطر في قائمة الترجمة
      updatedAt: Date.now() // 👈 ميزة تتبع زمن التعديل الأول لتحديد الأولويات بدقة
    };

    setFolders(prev =>
      prev.map(f => {
        if (f.id !== targetFolderId) return f;
        return { ...f, styles: [...f.styles, newStyle] };
      })
    );
    addToast(`تم تكوين النمط "${name}" وتخزينه بنجاح`, 'success');
  };

  // 👈 دالة حذف المجلد النشط وكل الأنماط بداخلها
  const handleDeleteFolder = (folderId: string) => {
    const target = folders.find(f => f.id === folderId);
    if (!target) return;
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف المجلد "${target.name}" وجميع الأنماط التنسيقية المندرجة بداخله؟`);
    if (!confirmDelete) return;

    setFolders(prev => prev.filter(f => f.id !== folderId));
    addToast(`✓ تم حذف المجلد "${target.name}" بنجاح`, 'success');
  };

  // 👈 دالة حفظ وإعادة فرز النمط المعدل داخل المجلدات
  const handleSaveEditedStyle = (updatedStyle: TextStyle, targetFolderId: string) => {
    setFolders(prev => {
      // إزالة النمط أولاً لتجنب التكرار
      const cleaned = prev.map(f => ({
        ...f,
        styles: f.styles.filter(s => s.id !== updatedStyle.id)
      }));
      // إضافته للمجلد الجديد المختار
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

  // 👈 دالة حذف نمط تنسيقي محدد
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

  // 👈 فتح شاشة تعديل النمط وملء حقول النموذج بالقيم الحالية للنمط التنسيقي المختار
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

  // 👈 نسخ قيم تنسيق الطبقة النشطة بمسرح العمل ومطابقتها مباشرة في النموذج التفاعلي
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
    clone.styles.forEach(s => s.id = `style_${Math.random().toString(36).substring(2, 9)}`);

    setFolders(prev => [...prev, clone]);
    addToast(`تم تكرار تصنيف "${target.name}"`);
  };

  const handleExportFolder = (folderId: string) => {
    const target = folders.find(f => f.id === folderId);
    if (!target) return;

    const blob = new Blob([JSON.stringify(target, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `folder-${target.name}.json`);
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

  const handleApplyStyleToActiveLayer = () => {
    if (!activeLayer) {
      addToast('❌ يرجى تحديد طبقة نص أولاً لتطبيق التنسيق', 'error');
      return;
    }

    const prevLayers = [...currentLayers];
    const optFs = fontSize === 'auto'
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
        fontSize: `${optFs}px`,
        color: textColor,
        fontFamily: fontFamily,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        textDecoration: underline ? 'underline' : 'none',
        textAlign: textAlign,
        lineHeight: lineHeight,
        letterSpacing: `${tracking}px`,
        bgColor: bgTransparent ? 'transparent' : bgColor,
      },
    });

    pushToHistory(prevLayers);
    addToast('تم تطبيق كامل إعدادات النمط بنجاح', 'success');
  };

  // محاكاة تمثيل طبقات النصوص على كائن Canvas مستقل (مفيد لـ PSD) - تم تحديثه لاحترام فواصل الأسطر \n
  const renderLayerToSeparateCanvas = (
    layer: MangaLayer,
    scaleX: number,
    scaleY: number
  ) => {
    const left = parseFloat(layer.left) * scaleX;
    const top = parseFloat(layer.top) * scaleY;
    const width = parseFloat(layer.width) * scaleX;
    const height = parseFloat(layer.height) * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return { canvas, left: Math.round(left), top: Math.round(top) };
    }

    const style = layer.style;
    const fs = (parseFloat(style.fontSize) || 16) * scaleY;
    const col = style.color || '#000000';
    const bgCol = style.bgColor || 'transparent';

    ctx.save();
    if (bgCol !== 'transparent' && bgCol !== 'rgba(0,0,0,0)' && bgCol !== 'rgba(0, 0, 0, 0)') {
      ctx.fillStyle = bgCol;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = col;
    const fWeight = style.fontWeight || 'normal';
    const fStyle = style.fontStyle || 'normal';
    ctx.font = `${fStyle} ${fWeight} ${fs}px ${style.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = style.textAlign || 'center';
    ctx.direction = 'rtl';

    // تقسيم ورسم النص مع احترام الأسطر الفرعية ومحاذاة التسطير
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
    const startY = (height - totalH) / 2 + lineH / 2;
    const xPos = style.textAlign === 'right' ? width - 4
               : style.textAlign === 'left'  ? 4
               : width / 2;

    lines.forEach((lineVal, idx) => {
      if (style.textDecoration === 'underline') {
        const metrics = ctx.measureText(lineVal);
        const ux = style.textAlign === 'center' ? xPos - metrics.width / 2 : xPos;
        ctx.fillRect(ux, startY + idx * lineH + fs * 0.55, metrics.width, Math.max(1, fs * 0.07));
      }
      ctx.fillText(lineVal, xPos, startY + idx * lineH);
    });

    ctx.restore();
    return { canvas, left: Math.round(left), top: Math.round(top) };
  };

  // محاكاة تمثيل طبقات النصوص على كائن Canvas مباشر للتصدير - تم تحديثه لاحترام فواصل الأسطر \n
  const renderLayerToCanvasBuffer = (
    ctx: CanvasRenderingContext2D,
    layer: MangaLayer,
    scaleX: number,
    scaleY: number
  ) => {
    const left = parseFloat(layer.left) * scaleX;
    const top = parseFloat(layer.top) * scaleY;
    const width = parseFloat(layer.width) * scaleX;
    const height = parseFloat(layer.height) * scaleY;
    const style = layer.style;
    const fs = (parseFloat(style.fontSize) || 16) * scaleY;
    const col = style.color || '#000000';
    const bgCol = style.bgColor || 'transparent';

    ctx.save();
    if (bgCol !== 'transparent' && bgCol !== 'rgba(0,0,0,0)' && bgCol !== 'rgba(0, 0, 0, 0)') {
      ctx.fillStyle = bgCol;
      ctx.fillRect(left, top, width, height);
    }

    ctx.fillStyle = col;
    const fWeight = style.fontWeight || 'normal';
    const fStyle = style.fontStyle || 'normal';
    ctx.font = `${fStyle} ${fWeight} ${fs}px ${style.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = style.textAlign || 'center';
    ctx.direction = 'rtl';

    // تقسيم ورسم النص مع احترام الأسطر الفرعية ومحاذاة التسطير
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
    const startY = top + (height - totalH) / 2 + lineH / 2;
    const xPos = style.textAlign === 'right' ? left + width - 4
               : style.textAlign === 'left'  ? left + 4
               : left + width / 2;

    lines.forEach((lineVal, idx) => {
      if (style.textDecoration === 'underline') {
        const metrics = ctx.measureText(lineVal);
        const ux = style.textAlign === 'center' ? xPos - metrics.width / 2 : xPos;
        ctx.fillRect(ux, startY + idx * lineH + fs * 0.55, metrics.width, Math.max(1, fs * 0.07));
      }
      ctx.fillText(lineVal, xPos, startY + idx * lineH);
    });

    ctx.restore();
  };

  // طباعة العلامة المائية على كائن Canvas
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
      ctx.font = `bold ${size}px 'Tahoma', 'Inter', sans-serif`;
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
        ctx.font = `bold ${size}px 'Tahoma', 'Inter', sans-serif`;
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

  // تصدير الصفحة النشطة إلى صورة PNG
  const handleExportPNG = () => {
    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    if (!imgEl || !imgEl.naturalWidth || pages.length === 0) {
      addToast('لا تتوفر صفحة مانجا نشطة لتصديرها', 'error');
      return;
    }

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
        renderLayerToCanvasBuffer(ctx, l, scaleX, scaleY);
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
  };

  // 📤 مشاركة الصفحة الحالية المترجمة مباشرة مع التطبيقات الأخرى
  const handleShare = () => {
    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    if (!imgEl || !imgEl.naturalWidth || pages.length === 0) {
      addToast('⚠️ لا تتوفر صفحة مانجا نشطة لمشاركتها', 'error');
      return;
    }

    addToast('🔄 جاري تحضير الصفحة للمشاركة...', 'success');

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
        renderLayerToCanvasBuffer(ctx, l, scaleX, scaleY);
      }
    });

    drawWatermarkToCanvas(ctx, canvas.width, canvas.height, async () => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const filename = `typer-translated-${pages[currentPageIndex]?.name || 'page'}.png`;

        // 📱 تفعيل المشاركة الأصلية في حال كان التطبيق يعمل كـ APK على الهاتف
        if (Capacitor && Capacitor.isNativePlatform()) {
          try {
            if (!Filesystem || !Share || !Directory) {
              addToast('⚠️ جاري معالجة تفعيل حزم المشاركة، يرجى المحاولة بعد قليل...', 'error');
              return;
            }
            const base64Raw = dataUrl.split(',')[1] || dataUrl;
            
            // كتابة الملف مؤقتاً في كاش الهاتف لتتمكن قائمة أندرويد من قراءته
            await Filesystem.writeFile({
              path: filename,
              data: base64Raw,
              directory: Directory.Cache,
            });

            const fileUriResult = await Filesystem.getUri({
              directory: Directory.Cache,
              path: filename,
            });

            // استدعاء شاشة المشاركة الأصلية للنظام لأي تطبيق آخر
            await Share.share({
              title: 'TypeR Studio - مشاركة ترجمة المانجا',
              files: [fileUriResult.uri],
            });

            // تنظيف الملف المؤقت فور إتمام العملية
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

        // 🌐 العمل في وضع المتصفح العادي (Web Browser)
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
  };

  // تصدير الصفحة النشطة كملف فوتوشوب PSD
  const handleExportPSD = () => {
    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    if (!imgEl || !imgEl.naturalWidth || pages.length === 0) {
      addToast('لا تتوفر صفحة مانجا نشطة لتصديرها', 'error');
      return;
    }

    addToast('جاري تصدير الصفحة بصيغة PSD الفوتوشوب مع الطبقات...', 'success');

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = imgEl.naturalWidth;
    bgCanvas.height = imgEl.naturalHeight;
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;

    bgCtx.drawImage(imgEl, 0, 0);

    const cleaningCanvas = cleaningCanvasRef.current;
    if (cleaningCanvas) {
      bgCtx.drawImage(cleaningCanvas, 0, 0);
    }

    const scaleX = imgEl.naturalWidth / imgEl.offsetWidth;
    const scaleY = imgEl.naturalHeight / imgEl.offsetHeight;

    const runPSDExport = () => {
      const children: any[] = [];

      children.push({
        name: 'خلفية الصفحة (Background)',
        canvas: bgCanvas,
      });

      currentLayers.forEach((l, index) => {
        if (l.hidden) return;
        const layerData = renderLayerToSeparateCanvas(l, scaleX, scaleY);
        
        children.push({
          name: `النص ${index + 1}: ${l.text.substring(0, 20)}${l.text.length > 20 ? '...' : ''}`,
          canvas: layerData.canvas,
          left: layerData.left,
          top: layerData.top,
          text: {
            text: l.text,
            style: {
              fontSize: (parseFloat(l.style.fontSize) || 16) * scaleY,
            }
          }
        });
      });

      const psdData = {
        width: imgEl.naturalWidth,
        height: imgEl.naturalHeight,
        children: children,
      };

      try {
        const buffer = writePsd(psdData);
        const blob = new Blob([buffer], { type: 'application/x-photoshop' });
        const safeName = (pages[currentPageIndex]?.name || 'page').replace(/\.[^.]+$/, '');
        triggerDownload(blob, `typer-translated-${safeName}.psd`);
      } catch (err: any) {
        console.error(err);
        addToast('خطأ أثناء كتابة ملف الـ PSD، يرجى إعادة المحاولة', 'error');
      }
    };

    drawWatermarkToCanvas(bgCtx, bgCanvas.width, bgCanvas.height, runPSDExport);
  };

  // تصدير وضغط جميع الصفحات بملف ZIP واحد
  const handleExportAllZip = () => {
    if (pages.length === 0) {
      addToast('لا توجد صفحات مضافة لتصديرها كـ ZIP', 'error');
      return;
    }

    addToast('📦 جاري معالجة وتجميع كل الصفحات في ملف ZIP مضغوط واحد...', 'success');

    const zip = new JSZip();
    let progressIdx = 0;

    const triggerNext = () => {
      if (progressIdx >= pages.length) {
        zip.generateAsync({ type: 'blob' }).then((blob) => {
          const cleanDate = new Date().toISOString().slice(0, 10);
          triggerDownload(blob, `typer-manga-pack-${cleanDate}.zip`);
        }).catch((err) => {
          console.error(err);
          addToast('حدث خطأ أثناء ضغط الملفات، يرجى تكرار المحاولة', 'error');
        });
        return;
      }

      const pState = pages[progressIdx];
      const exportImg = new Image();
      exportImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = exportImg.naturalWidth;
        canvas.height = exportImg.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          progressIdx++;
          setTimeout(triggerNext, 10);
          return;
        }

        ctx.drawImage(exportImg, 0, 0);

        const imgEl = document.getElementById('manga-img') as HTMLImageElement;
        const dispW = imgEl?.offsetWidth || 600;
        const dispH = imgEl?.offsetHeight || 800;

        const scaleX = exportImg.naturalWidth / dispW;
        const scaleY = exportImg.naturalHeight / dispH;

        const finishPageExport = () => {
          pState.layers.forEach(l => {
            if (!l.hidden) renderLayerToCanvasBuffer(ctx, l, scaleX, scaleY);
          });

          drawWatermarkToCanvas(ctx, canvas.width, canvas.height, () => {
            canvas.toBlob((blob) => {
              if (blob) {
                const padIndex = String(progressIdx + 1).padStart(3, '0');
                const cleanPageName = pState.name.replace(/\.[^.]+$/, '');
                zip.file(`${padIndex}_${cleanPageName}.png`, blob);
              }
              progressIdx++;
              setTimeout(triggerNext, 120);
            }, 'image/png');
          });
        };

        const cleaningUrl = pState.cleaningDataUrl;
        if (cleaningUrl) {
          const cleaningImg = new Image();
          cleaningImg.onload = () => {
            ctx.drawImage(cleaningImg, 0, 0);
            finishPageExport();
          };
          cleaningImg.src = cleaningUrl;
        } else {
          finishPageExport();
        }
      };
      exportImg.src = pState.src;
    };

    triggerNext();
  };

  // تصدير جميع الصفحات منفصلة
  const handleExportAll = () => {
    if (pages.length === 0) {
      addToast('لا توجد صفحات مضافة لتصديرها', 'error');
      return;
    }

    let progressIdx = 0;
    addToast('بدء تصدير جميع دفعة الصفحات...', 'success');

    const triggerNext = () => {
      if (progressIdx >= pages.length) {
        addToast(`✓ تم الانتهاء من التصدير بالكامل! (${pages.length} صفحة)`, 'success');
        return;
      }

      const pState = pages[progressIdx];
      const exportImg = new Image();
      exportImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = exportImg.naturalWidth;
        canvas.height = exportImg.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(exportImg, 0, 0);

        const imgEl = document.getElementById('manga-img') as HTMLImageElement;
        const dispW = imgEl?.offsetWidth || 600;
        const dispH = imgEl?.offsetHeight || 800;

        const scaleX = exportImg.naturalWidth / dispW;
        const scaleY = exportImg.naturalHeight / dispH;

        const finishPageExport = () => {
          pState.layers.forEach(l => {
            if (!l.hidden) renderLayerToCanvasBuffer(ctx, l, scaleX, scaleY);
          });

          drawWatermarkToCanvas(ctx, canvas.width, canvas.height, () => {
            canvas.toBlob((blob) => {
              if (blob) {
                triggerDownload(blob, pState.name.replace(/\.[^.]+$/, '') + '-translated.png');
              }
              progressIdx++;
              setTimeout(triggerNext, 350);
            }, 'image/png');
          });
        };

        const cleaningUrl = pState.cleaningDataUrl;
        if (cleaningUrl) {
          const cleaningImg = new Image();
          cleaningImg.onload = () => {
            ctx.drawImage(cleaningImg, 0, 0);
            finishPageExport();
          };
          cleaningImg.src = cleaningUrl;
        } else {
          finishPageExport();
        }
      };
      exportImg.src = pState.src;
    };

    triggerNext();
  };

  // حفظ واستعادة تقدم وحالة المحرر
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
      presets,
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
      if (pkg.presets) setPresets(pkg.presets);

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

  // إدراج النصوص والتبييض الجماعي لصف انتظار الفقاعات المتعددة
  const handleApplyBubbleQueue = () => {
    if (bubbleQueue.length === 0) return;
    if (parsedLines.length === 0) {
      addToast('❌ الصق النص المعالج المترجم أولاً لتطبيقه على الفقاعات', 'error');
      return;
    }

    let lineIdx = currentLineIndex < 0 ? 0 : currentLineIndex;
    let pasteCount = 0;
    const prevLayers = [...currentLayers];
    const newAddedLayers: MangaLayer[] = [];

    bubbleQueue.forEach(b => {
      if (lineIdx >= parsedLines.length) return;
      const lineText = parsedLines[lineIdx].text;

      const layStyle = {
        fontSize: fontSize === 'auto' ? '' : `${parseFloat(fontSize)}px`,
        color: textColor,
        fontFamily: fontFamily,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        textDecoration: underline ? 'underline' : 'none',
        textAlign: textAlign,
        lineHeight: lineHeight,
        letterSpacing: `${tracking}px`,
        bgColor: 'transparent',
      };

      const marginRatio = bubbleMargin / 100;
      const padX = (b.bboxW / b.scaleX) * marginRatio;
      const padY = (b.bboxH / b.scaleY) * marginRatio;
      const layerLeft = b.bboxX / b.scaleX + padX;
      const layerTop = b.bboxY / b.scaleY + padY;
      const layerWidth = Math.max(20, b.bboxW / b.scaleX - padX * 2);
      const layerHeight = Math.max(20, b.bboxH / b.scaleY - padY * 2);

      let activeText = lineText;
      if (b.shape) {
        if (b.shape === 'narrative_box') {
          layStyle.fontFamily = 'Tahoma, sans-serif';
          layStyle.fontWeight = 'bold';
        } else if (b.shape === 'spiky_shout') {
          layStyle.fontFamily = 'Impact, sans-serif';
          layStyle.fontWeight = 'bold';
          layStyle.lineHeight = 1.15;
        } else if (b.shape === 'thought_cloud') {
          layStyle.fontFamily = "'Times New Roman', serif";
          layStyle.fontStyle = 'italic';
        } else if (b.shape === 'vertical_oval') {
          layStyle.fontFamily = 'Tahoma, sans-serif';
          layStyle.lineHeight = 1.3;
        }

        const opt = calculateOptimalFontSizeForShape(
          lineText,
          b.shape,
          layerWidth,
          layerHeight,
          layStyle.fontFamily,
          layStyle.lineHeight,
          tracking,
          bubbleMargin
        );
        layStyle.fontSize = `${opt.fontSize}px`;
        activeText = opt.textWithBreaks;
      } else if (!layStyle.fontSize) {
        const optVal = calculateOptimalFontSize(lineText, layerWidth, layerHeight, fontFamily, lineHeight, tracking);
        layStyle.fontSize = `${optVal}px`;
      }

      newAddedLayers.push({
        id: `lid_${Date.now()}_batch_${Math.floor(Math.random()*10000)}`,
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

    if (lineIdx < parsedLines.length) {
      handleSelectLine(lineIdx);
    }

    pushToHistory(prevLayers);
    setBubbleQueue([]);
    clearWandSelection();
    addToast(`✓ تم توزيع ولصق النص على عدد ${pasteCount} فقاعات دفعة واحدة`, 'success');
  };

  // تبييض الفقاعات المتعددة المكتشفة تلقائياً بلونها الأصلي
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

    setBubbleQueue([]);
    clearWandSelection();
    addToast(`✓ تم تبييض جميع الفقاعات المحددة بلونها الأصلي دفعة واحدة! 🧼🎨`, 'success');
  };

  // مراقبة اختصارات لوحة المفاتيح
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
          e.preventDefault();
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

  const allFontsList: CustomFont[] = [
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
    { name: 'Impact', value: 'Impact, sans-serif' },
    { name: 'Courier New', value: "'Courier New', monospace" },
    { name: 'Times New Roman', value: "'Times New Roman', serif" },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
    ...customFonts,
  ];

  const tatweelPreviewText = activeLayer 
    ? activeLayer.text 
    : 'حدد سطر كتابة نصي بالمسرح لتفعيل الكشيدة';

  // 🧠 دالة توليد قناع أبيض وأسود عالي الدقة (Mask) من لوحة الرسم الحالية أو تحديد العصا السحرية لإرساله للـ AI
  const generateMaskBase64 = () => {
    const imgEl = document.getElementById('manga-img') as HTMLImageElement;
    if (!imgEl || !imgEl.naturalWidth) return null;

    const imgW = imgEl.naturalWidth;
    const imgH = imgEl.naturalHeight;

    // إنشاء كانفاس أسود مؤقت لتوليد القناع
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imgW;
    maskCanvas.height = imgH;
    const mctx = maskCanvas.getContext('2d');
    if (!mctx) return null;

    // ملء الخلفية باللون الأسود بالكامل (الأماكن المحفوظة)
    mctx.fillStyle = '#000000';
    mctx.fillRect(0, 0, imgW, imgH);

    const maskData = mctx.getImageData(0, 0, imgW, imgH);
    const mData = maskData.data;
    let hasDrawnOrSelectedPixels = false;

    // 1. رسم وتجميع تحديد العصا السحرية الحالي داخل القناع باللون الأبيض في حال كان مفعلاً
    if (wandMask && wandMask.length === imgW * imgH) {
      for (let i = 0; i < wandMask.length; i++) {
        if (wandMask[i] === 1) {
          const pixelIdx = i * 4;
          mData[pixelIdx] = 255;     // أحمر
          mData[pixelIdx + 1] = 255; // أخضر
          mData[pixelIdx + 2] = 255; // أزرق
          mData[pixelIdx + 3] = 255; // ألفا (كامل الوضوح)
          hasDrawnOrSelectedPixels = true;
        }
      }
    }

    // 2. دمج ورسم ضربات فرشاة التبييض والتنظيف اليدوية الحالية على نفس القناع
    const cleaningCanvas = cleaningCanvasRef.current;
    if (cleaningCanvas) {
      const tempCtx = cleaningCanvas.getContext('2d');
      if (tempCtx) {
        try {
          const imgData = tempCtx.getImageData(0, 0, cleaningCanvas.width, cleaningCanvas.height);
          const data = imgData.data;

          // التأكد من تطابق حجم لوحة التبييض مع الحجم الأصلي
          if (cleaningCanvas.width === imgW && cleaningCanvas.height === imgH) {
            for (let i = 0; i < data.length; i += 4) {
              const alpha = data[i + 3];
              if (alpha > 10) {
                const pixelIdx = i;
                mData[pixelIdx] = 255;
                mData[pixelIdx + 1] = 255;
                mData[pixelIdx + 2] = 255;
                mData[pixelIdx + 3] = 255;
                hasDrawnOrSelectedPixels = true;
              }
            }
          }
        } catch (err) {
          console.error('Error overlaying cleaning canvas on mask:', err);
        }
      }
    }

    // إذا لم يقم المستخدم بأي اختيار بالعصا أو رسم بالفرشاة، لا نرسل طلباً فارغاً
    if (!hasDrawnOrSelectedPixels) return null;

    mctx.putImageData(maskData, 0, 0);
    return maskCanvas.toDataURL('image/png').split(',')[1];
  };

  // 🧠 دالة استخلاص الصورة الأصلية للصفحة الحالية كـ Base64
  const getOriginalImageBase64 = () => {
    const src = pages[currentPageIndex]?.src;
    if (!src) return null;
    if (src.startsWith('data:')) {
      return src.split(',')[1];
    }
    return null;
  };

  // 🧠 دالة تنظيف الكلمات وإعادة رسم الخلفيات بذكاء اصطناعي محلي فائق عبر Gemini أو Hugging Face سحابياً وتلقائياً
  const handleAIInpaint = async () => {
    if (currentPageIndex === -1 || pages.length === 0) {
      addToast('⚠️ لا توجد صفحة مانجا نشطة لمعالجتها', 'error');
      return;
    }

    const maskBase64 = generateMaskBase64();
    if (!maskBase64) {
      addToast('⚠️ الرجاء الرسم بالفرشاة على الكلمات أو التحديد بالعصا السحرية أولاً لتحديد المساحة المراد إزالتها', 'error');
      return;
    }

    const originalBase64 = getOriginalImageBase64();
    if (!originalBase64) {
      addToast('⚠️ عذراً، تعذر العثور على الصورة الأصلية بشكل سليم', 'error');
      return;
    }

    // جلب المفاتيح النشطة للتبديل السحابي التلقائي
    const activeGeminiKey = geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
    const activeHFToken = hfToken; // الرمز المخصص لـ Hugging Face

    if (!activeGeminiKey && !activeHFToken) {
      addToast('⚠️ يرجى إدخال مفتاح Gemini API Key أو Hugging Face Token في نافذة الإعدادات أولاً لتشغيل الممحاة الذكية', 'error');
      setShowSettingsModal(true); // فتح الإعدادات تلقائياً للمستخدم
      return;
    }

    // تفضيل Gemini في حال توفره كخيار أول
    if (activeGeminiKey) {
      addToast('✨ جاري إرسال الطلب ومعالجة الصفحة بالذكاء الاصطناعي عبر Gemini... 🧠🎨', 'success');

      try {
        // استيراد حزمة الـ SDK لـ Google GenAI ديناميكياً لتجنب المشاكل البرمجية أثناء الإقلاع
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: activeGeminiKey });

        // استدعاء نموذج Gemini 2.5 Flash المعتمد لمعالجة وتعديل الصور
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image', // 👈 تم التغيير للنموذج البصري المخصص للصور
          contents: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: originalBase64
              }
            },
            {
              inlineData: {
                mimeType: 'image/png',
                data: maskBase64
              }
            },
            "This is a manga page and a black-and-white mask indicating the areas with text or artifacts to be removed. Please erase the text in the white areas of the mask, and seamlessly reconstruct the background texture, drawings, or speech bubbles underneath. Return only the final edited page as an image output."
          ],
          config: {
            responseModalities: ["IMAGE"]
          }
        });

        const candidate = response.candidates?.[0];
        const part = candidate?.content?.parts?.find(p => p.inlineData);

        if (part && part.inlineData && part.inlineData.data) {
          const resultBase64 = part.inlineData.data;
          const resultDataUrl = `data:image/png;base64,${resultBase64}`;

          // تحديث حالة الرسم وصورة التبييض للصفحة الحالية بالصورة النظيفة المولدة ذكياً
          handleUpdateCleaningDataUrl(resultDataUrl);
          
          // مسح قناع وتحديد العصا السحرية المنقط تلقائياً لراحة نظر المستخدم بعد نجاح المعالجة
          clearWandSelection();

          addToast('✓ تم تنظيف وإعادة رسم الخلفية بالذكاء الاصطناعي بنجاح! 🎉🎨', 'success');
        } else {
          console.warn('Gemini response did not contain an image part:', response);
          addToast('❌ فشل توليد الصورة. تأكد من أن التحديد دقيق ومفتاح الـ API فعال', 'error');
        }
      } catch (err: any) {
        console.error('AI Inpainting Error (Gemini):', err);
        let errMsg = err.message || err;
        if (typeof errMsg === 'object') {
          errMsg = JSON.stringify(errMsg);
        }
        
        // الكشف الذكي عن خطأ الحظر الجغرافي من Google لـ Egypt / Europe
        if (errMsg.includes("Image generation is not available") || errMsg.includes("FAILED_PRECONDITION")) {
          addToast('❌ حظر جغرافي من Google لخدمات الصور. يمكنك استخدام مفتاح Hugging Face كبديل مجاني ممتاز يعمل بدون VPN وبدون قيود سحابية!', 'error');
        } else {
          addToast(`❌ خطأ أثناء معالجة الذكاء الاصطناعي: ${errMsg}`, 'error');
        }
      }
    } 
    // التبديل التلقائي لـ Hugging Face السحابي المجاني الذي يعمل بكفاءة في مصر وكافة الدول بدون VPN
    else if (activeHFToken) {
      addToast('✨ جاري إرسال الطلب ومعالجة التبييض السحابي الحر عبر خوادم Hugging Face... 🧼🎨', 'success');
      try {
        let response;
        // تم الاستبدال ليكون النموذج الأساسي RunwayML والاحتياطي المباشر في حال حدوث خطأ 500 هو Stability AI
        let hfUrl = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting";

        try {
          // المحاولة الأولى: اتصال مباشر بخوادم Hugging Face
          const directUrl = `https://corsproxy.io/?${encodeURIComponent(hfUrl)}`;
          response = await fetch(directUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${activeHFToken}`,
              "Content-Type": "application/json",
              "Accept": "image/png"
            },
            body: JSON.stringify({
              inputs: "empty manga speech bubble, clean background, seamless reconstruction, no text, no letters",
              image: originalBase64,
              mask_image: maskBase64
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (fetchErr) {
          // المحاولة الثانية: في حال فشل النموذج الأول أو واجه ضغطاً (خطأ 500)، نتحول تلقائياً للنموذج الاحتياطي المستقر
          console.log("RunwayML inpainting failed, attempting fallback model stabilityai/stable-diffusion-2-inpainting...", fetchErr);
          
          hfUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-inpainting";
          const fallbackUrl = `https://corsproxy.io/?${encodeURIComponent(hfUrl)}`;
          response = await fetch(fallbackUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${activeHFToken}`,
              "Content-Type": "application/json",
              "Accept": "image/png"
            },
            body: JSON.stringify({
              inputs: "empty manga speech bubble, clean background, seamless reconstruction, no text, no letters",
              image: originalBase64,
              mask_image: maskBase64
            })
          });
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `فشلت المعالجة برمز الاستجابة: ${response.status}`);
        }

        const blob = await response.blob();
        
        // تحويل ثنائي الصورة المستلمة لدمجها بالصفحة تلقائياً
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const resultDataUrl = reader.result as string;
          handleUpdateCleaningDataUrl(resultDataUrl);
          clearWandSelection();
          addToast('✓ تم تنظيف وإعادة رسم خلفية الفقاعة عبر Hugging Face سحابياً بنجاح! 🎉🧼', 'success');
        };
      } catch (err: any) {
        console.error('AI Inpainting Error (Hugging Face):', err);
        addToast(`❌ حدث خطأ أثناء الاتصال بخوادم Hugging Face: ${err.message || err}`, 'error');
      }
    }
  };

  // 📐 دالة تبديل شكل الفقاعة يدوياً وإعادة التفاف النص المكتوب بداخلها فوراً ليتطابق مع صورك ورغبتك
  const handleSelectBubbleShape = (shape: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval') => {
    setDetectedBubbleType(shape);
    
    addToast(`✓ تم تبديل شكل الفقاعة لـ: ${
      shape === 'normal_oval' ? 'بيضاوية عادية 💬' : 
      shape === 'spiky_shout' ? 'صراخ حماسية 💥' : 
      shape === 'thought_cloud' ? 'تفكير سحابية 💭' : 
      shape === 'narrative_box' ? 'صندوق مستطيل 📜' : 'بيضاوية رأسية 🔵'
    } 📐`, 'success');

    // إذا كانت هناك طبقة نصوص نشطة ومحددة حالياً، نقوم بطلب إعادة تدوير والتفاف النص فوراً
    if (activeLayer) {
      const previousLayers = [...currentLayers];
      
      const layerWidth = parseFloat(activeLayer.width) || 120;
      const layerHeight = parseFloat(activeLayer.height) || 80;

      const opt = calculateOptimalFontSizeForShape(
        // نزيل فواصل الأسطر الحالية لنعيد توزيع الكلمات بمرونة تامة مع الموازنة التلقائية
        activeLayer.text.replace(/\n/g, ' '),
        shape,
        layerWidth,
        layerHeight,
        activeLayer.style.fontFamily,
        activeLayer.style.lineHeight,
        parseFloat(activeLayer.style.letterSpacing) || 0,
        bubbleMargin,
        activeLayer.lineCountOverride // 👈 تمرير خيار عدد الأسطر الحالي للطبقة النشطة
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

  return (
    <div className="w-screen h-screen overflow-x-auto overflow-y-hidden bg-[#121212] antialiased">
      <div className="flex h-full min-w-[1240px] font-sans text-gray-300 relative overflow-hidden">
      
      {/* 📥 واجهة الحفظ والمشاركة الاحتياطية */}
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

                  // 📱 إذا كان يعمل كـ APK أصلي على الهاتف
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

                  // 🌐 وضع المتصفح العادي (Fallback)
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

      {/* نافذة إدارة الخطوط */}
      <FontManager
        isOpen={showFontManager}
        onClose={() => setShowFontManager(false)}
        customFonts={customFonts}
        setCustomFonts={setCustomFonts}
        favFonts={favFonts}
        setFavFonts={setFavFonts}
        selectedFont={fontFamily}
        onSelectFont={setFontFamily}
      />

      {/* نافذة خيارات التصدير المخصص للأنماط */}
      {showExportSelectorModal && (
        <div className="fixed inset-0 bg-black/85 z-[100000] flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-5 w-full max-w-sm text-right flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white border-b border-[#2d2d2d] pb-2">
              تصدير الأنماط المنسقة
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
                      className="accent-[#007acc] shrink-0"
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
                    addToast('اختر نمطاً واحداً على الأقل للتصدير', 'error');
                    return;
                  }
                  const blob = new Blob([JSON.stringify(stylesToExport, null, 2)], { type: 'application/json' });
                  triggerDownload(blob, "custom-styles.json");
                  setShowExportSelectorModal(false);
                }}
                className="bg-[#007acc] text-white py-1 px-4 rounded text-xs"
              >
                تصدير المحدد
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

      {/* نافذة الإعدادات العامة */}
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
                  className="w-16 bg-[#2d2d2d] border border-[#2d2d2d] text-white rounded px-2 py-0.5 text-center text-xs"
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
                  className="w-16 bg-[#2d2d2d] border border-[#2d2d2d] text-white rounded px-2 py-0.5 text-center text-xs"
                />
              </div>
              
              <div className="flex justify-between items-center border-t border-[#2d2d2d] pt-3 mt-1">
                <span>هامش أمان أسطر الفقاعة:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="bubble_margin_setting"
                      checked={bubbleMargin === 10}
                      onChange={() => {
                        setBubbleMargin(10);
                        addToast('✓ تم تحديد هامش أمان 10% 📏', 'success');
                      }}
                      className="accent-[#007acc]"
                    />
                    <span>10% (افتراضي)</span>
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

              {/* 🔑 قسم إعداد مفتاح الـ API للذكاء الاصطناعي مدمج محلياً */}
              <h3 className="text-sm font-bold text-white border-b border-[#2d2d2d]/30 pt-3 pb-1.5 flex items-center gap-1.5 justify-end">
                <span>🔑 مفتاح تشغيل الذكاء الاصطناعي (Gemini / Hugging Face)</span>
              </h3>
              <div className="flex flex-col gap-3 text-xs text-gray-300">
                <p className="text-[10px] text-gray-400 leading-normal">
                  مطلوب لتشغيل ميزة ممحاة الخلفية الذكية (Inpaint). يتم حفظ المفتاح محلياً بشكل آمن تماماً على هاتفك للعمل دوماً.
                </p>
                
                {/* حقل Gemini */}
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

                {/* حقل Hugging Face */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400">رمز Hugging Face Token (بديل مجاني يعمل دون VPN وبدون قيود):</span>
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

            <h3 className="text-sm font-bold text-white border-b border-[#2d2d2d] pt-2 pb-2 flex items-center gap-1.5 justify-end">
              <span>🛡️ إعدادات العلامة المائية للترجمة (Watermark)</span>
            </h3>
            <div className="flex flex-col gap-3.5 text-xs text-gray-300">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={watermarkEnabled}
                  onChange={e => setWatermarkEnabled(e.target.checked)}
                  className="accent-[#007acc]"
                />
                <span className="font-bold text-white">تفعيل العلامة المائية تلقائياً بالصفحات والتصدير</span>
              </label>

              {watermarkEnabled && (
                <div className="bg-[#151515] p-3 rounded-md border border-[#282828] flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <span>نوع العلامة المائية:</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="wm_type"
                          checked={watermarkType === 'text'}
                          onChange={() => setWatermarkType('text')}
                          className="accent-[#007acc]"
                        />
                        <span>نص كتابي</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="wm_type"
                          checked={watermarkType === 'image'}
                          onChange={() => setWatermarkType('image')}
                          className="accent-[#007acc]"
                        />
                        <span>شعار / صورة</span>
                      </label>
                    </div>
                  </div>

                  {watermarkType === 'text' ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-gray-400">نص العلامة المائية:</span>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={e => setWatermarkText(e.target.value)}
                        placeholder="أدخل اسم طاقم الترجمة أو الموقع..."
                        className="w-full bg-[#2d2d2d] border border-[#3c3c3c] text-white rounded px-2.5 py-1 text-right text-xs"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] text-gray-400">تحميل شعار فريق الترجمة (لوجو):</span>
                      <div className="bg-[#212121] border border-dashed border-[#3d3d3d] rounded p-2 text-center text-gray-400 relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setWatermarkImage(reader.result as string);
                                addToast('✓ تم تحميل شعار الفريق وبدء تطبيقه', 'success');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <span className="text-[10px] block">اسحب ملف الشعار أو اضغط هنا لرفعه</span>
                      </div>
                      {watermarkImage && (
                        <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-[#2d2d2d] mt-1">
                          <img
                            src={watermarkImage}
                            className="h-10 max-w-[80px] object-contain rounded bg-white/5 p-1 border border-white/10"
                            alt="Logo preview"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setWatermarkImage(null);
                              addToast('تم حذف الشعار المؤقت للعلامة المائية', 'success');
                            }}
                            className="bg-red-950/80 border border-red-800 text-[10px] text-red-300 py-0.5 px-2 rounded hover:bg-red-900 transition"
                          >
                            إزالة الشعار
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-gray-400">موضع العلامة في الصفحة:</span>
                    <select
                      value={watermarkPosition}
                      onChange={e => setWatermarkPosition(e.target.value as any)}
                      className="bg-[#2d2d2d] border border-[#3c3c3c] text-white rounded px-2 py-1 text-xs cursor-pointer w-full"
                    >
                      <option value="bottom-right">أسفل اليمين (Bottom Right)</option>
                      <option value="bottom-left">أسفل اليسار (Bottom Left)</option>
                      <option value="top-right">أعلى اليمين (Top Right)</option>
                      <option value="top-left">أعلى اليسار (Top Left)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[11px] text-gray-400">
                      <span>الشفافية (Opacity: {Math.round(watermarkOpacity * 100)}%)</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={Math.round(watermarkOpacity * 100)}
                        onChange={e => setWatermarkOpacity(Math.max(0.05, Math.min(1, (parseInt(e.target.value) || 40) / 100)))}
                        className="w-12 bg-[#2d2d2d] text-center text-white text-[10px] rounded py-0.5"
                      />
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={Math.round(watermarkOpacity * 100)}
                      onChange={e => setWatermarkOpacity((parseInt(e.target.value) || 40) / 100)}
                      className="accent-[#007acc] h-1.5 w-full bg-[#2d2d2d] rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[11px] text-gray-400">
                      <span>{watermarkType === 'text' ? 'حجم الخط (Size: ' + watermarkSize + 'px)' : 'مقياس العرض (Width: ' + (watermarkSize * 4) + 'px)'}</span>
                      <input
                        type="number"
                        min="10"
                        max="150"
                        value={watermarkSize}
                        onChange={e => setWatermarkSize(Math.max(10, Math.min(150, parseInt(e.target.value) || 24)))}
                        className="w-12 bg-[#2d2d2d] text-center text-white text-[10px] rounded py-0.5"
                      />
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="150"
                      value={watermarkSize}
                      onChange={e => setWatermarkSize(parseInt(e.target.value) || 24)}
                      className="accent-[#007acc] h-1.5 w-full bg-[#2d2d2d] rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
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

      {/* منطقة مسرح العمل الرئيسي */}
      <div className="flex-1 flex flex-col h-full bg-[#0d0d0d] relative overflow-hidden min-w-0">
        {/* شريط الإشعارات والصفحات العلوي */}
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

          {/* تجميع زر تقليب الصفحات وشريط الأدوات السريع والثابت معاً في المنتصف بجمالية تامة */}
          <div className="flex items-center gap-4">
            {/* 🛠️ شريط الأدوات السريع والثابت المطور لتسريع الحركة والتبييض */}
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

            {/* زري تقليب الصفحات */}
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

        {/* بيئة العمل التفاعلية والمسرح */}
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
          onSavePresetFromStyle={handleSavePresetFromStyle}
        />

        {/* لوحة التحكم بالطبقات السفلية والتراجع */}
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

      {/* الشريحة الجانبية للتحكم والإعدادات */}
      <Sidebar
        onImageUpload={handleImageUpload}
        onExportPNG={handleExportPNG}
        onExportPSD={handleExportPSD}
        onExportAll={handleExportAll}
        onExportAllZip={handleExportAllZip}
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
        onExportFolder={handleExportFolder}
        onImportFolder={handleImportFolder}
        onAddFolder={handleAddFolder}
        onAddStyle={handleAddStyle}
        onOpenStylesExportSelector={() => setShowExportSelectorModal(true)}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
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
        presets={presets}
        activePresetId={activePresetId}
        onApplyPreset={handleApplyPreset}
        onSaveCurrentPreset={handleSaveCurrentPreset}
        onClearPreset={() => setActivePresetId(null)}
        tatweelStrength={tatweelStrength}
        setTatweelStrength={setTatweelStrength}
        tatweelMargin={tatweelMargin}
        setTatweelMargin={setTatweelMargin}
        onApplyTatweel={handleApplyTatweel}
        onUndoTatweel={handleUndoTatweel}
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
        detectedBubbleType={detectedBubbleType}
        onSelectBubbleShape={handleSelectBubbleShape}
        onDeleteFolder={handleDeleteFolder} // 👈 ربط دالة حذف المجلدات
        onEditStyle={handleOpenEditStyle} // 👈 ربط دالة فتح شاشة التعديل
      />

      {/* شريط الأدوات العائم فوق النصوص النشطة للتعديل السريع */}
      <FloatingToolbar
        activeLayer={activeLayer}
        onUpdateLayer={handleUpdateLayer}
        onDeleteLayer={handleDeleteLayer}
        allFonts={allFontsList}
        favFonts={favFonts}
        onOpenFontManager={() => setShowFontManager(true)}
      />

      {/* 👈 نافذة تحرير وتعديل النمط التفاعلية الشاملة (Style Editing Modal) */}
      {editingStyle && (
        <div className="fixed inset-0 bg-black/85 z-[100000] flex items-center justify-center p-4 backdrop-blur-xs select-none" dir="rtl">
          <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-5 w-full max-w-md text-right flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-2">
              <span className="text-sm font-bold text-white">⚙️ تحرير وتعديل النمط التنسيقي</span>
              <button 
                onClick={() => setEditingStyle(null)}
                className="text-gray-400 hover:text-white text-lg font-bold outline-none focus:outline-none"
              >
                ✕
              </button>
            </div>

            {/* اسم النمط */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">اسم النمط (Style name):</label>
              <input
                type="text"
                value={editFormName}
                onChange={e => setEditFormName(e.target.value)}
                className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#007acc]"
              />
            </div>

            {/* المجلد المستهدف */}
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

            {/* زر نسخ قيم الطبقة النشطة بمسرح العمل */}
            <button
              onClick={handleCopyActiveLayerStyleToForm}
              className="w-full bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-xs py-2 rounded transition flex items-center justify-center gap-1.5 font-bold cursor-pointer"
            >
              <span>❐ نسخ تنسيق الطبقة النشطة (Copy layer style)</span>
            </button>

            {/* إعدادات الخط والتنسيق */}
            <div className="bg-[#151515] border border-[#2d2d2d] rounded p-3 flex flex-col gap-3">
              <span className="text-[11px] text-gray-400 font-bold border-b border-[#2d2d2d] pb-1">إعدادات الخط والتنسيق (Style settings):</span>

              {/* اختيار الخط */}
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">نوع الخط:</span>
                <select
                  value={editFormFamily}
                  onChange={e => setEditFormFamily(e.target.value)}
                  className="w-48 bg-[#2d2d2d] border border-[#3c3c3c] text-white rounded px-2 py-1 text-xs outline-none"
                >
                  {allFontsList.map(f => (
                    <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* حجم الخط وتباعد الأسطر */}
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

              {/* تباعد الحروف ولون النص */}
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

              {/* أزرار تنسيق الخط والمحاذاة */}
              <div className="grid grid-cols-2 gap-2 border-t border-[#2d2d2d] pt-2">
                <div className="flex gap-1 justify-center">
                  <button
                    onClick={() => setEditFormBold(!editFormBold)}
                    className={`flex-1 py-1 text-xs font-bold rounded transition ${
                      editFormBold ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                    }`}
                  >
                    B
                  </button>
                  <button
                    onClick={() => setEditFormItalic(!editFormItalic)}
                    className={`flex-1 py-1 text-xs italic rounded transition ${
                      editFormItalic ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                    }`}
                  >
                    I
                  </button>
                  <button
                    onClick={() => setEditFormUnderline(!editFormUnderline)}
                    className={`flex-1 py-1 text-xs underline rounded transition ${
                      editFormUnderline ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                    }`}
                  >
                    U
                  </button>
                </div>

                <div className="flex gap-1 justify-center">
                  <button
                    onClick={() => setEditFormAlign('right')}
                    className={`flex-1 py-1 text-xs rounded transition ${
                      editFormAlign === 'right' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-300'
                    }`}
                    title="يمين"
                  >
                    ⇤
                  </button>
                  <button
                    onClick={() => setEditFormAlign('center')}
                    className={`flex-1 py-1 text-xs rounded transition ${
                      editFormAlign === 'center' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-300'
                    }`}
                    title="وسط"
                  >
                    ≡
                  </button>
                  <button
                    onClick={() => setEditFormAlign('left')}
                    className={`flex-1 py-1 text-xs rounded transition ${
                      editFormAlign === 'left' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-300'
                    }`}
                    title="يسار"
                  >
                    ⇥
                  </button>
                </div>
              </div>
            </div>

            {/* علامات الاختيار التلقائي */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-bold">علامات الاختيار التلقائي (Tags for automatic style choosing):</label>
              <input
                type="text"
                value={editFormTags}
                onChange={e => setEditFormTags(e.target.value)}
                placeholder="مثال: scream shout s"
                className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#007acc]"
              />
              <p className="text-[10px] text-gray-500 leading-normal">
                (اختياري) حدد وسوم الأسطر مفصولة بمسافة. إذا بدأ السطر في النص المترجم بإحدى هذه العلامات، فسيتم تنشيط هذا النمط التنسيقي تلقائياً عند تحديد السطر.
              </p>
            </div>

            {/* لون التمييز التلقائي للوسوم */}
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-gray-400 font-bold">لون التمييز التلقائي (Tag color):</span>
              <input
                type="color"
                value={editFormTagColor}
                onChange={e => setEditFormTagColor(e.target.value)}
                className="w-24 h-7 bg-transparent rounded cursor-pointer border-0 p-0"
              />
            </div>

            {/* أزرار الحفظ والحذف */}
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
                    updatedAt: editingStyle.style.updatedAt || Date.now() // 👈 الحفاظ على تاريخ التعديل الأول الأصلي
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

