import React, { useRef, memo } from 'react';
import { GradientPreset, TextGradient } from '../../types';

interface GradientEditorTabProps {
  strokeWidth: number;
  strokeColor: string;
  setStrokeColor?: (val: string) => void;
  setStrokeWidth?: (val: number) => void;
  gradientPresets: GradientPreset[];
  setGradientPresets?: React.Dispatch<React.SetStateAction<GradientPreset[]>>;
  activeGradient?: TextGradient | null;
  onApplyGradientToActiveLayer?: (gradient: TextGradient | null) => void;
  onCopyGradientFromActiveLayer?: () => void;
  onSampleGradientFromSelection?: () => void;
  onExportGradients?: () => void;
  onImportGradients?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  gradientColor1: string;
  setGradientColor1: (val: string) => void;
  gradientColor2: string;
  setGradientColor2: (val: string) => void;
  gradientAngle: number;
  setGradientAngle: (val: number) => void;
  newPresetName: string;
  setNewPresetName: (val: string) => void;
  handleSaveGradientPreset: () => void;
}

export const GradientEditorTab = memo(function GradientEditorTab({
  strokeWidth,
  strokeColor,
  setStrokeColor,
  setStrokeWidth,
  gradientPresets,
  setGradientPresets,
  activeGradient,
  onApplyGradientToActiveLayer,
  onCopyGradientFromActiveLayer,
  onSampleGradientFromSelection,
  onExportGradients,
  onImportGradients,
  gradientColor1,
  setGradientColor1,
  gradientColor2,
  setGradientColor2,
  gradientAngle,
  setGradientAngle,
  newPresetName,
  setNewPresetName,
  handleSaveGradientPreset,
}: GradientEditorTabProps) {
  const importGradientsInputRef = useRef<HTMLInputElement>(null);

  return (
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

      {/* 🌟 شبكة مربعات الاستايلات والتدريجات الاحترافية */}
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
  );
});
