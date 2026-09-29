import { mechanisms } from '../content/load';
import { makeDiagram } from '../diagrams';
import type { ControllerKind } from '../types';
import { h } from '../ui';

export const KIND_KEY = 'a9.controller';
const LAYOUTS: { label: string; value: ControllerKind }[] = [
  { label: 'Xbox', value: 'xbox' },
  { label: 'DualSense', value: 'dualsense' },
  { label: 'Keyboard', value: 'keyboard' },
];

export function savedKind(): ControllerKind | null {
  const v = localStorage.getItem(KIND_KEY);
  return LAYOUTS.some((l) => l.value === v) ? (v as ControllerKind) : null;
}

/** Index: pick a layout first, then one card per category. Picking a card lists the mechanics in it. */
export function indexPage(root: HTMLElement): () => void {
  document.title = 'A9 Pro';
  let kind = savedKind();

  const categories = new Map<string, typeof mechanisms>();
  for (const m of mechanisms) {
    const cat = m.category ?? 'Other';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(m);
  }

  // Layout picker: the real drawings, small, with the chosen one inverted.
  const picker = h('div', { class: 'layout-pick', role: 'group', 'aria-label': 'Layout' });
  const hint = h('p', { class: 'hint' });
  const buttons = LAYOUTS.map((l) => {
    const d = makeDiagram(l.value);
    const b = h('button', { class: 'layout-btn no-labels', type: 'button', 'data-kind': l.value, 'aria-pressed': 'false' }, d.el, h('span', {}, l.label));
    b.onclick = () => { kind = l.value; localStorage.setItem(KIND_KEY, l.value); refresh(); };
    picker.append(b);
    return b;
  });

  const cards = h('div', { class: 'cards' });
  const list = h('ul', { class: 'list' });
  const below = h('div', {}, cards, list);
  let selected: string | null = null;

  function select(cat: string) {
    selected = selected === cat ? null : cat;
    for (const c of Array.from(cards.children)) c.setAttribute('aria-pressed', String(c.getAttribute('data-cat') === selected));
    list.replaceChildren();
    if (!selected) return;
    for (const m of categories.get(selected) ?? []) {
      list.append(h('li', {}, h('a', { href: `#/m/${m.id}` }, h('span', { class: 'title' }, m.title), h('span', { class: 'cat' }, m.summary ?? ''))));
    }
  }

  for (const [cat, items] of categories) {
    const card = h('button', { class: 'card', type: 'button', 'data-cat': cat, 'aria-pressed': 'false' },
      h('span', { class: 'card-title' }, cat),
      h('span', { class: 'card-count' }, `${items.length} ${items.length === 1 ? 'mechanic' : 'mechanics'}`),
    );
    card.onclick = () => select(cat);
    cards.append(card);
  }

  function refresh() {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.getAttribute('data-kind') === kind));
    picker.classList.toggle('compact', kind !== null);
    hint.textContent = kind ? 'Pick a category, then a mechanic. Plug in your controller or use the keyboard.' : 'Pick your layout to start. You can change it here any time.';
    below.hidden = kind === null;
  }
  refresh();

  root.replaceChildren(
    h('h1', {}, 'A9 hidden mechanics'),
    h('p', { class: 'summary' }, 'Input layouts and drills for Asphalt 9 Legends. Xbox, DualSense and keyboard.'),
    picker,
    hint,
    below,
    h('p', { class: 'footer' }, 'Unofficial fan project, not affiliated with or endorsed by Gameloft. Asphalt is a trademark of Gameloft. Xbox is a trademark of Microsoft. PlayStation and DualSense are trademarks of Sony Interactive Entertainment. Videos belong to their creators. All credits reserved to LiveKrislord.'),
  );
  return () => {};
}
