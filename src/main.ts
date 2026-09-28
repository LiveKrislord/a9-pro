import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { indexPage } from './pages/index';
import { mechanismPage } from './pages/mechanism';
import { showDisclaimer } from './disclaimer';

registerSW({ immediate: true });

let cleanup: () => void = () => {};

function route() {
  cleanup();
  const app = document.getElementById('app')!;
  const m = /^#\/m\/([\w-]+)/.exec(location.hash);
  cleanup = m ? mechanismPage(app, m[1]) : indexPage(app);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
showDisclaimer();
