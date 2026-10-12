import { WEEKS_PER_CYCLE } from '../data/program.js';
import { dayStatus, currentWeek, nextSession } from '../lib/progress.js';
import { today, formatShort, formatDuration, addDays } from '../lib/dates.js';
import { esc, levelLabel, STATUS_LABELS, localDataNote, confirmDialog, toast } from '../ui.js';

function noProfile(ctx) {
  ctx.root.innerHTML = `<h1>Mon plan</h1>
    <p>Vous n’avez pas encore de plan. Choisissez votre niveau pour générer votre calendrier de 12 semaines.</p>
    <a class="btn btn-primary btn-lg" href="#/demarrer">Créer mon plan</a>`;
}

export function renderPlan(ctx) {
  const { profile, completions } = ctx.state;
  if (!profile) return noProfile(ctx);
  const plan = ctx.plan;
  const t = today();
  const requested = Number(ctx.query.get('semaine'));
  const week = requested >= 1 && requested <= WEEKS_PER_CYCLE ? requested : currentWeek(profile.startDate, t);
  const w = plan.weeks[week - 1];

  const dayItems = w.days
    .map((d) => {
      const info = dayStatus({ ...d, week }, profile.startDate, t, completions);
      const label = STATUS_LABELS[info.status];
      if (d.rest) {
        return `<li class="day day-rest status-${info.status}">
          <span class="day-date">${esc(formatShort(info.date))}</span>
          <span class="day-title">Repos</span>
          <span class="chip">${esc(label)}</span></li>`;
      }
      const s = d.session;
      return `<li class="day status-${info.status}">
        <span class="day-date">${esc(formatShort(info.date))}</span>
        <a class="day-title" href="#/seance/${esc(s.key)}">${esc(s.title)}</a>
        <span class="muted">${esc(formatDuration(s.durationSec))}</span>
        <span class="chip chip-${info.status}">${esc(label)}</span></li>`;
    })
    .join('');

  const overview = plan.weeks
    .map((wk) => {
      const cells = wk.days
        .map((d) => {
          const info = dayStatus({ ...d, week: wk.week }, profile.startDate, t, completions);
          const title = d.rest ? `Repos` : d.session.title;
          return `<span class="cell cell-${info.status}" title="${esc(formatShort(info.date))} : ${esc(title)} (${esc(STATUS_LABELS[info.status])})"></span>`;
        })
        .join('');
      const done = wk.days.filter((d) => !d.rest && completions[d.session.key]).length;
      const total = wk.days.filter((d) => !d.rest).length;
      return `<li><a href="#/plan?semaine=${wk.week}" class="ov-row${wk.week === week ? ' current' : ''}" aria-label="Semaine ${wk.week} : ${done} séances faites sur ${total}${wk.light ? ', semaine allégée' : ''}">
        <span class="ov-label">S${wk.week}</span><span class="ov-cells" aria-hidden="true">${cells}</span><span class="ov-count">${done}/${total}</span></a></li>`;
    })
    .join('');

  ctx.root.innerHTML = `<h1>Mon plan</h1>
    <p class="muted">${esc(levelLabel(profile.levelId))} · cycle ${profile.cycle}${profile.lowImpact ? ' · sans saut' : ''} · début le ${esc(formatShort(profile.startDate))} · <a href="#/reglages">modifier</a></p>
    <nav class="week-nav" aria-label="Changer de semaine">
      ${week > 1 ? `<a class="btn btn-ghost" href="#/plan?semaine=${week - 1}" aria-label="Semaine précédente">←</a>` : '<span></span>'}
      <div class="week-head"><h2>Semaine ${week} <span class="muted">/ ${WEEKS_PER_CYCLE}</span></h2>
        <p class="muted">${esc(w.phase)}${w.light ? ` · <strong>${esc(w.label)}</strong>` : ''} · effort ${w.work} s / récupération ${w.rest} s</p></div>
      ${week < WEEKS_PER_CYCLE ? `<a class="btn btn-ghost" href="#/plan?semaine=${week + 1}" aria-label="Semaine suivante">→</a>` : '<span></span>'}
    </nav>
    <p class="hint">${esc(w.phaseGoal)}</p>
    <ol class="days plain">${dayItems}</ol>
    <section aria-labelledby="h-ov">
      <h2 id="h-ov">Vue d’ensemble des 12 semaines</h2>
      <ol class="overview plain">${overview}</ol>
      <p class="legend"><span class="cell cell-fait"></span> faite <span class="cell cell-aujourdhui"></span> aujourd’hui <span class="cell cell-a-venir"></span> à venir <span class="cell cell-non-realisee"></span> non réalisée <span class="cell cell-repos"></span> repos</p>
    </section>
    <section class="card">
      <h2>Du retard ?</h2>
      <p>Aucune pénalité : les séances non réalisées restent disponibles. Vous pouvez aussi décaler le calendrier pour que votre prochaine séance tombe aujourd’hui.</p>
      <button class="btn btn-secondary" id="shift">Décaler mon plan à aujourd’hui</button>
    </section>
    ${localDataNote()}`;

  ctx.root.querySelector('#shift').addEventListener('click', async () => {
    const next = nextSession(plan, completions);
    if (!next) return toast('Toutes les séances de ce cycle sont faites.');
    const ok = await confirmDialog(`Votre prochaine séance (« ${next.title} », semaine ${next.week}) sera programmée aujourd’hui, et les suivantes décalées d’autant.`, { confirmLabel: 'Décaler' });
    if (!ok) return;
    const newStart = addDays(t, -((next.week - 1) * 7 + (next.day - 1)));
    ctx.storage.update((s) => {
      s.profile.startDate = newStart;
    });
    toast('Calendrier décalé.');
    ctx.navigate('plan');
    ctx.rerender();
  });
}
