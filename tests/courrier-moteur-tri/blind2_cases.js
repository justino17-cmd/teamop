module.exports = [
  // ===================== PRINCIPAL =====================
  // HARD: two-word reply from a client
  { expect: 'principal', m: {
    from: { name: "Nadia Ferrand", email: "n.ferrand@ferrand-gestion.fr" },
    subject: "RE: Passage du technicien jeudi 22",
    body: ["Ok merci.", "Nadia", "Envoyé de mon iPhone"],
    unsub: false, vip: false } },

  // HARD: all-caps message from an elderly customer, says URGENT-ish
  { expect: 'principal', m: {
    from: { name: "GERARD LEMOINE", email: "gerard.lemoine38@orange.fr" },
    subject: "CHAUDIERE",
    body: [
      "BONJOUR MONSIEUR",
      "MA CHAUDIERE NE MARCHE PLUS DEPUIS HIER SOIR IL Y A UN VOYANT ROUGE QUI CLIGNOTE ET PLUS D EAU CHAUDE. VOTRE TECHNICIEN EST DEJA VENU EN MARS POUR L ENTRETIEN.",
      "POUVEZ VOUS ME RAPPELER AU 04 65 71 18 33 JE SUIS LA TOUTE LA JOURNEE. C EST ASSEZ URGENT MA FEMME EST MALADE.",
      "MERCI D AVANCE",
      "G. LEMOINE 12 RUE DES ALPES ECHIROLLES"
    ],
    unsub: false, vip: false } },

  // HARD: accountant sends her own invoice personally
  { expect: 'principal', m: {
    from: { name: "Sophie Marchetti", email: "s.marchetti@marchetti-associes.fr" },
    subject: "Facture honoraires T3 + relevés de septembre",
    body: [
      "Bonjour Julien,",
      "Tu trouveras ci-joint notre facture d'honoraires pour le troisième trimestre, 1 440 € TTC, comme prévu dans la lettre de mission. Tu peux la régler par virement d'ici la fin du mois, rien d'urgent.",
      "Par contre il me manque toujours les relevés Qonto de septembre et les justificatifs des deux achats chez Climadis pour boucler la TVA. Si tu peux me les déposer sur le Dropbox avant mercredi, ce serait parfait.",
      "Belle journée,",
      "Sophie Marchetti",
      "Expert-comptable – Marchetti & Associés"
    ],
    unsub: false, vip: false } },

  // HARD: a real person writing from a no-reply address, order-like subject
  { expect: 'principal', m: {
    from: { name: "Karine Bousquet", email: "noreply@climadis-distribution.fr" },
    subject: "Votre commande CMD-58213 – compresseur en retard",
    body: [
      "Bonjour Monsieur Roche,",
      "Je vous écris depuis l'adresse générique parce que ma messagerie ne fonctionne plus depuis ce matin, désolée.",
      "Le compresseur Danfoss que vous avez commandé mardi est en rupture chez le fabricant, on nous annonce une livraison le 30 octobre au plus tôt. J'ai en stock un modèle Copeland équivalent que je peux vous faire partir demain au même prix. Est-ce que ça irait pour le chantier de Bron ?",
      "Le plus simple est de me rappeler directement au 04 65 71 23 09, ou d'écrire à karine.bousquet@climadis-distribution.fr.",
      "Karine Bousquet",
      "Service clients – Climadis Distribution"
    ],
    unsub: false, vip: false } },

  { expect: 'principal', m: {
    from: { name: "Jean-Pierre Vasseur", email: "jpvasseur@free.fr" },
    subject: "Loyer et passage du plombier",
    body: [
      "Bonjour Julien,",
      "J'ai bien reçu le virement de 780 € pour octobre, merci.",
      "Le plombier que je vous avais annoncé pour le ballon d'eau chaude pourrait passer mardi prochain vers 9h. Est-ce que quelqu'un sera là pour lui ouvrir ? Sinon je peux venir avec mon double des clés.",
      "Bien cordialement,",
      "J.-P. Vasseur"
    ],
    unsub: false, vip: false } },

  { expect: 'principal', m: {
    from: { name: "Léa Fontaine", email: "lea.fontaine@thermiclim-services.fr" },
    subject: "Accès Pennylane",
    body: [
      "Salut Julien,",
      "Depuis que tu as réinitialisé les accès vendredi, je n'arrive plus à me connecter à Pennylane, il me dit que mon mot de passe a expiré. Tu peux me renvoyer le nouveau ? Par SMS plutôt que par mail, Sophie nous a assez fait la morale là-dessus 😅",
      "Je dois saisir les notes de frais des gars avant demain midi.",
      "Merci !",
      "Léa"
    ],
    unsub: false, vip: false } },

  { expect: 'principal', m: {
    from: { name: "Camille Renaud", email: "camille.renaud91@gmail.com" },
    subject: "Annecy en novembre ?",
    body: [
      "Coucou !",
      "Bon, j'ai regardé pour le week-end du 14 : en train c'est 58 € l'aller-retour depuis Part-Dieu si on prend avant vendredi, et Manon a trouvé un petit appart au bord du lac pour 2 nuits. Ça ferait environ 120 € chacun tout compris.",
      "Tu me dis vite si tu es partant, que je réserve pour tout le monde ? Tu me rembourseras après.",
      "Bises"
    ],
    unsub: false, vip: false } },

  // HARD: client writes URGENT, mentions hotel and contract number
  { expect: 'principal', m: {
    from: { name: "Olivier Grandjean", email: "o.grandjean@hotel-belvedere-lyon.fr" },
    subject: "URGENT - fuite clim chambre 214",
    body: [
      "Bonjour,",
      "On a une fuite d'eau importante qui sort de l'unité intérieure de la chambre 214, ça coule sur la moquette et ça commence à passer au plafond de la 114. J'ai coupé le disjoncteur de la chambre mais je ne sais pas si ça suffit.",
      "On a un groupe qui arrive à 16h et l'hôtel est complet ce soir. Est-ce que vous pouvez envoyer quelqu'un dans la matinée ? Contrat de maintenance n° TC-2291.",
      "Merci de me confirmer rapidement par téléphone au 06 39 98 41 72.",
      "Olivier Grandjean",
      "Responsable technique – Hôtel Belvédère"
    ],
    unsub: false, vip: false } },

  { expect: 'principal', m: {
    from: { name: "Françoise Roche", email: "francoise.roche@laposte.net" },
    subject: "Dimanche midi",
    body: [
      "Mon chéri,",
      "Tu viens toujours dimanche ? Ta sœur arrive vers midi avec les enfants. Je fais un gigot, dis-moi si Clara mange de la viande maintenant, je ne sais plus.",
      "Ton père a vu une promo chez Leroy Merlin sur les abris de jardin, -30 % jusqu'à samedi, il voudrait que tu regardes avec lui si c'est du solide avant d'acheter. Tu sais comment il est.",
      "Gros bisous",
      "Maman"
    ],
    unsub: false, vip: false } },

  { expect: 'principal', m: {
    from: { name: "Henrik Lindqvist", email: "henrik.lindqvist@nordvent-components.se" },
    subject: "Re: Quote request – EC fan motors",
    body: [
      "Hi Julien,",
      "Thanks for your patience. I checked with our production team and we can do the 40 EC motors at €212 per unit instead of €228, provided you confirm the order before the end of the month. Lead time would be about three weeks, so delivery around week 46.",
      "Shall I send you a proforma invoice with these terms? I will also include the wiring diagrams you asked for.",
      "Best regards,",
      "Henrik",
      "Nordvent Components AB – Sales Engineer"
    ],
    unsub: false, vip: false } },

  // ===================== NOTIF =====================
  { expect: 'notif', m: {
    from: { name: "Microsoft Teams", email: "noreply@email.teams.microsoft.com" },
    subject: "Léa Fontaine vous a mentionné dans Planning interventions",
    body: [
      "Léa Fontaine vous a mentionné dans le canal Planning interventions (équipe Thermiclim Services).",
      "« @Julien Roche tu peux prendre le dépannage de Villeurbanne demain matin ? Karim est en arrêt. »",
      "Répondre dans Teams",
      "Vous recevez cet e-mail car les notifications par e-mail sont activées pour les mentions. Gérer les paramètres de notification."
    ],
    unsub: false, vip: false } },

  { expect: 'notif', m: {
    from: { name: "Notion", email: "notify@mail.notion.so" },
    subject: "Updates in Thermiclim Services",
    body: [
      "Here's what happened in your workspace since yesterday.",
      "Karim Benali commented on “Procédure mise en service PAC air/eau”: “I added the photos of the pressure test, can someone double-check step 7?”",
      "Léa Fontaine edited 3 pages in Planning › Semaine 43.",
      "Open Notion",
      "You're receiving this because you have email notifications turned on. Change your notification settings."
    ],
    unsub: true, vip: false } },

  { expect: 'notif', m: {
    from: { name: "Dropbox", email: "no-reply@dropbox.com" },
    subject: "Sophie Marchetti shared “Bilan 2025 – Thermiclim” with you",
    body: [
      "Sophie Marchetti (s.marchetti@marchetti-associes.fr) invited you to edit the folder “Bilan 2025 – Thermiclim”.",
      "Message from Sophie: “Voici le dossier pour déposer les relevés et les justificatifs, merci !”",
      "Go to folder",
      "Enjoy!",
      "The Dropbox team"
    ],
    unsub: false, vip: false } },

  // HARD: WeTransfer notice that a person (a client) sent files, with a personal message
  { expect: 'notif', m: {
    from: { name: "WeTransfer", email: "noreply@wetransfer.com" },
    subject: "Olivier Grandjean vous a envoyé Photos_chambre_214.zip",
    body: [
      "Olivier Grandjean vous a envoyé des fichiers",
      "1 fichier · 48,2 Mo · Expire dans 7 jours",
      "« Bonjour, voici les photos de l'unité intérieure et du faux plafond comme demandé. Bonne réception. »",
      "Obtenir vos fichiers",
      "Pour être sûr de recevoir nos e-mails, ajoutez noreply@wetransfer.com à vos contacts."
    ],
    unsub: false, vip: false } },

  // HARD: legit DocuSign envelope sent by a real client (person name in From)
  { expect: 'notif', m: {
    from: { name: "Nadia Ferrand via DocuSign", email: "dse_NA3@docusign.net" },
    subject: "Veuillez signer avec DocuSign : Contrat de maintenance 2027 – Résidence Les Tilleuls",
    body: [
      "Nadia Ferrand vous a envoyé un document à vérifier et à signer.",
      "VÉRIFIER LE DOCUMENT",
      "Nadia Ferrand – n.ferrand@ferrand-gestion.fr",
      "Bonjour, comme convenu au téléphone, voici le contrat pour l'année prochaine avec la visite supplémentaire en juin. Bonne journée.",
      "Ne partagez pas cet e-mail : il contient un lien sécurisé vers DocuSign. Veuillez ne pas transmettre cet e-mail, ce lien ou le code d'accès à d'autres personnes."
    ],
    unsub: false, vip: false } },

  // HARD: legitimate bank message saying "Action requise"
  { expect: 'notif', m: {
    from: { name: "Qonto", email: "no-reply@qonto.com" },
    subject: "Action requise : confirmez les informations de votre entreprise",
    body: [
      "Bonjour Julien,",
      "Comme chaque année, la réglementation nous impose de vérifier que les informations de Thermiclim Services sont à jour (bénéficiaires effectifs, adresse du siège, activité).",
      "Cela prend environ 3 minutes depuis l'application Qonto, rubrique Paramètres › Entreprise. Sans mise à jour d'ici le 15 novembre, certaines fonctionnalités comme les virements sortants pourraient être temporairement limitées.",
      "Rappel : Qonto ne vous demandera jamais vos identifiants ni un code reçu par SMS, que ce soit par e-mail ou par téléphone.",
      "L'équipe Qonto"
    ],
    unsub: false, vip: false } },

  { expect: 'notif', m: {
    from: { name: "IKEA", email: "no-reply@ikea.com" },
    subject: "Votre livraison est prévue demain",
    body: [
      "Bonjour Julien,",
      "Bonne nouvelle : votre commande n° 1347 892 615 sera livrée demain, jeudi 22 octobre, entre 8h et 12h.",
      "Le transporteur vous appellera environ 30 minutes avant son arrivée. Merci de vous assurer que l'accès au logement est dégagé.",
      "Suivre ma livraison",
      "À bientôt,",
      "IKEA"
    ],
    unsub: false, vip: false } },

  { expect: 'notif', m: {
    from: { name: "Calendly", email: "notifications@calendly.com" },
    subject: "Nouvel événement : Hélène Perret – Visite technique (1 h) le mar. 27 oct. 2026 14:00",
    body: [
      "Bonjour Julien,",
      "Un nouvel événement a été planifié.",
      "Type d'événement : Visite technique (1 h)",
      "Invité : Hélène Perret – helene.perret@wanadoo.fr",
      "Date et heure : mardi 27 octobre 2026, 14:00 – 15:00 (heure d'Europe centrale)",
      "Lieu : 8 allée des Peupliers, 69500 Bron",
      "Réponse de l'invité – Motif de la visite : « Devis pour remplacer ma vieille chaudière fioul par une pompe à chaleur »",
      "Voir l'événement dans Calendly"
    ],
    unsub: false, vip: false } },

  // HARD: genuine URSSAF notice (counterpart of a fake one in junk)
  { expect: 'notif', m: {
    from: { name: "Urssaf", email: "ne-pas-repondre@urssaf.fr" },
    subject: "Un nouveau document est disponible dans votre espace en ligne",
    body: [
      "Madame, Monsieur,",
      "Un nouveau document concernant votre compte cotisant (SIRET 852 *** *** 00017) a été déposé dans votre espace en ligne : échéancier de cotisations 2027.",
      "Pour le consulter, connectez-vous à votre espace sur urssaf.fr, rubrique Mes documents.",
      "Ce message est envoyé automatiquement, merci de ne pas y répondre. Pour nous contacter, utilisez la messagerie de votre espace.",
      "Votre Urssaf"
    ],
    unsub: false, vip: false } },

  { expect: 'notif', m: {
    from: { name: "l'Assurance Maladie", email: "ne-pas-repondre@assurance-maladie.fr" },
    subject: "Vous avez un nouveau message",
    body: [
      "Bonjour Julien Roche,",
      "Un nouveau message de votre caisse d'Assurance Maladie est disponible dans votre compte ameli.",
      "Pour le lire, connectez-vous à votre compte ameli depuis le site ameli.fr ou l'application, rubrique Messagerie.",
      "Par sécurité, l'Assurance Maladie ne vous demande jamais vos coordonnées bancaires ou votre mot de passe par e-mail ou par SMS.",
      "L'Assurance Maladie"
    ],
    unsub: false, vip: false } },

  // ===================== RECUS =====================
  // HARD: genuine Stripe receipt, merchant name in From, stripe.com address
  { expect: 'recus', m: {
    from: { name: "Batappli SAS", email: "receipts+acct_1NqT8vKz3Lp0Xa2W@stripe.com" },
    subject: "Your receipt from Batappli SAS #2291-4410",
    body: [
      "Receipt from Batappli SAS",
      "Amount paid: €59.00 — Date paid: Oct 15, 2026 — Payment method: Visa – 4417",
      "Summary: Batappli Pro – 3 utilisateurs (monthly) × 1: €49.17 · TVA (20%): €9.83 · Amount paid: €59.00",
      "If you have any questions, contact us at support@batappli.fr.",
      "You're receiving this email because you made a purchase at Batappli SAS, which partners with Stripe to provide invoicing and payment processing."
    ],
    unsub: false, vip: false } },

  // HARD: genuine Qonto invoice (same sender as security/KYC notices)
  { expect: 'recus', m: {
    from: { name: "Qonto", email: "no-reply@qonto.com" },
    subject: "Votre facture Qonto d'octobre 2026",
    body: [
      "Bonjour Julien,",
      "Les frais de votre abonnement Essential pour le mois d'octobre ont été débités de votre compte principal.",
      "Montant : 58,80 € TTC (49,00 € HT)",
      "Votre facture est disponible en pièce jointe et dans l'application, rubrique Paramètres › Facturation. Elle a été automatiquement rattachée à la transaction correspondante.",
      "L'équipe Qonto"
    ],
    unsub: false, vip: false } },

  { expect: 'recus', m: {
    from: { name: "Pennylane", email: "facturation@pennylane.com" },
    subject: "Renouvellement de votre abonnement Pennylane",
    body: [
      "Bonjour,",
      "Votre abonnement Pennylane Essentiel a été renouvelé pour une période de 12 mois, du 18 octobre 2026 au 17 octobre 2027.",
      "Montant prélevé : 1 008,00 € TTC sur le compte FR76 •••• 4021.",
      "Vous trouverez la facture correspondante (n° PL-2026-118427) en pièce jointe.",
      "Merci de votre confiance,",
      "L'équipe Pennylane"
    ],
    unsub: false, vip: false } },

  { expect: 'recus', m: {
    from: { name: "Leroy Merlin", email: "commande@leroymerlin.fr" },
    subject: "Confirmation de votre commande n° 70045812",
    body: [
      "Bonjour Julien,",
      "Merci pour votre commande ! Elle est en cours de préparation dans votre magasin Leroy Merlin Lyon Vénissieux.",
      "Récapitulatif : 2 × Gaine isolée PVC Ø 125 mm, 6 m – 47,80 € ; 1 × Colliers de fixation (lot de 10) – 8,90 € ; 1 × Mousse expansive pistolable 750 ml – 12,95 €",
      "Total payé : 69,65 € TTC (dont TVA 11,61 €)",
      "Vous recevrez un e-mail dès que votre commande sera prête à être retirée (sous 2 h en moyenne).",
      "À très vite en magasin !"
    ],
    unsub: true, vip: false } },

  { expect: 'recus', m: {
    from: { name: "Back Market", email: "noreply@backmarket.fr" },
    subject: "Votre remboursement a été effectué",
    body: [
      "Bonjour Julien,",
      "Suite au retour de votre iPhone 13 – 128 Go – Minuit (commande n° 48211907), le vendeur a validé votre remboursement.",
      "Montant remboursé : 389,00 €, sur la carte utilisée lors de l'achat (Mastercard •••• 8830).",
      "Selon votre banque, le montant apparaîtra sur votre compte sous 3 à 5 jours ouvrés.",
      "L'équipe Back Market"
    ],
    unsub: false, vip: false } },

  // HARD: genuine utility invoice (energy suppliers are often spoofed)
  { expect: 'recus', m: {
    from: { name: "TotalEnergies", email: "nepasrepondre@totalenergies.fr" },
    subject: "Votre facture d'électricité du 14/10/2026",
    body: [
      "Bonjour Monsieur Roche,",
      "Votre facture n° 10 2648 337 120 est disponible dans votre Espace Client.",
      "Montant : 87,40 € TTC, qui sera prélevé le 4 novembre 2026 sur votre compte se terminant par 21.",
      "Période de consommation : du 13/09/2026 au 12/10/2026 – 412 kWh.",
      "Pour toute question, rendez-vous dans l'aide en ligne de votre Espace Client.",
      "TotalEnergies Électricité et Gaz France"
    ],
    unsub: false, vip: false } },

  { expect: 'recus', m: {
    from: { name: "Bouygues Telecom", email: "no-reply@services.bouyguestelecom.fr" },
    subject: "Confirmation de votre paiement",
    body: [
      "Bonjour,",
      "Nous vous confirmons la bonne réception de votre paiement par carte bancaire de 41,99 € pour la facture de septembre de votre ligne 06 39 98 •• ••.",
      "Référence de la transaction : BT-PAY-7781204",
      "Aucune autre action n'est nécessaire de votre part.",
      "Bouygues Telecom"
    ],
    unsub: false, vip: false } },

  { expect: 'recus', m: {
    from: { name: "Vinted", email: "no-reply@vinted.fr" },
    subject: "Ton reçu pour « Veste de travail Snickers taille L »",
    body: [
      "Salut Julien,",
      "Merci pour ton achat ! Voici ton reçu.",
      "Article : Veste de travail Snickers taille L – 18,00 €",
      "Protection acheteurs : 1,60 € · Livraison (Mondial Relay) : 2,99 €",
      "Total payé : 22,59 €",
      "Le vendeur a 5 jours ouvrés pour envoyer ton colis. Tu recevras une notification dès qu'il sera expédié."
    ],
    unsub: true, vip: false } },

  { expect: 'recus', m: {
    from: { name: "Alan", email: "no-reply@alan.com" },
    subject: "Votre cotisation d'octobre a été prélevée",
    body: [
      "Bonjour Julien,",
      "Nous avons prélevé 312,48 € pour la cotisation santé d'octobre de Thermiclim Services (6 salariés couverts).",
      "Le détail par salarié et l'avis d'échéance sont disponibles dans votre espace Alan, rubrique Facturation.",
      "À bientôt,",
      "L'équipe Alan"
    ],
    unsub: false, vip: false } },

  { expect: 'recus', m: {
    from: { name: "HubSpot Billing", email: "billing@hubspot.com" },
    subject: "Your HubSpot subscription has renewed",
    body: [
      "Hi Julien,",
      "Thanks for being a HubSpot customer. Your Starter Customer Platform subscription for Thermiclim Services renewed on October 16, 2026.",
      "Amount charged: €216.00 (annual, 1 seat) to Visa ending in 4417.",
      "Invoice number: INV-2026-3381547. You can download the PDF anytime from Account & Billing.",
      "The HubSpot Billing Team"
    ],
    unsub: false, vip: false } },

  // ===================== VOYAGES =====================
  { expect: 'voyages', m: {
    from: { name: "Air France", email: "ne-pas-repondre@airfrance.fr" },
    subject: "Votre carte d'embarquement – Lyon > Nantes, vol AF7516",
    body: [
      "Bonjour Monsieur Roche,",
      "Vous êtes enregistré sur le vol AF7516 du lundi 26 octobre 2026.",
      "Départ : Lyon Saint-Exupéry, terminal 1, à 07:05 – Arrivée : Nantes Atlantique à 08:20",
      "Siège 14C – Embarquement à partir de 06:35, fermeture de la porte 20 minutes avant le départ.",
      "Votre carte d'embarquement est jointe à cet e-mail. Vous pouvez aussi l'ajouter au portefeuille de votre téléphone.",
      "Bon voyage avec Air France."
    ],
    unsub: false, vip: false } },

  // HARD: train ticket with a total price and card used (looks like a receipt)
  { expect: 'voyages', m: {
    from: { name: "Trainline", email: "auto-confirm@info.thetrainline.com" },
    subject: "Your tickets for Lyon Part-Dieu to Annecy",
    body: [
      "Hi Julien,",
      "Your booking is confirmed. Booking reference: TL8K2QXP",
      "Outward: Friday 13 November 2026 – Lyon Part-Dieu 17:34 → Annecy 19:41, TER, 1 adult",
      "Return: Sunday 15 November 2026 – Annecy 17:18 → Lyon Part-Dieu 19:25",
      "Total: €58.40, paid with Visa ending 0952",
      "Your e-tickets are ready in the Trainline app. Show the QR code to the conductor when asked.",
      "Have a great trip!"
    ],
    unsub: false, vip: false } },

  { expect: 'voyages', m: {
    from: { name: "TGV INOUI", email: "ne-pas-repondre@info.sncf-connect.com" },
    subject: "Modification de votre voyage du 23 octobre",
    body: [
      "Bonjour Julien,",
      "En raison de travaux sur la ligne, l'horaire de votre train TGV INOUI n° 6612 Lyon Part-Dieu → Paris Gare de Lyon du vendredi 23 octobre a été modifié.",
      "Nouvel horaire : départ 08:04 (au lieu de 07:34), arrivée 10:02.",
      "Votre place (voiture 14, place 82) est conservée. Si ce nouvel horaire ne vous convient pas, vous pouvez échanger ou annuler votre billet sans frais jusqu'au départ depuis l'application SNCF Connect.",
      "Nous vous prions de nous excuser pour la gêne occasionnée.",
      "TGV INOUI"
    ],
    unsub: false, vip: false } },

  { expect: 'voyages', m: {
    from: { name: "BlaBlaCar", email: "ne-pas-repondre@blablacar.fr" },
    subject: "C'est réservé ! Lyon → Grenoble avec Mathieu",
    body: [
      "Bonjour Julien,",
      "Votre place est confirmée.",
      "Samedi 31 octobre – départ 09:30 Lyon, Perrache (parking du centre d'échanges) → arrivée 10:50 Grenoble, Gare",
      "Conducteur : Mathieu (4,8 ★ – 112 avis) – Peugeot 308 grise",
      "Prix payé : 12,50 € (frais de service inclus)",
      "Vous pouvez contacter Mathieu depuis la messagerie de l'application. Pensez à arriver 5 minutes en avance !"
    ],
    unsub: false, vip: false } },

  // HARD: car rental booking with an estimated total
  { expect: 'voyages', m: {
    from: { name: "Hertz", email: "reservations@emails.hertz.com" },
    subject: "Confirmation de votre réservation H58217733",
    body: [
      "Bonjour Julien Roche,",
      "Merci d'avoir choisi Hertz. Voici le récapitulatif de votre réservation.",
      "Retrait : Nantes Aéroport, lundi 26 octobre 2026 à 08:45 – Restitution : Nantes Aéroport, lundi 26 octobre 2026 à 19:00",
      "Catégorie : Renault Clio ou similaire, boîte manuelle",
      "Total estimé : 74,90 € TTC, à régler au comptoir. Kilométrage illimité inclus.",
      "Présentez votre permis de conduire et une carte bancaire au nom du conducteur principal.",
      "Gérer ma réservation"
    ],
    unsub: false, vip: false } },

  { expect: 'voyages', m: {
    from: { name: "Accor", email: "confirmation@reservation.accor.com" },
    subject: "Confirmation de réservation – Mercure Paris Gare de Lyon",
    body: [
      "Bonjour Julien,",
      "Votre réservation est confirmée. Numéro de confirmation : 418552903",
      "Mercure Paris Gare de Lyon – du vendredi 23 octobre 2026 au samedi 24 octobre 2026, 1 nuit",
      "Chambre Standard, lit double – 1 adulte – petit-déjeuner inclus",
      "Arrivée à partir de 15h, départ avant 12h. Annulation gratuite jusqu'au 22 octobre à 23h59.",
      "Montant du séjour : 164,00 € TTC, à régler à l'hôtel (taxe de séjour en sus)."
    ],
    unsub: false, vip: false } },

  { expect: 'voyages', m: {
    from: { name: "FlixBus", email: "noreply@booking.flixbus.com" },
    subject: "Votre réservation n° 3182447590 – Lyon → Turin",
    body: [
      "Bonjour Julien,",
      "Merci d'avoir réservé avec FlixBus ! Votre billet est en pièce jointe.",
      "Aller : jeudi 12 novembre 2026, 07:15 Lyon Perrache → 12:40 Torino Porta Susa",
      "1 adulte, 1 bagage en soute, 1 bagage à main",
      "Présentez le QR code de votre billet (dans l'application ou imprimé) au chauffeur lors de l'embarquement. Arrivez au moins 15 minutes avant le départ.",
      "Bon voyage !"
    ],
    unsub: false, vip: false } },

  { expect: 'voyages', m: {
    from: { name: "Sixt", email: "noreply@sixt.fr" },
    subject: "Rappel : retrait de votre utilitaire demain à 7h30",
    body: [
      "Bonjour Monsieur Roche,",
      "Nous vous rappelons le retrait de votre véhicule demain, mardi 20 octobre 2026 à 07:30, en agence Sixt Lyon Gerland.",
      "Catégorie : utilitaire 12 m³ (Renault Master ou similaire) – Réservation n° 9551208734 – Client : Thermiclim Services",
      "Pensez à vous munir de votre permis de conduire en cours de validité et de la carte bancaire de l'entreprise pour le dépôt de garantie.",
      "Pour gagner du temps, faites votre check-in en ligne depuis l'application Sixt.",
      "À demain !"
    ],
    unsub: false, vip: false } },

  { expect: 'voyages', m: {
    from: { name: "easyJet", email: "confirmation@easyjet.com" },
    subject: "Your booking confirmation K7RW2PD",
    body: [
      "Hi Julien,",
      "Thanks for booking with easyJet. Your booking reference is K7RW2PD.",
      "Outbound: Lyon (LYS) → Porto (OPO), Thu 3 Dec 2026, departs 14:10, arrives 15:20",
      "Return: Porto (OPO) → Lyon (LYS), Mon 7 Dec 2026, departs 16:00, arrives 19:05",
      "Passenger: Mr Julien Roche – 1 cabin bag, seat 6A on both flights",
      "Total paid: €187.96",
      "Online check-in opens 30 days before departure. Please make sure your passport or ID card is valid for travel."
    ],
    unsub: false, vip: false } },

  // HARD: automated arrival info that embeds a personal message from the host
  { expect: 'voyages', m: {
    from: { name: "Airbnb", email: "automated@airbnb.com" },
    subject: "Votre séjour à Porto : informations d'arrivée",
    body: [
      "Votre séjour chez Ana commence dans 3 jours !",
      "Jeu. 3 déc. → lun. 7 déc. 2026 · Appartement avec balcon – Ribeira, Porto",
      "Arrivée : à partir de 16:00 – boîte à clé sécurisée. Le code vous sera communiqué le jour de votre arrivée.",
      "Message d'Ana : « Olá Julien ! Le métro depuis l'aéroport s'arrête à 5 minutes de l'appartement (station São Bento). N'hésitez pas si vous avez des questions. »",
      "Itinéraire · Contacter votre hôte · Règlement intérieur"
    ],
    unsub: false, vip: false } },

  // ===================== PROMOS =====================
  // HARD: subject reads like an order/receipt confirmation
  { expect: 'promos', m: {
    from: { name: "Cdiscount", email: "infos@news.cdiscount.com" },
    subject: "Confirmation : votre code de réduction est activé",
    body: [
      "Bonjour Julien,",
      "C'est confirmé : votre code de réduction est prêt à être utilisé.",
      "-15 € dès 99 € d'achat sur l'électroménager, la maison et le bricolage avec le code AUTOMNE15, jusqu'à dimanche minuit.",
      "Et toujours la livraison gratuite avec Cdiscount à Volonté.",
      "J'en profite",
      "Offre valable une seule fois par client, hors Marketplace. Vous recevez cet e-mail car vous êtes inscrit à la newsletter Cdiscount. Se désinscrire."
    ],
    unsub: true, vip: false } },

  // HARD: newsletter from a travel company
  { expect: 'promos', m: {
    from: { name: "SNCF Connect", email: "newsletter@info.sncf-connect.com" },
    subject: "Noël : les billets sont ouverts à la vente",
    body: [
      "Bonjour Julien,",
      "Les réservations pour les fêtes de fin d'année sont ouvertes ! Réservez dès maintenant vos trajets TGV INOUI et OUIGO jusqu'au 4 janvier.",
      "Avec la Carte Avantage, profitez de 30 % de réduction sur vos trajets en 2de et 1re classe, et d'un prix maximum garanti.",
      "Je réserve mon trajet",
      "Vous recevez cette newsletter car vous êtes inscrit aux offres SNCF Connect. Se désinscrire."
    ],
    unsub: true, vip: false } },

  { expect: 'promos', m: {
    from: { name: "Leroy Merlin", email: "leroymerlin@newsletter.leroymerlin.fr" },
    subject: "Chauffage : préparez l'hiver jusqu'à -25 %",
    body: [
      "Les températures baissent, pas vos envies de confort.",
      "Jusqu'au 2 novembre : jusqu'à -25 % sur une sélection de poêles à granulés, radiateurs à inertie et thermostats connectés.",
      "Et avec la pose par nos artisans partenaires, profitez de 10 % supplémentaires sur l'installation.",
      "Je découvre les offres",
      "Offres valables dans la limite des stocks disponibles, en magasin et sur leroymerlin.fr. Pour ne plus recevoir nos e-mails, cliquez ici."
    ],
    unsub: true, vip: false } },

  // HARD: bulk webinar invitation from a SaaS the user pays for
  { expect: 'promos', m: {
    from: { name: "Pennylane", email: "events@pennylane.com" },
    subject: "Jeudi 11h : préparer sa clôture annuelle sans stress",
    body: [
      "Bonjour Julien,",
      "La clôture de l'exercice approche ? Rejoignez notre webinar gratuit jeudi 29 octobre à 11h avec Claire, experte-comptable partenaire de Pennylane.",
      "Au programme : les 5 points à vérifier avant le 31 décembre, comment rapprocher vos factures en quelques clics, et une session de questions-réponses en direct.",
      "Je m'inscris",
      "Vous ne pouvez pas être présent ? Inscrivez-vous quand même, nous vous enverrons le replay.",
      "Vous recevez cet e-mail en tant qu'utilisateur Pennylane. Gérer mes préférences."
    ],
    unsub: true, vip: false } },

  { expect: 'promos', m: {
    from: { name: "HubSpot", email: "product-updates@hubspot.com" },
    subject: "New in HubSpot: AI call summaries, now on every plan",
    body: [
      "Hi Julien,",
      "Spend less time writing notes and more time with customers. Starting today, HubSpot can automatically summarize your sales calls and log the next steps on the contact record.",
      "Also new this month: a redesigned mobile app for field teams, and quote templates you can send in under a minute.",
      "See what's new",
      "Want to see it in action? Join a live demo on November 5.",
      "You received this email because you are subscribed to Product Updates from HubSpot. Unsubscribe or manage email preferences."
    ],
    unsub: true, vip: false } },

  { expect: 'promos', m: {
    from: { name: "Back Market", email: "hello@news.backmarket.fr" },
    subject: "Le Black Friday commence (un peu) en avance chez nous",
    body: [
      "On ne va pas attendre fin novembre.",
      "Smartphones, ordinateurs, consoles : jusqu'à -40 % par rapport au neuf, et toujours garantis 1 an minimum.",
      "En bonus cette semaine : -20 € sur les MacBook reconditionnés avec le code AVANCE20 (dès 300 € d'achat).",
      "J'en profite",
      "Vous ne souhaitez plus recevoir nos e-mails ? Désinscrivez-vous ici."
    ],
    unsub: true, vip: false } },

  { expect: 'promos', m: {
    from: { name: "ALL - Accor Live Limitless", email: "all@email.accor.com" },
    subject: "Julien, vos points comptent double cet hiver",
    body: [
      "Bonjour Julien,",
      "Du 1er novembre au 15 décembre, gagnez deux fois plus de points sur tous vos séjours dans plus de 5 000 hôtels du groupe.",
      "Il vous suffit de vous inscrire à l'offre avant de réserver. Vous êtes actuellement membre Classic avec 1 240 points.",
      "Je m'inscris à l'offre",
      "Conditions de l'offre sur all.accor.com. Se désabonner."
    ],
    unsub: true, vip: false } },

  // HARD: bulk B2B newsletter from a supplier the user also deals with personally
  { expect: 'promos', m: {
    from: { name: "Climadis Distribution", email: "newsletter@climadis-distribution.fr" },
    subject: "Climadis Infos – novembre : nouvelles PAC R290 et tarifs 2027",
    body: [
      "Bonjour,",
      "Ce mois-ci dans Climadis Infos : arrivée en stock des pompes à chaleur monobloc au R290 de 6 à 16 kW, formation gratuite d'une demi-journée sur la mise en service dans nos agences de Lyon et Grenoble, et les nouveaux tarifs fabricants applicables au 1er janvier.",
      "Commandez avant le 15 décembre pour bénéficier des prix 2026 sur toute la gamme climatisation.",
      "Découvrir les nouveautés",
      "Vous recevez cette lettre d'information en tant que client professionnel Climadis. Se désinscrire."
    ],
    unsub: true, vip: false } },

  { expect: 'promos', m: {
    from: { name: "Salon Énergies & Confort", email: "invitation@salon-energies-confort.fr" },
    subject: "Julien, votre badge gratuit pour le salon du 18 au 20 novembre",
    body: [
      "Bonjour Julien,",
      "Nous avons le plaisir de vous inviter au Salon Énergies & Confort, le rendez-vous des installateurs et mainteneurs du génie climatique, du 18 au 20 novembre à Eurexpo Lyon.",
      "320 exposants, des démonstrations en continu sur les pompes à chaleur et la régulation, et des conférences sur la réglementation 2027.",
      "Avec le code EXPOPRO, votre badge est gratuit (au lieu de 40 €).",
      "Je télécharge mon badge",
      "Pour ne plus recevoir nos invitations, cliquez ici."
    ],
    unsub: true, vip: false } },

  // HARD: subject mentions "facture" but it is a marketing mail
  { expect: 'promos', m: {
    from: { name: "Darty", email: "darty@newsletter.darty.com" },
    subject: "Votre facture d'électricité va vous dire merci",
    body: [
      "Bonjour Julien,",
      "Remplacer un vieux réfrigérateur par un modèle classe A, c'est jusqu'à 120 € d'économies par an sur votre consommation.",
      "Jusqu'au 9 novembre, jusqu'à 150 € remboursés sur une sélection de froid et de lavage, et la reprise de votre ancien appareil offerte à la livraison.",
      "Voir les produits concernés",
      "Offres soumises à conditions, voir modalités sur darty.com. Se désabonner."
    ],
    unsub: true, vip: false } },

  // ===================== JUNK =====================
  // HARD: phishing using DocuSign's name on a look-alike domain
  { expect: 'junk', m: {
    from: { name: "DocuSign", email: "dse@docusign-esignature.net" },
    subject: "Document à signer : Avenant_Contrat_Maintenance.pdf",
    body: [
      "Un document vous a été envoyé pour signature électronique.",
      "Expéditeur : Service Comptabilité",
      "Document : Avenant_Contrat_Maintenance.pdf (2 pages)",
      "Ce document expire dans 24 heures. Pour y accéder, connectez-vous avec l'adresse e-mail et le mot de passe de votre messagerie professionnelle.",
      "CONSULTER LE DOCUMENT",
      "© DocuSign, Inc. Tous droits réservés."
    ],
    unsub: false, vip: false } },

  // HARD: fake invoice from an unknown company demanding urgent payment
  { expect: 'junk', m: {
    from: { name: "NovaTech Solutions – Recouvrement", email: "recouvrement@novatech-solutions-group.com" },
    subject: "Facture n° FA-2026-0912 impayée – dernier rappel avant contentieux",
    body: [
      "Madame, Monsieur,",
      "Sauf erreur de notre part, la facture n° FA-2026-0912 d'un montant de 1 780,00 € TTC relative à la prestation de référencement de votre entreprise reste impayée à ce jour malgré nos précédentes relances.",
      "Sans règlement sous 48 heures, votre dossier sera transmis à notre service contentieux et une indemnité forfaitaire de 40 € ainsi que des intérêts de retard seront appliqués.",
      "Merci d'effectuer le virement sur le compte suivant : IBAN LT27 3250 0000 0000 0912, en indiquant la référence FA-2026-0912.",
      "Facture en pièce jointe.",
      "Service Recouvrement"
    ],
    unsub: false, vip: false } },

  // HARD: CEO fraud from a free webmail address using the boss's real name
  { expect: 'junk', m: {
    from: { name: "Philippe Garnier", email: "philippe.garnier.direction@gmail.com" },
    subject: "Demande confidentielle",
    body: [
      "Julien,",
      "Es-tu à ton bureau ? J'ai besoin que tu t'occupes d'un virement aujourd'hui pour un dossier d'acquisition que nous finalisons. C'est strictement confidentiel tant que l'annonce n'est pas faite, donc n'en parle à personne, ni à Léa ni à Sophie.",
      "Je suis en réunion avec l'avocat tout l'après-midi et je ne peux pas prendre d'appel. Réponds-moi uniquement par mail, je t'envoie les coordonnées bancaires et le montant dès que tu es dispo.",
      "Philippe",
      "Envoyé depuis mon téléphone"
    ],
    unsub: false, vip: false } },

  // HARD: fake URSSAF on a look-alike domain (counterpart of the genuine one)
  { expect: 'junk', m: {
    from: { name: "URSSAF", email: "notification@urssaf-recouvrement.fr" },
    subject: "Mise en demeure – régularisation de cotisations",
    body: [
      "Madame, Monsieur,",
      "Après vérification de vos déclarations, un écart a été constaté sur les cotisations du 2e trimestre 2026. Le montant restant dû s'élève à 612,40 €.",
      "Afin d'éviter une majoration de 10 % et l'engagement d'une procédure de recouvrement forcé, nous vous invitons à régulariser votre situation sous 72 heures.",
      "Régler en ligne par carte bancaire : accéder au paiement sécurisé",
      "Service Recouvrement – Urssaf Rhône-Alpes"
    ],
    unsub: false, vip: false } },

  // HARD: fake ameli refund (counterpart of the genuine one)
  { expect: 'junk', m: {
    from: { name: "ameli.fr", email: "remboursement@ameli-assure-securite.com" },
    subject: "Vous avez un remboursement en attente",
    body: [
      "Cher(e) assuré(e),",
      "Après le dernier calcul de vos prestations, vous pouvez bénéficier d'un remboursement de 148,60 €.",
      "Votre carte Vitale arrivant à expiration, merci de confirmer vos informations et vos coordonnées bancaires afin de recevoir ce montant sous 3 jours ouvrés.",
      "Accéder à mon espace",
      "Sans réponse de votre part avant le 20/10/2026, votre dossier sera clôturé.",
      "L'Assurance Maladie"
    ],
    unsub: false, vip: false } },

  { expect: 'junk', m: {
    from: { name: "julien.roche", email: "julien.roche@thermiclim-services.fr" },
    subject: "Your account has been compromised",
    body: [
      "Hello,",
      "As you may have noticed, I sent this email from your own account. I have had access to your devices for several months through malware I installed when you visited one of your favourite websites.",
      "I recorded you through your webcam, along with the sites you were watching. If you don't want this video sent to all your contacts and colleagues, transfer $1,350 in Bitcoin to the address below within 48 hours.",
      "BTC: bc1q7m3xk2v9fz0u8h5w4c6l1e2r9t0y3a7s5d8f2g",
      "Don't try to reply or go to the police, I will know. After payment I will delete everything and you will never hear from me again."
    ],
    unsub: false, vip: false } },

  { expect: 'junk', m: {
    from: { name: "Mathilde Rousseau", email: "m.rousseau@patrimoine-placements-securises.com" },
    subject: "Livret à 7,5 % garanti – il reste 3 places",
    body: [
      "Bonjour,",
      "Suite à votre demande d'information, je me permets de revenir vers vous concernant notre livret d'épargne à taux garanti de 7,5 % par an, sans frais et disponible à tout moment.",
      "Ce placement, réservé à un nombre limité d'épargnants, est garanti par un établissement bancaire européen. Il ne reste que 3 places pour la souscription de ce mois-ci, à partir de 5 000 €.",
      "Je peux vous rappeler aujourd'hui pour finaliser l'ouverture de votre compte en 10 minutes. Répondez-moi simplement avec votre numéro de téléphone et le montant que vous souhaitez placer.",
      "Bien à vous,",
      "Mathilde Rousseau – Conseillère patrimoniale"
    ],
    unsub: false, vip: false } },

  { expect: 'junk', m: {
    from: { name: "Colissimo", email: "suivi@colissimo-livraison-fr.info" },
    subject: "Votre colis n'a pas pu être livré",
    body: [
      "Bonjour,",
      "Votre colis n° 6A28461937510 n'a pas pu être livré ce jour car l'adresse est incomplète.",
      "Pour programmer une nouvelle livraison, merci de confirmer votre adresse et de régler les frais de réexpédition de 1,99 €.",
      "Programmer ma livraison",
      "Sans action de votre part sous 48h, le colis sera retourné à l'expéditeur."
    ],
    unsub: false, vip: false } },

  { expect: 'junk', m: {
    from: { name: "ENGIE", email: "service-client@engie-remboursement.com" },
    subject: "Trop-perçu sur votre contrat : 213,08 € à récupérer",
    body: [
      "Cher client,",
      "Suite à la régularisation annuelle de votre contrat d'énergie, nous avons constaté un trop-perçu de 213,08 € en votre faveur.",
      "Votre remboursement n'a pas pu être effectué car vos coordonnées bancaires ne sont plus valides. Veuillez les mettre à jour via le formulaire sécurisé ci-dessous.",
      "Recevoir mon remboursement",
      "Cordialement,",
      "Le Service Client ENGIE"
    ],
    unsub: false, vip: false } },

  { expect: 'junk', m: {
    from: { name: "Meta Business Support", email: "support@meta-business-appeals.com" },
    subject: "Your Facebook Page will be permanently deleted",
    body: [
      "Dear Page Owner,",
      "We have received a report that your Page “Thermiclim Services” violates our intellectual property policies. Your Page and associated ad account have been scheduled for permanent deletion.",
      "If you believe this is a mistake, you can submit an appeal within 24 hours. After this period, your Page cannot be restored.",
      "Submit Appeal",
      "Meta Platforms, Inc. – Case #4471-209-8834"
    ],
    unsub: false, vip: false } }
];
