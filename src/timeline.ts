import type { ActionId, ResolvedStep } from './types';
import { h } from './ui';

export interface TLStep {
  step: ResolvedStep;
  index: number;
  /** Press time on the timeline. */
  t: number;
  /** Time of the reference step (window is relative to it). */
  ref: number;
  /** Release time for holds. */
  until: number | null;
}

export interface TLView {
  start: number;
  end: number;
  lanes: { action: ActionId; label: string }[];
  steps: TLStep[];
}

export interface UserSpan { action: ActionId; from: number; to: number | null }

/** A horizontal strip: one lane per action, reference marks, windows, markers, playhead and user input. */
export class Timeline {
  private grid: HTMLElement;
  private axis: HTMLElement;
  private overlay!: HTMLElement;
  private head!: HTMLElement;
  private userLayers = new Map<ActionId, HTMLElement>();
  private view: TLView = { start: 0, end: 1, lanes: [], steps: [] };
  private padStart = 0;
  private padEnd = 1;

  constructor(root: HTMLElement) {
    root.className = 'tl-wrap';
    this.grid = h('div', { class: 'tl' });
    this.axis = h('div', { class: 'tl-axis' });
    root.replaceChildren(this.grid, this.axis);
  }

  private x(t: number): number {
    const c = Math.min(Math.max(t, this.padStart), this.padEnd);
    return ((c - this.padStart) / (this.padEnd - this.padStart)) * 100;
  }

  build(view: TLView) {
    this.view = view;
    const span = Math.max(1, view.end - view.start);
    this.padStart = view.start - span * 0.03;
    this.padEnd = view.end + span * 0.03;
    this.userLayers.clear();
    this.grid.replaceChildren();

    this.grid.append(h('div', { class: 'tl-row tl-header' }, h('div', { class: 'tl-lbl' }), h('div', { class: 'tl-track' })));

    for (const lane of view.lanes) {
      const track = h('div', { class: 'tl-track' });
      for (const s of view.steps.filter((x) => x.step.action === lane.action)) {
        if (s.step.after !== null) {
          const lo = Number.isFinite(s.step.window[0]) ? s.ref + s.step.window[0] : this.padStart;
          const hi = Number.isFinite(s.step.window[1]) ? s.ref + s.step.window[1] : this.padEnd;
          const win = h('div', { class: 'tl-win', title: 'accepted window' });
          win.style.left = `${this.x(lo)}%`;
          win.style.width = `${this.x(hi) - this.x(lo)}%`;
          track.append(win);
        }
        const mark = h('div', { class: s.until !== null && s.step.kind === 'hold' ? 'tl-ref hold' : 'tl-ref' });
        mark.style.left = `${this.x(s.t)}%`;
        if (s.until !== null && s.step.kind === 'hold') mark.style.width = `${this.x(s.until) - this.x(s.t)}%`;
        const num = h('div', { class: 'tl-num' }, String(s.index));
        num.style.left = `${this.x(s.t)}%`;
        track.append(mark, num);
      }
      const userLayer = h('div', { class: 'tl-user-layer' });
      this.userLayers.set(lane.action, userLayer);
      track.append(userLayer);
      this.grid.append(h('div', { class: 'tl-row' }, h('div', { class: 'tl-lbl' }, lane.label), track));
    }

    this.overlay = h('div', { class: 'tl-overlay' });
    for (const s of view.steps.filter((x) => x.step.kind === 'marker')) {
      const m = h('div', { class: 'tl-marker' }, h('span', { class: 'lbl' }, `${s.index} ${s.step.label}`));
      m.style.left = `${this.x(s.t)}%`;
      this.overlay.append(m);
    }
    this.head = h('div', { class: 'tl-head' });
    this.head.hidden = true;
    this.overlay.append(this.head);
    this.grid.append(this.overlay);

    const step = span <= 2500 ? 500 : 1000;
    this.axis.replaceChildren(h('div', { class: 'tl-lbl' }));
    const ticks = h('div', { class: 'tl-track' });
    for (let t = Math.ceil(this.padStart / step) * step; t <= this.padEnd; t += step) {
      const tick = h('span', {}, `${t / 1000} s`);
      tick.style.left = `${this.x(t)}%`;
      ticks.append(tick);
    }
    this.axis.append(ticks);
  }

  setHead(t: number | null) {
    if (t === null) { this.head.hidden = true; return; }
    this.head.hidden = false;
    this.head.style.left = `${this.x(t)}%`;
  }

  setUser(spans: UserSpan[]) {
    for (const layer of this.userLayers.values()) layer.replaceChildren();
    for (const s of spans) {
      const layer = this.userLayers.get(s.action);
      if (!layer) continue;
      const from = this.x(s.from);
      const to = this.x(s.to ?? this.view.end);
      const el = h('div', { class: 'tl-user' });
      el.style.left = `${from}%`;
      el.style.width = `${Math.max(0.4, to - from)}%`;
      layer.append(el);
    }
  }
}
