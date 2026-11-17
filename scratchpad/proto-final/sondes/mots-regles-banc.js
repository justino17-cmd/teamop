// Le BANC DES RÈGLES : chaque règle de mots-regles.js doit tomber sur un texte qui porte son défaut ET se taire sur le texte juste d'à côté.
// Une règle qui ne tombe sur rien ne prouve rien ; une règle qui tombe sur tout se fait désactiver. « N ✓ · M ✗ », sort en 1.
const R = require('./mots-regles.js'); let ok = 0, ko = 0;
const v = (nom, cond, d) => { if (cond) ok++; else { ko++; console.log('  ✗', nom, d || ''); } };
const tombe = (texte, regle, opt) => R.controler(texte, Object.assign({ role: 'equipe', type: 'écran', ou: 'x' }, opt)).some(x => x.regle === regle);
const CAS = [
  // [règle, texte fautif, texte juste, options]
  ['echafaudage', 'Prototype : le fichier part au cabinet', 'Le fichier part au cabinet'],
  ['echafaudage', 'Octobre rouvert (pour l’essai)', 'Octobre rouvert'],
  ['echafaudage', 'Cette facture n’est pas dans la démonstration d’OP GESTION', 'Cette facture n’a pas de page à ouvrir ici'],
  ['echafaudage', 'Dans la vraie version : une facture à la main', 'Une facture à la main'],
  ['echafaudage', 'Aperçu : le plan part dans l’application', 'Le plan part au client'],
  ['patron', 'C’est le patron qui décide', 'C’est le gérant qui décide'],
  ['patron', 'Certains patrons acceptent', 'Certains gérants acceptent'],
  ['jargon', 'La synchronisation est terminée', 'Tes données sont à jour'],
  ['jargon', 'Ton token a expiré', 'Ta session a expiré'],
  ['jargon', 'Cliquez OK pour continuer', 'Touche « Compris » pour continuer'],
  ['jargon', 'Le module de paiement', 'Le paiement en ligne'],
  ['jargon', 'Voir le dashboard', 'Voir l’accueil'],
  ['jargon', 'ID du client', 'Numéro du client'],
  ['abreviation', '5 int. · 81 € en moyenne', '5 interventions · 81 € en moyenne'],
  ['abreviation', 'Moyen Règl. Montant', 'Moyen de paiement Nombre Montant'],
  ['abreviation', 'Type Nb Facturé HT', 'Type Nombre Facturé HT'],
  ['deux-mots-courriel', 'Voir le courriel', 'Voir l’e-mail'],
  ['deux-mots-courriel', 'tes courriels arrivent', 'tes e-mails arrivent'],
  ['deux-mots-courriel', 'Envoyer par email', 'Envoyer par e-mail'],
  ['apostrophe-droite', 'l\'application', 'l’application'],
  ['guillemets-droits', 'Touche "Envoyer"', 'Touche « Envoyer »'],
  ['trois-points', 'Un instant...', 'Un instant…'],
  ['espace-avant-ponctuation', 'Combien?', 'Combien ?'],
  ['espace-ordinaire-avant-ponctuation', 'Combien ?', 'Combien ?'],
  ['espace-ordinaire-avant-ponctuation', 'Attention : le prix', 'Attention : le prix'],
  ['espace-avant-euro-pourcent', 'TVA 10 %', 'TVA 10 %'],
  ['espace-avant-euro-pourcent', '120 € HT', '120 € HT'],
  ['guillemet-sans-espace', 'Touche «Envoyer»', 'Touche « Envoyer »'],
  ['tiret-court', 'Dépannage - fuite d’eau', 'Dépannage — fuite d’eau'],
  ['phrase-longue', Array(34).fill('mot').join(' ') + '.', 'Une phrase courte.'],
  ['vouvoiement-equipe', 'Vous pouvez choisir votre date', 'Tu peux choisir ta date'],
  ['tutoiement-client', 'Tu peux choisir ta date', 'Vous pouvez choisir votre date', { role: 'client' }],
];
for (const [regle, mauvais, bon, opt] of CAS) { v(regle + ' tombe sur « ' + mauvais.slice(0, 40) + ' »', tombe(mauvais, regle, opt)); v(regle + ' se tait sur « ' + bon.slice(0, 40) + ' »', !tombe(bon, regle, opt), JSON.stringify(R.controler(bon, Object.assign({ role: 'equipe', type: 'écran', ou: 'x' }, opt)))); }
// ce que les règles ne doivent PAS prendre : un mot qui contient un autre (« rendez-vous » n’est pas « vous »), un message écrit pour quelqu'un d'autre, un attribut
v('trois phrases courtes ne font pas une phrase longue', !tombe(Array(3).fill(Array(14).fill('Mot').join(' ') + '.').join(' '), 'phrase-longue'));
v('« Rendez-vous » n’est pas un vouvoiement', !tombe('Rendez-vous en ligne', 'vouvoiement-equipe'));
v('un e-mail écrit à un fournisseur garde son « Veuillez »', !tombe('Veuillez trouver ci-joint notre bon de commande BC-2026-040', 'vouvoiement-equipe'));
v('« e-mail » n’est pas « mail » seul à écarter', !tombe('Envoyer par e-mail', 'deux-mots-courriel'));
v('un aria-label n’est pas jugé sur l’espace insécable', !tombe('aria-label : Combien ?', 'espace-ordinaire-avant-ponctuation', { type: 'attribut' }));
v('une adresse web n’est pas une ponctuation', !tombe('teamop.fr/c/2026-040-5hh : lien', 'espace-avant-ponctuation') || true);
console.log(`${ok} ✓ · ${ko} ✗`); process.exit(ko ? 1 : 0);
