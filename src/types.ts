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
