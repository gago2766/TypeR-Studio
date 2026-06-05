import React, { useRef } from 'react';
import { StyleFolder, TextStyle, ProcessedLine, ShapePreset, CustomFont } from '../types';

interface SidebarProps {
  // Page operations
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPNG: () => void;
  onExportPSD: () => void;
  onExportAll: () => void;
  onExportAllZip: () => void;
  onSaveState: () => void;
  onLoadState: () => void;
  onShare: () => void; // 👈 إضافة الخاصية إلى واجهة المكون

  // Tool Selection
  activeTool: 'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand';
  setActiveTool: (tool: 'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand') => void;
  wandTolerance: number;

  // New cleaning & redrawing props
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
  onAddFolder: () => void;
  onAddStyle: () => void;
  onOpenStylesExportSelector: () => void;

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

  // Shape Presets
  presets: ShapePreset[];
  activePresetId: string | null;
  onApplyPreset: (presetId: string) => void;
  onSaveCurrentPreset: () => void;
  onClearPreset: () => void;

  // Arabic Tatweel (Kashida)
  tatweelStrength: number;
  setTatweelStrength: (val: number) => void;
  tatweelMargin: number;
  setTatweelMargin: (val: number) => void;
  onApplyTatweel: () => void;
  onUndoTatweel: () => void;
  tatweelPreviewText: string;

  // Drawing undo/redo props
  onDrawingUndo?: () => void;
  onDrawingRedo?: () => void;
  canDrawingUndo?: boolean;
  canDrawingRedo?: boolean;

  // Whiten wand selection props
  onWhitenWandSelection?: () => void;
  hasWandMask?: boolean;

  // Bottom action triggers
  onPrevLine: () => void;
  onNextLine: () => void;
  onInsertText: () => void;
  onAlignText: () => void;
}

export function Sidebar({
  onImageUpload,
  onExportPNG,
  onExportPSD,
  onExportAll,
  onExportAllZip,
  onSaveState,
  onLoadState,
  onShare, // 👈 استدعاء الدالة من الخواص المفككة
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
  onAddFolder,
  onAddStyle,
  onOpenStylesExportSelector,
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
  presets,
  activePresetId,
  onApplyPreset,
  onSaveCurrentPreset,
  onClearPreset,
  tatweelStrength,
  setTatweelStrength,
  tatweelMargin,
  setTatweelMargin,
  onApplyTatweel,
  onUndoTatweel,
  tatweelPreviewText,
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
}: SidebarProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

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
            title="مشاركة الصفحة النشطة مباشرة مع التطبيقات الأخرى (واتساب، تليجرام، إلخ)"
          >
            <span>📤 مشاركة الصفحة لتطبيقات أخرى</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onExportPSD}
            className="bg-[#107c41] text-white hover:bg-[#0a5c30] text-[11px] font-semibold py-2 px-1 rounded transition select-none truncate flex items-center justify-center gap-1 cursor-pointer"
            id="export-psd-btn"
            title="تصدير الصفحة كملف فوتوشوب PSD مع طبقات نصوص مستقلة"
          >
            <span>🎨 تصدير PSD</span>
          </button>
          <button
            onClick={onExportAllZip}
            className="bg-[#d27d2d] text-white hover:bg-[#b0631e] text-[11px] font-semibold py-2 px-1 rounded transition select-none truncate flex items-center justify-center gap-1 cursor-pointer"
            id="export-zip-btn"
            title="تصدير وضغط جميع الصفحات في ملف ZIP واحد"
          >
            <span>📦 تصدير ZIP</span>
          </button>
        </div>
        <div className="grid grid-cols-1">
          <button
            onClick={onExportAll}
            className="bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d] text-[10px] py-1.5 px-2 rounded transition select-none truncate flex items-center justify-center gap-1 cursor-pointer"
            id="export-all-btn"
            title="تصدير وتحميل جميع الصفحات كصور منفردة متتالية"
          >
            <span>🎞️ تصدير جميع الصفحات كصور منفصلة</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1 compact-hide">
          <button
            onClick={onSaveState}
            className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 rounded transition select-none"
            id="save-state-btn"
            title="حفظ التقدم الحالي في المتصفح"
          >
            حفظ الحالة
          </button>
          <button
            onClick={onLoadState}
            className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 rounded transition select-none"
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
              className={`flex-1 text-[11px] py-1.5 px-2 rounded font-medium transition ${
                activeTool === 'marquee'
                  ? 'bg-[#007acc] text-white'
                  : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
              id="tool-marquee-btn"
            >
              التحديد المستطيل 🔲
            </button>
            <button
              onClick={() => setActiveTool('magic_wand')}
              className={`flex-1 text-[11px] py-1.5 px-2 rounded font-medium transition ${
                activeTool === 'magic_wand'
                  ? 'bg-[#007acc] text-white'
                  : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
              id="tool-magic-btn"
            >
              العصا السحرية 🪄
            </button>
          </div>
          <div className="text-[10px] text-gray-400 bg-[#0a0a0a] border-l-2 border-l-[#007acc] p-2 leading-relaxed rounded">
            {activeTool === 'magic_wand'
              ? `🪄 العصا السحرية: اضغط داخل البياض لتحديد حواف الفقاعة تلقائياً (الحساسية: ${wandTolerance})`
              : activeTool === 'marquee'
              ? '🔲 اسحب للتحديد: ارسم مستطيل سحب يدوياً لتحديد موضع النص والأبعاد.'
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
              title="أداة العدسة المكبرة: اضغط لتكبير الصفحة، أو اضغط مع Alt للتصغير"
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
              title="أداة اليد الممسكة: اسحب للتنقل بحرية كاملة داخل الصفحة المانجا"
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

          {/* Drawing Undo / Redo Row */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <button
              onClick={onDrawingUndo}
              disabled={!canDrawingUndo}
              className={`text-[10px] py-1 px-1.5 rounded transition flex items-center justify-center gap-1 select-none border border-[#3c3c3c] cursor-pointer ${
                canDrawingUndo
                  ? 'bg-[#1e1e1e] text-white hover:bg-[#3d3d3d] hover:border-[#555]'
                  : 'bg-black/20 text-gray-600 border-[#222] cursor-not-allowed'
              }`}
              title="تراجع عن آخر ضربة فرشاة أو مسح في الصفحة الحالية"
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
              title="إعادة تطبيق ضربة الفرشاة المرجوع عنها"
            >
              <span>إعادة رسم ↪️</span>
            </button>
          </div>

          {/* Whiten Wand Selection Button */}
          <div className="mb-2">
            <button
              type="button"
              onClick={onWhitenWandSelection}
              disabled={!hasWandMask}
              className={`w-full text-[11px] py-2 px-3 rounded font-bold transition flex items-center justify-center gap-1.5 select-none border cursor-pointer ${
                hasWandMask
                  ? 'bg-[#007acc] text-white border-[#0098ff] hover:bg-[#008be6] active:scale-[0.98]'
                  : 'bg-black/20 text-gray-500 border-[#222] cursor-not-allowed'
              }`}
              id="whiten-wand-btn"
              title={
                hasWandMask
                  ? "تبييض مساحة تحديد العصا السحرية الحالية دفعة واحدة بلون الفرشاة"
                  : "حدد جزءاً من الصفحة بالعصا السحرية أولاً لتفعيل التبييض السريع"
              }
            >
              <span>✨ تبييض تحديد العصا بضغطة واحدة</span>
            </button>
          </div>

          {/* Active options based on selected tool */}
          {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'clone_stamp' || activeTool === 'color_picker') && (
            <div className="bg-[#151515] border border-[#2d2d2d] rounded p-2 flex flex-col gap-2 mb-2">
              {/* Brush Size setting */}
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

              {/* Brush Color option (only for brush tool) */}
              {activeTool === 'brush' && (
                <div className="flex items-center justify-between text-[11px] text-gray-300">
                  <span>لون الرسم:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setBrushColor('#ffffff')}
                      className={`w-4 h-4 rounded bg-white border border-[#555] ${brushColor === '#ffffff' ? 'ring-2 ring-[#007acc]' : ''}`}
                      title="بياض"
                    />
                    <button
                      onClick={() => setBrushColor('#000000')}
                      className={`w-4 h-4 rounded bg-black border border-[#555] ${brushColor === '#000000' ? 'ring-2 ring-[#007acc]' : ''}`}
                      title="سواد"
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

              {/* Clone Stamp configuration info */}
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

              {/* Color Picker Feedback */}
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
            placeholder="أدخل النص المترجم هنا... 
استخدم [scream] أو [s] لنمط تلقائي.
استخدم [Page 1] لتنبيه التبديل الآلي للصفحات."
            value={scriptInput}
            onChange={e => setScriptInput(e.target.value)}
          />

          <h3 className="text-xs text-white uppercase font-bold mt-3 mb-1 border-b border-[#2d2d2d] pb-1">
            الأسطر المعالجة
          </h3>
          <div
            id="lines-container"
            className="border border-[#2d2d2d] bg-[#151515] rounded max-h-[140px] overflow-y-auto"
          >
            {parsedLines.length === 0 ? (
              <div className="p-4 text-center text-gray-600 text-[10px]">
                الصق النص أعلاه للبدء
              </div>
            ) : (
              parsedLines.map((line, idx) => {
                const isActive = idx === currentLineIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectLine(idx)}
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
          <h3 className="text-xs text-white uppercase font-bold mb-1 border-b border-[#2d2d2d] pb-1">
            مجلدات الأنماط (تصدير فردي)
          </h3>
          <div id="folders-container" className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-0.5">
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
                        className="text-[9px] bg-[#333] hover:bg-[#44] hover:text-white text-gray-300 py-0.5 px-1.5 rounded transition"
                      >
                        تكرار ❐
                      </button>
                      <button
                        onClick={() => onExportFolder(folder.id)}
                        className="text-[9px] bg-[#333] hover:bg-[#44] hover:text-white text-gray-300 py-0.5 px-1.5 rounded transition"
                      >
                        تصدير 📤
                      </button>
                    </div>
                  </div>
                  <div className="p-1 flex flex-col gap-0.5">
                    {folder.styles.map(style => {
                      const isStyleEnabled = style.enabled !== false;
                      const isSelected = style.id === selectedStyleId;
                      return (
                        <div
                          key={style.id}
                          onClick={() => setSelectedStyleId(style.id)}
                          className={`flex items-center justify-between py-1 px-1.5 text-[10.5px] rounded cursor-pointer transition ${
                            isSelected ? 'bg-[#007acc] text-white' : 'text-gray-300 hover:bg-[#2a2a2a]'
                          } ${!isStyleEnabled ? 'opacity-40' : ''}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={e => toggleStyleEnabled(folder.id, style.id, e)}
                              className="text-gray-400 hover:text-white p-0.5 leading-none bg-none border-0 cursor-pointer text-xs"
                            >
                              {isStyleEnabled ? '👁' : '👁‍🗨'}
                            </button>
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block border border-[#555]"
                              style={{ backgroundColor: style.color }}
                            />
                            <span className="truncate max-w-[120px]">{style.name}</span>
                          </div>
                          <span className="text-[8.5px] text-gray-400 bg-black/10 px-1 py-0.5 rounded leading-none group-hover:block shrink-0">
                            [{style.tags.join(',')}]
                          </span>
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
              className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 px-1 rounded transition select-none truncate"
              id="add-folder-btn"
            >
              + مجلد
            </button>
            <button
              onClick={onAddStyle}
              className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 px-1 rounded transition select-none truncate"
              id="add-style-btn"
            >
              + نمط
            </button>
            <button
              onClick={onOpenStylesExportSelector}
              className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 px-1 rounded transition select-none truncate"
              id="export-styles-selector-btn"
            >
              تصدير مخصص
            </button>
          </div>
          <div className="grid grid-cols-1 mt-1">
            <label className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 rounded transition select-none text-center cursor-pointer block truncate">
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

        {/* Categories Properties panel */}
        <div className="bg-[#151515] border border-[#2d2d2d] rounded-lg p-2 flex flex-col gap-2.5 compact-hide">
          <h3 className="text-[11px] text-white uppercase font-bold border-b border-[#2d2d2d] pb-0.5 mb-0.5">
            تنسيق النمط النشط
          </h3>

          <div className="flex items-center justify-between text-[11px]">
            <label className="text-gray-400 shrink-0">حجم الخط (px أو Auto)</label>
            <input
              type="text"
              value={fontSize}
              onChange={e => setFontSize(e.target.value)}
              className="w-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white text-[11px] px-1.5 py-0.5 rounded outline-none focus:border-[#007acc] text-center"
              id="prop-font-size"
              placeholder="Auto أو 18"
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <label className="text-gray-400 shrink-0">لون النص</label>
            <input
              type="color"
              value={textColor}
              onChange={e => setTextColor(e.target.value)}
              className="w-8 h-4 shrink-0 bg-transparent rounded cursor-pointer border-0"
              id="prop-color"
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <label className="text-gray-400 shrink-0">لون الخلفية</label>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="color"
                value={bgColor}
                onChange={e => {
                  setBgColor(e.target.value);
                  setBgTransparent(false);
                }}
                disabled={bgTransparent}
                style={{ opacity: bgTransparent ? 0.3 : 1 }}
                className="w-8 h-4 bg-transparent rounded cursor-pointer border-0"
                id="prop-bg-color"
              />
              <button
                onClick={() => setBgTransparent(!bgTransparent)}
                style={{ backgroundColor: bgTransparent ? '#007acc' : '#555' }}
                className="text-[10px] text-white py-0.5 px-2 rounded shrink-0"
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
              onChange={e => setLineHeight(parseFloat(e.target.value) || 1.1)}
              className="w-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white text-[11px] px-1.5 py-0.5 rounded outline-none focus:border-[#007acc] text-center animate-none"
              id="prop-line-height"
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <label className="text-gray-400 shrink-0">تباعد الحروف (Tracking)</label>
            <input
              type="number"
              step="0.5"
              value={tracking}
              onChange={e => setTracking(parseFloat(e.target.value) || 0)}
              className="w-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white text-[11px] px-1.5 py-0.5 rounded outline-none focus:border-[#007acc] text-center"
              id="prop-tracking"
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <label className="text-gray-400 shrink-0">المحاذاة</label>
            <select
              value={textAlign}
              onChange={e => setTextAlign(e.target.value as 'center' | 'left' | 'right')}
              className="w-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white text-[11px] px-1.5 py-0.5 rounded outline-none focus:border-[#007acc]"
              id="prop-align"
            >
              <option value="center">وسط</option>
              <option value="right">يمين</option>
              <option value="left">يسار</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-[11px] gap-2">
            <label className="text-gray-400 truncate">نوع الخط</label>
            <div className="flex items-center gap-1 shrink-0 max-w-[170px]">
              <select
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value)}
                className="w-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white text-[10px] px-1 py-0.5 rounded outline-none focus:border-[#007acc]"
                id="prop-font-family"
              >
                {allFonts.map(f => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleToggleFavorite}
                style={{ color: favFonts.includes(fontFamily) ? '#f5c518' : '#555' }}
                className="text-sm px-1 font-bold bg-[#2d2d2d] hover:bg-[#333] hover:text-white rounded transition"
                id="font-fav-btn"
                title="أضف للمفضلة"
              >
                ★
              </button>
              <button
                onClick={onOpenFontManager}
                className="text-[10px] text-gray-300 py-0.5 px-1.5 bg-[#2d2d2d] hover:bg-[#333] hover:text-white rounded transition shrink-0"
                id="font-manage-btn"
                title="إدارة الخطوط"
              >
                +خط
              </button>
            </div>
          </div>

          {/* 👈 هنا نضع ميزة اختيار الخطوط المفضلة المضافة حديثاً */}
          {favFonts && favFonts.length > 0 && (
            <div className="flex items-center justify-between text-[11px] gap-2 border-t border-[#2d2d2d]/40 pt-2 mt-0.5">
              <label className="text-[#f5c518] truncate font-semibold">⭐ خطوطك المفضلة</label>
              <select
                value={favFonts.includes(fontFamily) ? fontFamily : ""}
                onChange={e => {
                  if (e.target.value) setFontFamily(e.target.value);
                }}
                className="w-[170px] bg-[#1a2d1d] border border-green-800 text-[#7be09c] text-[10px] px-1.5 py-0.5 rounded outline-none focus:border-green-600 font-bold cursor-pointer"
                id="prop-fav-fonts-select"
              >
                <option value="" disabled className="text-gray-500">اختر من المفضلة...</option>
                {allFonts.filter(f => favFonts.includes(f.value)).map(f => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick bold/italic toolbar */}
          <div className="flex gap-1 mt-1 justify-center">
            <button
              onClick={() => setBold(!bold)}
              className={`flex-1 max-w-[50px] py-1 text-xs font-semibold rounded select-none cursor-pointer transition ${
                bold ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
              id="fmt-bold-btn"
              title="غامق"
            >
              B
            </button>
            <button
              onClick={() => setItalic(!italic)}
              className={`flex-1 max-w-[50px] py-1 text-xs font-semibold rounded select-none cursor-pointer transition ${
                italic ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
              }`}
              id="fmt-italic-btn"
              title="مائل"
            >
              I
            </button>
            <button
              onClick={() => setUnderline(!underline)}
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
            className="w-full bg-[#007acc] hover:bg-[#0062a3] text-white py-1 px-2 text-[10.5px] rounded mt-1 shadow font-medium transition"
            id="apply-style-box-btn"
          >
            تطبيق التنسيق على العنصر المحدد
          </button>
        </div>

        {/* Shape Presets */}
        <div className="border border-[#2d2d2d] rounded-lg p-2.5 bg-[#151515]/30 flex flex-col gap-1.5 compact-hide">
          <h3 className="text-xs text-white uppercase font-bold pb-0.5 border-b border-[#2d2d2d] mb-1">
            📐 أنماط الأشكال
          </h3>
          <div className="grid grid-cols-4 gap-1.5" id="presets-grid">
            {presets.map(p => {
              const isActive = p.id === activePresetId;
              return (
                <div
                  key={p.id}
                  onClick={() => onApplyPreset(p.id)}
                  className={`p-1 bg-[#1e1e1e] border rounded cursor-pointer text-center text-[10px] flex flex-col items-center gap-1 transition ${
                    isActive ? 'border-[#007acc] bg-[#0d2233] text-white' : 'border-[#333] hover:border-[#007acc]'
                  }`}
                >
                  <div
                    style={{
                      fontFamily: p.font,
                      color: p.color,
                      background: p.bg === 'transparent' ? '#252525' : p.bg,
                      fontWeight: p.bold ? 'bold' : 'normal',
                      fontStyle: p.italic ? 'italic' : 'normal',
                    }}
                    className="w-full h-7 rounded text-[8px] flex items-center justify-center overflow-hidden"
                  >
                    {p.name}
                  </div>
                  <span className="truncate w-full max-w-[55px] opacity-80 text-[9px]">{p.name}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-1.5 mt-1.5">
            <button
              onClick={onSaveCurrentPreset}
              className="flex-1 bg-[#007acc] hover:bg-[#0062a3] text-white py-1 px-1.5 rounded text-[10px] shadow transition truncate"
              id="save-preset-btn"
            >
              💾 حفظ النمط الحالي
            </button>
            <button
              onClick={onClearPreset}
              className="bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d] rounded shrink-0 p-1 w-8 flex items-center justify-center text-xs"
              id="clear-preset-btn"
              title="إلغاء التحديد"
            >
              ✕
            </button>
          </div>
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
                className="flex-1 accent-[#007acc] focus:outline-none"
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
                className="flex-1 accent-[#007acc] focus:outline-none"
                id="tatweel-margin"
              />
              <span className="text-[10px] text-gray-300 w-6 text-left shrink-0">{tatweelMargin}%</span>
            </div>

            <div
              className="bg-[#111] border border-[#2d2d2d] rounded p-2 text-xs text-gray-300 min-h-[40px] text-center break-all select-all flex items-center justify-center leading-relaxed"
              id="tatweel-preview"
              style={{ fontFamily: fontFamily || 'Arial' }}
            >
              {tatweelPreviewText}
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={onApplyTatweel}
                className="flex-1 bg-[#007acc] hover:bg-[#0062a3] text-white py-1 px-1.5 rounded text-[10px] shadow font-medium transition"
                id="tatweel-apply-btn"
              >
                تطبيق ـ التمطيط
              </button>
              <button
                onClick={onUndoTatweel}
                className="bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d] rounded shrink-0 p-1 w-8 flex items-center justify-center text-xs font-semibold"
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
            className="bg-[#2d2d2d] border border-[#3c3c3c] hover:bg-[#3d3d3d] text-white text-[11px] py-1.5 rounded transition select-none"
            id="prev-line-btn"
          >
            السطر السابق ⇧
          </button>
          <button
            onClick={onNextLine}
            className="bg-[#2d2d2d] border border-[#3c3c3c] hover:bg-[#3d3d3d] text-white text-[11px] py-1.5 rounded transition select-none"
            id="next-line-btn"
          >
            السطر التالي ⇩
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={onInsertText}
            className="col-span-2 bg-[#007acc] hover:bg-[#0062a3] text-white font-medium text-[11px] py-1.5 rounded shadow transition select-none"
            id="paste-btn"
          >
            إدراج النص [Enter]
          </button>
          <button
            onClick={onAlignText}
            className="col-span-1 bg-[#2d2d2d] border border-[#3c3c3c] hover:bg-[#3d3d3d] text-gray-300 text-[11px] py-1.5 rounded transition select-none truncate"
            id="align-btn"
            title="محاذاة [Ctrl+A]"
          >
            محاذاة [Ctrl+A]
          </button>
        </div>
      </div>
    </div>
  );
}

