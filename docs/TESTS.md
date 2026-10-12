# Résultats des tests — V0

Exécutés le 11 octobre 2026, Node.js 22, Chromium 141 (Playwright 1.56.1), axe-core 4.10.3.

- **Tests unitaires** (`npm test`) : **54/54 réussis**
- **Tests navigateur** (`npm run test:e2e`) : **13/13 réussis** (stables sur plusieurs exécutions consécutives)

Les tests navigateur tournent sur le site construit (`dist/`), servi avec les mêmes en-têtes de sécurité que Cloudflare (CSP stricte) : toute erreur JavaScript ou violation de CSP fait échouer le test. L'horloge du navigateur est simulée pour dérouler une séance de 10 minutes en quelques secondes.

## Couverture par critère de réception

| Critère du cahier des charges | Vérification |
|---|---|
| Trois niveaux, 10/20/30 min | Unitaires « structure et règles » : durée de chaque séance à ±5 % (exactement 10:00, 20:20, 30:00) |
| Plan 12 semaines, séances et repos | 36 semaines-niveaux générées ; nombre de séances par semaine, jour de repos, 7e jour au repos ; calendrier testé dans le navigateur |
| Éviter les répétitions excessives | Aucune séance identique sur 12 semaines ; au plus ¼ des exercices repris de la séance précédente ; aucun doublon dans une séance |
| Séance guidée : minuteur, pauses, progression, arrêt sans pénalité | Moteur du minuteur (pause, saut d'étapes en arrière-plan, fin exacte) + parcours navigateur complet + arrêt |
| Suivi local, sans synchronisation | Persistance après rechargement, export/import, données corrompues, stockage indisponible, mention affichée |
| Cycle suivant varié et raisonnable | Aucune séance identique d'un cycle au suivant ; effort +5 s max puis plafonné ; difficulté croissante par phase |
| Alternatives faible impact | Tout exercice avec sauts a une alternative sans saut ; mode sans saut sans aucun saut dans le plan |
| PWA installable, hors ligne prudent | Manifeste, icônes (dont maskable), service worker actif, rechargement hors ligne |
| Aucun paiement réel actif | Bouton désactivé, aucun lien Stripe, seul un lien `buy.stripe.com/test_` serait accepté |
| Mobile / ordinateur, accessibilité | 390 px, 320 px et 1280 px sans défilement horizontal ; axe-core WCAG 2.1 A/AA sans violation grave sur 11 pages |
| Pas de promesse de résultat | Recherche de formulations interdites dans les textes |

## Tests unitaires

| Test | Résultat |
|---|---|
| identifiants uniques et format stable | ✅ OK |
| chaque exercice a consignes, variantes et précautions | ✅ OK |
| tout exercice avec sauts a une alternative sans saut valide | ✅ OK |
| échauffement et retour au calme : exercices accessibles et sans saut | ✅ OK |
| chaque catégorie du corps de séance a assez d’exercices accessibles | ✅ OK |
| textes sans promesse de résultat ni vocabulaire médical interdit | ✅ OK |
| 36 semaines-niveaux : 12 semaines × 3 niveaux, toutes renseignées | ✅ OK |
| structure et règles : debutant cycle 1 | ✅ OK |
| structure et règles : debutant cycle 1 sans saut | ✅ OK |
| structure et règles : debutant cycle 2 | ✅ OK |
| structure et règles : debutant cycle 2 sans saut | ✅ OK |
| structure et règles : debutant cycle 3 | ✅ OK |
| structure et règles : debutant cycle 3 sans saut | ✅ OK |
| structure et règles : debutant cycle 4 | ✅ OK |
| structure et règles : debutant cycle 4 sans saut | ✅ OK |
| structure et règles : intermediaire cycle 1 | ✅ OK |
| structure et règles : intermediaire cycle 1 sans saut | ✅ OK |
| structure et règles : intermediaire cycle 2 | ✅ OK |
| structure et règles : intermediaire cycle 2 sans saut | ✅ OK |
| structure et règles : intermediaire cycle 3 | ✅ OK |
| structure et règles : intermediaire cycle 3 sans saut | ✅ OK |
| structure et règles : intermediaire cycle 4 | ✅ OK |
| structure et règles : intermediaire cycle 4 sans saut | ✅ OK |
| structure et règles : avance cycle 1 | ✅ OK |
| structure et règles : avance cycle 1 sans saut | ✅ OK |
| structure et règles : avance cycle 2 | ✅ OK |
| structure et règles : avance cycle 2 sans saut | ✅ OK |
| structure et règles : avance cycle 3 | ✅ OK |
| structure et règles : avance cycle 3 sans saut | ✅ OK |
| structure et règles : avance cycle 4 | ✅ OK |
| structure et règles : avance cycle 4 sans saut | ✅ OK |
| débutant : jamais deux jours d’entraînement consécutifs | ✅ OK |
| génération déterministe (même plan sur tous les appareils) | ✅ OK |
| le cycle suivant n’est pas une répétition mécanique du précédent | ✅ OK |
| progression raisonnable : effort du cycle 2 ≥ cycle 1, plafonné par niveau | ✅ OK |
| la difficulté moyenne augmente au fil des phases | ✅ OK |
| timeline : chaque pause annonce l’exercice suivant | ✅ OK |
| clés de séance : rejet des valeurs invalides | ✅ OK |
| minuteur : préparation puis enchaînement des étapes | ✅ OK |
| minuteur : la pause fige le temps | ✅ OK |
| minuteur : reste juste après une mise en arrière-plan (saut de plusieurs étapes) | ✅ OK |
| minuteur : fin de séance, mi-temps et décompte | ✅ OK |
| minuteur : suivant / précédent, arrêt possible à tout moment | ✅ OK |
| minuteur : une vraie séance dure exactement la durée annoncée | ✅ OK |
| stockage : création, mise à jour et persistance | ✅ OK |
| stockage : repli en mémoire si localStorage est indisponible | ✅ OK |
| stockage : données corrompues ignorées sans planter | ✅ OK |
| stockage : nettoyage des données invalides | ✅ OK |
| stockage : export puis import (sauvegarde / restauration) | ✅ OK |
| dates : calculs robustes aux changements d’heure | ✅ OK |
| progression : prochaine séance, statuts sans pénalité, statistiques | ✅ OK |
| progression : fin de cycle et recommandation prudente | ✅ OK |
| Stripe : seul un lien de paiement en mode test est accepté | ✅ OK |
| configuration livrée : aucun lien de paiement actif | ✅ OK |

## Tests navigateur (Chromium)

| Test | Résultat |
|---|---|
| accueil mobile : contenu, navigation, sans erreur ni débordement | ✅ OK |
| création du plan débutant : calendrier, séances et jours de repos | ✅ OK |
| séance guidée complète : minuteur, pause, fin et sauvegarde locale | ✅ OK |
| arrêt d’une séance sans pénalité | ✅ OK |
| mode sans saut : aucune séance du plan ne contient d’exercice avec sauts | ✅ OK |
| bibliothèque d’exercices : filtres, recherche et fiche | ✅ OK |
| tarifs : aucun paiement actif, aucun lien de paiement | ✅ OK |
| progression, réglages, export et pages d’information | ✅ OK |
| changer de cycle : le cycle suivant est généré et l’historique conservé | ✅ OK |
| ordinateur : navigation du haut et mise en page large | ✅ OK |
| PWA : manifeste, icônes, service worker et fonctionnement hors ligne | ✅ OK |
| stockage indisponible : le site reste utilisable et prévient l’utilisateur | ✅ OK |
| petit écran (320 px) : aucune page ne déborde horizontalement | ✅ OK |

## Non couvert automatiquement

- Safari iOS, Firefox, appareils physiques : à tester par le propriétaire (voir `POINTS_A_VALIDER.md`).
- Son, vibration, maintien de l'écran allumé : dépendants de l'appareil.
- URL Cloudflare : non joignable depuis l'environnement de développement ; vérification via `/version.json`.
