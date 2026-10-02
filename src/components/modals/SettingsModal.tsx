import React, { memo } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  multiBubbleMode: boolean;
  setMultiBubbleMode: (val: boolean) => void;
  autoFitText: boolean;
  setAutoFitText: (val: boolean) => void;
  autoApplyBubbleStyle: boolean;
  setAutoApplyBubbleStyle: (val: boolean) => void;
  wandTolerance: number;
  setWandTolerance: (val: number) => void;
  minBubbleSize: number;
  setMinBubbleSize: (val: number) => void;
  bubbleMargin: number;
  setBubbleMargin: (val: number) => void;
  geminiApiKey: string;
  setGeminiApiKey: (val: string) => void;
  hfToken: string;
  setHfToken: (val: string) => void;
  addToast: (msg: string, type?: 'error' | 'success') => void;
}

export const SettingsModal = memo(function SettingsModal({
  isOpen,
  onClose,
  multiBubbleMode,
  setMultiBubbleMode,
  autoFitText,
  setAutoFitText,
  autoApplyBubbleStyle,
  setAutoApplyBubbleStyle,
  wandTolerance,
  setWandTolerance,
  minBubbleSize,
  setMinBubbleSize,
  bubbleMargin,
  setBubbleMargin,
  geminiApiKey,
  setGeminiApiKey,
  hfToken,
  setHfToken,
  addToast,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 z-[100000] flex items-center justify-center p-4 backdrop-blur-xs select-none" dir="rtl">
      <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-5 w-full max-w-md text-right flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <h3 className="text-sm font-bold text-white border-b border-[#2d2d2d] pb-2 flex items-center gap-1.5 justify-end">
          <span>🔧 إعدادات تايبر المتكاملة</span>
        </h3>

        <div className="flex flex-col gap-3 text-xs text-gray-300">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={multiBubbleMode}
              onChange={e => setMultiBubbleMode(e.target.checked)}
              className="accent-[#007acc]"
            />
            <span>تفعيل وضع الفقاعات المتعددة (إدراج سريع متتابع)</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoFitText}
              onChange={e => setAutoFitText(e.target.checked)}
              className="accent-[#007acc]"
            />
            <span>حسّن النص آلياً ليناسب حيز الفقاعة</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer text-blue-400">
            <input
              type="checkbox"
              checked={autoApplyBubbleStyle}
              onChange={e => setAutoApplyBubbleStyle(e.target.checked)}
              className="accent-[#007acc]"
            />
            <span>التعرف الذكي التلقائي وتطبيق الخط والتنسيق حسب الفقاعة 🤖✨</span>
          </label>
          <div className="flex justify-between items-center">
            <span>حساسية العصا السحرية (Tolerance)</span>
            <input
              type="number"
              min="1"
              max="255"
              value={wandTolerance}
              onChange={e => setWandTolerance(parseInt(e.target.value) || 20)}
              className="w-16 bg-[#2d2d2d] border border-[#2d2d2d] text-white rounded px-2.5 py-0.5 text-center text-xs"
            />
          </div>
          <div className="flex justify-between items-center">
            <span>الحد الأدنى للفقاعات (بكسل)</span>
            <input
              type="number"
              min="5"
              max="100"
              value={minBubbleSize}
              onChange={e => setMinBubbleSize(parseInt(e.target.value) || 25)}
              className="w-16 bg-[#2d2d2d] border border-[#2d2d2d] text-white rounded px-2.5 py-0.5 text-center text-xs"
            />
          </div>

          <div className="flex justify-between items-center border-t border-[#2d2d2d] pt-3 mt-1">
            <span>هامش أمان أسطر الفقاعة:</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bubble_margin_setting"
                  checked={bubbleMargin === 5}
                  onChange={() => {
                    setBubbleMargin(5);
                    addToast('✓ تم تحديد هامش أمان 5% (ضيق) 📏', 'success');
                  }}
                  className="accent-[#007acc]"
                />
                <span>5% (ضيق)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bubble_margin_setting"
                  checked={bubbleMargin === 10}
                  onChange={() => {
                    setBubbleMargin(10);
                    addToast('✓ تم تحديد هامش أمان 10% (افتراضي) 📏', 'success');
                  }}
                  className="accent-[#007acc]"
                />
                <span>10%</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bubble_margin_setting"
                  checked={bubbleMargin === 15}
                  onChange={() => {
                    setBubbleMargin(15);
                    addToast('✓ تم تحديد هامش أمان 15% (تباعد أكبر) 📏', 'success');
                  }}
                  className="accent-[#007acc]"
                />
                <span>15%</span>
              </label>
            </div>
          </div>

          <h3 className="text-sm font-bold text-white border-b border-[#2d2d2d]/30 pt-3 pb-1.5 flex items-center gap-1.5 justify-end">
            <span>🔑 مفتاح تشغيل الذكاء الاصطناعي (Gemini / Hugging Face)</span>
          </h3>
          <div className="flex flex-col gap-3 text-xs text-gray-300">
            <p className="text-[10px] text-gray-400 leading-normal">
              مطلوب لتشغيل ميزة ممحاة الخلفية الذكية (Inpaint). يتم حفظ المفتاح محلياً بشكل آمن تماماً على هاتفك للعمل دوماً.
            </p>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-400">مفتاح Gemini API Key (تفضيل تلقائي):</span>
              <input
                type="password"
                value={geminiApiKey}
                onChange={e => {
                  setGeminiApiKey(e.target.value);
                  localStorage.setItem('typer_gemini_api_key', e.target.value);
                }}
                placeholder="أدخل مفتاح Gemini..."
                className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-left text-xs font-mono focus:border-[#007acc] focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-400">رمز Hugging Face Token:</span>
              <input
                type="password"
                value={hfToken}
                onChange={e => {
                  setHfToken(e.target.value);
                  localStorage.setItem('typer_hf_token', e.target.value);
                }}
                placeholder="أدخل رمز hf_..."
                className="w-full bg-[#151515] border border-[#2d2d2d] text-white rounded px-2.5 py-1.5 text-left text-xs font-mono focus:border-[#007acc] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={onClose}
            className="bg-[#007acc] text-white py-1 px-5 rounded-lg text-xs font-bold transition hover:bg-[#0062a3] cursor-pointer"
          >
            تطبيق وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
});
