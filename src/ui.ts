export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  el.append(...children);
  return el;
}

export interface Segmented<T> { el: HTMLElement; set(v: T): void }

/** A row of mutually exclusive buttons. */
export function segmented<T extends string | number>(
  options: { label: string; value: T }[],
  value: T,
  onChange: (v: T) => void,
): Segmented<T> {
  const el = h('div', { class: 'seg', role: 'group' });
  const buttons = options.map((o) => {
    const b = h('button', { type: 'button' }, o.label);
    b.onclick = () => { set(o.value); onChange(o.value); };
    el.append(b);
    return { b, v: o.value };
  });
  function set(v: T) {
    for (const { b, v: bv } of buttons) b.setAttribute('aria-pressed', String(bv === v));
  }
  set(value);
  return { el, set };
}

export function fmtOffset(ms: number, refLabel: string): string {
  const n = Math.round(Math.abs(ms));
  return ms < 0 ? `${n} ms before ${refLabel}` : `${n} ms after ${refLabel}`;
}
