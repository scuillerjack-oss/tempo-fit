import { EXERCISES, CATEGORIES, getExercise } from '../data/exercises.js';
import { esc, categoryLabel, chip, safetyNote } from '../ui.js';
import { renderNotFound } from './pages.js';

const DIFF_LABEL = ['', 'Très accessible', 'Accessible', 'Intermédiaire', 'Exigeant', 'Très exigeant'];

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function renderExercises(ctx) {
  const cat = CATEGORIES[ctx.query.get('cat')] ? ctx.query.get('cat') : '';
  ctx.root.innerHTML = `<h1>Bibliothèque d’exercices</h1>
    <p class="lead">${EXERCISES.length} exercices sans matériel, avec consignes, variantes et précautions.</p>
    <div class="filters" role="group" aria-label="Filtrer les exercices">
      <label for="q" class="sr-only">Rechercher</label>
      <input type="search" id="q" placeholder="Rechercher un exercice…" autocomplete="off">
      <label for="cat" class="sr-only">Catégorie</label>
      <select id="cat">
        <option value="">Toutes les catégories</option>
        ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${esc(k)}" ${k === cat ? 'selected' : ''}>${esc(v)}</option>`).join('')}
      </select>
      <label class="check"><input type="checkbox" id="nojump"> <span>Sans saut uniquement</span></label>
    </div>
    <p class="muted" id="count" aria-live="polite"></p>
    <ul class="ex-list plain" id="list"></ul>
    ${safetyNote()}`;

  const q = ctx.root.querySelector('#q');
  const sel = ctx.root.querySelector('#cat');
  const nojump = ctx.root.querySelector('#nojump');
  const list = ctx.root.querySelector('#list');
  const count = ctx.root.querySelector('#count');

  function update() {
    const term = normalize(q.value.trim());
    const items = EXERCISES.filter(
      (e) => (!sel.value || e.category === sel.value) && (!nojump.checked || e.impact === 'faible') && (!term || normalize(e.name).includes(term)),
    );
    count.textContent = `${items.length} exercice${items.length > 1 ? 's' : ''}`;
    list.innerHTML = items
      .map(
        (e) => `<li class="ex-item"><a href="#/exercice/${esc(e.id)}">
          <span class="ex-name">${esc(e.name)}</span>
          <span class="ex-meta">${chip(categoryLabel(e.category))} ${chip(DIFF_LABEL[e.difficulty])} ${e.impact === 'eleve' ? chip('Avec sauts', 'chip-warn') : ''}</span>
        </a></li>`,
      )
      .join('');
  }
  q.addEventListener('input', update);
  sel.addEventListener('change', update);
  nojump.addEventListener('change', update);
  update();
}

export function renderExercise(ctx) {
  const e = getExercise(ctx.params[0]);
  if (!e) return renderNotFound(ctx);
  ctx.setTitle(e.name);
  const alt = e.lowImpactAlt ? getExercise(e.lowImpactAlt) : null;
  const usedAsAlt = EXERCISES.filter((x) => x.lowImpactAlt === e.id);
  ctx.root.innerHTML = `<p><a href="#/exercices">← Tous les exercices</a></p>
    <h1>${esc(e.name)}</h1>
    <p>${chip(categoryLabel(e.category))} ${chip(DIFF_LABEL[e.difficulty])} ${e.impact === 'eleve' ? chip('Avec sauts', 'chip-warn') : chip('Sans saut')}</p>
    ${e.sides === 'changer' ? '<p class="note">Exercice d’un seul côté : changez de côté à mi-temps.</p>' : ''}
    ${e.sides === 'alterner' ? '<p class="note">Alternez les côtés à chaque répétition.</p>' : ''}
    <section><h2>Consignes</h2><ol>${e.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>
    <section><h2>Durée</h2><p>La durée est fixée par la séance : de 20 à 40 secondes d’effort selon le niveau et la semaine, ou 30 secondes à l’échauffement et au retour au calme. Gardez un rythme qui vous permet de bien exécuter le mouvement jusqu’au bout.</p></section>
    <section><h2>Variantes</h2>
      <ul><li><strong>Plus facile :</strong> ${esc(e.easier)}</li><li><strong>Plus difficile :</strong> ${esc(e.harder)}</li></ul>
    </section>
    ${alt ? `<section><h2>Alternative à faible impact</h2><p><a href="#/exercice/${esc(alt.id)}">${esc(alt.name)}</a> — même rôle dans la séance, sans saut.</p></section>` : ''}
    ${usedAsAlt.length ? `<section><h2>Remplace aussi</h2><p>Cet exercice sert d’alternative sans saut à : ${usedAsAlt.map((x) => `<a href="#/exercice/${esc(x.id)}">${esc(x.name)}</a>`).join(', ')}.</p></section>` : ''}
    <section><h2>Précautions</h2><ul>${e.precautions.map((p) => `<li>${esc(p)}</li>`).join('')}<li>Arrêtez en cas de douleur ou de malaise.</li></ul></section>
    ${safetyNote()}`;
}
