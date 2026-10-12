import { LEVELS, LEVEL_ORDER } from '../data/program.js';
import { findSession } from '../lib/plan.js';
import { nextSession, stats, cycleEnded } from '../lib/progress.js';
import { today, planDayForDate, dateForPlanDay, formatLong, formatDuration } from '../lib/dates.js';
import { esc, levelLabel, safetyNote, localDataNote } from '../ui.js';

function levelCards() {
  return LEVEL_ORDER.map((id) => {
    const l = LEVELS[id];
    return `<li class="card level-card level-${esc(id)}">
      <h3>${esc(l.label)}</h3>
      <p class="big">${l.targetMinutes} min <span class="muted">· ${l.sessionsPerWeek} séances/semaine</span></p>
      <p>${esc(l.who)}</p>
      <a class="btn btn-secondary" href="#/demarrer?niveau=${esc(id)}">Choisir ${esc(l.label.toLowerCase())}</a>
    </li>`;
  }).join('');
}

function welcome() {
  return `<section class="hero">
      <p class="eyebrow">Bêta gratuite · sans matériel · à la maison</p>
      <h1>Des séances courtes, déjà prêtes. Vous n’avez plus qu’à appuyer sur « Démarrer ».</h1>
      <p class="lead">TEMPO FIT vous donne un plan de 12 semaines adapté à votre niveau : 10, 20 ou 30 minutes, guidées pas à pas avec un minuteur. Fini le temps passé à chercher quoi faire.</p>
      <div class="actions">
        <a class="btn btn-primary btn-lg" href="#/demarrer">Créer mon plan gratuit</a>
        <a class="btn btn-ghost btn-lg" href="#/seance/debutant:c1:s1:j1">Essayer une séance découverte</a>
      </div>
    </section>
    <section aria-labelledby="h-parcours">
      <h2 id="h-parcours">Trois parcours</h2>
      <ul class="grid-3 plain">${levelCards()}</ul>
      <p><a href="#/programmes">Comment les programmes sont construits</a></p>
    </section>
    <section aria-labelledby="h-comment" class="features">
      <h2 id="h-comment">Comment ça marche</h2>
      <ol class="steps-list">
        <li><strong>Choisissez votre niveau</strong> et votre date de départ.</li>
        <li><strong>Suivez le calendrier</strong> : séances et jours de repos sont déjà planifiés.</li>
        <li><strong>Lancez la séance guidée</strong> : échauffement, exercices, pauses et retour au calme minutés.</li>
        <li><strong>Après 12 semaines</strong>, un nouveau cycle varié vous est proposé.</li>
      </ol>
    </section>
    <section aria-labelledby="h-gratuit">
      <h2 id="h-gratuit">Aperçu gratuit</h2>
      <p>Pendant la bêta, l’ensemble des programmes est accessible gratuitement, sans compte et sans paiement. <a href="#/tarifs">En savoir plus</a></p>
      ${localDataNote()}
    </section>
    ${safetyNote()}`;
}

function dashboard(ctx) {
  const { profile, completions } = ctx.state;
  const plan = ctx.plan;
  const t = today();
  const pos = planDayForDate(profile.startDate, t);
  const todaySession = pos ? findSession(plan, pos.week, pos.day) : null;
  const next = nextSession(plan, completions);
  const st = stats(plan, completions);
  const ended = cycleEnded(plan, completions, profile.startDate, t);
  let todayBlock;
  if (!pos && t < profile.startDate) {
    todayBlock = `<p>Votre plan commence le <strong>${esc(formatLong(profile.startDate))}</strong>. Vous pouvez déjà découvrir la première séance.</p>`;
  } else if (todaySession && !completions[todaySession.key]) {
    todayBlock = `<p class="big">${esc(todaySession.title)}</p>
      <p class="muted">Semaine ${todaySession.week} · ${esc(formatDuration(todaySession.durationSec))}${todaySession.light ? ' · semaine allégée' : ''}</p>
      <div class="actions"><a class="btn btn-primary btn-lg" href="#/go/${esc(todaySession.key)}">Démarrer la séance</a>
      <a class="btn btn-ghost" href="#/seance/${esc(todaySession.key)}">Voir le détail</a></div>`;
  } else if (todaySession) {
    todayBlock = `<p class="big">Séance du jour terminée ✓</p><p>Bravo. Profitez de la récupération.</p>`;
  } else if (pos) {
    todayBlock = `<p class="big">Jour de repos</p><p>La récupération fait partie du programme. Une marche tranquille est une bonne option si vous avez envie de bouger.</p>`;
  } else {
    todayBlock = `<p>Les 12 semaines de ce cycle sont écoulées.</p>`;
  }
  const nextBlock =
    next && (!todaySession || next.key !== todaySession.key)
      ? `<div class="card"><h2>Prochaine séance à faire</h2>
        <p><strong>${esc(next.title)}</strong> — semaine ${next.week}, prévue le ${esc(formatLong(dateForPlanDay(profile.startDate, next.week, next.day)))}</p>
        <p class="muted">Vous pouvez la faire quand vous le souhaitez : une séance manquée n’est pas pénalisée.</p>
        <a class="btn btn-secondary" href="#/go/${esc(next.key)}">Faire cette séance maintenant</a></div>`
      : '';
  const endBlock = ended
    ? `<div class="card card-accent"><h2>Cycle terminé</h2><p>Un nouveau cycle avec des variations vous attend.</p><a class="btn btn-primary" href="#/progres#cycle">Voir la suite</a></div>`
    : '';
  return `<h1>Bonjour 👋</h1>
    <p class="muted">Parcours ${esc(levelLabel(profile.levelId))} · cycle ${profile.cycle}${profile.lowImpact ? ' · sans saut' : ''}</p>
    <section class="card card-today" aria-labelledby="h-today">
      <h2 id="h-today">Aujourd’hui · ${esc(formatLong(t))}</h2>
      ${todayBlock}
    </section>
    ${endBlock}
    ${nextBlock}
    <section class="card" aria-labelledby="h-prog">
      <h2 id="h-prog">Votre progression</h2>
      <p><strong>${st.done}</strong> séance${st.done > 1 ? 's' : ''} sur ${st.total} · ${st.minutes} min d’activité</p>
      <progress max="${st.total}" value="${st.done}" aria-label="Séances réalisées">${st.done}/${st.total}</progress>
      <p><a href="#/plan">Voir le calendrier</a> · <a href="#/progres">Détails</a></p>
    </section>
    ${localDataNote()}
    ${safetyNote()}`;
}

export function renderHome(ctx) {
  ctx.root.innerHTML = ctx.state.profile ? dashboard(ctx) : welcome();
}
