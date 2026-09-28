import { mechanisms } from '../content/load';
import { h } from '../ui';

/** Index: one card per category. Picking a card lists the mechanics in it. */
export function indexPage(root: HTMLElement): () => void {
  document.title = 'A9 Pro';

  const categories = new Map<string, typeof mechanisms>();
  for (const m of mechanisms) {
    const cat = m.category ?? 'Other';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(m);
  }

  const cards = h('div', { class: 'cards' });
  const list = h('ul', { class: 'list' });
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

  root.replaceChildren(
    h('h1', {}, 'A9 hidden mechanics'),
    h('p', { class: 'summary' }, 'Drills for Asphalt 9 Legends. Xbox, DualSense and keyboard.'),
    h('p', { class: 'hint' }, 'Pick a category, then a mechanic. Plug in your controller or use the keyboard.'),
    cards,
    list,
    h('p', { class: 'footer' }, 'Unofficial fan project, not affiliated with or endorsed by Gameloft. Asphalt is a trademark of Gameloft. Xbox is a trademark of Microsoft. PlayStation and DualSense are trademarks of Sony Interactive Entertainment. Videos belong to their creators. All credits reserved to LiveKrislord.'),
  );
  return () => {};
}
