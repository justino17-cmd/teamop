/* OP Courrier — le MODULE de messagerie e-mail de TeamOP (18 octobre 2026).

   Ce n'est pas une application : c'est une pièce qu'on MONTE dans une autre (la zone de contenu d'OP GESTION, la Tour, OP MESSAGES Pro).
   Un seul fichier, aucune dépendance, aucun appel réseau de sa part — tout ce qu'il lit et écrit passe par l'ADAPTATEUR (la « source »)
   que l'hôte lui donne. Ce fichier ne contient AUCUNE donnée d'exemple : sans boîte connectée, il montre un état vide qui invite à en ajouter une.

   ── Monter ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     var c = OPCourrier.monter(document.getElementById('zone'), {
       source: maSource,                 // OBLIGATOIRE — l'adaptateur de données (contrat plus bas)
       cotes: ['pro'],                   // ['pro'], ['perso'] ou les deux ; le sélecteur Pro / Perso n'apparaît que s'il y en a deux
       cote: 'pro',                      // côté ouvert au départ (sinon celui que la personne avait choisi)
       cleStockage: 'elanB_courrier',    // clé du localStorage (réglages, tri appris, brouillons) : UNE par entreprise et par appareil
       theme: function(){ return 'jour' }, // 'jour' | 'nuit' ; à défaut, l'appareil (prefers-color-scheme)
       titre: 'OP Courrier',             // nom affiché dans la barre latérale
       onCompter: function(n){},         // nombre de messages non lus en réception (pastille de l'hôte)
       titreDocument: false,             // true : « (n) » (non lus) s'écrit devant le titre de la page de l'hôte, qui lui est rendu au démontage
       intervalle: 60000                 // relevé automatique de la source, en ms (0 : jamais)
     });
     c.demonter();  c.cote('perso');  c.rafraichir();  c.rafraichir({donnees:false});   // thème + format seuls

   Le conteneur doit avoir une HAUTEUR définie (le module la remplit). Il vit dans un arbre d'ombre : sa feuille ne touche pas l'hôte, celle de
   l'hôte ne le touche pas. Les feuilles, menus et la notification passent dans la couche supérieure du navigateur (au-dessus de la barre de l'hôte).
   La mise en page (Mac ≥ 1000 px, iPad 700–999, iPhone < 700) se décide sur la LARGEUR DU CONTENEUR, pas sur celle de l'écran.

   ── Le contrat de l'adaptateur ───────────────────────────────────────────────────────────────────────────────────────────────────────────
   Toutes les méthodes sont asynchrones (elles rendent une promesse). Un échec = un rejet avec un Error dont le message est lisible : le module le DIT à l'écran.
   « Liste vide » et « on n'a pas pu savoir » ne se confondent jamais : un rejet n'est PAS un tableau vide.
     capacites()                 → { oauth, programmeServeur, signature, marquage, deplacement, reglagesServeur, simulation : booléens (faux par défaut),
                                     dossiers : ['inbox', …] les dossiers que la source remplit (les autres restent sur l'appareil),
                                     destinataires : nombre maximal par message, pj : { nombre, octets } }
     boites()                    → [ { id, email, nom, cote?:'pro'|'perso', fournisseur? } ]
     messages({boite, dossier})  → [ { id, dossier?, de:{nom,email}, a, objet, apercu?, corps:string|[paragraphes] (absent : lire(id) à l'ouverture),
                                       date:ms, lu, drapeau, pj:[{nom,taille,type}], desinscription?, vip?, destinataires?:[email] } ]
     lire(id)                    → { corps, pj? }                                  (facultatif)
     marquer(id,{lu,drapeau})    et   deplacer(id,dossier)                         (appelés seulement si capacites().marquage / .deplacement ; sinon l'état reste sur l'appareil)
     envoyer(mail)               → rien ; mail = { boite, de, nom, a, objet, texte, pieces:[File] }
     ajouterBoite(params)        → { id, email, … } ; params = { email, nom, mdp, fournisseur, cote, serveurs }
     retirerBoite(id)
     lireMX(domaine)             → [serveurs]                                      (facultatif : sans lui, jamais d'appel réseau pour reconnaître un domaine d'entreprise)
     simuler(quoi, {boite})                                                        (source de démonstration seulement, avec capacites().simulation)
   ⛔ Toutes les fonctions de la maquette sont PRÉSENTES et UTILISABLES quelle que soit la source ; « Bientôt » ne s'écrit que sur le geste précis qui exige un service qui n'existe pas :
     oauth (connexion Google / Microsoft sans mot de passe), programmeServeur (envoi à l'heure dite APPLICATION FERMÉE : sinon il part page ouverte), signature (l'ENVOI réel du document à signer :
     le parcours est utilisable jusqu'à « Envoyer »), destinataires (plusieurs destinataires), reglagesServeur (réglages de serveur personnalisés).
*/
(function () {
"use strict";
if (window.OPCourrier) return;

/* ═══ Le moteur de tri : le MÊME texte que tests/courrier-moteur-tri/classify.js (et que le futur serveur) — ne pas le modifier ici ═══ */
var OPClassify = (function () {
  "use strict";

  var CATS = [
    { id: "principal", name: "Principal" },
    { id: "notif",     name: "Notifications" },
    { id: "recus",     name: "Reçus" },
    { id: "voyages",   name: "Voyages" },
    { id: "promos",    name: "Promotions" }
  ];
  var CAT_NAME = {}; CATS.forEach(function (c) { CAT_NAME[c.id] = c.name; });

  // ---------- outils ----------
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function rawText(m) {
    var body = (m.body || []).map(function (b) { return Array.isArray(b) ? b[1] : b; }).join(" ");
    return (m.subject || "") + " " + (m.preview || "") + " " + body;
  }
  function domainOf(email) { var e = String(email || "").toLowerCase(); var i = e.lastIndexOf("@"); return i >= 0 ? e.slice(i + 1) : ""; }
  function localOf(email) { var e = String(email || "").toLowerCase(); var i = e.lastIndexOf("@"); return i >= 0 ? e.slice(0, i) : e; }
  // domaine « enregistré » : mail.apple.com -> apple.com ; impots.gouv.fr -> impots.gouv.fr ; amazon.co.uk -> amazon.co.uk
  function regDomain(dom) {
    var p = dom.split(".").filter(Boolean); if (p.length <= 2) return p.join(".");
    var sld = p[p.length - 2];
    if (/^(gouv|gov|co|com|org|net|ac|asso)$/.test(sld)) return p.slice(-3).join(".");
    return p.slice(-2).join(".");
  }
  function hits(re, s) { var m = s.match(re); return m ? m.length : 0; }
  function firstHit(re, s) { var m = s.match(re); return m ? m[0].trim() : ""; }
  function amountOf(s) { var m = s.match(RE_AMOUNT); return m ? m[0].trim() : ""; }

  // ---------- envois automatiques ----------
  var AUTO_WORDS = "no[-_]?reply|noreply|ne[-_]?pas[-_]?repondre|donotreply|do[-_]not[-_]reply|notifications?|notif|alerts?|info|infos|news|newsletters?|hello|bonjour|contact|marketing|promo|promotions?|offres?|deals?|confirmations?|billets?|e[-_]?billets?|tickets?|e[-_]?tickets?|reservations?|booking|bookings|checkin|travel|voyages?|recu|receipts?|facturation|factures?|billing|invoices?|support|service|services|customer|clients?|team|equipe|mailer|mailing|bounce|updates?|suivi|tracking|expedition|expeditions|livraison|shipping|shipment|commandes?|orders?|securite|security|compte|account|accounts|calendar|agenda|events?|evenements?|rappels?|reminders?|digest|hebdo|avis|notices?|contrats?|adherents?|adhesions?|sinistres?|prestations?|echeancier|rdv|rendez-?vous|titres";
  var AUTO_LOCAL = new RegExp("(^|[._+-])(" + AUTO_WORDS + ")($|[._+-])");
  var ESP_SUB = /^(e|em|email|emails|mail|mails|mailer|mailing|news|newsletter|info|infos|service-mail|marketing|notification|notifications|t|m|go|send|bounce|mta|comms|crm|offres|promo)\./;
  var FREE_MAIL = /^(gmail\.com|googlemail\.com|yahoo\.[a-z.]+|ymail\.com|hotmail\.[a-z.]+|outlook\.[a-z.]+|live\.[a-z.]+|msn\.com|aol\.com|gmx\.[a-z.]+|proton\.me|protonmail\.com|mail\.com|yandex\.[a-z.]+|icloud\.com|me\.com|orange\.fr|wanadoo\.fr|free\.fr|sfr\.fr|laposte\.net|neuf\.fr|bbox\.fr)$/;
  var NOTIF_DOMAINS = /^(github\.com|gitlab\.com|slack\.com|linkedin\.com|atlassian\.(com|net)|zendesk\.com|trello\.com|asana\.com|notion\.so|doctolib\.(fr|de)|google\.com|microsoft\.com|facebookmail\.com|discord\.com|calendly\.com|docusign\.(net|com)|dropbox(mail)?\.com|wetransfer\.com|yousign\.(com|fr))$/;
  var TRAVEL_DOMAINS = /^(sncf|sncf-connect|oui|ouigo|tgv-inoui|trainline|eurostar|thalys|airfrance|klm|easyjet|ryanair|transavia|vueling|lufthansa|britishairways|volotea|booking|airbnb|expedia|hotels|accor|all|ibis|blablacar|europcar|hertz|sixt|avis|getaround|flixbus|kayak|opodo|edreams|lastminute|abritel|gites-de-france)\.[a-z.]+$/;

  // ---------- vocabulaire (texte normalisé : minuscules, sans accents) ----------
  var RE_RECEIPT = /\b(recu|recus|facture|factures|invoice|receipt|paiement|payment|payee?s?|paid|charged|montant|amount|total|commande n|numero de commande|order (confirmation|number|#)|ticket de caisse|remboursement|refund|prelevement|prelevee?s?|preleve|debitee?s?|debite|cotisations?|abonnement|subscription|renouvellement|renewal|transaction|avoir|ttc|ht)\b/g;
  var RE_AMOUNT = /\d+(?:[  .]\d{3})*[,.]\d{2}\s?(?:€|eur\b|euros?\b|\$|£|usd\b)|[€$£]\s?\d+(?:[,.]\d{2})?/g;
  var RE_TRAVEL = /\b(billets?|e-?billets?|e-?tickets?|tickets are ready|vols?|flights?|train|tgv|ter|ouigo|inoui|embarquement|carte d.embarquement|boarding( pass)?|porte [a-z]?\d+|gate [a-z]?\d+|reservation|booking (reference|confirmed|confirmation)|hotel|hotels|sejour|stay|check-?in|aeroport|airport|gare|voiture \d+|coach \d+|place \d+|seat \d+|itineraire|itinerary|location de (voiture|vehicule)|car rental|prise en charge|pick-?up|depart|departure|arrivee|arrival|aller|retour|nuits?|nights?|ferry|ferries|traversee|crossing|camping|emplacement|mobil-home|gite|gites)\b/g;
  var RE_TXN = /(confirmation de (votre )?commande|commande (n|no|numero)\s?[°º]?\s?[a-z0-9]|commande confirmee|order (confirmed|confirmation|#)|your order|ticket de caisse|confirmation de prelevement|nous vous confirmons le prelevement|total paye|montant total|payment (received|confirmed)|votre (recu|facture) (est|du|n)|merci pour votre (commande|achat|paiement))/;
  var RE_PROMO = /\b(promo|promos|promotion|promotions|soldes|sale|sales|reduction|remise|discount|offre|offres|offer|offers|deal|deals|code promo|black friday|cyber monday|vente privee|ventes privees|bon plan|bons plans|exclusivite|exclusif|exclusive|newsletter|lettre d.information|programme de la semaine|nouveautes|nouvelle collection|new arrivals|what.s new|introducing|derniers jours|last chance|limited time|shop now|achetez|commandez|profitez|a prix reduit|au lieu de|prix (ont )?(chute|baisse)|baisse de prix|a partir de \d|offre valable|valable jusqu|webinaire|webinar|inscrivez-vous|inscription gratuite|replay|anniversaire|cadeau offert|livraison offerte|frais de port offerts|a la une|au sommaire|edition du|la matinale|new in|free trial|essai gratuit|try [a-z ]{0,20}free|live demo|demo en direct|join our|rejoignez-nous|start (a|your) free|decouvrez (nos|notre|les nouveautes))\b|-\s?\d{1,2}\s?%|\d{1,2}\s?% (de reduction|off|offerts?)/g;
  var RE_NOTIF = /\b(notification|notifications|alerte|alertes|alert|alerts|security alert|alerte de securite|assignee?|assigne|nouveaux? messages?|new messages?|message direct|direct message|rappel|reminder|connexion|nouvelle connexion|new sign-?in|mot de passe|password|code de verification|verification code|code de securite|ticket #?\d+|demande n|a ete resolu|resolved|mise a jour|updated|activite|activity|mentionne|mentioned|a commente|commented|a repondu|replied|pull request|merge request|issue|invitation|evenement|event|rendez-vous|appointment|expedie|expediee|shipped|en cours de livraison|out for delivery|livre|delivered|suivi de (colis|commande)|tracking|releve|e-?releve|statement|disponible dans votre espace)\b/g;

  // ---------- indésirables ----------
  var RE_SCAM = /(tire au sort|vous avez (ete )?(gagne|selectionne)|gagnant|felicitations ?!|cadeau exceptionnel|heritage|heritier|succession de feu|feu (m|mr|mme|monsieur|madame)\b|deced\w* sans heritier|compte bloque|fonds en desherence|urgent et confidentiel|strictement confidentiel|transfert de fonds|investissement garanti|rendement garanti|revenus passifs|trading automatise|plateforme de trading|transforme \d+[  ]?€ en|doubler votre (capital|argent)|doublez votre|independance financiere|cliquez (vite|immediatement|ici)|reclamer|reclamez|avant expiration|action requise|compte (suspendu|bloque|desactive|limite)|acces (en ligne )?(sera )?suspendu|carte (bancaire )?(sera )?bloquee|sous (24|48) ?h|verifiez votre (compte|identite)|verifier vos informations|confirmez vos (coordonnees|informations)|mise a jour de (vos|votre) (informations|coordonnees)|mettez a jour votre (paiement|moyen de paiement)|colis (est )?en attente|frais de (livraison|port) impayes|remboursement en attente|eligible a un remboursement|avis de contravention|majoration|has been (locked|suspended|limited)|account (is )?(locked|suspended|limited)|verify your (account|identity)|unusual (activity|sign-?in)|confirm your (identity|details)|mot de passe de votre messagerie|saisi(r|ssez) vos identifiants|expire dans \d+ ?(h|heures)|ce document expire|dernier rappel avant (contentieux|poursuites|mise en demeure)|service contentieux|indemnite forfaitaire|recouvrement force|procedure de recouvrement|sous (24|48|72) ?h(eures)?|regulariser votre situation|strictement confidentiel|n.en parle a personne|je suis en reunion|je ne peux pas (prendre d.appel|repondre)|virement (urgent|aujourd.hui|confidentiel|international)|es-tu (a ton|au) bureau|dossier d.acquisition|from your own account|depuis votre propre (compte|adresse)|malware|webcam|recorded you|all your contacts|tous vos contacts|\bbtc\b|\d+(?:[,.]\d+)? ?% (par an )?garanti|taux garanti|il (ne )?reste( que)? \d+ places|nombre limite d.epargnants|sans risque|capital garanti|trop-percu|a recuperer|coordonnees bancaires (ne sont plus valides|invalides|a mettre a jour)|confirmer vos informations et vos coordonnees|permanently deleted|permanent deletion|scheduled for (permanent )?deletion|will be (permanently )?(deleted|disabled|removed)|submit an appeal|cannot be restored|violates our|frais de (reexpedition|douane)|aucune experience (n.est )?requise|sans experience requise|\d+ ?€ (a|et) \d+ ?€ par jour|\d+ ?€ par (jour|heure) .{0,30}(teletravail|domicile)|versee? quotidiennement|pour finaliser votre inscription|frais (d.inscription|de formation|de dossier)|contactez-moi (sur|par) (whatsapp|telegram)|evaluation (de )?produits|my dear|dear friend|hello dear|honest and kind|peacekeeping|us army|i am a widower|je suis veuf|raise my daughter|god bless|mission de paix)/g;
  var SUSPICIOUS_TLD = /\.(xyz|top|click|work|loan|biz|buzz|rest|cam|gq|tk|ml|cf|ga|icu|monster|info|live|online|site|shop|cyou|sbs|cfd)$/;
  var SCAMMY_DOMAIN = /(crypto|bitcoin|invest|gains?|cash|loto|lottery|winner|prize|cadeau|gagnant|bonus)/;
  var TITLE_WORDS = /\b(maitre|me|notaire|avocat|huissier|banquier|barrister|lawyer|attorney|directeur|directrice|direction|dg|pdg|president|presidente|gerant|gerante|ceo|cfo|boss|sgt|sergeant|soldier|captain|army)\b/;

  // Marques souvent imitées et leurs domaines officiels.
  var BRANDS = [
    { n: "PayPal",           re: /paypal/,                                tok: ["paypal"],                         off: ["paypal.com", "paypal.fr", "paypal.be", "paypal-communication.com"] },
    { n: "Apple",            re: /\bapple\b|icloud|app store|itunes/,     tok: ["apple", "appleid", "icloud", "itunes"], off: ["apple.com", "icloud.com", "me.com"] },
    { n: "Netflix",          re: /netflix/,                               tok: ["netflix"],                        off: ["netflix.com", "netflix.net", "mailer.netflix.com"] },
    { n: "Amazon",           re: /amazon/,                                tok: ["amazon"],                         off: ["amazon.fr", "amazon.com", "amazon.de", "amazon.co.uk", "amazon.es", "amazon.it", "amazon.be"] },
    { n: "La Poste",         re: /la poste|laposte|colissimo|chronopost/, tok: ["laposte", "colissimo", "chronopost"], off: ["laposte.fr", "laposte.net", "colissimo.fr", "chronopost.fr", "labanquepostale.fr"] },
    { n: "les impôts",       re: /impots|dgfip|finances publiques|tresor public/, tok: ["impots", "dgfip"], gouv: true },
    { n: "l'ANTAI",          re: /\bantai\b/,                             tok: ["antai"], gouv: true },
    { n: "l'Assurance Maladie", re: /ameli|assurance maladie|\bcpam\b/,    tok: ["ameli", "cpam"],                   off: ["ameli.fr", "assurance-maladie.fr"] },
    { n: "la CAF",           re: /\bcaf\b/,                               tok: ["caf"],                            off: ["caf.fr"] },
    { n: "le Crédit Agricole", re: /credit agricole/,                     tok: ["credit-agricole", "creditagricole"], off: ["credit-agricole.fr", "credit-agricole.com"], offRe: /^ca-[a-z0-9-]+\.fr$/ },
    { n: "BNP Paribas",      re: /\bbnp\b/,                               tok: ["bnp", "bnpparibas"],              off: ["bnpparibas.com", "bnpparibas.fr", "bnpparibas.net"] },
    { n: "la Société Générale", re: /societe generale/,                   tok: ["societegenerale", "societe-generale"], off: ["societegenerale.fr", "societegenerale.com", "sg.fr"] },
    { n: "LCL",              re: /\blcl\b/,                               tok: ["lcl"],                            off: ["lcl.fr", "lcl.com"] },
    { n: "le Crédit Mutuel", re: /credit mutuel|\bcic\b/,                 tok: ["creditmutuel", "credit-mutuel"],  off: ["creditmutuel.fr", "cic.fr", "e-i.com"] },
    { n: "Boursorama",       re: /boursorama|boursobank/,                 tok: ["boursorama", "boursobank"],       off: ["boursorama.com", "boursobank.com", "boursorama-banque.com"] },
    { n: "Orange",           re: /\borange\b/,                            tok: ["orange"],                         off: ["orange.fr", "orange.com", "orange-business.com", "sosh.fr"] },
    { n: "SFR",              re: /\bsfr\b/,                               tok: ["sfr"],                            off: ["sfr.fr", "sfr.com", "red-by-sfr.fr"] },
    { n: "Free",             re: /\bfree( mobile)?\b/,                    tok: ["free"],                           off: ["free.fr", "free-mobile.fr", "freebox.fr", "free.org", "iliad.fr"] },
    { n: "EDF",              re: /\bedf\b/,                               tok: ["edf"],                            off: ["edf.fr", "edf.com"] },
    { n: "Microsoft",        re: /microsoft|outlook|office 365|onedrive/, tok: ["microsoft", "office365", "onedrive"], off: ["microsoft.com", "outlook.com", "office.com", "live.com", "microsoftonline.com", "office365.com"] },
    { n: "Google",           re: /\bgoogle\b/,                            tok: ["google"],                         off: ["google.com", "youtube.com", "withgoogle.com", "googlemail.com"] },
    { n: "DocuSign",         re: /docusign/,                              tok: ["docusign"],                       off: ["docusign.com", "docusign.net"] },
    { n: "l'URSSAF",         re: /urssaf/,                                tok: ["urssaf"],                         off: ["urssaf.fr", "net-entreprises.fr", "urssaf.org"] },
    { n: "Engie",            re: /\bengie\b/,                            tok: ["engie"],                          off: ["engie.fr", "engie.com"] },
    { n: "TotalEnergies",    re: /totalenergies|total energies/,          tok: ["totalenergies"],                  off: ["totalenergies.fr", "totalenergies.com"] },
    { n: "Meta / Facebook",  re: /\bmeta\b|facebook|instagram|whatsapp/,  tok: ["meta", "facebook", "instagram", "whatsapp"], off: ["facebookmail.com", "meta.com", "facebook.com", "instagram.com", "whatsapp.com", "metamail.com"] },
    { n: "France Travail",   re: /france travail|pole emploi/,            tok: ["francetravail", "pole-emploi", "poleemploi"], off: ["francetravail.fr", "pole-emploi.fr", "francetravail.org"] },
    { n: "l'ANTS",           re: /\bants\b/,                              tok: ["ants"], gouv: true },
    { n: "la Caisse d'Épargne", re: /caisse d.epargne/,                   tok: ["caisse-epargne", "caisseepargne", "caisse-d-epargne"], off: ["caisse-epargne.fr", "ce.fr"] },
    { n: "la Banque Populaire", re: /banque populaire/,                    tok: ["banquepopulaire", "banque-populaire"], off: ["banquepopulaire.fr", "bp.fr"] },
    { n: "Bouygues Telecom", re: /bouygues/,                              tok: ["bouygues", "bouyguestelecom"],    off: ["bouyguestelecom.fr", "bouygues-telecom.fr", "bouygues.com"] },
    { n: "Dropbox",          re: /dropbox/,                               tok: ["dropbox"],                        off: ["dropbox.com", "dropboxmail.com"] },
    { n: "WeTransfer",       re: /wetransfer/,                            tok: ["wetransfer"],                     off: ["wetransfer.com"] },
    { n: "Vinted",           re: /vinted/,                                tok: ["vinted"],                         off: ["vinted.fr", "vinted.com"] },
    { n: "Leboncoin",        re: /leboncoin|bon coin/,                    tok: ["leboncoin"],                      off: ["leboncoin.fr"] },
    { n: "Doctolib",         re: /doctolib/,                              tok: ["doctolib"],                       off: ["doctolib.fr", "doctolib.com", "doctolib.de"] },
    { n: "DHL",              re: /\bdhl\b/,                               tok: ["dhl"],                            off: ["dhl.com", "dhl.fr", "dhl.de"] },
    { n: "UPS",              re: /\bups\b/,                               tok: ["ups"],                            off: ["ups.com"] },
    { n: "FedEx",            re: /fedex/,                                 tok: ["fedex"],                          off: ["fedex.com"] }
  ];
  function deTypo(s) { return s.replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/rn/g, "m").replace(/vv/g, "w"); }
  function impersonation(nameN, dom) {
    var reg = regDomain(dom), first = reg.split(".")[0], parts = first.split("-"), typoed = deTypo(first);
    for (var i = 0; i < BRANDS.length; i++) {
      var b = BRANDS[i];
      var official = b.gouv ? /\.gouv\.fr$/.test(dom) : (b.off.indexOf(reg) >= 0 || b.off.indexOf(dom) >= 0 || (b.offRe && b.offRe.test(reg)));
      if (official) continue;
      var inDom = b.tok.some(function (t) { return t.length >= 5 ? first.indexOf(t) >= 0 : parts.indexOf(t) >= 0; });
      var typo = !inDom && b.tok.some(function (t) { return t.length >= 5 && typoed.indexOf(t) >= 0; });
      var inName = b.re.test(nameN);
      if (typo) return { pts: 6, why: "adresse qui imite " + b.n + " (" + reg + ")" };
      if (inDom) return { pts: 5, why: "se fait passer pour " + b.n + " depuis un domaine non officiel (" + reg + ")" };
      if (inName && !FREE_MAIL.test(reg)) return { pts: 4, why: "porte le nom de " + b.n + " mais écrit depuis " + reg };
      if (inName) return { pts: 5, why: "porte le nom de " + b.n + " mais écrit depuis une messagerie gratuite" };
    }
    var TRAP = /^(securite|secure|securise|securisee?|verification|verif|verify|validation|assistance|remboursements?|refunds?|recouvrement|appeals?|esignature|signature|login|auth|update|maj|alerte|alert|confirm|activation|reactivation|deblocage|unlock|helpdesk|espace|assure|client|clients|suivi|livraison|colis|paiement|payment|facturation)$/;
    var nameWords = nameN.split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3 && !/^(service|support|team|equipe|the|les|des|via|business|client|clients)$/.test(w); });
    if (parts.length >= 2 && parts.some(function (p) { return TRAP.test(p); }) && nameWords.some(function (w) { return parts.indexOf(w) >= 0 || first.indexOf(w) === 0; }))
      return { pts: 5, why: "faux domaine « nom de l'expéditeur + " + parts.filter(function (p) { return TRAP.test(p); })[0] + " » (" + reg + ")" };
    if (parts.length >= 2 && parts[parts.length - 1] === "fr" && !/\.fr$/.test(dom)) return { pts: 3, why: "domaine qui imite une adresse française (" + reg + ")" };
    if (/(^|[.-])(gouv|gov)([.-]|$)/.test(dom) && !/\.gouv\.fr$|\.gov(\.[a-z]{2})?$/.test(dom)) return { pts: 5, why: "imite un site officiel « gouv » sans en être un (" + reg + ")" };
    return null;
  }
  function isAllCapsShout(subj) {
    var letters = subj.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
    if (letters.length < 8) return false;
    var up = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, "").length;
    return up / letters.length > 0.6;
  }
  function spamOf(m) {
    var raw = rawText(m), t = norm(raw), subj = String(m.subject || ""), score = 0, why = [];
    var email = String(m.from && m.from.email || "").toLowerCase(), dom = domainOf(email), reg = regDomain(dom), first = reg.split(".")[0];
    var nameN = norm(m.from && m.from.name);
    var scam = hits(RE_SCAM, t);
    if (scam) { score += 3 + Math.min(scam - 1, 2); why.push("formules typiques d'arnaque (« " + firstHit(RE_SCAM, t) + " »)"); }
    var imp = impersonation(nameN, dom);
    if (imp) { score += imp.pts; why.push(imp.why); }
    if (isAllCapsShout(subj)) { score += 2; why.push("objet écrit en majuscules"); }
    if (/!{2,}|🎉|💰|🤑|🎁|💸/.test(subj)) { score += 1; why.push("ponctuation ou émojis racoleurs"); }
    if (SUSPICIOUS_TLD.test(dom)) { score += 2; why.push("extension de domaine souvent utilisée par les arnaques (" + dom.split(".").pop() + ")"); }
    if (SCAMMY_DOMAIN.test(first)) { score += 2; why.push("nom de domaine racoleur (" + reg + ")"); }
    if (/\d{3,}|-[^-]*-/.test(first)) { score += 1; why.push("adresse d'envoi douteuse"); }
    if (FREE_MAIL.test(reg) && (TITLE_WORDS.test(nameN) || TITLE_WORDS.test(norm(localOf(email).replace(/[._-]/g, " "))))) { score += 2; why.push("un « professionnel » qui écrit depuis une messagerie gratuite"); }
    return { score: score, why: why };
  }

  // ---------- catégorie ----------
  function categoryOf(m, known) {
    var raw = rawText(m), t = norm(raw);
    var email = String(m.from && m.from.email || "").toLowerCase(), dom = domainOf(email), reg = regDomain(dom), loc = localOf(email);
    var brandLocal = loc === reg.split(".")[0];               // ex. ryanair@email.ryanair.com
    var travelDom = TRAVEL_DOMAINS.test(reg), notifDom = NOTIF_DOMAINS.test(reg);
    var nameRaw = String(m.from && m.from.name || "");
    var relay = /[\s(]via\s/i.test(nameRaw);
    var automated = AUTO_LOCAL.test(loc) || ESP_SUB.test(dom) || brandLocal || !!m.unsub || notifDom || relay;
    var personName = /^[A-ZÀ-Ý][a-zà-ÿ'-]+(\s[A-ZÀ-Ý][a-zà-ÿ'-]+){1,2}$/.test(nameRaw.trim()) || /^[A-ZÀ-Ý][a-zà-ÿ'-]+\s*[-–|,]\s*\S/.test(nameRaw.trim());
    var firstPerson = /(^|[\s.,;!?«"(])(je|j'|j’)(?=[\s'’a-z])/.test(t);
    if (automated && personName && firstPerson && !relay && !notifDom && !travelDom && !m.unsub)
      return { cat: "principal", why: ["écrit personnellement par " + nameRaw.trim() + " (depuis une adresse générique)"] };
    if (!automated && !travelDom) return { cat: "principal", why: [known ? "contact connu" : "écrit par une personne"] };

    var promo = hits(RE_PROMO, t) + hits(RE_PROMO, norm(m.subject)) + (/\bcode( promo)?\s*:?\s*[A-Z][A-Z0-9]{4,}\b/.test(raw) ? 1 : 0);
    var notif = hits(RE_NOTIF, t) + (notifDom ? 1 : 0);
    var txn = RE_TXN.test(t);
    var rec = hits(RE_RECEIPT, t), amt = hits(RE_AMOUNT, t);
    var trv = hits(RE_TRAVEL, t) + (travelDom ? 2 : 0);
    var promoWhy = function () { return [m.unsub ? "envoi en masse (lien de désabonnement)" : "", firstHit(RE_PROMO, t) ? "« " + firstHit(RE_PROMO, t) + " »" : ""].filter(Boolean); };

    // 0a. un voyage reste un voyage, même avec un « montant total »
    if ((trv >= 3 || (travelDom && trv >= 2)) && promo === 0) return { cat: "voyages", why: [travelDom ? "transporteur ou hébergeur (" + reg + ")" : "réservation ou trajet", firstHit(RE_TRAVEL, t) ? "« " + firstHit(RE_TRAVEL, t) + " »" : ""].filter(Boolean) };
    // 0. reçu explicite (commande, ticket de caisse, prélèvement + montant), même s'il contient de la pub
    if (txn && amt >= 1 && !relay) return { cat: "recus", why: ["montant " + amountOf(t), "« " + (t.match(RE_TXN) || [""])[0] + " »"] };
    // 1. publicité / newsletter : contenu promotionnel dans un envoi de masse
    if (m.unsub && promo >= 1 && (!notifDom || promo > notif)) return { cat: "promos", why: promoWhy() };
    // 2. voyages
    if (trv >= 3 || (travelDom && trv >= 2 && promo === 0)) return { cat: "voyages", why: [travelDom ? "transporteur ou hébergeur (" + reg + ")" : "réservation ou trajet", firstHit(RE_TRAVEL, t) ? "« " + firstHit(RE_TRAVEL, t) + " »" : ""].filter(Boolean) };
    // 3. reçus et factures
    if (rec >= 1 && (amt >= 1 || rec >= 2) && promo < 2 && !((notifDom || relay) && !txn)) return { cat: "recus", why: [amt ? "montant " + amountOf(t) : "", "« " + firstHit(RE_RECEIPT, t) + " »"].filter(Boolean) };
    // 4. pub sans signal de notification
    if ((m.unsub && notif === 0) || (promo >= 2 && promo > notif)) return { cat: "promos", why: promoWhy() };
    // 5. le reste des envois automatiques
    return { cat: "notif", why: ["envoi automatique de " + (reg || "un service"), firstHit(RE_NOTIF, t) ? "« " + firstHit(RE_NOTIF, t) + " »" : ""].filter(Boolean) };
  }

  function classify(m, ctx) {
    ctx = ctx || {};
    var rules = ctx.rules || { senders: {}, domains: {} };
    var email = String(m.from && m.from.email || "").toLowerCase(), dom = domainOf(email), reg = regDomain(dom);
    var known = !!(ctx.contacts && ctx.contacts[email]) || !!m.vip;
    var sRule = rules.senders && rules.senders[email], dRule = rules.domains && (rules.domains[dom] || rules.domains[reg]);
    var rule = sRule || dRule, ruleSrc = sRule ? email : reg;

    if (rule === "junk") return { cat: "principal", junk: true, spamScore: 99, reasons: ["vous avez classé " + ruleSrc + " en indésirable"] };
    if (rule && rule !== "notjunk" && CAT_NAME[rule]) return { cat: rule, junk: false, spamScore: 0, reasons: ["votre règle : toujours ranger " + ruleSrc + " dans " + CAT_NAME[rule]] };

    var c = categoryOf(m, known), s = spamOf(m);
    var trusted = known || rule === "notjunk";
    if (!trusted && s.score >= 5) return { cat: c.cat, junk: true, spamScore: s.score, reasons: s.why };
    var reasons = c.why.slice();
    if (rule === "notjunk") reasons.unshift("vous avez indiqué que " + ruleSrc + " n'est pas indésirable");
    else if (known && s.score >= 5) reasons.unshift("contact connu : jamais mis en indésirable");
    return { cat: c.cat, junk: false, spamScore: s.score, reasons: reasons };
  }

  return { CATS: CATS, CAT_NAME: CAT_NAME, classify: classify, domainOf: domainOf, regDomain: regDomain };
})();

/* ═══ La feuille de style : tout est sous .opc (un banc le vérifie), rien de global ; construite UNE fois, partagée par tous les montages ═══ */
var CSS = `
  /* OP Courrier — « direction Apple » de l'écosystème OP.
     Une seule teinte d'accent (bleu nuit OP #2a4a9c le jour / #8fb0ff la nuit), gris système iOS/macOS,
     typo système SF. Trois mises en page :
       • Mac (≥ 1000 px)    : barre latérale « matière », barre d'outils unifiée, liste, lecture ;
       • iPad (700–999 px)  : vue partagée liste + lecture, barre latérale en colonne superposée ;
       • iPhone (< 700 px)  : pile de navigation Boîtes → liste → message, barres d'outils en bas.
     Textes secondaires assombris par rapport aux valeurs Apple par défaut pour tenir le contraste AA. */
  /* ⛔ all:initial : les propriétés HÉRITÉES de l'hôte (police, interlettrage, couleur, alignement, direction…) traversent un arbre d'ombre — sans cette remise à zéro, le
     letter-spacing d’un div de l’hôte se retrouve dans toute la messagerie. Les variables (--x) ne sont pas touchées par all. */
  .opc{
    all:initial; display:block; color-scheme:light;
    --tint:#2a4a9c; --tint-2:#3557b0; --on-tint:#ffffff;
    --tint-soft:rgba(42,74,156,.09); --tint-soft-2:rgba(42,74,156,.16);
    --sel:#2a4a9c; --on-sel:#ffffff; --on-sel-2:rgba(255,255,255,.86);
    --side-sel:rgba(0,0,0,.075);
    --red:#ff3b30; --red-text:#d70015; --flag:#ff9500; --flag-edge:#b86200;
    --wall:linear-gradient(160deg,#dde4f3 0%,#ebe8f1 48%,#e3eaee 100%);
    --win:#ffffff; --plain:#ffffff;
    --grouped:#f2f2f7; --cell:#ffffff; --grouped-elev:#f2f2f7; --cell-elev:#ffffff;
    --side:rgba(246,246,249,.74); --side-pad:rgba(246,246,249,.97);
    --bar-ios:rgba(249,249,250,.9); --menu:rgba(250,250,252,.985); --sheet-bar:#ffffff;
    --scrim-mac:rgba(0,0,0,.06); --pop-edge:rgba(0,0,0,.12); --banner-btn-t:#ffffff; --dotc-ring:none;
    --popup-chev:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cpath d='M1.6 4.6 4 2.2l2.4 2.4M1.6 7.4 4 9.8l2.4-2.4' fill='none' stroke='%235e5e63' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    --label:#1d1d1f; --label-2:#5e5e63; --label-3:rgba(60,60,67,.34); --glyph:#6e6e73;
    --sep:rgba(60,60,67,.29); --sep-mac:rgba(0,0,0,.1);
    --fill:rgba(118,118,128,.12); --fill-2:rgba(118,118,128,.08);
    --hover:rgba(0,0,0,.045); --press:rgba(0,0,0,.08); --cell-press:#e5e5ea;
    --seg-on:#ffffff; --btn:#ffffff; --btn-edge:rgba(0,0,0,.16);
    --avatar:linear-gradient(180deg,#6f747d,#50545b); --pill:rgba(42,74,156,.13); --banner-btn:#ffffff;
    --toast:rgba(32,32,34,.92); --toast-link:#b4c8ff;
    /* Pro / Perso : deux univers, chacun sa couleur (pastilles et badges) */
    --pro:#17602a; --pro-soft:rgba(36,138,61,.13); --pro-tile:#248a3d;
    /* point du compte dans les vues à plusieurs comptes : teinte de son univers, jamais celle du point « non lu » */
    --acc-pro-0:#248a3d; --acc-pro-1:#0f7d74; --acc-pro-2:#6f7a12; --acc-perso-0:#3557b0; --acc-perso-1:#5856d6; --acc-perso-2:#0a6d86;
    --perso:#2a4a9c; --perso-soft:rgba(42,74,156,.11); --perso-tile:#2a4a9c;
    /* Catégories du tri automatique (pastille choisie = fond plein, texte --on-cat) */
    --cat-principal:#2a4a9c; --cat-notif:#7a3fb0; --cat-recus:#1e7a3c; --cat-voyages:#0a6d86; --cat-promos:#b5245c; --cat-tout:#545458; --on-cat:#ffffff;
    --warn-soft:rgba(255,59,48,.08); --switch-on:#34c759; --switch-off:rgba(120,120,128,.3);
    --scrim:rgba(0,0,0,.22);
    --shadow-pop:0 0 0 .5px rgba(0,0,0,.12),0 12px 34px rgba(0,0,0,.18);
    --shadow-sheet:0 0 0 .5px rgba(0,0,0,.12),0 24px 70px rgba(0,0,0,.28);
    --hair:1px;
    --ease:cubic-bezier(.32,.72,0,1);
    --font:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue","Segoe UI",system-ui,sans-serif;
    --font-d:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue","Segoe UI",system-ui,sans-serif;
    --side-w:244px; --list-w:clamp(300px,27cqw,392px);
  }
  @media all { .opc:where([data-theme="nuit"]){
    color-scheme:dark;
    --tint:#7ea2f0; --tint-2:#9db8f5; --on-tint:#0b1633;
    --tint-soft:rgba(126,162,240,.2); --tint-soft-2:rgba(126,162,240,.3);
    --sel:#3b63c4; --on-sel:#ffffff; --on-sel-2:rgba(255,255,255,.86);
    --side-sel:rgba(255,255,255,.1);
    --red:#ff453a; --red-text:#ff6961; --flag:#ff9f0a; --flag-edge:#ff9f0a;
    --wall:#0b1633;
    --win:#0b1633; --plain:#0b1633;
    --grouped:#0b1633; --cell:#16244b; --grouped-elev:#16244b; --cell-elev:#203262;
    --side:rgba(14,26,58,.82); --side-pad:rgba(18,31,66,.97);
    --bar-ios:rgba(14,26,58,.86); --menu:rgba(22,36,76,.985); --sheet-bar:#121f42;
    --scrim-mac:rgba(0,0,0,.22); --pop-edge:rgba(255,255,255,.14); --banner-btn-t:#16244b; --dotc-ring:0 0 0 1px rgba(255,255,255,.28);
    --popup-chev:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cpath d='M1.6 4.6 4 2.2l2.4 2.4M1.6 7.4 4 9.8l2.4-2.4' fill='none' stroke='%23aeaeb6' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    --label:#ffffff; --label-2:rgba(220,228,250,.66); --label-3:rgba(220,228,250,.3); --glyph:rgba(220,228,250,.74);
    --sep:rgba(120,140,200,.3); --sep-mac:rgba(120,140,200,.22);
    --fill:rgba(120,140,200,.2); --fill-2:rgba(120,140,200,.13);
    --hover:rgba(255,255,255,.06); --press:rgba(255,255,255,.1); --cell-press:#203262;
    --seg-on:#3d4f80; --btn:rgba(255,255,255,.12); --btn-edge:rgba(255,255,255,.06);
    --avatar:linear-gradient(180deg,#5f6f97,#3d4b70); --pill:rgba(126,162,240,.15); --banner-btn:rgba(0,0,0,.28);
    --toast:rgba(28,44,90,.96); --toast-link:#b4c8ff;
    --pro:#7fdc95; --pro-soft:rgba(48,209,88,.18); --pro-tile:#248a3d;
    --acc-pro-0:#5fd27c; --acc-pro-1:#4fd1c5; --acc-pro-2:#cfd46a; --acc-perso-0:#8fb0ff; --acc-perso-1:#b7a2ff; --acc-perso-2:#64d2ff;
    --perso:#c7d6fb; --perso-soft:rgba(126,162,240,.2); --perso-tile:#3b63c4;
    --cat-principal:#9db8f5; --cat-notif:#d0b0ff; --cat-recus:#7fd89a; --cat-voyages:#7fd4ea; --cat-promos:#ff9ec6; --cat-tout:#d1d1d6; --on-cat:#0b1633;
    --warn-soft:rgba(255,69,58,.16); --switch-on:#30d158; --switch-off:rgba(120,120,128,.42);
    --scrim:rgba(3,8,24,.55);
    --shadow-pop:0 0 0 .5px rgba(255,255,255,.12),0 12px 34px rgba(0,0,0,.55);
    --shadow-sheet:0 0 0 .5px rgba(255,255,255,.12),0 24px 70px rgba(0,0,0,.6);
  }}
  @media (min-resolution:2dppx) { .opc{ --hair:.5px } }

  /* ---------- Base ---------- */
  .opc, .opc *{box-sizing:border-box}
  .opc [hidden]{display:none !important}
  .opc{height:100%;margin:0;color:var(--label);font:13px/1.38 var(--font);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%;text-size-adjust:100%;
    /* encoches : l'application hôte gère déjà les siennes (barre, onglets) — le module n'en ajoute pas */
    --sa-top:0px;--sa-bottom:0px;--sa-left:0px;--sa-right:0px}
  /* le cadre : remplit son conteneur, enferme ses empilements (z-index) et sert de conteneur aux unités cqw ; le calque (feuilles, menus, notification) est fixé à l'écran,
     dans la couche supérieure du navigateur */
  .opc .opc-root{position:relative;height:100%;overflow:hidden;isolation:isolate;container-type:inline-size;background:var(--win)}
  .opc .opc-layer{position:fixed;inset:0;width:auto;height:auto;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:visible;background:none;color:inherit;pointer-events:none}
  .opc .opc-layer .overlay{pointer-events:auto}
  .opc button{font:inherit;color:inherit;background:none;border:0;margin:0;padding:0;cursor:pointer;-webkit-appearance:none;appearance:none;text-align:inherit}
  .opc input,.opc textarea,.opc select{font:inherit;color:inherit}
  .opc h1,.opc h2,.opc h3,.opc p{margin:0;font:inherit}
  .opc svg{display:block;flex:none}
  .opc :focus{outline:none}
  .opc :focus-visible{outline:2px solid var(--tint);outline-offset:2px}
  .opc [tabindex="-1"]:focus-visible{outline:none}
  .opc .sr{position:absolute !important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}

  /* ---------- Squelette Mac ---------- */
  .opc .app{position:relative;height:100%;display:grid;grid-template-columns:var(--side-w) var(--list-w) minmax(0,1fr);grid-template-rows:minmax(0,1fr);background:var(--wall);overflow:hidden}
  .opc .view{position:relative;min-width:0;min-height:0;display:flex;flex-direction:column}
  .opc .scroller{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain}
  .opc .bar{flex:none;position:relative;z-index:6;height:52px;display:flex;align-items:center;gap:2px;padding:0 10px}
  .opc .slot{display:contents}
  .opc .tools,.opc .compose-fixed,.opc .scrim{display:none}

  /* Boutons de barre d'outils (glyphes gris façon macOS) */
  .opc .tb{flex:none;width:34px;height:28px;border-radius:6px;display:inline-grid;place-items:center;color:var(--glyph);transition:background-color .12s,color .12s}
  .opc .tb svg{width:19px;height:19px}
  .opc .tb:hover{background:var(--hover);color:var(--label)}
  .opc .tb:active{background:var(--press)}
  .opc .tb[disabled]{opacity:.3;pointer-events:none}
  .opc .tb.on-flag{color:var(--flag)}
  .opc .tsep{flex:none;width:12px;height:18px;margin:0;background:none}


  /* ---------- Barre latérale (Mac : matière translucide) ---------- */
  .opc .sidebar{grid-column:1;grid-row:1;background:var(--side);-webkit-backdrop-filter:saturate(1.8) blur(40px);backdrop-filter:saturate(1.8) blur(40px);border-right:var(--hair) solid var(--sep-mac);padding-left:var(--sa-left)}
  .opc .side-top{gap:8px;padding:0 12px 0 18px}
  .opc .brand{display:flex;align-items:center;gap:8px;min-width:0}
  .opc .glyph{flex:none;width:22px;height:22px;border-radius:6px;display:grid;place-items:center;color:#fff;background:linear-gradient(180deg,#5373c8,#2a4a9c);box-shadow:inset 0 0 0 .5px rgba(0,0,0,.18),0 1px 2px rgba(0,0,0,.14)}
  .opc .glyph svg{width:14px;height:14px}
  .opc .wm{font-weight:700;font-size:13px;white-space:nowrap}
  .opc .nb-title,.opc .side-lt{display:none}
  .opc .side-scroll{padding:0 10px 12px}
  .opc #sideBody{display:flex;flex-direction:column;min-height:100%}
  .opc .sgroup{margin-top:12px}
  .opc .sgroup:first-child{margin-top:2px}
  .opc .shead{font-size:11px;font-weight:700;color:var(--label-2);padding:3px 8px 4px;letter-spacing:.01em}
  .opc .glist{display:flex;flex-direction:column;gap:1px}
  .opc .srow{position:relative;display:flex;align-items:center;gap:8px;width:100%;height:28px;padding:0 8px;border-radius:6px;font-size:13px;color:var(--label);text-align:left}
  .opc .srow:hover{background:var(--hover)}
  .opc .srow[aria-current="true"]{background:var(--side-sel)}
  .opc .sic{flex:none;width:18px;height:18px;display:grid;place-items:center;color:var(--tint)}
  .opc .sic svg{width:17px;height:17px}
  .opc .sic.orange{color:var(--flag)}
  .opc .sic.tile{width:24px;height:24px;border-radius:7px;color:#fff;background:var(--tc,#8e8e93);box-shadow:inset 0 0 0 .5px rgba(0,0,0,.08),0 1px 1.5px rgba(0,0,0,.12)}
  .opc .sic.tile svg{width:15px;height:15px;stroke-width:2.1}
  .opc .f-inbox{--tc:linear-gradient(180deg,#3d6bd6,#2a4a9c)} .opc .f-flagged{--tc:linear-gradient(180deg,#ffb340,#ff9500)} .opc .f-drafts{--tc:linear-gradient(180deg,#a1a1a6,#7c7c82)}
  .opc .f-scheduled{--tc:linear-gradient(180deg,#7a78e8,#5856d6)} .opc .f-sign{--tc:linear-gradient(180deg,#2f9a55,#17602a)} .opc .f-sent{--tc:linear-gradient(180deg,#4fc3d9,#1e9bb5)} .opc .f-archive{--tc:linear-gradient(180deg,#b8996f,#957852)}
  .opc .f-junk{--tc:linear-gradient(180deg,#ff6a5f,#e8362b)} .opc .f-trash{--tc:linear-gradient(180deg,#7d7d83,#58585e)}
  .opc .ptile{flex:none;width:18px;height:18px;border-radius:5px;display:grid;place-items:center;color:#fff;font-size:10.5px;font-weight:800;line-height:1;background:var(--tint)}
  .opc .ptile svg{width:12px;height:12px}
  .opc .ptile.all{background:linear-gradient(180deg,#5373c8,#2a4a9c)}
  .opc .sl{flex:1 1 auto;min-width:0;display:flex;flex-direction:column}
  .opc .sn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opc .ss{display:none}
  .opc .cnt{flex:none;font-size:12px;color:var(--label-2);font-variant-numeric:tabular-nums}
  .opc .srow .chk,.opc .srow .chev{display:none}
  .opc .sidebar .side-sub{display:none}
  @media all {
    .opc:where([data-fmt="pad"],[data-fmt="mac"]) .scope-row[aria-current="true"]{background:none}
    .opc:where([data-fmt="pad"],[data-fmt="mac"]) .scope-row[aria-current="true"]:hover{background:var(--hover)}
    .opc:where([data-fmt="pad"],[data-fmt="mac"]) .scope-row[aria-current="true"] .sn{font-weight:600}
    .opc:where([data-fmt="pad"],[data-fmt="mac"]) .scope-row .chk{display:grid;place-items:center;flex:none;width:16px;color:var(--tint);visibility:hidden}
    .opc:where([data-fmt="pad"],[data-fmt="mac"]) .scope-row .chk svg{width:14px;height:14px}
    .opc:where([data-fmt="pad"],[data-fmt="mac"]) .scope-row[aria-current="true"] .chk{visibility:visible}
    .opc:where([data-fmt="pad"],[data-fmt="mac"]) .sidebar:focus-within .srow.folder[aria-current="true"]{background:var(--sel);color:var(--on-sel)}
    .opc:where([data-fmt="pad"],[data-fmt="mac"]) .sidebar:focus-within .srow.folder[aria-current="true"] :is(.sic,.cnt){color:var(--on-sel)}
  }
  .opc .side-foot{margin-top:auto;padding-top:14px}
  .opc .srow.add .sic{color:var(--tint)}
  .opc .gfoot{display:block;padding:8px 18px 14px;font-size:11.5px;line-height:1.38;color:var(--label-2)}

  /* ---------- Liste (Mac) ---------- */
  .opc .list{grid-column:2;grid-row:1;background:var(--win)}
  .opc .list-bar{padding:0 8px 0 16px;border-bottom:var(--hair) solid var(--sep-mac);border-right:var(--hair) solid var(--sep-mac);background:var(--win)}
  .opc .nav-back{display:none}
  .opc .lb-titles{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center}
  .opc .lb-title{font-size:15px;line-height:19px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opc .lb-sub{display:flex;min-width:0;font-size:11px;line-height:14px;color:var(--label-2);white-space:nowrap}
  .opc .lb-sub .ls-ctx{min-width:0;overflow:hidden;text-overflow:ellipsis}   /* la vue et la catégorie se tronquent d'abord */
  .opc .lb-sub .ls-n{flex:none}
  .opc .spacebar{flex:none;display:flex;gap:8px;padding:10px 12px 2px;border-right:var(--hair) solid var(--sep-mac)}
  .opc .sptab{flex:1 1 0;min-width:0;height:34px;border-radius:12px;background:var(--fill);color:var(--label-2);font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;transition:background-color .15s,color .15s}
  .opc .sptab:hover{background:var(--press)}
  .opc .sptab .spn{font-size:12px;font-weight:700;opacity:.8;font-variant-numeric:tabular-nums}
  .opc .sptab.sp-perso[aria-pressed="true"]{background:var(--tint);color:var(--on-tint);font-weight:800}
  .opc .sptab.sp-pro[aria-pressed="true"]{background:#cff2da;color:#005222;font-weight:800}
  @media all { .opc:where([data-theme="nuit"]) .sptab.sp-pro[aria-pressed="true"]{background:#56ad7e;color:#031108} }
  @media all { .opc:where([data-fmt="phone"],[data-fmt="pad"]) .spacebar{border-right:0;padding:8px 16px 4px} .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sptab{height:44px;font-size:15px} }
  @media all { .opc:where([data-fmt="phone"]) .spacebar{padding:6px max(16px,var(--sa-left)) 8px} }
  .opc #slotSpaceSide .spacebar{border-right:0;padding:4px 10px 10px} .opc #slotSpaceSide .sptab{height:34px;font-size:13.5px;border-radius:10px}
  @media (pointer:coarse) { .opc #slotSpaceSide .sptab{height:44px} }
  .opc .seltog{flex:none;height:28px;padding:0 10px;border-radius:7px;font-size:13px;font-weight:600;color:var(--tint);white-space:nowrap}
  .opc .seltog:hover{background:var(--hover)}
  .opc .seltog[aria-pressed="true"]{background:var(--tint-soft-2)}
  .opc .app.multi-on .compose-fixed{display:none !important}
  .opc .list.multi .msg{padding-left:44px}
  .opc .list.multi .msg .quick,.opc .list.multi .msg .m-chev{display:none !important}
  .opc .selbox{position:absolute;left:14px;top:50%;width:22px;height:22px;margin-top:-11px;border-radius:50%;border:1.6px solid var(--label-3);display:grid;place-items:center;color:var(--on-tint);background:transparent;transition:background-color .12s,border-color .12s}
  .opc .selbox svg{width:13px;height:13px;opacity:0}
  .opc .msg.picked .selbox{background:var(--tint);border-color:var(--tint)}
  .opc .msg.picked .selbox svg{opacity:1}
  .opc .list.multi .msg.picked{background:var(--tint-soft)}
  .opc .selbar{flex:none;display:flex;align-items:center;gap:4px;padding:8px 10px;border-top:var(--hair) solid var(--sep-mac);border-right:var(--hair) solid var(--sep-mac);background:var(--win)}
  .opc .selbar[hidden]{display:none}
  .opc .selbar .sc{flex:1 1 auto;min-width:0;font-size:12.5px;font-weight:600;color:var(--label);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px}
  .opc .selbar .sa{flex:none;font-size:12.5px;font-weight:600;color:var(--tint);padding:0 6px;height:30px;border-radius:7px}
  .opc .selbar .sb{flex:none;width:34px;height:30px;border-radius:7px;display:grid;place-items:center;color:var(--tint)}
  .opc .selbar .sb svg{width:18px;height:18px}
  .opc .selbar .sb.dng{color:var(--red-text)}
  .opc .selbar button:hover:not(:disabled){background:var(--hover)}
  .opc .selbar button:disabled{opacity:.35;cursor:default}
  @media all {
    .opc:where([data-fmt="phone"]) .seltog{height:44px;font-size:16px;font-weight:400;padding:0 8px;margin-left:auto}
    .opc:where([data-fmt="phone"]) .seltog[aria-pressed="true"]{background:none;font-weight:600}
    .opc:where([data-fmt="phone"]) .list.multi .list-tools{display:none}
    .opc:where([data-fmt="phone"]) .selbar{position:absolute;left:0;right:0;bottom:0;z-index:7;border-right:0;height:calc(54px + var(--sa-bottom));padding:0 max(8px,var(--sa-right)) var(--sa-bottom) max(8px,var(--sa-left));background:var(--bar-ios);-webkit-backdrop-filter:saturate(1.8) blur(20px);backdrop-filter:saturate(1.8) blur(20px)}
    .opc:where([data-fmt="phone"]) .selbar .sb{width:44px;height:44px}.opc:where([data-fmt="phone"]) .selbar .sa{height:44px;font-size:15px}
    .opc:where([data-fmt="phone"]) .list.multi .msg{padding-left:50px}.opc:where([data-fmt="phone"]) .selbox{left:16px;width:24px;height:24px;margin-top:-12px}
  }
  @media (pointer:coarse) { .opc .selbar .sb{width:44px;height:44px} .opc .selbar .sa{min-height:44px} }
  .opc .scopebar{flex:none;display:flex;justify-content:center;padding:8px 12px 6px;border-right:var(--hair) solid var(--sep-mac)}
  .opc .seg{display:flex;width:100%;max-width:320px;padding:2px;border-radius:8px;background:var(--fill)}
  .opc .seg button{position:relative;flex:1 1 0;min-width:0;height:22px;border-radius:6px;font-size:12px;font-weight:500;color:var(--label);white-space:nowrap;text-align:center;transition:background-color .15s}
  .opc .seg button[aria-pressed="true"]{background:var(--seg-on);font-weight:600;box-shadow:0 0 0 .5px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.14)}
  .opc .seg button:focus-visible{outline-offset:0}
  .opc .list-scroll{border-right:var(--hair) solid var(--sep-mac);padding:2px 8px 14px}
  .opc .lt{display:none}
  .opc #rows{display:flex;flex-direction:column}

  .opc .msg{position:relative;display:flex;flex-direction:column;padding:7px 10px 9px 22px;border-radius:8px;cursor:default;scroll-margin:10px}
  .opc .msg::after{content:"";position:absolute;left:22px;right:4px;bottom:0;height:var(--hair);background:var(--sep-mac)}
  .opc .msg:last-child::after,.opc .msg.sel::after,.opc .msg:has(+ .msg.sel)::after{opacity:0}
  .opc .msg:focus-visible{outline:2px solid var(--tint);outline-offset:1px;z-index:1}
  .opc .m-top{display:flex;align-items:baseline;gap:8px;min-width:0}
  .opc .m-from{flex:1 1 auto;min-width:0;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opc .m-date{flex:none;display:flex;align-items:center;gap:4px;font-size:12px;color:var(--label-2);font-variant-numeric:tabular-nums;white-space:nowrap}
  .opc .m-date svg{width:12px;height:12px}
  .opc .m-date .clk{color:var(--tint)}
  .opc .m-chev{display:none}
  .opc .m-sub{margin-top:1px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opc .m-prev{margin-top:1px;font-size:13px;line-height:17px;color:var(--label-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .opc .m-date .dotc{flex:none;width:7px;height:7px;border-radius:50%;margin-right:2px;box-shadow:var(--dotc-ring)}
  .opc .dot{position:absolute;left:8px;top:12px;width:9px;height:9px;border-radius:50%;background:var(--tint);display:none}
  .opc .msg.unread .dot{display:block}
  .opc .flg{position:absolute;left:6px;top:27px;width:13px;height:13px;color:var(--flag)}
  .opc .flg svg{width:13px;height:13px}
  .opc .flg svg .fb{stroke:var(--flag-edge)}
  .opc .msg.sel{background:var(--sel);color:var(--on-sel)}
  .opc .msg.sel :is(.m-date,.m-prev,.clk){color:var(--on-sel-2)}
  .opc .msg.sel .dot{background:var(--on-sel)}
  .opc .msg.sel .dotc{outline:1.5px solid var(--on-sel);outline-offset:0;box-shadow:none}
  .opc .msg.sel .flg{color:var(--on-sel)}
  .opc .msg.sel .flg svg .fb{stroke:var(--on-sel)}
  .opc .quick{position:absolute;top:4px;right:8px;display:none;gap:2px;padding:0 0 0 16px;background:linear-gradient(90deg,transparent,var(--win) 14px)}
  .opc .quick button{width:28px;height:24px;border-radius:6px;display:grid;place-items:center;color:var(--glyph)}
  .opc .quick button:hover{background:var(--hover);color:var(--label)}
  .opc .quick button.dng:hover{color:var(--red-text)}
  .opc .quick svg{width:15px;height:15px}
  @media (hover:hover) { .opc .msg:not(.sel):hover .quick{display:flex} .opc .msg:not(.sel):hover .m-date{visibility:hidden} }

  .opc .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:60%;padding:40px 24px;text-align:center;color:var(--label-2)}
  .opc .empty svg{width:44px;height:44px;color:var(--label-3);margin-bottom:6px}
  .opc .empty b{font-size:17px;font-weight:600;color:var(--label-2)}
  .opc .empty span{font-size:13px}
  .opc .reading-empty{height:100%;min-height:0}
  .opc .reading-empty b{font-size:20px;font-weight:400;color:var(--label-2)}
  .opc .reading-empty svg{width:40px;height:40px}

  /* ---------- Lecture (Mac) ---------- */
  .opc .reading{grid-column:3;grid-row:1;background:var(--win)}
  .opc .read-bar{gap:2px;padding:0 max(12px,var(--sa-right)) 0 10px;border-bottom:var(--hair) solid var(--sep-mac);background:var(--win)}
  .opc .read-acts{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:2px}
  .opc .acts-nav,.opc .acts-touch{display:none}
  .opc .acts-mac{display:flex;align-items:center;gap:2px}
  .opc .search{flex:0 1 clamp(160px,17cqw,240px);min-width:110px;display:flex;align-items:center;gap:6px;height:28px;margin-left:8px;padding:0 8px;border-radius:7px;background:var(--fill);color:var(--label-2);cursor:text;transition:box-shadow .15s}
  .opc .search svg{width:14px;height:14px}
  .opc .search input{flex:1 1 auto;min-width:0;height:100%;border:0;padding:0;background:none;outline:none;font-size:13px;color:var(--label)}
  .opc .search input::placeholder{color:var(--label-2);opacity:1}
  .opc .search:focus-within{box-shadow:0 0 0 1px var(--tint),0 0 0 4px var(--tint-soft-2)}
  .opc .search input:focus-visible{outline:none}
  .opc .search input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none;width:15px;height:15px;margin:0;background:var(--label-2);opacity:.75;cursor:pointer;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill-rule='evenodd' d='M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm-3.2 5.7L12 10.9l3.2-3.2 1.4 1.4-3.2 3.2 3.2 3.2-1.4 1.4-3.2-3.2-3.2 3.2-1.4-1.4 3.2-3.2-3.2-3.2Z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill-rule='evenodd' d='M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm-3.2 5.7L12 10.9l3.2-3.2 1.4 1.4-3.2 3.2 3.2 3.2-1.4 1.4-3.2-3.2-3.2 3.2-1.4-1.4 3.2-3.2-3.2-3.2Z'/%3E%3C/svg%3E") center/contain no-repeat}
  .opc .search-row{display:contents}
  .opc .search-cancel{display:none}

  .opc .rpad{width:100%;max-width:860px;padding:28px 40px 72px}
  .opc .rsubj{font:700 24px/1.25 var(--font-d);letter-spacing:-.012em;text-wrap:balance;overflow-wrap:anywhere;margin:0 0 18px}
  .opc .rhead{display:flex;align-items:flex-start;gap:12px}
  .opc .ravatar{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:600;font-size:15px;letter-spacing:.02em;background:var(--avatar)}
  .opc .rident{flex:1 1 auto;min-width:0}
  .opc .rline{display:flex;align-items:baseline;gap:8px;min-width:0}
  .opc .rname{min-width:0;font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opc .vip{flex:none;align-self:center;display:inline-flex;color:var(--tint)}
  .opc .vip svg{width:13px;height:13px}
  .opc .rdate{margin-left:auto;flex:none;font-size:12px;color:var(--label-2);white-space:nowrap;font-variant-numeric:tabular-nums}
  .opc .rdate .d-short{display:none}
  .opc .rmeta{font-size:12px;line-height:1.5;color:var(--label-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opc .rsep{height:var(--hair);background:var(--sep-mac);margin:16px 0 20px}
  .opc .rbody{font-size:14px;line-height:1.6;overflow-wrap:anywhere}
  .opc .rbody p{margin:0 0 14px}
  .opc .rbody p:last-child{margin-bottom:0}
  .opc .rbody .quote{border-left:2px solid var(--tint);padding-left:12px;color:var(--label-2);margin:16px 0}
  .opc .attbar{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
  .opc .att{display:flex;align-items:center;gap:10px;max-width:250px;padding:8px 12px 8px 8px;border-radius:10px;background:var(--fill-2);box-shadow:inset 0 0 0 var(--hair) var(--sep-mac)}
  .opc .att .ic{flex:none;width:34px;height:34px;border-radius:8px;display:grid;place-items:center;background:var(--win);color:var(--tint);box-shadow:0 0 0 var(--hair) var(--sep-mac)}
  .opc .att .ic svg{width:18px;height:18px}
  .opc .att .fn{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opc .att .fs{font-size:11px;color:var(--label-2)}
  .opc .rquick{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:30px}
  .opc .rq-lbl{display:none}
  .opc .rquick button{font-size:13px;font-weight:500;color:var(--tint);background:var(--tint-soft);padding:6px 13px;border-radius:999px;transition:background-color .12s}
  .opc .rquick button:hover{background:var(--tint-soft-2)}

  .opc .sign-card{margin:0 0 20px;padding:14px;border-radius:12px;background:var(--fill-2);box-shadow:inset 0 0 0 var(--hair) var(--sep-mac)}
  .opc .sg-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:13px;color:var(--label-2)}
  .opc .sgchip{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;line-height:18px;background:var(--fill);color:var(--label)}
  .opc .m-sub .sgchip{margin-right:6px;font-size:11px;line-height:16px;padding:0 6px;vertical-align:1px}
  .opc .sgchip.st-signed{background:#cff2da;color:#005222}
  @media all {.opc:where([data-theme="nuit"]) .sgchip.st-signed{background:#56ad7e;color:#031108} .opc:where([data-theme="nuit"]) .sgchip.st-pending,.opc:where([data-theme="nuit"]) .sgchip.st-viewed,.opc:where([data-theme="nuit"]) .sgchip.st-counter{background:#e0a64a;color:#1d1000} .opc:where([data-theme="nuit"]) .sgchip.st-declined,.opc:where([data-theme="nuit"]) .sgchip.st-expired,.opc:where([data-theme="nuit"]) .sgchip.st-cancelled{background:#e8837b;color:#1f0402} .opc:where([data-theme="nuit"]) .sg-signers .ok{color:#7fdc95}}
  .opc .sgchip.st-pending,.opc .sgchip.st-viewed,.opc .sgchip.st-counter{background:#fde7c4;color:#6b3a00}
  .opc .sgchip.st-declined,.opc .sgchip.st-expired,.opc .sgchip.st-cancelled{background:#fbd5d2;color:#8a1410}
  .opc .sg-signers{list-style:none;margin:12px 0 0;padding:0}
  .opc .sg-signers li{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:var(--hair) solid var(--sep)}
  .opc .sg-signers .av{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:600;background:var(--fill);color:var(--label)}
  .opc .sg-signers .nm{flex:1;min-width:0;font-size:14px}
  .opc .sg-signers .nm span{display:block;font-size:12px;color:var(--label-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .opc .sg-signers .ok{color:#17602a;font-weight:600}
  .opc .sg-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  .opc .sg-tl{margin:14px 0 0;padding:0 0 0 18px;font-size:12px;color:var(--label-2)}
  .opc .sg-tl li{margin:2px 0}
  .opc .sg-note{display:flex;gap:6px;margin:10px 0 0;font-size:12px;color:var(--label-2)}
  .opc .sg-note svg{flex:none;width:14px;height:14px;margin-top:1px}
  .opc .sgfld{display:block;padding:10px 12px}
  .opc .sgfld+.sgfld,.opc .sgfld+.swrow,.opc .swrow+.sgfld{border-top:var(--hair) solid var(--sep)}
  .opc .sgfld>label,.opc .sgfld>.lb{display:block;font-size:13px;color:var(--label-2);margin-bottom:6px}
  .opc .sgfld input,.opc .sgfld select,.opc .sgfld textarea{display:block;box-sizing:border-box;width:100%;font:inherit;font-size:15px;color:var(--label);background:var(--fill);border:0;border-radius:8px;padding:8px 10px}
  .opc .sgfld textarea{min-height:96px;resize:vertical;line-height:1.4}
  .opc .sgfld input:focus-visible,.opc .sgfld select:focus-visible,.opc .sgfld textarea:focus-visible{outline:2px solid var(--tint);outline-offset:1px}
  .opc .sg-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px 12px;border-top:var(--hair) solid var(--sep)}
  .opc .sg-row:first-child{border-top:0}
  .opc .sg-row .full{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--label-2)}
  @media (max-width:520px) {.opc .sg-row{grid-template-columns:1fr}}
  .opc .sg-docs{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .opc .sg-pad{display:block;width:100%;height:170px;border-radius:10px;background:#fff;touch-action:none;cursor:crosshair;box-shadow:inset 0 0 0 1px var(--sep)}
  .opc .sg-padline{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:12px;color:var(--label-2)}
  .opc .sched-banner{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:0 0 20px;padding:12px 14px;border-radius:12px;background:var(--tint-soft)}
  .opc .sched-banner .ic{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--tint);color:var(--on-tint)}
  .opc .sched-banner .ic svg{width:18px;height:18px}
  .opc .sched-banner .tx{flex:1 1 220px;min-width:0}
  .opc .sched-banner .tx b{display:block;font-size:13px;font-weight:600}
  .opc .sched-banner .tx span{display:block;font-size:12px;color:var(--label-2)}
  .opc .sb-act{display:flex;flex-wrap:wrap;gap:6px}
  @media all { .opc:where([data-fmt="mac"]) .sb-act .btn:not(.primary){background:var(--banner-btn)} }

  /* ---------- Boutons de feuille (Mac : boutons poussoirs) ---------- */
  .opc .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:28px;padding:0 12px;border-radius:7px;font-size:13px;font-weight:500;color:var(--label);background:var(--btn);box-shadow:0 0 0 .5px var(--btn-edge),0 1px 1.5px rgba(0,0,0,.08);white-space:nowrap;transition:filter .12s,background-color .12s}
  .opc .btn:hover{filter:brightness(.97)}
  .opc .btn:active{filter:brightness(.92)}
  .opc .btn.primary{background:var(--tint);color:var(--on-tint);box-shadow:0 1px 1.5px rgba(0,0,0,.12)}
  .opc .btn.primary:hover{background:var(--tint-2);filter:none}
  .opc .btn.danger{color:var(--red-text)}
  .opc .btn[disabled]{opacity:.55;pointer-events:none}
  .opc .btn svg{width:15px;height:15px}
  .opc .btn .ic-up{display:none}

  /* ---------- Feuilles (sheets) ---------- */
  .opc .overlay{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:var(--scrim);animation:opc-fade .2s ease}
  .opc .sheet{--grouped:var(--grouped-elev);--cell:var(--cell-elev);position:relative;display:flex;flex-direction:column;width:min(540px,100%);max-height:min(88vh,780px);border-radius:12px;background:var(--grouped);color:var(--label);box-shadow:var(--shadow-sheet);overflow:hidden;animation:opc-sheetIn .26s var(--ease)}
  .opc .sheet-bar{flex:none;display:grid;grid-template-columns:minmax(max-content,1fr) minmax(0,auto) minmax(max-content,1fr);align-items:center;gap:8px;height:52px;padding:0 12px;background:var(--sheet-bar);border-bottom:var(--hair) solid var(--sep-mac)}
  .opc .sb-l{justify-self:start;display:flex;align-items:center;gap:6px;min-width:0}
  .opc .sb-r{justify-self:end;display:flex;align-items:center;gap:8px;min-width:0}
  .opc .sheet-title{justify-self:center;display:flex;align-items:center;gap:8px;max-width:100%;min-width:0;font-size:13px;font-weight:700;white-space:nowrap}
  .opc .sheet-title .t{overflow:hidden;text-overflow:ellipsis}
  .opc .sheet-title .ptile{width:20px;height:20px;border-radius:5px;font-size:11px}
  .opc .sheet-title .ptile svg{width:13px;height:13px}
  .opc .sheet-body{flex:1 1 auto;min-height:0;overflow:auto}
  .opc .sheet-foot{display:none}
  .opc .back-btn .ic{display:flex}
  .opc .t-short,.opc .t-sched{display:none}
  .opc .gwrap{padding:4px 16px 18px}
  .opc .ghead{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--label-2);padding:14px 12px 6px}
  .opc .gcard{background:var(--cell);border-radius:10px;overflow:hidden}
  .opc .gcard+.ghead{margin-top:18px}
  .opc .sigrow{display:block;padding:10px 12px}
  .opc .sigrow+.sigrow,.opc .swrow+.strow,.opc .swrow+.swrow{border-top:var(--hair) solid var(--sep)}
  .opc .sigrow label{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--label-2);margin-bottom:6px}
  .opc .sigta{display:block;box-sizing:border-box;width:100%;min-height:58px;resize:vertical;font:inherit;font-size:14px;line-height:1.4;color:var(--label);background:var(--fill);border:0;border-radius:8px;padding:8px 10px}
  .opc .sigta:focus-visible{outline:2px solid var(--tint);outline-offset:1px}
  .opc .strow{padding:10px 12px}
  .opc .catt-row{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 12px 8px 16px;border-top:var(--hair) solid var(--sep-mac)}
  .opc .catt-row .att{padding-right:6px}
  .opc .att-x{flex:none;width:26px;height:26px;border:0;border-radius:50%;background:none;color:var(--label-2);font-size:18px;line-height:1;cursor:pointer}
  .opc .att-x:hover{background:var(--fill)}
  .opc .att-x:focus-visible{outline:2px solid var(--tint);outline-offset:1px}
  .opc .att-btn{display:inline-flex;align-items:center;gap:6px}
  .opc .att-btn svg{width:17px;height:17px}
  .opc .compose.drop{box-shadow:0 0 0 3px var(--tint)}
  .opc .csaved{font-size:12px;color:var(--label-2)}
  .opc .tcount{display:inline-block;min-width:18px;margin-right:6px;padding:0 5px;border-radius:9px;background:var(--fill);color:var(--label-2);font-size:11px;font-weight:600;line-height:18px;text-align:center;vertical-align:1px}
  .opc .thread{margin-top:28px;padding-top:14px;border-top:var(--hair) solid var(--sep-mac)}
  .opc .thread h2{margin:0 0 10px;font-size:13px;font-weight:600;color:var(--label-2)}
  .opc .th-item{border-radius:10px;background:var(--fill-2);margin-bottom:8px}
  .opc .th-item summary{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:10px 12px;cursor:pointer;list-style:none}
  .opc .th-item summary::-webkit-details-marker{display:none}
  .opc .th-item summary:focus-visible{outline:2px solid var(--tint);outline-offset:1px;border-radius:10px}
  .opc .th-who{font-weight:600;font-size:14px}
  .opc .th-date{font-size:12px;color:var(--label-2)}
  .opc .th-prev{grid-column:1/-1;font-size:13px;color:var(--label-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opc .th-item[open] .th-prev{display:none}
  .opc .th-body{padding:0 12px 12px;font-size:14px;line-height:1.5}
  .opc .th-body p{margin:0 0 8px}
  .opc .gfoot-s{display:flex;gap:6px;align-items:flex-start;font-size:12px;line-height:1.4;color:var(--label-2);padding:8px 12px 0}
  .opc .gfoot-s svg{width:13px;height:13px;margin-top:2px}

  /* Composer : fenêtre de rédaction macOS */
  .opc .sheet.compose{width:min(700px,100%);height:min(620px,90vh);max-height:none;background:var(--win)}
  .opc .compose-body{display:flex;flex-direction:column}
  .opc .fld{position:relative;display:flex;align-items:center;gap:8px;min-height:38px;padding:0 16px;border-bottom:var(--hair) solid var(--sep-mac)}
  .opc .fld label{flex:none;min-width:46px;font-size:13px;color:var(--label-2)}
  .opc .fld input,.opc .fld select{flex:1 1 auto;min-width:0;height:36px;border:0;padding:0;background:none;outline:none;font-size:13px;color:var(--label)}
  .opc .fld select{cursor:pointer;-webkit-appearance:none;appearance:none;flex:0 1 auto;max-width:100%;padding:0 18px 0 0;background:var(--popup-chev) no-repeat right center/8px 12px;text-overflow:ellipsis}
  .opc .fld input::placeholder,.opc .cbody::placeholder{color:var(--label-2);opacity:1}
  .opc .gcard .fld:focus-within{box-shadow:inset 0 0 0 1px var(--tint),inset 0 0 0 4px var(--tint-soft-2)}
  .opc .gcard .fld:first-child{border-radius:10px 10px 0 0}
  .opc .gcard .fld:last-child{border-radius:0 0 10px 10px}
  .opc .gcard .fld:only-child{border-radius:10px}
  .opc .fld input:focus-visible,.opc .fld select:focus-visible{outline:none}
  .opc .cbody{flex:1 1 auto;min-height:150px;border:0;outline:none;resize:none;background:none;color:var(--label);font-size:14px;line-height:1.55;padding:14px 16px}
  .opc .cbody:focus-visible{outline:none;box-shadow:inset 0 0 0 2px var(--tint-soft-2)}
  /* Au clavier (Tab, raccourci…), chaque champ du composer s'entoure d'un anneau teinté bien visible, « De » compris. */
  .opc.kbd .compose-body .fld:focus-within,.opc.kbd .cbody:focus-visible{box-shadow:inset 0 0 0 2px var(--tint)}
  .opc .cfoot{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px 10px 16px;border-top:var(--hair) solid var(--sep-mac)}
  .opc .cnote{display:flex;align-items:center;gap:6px;min-width:0;font-size:12px;color:var(--label-2)}
  .opc .cnote svg{width:14px;height:14px}
  .opc .cf-btns{flex:none;display:flex;align-items:center;gap:8px}

  /* Programmer l'envoi : popover sur Mac/iPad, page dans la feuille sur iPhone */
  .opc .sched-pop{position:absolute;z-index:8;top:58px;right:10px;width:min(384px,calc(100% - 20px));max-height:calc(100% - 68px);overflow:auto;border-radius:12px;background:var(--grouped-elev);box-shadow:var(--shadow-pop);transform-origin:top right;animation:opc-pop .2s var(--ease)}
  .opc .sched{padding:12px 12px 14px}
  .opc .sched-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:2px 4px 10px}
  .opc .sched-head b{font-size:13px;font-weight:700}
  .opc .sched-head span{font-size:11px;color:var(--label-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opc .sched .gcard + .ghead{padding-top:12px}
  .opc .sp{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:36px;padding:8px 12px;text-align:left;font-size:13px}
  .opc .sp::after,.opc .gcard .fld::after,.opc .prov::after{content:"";position:absolute;left:12px;right:0;bottom:0;height:var(--hair);background:var(--sep)}
  .opc .sp:last-child::after,.opc .gcard .fld:last-child::after,.opc .prov:last-child::after{display:none}
  .opc .sp:hover{background:var(--hover)}
  .opc .sp:focus-visible,.opc .prov:focus-visible{outline-offset:-2px;border-radius:10px}
  .opc .sp-l{min-width:0}
  .opc .sp b{font-weight:500}
  .opc .sp i{font-style:normal;color:var(--label-2)}
  .opc .sp i::before{content:"· "}
  .opc .sched-tz{display:none}
  .opc .sp .when{flex:none;font-size:12px;color:var(--label-2);white-space:nowrap}
  .opc .gcard .fld{border-bottom:0;min-height:40px;padding:0 12px}
  .opc .gcard .fld label{min-width:96px;color:var(--label)}
  .opc .sched-custom{gap:6px}
  .opc .gcard .fld.sched-custom label{flex:1 1 auto;min-width:0}
  .opc .sched-custom input{position:relative;flex:none;width:auto;height:26px;padding:0 8px;border-radius:6px;background:var(--fill);text-align:right;font-variant-numeric:tabular-nums;cursor:pointer}
  .opc .sched-custom input::-webkit-calendar-picker-indicator{position:absolute;inset:0;width:auto;height:auto;margin:0;padding:0;opacity:0;cursor:pointer}
  .opc .sched-custom input::-webkit-datetime-edit{padding:0}
  .opc .sched-custom input[type="date"]{width:calc(10ch + 18px)}
  .opc .sched-go{display:flex;justify-content:flex-end;padding:10px 0 0}
  .opc .sched-note{display:flex;gap:6px;align-items:flex-start;padding:10px 4px 0;font-size:11.5px;line-height:1.4;color:var(--label-2)}
  .opc .sched-note svg{width:13px;height:13px;margin-top:1px}
  .opc .sheet.rs{width:min(440px,100%)}
  .opc .sheet.rs .sched{padding:14px 16px 18px}
  .opc .sheet.rs .sched-head b{display:none}

  /* Ajouter un compte : listes groupées façon Réglages */
  .opc .sheet.acct{width:min(520px,100%)}
  .opc .prov-intro{text-align:center;padding:22px 24px 16px}
  .opc .det{display:flex;align-items:center;gap:12px;margin:10px 0 0;padding:11px 12px;border-radius:10px;background:var(--cell);border:var(--hair) solid var(--tint-soft-2)}
  .opc .det.ko{border-color:var(--red)}
  .opc .det .pn{min-width:0;display:flex;flex-direction:column;gap:2px}
  .opc .det .pn b{font-size:13.5px;font-weight:600;color:var(--label)}
  .opc .det .pn span{font-size:12px;line-height:1.35;color:var(--label-2)}
  .opc .det .ptile{flex:none}
  .opc .det .pn .ok-chip{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700;background:var(--pro-soft);color:var(--label);vertical-align:1px}
  .opc .det .spin{flex:none;width:22px;height:22px;border-radius:50%;border:2.5px solid var(--fill);border-top-color:var(--tint);animation:opc-detspin .8s linear infinite}
  @keyframes opc-detspin {to{transform:rotate(360deg)}}
  .opc #aPassWrap,.opc #aAdv{margin-top:10px}
  .opc .adv-tog{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:40px;padding:0 12px;border-radius:10px;background:var(--cell);font-size:13px;color:var(--tint);font-weight:600}
  .opc .adv-tog svg{width:12px;height:12px;transition:transform .2s}
  .opc .adv-tog[aria-expanded="true"] svg{transform:rotate(90deg)}
  .opc .link-btn{display:block;margin:14px auto 4px;padding:8px 12px;font-size:13px;font-weight:600;color:var(--tint);min-height:36px}
  @media (pointer:coarse) { .opc .adv-tog,.opc .link-btn{min-height:44px} }
  .opc .prov-intro .glyph{width:54px;height:54px;border-radius:13px;margin:0 auto 12px}
  .opc .prov-intro .glyph svg{width:30px;height:30px}
  .opc .prov-intro h3{font:700 19px/1.25 var(--font-d);margin-bottom:6px}
  .opc .prov-intro p{font-size:13px;color:var(--label-2);max-width:40ch;margin:0 auto}
  .opc .prov{position:relative;display:flex;align-items:center;gap:12px;width:100%;min-height:50px;padding:8px 12px;text-align:left}
  .opc .prov::after{left:54px}
  .opc .prov:hover{background:var(--hover)}
  .opc .prov .ptile{width:30px;height:30px;border-radius:7px;font-size:15px}
  .opc .prov .ptile svg{width:18px;height:18px}
  .opc .prov .pn{flex:1 1 auto;min-width:0}
  .opc .prov .pn b{display:block;font-size:13px;font-weight:600}
  .opc .prov .pn span{display:block;font-size:12px;color:var(--label-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opc .prov .go{color:var(--label-3)}
  .opc .prov .go svg{width:12px;height:12px}
  .opc .note-card{display:flex;gap:10px;align-items:flex-start;margin-top:14px;padding:12px 14px;border-radius:10px;background:var(--cell);font-size:13px;line-height:1.45}
  .opc .note-card svg{width:17px;height:17px;color:var(--tint);margin-top:1px}

  /* Menus contextuels et feuille d'actions */
  .opc .ov-menu{background:transparent;display:block;padding:0;animation:none}
  .opc .menu{position:fixed;z-index:2;min-width:240px;max-width:calc(100vw - 16px);padding:5px 0;border-radius:13px;background:var(--menu);-webkit-backdrop-filter:blur(50px) saturate(1.8);backdrop-filter:blur(50px) saturate(1.8);box-shadow:var(--shadow-pop);animation:opc-pop .22s var(--ease)}
  .opc .mtitle{padding:6px 16px 6px 44px;font-size:12px;color:var(--label-2)}
  .opc .mitem{position:relative;display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:0 16px 0 12px;font-size:15px;text-align:left;color:var(--label)}
  .opc .mitem + .mitem::before{content:"";position:absolute;left:0;right:0;top:0;height:var(--hair);background:var(--sep)}
  .opc .mitem:hover,.opc .mitem:focus-visible{background:var(--hover);outline:none}
  .opc .mitem:focus-visible{box-shadow:inset 0 0 0 2px var(--tint)}
  .opc .mitem .mck{width:24px;flex:none;display:grid;place-items:center;color:var(--label)}
  .opc .mitem .mck svg{width:16px;height:16px}
  .opc .mitem .mlbl{flex:1 1 auto}
  .opc .mitem .mic{color:var(--label)}
  .opc .mitem .mic svg{width:19px;height:19px}
  .opc .mitem.dng,.opc .mitem.dng .mic{color:var(--red-text)}
  .opc .ov-asheet{display:flex;align-items:flex-end;padding:0;background:var(--scrim)}
  .opc .asheet{width:100%;display:flex;flex-direction:column;gap:8px;padding:0 max(8px,var(--sa-right)) calc(8px + var(--sa-bottom)) max(8px,var(--sa-left));animation:opc-sheetUp .38s var(--ease)}
  .opc .ag{border-radius:14px;overflow:hidden;background:var(--menu);-webkit-backdrop-filter:saturate(1.8) blur(30px);backdrop-filter:saturate(1.8) blur(30px)}
  .opc .ag-title{padding:14px 16px;text-align:center;font-size:13px;color:var(--label-2);border-bottom:var(--hair) solid var(--sep)}
  .opc .ag .mitem{justify-content:center;min-height:56px;padding:0 16px;font-size:19px;color:var(--tint)}
  .opc .ag .mitem .mlbl{flex:none}
  .opc .ag .mitem.cancel{font-weight:600}
  .opc .ag .mitem.dng{color:var(--red-text)}

  /* ---------- Toast (HUD) ---------- */
  .opc .toast{position:fixed;left:calc(var(--opc-x,0px) + 16px);right:calc(var(--opc-r,0px) + 16px);margin:0 auto;width:fit-content;bottom:calc(22px + var(--opc-bas,0px) + var(--sa-bottom));z-index:200;display:flex;align-items:center;gap:12px;padding:10px 12px 10px 16px;border-radius:14px;background:var(--toast);color:#fff;font-size:13px;font-weight:500;-webkit-backdrop-filter:saturate(1.6) blur(20px);backdrop-filter:saturate(1.6) blur(20px);box-shadow:0 10px 30px rgba(0,0,0,.25);opacity:0;pointer-events:none;transform:translateY(14px);transition:opacity .22s,transform .3s var(--ease)}
  .opc .toast.show{opacity:1;transform:none}
  .opc .toast.show.act .undo{pointer-events:auto} /* le HUD ne capte jamais les touchers ; seuls « Annuler l'envoi » / « Annuler » sont cliquables */
  .opc .toast > span{min-width:0;overflow-wrap:anywhere}
  .opc .toast.two{flex-wrap:wrap;row-gap:8px}   /* « Annuler » + « Annuler l'envoi » : le texte sur sa ligne, les deux boutons dessous, à droite */
  .opc .toast.two > span:not(.ok){flex:1 1 calc(100% - 40px)}
  .opc .toast.two #tAct{margin-left:auto}   /* une longue adresse passe à la ligne au lieu de sortir du HUD */
  @media all {
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .toast .undo{position:relative}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .toast .undo::before{content:"";position:absolute;inset:-8px -2px}   /* zone tactile de 44 pt (iPad, écrans tactiles) */
  }
  @media (pointer:coarse) {
    .opc .toast .undo{position:relative}
    .opc .toast .undo::before{content:"";position:absolute;inset:-8px -2px}   /* zone tactile de 44 pt (iPad, écrans tactiles) */
  }
  .opc .toast .ok{color:#4cd964;display:flex}
  .opc .toast .ok svg{width:16px;height:16px}
  .opc .toast .undo{flex:none;font-weight:600;color:var(--toast-link);background:rgba(255,255,255,.12);border-radius:8px;padding:6px 11px}
  .opc .toast .undo:focus-visible{outline-color:#fff}
  .opc .toast .ring{width:18px;height:18px}

  /* ---------- Pro / Perso ---------- */
  .opc .kbadge{flex:none;display:inline-block;vertical-align:1px;font-size:10.5px;line-height:15px;font-weight:700;letter-spacing:.02em;padding:0 5px;border-radius:4px;white-space:nowrap}
  .opc .kbadge.pro{color:var(--pro);background:var(--pro-soft)}
  .opc .kbadge.perso{color:var(--perso);background:var(--perso-soft)}
  .opc .sn-row{display:flex;align-items:center;gap:6px;min-width:0}
  .opc .sn-row .sn{min-width:0}   /* nom de compte long : abrégé, le badge reste visible */
  .opc .ptile.k-pro{background:var(--pro-tile)}
  .opc .ptile.k-perso{background:var(--perso-tile)}
  .opc .rmeta.rto{display:flex;align-items:center;gap:6px}
  .opc .rto-t{min-width:0;overflow:hidden;text-overflow:ellipsis}

  /* ---------- Catégories (tri automatique) ---------- */
  .opc [data-cat="principal"]{--cat-c:var(--cat-principal)}
  .opc [data-cat="notif"]{--cat-c:var(--cat-notif)}
  .opc [data-cat="recus"]{--cat-c:var(--cat-recus)}
  .opc [data-cat="voyages"]{--cat-c:var(--cat-voyages)}
  .opc [data-cat="promos"]{--cat-c:var(--cat-promos)}
  .opc [data-cat="tout"]{--cat-c:var(--cat-tout)}
  /* Barre façon Mail (iOS 18 / macOS 15) : la catégorie choisie montre son nom, les autres leur symbole et leurs non lus */
  .opc .catbar{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:5px;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-width:none;scroll-padding:0 10px;padding:2px 10px 8px;border-right:var(--hair) solid var(--sep-mac)}
  .opc .catbar::-webkit-scrollbar{display:none}
  /* Tactile : la rangée défile ; un fondu indique qu'il reste des catégories hors champ */
  .opc .catbar.fade-r{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent)}
  .opc .catbar.fade-l{-webkit-mask-image:linear-gradient(90deg,transparent,#000 28px);mask-image:linear-gradient(90deg,transparent,#000 28px)}
  .opc .catbar.fade-l.fade-r{-webkit-mask-image:linear-gradient(90deg,transparent,#000 28px,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,transparent,#000 28px,#000 calc(100% - 28px),transparent)}
  .opc .cat{flex:none;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:38px;height:26px;padding:0 8px;border-radius:999px;background:var(--fill);color:var(--label);font-size:12px;font-weight:500;white-space:nowrap;transition:background-color .15s,color .15s}
  .opc .cat svg{width:15px;height:15px;color:var(--cat-c)}
  .opc .cat .cc{font-size:11.5px;color:var(--label-2);font-variant-numeric:tabular-nums}
  .opc .cat:hover{background:var(--fill-2);box-shadow:inset 0 0 0 1px var(--fill)}
  .opc .cat[aria-pressed="true"]{background:var(--cat-c);color:var(--on-cat);font-weight:600;box-shadow:none}
  .opc .cat[aria-pressed="true"] :is(svg,.cc){color:var(--on-cat)}
  .opc .cat:focus-visible{outline-offset:1px}
  /* Mac, colonne de liste étroite : toutes les pastilles en symboles sur une ligne (le nom de la catégorie reste dans l'en-tête) */
  @media (pointer:fine) {
    .opc:where([data-fmt="mac"]) .list{container-type:inline-size}
    @container (max-width:384px){
      .opc:where([data-fmt="mac"]) .cat[aria-pressed="true"] .cl{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    }
    @container (max-width:300px){ .opc:where([data-fmt="mac"]) .catbar{gap:4px;padding-left:8px;padding-right:8px} .opc:where([data-fmt="mac"]) .cat{min-width:0;padding:0 6px;gap:4px} }
  }

  /* Lecture : catégorie, « Pourquoi ici ? », « Déplacer vers… » */
  .opc .rcat{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin:14px 0 0 52px}
  .opc .cat-chip{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px 0 6px;border-radius:6px;background:var(--fill-2);font-size:12px;font-weight:600;color:var(--label);white-space:nowrap}
  .opc .cat-chip svg{width:14px;height:14px;color:var(--cat-c)}
  .opc .lnk{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:var(--tint);border-radius:4px;white-space:nowrap}
  @media (hover:hover) { .opc .lnk:hover{text-decoration:underline;text-underline-offset:2px} }
  .opc .mv-short{display:none}
  .opc .lnk svg{width:12px;height:12px}
  .opc .lnk .chv svg{width:10px;height:10px;transition:transform .2s var(--ease)}
  .opc .lnk[aria-expanded="true"] .chv svg{transform:rotate(90deg)}
  .opc .why{margin:10px 0 0 52px;padding:10px 12px 10px 14px;border-radius:10px;background:var(--fill-2);font-size:12.5px;line-height:1.45;color:var(--label)}
  .opc .why-t{font-weight:600;margin-bottom:2px}
  .opc .why ul{margin:0;padding:0 0 0 16px}
  .opc .why li{margin:2px 0;overflow-wrap:anywhere}
  .opc .why-note{display:flex;gap:6px;align-items:flex-start;margin-top:8px;padding-top:8px;border-top:var(--hair) solid var(--sep-mac);font-size:11.5px;line-height:1.4;color:var(--label-2)}
  .opc .why-note svg{width:13px;height:13px;margin-top:1px}
  /* Bandeau « Classé en indésirable » */
  .opc .sched-banner.junk{background:var(--warn-soft)}
  .opc .sched-banner.junk .ic{background:var(--red);color:#fff}
  .opc .sched-banner .tx ul{margin:3px 0 0;padding:0 0 0 16px;font-size:12px;line-height:1.45;color:var(--label-2)}
  .opc .sched-banner .tx li{overflow-wrap:anywhere}

  /* Feuille « Déplacer vers… » */
  .opc .sheet.mv{width:min(460px,100%)}
  .opc .mv-from{padding:14px 12px 0;font-size:13px;font-weight:600;overflow-wrap:anywhere}
  .opc .mv-from span{display:block;font-weight:400;font-size:12px;color:var(--label-2)}
  .opc .sp.mvopt{justify-content:flex-start;gap:10px}
  .opc .mvopt .sp-l{flex:1 1 auto}
  .opc .mvic{flex:none;display:grid;place-items:center;width:20px;color:var(--cat-c)}
  .opc .mvic svg{width:17px;height:17px}
  .opc .mvopt .mck{flex:none;color:var(--tint);visibility:hidden}
  .opc .mvopt .mck svg{width:15px;height:15px}
  .opc .mvopt[aria-checked="true"] .mck{visibility:visible}
  .opc .mvopt[aria-checked="true"] b{font-weight:600}
  .opc .mv-card{margin-top:14px}
  .opc .swrow{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;padding:8px 12px;font-size:13px;cursor:pointer}
  .opc .swl{min-width:0;overflow-wrap:anywhere}
  .opc .switch{flex:none;position:relative;width:32px;height:19px;margin:0;border-radius:999px;background:var(--switch-off);-webkit-appearance:none;appearance:none;cursor:pointer;transition:background-color .2s}
  .opc .switch::before{content:"";position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .2s var(--ease)}
  .opc .switch:checked{background:var(--switch-on)}
  .opc .switch:checked::before{transform:translateX(13px)}
  .opc .switch:focus-visible{outline:2px solid var(--tint);outline-offset:2px}

  /* Formulaire de connexion : type de boîte (obligatoire) */
  .opc .kind-card{padding:8px}
  .opc .kseg{display:flex;gap:2px;padding:2px;border-radius:9px;background:var(--fill)}
  .opc .kseg button{flex:1 1 0;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:26px;border-radius:7px;font-size:13px;font-weight:500;color:var(--label);text-align:center;transition:background-color .15s}
  .opc .kseg button svg{width:15px;height:15px}
  .opc .kseg button[data-kind="pro"] svg{color:var(--pro)}
  .opc .kseg button[data-kind="perso"] svg{color:var(--perso)}
  .opc .kseg button[aria-checked="true"]{background:var(--seg-on);font-weight:600;box-shadow:0 0 0 .5px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.14)}
  .opc .kseg button:focus-visible{outline-offset:0}
  .opc .kseg.invalid{box-shadow:0 0 0 2px var(--red-text)}
  .opc .kind-err{display:flex;gap:6px;align-items:flex-start;padding:8px 12px 0;font-size:12px;font-weight:600;line-height:1.4;color:var(--red-text)}
  .opc .kind-err svg{width:14px;height:14px;margin-top:1px}

  @keyframes opc-fade {from{opacity:0}}
  @keyframes opc-sheetIn {from{opacity:0;transform:translateY(-10px) scale(.985)}}
  @keyframes opc-sheetUp {from{transform:translateY(100%)}}
  @keyframes opc-pop {from{opacity:0;transform:scale(.92)}}

  @media all {
    .opc:where([data-fmt="mac"]) .rq-lbl{display:block;margin-right:2px;font-size:12px;color:var(--label-2)}
    .opc:where([data-fmt="mac"]) .rquick button{height:28px;padding:0 12px;border-radius:7px;background:var(--btn);color:var(--label);font-weight:400;box-shadow:0 0 0 .5px var(--btn-edge),0 1px 1.5px rgba(0,0,0,.08);transition:filter .12s}
    .opc:where([data-fmt="mac"]) .rquick button:hover{background:var(--btn);filter:brightness(.96)}

    .opc:where([data-fmt="mac"]) .overlay:not(.ov-menu){place-items:start center;padding:52px 24px 24px;background:var(--scrim-mac)}
    .opc:where([data-fmt="mac"]) .sheet{max-height:calc(100vh - 76px);animation:opc-sheetDown .26s var(--ease)}
    .opc:where([data-fmt="mac"]) .sheet:not(.compose) .sheet-bar{height:44px}
    .opc:where([data-fmt="mac"]) .sheet-foot{flex:none;display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:12px 16px;border-top:var(--hair) solid var(--sep-mac);background:var(--sheet-bar)}
    .opc:where([data-fmt="mac"]) .sheet-foot:empty{display:none}
    .opc:where([data-fmt="mac"]) .sheet-foot .btn{min-width:76px}
    .opc:where([data-fmt="mac"]) .back-btn{width:28px;height:28px;padding:0;border-radius:6px;background:none;box-shadow:none;color:var(--glyph)}
    .opc:where([data-fmt="mac"]) .back-btn:hover{background:var(--hover);color:var(--label);filter:none}
    .opc:where([data-fmt="mac"]) .back-btn .lbl{display:none}
    .opc:where([data-fmt="mac"]) .back-btn svg{width:14px;height:14px}
    .opc:where([data-fmt="mac"]) #cSchedBack{display:none}

    .opc:where([data-fmt="mac"]) .sheet.compose{height:min(620px,calc(100vh - 76px))}
    .opc:where([data-fmt="mac"]) .compose .sb-l{gap:2px}
    .opc:where([data-fmt="mac"]) .btn.send-btn,.opc:where([data-fmt="mac"]) .btn.sched-btn{width:34px;height:28px;padding:0;border-radius:6px;background:none;box-shadow:none}
    .opc:where([data-fmt="mac"]) .btn.primary.send-btn{background:none;color:var(--tint);box-shadow:none}
    .opc:where([data-fmt="mac"]) .btn.sched-btn{color:var(--glyph)}
    .opc:where([data-fmt="mac"]) .btn.send-btn:hover,.opc:where([data-fmt="mac"]) .btn.sched-btn:hover,.opc:where([data-fmt="mac"]) .btn.sched-btn[aria-expanded="true"]{background:var(--hover);filter:none}
    .opc:where([data-fmt="mac"]) .send-btn .lbl,.opc:where([data-fmt="mac"]) .sched-btn .lbl{display:none}
    .opc:where([data-fmt="mac"]) .send-btn svg,.opc:where([data-fmt="mac"]) .sched-btn svg{width:19px;height:19px}
    .opc:where([data-fmt="mac"]) #cSend{order:-1}
    .opc:where([data-fmt="mac"]) .compose-body .fld label{min-width:52px;text-align:right}
    .opc:where([data-fmt="mac"]) .compose-body .fld:focus-within label{color:var(--tint)}

    .opc:where([data-fmt="mac"]) .sched-pop{top:62px;left:10px;right:auto;overflow:visible;display:flex;flex-direction:column;max-height:calc(100% - 62px - 62px);transform-origin:top left}
    .opc:where([data-fmt="mac"]) .sched-pop > .sched{min-height:0;overflow:auto;border-radius:12px}
    .opc:where([data-fmt="mac"]) .sched-pop::before{content:"";position:absolute;top:-6px;left:var(--arrow-x,40px);width:12px;height:12px;background:inherit;border-radius:2px 0 0 0;transform:rotate(45deg);box-shadow:-.5px -.5px 0 var(--pop-edge)}

    .opc:where([data-fmt="mac"]) .toast{left:var(--opc-cx,50%);right:auto;margin:0;max-width:calc(var(--opc-lw,360px) - 24px);bottom:calc(16px + var(--opc-bas,0px));gap:10px;padding:8px 8px 8px 12px;transform:translate(-50%,14px)}
    .opc:where([data-fmt="mac"]) .toast.show{transform:translate(-50%,0)}
  }
  @keyframes opc-sheetDown {from{opacity:0;transform:translateY(-24px)}}

  @media all {
    .opc:where([data-fmt="mac"][data-etroit]){--side-w:220px;--list-w:clamp(280px,27cqw,392px)}
    .opc:where([data-fmt="mac"][data-etroit]) .tb{width:30px}
    .opc:where([data-fmt="mac"][data-etroit]) .tsep{width:6px}
  }
  /* iPad en paysage et écrans tactiles ≥ 1000 px : trois colonnes, mais cibles de 44 pt comme iPadOS */
  @media (pointer:coarse) {
    .opc:where([data-fmt="mac"]){--side-w:280px}
    .opc:where([data-fmt="mac"]) .side-scroll{padding:0 12px 16px}
    .opc:where([data-fmt="mac"]) .shead{font-size:13px;padding:6px 10px}
    .opc:where([data-fmt="mac"]) .srow{height:44px;gap:12px;padding:0 10px;border-radius:10px;font-size:17px}
    .opc:where([data-fmt="mac"]) .sic{width:26px;height:26px}
    .opc:where([data-fmt="mac"]) .sic svg{width:22px;height:22px}
    .opc:where([data-fmt="mac"]) .sic.tile{width:30px;height:30px;border-radius:8px} .opc:where([data-fmt="mac"]) .sic.tile svg{width:18px;height:18px}
    .opc:where([data-fmt="mac"]) .ptile{width:26px;height:26px;border-radius:7px;font-size:13px}
    .opc:where([data-fmt="mac"]) .ptile svg{width:16px;height:16px}
    .opc:where([data-fmt="mac"]) .cnt{font-size:15px}
    .opc:where([data-fmt="mac"]) .scope-row .chk{width:20px}
    .opc:where([data-fmt="mac"]) .scope-row .chk svg{width:18px;height:18px}
    .opc:where([data-fmt="mac"]) .tb{width:44px;height:44px;border-radius:10px;color:var(--tint)}
    .opc:where([data-fmt="mac"]) .tb svg{width:23px;height:23px}
    .opc:where([data-fmt="mac"]) .tb:hover{color:var(--tint)}
    .opc:where([data-fmt="mac"]) .tb.on-flag{color:var(--flag)}
    .opc:where([data-fmt="mac"]) .acts-mac{display:none}
    .opc:where([data-fmt="mac"]) .acts-nav{display:flex;align-items:center}
    .opc:where([data-fmt="mac"]) .acts-touch{display:flex;align-items:center;gap:2px;margin-left:auto}
    .opc:where([data-fmt="mac"]) .seg button{height:30px;font-size:13px}
    .opc:where([data-fmt="mac"]) .search{height:36px;border-radius:10px}
    .opc:where([data-fmt="mac"]) .search input{font-size:15px}
    .opc:where([data-fmt="mac"]) .btn{height:44px}
    .opc:where([data-fmt="mac"]) .btn.send-btn,.opc:where([data-fmt="mac"]) .btn.sched-btn,.opc:where([data-fmt="mac"]) .back-btn{width:44px;height:44px;border-radius:10px}
    .opc:where([data-fmt="mac"]) .msg .m-from{font-size:15px}
    .opc:where([data-fmt="mac"]) .m-sub{font-size:15px}
    .opc:where([data-fmt="mac"]) .m-prev{font-size:14px;line-height:19px}
    .opc:where([data-fmt="mac"]) .quick{display:none !important}
    .opc:where([data-fmt="mac"]) .rquick button{height:36px}
    .opc:where([data-fmt="mac"]) .mitem{font-size:17px}
    .opc:where([data-fmt="mac"]) .kbadge{font-size:12px;line-height:18px;padding:0 6px}
    .opc:where([data-fmt="mac"]) .catbar{flex-wrap:nowrap}
    .opc:where([data-fmt="mac"]) .cat{height:44px;min-width:48px;padding:0 13px;gap:6px;font-size:15px}
    .opc:where([data-fmt="mac"]) .cat svg{width:19px;height:19px}
    .opc:where([data-fmt="mac"]) .cat .cc{font-size:14px}
    .opc:where([data-fmt="mac"]) .lnk{min-height:44px;font-size:14px}
    .opc:where([data-fmt="mac"]) .cat-chip{height:28px;font-size:13px}
  }

  /* =====================================================================
     iPad (700–999 px) : vue partagée, barre latérale en colonne superposée
     ===================================================================== */
  @media all {
    .opc:where([data-fmt="phone"],[data-fmt="pad"]){--list-w:clamp(300px,42cqw,390px)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .app{grid-template-columns:var(--list-w) minmax(0,1fr)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sidebar{position:absolute;z-index:40;top:0;bottom:0;left:0;width:min(320px,88cqw);background:var(--side-pad);border-right:0;padding-top:var(--sa-top);box-shadow:0 0 0 var(--hair) var(--sep-mac),0 12px 50px rgba(0,0,0,.2);transform:translateX(-104%);visibility:hidden;transition:transform .42s var(--ease),visibility 0s linear .42s}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .app.nav-open .sidebar{transform:none;visibility:visible;transition:transform .42s var(--ease),visibility 0s}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .app.nav-open .scrim{display:block;position:absolute;inset:0;z-index:35;background:var(--scrim);animation:opc-fade .3s ease}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .side-top{height:56px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .side-scroll{padding:0 12px 16px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .shead{font-size:13px;padding:6px 10px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .srow{height:auto;min-height:44px;gap:12px;padding:0 10px;border-radius:10px;font-size:16px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sic{width:26px;height:26px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sic svg{width:22px;height:22px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sic.tile{width:30px;height:30px;border-radius:8px} .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sic.tile svg{width:18px;height:18px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .ptile{width:26px;height:26px;border-radius:7px;font-size:13px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .ptile svg{width:16px;height:16px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .cnt{font-size:15px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .scope-row .chk{width:20px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .scope-row .chk svg{width:18px;height:18px}

    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .list{grid-column:1;border-right:var(--hair) solid var(--sep);container-type:inline-size}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .reading{grid-column:2;container-type:inline-size}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .bar{height:calc(50px + var(--sa-top));padding-top:var(--sa-top)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .list-bar{padding-left:6px;padding-right:10px;gap:6px;border-bottom-color:transparent;border-right:0;transition:border-color .2s}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .list.scrolled .list-bar{border-bottom-color:var(--sep)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .nav-back{display:inline-flex;align-items:center;justify-content:center;gap:2px;min-width:44px;max-width:52cqw;height:44px;padding:0 6px 0 0;border-radius:10px;color:var(--tint);font-size:17px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .nav-back svg{width:24px;height:24px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .nav-back .ic-back svg{margin-right:-3px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) #btnNav .ic-side{display:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) #btnNav .ic-back,.opc:where([data-fmt="phone"],[data-fmt="pad"]) #btnNav .nb-lbl{display:block}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) #btnBack{display:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .lb-titles{position:absolute;left:50%;top:calc(var(--sa-top) + 25px);transform:translate(-50%,-50%);max-width:calc(100% - 120px);align-items:center;opacity:0;pointer-events:none;transition:opacity .2s}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .lb-title{max-width:100%}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .list.scrolled .lb-titles{opacity:1}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .lb-title{font-size:17px;font-weight:600}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .lb-sub{display:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .lt-sub{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:3px 8px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .scopebar{display:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .list-scroll{border-right:0;padding:0 0 12px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .lt{display:block;padding:0 20px 6px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .large-title{font:700 clamp(24px,8.6cqi,30px)/1.15 var(--font-d);letter-spacing:.004em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .lt-sub > span{min-width:0;overflow:hidden;text-overflow:ellipsis}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .lt-sub{margin-top:2px;font-size:15px;color:var(--label-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .search{width:auto;height:36px;margin:0;border-radius:10px;padding:0 8px;gap:6px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .search svg{width:17px;height:17px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .search input{font-size:17px}

    .opc:where([data-fmt="phone"],[data-fmt="pad"]) #rows{padding:0 8px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .msg{padding:10px 12px 11px 26px;border-radius:10px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .msg::after{left:26px;right:0}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .m-from{font-size:17px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .m-date{font-size:15px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .m-date svg{width:14px;height:14px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .m-sub{font-size:15px;margin-top:1px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .m-prev{font-size:15px;line-height:20px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .m-acct{font-size:13px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .dot{left:9px;top:17px;width:10px;height:10px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .flg{left:8px;top:36px;width:14px;height:14px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .flg svg{width:14px;height:14px}

    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .tools{display:flex;align-items:center;flex:none;position:relative;height:calc(50px + var(--sa-bottom));padding:0 8px var(--sa-bottom);background:var(--bar-ios);border-top:var(--hair) solid var(--sep)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .read-tools,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .side-tools{display:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .tbtn{flex:none;width:44px;height:44px;border-radius:10px;display:grid;place-items:center;color:var(--tint)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .tbtn svg{width:25px;height:25px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .tbtn[disabled]{opacity:.35;pointer-events:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .tbtn.on-flag{color:var(--flag)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .tool-gap{flex:none;width:44px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .list-tools .tool-gap{display:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .status{position:absolute;left:50%;top:calc((50px)/2);transform:translate(-50%,-50%);max-width:calc(100% - 120px);display:flex;flex-direction:column;align-items:center;text-align:center;font-size:12px;line-height:15px;white-space:nowrap}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .status span{max-width:100%;overflow:hidden;text-overflow:ellipsis}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .status .st2{font-size:11px;color:var(--label-2)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .status b{font-weight:600;color:var(--tint)}

    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .read-bar{padding:0 max(8px,var(--sa-right)) 0 8px;border-bottom:var(--hair) solid transparent;transition:border-color .2s}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .reading.scrolled .read-bar{border-bottom-color:var(--sep)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .acts-mac{display:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .acts-nav{display:flex;align-items:center}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .acts-touch{display:flex;align-items:center;gap:4px;margin-left:auto}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .tb{width:44px;height:44px;border-radius:10px;color:var(--tint)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .tb svg{width:23px;height:23px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .tb:hover{color:var(--tint)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .tb.on-flag{color:var(--flag)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) #slotComposeRead .tb,.opc:where([data-fmt="phone"],[data-fmt="pad"]) #btnCompose{color:var(--tint)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .rpad{padding:22px 28px 56px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .rsubj{font-size:24px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .rname{font-size:16px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .rmeta,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .rdate{font-size:14px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .rbody{font-size:16px;line-height:1.55}
  }

  /* iPadOS + iOS : feuilles et contrôles tactiles (barres de feuille en texte teinté, champs de 44 px) */
  @media all {
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sb-act{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sb-act .btn{min-width:0;height:44px;font-size:15px;font-weight:600;letter-spacing:-.01em;border-radius:10px;padding:0 6px;box-shadow:none;background:var(--banner-btn-t);color:var(--tint);white-space:normal;line-height:1.15;text-align:center}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sb-act .btn.primary{background:var(--tint);color:var(--on-tint)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sb-act .btn.danger{grid-column:1/-1;color:var(--red-text)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sheet-title{font-size:17px;font-weight:600}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .btn{height:44px;min-width:44px;padding:0 8px;background:none;box-shadow:none;color:var(--tint);font-size:17px;font-weight:400}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .btn:hover,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .btn:active{filter:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .btn:active{opacity:.55}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .btn.primary{background:none;color:var(--tint);font-weight:600;box-shadow:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .btn.primary:hover{background:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .send-btn,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .sched-btn{width:44px;padding:0}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .send-btn .lbl,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .send-btn .ic-plane,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .sched-btn .lbl{display:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .send-btn .ic-up{display:block;width:32px;height:32px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sched-btn svg{width:25px;height:25px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .back-btn{gap:0;padding-left:0}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .back-btn svg{width:24px;height:24px;margin-right:-2px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .tb.txt,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .tbtn.txt{width:auto;min-width:44px;padding:0 8px;font-size:17px;color:var(--tint)}
    /* Programmer l'envoi = page poussée dans la feuille : la barre de la feuille devient « ‹ Message · Programmer l'envoi » */
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sheet.compose.sched-open :is(#cCancel,#cSend,#cSched,.t-main){display:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sheet.compose.sched-open .t-sched{display:inline}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sheet.compose:not(.sched-open) #cSchedBack{display:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sched-head{display:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sched-tz{display:block;padding:8px 16px 0;font-size:13px;color:var(--label-2)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sp i::before{content:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .search-row{display:flex;align-items:center;min-width:0;margin:8px 16px 10px;gap:0}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .search-row .search{flex:1 1 auto;margin:0}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .search-cancel{flex:none;height:44px;margin:-4px 0 -4px 0;padding:0 0 0 12px;font-size:17px;color:var(--tint);white-space:nowrap}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .search-row:focus-within .search-cancel,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .search-row.has-q .search-cancel{display:block}
    .opc.kbd:where([data-fmt="phone"],[data-fmt="pad"]) .compose-body .fld:focus-within{box-shadow:inset 0 0 0 2px var(--tint)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .fld{min-height:44px;padding:0 max(16px,var(--sa-right)) 0 max(16px,var(--sa-left));border-bottom-color:var(--sep)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .fld label{font-size:17px;min-width:0}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .fld input,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .fld select{height:43px;font-size:17px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .cbody{font-size:17px;padding:14px 16px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .cfoot{padding:8px 8px 8px 16px;border-top-color:var(--sep)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .cnote{font-size:13px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sched-head span{font-size:13px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .ghead{font-size:13px;font-weight:400;letter-spacing:0;padding:18px 16px 7px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sp{min-height:52px;padding:8px 16px;font-size:17px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sp::after,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .gcard .fld::after{left:16px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sp b{font-weight:400}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sp .when{font-size:15px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sp-l i{display:block;font-size:13px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .gcard .fld{min-height:44px;padding:0 16px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .gcard .fld label{flex:0 0 128px;min-width:0;font-size:17px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .gcard .fld.sched-custom label{flex:1 1 auto}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sched-custom input{height:34px;padding:0 10px;border-radius:8px;font-size:17px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sched-note{font-size:13px;padding:10px 16px 0}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .gwrap{padding:4px max(16px,var(--sa-right)) 24px max(16px,var(--sa-left))}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .prov{min-height:60px;padding:8px 16px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .prov::after{left:62px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .prov .ptile{width:32px;height:32px;font-size:16px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .prov .pn b{font-size:17px;font-weight:400}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .prov .pn span{font-size:13px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .prov .go svg{width:13px;height:13px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .prov-intro{padding:8px 24px 16px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .prov-intro p{font-size:15px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .gfoot-s{font-size:13px;padding:8px 16px 0}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .note-card{font-size:15px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .menu{min-width:250px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .mitem{font-size:17px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sheet.acct .sheet-bar,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .sheet.rs .sheet-bar,.opc:where([data-fmt="phone"],[data-fmt="pad"]) .sheet.mv .sheet-bar{background:var(--grouped);border-bottom-color:transparent}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sched-head b{font-size:17px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sched-go .btn{height:44px;padding:0 16px;border-radius:10px;background:var(--tint);color:var(--on-tint);font-weight:600}
    /* Pro / Perso, catégories, tri : cibles de 44 pt */
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .kbadge{font-size:12px;line-height:18px;padding:0 6px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .catbar{flex-wrap:nowrap;padding:2px 20px 10px;gap:8px;border-right:0;scroll-padding:0 20px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .cat{height:44px;min-width:48px;padding:0 13px;gap:6px;font-size:15px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .cat svg{width:19px;height:19px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .cat .cc{font-size:14px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .cat:hover{background:var(--fill);box-shadow:none}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .cat[aria-pressed="true"]:hover{background:var(--cat-c)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .rcat{gap:0 18px;margin-left:0}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .why{margin-left:0}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .lnk{min-height:44px;font-size:15px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .lnk svg{width:14px;height:14px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .lnk .chv svg{width:11px;height:11px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .cat-chip{height:28px;font-size:14px;padding:0 9px 0 7px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .cat-chip svg{width:16px;height:16px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .why{margin-top:4px;font-size:15px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .why-note{font-size:13px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sched-banner .tx ul{font-size:13px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .sb-act .btn:only-child{grid-column:1/-1}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .mv-from{padding:14px 16px 0;font-size:15px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .mv-from span{font-size:13px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .mvic{width:26px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .mvic svg{width:22px;height:22px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .mvopt .mck svg{width:18px;height:18px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .swrow{min-height:52px;padding:8px 16px;font-size:17px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .switch{width:51px;height:31px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .switch::before{width:27px;height:27px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .switch:checked::before{transform:translateX(20px)}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .kseg{border-radius:10px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .kseg button{height:44px;font-size:17px;border-radius:8px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .kseg button svg{width:19px;height:19px}
    .opc:where([data-fmt="phone"],[data-fmt="pad"]) .kind-err{font-size:15px;padding:8px 16px 0}
  }
  @media all {
    .opc:where([data-fmt="pad"]) .sched-pop{inset:52px 0 0 0;width:auto;max-height:none;border-radius:0;box-shadow:none;animation:opc-fade .2s ease}
    .opc:where([data-fmt="pad"]) .sched{padding:20px 16px 24px}
  }

  /* =====================================================================
     iPhone (< 700 px) : pile de navigation plein écran
     ===================================================================== */
  @media all {
    .opc:where([data-fmt="phone"]){font-size:17px} .opc:where([data-fmt="phone"]) .opc-root{background:var(--plain)}
    .opc:where([data-fmt="phone"]) .app{display:block;background:var(--plain);transition:transform .42s var(--ease),border-radius .42s var(--ease),filter .42s}
    .opc:where([data-fmt="phone"]) .view{position:absolute;inset:0;display:block;background:var(--plain);visibility:hidden;transition:transform .42s var(--ease),visibility 0s linear .42s}
    .opc:where([data-fmt="phone"]) .sidebar{width:auto;right:0;z-index:1;padding:0;background:var(--grouped);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none;transform:translateX(-30%)}
    .opc:where([data-fmt="phone"]) .list{z-index:2;border-right:0;transform:translateX(100%)}
    .opc:where([data-fmt="phone"]) .reading{z-index:3;transform:translateX(100%)}
    .opc:where([data-fmt="phone"]) .list,.opc:where([data-fmt="phone"]) .reading{box-shadow:0 0 0 var(--hair) var(--sep),-12px 0 30px rgba(0,0,0,.08)}
    .opc:where([data-fmt="phone"]) .app[data-view="mailboxes"] .sidebar,.opc:where([data-fmt="phone"]) .app[data-view="list"] .list,.opc:where([data-fmt="phone"]) .app[data-view="reading"] .reading{transform:none;visibility:visible;transition:transform .42s var(--ease),visibility 0s}
    .opc:where([data-fmt="phone"]) .app[data-view="reading"] .list{transform:translateX(-30%)}
    .opc:where([data-fmt="phone"]) .app.nav-open .scrim{display:none}

    .opc:where([data-fmt="phone"]) .bar{position:absolute;top:0;left:0;right:0;height:calc(44px + var(--sa-top));padding:var(--sa-top) max(4px,var(--sa-right)) 0 max(4px,var(--sa-left));gap:0;background:transparent;border-bottom:var(--hair) solid transparent;transition:background-color .2s,border-color .2s}
    .opc:where([data-fmt="phone"]) .view.scrolled .bar{background:var(--bar-ios);-webkit-backdrop-filter:saturate(1.8) blur(20px);backdrop-filter:saturate(1.8) blur(20px);border-bottom-color:var(--sep)}
    .opc:where([data-fmt="phone"]) .scroller{position:absolute;inset:0;padding-top:calc(44px + var(--sa-top));padding-bottom:calc(49px + var(--sa-bottom) + 24px)}
    .opc:where([data-fmt="phone"]) .tools{position:absolute;left:0;right:0;bottom:0;z-index:6;height:calc(49px + var(--sa-bottom));padding:0 max(6px,var(--sa-right)) var(--sa-bottom) max(6px,var(--sa-left));-webkit-backdrop-filter:saturate(1.8) blur(20px);backdrop-filter:saturate(1.8) blur(20px)}
    .opc:where([data-fmt="phone"]) .read-tools,.opc:where([data-fmt="phone"]) .side-tools{display:flex}
    .opc:where([data-fmt="phone"]) .list-tools .tool-gap{display:block}
    .opc:where([data-fmt="phone"]) .read-tools{justify-content:space-between}
    .opc:where([data-fmt="phone"]) .status{top:calc(49px/2)}
    .opc:where([data-fmt="phone"]) .compose-fixed{display:flex;align-items:center;position:absolute;z-index:20;right:max(6px,var(--sa-right));bottom:var(--sa-bottom);height:49px}
    .opc:where([data-fmt="phone"]) #btnCompose{width:44px;height:44px;color:var(--tint)}
    .opc:where([data-fmt="phone"]) #btnCompose svg{width:25px;height:25px}
    .opc:where([data-fmt="phone"]) .tb{width:44px;height:44px}

    /* Barres de navigation */
    .opc:where([data-fmt="phone"]) .nb-title{display:block;position:absolute;left:50%;top:calc(var(--sa-top) + 22px);transform:translate(-50%,-50%);max-width:calc(100% - 208px);font-size:17px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;transition:opacity .2s;pointer-events:none}
    .opc:where([data-fmt="phone"]) .view.scrolled .nb-title,.opc:where([data-fmt="phone"]) .view.scrolled .lb-titles{opacity:1}
    .opc:where([data-fmt="phone"]) .lb-titles{top:calc(var(--sa-top) + 22px);max-width:calc(100% - 208px)}
    .opc:where([data-fmt="phone"]) #btnBack{display:inline-flex}
    .opc:where([data-fmt="phone"]) .nb-lbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .opc:where([data-fmt="phone"]) .list-bar,.opc:where([data-fmt="phone"]) .read-bar{padding-left:max(4px,var(--sa-left));padding-right:max(8px,var(--sa-right))}
    /* « Maquette » sous le grand titre, jamais à côté d'un titre centré */

    /* Boîtes aux lettres (racine de la pile) */
    .opc:where([data-fmt="phone"]) .side-top{padding-left:max(16px,var(--sa-left));padding-right:max(6px,var(--sa-right));gap:6px}
    .opc:where([data-fmt="phone"]) .side-top .brand{display:none}
    .opc:where([data-fmt="phone"]) .side-top .tb{color:var(--tint);margin-left:auto}
    .opc:where([data-fmt="phone"]) .side-scroll{padding-left:max(16px,var(--sa-left));padding-right:max(16px,var(--sa-right))}
    .opc:where([data-fmt="phone"]) .side-lt{display:block;padding:2px 4px 0}
    .opc:where([data-fmt="phone"]) .sidebar .side-sub{display:flex;padding:0 4px 4px}
    .opc:where([data-fmt="phone"]) .large-title{font-size:34px;line-height:41px;letter-spacing:.01em}
    .opc:where([data-fmt="phone"]) .sgroup{margin-top:24px}
    .opc:where([data-fmt="phone"]) .sgroup:first-child{margin-top:12px}
    .opc:where([data-fmt="phone"]) .shead{font:700 20px/25px var(--font-d);color:var(--label);padding:0 4px 8px;letter-spacing:.01em}
    .opc:where([data-fmt="phone"]) .glist{gap:0;background:var(--cell);border-radius:10px;overflow:hidden}
    .opc:where([data-fmt="phone"]) .srow{height:auto;min-height:44px;padding:0 16px;gap:14px;border-radius:0;font-size:17px}
    .opc:where([data-fmt="phone"]) .srow::after{content:"";position:absolute;left:58px;right:0;bottom:0;height:var(--hair);background:var(--sep)}
    .opc:where([data-fmt="phone"]) .srow:last-child::after{display:none}
    .opc:where([data-fmt="phone"]) .srow:hover,.opc:where([data-fmt="phone"]) .srow[aria-current="true"]{background:none}
    .opc:where([data-fmt="phone"]) .srow:active{background:var(--cell-press)}
    .opc:where([data-fmt="phone"]) .srow:focus-visible{outline-offset:-2px}
    .opc:where([data-fmt="phone"]) .sic{width:28px;height:28px}
    .opc:where([data-fmt="phone"]) .sic svg{width:25px;height:25px}
    .opc:where([data-fmt="phone"]) .sic.tile{width:30px;height:30px;border-radius:8px} .opc:where([data-fmt="phone"]) .sic.tile svg{width:18px;height:18px}
    .opc:where([data-fmt="phone"]) .ptile{width:28px;height:28px;border-radius:7px;font-size:14px}
    .opc:where([data-fmt="phone"]) .ptile svg{width:18px;height:18px}
    .opc:where([data-fmt="phone"]) .scope-row{min-height:58px;padding-top:7px;padding-bottom:7px}
    .opc:where([data-fmt="phone"]) .ss{display:block;font-size:13px;line-height:17px;color:var(--label-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .opc:where([data-fmt="phone"]) .cnt{font-size:17px}
    .opc:where([data-fmt="phone"]) .srow .chev{display:block;color:var(--label-3)}
    .opc:where([data-fmt="phone"]) .srow .chev svg{width:13px;height:13px}
    .opc:where([data-fmt="phone"]) .scope-row .chk{display:block;width:20px;color:var(--tint);visibility:hidden}
    .opc:where([data-fmt="phone"]) .scope-row .chk svg{width:19px;height:19px}
    .opc:where([data-fmt="phone"]) .scope-row[aria-current="true"] .chk{visibility:visible}
    .opc:where([data-fmt="phone"]) .srow.add .sn{color:var(--tint)}
    .opc:where([data-fmt="phone"]) .srow.add .sic svg{width:27px;height:27px}
    .opc:where([data-fmt="phone"]) .side-foot{padding-top:24px}
    .opc:where([data-fmt="phone"]) .gfoot{display:block;padding:8px 16px 0;font-size:13px;line-height:1.38;color:var(--label-2)}

    /* Liste iOS */
    .opc:where([data-fmt="phone"]) .list-scroll{padding-bottom:calc(49px + var(--sa-bottom) + 24px)}
    .opc:where([data-fmt="phone"]) .lt{padding:2px max(16px,var(--sa-left)) 4px}
    .opc:where([data-fmt="phone"]) .large-title{font-size:34px;line-height:41px}
    .opc:where([data-fmt="phone"]) .search-row{margin:6px max(16px,var(--sa-right)) 10px max(16px,var(--sa-left))}
    .opc:where([data-fmt="phone"]) .catbar{padding:0 max(16px,var(--sa-right)) 10px max(16px,var(--sa-left));scroll-padding:0 16px}
    .opc:where([data-fmt="phone"]) #rows{padding:0}
    .opc:where([data-fmt="phone"]) .msg{padding:11px max(16px,var(--sa-right)) 11px max(32px,calc(var(--sa-left) + 32px));border-radius:0;min-height:44px}
    .opc:where([data-fmt="phone"]) .msg::after{left:max(32px,calc(var(--sa-left) + 32px))}
    .opc:where([data-fmt="phone"]) .msg:last-child::after{opacity:1}
    .opc:where([data-fmt="phone"]) .msg.sel,.opc:where([data-fmt="phone"]) .msg.sel :is(.m-date,.m-prev,.clk){background:none;color:inherit}
    .opc:where([data-fmt="phone"]) .msg.sel .m-date,.opc:where([data-fmt="phone"]) .msg.sel .m-prev{color:var(--label-2)}
    .opc:where([data-fmt="phone"]) .msg.sel .clk{color:var(--tint)}
    .opc:where([data-fmt="phone"]) .msg.sel .dot{background:var(--tint)}
    .opc:where([data-fmt="phone"]) .msg.sel .dotc{outline:none}
    .opc:where([data-fmt="phone"]) .msg.sel .flg{color:var(--flag)}
    .opc:where([data-fmt="phone"]) .msg.sel .flg svg .fb{stroke:var(--flag-edge)}
    .opc:where([data-fmt="phone"]) .msg.sel::after,.opc:where([data-fmt="phone"]) .msg:has(+ .msg.sel)::after{opacity:1}
    .opc:where([data-fmt="phone"]) .msg:active{background:var(--cell-press)}
    .opc:where([data-fmt="phone"]) .msg.flash{animation:opc-deselect .9s ease}
    .opc:where([data-fmt="phone"]) .m-chev{display:block;color:var(--label-3);margin-left:2px}
    .opc:where([data-fmt="phone"]) .m-chev svg{width:13px;height:13px}
    .opc:where([data-fmt="phone"]) .dot{left:max(12px,calc(var(--sa-left) + 12px));top:18px}
    .opc:where([data-fmt="phone"]) .m-date .dotc{width:8px;height:8px;margin-right:3px}
    .opc:where([data-fmt="phone"]) .flg{left:max(10px,calc(var(--sa-left) + 10px))}

    /* Message iOS */
    .opc:where([data-fmt="phone"]) .read-bar .read-acts{justify-content:flex-end}
    .opc:where([data-fmt="phone"]) .acts-touch{display:none}
    .opc:where([data-fmt="phone"]) .acts-nav{margin-left:auto}
    .opc:where([data-fmt="phone"]) .rpad{display:flex;flex-direction:column;padding:8px max(16px,var(--sa-right)) 24px max(16px,var(--sa-left))}
    .opc:where([data-fmt="phone"]) .rhead{order:1}
    .opc:where([data-fmt="phone"]) .rsubj{order:2;margin:14px 0 0;font:600 20px/25px var(--font-d);letter-spacing:-.01em;text-wrap:wrap}
    .opc:where([data-fmt="phone"]) .sched-banner{order:3;margin:14px 0 0}
    .opc:where([data-fmt="phone"]) .rcat{order:3;margin:10px 0 0;gap:0 16px}
    .opc:where([data-fmt="phone"]) .why{order:3;margin:2px 0 0}
    .opc:where([data-fmt="phone"]) .cat-chip{height:26px;font-size:13px;padding:0 8px 0 6px}
    .opc:where([data-fmt="phone"]) .cat-chip svg{width:15px;height:15px}
    .opc:where([data-fmt="phone"]) .mv-long{display:none}
    .opc:where([data-fmt="phone"]) .mv-short{display:inline}
    .opc:where([data-fmt="phone"]) .rsep{order:4}
    .opc:where([data-fmt="phone"]) .rbody{order:5}
    .opc:where([data-fmt="phone"]) .rquick{order:6}
    .opc:where([data-fmt="phone"]) .rname{font-size:17px;font-weight:600}
    .opc:where([data-fmt="phone"]) .rmeta{font-size:15px;line-height:20px}
    .opc:where([data-fmt="phone"]) .rdate{font-size:15px}
    .opc:where([data-fmt="phone"]) .rdate .d-long{display:none}
    .opc:where([data-fmt="phone"]) .rdate .d-short{display:inline}
    .opc:where([data-fmt="phone"]) .rsep{margin:14px 0 16px;background:var(--sep)}
    .opc:where([data-fmt="phone"]) .rbody{font-size:17px;line-height:1.47}
    .opc:where([data-fmt="phone"]) .att{max-width:100%}
    /* Réponses rapides : pastilles qui passent à la ligne dans les marges du message (rien ne déborde ni n'est coupé).
       36 px de haut + 4 px de zone tactile au-dessus et au-dessous = 44 pt ; l'écart de 8 px évite tout chevauchement. */
    .opc:where([data-fmt="phone"]) .rquick{flex-wrap:wrap;gap:8px;margin:26px 0 0;padding:0}
    .opc:where([data-fmt="phone"]) .rquick button{flex:0 1 auto;max-width:100%;min-height:36px;padding:8px 14px;font-size:15px;line-height:20px;white-space:normal;overflow-wrap:anywhere;text-align:left;position:relative}
    .opc:where([data-fmt="phone"]) .rquick button::before{content:"";position:absolute;inset:-4px 0}
    .opc:where([data-fmt="phone"]) .sched-banner{padding:14px 12px 12px}
    .opc:where([data-fmt="phone"]) .sched-banner .tx b{font-size:15px}
    .opc:where([data-fmt="phone"]) .sched-banner .tx span{font-size:13px}

    /* Feuilles iOS (glissent du bas, poignée, zones sûres) */
    .opc.has-sheet:where([data-fmt="phone"]) .opc-root{background:#000}
    .opc.sheet-under:where([data-fmt="phone"]) .app{transform-origin:50% 0;transform:translateY(max(var(--sa-top),20px)) scale(.92);border-radius:12px;overflow:hidden;filter:brightness(.85)}
    .opc:where([data-fmt="phone"]) .overlay{display:flex;align-items:flex-end;padding:calc(max(var(--sa-top),20px) + 10px) 0 0}
    .opc:where([data-fmt="phone"]) .sheet{width:100%;max-height:100%;border-radius:12px 12px 0 0;padding-bottom:var(--sa-bottom);animation:opc-sheetUp .42s var(--ease)}
    .opc:where([data-fmt="phone"]) .sheet::before{content:"";position:absolute;z-index:9;top:5px;left:50%;width:36px;height:5px;margin-left:-18px;border-radius:3px;background:var(--label-3)}
    .opc:where([data-fmt="phone"]) .sheet.compose,.opc:where([data-fmt="phone"]) .sheet.acct{height:100%}
    .opc:where([data-fmt="phone"]) .sheet-bar{height:58px;padding:8px max(8px,var(--sa-right)) 0 max(8px,var(--sa-left));border-bottom-color:var(--sep)}
    .opc:where([data-fmt="phone"]) .sheet.acct .sheet-bar,.opc:where([data-fmt="phone"]) .sheet.rs .sheet-bar,.opc:where([data-fmt="phone"]) .sheet.mv .sheet-bar{background:var(--grouped);border-bottom-color:transparent}
    .opc:where([data-fmt="phone"]) .sched-pop{inset:58px 0 0 0;width:auto;max-height:none;border-radius:0;box-shadow:none;animation:opc-fade .2s ease;background:var(--grouped-elev)}
    .opc:where([data-fmt="phone"]) .sched{padding:20px 16px 28px}
    .opc:where([data-fmt="phone"]) .sched-go{padding-top:16px}
    .opc:where([data-fmt="phone"]) .sched-go .btn{width:100%;height:50px;border-radius:12px;background:var(--tint);color:var(--on-tint);font-weight:600}

    .opc:where([data-fmt="phone"]) .gcard .fld label{flex:0 0 116px}   /* colonne d’étiquettes plus étroite (valeurs alignées) : une adresse de 22 caractères tient entière */
    .opc:where([data-fmt="phone"]) .toast{bottom:calc(49px + 14px + var(--opc-bas,0px) + var(--sa-bottom));max-width:calc(100vw - 32px);font-size:15px;padding:11px 12px 11px 16px}
    .opc:where([data-fmt="phone"]) .toast .undo{position:relative;padding:9px 12px}
    .opc:where([data-fmt="phone"]) .toast .undo::before{content:"";position:absolute;inset:-4px -2px}   /* zone tactile de 44 pt */
    .opc:where([data-fmt="phone"]) .toast.quiet,.opc:where([data-fmt="phone"]) .toast.quiet .undo{opacity:0 !important;pointer-events:none !important}   /* HUD caché : son bouton ne capte rien non plus */
    /* Annuler l'envoi dans la zone d'état de la barre du bas, comme Mail sur iPhone */
    .opc:where([data-fmt="phone"]) .status.undoing{flex-direction:row;align-items:center;gap:6px;font-size:15px}
    .opc:where([data-fmt="phone"]) .status .st-undo{flex:none;height:44px;padding:0 4px;font-size:15px;font-weight:600;color:var(--tint)}

    .opc:where([data-fmt="phone"]) .search:focus-within,.opc:where([data-fmt="phone"]) .fld:focus-within,.opc:where([data-fmt="phone"]) .gcard .fld:focus-within{box-shadow:none}
    .opc:where([data-fmt="phone"]) .cbody:focus-visible{box-shadow:none}
    .opc.kbd:where([data-fmt="phone"]) .search:focus-within{box-shadow:0 0 0 2px var(--tint)}
    .opc.kbd:where([data-fmt="phone"]) .fld:focus-within,.opc.kbd:where([data-fmt="phone"]) .gcard .fld:focus-within,.opc.kbd:where([data-fmt="phone"]) .cbody:focus-visible{box-shadow:inset 0 0 0 2px var(--tint)}
    .opc:where([data-fmt="phone"]) .compose #cDraft{display:none}
    .opc:where([data-fmt="phone"]) .cfoot{padding:8px max(16px,var(--sa-right)) 8px max(16px,var(--sa-left))}
    .opc:where([data-fmt="phone"]) .cnote{align-items:flex-start;font-size:13px;line-height:1.35}
    .opc:where([data-fmt="phone"]) .cnote svg{margin-top:1px}
    .opc:where([data-fmt="phone"]) .sheet-title .ptile{display:none}
    .opc:where([data-fmt="phone"]) .t-short{display:inline}
    .opc:where([data-fmt="phone"]) .t-long{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    .opc:where([data-fmt="phone"]) .ov-asheet.nested{position:absolute;inset:0;z-index:20;animation:opc-fade .2s ease}
    @keyframes opc-deselect {from{background:var(--cell-press)}}
  }
  @media (hover:none) { .opc:where([data-fmt="phone"]) .quick{display:none !important} }
  @container (max-width:540px){ .opc .rdate .d-long{display:none} .opc .rdate .d-short{display:inline} }
  @media (max-height:520px) { .opc .cbody{min-height:80px} .opc .prov-intro{padding-top:12px} .opc .prov-intro .glyph{display:none} }

  @media (prefers-reduced-motion:reduce) {
    .opc, .opc *,.opc *::before,.opc *::after{animation-duration:.001s !important;animation-iteration-count:1 !important;transition-duration:.001s !important;transition-delay:0s !important;scroll-behavior:auto !important}
  }

  /* ---------- Ce que le module ajoute à la maquette ---------- */
  .opc .soon{flex:none;font-size:10.5px;font-weight:700;letter-spacing:.02em;line-height:17px;color:var(--label-2);background:var(--fill);border-radius:999px;padding:0 7px;white-space:nowrap}
  .opc .loaderr{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 14px;font-size:12px;font-weight:600;color:var(--red-text);background:var(--warn-soft)}
  .opc .loaderr .lnk{flex:none}
  .opc .lecture{color:var(--label-2)}
  /* un seul côté (options.cotes) : ni sélecteur Pro / Perso, ni badge, ni choix de côté dans les feuilles */
  .opc[data-un-cote] .kind-hide,.opc[data-un-cote] .kbadge{display:none}
`;
var FEUILLE = null;
function feuilleDans(sr) {
  try { if (!FEUILLE) { FEUILLE = new CSSStyleSheet(); FEUILLE.replaceSync(CSS); } sr.adoptedStyleSheets = [FEUILLE]; return; } catch (e) { /* navigateur sans feuilles partagées */ }
  var st = document.createElement("style"); st.textContent = CSS; sr.appendChild(st);
}

/* ═══ Le balisage du cadre (les feuilles et menus s'ouvrent dans le calque) ═══ */
var MARKUP = `
<div class="app" id="app" data-scope="pro" data-view="list">
  <nav class="sidebar view" id="sidebar" aria-label="Boîtes aux lettres" tabindex="-1">
    <div class="side-top bar">
      <div class="brand"><span class="glyph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.6 7.6 8.4 6 8.4-6"/></svg></span><span class="wm" id="brandName"></span></div>
      <span class="nb-title" aria-hidden="true">Boîtes aux lettres</span>
      
    </div>
    <div class="slot" id="slotSpaceSide"></div>
    <div class="side-scroll scroller" id="sideScroll">
      <h1 class="large-title side-lt">Boîtes aux lettres</h1>
      <p class="lt-sub side-sub"><span id="sideSubName"></span></p>
      <div id="sideBody"></div>
    </div>
    <div class="tools side-tools"><span class="tool-gap"></span><div class="status" id="sideStatus"></div><span class="tool-gap"></span></div>
  </nav>

  <section class="list view" id="list" aria-label="Liste des messages" tabindex="-1">
    <div class="list-bar bar">
      <button class="nav-back" id="btnNav" type="button" aria-label="Boîtes aux lettres" title="Boîtes aux lettres">
        <span class="ic-back" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4.5 7.5 12l7.5 7.5"/></svg></span><span class="nb-lbl" aria-hidden="true">Boîtes</span>
        <span class="ic-side" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.75" y="4.25" width="18.5" height="15.5" rx="2.75"/><path d="M9.25 4.25v15.5M5.5 8h1.25M5.5 10.75h1.25M5.5 13.5h1.25"/></svg></span>
      </button>
      <div class="lb-titles"><span class="lb-title" id="lbTitle">Boîte de réception</span><span class="lb-sub" id="lbSub"></span></div>
      
      <button class="seltog" id="btnSelect" type="button" aria-pressed="false">Sélectionner</button>
      <span class="slot" id="slotComposeList"><button class="tb" id="btnCompose" type="button" aria-label="Nouveau message" title="Nouveau message (C)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.5 4.25H6.75a2.5 2.5 0 0 0-2.5 2.5v10.5a2.5 2.5 0 0 0 2.5 2.5h10.5a2.5 2.5 0 0 0 2.5-2.5V12.5"/><path d="M18.1 3.4a1.95 1.95 0 0 1 2.75 2.75l-8.2 8.2-3.6.85.85-3.6Z"/></svg></button></span>
    </div>
    <div class="slot" id="slotSpaceTop"><div class="spacebar" id="spaceBar" role="group" aria-label="Côté Perso ou côté Pro">
      <button type="button" class="sptab sp-perso" data-space="perso" aria-pressed="false">Perso <span class="spn" id="spnPerso"></span></button><button type="button" class="sptab sp-pro" data-space="pro" aria-pressed="false">Pro <span class="spn" id="spnPro"></span></button>
    </div></div>
    <div class="scopebar"><div class="seg" id="filters" role="group" aria-label="Filtrer les messages">
      <button type="button" data-filter="all" aria-pressed="true">Tous</button><button type="button" data-filter="unread" aria-pressed="false">Non lus</button><button type="button" data-filter="flagged" aria-pressed="false">Marqués</button>
    </div></div>
    <!-- Catégories du tri automatique : sous l'en-tête de liste (Mac), sous le grand titre (iPad, iPhone) -->
    <div class="slot" id="slotCatMac"><div class="catbar" id="catBar" role="group" aria-label="Catégories de la boîte de réception"></div></div>
    <div class="list-scroll scroller" id="listScroll">
      <div class="lt"><h1 class="large-title" id="ltTitle">Boîte de réception</h1><p class="lt-sub"><span id="ltSub"></span></p></div>
      <div class="slot" id="slotSpaceList"></div>
      <div class="slot" id="slotSearchList"></div>
      <div class="slot" id="slotCatList"></div>
      <div id="rows" role="listbox" aria-label="Messages"></div>
    </div>
    <div class="tools list-tools">
      <button class="tbtn" id="btnFilter" type="button" aria-haspopup="menu" aria-label="Filtrer les messages" title="Filtrer"></button>
      <div class="status" id="listStatus"></div>
      <span class="tool-gap"></span>
    </div>
    <div class="selbar" id="selBar" role="toolbar" aria-label="Actions sur la sélection" hidden></div>
  </section>

  <section class="reading view" id="reading" aria-label="Message" tabindex="-1">
    <div class="read-bar bar">
      <button class="nav-back" id="btnBack" type="button"><span class="ic-back" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4.5 7.5 12l7.5 7.5"/></svg></span><span class="sr">Retour à </span><span class="nb-lbl" id="backLbl">Boîte de réception</span></button>
      <div class="read-acts" id="readActs"></div>
      <span class="slot" id="slotSearchTb"><span class="search-row" id="searchRow"><label class="search" id="searchBox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.25"/><path d="m15.25 15.25 5 5"/></svg><input id="search" type="search" placeholder="Rechercher" autocomplete="off" aria-label="Rechercher dans le courrier"></label><button class="search-cancel" id="searchCancel" type="button">Annuler</button></span></span>
      <span class="slot" id="slotComposeRead"></span>
    </div>
    <div class="read-scroll scroller" id="readScroll"></div>
    <div class="tools read-tools" id="readTools"></div>
  </section>

  <div class="scrim" id="scrim"></div>
  <div class="compose-fixed" id="slotComposeFixed"></div>
</div>
`;

/* ═══ Le module ═══ */
  function creer(conteneur, opt){
  "use strict";
  opt = opt || {};
  var SRC = opt.source;
  if(!SRC || typeof SRC.boites !== "function") throw new Error("OPCourrier.monter : l’option « source » (l’adaptateur de données) est obligatoire.");
  var COTES = (opt.cotes || []).filter(function(c){ return c === "pro" || c === "perso"; });
  if(!COTES.length) COTES = ["pro", "perso"];
  var UN_COTE = COTES.length === 1;
  var LS = String(opt.cleStockage || "opcourrier");
  var TITRE = String(opt.titre || "OP Courrier");
  var TITRE_ORIG = document.title;   // le titre de l'hôte : « (n) » s'écrit devant (options.titreDocument), et lui est rendu au démontage
  var finis = [];   // tout ce que le module accroche HORS de son arbre (window, document, minuteries, observateurs) se décroche ici
  var vivant = true;
  function sur(cible, type, fn, o){ cible.addEventListener(type, fn, o); finis.push(function(){ cible.removeEventListener(type, fn, o); }); }

  // ---------- Le DOM : un arbre d'ombre, donc ni la feuille de l'hôte ne touche le module, ni la sienne l'hôte ----------
  // Le calque (feuilles, menus, notification) est promu dans la « couche supérieure » du navigateur (popover manuel) : il passe
  // au-dessus de TOUTE la page, barre de l'hôte comprise, quel que soit l'empilement de l'endroit où le module est monté.
  var hote = document.createElement("div");
  hote.setAttribute("data-opcourrier", "");
  hote.style.cssText = "display:block;width:100%;height:100%;min-height:0";
  conteneur.appendChild(hote);
  var sr = hote.attachShadow({mode:"open"});
  feuilleDans(sr);
  sr.innerHTML = '<div class="opc" data-fmt="mac" data-theme="jour"><div class="opc-root">' + MARKUP + '</div>' +
    '<div class="opc-layer" popover="manual"><div id="overlays"></div><div class="toast" id="toast" role="status" aria-live="polite"></div></div></div>';
  var $=function(s,r){return (r||sr).querySelector(s);};
  var $$=function(s,r){return Array.prototype.slice.call((r||sr).querySelectorAll(s));};
  var H=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
  var app=$("#app"), cadre=$(".opc"), layerEl=$(".opc-layer");
  var actif=function(){ return sr.activeElement; };
  try{ layerEl.showPopover(); }catch(e){ /* navigateur sans popover : le calque reste « fixed » avec son z-index */ }
  if(UN_COTE) cadre.setAttribute("data-un-cote", "");
  $("#brandName").textContent = TITRE; $("#sideSubName").textContent = TITRE;

  // ---------- Thème : l'HÔTE décide (options.theme() → 'jour' | 'nuit'), à défaut l'appareil ----------
  function themeCourant(){ var t = null; try{ t = typeof opt.theme === "function" ? opt.theme() : null; }catch(e){ t = null; }
    if(t === "nuit" || t === "dark") return "nuit"; if(t === "jour" || t === "light") return "jour";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "nuit" : "jour"; }
  function appliquerTheme(){ var t = themeCourant(); if(cadre.getAttribute("data-theme") !== t) cadre.setAttribute("data-theme", t); }
  appliquerTheme();
  try{ var mqDark = window.matchMedia("(prefers-color-scheme: dark)"); if(mqDark.addEventListener) sur(mqDark, "change", appliquerTheme); }catch(e){}
  // l'hôte change de thème en posant un attribut ou une classe sur <html> / <body> : on le voit sans qu'il ait à nous prévenir
  try{ var obsTheme = new MutationObserver(appliquerTheme);
    obsTheme.observe(document.documentElement, {attributes:true, attributeFilter:["data-theme", "class", "data-marque"]});
    if(document.body) obsTheme.observe(document.body, {attributes:true, attributeFilter:["class", "data-theme"]});
    finis.push(function(){ obsTheme.disconnect(); }); }catch(e){}

  // ---------- Format : Mac / iPad / iPhone se décident sur la LARGEUR DU CONTENEUR, pas sur celle de l'écran ----------
  // (le module vit dans la zone de contenu d'une application dont le menu prend déjà 258 px : une requête @media sur l'écran se tromperait)
  var curFmt = "mac";
  function layout(){ return curFmt; }
  function isPhone(){ return curFmt === "phone"; }
  function appliquerFormat(){
    var w = hote.getBoundingClientRect().width || conteneur.clientWidth || window.innerWidth || 1024;
    var f = w < 700 ? "phone" : w < 1000 ? "pad" : "mac";
    cadre.setAttribute("data-fmt", f);
    if(f === "mac" && w <= 1180) cadre.setAttribute("data-etroit", ""); else cadre.removeAttribute("data-etroit");
    var change = f !== curFmt; curFmt = f; return change; }
  appliquerFormat();

  // ---------- Icônes (dessinées à la main, trait façon SF Symbols) ----------
  function S(d,w){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(w||1.7)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+d+'</svg>'; }
  var I={
    inbox:S('<path d="M2.75 13.25h5.1l1.15 2.5h6l1.15-2.5h5.1"/><path d="M6.6 5h10.8c.8 0 1.5.5 1.8 1.2l2.05 5.4c.07.2.1.4.1.6v5.05a2.25 2.25 0 0 1-2.25 2.25H4.9a2.25 2.25 0 0 1-2.25-2.25V12.2c0-.2.03-.4.1-.6L4.8 6.2C5.1 5.5 5.8 5 6.6 5Z"/>'),
    tray2:S('<path d="M7 3.75h10M5 6.75h14"/><path d="M2.75 14.5h5.1l1.15 2.25h6l1.15-2.25h5.1"/><path d="M5.2 9.75h13.6c.55 0 1.05.35 1.25.9l1.2 3.35v3.75A2.25 2.25 0 0 1 19 20H5a2.25 2.25 0 0 1-2.25-2.25V14l1.2-3.35c.2-.55.7-.9 1.25-.9Z"/>'),
    flag:S('<path d="M5.5 21V4.2"/><path d="M5.5 4.6c1.9-1.2 3.9-1.2 6 0s4.1 1.2 6.5 0v8.6c-2.4 1.2-4.4 1.2-6.5 0s-4.1-1.2-6 0"/>'),
    flagFill:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.5 21V4.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="fb" d="M5.5 4.6c1.9-1.2 3.9-1.2 6 0s4.1 1.2 6.5 0v8.6c-2.4 1.2-4.4 1.2-6.5 0s-4.1-1.2-6 0Z" fill="currentColor" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    draft:S('<path d="M13.75 3H7a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7 21h10a2.25 2.25 0 0 0 2.25-2.25V8.5Z"/><path d="M13.75 3v5.5h5.5"/><path d="M8.5 13h7M8.5 16.5h4.5"/>'),
    compose:S('<path d="M11.5 4.25H6.75a2.5 2.5 0 0 0-2.5 2.5v10.5a2.5 2.5 0 0 0 2.5 2.5h10.5a2.5 2.5 0 0 0 2.5-2.5V12.5"/><path d="M18.1 3.4a1.95 1.95 0 0 1 2.75 2.75l-8.2 8.2-3.6.85.85-3.6Z"/>'),
    sign:S('<path d="M3 16.5c2.2 0 3.2-6.5 5.6-6.5 2 0 .6 5.5 3.1 5.5 2 0 2.4-3 4.3-3 1.5 0 1.6 1.6 4.5 1.6"/><path d="M3 20.5h18"/>'),
    gear:S('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.75"/><path d="M12 2.5v2.75M12 18.75v2.75M2.5 12h2.75M18.75 12h2.75M5.3 5.3l1.9 1.9M16.8 16.8l1.9 1.9M5.3 18.7l1.9-1.9M16.8 7.2l1.9-1.9"/>'),
    pencil:S('<path d="M16.1 3.9a2.2 2.2 0 0 1 3.1 3.1L8.4 17.8l-4.4 1.2 1.2-4.4Z"/><path d="m14.2 5.8 3.1 3.1"/>'),
    clock:S('<circle cx="12" cy="12" r="8.75"/><path d="M12 7v5.25l3.5 2"/>'),
    sent:S('<path d="M20.6 3.4 3.9 10.1c-.6.24-.6 1.1 0 1.35l6.3 2.4 2.4 6.3c.24.6 1.1.6 1.35 0Z"/><path d="m10.2 13.8 5.3-5.3"/>'),
    archive:S('<rect x="2.75" y="4" width="18.5" height="5" rx="1.25"/><path d="M4.5 9v9.25c0 .97.78 1.75 1.75 1.75h11.5c.97 0 1.75-.78 1.75-1.75V9"/><path d="M9.75 13h4.5"/>'),
    junk:S('<rect x="3" y="4.25" width="18" height="4.5" rx="1.25"/><path d="M4.5 8.75v9.5c0 .97.78 1.75 1.75 1.75h11.5c.97 0 1.75-.78 1.75-1.75v-9.5"/><path d="m10 11.75 4 4m0-4-4 4"/>'),
    trash:S('<path d="M3.75 6.5h16.5"/><path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5"/><path d="m5.75 6.5.95 12.4a1.75 1.75 0 0 0 1.75 1.6h7.1a1.75 1.75 0 0 0 1.75-1.6l.95-12.4"/><path d="M10 10.5v6M14 10.5v6"/>'),
    attach:S('<path d="m20.25 11.25-7.9 7.9a5 5 0 0 1-7.07-7.07l8.3-8.3a3.35 3.35 0 0 1 4.74 4.74l-8.2 8.2a1.7 1.7 0 0 1-2.4-2.4l7.45-7.45"/>'),
    doc:S('<path d="M13.75 3H7a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7 21h10a2.25 2.25 0 0 0 2.25-2.25V8.5Z"/><path d="M13.75 3v5.5h5.5"/>'),
    img:S('<rect x="3" y="4.5" width="18" height="15" rx="2.25"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m21 16-5-5-8.5 8.5"/>'),
    reply:S('<path d="M10 5.25 3.75 11 10 16.75v-3.5c4.6-.1 7.9 1.3 10.25 4.5-.6-5.6-3.9-9.6-10.25-10Z"/>'),
    replyAll:S('<path d="M13 6 7.5 11l5.5 5v-3.1c3.9-.1 6.6 1.2 8.75 4.1-.6-5-3.3-8.5-8.75-8.9Z"/><path d="M8.25 6 2.75 11l5.5 5"/>'),
    forward:S('<path d="M14 5.25 20.25 11 14 16.75v-3.5c-4.6-.1-7.9 1.3-10.25 4.5.6-5.6 3.9-9.6 10.25-10Z"/>'),
    unread:S('<path d="M14 5.25H5A2.25 2.25 0 0 0 2.75 7.5v9.5A2.25 2.25 0 0 0 5 19.25h14A2.25 2.25 0 0 0 21.25 17v-6"/><path d="m3.25 7.5 8.75 6 3.1-2.1"/><circle cx="19" cy="5.75" r="2.75" fill="currentColor" stroke="none"/>'),
    mail:S('<rect x="2.75" y="5" width="18.5" height="14" rx="2.25"/><path d="m3.25 7 8.75 6.25L20.75 7"/>',1.5),
    chevL:S('<path d="M15 4.5 7.5 12l7.5 7.5"/>',2.6),
    chevR:S('<path d="m9 5 7 7-7 7"/>',2.4),
    chevU:S('<path d="m5.5 15 6.5-6.5 6.5 6.5"/>',2.2),
    chevD:S('<path d="m5.5 9 6.5 6.5L18.5 9"/>',2.2),
    filter:S('<circle cx="12" cy="12" r="9"/><path d="M7.5 9.25h9M9.25 12.25h5.5M11 15.25h2"/>'),
    filterOn:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.75" fill="currentColor"/><path d="M7.5 9.25h9M9.25 12.25h5.5M11 15.25h2" fill="none" stroke-width="1.9" stroke-linecap="round" style="stroke:var(--on-tint)"/></svg>',
    sendUp:'<svg class="ic-up" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M12 17.25V7.4M7.6 11.6 12 7.2l4.4 4.4" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--on-tint)"/></svg>',
    check:S('<path d="m4.75 12.75 4.5 4.5 10-10.5"/>',2.4),
    star:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="m12 2.9 2.7 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.6l-5.5 3 1.2-6.1-4.5-4.2 6.1-.8Z"/></svg>',
    plusCircle:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.75" fill="currentColor"/><path d="M12 7.5v9M7.5 12h9" fill="none" stroke-width="2" stroke-linecap="round" style="stroke:var(--on-tint)"/></svg>',
    info:S('<circle cx="12" cy="12" r="8.75"/><path d="M12 11v5.25M12 7.75v.01"/>'),
    lock:S('<rect x="4.75" y="10.25" width="14.5" height="10.5" rx="2.25"/><path d="M8 10.25V7.5a4 4 0 0 1 8 0v2.75"/>'),
    cloud:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7.2 18.5a4.2 4.2 0 0 1-.55-8.37A5.6 5.6 0 0 1 17.4 9.3a4.6 4.6 0 0 1-.4 9.2Z"/></svg>',
    at:S('<circle cx="12" cy="12" r="3.75"/><path d="M15.75 12v1.4a2.6 2.6 0 0 0 5.2 0V12a8.95 8.95 0 1 0-3.5 7.1"/>',2.1),
    // Pro / Perso
    briefcase:S('<rect x="3" y="7" width="18" height="12.75" rx="2.25"/><path d="M8.5 7V5.6c0-1 .8-1.85 1.75-1.85h3.5c.97 0 1.75.83 1.75 1.85V7"/><path d="M3 12.5h18"/>'),
    house:S('<path d="M3.5 11 12 4l8.5 7"/><path d="M5.75 9.25v9.25c0 .7.55 1.25 1.25 1.25h3.25v-5.5h3.5v5.5H17c.7 0 1.25-.55 1.25-1.25V9.25"/>'),
    // Catégories du tri
    person:S('<circle cx="12" cy="8.25" r="3.75"/><path d="M4.75 20c.6-3.7 3.6-6 7.25-6s6.65 2.3 7.25 6"/>'),
    bell:S('<path d="M6.25 16.25V11a5.75 5.75 0 0 1 11.5 0v5.25l1.6 1.9H4.65Z"/><path d="M10 20.4a2.1 2.1 0 0 0 4 0"/>'),
    receipt:S('<path d="M6 3.25h12v17.5l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4Z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>'),
    plane:S('<path d="M12 2.75c.85 0 1.5.9 1.5 2v4.6l7.25 4.4v2.05l-7.25-2.2v4.05l2.25 1.75v1.6L12 20.1 8.25 21v-1.6l2.25-1.75V13.6l-7.25 2.2v-2.05l7.25-4.4v-4.6c0-1.1.65-2 1.5-2Z"/>'),
    tag:S('<path d="M3.75 12.6V4.75a1 1 0 0 1 1-1h7.85l7.65 7.65a1.4 1.4 0 0 1 0 2L13.4 20.25a1.4 1.4 0 0 1-2 0Z"/><circle cx="8.25" cy="8.25" r="1.4"/>'),
    moveTo:S('<path d="M3.75 7v11a1.75 1.75 0 0 0 1.75 1.75h13A1.75 1.75 0 0 0 20.25 18V9.5a1.75 1.75 0 0 0-1.75-1.75h-6.75L9.9 5.25H5.5A1.75 1.75 0 0 0 3.75 7Z"/><path d="m11.5 11 2.75 2.75-2.75 2.75M8.25 13.75h5.75"/>'),
    warn:S('<circle cx="12" cy="12" r="8.75"/><path d="M12 7.5v5.5M12 16.25v.01"/>',2)
  };

  // ---------- Fournisseurs ----------
  var PROVIDERS=[
    {id:"gmail",     name:"Gmail",          sub:"Google Workspace · gmail.com",             color:"#d93025", mono:"G",  kind:"oauth"},
    {id:"microsoft", name:"Microsoft 365",  sub:"Outlook · Exchange Online · hotmail.com",  color:"#1566c0", mono:"O",  kind:"oauth"},
    {id:"icloud",    name:"iCloud",         sub:"Apple Mail · me.com · mac.com",            color:"#3b9dff", glyph:"cloud", kind:"oauth"},
    {id:"yahoo",     name:"Yahoo Mail",     sub:"ymail.com · rocketmail.com",               color:"#6a01d2", mono:"Y",  kind:"oauth"},
    {id:"exchange",  name:"Exchange d'entreprise", sub:"Serveur Microsoft Exchange",        color:"#0a7c5a", mono:"E",  kind:"exchange"},
    {id:"imap",      name:"Autre messagerie (IMAP)", sub:"Toute adresse pro ou perso",      color:"#5b6270", glyph:"at", kind:"imap"}
  ];
  function provOf(id){ for(var i=0;i<PROVIDERS.length;i++) if(PROVIDERS[i].id===id) return PROVIDERS[i]; return PROVIDERS[5]; }
  function provTileInner(p){ return p.glyph ? I[p.glyph] : H(p.mono); }
  function providerTile(p){ return '<span class="ptile" style="background:'+p.color+'" aria-hidden="true">'+provTileInner(p)+'</span>'; }

  // ---------- Comptes ----------
  // kind : « pro » ou « perso » — deux univers bien séparés (vues Pro / Perso, badges, compte d'envoi par défaut).
  // Les comptes viennent de la SOURCE (SRC.boites()) ; le côté, le nom affiché et la signature sont les choix de la personne (gardés sur l'appareil).
  var ACCOUNTS=[];
  var AUCUN_COMPTE={id:"",provider:"imap",kind:COTES[0],name:"",email:"",color:"#5b6270",signature:""};
  function acctOf(id){ for(var i=0;i<ACCOUNTS.length;i++) if(ACCOUNTS[i].id===id) return ACCOUNTS[i]; return ACCOUNTS[0]||AUCUN_COMPTE; }
  var KINDS={pro:"Pro",perso:"Perso"};
  function kindOf(a){ return a&&a.kind==="pro"?"pro":"perso"; }
  // Compte enregistré par une version antérieure (sans type) : messagerie grand public → perso, sinon pro.
  function guessKind(email){ return /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|aol|icloud|me|mac|gmx|proton|protonmail|orange|wanadoo|free|sfr|laposte|neuf|bbox)\./i.test(email||"")?"perso":"pro"; }
  function kindBadge(k){ return '<span class="kbadge '+k+'">'+KINDS[k]+'</span>'; }
  function accountsOfKind(k){ return ACCOUNTS.filter(function(a){ return kindOf(a)===k; }); }

  // ---------- Dossiers ----------
  var FOLDERS=[
    {id:"inbox",  name:"Boîte de réception", icon:"inbox",   fav:true},
    {id:"flagged",name:"Marqués",            icon:"flag",    fav:true, smart:true},
    {id:"drafts", name:"Brouillons",         icon:"draft",   fav:true},
    {id:"scheduled",name:"Programmés",       icon:"clock",   fav:true},
    {id:"sent",   name:"Envoyés",            icon:"sent",    fav:true},
    {id:"sign",   name:"Signatures",         icon:"sign",    fav:true, pro:true},
    {id:"archive",name:"Archive",            icon:"archive"},
    {id:"junk",   name:"Indésirables",       icon:"junk"},
    {id:"trash",  name:"Corbeille",          icon:"trash"}
  ];
  function folderOf(id){ for(var i=0;i<FOLDERS.length;i++) if(FOLDERS[i].id===id) return FOLDERS[i]; return FOLDERS[0]; }

  // ---------- Avatars ----------
  // Initiales : première lettre (ou chiffre) des deux premiers mots qui en contiennent — jamais une moitié d'émoji.
  function initials(n){ var w=(n||"").trim().split(/\s+/).map(function(s){ var c=s.match(/[\p{L}\p{N}]/u); return c?c[0]:""; }).filter(Boolean);
    return w.slice(0,2).join("").toUpperCase()||"?"; }

  var MIN=60000,HR=3600000,DAY=86400000;
  var uid=1;
  function mk(o){ o.id="m"+(uid++); o.read=!!o.read; o.flagged=!!o.flagged; o.vip=!!o.vip; o.att=o.att||[]; return o; }

  // ---------- Les messages : ceux de la SOURCE (reçus, jamais écrits ici) + ceux que la personne écrit (user:true, gardés sur l'appareil) ----------
  var MESSAGES=[];

  // ---------- Ce que la source sait faire (SRC.capacites()) ----------
  // Tout est FAUX tant que la source ne dit pas le contraire : ce qu'elle ne sait pas faire, l'interface le dit (« Bientôt : … ») au lieu de faire semblant.
  var CAP={oauth:false,programmeServeur:false,signature:false,marquage:false,deplacement:false,simulation:false,reglagesServeur:false,mx:false,
    dossiers:["inbox"],destinataires:50,pj:{nombre:99,octets:25*1024*1024}};
  function appliquerCapacites(c){
    c=c&&typeof c==="object"?c:{};
    ["oauth","programmeServeur","signature","marquage","deplacement","simulation","reglagesServeur"].forEach(function(k){ CAP[k]=c[k]===true; });
    CAP.mx=typeof SRC.lireMX==="function";
    CAP.dossiers=Array.isArray(c.dossiers)&&c.dossiers.length?c.dossiers.filter(function(d){ return !!folderOfStrict(d); }):["inbox"];
    if(!CAP.dossiers.length) CAP.dossiers=["inbox"];
    CAP.destinataires=c.destinataires>0?Math.floor(c.destinataires):50;
    CAP.pj={nombre:c.pj&&c.pj.nombre>0?c.pj.nombre:99,octets:c.pj&&c.pj.octets>0?c.pj.octets:25*1024*1024};
  }
  function folderOfStrict(id){ for(var i=0;i<FOLDERS.length;i++) if(FOLDERS[i].id===id) return FOLDERS[i]; return null; }

  // ---------- Chargement : trois états, jamais deux ----------
  // LOAD.boites : "wait" (on ne sait pas encore) | "ok" (la liste est LUE — éventuellement vide) | "ko" (on n'a PAS pu savoir).
  // Une liste vide et une liste illisible ne se confondent pas : on ne propose de connecter une boîte que quand on SAIT qu'il n'y en a aucune.
  var LOAD={boites:"wait",err:"",msgs:{},msgErr:{},vu:{},t:0,essai:0};
  var GONE=[];          // identifiants de messages reçus supprimés pour de bon (le serveur les rendra encore)
  var OVER={};          // état gardé SUR L'APPAREIL des messages reçus : {id:{a:compte,read,flagged,folder,co,uj,aj}}
  var SAVED={kinds:{},names:{},sigs:{}};   // choix de la personne sur ses boîtes (côté, nom affiché, signature)
  var SEEN={};          // messages reçus déjà vus par cette séance : seuls les NOUVEAUX préviennent
  var chargement=null;
  var RETIRES={};       // boîtes retirées par la personne, en attente de la confirmation de la source
  function msgErr(e,defaut){ var t=e&&(e.message||e.error); t=typeof t==="string"?t.trim():""; return t||defaut||"erreur inconnue"; }
  function paragraphes(c){
    if(Array.isArray(c)) return c.map(function(p){ return Array.isArray(p)?p:String(p); });
    var t=String(c==null?"":c).replace(/\r\n?/g,"\n").trim(); return t?t.split(/\n{2,}/):[]; }
  function texteDe(body){ return (body||[]).map(function(p){ return Array.isArray(p)?p[1]:p; }).join(" "); }
  // Un message de la source -> la forme interne de l'interface
  function depuisSource(r,acct,dossier){
    var de=r.de||null, m={id:"s:"+acct+":"+r.id,sid:String(r.id),src:true,acct:acct,folder:folderOfStrict(r.dossier)?r.dossier:(dossier||"inbox"),
      from:de?{name:String(de.nom||de.email||""),email:String(de.email||"")}:null,to:String(r.a||""),subject:String(r.objet||""),
      read:!!r.lu,flagged:!!r.drapeau,vip:!!r.vip,unsub:!!r.desinscription,ancien:!!r.ancien,at:+r.date||0,rcpt:Array.isArray(r.destinataires)?r.destinataires.map(String):undefined,
      att:(r.pj||[]).map(function(p){ return {name:String(p.nom||"pièce jointe"),size:String(p.taille||""),kind:p.type==="img"?"img":"doc"}; })};
    if(r.corps!=null){ m.body=paragraphes(r.corps); m.preview=firstLine(r.apercu||texteDe(m.body)); }
    else { m.body=null; m.preview=firstLine(r.apercu||""); }   // corps pas encore lu : SRC.lire(id) à l'ouverture
    m._srv={lu:m.read,dr:m.flagged,dos:m.folder};
    return m; }
  function surOver(m){
    var o=OVER[m.id]; if(!o) return;
    if(!CAP.marquage){ m.read=!!o.read; m.flagged=!!o.flagged; }
    if(!CAP.deplacement&&o.folder&&folderOfStrict(o.folder)) m.folder=o.folder;
    if(isCat(o.co)) m.co=o.co;
    m.uj=!!o.uj; m.aj=!!o.aj; }
  // L'état local des messages reçus se relève AVANT toute lecture neuve (persist() le fait aussi) : un message lu ici le reste.
  function majOver(){ MESSAGES.forEach(function(m){ if(!m.src) return;
    var s={a:m.acct,read:m.read,flagged:m.flagged,folder:m.folder}; if(m.co) s.co=m.co; if(m.uj) s.uj=1; if(m.aj) s.aj=1; OVER[m.id]=s; }); }
  function majBoites(liste){
    var ids={};
    liste.forEach(function(b){
      if(!b||b.id==null||!b.email) return;
      var id=String(b.id); if(RETIRES[id]) return;   // retirée ici, pas encore confirmée par la source (délai d'annulation) : un relevé ne la ressuscite pas
      ids[id]=1;
      var a=null; for(var i=0;i<ACCOUNTS.length;i++) if(ACCOUNTS[i].id===id) a=ACCOUNTS[i];
      var email=String(b.email), dom=email.split("@")[1]||"", det=b.fournisseur?{id:b.fournisseur}:detectParDomaine(dom.toLowerCase());
      if(!a){
        var k=SAVED.kinds[id]; if(k!=="pro"&&k!=="perso") k=b.cote==="pro"||b.cote==="perso"?b.cote:guessKind(email);
        if(COTES.indexOf(k)<0) k=COTES[0];
        var nom=typeof SAVED.names[id]==="string"&&SAVED.names[id].trim()?SAVED.names[id]:String(b.nom||email.split("@")[0]);
        var sig=typeof SAVED.sigs[id]==="string"?SAVED.sigs[id]:nom;
        var pid=det&&det.id?det.id:"imap";
        if(!PROVIDERS.some(function(x){ return x.id===pid; })&&det&&det.name) PROVIDERS.splice(PROVIDERS.length-1,0,{id:det.id,name:det.name,sub:"",color:det.color||"#5b6270",mono:det.mono||"",glyph:det.mono?null:"at",kind:det.kind||"imap"});
        a={id:id,sid:b.id,provider:PROVIDERS.some(function(x){ return x.id===pid; })?pid:"imap",kind:k,name:nom,email:email,color:"#2a4a9c",signature:sig};
        ACCOUNTS.push(a);
      }else{ a.sid=b.id; a.email=email; }
    });
    for(var j=ACCOUNTS.length-1;j>=0;j--) if(!ids[ACCOUNTS[j].id]){ var gone=ACCOUNTS[j].id;
      ACCOUNTS.splice(j,1); for(var q=MESSAGES.length-1;q>=0;q--) if(MESSAGES[q].acct===gone) MESSAGES.splice(q,1); delete LOAD.msgs[gone]; delete LOAD.msgErr[gone]; }
  }
  function chargerBoite(a){
    var dossiers=CAP.dossiers.slice();
    return Promise.all(dossiers.map(function(d){
      return Promise.resolve().then(function(){ return SRC.messages({boite:a.sid,dossier:d}); }).then(function(l){
        if(!Array.isArray(l)) throw new Error("réponse illisible"); return {d:d,l:l}; }); }))
    .then(function(res){
      majOver();
      var neufs=[], vus={}, premier=!LOAD.vu[a.id];
      res.forEach(function(r){ r.l.forEach(function(x){ if(!x||x.id==null) return; var m=depuisSource(x,a.id,r.d); if(vus[m.id]||GONE.indexOf(m.id)>=0) return; vus[m.id]=1; surOver(m);
        if(!premier&&!SEEN[m.id]) m.neuf=true; SEEN[m.id]=1; neufs.push(m); }); });
      LOAD.vu[a.id]=true;
      // ce que cette boîte rendait avant (dans les dossiers lus cette fois) est remplacé ; le reste (écrit ici, autres dossiers) ne bouge pas
      for(var i=MESSAGES.length-1;i>=0;i--){ var e=MESSAGES[i]; if(e.src&&e.acct===a.id) MESSAGES.splice(i,1); }
      neufs.forEach(function(m){ MESSAGES.push(m); });
      Object.keys(OVER).forEach(function(id){ if(OVER[id].a===a.id&&!vus[id]) delete OVER[id]; });
      LOAD.msgs[a.id]="ok"; delete LOAD.msgErr[a.id];
    },function(e){ LOAD.msgs[a.id]="ko"; LOAD.msgErr[a.id]=msgErr(e,"réception indisponible"); });
  }
  function empreinte(){ return ACCOUNTS.map(function(a){ return a.id+(LOAD.msgs[a.id]||""); }).join(",")+"|"+MESSAGES.map(function(m){ return m.src?m.id+(m.read?1:0)+m.folder:""; }).join("")+"|"+LOAD.boites; }
  // Lire la source : capacités, boîtes, puis les messages de chaque boîte. Un échec se DIT (LOAD) ; il n'efface jamais ce qu'on avait déjà lu.
  function charger(silencieux){
    if(chargement) return chargement;
    LOAD.essai=Date.now();   // le relevé automatique se règle sur la dernière TENTATIVE : un serveur en panne n'est pas martelé toutes les 5 s
    var avant=empreinte();
    chargement=Promise.resolve().then(function(){ return typeof SRC.capacites==="function"?SRC.capacites():null; })
      .then(function(c){ appliquerCapacites(c); },function(){ appliquerCapacites(null); })
      .then(function(){ return SRC.boites(); })
      .then(function(liste){
        if(!Array.isArray(liste)) throw new Error("réponse illisible");
        LOAD.boites="ok"; LOAD.err=""; majBoites(liste);
        return Promise.all(ACCOUNTS.map(chargerBoite)); },
        function(e){ LOAD.boites="ko"; LOAD.err=msgErr(e,"Impossible de lire vos boîtes mail."); return null; })
      .then(function(){ chargement=null; LOAD.t=Date.now(); finCharge(avant,silencieux); },
            function(){ chargement=null; finCharge(avant,silencieux); });
    return chargement; }
  function finCharge(avant,silencieux){
    if(!vivant) return;
    if(LOAD.boites==="ok"){
      // des brouillons / envois d'une boîte qui n'existe plus n'ont plus de maître
      for(var i=MESSAGES.length-1;i>=0;i--) if(MESSAGES[i].user&&!acctExists(MESSAGES[i].acct)) MESSAGES.splice(i,1);
      Object.keys(SAVED.kinds).concat(Object.keys(SAVED.names),Object.keys(SAVED.sigs)).forEach(function(id){ if(!acctExists(id)){ delete SAVED.kinds[id]; delete SAVED.names[id]; delete SAVED.sigs[id]; } });
      if(!validScope(state.scope)) state.scope=COTES[0]; }
    refreshCls();
    // les NOUVEAUX seulement (jamais le premier chargement d'une boîte), et pas ce que le tri a rangé en indésirable
    var neufs=MESSAGES.filter(function(m){ var n=m.neuf; delete m.neuf; return n&&!m.ancien&&m.folder==="inbox"&&!m.read; });
    if(!silencieux||avant!==empreinte()||LOAD.boites==="ko"){ renderAll(); persist(); }
    if(neufs.length&&SETTINGS.notif) notifierArrivee(neufs);
    compter(); }
  var dernierCompte=-1;
  function compter(){ var n=MESSAGES.filter(function(m){ return m.folder==="inbox"&&!m.read&&acctExists(m.acct); }).length;
    if(n!==dernierCompte){ dernierCompte=n; try{ if(typeof opt.onCompter==="function") opt.onCompter(n); }catch(e){} }
    if(opt.titreDocument) document.title=(n?"("+n+") ":"")+TITRE_ORIG; }

  // L'état « côté serveur » d'un message reçu : lu / drapeau / dossier. persist() compare à ce que la source sait et ne lui envoie que la DIFFÉRENCE
  // (un tri automatique vers Indésirables n'est pas un geste de la personne : il ne part pas).
  function dossierServeur(m){ return m.aj&&m.folder==="junk"?(m._srv&&m._srv.dos==="junk"?"junk":"inbox"):m.folder; }
  function syncSource(){
    MESSAGES.forEach(function(m){
      if(!m.src||!m._srv) return;
      if(CAP.marquage&&typeof SRC.marquer==="function"&&(m.read!==m._srv.lu||m.flagged!==m._srv.dr)){
        var av={lu:m._srv.lu,dr:m._srv.dr}; m._srv.lu=m.read; m._srv.dr=m.flagged;
        Promise.resolve().then(function(){ return SRC.marquer(m.sid,{lu:m.read,drapeau:m.flagged}); }).catch(function(e){
          m._srv.lu=av.lu; m._srv.dr=av.dr; m.read=av.lu; m.flagged=av.dr; renderAll(); toast("Non enregistré sur le serveur : "+msgErr(e,"échec")); }); }
      var df=dossierServeur(m);
      if(CAP.deplacement&&typeof SRC.deplacer==="function"&&df!==m._srv.dos){
        var dv=m._srv.dos; m._srv.dos=df;
        Promise.resolve().then(function(){ return SRC.deplacer(m.sid,df); }).catch(function(e){
          m._srv.dos=dv; m.folder=dv; m.uj=false; renderAll(); toast("Déplacement non enregistré sur le serveur : "+msgErr(e,"échec")); }); }
    }); }

  // ---------- État ----------
  // scope : "all" | "pro" | "perso" | id d'un compte. cat : catégorie affichée dans la boîte de réception.
  var state={scope:COTES[0],folder:"inbox",selected:null,query:"",filter:"all",compose:null,cat:"principal",whyOpen:null};

  // ---------- Tri automatique : règles apprises, contacts, catégories ----------
  // RULES suit le format du moteur : senders / domains → catégorie, "junk" ou "notjunk". Apprises de l'utilisateur, persistées.
  var RULES={senders:{},domains:{}};
  var CLS={};   // résultat du moteur par message reçu (calculé, jamais persisté)
  var CAT_ICON={principal:"person",notif:"bell",recus:"receipt",voyages:"plane",promos:"tag",tout:"tray2"};
  var CAT_LIST=OPClassify.CATS.map(function(c){ return {id:c.id,name:c.name}; }).concat([{id:"tout",name:"Tout"}]);
  function catName(id){ return id==="tout"?"Tout":(OPClassify.CAT_NAME[id]||"Principal"); }
  function isCat(id){ return !!OPClassify.CAT_NAME[id]; }
  function emailOf(m){ return m&&m.from?String(m.from.email||"").toLowerCase():""; }
  function emailsIn(s){ return (String(s||"").match(/[^\s<>,;:"']+@[^\s<>,;:"']+/g)||[]).map(function(e){ return e.toLowerCase(); }); }
  // Contacts : adresses auxquelles l'utilisateur a écrit, apprises au moment où l'envoi part et persistées.
  // Supprimer ou archiver le message envoyé ne retire rien ; répondre à un message rangé dans Indésirables
  // ne rend pas son expéditeur « de confiance » (noTrust) : seul « Ce n'est pas un indésirable » le fait.
  var CONTACTS={};
  function learnContacts(m){ if(!m||m.from) return;
    var no=(m.noTrust||[]).map(function(e){ return String(e).toLowerCase(); });
    emailsIn(m.to).concat((m.rcpt||[]).map(function(e){ return String(e).toLowerCase(); })).forEach(function(e){ if(no.indexOf(e)<0) CONTACTS[e]=true; }); }
  // Contexte du moteur : contacts appris + expéditeurs VIP ; règles = apprises.
  function classifyCtx(){ var c={};
    Object.keys(CONTACTS).forEach(function(e){ c[e]=true; });
    MESSAGES.forEach(function(m){ if(m.vip&&m.from) c[emailOf(m)]=true; });
    return {contacts:c,rules:RULES}; }
  // Classe chaque message reçu ; un indésirable arrivé dans la réception part dans Indésirables (sauf si l'utilisateur l'a déjà déplacé),
  // et un message que le moteur y avait mis revient dès qu'il n'en est plus un (contact connu, règle « pas indésirable »).
  function refreshCls(){
    var ctx=classifyCtx(), moved=0;
    MESSAGES.forEach(function(m){
      if(!m.from){ delete CLS[m.id]; return; }
      var r=OPClassify.classify(m,ctx); CLS[m.id]=r;
      if(m.folder==="inbox"&&r.junk&&!m.uj){ m.folder="junk"; m.aj=true; moved++; }
      else if(m.folder==="junk"&&m.aj&&!r.junk){ m.folder="inbox"; m.aj=false; moved++; }
    });
    return moved; }
  function engineCat(m){ var c=CLS[m.id]; return c&&isCat(c.cat)?c.cat:"principal"; }
  // Catégorie affichée : déplacement ponctuel de l'utilisateur (co), sinon le moteur (règles comprises).
  function effCat(m){ return m.co&&isCat(m.co)?m.co:engineCat(m); }
  function whyOf(m){
    if(m.co&&isCat(m.co)) return ["vous avez déplacé ce message ici (le tri automatique l’avait mis dans "+catName(engineCat(m))+")"];
    var c=CLS[m.id]; if(!c) return ["message reçu"];
    if(c.junk) return ["vous l’avez sorti des indésirables : il reste dans la boîte de réception"];
    return c.reasons.length?c.reasons.map(function(x){ return prettyReason(m,x); }):["tri automatique"]; }
  function junkWhy(m){ var c=CLS[m.id];
    if(c&&c.junk&&c.reasons.length) return c.reasons.map(function(x){ return prettyReason(m,x); });
    return [m.uj?"vous l’avez déplacé dans Indésirables":"déplacé dans Indésirables"]; }
  // Le moteur cite ses mots-clés en texte normalisé (sans accents, parfois coupé : « commande n° m »).
  // L'interface les montre tels qu'ils sont écrits dans le message, en mots entiers, dans une phrase.
  function nrm(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); }
  function spanOf(m,frag){
    var raw=(m.subject||"")+" "+(m.preview||"")+" "+(m.body||[]).map(function(b){ return Array.isArray(b)?b[1]:b; }).join(" ");
    var t="", map=[], i, k;
    for(i=0;i<raw.length;i++){ var n=nrm(raw[i]); for(k=0;k<n.length;k++){ t+=n[k]; map.push(i); } }
    var at=t.indexOf(frag); if(at<0||!frag) return null;
    var s=map[at], e=map[at+frag.length-1]+1, W=/[\p{L}\p{N}]/u;
    while(s>0&&W.test(raw[s-1])) s--;
    while(e<raw.length&&W.test(raw[e])) e++;
    var tail=raw.slice(e).match(/^\s?[°º]\s?[\p{L}\p{N}][\p{L}\p{N}-]*/u); if(tail) e+=tail[0].length;
    var out=raw.slice(s,e).replace(/\s+/g," ").trim();
    if(/^\p{Lu}\p{Ll}/u.test(out)) out=out.charAt(0).toLowerCase()+out.slice(1);
    return out||null; }
  function prettyReason(m,x){
    var only=/^« [^»]+ »$/.test(x);
    var y=String(x).replace(/« ([^»]+) »/g,function(all,f){ var o=spanOf(m,f); return o?"« "+o+" »":all; });
    return only?"contient "+y:y; }

  // ---------- Persistance (confort local, par appareil) ----------
  // Rien de ce que la SOURCE rend n'est copié ici : on garde seulement ce qui appartient à la personne — lu / drapeau / dossier de ses messages
  // reçus quand la source ne le garde pas, le tri appris (règles, contacts, rangements), le côté / le nom / la signature de ses boîtes, ses réglages,
  // et ce qu'elle a ÉCRIT (brouillons, envoyés : user:true). ⚠️ Une clé par entreprise et par appareil (options.cleStockage) : l'application hôte la
  // vide en quittant l'entreprise — des mails écrits ne doivent pas rester sur un appareil rendu.
  var restoredLost=0;
  var SETTINGS={notif:true,threads:true};
  function nettoye(m){ var o={}; Object.keys(m).forEach(function(k){ if(k.charAt(0)!=="_"&&k!=="sending"&&k!=="neuf"&&k!=="lisant") o[k]=m[k]; }); return o; }
  function persist(){ try{
    majOver();
    ACCOUNTS.forEach(function(a){ SAVED.kinds[a.id]=kindOf(a); SAVED.names[a.id]=a.name; SAVED.sigs[a.id]=a.signature||""; });
    var snap={v:4,scope:state.scope,folder:state.folder,cat:state.cat,rules:RULES,contacts:Object.keys(CONTACTS),settings:SETTINGS,
      kinds:SAVED.kinds,names:SAVED.names,sigs:SAVED.sigs,msgs:OVER,gone:GONE.slice(-2000),user:[]};
    MESSAGES.forEach(function(m){ if(m.user) snap.user.push(nettoye(m)); });
    localStorage.setItem(LS,JSON.stringify(snap));
  }catch(e){}
    syncSource(); }
  function restore(){ try{
    var raw=localStorage.getItem(LS); if(!raw) return;
    var snap=JSON.parse(raw); if(!snap||snap.v!==4) return;
    ["kinds","names","sigs"].forEach(function(k){ if(snap[k]&&typeof snap[k]==="object") SAVED[k]=snap[k]; });
    if(snap.settings&&typeof snap.settings==="object"){ SETTINGS.notif=snap.settings.notif!==false; SETTINGS.threads=snap.settings.threads!==false; }
    if(snap.rules&&typeof snap.rules==="object"){ ["senders","domains"].forEach(function(k){ var o=snap.rules[k]; if(o&&typeof o==="object") Object.keys(o).forEach(function(x){ var v=o[x]; if(v==="junk"||v==="notjunk"||isCat(v)) RULES[k][x]=v; }); }); }
    if(snap.msgs&&typeof snap.msgs==="object") OVER=snap.msgs;
    if(Array.isArray(snap.gone)) GONE=snap.gone.filter(function(x){ return typeof x==="string"; });
    if(Array.isArray(snap.user)) snap.user.forEach(function(u){ if(!u||typeof u.id!=="string"||typeof u.acct!=="string") return;
      u.att=u.att||[]; MESSAGES.push(u);
      var n=parseInt(String(u.id).slice(1),10); if(n>=uid) uid=n+1;
      // Encore dans la boîte d'envoi : la page a été quittée pendant l'envoi — on ne SAIT pas s'il est parti. Il revient dans les brouillons, pas dans « Envoyés ».
      if(u.folder==="outbox"){ u.folder="drafts"; u.at=u.at||Date.now(); restoredLost++; }
      delete u.notice; });
    if(Array.isArray(snap.contacts)) snap.contacts.forEach(function(e){ if(typeof e==="string"&&e.indexOf("@")>0) CONTACTS[e.toLowerCase()]=true; });
    if(typeof snap.scope==="string"&&snap.scope) state.scope=snap.scope;
    if(state.scope==="all"||((state.scope==="pro"||state.scope==="perso")&&COTES.indexOf(state.scope)<0)) state.scope=COTES[0];
    if(snap.folder){ for(var i=0;i<FOLDERS.length;i++) if(FOLDERS[i].id===snap.folder) state.folder=snap.folder; }
    if(snap.cat&&(snap.cat==="tout"||isCat(snap.cat))) state.cat=snap.cat;
  }catch(e){} }
  function acctExists(id){ for(var i=0;i<ACCOUNTS.length;i++) if(ACCOUNTS[i].id===id) return true; return false; }
  function validScope(s){ if(s==="pro"||s==="perso") return COTES.indexOf(s)>=0; return acctExists(s); }

  // ---------- Dates ----------
  function tsOf(m){ return m.at!=null ? m.at : 0; }
  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  function hhmm(d){ return d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}); }
  function dayDiff(d){ var t0=new Date(); t0.setHours(0,0,0,0); var d0=new Date(d); d0.setHours(0,0,0,0); return Math.round((d0-t0)/DAY); }
  function fmtSched(t){ var d=new Date(t), n=dayDiff(d), day;
    if(n===0) day="aujourd'hui"; else if(n===1) day="demain"; else if(n>1&&n<7) day=d.toLocaleDateString("fr-FR",{weekday:"long"});
    else day="le "+d.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"}).replace(/\./g,"");
    return day+" à "+hhmm(d); }
  function fmtSchedShort(t){ var d=new Date(t), n=dayDiff(d), day;
    if(n===0) day="Auj."; else if(n===1) day="Demain"; else if(n>1&&n<7) day=cap(d.toLocaleDateString("fr-FR",{weekday:"short"}).replace(".",""));
    else day=d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
    return day+" "+hhmm(d); }
  function fmtDate(ts){
    var d=new Date(ts),now=new Date(),diff=now-d;
    var same=d.toDateString()===now.toDateString();
    var y=new Date(now-DAY).toDateString()===d.toDateString();
    var hm=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    if(same) return hm; if(y) return "Hier";
    if(diff<7*DAY) return cap(d.toLocaleDateString("fr-FR",{weekday:"long"}));
    return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit"});
  }
  function fmtFull(ts){ var d=new Date(ts); return d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})+" à "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}); }

  // ---------- Requêtes ----------
  function senderName(m){ return m.from? m.from.name : acctOf(m.acct).name; }
  function senderEmail(m){ return m.from? m.from.email : acctOf(m.acct).email; }
  // Vue : toutes les boîtes, tout l'univers pro, tout l'univers perso, ou un seul compte.
  function inScopeOf(m,sc){ if(sc==="all") return true; if(sc==="pro"||sc==="perso") return kindOf(acctOf(m.acct))===sc; return m.acct===sc; }
  function inScope(m){ return inScopeOf(m,state.scope); }
  function inFolder(m,fid){ if(fid==="flagged") return m.flagged&&m.folder!=="trash"&&m.folder!=="outbox"; return m.folder===fid; }
  // Brouillon ou message programmé encore modifiable (pas déjà parti entre-temps)
  function liveDraft(id){ var x=msgById(id); return x&&(x.folder==="drafts"||x.folder==="scheduled")?x:null; }
  function folderMessages(fid){ var arr=MESSAGES.filter(function(m){return inScope(m)&&inFolder(m,fid);});
    if(fid==="scheduled") arr.sort(function(a,b){return a.sendAt-b.sendAt;}); else arr.sort(function(a,b){return tsOf(b)-tsOf(a);});
    return arr; }
  function unreadCount(fid){ return MESSAGES.filter(function(m){return inScope(m)&&inFolder(m,fid)&&!m.read;}).length; }
  function totalCount(fid){ return MESSAGES.filter(function(m){return inScope(m)&&inFolder(m,fid);}).length; }
  function matchesQuery(m){ if(!state.query) return true; var q=state.query.toLowerCase();
    var body=(m.body||[]).map(function(b){return Array.isArray(b)?b[1]:b;}).join(" ");
    return (senderName(m)+" "+senderEmail(m)+" "+(m.to||"")+" "+m.subject+" "+m.preview+" "+body).toLowerCase().indexOf(q)>=0; }
  function matchesFilter(m){ if(state.filter==="unread") return !m.read; if(state.filter==="flagged") return m.flagged; return true; }
  // Catégories : seulement dans la boîte de réception, et pas pendant une recherche (elle couvre toutes les catégories).
  function catActive(){ return state.folder==="inbox"&&!state.query; }
  function catScoped(){ var a=folderMessages(state.folder); if(catActive()&&state.cat!=="tout") a=a.filter(function(m){ return effCat(m)===state.cat; }); return a; }
  function listMessages(){ return catScoped().filter(matchesQuery).filter(matchesFilter); }
  // Même nom que la ligne de la barre latérale (« Pro », « Perso »)
  function scopeLabel(){ var s=state.scope; return s==="all"?"Toutes les boîtes":s==="pro"?(UN_COTE?"Boîtes mail":"Pro"):s==="perso"?"Perso":acctOf(s).email; }
  function coteCourant(){ var c=state.scope==="perso"||(acctExists(state.scope)&&kindOf(acctOf(state.scope))==="perso")?"perso":"pro"; return COTES.indexOf(c)>=0?c:COTES[0]; }
  function boitesEnEchec(){ return ACCOUNTS.filter(function(a){ return LOAD.msgs[a.id]==="ko"&&(state.scope==="all"||inScopeOf({acct:a.id},state.scope)); }); }
  function catLabel(){ return catActive()&&state.cat!=="tout"?catName(state.cat):""; }
  // Le message affiché fait toujours partie de la liste : s'il n'est plus dans la catégorie choisie
  // (recherche effacée, « Déplacer vers… », règle apprise), la barre passe à sa catégorie.
  var catMoved=false;
  function syncCat(){ var m=msgById(state.selected);
    if(m&&catActive()&&state.cat!=="tout"&&m.folder==="inbox"&&inScope(m)&&effCat(m)!==state.cat){ state.cat=effCat(m); catMoved=true; persist(); } }
  // Point de couleur du compte : seulement quand la vue réunit plusieurs comptes ; teinte de son univers (Pro / Perso).
  function viewAccounts(){ var s=state.scope; return s==="all"?ACCOUNTS.length:(s==="pro"||s==="perso")?accountsOfKind(s).length:1; }
  var ACC_HUES={pro:["var(--acc-pro-0)","var(--acc-pro-1)","var(--acc-pro-2)"],perso:["var(--acc-perso-0)","var(--acc-perso-1)","var(--acc-perso-2)"]};
  function acctHue(a){ var k=kindOf(a); return ACC_HUES[k][accountsOfKind(k).indexOf(a)%3]; }
  // Compte proposé dans « De » : celui de la vue, ou le premier compte de l'univers choisi.
  function defaultFrom(){ var s=state.scope;
    if(s==="pro"||s==="perso"){ var l=accountsOfKind(s); if(l.length) return l[0].id; }
    else if(s!=="all"&&acctExists(s)) return s;
    return ACCOUNTS[0].id; }
  function plural(n,one,many){ return n+" "+(n>1?many:one); }
  var FILTER_NAMES={all:"Tous",unread:"Non lus",flagged:"Marqués"};

  // ---------- Mise en page : Mac / iPad / iPhone (selon la largeur du conteneur : voir appliquerFormat) ----------
  var curLayout=null;
  // Recherche et « Nouveau message » sont des éléments uniques déplacés là où chaque plateforme les place.
  function placeChrome(){
    var L=layout(); if(L===curLayout) return; curLayout=L;
    var put=function(el,slot){ if(el&&slot&&el.parentNode!==slot) slot.appendChild(el); };
    put($("#searchRow"), L==="mac"?$("#slotSearchTb"):$("#slotSearchList"));
    put($("#btnCompose"),L==="mac"?$("#slotComposeList"):L==="pad"?$("#slotComposeRead"):$("#slotComposeFixed"));
    put($("#spaceBar"),  L==="phone"?$("#slotSpaceList"):$("#slotSpaceSide")); $("#spaceBar").hidden=UN_COTE;
    put($("#catBar"),    L==="mac"?$("#slotCatMac"):$("#slotCatList"));
    closeDrawer();
    if(L!=="phone") app.setAttribute("data-view","list");
    else app.setAttribute("data-view",state.selected?"reading":"list");
    $("#btnNav").setAttribute("title",L==="pad"?"Afficher les boîtes aux lettres":"Boîtes aux lettres");
    placeSheetChrome(); paintStatus(); catReveal(); catFade();
  }
  // Pile de navigation iPhone : mailboxes → list → reading
  function go(view){
    if(!isPhone()) return;
    var prev=app.getAttribute("data-view"); if(prev===view) return;
    app.setAttribute("data-view",view);
    if(pendingUndo&&$("#tUndo")){ if(toastKind==="undo") $("#toast").classList.toggle("quiet",view!=="reading"); else { $("#tUndo").hidden=view!=="reading"; $("#toast").classList.toggle("two",view==="reading"&&!!$("#tAct")); } }
    var target=view==="mailboxes"?$("#sidebar"):view==="list"?$("#list"):$("#reading");
    try{ target.focus({preventScroll:true}); }catch(e){}
    if(view==="list"&&prev==="reading"){ var row=$(".msg.sel"); if(row){ row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash"); } }
  }

  // ---------- Rendu : barre latérale / Boîtes aux lettres ----------
  function scopeUnread(sc){ return MESSAGES.filter(function(m){ return inScopeOf(m,sc)&&m.folder==="inbox"&&!m.read; }).length; }
  function renderSidebar(){
    app.setAttribute("data-scope",state.scope);
    var pro=accountsOfKind("pro"), perso=accountsOfKind("perso");
    var emails=function(l){ return l.map(function(a){ return a.email; }).join(", "); };
    function row(r){ var cur=state.scope===r.id, u=scopeUnread(r.id);
      return '<button type="button" class="srow scope-row" data-scope="'+r.id+'" aria-current="'+cur+'" title="'+H(r.title||r.sub)+'">'+r.tile+
        '<span class="sl"><span class="sn-row"><span class="sn">'+H(r.name)+'</span>'+(r.badge||'')+'</span><span class="ss">'+H(r.sub)+'</span></span>'+
        '<span class="chk" aria-hidden="true">'+I.check+'</span>'+
        (u?'<span class="cnt">'+u+'<span class="sr"> '+nonLus(u)+'</span></span>':'')+
        '<span class="chev" aria-hidden="true">'+I.chevR+'</span></button>'; }
    function group(id,label,rows){ return rows.length?'<section class="sgroup" aria-labelledby="'+id+'"><h2 class="shead" id="'+id+'">'+label+'</h2><div class="glist">'+rows.map(row).join("")+'</div></section>':''; }
    var acctRow=function(a){ var k=kindOf(a); return {id:a.id,name:a.name,sub:a.email,badge:kindBadge(k),tile:providerTile(provOf(a.provider))}; };
    // Pas de mélange : la barre ne montre que le côté choisi (Pro OU Perso) — ses comptes, ses compteurs.
    var cote=coteCourant();
    if(cote==="perso"&&state.folder==="sign") state.folder="inbox";   // la signature de contrats est réservée au côté Pro
    var mine=cote==="pro"?pro:perso, K=cote==="pro"?"pro":"perso";
    var h=group("hAcc",UN_COTE?"Boîtes mail":cote==="pro"?"Comptes pro":"Comptes perso",
      (mine.length>1?[{id:K,name:cote==="pro"?"Toutes les boîtes pro":"Toutes les boîtes perso",sub:plural(mine.length,"compte","comptes"),title:emails(mine),
        tile:'<span class="ptile k-'+K+'" aria-hidden="true">'+(cote==="pro"?I.briefcase:I.house)+'</span>'}]:[]).concat(mine.map(acctRow)));
    if(!mine.length){ var vide=UN_COTE?"Boîtes mail":cote==="pro"?"Comptes pro":"Comptes perso";
      h+='<section class="sgroup"><h2 class="shead">'+vide+'</h2><div class="glist">'+
        (LOAD.boites==="wait"&&!ACCOUNTS.length?'<div class="srow add" role="status"><span class="sl"><span class="sn">Chargement…</span></span></div>':
         LOAD.boites==="ko"&&!ACCOUNTS.length?'<button type="button" class="srow add" data-retry="1"><span class="sic" aria-hidden="true">'+I.warn+'</span><span class="sl"><span class="sn">Boîtes illisibles — réessayer</span></span></button>':
         '<button type="button" class="srow add" data-addaccount="1"><span class="sic" aria-hidden="true">'+I.plusCircle+'</span><span class="sl"><span class="sn">Ajouter une boîte mail</span></span></button>')+'</div></section>'; }
    function sect(id,label,list){ var s='<section class="sgroup" aria-labelledby="'+id+'"><h2 class="shead" id="'+id+'">'+label+'</h2><div class="glist">';
      list.forEach(function(f){ var badge="", n;
        if(f.id==="drafts"||f.id==="flagged"||f.id==="scheduled"){ n=totalCount(f.id); if(n) badge='<span class="cnt">'+n+'</span>'; }
        else{ n=unreadCount(f.id); if(n) badge='<span class="cnt">'+n+'<span class="sr"> '+nonLus(n)+'</span></span>'; }
        var on=state.folder===f.id;
        s+='<button type="button" class="srow folder'+(on?" active":"")+'" data-folder="'+f.id+'" aria-current="'+on+'">'+
          '<span class="sic tile f-'+f.id+'" aria-hidden="true">'+I[f.icon]+'</span><span class="sl"><span class="sn">'+H(f.name)+'</span></span>'+badge+
          '<span class="chev" aria-hidden="true">'+I.chevR+'</span></button>';
      }); return s+'</div></section>'; }
    h+=sect("hFav","Favoris",FOLDERS.filter(function(f){return f.fav&&(!f.pro||cote==="pro");}));
    h+=sect("hOther","Autres dossiers",FOLDERS.filter(function(f){return !f.fav;}));
    h+='<div class="side-foot"><div class="glist"><button type="button" class="srow add" data-addaccount="1"><span class="sic" aria-hidden="true">'+I.plusCircle+'</span><span class="sl"><span class="sn">Ajouter un compte</span></span></button>'+
      '<button type="button" class="srow add" data-settings="1"><span class="sic" aria-hidden="true">'+I.gear+'</span><span class="sl"><span class="sn">Réglages</span></span></button></div></div>';
    $("#sideBody").innerHTML=h;
    paintStatus();
  }
  function sideStatusHtml(){ var u=scopeUnread(state.scope);
    return '<span class="st1">'+(u?plural(u,"message non lu","messages non lus"):"Aucun message non lu")+'</span><span class="st2">'+H(LOAD.t?"Relevé à "+hhmm(new Date(LOAD.t)):LOAD.boites==="ko"?"Hors connexion":"")+'</span>'; }
  // Pendant la fenêtre d'annulation d'envoi (iPhone), la zone d'état de la barre du bas affiche « Envoi… Annuler l'envoi ».
  var pendingUndo=null;
  function paintStatus(){
    var undo=!!pendingUndo&&isPhone();
    [["#listStatus",statusHtml],["#sideStatus",sideStatusHtml]].forEach(function(p){ var el=$(p[0]); el.classList.toggle("undoing",undo);
      el.innerHTML=undo?'<span class="st1">Envoi…</span><button type="button" class="st-undo" data-undo="1">Annuler l’envoi</button>':p[1](); });
  }

  // ---------- Rendu : liste ----------
  // Ce qu'on dit quand la liste est vide : jamais « Aucun message » quand la vérité est « on n'a pas pu savoir ».
  function etatVide(f,cl,ko){
    var pied=function(btn){ return btn?'<button type="button" class="btn'+btn[0]+'" '+btn[1]+' style="margin-top:12px">'+btn[2]+'</button>':''; };
    if(!ACCOUNTS.length){
      if(LOAD.boites==="wait") return '<div class="empty" role="status">'+I.mail+'<b>Chargement de vos boîtes…</b></div>';
      if(LOAD.boites==="ko") return '<div class="empty" role="alert">'+I.warn+'<b>Boîtes mail illisibles</b><span>'+H(LOAD.err||"On n’a pas pu savoir si une boîte est connectée.")+'</span>'+pied([""," data-retry=\"1\"","Réessayer"])+'</div>';
      return '<div class="empty">'+I.mail+'<b>Aucune boîte mail connectée</b><span>Connectez votre messagerie pour lire et envoyer vos mails ici.</span>'+pied([" primary"," data-addaccount=\"1\"","Ajouter une boîte mail"])+'</div>'; }
    if(ko&&ko.length&&!state.query) return '<div class="empty" role="alert">'+I.warn+'<b>Réception indisponible</b><span>'+H(ko.map(function(a){ return a.email+" : "+(LOAD.msgErr[a.id]||"échec"); }).join(" · "))+'</span>'+pied([""," data-retry=\"1\"","Réessayer"])+'</div>';
    var txt=state.query?'Aucun résultat':(state.filter!=="all"?"Aucun message dans ce filtre":cl?"Aucun message dans "+cl:"Aucun message");
    var sub=state.query?'pour « '+H(state.query)+' »':H(f.name+" · "+scopeLabel());
    return '<div class="empty" role="presentation">'+I.mail+'<b>'+txt+'</b><span>'+sub+'</span>'+(f.id==="sign"&&!state.query?'<button type="button" class="btn primary" data-signnew="1" style="margin-top:12px">Envoyer un document à signer</button>':'')+'</div>'; }
  function statusHtml(){
    var cl=catLabel(), st2=H((cl?cl+" · ":"")+scopeLabel());
    if(state.filter!=="all") return '<span class="st1">Filtré par : <b>'+FILTER_NAMES[state.filter]+'</b></span><span class="st2">'+st2+'</span>';
    var all=catScoped(), u=all.filter(function(m){return !m.read;}).length, l1;
    if(state.folder==="scheduled") l1=all.length?plural(all.length,"envoi programmé","envois programmés"):"Aucun envoi programmé";
    else if(state.folder==="drafts") l1=all.length?plural(all.length,"brouillon","brouillons"):"Aucun brouillon";
    else if(u) l1=plural(u,"non lu","non lus");
    else l1=all.length?plural(all.length,"message","messages"):"Aucun message";
    return '<span class="st1">'+H(l1)+'</span><span class="st2">'+st2+'</span>';
  }
  // Barre des catégories : symbole + non lus ; la catégorie choisie montre aussi son nom.
  function renderCats(){
    var bar=$("#catBar"), show=catActive(); bar.hidden=!show; if(!show){ bar.innerHTML=""; return; }
    var inbox=folderMessages("inbox");
    bar.innerHTML=CAT_LIST.map(function(c){
      var u=inbox.filter(function(m){ return !m.read&&(c.id==="tout"||effCat(m)===c.id); }).length, on=state.cat===c.id;
      return '<button type="button" class="cat" data-cat="'+c.id+'" aria-pressed="'+on+'" title="'+H(c.id==="tout"?"Tout : toutes les catégories":c.name)+'">'+I[CAT_ICON[c.id]]+
        '<span class="cl'+(on?'':' sr')+'">'+H(c.name)+'</span>'+(u?'<span class="cc">'+u+'<span class="sr"> '+nonLus(u)+'</span></span>':'')+'</button>';
    }).join("");
    catFade();
    if(catMoved){ catMoved=false; catReveal(); }
  }
  function nonLus(n){ return n>1?"non lus":"non lu"; }
  function catFade(){ var b=$("#catBar"); if(!b||b.hidden) return; var max=b.scrollWidth-b.clientWidth;
    b.classList.toggle("fade-l",max>2&&b.scrollLeft>2); b.classList.toggle("fade-r",max>2&&b.scrollLeft<max-2); }
  // Catégorie retrouvée au chargement (ou après un changement de mise en page) : sa pastille est ramenée dans la rangée.
  function catReveal(){ var b=$("#catBar"), sel=b&&!b.hidden&&b.querySelector('[aria-pressed="true"]'); if(!sel||b.scrollWidth<=b.clientWidth) return;
    var br=b.getBoundingClientRect(), sr=sel.getBoundingClientRect();
    if(sr.left<br.left+8||sr.right>br.right-8) b.scrollLeft+=(sr.left+sr.width/2)-(br.left+br.width/2);
    catFade(); }
  // ---------- Conversations : même compte, même objet (sans Re: / Tr:), reçus, envoyés ou archivés ----------
  function threadKey(m){ var s=String(m.subject||"").toLowerCase(), p;
    do{ p=s; s=s.replace(/^\s*(re|tr|fwd?|fw|réf|ref|aw|wg)\s*(\[\d+\])?\s*:\s*/i,""); }while(s!==p);
    s=s.replace(/\s+/g," ").trim(); return s?m.acct+"|"+s:null; }
  function inThreadFolder(m){ return m.folder==="inbox"||m.folder==="sent"||m.folder==="archive"; }
  function threadOf(m){ var k=SETTINGS.threads&&inThreadFolder(m)?threadKey(m):null; if(!k) return [m];
    return MESSAGES.filter(function(x){ return x===m||(x.acct===m.acct&&inThreadFolder(x)&&threadKey(x)===k); }).sort(function(a,b){ return tsOf(a)-tsOf(b); }); }
  function threadCounts(){ var c={}; if(SETTINGS.threads) MESSAGES.forEach(function(x){ if(!inThreadFolder(x)) return; var k=threadKey(x); if(k) c[k]=(c[k]||0)+1; }); return c; }
  function renderList(){
    syncCat();
    $("#list").classList.toggle("multi",!!state.multi); app.classList.toggle("multi-on",!!state.multi); $("#rows").setAttribute("aria-multiselectable",String(!!state.multi));
    var stg=$("#btnSelect"); stg.textContent=state.multi?"OK":"Sélectionner"; stg.setAttribute("aria-pressed",String(!!state.multi));
    var f=folderOf(state.folder), msgs=listMessages(), all=catScoped(), cl=catLabel();
    var unread=all.filter(function(m){return !m.read;}).length;
    $("#lbTitle").textContent=f.name; $("#ltTitle").textContent=f.name;
    // Sous-titre : la vue et la catégorie se tronquent d'abord ; le nombre de messages / non lus reste lisible.
    $("#lbSub").innerHTML='<span class="ls-ctx">'+H(scopeLabel()+(cl?" · "+cl:""))+'</span><span class="ls-n">&nbsp;· '+H((msgs.length?plural(msgs.length,"message","messages"):"aucun message")+(unread&&state.folder!=="scheduled"&&state.folder!=="drafts"?", "+plural(unread,"non lu","non lus"):""))+'</span>';
    $("#ltSub").textContent=scopeLabel();
    $("#backLbl").textContent=f.name;
    $$("#filters [data-filter]").forEach(function(b){ b.setAttribute("aria-pressed",String(b.getAttribute("data-filter")===state.filter)); });
    var fb=$("#btnFilter"); fb.innerHTML=state.filter==="all"?I.filter:I.filterOn;
    fb.setAttribute("aria-label",state.filter==="all"?"Filtrer les messages":"Filtrer les messages (actif : "+FILTER_NAMES[state.filter]+")");
    renderCats();
    paintStatus();
    var ko=boitesEnEchec(), banniere=ko.length&&msgs.length?'<div class="loaderr" role="alert"><span>Réception indisponible pour '+H(ko.map(function(a){ return a.email; }).join(", "))+'.</span><button type="button" class="lnk" data-retry="1">Réessayer</button></div>':'';
    if(!msgs.length){
      $("#rows").innerHTML=etatVide(f,cl,ko);
      if(state.multi) state.multi=[]; renderSelBar();
      return;
    }
    if(state.multi){ var vis=msgs.map(function(m){return m.id;}); state.multi=state.multi.filter(function(id){ return vis.indexOf(id)>=0; }); }
    // Liste à sélection (listbox) : un seul arrêt de tabulation (la ligne sélectionnée, sinon la première), flèches / Origine / Fin pour naviguer.
    var stop=msgs.some(function(m){ return m.id===state.selected; })?state.selected:msgs[0].id, multi=viewAccounts()>1, TC=threadCounts();
    $("#rows").innerHTML=banniere+msgs.map(function(m){
      var own=(m.folder==="sent"||m.folder==="drafts"||m.folder==="scheduled"||!!m.sign);
      var who=own?("À : "+(m.sign?m.sign.signers.map(function(x){return x.name||x.email;}).join(", "):(m.to||""))):senderName(m);
      var date=m.folder==="drafts"?"Brouillon":m.folder==="scheduled"?fmtSchedShort(m.sendAt):fmtDate(tsOf(m));
      // Vues Toutes / Pro / Perso : compte nommé pour les lecteurs d'écran ; point de couleur seulement si la vue réunit plusieurs comptes
      var a=acctOf(m.acct), sel=state.selected===m.id, all=state.scope==="all"||state.scope==="pro"||state.scope==="perso";
      var pk=!!state.multi&&state.multi.indexOf(m.id)>=0;
      return '<div class="msg'+(m.read?"":" unread")+(m.flagged?" flagged":"")+(sel&&!state.multi?" sel":"")+(pk?" picked":"")+'" data-id="'+m.id+'" tabindex="'+(m.id===stop?0:-1)+'" role="option" aria-selected="'+(state.multi?pk:sel)+'">'+
        (state.multi?'<span class="selbox" aria-hidden="true">'+I.check+'</span>':'')+
        '<span class="dot" aria-hidden="true"></span>'+(m.flagged?'<span class="flg" aria-hidden="true">'+I.flagFill+'</span>':'')+
        '<span class="sr">'+(m.read?"":"Non lu. ")+(m.flagged?"Marqué. ":"")+'</span>'+
        '<span class="m-top"><span class="m-from">'+H(who)+'</span><span class="m-date">'+
          (m.att.length?'<span class="clip" title="Pièce jointe">'+I.attach+'</span>':'')+
          (m.folder==="scheduled"?'<span class="clk" title="Envoi programmé">'+I.clock+'</span>':'')+(m.sign?'<span class="clk" title="Signature électronique">'+I.sign+'</span>':'')+
          (all&&multi?'<span class="dotc" style="background:'+acctHue(a)+'" title="'+H(a.email)+' ('+KINDS[kindOf(a)]+')" aria-hidden="true"></span>':'')+
          '<span>'+H(date)+'</span><span class="m-chev" aria-hidden="true">'+I.chevR+'</span></span></span>'+
        '<span class="m-sub">'+(m.sign?signChip(m):'')+(function(){ var k=inThreadFolder(m)&&threadKey(m), n=k?TC[k]||0:0; return n>1?'<span class="tcount" title="'+n+' messages dans la conversation">'+n+'</span><span class="sr">Conversation de '+n+' messages : </span>':''; })()+H(m.subject||"(Sans objet)")+'</span>'+
        '<span class="m-prev">'+H(m.preview)+'</span>'+
        (all?'<span class="sr">, compte '+H(a.email)+'</span>':'')+
        // Raccourcis de survol (souris) : hors de l'arbre d'accessibilité et du Tab — au clavier, f / e / Suppr et la barre d'outils font la même chose.
        '<span class="quick" aria-hidden="true">'+
          '<button type="button" tabindex="-1" data-q="flag" data-id="'+m.id+'" title="'+(m.flagged?"Retirer le drapeau":"Marquer")+'" aria-label="'+(m.flagged?"Retirer le drapeau":"Marquer")+'">'+I.flag+'</button>'+
          '<button type="button" tabindex="-1" data-q="archive" data-id="'+m.id+'" title="Archiver (E)" aria-label="Archiver">'+I.archive+'</button>'+
          '<button type="button" tabindex="-1" class="dng" data-q="trash" data-id="'+m.id+'" title="Supprimer (Suppr)" aria-label="Supprimer">'+I.trash+'</button>'+
        '</span></div>';
    }).join("");
    renderSelBar();
  }

  // ---------- Sélection multiple (« Sélectionner » / « OK », comme dans Mail) ----------
  function renderSelBar(){
    var bar=$("#selBar"); if(!state.multi){ bar.hidden=true; bar.innerHTML=""; return; }
    var n=state.multi.length, tot=listMessages().length, sel=pickedMsgs(), anyUnread=sel.some(function(m){return !m.read;}), inTrash=state.folder==="trash";
    var b=function(act,icon,label,cls){ return '<button type="button" class="sb'+(cls?" "+cls:"")+'" data-multi="'+act+'" aria-label="'+H(label)+'" title="'+H(label)+'"'+(n?'':' disabled')+'>'+icon+'</button>'; };
    bar.hidden=false;
    bar.innerHTML='<button type="button" class="sa" data-multi="all">'+(n&&n===tot?"Aucun":"Tout")+'</button>'+
      '<span class="sc" aria-live="polite">'+(n?plural(n,"sélectionné","sélectionnés"):"Touchez des messages")+'</span>'+
      b("read",anyUnread?I.mail:I.unread,anyUnread?"Marquer comme lu":"Marquer comme non lu")+
      (state.folder==="archive"||inTrash?'':b("archive",I.archive,"Archiver"))+
      b("forward",I.forward,n>1?"Transférer les "+n+" messages":"Transférer")+
      b("trash",I.trash,inTrash?"Supprimer définitivement":"Supprimer","dng");
  }
  function pickedMsgs(){ return (state.multi||[]).map(msgById).filter(Boolean); }
  function setMulti(on,firstId){ state.multi=on?(firstId?[firstId]:[]):null; if(on){ state.selected=null; } renderList(); renderReading(); }
  function togglePick(id){ var i=state.multi.indexOf(id); if(i>=0) state.multi.splice(i,1); else state.multi.push(id); renderList();
    var r=$('.msg[data-id="'+id+'"]'); if(r) r.focus({preventScroll:true}); }
  function multiAct(act){
    var sel=pickedMsgs(); if(act==="all"){ var ids=listMessages().map(function(m){return m.id;}); state.multi=state.multi.length===ids.length?[]:ids; renderList(); return; }
    if(!sel.length) return;
    var n=sel.length, snap=sel.map(function(m){ return {m:m,folder:m.folder,read:m.read,sendAt:m.sendAt,uj:m.uj,aj:m.aj,idx:MESSAGES.indexOf(m)}; });
    var restore=function(){ snap.slice().sort(function(a,b){return a.idx-b.idx;}).forEach(function(x){ if(MESSAGES.indexOf(x.m)<0) MESSAGES.splice(Math.min(x.idx,MESSAGES.length),0,x.m);
      x.m.folder=x.folder; x.m.read=x.read; x.m.uj=x.uj; x.m.aj=x.aj; if(x.sendAt!=null) x.m.sendAt=x.sendAt; }); refreshCls(); renderAll(); persist(); };
    if(act==="forward"){
      var body=sel.map(function(m){ return "---------- Message transféré ----------\nDe : "+senderName(m)+" <"+senderEmail(m)+">\nDate : "+fmtFull(tsOf(m))+"\nObjet : "+(m.subject||"(Sans objet)")+"\n\n"+bodyText(m); }).join("\n\n");
      var subj=n===1?forwardModel(sel[0]).subject:"Tr: "+n+" messages";
      var atts=[]; sel.forEach(function(m){ (m.att||[]).forEach(function(a){ atts.push(a); }); });
      setMulti(false);
      openCompose({to:"",subject:subj,body:"\n\n"+body,acct:sel[0].acct,att:atts});
      return;
    }
    if(act==="read"){ var any=sel.some(function(m){return !m.read;}); sel.forEach(function(m){ m.read=any; });
      setMulti(false); renderAll(); persist(); toast(plural(n,"message marqué","messages marqués")+(any?" comme lu":" comme non lu"),{label:"Annuler",onAct:function(){ restore(); toast("Annulé"); }}); return; }
    var inTrash=state.folder==="trash";
    sel.forEach(function(m){
      if(act==="trash"&&inTrash){ var i=MESSAGES.indexOf(m); if(i>=0) MESSAGES.splice(i,1); return; }
      m.folder=act==="archive"?"archive":"trash"; m.uj=true; m.aj=false; if(m.sendAt!=null) delete m.sendAt; });
    setMulti(false); state.selected=null; refreshCls(); renderAll(); persist();
    toast((act==="archive"?plural(n,"message archivé","messages archivés"):inTrash?plural(n,"message supprimé définitivement","messages supprimés définitivement"):plural(n,"message déplacé","messages déplacés")+" dans la Corbeille"),
      {label:"Annuler",onAct:function(){ restore(); toast("Annulé"); }});
  }

  // ---------- Rendu : lecture ----------
  function tb(act,icon,label,cls){ return '<button type="button" class="tb'+(cls?" "+cls:"")+'" data-act="'+act+'" aria-label="'+H(label)+'" title="'+H(label)+'">'+icon+'</button>'; }
  function tbtn(act,icon,label,cls){ return '<button type="button" class="tbtn'+(cls?" "+cls:"")+'" data-act="'+act+'" aria-label="'+H(label)+'">'+icon+'</button>'; }
  function readActsHtml(m){
    var msgs=listMessages(), idx=-1; if(m) for(var i=0;i<msgs.length;i++) if(msgs[i].id===m.id){idx=i;break;}
    var nav='<div class="acts-nav"><button type="button" class="tb" data-nav="-1" aria-label="Message précédent" title="Message précédent"'+(idx>0?'':' disabled')+'>'+I.chevU+'</button>'+
      '<button type="button" class="tb" data-nav="1" aria-label="Message suivant" title="Message suivant"'+(idx>=0&&idx<msgs.length-1?'':' disabled')+'>'+I.chevD+'</button></div>';
    var dis=m?"":" disabled";
    var isSched=!!m&&m.folder==="scheduled", isDraft=!!m&&(m.folder==="drafts"||isSched), fl=!!m&&m.flagged;
    var flagLbl=fl?"Retirer le drapeau":"Marquer d’un drapeau";
    var flagTb='<button type="button" class="tb'+(fl?" on-flag":"")+'" data-act="flag" aria-pressed="'+fl+'" aria-label="Drapeau" title="'+flagLbl+'"'+dis+'>'+(fl?I.flagFill:I.flag)+'</button>';
    var mac='<div class="acts-mac">';
    if(isDraft) mac+='<button type="button" class="tb" data-act="editDraft" aria-label="Modifier le message" title="Modifier le message"'+dis+'>'+I.pencil+'</button>';
    else mac+='<button type="button" class="tb" data-act="unread" aria-label="Marquer comme non lu" title="Marquer comme non lu"'+dis+'>'+I.unread+'</button>';
    mac+='<span class="tsep" aria-hidden="true"></span>'+
      '<button type="button" class="tb" data-act="archive" aria-label="Archiver" title="Archiver (E)"'+dis+'>'+I.archive+'</button>'+
      '<button type="button" class="tb" data-act="trash" aria-label="Supprimer" title="Supprimer"'+dis+'>'+I.trash+'</button>'+
      // Indésirable : seulement pour un message reçu (un message envoyé n'a pas d'expéditeur à juger)
      (isDraft?'':!!m&&m.folder==="junk"?'<button type="button" class="tb" data-act="notJunk" aria-label="Ce n’est pas un indésirable" title="Ce n’est pas un indésirable (remettre '+(m.from?'dans la réception':'dans Envoyés')+')">'+I.inbox+'</button>':
        !!m&&!m.from?'':'<button type="button" class="tb" data-act="junk" aria-label="Déplacer dans les indésirables" title="Indésirable"'+dis+'>'+I.junk+'</button>');
    if(!isDraft) mac+='<span class="tsep" aria-hidden="true"></span>'+
      '<button type="button" class="tb" data-act="reply" aria-label="Répondre" title="Répondre (R)"'+dis+'>'+I.reply+'</button>'+
      '<button type="button" class="tb" data-act="replyAll" aria-label="Répondre à tous" title="Répondre à tous"'+dis+'>'+I.replyAll+'</button>'+
      '<button type="button" class="tb" data-act="forward" aria-label="Transférer" title="Transférer"'+dis+'>'+I.forward+'</button>';
    mac+='<span class="tsep" aria-hidden="true"></span>'+flagTb+'</div>';
    var touch='<div class="acts-touch">'+(m?flagTb+tb("archive",I.archive,"Archiver")+tb("trash",I.trash,"Supprimer")+
      (isDraft?'<button type="button" class="tb txt" data-act="editDraft" title="Modifier le message">Modifier</button>':tb("replyMenu",I.reply,"Répondre, transférer…")):'')+'</div>';
    return nav+mac+touch;
  }
  function readToolsHtml(m){
    if(!m) return '';
    var isDraft=m.folder==="drafts"||m.folder==="scheduled";
    return '<button type="button" class="tbtn'+(m.flagged?" on-flag":"")+'" data-act="flag" aria-pressed="'+m.flagged+'" aria-label="Drapeau">'+(m.flagged?I.flagFill:I.flag)+'</button>'+
      tbtn("archive",I.archive,"Archiver")+tbtn("trash",I.trash,"Supprimer")+
      (isDraft?'<button type="button" class="tbtn txt" data-act="editDraft">Modifier</button>':tbtn("replyMenu",I.reply,"Répondre, transférer…"))+
      '<span class="tool-gap"></span>';
  }
  // Corps d'un message que la source n'a pas rendu avec sa liste : lu à l'ouverture.
  function lireCorps(m){
    if(m.lisant) return;
    if(typeof SRC.lire!=="function"){ m.body=[]; return; }
    m.lisant=true;
    Promise.resolve().then(function(){ return SRC.lire(m.sid); }).then(function(r){
      m.lisant=false; if(!r||r.corps==null) throw new Error("message vide");
      m.body=paragraphes(r.corps); if(!m.preview) m.preview=firstLine(texteDe(m.body));
      if(Array.isArray(r.pj)) m.att=r.pj.map(function(p){ return {name:String(p.nom||"pièce jointe"),size:String(p.taille||""),kind:p.type==="img"?"img":"doc"}; });
      if(state.selected===m.id) renderReading();
    },function(e){ m.lisant=false; m.body=["Le contenu de ce message n’a pas pu être lu ("+msgErr(e,"échec")+")."]; if(state.selected===m.id) renderReading(); });
  }
  function renderReading(){
    var r=$("#readScroll");
    syncCat();
    var m=msgById(state.selected);
    $("#reading").classList.remove("scrolled");
    if(!m||!inScope(m)||!inFolder(m,state.folder)){
      state.selected=null;   // rien d'affiché → rien de sélectionné (les raccourcis n'agissent pas sur un message invisible)
      $("#readActs").innerHTML=readActsHtml(null); $("#readTools").innerHTML="";
      r.innerHTML='<div class="empty reading-empty">'+I.mail+'<b>Aucun message sélectionné</b></div>';
      backToListMobile();
      return;
    }
    $("#readActs").innerHTML=readActsHtml(m);
    $("#readTools").innerHTML=readToolsHtml(m);
    var isSched=m.folder==="scheduled";
    var isDraft=m.folder==="drafts"||isSched;
    var who=senderName(m), acc=acctOf(m.acct), k0=kindOf(acc);
    if(m.src&&m.body===null) lireCorps(m);
    var bodyHtml=m.body===null?'<p class="lecture">Chargement du message…</p>':(m.body||[]).map(function(p){ if(Array.isArray(p)&&p[0]==="quote") return '<div class="quote">'+H(p[1]).replace(/\n/g,"<br>")+'</div>'; return "<p>"+H(p).replace(/\n/g,"<br>")+"</p>"; }).join("");
    var canSign=!m.sign&&k0==="pro"&&m.att.some(function(a){ return a.kind!=="img"; })&&m.folder!=="junk"&&m.folder!=="trash";
    var att=m.att.length?'<div class="attbar">'+m.att.map(function(a){ return '<div class="att"><span class="ic" aria-hidden="true">'+(a.kind==="img"?I.img:I.doc)+'</span><span style="min-width:0"><span class="fn" style="display:block">'+H(a.name)+'</span><span class="fs" style="display:block">'+H(a.size)+'</span></span></div>'; }).join("")+(canSign?'<button type="button" class="btn att-btn" data-act="signFrom">'+I.sign+'<span>Faire signer</span></button>':'')+'</div>':'';
    var vip=m.vip?'<span class="vip" title="VIP">'+I.star+'<span class="sr">VIP</span></span>':'';
    // Pas de réponse rapide à un indésirable (on ne répond pas à une arnaque d'un clic),
    // ni à un envoi automatique (notification, reçu, voyage, publicité, adresse « no-reply »)
    var robot=!!m.from&&(effCat(m)!=="principal"||/(^|[._+-])(no[-_]?reply|do[-_]?not[-_]?reply|ne[-_]?pas[-_]?repondre)([._+-]|@)/i.test(m.from.email||""));
    var quick=isDraft||m.folder==="junk"||robot||m.sign?'':'<div class="rquick" role="group" aria-label="Réponses rapides"><span class="rq-lbl" aria-hidden="true">Réponse rapide</span>'+["Merci, c'est noté","Je reviens vers vous rapidement","C'est parfait pour moi","Pouvez-vous préciser ?"].map(function(q){return '<button type="button" data-quick="'+H(q)+'">'+H(q)+'</button>';}).join("")+'</div>';
    var banner=isSched?'<div class="sched-banner"><span class="ic" aria-hidden="true">'+I.clock+'</span>'+
      '<div class="tx"><b>Envoi programmé '+H(fmtSched(m.sendAt))+'</b><span>Depuis '+H(acc.email)+(enRetard(m)?' · l’heure est passée pendant que la page était fermée : le message attend votre geste':' · modifiable jusqu’à l’envoi')+'</span></div>'+
      '<div class="sb-act"><button type="button" class="btn primary" data-act="sendNow">Envoyer maintenant</button><button type="button" class="btn" data-act="reschedule">Changer l’heure</button><button type="button" class="btn danger" data-act="unschedule">Annuler l’envoi</button></div></div>':'';
    if(m.sign) banner=signCardHtml(m);
    var dLong=isSched?"Programmé":m.folder==="drafts"?"Brouillon":fmtFull(tsOf(m));
    var dShort=isSched?fmtSchedShort(m.sendAt):m.folder==="drafts"?"Brouillon":fmtDate(tsOf(m));
    // Indésirable : pourquoi, et comment le récupérer
    if(m.folder==="junk"&&m.from) banner='<div class="sched-banner junk" role="note" aria-label="Classé en indésirable"><span class="ic" aria-hidden="true">'+I.junk+'</span>'+
      '<div class="tx"><b>Classé en indésirable</b><ul class="jr">'+junkWhy(m).map(function(x){ return '<li>'+H(cap(x))+'</li>'; }).join("")+'</ul></div>'+
      '<div class="sb-act"><button type="button" class="btn primary" data-act="notJunk">Ce n’est pas un indésirable</button></div></div>';
    // Boîte de réception : catégorie, « Pourquoi ici ? », « Déplacer vers… »
    var catLine="";
    if(m.folder==="inbox"&&m.from){ var cid=effCat(m), open=state.whyOpen===m.id;
      catLine='<div class="rcat"><span class="cat-chip" data-cat="'+cid+'">'+I[CAT_ICON[cid]]+'<span><span class="sr">Catégorie : </span>'+H(catName(cid))+'</span></span>'+
        '<button type="button" class="lnk" id="whyBtn" aria-expanded="'+open+'" aria-controls="whyPanel">Pourquoi ici&nbsp;?<span class="chv" aria-hidden="true">'+I.chevR+'</span></button>'+
        '<button type="button" class="lnk" data-act="moveCat" aria-haspopup="dialog" aria-label="Déplacer vers…">'+I.moveTo+'<span class="mv-long">Déplacer vers…</span><span class="mv-short">Déplacer…</span></button></div>'+
        '<div class="why" id="whyPanel"'+(open?'':' hidden')+'><p class="why-t">Rangé dans '+H(catName(cid))+' :</p><ul>'+whyOf(m).map(function(x){ return '<li>'+H(cap(x))+'</li>'; }).join("")+'</ul>'+
        '<p class="why-note">'+I.info+'<span>Tri fait sur cet appareil, d’après l’expéditeur et le contenu. Bientôt : vérification de l’authenticité des expéditeurs (SPF, DKIM, DMARC).</span></p></div>'; }
    var k=kindOf(acc);
    // « via » seulement si le destinataire affiché n'est pas déjà l'adresse de la boîte (le badge Pro / Perso nomme la boîte)
    var rto='À : '+(m.sign?m.sign.signers.map(function(x){return x.email;}).join(", "):(m.to||acc.name))+(String(m.to||"").toLowerCase().indexOf(String(acc.email).toLowerCase())>=0?'':' · via '+acc.email);
    r.innerHTML='<article class="rpad">'+
      '<h1 class="rsubj" tabindex="-1">'+H(m.subject||"(Sans objet)")+'</h1>'+banner+
      '<div class="rhead"><span class="ravatar" aria-hidden="true">'+H(initials(who))+'</span>'+
        '<div class="rident"><div class="rline"><span class="rname">'+H(who)+'</span>'+vip+'<span class="rdate"><span class="d-long">'+H(dLong)+'</span><span class="d-short">'+H(dShort)+'</span></span></div>'+
          '<div class="rmeta">'+H(senderEmail(m))+'</div>'+
          '<div class="rmeta rto"><span class="rto-t">'+H(rto)+'</span>'+kindBadge(k)+'</div></div></div>'+catLine+
      '<div class="rsep"></div><div class="rbody">'+bodyHtml+att+'</div>'+quick+threadHtml(m)+'</article>';
    r.scrollTop=0;
  }

  // Le tri est recalculé à chaque rendu complet : nouveaux messages, règles apprises et contacts (Envoyés) sont toujours à jour.
  function threadHtml(m){
    var t=threadOf(m); if(t.length<2) return "";
    return '<section class="thread" aria-label="Conversation, '+t.length+' messages"><h2>Conversation · '+t.length+' messages</h2>'+t.filter(function(x){ return x!==m; }).map(function(x){
      var paras=(x.body||[]).map(function(p){ return '<p>'+H(Array.isArray(p)?p[1]:p).replace(/\n/g,"<br>")+'</p>'; }).join("");
      return '<details class="th-item"><summary><span class="th-who">'+H(x.from?senderName(x):"Vous")+(x.folder==="sent"?' <span class="sr">(envoyé)</span>':'')+'</span><span class="th-date">'+H(fmtDate(tsOf(x)))+'</span><span class="th-prev">'+H(x.preview||firstLine(bodyText(x)))+'</span></summary>'+
        '<div class="th-body">'+paras+(x.att&&x.att.length?'<p class="th-date">'+I.attach.replace('<svg','<svg style="width:13px;height:13px;vertical-align:-2px"')+' '+H(x.att.map(function(a){return a.name;}).join(", "))+'</p>':'')+
        '<button type="button" class="lnk" data-open="'+x.id+'">Ouvrir ce message</button></div></details>'; }).join("")+'</section>';
  }
  function renderSpace(){
    ["perso","pro"].forEach(function(sp){
      var b=$('#spaceBar [data-space="'+sp+'"]'), cur=state.scope===sp||(state.scope!=="all"&&state.scope!=="pro"&&state.scope!=="perso"&&acctExists(state.scope)&&acctOf(state.scope).kind===sp);
      b.setAttribute("aria-pressed",String(cur));
      var u=scopeUnread(sp); $(sp==="pro"?"#spnPro":"#spnPerso").textContent=u?String(u):"";
      b.setAttribute("aria-label",(sp==="pro"?"Côté Pro":"Côté Perso")+(u?", "+u+" non lu"+(u>1?"s":""):""));
    });
  }
  function renderAll(){ refreshCls(); renderSidebar(); renderSpace(); renderList(); renderReading(); paintTitle(); }
  // Pastille dans l'onglet : nombre de mails non lus dans les boîtes de réception.
  function paintTitle(){ compter(); }

  // ---------- Sélection / actions ----------
  function selectMessage(id,viaKb){
    var m=msgById(id); if(!m) return;
    var hadFocus=viaKb||$("#rows").contains(actif());
    state.selected=id; if(!m.read) m.read=true;
    renderSidebar(); renderList(); renderReading(); persist();
    var el=$('.msg[data-id="'+id+'"]');
    if(isPhone()) go("reading");
    else if(el){ var ls=$("#listScroll"), y0=ls.scrollTop; el.scrollIntoView({block:"nearest"}); snapTitle(y0); if(hadFocus) el.focus({preventScroll:true}); }
  }
  // Grand titre (iPad) : jamais à moitié défilé après avoir amené une ligne à l'écran (comme iOS, il est entier ou replié).
  var LT_FOLD=36;
  function snapTitle(y0){ var ls=$("#listScroll"), y=ls.scrollTop; if(layout()!=="pad"||y<=0||y>LT_FOLD) return;
    ls.scrollTop=y>y0?LT_FOLD+1:0; $("#list").classList.toggle("scrolled",ls.scrollTop>LT_FOLD); }
  function backToListMobile(){ if(isPhone()&&app.getAttribute("data-view")==="reading") go("list"); }
  function msgById(id){ if(!id) return null; for(var i=0;i<MESSAGES.length;i++) if(MESSAGES[i].id===id) return MESSAGES[i]; return null; }
  // uj : déplacé à la main — le tri automatique ne le renverra plus dans Indésirables.
  function moveTo(m,folder,label){ var at=listIndex(m.id); m.folder=folder; m.uj=true; m.aj=false; if(m.sendAt!=null) delete m.sendAt; if(state.selected===m.id){ state.selected=null; } backToListMobile(); renderAll(); persist(); refocus(null,at); if(label) toast(label); }
  // Après un rendu qui a remplacé l'élément actif (déplacer, supprimer, indésirable…), le focus clavier ne retombe pas sur le corps de la page :
  // il revient sur le contrôle demandé s'il existe encore, sinon sur la ligne qui a pris la place du message, sinon sur la liste.
  function listIndex(id){ var l=listMessages(); for(var i=0;i<l.length;i++) if(l[i].id===id) return i; return 0; }
  function refocus(sel,at){
    var a=actif();
    if(a&&sr.contains(a)&&!a.closest("[inert]")) return;
    if(cadre.classList.contains("has-sheet")) return;
    var el=sel?$(sel):null;
    if(!el&&!(isPhone()&&app.getAttribute("data-view")!=="list")){
      var rows=$$("#rows .msg"); el=$("#rows .msg.sel")||rows[Math.max(0,Math.min(at||0,rows.length-1))]||null;
      if(el&&!el.classList.contains("sel")){ rows.forEach(function(r){ r.tabIndex=r===el?0:-1; }); } }
    if(!el) el=isPhone()?$("#"+(app.getAttribute("data-view")==="reading"?"reading":app.getAttribute("data-view")==="mailboxes"?"sidebar":"list")):$("#list");
    try{ el.focus({preventScroll:true}); }catch(e){} }

  // Annulation d'un changement de tri : on ne rétablit que ce que ce changement a modifié (et qui n'a pas bougé depuis).
  function triSnap(){ var s={r:JSON.stringify(RULES),m:{}}; MESSAGES.forEach(function(x){ s.m[x.id]=[x.folder,x.co||"",!!x.uj,!!x.aj]; }); return s; }
  function undoable(change){
    var pre=triSnap(); change(); renderAll(); var post=triSnap(); persist();
    return function(){
      var r0=JSON.parse(pre.r), r1=JSON.parse(post.r);
      ["senders","domains"].forEach(function(k){ var keys={}; Object.keys(r0[k]).concat(Object.keys(r1[k])).forEach(function(x){ keys[x]=1; });
        Object.keys(keys).forEach(function(x){ if(r0[k][x]===r1[k][x]||RULES[k][x]!==r1[k][x]) return; if(r0[k][x]==null) delete RULES[k][x]; else RULES[k][x]=r0[k][x]; }); });
      MESSAGES.forEach(function(x){ var a=pre.m[x.id], b=post.m[x.id]; if(!a||!b||a.join()===b.join()) return;
        if([x.folder,x.co||"",!!x.uj,!!x.aj].join()!==b.join()) return;
        x.folder=a[0]; if(a[1]) x.co=a[1]; else delete x.co; x.uj=a[2]; x.aj=a[3]; });
      renderAll(); persist(); }; }
  // Indésirable à la main : le message part, et l'expéditeur est appris pour la suite (Annuler pendant quelques secondes).
  // Un message envoyé (sans expéditeur) n'est jamais jugé indésirable.
  function markJunk(m){
    if(!m||!m.from) return;
    var email=emailOf(m), at=listIndex(m.id);
    var undo=undoable(function(){ m.folder="junk"; m.uj=true; m.aj=false; if(email) RULES.senders[email]="junk"; if(state.selected===m.id) state.selected=null; backToListMobile(); });
    refocus(null,at);
    toast(email?"Déplacé dans Indésirables · expéditeur mémorisé":"Déplacé dans les indésirables",{label:"Annuler",onAct:function(){ undo(); toast("Déplacement annulé"); }});
  }
  // « Ce n'est pas un indésirable » : retour dans la réception, expéditeur appris, catégorie recalculée.
  // (Un message envoyé arrivé là par une version précédente retourne dans Envoyés.)
  function markNotJunk(m){
    if(!m) return;
    var email=emailOf(m), out=!m.from, at=listIndex(m.id);
    var undo=undoable(function(){ m.folder=out?"sent":"inbox"; m.uj=!out; m.aj=false; if(email) RULES.senders[email]="notjunk"; if(state.selected===m.id) state.selected=null; backToListMobile(); });
    refocus(null,at);
    toast(out?"Remis dans Envoyés":email?"Remis dans la réception · expéditeur mémorisé":"Remis dans la réception",{label:"Annuler",onAct:function(){ undo(); toast("Remis dans Indésirables"); }});
  }

  function doAct(act,id){
    var m=id?msgById(id):msgById(state.selected); if(!m) return;
    if(act==="flag"){ m.flagged=!m.flagged; renderAll(); persist(); toast(m.flagged?"Message marqué":"Drapeau retiré"); }
    else if(act==="unread"){ m.read=false; state.selected=null; backToListMobile(); renderAll(); persist(); toast("Marqué comme non lu"); }
    else if(act==="archive") moveTo(m,"archive","Message archivé");
    else if(act==="junk") markJunk(m);
    else if(act==="notJunk") markNotJunk(m);
    else if(act==="moveCat") openMoveCat(m);
    else if(act==="trash") moveTo(m,"trash","Message supprimé");
    else if(act==="reply") openCompose(replyModel(m,false));
    else if(act==="replyAll") openCompose(replyModel(m,true));
    else if(act==="forward") openCompose(forwardModel(m));
    else if(act==="editDraft") openCompose({to:m.to,subject:m.subject,body:bodyText(m),acct:m.acct,att:(m.att||[]).slice(),draftId:m.id,scheduled:m.folder==="scheduled",noTrust:m.noTrust||null});
    else if(act==="sendNow"){ m.folder="outbox"; state.selected=null; backToListMobile(); renderAll(); commitOutbox(m,false); }
    else if(act==="unschedule"){ m.folder="drafts"; delete m.sendAt; m.at=Date.now(); m.user=true; state.selected=null; backToListMobile(); renderAll(); persist(); toast("Envoi annulé — le message est dans les brouillons"); }
    else if(act==="reschedule") openReschedule(m);
    else if(act.indexOf("sign")===0) signAct(act,m);
  }
  function bodyText(m){ return (m.body||[]).map(function(p){return Array.isArray(p)?p[1]:p;}).join("\n\n"); }
  function quoteOf(m){ return "\n\n\nLe "+fmtFull(tsOf(m))+", "+senderName(m)+" a écrit :\n> "+bodyText(m).replace(/\n/g,"\n> "); }
  // Répondre : à l'expéditeur ; « à tous » ajoute les autres destinataires (sauf soi) ; depuis Envoyés, aux mêmes destinataires.
  function replyModel(m,all){
    var subj=/^re\s*:/i.test(m.subject)?m.subject:"Re: "+m.subject, to;
    if(!m.from) to=m.to||"";
    else{ var me=acctOf(m.acct).email.toLowerCase(), list=[m.from.email], low=[m.from.email.toLowerCase()];
      if(all) (m.rcpt||[]).forEach(function(a){ var l=a.toLowerCase(); if(l!==me&&low.indexOf(l)<0){ list.push(a); low.push(l); } });
      to=list.join(", "); }
    // Répondre à un message rangé dans Indésirables ne fait pas de son expéditeur un contact de confiance.
    return {to:to,subject:subj,body:quoteOf(m),acct:m.acct,noTrust:m.from&&m.folder==="junk"?[emailOf(m)]:null}; }
  function forwardModel(m){ var subj=/^(tr|fwd?)\s*:/i.test(m.subject)?m.subject:"Tr: "+m.subject; return {to:"",subject:subj,body:quoteOf(m),acct:m.acct,att:(m.att||[]).slice()}; }

  // ---------- Feuilles, menus : socle commun ----------
  var returnFocus=null;
  function tabbables(root){ return $$('button,input,select,textarea,[tabindex]:not([tabindex="-1"])',root).filter(function(x){
    return !x.disabled&&x.tabIndex>=0&&!x.closest("[inert],[hidden]")&&x.getClientRects().length>0&&getComputedStyle(x).visibility!=="hidden"; }); }
  function makeOverlay(kind){
    var ov=document.createElement("div"); ov.className="overlay ov-"+kind; ov.id="overlay";
    returnFocus=actif();
    $("#overlays").appendChild(ov);
    cadre.classList.add("has-sheet"); if(kind!=="menu") cadre.classList.add("sheet-under");
    app.inert=true;
    // Fond voilé : ne ferme que si l'appui ET le relâchement y ont lieu (une sélection de texte glissée hors de la feuille ne ferme rien).
    var downOnOv=false;
    ov.addEventListener("pointerdown",function(e){ downOnOv=e.target===ov; });
    ov.addEventListener("click",function(e){ var hit=e.target===ov&&downOnOv; downOnOv=false; if(hit) (ov.onBackdrop||closeOverlay)(); });
    // Focus piégé dans la feuille (Tab / Maj+Tab bouclent)
    ov.addEventListener("keydown",function(e){
      if(e.key!=="Tab") return;
      var f=tabbables(ov); if(!f.length) return;
      var i=f.indexOf(actif());
      if(e.shiftKey&&i<=0){ e.preventDefault(); f[f.length-1].focus(); }
      else if(!e.shiftKey&&(i<0||i===f.length-1)){ e.preventDefault(); f[0].focus(); }
    });
    return ov;
  }
  function closeOverlay(){
    var had=false, o; while((o=$("#overlay"))){ o.remove(); had=true; }
    cadre.classList.remove("has-sheet","sheet-under"); app.inert=false; state.compose=null; rsOpenId=null;
    if(had&&returnFocus&&sr.contains(returnFocus)&&returnFocus!==document.body){ try{ returnFocus.focus({preventScroll:true}); }catch(e){} }
    returnFocus=null;
    if(had) setTimeout(flushScheduled,0);   // un envoi retenu pendant que sa feuille était ouverte part maintenant
  }
  function closeCompose(){ closeOverlay(); }
  function sheetBar(left,title,right,titleId){ return '<div class="sheet-bar"><div class="sb-l" data-slot="l">'+left+'</div><h2 class="sheet-title" id="'+titleId+'">'+title+'</h2><div class="sb-r" data-slot="r">'+right+'</div></div>'; }
  var SHEET_FOOT='<div class="sheet-foot" data-slot="foot"></div>';
  // Boutons des feuilles : barre de navigation sur iPad/iPhone (Annuler à gauche, action à droite),
  // pied de feuille sur Mac (Annuler puis bouton par défaut, en bas à droite). data-home = place tactile, data-mac = place Mac.
  function placeSheetChrome(){
    var mac=layout()==="mac", a=actif();
    $$("#overlays .sheet").forEach(function(sh){
      var key=function(el){ return +(el.getAttribute(mac&&el.hasAttribute("data-ordm")?"data-ordm":"data-ord")||0); };
      $$("[data-home]",sh).sort(function(x,y){ return key(x)-key(y); }).forEach(function(el){
        var where=mac&&el.hasAttribute("data-mac")?el.getAttribute("data-mac"):el.getAttribute("data-home");
        var slot=sh.querySelector('[data-slot="'+where+'"]'); if(slot) slot.appendChild(el);
      });
    });
    if(a&&a!==document.body&&sr.contains(a)&&actif()!==a){ try{ a.focus({preventScroll:true}); }catch(e){} }
  }

  // Menu contextuel (Mac/iPad, filtre iPhone) ou feuille d'actions (iPhone)
  function openMenu(anchor,o){
    closeOverlay();
    var ov=makeOverlay("menu");
    var asSheet=!!o.sheet&&isPhone();
    var items=o.items.map(function(it){
      return '<button type="button" class="mitem'+(it.danger?" dng":"")+'" role="'+(it.radio?"menuitemradio":"menuitem")+'"'+(it.radio?' aria-checked="'+!!it.checked+'"':'')+' data-pick="'+it.id+'"'+(it.attr||"")+'>'+
        (asSheet?'':'<span class="mck" aria-hidden="true">'+(it.checked?I.check:'')+'</span>')+'<span class="mlbl">'+H(it.label)+'</span>'+(it.icon&&!asSheet?'<span class="mic" aria-hidden="true">'+it.icon+'</span>':'')+'</button>';
    }).join("");
    if(asSheet){
      ov.classList.add("ov-asheet");
      // role=menu : seulement des groupes et des menuitems (le titre devient le nom du groupe, « Annuler » est un menuitem)
      ov.innerHTML='<div class="asheet" role="menu" aria-label="'+H(o.label)+'"><div class="ag" role="group"'+(o.title?' aria-label="'+H(o.title)+'"':'')+'>'+(o.title?'<div class="ag-title" aria-hidden="true">'+H(o.title)+'</div>':'')+items+'</div>'+
        '<div class="ag" role="group"><button type="button" class="mitem cancel" role="menuitem" data-cancel="1">Annuler</button></div></div>';
    }else{
      ov.innerHTML='<div class="menu" role="menu" aria-label="'+H(o.label)+'">'+(o.title?'<div class="mtitle" aria-hidden="true">'+H(o.title)+'</div>':'')+items+'</div>';
      var menu=ov.firstChild, r=anchor.getBoundingClientRect(), vw=window.innerWidth, vh=window.innerHeight, left=(r.left+r.width/2)<vw/2;
      if(r.top<vh/2) menu.style.top=Math.round(r.bottom+6)+"px"; else menu.style.bottom=Math.round(vh-r.top+6)+"px";
      if(left) menu.style.left=Math.round(Math.max(8,r.left))+"px"; else menu.style.right=Math.round(Math.max(8,vw-r.right))+"px";
      menu.style.transformOrigin=(r.top<vh/2?"top ":"bottom ")+(left?"left":"right");
    }
    ov.addEventListener("click",function(e){
      var p=e.target.closest("[data-pick]"); if(p){ var id=p.getAttribute("data-pick"); closeOverlay(); o.onPick(id); return; }
      if(e.target.closest("[data-cancel]")) closeOverlay();
    });
    ov.addEventListener("keydown",function(e){
      if(e.key!=="ArrowDown"&&e.key!=="ArrowUp") return; e.preventDefault();
      var its=$$(".mitem",ov), i=its.indexOf(actif()); i=(i+(e.key==="ArrowDown"?1:-1)+its.length)%its.length; its[i].focus();
    });
    var first=ov.querySelector('[aria-checked="true"]')||ov.querySelector(".mitem"); if(first) first.focus();
  }
  function openFilterMenu(anchor){
    openMenu(anchor,{label:"Filtrer par",title:"Filtrer par",items:["all","unread","flagged"].map(function(k){
      return {id:k,label:k==="all"?"Tous les messages":FILTER_NAMES[k],radio:true,checked:state.filter===k,attr:' data-filter="'+k+'"'}; }),
      onPick:function(k){ state.filter=k; renderList(); renderReading(); }});
  }
  function openReplyMenu(anchor){
    var m=msgById(state.selected); if(!m) return;
    openMenu(anchor,{label:"Actions sur le message",sheet:true,title:m.subject,items:[
      {id:"reply",label:"Répondre",icon:I.reply},{id:"replyAll",label:"Répondre à tous",icon:I.replyAll},{id:"forward",label:"Transférer",icon:I.forward},
      {id:"unread",label:"Marquer comme non lu",icon:I.unread}].concat(
      m.folder==="junk"?[{id:"notJunk",label:"Ce n’est pas un indésirable",icon:I.inbox}]:m.from?[{id:"junk",label:"Déplacer dans Indésirables",icon:I.junk}]:[]),
      onPick:function(a){ doAct(a); }});
  }

  // ---------- Clic droit (et appui long sur écran tactile) ----------
  function pointAnchor(x,y){ return {getBoundingClientRect:function(){ return {left:x,right:x,top:y,bottom:y,width:0,height:0}; }}; }
  function openMsgMenu(id,anchor){
    var m=msgById(id); if(!m) return;
    var own=m.folder==="sent"||m.folder==="drafts"||m.folder==="scheduled", items=[];
    if(!own||m.folder==="sent") items.push({id:"reply",label:"Répondre",icon:I.reply},{id:"replyAll",label:"Répondre à tous",icon:I.replyAll},{id:"forward",label:"Transférer",icon:I.forward});
    if(m.folder==="drafts"||m.folder==="scheduled") items.push({id:"editDraft",label:"Modifier",icon:I.compose||I.forward});
    items.push({id:m.read?"unread":"markRead",label:m.read?"Marquer comme non lu":"Marquer comme lu",icon:m.read?I.unread:I.mail},
      {id:"flag",label:m.flagged?"Retirer le drapeau":"Marquer d’un drapeau",icon:I.flag});
    if(m.folder==="inbox") items.push({id:"moveCat",label:"Ranger dans…",icon:I.moveTo});
    if(m.folder!=="archive"&&m.folder!=="trash") items.push({id:"archive",label:"Archiver",icon:I.archive});
    if(m.folder==="junk") items.push({id:"notJunk",label:"Ce n’est pas un indésirable",icon:I.inbox}); else if(m.from&&!own) items.push({id:"junk",label:"Indésirable",icon:I.junk});
    items.push({id:"trash",label:m.folder==="trash"?"Supprimer définitivement":"Supprimer",icon:I.trash,danger:true},{id:"pick",label:"Sélectionner plusieurs…",icon:I.check});
    openMenu(anchor,{label:"Actions sur le message",sheet:true,title:m.subject||"(Sans objet)",items:items,onPick:function(a){
      if(a==="pick"){ setMulti(true,id); return; }
      if(a==="markRead"){ m.read=true; renderAll(); persist(); toast("Marqué comme lu"); return; }
      if(a==="trash"&&m.folder==="trash"){ state.multi=[id]; multiAct("trash"); return; }
      doAct(a,id); }});
  }
  function openAcctMenu(id,anchor){
    var a=acctOf(id); if(!a||a.id!==id) return; var k=kindOf(a), other=k==="pro"?"perso":"pro";
    openMenu(anchor,{label:"Boîte "+a.email,sheet:true,title:a.email,items:[
      {id:"open",label:"Ouvrir cette boîte",icon:I.inbox},
      {id:"rename",label:"Renommer…",icon:I.compose||I.mail},
      UN_COTE?null:{id:"side",label:"Passer côté "+KINDS[other],icon:other==="pro"?I.briefcase:I.house},
      {id:"del",label:"Supprimer la boîte…",icon:I.trash,danger:true}].filter(Boolean),
      onPick:function(x){
        if(x==="open"){ state.scope=id; state.folder="inbox"; state.selected=null; renderAll(); persist(); go("list"); }
        else if(x==="rename") openRenameAcct(a);
        else if(x==="side"){ a.kind=other; if(state.scope===k&&!accountsOfKind(k).length) state.scope=other; renderAll(); persist(); toast(a.email+" est maintenant côté "+KINDS[other]); }
        else if(x==="del") confirmDeleteAcct(a,anchor);
      }});
  }
  function confirmDeleteAcct(a,anchor){
    var n=MESSAGES.filter(function(m){ return m.acct===a.id; }).length;
    openMenu(anchor,{label:"Supprimer la boîte",sheet:true,title:"Supprimer "+a.email+" d’OP Courrier ? Vos mails restent sur votre messagerie ("+a.email.split("@")[1]+") : seule la connexion à OP Courrier est retirée.",items:[
      {id:"yes",label:"Supprimer la boîte ("+plural(n,"message","messages")+" retirés d’OP Courrier)",danger:true},{id:"no",label:"Garder la boîte"}],
      onPick:function(x){ if(x==="yes") deleteAcct(a); }});
  }
  // Retrait local tout de suite, avec « Annuler » ; la SOURCE n'est prévenue qu'une fois le délai écoulé (ou la page quittée) — sinon « Annuler » mentirait.
  var retraits=[];
  function retirerCoteSource(r){ if(r.fait) return; r.fait=true;
    Promise.resolve().then(function(){ return SRC.retirerBoite(r.a.sid); }).then(function(){ delete RETIRES[r.a.id]; },function(e){ delete RETIRES[r.a.id]; if(vivant){ toast("La boîte n’a pas pu être retirée : "+msgErr(e,"échec")); charger(false); } }); }
  function deleteAcct(a){
    var ai=ACCOUNTS.indexOf(a), saved=[];
    for(var j=MESSAGES.length-1;j>=0;j--) if(MESSAGES[j].acct===a.id) saved.unshift({m:MESSAGES[j],i:j});
    saved.slice().reverse().forEach(function(x){ MESSAGES.splice(x.i,1); });
    ACCOUNTS.splice(ai,1);
    var prevScope=state.scope; if(state.scope===a.id) state.scope=kindOf(a);
    state.selected=null; if(state.multi) state.multi=[]; refreshCls(); renderAll(); persist();
    var r={a:a,fait:false,annule:false}; retraits.push(r); RETIRES[a.id]=true;
    r.tm=setTimeout(function(){ if(!r.annule) retirerCoteSource(r); },6500);
    toast("Boîte "+a.email+" supprimée",{label:"Annuler",onAct:function(){
      r.annule=true; clearTimeout(r.tm); delete RETIRES[a.id];
      ACCOUNTS.splice(Math.min(ai,ACCOUNTS.length),0,a);
      saved.forEach(function(x){ MESSAGES.splice(Math.min(x.i,MESSAGES.length),0,x.m); });
      state.scope=prevScope; refreshCls(); renderAll(); persist(); toast("Boîte rétablie"); }});
  }
  function openRenameAcct(a){
    closeOverlay(); var ov=makeOverlay("acct");
    ov.innerHTML='<div class="sheet acct" role="dialog" aria-modal="true" aria-labelledby="rnTitle">'+
      sheetBar('<button class="btn" id="rnCancel" type="button" data-home="l" data-mac="foot" data-ord="1">Annuler</button>','<span class="t">Renommer la boîte</span>',
        '<button class="btn primary" id="rnGo" type="button" data-home="r" data-mac="foot" data-ord="2">Enregistrer</button>',"rnTitle")+
      '<div class="sheet-body"><div class="gwrap"><div class="ghead" aria-hidden="true">'+H(a.email)+'</div><div class="gcard"><div class="fld"><label for="rnName">Nom affiché</label><input id="rnName" type="text" value="'+H(a.name)+'" autocomplete="name"></div></div>'+
      '<p class="gfoot-s">'+I.info+'<span>Ce nom s’affiche dans la barre latérale et comme expéditeur de vos mails.</span></p></div></div>'+SHEET_FOOT+'</div>';
    placeSheetChrome();
    var inp=$("#rnName"); setTimeout(function(){ inp.focus(); inp.select(); },30);
    var save=function(){ var v=inp.value.trim(); if(!v){ inp.focus(); return; } if(a.signature===a.name) a.signature=v; a.name=v; closeOverlay(); renderAll(); persist(); toast("Boîte renommée"); };
    $("#rnGo").onclick=save; $("#rnCancel").onclick=closeOverlay;
    inp.addEventListener("keydown",function(e){ if(e.key==="Enter"){ e.preventDefault(); save(); } });
  }
  function ctxTarget(el){
    var r=el.closest&&el.closest("#sideBody .scope-row[data-scope]");
    if(r){ var sc=r.getAttribute("data-scope"); if(acctExists(sc)) return {type:"acct",id:sc,el:r}; return null; }
    var m=el.closest&&el.closest("#rows .msg[data-id]"); if(m) return {type:"msg",id:m.getAttribute("data-id"),el:m};
    return null;
  }
  function openCtx(t,x,y){ if(t.type==="acct") openAcctMenu(t.id,pointAnchor(x,y)); else { if(state.multi) return; openMsgMenu(t.id,pointAnchor(x,y)); } }
  sr.addEventListener("contextmenu",function(e){ var t=ctxTarget(e.target); if(!t) return; e.preventDefault(); openCtx(t,e.clientX,e.clientY); });
  // Appui long (iPhone / iPad) : 500 ms sans bouger, puis le clic qui suit est avalé.
  (function(){ var tm=null, sx=0, sy=0, fired=false;
    sr.addEventListener("touchstart",function(e){ var t=ctxTarget(e.target); if(!t||e.touches.length>1) return; fired=false; sx=e.touches[0].clientX; sy=e.touches[0].clientY;
      clearTimeout(tm); tm=setTimeout(function(){ fired=true; try{ navigator.vibrate&&navigator.vibrate(10); }catch(x){} openCtx(t,sx,sy); },500); },{passive:true});
    sr.addEventListener("touchmove",function(e){ if(!tm) return; var p=e.touches[0]; if(Math.abs(p.clientX-sx)>8||Math.abs(p.clientY-sy)>8){ clearTimeout(tm); tm=null; } },{passive:true});
    sr.addEventListener("touchend",function(){ clearTimeout(tm); tm=null; },{passive:true});
    sr.addEventListener("click",function(e){ if(fired){ fired=false; e.preventDefault(); e.stopPropagation(); } },true);
  })();

  // ---------- Signature électronique des documents (côté Pro) ----------
  // Le suivi (état, relances, contre-signature) est tenu ici ; la source doit annoncer capacites().signature pour l'allumer. Bientôt : prestataire certifié eIDAS, dossier de preuve, horodatage, code SMS.
  var SIGN_ST={pending:"En attente",viewed:"Ouvert",counter:"À contresigner",signed:"Signé",declined:"Refusé",cancelled:"Annulé",expired:"Expiré"};
  var SIGN_TYPES=["Devis","Contrat de maintenance","Contrat de prestation","Bon d’intervention","Autre document"];
  function signState(m){ var g=m.sign; if((g.st==="pending"||g.st==="viewed")&&Date.now()>g.expires) return "expired"; return g.st; }
  function signChip(m){ var st=signState(m); return '<span class="sgchip st-'+st+'">'+H(SIGN_ST[st])+'</span>'; }
  function fmtDay(t){ return new Date(t).toLocaleDateString("fr-FR",{day:"numeric",month:"long"}); }
  function signLog(m,x){ m.sign.events.push({t:Date.now(),x:x}); m.at=Date.now(); }
  function signPreview(m){ var g=m.sign, st=signState(m), done=g.signers.filter(function(x){return x.st==="signed";}).length;
    m.preview=done+"/"+g.signers.length+" signature"+(g.signers.length>1?"s":"")+(g.counter?" + vous":"")+" · "+g.type; }
  sur(sr,"click",function(e){ if(e.target.closest&&e.target.closest("#rows [data-signnew]")){ openSignRequest(); } });
  function signCardHtml(m){
    var g=m.sign, st=signState(m), live=st==="pending"||st==="viewed";
    var rows=g.signers.map(function(x){
      var s=x.st==="signed"?'<span class="ok">✓ Signé le '+H(fmtDay(x.at))+'</span>':x.st==="viewed"?'Ouvert, pas encore signé':st==="cancelled"?'—':'En attente';
      return '<li><span class="av" aria-hidden="true">'+H(initials(x.name||x.email))+'</span><span class="nm">'+H(x.name||x.email)+'<span>'+H(x.email)+(x.phone?' · '+H(x.phone):'')+'</span></span><span style="font-size:12px">'+s+'</span></li>'; }).join("");
    if(g.counter) rows+='<li><span class="av" aria-hidden="true">'+H(initials(acctOf(m.acct).name))+'</span><span class="nm">Vous (contre-signature)<span>'+H(acctOf(m.acct).email)+'</span></span><span style="font-size:12px">'+(g.me?'<span class="ok">✓ Signé le '+H(fmtDay(g.me))+'</span>':st==="counter"?'<b>À vous de signer</b>':'Après le client')+'</span></li>';
    var acts="";
    if(live) acts=(CAP.simulation?'<button type="button" class="btn" data-act="signSim">Simuler la signature du client (démo)</button>':'')+'<button type="button" class="btn" data-act="signRemind">Relancer</button><button type="button" class="btn danger" data-act="signCancel">Annuler la demande</button>';
    else if(st==="counter") acts='<button type="button" class="btn primary" data-act="signMe">Signer maintenant</button>';
    else if(st==="signed") acts='<button type="button" class="btn primary" data-act="signDl">Télécharger le PDF signé</button><button type="button" class="btn" data-act="signProof">Dossier de preuve</button>';
    else acts='<button type="button" class="btn primary" data-act="signResend">Renvoyer une demande</button>';
    return '<div class="sign-card" role="region" aria-label="Suivi de la signature">'+
      '<div class="sg-head">'+signChip(m)+'<span>'+H(g.type)+' · '+(g.level==="adv"?"signature avancée (code SMS)":"signature simple (code e-mail)")+'</span><span>'+(live?'Échéance le '+H(fmtDay(g.expires))+(g.remind?' · relances auto tous les 3 jours':''):'')+'</span></div>'+
      '<ul class="sg-signers">'+rows+'</ul><div class="sg-acts">'+acts+'</div>'+
      '<ol class="sg-tl" aria-label="Historique">'+g.events.map(function(ev){ return '<li>'+H(fmtFull(ev.t))+' — '+H(ev.x)+'</li>'; }).join("")+'</ol>'+
      '</div>';
  }
  function signAct(act,m){
    if(act==="signFrom"){ openSignRequest({acct:m.acct,title:m.subject.replace(/^\s*(re|tr|fwd?)\s*:\s*/i,""),att:m.att.filter(function(a){return a.kind!=="img";}),signers:m.from?[{name:m.from.name,email:m.from.email}]:[]}); return; }
    if(act==="signNew"){ openSignRequest(); return; }
    if(!m.sign) return;
    var g=m.sign;
    if(act==="signSim"){ if(!CAP.simulation) return; var x=g.signers.filter(function(s){return s.st!=="signed";})[0]; if(!x) return;
      if(x.st!=="viewed") signLog(m,"Document ouvert par "+(x.name||x.email));
      x.st="signed"; x.at=Date.now(); signLog(m,"Signé par "+(x.name||x.email)+(g.level==="adv"?" (code SMS vérifié)":" (code e-mail vérifié)"));
      if(g.signers.every(function(s){return s.st==="signed";})){ if(g.counter){ g.st="counter"; signLog(m,"En attente de votre contre-signature"); } else signDone(m); }
      else g.st="pending";
      signPreview(m); renderAll(); persist(); toast(g.st==="signed"?"Document signé par tous":g.st==="counter"?"Le client a signé — à vous de contresigner":"Signature reçue de "+(x.name||x.email)); }
    else if(act==="signRemind"){ signLog(m,"Relance envoyée à "+g.signers.filter(function(s){return s.st!=="signed";}).map(function(s){return s.name||s.email;}).join(", ")); signPreview(m); renderAll(); persist(); toast("Relance envoyée"); }
    else if(act==="signCancel"){ g.st="cancelled"; signLog(m,"Demande annulée — le lien de signature ne fonctionne plus"); signPreview(m); renderAll(); persist(); toast("Demande annulée"); }
    else if(act==="signMe") openSignPad(m);
    else if(act==="signResend") openSignRequest({acct:m.acct,title:m.subject,type:g.type,att:m.att.filter(function(a){return !a.signed;}),signers:g.signers.map(function(s){return {name:s.name,email:s.email,phone:s.phone};}),counter:g.counter,level:g.level});
    else if(act==="signDl") toast("Bientôt : le téléchargement du PDF signé");
    else if(act==="signProof") toast("Bientôt : le dossier de preuve (identité, horodatage, adresses IP et codes vérifiés)");
  }
  function signDone(m){
    var g=m.sign; g.st="signed"; signLog(m,"Document signé par toutes les parties — PDF scellé et horodaté");
    var base=(m.att[0]&&m.att[0].name||m.subject).replace(/\.pdf$/i,"");
    m.att.push({name:base+" — signé.pdf",size:"212 Ko",kind:"doc",signed:true},{name:"Dossier-de-preuve.pdf",size:"48 Ko",kind:"doc",signed:true});
    m.read=false;
    var n=mk({acct:m.acct,folder:"inbox",from:{name:"Signature électronique",email:"no-reply@signature.invalid"},to:acctOf(m.acct).name,subject:"Document signé : "+m.subject,read:false,
      body:["Bonne nouvelle : « "+m.subject+" » est signé par toutes les parties.","Signataires : "+g.signers.map(function(s){return s.name||s.email;}).join(", ")+(g.counter?" et vous":"")+".","Le PDF signé et le dossier de preuve sont joints, et rangés dans le dossier Signatures."],
      att:[m.att[m.att.length-2],m.att[m.att.length-1]]});
    n.preview=firstLine(n.body.join(" ")); n.user=true; n.at=Date.now(); MESSAGES.push(n);
  }
  function openSignPad(m){
    closeOverlay(); var ov=makeOverlay("acct");
    ov.innerHTML='<div class="sheet acct" role="dialog" aria-modal="true" aria-labelledby="spTitle">'+
      sheetBar('<button class="btn" id="spCancel" type="button" data-home="l" data-mac="foot" data-ord="1">Annuler</button>','<span class="t">Contresigner</span>',
        '<button class="btn primary" id="spGo" type="button" data-home="r" data-mac="foot" data-ord="2">Signer</button>',"spTitle")+
      '<div class="sheet-body"><div class="gwrap"><div class="ghead">'+H(m.subject)+'</div><div class="gcard">'+
        '<div class="sgfld"><span class="lb" id="spLbl">Votre signature (souris ou doigt)</span><canvas class="sg-pad" id="spPad" role="img" aria-labelledby="spLbl"></canvas>'+
          '<div class="sg-padline"><span>Signé électroniquement par '+H(acctOf(m.acct).name)+'</span><button type="button" class="lnk" id="spClear">Effacer</button></div></div>'+
        '<div class="sgfld"><label for="spCode">Code de vérification reçu par SMS</label><input id="spCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 chiffres"></div></div>'+
        '<p class="gfoot-s">'+I.info+'<span>'+(CAP.simulation?"Démo : tapez n’importe quel code à 6 chiffres.":"Entrez le code à 6 chiffres reçu par SMS.")+'</span></p></div></div>'+SHEET_FOOT+'</div>';
    placeSheetChrome();
    var cv=$("#spPad"), ctx=cv.getContext("2d"), drawn=0, down=false;
    var fit=function(){ var r=cv.getBoundingClientRect(), d=window.devicePixelRatio||1; cv.width=Math.max(1,r.width*d); cv.height=Math.max(1,r.height*d); ctx.scale(d,d); ctx.lineWidth=2.2; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.strokeStyle="#0b1633"; };
    setTimeout(fit,30);
    var pt=function(e){ var r=cv.getBoundingClientRect(); return [e.clientX-r.left,e.clientY-r.top]; };
    cv.addEventListener("pointerdown",function(e){ down=true; try{ cv.setPointerCapture(e.pointerId); }catch(x){} var p=pt(e); ctx.beginPath(); ctx.moveTo(p[0],p[1]); e.preventDefault(); });
    cv.addEventListener("pointermove",function(e){ if(!down) return; var p=pt(e); ctx.lineTo(p[0],p[1]); ctx.stroke(); drawn++; });
    cv.addEventListener("pointerup",function(){ down=false; });
    $("#spClear").onclick=function(){ ctx.clearRect(0,0,cv.width,cv.height); drawn=0; };
    $("#spCancel").onclick=closeOverlay;
    $("#spGo").onclick=function(){
      if(drawn<3){ toast("Dessinez votre signature"); return; }
      if(!/^\d{6}$/.test($("#spCode").value.trim())){ toast("Entrez le code à 6 chiffres"); $("#spCode").focus(); return; }
      var g=m.sign; g.me=Date.now(); signLog(m,"Contresigné par vous (code SMS vérifié)"); signDone(m); signPreview(m);
      closeOverlay(); renderAll(); persist(); toast("Document signé par tous");
    };
  }
  function openSignRequest(pre){
    if(!ACCOUNTS.length){ toast("Ajoutez d’abord une boîte mail"); return; }
    pre=pre||{};
    var pros=accountsOfKind("pro"); if(!pros.length){ toast("Ajoutez d’abord une boîte pro"); return; }
    var from=pre.acct&&acctExists(pre.acct)&&kindOf(acctOf(pre.acct))==="pro"?pre.acct:(acctExists(state.scope)&&kindOf(acctOf(state.scope))==="pro"?state.scope:pros[0].id);
    var docs=(pre.att||[]).slice(), signers=(pre.signers&&pre.signers.length?pre.signers:[{name:"",email:""}]).map(function(x){ return {name:x.name||"",email:x.email||"",phone:x.phone||""}; });
    var type=pre.type||(/devis/i.test(pre.title||"")?"Devis":/maintenance/i.test(pre.title||"")?"Contrat de maintenance":/contrat/i.test(pre.title||"")?"Contrat de prestation":"Devis");
    closeOverlay(); var ov=makeOverlay("acct");
    ov.innerHTML='<div class="sheet acct" role="dialog" aria-modal="true" aria-labelledby="sgTitle">'+
      sheetBar('<button class="btn" id="sgCancel" type="button" data-home="l" data-mac="foot" data-ord="1">Annuler</button>','<span class="t">Envoyer pour signature</span>',
        '<button class="btn primary" id="sgGo" type="button" data-home="r" data-mac="foot" data-ord="2">Envoyer</button>',"sgTitle")+
      '<div class="sheet-body"><div class="gwrap">'+
        '<div class="ghead">Document</div><div class="gcard">'+
          '<div class="sgfld"><label for="sgType">Type</label><select id="sgType">'+SIGN_TYPES.map(function(t){ return '<option'+(t===type?' selected':'')+'>'+H(t)+'</option>'; }).join("")+'</select></div>'+
          '<div class="sgfld"><label for="sgName">Titre</label><input id="sgName" type="text" value="'+H(pre.title||"")+'" placeholder="Ex. Contrat de maintenance 2027 — SARL Mercier"></div>'+
          '<div class="sgfld"><span class="lb">Fichier PDF</span><div class="sg-docs" id="sgDocs"></div></div></div>'+
        '<div class="ghead">Signataires</div><div class="gcard" id="sgSigners"></div>'+
        '<div class="gcard" style="margin-top:8px"><div class="strow"><button type="button" class="btn" id="sgAdd">+ Ajouter un signataire</button></div>'+
          '<label class="swrow" for="sgCounter"><span class="swl">Je contresigne après le client</span><input type="checkbox" class="switch" id="sgCounter" role="switch"'+(pre.counter!=null?(pre.counter?" checked":""):(type==="Devis"||type==="Bon d’intervention"?"":" checked"))+'></label></div>'+
        '<div class="ghead">Options</div><div class="gcard">'+
          '<div class="sgfld"><label for="sgFrom">Envoyé depuis</label><select id="sgFrom">'+pros.map(function(a){ return '<option value="'+a.id+'"'+(a.id===from?' selected':'')+'>'+H(a.name)+' · '+H(a.email)+'</option>'; }).join("")+'</select></div>'+
          '<div class="sgfld"><label for="sgLevel">Niveau de signature</label><select id="sgLevel"><option value="adv"'+(pre.level!=="simple"?' selected':'')+'>Avancée — code par SMS (recommandé pour les contrats)</option><option value="simple"'+(pre.level==="simple"?' selected':'')+'>Simple — code par e-mail (devis, bons d’intervention)</option></select></div>'+
          '<div class="sgfld"><label for="sgDays">À signer avant</label><select id="sgDays"><option value="7">7 jours</option><option value="15" selected>15 jours</option><option value="30">30 jours</option></select></div>'+
          '<label class="swrow" for="sgRemind"><span class="swl">Relances automatiques tous les 3 jours</span><input type="checkbox" class="switch" id="sgRemind" role="switch" checked></label>'+
          '<div class="sgfld"><label for="sgMsg">Message au signataire</label><textarea id="sgMsg"></textarea></div></div>'+
        '<p class="gfoot-s">'+I.info+'<span>Le signataire reçoit un lien, lit le document et signe sur téléphone ou ordinateur avec un code. Les zones de signature sont placées en dernière page du document.</span></p>'+
      '</div></div>'+SHEET_FOOT+'</div>';
    placeSheetChrome();
    var defMsg=function(){ var a=acctOf($("#sgFrom").value); return "Bonjour,\n\nVoici "+($("#sgType").value==="Devis"?"le devis":"le document")+" « "+($("#sgName").value.trim()||$("#sgType").value)+" » à signer électroniquement. Cliquez sur le lien reçu, vérifiez le document puis signez avec le code de vérification.\n\nCordialement,\n"+(a?a.name:""); };
    // Contre-signature : par défaut pour les contrats, pas pour un devis ou un bon d'intervention (tant que l'utilisateur n'a pas choisi).
    var ctTouched=pre.counter!=null; $("#sgCounter").addEventListener("change",function(){ ctTouched=true; });
    $("#sgType").addEventListener("change",function(){ if(!ctTouched){ var t=this.value; $("#sgCounter").checked=t!=="Devis"&&t!=="Bon d’intervention"; } });
    var msgTouched=false; $("#sgMsg").value=defMsg(); $("#sgMsg").addEventListener("input",function(){ msgTouched=true; });
    ["#sgType","#sgName","#sgFrom"].forEach(function(q){ $(q).addEventListener("input",function(){ if(!msgTouched) $("#sgMsg").value=defMsg(); }); $(q).addEventListener("change",function(){ if(!msgTouched) $("#sgMsg").value=defMsg(); }); });
    function paintDocs(){
      $("#sgDocs").innerHTML=docs.map(function(a,i){ return '<span class="att"><span class="ic" aria-hidden="true">'+I.doc+'</span><span style="min-width:0"><span class="fn" style="display:block">'+H(a.name)+'</span><span class="fs" style="display:block">'+H(a.size)+'</span></span><button type="button" class="att-x" data-drm="'+i+'" aria-label="Retirer '+H(a.name)+'">×</button></span>'; }).join("")+
        '<button type="button" class="btn att-btn" id="sgPick">'+I.attach+'<span>Choisir un PDF</span></button><button type="button" class="btn" id="sgTpl">Créer depuis un modèle OP</button><input type="file" id="sgFile" accept="application/pdf,.pdf" hidden>';
      $("#sgPick").onclick=function(){ $("#sgFile").click(); };
      $("#sgFile").onchange=function(){ Array.prototype.forEach.call(this.files,function(f){ if(!/\.pdf$/i.test(f.name)&&f.type!=="application/pdf"){ toast("Seuls les PDF peuvent être signés"); return; }
        docs.push({name:f.name,size:f.size>=1048576?(f.size/1048576).toFixed(1).replace(".",",")+" Mo":Math.max(1,Math.round(f.size/1024))+" Ko",kind:"doc"}); });
        if(!$("#sgName").value.trim()&&docs.length) $("#sgName").value=docs[0].name.replace(/\.pdf$/i,"").replace(/[-_]+/g," ");
        paintDocs(); };
      $("#sgTpl").onclick=function(){ readSigners(); var t=$("#sgType").value, who=(signers[0]&&(signers[0].name||signers[0].email.split("@")[0]))||"client";
        docs.push({name:(t.replace(/’/g,"").replace(/\s+/g,"-"))+"-"+who.replace(/[^\p{L}\p{N}]+/gu,"-")+".pdf",size:"124 Ko",kind:"doc"});
        if(!$("#sgName").value.trim()) $("#sgName").value=t+" — "+who; if(!msgTouched) $("#sgMsg").value=defMsg(); paintDocs(); toast("Modèle « "+t+" » ajouté"); };
    }
    $("#sgDocs").addEventListener("click",function(e){ var b=e.target.closest("[data-drm]"); if(!b) return; docs.splice(+b.getAttribute("data-drm"),1); paintDocs(); });
    function readSigners(){ $$("#sgSigners .sg-row").forEach(function(r,i){ signers[i]={name:$("[data-f=name]",r).value.trim(),email:$("[data-f=email]",r).value.trim(),phone:$("[data-f=phone]",r).value.trim()}; }); }
    function paintSigners(){
      $("#sgSigners").innerHTML=signers.map(function(x,i){ return '<div class="sg-row"><div class="full"><span>Signataire '+(i+1)+'</span>'+(signers.length>1?'<button type="button" class="lnk" data-srm="'+i+'">Retirer</button>':'')+'</div>'+
        '<div class="sgfld" style="padding:0"><label for="sgN'+i+'">Nom</label><input id="sgN'+i+'" data-f="name" type="text" autocomplete="name" value="'+H(x.name)+'" placeholder="Claire Dubois"></div>'+
        '<div class="sgfld" style="padding:0;border:0"><label for="sgE'+i+'">E-mail</label><input id="sgE'+i+'" data-f="email" type="email" inputmode="email" value="'+H(x.email)+'" placeholder="client@exemple.fr"></div>'+
        '<div class="sgfld" style="padding:0;border:0;grid-column:1/-1"><label for="sgP'+i+'">Mobile (code SMS)</label><input id="sgP'+i+'" data-f="phone" type="tel" inputmode="tel" autocomplete="tel" value="'+H(x.phone)+'" placeholder="06 12 34 56 78"></div></div>'; }).join("");
    }
    $("#sgSigners").addEventListener("click",function(e){ var b=e.target.closest("[data-srm]"); if(!b) return; readSigners(); signers.splice(+b.getAttribute("data-srm"),1); paintSigners(); });
    $("#sgAdd").onclick=function(){ readSigners(); signers.push({name:"",email:"",phone:""}); paintSigners(); var l=$$("#sgSigners [data-f=name]"); l[l.length-1].focus(); };
    paintDocs(); paintSigners();
    $("#sgCancel").onclick=closeOverlay;
    $("#sgGo").onclick=function(){
      readSigners();
      var title=$("#sgName").value.trim(), level=$("#sgLevel").value, bad=null;
      if(!docs.length){ toast("Ajoutez le PDF à signer"); $("#sgPick").focus(); return; }
      if(!title){ toast("Donnez un titre au document"); $("#sgName").focus(); return; }
      signers.forEach(function(x,i){ if(bad) return; if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)) bad=["#sgE"+i,"Adresse e-mail du signataire "+(i+1)+" invalide"];
        else if(level==="adv"&&!/^\+?[\d\s.-]{9,}$/.test(x.phone)) bad=["#sgP"+i,"Mobile du signataire "+(i+1)+" nécessaire pour le code SMS"]; });
      if(bad){ toast(bad[1]); $(bad[0]).focus(); return; }
      if(!CAP.signature){ toast("Bientôt : l’envoi du document à signer (Yousign). Votre demande est prête — rien n’est parti."); return; }
      var a=$("#sgFrom").value, now=Date.now(), body=$("#sgMsg").value;
      var m=mk({acct:a,folder:"sign",from:null,to:signers.map(function(x){return x.email;}).join(", "),subject:title,body:splitBody(body),read:true,att:docs.map(function(d){ return {name:d.name,size:d.size,kind:"doc"}; })});
      m.user=true; m.at=now;
      m.sign={type:$("#sgType").value,level:level,counter:$("#sgCounter").checked,remind:$("#sgRemind").checked,expires:now+(+$("#sgDays").value)*DAY,st:"pending",
        signers:signers.map(function(x){ return {name:x.name,email:x.email,phone:x.phone,st:"pending"}; }),events:[{t:now,x:"Envoyé à "+signers.map(function(x){return x.name||x.email;}).join(", ")}]};
      signPreview(m); MESSAGES.push(m); learnContacts(m);
      closeOverlay(); if(app.classList.contains("nav-open")) closeDrawer();
      state.folder="sign"; renderAll(); selectMessage(m.id); persist(); toast("Demande de signature envoyée");
      if(CAP.simulation) setTimeout(function(){ var x=m.sign&&m.sign.signers[0]; if(!x||x.st!=="pending"||m.sign.st!=="pending"||!msgById(m.id)) return; x.st="viewed"; m.sign.st="viewed"; signLog(m,"Document ouvert par "+(x.name||x.email)); signPreview(m); renderAll(); persist(); },8000);
    };
    setTimeout(function(){ (docs.length?$("#sgN0"):$("#sgName")).focus(); },30);
  }

  // ---------- Réglages ----------
  function openSettings(){
    closeOverlay(); var ov=makeOverlay("acct");
    var sigs=["pro","perso"].map(function(k){ return accountsOfKind(k).map(function(a){
      return '<div class="sigrow"><label for="sig_'+a.id+'">'+H(a.email)+' '+kindBadge(k)+'</label><textarea class="sigta" id="sig_'+a.id+'" data-sig="'+a.id+'" rows="2" placeholder="Pas de signature">'+H(a.signature||"")+'</textarea></div>'; }).join(""); }).join("");
    var canSys="Notification" in window;
    ov.innerHTML='<div class="sheet acct" role="dialog" aria-modal="true" aria-labelledby="stTitle">'+
      sheetBar('','<span class="t">Réglages</span>','<button class="btn primary" id="stDone" type="button" data-home="r" data-mac="foot" data-ord="2">OK</button>',"stTitle")+
      '<div class="sheet-body"><div class="gwrap">'+
        '<div class="ghead">Notifications</div><div class="gcard">'+
          '<label class="swrow" for="stNotif"><span class="swl">Me prévenir des nouveaux mails</span><input type="checkbox" class="switch" id="stNotif" role="switch"'+(SETTINGS.notif?" checked":"")+'></label>'+
          (CAP.simulation?'<div class="strow"><button type="button" class="btn" id="stTest">Recevoir un mail d’exemple</button></div>':'')+'</div>'+
        '<p class="gfoot-s">'+I.info+'<span>Une alerte s’affiche dans OP Courrier'+(canSys?' et, si vous l’autorisez, une notification de l’ordinateur ou du téléphone quand l’app est en arrière-plan':'')+'. Les indésirables ne sont jamais notifiés.</span></p>'+
        '<div class="ghead">Lecture</div><div class="gcard">'+
          '<label class="swrow" for="stThreads"><span class="swl">Regrouper les conversations</span><input type="checkbox" class="switch" id="stThreads" role="switch"'+(SETTINGS.threads?" checked":"")+'></label></div>'+
        '<p class="gfoot-s">'+I.info+'<span>Les réponses d’un même échange s’affichent sous le message ouvert, et la liste indique leur nombre.</span></p>'+
        (sigs?'<div class="ghead">Signatures</div><div class="gcard">'+sigs+'</div>'+
        '<p class="gfoot-s">'+I.info+'<span>Ajoutée automatiquement aux nouveaux messages, réponses et transferts envoyés depuis cette boîte.</span></p>':'')+
      '</div></div>'+SHEET_FOOT+'</div>';
    placeSheetChrome();
    var save=function(){ $$("[data-sig]",ov).forEach(function(t){ var a=acctOf(t.getAttribute("data-sig")); if(a&&a.id===t.getAttribute("data-sig")) a.signature=t.value.replace(/\s+$/,""); }); persist(); };
    ov.addEventListener("input",function(e){ if(e.target.hasAttribute("data-sig")) save(); });
    $("#stNotif").onchange=function(){ SETTINGS.notif=this.checked; persist();
      if(this.checked&&canSys&&Notification.permission==="default"){ try{ var r=Notification.requestPermission(); if(r&&r.catch) r.catch(function(){}); }catch(e){} } };
    $("#stThreads").onchange=function(){ SETTINGS.threads=this.checked; persist(); renderList(); renderReading(); };
    if($("#stTest")) $("#stTest").onclick=function(){ save(); closeOverlay(); recevoirExemple(); };
    $("#stDone").onclick=function(){ save(); closeOverlay(); toast("Réglages enregistrés"); };
    setTimeout(function(){ $("#stDone").focus(); },30);
  }

  // ---------- Arrivée de nouveaux mails : relevés par charger(), annoncés ici ----------
  // La source rend les nouveaux messages au relevé suivant (toutes les `intervalle` ms, et au retour sur la page).
  function notifierArrivee(neufs){
    var m=neufs[0];
    var open=function(){ if(!msgById(m.id)) return; closeOverlay(); if(app.classList.contains("nav-open")) closeDrawer(); if(!inScope(m)) state.scope=m.acct; state.folder="inbox"; renderAll(); selectMessage(m.id); };
    toast(neufs.length>1?neufs.length+" nouveaux messages — dont celui de "+senderName(m):"Nouveau message de "+senderName(m)+" — "+m.subject,{label:"Ouvrir",onAct:open});
    if(document.hidden&&"Notification" in window&&Notification.permission==="granted"){
      try{ var n=new Notification(senderName(m),{body:m.subject+"\n"+m.preview,tag:m.id}); n.onclick=function(){ try{ window.focus(); }catch(e){} open(); n.close(); }; }catch(e){} }
  }
  // Source de démonstration seulement (capacites().simulation) : lui demande de faire « arriver » un mail, puis relève.
  function recevoirExemple(){
    if(!CAP.simulation||typeof SRC.simuler!=="function") return;
    var a=acctExists(state.scope)?acctOf(state.scope):accountsOfKind(coteCourant())[0]||ACCOUNTS[0];
    if(!a){ toast("Ajoutez d’abord une boîte mail"); return; }
    Promise.resolve().then(function(){ return SRC.simuler("recevoir",{boite:a.sid}); }).then(function(){ return charger(false); },
      function(e){ toast("Impossible : "+msgErr(e)); });
  }

  // ---------- Composer ----------
  function openCompose(model){
    if(!ACCOUNTS.length){ toast("Ajoutez d’abord une boîte mail"); return; }
    closeOverlay();
    model=model||{to:"",subject:"",body:""};
    var fromAcct = model.acct&&acctExists(model.acct) ? model.acct : defaultFrom();
    // « De » : comptes rangés sous Pro / Perso
    var fromOpts=["pro","perso"].map(function(k){ var l=accountsOfKind(k); return l.length?'<optgroup label="'+KINDS[k]+'">'+l.map(function(a){
      return '<option value="'+a.id+'"'+(a.id===fromAcct?" selected":"")+'>'+H(a.name)+' · '+H(a.email)+'</option>'; }).join("")+'</optgroup>':''; }).join("");
    // Signature de la boîte d'envoi (nouveau message, réponse, transfert ; pas en reprenant un brouillon)
    var isNew=!model.draftId, sigOf=function(id){ var a=acctOf(id); return a&&a.signature&&a.signature.trim()?"\n\n-- \n"+a.signature.trim():""; };
    var curSig=isNew?sigOf(fromAcct):"", body0=curSig+(model.body||"");
    var ov=makeOverlay("compose");
    var title=model.scheduled?"Message programmé":model.draftId?"Brouillon":"Nouveau message";
    ov.innerHTML='<div class="sheet compose" id="cSheet" role="dialog" aria-modal="true" aria-labelledby="cTitle">'+
      sheetBar('<button class="btn back-btn" id="cSchedBack" type="button" data-home="l" data-ord="0" aria-label="Retour au message"><span class="ic" aria-hidden="true">'+I.chevL+'</span><span class="lbl" aria-hidden="true">Message</span></button>'+
          '<button class="btn" id="cCancel" type="button" data-home="l" data-mac="cf" data-ord="1">Annuler</button>',
        '<span class="t t-main">'+title+'</span><span class="t t-sched">Programmer l’envoi</span>',
        '<button class="btn sched-btn" id="cSched" type="button" data-home="r" data-mac="l" data-ord="3" data-ordm="4" aria-expanded="false" aria-controls="cSchedWrap" aria-label="Programmer l’envoi" title="Programmer l’envoi">'+I.clock+'<span class="lbl">Programmer</span></button>'+
        '<button class="btn primary send-btn" id="cSend" type="button" data-home="r" data-mac="l" data-ord="4" data-ordm="3" aria-label="Envoyer" title="Envoyer"><span class="ic-plane">'+I.sent+'</span><span class="lbl">Envoyer</span>'+I.sendUp+'</button>',"cTitle")+
      '<div class="sheet-body compose-body">'+
        '<div class="fld"><label for="cTo">À&nbsp;:</label><input id="cTo" type="email" inputmode="email" autocomplete="off" value="'+H(model.to)+'" placeholder="destinataire@exemple.fr"></div>'+
        '<div class="fld"><label for="cFrom">De&nbsp;:</label><select id="cFrom">'+fromOpts+'</select></div>'+
        '<div class="fld"><label for="cSub">Objet&nbsp;:</label><input id="cSub" type="text" value="'+H(model.subject)+'" placeholder="Objet"></div>'+
        '<textarea class="cbody" id="cBody" aria-label="Message" placeholder="Écrivez votre message…">'+H(body0)+'</textarea>'+
        '<div class="catt-row"><button class="btn att-btn" id="cAttBtn" type="button">'+I.attach+'<span>Joindre un fichier</span></button><button class="btn att-btn" id="cSignBtn" type="button">'+I.sign+'<span>Faire signer</span></button><input type="file" id="cFile" multiple hidden>'+
          '<div class="catt" id="cAtt" role="list" aria-label="Pièces jointes" style="display:contents"></div></div>'+
        '<div class="cfoot"><span class="cnote"><span class="csaved" id="cSaved" role="status"></span></span>'+
          '<span class="cf-btns" data-slot="cf"><button class="btn" id="cDraft" type="button" data-home="cf" data-ord="2">Enregistrer le brouillon</button></span></div>'+
      '</div>'+
      '<div class="sched-pop" id="cSchedWrap" role="region" aria-label="Programmer l’envoi" hidden>'+schedPanel("cSchedPanel")+'</div>'+
    '</div>';
    placeSheetChrome();
    state.compose={draftId:model.draftId||null,scheduled:!!model.scheduled,noTrust:model.noTrust||null,att:(model.att||[]).slice()};
    var toEl=$("#cTo"); (model.to?$("#cBody"):toEl).focus();
    if(body0){ try{$("#cBody").setSelectionRange(0,0);}catch(e){} $("#cBody").scrollTop=0; }
    function fields(){ return {acct:$("#cFrom").value,to:$("#cTo").value.trim(),subject:$("#cSub").value.trim()||"(Sans objet)",body:$("#cBody").value,att:state.compose.att.slice(),draftId:state.compose.draftId,noTrust:state.compose.noTrust}; }
    function snap(){ return [$("#cFrom").value,$("#cTo").value,$("#cSub").value,$("#cBody").value,state.compose.att.map(function(a){return a.name;}).join("|")].join("\u0000"); }
    var initial=snap();
    function changed(){ return snap()!==initial; }
    var sheet=$("#cSheet");
    // Pièces jointes : bouton ou glisser-déposer ; 25 Mo au total, comme Gmail et Outlook.
    var MAXB=CAP.pj.octets;
    function fmtSize(b){ return b>=1048576?(b/1048576).toFixed(1).replace(".",",")+" Mo":Math.max(1,Math.round(b/1024))+" Ko"; }
    function paintAtt(){ $("#cAtt").innerHTML=state.compose.att.map(function(a,i){
      return '<span class="att" role="listitem"><span class="ic" aria-hidden="true">'+(a.kind==="img"?I.img:I.doc)+'</span><span style="min-width:0"><span class="fn" style="display:block">'+H(a.name)+'</span><span class="fs" style="display:block">'+H(a.size)+'</span></span>'+
        '<button type="button" class="att-x" data-rm="'+i+'" aria-label="Retirer '+H(a.name)+'" title="Retirer">×</button></span>'; }).join(""); }
    function addFiles(list){ var c=state.compose; if(!c) return; var tot=c.att.reduce(function(s,a){ return s+(a.bytes||0); },0), added=0, refused=0;
      Array.prototype.forEach.call(list||[],function(f){ if(tot+f.size>MAXB){ refused++; return; } tot+=f.size; added++;
        c.att.push({name:f.name,size:fmtSize(f.size),bytes:f.size,kind:/^image\//.test(f.type)?"img":"doc",file:f}); });
      paintAtt(); if(added) queueSave();
      if(refused) toast(plural(refused,"fichier refusé","fichiers refusés")+" : "+fmtSize(MAXB)+" maximum par message"); }
    paintAtt();
    $("#cAttBtn").onclick=function(){ $("#cFile").click(); };
    // « Faire signer » (boîtes pro) : le message devient une demande de signature (destinataires = signataires, PDF joints = documents).
    var paintSignBtn=function(){ $("#cSignBtn").hidden=kindOf(acctOf($("#cFrom").value))!=="pro"; }; paintSignBtn();
    $("#cFrom").addEventListener("change",paintSignBtn);
    $("#cSignBtn").onclick=function(){ var d=fields(), c=state.compose, sub=$("#cSub").value.trim(); clearTimeout(saveT);
      var ex=c.autoNew?liveDraft(c.draftId):null; if(ex) removeMsg(ex.id);
      closeCompose(); renderAll(); persist();
      openSignRequest({acct:d.acct,title:sub,att:d.att.filter(function(a){return a.kind!=="img";}),
        signers:emailsIn(d.to).map(function(e){ return {name:"",email:e}; })}); };
    $("#cFile").onchange=function(){ addFiles(this.files); this.value=""; };
    $("#cAtt").addEventListener("click",function(e){ var b=e.target.closest("[data-rm]"); if(!b) return; var i=+b.getAttribute("data-rm"), n=state.compose.att[i];
      state.compose.att.splice(i,1); paintAtt(); queueSave(); toast(n.name+" retiré"); $("#cAttBtn").focus(); });
    sheet.addEventListener("dragover",function(e){ if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types||[],"Files")>=0){ e.preventDefault(); sheet.classList.add("drop"); } });
    sheet.addEventListener("dragleave",function(e){ if(e.target===sheet) sheet.classList.remove("drop"); });
    sheet.addEventListener("drop",function(e){ sheet.classList.remove("drop"); if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length){ e.preventDefault(); addFiles(e.dataTransfer.files); } });
    // Changer de boîte d'envoi change la signature.
    $("#cFrom").addEventListener("change",function(){ var ns=isNew?sigOf(this.value):"", b=$("#cBody").value;
      if(curSig&&b.indexOf(curSig)>=0) b=b.replace(curSig,ns); else if(ns){ var q=b.indexOf("\n\n\nLe "); b=q<0?b+ns:b.slice(0,q)+ns+b.slice(q); }
      curSig=ns; $("#cBody").value=b; queueSave(); });
    // Brouillon enregistré automatiquement 1,5 s après la dernière frappe (pas pour un message programmé : il garde sa version jusqu'à la fermeture).
    var saveT=null;
    function queueSave(){ clearTimeout(saveT); saveT=setTimeout(autosave,1500); }
    function hasContent(d){ return !!(d.to||$("#cSub").value.trim()||d.body.replace(curSig,"").trim()||d.att.length); }
    function autosave(){
      var c=state.compose; if(!c||c.scheduled||!sheet.isConnected||!changed()) return;
      var d=fields(); if(!hasContent(d)) return;
      var ex=liveDraft(c.draftId); if(ex&&ex.folder!=="drafts") return;
      if(!ex){ ex=mk({acct:d.acct,folder:"drafts",from:null}); MESSAGES.push(ex); c.draftId=ex.id; c.autoNew=true; }
      fillMsg(ex,d); renderAll(); persist();
      var s=$("#cSaved"); if(s) s.textContent="· Brouillon enregistré à "+hhmm(new Date());
    }
    sheet.addEventListener("input",function(e){ if(e.target.id==="cTo"||e.target.id==="cSub"||e.target.id==="cBody") queueSave(); });
    function dropAuto(ex){ removeMsg(ex.id); if(state.selected===ex.id) state.selected=null; renderAll(); persist(); toast("Brouillon supprimé"); }
    // iPhone : « Annuler » propose Supprimer / Enregistrer le brouillon dans une feuille d'actions, comme Mail.
    // Mac : rien n'est perdu — le brouillon est gardé, avec « Supprimer » dans l'alerte.
    $("#cCancel").onclick=function(){
      if(isPhone()&&changed()){ openDiscardSheet(); return; }
      var c=state.compose; clearTimeout(saveT);
      if(changed()&&!c.scheduled&&hasContent(fields())) autosave();
      var ex=c.autoNew?liveDraft(c.draftId):null, edited=!c.autoNew&&changed();
      closeCompose();
      if(ex) toast("Brouillon enregistré",{label:"Supprimer",onAct:function(){ dropAuto(ex); }});
      else if(edited) toast("Modifications non enregistrées");
    };
    // Fermeture implicite (Échap, fond voilé) : rien de saisi n'est perdu. Sans modification → simple fermeture ;
    // sinon brouillon enregistré (iPhone, toucher au-dessus de la feuille → Supprimer / Enregistrer, comme Mail).
    function dismiss(fromBackdrop){
      if(!changed()){ closeCompose(); return; }
      if(fromBackdrop&&isPhone()){ openDiscardSheet(); return; }
      saveDraft(true);
    }
    ov.onBackdrop=function(){ if(!$("#cDiscard")) dismiss(true); };
    state.compose.dismiss=function(){ dismiss(false); };
    $("#cSend").onclick=function(){
      var d=fields();
      if(!d.to){ $("#cTo").focus(); toast("Ajoutez un destinataire"); return; }
      var dest=emailsIn(d.to);
      if(!dest.length){ $("#cTo").focus(); toast("Adresse du destinataire invalide"); return; }
      if(dest.length>CAP.destinataires){ toast(CAP.destinataires===1?"Bientôt : plusieurs destinataires. Un seul pour l’instant.":"Au plus "+CAP.destinataires+" destinataires pour l’instant."); return; }
      if(d.att.length>CAP.pj.nombre){ toast(CAP.pj.nombre===1?"Une seule pièce jointe pour l’instant.":"Au plus "+CAP.pj.nombre+" pièces jointes pour l’instant."); return; }
      var sans=d.att.filter(function(a){ return !a.file; });
      if(sans.length){ toast("« "+sans[0].name+" » doit être joint de nouveau : les fichiers ne sont pas gardés dans un brouillon."); return; }
      closeCompose(); sendWithUndo(d);
    };
    var wrap=$("#cSchedWrap"), schedBtn=$("#cSched");
    function setSched(open){
      if(open) refreshSched($("#cSchedPanel"));
      wrap.hidden=!open; schedBtn.setAttribute("aria-expanded",String(open)); sheet.classList.toggle("sched-open",open);
      if(open){
        if(layout()==="mac"){ var b=schedBtn.getBoundingClientRect(), r=sheet.getBoundingClientRect();
          wrap.style.setProperty("--arrow-x",Math.max(12,Math.round(b.left+b.width/2-r.left-10-6))+"px"); }
        var f=wrap.querySelector(".sp"); if(f) f.focus({preventScroll:true});
      }
    }
    schedBtn.onclick=function(){ setSched(wrap.hidden); };
    $("#cSchedBack").onclick=function(){ setSched(false); schedBtn.focus(); };
    sheet.addEventListener("click",function(e){
      if(wrap.hidden||layout()!=="mac"||!sheet.isConnected) return;
      if(!e.target.closest("#cSchedWrap")&&!e.target.closest("#cSched")) setSched(false);
    });
    sheet.addEventListener("keydown",function(e){ if(e.key==="Escape"&&!wrap.hidden){ e.stopPropagation(); setSched(false); schedBtn.focus(); } });
    bindSched($("#cSchedPanel"),function(t){
      var d=fields();
      if(!d.to){ setSched(false); $("#cTo").focus(); toast("Ajoutez un destinataire avant de programmer"); return; }
      closeCompose(); scheduleMessage(d,t);
    });
    // keepSchedule : fermeture implicite d'un message programmé modifié → les modifications sont gardées, l'heure aussi.
    function saveDraft(keepSchedule){
      var d=fields(), sub=$("#cSub").value.trim();
      if(!d.to&&!sub&&!d.body.trim()){ closeCompose(); return; }
      // Message déjà parti entre-temps ? On n'y touche pas : la saisie devient un nouveau brouillon.
      var ex=liveDraft(state.compose.draftId), msg="Brouillon enregistré";
      if(!ex){ ex=mk({acct:d.acct,folder:"drafts",from:null}); MESSAGES.push(ex); }
      fillMsg(ex,d);
      if(keepSchedule===true&&ex.folder==="scheduled") msg="Modifications enregistrées — envoi toujours programmé "+fmtSched(ex.sendAt);
      else { ex.folder="drafts"; delete ex.sendAt; }
      closeCompose(); renderAll(); persist(); toast(msg);
    }
    $("#cDraft").onclick=function(){ saveDraft(false); };
    function openDiscardSheet(){
      clearTimeout(saveT);
      var c=state.compose, editSched=c.scheduled, existing=c.draftId&&!editSched?msgById(c.draftId):null;
      var ns=document.createElement("div"); ns.className="ov-asheet nested"; ns.id="cDiscard";
      ns.innerHTML='<div class="asheet" role="menu" aria-label="Fermer le message"><div class="ag">'+
        '<button type="button" class="mitem dng" role="menuitem" data-dpick="discard"><span class="mlbl">'+(editSched?"Ignorer les modifications":"Supprimer le brouillon")+'</span></button>'+
        '<button type="button" class="mitem" role="menuitem" data-dpick="save"><span class="mlbl">Enregistrer le brouillon</span></button></div>'+
        '<div class="ag"><button type="button" class="mitem cancel" role="menuitem" data-dpick="cancel">Annuler</button></div></div>';
      ov.appendChild(ns); sheet.inert=true;
      var back=function(){ ns.remove(); sheet.inert=false; $("#cCancel").focus({preventScroll:true}); };
      ns.addEventListener("click",function(e){
        var b=e.target.closest("[data-dpick]"); if(!b){ if(e.target===ns) back(); return; }
        var k=b.getAttribute("data-dpick");
        if(k==="cancel") back();
        else if(k==="save"){ sheet.inert=false; saveDraft(false); }
        else { var auto=c.autoNew; closeCompose(); if(existing){ if(auto) dropAuto(existing); else moveTo(existing,"trash","Brouillon supprimé"); } }
      });
      ns.addEventListener("keydown",function(e){
        if(e.key==="Escape"){ e.stopPropagation(); back(); return; }
        if(e.key!=="ArrowDown"&&e.key!=="ArrowUp") return; e.preventDefault();
        var its=$$(".mitem",ns), i=its.indexOf(actif()); its[(i+(e.key==="ArrowDown"?1:-1)+its.length)%its.length].focus();
      });
      $(".mitem",ns).focus();
    }
  }
  function splitBody(b){ return b.split(/\n{2,}/).filter(function(x){return x.trim();}); }

  // ---------- Envoi programmé ----------
  function toLocalInput(d){ var p=function(n){return (n<10?"0":"")+n;};
    return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes()); }
  function presets(){
    var now=new Date(), out=[];
    out.push({label:"Dans 1 minute",sub:"pour tester",t:now.getTime()+MIN});
    out.push({label:"Dans 1 heure",t:now.getTime()+HR});
    var ev=new Date(now); ev.setHours(18,0,0,0); if(ev-now>30*MIN) out.push({label:"Ce soir",t:ev.getTime()});
    var tm=new Date(now); tm.setDate(tm.getDate()+1); tm.setHours(8,0,0,0); out.push({label:"Demain matin",t:tm.getTime()});
    var ta=new Date(now); ta.setDate(ta.getDate()+1); ta.setHours(14,0,0,0); out.push({label:"Demain après-midi",t:ta.getTime()});
    var mo=new Date(now); mo.setDate(mo.getDate()+((8-mo.getDay())%7||7)); mo.setHours(8,0,0,0);
    if(mo.getTime()!==tm.getTime()) out.push({label:"Lundi matin",t:mo.getTime()});
    return out;
  }
  function schedPanel(id){
    var tz=""; try{ tz=Intl.DateTimeFormat().resolvedOptions().timeZone||""; }catch(e){}
    var def=new Date(); def.setDate(def.getDate()+1); def.setHours(9,0,0,0);
    var dv=toLocalInput(def).split("T"), today=toLocalInput(new Date()).split("T")[0];
    return '<div class="sched" id="'+id+'">'+
      '<div class="sched-head"><b>Programmer l’envoi</b>'+(tz?'<span>Fuseau : '+H(tz)+'</span>':'')+'</div>'+
      '<div class="gcard sched-list">'+presetsHtml()+'</div>'+
      (tz?'<p class="sched-tz">Fuseau horaire : '+H(tz)+'</p>':'')+
      '<div class="ghead" aria-hidden="true">Autre date</div>'+
      '<div class="gcard"><div class="fld sched-custom"><label for="'+id+'Date">Date</label>'+
        '<input type="date" id="'+id+'Date" lang="fr" value="'+dv[0]+'" min="'+today+'">'+
        '<input type="time" id="'+id+'Time" lang="fr" value="'+dv[1]+'" aria-label="Heure"></div></div>'+
      '<div class="sched-go"><button type="button" class="btn primary" data-custom="1">Programmer</button></div>'+
      (CAP.programmeServeur?'':'<div class="sched-note">'+I.info+'<span>Bientôt : l’envoi à l’heure dite, même application fermée. En attendant, le message part à l’heure choisie tant que cette page reste ouverte.</span></div>')+
      '</div>';
  }
  function presetsHtml(){ return presets().map(function(p){
    return '<button type="button" class="sp" data-t="'+p.t+'"><span class="sp-l"><b>'+H(p.label)+'</b>'+(p.sub?' <i>'+H(p.sub)+'</i>':'')+'</span><span class="when">'+H(cap(fmtSched(p.t)))+'</span></button>';
  }).join(""); }
  // Les préréglages sont relatifs à « maintenant » : on les recalcule à chaque ouverture du panneau.
  function refreshSched(panel){ var l=panel&&panel.querySelector(".sched-list"); if(!l) return;
    l.innerHTML=presetsHtml(); var d=panel.querySelector('input[type="date"]'); if(d) d.min=toLocalInput(new Date()).split("T")[0]; }
  function bindSched(panel,onPick){
    panel.addEventListener("click",function(e){
      var b=e.target.closest("[data-t]");
      if(b){ var t=+b.getAttribute("data-t");
        // Panneau resté ouvert trop longtemps : l'heure affichée est passée → on ne l'envoie pas tout de suite, on met la liste à jour.
        if(!(t>Date.now()+30000)){ refreshSched(panel); var f=panel.querySelector(".sp"); if(f) f.focus({preventScroll:true}); toast("Cette heure est passée — choix mis à jour"); return; }
        onPick(t); return; }
      if(e.target.closest("[data-custom]")){
        var dv=panel.querySelector('input[type="date"]').value, tv=panel.querySelector('input[type="time"]').value||"09:00";
        var t=dv?new Date(dv+"T"+tv).getTime():NaN;
        if(!(t>Date.now()+30000)){ toast("Choisissez une date et une heure à venir"); return; }
        onPick(t);
      }
    });
  }
  function scheduleMessage(d,when){
    var ex=liveDraft(d.draftId);
    if(!ex){ ex=mk({acct:d.acct,folder:"scheduled",from:null}); MESSAGES.push(ex); }
    fillMsg(ex,d); ex.folder="scheduled"; ex.sendAt=when;
    renderAll(); persist(); toast("Envoi programmé "+fmtSched(when));
  }
  // Message dont une feuille est ouverte (modification ou « Changer l'heure ») : son envoi automatique attend la fermeture.
  var rsOpenId=null;
  function held(id){ return (!!state.compose&&state.compose.draftId===id)||rsOpenId===id; }
  function openReschedule(m){
    closeOverlay();
    var ov=makeOverlay("rs"); rsOpenId=m.id;
    ov.innerHTML='<div class="sheet rs" role="dialog" aria-modal="true" aria-labelledby="rsTitle">'+
      sheetBar('<button class="btn" id="rsClose" type="button" data-home="l" data-mac="foot">Fermer</button>','<span class="t">Changer l’heure d’envoi</span>','',"rsTitle")+
      '<div class="sheet-body">'+schedPanel("rsPanel")+'</div>'+SHEET_FOOT+'</div>';
    placeSheetChrome();
    $("#rsClose").onclick=closeOverlay;
    var f=$("#rsPanel .sp"); if(f) f.focus({preventScroll:true});
    bindSched($("#rsPanel"),function(t){
      if(m.folder!=="scheduled"){ closeOverlay(); toast("Ce message n’est plus programmé"); return; }
      m.sendAt=t; m.user=true; closeOverlay(); renderAll(); persist(); toast("Nouvel envoi "+fmtSched(t)); });
  }
  // Messages programmés arrivés à échéance : envoyés par la source (seulement si elle annonce capacites().programmeServeur).
  // Sans service d'envoi côté source, l'envoi à l'heure dite ne tient que page ouverte : un message dont l'heure est passée DEPUIS LONGTEMPS (page fermée entre-temps)
  // ne part PAS tout seul — un courrier envoyé avec des heures de retard est pire qu'un courrier qui attend un geste (« Envoyer maintenant » / « Changer l'heure »).
  var RETARD_MAX=2*MIN;
  function enRetard(m){ return !CAP.programmeServeur&&m.folder==="scheduled"&&Date.now()-m.sendAt>RETARD_MAX; }
  function flushScheduled(){
    var now=Date.now();
    MESSAGES.forEach(function(m){ if(m.folder==="scheduled"&&m.sendAt<=now&&!enRetard(m)&&!held(m.id)&&!m.sending){
      var wasSel=state.selected===m.id;
      expedier(m,false,function(ok){ if(!ok) return; if(wasSel&&state.folder==="scheduled"){ state.selected=null; backToListMobile(); renderAll(); } notify("Message programmé envoyé"); }); } });
  }
  // Aperçu de liste : le début du texte sur une seule ligne (la liste le coupe à deux lignes)
  function firstLine(b){ return String(b||"").replace(/\s+/g," ").trim().slice(0,200); }
  function removeMsg(id){ for(var i=0;i<MESSAGES.length;i++) if(MESSAGES[i].id===id){ MESSAGES.splice(i,1); break; } }

  // Envoi avec fenêtre « Annuler » de 5 s.
  // Le message est écrit tout de suite dans une boîte d'envoi persistée (dossier interne « outbox », jamais affiché) :
  // ni un autre toast, ni un second envoi, ni un rechargement ou un onglet fermé pendant les 5 s ne peuvent le perdre.
  function fillMsg(m,d){ if(d.att) m.att=d.att.map(function(a){ return {name:a.name,size:a.size,kind:a.kind,bytes:a.bytes}; }); m.acct=d.acct; m.to=d.to; m.subject=d.subject; m.body=splitBody(d.body); m.preview=firstLine(d.body); m.read=true; m.user=true; m.at=Date.now();
    if(d.noTrust&&d.noTrust.length) m.noTrust=d.noTrust.slice(); else delete m.noTrust; }
  function sendWithUndo(d){
    var m=liveDraft(d.draftId), prev=m?{folder:m.folder,sendAt:m.sendAt}:null;
    if(!m){ m=mk({acct:d.acct,folder:"outbox",from:null}); MESSAGES.push(m); }
    fillMsg(m,d); m._files=d.att.map(function(a){ return a.file; }).filter(Boolean); m.folder="outbox"; delete m.sendAt;
    if(state.selected===m.id) state.selected=null;
    renderAll(); persist();
    toast("Envoi en cours…",{undo:true,ms:5000,
      onCancel:function(){ if(m.folder!=="outbox") return;
        // Un message programmé que l'on venait de modifier garde son heure ; sinon il revient dans les brouillons.
        var keep=!!prev&&prev.folder==="scheduled"&&prev.sendAt>Date.now()+30000;
        m.folder=keep?"scheduled":"drafts"; if(keep) m.sendAt=prev.sendAt; m.at=Date.now();
        renderAll(); persist(); notify(keep?"Envoi annulé — toujours programmé "+fmtSched(prev.sendAt):"Envoi annulé — brouillon conservé"); },
      onDone:function(quiet){ commitOutbox(m,quiet); }});
  }
  // quiet = page quittée : pas de rendu ; le message est marqué pour être signalé au prochain chargement.
  function commitOutbox(m,quiet){ if(!m||m.folder!=="outbox"||m.sending) return false;
    expedier(m,quiet,function(ok){ if(ok&&!quiet) notify("Message envoyé"); }); return true; }
  // Ce que la source reçoit à envoyer : la boîte, l'expéditeur, le destinataire, l'objet, le texte, les pièces (File)
  function courrierDe(m){ var a=acctOf(m.acct); return {boite:a.sid,de:a.email,nom:a.name,a:m.to,objet:m.subject,texte:bodyText(m),pieces:(m._files||[]).slice()}; }
  // L'envoi se FAIT (ou échoue) chez la source : « Message envoyé » ne s'écrit qu'après sa réponse, un échec remet le message dans les brouillons et le dit.
  function expedier(m,quiet,fin){
    if(m.sending) return; m.sending=true;
    Promise.resolve().then(function(){ return SRC.envoyer(courrierDe(m)); }).then(function(){
      m.sending=false; m.folder="sent"; m.at=Date.now(); delete m.sendAt; m.user=true; delete m._files; learnContacts(m);
      if(!quiet) renderAll(); persist(); if(fin) fin(true);
    },function(e){
      m.sending=false; m.folder="drafts"; delete m.sendAt; m.at=Date.now(); m.user=true;
      if(vivant){ renderAll(); persist(); toast("Envoi impossible : "+msgErr(e,"échec")+" — le message est dans Brouillons"); } if(fin) fin(false); }); }

  // ---------- Déplacer vers… (catégorie) ----------
  // Une seule fois pour ce message, ou « toujours » pour l'expéditeur : règle apprise, et tous ses messages sont rangés à nouveau.
  function openMoveCat(m){
    if(!m||!m.from) return;
    closeOverlay();
    var ov=makeOverlay("mv"), cur=effCat(m), email=emailOf(m), pick=cur;
    var sameSender=MESSAGES.filter(function(x){ return emailOf(x)===email&&x.folder==="inbox"; }).length;
    ov.innerHTML='<div class="sheet mv" role="dialog" aria-modal="true" aria-labelledby="mvTitle">'+
      sheetBar('<button class="btn" id="mvCancel" type="button" data-home="l" data-mac="foot" data-ord="1">Annuler</button>','<span class="t">Déplacer vers…</span>',
        '<button class="btn primary" id="mvGo" type="button" data-home="r" data-mac="foot" data-ord="2">Déplacer</button>',"mvTitle")+
      '<div class="sheet-body"><div class="gwrap">'+
        '<p class="mv-from">'+H(m.subject||"(Sans objet)")+'<span>'+H(m.from.name)+' · '+H(email)+'</span></p>'+
        '<div class="ghead" id="mvLbl">Catégorie</div>'+
        '<div class="gcard" id="mvList" role="radiogroup" aria-labelledby="mvLbl">'+OPClassify.CATS.map(function(c){ var on=c.id===cur;
          return '<button type="button" class="sp mvopt" role="radio" aria-checked="'+on+'" tabindex="'+(on?0:-1)+'" data-cat="'+c.id+'">'+
            '<span class="mvic" aria-hidden="true">'+I[CAT_ICON[c.id]]+'</span><span class="sp-l"><b>'+H(c.name)+'</b>'+(on?' <i>actuelle</i>':'')+'</span><span class="mck" aria-hidden="true">'+I.check+'</span></button>'; }).join("")+'</div>'+
        '<div class="gcard mv-card"><label class="swrow" for="mvAlways"><span class="swl">Toujours ranger les mails de <b>'+H(email)+'</b> ici</span>'+
          '<input type="checkbox" class="switch" id="mvAlways" role="switch"></label></div>'+
        '<p class="gfoot-s">'+I.info+'<span>'+(sameSender>1?'Avec cette option, les '+sameSender+' messages reçus de cette adresse sont rangés aussi, ':'Avec cette option, ')+'OP Courrier s’en souvient pour les prochains mails.</span></p>'+
      '</div></div>'+SHEET_FOOT+'</div>';
    placeSheetChrome();
    var list=$("#mvList"), opts=$$(".mvopt",list);
    function choose(b,focus){ pick=b.getAttribute("data-cat"); opts.forEach(function(o){ var on=o===b; o.setAttribute("aria-checked",String(on)); o.tabIndex=on?0:-1; }); if(focus) b.focus(); }
    list.addEventListener("click",function(e){ var b=e.target.closest(".mvopt"); if(b) choose(b,false); });
    list.addEventListener("keydown",function(e){
      if(["ArrowDown","ArrowUp","ArrowLeft","ArrowRight"].indexOf(e.key)<0) return; e.preventDefault();
      var i=opts.indexOf(actif()), d=(e.key==="ArrowDown"||e.key==="ArrowRight")?1:-1; choose(opts[(i+d+opts.length)%opts.length],true); });
    $("#mvCancel").onclick=closeOverlay;
    $("#mvGo").onclick=function(){
      var always=$("#mvAlways").checked; closeOverlay();
      if(!always&&pick===cur) return;
      var at=listIndex(m.id);
      var undo=undoable(function(){
        if(always){ RULES.senders[email]=pick; MESSAGES.forEach(function(x){ if(emailOf(x)===email) delete x.co; }); }
        else if(pick===engineCat(m)) delete m.co; else m.co=pick; });
      refocus(state.selected===m.id?'.rcat [data-act="moveCat"]':null,at);
      toast(always?"Rangé dans "+catName(pick)+" · expéditeur mémorisé":"Déplacé dans "+catName(pick),{label:"Annuler",onAct:function(){ undo(); toast("Rangement annulé"); }});
    };
    var f=list.querySelector('[aria-checked="true"]'); if(f) f.focus({preventScroll:true});
  }

  // ---------- Ajouter un compte : on tape l'adresse, la messagerie est reconnue toute seule ----------
  // 1) grandes messageries : par le domaine de l'adresse (instantané) ;
  // 2) domaine d'entreprise : par le serveur qui reçoit ses mails (enregistrement MX du DNS public) —
  //    seul le NOM DE DOMAINE part, jamais l'adresse. Version finale : même chose côté serveur, plus
  //    l'autoconfiguration (Thunderbird/ISPDB), Autodiscover (Exchange) et les enregistrements SRV.
  var PROV_IMAP=function(id,name,color,mono,imap,smtp,smtpPort,note){ return {id:id,name:name,color:color,mono:mono,kind:"imap",imap:imap,imapPort:993,smtp:smtp,smtpPort:smtpPort||465,note:note||""}; };
  var DETECT_DOMAINS=[
    [/^(gmail|googlemail)\.com$/, function(){ return {id:"gmail",name:"Gmail",color:"#d93025",mono:"G",kind:"oauth",via:"Google"}; }],
    [/^(outlook|hotmail|live|msn)\.[a-z.]+$/, function(){ return {id:"microsoft",name:"Outlook",color:"#1566c0",mono:"O",kind:"oauth",via:"Microsoft"}; }],
    [/^(icloud|me|mac)\.com$/, function(){ return PROV_IMAP("icloud","iCloud","#3b9dff","",  "imap.mail.me.com","smtp.mail.me.com",587,"Apple demande un « mot de passe pour app » (Identifiant Apple › Sécurité)."); }],
    [/^(yahoo\.[a-z.]+|ymail\.com|rocketmail\.com)$/, function(){ return {id:"yahoo",name:"Yahoo Mail",color:"#6a01d2",mono:"Y",kind:"oauth",via:"Yahoo"}; }],
    [/^(orange|wanadoo)\.fr$/, function(){ return PROV_IMAP("orange","Orange","#b54a00","O","imap.orange.fr","smtp.orange.fr"); }],
    [/^free\.fr$/, function(){ return PROV_IMAP("free","Free","#cd1e25","F","imap.free.fr","smtp.free.fr"); }],
    [/^(sfr|neuf)\.fr$|^cegetel\.net$/, function(){ return PROV_IMAP("sfr","SFR","#e2001a","S","imap.sfr.fr","smtp.sfr.fr"); }],
    [/^laposte\.net$/, function(){ return PROV_IMAP("laposte","La Poste","#1f4fa3","P","imap.laposte.net","smtp.laposte.net"); }],
    [/^bbox\.fr$/, function(){ return PROV_IMAP("bbox","Bouygues (Bbox)","#00739a","B","imap4.bbox.fr","smtp.bbox.fr",587); }],
    [/^gmx\.[a-z.]+$/, function(){ return PROV_IMAP("gmx","GMX","#1c449b","G","imap.gmx.net","mail.gmx.net",587); }],
    [/^aol\.[a-z.]+$/, function(){ return PROV_IMAP("aol","AOL","#3a3a3a","A","imap.aol.com","smtp.aol.com"); }],
    [/^(proton\.me|protonmail\.(com|ch)|pm\.me)$/, function(){ return PROV_IMAP("proton","Proton Mail","#6d4aff","P","127.0.0.1","127.0.0.1",1025,"Proton passe par « Proton Mail Bridge », installé sur l'ordinateur."); }],
    [/^zoho\.[a-z.]+$/, function(){ return PROV_IMAP("zoho","Zoho Mail","#c8202f","Z","imap.zoho.eu","smtp.zoho.eu"); }],
    [/^(ik\.me|etik\.com|ikmail\.com)$/, function(){ return PROV_IMAP("infomaniak","Infomaniak","#0067b8","i","mail.infomaniak.com","mail.infomaniak.com"); }],
    [/^mailo\.com$/, function(){ return PROV_IMAP("mailo","Mailo","#2b6cb0","M","mail.mailo.com","mail.mailo.com"); }]
  ];
  // MX (serveur de réception) -> hébergeur. Pour un domaine d'entreprise.
  var DETECT_MX=[
    [/(^|\.)(google|googlemail)\.com\.?$|aspmx/, function(){ return {id:"gworkspace",name:"Google Workspace",color:"#1a73e8",mono:"G",kind:"oauth",via:"Google"}; }],
    [/protection\.outlook\.com|\.outlook\.com\.?$/, function(){ return {id:"m365",name:"Microsoft 365",color:"#1566c0",mono:"O",kind:"oauth",via:"Microsoft"}; }],
    [/ovh\.net\.?$/, function(d){ return PROV_IMAP("ovh","OVHcloud (mail pro)","#000e9c","O","ssl0.ovh.net","ssl0.ovh.net"); }],
    [/ionos\.|kundenserver\.de|perfora\.net|1and1/, function(){ return PROV_IMAP("ionos","IONOS","#11388b","I","imap.ionos.fr","smtp.ionos.fr"); }],
    [/infomaniak\.ch\.?$/, function(){ return PROV_IMAP("infomaniak","Infomaniak","#0067b8","i","mail.infomaniak.com","mail.infomaniak.com"); }],
    [/gandi\.net\.?$/, function(){ return PROV_IMAP("gandi","Gandi","#17735c","G","mail.gandi.net","mail.gandi.net"); }],
    [/zoho\./, function(){ return PROV_IMAP("zoho","Zoho Mail","#c8202f","Z","imappro.zoho.eu","smtppro.zoho.eu"); }],
    [/protonmail\.ch\.?$/, function(){ return PROV_IMAP("proton","Proton Mail","#6d4aff","P","127.0.0.1","127.0.0.1",1025,"Proton passe par « Proton Mail Bridge », installé sur l'ordinateur."); }],
    [/icloud\.com\.?$/, function(){ return PROV_IMAP("icloud","iCloud+ (domaine perso)","#3b9dff","","imap.mail.me.com","smtp.mail.me.com",587,"Apple demande un « mot de passe pour app »."); }],
    [/secureserver\.net\.?$/, function(){ return PROV_IMAP("godaddy","GoDaddy","#0d7a7a","G","imap.secureserver.net","smtpout.secureserver.net"); }],
    [/hostinger\./, function(){ return PROV_IMAP("hostinger","Hostinger","#673de6","H","imap.hostinger.com","smtp.hostinger.com"); }],
    [/o2switch\.net\.?$/, function(d){ return PROV_IMAP("o2switch","o2switch","#b33d12","o","mail."+d,"mail."+d); }],
    [/zimbra/, function(d){ return PROV_IMAP("zimbra","Zimbra","#0a64b0","Z","mail."+d,"mail."+d,587); }],
    [/yandex\./, function(){ return PROV_IMAP("yandex","Yandex","#c42b10","Y","imap.yandex.com","smtp.yandex.com"); }]
  ];
  var MX_FILTRES=/mailinblack|mimecast|pphosted|proofpoint|vadesecure|barracuda|messagelabs|altospam|mailcontrol/;
  function provServeurEntreprise(d,filtre){ return PROV_IMAP("autre","Serveur de votre entreprise","#5b6270","","mail."+d,"mail."+d,587,
    (filtre?"Vos mails passent d'abord par un filtre (« "+filtre+" »). ":"")+"Zimbra, Exchange, cPanel, Plesk… : les réglages proposés conviennent le plus souvent, vérifiez-les avec votre informaticien si besoin."); }
  function detectParDomaine(d){ for(var i=0;i<DETECT_DOMAINS.length;i++) if(DETECT_DOMAINS[i][0].test(d)) return DETECT_DOMAINS[i][1](d); return null; }
  var mxCache={};
  // ⛔ LA SEULE SORTIE DU RÉSEAU DE CETTE PAGE : l'annuaire public (DNS) pour reconnaître le service d'un domaine D'ENTREPRISE.
  //   · elle n'envoie que le NOM DE DOMAINE (« entreprise.fr »), jamais l'adresse ni le nom ;
  //   · elle ne part JAMAIS pendant la frappe : seulement quand la personne a fini (elle quitte le champ, appuie sur Entrée ou sur
  //     « Vérifier la messagerie ») — voir detect(true) dans openAddAccount ;
  //   · un domaine grand public (Gmail, Outlook, iCloud…) est reconnu par la table, sans aucun appel ;
  //   · si le réseau ou la politique de la page la refuse, la détection retombe sur la table + `mail.<domaine>` (provServeurEntreprise).
  // Le module ne sort JAMAIS du réseau lui-même : la lecture du MX est un service de la SOURCE (SRC.lireMX(domaine) → liste de serveurs, ou rejet).
  // Sans ce service, un domaine d'entreprise reçoit des réglages génériques et le serveur reconnaît la messagerie à la connexion.
  function lireMX(d){
    if(typeof SRC.lireMX!=="function") return null;
    if(mxCache[d]) return mxCache[d];
    mxCache[d]=Promise.resolve().then(function(){ return SRC.lireMX(d); })
      .then(function(r){ return Array.isArray(r)?r.map(function(x){ return String(x).toLowerCase(); }):null; })
      .catch(function(){ delete mxCache[d]; return null; });
    return mxCache[d];
  }
  // Ce que l'on dit d'une messagerie reconnue : jamais un réglage que le serveur n'utilisera pas.
  function provDetail(p){
    if(p.kind==="oauth"&&!CAP.oauth&&p.via==="Microsoft") return "Bientôt : connexion sécurisée via Microsoft. Microsoft refuse les mots de passe dans toutes les applications : cette adresse ne peut pas être connectée pour l’instant.";
    if(p.kind==="oauth") return CAP.oauth?"Connexion sécurisée via "+p.via+" — sans mot de passe à saisir ici.":"Bientôt : connexion sécurisée via "+p.via+", sans mot de passe. En attendant, saisissez un mot de passe d’application.";
    return (CAP.reglagesServeur?"IMAP "+p.imap+" · SMTP "+p.smtp:"Réglages reconnus à la connexion")+(p.note?" — "+p.note:""); }
  function motDePasse(p){ return p&&(p.kind==="imap"||p.kind==="exchange"||(p.kind==="oauth"&&!CAP.oauth)); }
  function sansVoie(p){ return !!p&&p.kind==="oauth"&&!CAP.oauth&&p.via==="Microsoft"; }   // ni OAuth ni mot de passe : rien à connecter pour l'instant
  function detectParMX(d,mx){
    if(!mx) return null;
    if(!mx.length) return {erreur:"Ce domaine ne reçoit pas d'e-mails (aucun serveur de réception trouvé). Vérifiez l'adresse."};
    var all=mx.join(" "), filtre=(all.match(MX_FILTRES)||[])[0];
    for(var i=0;i<DETECT_MX.length;i++) if(DETECT_MX[i][0].test(all)) return DETECT_MX[i][1](d);
    return provServeurEntreprise(d,filtre);
  }

  function openAddAccount(){
    closeDrawer(); closeOverlay();
    var ov=makeOverlay("acct");
    var row=function(id,label,type,ph,extra){ return '<div class="fld"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" placeholder="'+H(ph)+'"'+(extra||"")+'></div>'; };
    var cote=coteCourant();
    ov.innerHTML='<div class="sheet acct" role="dialog" aria-modal="true" aria-labelledby="aTitle">'+
      sheetBar('<button class="btn" id="aClose" type="button" data-home="l" data-mac="foot" data-ord="1">Annuler</button>','<span class="t">Ajouter un compte</span>',
        '<button class="btn primary" id="aGo" type="button" data-home="r" data-mac="foot" data-ord="2" disabled>Continuer</button>',"aTitle")+
      '<div class="sheet-body"><div class="prov-intro"><span class="glyph" aria-hidden="true">'+I.mail+'</span><h3>Ajoutez une boîte mail</h3>'+
        '<p>Tapez votre adresse : '+H(TITRE)+' reconnaît la messagerie toute seule — Gmail, Outlook, iCloud, Orange, Free, OVH, IONOS, Zimbra, Microsoft 365, Google Workspace…</p></div>'+
      '<div class="gwrap"><div class="gcard">'+
        row("aMail","Adresse","email","vous@entreprise.fr",' autocomplete="email" autocapitalize="off" spellcheck="false" inputmode="email"')+
        row("aName","Nom","text","Votre nom affiché (facultatif)",' autocomplete="name"')+'</div>'+
      '<div class="det" id="aDet" aria-live="polite" hidden></div>'+
      '<div id="aPassWrap" hidden><div class="gcard">'+row("aPass","Mot de passe","password","Mot de passe de la boîte",' autocomplete="current-password"')+'</div></div>'+
      '<div id="aAdv" hidden><button type="button" class="adv-tog" id="aAdvTog" aria-expanded="false" aria-controls="aAdvBody"><span>Réglages du serveur</span>'+I.chevR+'</button>'+
        '<div id="aAdvBody" hidden><p class="gfoot-s" id="aAdvSoon">'+I.info+'<span>Bientôt : des réglages de serveur personnalisés. Pour l’instant, le serveur reconnaît ceux de votre messagerie à la connexion.</span></p><div id="aAdvFields"><div class="ghead" aria-hidden="true">Réception (IMAP)</div><div class="gcard">'+
          row("aImap","Serveur","text","imap.exemple.fr",' autocapitalize="off" spellcheck="false"')+row("aImapPort","Port","text","993",' inputmode="numeric"')+'</div>'+
          '<div class="ghead" aria-hidden="true">Envoi (SMTP)</div><div class="gcard">'+
          row("aSmtp","Serveur","text","smtp.exemple.fr",' autocapitalize="off" spellcheck="false"')+row("aSmtpPort","Port","text","465",' inputmode="numeric"')+'</div>'+
          '<p class="gfoot-s">'+I.lock+'<span>Connexion chiffrée (SSL/TLS) obligatoire.</span></p></div></div></div>'+
      '<div class="ghead kind-hide" id="kKindLbl">Côté (obligatoire)</div>'+
      '<div class="gcard kind-card kind-hide"><div class="kseg" id="kKind" role="radiogroup" aria-labelledby="kKindLbl" aria-required="true">'+
        '<button type="button" role="radio" aria-checked="'+(cote==="pro")+'" tabindex="'+(cote==="pro"?0:-1)+'" data-kind="pro">'+I.briefcase+'<span>Pro</span></button>'+
        '<button type="button" role="radio" aria-checked="'+(cote==="perso")+'" tabindex="'+(cote==="perso"?0:-1)+'" data-kind="perso">'+I.house+'<span>Perso</span></button></div></div>'+
      '<p class="kind-err" id="aMailErr" role="alert" hidden>'+I.warn+'<span></span></p>'+
      '<p class="gfoot-s">'+I.info+'<span>'+(CAP.mx?"Pour un domaine d’entreprise, seul le nom de domaine est vérifié dans l’annuaire public (DNS), jamais votre adresse. ":"")+'Vos mails restent sur votre messagerie : '+H(TITRE)+' s’y connecte pour les lire et les envoyer.</span></p>'+
      '<button type="button" class="link-btn" id="aManual">Choisir le fournisseur manuellement</button>'+
      '</div></div>'+SHEET_FOOT+'</div>';
    placeSheetChrome();
    var mIn=$("#aMail"), det=$("#aDet"), go=$("#aGo"), err=$("#aMailErr"), found=null, seq=0, tmr;
    var kind=cote, seg=$("#kKind"), segBtns=$$("[data-kind]",seg);
    function setKind(b,focus){ kind=b.getAttribute("data-kind"); segBtns.forEach(function(x){ var on=x===b; x.setAttribute("aria-checked",String(on)); x.tabIndex=on?0:-1; }); if(focus) b.focus(); }
    seg.addEventListener("click",function(e){ var b=e.target.closest("[data-kind]"); if(b) setKind(b,false); });
    seg.addEventListener("keydown",function(e){ if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].indexOf(e.key)<0) return; e.preventDefault(); var i=segBtns.indexOf(actif()); setKind(segBtns[i===0?1:0],true); });
    function showErr(t){ err.hidden=!t; err.querySelector("span").textContent=t||""; }
    function paint(st,p,msg){
      det.hidden=false; det.className="det"+(st==="ko"?" ko":"");
      if(st==="wait"){ det.innerHTML='<span class="spin" aria-hidden="true"></span><span class="pn"><b>Recherche de la messagerie…</b><span>'+H(msg)+'</span></span>'; return; }
      if(st==="idle"){ det.innerHTML='<span class="ptile" style="background:#5b6270" aria-hidden="true">'+I.mail+'</span><span class="pn"><b>Domaine d’entreprise « '+H(msg)+' »</b><span>Quand vous avez fini de taper, appuyez sur Entrée ou quittez le champ : seul ce nom de domaine sera vérifié dans l’annuaire public (DNS).</span></span>'; return; }
      if(st==="ko"){ det.innerHTML='<span class="ptile" style="background:#8e8e93" aria-hidden="true">'+I.warn+'</span><span class="pn"><b>'+H(msg)+'</b></span>'; return; }
      det.innerHTML=providerTile(p)+'<span class="pn"><b>'+H(p.name)+' <span class="ok-chip">'+(p.id==="autre"?"réglages proposés":"reconnu")+'</span></b><span>'+H(provDetail(p))+'</span></span>';
    }
    function apply(p){
      found=sansVoie(p)?null:p; var imap=motDePasse(p)&&!sansVoie(p);
      $("#aPassWrap").hidden=!imap; $("#aAdv").hidden=!imap;
      $("#aAdvFields").hidden=!CAP.reglagesServeur; $("#aAdvSoon").hidden=!!CAP.reglagesServeur;
      if(imap){ $("#aImap").value=p.imap||""; $("#aImapPort").value=p.imapPort||993; $("#aSmtp").value=p.smtp||""; $("#aSmtpPort").value=p.smtpPort||465; }
      go.disabled=!p||sansVoie(p); go.textContent=!p||sansVoie(p)?"Continuer":(p.kind==="oauth"&&CAP.oauth)?"Continuer avec "+p.via:"Se connecter";
    }
    var enCours="";   // domaine dont le MX est en cours de lecture : un Entrée + un « change » ne font qu'une demande
    function detect(geste){
      var v=mIn.value.trim().toLowerCase(), at=v.lastIndexOf("@"), d=at>0?v.slice(at+1):"";
      if(!mIn.isConnected) return;   // feuille fermée (Échap, Annuler) : le champ qui disparaît déclenche un « change » — ce n’est PAS un geste, rien ne part
      if(geste&&enCours===d) return;
      showErr(""); var my=++seq; enCours="";
      if(!/^[^@\s]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(v)){ det.hidden=true; apply(null); go.disabled=true; return; }
      var p=detectParDomaine(d);
      if(p){ paint("ok",p); apply(p); return; }
      if(!geste){   // domaine d'entreprise : on attend la fin de la saisie, aucun appel réseau pendant la frappe
        paint("idle",null,d); apply(null); go.disabled=false; go.textContent="Vérifier la messagerie"; return; }
      enCours=d; paint("wait",null,"Vérification de « "+d+" »"); apply(null);
      var lmx=lireMX(d);
      if(!lmx){ enCours=""; var g=provServeurEntreprise(d); g.note="Le serveur reconnaît la messagerie à la connexion."; paint("ok",g); apply(g); return; }
      lmx.then(function(mx){ if(my!==seq||!mIn.isConnected) return; enCours="";
        var r=detectParMX(d,mx);
        if(!r){ var q=provServeurEntreprise(d); q.note="Impossible de vérifier le domaine (hors ligne ?). Réglages les plus courants proposés : à vérifier."; paint("ok",q); apply(q); return; }
        if(r.erreur){ paint("ko",null,r.erreur); apply(null); return; }
        paint("ok",r); apply(r);
      });
    }
    // l'adresse change : ce qui a été reconnu pour l'AVANT ne vaut plus (Entrée dans les 350 ms refait la reconnaissance, elle ne connecte pas avec l'ancienne)
    mIn.addEventListener("input",function(){ found=null; clearTimeout(tmr); tmr=setTimeout(function(){ detect(false); },350); });
    mIn.addEventListener("change",function(){ clearTimeout(tmr); setTimeout(function(){ detect(true); },0); });   // le champ est quitté (ou Entrée) : la saisie est finie. Après un tour : fermer la feuille (Échap) fait aussi « quitter » le champ, avant de le retirer du document — ce n’est pas un geste
    mIn.addEventListener("keydown",function(e){ if(e.key==="Enter"&&!go.disabled){ e.preventDefault(); go.click(); } });
    $("#aAdvTog").onclick=function(){ var b=$("#aAdvBody"), open=b.hidden; b.hidden=!open; this.setAttribute("aria-expanded",String(open)); };
    $("#aClose").onclick=closeOverlay;
    $("#aManual").onclick=openProviderList;
    go.onclick=function(){
      if(!found){ clearTimeout(tmr); if(!go.disabled) detect(true); return; }   // le geste passe avant la frappe en attente (350 ms) : sinon elle le repeindrait par-dessus
      var mail=mIn.value.trim(), name=$("#aName").value.trim();
      if(acctByEmail(mail)){ showErr("Cette adresse est déjà connectée ("+KINDS[kindOf(acctByEmail(mail))]+")."); mIn.focus(); return; }
      var pw=motDePasse(found);
      if(pw&&!$("#aPass").value){ showErr("Entrez le mot de passe de cette boîte."); $("#aPass").focus(); return; }
      if(pw&&CAP.reglagesServeur&&!$("#aImap").value.trim()){ showErr("Indiquez le serveur de réception."); $("#aAdvBody").hidden=false; $("#aImap").focus(); return; }
      var avant=go.textContent; go.disabled=true; go.textContent=(found.kind==="oauth"&&CAP.oauth)?"Ouverture de "+found.via+"…":"Connexion…";
      if(!PROVIDERS.some(function(x){ return x.id===found.id; })) PROVIDERS.splice(PROVIDERS.length-1,0,{id:found.id,name:found.name,sub:"",color:found.color,mono:found.mono||"",glyph:found.mono?null:(found.id.indexOf("icloud")===0?"cloud":"at"),kind:found.kind});
      connectAccount(provOf(found.id),mail,name||mail.split("@")[0],kind,{mdp:pw?$("#aPass").value:"",imap:pw&&CAP.reglagesServeur?{imap:$("#aImap").value.trim(),imapPort:+$("#aImapPort").value||993,smtp:$("#aSmtp").value.trim(),smtpPort:+$("#aSmtpPort").value||465}:null}).then(function(){
        if(ov.isConnected) closeOverlay(); },function(e){
        if(!ov.isConnected) return; go.disabled=false; go.textContent=avant; showErr(msgErr(e,"Connexion impossible.")); });
    };
    setTimeout(function(){ mIn.focus({preventScroll:true}); },30);
  }
  // Repli : l'ancienne liste, pour les cas rares
  function openProviderList(){
    closeOverlay();
    var ov=makeOverlay("acct");
    ov.innerHTML='<div class="sheet acct" role="dialog" aria-modal="true" aria-labelledby="aTitle">'+
      sheetBar('<button class="btn back-btn" id="aBack" type="button" data-home="l" aria-label="Retour"><span class="ic" aria-hidden="true">'+I.chevL+'</span><span class="lbl" aria-hidden="true">Retour</span></button>','<span class="t">Choisir le fournisseur</span>','',"aTitle")+
      '<div class="sheet-body"><div class="gwrap"><div class="gcard" id="provGrid">'+PROVIDERS.map(function(p){
        return '<button type="button" class="prov" data-prov="'+p.id+'">'+providerTile(p)+
          '<span class="pn"><b>'+H(p.name)+'</b><span>'+H(p.sub)+'</span></span><span class="go" aria-hidden="true">'+I.chevR+'</span></button>';
      }).join("")+'</div></div></div>'+SHEET_FOOT+'</div>';
    placeSheetChrome();
    $("#aBack").onclick=openAddAccount;
    $("#provGrid").addEventListener("click",function(e){ var b=e.target.closest("[data-prov]"); if(b) openConnect(provOf(b.getAttribute("data-prov"))); });
    var f=$("#provGrid .prov"); if(f) f.focus({preventScroll:true});
  }

  function openConnect(p){
    closeOverlay();
    var isImap=motDePasse(p)&&!sansVoie(p);
    var ov=makeOverlay("acct");
    var row=function(id,label,type,ph,extra){ return '<div class="fld"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" placeholder="'+H(ph)+'"'+(extra||"")+'></div>'; };
    // Type de boîte : obligatoire, sans choix par défaut (contrôle segmenté iOS = groupe de boutons radio)
    var kindHtml='<div class="ghead kind-hide" id="kKindLbl">Type de boîte (obligatoire)</div>'+
      '<div class="gcard kind-card kind-hide"><div class="kseg" id="kKind" role="radiogroup" aria-labelledby="kKindLbl" aria-required="true" aria-describedby="kKindHelp">'+
        '<button type="button" role="radio" aria-checked="false" tabindex="0" data-kind="pro">'+I.briefcase+'<span>Pro</span></button>'+
        '<button type="button" role="radio" aria-checked="false" tabindex="-1" data-kind="perso">'+I.house+'<span>Perso</span></button></div></div>'+
      '<p class="kind-err" id="kKindErr" role="alert" hidden>'+I.warn+'<span>Choisissez « Pro » ou « Perso » pour cette boîte.</span></p>'+
      '<p class="gfoot-s kind-hide" id="kKindHelp">'+I.info+'<span>Pro : travail, clients, fournisseurs. Perso : vie privée. Chaque univers a sa propre vue, et vous pouvez aussi tout voir ensemble.</span></p>';
    // Adresse déjà connectée : erreur en ligne sous la carte « Compte »
    var mailErr='<p class="kind-err" id="kMailErr" role="alert" hidden>'+I.warn+'<span></span></p>';
    var inner;
    if(isImap){
      inner='<div class="ghead" aria-hidden="true">Compte</div><div class="gcard">'+
          row("kName","Nom","text","Votre nom affiché",' autocomplete="name"')+
          row("kMail","Adresse","email","vous@entreprise.fr",' autocomplete="email"')+
          row("kPass","Mot de passe","password","Requis",' autocomplete="off"')+'</div>'+mailErr+kindHtml+
        (CAP.reglagesServeur?'<div class="ghead" aria-hidden="true">Serveur de réception</div><div class="gcard">'+
          row("kImap",p.kind==="exchange"?"Serveur":"Serveur IMAP","text",p.kind==="exchange"?"mail.entreprise.fr":"imap.entreprise.fr",' autocapitalize="off"')+'</div>'+
        '<div class="ghead" aria-hidden="true">Serveur d’envoi</div><div class="gcard">'+
          row("kSmtp","Serveur SMTP","text","smtp.entreprise.fr",' autocapitalize="off"')+'</div>':'')+
        '<p class="gfoot-s">'+I.lock+'<span>La connexion est chiffrée (TLS).'+(p.kind==="oauth"?" Bientôt : connexion sécurisée via "+H(p.name)+", sans mot de passe — en attendant, utilisez un mot de passe d’application.":"")+'</span></p>';
    }else{
      inner='<div class="note-card">'+I.lock+'<div>'+(sansVoie(p)?H(provDetail(p)):'Vous allez vous connecter à <b>'+H(p.name)+'</b> de façon sécurisée (OAuth). '+H(TITRE)+' n’enregistre jamais votre mot de passe.')+'</div></div>'+
        '<div class="ghead" aria-hidden="true">Compte</div><div class="gcard">'+
          row("kMail","Adresse","email","vous@"+(p.id==="gmail"?"gmail.com":p.id==="icloud"?"icloud.com":p.id==="yahoo"?"yahoo.com":"exemple.com"),' autocomplete="email"')+
          row("kName","Nom","text","Votre nom affiché",' autocomplete="name"')+'</div>'+mailErr+kindHtml;
    }
    var short=p.kind==="imap"?"IMAP":p.kind==="exchange"?"Exchange":"";
    ov.innerHTML='<div class="sheet acct" role="dialog" aria-modal="true" aria-labelledby="kTitle">'+
      sheetBar('<button class="btn back-btn" id="kBack" type="button" data-home="l" aria-label="Retour"><span class="ic" aria-hidden="true">'+I.chevL+'</span><span class="lbl" aria-hidden="true">Retour</span></button>',
        providerTile(p)+(short?'<span class="t t-long">'+H(p.name)+'</span><span class="t t-short" aria-hidden="true">'+H(short)+'</span>':'<span class="t">'+H(p.name)+'</span>'),
        '<button class="btn" id="kCancel" type="button" data-home="foot" data-ord="1">Annuler</button>'+
        '<button class="btn primary" id="kGo" type="button" data-home="r" data-mac="foot" data-ord="2">'+(isImap?"Connecter":"Se connecter")+'</button>',"kTitle")+
      '<div class="sheet-body"><div class="gwrap">'+inner+'</div></div>'+SHEET_FOOT+'</div>';
    placeSheetChrome();
    if(sansVoie(p)) $("#kGo").disabled=true;
    $("#kBack").onclick=openProviderList;
    $("#kCancel").onclick=closeOverlay;
    setTimeout(function(){ var el=$("#kMail"); if(el) el.focus(); },30);
    var kind=UN_COTE?COTES[0]:null, seg=$("#kKind"), segBtns=$$("[data-kind]",seg), kErr=$("#kKindErr");
    function setKind(b,focus){ kind=b.getAttribute("data-kind");
      segBtns.forEach(function(x){ var on=x===b; x.setAttribute("aria-checked",String(on)); x.tabIndex=on?0:-1; });
      seg.classList.remove("invalid"); seg.removeAttribute("aria-invalid"); kErr.hidden=true; if(focus) b.focus(); }
    seg.addEventListener("click",function(e){ var b=e.target.closest("[data-kind]"); if(b) setKind(b,false); });
    seg.addEventListener("keydown",function(e){
      if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].indexOf(e.key)<0) return; e.preventDefault();
      var i=segBtns.indexOf(actif()); setKind(segBtns[i===0?1:0],true); });
    var mErr=$("#kMailErr"), mIn=$("#kMail");
    function mailError(txt){ var on=!!txt; mErr.hidden=!on; mErr.querySelector("span").textContent=txt||"";
      if(on){ mIn.setAttribute("aria-invalid","true"); mIn.setAttribute("aria-describedby","kMailErr"); } else { mIn.removeAttribute("aria-invalid"); mIn.removeAttribute("aria-describedby"); } }
    mIn.addEventListener("input",function(){ if(!mErr.hidden) mailError(""); });
    $("#kGo").onclick=function(){
      var mail=($("#kMail")&&$("#kMail").value.trim())||"";
      var name=($("#kName")&&$("#kName").value.trim())||"";
      var badMail=!mail||mail.indexOf("@")<1;
      var dup=badMail?null:acctByEmail(mail);
      if(!kind){ kErr.hidden=false; seg.classList.add("invalid"); seg.setAttribute("aria-invalid","true"); }
      if(badMail){ if($("#kMail")) $("#kMail").focus(); toast("Entrez une adresse e-mail valide"); return; }
      // Une adresse = une seule boîte, dans un seul univers (pas de doublon Pro + Perso)
      if(dup){ mailError("Cette adresse est déjà connectée ("+KINDS[kindOf(dup)]+")."); mIn.focus(); return; }
      if(!kind){ segBtns[0].focus(); kErr.scrollIntoView({block:"nearest"}); return; }
      var pw=isImap?($("#kPass")&&$("#kPass").value)||"":"";
      if(isImap&&!pw){ toast("Entrez le mot de passe de cette boîte"); $("#kPass").focus(); return; }
      var go=$("#kGo"), avant=go.textContent; go.textContent="Connexion…"; go.disabled=true;
      var srv=isImap&&CAP.reglagesServeur?{imap:($("#kImap").value||"").trim(),smtp:($("#kSmtp").value||"").trim()}:null;
      // Feuille fermée entre-temps (Échap, Annuler, Retour) = on n'y touche plus ; la connexion, elle, a été demandée.
      connectAccount(p,mail,name||mail.split("@")[0],kind,{mdp:pw,imap:srv}).then(function(){ if(ov.isConnected) closeOverlay(); },function(e){
        if(!ov.isConnected) return; go.disabled=false; go.textContent=avant; mailError(msgErr(e,"Connexion impossible.")); });
    };
  }
  function acctByEmail(mail){ var l=String(mail||"").trim().toLowerCase(); for(var i=0;i<ACCOUNTS.length;i++) if(String(ACCOUNTS[i].email).toLowerCase()===l) return ACCOUNTS[i]; return null; }
  // La source connecte la boîte (mot de passe ou OAuth) ; l'échec REVIENT à la feuille, qui le dit et reste ouverte.
  function connectAccount(p,mail,name,kind,extra){
    if(acctByEmail(mail)) return Promise.reject(new Error("Cette adresse est déjà connectée."));
    extra=extra||{};
    return Promise.resolve().then(function(){ return SRC.ajouterBoite({email:mail,nom:name,mdp:extra.mdp||"",fournisseur:p.id,cote:kind,serveurs:extra.imap||null}); }).then(function(b){
      var id=b&&b.id!=null?String(b.id):null; if(!id) throw new Error("réponse illisible");
      SAVED.kinds[id]=kind==="pro"?"pro":"perso"; SAVED.names[id]=name; SAVED.sigs[id]=name;
      if(!acctExists(id)) majBoites(ACCOUNTS.map(function(a){ return {id:a.sid,email:a.email}; }).concat([{id:b.id,email:mail,nom:name,cote:kind,fournisseur:p.id}]));
      state.scope=id; state.folder="inbox"; state.selected=null; LOAD.boites="ok";
      refreshCls(); renderAll(); persist(); toast("Boîte "+(UN_COTE?"":KINDS[kindOf(acctOf(id))].toLowerCase()+" ")+"connectée : "+mail);
      // la source importe parfois l'historique APRÈS la connexion (b.importEnCours) : on relit à 5, 15 et 40 s, sans bruit
      if(b.importEnCours) [5000,15000,40000].forEach(function(t){ var h=setTimeout(function(){ if(vivant) charger(true); },t); finis.push(function(){ clearTimeout(h); }); });
      return charger(true);
    }); }

  // ---------- Toast ----------
  var toastTimer, undoIv;
  var RING='<svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="4"/><circle id="trg" cx="18" cy="18" r="15" fill="none" stroke="#b4c8ff" stroke-width="4" stroke-linecap="round" stroke-dasharray="94" stroke-dashoffset="0" transform="rotate(-90 18 18)"/></svg>';
  // Le minuteur d'annulation est indépendant de l'affichage : un autre message pendant les 5 s ne bloque ni ne perd l'envoi,
  // et « Annuler l'envoi » reprend sa place une fois cet autre message affiché.
  // action.undo = envoi avec « Annuler l'envoi » ; action.label = message avec un bouton (ex. « Annuler » après un rangement).
  // Pendant les 5 s d'annulation, tout autre message garde « Annuler l'envoi » à côté de son propre bouton :
  // l'envoi reste annulable à tout moment, et un « Annuler » de rangement (6 s) n'est jamais écourté par la fin de l'envoi
  // (« Message envoyé » attend qu'il ait fini : notify).
  var toastKind=null, queuedMsg=null;
  function undoHidden(){ return isPhone()&&app.getAttribute("data-view")!=="reading"; }   // iPhone : la barre du bas porte déjà « Annuler l'envoi »
  function notify(msg){ if(toastKind==="act"&&$("#toast").classList.contains("show")) queuedMsg=msg; else toast(msg); }
  function toast(msg,action){
    clearTimeout(toastTimer);
    var t=$("#toast"); t.classList.remove("quiet");
    // le calque est fixé à l'écran : on lui dit où est le module (bord gauche, bord droit, distance au bas, milieu de la colonne de liste)
    try{ var hr=hote.getBoundingClientRect(), lr=$("#list").getBoundingClientRect();
      t.style.setProperty("--opc-x",Math.max(0,Math.round(hr.left))+"px"); t.style.setProperty("--opc-r",Math.max(0,Math.round(window.innerWidth-hr.right))+"px");
      t.style.setProperty("--opc-bas",Math.max(0,Math.round(window.innerHeight-hr.bottom))+"px");
      t.style.setProperty("--opc-cx",Math.round(lr.left+lr.width/2)+"px"); t.style.setProperty("--opc-lw",Math.round(lr.width)+"px"); }catch(e){}
    if(action&&action.undo){
      if(pendingUndo) pendingUndo.finish(true);   // un nouvel envoi confirme le précédent
      clearTimeout(toastTimer);
      var left=action.ms||5000, total=left, over=false;
      var paint=function(){ var r=$("#trg"); if(r) r.style.strokeDashoffset=String(94*(1-Math.max(0,left)/total)); };
      var render=function(){
        toastKind="undo"; t.classList.remove("two");
        t.innerHTML=RING+'<span>'+H(msg)+'</span><button class="undo" id="tUndo" type="button">Annuler l’envoi</button>';
        t.classList.add("show","act"); paint(); $("#tUndo").onclick=cancel;
        // iPhone : « Annuler l'envoi » vit dans la zone d'état de la barre du bas ; le HUD ne reste visible que sur un message.
        if(undoHidden()) t.classList.add("quiet");
      };
      var finish=function(done,quiet){ if(over) return; over=true; clearInterval(undoIv); pendingUndo=null;
        if(toastKind==="undo"){ t.classList.remove("show","quiet","act"); toastKind=null; }
        else { var u=$("#tUndo"); if(u){ if(u===actif()){ var a=$("#tAct"); if(a) a.focus(); } u.remove(); } t.classList.remove("two"); if(!$("#tAct")) t.classList.remove("act"); }
        paintStatus(); if(done&&action.onDone) action.onDone(quiet); };
      var cancel=function(){ finish(false); if(action.onCancel) action.onCancel(); };
      pendingUndo={finish:finish,cancel:cancel,render:render};
      render(); paintStatus();
      undoIv=setInterval(function(){ left-=100; paint(); if(left<=0) finish(true); },100);
    }else{
      var btn=!!(action&&action.label);
      toastKind=btn?"act":"info";
      t.innerHTML='<span class="ok" aria-hidden="true">'+I.check+'</span><span>'+H(msg)+'</span>'+(btn?'<button class="undo" id="tAct" type="button">'+H(action.label)+'</button>':'')+
        (pendingUndo?'<button class="undo" id="tUndo" type="button"'+(undoHidden()?' hidden':'')+'>Annuler l’envoi</button>':'');
      t.classList.add("show"); t.classList.toggle("act",btn||!!pendingUndo); t.classList.toggle("two",btn&&!!pendingUndo&&!undoHidden());
      if(pendingUndo) $("#tUndo").onclick=pendingUndo.cancel;
      if(btn) $("#tAct").onclick=function(){ clearTimeout(toastTimer); toastKind=null; t.classList.remove("show","act"); action.onAct(); refocus(); };
      toastTimer=setTimeout(function(){ toastKind=null;
        if(pendingUndo) pendingUndo.render();
        else if(queuedMsg){ var q=queuedMsg; queuedMsg=null; toast(q); }
        else t.classList.remove("show","act"); },btn?6000:2300);
    }
  }
  sur(sr,"click",function(e){ if(e.target.closest("[data-undo]")&&pendingUndo) pendingUndo.cancel(); });
  // Page quittée ou rechargée pendant les 5 s : l'envoi part (il est de toute façon déjà dans la boîte d'envoi persistée) ; un retrait de boîte en attente aussi.
  sur(window,"pagehide",function(){ if(pendingUndo) pendingUndo.finish(true,true); retraits.forEach(function(r){ if(!r.annule) retirerCoteSource(r); }); });

  // ---------- Colonne Boîtes (iPad) ----------
  // Colonne superposée : tant qu'elle est ouverte, ce qu'elle recouvre est inerte (Tab reste dans la colonne) ; elle est annoncée comme dialogue.
  function drawerModal(on){ ["#list","#reading"].forEach(function(s){ $(s).inert=on; }); var sb=$("#sidebar");
    if(on){ sb.setAttribute("role","dialog"); sb.setAttribute("aria-modal","true"); } else { sb.removeAttribute("role"); sb.removeAttribute("aria-modal"); } }
  $("#sidebar").addEventListener("keydown",function(e){
    if(e.key!=="Tab"||!app.classList.contains("nav-open")) return;
    var f=tabbables($("#sidebar")); if(!f.length) return; var i=f.indexOf(actif());
    if(e.shiftKey&&i<=0){ e.preventDefault(); f[f.length-1].focus(); }
    else if(!e.shiftKey&&(i<0||i===f.length-1)){ e.preventDefault(); f[0].focus(); } });
  function openDrawer(){ app.classList.add("nav-open"); $("#btnNav").setAttribute("aria-expanded","true"); drawerModal(true); setTimeout(function(){ var c=$('#sidebar .srow[aria-current="true"]')||$("#sidebar"); try{ c.focus({preventScroll:true}); }catch(e){} },30); }
  function closeDrawer(){ var was=app.classList.contains("nav-open"); app.classList.remove("nav-open"); drawerModal(false); if(layout()==="pad") $("#btnNav").setAttribute("aria-expanded","false"); else $("#btnNav").removeAttribute("aria-expanded");
    if(was&&$("#sidebar").contains(actif())) $("#btnNav").focus({preventScroll:true}); }

  // ---------- Navigation clavier ----------
  function moveSelection(delta){
    var msgs=listMessages();
    if(!msgs.length) return;
    var idx=-1; for(var i=0;i<msgs.length;i++) if(msgs[i].id===state.selected){idx=i;break;}
    idx=Math.max(0,Math.min(msgs.length-1,idx+delta)); if(idx<0) idx=0;
    selectMessage(msgs[idx].id,!isPhone());
  }

  // ---------- Événements ----------
  $("#spaceBar").addEventListener("click",function(e){
    var b=e.target.closest("[data-space]"); if(!b) return;
    var sp=b.getAttribute("data-space");
    state.scope=sp; app.setAttribute("data-scope",state.scope);
    state.selected=null; clearSearch(); if(isPhone()) state.folder=state.folder||"inbox";
    renderAll(); persist(); $("#listScroll").scrollTop=0; $("#list").classList.remove("scrolled");
  });
  $("#sidebar").addEventListener("click",function(e){
    if(e.target.closest("[data-retry]")){ charger(false); return; }
    var add=e.target.closest("[data-addaccount]"); if(add){ openAddAccount(); return; }
    if(e.target.closest("[data-settings]")){ openSettings(); return; }
    var sc=e.target.closest(".scope-row[data-scope]");
    if(sc){ state.scope=sc.getAttribute("data-scope"); app.setAttribute("data-scope",state.scope);
      state.selected=null; clearSearch();
      if(isPhone()){ state.folder="inbox"; state.filter="all"; renderAll(); persist(); $("#listScroll").scrollTop=0; $("#list").classList.remove("scrolled"); go("list"); return; }
      renderAll(); persist();
      var again=$('#sidebar .scope-row[data-scope="'+state.scope+'"]'); if(again) again.focus({preventScroll:true}); return; }
    var f=e.target.closest(".folder[data-folder]");
    if(f){ state.folder=f.getAttribute("data-folder"); state.selected=null; state.filter="all"; clearSearch();
      closeDrawer(); renderAll(); persist(); $("#listScroll").scrollTop=0; $("#list").classList.remove("scrolled"); go("list"); }
  });

  // Catégorie choisie : la liste suit ; un message affiché d'une autre catégorie n'est plus sélectionné.
  function setCat(id,focus){
    if(id!=="tout"&&!isCat(id)) return;
    state.cat=id;
    var m=msgById(state.selected); if(m&&m.folder==="inbox"&&id!=="tout"&&effCat(m)!==id) state.selected=null;
    renderList(); renderReading(); persist();
    var b=$('#catBar [data-cat="'+id+'"]');
    if(b){ if(focus) b.focus({preventScroll:true}); try{ b.scrollIntoView({block:"nearest",inline:"nearest"}); }catch(e){} }
  }
  $("#catBar").addEventListener("scroll",catFade,{passive:true});
  $("#catBar").addEventListener("keydown",function(e){
    if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight") return;
    var bs=$$("#catBar .cat"), i=bs.indexOf(actif()); if(i<0) return; e.preventDefault();
    var n=bs[(i+(e.key==="ArrowRight"?1:-1)+bs.length)%bs.length]; n.focus(); try{ n.scrollIntoView({block:"nearest",inline:"nearest"}); }catch(x){} });
  $("#list").addEventListener("click",function(e){
    if(e.target.closest("[data-retry]")){ charger(false); return; }
    if(e.target.closest("[data-addaccount]")){ openAddAccount(); return; }
    var q=e.target.closest("[data-q]"); if(q){ e.stopPropagation(); doAct(q.getAttribute("data-q"),q.getAttribute("data-id")); return; }
    var c=e.target.closest("#catBar [data-cat]"); if(c){ setCat(c.getAttribute("data-cat"),true); return; }
    var f=e.target.closest("#filters [data-filter]"); if(f){ state.filter=f.getAttribute("data-filter"); renderList(); renderReading(); return; }
    if(e.target.closest("#btnFilter")){ openFilterMenu($("#btnFilter")); return; }
    var row=e.target.closest(".msg");
    if(row&&state.multi){ togglePick(row.getAttribute("data-id")); return; }
    if(row&&(e.metaKey||e.ctrlKey)&&!isPhone()){ setMulti(true,row.getAttribute("data-id")); return; }   // ⌘-clic : commence une sélection
    if(row) selectMessage(row.getAttribute("data-id"));
  });
  $("#btnSelect").addEventListener("click",function(){ setMulti(!state.multi); });
  $("#selBar").addEventListener("click",function(e){ var b=e.target.closest("[data-multi]"); if(b&&!b.disabled) multiAct(b.getAttribute("data-multi")); });
  sr.addEventListener("keydown",function(e){
    if(!state.multi||$("#overlay")) return;
    if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); setMulti(false); return; }
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="a"){ e.preventDefault(); e.stopPropagation(); state.multi=listMessages().map(function(m){return m.id;}); renderList(); return; }
    if((e.key===" "||e.key==="Enter")&&e.target.closest&&e.target.closest("#rows .msg")){ e.preventDefault(); e.stopPropagation(); togglePick(e.target.closest(".msg").getAttribute("data-id")); return; }
    if((e.key==="Delete"||e.key==="Backspace")&&!/input|textarea/i.test(e.target.tagName)){ e.preventDefault(); e.stopPropagation(); multiAct("trash"); }
  },true);
  $("#list").addEventListener("keydown",function(e){
    if(!e.target.closest("#rows")) return;
    if(e.key==="ArrowDown"){ e.preventDefault(); moveSelection(1); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); moveSelection(-1); }
    else if(e.key==="Home"||e.key==="End"){ e.preventDefault(); moveSelection(e.key==="Home"?-1e6:1e6); }
    else if((e.key==="Enter"||e.key===" ")&&e.target.classList.contains("msg")){ e.preventDefault(); selectMessage(e.target.getAttribute("data-id"),true); }
  });

  $("#reading").addEventListener("click",function(e){
    if(e.target.closest("#btnBack")){ state.selected=null; go("list"); renderReading(); return; }
    var wb=e.target.closest("#whyBtn"); if(wb){ var open=wb.getAttribute("aria-expanded")!=="true", sm=msgById(state.selected);
      wb.setAttribute("aria-expanded",String(open)); $("#whyPanel").hidden=!open; state.whyOpen=open&&sm?sm.id:null; return; }
    var n=e.target.closest("[data-nav]"); if(n){ moveSelection(+n.getAttribute("data-nav")); return; }
    if(e.target.closest("[data-signnew]")){ openSignRequest(); return; }
    var a=e.target.closest("[data-act]"); if(a){ var act=a.getAttribute("data-act"); if(act==="replyMenu") openReplyMenu(a); else doAct(act); return; }
    var op=e.target.closest("[data-open]"); if(op){ var x=msgById(op.getAttribute("data-open")); if(x){ state.folder=x.folder; renderAll(); selectMessage(x.id); } return; }
    var qk=e.target.closest("[data-quick]"); if(qk){ var m=msgById(state.selected), rm=m?replyModel(m,false):null; openCompose({to:rm?rm.to:"",subject:rm?rm.subject:"",body:qk.getAttribute("data-quick"),acct:m?m.acct:null,noTrust:rm?rm.noTrust:null}); }
  });

  $("#btnCompose").onclick=function(){ if(state.folder==="sign") openSignRequest(); else openCompose(); };
  $("#btnNav").onclick=function(){ if(isPhone()) go("mailboxes"); else if(app.classList.contains("nav-open")) closeDrawer(); else openDrawer(); };
  $("#scrim").onclick=closeDrawer;
  var sT; $("#search").addEventListener("input",function(e){ $("#searchRow").classList.toggle("has-q",!!e.target.value); clearTimeout(sT); sT=setTimeout(function(){ state.query=e.target.value; renderList(); renderReading(); },120); });
  function clearSearch(){ clearTimeout(sT); state.query=""; $("#search").value=""; $("#searchRow").classList.remove("has-q"); }
  // iPad/iPhone : bouton « Annuler » à côté du champ actif, comme une barre de recherche iOS
  $("#searchCancel").onclick=function(){ clearSearch(); var a=actif(); if(a&&a.blur) a.blur(); renderList(); renderReading(); };
  // Anneaux de focus au clavier seulement sur iPhone (le toucher n'affiche que le curseur)
  // Mode clavier : Tab, ou toute touche frappée hors d'un champ de saisie (raccourcis, flèches, Entrée…)
  sr.addEventListener("keydown",function(e){
    var a=actif(), typing=!!a&&(/^(textarea|select)$/i.test(a.tagName)||(a.tagName==="INPUT"&&!/^(button|checkbox|radio)$/i.test(a.type)));
    if(e.key==="Tab"||(!typing&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!/^(Shift|Control|Alt|Meta)$/.test(e.key))) cadre.classList.add("kbd"); },true);
  sr.addEventListener("pointerdown",function(){ cadre.classList.remove("kbd"); },true);

  // Grand titre iOS : la barre prend sa matière et son titre compact une fois le grand titre défilé.
  [["#sidebar","#sideScroll",30],["#list","#listScroll",LT_FOLD],["#reading","#readScroll",2]].forEach(function(p){
    var v=$(p[0]), s=$(p[1]);
    s.addEventListener("scroll",function(){ v.classList.toggle("scrolled",s.scrollTop>p[2]); },{passive:true});
  });

  sr.addEventListener("keydown",function(e){
    var a0=actif(), typing=!!a0&&/input|textarea|select/i.test(a0.tagName);
    if((e.metaKey||e.ctrlKey)) return;
    if(e.key==="Escape"){ var dc=$('#cDiscard [data-dpick="cancel"]');
      if(dc) dc.click(); else if(state.compose&&state.compose.dismiss) state.compose.dismiss(); else closeOverlay();
      closeDrawer(); return; }
    if(typing||cadre.classList.contains("has-sheet")) return;
    if(e.key==="/"){ e.preventDefault(); var s=$("#search"); if(isPhone()&&app.getAttribute("data-view")!=="list") go("list"); s.focus(); }
    else if(e.key==="c"||e.key==="C"){ e.preventDefault(); openCompose(); }
    else if(e.key==="r"&&state.selected){ var sm=msgById(state.selected); if(sm&&sm.folder!=="drafts"&&sm.folder!=="scheduled") doAct("reply"); }
    else if(e.key==="f"&&state.selected){ doAct("flag"); }
    else if((e.key==="e")&&state.selected){ doAct("archive"); }
    else if((e.key==="#"||e.key==="Delete"||e.key==="Backspace")&&state.selected){ e.preventDefault(); doAct("trash"); }
    else if((e.key==="j"||e.key==="k")){ moveSelection(e.key==="j"?1:-1); }
  });
  // ---------- Le côté ----------
  // L'hôte ouvre le côté voulu (options.cote, ou api.cote("pro")) ; sans demande, celui que la personne avait choisi.
  function ouvrirCote(c){ state.scope=c; state.folder="inbox"; state.selected=null; state.filter="all"; app.setAttribute("data-scope",c); }

  // ---------- Démarrage ----------
  restore();
  if(opt.cote&&COTES.indexOf(opt.cote)>=0) ouvrirCote(opt.cote);
  app.setAttribute("data-scope",state.scope);
  appliquerFormat(); placeChrome();
  renderAll();
  catReveal();
  if(restoredLost) toast(restoredLost>1?restoredLost+" envois n’ont pas été confirmés : les messages sont dans Brouillons":"Un envoi n’a pas été confirmé : le message est dans Brouillons");
  charger(false);
  // Le format suit le conteneur (la fenêtre change, le menu de l'hôte s'ouvre…) ; le module s'éteint si l'hôte a retiré son conteneur
  try{ var obsTaille=new ResizeObserver(function(){ if(!hote.isConnected){ demonter(); return; } if(appliquerFormat()) placeChrome(); catFade(); });
    obsTaille.observe(hote); finis.push(function(){ obsTaille.disconnect(); }); }catch(e){}
  var iv=setInterval(function(){ if(!hote.isConnected){ demonter(); return; } flushScheduled(); if(!document.hidden&&opt.intervalle!==0&&Date.now()-LOAD.essai>=(opt.intervalle||60000)-100) charger(true); },Math.max(250,Math.min(5000,opt.intervalle||60000)));
  finis.push(function(){ clearInterval(iv); retraits.forEach(function(r){ clearTimeout(r.tm); }); });
  sur(document,"visibilitychange",function(){ if(!document.hidden){ flushScheduled(); if(Date.now()-LOAD.essai>20000) charger(true); } });

  function demonter(){
    if(!vivant) return; vivant=false;
    retraits.forEach(function(r){ if(!r.annule) retirerCoteSource(r); });
    finis.forEach(function(f){ try{ f(); }catch(e){} });
    if(opt.titreDocument){ try{ document.title=TITRE_ORIG; }catch(e){} }
    try{ hote.remove(); }catch(e){}
  }
  return {
    demonter:demonter,
    // sans argument : le côté courant ; sinon ouvre ce côté (« pro » / « perso », s'il fait partie de options.cotes)
    cote:function(c){ if(c==null||COTES.indexOf(c)<0) return coteCourant(); ouvrirCote(c); clearSearch(); renderAll(); persist(); if(isPhone()) go("list"); return c; },
    // l'hôte dit « quelque chose a changé » : thème et format relus, données relues sauf rafraichir({donnees:false})
    rafraichir:function(o){ appliquerTheme(); if(appliquerFormat()) placeChrome(); if(!o||o.donnees!==false) return charger(false); return Promise.resolve(); }
  };
  }

window.OPCourrier = { version: 1, monter: function (conteneur, options) { return creer(conteneur, options); } };
})();
