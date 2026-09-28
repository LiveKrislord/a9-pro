import type { ActionId, ControllerKind, MechanismDef, ParamValues, ResolvedSequence, ResolvedStep } from '../types';
import { ACTIONS, actionsToInputs, inputLabel } from '../mapping';
import { defaultParams, resolve } from '../sequence';
import { makeDiagram, type Diagram } from '../diagrams';
import { Playback } from '../playback';
import { Timeline, type TLView, type UserSpan } from '../timeline';
import { Drill } from '../drill';
import { startInput } from '../input';
import { getMechanism } from '../content/load';
import { fmtOffset, h, segmented } from '../ui';

const KIND_KEY = 'a9.controller';
const KINDS: { label: string; value: ControllerKind }[] = [
  { label: 'Xbox', value: 'xbox' },
  { label: 'DualSense', value: 'dualsense' },
  { label: 'Keyboard', value: 'keyboard' },
];
const SPEEDS = [
  { label: '0.25', value: 0.25 },
  { label: '0.50', value: 0.5 },
  { label: '1.00', value: 1 },
];
const NO_PAD = 'No controller detected. Press any button on it, or use the keyboard.';

export function mechanismPage(root: HTMLElement, id: string): () => void {
  const found = getMechanism(id);
  if (!found) {
    root.replaceChildren(h('p', {}, 'Unknown mechanic. ', h('a', { href: '#/' }, 'Back to the list')));
    return () => {};
  }
  const def: MechanismDef = found;
  document.title = `${def.title} · A9 Pro`;

  let kind: ControllerKind = (localStorage.getItem(KIND_KEY) as ControllerKind) || 'xbox';
  if (!KINDS.some((k) => k.value === kind)) kind = 'xbox';
  let params: ParamValues = defaultParams(def);
  let seq: ResolvedSequence = resolve(def, params);
  let mode: 'play' | 'test' = 'play';
  let drill = new Drill(seq);
  let diagram: Diagram = makeDiagram(kind);
  let testRaf = 0;
  let tlSig = '';
  const live = new Set<ActionId>();

  // DOM
  const diagramWrap = h('div', { class: 'diagram-wrap' }, diagram.el);
  const tlRoot = h('div');
  const timeline = new Timeline(tlRoot);
  const legend = h('ol', { class: 'legend' });
  const playBtn = h('button', { class: 'btn', type: 'button' }, 'Play');
  const prevBtn = h('button', { class: 'btn', type: 'button', title: 'Previous step', 'aria-label': 'Previous step' }, '‹');
  const nextBtn = h('button', { class: 'btn', type: 'button', title: 'Next step', 'aria-label': 'Next step' }, '›');
  const speedSeg = segmented(SPEEDS, 1, (v) => playback.setSpeed(v));
  const testBtn = h('button', { class: 'btn', type: 'button' }, 'Start');
  const status = h('span', { class: 'status' });
  const padStatus = h('p', { class: 'muted small' }, NO_PAD);
  const results = h('div', { class: 'results-wrap' });
  const paramsRow = h('div', { class: 'row' });
  const body = h('article', { class: 'body' });
  body.innerHTML = def.bodyHtml;

  const kindSeg = segmented(KINDS, kind, (v) => {
    kind = v;
    localStorage.setItem(KIND_KEY, v);
    rebuild();
  });

  for (const [key, p] of Object.entries(def.params ?? {})) {
    const seg = segmented(p.options, params[key], (v) => {
      params = { ...params, [key]: v };
      rebuild();
    });
    paramsRow.append(h('label', {}, p.label), seg.el);
  }

  root.replaceChildren(
    h('p', { class: 'crumb' }, h('a', { href: '#/' }, '← All mechanics')),
    h('h1', {}, def.title),
    h('p', { class: 'summary' }, def.summary ?? ''),
    h('div', { class: 'row' }, h('label', {}, 'Controller'), kindSeg.el),
    paramsRow,
    diagramWrap,
    tlRoot,
    legend,
    h('div', { class: 'row controls' }, prevBtn, playBtn, nextBtn, h('label', {}, 'Speed'), speedSeg.el),
    h('h2', {}, 'Test yourself'),
    padStatus,
    h('div', { class: 'row' }, testBtn, status),
    results,
    body,
  );

  const playback = new Playback(frame);

  // ----- helpers -----

  const testActive = () => drill.phase === 'armed' || drill.phase === 'running';
  const stepById = (sid: string | null): ResolvedStep | undefined => seq.steps.find((s) => s.id === sid);
  const laneLabel = (a: ActionId) => `${inputLabel(a, kind)} · ${ACTIONS[a].label}`;

  function viewFrom(timeOf: (s: ResolvedStep) => number, endT: number): TLView {
    const lanes: TLView['lanes'] = [];
    for (const s of seq.steps) {
      if (s.action && !lanes.some((l) => l.action === s.action)) lanes.push({ action: s.action, label: laneLabel(s.action) });
    }
    const steps = seq.steps.map((s, i) => {
      const t = timeOf(s);
      const refStep = stepById(s.after);
      const ref = refStep ? timeOf(refStep) : t;
      let until: number | null = null;
      if (s.action && s.kind === 'hold') until = s.heldUntil ? endT : t + s.holdMs;
      return { step: s, index: i + 1, t, ref, until };
    });
    const start = Math.min(0, ...steps.map((s) => s.t));
    return { start, end: endT, lanes, steps };
  }

  const nominalView = () => viewFrom((s) => s.t, seq.endT);

  function renderLegend() {
    legend.replaceChildren(
      ...seq.steps.map((s) => {
        const input = s.action ? h('kbd', { class: 'chip' }, inputLabel(s.action, kind)) : h('span', { class: 'muted' }, 'marker');
        const how = s.kind === 'hold' ? (s.heldUntil ? 'hold to the end' : 'hold') : s.kind === 'tap' ? 'tap' : '';
        return h('li', {}, h('span', { class: 'step-label' }, s.label), ' ', input, how ? h('span', { class: 'muted' }, ` · ${how}`) : '');
      }),
    );
  }

  function frame() {
    const pressed = new Set<ActionId>(live);
    if (mode === 'play') for (const a of playback.pressed()) pressed.add(a);
    diagram.set(actionsToInputs(pressed, kind));
    if (mode === 'play') timeline.setHead(playback.t);
    playBtn.textContent = playback.playing ? 'Pause' : 'Play';
  }

  function updateStatus() {
    const first = seq.steps[0];
    switch (drill.phase) {
      case 'idle':
        status.textContent = 'Press Start, then do the inputs on your controller or keyboard.';
        break;
      case 'armed':
        status.textContent = first.action ? `Waiting for ${first.label.toLowerCase()} (${inputLabel(first.action, kind)})…` : 'Waiting…';
        break;
      case 'running':
        status.textContent = 'Go.';
        break;
      case 'done':
        status.textContent = drill.pass ? 'Pass.' : 'Fail.';
        break;
    }
    testBtn.textContent = testActive() ? 'Cancel' : drill.phase === 'done' ? 'Retry' : 'Start';
  }

  function renderResults() {
    if (drill.phase !== 'done') { results.replaceChildren(); return; }
    const tbody = h('tbody');
    seq.steps.forEach((s, i) => {
      const r = drill.results.get(s.id)!;
      const refLabel = stepById(s.after)?.label.toLowerCase() ?? null;
      let timing = '';
      if (s.kind === 'marker') timing = refLabel ? fmtOffset(s.at, refLabel) : '';
      else if (r.offset !== null && refLabel) timing = fmtOffset(r.offset, refLabel) + (r.note ? ` · ${r.note}` : '');
      else timing = r.note;
      const mark = s.kind === 'marker' ? '' : r.status === 'pass' ? '✓' : '✗';
      tbody.append(
        h('tr', { class: s.kind === 'marker' ? 'muted' : r.status },
          h('td', {}, String(i + 1)),
          h('td', {}, s.label),
          h('td', {}, s.action ? inputLabel(s.action, kind) : ''),
          h('td', { class: 'mark' }, mark),
          h('td', {}, timing),
        ),
      );
    });
    results.replaceChildren(
      h('p', { class: drill.pass ? 'verdict pass' : 'verdict fail' }, drill.pass ? 'Pass' : 'Fail'),
      h('table', { class: 'results' },
        h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Step'), h('th', {}, 'Input'), h('th', {}), h('th', {}, 'Timing'))),
        tbody,
      ),
    );
  }

  function rebuild() {
    cancelAnimationFrame(testRaf);
    mode = 'play';
    seq = resolve(def, params);
    drill = new Drill(seq);
    diagram = makeDiagram(kind);
    diagramWrap.replaceChildren(diagram.el);
    timeline.build(nominalView());
    timeline.setUser([]);
    renderLegend();
    renderResults();
    updateStatus();
    playback.load(seq);
  }

  function enterPlayMode() {
    if (mode === 'play') return;
    cancelAnimationFrame(testRaf);
    mode = 'play';
    drill = new Drill(seq);
    timeline.build(nominalView());
    timeline.setUser([]);
    renderResults();
    updateStatus();
    frame();
  }

  // ----- test mode -----

  function startTest() {
    playback.pause();
    mode = 'test';
    drill = new Drill(seq);
    drill.arm(performance.now(), live);
    tlSig = '';
    renderResults();
    updateStatus();
    cancelAnimationFrame(testRaf);
    testLoop();
  }

  function cancelTest() {
    cancelAnimationFrame(testRaf);
    enterPlayMode();
  }

  function testLoop() {
    const now = performance.now();
    drill.tick(now);
    updateTestView(now);
    if (drill.phase === 'done') {
      renderResults();
      updateStatus();
      return;
    }
    testRaf = requestAnimationFrame(testLoop);
  }

  function updateTestView(now: number) {
    const { times, endT } = drill.projected();
    const base = drill.t0 ?? 0;
    const sig = `${Array.from(drill.times.keys()).join(',')}|${drill.phase}`;
    if (sig !== tlSig) {
      tlSig = sig;
      timeline.build(viewFrom((s) => times.get(s.id)! - base, endT - base));
    }
    if (drill.t0 === null) { timeline.setHead(null); timeline.setUser([]); return; }
    const clockEnd = Math.min(now, drill.endT ?? now);
    timeline.setHead(clockEnd - base);
    const spans: UserSpan[] = [];
    const open = new Map<ActionId, number>();
    for (const e of drill.events) {
      if (e.down) { if (!open.has(e.action)) open.set(e.action, e.t); continue; }
      const from = open.get(e.action);
      if (from !== undefined) { spans.push({ action: e.action, from: from - base, to: e.t - base }); open.delete(e.action); }
    }
    for (const [a, from] of open) spans.push({ action: a, from: from - base, to: clockEnd - base });
    timeline.setUser(spans);
  }

  // ----- wiring -----

  const input = startInput(
    (e) => {
      if (e.down) live.add(e.action); else live.delete(e.action);
      if (testActive()) drill.input(e);
      frame();
    },
    (s) => { padStatus.textContent = s.gamepad ? `Controller: ${s.gamepad}` : NO_PAD; },
  );

  playBtn.onclick = () => { enterPlayMode(); playback.toggle(); };
  prevBtn.onclick = () => { enterPlayMode(); playback.prev(); };
  nextBtn.onclick = () => { enterPlayMode(); playback.next(); };
  testBtn.onclick = () => { testActive() ? cancelTest() : startTest(); };

  rebuild();

  return () => {
    input.stop();
    playback.pause();
    cancelAnimationFrame(testRaf);
  };
}

