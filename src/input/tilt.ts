import type { ActionId } from '../types';

export interface TiltOptions {
  /** Degrees of lean, from the calibrated center, that count as full steer. */
  thresholdDeg: number;
  /** Flip left and right, for devices whose orientation reads the other way. */
  invert: boolean;
  /** Called on every reading with the lean in degrees, positive to the right. */
  onAngle: (deg: number) => void;
  /** Steering presses and releases, on the same clock as the other inputs. */
  press: (action: ActionId, down: boolean, t: number) => void;
}

export interface TiltHandle {
  stop(): void;
  /** Take the current lean as the new center. */
  recenter(): void;
  /** Whether the browser delivered any reading yet. */
  active(): boolean;
}

/** True on browsers that must ask before reading motion sensors (iOS). */
export function tiltNeedsPermission(): boolean {
  const M = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
  return typeof M?.requestPermission === 'function';
}

export async function requestTiltPermission(): Promise<boolean> {
  const M = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
  if (typeof M?.requestPermission !== 'function') return true;
  try { return (await M.requestPermission()) === 'granted'; } catch { return false; }
}

/**
 * Reads gravity from the motion sensor and turns the phone's lean into steer-left / steer-right.
 * The lean is the angle of "down" within the screen plane, relative to a calibrated center,
 * so it works in either landscape orientation once recentered. Hysteresis keeps the stick
 * from chattering at the threshold.
 */
export function startTilt(opts: TiltOptions): TiltHandle {
  let center: number | null = null;
  let last = 0;
  let gotReading = false;
  let leftDown = false;
  let rightDown = false;

  const angleOf = (gx: number, gy: number) => (Math.atan2(gx, gy) * 180) / Math.PI;
  const diff = (a: number, b: number) => (((a - b + 540) % 360) - 180);

  const onMotion = (e: DeviceMotionEvent) => {
    const g = e.accelerationIncludingGravity;
    if (!g || g.x === null || g.y === null) return;
    gotReading = true;
    const raw = angleOf(g.x, g.y);
    if (center === null) center = raw;
    let lean = diff(raw, center);
    if (opts.invert) lean = -lean;
    last = lean;
    opts.onAngle(lean);

    const t = performance.now();
    const on = opts.thresholdDeg;
    const off = opts.thresholdDeg * 0.6;
    if (!rightDown && lean > on) { rightDown = true; opts.press('steer-right', true, t); }
    else if (rightDown && lean < off) { rightDown = false; opts.press('steer-right', false, t); }
    if (!leftDown && lean < -on) { leftDown = true; opts.press('steer-left', true, t); }
    else if (leftDown && lean > -off) { leftDown = false; opts.press('steer-left', false, t); }
  };

  window.addEventListener('devicemotion', onMotion);

  return {
    stop() {
      window.removeEventListener('devicemotion', onMotion);
      const t = performance.now();
      if (leftDown) opts.press('steer-left', false, t);
      if (rightDown) opts.press('steer-right', false, t);
    },
    recenter() {
      center = center === null ? null : center + (opts.invert ? -last : last);
    },
    active: () => gotReading,
  };
}
