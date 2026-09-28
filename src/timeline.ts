import { h } from './ui';

/**
 * A line from 0 to the end of the drill, with one dot that runs along it.
 * Steps flagged `mark` in the mechanic file show as a hollow ring on the line:
 * the spot where the user has to act.
 */
export class Timeline {
  private root: HTMLElement;
  private head: HTMLElement;
  private end = 1;

  constructor(root: HTMLElement) {
    this.root = root;
    root.className = 'tl';
    this.head = h('div', { class: 'tl-head' });
    this.head.hidden = true;
    root.replaceChildren(h('div', { class: 'tl-rope' }), this.head);
  }

  private x(t: number): number {
    return (Math.min(Math.max(t, 0), this.end) / this.end) * 100;
  }

  build(end: number, marks: number[] = []) {
    this.end = Math.max(1, end);
    this.head.hidden = true;
    this.root.replaceChildren(h('div', { class: 'tl-rope' }));
    for (const t of marks) {
      const ring = h('div', { class: 'tl-mark' });
      ring.style.left = `${this.x(t)}%`;
      this.root.append(ring);
    }
    this.root.append(this.head);
  }

  setHead(t: number | null) {
    if (t === null) { this.head.hidden = true; return; }
    this.head.hidden = false;
    this.head.style.left = `${this.x(t)}%`;
  }
}
