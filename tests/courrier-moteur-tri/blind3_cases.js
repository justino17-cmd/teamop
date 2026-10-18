module.exports = [
  { expect: 'principal', m: {
    from: { name: "Sébastien Morel", email: "morel.plomberie56@orange.fr" },
    subject: "Facture intervention chauffe-eau + petite remarque",
    body: [
      "Bonjour Madame Guillou,",
      "Je vous joins la facture pour l'intervention de mardi sur le chauffe-eau : 348 € TTC, pièces comprises (groupe de sécurité et anode). Vous pouvez me régler par virement ou par chèque à l'ordre de Morel Plomberie, comme vous préférez, il n'y a pas d'urgence.",
      "Par contre en partant j'ai remarqué que le joint sous l'évier de la cuisine suinte un peu. Rien de grave, mais si vous voulez je repasse le changer quand je suis dans le coin la semaine prochaine, ça prendra dix minutes.",
      "Bonne journée, Sébastien Morel"
    ],
    unsub: false, vip: false } },
  { expect: 'principal', m: {
    from: { name: "Nadia Ferreira", email: "n.ferreira@groupe-arvor.fr" },
    subject: "URGENT - mot de passe du compte Canva partagé",
    body: [
      "Salut Justin,",
      "Désolée de te harceler, mais je dois envoyer les visuels du salon à l'imprimeur avant 16h et je n'arrive plus à me connecter au compte Canva de l'équipe. Je crois que Romain a changé le mot de passe vendredi sans prévenir personne.",
      "Tu l'as noté quelque part ? Si oui, envoie-le-moi plutôt sur Teams que par mail, je préfère. Sinon je demande à Romain quand il sort de sa réunion.",
      "Merci mille fois, Nadia"
    ],
    unsub: false, vip: false } },
  { expect: 'principal', m: {
    from: { name: "Élodie Marchand", email: "elo.marchand@gmail.com" },
    subject: "code promo Decathlon pour le vélo de Léo",
    body: [
      "Coucou !",
      "Je viens de voir passer un code à -15 % chez Decathlon sur les vélos enfants, valable jusqu'à dimanche : RENTREE15 je crois. Ça tombe bien vu que tu cherchais un 20 pouces pour Léo. Celui qu'on a pris pour Jules est top, il ne l'a pas lâché de l'été.",
      "Par contre vérifie en magasin, sur le site il était en rupture à Lorient hier soir.",
      "Bisous, et on se voit samedi pour l'anniv ? Élo"
    ],
    unsub: false, vip: false } },
  { expect: 'principal', m: {
    from: { name: "Gaëlle Le Floch", email: "gaelle.le-floch@ac-rennes.fr" },
    subject: "Sortie à Océanopolis - participation des familles",
    body: [
      "Bonjour à tous,",
      "Comme annoncé à la réunion de rentrée, la classe de CE2 ira à Océanopolis le jeudi 19 novembre. Le car et l'entrée sont en grande partie financés par l'APE, il reste une participation de 12 € par enfant.",
      "Merci de mettre la somme dans une enveloppe au nom de votre enfant (chèque à l'ordre de la coopérative scolaire ou espèces) avant le 6 novembre. Si cela pose une difficulté, n'hésitez surtout pas à venir m'en parler, on trouvera une solution.",
      "Je cherche aussi deux parents accompagnateurs : faites-moi signe par retour de mail.",
      "Bien cordialement, Gaëlle Le Floch, enseignante de CE2, école Jules-Ferry"
    ],
    unsub: false, vip: false } },
  { expect: 'principal', m: {
    from: { name: "Valérie Jaouen", email: "v.jaouen@cabinet-jaouen.fr" },
    subject: "Pièces manquantes pour la clôture de votre exercice",
    body: [
      "Bonjour Monsieur Rivière,",
      "En préparant la clôture de votre exercice au 30 septembre, il me manque encore quelques justificatifs : les factures Boulanger et Fnac du mois de mars (environ 1 840 € au total, je suppose pour le matériel informatique ?) et le relevé Sumup de juin.",
      "Sans ces pièces je serai obligée de passer ces dépenses en compte d'attente, ce qui bloquera la récupération de la TVA correspondante. L'idéal serait de me les déposer sur l'espace partagé d'ici le 31 octobre.",
      "Je reste disponible si vous préférez qu'on en parle par téléphone.",
      "Valérie Jaouen, expert-comptable, Cabinet Jaouen & Associés"
    ],
    unsub: false, vip: false } },
  { expect: 'principal', m: {
    from: { name: "Maman", email: "christiane.rolland@laposte.net" },
    subject: "Noël à Quimper",
    body: [
      "Mon chéri,",
      "Ton père et moi avons regardé les trains pour venir à Noël. Il y a un TGV direct Paris-Quimper le 23 à 10h04, arrivée 14h40, à 49 € avec la carte Avantage Senior. Qu'est-ce que tu en dis ? On pourrait arriver avant que les enfants sortent de l'école.",
      "Je n'ai pas encore réservé parce que je ne sais jamais si je me trompe de gare à Paris. Si tu as cinq minutes ce week-end, tu pourrais le faire pour nous ? Je te rembourse évidemment.",
      "On t'embrasse fort tous les deux, Maman"
    ],
    unsub: false, vip: false } },
  { expect: 'principal', m: {
    from: { name: "Gérard Pichon", email: "gerard.pichon29@yahoo.fr" },
    subject: "La haie entre nos deux jardins",
    body: [
      "Bonsoir Monsieur Tanguy,",
      "Je me permets de vous écrire au sujet de la haie de thuyas. Elle commence à faire de l'ombre sur mon potager et je pensais la faire tailler par l'entreprise Kerjean, qui doit passer chez moi le 12 novembre.",
      "Si vous êtes d'accord, ils pourraient faire les deux côtés en même temps et nous partagerions la facture, ce serait plus simple pour tout le monde. Passez me voir quand vous voulez pour en discuter, je suis presque toujours là l'après-midi.",
      "Bien cordialement, Gérard Pichon (le n° 14)"
    ],
    unsub: false, vip: false } },
  { expect: 'principal', m: {
    from: { name: "Hannah Clarke", email: "hannah.clarke@tidewater-studio.co.uk" },
    subject: "Quick question on invoice FA-2026-118",
    body: [
      "Hi Justin,",
      "Thanks for sending the invoice over. Our finance team flagged that it shows 2,450 EUR excl. VAT, but the quote we signed in July was 2,250. I assume the difference is the extra round of revisions on the brochure? If so, no problem at all, I just need a line on the invoice that says so before they can approve it.",
      "Could you send an updated version when you get a chance? Our payment run is on the 28th, so anything before then is perfect.",
      "Cheers, Hannah"
    ],
    unsub: false, vip: false } },
  { expect: 'principal', m: {
    from: { name: "Maître Hélène Garnier", email: "h.garnier@garnier-avocats.fr" },
    subject: "Votre dossier prud'homal - point d'étape et pièces à fournir avant vendredi",
    body: [
      "Madame,",
      "Je reviens vers vous suite à l'audience de conciliation. Comme je le craignais, aucun accord n'a été trouvé et l'affaire est renvoyée devant le bureau de jugement. La partie adverse a par ailleurs demandé la suspension de l'exécution provisoire, ce qui ne change rien pour vous à ce stade.",
      "En revanche, j'ai besoin de toute urgence de vos trois derniers bulletins de salaire et de l'attestation France Travail pour compléter nos conclusions, idéalement avant vendredi midi.",
      "Je vous propose un rendez-vous téléphonique lundi à 18h pour faire le point ; dites-moi si cela vous convient.",
      "Bien à vous, Hélène Garnier, avocate au barreau de Rennes"
    ],
    unsub: false, vip: false } },
  { expect: 'principal', m: {
    from: { name: "Marco Bellini", email: "m.bellini@bellini-packaging.it" },
    subject: "Re: pallets for week 46",
    body: [
      "Hello Justin,",
      "Just a heads-up: our truck to Brittany is now leaving Verona on Monday the 9th instead of Friday, so your six pallets of boxes should reach Lorient on Thursday the 12th rather than Tuesday. Sorry about that, the driver had a scheduling issue.",
      "If that's a problem for your production, tell me and I'll try to split the order and send two pallets by express, at our cost of course.",
      "Best regards, Marco"
    ],
    unsub: false, vip: false } },
  { expect: 'principal', m: {
    from: { name: "Garage Dupont", email: "garage.dupont.ploermel@wanadoo.fr" },
    subject: "Votre Clio",
    body: [
      "Bonjour Monsieur Lefèvre,",
      "C'est Thierry du garage. La Clio est prête, vous pouvez passer la récupérer à partir de 17h. On a fait la vidange et changé les plaquettes avant comme prévu ; les disques sont encore bons, pas la peine d'y toucher cette fois.",
      "Ça fait 286,40 € en tout, vous réglerez sur place. Par contre j'ai vu que le contrôle technique est à faire avant fin décembre, si vous voulez je vous le cale en même temps que le changement de pneus.",
      "À tout à l'heure, Thierry"
    ],
    unsub: false, vip: false } },
  { expect: 'principal', m: {
    from: { name: "Claire - Atelier Lune", email: "bonjour@atelier-lune-ceramique.fr" },
    subject: "Votre commande de bols - je suis désolée !",
    body: [
      "Bonjour Julie,",
      "Je vous écris personnellement parce que votre commande (les quatre bols bleu nuit) a pris du retard : une partie de la fournée a craqué au four la semaine dernière et j'ai préféré tout refaire plutôt que de vous envoyer des pièces abîmées.",
      "Ils seront prêts autour du 30 octobre. Si c'est trop tard pour l'anniversaire dont vous me parliez, dites-le-moi et je vous rembourse sans souci, ou je peux vous envoyer en attendant le pichet que vous aviez repéré.",
      "Encore désolée, belle journée à vous, Claire"
    ],
    unsub: false, vip: false } },

  { expect: 'notif', m: {
    from: { name: "Caisse d'Epargne", email: "ne-pas-repondre@caisse-epargne.fr" },
    subject: "Votre relevé de compte est disponible",
    body: [
      "Bonjour,",
      "Votre relevé de compte du mois de septembre 2026 est disponible dans votre Espace Client, rubrique « Mes documents ».",
      "Pour le consulter, connectez-vous depuis l'application Caisse d'Epargne ou le site caisse-epargne.fr. Nous ne vous demanderons jamais vos codes par e-mail.",
      "Ceci est un message automatique, merci de ne pas y répondre."
    ],
    unsub: false, vip: false } },
  { expect: 'notif', m: {
    from: { name: "Marion Petit (via Google Drive)", email: "drive-shares-dm-noreply@google.com" },
    subject: "Dossier partagé avec vous : « Devis cuisine - comparatif »",
    body: [
      "Marion Petit (marion.petit.archi@gmail.com) vous a invité à modifier le dossier suivant :",
      "Devis cuisine - comparatif",
      "« Voilà les trois devis qu'on a reçus, j'ai surligné les écarts en jaune. Dis-moi ce que tu en penses avant jeudi ! »",
      "Ouvrir",
      "Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA. Vous avez reçu cet e-mail, car Marion Petit a partagé un dossier avec vous depuis Google Drive."
    ],
    unsub: false, vip: false } },
  { expect: 'notif', m: {
    from: { name: "Slack", email: "notification@slack.com" },
    subject: "[Slack] New mentions in Kerlann Studio",
    body: [
      "Hi Justin, you have 3 new mentions in the Kerlann Studio workspace.",
      "#compta-2026 - Sophie Le Goff: @Justin can you check the Shopify payout from Tuesday? Looks like 2 orders are missing.",
      "#general - Yann: @Justin are you joining the call at 2?",
      "Open Slack",
      "You're receiving this email because you have email notifications turned on. Change your notification settings."
    ],
    unsub: true, vip: false } },
  { expect: 'notif', m: {
    from: { name: "Thomas Rioual (Jira)", email: "jira@kerlann.atlassian.net" },
    subject: "[JIRA] (OPS-482) Paiements Sumup bloqués en boutique",
    body: [
      "Thomas Rioual a mis à jour un ticket.",
      "Statut : En cours → En attente du client",
      "Commentaire : J'ai relancé le support Sumup, ils demandent le numéro de série du terminal et une capture de l'erreur. Est-ce que quelqu'un sur place peut s'en occuper ?",
      "Afficher le ticket · Ajouter un commentaire",
      "Vous recevez ce message car vous suivez ce ticket. Gérer vos préférences de notification."
    ],
    unsub: true, vip: false } },
  { expect: 'notif', m: {
    from: { name: "Boulanger", email: "suivi-commande@boulanger.com" },
    subject: "Votre lave-linge sera livré demain entre 8h et 12h",
    body: [
      "Bonjour Monsieur Rivière,",
      "Bonne nouvelle : votre commande n° 50471882 (lave-linge hublot Bosch Série 6) sera livrée demain, samedi 24 octobre, entre 8h et 12h. Le livreur vous appellera environ 30 minutes avant son arrivée.",
      "Pensez à libérer l'accès jusqu'à la pièce d'installation. Si vous avez choisi la reprise de votre ancien appareil, il doit être débranché et vidé.",
      "Suivre ma livraison",
      "Pour toute question, rendez-vous dans votre espace client, rubrique « Mes commandes »."
    ],
    unsub: false, vip: false } },
  { expect: 'notif', m: {
    from: { name: "Mairie de Vannes - Rendez-vous", email: "rdv-titres@mairie-vannes.fr" },
    subject: "Rappel : votre rendez-vous carte d'identité le 21/10 à 14h15",
    body: [
      "Bonjour,",
      "Nous vous rappelons votre rendez-vous pour une demande de carte nationale d'identité le mercredi 21 octobre 2026 à 14h15, à l'Hôtel de Ville, guichet Titres d'identité (rez-de-chaussée).",
      "Munissez-vous de votre numéro de pré-demande ANTS, d'une photo d'identité de moins de six mois, d'un justificatif de domicile et de votre ancienne carte. Toute personne en retard de plus de 10 minutes devra reprendre rendez-vous.",
      "Pour annuler ou modifier votre rendez-vous, utilisez le lien présent dans votre e-mail de confirmation."
    ],
    unsub: false, vip: false } },
  { expect: 'notif', m: {
    from: { name: "France Travail", email: "ne-pas-repondre@francetravail.fr" },
    subject: "Un nouveau document est disponible dans votre espace",
    body: [
      "Bonjour,",
      "Un nouveau courrier a été déposé dans votre espace personnel le 16/10/2026 : « Notification de décision relative à votre allocation ».",
      "Pour le consulter, connectez-vous à votre espace sur francetravail.fr ou dans l'application France Travail, rubrique « Mes échanges ».",
      "Cet e-mail est envoyé automatiquement. France Travail ne vous demandera jamais vos coordonnées bancaires ou votre mot de passe par e-mail ou SMS."
    ],
    unsub: false, vip: false } },
  { expect: 'notif', m: {
    from: { name: "MAIF", email: "nepasrepondre@maif.fr" },
    subject: "Votre attestation d'assurance habitation 2027 est disponible",
    body: [
      "Bonjour Justin,",
      "Votre attestation d'assurance habitation pour la période du 1er janvier au 31 décembre 2027 est désormais disponible dans votre espace personnel, rubrique « Mes documents ».",
      "Vous pouvez la télécharger à tout moment, par exemple pour la transmettre à votre propriétaire ou à votre syndic.",
      "Accéder à mon espace",
      "MAIF - Société d'assurance mutuelle à cotisations variables - 79038 Niort cedex 9"
    ],
    unsub: false, vip: false } },
  { expect: 'notif', m: {
    from: { name: "Trello", email: "do-not-reply@trello.com" },
    subject: "Lucas Bernard a commenté la carte « Relance factures impayées »",
    body: [
      "Lucas Bernard a commenté la carte Relance factures impayées dans le tableau Admin & compta :",
      "« @justin j'ai relancé Kervran et Le Bihan, il reste la facture de 1 200 € de Tidewater. Tu t'en occupes ou je leur écris ? »",
      "Répondre",
      "Vous recevez ce message car vous êtes membre de cette carte. Modifier les paramètres de notification · Se désabonner"
    ],
    unsub: true, vip: false } },
  { expect: 'notif', m: {
    from: { name: "SFR", email: "securite@sfr.fr" },
    subject: "Nouvelle connexion à votre Espace Client SFR",
    body: [
      "Bonjour,",
      "Une connexion à votre Espace Client a été effectuée le 17/10/2026 à 08h52 depuis un appareil Android (Chrome), localisation approximative : Rennes, France.",
      "Si vous êtes à l'origine de cette connexion, vous n'avez rien à faire. Sinon, nous vous recommandons de modifier immédiatement votre mot de passe depuis l'application SFR & Moi, rubrique Compte > Sécurité, et non via un lien reçu par e-mail ou SMS.",
      "L'équipe SFR"
    ],
    unsub: false, vip: false } },
  { expect: 'notif', m: {
    from: { name: "Hélène Garnier via DocuSign", email: "dse@eumail.docusign.net" },
    subject: "Please DocuSign: Convention d'honoraires - Dossier Rivière",
    body: [
      "Hélène Garnier sent you a document to review and sign.",
      "REVIEW DOCUMENT",
      "Hélène Garnier (h.garnier@garnier-avocats.fr): « Bonjour, voici la convention d'honoraires dont nous avons parlé. Bonne réception. »",
      "Do Not Share This Email: This email contains a secure link to DocuSign. Please do not share this email, link, or access code with others.",
      "About DocuSign: Sign documents electronically in just minutes. It's safe, secure, and legally binding."
    ],
    unsub: false, vip: false } },
  { expect: 'notif', m: {
    from: { name: "PayFit", email: "no-reply@payfit.com" },
    subject: "Ta fiche de paie d'octobre est là, Justin !",
    body: [
      "Hello Justin,",
      "Bonne nouvelle, ta fiche de paie d'octobre 2026 vient d'être publiée par Kerlann Studio. Tu peux la consulter et la télécharger dès maintenant depuis ton espace salarié.",
      "Petit rappel : tes bulletins restent disponibles sur PayFit pendant 50 ans, même si tu changes d'entreprise.",
      "Voir ma fiche de paie",
      "À très vite, l'équipe PayFit"
    ],
    unsub: false, vip: false } },

  { expect: 'recus', m: {
    from: { name: "Fnac.com", email: "commande@fnac.com" },
    subject: "Confirmation de votre commande n° 2Y7KQ84DM",
    body: [
      "Bonjour Justin,",
      "Merci pour votre commande du 16/10/2026. Récapitulatif : Casque Sony WH-CH720N noir, 89,99 € ; livraison en point retrait, 0,00 €. Total payé par carte bancaire : 89,99 € TTC.",
      "Vous recevrez un e-mail dès que votre colis sera disponible au point retrait choisi (Fnac Lorient Centre).",
      "Pas encore adhérent ? Profitez de 10 % offerts sur les livres et de la livraison gratuite illimitée. Découvrir le programme.",
      "Fnac Darty Participations et Services - Service client"
    ],
    unsub: false, vip: false } },
  { expect: 'recus', m: {
    from: { name: "Le Fournil de Léa", email: "no-reply@sumup.com" },
    subject: "Votre reçu de Le Fournil de Léa",
    body: [
      "Merci pour votre achat !",
      "Le Fournil de Léa - 3 rue du Port, 56100 Lorient",
      "1 x Kouign-amann 6 parts : 9,80 € ; 2 x Baguette tradition : 2,60 € ; 1 x Flan pâtissier (part) : 2,20 €. Total : 14,60 € (dont TVA 5,5 % : 0,76 €)",
      "Payé par carte Visa •••• 4417 le 17/10/2026 à 09:14. Transaction n° TDQ8F2LXA",
      "Reçu émis via SumUp. Une question sur votre achat ? Contactez directement le commerçant."
    ],
    unsub: false, vip: false } },
  { expect: 'recus', m: {
    from: { name: "Bouygues Telecom", email: "facture@bouyguestelecom.fr" },
    subject: "Votre facture Bbox d'octobre : 42,99 €",
    body: [
      "Bonjour,",
      "Votre facture du 15/10/2026 pour votre offre Bbox Fit est disponible. Montant : 42,99 € TTC.",
      "Ce montant sera prélevé sur votre compte bancaire à partir du 25/10/2026. Vous n'avez aucune démarche à effectuer.",
      "Retrouvez le détail de votre facture dans votre Espace Client ou dans l'application Bouygues Telecom."
    ],
    unsub: false, vip: false } },
  { expect: 'recus', m: {
    from: { name: "Shopify", email: "billing@shopify.com" },
    subject: "Your Shopify bill for Kerlann Studio Shop has been paid",
    body: [
      "Hi Justin,",
      "Thanks for your payment. We've charged USD 39.00 to your Mastercard ending in 2291 for your Shopify Basic plan (Oct 12 - Nov 11, 2026).",
      "Bill #418829317 · Subscription: 39.00 · Apps: 0.00 · Taxes: 0.00 · Total: 39.00 USD",
      "You can view and download your bills at any time from Settings > Billing in your Shopify admin.",
      "Shopify International Limited, Dublin, Ireland"
    ],
    unsub: false, vip: false } },
  { expect: 'recus', m: {
    from: { name: "Canva", email: "billing@canva.com" },
    subject: "Your Canva Pro subscription has been renewed",
    body: [
      "Hi Justin,",
      "Your Canva Pro yearly subscription has renewed successfully. Here's your receipt.",
      "Invoice #04123-88731 · Canva Pro (1 person), 12 months · €119.99 VAT included · Paid with Visa ending 4417 on 15 October 2026",
      "Need to make changes? You can manage your plan or turn off auto-renewal from Account settings > Billing & plans.",
      "Canva Pty Ltd, 110 Kippax Street, Surry Hills NSW 2010, Australia"
    ],
    unsub: false, vip: false } },
  { expect: 'recus', m: {
    from: { name: "Decathlon", email: "noreply@decathlon.fr" },
    subject: "Votre remboursement de 34,99 € a été effectué",
    body: [
      "Bonjour Justin,",
      "Nous avons bien reçu votre retour pour l'article : veste imperméable de randonnée MH500 homme, taille L.",
      "Le remboursement de 34,99 € a été effectué ce jour sur le moyen de paiement utilisé lors de la commande (carte se terminant par 4417). Selon votre banque, il peut apparaître sur votre compte sous 3 à 5 jours ouvrés.",
      "Merci de votre confiance, l'équipe Decathlon"
    ],
    unsub: false, vip: false } },
  { expect: 'recus', m: {
    from: { name: "Lidl Plus", email: "ticket@lidlplus.fr" },
    subject: "Votre ticket de caisse du 15/10 - Lidl Lanester",
    body: [
      "Bonjour Justin,",
      "Voici votre ticket de caisse dématérialisé pour votre passage chez Lidl Lanester le 15/10/2026 à 18:42. Montant total : 63,12 €, payé par CB. Vous avez économisé 4,35 € grâce à vos coupons Lidl Plus.",
      "Le détail de vos 23 articles est disponible dans l'application, rubrique « Tickets ».",
      "Cette semaine dans l'appli : -30 % sur le rayon boucherie et un coupon de 5 € dès 50 € d'achats. Activez vos coupons avant votre prochain passage !"
    ],
    unsub: true, vip: false } },
  { expect: 'recus', m: {
    from: { name: "AXA", email: "contrats@axa.fr" },
    subject: "Confirmation de prélèvement - cotisation auto",
    body: [
      "Bonjour Monsieur Rivière,",
      "Nous vous confirmons le prélèvement de votre cotisation mensuelle d'assurance automobile (contrat n° 0000917735504, Renault Clio IV) d'un montant de 58,30 €, effectué le 05/10/2026 sur votre compte se terminant par 0841.",
      "Votre prochaine échéance de 58,30 € sera prélevée le 05/11/2026.",
      "Votre avis d'échéance et vos documents contractuels sont disponibles dans votre Espace Client AXA."
    ],
    unsub: false, vip: false } },
  { expect: 'recus', m: {
    from: { name: "Vinted", email: "no-reply@vinted.fr" },
    subject: "C'est réglé ! Merci pour ton achat",
    body: [
      "Salut Justin,",
      "Ton paiement est bien passé, merci ! Voici ton reçu pour la commande « Veste en jean Levi's taille M » vendue par marie_kz.",
      "Prix de l'article : 15,00 € · Protection acheteurs : 1,45 € · Livraison Mondial Relay : 2,99 € · Total payé : 19,44 €",
      "marie_kz a maintenant 5 jours pour expédier ton colis. On te tient au courant !"
    ],
    unsub: false, vip: false } },
  { expect: 'recus', m: {
    from: { name: "Garage Morin Auto", email: "receipts+acct_1PqX7mLd@stripe.com" },
    subject: "Votre reçu de Garage Morin Auto [n° 2381-6640]",
    body: [
      "Garage Morin Auto",
      "Reçu n° 2381-6640 · Montant payé : 412,80 € · Date de paiement : 14 octobre 2026 · Moyen de paiement : Mastercard - 2291",
      "Résumé : remplacement kit distribution + pompe à eau (Peugeot 308), 412,80 € TTC",
      "Pour toute question, contactez Garage Morin Auto à l'adresse contact@garagemorin-auray.fr.",
      "Vous recevez cet e-mail car vous avez effectué un achat auprès de Garage Morin Auto, qui s'est associé à Stripe pour le traitement des paiements."
    ],
    unsub: false, vip: false } },
  { expect: 'recus', m: {
    from: { name: "Temu", email: "orders@order.temu.com" },
    subject: "Commande confirmée : PO-211-08471936502930",
    body: [
      "Merci pour votre commande !",
      "5 articles · Sous-total : 31,47 € · Livraison : gratuite · Remise : -6,20 € · Total payé : 25,27 € (PayPal)",
      "Livraison estimée entre le 24 oct. et le 2 nov. Vous recevrez un e-mail lors de l'expédition.",
      "Encore plus d'économies : jusqu'à -70 % sur la sélection automne, et un coupon de 10 € offert sur votre prochaine commande dès 39 €. J'en profite",
      "Vous ne souhaitez plus recevoir nos e-mails promotionnels ? Se désabonner."
    ],
    unsub: true, vip: false } },
  { expect: 'recus', m: {
    from: { name: "PayByPhone", email: "no-reply@paybyphone.com" },
    subject: "Reçu de stationnement - Ville de Lorient",
    body: [
      "Bonjour,",
      "Merci d'avoir utilisé PayByPhone. Voici le reçu de votre session de stationnement.",
      "Ville de Lorient · Zone 56100-2 (Centre-ville) · Véhicule : GH-482-PL · Du 16/10/2026 14:05 au 16/10/2026 16:05 · Montant : 3,20 € (dont frais de service : 0,00 €)",
      "Payé par Visa •••• 4417. Ce reçu tient lieu de justificatif de paiement."
    ],
    unsub: false, vip: false } },

  { expect: 'voyages', m: {
    from: { name: "SNCF Connect", email: "confirmation@sncf-connect.com" },
    subject: "Votre e-billet pour Vannes le 24 octobre",
    body: [
      "Bonjour Justin,",
      "Votre voyage est confirmé. Aller : samedi 24 octobre 2026, Paris Montparnasse 08h52 → Vannes 11h41, TGV INOUI n° 8721, voiture 14, place 62.",
      "Référence de dossier : QZTXBM. Votre e-billet est disponible dans l'application SNCF Connect et en pièce jointe. Présentez-le lors du contrôle avec une pièce d'identité.",
      "Bon voyage !"
    ],
    unsub: false, vip: false } },
  { expect: 'voyages', m: {
    from: { name: "SNCF Voyageurs", email: "info-trafic@sncf.fr" },
    subject: "Modification de votre train du 24/10 : nouvel horaire de départ",
    body: [
      "Bonjour,",
      "En raison de travaux sur la ligne, l'horaire de votre TGV INOUI n° 8721 du samedi 24 octobre est modifié : départ de Paris Montparnasse à 09h06 (au lieu de 08h52), arrivée à Vannes à 12h05 (au lieu de 11h41).",
      "Votre placement reste inchangé (voiture 14, place 62). Si ce nouvel horaire ne vous convient pas, vous pouvez échanger ou annuler votre billet sans frais jusqu'au départ, dans l'application SNCF Connect.",
      "Nous vous prions de nous excuser pour la gêne occasionnée."
    ],
    unsub: false, vip: false } },
  { expect: 'voyages', m: {
    from: { name: "Corsair", email: "noreply@flycorsair.com" },
    subject: "L'enregistrement en ligne est ouvert pour votre vol SS 914",
    body: [
      "Bonjour Monsieur Rivière,",
      "Votre vol SS 914 Paris Orly → Pointe-à-Pitre décolle demain, dimanche 18 octobre 2026. L'enregistrement en ligne est désormais ouvert.",
      "Réservation : 7HKP2L · Départ : 10h35 depuis Orly 4 · Passagers : 2 adultes, 1 enfant",
      "Enregistrez-vous dès maintenant pour choisir vos sièges et recevoir vos cartes d'embarquement. Le dépôt des bagages ferme 60 minutes avant le départ.",
      "Je m'enregistre"
    ],
    unsub: false, vip: false } },
  { expect: 'voyages', m: {
    from: { name: "Brittany Ferries", email: "reservations@brittany-ferries.fr" },
    subject: "Confirmation de réservation n° 6182734 - Roscoff → Plymouth",
    body: [
      "Bonjour Monsieur Rivière,",
      "Merci d'avoir choisi Brittany Ferries. Votre réservation est confirmée.",
      "Aller : vendredi 13 novembre 2026, Roscoff 15h00 → Plymouth 20h00 (heure locale), navire Armorique. Retour : lundi 16 novembre 2026, Plymouth 08h00 → Roscoff 14h00. Véhicule : voiture de moins de 1,85 m, 2 passagers, cabine intérieure 2 couchettes au retour.",
      "Montant total réglé : 386,00 €. Présentez-vous à l'enregistrement au plus tard 45 minutes avant le départ, muni de votre passeport en cours de validité et de votre autorisation de voyage électronique (ETA) pour le Royaume-Uni."
    ],
    unsub: false, vip: false } },
  { expect: 'voyages', m: {
    from: { name: "Camping Les Dunes d'Erdeven", email: "reservation@camping-dunes-erdeven.fr" },
    subject: "Votre séjour est confirmé - mobil-home Océan du 3 au 10 juillet 2027",
    body: [
      "Bonjour Justin,",
      "Nous avons le plaisir de vous confirmer votre réservation : mobil-home Océan 3 chambres (6 personnes), du samedi 3 juillet 2027 (arrivée à partir de 16h) au samedi 10 juillet 2027 (départ avant 10h).",
      "Acompte réglé : 250,00 € sur un total de 1 045,00 €. Le solde de 795,00 € sera à régler au plus tard 30 jours avant votre arrivée, depuis votre espace client.",
      "Toute l'équipe du camping se réjouit de vous accueillir l'été prochain !"
    ],
    unsub: false, vip: false } },
  { expect: 'voyages', m: {
    from: { name: "Gîtes de France Finistère", email: "noreply@gites-de-france.com" },
    subject: "Annick et Paul vous attendent vendredi à Huelgoat !",
    body: [
      "Bonjour Justin,",
      "Votre séjour au gîte « Ty Koad » à Huelgoat approche ! Annick et Paul, vos propriétaires, vous accueilleront le vendredi 23 octobre à partir de 17h.",
      "Adresse : 4 hameau de Kerampuil, 29690 Huelgoat. Le code du portail et les consignes d'arrivée vous seront transmis la veille par SMS. Les draps et le linge de toilette sont fournis ; le bois pour la cheminée est en vente sur place.",
      "Nous vous souhaitons un très bon séjour en Finistère !",
      "Ceci est un message automatique envoyé par Gîtes de France. Pour toute question, contactez vos propriétaires depuis votre espace réservation."
    ],
    unsub: false, vip: false } },
  { expect: 'voyages', m: {
    from: { name: "Getaround", email: "no-reply@getaround.com" },
    subject: "C'est confirmé : la Peugeot 208 de Mathieu est à vous samedi",
    body: [
      "Bonjour Justin,",
      "Mathieu a accepté votre demande ! Votre location est confirmée : Peugeot 208 (2021), du samedi 31 octobre à 9h00 au dimanche 1er novembre à 19h00, prise en charge au 18 rue de Siam, Brest.",
      "Avant le départ, vous devrez réaliser l'état des lieux dans l'application avec Mathieu (photos des 4 côtés du véhicule et du compteur). L'assurance et l'assistance sont incluses.",
      "Bonne route ! L'équipe Getaround"
    ],
    unsub: false, vip: false } },
  { expect: 'voyages', m: {
    from: { name: "FlixBus", email: "noreply@booking.flixbus.com" },
    subject: "Your booking confirmation #3017 448 512",
    body: [
      "Hi Justin,",
      "Thanks for travelling with FlixBus! Here are your trip details.",
      "Nantes (Gare routière Sud) → Bordeaux (Saint-Jean, Paludate) · Friday, 6 November 2026 · Departure 07:15 · Arrival 11:50 · 1 adult · Seat 12C",
      "Your ticket is attached as a PDF and is also available in the FlixBus app. Please be at the stop 15 minutes before departure with a valid ID."
    ],
    unsub: false, vip: false } },
  { expect: 'voyages', m: {
    from: { name: "easyJet", email: "noreply@easyjet.com" },
    subject: "Your boarding pass for Nantes to Edinburgh",
    body: [
      "Hi Justin,",
      "You're checked in! Your boarding pass for flight EZY4431 is attached and saved in the easyJet app.",
      "Nantes (NTE) → Edinburgh (EDI) · Thursday 29 October 2026 · Departs 12:40 · Booking reference K7RQ2MN",
      "Bag drop closes 40 minutes before departure and the gate closes 30 minutes before. Don't forget your passport."
    ],
    unsub: false, vip: false } },
  { expect: 'voyages', m: {
    from: { name: "Transavia", email: "service@transavia.com" },
    subject: "Annulation de votre vol TO 3412 du 2 novembre",
    body: [
      "Bonjour Monsieur Rivière,",
      "Nous sommes au regret de vous informer que votre vol TO 3412 Nantes → Porto du lundi 2 novembre 2026 (départ 06h45) a été annulé pour des raisons opérationnelles.",
      "Nous vous proposons sans frais une place sur le vol TO 3416 du même jour, départ 17h20. Vous pouvez aussi choisir un autre vol jusqu'à 7 jours plus tard, ou demander le remboursement intégral de votre billet (189,98 €) depuis la rubrique « Gérer ma réservation ».",
      "Réservation : PQ8XZK. Nous vous prions de nous excuser pour ce désagrément."
    ],
    unsub: false, vip: false } },
  { expect: 'voyages', m: {
    from: { name: "OUIGO", email: "bonjour@ouigo.com" },
    subject: "J-2 : on a hâte de vous voir à bord !",
    body: [
      "Coucou Justin !",
      "Plus que deux dodos avant votre voyage Paris Gare de Lyon → Marseille Saint-Charles, le lundi 19 octobre 2026. Départ 07h12, voiture 5, places 41 et 42.",
      "Petit rappel : chez OUIGO, l'embarquement ferme 30 minutes avant le départ. On vous conseille d'arriver un peu plus tôt, surtout avec vos bagages.",
      "Votre billet est disponible dans l'appli et dans votre espace client. Bon voyage, l'équipe OUIGO"
    ],
    unsub: false, vip: false } },
  { expect: 'voyages', m: {
    from: { name: "Hôtel Ker Moor", email: "reservation@hotel-kermoor.fr" },
    subject: "Votre séjour approche - Hôtel Ker Moor, Saint-Quay-Portrieux",
    body: [
      "Chère Madame, cher Monsieur,",
      "Nous avons le plaisir de vous rappeler votre réservation n° KM-26-1187 : chambre double vue mer, du vendredi 30 octobre au dimanche 1er novembre 2026 (2 nuits), petit-déjeuner inclus.",
      "La réception est ouverte de 7h à 22h ; en cas d'arrivée tardive, un code d'accès vous sera envoyé le jour même. Le parking privé est gratuit pour nos clients.",
      "Au plaisir de vous accueillir, la réception de l'Hôtel Ker Moor",
      "Ce message vous est adressé automatiquement suite à votre réservation sur notre site."
    ],
    unsub: false, vip: false } },

  { expect: 'promos', m: {
    from: { name: "Boulanger", email: "boulanger@news.boulanger.com" },
    subject: "Black Friday avant l'heure : jusqu'à -40 % sur le gros électroménager",
    body: [
      "Bonjour Justin,",
      "Pas besoin d'attendre fin novembre : nos offres Black Friday démarrent dès maintenant sur une sélection de lave-linge, réfrigérateurs et aspirateurs balais.",
      "Et parce que vous êtes client, profitez de la livraison et de l'installation offertes dès 299 € d'achat avec le code INSTALLOFF, jusqu'au 27 octobre.",
      "Je découvre les offres",
      "Pour ne plus recevoir nos communications, cliquez ici."
    ],
    unsub: true, vip: false } },
  { expect: 'promos', m: {
    from: { name: "SHEIN", email: "shein@notice.shein.com" },
    subject: "Ta commande est presque prête... 3 articles attendent dans ton panier",
    body: [
      "Hey !",
      "Tu as laissé 3 articles dans ton panier : pull col roulé en maille côtelée, jean flare taille haute, bottines à talon carré. Les stocks partent vite !",
      "Finalise ta commande dans les 24 h et profite de -20 % supplémentaires avec le code OCT20, plus la livraison gratuite dès 29 €.",
      "Finaliser ma commande",
      "Vous recevez cet e-mail car vous êtes inscrit(e) à SHEIN. Se désinscrire."
    ],
    unsub: true, vip: false } },
  { expect: 'promos', m: {
    from: { name: "Decathlon", email: "newsletter@e.decathlon.fr" },
    subject: "Prêt pour les randos d'automne ?",
    body: [
      "Les feuilles tombent, pas votre motivation.",
      "Chaussures imperméables, polaires, frontales : retrouvez tout l'équipement pour marcher au sec cet automne, avec des prix réduits sur plus de 300 produits.",
      "Nouveau : la location de matériel de randonnée en magasin, à partir de 5 € le week-end.",
      "Je m'équipe",
      "Vous recevez cet e-mail car vous êtes inscrit à la newsletter Decathlon. Se désabonner"
    ],
    unsub: true, vip: false } },
  { expect: 'promos', m: {
    from: { name: "Banque Populaire Grand Ouest", email: "votreconseiller@info.banquepopulaire.fr" },
    subject: "Information sur votre compte : une enveloppe de 15 000 € vous est réservée",
    body: [
      "Bonjour Monsieur Rivière,",
      "En tant que client, vous bénéficiez d'une offre de prêt personnel pré-acceptée jusqu'à 15 000 €, au taux annuel effectif global fixe de 4,90 %, pour financer vos projets : travaux, véhicule, équipement...",
      "Exemple : pour 10 000 € sur 48 mois, 48 mensualités de 229,74 €. Coût total du crédit : 1 027,52 €. Offre valable jusqu'au 30/11/2026, sous réserve d'acceptation définitive de votre dossier.",
      "Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.",
      "Pour ne plus recevoir d'offres commerciales par e-mail, cliquez ici."
    ],
    unsub: true, vip: false } },
  { expect: 'promos', m: {
    from: { name: "Corsair", email: "infos@news.flycorsair.com" },
    subject: "Vente flash 72 h : les Antilles dès 459 € A/R",
    body: [
      "Envie de soleil cet hiver ?",
      "Pendant 72 heures seulement, profitez de tarifs exceptionnels vers Pointe-à-Pitre, Fort-de-France et La Réunion, pour des voyages entre le 5 janvier et le 31 mars 2027.",
      "Paris Orly - Pointe-à-Pitre dès 459 € A/R en classe Économie, bagage en soute inclus.",
      "Je réserve",
      "Offre soumise à conditions et dans la limite des places disponibles. Se désinscrire de la newsletter."
    ],
    unsub: true, vip: false } },
  { expect: 'promos', m: {
    from: { name: "Brittany Ferries", email: "news@email.brittany-ferries.com" },
    subject: "Your 2027 sailings are open - book early and save up to 20%",
    body: [
      "Dear Justin,",
      "Good news: our 2027 timetable is now open for booking. Plan your next trip to Spain or the UK early and save up to 20% on selected crossings from Roscoff, Saint-Malo and Caen.",
      "Club Voyage members also get free cabin upgrades on overnight sailings booked before 15 December.",
      "Explore 2027 fares",
      "You are receiving this email because you subscribed to Brittany Ferries news. Unsubscribe | Privacy policy"
    ],
    unsub: true, vip: false } },
  { expect: 'promos', m: {
    from: { name: "Fnac", email: "fnac@info.fnac.com" },
    subject: "Votre solde : 12,40 € disponibles sur votre cagnotte",
    body: [
      "Bonjour Justin,",
      "Votre cagnotte adhérent s'élève à 12,40 €. Bonne nouvelle : du 20 au 26 octobre, elle est doublée sur tous vos achats livres et BD en magasin et sur fnac.com !",
      "Et pour la sortie du nouvel album d'Astérix, 5 % supplémentaires sont reversés sur votre cagnotte.",
      "J'utilise ma cagnotte",
      "Se désinscrire des communications Fnac"
    ],
    unsub: true, vip: false } },
  { expect: 'promos', m: {
    from: { name: "Camille de PayFit", email: "events@payfit.com" },
    subject: "[Webinar] Paie 2027 : tout ce qui change au 1er janvier",
    body: [
      "Bonjour Justin,",
      "Nouveaux plafonds de la Sécurité sociale, allègements de cotisations, titres-restaurant... Le 1er janvier 2027 arrive vite, et avec lui son lot de nouveautés pour la paie.",
      "Nos experts paie vous donnent rendez-vous le jeudi 19 novembre à 11h pour un webinar de 45 minutes, suivi d'une session de questions-réponses en direct.",
      "Je m'inscris gratuitement",
      "Camille, équipe Événements PayFit. Vous recevez cet e-mail en tant que contact PayFit. Se désabonner"
    ],
    unsub: true, vip: false } },
  { expect: 'promos', m: {
    from: { name: "Trello", email: "team@email.trello.com" },
    subject: "New in Trello: plan your week right from your inbox",
    body: [
      "Hi Justin,",
      "We've been busy! Planner now syncs with Outlook calendars, and you can turn any email into a card in one click with the new Inbox integration.",
      "Want to see it in action? Join our 20-minute live demo or start a free 14-day trial of Trello Premium.",
      "Try Premium free",
      "Atlassian, 350 Bush Street, San Francisco. Unsubscribe from Trello marketing emails."
    ],
    unsub: true, vip: false } },
  { expect: 'promos', m: {
    from: { name: "Le Fournil de Léa", email: "lea@lefournildelea.fr" },
    subject: "Cette semaine au Fournil : le retour du pain aux châtaignes",
    body: [
      "Bonjour à toutes et à tous,",
      "L'automne est là et avec lui notre pain aux châtaignes, disponible tous les vendredis et samedis jusqu'à la fin de l'année. Pensez à le réserver, les fournées partent souvent avant 11h !",
      "Petite nouveauté : avec votre carte de fidélité, le dixième café est offert. Et pour les 3 ans de la boutique, une viennoiserie offerte pour tout achat le samedi 24 octobre.",
      "À très vite au Fournil, Léa et toute l'équipe",
      "Vous recevez cette lettre car vous vous êtes inscrit en boutique. Se désinscrire"
    ],
    unsub: true, vip: false } },
  { expect: 'promos', m: {
    from: { name: "AliExpress", email: "notice@notice.aliexpress.com" },
    subject: "Notification : baisse de prix sur 3 articles de vos favoris",
    body: [
      "Bonjour,",
      "Des articles que vous avez ajoutés à vos favoris sont en promotion : lampe de bureau LED pliable (-42 %), support d'écran réglable (-35 %), clavier mécanique sans fil (-28 %).",
      "Ces prix sont valables jusqu'au 20 octobre seulement. Utilisez aussi votre code de bienvenue pour 3 € de réduction dès 20 € d'achat.",
      "Voir mes favoris",
      "Se désabonner"
    ],
    unsub: true, vip: false } },
  { expect: 'promos', m: {
    from: { name: "Julie de SFR", email: "offres@info.sfr.fr" },
    subject: "Justin, on a pensé à vous pour votre box",
    body: [
      "Bonjour Justin,",
      "Je me permets de vous écrire car votre adresse est désormais éligible à la fibre SFR jusqu'à 8 Gb/s. Bonne nouvelle, non ?",
      "Pour vous, c'est la box SFR Fibre Power à 24,99 €/mois pendant 12 mois (puis 44,99 €/mois), avec l'installation offerte si vous souscrivez avant le 31 octobre.",
      "Il suffit de cliquer ci-dessous ou d'appeler gratuitement un conseiller. Belle journée, Julie, votre conseillère SFR",
      "Offre soumise à conditions, réservée aux nouveaux abonnés fibre. Pour ne plus recevoir nos offres, cliquez ici."
    ],
    unsub: true, vip: false } },

  { expect: 'junk', m: {
    from: { name: "Caisse d'Epargne", email: "alerte@caisse-epargne-securpass.com" },
    subject: "Action requise : votre Sécur'Pass sera désactivé sous 24h",
    body: [
      "Cher(e) client(e),",
      "Dans le cadre de la mise à jour de la directive européenne DSP2, votre dispositif Sécur'Pass doit être revalidé. Sans action de votre part avant le 18/10/2026, l'accès à votre banque en ligne et vos paiements par carte seront temporairement suspendus.",
      "Pour éviter toute interruption, veuillez confirmer votre identité en cliquant sur le lien ci-dessous et en suivant les étapes indiquées (identifiant, code d'accès et code reçu par SMS).",
      "Revalider mon Sécur'Pass",
      "Nous vous remercions de votre confiance. Le Service Sécurité Caisse d'Epargne"
    ],
    unsub: false, vip: false } },
  { expect: 'junk', m: {
    from: { name: "Sandrine Delmas", email: "s.delmas@delmas-recouvrement.fr" },
    subject: "Facture n° 2026-1187 impayée - dernier rappel avant transmission",
    body: [
      "Bonjour,",
      "Sauf erreur de notre part, la facture n° 2026-1187 d'un montant de 1 486,00 € TTC relative à votre référencement annuel dans l'Annuaire des Professionnels de Bretagne reste impayée à ce jour, malgré nos précédentes relances.",
      "Afin d'éviter la transmission de votre dossier à notre service contentieux et l'application de pénalités de retard, nous vous remercions de procéder au règlement sous 48 heures par virement sur le compte indiqué dans la facture jointe.",
      "Je reste bien entendu à votre disposition pour tout renseignement complémentaire.",
      "Cordialement, Sandrine Delmas, Service Recouvrement"
    ],
    unsub: false, vip: false } },
  { expect: 'junk', m: {
    from: { name: "Pierre-Yves Kerlann", email: "py.kerlann.dg@gmail.com" },
    subject: "Disponible ?",
    body: [
      "Bonjour Justin,",
      "Es-tu à ton bureau ? Je suis en déplacement et coincé en réunion toute la journée, je ne peux pas prendre d'appel.",
      "J'ai besoin que tu traites un virement fournisseur assez urgent et confidentiel aujourd'hui, dans le cadre d'une acquisition qui n'est pas encore annoncée. Merci de ne pas en parler à l'équipe pour le moment, je t'expliquerai.",
      "Réponds-moi uniquement sur cette adresse, je t'envoie les coordonnées bancaires dès que tu confirmes.",
      "Pierre-Yves, envoyé de mon iPhone"
    ],
    unsub: false, vip: false } },
  { expect: 'junk', m: {
    from: { name: "Amandine Roussel - RH", email: "amandine.roussel@talentsplus-recrutement.com" },
    subject: "Suite à votre candidature - poste en télétravail",
    body: [
      "Bonjour,",
      "Votre profil a retenu notre attention pour un poste d'assistant(e) évaluation produits en télétravail, à raison de 30 minutes à 1 heure par jour. Aucune expérience n'est requise et la rémunération va de 200 € à 450 € par jour, versée quotidiennement.",
      "Pour finaliser votre inscription, il vous suffit d'ajouter notre conseillère sur WhatsApp au +44 7700 900412 et de lui indiquer le code AR-1027. Un dépôt de démarrage de 50 € vous sera remboursé dès votre première mission.",
      "Au plaisir de vous compter parmi nous, Amandine Roussel, chargée de recrutement"
    ],
    unsub: false, vip: false } },
  { expect: 'junk', m: {
    from: { name: "James Walker", email: "sgt.jameswalker1974@outlook.com" },
    subject: "Hello my dear friend",
    body: [
      "Hello dear,",
      "Please forgive me for writing to you like this. I found your profile and something in your smile told me you are an honest and kind person. My name is James, I am a US Army sergeant currently on a peacekeeping mission in Syria. I am a widower and I raise my daughter Emily alone since my wife passed away.",
      "I would really like to know you better and share more about my life. My contract ends soon and I am thinking of settling in Europe, maybe in France which I always dreamed of.",
      "Please write me back, it would mean a lot to me. Yours sincerely, James"
    ],
    unsub: false, vip: false } },
  { expect: 'junk', m: {
    from: { name: "Justin Rivière", email: "justin.riviere@kerlann-studio.fr" },
    subject: "Your account has been compromised - payment required",
    body: [
      "Hello,",
      "I'm a programmer who hacked your device several months ago. As you can see, I'm writing to you from your own email address. I installed malware through a website you visited and since then I have been watching everything you do through your camera, including the adult websites you visit.",
      "I recorded a video of you and I have the list of all your contacts. If you want me to delete everything, send 1,350 USD in Bitcoin to the address below within 48 hours. If I don't receive the payment, the video will be sent to your family and colleagues.",
      "BTC: bc1q9x7f3k2m8hq0v4p6t5n2w8e3r7y1u0i9o4a6s2d",
      "Don't reply to this email and don't go to the police, I will know."
    ],
    unsub: false, vip: false } },
  { expect: 'junk', m: {
    from: { name: "Laurent Béchet - Conseil Patrimoine", email: "l.bechet@epargne-patrimoine-conseil.fr" },
    subject: "Suite à notre échange : votre livret à 7,2 %",
    body: [
      "Bonjour Monsieur Rivière,",
      "Comme convenu lors de notre échange téléphonique, je vous transmets les conditions de notre livret partenaire : rendement garanti de 7,2 % par an, capital garanti et disponible à tout moment, sans frais d'ouverture. L'offre est réservée à un nombre limité d'épargnants jusqu'au 31 octobre.",
      "Les fonds sont placés auprès d'une banque européenne agréée et couverts par le Fonds de garantie des dépôts jusqu'à 100 000 €. Pour bloquer votre taux, il suffit de me renvoyer une copie de votre pièce d'identité et d'effectuer un premier versement de 5 000 € minimum.",
      "Je reste joignable par téléphone pour toute question. Bien cordialement, Laurent Béchet, conseiller en gestion de patrimoine"
    ],
    unsub: false, vip: false } },
  { expect: 'junk', m: {
    from: { name: "France Travail", email: "indemnisation@francetravail-regularisation.fr" },
    subject: "Régularisation : un versement de 412,36 € est en attente",
    body: [
      "Bonjour,",
      "Suite au recalcul de vos droits pour la période de juillet à septembre 2026, un écart a été constaté en votre faveur. Un versement complémentaire de 412,36 € est en attente de validation.",
      "Pour recevoir ce montant sous 72 heures, merci de confirmer vos coordonnées bancaires via le formulaire sécurisé ci-dessous. Passé le 20/10/2026, la somme ne pourra plus être versée.",
      "Confirmer mes informations",
      "France Travail - Service Indemnisation"
    ],
    unsub: false, vip: false } },
  { expect: 'junk', m: {
    from: { name: "La Poste - Colissimo", email: "suivi@laposte-colis.fr" },
    subject: "Votre colis est en attente : frais de réexpédition à régler",
    body: [
      "Bonjour,",
      "Votre colis n° 6A21875943120 n'a pas pu être livré le 16/10/2026 car l'adresse était incomplète. Il est actuellement conservé dans notre centre de tri.",
      "Pour programmer une nouvelle livraison, des frais de réexpédition de 1,99 € doivent être réglés avant le 19/10/2026. Passé ce délai, le colis sera retourné à l'expéditeur.",
      "Programmer ma livraison",
      "Merci de votre confiance, le service client Colissimo"
    ],
    unsub: false, vip: false } },
  { expect: 'junk', m: {
    from: { name: "ANTS - Service Crit'Air", email: "avis@certificat-critair-ants.fr" },
    subject: "Avis de contravention : circulation en ZFE sans vignette Crit'Air valide",
    body: [
      "Madame, Monsieur,",
      "Votre véhicule immatriculé FT-219-KC a été contrôlé le 09/10/2026 à 15h31 circulant dans la Zone à Faibles Émissions de la Métropole de Rennes sans certificat qualité de l'air valide.",
      "Le montant de l'amende forfaitaire s'élève à 68 €. Il est minoré à 45 € en cas de paiement sous 15 jours. À défaut de règlement, le montant sera majoré à 180 €.",
      "Payer mon amende en ligne",
      "Agence Nationale des Titres Sécurisés - Ministère de l'Intérieur"
    ],
    unsub: false, vip: false } },
  { expect: 'junk', m: {
    from: { name: "Microsoft OneDrive", email: "no-reply@onedrive-microsoft365.com" },
    subject: "Votre espace de stockage est plein : vos fichiers seront supprimés",
    body: [
      "Bonjour,",
      "Votre espace OneDrive a atteint 100 % de sa capacité. Conformément à nos conditions d'utilisation, les fichiers et photos les plus anciens de votre compte seront supprimés définitivement le 20 octobre 2026 si aucune action n'est effectuée.",
      "En tant que client fidèle, vous pouvez obtenir 50 Go supplémentaires gratuitement pendant 90 jours. Il suffit de vérifier votre compte et de confirmer votre moyen de paiement (aucun débit ne sera effectué aujourd'hui).",
      "Obtenir mon stockage gratuit",
      "Microsoft Corporation, One Microsoft Way, Redmond, WA 98052"
    ],
    unsub: true, vip: false } },
  { expect: 'junk', m: {
    from: { name: "Lidl France", email: "jeu@lidl-anniversaire.com" },
    subject: "Félicitations ! Vous avez été sélectionné(e) pour gagner un aspirateur Parkside",
    body: [
      "Cher client, chère cliente,",
      "Pour fêter les 37 ans de Lidl en France, vous faites partie des 100 clients tirés au sort pour recevoir un aspirateur sans fil Parkside d'une valeur de 199 €.",
      "Pour réclamer votre cadeau, répondez simplement à 3 questions sur votre expérience en magasin. Seuls les frais de port de 1,95 € vous seront demandés. Offre valable aujourd'hui seulement !",
      "Je réclame mon cadeau",
      "Si vous ne souhaitez plus recevoir nos messages, cliquez ici."
    ],
    unsub: true, vip: false } }
];
