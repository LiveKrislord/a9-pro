import { readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';
import { resolve, defaultParams } from '../src/sequence';
import { Drill } from '../src/drill';
import type { MechanismDef, InputEvent, ActionId } from '../src/types';

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
const base: InputEvent[] = [dn('drift', 500), up('drift', 540), dn('drift', 570), up('drift', 610)];
const landing = 570 + 2000;

const a = run('perfect', [...base, dn('steer-right', 900), dn('drift', landing + 110)], 5000);
console.assert(a.pass === true, 'perfect should pass');

const b = run('catch too early (20 ms after touchdown, window opens at 50)', [...base, dn('steer-right', 900), dn('drift', landing + 20)], 5000);
console.assert(b.pass === false && b.results.get('catch')!.note.startsWith('too early'), 'early should fail');

const c = run('catch before touchdown', [...base, dn('steer-right', 900), dn('drift', landing - 100)], 5000);
console.assert(c.pass === false, 'before touchdown should fail');

const d2 = run('slow double tap (400 ms)', [dn('drift', 500), up('drift', 560), dn('drift', 900), up('drift', 960)], 5000);
console.assert(d2.pass === false && d2.phase === 'done', 'slow tap should fail and finish');

const e = run('stick not held', [...base, dn('drift', landing + 110)], 5000);
console.assert(e.pass === false && e.results.get('catch')!.note.includes('not held'), 'no stick should fail');

const f = run('drift released early', [...base, dn('steer-right', 900), dn('drift', landing + 110), up('drift', landing + 150)], 5000);
console.assert(f.pass === false && f.results.get('catch')!.note.startsWith('released'), 'early release should fail');

const g = run('wrong side', [...base, dn('steer-left', 900), dn('drift', landing + 110)], 5000);
console.assert(g.pass === false, 'wrong side should fail');

const h2 = run('stick held before arming', [...base, dn('drift', landing + 110)], 5000);
void h2;
const d3 = new Drill(seq); d3.arm(0, ['steer-right']);
for (const ev of [...base, dn('drift', landing + 110)]) { d3.tick(ev.t); d3.input(ev); }
let now = landing + 120; while (d3.phase !== 'done') { now += 16; d3.tick(now); }
console.log('\nstick held before arming: pass=', d3.pass);
console.assert(d3.pass === true, 'pre-held stick should pass');

console.log('\nall assertions ran');

// One-tap drift mode: the dogcatch hold becomes a tap and no longer needs to be held.
{
  const tapSeq = resolve(def, defaultParams(def), { driftMode: 'tap' });
  const catchStep = tapSeq.steps.find((s) => s.id === 'catch')!;
  console.assert(catchStep.kind === 'tap' && !catchStep.heldUntil, 'tap mode should turn the catch into a tap');
  const d = new Drill(tapSeq);
  d.arm(0, []);
  const evs = [...base, dn('steer-right', 900), dn('drift', landing + 110), up('drift', landing + 170)];
  let now = 0;
  for (const e of evs) { while (now < e.t) { now = Math.min(e.t, now + 16); d.tick(now); } d.input(e); }
  while (d.phase !== 'done') { now += 16; d.tick(now); }
  console.log('one-tap drift, quick tap at landing+110: pass=', d.pass);
  console.assert(d.pass === true, 'tap mode quick tap should pass');
}

// ----- Loop drill (wallride nitro) -----
import { LoopDrill, loopRules } from '../src/loop';
{
  const wr = readFileSync(new URL('../src/content/wallride.md', import.meta.url), 'utf8');
  const wfm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(wr)![1];
  const wdef = { ...(parseYaml(wfm) as object), bodyHtml: '' } as MechanismDef;
  const rules = loopRules(wdef.loop!, { speed: 250, duration: 5000 }, 'hold');
  console.log(`\nwallride window at 250 km/h: ${rules.minMs} to ${rules.maxMs} ms`);
  console.assert(rules.minMs === 360 && rules.maxMs === 504, 'window numbers');

  const runLoop = (name: string, mode: 'hold' | 'tap', evs: InputEvent[], until: number) => {
    const d = new LoopDrill(loopRules(wdef.loop!, { speed: 250, duration: 5000 }, mode));
    d.arm(0, []);
    let now = 0;
    for (const e of [...evs].sort((a, b) => a.t - b.t)) {
      while (now < e.t && d.phase !== 'done') { now = Math.min(e.t, now + 16); d.tick(now); }
      if (d.phase !== 'done') d.input(e);
    }
    while (d.phase !== 'done' && now < until) { now += 16; d.tick(now); }
    console.log(`${name}: pass=${d.pass} ${d.failReason() ?? ''} rows=${d.rows().length}`);
    return d;
  };

  // Hold mode: 460 ms drifts, 300 ms gaps with one nitro tap, repeated past 5 s.
  const good: InputEvent[] = [];
  for (let t = 100; t < 6000; t += 760) {
    good.push(dn('drift', t), up('drift', t + 460), dn('nitro', t + 610), up('nitro', t + 650));
  }
  const g = runLoop('loop good', 'hold', good, 7000);
  console.assert(g.pass === true, 'good loop should pass');

  const long = runLoop('loop hold too long', 'hold', [dn('drift', 100), up('drift', 100 + 700)], 3000);
  console.assert(long.pass === false && long.failReason()!.includes('too long'), 'long hold should fail');

  const short = runLoop('loop too short', 'hold', [dn('drift', 100), up('drift', 100 + 300)], 3000);
  console.assert(short.pass === false && short.failReason()!.includes('too short'), 'short hold should fail');

  const noNitro = runLoop('loop no nitro in gap', 'hold', [dn('drift', 100), up('drift', 560), dn('drift', 900), up('drift', 1360)], 3000);
  console.assert(noNitro.pass === false && noNitro.failReason()!.includes('No nitro'), 'missing nitro should fail');

  // Tap mode: drift tap, nitro tap ends it after 470 ms and counts as the gap nitro, next drift tap.
  const tapEvs: InputEvent[] = [];
  for (let t = 100; t < 6000; t += 560) {
    tapEvs.push(dn('drift', t), up('drift', t + 40), dn('nitro', t + 470), up('nitro', t + 510));
  }
  const tp = runLoop('loop tap mode good', 'tap', tapEvs, 7000);
  console.assert(tp.pass === true, 'tap mode loop should pass');

  const tapNoNitro = runLoop('loop tap mode, drift ends drift', 'tap', [dn('drift', 100), up('drift', 140), dn('drift', 570), up('drift', 610)], 3000);
  console.assert(tapNoNitro.pass === false, 'drift ending drift without nitro should fail');
  const late = runLoop('loop brake too late after nitro', 'hold', [dn('drift', 100), up('drift', 560), dn('nitro', 700), up('nitro', 740), dn('drift', 1100), up('drift', 1560)], 3000);
  console.assert(late.pass === false && late.failReason()!.includes('after the nitro'), 'late brake after nitro should fail');
  console.log('loop assertions ran');
}

// ----- Count drill (punch drift) -----
import { CountDrill, countRules } from '../src/count';
{
  const pr = readFileSync(new URL('../src/content/punch-drift.md', import.meta.url), 'utf8');
  const pfm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(pr)![1];
  const pdef = { ...(parseYaml(pfm) as object), bodyHtml: '' } as MechanismDef;
  const runCount = (name: string, evs: InputEvent[]) => {
    const d = new CountDrill(countRules(pdef.count!, { duration: 5000, side: 'right' }));
    d.arm(0, ['steer-right']);
    let now = 0;
    for (const e of [...evs].sort((a, b) => a.t - b.t)) {
      while (now < e.t && d.phase !== 'done') { now = Math.min(e.t, now + 16); d.tick(now); }
      if (d.phase !== 'done') d.input(e);
    }
    while (d.phase !== 'done') { now += 16; d.tick(now); }
    console.log(`${name}: pass=${d.pass} punches=${d.score()!.value} ${d.failReason() ?? ''}`);
    return d;
  };
  // Entry brake, then nitro, brake repeated: every pair counts.
  const chain: InputEvent[] = [dn('drift', 100)];
  for (let t = 250; t < 3000; t += 300) chain.push(dn('nitro', t), dn('drift', t + 150));
  const c = runCount('count chained punches', chain);
  console.assert(c.pass === true && c.score()!.value === chain.filter((e) => e.action === 'nitro').length, 'chained count equals nitro taps');
  // Wrong order ends the run: double nitro in the plain punch drift.
  const bad = runCount('count with a double nitro', [dn('drift', 100), dn('nitro', 200), dn('nitro', 300), dn('drift', 400)]);
  console.assert(bad.pass === false && bad.failReason()!.includes('expected drift'), 'double nitro should fail');
  // Stick let go at a press ends the run.
  const loose = runCount('count with the stick let go', [dn('drift', 100), dn('nitro', 200), up('steer-right', 250), dn('drift', 300)]);
  console.assert(loose.pass === false && loose.failReason()!.includes('let go'), 'unheld stick should fail');
  // A second brake right after the entry is out of order too.
  const bb = runCount('count brake twice', [dn('drift', 100), dn('drift', 300)]);
  console.assert(bb.pass === false, 'brake brake should fail');
  // Opening press without the stick held fails right away instead of waiting silently.
  const d0 = new CountDrill(countRules(pdef.count!, { duration: 5000, side: 'right' }));
  d0.arm(0, []);
  d0.input(dn('drift', 100));
  console.log('count start without stick:', d0.phase, d0.failReason());
  console.assert(d0.phase === 'done' && d0.pass === false, 'start without stick should fail');
  // Nitro left hanging: no brake within 300 ms ends the run.
  const hang = runCount('count nitro left hanging', [dn('drift', 100), dn('nitro', 200), dn('drift', 1300)]);
  console.assert(hang.pass === false && hang.failReason()!.includes('did not follow'), 'hanging nitro should fail');
  // A pause between punches is fine.
  const pause = runCount('count pause between punches', [dn('drift', 100), dn('nitro', 200), dn('drift', 300), dn('nitro', 2000), dn('drift', 2100)]);
  console.assert(pause.pass === true && pause.score()!.value === 2, 'pause between punches should pass');
  console.log('count assertions ran');
}

// ----- Flick float: hold-length window on the flick -----
{
  const fr = readFileSync(new URL('../src/content/flick-float.md', import.meta.url), 'utf8');
  const ffm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fr)![1];
  const fdef = { ...(parseYaml(ffm) as object), bodyHtml: '' } as MechanismDef;
  const fseq = resolve(fdef, defaultParams(fdef));
  console.log('\nflick float actions:', fseq.steps.map((s) => `${s.id}=${s.action}`).join(' '));
  console.assert(fseq.steps[0].action === 'steer-right' && fseq.steps[1].action === 'steer-left', 'derived side');
  const runFlick = (name: string, evs: InputEvent[]) => {
    const d = new Drill(fseq);
    d.arm(0, []);
    let now = 0;
    for (const e of [...evs].sort((a, b) => a.t - b.t)) {
      while (now < e.t && d.phase !== 'done') { now = Math.min(e.t, now + 16); d.tick(now); }
      if (d.phase !== 'done') d.input(e);
    }
    while (d.phase !== 'done') { now += 16; d.tick(now); }
    console.log(`${name}: pass=${d.pass} ${d.failReason() ?? ''}`);
    return d;
  };
  console.assert(runFlick('flick good', [dn('steer-right', 100), up('steer-right', 170), dn('steer-left', 190)]).pass === true, 'good flick passes');
  console.assert(runFlick('flick too long', [dn('steer-right', 100), up('steer-right', 260), dn('steer-left', 280)]).pass === false, 'long flick fails');
  console.assert(runFlick('flick too short', [dn('steer-right', 100), up('steer-right', 130), dn('steer-left', 150)]).pass === false, 'short flick fails');
  console.assert(runFlick('steer too late', [dn('steer-right', 100), up('steer-right', 170), dn('steer-left', 400)]).pass === false, 'late steer fails');
  console.assert(runFlick('steer let go', [dn('steer-right', 100), up('steer-right', 170), dn('steer-left', 190), up('steer-left', 400)]).pass === false, 'released steer fails');
  console.log('flick assertions ran');
}

// ----- 360 float: stick away, double tap, strong steer as the spin ends -----
{
  const raw360 = readFileSync(new URL('../src/content/360-float.md', import.meta.url), 'utf8');
  const fm360 = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw360)![1];
  const def360 = { ...(parseYaml(fm360) as object), bodyHtml: '' } as MechanismDef;
  const seq360 = resolve(def360, defaultParams(def360));
  console.log('\n360 float nominal:', seq360.steps.map((s) => `${s.id}@${s.t}`).join(' '), 'end', seq360.endT);
  const run360 = (name: string, evs: InputEvent[], held: ActionId[] = []) => {
    const d = new Drill(seq360);
    d.arm(0, held);
    let now = 0;
    for (const e of [...evs].sort((a, b) => a.t - b.t)) {
      while (now < e.t && d.phase !== 'done') { now = Math.min(e.t, now + 16); d.tick(now); }
      if (d.phase !== 'done') d.input(e);
    }
    while (d.phase !== 'done') { now += 16; d.tick(now); }
    console.log(`${name}: pass=${d.pass} ${d.failReason() ?? ''}`);
    return d;
  };
  // Left corner: stick right, taps at 500 and 570, spin ends at 1570, steer left at 1470.
  const good = [dn('steer-right', 100), dn('drift', 500), up('drift', 540), dn('drift', 570), up('drift', 610), up('steer-right', 1440), dn('steer-left', 1470)];
  console.assert(run360('360 good', good).pass === true, '360 good should pass');
  console.assert(run360('360 stick held before arming', good.slice(1), ['steer-right']).pass === true, 'pre-held stick passes');
  const wrongWay = [dn('steer-left', 100), dn('drift', 500), up('drift', 540), dn('drift', 570), up('drift', 610)];
  console.assert(run360('360 spun toward the corner', wrongWay).pass === false, 'wrong stick should fail');
  const early = [dn('steer-right', 100), dn('drift', 500), up('drift', 540), dn('drift', 570), up('drift', 610), up('steer-right', 900), dn('steer-left', 950)];
  console.assert(run360('360 steer too early', early).pass === false, 'early steer should fail');
  console.log('360 assertions ran');
}
