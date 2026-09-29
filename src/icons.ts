import floatIcon from './assets/float-icon.png';
import momentumIcon from './assets/momentum-icon.png';
import speedIcon from './assets/speed-icon.png';

/**
 * Line icons for the home cards, 32px, drawn in the current text colour.
 * Kept as strings so they can be dropped into innerHTML.
 */
const wrap = (body: string) =>
  `<svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** A car seen from the rear three-quarter, turning left, tyre smoke trailing behind it. */
export const ICON_FLOAT = wrap(`
  <path d="M27 14.5v6.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 15 21v-6.5"/>
  <path d="M15 14.5 17 12.5h8l2 2z"/>
  <path d="M18.5 14.5h5v3h-5z"/>
  <path d="M15 14.5 9.5 11.5 8 13l.5 6.5 6.5 2"/>
  <path d="M8.2 13.4 9.8 12.4"/>
  <circle cx="18" cy="23.5" r="1.5"/>
  <circle cx="24.5" cy="23.5" r="1.5"/>
  <circle cx="10.5" cy="21" r="1.3"/>
  <circle cx="28.5" cy="26" r="1.8"/>
  <circle cx="25" cy="28.5" r="2.2"/>
  <circle cx="30" cy="29.5" r="1.2"/>
`);

/** A speed gauge with the needle held high. */
export const ICON_SPEED = wrap(`
  <path d="M5 23A11.5 11.5 0 0 1 27 23"/>
  <path d="M16 8.5v2.5M8.2 11.8l1.8 1.8M23.8 11.8 22 13.6M6 18.5l2.4.6M26 18.5l-2.4.6"/>
  <path d="M16 23 23.5 14"/>
  <circle cx="16" cy="23" r="1.6"/>
  <path d="M9 27h14"/>
`);

/** A car leaving a ramp, ground ahead, motion lines behind. */
export const ICON_MOMENTUM = wrap(`
  <path d="M3 26 13 20"/>
  <path d="M19 27h10"/>
  <path d="M13.5 15.5l2.5-3.5h6.5l3 3.5h2.5a1 1 0 0 1 1 1v2.5H13z"/>
  <path d="M16.5 12v3.5M22.5 12v3.5"/>
  <circle cx="16.5" cy="20" r="1.5"/>
  <circle cx="25" cy="20" r="1.5"/>
  <path d="M4 12h5M3 15.5h3.5"/>
`);

/** Hand-drawn drifting car (white on transparent), scaled to the card icon size. */
export const ICON_FLOAT_IMAGE = `<img src="${floatIcon}" alt="" width="32" height="32">`;
export const ICON_MOMENTUM_IMAGE = `<img src="${momentumIcon}" alt="" width="32" height="32">`;
export const ICON_SPEED_IMAGE = `<img src="${speedIcon}" alt="" width="32" height="32">`;

export const CATEGORY_ICON: Record<string, string> = {
  'Make it float': ICON_FLOAT_IMAGE,
  'No speed lose': ICON_SPEED_IMAGE,
  'Gain momentum': ICON_MOMENTUM_IMAGE,
};
