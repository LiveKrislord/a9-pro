import type { ActionId, ControllerKind, PadInput } from './types';

/** `pad` is null for actions that have no pad button (Asphalt 9 accelerates on its own). */
export interface ActionBinding { label: string; pad: PadInput | null; key: string; keyLabel: string }

/**
 * Default bindings, confirmed by the user for Xbox and keyboard. DualSense mirrors Xbox by position.
 * In Asphalt 9 the drift is the brake tap, so `brake` and `drift` share one input.
 * `pad` uses the standard gamepad mapping (south = A / Cross, west = X / Square ...).
 * `key` is a KeyboardEvent.code.
 */
export const ACTIONS: Record<ActionId, ActionBinding> = {
  accelerate:    { label: 'Accelerate',  pad: null,       key: 'ArrowUp',    keyLabel: 'Up' },
  brake:         { label: 'Brake',       pad: 'west',     key: 'KeyS',       keyLabel: 'S' },
  drift:         { label: 'Drift',       pad: 'west',     key: 'KeyS',       keyLabel: 'S' },
  nitro:         { label: 'Nitro',       pad: 'south',    key: 'Space',      keyLabel: 'Space' },
  'steer-left':  { label: 'Steer left',  pad: 'ls-left',  key: 'ArrowLeft',  keyLabel: 'Left' },
  'steer-right': { label: 'Steer right', pad: 'ls-right', key: 'ArrowRight', keyLabel: 'Right' },
};

/**
 * Inputs shared by two actions resolve to the first of these, so a brake press is
 * reported as `drift`. Drills that need plain braking can list `brake` explicitly later.
 */
const SHARED_INPUT_PRIORITY: ActionId[] = ['drift', 'brake'];

/** Extra keys that trigger the same action (not drawn as the canonical key). */
const KEY_ALIASES: Record<string, ActionId> = {
  ArrowDown: 'drift',
};

/**
 * Alternative pad layout, accepted at the same time: LB / LT drift, RB / RT nitro.
 * D-pad doubles as steering. Aliases light up the canonical button on the diagram.
 */
const PAD_ALIASES: Partial<Record<PadInput, ActionId>> = {
  lb: 'drift',
  lt: 'drift',
  rb: 'nitro',
  rt: 'nitro',
  'dpad-left': 'steer-left',
  'dpad-right': 'steer-right',
};

export const PAD_LABELS: Record<'xbox' | 'dualsense', Record<PadInput, string>> = {
  xbox: {
    south: 'A', east: 'B', west: 'X', north: 'Y',
    lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT',
    'ls-left': 'LS left', 'ls-right': 'LS right', 'ls-up': 'LS up', 'ls-down': 'LS down',
    'dpad-left': 'D-pad left', 'dpad-right': 'D-pad right', 'dpad-up': 'D-pad up', 'dpad-down': 'D-pad down',
  },
  dualsense: {
    south: 'Cross', east: 'Circle', west: 'Square', north: 'Triangle',
    lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2',
    'ls-left': 'L left', 'ls-right': 'L right', 'ls-up': 'L up', 'ls-down': 'L down',
    'dpad-left': 'D-pad left', 'dpad-right': 'D-pad right', 'dpad-up': 'D-pad up', 'dpad-down': 'D-pad down',
  },
};

export function inputLabel(action: ActionId, kind: ControllerKind): string {
  const b = ACTIONS[action];
  if (kind === 'keyboard') return b.keyLabel;
  if (kind === 'tilt') return b.label;
  return b.pad ? PAD_LABELS[kind][b.pad] : '';
}

/** Phone layout: diagram ids are the actions themselves, steering shows as tilt marks. */
const TILT_INPUTS: Partial<Record<ActionId, string>> = {
  drift: 'drift',
  brake: 'drift',
  nitro: 'nitro',
  'steer-left': 'tilt-left',
  'steer-right': 'tilt-right',
};

function pick(matches: ActionId[]): ActionId | null {
  if (matches.length === 0) return null;
  for (const p of SHARED_INPUT_PRIORITY) if (matches.includes(p)) return p;
  return matches[0];
}

export function actionForKey(code: string): ActionId | null {
  const matches = (Object.entries(ACTIONS) as [ActionId, ActionBinding][]).filter(([, b]) => b.key === code).map(([id]) => id);
  return pick(matches) ?? KEY_ALIASES[code] ?? null;
}

export function actionForPad(input: PadInput): ActionId | null {
  const matches = (Object.entries(ACTIONS) as [ActionId, ActionBinding][]).filter(([, b]) => b.pad === input).map(([id]) => id);
  return pick(matches) ?? PAD_ALIASES[input] ?? null;
}

/** Diagram element ids for a set of actions on a given controller. */
export function actionsToInputs(actions: Iterable<ActionId>, kind: ControllerKind): Set<string> {
  const out = new Set<string>();
  for (const a of actions) {
    if (kind === 'tilt') { const id = TILT_INPUTS[a]; if (id) out.add(id); continue; }
    if (kind !== 'keyboard') { const p = ACTIONS[a].pad; if (p) out.add(p); continue; }
    out.add(ACTIONS[a].key);
    // Keys that mean the same thing light up together (S and Down both brake).
    for (const [code, alias] of Object.entries(KEY_ALIASES)) if (alias === a) out.add(code);
  }
  return out;
}
