/* OP Courrier — moteur de tri automatique (catégories + indésirables).
   Fonctions pures, sans DOM : réutilisables telles quelles dans la page et côté serveur.
   classify(msg, ctx) -> { cat, junk, spamScore, reasons:[...] }
   msg : { from:{name,email}, subject, preview, body:[str|["quote",str]], unsub:bool (en-tête List-Unsubscribe), vip:bool }
   ctx : { contacts:{email:true}, rules:{ senders:{email:cat|"junk"|"notjunk"}, domains:{domain:cat|"junk"|"notjunk"} } }
   Principe : une vraie personne reste dans Principal ; seuls les envois automatiques sont rangés
   dans Notifications / Reçus / Voyages / Promotions. Les indésirables passent avant tout, sauf contact
   connu ou règle « pas indésirable ». */
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
if (typeof module !== "undefined") module.exports = OPClassify;
