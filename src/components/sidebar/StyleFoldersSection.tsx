import React, { useRef, memo } from 'react';
import { StyleFolder, TextStyle } from '../../types';

interface StyleFoldersSectionProps {
  folders: StyleFolder[];
  setFolders: React.Dispatch<React.SetStateAction<StyleFolder[]>>;
  selectedStyleId: string;
  setSelectedStyleId: (id: string) => void;
  onDuplicateFolder: (folderId: string) => void;
  onExportFolder: (folderId: string) => void;
  onImportFolder: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportAllStyles?: () => void;
  onImportAllStyles?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDuplicateStyle?: (style: TextStyle, folderId: string) => void;
  onAddFolder: () => void;
  onAddStyle: () => void;
  onOpenStylesExportSelector: () => void;
  onDeleteFolder?: (folderId: string) => void;
  onEditStyle?: (style: TextStyle, folderId: string) => void;
}

export const StyleFoldersSection = memo(function StyleFoldersSection({
  folders,
  setFolders,
  selectedStyleId,
  setSelectedStyleId,
  onDuplicateFolder,
  onExportFolder,
  onImportFolder,
  onExportAllStyles,
  onImportAllStyles,
  onDuplicateStyle,
  onAddFolder,
  onAddStyle,
  onOpenStylesExportSelector,
  onDeleteFolder,
  onEditStyle,
}: StyleFoldersSectionProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const importAllInputRef = useRef<HTMLInputElement>(null);

  const toggleStyleEnabled = (folderId: string, styleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolders(prev =>
      prev.map(f => {
        if (f.id !== folderId) return f;
        return {
          ...f,
          styles: f.styles.map(s => {
            if (s.id !== styleId) return s;
            return { ...s, enabled: !s.enabled };
          }),
        };
      })
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-1 mb-2">
        <h3 className="text-xs text-white uppercase font-bold">
          مجلدات الأنماط
        </h3>
        <div className="flex gap-1">
          {onExportAllStyles && (
            <button
              onClick={onExportAllStyles}
              className="text-[9.5px] bg-[#27ae60] hover:bg-[#219653] text-white font-bold py-0.5 px-2 rounded transition cursor-pointer flex items-center gap-1 shadow-sm"
              title="مشاركة وتصدير كافة المجلدات والاستايلات بملف واحد"
            >
              <span>مشاركة الكل 📤</span>
            </button>
          )}
          {onImportAllStyles && (
            <label className="text-[9.5px] bg-[#2980b9] hover:bg-[#2471a3] text-white font-bold py-0.5 px-2 rounded transition cursor-pointer flex items-center gap-1 shadow-sm">
              <span>استيراد الكل 📥</span>
              <input
                type="file"
                accept=".json"
                onChange={onImportAllStyles}
                ref={importAllInputRef}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      <div id="folders-container" className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-0.5 scrollbar-thin">
        {folders.length === 0 ? (
          <div className="text-center text-gray-600 text-[10px] py-4 bg-[#151515] rounded border border-dashed border-[#2d2d2d]">
            لا توجد مجلدات حالياً
          </div>
        ) : (
          folders.map(folder => (
            <div key={folder.id} className="border border-[#2d2d2d] rounded bg-[#1a1a1a] overflow-hidden">
              <div className="bg-[#252525] px-2 py-1.5 text-[11px] font-bold text-gray-200 flex justify-between items-center select-none">
                <span>📂 {folder.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onDuplicateFolder(folder.id)}
                    className="text-[9px] bg-[#333] hover:bg-[#444] hover:text-white text-gray-300 py-0.5 px-1.5 rounded transition cursor-pointer"
                    title="تكرار المجلد"
                  >
                    تكرار ❐
                  </button>
                  <button
                    onClick={() => onExportFolder(folder.id)}
                    className="text-[9px] bg-[#333] hover:bg-[#444] hover:text-white text-gray-300 py-0.5 px-1.5 rounded transition cursor-pointer"
                    title="مشاركة هذا المجلد كملف"
                  >
                    مشاركة 📤
                  </button>
                  
                  {onDeleteFolder && (
                    <button
                      onClick={() => onDeleteFolder(folder.id)}
                      className="text-[9px] bg-red-950/80 border border-red-900/60 hover:bg-red-800 text-red-300 py-0.5 px-1.5 rounded transition cursor-pointer"
                      title="حذف هذا المجلد وكل محتوياته"
                    >
                      حذف 🗑️
                    </button>
                  )}
                </div>
              </div>
              <div className="p-1 flex flex-col gap-0.5 max-h-[180px] overflow-y-auto scrollbar-thin">
                {folder.styles.map(style => {
                  const isStyleEnabled = style.enabled !== false;
                  const isSelected = style.id === selectedStyleId;
                  return (
                    <div
                      key={style.id}
                      onClick={() => setSelectedStyleId(style.id)}
                      className={`flex items-center justify-between py-1 px-1.5 text-[10.5px] rounded cursor-pointer transition ${
                        isSelected ? 'bg-[#007acc] text-white shadow-sm ring-1 ring-[#0098ff]' : 'text-gray-300 hover:bg-[#2a2a2a]'
                      } ${!isStyleEnabled ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <button
                          onClick={e => toggleStyleEnabled(folder.id, style.id, e)}
                          className="text-gray-400 hover:text-white p-0.5 leading-none bg-none border-0 cursor-pointer text-xs shrink-0"
                        >
                          {isStyleEnabled ? '👁' : '👁‍عون'}
                        </button>
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block border border-[#555] shrink-0"
                          style={{ backgroundColor: style.color }}
                        />
                        <span className="truncate flex-1 text-right font-medium">
                          {style.name}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] bg-emerald-500 text-black font-extrabold px-1 py-0.2 rounded shadow-xs shrink-0">
                            ✓ نشط
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {onDuplicateStyle && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateStyle(style, folder.id);
                            }}
                            className={`text-[9px] py-0.5 px-1.5 rounded transition cursor-pointer font-bold ${
                              isSelected ? 'bg-black/30 hover:bg-black/50 text-white' : 'bg-[#2a2a2a] hover:bg-[#333] text-gray-300'
                            }`}
                            title="نسخ وتكرار هذا الستايل"
                          >
                            ❐ نسخ
                          </button>
                        )}

                        <span className="text-[8.5px] text-gray-400 bg-black/20 px-1 py-0.5 rounded leading-none">
                          [{style.tags.join(',')}]
                        </span>
                        
                        {onEditStyle && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditStyle(style, folder.id);
                            }}
                            className="text-gray-400 hover:text-white px-1 py-0.5 font-bold text-xs select-none transition"
                            title="تعديل تفاصيل وإعدادات النمط"
                          >
                            ▼
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 mt-1.5">
        <button
          onClick={onAddFolder}
          className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 px-1 rounded-lg transition select-none truncate cursor-pointer"
          id="add-folder-btn"
        >
          + مجلد
        </button>
        <button
          onClick={onAddStyle}
          className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 px-1 rounded-lg transition select-none truncate cursor-pointer"
          id="add-style-btn"
        >
          + نمط
        </button>
        <button
          onClick={onOpenStylesExportSelector}
          className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 px-1 rounded-lg transition select-none truncate cursor-pointer font-medium"
          id="export-styles-selector-btn"
          title="مشاركة أنماط مخصصة"
        >
          مشاركة مخصصة 📤
        </button>
      </div>
      <div className="grid grid-cols-1 mt-1">
        <label className="bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-[10px] py-1 rounded-lg transition select-none text-center cursor-pointer block truncate">
          استيراد مجلد فردي
          <input
            type="file"
            accept=".json"
            onChange={onImportFolder}
            ref={importInputRef}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
});
