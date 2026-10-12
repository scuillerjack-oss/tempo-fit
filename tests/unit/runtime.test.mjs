import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRunner } from '../../src/js/lib/timer.js';
import { createStorage, sanitizeState, STORAGE_KEY } from '../../src/js/lib/storage.js';
import { generatePlan, buildTimeline, findSession, allSessions } from '../../src/js/lib/plan.js';
import { nextSession, stats, dayStatus, recommendation, cycleEnded, currentWeek } from '../../src/js/lib/progress.js';
import { addDays, diffDays, planDayForDate, dateForPlanDay, formatClock } from '../../src/js/lib/dates.js';
import { CONFIG, stripeTestLink } from '../../src/js/config.js';

// ───── Minuteur ─────
function fakeClock() {
  let t = 1_000_000;
  return { now: () => t, advance: (ms) => (t += ms) };
}
const STEPS = [
  { kind: 'work', exerciseId: 'squat', sec: 30 },
  { kind: 'rest', exerciseId: null, sec: 15, nextId: 'planche' },
  { kind: 'work', exerciseId: 'planche-laterale', sec: 20 },
];

test('minuteur : préparation puis enchaînement des étapes', () => {
  const clk = fakeClock();
  const r = createRunner(STEPS, { now: clk.now, prepSec: 10 });
  assert.equal(r.current().kind, 'prep');
  assert.equal(r.totalSec(), 75);
  r.start();
  clk.advance(10_000);
  const ev = r.tick();
  assert.ok(ev.some((e) => e.type === 'step'));
  assert.equal(r.current().exerciseId, 'squat');
  assert.equal(r.remaining(), 30_000);
});

test('minuteur : la pause fige le temps', () => {
  const clk = fakeClock();
  const r = createRunner(STEPS, { now: clk.now, prepSec: 10 });
  r.start();
  clk.advance(4_000);
  r.pause();
  clk.advance(60_000);
  r.tick();
  assert.equal(r.index, 0);
  assert.equal(r.remaining(), 6_000);
  r.start();
  clk.advance(6_000);
  r.tick();
  assert.equal(r.index, 1);
});

test('minuteur : reste juste après une mise en arrière-plan (saut de plusieurs étapes)', () => {
  const clk = fakeClock();
  const r = createRunner(STEPS, { now: clk.now, prepSec: 10 });
  r.start();
  clk.advance(10_000 + 30_000 + 5_000); // prépa + effort + 5 s de pause
  r.tick();
  assert.equal(r.index, 2);
  assert.equal(r.remaining(), 10_000);
});

test('minuteur : fin de séance, mi-temps et décompte', () => {
  const clk = fakeClock();
  const r = createRunner(STEPS, { now: clk.now, prepSec: 10 });
  r.start();
  clk.advance(55_000);
  r.tick();
  assert.equal(r.current().exerciseId, 'planche-laterale');
  clk.advance(10_000);
  assert.ok(r.tick().some((e) => e.type === 'half'));
  clk.advance(8_000);
  assert.ok(r.tick().some((e) => e.type === 'countdown' && e.seconds === 2));
  clk.advance(5_000);
  assert.ok(r.tick().some((e) => e.type === 'finish'));
  assert.ok(r.finished);
  assert.equal(r.progress(), 1);
});

test('minuteur : suivant / précédent, arrêt possible à tout moment', () => {
  const clk = fakeClock();
  const r = createRunner(STEPS, { now: clk.now, prepSec: 10 });
  r.next();
  assert.equal(r.index, 1);
  r.next();
  r.previous();
  assert.equal(r.index, 1);
  assert.equal(r.remaining(), 30_000);
  r.previous();
  r.previous();
  assert.equal(r.index, 0);
  r.next();
  r.next();
  r.next();
  r.next();
  assert.ok(r.finished);
});

test('minuteur : une vraie séance dure exactement la durée annoncée', () => {
  const s = findSession(generatePlan({ levelId: 'avance' }), 5, 1);
  const clk = fakeClock();
  const r = createRunner(buildTimeline(s), { now: clk.now, prepSec: 10 });
  r.start();
  clk.advance((s.durationSec + 10) * 1000 - 1);
  r.tick();
  assert.ok(!r.finished);
  clk.advance(1);
  r.tick();
  assert.ok(r.finished);
});

// ───── Sauvegarde locale ─────
function memStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('stockage : création, mise à jour et persistance', () => {
  const store = memStore();
  const s1 = createStorage(store);
  assert.equal(s1.persistent, true);
  s1.update((s) => {
    s.profile = { levelId: 'debutant', cycle: 1, startDate: '2026-10-12', lowImpact: true };
    s.completions['debutant:c1:s1:j1'] = { date: '2026-10-12', feeling: 'adapte' };
  });
  const s2 = createStorage(store);
  assert.equal(s2.get().profile.levelId, 'debutant');
  assert.equal(s2.get().profile.lowImpact, true);
  assert.equal(s2.get().completions['debutant:c1:s1:j1'].feeling, 'adapte');
});

test('stockage : repli en mémoire si localStorage est indisponible', () => {
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('quota'); }, removeItem() {} };
  const s = createStorage(broken);
  assert.equal(s.persistent, false);
  s.update((st) => (st.settings.sound = false));
  assert.equal(s.get().settings.sound, false);
});

test('stockage : données corrompues ignorées sans planter', () => {
  const store = memStore();
  store.setItem(STORAGE_KEY, '{pas du json');
  assert.equal(createStorage(store).get().profile, null);
});

test('stockage : nettoyage des données invalides', () => {
  const clean = sanitizeState({
    profile: { levelId: 'expert', startDate: '2026-10-12' },
    completions: { 'debutant:c1:s1:j1': { date: '2026-10-12', feeling: '<img>' }, 'faux': { date: '2026-10-12' }, 'avance:c1:s1:j1': { date: 'hier' } },
    settings: { sound: 'non' },
  });
  assert.equal(clean.profile, null);
  assert.deepEqual(Object.keys(clean.completions), ['debutant:c1:s1:j1']);
  assert.equal(clean.completions['debutant:c1:s1:j1'].feeling, null);
  assert.equal(clean.settings.sound, true);
});

test('stockage : export puis import (sauvegarde / restauration)', () => {
  const a = createStorage(memStore());
  a.update((s) => {
    s.profile = { levelId: 'avance', cycle: 2, startDate: '2026-01-05', lowImpact: false };
    s.completions['avance:c2:s1:j1'] = { date: '2026-01-05', feeling: 'facile' };
  });
  const json = a.exportJSON();
  const b = createStorage(memStore());
  b.importJSON(json);
  assert.deepEqual(b.get().profile, a.get().profile);
  assert.deepEqual(b.get().completions, a.get().completions);
  assert.throws(() => b.importJSON('{"app":"autre"}'), /TEMPO FIT/);
  assert.throws(() => b.importJSON('nope'), /illisible/);
});

// ───── Dates ─────
test('dates : calculs robustes aux changements d’heure', () => {
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(addDays('2026-03-28', 2), '2026-03-30');
  assert.equal(addDays('2026-10-24', 7), '2026-10-31');
  assert.equal(diffDays('2026-03-01', '2026-04-01'), 31);
  assert.equal(dateForPlanDay('2026-10-12', 2, 3), '2026-10-21');
  assert.deepEqual(planDayForDate('2026-10-12', '2026-10-21'), { week: 2, day: 3 });
  assert.equal(planDayForDate('2026-10-12', '2026-10-11'), null);
  assert.equal(planDayForDate('2026-10-12', addDays('2026-10-12', 84)), null);
  assert.equal(formatClock(65.2), '1:06');
  assert.equal(formatClock(-3), '0:00');
});

// ───── Progression ─────
test('progression : prochaine séance, statuts sans pénalité, statistiques', () => {
  const plan = generatePlan({ levelId: 'debutant' });
  const sessions = allSessions(plan);
  const completions = { [sessions[0].key]: { date: '2026-10-12', feeling: 'facile' } };
  assert.equal(nextSession(plan, completions).key, sessions[1].key);
  const st = stats(plan, completions);
  assert.equal(st.done, 1);
  assert.equal(st.total, 36);
  assert.equal(st.minutes, 10);
  const day = { ...plan.weeks[0].days[2], week: 1 };
  assert.equal(dayStatus(day, '2026-10-12', '2026-10-20', completions).status, 'non-realisee');
  assert.equal(dayStatus(day, '2026-10-12', '2026-10-14', completions).status, 'aujourdhui');
  assert.equal(dayStatus(day, '2026-10-12', '2026-10-13', completions).status, 'a-venir');
  assert.equal(dayStatus({ ...plan.weeks[0].days[1], week: 1 }, '2026-10-12', '2026-10-13', completions).status, 'repos-aujourdhui');
  assert.equal(currentWeek('2026-10-12', '2026-10-01'), 1);
  assert.equal(currentWeek('2026-10-12', '2027-06-01'), 12);
});

test('progression : fin de cycle et recommandation prudente', () => {
  const plan = generatePlan({ levelId: 'debutant' });
  const all = Object.fromEntries(allSessions(plan).map((s) => [s.key, { date: '2026-10-12', feeling: 'facile' }]));
  assert.ok(cycleEnded(plan, all, '2026-10-12', '2026-10-13'));
  assert.ok(cycleEnded(plan, {}, '2026-10-12', '2027-01-04'));
  assert.ok(!cycleEnded(plan, {}, '2026-10-12', '2026-11-01'));
  assert.equal(recommendation('debutant', stats(plan, all)).kind, 'monter');
  assert.equal(recommendation('avance', stats(plan, all)).kind, 'continuer', 'pas de niveau au-dessus de avancé');
  const hard = Object.fromEntries(Object.keys(all).map((k) => [k, { date: '2026-10-12', feeling: 'difficile' }]));
  assert.equal(recommendation('debutant', stats(plan, hard)).kind, 'repeter');
  assert.equal(recommendation('debutant', stats(plan, {})).kind, 'repeter');
});

// ───── Paiement : mode test uniquement ─────
test('Stripe : seul un lien de paiement en mode test est accepté', () => {
  const original = CONFIG.stripeTestPaymentLink;
  try {
    CONFIG.stripeTestPaymentLink = '';
    assert.equal(stripeTestLink(), null, 'aucun lien par défaut');
    CONFIG.stripeTestPaymentLink = 'https://buy.stripe.com/abc123';
    assert.equal(stripeTestLink(), null, 'lien live refusé');
    CONFIG.stripeTestPaymentLink = 'https://buy.stripe.com/test_abc123';
    assert.equal(stripeTestLink(), 'https://buy.stripe.com/test_abc123');
    CONFIG.stripeTestPaymentLink = 'javascript:alert(1)//buy.stripe.com/test_x';
    assert.equal(stripeTestLink(), null);
  } finally {
    CONFIG.stripeTestPaymentLink = original;
  }
});

test('configuration livrée : aucun lien de paiement actif', () => {
  assert.equal(CONFIG.stripeTestPaymentLink, '');
});
