// Paramètres des programmes TEMPO FIT.
// Toutes les règles de construction du plan sont regroupées ici pour être relues et vérifiées.
// CONTENU À FAIRE VALIDER PAR UN PROFESSIONNEL AVANT COMMERCIALISATION.

export const WEEKS_PER_CYCLE = 12;
export const WARMUP_STEP_SEC = 30;
export const COOLDOWN_STEP_SEC = 30;
export const BLOCK_TRANSITION_SEC = 60;
export const PREP_SEC = 10;

// Un bloc = 4 exercices enchaînés, répétés `rounds` fois.
// Chaque emplacement indique la catégorie d'exercice tirée.
export const BLOCK_TYPES = {
  full: { label: 'Corps entier', slots: ['bas', 'haut', 'gainage', 'cardio'] },
  bas: { label: 'Bas du corps', slots: ['bas', 'cardio', 'bas', 'gainage'] },
  haut: { label: 'Haut du corps', slots: ['haut', 'gainage', 'haut', 'cardio'] },
  cardio: { label: 'Cardio', slots: ['cardio', 'bas', 'cardio', 'gainage'] },
  gainage: { label: 'Gainage', slots: ['gainage', 'haut', 'gainage', 'bas'] },
};

// Phases de 4 semaines ; la 4e semaine de chaque phase est allégée.
export const PHASES = [
  { id: 1, name: 'Fondations', weeks: [1, 2, 3, 4], goal: 'Apprendre les mouvements et installer la régularité.' },
  { id: 2, name: 'Progression', weeks: [5, 6, 7, 8], goal: 'Augmenter progressivement le temps d’effort.' },
  { id: 3, name: 'Consolidation', weeks: [9, 10, 11, 12], goal: 'Introduire des variantes plus exigeantes et faire le bilan.' },
];
export const LIGHT_WEEKS = [4, 8, 12];

export const LEVELS = {
  debutant: {
    id: 'debutant',
    label: 'Débutant',
    num: 1,
    targetMinutes: 10,
    sessionsPerWeek: 3,
    // Jours d'entraînement dans chaque semaine du plan (1 = premier jour de la semaine du plan).
    trainingDays: [1, 3, 5],
    warmupSteps: 4,
    cooldownSteps: 4,
    slotSec: 45, // effort + récupération pour chaque exercice du bloc
    rounds: 2,
    // Secondes d'effort par semaine (le reste du créneau est de la récupération).
    workByWeek: [20, 20, 25, 20, 25, 25, 30, 25, 30, 30, 30, 25],
    maxWorkSec: 30,
    // Alternance de deux semaines types pour limiter les répétitions.
    weekPatterns: [
      [['full'], ['bas'], ['haut']],
      [['full'], ['cardio'], ['gainage']],
    ],
    who: 'Vous reprenez une activité ou bougez peu. Séances courtes, sans saut obligatoire, avec beaucoup de récupération.',
  },
  intermediaire: {
    id: 'intermediaire',
    label: 'Intermédiaire',
    num: 2,
    targetMinutes: 20,
    sessionsPerWeek: 4,
    trainingDays: [1, 2, 4, 6],
    warmupSteps: 6,
    cooldownSteps: 6,
    slotSec: 50,
    rounds: 2,
    workByWeek: [25, 30, 30, 25, 30, 35, 35, 30, 35, 35, 35, 30],
    maxWorkSec: 35,
    weekPatterns: [
      [['bas', 'full'], ['haut', 'gainage'], ['cardio', 'bas'], ['full', 'haut']],
      [['bas', 'gainage'], ['haut', 'cardio'], ['full', 'bas'], ['cardio', 'haut']],
    ],
    who: 'Vous pratiquez déjà une activité de temps en temps et tenez 20 minutes d’effort modéré.',
  },
  avance: {
    id: 'avance',
    label: 'Avancé',
    num: 3,
    targetMinutes: 30,
    sessionsPerWeek: 5,
    trainingDays: [1, 2, 3, 5, 6],
    warmupSteps: 8,
    cooldownSteps: 8,
    slotSec: 50,
    rounds: 2,
    workByWeek: [30, 35, 35, 30, 35, 40, 40, 30, 35, 40, 40, 30],
    maxWorkSec: 40,
    weekPatterns: [
      [['bas', 'cardio', 'gainage'], ['haut', 'gainage', 'cardio'], ['full', 'bas', 'haut'], ['cardio', 'bas', 'gainage'], ['haut', 'full', 'cardio']],
      [['full', 'bas', 'gainage'], ['haut', 'cardio', 'gainage'], ['bas', 'cardio', 'haut'], ['gainage', 'full', 'cardio'], ['haut', 'bas', 'full']],
    ],
    who: 'Vous vous entraînez régulièrement et maîtrisez pompes, squats et planche.',
  },
};

export const LEVEL_ORDER = ['debutant', 'intermediaire', 'avance'];

// Fenêtre de difficulté des exercices tirés (1 à 5), selon le niveau, la phase et le cycle.
export function difficultyWindow(levelNum, phaseIndex, cycle) {
  const phaseBoost = phaseIndex >= 2 ? 2 : 1; // phases 1-2 : niveau+1 ; phase 3 : niveau+2
  const cycleBoost = cycle >= 2 ? 1 : 0;
  const max = Math.min(5, levelNum + phaseBoost + cycleBoost);
  // Plancher fixe par niveau : garde un choix large (variété) sans exercices trop faciles en avancé.
  const min = Math.max(1, levelNum - 1);
  // Difficulté « cible » : les exercices en dessous sont un peu moins souvent choisis.
  const target = Math.max(min, max - 1);
  return { min, max, target };
}

// Bonus d'effort des cycles suivants : +5 s par créneau à partir du cycle 2, plafonné par niveau.
export function workFor(level, week, cycle) {
  const base = level.workByWeek[week - 1];
  const bonus = cycle >= 2 ? 5 : 0;
  return Math.min(base + bonus, level.maxWorkSec);
}
