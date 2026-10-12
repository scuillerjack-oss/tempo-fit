import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, CATEGORIES, getExercise } from '../../src/js/data/exercises.js';

test('identifiants uniques et format stable', () => {
  const ids = EXERCISES.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
});

test('chaque exercice a consignes, variantes et précautions', () => {
  for (const e of EXERCISES) {
    assert.ok(CATEGORIES[e.category], `${e.id} : catégorie`);
    assert.ok(e.name.length > 2, `${e.id} : nom`);
    assert.ok(Array.isArray(e.steps) && e.steps.length >= 2, `${e.id} : consignes`);
    assert.ok(e.easier && e.harder, `${e.id} : variantes`);
    assert.ok(Array.isArray(e.precautions) && e.precautions.length >= 1, `${e.id} : précautions`);
    assert.ok(Number.isInteger(e.difficulty) && e.difficulty >= 1 && e.difficulty <= 5, `${e.id} : difficulté`);
    assert.ok(['faible', 'eleve'].includes(e.impact), `${e.id} : impact`);
    assert.ok([null, 'alterner', 'changer'].includes(e.sides), `${e.id} : côtés`);
  }
});

test('tout exercice avec sauts a une alternative sans saut valide', () => {
  for (const e of EXERCISES.filter((x) => x.impact === 'eleve')) {
    const alt = getExercise(e.lowImpactAlt);
    assert.ok(alt, `${e.id} : alternative manquante`);
    assert.equal(alt.impact, 'faible', `${e.id} : l’alternative doit être sans saut`);
  }
  for (const e of EXERCISES.filter((x) => x.lowImpactAlt)) assert.ok(getExercise(e.lowImpactAlt), `${e.id} : alternative inexistante`);
});

test('échauffement et retour au calme : exercices accessibles et sans saut', () => {
  for (const e of EXERCISES.filter((x) => x.category === 'echauffement' || x.category === 'retour')) {
    assert.equal(e.difficulty, 1, e.id);
    assert.equal(e.impact, 'faible', e.id);
  }
});

test('chaque catégorie du corps de séance a assez d’exercices accessibles', () => {
  for (const cat of ['cardio', 'bas', 'haut', 'gainage']) {
    const easy = EXERCISES.filter((e) => e.category === cat && e.difficulty <= 2 && e.impact === 'faible');
    assert.ok(easy.length >= 3, `${cat} : ${easy.length} exercices accessibles sans saut`);
  }
});

test('textes sans promesse de résultat ni vocabulaire médical interdit', () => {
  const banned = /(perte de poids|maigrir|guéri|garanti|brûle[rz]? les graisses)/i;
  for (const e of EXERCISES) {
    const text = [e.name, ...e.steps, e.easier, e.harder, ...e.precautions].join(' ');
    assert.doesNotMatch(text, banned, e.id);
  }
});
