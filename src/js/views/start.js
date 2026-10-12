import { LEVELS, LEVEL_ORDER } from '../data/program.js';
import { today } from '../lib/dates.js';
import { esc, safetyNote, localDataNote, confirmDialog } from '../ui.js';

export function renderStart(ctx) {
  const existing = ctx.state.profile;
  const wanted = ctx.query.get('niveau');
  const selected = LEVELS[wanted] ? wanted : existing?.levelId || 'debutant';
  ctx.root.innerHTML = `<h1>Créer mon plan</h1>
    <p class="lead">Trois questions, et votre calendrier de 12 semaines est prêt.</p>
    <form id="start-form" class="form" novalidate>
      <fieldset>
        <legend>1. Votre niveau</legend>
        <p class="hint">En cas d’hésitation, commencez par le niveau inférieur : vous pourrez changer à tout moment.</p>
        <div class="radio-cards">
          ${LEVEL_ORDER.map((id) => {
            const l = LEVELS[id];
            return `<label class="radio-card">
              <input type="radio" name="level" value="${esc(id)}" ${id === selected ? 'checked' : ''} required>
              <span><strong>${esc(l.label)}</strong> — ${l.targetMinutes} min, ${l.sessionsPerWeek} séances par semaine<br><span class="muted">${esc(l.who)}</span></span>
            </label>`;
          }).join('')}
        </div>
      </fieldset>
      <fieldset>
        <legend>2. Votre date de départ</legend>
        <label for="start-date">Premier jour du plan</label>
        <input type="date" id="start-date" name="startDate" value="${esc(today())}" required>
      </fieldset>
      <fieldset>
        <legend>3. Options</legend>
        <label class="check"><input type="checkbox" name="lowImpact" ${existing?.lowImpact ? 'checked' : ''}>
          <span>Mode <strong>sans saut</strong> (faible impact) : utile en appartement ou si les sauts ne vous conviennent pas.</span></label>
      </fieldset>
      <fieldset>
        <legend>Sécurité</legend>
        <p>Ces séances s’adressent à des adultes sans contre-indication connue à l’activité physique. Aucune information de santé n’est demandée ni enregistrée.</p>
        <label class="check"><input type="checkbox" name="ack" id="ack" required ${ctx.state.settings.safetyAck ? 'checked' : ''}>
          <span>J’ai lu les <a href="#/securite">consignes de sécurité</a> et je m’arrêterai en cas de douleur ou de malaise.</span></label>
        <p class="error" id="ack-error" hidden>Merci de confirmer avoir lu les consignes de sécurité.</p>
      </fieldset>
      ${localDataNote()}
      <button type="submit" class="btn btn-primary btn-lg">${existing ? 'Enregistrer mon nouveau plan' : 'Créer mon plan'}</button>
    </form>
    ${safetyNote()}`;

  const form = ctx.root.querySelector('#start-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const ackError = form.querySelector('#ack-error');
    if (!fd.get('ack')) {
      ackError.hidden = false;
      form.querySelector('#ack').focus();
      return;
    }
    ackError.hidden = true;
    const levelId = String(fd.get('level'));
    const startDate = String(fd.get('startDate') || today());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      form.querySelector('#start-date').focus();
      return;
    }
    if (existing && existing.levelId !== levelId) {
      const ok = await confirmDialog('Changer de niveau démarre un nouveau plan. Les séances déjà réalisées restent dans votre historique. Continuer ?', { confirmLabel: 'Changer de niveau' });
      if (!ok) return;
    }
    ctx.storage.update((s) => {
      const sameLevel = existing && existing.levelId === levelId;
      s.profile = { levelId, cycle: sameLevel ? existing.cycle : 1, startDate, lowImpact: fd.get('lowImpact') === 'on' };
      s.settings.safetyAck = true;
    });
    ctx.navigate('plan');
  });
}
