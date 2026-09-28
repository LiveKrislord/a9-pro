import type { ActionId, ResolvedSequence } from './types';
import { pressedAt } from './sequence';

/** Plays a resolved sequence on a nominal clock, at a chosen speed. */
export class Playback {
  private seq: ResolvedSequence | null = null;
  private raf = 0;
  private wallRef = 0;
  private tRef = 0;
  t = 0;
  playing = false;
  speed = 1;

  constructor(private readonly onFrame: () => void) {}

  load(seq: ResolvedSequence) {
    this.seq = seq;
    this.pause();
    this.t = seq.startT;
    this.onFrame();
  }

  play() {
    if (!this.seq) return;
    if (this.t >= this.seq.endT) this.t = this.seq.startT;
    this.playing = true;
    this.wallRef = performance.now();
    this.tRef = this.t;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.onFrame();
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  setSpeed(s: number) {
    this.tRef = this.t;
    this.wallRef = performance.now();
    this.speed = s;
  }

  seek(t: number) {
    this.t = t;
    this.tRef = t;
    this.wallRef = performance.now();
    this.onFrame();
  }

  next() {
    if (!this.seq) return;
    const n = this.stepTimes().find((x) => x > this.t + 1);
    this.pause();
    this.seek(n ?? this.seq.endT);
  }

  prev() {
    if (!this.seq) return;
    const before = this.stepTimes().filter((x) => x < this.t - 1);
    this.pause();
    this.seek(before.length ? before[before.length - 1] : this.seq.startT);
  }

  pressed(): Set<ActionId> {
    return this.seq ? pressedAt(this.seq, this.t) : new Set();
  }

  private stepTimes(): number[] {
    if (!this.seq) return [];
    return Array.from(new Set([...this.seq.steps.map((s) => s.t), this.seq.endT])).sort((a, b) => a - b);
  }

  private loop = () => {
    if (!this.playing || !this.seq) return;
    this.t = this.tRef + (performance.now() - this.wallRef) * this.speed;
    if (this.t >= this.seq.endT) {
      this.t = this.seq.endT;
      this.playing = false;
      this.onFrame();
      return;
    }
    this.onFrame();
    this.raf = requestAnimationFrame(this.loop);
  };
}
