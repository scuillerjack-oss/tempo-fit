# Points restant à valider

## Bloquants avant toute commercialisation

1. **Relecture sportive professionnelle** des 62 exercices, des règles de programmation (`src/js/data/program.js`) et du programme complet (`docs/PROGRAMME_COMPLET.md`) : choix des exercices par niveau, ratios effort/récupération, fréquence hebdomadaire, semaines allégées, progression entre cycles, consignes de sécurité. Le contenu a été rédigé avec prudence mais **n'a été relu par aucun professionnel**.
2. **Nom « TEMPO FIT »** : vérifier la disponibilité (marques INPI/EUIPO, noms de domaine, stores, réseaux sociaux).
3. **Statut légal** de l'éditeur, **mentions légales** complètes (identité, contact, hébergeur), **CGU/CGV**, politique de confidentialité validée.
4. **Étude économique** (section 9 du cahier des charges) : concurrence, prix, modèle achat unique ou abonnement, scénarios 0/3/10/30 ventes chiffrés avec la grille Stripe réelle.
5. **Accès payant sécurisé** : impossible côté navigateur seul. Prévoir un serveur (par exemple fonctions Cloudflare) et une vérification des paiements par webhook avant de réserver le moindre contenu.
6. **Conditions Cloudflare Pages** (offre gratuite) et **Stripe** : limites, usage commercial, frais réels.

## À tester par le propriétaire (sur ses appareils)

- [ ] Ouvrir l'URL `*.pages.dev` sur le téléphone : accueil, création du plan, séance guidée complète.
- [ ] Vérifier `…/version.json` : le commit correspond au dernier commit de `main`.
- [ ] Installer la PWA sur Android (Chrome : menu ⋮ → Installer l'application) et sur iPhone (Safari : Partager → Sur l'écran d'accueil).
- [ ] Séance guidée écran verrouillé / application en arrière-plan : le minuteur reste juste au retour, mais **les bips ne sonnent pas écran éteint** (limite des navigateurs). Le maintien de l'écran allumé dépend du navigateur.
- [ ] Son et vibration (l'iPhone ne vibre pas depuis un site web).
- [ ] Export puis import d'une sauvegarde entre deux appareils.

## Limites connues de la V0

- Pas de synchronisation multi-appareils ni de compte (choix volontaire, annoncé dans l'application).
- Les données disparaissent si l'utilisateur efface les données du site ou si le navigateur les purge (Safari peut effacer le stockage d'un site non visité pendant plusieurs semaines) : l'export est proposé.
- Exercices décrits par du texte uniquement (pas d'illustrations ni de vidéos, pour éviter tout média non autorisé). Des illustrations originales amélioreraient la compréhension.
- Les ressentis (facile / adaptée / difficile) servent seulement à une recommandation de fin de cycle ; pas d'adaptation automatique semaine par semaine.
- Au-delà du cycle 2, l'effort plafonne volontairement ; seules les combinaisons d'exercices changent (pas de progression infinie).
- Tests réalisés sur Chromium (mobile et ordinateur émulés). Safari iOS et Firefox n'ont pas été testés automatiquement.
- La vérification de l'URL Cloudflare n'a pas pu être faite depuis l'environnement de développement (réseau restreint) : à confirmer par le propriétaire.
- Pas de nom de domaine personnalisé.
