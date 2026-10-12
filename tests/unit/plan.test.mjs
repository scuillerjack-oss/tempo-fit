import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan, allSessions, buildTimeline, parseSessionKey, sessionKey, findSession } from '../../src/js/lib/plan.js';
import { LEVELS, LEVEL_ORDER, LIGHT_WEEKS } from '../../src/js/data/program.js';
import { getExercise } from '../../src/js/data/exercises.js';

const COMBOS = [];
for (const levelId of LEVEL_ORDER) for (const cycle of [1, 2, 3, 4]) for (const lowImpact of [false, true]) COMBOS.push({ levelId, cycle, lowImpact });
const name = (c) => `${c.levelId} cycle ${c.cycle}${c.lowImpact ? ' sans saut' : ''}`;
const mainIds = (s) => s.blocks.flatMap((b) => b.exercises);

test('36 semaines-niveaux : 12 semaines × 3 niveaux, toutes renseignées', () => {
  let weeks = 0;
  for (const levelId of LEVEL_ORDER) {
    const plan = generatePlan({ levelId });
    assert.equal(plan.weeks.length, 12);
    for (const w of plan.weeks) {
      assert.equal(w.days.length, 7);
      weeks++;
    }
  }
  assert.equal(weeks, 36);
});

for (const c of COMBOS) {
  test(`structure et règles : ${name(c)}`, () => {
    const level = LEVELS[c.levelId];
    const plan = generatePlan(c);
    const sessions = allSessions(plan);
    assert.equal(sessions.length, 12 * level.sessionsPerWeek);

    for (const w of plan.weeks) {
      const training = w.days.filter((d) => !d.rest);
      assert.equal(training.length, level.sessionsPerWeek, `semaine ${w.week} : nombre de séances`);
      assert.ok(w.days.some((d) => d.rest), `semaine ${w.week} : au moins un jour de repos`);
      assert.ok(w.days[6].rest, `semaine ${w.week} : le 7e jour est un repos`);
      assert.equal(w.work + w.rest, level.slotSec);
      assert.ok(w.rest >= 10, `semaine ${w.week} : récupération ≥ 10 s`);
      assert.ok(w.work <= level.maxWorkSec);
    }

    // Semaines allégées : moins d'effort que la semaine précédente.
    for (const lw of LIGHT_WEEKS) {
      assert.ok(plan.weeks[lw - 1].light);
      assert.ok(plan.weeks[lw - 1].work <= plan.weeks[lw - 2].work, `semaine ${lw} allégée`);
    }

    const sigs = new Set();
    let prev = null;
    for (const s of sessions) {
      // Durée cible (10 / 20 / 30 min), tolérance ±5 %.
      const target = level.targetMinutes * 60;
      assert.ok(Math.abs(s.durationSec - target) <= target * 0.05, `${s.key} : durée ${s.durationSec}s`);
      // Timeline = durée annoncée.
      const tl = buildTimeline(s);
      assert.equal(tl.reduce((sum, x) => sum + x.sec, 0), s.durationSec, `${s.key} : timeline`);
      // Échauffement et retour au calme encadrent toujours la séance.
      assert.equal(s.warmup[0], 'marche-active');
      assert.equal(s.cooldown.at(-1), 'respiration-lente');
      assert.equal(s.warmup.length, level.warmupSteps);
      assert.equal(s.cooldown.length, level.cooldownSteps);
      for (const id of s.warmup) assert.equal(getExercise(id).category, 'echauffement');
      for (const id of s.cooldown) assert.equal(getExercise(id).category, 'retour');
      // Aucun doublon dans une séance.
      const ids = mainIds(s);
      assert.equal(new Set(ids).size, ids.length, `${s.key} : doublon`);
      assert.equal(new Set(s.warmup).size, s.warmup.length);
      assert.equal(new Set(s.cooldown).size, s.cooldown.length);
      // Catégories conformes aux emplacements des blocs.
      for (const b of s.blocks) assert.equal(b.exercises.length, 4);
      // Mode sans saut respecté.
      if (c.lowImpact) for (const id of ids) assert.equal(getExercise(id).impact, 'faible', `${s.key} : ${id}`);
      // Pas d'exercice très exigeant pour les débutants.
      if (c.levelId === 'debutant') for (const id of ids) assert.ok(getExercise(id).difficulty <= 4, `${s.key} : ${id}`);
      // Variété : séance jamais identique, peu d'exercices repris de la séance précédente.
      const sig = s.blocks.map((b) => b.exercises.join(',')).join('|');
      assert.ok(!sigs.has(sig), `${s.key} : séance identique à une autre`);
      sigs.add(sig);
      if (prev) {
        const shared = ids.filter((id) => mainIds(prev).includes(id)).length;
        assert.ok(shared <= Math.ceil(ids.length / 4), `${s.key} : ${shared} exercices repris de la séance précédente`);
      }
      prev = s;
      // Clé de séance cohérente.
      assert.deepEqual(parseSessionKey(s.key), { levelId: c.levelId, cycle: c.cycle, week: s.week, day: s.day });
    }
  });
}

test('débutant : jamais deux jours d’entraînement consécutifs', () => {
  for (const d of LEVELS.debutant.trainingDays) assert.ok(!LEVELS.debutant.trainingDays.includes(d + 1));
});

test('génération déterministe (même plan sur tous les appareils)', () => {
  for (const c of COMBOS) assert.deepEqual(generatePlan(c), generatePlan(c));
});

test('le cycle suivant n’est pas une répétition mécanique du précédent', () => {
  for (const levelId of LEVEL_ORDER) {
    for (const cycle of [1, 2, 3]) {
      const a = allSessions(generatePlan({ levelId, cycle }));
      const b = allSessions(generatePlan({ levelId, cycle: cycle + 1 }));
      const same = a.filter((s, i) => mainIds(s).join() === mainIds(b[i]).join()).length;
      assert.equal(same, 0, `${levelId} cycle ${cycle}→${cycle + 1} : ${same} séances identiques`);
    }
  }
});

test('progression raisonnable : effort du cycle 2 ≥ cycle 1, plafonné par niveau', () => {
  for (const levelId of LEVEL_ORDER) {
    const p1 = generatePlan({ levelId, cycle: 1 });
    const p2 = generatePlan({ levelId, cycle: 2 });
    const p5 = generatePlan({ levelId, cycle: 5 });
    for (let i = 0; i < 12; i++) {
      assert.ok(p2.weeks[i].work >= p1.weeks[i].work);
      assert.ok(p2.weeks[i].work - p1.weeks[i].work <= 5);
      assert.equal(p5.weeks[i].work, p2.weeks[i].work, 'plafond atteint dès le cycle 2');
    }
  }
});

test('la difficulté moyenne augmente au fil des phases', () => {
  for (const levelId of LEVEL_ORDER) {
    const plan = generatePlan({ levelId });
    const avg = (weeks) => {
      const ids = plan.weeks.filter((w) => weeks.includes(w.week)).flatMap((w) => w.days.filter((d) => !d.rest).flatMap((d) => mainIds(d.session)));
      return ids.reduce((s, id) => s + getExercise(id).difficulty, 0) / ids.length;
    };
    assert.ok(avg([9, 10, 11, 12]) > avg([1, 2, 3, 4]), levelId);
  }
});

test('timeline : chaque pause annonce l’exercice suivant', () => {
  const s = findSession(generatePlan({ levelId: 'intermediaire' }), 1, 1);
  const tl = buildTimeline(s);
  const rests = tl.filter((x) => x.kind === 'rest');
  assert.ok(rests.length > 0);
  for (const r of rests) assert.ok(getExercise(r.nextId), 'nextId');
  assert.equal(tl.filter((x) => x.long).length, s.blocks.length - 1, 'transitions entre blocs');
});

test('clés de séance : rejet des valeurs invalides', () => {
  assert.equal(parseSessionKey('inconnu:c1:s1:j1'), null);
  assert.equal(parseSessionKey('debutant:c1:s1'), null);
  assert.equal(parseSessionKey('<script>'), null);
  assert.equal(sessionKey('avance', 2, 3, 4), 'avance:c2:s3:j4');
  assert.equal(findSession(generatePlan({ levelId: 'debutant' }), 1, 2), null, 'jour de repos');
});
