import React, { memo } from 'react';
import { StyleFolder, TextStyle } from '../../types';

interface ExportSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: StyleFolder[];
  checkedStylesForExport: string[];
  setCheckedStylesForExport: React.Dispatch<React.SetStateAction<string[]>>;
  onShareFile: (content: string, filename: string, title: string) => void;
  addToast: (msg: string, type?: 'error' | 'success') => void;
}

export const ExportSelectorModal = memo(function ExportSelectorModal({
  isOpen,
  onClose,
  folders,
  checkedStylesForExport,
  setCheckedStylesForExport,
  onShareFile,
  addToast,
}: ExportSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 z-[100000] flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-5 w-full max-w-sm text-right flex flex-col gap-4">
        <h3 className="text-sm font-bold text-white border-b border-[#2d2d2d] pb-2 flex items-center gap-1.5 justify-end">
          <span>📤 مشاركة الأنماط المنسقة</span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const allIds: string[] = [];
              folders.forEach(f => f.styles.forEach(s => allIds.push(s.id)));
              setCheckedStylesForExport(allIds);
            }}
            className="bg-[#2d2d2d] text-white py-1 px-2.5 rounded text-[10px] cursor-pointer"
          >
            تحديد الكل
          </button>
          <button
            onClick={() => setCheckedStylesForExport([])}
            className="bg-[#2d2d2d] text-white py-1 px-2.5 rounded text-[10px] cursor-pointer"
          >
            إلغاء الكل
          </button>
        </div>
        <div className="bg-[#151515] border border-[#2d2d2d] rounded max-h-[160px] overflow-y-auto p-1 text-xs">
          {folders.flatMap(f => f.styles).map(s => {
            const isChecked = checkedStylesForExport.includes(s.id);
            return (
              <label key={s.id} className="flex items-center gap-2.5 p-1.5 hover:bg-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    if (isChecked) {
                      setCheckedStylesForExport(prev => prev.filter(x => x !== s.id));
                    } else {
                      setCheckedStylesForExport(prev => [...prev, s.id]);
                    }
                  }}
                  className="accent-[#007acc]"
                />
                <span className="text-gray-300 truncate">{s.name}</span>
              </label>
            );
          })}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              let stylesToExport: TextStyle[] = [];
              folders.forEach(f => {
                f.styles.forEach(s => {
                  if (checkedStylesForExport.includes(s.id)) stylesToExport.push(s);
                });
              });
              if (stylesToExport.length === 0) {
                addToast('اختر نمطاً واحداً على الأقل للمشاركة', 'error');
                return;
              }
              const jsonStr = JSON.stringify(stylesToExport, null, 2);
              onShareFile(jsonStr, "custom-styles.json", "مشاركة أنماط نصوص تايبر");
              onClose();
            }}
            className="bg-[#007acc] text-white py-1 px-4 rounded text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-[#0062a3]"
          >
            <span>مشاركة المحدد 📤</span>
          </button>
          <button
            onClick={onClose}
            className="bg-[#2a2a2a] text-gray-300 py-1 px-4 rounded text-xs cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
});
