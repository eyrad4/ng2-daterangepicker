export type Cleanup = () => void;

export function on<K extends keyof HTMLElementEventMap>(
  el: EventTarget,
  type: K | string,
  handler: (e: any) => void,
  options?: AddEventListenerOptions | boolean
): Cleanup {
  el.addEventListener(type, handler as EventListener, options);
  return () => el.removeEventListener(type, handler as EventListener, options);
}

export function delegate(
  parent: Element,
  selector: string,
  type: string,
  handler: (e: Event, target: HTMLElement) => void
): Cleanup {
  const wrapped = (e: Event) => {
    const t = e.target as HTMLElement | null;
    if (!t) { return; }
    const match = t.closest(selector) as HTMLElement | null;
    if (match && parent.contains(match)) {
      handler(e, match);
    }
  };
  parent.addEventListener(type, wrapped);
  return () => parent.removeEventListener(type, wrapped);
}

export function trigger(el: EventTarget, type: string, detail?: any): boolean {
  return el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, cancelable: true }));
}

export function fromHTML(html: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild as HTMLElement;
}

export function isPlainObject(value: any): boolean {
  if (value === null || typeof value !== 'object') { return false; }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

export function deepMerge<T>(target: T, ...sources: any[]): T {
  for (const source of sources) {
    if (!isPlainObject(source)) { continue; }
    for (const key of Object.keys(source)) {
      const srcVal = (source as any)[key];
      const tgtVal = (target as any)[key];
      if (isPlainObject(srcVal) && isPlainObject(tgtVal)) {
        deepMerge(tgtVal, srcVal);
      } else if (Array.isArray(srcVal)) {
        (target as any)[key] = srcVal.slice();
      } else {
        (target as any)[key] = srcVal;
      }
    }
  }
  return target;
}

export function readDataAttrs(el: Element): Record<string, any> {
  const out: Record<string, any> = {};
  if (!(el as HTMLElement).dataset) { return out; }
  const ds = (el as HTMLElement).dataset;
  for (const key of Object.keys(ds)) {
    const raw = ds[key]!;
    out[key] = coerceDataValue(raw);
  }
  return out;
}

function coerceDataValue(raw: string): any {
  if (raw === 'true') { return true; }
  if (raw === 'false') { return false; }
  if (raw === 'null') { return null; }
  if (raw === '') { return ''; }
  const num = Number(raw);
  if (!isNaN(num) && raw === String(num)) { return num; }
  if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  return raw;
}

export function offsetTopLeft(el: HTMLElement): { top: number; left: number } {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + (window.pageYOffset || document.documentElement.scrollTop || 0),
    left: rect.left + (window.pageXOffset || document.documentElement.scrollLeft || 0)
  };
}

export function outerWidth(el: HTMLElement): number {
  return el.getBoundingClientRect().width;
}

export function outerHeight(el: HTMLElement): number {
  return el.getBoundingClientRect().height;
}
