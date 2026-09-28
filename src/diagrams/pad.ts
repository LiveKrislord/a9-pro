import { PAD_LABELS } from '../mapping';
import type { Diagram } from './index';
import { svgFrom } from './svg';

const STICK_TRAVEL = 9;

export function padDiagram(kind: 'xbox' | 'dualsense'): Diagram {
  const L = PAD_LABELS[kind];
  // Xbox: left stick top-left, d-pad bottom-left. DualSense: mirrored.
  const [lsx, lsy] = kind === 'xbox' ? [105, 105] : [150, 160];
  const [dpx, dpy] = kind === 'xbox' ? [150, 160] : [105, 105];
  const [rsx, rsy] = [250, 160];
  const [fx, fy] = [300, 105];

  const circleBtn = (id: string, cx: number, cy: number, label: string) =>
    `<g data-input="${id}"><circle cx="${cx}" cy="${cy}" r="13"/><text x="${cx}" y="${cy}">${label}</text></g>`;
  const dpadArm = (id: string, x: number, y: number) =>
    `<g data-input="${id}"><rect x="${x}" y="${y}" width="16" height="16" rx="3"/></g>`;
  const stick = (id: string, cx: number, cy: number, r: number) =>
    `<g data-input="${id}" class="stick"><circle class="well" cx="${cx}" cy="${cy}" r="${r}"/><circle class="nub" cx="${cx}" cy="${cy}" r="${r * 0.55}"/></g>`;

  const markup = `
<svg viewBox="0 0 400 236" xmlns="http://www.w3.org/2000/svg" class="diagram" role="img" aria-label="${kind} controller">
  <path class="body" d="M95 50 h210 a60 60 0 0 1 60 60 v20 a35 35 0 0 1 -35 35 l-18 55 a22 22 0 0 1 -40 2 l-20 -42 h-104 l-20 42 a22 22 0 0 1 -40 -2 l-18 -55 a35 35 0 0 1 -35 -35 v-20 a60 60 0 0 1 60 -60 z"/>
  <g data-input="lt"><rect x="70" y="14" width="50" height="18" rx="6"/><text x="95" y="23">${L.lt}</text></g>
  <g data-input="lb"><rect x="60" y="36" width="70" height="12" rx="4"/><text x="95" y="42" class="small">${L.lb}</text></g>
  <g data-input="rt"><rect x="280" y="14" width="50" height="18" rx="6"/><text x="305" y="23">${L.rt}</text></g>
  <g data-input="rb"><rect x="270" y="36" width="70" height="12" rx="4"/><text x="305" y="42" class="small">${L.rb}</text></g>
  ${stick('ls', lsx, lsy, 24)}
  ${stick('rs', rsx, rsy, 20)}
  ${dpadArm('dpad-up', dpx - 8, dpy - 24)}
  ${dpadArm('dpad-down', dpx - 8, dpy + 8)}
  ${dpadArm('dpad-left', dpx - 24, dpy - 8)}
  ${dpadArm('dpad-right', dpx + 8, dpy - 8)}
  ${circleBtn('north', fx, fy - 25, L.north)}
  ${circleBtn('west', fx - 25, fy, L.west)}
  ${circleBtn('east', fx + 25, fy, L.east)}
  ${circleBtn('south', fx, fy + 25, L.south)}
</svg>`;

  const el = svgFrom(markup);
  const groups = Array.from(el.querySelectorAll<SVGGElement>('[data-input]'));
  const ls = el.querySelector<SVGGElement>('[data-input="ls"]')!;
  const nub = ls.querySelector<SVGCircleElement>('.nub')!;

  return {
    el,
    set(active) {
      for (const g of groups) g.classList.toggle('on', active.has(g.dataset.input!));
      const dx = (active.has('ls-right') ? 1 : 0) - (active.has('ls-left') ? 1 : 0);
      const dy = (active.has('ls-down') ? 1 : 0) - (active.has('ls-up') ? 1 : 0);
      ls.classList.toggle('on', dx !== 0 || dy !== 0);
      nub.setAttribute('transform', `translate(${dx * STICK_TRAVEL} ${dy * STICK_TRAVEL})`);
    },
  };
}
