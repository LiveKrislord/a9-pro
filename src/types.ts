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
export interface ParamDef { label: string; default: number | string; options: ParamOption[] }
export type ParamValues = Record<string, number | string>;

export type StepKind = 'tap' | 'hold' | 'marker';
export type Bound = number | string;

/** A step as written in a mechanism's frontmatter. Strings may contain {param}. */
export interface StepDef {
  id: string;
  do: StepKind;
  label?: string;
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
  holdMs?: number;
  /** The hold must persist until the drill ends. */
  heldUntil?: 'end';
  /** Step ids whose action must be down when this step is pressed. */
  requires?: string[];
}

export interface MechanismDef {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  params?: Record<string, ParamDef>;
  sequence: StepDef[];
  end?: { after: string; at: number | string };
  bodyHtml: string;
}

export interface ResolvedStep {
  id: string;
  kind: StepKind;
  label: string;
  action: ActionId | null;
  after: string | null;
  at: number;
  window: [number, number];
  tapMs: number;
  holdMs: number;
  heldUntil: boolean;
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
