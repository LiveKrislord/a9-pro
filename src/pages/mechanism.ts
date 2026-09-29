import type { ActionId, ControllerKind, MechanismDef, ParamValues, ResolvedSequence } from '../types';
import { actionsToInputs } from '../mapping';
import { defaultParams, resolve, type DriftMode } from '../sequence';
import { makeDiagram, type Diagram } from '../diagrams';
import { Playback } from '../playback';
import { Timeline } from '../timeline';
import { Drill } from '../drill';
import { LoopDrill, loopRules, loopSequence } from '../loop';
import { CountDrill, countRules, countSequence } from '../count';
import type { DrillEngine } from '../engine';
import { startInput } from '../input';
import { getMechanism } from '../content/load';
import { savedKind } from './index';
import { h, segmented } from '../ui';
import { addRun, clearRecord, loadRecord, recordKey, saveRecord } from '../scores';

const DRIFT_KEY = 'a9.drift';
const LABELS_KEY = 'a9.labels';
const LABEL_MODES: { label: string; value: 'off' | 'on' }[] = [
  { label: 'Off', value: 'off' },
  { label: 'On', value: 'on' },
];
const DRIFT_MODES: { label: string; value: DriftMode }[] = [
  { label: 'Hold', value: 'hold' },
  { label: 'One tap', value: 'tap' },
];
const SPEEDS = [
  { label: '0.25', value: 0.25 },
  { label: '0.50', value: 0.5 },
  { label: '1.00', value: 1 },
];
const NO_PAD = 'No controller detected. Press any button on it, or use the keyboard.';
type View = 'play' | 'test' | 'details';

export function mechanismPage(root: HTMLElement, id: string): () => void {
  const found = getMechanism(id);
  if (!found) {
    root.replaceChildren(h('p', {}, 'Unknown mechanic. ', h('a', { href: '#/' }, 'Back to the list')));
    return () => {};
  }
  const def: MechanismDef = found;
  document.title = `${def.title} · A9 Pro`;

  // The layout is chosen on the home page and remembered.
  const kind: ControllerKind = savedKind() ?? 'xbox';
  let driftMode: DriftMode = localStorage.getItem(DRIFT_KEY) === 'tap' ? 'tap' : 'hold';
  let labels: 'off' | 'on' = localStorage.getItem(LABELS_KEY) === 'on' ? 'on' : 'off';
  let params: ParamValues = defaultParams(def);
  let seq: ResolvedSequence = buildSeq();
  let mode: 'play' | 'test' = 'play';
  let view: View = 'play';
  let drill: DrillEngine = makeDrill();

  /** The nominal sequence for the tutorial: written steps, or generated from the loop rules. */
  function buildSeq(): ResolvedSequence {
    if (def.type === 'loop' && def.loop) return loopSequence(loopRules(def.loop, params, driftMode));
    if (def.type === 'count' && def.count) return countSequence(countRules(def.count, params));
    return resolve(def, params, { driftMode });
  }

  function makeDrill(): DrillEngine {
    if (def.type === 'loop' && def.loop) return new LoopDrill(loopRules(def.loop, params, driftMode));
    if (def.type === 'count' && def.count) return new CountDrill(countRules(def.count, params));
    return new Drill(seq);
  }

  function buildTimeline() {
    const { end, marks } = drill.timeline();
    timeline.build(end, marks);
  }
  let diagram: Diagram = makeDiagram(kind);
  let testRaf = 0;
  let tlSig = '';
  const live = new Set<ActionId>();

  // DOM
  const diagramWrap = h('div', { class: 'diagram-wrap' }, diagram.el);
  const applyLabels = () => diagramWrap.classList.toggle('no-labels', labels === 'off');
  applyLabels();
  const tlRoot = h('div');
  const timeline = new Timeline(tlRoot);
  const legend = h('ul', { class: 'legend' });
  const PLAY_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
  const PAUSE_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>';
  const playLabel = h('span');
  const playIcon = h('span', { class: 'icon' });
  const playBtn = h('button', { class: 'btn btn-icon', type: 'button' }, playLabel, playIcon);
  function setPlayButton(playing: boolean) {
    playLabel.textContent = playing ? 'Pause' : 'Play';
    playIcon.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
  }
  setPlayButton(false);
  const speedSeg = segmented(SPEEDS, 1, (v) => playback.setSpeed(v));
  const testBtn = h('button', { class: 'btn', type: 'button' }, 'Start');
  const status = h('span', { class: 'status' });
  const padStatus = h('p', { class: 'pad-status' }, NO_PAD);
  const results = h('div', { class: 'results-wrap' });
  const body = h('article', { class: 'body' });
  body.innerHTML = def.bodyHtml;

  // Settings sidebar: layout and drift mode are global, the rest comes from the mechanic's params.
  const side = h('aside', { class: 'side', 'aria-label': 'Settings' });
  const group = (label: string, el: HTMLElement) => h('div', { class: 'side-group' }, h('div', { class: 'side-label' }, label), el);

  const driftSeg = segmented(DRIFT_MODES, driftMode, (v) => {
    driftMode = v;
    localStorage.setItem(DRIFT_KEY, v);
    rebuild();
  });
  const labelsSeg = segmented(LABEL_MODES, labels, (v) => {
    labels = v;
    localStorage.setItem(LABELS_KEY, v);
    applyLabels();
  });
  side.append(group('Button labels', labelsSeg.el), group('Drift', driftSeg.el));

  for (const [key, p] of Object.entries(def.params ?? {})) {
    const seg = segmented(p.options, params[key], (v) => {
      params = { ...params, [key]: v };
      if (custom) custom.value = '';
      rebuild();
    });
    let custom: HTMLInputElement | null = null;
    const wrap = h('div', {}, seg.el);
    if (p.custom) {
      const c = p.custom;
      custom = h('input', { type: 'number', min: String(c.min), max: String(c.max), step: '1', placeholder: 'custom', 'aria-label': `Custom ${p.label}` });
      const apply = () => {
        const n = Number(custom!.value);
        if (!custom!.value || Number.isNaN(n)) return;
        const v = Math.min(c.max, Math.max(c.min, Math.round(n)));
        custom!.value = String(v);
        params = { ...params, [key]: v };
        seg.set(v);
        rebuild();
      };
      custom.addEventListener('change', apply);
      custom.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); custom!.blur(); } e.stopPropagation(); });
      custom.addEventListener('keyup', (e) => e.stopPropagation());
      wrap.append(h('div', { class: 'custom-row' }, custom, h('span', {}, c.unit ? `${c.unit}, ${c.min} to ${c.max}` : `${c.min} to ${c.max}`)));
    }
    side.append(group(p.label, wrap));
  }

  // Views: playback, test and details. The diagram and timeline are shared by the first two.
  const testTop = h('div', { class: 'panel' }, padStatus);
  const testRow = h('div', { class: 'panel action-row' }, testBtn, status);
  const recordText = h('span');
  const resetBtn = h('button', { type: 'button', title: 'Forget the record for these settings' }, 'reset');
  const recordRow = h('div', { class: 'panel record' }, recordText, resetBtn);
  const currentKey = () => recordKey(def.id, params, driftMode);
  resetBtn.onclick = () => { clearRecord(currentKey()); renderRecord(false); };

  function renderRecord(newBest: boolean) {
    const r = loadRecord(currentKey());
    if (r.attempts === 0) { recordText.textContent = 'No runs yet with these settings.'; resetBtn.hidden = true; return; }
    resetBtn.hidden = false;
    const parts = [`${r.passes} of ${r.attempts} passed`, `streak ${r.streak}, best ${r.bestStreak}`];
    if (r.best !== null) parts.push(`best ${r.bestLabel.toLowerCase()}: ${r.best}${r.bestUnit ? ` ${r.bestUnit}` : ''}`);
    recordText.textContent = parts.join(' · ') + (newBest ? ' · New best.' : '');
  }
  const restartBtn = h('button', { class: 'btn', type: 'button', title: 'Back to the start' }, 'Reset');
  const playRow = h('div', { class: 'panel action-row' }, playBtn, restartBtn, h('label', {}, 'Speed'), speedSeg.el);
  const shared = h('div', { class: 'panel' }, diagramWrap, tlRoot, playRow, testRow, recordRow, legend);
  const testPanel = h('div', { class: 'panel' }, results);
  const detailsPanel = h('div', { class: 'panel' }, body);
  if (def.video?.youtube) {
    const frame = h('iframe', {
      src: `https://www.youtube-nocookie.com/embed/${def.video.youtube}`,
      title: `${def.title} video`,
      loading: 'lazy',
      allow: 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      allowfullscreen: '',
    });
    detailsPanel.prepend(
      h('div', { class: 'video' }, frame),
      def.video.note ? h('p', { class: 'video-note' }, def.video.note) : '',
      def.video.credit ? h('p', { class: 'credit' }, `Video by ${def.video.credit}`) : '',
    );
  }
  const main = h('div', { class: 'main' }, testTop, shared, testPanel, detailsPanel);

  const VIEWS: { label: string; value: View }[] = [
    { label: 'Tutorial', value: 'play' },
    { label: 'Test yourself', value: 'test' },
    { label: 'Details', value: 'details' },
  ];
  const viewSeg = segmented(VIEWS, view, (v) => showView(v));
  viewSeg.el.classList.add('vertical');
  side.prepend(group('View', viewSeg.el));

  function showView(v: View) {
    if (v !== 'test' && testActive()) cancelTest();
    if (v !== 'play') playback.pause();
    view = v;
    viewSeg.set(v);
    shared.hidden = v === 'details';
    playRow.hidden = v !== 'play';
    testPanel.hidden = v !== 'test';
    testTop.hidden = v !== 'test';
    testRow.hidden = v !== 'test';
    recordRow.hidden = v !== 'test';
    detailsPanel.hidden = v !== 'details';
  }

  const home = h('a', { href: '#/', class: 'home', 'aria-label': 'Home', title: 'All mechanics' });
  home.innerHTML =
    '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10.5V20h13v-9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 20v-6h4v6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  side.prepend(h('p', { class: 'crumb' }, home));
  main.prepend(h('h1', {}, def.title));
  if (def.summary) main.insertBefore(h('p', { class: 'summary' }, def.summary), main.children[1]);
  root.classList.add('wide');
  root.replaceChildren(h('div', { class: 'layout' }, side, main));

  const playback = new Playback(frame);

  // ----- helpers -----

  const testActive = () => drill.phase === 'armed' || drill.phase === 'running';

  function renderLegend() {
    legend.replaceChildren(
      ...drill.legend().map((l) =>
        l.lead ? h('li', {}, h('span', { class: 'muted' }, l.lead), ` · ${l.text}`) : h('li', { class: 'muted' }, l.text),
      ),
    );
  }

  function frame() {
    const pressed = new Set<ActionId>(live);
    if (mode === 'play') for (const a of playback.pressed()) pressed.add(a);
    diagram.set(actionsToInputs(pressed, kind));
    if (mode === 'play') timeline.setHead(playback.t);
    setPlayButton(playback.playing);
  }

  function updateStatus() {
    switch (drill.phase) {
      case 'idle':
        status.textContent = 'Press Start, then do the inputs on your controller or keyboard.';
        break;
      case 'armed':
        status.textContent = `Waiting for ${drill.waitingFor()}`;
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
    for (const r of drill.rows()) {
      const mark = r.status === 'info' ? '' : r.status === 'pass' ? '✓' : '✗';
      tbody.append(
        h('tr', { class: r.status === 'info' ? 'muted' : r.status },
          h('td', {}, r.label),
          h('td', { class: 'muted' }, r.action),
          h('td', { class: 'mark' }, mark),
          h('td', {}, r.you),
          h('td', { class: 'muted' }, r.allowed),
        ),
      );
    }
    results.replaceChildren(
      h('p', { class: drill.pass ? 'verdict pass' : 'verdict fail' }, drill.pass ? 'Pass' : 'Fail'),
      h('table', { class: 'results' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Step'), h('th', {}, 'Action'), h('th', {}), h('th', {}, 'You'), h('th', {}, 'Allowed'))),
        tbody,
      ),
    );
  }

  function rebuild() {
    cancelAnimationFrame(testRaf);
    mode = 'play';
    seq = buildSeq();
    drill = makeDrill();
    diagram = makeDiagram(kind);
    diagramWrap.replaceChildren(diagram.el);
    buildTimeline();
    renderLegend();
    renderResults();
    updateStatus();
    renderRecord(false);
    playback.load(seq);
  }

  function enterPlayMode() {
    if (mode === 'play') return;
    cancelAnimationFrame(testRaf);
    mode = 'play';
    drill = makeDrill();
    buildTimeline();
    renderResults();
    updateStatus();
    frame();
  }

  // ----- test mode -----

  function startTest() {
    playback.pause();
    mode = 'test';
    drill = makeDrill();
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
      const key = currentKey();
      const before = loadRecord(key);
      const after = addRun(before, drill.pass === true, drill.score());
      saveRecord(key, after);
      renderRecord(after.best !== null && after.best !== before.best);
      if (!drill.pass) showFailModal();
      return;
    }
    testRaf = requestAnimationFrame(testLoop);
  }

  /** On a failed run: a small modal with the first thing that went wrong. Enter retries, X closes. */
  function showFailModal() {
    const reason = drill.failReason() ?? '';
    const retry = h('button', { class: 'btn', type: 'button', autofocus: '' }, 'Retry');
    const close = h('button', { class: 'close', type: 'button', 'aria-label': 'Close' }, 'X');
    const dialog = h('dialog', { class: 'notice result' },
      close,
      h('h2', {}, 'Fail'),
      ...(reason || 'Not all steps were in their window.').split('\n').map((line, i) => h('p', { class: i === 0 ? '' : 'muted small' }, line)),
      h('div', { class: 'notice-actions' }, retry),
    );
    close.onclick = () => dialog.close();
    retry.onclick = () => { dialog.close(); startTest(); };
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  }

  function updateTestView(now: number) {
    const geo = drill.timeline();
    const sig = `${geo.end}|${geo.marks.join(',')}`;
    if (sig !== tlSig) {
      tlSig = sig;
      timeline.build(geo.end, geo.marks);
    }
    if (drill.t0 === null) { timeline.setHead(null); return; }
    timeline.setHead(Math.min(now, drill.endT ?? now) - drill.t0);
  }

  // ----- wiring -----

  const input = startInput(
    (e) => {
      if (e.down) live.add(e.action); else live.delete(e.action);
      if (testActive()) drill.input(e);
      frame();
    },
    (s) => {
      if (!s.gamepad) { padStatus.textContent = NO_PAD; return; }
      const active = s.pressed.length > 0 || s.axes.some((a) => Math.abs(a) > 0.2);
      const raw = active ? ` · buttons ${s.pressed.join(',') || 'none'} · axes ${s.axes.slice(0, 4).join(', ')}` : '';
      padStatus.textContent = `Controller: ${s.gamepad} (${s.mapping} mapping)${raw}`;
    },
  );

  playBtn.onclick = () => { enterPlayMode(); playback.toggle(); };
  restartBtn.onclick = () => { enterPlayMode(); playback.reset(); };
  testBtn.onclick = () => { testActive() ? cancelTest() : startTest(); };

  rebuild();
  showView(view);

  return () => {
    input.stop();
    playback.pause();
    cancelAnimationFrame(testRaf);
    root.classList.remove('wide');
  };
}

