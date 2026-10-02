import React, { memo } from 'react';

interface FallbackShareModalProps {
  fallbackFile: { url: string; blob: Blob; filename: string } | null;
  onClose: () => void;
  Capacitor: any;
  Filesystem: any;
  Share: any;
  Directory: any;
  addToast: (msg: string, type?: 'error' | 'success') => void;
}

export const FallbackShareModal = memo(function FallbackShareModal({
  fallbackFile,
  onClose,
  Capacitor,
  Filesystem,
  Share,
  Directory,
  addToast,
}: FallbackShareModalProps) {
  if (!fallbackFile) return null;

  const handleClose = () => {
    if (fallbackFile?.url) {
      try {
        URL.revokeObjectURL(fallbackFile.url);
      } catch (err) {
        console.error(err);
      }
    }
    onClose();
  };

  const handleNativeOrWebShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fallbackFile) return;

    if (Capacitor && Capacitor.isNativePlatform()) {
      try {
        if (!Filesystem || !Share || !Directory) {
          addToast('⚠️ حزم المشاركة غير جاهزة بعد، يرجى المحاولة لاحقاً', 'error');
          return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(fallbackFile.blob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          const base64Raw = base64Data.split(',')[1] || base64Data;

          await Filesystem.writeFile({
            path: fallbackFile.filename,
            data: base64Raw,
            directory: Directory.Cache,
          });

          const fileUriResult = await Filesystem.getUri({
            directory: Directory.Cache,
            path: fallbackFile.filename,
          });

          await Share.share({
            title: fallbackFile.filename,
            files: [fileUriResult.uri],
          });

          await Filesystem.deleteFile({
            directory: Directory.Cache,
            path: fallbackFile.filename,
          });

          addToast('✓ تم استدعاء قائمة المشاركة الأصلية بنجاح 📤', 'success');
        };
      } catch (nativeErr) {
        console.error('Fallback native sharing error:', nativeErr);
        addToast('❌ فشل استدعاء المشاركة الأصلية للنظام', 'error');
      }
      return;
    }

    const file = new File([fallbackFile.blob], fallbackFile.filename, {
      type: fallbackFile.blob.type,
    });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: fallbackFile.filename,
        });
        addToast('✓ تم الحفظ والمشاركة بنجاح 📤', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          addToast('فشل في فتح نافذة المشاركة، يرجى التحقق من تثبيت مكتبة المشاركة', 'error');
        }
      }
    } else {
      addToast('⚠️ نظام أندرويد بحاجة لمكتبة Capacitor Share للاتصال بالمعرض مباشرة', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[100000] flex flex-col items-center justify-center p-4 backdrop-blur-md cursor-pointer"
      dir="rtl"
      onClick={handleClose}
    >
      <div
        className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-2xl p-5 w-full max-w-sm text-center flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 cursor-default"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5 justify-center">
          <span>🎉 تم تجهيز صورتك بنجاح!</span>
        </h3>
        <p className="text-[11px] text-gray-300 leading-relaxed">
          {Capacitor && Capacitor.isNativePlatform() ? (
            <>
              يرجى استخدام زر{' '}
              <span className="text-green-400 font-bold">"مشاركة وحفظ الصورة"</span> بالأسفل
              لحفظها مباشرة في معرض الصور بهاتفك 📱💾
            </>
          ) : (
            <>
              إذا لم يبدأ التحميل تلقائياً،
              <span className="text-yellow-400 font-bold"> اضغط مطولاً </span>
              على الصورة أدناه ثم اختر
              <span className="text-green-400 font-bold"> "حفظ الصورة" </span>
              أو
              <span className="text-green-400 font-bold"> "إضافة إلى الصور" </span>
              📱💾
            </>
          )}
        </p>
        <div className="bg-[#151515] border border-[#2d2d2d] rounded-lg p-2 flex items-center justify-center overflow-hidden max-h-[40vh]">
          <img
            src={fallbackFile.url}
            className="max-h-[35vh] max-w-full object-contain rounded shadow-lg pointer-events-auto"
            style={{
              userSelect: 'auto',
              WebkitUserSelect: 'auto',
              WebkitTouchCallout: 'default',
            }}
            alt="Translated page preview"
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleNativeOrWebShare}
            className="bg-green-600 text-white hover:bg-green-700 py-2 px-5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>📤 مشاركة وحفظ الصورة</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="bg-[#2d2d2d] text-gray-300 border border-[#3c3c3c] hover:bg-[#3d3d3d] py-2 px-5 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
});
