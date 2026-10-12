// Tests de bout en bout (navigateur Chromium via Playwright) sur le site construit (dist/).
// Prérequis : npm run build ; npm i --no-save playwright axe-core
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { startServer } from '../../scripts/serve.mjs';

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PORT = 8181;
const BASE = `http://localhost:${PORT}/`;
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESKTOP = { viewport: { width: 1280, height: 800 } };
const NOW = new Date('2026-10-12T09:00:00'); // lundi

let server;
let browser;

before(async () => {
  server = await startServer(PORT);
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(async () => {
  await browser?.close();
  server?.close();
});

async function open(opts = MOBILE, { clock = true, sw = 'block' } = {}) {
  const context = await browser.newContext({ ...opts, serviceWorkers: sw, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  if (clock) await page.clock.install({ time: NOW });
  return { context, page, errors };
}

async function noHorizontalScroll(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w, `défilement horizontal : ${sw}px > ${w}px`);
}

async function axe(page, label) {
  // La CSP du site bloque les scripts injectés en ligne (c'est voulu) : axe est évalué via le protocole du navigateur.
  await page.evaluate(AXE);
  const res = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target }));
  });
  const serious = res.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  assert.deepEqual(serious, [], `${label} : violations d’accessibilité ${JSON.stringify(serious)}`);
  return res;
}

async function createPlan(page, level = 'debutant', { lowImpact = false } = {}) {
  await page.goto(`${BASE}#/demarrer?niveau=${level}`);
  if (lowImpact) await page.getByRole('checkbox', { name: /sans saut/ }).check();
  await page.getByLabel(/J’ai lu les/).check();
  await page.getByRole('button', { name: /Créer mon plan/ }).click();
  await page.getByRole('heading', { name: 'Mon plan', level: 1, exact: true }).waitFor();
}

test('accueil mobile : contenu, navigation, sans erreur ni débordement', async () => {
  const { context, page, errors } = await open();
  await page.goto(BASE);
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.match(await page.locator('h1').innerText(), /séances courtes/i);
  assert.equal(await page.locator('.level-card').count(), 3);
  assert.ok(await page.locator('.tab-bar').isVisible(), 'barre d’onglets visible sur mobile');
  assert.ok(!(await page.locator('.top-nav').isVisible()), 'menu du haut masqué sur mobile');
  await noHorizontalScroll(page);
  await axe(page, 'accueil');
  assert.deepEqual(errors, []);
  await context.close();
});

test('création du plan débutant : calendrier, séances et jours de repos', async () => {
  const { context, page, errors } = await open();
  await page.goto(`${BASE}#/demarrer`);
  // La case de sécurité est obligatoire.
  await page.getByRole('button', { name: /Créer mon plan/ }).click();
  assert.ok(await page.locator('#ack-error').isVisible());
  await page.getByLabel(/J’ai lu les/).check();
  await page.getByRole('button', { name: /Créer mon plan/ }).click();
  await page.getByRole('heading', { name: 'Mon plan', level: 1, exact: true }).waitFor();
  assert.equal(await page.locator('.days > li').count(), 7);
  assert.equal(await page.locator('.days > li.day-rest').count(), 4);
  assert.equal(await page.locator('.days > li.status-aujourdhui').count(), 1);
  assert.equal(await page.locator('.overview > li').count(), 12);
  await noHorizontalScroll(page);
  await axe(page, 'plan');
  // Navigation semaine suivante.
  await page.getByRole('link', { name: 'Semaine suivante' }).click();
  await page.getByRole('heading', { name: /Semaine 2/ }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test('séance guidée complète : minuteur, pause, fin et sauvegarde locale', async () => {
  const { context, page, errors } = await open();
  await createPlan(page);
  await page.goto(`${BASE}#/`);
  await page.getByRole('link', { name: 'Démarrer la séance' }).click();
  await page.locator('#runner').waitFor();
  assert.equal(await page.locator('#kind').innerText(), 'PRÉPAREZ-VOUS'.toUpperCase());
  assert.ok(!(await page.locator('.tab-bar').isVisible()), 'mode immersif');
  await axe(page, 'minuteur');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor(11_000);
  assert.match(await page.locator('#kind').innerText(), /effort/i);
  assert.equal(await page.locator('#name').innerText(), 'Marche active sur place');
  // Pause : le temps ne bouge plus.
  await page.getByRole('button', { name: 'Pause' }).click();
  const frozen = await page.locator('#clock').innerText();
  await page.clock.runFor(20_000);
  assert.equal(await page.locator('#clock').innerText(), frozen);
  await page.getByRole('button', { name: 'Reprendre' }).click();
  // Suivant / précédent.
  await page.getByRole('button', { name: 'Étape suivante' }).click();
  assert.match(await page.locator('#step-count').innerText(), /Étape 2/);
  await page.getByRole('button', { name: 'Étape précédente' }).click();
  assert.match(await page.locator('#step-count').innerText(), /Étape 1/);
  // Version plus douce.
  await page.getByRole('button', { name: 'Version plus douce' }).click();
  assert.ok(await page.locator('#easier-box').isVisible());
  // Fin de séance (10 min).
  await page.clock.runFor(10 * 60_000 + 2_000);
  await page.getByRole('heading', { name: /Séance terminée/ }).waitFor();
  await page.getByRole('button', { name: 'Adaptée' }).click();
  await page.locator('.days > li.status-fait').first().waitFor();
  assert.equal(await page.locator('.days > li.status-fait').count(), 1);
  // Persistance après rechargement.
  await page.reload();
  assert.equal(await page.locator('.days > li.status-fait').count(), 1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tempofit.v1')));
  assert.equal(saved.completions['debutant:c1:s1:j1'].feeling, 'adapte');
  assert.deepEqual(errors, []);
  await context.close();
});

test('arrêt d’une séance sans pénalité', async () => {
  const { context, page, errors } = await open();
  await createPlan(page);
  await page.goto(`${BASE}#/go/debutant:c1:s1:j1`);
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor(30_000);
  await page.getByRole('button', { name: 'Arrêter' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Arrêter' }).click();
  await page.getByRole('heading', { name: 'Mon plan', level: 1, exact: true }).waitFor();
  assert.equal(await page.locator('.days > li.status-fait').count(), 0);
  assert.equal(await page.locator('.days > li.status-aujourdhui').count(), 1, 'la séance reste à faire');
  assert.deepEqual(errors, []);
  await context.close();
});

test('mode sans saut : aucune séance du plan ne contient d’exercice avec sauts', async () => {
  const { context, page, errors } = await open();
  await createPlan(page, 'avance', { lowImpact: true });
  const ids = await page.evaluate(async () => {
    const { generatePlan, allSessions } = await import('./js/lib/plan.js');
    const { getExercise } = await import('./js/data/exercises.js');
    const plan = generatePlan({ levelId: 'avance', cycle: 1, lowImpact: true });
    return allSessions(plan).flatMap((s) => s.blocks.flatMap((b) => b.exercises)).filter((id) => getExercise(id).impact === 'eleve');
  });
  assert.deepEqual(ids, []);
  assert.deepEqual(errors, []);
  await context.close();
});

test('bibliothèque d’exercices : filtres, recherche et fiche', async () => {
  const { context, page, errors } = await open();
  await page.goto(`${BASE}#/exercices`);
  const total = await page.locator('.ex-item').count();
  assert.ok(total >= 50);
  await page.getByLabel('Sans saut uniquement').check();
  assert.ok((await page.locator('.ex-item').count()) < total);
  await page.getByLabel('Rechercher').fill('planche');
  assert.ok((await page.locator('.ex-item').count()) >= 3);
  await axe(page, 'exercices');
  await page.goto(`${BASE}#/exercice/burpee`);
  await page.getByRole('heading', { name: 'Burpee', level: 1 }).waitFor();
  assert.ok(await page.getByRole('heading', { name: 'Alternative à faible impact' }).isVisible());
  assert.ok(await page.getByRole('heading', { name: 'Précautions' }).isVisible());
  await noHorizontalScroll(page);
  assert.deepEqual(errors, []);
  await context.close();
});

test('tarifs : aucun paiement actif, aucun lien de paiement', async () => {
  const { context, page, errors } = await open();
  await page.goto(`${BASE}#/tarifs`);
  await page.getByRole('heading', { name: 'Tarifs' }).waitFor();
  const payBtn = page.getByRole('button', { name: /Paiement non disponible/ });
  assert.ok(await payBtn.isDisabled());
  assert.equal(await page.locator('a[href*="stripe"]').count(), 0);
  assert.equal(await page.locator('form[action]').count(), 0);
  await axe(page, 'tarifs');
  assert.deepEqual(errors, []);
  await context.close();
});

test('progression, réglages, export et pages d’information', async () => {
  const { context, page, errors } = await open();
  await createPlan(page, 'intermediaire');
  await page.goto(`${BASE}#/progres`);
  await page.getByText(/synchronisation entre appareils n’existe pas encore/).first().waitFor();
  assert.equal(await page.locator('.bars > li').count(), 12);
  await axe(page, 'progression');
  await page.goto(`${BASE}#/reglages`);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exporter une sauvegarde' }).click()]);
  assert.match(download.suggestedFilename(), /^tempo-fit-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/);
  await axe(page, 'réglages');
  for (const [path, heading] of [
    ['securite', 'Consignes de sécurité'],
    ['confidentialite', 'Confidentialité'],
    ['mentions-legales', 'Mentions légales'],
    ['programmes', 'Les programmes'],
  ]) {
    await page.goto(`${BASE}#/${path}`);
    await page.getByRole('heading', { name: heading, level: 1 }).waitFor();
    await noHorizontalScroll(page);
    await axe(page, path);
  }
  await page.goto(`${BASE}#/nimporte-quoi`);
  await page.getByRole('heading', { name: 'Page introuvable' }).waitFor();
  await page.goto(`${BASE}#/seance/inconnu:c1:s1:j1`);
  await page.getByRole('heading', { name: 'Page introuvable' }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test('changer de cycle : le cycle suivant est généré et l’historique conservé', async () => {
  const { context, page, errors } = await open();
  await createPlan(page);
  await page.goto(`${BASE}#/seance/debutant:c1:s1:j1`);
  await page.getByRole('button', { name: /sans le minuteur/ }).click();
  await page.goto(`${BASE}#/progres`);
  await page.getByRole('button', { name: /Démarrer le cycle 2/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('heading', { name: 'Mon plan', level: 1, exact: true }).waitFor();
  assert.match(await page.locator('main').innerText(), /cycle 2/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tempofit.v1')));
  assert.equal(saved.profile.cycle, 2);
  assert.ok(saved.completions['debutant:c1:s1:j1'], 'historique conservé');
  assert.equal(saved.cyclesDone.length, 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('ordinateur : navigation du haut et mise en page large', async () => {
  const { context, page, errors } = await open(DESKTOP);
  await page.goto(BASE);
  assert.ok(await page.locator('.top-nav').isVisible());
  assert.ok(!(await page.locator('.tab-bar').isVisible()));
  await page.locator('.top-nav').getByRole('link', { name: 'Exercices' }).click();
  await page.getByRole('heading', { name: 'Bibliothèque d’exercices' }).waitFor();
  await noHorizontalScroll(page);
  assert.deepEqual(errors, []);
  await context.close();
});

test('PWA : manifeste, icônes, service worker et fonctionnement hors ligne', async () => {
  const { context, page, errors } = await open(MOBILE, { clock: false, sw: 'allow' });
  const manifest = await (await page.request.get(`${BASE}manifest.webmanifest`)).json();
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
  for (const icon of manifest.icons) assert.equal((await page.request.get(BASE + icon.src)).status(), 200, icon.src);
  const version = await (await page.request.get(`${BASE}version.json`)).json();
  assert.equal(version.app, 'tempo-fit');
  assert.match(version.commit, /^([0-9a-f]{40}|local)$/);
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.goto(`${BASE}#/exercices`);
  assert.ok((await page.locator('.ex-item').count()) >= 50, 'bibliothèque disponible hors ligne');
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  await context.close();
});

test('stockage indisponible : le site reste utilisable et prévient l’utilisateur', async () => {
  const { context, page, errors } = await open();
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('bloqué');
      },
    });
  });
  await page.goto(BASE);
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.match(await page.locator('#toast').innerText(), /stockage local est indisponible/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('petit écran (320 px) : aucune page ne déborde horizontalement', async () => {
  const { context, page, errors } = await open({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
  for (const h of ['', 'go/avance:c1:s1:j1', 'seance/avance:c1:s1:j1', 'exercices', 'exercice/planche-laterale', 'programmes', 'tarifs', 'demarrer', 'progres', 'reglages', 'securite']) {
    await page.goto(`${BASE}#/${h}`);
    await page.locator('h1').first().waitFor();
    await noHorizontalScroll(page);
  }
  assert.deepEqual(errors, []);
  await context.close();
});
