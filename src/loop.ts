import type { ActionId, InputEvent, LoopDef, ParamValues, ResolvedSequence, ResolvedStep } from './types';
import type { DrillEngine, DrillPhase, LegendLine, ResultRow, Score } from './engine';
import type { DriftMode } from './sequence';

/** Resolved numbers for one run of a loop drill. */
export interface LoopRules {
  action: ActionId;
  minMeters: number;
  maxMeters: number;
  speedKmh: number;
  minMs: number;
  maxMs: number;
  durationMs: number;
  gapNitro: 'required' | 'optional';
  /** The next drift must start within this many ms after the nitro tap. */
  afterNitroMs: number;
  driftMode: DriftMode;
}

export function loopRules(def: LoopDef, params: ParamValues, driftMode: DriftMode): LoopRules {
  const speedKmh = Number(params[def.speedParam]);
  const durationMs = Number(params[def.durationParam]);
  if (!speedKmh || !durationMs) throw new Error('loop drill needs speed and duration params');
  const mps = speedKmh / 3.6;
  return {
    action: def.action,
    minMeters: def.minMeters,
    maxMeters: def.maxMeters,
    speedKmh,
    minMs: Math.round((def.minMeters / mps) * 1000),
    maxMs: Math.round((def.maxMeters / mps) * 1000),
    durationMs,
    gapNitro: def.gapNitro ?? 'optional',
    afterNitroMs: def.driftAfterNitroMs ?? 200,
    driftMode,
  };
}

/** Tutorial rhythm: release, nitro a beat later, brake right after the nitro. */
const RELEASE_TO_NITRO_MS = 120;
const NITRO_TO_DRIFT_MS = 80;

/** A nominal sequence for the tutorial: drift in the middle of the window, nitro in the gap, repeat. */
export function loopSequence(r: LoopRules): ResolvedSequence {
  const steps: ResolvedStep[] = [];
  const mid = Math.round((r.minMs + r.maxMs) / 2);
  const base = (id: string, kind: ResolvedStep['kind'], label: string, action: ActionId, t: number, holdMs: number): ResolvedStep => ({
    id, kind, label, short: label, mark: false, action, after: null, at: t, window: [t, t], tapMs: 80, holdMs, heldUntil: false, holdWindow: null, requires: [], t,
  });
  let t = 0;
  let i = 1;
  while (t + mid <= r.durationMs) {
    steps.push(base(`d${i}`, r.driftMode === 'tap' ? 'tap' : 'hold', `Drift ${i}`, r.action, t, mid));
    const nitroT = t + mid + (r.driftMode === 'tap' ? 0 : RELEASE_TO_NITRO_MS);
    if (nitroT < r.durationMs) steps.push(base(`n${i}`, 'tap', `Nitro ${i}`, 'nitro', nitroT, 0));
    t = nitroT + NITRO_TO_DRIFT_MS;
    i++;
  }
  return { steps, end: { after: null, at: r.durationMs }, endT: r.durationMs, startT: 0 };
}

interface Drift { start: number; end: number | null; ok: boolean | null; note: string }
interface Gap { nitro: number; nitroT: number | null; ok: boolean | null; note: string }

/**
 * Repeating drill: drift for a distance window, nitro in the gap, again and again until the
 * chosen time is up. The first mistake ends the run.
 */
export class LoopDrill implements DrillEngine {
  phase: DrillPhase = 'idle';
  t0: number | null = null;
  endT: number | null = null;
  pass: boolean | null = null;
  private drifts: Drift[] = [];
  private gaps: Gap[] = [];
  private reason: string | null = null;
  private armedAt = 0;

  constructor(readonly rules: LoopRules) {}

  arm(now: number, _held: Iterable<ActionId>) {
    this.phase = 'armed';
    this.t0 = null;
    this.endT = null;
    this.pass = null;
    this.drifts = [];
    this.gaps = [];
    this.reason = null;
    this.armedAt = now;
  }

  private get current(): Drift | null {
    const d = this.drifts[this.drifts.length - 1];
    return d && d.end === null ? d : null;
  }

  private meters(ms: number): string {
    return ((ms / 1000) * (this.rules.speedKmh / 3.6)).toFixed(1);
  }

  private fail(reason: string) {
    this.reason = reason;
    this.pass = false;
    this.phase = 'done';
  }

  private endDrift(d: Drift, t: number) {
    d.end = t;
    const len = t - d.start;
    if (len < this.rules.minMs) { d.ok = false; d.note = 'too short'; this.fail(`Drift ${this.drifts.length} too short: ${Math.round(len)} ms, about ${this.meters(len)} m`); return; }
    if (len > this.rules.maxMs) { d.ok = false; d.note = 'too long'; this.fail(`Drift ${this.drifts.length} too long: ${Math.round(len)} ms, about ${this.meters(len)} m`); return; }
    d.ok = true;
    this.gaps.push({ nitro: 0, nitroT: null, ok: null, note: '' });
  }

  private startDrift(t: number) {
    const gap = this.gaps[this.gaps.length - 1];
    if (gap) {
      if (this.rules.gapNitro === 'required' && gap.nitro === 0) { gap.ok = false; this.fail(`No nitro tap between drift ${this.drifts.length} and drift ${this.drifts.length + 1}`); return; }
      if (this.rules.gapNitro === 'required' && gap.nitro > 1) { gap.ok = false; this.fail(`${gap.nitro} nitro taps in one gap, only one is allowed`); return; }
      if (gap.nitroT !== null) {
        const delay = t - gap.nitroT;
        gap.note = `brake ${Math.round(delay)} ms after nitro`;
        if (delay > this.rules.afterNitroMs) {
          gap.ok = false;
          this.fail(`Drift ${this.drifts.length + 1} came ${Math.round(delay)} ms after the nitro tap, it must follow within ${this.rules.afterNitroMs} ms`);
          return;
        }
      }
      gap.ok = true;
    }
    this.drifts.push({ start: t, end: null, ok: null, note: '' });
  }

  input(e: InputEvent) {
    if (this.phase === 'armed') {
      if (e.action === this.rules.action && e.down && e.t >= this.armedAt) {
        this.t0 = e.t;
        this.endT = e.t + this.rules.durationMs;
        this.phase = 'running';
        this.startDrift(e.t);
      }
      return;
    }
    if (this.phase !== 'running') return;
    if (this.endT !== null && e.t >= this.endT) { this.finish(); return; }
    const cur = this.current;
    const tap = this.rules.driftMode === 'tap';

    if (e.action === this.rules.action) {
      if (e.down) {
        if (cur && tap) { this.endDrift(cur, e.t); if (this.phase !== 'running') return; }
        if (!this.current) this.startDrift(e.t);
      } else if (cur && !tap) {
        this.endDrift(cur, e.t);
      }
      return;
    }
    if (e.action === 'nitro' && e.down) {
      if (cur && tap) {
        this.endDrift(cur, e.t);
        if (this.phase === 'running') { const g = this.gaps[this.gaps.length - 1]; g.nitro = 1; g.nitroT = e.t; }
        return;
      }
      if (!cur) {
        const gap = this.gaps[this.gaps.length - 1];
        if (gap) { gap.nitro++; gap.nitroT = e.t; }
      }
    }
  }

  tick(now: number) {
    if (this.phase !== 'running') return;
    const cur = this.current;
    if (cur && this.rules.driftMode === 'hold' && now - cur.start > this.rules.maxMs) {
      cur.end = now;
      cur.ok = false;
      cur.note = 'too long';
      this.fail(`Drift ${this.drifts.length} too long: held past ${this.rules.maxMs} ms, about ${this.rules.maxMeters} m`);
      return;
    }
    if (this.endT !== null && now >= this.endT) this.finish();
  }

  private finish() {
    this.pass = true;
    this.phase = 'done';
  }

  timeline() {
    return { end: this.rules.durationMs, marks: [] as number[] };
  }

  legend(): LegendLine[] {
    const r = this.rules;
    const how = r.driftMode === 'tap' ? 'tap, ends on nitro or the next drift' : 'hold';
    const lines: LegendLine[] = [
      { lead: `Drift, ${how}`, text: `${r.minMeters} to ${r.maxMeters} m: ${r.minMs} to ${r.maxMs} ms at ${r.speedKmh} km/h` },
    ];
    if (r.gapNitro === 'required') lines.push({ lead: 'Nitro, tap', text: `once in each gap, then brake again within ${r.afterNitroMs} ms` });
    else lines.push({ lead: 'Nitro, tap', text: 'optional in the gap' });
    lines.push({ lead: 'Repeat', text: `until ${r.durationMs / 1000} s from the first drift` });
    return lines;
  }

  rows(): ResultRow[] {
    const r = this.rules;
    const out: ResultRow[] = [];
    const allowedDrift = `${r.minMs} to ${r.maxMs} ms (${r.minMeters} to ${r.maxMeters} m)`;
    this.drifts.forEach((d, i) => {
      const len = d.end === null ? null : d.end - d.start;
      out.push({
        label: `Drift ${i + 1}`,
        action: 'Drift',
        status: d.ok === null ? 'info' : d.ok ? 'pass' : 'fail',
        you: len === null ? 'in progress at the end' : `${Math.round(len)} ms, about ${this.meters(len)} m${d.note ? `, ${d.note}` : ''}`,
        allowed: allowedDrift,
      });
      const gap = this.gaps[i];
      if (gap && r.gapNitro === 'required' && (gap.ok !== null || i < this.drifts.length - 1)) {
        out.push({
          label: `Gap ${i + 1}`,
          action: 'Nitro',
          status: gap.ok === null ? 'info' : gap.ok ? 'pass' : 'fail',
          you: `${gap.nitro} ${gap.nitro === 1 ? 'tap' : 'taps'}${gap.note ? `, ${gap.note}` : ''}`,
          allowed: `1 tap, then brake within ${r.afterNitroMs} ms`,
        });
      }
    });
    return out;
  }

  failReason(): string | null {
    return this.reason;
  }

  waitingFor(): string {
    return 'the first drift';
  }

  /** Clean drifts chained in the run, counted on passes and fails alike. Higher is better. */
  score(): Score | null {
    if (this.phase !== 'done') return null;
    return { label: 'Drifts chained', value: this.drifts.filter((d) => d.ok).length, unit: '', lowerIsBetter: false };
  }
}
