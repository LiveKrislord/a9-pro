import type { ActionId, InputEvent } from './types';

export type DrillPhase = 'idle' | 'armed' | 'running' | 'done';

/** One line of the results table. */
export interface ResultRow {
  label: string;
  action: string;
  status: 'pass' | 'fail' | 'info';
  you: string;
  allowed: string;
}

/** One line of the step list under the timeline. */
export interface LegendLine { lead: string; text: string }

/** What the page needs from any drill, fixed sequence or repeating loop. */
export interface DrillEngine {
  readonly phase: DrillPhase;
  /** Absolute time of the first press, once the run has started. */
  readonly t0: number | null;
  readonly endT: number | null;
  readonly pass: boolean | null;
  arm(now: number, held: Iterable<ActionId>): void;
  input(e: InputEvent): void;
  tick(now: number): void;
  /** Timeline geometry relative to the first press: total length and ring positions. */
  timeline(): { end: number; marks: number[] };
  legend(): LegendLine[];
  rows(): ResultRow[];
  failReason(): string | null;
  /** Shown while armed, e.g. "drift tap 1". */
  waitingFor(): string;
  /** A number worth keeping as a personal best, once the run is done. Null if the mechanic has none. */
  score(): Score | null;
}

export interface Score {
  label: string;
  value: number;
  unit: string;
  lowerIsBetter: boolean;
}
