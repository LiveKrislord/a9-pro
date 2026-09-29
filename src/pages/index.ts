import { mechanisms } from '../content/load';
import { gearButton, layoutTiles, savedKind } from '../layoutPick';
import { h } from '../ui';

const FOOTER = 'Unofficial fan project, not affiliated with or endorsed by Gameloft. Asphalt is a trademark of Gameloft. Xbox is a trademark of Microsoft. PlayStation and DualSense are trademarks of Sony Interactive Entertainment. Videos belong to their creators. All credits reserved to LiveKrislord.';

const CHEVRON_LEFT = '<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_RIGHT = '<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Home. First visit: a quick "pick your layout" screen. After that: the category cards,
 * a carousel of mechanic cards for the picked category, and a gear button that reopens
 * the layout choice.
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
      h('footer', { class: 'footer' }, FOOTER),
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
    const carousel = h('div', { class: 'carousel' });
    const noMatch = h('p', { class: 'no-match' }, 'Nothing matches that. Try another word, or pick a category.');
    carousel.hidden = true;
    noMatch.hidden = true;
    let selected: string | null = null;

    // Free search across every mechanic: title, summary and category.
    const searchBox = h('input', { type: 'search', placeholder: 'Search a mechanic, for example punch', 'aria-label': 'Search mechanics', autocomplete: 'off' });
    const search = h('div', { class: 'search' }, searchBox);
    searchBox.addEventListener('input', () => {
      const q = searchBox.value.trim().toLowerCase();
      selected = null;
      for (const c of Array.from(cards.children)) c.setAttribute('aria-pressed', 'false');
      carousel.replaceChildren();
      if (!q) { carousel.hidden = true; noMatch.hidden = true; return; }
      const hits = mechanisms.filter((m) => [m.title, m.summary ?? '', m.category ?? ''].some((t) => t.toLowerCase().includes(q)));
      noMatch.hidden = hits.length > 0;
      carousel.hidden = hits.length === 0;
      if (hits.length) buildCarousel(carousel, hits, true);
    });

    function select(cat: string) {
      selected = selected === cat ? null : cat;
      searchBox.value = '';
      noMatch.hidden = true;
      for (const c of Array.from(cards.children)) c.setAttribute('aria-pressed', String(c.getAttribute('data-cat') === selected));
      carousel.replaceChildren();
      carousel.hidden = !selected;
      if (selected) buildCarousel(carousel, categories.get(selected) ?? []);
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
      h('p', { class: 'hint' }, 'Search a mechanic, or pick a category. Plug in your controller or use the keyboard.'),
      search,
      cards,
      noMatch,
      carousel,
      h('footer', { class: 'footer' }, FOOTER),
    );
  }

  /** Mechanic cards in a strip, with chevrons on both sides to move through them. */
  function buildCarousel(host: HTMLElement, items: typeof mechanisms, showCategory = false) {
    const track = h('div', { class: 'track' });
    for (const m of items) {
      track.append(h('a', { class: 'mcard', href: `#/m/${m.id}` },
        h('span', { class: 'mcard-title' }, m.title),
        h('span', { class: 'mcard-text' }, m.summary ?? ''),
        showCategory ? h('span', { class: 'mcard-cat' }, m.category ?? '') : '',
      ));
    }
    const chevron = (dir: 'left' | 'right') => {
      const b = h('button', { class: `chevron ${dir}`, type: 'button', 'aria-label': dir === 'left' ? 'Previous' : 'Next' });
      b.innerHTML = dir === 'left' ? CHEVRON_LEFT : CHEVRON_RIGHT;
      b.onclick = () => {
        const card = track.querySelector<HTMLElement>('.mcard');
        const step = card ? card.offsetWidth + 16 : 320;
        track.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
      };
      return b;
    };
    const prev = chevron('left');
    const next = chevron('right');
    const update = () => {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    track.addEventListener('scroll', update, { passive: true });
    host.append(prev, track, next);
    requestAnimationFrame(update);
  }

  return () => {};
}
