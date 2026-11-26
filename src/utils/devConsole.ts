// 🛠️ لوحة الفحص (eruda): لا تُحمَّل ولا تعمل إطلاقاً إلا عند طلبها (5 نقرات متتالية على اسم الملف في الشريط العلوي)
// وعند إيقافها تُزال اللوحة وتُستعاد دوال console و XHR و fetch الأصلية فيعود التطبيق كما لو لم تُشغَّل.

const ERUDA_VERSION = '3.4.3';
const ERUDA_URL = `https://cdn.jsdelivr.net/npm/eruda@${ERUDA_VERSION}/eruda.js`;
// بصمة تحقق (SRI) للملف المثبَّت أعلاه: لا يُنفَّذ أي سكربت مختلف عنه
const ERUDA_SRI = 'sha384-weDBY9jeIj4NqaiZF9f6PMAMMY4lIu+0CAI+TjBIE73RctCQOxDoEHltYnstRszI';

type Restorable = Array<[any, string, any]>;

const CONSOLE_METHODS = [
  'log', 'info', 'warn', 'error', 'debug', 'table', 'dir', 'clear',
  'time', 'timeEnd', 'count', 'assert', 'group', 'groupEnd', 'groupCollapsed',
];

let active = false;
let loadPromise: Promise<any> | null = null;
let savedHooks: Restorable = [];

function snapshotHooks(): Restorable {
  const list: Restorable = [];
  CONSOLE_METHODS.forEach(m => {
    if (typeof (console as any)[m] === 'function') list.push([console, m, (console as any)[m]]);
  });
  if (typeof XMLHttpRequest !== 'undefined') {
    ['open', 'send', 'setRequestHeader'].forEach(m => {
      list.push([XMLHttpRequest.prototype, m, (XMLHttpRequest.prototype as any)[m]]);
    });
  }
  if (typeof window !== 'undefined' && typeof (window as any).fetch === 'function') {
    list.push([window, 'fetch', (window as any).fetch]);
  }
  return list;
}

function restoreHooks(list: Restorable): void {
  list.forEach(([obj, key, fn]) => {
    try { obj[key] = fn; } catch (e) { /* ignore */ }
  });
}

function loadErudaScript(): Promise<any> {
  const existing = (window as any).eruda;
  if (existing) return Promise.resolve(existing);
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = ERUDA_URL;
      script.integrity = ERUDA_SRI;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve((window as any).eruda);
      script.onerror = () => {
        loadPromise = null;
        script.remove();
        reject(new Error('eruda load failed'));
      };
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

export function isDevConsoleActive(): boolean {
  return active;
}

/** يُشغّل اللوحة أو يُوقفها. يعيد الحالة الجديدة، ويرمي خطأً إن تعذّر التحميل (لا اتصال مثلاً). */
export async function toggleDevConsole(): Promise<'on' | 'off'> {
  if (active) {
    try { (window as any).eruda?.destroy(); } catch (e) { /* ignore */ }
    restoreHooks(savedHooks);
    savedHooks = [];
    active = false;
    return 'off';
  }
  const eruda = await loadErudaScript();
  if (!eruda) throw new Error('eruda unavailable');
  savedHooks = snapshotHooks();
  eruda.init();
  active = true;
  return 'on';
}
