import React from 'react';
import { MangaLayer, CustomFont } from '../types';
import { rgbToHex } from '../utils';

interface LayersPanelProps {
  // Layers state
  layers: MangaLayer[];
  activeLayer: MangaLayer | null;
  onSetActiveLayer: (layer: MangaLayer | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<MangaLayer>) => void;
  onDeleteLayer: (layerId: string) => void;

  // History system triggers
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Magic wand tracking
  hasWandMask: boolean;
  onCancelWandSelection: () => void;

  // Multi-bubble selection status
  multiBubbleMode: boolean;
  bubbleQueueCount: number;
  onClearBubbleQueue: () => void;
  onApplyBubbleQueue: () => void;
  onWhitenBubbleQueue: () => void; // إضافة بروب دالة التبييض الجماعي للفقاعات المحددة

  // All loaded fonts
  allFonts: CustomFont[];

  // 📥 دالة دمج الطبقات مع الصورة الخلفية
  onMergeLayers: () => void;
}

export function LayersPanel({
  layers,
  activeLayer,
  onSetActiveLayer,
  onUpdateLayer,
  onDeleteLayer,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasWandMask,
  onCancelWandSelection,
  multiBubbleMode,
  bubbleQueueCount,
  onClearBubbleQueue,
  onApplyBubbleQueue,
  onWhitenBubbleQueue, // استقبال الدالة الجديدة هنا
  allFonts,
  onMergeLayers, // 👈 استقبال الدالة الجديدة لدمج الطبقات
}: LayersPanelProps) {
  const styles = activeLayer?.style;

  const handleStyleChange = (updates: Partial<typeof styles>) => {
    if (!activeLayer || !styles) return;
    onUpdateLayer(activeLayer.id, {
      style: {
        ...styles,
        ...updates,
      },
    });
  };

  const handleToggleFormat = (prop: 'fontWeight' | 'fontStyle' | 'textDecoration', onVal: string, offVal: string) => {
    if (!styles) return;
    handleStyleChange({
      [prop]: styles[prop] === onVal ? offVal : onVal,
    });
  };

  const handleSizeChange = (amount: number) => {
    if (!styles) return;
    const currentSize = parseFloat(styles.fontSize) || 16;
    const newSize = Math.max(1, Math.min(100, currentSize + amount));
    handleStyleChange({
      fontSize: `${newSize}px`,
    });
  };

  return (
    <div
      id="layers-panel"
      className="w-full h-40 min-h-[100px] max-h-[280px] bg-[#161616] border-t border-[#2a2a2a] flex flex-col shrink-0 z-9 select-none"
      dir="rtl"
    >
      {/* Horizontal Header */}
      <div className="px-3 py-1.5 border-b border-[#2a2a2a] flex items-center gap-3 shrink-0 bg-[#131313] text-right">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          🗂 الطبقات
        </span>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="text-gray-300 hover:text-white px-2 py-0.5 rounded text-xs bg-[#222] border border-[#333] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="تراجع Ctrl+Z"
        >
          ↩ تراجع
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="text-gray-300 hover:text-white px-2 py-0.5 rounded text-xs bg-[#222] border border-[#333] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="إعادة Ctrl+Y"
        >
          ↪ إعادة
        </button>

        <span className="text-gray-800">│</span>

        {/* 📥 زر دمج الطبقات الفوري مع الخلفية */}
        <button
          onClick={onMergeLayers}
          className="text-white bg-teal-700 hover:bg-teal-600 border border-teal-800 px-2 py-0.5 rounded text-xs transition font-bold cursor-pointer"
          title="دمج جميع طبقات النصوص الحالية بشكل دائم لتصبح جزءاً من صورة المانجا"
        >
          📥 دمج الطبقات
        </button>

        <span className="text-gray-800">│</span>

        {/* Selected Bubble Wand Indicator */}
        {hasWandMask && (
          <div id="wand-status-bar" className="flex items-center gap-2">
            <span className="text-[10px] text-red-400 font-bold">✦ فقاعة محددة بالعصا</span>
            <button
              onClick={onCancelWandSelection}
              className="bg-red-800/80 hover:bg-red-700 text-white rounded px-2 py-0.5 text-[10px] cursor-pointer font-medium transition"
              id="wand-cancel-btn"
            >
              ✕ إلغاء
            </button>
          </div>
        )}

        {/* Multi-bubble Selection Queue Bar */}
        {multiBubbleMode && bubbleQueueCount > 0 && (
          <div className="flex items-center gap-3 bg-[#0d1a0d] border border-[#1a3a1a] rounded px-2.5 py-0.5 text-[10px] text-green-400">
            <span>صف الفقاعات النشطة: {bubbleQueueCount} فقاعة محددة</span>
            <div className="flex gap-1.5">
              <button
                onClick={onApplyBubbleQueue}
                className="bg-green-700 hover:bg-green-600 text-white rounded px-2 py-0.5 font-bold transition"
                id="multi-bubble-queue-btn"
              >
                تطبيق الكل
              </button>
              {/* 🧼 زر تبييض جميع الفقاعات المحددة دفعة واحدة بشكل جماعي وسريع */}
              <button
                onClick={onWhitenBubbleQueue}
                className="bg-blue-700 hover:bg-blue-600 text-white rounded px-2 py-0.5 font-bold transition"
                id="multi-bubble-whiten-btn"
              >
                تبييض الكل 🧼
              </button>
              <button
                onClick={onClearBubbleQueue}
                className="bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded px-1.5 py-0.5 transition"
                id="wand-clear-queue-btn"
              >
                مسح
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid horizontal layers display list */}
      <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
        <div
          id="layers-list"
          className="flex-1 overflow-x-auto overflow-y-hidden flex flex-row items-center gap-1.5 p-2 bg-[#151515] scrollbar-thin scrollbar-thumb-gray-800"
        >
          {/* 🖼️ الطبقة الثابتة والأساسية الممثلة للصورة الأصلية */}
          <div
            onClick={() => onSetActiveLayer(null)}
            className={`flex flex-col items-center gap-1.5 p-2 border rounded-md text-[10px] text-gray-300 cursor-pointer select-none transition shrink-0 w-22 h-[75px] justify-between ${
              activeLayer === null
                ? 'bg-[#122619] text-green-300 border-green-700'
                : 'bg-[#1e1e1e] border-[#252525] hover:bg-[#252525] hover:border-[#3a3a3a]'
            }`}
            title="الصورة الأصلية للمانجا"
          >
            <div className="w-14 h-9 bg-[#111] border border-[#2d2d2d] rounded overflow-hidden flex items-center justify-center p-0.5 text-[6.5px] text-center font-bold text-gray-500">
              🖼️ خلفية المانجا
            </div>
            <span className="w-full text-center truncate text-[9.5px] px-0.5 font-bold text-gray-400">
              الخلفية الأصلية
            </span>
            <div className="flex gap-1 justify-center items-center w-full mt-0.5 text-gray-500 text-[9px]">
              <span>🔒 قفل أساسي</span>
            </div>
          </div>

          {/* طبقات النصوص المحررة من قبل المستخدم */}
          {layers.length > 0 && (
            [...layers].reverse().map(layer => {
              const isActive = activeLayer?.id === layer.id;
              const textContent = layer.text || '—';
              return (
                <div
                  key={layer.id}
                  onClick={() => onSetActiveLayer(layer)}
                  className={`flex flex-col items-center gap-1.5 p-2 border rounded-md text-[10px] text-gray-300 cursor-pointer select-none transition shrink-0 w-22 h-[75px] justify-between ${
                    isActive
                      ? 'bg-[#0d2a40] text-white border-[#007acc]'
                      : 'bg-[#1e1e1e] border-[#252525] hover:bg-[#252525] hover:border-[#3a3a3a]'
                  } ${layer.hidden ? 'opacity-40' : ''}`}
                >
                  <div
                    style={{
                      fontFamily: layer.style.fontFamily,
                      color: layer.style.color,
                    }}
                    className="w-14 h-9 bg-[#252525] border border-[#333] rounded overflow-hidden flex items-center justify-center p-0.5 text-[6px] text-center font-bold break-all leading-relaxed"
                  >
                    {textContent.slice(0, 8)}
                  </div>
                  <span className="w-full text-center truncate text-[9.5px] px-0.5 font-medium" title={textContent}>
                    {textContent}
                  </span>
                  <div className="flex gap-1.5 justify-center w-full mt-0.5 select-none" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onUpdateLayer(layer.id, { hidden: !layer.hidden })}
                      className="text-[11px] text-gray-500 hover:text-[#7bc8f0] p-0.5 transition leading-none focus:outline-none"
                    >
                      {layer.hidden ? '🙈' : '👁'}
                    </button>
                    <button
                      onClick={() => onDeleteLayer(layer.id)}
                      className="text-[11px] text-gray-500 hover:text-red-500 p-0.5 transition leading-none focus:outline-none"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected layer edit row */}
        {activeLayer && styles && (
          <div
            id="layer-editor-panel"
            className="px-3 py-1 bg-[#111] border-t border-[#2a2a2a] flex items-center gap-4 text-xs overflow-x-auto select-none shrink-0"
          >
            {/* Font size adjustments with 1-100 limits */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 shrink-0 select-none">حجم</span>
              <input
                type="number"
                min="1"
                max="100"
                value={parseInt(styles.fontSize) || ""}
                onChange={e => {
                  const rawVal = e.target.value;
                  if (rawVal === '') {
                    handleStyleChange({ fontSize: '' });
                    return;
                  }
                  let valNum = parseInt(rawVal);
                  if (valNum > 100) valNum = 100;
                  if (valNum < 1) valNum = 1;
                  handleStyleChange({ fontSize: `${valNum}px` });
                }}
                onBlur={() => {
                  const size = parseInt(styles.fontSize);
                  if (isNaN(size) || size < 1) {
                    handleStyleChange({ fontSize: '1px' });
                  } else if (size > 100) {
                    handleStyleChange({ fontSize: '100px' });
                  }
                }}
                className="w-12 bg-[#1e1e1e] border border-[#333] text-white rounded text-center text-[10px] py-0.5 focus:outline-none"
                id="le-size"
              />
              <button
                onClick={() => handleSizeChange(-1)}
                className="bg-[#222] border border-[#333] text-gray-300 hover:bg-[#2d2d2d] rounded px-1.5 focus:outline-none font-bold cursor-pointer"
                id="le-size-down"
              >
                −
              </button>
              <button
                onClick={() => handleSizeChange(1)}
                className="bg-[#222] border border-[#333] text-gray-300 hover:bg-[#2d2d2d] rounded px-1.5 focus:outline-none font-bold cursor-pointer"
                id="le-size-up"
              >
                +
              </button>
            </div>

            {/* Font Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 shrink-0">خط</span>
              <select
                value={styles.fontFamily}
                onChange={e => handleStyleChange({ fontFamily: e.target.value })}
                className="bg-[#1e1e1e] border border-[#333] text-white rounded text-[10px] px-1 py-0.5 max-w-[100px] outline-none"
                id="le-font"
              >
                {allFonts.map(f => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Hex Color Picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 shrink-0">لون</span>
              <input
                type="color"
                value={rgbToHex(styles.color)}
                onChange={e => handleStyleChange({ color: e.target.value })}
                className="w-7 h-5 border-0 rounded cursor-pointer p-0 bg-transparent"
                id="le-color"
              />
            </div>

            {/* Bold, Italic, Underline */}
            <div className="flex gap-1">
              <button
                onClick={() => handleToggleFormat('fontWeight', 'bold', 'normal')}
                className={`w-6 h-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer transition ${
                  styles.fontWeight === 'bold' ? 'bg-[#007acc] text-white active' : 'bg-[#222] border border-[#333] text-gray-400 hover:bg-[#2a2a2a]'
                }`}
                id="le-bold"
              >
                B
              </button>
              <button
                onClick={() => handleToggleFormat('fontStyle', 'italic', 'normal')}
                className={`w-6 h-5 rounded flex items-center justify-center italic text-xs cursor-pointer transition ${
                  styles.fontStyle === 'italic' ? 'bg-[#007acc] text-white active' : 'bg-[#222] border border-[#333] text-gray-400 hover:bg-[#2a2a2a]'
                }`}
                id="le-italic"
              >
                I
              </button>
              <button
                onClick={() => handleToggleFormat('textDecoration', 'underline', 'none')}
                className={`w-6 h-5 rounded flex items-center justify-center underline text-xs cursor-pointer transition ${
                  styles.textDecoration === 'underline' ? 'bg-[#007acc] text-white active' : 'bg-[#222] border border-[#333] text-gray-400 hover:bg-[#2a2a2a]'
                }`}
                id="le-underline"
              >
                U
              </button>
            </div>

            {/* Alignment Toggles */}
            <div className="flex gap-1">
              <button
                onClick={() => handleStyleChange({ textAlign: 'right' })}
                className={`w-6 h-5 rounded flex items-center justify-center text-xs cursor-pointer transition ${
                  styles.textAlign === 'right' ? 'bg-[#007acc] text-white active' : 'bg-[#222] border border-[#333] text-gray-300 hover:bg-[#2a2a2a]'
                }`}
                title="يمين"
              >
                ⇤
              </button>
              <button
                onClick={() => handleStyleChange({ textAlign: 'center' })}
                className={`w-6 h-5 rounded flex items-center justify-center text-xs cursor-pointer transition ${
                  styles.textAlign === 'center' ? 'bg-[#007acc] text-white active' : 'bg-[#222] border border-[#333] text-gray-300 hover:bg-[#2a2a2a]'
                }`}
                title="وسط"
              >
                ≡
              </button>
              <button
                onClick={() => handleStyleChange({ textAlign: 'left' })}
                className={`w-6 h-5 rounded flex items-center justify-center text-xs cursor-pointer transition ${
                  styles.textAlign === 'left' ? 'bg-[#007acc] text-white active' : 'bg-[#222] border border-[#333] text-gray-300 hover:bg-[#2a2a2a]'
                }`}
                title="يسار"
              >
                ⇥
              </button>
            </div>

            {/* Layer text editing */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
              <span className="text-[10px] text-gray-400 shrink-0">نص</span>
              <input
                type="text"
                value={activeLayer.text}
                onChange={e => onUpdateLayer(activeLayer.id, { text: e.target.value })}
                className="flex-1 bg-[#1e1e1e] border border-[#333] text-white rounded text-[11px] px-2 py-0.5 focus:outline-none focus:border-[#007acc]"
                id="le-text"
                dir="auto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
