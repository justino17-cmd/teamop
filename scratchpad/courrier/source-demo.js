/* Source de DÉMONSTRATION d'OP Courrier — pour la page d'essai (scratchpad/courrier/essai.html) et les sondes du module. Rien d'autre ne la charge.
   ⛔ Les données d'exemple vivent ICI et nulle part ailleurs : `opcourrier.js` et `beta.html` n'en contiennent aucune (tests/test-2702.js le garde).
   Noms et adresses INVENTÉS (domaines en .example) ; les expéditeurs « arnaque / hameçonnage » servent à éprouver le tri automatique.
   Modes (paramètre ?mode= de la page d'essai) :
     demo        tout allumé (OAuth, envoi programmé, signature, simulation) — c'est le mode de la maquette validée
     reel        ce que sait faire le serveur d'OP GESTION aujourd'hui : rien de tout cela, seule la réception est remplie
     vide        aucune boîte connectée (l'état vide des applications)
     panne       boites() échoue ; panne-messages : les messages d'une boîte échouent ; refus : envoyer() échoue ; differe : le corps se lit à l'ouverture
   Les messages d'exemple sont rendus tels qu'une source les rend (contrat en tête d'opcourrier.js) ; leur âge est relatif au moment du chargement. */
(function () {
"use strict";
var MIN = 60000, HR = 3600000, DAY = 86400000;
var CLE = "opcourrierEssai_v1";
var BOITES = [
  { id: "a1", email: "camille.moreau@atelier-moreau.example", nom: "Camille Moreau", cote: "pro", fournisseur: "microsoft", signature: "Camille Moreau\nAtelier Moreau" },
  { id: "a2", email: "camille.essai@messagerie-essai.example", nom: "Camille", cote: "perso", fournisseur: "gmail", signature: "— Camille" }
];
var MESSAGES = [
 {
  "id": "m1",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "Gestion Essai",
   "email": "notifications@gestion-essai.example"
  },
  "a": "Camille",
  "objet": "Nouvelle intervention assignée — Chantier Villeurbanne",
  "apercu": "Une intervention vient de vous être assignée pour jeudi 9 h. Client : SARL Mercier. Pensez à confirmer votre passage.",
  "corps": [
   "Bonjour Camille,",
   "Une nouvelle intervention vient de vous être assignée dans Gestion Essai.",
   "Client : SARL Mercier\nDate : jeudi, 9 h 00\nObjet : maintenance préventive — groupe froid",
   "Ouvrez l'intervention pour confirmer votre passage et préparer le rapport.",
   "— Gestion Essai"
  ],
  "agoMs": 1080000,
  "lu": false,
  "drapeau": false,
  "vip": true,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m2",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "Léa Fontaine",
   "email": "lea.fontaine@atelier-nord.fr"
  },
  "a": "Camille",
  "objet": "Compte rendu de la réunion de mardi",
  "apercu": "Merci à tous pour cet échange. Voici les trois décisions actées pour le trimestre, et le compte rendu complet en pièce jointe.",
  "corps": [
   "Bonjour Camille,",
   "Merci à tous pour cet échange de mardi. Voici les trois décisions que nous avons actées :",
   "1. Le lancement de la nouvelle offre est confirmé pour le 2 du mois prochain.\n2. Camille reprend le suivi des comptes clés.\n3. Point hebdomadaire le mardi à 9 h 30.",
   "Le compte rendu complet est en pièce jointe. Dis-moi si j'ai oublié quelque chose.",
   "Bonne journée,\nLéa"
  ],
  "agoMs": 7200000,
  "lu": false,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": [
   {
    "nom": "CR-reunion-mardi.pdf",
    "taille": "184 Ko",
    "type": "doc"
   }
  ]
 },
 {
  "id": "m3",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "Thomas Berger",
   "email": "t.berger@berger-batiment.fr"
  },
  "a": "Camille",
  "objet": "Devis chantier Rue Victor Hugo",
  "apercu": "Comme convenu, je vous envoie le devis pour la rénovation. N'hésitez pas à revenir vers moi pour ajuster les postes.",
  "corps": [
   "Bonjour,",
   "Comme convenu au téléphone, je vous joins le devis pour le chantier de la rue Victor Hugo.",
   "Le montant tient compte de la remise de 8 % dont nous avions parlé. Délai : trois semaines à compter de la signature.",
   "Je reste disponible pour en discuter.",
   "Cordialement,\nThomas Berger"
  ],
  "agoMs": 18000000,
  "lu": false,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": [
   {
    "nom": "Devis-VictorHugo.pdf",
    "taille": "96 Ko",
    "type": "doc"
   }
  ]
 },
 {
  "id": "m4",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Camille Roy",
   "email": "camille.roy@gmail.com"
  },
  "a": "Camille",
  "objet": "Déjeuner vendredi ?",
  "apercu": "Tu es dispo vendredi midi ? Il y a la nouvelle adresse près du parc dont tout le monde parle. Je réserve si tu me dis oui.",
  "corps": [
   "Coucou,",
   "Tu es dispo vendredi midi pour déjeuner ? Il y a cette nouvelle adresse près du parc dont tout le monde parle.",
   "Je peux réserver pour 12 h 30 si ça te va. Dis-moi vite.",
   "Bisous,\nCamille"
  ],
  "agoMs": 28800000,
  "lu": false,
  "drapeau": true,
  "vip": true,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m5",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "OP MESSAGES",
   "email": "no-reply@messagerie-essai.example"
  },
  "a": "Camille",
  "objet": "Vous avez 3 nouveaux messages dans l'équipe",
  "apercu": "L'équipe Atelier Nord a échangé pendant votre absence. Ouvrez OP MESSAGES pour reprendre la conversation.",
  "corps": [
   "Bonjour Camille,",
   "Pendant votre absence, 3 messages ont été échangés dans l'équipe « Atelier Nord » sur OP MESSAGES.",
   "Reprenez la conversation à tout moment depuis l'application.",
   "— OP MESSAGES"
  ],
  "agoMs": 39600000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m6",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "SNCF Connect",
   "email": "confirmation@sncf-connect.com"
  },
  "a": "Camille",
  "objet": "Votre billet pour Paris — 12 nov.",
  "apercu": "Votre voyage est confirmé. Retrouvez votre billet en pièce jointe et présentez-le à l'embarquement.",
  "corps": [
   "Bonjour,",
   "Votre réservation est confirmée.",
   "Départ : 12 novembre, 08 h 04 — Lyon Part-Dieu\nArrivée : 10 h 02 — Paris Gare de Lyon\nVoiture 12, place 34, côté fenêtre.",
   "Votre billet est en pièce jointe.",
   "Bon voyage,\nSNCF Connect"
  ],
  "agoMs": 93600000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": [
   {
    "nom": "Billet-Paris.pdf",
    "taille": "72 Ko",
    "type": "doc"
   }
  ]
 },
 {
  "id": "m7",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "Marc Lefèvre",
   "email": "m.lefevre@atelier-nord.fr"
  },
  "a": "Camille, Léa",
  "objet": "Re: Planning des interventions",
  "apercu": "Parfait pour moi. Je prends le secteur sud lundi et mardi, et je laisse le nord à l'équipe de Karim.",
  "corps": [
   "Parfait pour moi.",
   "Je prends le secteur sud lundi et mardi, et je laisse le nord à l'équipe de Karim comme discuté.",
   "On refait le point mercredi.",
   "Marc",
   [
    "quote",
    "Le 10 nov., Camille a écrit :\n> Est-ce que tu peux prendre le secteur sud en début de semaine ? On est un peu justes côté planning."
   ]
  ],
  "agoMs": 108000000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m8",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Sophie",
   "email": "sophie.m@icloud.com"
  },
  "a": "Camille",
  "objet": "Photos du week-end",
  "apercu": "Je t'envoie quelques photos de la rando de samedi, elles sont superbes avec la lumière de fin de journée.",
  "corps": [
   "Hello !",
   "Je t'envoie quelques photos de la rando de samedi. La lumière de fin de journée était incroyable.",
   "Merci encore pour l'organisation, c'était une super journée.",
   "À très vite,\nSophie"
  ],
  "agoMs": 172800000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": [
   {
    "nom": "IMG_4821.jpg",
    "taille": "3,2 Mo",
    "type": "img"
   },
   {
    "nom": "IMG_4830.jpg",
    "taille": "2,8 Mo",
    "type": "img"
   }
  ]
 },
 {
  "id": "m11",
  "boite": "a1",
  "dossier": "sent",
  "de": null,
  "a": "lea.fontaine@atelier-nord.fr",
  "objet": "Re: Compte rendu de la réunion de mardi",
  "apercu": "Merci Léa, c'est très clair. Je valide les trois points. Je m'occupe de prévenir l'équipe technique pour le lancement.",
  "corps": [
   "Merci Léa, c'est très clair.",
   "Je valide les trois points. Je m'occupe de prévenir l'équipe technique pour le lancement du 2.",
   "À mardi,\nCamille"
  ],
  "agoMs": 900000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m12",
  "boite": "a2",
  "dossier": "sent",
  "de": null,
  "a": "camille.roy@gmail.com",
  "objet": "Re: Déjeuner vendredi ?",
  "apercu": "Oui avec plaisir ! 12 h 30 ça me va parfaitement. Réserve, je m'occupe du dessert pour la prochaine fois.",
  "corps": [
   "Oui avec plaisir !",
   "12 h 30 ça me va parfaitement. Réserve, et je m'occupe du dessert pour la prochaine fois.",
   "À vendredi,\nCamille"
  ],
  "agoMs": 25200000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m13",
  "boite": "a2",
  "dossier": "archive",
  "de": {
   "nom": "UX Weekly",
   "email": "hello@uxweekly.com"
  },
  "a": "Camille",
  "objet": "Les 5 tendances d'interface de la semaine",
  "apercu": "Cette semaine : le retour des interfaces denses, les dégradés maîtrisés, et pourquoi la typographie système revient en force.",
  "corps": [
   "Au programme cette semaine :",
   "— Le retour des interfaces denses et des listes à trois panneaux.\n— Les dégradés maîtrisés, loin des arcs-en-ciel.\n— Pourquoi la typographie système revient en force.",
   "Bonne lecture,\nL'équipe UX Weekly"
  ],
  "agoMs": 518400000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m14",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "GRAND CONCOURS",
   "email": "gagnant@promo-express-xyz.net"
  },
  "a": "Camille",
  "objet": "Vous avez été TIRÉ AU SORT",
  "apercu": "Félicitations ! Cliquez immédiatement pour réclamer votre cadeau exceptionnel avant expiration dans 24 h.",
  "corps": [
   "FÉLICITATIONS !",
   "Vous avez été tiré au sort pour recevoir un cadeau exceptionnel.",
   "Cliquez vite avant expiration…",
   "(Ce message est un exemple de courrier indésirable.)"
  ],
  "agoMs": 32400000,
  "lu": false,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m15",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "Claire Dubois",
   "email": "claire.dubois@sarl-mercier.fr"
  },
  "a": "Camille",
  "objet": "Intervention de jeudi — accès au site",
  "apercu": "Bonjour Camille, pour jeudi, le portail côté rue sera fermé. Je vous attendrai à l'entrée de service à partir de 8 h 45.",
  "corps": [
   "Bonjour Camille,",
   "Pour l'intervention de jeudi, le portail côté rue sera fermé pour travaux. Je vous attendrai à l'entrée de service, rue des Tanneurs, à partir de 8 h 45.",
   "Le groupe froid est au sous-sol ; je préviens le gardien de votre passage.",
   "Merci et à jeudi,\nClaire Dubois\nSARL Mercier"
  ],
  "agoMs": 10800000,
  "lu": false,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m16",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "Distri'Élec Pro",
   "email": "facturation@distrielec-pro.fr"
  },
  "a": "Camille Moreau",
  "objet": "Votre facture n° FA-2026-10482 est disponible",
  "apercu": "Facture n° FA-2026-10482 du 16/10/2026 — Montant TTC : 1 284,60 €. Échéance de paiement : 15/11/2026.",
  "corps": [
   "Bonjour,",
   "Votre facture n° FA-2026-10482 est disponible dans votre espace client.",
   "Commande : câbles et disjoncteurs — chantier Villeurbanne\nMontant HT : 1 070,50 €\nMontant TTC : 1 284,60 €\nÉchéance : 15/11/2026 (virement à 30 jours)",
   "Merci de votre confiance,\nLe service facturation — Distri'Élec Pro"
  ],
  "agoMs": 21600000,
  "lu": false,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": [
   {
    "nom": "FA-2026-10482.pdf",
    "taille": "64 Ko",
    "type": "doc"
   }
  ]
 },
 {
  "id": "m17",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "SNCF Connect",
   "email": "confirmation@sncf-connect.com"
  },
  "a": "Camille Moreau",
  "objet": "Vos e-billets Lyon → Marseille — 23 oct.",
  "apercu": "Réservation confirmée pour votre déplacement : aller le 23 octobre à 7 h 34, retour le soir même à 18 h 52.",
  "corps": [
   "Bonjour Camille,",
   "Votre réservation est confirmée.",
   "Aller : 23 octobre, 07 h 34 — Lyon Part-Dieu → 09 h 15 Marseille Saint-Charles, voiture 4, place 61\nRetour : 23 octobre, 18 h 52 — Marseille Saint-Charles → 20 h 33 Lyon Part-Dieu, voiture 7, place 22",
   "Vos e-billets sont en pièce jointe. Présentez-les à l'embarquement.",
   "Bon voyage,\nSNCF Connect"
  ],
  "agoMs": 33600000,
  "lu": false,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": [
   {
    "nom": "E-billets-Marseille.pdf",
    "taille": "88 Ko",
    "type": "doc"
   }
  ]
 },
 {
  "id": "m18",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "BatInfo Pro",
   "email": "newsletter@batinfo-pro.fr"
  },
  "a": "Camille",
  "objet": "La lettre du bâtiment — RE2020, aides 2027, salons de novembre",
  "apercu": "Au sommaire cette semaine : ce qui change avec la RE2020 au 1er janvier, les aides à la rénovation 2027 et notre webinaire du 6 novembre.",
  "corps": [
   "Au sommaire cette semaine :",
   "— RE2020 : ce qui change au 1er janvier pour les installateurs.\n— Aides à la rénovation 2027 : le point complet.\n— Webinaire gratuit le 6 novembre : « Réussir ses chantiers d'hiver ». Inscrivez-vous en un clic.",
   "Bonne lecture,\nLa rédaction BatInfo Pro",
   "Vous recevez cette newsletter car vous êtes abonné. Se désinscrire."
  ],
  "agoMs": 90000000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": true,
  "pj": []
 },
 {
  "id": "m19",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "Microsoft",
   "email": "microsoft-noreply@microsoft.com"
  },
  "a": "Camille Moreau",
  "objet": "Votre facture Microsoft 365 Business Standard",
  "apercu": "Votre facture du 15 octobre 2026 est disponible. Montant total : 15,00 € TTC pour 1 licence.",
  "corps": [
   "Bonjour Camille,",
   "Votre facture du 15 octobre 2026 pour l'abonnement Microsoft 365 Business Standard est disponible dans le Centre d'administration.",
   "Organisation : Gestion Essai\nLicences : 1\nMontant total : 15,00 € TTC (12,50 € HT)\nPrélèvement le 20 octobre 2026",
   "L'équipe Microsoft 365"
  ],
  "agoMs": 183600000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m20",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "Distri'Élec Pro",
   "email": "offres@distrielec-pro.fr"
  },
  "a": "Camille",
  "objet": "-20 % sur l'outillage électroportatif jusqu'à dimanche",
  "apercu": "Profitez de -20 % sur toute la gamme outillage avec le code PRO20. Offre valable jusqu'au 20 octobre, en agence et en ligne.",
  "corps": [
   "Cette semaine seulement :",
   "-20 % sur toute la gamme d'outillage électroportatif avec le code PRO20.\nLivraison offerte sur chantier dès 150 € HT.",
   "Offre valable jusqu'au 20 octobre 2026, en agence et en ligne.",
   "Se désinscrire de nos offres"
  ],
  "agoMs": 190800000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": true,
  "pj": []
 },
 {
  "id": "m21",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "Philippe Garnier — Direction",
   "email": "p.garnier.direction@gmail.com"
  },
  "a": "Camille",
  "objet": "Urgent et confidentiel",
  "apercu": "Camille, es-tu à ton bureau ? J'ai besoin que tu fasses un virement urgent aujourd'hui pour un dossier d'acquisition. Je suis en réunion.",
  "corps": [
   "Camille,",
   "Es-tu à ton bureau ? J'ai besoin que tu fasses un virement urgent aujourd'hui pour un dossier d'acquisition strictement confidentiel.",
   "Je suis en réunion toute la journée et je ne peux pas prendre d'appel. N'en parle à personne pour l'instant, je t'envoie les coordonnées bancaires dans un instant.",
   "Philippe Garnier\nDirection",
   "(Ce message est un exemple d'arnaque au président.)"
  ],
  "agoMs": 14400000,
  "lu": false,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m22",
  "boite": "a1",
  "dossier": "inbox",
  "de": {
   "nom": "Colissimo",
   "email": "suivi@colissimo-livraison-fr.com"
  },
  "a": "Client",
  "objet": "Votre colis est en attente — frais de livraison impayés",
  "apercu": "Votre colis n° 6A21458795 est en attente. Des frais de livraison impayés de 1,99 € doivent être réglés sous 48 h.",
  "corps": [
   "Bonjour,",
   "Votre colis n° 6A21458795 est en attente au centre de distribution : des frais de livraison impayés de 1,99 € restent à régler.",
   "Réglez-les sous 48 h pour programmer une nouvelle livraison. Passé ce délai, le colis sera retourné à l'expéditeur.",
   "Service client Colissimo",
   "(Ce message est un exemple de faux avis de colis.)"
  ],
  "agoMs": 100800000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m23",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Google",
   "email": "no-reply@accounts.google.com"
  },
  "a": "camille.essai@messagerie-essai.example",
  "objet": "Alerte de sécurité : nouvelle connexion sur un Mac",
  "apercu": "Nouvelle connexion à votre compte Google camille.essai@messagerie-essai.example depuis un Mac, à Lyon. Si c'était vous, vous n'avez rien à faire.",
  "corps": [
   "Nouvelle connexion sur Mac",
   "Votre compte Google camille.essai@messagerie-essai.example vient d'être utilisé pour vous connecter sur un nouvel appareil Mac, à Lyon (France).",
   "Si c'était vous, vous n'avez rien à faire. Sinon, sécurisez votre compte depuis la page Sécurité de votre compte Google.",
   "L'équipe Comptes Google"
  ],
  "agoMs": 2400000,
  "lu": false,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m24",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Vélo Passion",
   "email": "newsletter@velopassion.fr"
  },
  "a": "Camille",
  "objet": "Soldes d'automne : jusqu'à -30 % sur les vélos de route",
  "apercu": "Derniers jours ! Jusqu'à -30 % sur une sélection de vélos de route et gravel, et la révision offerte pour tout achat.",
  "corps": [
   "Derniers jours pour profiter des soldes d'automne :",
   "Jusqu'à -30 % sur une sélection de vélos de route et gravel.\nRévision offerte pendant un an pour tout achat d'un vélo.",
   "Offre valable jusqu'au 26 octobre 2026, en magasin et en ligne.",
   "Vous recevez cet e-mail car vous êtes inscrit à la newsletter Vélo Passion. Se désinscrire."
  ],
  "agoMs": 18000000,
  "lu": false,
  "drapeau": false,
  "vip": false,
  "desinscription": true,
  "pj": []
 },
 {
  "id": "m25",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Crédit Agricole",
   "email": "alerte@credit-agricole-securite.com"
  },
  "a": "Client",
  "objet": "Action requise : votre accès en ligne sera suspendu",
  "apercu": "Nous avons détecté une activité inhabituelle. Vérifiez votre identité sous 24 h pour éviter la suspension de votre compte.",
  "corps": [
   "Cher client,",
   "Nous avons détecté une activité inhabituelle sur votre espace en ligne. Par mesure de sécurité, votre accès en ligne sera suspendu.",
   "Vérifiez votre identité sous 24 h en confirmant vos coordonnées bancaires sur notre page sécurisée.",
   "Service sécurité — Crédit Agricole",
   "(Ce message est un exemple d'hameçonnage : le domaine imite celui de la banque.)"
  ],
  "agoMs": 46800000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m26",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Doctolib",
   "email": "no-reply@doctolib.fr"
  },
  "a": "Camille",
  "objet": "Rappel : rendez-vous demain à 10 h 30",
  "apercu": "Rendez-vous demain à 10 h 30 avec le Dr Anne Mercadier, médecin généraliste, 12 rue Victor Hugo, Lyon 6e.",
  "corps": [
   "Bonjour Camille,",
   "Nous vous rappelons votre rendez-vous :",
   "Demain, 10 h 30\nDr Anne Mercadier — médecin généraliste\n12 rue Victor Hugo, 69006 Lyon",
   "En cas d'empêchement, pensez à annuler votre rendez-vous pour libérer le créneau.",
   "L'équipe Doctolib"
  ],
  "agoMs": 86400000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m27",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Antoine Leroy",
   "email": "antoine.leroy@orange.fr"
  },
  "a": "Camille",
  "objet": "Match de dimanche ?",
  "apercu": "Salut ! On joue dimanche à 10 h au city stade, il nous manque un gardien. Tu es partant ? Je prends les maillots.",
  "corps": [
   "Salut !",
   "On joue dimanche à 10 h au city stade, et il nous manque un gardien. Tu es partant ?",
   "Je m'occupe des maillots, ramène juste tes crampons.",
   "À+\nAntoine"
  ],
  "agoMs": 97200000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m28",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Apple",
   "email": "no_reply@email.apple.com"
  },
  "a": "Camille",
  "objet": "Votre reçu Apple",
  "apercu": "Reçu du 16 octobre 2026 — iCloud+ avec 50 Go de stockage (mensuel) : 2,99 €. Facturé sur votre moyen de paiement enregistré.",
  "corps": [
   "Reçu",
   "Identifiant Apple : camille.essai@messagerie-essai.example\nDate : 16 octobre 2026\nCommande n° MQ7Z2K4LP",
   "iCloud+ avec 50 Go de stockage (mensuel) — 2,99 €\nTotal payé : 2,99 € TTC",
   "Renouvellement automatique le 16 novembre 2026. Vous pouvez gérer votre abonnement dans Réglages."
  ],
  "agoMs": 111600000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m29",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Le Petit Gourmet",
   "email": "bonjour@lepetitgourmet.fr"
  },
  "a": "Camille",
  "objet": "5 recettes de saison pour la semaine",
  "apercu": "Au sommaire : velouté de potimarron, tarte fine aux pommes, risotto aux champignons… et les nouveautés de l'épicerie.",
  "corps": [
   "Au sommaire cette semaine :",
   "— Velouté de potimarron et noisettes torréfiées\n— Risotto crémeux aux champignons des bois\n— Tarte fine aux pommes et caramel au beurre salé",
   "Et découvrez les nouveautés de notre épicerie fine.",
   "Bon appétit !\nL'équipe du Petit Gourmet",
   "Se désinscrire de la lettre d'information"
  ],
  "agoMs": 180000000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": true,
  "pj": []
 },
 {
  "id": "m30",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Free Mobile",
   "email": "noreply@free-mobile.fr"
  },
  "a": "Camille",
  "objet": "Votre facture Free Mobile d'octobre est disponible",
  "apercu": "Votre facture du mois d'octobre est disponible dans votre Espace Abonné. Montant : 15,99 €, prélevé le 22 octobre.",
  "corps": [
   "Bonjour,",
   "Votre facture du mois d'octobre 2026 est disponible dans votre Espace Abonné.",
   "Forfait Free 5G 150 Go\nMontant : 15,99 € TTC\nPrélèvement prévu le 22 octobre 2026 sur votre compte se terminant par 42.",
   "Cordialement,\nFree Mobile"
  ],
  "agoMs": 266400000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m31",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Booking.com",
   "email": "noreply@booking.com"
  },
  "a": "Camille",
  "objet": "Réservation confirmée — Hôtel Les Galets, Biarritz",
  "apercu": "Votre séjour est confirmé : 2 nuits du 7 au 9 novembre. Arrivée à partir de 15 h, départ avant 11 h.",
  "corps": [
   "Bonjour Camille,",
   "Votre réservation à l'Hôtel Les Galets est confirmée.",
   "Arrivée : vendredi 7 novembre, à partir de 15 h 00\nDépart : dimanche 9 novembre, avant 11 h 00\n2 nuits · chambre double vue mer · petit-déjeuner inclus",
   "Numéro de confirmation : 4821.553.907",
   "Bon séjour,\nBooking.com"
  ],
  "agoMs": 280800000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m32",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Maison Lumen",
   "email": "commandes@maisonlumen.fr"
  },
  "a": "Camille",
  "objet": "Confirmation de votre commande n° 48213",
  "apercu": "Merci pour votre commande ! Lampe de bureau Arc (laiton) × 1 — Total payé : 64,90 €. Expédition prévue demain.",
  "corps": [
   "Bonjour Camille,",
   "Merci pour votre commande n° 48213 passée le 13 octobre 2026.",
   "Lampe de bureau Arc, laiton × 1 — 59,90 €\nLivraison à domicile — 5,00 €\nTotal payé : 64,90 € TTC (carte bancaire)",
   "Vous recevrez un e-mail dès l'expédition de votre colis.",
   "L'équipe Maison Lumen"
  ],
  "agoMs": 349200000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": false,
  "pj": []
 },
 {
  "id": "m33",
  "boite": "a2",
  "dossier": "inbox",
  "de": {
   "nom": "Le Petit Gourmet",
   "email": "bonjour@lepetitgourmet.fr"
  },
  "a": "Camille",
  "objet": "Menu d'automne : 4 plats mijotés faciles",
  "apercu": "Au sommaire : bœuf bourguignon, poule au pot, curry de légumes et notre programme de la semaine pour cuisiner malin.",
  "corps": [
   "Au sommaire cette semaine :",
   "— Bœuf bourguignon comme chez mamie\n— Poule au pot et ses légumes d'hiver\n— Curry de légumes au lait de coco",
   "Le programme de la semaine pour cuisiner malin vous attend.",
   "L'équipe du Petit Gourmet",
   "Se désinscrire de la lettre d'information"
  ],
  "agoMs": 777600000,
  "lu": true,
  "drapeau": false,
  "vip": false,
  "desinscription": true,
  "pj": []
 }
];
var ARRIVEES = {
  pro: [{ de: { nom: "Claire Dubois", email: "claire.dubois@sarl-mercier.fr" }, objet: "Re: Intervention de jeudi — accès au site", corps: ["Bonjour,", "Le badge d’accès sera à l’accueil à partir de 8 h 30. Le gardien est prévenu.", "Bonne journée,\nClaire Dubois"] },
        { de: { nom: "Thomas Berger", email: "t.berger@berger-batiment.fr" }, objet: "Re: Devis chantier Rue Victor Hugo", corps: ["Bonjour,", "Petite précision : le devis reste valable 30 jours. Je peux démarrer le 4 novembre si vous validez cette semaine.", "Cordialement,\nThomas Berger"] }],
  perso: [{ de: { nom: "Camille Roy", email: "camille.roy@gmail.com" }, objet: "Re: Déjeuner vendredi ?", corps: ["Parfait pour 12 h 30 ! Je réserve une table.", "Camille"] },
          { de: { nom: "Antoine Leroy", email: "antoine.leroy@orange.fr" }, objet: "Re: Match de dimanche ?", corps: ["On a un terrain à 10 h, tu es partant ?", "Antoine"] }]
};

function creer(o) {
  o = o || {};
  var mode = o.mode || "demo";
  var etat = { retirees: [], ajoutees: [], arrivees: [], n: 0, suiv: { pro: 0, perso: 0 } };
  try { var r = JSON.parse(localStorage.getItem(CLE) || "null"); if (r && r.retirees) etat = r; } catch (e) {}
  function garder() { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {} }
  var t0 = Date.now();
  var api = { envoyes: [], appels: [], mode: mode };
  function note(x) { api.appels.push(x); }
  function liste() {
    if (mode === "vide") return etat.ajoutees.slice();
    return BOITES.filter(function (b) { return etat.retirees.indexOf(b.id) < 0; }).concat(etat.ajoutees);
  }
  function brut(m) { var c = { id: m.id, dossier: m.dossier, de: m.de, a: m.a, objet: m.objet, apercu: m.apercu, date: m.date != null ? m.date : t0 - (m.agoMs || 0),
      lu: m.lu, drapeau: m.drapeau, vip: m.vip, desinscription: m.desinscription, pj: m.pj };
    if (mode !== "differe") c.corps = m.corps; return c; }
  api.capacites = function () {
    note("capacites");
    if (mode === "signature")   // v2.95 : la source sait signer pour de vrai (faux service piloté par la sonde : window.__sigServeur)
      return Promise.resolve({ signature: true, dossiers: ["inbox"], destinataires: 1, pj: { nombre: 3, octets: 4 * 1024 * 1024 } });
    if (mode === "reel" || mode === "vide" || mode === "panne" || mode === "panne-messages" || mode === "refus" || mode === "differe")
      return Promise.resolve({ dossiers: ["inbox"], destinataires: 1, pj: { nombre: 3, octets: 4 * 1024 * 1024 } });
    return Promise.resolve({ oauth: true, programmeServeur: true, signature: true, reglagesServeur: true, simulation: true,
      dossiers: ["inbox", "sent", "archive"], destinataires: 50, pj: { nombre: 99, octets: 25 * 1024 * 1024 } });
  };
  api.boites = function () { note("boites"); if (mode === "panne") return Promise.reject(new Error("serveur injoignable (essai)")); return Promise.resolve(liste().map(function (b) { return { id: b.id, email: b.email, nom: b.nom, cote: b.cote, fournisseur: b.fournisseur }; })); };
  api.messages = function (q) {
    note("messages:" + q.boite + ":" + q.dossier);
    if (mode === "panne-messages" && q.boite === "a2") return Promise.reject(new Error("boîte injoignable (essai)"));
    if (mode === "vide") return Promise.resolve([]);
    var out = MESSAGES.filter(function (m) { return m.boite === q.boite && m.dossier === q.dossier; }).map(brut)
      .concat(etat.arrivees.filter(function (m) { return m.boite === q.boite && m.dossier === q.dossier; }).map(brut));
    return Promise.resolve(out);
  };
  api.lire = function (id) { note("lire:" + id);
    var m = MESSAGES.concat(etat.arrivees).filter(function (x) { return x.id === id; })[0];
    return m ? Promise.resolve({ corps: m.corps }) : Promise.reject(new Error("message introuvable (essai)")); };
  api.envoyer = function (mail) { note("envoyer"); api.envoyes.push({ boite: mail.boite, de: mail.de, a: mail.a, objet: mail.objet, texte: mail.texte, pieces: (mail.pieces || []).map(function (f) { return f.name; }) });
    if (mode === "refus") return Promise.reject(new Error("refusé par le serveur (essai)"));
    return new Promise(function (ok) { setTimeout(ok, 30); }); };
  api.ajouterBoite = function (p) { note("ajouterBoite");
    if (/refus/i.test(p.email)) return Promise.reject(new Error("Connexion réception (IMAP) refusée : identifiants incorrects (essai)"));
    var id = "acct" + (etat.n + 1) + "_" + p.email.replace(/[^a-z0-9]/gi, "").slice(0, 6); etat.n++;
    var b = { id: id, email: p.email, nom: p.nom, cote: p.cote, fournisseur: p.fournisseur };
    etat.ajoutees.push(b);
    etat.arrivees.push({ id: "w" + etat.n, boite: id, dossier: "inbox", de: { nom: "Messagerie", email: "bienvenue@messagerie-essai.example" }, a: p.nom, objet: "Bienvenue — " + p.email + " est connecté",
      apercu: "Votre compte est relié.", corps: ["Bonjour " + p.nom + ",", "Votre compte est relié."], date: Date.now(), lu: false, drapeau: false, pj: [] });
    garder(); return Promise.resolve(b); };
  api.retirerBoite = function (id) { note("retirerBoite:" + id); etat.retirees.push(id); etat.ajoutees = etat.ajoutees.filter(function (b) { return b.id !== id; }); garder(); return Promise.resolve(); };
  /* le service MX n'existe que dans le mode de démonstration : le serveur d'OP GESTION n'en offre pas (mode=reel → aucun appel réseau pour un domaine d'entreprise) */
  if (mode === "signature") {
    var SRV = window.__sigServeur = { demandes: {}, echec: {}, appels: [], n: 0,
      fixer: function (id, patch) { Object.assign(SRV.demandes[id].vue, patch); } };
    var PDFX = function (m) { return new Blob(["%PDF-1.4\n% " + m + "\n%%EOF\n"], { type: "application/pdf" }); };
    var vueDe = function (id) { return JSON.parse(JSON.stringify(SRV.demandes[id].vue)); };
    var trouve = function (id) { if (!SRV.demandes[id]) return Promise.reject(new Error("Demande introuvable (elle a peut-être été effacée du service).")); return null; };
    var refus = function (quoi) { return SRV.echec[quoi] ? Promise.reject(new Error(SRV.echec[quoi])) : null; };
    api.signature = {
      envoyer: function (dem, fichiers) { SRV.appels.push("envoyer"); var r = refus("envoyer"); if (r) return r;
        var id = ("d" + (++SRV.n) + "0000000000000000000000").slice(0, 24).replace(/[^0-9a-f]/g, "a");
        var liste = dem.signataires.map(function (x) { return { nom: x.nom, email: x.email, contre: false, etat: "pending" }; });
        if (dem.contresignature) liste.push({ nom: dem.contresignature.nom, email: dem.contresignature.email, contre: true, etat: "pending" });
        SRV.demandes[id] = { dem: dem, fichiers: fichiers.map(function (f) { return { nom: f.nom, taille: f.blob.size }; }),
          vue: { id: id, etat: "en_attente", echeance: Date.now() + dem.jours * DAY, signataires: liste, documents: fichiers.map(function (f, i) { return { n: i + 1, nom: f.nom, taille: f.blob.size, signe: false }; }), preuves: 0, evenements: [{ t: Date.now(), x: "Demande préparée" }, { t: Date.now(), x: "Envoyé à " + dem.signataires.map(function (x) { return x.nom; }).join(", ") }] } };
        return Promise.resolve(vueDe(id)); },
      etat: function (id) { SRV.appels.push("etat"); return trouve(id) || refus("etat") || Promise.resolve(vueDe(id)); },
      relancer: function (id) { SRV.appels.push("relancer"); return trouve(id) || refus("relancer") || (SRV.demandes[id].vue.evenements.push({ t: Date.now(), x: "Relance envoyée" }), Promise.resolve(vueDe(id))); },
      annuler: function (id) { SRV.appels.push("annuler"); return trouve(id) || refus("annuler") || (SRV.demandes[id].vue.etat = "annule", Promise.resolve(vueDe(id))); },
      signe: function (id, n) { SRV.appels.push("signe:" + n); return trouve(id) || refus("signe") || Promise.resolve(PDFX("SIGNE " + id + " " + n)); },
      preuve: function (id, i) { SRV.appels.push("preuve:" + i); return trouve(id) || refus("preuve") || Promise.resolve(PDFX("PREUVE " + id + " " + i)); }
    };
  }
  if (mode === "demo") api.lireMX = function (d) { note("lireMX:" + d);
    var essai = function (url, headers) { return new Promise(function (ok, ko) {
      var ctl = typeof AbortController !== "undefined" ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); ko(new Error("délai")); }, 3500);
      fetch(url, { headers: headers || {}, signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.json(); }).then(function (j) { clearTimeout(t);
        if (!j || j.Status !== 0) return ok([]);
        ok((j.Answer || []).filter(function (a) { return a.type === 15; }).map(function (a) { return String(a.data).toLowerCase().split(" ").pop(); }));
      }).catch(function (e) { clearTimeout(t); ko(e); }); }); };
    var q = encodeURIComponent(d);
    return essai("https://dns.google/resolve?name=" + q + "&type=MX").catch(function () { return essai("https://cloudflare-dns.com/dns-query?name=" + q + "&type=MX", { accept: "application/dns-json" }); }); };
  api.simuler = function (quoi, p) { note("simuler:" + quoi);
    var b = liste().filter(function (x) { return x.id === (p && p.boite); })[0] || liste()[0]; if (!b) return Promise.reject(new Error("aucune boîte"));
    var k = b.cote === "pro" ? "pro" : "perso", t = ARRIVEES[k][etat.suiv[k]++ % ARRIVEES[k].length]; etat.n++;
    etat.arrivees.push({ id: "r" + etat.n, boite: b.id, dossier: "inbox", de: t.de, a: b.nom, objet: t.objet, corps: t.corps, apercu: t.corps.join(" ").slice(0, 200), date: Date.now(), lu: false, drapeau: false, pj: [] });
    garder(); return Promise.resolve(); };
  if (mode === "demo") setTimeout(function () { api.simuler("recevoir", { boite: "a1" }); }, 180000);
  return api;
}
window.OPCourrierDemo = { creer: creer, boites: BOITES, messages: MESSAGES };
})();
