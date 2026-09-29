import type { ParamValues } from './types';
import type { Score } from './engine';

/** Practice record for one mechanic under one set of settings, kept in localStorage. */
export interface PracticeRecord {
  attempts: number;
  passes: number;
  streak: number;
  bestStreak: number;
  /** Best value of the engine's score, if the mechanic has one, with its label and unit. */
  best: number | null;
  bestLabel: string;
  bestUnit: string;
}

const PREFIX = 'a9.record.';

export function recordKey(mechanicId: string, params: ParamValues, driftMode: string): string {
  const parts = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`);
  return `${PREFIX}${mechanicId}|${parts.join('&')}|drift=${driftMode}`;
}

const EMPTY: PracticeRecord = { attempts: 0, passes: 0, streak: 0, bestStreak: 0, best: null, bestLabel: '', bestUnit: '' };

export function loadRecord(key: string): PracticeRecord {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<PracticeRecord>) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function saveRecord(key: string, r: PracticeRecord) {
  try { localStorage.setItem(key, JSON.stringify(r)); } catch { /* storage unavailable: keep going without it */ }
}

export function clearRecord(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

/** Fold one finished run into the record. `score` may be present on failed runs too. */
export function addRun(r: PracticeRecord, pass: boolean, score: Score | null): PracticeRecord {
  const next: PracticeRecord = { ...r, attempts: r.attempts + 1 };
  if (pass) {
    next.passes = r.passes + 1;
    next.streak = r.streak + 1;
    next.bestStreak = Math.max(r.bestStreak, next.streak);
  } else {
    next.streak = 0;
  }
  if (score) {
    const better = r.best === null || (score.lowerIsBetter ? score.value < r.best : score.value > r.best);
    if (better) { next.best = score.value; next.bestLabel = score.label; next.bestUnit = score.unit; }
  }
  return next;
}

/** Practice totals for a mechanic across every settings combination. */
export function practiceSummary(mechanicId: string): { attempts: number; passes: number } {
  let attempts = 0;
  let passes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(`${PREFIX}${mechanicId}|`)) continue;
      const r = JSON.parse(localStorage.getItem(k) ?? '{}') as Partial<PracticeRecord>;
      attempts += r.attempts ?? 0;
      passes += r.passes ?? 0;
    }
  } catch { /* storage unavailable */ }
  return { attempts, passes };
}
