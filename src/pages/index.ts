import { mechanisms } from '../content/load';
import { gearButton, layoutTiles, savedKind } from '../layoutPick';
import { h } from '../ui';

const FOOTER = 'Unofficial fan project, not affiliated with or endorsed by Gameloft. Asphalt is a trademark of Gameloft. Xbox is a trademark of Microsoft. PlayStation and DualSense are trademarks of Sony Interactive Entertainment. Videos belong to their creators. All credits reserved to LiveKrislord.';

/**
 * Home. First visit: a quick "pick your layout" screen. After that: the category cards,
 * with a gear button that reopens the layout choice.
 */
export function indexPage(root: HTMLElement): () => void {
  document.title = 'A9 Pro';
  render();

  function render() {
    if (!savedKind()) { renderPick(); return; }
    renderCards();
  }

  function renderPick() {
    root.replaceChildren(
      h('h1', {}, 'A9 hidden mechanics'),
      h('p', { class: 'summary' }, 'Input layouts and drills for Asphalt 9 Legends.'),
      h('p', { class: 'hint' }, 'Pick your layout to start.'),
      layoutTiles(null, () => render()),
      h('p', { class: 'footer' }, FOOTER),
    );
  }

  function renderCards() {
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
      h('div', { class: 'home-head' }, h('h1', {}, 'A9 hidden mechanics'), gearButton(() => render())),
      h('p', { class: 'summary' }, 'Input layouts and drills for Asphalt 9 Legends. Xbox, DualSense and keyboard.'),
      h('p', { class: 'hint' }, 'Pick a category, then a mechanic. Plug in your controller or use the keyboard.'),
      cards,
      list,
      h('p', { class: 'footer' }, FOOTER),
    );
  }

  return () => {};
}
