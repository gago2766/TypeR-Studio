import React, { memo } from 'react';

interface GuidesOverlayProps {
  dragState: any;
  guides: {
    vertical: number | null;
    horizontal: number | null;
    bounds: { left: number; top: number; right: number; bottom: number } | null;
  };
}

export const GuidesOverlay = memo(function GuidesOverlay({
  dragState,
  guides,
}: GuidesOverlayProps) {
  if (!dragState || !guides.bounds) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      <div
        style={{
          left: `${guides.bounds.left}px`,
          top: `${guides.bounds.top}px`,
          width: `${guides.bounds.right - guides.bounds.left}px`,
          height: `${guides.bounds.bottom - guides.bounds.top}px`,
        }}
        className="absolute border border-dashed border-[#8e44ad]/40"
      />
      {guides.vertical !== null && (
        <div
          style={{
            left: `${guides.vertical}px`,
            top: `${guides.bounds.top}px`,
            height: `${guides.bounds.bottom - guides.bounds.top}px`,
          }}
          className="absolute border-l border-dashed border-[#007acc] w-0 -translate-x-1/2 flex items-center justify-center before:content-[''] before:w-1.5 before:h-1.5 before:bg-[#007acc] before:rounded-full after:content-[''] after:w-1.5 after:h-1.5 after:bg-[#007acc] after:rounded-full after:absolute after:bottom-0"
        />
      )}
      {guides.horizontal !== null && (
        <div
          style={{
            top: `${guides.horizontal}px`,
            left: `${guides.bounds.left}px`,
            width: `${guides.bounds.right - guides.bounds.left}px`,
          }}
          className="absolute border-t border-dashed border-[#007acc] h-0 -translate-y-1/2 flex items-center justify-center before:content-[''] before:w-1.5 before:h-1.5 before:bg-[#007acc] before:rounded-full before:absolute before:left-0 after:content-[''] after:w-1.5 after:h-1.5 after:bg-[#007acc] after:rounded-full after:absolute after:right-0"
        />
      )}
    </div>
  );
});
