import React, { useEffect, useState } from 'react';
import { MangaLayer, CustomFont } from '../types';
import { rgbToHex } from '../utils';

interface FloatingToolbarProps {
  activeLayer: MangaLayer | null;
  onUpdateLayer: (layerId: string, updates: Partial<MangaLayer>) => void;
  onDeleteLayer: (layerId: string) => void;
  allFonts: CustomFont[];
  favFonts: string[]; // 👈 إضافة خاصية الخطوط المفضلة المستقبلة من App.tsx
  onOpenFontManager: () => void;
}

export function FloatingToolbar({
  activeLayer,
  onUpdateLayer,
  onDeleteLayer,
  allFonts,
  favFonts, // 👈 فك حزمة الخاصية الجديدة هنا
  onOpenFontManager,
}: FloatingToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Update floating positions based on active layer DOM bounding rect
  useEffect(() => {
    if (!activeLayer) {
      setIsVisible(false);
      return;
    }

    const updatePosition = () => {
      // Find the active layer element in DOM
      const domEl = document.getElementById(`layer-${activeLayer.id}`);
      if (!domEl) {
        setIsVisible(false);
        return;
      }

      const rect = domEl.getBoundingClientRect();
      let top = rect.top - 54;
      if (top < 10) {
        top = rect.bottom + 8;
      }

      let left = rect.left;
      const toolbarWidth = 480; // approximate width
      if (left + toolbarWidth > window.innerWidth) {
        left = window.innerWidth - toolbarWidth - 10;
      }
      if (left < 10) left = 10;

      setPosition({ top, left });
      setIsVisible(true);
    };

    updatePosition();
    // Re-check positions slightly delayed to account for rendering & dragging updates
    const timer = setTimeout(updatePosition, 10);

    // Coordinate with window resizing
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
    };
  }, [activeLayer, activeLayer?.left, activeLayer?.top, activeLayer?.width, activeLayer?.height]);

  if (!activeLayer || !position || !isVisible) return null;

  const style = activeLayer.style;

  const handleStyleChange = (updates: Partial<typeof style>) => {
    onUpdateLayer(activeLayer.id, {
      style: {
        ...style,
        ...updates,
      },
    });
  };

  const handleToggleFormat = (prop: 'fontWeight' | 'fontStyle' | 'textDecoration', onVal: string, offVal: string) => {
    const current = style[prop];
    handleStyleChange({
      [prop]: current === onVal ? offVal : onVal,
    });
  };

  // 🎯 فلترة الخطوط لإظهار المفضلة فقط مع إبقاء خط الفقاعة النشط حالياً لتجنب الاختيار التلقائي العشوائي
  const filteredFonts = favFonts && favFonts.length > 0
    ? allFonts.filter(f => favFonts.includes(f.value) || f.value === style.fontFamily)
    : allFonts;

  return (
    <div
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="fixed z-[99999] flex items-center gap-2 bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg p-1.5 shadow-2xl text-xs text-gray-300 max-w-[95vw] overflow-x-auto select-none backdrop-blur-md transition-all duration-75 animate-in fade-in zoom-in-95 duration-100"
    >
      <span className="text-[10px] text-gray-400 font-medium px-1">حجم</span>
      <input
        type="number"
        min="6"
        max="120"
        value={parseInt(style.fontSize) || 16}
        onChange={e => {
          const val = e.target.value ? `${e.target.value}px` : '16px';
          handleStyleChange({ fontSize: val });
        }}
        className="w-12 bg-[#2a2a2a] border border-[#444] text-white rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:border-[#007acc]"
      />

      <span className="text-[10px] text-gray-400 font-medium px-0.5">خط</span>
      <select
        value={style.fontFamily}
        onChange={e => handleStyleChange({ fontFamily: e.target.value })}
        className="bg-[#2a2a2a] border border-[#444] text-white rounded px-1.5 py-0.5 text-xs max-w-[100px] focus:outline-none focus:border-[#007acc]"
      >
        {filteredFonts.map(f => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
            {f.name}
          </option>
        ))}
      </select>

      <button
        onClick={onOpenFontManager}
        title="مدير الخطوط"
        className="p-1 leading-none text-[#f5c518] hover:bg-[#2d2d2d] rounded transition font-medium focus:outline-none"
      >
        ★
      </button>

      <span className="text-[10px] text-gray-400 font-medium px-0.5">لون</span>
      <input
        type="color"
        value={rgbToHex(style.color)}
        onChange={e => handleStyleChange({ color: e.target.value })}
        className="w-7 h-5 border-0 rounded cursor-pointer p-0 bg-transparent"
      />

      <span className="text-gray-700">|</span>

      {/* Bold, Italic, Underline */}
      <button
        onClick={() => handleToggleFormat('fontWeight', 'bold', 'normal')}
        className={`w-6 h-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer transition ${
          style.fontWeight === 'bold' ? 'bg-[#007acc] text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
        }`}
      >
        B
      </button>
      <button
        onClick={() => handleToggleFormat('fontStyle', 'italic', 'normal')}
        className={`w-6 h-5 rounded flex items-center justify-center italic text-xs cursor-pointer transition ${
          style.fontStyle === 'italic' ? 'bg-[#007acc] text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
        }`}
      >
        I
      </button>
      <button
        onClick={() => handleToggleFormat('textDecoration', 'underline', 'none')}
        className={`w-6 h-5 rounded flex items-center justify-center underline text-xs cursor-pointer transition ${
          style.textDecoration === 'underline' ? 'bg-[#007acc] text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
        }`}
      >
        U
      </button>

      <span className="text-gray-700">|</span>

      {/* Alignments */}
      <button
        onClick={() => handleStyleChange({ textAlign: 'right' })}
        className={`w-6 h-5 rounded flex items-center justify-center text-xs cursor-pointer transition ${
          style.textAlign === 'right' ? 'bg-[#007acc] text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
        }`}
        title="محاذاة يمين"
      >
        ⇤
      </button>
      <button
        onClick={() => handleStyleChange({ textAlign: 'center' })}
        className={`w-6 h-5 rounded flex items-center justify-center text-xs cursor-pointer transition ${
          style.textAlign === 'center' ? 'bg-[#007acc] text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
        }`}
        title="محاذاة وسط"
      >
        ≡
      </button>
      <button
        onClick={() => handleStyleChange({ textAlign: 'left' })}
        className={`w-6 h-5 rounded flex items-center justify-center text-xs cursor-pointer transition ${
          style.textAlign === 'left' ? 'bg-[#007acc] text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
        }`}
        title="محاذاة يسار"
      >
        ⇥
      </button>

      <span className="text-gray-700">|</span>

      {/* Delete / Close */}
      <button
        onClick={() => onDeleteLayer(activeLayer.id)}
        className="w-6 h-5 rounded flex items-center justify-center bg-red-800/80 hover:bg-red-700 text-white text-xs cursor-pointer transition"
        title="حذف الطبقة"
      >
        🗑
      </button>
      <button
        onClick={() => setIsVisible(false)}
        className="text-gray-600 hover:text-white text-base leading-none p-1 transition"
        title="إغلاق الشريط"
      >
        ×
      </button>
    </div>
  );
}

