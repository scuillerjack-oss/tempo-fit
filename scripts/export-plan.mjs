// Exporte le programme complet (3 niveaux × 12 semaines, cycle 1 et 2) en Markdown,
// pour relecture par un professionnel : npm run plan:export → docs/PROGRAMME_COMPLET.md
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePlan } from '../src/js/lib/plan.js';
import { LEVELS, LEVEL_ORDER } from '../src/js/data/program.js';
import { EXERCISES, CATEGORIES, getExercise } from '../src/js/data/exercises.js';

const n = (id) => getExercise(id).name;
const out = [];
out.push('# TEMPO FIT — Programme complet (export automatique)', '');
out.push('> Document généré par `npm run plan:export` à partir du code. **À faire relire par un professionnel qualifié avant commercialisation.**', '');
out.push('Jours numérotés à partir de la date de départ choisie (J1 = premier jour). Les jours non listés sont des jours de repos.', '');
for (const levelId of LEVEL_ORDER) {
  const l = LEVELS[levelId];
  for (const cycle of [1, 2]) {
    const plan = generatePlan({ levelId, cycle });
    out.push(`## ${l.label} — cycle ${cycle} (${l.targetMinutes} min, ${l.sessionsPerWeek} séances/semaine)`, '');
    for (const w of plan.weeks) {
      out.push(`### Semaine ${w.week} — ${w.phase}${w.light ? ' — semaine allégée' : ''} — effort ${w.work} s / récupération ${w.rest} s`, '');
      for (const d of w.days.filter((x) => !x.rest)) {
        const s = d.session;
        out.push(`- **J${d.day} · ${s.title}** (${Math.round(s.durationSec / 60)} min)`);
        out.push(`  - Échauffement (30 s chacun) : ${s.warmup.map(n).join(', ')}`);
        s.blocks.forEach((b, i) => out.push(`  - Bloc ${i + 1} ${b.label} (${b.rounds} tours) : ${b.exercises.map(n).join(', ')}`));
        out.push(`  - Retour au calme (30 s chacun) : ${s.cooldown.map(n).join(', ')}`);
      }
      out.push('');
    }
  }
}
out.push('## Bibliothèque d’exercices', '');
for (const [cat, label] of Object.entries(CATEGORIES)) {
  out.push(`### ${label}`, '');
  for (const e of EXERCISES.filter((x) => x.category === cat)) {
    out.push(`#### ${e.name} \`${e.id}\` — difficulté ${e.difficulty}/5 — ${e.impact === 'eleve' ? 'avec sauts' : 'sans saut'}`);
    e.steps.forEach((s, i) => out.push(`${i + 1}. ${s}`));
    out.push(`- Plus facile : ${e.easier}`, `- Plus difficile : ${e.harder}`, `- Précautions : ${e.precautions.join(' ')}`);
    if (e.lowImpactAlt) out.push(`- Alternative sans saut : ${n(e.lowImpactAlt)}`);
    out.push('');
  }
}
const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'PROGRAMME_COMPLET.md');
writeFileSync(target, out.join('\n'));
console.log(`Programme exporté → ${target} (${out.length} lignes)`);
