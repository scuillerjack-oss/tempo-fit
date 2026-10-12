import { LEVELS } from '../data/program.js';
import { stats, cycleEnded, recommendation } from '../lib/progress.js';
import { allSessions } from '../lib/plan.js';
import { today, formatLong } from '../lib/dates.js';
import { esc, levelLabel, localDataNote, confirmDialog, toast } from '../ui.js';

const FEEL_LABEL = { facile: 'Facile', adapte: 'Adaptée', difficile: 'Difficile' };

export function renderProgress(ctx) {
  const { profile, completions, cyclesDone } = ctx.state;
  if (!profile) {
    ctx.root.innerHTML = `<h1>Progression</h1><p>Aucun plan pour l’instant.</p><a class="btn btn-primary" href="#/demarrer">Créer mon plan</a>${localDataNote()}`;
    return;
  }
  const plan = ctx.plan;
  const st = stats(plan, completions);
  const t = today();
  const ended = cycleEnded(plan, completions, profile.startDate, t);
  const reco = recommendation(profile.levelId, st);
  const maxWeek = Math.max(1, ...st.perWeek.map((w) => w.total));

  const bars = st.perWeek
    .map(
      (w) => `<li><span class="bar-label">S${w.week}</span>
      <progress max="${maxWeek}" value="${w.done}" aria-label="Semaine ${w.week} : ${w.done} sur ${w.total}"></progress>
      <span class="bar-val">${w.done}/${w.total}</span></li>`,
    )
    .join('');

  const history = Object.entries(completions)
    .sort((a, b) => (a[1].date < b[1].date ? 1 : -1))
    .slice(0, 20);
  const byKey = new Map(allSessions(plan).map((s) => [s.key, s]));
  const historyHtml = history.length
    ? `<ul class="history plain">${history
        .map(([key, v]) => {
          const s = byKey.get(key);
          const [lvl, c, w] = key.split(':');
          const label = s ? `${s.title} · semaine ${s.week}` : `${levelLabel(lvl)} · ${c.replace('c', 'cycle ')} · ${w.replace('s', 'semaine ')}`;
          return `<li><span>${esc(formatLong(v.date))}</span> — ${esc(label)}${v.feeling ? ` · <em>${esc(FEEL_LABEL[v.feeling])}</em>` : ''}</li>`;
        })
        .join('')}</ul>`
    : '<p>Aucune séance enregistrée pour le moment.</p>';

  const idxNext = reco.kind === 'monter' ? reco.nextLevelId : null;
  const cycleSection = `<section class="card ${ended ? 'card-accent' : ''}" id="cycle" aria-labelledby="h-cycle">
      <h2 id="h-cycle">Après les 12 semaines</h2>
      ${
        ended
          ? `<p>${esc(reco.text)}</p>`
          : `<p>À la fin de ce cycle, un cycle ${profile.cycle + 1} vous sera proposé : nouvelles combinaisons d’exercices, variantes un peu plus exigeantes et effort légèrement allongé. Vous pourrez aussi changer de niveau.</p>`
      }
      <div class="actions">
        <button class="btn ${ended ? 'btn-primary' : 'btn-ghost'}" id="next-cycle">Démarrer le cycle ${profile.cycle + 1} (${esc(levelLabel(profile.levelId))})</button>
        ${idxNext ? `<button class="btn btn-secondary" id="level-up">Passer au niveau ${esc(LEVELS[idxNext].label)}</button>` : ''}
      </div>
    </section>`;

  ctx.root.innerHTML = `<h1>Progression</h1>
    <p class="muted">${esc(levelLabel(profile.levelId))} · cycle ${profile.cycle}</p>
    <div class="stats">
      <div class="stat"><span class="stat-num">${st.done}</span><span>séances sur ${st.total}</span></div>
      <div class="stat"><span class="stat-num">${st.minutes}</span><span>minutes d’activité</span></div>
      <div class="stat"><span class="stat-num">${cyclesDone.length}</span><span>cycle${cyclesDone.length > 1 ? 's' : ''} terminé${cyclesDone.length > 1 ? 's' : ''}</span></div>
    </div>
    <section aria-labelledby="h-weeks"><h2 id="h-weeks">Séances par semaine</h2><ol class="bars plain">${bars}</ol></section>
    <section aria-labelledby="h-feel"><h2 id="h-feel">Ressentis déclarés</h2>
      <p>Facile : ${st.feelings.facile} · Adaptée : ${st.feelings.adapte} · Difficile : ${st.feelings.difficile}</p></section>
    ${cycleSection}
    <section aria-labelledby="h-hist"><h2 id="h-hist">Dernières séances</h2>${historyHtml}</section>
    ${localDataNote()}
    <p><a class="btn btn-ghost" href="#/reglages">Réglages, sauvegarde et restauration</a></p>`;

  async function startCycle(levelId, cycle) {
    const ok = await confirmDialog(
      levelId === profile.levelId
        ? `Démarrer le cycle ${cycle} aujourd’hui ? Votre historique est conservé.`
        : `Passer au niveau ${levelLabel(levelId)} (cycle 1) à partir d’aujourd’hui ? Votre historique est conservé.`,
      { confirmLabel: 'Démarrer' },
    );
    if (!ok) return;
    ctx.storage.update((s) => {
      s.cyclesDone.push({ levelId: profile.levelId, cycle: profile.cycle, endedOn: t });
      s.profile = { ...s.profile, levelId, cycle, startDate: t };
    });
    toast('Nouveau cycle prêt.');
    ctx.navigate('plan');
  }
  ctx.root.querySelector('#next-cycle').addEventListener('click', () => startCycle(profile.levelId, profile.cycle + 1));
  ctx.root.querySelector('#level-up')?.addEventListener('click', () => startCycle(idxNext, 1));
}
