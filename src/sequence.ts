import type { ActionId, Bound, MechanismDef, ParamValues, ResolvedSequence, ResolvedStep } from './types';

export function defaultParams(def: MechanismDef): ParamValues {
  const out: ParamValues = {};
  for (const [k, p] of Object.entries(def.params ?? {})) out[k] = p.default;
  return out;
}

function substStr(v: string, params: ParamValues): string {
  return v.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

function substNum(v: number | string | undefined, params: ParamValues, fallback: number): number {
  if (v === undefined) return fallback;
  if (typeof v === 'number') return v;
  const s = substStr(v, params).trim();
  const n = Number(s);
  if (Number.isNaN(n)) throw new Error(`Not a number after substitution: "${v}" -> "${s}"`);
  return n;
}

function bound(b: Bound | undefined, params: ParamValues, fallback: number): number {
  if (b === undefined) return fallback;
  if (b === 'start') return -Infinity;
  if (b === 'end') return Infinity;
  return substNum(b, params, fallback);
}

const DEFAULT_TOLERANCE = 150;

export function resolve(def: MechanismDef, params: ParamValues): ResolvedSequence {
  const steps: ResolvedStep[] = [];
  const times = new Map<string, number>();
  let prev: string | null = null;

  for (const s of def.sequence) {
    const at = substNum(s.at, params, 0);
    const after = s.after ?? prev;
    const refT = after ? times.get(after) : 0;
    if (refT === undefined) throw new Error(`Step "${s.id}" references unknown step "${after}"`);
    const t = refT + at;
    const window: [number, number] = s.window
      ? [bound(s.window[0], params, at - DEFAULT_TOLERANCE), bound(s.window[1], params, at + DEFAULT_TOLERANCE)]
      : [at - DEFAULT_TOLERANCE, at + DEFAULT_TOLERANCE];
    steps.push({
      id: s.id,
      kind: s.do,
      label: s.label ?? s.id,
      action: s.action ? (substStr(s.action, params) as ActionId) : null,
      after,
      at,
      window,
      tapMs: s.tapMs ?? 80,
      holdMs: s.holdMs ?? 400,
      heldUntil: s.heldUntil === 'end',
      requires: s.requires ?? [],
      t,
    });
    times.set(s.id, t);
    prev = s.id;
  }

  const endAfter = def.end?.after ?? prev;
  const endAt = substNum(def.end?.at, params, 500);
  const endRef = endAfter ? times.get(endAfter) : 0;
  if (endRef === undefined) throw new Error(`end references unknown step "${endAfter}"`);
  const endT = endRef + endAt;
  const startT = Math.min(0, ...steps.map((s) => s.t));
  return { steps, end: { after: endAfter, at: endAt }, endT, startT };
}

/** Playback: when a step's input is released on the nominal timeline. */
export function stepUntil(seq: ResolvedSequence, s: ResolvedStep): number | null {
  if (!s.action) return null;
  if (s.kind === 'hold') return s.heldUntil ? seq.endT : s.t + s.holdMs;
  return s.t + s.tapMs;
}

/** Actions pressed at playback clock `t`. */
export function pressedAt(seq: ResolvedSequence, t: number): Set<ActionId> {
  const out = new Set<ActionId>();
  for (const s of seq.steps) {
    const until = stepUntil(seq, s);
    if (until === null || !s.action) continue;
    if (t >= s.t && t < until) out.add(s.action);
  }
  return out;
}
