import type { Diagram } from './index';
import { svgFrom } from './svg';

export function keyboardDiagram(): Diagram {
  const key = (code: string, x: number, y: number, w: number, label: string) =>
    `<g data-input="${code}"><rect x="${x}" y="${y}" width="${w}" height="28" rx="5"/><text x="${x + w / 2}" y="${y + 14}">${label}</text></g>`;

  const markup = `
<svg viewBox="0 0 400 136" xmlns="http://www.w3.org/2000/svg" class="diagram keyboard" role="img" aria-label="keyboard">
  ${key('KeyW', 150, 26, 28, 'W')}
  ${key('KeyA', 118, 62, 28, 'A')}
  ${key('KeyS', 150, 62, 28, 'S')}
  ${key('KeyD', 182, 62, 28, 'D')}
  ${key('ShiftLeft', 10, 62, 84, 'Shift')}
  ${key('ControlLeft', 10, 98, 60, 'Ctrl')}
  ${key('Space', 76, 98, 160, 'Space')}
  ${key('ArrowUp', 330, 62, 28, '↑')}
  ${key('ArrowLeft', 298, 98, 28, '←')}
  ${key('ArrowDown', 330, 98, 28, '↓')}
  ${key('ArrowRight', 362, 98, 28, '→')}
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
