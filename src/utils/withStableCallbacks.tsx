import React, { memo, useRef } from 'react';

/**
 * يلفّ مكوّناً بحيث تصل إليه كل الدوال في props بهوية ثابتة (تستدعي دائماً أحدث نسخة).
 * بذلك يعمل React.memo فعلاً: لا يُعاد رسم المكوّن إلا إذا تغيّرت قيم props غير الدوال،
 * بدل إعادة رسمه مع كل إشعار أو حرف يُكتب أو تغيّر حالة غير مرتبطة.
 */
export function withStableCallbacks<T extends React.ComponentType<any>>(Component: T): T {
  const Memoized = memo(Component as React.ComponentType<any>);

  const Stable = (props: any) => {
    const latest = useRef(props);
    latest.current = props;
    const proxies = useRef<Record<string, (...args: any[]) => any>>({});

    const next: Record<string, any> = {};
    for (const key of Object.keys(props)) {
      const value = props[key];
      if (typeof value === 'function') {
        if (!proxies.current[key]) {
          proxies.current[key] = (...args: any[]) => {
            const fn = latest.current[key];
            return typeof fn === 'function' ? fn(...args) : undefined;
          };
        }
        next[key] = proxies.current[key];
      } else {
        next[key] = value;
      }
    }
    return <Memoized {...next} />;
  };
  Stable.displayName = `Stable(${(Component as any).displayName || (Component as any).name || 'Component'})`;
  return Stable as unknown as T;
}
