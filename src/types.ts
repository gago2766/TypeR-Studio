export interface GradientColorStop {
  color: string;
  offset: number; // قيمة من 0 إلى 1
}

export interface TextGradient {
  enabled: boolean;
  type?: 'linear' | 'radial';
  angle?: number; // زاوية التدرج بالدرجات (مثلاً 90 أو 180)
  colors: string[]; // مصفوفة ألوان التدرج (مثلاً ['#ff0000', '#0000ff'])
}

// 🌈 قالب ستايل / تدريج لوني مخصص مع الحدود والتأثيرات (لشبكة المربعات كبرامج التصميم)
export interface GradientPreset {
  id: string;
  name: string;
  colors: string[];
  angle: number;
  type?: 'linear' | 'radial';
  strokeColor?: string; // لون الإطار الخارجي للاستايل (Stroke)
  strokeWidth?: number; // سمك الإطار الخارجي (px)
  shadowColor?: string; // لون الوهج أو الظل
  textColor?: string;   // اللون الأساسي للنص
}

export interface TextStyle {
  id: string;
  name: string;
  fontSize: string | number; // 'auto' or number
  color: string;
  bgColor: string;
  tracking: number;
  lineHeight: number;
  textAlign: 'center' | 'left' | 'right';
  fontFamily: string;
  tags: string[];
  enabled: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  tagColor?: string; // 👈 ميزة لون التمييز التلقائي للوسوم
  updatedAt?: number; // 👈 ميزة تتبع زمن التعديل لفرز الأولويات ومنع اختيار خطوط عشوائية
  
  // 🖌️ خصائص الحد الخارجي للخط (Stroke)
  strokeColor?: string; // لون الحد الخارجي للخط
  strokeWidth?: number; // سمك الحد الخارجي (px)

  // 🌈 خاصية تدريج الألوان للنص
  gradient?: TextGradient;
}

export interface StyleFolder {
  id: string;
  name: string;
  styles: TextStyle[];
}

export interface LayerStyle {
  fontSize: string; // e.g. "18px" or ""
  color: string;
  fontFamily: string;
  fontWeight: string; // "bold" or "normal"
  fontStyle: string; // "italic" or "normal"
  textDecoration: string; // "underline" or "none"
  textAlign: 'center' | 'left' | 'right';
  lineHeight: number;
  letterSpacing: string; // e.g. "0px"
  bgColor: string;

  // 🖌️ خصائص الحد الخارجي للخط (Stroke) منفصلة عن لون النص
  strokeColor?: string; // لون الحد الخارجي للخط
  strokeWidth?: number; // سمك الحد الخارجي (px)

  // 🌈 خاصية تدريج الألوان للنص
  gradient?: TextGradient;
}

// 🆕 تعريف هيكلية نقاط الرسم المتجه لأداة الـ Pen Tool لدعم المنحنيات
export interface PenPoint {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };  // مقبض التحكم بالانحناء الداخلي
  handleOut?: { x: number; y: number }; // مقبض التحكم بالانحناء الخارجي
}

export interface MangaLayer {
  id: string;
  type?: 'text' | 'image' | 'path'; // 🆕 نوع الطبقة: نص (افتراضي)، صورة مرفوعة، أو مسار Pen Tool متقاطع
  text: string;                     // لنصوص طبقة الـ 'text'
  imageSrc?: string;                // مسار الصورة المرفوعة لطبقة الـ 'image' 🆕
  pathPoints?: PenPoint[];          // نقاط مسار الـ Pen Tool لطبقة الـ 'path' 🆕
  strokeColor?: string;             // لون خط تحديد الـ Pen Tool 🆕
  fillColor?: string;               // لون تعبئة مسار الـ Pen Tool المغلق 🆕
  strokeWidth?: number;             // سمك خط الـ Pen Tool 🆕
  left: string;
  top: string;
  width: string;
  height: string;
  hidden: boolean;
  style: LayerStyle;
  preTatweelText?: string;
  angle?: number;
  flippedY?: boolean;
  lineCountOverride?: number; // خيار تحديد عدد أسطر الفقاعة من 1 إلى 10 يدويًا
}

export interface MangaPage {
  name: string;
  src: string;
  layers: MangaLayer[];
  cleaningDataUrl?: string;
}

export interface ProcessedLine {
  index: number;
  raw: string;
  text: string;
  isIgnored: boolean;
  styleKey: string;
  targetPageNum: number | null;
}

export interface ShapePreset {
  id: string;
  name: string;
  color: string;
  bg: string;
  font: string;
  size: string | number;
  bold: boolean;
  italic: boolean;
  align: 'center' | 'left' | 'right';
  lh: number;
  tracking: number;
}

export interface CustomFont {
  name: string;
  value: string;
  custom?: boolean;
  dataUrl?: string;
}

// ==========================================
// 🚀 إضافات ميزات التسريع الخارقة والإنتاجية
// ==========================================

// ⚡ كائن معالجة النقرة الخارقة الفورية (Turbo 1-Click Action)
export interface TurboTypesetData {
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
  scaleX: number;
  scaleY: number;
  shape: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval';
  mask: Uint8Array;
  seedColor: string;
  imgW: number;
  imgH: number;
}

// 🎨 أنواع الأنماط السريعة العائمة
export type QuickPresetType = 'normal' | 'shout' | 'thought' | 'box' | 'whisper';

export interface QuickPresetItem {
  type: QuickPresetType;
  label: string;
  icon: string;
  style: Partial<LayerStyle>;
  bubbleShape: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval';
}

// 🖐️ إيماءات اللمس السريعة للهاتف
export type GestureAction = 'next_page' | 'prev_page' | 'undo' | 'redo' | 'none';

// 🎨 نتيجة الاستخراج والشفط اللوني من الصورة مباشرة
export interface ExtractedStyleResult {
  color1: string;
  color2: string;
  angle: number;
  strokeColor: string;
  strokeWidth: number;
  textColor: string;
}
