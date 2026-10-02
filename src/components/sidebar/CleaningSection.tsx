import React, { memo } from 'react';

interface CleaningSectionProps {
  activeTool: 'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand' | 'pen';
  setActiveTool: (tool: 'marquee' | 'magic_wand' | 'brush' | 'eraser' | 'clone_stamp' | 'color_picker' | 'zoom' | 'hand' | 'pen') => void;
  brushColor: string;
  setBrushColor: (val: string) => void;
  brushSize: number;
  setBrushSize: (val: number) => void;
  stampSource: { x: number; y: number } | null;
  setStampSource: (val: { x: number; y: number } | null) => void;
  isSettingStampSource: boolean;
  setIsSettingStampSource: (val: boolean) => void;
  onDrawingUndo?: () => void;
  onDrawingRedo?: () => void;
  canDrawingUndo: boolean;
  canDrawingRedo: boolean;
  onWhitenWandSelection?: () => void;
  hasWandMask: boolean;
  onContentAwareFill?: () => void;
  hasSelectionBox: boolean;
  onAIInpaint?: () => void;
}

export const CleaningSection = memo(function CleaningSection({
  activeTool,
  setActiveTool,
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  stampSource,
  setStampSource,
  isSettingStampSource,
  setIsSettingStampSource,
  onDrawingUndo,
  onDrawingRedo,
  canDrawingUndo,
  canDrawingRedo,
  onWhitenWandSelection,
  hasWandMask,
  onContentAwareFill,
  hasSelectionBox,
  onAIInpaint,
}: CleaningSectionProps) {
  return (
    <div>
      <h3 className="text-xs text-white uppercase font-bold mb-1.5 border-b border-[#2d2d2d] pb-1">
        أدوات التبييض والتنظيف (Cleaning)
      </h3>
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <button
          onClick={() => setActiveTool('brush')}
          className={`text-[11px] py-1.5 px-2 rounded font-medium transition flex items-center justify-center gap-1.5 select-none cursor-pointer ${
            activeTool === 'brush'
              ? 'bg-[#007acc] text-white font-bold'
              : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
          }`}
        >
          <span>🖌️ الفرشاة</span>
        </button>
        <button
          onClick={() => setActiveTool('eraser')}
          className={`text-[11px] py-1.5 px-2 rounded font-medium transition flex items-center justify-center gap-1.5 select-none cursor-pointer ${
            activeTool === 'eraser'
              ? 'bg-[#007acc] text-white font-bold'
              : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
          }`}
        >
          <span>🧼 الممحاة</span>
        </button>
        <button
          onClick={() => setActiveTool('clone_stamp')}
          className={`text-[11px] py-1.5 px-2 rounded font-medium transition flex items-center justify-center gap-1.5 select-none cursor-pointer ${
            activeTool === 'clone_stamp'
              ? 'bg-[#007acc] text-white font-bold'
              : 'bg-[#2d2d2d] border border-[#3c3c3c] text-gray-300 hover:bg-[#3d3d3d]'
          }`}
        >
          <span>🎯 الختم</span>
        </button>
        <button
          onClick={() => setActiveTool('color_picker')}
          className={`text-[11px] py-1.5 px-2 rounded font-medium transition flex items-center justify-center gap-1.5 select-none cursor-pointer ${
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
                  className={`w-4 h-4 rounded bg-white border border-[#555] cursor-pointer ${brushColor === '#ffffff' ? 'ring-2 ring-[#007acc]' : ''}`}
                />
                <button
                  onClick={() => setBrushColor('#000000')}
                  className={`w-4 h-4 rounded bg-black border border-[#555] cursor-pointer ${brushColor === '#000000' ? 'ring-2 ring-[#007acc]' : ''}`}
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
                className={`w-full py-1 text-[10px] rounded font-bold transition cursor-pointer ${
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
  );
});
