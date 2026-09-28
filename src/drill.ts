import type { ActionId, InputEvent, ResolvedSequence, ResolvedStep } from './types';

export type DrillPhase = 'idle' | 'armed' | 'running' | 'done';
export type StepStatus = 'pending' | 'pass' | 'fail';

export interface StepResult {
  step: ResolvedStep;
  status: StepStatus;
  /** Actual press time (absolute, performance.now clock). */
  t: number | null;
  /** Actual offset from the reference step (ms). */
  offset: number | null;
  note: string;
}

const HARD_TIMEOUT = 20000;

/**
 * Scores a user's inputs against a resolved sequence.
 * The first step is the trigger: the drill starts on its first press after arming.
 * Every later step is matched to the earliest unconsumed press of its action inside
 * its window, measured from the actual time of its reference step.
 */
export class Drill {
  phase: DrillPhase = 'idle';
  t0: number | null = null;
  endT: number | null = null;
  pass: boolean | null = null;
  times = new Map<string, number>();
  results = new Map<string, StepResult>();
  events: InputEvent[] = [];
  private consumed = new Set<number>();
  private failed = false;
  private armedAt = 0;

  constructor(readonly seq: ResolvedSequence) { this.reset(); }

  reset() {
    this.phase = 'idle';
    this.t0 = null;
    this.endT = null;
    this.pass = null;
    this.times = new Map();
    this.results = new Map(this.seq.steps.map((s) => [s.id, { step: s, status: 'pending', t: null, offset: null, note: '' } as StepResult]));
    this.events = [];
    this.consumed = new Set();
    this.failed = false;
  }

  /** Start listening. `held` = actions already down at this moment. */
  arm(now: number, held: Iterable<ActionId>) {
    this.reset();
    this.phase = 'armed';
    this.armedAt = now;
    for (const a of held) this.events.push({ action: a, down: true, t: now });
  }

  input(e: InputEvent) {
    if (this.phase !== 'armed' && this.phase !== 'running') return;
    this.events.push(e);
    this.evaluate(e.t);
  }

  tick(now: number) {
    if (this.phase === 'armed' || this.phase === 'running') this.evaluate(now);
  }

  /** Step times as currently known: actual where matched, projected from nominal offsets otherwise. */
  projected(): { times: Map<string, number>; endT: number } {
    const base = this.t0 ?? 0;
    const m = new Map<string, number>();
    for (const s of this.seq.steps) {
      const known = this.times.get(s.id);
      if (known !== undefined) { m.set(s.id, known); continue; }
      const ref = s.after ? m.get(s.after)! : base;
      m.set(s.id, ref + s.at);
    }
    const endRef = this.seq.end.after ? m.get(this.seq.end.after)! : base;
    return { times: m, endT: endRef + this.seq.end.at };
  }

  private isDown(action: ActionId, t: number): boolean {
    let d = false;
    for (const e of this.events) {
      if (e.t > t) break;
      if (e.action === action) d = e.down;
    }
    return d;
  }

  private findPress(action: ActionId, lo: number, hi: number): number {
    return this.events.findIndex((e, i) => !this.consumed.has(i) && e.down && e.action === action && e.t >= lo && e.t <= hi);
  }

  private evaluate(now: number) {
    const steps = this.seq.steps;
    const first = steps[0];

    if (this.phase === 'armed') {
      if (!first.action) return;
      const i = this.findPress(first.action, this.armedAt, Infinity);
      if (i < 0) return;
      const e = this.events[i];
      this.consumed.add(i);
      this.t0 = e.t;
      this.times.set(first.id, e.t);
      this.results.set(first.id, { step: first, status: 'pass', t: e.t, offset: 0, note: '' });
      this.phase = 'running';
    }

    for (let k = 1; k < steps.length; k++) {
      const s = steps[k];
      const r = this.results.get(s.id)!;
      if (r.status !== 'pending') continue;
      const ref = s.after ? this.times.get(s.after) : this.t0!;
      if (ref === undefined) continue;

      if (s.kind === 'marker') {
        const t = ref + s.at;
        this.times.set(s.id, t);
        if (now >= t) { r.status = 'pass'; r.t = t; r.offset = s.at; }
        continue;
      }
      if (!s.action) continue;

      const lo = ref + s.window[0];
      const hi = ref + s.window[1];
      const i = this.findPress(s.action, lo, hi);
      if (i >= 0) {
        const e = this.events[i];
        this.consumed.add(i);
        this.times.set(s.id, e.t);
        r.t = e.t;
        r.offset = e.t - ref;
        r.status = 'pass';
        for (const reqId of s.requires) {
          const rs = steps.find((x) => x.id === reqId);
          if (rs?.action && !this.isDown(rs.action, e.t)) {
            r.status = 'fail';
            r.note = `${rs.label.toLowerCase()} not held at this press`;
            this.failed = true;
          }
        }
        continue;
      }
      if (now > hi) {
        r.status = 'fail';
        this.failed = true;
        const early = this.events
          .map((e, idx) => ({ e, idx }))
          .filter(({ e, idx }) => !this.consumed.has(idx) && e.down && e.action === s.action && e.t < lo)
          .pop();
        if (early) {
          r.t = early.e.t;
          r.offset = early.e.t - ref;
          r.note = `too early by ${Math.round(lo - early.e.t)} ms`;
        } else {
          r.note = 'missed';
        }
      }
    }

    const endRef = this.seq.end.after ? this.times.get(this.seq.end.after) : this.t0;
    this.endT = endRef !== undefined && endRef !== null ? endRef + this.seq.end.at : null;
    const timedOut = this.t0 !== null && now - this.t0 > HARD_TIMEOUT;
    if ((this.endT !== null && now >= this.endT) || (this.endT === null && this.failed) || timedOut) this.finish(now);
  }

  private finish(now: number) {
    const end = this.endT ?? now;
    for (const s of this.seq.steps) {
      const r = this.results.get(s.id)!;
      if (s.kind === 'marker') {
        if (r.status === 'pending') { r.status = this.times.has(s.id) ? 'pass' : 'fail'; r.note = r.status === 'fail' ? 'not reached' : ''; }
        continue;
      }
      if (r.status === 'pass' && s.heldUntil && s.action && r.t !== null) {
        const release = this.events.find((e) => !e.down && e.action === s.action && e.t > r.t! && e.t <= end);
        if (release) {
          r.status = 'fail';
          r.note = `released ${Math.round(end - release.t)} ms before the end`;
        }
      }
      if (r.status === 'pending') { r.status = 'fail'; r.note = 'not reached'; }
    }
    this.pass = this.seq.steps.every((s) => s.kind === 'marker' || this.results.get(s.id)!.status === 'pass');
    this.phase = 'done';
  }
}
