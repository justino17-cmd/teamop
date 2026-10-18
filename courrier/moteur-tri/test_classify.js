// Banc d'essai du tri automatique : messages fictifs variés + pièges, résultat attendu pour chacun.
const C = require('./classify.js');
const F = (name, email) => ({ name, email });
const ctx = { contacts: { 'lea.fontaine@atelier-nord.fr': true, 'camille.roy@gmail.com': true }, rules: { senders: {}, domains: {} } };

const cases = [
  // --- Principal : de vraies personnes, même quand elles parlent d'argent, de train ou de promo ---
  ['principal', false, { from: F('Léa Fontaine', 'lea.fontaine@atelier-nord.fr'), subject: 'Compte rendu de la réunion de mardi', body: ['Voici les trois décisions actées.'] }],
  ['principal', false, { from: F('Thomas Berger', 't.berger@berger-batiment.fr'), subject: 'Devis chantier Rue Victor Hugo', body: ['Je vous joins le devis, montant 12 450,00 € avec la remise de 8 %.'] }],
  ['principal', false, { from: F('Mme Dupont', 'marie.dupont@orange.fr'), subject: 'Pouvez-vous me renvoyer la facture ?', body: ['Bonjour, pourriez-vous me renvoyer la facture de 450,00 € du mois dernier ? Merci.'] }],
  ['principal', false, { from: F('Marc Lefèvre', 'm.lefevre@atelier-nord.fr'), subject: 'Déplacement mardi', body: ["J'ai réservé le train, départ 8 h, arrivée gare de Lyon vers 10 h. On se retrouve à l'hôtel ?"] }],
  ['principal', false, { from: F('Sophie', 'sophie.m@icloud.com'), subject: 'Photos du week-end 📷', body: ['Je t’envoie les photos de la rando.'] }],
  ['principal', false, { from: F('Karim B.', 'karim.b@gmail.com'), subject: 'Bon plan resto', body: ["Il y a une offre au resto d'en bas et un code promo, on y va ?"] }],
  ['principal', false, { from: F('Client SARL Mercier', 'direction@mercier-sarl.fr'), subject: 'URGENT : intervention groupe froid', body: ['Notre groupe froid est en panne, pouvez-vous passer demain ?'] }],
  ['principal', false, { from: F('Camille Roy', 'camille.roy@gmail.com'), subject: 'FÉLICITATIONS !!! 🎉', body: ['Tu as eu le poste !!! On fête ça vendredi ?'] }],
  // --- Notifications ---
  ['notif', false, { from: F('OP GESTION', 'notifications@opgestion.pro'), subject: 'Nouvelle intervention assignée — Chantier Villeurbanne', body: ['Une intervention vient de vous être assignée.'], vip: true }],
  ['notif', false, { from: F('OP MESSAGES', 'no-reply@opmessages.pro'), subject: "Vous avez 3 nouveaux messages dans l'équipe", body: ['Reprenez la conversation.'] }],
  ['notif', false, { from: F('Google', 'no-reply@accounts.google.com'), subject: 'Alerte de sécurité : nouvelle connexion', body: ['Nouvelle connexion sur Windows.'] }],
  ['notif', false, { from: F('LinkedIn', 'notifications@linkedin.com'), subject: 'Vous apparaissez dans 5 recherches', body: ['Découvrez qui a consulté votre profil.'] }],
  ['notif', false, { from: F('Assistance Orbit', 'support@orbit.io'), subject: 'Votre ticket #4821 a été résolu', body: ['Le problème de synchronisation est corrigé.'] }],
  ['notif', false, { from: F('Colissimo', 'suivi@colissimo.fr'), subject: 'Votre colis arrive demain', body: ['Votre colis sera livré demain entre 9 h et 13 h.'] }],
  // --- Reçus ---
  ['recus', false, { from: F('Apple', 'no_reply@email.apple.com'), subject: 'Votre reçu Apple', body: ['iCloud+ 200 Go — 2,99 € / mois. Renouvellement automatique.'] }],
  ['recus', false, { from: F('Comptoir & Cie', 'recu@comptoir.fr'), subject: 'Votre reçu du 12 octobre', body: ['Montant : 34,80 € — payé par carte.'] }],
  ['recus', false, { from: F('Free Mobile', 'facturation@free-mobile.fr'), subject: 'Votre facture Free Mobile est disponible', body: ['Montant de votre facture : 19,99 €. Prélèvement le 5.'] }],
  ['recus', false, { from: F('Decathlon', 'commandes@decathlon.fr'), subject: 'Félicitations ! Votre commande est confirmée', body: ['Commande n° 88231 — total 64,90 €. Paiement accepté.'] }],
  ['recus', false, { from: F('EDF', 'factures@edf.fr'), subject: 'Votre facture d’électricité', body: ['Votre facture de 87,12 € est disponible dans votre espace client.'] }],
  // --- Voyages ---
  ['voyages', false, { from: F('SNCF Connect', 'confirmation@sncf-connect.com'), subject: 'Votre billet pour Paris — 12 nov.', body: ['Départ 08 h 04 — Lyon Part-Dieu. Voiture 12, place 34.'] }],
  ['voyages', false, { from: F('Hôtel Lumière', 'reservation@hotellumiere.fr'), subject: 'Confirmation de réservation — 3 nuits', body: ['Séjour du 24 au 27 octobre, chambre Supérieure.'] }],
  ['voyages', false, { from: F('Air France', 'ne-pas-repondre@airfrance.fr'), subject: "Votre carte d'embarquement", body: ['Vol AF1234 Lyon → Nice, embarquement 7 h 15, porte B12. Total payé 129,00 €.'] }],
  ['voyages', false, { from: F('Booking.com', 'customer.service@booking.com'), subject: 'Réservation confirmée à Annecy', body: ['Check-in le 3 novembre à partir de 15 h.'] }],
  // --- Promotions / newsletters ---
  ['promos', false, { from: F('Librairie Volute', 'hello@volute.fr'), subject: '−20 % ce week-end sur tout le rayon design', body: ['Code VOLUTE20.'], unsub: true }],
  ['promos', false, { from: F('Mouvement Nord', 'news@mouvementnord.fr'), subject: 'Votre programme de la semaine', body: ['Nouveautés : créneaux le midi.'], unsub: true }],
  ['promos', false, { from: F('Fnac', 'offres@fnac.com'), subject: 'Derniers jours : -30% sur les casques', body: ['Profitez des soldes.'], unsub: true }],
  ['promos', false, { from: F('UX Weekly', 'hello@uxweekly.com'), subject: "Les 5 tendances d'interface de la semaine", body: ['Bonne lecture.'], unsub: true }],
  // --- Indésirables ---
  ['*', true, { from: F('GRAND CONCOURS', 'gagnant@promo-express-xyz.net'), subject: 'Vous avez été TIRÉ AU SORT !!!', body: ['FÉLICITATIONS !!!', 'Cliquez immédiatement pour réclamer votre cadeau exceptionnel avant expiration.'] }],
  ['*', true, { from: F('Banque Méridienne', 'securite@meridienne-verif.top'), subject: 'Votre compte est suspendu', body: ['Vérifiez votre compte sous 24 h en cliquant ici.'] }],
  ['*', true, { from: F('PayPal', 'service@paypa1-secure.com'), subject: 'Action requise sur votre compte', body: ['Confirmez vos informations pour éviter la fermeture : vérifiez votre compte.'] }],
  ['*', true, { from: F('La Poste', 'suivi@colis-livraison-fr.click'), subject: 'Votre colis est en attente', body: ['Frais de livraison impayés : 1,99 €. Réglez-les ici.'] }],
  ['*', true, { from: F('Crypto Gains', 'invest@rich-fast-2024.xyz'), subject: 'Investissement garanti en bitcoin 💰💰', body: ['Doublez votre capital en 7 jours.'] }],
  ['*', true, { from: F('Impots.gouv', 'remboursement@impots-gouv-fr.buzz'), subject: 'Remboursement en attente de 248,00 €', body: ['Confirmez vos coordonnées bancaires.'] }],
  // --- Légitimes qui ressemblent à des marques : ne doivent PAS être indésirables ---
  ['principal', false, { from: F('Banque Méridienne', 'conseiller@meridienne.fr'), subject: 'Votre rendez-vous de signature', body: ['Nous vous proposons plusieurs créneaux cette semaine.'] }],
  ['notif', false, { from: F('Amazon', 'expedition@amazon.fr'), subject: 'Votre colis a été expédié', body: ['Livraison prévue jeudi.'] }],
];

let ok = 0; const fails = [];
for (const [cat, junk, m] of cases) {
  const r = C.classify(m, ctx);
  const good = r.junk === junk && (cat === '*' || r.cat === cat);
  if (good) ok++; else fails.push(`${m.from.name} — « ${m.subject} » → attendu ${junk ? 'INDÉSIRABLE' : cat}, obtenu ${r.junk ? 'INDÉSIRABLE' : r.cat} (spam ${r.spamScore}; ${r.reasons.join(' / ')})`);
}

// Règles apprises
const rctx = { contacts: {}, rules: { senders: { 'news@mouvementnord.fr': 'junk', 'agence@voyages-dupont.fr': 'voyages', 'promo@vieux-marchand.biz': 'notjunk' }, domains: {} } };
const rules = [
  ['marqué indésirable par l’utilisateur', C.classify({ from: F('Mouvement Nord', 'news@mouvementnord.fr'), subject: 'Programme', body: ['x'], unsub: true }, rctx).junk === true],
  ['règle « toujours classer dans Voyages »', C.classify({ from: F('Agence Dupont', 'agence@voyages-dupont.fr'), subject: 'Votre dossier', body: ['Bonjour'] }, rctx).cat === 'voyages'],
  ['« pas indésirable » l’emporte sur le score', C.classify({ from: F('VIEUX MARCHAND', 'promo@vieux-marchand.biz'), subject: 'GAGNEZ UN CADEAU EXCEPTIONNEL !!!', body: ['Cliquez vite'] }, rctx).junk === false],
  ['un contact connu n’est jamais indésirable', C.classify({ from: F('Camille Roy', 'camille.roy@gmail.com'), subject: 'VOUS AVEZ GAGNÉ !!! 🎉', body: ['Cliquez ici pour réclamer ton cadeau exceptionnel 😂'] }, ctx).junk === false],
];
rules.forEach(([label, pass]) => { if (pass) ok++; else fails.push('règle : ' + label); });

const total = cases.length + rules.length;
console.log(fails.length ? 'ÉCHECS :\n- ' + fails.join('\n- ') : 'Aucun échec');
console.log(`\n${ok}/${total} correctement classés`);
process.exit(fails.length ? 1 : 0);
