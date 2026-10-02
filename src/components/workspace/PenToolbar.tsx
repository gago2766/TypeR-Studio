import React, { memo } from 'react';

interface PenToolbarProps {
  penPointsCount: number;
  onFinalizePath: (isClosed: boolean) => void;
  onClearPoints: () => void;
}

export const PenToolbar = memo(function PenToolbar({
  penPointsCount,
  onFinalizePath,
  onClearPoints,
}: PenToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#1e1e1e]/95 border border-[#3c3c3c] rounded-lg px-3 py-2 flex items-center gap-3 z-50 shadow-2xl select-none">
      <span className="text-xs font-bold text-white flex items-center gap-1.5">
        ✒️ أداة القلم النشطة
      </span>
      <div className="w-[1px] h-4 bg-gray-700" />
      <button
        type="button"
        onClick={() => onFinalizePath(false)}
        disabled={penPointsCount < 2}
        className="bg-[#007acc] hover:bg-[#0062a3] text-white disabled:opacity-40 disabled:cursor-not-allowed rounded px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
      >
        ✓ رسم المسار
      </button>
      <button
        type="button"
        onClick={() => onFinalizePath(true)}
        disabled={penPointsCount < 3}
        className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
      >
        ☖ مسار مغلق (تعبئة)
      </button>
      <button
        type="button"
        onClick={onClearPoints}
        disabled={penPointsCount === 0}
        className="bg-red-800/80 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded px-2 py-1 text-[11px] font-bold transition cursor-pointer"
      >
        ✕ مسح
      </button>
    </div>
  );
});
