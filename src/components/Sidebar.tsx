import React, { useRef, useState, memo } from 'react';
import { StyleFolder, TextStyle, ProcessedLine, CustomFont, GradientPreset, TextGradient } from '../types';

interface SidebarProps {
  // Page operations
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPNG: () => void;
  onSaveState: () => void;
  onLoadState: () => void;
  onShare: () => void;

  // Tool Selection
  activeTool: 'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand' | 'pen';
  setActiveTool: (tool: 'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand' | 'pen') => void;
  wandTolerance: number;

  // Cleaning & redrawing props
  brushColor: string;
  setBrushColor: (val: string) => void;
  brushSize: number;
  setBrushSize: (val: number) => void;
  stampSource: { x: number; y: number } | null;
  setStampSource: (val: { x: number; y: number } | null) => void;
  isSettingStampSource: boolean;
  setIsSettingStampSource: (val: boolean) => void;

  // Script & processed lines
  scriptInput: string;
  setScriptInput: (script: string) => void;
  parsedLines: ProcessedLine[];
  currentLineIndex: number;
  onSelectLine: (index: number) => void;

  // Folders & category-based styles
  folders: StyleFolder[];
  setFolders: React.Dispatch<React.SetStateAction<StyleFolder[]>>;
  selectedStyleId: string;
  setSelectedStyleId: (id: string) => void;
  onDuplicateFolder: (folderId: string) => void;
  onExportFolder: (folderId: string) => void;
  onImportFolder: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportAllStyles?: () => void;
  onImportAllStyles?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDuplicateStyle?: (style: TextStyle, folderId: string) => void;
  onAddFolder: () => void;
  onAddStyle: () => void;
  onOpenStylesExportSelector: () => void;
  onUpdateActiveStyle?: (updates: Partial<TextStyle>) => void;

  // Active Style editing
  fontFamily: string;
  setFontFamily: (val: string) => void;
  fontSize: string;
  setFontSize: (val: string) => void;
  textColor: string;
  setTextColor: (val: string) => void;
  bgColor: string;
  setBgColor: (val: string) => void;
  bgTransparent: boolean;
  setBgTransparent: (val: boolean) => void;
  tracking: number;
  setTracking: (val: number) => void;
  lineHeight: number;
  setLineHeight: (val: number) => void;
  textAlign: 'center' | 'left' | 'right';
  setTextAlign: (val: 'center' | 'left' | 'right') => void;
  bold: boolean;
  setBold: (val: boolean) => void;
  italic: boolean;
  setItalic: (val: boolean) => void;
  underline: boolean;
  setUnderline: (val: boolean) => void;
  allFonts: CustomFont[];
  favFonts: string[];
  setFavFonts: React.Dispatch<React.SetStateAction<string[]>>;
  onOpenFontManager: () => void;
  onApplyStyleToActiveLayer: () => void;

  // 🖌️ Stroke Props
  strokeColor?: string;
  setStrokeColor?: (val: string) => void;
  strokeWidth?: number;
  setStrokeWidth?: (val: number) => void;

  // 🌈 Gradients System Props
  gradientPresets?: GradientPreset[];
  setGradientPresets?: React.Dispatch<React.SetStateAction<GradientPreset[]>>;
  activeGradient?: TextGradient | null;
  onApplyGradientToActiveLayer?: (gradient: TextGradient | null) => void;
  onCopyGradientFromActiveLayer?: () => void;
  onSampleGradientFromSelection?: () => void; // 👈 دالة شفط واستخراج التدرج من الصورة مباشرة
  onExportGradients?: () => void;
  onImportGradients?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Arabic Tatweel (Kashida)
  tatweelStrength: number;
  setTatweelStrength: (val: number) => void;
  tatweelMargin: number;
  setTatweelMargin: (val: number) => void;
  onApplyTatweel: () => void;
  onUndoTatweel: () => void;
  onRemoveAllTatweel?: () => void;
  tatweelPreviewText: string;

  // 🆕 تمطيط يدوي تدريجي بالخطوة
  onStepTatweel?: (stepCount?: number) => void;
  manualTatweelStep?: number;
  setManualTatweelStep?: (val: number) => void;

  // Drawing undo/redo props
  onDrawingUndo?: () => void;
  onDrawingRedo?: () => void;
  canDrawingUndo?: boolean;
  canDrawingRedo?: boolean;

  // Whiten wand selection props
  onWhitenWandSelection?: () => void;
  hasWandMask?: boolean;
  onAIInpaint?: () => void;
  onContentAwareFill?: () => void;
  hasSelectionBox?: boolean;

  // Bubble Shape Matching
  detectedBubbleType: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval' | null;
  onSelectBubbleShape: (shape: 'normal_oval' | 'spiky_shout' | 'thought_cloud' | 'narrative_box' | 'vertical_oval') => void;

  // Bottom action triggers
  onPrevLine: () => void;
  onNextLine: () => void;
  onInsertText: () => void;
  onAlignText: () => void;

  // Folder and Style modifications
  onDeleteFolder?: (folderId: string) => void;
  onEditStyle?: (style: TextStyle, folderId: string) => void;

  // Image Overlay
  onAddImageOverlay?: (base64Src: string, filename: string) => void;
}

export const Sidebar = memo(function Sidebar({
  onImageUpload,
  onExportPNG,
  onSaveState,
  onLoadState,
  onShare,
  activeTool,
  setActiveTool,
  wandTolerance,
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  stampSource,
  setStampSource,
  isSettingStampSource,
  setIsSettingStampSource,
  scriptInput,
  setScriptInput,
  parsedLines,
  currentLineIndex,
  onSelectLine,
  folders,
  setFolders,
  selectedStyleId,
  setSelectedStyleId,
  onDuplicateFolder,
  onExportFolder,
  onImportFolder,
  onExportAllStyles,
  onImportAllStyles,
  onDuplicateStyle,
  onAddFolder,
  onAddStyle,
  onOpenStylesExportSelector,
  onUpdateActiveStyle,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  textColor,
  setTextColor,
  bgColor,
  setBgColor,
  bgTransparent,
  setBgTransparent,
  tracking,
  setTracking,
  lineHeight,
  setLineHeight,
  textAlign,
  setTextAlign,
  bold,
  setBold,
  italic,
  setItalic,
  underline,
  setUnderline,
  allFonts,
  favFonts,
  setFavFonts,
  onOpenFontManager,
  onApplyStyleToActiveLayer,
  strokeColor = '#ffffff',
  setStrokeColor,
  strokeWidth = 0,
  setStrokeWidth,
  gradientPresets = [],
  setGradientPresets,
  activeGradient,
  onApplyGradientToActiveLayer,
  onCopyGradientFromActiveLayer,
  onSampleGradientFromSelection,
  onExportGradients,
  onImportGradients,
  tatweelStrength,
  setTatweelStrength,
  tatweelMargin,
  setTatweelMargin,
  onApplyTatweel,
  onUndoTatweel,
  onRemoveAllTatweel,
  tatweelPreviewText,
  onStepTatweel,
  manualTatweelStep = 1,
  setManualTatweelStep,
  onPrevLine,
  onNextLine,
  onInsertText,
  onAlignText,
  onDrawingUndo,
  onDrawingRedo,
  canDrawingUndo = false,
  canDrawingRedo = false,
  onWhitenWandSelection,
  hasWandMask = false,
  onAIInpaint,
  onContentAwareFill,
  hasSelectionBox = false,
  detectedBubbleType,
  onSelectBubbleShape,
  onDeleteFolder,
  onEditStyle,
  onAddImageOverlay,
}: SidebarProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const importAllInputRef = useRef<HTMLInputElement>(null);
  const importGradientsInputRef = useRef<HTMLInputElement>(null);

  // 📑 التبويب النشط داخل صندوق "تنسيق النمط النشط"
  const [styleActiveTab, setStyleActiveTab] = useState<'font_style' | 'gradient'>('font_style');

  // حالات محرّر تدريج الألوان
  const [gradientColor1, setGradientColor1] = useState<string>('#ff007f');
  const [gradientColor2, setGradientColor2] = useState<string>('#7928ca');
  const [gradientAngle, setGradientAngle] = useState<number>(90);
  const [newPresetName, setNewPresetName] = useState<string>('');

  const activeStyle = folders.flatMap(f => f.styles).find(s => s.id === selectedStyleId);

  const toggleStyleEnabled = (folderId: string, styleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolders(prev =>
      prev.map(f => {
        if (f.id !== folderId) return f;
        return {
          ...f,
          styles: f.styles.map(s => {
            if (s.id !== styleId) return s;
            return { ...s, enabled: !s.enabled };
          }),
        };
      })
    );
  };

  const handleToggleFavorite = () => {
    if (!fontFamily) return;
    if (favFonts.includes(fontFamily)) {
      setFavFonts(prev => prev.filter(f => f !== fontFamily));
    } else {
      setFavFonts(prev => [...prev, fontFamily]);
    }
  };

  const handleSaveGradientPreset = () => {
    const finalName = newPresetName.trim() || `نمط ${gradientPresets.length + 1}`;
    const newPreset: GradientPreset = {
      id: `grad_${Date.now()}`,
      name: finalName,
      colors: [gradientColor1, gradientColor2],
      angle: gradientAngle,
      type: 'linear',
      strokeColor: strokeColor || '#ffffff',
      strokeWidth: strokeWidth || 0,
    };
    if (setGradientPresets) {
      setGradientPresets(prev => [...prev, newPreset]);
    }
    setNewPresetName('');
  };

  return (
    <div
      id="sidebar-panel"
      className="w-[var(--sidebar-width,350px)] min-w-[220px] bg-[#1e1e1e] border-l border-[#2d2d2d] flex flex-col h-full z-10 transition-all duration-200 shrink-0 select-none text-right"
      dir="rtl"
    >
      {/* File section */}
      <div className="p-3 border-b border-[#2d2d2d] flex flex-col gap-2">
        <h3 className="text-xs text-white uppercase font-bold tracking-wider mb-1 flex justify-between select-none border-b border-[#2d2d2d] pb-1">
          <span>ملف العمل والإعدادات</span>
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="bg-[#007acc] text-white hover:bg-[#0062a3] text-[11px] font-semibold py-2 px-1 rounded cursor-pointer transition text-center select-none truncate flex items-center justify-center gap-1">
            <span>📥 رفع صفحات</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onImageUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={onExportPNG}
            className="bg-[#007acc] text-white hover:bg-[#0062a3] text-[11px] font-semibold py-2 px-1 rounded transition select-none truncate flex items-center justify-center gap-1 cursor-pointer"
            id="export-img"
            title="تصدير الصفحة النشطة إلى صورة PNG"
          >
            <span>🖼️ تصدير PNG</span>
          </button>
        </div>
        
        {/* صف مشاركة الصفحة النشطة مباشرة */}
        <div className="grid grid-cols-1">
          <button
            onClick={onShare}
            className="bg-[#8e44ad] text-white hover:bg-[#732d91] text-[11px] font-semibold py-2 px-1 rounded transition select-none truncate flex items-center justify-center gap-1 cursor-pointer"
            id="share-img-btn"
            title="مشاركة الصفحة النشطة مباشرة مع التطبيقات الأخرى"
          >
            <span>📤 مشاركة الصفحة لتطبيقات أخرى</span>
          </button>
        </div>

        {/* إضافة صورة تراكب */}
        <div className="grid grid-cols-1">
          <label className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold py-2 px-1 rounded cursor-pointer transition text-center select-none truncate flex items-center justify-center gap-1">
            <span>🖼️ إضافة صورة تراكب (Overlay)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onAddImageOverlay) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    onAddImageOverlay(ev.target?.result as string, file.name);
                  };
                  reader.readAsDataURL(file);
                }
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-1 compact-hide">
          <button
            onClick={onSaveState}
            className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 rounded transition select-none cursor-pointer"
            id="save-state-btn"
            title="حفظ التقدم الحالي في المتصفح"
          >
            حفظ الحالة
          </button>
          <button
            onClick={onLoadState}
            className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 rounded transition select-none cursor-pointer"
            id="load-state-btn"
            title="استعادة التقدم المحفوظ"
          >
            استعادة الحالة
          </button>
        </div>
      </div>

      {/* Scrollable middle layout */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {/* Magic Wand / Bubble selection */}
        <div>
          <h3 className="text-xs text-white uppercase font-bold mb-1.5 border-b border-[#2d2d2d] pb-1">
            أداة تحديد الفقاعات
          </h3>
          <div className="flex gap-1.5 mb-1.5">
            <button
              onClick={() => setActiveTool('marquee')}
              className={`flex-1 text-[10px] py-1.5 px-1 rounded font-medium transition ${
                activeTool === 'marquee'
                  ? 'bg-[#007acc] text-white font-bold'
                  : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
              id="tool-marquee-btn"
            >
              تحديد مستطيل 🔲
            </button>
            <button
              onClick={() => setActiveTool('magic_wand')}
              className={`flex-1 text-[10px] py-1.5 px-1 rounded font-medium transition ${
                activeTool === 'magic_wand'
                  ? 'bg-[#007acc] text-white font-bold'
                  : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
              id="tool-magic-btn"
            >
              عصا سحرية 🪄
            </button>
            <button
              onClick={() => setActiveTool('pen')}
              className={`flex-1 text-[10px] py-1.5 px-1 rounded font-medium transition ${
                activeTool === 'pen'
                  ? 'bg-[#007acc] text-white font-bold'
                  : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
              id="tool-pen-btn"
            >
              رسم القلم ✒️
            </button>
          </div>
          <div className="text-[10px] text-gray-400 bg-[#0a0a0a] border-l-2 border-l-[#007acc] p-2 leading-relaxed rounded">
            {activeTool === 'magic_wand'
              ? `🪄 العصا السحرية: اضغط داخل البياض لتحديد حواف الفقاعة تلقائياً (الحساسية: ${wandTolerance})`
              : activeTool === 'marquee'
              ? '🔲 اسحب للتحديد: ارسم مستطيل سحب يدوياً لتحديد موضع النص والتعبئة الذكية.'
              : activeTool === 'pen'
              ? '✒️ أداة القلم: اضغط على الصفحة لإضافة نقاط تثبيت ورسم مسارات أو أشكال مخصصة مغلقة.'
              : activeTool === 'zoom'
              ? '🔍 عدسة الزووم: اضغط لتكبير الصفحة، أو اضغط مع Alt للتصغير.'
              : activeTool === 'hand'
              ? '✋ أداة اليد: انقر واسحب للتنقل بحرية كاملة داخل الصفحة عند التكبير.'
              : '🖌️ أداة تنظيف نشطة: استخدم شريط التبييض أدناه للرسم أو الختم.'}
          </div>
        </div>

        {/* Zoom & Pan Navigation Tools */}
        <div>
          <h3 className="text-xs text-white uppercase font-bold mb-1.5 border-b border-[#2d2d2d] pb-1">
            أدوات التكبير والتنقل (Zoom & Pan)
          </h3>
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <button
              onClick={() => setActiveTool('zoom')}
              className={`text-[11px] py-1.5 px-2 rounded font-medium transition flex items-center justify-center gap-1.5 select-none ${
                activeTool === 'zoom'
                  ? 'bg-[#007acc] text-white font-bold'
                  : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
              title="أداة العدسة المكبرة"
            >
              <span>🔍 العدسة (Zoom)</span>
            </button>
            <button
              onClick={() => setActiveTool('hand')}
              className={`text-[11px] py-1.5 px-2 rounded font-medium transition flex items-center justify-center gap-1.5 select-none ${
                activeTool === 'hand'
                  ? 'bg-[#007acc] text-white font-bold'
                  : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
              title="أداة اليد الممسكة"
            >
              <span>✋ أداة اليد (Hand)</span>
            </button>
          </div>
        </div>

        {/* Cleaning & Redrawing Tools */}
        <div>
          <h3 className="text-xs text-white uppercase font-bold mb-1.5 border-b border-[#2d2d2d] pb-1">
            أدوات التبييض والتنظيف (Cleaning)
          </h3>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <button
              onClick={() => setActiveTool('brush')}
              className={`text-[11px] py-1.5 px-2 rounded font-medium transition flex items-center justify-center gap-1.5 select-none ${
                activeTool === 'brush'
                  ? 'bg-[#007acc] text-white font-bold'
                  : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
            >
              <span>🖌️ الفرشاة</span>
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              className={`text-[11px] py-1.5 px-2 rounded font-medium transition flex items-center justify-center gap-1.5 select-none ${
                activeTool === 'eraser'
                  ? 'bg-[#007acc] text-white font-bold'
                  : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
            >
              <span>🧼 الممحاة</span>
            </button>
            <button
              onClick={() => setActiveTool('clone_stamp')}
              className={`text-[11px] py-1.5 px-2 rounded font-medium transition flex items-center justify-center gap-1.5 select-none ${
                activeTool === 'clone_stamp'
                  ? 'bg-[#007acc] text-white font-bold'
                  : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
            >
              <span>🎯 الختم</span>
            </button>
            <button
              onClick={() => setActiveTool('color_picker')}
              className={`text-[11px] py-1.5 px-2 rounded font-medium transition flex items-center justify-center gap-1.5 select-none ${
                activeTool === 'color_picker'
                  ? 'bg-[#007acc] text-white font-bold'
                  : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
            >
              <span>🧪 القطارة</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <button
              onClick={onDrawingUndo}
              disabled={!canDrawingUndo}
              className={`text-[10px] py-1 px-1.5 rounded transition flex items-center justify-center gap-1 select-none border border-[#3c3c3c] cursor-pointer ${
                canDrawingUndo
                  ? 'bg-[#1e1e1e] text-white hover:bg-[#3d3d3d] hover:border-[#555]'
                  : 'bg-black/20 text-gray-600 border-[#222] cursor-not-allowed'
              }`}
            >
              <span>↩️ تراجع الرسم</span>
            </button>
            <button
              onClick={onDrawingRedo}
              disabled={!canDrawingRedo}
              className={`text-[10px] py-1 px-1.5 rounded transition flex items-center justify-center gap-1 select-none border border-[#3c3c3c] cursor-pointer ${
                canDrawingRedo
                  ? 'bg-[#1e1e1e] text-white hover:bg-[#3d3d3d] hover:border-[#555]'
                  : 'bg-black/20 text-gray-500 border-[#222] cursor-not-allowed'
              }`}
            >
              <span>إعادة رسم ↪️</span>
            </button>
          </div>

          <div className="mb-2 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onWhitenWandSelection}
              disabled={!hasWandMask}
              className={`w-full text-[11px] py-2 px-3 rounded font-bold transition flex items-center justify-center gap-1.5 select-none border cursor-pointer ${
                hasWandMask
                  ? 'bg-[#007acc] text-white border-[#0098ff] hover:bg-[#008be6] active:scale-[0.98]'
                  : 'bg-black/20 text-gray-500 border-[#222] cursor-not-allowed'
              }`}
            >
              <span>✨ تبييض تحديد العصا بضغطة واحدة</span>
            </button>

            <button
              type="button"
              onClick={onContentAwareFill}
              disabled={!hasWandMask && !hasSelectionBox}
              className={`w-full text-[11px] py-2 px-3 rounded font-bold transition flex items-center justify-center gap-1.5 select-none border cursor-pointer ${
                hasWandMask || hasSelectionBox
                  ? 'bg-emerald-700 text-white border-emerald-600 hover:bg-emerald-600 active:scale-[0.98]'
                  : 'bg-black/20 text-gray-500 border-[#222] cursor-not-allowed'
              }`}
            >
              <span>🪄 تعبئة مع مراعاة المحتوى (Content Aware)</span>
            </button>

            <button
              type="button"
              onClick={onAIInpaint}
              className="w-full text-[11px] py-2 px-3 rounded font-bold transition flex items-center justify-center gap-1.5 select-none border cursor-pointer bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white border-purple-600 shadow-md active:scale-[0.98]"
            >
              <span>🧠 ممحاة الخلفية الذكية (AI Inpaint)</span>
            </button>
          </div>

          {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'clone_stamp' || activeTool === 'color_picker') && (
            <div className="bg-[#151515] border border-[#2d2d2d] rounded p-2 flex flex-col gap-2 mb-2">
              {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'clone_stamp') && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px] text-gray-300">
                    <span>حجم الفرشاة ({brushSize}px) :</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={brushSize}
                      onChange={e => setBrushSize(Math.max(1, parseInt(e.target.value) || 12))}
                      className="w-12 bg-[#2d2d2d] border border-[#3c3c3c] text-white text-[10px] text-center rounded py-0.5"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={brushSize}
                    onChange={e => setBrushSize(parseInt(e.target.value) || 15)}
                    className="accent-[#007acc] h-1.5 w-full bg-[#2d2d2d] rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {activeTool === 'brush' && (
                <div className="flex items-center justify-between text-[11px] text-gray-300">
                  <span>لون الرسم:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setBrushColor('#ffffff')}
                      className={`w-4 h-4 rounded bg-white border border-[#555] ${brushColor === '#ffffff' ? 'ring-2 ring-[#007acc]' : ''}`}
                    />
                    <button
                      onClick={() => setBrushColor('#000000')}
                      className={`w-4 h-4 rounded bg-black border border-[#555] ${brushColor === '#000000' ? 'ring-2 ring-[#007acc]' : ''}`}
                    />
                    <input
                      type="color"
                      value={brushColor}
                      onChange={e => setBrushColor(e.target.value)}
                      className="w-6 h-4 bg-transparent cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
              )}

              {activeTool === 'clone_stamp' && (
                <div className="flex flex-col gap-1.5 text-[10px] text-gray-300 leading-relaxed">
                  <div className="flex justify-between items-center">
                    <span>المصدر الحالي:</span>
                    <span className="font-mono text-gray-400 bg-black/30 px-1 rounded text-[9px]">
                      {stampSource ? `X:${Math.round(stampSource.x)} Y:${Math.round(stampSource.y)}` : 'غير محدد'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsSettingStampSource(true)}
                    className={`w-full py-1 text-[10px] rounded font-bold transition ${
                      isSettingStampSource
                        ? 'bg-[#c0392b] text-white animate-pulse'
                        : 'bg-[#2d2d2d] hover:bg-[#333] border border-[#3c3c3c] text-white'
                    }`}
                  >
                    {isSettingStampSource ? '🎚️ اضغط على الصفحة لتحديد المصدر...' : '🎯 تحديد مصدر كعينة'}
                  </button>
                </div>
              )}

              {activeTool === 'color_picker' && (
                <div className="text-[10px] text-gray-400 leading-normal">
                  🧪 اضغط على أي نقطة ملونة لتنسخ لونها وتثبته للفرشاة تلقائياً.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Translation text panel */}
        <div>
          <h3 className="text-xs text-white uppercase font-bold mb-1 border-b border-[#2d2d2d] pb-1">
            النص المترجم
          </h3>
          <textarea
            id="script-input"
            className="w-full h-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white rounded p-1.5 text-xs font-sans outline-none resize-none focus:border-[#007acc] placeholder-gray-500"
            placeholder="أدخل النص المترجم هنا..."
            value={scriptInput}
            onChange={e => setScriptInput(e.target.value)}
          />

          <h3 className="text-xs text-white uppercase font-bold mt-3 mb-1 border-b border-[#2d2d2d] pb-1">
            الأسطر المعالجة
          </h3>
          <div
            id="lines-container"
            className="border border-[#2d2d2d] bg-[#151515] rounded max-h-[140px] overflow-y-auto pr-0.5"
          >
            {parsedLines.length === 0 ? (
              <div className="p-4 text-center text-gray-600 text-[10px]">
                الصق النص أعلاه للبدء
              </div>
            ) : (
              parsedLines.map((line, idx) => {
                const isActive = idx === currentLineIndex;

                let lineStyle: TextStyle | null = null;
                folders.forEach(f => {
                  if (!lineStyle) {
                    lineStyle = f.styles.find(s => s.tags.includes(line.styleKey) && s.enabled) || null;
                  }
                });

                return (
                  <div
                    key={idx}
                    onClick={() => onSelectLine(idx)}
                    style={{
                      borderRight: lineStyle?.tagColor ? `4px solid ${lineStyle.tagColor}` : undefined
                    }}
                    className={`flex items-center justify-between py-1.5 px-2.5 text-[11px] border-b border-[#222] cursor-pointer selection:bg-transparent ${
                      isActive ? 'bg-[#094771] text-white font-medium' : 'text-gray-300 hover:bg-[#252525]'
                    } ${line.isIgnored ? 'text-gray-600 line-through bg-[#0e0e0e]/50' : ''}`}
                  >
                    <span className="truncate pl-2">
                      {idx + 1}. {line.text}
                    </span>
                    {line.styleKey !== 'default' && !line.isIgnored && (
                      <span className="text-[8px] bg-[#333] text-gray-400 px-1 py-0.5 rounded leading-none">
                        {line.styleKey}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Styles Categories */}
        <div>
          <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-1 mb-2">
            <h3 className="text-xs text-white uppercase font-bold">
              مجلدات الأنماط
            </h3>
            <div className="flex gap-1">
              {onExportAllStyles && (
                <button
                  onClick={onExportAllStyles}
                  className="text-[9.5px] bg-[#27ae60] hover:bg-[#219653] text-white font-bold py-0.5 px-2 rounded transition cursor-pointer flex items-center gap-1 shadow-sm"
                  title="مشاركة وتصدير كافة المجلدات والاستايلات بملف واحد"
                >
                  <span>مشاركة الكل 📤</span>
                </button>
              )}
              {onImportAllStyles && (
                <label className="text-[9.5px] bg-[#2980b9] hover:bg-[#2471a3] text-white font-bold py-0.5 px-2 rounded transition cursor-pointer flex items-center gap-1 shadow-sm">
                  <span>استيراد الكل 📥</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={onImportAllStyles}
                    ref={importAllInputRef}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div id="folders-container" className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-0.5 scrollbar-thin">
            {folders.length === 0 ? (
              <div className="text-center text-gray-600 text-[10px] py-4 bg-[#151515] rounded border border-dashed border-[#2d2d2d]">
                لا توجد مجلدات حالياً
              </div>
            ) : (
              folders.map(folder => (
                <div key={folder.id} className="border border-[#2d2d2d] rounded bg-[#1a1a1a] overflow-hidden">
                  <div className="bg-[#252525] px-2 py-1.5 text-[11px] font-bold text-gray-200 flex justify-between items-center select-none">
                    <span>📂 {folder.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onDuplicateFolder(folder.id)}
                        className="text-[9px] bg-[#333] hover:bg-[#444] hover:text-white text-gray-300 py-0.5 px-1.5 rounded transition cursor-pointer"
                        title="تكرار المجلد"
                      >
                        تكرار ❐
                      </button>
                      <button
                        onClick={() => onExportFolder(folder.id)}
                        className="text-[9px] bg-[#333] hover:bg-[#444] hover:text-white text-gray-300 py-0.5 px-1.5 rounded transition cursor-pointer"
                        title="مشاركة هذا المجلد كملف"
                      >
                        مشاركة 📤
                      </button>
                      
                      {onDeleteFolder && (
                        <button
                          onClick={() => onDeleteFolder(folder.id)}
                          className="text-[9px] bg-red-950/80 border border-red-900/60 hover:bg-red-800 text-red-300 py-0.5 px-1.5 rounded transition cursor-pointer"
                          title="حذف هذا المجلد وكل محتوياته"
                        >
                          حذف 🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-1 flex flex-col gap-0.5 max-h-[180px] overflow-y-auto scrollbar-thin">
                    {folder.styles.map(style => {
                      const isStyleEnabled = style.enabled !== false;
                      const isSelected = style.id === selectedStyleId;
                      return (
                        <div
                          key={style.id}
                          onClick={() => setSelectedStyleId(style.id)}
                          className={`flex items-center justify-between py-1 px-1.5 text-[10.5px] rounded cursor-pointer transition ${
                            isSelected ? 'bg-[#007acc] text-white shadow-sm ring-1 ring-[#0098ff]' : 'text-gray-300 hover:bg-[#2a2a2a]'
                          } ${!isStyleEnabled ? 'opacity-40' : ''}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <button
                              onClick={e => toggleStyleEnabled(folder.id, style.id, e)}
                              className="text-gray-400 hover:text-white p-0.5 leading-none bg-none border-0 cursor-pointer text-xs shrink-0"
                            >
                              {isStyleEnabled ? '👁' : '👁‍عون'}
                            </button>
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block border border-[#555] shrink-0"
                              style={{ backgroundColor: style.color }}
                            />
                            <span className="truncate flex-1 text-right font-medium">
                              {style.name}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] bg-emerald-500 text-black font-extrabold px-1 py-0.2 rounded shadow-xs shrink-0">
                                ✓ نشط
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            {onDuplicateStyle && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicateStyle(style, folder.id);
                                }}
                                className={`text-[9px] py-0.5 px-1.5 rounded transition cursor-pointer font-bold ${
                                  isSelected ? 'bg-black/30 hover:bg-black/50 text-white' : 'bg-[#2a2a2a] hover:bg-[#333] text-gray-300'
                                }`}
                                title="نسخ وتكرار هذا الستايل"
                              >
                                ❐ نسخ
                              </button>
                            )}

                            <span className="text-[8.5px] text-gray-400 bg-black/20 px-1 py-0.5 rounded leading-none">
                              [{style.tags.join(',')}]
                            </span>
                            
                            {onEditStyle && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditStyle(style, folder.id);
                                }}
                                className="text-gray-400 hover:text-white px-1 py-0.5 font-bold text-xs select-none transition"
                                title="تعديل تفاصيل وإعدادات النمط"
                              >
                                ▼
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="grid grid-cols-3 gap-1 mt-1.5">
            <button
              onClick={onAddFolder}
              className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 px-1 rounded-lg transition select-none truncate cursor-pointer"
              id="add-folder-btn"
            >
              + مجلد
            </button>
            <button
              onClick={onAddStyle}
              className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 px-1 rounded-lg transition select-none truncate cursor-pointer"
              id="add-style-btn"
            >
              + نمط
            </button>
            <button
              onClick={onOpenStylesExportSelector}
              className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 px-1 rounded-lg transition select-none truncate cursor-pointer font-medium"
              id="export-styles-selector-btn"
              title="مشاركة أنماط مخصصة"
            >
              مشاركة مخصصة 📤
            </button>
          </div>
          <div className="grid grid-cols-1 mt-1">
            <label className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 rounded-lg transition select-none text-center cursor-pointer block truncate">
              استيراد مجلد فردي
              <input
                type="file"
                accept=".json"
                onChange={onImportFolder}
                ref={importInputRef}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 🌟 صندوق "تنسيق النمط النشط" مع التبويبين (صفحة الخط + صفحة التدريج)       */}
        {/* ========================================================================= */}
        <div className="bg-[#151515] border border-[#2d2d2d] rounded-lg p-2.5 flex flex-col gap-2.5 compact-hide shadow-md">
          {/* شريط رأس الصندوق وأزرار التبديل بين صفحة التنسيق وصفحة التدريج */}
          <div className="flex flex-col gap-1.5 border-b border-[#2d2d2d] pb-2">
            <div className="flex justify-between items-center">
              <h3 className="text-[11px] text-white uppercase font-bold">
                تنسيق النمط النشط
              </h3>
              {activeStyle && (
                <span className="text-[9.5px] text-[#7be09c] font-bold bg-[#1a2d1d] border border-green-800/60 px-1.5 py-0.5 rounded">
                  {activeStyle.name}
                </span>
              )}
            </div>

            {/* أزرار التبويبات (الصفحتين) */}
            <div className="flex gap-1 bg-[#202020] p-0.5 rounded-lg border border-[#333]">
              <button
                type="button"
                onClick={() => setStyleActiveTab('font_style')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-md transition cursor-pointer flex items-center justify-center gap-1 ${
                  styleActiveTab === 'font_style'
                    ? 'bg-[#007acc] text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                <span>🎨 الخط والحد (Stroke)</span>
              </button>
              <button
                type="button"
                onClick={() => setStyleActiveTab('gradient')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-md transition cursor-pointer flex items-center justify-center gap-1 ${
                  styleActiveTab === 'gradient'
                    ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                <span>🌈 تدريج النصوص</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 📄 الصفحة الأولى: تنسيق الخط الأصلي بالكامل + الـ Stroke   */}
          {/* ========================================================= */}
          {styleActiveTab === 'font_style' && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="text-gray-400 shrink-0">حجم الخط (px أو Auto)</label>
                <input
                  type="text"
                  value={fontSize}
                  onChange={e => {
                    setFontSize(e.target.value);
                    if (onUpdateActiveStyle) {
                      const isAuto = e.target.value.trim().toLowerCase() === 'auto';
                      onUpdateActiveStyle({ fontSize: isAuto ? 'auto' : (parseFloat(e.target.value) || 16) });
                    }
                  }}
                  className="w-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white text-[11px] px-1.5 py-0.5 rounded outline-none focus:border-[#007acc] text-center"
                  id="prop-font-size"
                  placeholder="Auto أو 18"
                />
              </div>

              {/* لون النص الداخلي */}
              <div className="flex items-center justify-between text-[11px]">
                <label className="text-gray-400 shrink-0 font-bold">لون النص الداخلي (Fill)</label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-400">{textColor}</span>
                  <input
                    type="color"
                    value={textColor}
                    onChange={e => {
                      setTextColor(e.target.value);
                      if (onUpdateActiveStyle) onUpdateActiveStyle({ color: e.target.value });
                    }}
                    className="w-8 h-4 shrink-0 bg-transparent rounded cursor-pointer border-0 p-0"
                    id="prop-color"
                  />
                </div>
              </div>

              {/* 🖌️ حقول الحد الخارجي للخط (Stroke) المباشرة الفورية */}
              <div className="bg-[#121c24] border border-blue-900/60 rounded-lg p-2 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-blue-900/40 pb-1">
                  <span className="text-[11px] font-bold text-blue-300">🖌️ الحد الخارجي (Stroke):</span>
                  <span className="text-[10px] text-gray-400">
                    {strokeWidth > 0 ? `${strokeWidth}px مفعّل` : 'بدون حد'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <label className="text-gray-300">سمك الحد (Width):</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="range"
                      min="0"
                      max="16"
                      step="0.5"
                      value={strokeWidth}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        if (setStrokeWidth) setStrokeWidth(val);
                        if (onUpdateActiveStyle) onUpdateActiveStyle({ strokeWidth: val });
                      }}
                      className="w-20 accent-[#007acc] cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={strokeWidth}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        if (setStrokeWidth) setStrokeWidth(val);
                        if (onUpdateActiveStyle) onUpdateActiveStyle({ strokeWidth: val });
                      }}
                      className="w-10 bg-[#2d2d2d] border border-[#444] text-white text-[10px] text-center rounded py-0.5"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <label className="text-gray-300">لون الحد (Color):</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-400">{strokeColor}</span>
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={e => {
                        if (setStrokeColor) setStrokeColor(e.target.value);
                        if (onUpdateActiveStyle) onUpdateActiveStyle({ strokeColor: e.target.value });
                      }}
                      className="w-7 h-4 bg-transparent rounded cursor-pointer border-0 p-0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (setStrokeColor) setStrokeColor('#ffffff');
                        if (onUpdateActiveStyle) onUpdateActiveStyle({ strokeColor: '#ffffff' });
                      }}
                      className="text-[9px] bg-white text-black font-bold px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      أبيض
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (setStrokeColor) setStrokeColor('#000000');
                        if (onUpdateActiveStyle) onUpdateActiveStyle({ strokeColor: '#000000' });
                      }}
                      className="text-[9px] bg-black text-white font-bold px-1.5 py-0.5 rounded border border-gray-600 cursor-pointer"
                    >
                      أسود
                    </button>
                  </div>
                </div>
              </div>

              {/* لون الخلفية */}
              <div className="flex items-center justify-between text-[11px]">
                <label className="text-gray-400 shrink-0">لون الخلفية</label>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={e => {
                      setBgColor(e.target.value);
                      setBgTransparent(false);
                      if (onUpdateActiveStyle) onUpdateActiveStyle({ bgColor: e.target.value });
                    }}
                    disabled={bgTransparent}
                    style={{ opacity: bgTransparent ? 0.3 : 1 }}
                    className="w-8 h-4 bg-transparent rounded cursor-pointer border-0"
                    id="prop-bg-color"
                  />
                  <button
                    onClick={() => {
                      const nextTransparent = !bgTransparent;
                      setBgTransparent(nextTransparent);
                      if (onUpdateActiveStyle) {
                        onUpdateActiveStyle({ bgColor: nextTransparent ? 'transparent' : bgColor });
                      }
                    }}
                    style={{ backgroundColor: bgTransparent ? '#007acc' : '#555' }}
                    className="text-[10px] text-white py-0.5 px-2 rounded shrink-0 cursor-pointer"
                    id="prop-bg-transparent-btn"
                    title="شفاف"
                  >
                    {bgTransparent ? 'شفاف' : 'ملوّن'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <label className="text-gray-400 shrink-0">تباعد الأسطر (Line Height)</label>
                <input
                  type="number"
                  step="0.05"
                  value={lineHeight}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 1.1;
                    setLineHeight(val);
                    if (onUpdateActiveStyle) onUpdateActiveStyle({ lineHeight: val });
                  }}
                  className="w-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white text-[11px] px-1.5 py-0.5 rounded outline-none focus:border-[#007acc] text-center"
                  id="prop-line-height"
                />
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <label className="text-gray-400 shrink-0">تباعد الحروف (Tracking)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tracking}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setTracking(val);
                    if (onUpdateActiveStyle) onUpdateActiveStyle({ tracking: val });
                  }}
                  className="w-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white text-[11px] px-1.5 py-0.5 rounded outline-none focus:border-[#007acc] text-center"
                  id="prop-tracking"
                />
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <label className="text-gray-400 shrink-0">المحاذاة</label>
                <select
                  value={textAlign}
                  onChange={e => {
                    const val = e.target.value as 'center' | 'left' | 'right';
                    setTextAlign(val);
                    if (onUpdateActiveStyle) onUpdateActiveStyle({ textAlign: val });
                  }}
                  className="w-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white text-[11px] px-1.5 py-0.5 rounded outline-none focus:border-[#007acc] cursor-pointer"
                  id="prop-align"
                >
                  <option value="center">وسط</option>
                  <option value="right">يمين</option>
                  <option value="left">يسار</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-[11px] gap-2">
                <label className="text-gray-400 truncate">نوع الخط المرفوع</label>
                <div className="flex items-center gap-1 shrink-0 max-w-[170px]">
                  <select
                    value={fontFamily}
                    onChange={e => {
                      setFontFamily(e.target.value);
                      if (onUpdateActiveStyle) onUpdateActiveStyle({ fontFamily: e.target.value });
                    }}
                    className="w-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white text-[10px] px-1 py-0.5 rounded outline-none focus:border-[#007acc] cursor-pointer"
                    id="prop-font-family"
                  >
                    {allFonts.length === 0 ? (
                      <option value="">لا توجد خطوط مرفوعة</option>
                    ) : (
                      allFonts.map(f => (
                        <option key={f.value} value={f.value} style={{ fontFamily: `'${f.value}'` }}>
                          {f.name}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    onClick={handleToggleFavorite}
                    style={{ color: favFonts.includes(fontFamily) ? '#f5c518' : '#555' }}
                    className="text-sm px-1 font-bold bg-[#2d2d2d] hover:bg-[#333] hover:text-white rounded transition cursor-pointer"
                    id="font-fav-btn"
                    title="أضف للمفضلة"
                  >
                    ★
                  </button>
                  <button
                    onClick={onOpenFontManager}
                    className="text-[10px] text-gray-300 py-0.5 px-1.5 bg-[#2d2d2d] hover:bg-[#333] hover:text-white rounded transition shrink-0 cursor-pointer"
                    id="font-manage-btn"
                    title="إدارة الخطوط"
                  >
                    +خط
                  </button>
                </div>
              </div>

              {favFonts && favFonts.length > 0 && (
                <div className="flex items-center justify-between text-[11px] gap-2 border-t border-[#2d2d2d]/40 pt-2 mt-0.5">
                  <label className="text-[#f5c518] truncate font-semibold">⭐ خطوطك المفضلة</label>
                  <select
                    value={favFonts.includes(fontFamily) ? fontFamily : ""}
                    onChange={e => {
                      if (e.target.value) {
                        setFontFamily(e.target.value);
                        if (onUpdateActiveStyle) onUpdateActiveStyle({ fontFamily: e.target.value });
                      }
                    }}
                    className="w-[170px] bg-[#1a2d1d] border border-green-800 text-[#7be09c] text-[10px] px-1.5 py-0.5 rounded-lg outline-none focus:border-green-600 font-bold cursor-pointer"
                    id="prop-fav-fonts-select"
                  >
                    <option value="" disabled className="text-gray-500">اختر من المفضلة...</option>
                    {allFonts.filter(f => favFonts.includes(f.value)).map(f => (
                      <option key={f.value} value={f.value} style={{ fontFamily: `'${f.value}'` }}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* علامات النمط (Tags) */}
              <div className="flex flex-col gap-1 text-[11px] border-t border-[#2d2d2d]/40 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-gray-400 font-bold">علامات النمط (Tags):</label>
                  <span className="text-[9px] text-gray-500">مفصولة بمسافة (تُحفظ تلقائياً)</span>
                </div>
                <input
                  type="text"
                  value={activeStyle ? activeStyle.tags.join(' ') : ''}
                  onChange={e => {
                    const newTags = e.target.value.split(' ').map(t => t.trim()).filter(Boolean);
                    if (onUpdateActiveStyle) {
                      onUpdateActiveStyle({ tags: newTags });
                    }
                  }}
                  placeholder="مثال: scream shout s"
                  className="w-full bg-[#2d2d2d] border border-[#3c3c3c] text-white text-[10.5px] px-2 py-1 rounded outline-none focus:border-[#007acc]"
                  dir="auto"
                />
              </div>

              {/* Bold, Italic, Underline */}
              <div className="flex gap-1 mt-1 justify-center">
                <button
                  onClick={() => {
                    const nextBold = !bold;
                    setBold(nextBold);
                    if (onUpdateActiveStyle) onUpdateActiveStyle({ bold: nextBold });
                  }}
                  className={`flex-1 max-w-[50px] py-1 text-xs font-semibold rounded select-none cursor-pointer transition ${
                    bold ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
                  }`}
                  id="fmt-bold-btn"
                  title="غامق"
                >
                  B
                </button>
                <button
                  onClick={() => {
                    const nextItalic = !italic;
                    setItalic(nextItalic);
                    if (onUpdateActiveStyle) onUpdateActiveStyle({ italic: nextItalic });
                  }}
                  className={`flex-1 max-w-[50px] py-1 text-xs font-semibold rounded select-none cursor-pointer transition ${
                    italic ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
                  }`}
                  id="fmt-italic-btn"
                  title="مائل"
                >
                  I
                </button>
                <button
                  onClick={() => {
                    const nextUnderline = !underline;
                    setUnderline(nextUnderline);
                    if (onUpdateActiveStyle) onUpdateActiveStyle({ underline: nextUnderline });
                  }}
                  className={`flex-1 max-w-[50px] py-1 text-xs font-semibold rounded select-none cursor-pointer transition ${
                    underline ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
                  }`}
                  id="fmt-underline-btn"
                  title="تسطير"
                >
                  U
                </button>
              </div>

              <button
                onClick={onApplyStyleToActiveLayer}
                className="w-full bg-[#007acc] hover:bg-[#0062a3] text-white py-1.5 px-2 text-[10.5px] rounded mt-1 shadow font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                id="apply-style-box-btn"
              >
                <span>💾 حفظ في النمط وتطبيقه على العنصر النشط</span>
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* 📄 الصفحة الثانية: تدريج لون النصوص (Text Gradients)       */}
          {/* ========================================================= */}
          {styleActiveTab === 'gradient' && (
            <div className="flex flex-col gap-2.5">
              {/* شاشة المعاينة الفورية للتدريج مع حدود الـ Stroke */}
              <div
                style={{
                  background: `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})`,
                  border: strokeWidth > 0 ? `${Math.min(4, Math.max(1, strokeWidth))}px solid ${strokeColor}` : '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                }}
                className="w-full h-12 rounded-lg flex items-center justify-center shadow-inner select-none transition-all"
              >
                <span className="text-white text-xs font-extrabold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  معاينة تدريج لون النص
                </span>
              </div>

              {/* زر الشفط الذكي من الصورة مباشرة */}
              <button
                type="button"
                onClick={onSampleGradientFromSelection}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-2 px-2 rounded-lg text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                title="قم بتحديد النص بالمستطيل أو العصا واضغط هنا لشفط ألوان التدرج وحدود الـ Stroke تلقائياً"
              >
                <span>🔍 استخراج التدريج والـ Stroke من التحديد الحالي</span>
              </button>

              {/* اختيار ألوان التدرج والزاوية */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between bg-[#202020] p-1.5 rounded-lg border border-[#333]">
                  <span className="text-gray-300 text-[11px]">اللون 1:</span>
                  <input
                    type="color"
                    value={gradientColor1}
                    onChange={e => setGradientColor1(e.target.value)}
                    className="w-7 h-5 bg-transparent rounded cursor-pointer border-0 p-0"
                  />
                </div>
                <div className="flex items-center justify-between bg-[#202020] p-1.5 rounded-lg border border-[#333]">
                  <span className="text-gray-300 text-[11px]">اللون 2:</span>
                  <input
                    type="color"
                    value={gradientColor2}
                    onChange={e => setGradientColor2(e.target.value)}
                    className="w-7 h-5 bg-transparent rounded cursor-pointer border-0 p-0"
                  />
                </div>
              </div>

              {/* زاوية التدرج */}
              <div className="flex items-center justify-between text-[11px] bg-[#202020] p-1.5 rounded-lg border border-[#333]">
                <span className="text-gray-300">الزاوية ({gradientAngle}°):</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={gradientAngle}
                  onChange={e => setGradientAngle(parseInt(e.target.value) || 90)}
                  className="w-28 accent-[#007acc] cursor-pointer"
                />
              </div>

              {/* زري: نسخ تدريج النص النشط + تطبيق التدريج المختار */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (onCopyGradientFromActiveLayer) {
                      onCopyGradientFromActiveLayer();
                    } else if (activeGradient && activeGradient.colors.length >= 2) {
                      setGradientColor1(activeGradient.colors[0]);
                      setGradientColor2(activeGradient.colors[1]);
                      setGradientAngle(activeGradient.angle || 90);
                    }
                  }}
                  className="bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-[#444] text-white py-1.5 px-1 rounded-lg text-[10.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  title="نسخ تدريج الألوان من النص المحدد في مساحة العمل"
                >
                  <span>❐ نسخ من طبقة نص</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onApplyGradientToActiveLayer) {
                      onApplyGradientToActiveLayer({
                        enabled: true,
                        type: 'linear',
                        colors: [gradientColor1, gradientColor2],
                        angle: gradientAngle,
                      });
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-1 rounded-lg text-[10.5px] font-bold transition shadow flex items-center justify-center gap-1 cursor-pointer"
                  title="تطبيق التدريج الحالي على النص النشط"
                >
                  <span>✓ تطبيق التدريج</span>
                </button>
              </div>

              {/* زر إلغاء التدريج */}
              <button
                type="button"
                onClick={() => {
                  if (onApplyGradientToActiveLayer) {
                    onApplyGradientToActiveLayer(null);
                  }
                }}
                className="bg-red-950/80 border border-red-900/60 hover:bg-red-800 text-red-300 py-1 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer"
              >
                ✕ إزالة التدريج (الرجوع للون العادي)
              </button>

              {/* حفظ كقالب تدريج جديد */}
              <div className="flex gap-1.5 items-center bg-[#202020] p-1.5 rounded-lg border border-[#333]">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  placeholder="اسم الستايل الجديد..."
                  className="flex-1 bg-[#151515] border border-[#3c3c3c] text-white text-[10px] px-2 py-1 rounded outline-none focus:border-[#007acc]"
                />
                <button
                  type="button"
                  onClick={handleSaveGradientPreset}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-1 px-2.5 rounded transition shrink-0 cursor-pointer"
                >
                  + حفظ بالشبكة
                </button>
              </div>

              {/* 🌟 شبكة مربعات الاستايلات والتدريجات الاحترافية (Styles Grid Swatches) كما بالصورة الثالثة */}
              <div className="flex flex-col gap-1.5 border-t border-[#2d2d2d] pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-gray-300">مكتبة الاستايلات والتدرجات:</span>
                  <div className="flex gap-1">
                    {onExportGradients && (
                      <button
                        type="button"
                        onClick={onExportGradients}
                        className="text-[9px] bg-green-700 hover:bg-green-600 text-white font-bold px-1.5 py-0.5 rounded cursor-pointer"
                        title="مشاركة كافة التدريجات كملف مع التطبيقات الأخرى"
                      >
                        مشاركة 📤
                      </button>
                    )}
                    {onImportGradients && (
                      <label className="text-[9px] bg-blue-700 hover:bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded cursor-pointer">
                        استيراد 📥
                        <input
                          type="file"
                          accept=".json"
                          onChange={onImportGradients}
                          ref={importGradientsInputRef}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* شبكة المربعات الأيقونية المنظمة */}
                <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto p-2 bg-[#101010] rounded-lg border border-[#262626] scrollbar-thin">
                  {gradientPresets.length === 0 ? (
                    <span className="col-span-5 text-center text-gray-500 text-[10px] py-4">
                      لا توجد استايلات محفوظة بعد
                    </span>
                  ) : (
                    gradientPresets.map(preset => {
                      const isLinear = preset.type !== 'radial';
                      const bgGradient = isLinear
                        ? `linear-gradient(${preset.angle || 90}deg, ${preset.colors.join(', ')})`
                        : `radial-gradient(circle, ${preset.colors.join(', ')})`;
                      
                      const hasStroke = preset.strokeWidth && preset.strokeWidth > 0;
                      const sWidth = hasStroke ? Math.min(3, Math.max(1, preset.strokeWidth!)) : 1;
                      const sColor = preset.strokeColor || '#ffffff';

                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            if (preset.colors.length >= 2) {
                              setGradientColor1(preset.colors[0]);
                              setGradientColor2(preset.colors[1]);
                              setGradientAngle(preset.angle || 90);
                            }
                            if (preset.strokeColor && setStrokeColor) {
                              setStrokeColor(preset.strokeColor);
                            }
                            if (preset.strokeWidth !== undefined && setStrokeWidth) {
                              setStrokeWidth(preset.strokeWidth);
                            }
                            if (onApplyGradientToActiveLayer) {
                              onApplyGradientToActiveLayer({
                                enabled: true,
                                type: preset.type || 'linear',
                                colors: preset.colors,
                                angle: preset.angle || 90,
                              });
                            }
                          }}
                          style={{
                            background: bgGradient,
                            border: `${sWidth}px solid ${sColor}`,
                            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), 0 2px 5px rgba(0,0,0,0.8)',
                          }}
                          className="w-12 h-12 rounded-lg cursor-pointer transition-all duration-150 relative group flex items-center justify-center hover:scale-105 active:scale-95 border-box shrink-0 select-none shadow-md"
                          title={`${preset.name} (اضغط للتطبيق المباشر)`}
                        >
                          {/* علامة حذف صغيرة تظهر عند التمرير */}
                          {setGradientPresets && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGradientPresets(prev => prev.filter(p => p.id !== preset.id));
                              }}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 hover:bg-red-700 text-white rounded-full text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md cursor-pointer z-10"
                              title="حذف"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Arabic Tatweel system */}
        <div className="border border-[#2d2d2d] rounded-lg p-2.5 bg-[#151515]/30 flex flex-col gap-2 compact-hide">
          <h3 className="text-xs text-white uppercase font-bold pb-0.5 border-b border-[#2d2d2d] mb-1">
            ـ تمطيط الأسطر
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-12 shrink-0">الشدة</span>
              <input
                type="range"
                min="1"
                max="5"
                value={tatweelStrength}
                onChange={e => setTatweelStrength(parseInt(e.target.value) || 2)}
                className="flex-1 accent-[#007acc] focus:outline-none cursor-pointer"
                id="tatweel-strength"
              />
              <span className="text-[10px] text-gray-300 w-5 text-left shrink-0">{tatweelStrength}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-12 shrink-0">الهامش %</span>
              <input
                type="range"
                min="0"
                max="30"
                value={tatweelMargin}
                onChange={e => setTatweelMargin(parseInt(e.target.value) || 5)}
                className="flex-1 accent-[#007acc] focus:outline-none cursor-pointer"
                id="tatweel-margin"
              />
              <span className="text-[10px] text-gray-300 w-6 text-left shrink-0">{tatweelMargin}%</span>
            </div>

            <div className="flex items-center justify-between bg-[#1e1e1e] border border-[#2d2d2d] rounded p-1.5 mt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400">خطوة التمديد:</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={manualTatweelStep ?? 1}
                  onChange={e => setManualTatweelStep && setManualTatweelStep(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-10 bg-[#2d2d2d] border border-[#444] text-white text-[10px] text-center rounded py-0.5 focus:outline-none"
                  title="عدد الكشيدات المضافة في كل نقرة"
                />
              </div>

              <button
                type="button"
                onClick={() => onStepTatweel && onStepTatweel(manualTatweelStep)}
                className="bg-[#007acc] hover:bg-[#0062a3] text-white text-[10.5px] font-bold py-1 px-3 rounded shadow transition flex items-center gap-1 cursor-pointer active:scale-95"
                title="إضافة كشيدة تمديد جديدة بالعدد المحدد"
              >
                <span>ـ+ تمديد (+{manualTatweelStep ?? 1})</span>
              </button>
            </div>

            <div
              className="bg-[#111] border border-[#2d2d2d] rounded p-2 text-xs text-gray-300 min-h-[40px] text-center break-all select-all flex items-center justify-center leading-relaxed"
              id="tatweel-preview"
              style={{ fontFamily: fontFamily ? `'${fontFamily}'` : undefined }}
            >
              {tatweelPreviewText}
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={onApplyTatweel}
                className="flex-1 bg-[#007acc] hover:bg-[#0062a3] text-white py-1 px-1.5 rounded-lg text-[10px] shadow font-medium transition cursor-pointer"
                id="tatweel-apply-btn"
              >
                تطبيق ـ التمطيط
              </button>

              <button
                onClick={onRemoveAllTatweel}
                className="bg-red-950/80 border border-red-900/60 hover:bg-red-800 text-red-300 py-1 px-2 rounded-lg text-[10px] shadow font-medium transition cursor-pointer"
                id="tatweel-remove-btn"
                title="إزالة كافة الكشيدات والمدود"
              >
                إلغاء التمطيط ✕
              </button>

              <button
                onClick={onUndoTatweel}
                className="bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d] rounded shrink-0 p-1 w-8 flex items-center justify-center text-xs font-semibold cursor-pointer"
                id="tatweel-undo-btn"
                title="تراجع"
              >
                ↩
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="p-3 border-t border-[#2d2d2d] flex flex-col gap-2 bg-[#171717]">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onPrevLine}
            className="bg-[#2d2d2d] border border-[#3c3c3c] hover:bg-[#3d3d3d] text-white text-[11px] py-1.5 rounded transition select-none cursor-pointer font-bold"
            id="prev-line-btn"
          >
            السطر السابق ⇧
          </button>
          <button
            onClick={onNextLine}
            className="bg-[#2d2d2d] border border-[#3c3c3c] hover:bg-[#3d3d3d] text-white text-[11px] py-1.5 rounded transition select-none cursor-pointer font-bold"
            id="next-line-btn"
          >
            السطر التالي ⇩
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={onInsertText}
            className="col-span-2 bg-[#007acc] hover:bg-[#0062a3] text-white font-bold text-[11px] py-1.5 rounded shadow transition select-none cursor-pointer"
            id="paste-btn"
          >
            إدراج النص [Enter]
          </button>
          <button
            onClick={onAlignText}
            className="col-span-1 bg-[#2d2d2d] border border-[#3c3c3c] hover:bg-[#3d3d3d] text-gray-300 text-[11px] py-1.5 rounded transition select-none truncate cursor-pointer font-bold"
            id="align-btn"
            title="محاذاة [Ctrl+A]"
          >
            محاذاة [Ctrl+A]
          </button>
        </div>

        <div className="flex flex-col gap-1 border-t border-[#2d2d2d]/40 pt-2 mt-1 select-none">
          <span className="text-[10px] text-gray-500 font-bold mb-1 text-right">📐 نمط شكل الفقاعة النشط:</span>
          <div className="grid grid-cols-5 gap-1 text-center" id="custom-shape-selector-footer">
            <button
              type="button"
              onClick={() => onSelectBubbleShape('normal_oval')}
              className={`py-1 rounded text-[9.5px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                detectedBubbleType === 'normal_oval' 
                  ? 'bg-[#007acc] text-white border border-[#0098ff]' 
                  : 'bg-[#222] border border-[#333] hover:bg-[#333] text-gray-400'
              }`}
            >
              <span className="text-[11px]">💬</span>
              <span>بيضاوية</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectBubbleShape('spiky_shout')}
              className={`py-1 rounded text-[9.5px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                detectedBubbleType === 'spiky_shout' 
                  ? 'bg-[#007acc] text-white border border-[#0098ff]' 
                  : 'bg-[#222] border border-[#333] hover:bg-[#333] text-gray-400'
              }`}
            >
              <span className="text-[11px]">💥</span>
              <span>صراخ</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectBubbleShape('thought_cloud')}
              className={`py-1 rounded text-[9.5px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                detectedBubbleType === 'thought_cloud' 
                  ? 'bg-[#007acc] text-white border border-[#0098ff]' 
                  : 'bg-[#222] border border-[#333] hover:bg-[#333] text-gray-400'
              }`}
            >
              <span className="text-[11px]">💭</span>
              <span>تفكير</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectBubbleShape('narrative_box')}
              className={`py-1 rounded text-[9.5px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                detectedBubbleType === 'narrative_box' 
                  ? 'bg-[#007acc] text-white border border-[#0098ff]' 
                  : 'bg-[#222] border border-[#333] hover:bg-[#333] text-gray-400'
              }`}
            >
              <span className="text-[11px]">📜</span>
              <span>صندوق</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectBubbleShape('vertical_oval')}
              className={`py-1 rounded text-[9.5px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                detectedBubbleType === 'vertical_oval' 
                  ? 'bg-[#007acc] text-white border border-[#0098ff]' 
                  : 'bg-[#222] border border-[#333] hover:bg-[#333] text-gray-400'
              }`}
            >
              <span className="text-[11px]">🔵</span>
              <span>رأسية</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
