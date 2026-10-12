// Moteur du minuteur de séance, indépendant de l'interface.
// Basé sur l'horloge (timestamps) et non sur le nombre de « ticks » :
// le temps reste juste même si l'onglet est mis en arrière-plan.
import { PREP_SEC } from '../data/program.js';

export function createRunner(steps, { now = () => Date.now(), prepSec = PREP_SEC } = {}) {
  const all = [{ kind: 'prep', phase: 'Préparation', exerciseId: null, sec: prepSec, nextId: steps.find((s) => s.kind === 'work')?.exerciseId ?? null }, ...steps];
  let index = 0;
  let running = false;
  let endsAt = 0; // timestamp de fin de l'étape en cours (si en marche)
  let remainingMs = all[0].sec * 1000; // temps restant (si en pause)
  let finished = false;
  let halfAnnounced = false;

  const current = () => all[index];

  function remaining() {
    if (finished) return 0;
    return running ? Math.max(0, endsAt - now()) : remainingMs;
  }

  function goTo(i) {
    index = Math.min(Math.max(i, 0), all.length - 1);
    remainingMs = all[index].sec * 1000;
    endsAt = now() + remainingMs;
    halfAnnounced = false;
  }

  // À appeler régulièrement : fait avancer les étapes écoulées. Retourne les événements survenus.
  function tick() {
    const events = [];
    if (!running || finished) return events;
    let t = now();
    while (running && t >= endsAt) {
      const overflow = t - endsAt;
      if (index >= all.length - 1) {
        finished = true;
        running = false;
        remainingMs = 0;
        events.push({ type: 'finish' });
        return events;
      }
      goTo(index + 1);
      endsAt -= overflow; // conserve le temps déjà écoulé au-delà de la fin de l'étape
      events.push({ type: 'step', step: current() });
      t = now();
    }
    const step = current();
    const rem = remaining();
    if (step.kind === 'work' && !halfAnnounced && rem <= (step.sec * 1000) / 2) {
      halfAnnounced = true;
      events.push({ type: 'half', step });
    }
    if (rem > 0 && rem <= 3000) {
      events.push({ type: 'countdown', seconds: Math.ceil(rem / 1000) });
    }
    return events;
  }

  return {
    steps: all,
    get index() {
      return index;
    },
    get running() {
      return running;
    },
    get finished() {
      return finished;
    },
    current,
    tick,
    remaining,
    start() {
      if (finished || running) return;
      running = true;
      endsAt = now() + remainingMs;
    },
    pause() {
      if (!running) return;
      remainingMs = Math.max(0, endsAt - now());
      running = false;
    },
    toggle() {
      running ? this.pause() : this.start();
    },
    next() {
      if (finished) return;
      if (index >= all.length - 1) {
        finished = true;
        running = false;
        remainingMs = 0;
        return;
      }
      const wasRunning = running;
      goTo(index + 1);
      if (!wasRunning) remainingMs = current().sec * 1000;
    },
    previous() {
      if (finished) return;
      const wasRunning = running;
      goTo(index - 1);
      if (!wasRunning) remainingMs = current().sec * 1000;
    },
    // Fraction de la séance déjà réalisée (0 à 1), en temps.
    progress() {
      const total = all.reduce((s, x) => s + x.sec, 0);
      const done = all.slice(0, index).reduce((s, x) => s + x.sec, 0) + (current().sec - remaining() / 1000);
      return finished ? 1 : Math.min(1, Math.max(0, done / total));
    },
    totalSec() {
      return all.reduce((s, x) => s + x.sec, 0);
    },
  };
}
