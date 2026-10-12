// Générateur déterministe du plan 12 semaines.
// Mêmes paramètres (niveau, cycle, mode faible impact) => même plan, sur tous les appareils.
import { EXERCISES, getExercise } from '../data/exercises.js';
import {
  LEVELS,
  BLOCK_TYPES,
  PHASES,
  LIGHT_WEEKS,
  WEEKS_PER_CYCLE,
  WARMUP_STEP_SEC,
  COOLDOWN_STEP_SEC,
  BLOCK_TRANSITION_SEC,
  difficultyWindow,
  workFor,
} from '../data/program.js';

const FIRST_WARMUP = 'marche-active';
const LAST_COOLDOWN = 'respiration-lente';

// PRNG reproductible (mulberry32).
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFor(levelId, cycle, lowImpact) {
  const s = `${levelId}|${cycle}|${lowImpact ? 1 : 0}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function phaseForWeek(week) {
  return PHASES.find((p) => p.weeks.includes(week));
}

export function sessionKey(levelId, cycle, week, day) {
  return `${levelId}:c${cycle}:s${week}:j${day}`;
}

export function parseSessionKey(key) {
  const m = /^([a-z]+):c(\d+):s(\d+):j(\d)$/.exec(String(key || ''));
  if (!m || !LEVELS[m[1]]) return null;
  return { levelId: m[1], cycle: Number(m[2]), week: Number(m[3]), day: Number(m[4]) };
}

function poolFor(category, win, lowImpact) {
  return EXERCISES.filter(
    (e) =>
      e.category === category &&
      e.difficulty >= win.min &&
      e.difficulty <= win.max &&
      !(lowImpact && e.impact === 'eleve'),
  );
}

// Choisit l'exercice le moins utilisé jusque-là, en évitant ceux de la séance en cours
// et, si possible, ceux de la séance précédente. Égalités départagées par le PRNG.
function pick(category, win, ctx) {
  let pool = poolFor(category, win, ctx.lowImpact).filter((e) => !ctx.inSession.has(e.id));
  if (pool.length < 2) {
    // Élargit vers les difficultés plus faibles si le choix est trop restreint.
    pool = poolFor(category, { min: 1, max: win.max, target: win.target }, ctx.lowImpact).filter((e) => !ctx.inSession.has(e.id));
  }
  if (pool.length === 0) throw new Error(`Aucun exercice disponible pour ${category}`);
  let best = null;
  let bestScore = Infinity;
  for (const e of pool) {
    const below = e.difficulty < win.target ? 6 : 0;
    const score = (ctx.usage.get(e.id) || 0) * 10 + below + (ctx.previous.has(e.id) ? 100 : 0) + ctx.rng() * 3;
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  ctx.usage.set(best.id, (ctx.usage.get(best.id) || 0) + 1);
  ctx.inSession.add(best.id);
  return best.id;
}

function pickRoutine(category, count, fixedId, position, ctx) {
  const pool = EXERCISES.filter((e) => e.category === category && e.id !== fixedId);
  const chosen = [];
  const local = new Set();
  for (let i = 0; i < count - 1; i++) {
    let best = null;
    let bestScore = Infinity;
    for (const e of pool) {
      if (local.has(e.id)) continue;
      const score = (ctx.usage.get(e.id) || 0) * 10 + ctx.rng();
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    local.add(best.id);
    ctx.usage.set(best.id, (ctx.usage.get(best.id) || 0) + 1);
    chosen.push(best.id);
  }
  return position === 'first' ? [fixedId, ...chosen] : [...chosen, fixedId];
}

export function sessionDurationSec(session) {
  const blocksSec = session.blocks.reduce((sum, b) => sum + b.exercises.length * b.rounds * (b.work + b.rest), 0);
  return (
    session.warmup.length * WARMUP_STEP_SEC +
    blocksSec +
    Math.max(0, session.blocks.length - 1) * BLOCK_TRANSITION_SEC +
    session.cooldown.length * COOLDOWN_STEP_SEC
  );
}

export function generatePlan({ levelId, cycle = 1, lowImpact = false }) {
  const level = LEVELS[levelId];
  if (!level) throw new Error(`Niveau inconnu : ${levelId}`);
  const c = Math.max(1, Math.floor(cycle));
  const rng = makeRng(seedFor(levelId, c, lowImpact));
  const usage = new Map();
  const warmUsage = new Map();
  let previous = new Set();
  // Décalage du motif hebdomadaire selon le cycle, pour ne pas reproduire le même ordre.
  const patternOffset = (c - 1) % level.weekPatterns.length;
  const weeks = [];
  let sessionCounter = 0;

  for (let week = 1; week <= WEEKS_PER_CYCLE; week++) {
    const phase = phaseForWeek(week);
    const phaseIndex = phase.id - 1;
    const win = difficultyWindow(level.num, phaseIndex, c);
    const pattern = level.weekPatterns[(week - 1 + patternOffset) % level.weekPatterns.length];
    const work = workFor(level, week, c);
    const rest = level.slotSec - work;
    const light = LIGHT_WEEKS.includes(week);
    const days = [];
    let sIdx = 0;
    for (let day = 1; day <= 7; day++) {
      if (!level.trainingDays.includes(day)) {
        days.push({ day, rest: true });
        continue;
      }
      const blockTypes = pattern[sIdx];
      sIdx++;
      sessionCounter++;
      const ctx = { rng, usage, previous, inSession: new Set(), lowImpact };
      const blocks = blockTypes.map((type) => ({
        type,
        label: BLOCK_TYPES[type].label,
        rounds: level.rounds,
        work,
        rest,
        exercises: BLOCK_TYPES[type].slots.map((cat) => pick(cat, win, ctx)),
      }));
      const wctx = { rng, usage: warmUsage };
      const session = {
        key: sessionKey(levelId, c, week, day),
        levelId,
        cycle: c,
        week,
        day,
        number: sessionCounter,
        title: blockTypes.map((t) => BLOCK_TYPES[t].label).join(' + '),
        light,
        warmup: pickRoutine('echauffement', level.warmupSteps, FIRST_WARMUP, 'first', wctx),
        blocks,
        cooldown: pickRoutine('retour', level.cooldownSteps, LAST_COOLDOWN, 'last', wctx),
      };
      session.durationSec = sessionDurationSec(session);
      previous = ctx.inSession;
      days.push({ day, rest: false, session });
    }
    weeks.push({
      week,
      phase: phase.name,
      phaseGoal: phase.goal,
      light,
      label: week === 12 ? 'Semaine allégée et bilan' : light ? 'Semaine allégée' : `Semaine ${week}`,
      work,
      rest,
      days,
    });
  }
  return { levelId, cycle: c, lowImpact, weeks };
}

export function allSessions(plan) {
  return plan.weeks.flatMap((w) => w.days.filter((d) => !d.rest).map((d) => d.session));
}

export function findSession(plan, week, day) {
  const w = plan.weeks[week - 1];
  const d = w && w.days[day - 1];
  return d && !d.rest ? d.session : null;
}

// Déroulé chronologique d'une séance pour le minuteur guidé.
export function buildTimeline(session) {
  const steps = [];
  session.warmup.forEach((id, i) =>
    steps.push({ kind: 'work', phase: 'Échauffement', exerciseId: id, sec: WARMUP_STEP_SEC, index: i + 1, of: session.warmup.length }),
  );
  session.blocks.forEach((block, bi) => {
    for (let r = 1; r <= block.rounds; r++) {
      block.exercises.forEach((id, ei) => {
        const label = `Bloc ${bi + 1} · ${block.label} · tour ${r}/${block.rounds}`;
        steps.push({ kind: 'work', phase: label, exerciseId: id, sec: block.work, index: ei + 1, of: block.exercises.length });
        steps.push({ kind: 'rest', phase: label, exerciseId: null, sec: block.rest, nextId: null });
      });
    }
    if (bi < session.blocks.length - 1) {
      steps.push({ kind: 'rest', phase: 'Transition', exerciseId: null, sec: BLOCK_TRANSITION_SEC, long: true, nextId: null });
    }
  });
  session.cooldown.forEach((id, i) =>
    steps.push({ kind: 'work', phase: 'Retour au calme', exerciseId: id, sec: COOLDOWN_STEP_SEC, index: i + 1, of: session.cooldown.length }),
  );
  // Chaque pause annonce l'exercice suivant.
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].kind === 'rest') {
      const next = steps.slice(i + 1).find((s) => s.kind === 'work');
      steps[i].nextId = next ? next.exerciseId : null;
    }
  }
  return steps;
}

export function exerciseIdsOfSession(session) {
  return [...session.warmup, ...session.blocks.flatMap((b) => b.exercises), ...session.cooldown];
}

export function describeExercise(id) {
  return getExercise(id);
}
