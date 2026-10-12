# Inventaire des coûts et services — V0

| Service | Usage | Offre | Coût V0 | Données traitées | À vérifier |
|---|---|---|---|---|---|
| GitHub | Dépôt du code `scuillerjack-oss/tempo-fit` | Gratuite (dépôt privé inclus) | 0 € | Code source | — |
| Cloudflare Pages | Hébergement HTTPS, build à chaque push | Gratuite | 0 € | Journaux techniques de l'hébergeur (IP, navigateur) | Limites et conditions d'usage commercial en vigueur |
| Stripe | Facultatif, **mode test uniquement** | Compte gratuit | 0 € (commissions seulement sur paiements réels, inexistants en V0) | Aucune donnée tant que non utilisé | Tarifs, éligibilité, versements avant toute vente |
| Nom de domaine | Non utilisé (`*.pages.dev`) | — | 0 € | — | Achat éventuel à décider plus tard |
| Polices, images, sons | Aucun service externe : police système, icônes générées, bips synthétisés | — | 0 € | — | — |
| Analytique / publicité | Aucun | — | 0 € | — | — |
| API d'IA | Aucune (plan généré par règles déterministes) | — | 0 € | — | — |

**Total des frais obligatoires : 0 €. Frais mensuels : 0 €.** Aucun abonnement, aucune carte bancaire requise.

Dépendances de développement (non déployées, non facturées) : Playwright et axe-core, utilisés uniquement pour les tests locaux.

## Scénarios économiques (gabarit, à compléter avant la V1)

Le prix et le modèle (achat unique ou abonnement) ne sont **pas décidés**. Gabarit de calcul, avec des hypothèses à vérifier sur la grille Stripe en vigueur :

- Prix de vente TTC : **P** (à définir)
- Commission par transaction (hypothèse à vérifier, cartes européennes standard) : **x % + y €**
- TVA : selon le statut légal (franchise en base ou non), à valider
- Charges fixes : 0 € tant que l'hébergement reste gratuit

| Ventes / mois | Chiffre d'affaires | Commissions | Charges fixes | Solde avant impôts et cotisations |
|---|---|---|---|---|
| 0 | 0 € | 0 € | 0 € | **0 €** (aucune perte) |
| 3 | 3 × P | 3 × (x % × P + y) | 0 € | à calculer |
| 10 | 10 × P | 10 × (x % × P + y) | 0 € | à calculer |
| 30 | 30 × P | 30 × (x % × P + y) | 0 € | à calculer |

L'étude de marché demandée en section 9 du cahier des charges (applications concurrentes, prix, avis, référencement, différenciation) **n'a pas été réalisée dans la V0** : elle conditionne la V1 commerciale.
