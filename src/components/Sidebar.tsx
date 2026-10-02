import React, { useRef, useState, memo } from 'react';
import { StyleFolder, TextStyle, ProcessedLine, CustomFont, GradientPreset, TextGradient } from '../types';
import { GradientEditorTab } from './sidebar/GradientEditorTab';
import { FontStyleTab } from './sidebar/FontStyleTab';
import { CleaningSection } from './sidebar/CleaningSection';

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
  onSampleGradientFromSelection?: () => void;
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

        {/* Cleaning & Redrawing Tools (مستخرج كملف منفصل) */}
        <CleaningSection
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          stampSource={stampSource}
          setStampSource={setStampSource}
          isSettingStampSource={isSettingStampSource}
          setIsSettingStampSource={setIsSettingStampSource}
          onDrawingUndo={onDrawingUndo}
          onDrawingRedo={onDrawingRedo}
          canDrawingUndo={canDrawingUndo}
          canDrawingRedo={canDrawingRedo}
          onWhitenWandSelection={onWhitenWandSelection}
          hasWandMask={hasWandMask}
          onContentAwareFill={onContentAwareFill}
          hasSelectionBox={hasSelectionBox}
          onAIInpaint={onAIInpaint}
        />

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
        {/* 🌟 صندوق "تنسيق النمط النشط" مع التبويبين المقسمين                         */}
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
          {/* 📄 الصفحة الأولى: تنسيق الخط والحد (مستخرج كملف منفصل)   */}
          {/* ========================================================= */}
          {styleActiveTab === 'font_style' && (
            <FontStyleTab
              fontSize={fontSize}
              setFontSize={setFontSize}
              textColor={textColor}
              setTextColor={setTextColor}
              strokeWidth={strokeWidth}
              setStrokeWidth={setStrokeWidth}
              strokeColor={strokeColor}
              setStrokeColor={setStrokeColor}
              bgColor={bgColor}
              setBgColor={setBgColor}
              bgTransparent={bgTransparent}
              setBgTransparent={setBgTransparent}
              lineHeight={lineHeight}
              setLineHeight={setLineHeight}
              tracking={tracking}
              setTracking={setTracking}
              textAlign={textAlign}
              setTextAlign={setTextAlign}
              fontFamily={fontFamily}
              setFontFamily={setFontFamily}
              allFonts={allFonts}
              favFonts={favFonts}
              handleToggleFavorite={handleToggleFavorite}
              onOpenFontManager={onOpenFontManager}
              activeStyle={activeStyle}
              onUpdateActiveStyle={onUpdateActiveStyle}
              bold={bold}
              setBold={setBold}
              italic={italic}
              setItalic={setItalic}
              underline={underline}
              setUnderline={setUnderline}
              onApplyStyleToActiveLayer={onApplyStyleToActiveLayer}
            />
          )}

          {/* ========================================================= */}
          {/* 📄 الصفحة الثانية: تدريج لون النصوص (مستخرج كملف منفصل)   */}
          {/* ========================================================= */}
          {styleActiveTab === 'gradient' && (
            <GradientEditorTab
              strokeWidth={strokeWidth}
              strokeColor={strokeColor}
              setStrokeColor={setStrokeColor}
              setStrokeWidth={setStrokeWidth}
              gradientPresets={gradientPresets}
              setGradientPresets={setGradientPresets}
              activeGradient={activeGradient}
              onApplyGradientToActiveLayer={onApplyGradientToActiveLayer}
              onCopyGradientFromActiveLayer={onCopyGradientFromActiveLayer}
              onSampleGradientFromSelection={onSampleGradientFromSelection}
              onExportGradients={onExportGradients}
              onImportGradients={onImportGradients}
              gradientColor1={gradientColor1}
              setGradientColor1={setGradientColor1}
              gradientColor2={gradientColor2}
              setGradientColor2={setGradientColor2}
              gradientAngle={gradientAngle}
              setGradientAngle={setGradientAngle}
              newPresetName={newPresetName}
              setNewPresetName={setNewPresetName}
              handleSaveGradientPreset={handleSaveGradientPreset}
            />
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
