import type { Diagram } from './index';
import { svgFrom } from './svg';

/** In-game keys only: arrows, S (brake / drift) and Space (nitro). Down arrow also brakes. */
export function keyboardDiagram(): Diagram {
  const key = (code: string, x: number, y: number, w: number, label: string) =>
    `<g data-input="${code}"><rect x="${x}" y="${y}" width="${w}" height="28" rx="5"/><text x="${x + w / 2}" y="${y + 14}">${label}</text></g>`;

  const markup = `
<svg viewBox="0 0 420 84" xmlns="http://www.w3.org/2000/svg" class="diagram keyboard" role="img" aria-label="keyboard">
  ${key('KeyS', 30, 46, 48, 'Brake')}
  ${key('Space', 130, 46, 120, 'Nitro')}
  ${key('ArrowUp', 322, 10, 40, 'Up')}
  ${key('ArrowLeft', 278, 46, 40, 'Left')}
  ${key('ArrowDown', 322, 46, 40, 'Brake')}
  ${key('ArrowRight', 366, 46, 40, 'Right')}
</svg>`;

  const el = svgFrom(markup);
  const groups = Array.from(el.querySelectorAll<SVGGElement>('[data-input]'));
  return {
    el,
    set(active) {
      for (const g of groups) g.classList.toggle('on', active.has(g.dataset.input!));
    },
  };
}
