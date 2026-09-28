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
    this.t = this.restT();
    this.onFrame();
  }

  play() {
    if (!this.seq) return;
    if (this.t >= this.seq.endT || this.t < this.seq.startT) this.t = this.seq.startT;
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

  /** Just before the first step, so nothing shows as pressed until playback starts. */
  /** Stop and go back to the start. */
  reset() {
    this.pause();
    this.seek(this.restT());
  }

  private restT(): number {
    return this.seq ? this.seq.startT - 1 : 0;
  }

  pressed(): Set<ActionId> {
    return this.seq ? pressedAt(this.seq, this.t) : new Set();
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
