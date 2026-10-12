# TEMPO FIT — V0 (bêta)

Site responsive et PWA de **séances sportives courtes à la maison, sans matériel**, pour adultes actifs.
Trois parcours de 12 semaines (10, 20 ou 30 min), séances guidées avec minuteur, suivi local, cycles suivants préprogrammés.

> Nom provisoire, disponibilité à vérifier. Contenus sportifs à faire relire par un professionnel avant toute commercialisation.
> Aucun paiement réel n'est actif.

## Principes de la V0

- **0 € de coût** : site statique (HTML/CSS/JavaScript, sans framework ni dépendance d'exécution), hébergé sur Cloudflare Pages (offre gratuite).
- **Pas de compte, pas de serveur, pas de cookie** : la progression est stockée dans le navigateur (`localStorage`). Pas de synchronisation multi-appareils (export/import JSON à la place).
- **Aucune donnée de santé** demandée ou stockée.
- **Pas de paiement** : page Tarifs préparée, bouton désactivé. Un lien Stripe en mode test peut être ajouté (voir `docs/DEPLOIEMENT.md`) ; il n'est accepté que s'il commence par `https://buy.stripe.com/test_` et ne déverrouille rien.

## Fonctionnalités

| Fonction | Où |
|---|---|
| Accueil, proposition de valeur, 3 parcours, séance découverte | `#/` |
| Création du plan (niveau, date, mode sans saut, consignes de sécurité) | `#/demarrer` |
| Calendrier semaine par semaine + vue 12 semaines, jours de repos, décalage du plan | `#/plan` |
| Fiche séance (échauffement, blocs, retour au calme) | `#/seance/<clé>` |
| Séance guidée : minuteur, pauses, précédent/suivant, version plus douce, arrêt sans pénalité, bips, vibration, écran maintenu allumé | `#/go/<clé>` |
| Bibliothèque de 62 exercices (consignes, variantes, précautions, alternatives sans saut) | `#/exercices` |
| Progression, ressentis, historique, cycle suivant / niveau supérieur | `#/progres` |
| Réglages, installation PWA, export/import/effacement des données | `#/reglages` |
| Tarifs (sans paiement), sécurité, confidentialité, mentions légales | pied de page |

## Structure

```
src/                      Site statique (racine publiée après build)
  index.html              Coquille HTML
  css/app.css             Styles (mobile d'abord, thème clair/sombre)
  js/app.js               Routeur (#/...), rendu des vues
  js/pwa.js               Service worker et installation
  js/data/exercises.js    Bibliothèque d'exercices (textes originaux)
  js/data/program.js      Règles des programmes (niveaux, phases, durées) — à relire
  js/lib/plan.js          Générateur déterministe du plan + déroulé des séances
  js/lib/timer.js         Moteur du minuteur (basé sur l'horloge)
  js/lib/storage.js       Sauvegarde locale, validation, export/import
  js/lib/progress.js      Statistiques, statuts, recommandation de fin de cycle
  js/views/*.js           Vues
  js/config.js            Configuration publique (lien Stripe TEST optionnel)
  sw.js                   Service worker (stratégie hors ligne prudente)
  manifest.webmanifest    Manifeste PWA ; icons/ : icônes générées
  _headers                En-têtes HTTP Cloudflare (CSP, sécurité, cache)
scripts/
  build.mjs               src/ → dist/, inscrit le commit déployé (version.json)
  serve.mjs               Serveur local (applique _headers)
  export-plan.mjs         Exporte le programme complet en Markdown
  make-icons.py           Régénère les icônes (Pillow)
tests/unit/               Tests unitaires (node --test)
tests/e2e/                Tests navigateur (Playwright + axe-core)
docs/                     Rapport technique, tests, déploiement, coûts, points à valider
```

## Installation locale

Prérequis : Node.js 18 ou plus récent. Aucune dépendance à installer pour construire et servir le site.

```bash
npm run build        # construit dist/
npm run serve        # http://localhost:8080
npm test             # tests unitaires
```

Tests navigateur (facultatifs, outils non inclus dans le projet pour garder le build Cloudflare léger) :

```bash
npm i --no-save playwright@1.56.1 axe-core@4.10.3
npx playwright install chromium   # si Chromium n'est pas déjà disponible
npm run test:e2e
```

Exporter le programme complet pour relecture : `npm run plan:export` → `docs/PROGRAMME_COMPLET.md`.

## Déploiement (Cloudflare Pages, gratuit)

Réglages du projet Cloudflare Pages connecté au dépôt GitHub :

| Paramètre | Valeur |
|---|---|
| Branche de production | `main` |
| Preset de framework | None |
| Commande de build | `npm run build` |
| Dossier de sortie | `dist` |

Chaque push sur `main` redéploie automatiquement. Le commit réellement en ligne est visible :
- en bas de chaque page (« Version xxxxxxx ») ;
- à l'adresse `https://<projet>.pages.dev/version.json`.

Méthode utilisée : Wrangler via GitHub Actions (`.github/workflows/deploy-cloudflare-pages.yml`), redéploiement automatique à chaque push sur `main`. Procédure détaillée, secrets à créer et Stripe test : [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md).

## Reprise et restauration

- **Code** : tout est dans ce dépôt. Cloner, `npm run build`, publier `dist/` sur n'importe quel hébergeur statique.
- **Revenir à une version précédente** : dans Cloudflare Pages → Deployments → choisir un déploiement → « Rollback », ou `git revert` puis push.
- **Données des utilisateurs** : elles sont sur leurs appareils. Réglages → « Exporter une sauvegarde » puis « Importer » sur un autre appareil ou navigateur.
- **Modifier le contenu sportif** : `src/js/data/exercises.js` (exercices) et `src/js/data/program.js` (règles). Lancer `npm test` : les tests vérifient durées, repos, variété et mode sans saut.

## Documentation

- [Rapport technique V0](docs/RAPPORT_TECHNIQUE_V0.md) (version PDF : `docs/RAPPORT_TECHNIQUE_V0.pdf`)
- [Résultats des tests](docs/TESTS.md)
- [Points restant à valider](docs/POINTS_A_VALIDER.md)
- [Coûts et services](docs/COUTS_ET_SERVICES.md)
- [Déploiement GitHub / Cloudflare / Stripe test](docs/DEPLOIEMENT.md)
- [Programme complet](docs/PROGRAMME_COMPLET.md)
- [Proposition de mode démonstration (prochaine version)](docs/MODE_DEMO_ADMIN.md)
