import { LEVELS, LEVEL_ORDER, PHASES, WARMUP_STEP_SEC, BLOCK_TRANSITION_SEC } from '../data/program.js';
import { EXERCISES } from '../data/exercises.js';
import { stripeTestLink, CONFIG } from '../config.js';
import { esc, safetyNote, SAFETY_SHORT } from '../ui.js';

export function renderNotFound(ctx) {
  ctx.setTitle('Page introuvable');
  ctx.root.innerHTML = `<h1>Page introuvable</h1><p>Ce lien ne correspond à aucune page ou séance.</p><a class="btn btn-primary" href="#/">Retour à l’accueil</a>`;
}

export function renderPrograms(ctx) {
  const rows = LEVEL_ORDER.map((id) => {
    const l = LEVELS[id];
    return `<tr><th scope="row">${esc(l.label)}</th><td>${l.targetMinutes} min</td><td>${l.sessionsPerWeek}</td>
      <td>${l.warmupSteps} × ${WARMUP_STEP_SEC} s</td><td>${l.weekPatterns[0][0].length} bloc${l.weekPatterns[0][0].length > 1 ? 's' : ''} de 4 exercices × ${l.rounds} tours</td>
      <td>${Math.min(...l.workByWeek)} à ${l.maxWorkSec} s / créneau de ${l.slotSec} s</td></tr>`;
  }).join('');
  ctx.root.innerHTML = `<h1>Les programmes</h1>
    <p class="lead">Chaque parcours dure 12 semaines. Les séances, les jours de repos et la progression sont planifiés à l’avance.</p>
    <div class="table-wrap"><table>
      <caption>Structure des trois parcours</caption>
      <thead><tr><th scope="col">Niveau</th><th scope="col">Durée</th><th scope="col">Séances / semaine</th><th scope="col">Échauffement</th><th scope="col">Corps de séance</th><th scope="col">Effort</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="hint">Les durées sont indicatives : adaptez le rythme et prenez plus de récupération si besoin. Retour au calme de même durée que l’échauffement ; ${BLOCK_TRANSITION_SEC} s de pause entre deux blocs.</p>
    <h2>Trois phases de 4 semaines</h2>
    <ul>${PHASES.map((p) => `<li><strong>${esc(p.name)}</strong> (semaines ${p.weeks[0]} à ${p.weeks[3]}) : ${esc(p.goal)}</li>`).join('')}</ul>
    <p>Les semaines 4, 8 et 12 sont <strong>allégées</strong> : moins de temps d’effort, plus de récupération.</p>
    <h2>Des séances variées</h2>
    <p>Les ${EXERCISES.length} exercices de la bibliothèque sont répartis par séance selon des règles fixes : chaque type de séance (corps entier, bas du corps, haut du corps, cardio, gainage) alterne d’une semaine à l’autre, aucun exercice n’apparaît deux fois dans une même séance, et l’on évite de reprendre les exercices de la séance précédente.</p>
    <h2>Après 12 semaines</h2>
    <p>Un nouveau cycle est proposé : nouvelles combinaisons, variantes un peu plus exigeantes et effort légèrement allongé (dans une limite raisonnable). Selon vos ressentis, il peut vous être suggéré de passer au niveau supérieur ou de consolider le niveau actuel.</p>
    <h2>Mode sans saut</h2>
    <p>Activable à tout moment : les exercices avec sauts sont alors exclus du plan.</p>
    <p class="note"><strong>Contenu en bêta.</strong> Les programmes et les consignes doivent être relus par un professionnel qualifié avant toute commercialisation.</p>
    <a class="btn btn-primary btn-lg" href="#/demarrer">Créer mon plan</a>`;
}

export function renderPricing(ctx) {
  const testLink = stripeTestLink();
  ctx.root.innerHTML = `<h1>Tarifs</h1>
    <section class="card card-accent">
      <h2>Bêta gratuite</h2>
      <p class="big">0 €</p>
      <p>Pendant la bêta, les trois parcours, le calendrier, les séances guidées et le suivi sont gratuits, sans compte et sans carte bancaire.</p>
    </section>
    <section class="card">
      <h2>Offre premium — en préparation</h2>
      <p>Une offre payante pourra être proposée plus tard. Son contenu, son prix et sa forme (achat unique ou abonnement) ne sont <strong>pas encore décidés</strong>.</p>
      <p><strong>Aucun paiement n’est possible aujourd’hui</strong> et aucune fonctionnalité n’est réservée à une offre payante.</p>
      <button class="btn btn-primary" disabled aria-disabled="true">Paiement non disponible pendant la bêta</button>
    </section>
    ${
      testLink
        ? `<section class="card card-test">
      <h2>Test technique de paiement (mode test Stripe)</h2>
      <p>Ce lien ouvre une page de paiement Stripe <strong>en mode test</strong> : aucune somme n’est débitée, seules les cartes de test Stripe fonctionnent, et le paiement de test ne débloque rien dans l’application.</p>
      <a class="btn btn-ghost" href="${esc(testLink)}" rel="noopener noreferrer">Ouvrir la page de paiement de test</a>
    </section>`
        : ''
    }
    <p class="hint">Avant toute vente : validation du modèle économique, du statut légal, des conditions générales de vente et d’un accès sécurisé côté serveur.</p>`;
}

export function renderSafety(ctx) {
  ctx.root.innerHTML = `<h1>Consignes de sécurité</h1>
    <p class="lead">${esc(SAFETY_SHORT)}</p>
    <h2>À qui s’adressent les séances</h2>
    <p>Aux adultes sans contre-indication connue à l’activité physique. TEMPO FIT ne remplace pas un avis médical et ne pose aucun diagnostic. Si vous avez une maladie, une blessure, une grossesse en cours ou récente, ou si vous n’avez pas pratiqué depuis longtemps, demandez conseil à un professionnel de santé avant de commencer.</p>
    <h2>Pendant la séance</h2>
    <ul>
      <li>Ne sautez jamais l’échauffement ni le retour au calme.</li>
      <li>Arrêtez immédiatement en cas de douleur (articulation, poitrine, dos), de vertige, de nausée, de palpitations ou d’essoufflement inhabituel.</li>
      <li>Choisissez la version plus facile dès que la technique se dégrade.</li>
      <li>Respirez régulièrement, sans bloquer votre respiration.</li>
      <li>Buvez de l’eau, entraînez-vous dans un endroit aéré, dégagé et sur un sol non glissant.</li>
      <li>Pour les appuis (mur, plan de travail, table), vérifiez qu’ils sont stables et ne peuvent ni glisser ni basculer.</li>
      <li>Le mode sans saut limite les chocs pour les articulations et le voisinage.</li>
    </ul>
    <h2>Récupération</h2>
    <p>Les jours de repos font partie du programme. Une séance manquée n’est pas un échec : reprenez simplement à la suivante.</p>
    <h2>Ce que TEMPO FIT ne promet pas</h2>
    <p>Aucune promesse de perte de poids, de guérison ou de résultat garanti. Les effets de l’activité physique varient d’une personne à l’autre.</p>
    <h2>En cas d’urgence</h2>
    <p>Appelez le 15 (SAMU) ou le 112.</p>
    <p class="note">Contenu en bêta, à faire relire par un professionnel qualifié avant commercialisation.</p>`;
}

export function renderPrivacy(ctx) {
  ctx.root.innerHTML = `<h1>Confidentialité</h1>
    <p class="note">Version bêta — politique à faire valider avant toute commercialisation.</p>
    <h2>Ce que TEMPO FIT enregistre</h2>
    <ul>
      <li>Votre niveau, votre date de départ et vos options (mode sans saut, sons, vibrations).</li>
      <li>Les séances que vous marquez comme faites, leur date et, si vous le choisissez, votre ressenti (facile, adaptée, difficile).</li>
    </ul>
    <p>Ces informations sont stockées <strong>uniquement dans le stockage local de votre navigateur</strong>, sur votre appareil. Elles ne sont envoyées à aucun serveur de TEMPO FIT. Il n’y a ni compte utilisateur, ni cookie, ni outil de mesure d’audience, ni publicité.</p>
    <h2>Ce que TEMPO FIT ne demande pas</h2>
    <p>Aucune donnée de santé (poids, pathologies, fréquence cardiaque…), aucune adresse e-mail, aucun nom.</p>
    <h2>Hébergement</h2>
    <p>Le site est hébergé par Cloudflare (Cloudflare Pages). Comme pour tout site web, l’hébergeur traite des données techniques de connexion (adresse IP, navigateur) nécessaires à l’acheminement des pages et à la sécurité.</p>
    <h2>Vos droits et vos données</h2>
    <p>Vous pouvez à tout moment exporter ou effacer vos données depuis <a href="#/reglages">Réglages</a>. Effacer les données du site dans votre navigateur supprime aussi votre progression.</p>`;
}

export function renderLegal(ctx) {
  const contact = CONFIG.contactEmail ? esc(CONFIG.contactEmail) : '<em>à compléter avant toute commercialisation</em>';
  ctx.root.innerHTML = `<h1>Mentions légales</h1>
    <p class="note"><strong>Brouillon de bêta.</strong> Les informations d’éditeur ci-dessous doivent être complétées et validées avant toute mise en vente.</p>
    <h2>Éditeur</h2>
    <p>Projet TEMPO FIT (nom provisoire, disponibilité à vérifier). Identité et statut de l’éditeur : <em>à compléter</em>. Contact : ${contact}.</p>
    <h2>Hébergement</h2>
    <p>Cloudflare, Inc. — service Cloudflare Pages.</p>
    <h2>Propriété des contenus</h2>
    <p>Les textes des exercices et des programmes ont été rédigés pour TEMPO FIT. Aucune image, vidéo ou musique tierce n’est utilisée.</p>
    <h2>Statut</h2>
    <p>Version bêta gratuite. Aucune vente n’est réalisée sur ce site.</p>
    ${safetyNote()}`;
}
