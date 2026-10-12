// Point d'entrée : routeur par ancre (#/...), état local, service worker.
import { createStorage } from './lib/storage.js';
import { generatePlan } from './lib/plan.js';
import { toast } from './ui.js';
import { BUILD } from './version.js';
import { initPWA } from './pwa.js';
import { renderHome } from './views/home.js';
import { renderStart } from './views/start.js';
import { renderPlan } from './views/plan.js';
import { renderSession } from './views/session.js';
import { renderRunner } from './views/runner.js';
import { renderExercises, renderExercise } from './views/exercises.js';
import { renderProgress } from './views/progress.js';
import { renderSettings } from './views/settings.js';
import { renderPrograms, renderPricing, renderSafety, renderPrivacy, renderLegal, renderNotFound } from './views/pages.js';

const storage = createStorage();
const planCache = new Map();

function getPlan(levelId, cycle, lowImpact) {
  const key = `${levelId}|${cycle}|${lowImpact ? 1 : 0}`;
  if (!planCache.has(key)) planCache.set(key, generatePlan({ levelId, cycle, lowImpact }));
  return planCache.get(key);
}

function currentPlan() {
  const p = storage.get().profile;
  return p ? getPlan(p.levelId, p.cycle, p.lowImpact) : null;
}

const ROUTES = [
  { re: /^$/, view: renderHome, title: 'Accueil', nav: 'home' },
  { re: /^programmes$/, view: renderPrograms, title: 'Les programmes', nav: 'home' },
  { re: /^demarrer$/, view: renderStart, title: 'Démarrer', nav: 'plan' },
  { re: /^plan$/, view: renderPlan, title: 'Mon plan', nav: 'plan' },
  { re: /^seance\/([a-z0-9:]+)$/, view: renderSession, title: 'Séance', nav: 'plan' },
  { re: /^go\/([a-z0-9:]+)$/, view: renderRunner, title: 'Séance guidée', nav: 'plan', immersive: true },
  { re: /^exercices$/, view: renderExercises, title: 'Exercices', nav: 'exercices' },
  { re: /^exercice\/([a-z0-9-]+)$/, view: renderExercise, title: 'Exercice', nav: 'exercices' },
  { re: /^progres$/, view: renderProgress, title: 'Progression', nav: 'progres' },
  { re: /^reglages$/, view: renderSettings, title: 'Réglages', nav: 'progres' },
  { re: /^tarifs$/, view: renderPricing, title: 'Tarifs', nav: '' },
  { re: /^securite$/, view: renderSafety, title: 'Sécurité', nav: '' },
  { re: /^confidentialite$/, view: renderPrivacy, title: 'Confidentialité', nav: '' },
  { re: /^mentions-legales$/, view: renderLegal, title: 'Mentions légales', nav: '' },
];

let cleanup = null;
const root = document.getElementById('app');

function parseHash() {
  const raw = decodeURIComponent((location.hash || '#/').slice(1)).replace(/^\/+/, '');
  const [path, query = ''] = raw.split('?');
  return { path: path.replace(/\/+$/, ''), query: new URLSearchParams(query) };
}

export function navigate(path) {
  location.hash = `#/${path}`;
}

function render() {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  const { path, query } = parseHash();
  let route = null;
  let match = null;
  for (const r of ROUTES) {
    match = r.re.exec(path);
    if (match) {
      route = r;
      break;
    }
  }
  const view = route ? route.view : renderNotFound;
  document.body.classList.toggle('immersive', Boolean(route?.immersive));
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (route && a.dataset.nav === route.nav) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const ctx = {
    root,
    storage,
    state: storage.get(),
    plan: currentPlan(),
    getPlan,
    currentPlan,
    params: match ? match.slice(1) : [],
    query,
    navigate,
    rerender: render,
    setTitle: (t) => {
      document.title = `${t} · TEMPO FIT`;
    },
  };
  ctx.setTitle(route ? route.title : 'Page introuvable');
  cleanup = view(ctx) || null;
  // Accessibilité : le focus va au titre principal de la nouvelle vue.
  const h1 = root.querySelector('h1');
  if (h1) {
    h1.setAttribute('tabindex', '-1');
    h1.focus({ preventScroll: true });
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);

// Indique la version déployée dans le pied de page.
const versionEl = document.getElementById('build-version');
if (versionEl) {
  const short = BUILD.commit.startsWith('__') ? 'dev' : BUILD.commit.slice(0, 7);
  versionEl.textContent = `Version ${short}`;
}

if (!storage.persistent) {
  toast('Le stockage local est indisponible (navigation privée ?) : votre progression ne sera pas conservée.');
}

initPWA();

render();
