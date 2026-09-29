import type { ActionId } from '../types';
import type { Diagram } from './index';
import { svgFrom } from './svg';

/**
 * A phone held sideways, as in the game: brake on the left, nitro on the right,
 * and a horizon line in the middle that leans with the tilt. The two buttons are
 * real touch targets when the page binds them.
 */
export function tiltDiagram(): Diagram {
  const markup = `
<svg viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg" class="diagram tilt" role="img" aria-label="phone held sideways">
  <rect class="body" x="20" y="20" width="380" height="180" rx="22"/>
  <rect class="screen" x="36" y="34" width="348" height="152" rx="10"/>
  <g class="horizon" transform="rotate(0 210 110)">
    <line x1="150" y1="110" x2="270" y2="110"/>
    <circle cx="210" cy="110" r="4"/>
  </g>
  <g data-input="tilt-left" class="tilt-mark"><path d="M120 110 l18 -14 v28 z"/></g>
  <g data-input="tilt-right" class="tilt-mark"><path d="M300 110 l-18 -14 v28 z"/></g>
  <g data-input="drift" data-touch="drift" class="touch"><circle cx="82" cy="140" r="30"/><text x="82" y="140">Brake</text></g>
  <g data-input="nitro" data-touch="nitro" class="touch"><circle cx="338" cy="140" r="30"/><text x="338" y="140">Nitro</text></g>
</svg>`;

  const el = svgFrom(markup);
  const groups = Array.from(el.querySelectorAll<SVGGElement>('[data-input]'));
  const horizon = el.querySelector<SVGGElement>('.horizon')!;

  return {
    el,
    set(active) {
      for (const g of groups) g.classList.toggle('on', active.has(g.dataset.input!));
    },
    setTilt(deg: number) {
      horizon.setAttribute('transform', `rotate(${Math.max(-45, Math.min(45, deg))} 210 110)`);
    },
    bind(press: (action: ActionId, down: boolean, t: number) => void) {
      for (const g of el.querySelectorAll<SVGGElement>('[data-touch]')) {
        const action = g.dataset.touch as ActionId;
        const down = (e: PointerEvent) => { e.preventDefault(); g.setPointerCapture?.(e.pointerId); press(action, true, e.timeStamp); };
        const up = (e: PointerEvent) => { e.preventDefault(); press(action, false, e.timeStamp); };
        g.addEventListener('pointerdown', down);
        g.addEventListener('pointerup', up);
        g.addEventListener('pointercancel', up);
        g.addEventListener('contextmenu', (e) => e.preventDefault());
      }
    },
  };
}
