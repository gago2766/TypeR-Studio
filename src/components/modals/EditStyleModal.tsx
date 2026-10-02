import React, { memo } from 'react';
import { TextStyle, StyleFolder, CustomFont } from '../../types';

interface EditStyleModalProps {
  editingStyle: { style: TextStyle; folderId: string } | null;
  onClose: () => void;
  folders: StyleFolder[];
  allFontsList: CustomFont[];
  editFormName: string;
  setEditFormName: (val: string) => void;
  editFormFolderId: string;
  setEditFormFolderId: (val: string) => void;
  editFormFamily: string;
  setEditFormFamily: (val: string) => void;
  editFormSize: string;
  setEditFormSize: (val: string) => void;
  editFormColor: string;
  setEditFormColor: (val: string) => void;
  editFormBg: string;
  setEditFormBg: (val: string) => void;
  editFormTracking: number;
  setEditFormTracking: (val: number) => void;
  editFormLineHeight: number;
  setEditFormLineHeight: (val: number) => void;
  editFormAlign: 'center' | 'left' | 'right';
  setEditFormAlign: (val: 'center' | 'left' | 'right') => void;
  editFormBold: boolean;
  setEditFormBold: (val: boolean) => void;
  editFormItalic: boolean;
  setEditFormItalic: (val: boolean) => void;
  editFormUnderline: boolean;
  setEditFormUnderline: (val: boolean) => void;
  editFormTags: string;
  setEditFormTags: (val: string) => void;
  editFormTagColor: string;
  setEditFormTagColor: (val: string) => void;
  onCopyActiveLayerStyleToForm: () => void;
  onSaveEditedStyle: (updatedStyle: TextStyle, targetFolderId: string) => void;
  onDeleteStyle: (styleId: string) => void;
  addToast: (msg: string, type?: 'error' | 'success') => void;
}

export const EditStyleModal = memo(function EditStyleModal({
  editingStyle,
  onClose,
  folders,
  allFontsList,
  editFormName,
  setEditFormName,
  editFormFolderId,
  setEditFormFolderId,
  editFormFamily,
  setEditFormFamily,
  editFormSize,
  setEditFormSize,
  editFormColor,
  setEditFormColor,
  editFormBg,
  setEditFormBg,
  editFormTracking,
  setEditFormTracking,
  editFormLineHeight,
  setEditFormLineHeight,
  editFormAlign,
  setEditFormAlign,
  editFormBold,
  setEditFormBold,
  editFormItalic,
  setEditFormItalic,
  editFormUnderline,
  setEditFormUnderline,
  editFormTags,
  setEditFormTags,
  editFormTagColor,
  setEditFormTagColor,
  onCopyActiveLayerStyleToForm,
  onSaveEditedStyle,
  onDeleteStyle,
  addToast,
}: EditStyleModalProps) {
  if (!editingStyle) return null;

  return (
    <div className="fixed inset-0 bg-black/85 z-[100000] flex items-center justify-center p-4 backdrop-blur-xs select-none" dir="rtl">
      <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-5 w-full max-w-md text-right flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-2">
          <span className="text-sm font-bold text-white">⚙️ تحرير وتعديل النمط التنسيقي</span>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg font-bold outline-none focus:outline-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400">اسم النمط (Style name):</label>
          <input
            type="text"
            value={editFormName}
            onChange={e => setEditFormName(e.target.value)}
            className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#007acc]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400">المجلد المستهدف (Folder):</label>
          <select
            value={editFormFolderId}
            onChange={e => setEditFormFolderId(e.target.value)}
            className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-xs outline-none cursor-pointer focus:border-[#007acc]"
          >
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onCopyActiveLayerStyleToForm}
          className="w-full bg-[#2d2d2d] border border-[#3c3c3c] text-white hover:bg-[#3d3d3d] text-xs py-2 rounded transition flex items-center justify-center gap-1.5 font-bold cursor-pointer"
        >
          <span>❐ نسخ تنسيق الطبقة النشطة (Copy layer style)</span>
        </button>

        <div className="bg-[#151515] border border-[#2d2d2d] rounded p-3 flex flex-col gap-3">
          <span className="text-[11px] text-gray-400 font-bold border-b border-[#2d2d2d] pb-1">إعدادات الخط والتنسيق:</span>

          <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-gray-400">نوع الخط:</span>
            <select
              value={editFormFamily}
              onChange={e => setEditFormFamily(e.target.value)}
              className="w-48 bg-[#2d2d2d] border border-[#3c3c3c] text-white rounded px-2 py-1 text-xs outline-none cursor-pointer"
            >
              {allFontsList.map(f => (
                <option key={f.value} value={f.value} style={{ fontFamily: `'${f.value}'` }}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-400">حجم الخط:</span>
              <input
                type="text"
                value={editFormSize}
                onChange={e => setEditFormSize(e.target.value)}
                placeholder="Auto أو رقم"
                className="bg-[#2d2d2d] border border-[#3c3c3c] text-white rounded px-2 py-1 text-xs text-center outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-400">تباعد الأسطر:</span>
              <input
                type="number"
                step="0.05"
                value={editFormLineHeight}
                onChange={e => setEditFormLineHeight(parseFloat(e.target.value) || 1.25)}
                className="bg-[#2d2d2d] border border-[#3c3c3c] text-white rounded px-2 py-1 text-xs text-center outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-400">تباعد الحروف:</span>
              <input
                type="number"
                step="0.5"
                value={editFormTracking}
                onChange={e => setEditFormTracking(parseFloat(e.target.value) || 0)}
                className="bg-[#2d2d2d] border border-[#3c3c3c] text-white rounded px-2 py-1 text-xs text-center outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-400">لون النص:</span>
              <input
                type="color"
                value={editFormColor}
                onChange={e => setEditFormColor(e.target.value)}
                className="w-full h-7 bg-transparent rounded cursor-pointer border-0 p-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-[#2d2d2d] pt-2">
            <div className="flex gap-1 justify-center">
              <button
                onClick={() => setEditFormBold(!editFormBold)}
                className={`flex-1 py-1 text-xs font-bold rounded transition cursor-pointer ${
                  editFormBold ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                }`}
              >
                B
              </button>
              <button
                onClick={() => setEditFormItalic(!editFormItalic)}
                className={`flex-1 py-1 text-xs italic rounded transition cursor-pointer ${
                  editFormItalic ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                }`}
              >
                I
              </button>
              <button
                onClick={() => setEditFormUnderline(!editFormUnderline)}
                className={`flex-1 py-1 text-xs underline rounded transition cursor-pointer ${
                  editFormUnderline ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                }`}
              >
                U
              </button>
            </div>

            <div className="flex gap-1 justify-center">
              <button
                onClick={() => setEditFormAlign('right')}
                className={`flex-1 py-1 text-xs rounded transition cursor-pointer ${
                  editFormAlign === 'right' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-300'
                }`}
                title="يمين"
              >
                ⇤
              </button>
              <button
                onClick={() => setEditFormAlign('center')}
                className={`flex-1 py-1 text-xs rounded transition cursor-pointer ${
                  editFormAlign === 'center' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-300'
                }`}
                title="وسط"
              >
                ≡
              </button>
              <button
                onClick={() => setEditFormAlign('left')}
                className={`flex-1 py-1 text-xs rounded transition cursor-pointer ${
                  editFormAlign === 'left' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-300'
                }`}
                title="يسار"
              >
                ⇥
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-bold">علامات الاختيار التلقائي (Tags):</label>
          <input
            type="text"
            value={editFormTags}
            onChange={e => setEditFormTags(e.target.value)}
            placeholder="مثال: scream shout s"
            className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#007acc]"
          />
        </div>

        <div className="flex justify-between items-center gap-2">
          <span className="text-xs text-gray-400 font-bold">لون التمييز التلقائي (Tag color):</span>
          <input
            type="color"
            value={editFormTagColor}
            onChange={e => setEditFormTagColor(e.target.value)}
            className="w-24 h-7 bg-transparent rounded cursor-pointer border-0 p-0"
          />
        </div>

        <div className="flex gap-2 justify-between border-t border-[#2d2d2d] pt-3">
          <button
            onClick={() => {
              if (!editFormName.trim()) {
                addToast('⚠️ يرجى إدخال اسم للنمط أولاً', 'error');
                return;
              }
              const isSzAuto = editFormSize.trim().toLowerCase() === 'auto';
              const formattedStyle: TextStyle = {
                id: editingStyle.style.id,
                name: editFormName,
                fontSize: isSzAuto ? 'auto' : (parseFloat(editFormSize) || 16),
                color: editFormColor,
                bgColor: editFormBg,
                tracking: editFormTracking,
                lineHeight: editFormLineHeight,
                textAlign: editFormAlign,
                fontFamily: editFormFamily,
                tags: editFormTags.split(' ').map(t => t.trim()).filter(Boolean),
                enabled: editingStyle.style.enabled,
                bold: editFormBold,
                italic: editFormItalic,
                underline: editFormUnderline,
                tagColor: editFormTagColor,
                strokeColor: editingStyle.style.strokeColor || '#ffffff',
                strokeWidth: editingStyle.style.strokeWidth || 0,
                gradient: editingStyle.style.gradient,
                updatedAt: editingStyle.style.updatedAt || Date.now()
              };
              onSaveEditedStyle(formattedStyle, editFormFolderId);
            }}
            className="bg-[#007acc] text-white hover:bg-[#0062a3] py-2 px-5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <span>💾 حفظ التغييرات</span>
          </button>
          <button
            onClick={() => onDeleteStyle(editingStyle.style.id)}
            className="bg-red-950/80 border border-red-900/60 hover:bg-red-800 text-red-300 py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <span>🗑️ حذف النمط</span>
          </button>
        </div>
      </div>
    </div>
  );
});
