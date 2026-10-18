module.exports = [
  // ======================= PRINCIPAL (real people) =======================
  { expect: 'principal', m: { from: { name: "Sophie Marchand", email: "sophie.marchand@altiview.fr" }, subject: "Hôtel pour le salon de Lyon", body: [
    "Salut Camille,",
    "J'ai regardé pour l'hébergement du salon Pollutec. Tout est déjà presque complet autour d'Eurexpo, du coup j'ai bloqué deux chambres à l'Ibis Styles Part-Dieu du 2 au 4 décembre, 94 € la nuit petit-déj compris.",
    "La réservation est à mon nom pour l'instant, tu peux me confirmer tes dates avant vendredi ? Sinon je libère la deuxième chambre, l'annulation est gratuite jusqu'à mardi.",
    "Bonne journée,",
    "Sophie"
  ], unsub: false, vip: false } },

  { expect: 'principal', m: { from: { name: "Julie Bernard", email: "julie.bernard84@orange.fr" }, subject: "Fwd: Votre facture TotalEnergies est disponible", body: [
    "Coucou, tu peux jeter un œil ce soir ? Je trouve que ça a beaucoup augmenté par rapport à l'an dernier, on a peut-être un souci avec le chauffe-eau.",
    "Bisous, Julie",
    "---------- Message transféré ---------",
    "De : TotalEnergies <ne-pas-repondre@totalenergies.fr>",
    "Objet : Votre facture TotalEnergies est disponible",
    "Bonjour, votre facture d'électricité du 12/10/2026 est disponible dans votre Espace Client. Montant TTC : 142,37 €. Elle sera prélevée le 27/10/2026."
  ], unsub: false, vip: false } },

  { expect: 'principal', m: { from: { name: "Jean-Marc Dufour", email: "jm.dufour@menuiserie-dufour.fr" }, subject: "Facture placards entrée", body: [
    "Bonjour Madame Roux,",
    "Comme convenu au téléphone, je vous envoie la facture pour la pose des placards de l'entrée. J'ai bien retiré les frais de déplacement comme je vous l'avais promis, ce qui fait 1 340 € TTC au total.",
    "Vous pouvez régler par virement quand ça vous arrange, il n'y a pas d'urgence avant la fin du mois. Le RIB est en bas de la facture.",
    "Merci encore pour l'accueil, et n'hésitez pas si la porte coulissante frotte encore un peu, je repasserai la régler.",
    "Bien cordialement,",
    "Jean-Marc Dufour",
    "Menuiserie Dufour – 06 72 14 88 31"
  ], unsub: false, vip: false } },

  { expect: 'principal', m: { from: { name: "jeannine roux", email: "jeannine.roux@orange.fr" }, subject: "APPELLE MOI CE SOIR", body: [
    "BONJOUR MA CHERIE",
    "JE N'ARRIVE PAS A OUVRIR LES PHOTOS DU BAPTEME QUE TU AS ENVOYEES. TON GRAND-PERE A ESSAYE SUR LA TABLETTE MAIS CA MET UN MESSAGE EN ANGLAIS.",
    "C'EST URGENT PARCE QUE JE VOUDRAIS LES IMPRIMER POUR DIMANCHE CHEZ TATA MONIQUE.",
    "APPELLE MOI CE SOIR APRES LE JOURNAL",
    "GROS BISOUS",
    "MAMIE"
  ], unsub: false, vip: false } },

  { expect: 'principal', m: { from: { name: "Karim Benali", email: "karim.benali@free.fr" }, subject: "Decathlon samedi ?", body: [
    "Salut Camille,",
    "Decathlon fait -30 % sur les vélos ce week-end, j'ai reçu un code promo par mail hier. Je cherche toujours un VTT pour Yanis, ça te dit qu'on passe samedi matin à celui de Villeneuve ?",
    "Je peux passer te prendre vers 9h30, on se fait un café après.",
    "Karim"
  ], unsub: false, vip: false } },

  { expect: 'principal', m: { from: { name: "Claire Vasseur", email: "c.vasseur@vasseur-avocats.fr" }, subject: "URGENT - devis refonte du site à revoir avant jeudi", body: [
    "Bonjour Madame Roux,",
    "Je reviens vers vous concernant votre devis du 8 octobre pour la refonte du site du cabinet. Mes associés trouvent le montant de 7 800 € HT un peu au-dessus de notre budget.",
    "Serait-il possible de retirer le module de prise de rendez-vous en ligne et de nous faire une nouvelle proposition ? Nous avons un comité jeudi matin et j'aimerais pouvoir la leur présenter.",
    "Je reste joignable sur mon portable toute la journée.",
    "Bien à vous,",
    "Claire Vasseur",
    "Avocate associée – Cabinet Vasseur & Lambert"
  ], unsub: false, vip: false } },

  { expect: 'principal', m: { from: { name: "Thomas Girard", email: "thomas.girard@altiview.fr" }, subject: "Billets pour Bordeaux mardi", body: [
    "Hello Camille,",
    "J'ai pris les billets de train pour le rendez-vous chez Cofimo : aller mardi 7h04 depuis Montparnasse, retour 18h52. Je t'ai mise à côté de moi, voiture 14.",
    "Tu devrais recevoir ton e-billet directement de SNCF Connect, sinon dis-le moi et je te le transfère. C'est 112 € l'aller-retour, je l'ai passé sur la carte de la boîte donc pas besoin de note de frais.",
    "À mardi,",
    "Thomas"
  ], unsub: false, vip: false } },

  { expect: 'principal', m: { from: { name: "Isabelle Moreau", email: "isabelle.moreau@groupe-hestia.com" }, subject: "Félicitations !!", body: [
    "Coucou Camille,",
    "Je viens de voir l'annonce de Philippe sur LinkedIn, félicitations pour ta nomination à la tête du pôle produit ! C'est vraiment mérité après tout ce que tu as porté cette année.",
    "On fête ça vendredi midi ? Je réserve au Petit Zinc si tu es partante.",
    "Bises,",
    "Isabelle"
  ], unsub: false, vip: false } },

  { expect: 'principal', m: { from: { name: "Gérard Petit", email: "gerard.petit47@wanadoo.fr" }, subject: "Loyer de novembre et passage du chauffagiste", body: [
    "Bonjour Madame Roux,",
    "Je vous écris pour deux choses. D'abord, comme indiqué dans le bail, le loyer est révisé chaque année selon l'indice IRL : à partir de novembre il passera de 795 € à 812 € charges comprises. Pensez à modifier votre virement.",
    "Ensuite, le chauffagiste doit passer faire l'entretien annuel de la chaudière. Il m'a proposé mercredi 28 entre 14h et 16h, est-ce que quelqu'un pourra lui ouvrir ?",
    "Merci d'avance et bonne fin de semaine,",
    "Gérard Petit"
  ], unsub: false, vip: false } },

  { expect: 'principal', m: { from: { name: "Léa Fontaine", email: "lea@latelierdelea.fr" }, subject: "Re: Ma commande n°1087", body: [
    "Bonjour Camille,",
    "Je suis vraiment désolée pour le retard, j'ai eu une rupture de lin naturel et mon fournisseur ne m'a livrée que lundi. Votre nappe est en cours de couture, je pense pouvoir l'envoyer en fin de semaine.",
    "Pour me faire pardonner, j'ajoute les deux serviettes assorties dans le colis, sans supplément bien sûr.",
    "Encore pardon et merci pour votre patience,",
    "Léa",
    "L'Atelier de Léa – linge de maison fait main à Quimper"
  ], unsub: false, vip: false } },

  // ======================= NOTIF (automatic notifications) =======================
  { expect: 'notif', m: { from: { name: "Google", email: "no-reply@accounts.google.com" }, subject: "Alerte de sécurité", body: [
    "Nouvelle connexion sur Android",
    "camille.roux@gmail.com",
    "Nous avons détecté une nouvelle connexion à votre compte Google depuis un appareil Android (Pixel 9). Si vous êtes à l'origine de cette connexion, aucune action n'est requise. Sinon, nous vous aiderons à sécuriser votre compte.",
    "Consulter l'activité",
    "Vous pouvez également voir l'activité liée à la sécurité sur https://myaccount.google.com/notifications",
    "Cet e-mail vous a été envoyé pour vous informer de modifications importantes apportées à votre compte et aux services Google que vous utilisez."
  ], unsub: false, vip: false } },

  { expect: 'notif', m: { from: { name: "Colissimo", email: "noreply@colissimo.fr" }, subject: "Votre colis 6A21458963247 sera livré aujourd'hui", body: [
    "Bonjour,",
    "Votre colis n° 6A21458963247 expédié par Maison Lumen est en cours de livraison. Il vous sera remis aujourd'hui entre 13h00 et 15h00.",
    "Vous êtes absent ? Vous pouvez choisir une autre date de livraison ou le faire déposer en point retrait depuis la page de suivi sur laposte.fr.",
    "Suivre mon colis",
    "Ceci est un message automatique, merci de ne pas y répondre."
  ], unsub: false, vip: false } },

  { expect: 'notif', m: { from: { name: "LinkedIn", email: "notifications-noreply@linkedin.com" }, subject: "Stéphanie Durand a commenté votre publication", body: [
    "Stéphanie Durand a commenté votre publication",
    "« Bravo pour ce retour d'expérience, on a eu exactement le même problème lors de notre migration. Tu as un moment pour en parler la semaine prochaine ? »",
    "Voir le commentaire",
    "Vous recevez des e-mails de notification. Se désabonner · Aide",
    "LinkedIn Ireland Unlimited Company, Wilton Plaza, Dublin 2."
  ], unsub: true, vip: false } },

  { expect: 'notif', m: { from: { name: "Kevin Lambert", email: "notifications@github.com" }, subject: "Re: [altiview/portail-client] Fix pagination on invoices list (PR #312)", body: [
    "@kevlambert commented on this pull request.",
    "In src/api/invoices.ts:",
    "> const pageSize = 50;",
    "Can we make this configurable? The accounting team regularly exports more than 50 rows at once.",
    "—",
    "Reply to this email directly, view it on GitHub, or unsubscribe.",
    "You are receiving this because you were mentioned."
  ], unsub: true, vip: false } },

  { expect: 'notif', m: { from: { name: "Google Agenda", email: "calendar-notification@google.com" }, subject: "Notification : Point hebdo équipe produit @ jeu. 22 oct. 2026 10:00 - 10:30 (CEST) (camille.roux@altiview.fr)", body: [
    "Cet événement commence dans 30 minutes.",
    "Point hebdo équipe produit",
    "Quand : jeudi 22 oct. 2026 10:00 – 10:30 (heure d'été d'Europe centrale - Paris)",
    "Participer avec Google Meet : meet.google.com/xqv-hjtr-pke",
    "Organisateur : thomas.girard@altiview.fr",
    "Invitation de Google Agenda. Vous recevez cet e-mail car vous avez activé les notifications pour l'agenda camille.roux@altiview.fr."
  ], unsub: false, vip: false } },

  { expect: 'notif', m: { from: { name: "Slack", email: "notification@slack.com" }, subject: "[Slack] Nouveaux messages de Thomas Girard dans Altiview", body: [
    "Vous avez un nouveau message direct",
    "Thomas Girard  14:32",
    "tu as pu regarder la maquette de la page tarifs ? on en parle au point de demain",
    "Répondre dans Slack",
    "Vous recevez cet e-mail car vous avez des messages non lus. Modifier vos préférences de notification."
  ], unsub: true, vip: false } },

  { expect: 'notif', m: { from: { name: "Lumio Énergie", email: "support@lumio-energie.zendesk.com" }, subject: "[Demande #48213] Problème de relève de compteur", body: [
    "##- Veuillez écrire votre réponse au-dessus de cette ligne -##",
    "Votre demande (48213) a été mise à jour. Pour ajouter des commentaires supplémentaires, répondez à cet e-mail.",
    "Mélanie (Lumio Énergie) – 16 oct. 2026 11:04",
    "Bonjour, nous avons transmis votre demande au gestionnaire de réseau. Un technicien vous contactera sous 5 jours ouvrés pour un relevé contradictoire.",
    "Statut : En attente",
    "Ce message a été envoyé par Zendesk."
  ], unsub: false, vip: false } },

  { expect: 'notif', m: { from: { name: "Amazon.fr", email: "shipment-tracking@amazon.fr" }, subject: "Expédié : « Logitech MX Keys S Clavier sans fil… »", body: [
    "Bonjour Camille,",
    "Votre colis est en route !",
    "Arrivée prévue : mardi 20 octobre",
    "Commande n° 405-7781234-5520361",
    "Suivre votre colis",
    "Le transporteur peut vous demander un code de livraison. Retrouvez-le dans Vos commandes.",
    "Nous espérons vous revoir bientôt.",
    "Amazon.fr"
  ], unsub: false, vip: false } },

  { expect: 'notif', m: { from: { name: "Doctolib", email: "no-reply@doctolib.fr" }, subject: "Rappel : votre rendez-vous demain avec Dr Anne Lefort", body: [
    "Bonjour Camille Roux,",
    "Nous vous rappelons votre rendez-vous :",
    "Dr Anne Lefort – Dermatologue",
    "Mardi 20 octobre 2026 à 09:15",
    "12 rue des Lilas, 35000 Rennes",
    "Pensez à vous munir de votre carte Vitale. Si vous ne pouvez pas vous y rendre, merci d'annuler votre rendez-vous au plus tard 24 h à l'avance pour libérer le créneau.",
    "Gérer mon rendez-vous"
  ], unsub: false, vip: false } },

  { expect: 'notif', m: { from: { name: "Crédit Agricole", email: "ne-pas-repondre@credit-agricole.fr" }, subject: "Votre e-relevé de compte est disponible", body: [
    "Madame, Monsieur,",
    "Nous vous informons que votre relevé de compte du mois de septembre 2026 est disponible dans votre espace Banque en ligne, rubrique « e-Documents ».",
    "Pour le consulter, connectez-vous à votre espace habituel depuis le site credit-agricole.fr ou l'application Ma Banque. Pour votre sécurité, ce message ne contient aucun lien.",
    "Votre conseiller reste à votre disposition.",
    "Crédit Agricole Ille-et-Vilaine"
  ], unsub: false, vip: false } },

  // ======================= RECUS (receipts / invoices) =======================
  { expect: 'recus', m: { from: { name: "Amazon.fr", email: "confirmation-commande@amazon.fr" }, subject: "Votre commande Amazon.fr de « Logitech MX Keys S Clavier sans fil… »", body: [
    "Bonjour Camille,",
    "Merci pour votre commande. Nous vous enverrons une confirmation dès que votre article aura été expédié.",
    "Commande n° 405-7781234-5520361",
    "Livraison estimée : mardi 20 octobre",
    "Logitech MX Keys S Clavier sans fil, rétroéclairé – Quantité : 1",
    "Total de la commande : 109,99 €",
    "Vous trouverez votre facture dans Vos commandes une fois l'article expédié."
  ], unsub: false, vip: false } },

  { expect: 'recus', m: { from: { name: "Free Mobile", email: "no-reply@free-mobile.fr" }, subject: "Votre facture Free Mobile d'octobre est disponible", body: [
    "Bonjour,",
    "Votre facture Free Mobile pour la ligne 06 •• •• 47 12 est disponible dans votre Espace Abonné.",
    "Période : du 1er au 31 octobre 2026",
    "Montant : 19,99 € TTC",
    "Le prélèvement sera effectué sur votre compte à partir du 5 novembre 2026.",
    "L'équipe Free Mobile"
  ], unsub: false, vip: false } },

  { expect: 'recus', m: { from: { name: "Fnac.com", email: "confirmation@fnac.com" }, subject: "Félicitations, votre commande n° 7JK4P2QX est confirmée !", body: [
    "Bonjour Camille,",
    "Félicitations, votre commande a bien été enregistrée et votre paiement accepté.",
    "Récapitulatif",
    "1 x Casque Sony WH-1000XM6 – Noir : 379,99 €",
    "Livraison en point retrait Fnac Rennes Colombia : gratuite",
    "Total payé : 379,99 € (carte bancaire se terminant par 4417)",
    "Vous recevrez un e-mail dès que votre commande sera disponible en magasin.",
    "Votre facture sera téléchargeable dans votre espace client, rubrique « Mes commandes »."
  ], unsub: false, vip: false } },

  { expect: 'recus', m: { from: { name: "Plomberie Martin", email: "contact@plomberie-martin.fr" }, subject: "Facture FA-2026-0412", body: [
    "Bonjour,",
    "Veuillez trouver ci-joint votre facture n° FA-2026-0412 du 15/10/2026.",
    "Intervention : remplacement du groupe de sécurité du chauffe-eau",
    "Montant HT : 155,00 € – TVA 20 % : 31,00 € – Montant TTC : 186,00 €",
    "Date d'échéance : 14/11/2026",
    "Règlement par virement : IBAN FR76 1558 9351 0201 4433 8840 112",
    "Ce message a été généré automatiquement par notre logiciel de facturation, merci de ne pas y répondre directement.",
    "SARL Plomberie Martin – 4 impasse des Tanneurs, 35200 Rennes – SIRET 812 447 951 00018"
  ], unsub: false, vip: false } },

  { expect: 'recus', m: { from: { name: "Apple", email: "no_reply@email.apple.com" }, subject: "Your receipt from Apple.", body: [
    "Receipt",
    "APPLE ACCOUNT camille.roux@icloud.com",
    "DATE 14 Oct 2026",
    "ORDER ID MT8QZ4K2LP",
    "DOCUMENT NO. 184520376611",
    "iCloud+ with 200 GB (Monthly) – Renews 14 Nov 2026 – €2.99",
    "TOTAL €2.99",
    "If you have any questions about your bill, please visit Apple Support.",
    "Apple Distribution International Ltd., Hollyhill Industrial Estate, Cork, Ireland."
  ], unsub: false, vip: false } },

  { expect: 'recus', m: { from: { name: "Spotify", email: "no-reply@spotify.com" }, subject: "Votre reçu Spotify Premium", body: [
    "Merci d'avoir choisi Premium !",
    "Voici la confirmation de votre paiement mensuel.",
    "Premium Duo – du 16/10/2026 au 15/11/2026",
    "Total : 16,99 € TTC",
    "Moyen de paiement : Visa •••• 4417",
    "Date de la transaction : 16/10/2026",
    "Votre abonnement se renouvellera automatiquement le 16/11/2026. Vous pouvez le gérer à tout moment depuis la page Compte."
  ], unsub: false, vip: false } },

  { expect: 'recus', m: { from: { name: "PayPal", email: "service@paypal.fr" }, subject: "Reçu de votre paiement à Atelier Céramique Brune", body: [
    "Bonjour Camille Roux,",
    "Vous avez envoyé un paiement de 45,00 € EUR à Atelier Céramique Brune.",
    "Il peut s'écouler quelques minutes avant que cette transaction n'apparaisse dans votre compte.",
    "Marchand : Atelier Céramique Brune – contact@ceramique-brune.fr",
    "Montant payé : 45,00 € EUR",
    "N° de transaction : 7XK48213RF5590314",
    "Mode de paiement : Solde PayPal"
  ], unsub: false, vip: false } },

  { expect: 'recus', m: { from: { name: "Uber Eats", email: "noreply@uber.com" }, subject: "Votre commande Uber Eats du vendredi soir", body: [
    "Total : 27,40 €",
    "16 octobre 2026",
    "Merci d'avoir commandé, Camille",
    "Voici votre reçu pour Poké Bowl House – Rennes République.",
    "1 x Poke Saumon Signature 13,90 €",
    "2 x Mochi Mangue 5,50 €",
    "Frais de livraison 2,49 € – Frais de service 2,51 € – Pourboire 3,00 €",
    "Payé avec Visa •••• 4417",
    "Vous pouvez télécharger une facture depuis la page Commandes de l'application."
  ], unsub: false, vip: false } },

  { expect: 'recus', m: { from: { name: "DGFiP", email: "ne-pas-repondre@dgfip.finances.gouv.fr" }, subject: "Accusé de réception de votre paiement en ligne", body: [
    "Madame, Monsieur,",
    "Nous accusons réception de votre paiement en ligne effectué le 15/10/2026 à 21:42.",
    "Impôt : taxe foncière 2026",
    "Référence de l'avis : 26 35 238 104 551",
    "Montant : 1 126,00 €",
    "Date de prélèvement sur votre compte : 23/10/2026",
    "Cet accusé de réception est également disponible dans votre espace particulier sur impots.gouv.fr, rubrique « Gérer mes paiements ».",
    "La Direction générale des Finances publiques"
  ], unsub: false, vip: false } },

  { expect: 'recus', m: { from: { name: "Canva", email: "no-reply@canva.com" }, subject: "Votre abonnement Canva Pro a été renouvelé", body: [
    "Bonjour Camille,",
    "Merci de continuer l'aventure avec Canva Pro ! Votre abonnement annuel a été renouvelé avec succès.",
    "Formule : Canva Pro – annuel (1 personne)",
    "Période : du 16/10/2026 au 15/10/2027",
    "Montant débité : 119,99 € TTC",
    "Carte : Mastercard •••• 2208",
    "Retrouvez votre facture et gérez votre abonnement depuis Paramètres > Facturation et forfaits."
  ], unsub: false, vip: false } },

  // ======================= VOYAGES (travel) =======================
  { expect: 'voyages', m: { from: { name: "SNCF Connect", email: "noreply@sncf-connect.com" }, subject: "Votre e-billet pour Paris → Bordeaux du mardi 20 octobre", body: [
    "Bonjour Camille,",
    "Votre voyage est confirmé. Votre e-billet est disponible dans l'application SNCF Connect et en pièce jointe.",
    "Aller – mardi 20 octobre 2026",
    "07:04 Paris Montparnasse → 09:08 Bordeaux Saint-Jean",
    "TGV INOUI 8411 – Voiture 14, place 72 – 2de classe",
    "Référence de dossier : QXRT4M",
    "Montant payé : 56,00 €",
    "Présentez votre e-billet à bord sur votre smartphone ou imprimé. Bon voyage !"
  ], unsub: false, vip: false } },

  { expect: 'voyages', m: { from: { name: "Air France", email: "cartedembarquement@airfrance.fr" }, subject: "Votre carte d'embarquement – AF7718 Rennes → Nice", body: [
    "Bonjour Madame Roux,",
    "Vous êtes enregistrée sur le vol AF7718 du samedi 24 octobre 2026.",
    "Rennes (RNS) 08:35 → Nice (NCE) 10:20",
    "Siège : 14C – Groupe d'embarquement : 3",
    "Votre carte d'embarquement est jointe à ce message. Vous pouvez également l'ajouter à votre portefeuille mobile.",
    "Présentez-vous à la porte d'embarquement au plus tard 20 minutes avant le départ.",
    "Nous vous souhaitons un agréable voyage."
  ], unsub: false, vip: false } },

  { expect: 'voyages', m: { from: { name: "Booking.com", email: "noreply@booking.com" }, subject: "Booking confirmation – Hôtel Villa Azur, Nice", body: [
    "Thanks, Camille! Your booking in Nice is confirmed.",
    "Hôtel Villa Azur",
    "Check-in: Saturday 24 October 2026 (from 15:00)",
    "Check-out: Monday 26 October 2026 (until 11:00)",
    "1 Double Room – 2 nights – Total price: € 238",
    "Confirmation number: 4721.883.105 – PIN: 7392",
    "You can cancel for free until 22 October 2026, 23:59 (hotel time).",
    "Manage your booking in the Booking.com app."
  ], unsub: false, vip: false } },

  { expect: 'voyages', m: { from: { name: "Airbnb", email: "automated@airbnb.com" }, subject: "Réservation confirmée : vous partez à Annecy !", body: [
    "Votre réservation est confirmée",
    "Chalet cosy avec vue sur le lac – hôte : Benoît",
    "Arrivée : ven. 13 nov. 2026, à partir de 16:00",
    "Départ : dim. 15 nov. 2026, avant 10:00",
    "Voyageurs : 4",
    "Code de confirmation : HMQ8ZT3K2W",
    "Les instructions d'arrivée seront disponibles 3 jours avant votre séjour dans l'application.",
    "Total (EUR) : 412,60 €"
  ], unsub: false, vip: false } },

  { expect: 'voyages', m: { from: { name: "easyJet", email: "donotreply@easyjet.com" }, subject: "Camille, l'enregistrement en ligne est ouvert pour votre vol vers Lisbonne", body: [
    "C'est bientôt le départ !",
    "L'enregistrement en ligne est désormais ouvert pour votre réservation K7P2MXQ.",
    "Vol EZY4521 – Paris Charles de Gaulle (T2D) → Lisbonne",
    "Départ : jeudi 29 octobre 2026 à 06:50",
    "Enregistrez-vous dès maintenant dans l'application easyJet et téléchargez votre carte d'embarquement. Le dépôt des bagages en soute ferme 40 minutes avant le départ.",
    "Rappel : un seul petit bagage sous le siège est inclus dans votre tarif."
  ], unsub: false, vip: false } },

  { expect: 'voyages', m: { from: { name: "Europcar", email: "noreply@mail.europcar.com" }, subject: "Confirmation de votre réservation n° 1048827361", body: [
    "Bonjour Madame Roux,",
    "Nous avons le plaisir de vous confirmer votre réservation de véhicule.",
    "Agence de départ : Nice Aéroport Terminal 2 – samedi 24/10/2026 à 10:45",
    "Retour : même agence – lundi 26/10/2026 à 09:00",
    "Catégorie : Peugeot 208 ou similaire, boîte manuelle",
    "Prix estimé : 96,40 € TTC, à régler en agence",
    "Merci de vous munir de votre permis de conduire et d'une carte de crédit à votre nom."
  ], unsub: false, vip: false } },

  { expect: 'voyages', m: { from: { name: "OUIGO", email: "noreply@ouigo.com" }, subject: "Rappel : votre voyage OUIGO c'est demain !", body: [
    "Bonjour Camille,",
    "Votre voyage approche, voici les infos à retenir :",
    "Lyon Part-Dieu → Marseille Saint-Charles",
    "Dimanche 1er novembre 2026 – départ 11:22",
    "Train n° 7861 – Voiture 5, places 34 et 35",
    "Pensez à vous présenter sur le quai au moins 30 minutes avant le départ : l'embarquement ferme 2 minutes avant. Au-delà, l'accès au train ne sera plus possible.",
    "Bagages : 1 bagage cabine + 1 petit sac par voyageur."
  ], unsub: false, vip: false } },

  { expect: 'voyages', m: { from: { name: "Eurostar", email: "tickets@eurostar.com" }, subject: "Your Eurostar e-tickets: Paris Gare du Nord to London St Pancras", body: [
    "Hi Camille,",
    "Your tickets are ready. Show the QR code below on your phone or printed at the ticket gates.",
    "Booking reference: EQRT7XK",
    "Outbound – Friday 6 November 2026",
    "Paris Gare du Nord 08:13 → London St Pancras 09:39",
    "Coach 7 – Seat 61 – Standard",
    "Please arrive at least 60 minutes before departure to allow time for security and passport checks.",
    "Have a great trip!"
  ], unsub: false, vip: false } },

  { expect: 'voyages', m: { from: { name: "Hôtel des Remparts", email: "reservation@hotel-des-remparts.fr" }, subject: "Confirmation de réservation n° 58213", body: [
    "Madame Roux,",
    "Nous avons le plaisir de confirmer votre réservation à l'Hôtel des Remparts, Saint-Malo intra-muros.",
    "Arrivée : vendredi 27 novembre 2026 – à partir de 15h00",
    "Départ : dimanche 29 novembre 2026 – avant 11h00",
    "Chambre double vue mer – 2 nuits – petit-déjeuner inclus",
    "Montant du séjour : 312,00 € TTC, taxe de séjour en sus (1,65 € par personne et par nuit)",
    "Conditions d'annulation : gratuite jusqu'à 48 h avant l'arrivée.",
    "Nous restons à votre disposition au 02 99 40 18 25.",
    "La Réception"
  ], unsub: false, vip: false } },

  { expect: 'voyages', m: { from: { name: "Transavia", email: "noreply@transavia.com" }, subject: "Modification d'horaire de votre vol TO3442 Nantes → Porto", body: [
    "Bonjour Camille Roux,",
    "L'horaire de votre vol a été modifié. Nous vous prions de nous excuser pour la gêne occasionnée.",
    "Réservation : 4XPLR2",
    "Vol TO3442 – samedi 14 novembre 2026",
    "Nouvel horaire : départ 14:05 (au lieu de 12:40) – arrivée 15:00 (heure locale)",
    "Si ce nouvel horaire ne vous convient pas, vous pouvez modifier gratuitement votre vol ou demander un remboursement depuis « Mes réservations » sur transavia.com.",
    "Bon voyage avec Transavia."
  ], unsub: false, vip: false } },

  // ======================= PROMOS (marketing / newsletters) =======================
  { expect: 'promos', m: { from: { name: "Fnac", email: "news@e.fnac.com" }, subject: "Ce week-end seulement : jusqu'à -25 % sur les PC portables", body: [
    "Ce week-end seulement",
    "Jusqu'à -25 % sur une sélection de PC portables et tablettes",
    "Adhérents : 10 € offerts tous les 100 € d'achat sur votre carte fidélité",
    "Je découvre les offres",
    "Offres valables du 17 au 19 octobre 2026 inclus, dans la limite des stocks disponibles, en magasin et sur fnac.com.",
    "Vous recevez cet e-mail car vous êtes inscrit(e) à la newsletter Fnac. Se désinscrire"
  ], unsub: true, vip: false } },

  { expect: 'promos', m: { from: { name: "Zalando", email: "info@service-mail.zalando.fr" }, subject: "Nouvelle notification : 3 articles de votre liste d'envies ont baissé", body: [
    "Vous avez 3 nouvelles notifications",
    "Bonne nouvelle Camille, des articles que vous avez aimés sont désormais à prix réduit.",
    "Bottines en cuir – Anna Field – 59,95 € au lieu de 89,95 €",
    "Manteau en laine mélangée – Esprit – 119,99 € au lieu de 169,99 €",
    "Et 1 autre article",
    "Voir ma liste d'envies",
    "Prix valables jusqu'à épuisement des stocks. Se désabonner de la newsletter"
  ], unsub: true, vip: false } },

  { expect: 'promos', m: { from: { name: "Boulanger", email: "boulanger@email.boulanger.com" }, subject: "Votre facture de chauffage vous fait peur ? Jusqu'à -30 % sur les radiateurs", body: [
    "L'hiver arrive, réduisez votre facture d'énergie",
    "Radiateurs à inertie, poêles à granulés, thermostats connectés : jusqu'à -30 % sur une sélection",
    "Payez en 4x sans frais dès 100 € d'achat",
    "Livraison et installation offertes à partir de 299 €",
    "J'en profite",
    "Offre valable du 15 au 26 octobre 2026. Voir conditions en magasin et sur boulanger.com.",
    "Pour ne plus recevoir nos offres, cliquez ici."
  ], unsub: true, vip: false } },

  { expect: 'promos', m: { from: { name: "Le Monde", email: "lettres@info.lemonde.fr" }, subject: "La Matinale du samedi 17 octobre", body: [
    "Bonjour, voici l'essentiel de l'actualité de ce samedi matin.",
    "Budget 2027 : les députés entament l'examen du texte dans un climat tendu",
    "Climat : l'automne le plus chaud jamais mesuré en Europe de l'Ouest",
    "Ligue 1 : le Stade rennais renoue avec la victoire",
    "Lire la Matinale en entier",
    "Vous recevez cette lettre car vous êtes inscrit(e) à « La Matinale ». Gérer mes newsletters – Se désinscrire"
  ], unsub: true, vip: false } },

  { expect: 'promos', m: { from: { name: "Decathlon", email: "decathlon@newsletter.decathlon.fr" }, subject: "Camille, votre code de 15 € expire dimanche", body: [
    "Il vous reste 2 jours !",
    "Votre code fidélité de 15 € est valable dès 60 € d'achat sur tout le site et en magasin.",
    "Code : AUTOMNE15",
    "Randonnée, running, vélo : c'est le moment de vous équiper pour la saison.",
    "J'utilise mon code",
    "Offre valable jusqu'au 19/10/2026 inclus, non cumulable avec d'autres codes promotionnels.",
    "Se désabonner"
  ], unsub: true, vip: false } },

  { expect: 'promos', m: { from: { name: "Sephora", email: "sephora@newsletter.sephora.fr" }, subject: "Joyeux anniversaire Camille ! Votre cadeau vous attend", body: [
    "Joyeux anniversaire !",
    "Toute l'équipe Sephora vous souhaite une merveilleuse journée.",
    "Pour l'occasion, un cadeau vous attend en magasin ou sur sephora.fr : un coffret de miniatures offert dès 30 € d'achat, et -20 % sur votre commande avec votre carte beauty pass.",
    "Je découvre mon cadeau",
    "Offre valable 30 jours, une seule fois, sur présentation de votre carte fidélité.",
    "Vous recevez cet e-mail car vous êtes membre du programme de fidélité. Se désinscrire"
  ], unsub: true, vip: false } },

  { expect: 'promos', m: { from: { name: "Figma", email: "hello@email.figma.com" }, subject: "What's new in Figma: October 2026", body: [
    "Here's what shipped this month",
    "Dev Mode gets smarter annotations, so handoffs need fewer back-and-forths.",
    "Auto layout now supports grid flows, making responsive dashboards easier to build.",
    "Join our live session on October 29 to see the new features in action.",
    "Read the release notes",
    "You're receiving this email because you signed up for product updates from Figma. Unsubscribe · Preferences",
    "Figma, Inc. · 760 Market Street · San Francisco, CA 94102"
  ], unsub: true, vip: false } },

  { expect: 'promos', m: { from: { name: "Uber Eats", email: "uber@uber.com" }, subject: "-40 % sur votre prochaine commande ce week-end", body: [
    "Envie de vous faire plaisir ce week-end ?",
    "Profitez de -40 % sur votre prochaine commande (jusqu'à 15 € de réduction) dans plus de 200 restaurants partenaires près de chez vous.",
    "Code : WEEKEND40",
    "Commander maintenant",
    "Offre valable jusqu'au 18/10/2026 à 23:59, une utilisation par compte, dès 20 € d'achat hors frais.",
    "Vous recevez ces e-mails promotionnels car vous êtes client Uber Eats. Se désabonner"
  ], unsub: true, vip: false } },

  { expect: 'promos', m: { from: { name: "Pennylane", email: "events@pennylane.com" }, subject: "Invitation : webinaire « Facture électronique : êtes-vous prêt ? »", body: [
    "Bonjour Camille,",
    "Depuis le 1er septembre 2026, toutes les entreprises doivent être en mesure de recevoir des factures électroniques, et l'émission deviendra obligatoire pour les PME en 2027. Êtes-vous prêt ?",
    "Rejoignez notre webinaire gratuit le jeudi 5 novembre à 11h00 : nos experts-comptables vous expliquent le calendrier, les obligations et les bonnes pratiques.",
    "Je m'inscris",
    "Le replay sera envoyé à tous les inscrits.",
    "Vous recevez cet e-mail car vous êtes abonné(e) aux actualités Pennylane. Se désinscrire"
  ], unsub: true, vip: false } },

  { expect: 'promos', m: { from: { name: "Ryanair", email: "ryanair@email.ryanair.com" }, subject: "Vols à partir de 19,99 € pour les vacances de la Toussaint", body: [
    "Les prix ont chuté !",
    "Envolez-vous pour Porto, Rome ou Marrakech à partir de 19,99 € l'aller simple.",
    "Réservez avant mercredi minuit pour des voyages entre le 20 octobre et le 15 décembre.",
    "Réserver maintenant",
    "Tarifs par personne, aller simple, taxes incluses, pour une réservation sur ryanair.com. Disponibilités limitées.",
    "Vous recevez cet e-mail car vous êtes abonné aux offres Ryanair. Se désabonner"
  ], unsub: true, vip: false } },

  // ======================= JUNK (spam / scams / phishing) =======================
  { expect: 'junk', m: { from: { name: "Crédit Agricole", email: "securite@credit-agricole-assistance.com" }, subject: "Action requise : votre accès en ligne sera suspendu", body: [
    "Cher(e) client(e),",
    "Dans le cadre de la nouvelle directive européenne DSP2, nous devons vérifier vos informations personnelles. Sans action de votre part sous 48 heures, votre accès à la banque en ligne sera suspendu et votre carte bancaire bloquée.",
    "Pour éviter toute interruption de service, veuillez confirmer votre identité en cliquant sur le lien ci-dessous :",
    "Vérifier mon compte",
    "Nous vous remercions de votre compréhension.",
    "Le service sécurité Crédit Agricole"
  ], unsub: false, vip: false } },

  { expect: 'junk', m: { from: { name: "DGFiP - Service des remboursements", email: "remboursement@impots-gouv-fr.info" }, subject: "Avis de remboursement : vous êtes éligible à un remboursement de 287,40 €", body: [
    "Madame, Monsieur,",
    "Après les derniers calculs de votre impôt sur le revenu, nous avons déterminé que vous êtes éligible à un remboursement de 287,40 €.",
    "Pour recevoir votre remboursement, veuillez remplir le formulaire en ligne et indiquer les coordonnées de votre carte bancaire afin que nous puissions créditer votre compte sous 3 à 5 jours ouvrés.",
    "Accéder au formulaire de remboursement",
    "Référence : FR-2026-RMB-55821",
    "Direction Générale des Finances Publiques"
  ], unsub: false, vip: false } },

  { expect: 'junk', m: { from: { name: "La Poste", email: "info@laposte-suivi-colis.com" }, subject: "Votre colis est en attente – frais de livraison impayés", body: [
    "Bonjour,",
    "Votre colis n° LP04587219FR n'a pas pu être livré car les frais d'affranchissement (1,99 €) n'ont pas été réglés.",
    "Votre colis sera retourné à l'expéditeur si le paiement n'est pas effectué dans les 24 heures.",
    "Planifier la livraison et payer 1,99 €",
    "Merci de votre confiance,",
    "Service client La Poste"
  ], unsub: false, vip: false } },

  { expect: 'junk', m: { from: { name: "PayPal", email: "service@paypa1-support.com" }, subject: "Votre compte PayPal a été limité", body: [
    "Cher client,",
    "Nous avons remarqué une activité inhabituelle sur votre compte PayPal. Par mesure de sécurité, nous avons temporairement limité l'accès à certaines fonctionnalités.",
    "Pour lever cette limitation, vous devez confirmer vos informations de compte et de paiement. Si vous ne le faites pas dans les 72 heures, votre compte sera définitivement suspendu.",
    "Restaurer mon compte",
    "Numéro de dossier : PP-L-4821-339-07",
    "Merci, L'équipe PayPal"
  ], unsub: false, vip: false } },

  { expect: 'junk', m: { from: { name: "Apple Support", email: "no-reply@appleid-verify-account.net" }, subject: "Your Apple ID has been locked for security reasons", body: [
    "Dear Customer,",
    "Your Apple ID was used to sign in to iCloud on an unknown device (iPhone 15, Moscow). For your protection, your Apple ID has been locked.",
    "To unlock your account, you must verify your identity within 24 hours. Otherwise your account and all your data will be permanently deleted.",
    "Verify Now",
    "Apple Support"
  ], unsub: false, vip: false } },

  { expect: 'junk', m: { from: { name: "Service Gagnants", email: "gagnant@jeux-concours-france.top" }, subject: "Félicitations ! Vous avez été sélectionné(e) pour gagner un iPhone 17 Pro", body: [
    "FÉLICITATIONS !",
    "Votre adresse e-mail a été tirée au sort parmi nos participants de la semaine. Vous avez été sélectionné(e) pour recevoir un iPhone 17 Pro.",
    "Pour réclamer votre lot, il vous suffit de répondre à 3 questions rapides et de régler les frais de livraison de 1,95 €.",
    "Il ne reste que 2 lots disponibles : cette offre expire aujourd'hui à minuit.",
    "Réclamer mon cadeau"
  ], unsub: false, vip: false } },

  { expect: 'junk', m: { from: { name: "Julien - Investir Malin", email: "julien@crypto-gains-express.xyz" }, subject: "Comment j'ai transformé 250 € en 18 400 € en 3 mois", body: [
    "Bonjour,",
    "Il y a encore un an, j'étais comme vous : un salaire qui ne suffisait plus et aucune épargne. Puis un ami m'a montré une plateforme de trading automatisée basée sur l'intelligence artificielle.",
    "J'ai commencé avec 250 €. Trois mois plus tard, mon compte affichait 18 400 €. Sans aucune connaissance en finance.",
    "Les places sont limitées à 50 nouveaux membres par semaine. Inscrivez-vous maintenant, un conseiller vous appellera dans l'heure.",
    "Je veux commencer",
    "Julien"
  ], unsub: false, vip: false } },

  { expect: 'junk', m: { from: { name: "ANTAI", email: "avis@antai-gouv-amendes.com" }, subject: "Avis de contravention : paiement en attente", body: [
    "Avis de contravention n° 2026-447-82155",
    "Une infraction au code de la route a été constatée avec votre véhicule le 09/10/2026 à 17:42 (excès de vitesse inférieur à 20 km/h).",
    "Montant de l'amende forfaitaire : 35,00 €. En l'absence de paiement sous 72 heures, l'amende sera majorée à 375,00 €.",
    "Payer mon amende en ligne",
    "Agence Nationale de Traitement Automatisé des Infractions"
  ], unsub: false, vip: false } },

  { expect: 'junk', m: { from: { name: "Maître Paul Kouassi", email: "p.kouassi.notaire@gmail.com" }, subject: "Succession de feu M. Henri Roux – urgent et confidentiel", body: [
    "Bonjour,",
    "Je suis Maître Paul Kouassi, notaire à Abidjan. Je vous contacte au sujet de la succession de feu M. Henri Roux, homme d'affaires français décédé sans héritier connu, qui portait le même nom de famille que vous.",
    "Il a laissé sur un compte bloqué la somme de 2 450 000 € qui sera reversée à l'État si aucun parent ne se manifeste avant la fin du mois.",
    "Je vous propose de vous présenter comme son héritier. La procédure est parfaitement légale et nous partagerons les fonds à 50/50. Merci de me répondre avec vos nom complet, adresse et numéro de téléphone.",
    "Dans l'attente de votre réponse rapide,",
    "Me Paul Kouassi"
  ], unsub: false, vip: false } },

  { expect: 'junk', m: { from: { name: "Netflix", email: "info@netflix-compte-facturation.com" }, subject: "Votre abonnement a été suspendu – mettez à jour votre paiement", body: [
    "Bonjour,",
    "Nous n'avons pas pu valider les informations de facturation pour le prochain cycle de votre abonnement. Votre compte a donc été suspendu.",
    "Pour continuer à profiter de vos séries et films sans interruption, mettez à jour vos informations de paiement dans les 48 heures.",
    "Mettre à jour le paiement",
    "Si vous avez déjà effectué cette mise à jour, veuillez ignorer ce message.",
    "L'équipe Netflix"
  ], unsub: false, vip: false } }
];
