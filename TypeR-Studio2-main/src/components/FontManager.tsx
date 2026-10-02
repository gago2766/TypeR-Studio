import React, { useState, memo } from 'react';
import { CustomFont } from '../types';
import { saveFont } from '../utils';

interface FontManagerProps {
  isOpen: boolean;
  onClose: () => void;
  customFonts: CustomFont[];
  setCustomFonts: React.Dispatch<React.SetStateAction<CustomFont[]>>;
  favFonts: string[];
  setFavFonts: React.Dispatch<React.SetStateAction<string[]>>;
  onSelectFont: (fontValue: string) => void;
  selectedFont: string;
}

export const FontManager = memo(function FontManager({
  isOpen,
  onClose,
  customFonts,
  setCustomFonts,
  favFonts,
  setFavFonts,
  onSelectFont,
  selectedFont,
}: FontManagerProps) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'favs' | 'custom'>('all');

  if (!isOpen) return null;

  // 🌟 القائمة تعتمد حصرياً ونقياً على خطوطك المرفوعة فقط دون أي خطوط نظامية دخيلة
  const allFonts: CustomFont[] = customFonts.map(f => ({ ...f, custom: true }));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) as File[] : [];
    if (!files.length) return;

    let loaded = 0;
    const newFonts: CustomFont[] = [...customFonts];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async ev => {
        const arrayBuffer = ev.target?.result as ArrayBuffer;
        const fontName = file.name
          .replace(/\.(ttf|otf|woff2?)$/i, '')
          .replace(/[-_]/g, ' ')
          .trim();
        const fontValue = fontName;

        if (!newFonts.find(f => f.name.toLowerCase() === fontName.toLowerCase())) {
          // 1. تسجيل الخط فوراً عبر FontFace API المباشر ليعمل في الواجهة والكانفاس فوراً
          try {
            const fontFace = new FontFace(fontName, arrayBuffer);
            await fontFace.load();
            document.fonts.add(fontFace);
          } catch (fontFaceErr) {
            console.warn("تنبيه أثناء تحميل FontFace:", fontFaceErr);
          }

          // 2. حقن ستايل كخيار احتياطي مزدوج
          try {
            const blob = new Blob([arrayBuffer], { type: file.type || 'font/ttf' });
            const blobUrl = URL.createObjectURL(blob);
            let style = document.getElementById(`font-style-${fontName.replace(/\s+/g, '-')}`);
            if (!style) {
              style = document.createElement('style');
              style.id = `font-style-${fontName.replace(/\s+/g, '-')}`;
              style.textContent = `@font-face { font-family: '${fontName}'; src: url('${blobUrl}'); font-display: swap; }`;
              document.head.appendChild(style);
            }
          } catch (blobErr) {
            console.warn("تنبيه أثناء حقن وسم الاستايل:", blobErr);
          }

          // 3. حفظ ملف الخط في قاعدة بيانات أندرويد الدائمة بالهاتف
          try {
            await saveFont(fontName, arrayBuffer);
          } catch (err) {
            console.error("فشل حفظ الخط في ذاكرة الهاتف الدائمة:", err);
          }

          newFonts.push({ name: fontName, value: fontValue, custom: true });
        }

        loaded++;
        if (loaded === files.length) {
          setCustomFonts(newFonts);
          // 4. حفظ بيانات تعريف الخطوط في localStorage السريعة
          try {
            localStorage.setItem('typer_custom_fonts_meta', JSON.stringify(newFonts));
          } catch (err) {
            console.error("فشل حفظ بيانات الخطوط في الذاكرة السريعة:", err);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    });

    e.target.value = '';
  };

  const toggleFavorite = (value: string) => {
    const cleanVal = value.replace(/['"]/g, '').trim();
    if (favFonts.some(v => v.replace(/['"]/g, '').trim().toLowerCase() === cleanVal.toLowerCase())) {
      setFavFonts(favFonts.filter(v => v.replace(/['"]/g, '').trim().toLowerCase() !== cleanVal.toLowerCase()));
    } else {
      setFavFonts([...favFonts, cleanVal]);
    }
  };

  const deleteCustomFont = (value: string) => {
    const fontName = value.replace(/['"]/g, "").trim();

    const updatedFonts = customFonts.filter(f => f.name.toLowerCase() !== fontName.toLowerCase());
    setCustomFonts(updatedFonts);
    setFavFonts(favFonts.filter(f => f.replace(/['"]/g, "").trim().toLowerCase() !== fontName.toLowerCase()));

    // 1. تحديث بيانات الذاكرة السريعة
    try {
      localStorage.setItem('typer_custom_fonts_meta', JSON.stringify(updatedFonts));
    } catch (err) {
      console.error(err);
    }

    // 2. إزالة الخط برمجياً من document.fonts حتى لا يترك كاش تالف يتداخل مع الخطوط الجديدة
    try {
      document.fonts.forEach((fontFace: FontFace) => {
        if (fontFace.family.replace(/['"]/g, '').trim().toLowerCase() === fontName.toLowerCase()) {
          document.fonts.delete(fontFace);
        }
      });
    } catch (err) {
      console.error("فشل حذف FontFace من الذاكرة الحية:", err);
    }

    // 3. حذف ملف الخط الثنائي من قاعدة البيانات الدائمة
    try {
      const request = indexedDB.open('TypeRStudioFontsDB', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('fonts', 'readwrite');
        const store = transaction.objectStore('fonts');
        store.delete(fontName);
      };
    } catch (err) {
      console.error("فشل حذف الخط من قاعدة البيانات:", err);
    }

    // 4. إزالة ستايل الخط من رأس الصفحة
    const styleEl = document.getElementById(`font-style-${fontName.replace(/\s+/g, '-')}`);
    if (styleEl) styleEl.remove();
  };

  const filtered = allFonts.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    const cleanVal = f.value.replace(/['"]/g, '').trim().toLowerCase();
    if (tab === 'favs') return favFonts.some(fav => fav.replace(/['"]/g, '').trim().toLowerCase() === cleanVal);
    if (tab === 'custom') return true;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/75 z-[10000] flex items-center justify-center p-4">
      <div 
        className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
        id="font-manager-dialog"
      >
        <div className="p-4 border-b border-[#2d2d2d] flex items-center justify-between">
          <strong className="text-white text-base">📁 مدير الخطوط</strong>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-2xl font-light focus:outline-none cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-4 border-b border-[#2d2d2d]">
          <label className="flex flex-col items-center gap-2 cursor-pointer bg-[#252525] hover:bg-[#2d2d2d] border border-dashed border-[#444] rounded-lg p-4 text-gray-400 hover:text-gray-200 text-xs transition duration-150">
            <span className="text-2xl">⬆</span>
            <span className="text-center">
              ارفع خطوط TTF / OTF / WOFF / WOFF2
              <br />
              <small className="text-gray-500">سيتم حفظ الخطوط في قاعدة بيانات هاتفك بشكل دائم 💾</small>
            </span>
            <input 
              type="file" 
              accept=".ttf,.otf,.woff,.woff2" 
              multiple 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </label>
        </div>

        <div className="px-4 py-2">
          <input 
            type="text" 
            placeholder="🔍 بحث في الخطوط..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#121212] border border-[#2d2d2d] text-white rounded-md px-3 py-1.5 text-xs focus:border-[#007acc] focus:outline-none"
          />
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1 mt-2">
          <button 
            onClick={() => setTab('all')}
            className={`flex-1 py-1 px-2 text-xs font-semibold rounded-t-md border-t border-x border-transparent transition cursor-pointer ${
              tab === 'all' 
                ? 'bg-[#151515] text-[#007acc] border-[#2d2d2d]' 
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
            }`}
          >
            الكل ({allFonts.length})
          </button>
          <button 
            onClick={() => setTab('favs')}
            className={`flex-1 py-1 px-2 text-xs font-semibold rounded-t-md border-t border-x border-transparent transition cursor-pointer ${
              tab === 'favs' 
                ? 'bg-[#151515] text-[#f5c518] border-[#2d2d2d]' 
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
            }`}
          >
            ⭐ المفضلة
          </button>
          <button 
            onClick={() => setTab('custom')}
            className={`flex-1 py-1 px-2 text-xs font-semibold rounded-t-md border-t border-x border-[#2d2d2d]/10 transition cursor-pointer ${
              tab === 'custom' 
                ? 'bg-[#151515] text-teal-400 border-[#2d2d2d]' 
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
            }`}
          >
            المرفوعة ({customFonts.length})
          </button>
        </div>

        {/* Container */}
        <div className="flex-1 overflow-y-auto bg-[#151515] border border-[#2d2d2d] rounded-b-lg mx-4 mb-4 min-h-[180px]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              {allFonts.length === 0 
                ? "لا توجد خطوط مرفوعة بعد. قم برفع خطوطك المخصصة من الزر أعلاه ⬆"
                : "لا توجد خطوط مطابقة لبحثك"}
            </div>
          ) : (
            filtered.map(f => {
              const cleanFVal = f.value.replace(/['"]/g, '').trim().toLowerCase();
              const isFav = favFonts.some(fav => fav.replace(/['"]/g, '').trim().toLowerCase() === cleanFVal);
              const isSelected = f.value.replace(/['"]/g, '').trim().toLowerCase() === (selectedFont || '').replace(/['"]/g, '').trim().toLowerCase();

              return (
                <div 
                  key={f.value}
                  onClick={() => onSelectFont(f.value)}
                  style={{ fontFamily: `'${f.value}'` }}
                  className={`flex items-center justify-between p-3 border-b border-[#1e1e1e] cursor-pointer hover:bg-[#1a2a3a]/40 transition group ${
                    isSelected ? 'bg-[#1a2a3a]/90 border-l-2 border-l-[#007acc]' : ''
                  }`}
                >
                  <div className="flex flex-col min-width-0">
                    <span className="text-white text-sm truncate pr-2 max-w-[200px]" title={f.name}>
                      {f.name}
                    </span>
                    <span className="text-[10px] text-gray-500">أبجد هوز حطي كلمن 123</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(f.value);
                      }}
                      className={`text-lg leading-none p-1 focus:outline-none transition cursor-pointer ${
                        isFav ? 'text-[#f5c518]' : 'text-gray-600 hover:text-gray-400'
                      }`}
                      title={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                    >
                      {isFav ? '★' : '☆'}
                    </button>
                    {f.custom && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomFont(f.value);
                        }}
                        className="text-gray-600 hover:text-red-500 p-1 text-sm leading-none focus:outline-none transition opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="حذف الخط"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-[#2d2d2d] flex justify-end gap-2 bg-[#171717]">
          <button 
            onClick={() => {
              if (selectedFont) {
                onSelectFont(selectedFont);
                onClose();
              }
            }}
            disabled={!selectedFont}
            className="bg-[#007acc] text-white hover:bg-[#0062a3] shadow disabled:opacity-50 disabled:cursor-not-allowed rounded-md px-4 py-1.5 text-xs font-semibold focus:outline-none transition cursor-pointer"
          >
            تطبيق الخط المحدد
          </button>
        </div>
      </div>
    </div>
  );
});
