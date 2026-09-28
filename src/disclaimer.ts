import { h } from './ui';

/** Small notice shown once per visit, before anything else. */
export function showDisclaimer() {
  const ok = h('button', { class: 'btn', type: 'button', autofocus: '' }, 'OK');
  const dialog = h('dialog', { class: 'notice', 'aria-labelledby': 'notice-title' },
    h('h2', { id: 'notice-title' }, 'Before you start'),
    h('p', {}, 'The layouts here use the default in-game bindings. If you play with custom controls, the buttons on your controller or keyboard may differ. The mechanics and the timing stay the same.'),
    h('p', { class: 'muted small' }, 'Unofficial fan project, not affiliated with or endorsed by Gameloft. Asphalt is a trademark of Gameloft. Xbox is a trademark of Microsoft. PlayStation and DualSense are trademarks of Sony Interactive Entertainment. Videos belong to their creators.'),
    h('p', { class: 'muted' }, 'All credits reserved to LiveKrislord.'),
    h('div', { class: 'notice-actions' }, ok),
  );
  ok.onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
}
