# Déploiement — GitHub, Cloudflare Pages, Stripe (test)

Ne jamais transmettre de mot de passe, clé API ou coordonnées bancaires dans une conversation.
Toutes les étapes ci-dessous se font par le propriétaire, connecté à ses propres comptes.

Les libellés des interfaces GitHub et Cloudflare évoluent : si un bouton a changé de nom, chercher l'équivalent.

## 1. Dépôt GitHub (une fois)

L'intégration GitHub de Claude n'a pas le droit de créer un dépôt sur le compte : il faut le créer à la main.

1. Ouvrir https://github.com/new (connecté avec le compte `scuillerjack-oss`).
2. **Owner** : `scuillerjack-oss` — **Repository name** : `tempo-fit`.
3. Visibilité : **Public** (choix du propriétaire). Conséquence : tout le code et l'historique sont lisibles par tous ; ne jamais y placer de clé, jeton ou mot de passe (les commits utilisent l'adresse e-mail anonyme GitHub `…@users.noreply.github.com`).
4. **Ne cocher aucune option d'initialisation** (pas de README, pas de .gitignore, pas de licence) : le dépôt doit être vide.
5. Cliquer **Create repository**.
6. Si l'application GitHub « Claude » est installée sur « Only select repositories », ajouter `tempo-fit` à la liste :
   https://github.com/apps/claude/installations/select_target → compte `scuillerjack-oss` → Configure → Repository access → ajouter `tempo-fit` → Save.

Claude pousse ensuite le code sur la branche `main`.

## 2. Cloudflare Pages (une fois)

Coût : 0 €. Aucune carte bancaire n'est nécessaire pour l'offre gratuite. Ne souscrire à aucune option payante.

1. Créer un compte gratuit ou se connecter : https://dash.cloudflare.com
2. Menu **Workers & Pages** → **Create** (ou « Create application »).
3. Choisir l'onglet / l'option **Pages** (et non Workers), puis **Connect to Git** (ou « Import an existing Git repository »).
4. Autoriser GitHub : dans la fenêtre GitHub, choisir **Only select repositories** → `tempo-fit` (autorisation minimale) → Install & Authorize.
5. Sélectionner le dépôt `tempo-fit` → **Begin setup**.
6. Réglages :
   - Project name : `tempo-fit` (donne l'adresse `https://tempo-fit.pages.dev` ; si le nom est pris, Cloudflare ajoute un suffixe : noter l'adresse affichée)
   - Production branch : `main`
   - Framework preset : **None**
   - Build command : `npm run build`
   - Build output directory : `dist`
   - Variables d'environnement : aucune nécessaire (facultatif : `NODE_VERSION` = `22`)
7. **Save and Deploy**. Le premier build prend environ une minute.
8. Vérifier : ouvrir l'adresse `https://<projet>.pages.dev` sur le téléphone, puis `https://<projet>.pages.dev/version.json` : le champ `commit` doit être identique au dernier commit de `main` sur GitHub.

Ensuite, chaque push sur `main` déploie automatiquement ; les autres branches obtiennent une adresse de prévisualisation.

### Limites de l'offre gratuite (à vérifier sur https://developers.cloudflare.com/pages/platform/limits/)

Au moment de la rédaction (à revérifier) : 500 builds par mois, 1 build à la fois, 20 000 fichiers maximum par site, 25 Mio par fichier, sites statiques sans limite de bande passante annoncée. Le site V0 compte une trentaine de fichiers et pèse moins de 300 Kio. Vérifier aussi les conditions d'utilisation pour un usage commercial avant la vente.

## 2 bis. Méthode retenue : Wrangler via GitHub Actions (sans l'intégration GitHub de Cloudflare)

Utilisée parce que le bouton « Connect GitHub » de Cloudflare Pages renvoie en boucle vers la page de configuration de l'application GitHub.
Le workflow `.github/workflows/deploy-cloudflare-pages.yml` lance Wrangler (outil officiel Cloudflare) sur les serveurs de GitHub :
tests unitaires → `npm run build` → `wrangler pages deploy dist` → vérification du site public (commit servi, fichiers PWA, en-tête CSP).
**Chaque push sur `main` redéploie automatiquement**, sans nouvelle manipulation. Coût : 0 € (GitHub Actions est gratuit pour un dépôt public, Pages gratuit).

### Créer le jeton Cloudflare (une fois)

1. https://dash.cloudflare.com/profile/api-tokens → **Create Token** → **Create Custom Token** → Get started.
2. Token name : `tempo-fit-github-deploy`.
3. Permissions : une seule ligne : **Account** → **Cloudflare Pages** → **Edit**.
4. Account Resources : **Include** → votre compte.
5. (Facultatif) TTL : une date d'expiration, à renouveler ensuite.
6. **Continue to summary** → **Create Token**. Le jeton ne s'affiche qu'une fois : **ne le collez nulle part ailleurs qu'à l'étape suivante**.

Identifiant de compte (Account ID) : page d'accueil du tableau de bord Cloudflare → menu du compte (⋯ à côté du nom du compte) → **Copy account ID**, ou colonne de droite de la page « Workers & Pages ».

### Ranger les secrets dans GitHub (une fois)

https://github.com/scuillerjack-oss/tempo-fit/settings/secrets/actions → **New repository secret**, deux fois :

| Name | Secret |
|---|---|
| `CLOUDFLARE_API_TOKEN` | le jeton créé ci-dessus |
| `CLOUDFLARE_ACCOUNT_ID` | l'identifiant du compte |

Les secrets GitHub sont chiffrés, invisibles dans les journaux et non accessibles depuis les forks, même dans un dépôt public.

### Lancer le premier déploiement

https://github.com/scuillerjack-oss/tempo-fit/actions → **Déploiement Cloudflare Pages** → **Run workflow** → branche `main` → **Run workflow**.
À la fin (≈ 2 min), le résumé du run affiche l'URL publique et le commit servi. Les déploiements suivants se font à chaque push.

Sans les deux secrets, le workflow s'arrête proprement (avertissement, aucun déploiement).

### Révoquer l'accès

Supprimer le jeton dans Cloudflare (page API Tokens) et/ou les secrets dans GitHub. Le site déjà publié reste en ligne.

### Si vous préférez réparer l'intégration GitHub de Cloudflare

Le renvoi en boucle vers GitHub survient souvent quand l'application « Cloudflare Workers and Pages » a été installée depuis GitHub plutôt que depuis Cloudflare, ou qu'elle est rattachée à un autre compte Cloudflare.
Piste : GitHub → Settings → Applications → Installed GitHub Apps → « Cloudflare Workers and Pages » → **Configure** → **Uninstall**, puis relancer « Connect GitHub » depuis Cloudflare et choisir « Only select repositories » → `tempo-fit`.
Ne pas utiliser les deux méthodes en même temps sur le même projet (deux déploiements concurrents).

## 3. Stripe en mode TEST (facultatif, aucune vente)

La V0 n'a pas besoin de Stripe. Pour tester techniquement un parcours de paiement sans argent réel :

1. Créer un compte sur https://dashboard.stripe.com/register (ne pas activer le compte pour des paiements réels : ne renseigner ni informations d'entreprise ni compte bancaire).
2. Vérifier que le sélecteur **Test mode** (ou « Environnement de test / Sandbox ») est activé.
3. Créer un produit fictif clairement libellé « TEST — ne pas acheter », avec un prix de test.
4. Créer un **Payment Link** pour ce produit : son adresse commence par `https://buy.stripe.com/test_`.
5. Indiquer ce lien (ce n'est pas un secret) à Claude, ou le coller dans `src/js/config.js` → `stripeTestPaymentLink`, puis pousser.
6. La page Tarifs affiche alors un encart « Test technique de paiement (mode test Stripe) ». Payer avec la carte de test `4242 4242 4242 4242`, date future, CVC quelconque.

Garde-fous dans le code :
- tout lien qui ne commence pas par `https://buy.stripe.com/test_` est ignoré (test automatisé) ;
- le paiement de test ne déverrouille rien : il n'existe aucun contenu verrouillé dans la V0 ;
- aucune clé Stripe (publique ou secrète) n'est utilisée par le site.

Un verrouillage commercial réel nécessitera un serveur (vérification du paiement par webhook, comptes utilisateurs ou licences) : à concevoir après validation du modèle économique.

## 4. Nom de domaine

Non prévu en V0 (pas d'achat). L'adresse `*.pages.dev` est gratuite et en HTTPS.
