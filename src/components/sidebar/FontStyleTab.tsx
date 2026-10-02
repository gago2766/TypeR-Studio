import React, { memo } from 'react';
import { TextStyle, CustomFont } from '../../types';

interface FontStyleTabProps {
  fontSize: string;
  setFontSize: (val: string) => void;
  textColor: string;
  setTextColor: (val: string) => void;
  strokeWidth: number;
  setStrokeWidth?: (val: number) => void;
  strokeColor: string;
  setStrokeColor?: (val: string) => void;
  bgColor: string;
  setBgColor: (val: string) => void;
  bgTransparent: boolean;
  setBgTransparent: (val: boolean) => void;
  lineHeight: number;
  setLineHeight: (val: number) => void;
  tracking: number;
  setTracking: (val: number) => void;
  textAlign: 'center' | 'left' | 'right';
  setTextAlign: (val: 'center' | 'left' | 'right') => void;
  fontFamily: string;
  setFontFamily: (val: string) => void;
  allFonts: CustomFont[];
  favFonts: string[];
  handleToggleFavorite: () => void;
  onOpenFontManager: () => void;
  activeStyle?: TextStyle | null;
  onUpdateActiveStyle?: (updates: Partial<TextStyle>) => void;
  bold: boolean;
  setBold: (val: boolean) => void;
  italic: boolean;
  setItalic: (val: boolean) => void;
  underline: boolean;
  setUnderline: (val: boolean) => void;
  onApplyStyleToActiveLayer: () => void;
}

export const FontStyleTab = memo(function FontStyleTab({
  fontSize,
  setFontSize,
  textColor,
  setTextColor,
  strokeWidth,
  setStrokeWidth,
  strokeColor,
  setStrokeColor,
  bgColor,
  setBgColor,
  bgTransparent,
  setBgTransparent,
  lineHeight,
  setLineHeight,
  tracking,
  setTracking,
  textAlign,
  setTextAlign,
  fontFamily,
  setFontFamily,
  allFonts,
  favFonts,
  handleToggleFavorite,
  onOpenFontManager,
  activeStyle,
  onUpdateActiveStyle,
  bold,
  setBold,
  italic,
  setItalic,
  underline,
  setUnderline,
  onApplyStyleToActiveLayer,
}: FontStyleTabProps) {
  return (
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
  );
});
