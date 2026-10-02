import React, { memo } from 'react';

interface WatermarkOverlayProps {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  image: string | null;
  opacity: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: number;
}

export const WatermarkOverlay = memo(function WatermarkOverlay({
  enabled,
  type,
  text,
  image,
  opacity,
  position,
  size,
}: WatermarkOverlayProps) {
  if (!enabled) return null;

  return (
    <div
      style={{
        opacity,
        fontSize: `${size}px`,
        transition: 'all 0.2s',
      }}
      className={`absolute pointer-events-none select-none z-[12] ${
        position === 'top-left'
          ? 'top-4 left-4'
          : position === 'top-right'
          ? 'top-4 right-4'
          : position === 'bottom-left'
          ? 'bottom-4 left-4'
          : 'bottom-4 right-4'
      }`}
    >
      {type === 'text' ? (
        <span
          style={{
            fontFamily: 'Tahoma, sans-serif',
            textShadow:
              '1px 1px 3px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.8), 1px -1px 3px rgba(0,0,0,0.8), -1px 1px 3px rgba(0,0,0,0.8)',
          }}
          className="text-white font-bold tracking-wide whitespace-nowrap block"
        >
          {text}
        </span>
      ) : (
        image && (
          <img
            src={image}
            style={{
              width: `${size * 4}px`,
              height: 'auto',
            }}
            className="object-contain block max-w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
            alt="Watermark logo"
          />
        )
      )}
    </div>
  );
});
