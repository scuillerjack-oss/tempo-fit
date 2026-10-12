# TEMPO FIT — Rapport technique V0

*11 octobre 2026 — version bêta, non commerciale.*

## 1. Résumé

La V0 est un site web statique responsive, installable comme PWA, qui propose trois parcours de 12 semaines de séances sportives à domicile sans matériel (10, 20 et 30 minutes). Les séances sont guidées par un minuteur ; la progression est enregistrée sur l'appareil. Aucun service payant, aucun compte, aucun serveur applicatif, aucun paiement réel.

| Élément | État |
|---|---|
| Application (code, tests, documentation) | Terminée, testée (54 tests unitaires + 13 tests navigateur, tous réussis) |
| Dépôt GitHub `scuillerjack-oss/tempo-fit` | Créé par le propriétaire (public), code poussé sur `main` ; audit : aucun secret, auteur des commits anonymisé |
| Cloudflare Pages | À connecter par le propriétaire (procédure : `DEPLOIEMENT.md`) ; commit en ligne vérifiable sur `/version.json` |
| Contenu sportif | Rédigé, **à faire relire par un professionnel** |
| Paiement | Non activé ; Stripe test facultatif, sans déverrouillage |

## 2. Choix techniques

- **HTML/CSS/JavaScript natifs (modules ES), sans framework ni dépendance d'exécution.** Justification : site léger (260 Kio, 32 fichiers), aucun coût, aucune chaîne de build fragile, maintenance simple, chargement rapide sur mobile.
- **Routage par ancre** (`#/plan`, `#/go/<séance>`…) : fonctionne sur tout hébergeur statique et hors ligne, sans règle de réécriture.
- **Build minimal** (`scripts/build.mjs`, Node sans dépendance) : copie `src/` → `dist/`, inscrit le commit déployé (`CF_PAGES_COMMIT_SHA`) dans `version.json`, le pied de page et le nom du cache du service worker.
- **Aucun secret côté navigateur.** La configuration publique (`config.js`) ne contient qu'un lien Stripe de test optionnel, validé par expression régulière.

## 3. Programmes : un plan déterministe et vérifiable

Les règles sont centralisées dans `src/js/data/program.js` :

| Niveau | Durée | Séances / sem. | Jours (semaine du plan) | Échauffement | Corps de séance | Effort / créneau |
|---|---|---|---|---|---|---|
| Débutant | 10 min | 3 | J1, J3, J5 | 4 × 30 s | 1 bloc × 4 exercices × 2 tours | 20 → 30 s / 45 s |
| Intermédiaire | 20 min 20 | 4 | J1, J2, J4, J6 | 6 × 30 s | 2 blocs (+60 s de pause) | 25 → 35 s / 50 s |
| Avancé | 30 min | 5 | J1, J2, J3, J5, J6 | 8 × 30 s | 3 blocs (+2 × 60 s) | 30 → 40 s / 50 s |

- **Phases** : Fondations (S1-4), Progression (S5-8), Consolidation (S9-12) ; semaines **4, 8 et 12 allégées** (moins d'effort, plus de récupération).
- **Progression** : la durée totale reste fixe ; le temps d'effort augmente au détriment de la récupération (minimum 10 s), et la fenêtre de difficulté des exercices s'élargit vers le haut en phase 3.
- **Variété** : deux semaines types en alternance par niveau ; tirage des exercices par un générateur pseudo-aléatoire à graine fixe, en privilégiant les exercices les moins utilisés et en évitant ceux de la séance précédente. Résultat identique sur tous les appareils.
- **Cycle suivant** : graine différente (nouvelles combinaisons), difficulté maximale +1, effort +5 s plafonné par niveau. Recommandation prudente selon les ressentis déclarés (rester, refaire, ou monter de niveau).
- **Mode sans saut** : exclut du tirage les exercices avec sauts.
- **Vérifiabilité** : `npm run plan:export` produit `docs/PROGRAMME_COMPLET.md` (les 3 niveaux, cycles 1 et 2, séance par séance, et toute la bibliothèque) pour relecture.

Bibliothèque : 62 exercices originaux (9 échauffement, 11 cardio, 13 bas du corps, 10 haut du corps, 10 gainage, 9 retour au calme), chacun avec consignes, variante plus facile, variante plus difficile, précautions, et une alternative sans saut pour chaque exercice avec sauts.

## 4. Séance guidée

- Déroulé : préparation 10 s → échauffement → blocs (effort / récupération, l'exercice suivant est annoncé pendant la pause) → retour au calme.
- Minuteur basé sur l'horloge (et non sur un compteur de « ticks ») : reste juste si l'écran se verrouille ou si l'onglet passe en arrière-plan.
- Pause, étape précédente/suivante, « version plus douce » (variante facile, alternative sans saut, précautions), annonce « changez de côté » à mi-temps.
- Arrêt à tout moment, avec confirmation, **sans pénalité** : la séance reste à faire.
- Bips synthétisés (Web Audio), vibration et maintien de l'écran allumé (Wake Lock), si l'appareil le permet ; désactivables.
- Accessibilité : annonces vocales des étapes (`aria-live`), raccourcis clavier (espace, flèches), focus géré.

## 5. Données et confidentialité

- Stockage `localStorage`, clé `tempofit.v1`, schéma versionné. Contenu : niveau, cycle, date de départ, options, séances faites (date et ressenti facultatif), cycles terminés.
- Aucune donnée de santé, aucun identifiant personnel, aucun cookie, aucune mesure d'audience.
- Validation stricte de tout ce qui est relu ou importé (format des clés, dates, valeurs autorisées) ; repli en mémoire si le stockage est bloqué, avec avertissement.
- Export / import JSON pour changer d'appareil ; effacement complet depuis les Réglages.

## 6. PWA et hors ligne

- Manifeste (nom, couleurs, `standalone`), icônes 192/512, icône « maskable », icône Apple.
- Service worker prudent : précache des fichiers de la version, **réseau d'abord** pour la page (la version en ligne prime), cache d'abord pour les fichiers statiques versionnés, aucune interception des autres domaines, `version.json` jamais en cache. Nouvelle version signalée par un bandeau ; rechargement uniquement à la demande (jamais pendant une séance).

## 7. Sécurité

- En-têtes Cloudflare (`src/_headers`) : CSP stricte (`script-src 'self'`, aucun script en ligne ni tiers), `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` restrictive.
- Tout texte inséré dans la page est échappé ; aucun contenu fourni par l'utilisateur n'est interprété comme HTML.
- Pas de faux verrouillage : aucun contenu n'est réservé, donc rien à contourner.

## 8. Tests

Voir `TESTS.md`. Unitaires (`node --test`) : bibliothèque, règles du plan pour 24 combinaisons niveau × cycle × mode, minuteur avec horloge simulée, stockage, dates (changement d'heure), progression, garde-fou Stripe. Navigateur (Playwright/Chromium) : parcours complets sur mobile 390 px, petit écran 320 px et ordinateur 1280 px, séance de 10 min complète, arrêt, persistance, PWA hors ligne, accessibilité (axe-core, WCAG 2.1 AA, aucune violation grave).

## 9. Déploiement et pérennité

- Dépôt : `scuillerjack-oss/tempo-fit`, branche `main`. Cloudflare Pages : build `npm run build`, sortie `dist`.
- Commit déployé visible dans le pied de page et sur `/version.json`.
- Restauration : rollback Cloudflare ou `git revert` ; le site peut être publié sur n'importe quel hébergeur statique.

## 10. Limites et suites

Voir `POINTS_A_VALIDER.md`. Principales : relecture sportive professionnelle, nom à vérifier, cadre légal et CGV, étude économique (section 9), accès payant sécurisé côté serveur, tests sur Safari iOS et appareils réels, illustrations originales des exercices.
