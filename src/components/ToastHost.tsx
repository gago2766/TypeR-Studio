import React, { memo, useEffect, useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

type ToastType = 'error' | 'success' | undefined;
interface ToastItem { id: number; msg: string; type?: ToastType }
type Listener = (t: ToastItem) => void;

const listeners = new Set<Listener>();
let toastSeq = 0;

// ⚡ دالة إشعار ثابتة الهوية: لا تُعيد بناء التطبيق كله (الإشعارات تعيش في مكوّنها المستقل فقط)
export function pushToast(msg: string, type?: 'error' | 'success'): void {
  const item: ToastItem = { id: ++toastSeq, msg, type };
  listeners.forEach(l => l(item));
}

const MAX_VISIBLE = 4;

export const ToastHost = memo(function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const timers = new Set<number>();
    const listener: Listener = t => {
      setToasts(prev => [...prev.slice(-(MAX_VISIBLE - 1)), t]);
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, 2800);
      timers.add(timer);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      timers.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[999999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border shadow-xl bg-[#2a2a2a] text-xs text-white min-w-[200px] justify-between pointer-events-auto transition animate-in slide-in-from-bottom-2 duration-150 ${
            t.type === 'error'
              ? 'border-red-600 bg-red-950/80 text-red-100'
              : t.type === 'success'
              ? 'border-green-600 bg-green-950/80 text-green-100'
              : 'border-[#3a3a3a]'
          }`}
        >
          <span className="flex-1 text-right">{t.msg}</span>
          {t.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
          ) : t.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : null}
        </div>
      ))}
    </div>
  );
});
