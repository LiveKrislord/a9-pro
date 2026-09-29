import { makeDiagram } from './diagrams';
import type { ControllerKind } from './types';
import { h } from './ui';

export const KIND_KEY = 'a9.controller';
export const LAYOUTS: { label: string; value: ControllerKind }[] = [
  { label: 'Xbox', value: 'xbox' },
  { label: 'DualSense', value: 'dualsense' },
  { label: 'Keyboard', value: 'keyboard' },
];

export function savedKind(): ControllerKind | null {
  try {
    const v = localStorage.getItem(KIND_KEY);
    return LAYOUTS.some((l) => l.value === v) ? (v as ControllerKind) : null;
  } catch {
    return null;
  }
}

export function saveKind(kind: ControllerKind) {
  try { localStorage.setItem(KIND_KEY, kind); } catch { /* storage unavailable */ }
}

/** Three tiles, one per layout, drawn with the real diagrams. */
export function layoutTiles(current: ControllerKind | null, onPick: (kind: ControllerKind) => void): HTMLElement {
  const wrap = h('div', { class: 'layout-pick', role: 'group', 'aria-label': 'Layout' });
  for (const l of LAYOUTS) {
    const d = makeDiagram(l.value);
    const b = h('button', { class: 'layout-btn no-labels', type: 'button', 'data-kind': l.value, 'aria-pressed': String(l.value === current) }, d.el, h('span', {}, l.label));
    b.onclick = () => { saveKind(l.value); onPick(l.value); };
    wrap.append(b);
  }
  return wrap;
}

/** The "Pick your layout" dialog, opened from the gear button. */
export function showLayoutModal(onPick: (kind: ControllerKind) => void) {
  const close = h('button', { class: 'close', type: 'button', 'aria-label': 'Close' }, 'X');
  const dialog = h('dialog', { class: 'notice layout-modal' },
    close,
    h('h2', {}, 'Pick your layout'),
    layoutTiles(savedKind(), (k) => { dialog.close(); onPick(k); }),
  );
  close.onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
}

/** Gear button that opens the layout dialog. */
export function gearButton(onPick: (kind: ControllerKind) => void): HTMLElement {
  const b = h('button', { class: 'gear', type: 'button', 'aria-label': 'Layout settings', title: 'Pick your layout' });
  b.innerHTML =
    '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  b.onclick = () => showLayoutModal(onPick);
  return b;
}
