// Dates locales au format YYYY-MM-DD (sans fuseau, pour éviter les décalages UTC).

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // midi : insensible aux changements d'heure
}

export function addDays(iso, n) {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function diffDays(fromIso, toIso) {
  return Math.round((fromISODate(toIso) - fromISODate(fromIso)) / 86400000);
}

export function today() {
  return toISODate(new Date());
}

// Date prévue d'un jour du plan (semaine 1, jour 1 = date de début).
export function dateForPlanDay(startIso, week, day) {
  return addDays(startIso, (week - 1) * 7 + (day - 1));
}

// Position d'une date dans le plan, ou null si en dehors des 12 semaines.
export function planDayForDate(startIso, iso, totalWeeks = 12) {
  const n = diffDays(startIso, iso);
  if (n < 0 || n >= totalWeeks * 7) return null;
  return { week: Math.floor(n / 7) + 1, day: (n % 7) + 1 };
}

const FMT = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : null;
const FMT_LONG = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : null;

export function formatShort(iso) {
  return FMT ? FMT.format(fromISODate(iso)) : iso;
}

export function formatLong(iso) {
  return FMT_LONG ? FMT_LONG.format(fromISODate(iso)) : iso;
}

export function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m} min ${String(s).padStart(2, '0')} s` : `${m} min`;
}

export function formatClock(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
