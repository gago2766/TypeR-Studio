import React, { memo } from 'react';

interface TatweelSectionProps {
  tatweelStrength: number;
  setTatweelStrength: (val: number) => void;
  tatweelMargin: number;
  setTatweelMargin: (val: number) => void;
  manualTatweelStep?: number;
  setManualTatweelStep?: (val: number) => void;
  onStepTatweel?: (stepCount?: number) => void;
  tatweelPreviewText: string;
  fontFamily: string;
  onApplyTatweel: () => void;
  onRemoveAllTatweel?: () => void;
  onUndoTatweel: () => void;
}

export const TatweelSection = memo(function TatweelSection({
  tatweelStrength,
  setTatweelStrength,
  tatweelMargin,
  setTatweelMargin,
  manualTatweelStep = 1,
  setManualTatweelStep,
  onStepTatweel,
  tatweelPreviewText,
  fontFamily,
  onApplyTatweel,
  onRemoveAllTatweel,
  onUndoTatweel,
}: TatweelSectionProps) {
  return (
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
  );
});
