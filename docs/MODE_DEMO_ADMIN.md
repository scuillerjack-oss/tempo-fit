# Proposition — mode démonstration (prochaine version)

> **Proposition uniquement : rien de ceci n'est codé dans la V0.**
> Objectif : permettre au propriétaire (et aux relecteurs) de voir l'avancement des 12 semaines, les semaines allégées,
> les fins de cycle et les recommandations, sans réaliser physiquement les séances.

## Rappel : accès de la V0

La V0 est entièrement gratuite : les trois programmes, les 12 semaines de chaque niveau et les 62 exercices sont consultables sans compte ni paiement (`#/exercices`, `#/programmes`, `#/seance/<clé>` pour n'importe quelle séance, par exemple `#/seance/avance:c1:s12:j6`). Rien n'est verrouillé, donc la démonstration n'a pas besoin de « débloquer » quoi que ce soit.

## Fonctionnalités proposées

1. **Activation** : interrupteur dans Réglages → « Mode démonstration », avec confirmation. Un bandeau permanent « MODE DÉMO — données simulées » s'affiche sur toutes les pages, avec un bouton « Quitter ».
2. **Données séparées** : le mode démo lit et écrit dans une autre clé de stockage (`tempofit.demo.v1`). La progression réelle (`tempofit.v1`) n'est jamais modifiée ; quitter le mode démo la retrouve intacte.
3. **Date simulée** : choisir « aller à la semaine N, jour J » (ou avancer d'un jour / d'une semaine). Le calendrier, l'écran Aujourd'hui et les statuts (faite, non réalisée, repos) suivent cette date.
4. **Remplissage automatique** : marquer comme faites toutes les séances jusqu'à la date simulée, avec un profil de ressentis au choix (plutôt facile / adapté / difficile / mixte) et un taux de réalisation (100 %, 75 %, 50 %).
5. **Raccourcis de fin de programme** : « aller à la fin du cycle » pour afficher la recommandation (monter de niveau, consolider, refaire), puis démarrer le cycle 2 et comparer les séances.
6. **Minuteur accéléré** (facultatif) : lecture ×10 d'une séance guidée pour vérifier l'enchaînement complet et l'écran de fin.
7. **Réinitialiser la démo** en un clic.

## Mise en œuvre technique (estimation : environ 1 jour, tests compris)

- Centraliser la date courante dans un module `clock.js` (`today()` lit une date simulée si le mode démo est actif). Aujourd'hui, `today()` est déjà isolée dans `lib/dates.js`, ce qui facilite le changement.
- Donner au stockage un nom de clé paramétrable (`createStorage(store, key)`).
- Le remplissage réutilise `generatePlan`, `allSessions` et `dateForPlanDay` : aucune nouvelle logique sportive.
- Tests : unitaires (date simulée, remplissage, isolation des deux clés) et navigateur (parcours 12 semaines → fin de cycle → cycle 2).

## Garde-fous (paiement futur)

- Le mode démo est **purement local et visuel** : il ne crée aucun paiement et ne fait aucun appel réseau.
- Un site statique ne peut pas protéger un mode « administrateur » par mot de passe : tout code envoyé au navigateur est lisible. Le mode démo ne doit donc **jamais** servir à donner un droit d'accès.
- Le jour où un contenu payant existera, le droit d'accès devra être vérifié **côté serveur** (paiement confirmé par webhook Stripe, compte ou licence signée). Le mode démo n'y aura aucun effet : il ne pourra pas contourner un paiement, puisqu'il ne touche que des données de progression simulées.
- Si une démonstration du contenu payant est nécessaire plus tard, la faire via un compte de test côté serveur (Stripe en mode test), pas via le mode démo.
