import { buildTimeline } from '../lib/plan.js';
import { createRunner } from '../lib/timer.js';
import { getExercise } from '../data/exercises.js';
import { formatClock, today } from '../lib/dates.js';
import { esc, exName, confirmDialog, SAFETY_SHORT } from '../ui.js';
import { resolveSession, isOwnSession } from './session.js';
import { renderNotFound } from './pages.js';

// Bips générés localement (Web Audio), aucun fichier son externe.
function createBeeper() {
  let ac = null;
  return {
    unlock() {
      try {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        if (ac.state === 'suspended') ac.resume();
      } catch {
        ac = null;
      }
    },
    beep(freq = 880, ms = 120) {
      if (!ac) return;
      try {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + ms / 1000);
        o.connect(g).connect(ac.destination);
        o.start();
        o.stop(ac.currentTime + ms / 1000 + 0.02);
      } catch {
        /* son facultatif */
      }
    },
    close() {
      try {
        ac?.close();
      } catch {
        /* rien */
      }
    },
  };
}

function kindLabel(step) {
  if (step.kind === 'prep') return 'Préparez-vous';
  if (step.kind === 'rest') return step.long ? 'Pause entre les blocs' : 'Récupération';
  return 'Effort';
}

export function renderRunner(ctx) {
  const session = resolveSession(ctx, ctx.params[0]);
  if (!session) return renderNotFound(ctx);
  ctx.setTitle(`Séance · ${session.title}`);
  const settings = ctx.state.settings;
  const runner = createRunner(buildTimeline(session));
  const beeper = createBeeper();
  let wakeLock = null;
  let lastCountdown = null;
  let showEasier = false;
  let interval = null;

  ctx.root.innerHTML = `<div class="runner" id="runner">
      <div class="runner-top">
        <button class="btn btn-ghost" id="stop">Arrêter</button>
        <span class="runner-step" id="step-count"></span>
      </div>
      <progress id="overall" max="1000" value="0" aria-label="Avancement de la séance"></progress>
      <p class="runner-phase" id="phase"></p>
      <p class="runner-kind" id="kind"></p>
      <h1 class="runner-name" id="name"></h1>
      <p class="runner-sides" id="sides"></p>
      <div class="runner-clock" id="clock" role="timer" aria-live="off"></div>
      <progress id="steprog" max="1000" value="0" aria-hidden="true"></progress>
      <div class="runner-controls">
        <button class="btn btn-ghost" id="prev" aria-label="Étape précédente">⟨ Préc.</button>
        <button class="btn btn-primary btn-xl" id="toggle">Démarrer</button>
        <button class="btn btn-ghost" id="next" aria-label="Étape suivante">Suiv. ⟩</button>
      </div>
      <div class="runner-detail" id="detail"></div>
      <p class="runner-safety">${esc(SAFETY_SHORT)}</p>
      <p class="sr-only" aria-live="polite" id="live"></p>
    </div>
    <div class="runner-done" id="done" hidden></div>`;

  const $ = (id) => ctx.root.querySelector(`#${id}`);
  const els = { phase: $('phase'), kind: $('kind'), name: $('name'), sides: $('sides'), clock: $('clock'), overall: $('overall'), steprog: $('steprog'), toggle: $('toggle'), detail: $('detail'), live: $('live'), stepCount: $('step-count') };

  async function requestWake() {
    try {
      if ('wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
      }
    } catch {
      wakeLock = null;
    }
  }
  function releaseWake() {
    try {
      wakeLock?.release();
    } catch {
      /* rien */
    }
    wakeLock = null;
  }

  function signal(strong = false) {
    if (settings.sound) beeper.beep(strong ? 660 : 880, strong ? 300 : 120);
    if (settings.vibration && strong && navigator.vibrate) navigator.vibrate(150);
  }

  function renderDetail(step) {
    if (step.kind !== 'work') {
      const next = step.nextId ? getExercise(step.nextId) : null;
      els.detail.innerHTML = next
        ? `<p class="runner-next">Ensuite : <strong>${esc(next.name)}</strong></p><ol class="runner-instructions">${next.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
        : '<p class="runner-next">Dernière étape.</p>';
      return;
    }
    const ex = getExercise(step.exerciseId);
    const alt = ex.lowImpactAlt ? getExercise(ex.lowImpactAlt) : null;
    els.detail.innerHTML = `<ol class="runner-instructions">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <button class="btn btn-ghost btn-sm" id="easier" aria-expanded="${showEasier}">Version plus douce</button>
      <div id="easier-box" ${showEasier ? '' : 'hidden'}>
        <p><strong>Plus facile :</strong> ${esc(ex.easier)}</p>
        ${alt ? `<p><strong>Sans saut :</strong> ${esc(alt.name)}</p>` : ''}
        <p><strong>Précautions :</strong> ${esc(ex.precautions.join(' '))}</p>
      </div>`;
    $('easier').addEventListener('click', () => {
      showEasier = !showEasier;
      renderDetail(runner.current());
    });
  }

  function renderStep() {
    const step = runner.current();
    const idx = runner.index;
    els.stepCount.textContent = idx === 0 ? 'Préparation' : `Étape ${idx} / ${runner.steps.length - 1}`;
    els.phase.textContent = step.phase + (step.kind === 'work' && step.of ? ` · ${step.index}/${step.of}` : '');
    els.kind.textContent = kindLabel(step);
    els.kind.dataset.kind = step.kind;
    els.name.textContent = step.kind === 'work' ? exName(step.exerciseId) : step.nextId ? `Prochain : ${exName(step.nextId)}` : 'Fin de séance';
    const ex = step.kind === 'work' ? getExercise(step.exerciseId) : null;
    els.sides.textContent = ex?.sides === 'changer' ? 'Changez de côté à mi-temps' : ex?.sides === 'alterner' ? 'En alternant les côtés' : '';
    ctx.root.querySelector('#runner').dataset.kind = step.kind;
    renderDetail(step);
    els.live.textContent = `${kindLabel(step)} : ${step.kind === 'work' ? exName(step.exerciseId) : step.nextId ? `ensuite ${exName(step.nextId)}` : ''}, ${step.sec} secondes.`;
    updateClock();
  }

  function updateClock() {
    const rem = runner.remaining() / 1000;
    els.clock.textContent = formatClock(rem);
    const step = runner.current();
    els.steprog.value = Math.round((1 - rem / step.sec) * 1000);
    els.overall.value = Math.round(runner.progress() * 1000);
    els.toggle.textContent = runner.running ? 'Pause' : runner.index === 0 && runner.remaining() === step.sec * 1000 ? 'Démarrer' : 'Reprendre';
    els.toggle.setAttribute('aria-pressed', String(!runner.running));
  }

  function loop() {
    for (const ev of runner.tick()) {
      if (ev.type === 'step') {
        signal(true);
        lastCountdown = null;
        showEasier = false;
        renderStep();
      } else if (ev.type === 'half' && ev.step.exerciseId && getExercise(ev.step.exerciseId)?.sides === 'changer') {
        signal(false);
        els.live.textContent = 'Changez de côté.';
      } else if (ev.type === 'countdown' && ev.seconds !== lastCountdown) {
        lastCountdown = ev.seconds;
        signal(false);
      } else if (ev.type === 'finish') {
        finish();
        return;
      }
    }
    updateClock();
  }

  function start() {
    beeper.unlock();
    runner.start();
    requestWake();
    clearInterval(interval);
    interval = setInterval(loop, 200);
    updateClock();
  }
  function pause() {
    runner.pause();
    releaseWake();
    updateClock();
  }

  function finish() {
    clearInterval(interval);
    releaseWake();
    signal(true);
    const own = isOwnSession(ctx, session);
    if (own) {
      // Enregistrée immédiatement ; le ressenti est facultatif.
      ctx.storage.update((s) => {
        s.completions[session.key] = { date: today(), feeling: s.completions[session.key]?.feeling ?? null };
      });
    }
    const done = $('done');
    ctx.root.querySelector('#runner').hidden = true;
    done.hidden = false;
    done.innerHTML = `<h1>Séance terminée 🎉</h1>
      <p class="lead">${esc(session.title)} — bravo pour cette séance.</p>
      ${
        own
          ? `<form id="feel" class="form"><fieldset><legend>Comment l’avez-vous trouvée ?</legend>
          <div class="feel-buttons">
            <button class="btn btn-secondary" name="feeling" value="facile">Facile</button>
            <button class="btn btn-secondary" name="feeling" value="adapte">Adaptée</button>
            <button class="btn btn-secondary" name="feeling" value="difficile">Difficile</button>
          </div></fieldset>
          <p class="hint">Séance enregistrée sur cet appareil. Votre réponse (facultative) sert uniquement à vous suggérer la suite à la fin du cycle. Elle reste sur cet appareil.</p>
          <button class="btn btn-ghost" name="feeling" value="">Passer</button></form>`
          : ctx.state.profile
            ? `<p class="note">Cette séance ne fait pas partie de votre plan actuel : elle n’a pas été enregistrée.</p><a class="btn btn-primary" href="#/plan">Mon plan</a>`
            : `<p>Envie de continuer ? Créez votre plan gratuit de 12 semaines.</p><a class="btn btn-primary" href="#/demarrer">Créer mon plan</a>`
      }`;
    done.querySelector('h1').setAttribute('tabindex', '-1');
    done.querySelector('h1').focus();
    done.querySelector('#feel')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const feeling = e.submitter?.value || null;
      if (feeling) {
        ctx.storage.update((s) => {
          if (s.completions[session.key]) s.completions[session.key].feeling = feeling;
        });
      }
      ctx.navigate('plan?semaine=' + session.week);
    });
  }

  async function stop() {
    const wasRunning = runner.running;
    pause();
    const ok = await confirmDialog('Arrêter la séance ? Aucune pénalité : elle restera disponible dans votre plan.', { confirmLabel: 'Arrêter', cancelLabel: 'Continuer la séance' });
    if (ok) {
      ctx.navigate(isOwnSession(ctx, session) ? `plan?semaine=${session.week}` : `seance/${session.key}`);
    } else if (wasRunning) {
      start();
    }
  }

  $('toggle').addEventListener('click', () => (runner.running ? pause() : start()));
  $('next').addEventListener('click', () => {
    runner.next();
    if (runner.finished) return finish();
    showEasier = false;
    renderStep();
  });
  $('prev').addEventListener('click', () => {
    runner.previous();
    showEasier = false;
    renderStep();
  });
  $('stop').addEventListener('click', stop);

  const onKey = (e) => {
    if (e.target.closest('input, textarea, select, dialog') || runner.finished) return;
    if (e.key === ' ' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      runner.running ? pause() : start();
    } else if (e.key === 'ArrowRight') $('next').click();
    else if (e.key === 'ArrowLeft') $('prev').click();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible' && runner.running) {
      requestWake();
      loop();
    }
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisible);

  renderStep();

  return () => {
    clearInterval(interval);
    releaseWake();
    beeper.close();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
