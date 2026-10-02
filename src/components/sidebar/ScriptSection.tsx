import React, { memo } from 'react';
import { ProcessedLine, StyleFolder, TextStyle } from '../../types';

interface ScriptSectionProps {
  scriptInput: string;
  setScriptInput: (script: string) => void;
  parsedLines: ProcessedLine[];
  currentLineIndex: number;
  onSelectLine: (index: number) => void;
  folders: StyleFolder[];
}

export const ScriptSection = memo(function ScriptSection({
  scriptInput,
  setScriptInput,
  parsedLines,
  currentLineIndex,
  onSelectLine,
  folders,
}: ScriptSectionProps) {
  return (
    <div>
      <h3 className="text-xs text-white uppercase font-bold mb-1 border-b border-[#2d2d2d] pb-1">
        النص المترجم
      </h3>
      <textarea
        id="script-input"
        className="w-full h-24 bg-[#2d2d2d] border border-[#2d2d2d] text-white rounded p-1.5 text-xs font-sans outline-none resize-none focus:border-[#007acc] placeholder-gray-500"
        placeholder="أدخل النص المترجم هنا..."
        value={scriptInput}
        onChange={e => setScriptInput(e.target.value)}
      />

      <h3 className="text-xs text-white uppercase font-bold mt-3 mb-1 border-b border-[#2d2d2d] pb-1">
        الأسطر المعالجة
      </h3>
      <div
        id="lines-container"
        className="border border-[#2d2d2d] bg-[#151515] rounded max-h-[140px] overflow-y-auto pr-0.5"
      >
        {parsedLines.length === 0 ? (
          <div className="p-4 text-center text-gray-600 text-[10px]">
            الصق النص أعلاه للبدء
          </div>
        ) : (
          parsedLines.map((line, idx) => {
            const isActive = idx === currentLineIndex;

            let lineStyle: TextStyle | null = null;
            folders.forEach(f => {
              if (!lineStyle) {
                lineStyle = f.styles.find(s => s.tags.includes(line.styleKey) && s.enabled) || null;
              }
            });

            return (
              <div
                key={idx}
                onClick={() => onSelectLine(idx)}
                style={{
                  borderRight: lineStyle?.tagColor ? `4px solid ${lineStyle.tagColor}` : undefined
                }}
                className={`flex items-center justify-between py-1.5 px-2.5 text-[11px] border-b border-[#222] cursor-pointer selection:bg-transparent ${
                  isActive ? 'bg-[#094771] text-white font-medium' : 'text-gray-300 hover:bg-[#252525]'
                } ${line.isIgnored ? 'text-gray-600 line-through bg-[#0e0e0e]/50' : ''}`}
              >
                <span className="truncate pl-2">
                  {idx + 1}. {line.text}
                </span>
                {line.styleKey !== 'default' && !line.isIgnored && (
                  <span className="text-[8px] bg-[#333] text-gray-400 px-1 py-0.5 rounded leading-none">
                    {line.styleKey}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
