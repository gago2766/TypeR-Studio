import React, { useEffect, useState, memo } from 'react';
import { MangaLayer, CustomFont } from '../types';
import { rgbToHex, calculateOptimalFontSizeForShape, formatFontFamily } from '../utils';

interface FloatingToolbarProps {
  activeLayer: MangaLayer | null;
  onUpdateLayer: (layerId: string, updates: Partial<MangaLayer>) => void;
  onDeleteLayer: (layerId: string) => void;
  allFonts: CustomFont[];
  favFonts: string[];
  onOpenFontManager: () => void;
  onStretchSelected?: () => void;
  onStepTatweel?: (stepCount?: number) => void;
  manualTatweelStep?: number;
  onSelectFont?: (fontFamily: string) => void;
}

export const FloatingToolbar = memo(function FloatingToolbar({
  activeLayer,
  onUpdateLayer,
  onDeleteLayer,
  allFonts,
  favFonts,
  onOpenFontManager,
  onStretchSelected,
  onStepTatweel,
  manualTatweelStep = 1,
  onSelectFont,
}: FloatingToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!activeLayer) {
      setIsVisible(false);
      return;
    }

    const updatePosition = () => {
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
      const toolbarWidth = 640;
      if (left + toolbarWidth > window.innerWidth) {
        left = window.innerWidth - toolbarWidth - 10;
      }
      if (left < 10) left = 10;

      setPosition({ top, left });
      setIsVisible(true);
    };

    updatePosition();
    const timer = setTimeout(updatePosition, 10);

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

  const handleFontChange = (newFont: string) => {
    const cleanFont = newFont.replace(/['"]/g, '').trim();
    handleStyleChange({ fontFamily: cleanFont });
    if (onSelectFont) {
      onSelectFont(cleanFont);
    }
  };

  const handleToggleFormat = (prop: 'fontWeight' | 'fontStyle' | 'textDecoration', onVal: string, offVal: string) => {
    const current = style[prop];
    handleStyleChange({
      [prop]: current === onVal ? offVal : onVal,
    });
  };

  const currentSize = parseInt(style.fontSize) || 16;

  const handleSizeChange = (amount: number) => {
    const newSize = Math.max(1, Math.min(120, currentSize + amount));
    handleStyleChange({ fontSize: `${newSize}px` });
  };

  const handleFitToBubble = () => {
    if (!activeLayer) return;
    const layerW = parseFloat(activeLayer.width) || 120;
    const layerH = parseFloat(activeLayer.height) || 80;
    const cleanTxt = activeLayer.text.replace(/\n/g, ' ').trim();
    if (!cleanTxt) return;

    // إلغاء تباعد الحروف عند حساب الكلمات العربية لضمان التحام الكشيدة
    const opt = calculateOptimalFontSizeForShape(
      cleanTxt,
      'normal_oval',
      layerW,
      layerH,
      activeLayer.style.fontFamily,
      activeLayer.style.lineHeight,
      0,
      8,
      activeLayer.lineCountOverride,
      true
    );

    onUpdateLayer(activeLayer.id, {
      text: opt.textWithBreaks,
      style: {
        ...activeLayer.style,
        fontSize: `${opt.fontSize}px`,
      },
    });
  };

  const currentCleanFont = (style.fontFamily || (allFonts[0]?.value || '')).replace(/['"]/g, '').trim().toLowerCase();

  return (
    <div
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="fixed z-[99999] flex items-center gap-1.5 bg-[#1e1e1e]/95 border border-[#3a3a3a] rounded-lg p-1.5 shadow-2xl text-xs text-gray-300 max-w-[95vw] overflow-x-auto select-none backdrop-blur-md transition-all duration-75 animate-in fade-in zoom-in-95"
    >
      <span className="text-[10px] text-gray-400 font-medium px-0.5">حجم</span>
      
      <div className="flex items-center gap-1 bg-[#2a2a2a] border border-[#444] rounded p-0.5">
        <button
          type="button"
          onClick={() => handleSizeChange(-2)}
          className="w-5 h-5 flex items-center justify-center bg-[#333] hover:bg-[#444] active:scale-95 text-gray-300 rounded font-bold transition focus:outline-none cursor-pointer text-xs"
          title="تصغير (-2px)"
        >
          −
        </button>
        <input
          type="number"
          min="1"
          max="120"
          value={parseInt(style.fontSize) || ""}
          onChange={e => {
            const rawVal = e.target.value;
            if (rawVal === '') {
              handleStyleChange({ fontSize: '' });
              return;
            }
            let valNum = parseInt(rawVal);
            if (valNum > 120) valNum = 120;
            if (valNum < 1) valNum = 1;
            handleStyleChange({ fontSize: `${valNum}px` });
          }}
          onBlur={() => {
            const size = parseInt(style.fontSize);
            if (isNaN(size) || size < 1) {
              handleStyleChange({ fontSize: '12px' });
            } else if (size > 120) {
              handleStyleChange({ fontSize: '120px' });
            }
          }}
          className="w-8 bg-transparent text-white text-xs text-center focus:outline-none border-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => handleSizeChange(2)}
          className="w-5 h-5 flex items-center justify-center bg-[#333] hover:bg-[#444] active:scale-95 text-gray-300 rounded font-bold transition focus:outline-none cursor-pointer text-xs"
          title="تكبير (+2px)"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={handleFitToBubble}
        className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold text-[11px] cursor-pointer transition flex items-center gap-1 shadow-sm"
        title="تكبير وملء الخط تلقائياً ليناسب كامل مساحة الفقاعة بنقرة واحدة"
      >
        <span>⛶ ملء</span>
      </button>

      <span className="text-[10px] text-gray-400 font-medium px-0.5">خط</span>
      <select
        value={allFonts.some(f => f.value.replace(/['"]/g, '').trim().toLowerCase() === currentCleanFont) ? allFonts.find(f => f.value.replace(/['"]/g, '').trim().toLowerCase() === currentCleanFont)?.value : (style.fontFamily || (allFonts[0]?.value || ''))}
        onChange={e => handleFontChange(e.target.value)}
        className="bg-[#2a2a2a] border border-[#444] text-white rounded px-1.5 py-0.5 text-xs max-w-[130px] focus:outline-none focus:border-[#007acc] cursor-pointer font-sans"
      >
        {allFonts.length === 0 ? (
          <option value="">لا توجد خطوط مرفوعة</option>
        ) : (
          allFonts.map(f => (
            <option 
              key={f.value} 
              value={f.value} 
              style={{ fontFamily: formatFontFamily(f.value) }}
            >
              {f.name}
            </option>
          ))
        )}
      </select>

      <button
        onClick={onOpenFontManager}
        title="مدير الخطوط"
        className="p-1 leading-none text-[#f5c518] hover:bg-[#2d2d2d] rounded transition font-medium focus:outline-none cursor-pointer"
      >
        ★
      </button>

      <span className="text-[10px] text-gray-400 font-medium px-0.5">أسطر</span>
      <select
        value={activeLayer.lineCountOverride || ""}
        onChange={e => {
          const val = e.target.value ? parseInt(e.target.value) : undefined;
          onUpdateLayer(activeLayer.id, { lineCountOverride: val });
        }}
        className="bg-[#2a2a2a] border border-[#444] text-white rounded px-1 py-0.5 text-xs focus:outline-none focus:border-[#007acc]"
      >
        <option value="">تلقائي</option>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>

      {/* زر التمديد التدريجي السريع فوق الفقاعة */}
      {onStepTatweel && (
        <button
          type="button"
          onClick={() => onStepTatweel(manualTatweelStep ?? 1)}
          className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs cursor-pointer transition flex items-center gap-0.5 select-none shadow-sm"
          title={`زيادة التمطيط بمقدار (+${manualTatweelStep ?? 1}) في كل نقرة`}
        >
          <span>ـ+ تمديد</span>
        </button>
      )}

      {onStretchSelected && (
        <button
          type="button"
          onClick={onStretchSelected}
          className="px-2 py-0.5 rounded bg-[#007acc] hover:bg-[#0062a3] text-white font-bold text-xs cursor-pointer transition flex items-center gap-1 select-none"
          title="تطبيق التمطيط اليدوي على الأسطر أو الجمل المحددة لتتساوى مع حواف الفقاعة"
        >
          <span>تحديد</span>
        </button>
      )}

      <span className="text-[10px] text-gray-400 font-medium px-0.5">لون</span>
      <input
        type="color"
        value={rgbToHex(style.color)}
        onChange={e => handleStyleChange({ color: e.target.value })}
        className="w-6 h-5 border-0 rounded cursor-pointer p-0 bg-transparent"
      />

      <span className="text-gray-700">|</span>

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
          style.textAlign === 'left' ? 'bg-[#007acc] text-[#007acc]' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
        }`}
        title="محاذاة يسار"
      >
        ⇥
      </button>

      <span className="text-gray-700">|</span>

      <button
        onClick={() => onDeleteLayer(activeLayer.id)}
        className="w-6 h-5 rounded flex items-center justify-center bg-red-800/80 hover:bg-red-700 text-white text-xs cursor-pointer transition"
        title="حذف الطبقة"
      >
        🗑
      </button>
      <button
        onClick={() => setIsVisible(false)}
        className="text-gray-600 hover:text-white text-base leading-none p-1 transition cursor-pointer"
        title="إغلاق الشريط"
      >
        ×
      </button>
    </div>
  );
});
