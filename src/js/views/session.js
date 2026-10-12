import { parseSessionKey, findSession } from '../lib/plan.js';
import { getExercise } from '../data/exercises.js';
import { WARMUP_STEP_SEC, COOLDOWN_STEP_SEC, BLOCK_TRANSITION_SEC } from '../data/program.js';
import { dateForPlanDay, formatLong, formatDuration, today } from '../lib/dates.js';
import { esc, exLink, levelLabel, safetyNote, toast } from '../ui.js';
import { renderNotFound } from './pages.js';

// Retrouve une séance à partir de sa clé. Sans profil, la séance découverte reste consultable.
export function resolveSession(ctx, key) {
  const parsed = parseSessionKey(key);
  if (!parsed) return null;
  const lowImpact = ctx.state.profile?.levelId === parsed.levelId ? ctx.state.profile.lowImpact : false;
  const plan = ctx.getPlan(parsed.levelId, parsed.cycle, lowImpact);
  return findSession(plan, parsed.week, parsed.day);
}

export function isOwnSession(ctx, session) {
  const p = ctx.state.profile;
  return Boolean(p && p.levelId === session.levelId && p.cycle === session.cycle);
}

function sideHint(id) {
  const e = getExercise(id);
  if (!e?.sides) return '';
  return e.sides === 'changer' ? ' <span class="muted">(changer de côté à mi-temps)</span>' : ' <span class="muted">(en alternant)</span>';
}

export function renderSession(ctx) {
  const session = resolveSession(ctx, ctx.params[0]);
  if (!session) return renderNotFound(ctx);
  const own = isOwnSession(ctx, session);
  const done = ctx.state.completions[session.key];
  const date = own ? dateForPlanDay(ctx.state.profile.startDate, session.week, session.day) : null;
  ctx.setTitle(session.title);

  const blocks = session.blocks
    .map(
      (b, i) => `<section class="block">
      <h3>Bloc ${i + 1} · ${esc(b.label)}</h3>
      <p class="muted">${b.rounds} tours · ${b.work} s d’effort / ${b.rest} s de récupération par exercice</p>
      <ol>${b.exercises.map((id) => `<li>${exLink(id)}${sideHint(id)}</li>`).join('')}</ol>
    </section>${i < session.blocks.length - 1 ? `<p class="muted">Pause de ${BLOCK_TRANSITION_SEC} s entre les blocs : buvez un peu d’eau.</p>` : ''}`,
    )
    .join('');

  let completionBlock;
  if (!ctx.state.profile) {
    completionBlock = `<p class="note">Pour enregistrer vos séances et obtenir votre calendrier, <a href="#/demarrer?niveau=${esc(session.levelId)}">créez votre plan gratuit</a>.</p>`;
  } else if (!own) {
    completionBlock = `<p class="note">Cette séance ne fait pas partie de votre plan actuel : elle ne sera pas enregistrée dans votre progression.</p>`;
  } else if (done) {
    completionBlock = `<p>✓ Faite le ${esc(formatLong(done.date))}.</p><button class="btn btn-ghost" id="undo">Annuler « faite »</button>`;
  } else {
    completionBlock = `<button class="btn btn-ghost" id="mark">Je l’ai faite sans le minuteur</button>`;
  }

  ctx.root.innerHTML = `<p><a href="${own ? `#/plan?semaine=${session.week}` : '#/'}">← ${own ? 'Retour au plan' : 'Retour'}</a></p>
    <h1>${esc(session.title)}</h1>
    <p class="muted">${esc(levelLabel(session.levelId))} · cycle ${session.cycle} · semaine ${session.week}${date ? ` · prévue le ${esc(formatLong(date))}` : ''}</p>
    <p class="big">${esc(formatDuration(session.durationSec))}</p>
    ${session.light ? '<p class="note">Semaine allégée : un peu moins d’effort, plus de récupération. C’est voulu, pour mieux progresser ensuite.</p>' : ''}
    <div class="actions"><a class="btn btn-primary btn-lg" href="#/go/${esc(session.key)}">Commencer la séance guidée</a></div>
    <section class="block">
      <h2>Échauffement <span class="muted">· ${session.warmup.length} × ${WARMUP_STEP_SEC} s</span></h2>
      <ol>${session.warmup.map((id) => `<li>${exLink(id)}${sideHint(id)}</li>`).join('')}</ol>
    </section>
    <h2>Corps de séance</h2>
    ${blocks}
    <section class="block">
      <h2>Retour au calme <span class="muted">· ${session.cooldown.length} × ${COOLDOWN_STEP_SEC} s</span></h2>
      <ol>${session.cooldown.map((id) => `<li>${exLink(id)}${sideHint(id)}</li>`).join('')}</ol>
    </section>
    <p class="hint">Chaque exercice propose une version plus facile. Adaptez l’amplitude et le rythme à vos sensations : l’objectif est de finir la séance en bon état.</p>
    <div class="completion">${completionBlock}</div>
    ${safetyNote()}`;

  ctx.root.querySelector('#mark')?.addEventListener('click', () => {
    ctx.storage.update((s) => {
      s.completions[session.key] = { date: today(), feeling: null };
    });
    toast('Séance enregistrée sur cet appareil.');
    ctx.rerender();
  });
  ctx.root.querySelector('#undo')?.addEventListener('click', () => {
    ctx.storage.update((s) => {
      delete s.completions[session.key];
    });
    ctx.rerender();
  });
}
