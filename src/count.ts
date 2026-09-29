import type { ActionId, CountDef, InputEvent, ParamValues, ResolvedSequence, ResolvedStep } from './types';
import type { DrillEngine, DrillPhase, LegendLine, ResultRow, Score } from './engine';
import { ACTIONS } from './mapping';

export interface CountRules {
  entry: ActionId | null;
  entryLabel: string;
  pattern: ActionId[];
  labels: string[];
  /** Actions that must be held for any press to count, e.g. the stick toward the corner. */
  requireHeld: ActionId[];
  durationMs: number;
  /** What one completed pattern is called in the results and the record. */
  unitLabel: string;
  /** Inside one pass of the pattern, each press must follow the previous within this many ms. */
  maxGapMs: number;
  /** Closing press doubles as the next opener when the pattern starts and ends with the same action. */
  overlap: boolean;
}

function subst(v: string, params: ParamValues): string {
  return v.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

export function countRules(def: CountDef, params: ParamValues): CountRules {
  const durationMs = Number(params[def.durationParam]);
  if (!durationMs) throw new Error('count drill needs a duration param');
  if (def.pattern.length < 1) throw new Error('count drill pattern needs at least one press');
  return {
    entry: def.entry?.action ?? null,
    entryLabel: def.entry?.label ?? (def.entry ? ACTIONS[def.entry.action].label : ''),
    pattern: def.pattern.map((p) => p.action),
    labels: def.pattern.map((p) => p.label ?? ACTIONS[p.action].label),
    requireHeld: (def.requireHeld ?? []).map((a) => subst(a, params) as ActionId),
    durationMs,
    unitLabel: def.unitLabel ?? 'Repetitions',
    maxGapMs: def.maxGapMs ?? 300,
    overlap: def.chain === 'overlap',
  };
}

/** How long past the gap limit the drill keeps waiting, so a late press can be reported with its real gap. */
const LATE_GRACE_MS = 900;

/** Tutorial rhythm: the pattern's presses a beat apart, then a pause, repeated for the duration. */
const PRESS_GAP_MS = 160;
const REPEAT_GAP_MS = 600;

export function countSequence(r: CountRules): ResolvedSequence {
  const steps: ResolvedStep[] = [];
  const step = (id: string, kind: ResolvedStep['kind'], label: string, action: ActionId, at: number, heldUntil: boolean): ResolvedStep => ({
    id, kind, label, short: label, mark: false, action, after: null, at, window: [at, at], tapMs: 80, holdMs: 0, heldUntil, holdWindow: null, requires: [], t: at,
  });
  r.requireHeld.forEach((a, i) => steps.push(step(`h${i}`, 'hold', `${ACTIONS[a].label}, held throughout`, a, 0, true)));
  if (r.entry) steps.push(step('entry', 'tap', r.entryLabel, r.entry, 0, false));
  // Presses inside a pass sit comfortably inside the allowed gap.
  const gap = Math.min(PRESS_GAP_MS, Math.round(r.maxGapMs * 0.7));
  const period = r.pattern.length * gap + REPEAT_GAP_MS;
  let n = 1;
  for (let t = r.entry ? gap : 0; t + (r.pattern.length - 1) * gap <= r.durationMs; t += period, n++) {
    r.pattern.forEach((action, i) => steps.push(step(`p${n}-${i}`, 'tap', r.labels[i], action, t + i * gap, false)));
  }
  return { steps, end: { after: null, at: r.durationMs }, endT: r.durationMs, startT: 0 };
}

/**
 * Counts how many times the pattern is completed, in order, before time runs out.
 * A press out of order, or made without the required actions held, ends the run.
 * When the pattern starts and ends with the same action, the closing press also opens the next one.
 */
export class CountDrill implements DrillEngine {
  phase: DrillPhase = 'idle';
  t0: number | null = null;
  endT: number | null = null;
  pass: boolean | null = null;
  private index = 0;
  private completed: number[] = [];
  private reason: string | null = null;
  private armedAt = 0;
  /** Time of the last press that advanced the pattern. */
  private lastPressT = 0;
  /** Overlap chains: true right after a completed link, until the player continues or restarts. */
  private resting = false;
  /** Every relevant press since arming, so a failed run can show exactly what was received. */
  private log: { action: ActionId; t: number }[] = [];
  private down = new Set<ActionId>();

  constructor(readonly rules: CountRules) {}

  arm(now: number, held: Iterable<ActionId>) {
    this.phase = 'armed';
    this.t0 = null;
    this.endT = null;
    this.pass = null;
    this.index = 0;
    this.completed = [];
    this.reason = null;
    this.resting = false;
    this.log = [];
    this.armedAt = now;
    this.down = new Set(held);
  }

  private heldOk(): boolean {
    return this.rules.requireHeld.every((a) => this.down.has(a));
  }

  input(e: InputEvent) {
    if (e.down) this.down.add(e.action); else this.down.delete(e.action);
    if (!e.down) return;
    const p = this.rules.pattern;
    if ((p.includes(e.action) || e.action === this.rules.entry) && (this.phase === 'armed' || this.phase === 'running')) {
      this.log.push({ action: e.action, t: e.t });
    }
    const opener = this.rules.entry ?? p[0];
    if (this.phase === 'armed') {
      if (e.action !== opener || e.t < this.armedAt) return;
      if (!this.heldOk()) {
        const held = this.rules.requireHeld.map((a) => ACTIONS[a].label.toLowerCase()).join(' and ');
        this.fail(`${ACTIONS[e.action].label} pressed without ${held} held. Push the stick toward the corner first, then start.`);
        return;
      }
      this.t0 = e.t;
      this.endT = e.t + this.rules.durationMs;
      this.phase = 'running';
      this.index = this.rules.entry ? 0 : 1;
      this.lastPressT = e.t;
      return;
    }
    if (this.phase !== 'running') return;
    if (this.endT !== null && e.t >= this.endT) { this.finish(); return; }
    if (!p.includes(e.action) && e.action !== this.rules.entry) return;
    const expected = p[this.index];
    if (!this.heldOk()) {
      const held = this.rules.requireHeld.map((a) => ACTIONS[a].label.toLowerCase()).join(' and ');
      this.fail(`${ACTIONS[e.action].label} pressed with ${held} let go`);
      return;
    }
    // Resting after a completed chain link: a fresh opener restarts without penalty,
    // and the next expected press is not timed against the rest.
    const wasResting = this.resting;
    this.resting = false;
    if (wasResting && e.action === p[0]) { this.lastPressT = e.t; return; }
    if (e.action !== expected) {
      this.fail(`Pressed ${ACTIONS[e.action].label.toLowerCase()}, expected ${ACTIONS[expected].label.toLowerCase()} (${this.rules.labels[this.index].toLowerCase()})`);
      return;
    }
    // Mid-pattern press that came too late: report the real gap.
    if (this.index > 0 && !wasResting) {
      const gap = e.t - this.lastPressT;
      if (gap > this.rules.maxGapMs) {
        const prev = this.rules.labels[this.index - 1].toLowerCase();
        this.fail(`${ACTIONS[e.action].label} came ${Math.round(gap)} ms after the ${prev}, limit ${this.rules.maxGapMs} ms`);
        return;
      }
    }
    this.index++;
    this.lastPressT = e.t;
    if (this.index === p.length) {
      this.completed.push(e.t);
      this.index = this.rules.overlap && p[0] === p[p.length - 1] ? 1 : 0;
      this.resting = this.index === 1;
    }
  }

  private fail(reason: string) {
    this.reason = reason;
    this.pass = false;
    this.phase = 'done';
  }

  tick(now: number) {
    if (this.phase !== 'running') return;
    // Mid-pattern and nothing came for a long while: give up. A merely late press is
    // reported with its real gap when it arrives, see input().
    if (this.index > 0 && !this.resting && now - this.lastPressT > this.rules.maxGapMs + LATE_GRACE_MS) {
      const expected = this.rules.pattern[this.index];
      this.fail(`${ACTIONS[expected].label} (${this.rules.labels[this.index].toLowerCase()}) did not follow within ${this.rules.maxGapMs} ms, nothing came for ${this.rules.maxGapMs + LATE_GRACE_MS} ms`);
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
    const lines: LegendLine[] = this.rules.requireHeld.map((a) => ({ lead: `${ACTIONS[a].label}, hold`, text: 'fully, for the whole run' }));
    if (this.rules.entry) lines.push({ lead: `${ACTIONS[this.rules.entry].label}, tap`, text: `${this.rules.entryLabel} (once)` });
    this.rules.pattern.forEach((a, i) => lines.push({ lead: `${ACTIONS[a].label}, tap`, text: this.rules.labels[i] }));
    const one = this.rules.unitLabel.replace(/s$/, '').toLowerCase();
    lines.push({ lead: 'Timing', text: `inside one ${one}, each press within ${this.rules.maxGapMs} ms of the one before` });
    lines.push({ lead: 'Repeat', text: `for ${this.rules.durationMs / 1000} s from the first press, every completed pattern counts` });
    return lines;
  }

  rows(): ResultRow[] {
    const base = this.t0 ?? 0;
    const unit = this.rules.unitLabel.replace(/s$/, '');
    const out: ResultRow[] = this.completed.map((t, i) => ({
      label: `${unit} ${i + 1}`,
      action: this.rules.pattern.map((a) => ACTIONS[a].label).join(', '),
      status: 'pass',
      you: `at ${((t - base) / 1000).toFixed(2)} s`,
      allowed: '',
    }));
    if (this.reason) out.push({ label: 'Mistake', action: '', status: 'fail', you: this.reason, allowed: '' });
    if (this.phase === 'done') out.push({ label: 'Presses', action: '', status: 'info', you: this.pressLog(), allowed: '' });
    return out;
  }

  failReason(): string | null {
    if (!this.reason) return null;
    return `${this.reason}\n${this.pressLog()}`;
  }

  /** The presses received, timed from the first one, e.g. "brake 0.00 s, nitro 0.21 s". */
  pressLog(): string {
    if (this.log.length === 0) return 'No presses received.';
    const base = this.log[0].t;
    const items = this.log.slice(-12).map((l) => `${ACTIONS[l.action].label.toLowerCase()} ${((l.t - base) / 1000).toFixed(2)} s`);
    return `Presses received${this.log.length > 12 ? ' (last 12)' : ''}: ${items.join(', ')}`;
  }

  waitingFor(): string {
    const first = `the first ${ACTIONS[this.rules.entry ?? this.rules.pattern[0]].label.toLowerCase()} tap`;
    const held = this.rules.requireHeld.map((a) => ACTIONS[a].label.toLowerCase()).join(' and ');
    return held ? `${first}, with ${held} held` : first;
  }

  score(): Score | null {
    if (this.phase !== 'done') return null;
    return { label: this.rules.unitLabel, value: this.completed.length, unit: '', lowerIsBetter: false };
  }
}
