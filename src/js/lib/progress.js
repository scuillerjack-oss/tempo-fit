// Calculs de progression à partir du plan et des séances enregistrées localement.
import { allSessions } from './plan.js';
import { dateForPlanDay, diffDays, planDayForDate } from './dates.js';
import { LEVEL_ORDER, LEVELS, WEEKS_PER_CYCLE } from '../data/program.js';

export function nextSession(plan, completions) {
  return allSessions(plan).find((s) => !completions[s.key]) || null;
}

export function stats(plan, completions) {
  const sessions = allSessions(plan);
  const done = sessions.filter((s) => completions[s.key]);
  const perWeek = plan.weeks.map((w) => {
    const ws = w.days.filter((d) => !d.rest).map((d) => d.session);
    return { week: w.week, total: ws.length, done: ws.filter((s) => completions[s.key]).length };
  });
  const feelings = { facile: 0, adapte: 0, difficile: 0 };
  for (const s of done) {
    const f = completions[s.key].feeling;
    if (f) feelings[f]++;
  }
  const minutes = Math.round(done.reduce((sum, s) => sum + s.durationSec, 0) / 60);
  return { total: sessions.length, done: done.length, perWeek, feelings, minutes };
}

// Statut d'un jour du calendrier. Une séance passée non réalisée est « non réalisée » :
// aucune pénalité, elle reste disponible.
export function dayStatus(day, startDate, todayIso, completions) {
  const date = dateForPlanDay(startDate, day.week, day.day);
  if (day.rest) return { date, status: date === todayIso ? 'repos-aujourdhui' : 'repos' };
  if (completions[day.session.key]) return { date, status: 'fait' };
  const d = diffDays(todayIso, date);
  if (d === 0) return { date, status: 'aujourdhui' };
  if (d < 0) return { date, status: 'non-realisee' };
  return { date, status: 'a-venir' };
}

export function currentWeek(startDate, todayIso) {
  const pos = planDayForDate(startDate, todayIso, WEEKS_PER_CYCLE);
  if (pos) return pos.week;
  return diffDays(startDate, todayIso) < 0 ? 1 : WEEKS_PER_CYCLE;
}

export function cycleEnded(plan, completions, startDate, todayIso) {
  const st = stats(plan, completions);
  const pastEnd = diffDays(startDate, todayIso) >= WEEKS_PER_CYCLE * 7;
  return st.done === st.total || pastEnd;
}

// Recommandation prudente pour le cycle suivant, à partir des ressentis déclarés.
export function recommendation(levelId, st) {
  const idx = LEVEL_ORDER.indexOf(levelId);
  const answered = st.feelings.facile + st.feelings.adapte + st.feelings.difficile;
  const completion = st.total ? st.done / st.total : 0;
  if (answered > 0 && st.feelings.difficile / answered >= 0.4) {
    return { kind: 'repeter', text: 'Vos séances ont souvent été difficiles : refaites un cycle au même niveau, avec de nouvelles variations. Le mode sans saut peut aussi aider.' };
  }
  if (idx < LEVEL_ORDER.length - 1 && completion >= 0.75 && answered > 0 && st.feelings.facile / answered >= 0.5) {
    const next = LEVELS[LEVEL_ORDER[idx + 1]];
    return { kind: 'monter', nextLevelId: next.id, text: `Vous avez réalisé la majorité des séances et les avez trouvées faciles : vous pouvez passer au niveau ${next.label}, ou poursuivre au même niveau avec un cycle varié.` };
  }
  if (completion < 0.5) {
    return { kind: 'repeter', text: 'Moins de la moitié des séances ont été réalisées : un nouveau cycle au même niveau permet de consolider la régularité.' };
  }
  return { kind: 'continuer', text: 'Poursuivez au même niveau avec le cycle suivant : nouvelles combinaisons d’exercices, variantes un peu plus exigeantes et effort légèrement allongé.' };
}
