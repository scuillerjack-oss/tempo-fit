// Sauvegarde locale (localStorage) — aucune donnée n'est envoyée à un serveur.
// Aucune donnée de santé n'est demandée ni stockée.
import { LEVELS } from '../data/program.js';
import { parseSessionKey } from './plan.js';

export const STORAGE_KEY = 'tempofit.v1';
export const SCHEMA_VERSION = 1;
const FEELINGS = ['facile', 'adapte', 'difficile'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function defaultState() {
  return {
    schema: SCHEMA_VERSION,
    profile: null, // { levelId, cycle, startDate, lowImpact }
    settings: { sound: true, vibration: true, safetyAck: false },
    completions: {}, // { [sessionKey]: { date: 'YYYY-MM-DD', feeling: 'facile'|'adapte'|'difficile'|null } }
    cyclesDone: [], // [{ levelId, cycle, endedOn }]
  };
}

function memoryStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

// Retourne un stockage utilisable ; en navigation privée stricte, bascule en mémoire.
export function resolveStore(candidate) {
  try {
    const s = candidate ?? globalThis.localStorage;
    const probe = '__tempofit_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return { store: s, persistent: true };
  } catch {
    return { store: memoryStore(), persistent: false };
  }
}

export function sanitizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const out = base;
  const p = raw.profile;
  if (p && typeof p === 'object' && LEVELS[p.levelId] && DATE_RE.test(String(p.startDate))) {
    const cycle = Number.isInteger(p.cycle) && p.cycle >= 1 && p.cycle <= 99 ? p.cycle : 1;
    out.profile = { levelId: p.levelId, cycle, startDate: p.startDate, lowImpact: p.lowImpact === true };
  }
  const st = raw.settings;
  if (st && typeof st === 'object') {
    out.settings.sound = st.sound !== false;
    out.settings.vibration = st.vibration !== false;
    out.settings.safetyAck = st.safetyAck === true;
  }
  if (raw.completions && typeof raw.completions === 'object') {
    for (const [key, val] of Object.entries(raw.completions)) {
      if (!parseSessionKey(key) || !val || typeof val !== 'object') continue;
      if (!DATE_RE.test(String(val.date))) continue;
      out.completions[key] = { date: val.date, feeling: FEELINGS.includes(val.feeling) ? val.feeling : null };
    }
  }
  if (Array.isArray(raw.cyclesDone)) {
    out.cyclesDone = raw.cyclesDone
      .filter((c) => c && LEVELS[c.levelId] && Number.isInteger(c.cycle) && DATE_RE.test(String(c.endedOn)))
      .map((c) => ({ levelId: c.levelId, cycle: c.cycle, endedOn: c.endedOn }))
      .slice(-100);
  }
  return out;
}

export function createStorage(candidate) {
  const { store, persistent } = resolveStore(candidate);
  let state;
  try {
    state = sanitizeState(JSON.parse(store.getItem(STORAGE_KEY) || 'null'));
  } catch {
    state = defaultState();
  }
  const save = () => {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  };
  return {
    persistent,
    get: () => state,
    update(fn) {
      fn(state);
      state = sanitizeState(state);
      return save();
    },
    exportJSON() {
      return JSON.stringify({ app: 'tempo-fit', exportedAt: new Date().toISOString(), ...state }, null, 2);
    },
    importJSON(text) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Fichier illisible : ce n’est pas une sauvegarde TEMPO FIT valide.');
      }
      if (!parsed || parsed.app !== 'tempo-fit') {
        throw new Error('Ce fichier ne provient pas de TEMPO FIT.');
      }
      state = sanitizeState(parsed);
      return save();
    },
    reset() {
      state = defaultState();
      try {
        store.removeItem(STORAGE_KEY);
      } catch {
        /* rien */
      }
    },
  };
}
