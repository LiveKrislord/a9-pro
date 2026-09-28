import type { ActionId, ControllerKind, PadInput } from './types';

export interface ActionBinding { label: string; pad: PadInput; key: string; keyLabel: string }

/**
 * Default bindings. PLACEHOLDERS: correct these to the real in-game layout.
 * `pad` uses the standard gamepad mapping (south = A / Cross, east = B / Circle ...).
 * `key` is a KeyboardEvent.code.
 */
export const ACTIONS: Record<ActionId, ActionBinding> = {
  accelerate:    { label: 'Accelerate',  pad: 'rt',       key: 'ArrowUp',    keyLabel: '↑' },
  brake:         { label: 'Brake',       pad: 'lt',       key: 'ArrowDown',  keyLabel: '↓' },
  drift:         { label: 'Drift',       pad: 'east',     key: 'Space',      keyLabel: 'Space' },
  nitro:         { label: 'Nitro',       pad: 'south',    key: 'ShiftLeft',  keyLabel: 'Shift' },
  'steer-left':  { label: 'Steer left',  pad: 'ls-left',  key: 'ArrowLeft',  keyLabel: '←' },
  'steer-right': { label: 'Steer right', pad: 'ls-right', key: 'ArrowRight', keyLabel: '→' },
};

/** Extra keys that trigger the same action (not drawn as the canonical key). */
const KEY_ALIASES: Record<string, ActionId> = {
  KeyW: 'accelerate',
  KeyS: 'brake',
  KeyA: 'steer-left',
  KeyD: 'steer-right',
  ShiftRight: 'nitro',
};

/** D-pad doubles as steering. */
const PAD_ALIASES: Partial<Record<PadInput, ActionId>> = {
  'dpad-left': 'steer-left',
  'dpad-right': 'steer-right',
};

export const PAD_LABELS: Record<'xbox' | 'dualsense', Record<PadInput, string>> = {
  xbox: {
    south: 'A', east: 'B', west: 'X', north: 'Y',
    lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT',
    'ls-left': 'LS ←', 'ls-right': 'LS →', 'ls-up': 'LS ↑', 'ls-down': 'LS ↓',
    'dpad-left': 'D-pad ←', 'dpad-right': 'D-pad →', 'dpad-up': 'D-pad ↑', 'dpad-down': 'D-pad ↓',
  },
  dualsense: {
    south: '✕', east: '○', west: '□', north: '△',
    lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2',
    'ls-left': 'L ←', 'ls-right': 'L →', 'ls-up': 'L ↑', 'ls-down': 'L ↓',
    'dpad-left': 'D-pad ←', 'dpad-right': 'D-pad →', 'dpad-up': 'D-pad ↑', 'dpad-down': 'D-pad ↓',
  },
};

export function inputLabel(action: ActionId, kind: ControllerKind): string {
  const b = ACTIONS[action];
  return kind === 'keyboard' ? b.keyLabel : PAD_LABELS[kind][b.pad];
}

export function actionForKey(code: string): ActionId | null {
  for (const [id, b] of Object.entries(ACTIONS) as [ActionId, ActionBinding][]) if (b.key === code) return id;
  return KEY_ALIASES[code] ?? null;
}

export function actionForPad(input: PadInput): ActionId | null {
  for (const [id, b] of Object.entries(ACTIONS) as [ActionId, ActionBinding][]) if (b.pad === input) return id;
  return PAD_ALIASES[input] ?? null;
}

/** Diagram element ids for a set of actions on a given controller. */
export function actionsToInputs(actions: Iterable<ActionId>, kind: ControllerKind): Set<string> {
  const out = new Set<string>();
  for (const a of actions) out.add(kind === 'keyboard' ? ACTIONS[a].key : ACTIONS[a].pad);
  return out;
}
