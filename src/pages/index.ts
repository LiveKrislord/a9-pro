import { mechanisms } from '../content/load';
import { h } from '../ui';

export function indexPage(root: HTMLElement): () => void {
  document.title = 'A9 Pro';
  root.replaceChildren(
    h('h1', {}, 'A9 hidden mechanics'),
    h('p', { class: 'summary' }, 'Input layouts and drills for Asphalt 9 Legends. Xbox, DualSense and keyboard.'),
    h(
      'ul',
      { class: 'list' },
      ...mechanisms.map((m) =>
        h('li', {}, h('a', { href: `#/m/${m.id}` }, h('span', { class: 'title' }, m.title), h('span', { class: 'cat' }, m.category ?? ''))),
      ),
    ),
    h('p', { class: 'footer' }, 'Plug in a controller or use the keyboard. Each mechanic has a playback and a test.'),
  );
  return () => {};
}
