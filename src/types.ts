export type ControllerKind = 'xbox' | 'dualsense' | 'keyboard';

export type ActionId =
  | 'accelerate'
  | 'brake'
  | 'drift'
  | 'nitro'
  | 'steer-left'
  | 'steer-right';

export type PadInput =
  | 'south' | 'east' | 'west' | 'north'
  | 'lb' | 'rb' | 'lt' | 'rt'
  | 'ls-left' | 'ls-right' | 'ls-up' | 'ls-down'
  | 'dpad-left' | 'dpad-right' | 'dpad-up' | 'dpad-down';

export interface ParamOption { label: string; value: number | string }
export interface ParamDef {
  label: string;
  default: number | string;
  options: ParamOption[];
  /** Also allow typing any number in this range, next to the presets. */
  custom?: { min: number; max: number; unit?: string };
}
export type ParamValues = Record<string, number | string>;

export type StepKind = 'tap' | 'hold' | 'marker';
export type Bound = number | string;

/** A step as written in a mechanism's frontmatter. Strings may contain {param}. */
export interface StepDef {
  id: string;
  do: StepKind;
  label?: string;
  /** One-word label shown on the timeline. Defaults to the label. */
  short?: string;
  /** Show a ring on the timeline at this step: the spot where the user must act. */
  mark?: boolean;
  action?: string;
  /** Reference step id. Defaults to the previous step. */
  after?: string;
  /** Nominal offset (ms) from the reference step, used for playback. */
  at?: number | string;
  /** Scoring bounds (ms) relative to the reference step. 'start' / 'end' are open bounds. */
  window?: [Bound, Bound];
  /** Playback press length for a tap. */
  tapMs?: number;
  /** Playback hold length for a hold that is not held until the end. */
  holdMs?: number | string;
  /** The hold must persist until the drill ends. */
  heldUntil?: 'end';
  /** For a hold: the press must be released between these many ms after it started. */
  holdWindow?: [number, number];
  /** Step ids whose action must be down when this step is pressed. */
  requires?: string[];
}

export interface MechanismDef {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  params?: Record<string, ParamDef>;
  /** Extra values computed from a param, e.g. the side opposite to the chosen corner. */
  derived?: Record<string, { from: string; map: Record<string, number | string> }>;
  sequence: StepDef[];
  end?: { after: string; at: number | string };
  /** Optional clip shown at the top of Details, with a credit line. */
  video?: { youtube: string; credit?: string; note?: string };
  /**
   * 'sequence' (default) scores the steps above; 'loop' repeats `loop` until a duration is up;
   * 'count' counts completed `count.pattern` repetitions for a duration, order only.
   */
  type?: 'sequence' | 'loop' | 'count';
  loop?: LoopDef;
  count?: CountDef;
  bodyHtml: string;
}

/** A counting drill: how many times the press pattern is completed before the duration ends. */
export interface CountDef {
  /** One press that opens the run, made once. The clock starts on it. */
  entry?: { action: ActionId; label?: string };
  /** The presses that repeat. Each completed pass through them counts one. */
  pattern: { action: ActionId; label?: string }[];
  /** Param name (from `params`) that gives the duration in ms. */
  durationParam: string;
  /** Actions that must be held for presses to count. May contain {param}. */
  requireHeld?: string[];
  /** Name for one completed pattern, plural, e.g. "Punch drifts". */
  unitLabel?: string;
  /** Inside one pass of the pattern, each press must follow the previous within this many ms. Default 300. */
  maxGapMs?: number;
}

/** A repeating drill: hold an action for a distance window, nitro in the gap, repeat until time is up. */
export interface LoopDef {
  action: ActionId;
  minMeters: number;
  maxMeters: number;
  /** Param names (from `params`) that give speed in km/h and duration in ms. */
  speedParam: string;
  durationParam: string;
  gapNitro?: 'required' | 'optional';
  /** Max delay from the nitro tap to the next drift press (ms). Default 200. */
  driftAfterNitroMs?: number;
}

export interface ResolvedStep {
  id: string;
  kind: StepKind;
  label: string;
  short: string;
  mark: boolean;
  action: ActionId | null;
  after: string | null;
  at: number;
  window: [number, number];
  tapMs: number;
  holdMs: number;
  heldUntil: boolean;
  holdWindow: [number, number] | null;
  requires: string[];
  /** Nominal absolute time on the playback timeline (ms, first step = 0). */
  t: number;
}

export interface ResolvedSequence {
  steps: ResolvedStep[];
  end: { after: string | null; at: number };
  endT: number;
  startT: number;
}

export interface InputEvent { action: ActionId; down: boolean; t: number }
