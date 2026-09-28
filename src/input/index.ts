import type { ActionId, InputEvent, PadInput } from '../types';
import { actionForKey, actionForPad } from '../mapping';

export interface InputStatus { gamepad: string | null }
export interface InputHandle { stop(): void; held(): Set<ActionId> }

const BUTTON_MAP: Record<number, PadInput> = {
  0: 'south', 1: 'east', 2: 'west', 3: 'north',
  4: 'lb', 5: 'rb', 6: 'lt', 7: 'rt',
  12: 'dpad-up', 13: 'dpad-down', 14: 'dpad-left', 15: 'dpad-right',
};
const AXIS_THRESHOLD = 0.5;
const TRIGGER_THRESHOLD = 0.5;

/**
 * Normalizes keyboard events and gamepad polling into action press/release events.
 * Timestamps are on the performance.now() clock.
 */
export function startInput(onEvent: (e: InputEvent) => void, onStatus?: (s: InputStatus) => void): InputHandle {
  const down = new Set<ActionId>();

  const emit = (action: ActionId | null, isDown: boolean, t: number) => {
    if (!action || isDown === down.has(action)) return;
    if (isDown) down.add(action); else down.delete(action);
    onEvent({ action, down: isDown, t });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const a = actionForKey(e.code);
    if (a) { e.preventDefault(); emit(a, true, e.timeStamp); }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const a = actionForKey(e.code);
    if (a) { e.preventDefault(); emit(a, false, e.timeStamp); }
  };
  const onBlur = () => { for (const a of Array.from(down)) emit(a, false, performance.now()); };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  let raf = 0;
  let lastId: string | null = null;
  const padState = new Map<PadInput, boolean>();

  const poll = () => {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const gp = Array.from(pads).find((p) => p && p.connected) ?? null;
    const id = gp ? gp.id : null;
    if (id !== lastId) { lastId = id; onStatus?.({ gamepad: id }); }
    if (gp) {
      const t = performance.now();
      const now = new Map<PadInput, boolean>();
      gp.buttons.forEach((b, i) => {
        const inp = BUTTON_MAP[i];
        if (inp) now.set(inp, b.pressed || b.value > TRIGGER_THRESHOLD);
      });
      const x = gp.axes[0] ?? 0, y = gp.axes[1] ?? 0;
      now.set('ls-left', x < -AXIS_THRESHOLD);
      now.set('ls-right', x > AXIS_THRESHOLD);
      now.set('ls-up', y < -AXIS_THRESHOLD);
      now.set('ls-down', y > AXIS_THRESHOLD);
      for (const [inp, isDown] of now) {
        if (padState.get(inp) !== isDown) { padState.set(inp, isDown); emit(actionForPad(inp), isDown, t); }
      }
    }
    raf = requestAnimationFrame(poll);
  };
  raf = requestAnimationFrame(poll);
  onStatus?.({ gamepad: null });

  return {
    stop() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      cancelAnimationFrame(raf);
    },
    held: () => new Set(down),
  };
}
