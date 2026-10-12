// Configuration publique (aucun secret ici : ce fichier est visible par tous les visiteurs).
export const CONFIG = {
  // Lien de paiement Stripe en MODE TEST uniquement (doit commencer par https://buy.stripe.com/test_).
  // Laissé vide tant que le propriétaire n'a pas créé de lien de test. Tout autre lien est ignoré.
  stripeTestPaymentLink: '',
  // Adresse de contact affichée dans les mentions légales (à renseigner avant toute commercialisation).
  contactEmail: '',
};

export function stripeTestLink() {
  const url = String(CONFIG.stripeTestPaymentLink || '');
  return /^https:\/\/buy\.stripe\.com\/test_[A-Za-z0-9]+$/.test(url) ? url : null;
}
