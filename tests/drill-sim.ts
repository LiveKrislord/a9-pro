import { readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';
import { resolve, defaultParams } from '../src/sequence';
import { Drill } from '../src/drill';
import type { MechanismDef, InputEvent } from '../src/types';

const raw = readFileSync(new URL('../src/content/dogcatch.md', import.meta.url), 'utf8');
const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)![1];
const def = { ...(parseYaml(fm) as object), bodyHtml: '' } as MechanismDef;
const seq = resolve(def, defaultParams(def));

console.log('nominal:', seq.steps.map((s) => `${s.id}@${s.t}`).join(' '), 'end', seq.endT);

function run(name: string, events: InputEvent[], until: number) {
  const d = new Drill(seq);
  d.arm(0, []);
  const sorted = [...events].sort((a, b) => a.t - b.t);
  let now = 0;
  for (const e of sorted) {
    while (now < e.t) { now = Math.min(e.t, now + 16); d.tick(now); }
    d.input(e);
  }
  while (d.phase !== 'done' && now < until) { now += 16; d.tick(now); }
  const rows = seq.steps.map((s) => { const r = d.results.get(s.id)!; return `${s.id}:${r.status}${r.offset !== null ? '(' + Math.round(r.offset) + ')' : ''}${r.note ? '[' + r.note + ']' : ''}`; });
  console.log(`\n${name}\n  phase=${d.phase} pass=${d.pass}\n  ${rows.join('  ')}`);
  return d;
}

const dn = (action: InputEvent['action'], t: number): InputEvent => ({ action, down: true, t });
const up = (action: InputEvent['action'], t: number): InputEvent => ({ action, down: false, t });

// landing = tap2 + 2000
const base: InputEvent[] = [dn('drift', 500), up('drift', 560), dn('drift', 620), up('drift', 680)];
const landing = 620 + 2000;

const a = run('perfect', [...base, dn('steer-right', 900), dn('drift', landing + 160)], 5000);
console.assert(a.pass === true, 'perfect should pass');

const b = run('catch too early (20 ms after touchdown, window opens at 50)', [...base, dn('steer-right', 900), dn('drift', landing + 20)], 5000);
console.assert(b.pass === false && b.results.get('catch')!.note.startsWith('too early'), 'early should fail');

const c = run('catch before touchdown', [...base, dn('steer-right', 900), dn('drift', landing - 100)], 5000);
console.assert(c.pass === false, 'before touchdown should fail');

const d2 = run('slow double tap (400 ms)', [dn('drift', 500), up('drift', 560), dn('drift', 900), up('drift', 960)], 5000);
console.assert(d2.pass === false && d2.phase === 'done', 'slow tap should fail and finish');

const e = run('stick not held', [...base, dn('drift', landing + 160)], 5000);
console.assert(e.pass === false && e.results.get('catch')!.note.includes('not held'), 'no stick should fail');

const f = run('drift released early', [...base, dn('steer-right', 900), dn('drift', landing + 160), up('drift', landing + 300)], 5000);
console.assert(f.pass === false && f.results.get('catch')!.note.startsWith('released'), 'early release should fail');

const g = run('wrong side', [...base, dn('steer-left', 900), dn('drift', landing + 160)], 5000);
console.assert(g.pass === false, 'wrong side should fail');

const h2 = run('stick held before arming', [...base, dn('drift', landing + 120)], 5000);
void h2;
const d3 = new Drill(seq); d3.arm(0, ['steer-right']);
for (const ev of [...base, dn('drift', landing + 120)]) { d3.tick(ev.t); d3.input(ev); }
let now = landing + 120; while (d3.phase !== 'done') { now += 16; d3.tick(now); }
console.log('\nstick held before arming: pass=', d3.pass);
console.assert(d3.pass === true, 'pre-held stick should pass');

console.log('\nall assertions ran');
