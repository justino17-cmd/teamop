// Serveur TeamOP — notifications push + e-mails automatiques
// Config lue dans /opt/teamop/config.json (générée par install.sh)
const fs = require('fs');
const path = require('path');
const express = require('express');
const webpush = require('web-push');

const CONFIG_PATH = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';
const DATA_DIR = process.env.TEAMOP_DATA || '/opt/teamop/data';
const SUBS_PATH = path.join(DATA_DIR, 'subscriptions.json');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
fs.mkdirSync(DATA_DIR, { recursive: true });

webpush.setVapidDetails('mailto:' + (config.contactEmail || 'contact@teamop.fr'), config.vapidPublicKey, config.vapidPrivateKey);

// ── stockage des abonnements push : { endpoint: {sub, teamId, userId, userName, ts} }
let subs = {};
try { subs = JSON.parse(fs.readFileSync(SUBS_PATH, 'utf8')); } catch (e) {}
let saveTimer = null;
function saveSubs() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(SUBS_PATH, JSON.stringify(subs)); } catch (e) { console.error('save subs:', e.message); }
  }, 300);
}

// ── e-mail (optionnel : rempli dans config.json → smtp)
let mailer = null;
if (config.smtp && config.smtp.host) {
  const nodemailer = require('nodemailer');
  mailer = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port || 465,
    secure: (config.smtp.port || 465) === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass }
  });
}

const app = express();
/* ⛔ UNE ROUTE `async` QUI REJETTE LAISSAIT LA REQUÊTE PENDUE (`gardien`, N1). Express 4 ne
   regarde pas la promesse que rend un gestionnaire : une exception après un `await` devenait un
   rejet orphelin (compté par le filet du processus, plus bas), et la personne en face attendait
   jusqu'au délai du mandataire — une minute — une réponse qui ne viendrait jamais. Chaque
   gestionnaire est enveloppé à l'enregistrement : un rejet va au middleware d'erreur final, qui
   répond en texte brut, sans pile, et compte l'incident. Fait main plutôt qu'une dépendance de
   plus (`express-async-errors` réécrit les entrailles du routeur). Un middleware d'erreur (quatre
   paramètres) n'est pas touché : Express le reconnaît à son arité, et l'enveloppe en a trois. */
const enveloppe = (fn) => (typeof fn !== 'function' || fn.length >= 4) ? fn : function (req, res, next) {
  let r; try { r = fn.apply(this, arguments); } catch (e) { return next(e); }
  if (r && typeof r.then === 'function') r.then(null, next);
  return r;
};
for (const m of ['get', 'post', 'put', 'delete', 'patch', 'all', 'use']) {
  const brut = app[m].bind(app);
  app[m] = (...a) => brut(...a.map(enveloppe));
}

// Le serveur n'écoute que sur 127.0.0.1, derrière un proxy : sans ceci, toutes
// les requêtes auraient la même IP (celle du proxy) et l'anti-abus plus bas
// serait inopérant. « 1 » = un seul intermédiaire de confiance devant nous.
app.set('trust proxy', 1);

app.use(express.json({ limit: '6mb' })); // large : les e-mails peuvent porter un PDF en pièce jointe (base64)

// CORS — uniquement le site TeamOP
const ORIGINS = config.origins || ['https://teamop.fr', 'https://www.teamop.fr'];
app.use((req, res, next) => {
  const o = req.headers.origin;
  if (o && ORIGINS.includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    /* Tout en-tête personnalisé DOIT figurer ici. L'app est servie par teamop.fr et appelle
       api.teamop.fr : une origine différente, donc un en-tête hors liste blanche déclenche une
       requête préalable que le navigateur refuse — et il bloque l'appel réel, silencieusement.
       Un test en ligne de commande ne peut pas l'attraper : CORS n'existe que dans le navigateur.
       X-Teamop-Kh porte la preuve de possession de la clé d'équipe sur les routes mail. */
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Teamop-Devis, X-Teamop-Kh');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Les chiffres de la tour de contrôle ne sont JAMAIS gardés par le navigateur ──
//    Express ne pose qu'un ETag : sans cet en-tête, le navigateur s'autorise à réafficher
//    d'anciens chiffres sans même rappeler le serveur (revenu mensuel, impayés, e-mails
//    support, fiches clients…). Après un rechargement de page, la tour montrerait alors un
//    état périmé — par exemple « Stripe non configuré » alors que Stripe vient d'être relié.
//    Cela évite aussi de laisser des données privées de clients dans le cache disque.
app.use('/api/monitor', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
/*    La même raison vaut, mot pour mot, pour les routes qui rendent de la correspondance :
      corps d'e-mails de fournisseurs, adresses des boîtes connectées, fiches clients. Sans
      cet en-tête, Express ne pose qu'un ETag et ces réponses se rangent dans le cache disque
      du navigateur — et dans celui de tout intermédiaire sur le chemin. */
app.use(['/api/replies', '/api/mailboxes', '/api/clients/sync'], (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
/* ── Journal des e-mails sortants + copie dans la boîte contact ──
   Chaque envoi est noté (date, destinataire, sujet) pour l'onglet Journal de la
   Tour, et reçoit une copie cachée (bcc) dans la boîte contact — SAUF les mails
   contenant des codes secrets, jamais copiés. */
const MAILS_PATH = path.join(DATA_DIR, 'mails-envoyes.json');
let mailsLog = []; try { mailsLog = JSON.parse(fs.readFileSync(MAILS_PATH, 'utf8')); } catch (e) {}
/* Rend VRAI si l'écriture a eu lieu. Sans ça, la suppression totale annonçait un ménage
   fait alors que le disque avait refusé : au redémarrage, mailsLog se rechargeait avec les
   courriers de l'entreprise effacée. C'est le motif de fermesSave(). */
function mailsSave() { try { fs.writeFileSync(MAILS_PATH, JSON.stringify(mailsLog)); return true; } catch (e) { console.error('mails save:', e.message); return false; } }
/* Journaux système (journalctl) : ils sont lus par plus de monde que la Tour et gardés plus
   longtemps. Une adresse entière, un lien de connexion ou un code n'y ont rien à faire —
   on n'y met qu'une forme masquée, assez pour reconnaître une ligne, pas pour la rejouer. */
function masqueMail(a) {
  const s = String(a || '').trim();
  const i = s.indexOf('@');
  if (i < 1) return s ? '(adresse)' : '';
  return s[0] + '***@' + s.slice(i + 1);
}
/* Une entrée du journal des e-mails. Un secret n'y entre JAMAIS — ni par le texte, ni par
   l'OBJET : c'est par l'objet que le code de confirmation était conservé en clair.
   Rend l'entrée : `mailerEnvoi` la marque si l'envoi échoue ensuite (voir plus bas). */
function mailsJournal(to, sujet, txt, secret, trace) {
  try {
    const ent = { ts: Date.now(), a: String(to || ''),
      sujet: secret ? '(objet confidentiel)' : String(sujet || '').slice(0, 140),
      txt: secret ? (trace ? String(trace).slice(0, 400) : '(contenu confidentiel — code de sécurité ou mot de passe, jamais conservé)') : String(txt || '').slice(0, 2000) };
    mailsLog.unshift(ent);
    if (mailsLog.length > 300) mailsLog.length = 300; mailsSave();
    return ent;
  } catch (e) { return null; }
}
/* ══ LES E-MAILS DE SÉCURITÉ QUE LA TOUR NE DOIT NI CACHER NI EFFACER ══════════════════════════════
   `gardien`, 27 septembre 2026 (B4) : le code d'une suppression et l'avis qui la suit partent à NOTRE
   boîte (`supprDest`, plus bas) — chez TEAM OP, contact@teamop.fr, que la Tour relève elle-même : la
   Messagerie (`mail.js`) reprend d'office la boîte support, et la relève du support range tout ce
   qui arrive dans une liste que TOUT compte de la Tour lit. Une session volée y lisait donc le code
   qu'on lui demandait, puis effaçait l'avis qui l'aurait dénoncée.
   Chacun de ces e-mails porte désormais un identifiant (`Message-ID`) tiré au sort ICI et retenu sur
   le disque : la relève du support ne le range pas, la Messagerie refuse de le déplacer, de le
   supprimer ou de le marquer, et ne le marque pas « lu » en l'ouvrant. Il reste lisible par qui lit
   cette boîte — c'est le patron qu'il doit prévenir.
   ⚠️ Ce qui n'est PAS réglé par là : un code qu'on peut LIRE dans la Tour ne protège rien. Au-delà de
   trois entreprises, si la destination est une boîte que la Tour lit (`supprDestLisible`), la
   suppression attend plutôt que d'envoyer un code inutile. */
const MAILS_PROTEGES_PATH = path.join(DATA_DIR, 'mails-proteges.json');
let mailsProteges = [];
try { const l = JSON.parse(fs.readFileSync(MAILS_PROTEGES_PATH, 'utf8')); if (Array.isArray(l)) mailsProteges = l.filter(x => typeof x === 'string').slice(-3000); } catch (e) {}
let mailsProtegesSet = new Set(mailsProteges);
function midNorm(m) { return String(m || '').trim().replace(/^<+|>+$/g, '').toLowerCase(); }
function mailProtege(mid) { const k = midNorm(mid); return !!k && mailsProtegesSet.has(k); }
function mailProtegeNouveau() {
  const dom = (adrNue((config.smtp && (config.smtp.from || config.smtp.user)) || '').split('@')[1] || '').replace(/[^a-z0-9.-]/g, '') || 'teamop.fr';
  const id = require('crypto').randomBytes(16).toString('hex') + '.securite@' + dom;
  mailsProteges.push(id);
  if (mailsProteges.length > 3000) mailsProteges = mailsProteges.slice(-3000);
  mailsProtegesSet = new Set(mailsProteges);
  try { fs.writeFileSync(MAILS_PROTEGES_PATH + '.tmp', JSON.stringify(mailsProteges)); fs.renameSync(MAILS_PROTEGES_PATH + '.tmp', MAILS_PROTEGES_PATH); }
  catch (e) { console.error('mails-proteges.json non écrit :', e.code || 'erreur disque'); }
  return '<' + id + '>';
}
function mailerEnvoi(opts) {
  // confidentiel : code de sécurité ou mot de passe → jamais journalisé ni copié
  const secret = opts.confidentiel === true || /code/i.test(String(opts.subject || ''));
  // trace : ce qu'on garde d'un e-mail confidentiel (destinataire, lien envoyé, espace…) — jamais le secret lui-même
  const ent = mailsJournal(opts.to, opts.subject, opts.text, secret, opts.trace);
  const o2 = Object.assign({}, opts); delete o2.confidentiel; delete o2.trace; delete o2.diffusion;
  try {
    const moi = String(config.notifDemandes || (config.smtp && (config.smtp.from || config.smtp.user)) || '').toLowerCase();
    /* La copie à soi-même est utile pour un envoi unitaire — on garde une trace de ce qu'on a
       écrit à un client. Elle devient nuisible sur une diffusion : l'annonce revient UNE FOIS PAR
       ENTREPRISE dans la boîte support. Avec deux entreprises c'est déjà deux copies ; avec
       cinquante, les vrais messages clients sont noyés. */
    if (moi && !secret && !opts.diffusion && String(opts.to || '').toLowerCase() !== moi) o2.bcc = moi;
    // un e-mail confidentiel adressé à notre boîte de sécurité : la Tour ne le cache ni ne l'efface (voir plus haut)
    if (secret && adrNue(opts.to) && adrNue(opts.to) === adrNue(supprDest())) o2.messageId = mailProtegeNouveau();
  } catch (e) {}
  // Une diffusion (annonce) doit offrir une sortie : les messageries lisent cet
  // en-tête, et son absence pèse dans le classement en spam.
  if (opts.diffusion) o2.headers = Object.assign({}, o2.headers, { 'List-Unsubscribe': '<mailto:contact@teamop.fr?subject=Stop%20annonces>' });
  const envoi = mailer.sendMail(o2);
  /* ⛔ LE JOURNAL NE DIT PAS « PARTI » POUR UN E-MAIL QUI N'EST PAS PARTI (`gardien`, C2). L'entrée
     s'écrit AVANT l'envoi : sans ce marquage, l'avis d'une suppression refusé par le serveur d'e-mails
     se lisait dans « Journal des e-mails » comme envoyé. L'objet porte la marque : c'est ce que toute
     Tour affiche déjà, sans changer une ligne de la page. Un envoi qui dépasse le délai de son appelant
     (l'avis d'une suppression : huit secondes) se dit « PAS ENCORE PARTI », puis « parti en retard » ou
     « NON PARTI » — sinon un serveur d'e-mails muet laissait l'entrée muette, elle aussi, trente secondes. */
  const base = ent ? ent.sujet : '';
  const marquer = (avant, apres) => { if (ent) { ent.sujet = avant + base + apres; mailsSave(); } };
  envoi.then(
    () => { if (ent && ent.retard) { delete ent.retard; marquer('', ' (parti en retard)'); } },
    () => { if (ent && !ent.echec) { ent.echec = 1; delete ent.retard; marquer('⚠️ NON PARTI — ', ''); } });
  envoi.enRetard = () => { if (ent && !ent.echec && !ent.retard) { ent.retard = 1; marquer('⚠️ PAS ENCORE PARTI — ', ''); } };
  return envoi;
}

// ── Anti-abus : deux paliers ────────────────────────────────────────────────
//
//  Palier large pour toute l'API, palier strict pour ce qui coûte cher ou
//  engage de l'argent : paiement, envoi de code par courriel, assistant IA.
//
//  Le palier strict reste à 20/min et non plus bas : nos clients sont des
//  entreprises dont plusieurs salariés partagent une seule IP publique.
const PLAFOND_GLOBAL = 120;    // requêtes / minute / IP
const PLAFOND_STRICT = 20;     // idem, sur les routes sensibles
const MAX_IP_SUIVIES = 20000;  // borne mémoire (voir plus bas)
/* ⛔ LE BATTEMENT DE VIE A SON PROPRE COMPTEUR, ET IL NE TOUCHE PAS AU BUDGET DES AUTRES.
   Chaque appareil fait HEAD /health toutes les 20 s ; l'écran « Connexion requise » d'app.html
   refait GET /health toutes les 6 s tant qu'il n'a pas de 200 ; et le client compte un 429
   comme un serveur MORT (r.ok est faux). Tant que /health partageait le plafond global, un
   bureau entier derrière une seule IP s'auto-verrouillait : quelques 429 au matin → écrans
   hors ligne → relances toutes les 6 s sur dix appareils → plus de 120/min en permanence →
   tout le monde bloqué tant qu'ils réessaient. Constaté le 11 septembre 2026 pendant
   l'incident ELAN (écran « Connexion requise » alors que l'API répondait 200 d'ailleurs).
   600/min laisse vingt appareils en pleine reprise (20 × 10 relances + 20 × 3 battements = 260)
   très en dessous, et reste une borne : /health est une réponse JSON sans lecture disque. */
const PLAFOND_BATTEMENT = 600; // /health seule, par minute et par IP, hors budget global
/* ⛔ LES PIÈCES JOINTES AUSSI, ET C'EST UN BLOQUANT DE PUBLICATION, PAS UN CONFORT. Depuis que
   les photos sortent du document Firestore (étape 0), AFFICHER une photo coûte une requête
   `POST /api/pieces/lire`, et en AJOUTER une coûte un dépôt — `intPhotoAdd` en fait un par
   photo. Six interventions à cinq photos, c'est trente requêtes pour UNE personne, et tout le
   bureau d'ELAN partage une seule IP publique.
   ⛔ MESURÉ sur le vrai serveur : 200 `POST /api/pieces/lire` depuis une seule IP → premier 429
   à la requête n° 121, et juste après `GET /api/espaces/etat` répond 429 lui aussi. Ce n'est
   donc pas « les photos ne s'affichent plus » : c'est TOUTE l'API par terre pour ce bureau —
   les bons de commande ne partent plus, l'assistant devis ne répond plus. Exactement la
   spirale du 11 septembre, par une autre porte.
   ⚠️ Un plafond RÉEL, jamais une exemption — même raisonnement que pour le socle. 900/min/IP
   laisse dix personnes ouvrir trois interventions à dix photos dans la même minute (300) très
   en dessous, et reste une borne : une pièce est un fichier sur disque, pas une réponse JSON. */
const PLAFOND_PIECES = 900;    // /api/pieces/* seules, par minute et par IP, hors budget global
/* ⛔ LE SOCLE A SON PROPRE COMPTEUR, ET IL EST RÉEL — jamais « exempté ». Un appareil en
   synchro fait beaucoup plus de requêtes qu'un écran : 120/min/IP l'étranglerait, et toute une
   équipe derrière la box du bureau partage une seule IP. Mais exempter `/api/op/*` ferait de
   `/api/op/session` la SEULE route du serveur sans aucun plafond avant preuve — c'est-à-dire
   une porte ouverte pour épuiser la machine. 1 200/min/IP est généreux et reste une borne.
   ⚠️ C'est un plafond par IP, donc avant toute preuve. Le budget PAR ESPACE, lui, se compte
   APRÈS la preuve, dans `op-socle.js` : compté avant, il deviendrait une arme de déni de
   service — n'importe qui épuiserait le quota d'une entreprise en tapant son identifiant. */
const PLAFOND_DONNEES = 1200;  // /api/op/* seules, par minute et par IP
/* ⛔ LE DOCUMENT D'ÉQUIPE AUSSI — la synchro d'OP GESTION tout entière passe par là depuis la
   sortie de Firebase (`documents.js`). Un téléphone qui écoute repose sa question toutes les
   25 s, relit avant chaque envoi, puis écrit : vingt appareils derrière la box d'un bureau
   dépassent les 120/min du budget global en une matinée ordinaire, et un 429 sur la synchro,
   c'est le 11 septembre par une autre porte. Même règle que les pièces : les TROIS chemins qui
   existent, pas le préfixe, et un vrai plafond, jamais une exemption. */
const PLAFOND_DOCUMENTS = 1200; // /api/doc/(lire|ecrire|attendre) seules, par minute et par IP

/* « espaces/(ouvrir|relance) » et non « espaces » tout court : /api/espaces/etat est appelé à
   chaque reprise d'onglet par une entreprise en attente de paiement, et le palier strict est
   partagé par IP entre toutes ces familles — plusieurs salariés derrière une seule IP de bureau
   l'épuiseraient pour l'assistant devis en même temps. */
/* « espaces/comptes » n'y figure PAS, et c'est un choix : les routes serrées partagent 20
   requêtes par minute et par IP, or ce dépôt part de chaque appareil qui se connecte —
   toute une équipe qui arrive le matin derrière la même box les épuiserait. Il est déjà
   borné par son quota horaire à lui, il exige la clé d'équipe, et il coûte peu. */
const ROUTES_SENSIBLES = /^\/api\/(stripe|devis|sendcode|mdp|beta|promo|espaces\/(ouvrir|connexion|relance|libre))/;

let compteurs = new Map();
setInterval(() => { compteurs = new Map(); }, 60000).unref();

/* Chaque 429 du seau par IP se compte (dates seulement, rien sur l'adresse) : `/health` publie le
   nombre de la dernière heure. Avant le 26 septembre 2026, un bureau entier refusé ne se voyait nulle part.
   ⛔ PAR FAMILLE (gardien, contre-vérification de la v751) : compté en un seul tas, n'importe quel robot qui
   balaie le site (180 requêtes par minute sur n'importe quelle route, ou 25 par minute sur `/api/mdp/lien`)
   dépassait le seuil et faisait crier la surveillance — le vrai signal, « un bureau entier ne se synchronise
   plus », était noyé. Seule la famille `synchro` (document d'équipe, socle, photos : les routes qu'un appareil
   au travail appelle en boucle) porte l'alarme ; les autres sont publiées, lues depuis la Tour, pas criées. */
const refus429 = { synchro: [], autres: [] };
function tropDeRequetes(res, famille) {
  const a = refus429[famille === 'synchro' ? 'synchro' : 'autres'];
  a.push(Date.now()); if (a.length > 2000) a.splice(0, a.length - 2000);
  res.setHeader('Retry-After', '60');
  return res.status(429).json({ error: 'trop de requêtes' });
}

app.use((req, res, next) => {
  // Sous attaque, l'adversaire fait varier son identité : sans borne, la table
  // grossit jusqu'à saturer la mémoire du serveur. On repart de zéro plutôt.
  if (compteurs.size > MAX_IP_SUIVIES) compteurs = new Map();

  // req.ip, et non l'en-tête brut : X-Forwarded-For est fourni par le client,
  // qui peut le préfixer à volonté pour obtenir une clé neuve à chaque requête
  // et ne jamais atteindre la limite. Avec « trust proxy », Express ne retient
  // que la valeur ajoutée par notre propre proxy.
  const ip = req.ip || '?';

  // Le battement de vie compte à part, et ne consomme pas le budget global (voir PLAFOND_BATTEMENT).
  if (req.path === '/health') {
    const bat = (compteurs.get('h:' + ip) || 0) + 1;
    compteurs.set('h:' + ip, bat);
    if (bat > PLAFOND_BATTEMENT) return tropDeRequetes(res, 'autres');
    return next();
  }

  /* Le socle compte à part, comme le battement : voir PLAFOND_DONNEES.
     ⛔ MAIS SEULEMENT S'IL EST ALLUMÉ. Sans cette condition, `/api/op/*` sortait du budget
     global de 120/min/IP DÈS AUJOURD'HUI, drapeau éteint : des chemins qui répondent 404
     bénéficiaient d'un plafond dix fois plus large que le reste du serveur, en production,
     pour rien. Un assouplissement qui ne sert personne ne doit pas exister. */
  if (opSocle && opSocle.actif && req.path.startsWith('/api/op/')) {
    const d = (compteurs.get('d:' + ip) || 0) + 1;
    compteurs.set('d:' + ip, d);
    if (d > PLAFOND_DONNEES) return tropDeRequetes(res, 'synchro');
    return next();
  }

  /* Le document d'équipe compte à part — voir PLAFOND_DOCUMENTS. `/i` pour la même raison que
     les pièces : Express route sans tenir compte de la casse. */
  if (documentsMod && /^\/api\/doc\/(lire|ecrire|attendre)\/?$/i.test(req.path)) {
    const dd = (compteurs.get('doc:' + ip) || 0) + 1;
    compteurs.set('doc:' + ip, dd);
    if (dd > PLAFOND_DOCUMENTS) return tropDeRequetes(res, 'synchro');
    return next();
  }

  /* Les pièces comptent à part, comme le battement et le socle — voir PLAFOND_PIECES.
     ⛔ LES QUATRE CHEMINS QUI EXISTENT, PAS LE PRÉFIXE. La première version testait
     `req.path.startsWith('/api/pieces/')` en promettant, dans son propre commentaire, que
     « des chemins qui répondent 404 ne bénéficieraient pas d'un plafond plus large ». La
     condition `pieces &&` ne couvrait que le cas où le module n'est PAS monté — c'est-à-dire
     jamais en production. `GET /api/pieces/nimporte-quoi` en boucle passait donc dans le seau
     à 900 au lieu du budget global à 120, pour un 404. Un commentaire n'est pas une garde.
     ⚠️ Et `/i`, parce qu'Express route SANS tenir compte de la casse : `/api/PIECES/lire`
     atteint le vrai gestionnaire. Sans le drapeau, il était compté dans le mauvais seau — une
     faute de frappe suffisait à changer de plafond. */
  if (pieces && /^\/api\/pieces\/(deposer|lire|supprimer|etat)\/?$/i.test(req.path)) {
    const p2 = (compteurs.get('p:' + ip) || 0) + 1;
    compteurs.set('p:' + ip, p2);
    if (p2 > PLAFOND_PIECES) return tropDeRequetes(res, 'synchro');
    return next();
  }

  const global = (compteurs.get('g:' + ip) || 0) + 1;
  compteurs.set('g:' + ip, global);
  if (global > PLAFOND_GLOBAL) return tropDeRequetes(res, 'autres');

  if (ROUTES_SENSIBLES.test(req.path)) {
    const strict = (compteurs.get('s:' + ip) || 0) + 1;
    compteurs.set('s:' + ip, strict);
    if (strict > PLAFOND_STRICT) return tropDeRequetes(res, 'autres');
  }

  next();
});

// ── codes de sécurité (actions sensibles : remise à zéro, etc.) ──
const codes = new Map();
// Mot de passe oublié : nous fabriquons le lien et nous envoyons l'e-mail.
// La réponse est TOUJOURS la même, compte existant ou non — sinon cette route
// deviendrait un moyen de savoir qui travaille dans quelle entreprise.
app.post('/api/mdp/lien', async (req, res) => {
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return res.status(400).json({ error: 'email_invalide' });
  if (!fbAdminCle) return res.status(503).json({ error: 'firebase_off' });
  if (!mailer) return res.status(503).json({ error: 'email_off' });

  // la page de retour ne peut être que chez nous
  const brut = String((req.body || {}).suite || '');
  const suite = /^https:\/\/(www\.)?teamop\.fr\/[A-Za-z0-9._~\-\/]{0,120}$/.test(brut) ? brut : 'https://teamop.fr/espace.html';

  // On demande le lien à l'Identity Toolkit sans qu'il envoie l'e-mail lui-même
  // (returnOobLink), avec la clé de service que le serveur utilise déjà ailleurs.
  let oob = null;
  try {
    const tok = await fbAdminJeton();
    if (!tok) return res.status(503).json({ error: 'firebase_off' });
    const r = await fbAdminFetch(IDTK_URL + '/projects/' + FB_PROJET + '/accounts:sendOobCode',
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: email, returnOobLink: true }) }, tok);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = String((j.error && j.error.message) || r.status);
      // compte inconnu : on répond comme pour un succès, sans rien envoyer
      if (/EMAIL_NOT_FOUND/i.test(msg)) return res.json({ ok: true });
      console.error('mdp/lien :', msg.slice(0, 120));
      return res.status(500).json({ error: 'echec' });
    }
    // compte inconnu : Google répond 200 sans lien — sa propre protection contre
    // l'énumération. On répond comme pour un succès, sans rien envoyer.
    if (!j.oobLink) return res.json({ ok: true });
    oob = new URL(String(j.oobLink)).searchParams.get('oobCode');
  } catch (e) {
    console.error('mdp/lien :', String((e && e.message) || e).slice(0, 120));
    return res.status(500).json({ error: 'echec' });
  }
  if (!oob) return res.status(500).json({ error: 'echec' });

  const lien = 'https://teamop.fr/reinit.html?mode=resetPassword&oobCode=' + encodeURIComponent(oob) +
               '&continueUrl=' + encodeURIComponent(suite);
  try {
    await mailerEnvoi({
      // le lien vaut le mot de passe : il ne va ni au journal, ni en copie
      confidentiel: true, trace: 'lien de réinitialisation → ' + masqueMail(email),
      from: config.smtp.from || config.smtp.user, to: email,
      subject: 'TEAM OP — réinitialisez votre mot de passe',
      text: 'Bonjour,\n\nvous avez demandé à réinitialiser votre mot de passe TEAM OP.\n\n' + lien +
            '\n\nCe lien ne sert qu\'une fois et expire dans une heure.\nSi vous n\'êtes pas à l\'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.\n\n— L\'équipe TEAM OP · teamop.fr',
      html: mailTeamOP({ chip: 'Sécurité', chipBg: '#FFF3E0', chipColor: '#B26E12',
        titre: 'Réinitialisez votre mot de passe 🔑',
        corpsHtml: 'Bonjour,<br>vous avez demandé un nouveau mot de passe. Le bouton ci-dessous vous mène à la page où le choisir.',
        blocHtml: '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7FB;border:1px solid #E3E8F1;border-radius:12px"><tr><td style="padding:14px 18px;font-size:13px;line-height:1.7;color:#4A5A7A">Ce lien ne sert <b>qu\'une fois</b> et expire dans <b>une heure</b>. Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.</td></tr></table>',
        boutonTxt: 'Choisir mon mot de passe', boutonUrl: lien })
    });
  } catch (e) { console.error('mdp/lien envoi :', String(e.message || e).slice(0, 120)); return res.status(500).json({ error: 'echec' }); }
  res.json({ ok: true });
});
app.post('/api/sendcode', async (req, res) => {
  const { teamId, email, purpose } = req.body || {};
  if (!teamId || !email) return res.status(400).json({ error: 'teamId et email requis' });
  if (!mailer) return res.status(503).json({ error: 'email_off' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(teamId + '|' + (purpose || 'reset'), { code, email, exp: Date.now() + 10 * 60000, tries: 0 });
  try {
    await mailerEnvoi({
      // le code ne voyage PAS dans l'objet : l'objet est conservé au journal, le corps ne l'est pas
      confidentiel: true, trace: 'code de confirmation → ' + masqueMail(email) + ' · espace ' + String(teamId).slice(0, 40),
      from: config.smtp.from || config.smtp.user, to: email,
      subject: 'TeamOP — votre code de confirmation',
      text: 'Votre code de confirmation TeamOP : ' + code + '\n\nIl expire dans 10 minutes.\nSi vous n\'êtes pas à l\'origine de cette demande, ignorez ce message et vérifiez la sécurité de votre compte.',
      html: mailTeamOP({ chip: 'Sécurité', chipBg: '#FFF3E0', chipColor: '#B26E12', titre: 'Votre code de confirmation 🔐',
        corpsHtml: 'Bonjour,<br>voici le code demandé dans votre application. Il ne sert qu\'une fois.',
        blocHtml: MAIL_BLOCS.code(code) + '<div style="font-size:12.5px;color:#93A2BF;padding-top:14px">Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message et vérifiez la sécurité de votre compte.</div>' })
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// le compte n'a pas d'e-mail : le code part à l'adresse de l'ENTREPRISE (l'annuaire),
// et le responsable le transmet — jamais à une adresse tapée librement.
app.post('/api/sendcode-entreprise', async (req, res) => {
  const { teamId, purpose, login } = req.body || {};
  if (!teamId) return res.status(400).json({ error: 'teamId requis' });
  if (!mailer) return res.status(503).json({ error: 'email_off' });
  const e = Object.values(espacesReg).find(x => {
    if (x.t) return x.t === teamId;
    try { return String(JSON.parse(Buffer.from(x.code, 'base64').toString('utf8')).t || '') === teamId; } catch (err) { return false; }
  });
  if (!e || !e.email) return res.status(404).json({ error: 'entreprise_inconnue' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(teamId + '|' + (purpose || 'reset'), { code, email: e.email, exp: Date.now() + 10 * 60000, tries: 0 });
  try {
    const loginSafe = monStr(login, 40).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    await mailerEnvoi({
      // idem : le code reste dans le corps (jamais journalisé), l'objet n'en porte rien
      confidentiel: true, trace: 'code de confirmation (équipe) → ' + masqueMail(e.email) + ' · @' + monStr(login, 40),
      from: config.smtp.from || config.smtp.user, to: e.email,
      subject: 'TeamOP — un code de confirmation pour votre équipe',
      text: 'Un membre de votre équipe (identifiant « ' + monStr(login, 40) + ' ») a oublié son mot de passe OP GESTION, et son compte n\'a pas d\'adresse e-mail enregistrée.\n\nCode de confirmation à lui transmettre : ' + code + '\n\nIl expire dans 10 minutes. Si personne dans votre équipe n\'est à l\'origine de cette demande, ignorez ce message.',
      html: mailTeamOP({ chip: 'Sécurité', chipBg: '#FFF3E0', chipColor: '#B26E12', titre: 'Un code pour votre équipe 🔐',
        corpsHtml: 'Bonjour,<br>ce code arrive à l\'adresse de l\'entreprise, car le compte concerné n\'a pas d\'adresse e-mail enregistrée.',
        blocHtml: MAIL_BLOCS.transmettre(loginSafe) + '<div style="height:14px"></div>' + MAIL_BLOCS.code(code) + '<div style="font-size:12.5px;color:#93A2BF;padding-top:14px">Si personne dans votre équipe n\'est à l\'origine de cette demande, ignorez ce message.</div>' }) });
    const masque = String(e.email).replace(/^(.{2})[^@]*(@.*)$/, '$1•••$2');
    res.json({ ok: true, envoye: masque });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/checkcode', (req, res) => {
  const { teamId, code, purpose } = req.body || {};
  const k = (teamId || '') + '|' + (purpose || 'reset');
  const c = codes.get(k);
  if (!c || Date.now() > c.exp) return res.status(400).json({ ok: false, error: 'expiré' });
  c.tries = (c.tries || 0) + 1;
  if (c.tries > 5) { codes.delete(k); return res.status(429).json({ ok: false, error: 'trop d\'essais' }); }
  if (String(code) !== c.code) return res.status(400).json({ ok: false, error: 'code incorrect' });
  codes.delete(k);
  res.json({ ok: true });
});

let lastRefus = null;   // dernier refus d'envoi d'e-mail (diagnostic) : { ts, raison }
/* ⛔ UN REFUS SMTP NE VOYAGE PAS EN CLAIR SUR `/health`. `lastRefus` est publié par `/health`,
   qui est PUBLIQUE et sans clé — et un refus de serveur de messagerie porte presque toujours
   l'adresse concernée : « 550 5.1.1 <client@exemple.fr>: Recipient address rejected ». Deux
   points d'appel y mettaient `e.message` tel quel, DEUX LIGNES sous le commentaire qui
   l'interdit (« ni identifiant, ni slug, ni adresse — un motif générique »). On rend donc le
   CODE du refus, qui suffit au dépannage (auth, connexion, destinataire, quota) et ne désigne
   personne. Le message entier reste dans la réponse HTTP à l'appelant — qui, lui, est déjà
   l'expéditeur — et dans le journal du VPS, qui n'est pas public.
   ⚠️ Relevé le 19 septembre 2026, et il est DÉPLOYÉ : c'est le seul défaut de cette série qui
   touche une exposition réelle aujourd'hui. */
function refusSmtp(e) {
  const code = String((e && (e.code || e.responseCode)) || '').slice(0, 24).replace(/[^A-Za-z0-9_-]/g, '');
  const m = String((e && e.message) || '');
  const famille = /auth/i.test(m) ? 'authentification'
    : /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET/i.test(code + m) ? 'connexion'
    : /recipient|mailbox|user unknown|550|553/i.test(m) ? 'destinataire refusé'
    : /quota|rate|too many|421|450/i.test(m) ? 'quota du serveur de messagerie'
    : 'autre';
  return 'SMTP: ' + famille + (code ? ' (' + code + ')' : '');
}
/* ══ LE FILET DU PROCESSUS ═════════════════════════════════════════════════════════════════
   ⛔ UNE PROMESSE REJETÉE SANS GESTIONNAIRE ARRÊTE NODE 22 — donc l'API de TOUTES les entreprises,
   et chaque écoute en cours, le temps que systemd relance (3 s). Le commentaire de
   `fbRevoquerEquipe` le relevait déjà : « ce fichier n'a ni `unhandledRejection` ni middleware
   d'erreur ». On note, on dit OÙ (les deux premières lignes de la pile, jamais le message — un
   message peut porter une adresse ou un nom de client), et on continue : une opération de fond
   qui échoue ne justifie pas de couper tout le monde. `/health` publie le compte de la dernière
   heure (`processus`), et la surveillance crie dès le premier.
   ⚠️ `uncaughtException` n'est PAS attrapé, exprès : une exception synchrone non rattrapée peut
   laisser l'état du processus à moitié écrit, et redémarrer est alors la seule réponse sûre. */
const incidents = { rejet: [], erreur: [] };
const incidentNoter = (k) => { const a = incidents[k]; a.push(Date.now()); if (a.length > 500) a.splice(0, a.length - 500); };
const incidentsHeure = (k) => { const lim = Date.now() - 3600000; return incidents[k].filter(t => t > lim).length; };
const incidentOu = (e) => String((e && e.stack) || '').split('\n').slice(1, 3).map(l => l.trim()).join(' | ').slice(0, 300);
process.on('unhandledRejection', (r) => {
  incidentNoter('rejet');
  console.error('⛔ promesse rejetée sans gestionnaire —', String((r && (r.code || r.name)) || typeof r).slice(0, 40), '·', incidentOu(r));
});
app.get('/health', (req, res) => res.json({ ok: true, v: 5, histo: true, annonce: ANNONCE.version, uptime: Math.round(process.uptime()), subs: Object.keys(subs).length, email: !!mailer, atts: !!pieces, boite: !!(config.imap && config.imap.user), stripe: !!(config.stripe && config.stripe.secretKey), stripeEchecMin: stripeEchecMin(), bugs1h: bugTimes.filter(t => t > Date.now() - 3600000).length, bugs24h: bugTimes.filter(t => t > Date.now() - 86400000).length, lastRefus,
  /* Quatre entiers agrégés : ils disent si la porte des routes mail peut se fermer,
     et ne disent rien de personne — ni adresse, ni espace, ni contenu. Sans eux,
     la suite se déciderait à l'aveugle : /api/mail/cles est protégée par une clé de
     serveur que Justin n'a pas. « absent » et « inconnu » à zéro = on peut fermer. */
  cles: { valide: cleEquipeVu.valide, absent: cleEquipeVu.absent, invalide: cleEquipeVu.invalide,
          inconnu: cleEquipeVu.inconnu, depuis: cleEquipeVu.depuis, parRoute: cleEquipeParRoute },
  /* Depuis la phase 2 : ce que les deux routes de lecture ont REFUSÉ. Agrégé par motif,
     sans espace ni adresse — c'est ce compteur qui dit, en une seconde et sans clé, si la
     fermeture a pris une vraie entreprise au passage. S'il monte, l'interrupteur
     « mailPreuve: false » rouvre le temps de comprendre (voir cleEquipeExige). */
  mailRefus: { n: mailRefus.n, parMotif: mailRefus.parMotif, ts: mailRefus.ts },
  /* Le socle : allumé ou non, combien de bases, la clé maître est-elle là, combien de flux
     tenus. ⛔ AUCUN NOM D'ENTREPRISE, AUCUN POIDS — /health est publique, et y nommer un
     espace dirait au monde quelles entreprises existent. Et `routesDoublons` : voir le
     contrôle au démarrage, plus bas. */
  /* ⛔ TROIS ÉTATS, PAS DEUX. `{actif:false}` seul ne distingue pas « éteint par décision » de
     « cassé au démarrage » — et ce dépôt a payé DEUX fois pour cette confusion précise
     (`_mailboxes`, `syncDecrypt`). Un socle qui refuse de se monter doit se voir. */
  socle: (opSocle && opSocle.sante) ? opSocle.sante() : (opSocle ? { actif: false } : { actif: false, erreur: 'montage' }),
  /* Le portail client : voir `etatPortail` plus bas pour les trois états et pourquoi ce
     n'est PAS un nombre. `surveillance.js` alarme sur `erreur`, jamais sur `actif:false`
     seul — une alarme qui sonne sur un état voulu devient du bruit, puis une alarme qu'on
     ignore, puis une alarme qui ne sert plus à rien le jour où elle dit vrai. */
  portail: etatPortail,
  /* Le document d'équipe rangé chez nous (`documents.js`) — la synchro d'OP GESTION depuis la
     sortie de Firebase. Des compteurs et des booléens, jamais un identifiant d'espace.
     `surveillance.js` crie sur un module non monté, un document illisible, une écriture ou une
     copie depuis Firebase qui échouent : chacun de ces états est une entreprise qui ne se
     synchronise plus, et aucun ne se voit depuis l'application d'une autre. */
  documents: documentsMod ? documentsMod.sante() : { actif: false, erreur: 'montage' },
  /* Le filet du processus (voir plus haut) : des nombres de la dernière heure, rien sur personne. */
  processus: { rejets1h: incidentsHeure('rejet'), erreurs1h: incidentsHeure('erreur') },
  /* Les 429 du seau par IP dans la dernière heure : un nombre, jamais une adresse. */
  limites: { refusSynchro1h: refus429.synchro.filter(t => t > Date.now() - 3600000).length,
             refusAutres1h: refus429.autres.filter(t => t > Date.now() - 3600000).length },
  /* L'horloge des 24 mois : tourne-t-elle, son dernier balayage a-t-il réussi, y a-t-il AU
     MOINS une entreprise en préavis, AU MOINS une échue. ⛔⛔ DES BOOLÉENS, PLUS AUCUN NOMBRE
     (24 septembre 2026, relevé par `gardien`) : les comptes — combien ne paient pas, combien de
     prospects — étaient un tableau de bord commercial publié à qui passe. Voir `santePublique`
     dans `conservation.js`. Combien et qui : `/api/monitor/conservation`, gardée. */
  conservation: conservation ? Object.assign({ actif: true }, conservation.santePublique()) : etatConservation,
  /* Les deux registres dont la perte ne se voit pas : l'annuaire des entreprises et la liste des
     fermetures. `false` = le fichier existe mais n'a pas pu être lu — il n'est plus réécrit, et la
     surveillance crie. Deux booléens : rien sur personne. */
  registres: { espaces: !espacesIllisible, fermes: !fermesIllisible, promos: !promosIllisible },
  routesDoublons: routesDoublons.length,
  /* Étape 0 du socle : où en est le stockage des pièces jointes.
     ⛔ UN POURCENTAGE ARRONDI À 5 %, PAS LE NOMBRE D'OCTETS, et jamais par espace. /health est
     PUBLIQUE : le poids exact des pièces est un journal de l'activité de terrain de tous les
     clients — il monte quand les techniciens photographient, il stagne le dimanche. Un palier
     répond à la seule question qu'on se pose en exploitation (« reste-t-il de la place ? »)
     sans rien dire de personne.
     ⛔ ET `sante()` NE TOUCHE PAS AU DISQUE : le total est tenu en mémoire. La première
     version balayait tous les dossiers d'entreprises depuis cette route publique et sans clé —
     mesuré : 73 ms pour 21 000 fichiers, sur la boucle d'événements, donc tout le serveur gelé
     pour tout le monde, à la demande de n'importe qui. */
  pieces: pieces ? pieces.sante() : null,
  /* La sauvegarde hors site, en trois champs et rien de plus : est-elle active, la dernière
     a-t-elle réussi, et quel âge a-t-elle. ⛔ Jamais son POIDS — c'est le volume de données de
     tous les clients réunis, donc un journal de leur activité, exactement ce que le compteur
     des pièces jointes arrondit déjà pour cette raison. Ni le nom du coffre : /health est
     publique. Le détail est servi à la Tour, qui exige le patron. */
  /* ⛔ TROIS ÉTATS, PAS DEUX — la même règle que le socle vingt lignes plus haut, qui n'avait
     pas été appliquée ICI, c'est-à-dire précisément là où la panne a eu lieu. Le 19 septembre,
     une zone morte temporelle a laissé `sauvegarde` à `null` avec une configuration PARFAITE :
     `/health` rendait `{active:false}`, et la surveillance a classé ça « pas encore branchée »
     — donc un murmure une fois par jour, au lieu d'une alarme. `configuree:true` avec
     `active:false` veut dire : quelqu'un a réglé la sauvegarde et elle NE MARCHE PAS. */
  sauvegarde: sauvegarde ? sauvegarde.sante()
    : { active: false, configuree: !!(config.sauvegarde), erreur: config.sauvegarde ? 'montage' : '' },
  /* ⛔ L'ÉCHÉANCE DU JETON GITHUB, PARCE QUE RIEN NE LA SURVEILLAIT. Le jeton du VPS expire à
     date fixe ; le jour venu, « proposer un correctif » depuis la Tour tombe en 401 et personne
     n'est prévenu — on cherche, on accuse le réseau, on finit par retrouver la date dans une
     fiche. Un entier de jours restants ne dit rien de personne et permet à la surveillance
     horaire de prévenir DEUX SEMAINES avant. `null` quand la date n'est pas renseignée : on ne
     prétend pas savoir ce qu'on ignore. */
  /* ⛔ UN BOOLÉEN, PAS LE NOMBRE DE JOURS. `gardien` l'a relevé : /health est publique et sans
     identité, et « le jeton GitHub du VPS expire dans 30 jours » date un identifiant interne et
     révèle son existence à qui passe. « Bientôt ou pas » suffit à la surveillance, qui n'a
     besoin que de savoir s'il faut prévenir. `null` tant que la date n'est pas renseignée : on
     ne prétend pas savoir ce qu'on ignore. */
  ghExpireBientot: (j => (j === null ? null : j <= 15))(ghJoursRestants()) }));

/* Jours avant l'expiration du jeton GitHub, d'après `github.expire` (AAAA-MM-JJ) dans
   config.json. Une date absente ou illisible rend null — jamais 0, qui voudrait dire
   « il expire aujourd'hui » et déclencherait une fausse alerte. */
function ghJoursRestants() {
  const d = Date.parse(String((config.github || {}).expire || '') + 'T00:00:00Z');
  if (!Number.isFinite(d)) return null;
  /* ⛔ EN JOURS DE CALENDRIER, PAS EN DURÉE. On compare deux minuits UTC, jamais « maintenant »
     à un minuit : sinon le résultat dépend de l'HEURE à laquelle on interroge — une échéance à
     30 jours annonce 30 le matin et 29 le soir. Trouvé par `tests/test-722.js`, qui aurait été
     vert à 1 h et rouge à 20 h : un banc qui change d'avis selon l'heure est pire qu'absent, on
     finit par le croire capricieux et on cesse de le lire. Zéro veut dire « expire aujourd'hui »,
     et la surveillance traite zéro comme expiré — c'est le bon côté pour se tromper. */
  const minuitAujourdhui = Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.round((d - minuitAujourdhui) / 86400000);
}

// ── Assistant devis : l'agent qui compose un devis à partir d'une conversation.
//    Il ne fait que parler à Claude ; c'est OP GESTION qui enregistre le devis
//    et produit le PDF. Sans clé Anthropic dans config.json, la route répond 503
//    et le reste du serveur fonctionne normalement.
try {
  require('./agent-devis').monterAgentDevis(app, config, DATA_DIR);
} catch (e) {
  console.error('assistant devis non monté :', e.message);
}

// ── Stripe : liste des tarifs actifs (lecture seule — les prix sont publics sur le site)
app.get('/api/stripe/prices', async (req, res) => {
  try {
    const sk = config.stripe && config.stripe.secretKey;
    if (!sk) return res.status(501).json({ error: 'stripe non configuré' });
    const r = await fetch('https://api.stripe.com/v1/prices?active=true&limit=100&expand[]=data.product', { headers: { Authorization: 'Bearer ' + sk } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: 'stripe erreur' });
    res.json({ prices: (d.data || []).map(p => ({ id: p.id, montant: p.unit_amount, devise: p.currency, periode: p.recurring && p.recurring.interval, produit: p.product && p.product.name })) });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

// ── Stripe : création d'une page de paiement avec la quantité déjà réglée + champ code promo
//    Le site envoie { price, quantity, ref? } AVEC la session du compte (en-tête Authorization) ; la clé secrète vit
//    uniquement dans /opt/teamop/config.json (set-stripe.sh)
app.post('/api/stripe/checkout', async (req, res) => {
  try {
    const sk = config.stripe && config.stripe.secretKey;
    if (!sk) return res.status(501).json({ error: 'stripe non configuré' });
    /* ⛔ PAS DE PAIEMENT SANS COMPTE — Justin, 27 septembre 2026 : « ils peuvent pas payer s'ils ont pas de compte
       créé, pour que nous on ait un vrai suivi de qui fait quoi ». Cette route ouvrait une page de paiement à
       n'importe qui : l'abonnement ne se rattachait à personne, et la page Stripe laissait saisir n'importe quelle
       adresse. Désormais, dans cet ordre :
       · la session est celle des comptes du portail (`comptes.js`), lue dans l'en-tête `Authorization` — jamais
         dans le corps, qu'un visiteur écrit comme il veut ;
       · une adresse PAS ENCORE PROUVÉE ne paie pas (403) : une session prouve un mot de passe, pas une adresse
         (CLAUDE.md, `gardien` G1). Or c'est elle qui devient l'adresse du client chez Stripe, donc la clé de repli
         d'`espacePaye()` : payée par un compte non prouvé, elle rattacherait l'abonnement à l'entreprise d'un autre ;
       · l'adresse du compte est donnée à Stripe pour le client qu'il crée (`customer_email`) — c'est celle que la Tour
         affiche pour chaque abonnement — et gravée sur la session ET sur l'abonnement (`metadata[compte]`), qui la
         garde même si l'adresse du client change un jour chez Stripe.
       ⚠️ `comptes` est déclaré bien plus bas dans ce fichier : on le lit ici au moment de l'APPEL, dans un `try`,
       comme `/api/clients/sync`. Une zone morte temporelle a déjà éteint une fonction entière de ce serveur. */
    let cm = null; try { cm = comptes; } catch (e) { cm = null; }
    if (!cm) return res.status(503).json({ error: 'comptes_indisponibles' });
    /* la même lecture que `porteur()` de comptes.js : « Bearer » et 64 hexadécimaux, rien d'autre */
    const m = /^Bearer\s+([A-Fa-f0-9]{64})$/.exec(String(req.headers.authorization || ''));
    const payeur = m ? cm.parJeton(m[1]) : '';
    if (!payeur) return res.status(401).json({ error: 'compte_requis' });
    if (!cm.verifie(payeur)) return res.status(403).json({ error: 'adresse_non_verifiee' });
    const { price, quantity, ref, options } = req.body || {};
    const qty = Math.min(50, Math.max(1, parseInt(quantity, 10) || 1));
    /* ⛔⛔ LES OPTIONS DU PRO (1er octobre 2026) — LE CORPS NE PORTE QUE DES CLÉS (règle 1 de CLAUDE.md : une valeur du corps ne décide
       jamais de ce qu'une entreprise a payé). Une option se demande par sa CLÉ (`stock`, `achats`, `compta`, `sanitaire`) : le tarif,
       le montant et la quantité d'un ajout d'option viennent du SERVEUR. Un `price_…` d'option envoyé par le client n'est jamais
       accepté : `price` reste une FORMULE (`tarif_inconnu` sinon). Au plus quatre clés, de la liste fermée, sinon 400
       `option_inconnue` ; dédoublonnées, dans l'ordre de la grille. `price` ABSENT avec des options = un ajout d'option seule
       (`optionSeule`) à une entreprise qui a déjà son Pro. */
    let opts = [];
    if (options !== undefined && options !== null) {
      if (!Array.isArray(options) || options.length > OPTIONS_CLES.length || options.some(o => typeof o !== 'string' || !OPTIONS_CLES.includes(o))) return res.status(400).json({ error: 'option_inconnue' });
      opts = OPTIONS_CLES.filter(k => options.includes(k));
    }
    const optionSeule = opts.length > 0 && (price === undefined || price === null || price === '');
    /* un tarif est un TEXTE : un tableau `[x]` passait l'expression (String([x]) vaut x), un objet faisait jeter (500) */
    if (!optionSeule && (typeof price !== 'string' || !/^price_[A-Za-z0-9]+$/.test(price))) return res.status(400).json({ error: 'tarif invalide' });
    /* ⛔ UN TARIF DE LA PAGE, ET RIEN D'AUTRE (28 septembre 2026, nuit). Cette route ouvrait un paiement pour N'IMPORTE
       QUEL tarif du compte Stripe envoyé par le navigateur — et pour `espacePaye()`, UN abonnement vivant suffit à rendre
       une entreprise « payée ». Les tarifs admis sont ceux de `STRIPE_PRIX_FORMULE`, la liste que `test-842` compare à
       `STRIPE_PRICES` de recap-abonnement.html : la page ne peut pas en envoyer d'autre.
       ⛔ ET LE CLIENT CHOISIT LEQUEL (Justin, 29 septembre 2026 : « ils choisissent le tarif qu'ils veulent »). Une nuit,
       cette route a refusé un tarif SOUS la formule de la fiche — elle aurait bloqué le client qui, au bout d'un code
       promo Business Premium, prend Pro. C'est la formule SERVIE qui suit ce qu'il paie (`formulePayee`) : payer Pro
       donne Pro, quelle que soit la fiche. */
    const rangDuPrix = optionSeule ? -1 : RANG_FORMULE.findIndex(k => STRIPE_PRIX_FORMULE[k].includes(String(price)));
    if (!optionSeule && rangDuPrix < 0 && !STRIPE_PRIX_MESSAGES.includes(String(price))) return res.status(400).json({ error: 'tarif_inconnu' });
    /* ⛔ « MESSAGES BUSINESS PREMIUM » (25 €) EST RETIRÉE DE LA VENTE — Justin, 1er octobre 2026 : « un Pro à 15 euros ; lui à 25 on le
       supprime ; à 15 euros ils ont toutes les options ». On refuse d'en VENDRE un neuf, et SEULEMENT cela : le tarif reste dans
       `STRIPE_PRIX_FORMULE` et `STRIPE_PRIX_MESSAGES`, parce qu'un abonnement d'avant doit rester LU comme de l'OP MESSAGES (sans
       quoi `ligneMessages` le laisserait passer pour un paiement d'OP GESTION, ou pour rien). Retirer le tarif de ces listes
       ferait cela en silence ; refuser ici ne casse personne. Le refus vient AVANT toute lecture de Stripe : rien n'est créé. */
    if (!optionSeule && STRIPE_PRIX_FORMULE.msgpremium.includes(String(price))) return res.status(400).json({ error: 'formule_retiree' });
    /* ⛔ Business, Business Premium et OP MESSAGES n'ont pas d'options à vendre : les premiers les ont TOUTES, le dernier n'est
       pas OP GESTION — une option en plus serait payée pour rien (`option_incluse`) */
    if (opts.length && !optionSeule && rangDuPrix !== 0) return res.status(400).json({ error: 'option_incluse' });
    /* le cycle : celui du tarif de la formule (index 0 mensuel, 1 annuel — Stripe n'accepte qu'UN intervalle par abonnement).
       ⛔ POUR UN AJOUT D'OPTION SEULE, C'EST CELUI DU PRO QUE L'ENTREPRISE PAIE DÉJÀ, lu chez Stripe plus bas (`cycleDuPro`) — jamais
       le corps de la requête (règle 1 de CLAUDE.md : une valeur du corps ne décide pas de ce qui est facturé). Un Pro payé à l'année
       reçoit l'option à l'année : une option mensuelle posée sur un Pro annuel serait un second calendrier de prélèvement, et un
       relevé qui surprend. Le corps n'a donc plus de `cycle` : une valeur qu'il enverrait est ignorée. */
    let cycleIdx = optionSeule ? -1 : STRIPE_PRIX_FORMULE.pro.indexOf(String(price));
    /* ⛔ tant que Justin n'a pas créé les tarifs chez Stripe (`stripe-options.js`), ils sont VIDES : rien ne se vend — les
       appareils d'abord, la porte ensuite */
    if (opts.some(k => optionSeule ? !(STRIPE_PRIX_OPTION[k] || []).some(Boolean) : !(STRIPE_PRIX_OPTION[k] || [])[cycleIdx])) return res.status(400).json({ error: 'option_indisponible' });
    /* ⛔ B — « ON VERROUILLE » (Justin, 28 septembre 2026) : SEUL UN COMPTE DE L'ENTREPRISE PAIE POUR ELLE.
       La référence d'espace vient de la PAGE (le marqueur de l'appareil) : un compte confirmé rattachait donc SON
       paiement à l'espace de n'importe quelle autre entreprise, qui devenait « payée » dans `espacePaye()` (`gardien`,
       rejoué). La preuve d'appartenance est celle du reste du serveur (relais du portail) : l'adresse
       du compte EST celle de l'entreprise dans l'annuaire. Les cas, dans l'ordre où le code les tranche (et
       `reference_ambigue`, plus bas, avant eux) :
       · la référence désigne une entreprise CONNUE, et le compte n'est pas le sien (une adresse de ses noms d'accès
         n'est pas celle du compte) → 403 `compte_autre_entreprise`, rien chez Stripe : on refuse AVANT de faire payer,
         plutôt que d'encaisser un abonnement qui ne débloquerait rien ;
       · aucun de ses noms d'accès ne porte d'adresse (espaces ouverts par la Tour sans adresse) → aucun compte ne peut
         prouver qu'elle est la sienne : 403 `entreprise_sans_adresse`, un refus DISTINCT — « connectez-vous avec
         l'adresse de l'entreprise » serait une consigne impossible (`gardien`) ; c'est à TEAM OP de la renseigner ;
       · la référence est INCONNUE de l'annuaire (appareil resté sur un ancien espace…) → elle n'est PAS gravée :
         l'abonnement se rattache à l'adresse du compte (`customer_email`), jamais à une autre entreprise ;
       · pas de référence (on paie avant d'avoir son espace) → rien ne change.
       ⚠️ Les entreprises visées se lisent comme `espacePaye()` les reconnaît (nom d'accès OU identifiant, sans casse) :
       `espacesDeRef`. Un verrou qui en regarderait moins laisserait passer celle qu'il ne voit pas.
       ⛔ ET ON GRAVE L'ENTREPRISE, PAS LE MOT ENVOYÉ (`gardien`, rejoué) : une référence qui est un NOM D'ACCÈS suivait
       ce nom — libéré (« Supprimer l'accès »), puis repris par une autre entreprise, il lui faisait hériter de
       l'abonnement au redémarrage suivant. L'identifiant d'équipe (`t`) ne se réattribue pas : c'est lui qu'on grave,
       tel que l'annuaire le range (en clair ou dans le code) — et RIEN pour une entrée qui n'a pas d'identifiant
       (l'abonnement suit alors l'adresse du compte, vérifiée). Des entreprises visées qui ne partagent pas UNE identité
       → 403 `reference_ambigue` : on ne choisit pas pour le client laquelle il paie. */
    const payeurMin = String(payeur).trim().toLowerCase();
    let refGravee = '';
    /* L'identité d'une entreprise : son identifiant, ou — entrée sans identifiant — son nom d'accès, TYPÉS : un
       identifiant ancien sans tiret peut s'écrire comme le nom d'une autre, et ce ne sont pas la même entreprise.
       ⚠️ l'identifiant tel que l'annuaire le RANGE, espaces compris : c'est ainsi qu'`espacesDeRef` et `espacePaye()`
       le comparent — le « nettoyer » ici graverait une valeur qu'`espacePaye()` ne reconnaîtrait plus (`gardien`). */
    const identite = x => { const t = espaceT(x); return t.trim() ? { cle: 't:' + t.toLowerCase(), val: t } : { cle: 's:' + String(x.slug).toLowerCase(), val: x.slug }; };
    let visees = [];   // l'entreprise de la référence, vérifiée ci-dessous — la fin d'essai la relit plus bas
    if (typeof ref === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(ref)) {
      try { visees = espacesDeRef(ref); } catch (e) { visees = []; }
      if (visees.length) {
        if (new Set(visees.map(x => identite(x).cle)).size !== 1) return res.status(403).json({ error: 'reference_ambigue' });
        const id = identite(visees[0]);
        /* ⛔ L'ENTREPRISE, C'EST TOUS SES NOMS D'ACCÈS — et la Tour en ouvre parfois SANS adresse (`email: … || ''`).
           Exiger l'adresse du compte sur CHAQUE nom refusait le vrai patron dès qu'un de ses noms n'en portait pas,
           avec « pas d'adresse » pour une entreprise qui en a une. La règle : au moins une adresse, et TOUTES celles
           présentes sont celle du compte ; deux adresses différentes pour une même entreprise se refusent (on ne
           tranche pas un conflit de l'annuaire au moment de payer). Une adresse qui n'est pas du TEXTE (un tableau,
           un nombre : aucune route ne l'écrit) compte comme une adresse étrangère — on échoue fermé.
           ⚠️ CE VERROU CROIT L'ANNUAIRE, et c'est sa limite (`gardien`, 28 septembre 2026, rejoué) : aucune route
           PUBLIQUE ne range une entrée sous l'identifiant d'une autre entreprise, et la Tour refuse une SECONDE adresse
           (409) — mais « Code espace collé » dans la Tour rattache une PREMIÈRE adresse à un identifiant déjà connu sans
           vérifier la clé du code. Un code forgé collé par le patron ferait donc passer ce verrou (et, avec ou sans
           lui, le repli par adresse d'`espacePaye()`) — et, bien pire, sèmerait un compte dans l'annuaire de connexion de
           l'entreprise visée. C'est la Tour qu'il faut fermer (preuve de la clé, et une confirmation pour une clé
           vraiment changée) : voir `REPRISE.md`. */
        const adresses = Object.keys(espacesReg).filter(s => espacesReg[s] && identite(Object.assign({ slug: s }, espacesReg[s])).cle === id.cle)
          .map(s => { const a = espacesReg[s].email; return typeof a === 'string' ? a.trim().toLowerCase() : (a ? '\u0000pas-une-adresse' : ''); }).filter(Boolean);
        if (!adresses.length) return res.status(403).json({ error: 'entreprise_sans_adresse' });
        if (adresses.some(a => a !== payeurMin)) return res.status(403).json({ error: 'compte_autre_entreprise' });
        /* ⛔ on ne grave QUE l'identifiant : le nom d'accès d'une entrée qui n'en a pas se libère et se reprend (le
           défaut même que la gravure de l'identifiant ferme). Sans rien de gravé, l'abonnement suit l'adresse du compte
           — qui EST celle de l'entreprise, on vient de le vérifier. */
        refGravee = id.cle.startsWith('t:') ? id.val : '';
      }
    }
    /* ⛔ un ajout d'option SEULE se rattache à une entreprise précise : sans entreprise vérifiée, l'abonnement d'option suivrait
       l'adresse du compte — et une option sans le Pro dont elle dépend ne sert à rien (`entreprise_requise`) */
    if (optionSeule && !refGravee) return res.status(409).json({ error: 'entreprise_requise' });
    /* ⛔ un impayé d'OP GESTION se règle sur sa facture, il ne se rachète pas (`factureImpayeARegler`) — OP MESSAGES, qui
       n'est pas encore en vente, garde le paiement normal. Un ajout d'option seule en fait autant : le Pro impayé bloque
       l'entreprise, et lui vendre une option par-dessus ne la débloque pas. */
    if (rangDuPrix >= 0 || optionSeule) {
      const due = await factureImpayeARegler(visees, payeurMin);
      if (due && due.url) { console.log('paiement : facture en attente d\'un impayé servie à la place d\'un abonnement neuf'); return res.json({ url: due.url, facture: true }); }
      if (due && due.refus) return res.status(due.refus).json({ error: due.error });
    }
    /* ⛔⛔ CE QUI SERT L'ENTREPRISE VISÉE, LU CHEZ STRIPE (1er octobre 2026) — jamais dans le corps. Seulement avec une référence
       VÉRIFIÉE (`refGravee` : le compte qui paie EST celui de l'entreprise), et sur les abonnements SÛREMENT à elle :
       · un ajout d'option SEULE exige qu'elle soit déjà servie Pro par un abonnement Stripe qui est le sien (`formule_requise`),
         qu'aucune des options demandées ne soit déjà servie (`option_deja` : une seconde fois, ce serait payé en double), et
         ne fait payer que les places qui MANQUENT à chaque option (une option payée pour deux personnes sur cinq : trois) ;
       · l'achat d'un abonnement Pro de plus RAMÈNE d'office les options déjà servies par Stripe : sans elles, la somme des
         quantités d'une option ne couvrirait plus les places (`optionsServies`, couverture stricte) et l'équipe entière perdrait
         son Stock en achetant UN utilisateur de plus ;
       · une option déjà souscrite mais IMPAYÉE se règle sur sa facture, elle ne se rachète pas (`impayeOptionARegler`). */
    const qtes = {};   // la quantité de chaque ligne d'option : celle de la formule, sauf pour un ajout d'option seule (ce qui manque)
    if (refGravee && visees.length && (optionSeule || rangDuPrix === 0)) {
      const eV = Object.assign({ slug: visees[0].slug }, facturationDe(visees[0]));
      /* ⛔⛔ LA LISTE DES ABONNEMENTS SE RELIT ICI, À L'INSTANT (1er octobre 2026, `gardien`, rejoué : `r1.js`, `r4.js`). Le cache
         de 5 minutes (60 s pour un impayé) ne voit pas le paiement qu'un client vient de faire : « Ajouter Stock », payé, puis
         recliqué dans la minute — l'ajout repartait en 200 (un SECOND `stock × 3`, prélevé en double) ; « Pro + 2 places » acheté
         dans la fenêtre ne ramenait pas le Stock déjà payé, et l'équipe entière le perdait (5 places, Stock × 3). Chaque décision
         de ce bloc (`servies`, `payees`, `utiliser_ajout`, `option_deja`) repose sur CETTE lecture. Elle n'est fraîche que si elle
         date de quelques secondes : une panne de Stripe, ou une lecture ratée qu'on ne retente pas avant une minute, laisse une
         liste ancienne — et alors on REFUSE (502 `stripe_indisponible`, rien n'a été payé) au lieu de décider sur du périmé. Ça ne
         refuse que ce qui touche aux options (une option demandée, ou des options en vente que l'achat d'un Pro doit suivre) :
         avant la mise en vente, l'achat d'un Pro seul se passe de la liste comme avant. */
      const { s: s0, fraiche: listeFraiche } = await espaceStripeAchat(eV);
      if (!listeFraiche && (optionSeule || opts.length > 0 || OPTIONS_CLES.some(k => (STRIPE_PRIX_OPTION[k] || []).some(Boolean)))) {
        console.error('paiement : liste Stripe illisible ou périmée, rien de décidé sur les options');
        return res.status(502).json({ error: 'stripe_indisponible' });
      }
      let fp0 = null; try { fp0 = s0 ? formuleEtPlaces(eV, s0) : null; } catch (err) { fp0 = null; }
      const servies = (fp0 && fp0.f === 'pro' && fp0.places > 0) ? optionsServies('pro', fp0.places, s0) : [];
      let demandees = [];   // les options que le CORPS demande, avant que celles déjà servies ne suivent d'office
      if (optionSeule) {
        /* « payée Pro par un abonnement Stripe qui est le sien » : `formuleEtPlaces` lit les seuls abonnements SÛREMENT à elle
           (`surs`) et rend le Pro payé, ses places ; ni un réglage de la Tour (`aboManuelDe` : il décide sans lire Stripe, une
           option payée là ne serait jamais servie), ni une entreprise BLOQUÉE par un impayé (la facture part avant, plus haut).
           Une période offerte n'empêche pas : un client qui a choisi son Pro pendant le code (un essai Stripe) peut y ajouter une
           option, facturée comme lui à la fin de la période (`trial_end`). */
        let imp0 = null; try { imp0 = impayesGestion(eV, espStripeCache.data); } catch (err) { imp0 = null; }
        if (!fp0 || fp0.f !== 'pro' || !(fp0.places > 0) || aboManuelDe(eV) || impayeBloque(eV, s0, imp0)) return res.status(409).json({ error: 'formule_requise' });
        if (opts.some(k => servies.includes(k))) return res.status(409).json({ error: 'option_deja' });
        const payees = optionsPayeesQte(s0);
        for (const k of opts) qtes[k] = Math.min(50, Math.max(1, fp0.places - (payees[k] || 0)));
        cycleIdx = cycleDuPro(s0);
        if (opts.some(k => !(STRIPE_PRIX_OPTION[k] || [])[cycleIdx])) return res.status(400).json({ error: 'option_indisponible' });
      } else {
        demandees = opts.slice();
        for (const k of servies) if (!opts.includes(k)) opts.push(k);
        opts = OPTIONS_CLES.filter(k => opts.includes(k));
        if (opts.some(k => !(STRIPE_PRIX_OPTION[k] || [])[cycleIdx])) return res.status(400).json({ error: 'option_indisponible' });
      }
      const dueOpt = await impayeOptionARegler(eV, opts);
      if (dueOpt && dueOpt.url) { console.log('paiement : facture d\'une option impayée servie à la place d\'un abonnement neuf'); return res.json({ url: dueOpt.url, facture: true }); }
      if (dueOpt && dueOpt.refus) return res.status(dueOpt.refus).json({ error: dueOpt.error });
      /* ⛔⛔ PRO + OPTIONS POUR UNE ENTREPRISE QUI A DÉJÀ SON PRO = UN SECOND ABONNEMENT PRO, ET L'OPTION NE COUVRE PLUS SES PLACES
         (1er octobre 2026, relecture d'intégration). Acheter ici « Pro × n + Stock × n » ajoute n places ; l'option, payée pour
         ces n places seulement, ne couvre pas les places d'avant (couverture stricte, `optionsServies`) : le client paie un
         abonnement Pro de trop ET une option qui n'ouvre rien. Les options déjà servies suivent d'office le nouvel abonnement
         (plus bas) ; une option qui NE l'est PAS se prend par l'ajout d'option seule (sans `price` : Stripe ne reçoit que la
         ligne d'option, pour les places qui manquent) — 409 `utiliser_ajout`, rien chez Stripe. Seule une entreprise que Stripe
         dit déjà Pro payée est concernée : une entreprise neuve, ou en période offerte, achète son Pro et ses options ensemble. */
      if (!optionSeule && fp0 && fp0.f === 'pro' && fp0.places > 0 && demandees.some(k => !servies.includes(k))) return res.status(409).json({ error: 'utiliser_ajout' });
      /* ⛔ LES OPTIONS DÉJÀ SERVIES SUIVENT UN RACHAT DE PLACES — MAIS LE CLIENT LE SAIT AVANT DE PAYER (1er octobre 2026, `gardien`,
         rejoué : `r1.js` R5). Une entreprise Pro × 3 + Stock × 3 qui achète « Pro + 2 » sans option recevait pro × 2 + stock × 2 chez
         Stripe : la page affichait 30 €, le client en payait 48. Le suivi d'office est nécessaire (sans lui, la couverture stricte
         ferme le Stock pour toute l'équipe) mais il ne se fait JAMAIS en silence : 409 `options_suivent`, rien chez Stripe, avec
         les options et le surcoût (celui que le serveur facturera). La page coche ces options, remet le total à jour, et c'est le
         second clic — qui les demande — qui part. Une option que le corps demande déjà ne se redit pas. */
      if (!optionSeule && fp0 && fp0.f === 'pro' && fp0.places > 0) {
        const suivent = OPTIONS_CLES.filter(k => servies.includes(k) && !demandees.includes(k));   // dans l'ordre de la grille
        if (suivent.length) {
          const facteur = cycleIdx === 1 ? 12 - MOIS_OFFERTS_ANNEE : 1;
          const surcout = suivent.reduce((t, k) => t + (OPTIONS_PRIX_MOIS[k] || 0) * qty * facteur, 0);
          return res.status(409).json({ error: 'options_suivent', options: suivent, surcout, cycle: cycleIdx === 1 ? 'annuel' : 'mensuel' });
        }
      }
    }
    const p = new URLSearchParams();
    p.append('mode', 'subscription');
    /* les lignes : la formule (sauf un ajout d'option seule), puis chaque option — AU TARIF DU SERVEUR et du même cycle que la
       formule (un seul intervalle par abonnement) */
    const lignesPay = optionSeule ? [] : [{ prix: String(price), qte: qty }];
    for (const k of opts) lignesPay.push({ prix: STRIPE_PRIX_OPTION[k][cycleIdx], qte: optionSeule ? qtes[k] : qty });
    lignesPay.forEach((l, i) => { p.append('line_items[' + i + '][price]', l.prix); p.append('line_items[' + i + '][quantity]', String(l.qte)); });
    p.append('allow_promotion_codes', 'true');
    /* la facturation démarre à la fin d'une période offerte en cours (`finEssaiPeriode`) — pour OP GESTION seulement, le
       code ne couvre pas OP MESSAGES ; la page de remerciement dit alors le jour du premier prélèvement (`?debut=`).
       Toute ligne payante la suit — la formule OU une option : sinon une option achetée pendant la période serait prélevée
       tout de suite pendant que la formule attend. */
    const essai = (rangDuPrix >= 0 || optionSeule) ? finEssaiPeriode(visees, payeurMin) : null;
    if (essai) p.append('subscription_data[trial_end]', String(essai.fin));
    p.append('success_url', 'https://teamop.fr/merci.html' + (essai ? '?debut=' + essai.debut : ''));
    p.append('cancel_url', 'https://teamop.fr/recap-abonnement.html');
    p.append('customer_email', payeur);
    p.append('metadata[compte]', payeur);
    p.append('subscription_data[metadata][compte]', payeur);
    /* ⛔ LA RÉFÉRENCE DOIT VOYAGER JUSQU'À L'ABONNEMENT, PAS S'ARRÊTER À LA SESSION.
       `client_reference_id` vit sur la SESSION de paiement ; `espacePaye()`, lui, lit la liste
       des ABONNEMENTS — qui ne la portent pas. Le rattachement se faisait donc sur la seule
       ÉGALITÉ EXACTE de l'adresse e-mail : l'entreprise paie, la comptable saisit l'adresse de
       facturation sur la page Stripe, et comme ce n'est pas celle avec laquelle l'espace a été
       créé, l'abonnement n'est JAMAIS rattaché. Le client a payé et son application reste
       bloquée — sans que rien, nulle part, ne dise pourquoi.
       `subscription_data[metadata][espace]` grave la référence sur l'abonnement, où elle
       survit au renouvellement et à tout changement d'adresse. */
    if (refGravee) {   // seulement celle d'une entreprise dont le compte qui paie EST le compte (voir « B » plus haut)
      p.append('client_reference_id', refGravee);
      p.append('subscription_data[metadata][espace]', refGravee);
    }
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + sk, 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString() });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.url) return res.status(502).json({ error: (d.error && d.error.message) || 'stripe erreur' });
    res.json({ url: d.url });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

// ── Vigie : les applications signalent leurs erreurs JavaScript (par espace entreprise, anonyme)
//    → e-mail d'alerte immédiat à l'admin de la plateforme, journal consultable, compteur dans /health
const BUGS_PATH = path.join(DATA_DIR, 'bugs.jsonl');
/* ══ REPARTIR À ZÉRO SUR UN ESPACE — 14 septembre 2026, demandé par Justin ═════════════════
   Sur la fiche d'une entreprise, les deux pastilles « 🐛 142 » et « 🔑 1 » cumulent depuis
   toujours. Après une journée de correctifs elles comptent surtout de l'histoire ancienne, et
   un compteur qui ne redescend jamais finit par ne plus être lu — c'est ce qui est arrivé au
   compteur « à migrer », et ça a coûté une semaine.
   ⛔ ON N'EFFACE RIEN. `bugs.jsonl` est la trace, et une trace qu'on réécrit ne vaut plus
   rien : le jour où un incident ressort, on veut pouvoir remonter avant la remise à zéro.
   On pose donc un FILIGRANE — une date par espace — et les compteurs ne comptent que ce qui
   vient APRÈS. Conséquence voulue : un problème qui se reproduit réapparaît à la seconde, il
   n'est pas masqué ; seul le passé est mis de côté. */
const ZERO_PATH = path.join(DATA_DIR, 'compteurs-zero.json');
let compteursZero = {};
try { compteursZero = JSON.parse(fs.readFileSync(ZERO_PATH, 'utf8')); } catch (e) {}
function zeroDe(t) { return +compteursZero[t] || 0; }
function zeroEcrire() { try { const tmp = ZERO_PATH + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(compteursZero)); fs.renameSync(tmp, ZERO_PATH); return true; }
  catch (e) { console.error('compteurs-zero.json non écrit :', e.message); return false; } }
let bugTimes = [];
try { // recharge les dernières 24 h au démarrage
  const tail = fs.readFileSync(BUGS_PATH, 'utf8').trim().split('\n').slice(-500);
  const lim = Date.now() - 86400000;
  tail.forEach(l => { try { const e = JSON.parse(l); if (e.ts > lim) bugTimes.push(e.ts); } catch (e) {} });
} catch (e) {}
const bugSeen = new Map();   // hash d'erreur -> date du dernier e-mail (anti-spam)
const bugQuota = new Map();  // espace -> quota horaire
// noms d'applications lisibles pour les e-mails et le contrôle (les anciennes versions envoient encore « elan »)
const APPS_NOM = { elan: 'OP GESTION', 'elan-gestion': 'OP GESTION', elangestion: 'OP GESTION', opgestion: 'OP GESTION',
  opmessages: 'OP MESSAGES', opmsg: 'OP MESSAGES', messages: 'OP MESSAGES', espace: 'ESPACE CLIENT', site: 'SITE TEAM OP' };
function appLisible(a) { const k = String(a || '').toLowerCase().trim(); return APPS_NOM[k] || (k ? k.toUpperCase() : 'APPLICATION'); }

app.post('/api/bug', (req, res) => {
  const { teamId, app: appName, version, msg, src, line, stack, ua } = req.body || {};
  if (!msg) return res.status(400).json({ error: 'msg requis' });
  const team = String(teamId || 'inconnu').slice(0, 80);   // 80 comme entFermes : à 60, un teamId long passait le garde-fou
  /* Un espace supprimé ne se laisse pas ressusciter par un appareil resté hors ligne :
     sans ce garde-fou, il réapparaît avec les identifiants et les noms de ses salariés.
     On répond ok — l'appareil n'a rien fait de mal, et /api/espaces/etat lui dira de se
     vider — mais on n'écrit RIEN. */
  if (espaceFerme(team)) return res.json({ ok: true, ferme: true });
  const q = bugQuota.get(team) || { count: 0, reset: Date.now() + 3600000 };
  if (Date.now() > q.reset) { q.count = 0; q.reset = Date.now() + 3600000; }
  if (q.count >= 20) return res.json({ ok: true, muted: true });
  q.count++; bugQuota.set(team, q);
  const entry = { ts: Date.now(), team, app: String(appName || '?').slice(0, 20), version: String(version || '?').slice(0, 12), msg: String(msg).slice(0, 300), src: String(src || '').slice(0, 200), line: parseInt(line) || 0, stack: String(stack || '').slice(0, 800), ua: String(ua || '').slice(0, 150) };
  try { fs.appendFileSync(BUGS_PATH, JSON.stringify(entry) + '\n'); } catch (e) {}
  bugTimes.push(entry.ts); if (bugTimes.length > 2000) bugTimes = bugTimes.slice(-1000);
  const hash = entry.app + '|' + entry.version + '|' + entry.msg.slice(0, 120);
  if (mailer && Date.now() - (bugSeen.get(hash) || 0) > 6 * 3600000) {
    bugSeen.set(hash, Date.now());
    const to = config.alertEmail || config.contactEmail || 'contact@teamop.fr';
    mailerEnvoi({
      from: config.smtp.from || config.smtp.user, to,
      subject: '🐛 Bug ' + appLisible(entry.app) + (entry.version !== '?' ? ' v' + entry.version : '') + ' — espace « ' + team + ' »',
      text: 'Une erreur vient d\'être signalée par l\'application d\'une entreprise.\n\nApplication : ' + appLisible(entry.app) + (entry.version !== '?' ? ' (v' + entry.version + ')' : '') + '\nEspace entreprise : ' + team + '\nErreur : ' + entry.msg + '\nFichier : ' + (entry.src || '—') + (entry.line ? ' ligne ' + entry.line : '') + '\nAppareil : ' + entry.ua + '\n\n' + (entry.stack ? 'Détail technique :\n' + entry.stack + '\n\n' : '') + 'Pour corriger : ouvre Claude Code et demande « corrige le bug signalé par la vigie ».',
      html: mailTeamOP({ chip: 'Vigie', chipBg: '#FDECEC', chipColor: '#C22B2B', titre: '🐛 Bug signalé — ' + appLisible(entry.app),
        corpsHtml: 'Une erreur vient d\'être signalée par l\'application d\'une entreprise. Le détail complet est dans l\'encart ci-dessous.',
        blocHtml: MAIL_BLOCS.vigie(Object.assign({}, entry, { app: appLisible(entry.app) })) + '<div style="font-size:12.5px;color:#93A2BF;padding-top:14px">Pour corriger : ouvre Claude Code et demande « corrige le bug signalé par la vigie ».</div>',
        boutonTxt: 'Ouvrir la Tour de contrôle', boutonUrl: 'https://teamop.fr/tour.html' })
    }).catch(e => console.error('bug mail:', e.message));
  }
  res.json({ ok: true });
});
/* ── 📬 Une inscription sur le site prévient l'équipe ──
   espace.html crée le compte directement chez Firebase et écrit la fiche dans Firestore :
   le serveur ne voyait donc RIEN passer, et personne n'était prévenu qu'un client venait
   de s'inscrire. Cette route ne fait qu'une chose, envoyer l'alerte — elle n'écrit aucun
   fichier et ne rend aucune donnée.
   Le destinataire est TOUJOURS l'adresse de l'équipe fixée en configuration, jamais une
   adresse fournie par l'appelant : une route ouverte qui écrirait à qui on lui dit serait
   un relais à spam offert à Internet. Le quota par IP borne le reste — au pire du bruit
   dans la boîte de l'équipe, et seulement dix fois par heure. */
const compteQuota = new Map();
app.post('/api/nouveau-compte', (req, res) => {
  const b = req.body || {};
  const email = monStr(b.email, 160).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'adresse invalide' });
  if (compteQuota.size > 5000) compteQuota.clear();
  if (!quotaOk(compteQuota, 'ip:' + (req.ip || '?'), 10, 3600000)) return res.json({ ok: true, muted: true });
  const prenom = monStr(b.prenom, 60).trim(), nom = monStr(b.nom, 60).trim();
  const societe = monStr(b.company, 120).trim();
  const qui = ((prenom + ' ' + nom).trim() || '(nom non renseigné)');
  /* Rien de tout cela ne part dans les journaux : ce sont des données personnelles,
     elles ne vont que dans l'e-mail adressé à l'équipe. */
  if (mailer) {
    const to = config.alertEmail || config.contactEmail || 'contact@teamop.fr';
    mailerEnvoi({
      from: config.smtp.from || config.smtp.user, to,
      subject: '🎉 Nouveau compte sur teamop.fr — ' + (societe || qui),
      text: 'Un compte vient d\'être créé sur l\'espace client.\n\nEntreprise : ' + (societe || '—')
        + '\nPersonne : ' + qui + '\nAdresse : ' + email
        + '\n\nLa fiche est dans la Tour de contrôle, onglet Entreprises.',
      html: mailTeamOP({ chip: 'Inscription', chipBg: '#E8F5EE', chipColor: '#0A7A52',
        titre: '🎉 Nouveau compte — ' + (societe || qui),
        corpsHtml: 'Un compte vient d\'être créé sur l\'espace client de teamop.fr.',
        blocHtml: '<div style="font-size:14px;line-height:1.9">'
          + '<b>Entreprise :</b> ' + (societe || '—') + '<br>'
          + '<b>Personne :</b> ' + qui + '<br>'
          + '<b>Adresse :</b> ' + email + '</div>',
        boutonTxt: 'Ouvrir la Tour de contrôle', boutonUrl: 'https://teamop.fr/tour.html' })
    }).catch(e => console.error('mail nouveau compte:', e.message));
  }
  res.json({ ok: true });
});

// ── 📥 Boîte Commandes intégrée : les réponses des fournisseurs arrivent DANS l'application ──
//    Les bons partent avec Reply-To = la boîte commandes ; le serveur la relève toutes les 2 min,
//    rattache chaque réponse au bon (n° BC-… dans l'objet/le texte) et pousse une notification à l'équipe.
const REPLIES_PATH = path.join(DATA_DIR, 'replies.jsonl');
const SENTMAP_PATH = path.join(DATA_DIR, 'sentmap.jsonl');
let sentMap = [];
try { sentMap = fs.readFileSync(SENTMAP_PATH, 'utf8').trim().split('\n').map(l => JSON.parse(l)).slice(-2000); } catch (e) {}
function rememberSent(teamId, bonNum, to) {
  const e = { ts: Date.now(), teamId: String(teamId).slice(0, 80), bonNum: String(bonNum).slice(0, 30).toUpperCase(), to: String(to || '').toLowerCase().slice(0, 120) };
  sentMap.push(e); if (sentMap.length > 3000) sentMap = sentMap.slice(-2000);
  try { fs.appendFileSync(SENTMAP_PATH, JSON.stringify(e) + '\n'); } catch (_) {}
}
// ── Boîtes mail connectées (plusieurs par équipe, relevées par le serveur) ──
const MAILBOX_PATH = path.join(DATA_DIR, 'mailboxes.json');
let mailboxes = {};   // clé "boxId" -> { id, teamId, email, pass, name, imapHost, imapPort, smtpHost, smtpPort }
try { mailboxes = JSON.parse(fs.readFileSync(MAILBOX_PATH, 'utf8')); } catch (e) {}
// migration éventuelle depuis l'ancien format "teamId|userId"
for (const k of Object.keys(mailboxes)) { const b = mailboxes[k]; if (!b.id) { b.id = 'mb' + Math.random().toString(36).slice(2, 9); mailboxes[b.id] = b; delete mailboxes[k]; } }
function saveMailboxes() { try { fs.writeFileSync(MAILBOX_PATH, JSON.stringify(mailboxes)); } catch (e) {} }
// Détection automatique des serveurs selon le domaine
function mailServers(email) {
  const dom = String(email || '').split('@')[1] || '';
  const P = { host: 'ssl0.ovh.net', imap: 993, smtp: 465 };
  if (/gmail\.com|googlemail\.com/i.test(dom)) return { imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 465 };
  if (/outlook|hotmail|live\.|msn\.com/i.test(dom)) return { imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 };
  if (/orange\.fr|wanadoo/i.test(dom)) return { imapHost: 'imap.orange.fr', imapPort: 993, smtpHost: 'smtp.orange.fr', smtpPort: 465 };
  if (/free\.fr/i.test(dom)) return { imapHost: 'imap.free.fr', imapPort: 993, smtpHost: 'smtp.free.fr', smtpPort: 465 };
  if (/sfr\.fr|neuf\.fr/i.test(dom)) return { imapHost: 'imap.sfr.fr', imapPort: 993, smtpHost: 'smtp.sfr.fr', smtpPort: 465 };
  if (/yahoo\./i.test(dom)) return { imapHost: 'imap.mail.yahoo.com', imapPort: 993, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 465 };
  return { imapHost: P.host, imapPort: P.imap, smtpHost: 'ssl0.ovh.net', smtpPort: 465 };   // OVH & domaines pro par défaut
}
// Connecter / tester une boîte (une équipe peut en connecter plusieurs)
/* ══ PREUVE DE POSSESSION DE LA CLÉ D'ÉQUIPE — PHASE 1 : ON OBSERVE, ON NE REFUSE RIEN ══
   Le teamId n'autorise rien et ne l'a jamais pu : il voyage dans les URL, donc dans les
   journaux nginx, l'historique du navigateur et l'en-tête Referer ; il est écrit en clair
   dans le localStorage de chaque appareil ; et il ne se révoque pas — un ancien salarié ou
   un téléphone revendu le gardent à vie. Les six routes ci-dessous s'en contentaient
   pourtant : lire les messages reçus, lister les boîtes, ENVOYER depuis la boîte de
   l'entreprise, la déconnecter, en connecter une, s'abonner aux notifications. Connaître
   le teamId suffisait pour les six.

   Rien de neuf n'est inventé pour refermer : la preuve existe déjà des deux côtés. app.html
   détient la clé de synchro et sait en calculer le sha256 (« kh »), et /api/espaces/comptes
   vérifie déjà ce kh contre la clé de l'espace. Le verdict est rendu par cleEquipeVerdict(),
   défini plus bas avec espaceParT() dont il dépend.

   POURQUOI ON N'EXIGE ENCORE RIEN. cleEquipeVerdict() s'appuie sur espaceParT(), qui ne
   trouve que ce qui est inscrit dans espacesReg — le registre alimenté à la main, quand
   cnxData, lui, se remplit tout seul à chaque connexion. Des entreprises actives et payantes
   ont donc un t sans entrée d'annuaire. Refuser d'emblée les renverrait en 403, que
   loadMailReplies() (app.html) avale dans son catch : Réception vide, aucun message d'erreur.
   C'est exactement le mode de panne silencieuse que ce dépôt a déjà payé. On mesure d'abord
   — /api/mail/cles, protégée — et on ne ferme que lorsque le compte « sans preuve » est à
   zéro pour les espaces vivants. */
app.use(['/api/replies', '/api/mailboxes', '/api/mailbox/connect', '/api/mailbox/disconnect', '/api/sendmail', '/api/subscribe', '/api/notify'], cleEquipeObserve);

/* ══ PHASE 2 — 11 septembre 2026 : LES DEUX ROUTES QUI LISENT REFUSENT VRAIMENT ══
   Elles ne demandaient qu'un teamId dans l'URL. /api/mailboxes rendait les adresses de
   messagerie de l'entreprise et ses serveurs IMAP/SMTP ; /api/replies rendait ses DEUX
   CENTS derniers messages reçus, expéditeur, objet et corps compris — la correspondance
   de ses clients. Et le teamId n'a jamais été un secret : il voyage dans les URL, donc
   dans les journaux nginx, l'historique du navigateur et l'en-tête Referer ; il est écrit
   en clair dans le localStorage de chaque appareil ; il ne se révoque pas.

   ⚠️ CE N'EST PAS UN CHANGEMENT D'AVIS SUR LA PRUDENCE DE LA PHASE 1 — ce sont ses quatre
   conditions, enfin réunies, et chacune a été VÉRIFIÉE avant d'écrire cette ligne :
     1. Le compteur de /health, public et agrégé, au bout de 6 h 12 de service :
        valide 5, absent 0, invalide 0, inconnu 3 — et un `parRoute` qui ne contient QUE
        `subscribe`. Donc : aucun `absent`, aucun `invalide` nulle part, et les trois
        `inconnu` sont sur /api/subscribe, que cette ligne ne touche pas (espace.html et
        messages.html l'appellent sans kh, c'est le bruit prévu par la phase 1).
     2. `inconnu` venait des espaces hors annuaire — la Tour en comptait trois le
        11 septembre : un espace d'essai, supprimé depuis, et les deux espaces techniques.
        Plus une seule entreprise vivante hors annuaire, donc plus un seul `inconnu`
        légitime possible sur ces deux routes.
     3. Une preuve ne prouve que si la clé est privée : le compteur « à migrer (clé
        partagée) » de la Tour est à zéro, et `cleEstPublique` referme le cas résiduel.
     4. app.html est le SEUL appelant de ces deux routes — vérifié par recherche sur tout
        le dépôt — et ses trois points d'appel passent par enteteEquipe(), donc envoient le
        kh. Ni espace.html ni messages.html ne les appellent.

   ⛔ LE REFUS N'EST PAS DU JSON, ET C'EST LE POINT QUI COMPTE. loadMailReplies()
   (app.html) fait « const d = await r.json(); _mailReplies = d.replies || [] » : un refus
   en JSON se parserait sans erreur, la liste deviendrait VIDE au lieu de NULLE, et l'écran
   afficherait « 📭 Aucun message ». Le client ne verrait pas une panne — il verrait sa
   correspondance disparue. En text/plain, r.json() jette, le catch met _mailReplies à null,
   et l'écran dit « 📥 Réception indisponible ». Sans toucher à app.html.

   ✅ FERMÉE EN PRODUCTION LE 11 SEPTEMBRE 2026 À 8 H 17, et le défaut du code l'est
   devenu avec elle : il faut désormais « "mailPreuveExigee": false » pour ROUVRIR. C'est
   l'inverse de ce que cette ligne disait le matin même, et le renversement est mesuré, pas
   décidé — voir plus bas les quatre conditions, puis la vérification faite dans la foulée :
   403 text/plain sur les deux routes, compteur `mailRefus` à 3 (mes propres essais, motif
   « absent »), zéro refus venu d'un vrai appareil.
   ⚠️ Tant que ce n'était PAS vérifié, ce défaut était OUVERT, et il fallait qu'il le soit : `gardien` a relu ce correctif le 11 septembre et a montré que
   le refus en text/plain n'affiche PAS « Réception indisponible » sur l'écran Courrier.
   Vérifié dans app.html : views.boiteMail() appelle loadMailboxes(), dont le catch pose
   _mailboxes=[] ; le .then qui suit réécrit alors #mail-list avec la grande carte
   « Connecte ta boîte mail » ET SON BOUTON — qui ÉCRASE le message de panne rendu
   synchroniquement juste après. Le client ne voit donc pas une panne : il voit sa boîte
   disparue et une invitation à retaper son mot de passe d'application Gmail. C'est PIRE que
   l'écran vide que ce correctif voulait éviter. Deuxième point du même défaut : l'onglet
   Boîte Commandes initialise `let data={replies:[]}` AVANT son try, donc un refus y affiche
   « Aucune réponse fournisseur » — le silence, exactement.

   L'ORDRE A ÉTÉ CELUI DE LA RÈGLE FIRESTORE, pour la même raison : LES APPAREILS
   D'ABORD, LA PORTE ENSUITE. Les quatre marches, toutes franchies le 11 septembre :
     1. ✅ app.html v641 publiée — elle distingue « refusé » de « vide » sur les trois points
        d'appel, donc un refus s'affiche enfin comme une panne ;
     2. ✅ v641 exigée depuis la Tour, et pas seulement côté API : teamop_config/version.min
        vaut 641 dans Firestore, donc un appareil en retard ne peut plus écrire ;
     3. ✅ aucune entreprise vivante hors annuaire — les deux espaces qui restaient sont la
        bêta (justin, 7 h) et le repli (florent, il y a DEUX JOURS, résolu depuis) ;
     4. ✅ aucune entreprise sur la clé partagée (compteur de la Tour à zéro).
   ⛔ SI L'UNE DES QUATRE REDEVENAIT FAUSSE — une entreprise remise sur le repli, un parc
   d'appareils bloqué en version ancienne — il faut ROUVRIR le temps de la traiter, pas
   laisser des clients sans leur Réception : « mailPreuveExigee »: false, redémarrage, dix
   secondes. Le compteur `mailRefus` de /health est là pour le voir venir : un motif autre
   que « absent » qui monte, ce sont de vrais appareils qui tombent.

   ⚠️ CE QUE LA MESURE DE LA PHASE 1 NE DIT PAS. « valide 5, absent 0, invalide 0, inconnu 3,
   et un parRoute qui ne porte que subscribe » ne veut pas dire « aucun échec sur ces deux
   routes » : ça veut dire AUCUN APPEL du tout en 6 h 12. La mesure n'a jamais exercé le
   chemin qu'on ferme. Et les trois « inconnu » ne sont pas le bruit d'espace.html : sans kh
   le verdict est « absent », pas « inconnu » — ce sont donc des appareils qui PRÉSENTENT une
   preuve sur un espace absent de l'annuaire (la bêta l'est, le repli aussi). À regarder
   depuis la Tour avant l'étape 3. */
function cleEquipeExige(req, res, next) {
  if (config.mailPreuveExigee === false) return next();
  const src = (req.method === 'GET') ? (req.query || {}) : (req.body || {});
  const t = String(src.teamId || src.t || '');
  let motif = '';
  /* ⛔ L'ESPACE TECHNIQUE EST JUGÉ EN PREMIER, AVANT MÊME DE LIRE LE VERDICT DE CLÉ — corrigé
     le 17 septembre 2026, le soir du renommage de la bêta. Avant, il n'était reconnu
     « technique » qu'APRÈS un verdict `valide`, donc seulement s'il figurait dans l'annuaire.
     L'espace bêta neuf (`opgestion-beta`) n'y est pas : sa preuve, bien formée, tombait en
     `inconnu` — la case même que /health désigne comme alarme pour « de vrais appareils qui
     tombent ». Mesuré : 12 `inconnu` en une heure, tous des connexions à la bêta, +2 par
     connexion, reproduits à l'identique avec un en-tête forgé. L'alarme comptait du bruit.
     ESPACES_INTOUCHABLES est une liste statique : on peut la consulter sans annuaire. Seule
     cleEstPublique() a besoin du verdict `valide` avant, et elle reste après. */
  if (ESPACES_INTOUCHABLES.includes(t)) motif = 'technique';
  else if (req.cleEquipe !== 'valide') motif = req.cleEquipe || 'absent';
  /* cleEstPublique() n'est vérifiable qu'APRÈS `valide` : il garantit que l'espace est dans
     l'annuaire avec un code lisible, ce dont elle a besoin pour ne pas rendre « laisse
     passer » par défaut (voir sa mise en garde). Un espace dont la clé est écrite en clair
     dans app.html ne prouve rien en la présentant : n'importe qui la calcule. */
  else if (cleEstPublique(t)) motif = 'partagee';
  if (!motif) return next();
  mailRefus.n++; mailRefus.parMotif[motif] = (mailRefus.parMotif[motif] || 0) + 1; mailRefus.ts = Date.now();
  /* Agrégé, et rien d'autre : /health est publique. Un slug ou un teamId ici dirait au
     monde quelles entreprises existent — c'est /api/mail/cles, protégée, qui les ventile. */
  res.status(403).type('text/plain; charset=utf-8')
     .send('Réception indisponible : cet appareil n\'a pas prouvé la clé de son entreprise.');
}
const mailRefus = { n: 0, parMotif: Object.create(null), ts: 0 };
app.use(['/api/replies', '/api/mailboxes'], cleEquipeExige);

/* Le nombre d'essais de connexion à une boîte, par IP et par heure. La route tente un
   SMTP puis un IMAP chez le fournisseur et RENVOIE son message d'erreur : sans borne,
   c'est un banc d'essai de mots de passe contre Gmail ou Outlook, relayé par l'IP du VPS —
   donc c'est la réputation de TeamOP qui se fait brûler. Même forme que lienQuota. */
let connectQuota = new Map();

app.post('/api/mailbox/connect', async (req, res) => {
  if (connectQuota.size > 5000) connectQuota = new Map();
  if (!quotaOk(connectQuota, 'ip:' + (req.ip || '?'), 20, 3600000))
    return res.status(429).json({ error: 'trop d\'essais de connexion — réessaie dans une heure' });
  /* Ce contrôle ne ferme la porte qu'aux teamId INVENTÉS — et encore, cnxData s'inscrit
     tout seul par /api/connexions, qui est publique. Brancher une boîte sur le teamId d'une
     VRAIE entreprise reste possible, et verse jusqu'à 60 messages de l'attaquant dans sa
     Réception avant de pousser une notification à tous ses appareils. Ne pas croire cette
     ligne suffisante : elle élève la marche, le quota au-dessus fait le vrai travail. */
  {
    const tCo = String((req.body || {}).teamId || '').slice(0, 80);
    const connu = !!espaceParT(tCo) || Object.values(subs).some(x => x.teamId === tCo) || !!cnxData[tCo];
    if (!connu) {
      /* Pas de teamId ici non plus : /health est publique. */
      lastRefus = { ts: Date.now(), raison: 'mailbox/connect : espace inconnu' };
      return res.status(403).json({ error: 'espace inconnu du serveur' });
    }
  }
  /* Bornes posées AVANT la vérification SMTP/IMAP, pas au moment d'écrire : ce qui est
     vérifié doit être exactement ce qui est enregistré — tronquer après coup stockerait
     un mot de passe qui ne s'authentifie plus. Sans ces bornes, express.json({limit:'6mb'})
     laisse écrire plusieurs mégaoctets par appel dans mailboxes.json, réécrit en entier à
     chaque saveMailboxes(). */
  const _b = req.body || {};
  const teamId = String(_b.teamId || '').slice(0, 80);
  const email = String(_b.email || '').slice(0, 160);
  const pass = String(_b.pass || '').slice(0, 200);
  const name = String(_b.name || '').slice(0, 80);
  if (!teamId || !email || !pass) return res.status(400).json({ error: 'champs requis manquants' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) return res.status(400).json({ error: 'adresse invalide' });
  const srv = mailServers(email);
  try {
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({ host: srv.smtpHost, port: srv.smtpPort, secure: srv.smtpPort === 465, auth: { user: email, pass } });
    await t.verify();
  } catch (e) { return res.status(400).json({ error: 'Connexion envoi (SMTP) refusée : ' + String(e.message || e).slice(0, 140) + '. Pour Gmail/Outlook, utilise un « mot de passe d\'application ».' }); }
  try {
    const { ImapFlow } = require('imapflow');
    const c = new ImapFlow({ host: srv.imapHost, port: srv.imapPort, secure: true, auth: { user: email, pass }, logger: false });
    c.on('error', () => {});   // une erreur émise en événement tuerait le processus : on l'absorbe, l'échec est déjà traité par le try/catch
    await c.connect(); await c.logout();
  } catch (e) { return res.status(400).json({ error: 'Connexion réception (IMAP) refusée : ' + String(e.message || e).slice(0, 140) }); }
  // remplace une éventuelle boîte de même adresse dans la même équipe
  const ex = Object.values(mailboxes).find(b => b.teamId === teamId && b.email.toLowerCase() === String(email).toLowerCase());
  const id = ex ? ex.id : ('mb' + Math.random().toString(36).slice(2, 9));
  mailboxes[id] = { id, teamId, email: String(email), pass: String(pass), name: String(name || '').slice(0, 80), ...srv, ts: Date.now() };
  saveMailboxes();
  res.json({ ok: true, id, email });
  importHistorique(mailboxes[id]).catch(() => {});   // les anciens mails de la boîte arrivent dans l'app (en arrière-plan)
});
app.post('/api/mailbox/disconnect', (req, res) => {
  const { teamId, id } = req.body || {}; const b = mailboxes[id];
  if (b && b.teamId === teamId) { delete mailboxes[id]; saveMailboxes(); }
  res.json({ ok: true });
});
// liste des boîtes d'une équipe (sans mot de passe)
app.get('/api/mailboxes', (req, res) => {
  const teamId = String(req.query.teamId || '');
  const list = Object.values(mailboxes).filter(b => b.teamId === teamId).map(b => ({ id: b.id, email: b.email, name: b.name, imapHost: b.imapHost, smtpHost: b.smtpHost }));
  res.json({ mailboxes: list });
});

// Message-ID déjà enregistrés (évite les doublons entre l'import d'historique et la relève)
let seenMids = new Set();
try { fs.readFileSync(REPLIES_PATH, 'utf8').trim().split('\n').forEach(l => { try { const r = JSON.parse(l); if (r.mid) seenMids.add(r.mid); } catch (_) {} }); } catch (e) {}
// 📜 Import de l'historique d'une boîte à sa connexion : les ~60 derniers mails (lus ou non)
//    arrivent dans l'app avec leur vraie date — sans notification, sans toucher aux drapeaux lu/non-lu.
async function importHistorique(b, limit = 60) {
  const { ImapFlow } = require('imapflow'); const { simpleParser } = require('mailparser'); let client;
  try {
    client = new ImapFlow({ host: b.imapHost, port: b.imapPort || 993, secure: true, auth: { user: b.email, pass: b.pass }, logger: false });
    client.on('error', () => {});   // une erreur émise en événement tuerait le processus : on l'absorbe, l'échec est déjà traité par le try/catch
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const total = (client.mailbox && client.mailbox.exists) || 0;
      if (total) {
        const range = Math.max(1, total - limit + 1) + ':*';
        let n = 0;
        for await (const msg of client.fetch(range, { envelope: true, source: { maxLength: 150000 } })) {
          const env = msg.envelope || {};
          const mid = String(env.messageId || '').slice(0, 200);
          if (mid && seenMids.has(mid)) continue;
          let text = '';
          try { const p = await simpleParser(msg.source); text = String(p.text || '').slice(0, 2000); } catch (e) {}
          const from = ((env.from || [])[0] || {});
          const subj = String(env.subject || '');
          const m = (subj + ' ' + text).match(/BC-\d{4}-\d{2,4}/i);
          const entry = { ts: env.date ? new Date(env.date).getTime() : Date.now(), teamId: b.teamId, boite: b.email, bonNum: m ? m[0].toUpperCase() : '', from: String(from.address || '').toLowerCase(), fromName: String(from.name || '').slice(0, 80), subject: subj.slice(0, 200), text, mid, histo: 1 };
          /* Même course qu'en relève : releveBoite() appelle importHistorique AVANT
             releveUneBoite, et une passe déjà lancée réécrirait ~60 corps de messages d'un
             espace qu'on vient de supprimer. entFermes est écrit en premier : on le lit. */
          if (b.teamId && espaceFerme(b.teamId)) { if (mid) seenMids.add(mid); continue; }
          try { fs.appendFileSync(REPLIES_PATH, JSON.stringify(entry) + '\n'); n++; } catch (_) {}
          if (mid) seenMids.add(mid);
        }
        console.log('historique importé:', masqueMail(b.email), '(' + n + ' mails)');
      }
    } finally { lock.release(); }
    await client.logout();
    if (b.id && mailboxes[b.id]) { mailboxes[b.id].histoDone = true; saveMailboxes(); }   // une seule fois par boîte
  } catch (e) { console.error('histo', masqueMail(b.email) + ':', e.message); try { if (client) client.close(); } catch (_) {} }
}
let boiteBusy = false;
async function releveUneBoite(cfg, tag) {   // cfg = {host/port/user/pass} ; tag = {teamId, userId} pour le rattachement
  const { ImapFlow } = require('imapflow'); let client;
  try {
    client = new ImapFlow({ host: cfg.host, port: cfg.port || 993, secure: true, auth: { user: cfg.user, pass: cfg.pass }, logger: false });
    client.on('error', () => {});   // une erreur émise en événement tuerait le processus : on l'absorbe, l'échec est déjà traité par le try/catch
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const nouveaux = [];
      for await (const msg of client.fetch({ seen: false }, { envelope: true, source: true })) nouveaux.push(msg);
      for (const msg of nouveaux) {
        const mid = String((msg.envelope || {}).messageId || '').slice(0, 200);
        if (mid && seenMids.has(mid)) { try { await client.messageFlagsAdd(msg.seq, ['\\Seen']); } catch (_) {} continue; }   // déjà importé via l'historique
        let text = '';
        try { const { simpleParser } = require('mailparser'); const p = await simpleParser(msg.source); text = String(p.text || '').slice(0, 2000); } catch (e) {}
        const env = msg.envelope || {}; const from = ((env.from || [])[0] || {});
        const fromAddr = String(from.address || '').toLowerCase();
        const subj = String(env.subject || '');
        const m = (subj + ' ' + text).match(/BC-\d{4}-\d{2,4}/i);
        const bonNum = m ? m[0].toUpperCase() : '';
        let teamId = tag ? tag.teamId : '';
        /* PIÈGE LATENT, PAS UNE FUITE EN COURS — à lire avant de simplifier.
           Ce bloc n'est atteint que si tag est nul, c'est-à-dire pour la seule boîte commandes
           partagée de config.imap (ligne ~560) ; une boîte connectée par une entreprise porte
           déjà son tag.teamId, et importHistorique écrit b.teamId. Or config.imap n'est pas
           configuré en production (/health : "boite":false), donc ce chemin est mort aujourd'hui.
           Il s'arme à la première boîte partagée configurée, et c'est là que le rattachement
           d'origine devenait dangereux : il retenait le PREMIER indice venu. Le numéro de bon
           ne vaut rien seul — nextNum() est un compteur local à chaque entreprise, toutes
           démarrent à BC-2026-001, donc deux clients portent couramment le même numéro.
           L'adresse d'expéditeur non plus : deux entreprises de nettoyage partagent leurs
           fournisseurs. D'où la règle ci-dessous : un indice n'est retenu que s'il ne désigne
           QU'UNE équipe, sinon teamId reste vide. Un message non rattaché reste invisible dans
           l'app ; un message mal rattaché part chez un concurrent avec son corps et une
           notification push, sans laisser trace d'erreur. */
        if (!teamId) {
          const seuleEquipe = (liste) => { const eq = new Set(liste.map(x => x.teamId)); return eq.size === 1 ? liste[liste.length - 1].teamId : ''; };
          const conjoint = bonNum ? sentMap.filter(x => x.bonNum === bonNum && x.to === fromAddr) : [];
          if (conjoint.length) teamId = seuleEquipe(conjoint);
          if (!teamId && bonNum) teamId = seuleEquipe(sentMap.filter(x => x.bonNum === bonNum));
          if (!teamId) teamId = seuleEquipe(sentMap.filter(x => x.to === fromAddr));
        }
        const entry = { ts: Date.now(), teamId, boite: tag ? tag.email : '', bonNum, from: fromAddr, fromName: String(from.name || '').slice(0, 80), subject: subj.slice(0, 200), text, mid };
        /* Une relève en vol réécrit ce qu'une suppression totale vient de purger. releveBoite()
           capture Object.keys(mailboxes) puis boucle avec await : supprimer la boîte du registre
           n'interrompt PAS la passe déjà lancée, dont la configuration est une copie locale. Elle
           allait jusqu'au bout et réécrivait le corps du message d'un client effacé — parfois après
           la purge. Pire : purgeJournal lit-filtre-renomme, donc les lignes ajoutées entre-temps par
           une AUTRE entreprise étaient perdues. entFermes est écrit en PREMIER par la suppression :
           le lire ici referme la fenêtre de lui-même. */
        const ferme = entry.teamId && espaceFerme(entry.teamId);
        if (!ferme) { try { fs.appendFileSync(REPLIES_PATH, JSON.stringify(entry) + '\n'); } catch (_) {} }
        if (mid) seenMids.add(mid);
        /* On marque quand même le message comme lu, y compris pour un espace fermé : sinon la
           relève suivante le relirait indéfiniment. */
        try { await client.messageFlagsAdd(msg.seq, ['\\Seen']); } catch (_) {}
        if (ferme) continue;
        if (teamId) {
          const payload = JSON.stringify({ title: '📥 Nouveau message' + (bonNum ? ' — ' + bonNum : ''), body: ((entry.fromName || fromAddr) + ' : ' + subj).slice(0, 240), url: '/app.html#v=boiteMail' });
          const targets = Object.values(subs).filter(s => s.teamId === teamId);
          for (const t of targets) { try { await webpush.sendNotification(t.sub, payload); } catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { delete subs[t.sub.endpoint]; saveSubs(); } } }
        }
      }
    } finally { lock.release(); }
    await client.logout();
  } catch (e) { console.error('releve', masqueMail(cfg.user) + ':', e.message); try { if (client) client.close(); } catch (_) {} }
}
async function releveBoite() {
  if (boiteBusy) return; boiteBusy = true;
  try {
    if (config.imap && config.imap.user && config.imap.pass) await releveUneBoite({ host: config.imap.host || 'ssl0.ovh.net', port: config.imap.port || 993, user: config.imap.user, pass: config.imap.pass }, null);
    for (const k of Object.keys(mailboxes)) { const b = mailboxes[k];
      if (!b.histoDone) await importHistorique(b).catch(() => {});   // boîtes connectées avant cette mise à jour : historique importé au premier passage
      await releveUneBoite({ host: b.imapHost, port: b.imapPort, user: b.email, pass: b.pass }, { teamId: b.teamId, email: b.email }); }
  } catch (e) { console.error('releveBoite:', e.message); }
  boiteBusy = false;
}
setInterval(() => { releveBoite().catch(() => {}); }, 120000);
setTimeout(() => { releveBoite().catch(() => {}); }, 8000);
// réponses d'une équipe (les 100 dernières)
app.get('/api/replies', (req, res) => {
  const teamId = String(req.query.teamId || ''); if (!teamId) return res.status(400).json({ error: 'teamId requis' });
  let list = [];
  try { list = fs.readFileSync(REPLIES_PATH, 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(r => r.teamId === teamId).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 200); } catch (e) {}
  res.json({ replies: list });
});
// journal des bugs (protégé par la clé API du serveur)
app.get('/api/bugs', (req, res) => {
  if ((req.query.key || '') !== config.apiKey) return res.status(403).json({ error: 'clé invalide' });
  let list = [];
  try { list = fs.readFileSync(BUGS_PATH, 'utf8').trim().split('\n').slice(-200).map(l => JSON.parse(l)).reverse(); } catch (e) {}
  res.json({ bugs: list });
});
app.get('/api/vapid', (req, res) => res.json({ key: config.vapidPublicKey }));

// abonnement push d'un appareil
app.post('/api/subscribe', (req, res) => {
  const { sub, teamId, userId, userName } = req.body || {};
  if (!sub || !sub.endpoint || !teamId) return res.status(400).json({ error: 'sub et teamId requis' });
  /* Un espace supprimé ne se laisse pas ressusciter par un appareil resté hors ligne :
     sans ce garde-fou, il réapparaît avec les identifiants et les noms de ses salariés.
     On répond ok — l'appareil n'a rien fait de mal, et /api/espaces/etat lui dira de se
     vider — mais on n'écrit RIEN. */
  if (espaceFerme(String(teamId).slice(0, 80))) return res.json({ ok: true, ferme: true });
  subs[sub.endpoint] = { sub, teamId: String(teamId).slice(0, 80), userId: String(userId || '').slice(0, 80), userName: String(userName || '').slice(0, 80), ts: Date.now() };
  saveSubs();
  res.json({ ok: true });
});

app.post('/api/unsubscribe', (req, res) => {
  const ep = req.body && req.body.endpoint;
  if (ep && subs[ep]) { delete subs[ep]; saveSubs(); }
  res.json({ ok: true });
});

// envoi d'une notification à une équipe (tous ses appareils abonnés)
app.post('/api/notify', async (req, res) => {
  const { teamId, title, body, url, exceptUserId, userIds } = req.body || {};
  if (!teamId || !title) return res.status(400).json({ error: 'teamId et title requis' });
  const payload = JSON.stringify({
    title: String(title).slice(0, 120),
    body: String(body || '').slice(0, 300),
    /* L'adresse partait telle quelle dans la notification, et sw.js la passe à
       w.navigate() / clients.openWindow() sans la relire. N'importe qui pouvait donc
       pousser « Votre session a expiré » sur les téléphones de terrain d'une entreprise,
       vers son propre domaine. On n'accepte plus qu'un chemin interne — vérifié :
       l'application n'envoie jamais que '/app.html', '/espace.html' ou '/messages.html'.
       Le « pas deux barres » exclut « //ailleurs.example », qui est une adresse absolue. */
    url: (function () {
      /* On RÉSOUT l'adresse au lieu de la filtrer. Une expression régulière ne suffit pas :
         les navigateurs traitent « \ » comme « / » et retirent tabulation, saut de ligne et
         retour chariot AVANT d'analyser — si bien que « /\evil.com » et « / » suivi d'une
         tabulation passaient un test « commence par une seule barre » et menaient pourtant
         chez l'attaquant. Vérifié sur les quatre formes. En résolvant contre notre propre
         origine et en n'acceptant que ce qui y reste, les quatre tombent d'un coup. */
      try {
        const abs = new URL(String(url || '/app.html').slice(0, 200), 'https://teamop.fr');
        if (abs.origin !== 'https://teamop.fr') return '/app.html';
        /* Pas de fragment : app.html lit « #entreprise=CODE » et rejoint l'espace
           correspondant, en rechargeant la page. Une notification pointant là ferait
           basculer l'appareil d'un salarié sur l'espace de qui l'a poussée. Vérifié :
           l'application n'envoie jamais de fragment, seulement '/app.html' ou
           '/espace.html'. */
        return (abs.pathname + abs.search).slice(0, 200);
      } catch (e) { return '/app.html'; }
    })()
  });
  const targets = Object.values(subs).filter(s =>
    s.teamId === teamId &&
    (!exceptUserId || s.userId !== exceptUserId) &&
    (!Array.isArray(userIds) || userIds.length === 0 || userIds.includes(s.userId))
  );
  let sent = 0, dead = 0;
  await Promise.all(targets.map(async t => {
    try { await webpush.sendNotification(t.sub, payload); sent++; }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { delete subs[t.sub.endpoint]; dead++; }
    }
  }));
  if (dead) saveSubs();
  res.json({ ok: true, sent, removed: dead });
});

// envoi d'e-mail métier (rapports, avis, devis…) — TOUJOURS via la boîte de l'entreprise (fournie par l'app),
// jamais via l'adresse TeamOP (réservée aux codes de sécurité)
const mailQuota = new Map();
// 30 e-mails/heure par espace ; un espace sans appareil abonné aux notifications
// est compté par adresse IP (anti-abus). Renvoie le message de refus, ou null.
// (prefixe/max : un compteur à part, par ex. pour les e-mails d'accès, qui ne rogne pas celui des documents)
function mailQuotaRefus(req, teamId, prefixe, max) {
  prefixe = prefixe || ''; max = max || 30;
  const teamConnue = Object.values(subs).some(s => s.teamId === teamId);
  const cle = prefixe + (teamConnue ? teamId : 'ip:' + (req.ip || '?'));   // req.ip, jamais l'en-tête brut : il se falsifie
  const q = mailQuota.get(cle) || { count: 0, reset: Date.now() + 3600000 };
  if (Date.now() > q.reset) { q.count = 0; q.reset = Date.now() + 3600000; }
  if (q.count >= max) {
    const min = Math.max(1, Math.ceil((q.reset - Date.now()) / 60000));
    lastRefus = { ts: Date.now(), raison: (prefixe ? prefixe + ' ' : '') + (teamConnue ? 'quota équipe (' + max + '/h)' : 'quota IP (espace sans notifications)') };
    return 'quota horaire atteint (' + max + ' e-mails/h) — réessaie dans ' + min + ' min';
  }
  q.count++; mailQuota.set(cle, q);
  return null;
}
app.post('/api/sendmail', async (req, res) => {
  const { teamId, to, subject, text, smtp, brand, atts, meta, useMailbox } = req.body || {};
  if (!teamId || !to || !subject) return res.status(400).json({ error: 'teamId, to et subject requis' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(to))) return res.status(400).json({ error: 'destinataire invalide' });
  /* ── L'ESPACE DOIT AU MOINS EXISTER ──
     Le seul contrôle était « teamId non vide » : n'importe quelle chaîne ouvrait les trois
     modes d'envoi, dont celui qui expédie depuis le serveur mail de TeamOP, authentifié SPF
     et DKIM. Le garde-fou est celui de /api/compte/identifiants (commentaire
     « Anti-hameçonnage » plus bas), posé ici pour couvrir AUSSI le mode « boîte connectée » —
     le plus grave des trois, puisqu'il envoie depuis la vraie adresse de l'entreprise avec
     son propre mot de passe.

     ⚠️ CE QUE ÇA NE FERME PAS, ET IL FAUT LE SAVOIR : cnxData s'inscrit tout seul par
     /api/connexions, qui est publique — deux requêtes suffisent à faire exister un espace
     inventé. Et le nom d'expéditeur reste `brand.name`, choisi par l'appelant : avec
     n'importe quel teamId accepté, on peut toujours signer du nom qu'on veut. Ce contrôle
     élève la marche, il ne referme pas la porte. La vraie fermeture demande que chaque
     entreprise ait son propre teamId — aujourd'hui toutes celles restées sur la clé par
     défaut partagent « elan-gestion ». C'est un chantier à part, et c'est LE chantier.

     Posé AVANT le quota : sinon un refus consommerait quand même un jeton, et on pourrait
     épuiser l'heure d'envoi d'une entreprise par des requêtes toutes refusées. */
  {
    const tEnv = String(teamId).slice(0, 80);
    const connu = !!espaceParT(tEnv) || Object.values(subs).some(x => x.teamId === tEnv) || !!cnxData[tEnv];
    if (!connu) {
      /* Pas de teamId dans lastRefus : /health est publique, et un teamId est la seule clé
         d'accès aux routes de messagerie. Le motif suffit au diagnostic. La règle vaut pour TOUS les
         lastRefus, pas seulement celui-ci : ni identifiant, ni slug, ni adresse — un motif générique. */
      lastRefus = { ts: Date.now(), raison: 'sendmail : espace inconnu' };
      /* Le libellé évite les mots que l'application prend pour un problème d'identifiants —
         sinon on enverrait un client changer son mot de passe pour rien. */
      return res.status(403).json({ error: 'espace inconnu du serveur' });
    }
  }
  const refus = mailQuotaRefus(req, teamId);
  if (refus) return res.status(429).json({ error: refus });
  const msg = { to, subject: String(subject).slice(0, 200), text: String(text || '').slice(0, 10000) };
  // Pièces jointes (ex : bon de commande en PDF) — max 3 fichiers, ~4 Mo au total (base64)
  if (Array.isArray(atts) && atts.length) {
    let total = 0; const list = [];
    for (const a of atts.slice(0, 3)) {
      const content = String((a && a.content) || '');
      if (!content || !/^[A-Za-z0-9+/=]+$/.test(content)) continue;
      total += content.length;
      list.push({ filename: (String((a && a.filename) || 'document.pdf').replace(/[^\w. ()-]/g, '').slice(0, 80)) || 'document.pdf', content, encoding: 'base64' });
    }
    if (total > 5500000) return res.status(413).json({ error: 'pièces jointes trop volumineuses (max ~4 Mo)' });
    if (list.length) msg.attachments = list;
  }
  // Boîte connectée choisie à l'envoi : le serveur a le mot de passe, l'app ne l'envoie jamais
  const mb = (useMailbox && useMailbox.id && mailboxes[useMailbox.id] && mailboxes[useMailbox.id].teamId === teamId) ? mailboxes[useMailbox.id] : null;
  try {
    if (mb) {
      const nodemailer = require('nodemailer');
      const t = nodemailer.createTransport({ host: mb.smtpHost, port: mb.smtpPort, secure: mb.smtpPort === 465, auth: { user: mb.email, pass: mb.pass } });
      const dn = String((brand && brand.name) || mb.name || '').replace(/["<>\r\n]/g, '').slice(0, 80);
      await t.sendMail({ from: dn ? '"' + dn + '" <' + mb.email + '>' : mb.email, ...msg });
    } else if (smtp && smtp.user && smtp.pass && smtp.host) {
      // Mode avancé : boîte de l'entreprise / de l'utilisateur
      const nodemailer = require('nodemailer');
      const port = parseInt(smtp.port) || 465;
      const t = nodemailer.createTransport({ host: String(smtp.host).slice(0, 100), port, secure: port === 465, auth: { user: String(smtp.user).slice(0, 120), pass: String(smtp.pass).slice(0, 200) } });
      await t.sendMail({ from: String(smtp.from || smtp.user).slice(0, 160), ...msg });
    } else {
      // Mode simple : la plateforme envoie au nom de l'entreprise (Reply-To vers elle)
      if (!mailer) return res.status(503).json({ error: 'email_off' });
      const name = String((brand && brand.name) || 'TeamOP').replace(/["<>\r\n]/g, '').slice(0, 80);
      const replyTo = (brand && brand.replyTo && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(brand.replyTo))) ? String(brand.replyTo) : undefined;
      const addr = (config.smtp.from || config.smtp.user).match(/<([^>]+)>/) ? (config.smtp.from || config.smtp.user).match(/<([^>]+)>/)[1] : (config.smtp.user);
      await mailerEnvoi({ from: '"' + name + '" <' + addr + '>', replyTo, ...msg });
    }
    if (meta && (meta.bonNum || meta.track)) rememberSent(teamId, meta.bonNum || '', to);   // pour rattacher la future réponse
    res.json({ ok: true });
  } catch (e) { lastRefus = { ts: Date.now(), raison: refusSmtp(e) }; res.status(500).json({ error: e.message }); }
});

// Accès d'un compte créé par l'entreprise : identifiant + mot de passe provisoire + lien de connexion
// de l'entreprise (le lien met l'appareil sur le bon espace). Le mot de passe n'est jamais journalisé.
app.post('/api/compte/identifiants', async (req, res) => {
  const { teamId, to, prenom, entreprise, login, mdp, lien, par } = req.body || {};
  if (!teamId || !to || !login || !mdp) return res.status(400).json({ error: 'teamId, to, login et mdp requis' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(to))) return res.status(400).json({ error: 'destinataire invalide' });
  if (!mailer) return res.status(503).json({ error: 'email_off' });
  const t = String(teamId).slice(0, 80);
  // Anti-hameçonnage : cette route envoie un e-mail officiel avec un lien d'espace → seulement pour un espace
  // que le serveur connaît (annuaire, ou appareils abonnés aux notifications), jamais pour un espace inventé.
  const esp = espaceParT(t);
  const espaceConnu = !!esp || Object.values(subs).some(s => s.teamId === t);
  if (!espaceConnu) { lastRefus = { ts: Date.now(), raison: 'accès : espace inconnu' }; return res.status(403).json({ error: 'espace inconnu du serveur — transmets les accès toi-même' }); }
  const refus = mailQuotaRefus(req, t, 'acces:', 20);
  if (refus) return res.status(429).json({ error: refus });
  const net = (s, n) => String(s || '').replace(/[<>\r\n]/g, '').trim().slice(0, n);
  const ent = net(entreprise, 80) || net(esp && esp.nom, 80), pre = net(prenom, 60), id = net(login, 60), pwd = net(mdp, 60), qui = net(par, 80);
  // rien qui ressemble à une adresse web ou à un numéro dans les champs libres (auto-liés par les clients mail)
  if (/\s/.test(id) || /\s/.test(pwd) || /https?:|www\./i.test(id + ' ' + pwd + ' ' + pre + ' ' + ent + ' ' + qui)) return res.status(400).json({ error: 'champs invalides' });
  // Lien fourni par l'app : accepté seulement s'il est TeamOP et, pour un lien d'espace #entreprise=CODE, si le code
  // désigne bien CET espace (t identique) — sinon on l'ignore.
  let lienApp = '', cleApp = '';
  if (/^https:\/\/teamop\.fr\/(app|beta|connexion)\.html([#?][A-Za-z0-9+/=_.&%#?-]*)?$/.test(String(lien || ''))) {
    const l = String(lien).slice(0, 700); const m = l.match(/#entreprise=([A-Za-z0-9+/=_-]{8,})/);
    if (m) { try { const o = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8')); if (o && o.t === t) { lienApp = l; cleApp = String(o.k || ''); } } catch (e) {} }
    else if (!/#e=/.test(l)) lienApp = l;   // connexion.html / app.html sans espace
  }
  // Espace de l'annuaire → lien de connexion (teamop.fr/app.html#entreprise=CODE)… sauf si la clé a changé depuis
  // l'inscription : le code de l'annuaire serait périmé, le lien de l'app (clé actuelle) fait foi.
  let cleAnn = ''; try { if (esp && esp.code) cleAnn = String(JSON.parse(Buffer.from(esp.code, 'base64').toString('utf8')).k || ''); } catch (e) {}
  const annuaireOk = !!(esp && esp.slug && esp.code) && (!cleApp || !cleAnn || cleApp === cleAnn);
  /* ⛔ ON N'ENVOIE PLUS DE LIEN D'ESPACE — 12 septembre 2026. Ce courriel part vers un employé
     qui vient d'être créé : il portait `k`, la clé qui déchiffre TOUTES les données de
     l'entreprise, dans une URL. Or ce cas-là n'en a aucun besoin — l'entreprise a déjà des
     comptes (on vient justement d'en créer un), donc l'ADRESSE suffit : la personne y tape son
     identifiant et son mot de passe, et elle arrive.
     On donne l'adresse dès qu'on a un slug, même si `annuaireOk` est faux : envoyer quelqu'un
     sur connexion.html sans lui dire OÙ aller, c'est l'échouer à coup sûr. Si quelque chose
     cloche côté espace, /api/espaces/connexion le lui dira clairement. */
  const adrEsp = (esp && esp.slug) ? ('https://teamop.fr/e/' + esp.slug) : '';
  const url = adrEsp || 'https://teamop.fr/connexion.html';
  const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const entTxt = ent ? ' « ' + ent + ' »' : '';
  // ce que l'écran de connexion affichera vraiment : le nom porté par le lien (annuaire si #e=…, sinon celui de l'app)
  const nomEcran = annuaireOk ? net(esp.nom, 80) : ent;
  const ecranTxt = nomEcran ? ' « ' + nomEcran + ' »' : '';
  const lienEspace = !!adrEsp;   // on sait où l'envoyer ; sinon c'est l'écran de connexion générique
  const explique = lienEspace
    ? 'C\'est l\'adresse de votre entreprise' + ecranTxt + '. Ouvrez-la, entrez votre identifiant et votre mot de passe provisoire — sur n\'importe quel téléphone. Mettez-la en favori : il n\'y a rien d\'autre à conserver.'
    : 'Ouvrez cette page, entrez l\'adresse de votre entreprise (demandez-la à votre responsable), puis votre identifiant et votre mot de passe provisoire.';
  const sansLien = lienEspace ? '(Cette adresse est la même pour toute l\'équipe — chacun s\'y connecte avec SES identifiants.)' : '';
  try {
    await mailerEnvoi({ confidentiel: true, trace: 'accès @' + id + ' → ' + url + ' · espace ' + t + (qui ? ' · par ' + qui : ''), from: config.smtp.from || config.smtp.user, to,
      subject: 'Vos accès OP GESTION' + (ent ? ' — ' + ent : ''),
      text: 'Bonjour' + (pre ? ' ' + pre : '') + ',\n\n' + (qui ? qui + ' vous a créé' : 'Votre entreprise vous a créé') + ' un compte OP GESTION' + (ent ? ' (' + ent + ')' : '') + '.\n\n'
        + 'Identifiant : ' + id + '\nMot de passe provisoire : ' + pwd + '\n\n'
        + (lienEspace ? 'L\'adresse de votre entreprise' + entTxt + ' :\n' : 'Pour vous connecter :\n') + url + '\n'
        + explique + '\n' + (sansLien ? sansLien + '\n' : '')
        + '\nÀ votre première connexion, l\'application vous fera choisir votre propre mot de passe.\n\n— TEAM OP · teamop.fr',
      html: mailTeamOP({ chip: 'Bienvenue', titre: 'Vos accès OP GESTION' + (ent ? ' · ' + ent : ''),
        corpsHtml: 'Bonjour' + (pre ? ' ' + x(pre) : '') + ',<br>' + (qui ? '<b>' + x(qui) + '</b> vous a créé' : 'votre entreprise vous a créé') + ' un compte sur l\'application OP GESTION' + (ent ? ' de <b>' + x(ent) + '</b>' : '') + '.<br><br>'
          + (lienEspace ? '<b>L\'adresse de votre entreprise' + x(entTxt) + '</b>' : '<b>Pour vous connecter</b>') + ' :<br><a href="' + x(url) + '" style="color:#34A97E;font-size:18px;font-weight:700">' + x(url.replace('https://', '')) + '</a><br>'
          + '<span style="font-size:13px">' + x(explique).replace('« Vous allez vous connecter à l\'entreprise' + x(ecranTxt) + ' »', '« <b>Vous allez vous connecter à l\'entreprise' + x(ecranTxt) + '</b> »')
          + (sansLien ? '<br><span style="color:#8fa3c8">' + x(sansLien) + '</span>' : '') + '</span>',
        blocHtml: MAIL_BLOCS.acces(x(id), x(pwd)),
        frise: [
          { titre: 'Compte créé', sous: qui ? 'par ' + qui : 'par votre entreprise', fait: true },
          { titre: 'Connectez-vous', sous: lienEspace ? 'à cette adresse' : 'sur teamop.fr', fait: false },
          { titre: 'Votre mot de passe', sous: 'choisi à la 1re connexion', fait: false }
        ],
        boutonTxt: lienEspace ? 'Ouvrir mon espace' : 'Ouvrir OP GESTION', boutonUrl: url }) });
    res.json({ ok: true, lien: url, entreprise: ent });
  } catch (e) { lastRefus = { ts: Date.now(), raison: refusSmtp(e) }; res.status(500).json({ error: e.message }); }
});

/* ── Gabarit d'e-mail TEAM OP (modèle « Suivi ») : logo, pastille d'état, frise,
   boutons. Sert à tous les e-mails automatiques envoyés aux clients. ── */
// ── Gabarit des e-mails TEAM OP ─────────────────────────────────────────────
//  Tableaux imbriqués et styles en ligne : la seule chose que TOUS les clients
//  de messagerie rendent pareil. Le logo est chargé depuis teamop.fr, jamais
//  joint : une pièce jointe pèse dans le filtre anti-spam, et Exchange affichait
//  l'image jointe à sa taille native (1024 px) en ignorant width/height. La
//  taille est fixée trois fois (attributs, style, max-width) pour cette raison.
//  Le mode sombre est déclaré (color-scheme) et pris en charge par des règles
//  !important : c'est ainsi qu'Apple Mail et Outlook l'appliquent.
const MAIL_POLICE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MAIL_STYLE = '<style>' +
  ':root{color-scheme:light dark;supported-color-schemes:light dark}' +
  'body{margin:0;padding:0;-webkit-text-size-adjust:100%}' +
  'a{color:#1E7A4E}' +
  '@media (prefers-color-scheme:dark){' +
    '.m-fond{background:#0D1624!important}' +
    '.m-carte{background:#16203A!important;border-color:#243154!important}' +
    '.m-fort,.m-fort b{color:#EAEEF7!important}' +
    '.m-texte{color:#B6C2D9!important}.m-texte b{color:#EAEEF7!important}' +
    '.m-muet{color:#8B9AB8!important}' +
    '.m-pied{border-color:#243154!important;color:#8B9AB8!important}.m-pied a{color:#4FD196!important}' +
    '.m-lien{color:#4FD196!important}' +   /* un lien dans un cadre (courriel J-7) : le vert du jour tombe à 3,3:1 sur le cadre de nuit */
    '.m-bloc{background:#0F1830!important;border-color:#243154!important;color:#B6C2D9!important}.m-bloc b{color:#EAEEF7!important}' +
    '.m-btn{background:#2EB872!important;color:#06231A!important}' +
    '.m-btn2{color:#B6C2D9!important}' +
    '.m-chip{background:#1B2542!important;color:#B6C2D9!important}' +
  '}' +
  '@media (max-width:600px){.m-int{padding-left:20px!important;padding-right:20px!important}}' +
  '</style>';
function mailTeamOP(o) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const int = (haut, bas) => 'padding:' + haut + 'px 36px ' + bas + 'px';
  // Le pré-en-tête : la ligne grise sous l'objet dans la boîte de réception.
  const pre = o.preentete || String(o.corpsHtml || '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').slice(0, 110);
  const etapes = (o.frise || []).map((e, i) =>
    '<td width="' + Math.floor(100 / (o.frise.length || 1)) + '%" class="m-texte" style="border-top:3px solid ' + (e.fait ? '#1E7A4E' : '#E4E8F0') + ';padding-top:9px;font-size:12.5px;color:' + (e.fait ? '#17233B' : '#8593AB') + '"><b>' + (e.fait && i === 0 ? '✔ ' : '') + esc(e.titre) + '</b><br><span class="m-muet" style="color:#8593AB">' + esc(e.sous) + '</span></td>').join('');
  const bouton = o.boutonTxt ? '<a href="' + esc(o.boutonUrl) + '" class="m-btn" style="display:inline-block;background:#1E7A4E;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;line-height:20px;padding:13px 22px;border-radius:12px;font-family:' + MAIL_POLICE + '">' + esc(o.boutonTxt) + '</a>' : '';
  const bouton2 = o.bouton2Txt ? '<a href="' + esc(o.bouton2Url) + '" class="m-btn2" style="display:inline-block;color:#4A5A7A;text-decoration:none;font-size:14px;line-height:20px;padding:13px 16px;font-family:' + MAIL_POLICE + '">' + esc(o.bouton2Txt) + '</a>' : '';
  const desabo = o.desabo ? ' · <a href="mailto:contact@teamop.fr?subject=Stop%20annonces" style="color:#8593AB">ne plus recevoir les annonces</a>' : '';
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>' + esc(o.titre) + '</title>' + MAIL_STYLE + '</head>' +
    '<body class="m-fond" style="margin:0;padding:0;background:#F2F4F8">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">' + esc(pre) + '&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="m-fond" style="background:#F2F4F8"><tr><td align="center" style="padding:32px 12px">' +
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" class="m-carte" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:16px;border:1px solid #E4E8F0;font-family:' + MAIL_POLICE + '">' +
    // en-tête : logo TEAM OP (34 px) + mot-marque, puce de contexte à droite
    '<tr><td class="m-int" style="' + int(26, 0) + '"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td><table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
    '<td width="34" style="width:34px"><img src="https://teamop.fr/icons/teamop-192.png" width="34" height="34" alt="TEAM OP" style="width:34px;height:34px;max-width:34px;border-radius:9px;display:block;border:0"></td>' +
    '<td class="m-fort" style="padding-left:11px;font-family:' + MAIL_POLICE + ';font-weight:700;font-size:15px;letter-spacing:.07em;color:#17233B">TEAM OP</td>' +
    '</tr></table></td>' +
    (o.chip ? '<td align="right"><span class="m-chip" style="display:inline-block;background:' + (o.chipBg || '#EAF4EE') + ';color:' + (o.chipColor || '#1E7A4E') + ';font-size:12px;font-weight:600;line-height:16px;padding:5px 11px;border-radius:100px;letter-spacing:.01em">' + esc(o.chip) + '</span></td>' : '') +
    '</tr></table></td></tr>' +
    '<tr><td class="m-int m-fort" style="' + int(26, 0) + ';font-size:22px;line-height:28px;font-weight:700;letter-spacing:-.01em;color:#17233B">' + esc(o.titre) + '</td></tr>' +
    '<tr><td class="m-int m-texte" style="' + int(10, 0) + ';font-size:15px;line-height:24px;color:#4A5A7A">' + o.corpsHtml + '</td></tr>' +
    (o.blocHtml ? '<tr><td class="m-int" style="' + int(20, 0) + '">' + o.blocHtml + '</td></tr>' : '') +
    (etapes ? '<tr><td class="m-int" style="' + int(24, 0) + '"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' + etapes + '</tr></table></td></tr>' : '') +
    ((bouton || bouton2) ? '<tr><td class="m-int" style="' + int(26, 8) + '">' + bouton + bouton2 + '</td></tr>' : '<tr><td style="height:8px;line-height:8px;font-size:0">&nbsp;</td></tr>') +
    '<tr><td class="m-int m-pied" style="' + int(18, 22) + ';border-top:1px solid #EDF0F5;font-size:12px;line-height:18px;color:#8593AB">TEAM OP · la suite de gestion des pros du terrain · <a href="https://teamop.fr" style="color:#1E7A4E;text-decoration:none">teamop.fr</a>' + desabo + '</td></tr>' +
    '</table>' +
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%"><tr><td class="m-muet" style="padding:14px 8px 0;font-size:11.5px;line-height:17px;color:#8593AB;font-family:' + MAIL_POLICE + '">Vous recevez cet e-mail parce que vous avez un compte TEAM OP.</td></tr></table>' +
    '</td></tr></table></body></html>';
}

/* ── Encarts réutilisables des e-mails TeamOP (galerie validée par Justin) ── */
const MAIL_BLOCS = {
  // Un bloc = une table à fond très léger et bord fin ; en mode sombre les
  // classes m-bloc reprennent la main (voir MAIL_STYLE).
  cadre: (html, fond, bord, couleur) => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="m-bloc" style="background:' + (fond || '#F6F8FB') + ';border:1px solid ' + (bord || '#E4E8F0') + ';border-radius:12px;color:' + (couleur || '#4A5A7A') + '"><tr><td style="padding:16px 18px;font-size:14px;line-height:22px;font-family:' + MAIL_POLICE + '">' + html + '</td></tr></table>',
  code: (c) => '<div align="center"><div class="m-bloc" style="display:inline-block;background:#F6F8FB;border:1.5px dashed #C9D3E3;border-radius:14px;padding:18px 34px;font-family:\'SF Mono\',Menlo,Consolas,\'Courier New\',monospace;font-size:32px;line-height:38px;font-weight:700;letter-spacing:10px;color:#17233B">' + String(c).split('').join(' ') + '</div><div class="m-muet" style="font-size:12px;line-height:18px;color:#8593AB;padding-top:10px">Ce code expire dans <b>10 minutes</b> · 5 essais maximum</div></div>',
  transmettre: (login) => MAIL_BLOCS.cadre('👤 À transmettre à <b>' + login + '</b> — ce membre de votre équipe a oublié son mot de passe et son compte n\'a pas d\'adresse e-mail.', '#FFF8EC', '#F2DFB6', '#7A5A17'),
  ident: (a, m) => MAIL_BLOCS.cadre('<b>Vos identifiants de départ</b><br>Identifiant : <b style="font-family:\'SF Mono\',Menlo,Consolas,monospace">' + a + '</b><br>Mot de passe provisoire : <b style="font-family:\'SF Mono\',Menlo,Consolas,monospace">' + m + '</b>', '#EEF7F2', '#CFE6D8', '#17233B') + '<div class="m-muet" style="font-size:12px;line-height:18px;color:#8593AB;padding-top:8px">À votre première connexion, l\'application vous fait choisir votre vrai mot de passe — ensuite ce sont vos identifiants pour toujours.</div>',
  acces: (a, m) => MAIL_BLOCS.cadre('<b>Vos identifiants</b><br>Identifiant : <b style="font-family:\'SF Mono\',Menlo,Consolas,monospace">' + a + '</b><br>Mot de passe provisoire : <b style="font-family:\'SF Mono\',Menlo,Consolas,monospace">' + m + '</b>', '#EEF7F2', '#CFE6D8', '#17233B') + '<div class="m-muet" style="font-size:12px;line-height:18px;color:#8593AB;padding-top:8px">À votre première connexion, l\'application vous fait choisir votre vrai mot de passe — ensuite ce sont vos identifiants pour toujours.</div>',
  promo: (c, f, fin) => MAIL_BLOCS.cadre('<b>🎁 Code ' + c + ' activé</b><br>Formule <b>' + f + '</b> offerte jusqu\'au <b>' + fin + '</b><br><span class="m-muet" style="color:#8593AB;font-size:12.5px">Aucune carte bancaire requise · un rappel avant la fin</span>', '#F4F0FB', '#DDD3F0', '#3F2B66'),
  echeance: (fin) => MAIL_BLOCS.cadre('<b>⏳ Votre période offerte se termine le ' + fin + '</b><br><span style="font-size:13px">Vos données sont conservées, quoi qu\'il arrive — mais sans abonnement, l\'accès à l\'application sera suspendu jusqu\'au règlement.</span>', '#FFF6EE', '#F5D9BC', '#7A4A17'),
  vigie: (e2) => { const x = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#16203A;border-radius:12px"><tr><td style="padding:16px 20px;font-family:\'SF Mono\',Menlo,Consolas,\'Courier New\',monospace;font-size:12px;line-height:20px;color:#D7E2F2">App : ' + x(e2.app) + ' (v' + x(e2.version) + ')<br>Espace : ' + x(e2.team) + '<br>Erreur : ' + x(e2.msg) + '<br>Fichier : ' + x(e2.src || '—') + (e2.line ? ' · ligne ' + e2.line : '') + '<br>Appareil : ' + x(String(e2.ua).slice(0, 90)) + (e2.stack ? '<br><br><span style="color:#8B9AB8">' + x(e2.stack).replace(/\n/g, '<br>') + '</span>' : '') + '</td></tr></table>'; }
};
const FORMULE_LBL2 = { gratuit: 'Gratuit', pro: 'Pro', business: 'Business', premium: 'Business Premium' };
// avis « ton code est activé » — envoyé UNE fois, à l'adresse de l'entreprise
function mailPromoActive(teamT, code, finLe, formule) {
  try {
    if (!mailer || !teamT) return;
    const e = Object.values(espacesReg).find(x => {
      if (x.t) return x.t === teamT;
      try { return String(JSON.parse(Buffer.from(x.code, 'base64').toString('utf8')).t || '') === teamT; } catch (err) { return false; }
    });
    if (!e || !e.email) return;
    /* ⛔ la formule que la période SERT (`formulePromo` : celle du code, jamais sous la fiche), pas celle du code seule —
       sinon une fiche Business Premium recevant un code Pro lisait « Pro offerte » ici, puis Business Premium dans
       l'application et dans le courriel J-7 (relecture adverse du 29 septembre 2026) */
    const fServie = formulePromo(espaceParT(teamT) || e, code) || formule;
    const lbl = FORMULE_LBL2[fServie] || fServie || 'Business Premium';
    const finFr = /^\d{4}-\d{2}-\d{2}$/.test(String(finLe)) ? String(finLe).split('-').reverse().join('/') : String(finLe || '');
    mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: e.email,
      subject: '🎁 Votre code est activé — TEAM OP',
      text: 'Bonjour,\n\nvotre code promo ' + code + ' vient d\'être activé : formule ' + lbl + ' offerte jusqu\'au ' + finFr + ', sans carte bancaire.\n\n— TEAM OP · teamop.fr',
      html: mailTeamOP({ chip: 'Cadeau', chipBg: '#F1EBFC', chipColor: '#6D3FC4', titre: 'Votre code est activé 🎁',
        corpsHtml: 'Bonjour,<br>bonne nouvelle : votre code promo vient d\'être activé sur votre espace.',
        blocHtml: MAIL_BLOCS.promo(code, lbl, finFr),
        boutonTxt: 'Ouvrir mon application', boutonUrl: 'https://teamop.fr/app.html' })
    }).catch(() => {});
  } catch (err) {}
}
// envoi d'e-mail (rapports, avis de passage) — nécessite la config smtp
app.post('/api/email', async (req, res) => {
  if (!mailer) return res.status(503).json({ error: "e-mail non configuré sur le serveur (config.json → smtp)" });
  const { key, to, subject, text, html } = req.body || {};
  if (key !== config.apiKey) return res.status(403).json({ error: 'clé invalide' });
  if (!to || !subject) return res.status(400).json({ error: 'to et subject requis' });
  try {
    await mailerEnvoi({ from: config.smtp.from || config.smtp.user, to, subject: String(subject).slice(0, 200), text, html });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🗼 TOUR DE CONTRÔLE — surveillance technique des applications (bugs, lenteurs, réseau)
//    Les sentinelles clientes envoient des lots anonymisés sur /api/monitor/report ;
//    le tableau de bord privé tour.html consulte/administre via un token admin (set-admin.sh).
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');
const MONITOR_PATH = path.join(path.dirname(CONFIG_PATH), 'monitor.json');

let monIssues = [], monUsers = [], monJournal = [], monArchive = [];
try { const d = JSON.parse(fs.readFileSync(MONITOR_PATH, 'utf8')); monIssues = d.issues || []; monUsers = d.users || []; monJournal = d.journal || []; monArchive = d.archive || []; } catch (e) {}
// Rien n'est jamais perdu : ce qui sort de la liste vivante part dans l'archive.
function monArchiver(list) {
  if (!list.length) return;
  const vus = new Set(monArchive.map(i => i.id));
  /* ⛔ LES PERSONNES NE PARTENT PAS À L'ARCHIVE. `ent.gens` nomme des salariés de nos clients ;
     la liste vivante est plafonnée à 500 incidents, mais l'archive en garde 5 000 et n'a AUCUNE
     purge par âge — ces noms y resteraient pour toujours. Le journal des connexions, d'où ils
     sortent, tourne lui à 500 entrées par entreprise : garder plus longtemps une copie que la
     source n'est pas une décision qu'on prend par accident.
     Mesuré par l'agent `gardien` : sans ce retrait, le plafond théorique de monitor.json passe
     de ~82 Mo à ~838 Mo, et `monSave` sérialise le fichier ENTIER à chaque écriture — au-delà
     de la limite de chaîne de V8 il jette, le catch avale, et toute la Tour cesse de se
     persister EN SILENCE : incidents, comptes de la Tour et journal compris.
     Un incident archivé garde donc ses entreprises et ses compteurs, pas ses gens. */
  list.forEach(i => {
    if (vus.has(i.id)) return;
    try { (i.entreprises || []).forEach(e => { if (e && e.gens) delete e.gens; }); } catch (err) {}
    monArchive.push(i);
  });
  monArchive.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
  if (monArchive.length > 5000) monArchive = monArchive.slice(0, 5000);
}
function monPurge() {
  const lim = Date.now() - 90 * 86400000;
  const vieux = monIssues.filter(i => i.statut === 'corrige' && (i.lastTs || 0) < lim);
  if (vieux.length) { monArchiver(vieux); monIssues = monIssues.filter(i => vieux.indexOf(i) < 0); }
  if (monIssues.length > 500) {   // cap de la liste vivante : le reste rejoint l'archive
    monIssues.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
    const actifs = monIssues.filter(i => i.statut === 'nouveau' || i.statut === 'encours');
    const autres = monIssues.filter(i => i.statut !== 'nouveau' && i.statut !== 'encours');
    const garde = actifs.slice(0, 500).concat(autres.slice(0, Math.max(0, 500 - actifs.length)));
    monArchiver(monIssues.filter(i => garde.indexOf(i) < 0));
    monIssues = garde;
  }
}
let monSaveTimer = null;
function monSave() {
  clearTimeout(monSaveTimer);
  monSaveTimer = setTimeout(() => {
    try { monPurge(); fs.writeFileSync(MONITOR_PATH, JSON.stringify({ issues: monIssues, users: monUsers, journal: monJournal, archive: monArchive })); } catch (e) { console.error('monitor save:', e.message); }
  }, 500);
}
monPurge();

const MON_TYPES = ['erreur', 'lenteur', 'reseau'];
const monStr = (v, n) => String(v == null ? '' : v).slice(0, n);
// réception des rapports des sentinelles (public, quota par IP via le limiteur global)
app.post('/api/monitor/report', express.text({ type: 'text/plain', limit: '200kb' }), (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }   // navigator.sendBeacon envoie en text/plain
    const reports = body && Array.isArray(body.reports) ? body.reports.slice(0, 40) : null;
    if (!reports || !reports.length) return res.status(400).json({ error: 'reports requis' });
    for (const r of reports) {
      if (!r || typeof r !== 'object') continue;
      const type = MON_TYPES.includes(r.type) ? r.type : 'erreur';
      const message = monStr(r.message, 300); if (!message) continue;
      const appName = monStr(r.app, 20) || 'inconnue';
      const signature = appName + '|' + (monStr(r.signature, 200) || (type + '|' + message.slice(0, 120)));
      const entNom = monStr(r.entreprise, 80) || 'inconnue';
      const entEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(monStr(r.email, 120)) ? monStr(r.email, 120).toLowerCase() : '';
      const appareil = monStr(r.appareil, 60) || '?';
      /* ⛔ QUI ÉTAIT CONNECTÉ — ET POURQUOI ON NE CROIT PAS CE CORPS DE REQUÊTE SUR PAROLE.
         La Tour n'avait que le nom de l'entreprise : elle nommait donc la personne en prenant
         la dernière session ouverte avant l'horodatage. Chez une équipe de onze, ça désigne le
         mauvais une fois sur deux, et on va chercher la panne chez quelqu'un qui n'y est pour
         rien. L'application dit maintenant qui elle avait devant elle (v683).
         ⛔ MAIS CETTE ROUTE N'EXIGE AUCUNE PREUVE, et un nom d'entreprise est public — il se
         lit sur un camion. Rejoué par l'agent `gardien` : un inconnu postait « ELAN · Jean
         Dupont · patron » et la Tour l'affichait comme un fait établi. On avait remplacé une
         déduction fausse une fois sur deux par une certitude FORGEABLE, ce qui est pire.
         On ne garde donc du corps que deux choses qui ne sont pas des affirmations : un
         IDENTIFIANT (il désigne) et un ESPACE (il situe). Le nom et le rôle, eux, sont lus
         dans le journal des connexions du serveur — qui s'écrit contre `t`, l'identifiant
         d'espace, pas contre un nom public. Si le journal ne connaît pas cet identifiant, on
         n'écrit RIEN : la Tour retombe sur la déduction, qu'elle sait déjà annoncer comme telle. */
      const qui = monStr(r.user, 40).toLowerCase().trim();
      const quiEspace = monStr(r.espace, 80).trim();
      const count = Math.min(500, Math.max(1, parseInt(r.count, 10) || 1));
      const now = Date.now();
      /* Tri à l'entrée : un « gel » de plus d'une minute n'est pas un gel.
         Sur les 9 incidents ouverts du 3 septembre, l'un annonçait « Interface figée pendant
         1 633 855 ms » — 27 minutes. Un navigateur ne gèle pas 27 minutes : l'appareil a été
         mis en veille, et le compteur a continué de tourner. Ces faux positifs noyaient les
         vrais problèmes clients, au point que l'écran d'accueil annonçait « tout est à jour ».
         La règle est volontairement objective : aucune interprétation, juste une durée
         physiquement impossible. Tout le reste continue d'arriver comme avant. */
      /* ── LE TRIEUR ────────────────────────────────────────────────────────────────────
         Trois règles mécaniques, sans jugement, appliquées avant que l'incident atteigne la
         Tour. Rien n'est supprimé : tout est enregistré, simplement classé hors de « à
         traiter » pour que les vrais problèmes clients ne soient plus noyés. Chaque classement
         est consultable dans la Surveillance, filtre par statut — un tri qu'on ne peut pas
         relire est un tri auquel on ne peut pas se fier. */
      const gel = /fig[ée]e? pendant (\d+)\s*ms/i.exec(message);
      // 1. Un « gel » de plus d'une minute est une mise en veille de l'appareil, pas un blocage.
      const veille = !!(gel && parseInt(gel[1], 10) > 60000);
      // 2. Ce que rapporte l'équipe en développant n'est pas un problème client. La liste vient
      //    de config.json (interneEmails / interneEspaces) : aucune adresse n'est devinée ici.
      const internes = (config.interneEmails || []).map(x => String(x).toLowerCase());
      const espacesInternes = (config.interneEspaces || []).map(x => String(x).toLowerCase());
      const interne = (!!entEmail && internes.indexOf(entEmail) >= 0)
        || espacesInternes.indexOf(String(monStr(r.espace, 80) || '').toLowerCase()) >= 0;
      // 3. Transitoires connus : ils se résolvent seuls au rechargement suivant.
      const transitoire = /Failed to update a ServiceWorker|ServiceWorker.*(register|update).*(fail|error)|NetworkError when attempting to fetch|Load failed/i.test(message);
      const triage = veille ? 'veille' : (interne ? 'interne' : (transitoire ? 'transitoire' : ''));
      let issue = monIssues.find(i => i.signature === signature);
      if (!issue) {
        /* `origine` : le premier cadre nommé de la pile, calculé par l'application (v692+).
           C'est le SEUL des deux champs qui désigne le coupable — `categorie` ne dit que ce que
           la personne regardait. Borné et filtré ici comme tout ce qui vient du dehors : cette
           route n'exige aucune preuve, donc rien de ce qu'elle reçoit n'est cru sur parole.
           Absent des versions antérieures : la Tour ne l'affiche que s'il est là. */
        issue = { id: 'i' + crypto.randomBytes(6).toString('hex'), signature, app: appName, version: monStr(r.version, 12), categorie: monCategorie(r.categorie), origine: monStr(r.origine, 60).replace(/[^A-Za-z0-9_.$]/g, '').slice(0, 60) || undefined, type, message, stack: monStr(r.stack, 600), src: monStr(r.src, 200), line: parseInt(r.line, 10) || 0, entreprises: [], appareils: {}, count: 0, firstTs: now, lastTs: now, statut: triage || 'nouveau', triage: triage || undefined, notes: '', mailEnvoye: false };
        monIssues.push(issue);
      }
      issue.count += count; issue.lastTs = now;
      if (monStr(r.version, 12)) issue.version = monStr(r.version, 12);
      if (issue.statut === 'corrige' || issue.statut === 'ignore') { if (issue.statut === 'corrige') { issue.statut = 'nouveau'; issue.mailEnvoye = false; } }   // un « corrigé » qui revient redevient nouveau
      let ent = issue.entreprises.find(e => e.nom === entNom);
      if (!ent) { ent = { nom: entNom, email: entEmail, count: 0, lastTs: now }; if (issue.entreprises.length < 60) issue.entreprises.push(ent); }
      ent.count += count; ent.lastTs = now; if (entEmail && !ent.email) ent.email = entEmail;
      /* Les personnes touchées, par entreprise. TROIS RÈGLES, et les trois viennent d'un
         défaut rejoué plutôt que supposé :
         1. ⛔ CORROBORÉ. On ne retient l'identifiant que si le journal des connexions de CET
            espace le connaît. Le nom et le rôle affichés sortent de ce journal, jamais du
            corps de la requête : c'est ce qui rend « Jean Dupont (inexistant) » impossible.
         2. ⛔ LE DERNIER VU GAGNE. La première écriture gardait la PREMIÈRE vue (`!g.nom`) :
            douze envois suffisaient à préempter les douze places, et un rapport légitime ne
            pouvait plus jamais corriger ce qui y était écrit. Un premier-arrivé-premier-servi
            sur une route publique est un squat.
         3. ⛔ LA PLACE LA PLUS ANCIENNE CÈDE. Refuser au-delà de douze fige la liste ; on
            remplace la plus vieille, pour qu'un incident qui dure reste à jour. */
      if (qui && quiEspace) {
        const jrn = cnxData[quiEspace];
        const vu = Array.isArray(jrn)
          ? jrn.find(x => x && String(x.login || '').toLowerCase().trim() === qui && x.ev !== 'echec')
          : null;
        if (vu) {
          ent.gens = Array.isArray(ent.gens) ? ent.gens : [];
          let g = ent.gens.find(x => x && x.login === qui);
          if (!g) {
            g = { login: qui, nom: '', role: '', count: 0, lastTs: now };
            if (ent.gens.length >= 12) {
              let vieux = 0;
              for (let k = 1; k < ent.gens.length; k++) if ((ent.gens[k].lastTs || 0) < (ent.gens[vieux].lastTs || 0)) vieux = k;
              ent.gens.splice(vieux, 1);
            }
            ent.gens.push(g);
          }
          g.count += count; g.lastTs = now;
          g.nom = monStr(vu.nom, 60).trim();     // du JOURNAL, pas du corps
          g.role = monStr(vu.role, 16).trim();
        }
      }
      if (Object.keys(issue.appareils).length < 20 || issue.appareils[appareil]) issue.appareils[appareil] = (issue.appareils[appareil] || 0) + count;
    }
    monSave();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e.message || e).slice(0, 200) }); }
});

// ── auth de la tour : comptes individuels {id, nom, hash, role:'patron'|'collaborateur', actif}
//    stockés dans monitor.json (le premier compte patron est créé par server/set-admin.sh).
//    POST /api/monitor/login {nom, pass} → token de session 24 h en mémoire, lié à l'utilisateur.
/* ── Les applications de la Tour ─────────────────────────────────────────────────────────────
   Un compte de la Tour ne voit que les applications qu'on lui a ouvertes : OP GESTION, OP MESSAGES,
   ou les deux. Un TABLEAU de clés, pas des booléens — ce serveur s'est déjà fait piéger par un
   booléen relâché ({"opMessages":"false"} OUVRAIT l'application, voir /espaces/apps) ; une liste se
   filtre contre une liste blanche, il n'y a pas de « faux qui vaut vrai ». Les clés sont celles
   qu'écrit déjà /api/connexions et que porte le hash de la Tour (#gestion/…, #messages/…). */
const TOUR_APPS = ['gestion', 'messages'];
const TOUR_APP_NOM = { gestion: 'OP GESTION', messages: 'OP MESSAGES' };
/* Les rapports d'incident portent des étiquettes historiques (« elan », « opmsg »…) : cette table
   les rattache à une application. Une étiquette absente vaut OP GESTION — l'application qui existe. */
const TOUR_APP_DES_TAGS = { opgestion: 'gestion', elan: 'gestion', 'elan-gestion': 'gestion', elangestion: 'gestion', espace: 'gestion', stripe: 'gestion', inconnue: 'gestion', opmessages: 'messages', opmsg: 'messages', messages: 'messages' };
/* ══════════ LA CATÉGORIE D'UN INCIDENT — seize, ou « Général » ══════════
   Justin, 13 septembre 2026 : « revois toutes les catégories, que chaque catégorie
   corresponde à chaque chose ».

   ⛔ CE QUE LE SERVEUR NE FAIT PAS : traduire. La correspondance écran → catégorie vit dans
   `TM_CAT` (app.html), et elle doit y rester seule. Deux tables qui doivent s'accorder
   divergent toujours — c'est la leçon de `fbUidEquipe`, une seule définition partagée par la
   signature et la coupure. Le serveur ne traduit rien : il VÉRIFIE.

   CE QU'IL FAIT, ET POURQUOI ÇA CHANGE QUELQUE CHOSE TOUT DE SUITE : `tmCat()` retombe sur
   `String(current).slice(0,30)` quand un écran manque à la table. Un écran oublié — il y en a
   un aujourd'hui, `planningGeneral` — pose donc son IDENTIFIANT TECHNIQUE comme catégorie, et
   la console de Justin affiche « planningGeneral » à côté de « Devis & Factures ». Chaque
   écran ajouté sans penser à la table en ajoutera un autre. Le garde le rattrape ici, pour
   TOUTES les versions de l'application déjà installées — sans rien publier.

   Une catégorie inconnue devient « Général » : c'est un aveu honnête (« on ne sait pas dans
   quoi ranger »), là où un slug technique est un faux renseignement. */
const MON_CATEGORIES = ['Tableau de bord', 'Planning', 'Interventions', 'Clients', 'Rapports',
  'Devis & Factures', 'Comptabilité', 'Stock', 'Plans', 'Commandes', 'Véhicules', 'Historique',
  'Équipe', 'Paramètres', 'Messages', 'Statistiques', 'Paiements', 'Général'];
function monCategorie(c) {
  const v = monStr(c, 40).trim();
  if (!v) return 'Général';
  /* Comparaison insensible à la casse et aux accents : « comptabilite » d'une vieille version
     et « Comptabilité » sont la même chose, et les séparer ferait deux rubriques pour une. */
  const cle = espSlug(v);
  const trouve = MON_CATEGORIES.find(x => espSlug(x) === cle);
  return trouve || 'Général';
}
const monAppDeTag = t => TOUR_APP_DES_TAGS[String(t || '').toLowerCase()] || 'gestion';
/* Seule source de vérité sur ce qu'un compte peut ouvrir. Le patron a TOUT, par calcul et non par
   donnée : son champ apps est ignoré ici et refusé à l'écriture — on ne peut pas se retirer une
   application par erreur, et set-admin.sh n'a rien à écrire. Un compte SANS champ vaut ['gestion']
   seulement : OP MESSAGES s'ouvre par un geste du patron, tracé, jamais par défaut. Rien à réécrire
   dans monitor.json — le champ n'apparaît qu'au premier réglage (migration paresseuse, comme
   opMessages sur l'annuaire). Le compte de repli {id:'u0', role:'patron'} passe par ici aussi. */
function monApps(u) {   // u : entrée de monUsers, ou la session de repli du jeton
  if (!u || u.role === 'patron') return TOUR_APPS.slice();
  const l = Array.isArray(u.apps) ? u.apps.filter(a => TOUR_APPS.includes(a)) : [];
  return l.length ? [...new Set(l)] : ['gestion'];
}
/* Lecture d'une liste d'applications venue du client → { apps } ou { error }. Une clé inconnue est
   REFUSÉE, pas ignorée en silence : le contraire du booléen relâché. Une liste vide aussi — couper
   un accès, c'est users/toggle, pas une liste sans rien. */
function monAppsLire(v) {
  if (!Array.isArray(v)) return { error: 'apps : une liste d\'applications est attendue' };
  if (v.some(a => typeof a !== 'string')) return { error: 'apps : des noms d\'application sont attendus' };   // String(['gestion']) vaut 'gestion' : sans ce test, [['gestion']] passait
  const l = [...new Set(v)];
  const inconnue = l.find(a => !TOUR_APPS.includes(a));
  if (inconnue !== undefined) return { error: 'application inconnue : ' + monStr(inconnue, 20) };
  if (!l.length) return { error: 'au moins une application' };
  return { apps: l };
}
const monTokens = new Map();          // token -> { exp, userId, nom, role, apps } — apps n'y est qu'un instantané, voir monAdmin
// les sessions de la Tour survivent aux redémarrages du serveur
const TOKENS_PATH = path.join(DATA_DIR, 'tour-sessions.json');
try { for (const [t, v] of JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'))) if (v && v.exp > Date.now()) monTokens.set(t, v); } catch (e) {}
function monTokensSave() { try { fs.writeFileSync(TOKENS_PATH, JSON.stringify([...monTokens].filter(([, v]) => v.exp > Date.now()))); } catch (e) {} }
const monLoginTries = new Map();      // ip -> { count, reset }
const monLock = new Map();            // ident -> { fails, until } : 5 échecs consécutifs = verrou 15 min
const monHash = p => crypto.createHash('sha256').update(String(p)).digest('hex');
setInterval(() => { const now = Date.now(); let ch = false; for (const [t, s] of monTokens) if (now > s.exp) { monTokens.delete(t); ch = true; } if (ch) monTokensSave(); }, 600000).unref();
function monUA(req) {   // appareil simplifié pour le journal (jamais l'UA complet)
  const u = String(req.headers['user-agent'] || '');
  const ap = /iPhone|iPad|iPod/i.test(u) ? 'iPhone' : (/Android/i.test(u) ? 'Android' : 'PC');
  const nv = /Edg\//.test(u) ? 'Edge' : (/OPR\//.test(u) ? 'Opera' : (/Chrome\//.test(u) ? 'Chrome' : (/Firefox\//.test(u) ? 'Firefox' : (/Safari\//.test(u) ? 'Safari' : (/curl/i.test(u) ? 'curl' : 'autre')))));
  return ap + ' · ' + nv;
}
function monLog(ident, ok, req, motif, apps) {   // journal des connexions (réussies ET échouées) ; apps : ce que le compte ouvre, sur les réussites
  monJournal.push(Object.assign({ ts: Date.now(), qui: monStr(ident, 120), ok: !!ok, appareil: monUA(req), motif: monStr(motif, 60) }, apps ? { apps: monStr(apps, 40) } : {}));
  if (monJournal.length > 300) monJournal = monJournal.slice(-300);
  monSave();
}
app.post('/api/monitor/login', (req, res) => {
  const ip = req.ip || '?';   // req.ip, jamais l'en-tête brut : nginx AJOUTE à la valeur reçue, donc .split(',')[0] rend celle de l'appelant
  const q = monLoginTries.get(ip) || { count: 0, reset: Date.now() + 3600000 };
  if (Date.now() > q.reset) { q.count = 0; q.reset = Date.now() + 3600000; }
  if (q.count >= 10) return res.status(429).json({ error: 'trop d\'essais — réessaie dans une heure' });
  q.count++; monLoginTries.set(ip, q);
  const nom = monStr((req.body || {}).nom, 120).trim();
  const ident = (monStr((req.body || {}).email, 120).trim() || nom).toLowerCase();   // connexion par nom OU par e-mail
  const pass = monStr((req.body || {}).pass, 200);
  // verrou anti force brute : 5 échecs consécutifs sur un identifiant = 15 minutes
  const lk = monLock.get(ident);
  if (lk && lk.until > Date.now()) { monLog(ident, false, req, 'verrouillé'); return res.status(429).json({ error: 'accès temporairement verrouillé (15 min) après plusieurs échecs' }); }
  const echec = (motif) => { const l = monLock.get(ident) || { fails: 0, until: 0 }; l.fails++; if (l.fails >= 5) { l.until = Date.now() + 15 * 60000; l.fails = 0; } monLock.set(ident, l); monLog(ident, false, req, motif); };
  let user = null;
  if (monUsers.length) {
    const u = monUsers.find(x => x.nom.toLowerCase() === ident || String(x.email || '').toLowerCase() === ident);
    if (!u || !pass || monHash(pass) !== u.hash) { echec('identifiants'); return res.status(403).json({ error: 'nom ou mot de passe incorrect' }); }
    if (!u.actif) { echec('compte désactivé'); return res.status(403).json({ error: 'accès désactivé — vois avec le patron' }); }
    user = u;
  } else {
    // repli : ancien mot de passe unique (config.adminPassHash) tant qu'aucun compte n'existe
    const hash = config.adminPassHash || (config.adminToken ? monHash(config.adminToken) : '');
    if (!hash) return res.status(501).json({ error: 'accès non configuré (lance server/set-admin.sh sur le serveur)' });
    if (!pass || monHash(pass) !== hash) { echec('identifiants'); return res.status(403).json({ error: 'nom ou mot de passe incorrect' }); }
    user = { id: 'u0', nom: nom || 'Patron', role: 'patron' };
  }
  const token = crypto.randomBytes(24).toString('hex');
  const duree = (req.body || {}).rester ? 30 * 24 * 3600000 : 24 * 3600000;   // « rester connecté » : 30 jours
  const apps = monApps(user);
  monTokens.set(token, { exp: Date.now() + duree, userId: user.id, nom: user.nom, role: user.role, apps });
  monTokensSave();
  monLoginTries.delete(ip); monLock.delete(ident);
  monLog(user.nom, true, req, '', apps.join('+'));
  res.json({ ok: true, token, exp: 24 * 3600, nom: user.nom, role: user.role, apps });
});
/* Quelle application possède une route. Tout ce qui n'est pas listé est OP GESTION : c'est
   l'application qui existe, et une route oubliée doit être REFUSÉE à un compte OP MESSAGES,
   jamais ouverte par défaut. Un compte limité à OP MESSAGES ne peut atteindre que COMMUN + MESSAGES.
   Pourquoi une table ici plutôt qu'un middleware par route : il y a plus de 80 routes /api/monitor
   (mail.js compris) ; en poser un par route, c'est autant d'occasions d'en oublier une, et l'oubli
   OUVRIRAIT. Ici l'oubli FERME, et se voit : le compte reçoit un 403 avec le champ app.
   ⚠ Une route /api/monitor nouvelle doit dire son application — ici, pas ailleurs. */
/* Ce qui est COMMUN se limite à ce qu'un compte OP MESSAGES peut légitimement voir : sa session, l'équipe,
   les incidents (filtrés), la santé, la liste des entreprises (projetée), et la LECTURE de la boîte support.
   Tout le courrier (mail/*, 16 routes de mail.js) est GESTION : la boîte contient les liens de connexion
   envoyés aux entreprises, et ses dossiers se lisent librement — une lecture de « Envoyés » y trouverait la
   clé d'équipe de n'importe quelle cliente. Les écritures support (répondre, envoyer, retirer, marquer)
   engagent l'adresse officielle : GESTION aussi. /mails (journal des e-mails, adresses des clientes) : GESTION. */
const ROUTES_COMMUNES = /^\/api\/monitor\/(login|moi|users(\/.*)?|journal|issues(\/(archive|contexte))?|status|expliquer|proposer|sante|support\/(box|mails|envoyes)|entreprises)$/;
const ROUTES_MESSAGES = /^\/api\/monitor\/(espaces\/apps|messages(\/.*)?)$/;
function monAppDeRoute(req) {
  /* Le chemin DÉCLARÉ de la route (req.route.path), pas l'URL reçue : Express accepte
     « /API/MONITOR/ESPACES/APPS/ » pour la même route, et une table qui lirait l'URL brute
     classerait cette variante en GESTION — ouvrant une route MESSAGES à un compte qui n'a que
     GESTION. Repli sur l'URL normalisée si le garde était un jour monté hors d'une route.
     ⚠ mail.js déclare ses chemins EN ENTIER ('/api/monitor/mail/boites', monté sur app) : c'est ce qui
     rend req.route.path complet ici. S'il devenait un express.Router() monté sur '/api/monitor/mail',
     req.route.path vaudrait '/boites', la table ne le reconnaîtrait plus et tout tomberait en GESTION —
     ça ferme, mais ça casserait la Tour sans un mot. */
  const p = String(req.route && typeof req.route.path === 'string' ? req.route.path : req.path).toLowerCase().replace(/\/+$/, '');
  return ROUTES_COMMUNES.test(p) ? null : (ROUTES_MESSAGES.test(p) ? 'messages' : 'gestion');
}
function monAppRefuse(req, res) {   // vrai si la réponse est partie
  const a = monAppDeRoute(req);
  if (!a || req.tourUser.apps.includes(a)) return false;
  res.status(403).json({ error: 'Cette action appartient à la Tour ' + TOUR_APP_NOM[a] + ' — ton compte n’y a pas accès.', app: a });
  return true;
}
/* Même chose pour un incident : /issues est filtré à la lecture, mais /status, /expliquer et
   /proposer prennent un id — filtrer la lecture et laisser l'écriture ouverte serait une passoire. */
function monIssueRefuse(req, res, issue) {
  const a = monAppDeTag(issue.app);
  if (req.tourUser.apps.includes(a)) return false;
  res.status(403).json({ error: 'Cet incident appartient à la Tour ' + TOUR_APP_NOM[a] + ' — ton compte n’y a pas accès.', app: a });
  return true;
}
function monAdmin(req, res, next) {
  const m = /^Bearer\s+([a-f0-9]{48})$/.exec(String(req.headers.authorization || ''));
  const s = m && monTokens.get(m[1]);
  if (!s || Date.now() > s.exp) return res.status(401).json({ error: 'session expirée — reconnecte-toi' });
  /* « s.userId && » n'est pas superflu : sans lui, une session sans identifiant s'accroche au
     PREMIER compte dépourvu de champ « id » et lui emprunte son rôle — un compte simple
     décrocherait ainsi les droits du patron. Aucune route n'en crée aujourd'hui, mais une
     édition à la main de monitor.json suffirait. */
  const u = (monUsers.length && s.userId) ? monUsers.find(x => x.id === s.userId) : null;
  if (monUsers.length && (!u || !u.actif)) return res.status(401).json({ error: 'accès désactivé — reconnecte-toi' });
  /* apps se relit dans monUsers à CHAQUE requête, jamais dans le jeton : sinon un compte privé
     d'OP MESSAGES la garderait jusqu'à 30 jours (« rester connecté »). Même règle que role et actif. */
  req.tourUser = { id: s.userId, nom: (u ? u.nom : s.nom), role: (u ? u.role : s.role), apps: monApps(u || s) };
  if (monAppRefuse(req, res)) return;
  next();
}
function monPatron(req, res, next) {
  if (!req.tourUser || req.tourUser.role !== 'patron') return res.status(403).json({ error: 'réservé au patron' });
  next();
}
// Variante stricte pour la gestion des comptes : TOUTE tentative sans token patron valide → 403.
// La création de comptes n'existe par AUCUNE autre voie (pas d'auto-inscription).
function monPatronStrict(req, res, next) {
  const m = /^Bearer\s+([a-f0-9]{48})$/.exec(String(req.headers.authorization || ''));
  const s = m && monTokens.get(m[1]);
  if (!s || Date.now() > s.exp) return res.status(403).json({ error: 'réservé au patron' });
  /* « s.userId && » n'est pas superflu : sans lui, une session sans identifiant s'accroche au
     PREMIER compte dépourvu de champ « id » et lui emprunte son rôle — un compte simple
     décrocherait ainsi les droits du patron. Aucune route n'en crée aujourd'hui, mais une
     édition à la main de monitor.json suffirait. */
  const u = (monUsers.length && s.userId) ? monUsers.find(x => x.id === s.userId) : null;
  if (monUsers.length && (!u || !u.actif)) return res.status(403).json({ error: 'réservé au patron' });
  req.tourUser = { id: s.userId, nom: (u ? u.nom : s.nom), role: (u ? u.role : s.role), apps: monApps(u || s) };   // apps relu dans monUsers, voir monAdmin
  if (monAppRefuse(req, res)) return;   // avant le rôle : « c'est l'autre Tour » est la réponse la plus utile, et la Tour relit /moi dessus
  if (req.tourUser.role !== 'patron') return res.status(403).json({ error: 'réservé au patron' });
  next();
}

/* Ce que le compte connecté a le droit d'ouvrir, relu dans monUsers. La Tour l'appelle quand sa
   session vient du stockage — sans ça, un collaborateur qui a reçu OP MESSAGES hier ne la verrait
   qu'à sa prochaine connexion — et quand un 403 porte un champ app : ses droits ont changé. */
app.get('/api/monitor/moi', monAdmin, (req, res) => {
  res.json({ ok: true, id: req.tourUser.id, nom: req.tourUser.nom, role: req.tourUser.role, apps: req.tourUser.apps });
});
// ── gestion de l'équipe Tour (patron uniquement pour créer/désactiver/supprimer)
app.get('/api/monitor/users', monPatronStrict, (req, res) => {
  res.json({ users: monUsers.map(u => ({ id: u.id, nom: u.nom, email: u.email || '', role: u.role, actif: !!u.actif, ts: u.ts || 0, creePar: u.creePar || '', apps: monApps(u), appsPar: u.appsPar || '', appsTs: u.appsTs || 0 })) });
});
// journal des connexions (réussies et échouées) — visible par le patron dans la section Équipe
app.get('/api/monitor/mails', monAdmin, (req, res) => { res.json({ ok: true, mails: mailsLog.slice(0, 120) }); });
app.get('/api/monitor/journal', monPatronStrict, (req, res) => {
  res.json({ journal: monJournal.slice(-100).reverse() });
});
app.post('/api/monitor/users', monPatronStrict, (req, res) => {
  const nom = monStr((req.body || {}).nom, 60).trim();
  const email = monStr((req.body || {}).email, 120).trim().toLowerCase();
  const pass = monStr((req.body || {}).pass, 200);
  if (!nom || pass.length < 8) return res.status(400).json({ error: 'nom requis et mot de passe de 8 caractères minimum' });
  // e-mail FACULTATIF : les collaborateurs se connectent avec leur nom d'utilisateur seul (décision patron)
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'e-mail invalide (ou laisse le champ vide)' });
  if (monUsers.some(u => u.nom.toLowerCase() === nom.toLowerCase() || (email && String(u.email || '').toLowerCase() === email))) return res.status(409).json({ error: 'ce nom (ou cet e-mail) existe déjà' });
  if (monUsers.length >= 30) return res.status(400).json({ error: 'trop de comptes (30 max)' });
  // apps facultatif : sans lui, le compte n'a qu'OP GESTION. Mêmes règles que users/apps.
  let apps = null;
  if ((req.body || {}).apps !== undefined) { const l = monAppsLire((req.body || {}).apps); if (l.error) return res.status(400).json({ error: l.error }); apps = l.apps; }
  const u = { id: 'u' + crypto.randomBytes(5).toString('hex'), nom, email, hash: monHash(pass), role: 'collaborateur', actif: true, ts: Date.now(), creePar: req.tourUser.nom };
  if (apps) { u.apps = apps; u.appsPar = req.tourUser.nom; u.appsTs = u.ts; }
  monUsers.push(u); monSave();
  res.json({ ok: true, user: { id: u.id, nom: u.nom, email: u.email, role: u.role, actif: true, apps: monApps(u) } });
});
app.post('/api/monitor/users/toggle', monPatronStrict, (req, res) => {
  const u = monUsers.find(x => x.id === (req.body || {}).id);
  if (!u) return res.status(404).json({ error: 'compte introuvable' });
  if (u.role === 'patron') return res.status(400).json({ error: 'le compte patron ne peut pas être désactivé' });
  u.actif = !u.actif; monSave();
  res.json({ ok: true, actif: u.actif });
});
app.post('/api/monitor/users/delete', monPatronStrict, (req, res) => {
  const id = (req.body || {}).id;
  const u = monUsers.find(x => x.id === id);
  if (!u) return res.status(404).json({ error: 'compte introuvable' });
  if (u.role === 'patron') return res.status(400).json({ error: 'le compte patron ne peut pas être supprimé' });
  monUsers = monUsers.filter(x => x.id !== id); monSave();
  res.json({ ok: true });
});
/* Régler les applications d'un compte. Immédiat pour lui — le garde-fou relit monUsers à chaque
   requête, pas le jeton. Un compte inactif peut en recevoir : le patron prépare avant de rouvrir. */
app.post('/api/monitor/users/apps', monPatronStrict, (req, res) => {
  const u = monUsers.find(x => x.id === (req.body || {}).id);
  if (!u) return res.status(404).json({ error: 'compte introuvable' });
  if (u.role === 'patron') return res.status(400).json({ error: 'le patron a toutes les applications' });
  const l = monAppsLire((req.body || {}).apps);
  if (l.error) return res.status(400).json({ error: l.error });
  u.apps = l.apps; u.appsPar = req.tourUser.nom; u.appsTs = Date.now(); monSave();
  console.log('Tour :', req.tourUser.nom, 'règle les applications de', u.nom, ':', l.apps.join('+'));   // compte d'équipe, pas une donnée client
  res.json({ ok: true, id: u.id, apps: l.apps });
});

// ── Accès d'essai à la bêta (teamop.fr/beta.html) ──
//    La bêta est une page publique. Sans ceci, elle se laissait ouvrir avec le compte de
//    départ admin / 1234, comme n'importe quelle installation neuve — et son espace de
//    synchro, chiffré avec la clé par défaut de l'application, se lisait avec. Les accès
//    d'essai se créent donc ICI, par le patron, et se coupent d'un clic : un accès coupé
//    ne passe plus la porte, même s'il connaît encore son mot de passe.
//    Ils ne vivent nulle part ailleurs : ni dans Firestore, ni dans le fichier de l'app.
const BETA_PATH = path.join(DATA_DIR, 'beta-comptes.json');
let betaComptes = [];
try { betaComptes = JSON.parse(fs.readFileSync(BETA_PATH, 'utf8')) || []; } catch (e) {}
// Temporaire puis renommage, comme `espacesEcrire` : une coupure pendant l'écriture laissait un fichier tronqué, que le
// chargement avale (catch vide) — tous les accès bêta perdus au redémarrage (relevé par `gardien`, 1er octobre 2026).
function betaSave() { try { const tmp = BETA_PATH + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(betaComptes)); fs.renameSync(tmp, BETA_PATH); } catch (e) { console.error('beta save:', e.message); } }
// Le chantier — ce que la personne teste — n'est pas décoratif : un accès bêta sans raison
// écrite est un accès qu'on n'ose plus couper parce qu'on ne sait plus à quoi il servait.
/* ⛔ QUELLE APPLICATION UN ACCÈS OUVRE (1er octobre 2026 — Justin : « fais un lien bêta dans la Tour [pour OP MESSAGES], le même
   système pour les accès comme OP GESTION »). Un accès porte `apps`, sous-ensemble non vide de BETA_APPS. UN ACCÈS D'AVANT, qui
   n'a pas le champ, vaut ['gestion'] : il n'ouvrait que la bêta d'OP GESTION, il ne s'ouvre pas à une application de plus en
   silence. C'est la SEULE lecture du champ (`betaApps`) : la porte, la relecture et la Tour passent par elle, jamais par
   `c.apps` directement — un accès au champ abîmé ne doit pas devenir un accès à tout.
   ⛔ UN ACCÈS, UNE APPLICATION (2 octobre 2026 — Justin, capture de la console MESSAGES à l'appui : « je veux pouvoir créer les
   accès d'OP MESSAGES ici, car je veux que ça soit bien séparé dans la Tour »). Chaque console crée les SIENS, et un même
   identifiant peut exister dans les deux bêtas, chacun avec son mot de passe : l'unicité, la porte et la relecture se lisent
   donc par (identifiant, application), jamais par l'identifiant seul. Plus de route pour ajouter une application à un accès :
   l'autre bêta, c'est un autre accès, ouvert dans l'autre console. */
const BETA_APPS = ['gestion', 'messages'];
const betaApps = c => { const l = Array.isArray(c && c.apps) ? BETA_APPS.filter(a => c.apps.includes(a)) : []; return l.length ? l : ['gestion']; };
/* Valide une liste reçue d'une requête : tableau non vide de noms CONNUS, sans doublon → la liste rangée dans l'ordre de BETA_APPS ; sinon null. */
const betaAppsValides = v => (Array.isArray(v) && v.length && v.every(a => typeof a === 'string' && BETA_APPS.includes(a))) ? BETA_APPS.filter(a => v.includes(a)) : null;
const betaPublic = c => ({ id: c.id, login: c.login, nom: c.nom, chantier: c.chantier || '', apps: betaApps(c), actif: !!c.actif, ts: c.ts || 0, creePar: c.creePar || '', derniere: c.derniere || 0 });
app.get('/api/monitor/beta', monPatronStrict, (req, res) => { res.json({ comptes: betaComptes.map(betaPublic) }); });
app.post('/api/monitor/beta', monPatronStrict, (req, res) => {
  const login = monStr((req.body || {}).login, 40).trim().toLowerCase();
  const nom = monStr((req.body || {}).nom, 60).trim();
  const pass = monStr((req.body || {}).pass, 200);
  const chantier = monStr((req.body || {}).chantier, 120).trim();
  // `apps` absent = la Tour d'avant : l'accès ouvre OP GESTION seul. Présent : UNE application, celle de la console qui le crée —
  // deux, ou une fausse, = 400, jamais une valeur devinée.
  const apps = (req.body || {}).apps === undefined ? ['gestion'] : betaAppsValides((req.body || {}).apps);
  if (!apps || apps.length !== 1) return res.status(400).json({ error: 'application : une seule parmi ' + BETA_APPS.join(', ') });
  if (!/^[a-z0-9._@-]{3,40}$/.test(login)) return res.status(400).json({ error: 'identifiant : 3 à 40 caractères, lettres, chiffres, . _ @ -' });
  if (pass.length < 8) return res.status(400).json({ error: 'mot de passe de 8 caractères minimum' });
  if (betaComptes.some(c => c.login === login && betaApps(c).includes(apps[0]))) return res.status(409).json({ error: 'cet identifiant existe déjà dans cette bêta' });
  if (betaComptes.length >= 50) return res.status(400).json({ error: 'trop d\'accès d\'essai (50 max)' });
  const c = { id: 'b' + crypto.randomBytes(5).toString('hex'), login, nom: nom || login, chantier, apps, hash: monHash(pass), actif: true, ts: Date.now(), creePar: req.tourUser.nom };
  betaComptes.push(c); betaSave();
  res.json({ ok: true, compte: betaPublic(c) });
});
// Un chantier se termine et un autre commence sans que l'accès change de main : il doit se
// réécrire, sinon la seule façon de le corriger serait de supprimer l'accès et de le rouvrir.
app.post('/api/monitor/beta/chantier', monPatronStrict, (req, res) => {
  const c = betaComptes.find(x => x.id === (req.body || {}).id);
  if (!c) return res.status(404).json({ error: 'accès introuvable' });
  c.chantier = monStr((req.body || {}).chantier, 120).trim(); betaSave();
  res.json({ ok: true, compte: betaPublic(c) });
});
app.post('/api/monitor/beta/toggle', monPatronStrict, (req, res) => {
  const c = betaComptes.find(x => x.id === (req.body || {}).id);
  if (!c) return res.status(404).json({ error: 'accès introuvable' });
  c.actif = !c.actif; betaSave();
  res.json({ ok: true, actif: c.actif });
});
app.post('/api/monitor/beta/delete', monPatronStrict, (req, res) => {
  const id = (req.body || {}).id;
  if (!betaComptes.some(x => x.id === id)) return res.status(404).json({ error: 'accès introuvable' });
  betaComptes = betaComptes.filter(x => x.id !== id); betaSave();
  res.json({ ok: true });
});
// La porte elle-même. Publique (la bêta l'appelle depuis le navigateur), donc bornée comme
// /api/monitor/login : même verrou par identifiant, et /api/beta figure dans ROUTES_SENSIBLES
// pour le plafond par adresse. Réponse identique pour un identifiant inconnu et un mauvais
// mot de passe : la route ne doit pas dire quels accès existent.
app.post('/api/beta/login', (req, res) => {
  // L'application qui demande (« gestion » par défaut : beta.html n'envoie rien). Un nom inconnu est une requête mal formée, pas un accès refusé.
  const appVoulue = (req.body || {}).app === undefined ? 'gestion' : (req.body || {}).app;
  if (!BETA_APPS.includes(appVoulue)) return res.status(400).json({ error: 'application inconnue' });
  const login = monStr((req.body || {}).login, 40).trim().toLowerCase();
  const pass = monStr((req.body || {}).pass, 200);
  // Le verrou et le journal par application : deux accès du même identifiant sont deux comptes (OP GESTION garde son ancien nom).
  const ident = (appVoulue === 'gestion' ? 'bêta:' : 'bêta-' + appVoulue + ':') + login;
  const lk = monLock.get(ident);
  if (lk && lk.until > Date.now()) { monLog(ident, false, req, 'verrouillé'); return res.status(429).json({ error: 'accès temporairement verrouillé (15 min) après plusieurs échecs' }); }
  const echec = (motif) => { const l = monLock.get(ident) || { fails: 0, until: 0 }; l.fails++; if (l.fails >= 5) { l.until = Date.now() + 15 * 60000; l.fails = 0; } monLock.set(ident, l); monLog(ident, false, req, motif); };
  // ⛔ L'accès de CETTE application, et lui seul : un accès de l'autre bêta (même identifiant ou non) reçoit EXACTEMENT la réponse
  // d'un mauvais mot de passe (même code, même texte, même décompte d'échecs) — la porte ne dit pas ce qui existe ailleurs.
  const c = betaComptes.find(x => x.login === login && betaApps(x).includes(appVoulue));
  if (!c || !pass || monHash(pass) !== c.hash) { echec('identifiants'); return res.status(403).json({ error: 'identifiant ou mot de passe incorrect' }); }
  if (!c.actif) { echec('accès désactivé'); return res.status(403).json({ error: 'cet accès d\'essai a été coupé depuis la Tour de contrôle' }); }
  c.derniere = Date.now(); betaSave();
  monLock.delete(ident); monLog(ident, true, req, '');
  // `id` : l'identifiant du COMPTE (b + hexadécimaux), jamais réutilisé. OP MESSAGES s'en sert pour reconnaître une
  // personne : un accès supprimé puis recréé sous le même `login` est une autre personne (relecture du gardien, 1er octobre 2026).
  // `apps` : ce que l'accès ouvre. L'autre service (OP MESSAGES) exige d'y lire SON nom : un OP GESTION d'avant ce champ ne le dit pas, et la porte reste fermée plutôt que d'ouvrir à tout accès.
  res.json({ ok: true, login: c.login, nom: c.nom, id: c.id, apps: betaApps(c) });
});
// Un appareil resté connecté redemande si sa porte est toujours ouverte : « coupé » depuis
// la Tour doit fermer aussi les sessions déjà ouvertes. Même réponse pour un accès inconnu.
app.post('/api/beta/etat', (req, res) => {
  // L'application qui relit (« gestion » par défaut). Un accès d'une autre application répond `false`, comme un accès coupé.
  const appVoulue = (req.body || {}).app === undefined ? 'gestion' : (req.body || {}).app;
  if (!BETA_APPS.includes(appVoulue)) return res.status(400).json({ error: 'application inconnue' });
  const ouvert = x => !!(x && x.actif && betaApps(x).includes(appVoulue));
  // Une LISTE d'identifiants de compte (`ids`, 100 au plus) : OP MESSAGES relit tous ses accès ouverts en UNE requête —
  // une par accès dépassait le plafond de 20 par minute de `/api/beta` dès 21 sessions, et un accès coupé gardait la sienne.
  // Un identifiant inconnu (accès supprimé) répond `false`, comme un accès coupé.
  const ids = (req.body || {}).ids;
  if (Array.isArray(ids)) {
    const ouverts = {};
    for (const id of ids.slice(0, 100)) { if (typeof id === 'string' && /^b[0-9a-f]{6,32}$/.test(id)) ouverts[id] = betaComptes.some(x => x.id === id && ouvert(x)); }
    return res.json({ ouverts, app: appVoulue });   // `app` rendu en écho : un OP GESTION d'avant ne le fait pas, et l'autre service ne coupe ni ne maintient rien sur une réponse qui ne répond pas à SA question
  }
  // La forme {login} est PUBLIQUE et sans mot de passe (beta.html relit ainsi son propre accès) : elle ne répond que pour
  // OP GESTION. Lui demander une autre application dirait à n'importe qui si un identifiant ouvre OP MESSAGES — un cran
  // d'oracle de plus (relevé par `gardien`) ; OP MESSAGES relit par `ids`, qu'on ne devine pas.
  if (appVoulue !== 'gestion') return res.status(400).json({ error: 'forme ids exigée' });
  const login = monStr((req.body || {}).login, 40).trim().toLowerCase();
  // L'accès d'OP GESTION de cet identifiant : un accès d'OP MESSAGES du même nom, rangé avant lui, ne doit pas fermer la bêta d'OP GESTION.
  const c = betaComptes.find(x => x.login === login && betaApps(x).includes(appVoulue));
  res.json({ ouvert: ouvert(c) });
});

/* ── Annuaire des espaces entreprise : « nom d'entreprise » → code de connexion ──
   Rempli depuis la Tour (patron) quand un lien de connexion est généré. Permet la
   connexion à la Organilog : l'utilisateur tape le nom de son entreprise dans l'app,
   le serveur lui rend le code d'espace, puis identifiant + mot de passe. */
const ESPACES_PATH = path.join(DATA_DIR, 'espaces.json');
let espacesReg = {};
/* ⛔⛔ UN ANNUAIRE ILLISIBLE N'EST PAS UN ANNUAIRE VIDE (24 septembre 2026, relevé par `gardien`).
   La lecture se taisait : un `espaces.json` abîmé (disque, restauration ratée, main humaine)
   donnait `{}` en mémoire — et DEUX choses en découlaient, toutes deux définitives :
   · la PREMIÈRE écriture (une inscription, un lien régénéré) remplaçait le fichier abîmé, peut-être
     récupérable, par un annuaire d'une entrée : toutes les entreprises perdues pour de bon ;
   · `espaceEstSuspendu` exige l'annuaire (une suspendue sortie de l'annuaire est une fermée) :
     toutes les suspendues auraient été traitées en FERMÉES, et leurs appareils vidés.
   On le DIT donc (journal, `/health.registres.espaces`, la surveillance crie), on n'écrit plus
   par-dessus (`espacesEcrire` refuse), et la règle « hors annuaire » ne s'applique pas. Un
   fichier ABSENT, lui, est une installation neuve : rien à protéger. */
let espacesIllisible = false;
try { espacesReg = JSON.parse(fs.readFileSync(ESPACES_PATH, 'utf8')); }
catch (e) { if (e && e.code !== 'ENOENT') { espacesIllisible = true; console.error('⛔ espaces.json ILLISIBLE — annuaire vide en mémoire, AUCUNE écriture ne le remplacera tant qu\'il n\'est pas réparé :', e.message); } }
const espSlug = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
/* \u2500\u2500 Le code d'espace ne porte PLUS de mot de passe en clair \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Le code est du base64, pas du chiffrement : tout ce qu'il contient est lisible par qui
   l'obtient. Le champ \u00ab m \u00bb y transportait le mot de passe provisoire de
   l'administrateur EN CLAIR : un nom d'entreprise suffisait donc \u00e0 r\u00e9cup\u00e9rer un
   identifiant et le mot de passe qui va avec.
   Le champ ne peut pas simplement dispara\u00eetre : c'est lui qui permet \u00e0 l'application, \u00e0
   la premi\u00e8re connexion, de reconna\u00eetre le mot de passe provisoire annonc\u00e9 par e-mail.
   On le remplace donc par \u00ab mh \u00bb, son empreinte SHA-256 \u2014 exactement ce que l'application
   comparait d\u00e9j\u00e0 (elle hachait \u00ab m \u00bb de son c\u00f4t\u00e9). Le mot de passe lui-m\u00eame ne circule
   plus que dans l'e-mail adress\u00e9 \u00e0 l'int\u00e9ress\u00e9.
   NB : \u00ab k \u00bb (cl\u00e9 d'\u00e9quipe) reste dans le code, l'appareil en a besoin pour rejoindre
   l'espace. C'est une divulgation distincte, \u00e0 traiter par un lien \u00e0 jeton \u2014 voir le
   rapport. Cette fonction ferme la fuite du mot de passe, pas celle-l\u00e0. */
const mdpEmpreinte = (p) => crypto.createHash('sha256').update(String(p)).digest('hex');
function codeMdpHache(code) {
  try {
    const o = JSON.parse(Buffer.from(String(code || ''), 'base64').toString('utf8'));
    if (!o || typeof o !== 'object' || !o.m) return String(code || '');
    o.mh = mdpEmpreinte(o.m); delete o.m;
    return Buffer.from(JSON.stringify(o), 'utf8').toString('base64').replace(/=+$/, '');
  } catch (e) { return String(code || ''); }
}
/* Reprise au d\u00e9marrage : les codes d\u00e9j\u00e0 enregistr\u00e9s portent le mot de passe en clair \u2014
   corriger le code neuf sans reprendre l'annuaire laisserait la fuite enti\u00e8re sur tous
   les espaces existants, qui sont pr\u00e9cis\u00e9ment ceux qui ont des donn\u00e9es. */
(function repriseMdpAnnuaire() {
  let n = 0;
  for (const slug of Object.keys(espacesReg)) {
    const e = espacesReg[slug];
    if (!e || !e.code) continue;
    const propre = codeMdpHache(e.code);
    if (propre !== e.code) { e.code = propre; n++; }
  }
  if (n) {
    espacesEcrire();
    console.log('annuaire : mot de passe remplac\u00e9 par son empreinte dans', n, 'code(s) d\'espace');
  }
})();
app.post('/api/monitor/espaces', monPatronStrict, (req, res) => {
  const nom = monStr((req.body || {}).nom, 80).trim();
  const code = codeMdpHache(monStr((req.body || {}).code, 4000).trim());
  const slug = espSlug(nom);
  if (!slug || !code) return res.status(400).json({ error: 'nom et code requis' });
  let t = '';
  try { const o = JSON.parse(Buffer.from(code, 'base64').toString('utf8')); t = String(o.t || ''); } catch (e) {}
  /* ⛔ un code sans identifiant d'espace n'enregistre rien (seconde relecture de `gardien`, 30 septembre 2026) : la garde
     « ce nom est à une autre entreprise », juste en dessous, ne peut rien comparer — l'entrée était réécrite SANS `t`, avec
     l'abonnement réglé à la main de la précédente, et l'entreprise d'origine sortait de l'annuaire */
  if (!t) return res.status(400).json({ error: 'code illisible : il ne porte pas l\'identifiant de l\'espace — recharge la Tour, puis refais le geste' });
  const prev = espacesReg[slug] || {};
  // un nom = une seule entreprise : refus si le nom est déjà pris par un AUTRE espace
  /* (`espaceT` : une entrée d'avant sans `t` le porte dans son code — `gardien` R2, 30 septembre 2026 : depuis que cette route
     reporte l'abonnement réglé à la main, le nom d'une AUTRE entreprise lui aurait transmis son « actif ») */
  const tPrev = String(espaceT(prev) || '');
  if (tPrev && t && tPrev !== t) return res.status(409).json({ error: 'Ce nom est déjà utilisé par une autre entreprise — choisis une variante (ex. ajoute la ville)' });
  /* ⛔ L'ANNUAIRE NE RATTACHE NI L'ESPACE PARTAGÉ, NI L'ESPACE D'UN AUTRE CLIENT (`gardien`, 27 septembre
     2026, B1 et B2). Cette route acceptait n'importe quel `t` et n'importe quelle adresse : une session
     de la Tour rattachait l'espace de cinq autres entreprises — ou l'espace partagé de l'application —
     à l'adresse d'UN client, puis une seule « fermeture » les effaçait tous. La fermeture compte
     désormais chaque espace et saute l'espace partagé ; ici, on ne laisse plus faire le rattachement.
     La Tour n'écrit ici que pour un nom que le serveur ne connaît pas (`tourEspaceDe`) : un espace déjà
     relié à une AUTRE adresse, ou un nom déjà relié, n'est jamais un geste qu'elle fait. */
  if (t && ESPACES_INTOUCHABLES.includes(t)) return res.status(403).json({ error: REFUS_INTOUCHABLE });
  const emailNeuf = monStr((req.body || {}).email, 120).toLowerCase();
  if (emailNeuf && prev.email && String(prev.email).toLowerCase() !== emailNeuf)
    return res.status(409).json({ error: 'Ce nom est déjà relié à une autre adresse : on ne rattache pas un espace à un autre client par ici.' });
  /* ⚠️ sans égard à la CASSE de l'identifiant (`gardien`, 28 septembre 2026) : le paiement le lit sans casse — un code
     collé en « ACME-CD34 » passait ce contrôle à côté d'« acme-cd34 » et donnait deux adresses à une entreprise. */
  if (t && emailNeuf) for (const [s2, e2] of Object.entries(espacesReg)) {
    if (s2 === slug || !e2 || espaceT(e2).toLowerCase() !== t.toLowerCase() || !e2.email || String(e2.email).toLowerCase() === emailNeuf) continue;
    return res.status(409).json({ error: 'Cet espace appartient déjà à « ' + (espNomPropre(e2) || s2) + ' », relié à une autre adresse : on ne le rattache pas à un second client.' });
  }
  /* ⛔⛔ UNE CLÉ DIFFÉRENTE POUR UNE ENTREPRISE CONNUE NE PASSE QUE SI LE PATRON LE CONFIRME — Justin, 28 septembre 2026 :
     « on ne la rattachera pas, sauf si je le confirme moi-même ». `gardien` l'avait rejoué la veille : « Code espace
     collé » (`tourEspaceDe`) rattachait une PREMIÈRE adresse à un identifiant que ce serveur connaît déjà, sans regarder
     la clé `k` du code. Un code FORGÉ — le bon `t`, une clé inventée, l'adresse d'un tiers —, collé par le patron pour une
     entreprise ouverte sans adresse : `espaceParT` servait ensuite l'entrée du tiers (sa fausse clé devenait la
     référence, les appareils de l'entreprise tombaient en verdict invalide), un compte était semé dans son annuaire de
     connexion, et « B » — le paiement — suivait l'annuaire.
     ⚠️ On ne peut PAS simplement refuser : une entreprise qui a changé sa clé (« Enregistrer une nouvelle clé d'équipe »)
     se fait réinscrire par ce même geste, avec la NOUVELLE clé. D'où la confirmation, que la Tour n'envoie qu'après sa
     question — un booléen STRICT, jamais une chaîne. La marque `clePerimee` ne prouve rien : une route PUBLIQUE la pose
     (`/api/espaces/lien`).
     ⛔ ON COMPARE À LA CLÉ DE LA RÉFÉRENCE — l'entrée la plus récente de cet identifiant, celle qu'`espaceParT` sert
     aux appareils —, JAMAIS à « une des clés connues » (`gardien`, même jour, rejoué). La première version réunissait
     les clés de TOUTES les entrées : après un changement de clé confirmé, l'ANCIENNE restait « connue » par les anciens
     noms, et l'ancien code recollé sous un nom neuf passait sans question — il redevenait la référence, les appareils
     de l'entreprise tombaient en verdict invalide et celui qui détenait l'ancien code (le salarié parti, celui qui a
     motivé le changement) retrouvait la preuve de clé. Le cache `tour_liens` de la Tour le faisait sans malveillance.
     Une référence SANS clé lisible (entrée sans code, code sans `k`) ne prouve rien non plus : question.
     Sans égard à la casse de l'identifiant (le paiement le lit sans casse : « ACME-CD34 » serait une autre entreprise
     pour ce contrôle et la même pour Stripe). La même clé ne demande rien : c'est le même code, collé une seconde fois. */
  let cleConfirmee = null;
  let ref = null;   // l'entrée la plus récente de cette entreprise (tous noms confondus) — reprise plus bas pour un nom NEUF
  if (t) {
    const cleDe = (c) => { try { return String(JSON.parse(Buffer.from(String(c || ''), 'base64').toString('utf8')).k || ''); } catch (e) { return ''; } };
    const cleNeuve = cleDe(code);
    for (const e2 of Object.values(espacesReg)) {
      if (!e2 || espaceT(e2).toLowerCase() !== t.toLowerCase()) continue;
      if (!ref || (e2.ts || 0) > (ref.ts || 0)) ref = e2;
    }
    const cleRef = ref ? cleDe(ref.code) : '';
    if (ref && (!cleRef || cleRef !== cleNeuve)) {
      if ((req.body || {}).confirmeCle !== true)
        return res.status(409).json({ motif: 'cle_differente', error: 'Ce code porte une clé DIFFÉRENTE de celle que TEAM OP connaît pour cette entreprise. Ne l\'utilise que si tu l\'as récupéré toi-même sur un appareil de l\'entreprise, et confirme-le depuis la Tour à jour. Rien n\'a été enregistré.' });
      cleConfirmee = { par: req.tourUser.nom, ts: Date.now() };
    }
  }
  /* Le code d'accès (retiré le 28 septembre 2026) ne figurait PAS ici : il vivait dans son propre
     registre, indexé par l'identifiant d'équipe. Le reporter depuis « prev » ressuscitait un code révoqué
     dès qu'on rouvrait le panneau d'un ancien nom du même espace. */
  /* « origine » sépare deux choses qu'on confondait dans la Tour : un accès que TEAM OP
     ouvre pour lui-même (essai, démonstration) et l'espace d'une entreprise qui s'est
     inscrite sur le site. Les deux vivent dans le même annuaire — c'est voulu, ce sont de
     vrais espaces — mais les mélanger à l'écran, c'est risquer de supprimer un client en
     croyant faire le ménage. Seul l'appelant sait : la fiche d'un client ne l'envoie pas. */
  /* ⛔⛔ UN NOM NEUF POUR UNE ENTREPRISE CONNUE REPREND SA FICHE (relecture de `gardien`, 30 septembre 2026, rejouée) : ce nom
     devient la référence (`espaceParT` sert la plus récente). Reporté depuis `prev` seul — le même nom —, il naissait sans
     formule, sans abonnement réglé à la main, sans OP MESSAGES ni métier : l'entreprise était suspendue. On reporte depuis
     l'entrée la plus récente de la même entreprise, quel que soit son nom (`ref`, plus haut), et la facturation depuis
     l'ENTREPRISE (`facturationDe`) — pour un nom déjà connu aussi : sa fiche peut être plus ancienne que la sienne. */
  const base = facturationDe(Object.keys(prev).length ? prev : (ref || {}));
  const origine = ((req.body || {}).origine === 'tour') ? 'tour' : (base.origine || 'site');
  /* « opMessages » se reporte, comme la formule. Cette route reconstruit l'entrée de zéro, et
     elle est appelée par « Revoir le lien de connexion » aussi bien que par l'ouverture d'un
     accès : sans ce report, redonner son lien à une entreprise lui REFERMAIT OP MESSAGES —
     sans erreur, sans journal, sans que rien à l'écran ne le dise. Mesuré par le gardien. */
  espacesReg[slug] = { nom, code, t, ts: Date.now(), par: req.tourUser.nom, origine, email: emailNeuf || base.email || '',
    opMessages: base.opMessages,
    formule: base.formule, quantite: base.quantite, formulePar: base.formulePar, formuleTs: base.formuleTs,
    /* ⛔ le métier se reporte comme la formule (29 septembre 2026) : sans ça, « Revoir le lien de connexion » le
       remettait à « non réglé » — l'application garderait le sien, mais la Tour afficherait un métier à re-poser */
    metier: base.metier, metierPar: base.metierPar, metierTs: base.metierTs,
    /* ⛔⛔ L'ABONNEMENT RÉGLÉ À LA MAIN SE REPORTE AUSSI (30 septembre 2026). Cette route le perdait : une entreprise
       « abonnement activé par TEAM OP » (un virement, un accord) retombait sur Stripe, qui ne la connaît pas — l'application
       d'avant affichait « Paye ton abonnement » à toute l'équipe, et depuis qu'une entreprise qui ne paie pas est SUSPENDUE,
       un simple « Revoir le lien de connexion » l'aurait coupée. Un « impayé » posé à la main se levait de la même façon.
       `aboDepuis` et `formuleDepuis` datent les places des abonnements d'avant (`gardien`, M4) : les perdre en retirait. */
    aboStatut: base.aboStatut, aboFin: base.aboFin, aboPar: base.aboPar, aboTs: base.aboTs, aboDepuis: base.aboDepuis,
    /* ⛔ et les options réglées à la main (1er octobre 2026) : la même panne que `aboStatut`, « Revoir le lien » les effacerait */
    options: base.options, optionsPar: base.optionsPar, optionsTs: base.optionsTs,
    formuleDepuis: base.formuleDepuis };
  /* La confirmation se garde avec l'entrée : qui a dit « oui, c'est la nouvelle clé », et quand. */
  if (cleConfirmee) espacesReg[slug].cleConfirmee = cleConfirmee;
  /* ⛔ ÉCRIT, OU ON LE DIT — et on défait l'entrée en mémoire. Répondre `ok` sur une écriture
     refusée (disque plein, annuaire illisible au démarrage) faisait croire à la Tour un espace
     créé qui disparaissait au redémarrage suivant. */
  if (!espacesEcrire()) {
    if (prev && Object.keys(prev).length) espacesReg[slug] = prev; else delete espacesReg[slug];
    return res.status(500).json({ error: 'L\'annuaire n\'a pas pu être enregistré — rien n\'a été créé. Vérifie le serveur (journal : ILLISIBLE ?) avant de recommencer.' });
  }
  /* Le premier compte, pour que l'ADRESSE suffise dès maintenant (voir annuaireSemer). Sans
     await : ~100 ms de PBKDF2 que personne n'attend, et un échec ne doit pas faire rater
     l'inscription — il se dit au journal. */
  annuaireSemerDepuisCode(t, code).catch(() => {});
  /* une entreprise « repartie à neuf » que la Tour recrée : sa période offerte la suit (`promoReprendreRenaissance`).
     ⛔ À LA CRÉATION SEULEMENT — un identifiant que l'annuaire ne connaissait pas (`ref`, plus haut) : « Revoir le lien »
     d'une entreprise qui existait déjà, en lui posant l'adresse de celle qui repart à neuf, lui donnait sa période, et
     l'entreprise recréée ensuite naissait suspendue (relecture finale de la poussée, 30 septembre 2026, rejouée). */
  if (t && !ref) try { if (promoReprendreRenaissance(t, espacesReg[slug].email)) console.log('Tour : période offerte reprise par l\'entreprise', t, '(repartie à neuf)'); } catch (err) {}
  if (cleConfirmee) console.log('Tour :', req.tourUser.nom, 'confirme une clé DIFFÉRENTE pour l\'espace', t);   // l'identifiant suffit : le nom d'accès est souvent celui d'une personne
  res.json({ ok: true, slug });
});
/* ══ LE LIEN D'UN ESPACE DÉJÀ INSCRIT — 12 septembre 2026 ══════════════════════════════
   Sans cette route, la Tour n'avait qu'UNE source pour le lien d'une entreprise : le
   localStorage du navigateur ouvert (`tour_liens`). Sur un autre appareil — le téléphone du
   patron plutôt que son Mac — l'entrée manquait, et `tourEspaceDe` FABRIQUAIT un espace neuf,
   identifiant aléatoire et clé aléatoire, qu'elle affichait comme étant celui du client.
   Constaté le 12 septembre 2026 sur la fiche d'ELAN : l'adresse disait `teamop.fr/e/elan`
   (→ `elan-34oc`, le vrai) pendant que le lien juste en dessous portait `elan-gq3k`, inventé
   à la seconde. C'est aussi comme ça que `elan-d4v8` et `elan-tzl2` sont apparus.
   Le serveur, lui, a toujours su : `espacesReg[slug].code`. Il le rend donc, au patron seul.
   ⚠️ ELLE NE REND PLUS LE LIEN, depuis que la Tour ne l'affiche plus (12 septembre 2026, même
   jour) : son seul appelant a besoin de savoir si l'espace EXISTE, pas de recevoir la clé qui
   déchiffre ses données. Une route qui rend un secret dont personne ne se sert est un secret
   offert pour rien. Elle rend l'identifiant d'équipe, le slug et l'identifiant de départ — de
   quoi afficher le panneau, et rien qui ouvre quoi que ce soit. */
app.post('/api/monitor/espaces/lien-existant', monPatronStrict, (req, res) => {
  const slug = espSlug(monStr((req.body || {}).nom, 80));   // borné : voir /api/espaces/ouvrir
  if (!slug) return res.status(400).json({ error: 'nom requis' });
  const e = espaceAJour(slug);
  /* 404 veut dire « ce nom n'a pas d'espace », et rien d'autre : c'est là-dessus que la Tour
     s'autorise à en créer un. Un espace sans code n'est pas un espace inconnu — il est cassé,
     et le dire évite d'en fabriquer un second à côté. */
  if (!e) return res.status(404).json({ error: 'aucun espace inscrit sous ce nom' });
  if (!e.code) return res.status(409).json({ motif: 'sans_code',
    error: 'Cet espace est inscrit mais n\'a pas de code de connexion — à réinscrire, surtout pas à doubler.' });
  let ident = '';
  try { const o = JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')); ident = String(o.a || ''); } catch (err) {}
  /* ⛔ `annuaire` DIT SI L'ADRESSE OUVRE L'ESPACE. Dès qu'un compte est semé, l'adresse +
     identifiant + mot de passe suffisent. À zéro, l'espace n'a AUCUNE porte (le code d'accès
     n'existe plus depuis le 28 septembre 2026) : la Tour le dit et propose d'en poser. */
  const tEsp = espaceT(e);
  const annuaire = (() => { const a = comptesReg[tEsp]; return (a && a.c) ? Object.keys(a.c).length : 0; })();
  res.json({ ok: true, existe: true, slug: (e.slug || slug), nom: espNomPropre(e), t: tEsp, ident, annuaire });
});
/* ══ LE MÉTIER D'UNE ENTREPRISE — Justin, 29 septembre 2026 (nuit) : « je veux que chaque métier qu'on a sur le site,
   quand ils ont l'application, ça correspond à leur métier ; active tous les packs, pour tous ». Jusque-là RIEN ne le
   portait : la demande d'accès ne le demandait pas, la Tour l'affichait (« métier non renseigné ») sans aucun moyen de le
   régler (`/api/monitor/clients/metier` n'avait pas d'appelant), et l'application partait en anti-nuisibles (3D) chez
   TOUT LE MONDE — un plombier recevait « Dératisation » et le registre sanitaire.
   Le métier se règle ICI, sur l'espace, comme la formule : par TEAM OP, jamais par le client (le portail le DEMANDE, la
   Tour le POSE — prérempli avec la demande), et `/api/espaces/etat` le rend à l'application, qui applique le pack :
   types d'intervention, fiche de terrain, modules. ⛔ La liste est celle de `METIERS_ORDRE` (app.html) : une valeur hors
   liste est refusée ici, parce que l'application l'ignorerait EN SILENCE. `tests/test-848.js` compare les deux listes.
   ⚠️ Vide veut dire « non réglé » : l'application garde alors ce qu'elle avait (ELAN, réglée avant ce chantier, ne
   reçoit rien et ne bouge pas). */
const METIERS_OK = ['3d', 'plomberie', 'electricite', 'chauffage', 'serrurerie', 'nettoyage', 'maconnerie', 'menuiserie', 'peinture', 'paysagiste', 'couverture', 'multiservices', 'autre'];
const metierOk = m => (METIERS_OK.includes(m) ? m : '');
const METIERS_LBL = { '3d': '3D — Hygiène anti-nuisibles', plomberie: 'Plomberie', electricite: 'Électricité', chauffage: 'Chauffage / Climatisation', serrurerie: 'Serrurerie', nettoyage: 'Nettoyage / Propreté',
  maconnerie: 'Maçonnerie / Gros œuvre', menuiserie: 'Menuiserie', peinture: 'Peinture / Revêtements', paysagiste: 'Paysagiste / Espaces verts', couverture: 'Couverture / Zinguerie', multiservices: 'Multiservices / Maintenance', autre: 'Autre métier de terrain' };
app.post('/api/monitor/espaces/metier', monPatronStrict, (req, res) => {
  const slug = espSlug(monStr((req.body || {}).nom, 80));   // borné : voir /api/espaces/ouvrir
  const e = espacesReg[slug];
  if (!e) return res.status(404).json({ error: 'Espace inconnu — génère d\'abord son « Lien de connexion » (fiche entreprise)' });
  const m = monStr((req.body || {}).metier, 20);
  if (m && !METIERS_OK.includes(m)) return res.status(400).json({ error: 'métier inconnu' });
  /* ⛔ LE MÉTIER EST CELUI DE L'ENTREPRISE, SUR TOUS SES NOMS (relecture de la poussée, 30 septembre 2026, rejouée) : posé
     sur un ancien nom, il n'atteignait pas l'application (qui lit le plus récent), et « Revoir le lien » sur un ancien nom
     le faisait revenir en arrière. Comme la facturation (`facturationPartager`). */
  const noms = nomsEntreprise(e).length ? nomsEntreprise(e) : [e];
  if (noms.some(x => (x.metier || '') !== m)) {
    const avant = noms.map(x => ({ x, v: { metier: x.metier, metierPar: x.metierPar, metierTs: x.metierTs } }));
    const ts = Date.now();
    for (const x of noms) { x.metier = m; x.metierPar = m ? req.tourUser.nom : ''; x.metierTs = ts; }
    /* écrit, ou on le dit — et on défait en mémoire : sinon le serveur servirait ce métier jusqu'au redémarrage,
       puis l'ancien, sans que la Tour l'ait jamais su (même règle que la création d'un espace) */
    if (!espacesEcrire()) { avant.forEach(a => Object.assign(a.x, a.v)); return res.status(500).json({ error: 'L\'annuaire n\'a pas pu être enregistré — le métier n\'a pas changé.' }); }
    /* (l'identifiant, jamais le nom d'accès : il est souvent celui d'une personne) */
    console.log('Tour :', req.tourUser.nom, 'règle le métier', m || '(aucun)', 'de l\'entreprise', espaceT(e) || '(sans identifiant)');
  }
  res.json({ ok: true, slug, metier: m });
});
/* ⛔ PLUS DE FORMULE GRATUITE (Justin, 30 septembre 2026 : « si une entreprise ne paye plus, le service est suspendu tant que
   c'est pas réglé »). Les deux routes qui posent une formule la refusent — une Tour d'avant qui l'enverrait encore reçoit la
   raison, pas un simple « inconnue ». Les fiches « Gratuit » d'avant restent lisibles (`FORMULE_LBL`) : elles sont servies
   suspendues tant que rien n'est payé (`espacePaye`). */
const REFUS_GRATUIT = 'La formule Gratuit n\'existe plus (30 septembre 2026) : une entreprise qui ne paie pas est suspendue jusqu\'au règlement. Choisis Pro, Business ou Business Premium — ou un statut « En essai » avec une date de fin.';
// le patron attribue la formule d'un espace (Pro/Business/Premium × quantité)
app.post('/api/monitor/espaces/formule', monPatronStrict, (req, res) => {
  const slug = espSlug(monStr((req.body || {}).nom, 80));   // borné : voir /api/espaces/ouvrir
  const e = espacesReg[slug];
  if (!e) return res.status(404).json({ error: 'Espace inconnu — génère d\'abord son « Lien de connexion » (fiche entreprise)' });
  const f = monStr((req.body || {}).formule, 20);
  if (f === 'gratuit') return res.status(400).json({ error: REFUS_GRATUIT });
  if (!RANG_FORMULE.includes(f)) return res.status(400).json({ error: 'formule inconnue' });
  const q = Math.max(1, Math.min(50, parseInt((req.body || {}).quantite, 10) || 1));
  facturationReprendre(e);   // une entreprise, une facturation : on part de la sienne, pas de la fiche de ce nom
  /* ⛔ la date ne bouge que si la formule ou le nombre change (`gardien`) : un simple réenregistrement effaçait les
     places d'avant la v763 (`placesServies`) sans que la Tour le montre */
  if (e.formule !== f || placesQ(e) !== q) { e.formulePar = req.tourUser.nom; e.formuleTs = Date.now(); }
  if (e.formule && e.formule !== f) e.formuleDepuis = Date.now();   // une formule CHANGÉE (voir `placesStripe`)
  e.formule = f; e.quantite = q;
  /* ⛔ des options réglées à la main ne survivent pas à une formule qui les contient déjà (`gardien`, 1er octobre 2026, rejoué) : même
     règle que `/api/monitor/espaces/abonnement` (sous Business, un réglage d'option ne dit plus rien). Sans cela, Business puis de nouveau
     Pro rendait les options à l'entreprise, sous l'abonnement « actif » resté en place — sans que personne les ait redemandées. */
  if (f !== 'pro' && optionsDeTour(e.options).length) { e.options = []; e.optionsPar = req.tourUser.nom; e.optionsTs = Date.now(); }
  try { if (!e.t) { const o = JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')); e.t = String(o.t || ''); } } catch (err) {}
  facturationPartager(e, [0, 1]);   // … écrite sur TOUS les noms de l'entreprise (l'abonnement repris compris)
  espacesEcrire();
  console.log('Tour :', req.tourUser.nom, 'attribue', f, '×' + q, 'à', slug);
  // le « Mon espace » du client reflète l'attribution : accès activé + abonnement affiché
  if (e.email) fbMajFicheClient(e.email, { status: 'fourni', apps: ['elan'], plan: FORMULE_LBL[f] || f, planStatus: 'actif' }).catch(() => {});
  res.json({ ok: true, slug, formule: f, quantite: q });
});
// ── L'abonnement réglé à la main par le patron (fiche entreprise de la Tour) : formule, places,
//    statut et date de fin. Il PRIME sur les portes automatiques (Stripe, code promo). ──
const ABO_STATUTS = ['auto', 'actif', 'essai', 'impaye', 'suspendu', 'annule'];
app.post('/api/monitor/espaces/abonnement', monPatronStrict, (req, res) => {
  const b = req.body || {};
  const slug = espSlug(b.nom);
  const e = espacesReg[slug];
  if (!e) return res.status(404).json({ error: 'Espace inconnu — génère d\'abord son « Lien de connexion » (fiche entreprise)' });
  const f = monStr(b.formule, 20);
  if (f === 'gratuit') return res.status(400).json({ error: REFUS_GRATUIT });
  if (!RANG_FORMULE.includes(f)) return res.status(400).json({ error: 'formule inconnue' });
  const st = monStr(b.statut, 12) || 'auto';
  if (!ABO_STATUTS.includes(st)) return res.status(400).json({ error: 'statut inconnu' });
  const fin = monStr(b.fin, 10);
  if (fin && !/^\d{4}-\d{2}-\d{2}$/.test(fin)) return res.status(400).json({ error: 'date de fin invalide (AAAA-MM-JJ)' });
  const q = Math.max(1, Math.min(50, parseInt(b.quantite, 10) || 1));
  /* ⛔ LES OPTIONS DU PRO RÉGLÉES À LA MAIN (1er octobre 2026) : des CLÉS d'une liste fermée, une fois chacune, et seulement sous le
     Pro et un « actif » ou un « essai » — Business et Business Premium ont tout, et sous un autre statut (impayé, suspendu,
     annulé, auto) rien n'est servi par la Tour : une option posée là serait un réglage qui ne dit rien. `[]` se permet toujours
     (c'est le retrait). Absent du corps (une Tour d'avant) : les options en place restent, tant qu'elles ont encore un sens. */
  let optsTour = null;
  if (b.options !== undefined && b.options !== null) {
    if (!Array.isArray(b.options) || b.options.length > OPTIONS_CLES.length || b.options.some(o => typeof o !== 'string' || !OPTIONS_CLES.includes(o)))
      return res.status(400).json({ error: 'option inconnue' });
    optsTour = optionsDeTour(b.options);
    if (optsTour.length && f !== 'pro') return res.status(400).json({ error: 'Les options ne se règlent que sous la formule Pro (Business et Business Premium les ont toutes).' });
    if (optsTour.length && st !== 'actif' && st !== 'essai') return res.status(400).json({ error: 'Les options ne se règlent que sous un abonnement « actif » ou « en essai ».' });
  }
  facturationReprendre(e);   // une entreprise, une facturation : on part de la sienne, pas de la fiche de ce nom
  if (e.formule !== f || placesQ(e) !== q) { e.formulePar = req.tourUser.nom; e.formuleTs = Date.now(); }
  if (e.formule && e.formule !== f) e.formuleDepuis = Date.now();   // une formule CHANGÉE (voir `placesStripe`)
  e.formule = f; e.quantite = q;
  {
    const avantOpts = optionsDeTour(e.options);
    const garde = (f === 'pro' && (st === 'actif' || st === 'essai'));
    const neuves = optsTour !== null ? optsTour : (garde ? avantOpts : []);
    if (JSON.stringify(neuves) !== JSON.stringify(avantOpts)) { e.optionsPar = req.tourUser.nom; e.optionsTs = Date.now(); }
    if (neuves.length) e.options = neuves; else if (e.options !== undefined || optsTour !== null) e.options = [];
  }
  const stNeuf = st === 'auto' ? '' : st;
  const stAvant = e.aboStatut || '';
  if (stAvant !== stNeuf) {   // une entrée ancienne sans date le reste : « d'avant »
    /* ⛔ DEPUIS QUAND ELLE PAIE (`aboDepuis`) : un impayé (ou une suspension) puis « actif » n'est pas un nouvel abonnement — sans ce repère,
       une abonnée d'avant qui a payé en retard perdait pour toujours ses 2 ou 3 places par abonnement (`gardien`, M4). */
    const payait = stAvant === 'actif' || stAvant === 'impaye' || stAvant === 'suspendu';
    if (payait && e.aboDepuis == null) e.aboDepuis = e.aboTs || 0;
    if (stNeuf === 'actif' && e.aboDepuis == null) e.aboDepuis = Date.now();   // une fois posée, elle reste (« impayé » → « auto » → « actif »)
    e.aboPar = req.tourUser.nom; e.aboTs = Date.now();
  }
  e.aboStatut = stNeuf; e.aboFin = fin;
  try { if (!e.t) { const o = JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')); e.t = String(o.t || ''); } } catch (err) {}
  facturationPartager(e, [0, 1]);   // … écrite sur TOUS les noms de l'entreprise
  espacesEcrire();
  console.log('Tour :', req.tourUser.nom, 'règle l\'abonnement de', slug, ':', f, '×' + q, st, fin || '', optionsDeTour(e.options).length ? '+ ' + optionsDeTour(e.options).join(',') : '');
  // la fiche client (site « Mon espace ») reflète le réglage
  const ps = { auto: 'actif', actif: 'actif', essai: 'essai', impaye: 'impaye', suspendu: 'impaye', annule: 'annule' }[st] || 'actif';
  if (e.email) fbMajFicheClient(e.email, { status: 'fourni', apps: ['elan'], plan: FORMULE_LBL[f] || f, planStatus: ps, planFin: fin }).catch(() => {});
  res.json({ ok: true, slug, formule: f, quantite: q, statut: e.aboStatut || 'auto', fin, options: optionsDeTour(e.options) });
});
// payé ? — le réglage manuel du patron d'abord ; sinon trois portes : formule gratuite, code promo actif, abonnement Stripe actif
const espStripeCache = { ts: 0, data: null, enCours: null, echecTs: 0, echecDepuis: 0 };
/* ⛔ DEPUIS COMBIEN DE MINUTES STRIPE NE SE LIT PLUS (seconde relecture de `gardien`, 30 septembre 2026) — `0` quand la
   dernière lecture a réussi (ou qu'il n'y en a jamais eu d'échec). Depuis que le doute ne coupe plus personne
   (`payeInconnu`), une clé révoquée ou fausse ne se voit plus chez les clients : personne n'est suspendu, mais une
   entreprise qui vient de payer reste suspendue et les rappels J-7 attendent. `/health` le publie (un nombre, rien sur
   personne) et `.github/scripts/surveillance.js` crie. */
function stripeEchecMin() { return espStripeCache.echecDepuis ? Math.floor((Date.now() - espStripeCache.echecDepuis) / 60000) : 0; }
/* La liste des abonnements se relit au plus toutes les cinq minutes ; plus vieille, elle est PÉRIMÉE : pendant une panne de
   Stripe, la dernière liste connue sert (on ne coupe pas une entreprise qui paie), mais un paiement fait depuis n'y est pas
   — le rappel J-7 ne décide rien dessus (`abonnementGestion`). La variable : pour les bancs seulement. */
const STRIPE_CACHE_MS = Math.max(1, parseInt(process.env.TEAMOP_STRIPE_CACHE_MS, 10) || 5 * 60000);
/* ⛔ une décision d'ACHAT (ajout d'option, rachat de places) ne se prend que sur une liste d'abonnements lue POUR ELLE : `espaceStripeAchat`
   demande une relecture à chaque appel (l'âge toléré est d'une milliseconde) et dit si elle a abouti. Une relecture qui ratait (panne de
   Stripe, lecture qu'on ne retente pas avant une minute) laisse la liste d'avant — jamais « assez récente » pour savoir si le client vient
   de payer : on refuse, on ne devine pas. `STRIPE_ACHAT_JEU_MS` n'absorbe que le décalage d'horloge entre l'instant de la demande et la
   date que la lecture a posée au retour. */
const STRIPE_ACHAT_JEU_MS = 1000;
/* ce que Stripe sert à une entreprise, LU À L'INSTANT pour une décision d'achat — et si cette lecture a abouti (`fraiche`) ou si
   c'est une liste ancienne qui répond à sa place */
async function espaceStripeAchat(e) {
  const t0 = Date.now();
  let s = null; try { s = await espaceStripe(e, 1); } catch (err) { s = null; }
  return { s, fraiche: !!espStripeCache.data && espStripeCache.ts >= t0 - STRIPE_ACHAT_JEU_MS };
}
/* ⛔ UN IMPAYÉ SE RELIT À LA MINUTE (Justin, 29 septembre 2026 : l'accès revient dès que c'est réglé). La liste Stripe se
   garde cinq minutes : un client qui vient de régler sa facture resterait grisé jusque-là. Tant qu'une entreprise n'a que de
   l'impayé, la liste se relit si elle a plus d'une minute (toujours une seule lecture à la fois, et pas pendant une panne :
   `stripeListe`). `imp` : ses abonnements d'OP GESTION en impayé (`impayesGestion`), ou `null`. La variable : pour les bancs
   seulement (une liste gardée longtemps, un impayé relu vite — c'est ce qui se mesure). */
const STRIPE_IMPAYE_FRAIS_MS = Math.min(STRIPE_CACHE_MS, Math.max(1, parseInt(process.env.TEAMOP_STRIPE_IMPAYE_MS, 10) || 60000));
async function stripeVerdict(e) {
  let s = await espaceStripe(e);
  let imp = null;
  try { imp = impayesGestion(e, espStripeCache.data); } catch (err) { imp = null; }
  if (!s && imp && Date.now() - espStripeCache.ts > STRIPE_IMPAYE_FRAIS_MS) {
    s = await espaceStripe(e, STRIPE_IMPAYE_FRAIS_MS);
    try { imp = impayesGestion(e, espStripeCache.data); } catch (err) { imp = null; }
  }
  /* ⛔ STRIPE ILLISIBLE N'EST PAS « RIEN DE PAYÉ » (30 septembre 2026, relectures `gardien` B3 et `relecteur`, rejoué) : une
     clé posée et AUCUNE liste — Stripe muet au redémarrage du serveur (le cache est froid après chaque déploiement), ou une
     panne sans liste connue (`stripeListe` rend alors `[]` pendant la minute qui suit l'échec). `espaceStripe` rend `null`
     comme pour une entreprise sans abonnement ; `illisible` le distingue (`payeInconnu`). Sans clé, Stripe n'est pas
     configuré : personne n'y paie (un serveur d'essai, les bancs). */
  const cle = !!(config.stripe && config.stripe.secretKey);
  /* ⛔ ET UNE LISTE PÉRIMÉE NE DIT PAS QUI NE PAIE PAS (seconde relecture de `gardien`, 30 septembre 2026). Après
     `espaceStripe`, une liste plus vieille que `STRIPE_CACHE_MS` veut dire que la relecture a ÉCHOUÉ (ou qu'on attend la
     minute qui suit un échec, `stripeListe`). Elle sert encore à SERVIR une entreprise qui y paie (on ne coupe pas le
     temps d'une panne) ; mais une entreprise qui a payé depuis n'y est pas — la fin d'une période offerte, un premier
     abonnement : son ABSENCE ne prouve rien, et elle était suspendue sans sursis. C'était déjà la règle du rappel J-7
     (`abonnementGestion`). ⚠️ Un IMPAYÉ lu dans cette liste, lui, bloque encore (`espacePaye`, avant ce doute) : c'est ce
     que Stripe a DIT, pas un silence — et la page de paiement relit la facture en direct avant d'y envoyer
     (`factureImpayeARegler`) ; en faire un doute l'aurait laissée ouvrir un SECOND abonnement à côté de l'impayé. */
  const perimee = cle && !!espStripeCache.data && Date.now() - espStripeCache.ts > STRIPE_CACHE_MS;
  const illisible = !s && cle && (!espStripeCache.data || perimee);
  return { s, imp, illisible, perimee };
}
/* le motif d'un impayé — distinct d'« aucun paiement » : la Tour le montre, et l'horloge de conservation le garde (la fin d'un
   abonnement n'est pas un abandon) */
const motifImpaye = imp => 'impayé Stripe (' + imp.abo.status + ', par ' + imp.parQuoi + ') — accès payant bloqué';
/* ⛔⛔ LA RÈGLE UNIQUE : UN IMPAYÉ BLOQUE-T-IL CETTE ENTREPRISE ? (relecture adverse du 29 septembre 2026, rejouée) —
   `espacePaye` et le rappel J-7 (`abonnementGestion`) la lisent tous les deux : ce que le courriel annonce est ce que
   l'application fera. `s` : le payé trouvé (`espaceStripeDans`), `imp` : l'impayé (`impayesGestion`).
   · un abonnement d'OP GESTION PAYÉ qui est le sien (`s.memes`) : jamais bloquée — un refusé parmi des payés ne retire
     que ses places ;
   · ⛔ un payé trouvé qui n'est pas le sien (l'abonnement de la voisine d'adresse, gravé à son nom), ou OP MESSAGES seul :
     bloquée si l'impayé est SÛREMENT à elle (`surs`) — sinon l'abonnement d'une autre lui ouvrait l'accès payant pendant
     que sa propre carte était refusée ;
   · ⛔ une fiche « Gratuit » : seulement sur un impayé SÛREMENT à elle — l'abonnement refusé d'une voisine d'adresse faisait
     dire « abonnement non réglé » chaque jour à une entreprise qui ne doit rien ;
   · rien de payé : bloquée par tout impayé qui la désigne (`tous`) — c'est la forme qui n'écrit rien chez elle. */
function impayeBloque(e, s, imp) {
  if (!imp) return false;
  const gestion = s ? (s.memes || []).filter(aboDeGestion) : [];
  if (gestion.length) return false;
  if (s || ficheSansFormule(e)) return (imp.surs || []).length > 0;
  return true;
}
/* ⛔⛔ UNE FICHE SANS FORMULE PAYANTE : une fiche « Gratuit » d'avant, OU une fiche sur laquelle la Tour n'a jamais posé de
   formule (Justin, 30 septembre 2026, à la question « une fiche sans formule garde tout l'accès : les suspendre aussi ? » :
   « Suspend »). Les deux suivent le MÊME chemin : une période offerte (les codes promo ne sont pas touchés), puis Stripe — et
   sans l'un ni l'autre, elles ne sont pas payées : `/api/espaces/etat` les sert suspendues. Jusque-là, une fiche sans formule
   recevait tout l'accès : la route répondait avant même de regarder ce qu'elle payait. UNE définition, lue par
   `impayeBloque`, `aboEchuMotif`, `aboManuelDe`, `gratuitPayeIllisible`, `espacePaye` et le rappel J-7
   (`abonnementGestion`) : deux lectures de « sans formule » finiraient par répondre différemment. */
function ficheSansFormule(e) { return !!e && (!e.formule || e.formule === 'gratuit'); }
/* ce que la Tour lit dans le motif — et « aucune formule » en tête, pour l'horloge de conservation (`jamaisAbonne` : il n'y a
   pas de fin d'abonnement à laquelle rattacher ses 24 mois ; `conservation.js` garde les 80 premiers caractères) */
const ficheSansFormuleLbl = e => (e && e.formule === 'gratuit') ? 'formule Gratuit (retirée le 30 septembre 2026)' : 'aucune formule posée dans la Tour';
/* ⛔⛔ DANS LE DOUTE, ON NE COUPE PAS — ET ON NE DÉCIDE RIEN (30 septembre 2026, relectures `gardien` B3 et A1, `relecteur`,
   rejouées). Stripe illisible (`stripeVerdict`) ou registre des codes illisible (une période offerte peut y être, tapée dans
   l'application sans toucher la fiche) : on ne SAIT pas si l'entreprise paie. Ces deux cas finissaient en « aucun paiement »
   — une suspension COMPLÈTE de toute l'équipe, pour une panne de Stripe au redémarrage du serveur. `paye:true` pour les
   lectures de fond (l'horloge de conservation ne date pas, la Tour ne dit pas « non payé ») ; `inconnu` pour qui sert
   l'application : `/api/espaces/etat` répond `verificationImpossible` (l'appareil garde ce qu'il savait — ni suspendu à tort,
   ni rouvert), « Mon espace » ne dit rien. (Le doute qui PAIE — un code posé sur la fiche, registre illisible — reste servi :
   il a une présomption, celui-ci n'en a aucune.) */
function payeInconnu(pourquoi) {
  return { paye: true, doute: true, inconnu: true, motif: pourquoi + ' — on ne sait pas si elle paie : rien n\'est décidé' };
}
/* ⛔ LA RÈGLE UNIQUE : CE QU'`espacePaye` A RENDU SUSPEND-IL L'APPLICATION ? `/api/espaces/etat` et « Mon espace »
   (`formuleServieDe`) la lisent toutes les deux — deux copies « mot pour mot » finissent par diverger (`relecteur`,
   30 septembre 2026). `f` : la formule servie. Pas payé, bloqué, ou une formule que l'application ne sait pas servir. (Le
   doute `inconnu` ne passe pas par ici : il ne décide rien.) */
function accesSuspenduPar(p, f) { return !!(p && (p.bloque || !p.paye || !RANG_FORMULE.includes(f))); }
/* ⛔ CE QUE LA RÉPONSE PAYÉE DIT À QUI CONNAÎT `t` (seconde relecture de `gardien`, 30 septembre 2026). Le motif complet est
   pour la Tour, qui est gardée : il portait le NOM de la personne de la Tour qui a réglé l'abonnement, le chemin par lequel
   Stripe a rattaché l'entreprise (« par adresse e-mail »), l'état d'un registre du serveur. L'application ne lit du motif
   que la forme « code promo X (jusqu'au AAAA-MM-JJ) » (`forfaitServeurSync`, v763 comme v767 — elle y prend le code et la
   fin de la période) : c'est la seule qui passe, le reste devient « accès actif ». ⚠️ Le code promo lui-même reste lisible
   tant que l'application le lit dans ce texte (R1, `REPRISE.md` : deux champs à part d'abord, le retrait ensuite). */
function motifPublic(m) {
  const s = String(m || '');
  return /^code promo \S+ \(jusqu'au \d{4}-\d{2}-\d{2}\)$/.test(s) ? s : 'accès actif';
}
/* le lendemain d'une date « AAAA-MM-JJ » (UTC) — le premier jour où une période offerte ne sert plus ; `''` sinon */
function jourApres(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ''));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + 1)).toISOString().slice(0, 10) : '';
}
/* « essai terminé le … » : un réglage « actif » ou « essai » ÉCHU ne décide plus (`aboManuelDe`) ; quand rien d'autre ne
   paie, le motif le dit encore à la Tour */
function aboEchuMotif(e) {
  const auj = new Date().toISOString().slice(0, 10);
  return (e && !ficheSansFormule(e) && (e.aboStatut === 'actif' || e.aboStatut === 'essai') && e.aboFin && e.aboFin < auj)
    ? (e.aboStatut === 'essai' ? 'essai' : 'abonnement') + ' terminé le ' + e.aboFin + ' (réglé par ' + (e.aboPar || 'TEAM OP') + ') — ' : '';
}
/* ⛔ LA FORMULE D'UNE FICHE « GRATUIT » QU'UN ABONNEMENT D'OP GESTION ILLISIBLE PAIE (`gratuitPayeIllisible`) : celle de son
   TARIF quand il est connu — un abonnement d'avant la bascule au tarif Business Premium reste Business Premium (`gardien` A5 :
   `formulePayee` compte ces abonnements à la formule de la fiche, et une fiche « Gratuit » n'en a pas) ; Pro, la formule
   d'entrée, à défaut. Le plus d'abonnements décide, à égalité le plus bas — la règle de `formulePayee`. UNE définition, lue
   par `espacePaye` et le rappel J-7.
   ⛔ Le « Pro à défaut » vaut pour une fiche « Gratuit » (c'est un gain pour elle). Une fiche SANS formule avait tout l'accès
   jusqu'ici (l'application garde son forfait, Business Premium par défaut) : lui servir Pro sur un tarif qu'on ne sait pas
   lire grisait les fonctions qu'elle paie peut-être — elle garde Business Premium (relecture de la poussée, 30 septembre
   2026 : on ne coupe pas une entreprise qui paie peut-être). */
function formuleGratuitIllisible(s, e) {
  const parRang = RANG_FORMULE.map(() => 0);
  for (const sb of ((s && s.surs) || []).filter(aboDeGestion)) {
    for (const it of ((sb && sb.items && Array.isArray(sb.items.data)) ? sb.items.data : [])) {
      const g = classerLigne(it);   // (ni OP MESSAGES ni une option : seule une ligne de FORMULE dit quelle formule on paie)
      if (g.genre === 'formule') parRang[g.rang] += Math.max(1, parseInt(it && it.quantity, 10) || 0);
    }
  }
  let rang = -1;
  for (let k = 0; k < parRang.length; k++) if (parRang[k] > 0 && (rang < 0 || parRang[k] > parRang[rang])) rang = k;
  return rang >= 0 ? RANG_FORMULE[rang] : ((e && e.formule === 'gratuit') ? 'pro' : 'premium');
}
const bloqueImpaye = imp => ({ paye: false, motif: motifImpaye(imp), impaye: true, impayeStripe: true, bloque: true,
  echeance: imp.abo.current_period_end ? new Date(imp.abo.current_period_end * 1000).toISOString().slice(0, 10) : '' });
/* ⛔ L'ABONNEMENT RÉGLÉ À LA MAIN DANS LA TOUR DÉCIDE-T-IL ? Oui, sauf sur une fiche « Gratuit » d'avant réglée « active »
   ou « en essai » (30 septembre 2026) : ce réglage disait « Gratuit, en service », et le Gratuit n'existe plus. Elle suit le
   chemin d'une fiche « Gratuit » (période offerte, Stripe, sinon suspendue) — sans ça, le serveur la disait payée pendant
   que `/api/espaces/etat` la suspendait (formule que l'application ne connaît pas) : la Tour aurait dit « payé » à côté d'une
   application suspendue. Un impayé, une suspension ou une résiliation posés à la main gardent leur sens.
   UNE définition, lue par `espacePaye`, `finEssaiPeriode`, `abonnementGestion` et le rappel J-7 : quatre lectures de
   « réglé à la main » finiraient par répondre différemment.
   ⛔ ET UN « ACTIF » OU UN « ESSAI » ÉCHU NE DÉCIDE PLUS (30 septembre 2026, `gardien` B1 et B2, rejoués). « Essai offert
   jusqu'au … » — le geste que la Tour conseille elle-même — l'emportait encore APRÈS sa fin sur Stripe et sur la période
   offerte : l'entreprise qui avait payé entre-temps restait suspendue jusqu'à ce que la Tour efface le réglage ; et le J-7,
   qui le lisait au jour d'aujourd'hui, envoyait un lien de paiement à une entreprise déjà abonnée — un second abonnement,
   prélevé en double. Échu, il laisse décider la période offerte, puis Stripe ; rien ne payant, le motif le dit encore
   (`aboEchuMotif`). `jour` : le jour où l'on juge — aujourd'hui, ou le lendemain de la période offerte (J-7, facturation
   différée). */
function aboManuelDe(e, jour) {
  if (!(e && e.aboStatut)) return false;
  const court = e.aboStatut === 'actif' || e.aboStatut === 'essai';
  if (court && ficheSansFormule(e)) return false;   // (sans formule non plus : quelle formule servirait-il ?)
  return !(court && e.aboFin && e.aboFin < (jour || new Date().toISOString().slice(0, 10)));
}
/* ⛔ UNE FICHE « GRATUIT » D'AVANT QU'UN ABONNEMENT ILLISIBLE PAIE : PRO, LA FORMULE D'ENTRÉE (30 septembre 2026). Un abonnement
   vivant qu'on ne sait pas LIRE (d'avant la bascule, tarif fait à la main, sans ligne) garde d'ordinaire la formule de la
   fiche (`formulePayee`) — et la fiche « Gratuit » n'en a plus à servir. On ne coupe pas une entreprise qui paie : Pro.
   Seulement s'il est SÛREMENT à elle (`surs` : gravé à son nom, ou une adresse que personne d'autre ne porte — l'abonnement
   d'une voisine d'adresse ne sert pas deux entreprises) et d'OP GESTION (`aboDeGestion`). UNE définition, lue par
   `espacePaye` et le rappel J-7 (`abonnementGestion`) : ce que le courriel annonce est ce que l'application fera — un
   lien de paiement envoyé à une entreprise encore servie ferait un second abonnement, prélevé en double. */
function gratuitPayeIllisible(e, s, fp) {
  /* (« aucune formule payée lisible » : `fp.f` vide, ou « gratuit » — OP MESSAGES lisible à côté d'une ligne d'OP GESTION à
     tarif inconnu ne dit rien de la formule, et l'entreprise paie OP GESTION) */
  return !!(ficheSansFormule(e) && s && (s.surs || []).some(aboDeGestion) && !(fp && fp.f && fp.f !== 'gratuit'));
}
async function espacePaye(e, opts) {
  /* ⛔⛔ `lecture` : RÉPONDRE SANS RIEN ACTIVER (24 septembre 2026, relevé par `gardien`).
     Le rattrapage ci-dessous ÉCRIT (compteur du code, `promos-usages.json`) et ENVOIE un
     courriel au client (« ton code est actif jusqu'au … »). C'est juste quand c'est
     l'APPLICATION de l'entreprise qui demande son état : elle se sert du service. Ça ne l'est
     pas pour une lecture de fond — l'horloge de conservation balaie TOUTES les entreprises au
     démarrage puis chaque heure, la Tour les liste toutes d'un coup : chaque code en attente
     se serait activé tout seul, sans que le client ait rien ouvert, une place de
     `maxUtilisations` consommée et ses mois qui partent. « Ouvrir un écran n'écrit pas »,
     appliqué au serveur.
     En lecture, un code VALABLE en attente compte comme payé (« en cas de doute, on dit ça
     paie » : l'horloge de suppression ne démarre pas sur un client qui a un code à activer),
     et rien n'est écrit ni envoyé. */
  const lecture = !!(opts && opts.lecture);
  /* ⛔ LES OPTIONS PAYÉES SE LISENT SUR STRIPE, ET SEULEMENT SI ON LE SAIT (1er octobre 2026) : une liste périmée (la relecture a
     échoué) ou des places qu'on n'a pas su compter ne disent pas ce que l'entreprise a de payé — le champ reste ABSENT, et
     l'application garde ce qu'elle savait (« dans le doute, on ne décide rien »). `[]` veut dire « on sait, il n'y en a pas ». */
  /* « rien d'OP GESTION de payé, et ce qu'on voit n'est que des options » : le motif le dit à la Tour (OP MESSAGES seul se dit autrement) */
  const seulesOptions = s => !!s && (s.surs || []).length > 0 && s.surs.every(sb => { const l = (sb && sb.items && Array.isArray(sb.items.data)) ? sb.items.data : [];
    return l.length > 0 && l.every(it => classerLigne(it).genre === 'option'); });
  const optsStripe = (f, places, s, perimee) => (perimee || places === null || places === undefined) ? undefined : optionsServies(f, places, s);
  /* (une fiche SANS formule ne sort plus ici : elle suit le chemin de la fiche « Gratuit », plus bas — `ficheSansFormule`) */
  if (!e) return { paye: false, motif: 'aucune formule' };
  /* ⛔⛔ L'IDENTIFIANT D'UNE ENTRÉE ANCIENNE NE VIT QUE DANS SON CODE (relecture de `gardien`, 30 septembre 2026, rejouée) :
     la période offerte (`periodeOfferte`) et le rattrapage d'un code lisaient `e.t` — vide pour ces entrées-là. Une entreprise
     en pleine période offerte était donc suspendue (et datée « jamais abonnée » par l'horloge de conservation) pendant que le
     rappel J-7, qui passe par `espaceT`, lui promettait « rien n'est prélevé avant… ». On le pose une fois, ici. */
  if (!e.t) { const tCode = espaceT(e); if (tCode) e = Object.assign({}, e, { t: tCode }); }
  if (aboManuelDe(e)) {   // réglé à la main dans la Tour (un « actif » ou un « essai » échu n'arrive plus ici : `aboManuelDe`)
    if (e.aboStatut === 'actif' || e.aboStatut === 'essai') {
      /* ⛔ les options réglées à la main ne valent que sous la formule Pro (`optionsServies`) : Stripe n'est pas lu ici, comme
         pour le reste du réglage de la Tour */
      return { paye: true, motif: (e.aboStatut === 'essai' ? 'essai offert' : 'abonnement activé') + ' par ' + (e.aboPar || 'TEAM OP') + (e.aboFin ? ' (jusqu\'au ' + e.aboFin + ')' : ''), finLe: e.aboFin || '',
        optionsServies: optionsServies(e.formule, null, null, e) };
    }
    /* ⛔ l'impayé posé à la main dans la Tour se sert comme l'impayé Stripe (`bloque`, relecture adverse du 29 septembre 2026) :
       sans ça, un bandeau « Paye ton abonnement » à toute l'équipe et `db.forfait` réécrit — deux impayés, deux comportements */
    if (e.aboStatut === 'impaye') return { paye: false, motif: 'impayé (réglé par ' + (e.aboPar || 'TEAM OP') + ')', impaye: true, bloque: true };
    return { paye: false, motif: { suspendu: 'suspendu', annule: 'annulé' }[e.aboStatut] + ' (réglé par ' + (e.aboPar || 'TEAM OP') + ')' };
  }
  /* ⛔⛔ LE RATTRAPAGE D'UN CODE EN ATTENTE PASSE AVANT LA FICHE SANS FORMULE OU « GRATUIT » (30 septembre 2026, trouvé en
     écrivant le banc de la relecture de `gardien`). Il était placé après, « réservé aux fiches payantes » — écrit quand une
     fiche Gratuit gardait l'accès. Depuis la suspension, une entreprise sans formule dont le code VALABLE attendait d'être
     compté était suspendue au lieu d'être servie. Justin : « ceux qui ont un code promotionnel qui correspond à un forfait
     payant ne sont pas impactés ». Les conditions ne changent pas (code connu, jamais servi à cette entreprise, un seul à la
     fois, plafond) ; activé, la période offerte le sert juste en dessous. */
  try {   // rattrapage : un code demandé à la demande d'accès mais jamais compté (espace recréé…) s'active ici
    if (e.codePromo && e.t) {
      const c = String(e.codePromo).toUpperCase();
      const p = (config.promos || []).find(x => String(x.code || '').trim().toUpperCase() === c);
      const u0 = promoUsages[c] || { n: 0, equipes: {} };
      /* ⛔ `promoServiA`, pas `u0.equipes[e.t]` : après « repartir à neuf », l'entreprise a un
         NOUVEL identifiant, et un code qu'elle avait déjà servi redevenait neuf ici — le
         rattrapage l'activait une seconde fois, avec une période neuve (voir `promoPresente`).
         Et « un seul code à la fois », comme les quatre autres chemins : celui-ci ne le faisait pas. */
      if (p && !promosIllisible && !promoServiA(c, e.t, e.slug) && !promoAutreActif(c, e.t, e.slug) && !(p.maxUtilisations && u0.n >= p.maxUtilisations)) {
        if (lecture) return { paye: true, motif: 'code promo ' + c + ' en attente — il s\'active au prochain lancement de l\'application', promoCode: c, enAttente: true, formuleServie: formulePromo(e, c) || (RANG_FORMULE.includes(e.formule) ? e.formule : 'premium') };
        const dF = new Date(); dF.setMonth(dF.getMonth() + Math.max(1, Number(p.mois) || 1));
        u0.n++; u0.equipes[e.t] = promoEntree(dF.toISOString().slice(0, 10), e.t, e.slug);
        promoUsages[c] = u0; savePromoUsages();
        console.log('code promo', c, 'activé en rattrapage pour', e.t);
        mailPromoActive(e.t, c, dF.toISOString().slice(0, 10), ['pro', 'business', 'premium'].includes(p.formule) ? p.formule : 'premium');
      }
    }
  } catch (err) {}
  /* ⛔⛔ PLUS DE FORMULE GRATUITE (Justin, 30 septembre 2026 : « si une entreprise ne paye plus, le service est suspendu
     tant que c'est pas réglé » — et les codes promo n'y touchent pas). Une fiche « Gratuit » est un reste d'avant : la Tour
     ne la pose plus (ses deux routes la refusent). Elle reçoit ce qu'elle PAIE — une période offerte, puis Stripe (29
     septembre 2026 : « ils choisissent le tarif qu'ils veulent ») — et, sans l'un ni l'autre, elle n'est PAS payée :
     `/api/espaces/etat` la sert suspendue, comme toute entreprise qui ne paie pas. Jusqu'au 30 septembre, « gratuit »
     passait ici pour payé. */
  /* ⛔⛔ ET UNE FICHE SANS FORMULE PREND LE MÊME CHEMIN (Justin, 30 septembre 2026 : « Suspend ») — `ficheSansFormule`. */
  if (ficheSansFormule(e)) {
    /* ⛔ UNE PÉRIODE OFFERTE EN COURS SERT LA FORMULE DU CODE, FICHE « GRATUIT » COMPRISE (règle 3 de Justin ; relecture
       adverse du 29 septembre). `/api/promo/valider` enregistre la période sans toucher la fiche : une entreprise Gratuit
       qui entrait un code dans l'application recevait Gratuit du serveur, pendant que le courriel J-7 lui parlait de
       Business Premium. On LIT la période (un code en attente vient d'être rattrapé, juste au-dessus). */
    const po = periodeOfferte(e);
    if (po) return po;
    const { s, imp, illisible, perimee } = await stripeVerdict(e);
    const fp = s ? formuleEtPlaces(e, s) : null;
    if (fp && fp.f && fp.f !== 'gratuit') return { paye: true, motif: s.motif + ' — formule payée : ' + (FORMULE_LBL2[fp.f] || fp.f), echeance: s.echeance, formuleServie: fp.f, placesStripe: fp.places,
      impayesPartiels: imp ? imp.tous.length : 0, optionsServies: optsStripe(fp.f, fp.places, s, perimee) };
    /* ⛔ son abonnement d'OP GESTION refusé : l'impayé, comme partout (`bloque`) — OP MESSAGES payé ou non, il ne sert pas
       OP GESTION ; et seulement pour un impayé SÛREMENT à elle (`impayeBloque`) : celui d'une voisine d'adresse ne fait pas
       dire « impayé » à une entreprise qui ne doit rien (elle n'est pas payée pour autant — plus bas) */
    if (impayeBloque(e, s, imp)) return bloqueImpaye(imp);
    /* un abonnement d'OP GESTION SÛREMENT à elle qu'on ne sait pas lire : la formule de son tarif s'il est connu, Pro sinon
       (`gratuitPayeIllisible`, `formuleGratuitIllisible`) ; le motif le dit, pour que la Tour corrige la fiche. Sans rien de
       sûr, elle ne paie pas : suspendue (plus bas). */
    if (gratuitPayeIllisible(e, s, fp)) {
      const fI = formuleGratuitIllisible(s, e);
      return { paye: true, motif: s.motif + ' — ' + (e.formule === 'gratuit' ? 'fiche « Gratuit » (formule retirée)' : 'fiche sans formule') + ', abonnement illisible : ' + (FORMULE_LBL2[fI] || fI) + ' servi en attendant la Tour',
        echeance: s.echeance, formuleServie: fI, placesStripe: placesDeFormule(e, fI, s.memes || []), impayesPartiels: imp ? imp.tous.length : 0,
        optionsServies: optsStripe(fI, placesDeFormule(e, fI, s.memes || []), s, perimee) };
    }
    /* ⛔ on ne SAIT pas (Stripe illisible, ou une période offerte peut être dans un registre illisible) : rien n'est décidé */
    if (illisible) return payeInconnu(perimee ? 'liste Stripe périmée (la relecture a échoué)' : 'Stripe illisible');
    if (promosIllisible) return payeInconnu('registre des codes illisible');
    /* ⛔ trouvée dans une liste PÉRIMÉE, mais sans rien d'OP GESTION à elle (OP MESSAGES seul, l'abonnement d'une voisine) :
       elle a pu acheter OP GESTION pendant la panne — on ne sait pas (troisième relecture de `gardien`, 30 septembre 2026) */
    if (perimee) return payeInconnu('liste Stripe périmée (la relecture a échoué)');
    /* rien de payé qui soit à elle : suspendue. Le motif dit pourquoi — à la Tour seulement (`/api/espaces/etat` ne sert
       qu'« accès suspendu ») */
    const pourquoi = !s ? 'aucun paiement ni code promo' : (fp && fp.f === 'gratuit') ? (seulesOptions(s) ? 'seules des options sont payées, sans formule' : 'seul OP MESSAGES est payé')
      : 'l\'abonnement trouvé à son adresse n\'est pas sûrement le sien (adresse partagée)';
    return { paye: false, motif: ficheSansFormuleLbl(e) + ' — ' + pourquoi + ' : suspendue jusqu\'au règlement' };
  }
  /* Registre des codes ILLISIBLE : on ne peut plus savoir si la période de cet espace court encore.
     « En cas de doute, on dit ça paie » — pour un espace qui porte un code (relecture de `gardien`) :
     sinon l'application grisait une entreprise en pleine période offerte, et l'horloge de
     conservation la datait. Rien n'est écrit ; `/health` et la surveillance crient déjà. */
  /* ⛔ …SAUF UN IMPAYÉ QUE STRIPE DIT (relecture de la poussée, 30 septembre 2026, rejouée) : ce retour passait AVANT Stripe —
     une entreprise dont la carte est refusée, et qui avait eu un jour un code, recevait Business Premium « payé », le
     sursis de la Tour, et la page de paiement lui vendait un SECOND abonnement au lieu de sa facture. Le doute porte sur
     la période offerte ; l'impayé, Stripe l'a dit (même règle qu'une liste périmée : il bloque encore).
     ⚠️ Un impayé SÛREMENT à elle seulement (`surs` : gravé à son identifiant, ou à une adresse que personne d'autre ne
     porte — relecture finale, rejouée) : l'impayé sans référence d'une voisine d'adresse suspendait une entreprise dont la
     période court peut-être encore. Là, on ne sait ni si elle paie ni qui doit : dans le doute, on ne coupe pas. */
  if (promosIllisible && e.codePromo) {
    const vI = await stripeVerdict(e);
    if (vI.imp && (vI.imp.surs || []).length && impayeBloque(e, vI.s, vI.imp)) return bloqueImpaye(vI.imp);
    return { paye: true, motif: 'code promo ' + String(e.codePromo).toUpperCase() + ' — registre des codes illisible, dans le doute on ne coupe pas', promoCode: String(e.codePromo).toUpperCase(), doute: true,
    /* la formule du CODE, comme la période qu'on ne peut plus lire (seconde relecture de `gardien`) : la fiche seule
       faisait retomber une entreprise Pro en période Business Premium, `db.forfait` réécrit et synchronisé */
    formuleServie: formulePromo(e, e.codePromo) || e.formule };
  }
  const po = periodeOfferte(e);   // code promo : compté par espace (teamId = identifiant de l'espace)
  if (po) return po;
  const { s, imp, illisible, perimee } = await stripeVerdict(e);
  if (s) {
    /* ⛔ LA FORMULE SUIT CE QUI EST PAYÉ (Justin, 29 septembre 2026 : « ils choisissent le tarif qu'ils veulent » ; un code
       promo ouvre Business Premium « pour mieux montrer l'application », et à la fin chacun choisit sa formule). La route de
       paiement ne refuse plus un tarif sous la formule de la fiche : c'est la formule SERVIE qui suit le tarif payé
       (`formulePayee`) — payer Pro donne Pro, même si la fiche dit Business Premium. Ce qu'on ne sait pas lire (un
       abonnement d'avant la bascule, un tarif créé à la main chez Stripe) garde la formule de la fiche : on ne coupe pas. */
    const fp = formuleEtPlaces(e, s), f = fp.f || e.formule;
    /* ⛔ rien d'OP GESTION de payé qui soit à elle (OP MESSAGES seul, ou l'abonnement d'une voisine d'adresse) et un impayé
       sûrement à elle : bloquée (`impayeBloque`, la règle que le J-7 lit aussi) — pas le Gratuit « normal » qui réécrit `db`,
       ni l'accès payant prêté par une autre entreprise */
    if (impayeBloque(e, s, imp)) return bloqueImpaye(imp);
    /* un abonnement refusé parmi d'autres payés : ses places ne sont pas servies (`placesStripe` ne compte que le payé) — le
       motif le dit, pour que la Tour le voie */
    const nImp = imp ? imp.tous.length : 0;
    /* ⛔ rien d'OP GESTION de payé — OP MESSAGES seul, lignes lisibles (`formulePayee`) : il n'y a plus de formule Gratuit à
       servir (30 septembre 2026). OP GESTION n'est pas payé, donc suspendu jusqu'au règlement ; le motif le dit à la Tour. */
    if (f === 'gratuit') return perimee ? payeInconnu('liste Stripe périmée (la relecture a échoué)')   // (même raison, plus haut)
      : promosIllisible ? payeInconnu('registre des codes illisible')
      : { paye: false, motif: aboEchuMotif(e) + s.motif + ' — OP GESTION non payé (' + (seulesOptions(s) ? 'seules des options sont payées, sans formule' : 'seul OP MESSAGES l\'est') + ')' };
    return { paye: true, motif: s.motif + (f === e.formule ? '' : ' — formule payée : ' + (FORMULE_LBL2[f] || f))
      + (nImp ? ' — ' + nImp + ' abonnement' + (nImp > 1 ? 's' : '') + ' en impayé : ' + (nImp > 1 ? 'leurs' : 'ses') + ' places ne sont pas servies' : ''), echeance: s.echeance, formuleServie: f,
      placesStripe: fp.places, impayesPartiels: nImp, optionsServies: optsStripe(f, fp.places, s, perimee) };
  }
  /* ⛔⛔ CARTE REFUSÉE = IMPAYÉ, ET PAS D'ACCÈS PAYANT TANT QUE CE N'EST PAS RÉGLÉ (Justin, 29 septembre 2026). `bloque` :
     l'application grise les catégories payantes SANS rien écrire (`/api/espaces/etat` la sert comme une suspension au sursis
     écoulé), et tout revient dès que Stripe dit l'abonnement payé. */
  if (impayeBloque(e, null, imp)) return bloqueImpaye(imp);
  /* ⛔ on ne SAIT pas : dans le doute, rien n'est décidé (`payeInconnu`) — jusqu'ici, « aucun paiement », donc suspendue */
  if (illisible) return payeInconnu(perimee ? 'liste Stripe périmée (la relecture a échoué)' : 'Stripe illisible');
  if (promosIllisible) return payeInconnu('registre des codes illisible');
  return { paye: false, motif: aboEchuMotif(e) + 'aucun paiement ni code promo' };
}
/* Une période offerte EN COURS pour cette entreprise (lue, jamais activée) : elle SERT la formule du code — Business
   Premium par défaut, jamais sous la fiche (`formulePromo`). `null` sinon. */
function periodeOfferte(e) {
  try {
    const auj = new Date().toISOString().slice(0, 10);
    for (const [code, u] of Object.entries(promoUsages || {})) {
      const eq = u && u.equipes && u.equipes[espaceT(e)];   // (`espaceT` : une entrée ancienne n'a son identifiant que dans son code)
      /* ⛔ une période offerte sert TOUJOURS une formule payante (30 septembre 2026) : un code retiré de `config.promos` ne dit
         plus sa formule, et une fiche « Gratuit » d'avant n'en a pas à servir — la formule d'un code par défaut, Business
         Premium (`formuleDuCode`), plutôt que « gratuit », que `/api/espaces/etat` sert désormais SUSPENDU : une entreprise
         en pleine période offerte aurait été coupée parce que son code avait quitté la configuration. */
      /* ⛔ pendant une période offerte, aucune option n'est servie (`[]`, 1er octobre 2026) : la formule du code ouvre ce qu'elle
         ouvre (Business Premium par défaut : tout), et une option achetée en même temps attend la fin de la période comme le
         reste (`finEssaiPeriode`) */
      if (eq && eq.finLe && eq.finLe >= auj) return { paye: true, motif: 'code promo ' + code + ' (jusqu\'au ' + eq.finLe + ')', promoCode: code, finLe: eq.finLe,
        formuleServie: formulePromo(e, code) || (RANG_FORMULE.includes(e.formule) ? e.formule : 'premium'), optionsServies: [] };
    }
  } catch (err) {}
  return null;
}
/* ⛔ PAYER PENDANT UNE PÉRIODE OFFERTE NE FACTURE RIEN AVANT SA FIN (Justin, 29 septembre 2026 : « oui » à « la
   facturation démarre à la fin du code »). Sans ça, le client qui choisit sa formule dans le courriel des sept jours
   payait dès le jour même des semaines que son code couvrait encore. Rend la fin de l'essai à donner à Stripe
   (`subscription_data[trial_end]`, en secondes) et le jour du premier prélèvement — ou `null`, et rien ne change
   (facturation immédiate, comme avant) :
   · l'entreprise est celle de la référence vérifiée par la route (`visees`, déjà réduites à UNE identité), sinon celle de
     l'adresse du compte — et, dans les DEUX cas, l'adresse du compte ne désigne qu'ELLE (une adresse = une entreprise,
     Justin). ⛔ Deux entreprises à une adresse, même avec la référence de l'une : rien. Un abonnement en essai trouvé par
     l'adresse rendait l'AUTRE « payée » pour rien, jusqu'à la fin de l'essai — il suffisait d'annuler avant (`gardien`,
     rejoué) ; avant l'essai, cette limite connue coûtait au moins le premier prélèvement ;
   · ⛔ une entreprise dont l'abonnement est réglé à la main dans la Tour (`aboStatut` sur l'entrée que l'application
     lit) : `espacePaye` s'arrête sur ce statut AVANT la période offerte — la différer promettrait une période qui n'est
     pas servie (`gardien`) ;
   · la période court jusqu'à `finLe` INCLUS, en UTC, comme `periodeOfferte` : le premier prélèvement a lieu le
     lendemain à 0 h UTC, à l'instant exact où l'application cesse de servir la formule du code ;
   · Stripe refuse une fin d'essai à moins de 48 h (page de paiement) ou à plus de deux ans : hors de ces bornes, `null`
     plutôt qu'un paiement refusé — à deux jours de la fin, le client paie tout de suite, comme avant ;
   · une entreprise fermée, un code en attente (pas encore de période), une entrée sans identifiant : `null`.
   L'abonnement naît en essai (`trialing`), qu'`espacePaye` compte déjà comme vivant : pendant la période, c'est elle qui
   sert (elle passe AVANT Stripe) ; ensuite, ce qui est payé. */
function finEssaiPeriode(visees, adresse, maintenant) {
  try {
    if (!adresse) return null;
    const parT = new Map();
    for (const sl of Object.keys(espacesReg || {})) {
      const x = espacesReg[sl];
      if (!x || typeof x.email !== 'string' || x.email.trim().toLowerCase() !== adresse) continue;
      const t = String(espaceT(x) || '').trim();
      if (!parT.has(t)) parT.set(t, Object.assign({ slug: sl }, x));
    }
    if (parT.size !== 1) return null;   // aucune, ou deux entreprises à la même adresse : on ne choisit pas
    const e = (visees || [])[0] || [...parT.values()][0];
    const t = String(espaceT(e) || '').trim();
    if (!t || !parT.has(t) || espaceFerme(t)) return null;
    const lue = espaceParT(t);
    const po = periodeOfferte(Object.assign({}, e, { t }));
    const m = po && /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(po.finLe));
    if (!m) return null;
    /* le réglage à la main se juge le jour où la facturation commencerait : un essai de la Tour qui finit AVANT la fin de la
       période ne la décide plus ce jour-là (`gardien` B1) */
    if (lue && aboManuelDe(lue, jourApres(po.finLe))) return null;
    const debutMs = Date.UTC(+m[1], +m[2] - 1, +m[3] + 1);
    const maint = Number.isFinite(maintenant) ? maintenant : Date.now();
    if (debutMs < maint + 48 * 3600000 + 10 * 60000 || debutMs > maint + 730 * 86400000) return null;
    return { fin: Math.floor(debutMs / 1000), debut: new Date(debutMs).toISOString().slice(0, 10), finLe: po.finLe, t };
  } catch (err) { return null; }
}
/* Un abonnement relu chez Stripe : `{ impaye, url, statut }` — `impaye` s'il l'est toujours (`past_due`, `unpaid`), `url` la
   page de sa facture ouverte (https:// seulement) ou `''`. JETTE si Stripe ne répond pas : l'appelant refuse ou attend, il ne devine
   pas. Partagé par la page de paiement et le rappel J-7. */
async function factureOuverteDe(subId, sk) {
  const httpsOk = u => /^https:\/\//.test(String(u || ''));
  const d = await stripeMonGet('https://api.stripe.com/v1/subscriptions/' + encodeURIComponent(subId) + '?expand[]=latest_invoice', sk);
  if (!d) return { impaye: false, url: '' };
  /* le statut, MÊME RÉGLÉ (troisième relecture de `gardien`, 30 septembre 2026) : « réglé depuis la liste » (actif, en essai —
     l'abonnement court) n'est pas « annulé depuis » (plus rien ne court). La page de paiement et le rappel J-7 les distinguent. */
  if (!STATUTS_IMPAYES.includes(d.status)) return { impaye: false, url: '', statut: String(d.status || '') };
  const li = d.latest_invoice;
  if (li && typeof li === 'object' && li.status === 'open' && httpsOk(li.hosted_invoice_url)) return { impaye: true, url: String(li.hosted_invoice_url), statut: d.status };
  const f = await stripeMonGet('https://api.stripe.com/v1/invoices?subscription=' + encodeURIComponent(subId) + '&status=open&limit=1', sk);
  const x = f && Array.isArray(f.data) ? f.data[0] : null;
  return { impaye: true, url: (x && httpsOk(x.hosted_invoice_url)) ? String(x.hosted_invoice_url) : '', statut: d.status };
}
/* ⛔⛔ UN IMPAYÉ SE RÈGLE, IL NE SE RACHÈTE PAS (Justin, 29 septembre 2026 : carte refusée = impayé, accès payant bloqué
   jusqu'au règlement). L'entreprise dont la carte est refusée voit ses fonctions payantes grisées ; si elle repasse par la page
   de paiement, un SECOND abonnement naît — et le jour où Stripe réussit sa nouvelle tentative sur le premier, elle paie DEUX
   FOIS. La page de paiement l'envoie donc sur la FACTURE EN ATTENTE (la page Stripe, où elle règle avec une autre carte ;
   l'abonnement redevient actif et tout revient).
   ⛔ SEULE UNE ENTREPRISE BLOQUÉE Y EST ENVOYÉE (relecture adverse du 29 septembre 2026, rejouée) : l'entreprise visée (la
   référence vérifiée, sinon celle — unique — de l'adresse du compte) passe par le verdict d'`espacePaye` ; SERVIE (un refusé
   parmi des payés, une période offerte, un réglage de la Tour), elle achète normalement — des places de plus, pas une vieille
   facture ni un 409 sans issue. Les candidats d'une entreprise bloquée : ses impayés SÛRS, et ceux qui la désignent et que
   le compte qui paie a payés (`metadata[compte]`, ou l'adresse du client Stripe) ; sans entreprise identifiable, ceux du
   compte. ⛔ JAMAIS un abonnement gravé à une AUTRE entreprise de l'annuaire : sa page de facture montre le nom, l'adresse et
   le montant d'une autre. Chacun se RELIT chez Stripe (la liste a jusqu'à une minute) :
   · toujours impayé, avec une facture ouverte → `{ url }` (seule une adresse https:// part, comme la Tour) ;
   · `past_due` sans facture ouverte → 409 `impaye_sans_facture` (rien n'est créé : TEAM OP règle à la main) ; `unpaid` sans
     facture ouverte → le paiement normal (Stripe ne réessaie plus : aucun double prélèvement possible) ;
   · réglé depuis (actif, en essai) → 409 `impaye_regle` si aucun autre n'est à régler : l'accès revient à la prochaine
     lecture de la liste (une minute d'ordinaire ; à son retour si elle est en panne — la page ne promet donc aucun délai) ;
     un abonnement neuf naîtrait À CÔTÉ de celui qui court — prélevé en double (troisième
     relecture de `gardien`, 30 septembre 2026 : une liste périmée, ou la minute qui suit un règlement) ; annulé depuis → on
     passe au suivant, puis au paiement normal ;
   · un candidat, mais Stripe ne répond pas à sa relecture → 502 : on refuse plutôt que de risquer un double prélèvement.
   ⚠️ La LISTE elle-même illisible (jamais lue, Stripe en panne) ne bloque PAS le paiement : sans elle on ne sait pas s'il y a
   un impayé, et refuser TOUS les paiements pendant une panne de la liste coûterait plus (la dernière liste connue sert,
   sinon le paiement normal suit — et la page de paiement de Stripe, elle, dépend du même Stripe).
   `null` : rien à régler, le paiement normal suit. */
async function factureImpayeARegler(visees, payeurMin) {
  const sk = config.stripe && config.stripe.secretKey;
  if (!sk || !payeurMin) return null;
  let liste = null;
  try { liste = await stripeListe(STRIPE_IMPAYE_FRAIS_MS); } catch (err) { console.error('paiement : liste Stripe illisible, pas de recherche d\'impayé —', stripeLog(err)); return null; }
  if (!liste) return null;
  let e = (visees || [])[0] || null;
  if (!e) {
    const parT = new Map();
    for (const sl of Object.keys(espacesReg || {})) {
      const x = espacesReg[sl];
      if (!x || typeof x.email !== 'string' || x.email.trim().toLowerCase() !== payeurMin) continue;
      const t = String(espaceT(x) || '').trim();
      if (!parT.has(t)) parT.set(t, Object.assign({ slug: sl }, x));
    }
    if (parT.size === 1) e = [...parT.values()][0];   // deux entreprises à une adresse : seules celles du compte comptent
  }
  const clientMail = sb => (sb.customer && typeof sb.customer === 'object') ? String(sb.customer.email || '').trim().toLowerCase() : '';
  const duCompte = sb => String((sb.metadata && sb.metadata.compte) || '').trim().toLowerCase() === payeurMin || clientMail(sb) === payeurMin;
  const monT = e ? String(espaceT(e) || '').trim().toLowerCase() : '';
  /* gravé à une AUTRE entreprise de l'annuaire (son identifiant ou son nom d'accès) — sans entreprise visée : une entreprise
     d'une autre adresse que celle du compte */
  const autre = sb => { const m = String((sb.metadata && sb.metadata.espace) || '').trim().toLowerCase(); if (!m) return false;
    return Object.keys(espacesReg || {}).some(sl => { const x = espacesReg[sl]; if (!x) return false;
      const t = String(espaceT(x) || '').trim().toLowerCase();
      if (String(sl).toLowerCase() !== m && t !== m) return false;
      return e ? !(monT && t === monT) : String(x.email || '').trim().toLowerCase() !== payeurMin; }); };
  let cand = [];
  if (e) {
    let p = null;
    /* le nom d'accès voyage avec l'entrée (`espacesDeRef` et l'annuaire le posent) : `espacePaye` rattache par `[slug, t]` */
    try { p = await espacePaye(Object.assign({ slug: e.slug }, facturationDe(e)), { lecture: true }); } catch (err) { p = null; }
    if (!p || !p.bloque) return null;
    let imp = null;
    try { imp = impayesGestion(e, espStripeCache.data || liste); } catch (err) { imp = null; }
    if (imp) cand = imp.tous.filter(sb => sb && sb.id && (imp.surs.includes(sb) || (duCompte(sb) && !autre(sb))));
  } else cand = liste.filter(sb => sb && sb.id && STATUTS_IMPAYES.includes(sb.status) && aboDeGestion(sb) && duCompte(sb) && !autre(sb));
  return facturesARegler(cand, sk);
}
/* les impayés candidats, relus un à un chez Stripe — la règle ci-dessus, partagée avec l'impayé d'une OPTION
   (`impayeOptionARegler`) : `{ url }`, `{ refus, error }` ou `null` */
async function facturesARegler(cand, sk) {
  let regle = false;
  for (const sb of cand.slice(0, 10)) {
    let f = null;
    try { f = await factureOuverteDe(sb.id, sk); }
    catch (err) { console.error('paiement : relecture d\'un impayé impossible —', stripeLog(err)); return { refus: 502, error: 'stripe_indisponible' }; }
    if (!f.impaye) { if (STATUTS_PAYES.includes(f.statut)) regle = true; continue; }   // réglé (ou annulé) depuis la liste
    if (f.url) return { url: f.url };
    if (f.statut === 'unpaid') continue;   // Stripe ne réessaie plus : pas de double prélèvement, le paiement normal suit
    return { refus: 409, error: 'impaye_sans_facture' };
  }
  if (regle) return { refus: 409, error: 'impaye_regle' };
  return null;
}
/* ⛔ UNE OPTION IMPAYÉE SE RÈGLE, ELLE NE SE RACHÈTE PAS (1er octobre 2026) : l'option d'une entreprise dont la carte a été refusée
   n'est pas servie (`optionsServies` ne compte que le payé) — et la lui revendre ferait un SECOND abonnement d'option, prélevé
   en double le jour où Stripe réussit sa nouvelle tentative sur le premier. Seuls les abonnements SÛREMENT à elle et qui portent
   une des options DEMANDÉES comptent ; la facture ouverte part à la place (`{ url }`). Une liste illisible ne bloque pas
   (comme `factureImpayeARegler`). `null` : rien à régler. */
async function impayeOptionARegler(e, cles) {
  const sk = config.stripe && config.stripe.secretKey;
  if (!sk || !e || !cles || !cles.length) return null;
  let liste = null;
  try { liste = await stripeListe(STRIPE_IMPAYE_FRAIS_MS); } catch (err) { return null; }
  if (!liste) return null;
  const r = espaceStripeDans(e, liste, STATUTS_IMPAYES, true);
  const cand = ((r && r.surs) || []).filter(sb => sb && sb.id && ((sb.items && Array.isArray(sb.items.data)) ? sb.items.data : []).some(it => { const g = classerLigne(it); return g.genre === 'option' && cles.includes(g.cle); }));
  return cand.length ? facturesARegler(cand, sk) : null;
}
/* ⛔ UNE PANNE DE STRIPE SE RELIT D'ELLE-MÊME (troisième relecture de `gardien`, 30 septembre 2026). `stripeEchecMin` compte
   depuis le premier échec et ne revient à zéro qu'à une lecture réussie — or on ne relit Stripe que quand quelqu'un le
   demande. Un seul échec, puis plus personne qui passe par Stripe (toutes les entreprises réglées à la main ou en période
   offerte) : la surveillance aurait crié toutes les heures, pour toujours, sur une panne finie. C'est la leçon de `mailRefus` :
   une alarme crie sur la RÉCENCE. Toutes les cinq minutes, tant qu'un échec est en cours, qu'aucune lecture ne tourne et que la
   minute d'attente est passée, on relit. */
function stripeRelirePanne() {
  if (!espStripeCache.echecDepuis || espStripeCache.enCours) return false;
  if (Date.now() - espStripeCache.echecTs <= 60000) return false;
  stripeListe().catch(() => {});
  return true;
}
setInterval(stripeRelirePanne, 5 * 60000).unref();
/* La liste des abonnements Stripe (tous statuts), relue quand elle a plus de `ageMax` ms (au plus `STRIPE_CACHE_MS`) —
   `null` sans clé Stripe ; jette seulement quand elle n'a JAMAIS pu être lue. Partagée par le verdict « payé »
   (`espaceStripe`), la page de paiement (`factureImpayeARegler`) et le rappel J-7. */
async function stripeListe(ageMax) {
  const sk = config.stripe && config.stripe.secretKey;
  if (!sk) return null;
  const age = ageMax > 0 ? Math.min(ageMax, STRIPE_CACHE_MS) : STRIPE_CACHE_MS;
  /* ⛔ UNE SEULE LECTURE DE STRIPE À LA FOIS, ET PAS DE RAFALE PENDANT UNE PANNE (29 septembre 2026, relecture adverse,
     rejoué) : « Mon espace » lit aussi ce cache (`formuleServieDe`). Stripe muet, chaque lecture attendait trois abandons
     de 12 s et en relançait trois — et des lectures simultanées lançaient chacune les leurs. Une lecture en cours se
     PARTAGE ; un échec ne se retente qu'une minute plus tard, et pendant ce temps la dernière liste connue sert (rien,
     s'il n'y en a jamais eu : comme avant, où chaque appel échouait à son tour).
     ⛔ Y COMPRIS POUR L'APPEL QUI ATTENDAIT LA LECTURE RATÉE : il rendait « non payé » à une entreprise qui paie, alors
     qu'une liste connue était là — on ne coupe pas une entreprise qui paie le temps d'une panne de Stripe. */
  if (Date.now() - espStripeCache.ts > age || !espStripeCache.data) {
    if (!espStripeCache.enCours && Date.now() - espStripeCache.echecTs > 60000) {
      espStripeCache.enCours = stripeAbosBruts(sk)
        .then(d => { espStripeCache.data = d; espStripeCache.ts = Date.now(); espStripeCache.echecTs = 0; espStripeCache.echecDepuis = 0; },
          err => { espStripeCache.echecTs = Date.now(); espStripeCache.echecDepuis = espStripeCache.echecDepuis || Date.now(); throw err; })
        .finally(() => { espStripeCache.enCours = null; });
    }
    if (espStripeCache.enCours) {
      try { await espStripeCache.enCours; }
      catch (err) { if (!espStripeCache.data) throw err; console.error('espacePaye stripe (la dernière liste connue sert) :', err.message); }
    }
  }
  return espStripeCache.data || [];
}
/* ── LES ABONNEMENTS STRIPE D'UNE ENTREPRISE ─────────────────────────────────────────────────────────────────────
   Sortie d'`espacePaye` (29 septembre 2026) pour que la fiche « Gratuit » y passe aussi : rend le premier abonnement
   trouvé, TOUS ses abonnements (`memes`, pour les places), ceux qui sont SÛREMENT à elle (`surs`, pour monter), ceux qui
   laissent un DOUTE (`douteux`, qui interdisent de descendre), le motif et l'échéance — ou `null`.
   ⛔ PAYÉ = `active` OU `trialing`, ET C'EST TOUT — `past_due` N'EN EST PLUS (Justin, 29 septembre 2026 : « si la carte
   est refusée, c'est un impayé » ; « leur accès sont bloqués le temps que c'est pas payé » ; « rien n'est perdu, mais pas
   de paiement, pas d'accès au service payant »). Un abonnement dont le prélèvement a échoué comptait comme payé pendant
   toutes les nouvelles tentatives de Stripe ; il est désormais un IMPAYÉ (`impayesGestion`), comme `unpaid`, et
   l'application grise les catégories payantes jusqu'au règlement (`/api/espaces/etat`). */
async function espaceStripe(e, ageMax) {
  /* ⚠️ PLUS `&& e.email`. Le rattachement par RÉFÉRENCE n'a besoin d'aucune adresse : exiger
     un e-mail ici aurait laissé sans paiement reconnu, justement, les espaces créés sans
     adresse — ceux de la Tour. Le repli par e-mail se garde tout seul plus bas. */
  try {
    const liste = await stripeListe(ageMax);
    if (liste) return espaceStripeDans(e, liste);
  } catch (err) { console.error('espacePaye stripe:', err.message); }
  return null;
}
/* ⛔ À QUI SONT LES ABONNEMENTS D'UNE LISTE STRIPE — la décision d'`espaceStripe`, sortie en fonction PURE (29 septembre 2026,
   seconde relecture de `gardien`) : le rappel J-7 la rejoue sur les seuls abonnements encore vivants le lendemain de la fin
   d'une période offerte (`abonnementGestion`), pour dire au client ce que l'application fera VRAIMENT ce jour-là. Une seule
   définition des règles de rattachement : deux copies divergeraient un jour, et le courriel mentirait.
   `statuts` : les statuts Stripe qui comptent (défaut : `active`, `trialing` — les abonnements PAYÉS) ; les impayés passent
   par les MÊMES règles avec `STATUTS_IMPAYES` (`impayesGestion`), pour qu'une entreprise ne soit jamais « impayée » d'un
   abonnement que les règles du payé auraient rattaché à une autre.
   ⛔ `tSeul` (les impayés) : une référence ne rattache que si elle EST l'identifiant de l'entreprise (`t`), jamais son nom
   d'accès (`gardien`, 29 septembre 2026, rejoué) — un nom se libère et se reprend : l'impayé d'une ancienne entreprise
   gravé à son nom BLOQUAIT la nouvelle et lui donnait la page de sa facture (nom, adresse, montant d'une autre). Le payé
   garde les deux (on ne coupe pas une entreprise qui paie peut-être). */
const STATUTS_PAYES = ['active', 'trialing'];
const STATUTS_IMPAYES = ['past_due', 'unpaid'];
function espaceStripeDans(e, liste, statuts, tSeul) {
  /* ⛔ DEUX RATTACHEMENTS, DANS CET ORDRE, ET LE PREMIER EST LE SEUL FIABLE.
     1. LA RÉFÉRENCE D'ESPACE, gravée sur l'abonnement à la création de la page de paiement
        (`subscription_data[metadata][espace]`). Elle ne dépend d'aucune adresse et survit
        au renouvellement.
     2. L'ADRESSE E-MAIL, gardée en REPLI — et c'est nécessaire : tous les abonnements
        souscrits AVANT ce correctif n'ont aucune métadonnée. La retirer couperait des
        clients qui paient. Elle reste ce qu'elle a toujours été, une correspondance
        fragile : l'entreprise paie, la comptable saisit l'adresse de facturation de la
        société, et comme ce n'est pas celle avec laquelle l'espace a été créé, rien ne se
        rattache. Le client a payé et son application reste bloquée, sans un mot.
     ⚠️ On compare le slug ET le `t` : la référence envoyée par le site peut être l'un ou
     l'autre selon la page, et se tromper ici coûte un client qui a payé.
     ⚠️ Le `t` se lit par `espaceT` — en clair, OU dans le code des entrées les plus anciennes : c'est lui que la
     route de paiement grave (« B »), et `e.t` seul ne voyait pas ces entrées-là, rattachées alors par la seule
     adresse (`gardien`, rejoué) — un changement d'adresse et le paiement se perdait. */
  /* ⛔⛔ UNE ENTREPRISE, UNE FACTURATION — JUSQU'À STRIPE (relecture de la poussée, 30 septembre 2026, rejouée) : la formule
     d'une entreprise renommée se lit sur tous ses noms (`facturationDe`), mais son abonnement ne se cherchait qu'avec le
     nom et l'adresse du plus récent. Payée par un abonnement gravé à son ANCIEN nom d'accès (d'anciennes pages de
     paiement), ou trouvé par l'adresse de l'ancien nom, elle passait de servie à SUSPENDUE. Ses autres noms (même
     identifiant) comptent donc ici comme le sien — leurs noms d'accès et leurs adresses. */
  const autresNoms = Object.keys(espacesReg || {}).filter(sl => { const x = espacesReg[sl]; const tx = String((x && espaceT(x)) || '').toLowerCase();
    return !!x && !!tx && tx === String(espaceT(e) || '').toLowerCase() && String(sl).toLowerCase() !== String(e.slug || '').toLowerCase(); });
  const refs = (tSeul ? [String(espaceT(e) || '').toLowerCase()] : [String(e.slug || '').toLowerCase(), String(espaceT(e) || '').toLowerCase(),
    ...autresNoms.map(sl => String(sl).toLowerCase())]).filter(Boolean);
  const st = Array.isArray(statuts) && statuts.length ? statuts : STATUTS_PAYES;
  const vivant = sb => !!sb && st.includes(sb.status);
  let abo = refs.length ? liste.find(sb => vivant(sb)
    && sb.metadata && refs.includes(String(sb.metadata.espace || '').toLowerCase())) : null;
  let parQuoi = 'référence d\'espace';
  /* ⛔ LE REPLI NE SE TENTE QUE S'IL Y A UNE ADRESSE DES DEUX CÔTÉS, ET C'EST TOUT
     L'INTÉRÊT DE CETTE LIGNE. `String(null || '').toLowerCase()` vaut `''` : un espace
     sans adresse — c'est-à-dire TOUT espace ouvert depuis la Tour, qui écrit
     `email: … || ''` — se rattachait alors au premier abonnement vivant dont le client
     Stripe n'a pas d'adresse (client effacé, paiement par lien, saisie sans e-mail).
     Mesuré : un espace à `email:''` rendait `{paye:true, par adresse e-mail}` contre
     l'abonnement d'une AUTRE entreprise. Deux clients, un seul paiement — et celui qui
     paie ne le sait pas.
     On normalise aussi les deux côtés : l'adresse de l'espace n'est nulle part mise en
     minuscules à l'écriture, et une majuscule sur la page Stripe suffisait à bloquer un
     client qui avait pourtant payé. */
  const mel = String(e.email || '').trim().toLowerCase();
  const monT = String(espaceT(e) || '').toLowerCase();
  /* (ses adresses : la sienne, puis celles de ses autres noms — voir `autresNoms`. ⛔ Mais seulement celles qu'AUCUNE autre
     entreprise de l'annuaire ne porte (relecture des correctifs, 30 septembre 2026, rejouée) : une ancienne adresse reprise par
     une voisine ne désigne plus la nôtre — elle lui empruntait son abonnement (« payée », et ses places), lui attribuait son
     impayé, et rendait « partagée » notre propre adresse, si bien qu'un impayé gravé à notre ancien nom ne bloquait plus et que
     la page de paiement vendait un second abonnement. Notre adresse ACTUELLE, elle, garde la règle d'avant (`partagee`).) */
  const aUneAutre = m => Object.keys(espacesReg || {}).some(sl => { const x = espacesReg[sl];
    return !!x && String(x.email || '').trim().toLowerCase() === m && String(espaceT(x) || '').toLowerCase() !== monT; });
  const mels = [mel, ...autresNoms.map(sl => String(espacesReg[sl].email || '').trim().toLowerCase()).filter(m => m && m !== mel && !aUneAutre(m))].filter(Boolean);
  const tDe = r => { const x = espacesReg[r]; return String((x && espaceT(x)) || r).toLowerCase(); };
  const refDe = sb => String((sb.metadata && sb.metadata.espace) || '').toLowerCase();
  const mailDe = sb => (!!sb.customer && typeof sb.customer === 'object') ? String(sb.customer.email || '').trim().toLowerCase() : '';
  /* ⛔ UNE ADRESSE D'UN ANCIEN NOM NE RATTACHE JAMAIS L'ABONNEMENT GRAVÉ À L'IDENTIFIANT D'UNE AUTRE ENTREPRISE DE L'ANNUAIRE
     (relecture finale de la poussée, 30 septembre 2026, rejouée) : deux sociétés sœurs qui partageaient l'adresse du patron,
     l'une en change — son abonnement, gravé à SON identifiant, portait encore l'ancienne adresse, et servait l'autre (« payée »
     sans rien payer, ou Business Premium au prix de Pro, par `douteux`). Un identifiant ne se libère pas (repartir à neuf en
     donne un NOUVEAU) : un abonnement gravé à celui d'une autre entreprise vivante est le sien, sûrement. Le serveur d'avant
     ne cherchait pas du tout ces adresses : ce filtre ne retire rien de ce qu'il servait. Notre adresse ACTUELLE garde la
     règle d'avant (« le verdict payé ne regarde pas la référence », plus bas). */
  const tAutre = r => !!r && r !== monT && Object.values(espacesReg || {}).some(x => !!x && String(espaceT(x) || '').toLowerCase() === r);
  const parMail = sb => { const m = mailDe(sb); return !!m && mels.includes(m) && (m === mel || !tAutre(refDe(sb))); };
  /* ⚠️ une adresse PARTAGÉE avec une autre entreprise de l'annuaire rend un abonnement sans référence ambigu : celle
     qui a déjà un abonnement à son nom ne le prend pas (sinon il compterait chez les deux) ; celle qui n'est
     rattachée que par l'adresse le garde, comme avant. (Déclarée AVANT `aMoi`, qui la lit.) */
  const partagee = mels.length > 0 && Object.keys(espacesReg || {}).some(sl => { const x = espacesReg[sl]; return !!x && x !== e
    && String(sl).toLowerCase() !== String(e.slug || '').toLowerCase() && mels.includes(String(x.email || '').trim().toLowerCase())
    && !(monT && String(espaceT(x) || '').toLowerCase() === monT); });   // ses propres autres noms (même `t`) ne la « partagent » pas
  /* ⛔ ET « PARTAGÉE » SE DÉCIDE ABONNEMENT PAR ABONNEMENT (même relecture, rejouée) : seule notre adresse ACTUELLE peut être
     portée par une voisine — les anciennes n'entrent dans `mels` que si personne d'autre ne les porte (`aUneAutre`). Décidée
     pour tous, elle rendait ambigu un abonnement trouvé par une ancienne adresse dès que l'actuelle était partagée : une place
     payée perdue, une fiche sans formule qui paie suspendue, un impayé gravé à notre ancien nom qui ne bloquait plus. */
  const partageeDe = sb => partagee && mailDe(sb) === mel;
  /* ⛔ UN IMPAYÉ GRAVÉ AU NOM D'ACCÈS (d'anciennes pages envoyaient le nom, pas l'identifiant) n'est à elle que s'il porte
     AUSSI son adresse, ET QUE PERSONNE D'AUTRE NE LA PORTE. Le nom seul ne prouve rien — libéré puis repris, il désigne
     une autre entreprise (`gardien`, G1) ; mais l'ignorer tout à fait laissait ouvert l'accès payant d'une entreprise dont
     l'ancien abonnement, gravé à SON nom et à SON adresse, était refusé (mutation I36, 29 septembre 2026 au soir). Et une
     adresse que porte une AUTRE entreprise ne départage rien : repris par une autre entreprise à la même adresse, le nom
     la bloquait et lui servait la facture de l'ancienne, pendant que la vraie débitrice restait servie (relecture adverse
     du même soir, rejoué). Là, on ne sait pas qui le doit : il ne bloque personne (limite connue, dans le sens qui ne coupe
     personne — la même que « une adresse = une entreprise » du payé). Le payé, lui, suit la règle d'avant. */
  const aMoi = sb => { const m = refDe(sb); return !!m && (refs.includes(m) || (!!monT && tDe(m) === monT && (!tSeul || (parMail(sb) && !partageeDe(sb))))); };
  /* ⛔ LE VERDICT « PAYÉ » NE REGARDE PAS LA RÉFÉRENCE D'UN ABONNEMENT TROUVÉ PAR L'ADRESSE. Essayé le 28 septembre
     au soir (écarter celui « gravé pour une autre entreprise de l'annuaire ») : `gardien` l'a rejoué sur deux cas
     réels où la référence désigne encore une entrée de la MÊME entreprise — un « repartir à neuf » sur une entreprise
     à deux noms (l'autre nom garde l'ancien `t`), un nom libéré puis repris — et une entreprise qui paie se lisait
     NON PAYÉE. On ne coupe jamais une entreprise qui paie peut-être ; la limite connue reste : deux entreprises à la
     même adresse, et l'abonnement de l'une rend l'autre « payée » (la Tour seule range deux entrées ainsi). */
  if (!abo && mels.length) {
    abo = liste.find(sb => vivant(sb) && parMail(sb));
    parQuoi = 'adresse e-mail';
  }
  /* ⛔ LES PLACES SE PAIENT (Justin, 28 septembre 2026 : « oui, automatique »). Jusque-là on ne lisait chez Stripe
     que « un abonnement vivant, oui ou non » : payer un abonnement de plus ne donnait AUCUNE place tant que TEAM OP
     ne réglait pas la Tour. On compte donc les abonnements VIVANTS de CETTE entreprise (voir `placesStripe`), et
     c'est ce nombre que l'application v763 lit (`places` de `/api/espaces/etat`). Relu par `gardien` le même soir. */
  if (abo) {
    /* ⛔ SES abonnements, quel que soit le chemin qui a trouvé le premier : ceux qui portent sa référence, ET ceux de
       son adresse qui ne sont pas gravés pour une autre entreprise. La référence n'est gravée que depuis le
       19 septembre : une abonnée d'avant qui achète un abonnement de plus sur la page d'aujourd'hui en a des deux
       sortes, et ne compter que le gravé la faisait retomber de 7 places à 1 (`gardien`, A1, mesuré). */
    /* (`partagee`, l'adresse que porte aussi une autre entreprise, est calculée plus haut : `aMoi` la lit) */
    /* une référence qui ne désigne AUCUNE entrée de l'annuaire (une entreprise « repartie à neuf » à un seul nom) ne
       dit pas « à une autre » ; une référence qui en désigne une autre, si — ses places ne comptent pas ici */
    const designe = m => Object.keys(espacesReg || {}).some(sl => { const x = espacesReg[sl]; return !!x
      && (String(sl).toLowerCase() === m || String(espaceT(x) || '').toLowerCase() === m); });
    /* ⛔ une référence ORPHELINE (qui ne désigne plus aucune entrée : un « repartir à neuf ») trouvée par l'adresse compte
       aussi quand le premier abonnement est venu par la référence — le filtre des deux chemins était différent, et
       acheter OP MESSAGES (gravé) après un « repartir à neuf » écartait l'abonnement OP GESTION gravé à l'ancien
       identifiant (relecture adverse du 29 septembre, rejoué) */
    const memes = liste.filter(sb => vivant(sb) && (aMoi(sb) || (parMail(sb) && (parQuoi === 'adresse e-mail'
      ? (!refDe(sb) || !designe(refDe(sb)))
      : ((!refDe(sb) || !designe(refDe(sb))) && !partageeDe(sb))))));
    /* ⛔⛔ LA FORMULE NE SE DÉCIDE PAS SUR CE QUI EST AMBIGU (relecture adverse du 29 septembre 2026, rejoué). `memes`
       ne décidait que des places ; il décide maintenant de la formule, et un abonnement douteux y pèse dans les deux sens :
       · MONTER au-dessus de la fiche ne se fait que sur ce qui est SÛREMENT à elle (`surs`) : gravé à son nom, ou trouvé
         par une adresse que personne d'autre ne porte — sinon une fiche « Gratuit » recevait la formule et les places
         d'une AUTRE entreprise à la même adresse (un paiement, deux entreprises servies) ;
       · DESCENDRE sous la fiche ne se fait que sans DOUTE (`douteux` vide) : un abonnement d'OP GESTION trouvé par son
         adresse mais écarté ou ambigu (adresse partagée, référence d'un autre de ses noms) peut être le sien — sinon
         acheter OP MESSAGES faisait retomber en Gratuit une entreprise qui paie Business Premium. On ne coupe pas une
         entreprise qui paie peut-être : la fiche reste, la Tour montre ce qu'elle voit. */
    const surs = memes.filter(sb => aMoi(sb) || !partageeDe(sb));
    const douteux = liste.filter(sb => vivant(sb) && parMail(sb) && !aMoi(sb) && !surs.includes(sb)
      && ((sb.items && Array.isArray(sb.items.data)) ? sb.items.data.some(ligneGestion) : true));
    /* ⛔ LE MOTIF ET L'ÉCHÉANCE SE LISENT SUR UN ABONNEMENT QUI PORTE UNE FORMULE, pas sur l'option qui est tombée la première
       dans la liste (1er octobre 2026) : l'échéance d'une option à l'année dirait à la Tour, et à l'horloge de conservation,
       une fin d'abonnement qui n'est pas celle de la formule. Sans abonnement d'OP GESTION (options seules), le premier trouvé. */
    const aboF = aboDeGestion(abo) ? abo : (surs.find(aboDeGestion) || memes.find(aboDeGestion) || abo);
    return { abo: aboF, memes, surs, douteux, parQuoi, motif: 'abonnement Stripe (' + aboF.status + ', par ' + parQuoi + ')', echeance: aboF.current_period_end ? new Date(aboF.current_period_end * 1000).toISOString().slice(0, 10) : '' };
  }
  return null;
}
/* ══ LE NOMBRE DE PLACES QU'UNE ENTREPRISE A — CE QUE L'APPLICATION v763 LIT DANS `places` ══════════════════════
   Depuis la v763, l'application donne UN compte par abonnement dans toutes les formules (avant : 2 en Business, 3 en
   Business Premium). Justin, 28 septembre 2026 : « les entreprises déjà abonnées gardent leurs places » et « oui,
   automatique » (les places suivent le paiement). Relu par `gardien` le même soir — ses six constats ont décidé de ce qui
   suit :
   · ⛔ `quantite` GARDE SON SENS D'AVANT (le nombre d'abonnements réglé dans la Tour) : la v760 encore en service calcule
     2 × ou 3 × quantite ; lui rendre des places déjà multipliées les aurait comptées deux fois (× 4, × 9). Les places
     servies ont leur champ, `places`, que seule la v763 lit — et ne range jamais dans la base synchronisée (une v760 et
     une v763 y écriraient deux nombres différents et se les renverraient).
   · PAYÉ CHEZ STRIPE : on compte les abonnements vivants de l'entreprise, ligne par ligne, et seulement les tarifs de SA
     formule (un tarif Pro ne donne pas de places Business Premium, un abonnement OP MESSAGES n'en donne pas à OP
     GESTION). Le réglage de la Tour n'y ajoute rien : ce nombre-là peut venir de la demande tapée par le client.
   · LES ABONNÉS D'AVANT : une entreprise qui payait AVANT la bascule — un abonnement Stripe souscrit avant, ou un
     abonnement « actif » réglé dans la Tour avant, formule et nombre inchangés depuis — garde ce que la v760 lui donnait
     (quantite × 2 ou × 3). Chez Stripe, ce qu'elle achète APRÈS s'y AJOUTE (un abonnement de plus, une place de plus) ;
     réglée à la main dans la Tour, c'est la Tour qui décide (Stripe n'est pas lu tant qu'un statut y est posé).
   · Le nombre réglé ne vaut plancher que s'il vient de la Tour : pas d'une demande tapée par le client (« auto
     (demande) », où 50 utilisateurs tapés et un abonnement payé donnaient 150 places — `gardien`, A3).
   · Un tarif d'une formule AU-DESSUS compte (payer Business Premium sur une fiche réglée Business donne ses places) ; un
     tarif en dessous non : on ne paie pas des places Business Premium au prix Pro (`gardien`, A4).
   · ⛔ JAMAIS pour une entreprise qui a eu un code promo (en cours ou fini) ni pour un essai : à la fin d'un code, on paie
     chaque utilisateur (Justin, même jour) — et pendant le code, l'application couvre déjà toute l'équipe.
   · Calculé à chaque lecture, JAMAIS écrit dans le registre : rien d'irréversible. */
/* ⚠️ La bascule est posée APRÈS le déploiement de ce serveur (`gardien`, A8) : l'ancien datait `formuleTs` et `aboTs` à
   CHAQUE enregistrement de la Tour ; une bascule déjà passée aurait classé « d'après » toute entreprise réenregistrée
   entre-temps, et perdu ses places pour toujours. Ce qui est souscrit d'ici là compte « d'avant » : un cadeau, pas une perte. */
const PLACES_BASCULE = Date.parse(process.env.TEAMOP_PLACES_BASCULE || '') || Date.parse('2026-09-29T04:00:00Z');   // la variable : pour les bancs seulement
const PLACES_AVANT = { business: 2, premium: 3 };
const RANG_FORMULE = ['pro', 'business', 'premium'];   // un tarif de la formule ou d'une formule AU-DESSUS donne ses places
/* Les tarifs de chaque formule — les MÊMES que `STRIPE_PRICES` de recap-abonnement.html (publics, pas des secrets) ;
   `test-842` compare les deux listes : un tarif changé d'un seul côté, et des clients qui paient n'auraient plus de places. */
const STRIPE_PRIX_FORMULE = {
  pro: ['price_1TwV4RFKFKIrVWLDfGwAHMMh', 'price_1TwgbqFKFKIrVWLDQQ6xFRtf'],
  business: ['price_1TwV4sFKFKIrVWLDvYSD9AWp', 'price_1TwgcVFKFKIrVWLDpFbHY1lM'],
  premium: ['price_1TwV5qFKFKIrVWLD1iFJDsaR', 'price_1Twgd8FKFKIrVWLDavn9cJvz'],
  msgpro: ['price_1TwV6EFKFKIrVWLD3Dvl6lzb', 'price_1TwgdtFKFKIrVWLDJ4xBhFlM'],
  msgpremium: ['price_1TwV6mFKFKIrVWLD7DkH3P9f', 'price_1TwgeFFKFKIrVWLDgqaRlO6V'] };
const STRIPE_PRIX_MESSAGES = STRIPE_PRIX_FORMULE.msgpro.concat(STRIPE_PRIX_FORMULE.msgpremium);
/* ⛔⛔ LES OPTIONS DU PRO (Justin, 1er octobre 2026 : « Plus cher » — Stock 9 €, Achats 6 €, Encaissements et compta 6 €, Registre
   sanitaire 6 €, par utilisateur et par mois, à l'année dix mois). Elles ne se vendent QU'AVEC le Pro : Business et Business
   Premium ont tout. Cette table est le SEUL endroit où le serveur reconnaît une ligne d'option — par son IDENTIFIANT de tarif,
   jamais par le nom de son produit (`classerLigne`).
   ⚠️ VIDES tant que Justin n'a pas créé les tarifs chez Stripe (`node server/stripe-options.js`, qui imprime la table à coller
   ici ET dans recap-abonnement.html) : « les appareils d'abord, la porte ensuite » — vide, la route de paiement refuse
   (`option_indisponible`) et rien ne se vend. [mensuel, annuel], dans cet ordre, comme `STRIPE_PRIX_FORMULE`.
   ⚠️ Écrite avec DEUX espaces après les deux-points, exprès : `test-842` lit `STRIPE_PRIX_FORMULE` par un motif de ligne
   (`clé: ['price_…', 'price_…']`) et exige exactement cinq formules — ces lignes-ci ne doivent pas lui ressembler. Les options
   ont leur propre comparaison page ↔ serveur (`test-852`). Et le nom d'un produit d'option ne contient JAMAIS « messages » :
   `ligneMessages` lit le nom de produit. */
const STRIPE_PRIX_OPTION = {
  stock:      ['', ''],
  achats:     ['', ''],
  compta:     ['', ''],
  sanitaire:  ['', ''] };
const OPTIONS_CLES = ['stock', 'achats', 'compta', 'sanitaire'];   // « sanitaire », jamais « registre » : c'est déjà une vue et un onglet
const OPTIONS_PRIX_MOIS = { stock: 9, achats: 6, compta: 6, sanitaire: 6 };   // € TTC, par utilisateur et par mois (l'année : 10 mois)
const OPTIONS_LBL = { stock: 'Stock (et box pour la 3D)', achats: 'Achats fournisseurs', compta: 'Encaissements et compta', sanitaire: 'Registre sanitaire (métier 3D)' };
const OPTIONS_COURT = { stock: 'Stock', achats: 'Achats', compta: 'Compta', sanitaire: 'Registre sanitaire (3D)' };   // les courriels
function placesQ(e) { return Math.max(1, Math.min(50, parseInt(e && e.quantite, 10) || 1)); }
/* a-t-elle eu un code promo, un jour ? Le repère « (code) » de `formulePar` s'efface quand la Tour règle la formule
   ensuite : on lit `codePromo` et le registre des codes, qui restent. Registre illisible → oui, dans le doute. */
function placesPromoDejaEu(e) {
  if (!e) return false;
  if (e.codePromo || /\bcode\b/i.test(String(e.formulePar || ''))) return true;
  /* registre illisible (lu comme `{}`) : on NE SAIT PAS, et les repères de l'entrée ont déjà parlé ci-dessus. Répondre
     « oui » retirait leurs places d'avant à TOUTES les abonnées le temps de la panne (6 → 2, `gardien`) ; répondre « non »
     n'en rend qu'à une entreprise au code fini dont les repères ont été effacés. Le doute va au client qui paie. */
  if (promosIllisible) return false;
  const t = espaceT(e);
  try { return !!t && Object.values(promoUsages || {}).some(u => u && u.equipes && u.equipes[t]); } catch (err) { return true; }
}
/* une ligne d'abonnement : son tarif, et « est-ce OP MESSAGES ? » — partagés par les places et la formule payée */
const prixDeLigne = it => { const p = it && it.price; return typeof p === 'string' ? p : String((p && p.id) || ''); };
const ligneMessages = it => STRIPE_PRIX_MESSAGES.includes(prixDeLigne(it)) || /messages/i.test(String((it && it.price && it.price.product && it.price.product.name) || ''));
const aboAvantBascule = sb => (parseInt(sb && sb.created, 10) || 0) * 1000 < PLACES_BASCULE;
/* ⛔⛔ UNE LIGNE D'ABONNEMENT, CLASSÉE UNE SEULE FOIS (1er octobre 2026, les options du Pro). Jusque-là, « ni formule ni OP
   MESSAGES » voulait dire « un tarif qu'on ne sait pas lire » — et ce qu'on ne sait pas lire GARDE LA FORMULE DE LA FICHE (on ne
   coupe pas une entreprise qui paie). Une option, tarif que le serveur ne connaissait pas, y tombait : rejoué sur le vrai code,
   une fiche Business Premium dont l'abonnement n'était qu'une option à 6 € passait pour PAYÉE Business Premium ; une fiche sans
   formule recevait Business Premium ; l'option d'un voisin d'adresse empêchait de descendre sous la fiche ; une option payée à
   côté d'un Pro IMPAYÉ levait le blocage. Une ligne est donc, dans cet ordre :
   · `option` : son identifiant de tarif est dans `STRIPE_PRIX_OPTION` — par l'IDENTIFIANT seulement, jamais par le nom du produit,
     et jamais un identifiant vide (les tarifs sont vides tant que Justin ne les a pas créés : `'' === ''` aurait classé en
     option toute ligne sans tarif) ;
   · `messages` : OP MESSAGES (son tarif, ou « messages » dans le nom du produit — `ligneMessages`) ;
   · `formule` : un tarif de la page, avec son rang (`RANG_FORMULE`) ;
   · `inconnu` : le reste — l'ancien comportement, la fiche est gardée.
   UNE définition : `aboDeGestion`, `formulePayee`, `formuleGratuitIllisible`, `placesStripe`, `douteux` la lisent toutes. */
function classerLigne(it) {
  const px = prixDeLigne(it);
  const cle = px ? OPTIONS_CLES.find(k => (STRIPE_PRIX_OPTION[k] || []).includes(px)) : '';
  if (cle) return { genre: 'option', cle };
  if (ligneMessages(it)) return { genre: 'messages' };
  const rang = RANG_FORMULE.findIndex(k => STRIPE_PRIX_FORMULE[k].includes(px));
  if (rang >= 0) return { genre: 'formule', rang };
  return { genre: 'inconnu' };
}
/* une ligne qui dit quelque chose d'OP GESTION : une formule, ou un tarif qu'on ne sait pas lire — ni OP MESSAGES, ni une option */
const ligneGestion = it => { const g = classerLigne(it).genre; return g === 'formule' || g === 'inconnu'; };
/* un abonnement d'OP GESTION : d'avant la bascule (un ancien lien, on ne sait pas lire son tarif), sans ligne lisible, ou avec
   au moins une ligne de formule ou illisible — la règle du rappel J-7, partagée avec l'impayé et la page de paiement.
   ⛔ Un abonnement d'options SEULES n'en est pas un : il ne paie ni formule ni place, il ne débloque aucun impayé et ne fait
   passer personne pour « payé » (`classerLigne`). */
const aboDeGestion = sb => { const l = (sb && sb.items && Array.isArray(sb.items.data)) ? sb.items.data : [];
  return aboAvantBascule(sb) || !l.length || l.some(ligneGestion); };
/* ⛔ LES ABONNEMENTS D'OP GESTION EN IMPAYÉ D'UNE ENTREPRISE (Justin, 29 septembre 2026 : carte refusée = impayé, accès payant
   bloqué jusqu'au règlement). Les mêmes règles de rattachement que le payé (`espaceStripeDans`), sur les statuts impayés :
   `{ tous, surs, abo, parQuoi }` — `tous` : ceux qui la désignent (une adresse partagée comprise), `surs` : ceux qui sont
   SÛREMENT à elle (gravés à son identifiant, ou une adresse que personne d'autre ne porte). Qui est bloqué : `impayeBloque`.
   Un impayé d'OP MESSAGES seul ne touche pas OP GESTION. `null` : aucun. */
function impayesGestion(e, liste) {
  const imp = espaceStripeDans(e, liste || [], STATUTS_IMPAYES, true);
  const tous = ((imp && imp.memes) || []).filter(aboDeGestion);
  if (!tous.length) return null;
  const abo = tous.includes(imp.abo) ? imp.abo : tous[0];
  return { tous, surs: ((imp && imp.surs) || []).filter(aboDeGestion), abo, parQuoi: imp.parQuoi };
}
/* ⛔⛔ LA FORMULE QUE L'ENTREPRISE PAIE — CELLE QUE L'APPLICATION REÇOIT (Justin, 29 septembre 2026 : « ils choisissent
   le tarif qu'ils veulent » ; « le code promo, le plus gros forfait, c'est pour mieux montrer l'application » — à la fin,
   chacun prend la formule qu'il veut). La page de paiement ne refuse donc plus un tarif sous la formule de la fiche : c'est
   ICI que payer Pro donne Pro, même si la fiche dit Business Premium (sans quoi payer Pro gardait Business Premium, le trou
   que la relecture adverse avait rejoué).
   · un tarif de la page : sa formule ;
   · ⛔ plusieurs formules payées en même temps : celle qui porte le PLUS d'abonnements, et à égalité la plus BASSE — ses
     places comptent les abonnements de cette formule et des formules au-dessus (`placesStripe`). La plus haute, d'abord
     choisie, coupait : dix abonnements Pro et un Business Premium pour le patron donnaient Business Premium avec UNE place
     (relecture adverse du 29 septembre 2026, rejoué) — et en face, servir la plus haute à tous les abonnements aurait
     vendu Business Premium au prix Pro. À égalité, plus de places plutôt que moins : on ne coupe pas ;
   · ⛔ ce qu'on ne sait pas lire garde la formule de la FICHE — un abonnement d'AVANT la bascule (souscrit par un ancien
     lien, à un autre tarif) ou un tarif créé à la main chez Stripe : on ne coupe pas une entreprise qui paie ;
   · des abonnements d'APRÈS qui ne sont QUE d'OP MESSAGES : OP GESTION n'est pas payé, « gratuit » — seulement si chacun
     a des lignes LISIBLES : un abonnement sans ligne (donnée tronquée) disait « gratuit » à une entreprise qui paie ;
   · un abonnement d'AVANT la bascule interdit de descendre sous la fiche : on ne sait pas lire ce qu'il paie ;
   · rien du tout : `null` (l'appelant garde la fiche). */
function formulePayee(e, abos) {
  const rangFiche = RANG_FORMULE.indexOf(e && e.formule);
  const parRang = RANG_FORMULE.map(() => 0);   // abonnements payés, formule par formule
  let avant = 0, illisibles = 0, messages = 0, options = 0;
  /* une ligne compte au moins pour un : une quantité absente (tarif « à l'usage ») ne doit pas faire croire à Gratuit */
  const compte = (r, it) => { if (r >= 0) parRang[r] += Math.max(1, parseInt(it && it.quantity, 10) || 0); };
  for (const sb of abos || []) {
    const lignes = (sb && sb.items && Array.isArray(sb.items.data)) ? sb.items.data : null;
    /* ⛔ une option n'est pas une formule, même d'avant la bascule : elle ne s'ajoute à AUCUN rang (`classerLigne`) — sans ça,
       deux abonnements d'options × 3 faisaient Business d'une fiche Business contre un Pro × 3 */
    if (aboAvantBascule(sb)) { avant++; for (const it of lignes || []) if (ligneGestion(it)) compte(rangFiche, it); continue; }
    if (!lignes || !lignes.length) { illisibles++; continue; }
    for (const it of lignes) {
      const g = classerLigne(it);
      if (g.genre === 'messages') { messages++; continue; }
      if (g.genre === 'option') { options++; continue; }
      compte(g.genre === 'formule' ? g.rang : rangFiche, it);
    }
  }
  let rang = -1;
  for (let r = 0; r < parRang.length; r++) if (parRang[r] > 0 && (rang < 0 || parRang[r] > parRang[rang])) rang = r;   // à égalité : la plus basse
  if (rang >= 0) return RANG_FORMULE[avant && rangFiche > rang ? rangFiche : rang];
  /* OP MESSAGES seul, ou des OPTIONS seules (lignes toutes lisibles) : rien d'OP GESTION n'est payé — « gratuit », donc suspendu.
     Une option ne fait jamais passer une entreprise pour « payée » (la formule qu'elle complète, elle, doit l'être). */
  if ((messages || options) && !avant && !illisibles) return 'gratuit';
  return null;
}
/* ⛔ LA FORMULE QU'UNE PÉRIODE OFFERTE SERT (Justin, 29 septembre 2026 : « le code promo, mets-le au plus gros forfait —
   c'est pour mieux montrer l'application »). Celle du code dans `config.promos`, Business Premium quand il n'en dit pas ;
   JAMAIS sous la formule de la fiche. Avant, la période servait la fiche seule : une entreprise réglée Pro qui recevait un
   code lisait « formule Business Premium offerte » dans son courriel et gardait Pro à l'écran. Un code retiré de la
   configuration ne dit plus sa formule : la fiche la garde (la Tour y a posé celle du code en l'activant). `''` quand on
   ne sait rien — l'appelant garde la fiche. */
function formuleDuCode(code) {
  const c = String(code || '').trim().toUpperCase();
  const p = c ? (config.promos || []).find(x => String(x.code || '').trim().toUpperCase() === c) : null;
  return p ? (RANG_FORMULE.includes(p.formule) ? p.formule : 'premium') : '';
}
function formulePromo(e, code) {
  const r = Math.max(RANG_FORMULE.indexOf(e && e.formule), RANG_FORMULE.indexOf(formuleDuCode(code)));
  return r >= 0 ? RANG_FORMULE[r] : '';
}
/* Les places de la formule SERVIE. ⛔ Une formule servie qui n'est pas celle de la fiche vient forcément d'un abonnement
   d'APRÈS la bascule (ceux d'avant gardent la fiche, `formulePayee`) : c'est une formule CHANGÉE après la bascule, et ses
   abonnements d'avant ne prennent pas son multiplicateur — le même refus que pour une formule changée dans la Tour
   (`formuleDepuis`). Sans ça, un vieil abonnement Business valait 3 places dès qu'un abonnement Premium s'y ajoutait. */
function placesDeFormule(e, f, abos) {
  return placesStripe(Object.assign({}, e, { formule: f }, f !== e.formule ? { formuleDepuis: Date.now() } : {}), abos);
}
/* La formule servie et ses places, pour une entreprise dont un abonnement vivant est trouvé (`s`, rendu par
   `espaceStripe`). ⛔ MONTER au-dessus de la fiche se décide sur les abonnements SÛREMENT à elle, DESCENDRE seulement
   sans doute (voir `espaceStripe`) ; sinon la fiche reste. ⛔ Et monter ne retire jamais de places : une abonnée d'avant
   qui achète un abonnement d'une formule au-dessus garde au moins ce que sa fiche lui donnait (une Business × 5 d'avant
   perdait 4 places en achetant UN Business Premium — relecture adverse du 29 septembre, rejoué).
   ⛔ Une donnée de Stripe mal formée ne coupe pas une entreprise qui paie : la formule de la fiche reste, et les places
   retombent sur leur calcul d'avant (`placesServies`). */
function formuleEtPlaces(e, s) {
  try {
    const rangDe = x => (x === 'gratuit' ? -1 : RANG_FORMULE.indexOf(x));   // « gratuit » sous toutes les formules
    const rangFiche = rangDe(e && e.formule);
    const fs = formulePayee(e, s.surs || []);
    let f = null;
    if (fs !== null && (rangDe(fs) >= rangFiche || !(s.douteux || []).length)) f = fs;
    const fServie = f || e.formule;
    let places = placesDeFormule(e, fServie, s.memes || []);
    if (rangDe(fServie) > rangFiche) places = Math.max(places, placesStripe(e, s.memes || []));
    return { f, places };
  } catch (err) { console.error('espacePaye formule:', err.message); return { f: null, places: null }; }
}
/* ⛔⛔ LES OPTIONS DU PRO QUE L'ENTREPRISE A PAYÉES — UNE règle, lue par `espacePaye` (1er octobre 2026, Justin : « Plus cher »).
   Rend le tableau TRIÉ des clés servies. Une option n'est servie que si :
   · la formule SERVIE est le Pro (`f`) : Business et Business Premium ont tout, une période offerte est servie par `[]`
     (`periodeOfferte`) — l'application n'en déduit alors aucun verrouillage ;
   · ⛔ Stripe, et seulement les abonnements SÛREMENT à l'entreprise (`s.surs`, jamais l'option d'une voisine d'adresse) au
     statut PAYÉ (`active`, `trialing`) : un impayé d'option ne compte pas, il n'ouvre rien ;
   · ⛔ COUVERTURE STRICTE : pour une clé, la somme des quantités des lignes payées couvre les places que la formule sert. Une
     option payée pour deux personnes sur cinq n'ouvre pas la rubrique : l'application ne sait pas qui est de ces deux-là, et on ne
     perd pas d'argent (Justin) ;
   · réglée à la main dans la Tour (`manuelE`, l'entrée dont le réglage décide — `aboManuelDe`) : `e.options`, Stripe n'est pas lu,
     comme pour le reste du réglage. Les clés inconnues se jettent.
   Une option n'ajoute JAMAIS de place, ne fait JAMAIS passer une entreprise pour payée, ne lève AUCUNE suspension : elle ne se
   lit qu'une fois la formule décidée. */
function optionsServies(f, places, s, manuelE) {
  if (f !== 'pro') return [];
  if (manuelE) return OPTIONS_CLES.filter(k => Array.isArray(manuelE.options) && manuelE.options.includes(k)).sort();
  const n = Math.max(1, parseInt(places, 10) || 1);
  const payees = optionsPayeesQte(s);
  return OPTIONS_CLES.filter(k => (payees[k] || 0) >= n).sort();
}
/* combien de places chaque option a de PAYÉES chez Stripe : `{ cle: quantité }`, sur les abonnements SÛREMENT à l'entreprise et au
   statut payé — la lecture que `optionsServies` couvre contre les places, et que la page de paiement lit pour ne faire payer
   que ce qui MANQUE (un ajout d'option seule) */
function optionsPayeesQte(s) {
  const payees = {};
  for (const sb of (s && s.surs) || []) {
    if (!sb || !STATUTS_PAYES.includes(sb.status)) continue;
    for (const it of ((sb.items && Array.isArray(sb.items.data)) ? sb.items.data : [])) {
      const g = classerLigne(it);
      if (g.genre === 'option') payees[g.cle] = (payees[g.cle] || 0) + Math.max(0, parseInt(it && it.quantity, 10) || 0);
    }
  }
  return payees;
}
/* ⛔ LE CYCLE D'UNE OPTION QU'ON AJOUTE SEULE EST CELUI DU PRO QUE L'ENTREPRISE PAIE (index 0 mensuel, 1 annuel — l'ordre de
   `STRIPE_PRIX_FORMULE`), lu sur les abonnements SÛREMENT à elle au statut payé : les lignes Pro (par identifiant de tarif) et, pour un
   tarif qu'on ne sait pas lire (un abonnement d'avant la bascule), l'intervalle que Stripe déclare sur le tarif. Plusieurs cycles à la
   fois (un Pro au mois et un Pro à l'année) : celui qui porte le plus de places, à égalité le mensuel — jamais un choix du corps. */
function cycleDuPro(s) {
  const poids = [0, 0];
  for (const sb of (s && s.surs) || []) {
    if (!sb || !STATUTS_PAYES.includes(sb.status)) continue;
    for (const it of ((sb.items && Array.isArray(sb.items.data)) ? sb.items.data : [])) {
      const g = classerLigne(it);
      let c = -1;
      if (g.genre === 'formule' && g.rang === 0) c = STRIPE_PRIX_FORMULE.pro.indexOf(prixDeLigne(it));
      else if (g.genre === 'inconnu') { const iv = it && it.price && it.price.recurring && it.price.recurring.interval; c = iv === 'year' ? 1 : (iv === 'month' ? 0 : -1); }
      if (c >= 0) poids[c] += Math.max(1, parseInt(it && it.quantity, 10) || 0);
    }
  }
  return poids[1] > poids[0] ? 1 : 0;
}
/* les clés d'option d'une liste quelconque (réglage de la Tour) : seulement les connues, une fois chacune, dans l'ordre de la grille */
const optionsDeTour = l => OPTIONS_CLES.filter(k => Array.isArray(l) && l.includes(k));
/* ⛔ CE QUE STRIPE PORTE EN OPTIONS POUR UNE ENTREPRISE — pour la TOUR seulement (jamais pour l'application) : `[{ cle, quantite,
   statut }]`, les abonnements vivants OU impayés qui la désignent (mêmes règles de rattachement que le payé), une ligne par
   abonnement. Lu sur la dernière liste connue, sans appeler Stripe : une lecture de fond ne coûte rien et ne décide rien. */
function optionsLignesStripe(e) {
  const out = [];
  try {
    const liste = espStripeCache.data;
    if (!Array.isArray(liste) || !liste.length || !e) return out;
    const r = espaceStripeDans(e, liste, STATUTS_PAYES.concat(STATUTS_IMPAYES));
    for (const sb of (r && r.memes) || []) for (const it of ((sb.items && Array.isArray(sb.items.data)) ? sb.items.data : [])) {
      const g = classerLigne(it);
      if (g.genre === 'option') out.push({ cle: g.cle, quantite: Math.max(0, parseInt(it && it.quantity, 10) || 0), statut: String(sb.status || '') });
    }
  } catch (err) { /* un affichage : rien à décider */ }
  return out;
}
/* La formule SERVIE de l'entreprise d'une adresse — celle que « Mon espace » (le portail) montre et que son contrat nomme.
   Une adresse = une entreprise (Justin, 29 septembre 2026 : « ils feront une autre e-mail ») : si l'adresse en porte
   plusieurs, on ne choisit pas pour le client (rien), et le dossier dit ce que la Tour y a posé. Rien non plus tant que ce
   n'est pas payé (ni offert). Une LECTURE : aucun code ne s'active ici. */
/* l'entreprise d'une adresse et ce qu'`espacePaye` en dit — la lecture que « Mon espace » partage pour la formule ET pour les
   options (1er octobre 2026) : `null` quand on ne choisit pas pour le client (zéro ou plusieurs entreprises à cette adresse, une
   entreprise fermée) */
async function servieDe(mail) {
  const m = String(mail || '').trim().toLowerCase(); if (!m) return null;
  const ts = new Set();
  for (const s of Object.keys(espacesReg)) { const x = espacesReg[s];
    if (x && typeof x.email === 'string' && x.email.trim().toLowerCase() === m) { const t = espaceT(x); if (t) ts.add(String(t)); } }
  if (ts.size !== 1) return null;
  const e = espaceParT([...ts][0]);
  /* (une fiche SANS formule passe aussi : non payée, l'application est suspendue — le dossier le dit, Justin : « Suspend ») */
  if (!e || espaceFerme(espaceT(e))) return null;
  return { e, p: await espacePaye(e, { lecture: true }) };
}
/* ⛔ « Mon espace » dit les OPTIONS du Pro dans un champ À PART (`options`, des libellés) — jamais collées dans la chaîne de la
   formule, que le contrat nomme (`v.plan`). `null` : on ne sait pas, ou rien à dire — le dossier ne montre aucune ligne ; `[]` :
   suspendue, ou aucune option payée. Une LECTURE : rien ne s'écrit. */
async function optionsServiesDe(mail) {
  const sv = await servieDe(mail);
  if (!sv || !sv.p || sv.p.inconnu || sv.p.doute) return null;
  const { e, p } = sv;
  const f = p.paye ? (p.formuleServie || e.formule) : '';
  const tE = espaceT(e);
  if (accesSuspenduPar(p, f) || (espaceEstSuspendu(tE) && sursisJoursDe(tE) === 0)) return [];
  if (!Array.isArray(p.optionsServies)) return null;
  return OPTIONS_CLES.filter(k => p.optionsServies.includes(k)).map(k => OPTIONS_LBL[k]);
}
async function formuleServieDe(mail) {
  const sv = await servieDe(mail);
  if (!sv) return '';
  const { e, p } = sv;
  /* ⛔ un impayé (carte refusée) : « Mon espace » dit « Suspendu » — l'application a grisé les fonctions payantes, le dossier
     ne doit pas dire « Actif » à côté (`avecFormuleServie`, portail.js).
     ⛔ ET DEPUIS LE 30 SEPTEMBRE 2026, TOUT CE QUI N'EST PAS PAYÉ : l'application est suspendue jusqu'au règlement (plus de
     formule Gratuit) — le dossier disait « Actif » à une entreprise dont la période offerte était finie, ou « Gratuit ». */
  /* ⛔ dans le doute (Stripe ou registre des codes illisible), rien : le dossier garde ce que la Tour y a posé */
  if (!p || p.inconnu) return '';
  const f = p.paye ? (p.formuleServie || e.formule) : '';
  /* ⛔ la règle de `/api/espaces/etat`, UNE définition (`accesSuspenduPar`) : pas payé, bloqué, OU une formule que
     l'application ne connaît pas — l'application est suspendue, le dossier le dit */
  /* ⛔ … ET LA SUSPENSION POSÉE DANS LA TOUR, SURSIS ÉCOULÉ (seconde relecture de `gardien`, 30 septembre 2026) : payée
     mais suspendue par la Tour depuis sept jours, l'application est suspendue (`sursisJours:0` → `accesSuspendu`) — le
     dossier ne peut pas dire « Pro » à côté */
  const tE = espaceT(e);
  if (accesSuspenduPar(p, f) || (espaceEstSuspendu(tE) && sursisJoursDe(tE) === 0)) return { statut: 'suspendu' };
  return FORMULE_LBL2[f] || '';
}
function placesStripe(e, abos) {
  const f = e && e.formule, rang = RANG_FORMULE.indexOf(f);
  const sesPrix = rang < 0 ? [] : RANG_FORMULE.slice(rang).reduce((l, k) => l.concat(STRIPE_PRIX_FORMULE[k]), []);
  const avantB = aboAvantBascule, prixDe = prixDeLigne, estMessages = ligneMessages;
  /* un abonnement d'AVANT a pu être pris par un ancien lien de paiement (autre tarif) : il compte, sauf OP MESSAGES ;
     un abonnement d'APRÈS ne compte que s'il est au tarif de la formule */
  /* ⛔ une option n'ajoute AUCUNE place, même sur un abonnement d'avant la bascule (`classerLigne`) : les places se paient par la
     formule, une option se compte sur les places que la formule donne déjà */
  const compte = sb => ((sb.items && sb.items.data) || []).reduce((n, it) =>
    n + ((avantB(sb) ? (!estMessages(it) && classerLigne(it).genre !== 'option') : sesPrix.includes(prixDe(it))) ? Math.max(0, parseInt(it && it.quantity, 10) || 0) : 0), 0);
  const m = PLACES_AVANT[f];
  /* la FORMULE d'avant décide du multiplicateur (`formuleDepuis`, posé quand la formule CHANGE : passée de Business à
     Business Premium après la bascule, un abonnement Business ne vaut pas 3) ; le NOMBRE réglé dans la Tour ne sert de
     plancher que s'il n'a pas bougé depuis, et s'il ne vient pas d'une demande tapée (`gardien`, A2, A3 et sa suite :
     relever le nombre après la bascule retirait les places d'avant) */
  const formuleAvant = !e.formuleDepuis || e.formuleDepuis < PLACES_BASCULE;
  const payaitAvant = !!m && formuleAvant && !placesPromoDejaEu(e) && abos.some(avantB);
  const nombreAvant = !e.formuleTs || e.formuleTs < PLACES_BASCULE;
  const qFiable = nombreAvant && !/^auto\b/i.test(String(e.formulePar || ''));
  /* qui payait avant : ses abonnements d'avant valent ce que la v760 donnait (2 ou 3 par abonnement — le nombre réglé
     dans la Tour, ou ce qu'elle payait si c'est plus), et ceux d'après s'y AJOUTENT, un par abonnement */
  const avant = payaitAvant ? m * Math.max(qFiable ? placesQ(e) : 1, Math.min(50, abos.filter(avantB).reduce((n, sb) => n + compte(sb), 0))) : 0;
  const autres = abos.filter(sb => !(payaitAvant && avantB(sb))).reduce((n, sb) => n + compte(sb), 0);
  return Math.max(1, Math.min(150, avant + Math.min(50, autres)));
}
function placesServies(e, p) {
  const q = placesQ(e);
  if (!p || !p.paye || p.promoCode || p.doute) return q;
  if (p.placesStripe != null) return p.placesStripe;
  const m = PLACES_AVANT[e.formule];
  const depuis = e.aboDepuis != null ? e.aboDepuis : (e.aboTs || 0);   // depuis quand elle paie (voir la route « abonnement »)
  if (m && e.aboStatut === 'actif' && depuis < PLACES_BASCULE && (!e.formuleTs || e.formuleTs < PLACES_BASCULE)
    && !placesPromoDejaEu(e)) return Math.min(150, q * m);
  return q;
}
console.log('Places : bascule « 1 compte par abonnement » au', new Date(PLACES_BASCULE).toISOString());   // une valeur surprise se voit au démarrage
// liste complète des espaces (formule attribuée, payé/promo) — pour l'onglet Abonnements de la Tour
app.get('/api/monitor/espaces/liste', monAdmin, async (req, res) => {
  const sortie = [];
  for (const [slug, e0] of Object.entries(espacesReg)) {
    const e = facturationDe(e0);   // la ligne entière dit la facturation de l'ENTREPRISE (formule, nombre, places, réglage)
    let p = { paye: false, motif: '' };
    /* ⛔ `Object.assign({ slug }, e)` ET PAS `e` : l'entrée brute du registre NE PORTE PAS de
       champ `slug` (la ligne qui l'écrit ne le pose pas), alors qu'`espacePaye()` rattache un
       abonnement Stripe par `[e.slug, e.t]`. Seul `/api/espaces/etat` passait une entrée
       enrichie, via `espaceParT()` : la Tour, elle, rattachait par le `t` seul. Le jour où la
       référence gravée vaut le SLUG, l'application dirait « payé » et la Tour « impayé »,
       sur la même entreprise, au même instant — et on chercherait du côté de Stripe. */
    try { p = await espacePaye(Object.assign({ slug }, e), { lecture: true }); } catch (err) {}   // une LISTE n'active aucun code
    sortie.push({ slug, nom: e.nom || slug, email: e.email || '', formule: e.formule || '', formuleServie: p.formuleServie || e.formule || '', quantite: e.quantite || 1, places: placesServies(e, p),
      /* `inconnu` : on ne SAIT pas (Stripe muet, registre illisible — `payeInconnu`) ; `paye` y vaut vrai pour ne couper
         personne, et la Tour disait « payé » — elle dit désormais « non vérifiable » (relecture de la poussée, 30 septembre 2026) */
      paye: p.paye, inconnu: !!p.inconnu, motif: p.motif, promoCode: p.promoCode || '', finLe: p.finLe || '', echeance: p.echeance || '', attribueLe: e.formuleTs || 0, par: e.formulePar || '',
      /* carte refusée : les fonctions payantes sont bloquées jusqu'au règlement (`bloque`) ; `impayeStripe` : il vient d'un
         abonnement Stripe (la Tour le montre déjà par sa ligne Stripe — sinon réglé à la main) ; `impayesPartiels` : des
         abonnements refusés parmi d'autres payés (leurs places ne sont pas servies) */
      impaye: !!p.bloque, impayeStripe: !!p.impayeStripe, impayesPartiels: p.impayesPartiels || 0,
      // qui a ouvert l'espace et quand : la Tour en a besoin pour lister les accès publics
      ouvertLe: e.ts || 0, ouvertPar: e.par || '', t: espaceT(e), resume: cnxResume(espaceT(e)),
      /* Deux états que la Tour ne pouvait pas connaître : un accès coupé ressemblait à un accès
         ouvert, et rien ne disait si l'entreprise savait déjà se connecter sans son lien. */
      suspendu: entFermes.espaces.includes(espaceT(e)),
      /* Quelles applications sont OUVERTES à cette entreprise (décidé), à ne pas confondre avec
         celles qu'elle utilise vraiment — celles-là se lisent dans « resume.apps ».
         On lit l'entrée EFFECTIVE (espaceAJour), pas l'entrée brute de la boucle : un espace
         porte plusieurs noms, et lire chacun séparément affichait le même espace « ouvert » sur
         une ligne et « fermé » sur l'autre. Les autres champs passent déjà par espaceT(e). */
      opMessages: !!((espaceAJour(slug) || e).opMessages),
      /* Un accès coupé d'ici se rouvre ; une entreprise fermée définitivement, non. Les
         confondre à l'écran ferait cliquer « Rouvrir » sur une fermeture, et croire à un bogue
         quand le serveur refuse. */
      ferme: espaceFerme(espaceT(e)),
      /* Repli pour les entrées d'avant « origine » : une adresse connue du fichier clients
         est une entreprise inscrite sur le site ; les autres sont des accès ouverts d'ici.
         Ce n'est qu'un repli — dès qu'un espace est réenregistré, le champ fait foi. */
      origine: e.origine || ((e.email && clientsData[String(e.email).toLowerCase()]) ? 'site' : 'tour'),
      annuaire: (() => { const a = comptesReg[espaceT(e)]; return (a && a.c) ? Object.keys(a.c).length : 0; })(),
      /* L'identifiant de départ vit DÉJÀ dans le code de l'espace (champ « a »). La Tour le
         redemandait à chaque fois et proposait « admin » par défaut, alors que le serveur l'a
         sous la main : elle n'a plus à deviner. Le mot de passe, lui, n'y est pas — seulement
         son empreinte, et c'est voulu.
         Au PATRON seulement : cette route est ouverte aux collaborateurs, et le commentaire
         d'/api/espaces/lien promet que cet identifiant ne sort que contre une preuve de
         possession de la clé d'équipe. Le servir plus largement ferait mentir cette promesse,
         pour un champ qui n'alimente qu'une action réservée au patron. */
      ident: (req.tourUser && req.tourUser.role === 'patron')
        ? (() => { try { return String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).a || ''); } catch (err) { return ''; } })()
        : '',
      aboStatut: e.aboStatut || 'auto', aboFin: e.aboFin || '',
      /* les options du Pro : celles qui sont SERVIES (`optionsServies`), celles réglées à la main, et les lignes d'option que Stripe
         porte pour elle (clé, quantité, statut) — la Tour montre le détail que l'application, elle, ne lit pas */
      optionsServies: Array.isArray(p.optionsServies) ? p.optionsServies : [], options: optionsDeTour(e.options), optionsStripe: optionsLignesStripe(Object.assign({ slug }, e)) });
  }
  sortie.sort((a, b) => (b.attribueLe || 0) - (a.attribueLe || 0));
  res.json({ ok: true, espaces: sortie });
});
// statut complet d'un espace, côté contrôle
app.post('/api/monitor/espaces/statut', monAdmin, async (req, res) => {
  const slug = espSlug(monStr((req.body || {}).nom, 80));   // borné : voir /api/espaces/ouvrir
  if (!espacesReg[slug]) return res.status(404).json({ error: 'Espace inconnu — génère d\'abord son lien de connexion' });
  const e = facturationDe(espacesReg[slug]);   // la fiche montre la facturation de l'ENTREPRISE : c'est elle que la Tour règle
  const p = await espacePaye(Object.assign({ slug }, e), { lecture: true });   // le slug n'est pas dans l'entrée — voir /liste ; une LECTURE n'active aucun code
  res.json({ ok: true, formule: e.formule || '', formuleServie: p.formuleServie || e.formule || '', promoCode: p.promoCode || '', quantite: e.quantite || 1, places: placesServies(e, p), email: e.email || '', paye: p.paye, inconnu: !!p.inconnu, motif: p.motif, aboStatut: e.aboStatut || 'auto', aboFin: e.aboFin || '', finLe: p.finLe || '', metier: metierOk(e.metier),
    impaye: !!p.bloque, impayeStripe: !!p.impayeStripe, impayesPartiels: p.impayesPartiels || 0,
    optionsServies: Array.isArray(p.optionsServies) ? p.optionsServies : [], options: optionsDeTour(e.options), optionsStripe: optionsLignesStripe(Object.assign({ slug }, e)) });
});
// ── Activité par onglet (anonyme : noms d'écrans + compteurs, par espace) ──
const USAGE_PATH = path.join(DATA_DIR, 'usage.json');
let usageData = {}; try { usageData = JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8')); } catch (e) {}
let usageTimer = null;
function usageSave() { clearTimeout(usageTimer); usageTimer = setTimeout(() => { try { fs.writeFileSync(USAGE_PATH, JSON.stringify(usageData)); } catch (e) {} }, 800); }
app.post('/api/usage', (req, res) => {
  const b = req.body || {};
  const t = monStr(b.t, 80); if (!t) return res.status(400).json({ error: 't requis' });
  /* Un espace supprimé ne se laisse pas ressusciter par un appareil resté hors ligne :
     sans ce garde-fou, il réapparaît avec les identifiants et les noms de ses salariés.
     On répond ok — l'appareil n'a rien fait de mal, et /api/espaces/etat lui dira de se
     vider — mais on n'écrit RIEN. */
  if (espaceFerme(t)) return res.json({ ok: true, ferme: true });
  const vues = (b.vues && typeof b.vues === 'object' && !Array.isArray(b.vues)) ? b.vues : {};
  if (Object.keys(usageData).length >= 3000 && !usageData[t]) return res.json({ ok: true });
  const u = usageData[t] = usageData[t] || { vues: {}, total: 0, dernier: 0, version: '' };
  let n = 0;
  for (const [k, v] of Object.entries(vues)) {
    if (n++ > 80) break;
    const key = monStr(k, 30).replace(/[^a-zA-Z0-9]/g, ''); const q = Math.min(500, parseInt(v, 10) || 0);
    if (!key || q <= 0) continue;
    if (Object.keys(u.vues).length >= 80 && !u.vues[key]) continue;
    u.vues[key] = (u.vues[key] || 0) + q; u.total += q;
  }
  u.dernier = Date.now(); u.version = monStr(b.version, 12) || u.version;
  usageSave(); res.json({ ok: true });
});
// la Tour lit l'activité par onglet d'une entreprise, et ses problèmes ouverts
/* ══ LE DOSSIER D'UNE ENTREPRISE — tout ce qu'on sait d'elle, en un seul appel ═══════════
   Jusqu'ici il fallait ouvrir quatre écrans pour se faire une idée d'un client : son
   activité ici, ses connexions là, ses erreurs dans un journal protégé par une AUTRE clé
   que la session de la Tour (donc invisible depuis la console), son code promo nulle part.
   On jugeait donc une entreprise sur des morceaux, et on ratait le principal : ses bugs.

   Cette route rend le dossier complet pour UNE entreprise. Elle ne rend rien de plus que ce
   que la Tour affiche déjà ailleurs — même niveau d'accès (monAdmin), pas de nouvelle
   divulgation : c'est un regroupement, pas une ouverture. Tout est borné pour que la
   réponse reste lisible : 25 erreurs, 40 connexions, 12 écrans les plus vus. */
app.post('/api/monitor/entreprise/dossier', monAdmin, (req, res) => {
  const nom = monStr((req.body || {}).nom, 80);
  const slug = espSlug(nom);
  const e = espacesReg[slug];
  if (!e) return res.status(404).json({ error: 'Espace inconnu — génère d\'abord son lien de connexion' });
  let t = e.t; try { if (!t) t = String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t || ''); } catch (err) {}
  if (!t) return res.status(404).json({ error: 'Espace sans identifiant technique' });

  // ── Ce qu'ils utilisent
  const u = usageData[t] || { vues: {}, total: 0, dernier: 0, version: '' };
  const vues = Object.entries(u.vues || {}).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => ({ vue: k, n: v }));

  // ── Qui se connecte, et qui n'y arrive pas
  const evts = (cnxData[t] || []).slice(0, 40).map(x => ({
    ts: x.ts, ev: x.ev, login: x.login || '', role: x.role || '', version: x.version || '',
    app: x.app || '', via: x.via || '', motif: x.motif || '', appareil: x.appareil || x.dev || ''
  }));
  /* Les échecs de connexion sont sortis à part : c'est le signal « quelqu'un chez eux
     n'arrive pas à entrer », et c'est exactement ce qu'on veut voir sans fouiller. */
  const echecs = evts.filter(x => x.ev === 'echec').slice(0, 15);

  // ── Ce qui plante chez eux. Le journal des bugs est indexé par teamId : on le filtre.
  let erreurs = [];
  try {
    erreurs = fs.readFileSync(BUGS_PATH, 'utf8').trim().split('\n')
      .map(l => { try { return JSON.parse(l); } catch (err) { return null; } })
      /* Même filigrane que la pastille. Sans ça la fiche dirait « 0 erreur » en haut et en
         listerait 25 juste en dessous — pire que de ne rien remettre à zéro. */
      .filter(b => b && b.team === t && (+b.ts || 0) > zeroDe(t))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 25)
      .map(b => ({ ts: b.ts, app: b.app, version: b.version, msg: b.msg, src: b.src, line: b.line, ua: b.ua }));
  } catch (err) {}

  // ── Formule offerte par code promo : elle ne passe pas par Stripe, donc elle n'apparaît
  //    dans aucun écran d'abonnement. Sans elle, on croit le client « sans formule ».
  const aujourdhui = new Date().toISOString().slice(0, 10);
  let promo = null;
  for (const [code, us] of Object.entries(promoUsages || {})) {
    const x = us && us.equipes && us.equipes[t];
    if (x && x.finLe) { const actif = x.finLe >= aujourdhui; if (actif || !promo) promo = { code, depuis: x.date || '', finLe: x.finLe, actif }; if (actif) break; }
  }

  /* ── QUI TRAVAILLE CHEZ EUX ──
     Deux sources, et aucune ne suffit seule. L'annuaire (comptesReg) liste les identifiants
     qui PEUVENT se connecter — mais rien d'autre : ni nom, ni rôle. C'est voulu, un annuaire
     de connexion n'est pas un fichier du personnel. Les connexions (cnxData), elles, disent
     qui s'est connecté RÉELLEMENT, avec quel rôle, quelle version et depuis combien
     d'appareils. On croise les deux : on obtient la liste des comptes, et pour chacun s'il
     s'en sert ou pas. Un identifiant qui n'a jamais servi est une information — c'est souvent
     un compte oublié, ou quelqu'un qui n'arrive pas à entrer. */
  const annu = (comptesReg[t] && comptesReg[t].c) || {};
  const parLogin = {};
  /* `provisoire` / `mail` viennent de l'annuaire, déposé par l'application (v681) : un compte
     encore sur son mot de passe provisoire, ou sans adresse de récupération, est exactement
     celui qui appellera le patron un matin. Un annuaire déposé par une version ANTÉRIEURE ne
     porte ni l'un ni l'autre — d'où `null`, « on ne sait pas », qui ne doit pas s'afficher
     comme « tout va bien ». */
  /* `hasOwnProperty` et pas `a[k]` nu : c'est la discipline du reste du fichier pour tout ce
     qui vient d'un annuaire, et le commentaire de la route de connexion dit pourquoi elle a
     été payée cher. Signalé par `gardien`, 15 septembre 2026. */
  const etatBool = (a, k) => (a && Object.prototype.hasOwnProperty.call(a, k)) ? !!a[k] : null;
  for (const l of Object.keys(annu)) parLogin[l] = { login: l, dansAnnuaire: true, nom: (annu[l] && annu[l].n) || '', provisoire: etatBool(annu[l], 'p'), mail: etatBool(annu[l], 'm'), attente: ordreAttente(t, l), supprime: ordreFait(t, l), derniere: 0, role: '', version: '', appareils: 0, echecs: 0, connexions: 0 };
  const devs = {};
  for (const x of (cnxData[t] || [])) {
    const l = String(x.login || '').toLowerCase().trim(); if (!l) continue;
    /* `provisoire`/`mail` à null EXPLICITEMENT : sans eux, `JSON.stringify` omet les clés et le
       client reçoit `undefined` là où l'autre branche rend `null` — deux « on ne sait pas »
       différents dans la même réponse, et le jour où un écran teste l'un et pas l'autre, il se
       trompe. Un identifiant vu seulement dans le journal des échecs n'est dans aucun annuaire :
       on ne sait rien de son mot de passe, et c'est ce qu'on dit. */
    const o = parLogin[l] || (parLogin[l] = { login: l, dansAnnuaire: false, nom: '', provisoire: null, mail: null, attente: ordreAttente(t, l), supprime: ordreFait(t, l), derniere: 0, role: '', version: '', appareils: 0, echecs: 0, connexions: 0 });
    if (x.ev === 'echec') { o.echecs++; continue; }
    if (x.ev === 'bloque' || x.ev === 'refus') { o.bloques = (o.bloques || 0) + 1; continue; }   // la porte a joué : ce n'est ni une connexion ni un échec de mot de passe
    o.connexions++;
    if ((x.ts || 0) > o.derniere) { o.derniere = x.ts || 0; o.role = x.role || o.role; o.version = x.version || o.version; if (x.nom) o.nom = x.nom; }
    if (x.dev) { (devs[l] = devs[l] || new Set()).add(x.dev); }
  }
  for (const l of Object.keys(parLogin)) parLogin[l].appareils = devs[l] ? devs[l].size : 0;
  const utilisateurs = Object.values(parLogin).sort((a, b) => (b.derniere || 0) - (a.derniere || 0)).slice(0, 60);
  /* ⛔ ET ON RETIRE VRAIMENT LES CHAMPS, on ne se contente pas d'un drapeau que l'écran
     respecterait. Un drapeau, c'est une politique côté client : la réponse porterait quand
     même l'information, et il suffirait de la lire. */
  const voitEtat = !!(req.tourUser && req.tourUser.role === 'patron');
  if (!voitEtat) utilisateurs.forEach(u => { delete u.provisoire; delete u.mail; });

  res.json({
    ok: true, t, slug,
    espace: { nom: e.nom || slug, formule: e.formule || '', opMessages: !!e.opMessages, suspendu: entFermes.espaces.includes(t) },
    usage: { total: u.total || 0, dernier: u.dernier || 0, version: u.version || '', vues },
    connexions: { resume: cnxResume(t), evenements: evts, echecs },
    utilisateurs, erreurs, promo,
    /* ⛔ L'ÉTAT DES MOTS DE PASSE NE SORT QUE POUR LE PATRON. Cette route est sous `monAdmin`,
       donc un collaborateur de la Tour la lit aussi — et `provisoire:true` sur un compte qui a
       DÉJÀ servi est une information qu'il n'avait pas : le mot de passe provisoire se dérive
       du nom (`tour.html`), et `/api/espaces/connexion` est publique. Sans ça, il fallait
       essayer, donc laisser des échecs au compteur ; avec ça, on sait sans essayer. Signalé
       par `gardien`, 15 septembre 2026. Le drapeau dit à la Tour de ne RIEN afficher plutôt
       que d'afficher « on ne sait pas » — un écran qui se tait est honnête, un écran qui dit
       « inconnu » à quelqu'un qui n'a simplement pas le droit de savoir, non. */
    etatComptes: voitEtat,
    sauvegarde: { n: sauvListe(t).length, derniere: (sauvListe(t)[0] || 0), possible: !!(espaceParT(t) && espaceParT(t).code) },
    /* ⛔ `estSuppr` ici aussi : un ordre de mot de passe n'a pas de champ `banni`, donc
       `undefined !== false` le faisait entrer dans la liste des BANNIS. Le patron refaisait un
       mot de passe et voyait la personne apparaître comme supprimée. C'était la troisième
       catastrophe du typage, sur la seule ligne que le diff n'avait pas visitée. */
    bannis: (ordresData[t] || []).filter(o => estSuppr(o) && o.banni !== false).map(o => ({ login: o.login, ts: o.ts, fait: o.fait || 0, par: o.par || '' })),
    /* Un mot de passe en attente se DIT, lui aussi : sinon le gel d'annuaire serait invisible. */
    mdpAttente: (ordresData[t] || []).filter(o => o && o.type === 'mdp' && !o.fait && (o.ts || 0) > Date.now() - ORDRE_MDP_VIE).map(o => ({ login: o.login, ts: o.ts, par: o.par || '' }))
  });
});

app.post('/api/monitor/espaces/activite', monAdmin, (req, res) => {
  const slug = espSlug(monStr((req.body || {}).nom, 80));   // borné : voir /api/espaces/ouvrir
  const e = espacesReg[slug];
  if (!e) return res.status(404).json({ error: 'Espace inconnu — génère d\'abord son lien de connexion' });
  let t = e.t; try { if (!t) t = String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t || ''); } catch (err) {}
  const u = usageData[t] || { vues: {}, total: 0, dernier: 0, version: '' };
  const vues = Object.entries(u.vues).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => ({ vue: k, n: v }));
  const bugs = (monIssues || []).filter(i => i.statut !== 'corrige' && i.statut !== 'ignore' && (i.entreprises || []).some(x => x.nom === e.nom)).length;
  res.json({ ok: true, vues, total: u.total, dernier: u.dernier, version: u.version, bugs });
});
// ── Connexions des applications, par espace : qui se connecte, quand, depuis quel appareil,
//    avec quelle version, par quel chemin (lien, nom d'entreprise, session gardée) — et les
//    échecs. L'application envoie un événement à chaque connexion ; la Tour lit le tout. ──
const CNX_PATH = path.join(DATA_DIR, 'connexions.json');
let cnxData = {}; try { cnxData = JSON.parse(fs.readFileSync(CNX_PATH, 'utf8')); } catch (e) {}
let cnxTimer = null;
function cnxSave() { clearTimeout(cnxTimer); cnxTimer = setTimeout(() => { try { fs.writeFileSync(CNX_PATH, JSON.stringify(cnxData)); } catch (e) {} }, 800); }
app.post('/api/connexions', (req, res) => {
  const b = req.body || {};
  const t = monStr(b.t, 80); if (!t) return res.status(400).json({ error: 't requis' });
  /* Un espace supprimé ne se laisse pas ressusciter par un appareil resté hors ligne :
     sans ce garde-fou, il réapparaît avec les identifiants et les noms de ses salariés.
     On répond ok — l'appareil n'a rien fait de mal, et /api/espaces/etat lui dira de se
     vider — mais on n'écrit RIEN. */
  if (espaceFerme(t)) return res.json({ ok: true, ferme: true });
  if (Object.keys(cnxData).length >= 3000 && !cnxData[t]) return res.json({ ok: true });
  const ev = { ts: Date.now(), ev: ['connexion', 'echec', 'session', 'deconnexion', 'bloque', 'refus'].includes(b.ev) ? b.ev : 'connexion',
    login: monStr(b.login, 40), nom: monStr(b.nom, 60), role: monStr(b.role, 16), version: monStr(b.version, 12), app: monStr(b.app, 12) || 'gestion',
    via: monStr(b.via, 16), appareil: monStr(b.appareil, 20), os: monStr(b.os, 20), nav: monStr(b.nav, 20), pwa: !!b.pwa,
    dev: monStr(b.dev, 24), motif: monStr(b.motif, 80) };
  const l = cnxData[t] = cnxData[t] || [];
  l.unshift(ev); if (l.length > 500) l.length = 500;
  cnxSave(); res.json({ ok: true });
});
/* Effacer les tentatives sur des identifiants qui n'existent pas — ELAN, 9 septembre 2026.
   Cinq identifiants tapés pendant la panne (zampa, admin, antho13…) restaient affichés dans le
   dossier de l'entreprise comme des utilisateurs : ils n'étaient que des échecs de connexion
   dans ce journal. Le patron les efface d'ici. Seuls les identifiants ABSENTS de l'annuaire sont
   touchés : les échecs d'un vrai compte sont une information (mot de passe oublié), on les garde. */
/* Remettre à zéro les compteurs d'un espace. Réservé au patron : c'est un geste qui change ce
   que TOUT LE MONDE lit ensuite sur cette fiche. Il ne détruit rien — voir ZERO_PATH. */
app.post('/api/monitor/espaces/compteurs-zero', monPatronStrict, (req, res) => {
  const b = req.body || {};
  const t = monStr(b.t, 80).trim();
  if (!t) return res.status(400).json({ error: 't requis' });
  /* « Annuler » retire le filigrane et rend tout l'historique : une remise à zéro faite sur la
     mauvaise fiche doit pouvoir se défaire, sinon personne n'ose s'en servir. */
  const annuler = !!b.annuler;
  const avant = compteursZero[t];
  if (annuler) delete compteursZero[t]; else compteursZero[t] = Date.now();
  if (!zeroEcrire()) { if (avant === undefined) delete compteursZero[t]; else compteursZero[t] = avant;
    return res.status(500).json({ error: 'Rien n\'a été enregistré — réessaie.' }); }
  console.log('Tour :', req.tourUser.nom, (annuler ? 'annule la remise à zéro' : 'remet à zéro les compteurs'), 'de l\'espace', t);
  res.json({ ok: true, depuis: compteursZero[t] || 0 });
});
app.post('/api/monitor/connexions/effacer-tentatives', monPatronStrict, (req, res) => {
  const b = req.body || {};
  const t = monStr(b.t, 80); if (!t) return res.status(400).json({ error: 't requis' });
  const voulus = Array.isArray(b.logins) ? b.logins.map(x => monStr(x, 40).toLowerCase().trim()).filter(Boolean).slice(0, 100) : [];
  if (!voulus.length) return res.status(400).json({ error: 'logins requis' });
  const annu = (comptesReg[t] && comptesReg[t].c) || {};
  const cibles = new Set(voulus.filter(l => !Object.prototype.hasOwnProperty.call(annu, l)));
  const gardes = voulus.filter(l => !cibles.has(l));
  const avant = (cnxData[t] || []).length;
  cnxData[t] = (cnxData[t] || []).filter(x => !(x.ev === 'echec' && cibles.has(String(x.login || '').toLowerCase().trim())));
  const n = avant - cnxData[t].length;
  if (n) cnxSave();
  monLog((req.tourUser && req.tourUser.nom) || 'patron', true, req, 'tentatives effacées : ' + n);   // ni identifiant ni espace : rien de personnel au journal
  res.json({ ok: true, effacees: n, ignores: gardes });
});
/* ══ LES ORDRES DE LA TOUR — supprimer un compte depuis la Tour (Justin, 10 septembre 2026) ══
   La base d'une entreprise est chiffrée : ce serveur ne peut pas y retirer un compte. La Tour
   ORDONNE — après un code reçu par mail, « pour éviter l'erreur » — et le premier appareil de
   l'entreprise qui s'ouvre EXÉCUTE, puis confirme. Entre les deux, la porte est déjà fermée :
   l'identifiant sort de l'annuaire et n'y rentre plus tant que l'ordre est en attente. */
const ORDRES_PATH = path.join(DATA_DIR, 'ordres.json');
let ordresData = {};
try { ordresData = JSON.parse(fs.readFileSync(ORDRES_PATH, 'utf8')) || {}; } catch (e) {}
/* Un ordre que personne n'a exécuté en 30 jours : l'entreprise n'ouvre plus l'application, ou le
   compte n'existe plus nulle part — dans les deux cas il n'a plus rien à faire ici. */
/* Relecture du gardien, 10 septembre 2026 : l'acquittement vient d'un appareil qui détient la clé
   d'équipe — y compris celui de la personne qu'on supprime. Il ne peut donc rien ROUVRIR : un
   identifiant supprimé depuis la Tour reste banni de l'annuaire tant que le patron ne le
   réautorise pas, et l'ordre continue d'être servi sept jours après le premier acquittement,
   pour que chaque appareil l'exécute (supprimer un compte absent ne coûte rien). */
/* ⛔ Un ordre de mot de passe SANS empreinte ne vaut rien et serait pire que rien : l'application
   poserait `pwdHash: undefined` et le compte deviendrait inconnectable. On le jette au chargement
   plutôt que de le servir. */
/* ⛔ ET UN ORDRE DE MOT DE PASSE A UNE DURÉE DE VIE. Trouvé par `gardien` le 15 septembre 2026,
   avant déploiement, et c'était le défaut structurel de la livraison : `ordreMdpAttente` n'avait
   AUCUNE borne, et les appareils déjà déployés ne savent pas acquitter un ordre de ce type. Un
   ordre restait donc `fait:0` pour toujours, l'annuaire restait gelé sur l'empreinte de la Tour
   pour toujours, et la personne se retrouvait coincée des DEUX côtés — la page d'entrée voulant
   le mot de passe neuf, l'application l'ancien, et l'administrateur incapable de rien y changer
   puisque son dépôt était gelé. Sans issue, et sans que rien ne le signale.
   Trente jours, donc : passé ce délai l'ordre disparaît, le gel tombe, et l'entreprise reprend
   la main sur son annuaire. Un dépannage qui n'a pas abouti en un mois n'aboutira pas. */
const ORDRE_MDP_VIE = 30 * 86400000;
/* La version de l'application qui sait EXÉCUTER un ordre de mot de passe. Le serveur refuse
   d'en poser un tant que le minimum exigé du parc est en dessous — voir /api/monitor/comptes/mdp. */
const MDP_ORDRE_VER_MIN = 691;
{
  const lim = Date.now() - ORDRE_MDP_VIE;
  let jete = 0;
  for (const t of Object.keys(ordresData)) {
    const avant = (ordresData[t] || []).length;
    ordresData[t] = (ordresData[t] || []).filter(o => {
      if (!o || !o.login) return false;
      if (o.type !== 'mdp') return true;
      /* Une empreinte qui n'en est pas une poserait `pwdHash: undefined` sur la fiche : le
         compte deviendrait inconnectable. Et passé la péremption, l'ordre ne vaut plus rien. */
      if (!/^[0-9a-f]{64}$/.test(String(o.h || ''))) return false;
      /* Un ordre ACQUITTÉ n'a plus de secret à porter : `/api/espaces/ordre-fait` efface `h`.
         S'il en reste un, c'est un fichier d'avant cette version — on l'efface ici aussi. */
      if (o.fait) { delete o.h; return true; }
      return (o.ts || 0) > lim;
    }).slice(-500);
    jete += avant - ordresData[t].length;
    if (!ordresData[t].length) delete ordresData[t];
  }
  /* ⛔ ET ON RÉÉCRIT LE FICHIER TOUT DE SUITE. Purger en mémoire seulement laissait les
     empreintes périmées DORMIR SUR LE DISQUE jusqu'à la prochaine écriture — c'est-à-dire
     peut-être des mois. Pour des identifiants c'était sans conséquence ; pour un équivalent de
     mot de passe, c'est la différence entre un fichier de traces et une réserve de secrets. */
  if (jete) { ordresSave(); console.log('ordres : ' + jete + ' ordre(s) périmé(s) ou invalide(s) retiré(s)'); }
}
/* ══ DEUX SORTES D'ORDRES, ET IL A FALLU TYPER AVANT D'EN AJOUTER UNE ═══════════════════════
   Jusqu'au 15 septembre 2026 `ordres.json` ne portait qu'une chose : « supprime ce compte ».
   Les cinq fonctions ci-dessous filtraient donc par IDENTIFIANT SEUL. Y glisser un ordre d'une
   autre nature sans les toucher aurait produit trois catastrophes silencieuses, dans cet ordre
   de gravité :
     1. `ordresServis` rend une liste de logins que l'application SUPPRIME. Une application déjà
        déployée (v690 et avant) ne connaît pas les types : elle aurait effacé le compte dont on
        voulait seulement refaire le mot de passe.
     2. `ordreBanni` ferme la porte de l'annuaire. Le compte aurait été mis DEHORS — l'exact
        contraire de ce que le bouton promet.
     3. `ordreAttente` / `ordreFait` auraient affiché « suppression en attente » dans la Tour, et
        refusé une vraie suppression au motif qu'elle était « déjà en cours ».
   ⛔ `estSuppr` est donc la SEULE définition de « cet ordre est une suppression », et un ordre
   sans `type` en est une — c'est ce qui rend les lignes déjà écrites dans `ordres.json` lisibles
   sans migration. Toute troisième sorte d'ordre devra passer par ici, ou n'existera pas. */
function estSuppr(o) { return !!o && o.type !== 'mdp'; }
function ordreBanni(t, login) { return (ordresData[t] || []).some(o => estSuppr(o) && o.login === login && o.banni !== false); }
function ordresServis(t) { const lim = Date.now() - 7 * 86400000; return (ordresData[t] || []).filter(o => estSuppr(o) && o.banni !== false && (!o.fait || o.fait > lim)).map(o => o.login); }
/* ⛔ `h` N'EST PAS UN IDENTIFIANT, C'EST LE MOT DE PASSE. `/api/espaces/connexion` lit `b.h`
   DIRECTEMENT du corps de la requête et le compare par PBKDF2 : connaître `h`, c'est pouvoir
   entrer. `ordres.json` — un fichier qui ne portait jusqu'ici que des identifiants — devient
   donc un entrepôt de secrets utilisables, et il faut le traiter comme tel :
     · servi UNIQUEMENT tant que l'ordre n'est pas acquitté (contrairement aux suppressions, qui
       se rediffusent sept jours : supprimer un compte absent ne coûte rien, rediffuser un mot de
       passe déjà posé, si) ;
     · effacé du fichier dès l'acquittement (voir /api/espaces/ordre-fait).
   Un appareil qui dormait ne perd rien : la fiche lui arrive par la SYNCHRO, comme tout le reste.
   (Signalé par `gardien` le 15 septembre 2026.) */
function ordresMdp(t) {
  return (ordresData[t] || []).filter(o => o && o.type === 'mdp' && !o.fait && /^[0-9a-f]{64}$/.test(String(o.h || ''))).map(o => ({ login: o.login, h: o.h })); }
/* Le gel d'annuaire ne dure que tant que l'ordre est VIVANT : ni acquitté, ni périmé. Sans la
   borne de temps, un ordre que personne n'exécute enfermerait le compte pour toujours. */
function ordreMdpAttente(t, login) { const lim = Date.now() - ORDRE_MDP_VIE;
  return (ordresData[t] || []).some(o => o && o.type === 'mdp' && o.login === login && !o.fait && (o.ts || 0) > lim); }
function ordresSave() { try { const tmp = ORDRES_PATH + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(ordresData)); fs.renameSync(tmp, ORDRES_PATH); return true; } catch (e) { console.error('ordres.json non écrit :', e.message); return false; } }
function ordreAttente(t, login) { return (ordresData[t] || []).some(o => estSuppr(o) && o.login === login && !o.fait && o.banni !== false); }
function ordreFait(t, login) { return (ordresData[t] || []).some(o => estSuppr(o) && o.login === login && o.fait && o.banni !== false); }
/* La clé d'équipe, comme pour l'annuaire : kh = sha256 de la clé. null = espace inconnu, false = mauvaise clé.
   ⛔ ELLE DÉLÈGUE, ELLE NE COMPARE PLUS ELLE-MÊME. Le serveur portait DEUX implémentations de
   la même preuve — celle-ci en `!==`, `cleEquipeVerdict()` en `crypto.timingSafeEqual()` — et
   elles avaient DÉJÀ divergé : l'une acceptait un kh en hexadécimal majuscule, l'autre non.
   C'est la leçon des quatre portes de `fbRevoquerEquipe`, appliquée avant d'en ouvrir une
   cinquième : deux contrôles de sécurité qui disent la même chose finissent toujours par ne
   plus la dire pareil, et c'est celui qu'on a oublié de corriger qui décide. Le socle
   (`/api/op/session`) s'appuie sur `sauvRefus`, donc sur cette fonction : on unifie AVANT d'y
   brancher quoi que ce soit, pas après.
   ⚠️ Le contrat des trois appelants ne bouge pas d'un iota — `null` UNIQUEMENT quand l'espace
   ou son code manquent (404), `false` pour tout le reste (403), code illisible compris. C'est
   ce que promet le commentaire de `cleEstPublique` juste en dessous, et c'est ce qui la rend
   sûre : on ne change pas la sémantique en même temps qu'on unifie la comparaison. */
function espaceCleOk(t, kh) {
  const e = espaceParT(t); if (!e || !e.code) return null;
  return cleEquipeVerdict(t, kh) === 'valide';
}
/* ⛔ LA CLÉ ÉCRITE EN CLAIR DANS app.html. La connaître ici n'ajoute AUCUN secret — c'est
   justement le problème qu'elle pose. Elle ne sert qu'à répondre à une question : cet espace
   a-t-il sa propre clé, ou porte-t-il encore celle que tout le monde peut lire ?
   ⛔ Ne JAMAIS la modifier, ici ou ailleurs : elle déchiffre les données de toutes les
   entreprises qui n'en ont pas reçu d'autre (voir CLAUDE.md, SYNC_SECRET_DEFAULT). */
const CLE_PAR_DEFAUT = 'ELAN-GESTION-7F3A9C2E-cloud-2026';
/* ⛔ TROIS ÉTATS, PAS DEUX — et c'est la Tour qui l'a appris à ses dépens. Un booléen
   « a-t-elle sa clé propre ? » confond « non, elle porte la clé partagée » avec « on n'en sait
   rien » : un espace HORS ANNUAIRE n'a pas de code enregistré, donc pas de clé connue, et il
   s'affichait pourtant « 🔓 Clé partagée — à migrer ». Justin l'a lu comme un constat le
   11 septembre 2026, alors que c'était un artefact. Pire, côté chantier : un espace d'annuaire
   au code illisible se compte « à migrer » pour toujours, donc le compteur ne peut plus
   atteindre zéro — et une condition impossible à remplir finit par être ignorée.
   Une seule fonction rend l'état, tout le reste en dérive. */
function cleEtat(e) {
  if (!e || !e.code) return 'inconnue';
  let k = ''; try { k = String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).k || ''); } catch (err) { return 'inconnue'; }
  if (!k) return 'inconnue';
  return k === CLE_PAR_DEFAUT ? 'partagee' : 'propre';
}
/* Vrai quand l'espace porte encore la clé partagée — donc quand une « preuve de clé » venant de
   lui ne prouve rien, puisque n'importe qui peut la calculer depuis le fichier public.
   ⚠️ OUVERTE PAR DÉFAUT, ET C'EST L'ORDRE D'APPEL QUI LA REND SÛRE : un espace inconnu ou un
   code illisible rend `false`, c'est-à-dire « laisse passer ». Ce n'est acceptable que parce
   que `sauvRefus` tranche AVANT — 404 sur l'espace inconnu, 403 sur le code illisible.
   ⛔ Ne jamais l'appeler seule, sans cette garde devant. */
function cleEstPublique(t) { return cleEtat(espaceParT(t)) === 'partagee'; }
/* ══ SUPPRIMER SANS CODE : UNE QUESTION, UNE CASE, « OUI » (Justin, 27 septembre 2026) ════════
   Les quatre suppressions de la Tour — un compte, les comptes jamais utilisés, fermer un client,
   supprimer une entreprise partout — demandaient un code envoyé par e-mail. Justin, à la question
   posée : « Fait les 4 ». Elles se confirment désormais comme dans OP GESTION (`delUser`) : une
   question en gras, une case à cocher, puis « Oui, supprimer », éteint tant que la case est vide.
   La Tour l'annonce par `confirme: true` — un BOOLÉEN strict : « true » en chaîne, 1, ou tout
   autre valeur retombent sur le chemin du code, qui ne supprime rien au premier appel.
   ⚠️ LE CHEMIN DU CODE RESTE, ET IL LE FAUT : la Tour en service (v2.66, comme toute Tour d'avant
   la v2.69) n'envoie pas `confirme` et attend `codeEnvoye` au premier appel. Si ce premier appel
   supprimait directement, elle détruirait sans même la question qu'elle pose avant. Et dans
   l'autre sens, une Tour neuve face au serveur d'avant reçoit `codeEnvoye` : elle redemande le
   code (`supprAppel`, tour.html) au lieu d'annoncer une suppression qui n'a pas eu lieu.
   ⛔ CE QUE ÇA RETIRE, et c'est une décision, pas un oubli : le code était un SECOND facteur —
   une session de la Tour volée (trente jours avec « rester connecté ») ne suffisait pas à
   détruire. Désormais `monPatronStrict` est la première porte, et deux protections la doublent
   (`APRÈS CHAQUE SUPPRESSION, UN E-MAIL`, juste en dessous). Les règles de fond ne bougent pas :
   « jamais utilisé » prouvé ici, journal saturé refusé, espaces intouchables, et chaque geste au
   journal de la Tour (`monLog`) avec le chemin qui l'a permis (« confirmée » ou « par code »).
   `tests/test-832.js` joue les deux chemins sur le vrai serveur. */
/* ══ APRÈS CHAQUE SUPPRESSION, UN E-MAIL ; AU-DELÀ DE TROIS ENTREPRISES EN 24 HEURES, LE CODE REVIENT ══
   Justin, 27 septembre 2026, aux deux protections proposées en échange du code : « Oui rajoute ça ».
   Aucune n'ajoute un geste à qui supprime :
   · APRÈS chaque suppression — les quatre routes, confirmée ou par code — un e-mail part à la boîte
     du patron : quoi, par qui, quand, depuis quel appareil, et le geste à faire si ce n'est pas lui.
     Rien à lire AVANT de supprimer. L'envoi est ATTENDU, huit secondes au plus, et la réponse DIT
     s'il est parti (`avis`) : une alerte qui ne part pas sans que personne le sache n'est pas une
     alerte — et sans borne, un serveur d'e-mails muet (deux minutes d'attente par défaut chez
     nodemailer) faisait rendre 504 à nginx sur une suppression FAITE, que la Tour aurait crue ratée.
     Sans e-mail configuré, rien ne se supprime (503) : c'était déjà vrai du code.
   · Au-delà de TROIS ENTREPRISES supprimées en 24 heures glissantes — fermer un client, supprimer
     partout, par confirmation ou par code — `confirme` ne suffit plus : le code par e-mail revient,
     et la réponse porte `limite: true` pour que la Tour dise pourquoi. Une session volée détruit
     trois entreprises au plus avant de buter sur la boîte du patron, et chacune l'a déjà prévenu.
     Les comptes ne comptent pas : c'est « entreprises » que Justin a dit.
   ⚠️ Le compteur vit sur disque (`tour-suppressions.json` : des dates, rien d'autre) — un
   redémarrage ne le remet pas à zéro. Illisible, il reste FERMÉ : le code est demandé pour toute
   entreprise jusqu'à la prochaine écriture réussie. ⛔ Ni le journal de la Tour ni celui des
   e-mails ne servent de compteur : tous deux sont plafonnés, et des connexions ratées suffiraient
   à en pousser les suppressions dehors (la leçon de « jamais connecté », plus bas).
   `tests/test-832.js` joue l'avis sur les quatre routes et la limite, redémarrage compris. */
const SUPPR_ENT_PATH = path.join(DATA_DIR, 'tour-suppressions.json');
const SUPPR_ENT_MAX = 3, SUPPR_ENT_FENETRE = 24 * 3600000;
/* Sur le disque : les dates des entreprises supprimées (`ts`), les avis qui ne sont pas partis
   (`avisManques`, voir `supprRattraper`) et `ferme` — un compteur qui n'a pas pu être relu reste
   FERMÉ même quand on réécrit le fichier pour autre chose (un avis manqué) : seule une suppression
   passée par le code le rouvre. Un tableau nu est la forme de la première version (des dates
   seules) : il se relit tel quel. */
let supprEntTs = [], supprAvisManques = [], supprEntIllisible = false;
try {
  const l = JSON.parse(fs.readFileSync(SUPPR_ENT_PATH, 'utf8'));
  const ts = Array.isArray(l) ? l : (l && Array.isArray(l.ts) ? l.ts : null);
  if (!ts) throw new Error('forme inattendue');
  supprEntTs = ts.filter(x => typeof x === 'number' && isFinite(x));
  if (!Array.isArray(l)) {
    if (l.ferme === true) { supprEntIllisible = true; console.error('tour-suppressions.json : compteur resté fermé — le code est demandé pour toute entreprise jusqu\'à la prochaine suppression par code'); }
    if (Array.isArray(l.avisManques)) supprAvisManques = l.avisManques
      .filter(x => x && typeof x.ts === 'number' && isFinite(x.ts)).slice(-30)
      .map(x => ({ id: String(x.id || '').slice(0, 40), ts: x.ts, sujet: uneLigne(x.sujet, 200) }));
  }
} catch (e) {
  if (e.code !== 'ENOENT') { supprEntIllisible = true; console.error('tour-suppressions.json illisible — le code est demandé pour toute entreprise jusqu\'à la prochaine écriture'); }
}
function supprEtatEcrire() {
  try {
    const etat = { ts: supprEntTs, avisManques: supprAvisManques };
    if (supprEntIllisible) etat.ferme = true;
    fs.writeFileSync(SUPPR_ENT_PATH + '.tmp', JSON.stringify(etat));
    fs.renameSync(SUPPR_ENT_PATH + '.tmp', SUPPR_ENT_PATH);
    return true;
  } catch (e) { console.error('tour-suppressions.json non écrit :', e.code || 'erreur disque'); return false; }
}
function supprEntRecentes() { const lim = Date.now() - SUPPR_ENT_FENETRE; supprEntTs = supprEntTs.filter(x => x > lim); return supprEntTs.length; }
/* ⛔ `n` : les entreprises que CETTE suppression effacerait, et chacune compte (`gardien`, 27 septembre
   2026, B1). Fermer un client efface TOUS les espaces reliés à son adresse : cinq espaces d'autres
   entreprises rattachés à une seule adresse, puis une seule fermeture confirmée, et le compteur
   disait « une » — six entreprises détruites sous la limite de trois. On compte AVANT d'effacer, sur
   ce qui va vraiment disparaître. Vrai : la confirmation de la Tour ne suffit plus, le code revient. */
function supprEntLimite(n) { return supprEntIllisible || supprEntRecentes() + Math.max(1, n || 0) > SUPPR_ENT_MAX; }
function supprEntCompter(n) {   // `n` entreprises viennent d'être supprimées ; rend le total sur 24 heures
  supprEntRecentes();
  const k = Math.max(1, n || 0), h = Date.now();
  for (let i = 0; i < k; i++) supprEntTs.push(h);
  const etait = supprEntIllisible; supprEntIllisible = false;
  if (!supprEtatEcrire()) supprEntIllisible = etait;   // non écrit : un compteur fermé le reste
  return supprEntTs.length;
}
/* Quand la confirmation de la Tour suffira de nouveau pour `n` entreprises : il faut que les plus
   anciennes suppressions sortent de la fenêtre. 0 : tout de suite ; Infinity : jamais (`n` dépasse
   la limite à lui seul, ou le compteur est fermé). */
function supprEntLibreA(n) {
  if (supprEntIllisible) return Infinity;
  const r = supprEntRecentes(), besoin = r + Math.max(1, n || 0) - SUPPR_ENT_MAX;
  if (besoin <= 0) return 0;
  if (besoin > r) return Infinity;
  return supprEntTs.slice().sort((a, b) => a - b)[besoin - 1] + SUPPR_ENT_FENETRE;
}
/* ══ OÙ PARTENT LE CODE ET L'AVIS — ET CE QUE LA TOUR PEUT EN LIRE (`gardien`, B4) ══════════════════
   `securiteEmail` (config.json, `bash server/set-securite.sh`) est l'adresse des e-mails de sécurité ;
   sans elle, c'est l'adresse de toujours (`notifDemandes`, sinon celle d'où partent les e-mails).
   Une boîte que la Tour RELÈVE (la boîte support, une boîte de la Messagerie, une boîte d'entreprise)
   rend le code lisible à qui tient une session de la Tour : un code qu'on y lit ne protège rien.
   `supprDestLisible` le dit, sans jamais afficher l'adresse. */
function uneLigne(s, max) {   // une ligne, sans caractère de contrôle ni séparateur de ligne Unicode (U+2028, U+2029)
  const brut = String(s == null ? '' : s).slice(0, 4 * (max || 200));
  let out = '';
  for (const c of brut) { const k = c.charCodeAt(0); out += (k < 32 || k === 127 || k === 0x2028 || k === 0x2029) ? ' ' : c; }
  return out.replace(/ {2,}/g, ' ').trim().slice(0, max || 200);
}
function adrNue(s) { const m = /<([^<>]*)>\s*$/.exec(String(s || '')); return String(m ? m[1] : (s || '')).trim().toLowerCase(); }
function supprDest() { return String(config.securiteEmail || config.notifDemandes || (config.smtp && (config.smtp.from || config.smtp.user)) || '').trim(); }
function supprMailPret() { return !!(mailer && /@/.test(adrNue(supprDest()))); }
let messagerieTour = null;   // posée au montage de la Messagerie (`mail.js`, plus bas) : ses boîtes, sans mot de passe
function supprDestLisible() {
  const d = adrNue(supprDest()); if (!d) return false;
  try { if (supportBox && adrNue(supportBox.email) === d) return true; } catch (e) {}
  try { if (messagerieTour && (messagerieTour.boites() || []).some(b => b && adrNue(b.email) === d)) return true; } catch (e) {}
  try { if (Object.values(mailboxes || {}).some(b => b && adrNue(b.email) === d)) return true; } catch (e) {}
  return false;
}
/* Une erreur d'envoi recopie souvent l'adresse du destinataire en clair (`gardien`, R3) : elle va dans la
   réponse et dans le journal système, qui se relisent à plusieurs. */
function sansAdresses(s) { return String(s || '').replace(/[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g, a => masqueMail(a)); }
function heureParis(ts) { return new Date(ts).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); }
const SUPPR_PAS_DE_MAIL = 'e-mail non configuré — une suppression part toujours avec son e-mail d\'avis, rien n\'a été supprimé';
const SUPPR_TOI = 'Si ce n\'est pas toi qui supprimes, ne donne ce code à personne : quelqu\'un se sert de ta session de la Tour — change son mot de passe (bash server/set-admin.sh, sur le serveur).\n\n';
/* Pourquoi la confirmation ne suffit plus, en une phrase — `n` : les entreprises que cette suppression effacerait. */
function supprLimiteRaison(n) {
  if (supprEntIllisible) return 'le compteur des suppressions n\'a pas pu être relu sur le serveur : tant qu\'une suppression par code ne l\'a pas réécrit, chaque entreprise demande le code';
  const r = supprEntRecentes(), k = Math.max(1, n || 0);
  return (k > 1 ? 'cette suppression effacerait ' + k + ' espaces d\'un coup (chacun compte pour une entreprise)' + (r ? ', et ' : '') : '')
    + (r ? r + ' ' + (r > 1 ? 'entreprises ont déjà été supprimées' : 'entreprise a déjà été supprimée') + ' ces dernières 24 heures' : '')
    + ' : au-delà de ' + SUPPR_ENT_MAX + ', la confirmation de la Tour ne suffit plus';
}
function supprLimiteTxt(n) { return 'Pourquoi un code : ' + supprLimiteRaison(n) + '.\n' + SUPPR_TOI; }
function supprQuandTxt(n) {
  const a = supprEntLibreA(n);
  return (isFinite(a) && a > Date.now()) ? ' La confirmation de la Tour suffira de nouveau à partir de ' + heureParis(a) + ' (heure de Paris).' : '';
}
/* La limite est atteinte, et le code partirait dans une boîte que la Tour lit : on n'envoie pas un code
   inutile, on attend. Rien n'est supprimé. */
function supprLisibleTxt(n) {
  return 'Il faudrait un code par e-mail — ' + supprLimiteRaison(n) + ' —, mais il partirait dans '
    + masqueMail(adrNue(supprDest())) + ', une boîte que la Tour lit elle-même : il n\'y protégerait rien. Rien n\'a été supprimé.'
    + supprQuandTxt(n)
    + ' Pour ne plus attendre : fais envoyer ces e-mails à une adresse que toi seul lis (sur le serveur : bash server/set-securite.sh).';
}
/* Un e-mail de sécurité à la boîte du patron, attendu `delai` ms au plus. Rend { parti:true }, ou
   { parti:false, motif, envoi } — `envoi` est la promesse de l'envoi, qui peut encore aboutir après
   le délai (voir `supprAvis`). Sans borne, un serveur d'e-mails muet (deux minutes d'attente par
   défaut chez nodemailer) faisait rendre 504 à nginx sur une suppression FAITE, que la Tour aurait
   crue ratée. */
async function supprEnvoiBorne(o) {
  const dest = supprDest();
  if (!mailer || !adrNue(dest)) return { parti: false, motif: 'e-mail non configuré' };
  let minuterie = null, envoi = null;
  try {
    envoi = mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: dest, confidentiel: true, trace: o.trace, subject: o.sujet, text: o.text });
    await Promise.race([envoi, new Promise((_, non) => { minuterie = setTimeout(() => non(new Error('pas de réponse du serveur d\'e-mails en ' + Math.round(o.delai / 1000) + ' s')), o.delai); })]);
    return { parti: true };
  } catch (e) {
    if (envoi && typeof envoi.enRetard === 'function') envoi.enRetard();   // sans effet sur un envoi déjà refusé
    return { parti: false, motif: sansAdresses(String((e && e.message) || e)).slice(0, 120), envoi };
  } finally { clearTimeout(minuterie); }
}
const SUPPR_SI_PAS_TOI = 'Si ce n\'est pas toi, quelqu\'un se sert de ta session de la Tour. Change tout de suite son mot de passe, depuis un ordinateur :\n\n'
  + '    ssh -t root@api.teamop.fr "cd /opt/teamop/repo && bash server/set-admin.sh"\n\n'
  + 'Toutes les sessions ouvertes du compte patron sont fermées aussitôt, même celles restées connectées trente jours.';
/* L'avis. `o` : sujet, quoi (la phrase qui dit ce qui a disparu), trace (ce que garde le journal des
   e-mails — ni nom ni adresse : il se relit à plusieurs), confirme, confirmeTxt (comment la Tour a
   confirmé), rang et n (entreprises), attention, t0 (le début de la route : le délai de l'avis se
   prend sur ce qui reste avant les 60 s de nginx — `gardien`, R5). */
async function supprAvis(req, o) {
  const quand = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const n = Math.max(1, o.n || 1);
  const rang = o.rang ? '\n' + (n > 1 ? 'Elle compte pour ' + n + ' entreprises (une par espace effacé) : ' + o.rang + ' supprimées en 24 heures. '
      : 'C\'est la ' + o.rang + (o.rang === 1 ? 're' : 'e') + ' entreprise supprimée en 24 heures. ')
    + (o.rang > SUPPR_ENT_MAX ? 'Au-delà de ' + SUPPR_ENT_MAX + ', le code par e-mail a été demandé.' : 'À partir de la ' + (SUPPR_ENT_MAX + 1) + 'e, la Tour redemande un code par e-mail.') + '\n' : '';
  const text = 'Une suppression vient d\'être faite depuis la Tour de contrôle.\n\n'
    + 'Quoi : ' + o.quoi + '\n'
    + 'Par : ' + (uneLigne(req.tourUser && req.tourUser.nom, 60) || 'patron') + '\n'
    + 'Quand : ' + quand + ' (heure de Paris)\n'
    + 'Appareil : ' + monUA(req) + '\n'
    + 'Confirmée : ' + (o.confirme ? (o.confirmeTxt || 'dans la Tour, par la question et la case') : 'par le code envoyé par e-mail') + '\n'
    + (o.attention ? '\nAttention : ' + o.attention + '\n' : '')
    + rang
    + '\nSi c\'est toi, il n\'y a rien à faire.\n\n'
    + SUPPR_SI_PAS_TOI;
  const delai = o.t0 ? Math.max(1000, Math.min(8000, 50000 - (Date.now() - o.t0))) : 8000;
  const r = await supprEnvoiBorne({ sujet: o.sujet, text, trace: 'avis de suppression · ' + o.trace, delai });
  if (r.parti) return { parti: true };
  console.error('avis de suppression non parti :', r.motif);   // ni l'entreprise ni l'identifiant : ce journal se relit à plusieurs
  /* ⛔ UN AVIS QUI NE PART PAS EST RETENU, ET LA SUPPRESSION SUIVANTE ATTEND QU'IL PARTE (`gardien`, C1) —
     voir `supprRattraper`. Arrivé en retard (au-delà du délai), il retire lui-même sa ligne : il
     n'était pas perdu. */
  const id = crypto.randomBytes(6).toString('hex');
  supprAvisManques.push({ id, ts: Date.now(), sujet: uneLigne(o.sujet, 200) });
  if (supprAvisManques.length > 30) supprAvisManques = supprAvisManques.slice(-30);
  supprEtatEcrire();
  if (r.envoi) r.envoi.then(() => {
    const avant = supprAvisManques.length;
    supprAvisManques = supprAvisManques.filter(x => x.id !== id);
    if (supprAvisManques.length !== avant) supprEtatEcrire();
  }, () => {});
  return { parti: false, motif: r.motif };
}
/* ══ UN AVIS QUI NE PART PAS NE LAISSE PAS PASSER LA SUIVANTE (`gardien`, 27 septembre 2026, C1) ═══════
   Une session volée qui épuisait d'abord le quota d'envoi (la Messagerie envoie par la même boîte)
   supprimait ensuite autant qu'elle voulait sans qu'un seul avis parte. Un avis manqué est désormais
   RETENU sur le disque, et AVANT toute nouvelle suppression — n'importe laquelle des cinq routes, par
   confirmation ou par code — le serveur envoie au patron la liste de ce qu'il n'a pas pu lui dire.
   Parti : la liste se vide et la suppression suit. Pas parti : RIEN ne se supprime (503) — une
   suppression part toujours avec son avis, et celles d'avant aussi. Une seule suppression peut donc
   échapper à l'avis sur le moment, celle qui a trouvé le serveur d'e-mails en panne, et le patron
   l'apprend dès qu'il repart : le serveur réessaie tout seul toutes les quinze minutes. */
let supprRattrapageEnCours = null;
function supprRattraper() {
  if (!supprAvisManques.length) return Promise.resolve(true);
  if (supprRattrapageEnCours) return supprRattrapageEnCours;
  const lot = supprAvisManques.slice();
  supprRattrapageEnCours = (async () => {
    const text = (lot.length > 1 ? lot.length + ' suppressions faites depuis la Tour n\'ont pas eu leur e-mail d\'avis sur le moment'
        : 'Une suppression faite depuis la Tour n\'a pas eu son e-mail d\'avis sur le moment') + ' : le serveur d\'e-mails ne répondait pas.\n\n'
      + lot.map(x => '  · ' + x.sujet + ' — ' + heureParis(x.ts)).join('\n') + '\n\n'
      + 'Tant que cet e-mail n\'était pas parti, la Tour ne supprimait plus rien.\n\n'
      + SUPPR_SI_PAS_TOI;
    const r = await supprEnvoiBorne({ sujet: '⚠️ Tour — ' + (lot.length > 1 ? lot.length + ' suppressions' : 'une suppression') + ' sans e-mail d\'avis',
      text, trace: 'rattrapage de ' + lot.length + ' avis de suppression', delai: 8000 });
    if (r.parti) {
      const ids = new Set(lot.map(x => x.id));
      supprAvisManques = supprAvisManques.filter(x => !ids.has(x.id));
      supprEtatEcrire();
    } else console.error('avis de suppression en retard, toujours pas partis :', r.motif);
    return r.parti;
  })().finally(() => { supprRattrapageEnCours = null; });
  return supprRattrapageEnCours;
}
setInterval(() => { if (supprAvisManques.length) supprRattraper().catch(() => {}); }, 15 * 60000).unref();
/* Au démarrage, une ligne au journal système : l'adresse de sécurité est-elle réglée, et la Tour relève-t-elle
   cette boîte ? Deux réponses, jamais l'adresse. `setImmediate` : la Messagerie et la boîte support ne sont
   montées que plus bas dans ce fichier. */
setImmediate(() => {
  try {
    const d = adrNue(supprDest());
    console.log('suppressions de la Tour — e-mails de sécurité : ' + (!d ? 'AUCUNE adresse, rien ne se supprime'
      : (config.securiteEmail ? 'adresse réglée à part' : 'adresse par défaut') + (supprDestLisible()
        ? ' · ⚠ la Tour relève cette boîte : au-delà de ' + SUPPR_ENT_MAX + ' entreprises en 24 h, les suppressions attendront (bash server/set-securite.sh)'
        : ' · la Tour ne relève pas cette boîte')));
  } catch (e) {}
});
const SUPPR_NON_ECRIT = 'La suppression n\'a pas pu être enregistrée sur le disque du serveur : elle vaut jusqu\'au prochain redémarrage, pas au-delà. Vérifie le serveur (disque plein ?), puis recommence.';
const SUPPR_NON_ECRIT_AVIS = 'l\'écriture sur le disque du serveur a échoué — cette suppression vaut jusqu\'au prochain redémarrage du serveur, pas au-delà.';
const SUPPR_AVIS_BLOQUE = 'L\'e-mail d\'avis d\'une suppression précédente n\'est pas parti, et le serveur d\'e-mails ne répond toujours pas : '
  + 'rien ne se supprime tant que les avis ne partent pas. Rien n\'a été supprimé — réessaie dans quelques minutes.';
app.post('/api/monitor/compte/supprimer', monPatronStrict, async (req, res) => {
  const t0 = Date.now();
  const b = req.body || {};
  const t = monStr(b.t, 80), login = monStr(b.login, 40).toLowerCase().trim();
  if (!t || !login) return res.status(400).json({ error: 't et login requis' });
  const e = espaceParT(t); if (!e) return res.status(404).json({ error: 'espace inconnu' });
  const annu = (comptesReg[t] && comptesReg[t].c) || {};
  const connu = Object.prototype.hasOwnProperty.call(annu, login) || (cnxData[t] || []).some(x => String(x.login || '').toLowerCase().trim() === login && x.ev !== 'echec');
  if (!connu) return res.status(404).json({ error: 'compte inconnu de cet espace' });
  const cle = 'c:' + t + ':' + login;
  const codeRecu = monStr(b.code, 10).trim();
  const confirme = b.confirme === true;   // question + case + « Oui » dans la Tour — voir `SUPPRIMER SANS CODE` plus haut
  /* Ni l'avis ni le code ne partiraient : rien ne se supprime (une adresse de destination vide compte aussi — `gardien`, C1). */
  if (!supprMailPret()) return res.status(503).json({ error: confirme ? SUPPR_PAS_DE_MAIL : 'e-mail non configuré — impossible d\'envoyer le code' });
  if (!(await supprRattraper())) return res.status(503).json({ error: SUPPR_AVIS_BLOQUE });   // un avis d'avant n'est pas parti : il part d'abord
  const loginL = uneLigne(login, 40), nomE = uneLigne(espNomPropre(e), 80);   // un nom ne glisse pas de fausse ligne dans un e-mail (`gardien`, R4)
  if (!codeRecu && !confirme) {   // 1er temps : le code part par mail (la Tour d'avant la v2.69)
    if (retraitCodes.size > 500) for (const [k, v] of retraitCodes) if (Date.now() > v.exp) retraitCodes.delete(k);   // balayage des codes périmés
    const code = String(crypto.randomInt(100000, 1000000));
    retraitCodes.set(cle, { code, exp: Date.now() + 10 * 60000, tries: 0 });
    const dest = supprDest();
    try {
      await mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: dest,
        confidentiel: true, trace: 'code de suppression de compte · espace ' + t.slice(0, 12),   // ni l'identifiant ni le code au journal
        subject: '🗑 Code de confirmation — suppression du compte « ' + loginL + ' » chez ' + nomE,
        text: 'Tu es sur le point de SUPPRIMER le compte « ' + loginL + ' » de l\'entreprise ' + nomE + '.\n\nCode de confirmation : ' + code + '\n\nValable 10 minutes. Après validation : l\'identifiant est retiré de l\'annuaire tout de suite (la personne ne peut plus entrer), et le compte est supprimé de l\'application au premier appareil de l\'entreprise qui s\'ouvre.\n\nSi ce n\'est pas toi, ignore ce message : rien ne se passe sans le code.' });
    } catch (err) { return res.status(500).json({ error: 'envoi du code impossible : ' + sansAdresses(String(err.message)).slice(0, 120) }); }
    return res.json({ ok: true, codeEnvoye: true, dest: masqueMail(adrNue(dest)) });
  }
  if (!confirme) {   // 2e temps : le code revient
    const c = retraitCodes.get(cle);
    if (!c || Date.now() > c.exp) { retraitCodes.delete(cle); return res.status(400).json({ error: 'code expiré — relance la suppression' }); }
    if (c.code !== codeRecu) { c.tries++; if (c.tries >= 5) retraitCodes.delete(cle); return res.status(400).json({ error: 'code incorrect' }); }
  }
  retraitCodes.delete(cle);   // un code demandé avant, resté en attente, ne sert plus
  const l = ordresData[t] = ordresData[t] || [];
  l.forEach(o => { if (estSuppr(o) && o.login === login) o.banni = false; });   // un ancien ordre réautorisé ne compte plus : celui-ci prend le relais
  l.push({ login, ts: Date.now(), par: (req.tourUser && req.tourUser.nom) || '', fait: 0 });
  /* ⛔ ÉCRIT, OU ON LE DIT (`gardien`, C3) : sans ces deux contrôles, la réponse — et l'avis — disaient
     « retiré de l'annuaire » quand le disque avait refusé. La suppression vaut alors jusqu'au prochain
     redémarrage du serveur, pas au-delà, et c'est ce que la Tour et l'avis disent. */
  let ecrit = ordresSave();
  if (comptesReg[t] && comptesReg[t].c && Object.prototype.hasOwnProperty.call(comptesReg[t].c, login)) { delete comptesReg[t].c[login]; comptesReg[t].maj = Date.now(); if (!comptesEcrire()) ecrit = false; }
  /* Le CHEMIN au journal (`gardien`, 27 septembre 2026) : après une session volée, c'est ce qui distingue une
     suppression confirmée dans la Tour d'une suppression par code. Motif borné à 60 caractères par monLog. */
  monLog((req.tourUser && req.tourUser.nom) || 'patron', true, req, 'suppression de compte ordonnée · ' + (confirme ? 'confirmée' : 'par code'));
  const avis = await supprAvis(req, { t0, confirme, trace: 'compte · ' + (confirme ? 'confirmée' : 'par code'),
    sujet: '🗑 Tour — compte « ' + loginL + ' » supprimé chez ' + (nomE || t),
    quoi: 'le compte « ' + loginL + ' » de ' + (nomE || 'l\'espace ' + t) + ' — retiré de l\'annuaire tout de suite (la personne ne peut plus entrer), supprimé de l\'application au premier appareil de l\'entreprise qui s\'ouvre.',
    attention: ecrit ? '' : SUPPR_NON_ECRIT_AVIS });
  if (!ecrit) return res.status(500).json({ error: SUPPR_NON_ECRIT, ecrit: false, avis });
  res.json({ ok: true, attente: true, avis });
});
/* ── Supprimer d'un coup les comptes JAMAIS UTILISÉS ─────────────────────────────────────────
   Demandé par Justin le 11 septembre 2026 devant la liste d'ELAN (« et ça c'est pareil, faut
   que ça saute ») : cinq comptes marqués « inutilisé », et la suppression unitaire coûte un
   mail, un code et quatre gestes CHACUNE. Vingt gestes et cinq mails pour cinq comptes que
   personne n'a jamais ouverts : on ne le fait pas, donc ils restent, donc la liste ment.

   Le lot ne prend QUE ce que le serveur peut PROUVER inutilisé : présent dans l'annuaire, et
   pas une seule connexion réussie à son nom dans le journal. C'est ce que la Tour affiche
   comme « inutilisé », et c'est un fait vérifiable ici — pas un rôle annoncé par l'appelant.
   Un compte qui a servi, même une fois, garde sa suppression unitaire avec son propre code :
   c'est là qu'on veut relire le nom avant de valider. Le 11 septembre au matin, un ménage trop
   large avait failli emporter l'administrateur d'ELAN ; la règle vit donc DANS la route, où
   aucun bouton ne peut la contourner, et pas dans la page qui l'appelle. */
app.post('/api/monitor/comptes/supprimer', monPatronStrict, async (req, res) => {
  const t0 = Date.now();
  const b = req.body || {};
  const t = monStr(b.t, 80);
  if (!t) return res.status(400).json({ error: 't requis' });
  const e = espaceParT(t); if (!e) return res.status(404).json({ error: 'espace inconnu' });
  const demandes = Array.isArray(b.logins) ? b.logins.slice(0, 40).map(x => monStr(x, 40).toLowerCase().trim()).filter(Boolean) : [];
  if (!demandes.length) return res.status(400).json({ error: 'logins requis' });
  const annu = (comptesReg[t] && comptesReg[t].c) || {};
  const journal = cnxData[t] || [];
  /* ⛔ « JAMAIS CONNECTÉ » NE SE DÉDUIT PAS D'UN JOURNAL PLEIN. `cnxData[t]` est plafonné à
     500 événements, et chaque ouverture d'application en pousse un : chez une entreprise de la
     taille d'ELAN, 500 événements couvrent une à deux semaines. Passé ce seuil, l'absence d'un
     identifiant ne prouve plus rien — elle dit seulement qu'il est sorti de la fenêtre. Un
     technicien en congés, en arrêt ou saisonnier deviendrait alors « jamais utilisé », et le
     lot le supprimerait ET le bannirait de l'annuaire, par paquets de quarante.
     C'est le ménage trop large du 11 septembre au matin, automatisé. Sur un journal saturé, on
     REFUSE le lot et on renvoie au cas par cas, où le patron relit le nom avant de valider.
     (Trouvé par l'agent gardien le 11 septembre 2026, après publication de la route.) */
  if (journal.length >= 500) return res.status(409).json({
    error: 'Journal de connexions saturé (500 événements) pour cet espace : « jamais connecté » n\'y est plus une preuve, un compte peut simplement être sorti de la fenêtre. Supprime-les un par un.' });
  const aServi = new Set();
  for (const x of journal) {
    if (x.ev === 'echec' || x.ev === 'bloque' || x.ev === 'refus') continue;   // la porte a joué : ce n'est pas une connexion
    const l = String(x.login || '').toLowerCase().trim(); if (l) aServi.add(l);
  }
  const refuses = [], logins = [];
  for (const l of new Set(demandes)) {
    if (!Object.prototype.hasOwnProperty.call(annu, l)) { refuses.push({ login: l, raison: 'absent de l\'annuaire' }); continue; }
    if (aServi.has(l)) { refuses.push({ login: l, raison: 'a déjà servi — à supprimer un par un' }); continue; }
    if (ordreAttente(t, l) || ordreFait(t, l)) { refuses.push({ login: l, raison: 'suppression déjà en cours' }); continue; }
    logins.push(l);
  }
  logins.sort();
  if (!logins.length) return res.status(409).json({ error: 'aucun compte inutilisé dans cette liste', refuses });
  /* La clé du code porte l'empreinte de la LISTE : un code reçu pour cinq comptes ne peut pas
     servir à en supprimer six. Sans ça, le second temps serait une porte ouverte sur un lot
     que personne n'a lu dans le mail. */
  const emp = crypto.createHash('sha256').update(logins.join(',')).digest('hex').slice(0, 16);
  const cle = 'cl:' + t + ':' + emp;
  const codeRecu = monStr(b.code, 10).trim();
  const confirme = b.confirme === true;   // question + case + « Oui » dans la Tour — la règle « jamais utilisé » ci-dessus tient toujours
  if (!supprMailPret()) return res.status(503).json({ error: confirme ? SUPPR_PAS_DE_MAIL : 'e-mail non configuré — impossible d\'envoyer le code' });
  if (!(await supprRattraper())) return res.status(503).json({ error: SUPPR_AVIS_BLOQUE });   // un avis d'avant n'est pas parti : il part d'abord
  const nomE = uneLigne(espNomPropre(e), 80), lignes = logins.map(l => uneLigne(l, 40));
  if (!codeRecu && !confirme) {   // 1er temps : le code part par mail (la Tour d'avant la v2.69)
    if (retraitCodes.size > 500) for (const [k, v] of retraitCodes) if (Date.now() > v.exp) retraitCodes.delete(k);
    const code = String(crypto.randomInt(100000, 1000000));
    retraitCodes.set(cle, { code, exp: Date.now() + 10 * 60000, tries: 0 });
    const dest = supprDest();
    try {
      await mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: dest,
        confidentiel: true, trace: 'code de suppression de ' + logins.length + ' compte(s) · espace ' + t.slice(0, 12),   // ni les identifiants ni le code au journal
        subject: '🗑 Code de confirmation — suppression de ' + logins.length + ' compte(s) inutilisé(s) chez ' + nomE,
        text: 'Tu es sur le point de SUPPRIMER ' + logins.length + ' compte(s) de l\'entreprise ' + nomE + ' :\n\n' + lignes.map(l => '  · ' + l).join('\n') + '\n\nAucun de ces identifiants ne s\'est jamais connecté : personne ne perd son travail.\n\nCode de confirmation : ' + code + '\n\nValable 10 minutes. Après validation : ces identifiants sont retirés de l\'annuaire tout de suite, et les comptes sont supprimés de l\'application au premier appareil de l\'entreprise qui s\'ouvre.\n\nSi ce n\'est pas toi, ignore ce message : rien ne se passe sans le code.' });
    } catch (err) { return res.status(500).json({ error: 'envoi du code impossible : ' + sansAdresses(String(err.message)).slice(0, 120) }); }
    return res.json({ ok: true, codeEnvoye: true, dest: masqueMail(adrNue(dest)), logins, refuses });
  }
  if (!confirme) {   // 2e temps : le code revient
    const c = retraitCodes.get(cle);
    if (!c || Date.now() > c.exp) { retraitCodes.delete(cle); return res.status(400).json({ error: 'code expiré — relance la suppression' }); }
    if (c.code !== codeRecu) { c.tries++; if (c.tries >= 5) retraitCodes.delete(cle); return res.status(400).json({ error: 'code incorrect' }); }
  }
  retraitCodes.delete(cle);
  const ords = ordresData[t] = ordresData[t] || [];
  let touche = false;
  for (const login of logins) {
    ords.forEach(o => { if (estSuppr(o) && o.login === login) o.banni = false; });   // un ancien ordre réautorisé ne compte plus : celui-ci prend le relais
    ords.push({ login, ts: Date.now(), par: (req.tourUser && req.tourUser.nom) || '', fait: 0 });
    if (comptesReg[t] && comptesReg[t].c && Object.prototype.hasOwnProperty.call(comptesReg[t].c, login)) { delete comptesReg[t].c[login]; touche = true; }
  }
  let ecrit = ordresSave();   // écrit, ou on le dit (`gardien`, C3) — voir la suppression d'un compte
  if (touche) { comptesReg[t].maj = Date.now(); if (!comptesEcrire()) ecrit = false; }
  monLog((req.tourUser && req.tourUser.nom) || 'patron', true, req, 'suppression de ' + logins.length + ' compte(s) inutilisé(s) · ' + (confirme ? 'confirmée' : 'par code'));
  const plus = logins.length > 1, chez = nomE || t;
  const avis = await supprAvis(req, { t0, confirme, trace: logins.length + (plus ? ' comptes jamais utilisés' : ' compte jamais utilisé') + ' · ' + (confirme ? 'confirmée' : 'par code'),
    sujet: '🗑 Tour — ' + (plus ? logins.length + ' comptes jamais utilisés supprimés' : 'compte jamais utilisé « ' + lignes[0] + ' » supprimé') + ' chez ' + chez,
    quoi: (plus ? logins.length + ' comptes jamais utilisés de ' : 'le compte jamais utilisé de ') + (nomE || 'l\'espace ' + t) + ' :\n' + lignes.map(l => '    · ' + l).join('\n')
      + '\n  ' + (plus ? 'Retirés' : 'Retiré') + ' de l\'annuaire tout de suite, ' + (plus ? 'supprimés' : 'supprimé') + ' de l\'application au premier appareil de l\'entreprise qui s\'ouvre.',
    attention: ecrit ? '' : SUPPR_NON_ECRIT_AVIS });
  if (!ecrit) return res.status(500).json({ error: SUPPR_NON_ECRIT, ecrit: false, n: logins.length, logins, refuses, avis });
  res.json({ ok: true, attente: true, n: logins.length, logins, refuses, avis });
});
/* ══ REFAIRE LES MOTS DE PASSE PROVISOIRES, DEPUIS LA TOUR (Justin, 15 septembre 2026) ══════
   « Je veux pas un bouton dans le truc utilisateur. Je veux un bouton moi dans la tour de
   contrôle s'il y a des erreurs comme ça. C'est à nous de gérer ces problèmes-là. »

   Ce que ça répare : des comptes qui ne peuvent PLUS ENTRER. L'administrateur avait refait leurs
   mots de passe depuis l'application, mais l'annuaire n'avait rien reçu (défaut corrigé en v685)
   — il distribuait donc des mots de passe que la page de connexion ne connaissait pas.

   ⛔ LE SERVEUR NE VOIT JAMAIS LE MOT DE PASSE. La Tour le tire, en calcule l'empreinte SHA-256
   et n'envoie QUE l'empreinte — exactement ce que l'application appelle `pwdHash`. Le mot de
   passe en clair s'affiche une fois au patron, et nulle part ailleurs : ni ici, ni dans
   `ordres.json`, ni dans un journal. C'est la même chaîne que partout : clair → SHA-256 côté
   client → PBKDF2 côté serveur pour l'annuaire.

   ⛔ IL FAUT LES DEUX MOITIÉS, ET ELLES N'ARRIVENT PAS ENSEMBLE :
     · l'ANNUAIRE (`comptes.json`) est à nous, on l'écrit tout de suite — c'est lui qui laisse la
       personne franchir la page d'entrée et trouver son entreprise ;
     · la FICHE (`db.users[].pwdHash`) vit dans la base CHIFFRÉE de l'entreprise, que le serveur
       ne peut ni lire ni écrire. On dépose donc un ordre, et le premier appareil de l'entreprise
       qui s'ouvre l'exécute.
   Entre les deux, la personne passe l'entrée mais se fait refuser DANS l'application. La Tour
   doit le DIRE — « actif dès qu'un appareil de l'entreprise s'ouvre » — au lieu de laisser
   croire à un effet immédiat. Une demi-vérité ici, c'est un client au téléphone.

   Le code par courriel : refaire un mot de passe INVALIDE celui qui marchait. Ça se confirme
   comme une suppression, et pour la même raison. */
app.post('/api/monitor/comptes/mdp', monPatronStrict, async (req, res) => {
  const b = req.body || {};
  const t = monStr(b.t, 80);
  if (!t) return res.status(400).json({ error: 't requis' });
  const e = espaceParT(t); if (!e) return res.status(404).json({ error: 'espace inconnu' });
  /* ⛔ LES APPAREILS D'ABORD, LA PORTE ENSUITE — la règle du dépôt, appliquée mécaniquement.
     Un ordre de mot de passe n'a d'effet que si un appareil de l'entreprise sait l'EXÉCUTER, et
     ce savoir arrive avec la v691. Tant que le minimum exigé est en dessous, le parc peut
     contenir des appareils qui ne l'exécuteront jamais : l'annuaire porterait le mot de passe
     neuf, la fiche l'ancien, et la personne serait coincée entre les deux — jusqu'à la
     péremption de l'ordre, trente jours plus tard. On refuse donc le geste plutôt que de le
     laisser fabriquer une panne silencieuse, et on dit QUOI FAIRE.
     Écrit ici, dans la route, et pas dans la page qui l'appelle : aucun bouton ne peut le
     contourner. (Défaut structurel signalé par `gardien` le 15 septembre 2026, avant
     déploiement — c'était le vrai risque de cette livraison.) */
  /* Et on ne POSE pas un ordre qui ne pourra jamais être servi : mieux vaut le dire au patron
     tout de suite que lui laisser croire à un dépannage qui n'arrivera pas. */
  if (cleEstPublique(t)) return res.status(409).json({
    error: 'Cette entreprise est encore sur la clé d\'équipe partagée : un mot de passe ne peut pas lui être transmis en sécurité. Déménage-la sur sa propre clé d\'abord.' });
  if (!versionsCfg.min || versionsCfg.min < MDP_ORDRE_VER_MIN) return res.status(409).json({
    error: 'Les appareils d\'abord : publie la v' + MDP_ORDRE_VER_MIN + ' et exige-la depuis la Tour (minimum actuel : '
      + (versionsCfg.min || 'aucun') + '). Avant ça, un mot de passe refait d\'ici ne serait exécuté par aucun appareil, et la personne resterait bloquée.' });
  const bruts = Array.isArray(b.comptes) ? b.comptes.slice(0, 40) : [];
  if (!bruts.length) return res.status(400).json({ error: 'comptes requis' });
  const annu = (comptesReg[t] && comptesReg[t].c) || {};
  const refuses = [], cibles = [], vus = new Set();
  for (const x of bruts) {
    const login = monStr(x && x.login, 40).toLowerCase().trim();
    const h = monStr(x && x.h, 64).toLowerCase();
    if (!login || vus.has(login)) continue;
    vus.add(login);
    /* ⛔ Une empreinte qui n'en est pas une poserait `pwdHash` à n'importe quoi, et le compte
       deviendrait inconnectable — on refuse, on ne « nettoie » pas. */
    if (!/^[0-9a-f]{64}$/.test(h)) { refuses.push({ login, raison: 'empreinte invalide' }); continue; }
    if (!Object.prototype.hasOwnProperty.call(annu, login)) { refuses.push({ login, raison: 'absent de l\'annuaire' }); continue; }
    if (ordreBanni(t, login)) { refuses.push({ login, raison: 'compte supprimé depuis la Tour — réautorise-le d\'abord' }); continue; }
    if (ordreMdpAttente(t, login)) { refuses.push({ login, raison: 'mot de passe déjà en attente' }); continue; }
    cibles.push({ login, h });
  }
  cibles.sort((x, y) => x.login < y.login ? -1 : x.login > y.login ? 1 : 0);
  if (!cibles.length) return res.status(409).json({ error: 'aucun compte à refaire dans cette liste', refuses });
  /* La clé du code porte l'empreinte de la LISTE : un code reçu pour cinq comptes ne peut pas
     en servir six. Même règle que la suppression en lot, et pour la même raison. */
  const emp = crypto.createHash('sha256').update(cibles.map(x => x.login).join(',')).digest('hex').slice(0, 16);
  const cle = 'mdp:' + t + ':' + emp;
  const codeRecu = monStr(b.code, 10).trim();
  if (!codeRecu) {   // 1er temps : le code part par mail — à l'adresse des e-mails de sécurité, comme les suppressions (`supprDest`)
    if (!supprMailPret()) return res.status(503).json({ error: 'e-mail non configuré — impossible d\'envoyer le code' });
    if (retraitCodes.size > 500) for (const [k, v] of retraitCodes) if (Date.now() > v.exp) retraitCodes.delete(k);
    const code = String(crypto.randomInt(100000, 1000000));
    retraitCodes.set(cle, { code, exp: Date.now() + 10 * 60000, tries: 0 });
    const dest = supprDest();
    try {
      await mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: dest,
        confidentiel: true, trace: 'code de remise à zéro de ' + cibles.length + ' mot(s) de passe · espace ' + t.slice(0, 12),   // ni les identifiants ni le code au journal
        subject: '🔑 Code de confirmation — ' + cibles.length + ' mot(s) de passe provisoire(s) chez ' + espNomPropre(e),
        text: 'Tu es sur le point de REFAIRE le mot de passe de ' + cibles.length + ' compte(s) de l\'entreprise ' + espNomPropre(e) + ' :\n\n' + cibles.map(x => '  · ' + x.login).join('\n') + '\n\nLeur mot de passe actuel ne marchera plus. Chacun devra en choisir un nouveau à sa prochaine ouverture.\n\nCode de confirmation : ' + code + '\n\nValable 10 minutes. Après validation : l\'annuaire est mis à jour tout de suite (la page de connexion accepte le nouveau mot de passe), et les fiches suivent au premier appareil de l\'entreprise qui s\'ouvre.\n\nSi ce n\'est pas toi, ignore ce message : rien ne se passe sans le code.' });
    } catch (err) { return res.status(500).json({ error: 'envoi du code impossible : ' + sansAdresses(String(err.message)).slice(0, 120) }); }
    return res.json({ ok: true, codeEnvoye: true, dest: masqueMail(adrNue(dest)), logins: cibles.map(x => x.login), refuses });
  }
  const c = retraitCodes.get(cle);   // 2e temps : le code revient
  if (!c || Date.now() > c.exp) { retraitCodes.delete(cle); return res.status(400).json({ error: 'code expiré — relance l\'opération' }); }
  if (c.code !== codeRecu) { c.tries++; if (c.tries >= 5) retraitCodes.delete(cle); return res.status(400).json({ error: 'code incorrect' }); }
  retraitCodes.delete(cle);
  /* L'annuaire d'abord, et par PBKDF2 sur l'empreinte reçue — la même dérivation qu'`annuaireSemer`,
     sinon la page de connexion refuserait le mot de passe qu'on vient de donner. On garde le NOM
     et le drapeau d'adresse (`m`) : refaire un mot de passe n'efface pas ce qu'on savait de la
     personne. `p: 1` dit la vérité — ce mot de passe est provisoire, et la Tour doit l'afficher. */
  const derive = (h) => new Promise((ok) => {
    const sel = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(h, Buffer.from(sel, 'hex'), CNX_ITER, 32, 'sha256', (err, d) => ok(err ? null : { s: sel, e: d.toString('hex') }));
  });
  const reg = comptesReg[t] = comptesReg[t] || { c: Object.create(null), maj: 0 };
  reg.c = reg.c || Object.create(null);
  const ords = ordresData[t] = ordresData[t] || [];
  /* L'instantané d'AVANT, pris avant la moindre écriture — jamais reconstruit après coup par
     une arithmétique de longueurs, qui se casserait au premier ajout dans la boucle. */
  const regAvant = JSON.parse(JSON.stringify(comptesReg[t]));
  const ordsAvant = ords.slice();
  const faits = [], rates = [];
  for (const x of cibles) {
    const d = await derive(x.h);
    /* ⛔ SI LA DÉRIVATION ÉCHOUE, ON N'ORDONNE RIEN. Poser l'ordre sans l'annuaire donnerait un
       mot de passe qui ouvre l'application mais pas la page d'entrée : une panne de plus, pas
       une de moins. Les deux moitiés, ou aucune. */
    if (!d) { rates.push({ login: x.login, raison: 'dérivation impossible' }); continue; }
    const prec = reg.c[x.login] || {};
    reg.c[x.login] = { s: d.s, e: d.e, n: prec.n || '', p: 1, m: (typeof prec.m !== 'undefined' ? prec.m : 0) };
    ords.push({ login: x.login, type: 'mdp', h: x.h, ts: Date.now(), par: (req.tourUser && req.tourUser.nom) || '', fait: 0 });
    faits.push(x.login);
  }
  if (!faits.length) return res.status(500).json({ error: 'aucun mot de passe n\'a pu être enregistré', refuses: refuses.concat(rates) });
  /* ⛔ LES DEUX MOITIÉS, OU AUCUNE — Y COMPRIS SUR DISQUE. Le commentaire en tête de cette route
     l'exige, et jeter les valeurs de retour le démentait : si `ordresSave()` échouait, l'annuaire
     portait le mot de passe neuf et la fiche ne le recevrait JAMAIS ; si `comptesEcrire()`
     échouait, l'inverse au prochain redémarrage. On restaure et on rend 500, comme le fait déjà
     `/api/espaces/comptes`. (Signalé par `gardien` le 15 septembre 2026.) */
  reg.maj = Date.now();
  if (!comptesEcrire()) { comptesReg[t] = regAvant; ordresData[t] = ordsAvant; return res.status(500).json({ error: 'annuaire non enregistré — rien n\'a changé, réessaie' }); }
  if (!ordresSave()) {
    /* L'annuaire est déjà écrit : on le remet comme il était, et on le réécrit. Si CE second
       tour échoue aussi, le disque est vraiment mort — on le dit plutôt que de laisser croire. */
    comptesReg[t] = regAvant; ordresData[t] = ordsAvant;
    const remis = comptesEcrire();
    return res.status(500).json({ error: remis ? 'ordre non enregistré — rien n\'a changé, réessaie'
      : 'ÉCRITURE IMPOSSIBLE sur le serveur : l\'annuaire porte les nouveaux mots de passe mais l\'application ne les recevra pas. Préviens TEAM OP avant de les distribuer.' });
  }
  monLog((req.tourUser && req.tourUser.nom) || 'patron', true, req, faits.length + ' mot(s) de passe provisoire(s) refait(s)');
  res.json({ ok: true, n: faits.length, logins: faits, refuses: refuses.concat(rates) });
});
/* ══ LES COPIES DE SAUVEGARDE — le filet demandé par Justin le 9 septembre 2026 ══
   « Il faudrait une sauvegarde sur le cloud de chaque chose qu'ils font, pour chaque entreprise. »
   Le nuage ne garde qu'un document, le dernier. Ici on garde des COPIES DATÉES du bloc CHIFFRÉ
   que l'application pousse — on ne peut pas le lire, on n'a pas la clé, et ça doit rester ainsi.
   Une par appareil toutes les 30 minutes au plus (c'est l'application qui se retient), et le
   serveur ne garde que ce qui compte : une par heure sur 24 h, une par jour sur 30 jours.
   La restauration se fait DANS l'application, qui seule sait déchiffrer : elle télécharge une
   copie, la lit, et remet ce qui manque — une collection à la fois — sans toucher au reste. */
const SAUV_DIR = path.join(DATA_DIR, 'sauvegardes');
try { fs.mkdirSync(SAUV_DIR, { recursive: true }); } catch (e) {}
const sauvDossier = t => path.join(SAUV_DIR, String(t).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80));
function sauvListe(t) {
  try { return fs.readdirSync(sauvDossier(t)).filter(f => /^\d{13}\.json$/.test(f)).map(f => parseInt(f, 10)).sort((a, b) => b - a); } catch (e) { return []; }
}
/* Rotation : on garde la plus récente de chaque heure sur 24 h, puis la plus récente de chaque
   jour sur 30 jours. Le reste part. */
function sauvElaguer(t) {
  const l = sauvListe(t); if (!l.length) return;
  const now = Date.now(), garder = new Set(), vuH = new Set(), vuJ = new Set();
  for (const ts of l) {   // du plus récent au plus ancien : le premier vu par créneau est gardé
    const age = now - ts;
    if (age < 86400000) { const h = Math.floor(ts / 3600000); if (!vuH.has(h)) { vuH.add(h); garder.add(ts); } }
    else if (age < 30 * 86400000) { const j = Math.floor(ts / 86400000); if (!vuJ.has(j)) { vuJ.add(j); garder.add(ts); } }
  }
  for (const ts of l) if (!garder.has(ts)) { try { fs.unlinkSync(path.join(sauvDossier(t), ts + '.json')); } catch (e) {} }
}
let sauvQuota = new Map();
/* Ce que les trois routes refusent, avant tout : l'espace de repli (ses deux clés sont écrites
   dans app.html — une copie de lui serait lisible par n'importe qui, relecture du gardien du
   10 septembre 2026), un espace fermé (« le blocage d'abord », comme les 14 autres endroits),
   une clé fausse. */
function sauvRefus(t, kh, quoi) {
  if (ESPACES_INTOUCHABLES.includes(t)) return { code: 403, error: 'pas de ' + (quoi || 'copie') + ' pour l\'espace de repli' };
  if (espaceFerme(t)) return { code: 403, error: 'espace fermé' };
  const ok = espaceCleOk(t, kh); if (ok === null) return { code: 404, error: 'espace inconnu' }; if (!ok) return { code: 403, error: 'clé d\'équipe incorrecte' };
  return null;
}
/* ══ CHANGER LA CLÉ D'ÉQUIPE DEMANDE UN CODE PAR COURRIEL ═════════════════════════════════
   Demande de Justin, 15 septembre 2026 : « je veux que ça demande un code par mail pour
   éviter les problèmes ».

   ⛔ C'EST L'ÉCRAN LE PLUS DESTRUCTEUR DE L'APPLICATION, ET IL N'AVAIT AUCUNE BARRIÈRE.
   « Enregistrer la clé » avec une autre valeur rend TOUTES les données de l'entreprise
   définitivement illisibles, sur tous ses appareils à la fois — le nuage ne stocke que du
   chiffré. « Rétablir la clé par défaut » fait pire encore : il remet l'entreprise sur la clé
   écrite en clair dans app.html, ET rend illisible ce qui a été chiffré depuis. Ce second
   bouton ne demandait même pas confirmation.

   Le code part à l'adresse ENREGISTRÉE POUR L'ENTREPRISE, pas à celle de TEAM OP : ce qu'on
   veut prouver, c'est que la personne devant l'écran est bien celle qui répond de cet espace.
   Sans adresse enregistrée, on REFUSE — sur une action irréversible, échouer fermé est la
   seule position tenable, et le message dit quoi faire.

   Deux temps, le même mécanisme que la suppression d'un compte depuis la Tour : sans `code`
   on envoie, avec `code` on vérifie. Cinq essais, dix minutes. */
const cleCodes = new Map();   // 't' -> { code, exp, tries }

/* ══ LE CODE À SIX CHIFFRES, UNE SEULE FOIS ════════════════════════════════════════════════
 * ⛔ FACTORISÉ LE 20 SEPTEMBRE 2026, ET C'EST LA CONDITION QU'`op-socle.js` S'ÉTAIT POSÉE À
 * LUI-MÊME. Son en-tête portait depuis l'étape 4 : « `POST /api/monitor/op/revenir` →
 * volontairement absent tant que `cleCodeExiger` n'est pas factorisé. C'est la seule route qui
 * ÉCRIVE dans la base d'un client depuis la Tour, et le plan exige le code à six chiffres
 * envoyé à l'adresse de l'entreprise — par la fonction existante, pas par une copie. » La
 * copie était le vrai danger : deux gardes qui se ressemblent finissent par diverger, et c'est
 * toujours la moins sévère qui garde le chemin le plus dangereux.
 *
 * ⛔ `cleCodes` RESTE LA SEULE RÉSERVE. Un second `Map` pour le retour voudrait dire deux
 * expirations, deux compteurs d'essais, deux ménages — donc, un jour, un code qui n'expire
 * pas quelque part. Les usages se distinguent par un PRÉFIXE de clé, jamais par une réserve
 * de plus.
 *
 * `demander()` envoie, `verifier()` tranche. Les deux rendent `{code, error}` plutôt que de
 * répondre elles-mêmes : la route décide du verbe HTTP, la garde décide du verdict. */
function cleCodeMenage() {
  if (cleCodes.size > 500) for (const [k, v] of cleCodes) if (Date.now() > v.exp) cleCodes.delete(k);
}
/* `garde` est ce que le code EMPORTE avec lui : les nombres exacts sur lesquels la personne
   donne son accord. `cleCodeVerifier` les rend, pour qu'on puisse vérifier que le monde n'a pas
   changé entre l'envoi et l'usage. Sans ça, l'appelant ne peut que recomparer l'instant présent
   à lui-même — ce qui ne compare rien. */
async function cleCodeDemander(sujet, dest, mail, garde) {
  cleCodeMenage();
  const code = String(crypto.randomInt(100000, 1000000));
  /* ⛔ JAMAIS LE CODE AU JOURNAL. `trace` nomme le geste et l'espace tronqué, rien d'autre —
     `journalctl` se relit à plusieurs et se copie-colle. */
  await mailerEnvoi(Object.assign({ from: config.smtp.from || config.smtp.user, to: dest, confidentiel: true }, mail(code)));
  /* ⛔ ON POSE LE CODE APRÈS L'ENVOI RÉUSSI, PAS AVANT. Posé avant, un SMTP capricieux détruisait
     le code PRÉCÉDENT — peut-être déjà reçu et parfaitement valable — pour le remplacer par un
     code que personne n'a jamais vu, vivant dix minutes. Un double-clic sur « Envoyer le code »
     pendant une panne de courriel invalidait donc, en silence, le code que la personne avait
     sous les yeux. Aucun risque de sécurité (le code est indevinable), mais une manœuvre
     impossible à comprendre pour qui la subit. */
  cleCodes.set(sujet, { code, exp: Date.now() + 10 * 60000, tries: 0, garde: garde || null });
  return { ok: true };
}
/* ⛔ CINQ ESSAIS PUIS LA RÉSERVE SE VIDE POUR CE SUJET : un million de combinaisons se
   parcourt en quelques minutes si on laisse essayer. Et un code JUSTE se consomme, toujours —
   sinon il vaut dix usages pendant dix minutes. */
function cleCodeVerifier(sujet, recu) {
  const c = cleCodes.get(sujet);
  if (!c || Date.now() > c.exp) { cleCodes.delete(sujet); return { code: 400, error: 'code expiré — recommence' }; }
  if (c.code !== String(recu || '')) { c.tries++; if (c.tries >= 5) cleCodes.delete(sujet); return { code: 400, error: 'code incorrect' }; }
  const garde = c.garde || null;
  cleCodes.delete(sujet);
  return { ok: true, garde };
}
app.post('/api/espaces/cle/code', async (req, res) => {
  const b = req.body || {}; const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
  if (!t || !/^[0-9a-f]{64}$/.test(kh)) return res.status(400).json({ error: 't et kh requis' });
  /* La même garde que les copies et le jeton : preuve de la clé ACTUELLE, et refus de
     l'espace de repli. On ne change pas la clé d'un espace dont on n'a pas déjà la clé. */
  const refus = sauvRefus(t, kh, 'changement de clé'); if (refus) return res.status(refus.code).json({ error: refus.error });
  if (!quotaOk(jetonQuota, 'cle:' + t, 12, 3600000)) return res.status(429).json({ error: 'trop de demandes — réessaie plus tard' });
  const e = espaceParT(t);
  const dest = String((e && e.email) || '').trim();
  if (!dest) return res.status(409).json({ error: "Aucune adresse e-mail n'est enregistrée pour cette entreprise : le changement de clé ne peut pas être confirmé. Contacte TEAM OP." });
  if (!mailer) return res.status(503).json({ error: 'e-mail non configuré — impossible d\'envoyer le code' });
  const codeRecu = monStr(b.code, 10).trim();
  /* ⛔ LE SUJET PORTE LE GESTE, PAS SEULEMENT L'ESPACE. Avec `t` tout court, un code demandé
     pour changer la clé servirait à déclencher un RETOUR EN ARRIÈRE, et réciproquement : deux
     gestes aux conséquences opposées partageraient la même autorisation. Le courriel, lui, dit
     bien de quoi il s'agit — la garde doit dire la même chose. */
  const sujet = 'cle:' + t;
  if (!codeRecu) {
    try {
      await cleCodeDemander(sujet, dest, (code) => ({
        trace: 'code de changement de clé · espace ' + t.slice(0, 12),   // jamais le code au journal
        subject: '🔐 Code de confirmation — clé de synchronisation de ' + (espNomPropre(e) || 'ton entreprise'),
        text: 'Quelqu\'un vient de demander à CHANGER LA CLÉ DE SYNCHRONISATION de '
          + (espNomPropre(e) || 'ton entreprise') + '.\n\nCode de confirmation : ' + code
          + '\n\nValable 10 minutes.\n\n⛔ Si ce n\'est pas toi, N\'ENVOIE PAS CE CODE et préviens TEAM OP.'
          + ' Changer cette clé rend les données de ton entreprise ILLISIBLES sur tous ses appareils, sans retour possible.'
          + '\n\n— TEAM OP · teamop.fr' }));
    } catch (err) { return res.status(500).json({ error: 'envoi du code impossible : ' + String(err.message).slice(0, 120) }); }
    return res.json({ ok: true, codeEnvoye: true, dest: masqueMail(dest) });
  }
  const verdict = cleCodeVerifier(sujet, codeRecu);
  if (!verdict.ok) return res.status(verdict.code).json({ error: verdict.error });
  return res.json({ ok: true, valide: true });
});
app.post('/api/espaces/sauvegarde', (req, res) => {
  const b = req.body || {}; const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
  if (!t) return res.status(400).json({ error: 't requis' });
  const refus = sauvRefus(t, kh); if (refus) return res.status(refus.code).json({ error: refus.error });
  if (sauvQuota.size > 5000) sauvQuota = new Map();
  if (!quotaOk(sauvQuota, 't:' + t, 60, 3600000)) return res.status(429).json({ error: 'trop de copies — réessaie plus tard' });
  const enc = String(b.enc || ''), iv = String(b.iv || ''), salt = String(b.salt || '');
  if (!enc || !iv || !salt || enc.length > 3000000 || iv.length > 128 || salt.length > 128) return res.status(400).json({ error: 'bloc chiffré requis (3 Mo au plus)' });
  const ts = Date.now();
  try {
    fs.mkdirSync(sauvDossier(t), { recursive: true });
    const tmp = path.join(sauvDossier(t), ts + '.json.tmp');
    /* ⛔ `z` EST STOCKÉ AVEC LA COPIE. Il dit si le contenu chiffré est compressé ; sans lui,
       une copie restaurée serait déchiffrée puis lue comme du texte, et on rendrait des
       octets gzip à JSON.parse. Le serveur ne sait toujours rien lire — il transporte un
       drapeau, pas une clé. */
    fs.writeFileSync(tmp, JSON.stringify({ ts, enc, iv, salt, z: (b.z ? 1 : 0), ver: monStr(b.ver, 12), by: monStr(b.dev, 24) }));
    fs.renameSync(tmp, path.join(sauvDossier(t), ts + '.json'));
    sauvElaguer(t);
  } catch (e) { console.error('sauvegarde non écrite :', e.message); return res.status(500).json({ error: 'copie non enregistrée' }); }
  res.json({ ok: true, ts, n: sauvListe(t).length });
});
app.post('/api/espaces/sauvegardes', (req, res) => {
  const b = req.body || {}; const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
  if (!t) return res.status(400).json({ error: 't requis' });
  const refus = sauvRefus(t, kh); if (refus) return res.status(refus.code).json({ error: refus.error });
  if (!quotaOk(sauvQuota, 'l:' + t, 120, 3600000)) return res.status(429).json({ error: 'trop de lectures — réessaie plus tard' });
  const l = sauvListe(t).map(ts => { let taille = 0; try { taille = fs.statSync(path.join(sauvDossier(t), ts + '.json')).size; } catch (e) {} return { ts, taille }; });
  res.json({ ok: true, copies: l });
});
app.post('/api/espaces/sauvegarde/lire', (req, res) => {
  const b = req.body || {}; const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase(); const ts = parseInt(b.ts, 10);
  if (!t || !isFinite(ts)) return res.status(400).json({ error: 't et ts requis' });
  const refus = sauvRefus(t, kh); if (refus) return res.status(refus.code).json({ error: refus.error });
  if (!quotaOk(sauvQuota, 'l:' + t, 120, 3600000)) return res.status(429).json({ error: 'trop de lectures — réessaie plus tard' });
  if (!sauvListe(t).includes(ts)) return res.status(404).json({ error: 'copie introuvable' });
  try { const j = JSON.parse(fs.readFileSync(path.join(sauvDossier(t), ts + '.json'), 'utf8')); res.json({ ok: true, copie: j }); }
  catch (e) { res.status(500).json({ error: 'copie illisible' }); }
});
/* L'application demande ses ordres : au démarrage, au retour au premier plan, tous les quarts d'heure. */
app.post('/api/espaces/ordres', (req, res) => {
  const b = req.body || {}; const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
  if (!t) return res.status(400).json({ error: 't requis' });
  if (espaceFerme(t)) return res.status(403).json({ error: 'espace fermé' });
  const ok = espaceCleOk(t, kh); if (ok === null) return res.status(404).json({ error: 'espace inconnu' }); if (!ok) return res.status(403).json({ error: 'clé d\'équipe incorrecte' });
  /* ⛔ LA CLÉ PARTAGÉE NE PROUVE RIEN, ET CETTE ROUTE SERT DÉSORMAIS DES ÉQUIVALENTS DE MOT DE
     PASSE. `cleEstPublique(t)` est vraie quand la clé de l'espace est celle écrite EN CLAIR dans
     `app.html` : la présenter ne prouve rien, et le nom d'une entreprise se lit sur un camion.
     ⚠️ MAIS ON NE FERME QUE LA MOITIÉ QUI PORTE UN SECRET. Refuser la route entière couperait
     aussi les SUPPRESSIONS d'une entreprise restée sur cette clé — un changement de comportement
     pour elle, le jour du déploiement, sans rapport avec ce qu'on ajoute. Les suppressions ne
     donnent rien à qui les lit (une liste d'identifiants qu'on connaît déjà en devinant le nom
     de l'entreprise) ; les mots de passe, si. On rend donc `mdp: []` et on laisse le reste
     exactement comme avant. (Garde signalée par `gardien` le 15 septembre 2026.) */
  const secretOk = !cleEstPublique(t);
  /* `suppressions` garde son nom et son sens exacts : une application d'avant le 15 septembre
     2026 lit ce champ et ignore le reste, donc elle continue de marcher sans rien recevoir
     qu'elle ne sache traiter. */
  res.json({ ok: true, suppressions: ordresServis(t), mdp: secretOk ? ordresMdp(t) : [] });
});
app.post('/api/espaces/ordre-fait', (req, res) => {
  const b = req.body || {}; const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
  if (!t) return res.status(400).json({ error: 't requis' });
  const ok = espaceCleOk(t, kh); if (ok === null) return res.status(404).json({ error: 'espace inconnu' }); if (!ok) return res.status(403).json({ error: 'clé d\'équipe incorrecte' });
  const lst = x => new Set((Array.isArray(x) ? x : []).map(y => monStr(y, 40).toLowerCase().trim()).filter(Boolean));
  const faits = lst(b.logins), faitsMdp = lst(b.mdp);
  /* ⛔ ON N'ACQUITTE QUE CE QU'ON A FAIT, ET CHAQUE SORTE SÉPARÉMENT. Avant le typage, un
     acquittement de suppression marquait « fait » TOUT ordre portant le même identifiant : un
     mot de passe en attente pour cette personne aurait été classé sans jamais avoir été posé,
     et personne n'aurait rien vu. Une application d'avant le 15 septembre 2026 n'envoie que
     `logins` — elle n'acquitte donc que des suppressions, ce qui est exactement ce qu'elle sait
     faire. */
  let n = 0, nm = 0;
  for (const o of (ordresData[t] || [])) {
    if (o.fait) continue;
    if (estSuppr(o) && faits.has(o.login)) { o.fait = Date.now(); n++; }
    /* ⛔ L'EMPREINTE PART AVEC L'ACQUITTEMENT. C'est un équivalent de mot de passe (voir
       `ordresMdp`) : une fois posée sur la fiche, la garder ne sert plus à rien et transforme
       `ordres.json` en réserve de secrets utilisables. On garde la trace du geste (qui, quand),
       jamais de quoi s'en servir. */
    else if (o.type === 'mdp' && faitsMdp.has(o.login)) { o.fait = Date.now(); delete o.h; nm++; }
  }
  if (n || nm) { ordresSave();
    if (n) console.log('ordre de suppression exécuté :', n, 'compte(s) · espace', t.slice(0, 12));
    if (nm) console.log('ordre de mot de passe exécuté :', nm, 'compte(s) · espace', t.slice(0, 12)); }
  res.json({ ok: true, n, nm });
});
/* Le patron peut rendre un identifiant à l'entreprise (un nouveau salarié qui porte le même) :
   c'est la seule façon de lever le ban — jamais un appareil. */
app.post('/api/monitor/compte/reautoriser', monPatronStrict, (req, res) => {
  const b = req.body || {}; const t = monStr(b.t, 80), login = monStr(b.login, 40).toLowerCase().trim();
  if (!t || !login) return res.status(400).json({ error: 't et login requis' });
  /* ⛔ `estSuppr` : un ordre de MOT DE PASSE n'est pas un ban. Sans ce filtre, la route rendait
     `ok:true` sur un compte qui n'en avait aucun, posait `banni:false` sur l'ordre de mot de
     passe — et ne réparait rien, puisque le gel d'annuaire ignore `banni`. La Tour disait
     « réautorisé » sur une opération qui n'avait rien fait. */
  let n = 0; for (const o of (ordresData[t] || [])) { if (estSuppr(o) && o.login === login && o.banni !== false) { o.banni = false; n++; } }
  if (!n) return res.status(404).json({ error: 'aucun ban pour cet identifiant' });
  ordresSave(); monLog((req.tourUser && req.tourUser.nom) || 'patron', true, req, 'identifiant réautorisé');
  res.json({ ok: true });
});
/* ══ ANNULER UN MOT DE PASSE ORDONNÉ — la porte de sortie, et elle est obligatoire ══════════
   Tant qu'un ordre de mot de passe est vivant, l'annuaire de ce compte est GELÉ sur l'empreinte
   écrite par la Tour : aucun dépôt de l'entreprise ne le change (voir /api/espaces/comptes).
   C'est ce qui rend l'opération sûre dans n'importe quel ordre d'arrivée — et c'est aussi ce qui
   enfermerait quelqu'un si l'ordre n'était jamais exécuté. Les trente jours de péremption
   suffisent à ne plus enfermer PERSONNE À VIE ; ils ne suffisent pas à dépanner quelqu'un tout
   de suite. D'où cette route : le patron abandonne l'ordre, le gel tombe immédiatement, et
   l'entreprise reprend la main sur son annuaire dès son prochain dépôt.
   (Manquait à la livraison du 15 septembre 2026 — signalé par `gardien` avant déploiement.) */
app.post('/api/monitor/compte/mdp-annuler', monPatronStrict, (req, res) => {
  const b = req.body || {}; const t = monStr(b.t, 80), login = monStr(b.login, 40).toLowerCase().trim();
  if (!t || !login) return res.status(400).json({ error: 't et login requis' });
  /* On marque `fait` plutôt que de retirer la ligne : la trace du geste reste (qui, quand), et
     l'empreinte part — c'est un équivalent de mot de passe, il n'a plus rien à faire là. */
  let n = 0; for (const o of (ordresData[t] || [])) { if (o && o.type === 'mdp' && o.login === login && !o.fait) { o.fait = Date.now(); o.annule = 1; delete o.h; n++; } }
  if (!n) return res.status(404).json({ error: 'aucun mot de passe en attente pour cet identifiant' });
  if (!ordresSave()) return res.status(500).json({ error: 'annulation non enregistrée — réessaie' });
  monLog((req.tourUser && req.tourUser.nom) || 'patron', true, req, 'mot de passe ordonné annulé');
  res.json({ ok: true, n });
});
/* Résumé lisible d'un espace : dernière connexion, utilisateurs et appareils actifs, échecs, versions */
function cnxResume(t) {
  const l = cnxData[t] || []; const now = Date.now(), j7 = now - 7 * 86400000, j30 = now - 30 * 86400000, h24 = now - 86400000;
  const z = zeroDe(t);   // filigrane de remise à zéro (voir ZERO_PATH) : jamais une suppression
  /* ⛔ LE FILIGRANE VAUT POUR TOUT, PAS SEULEMENT POUR LES ÉCHECS.
     Défaut trouvé le 17 septembre 2026, sur une capture de Justin : il avait supprimé des
     entreprises deux jours plus tôt, et la Tour affichait toujours « 4 pers. / 7 j » sur
     l'espace par défaut. Normal — la fenêtre fait SEPT jours, elle contenait encore les
     connexions d'AVANT la suppression. Mais le bouton « remise à zéro », lui, ne remettait à
     zéro QUE `echecs24` : appuyer dessus ne changeait rien à ce qu'on regardait.
     Un bouton qui ne fait pas ce qu'il promet est pire qu'un bouton absent — on appuie, il ne
     se passe rien, et on conclut que l'écran est cassé. Le filigrane s'applique donc à TOUS
     les compteurs de cette fiche.
     ⚠️ Il n'EFFACE toujours rien : `l` garde tout l'historique sur disque, et « Annuler »
     rend la totalité. Le jour où un incident ressort, on peut remonter avant la remise à zéro. */
  const ok = l.filter(e => (e.ev === 'connexion' || e.ev === 'session') && e.ts > z);
  const u7 = new Set(ok.filter(e => e.ts > j7 && e.login).map(e => e.login)), u30 = new Set(ok.filter(e => e.ts > j30 && e.login).map(e => e.login));
  const d7 = new Set(ok.filter(e => e.ts > j7 && e.dev).map(e => e.dev));
  const echecs24 = l.filter(e => e.ev === 'echec' && e.ts > h24 && e.ts > z).length;
  const versions = {}; const vuDev = new Set();
  ok.forEach(e => { if (!e.dev || vuDev.has(e.dev) || !e.version) return; vuDev.add(e.dev); versions[e.version] = (versions[e.version] || 0) + 1; });
  const apps = {}; ok.forEach(e => { if (e.ts > j30) apps[e.app || 'gestion'] = (apps[e.app || 'gestion'] || 0) + 1; });
  const appareils = {}; ok.forEach(e => { if (e.ts > j30 && e.appareil) appareils[e.appareil] = (appareils[e.appareil] || 0) + 1; });
  const dern = ok[0] || null;
  return { total: l.length, derniere: dern ? dern.ts : 0, dernierLogin: dern ? dern.login : '', utilisateurs7: u7.size, utilisateurs30: u30.size, appareils7: d7.size,
    echecs24, connexions7: ok.filter(e => e.ts > j7).length, versions, apps, appareils };
}
// la Tour : détail des connexions d'une entreprise
app.post('/api/monitor/espaces/connexions', monAdmin, (req, res) => {
  const slug = espSlug(monStr((req.body || {}).nom, 80));   // borné : voir /api/espaces/ouvrir
  const e = espacesReg[slug];
  let t = e ? e.t : ''; try { if (e && !t) t = String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t || ''); } catch (err) {}
  if (!t) t = monStr((req.body || {}).t, 80);
  if (!t) return res.status(404).json({ error: 'Espace inconnu — génère d\'abord son lien de connexion' });
  res.json({ ok: true, t, resume: cnxResume(t), evenements: (cnxData[t] || []).slice(0, parseInt((req.body || {}).n, 10) || 60) });
});
// la Tour : toutes les entreprises d'un coup, triées par dernière connexion
/* ══ TOUTES LES ENTREPRISES, UNE SEULE LISTE ════════════════════════════════════════════
   Le vrai problème de la console n'était pas d'afficher : c'était de RETROUVER. Une même
   entreprise pouvait exister dans quatre endroits sans apparaître dans les trois autres :
     · clientsData  — remplis à la première connexion sur le site, et là seulement ;
     · espacesReg   — les espaces dont on a généré le lien ;
     · cnxData      — TOUT espace qui s'est connecté un jour, annuaire ou pas. La source la
                      plus complète, et la seule qui voyait les « espaces hors annuaire » ;
     · Firebase     — les comptes créés sur le site, même sans espace derrière.
   D'où des entreprises visibles dans un écran et absentes de l'autre, et l'impression que la
   console en perdait. Ici on part de cnxData et espacesReg réunis — rien de ce qui a vécu ne
   peut manquer — et on accroche à chaque ligne de quoi décider sans changer d'écran :
   formule, code promo et son échéance, activité, échecs de connexion, erreurs.
   Le journal des bugs est lu UNE fois et compté par espace : une lecture par entreprise
   aurait relu un fichier de plusieurs mégaoctets autant de fois qu'il y a de clients. */
app.get('/api/monitor/entreprises', monAdmin, (req, res) => {
  const aujourdhui = new Date().toISOString().slice(0, 10);

  // 1. les erreurs, comptées en une passe
  const erreursPar = {};
  try {
    for (const l of fs.readFileSync(BUGS_PATH, 'utf8').trim().split('\n')) {
      /* Le filigrane (voir ZERO_PATH) : on ne compte que ce qui est arrivé APRÈS la remise à
         zéro de cet espace. Rien n'est effacé du fichier. */
      try { const b = JSON.parse(l); if (b && b.team && (+b.ts || 0) > zeroDe(b.team)) erreursPar[b.team] = (erreursPar[b.team] || 0) + 1; } catch (err) {}
    }
  } catch (err) {}

  // 2. les codes promo, indexés par espace
  const promoPar = {};
  for (const [code, u] of Object.entries(promoUsages || {})) {
    for (const [t, x] of Object.entries((u && u.equipes) || {})) {
      if (!x || !x.finLe) continue;
      const actif = x.finLe >= aujourdhui;
      if (!promoPar[t] || (actif && !promoPar[t].actif)) promoPar[t] = { code, finLe: x.finLe, actif, depuis: x.date || '' };
    }
  }

  // 3. les comptes du site, indexés par adresse
  const compteParMail = {};
  for (const [mail, c] of Object.entries(clientsData || {})) compteParMail[String(mail).toLowerCase()] = c;

  /* La clé par défaut d'app.html. Elle est servie publiquement par GitHub Pages, donc la
     connaître ici n'ajoute AUCUN secret — c'est justement le problème qu'elle pose. On ne s'en
     sert que pour RÉPONDRE À UNE QUESTION : cet espace a-t-il sa propre clé, ou partage-t-il
     celle que tout le monde peut lire ? ⛔ Ne JAMAIS la modifier, ici ou ailleurs : elle
     déchiffre les données de toutes les entreprises qui n'en ont pas reçu d'autre. */
  /* Une SEULE définition de l'état d'une clé dans tout le fichier (cleEtat, en haut, à côté
     d'espaceCleOk) : la route du jeton d'équipe s'en sert pour REFUSER les espaces restés sur
     la clé partagée, et deux définitions finiraient par diverger — le compteur de la Tour
     dirait une chose et la porte en ferait une autre. On rend l'ÉTAT, jamais la clé : cette
     route est en monAdmin, un cran sous le patron. */
  const vus = new Set(); const liste = [];
  const pousser = (t, slug, e) => {
    if (!t || vus.has(t)) return; vus.add(t);
    const r = cnxResume(t);
    const mail = String((e && e.email) || '').toLowerCase();
    const cli = mail ? compteParMail[mail] : null;
    liste.push({
      t, slug: slug || '',
      nom: (e && e.nom) || slug || '',
      email: mail,
      /* D'où elle vient décide ce qu'on a le droit d'en faire : une cliente inscrite sur le
         site ne se supprime pas comme un espace d'essai qu'on s'est ouvert. */
      origine: e ? (e.origine || (cli ? 'site' : 'tour')) : 'hors-annuaire',
      dansAnnuaire: !!e,
      formule: (e && e.formule) || (cli && cli.formule) || '',
      opMessages: !!(e && e.opMessages),
      /* La question qui décide du chantier « un teamId par entreprise » : celles qui ont déjà
         leur clé n'ont rien à migrer. Booléen seulement — la clé ne sort pas d'ici. */
      cleePropre: cleEtat(e) === 'propre',
      cleEtat: cleEtat(e),   // 'propre' | 'partagee' | 'inconnue' — la Tour ne doit plus confondre les deux derniers
      /* ⛔ CE N'EST PAS UNE ENTREPRISE — 14 septembre 2026, demandé par Justin : « pourquoi
         elan-gestion est dans la Tour de contrôle alors que c'est pour le code et pas un
         client ». Parce que cette liste part de DEUX sources : l'annuaire, et tout espace qui
         s'est déjà connecté (la boucle sur cnxData, plus bas). L'espace par DÉFAUT de
         l'application s'y connecte comme les autres — il entrait donc dans la liste, et dans
         le total, sans que rien ne dise sa nature.
         La Tour le savait déjà, mais par une copie de ESPACES_INTOUCHABLES écrite chez elle,
         avec la note « le jour où le serveur renverra le champ, on l'utilisera ». Le voici :
         la nature d'un espace se décide ici, au seul endroit qui définit la liste. */
      technique: ESPACES_INTOUCHABLES.includes(t),
      suspendu: entFermes.espaces.includes(t),
      promo: promoPar[t] || null,
      metier: (cli && cli.metier) || '',
      derniere: r.derniere || 0,
      utilisateurs7: r.utilisateurs7 || 0,
      appareils7: r.appareils7 || 0,
      echecs24: r.echecs24 || 0,
      versions: r.versions || {},
      erreurs: erreursPar[t] || 0,
      /* Depuis quand les compteurs repartent (0 = jamais remis à zéro). La Tour en a besoin
         pour le DIRE : un « 0 erreur » qui vient d'une remise à zéro et un « 0 erreur » qui
         veut dire « rien ne plante » ne sont pas la même information. */
      zeroDepuis: zeroDe(t),
      comptesAnnuaire: Object.keys((comptesReg[t] && comptesReg[t].c) || {}).length
    });
  };
  for (const [slug, e] of Object.entries(espacesReg)) {
    let t = e.t; try { if (!t) t = String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t || ''); } catch (err) {}
    pousser(t, slug, e);
  }
  /* Les espaces qui se sont connectés sans être dans l'annuaire : ce sont eux qu'on « perdait ».
     Ils existent, ils ont des utilisateurs et parfois des erreurs — les ignorer, c'est croire
     que la console montre tout alors qu'elle montre la moitié. */
  for (const t of Object.keys(cnxData)) pousser(t, '', null);

  liste.sort((a, b) => (b.derniere || 0) - (a.derniere || 0));
  /* Un compte sans OP GESTION ne voit de l'annuaire que ce qui sert OP MESSAGES : les entreprises
     où elle est ouverte, avec de quoi les reconnaître ; les autres réduites au nom — il faut pouvoir
     en ouvrir une. Formule, promo, clé, versions, erreurs, échecs : jamais à ce compte. */
  if (!req.tourUser.apps.includes('gestion')) {
    const proj = liste.map(x => x.opMessages
      ? { t: x.t, slug: x.slug, nom: x.nom, email: x.email, opMessages: true, suspendu: x.suspendu, origine: x.origine, derniere: x.derniere }
      : { t: x.t, slug: x.slug, nom: x.nom, opMessages: false });
    /* Même règle pour un compte sans OP GESTION : son total comptait l'espace par défaut
       exactement comme celui du patron. La projection ne porte pas `technique` (rien ne
       l'affiche de ce côté), on filtre donc sur la liste d'origine. */
    const projVraies = liste.filter(x => !x.technique).length;
    return res.json({ ok: true, entreprises: proj, total: projVraies, opMessages: proj.filter(x => x.opMessages).length });
  }
  /* Les espaces techniques restent DANS `entreprises` — la Tour a son pavé à part pour les
     montrer, et les retirer d'ici les rendrait invisibles au lieu de les nommer. Mais ils
     sortent de TOUS les compteurs : « 5 entreprises connues » dont une qui n'est pas une
     entreprise, c'est le chiffre qui a fait croire à Justin qu'il avait un client de plus,
     puis qu'un espace lui échappait. Un compteur nomme ce qu'il compte. */
  const vraies = liste.filter(x => !x.technique);
  res.json({
    ok: true, entreprises: liste, total: vraies.length,
    techniques: liste.length - vraies.length,
    horsAnnuaire: vraies.filter(x => !x.dansAnnuaire).length,
    avecErreurs: vraies.filter(x => x.erreurs > 0).length,
    avecEchecs: vraies.filter(x => x.echecs24 > 0).length
  });
});

app.get('/api/monitor/connexions', monAdmin, (req, res) => {
  const vus = new Set(); const sortie = [];
  for (const [slug, e] of Object.entries(espacesReg)) {
    let t = e.t; try { if (!t) t = String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t || ''); } catch (err) {}
    if (!t || vus.has(t)) continue; vus.add(t);
    sortie.push({ slug, nom: e.nom || slug, t, formule: e.formule || '', technique: ESPACES_INTOUCHABLES.includes(t), resume: cnxResume(t) });
  }
  /* Même champ que /api/monitor/entreprises, et pour la même raison : cette liste part aussi de
     DEUX sources — l'annuaire et tout espace qui s'est connecté — donc l'espace par défaut de
     l'application y figure comme les autres. « Connexions clients » le comptait parmi les
     entreprises actives, et Justin le lisait comme un client de plus. */
  for (const t of Object.keys(cnxData)) { if (vus.has(t)) continue; vus.add(t); sortie.push({ slug: '', nom: '(espace hors annuaire) ' + t, t, formule: '', technique: ESPACES_INTOUCHABLES.includes(t), resume: cnxResume(t) }); }
  sortie.sort((a, b) => (b.resume.derniere || 0) - (a.resume.derniere || 0));
  const now = Date.now(); const tous = [].concat(...Object.values(cnxData));
  /* ⚠️ `actives7` ne compte que les VRAIES entreprises — mais les espaces techniques restent
     dans `espaces` : l'écran les montre à part, nommés. Les retirer d'ici les rendrait
     invisibles, et c'est justement l'invisibilité qui a laissé cinq personnes travailler une
     semaine sur l'espace partagé sans que rien ne le signale. */
  const vraies = sortie.filter(x => !x.technique);
  res.json({ ok: true, espaces: sortie, global: { connexions24: tous.filter(e => e.ts > now - 86400000 && e.ev !== 'echec').length, echecs24: tous.filter(e => e.ts > now - 86400000 && e.ev === 'echec').length, actives7: vraies.filter(x => x.resume.derniere > now - 7 * 86400000).length, techniques: sortie.length - vraies.length } });
});
// repartir à neuf : libère le nom et EFFACE l'ancien espace (données Firestore comprises),
// SANS bloquer l'entreprise — elle repart aussitôt sur un espace propre et vide
/* ⛔ « REPARTIR À NEUF » EFFACE UNE ENTREPRISE AUTANT QU'UNE SUPPRESSION (`gardien`, 27 septembre 2026, B3).
   Document chiffré, base du socle, copie de `documents.js`, pièces jointes, annuaire de connexion : tout
   part — seule la fermeture manque. Cette route passait pourtant sans avis et hors compteur : une session
   volée bouclait sur les noms de l'annuaire et vidait toutes les entreprises en silence. Elle suit donc
   le régime des deux routes d'entreprise : un avis après, une entreprise au compteur, et au-delà de trois
   en 24 heures le code — que seule une Tour qui confirme (`confirme:true`, v2.69) sait demander. La Tour
   d'avant n'envoie ni l'un ni l'autre : elle croit « ok » et fabrique aussitôt l'espace neuf. À elle, au-delà
   de la limite, on REFUSE (429) : un `codeEnvoye` lui ferait créer un espace neuf à côté d'un ancien qui
   n'a PAS été effacé. Et l'espace partagé de l'application n'est pas une entreprise : 403. */
app.post('/api/monitor/espaces/renaitre', monPatronStrict, async (req, res) => {
  const t0 = Date.now();
  const b = req.body || {};
  const slug = espSlug(monStr(b.nom, 80));   // borné : voir /api/espaces/ouvrir
  if (!espacesReg[slug]) return res.json({ ok: true, rien: true });
  if (ESPACES_INTOUCHABLES.includes(espaceT(espacesReg[slug]))) return res.status(403).json({ error: REFUS_INTOUCHABLE });
  const codeRecu = monStr(b.code, 10).trim();
  const confirme = b.confirme === true;
  if (!supprMailPret()) return res.status(503).json({ error: SUPPR_PAS_DE_MAIL });
  if (!(await supprRattraper())) return res.status(503).json({ error: SUPPR_AVIS_BLOQUE });
  const e = espacesReg[slug];   // relu APRÈS l'attente : une autre requête a pu passer
  if (!e) return res.json({ ok: true, rien: true });
  const t = espaceT(e);
  if (ESPACES_INTOUCHABLES.includes(t)) return res.status(403).json({ error: REFUS_INTOUCHABLE });
  const nomE = uneLigne(espNomPropre(e), 80) || slug;
  const nEnt = t ? 1 : 0;   // un nom sans espace lisible derrière : rien d'effacé, rien au compteur
  const limite = nEnt > 0 && supprEntLimite(nEnt);
  const cle = 'r:' + slug + ':' + t;
  if (limite && supprDestLisible()) return res.status(409).json({ error: supprLisibleTxt(nEnt), limite: true, lisible: true });
  if (limite && !codeRecu) {
    if (!confirme) return res.status(429).json({ limite: true, error: 'Rien n\'a été effacé : ' + supprLimiteRaison(nEnt)
      + ', et « Repartir à neuf » efface toutes les données de l\'espace. Il faut désormais un code par e-mail, que cette version de la Tour ne sait pas demander.'
      + supprQuandTxt(nEnt) });
    if (retraitCodes.size > 500) for (const [k, v] of retraitCodes) if (Date.now() > v.exp) retraitCodes.delete(k);
    const code = String(crypto.randomInt(100000, 1000000));
    retraitCodes.set(cle, { code, exp: Date.now() + 10 * 60000, tries: 0 });
    const dest = supprDest();
    try {
      await mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: dest,
        confidentiel: true, trace: 'code de « repartir à neuf » · espace ' + t.slice(0, 12),
        subject: '🗑 Code de confirmation — « ' + nomE + ' » repart à neuf',
        text: 'Tu es sur le point de faire REPARTIR À NEUF « ' + nomE + ' » (' + t + ') : son espace actuel et TOUTES ses données sont effacés, '
          + 'ses comptes et son code d\'accès aussi. L\'entreprise n\'est pas fermée : elle repart sur un espace vide.\n\n'
          + supprLimiteTxt(nEnt) + 'Code de confirmation : ' + code + '\n\nValable 10 minutes.\nSi ce n\'est pas toi, ignore ce message.' });
    } catch (err) { return res.status(500).json({ error: 'envoi du code impossible : ' + sansAdresses(String(err.message)).slice(0, 120) }); }
    return res.json({ ok: true, codeEnvoye: true, limite: true, pourquoi: supprLimiteRaison(nEnt), dest: masqueMail(adrNue(dest)) });
  }
  if (codeRecu) {   // le code revient (au-delà de la limite) — vérifié même si la limite s'est levée entre-temps
    const c = retraitCodes.get(cle);
    if (!c || Date.now() > c.exp) { retraitCodes.delete(cle); return res.status(400).json({ error: 'code expiré — recommence' }); }
    c.tries++; if (c.tries > 5) { retraitCodes.delete(cle); return res.status(429).json({ error: 'trop d\'essais — recommence' }); }
    if (codeRecu !== c.code) return res.status(400).json({ error: 'code incorrect (' + (6 - c.tries) + ' essai(s) restants)' });
  }
  retraitCodes.delete(cle);
  /* ⛔ UN CODE PROMO NE SERT QU'UNE FOIS PAR ENTREPRISE, ET « REPARTIR À NEUF » NE L'OUBLIE PAS
     (Justin, 24 septembre 2026) : ses utilisations passées portent désormais son adresse et
     l'empreinte de son e-mail, AVANT que l'annuaire ne les oublie (voir `promoPresente`). */
  if (t) promoMarquerAvantRenaitre(t, slug, e.email);
  delete espacesReg[slug];
  /* ÉCRIT, OU RIEN : l'annuaire d'abord, et un refus du disque arrête tout AVANT d'effacer — sinon les
     données partaient pendant que le nom restait, au redémarrage, sur un espace vide. */
  if (!espacesEcrire()) { espacesReg[slug] = e; return res.status(500).json({ error: 'L\'annuaire n\'a pas pu être enregistré — rien n\'a été effacé. Vérifie le serveur (disque plein ?) avant de recommencer.' }); }
  let ecrit = true;
  if (t && accesReg[t]) { delete accesReg[t]; if (!accesEcrire()) ecrit = false; }   // l'espace repart à neuf : son code aussi
  if (t && comptesReg[t]) { delete comptesReg[t]; if (!comptesEcrire()) ecrit = false; }   // et son annuaire de connexion : sinon d'anciens identifiants ouvrent le nouvel espace
  const rang = nEnt ? supprEntCompter(nEnt) : 0;   // l'annuaire est écrit : l'effacement a commencé, il compte
  let efface = false;
  if (t) {
    let tok = await fbAdminJeton(), viaAdmin = !!tok;
    if (!tok) { try {
      const r0 = await fetch(IDTK_URL + '/accounts:signUp?key=' + ((config.firebase && config.firebase.apiKey) || 'AIzaSyAbah03sO4f4LyNhvmig0Pn00lz1sHSpT8'),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' });
      tok = ((await r0.json().catch(() => ({}))).idToken) || '';
    } catch (err) {} }
    if (tok) { try {
      const r = await fbAdminFetch(FIRESTORE_URL + '/projects/' + FB_PROJET + '/databases/(default)/documents/elan_teams/' + encodeURIComponent(t), { method: 'DELETE' }, tok);
      efface = r.ok;
    } catch (err) { console.error('renaitre effacement :', err.message); } }
    /* Et sa copie CHEZ NOUS (`documents.js`), sans condition : c'est nous qui la tenons, aucun
       réseau ne peut la faire échouer. Oubliée, l'ancienne entreprise renaîtrait ici. */
    if (documentsMod) { try { await documentsMod.effacer(t); } catch (err) {} }
  }
  /* ⛔ LA QUATRIÈME PORTE, trouvée par `gardien` le 11 septembre. Celle-ci n'ajoute PAS à
     `entFermes` — elle fait repartir un espace à neuf — mais elle efface le document Firestore
     de l'ancien et le retire de l'annuaire. Sans coupure, l'appareil ne peut plus obtenir de
     NOUVEAU jeton (404, espace inconnu) mais garde sa session renouvelable POUR TOUJOURS et
     repousse toute la base : l'ancien espace renaît hors annuaire, orphelin. C'est exactement
     la genèse que ce fichier décrit plus bas. Ici l'ajouter est gratuit : l'ancien espace est
     mort, personne n'a besoin de sa session. */
  const cut = t ? await fbRevoquerEquipe(t) : { fait: true, motif: 'aucun ancien espace' };
  /* ⛔ ON COUPE PUIS ON EFFACE — les deux, comme les trois autres portes. Celle-ci n'effaçait
     pas, et c'est précisément la porte qui, dix lignes plus haut, supprime le document Firestore
     de l'ancien espace et le retire des registres : la base du socle serait restée sur le
     disque avec toutes ses données et sa clé, **sans qu'aucun registre ne porte plus ce `t`** —
     un orphelin que personne ne saurait plus rattacher à une entreprise, donc que personne
     n'effacerait jamais. C'est le mot pour mot du commentaire voisin sur les pièces jointes. */
  const cutSocle = socleCouper(t, 'repartir à neuf'); if (!cutSocle.fait) { cut.fait = false; cut.motif = (cut.motif || '') + ' — ' + cutSocle.motif; }
  if (t) { const efS = socleEffacer(t); if (!efS.ok) { cut.fait = false; cut.motif = (cut.motif || '') + ' — ' + efS.motif; } }
  /* ⛔ ET SES PIÈCES JOINTES (16 septembre 2026). Cette porte-ci efface le document de
     l'ANCIEN espace : les photos qu'il avait déposées doivent partir avec, sinon elles
     survivent à un espace que plus rien ne référence — un orphelin que personne ne saura plus
     rattacher à une entreprise, donc que personne n'effacera jamais. */
  let piecesEffacees = 0;
  if (t && pieces) { try { piecesEffacees = pieces.effacerEntreprise(t); } catch (e2) { console.error('renaitre pièces :', e2.message); } }
  console.log('Tour :', req.tourUser.nom, 'fait repartir « ' + slug + ' » à neuf — ancien espace', t, efface ? 'effacé' : 'NON effacé', '· pièces :', piecesEffacees);
  monLog((req.tourUser && req.tourUser.nom) || 'patron', true, req, '« repartir à neuf » · ' + (codeRecu ? 'par code' : 'confirmée'));
  const ennuis = [];
  if (!ecrit) ennuis.push('le code d\'accès ou l\'annuaire de connexion n\'a pas pu être réécrit sur le disque — d\'anciens identifiants peuvent encore ouvrir un espace, jusqu\'au prochain redémarrage.');
  if (t && !efface) ennuis.push('le document chiffré n\'a pas pu être effacé chez Firebase.');
  if (!cut.fait) ennuis.push('les sessions n\'ont pas pu être coupées (' + uneLigne(cut.motif, 160) + ').');
  const avis = await supprAvis(req, { t0, confirme: !codeRecu, confirmeTxt: 'dans la Tour', rang, n: nEnt,
    trace: '« repartir à neuf » · ' + (codeRecu ? 'par code' : 'confirmée'),
    sujet: '🗑 Tour — « ' + nomE + ' » repart à neuf (ancien espace effacé)',
    quoi: t ? 'l\'espace de « ' + nomE + ' » (' + t + ') — effacé pour repartir à neuf : ses données, ses comptes de connexion, son code d\'accès et ses pièces jointes. L\'entreprise n\'est pas fermée : un espace neuf et vide lui est recréé.'
      : 'l\'entrée d\'annuaire « ' + nomE + ' » — retirée ; aucun espace lisible derrière, aucune donnée effacée.',
    attention: ennuis.join(' ') });
  res.json({ ok: true, supprime: true, ancien: t, efface, piecesEffacees, coupure: cut.fait, coupureMotif: cut.motif, ecrit, avis });
});
// le patron active un code promo pour une entreprise, directement depuis la Tour
app.post('/api/monitor/espaces/promo', monPatronStrict, (req, res) => {
  const slug = espSlug(monStr((req.body || {}).nom, 80));   // borné : voir /api/espaces/ouvrir
  const e = espacesReg[slug];
  if (!e) return res.status(404).json({ error: 'Espace inconnu — génère d\'abord son lien de connexion' });
  let t = e.t; try { if (!t) t = String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t || ''); } catch (err) {}
  if (!t) return res.status(400).json({ error: 'espace illisible' });
  const c = monStr((req.body || {}).code, 40).trim().toUpperCase();
  if (!c) return res.status(400).json({ error: 'Entre le code promo' });
  const p = (config.promos || []).find(x => String(x.code || '').trim().toUpperCase() === c);
  if (!p) return res.status(404).json({ error: 'Code promo inconnu' });
  /* ⛔ UN CODE SERT UNE FOIS PAR ENTREPRISE, MÊME DEPUIS LA TOUR (Justin, 24 septembre 2026 — voir
     `promoPresente`). Pour offrir une nouvelle période à une entreprise qui a déjà servi ce code,
     la Tour a son propre geste : l'abonnement réglé à la main (« Essai offert », avec une date de fin). */
  const pres = promoPresente(c, t, slug);
  if (pres.etat === 'indisponible') return res.status(503).json({ error: 'Registre des codes promo illisible (promos-usages.json) — rien n\'est activé tant qu\'il n\'est pas réparé. Journal : grep ILLISIBLE.' });
  if (pres.etat === 'servi')
    return res.status(410).json({ error: promoRefusServi(c, pres.finLe) + ' Pour lui offrir une nouvelle période : Abonnement → « Essai offert », avec une date de fin.', dejaUtilise: true, finLe: pres.finLe });
  if (pres.etat === 'neuf') {
    for (const [c2] of Object.entries(promoUsages || {})) {   // un seul code à la fois (par l'adresse aussi : voir `promoServiA`)
      const eq2 = c2 !== c ? promoServiA(c2, t, slug) : null;
      if (eq2 && eq2.finLe && eq2.finLe >= promoAujourdhui())
        return res.status(409).json({ error: 'Un code (« ' + c2 + ' ») est déjà actif pour cette entreprise jusqu\'au ' + promoDateFr(eq2.finLe) });
    }
  }
  const u = promoUsages[c] || { n: 0, equipes: {} };
  let finLe;
  if (pres.etat === 'actif') finLe = pres.finLe;   // déjà en cours : la même échéance, rien ne se recompte
  else {
    if (p.maxUtilisations && u.n >= p.maxUtilisations) return res.status(410).json({ error: 'Ce code a atteint son maximum d\'utilisations' });
    const d = new Date(); d.setMonth(d.getMonth() + Math.max(1, Number(p.mois) || 1));
    finLe = d.toISOString().slice(0, 10);
    const neufU = !promoUsages[c]; u.n++; u.equipes[t] = promoEntree(finLe, t, slug); promoUsages[c] = u;
    if (!savePromoUsages()) { u.n--; delete u.equipes[t]; if (neufU) delete promoUsages[c];   // écrit, ou on le dit — voir /api/promo/valider
      return res.status(503).json({ error: 'Le registre des codes (promos-usages.json) n\'a pas pu être écrit — rien n\'est activé. Journal : « non écrit ».' }); }
    mailPromoActive(t, c, finLe, ['pro', 'business', 'premium'].includes(p.formule) ? p.formule : 'premium');
  }
  e.codePromo = c;
  const f = ['pro', 'business', 'premium'].includes(p.formule) ? p.formule : 'premium';
  const fE = facturationDe(e).formule;   // (celle de l'ENTREPRISE : un autre de ses noms peut porter mieux)
  if (!fE || fE === 'gratuit') { e.formule = f; e.quantite = e.quantite || 1; e.formulePar = req.tourUser.nom + ' (code)'; e.formuleTs = Date.now(); }
  espacesEcrire();
  console.log('Tour :', req.tourUser.nom, 'active le code', c, 'pour', slug, '→ fin', finLe);
  res.json({ ok: true, code: c, formule: e.formule, finLe, dejaUtilise: pres.etat === 'actif' });
});
// le patron envoie au client son lien + identifiants de départ (bel e-mail TeamOP)
// ── 📣 ANNONCE DE MISE À JOUR : un e-mail à TOUTES les entreprises ──
//    Le texte de l'annonce vit ici ; le patron déclenche l'envoi depuis la Tour.
//    Une seule adresse par entreprise (dédoublonnée), tout passe par le beau
//    gabarit TeamOP et le journal des e-mails.
const ANNONCE = {
  version: '767',
  sujet: '🆕 OP GESTION : l\'application de votre métier, et du nouveau sur l\'abonnement',
  intro: 'Bonjour,<br>votre application OP GESTION vient d\'être mise à jour. La nouvelle version s\'installe d\'elle-même, sans interrompre une saisie, et un message le confirme à l\'ouverture suivante.',
  points: [
    ['🧰 L\'application de votre métier', 'OP GESTION connaît désormais treize métiers : 3D (hygiène anti-nuisibles), plomberie, électricité, chauffage et climatisation, serrurerie, nettoyage, maçonnerie, menuiserie, peinture, espaces verts, couverture, multiservices et autres métiers de terrain. Les types d\'intervention, les prestations et les relevés suivent le vôtre. Rien ne change tant que vous n\'avez rien demandé : pour régler le vôtre, écrivez à contact@teamop.fr.'],
    ['📅 Les contrats à renouveler', 'L\'écran Contrats montre ceux qui arrivent à échéance — « Fin dans 12 j », « Échu » sur chaque ligne — et la cloche le rappelle aux personnes qui gèrent les contrats. Rien ne se renouvelle tout seul : vous gardez la main.'],
    ['💳 Plus de formule gratuite', 'L\'application se sert désormais avec un abonnement ou une période offerte. Une période offerte en cours va jusqu\'à sa date de fin, et un courriel vous le rappelle sept jours avant. Si le paiement s\'arrête, l\'accès est suspendu jusqu\'au règlement : rien n\'est effacé ni perdu, et tout revient dès que c\'est réglé. Seul l\'administrateur de l\'entreprise voit pourquoi, avec le bouton pour régler ; le reste de l\'équipe ne voit aucun message de paiement.']
  ],
  fin: 'Votre adresse et vos identifiants OP GESTION ne changent pas.'
};
app.post('/api/monitor/annonce', monPatronStrict, async (req, res) => {
  if (!mailer) return res.status(503).json({ error: 'e-mail non configuré sur le serveur' });
  // une adresse par entreprise, la plus récente gagne
  const parMail = new Map();
  for (const [slug, e] of Object.entries(espacesReg)) {
    const ad = String(e.email || '').toLowerCase().trim();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ad)) parMail.set(ad, e.nom || slug);
  }
  if (!parMail.size) return res.status(404).json({ error: 'aucune entreprise avec une adresse e-mail' });
  const blocs = ANNONCE.points.map(([t, d]) =>
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7FB;border:1px solid #E3E8F1;border-radius:12px;margin-bottom:10px"><tr><td style="padding:14px 18px">' +
    '<div style="font-size:14px;font-weight:800;color:#17233B;padding-bottom:4px">' + t + '</div>' +
    '<div style="font-size:13px;line-height:1.7;color:#4A5A7A">' + d + '</div></td></tr></table>').join('');
  const texte = 'Bonjour,\n\nvotre application OP GESTION vient de recevoir une mise à jour (v' + ANNONCE.version + ') :\n\n' +
    ANNONCE.points.map(([t, d]) => '• ' + t.replace(/^[^ ]+ /, '') + ' — ' + d.replace(/<[^>]+>/g, '')).join('\n') +
    '\n\nElle est déjà active : rouvrez simplement l\'application.\n\n— L\'équipe TEAM OP · teamop.fr';
  let envoyes = 0, refus = 0;
  for (const [ad, nom] of parMail) {
    try {
      await mailerEnvoi({ diffusion: true, from: config.smtp.from || config.smtp.user, to: ad,
        subject: ANNONCE.sujet, text: texte,
        html: mailTeamOP({ desabo: true, chip: 'Mise à jour', chipBg: '#E7F0FE', chipColor: '#1D4ED8',
          titre: 'Du nouveau dans votre application 🆕',
          corpsHtml: ANNONCE.intro,
          blocHtml: blocs,
          boutonTxt: 'Ouvrir mon application', boutonUrl: 'https://teamop.fr/app.html',
          bouton2Txt: 'Mon espace client', bouton2Url: 'https://teamop.fr/espace.html' }) });
      envoyes++;
    } catch (err) { refus++; console.error('annonce →', ad, ':', String(err.message || err).slice(0, 120)); }
  }
  console.log('Tour :', req.tourUser.nom, 'a envoyé l\'annonce v' + ANNONCE.version, '→', envoyes, 'entreprises', refus ? ('(' + refus + ' refus)') : '');
  res.json({ ok: true, envoyes, refus, version: ANNONCE.version });
});
app.post('/api/monitor/espaces/mail-acces', monPatronStrict, async (req, res) => {
  if (!mailer) return res.status(503).json({ error: 'e-mail non configuré sur le serveur' });
  const slug = espSlug(monStr((req.body || {}).nom, 80));   // borné : voir /api/espaces/ouvrir
  const e = espacesReg[slug];
  if (!e) return res.status(404).json({ error: 'Espace inconnu — génère d\'abord son lien de connexion' });
  if (!e.email) return res.status(400).json({ error: 'aucun e-mail enregistré pour cette entreprise' });
  if (!e.code) return res.status(400).json({ error: 'cet espace n\'a pas de code de connexion — régénère son lien' });
  let a = '', mh = '';
  try { const o = JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')); a = String(o.a || ''); mh = String(o.mh || ''); } catch (err) {}
  /* ⛔ LE MOT DE PASSE PROVISOIRE N'ÉTAIT JAMAIS DANS CE COURRIEL. Ce bloc lisait « m » dans le code de l'espace — or
     la création (`codeMdpHache`, plus haut) le remplace par son empreinte « mh » : `m` était TOUJOURS vide, et le client
     d'un espace neuf recevait « connectez-vous avec vos identifiants habituels », qu'il n'avait pas. Mesuré le
     28 septembre 2026. La Tour qui vient de créer l'espace connaît le mot de passe : elle l'envoie, et on ne le met dans
     le courriel que s'il correspond à l'empreinte enregistrée — la Tour ne peut pas faire partir un mot de passe qui
     n'ouvre rien. Sans lui (Tour ouverte sur un autre appareil), on écrit ce qui est vrai : les identifiants habituels. */
  /* ⛔ `gardien`, même jour : l'empreinte « mh » du code reste celle du mot de passe PROVISOIRE, même après la première
     connexion. Un espace qui a déjà servi recevrait donc un mot de passe qui n'ouvre plus rien : on ne l'envoie que pour
     un espace JAMAIS ouvert (la même condition que `/api/monitor/espaces/identifiants`, lue au même endroit). Et la
     borne est celle de `/identifiants` (200) : à 60, un mot de passe plus long posé là ne se reconnaissait jamais. */
  const tE = espaceT(e);
  const jamaisOuvert = !cnxResume(tE).derniere;
  const mdpDonne = monStr((req.body || {}).mdp, 200);
  const m = (jamaisOuvert && mh && mdpDonne && mdpEmpreinte(mdpDonne) === mh) ? mdpDonne : '';
  /* ⛔⛔ PLUS AUCUN CODE — Justin, 28 septembre 2026 : « je veux plus de code, que des liens pour les connexions ».
     L'adresse et les identifiants suffisent, À UNE CONDITION : que l'espace ait au moins un compte dans son annuaire.
     Sans compte, l'adresse n'ouvre rien, et on n'envoie pas un courriel qui promet une porte fermée. Le semis de la
     création tourne sans attendre (~100 ms de PBKDF2) : un compte encore absent se sème donc ICI, avant de conclure. */
  if (!tE || espaceFerme(tE) || ESPACES_INTOUCHABLES.includes(tE))
    return res.status(409).json({ motif: 'ferme', error: 'Cet espace est fermé (ou n\'est pas un espace d\'entreprise) : aucun lien ne part.' });
  const nComptes = () => { const an = comptesReg[tE]; return (an && an.c) ? Object.keys(an.c).length : 0; };
  /* ⛔ On ne sème QUE sur un espace jamais ouvert (`gardien`) : sur un espace qui a servi et dont l'annuaire est vide
     (dépôt refusé, fichier illisible), semer rouvrirait l'espace avec l'ANCIEN mot de passe provisoire — pour les
     espaces de l'ancienne création automatique, « Nom!! », devinable. Là, c'est un appareil à jour qui le redépose. */
  if (!nComptes() && jamaisOuvert) { try { await annuaireSemerDepuisCode(tE, e.code); } catch (err) {} }
  if (!nComptes())
    return res.status(409).json({ motif: 'sans_compte', error: 'Cet espace n\'a encore aucun compte : son adresse seule n\'ouvre rien. Pose d\'abord ses identifiants de départ (« Identifiants » sur sa fiche), puis renvoie.' });
  /* Sans mot de passe vérifié, le courriel dit « vos identifiants habituels » — ce qui n'est VRAI que pour un espace
     qui a déjà servi. Un espace jamais ouvert dont la Tour n'a pas le mot de passe (montré depuis un autre appareil)
     recevrait une porte sans clé : on refuse et on dit le geste (`/api/monitor/espaces/identifiants` l'accepte tant que
     personne ne s'est connecté — la même condition, lue au même endroit). */
  if (!m && jamaisOuvert)
    return res.status(409).json({ motif: 'mdp_inconnu', error: 'Le mot de passe provisoire de cet espace n\'est pas connu d\'ici (il a été montré sur un autre appareil) et personne ne s\'y est encore connecté : donne-lui-en un nouveau (« Nouveau mot de passe provisoire » sur sa fiche), puis envoie.' });
  const adresse = 'teamop.fr/e/' + (e.slug || slug);
  const escH = (x) => String(x || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const co = (a && m)
    ? '• Identifiant : ' + a + '\n• Mot de passe provisoire : ' + m + '\nÀ votre première connexion, l\'application vous fait choisir votre vrai mot de passe — ensuite ce sont vos identifiants pour toujours.\n'
    : 'Connectez-vous avec vos identifiants habituels.\n';
  const texte = 'Bonjour,\n\nVotre espace « ' + e.nom + ' » est prêt. UNE SEULE ADRESSE à retenir, pour vous et pour toute votre équipe :\n\n' + adresse
    + '\n\nPOUR ENTRER :\n' + co
    + '\nPOUR TOUTE VOTRE ÉQUIPE — la même adresse :\n' + adresse
    + '\n\nChacun y va, tape SON identifiant et SON mot de passe, et arrive dans votre espace. Aucun code, aucun lien à conserver, sur n\'importe quel téléphone. Mettez-la en favori.\nVous créez les comptes de votre équipe dans Utilisateurs.\n\n— L\'équipe TEAM OP · teamop.fr';
  const coHtml = (a && m)
    ? MAIL_BLOCS.ident(escH(a), escH(m)) + '<br>'
    : 'Connectez-vous avec vos <b>identifiants habituels</b>.<br>';
  const html = mailTeamOP({
    chip: 'Accès prêt',
    titre: 'Votre lien de connexion 🔗',
    corpsHtml: 'Bonjour,<br>votre espace « <b>' + escH(e.nom) + '</b> » est prêt.<br><br><b>Une seule adresse à retenir</b>, pour vous et pour toute votre équipe :<br><a href="https://' + adresse + '" style="color:#34A97E;font-size:19px;font-weight:700">' + adresse + '</a><br><br><b>Pour entrer :</b><br>' + coHtml
      + '<br><b>Pour toute votre équipe — la même adresse.</b><br><span style="color:#8fa3c8;font-size:13px">Chacun y va, tape son identifiant et son mot de passe, et arrive dans votre espace — sur n\'importe quel téléphone, aucun code, rien à conserver. Mettez-la en favori.</span><br>',
    frise: [
      { titre: 'Espace prêt', sous: 'par TEAM OP', fait: true },
      { titre: 'Connectez-vous', sous: 'avec vos identifiants', fait: false },
      { titre: 'Votre équipe', sous: 'par ' + adresse, fait: false }
    ],
    boutonTxt: 'Ouvrir mon espace', boutonUrl: 'https://' + adresse,
    bouton2Txt: 'Mon espace client', bouton2Url: 'https://teamop.fr/espace.html'
  });
  try {
    /* confidentiel : ce courriel porte le lien de connexion (donc la clé qui déchiffre les données de
       l'espace) ET le mot de passe provisoire. Sans ce drapeau, mailerEnvoi en gardait 2000 caractères
       dans mails-envoyes.json et en glissait une copie dans la boîte support — deux endroits où la clé
       d'une entreprise n'a rien à faire. Sa relance, plus bas, le disait déjà ; celui-ci l'avait oublié. */
    await mailerEnvoi({ confidentiel: true, trace: 'lien de connexion + accès provisoires · espace ' + slug,
      from: config.smtp.from || config.smtp.user, to: e.email,
      subject: '🔗 Votre lien de connexion — TEAM OP', text: texte, html });
    console.log('Tour :', req.tourUser.nom, 'a envoyé le lien de l\'espace', tE, '→', masqueMail(e.email));   // l'identifiant, pas le nom : souvent celui d'une personne
    // son « Mon espace » passe à Accès activé · OP GESTION active (+ abonnement si formule posée)
    fbMajFicheClient(e.email, Object.assign({ status: 'fourni', apps: ['elan'] },
      e.formule ? { plan: FORMULE_LBL[e.formule] || e.formule, planStatus: 'actif' } : {})).catch(() => {});
    res.json({ ok: true, envoye: e.email });
  } catch (err) { res.status(500).json({ error: 'envoi impossible : ' + String(err.message).slice(0, 120) }); }
});
// l'app d'un espace demande sa formule attribuée (public — ne révèle que la formule)
/* Fiche d'un espace de l'annuaire à partir de son identifiant d'équipe (avec son nom de lien) */
/* ⛔⛔ UNE ENTREPRISE, UNE FACTURATION — QUEL QUE SOIT LE NOM PAR LEQUEL ON LA REGARDE (relecture de `gardien`, 30 septembre
   2026, rejouée par les vraies routes de la Tour). Une entreprise renommée porte plusieurs noms (`tourEspaceDe`) ; le plus
   récent est celui que l'application lit (`espaceParT`). Un second nom inscrit sans formule ni abonnement réglé à la main
   SUSPENDAIT une entreprise payée par virement (datée « jamais abonnée »), pendant que la Tour, la page de paiement et
   l'horloge de conservation lisaient chacune un nom différent.
   La règle : la facturation se lit par GROUPE — la formule (et son nombre), l'abonnement réglé à la main —, chacun pris sur
   le nom le plus récent qui le porte. La Tour ne sait pas RETIRER une formule, et « auto » s'écrit `''` (une décision) :
   un groupe absent n'a jamais été réglé sur ce nom, il ne refuse rien. Lue par `espaceParT` (l'application, « Mon
   espace », le rappel J-7), la liste et le statut de la Tour, l'horloge de conservation et la page de paiement : UNE
   lecture. Et quand la Tour règle un groupe sur un nom, elle l'écrit sur TOUS les noms (`facturationPartager`). */
function facturationGroupes() {   // (dans une fonction : une constante de module lue au démarrage serait en zone morte)
  return [
    { porte: x => !!x.formule, champs: ['formule', 'quantite', 'formulePar', 'formuleTs', 'formuleDepuis'] },
    /* ⛔ les OPTIONS du Pro réglées à la main (1er octobre 2026) vivent dans le groupe de l'abonnement réglé : elles n'ont de sens que
       sous un « actif » ou un « essai », et lues par groupe elles suivent l'entreprise sous tous ses noms — dans un groupe à part,
       elles se lisaient sur un nom pendant que le statut se lisait sur un autre */
    { porte: x => x.aboStatut !== undefined && x.aboStatut !== null, champs: ['aboStatut', 'aboFin', 'aboPar', 'aboTs', 'aboDepuis', 'options', 'optionsPar', 'optionsTs'] } ];
}
/* Les noms d'une même entreprise : son identifiant, sans égard à la casse (le paiement le lit ainsi). */
function nomsEntreprise(e) {
  const t = String(espaceT(e) || '').toLowerCase(); if (!t) return [];
  return Object.values(espacesReg || {}).filter(x => x && String(espaceT(x) || '').toLowerCase() === t);
}
function facturationDe(e) {
  if (!e) return e;
  const noms = nomsEntreprise(e);
  if (noms.length < 2) return e;   // un seul nom : sa fiche EST la facturation
  const parRecence = noms.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const r = Object.assign({}, e);
  for (const g of facturationGroupes()) {
    let src = parRecence.find(g.porte);
    /* ⛔ UN RÉGLAGE NÉGATIF PÉRIMÉ NE REMONTE PAS D'UN ANCIEN NOM (relecture de la poussée, 30 septembre 2026, rejouée) : un
       « annulé », « suspendu » ou « impayé » posé jadis sur un nom, puis un nom neuf créé par l'ancienne route (qui ne le
       reportait pas) — le serveur d'avant servait l'entreprise sur le nom neuf depuis. Lu par groupe, il la SUSPENDAIT à
       la mise en ligne, abonnement Stripe payé compris. Depuis cette version, un réglage de la Tour s'écrit sur TOUS les
       noms (`facturationPartager`) et un nom neuf le reprend (route « lien ») : un réglage négatif vivant est donc aussi
       sur le nom le plus récent. Seul un réglage d'avant peut n'être que sur un ancien nom — on ne le croit pas (dans le
       doute, on ne coupe pas ; la Tour montre la fiche). Un réglage POSITIF d'un ancien nom, lui, remonte : c'est ce qui
       a fait naître cette lecture (une entreprise payée par virement, suspendue). */
    let fait = null;
    if (src && src !== parRecence[0] && g.champs[0] === 'aboStatut' && ['annule', 'suspendu', 'impaye'].includes(src.aboStatut)) {
      /* ⛔ … mais « depuis quand elle paie » (`aboDepuis`) est un FAIT, pas une décision : sans lui, le « actif » que la Tour
         repose ensuite datait l'abonnement d'aujourd'hui, et une abonnée d'avant perdait pour toujours ses places ×2/×3 (relecture
         des correctifs, 30 septembre 2026, rejouée). Un impayé ou une suspension d'avant sans date disait « elle payait » depuis
         son réglage (`aboTs`) — ce que la route « abonnement » en déduisait. */
      const dep = src.aboDepuis != null ? src.aboDepuis : (src.aboStatut !== 'annule' ? (src.aboTs || 0) : undefined);
      if (dep !== undefined) fait = { aboDepuis: dep };
      src = null;
    }
    for (const k of g.champs) { if (src && src[k] !== undefined) r[k] = src[k]; else if (fait && fait[k] !== undefined) r[k] = fait[k]; else delete r[k]; }
  }
  return r;
}
/* La Tour règle la facturation sur UN nom : elle part de celle de l'entreprise (`facturationDe` — sinon un nom ancien
   repartirait de sa fiche périmée : « depuis quand elle paie » remis à aujourd'hui, ses places d'avant perdues), puis
   l'écrit sur TOUS ses noms. */
function facturationReprendre(e) {
  const f = facturationDe(e);
  if (f !== e) for (const g of facturationGroupes()) for (const k of g.champs) { if (f[k] !== undefined) e[k] = f[k]; else delete e[k]; }
}
function facturationPartager(e, groupes) {
  const gs = facturationGroupes().filter((g, i) => groupes.includes(i));
  for (const x of nomsEntreprise(e)) if (x !== e) for (const g of gs) for (const k of g.champs) { if (e[k] !== undefined) x[k] = e[k]; else delete x[k]; }
}
function espaceParT(t) {
  if (!t) return null;
  const slugs = Object.keys(espacesReg).filter(s => { const x = espacesReg[s];
    if (x.t) return x.t === t;
    try { const o = JSON.parse(Buffer.from(x.code, 'base64').toString('utf8')); return String(o.t || '') === t; } catch (err) { return false; } });
  if (!slugs.length) return null;
  const slug = slugs.sort((a, b) => (espacesReg[b].ts || 0) - (espacesReg[a].ts || 0))[0];   // plusieurs noms pour le même espace : le plus récent
  return facturationDe(Object.assign({ slug }, espacesReg[slug]));   // … et sa facturation, celle de l'entreprise (`facturationDe`)
}
/* ⛔ TOUTES les entreprises qu'une référence de paiement désigne — celles qu'`espacePaye()` reconnaîtrait pour
   `metadata.espace` : par NOM D'ACCÈS ou par IDENTIFIANT, sans casse. Le verrou de `/api/stripe/checkout` (« B »)
   exige que le compte qui paie soit celui de CHACUNE : s'il n'en regardait qu'une (par `t`, au caractère près,
   comme `espaceParT`), une référence qui désigne une autre entreprise par son nom d'accès passerait le verrou et
   la rendrait « payée ». L'identifiant se lit par `espaceT` (écrit en clair, ou dans le code des plus anciens). */
function espacesDeRef(ref) {
  const r = String(ref || '').trim().toLowerCase();
  if (!r) return [];
  return Object.keys(espacesReg).filter(s => { const x = espacesReg[s];
    return !!x && (s.toLowerCase() === r || espaceT(x).toLowerCase() === r); })
    .map(s => Object.assign({ slug: s }, espacesReg[s]));
}

/* ── Verdict de clé d'équipe : la mécanique derrière le point de passage de la famille mail.
   Même vérification que /api/espaces/comptes, en un seul endroit plutôt que recopiée, et
   comparée en temps constant comme memeSecret() d'agent-devis.js — un !== sur une empreinte
   se mesure. Quatre verdicts, et ils ne disent pas la même chose :
     valide   — la clé est prouvée ;
     absent   — aucun kh envoyé (une version d'app.html antérieure à la phase 2) ;
     invalide — un kh envoyé qui ne correspond pas : à regarder de près ;
     inconnu  — l'espace n'est pas dans espacesReg, donc on ne PEUT PAS vérifier. C'est le
                verdict décisif : tant qu'il n'est pas à zéro, fermer la porte couperait la
                Réception d'entreprises parfaitement légitimes. */
/* Ces quatre compteurs disent si la porte peut se fermer. Ils vivent en mémoire et
   repartent à zéro au redémarrage — c'est assez pour la mesure visée, et ça évite d'écrire
   un fichier de plus. Ils sont exposés dans /health, agrégés : quatre entiers ne disent
   rien de personne — ni adresse, ni espace, ni contenu. Sans cela, la suite se déciderait
   à l'aveugle, /api/mail/cles étant protégée par une clé que Justin n'a pas. */
const cleEquipeVu = { valide: 0, absent: 0, invalide: 0, inconnu: 0, depuis: Date.now() };
const cleEquipeParEspace = new Map();   // t -> { slug, valide, absent, invalide, inconnu, vu }
const cleEquipeParRoute = Object.create(null);   // route -> { valide, absent, invalide, inconnu }

function cleEquipeVerdict(t, kh) {
  const khn = String(kh || '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(khn)) return 'absent';
  const e = espaceParT(String(t || ''));
  if (!e || !e.code) return 'inconnu';
  let cle = '';
  try { cle = String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).k || ''); } catch (err) {}
  if (!cle) return 'inconnu';
  const attendu = Buffer.from(crypto.createHash('sha256').update(cle).digest('hex'));
  const recu = Buffer.from(khn);
  return (attendu.length === recu.length && crypto.timingSafeEqual(attendu, recu)) ? 'valide' : 'invalide';
}

/* Le point de passage lui-même. Il compte et laisse passer — req.cleEquipe est posé pour la
   phase 3, où les routes s'en serviront pour refuser. Rien n'est écrit dans les journaux :
   ni adresse, ni objet, ni corps. Le comptage reste en mémoire et se lit par une route
   protégée ; il repart donc à zéro au redémarrage, ce qui suffit pour la mesure visée. */
function cleEquipeObserve(req, res, next) {
  const src = (req.method === 'GET') ? (req.query || {}) : (req.body || {});
  const t = String(src.teamId || src.t || '');
  /* Uniquement l'en-tête. Le lire aussi dans la requête (donc dans « ?kh= ») le ferait
     entrer dans les journaux d'accès nginx et dans l'historique du navigateur — exactement
     ce que le commentaire d'app.html jure d'éviter. Vérifié : l'application n'envoie que
     l'en-tête. */
  const v = cleEquipeVerdict(t, req.headers['x-teamop-kh'] || '');
  cleEquipeVu[v]++;
  /* Ventilé par route, sinon le critère « absent à zéro » est inatteignable : espace.html et
     messages.html appellent /api/subscribe et /api/notify sans jamais envoyer de kh, et leur
     bruit noierait la mesure des routes de messagerie — la seule qui décide de la fermeture. */
  const rt = String(req.baseUrl || req.path || '').replace(/^\/api\//, '').slice(0, 24) || '?';
  const parR = cleEquipeParRoute[rt] || (cleEquipeParRoute[rt] = { valide: 0, absent: 0, invalide: 0, inconnu: 0 });
  parR[v]++;
  if (t) {
    if (cleEquipeParEspace.size > 3000) cleEquipeParEspace.clear();   // borne mémoire, comme comptesQuota
    const e = cleEquipeParEspace.get(t) || { slug: '', valide: 0, absent: 0, invalide: 0, inconnu: 0 };
    if (!e.slug) { const x = espaceParT(t); e.slug = x ? x.slug : '(hors annuaire)'; }
    e[v]++; e.vu = Date.now();
    cleEquipeParEspace.set(t, e);
  }
  req.cleEquipe = v;
  next();
}

/* ⚠️ POUR LA PHASE SUIVANTE, QUAND ON REFUSERA VRAIMENT : le refus de /api/replies ne doit
   PAS être du JSON. loadMailReplies() (app.html) fait « const d = await r.json();
   _mailReplies = d.replies || [] » — un refus en JSON se parse donc sans erreur, la liste
   devient VIDE au lieu de NULLE, et l'écran affiche « 📭 Aucun message » au lieu de
   « 📥 Réception indisponible ». Le client ne verrait pas une panne, il verrait sa
   correspondance disparue. Répondre en text/plain fait rejeter r.json(), tomber dans le
   catch, et affiche le vrai message — sans toucher à app.html.

   Ce que la phase 1 sert à lire. Protégée par la clé du serveur, comme /api/bugs.
   « inconnu » et « absent » non nuls = fermer maintenant casserait ces espaces. */
app.get('/api/mail/cles', (req, res) => {
  if ((req.query.key || '') !== config.apiKey) return res.status(403).json({ error: 'clé invalide' });
  const espaces = Array.from(cleEquipeParEspace.entries())
    .map(([t, e]) => ({ t, slug: e.slug, valide: e.valide, absent: e.absent, invalide: e.invalide, inconnu: e.inconnu, vu: e.vu }))
    .sort((a, b) => (b.vu || 0) - (a.vu || 0)).slice(0, 300);
  res.json({ total: cleEquipeVu, espaces });
});
app.post('/api/espaces/etat', (req, res) => {
  const t = monStr((req.body || {}).t, 80);
  if (!t) return res.status(400).json({ error: 't requis' });
  const e = espaceParT(t);
  /* ⛔⛔ UN SUSPENDU N'EST PAS UN FERMÉ, ET LES CONFONDRE ICI COUPE UN IMPAYÉ DE SES DONNÉES.
     `entFermes.espaces` porte les DEUX états — la fermeture définitive ET la simple suspension
     pour impayé (`entFermes.suspendus` en est le sous-ensemble). Cette ligne ne faisait pas la
     différence. Mesuré le 22 septembre 2026 sur un vrai serveur : une entreprise suspendue
     recevait `{ferme:true}`, donc `app.html` affichait « Cet espace a été fermé par TEAM OP »
     à TOUS ses utilisateurs, puis effaçait `elan_sync_team` — et le commentaire de cette
     porte-là dit lui-même qu'elle « ne se rattrape pas au chargement suivant ».
     Trois raisons pour lesquelles c'était faux, et pas seulement maladroit :
     · Justin, 20 septembre : « rien n'est perdu … c'est pas aux utilisateurs de savoir si
       l'entreprise paye ou pas. Que le compte admin. » ;
     · `mentions-legales.html:74` promet qu'un impayé n'entraîne AUCUNE suppression ;
     · le jour où le socle est la seule copie à jour, c'est une coupure de données.
     Une entreprise suspendue reçoit donc son état NORMAL, plus de quoi griser au bon moment. */
  if (espaceFerme(t)) return res.json({ ok: true, ferme: true });
  const suspendu = espaceEstSuspendu(t);
  const sursisJours = sursisJoursDe(t);
  /* OP MESSAGES ne fait plus partie des formules d'OP GESTION. C'est une application à part,
     avec son propre abonnement : on l'ouvre entreprise par entreprise depuis la Tour, et son
     absence ici veut dire « pas accordée ». Le défaut est donc FERMÉ, pour tout le monde —
     mélanger les deux applications, c'est mélanger deux abonnements et deux connexions.
     Ce champ est rendu sur les deux chemins qui décrivent un espace VIVANT — celui qui part
     avant la formule compris : l'y oublier laissait la messagerie ouverte chez toute entreprise
     sans formule attribuée. Le chemin « ferme » sort plus haut sans le rendre, et c'est juste :
     l'application y vide son stockage et se recharge avant même de regarder ce champ. */
  const opMessages = !!(e && e.opMessages);
  /* Le métier voyage comme `opMessages` : sur les quatre réponses d'un espace VIVANT, formule ou pas, payé ou pas — un
     impayé garde son métier (ce n'est pas une fonction payante), et une entreprise sans formule aussi. */
  const metier = metierOk(e && e.metier);
  const versionMin = versionsCfg.min, enLigne = versionsCfg.enLigne;
  /* ⛔⛔ UNE FICHE SANS FORMULE NE SORT PLUS ICI (Justin, 30 septembre 2026, « Suspend ») : elle passe par `espacePaye`, qui la
     traite comme une fiche « Gratuit » d'avant (`ficheSansFormule`) — une période offerte ou un abonnement la servent, rien
     de payé la suspend, un doute ne décide rien. Seule une entreprise ABSENTE de l'annuaire garde la réponse d'avant, sans
     formule ni suspension : elle ne se décide pas (un annuaire illisible au démarrage rendrait TOUT LE MONDE inconnu — les
     suspendre couperait toutes les entreprises d'un coup, sur une panne de notre côté). */
  if (!e) return res.json({ ok: true, opMessages, metier, versionMin, enLigne, suspendu, sursisJours });
  /* ⛔ la formule SERVIE (`formulePayee`) : celle que l'entreprise paie, pas forcément celle de la fiche (29 septembre 2026) */
  espacePaye(e).then(p => {
    /* ⛔⛔ UN IMPAYÉ SE SERT COMME UNE SUSPENSION AU SURSIS ÉCOULÉ, SANS FORMULE (Justin, 29 septembre 2026 : « leur accès sont
       bloqués le temps que c'est pas payé » ; « rien n'est perdu »). L'application v763 sait déjà griser ainsi
       (`suspensionPoser` → `forfait()` rend « gratuit ») : sans rien écrire dans `db` (la formule vraie reste, tout revient
       d'un coup au règlement), et le message n'est montré qu'à l'ADMINISTRATEUR (« c'est pas aux utilisateurs de savoir si
       l'entreprise paye ou pas »). Une réponse AVEC formule et `paye:false` ferait l'inverse : bandeau « Paye ton
       abonnement » à toute l'équipe, `db.forfait` réécrit et synchronisé, et un bouton qui mène à un SECOND abonnement.
       Rien n'est écrit côté serveur non plus : l'état se recalcule à chaque appel, il revient seul. */
    /* ⚠️ cette route répond à qui connaît `t` : elle ne dit ni « impayé » ni par quel chemin (`gardien`) — l'application ne
       lit que `suspendu` et `sursisJours` ; la Tour, gardée, a le motif */
    /* ⛔⛔ ET DEPUIS LE 30 SEPTEMBRE 2026, TOUT CE QUI N'EST PAS PAYÉ PREND CETTE FORME (Justin : « si une entreprise ne paye
       plus, le service est suspendu tant que c'est pas réglé » ; plus de formule Gratuit). Une période offerte finie sans
       abonnement, un abonnement arrêté, une fiche « Gratuit » d'avant, OP MESSAGES seul, un abonnement réglé « suspendu » ou
       « annulé » dans la Tour : suspendue, sans formule. La forme AVEC formule et `paye:false` n'est plus jamais servie —
       l'application v763 y répondait par le bandeau « Paye ton abonnement » à toute l'équipe et un `db.forfait` réécrit
       (voir plus haut) ; celle-ci, elle la grise sans rien écrire, et les applications suivantes suspendent tout. Une
       formule que l'application ne connaît pas ne se sert pas non plus. */
    /* ⚠️ `sursisJours: 0` MÊME QUAND LA TOUR L'A SUSPENDUE HIER. Les sept jours de sursis (20 septembre 2026) servent
       l'entreprise que la facturation dit PAYÉE et que la Tour suspend (un virement qui n'arrive pas) : elle garde son
       accès sept jours, puis tout se grise — c'est la réponse payée, plus bas, qui porte ce sursis. À qui ne paie DÉJÀ
       pas, la suspension de la Tour ne rend aucun jour : la v763 la mettait au Gratuit sur-le-champ, et un sursis ici
       lui rouvrirait tout pendant une semaine, plus qu'à une entreprise que la Tour n'a pas touchée. `test-761`. */
    /* ⛔ ON NE SAIT PAS (Stripe ou registre des codes illisible) : ni formule, ni suspension — l'application garde ce qu'elle
       savait (`payeInconnu`, relectures du 30 septembre 2026) */
    if (p.inconnu) return res.json({ ok: true, verificationImpossible: true, opMessages, metier, versionMin, enLigne, suspendu, sursisJours });
    const fServie = p.formuleServie || e.formule;
    if (accesSuspenduPar(p, fServie)) return res.json({ ok: true, paye: false, motif: 'accès suspendu', opMessages, metier, versionMin, enLigne, suspendu: true, sursisJours: 0 });
    /* ⛔⛔ `options` : LES OPTIONS DU PRO PAYÉES (1er octobre 2026), dans la réponse PAYÉE et nulle part ailleurs. Un tableau — éventuellement
       VIDE : « le serveur sait, et il n'y en a pas » (toujours `[]` en Business, Business Premium et en période offerte : toutes les
       rubriques y sont déjà ouvertes, l'application n'en déduit aucun verrouillage). ABSENT quand le serveur ne sait pas (liste Stripe
       périmée, places illisibles, doute) : l'application garde alors ce qu'elle savait — jamais « rien » à la place de « on ne sait
       pas ». Les deux réponses suspendue et « vérification impossible » n'en portent pas : une option ne lève aucune suspension.
       Jamais dans `motif` (`motifPublic`) : c'est la Tour, gardée, qui lit le détail. Les applications v763 et v767 ignorent ce champ. */
    res.json({ ok: true, formule: fServie, quantite: e.quantite || 1, places: placesServies(e, p), paye: true, motif: motifPublic(p.motif), opMessages, metier, versionMin, enLigne, suspendu, sursisJours,
      ...((Array.isArray(p.optionsServies) && !p.doute) ? { options: p.optionsServies.slice() } : {}) });
  })
    /* ⛔ LA VÉRIFICATION IMPOSSIBLE NE DÉCIDE RIEN. Elle rendait la formule avec `paye:false` : à la moindre panne ici,
       l'application v763 réécrivait `db.forfait` au Gratuit chez une entreprise qui paie, et le répandait à toute l'équipe
       par la synchro. On le DIT (`verificationImpossible`) et on ne sert ni formule ni suspension de facturation :
       l'application garde ce qu'elle savait. « Dans le doute, on ne coupe pas. » */
    .catch(() => res.json({ ok: true, verificationImpossible: true, opMessages, metier, versionMin, enLigne, suspendu, sursisJours }));
});
/* nom d'entreprise présentable (jamais une adresse e-mail mise là faute de mieux) */
function espNomPropre(e) { const n = String((e && e.nom) || '').trim(); return (n && !/@/.test(n) && n.toLowerCase() !== String((e && e.email) || '').toLowerCase()) ? n : ''; }
/* ── Le nom d'une entreprise ne rend plus sa clé d'équipe ──────────────────────────────
   /api/espaces/trouver rendait le code d'espace — donc « k », la clé qui ouvre les
   données de l'entreprise — à qui tapait son NOM. Un nom se lit sur un camion, une
   facture, un devis : ce n'est pas un secret, et il ne doit pas en garder un.
   La route est retirée. Trois routes la remplacent, chacune ne rendant que le strict
   nécessaire à ce qu'elle sert :
     • /relance     — renvoie le lien de connexion à l'adresse DÉJÀ enregistrée pour
                      l'entreprise. Il faut donc sa boîte aux lettres, plus seulement
                      son nom. La réponse est la même que l'entreprise existe ou non :
                      sinon la route deviendrait l'annuaire des clients de TEAM OP.
     • /libre       — un oui/non de disponibilité, pour le formulaire d'inscription.
     • /verifie-nom — « ce nom est-il celui de l'équipe t ? », demandé par un appareil
                      qui est DÉJÀ dans l'espace t. Rien n'en sort que ce booléen. */
const relanceQuota = new Map();
function quotaOk(map, cle, max, fenetre) {
  const q = map.get(cle) || { n: 0, reset: Date.now() + fenetre };
  if (Date.now() > q.reset) { q.n = 0; q.reset = Date.now() + fenetre; }
  q.n++; map.set(cle, q);
  return q.n <= max;
}
/* ══ ÉTAPE 0 DU SOCLE : LES PIÈCES JOINTES ET LES PHOTOS SORTENT DU DOCUMENT ════════════
   Monté ICI, et pas plus haut, parce que le module reçoit `sauvRefus` et `quotaOk` : la
   première est une déclaration de fonction donc hissée, la seconde est juste au-dessus. Aucun
   chemin `/api/pieces/*` n'existait avant : pas de collision possible avec une route déjà
   enregistrée (le piège de `/api/devis/etat`, déclarée deux fois, où la seconde n'a jamais
   répondu). Si le module ne se monte pas, le reste du serveur fonctionne : les pièces
   redeviennent simplement ce qu'elles sont aujourd'hui, prisonnières de leur appareil. */
let pieces = null;
try {
  pieces = require('./pieces').monterPieces(app, { config, DATA_DIR, sauvRefus, quotaOk, monStr });
} catch (e) {
  console.error('pièces jointes non montées :', e.message);
}
/* ══ LA SAUVEGARDE HORS SITE ═══════════════════════════════════════════════════════════════
   Montée ICI parce qu'elle a besoin de `monPatronStrict` pour ses deux routes — une
   déclaration de fonction, donc hissée, mais on garde la proximité avec les pièces jointes :
   c'est le même sujet, la durabilité de ce que le serveur détient.
   ⛔ INERTE SANS BLOC `sauvegarde` DANS `config.json` : aucune minuterie, aucun appel réseau.
   Un serveur de développement et un banc d'essai ne partent donc jamais écrire chez un
   hébergeur d'objets. Et si le module refuse de se monter, le reste du serveur continue —
   on perd la sauvegarde, pas la plateforme, et `/health` le dit. */
let sauvegarde = null;
try {
  /* ⛔ `socle` EST PASSÉ À LA SAUVEGARDE, et ce n'est pas une commodité : sans lui, l'archive
     nocturne emporterait les bases SQLite VIVANTES et les restaurerait corrompues, en se
     déclarant valide. Il est passé même quand le socle est éteint : il n'y a alors aucune base
     à instantaner, la fonction rend 0, et rien n'est exclu de l'archive — donc aucun changement
     pour la production d'aujourd'hui. */
  /* ⛔⛔ CETTE LIGNE A ÉTÉ CONDITIONNELLE PENDANT UN COMMIT, ET ÇA A TUÉ TOUTE LA SAUVEGARDE.
     Elle lisait `(opSocle && opSocle.actif)` — or `let opSocle` est déclaré 56 lignes PLUS BAS,
     donc en ZONE MORTE TEMPORELLE ici : `ReferenceError: Cannot access 'opSocle' before
     initialization`, avalée par le `catch` juste en dessous, et `sauvegarde` restait `null`
     POUR TOUJOURS, quelle que soit la configuration. MESURÉ sur le vrai serveur : journal
     « sauvegarde hors site non montée », `/health` → `{active:false}`, les deux routes de la
     Tour en 404. Le seul dispositif qui protège TeamOP d'un VPS perdu, éteint en silence — et
     la surveillance le classait « pas encore branchée », donc un murmure une fois par jour.
     ⛔ `CLAUDE.md` NOMME CE PIÈGE, sous ce nom exact (« zone morte temporelle », 10 septembre).
     ⛔ LA LEÇON, PLUS LARGE QUE LE BOGUE : le besoin réel était que la sauvegarde ne réveille
     pas le socle quand il dort. La bonne place pour cette décision est LÀ OÙ VIVENT LES
     DONNÉES (`instantanerVers` ne crée plus rien quand il n'y a rien à copier), pas dans une
     expression d'index.js sensible à l'ordre de chargement. Une garde posée au mauvais endroit
     coûte plus cher que le défaut qu'elle corrige. */
  sauvegarde = require('./sauvegarde').monterSauvegarde(app, { config, DATA_DIR, CONFIG_PATH,
    garde: monPatronStrict, socle: require('./socle') });
} catch (e) {
  console.error('sauvegarde hors site non montée :', e.message);
}
/* ⛔ LE SOCLE SE COUPE AUX MÊMES QUATRE PORTES QUE FIREBASE, PAR UNE SEULE FONCTION.
   `gardien` l'a relevé le 18 septembre 2026 : les quatre portes appelaient `fbRevoquerEquipe`
   et AUCUNE ne touchait le socle. Une entreprise fermée aurait continué de lire et d'écrire
   par `/api/op/*` pendant les 30 jours de son jeton, pendant que la Tour affichait « fermée ».
   C'est mot pour mot la panne de `fbRevoquerEquipe`, un an plus tard, sur un second stockage —
   et la raison pour laquelle il n'y a ici qu'UNE fonction : deux copies calculeraient un jour
   deux choses différentes, et c'est celle qu'on a oublié de corriger qui déciderait.
   ⛔ ELLE REND UN VERDICT, ET L'APPELANT LE REMONTE. Croire une entreprise coupée alors
   qu'elle ne l'est pas est la panne silencieuse type de ce dépôt. */
/* ⛔ LA GARDE PORTE SUR LES DONNÉES, PAS SUR LE DRAPEAU — ET C'EST LA MÊME LEÇON QUE CELLE DU
   19 SEPTEMBRE AU MATIN, QUI AVAIT ÉTEINT TOUTE LA SAUVEGARDE. Elle a été écrite, puis
   appliquée à un SEUL endroit : ces trois fonctions-ci avaient gardé le défaut, et la
   cinquième vérification les a reproduites. Ce qu'elles donnaient, drapeau éteint sur un
   serveur qui avait DÉJÀ des bases — c'est-à-dire le retour en arrière que le plan documente :
     · supprimer une entreprise → la Tour répond `ok`, le courriel de confirmation part, et
       `data/socle/<t>/base.db` reste sur le disque avec les données du client dedans. Il repart
       dans CHAQUE archive nocturne, et rallumer le drapeau ressuscite l'entreprise supprimée.
     · rouvrir une entreprise suspendue → la Tour répond `ok` et la retire d'`entFermes`, mais
       l'état `ferme` reste écrit SUR DISQUE. Au rallumage l'entreprise est en 403 définitif, et
       le bouton « Rouvrir » ne peut plus rien : elle n'est plus dans `entFermes`, donc il n'y a
       plus rien à rouvrir. Une suspension devenue une condamnation.
   ⚠️ `presentSurDisque` et pas `existe` : le second passe par `annuaire()`, qui CRÉE le fichier
   quand il manque — sur un serveur où le socle n'a jamais tourné, un simple clic dans la Tour
   ferait naître un annuaire chiffré sous une clé que personne n'a encore mise en séquestre.
   `tests/test-726.js` tient les deux bouts : la base DISPARAÎT drapeau éteint, et rien ne
   naît sur un serveur vierge. */
const socleDonneesLa = (t) => {
  if (!t) return false;
  try { return require('./socle').presentSurDisque(t); } catch (e) { return false; }
};
function socleCouper(t, quoi) {
  if (!t) return { fait: true, motif: 'sans espace' };
  if (!socleDonneesLa(t)) return { fait: true, motif: 'aucun stockage pour cet espace' };
  try {
    const r = require('./socle').entrepriseOuvrir(t, false);
    return { fait: true, motif: 'espace ' + r.etat + ', ' + r.coupees + ' session(s) coupée(s)' };
  } catch (e) {
    /* ⛔ UNE ENTREPRISE QUI N'A JAMAIS TOUCHÉ AU SOCLE N'EST PAS UN ÉCHEC DE COUPURE — il n'y a
       rien à couper, et c'est le résultat voulu. Même raisonnement que `fbRevoquerEquipe`, qui
       compte `USER_NOT_FOUND` comme coupé. Le confondre avec une vraie panne ferait hurler la
       Tour à chaque fermeture d'un client d'avant la bascule. */
    if (e.code === 'ABSENT') return { fait: true, motif: 'aucun stockage pour cet espace' };
    console.error('⛔ socle NON coupé (' + (quoi || '?') + ') :', e.code || 'erreur');
    return { fait: false, motif: 'socle NON coupé — les appareils lisent et écrivent toujours' };
  }
}
/* Le geste inverse, et il DOIT exister : une fermeture sans réouverture n'est pas une
   suspension, c'est une condamnation. Même forme que `socleCouper` — un verdict que
   l'appelant remonte, jamais un booléen muet. */
function socleOuvrir(t) {
  if (!t) return { fait: true, motif: 'sans espace' };
  if (!socleDonneesLa(t)) return { fait: true, motif: 'aucun stockage pour cet espace' };
  try {
    const r = require('./socle').entrepriseOuvrir(t, true);
    return { fait: true, motif: 'espace ' + r.etat };
  } catch (e) {
    if (e.code === 'ABSENT') return { fait: true, motif: 'aucun stockage pour cet espace' };
    console.error('⛔ socle NON rouvert :', e.code || 'erreur');
    return { fait: false, motif: 'socle NON rouvert — cette entreprise ne pourra PAS synchroniser' };
  }
}
function socleEffacer(t) {
  if (!t) return { ok: true, motif: 'sans espace' };
  if (!socleDonneesLa(t)) return { ok: true, motif: 'aucun stockage pour cet espace' };
  try { const r = require('./socle').effacerEntreprise(t); return { ok: r.ok, motif: r.ok ? 'effacé' : 'RESTES SUR LE DISQUE' }; }
  catch (e) { console.error('⛔ socle NON effacé :', e.code || 'erreur'); return { ok: false, motif: 'socle NON effacé' }; }
}

/* ══ LE SOCLE — LE STOCKAGE QUI REMPLACERA FIRESTORE ═══════════════════════════════════════
   Monté ICI parce qu'il reçoit `sauvRefus`, `cleEstPublique`, `monPatronStrict` (déclarations
   de fonctions, donc hissées) et `quotaOk`, juste au-dessus.
   ⛔ INERTE SANS `"socle": {"actif": true}` DANS `config.json` : pas une seule route déclarée,
   pas un fichier ouvert, pas une minuterie. C'est ce qui permet de le déployer chez un client
   qui travaille sans rien risquer — et de faire marche arrière SANS déploiement, en éteignant
   le drapeau. Si le module refuse de se monter, le reste du serveur continue : on perd le
   socle, pas la plateforme, et `/health` le dit. */
/* ══ LES COMPTES DU PORTAIL, CHEZ NOUS ══════════════════════════════════════════
   ⛔ INERTE SANS `"comptes": {"actif": true}`, pour la même raison que le socle : pas une
   route déclarée, pas un fichier ouvert. Ces routes remplacent Firebase Auth pour le portail
   client (`espace.html`) et les liens de mot de passe (`reinit.html`) — l'angle mort que
   `PLAN-OP-SOCLE.md` n'avait jamais vu, parce qu'il ne parlait que de Firestore.
   ⚠ Allumer ici n'éteint rien chez Google, et c'est voulu : un mot de passe Firebase ne se
   LIT pas, donc chaque personne devra en reposer un. Les deux identités doivent pouvoir
   coexister le temps de cette bascule. */
/* ⛔ TROIS ÉTATS, PAS DEUX — LA MÊME RÈGLE QUE LE SOCLE, ET POUR LA MÊME RAISON.
   Ces deux modules se montent DERRIÈRE UN DRAPEAU et avalent leur exception : c'est voulu (un
   portail qui refuse de démarrer ne doit pas emporter l'API des applications), mais ça crée
   exactement la panne silencieuse que ce dépôt paie à répétition. Sans ces trois états,
   `/health` répondait `ok:true` à l'identique qu'ils soient montés, éteints par décision, ou
   CASSÉS au démarrage — pendant que tous les clients du portail sont à la porte.
   · `{actif:false}`                    — éteint par décision, rien à dire ;
   · `{actif:false, erreur:'montage'}`  — réglé et cassé : c'est une PANNE, et ça réveille ;
   · `{actif:true}`                     — en service.
   ⛔ UN BOOLÉEN, JAMAIS UN NOMBRE. `/health` est PUBLIQUE : y publier le nombre de comptes ou
   de dossiers dirait au monde combien TeamOP a de clients, et comment ça évolue. Le compte
   exact se lit depuis la Tour, qui est gardée. */
const etatPortail = { comptes: { actif: false }, dossiers: { actif: false } };

let comptes = null;
try {
  if (config.comptes && config.comptes.actif) {
    comptes = require('./comptes').monterComptes(app, {
      dossier: DATA_DIR, mailerEnvoi: (o) => mailerEnvoi(o), quotaOk,
      siteBase: 'https://teamop.fr',
      journal: (...a) => console.log('comptes:', ...a),
    });
    etatPortail.comptes = { actif: true };
    console.log('comptes du portail : montés (' + comptes.combien() + ' compte(s))');
  }
} catch (e) {
  console.error('comptes du portail NON montés —', e && e.message);
  comptes = null;
  etatPortail.comptes = { actif: false, erreur: 'montage' };
}

/* ══ LE PORTAIL CLIENT, CHEZ NOUS ═════════════════════════════════════════════════
   ⛔ IL DÉPEND DES COMPTES, DONC IL NE SE MONTE PAS SANS EUX. Savoir qui parle passe par
   `comptes.parJeton` : sans lui, ces routes n'auraient aucune identité à vérifier et
   répondraient à n'importe qui. La dépendance est donc EXPLICITE — pas un `if` oublié quelque
   part qui laisserait le portail ouvert le jour où les comptes refusent de se monter. */
let portail = null;
try {
  if (comptes) {
    portail = require('./portail').monterPortail(app, {
      dossier: DATA_DIR, parJeton: comptes.parJeton, admin: monAdmin, patron: monPatronStrict, quotaOk,
      preparer: comptes.preparer, verifie: comptes.verifie,
      formuleServie: formuleServieDe,   // « Mon espace » dit la formule que le client PAIE (29 septembre 2026)
      optionsServies: optionsServiesDe,   // … et ses options du Pro, dans un champ à part (1er octobre 2026)
      /* Un code du portail : il existe dans `config.promos`, sa durée vient de là, et il est
         « épuisé » quand `maxUtilisations` est atteint — la même lecture que `/api/promo/valider`. */
      promoDef: (code) => {
        const c = String(code || '').trim().toUpperCase();
        const p = c ? (config.promos || []).find(x => String(x.code || '').trim().toUpperCase() === c) : null;
        if (!p) return null;
        const u = promoUsages[c] || { n: 0 };
        return { code: c, mois: Math.max(1, Number(p.mois) || 1), epuise: !!(p.maxUtilisations && u.n >= p.maxUtilisations) };
      },
      journal: (...a) => console.log('portail:', ...a),
      /* La reprise des dossiers déjà chez Google. Le serveur a déjà la clé d'administration et
         s'en sert trois fois plus bas pour `teamop_requests` : on réutilise ce chemin-là
         plutôt que d'en ouvrir un second.
         ⛔ UNE LECTURE QUI ÉCHOUE LE DIT (`gardien`, C1). `r.ok` n'était jamais lu : un 403 ou un
         500 de Google rendait une liste VIDE, et la Tour lisait « rien à importer » — les adresses
         non lues ne recevaient pas leur compte « à poser », donc restaient prenables. Une page qui
         échoue arrête l'import avec son motif (la route rend 503), et le délai couvre le CORPS,
         pas seulement les en-têtes. Et TOUT le dossier est rendu, décodé : une liste de huit
         champs faisait perdre la facturation, les demandes, la formule et les documents. */
      lireFirestore: async () => {
        const tok = await fbAdminJeton();
        if (!tok) throw Object.assign(new Error('firebase off'), { code: 'firebase_off' });
        const { valeurFirestore } = require('./documents');
        const out = []; let pt = '';
        for (let tour = 0; ; tour++) {
          if (tour >= 40) throw Object.assign(new Error('trop de pages'), { code: 'lecture_incomplete' });
          const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 20000);
          let r = null, j = null;
          try {
            r = await fetch(fsBase() + '/teamop_requests?pageSize=300' + (pt ? '&pageToken=' + encodeURIComponent(pt) : ''),
              { method: 'GET', headers: { 'Authorization': 'Bearer ' + tok }, signal: ctrl.signal });
            j = await r.json().catch(() => null);
          } catch (e) { throw Object.assign(new Error('lecture impossible'), { code: 'lecture_reseau' }); }
          finally { clearTimeout(tm); }
          if (!r.ok || !j || typeof j !== 'object') throw Object.assign(new Error('lecture refusée'), { code: 'lecture_' + r.status });
          for (const doc of (j.documents || [])) {
            const f = doc.fields || {}, champs = {};
            /* Les horodatages de Google (`createdAt`…) deviennent des nombres : la page les relit
               par `parseInt`, et une date écrite en texte y donnait l'année. */
            for (const k of Object.keys(f)) champs[k] = (f[k] && 'timestampValue' in f[k]) ? (Date.parse(f[k].timestampValue) || 0) : valeurFirestore(f[k]);
            out.push({ email: String(champs.email || ''), champs });
          }
          pt = j.nextPageToken || '';
          if (!pt) break;
        }
        return out;
      },
    });
    etatPortail.dossiers = { actif: true };
    console.log('portail client : monté (' + portail.dossiers() + ' dossier(s))');
  }
} catch (e) {
  console.error('portail client NON monté —', e && e.message);
  portail = null;
  etatPortail.dossiers = { actif: false, erreur: 'montage' };
}
/* ⚠️ ET LE CAS QU'ON OUBLIE : les comptes réglés mais cassés entraînent le portail avec eux,
   SANS exception — le `if (comptes)` est simplement faux. Sans cette ligne, `dossiers` dirait
   « éteint par décision » pour une panne. */
if (!portail && etatPortail.comptes.erreur) etatPortail.dossiers = { actif: false, erreur: 'comptes' };


let opSocle = null;
try {
  opSocle = require('./op-socle').monterOpSocle(app, {
    config, socle: require('./socle'), sauvRefus, cleEstPublique, quotaOk, monStr,
    garde: monPatronStrict, mailerEnvoi: (o) => mailerEnvoi(o),
    /* ⛔ LA MÊME GARDE QUE LE CHANGEMENT DE CLÉ, INJECTÉE — pas recopiée. Voir le bloc
       `cleCodeDemander`/`cleCodeVerifier` : écrire dans la base d'un client ne peut pas être
       moins gardé que changer sa clé d'équipe, qui n'écrit aucune donnée métier.
       `espaceContact` rend l'adresse de l'entreprise et son nom propre : sans adresse, aucun
       code ne peut partir, donc le retour est REFUSÉ — jamais autorisé par défaut. */
    cleCodeDemander, cleCodeVerifier,
    espaceContact: (t) => { const e = espaceParT(t); return { email: String((e && e.email) || '').trim(), nom: espNomPropre(e) || '' }; },
    /* ⛔ LES DEUX SOURCES QUE LE SOCLE N'A PAS, ET QUI DÉCIDENT DE L'ÉTAPE 5.
       `cnxAppareils` rend les appareils d'une entreprise VUS PAR L'API dans la fenêtre — le
       dénominateur de la condition (a). Le socle ne connaît que ceux qui lui parlent ; c'est
       précisément l'écart entre les deux listes qui dit s'il reste des appareils en retard.
       ⚠️ IL REND `null` QUAND ON NE SAIT PAS, jamais une liste vide : un journal absent ferait
       dire « aucun appareil en retard », donc « tu peux basculer », au moment exact où on n'a
       aucune information. Ce dépôt a payé deux fois cette confusion (`_mailboxes`, puis
       `syncDecrypt`) — la troisième coûterait la base d'un client. */
    cnxAppareils: (t, depuis) => {
      const j = cnxData[String(t || '')];
      if (!Array.isArray(j) || !j.length) return null;
      const vus = new Set();
      let sansId = 0;
      for (const x of j) {
        if (!x || (x.ts || 0) < depuis) continue;
        if (x.ev === 'echec' || x.ev === 'refus' || x.ev === 'bloque') continue;  // une tentative n'est pas un appareil
        const d = String(x.dev || '').trim();
        /* ⚠️ UN APPAREIL SANS IDENTIFIANT NE PEUT PAS ÊTRE APPARIÉ, DONC IL COMPTE COMME EN
           RETARD. C'est le sens prudent : il bloque la bascule au lieu de l'autoriser. Une
           version ancienne qui n'envoie pas `dev` est très exactement le cas qu'on cherche. */
        if (!d) { sansId++; continue; }
        vus.add(d);
      }
      for (let i = 0; i < sansId; i++) vus.add('sans-identifiant-' + i);
      return vus.size ? [...vus] : null;
    },
    /* `true` connu, `false` inconnu, `null` si l'annuaire lui-même n'est pas lisible. */
    espaceConnu: (t) => { try { return !!espaceParT(String(t || '')); } catch (e) { return null; } },
    /* ⛔ UN ESPACE FERMÉ OU SUSPENDU NE SE BASCULE PAS, ET IL FAUT QUE ÇA SE VOIE.
       `sauvRefus` refuse `entFermes.espaces` en 403 : un tel espace ne peut même pas ouvrir de
       session de socle, donc il ne pousse plus rien, donc son socle se périme en silence. Le
       basculer sur `socle` lui servirait une base figée au jour de sa suspension.
       ⚠️ ET LA QUESTION INVERSE N'EST PAS TRANCHÉE ICI, EXPRÈS : une entreprise suspendue pour
       impayé DOIT-ELLE continuer à LIRE ? `mentions-legales.html:74` promet qu'un impayé
       « n'entraîne aucune suppression » et que le client « retrouve l'intégralité de ses
       données ». Aujourd'hui c'est tenu sans rien faire, parce que la base vit aussi en local
       et dans Firestore. Le jour où le socle est la seule copie à jour, refuser la lecture
       contredirait ce texte. Ça se décide — voir REPRISE.md — ça ne se glisse pas dans un
       correctif de plomberie. */
    /* ⛔ SUSPENDU N'EST PAS FERMÉ — DÉCISION DE JUSTIN, 20 SEPTEMBRE 2026.
       « Pour continuer à lire, ils auront un délai de 7 jours. Si c'est pas payé après dans les
       7 jours, tous les onglets deviennent gris […] Aucune sauvegarde n'est perdue, aucune
       tâche qu'ils étaient en train de faire, rien n'est perdu, même dans leur catégorie.
       Juste les catégories qui sont payantes deviennent grisées et ils reviennent au forfait
       gratuit. »
       Conséquence pour le socle, et elle est simple : une entreprise suspendue TRAVAILLE. Elle
       lit, elle écrit, elle synchronise — c'est son ABONNEMENT qui change, pas son accès à ses
       propres données. Ce qui devient gris est une affaire d'écrans, pas de stockage.
       ⛔ Seul un espace FERMÉ reste refusé : celui-là n'est plus une entreprise qui travaille.
       ⚠️ Sans cette distinction, le jour où le socle est la seule copie à jour, un impayé
       aurait coupé une entreprise de ses propres données — en contradiction directe avec
       `mentions-legales.html:74`, qui promet qu'un impayé « n'entraîne aucune suppression » et
       que le client « retrouve l'intégralité de ses données s'il revient ». */
    espaceBloque: (t) => { try { return espaceFerme(t); } catch (e) { return null; } },   // suspendu → pas bloqué ; fermé → bloqué
    /* `true` suspendu (abonnement en défaut, mais l'entreprise travaille), `false` sinon. */
    espaceSuspendu: (t) => espaceEstSuspendu(t),
    /* ⛔ LE SURSIS SE CALCULE À UN SEUL ENDROIT — voir `sursisJoursDe`, près d'`entFermes`.
       Il vivait ici, donc `/api/espaces/etat` (la seule route que l'APPLICATION interroge)
       ne pouvait pas le voir : la fonction était juste, commentée, et appelée par personne. */
    espaceSursisJours: (t) => sursisJoursDe(t),
  });
} catch (e) {
  console.error('socle non monté :', e.message);
}

/* Plusieurs inscriptions peuvent porter le même espace : la plus récente fait foi. */
function espaceAJour(slug) {
  let e = espacesReg[slug]; if (!e) return null;
  try { const t = e.t || String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t || ''); const r = espaceParT(t); if (r && r.code) e = r; } catch (err) {}
  return e;
}
/* Identifiant d'équipe porté par un espace de l'annuaire. */
function espaceT(e) {
  if (!e) return '';
  if (e.t) return String(e.t);
  try { return String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t || ''); } catch (err) { return ''; }
}
/* Le lien de connexion d'un espace porte le CODE (#entreprise=…), jamais le nom
   (#e=nom) : un nom se devine, un code non. Le mot de passe provisoire n'y figure
   pas — codeMdpHache l'a remplacé par son empreinte. */
function lienEspaceCode(e) { return 'https://teamop.fr/app.html#entreprise=' + codeMdpHache(e.code); }
/* ══ OUVRIR SON ESPACE AVEC UN CODE D'ACCÈS — HISTORIQUE : RETIRÉ LE 28 SEPTEMBRE 2026 (voir « PLUS DE CODE D'ACCÈS ») ══
   Taper le nom de l'entreprise ne peut pas suffire : le lien de connexion porte la CLÉ qui
   déchiffre les données de l'espace (syncKey la dérive en PBKDF2), et un nom se lit sur un
   camion, une facture, un devis. Mais l'aller-retour par e-mail était un cul-de-sac : une
   entreprise dont la boîte n'est plus relevée ne pouvait plus entrer du tout.
   D'où ce code : dix caractères que le responsable donne à ses équipes et renouvelle depuis la
   Tour. Le nom AVEC le code rend le lien, et l'application demande ensuite identifiant et mot
   de passe, comme avant.
   DIX et non six : à six, 31⁶ ≈ 8,9·10⁸, et seul le compteur par espace tenait la force brute —
   ce qui obligeait à le serrer, donc à laisser n'importe qui verrouiller un espace en tapant à
   côté. À dix, 31¹⁰ ≈ 8,2·10¹⁴ : la force brute n'est plus le sujet. L'alphabet écarte O/0 et
   I/1/L — ce code se dicte au téléphone, depuis un chantier.

   IL VIT DANS SON PROPRE REGISTRE, indexé par l'identifiant d'ÉQUIPE (t), et non dans
   espacesReg indexé par slug. Deux raisons, toutes deux mesurées :
   · espaceAJour() ne rend pas l'objet du registre mais une COPIE (espaceParT termine par un
     Object.assign) : écrire dessus n'écrivait nulle part, et le code affiché au patron n'a
     jamais existé côté serveur — la Tour en montrait un neuf à chaque ouverture, aucun ne
     fonctionnait, et « Renouveler » ne révoquait rien.
   · un même espace peut porter PLUSIEURS noms dans l'annuaire. Rangé par nom, un code révoqué
     ressuscitait dès que le patron rouvrait le panneau d'un ancien nom. Un espace, un code. */
/* ⚠️ HISTORIQUE depuis le 28 septembre 2026 : plus aucun code ne se fabrique ni ne s'accepte (voir « PLUS DE CODE
   D'ACCÈS » juste en dessous). Le registre n'est plus relu que pour effacer l'entrée d'un espace supprimé. */
const ACCES_PATH = path.join(DATA_DIR, 'acces.json');
let accesReg = {};
/* Un registre illisible se dit : sinon on repart avec {} en silence, tous les codes morts, et
   personne ne l'apprend avant qu'un client appelle. */
try { accesReg = JSON.parse(fs.readFileSync(ACCES_PATH, 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') console.error('acces.json illisible — registre vide :', e.message); }
/* Écriture ATOMIQUE : writeFileSync sur le fichier final peut laisser un JSON tronqué si le
   disque se remplit ou si le service tombe au mauvais moment — et un registre tronqué, c'est
   tous les codes de tous les clients perdus. On écrit à côté, puis on renomme : rename est
   atomique, le fichier est toujours entier. Rend true si c'est écrit, pour que l'appelant
   puisse refuser plutôt que d'annoncer une révocation qui n'a pas eu lieu. */
function accesEcrire() {
  try {
    const tmp = ACCES_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(accesReg));
    fs.renameSync(tmp, ACCES_PATH);
    return true;
  } catch (e) { console.error('acces.json non écrit :', e.message); return false; }
}
/* ══ PLUS DE CODE D'ACCÈS — Justin, 28 septembre 2026 : « je veux plus de code, que des liens pour les connexions » ══
   Le code à dix caractères ouvrait un espace qui n'avait encore aucun compte (« Première connexion de l'entreprise ? »).
   Depuis que chaque espace naît avec son compte de départ (`annuaireSemer`), et que le courriel du lien porte l'adresse
   ET les identifiants (`/api/monitor/espaces/mail-acces`), il n'ouvrait plus rien que l'identifiant n'ouvre déjà — et il
   se perdait, se retapait de travers, se redemandait. Les deux routes répondent 410 et le DISENT : une page restée en
   cache sur un téléphone doit afficher pourquoi, pas « code incorrect ». Rien ne fabrique plus de code (`accesReg` n'est
   plus relu que pour être effacé avec son espace). Un espace sans aucun compte se répare depuis la Tour : « Identifiants ».
   `tests/test-669.js` le garde. */
const PLUS_DE_CODE = 'Les codes d\'accès n\'existent plus : on entre avec l\'adresse de l\'entreprise, son identifiant et son mot de passe. Pas encore reçus ? Écrivez à contact@teamop.fr.';
app.post('/api/espaces/ouvrir', (req, res) => res.status(410).json({ error: PLUS_DE_CODE, motif: 'sans_code' }));
app.post('/api/monitor/espaces/acces', monPatronStrict, (req, res) =>
  res.status(410).json({ error: 'Plus de code d\'accès : l\'adresse et les identifiants suffisent. Un espace sans compte se répare par « Identifiants » sur sa fiche.', motif: 'sans_code' }));
/* ══ CHANGER LES IDENTIFIANTS DE DÉPART D'UN ESPACE ═══════════════════════════════════════
   Justin ouvre un accès depuis la Tour, oublie le mot de passe, et n'a aucun moyen de le
   reprendre. On le lui rend — MAIS seulement tant que personne ne s'est connecté.
   La raison n'est pas un excès de prudence : après la première connexion, le mot de passe réel
   vit dans les données CHIFFRÉES de l'espace, que le serveur ne peut ni lire ni écrire. Le
   « mot de passe provisoire » n'est qu'une amorce, lue une seule fois par l'application au
   tout premier démarrage. Le réécrire après coup ne changerait rien et ferait mentir l'écran :
   on refuse et on dit pourquoi. */
app.post('/api/monitor/espaces/identifiants', monPatronStrict, (req, res) => {
  const slug = espSlug(monStr((req.body || {}).slug || (req.body || {}).nom, 80));
  const e = espaceAJour(slug);
  if (!e || !e.code) return res.status(404).json({ error: 'Espace inconnu' });
  const t = espaceT(e);
  /* Sans identifiant d'équipe, on ne peut PAS savoir si l'espace a servi : cnxResume('') rend
     un compteur vide, donc « jamais connecté », donc on écrirait. « Je ne sais pas » doit
     refuser. */
  if (!t) return res.status(409).json({ error: 'Cet espace n\'a pas d\'identifiant d\'équipe lisible : impossible de savoir s\'il a déjà servi, donc impossible de changer ses identifiants sans risque.' });
  const vu = cnxResume(t);
  if (vu.derniere) return res.status(409).json({
    error: 'Cet espace a déjà servi (dernière connexion enregistrée) : son mot de passe vit désormais dans ses données chiffrées, le serveur ne peut plus le changer. C\'est à la personne de passer par « mot de passe oublié » dans l\'application.' });
  const ident = monStr((req.body || {}).ident, 40).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const mdp = monStr((req.body || {}).mdp, 200);
  if (!ident || mdp.length < 8) return res.status(400).json({ error: 'Un identifiant et un mot de passe d\'au moins 8 caractères sont requis' });
  let o;
  try { o = JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')); } catch (err) { o = null; }
  /* Le test du TYPE n'est pas de la coquetterie : sans « use strict », écrire une propriété sur
     un primitif (un code qui décoderait vers 123) échoue SANS lever, puis on réécrirait le code
     avec ce primitif — « t » et « k » perdus, données de l'entreprise irrécupérables. Le voisin
     codeMdpHache porte déjà exactement cette garde. */
  if (!o || typeof o !== 'object' || Array.isArray(o) || !o.t || !o.k)
    return res.status(500).json({ error: 'Code d\'espace illisible ou incomplet — rien n\'a été touché.' });
  o.a = ident; o.mh = mdpEmpreinte(mdp); delete o.m;
  const neuf = Buffer.from(JSON.stringify(o), 'utf8').toString('base64').replace(/=+$/, '');
  /* On écrit sur l'entrée VIVANTE du registre, pas sur la copie que rend espaceAJour. */
  const vraiSlug = e.slug || slug;
  if (!espacesReg[vraiSlug]) return res.status(500).json({ error: 'Entrée d\'annuaire introuvable' });
  /* On mémorise l'ancien code AVANT de muter : si l'écriture échoue, le serveur servirait le
     nouveau jusqu'au redémarrage tout en répondant « rien n'a changé ». Le patron croirait
     l'opération annulée. Même motif que /api/monitor/espaces/acces. */
  const avant = espacesReg[vraiSlug].code;
  espacesReg[vraiSlug].code = neuf;
  if (!espacesEcrire()) {
    espacesReg[vraiSlug].code = avant;
    return res.status(500).json({ error: 'Enregistrement impossible — rien n\'a changé.' });
  }
  console.log('Tour :', req.tourUser.nom, 'change les identifiants de départ de l\'espace', t);
  /* REMPLACER : cette route refuse déjà tout espace ayant servi, donc ce qu'on écrase est
     forcément le semis précédent. Sans ça, le patron dicterait un identifiant pendant que
     l'ancien continuerait d'ouvrir. */
  annuaireSemerDepuisCode(t, neuf, true).catch(() => {});
  res.json({ ok: true, ident: ident, lien: 'https://teamop.fr/app.html#entreprise=' + neuf });
});
/* ══ SE CONNECTER AVEC SON IDENTIFIANT, SANS LIEN NI CODE ═══════════════════════════════════
   Le problème posé, en clair : le lien (#entreprise=…) et le code d'accès à dix caractères
   sont des secrets D'ENTREPRISE. Qui les perd — un salarié qui se déconnecte, un téléphone
   remplacé, un navigateur vidé — n'a plus de porte du tout et doit rappeler son patron.
   Organilog demande une adresse d'entreprise, puis l'identifiant et le mot de passe de la
   personne. C'est exactement ce qu'on met en place ici.

   L'obstacle était réel et il faut le nommer : les comptes (identifiant, mot de passe) vivent
   dans les données CHIFFRÉES de l'espace, que le serveur ne sait pas lire. Il ne pouvait donc
   rien vérifier. La solution n'est pas de déchiffrer — ce serait renoncer au chiffrement —
   c'est de faire DÉPOSER par l'application un VÉRIFICATEUR : pour chaque compte, un sel et
   PBKDF2(empreinte du mot de passe, sel, 120 000 tours). Le serveur ne peut ni en tirer le mot
   de passe, ni s'en servir ailleurs ; il peut seulement répondre « oui, c'est bien celui-là ».

   Ce qu'il rend en cas de succès, c'est le code de l'espace — donc « k », la clé des données.
   C'est EXACTEMENT ce que rend déjà /api/espaces/ouvrir contre le code à dix caractères, et ce
   que porte le lien de connexion. La nouveauté n'est donc pas la divulgation, c'est sa
   CONDITION : un mot de passe personnel, révocable compte par compte, au lieu d'un secret
   partagé par toute l'entreprise et impossible à retirer à une seule personne.

   Ce que ça ne fait pas, et qu'il ne faut pas se raconter : tant qu'une entreprise n'a pas
   ouvert l'application au moins une fois avec cette version, son annuaire est vide et ce
   chemin ne marche pas pour elle. Le code d'accès est resté en place comme filet jusqu'au
   28 septembre 2026 ; depuis, chaque espace naît avec son compte de départ (le semis), et un
   espace sans compte se répare depuis la Tour (« Identifiants »). */
const COMPTES_PATH = path.join(DATA_DIR, 'comptes.json');
let comptesReg = {};
/* Illisible se dit, comme pour acces.json : repartir de {} en silence, c'est laisser toutes
   les entreprises sans porte d'entrée par identifiant sans que personne ne l'apprenne. */
try { comptesReg = JSON.parse(fs.readFileSync(COMPTES_PATH, 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') console.error('comptes.json illisible — annuaire de connexion vide :', e.message); }
function comptesEcrire() {   // ATOMIQUE : tmp + rename, même motif que acces.json
  try {
    const tmp = COMPTES_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(comptesReg));
    fs.renameSync(tmp, COMPTES_PATH);
    return true;
  } catch (e) { console.error('comptes.json non écrit :', e.message); return false; }
}
const CNX_ITER = 120000;   // le même chiffre que syncKey() dans l'application — un seul réglage à retenir
/* L'application dépose son annuaire de connexion. Elle prouve qu'elle détient la clé d'équipe,
   exactement comme /api/espaces/lien : sans cela, n'importe qui écraserait l'annuaire d'une
   entreprise avec ses propres vérificateurs et entrerait chez elle. */
let comptesQuota = new Map();
setInterval(() => { comptesQuota = new Map(); }, 3600000).unref();
app.post('/api/espaces/comptes', (req, res) => {
  const b = req.body || {};
  const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
  if (!t || !/^[0-9a-f]{64}$/.test(kh)) return res.status(400).json({ error: 't et kh requis' });
  if (comptesQuota.size > 5000) comptesQuota = new Map();
  if (!quotaOk(comptesQuota, 'ip:' + (req.ip || '?'), 120, 3600000))
    return res.status(429).json({ error: 'trop de dépôts — réessaie plus tard' });
  const e = espaceParT(t);
  if (!e || !e.code) return res.status(404).json({ error: 'espace inconnu' });
  let cle = '';
  try { cle = String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).k || ''); } catch (err) {}
  if (!cle || crypto.createHash('sha256').update(cle).digest('hex') !== kh)
    return res.status(403).json({ error: 'clé d\'équipe incorrecte' });
  if (espaceFerme(t)) return res.status(403).json({ error: 'espace fermé' });
  const recu = Array.isArray(b.comptes) ? b.comptes.slice(0, 300) : null;
  if (!recu) return res.status(400).json({ error: 'comptes requis' });
  /* ⛔ ET RIEN NE SE DÉPOSE SUR L'ESPACE PAR DÉFAUT — même décision que la route de connexion.
     Fermer l'entrée sans fermer le dépôt laisserait un appareil y réinscrire des comptes que
     plus personne ne pourrait utiliser : de l'annuaire mort, qui se répare pendant des mois. */
  if (ESPACES_INTOUCHABLES.includes(t))
    return res.status(403).json({ error: 'Espace par défaut de l\'application : aucun compte ne s\'y dépose.' });
  /* Même porte que le nuage : une version sous le minimum ne dépose plus l'annuaire — c'est
     par ce chemin qu'un appareil périmé remplaçait 11 comptes par 3 (comptes.json est remplacé
     en entier). Une version d'avant ce verrou n'envoie pas `ver` : elle passe tant qu'aucun
     minimum n'est exigé, plus jamais ensuite. */
  if (versionsCfg.min) {
    const ver = parseInt(String(b.ver || '').replace(/[^0-9]/g, ''), 10) || 0;
    if (ver < versionsCfg.min) return res.status(426).json({ error: 'version trop ancienne — mets l\'application à jour', min: versionsCfg.min });
  }
  /* Le strict nécessaire, plus le NOM depuis le 10 septembre 2026 — décision de Justin : dans la
     Tour, sous l'identifiant, on doit lire qui c'est (deux « florent », impossible de savoir
     lequel supprimer). Ni adresse, ni téléphone : ça reste un annuaire de connexion, pas un
     fichier du personnel. */
  /* Sans prototype : rien de ce qu'on écrit ici ne doit pouvoir devenir « __proto__ » ou
     « constructor » du côté lecture. Les trois noms sont refusés en plus, explicitement — un
     compte ne s'appelle pas ainsi, et les garder ne servirait qu'à piéger la route voisine. */
  const table = Object.create(null);
  const INTERDITS = ['__proto__', 'constructor', 'prototype'];
  const ancien = (comptesReg[t] && comptesReg[t].c) || Object.create(null);   // pour reporter l'état connu, voir plus bas
  for (const c of recu) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) continue;
    const login = monStr(c.login, 40).toLowerCase().trim();
    const sel = monStr(c.s, 32).toLowerCase(), emp = monStr(c.e, 64).toLowerCase();
    if (!login || INTERDITS.includes(login)) continue;
    if (!/^[0-9a-f]{32}$/.test(sel) || !/^[0-9a-f]{64}$/.test(emp)) continue;
    if (ordreBanni(t, login)) continue;   // supprimé depuis la Tour : la porte reste fermée tant que le patron ne réautorise pas
    /* ⛔ UN MOT DE PASSE REFAIT DEPUIS LA TOUR NE SE FAIT PAS DÉFAIRE PAR UN DÉPÔT. Cette route
       remplace `comptes.json` EN ENTIER à partir des fiches de l'appareil qui dépose. Or l'ordre
       de mot de passe met un moment à être exécuté : entre-temps, n'importe quel appareil qui
       ajoute un utilisateur redéposerait l'ANCIENNE empreinte, et l'annuaire reperdrait le mot
       de passe que le patron vient de dicter au téléphone — sans que rien ne le signale.
       On garde donc l'entrée telle que la Tour l'a écrite tant que l'ordre est en attente.
       Ce n'est pas une exception de confort : c'est la seule façon de rendre les deux moitiés
       (annuaire tout de suite, fiche plus tard) sûres dans n'importe quel ordre d'arrivée. */
    if (ordreMdpAttente(t, login) && Object.prototype.hasOwnProperty.call(ancien, login)) { table[login] = ancien[login]; continue; }
    /* ⛔ DEUX BOOLÉENS, ET RIEN DE PERSONNEL — Justin, 15 septembre 2026 : « on voit les
       identifiants qui changent leur mot de passe, et on voit ceux qui sont toujours en mot de
       passe provisoire ». La base de l'entreprise est chiffrée : ce serveur ne peut PAS la
       lire, et l'application est la seule à connaître cet état. Elle envoie donc 1 ou 0 —
       `p` : la campagne sécurité lui reste à faire · `m` : une adresse e-mail est enregistrée.
       Jamais l'adresse elle-même : ça resterait un annuaire de connexion, pas un fichier du
       personnel, et une fuite de comptes.json ne doit pas devenir une fuite d'e-mails. */
    table[login] = { s: sel, e: emp, n: monStr(c.n, 60).trim() };
    /* ⚠️ ON POSE LES DEUX CLÉS MÊME À 0. Les omettre quand c'est faux économiserait trois
       octets et rendrait « fait » indistinguable de « déposé par une version qui ne le disait
       pas » — la Tour afficherait « tout va bien » sur une information qu'elle n'a pas. La
       PRÉSENCE de la clé dit « cette version sait répondre », sa valeur dit quoi.
       ⛔ ET UN APPAREIL QUI NE SAIT PAS RÉPONDRE N'EFFACE PAS LA RÉPONSE DES AUTRES. Signalé
       par `gardien` le 15 septembre 2026, et c'était le vrai défaut de la livraison : le
       minimum exigé est 641, donc toute version 641→680 dépose SANS `p` ni `m`, et
       `comptes.json` est remplacé EN ENTIER. Chez une entreprise au parc mixte, l'indicateur
       de la Tour se mettait donc à clignoter — « 8 encore sur le mot de passe provisoire »
       après l'ouverture d'un téléphone à jour, « 8 inconnus » après celle d'un téléphone en
       retard, au gré de qui allume quoi. Un indicateur de SÉCURITÉ instable est pire que pas
       d'indicateur : le patron croit une campagne faite et ne la relance pas. On REPORTE donc
       l'état connu au lieu de le perdre — ce que la v681 a dit reste vrai tant qu'une v681 ne
       dit pas autre chose. (`hasOwnProperty` et pas `ancien[login]` nu : `login` vient du
       corps de la requête, et c'est la discipline du reste du fichier.) */
    const prec = Object.prototype.hasOwnProperty.call(ancien, login) ? ancien[login] : null;
    if (typeof c.p !== 'undefined') table[login].p = c.p ? 1 : 0;
    else if (prec && typeof prec.p !== 'undefined') table[login].p = prec.p ? 1 : 0;
    if (typeof c.m !== 'undefined') table[login].m = c.m ? 1 : 0;
    else if (prec && typeof prec.m !== 'undefined') table[login].m = prec.m ? 1 : 0;
  }
  /* Un annuaire vide ne remplace JAMAIS un annuaire garni : un bogue de l'application, une
     synchro pas encore descendue, et toute l'entreprise se retrouvait dehors sans rien avoir
     fait. Effacer un annuaire se fait en fermant l'espace, pas par accident. */
  const avant = comptesReg[t];
  if (!Object.keys(table).length) {
    if (avant && avant.c && Object.keys(avant.c).length)
      return res.status(409).json({ error: 'annuaire vide refusé — l\'ancien est conservé' });
    /* On envoyait des comptes et il n'en reste aucun : dire « ok » ferait croire l'annuaire
       déposé alors que la connexion par identifiant ne marchera pas. */
    if (recu.length) return res.status(400).json({ error: 'aucun compte exploitable dans l\'envoi' });
    return res.json({ ok: true, n: 0 });
  }
  const neuf = { maj: Date.now(), c: table };
  // on n'écrit que si le contenu a bougé : la route est appelée à chaque connexion
  if (avant && JSON.stringify(avant.c) === JSON.stringify(table)) return res.json({ ok: true, n: Object.keys(table).length, inchange: true });
  comptesReg[t] = neuf;
  if (!comptesEcrire()) {
    if (avant) comptesReg[t] = avant; else delete comptesReg[t];
    return res.status(500).json({ error: 'annuaire non enregistré' });
  }
  console.log('annuaire de connexion :', Object.keys(table).length, 'compte(s) pour l\'espace', t);
  res.json({ ok: true, n: Object.keys(table).length });
});
/* ══ SEMER LE PREMIER COMPTE D'UN ESPACE NEUF ══════════════════════════════════════════════
   ⛔ CE QUI REND LE LIEN SUFFISANT. Décision de Justin, 14 septembre 2026 : « je ne veux plus
   le code, je veux que tout passe par le lien ». Le lien ouvre teamop.fr/e/<adresse>, la
   personne y tape son identifiant et son mot de passe, et /api/espaces/connexion tranche.
   Sauf qu'un espace NEUF n'a aucun annuaire — il se remplit quand l'application dépose sa
   liste, donc APRÈS la première connexion. La route répondait donc « Cette entreprise ne
   connaît pas encore la connexion par identifiant. Utilise son code d'accès une première
   fois. » L'œuf et la poule : sans le code, personne ne pouvait entrer la première fois, donc
   le code ne pouvait pas être retiré.
   Le serveur avait pourtant tout sous la main depuis le début : le code de l'espace porte
   « a » (l'identifiant de départ) et « mh » (l'empreinte SHA-256 du mot de passe provisoire),
   et c'est exactement cette empreinte que le navigateur envoie en « h ». Il n'y a qu'à en
   dériver le vérificateur, comme l'application le fait pour ses propres comptes.

   ⚠️ CE QUE ÇA N'OUVRE PAS. Le vérificateur ne se calcule qu'à partir de « mh », qui vit déjà
   dans le code de l'espace ; et entrer exige toujours le mot de passe provisoire LUI-MÊME, que
   seul le courriel de bienvenue porte. On ne rend donc lisible aucun secret qui ne l'était pas.
   Ce qui change, et qu'il faut savoir : ce mot de passe est faible par construction
   (« Durand!! », dérivé du nom), et il devient éprouvable depuis une route publique. Trois
   choses le bornent — le plafond de 60 échecs par heure et par IP, le fait que l'application
   impose un vrai mot de passe dès la première connexion, et qu'il ne vaut que jusque-là.

   ⛔ N'ÉCRASE JAMAIS UN ANNUAIRE EXISTANT : la liste de l'application fait foi dès qu'elle
   arrive. Ce semis ne vaut que pour l'intervalle entre la création et la première connexion.

   Volontairement SANS await chez l'appelant : PBKDF2 à 120 000 tours prend ~100 ms, et
   personne n'attend — le courriel part, la personne se connecte au mieux quelques secondes
   plus tard. Un échec se dit au journal plutôt que de faire échouer une création d'espace. */
function annuaireSemer(t, ident, mh, remplacer) {
  const login = String(ident || '').toLowerCase().trim();
  if (!t || !login || !/^[0-9a-f]{64}$/.test(String(mh || ''))) return Promise.resolve(false);
  /* `remplacer` n'est vrai qu'au changement des identifiants de DÉPART, et cette route-là
     refuse déjà tout espace ayant servi (« son mot de passe vit dans ses données chiffrées »).
     Ce qu'on remplace alors est forcément un semis, jamais des comptes vivants. Sans ce
     drapeau, changer l'identifiant de départ laissait l'ANCIEN semis en place : le patron
     dictait un identifiant, et c'est le précédent qui ouvrait. */
  const dejaLa = comptesReg[t] && comptesReg[t].c && Object.keys(comptesReg[t].c).length;
  if (dejaLa && !remplacer) return Promise.resolve(false);
  const sel = crypto.randomBytes(16).toString('hex');
  return new Promise((ok) => {
    crypto.pbkdf2(mh, Buffer.from(sel, 'hex'), CNX_ITER, 32, 'sha256', (err, d) => {
      if (err) { console.error('semis d\'annuaire impossible pour l\'espace', t, ':', err.message); return ok(false); }
      /* Relu APRÈS le calcul : 100 ms se sont écoulées, l'application a pu déposer sa vraie
         liste entre-temps. L'écraser remplacerait des comptes vivants par une amorce. */
      if (!remplacer && comptesReg[t] && comptesReg[t].c && Object.keys(comptesReg[t].c).length) return ok(false);
      const avant = comptesReg[t];
      const table = Object.create(null);
      /* `p: 1` n'est pas une supposition : ce compte de départ est semé À PARTIR de `mh`,
         l'empreinte du mot de passe PROVISOIRE du blob d'espace. Le serveur connaît donc la
         réponse — rendre « on ne sait pas » sur le seul cas où il sait ferait afficher
         « 1 inconnu » à une entreprise qui vient d'être créée, c'est-à-dire au cas que cet
         indicateur vise en premier. `m: 0` de même : aucune adresse n'a encore été donnée. */
      table[login] = { s: sel, e: d.toString('hex'), n: '', p: 1, m: 0 };
      comptesReg[t] = { maj: Date.now(), c: table };
      if (!comptesEcrire()) { if (avant) comptesReg[t] = avant; else delete comptesReg[t]; return ok(false); }
      console.log('annuaire semé (1 compte de départ) pour l\'espace', t);
      ok(true);
    });
  });
}
/* Semer depuis un code d'espace, quand on n'a pas « a » et « mh » sous la main séparément. */
function annuaireSemerDepuisCode(t, code, remplacer) {
  try { const o = JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
    return annuaireSemer(t, o.a, o.mh, remplacer); } catch (err) { return Promise.resolve(false); }
}
/* ══ RATTRAPAGE : LES ESPACES D'AVANT LE SEMIS ═════════════════════════════════════════════
   Semer à la création ne suffisait pas à retirer le code d'accès : les espaces inscrits AVANT
   n'ont pas d'annuaire tant que personne ne s'y est connecté. Depuis que le code n'existe plus
   (28 septembre 2026), ce rattrapage est leur seule porte : sans lui, toute entreprise à qui on
   a ouvert un accès qu'elle n'a pas encore utilisé resterait dehors.
   On repasse donc une fois au démarrage sur les espaces SANS annuaire. Un espace qui en a un
   est ignoré — annuaireSemer le revérifie de toute façon.
   ⚠️ UN PAR UN, ESPACÉS. Chaque semis est un PBKDF2 à 120 000 tours (~100 ms) : les lancer
   ensemble gèlerait la boucle d'événements au pire moment, juste quand les appareils du matin
   se reconnectent. Le rattrapage n'est pas urgent — il vise des espaces qui, par définition,
   n'ont encore jamais servi. Il démarre après 10 s pour laisser le serveur répondre d'abord. */
setTimeout(() => {
  const aFaire = Object.values(espacesReg)
    .filter(e => e && e.code)
    .map(e => ({ t: espaceT(e), code: e.code }))
    .filter(x => x.t && !ESPACES_INTOUCHABLES.includes(x.t)
      && !(comptesReg[x.t] && comptesReg[x.t].c && Object.keys(comptesReg[x.t].c).length)
      /* ⛔ Jamais sur un espace qui a déjà servi (`gardien`, 28 septembre 2026) : son mot de passe provisoire n'est plus
         le sien, et semer le rouvrirait avec — c'est un appareil à jour qui redépose son annuaire. */
      && !cnxResume(x.t).derniere);
  /* Un même espace porte plusieurs entrées d'annuaire (espaceParT) : sans ce dédoublonnage on
     sèmerait deux fois le même, et le second passage écraserait le premier pour rien. */
  const vus = new Set(); const liste = aFaire.filter(x => !vus.has(x.t) && vus.add(x.t));
  if (!liste.length) return;
  console.log('rattrapage d\'annuaire :', liste.length, 'espace(s) sans compte de départ');
  let i = 0; const sansAmorce = [];
  const suivant = () => {
    if (i >= liste.length) {
      /* ⛔ LA LISTE À TRAITER DEPUIS QUE LE CODE D'ACCÈS N'EXISTE PLUS. Un code d'espace ancien
         peut n'avoir ni « a » ni « mh » — rien à dériver, donc pas de semis possible, donc AUCUNE
         porte pour cette entreprise tant qu'on ne lui a pas posé d'identifiant de départ depuis
         la Tour (« Identifiants » ; la Tour la marque « aucun compte »).
         Seuls les identifiants d'équipe sortent au journal : jamais un nom, jamais une
         adresse — c'est assez pour les retrouver dans la Tour. */
      if (sansAmorce.length)
        console.warn('⛔ ' + sansAmorce.length + ' espace(s) SANS identifiant de départ dans leur code : '
          + 'plus aucune porte (le code d\'accès n\'existe plus depuis le 28 septembre 2026) — la Tour les marque « aucun compte » ; '
          + 'poser leurs identifiants (« Identifiants » sur leur fiche) : ' + sansAmorce.join(', '));
      return;
    }
    const x = liste[i++];
    let amorce = false;
    try { const o = JSON.parse(Buffer.from(x.code, 'base64').toString('utf8')); amorce = !!(o && o.a && o.mh); } catch (err) {}
    if (!amorce) { sansAmorce.push(x.t); return suivant(); }
    annuaireSemerDepuisCode(x.t, x.code).catch(() => {}).then(() => setTimeout(suivant, 250));
  };
  suivant();
  /* Le délai est réglable par l'environnement UNIQUEMENT pour que le banc d'essai puisse
     l'éprouver sans attendre dix secondes : la production n'a pas cette variable, et un
     rattrapage qu'on ne peut pas tester est un rattrapage qu'on croit sur parole. */
}, parseInt(process.env.TEAMOP_RATTRAPAGE_MS, 10) || 10000).unref();
let cnxQuota = new Map();
setInterval(() => { cnxQuota = new Map(); }, 3600000).unref();
let cnxEchecs = new Map();
setInterval(() => { cnxEchecs = new Map(); }, 3600000).unref();
app.post('/api/espaces/connexion', async (req, res) => {
  const b = req.body || {};
  // borné AVANT espSlug : son normalize('NFD') sur plusieurs Mo gèle la boucle d'événements
  const slug = espSlug(monStr(b.nom, 80));
  const login = monStr(b.login, 40).toLowerCase().trim();
  const h = monStr(b.h, 64).toLowerCase();
  if (!slug || !login || !/^[0-9a-f]{64}$/.test(h))
    return res.status(400).json({ error: 'Nom de l\'entreprise, identifiant et mot de passe requis' });
  if (cnxQuota.size > 5000) cnxQuota = new Map();
  const ip = req.ip || '?';   // req.ip, jamais l'en-tête brut : il est fourni par le client
  /* On compte les ÉCHECS, pas les connexions. Compter tout mettait dehors ce qu'on veut
     justement servir : une équipe de trente personnes qui arrive à 7 h derrière la même box en
     4G épuise soixante requêtes en quelques minutes, mots de passe corrects en main. La force
     brute, elle, ne produit que des échecs — c'est eux qu'il faut borner. Le plafond par minute
     des routes sensibles (PLAFOND_STRICT) borne séparément le coût de calcul. */
  const echecsIp = cnxQuota.get('ip:' + ip);
  if (echecsIp && Date.now() < echecsIp.reset && echecsIp.n > 60)
    return res.status(429).json({ error: 'Trop d\'essais infructueux — réessaie dans une heure.' });
  const e = espaceAJour(slug);
  const t = e ? espaceT(e) : '';
  const refus = () => res.status(403).json({ error: 'Entreprise, identifiant ou mot de passe incorrect.' });
  /* ⛔ ON NE SE CONNECTE PLUS À L'ESPACE PAR DÉFAUT — décision de Justin, 15 septembre 2026 :
     « je veux que plus personne ne se connecte et que ce ne soit pas n'importe où ».
     La synchro y était déjà morte depuis la v672 (`/api/fb/jeton` rend 403 via `sauvRefus`),
     mais la PORTE, elle, était restée ouverte : on pouvait encore s'y connecter par identifiant
     et y déposer des comptes. Un espace sans nuage où des gens travaillent quand même est pire
     qu'un espace fermé — ils saisissent, rien ne part, et personne ne le voit.
     ⚠️ La bêta est dans la même liste et ne perd rien : elle n'a jamais déposé d'annuaire
     (`annuaireDeposer` sort sur `BETA_ESSAI`), donc cette route lui répondait déjà
     « sans-annuaire ». Ses accès vivent dans `beta-comptes.json`, par la Tour.
     Le message NOMME la cause au lieu de se fondre dans le refus générique : ce n'est pas un
     mot de passe à retrouver, c'est une adresse à changer. */
  if (t && ESPACES_INTOUCHABLES.includes(t))
    return res.status(403).json({ motif: 'technique',
      error: 'Cette adresse n\'est pas celle d\'une entreprise : c\'est l\'espace par défaut de l\'application, et il est fermé. Utilise le lien de ton entreprise.' });
  /* Clé d'équipe périmée (constatée par /api/espaces/lien) : le code de l'annuaire ne
     déchiffre plus les données. Rendre « k » quand même ferait entrer la personne dans un
     espace vide, sans un mot d'explication. */
  if (e && e.slug && espacesReg[e.slug] && espacesReg[e.slug].clePerimee)
    return res.status(409).json({ motif: 'cle_perimee',
      error: 'L\'espace de cette entreprise est à réinscrire chez TEAM OP — contacte-nous, la connexion ne peut pas aboutir.' });
  const ann = (t && !espaceFerme(t)) ? comptesReg[t] : null;
  /* « Pas encore activé » est rendu AUSSI pour un nom qui n'existe pas. Sans cela, la
     différence entre les deux réponses dirait qui est client de TEAM OP. Rendu pour les deux,
     le message ne dit rien de plus qu'il ne faut, et il évite qu'une personne s'acharne une
     heure sur un mot de passe pourtant juste. */
  if (!e || !e.code || !t || !ann || !ann.c || !Object.keys(ann.c).length)
    return res.status(409).json({ motif: 'sans-annuaire',
      error: 'Cette entreprise n\'a encore aucun compte ouvert : ses identifiants lui sont envoyés par TEAM OP avec son lien de connexion. Pas reçus ? Écrivez à contact@teamop.fr.' });
  /* hasOwnProperty, et JAMAIS ann.c[login] directement : « ann.c » vient d'un JSON, c'est un
     objet ordinaire. ann.c['__proto__'] rend Object.prototype et ann.c['constructor'] rend la
     fonction Object — tous deux « truthy », dont le champ « e » vaut undefined. Buffer.from
     lève alors, hors du try, dans un gestionnaire async qu'Express 4 ne rattrape pas : le
     processus meurt. Une requête non authentifiée, un nom d'entreprise, et toute l'API tombe.
     Mesuré : « __proto__ » et « constructor » tuaient le serveur, les autres membres de
     Object.prototype survivaient au .toLowerCase(). */
  const brut = Object.prototype.hasOwnProperty.call(ann.c, login) ? ann.c[login] : null;
  /* Et on vérifie la FORME avant de s'en servir : un registre abîmé à la main ne doit pas
     pouvoir faire lever Buffer.from non plus. Ce qui ne ressemble pas à un vérificateur n'en
     est pas un — on le traite comme un identifiant inconnu. */
  const enr = (brut && typeof brut === 'object' && !Array.isArray(brut)
    && /^[0-9a-f]{32}$/.test(String(brut.s || '')) && /^[0-9a-f]{64}$/.test(String(brut.e || ''))) ? brut : null;
  /* Le calcul se fait TOUJOURS, même pour un identifiant inconnu, et sur un sel jetable :
     autrement le temps de réponse dirait quels identifiants existent dans l'entreprise. */
  let bon = false;
  try {
    const sel = Buffer.from(enr ? enr.s : crypto.randomBytes(16).toString('hex'), 'hex');
    const calc = await new Promise((ok, ko) =>
      crypto.pbkdf2(h, sel, CNX_ITER, 32, 'sha256', (err, d) => err ? ko(err) : ok(d)));
    if (enr) {
      const attendu = Buffer.from(enr.e, 'hex');
      bon = attendu.length === calc.length && crypto.timingSafeEqual(attendu, calc);
    }
  } catch (err) {
    // filet de dernier recours : cette route ne doit JAMAIS pouvoir emporter le processus
    console.error('connexion : vérification impossible —', err.message);
    return res.status(500).json({ error: 'Vérification impossible — réessaie.' });
  }
  if (!bon) {
    quotaOk(cnxQuota, 'ip:' + ip, 60, 3600000);   // c'est ici, et seulement ici, qu'un essai se compte
    /* Compté APRÈS vérification et par espace existant seulement — même raisonnement que
       /api/espaces/ouvrir : sinon n'importe qui verrouille un espace en tapant à côté. */
    if (cnxEchecs.size > 5000) cnxEchecs = new Map();
    const n = (cnxEchecs.get(t) || 0) + 1;
    cnxEchecs.set(t, n);
    if (n === 20) console.warn('connexion par identifiant : 20 échecs en une heure sur l\'espace', t);
    return refus();
  }
  /* Ce qu'on rend est le code de l'espace, amputé de « e » — l'adresse e-mail de l'entreprise
     est la coordonnée d'un tiers. « a » et « mh » restent, pour la même raison qu'à
     /api/espaces/ouvrir : sans « mh », un espace neuf s'ouvrirait avec sha256('1234'). */
  let rendu = codeMdpHache(e.code);
  try {
    const o = JSON.parse(Buffer.from(rendu, 'base64').toString('utf8'));
    delete o.e;
    rendu = Buffer.from(JSON.stringify(o), 'utf8').toString('base64').replace(/=+$/, '');
  } catch (err) {}
  // ni IP ni identifiant : l'identifiant d'équipe suffit à enquêter, le reste est personnel
  console.log('espace ouvert par identifiant · espace', t);
  res.json({ ok: true, code: rendu, nom: espNomPropre(e) });
});
/* espaces.json porte le « k » de TOUS les clients : une écriture tronquée (disque plein,
   service coupé au mauvais moment) les perd tous d'un coup. On écrit à côté puis on renomme,
   comme acces.json et comptes.json. Rend false plutôt que de lever, pour que l'appelant puisse
   revenir en arrière au lieu d'annoncer un enregistrement qui n'a pas eu lieu. */
function espacesEcrire() {
  /* ⛔ JAMAIS PAR-DESSUS UN ANNUAIRE QU'ON N'A PAS PU LIRE : voir `espacesIllisible`. */
  if (espacesIllisible) { console.error('⛔ espaces.json NON réécrit : il était illisible au démarrage — le réparer, puis redémarrer'); return false; }
  try {
    const tmp = ESPACES_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(espacesReg));
    fs.renameSync(tmp, ESPACES_PATH);
    return true;
  } catch (e) { console.error('espaces.json non écrit :', e.message); return false; }
}
/* ══ LES APPLICATIONS OUVERTES À UNE ENTREPRISE ═════════════════════════════════════════════
   OP MESSAGES est sorti des formules d'OP GESTION : ce n'est plus une case d'un forfait, c'est
   une application à part qu'on ouvre à qui la demande. Une seule route, un seul drapeau — pas
   de seconde liste à tenir à jour à côté de l'annuaire, qui finirait par diverger.
   Ce que ça change chez le client : la rangée « SUITE » d'OP GESTION n'apparaît que si c'est
   ouvert. Fermé, OP GESTION redevient OP GESTION, et rien d'autre. */
app.post('/api/monitor/espaces/apps', monPatronStrict, (req, res) => {
  const slug = espSlug(monStr((req.body || {}).slug || (req.body || {}).nom, 80));   // borné : voir /api/espaces/ouvrir
  const e = espaceAJour(slug);
  const t = e ? espaceT(e) : '';
  if (!e || !t) return res.status(404).json({ error: 'Espace inconnu, ou sans identifiant d\'équipe lisible' });
  /* On écrit sur l'entrée VIVANTE du registre, pas sur la copie que rend espaceAJour — c'est
     exactement l'erreur qui avait rendu le code d'accès invisible côté serveur. */
  const vraiSlug = e.slug || slug;
  if (!espacesReg[vraiSlug]) return res.status(500).json({ error: 'Entrée d\'annuaire introuvable' });
  /* Comparaison stricte, pas « !! » : avec un booléen relâché, {"opMessages":"false"} OUVRAIT
     l'application. Sur une option facturée à part, la direction de l'échec doit être la
     fermeture, jamais l'ouverture. */
  const veut = (req.body || {}).opMessages === true;
  const avant = espacesReg[vraiSlug].opMessages;
  if (veut) espacesReg[vraiSlug].opMessages = true; else delete espacesReg[vraiSlug].opMessages;
  if (!espacesEcrire()) {
    if (avant) espacesReg[vraiSlug].opMessages = avant; else delete espacesReg[vraiSlug].opMessages;
    return res.status(500).json({ error: 'Enregistrement impossible — rien n\'a changé.' });
  }
  console.log('Tour :', req.tourUser.nom, (veut ? 'ouvre' : 'ferme'), 'OP MESSAGES pour l\'espace', t);
  res.json({ ok: true, slug: vraiSlug, opMessages: veut });
});
/* ══ L'ÉTAT D'OP MESSAGES ══════════════════════════════════════════════════════════════════
   L'application est en travaux : ses collections sont sorties du projet elan-gestion, la bascule
   vers son propre projet attend une configuration web. La Tour OP MESSAGES le dit tel quel — on
   n'invente pas de chiffres pour remplir un écran, l'état explicite EST l'information. Le jour de
   la bascule, le patron le déclare ici, et l'accueil cesse d'afficher « en travaux ». Sans fichier,
   c'est en travaux : on ne prétend jamais qu'elle marche. */
const OPMSG_PATH = path.join(DATA_DIR, 'opmessages.json');
// Plus de `note` : elle disait « bascule vers le projet OP MESSAGES » (Firebase), et la Tour l'affichait encore le 2 octobre 2026 alors
// qu'OP MESSAGES a son propre serveur. Le texte de l'accueil vit dans la Tour ; `projet` est désormais le nom de ce serveur.
const OPMSG_DEFAUT = { enTravaux: true, depuis: '2026-09-10', projet: '' };
function opmsgLire() {
  let d = null; try { d = JSON.parse(fs.readFileSync(OPMSG_PATH, 'utf8')); } catch (e) {}
  const e = Object.assign({}, OPMSG_DEFAUT, d && typeof d === 'object' ? d : {});
  e.enTravaux = e.enTravaux !== false;   // comparaison stricte, même raison que /espaces/apps : seul un vrai « false » sort des travaux
  return e;
}
function opmsgOuvertes() {   // entreprises où OP MESSAGES est ouverte, une fois chacune
  const vus = new Set();
  for (const e of Object.values(espacesReg)) { if (e && e.opMessages === true) { const t = espaceT(e); if (t) vus.add(t); } }
  return vus.size;
}
app.get('/api/monitor/messages/etat', monAdmin, (req, res) => {
  const e = opmsgLire();
  res.json({ ok: true, enTravaux: e.enTravaux, depuis: e.depuis, projet: monStr(e.projet, 80), entreprisesOuvertes: opmsgOuvertes(), par: monStr(e.par, 60), ts: e.ts || 0 });
});
app.post('/api/monitor/messages/etat', monPatronStrict, (req, res) => {
  const b = req.body || {};
  const enTravaux = b.enTravaux !== false;
  const projet = monStr(b.projet, 80).trim();
  // sortir des travaux sans serveur, c'est prétendre qu'elle marche sans savoir où (un nom d'hôte : msg.teamop.fr)
  if (!enTravaux && !/^[a-z0-9][a-z0-9.-]{3,79}$/.test(projet)) return res.status(400).json({ error: 'nom du serveur requis (minuscules, chiffres, points, tirets) pour sortir des travaux' });
  const avant = opmsgLire();
  const etat = { enTravaux, depuis: avant.depuis, projet: projet || (enTravaux ? monStr(avant.projet, 80) : ''), par: req.tourUser.nom, ts: Date.now() };
  try { fs.writeFileSync(OPMSG_PATH + '.tmp', JSON.stringify(etat)); fs.renameSync(OPMSG_PATH + '.tmp', OPMSG_PATH); } catch (e) { return res.status(500).json({ error: 'Enregistrement impossible — rien n\'a changé.' }); }
  console.log('Tour :', req.tourUser.nom, enTravaux ? 'remet OP MESSAGES en travaux' : 'déclare OP MESSAGES en service sur ' + projet);
  res.json({ ok: true, enTravaux, projet: etat.projet, entreprisesOuvertes: opmsgOuvertes() });
});
/* ══ RENOMMER UN ESPACE — SANS TOUCHER À SON ADRESSE ════════════════════════════════════════
   ⛔ 14 septembre 2026, décision de Justin, mot pour mot : « le lien une fois créé ne peut
   plus être changé ». Jusqu'ici cette route DÉPLAÇAIT l'adresse : renommer « Elan » en
   « Elan Gestion » faisait de teamop.fr/e/elan un lien mort, et l'entreprise l'avait donné à
   ses équipes, mis en favori, écrit sur ses devis. Le bouton de la Tour le disait
   (« ⚠️ Le nom EST l'adresse »), mais un avertissement n'est pas une garantie : il suffit
   d'un clic distrait pour couper la porte d'entrée de toute une équipe, et le temps que
   quelqu'un appelle, personne ne travaille.
   Désormais l'adresse est POSÉE À LA CRÉATION ET NE BOUGE PLUS. Renommer ne change que ce qui
   s'affiche : le nom dans l'annuaire, et le champ « n » du code de l'espace — que l'écran de
   connexion montre, sinon il garderait l'ancien nom. Toutes les entrées qui pointent sur cet
   espace sont mises à jour : une seule oubliée et le serveur servirait deux noms différents
   selon le chemin d'accès.
   Les appareils déjà connectés n'ont jamais bougé de toute façon : eux ne se servent que de
   « t » et « k ». */
app.post('/api/monitor/espaces/renommer', monPatronStrict, (req, res) => {
  const slug = espSlug(monStr((req.body || {}).slug || (req.body || {}).nom, 80));
  /* espaceAJour, PAS espacesReg[slug] : un même espace porte plusieurs noms dans l'annuaire
     (voir espaceParT) et c'est l'entrée la plus récente qui fait foi. Lire l'entrée du slug
     tapé renommait une entrée pendant que le serveur en servait une autre — le renommage
     répondait « fait » et l'ancien nom continuait de marcher. Mesuré par le gardien. */
  const e = espaceAJour(slug);
  if (!e || !e.code) return res.status(404).json({ error: 'Espace inconnu' });
  const nom = monStr((req.body || {}).nouveau, 80).trim();
  if (!nom) return res.status(400).json({ error: 'Il faut un nom' });
  const t = espaceT(e);
  if (!t) return res.status(409).json({ error: 'Cet espace n\'a pas d\'identifiant d\'équipe lisible : impossible de le renommer sans risque.' });
  /* Plus de contrôle de collision d'adresse : il n'y a plus d'adresse à occuper. Deux
     entreprises peuvent porter le même nom d'affichage — ce sont leurs adresses, posées à la
     création, qui les distinguent, et elles ne bougent pas. */
  let code = e.code;
  try {
    const o = JSON.parse(Buffer.from(e.code, 'base64').toString('utf8'));
    /* Même garde qu'à /identifiants : sans « use strict », écrire sur un primitif échoue en
       silence et on réenregistrerait un code sans « t » ni « k » — données perdues. */
    if (o && typeof o === 'object' && !Array.isArray(o) && o.t && o.k) {
      o.n = nom;
      code = Buffer.from(JSON.stringify(o), 'utf8').toString('base64').replace(/=+$/, '');
    }
  } catch (err) {}
  /* ⛔ AUCUNE CLÉ N'EST CRÉÉE NI SUPPRIMÉE : ce sont elles, les adresses. On réécrit chaque
     entrée EN PLACE. Toutes celles qui pointent sur cet espace, pas seulement celle qu'on a
     ouverte — un même espace en porte plusieurs (voir espaceParT), et n'en mettre qu'une à
     jour ferait afficher deux noms différents selon le chemin. */
  const cles = Object.keys(espacesReg).filter(x => espaceT(espacesReg[x]) === t);
  if (!cles.length) return res.status(404).json({ error: 'Espace introuvable dans l\'annuaire' });
  const avant = {}; cles.forEach(x => { avant[x] = espacesReg[x]; });
  cles.forEach(x => {
    const copie = Object.assign({}, espacesReg[x], { nom, code });
    delete copie.slug;   // espaceAJour peut rendre une copie porteuse de « slug » : il n'a rien à faire dans l'annuaire
    espacesReg[x] = copie;
  });
  if (!espacesEcrire()) {
    // remise en place exacte : sinon le serveur servirait le nouveau nom jusqu'au redémarrage
    cles.forEach(x => { espacesReg[x] = avant[x]; });
    return res.status(500).json({ error: 'Enregistrement impossible — rien n\'a changé.' });
  }
  /* L'adresse qu'on rend est celle qu'on a ouverte, inchangée — c'est tout l'objet du
     changement, et l'écran doit pouvoir le montrer plutôt que l'affirmer. */
  const adresse = e.slug || slug;
  console.log('Tour :', req.tourUser.nom, 'renomme l\'espace', t, '(adresse inchangée, ' + cles.length + ' entrée(s) mise(s) à jour)');
  res.json({ ok: true, slug: adresse, nom, adresseInchangee: true, adresse: 'https://teamop.fr/e/' + adresse, lien: lienEspaceCode(espacesReg[cles[0]]) });
});
/* ══ SUSPENDRE OU ROUVRIR UN ACCÈS, DEPUIS LA TOUR ══════════════════════════════════════════
   Couper un accès sans rien effacer. C'est le pendant de « Couper » sur un accès bêta, et la
   différence compte : ici l'espace porte de vraies données. Suspendre les LAISSE en place —
   côté Firestore rien n'est touché — mais les appareils reliés se vident à leur prochain
   lancement (forfaitServeurSync lit « ferme » et efface le stockage local). Rouvrir rend
   l'espace ; les appareils devront repasser par le lien ou le code, leurs données les y
   attendent. Effacer pour de bon, c'est « Repartir à neuf » (/renaitre), pas cette route. */
/* ⛔ LA TOUR VOIT L'HORLOGE, ET C'EST LE SEUL ENDROIT OÙ ON NOMME QUI. Tant que la suppression
   n'existe pas, c'est un humain qui préviendra un client — encore faut-il qu'il puisse le voir
   venir. `monAdmin` et pas `monPatronStrict` : c'est une LECTURE, et la refuser à l'équipe qui
   répond au support reviendrait à la rendre inutile. */
app.get('/api/monitor/conservation', monAdmin, (req, res) => {
  if (!conservation) return res.status(503).json({ error: 'horloge non montée', motif: etatConservation.erreur || 'inactive' });
  const l = conservation.tout().sort((a, b) => a.depuis - b.depuis);
  res.json({ ok: true, jours: conservation.CONSERVATION_JOURS, preavisJours: conservation.PREAVIS_JOURS,
    /* Les comptes que `/health` ne publie plus (24 septembre 2026) : ils vivent ICI, derrière
       une identité. `balayageOk` avec, pour que la Tour dise aussi si l'horloge tourne. */
    compte: conservation.sante(),
    /* Le nom lisible se joint ici, pas dans le module : lui ne connaît que des identifiants,
       et c'est bien ainsi — il n'a aucune raison de savoir comment s'appelle une entreprise. */
    espaces: l.map(x => { const e = espaceParT(x.t); return Object.assign({}, x, { nom: (e && e.nom) || '', slug: (e && e.slug) || '' }); }) });
});

app.post('/api/monitor/espaces/suspendre', monPatronStrict, async (req, res) => {
  const slug = espSlug(monStr((req.body || {}).slug || (req.body || {}).nom, 80));
  const e = espaceAJour(slug);
  const t = e ? espaceT(e) : '';
  if (!e || !t) return res.status(404).json({ error: 'Espace inconnu, ou sans identifiant d\'équipe lisible' });
  const rouvrir = !!(req.body || {}).rouvrir;
  /* ⛔ ON NE SUSPEND PAS L'ESPACE PAR DÉFAUT — 14 septembre 2026, avant que ce soit fait.
     La SUPPRESSION l'interdit depuis toujours (REFUS_INTOUCHABLE, deux routes) ; la
     suspension, non — et elle coupe pourtant les mêmes appareils, par le même
     fbRevoquerEquipe. L'asymétrie ne tenait qu'à un accident : `elan-gestion` est hors
     annuaire, donc espaceAJour() rend null et la route répond 404 avant d'arriver ici. Le
     jour où un espace de ce nom entre à l'annuaire — une entreprise qui s'inscrit sous ce
     nom, une réparation d'annuaire — la garde disparaît sans prévenir, et suspendre « une
     entreprise » couperait TOUS les appareils qui n'ont rejoint aucun espace : c'est ce que
     REFUS_INTOUCHABLE décrit mot pour mot. Une garde ne se délègue pas à une coïncidence.
     ⚠️ La RÉOUVERTURE reste ouverte, exprès : si l'identifiant se retrouvait un jour dans
     entFermes (fichier réparé à la main, état hérité), l'interdire des deux côtés rendrait
     la panne définitive. On empêche d'entrer dans l'état, jamais d'en sortir. */
  if (!rouvrir && ESPACES_INTOUCHABLES.includes(t)) return res.status(403).json({ error: REFUS_INTOUCHABLE });
  /* DEUX états, pas un. « entFermes.espaces » sert aussi à la FERMETURE DÉFINITIVE d'une
     entreprise (/api/monitor/clients/retirer), qui exige un code de confirmation par e-mail.
     Sans liste à part, « Rouvrir » défaisait cette fermeture-là en un clic — et rendait à
     nouveau le lien porteur de « k ». On ne rouvre donc que ce qu'on a suspendu d'ici. */
  if (!Array.isArray(entFermes.suspendus)) entFermes.suspendus = [];
  if (rouvrir && !entFermes.suspendus.includes(t))
    return res.status(409).json({ error: 'Cet espace n\'a pas été suspendu depuis la Tour : il a été fermé définitivement (fermeture d\'entreprise). Ce bouton ne défait pas une fermeture — elle demande un code de confirmation par e-mail.' });
  /* ⛔⛔ ET ON NE SUSPEND PAS UNE ENTREPRISE FERMÉE. Depuis qu'une suspension laisse TRAVAILLER
     (24 septembre 2026), « suspendre » une entreprise déjà fermée la ROUVRIRAIT par le côté —
     sans le code par courriel que la fermeture a exigé. Avant, c'était sans effet : toutes les
     portes lisaient la liste en bloc. Le cas existe : une entreprise fermée qu'on réinscrit
     sous la même adresse retrouve une entrée d'annuaire et son ancien identifiant. */
  if (!rouvrir && entFermes.espaces.includes(t) && !entFermes.suspendus.includes(t))
    return res.status(409).json({ error: 'Cet espace a été fermé définitivement (fermeture d\'entreprise) : il ne se suspend pas. Le rouvrir demande un code de confirmation par e-mail.' });
  const avant = entFermes.espaces.slice(), avantS = entFermes.suspendus.slice(),
        avantD = Object.assign({}, entFermes.suspendusLe);
  if (rouvrir) {
    entFermes.espaces = entFermes.espaces.filter(x => x !== t);
    entFermes.suspendus = entFermes.suspendus.filter(x => x !== t);
    delete entFermes.suspendusLe[t];
  } else {
    if (!entFermes.espaces.includes(t)) entFermes.espaces.push(t);
    if (!entFermes.suspendus.includes(t)) entFermes.suspendus.push(t);
    /* ⚠️ ON NE REDÉMARRE PAS LE DÉLAI D'UNE SUSPENSION DÉJÀ EN COURS. Suspendre deux fois
       (un double clic, une reprise de la Tour, un réglage de facturation rejoué) rendrait sept
       jours de sursis à chaque fois — et un impayé ne grisrait jamais. Seule la RÉOUVERTURE
       efface la date, parce qu'elle efface la suspension. */
    if (!entFermes.suspendusLe[t]) entFermes.suspendusLe[t] = Date.now();
  }
  /* Si l'écriture échoue, on ne dit pas que c'est fait : le serveur appliquerait la coupure
     jusqu'au redémarrage, puis l'oublierait — et le patron croirait l'accès fermé. */
  if (!fermesSave()) { entFermes.espaces = avant; entFermes.suspendus = avantS; entFermes.suspendusLe = avantD; return res.status(500).json({ error: 'Rien n\'a été enregistré — réessaie.' }); }
  console.log('Tour :', req.tourUser.nom, (rouvrir ? 'rouvre' : 'suspend'), 'l\'espace', t);
  /* Refuser les NOUVEAUX jetons ne suffit pas : les appareils déjà pourvus tiennent une
     session renouvelable et ne repassent plus par le serveur. On coupe donc aussi côté
     Firebase — et on le DIT, parce qu'une suspension qu'on croit effective alors qu'elle ne
     l'est pas est pire que pas de suspension du tout. Rien à faire à la réouverture : les
     appareils redemanderont un jeton et l'obtiendront. */
  /* ⛔ ROUVRIR DOIT ROUVRIR LE SOCLE, ET C'EST LA MOITIÉ QU'ON AVAIT OUBLIÉE. Le commentaire
     d'origine disait « rien à faire à la réouverture : les appareils redemanderont un jeton et
     l'obtiendront » — c'est vrai de Firebase, dont la coupure est un état volatil, et FAUX du
     socle, dont l'état est ÉCRIT SUR DISQUE. La ligne de fermeture a été ajoutée sous ce
     commentaire sans le rejuger. Conséquence mesurée : une entreprise suspendue pour impayé
     qui régularise restait bloquée POUR TOUJOURS — 403 sur tous ses appareils — pendant que la
     Tour, l'annuaire et Firebase la disaient active. C'est « croire une entreprise ouverte
     alors qu'elle est fermée », l'exact symétrique de la panne que ce dépôt nomme, et il n'y
     avait aucun écran pour la rouvrir. */
  if (rouvrir) {
    const ouv = socleOuvrir(t);
    return res.json({ ok: true, suspendu: false, socle: ouv.fait, socleMotif: ouv.motif });
  }
  /* ⛔⛔ SUSPENDRE NE COUPE PLUS RIEN — DÉCISION DE JUSTIN, 20 SEPTEMBRE 2026.
     « Pour continuer à lire, ils auront un délai de 7 jours. Si c'est pas payé après dans les
     7 jours, tous les onglets deviennent gris. Aucune sauvegarde n'est perdue, aucune tâche
     qu'ils étaient en train de faire, rien n'est perdu, même dans leur catégorie. Juste les
     catégories payantes deviennent grisées et ils reviennent au forfait gratuit. »

     Une suspension est donc désormais un ÉTAT DE FACTURATION, pas une coupure d'accès :
     l'entreprise continue de lire, d'écrire et de synchroniser. Couper Firebase et fermer le
     socle faisait exactement l'inverse — et le jour où le socle est la seule copie à jour,
     ça aurait coupé un impayé de ses propres données, en contradiction directe avec
     `mentions-legales.html:74` (« un impayé n'entraîne aucune suppression », « le client
     retrouve l'intégralité de ses données »).

     ⛔⛔ CE QU'IL FAUT SAVOIR AVANT DE PUBLIER CECI, ET QUI N'EST PAS UN DÉTAIL : la contrainte
     qui remplace la coupure — les onglets payants qui grisent au bout de sept jours et le
     retour au forfait gratuit — N'EXISTE PAS ENCORE. Tant qu'elle n'est pas écrite côté
     application, ce bouton MARQUE une entreprise sans rien lui interdire. C'est un trou
     d'application temporaire, assumé, et il est nommé dans REPRISE.md. Ne pas le découvrir en
     production.

     ⚠️ Et la réponse DIT la vérité : `coupure:false`. Une Tour qui afficherait une coupure qui
     n'a pas eu lieu, c'est « croire une entreprise coupée alors qu'elle ne l'est pas » — la
     panne silencieuse type de ce dépôt, celle que `fbRevoquerEquipe` documente déjà. */
  res.json({ ok: true, suspendu: true, coupure: false,
    /* La Tour a besoin du départ du délai pour l'afficher — et l'afficher est la seule façon
       de ne pas découvrir un sursis écoulé par un appel de client. */
    depuis: entFermes.suspendusLe[t] || null,
    sursisJours: 7,
    coupureMotif: 'suspension sans coupure : l\'entreprise garde l\'accès à ses données. '
      + 'Ce qui change est son abonnement — les fonctions payantes grisent au bout de sept jours.' });
});
app.post('/api/espaces/relance', (req, res) => {
  // borné AVANT espSlug : son normalize('NFD') sur 6 Mo gèle la boucle d'événements, donc toute l'API
  const slug = espSlug(monStr((req.body || {}).nom, 80));
  if (!slug) return res.status(400).json({ error: 'Indique le nom de ton entreprise' });
  const ip = req.ip || '?';   // req.ip, jamais l'en-tête brut : nginx AJOUTE à la valeur reçue, donc .split(',')[0] rend celle de l'appelant
  if (!quotaOk(relanceQuota, 'ip:' + String(ip).split(',')[0].trim(), 10, 3600000))
    return res.status(429).json({ error: 'Trop de demandes — réessaie dans une heure' });
  /* La réponse part AVANT l'envoi : ni le texte ni le délai ne doivent laisser deviner
     si l'entreprise est cliente de TEAM OP. */
  res.json({ ok: true, envoye: true });
  const e = espaceAJour(slug);
  if (!e || !e.email || !e.code || e.clePerimee || !mailer) return;
  if (!quotaOk(relanceQuota, 'esp:' + slug, 5, 3600000)) return;
  /* ⛔ PLUS DE LIEN ICI NON PLUS (12 septembre 2026). C'est le secours « j'ai perdu mon lien » :
     y répondre par un lien, c'était renvoyer la clé de déchiffrement de l'entreprise dans une URL,
     à chaque demande, à quiconque tape le nom sur teamop.fr — la route est publique. On renvoie
     désormais l'ADRESSE, qui n'est pas un secret, et rien d'autre : le code d'accès, lui, ne
     s'obtient que par le patron. Une demande anonyme ne doit rien faire sortir de secret. */
  const nom = espNomPropre(e) || e.nom || '';
  const adresse = 'teamop.fr/e/' + (e.slug || slug);
  const entTxt = nom ? ' « ' + nom + ' »' : '';
  const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  mailerEnvoi({
    confidentiel: true, trace: 'relance de l\'adresse de connexion · espace ' + slug,
    from: config.smtp.from || config.smtp.user, to: e.email,
    subject: '🏢 L\'adresse de votre entreprise — TEAM OP',
    text: 'Bonjour,\n\nQuelqu\'un vient de demander l\'adresse de connexion de votre entreprise'
      + entTxt + ' sur teamop.fr.\n\nVotre adresse :\n' + adresse + '\n\n'
      + 'Chacun y va, tape SON identifiant et SON mot de passe, et arrive dans votre espace — sur n\'importe quel téléphone. Mettez-la en favori, il n\'y a rien d\'autre à conserver.\n\n'
      + 'Si personne n\'arrive encore à se connecter, c\'est que votre espace n\'a pas encore été ouvert une première fois : écrivez-nous, nous vous renvoyons vos identifiants.\n\n'
      + 'Si vous n\'êtes à l\'origine d\'aucune demande, ignorez ce message — rien n\'a changé.\n\n— TEAM OP · teamop.fr',
    html: mailTeamOP({
      chip: 'Lien de connexion',
      titre: 'Votre lien de connexion 🔗',
      corpsHtml: 'Bonjour,<br>quelqu\'un vient de demander l\'adresse de connexion de votre entreprise'
        + x(entTxt) + ' sur teamop.fr.<br><br><b>Votre adresse :</b><br>'
        + '<a href="https://' + x(adresse) + '" style="color:#34A97E;font-size:19px;font-weight:700;word-break:break-all">' + x(adresse) + '</a><br><br>'
        + '<span style="font-size:13px">Chacun y va, tape <b>son</b> identifiant et <b>son</b> mot de passe, et arrive dans votre espace — sur n\'importe quel téléphone. Mettez-la en favori, il n\'y a rien d\'autre à conserver.<br>'
        + 'Si personne n\'arrive encore à se connecter, c\'est que votre espace n\'a pas encore été ouvert une première fois : écrivez-nous, nous vous renvoyons vos identifiants.</span><br><br>'
        + '<span style="color:#8fa3c8;font-size:13px">Si vous n\'êtes à l\'origine d\'aucune demande, ignorez ce message — rien n\'a changé.</span>',
      boutonTxt: 'Ouvrir mon espace', boutonUrl: 'https://' + adresse,
      bouton2Txt: 'Mon espace client', bouton2Url: 'https://teamop.fr/espace.html'
    })
  }).catch((err) => console.error('relance lien', slug, ':', String(err && err.message || err).slice(0, 120)));
});
/* Disponibilité d'un nom de lien, pour le formulaire d'inscription : un oui/non, rien d'autre. */
app.post('/api/espaces/libre', (req, res) => {
  const slug = espSlug(monStr((req.body || {}).nom, 80));   // borné : voir /api/espaces/ouvrir
  if (!slug) return res.status(400).json({ error: 'Indique un nom' });
  /* OUI, c'est un oracle : cette route dit publiquement si une entreprise est déjà cliente de
     TEAM OP. C'est assumé — le formulaire d'inscription en a besoin pour refuser un nom déjà
     pris avant que la personne ait tout saisi. Mais il faut le savoir : le message uniforme de
     /api/espaces/ouvrir ne cache donc PAS la clientèle, il cache seulement le code. Le jour où
     l'on voudra vraiment la cacher, c'est ici qu'il faudra un jeton de formulaire, pas là-bas. */
  res.json({ ok: true, libre: !espacesReg[slug] });
});
/* « Ce nom est-il celui de l'équipe t ? » — pour un appareil déjà dans l'espace t, qui
   fait confirmer à son porteur qu'il tape bien le nom de SON entreprise. Le booléen ne
   révèle rien : il faut déjà connaître t, et t seul ne mène à aucun nom. */
app.post('/api/espaces/verifie-nom', (req, res) => {
  const t = monStr((req.body || {}).t, 80), slug = espSlug(monStr((req.body || {}).nom, 80));
  if (!t || !slug) return res.status(400).json({ error: 't et nom requis' });
  const tEsp = espaceT(espaceAJour(slug));
  res.json({ ok: true, correspond: !!tEsp && tEsp === t });
});
/* Le lien de connexion d'un espace (teamop.fr/app.html#entreprise=CODE), pour l'application de l'entreprise :
   t = identifiant d'équipe, kh = empreinte SHA-256 de la clé d'équipe (jamais la clé elle-même).
   Le nom et le lien ne sont rendus QUE si l'empreinte est celle de la clé de l'annuaire : sans
   preuve de clé, rien n'est révélé (un identifiant d'équipe seul ne doit mener à aucun nom). */
const lienQuota = new Map();
app.post('/api/espaces/lien', (req, res) => {
  const t = monStr((req.body || {}).t, 80), kh = monStr((req.body || {}).kh, 64).toLowerCase();
  if (!t || !/^[0-9a-f]{64}$/.test(kh)) return res.status(400).json({ error: 't et kh requis' });
  const q = lienQuota.get(t) || { n: 0, reset: Date.now() + 3600000 };
  if (Date.now() > q.reset) { q.n = 0; q.reset = Date.now() + 3600000; }
  if (++q.n > 30) return res.status(429).json({ error: 'trop de demandes — réessaie plus tard' });
  lienQuota.set(t, q);
  const e = espaceParT(t);
  const refus = () => res.status(404).json({ error: 'lien lisible pas encore activé pour cet espace' });
  if (!e || !e.slug || !e.code) return refus();
  let cleAnn = '', identAdmin = '';
  try { const o = JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')); cleAnn = String(o.k || ''); identAdmin = String(o.a || ''); } catch (err) {}
  if (!cleAnn) return refus();
  if (crypto.createHash('sha256').update(cleAnn).digest('hex') !== kh) {
    // l'appareil a une autre clé que l'annuaire : le code de l'annuaire est périmé → le site cesse de le servir
    if (!espacesReg[e.slug].clePerimee) { espacesReg[e.slug].clePerimee = Date.now(); espacesEcrire(); lastRefus = { ts: Date.now(), raison: 'clé d\'équipe changée pour un espace inscrit — à réinscrire dans la Tour (le journal dit lequel)' }; console.warn('espace', e.slug, ': clé d\'équipe changée — lien de l\'annuaire périmé'); }
    return res.status(404).json({ error: 'la clé d\'équipe a changé depuis l\'inscription chez TEAM OP — l\'espace est à réinscrire dans la Tour', motif: 'cle_changee' });
  }
  if (espacesReg[e.slug].clePerimee) { delete espacesReg[e.slug].clePerimee; espacesEcrire(); }
  // identAdmin : l'identifiant déclaré administrateur à la création de l'espace. Il n'est rendu
  // qu'ici, c'est-à-dire contre une preuve de possession de la clé d'équipe — jamais par une
  // route ouverte. L'application s'en sert pour qu'un patron ne puisse pas être déclassé.
  /* Le lien rendu porte le code, pas le nom : celui qui le reçoit a prouvé qu'il détient
     la clé d'équipe, mais le lien qu'il ira coller ne doit se deviner par personne. */
  res.json({ ok: true, slug: e.slug, nom: espNomPropre(e), lien: lienEspaceCode(e), cleOk: true, nomExact: espSlug(e.nom) === e.slug, identAdmin });
});

// ── Fermeture totale d'une entreprise (patron) : code de confirmation par e-mail,
//    puis retrait de la liste, du nom, du lien, de la formule — et les applications
//    des appareils reliés se vident toutes seules à leur prochain lancement. ──
const FERMES_PATH = path.join(DATA_DIR, 'entreprises-fermees.json');
/* ⛔ `suspendusLe` : LA DATE SANS LAQUELLE LES SEPT JOURS NE PEUVENT PAS SE COMPTER.
   Justin, 20 septembre 2026 : « pour continuer à lire, ils auront un délai de 7 jours. Si
   c'est pas payé après, tous les onglets deviennent gris. » La suspension était enregistrée
   comme une simple LISTE d'identifiants : aucun moment de départ, donc le délai n'était pas
   calculable — par personne, jamais.
   ⚠️ Et ce n'est pas un détail qu'on rattrape plus tard : le jour où l'écran sera écrit, une
   date ajoutée APRÈS coup donnerait à toute entreprise déjà suspendue soit un délai NEUF de
   sept jours (un impayé de trois mois repart à zéro), soit un délai DÉJÀ ÉCOULÉ (des onglets
   qui grisent sans prévenir). Les deux sont faux, et les deux se découvrent chez un client.
   On date donc MAINTENANT, avant que l'écran existe.
   ⛔ CE FICHIER NE DÉCIDE DE RIEN D'AUTRE. Quels onglets grisent, ce qu'est exactement le
   forfait gratuit, à quoi ressemble le rappel quotidien réservé au compte admin : ce sont des
   décisions de produit, elles appartiennent à Justin. Voir REPRISE.md. */
let entFermes = { emails: [], espaces: [], suspendus: [], suspendusLe: {} };
/* ⛔⛔ UNE LISTE DE FERMETURES ILLISIBLE ROUVRE TOUT LE MONDE — même règle que `espacesIllisible`
   (24 septembre 2026, relevé par `gardien`). La lecture se taisait : toutes les entreprises
   FERMÉES retrouvaient leur jeton, leurs copies, leur connexion ; et la première suspension ou
   fermeture réécrivait le fichier abîmé avec la seule nouvelle entrée — les fermetures d'avant
   perdues pour toujours. On le dit, et `fermesSave` refuse d'écrire par-dessus. */
let fermesIllisible = false;
try { entFermes = JSON.parse(fs.readFileSync(FERMES_PATH, 'utf8')); }
catch (e) { if (e && e.code !== 'ENOENT') { fermesIllisible = true; console.error('⛔ entreprises-fermees.json ILLISIBLE — les fermetures ne s\'appliquent plus, et le fichier ne sera pas réécrit tant qu\'il n\'est pas réparé :', e.message); } }
/* ⚠️ UN FICHIER ÉCRIT AVANT CE JOUR N'A PAS `suspendusLe`. On le complète à la lecture, et
   on DATE les suspensions déjà en cours au moment où on les découvre — c'est le moins faux
   des choix possibles : on ne sait pas quand elles ont commencé, et leur donner zéro ferait
   griser des onglets à la seconde où l'écran sera publié. Une seule fois, puis c'est écrit. */
if (!entFermes.suspendusLe || typeof entFermes.suspendusLe !== 'object') entFermes.suspendusLe = {};
{
  let aDater = 0;
  for (const t of (entFermes.suspendus || [])) if (!entFermes.suspendusLe[t]) { entFermes.suspendusLe[t] = Date.now(); aDater++; }
  if (aDater) { console.log('suspensions sans date reprises :', aDater, '(datées d’aujourd’hui, faute de mieux)'); try { fermesSave(); } catch (e) {} }
}
/* Les fichiers d'avant la suspension depuis la Tour n'ont pas ce champ. Vide et non
   « tout » : ce qui s'y trouvait déjà vient d'une fermeture d'entreprise, et ne doit
   surtout pas devenir réouvrable d'un clic. */
if (!Array.isArray(entFermes.emails)) entFermes.emails = [];
if (!Array.isArray(entFermes.espaces)) entFermes.espaces = [];
if (!Array.isArray(entFermes.suspendus)) entFermes.suspendus = [];
/* ⛔ TEMPORAIRE PUIS RENOMMAGE, comme `espacesEcrire` : écrit en place, un disque plein ou un arrêt au
   mauvais moment laissait un fichier TRONQUÉ — lu ensuite comme illisible, c'est-à-dire toutes les
   fermetures oubliées. Et jamais par-dessus un fichier qu'on n'a pas pu lire (`fermesIllisible`). */
function fermesSave() {
  if (fermesIllisible) { console.error('⛔ entreprises-fermees.json NON réécrit : il était illisible au démarrage — le réparer, puis redémarrer'); return false; }
  try { const tmp = FERMES_PATH + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(entFermes)); fs.renameSync(tmp, FERMES_PATH); return true; }
  catch (e) { console.error('entreprises-fermees.json non écrit :', e.message); return false; } }

/* ⛔⛔ OÙ EN EST LE SURSIS DE SEPT JOURS — UNE SEULE DÉFINITION, DEUX APPELANTS.
   Elle vivait en arrow dans le montage du socle, donc invisible au reste du fichier ; et
   `/api/espaces/etat`, la seule route que l'APPLICATION interroge, ne pouvait pas la voir.
   Deux copies auraient un jour compté deux délais différents — la règle `fbUidEquipe` de
   `CLAUDE.md`. Elle est donc ici, à côté d'`entFermes`, et le socle l'appelle.
   Trois valeurs, jamais deux : `null` = sans objet (l'entreprise n'est pas suspendue),
   un nombre > 0 = il reste des jours, `0` = le sursis est fini. Rendre `0` pour « sans
   objet » griserait les onglets de tout le monde.
   ⛔ PLAFONNÉ À SEPT AUTANT QUE PLANCHÉ À ZÉRO : une date dans le FUTUR — l'horloge du VPS
   qui recule, un fichier repris à la main — rendait 7 + l'écart. Mesuré : une date à
   +30 jours donnait 37 jours de sursis, en silence, à une entreprise qui ne paye pas. */
function sursisJoursDe(t) {
  try {
    const k = String(t || '');
    if (!(entFermes.suspendus || []).includes(k)) return null;
    const depuis = (entFermes.suspendusLe || {})[k];
    if (!depuis) return null;
    return Math.max(0, Math.min(7, 7 - Math.floor((Date.now() - depuis) / 86400000)));
  } catch (e) { return null; }
}
/* `true` suspendu (abonnement en défaut, mais l'entreprise TRAVAILLE), `false` sinon.
   ⛔ ET UNE ENTREPRISE SORTIE DE L'ANNUAIRE N'EST PLUS « SUSPENDUE », MÊME SI LA LISTE LE DIT
   ENCORE. Les deux fermetures définitives (fermer un client, supprimer une entreprise) ajoutent
   l'identifiant à `entFermes.espaces` et retirent l'entreprise de l'annuaire — mais jusqu'au
   24 septembre 2026 elles ne le retiraient PAS de `suspendus`. Une entreprise suspendue PUIS
   fermée restait donc « suspendue » : `/api/espaces/etat` lui rendait son état normal au lieu
   de `ferme` (ses appareils ne se vidaient jamais), le socle la laissait ouvrir sa session, et
   la Tour affichait « Rouvrir » sur une fermeture qui avait exigé un code par courriel.
   Les fermetures la retirent désormais de la liste ; pour un fichier écrit AVANT, on exige que
   l'entreprise soit encore à l'annuaire. ⚠️ Calculé à chaque appel, JAMAIS écrit : réparer le
   fichier au démarrage ferait condamner pour de bon toutes les suspendues le jour où
   `espaces.json` est tronqué (il les sort toutes de l'annuaire d'un coup) — et le restaurer ne
   les rendrait pas. */
function espaceEstSuspendu(t) { try { const k = String(t || '');
  /* ⚠️ `espacesIllisible` : un annuaire qu'on n'a pas pu lire ne dit pas qui en est SORTI — on garde
     alors la liste telle quelle plutôt que de condamner toutes les suspendues. */
  return (entFermes.suspendus || []).includes(k) && (espacesIllisible || !!espaceParT(k)); } catch (e) { return false; } }
/* ⛔⛔ FERMÉE N'EST PAS SUSPENDUE — UNE SEULE QUESTION, UNE SEULE FONCTION (24 septembre 2026).
   `entFermes.espaces` porte les DEUX états : la fermeture définitive et la simple suspension
   pour impayé. Justin, 20 septembre 2026 : une suspension est un ÉTAT DE FACTURATION — « rien
   n'est perdu », sept jours d'accès complet puis le forfait gratuit, « c'est pas aux
   utilisateurs de savoir si l'entreprise paye ou pas ». La route de suspension ne coupait
   plus Firebase depuis ce jour-là ; mais ONZE portes lisaient encore la liste en bloc, et
   refusaient donc un impayé comme une entreprise partie : son jeton Firebase (plus de synchro
   sur un appareil neuf), ses photos (les pièces jointes passent par `sauvRefus`), ses copies
   de sauvegarde, sa connexion par nom et code comme par identifiant, le dépôt de son annuaire,
   ses ordres, ses abonnements aux notifications, son courrier REÇU (jeté à la relève), ses
   rapports d'erreur et ses connexions (invisibles à la Tour). Relevé par `gardien` avant tout
   déploiement. Le socle et `/api/espaces/etat` faisaient déjà la différence, chacun à sa façon.
   ⛔ Toute porte qui refuse un espace fermé lit CETTE fonction, jamais `entFermes.espaces`
   directement — `tests/test-641.js` compte les lectures directes. */
function espaceFerme(t) { const k = String(t || ''); return entFermes.espaces.includes(k) && !espaceEstSuspendu(k); }
/* ══ LA VERSION MINIMALE ET LE MODE EN LIGNE — réglés depuis la Tour, 9 septembre 2026 ══
   Ce qui a détruit les comptes d'ELAN : un appareil en vieille version qui réécrit toute la base
   toutes les deux minutes. On ne met pas à jour un appareil qu'on ne tient pas ; on lui ferme la
   porte. `min` est le numéro de version en dessous duquel le nuage refuse d'écrire — la règle
   Firestore le lit dans teamop_config/version, que ce serveur écrit avec sa clé d'administration.
   L'application le lit aussi ici (/api/version) pour se bloquer avant même de tenter.
   `enLigne` ne vaut plus que « enLigne » : l'application ne travaille qu'en ligne, sans option
   (Justin, 9 septembre 2026 : « on oublie le hors ligne complètement »). Le champ reste rendu
   pour les v616 qui le lisent encore. */
const VERSIONS_PATH = path.join(DATA_DIR, 'versions.json');
let versionsCfg = { min: 0, enLigne: 'enLigne', maj: 0, par: '' };
try { Object.assign(versionsCfg, JSON.parse(fs.readFileSync(VERSIONS_PATH, 'utf8')) || {}); } catch (e) {}
versionsCfg.min = Math.max(0, parseInt(versionsCfg.min, 10) || 0);
versionsCfg.enLigne = 'enLigne';   // plus d'autre valeur possible
function versionsSave() { try { const tmp = VERSIONS_PATH + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(versionsCfg)); fs.renameSync(tmp, VERSIONS_PATH); return true; } catch (e) { console.error('versions.json non écrit :', e.message); return false; } }
/* Le document que la règle de sécurité lit. Écrit par la clé admin (qui passe outre les règles) ;
   sans clé, le réglage vit quand même côté serveur — l'application s'y conforme d'elle-même,
   seule la porte du nuage reste ouverte aux versions d'avant. */
async function versionsPousserFirestore() {
  const tok = await fbAdminJeton();
  if (!tok) return { fait: false, motif: 'clé admin absente sur le serveur' };
  try {
    const r = await fbAdminFetch(fsBase() + '/teamop_config/version?updateMask.fieldPaths=min&updateMask.fieldPaths=maj',
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { min: { integerValue: String(versionsCfg.min) }, maj: { integerValue: String(versionsCfg.maj || 0) } } }) }, tok);
    if (!r.ok) { const t = await r.text().catch(() => ''); console.error('teamop_config/version : Firestore répond', r.status, t.slice(0, 120)); return { fait: false, motif: 'Firestore répond ' + r.status }; }
    return { fait: true };
  } catch (e) { console.error('teamop_config/version :', e.message); return { fait: false, motif: e.message }; }
}
/* La version réellement en ligne : on va la lire sur teamop.fr. C'est ce que la Tour affiche et ce
   que « Exiger la dernière version » exige.
   Le cache était d'un quart d'heure : après une publication, la Tour annonçait encore l'ancienne
   version pendant quinze minutes — et surtout « Exiger la dernière version » exigeait ce chiffre
   périmé, sans le dire. Signalé par Justin le 10 septembre 2026, la Tour montrant v625 alors que
   teamop.fr servait v626. Une minute suffit : cette route n'est appelée que par la Tour, c'est-à-dire
   par le patron, quelques fois par jour — et « Exiger » relit toujours, sans cache (frais). */
const versionQuota = new Map();   // « Exiger » tire une page de 3 Mo : le patron clique ça quelques fois par jour, pas dix fois par seconde
const versionLigne = { v: 0, ts: 0, encours: null };
function versionEnLigne(frais) {
  if (!frais && versionLigne.v && Date.now() - versionLigne.ts < 60000) return Promise.resolve(versionLigne.v);
  if (versionLigne.encours) return versionLigne.encours;   // une lecture est déjà en cours : elle est fraîche par construction
  versionLigne.encours = (async () => {
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch('https://teamop.fr/app.html', { signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
      /* app.html pèse près de 3 Mo et APP_VERSION vit dans son premier demi-mégaoctet : on lit au fil
         de l'eau et on coupe dès qu'on l'a trouvée, ou au plafond. Sans ça, chaque clic sur « Exiger »
         tirait 3 Mo, et un corps qui s'arrête en route (pair mort, sans fermeture) figeait la promesse
         POUR TOUJOURS — versionLigne.encours ne se vidant jamais, tout appel suivant s'y accrochait et
         la fonction version restait morte jusqu'au redémarrage. Le délai couvre donc TOUTE la lecture,
         corps compris, et il n'est levé qu'à la toute fin. */
      if (r.ok && r.body) {
        const dec = new TextDecoder(); let buf = '', lu = 0;
        for await (const morceau of r.body) {
          buf += dec.decode(morceau, { stream: true }); lu += morceau.length;
          const m = /const APP_VERSION = '([0-9]+)'/.exec(buf);
          if (m) { versionLigne.v = parseInt(m[1], 10) || 0; versionLigne.ts = Date.now(); break; }
          if (lu > 1200000) break;                      // au-delà, ce n'est plus la page qu'on croit
          if (buf.length > 200000) buf = buf.slice(-100); // la fenêtre glissante suffit : le motif fait 30 signes
        }
        try { ctrl.abort(); } catch (e) {}              // trouvée ou non : on ne tire pas le reste
      }
    } catch (e) { console.error('version en ligne illisible :', e.message); }
    clearTimeout(tm);
    versionLigne.encours = null;
    return versionLigne.v;
  })();
  return versionLigne.encours;
}
/* Public et sans espace : un numéro et un mode, rien d'autre. L'application l'appelle au
   démarrage, à chaque retour au premier plan, et tous les quarts d'heure. */
app.get('/api/version', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, min: versionsCfg.min, enLigne: versionsCfg.enLigne });
});
app.get('/api/monitor/version', monAdmin, async (req, res) => {
  const enLigne = await versionEnLigne();
  /* Qui est encore en dessous : par espace, les appareils DISTINCTS vus sur 7 jours avec une
     version inférieure au minimum — c'est la liste de ceux que la porte bloque. */
  const j7 = Date.now() - 7 * 86400000; const sous = [];
  for (const t of Object.keys(cnxData)) {
    const devs = new Map();
    for (const x of (cnxData[t] || [])) { if ((x.ts || 0) < j7 || !x.dev) continue; const v = parseInt(String(x.version || '').replace(/[^0-9]/g, ''), 10) || 0; if (!devs.has(x.dev) || (x.ts || 0) > devs.get(x.dev).ts) devs.set(x.dev, { v, ts: x.ts || 0 }); }
    let n = 0; for (const d of devs.values()) if (versionsCfg.min && d.v < versionsCfg.min) n++;
    if (n) { const e = espaceParT(t); sous.push({ t, nom: e ? espNomPropre(e) : '', n }); }
  }
  /* `minFirestore` : la version minimale que Google a CONFIRMÉE. La copie des documents d'équipe
     l'attend (`VERSION_SANS_FIREBASE`) : la Tour doit pouvoir le lire avant de croire la porte fermée. */
  res.json({ ok: true, min: versionsCfg.min, enLigne: versionsCfg.enLigne, maj: versionsCfg.maj || 0, par: versionsCfg.par || '', versionEnLigne: enLigne, sous, cleAdmin: !!fbAdminCle,
    minFirestore: +versionsCfg.minFirestore || 0 });
});
app.post('/api/monitor/version-min', monPatronStrict, async (req, res) => {
  const b = req.body || {};
  let min = parseInt(b.min, 10);
  /* « Exiger la dernière version » : celle qui est SERVIE à l'instant, jamais un reste de cache.
     La garde regarde si la lecture a VRAIMENT abouti — pas si la valeur est récente. Une lecture
     ratée juste après une lecture réussie laisserait passer l'ancien numéro : c'est exactement le
     cas de production (v625 en mémoire, v626 publiée, teamop.fr qui hoquette), et la Tour rafraîchit
     toutes les deux minutes, donc la fenêtre serait presque toujours ouverte. Échouer fermé.
     Exiger un numéro périmé bloque les appareils déjà à jour et laisse passer ceux qu'on voulait
     pousser — une erreur muette et coûteuse. */
  if (b.min === 'ligne') {
    if (!quotaOk(versionQuota, 'exiger', 30, 3600000)) return res.status(429).json({ error: 'Trop de demandes — réessaie dans quelques minutes.' });
    const tsAvant = versionLigne.ts;
    min = await versionEnLigne(true);
    if (!min || versionLigne.ts === tsAvant) {
      monLog((req.tourUser && req.tourUser.nom) || 'patron', false, req, 'exiger la dernière version : teamop.fr illisible');
      return res.status(503).json({ error: 'La version en ligne n\'a pas pu être lue sur teamop.fr — réessaie dans un instant.' });
    }
  }
  if (!isFinite(min) || min < 0 || min > 99999) return res.status(400).json({ error: 'min : un entier entre 0 et 99999, ou « ligne »' });
  const enLigne = 'enLigne';   // le hors ligne n'est plus une option : le paramètre est ignoré
  versionsCfg.min = min; versionsCfg.enLigne = enLigne; versionsCfg.maj = Date.now(); versionsCfg.par = (req.tourUser && req.tourUser.nom) || '';
  if (!versionsSave()) return res.status(500).json({ error: 'réglage non enregistré' });
  const fsr = await versionsPousserFirestore();
  /* ⛔ LE MINIMUM CONFIRMÉ CHEZ GOOGLE, gardé à part : tant qu'il n'atteint pas la première
     version sans Firebase, une v695 peut encore écrire chez Firestore, et `documents.js` ne
     recopie pas (`VERSION_SANS_FIREBASE`, `gardien` C4). Un envoi raté ne le bouge pas. */
  if (fsr.fait) { versionsCfg.minFirestore = min; versionsSave(); }
  monLog((req.tourUser && req.tourUser.nom) || 'patron', true, req, 'version minimale v' + min + ' · ' + enLigne + (fsr.fait ? '' : ' · Firestore KO'));
  console.log('version minimale exigée :', min, '· mode', enLigne, '· Firestore', fsr.fait ? 'à jour' : ('NON (' + fsr.motif + ')'));
  res.json({ ok: true, min, enLigne, firestore: fsr });
});
const retraitCodes = new Map();   // email -> { code, exp, tries }
// retirer une entreprise de la liste (patron uniquement — pour les entrées de test ; tracé)
/* ── Clé d'administration Firebase (facultative) : /opt/teamop/firebase-admin.json ──
   Clé de compte de service (console Firebase → ⚙️ Paramètres du projet → Comptes de
   service → « Générer une nouvelle clé privée »). Quand elle est posée sur le serveur,
   la fermeture d'une entreprise supprime AUSSI son compte du site (espace client),
   sa fiche et sa messagerie — plus rien n'est enregistré nulle part. */
const FB_ADMIN_PATH = process.env.TEAMOP_FB_ADMIN || '/opt/teamop/firebase-admin.json';
/* ⛔ LES ADRESSES DE BANC NE VISENT QUE 127.0.0.1 (`gardien`, 25 septembre 2026, N3). Posée par
   erreur sur le VPS, `TEAMOP_FB_OAUTH_URL` enverrait une assertion SIGNÉE par la clé
   d'administration (échangeable une heure contre un jeton qui passe au-dessus des règles), et
   `TEAMOP_FIRESTORE_URL` le jeton lui-même. Hors 127.0.0.1, la variable est ignorée. */
const urlBanc = (v, defaut) => (typeof v === 'string' && /^http:\/\/127\.0\.0\.1:\d{2,5}(\/|$)/.test(v)) ? v : defaut;
const FB_OAUTH_URL = urlBanc(process.env.TEAMOP_FB_OAUTH_URL, 'https://oauth2.googleapis.com/token');
const FIRESTORE_URL = urlBanc(process.env.TEAMOP_FIRESTORE_URL, 'https://firestore.googleapis.com/v1');
/* ⛔ ET L'IDENTITY TOOLKIT DE MÊME (`gardien`, N4). Ses adresses étaient écrites en dur à onze
   endroits : aucun banc ne pouvait jouer la suppression d'un compte du site, sa fiche ou la liste
   des comptes sans parler au VRAI Google — ce que ce dépôt interdit. Même porte que les deux
   au-dessus : seul `http://127.0.0.1:<port>` est accepté, et rien ne se règle sur le VPS. */
const IDTK_URL = urlBanc(process.env.TEAMOP_IDTK_URL, 'https://identitytoolkit.googleapis.com/v1');
let fbAdminCle = null;
try { fbAdminCle = JSON.parse(fs.readFileSync(FB_ADMIN_PATH, 'utf8')); } catch (e) {}
const fbAdminTok = { jeton: '', exp: 0 };
async function fbAdminJeton() {
  if (!fbAdminCle || !fbAdminCle.client_email || !fbAdminCle.private_key) return '';
  if (fbAdminTok.jeton && Date.now() < fbAdminTok.exp) return fbAdminTok.jeton;
  try {
    const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const jwtSans = b64u({ alg: 'RS256', typ: 'JWT' }) + '.' + b64u({
      iss: fbAdminCle.client_email, aud: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit',
      iat: now, exp: now + 3600 });
    const sig = crypto.createSign('RSA-SHA256').update(jwtSans).sign(fbAdminCle.private_key).toString('base64url');
    /* ⛔ UN DÉLAI, parce que cette fonction est désormais sur le chemin des TROIS fermetures.
       `fbAdminFetch` a le sien (10 s) ; celui-ci était un `fetch` nu, et undici n'a pas de
       délai total par défaut. Sur cache froid — donc typiquement la première fermeture de la
       journée — une fermeture pouvait rester bloquée plusieurs minutes, nginx rendre 504 à
       60 s, et l'opérateur relancer une route DESTRUCTIVE en plein vol. */
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 10000);
    let r, j = {};
    try {
      r = await fetch(FB_OAUTH_URL, { method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwtSans + '.' + sig,
        signal: ctrl.signal });
      /* ⛔ LE CORPS AUSSI, SOUS LE MÊME DÉLAI (`gardien`, C1) : levé dès les en-têtes, un serveur
         qui se tait ensuite laissait `r.json()` pendre pour toujours — et avec lui la copie d'un
         document d'équipe, qui tient le verrou de son entreprise. */
      j = await r.json().catch(() => ({}));
    } finally { clearTimeout(tm); }
    if (!j.access_token) { console.error('clé admin firebase : jeton refusé', j.error || r.status); return ''; }
    fbAdminTok.jeton = j.access_token; fbAdminTok.exp = Date.now() + 50 * 60000;
    return j.access_token;
  } catch (e) { console.error('clé admin firebase :', e.message); return ''; }
}
/* ══ LE JETON D'ÉQUIPE — l'identité que Firestore n'a pas encore ═══════════════════════════
   Aujourd'hui l'application se connecte à Firebase en ANONYME (`signInAnonymously`) : Google
   sait qu'un appareil est connecté, jamais À QUELLE ENTREPRISE il appartient. C'est pour ça
   que la règle Firestore ne sait dire que « toute personne connectée » — et donc que
   n'importe quel compte anonyme lit et écrit le document de n'importe quelle entreprise.
   Reproduit le 10 septembre 2026 : avec les seules constantes du fichier public, le contenu
   d'une entreprise restée sur la clé par défaut se déchiffre intégralement.

   Cette route rend un JETON SIGNÉ qui porte l'entreprise dans `claims.t`. Une fois que tous
   les appareils s'en servent, la règle peut enfin dire quelque chose de vrai :

       match /elan_teams/{teamId} {
         allow read:  if request.auth != null && request.auth.token.get('t', '') == teamId;
         allow write: if request.auth != null && request.auth.token.get('t', '') == teamId
                         && versionOk();
       }

   ⚠️ NE PAS PERDRE versionOk() : sans lui, la porte de version se rouvre — un appareil resté
   en vieille version réécrit toute la base de l'entreprise avec sa copie périmée, ce qui a
   déjà détruit les comptes d'ELAN une fois.
   ⚠️ L'ORDRE EST VITAL, et c'est exactement la leçon de cette même porte : publier la règle
   AVANT que tous les appareils présentent le jeton ferme la porte aux retardataires, qui
   n'ont alors plus accès aux données de leur propre entreprise. D'abord tout le monde monte,
   ENSUITE la porte se ferme. Le texte complet, avec les trois conditions, est dans
   `firestore.rules` — c'est lui qui fait foi.

   La preuve demandée est celle des copies de sauvegarde — `kh`, l'empreinte SHA-256 de la
   clé d'équipe, jamais la clé — et les refus sont les mêmes, pour les mêmes raisons. En
   particulier l'ESPACE DE REPLI est exclu : ses deux clés sont écrites en clair dans
   app.html, une preuve venant de lui ne prouve rien. Ces appareils restent donc en anonyme
   — et c'est précisément ce qui rend le déménagement des entreprises restées sur la clé
   partagée OBLIGATOIRE avant de pouvoir fermer la porte. */
let jetonQuota = new Map();
app.post('/api/fb/jeton', async (req, res) => {
  const b = req.body || {}; const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
  if (!t || !/^[0-9a-f]{64}$/.test(kh)) return res.status(400).json({ error: 't et kh requis' });
  /* La MÊME garde que les copies de sauvegarde, à un mot près — une seule fonction, parce que
     deux copies d'un contrôle de sécurité finissent toujours par diverger (c'est la leçon des
     quatre portes de sortie d'espace, corrigées le même jour). */
  const refus = sauvRefus(t, kh, 'jeton'); if (refus) return res.status(refus.code).json({ error: refus.error });
  /* ⛔ LE PLAFOND SE COMPTE APRÈS LA PREUVE, JAMAIS AVANT — relecture du gardien, 10 septembre
     2026. Compté avant, il devenait une arme : 120 requêtes avec le `t` d'une entreprise et
     n'importe quelle empreinte bien formée, et TOUS ses appareils prennent 429 pour une heure.
     Aujourd'hui ils repartent en anonyme sans rien voir ; la règle une fois fermée, l'entreprise
     perdrait l'accès à ses propres données, de façon répétable indéfiniment. Le vidage de la
     table aussi : 5001 identifiants inventés remettaient tous les compteurs à zéro. Les trois
     routes de sauvegarde comptent dans le bon ordre — celle-ci le fait maintenant aussi. */
  if (jetonQuota.size > 5000) jetonQuota = new Map();
  if (!quotaOk(jetonQuota, 't:' + t, 120, 3600000)) return res.status(429).json({ error: 'trop de demandes — réessaie plus tard' });
  /* ⛔ ET UNE CLÉ PUBLIQUE N'EST PAS UNE PREUVE. `sauvRefus` refuse l'espace de REPLI par son
     NOM ; or des entreprises ont leur propre identifiant d'espace tout en portant encore la
     clé par défaut, celle qui est écrite en clair dans app.html. Leur empreinte se calcule
     donc sans rien savoir, et sans ce refus elles recevraient un vrai jeton : la règle une
     fois fermée se refermerait sur tout le monde SAUF sur elles — exactement la population
     que firestore.rules désigne comme la plus exposée. C'est ce refus qui rend le déménagement
     des entreprises restées sur la clé partagée obligatoire, et il faut qu'il se voie. */
  if (cleEstPublique(t)) return res.status(409).json({ error: 'espace encore sur la clé partagée — à migrer avant de pouvoir être authentifié' });
  if (!fbAdminCle || !fbAdminCle.client_email || !fbAdminCle.private_key) return res.status(503).json({ error: 'firebase_off' });
  try {
    const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const uid = fbUidEquipe(t);
    const sans = b64u({ alg: 'RS256', typ: 'JWT' }) + '.' + b64u({
      iss: fbAdminCle.client_email, sub: fbAdminCle.client_email,
      aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
      iat: now, exp: now + 3600, uid, claims: { t } });
    const sig = crypto.createSign('RSA-SHA256').update(sans).sign(fbAdminCle.private_key).toString('base64url');
    res.set('Cache-Control', 'no-store');   // un jeton d'accès ne se garde nulle part en chemin
    return res.json({ ok: true, jeton: sans + '.' + sig });
  } catch (e) { console.error('jeton équipe : signature impossible —', e.message); return res.status(500).json({ error: 'signature impossible' }); }
});
/* Par `FIRESTORE_URL` (Google en production, 127.0.0.1 dans un banc) : c'est ce qui permet à un
   banc de jouer la confirmation de la version minimale chez Firestore, dont dépend la copie. */
const fsBase = () => FIRESTORE_URL + '/projects/' + FB_PROJET + '/databases/(default)/documents';
async function fbAdminFetch(url, opts, tok) {
  const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 10000);
  try { return await fetch(url, Object.assign({}, opts, { headers: Object.assign({ 'Authorization': 'Bearer ' + tok }, (opts || {}).headers || {}), signal: ctrl.signal })); }
  finally { clearTimeout(tm); }
}
/* ⛔ LE DOCUMENT D'ÉQUIPE TEL QUE FIREBASE LE GARDE — pour la copie vers `documents.js`, et pour
   elle seule. Trois réponses, jamais deux : `{existe:false}` sur un 404 (cette entreprise n'a
   JAMAIS rien écrit), `{existe:true, champs}` sur un 200, et `null` pour TOUT le reste — clé
   d'administration absente, jeton refusé, réseau, 5xx. `null` veut dire « on ne sait pas » :
   le prendre pour « vide » ferait croire à l'application que l'équipe est neuve.
   ⚠️ `TEAMOP_FIRESTORE_URL` ne sert qu'aux bancs, qui parlent à un Firestore de banc sur
   127.0.0.1 ; il ne se pose pas sur le VPS. */
/* ⛔ UN 404 DE GOOGLE N'EST « ENTREPRISE NEUVE » QUE S'IL NOMME LE DOCUMENT (`gardien`, C2,
   mesuré). « The database (default) does not exist », un projet supprimé, un `projectId` faux :
   autant de 404 qui ne disent RIEN de cette entreprise — et les prendre pour « jamais rien écrit »
   envoyait l'appareil dans la branche « espace neuf », qui pousse sa base comme celle de l'équipe.
   Firestore répond, pour un document absent : `Document "projects/…/documents/<coll>/<id>" not
   found.` — on exige ce chemin exact, guillemet fermant compris (`ent-a` n'est pas `ent-ab`).
   ⛔ Et le délai couvre TOUT, corps compris (C1) : `fbAdminFetch` le lève aux en-têtes. */
function fbDocumentAbsent(j, collection, t) {
  const m = String((j && j.error && j.error.message) || '');
  return /not found/i.test(m) && m.indexOf('/documents/' + collection + '/' + t + '"') >= 0;
}
async function fbLireDocument(collection, t) {
  const tok = await fbAdminJeton();
  if (!tok) return null;
  const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(FIRESTORE_URL + '/projects/' + FB_PROJET + '/databases/(default)/documents/'
      + encodeURIComponent(collection) + '/' + encodeURIComponent(t), { method: 'GET', headers: { 'Authorization': 'Bearer ' + tok }, signal: ctrl.signal });
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (r.status === 404) {
      if (fbDocumentAbsent(j, collection, t)) return { existe: false };
      console.error('copie firebase : un 404 qui ne nomme pas le document — on ne conclut rien');
      return null;
    }
    if (!r.ok) { console.error('copie firebase : lecture refusée — HTTP', r.status); return null; }
    if (!j || typeof j !== 'object') return null;
    return { existe: true, champs: require('./documents').champsFirestore(j.fields || {}), majFirebase: String(j.updateTime || '') };
  } catch (e) { return null; }
  finally { clearTimeout(tm); }
}
/* ⛔ SUPPRIMER UN COMPTE DU SITE, C'EST CHEZ NOUS D'ABORD. Les trois portes de la Tour (fermer un
   client, suppression totale, « comptes du site ») n'appelaient que Google : après la bascule du
   portail, le compte, le dossier et le fil seraient restés sur notre serveur pour toujours — la
   promesse de suppression de `confidentialite.html` §6 trahie sans un mot. `try` sur `comptes` et
   `portail` : déclarés plus bas, et une zone morte temporelle ne doit pas se taire. */
async function compteSiteSupprimer(email) {
  const m = String(email || '').trim().toLowerCase();
  let chezNous = false;
  let c = null, p = null; try { c = comptes; p = portail; } catch (e) {}
  try { if (c && c.supprimer(m)) chezNous = true; } catch (e) { console.error('compte du site : effacement du compte impossible —', e.code || 'erreur'); }
  try { if (p && p.supprimer(m)) chezNous = true; } catch (e) { console.error('compte du site : effacement du dossier impossible —', e.code || 'erreur'); }
  const g = await fbSupprimerCompteSite(m);
  return { fait: chezNous || !!g.fait, chezNous, google: !!g.fait,
    motif: (chezNous ? 'supprimé chez TeamOP' : 'rien chez TeamOP') + ' · Google : ' + g.motif };
}
// supprime le compte du site (connexion) + fiche + messagerie d'un client — via la clé admin
async function fbSupprimerCompteSite(email) {
  const tok = await fbAdminJeton();
  if (!tok) return { fait: false, motif: 'clé admin absente sur le serveur' };
  try {
    const rl = await fbAdminFetch(IDTK_URL + '/projects/' + FB_PROJET + '/accounts:lookup',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: [email] }) }, tok);
    const jl = await rl.json().catch(() => ({}));
    const uid = jl.users && jl.users[0] && jl.users[0].localId;
    if (!uid) return { fait: false, motif: 'aucun compte du site avec cet e-mail' };
    let pageTok = '', n = 0;   // messagerie : les messages un par un, puis le fil, puis la fiche
    for (let tour = 0; tour < 20; tour++) {
      const rm = await fbAdminFetch(fsBase() + '/teamop_threads/' + uid + '/msgs?pageSize=300' + (pageTok ? '&pageToken=' + encodeURIComponent(pageTok) : ''), { method: 'GET' }, tok);
      const jm = await rm.json().catch(() => ({}));
      for (const d of (jm.documents || [])) { await fbAdminFetch(FIRESTORE_URL + '/' + d.name, { method: 'DELETE' }, tok); n++; }
      pageTok = jm.nextPageToken || ''; if (!pageTok) break;
    }
    await fbAdminFetch(fsBase() + '/teamop_threads/' + uid, { method: 'DELETE' }, tok);
    await fbAdminFetch(fsBase() + '/teamop_requests/' + uid, { method: 'DELETE' }, tok);
    const rd = await fbAdminFetch(IDTK_URL + '/projects/' + FB_PROJET + '/accounts:delete',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ localId: uid }) }, tok);
    if (!rd.ok) return { fait: false, motif: 'suppression du compte refusée (HTTP ' + rd.status + ')' };
    return { fait: true, motif: 'compte du site + fiche + messagerie supprimés (' + n + ' message(s))' };
  } catch (e) { return { fait: false, motif: String(e.message).slice(0, 120) }; }
}
/* ══ L'IDENTITÉ FIREBASE D'UNE ENTREPRISE, ET COMMENT LA COUPER ═══════════════════════════
   Un identifiant par ENTREPRISE, pas par appareil : la règle ne regarde que l'appartenance,
   et un compte Firebase par téléphone en ouvrirait des milliers pour rien. Dérivé de `t`,
   donc stable, et il ne porte aucune donnée de personne.

   ⛔ UNE SEULE DÉFINITION, parce que deux copies d'un contrôle de sécurité finissent toujours
   par diverger — c'est la leçon des quatre portes de sortie d'espace, corrigées le même jour.
   `/api/fb/jeton` la signe, `fbRevoquerEquipe` la coupe : si les deux ne calculaient pas le
   MÊME identifiant, la coupure viserait un compte qui n'existe pas et ne dirait rien. */
function fbUidEquipe(t) {
  return 'eq_' + crypto.createHash('sha256').update('teamop:' + String(t || '')).digest('hex').slice(0, 32);
}

/* ⛔ CE QUE FERMER UNE ENTREPRISE NE FAISAIT PAS, ET QUE PERSONNE NE VOYAIT.
   Le serveur refusait bien tout NOUVEAU jeton à un espace fermé (`sauvRefus`, 403 « espace
   fermé »). Mais un jeton vaut une heure et Firebase l'échange contre une session
   RENOUVELABLE INDÉFINIMENT, rangée sur l'appareil : après un seul échange réussi, l'appareil
   ne repasse plus jamais par le serveur. Fermer une entreprise depuis la Tour ne coupait donc
   PAS son Firestore sur les appareils déjà pourvus — ils continuaient à lire et à écrire les
   données de l'entreprise, pour toujours, pendant que la Tour affichait « fermée ».

   `validSince` est ce qui manquait : il invalide les jetons de rafraîchissement du compte.
   L'appareil ne peut plus renouveler, et sa session meurt à l'expiration de celle qu'il tient.

   ⚠️ CE N'EST DONC PAS INSTANTANÉ — jusqu'à UNE HEURE, la durée de vie d'un jeton d'identité
   déjà délivré. Firestore vérifie la signature et l'échéance, pas l'existence du compte. Il
   faut le dire tel quel plutôt que promettre une coupure immédiate : une heure de trop se
   gère (on prévient), une promesse fausse ne se gère pas.
   Pour l'instantané il faudrait que la règle Firestore compare `request.auth.token.auth_time`
   à une date de fermeture lue dans Firestore — un `get()` à chaque évaluation, et un
   changement de la règle qui garde TOUTES les données. À traiter seul, pas ici.

   ⚠️ ET ÇA NE MARCHE PAS SANS LA CLÉ D'ADMINISTRATION. Quand elle manque, la fonction rend
   `false` et l'appelant DOIT le dire : croire une entreprise coupée alors qu'elle ne l'est pas
   est exactement la panne silencieuse que ce fichier passe son temps à refermer. */
async function fbRevoquerEquipe(t) {
  if (!t) return { fait: false, motif: 'espace vide' };
  /* Le `await` est DANS le try : aujourd'hui fbAdminJeton ne peut pas rejeter, mais ce fichier
     n'a ni `unhandledRejection` ni middleware d'erreur Express — et Node 22 transforme un rejet
     non traité en ARRÊT DU PROCESSUS. Faire dépendre la survie de l'API de la discipline d'une
     fonction voisine est un pari qu'on finit par perdre. */
  try {
    const tok = await fbAdminJeton();
    if (!tok) return { fait: false, motif: 'clé d\'administration Firebase absente du serveur' };
    const r = await fbAdminFetch(IDTK_URL + '/projects/' + FB_PROJET + '/accounts:update',
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: fbUidEquipe(t), validSince: String(Math.floor(Date.now() / 1000)) }) }, tok);
    /* Un compte ABSENT n'est pas un échec : l'entreprise n'a simplement jamais demandé de
       jeton (elle vivait en anonyme, ou elle n'a pas encore ouvert l'application depuis la
       v640). Il n'y a alors aucune session à couper — c'est le résultat voulu. */
    if (r.status === 400) {
      const j = await r.json().catch(() => ({}));
      const m = String((j.error && j.error.message) || '');
      if (/USER_NOT_FOUND/i.test(m)) return { fait: true, motif: 'aucune session Firebase à couper' };
      return { fait: false, motif: 'refus Firebase : ' + m.slice(0, 80) };
    }
    if (!r.ok) return { fait: false, motif: 'Firebase a répondu HTTP ' + r.status };
    return { fait: true, motif: 'sessions coupées — effectif sous une heure' };
  } catch (e) { return { fait: false, motif: String(e && e.message || e).slice(0, 120) }; }
}

/* Met à jour la fiche « Mon espace » du client (Firestore, via la clé admin) :
   demande acceptée → badge « Accès activé », application OP GESTION active,
   abonnement affiché. Sans la clé admin, on passe silencieusement. */
async function fbMajFicheClient(email, champs) {
  /* ⛔ LE PORTAIL MONTÉ, LA FICHE S'ÉCRIT CHEZ NOUS — ET PLUS RIEN NE PART CHEZ GOOGLE. Après la
     bascule, `espace.html` lit son dossier sur notre serveur : écrire « accès activé » ou la
     formule payée dans `teamop_requests` ne se voyait plus, et envoyait encore à Google des
     données que `sous-traitance.html` dit figées. `try` : le portail est déclaré plus bas dans le
     fichier, et une zone morte temporelle se tait sous un `.catch(() => {})`. */
  let p = null; try { p = portail; } catch (e) { p = null; }
  if (p) return p.majServeur(email, champs);
  const tok = await fbAdminJeton();
  if (!tok) return false;
  try {
    const rl = await fbAdminFetch(IDTK_URL + '/projects/' + FB_PROJET + '/accounts:lookup',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: [email] }) }, tok);
    const jl = await rl.json().catch(() => ({}));
    const uid = jl.users && jl.users[0] && jl.users[0].localId;
    if (!uid) return false;
    const fields = {};
    for (const [k, v] of Object.entries(champs)) {
      fields[k] = Array.isArray(v) ? { arrayValue: { values: v.map(x => ({ stringValue: String(x) })) } } : { stringValue: String(v) };
    }
    const mask = Object.keys(champs).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
    const r = await fbAdminFetch(fsBase() + '/teamop_requests/' + uid + '?' + mask,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) }, tok);
    if (r.ok) console.log('fiche espace client mise à jour →', masqueMail(email), Object.keys(champs).join(','));
    else console.error('fiche espace client HTTP', r.status, '→', masqueMail(email));
    return r.ok;
  } catch (e) { console.error('fiche espace client :', e.message); return false; }
}
const FORMULE_LBL = { gratuit: 'Gratuit', pro: 'Pro', business: 'Business', premium: 'Business Premium' };
app.post('/api/monitor/clients/retirer', monPatronStrict, async (req, res) => {
  const t0 = Date.now();
  const email = monStr((req.body || {}).email, 120).toLowerCase();
  if (!clientsData[email]) return res.status(404).json({ error: 'entreprise introuvable' });
  const codeRecu = monStr((req.body || {}).code, 10).trim();
  let confirme = (req.body || {}).confirme === true;   // question + case + « Oui » dans la Tour — voir `SUPPRIMER SANS CODE`
  if (!supprMailPret()) return res.status(503).json({ error: confirme ? SUPPR_PAS_DE_MAIL : 'e-mail non configuré — impossible d\'envoyer le code' });
  if (!(await supprRattraper())) return res.status(503).json({ error: SUPPR_AVIS_BLOQUE });   // un avis d'avant n'est pas parti : il part d'abord
  if (!clientsData[email]) return res.status(404).json({ error: 'entreprise introuvable' });   // relu après l'attente
  const nomCli = uneLigne(clientsData[email].entreprise, 80) || email;
  /* ⛔ CE QUE LA FERMETURE VA EFFACER, RELU ICI, AVANT LE CODE ET AVANT LA LIMITE (`gardien`, 27 septembre 2026,
     B1 et B2). Tous les espaces reliés à cette adresse partent — et chacun compte pour une entreprise :
     compter « une fermeture » laissait détruire six entreprises sous une limite de trois. L'espace partagé
     de l'application n'est jamais effacé ni fermé : une entrée d'annuaire qui le porte est seulement
     détachée (`REFUS_INTOUCHABLE` dit pourquoi). Aucun `await` d'ici à `supprEntCompter` sur le chemin
     confirmé : deux fermetures simultanées ne passent pas toutes les deux sous la limite. */
  const liens = [];
  for (const [slug, e] of Object.entries(espacesReg)) if (e && (e.email || '').toLowerCase() === email) liens.push({ slug, t: espaceT(e), nom: uneLigne(espNomPropre(e), 80) || slug });
  const aEffacer = [...new Set(liens.map(x => x.t).filter(t => t && !ESPACES_INTOUCHABLES.includes(t)))];
  const nEnt = Math.max(1, aEffacer.length);
  const limite = supprEntLimite(nEnt);
  if (limite && supprDestLisible()) return res.status(409).json({ error: supprLisibleTxt(nEnt), limite: true, lisible: true });
  if (limite) confirme = false;   // au-delà de trois entreprises en 24 heures : le code revient (`APRÈS CHAQUE SUPPRESSION`)
  /* Le code vaut pour CETTE liste d'espaces : un espace rattaché entre l'envoi du code et sa saisie le
     rend caduc — on ne ferme pas plus que ce que l'e-mail a nommé. */
  const cle = email + '|' + crypto.createHash('sha256').update(aEffacer.slice().sort().join(',')).digest('hex').slice(0, 16);
  const nommes = liens.filter(x => aEffacer.includes(x.t)).map(x => '« ' + x.nom + ' »');
  if (!codeRecu && !confirme) {   // 1er temps : on envoie le code de confirmation au patron (la Tour d'avant la v2.69)
    if (retraitCodes.size > 500) for (const [k, v] of retraitCodes) if (Date.now() > v.exp) retraitCodes.delete(k);
    const code = String(crypto.randomInt(100000, 1000000));   // `crypto` : au-delà de trois entreprises, ce code est le verrou d'une session volée
    retraitCodes.set(cle, { code, exp: Date.now() + 10 * 60000, tries: 0 });
    const dest = supprDest();
    try {
      await mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: dest,
        /* Comme pour la suppression totale : le code n'échappait au journal des e-mails que
           parce que mailerEnvoi teste /code/i sur l'objet. Reformuler cet objet ferait tomber
           un code à 6 chiffres dans un fichier lisible en monAdmin. On le dit explicitement
           plutôt que de dépendre d'un mot. */
        confidentiel: true, trace: 'code de fermeture d\'entreprise · ' + masqueMail(email),
        subject: '🗑 Code de confirmation — fermeture de « ' + nomCli + ' »',
        text: 'Tu es sur le point de FERMER DÉFINITIVEMENT l\'entreprise « ' + nomCli + ' » (' + email + ').\n\n' + (limite ? supprLimiteTxt(nEnt) : '')
          + (aEffacer.length ? (aEffacer.length > 1 ? 'Les ' + aEffacer.length + ' espaces reliés à cette adresse seront effacés' : 'Son espace sera effacé') + ', avec toutes leurs données : ' + nommes.join(', ') + '.\n\n'
            : 'Aucun espace n\'est relié à cette adresse : seule sa fiche est fermée.\n\n')
          + 'Code de confirmation : ' + code + '\n\nValable 10 minutes. Après validation : plus de nom, plus de lien, plus de formule, et les applications de ses appareils se vident à leur prochain lancement.\nSi ce n\'est pas toi, ignore ce message.' });
    } catch (e) { return res.status(500).json({ error: 'envoi du code impossible : ' + sansAdresses(String(e.message)).slice(0, 120) }); }
    console.log('Tour : code de fermeture envoyé pour', masqueMail(email), '→', masqueMail(adrNue(dest)), limite ? '(limite de 24 h atteinte)' : '');
    return res.json(Object.assign({ ok: true, codeEnvoye: true, dest: masqueMail(adrNue(dest)), espaces: aEffacer.length }, limite ? { limite: true, pourquoi: supprLimiteRaison(nEnt) } : {}));
  }
  if (!confirme) {   // 2e temps : le code revient
    const c = retraitCodes.get(cle);
    if (!c || Date.now() > c.exp) { retraitCodes.delete(cle); return res.status(400).json({ error: 'code expiré — recommence' }); }
    c.tries++; if (c.tries > 5) { retraitCodes.delete(cle); return res.status(429).json({ error: 'trop d\'essais — recommence' }); }
    if (codeRecu !== c.code) return res.status(400).json({ error: 'code incorrect (' + (6 - c.tries) + ' essai(s) restants)' });
  }
  retraitCodes.delete(cle);
  // fermeture effective : liste, annuaire (nom + lien + formule), et blocage des espaces reliés
  if (!entFermes.emails.includes(email)) entFermes.emails.push(email);
  const espacesAEffacer = aEffacer;
  let detache = false;
  for (const lien of liens) {
    if (!espacesReg[lien.slug]) continue;
    const t = lien.t;
    if (t && ESPACES_INTOUCHABLES.includes(t)) { delete espacesReg[lien.slug]; detache = true; continue; }   // le nom s'en va, l'espace partagé reste entier
    /* ⛔ FERMER DÉFINITIVEMENT RETIRE LA SUSPENSION : sinon une entreprise suspendue puis
       fermée restait « suspendue », donc ouverte (voir `espaceEstSuspendu`). */
    if (t) { if (!entFermes.espaces.includes(t)) entFermes.espaces.push(t);
      entFermes.suspendus = (entFermes.suspendus || []).filter(x => x !== t); delete (entFermes.suspendusLe || {})[t];
      delete accesReg[t]; delete comptesReg[t]; }   // le code d'accès ET l'annuaire de connexion s'en vont avec l'espace, sinon ils ouvrent encore
    delete espacesReg[lien.slug];
  }
  /* Les trois écritures se testent. Un disque plein les fait échouer ENSEMBLE : sans ce contrôle,
     la route répondait « fermée » pendant que rien n'était écrit, et au redémarrage l'entreprise
     revenait, code d'accès compris. On préfère dire que ça n'a pas marché. */
  let ecrit = true;
  if (!espacesEcrire()) ecrit = false;
  if (!accesEcrire()) ecrit = false;
  if (!comptesEcrire()) ecrit = false;
  if (!fermesSave()) ecrit = false;
  if (!ecrit) return res.status(500).json({ error: 'La fermeture n\'a pas pu être enregistrée — rien n\'est garanti. Vérifie le serveur avant de recommencer.' });
  const rang = supprEntCompter(nEnt);   // la fermeture est écrite : elle compte — un par espace effacé — quoi qu'il arrive ensuite
  delete clientsData[email]; cliSave();
  /* ⛔ COUPER AVANT D'EFFACER — mais la fenêtre est RACCOURCIE, pas fermée, et il faut le dire
     dans ces termes. `validSince` n'invalide que le RAFRAÎCHISSEMENT : un appareil qui tient
     encore un jeton d'identité valable passe la règle Firestore pendant jusqu'à une heure, et
     peut donc RECRÉER `elan_teams/{t}` en entier après l'effacement — sous un identifiant que
     l'annuaire ne connaît plus, c'est-à-dire la genèse même des « espaces hors annuaire » que
     ce fichier décrit plus bas. `forfaitServeurSync` (app.html) vide l'appareil sur
     `ferme:true`, mais seulement À L'OUVERTURE de l'application : un appareil déjà lancé qui
     synchronise en fond ne repasse pas par là.
     Ce qui reste à faire pour fermer vraiment : repasser un DELETE ~65 min après (une liste
     sur disque, pour survivre à un redémarrage). Noté dans REPRISE, pas fait ici.
     En parallèle et non en série : chaque révocation coûte jusqu'à 10 s, `espacesAEffacer`
     n'est borné par rien, et nginx rend 504 à 60 s — en série, trois espaces suffisaient à
     faire croire la route plantée pendant qu'elle détruisait. */
  const coupures = await Promise.all(espacesAEffacer.map(tf => fbRevoquerEquipe(tf)));
  /* Suppression : on COUPE d'abord, on efface ensuite — un appareil qui tient encore un jeton
     valable recréerait sinon ce qu'on vient d'enlever. */
  for (let i = 0; i < espacesAEffacer.length; i++) {
    const cs = socleCouper(espacesAEffacer[i], 'suppression'); if (!cs.fait) coupures[i] = { fait: false, motif: cs.motif };
    const ef = socleEffacer(espacesAEffacer[i]); if (!ef.ok) coupures[i] = { fait: false, motif: ef.motif };
  }
  // Effacement DÉFINITIF des données chiffrées de l'entreprise sur Firestore :
  // plus rien n'est enregistré, la place est libérée. (Les appareils reliés se
  // vident de toute façon au prochain lancement via le blocage entFermes.)
  const FB_CLE = (config.firebase && config.firebase.apiKey) || 'AIzaSyAbah03sO4f4LyNhvmig0Pn00lz1sHSpT8';
  let effaces = 0;
  // Les règles Firestore exigent un utilisateur connecté : jeton anonyme jetable,
  // supprimé sitôt l'effacement terminé.
  let jeton = '', jetonAdmin = false;
  if (espacesAEffacer.length) {
    jeton = await fbAdminJeton(); jetonAdmin = !!jeton;   // la clé admin passe au-dessus des règles
    if (!jeton) try {
      const r = await fetch(IDTK_URL + '/accounts:signUp?key=' + FB_CLE,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' });
      const j = await r.json().catch(() => ({}));
      jeton = j.idToken || '';
      if (!jeton) console.error('effacement firestore : jeton anonyme refusé (active la connexion Anonyme dans Firebase)');
    } catch (e) { console.error('effacement firestore jeton :', e.message); }
  }
  /* En parallèle, comme les coupures au-dessus (`gardien`, R5) : huit secondes par espace, en série, puis
     l'avis — une fermeture de plusieurs espaces dépassait les 60 s de nginx, qui rendait 504 sur une
     fermeture FAITE. */
  effaces = (await Promise.all(espacesAEffacer.map(async t => {
    let fait = false;
    try {
      const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(FIRESTORE_URL + '/projects/' + FB_PROJET + '/databases/(default)/documents/elan_teams/' + encodeURIComponent(t) + '?key=' + FB_CLE,
        { method: 'DELETE', headers: jeton ? { 'Authorization': 'Bearer ' + jeton } : {}, signal: ctrl.signal });
      clearTimeout(tm);
      if (r.ok) fait = true; else console.error('effacement firestore', t, ': HTTP', r.status);
    } catch (e) { console.error('effacement firestore', t, ':', e.message); }
    /* Le document rangé chez nous part aussi — voir `documents.js`, `effacer`. */
    if (documentsMod) { try { await documentsMod.effacer(t); } catch (e) {} }
    return fait;
  }))).filter(Boolean).length;
  /* ⛔ LES PIÈCES JOINTES PARTENT AVEC LE DOCUMENT (16 septembre 2026). Le commentaire
     au-dessus promet « plus rien n'est enregistré, la place est libérée » : à partir du moment
     où des photos vivent sur le VPS, cette phrase devient fausse si on ne les efface pas ici.
     Aucun appel réseau, aucun jeton : c'est du disque local, ça ne peut pas faire traîner la
     route (la même raison qui a fait passer les coupures en parallèle). */
  let piecesEffacees = 0;
  if (pieces) for (const t of espacesAEffacer) { try { piecesEffacees += pieces.effacerEntreprise(t); } catch (e) { console.error('effacement pièces :', e.code || 'erreur disque');   /* ⛔ ni `t` ni le chemin : ce journal se relit à plusieurs et se copie-colle */ } }
  if (jeton && !jetonAdmin) { try { await fetch(IDTK_URL + '/accounts:delete?key=' + FB_CLE,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: jeton }) }); } catch (e) {} }
  // et le compte créé sur le site (connexion espace client) : supprimé aussi, si la clé admin est là
  const compteSite = await compteSiteSupprimer(email);
  console.log('Tour :', req.tourUser.nom, 'a FERMÉ l\'entreprise', masqueMail(email), confirme ? '(confirmée)' : '(par code)', '— données effacées :', effaces + '/' + espacesAEffacer.length, '· compte du site :', compteSite.motif);
  monLog(req.tourUser.nom || 'patron', true, req, 'fermeture d\'entreprise · ' + (confirme ? 'confirmée' : 'par code'));   // sans l'adresse : le journal de la Tour se relit à plusieurs
  /* La coupure se DIT. Si la clé d'administration manque, les appareils déjà pourvus gardent
     leur session jusqu'à une heure ET peuvent repousser la base qu'on vient d'effacer :
     c'est exactement ce qu'il faut savoir avant de croire l'entreprise fermée. */
  /* `[].every()` rend TRUE : sans ce cas, un client sans aucun espace relié s'entendait dire
     « sessions coupées » alors que rien n'avait été tenté. C'est la même famille d'affirmation
     sans fait derrière que ce correctif combat — elle ne s'autorise pas ici non plus. */
  const coupOk = coupures.every(c => c.fait);
  const coupureMotif = !coupures.length ? 'aucun espace relié — rien à couper'
    : coupOk ? 'sessions Firebase coupées — effectif sous une heure'
    : (coupures.find(c => !c.fait) || {}).motif || '';
  const nEsp = espacesAEffacer.length;
  const avis = await supprAvis(req, { t0, confirme, rang, n: nEnt, trace: 'fermeture d\'entreprise · ' + (confirme ? 'confirmée' : 'par code'),
    sujet: '🗑 Tour — entreprise « ' + nomCli + ' » fermée',
    quoi: 'l\'entreprise « ' + nomCli + ' » (' + email + ') — fermée définitivement : plus de nom, plus de lien, plus de formule ; '
      + (!nEsp ? 'aucun espace relié.' : nEsp === 1 ? 'son espace ' + nommes[0] + ' est effacé.' : 'ses ' + nEsp + ' espaces sont effacés : ' + nommes.join(', ') + '.')
      + (detache ? ' L\'espace partagé de l\'application, qui lui était rattaché, n\'est pas touché.' : ''),
    attention: coupOk ? '' : 'les sessions n\'ont pas pu être coupées (' + uneLigne(coupureMotif, 160) + ').' });
  res.json({ ok: true, supprime: true, espaces: nEsp, donneesEffacees: effaces, piecesEffacees, compteSite,
    coupure: coupOk, coupureMotif, avis });
});

/* ══ SUPPRIMER UNE ENTREPRISE, PARTOUT ═══════════════════════════════════════════
   « Repartir à neuf » et « Fermer définitivement » existaient déjà, mais aucune des deux
   ne supprime tout, et l'une des deux ne supprime rien du tout à long terme :

   · /clients/retirer est indexée par E-MAIL et exige clientsData[email]. Un espace ouvert
     depuis la Tour, ou repéré par ses seules connexions, ne peut donc pas être supprimé.
   · /espaces/renaitre efface le document Firestore MAIS N'AJOUTE RIEN À entFermes. Or
     app.html (vers la ligne 5131) dit, au premier instantané : « équipe vide → on amorce
     avec nos données », et repousse toute sa base chiffrée. Le premier appareil qui rouvre
     REMET donc tout — sous un identifiant que l'annuaire ne connaît plus. C'est ainsi que
     naissent les « espaces hors annuaire » qu'on ne sait plus rattacher à personne.

   Ces deux routes-ci sont indexées par TEAMID : c'est la seule clé que toutes les sources
   partagent (l'annuaire connaît le slug, les comptes du site l'e-mail, les connexions rien
   d'autre que le t). Elles restent en place : celle-ci ne les remplace pas, elle couvre le
   cas qu'aucune ne couvre — « supprime tout, partout ».

   L'ORDRE DES OPÉRATIONS N'EST PAS ARBITRAIRE :
     1. entFermes EN PREMIER. C'est ce qui fait que /api/espaces/etat répond ferme:true et
        que les appareils se vident au lieu de repousser leurs données. Sans ça, tout le
        reste est défait par le premier client qui rouvre son application.
     2. Les boîtes mail ENSUITE. releveBoite() itère mailboxes toutes les 120 s : tant
        qu'elles sont là, le serveur continue de se connecter aux boîtes professionnelles
        d'une entreprise supprimée et de réécrire dans replies.jsonl ce qu'on vient d'en
        retirer. Elles portent aussi les mots de passe IMAP/SMTP en clair.
     3. Le reste dans n'importe quel ordre, mais l'annuaire EN DERNIER parmi les registres :
        il est le seul à relier nom, slug, teamId, e-mail et clé d'équipe. L'effacer d'abord
        rendrait le reste inatteignable. */

/* Résout TOUTES les identités d'un espace à partir de son seul teamId, et compte ce qu'il
   y a à perdre. Aucune écriture — c'est aussi ce qui alimente l'aperçu avant suppression,
   et ce qui permet de VÉRIFIER après coup que tout est bien parti. */
function entInventaire(t) {
  const slugs = [], emails = new Set(); let nom = '';
  for (const [slug, e] of Object.entries(espacesReg)) {
    if (espaceT(e) !== t) continue;
    slugs.push(slug);
    if (e.email) emails.add(String(e.email).toLowerCase());
    if (!nom) nom = espNomPropre(e) || '';
  }
  const boites = Object.entries(mailboxes).filter(([, b]) => b && b.teamId === t).map(([id]) => id);
  /* Les adresses qui peuvent figurer dans les archives de courrier : celles de l'annuaire,
     PLUS celle de la boîte reliée. Un espace hors annuaire n'a pas d'entrée dans espacesReg
     — c'est le cas précis pour lequel la route de suppression existe — mais il a souvent une
     boîte, et son adresse est exactement celle qu'on retrouve dans mails-envoyes.json.
     Ensemble SÉPARÉ de emails, qui pilote aussi la suppression du compte du site : on ne
     veut pas effacer un compte de site parce qu'une boîte porte la même adresse. */
  const adressesCourrier = new Set(emails);
  for (const [, b] of Object.entries(mailboxes)) if (b && b.teamId === t && b.email) adressesCourrier.add(String(b.email).toLowerCase());
  /* MAIS la déduplication des boîtes est scopée par teamId (voir /api/mailbox/connect) : la
     MÊME adresse peut vivre sous DEUX teamId à la fois, et rien ne purge jamais une entrée
     périmée. Le cas n'est pas tordu, c'est l'usage même de cette route : une entreprise dont
     l'espace a été recréé — ancien teamId devenu hors annuaire — et qui a rebranché sa boîte.
     Purger sur cette adresse effacerait les archives de son espace VIVANT, sans retour
     possible (tmp+rename, aucune copie). On les ÉCARTE de la purge et on le DIT : mieux vaut
     sous-purger et l'annoncer que sur-purger en silence. */
  const partagees = [...adressesCourrier].filter(a =>
    Object.values(mailboxes).some(b => b && b.teamId !== t && String(b.email || '').toLowerCase() === a));
  const aPurger = [...adressesCourrier].filter(a => partagees.indexOf(a) < 0);
  /* Un compte du site sous l'adresse d'une BOÎTE (donc hors annuaire) : la suppression n'y
     touche pas — on n'efface pas un compte dont on ne peut pas prouver l'appartenance. On le
     signale pour que « 0 compte du site » ne se lise pas comme « il n'en reste aucun ». */
  const comptesSiteHorsAnnuaire = Object.values(clientsData)
    .filter(c => c && !emails.has(String(c.email || '').toLowerCase()) && aPurger.indexOf(String(c.email || '').toLowerCase()) >= 0)
    .map(c => String(c.email).toLowerCase());
  const abos = Object.entries(subs).filter(([, x]) => x && x.teamId === t).map(([ep]) => ep);
  let bugs = 0;
  try { for (const l of fs.readFileSync(BUGS_PATH, 'utf8').trim().split('\n')) { try { const b = JSON.parse(l); if (b && b.team === t) bugs++; } catch (err) {} } } catch (err) {}
  let reponses = 0;
  try { for (const l of fs.readFileSync(REPLIES_PATH, 'utf8').trim().split('\n')) { try { const r = JSON.parse(l); if (r && r.teamId === t) reponses++; } catch (err) {} } } catch (err) {}
  /* sentmap.jsonl garde, pour chaque bon de commande envoyé, l'adresse du CLIENT DE
     L'ENTREPRISE. C'est son carnet d'adresses : le laisser derrière une « suppression
     totale » serait garder des données personnelles de tiers. Et il sert au rattachement
     des réponses (voir releveBoite) : une ligne oubliée ré-étiquette un message entrant
     avec un teamId supprimé et le réécrit dans replies.jsonl qu'on vient de purger. */
  let bonsEnvoyes = 0;
  try { for (const l of fs.readFileSync(SENTMAP_PATH, 'utf8').trim().split('\n')) { try { const x = JSON.parse(l); if (x && x.teamId === t) bonsEnvoyes++; } catch (err) {} } } catch (err) {}
  /* Par l'identifiant ET par l'empreinte de l'e-mail : une utilisation d'avant « repartir à neuf »
     appartient à la même entreprise (voir `promoCles`). */
  const promos = [...new Set(promoCles(t, slugs, emails).map(x => x.code))];
  const cnx = cnxData[t] || [];
  const usage = usageData[t] || null;
  /* comptesAnnuaire est une PREUVE, pas un indice : comptesReg[t] ne peut être écrit que par
     /api/espaces/comptes, qui refuse si l'espace n'existe pas et si l'empreinte de la clé
     d'équipe ne correspond pas. Un espace hors annuaire qui en porte A DONC ÉTÉ un vrai
     espace, avec de vrais comptes — son entrée d'annuaire a été perdue, pas inventée. */
  const comptes = Object.keys((comptesReg[t] && comptesReg[t].c) || {}).length;
  const comptesSite = Object.values(clientsData).filter(c => c && emails.has(String(c.email || '').toLowerCase())).length;
  /* Les deux archives de courrier, comptées ici parce que la suppression les efface
     désormais : un aperçu qui annonce moins que ce qui part n'est plus un aperçu. */
  const purgeSet = new Set(aPurger);
  const mailsEnvoyes = mailsLog.filter(m => m && purgeSet.has(String(m.a || '').toLowerCase())).length;
  const mailsRecus = supportMails.filter(m => m && purgeSet.has(String(m.from || '').toLowerCase())).length;
  const mailsEcrits = supportEnvoyes.filter(m => m && purgeSet.has(String(m.to || '').toLowerCase())).length;
  return {
    t, nom, slugs, emails: [...emails], adressesCourrier: aPurger, partagees, comptesSiteHorsAnnuaire,
    dansAnnuaire: slugs.length > 0,
    dejaFerme: espaceFerme(t),   // une SUSPENDUE n'est pas « déjà fermée » : sa suppression ferme vraiment quelque chose
    boites: boites.length, abonnesPush: abos.length,
    codeAcces: !!accesReg[t], comptesAnnuaire: comptes, copiesSauvegarde: sauvListe(t).length,
    devisIA: !!devisAcces[t],
    connexions: cnx.length,
    premiere: cnx.length ? (cnx[cnx.length - 1].ts || 0) : 0,
    derniere: cnx.length ? (cnx[0].ts || 0) : 0,
    ecransOuverts: (usage && usage.total) || 0,
    erreurs: bugs, reponsesMail: reponses, bonsEnvoyes, promos,
    comptesSite, mailsEnvoyes, mailsRecus, mailsEcrits,
    /* OP MESSAGES est hors de portée : sa collection Firestore (op_companies) est créée
       avec un identifiant auto-généré, sans lien avec le teamId, et le serveur ne le
       connaît pas. On le SIGNALE plutôt que de laisser croire qu'il part avec le reste. */
    opMessages: Object.values(espacesReg).some(e => espaceT(e) === t && e.opMessages),
    _boites: boites, _abos: abos
  };
}

/* Les deux espaces par défaut de l'application ne sont PAS des entreprises : syncTeam()
   (app.html:5096) rend `localStorage.elan_sync_team || FB_TEAM`, et FB_TEAM vaut
   'elan-gestion' dans app.html, 'opgestion-beta' dans beta.html. Tout appareil qui n'a
   rejoint aucun espace signale donc là — y compris un visiteur qui rate une connexion. Ils
   apparaissent dans la Tour comme des entreprises ordinaires, ce qu'ils ne sont pas.
   Les supprimer serait doublement catastrophique : `elan_teams/elan-gestion` est le document
   PARTAGÉ de toutes les entreprises sans clé personnalisée (le périmètre de
   SYNC_SECRET_DEFAULT, voir CLAUDE.md), et les ajouter à entFermes viderait TOUS leurs
   appareils au prochain lancement. Le refus explique, sinon on le prend pour une panne. */
/* ⛔ L'ANCIEN NOM DE LA BÊTA RESTE DANS CETTE LISTE, ET CE N'EST PAS UN OUBLI. Renommage
   demandé par Justin le 17 septembre 2026 : « elan-gestion-beta » ment depuis que le dépôt
   s'appelle TeamOP. Le nouveau nom est `opgestion-beta` — c'est la bêta de l'application
   OP GESTION, pas de la société TEAM OP.
   L'ORDRE EST LE MÊME QUE POUR LA RÈGLE FIRESTORE : la porte d'abord, le déménagement ensuite.
   Cette liste refuse toute suppression ou fermeture à 11 endroits de ce fichier ; si la bêta
   déménageait avant que le serveur connaisse son nouveau nom, le nouvel espace deviendrait
   supprimable comme une entreprise ordinaire et la Tour l'afficherait comme une cliente.
   L'ancien document Firestore, lui, continue d'exister : le garder protégé empêche qu'on
   l'efface depuis la Tour en croyant faire du ménage. On ne le retirera d'ici que le jour où
   plus aucun appareil n'y signale. */
const ESPACES_INTOUCHABLES = ['elan-gestion', 'elan-gestion-beta', 'opgestion-beta'];

/* ⛔⛔ L'HORLOGE SE MONTE **APRÈS** `ESPACES_INTOUCHABLES`, ET CE N'EST PAS UN DÉTAIL DE STYLE.
   Mesuré le 21 septembre 2026 : montée 1 700 lignes plus haut, son balayage initial jetait
   `Cannot access 'ESPACES_INTOUCHABLES' before initialization`, ne datait RIEN, et `/health`
   répondait `actif:true, suivis:0` — exactement ce que répond une horloge qui n'a rien à
   faire. C'est la panne qui a éteint TOUTE la sauvegarde hors site le 19 septembre, dans ce
   fichier, pour la même raison.
   ⚠️ ET `typeof` NE GARDE PAS DE ÇA : sur une `const` en zone morte temporelle, `typeof`
   jette AUSSI — contrairement à une variable simplement non déclarée. La seule réparation
   honnête est l'ORDRE. Ne pas remonter ce bloc « pour regrouper les montages ». */
/* ══ L'HORLOGE DE CONSERVATION ═════════════════════════════════════════════════
   `mentions-legales.html` (article 5) promet que les données sont conservées 24 mois après la
   fin de l'abonnement, puis supprimées. Rien ne le comptait. Ce module TIENT L'HORLOGE — il ne
   supprime rien et n'envoie aucun courriel : voir l'en-tête de `conservation.js` pour les deux
   raisons, dont celle qui compte (un préavis qui annonce une suppression qui n'existe pas est
   un mensonge à un client).
   ⛔ CE QUI EST URGENT, ET LA SEULE RAISON DE LE MONTER MAINTENANT : la date ne se rattrape
   pas. Chaque jour sans elle est un jour perdu pour toujours, et le jour où la suppression
   s'écrira, il n'y aura que deux choix, tous deux faux — dater tout le monde d'aujourd'hui, ou
   effacer le jour du déploiement. */
let conservation = null;
let etatConservation = { actif: false };
try {
  conservation = require('./conservation').monterConservation({
    dossier: DATA_DIR,
    journal: (...a) => console.log(...a),
    /* ⛔ LES ESPACES TECHNIQUES N'ONT PAS D'ABONNEMENT. La même liste que partout ailleurs :
       une seconde définition finirait par diverger, et l'horloge daterait la bêta. */
    intouchable: (t) => ESPACES_INTOUCHABLES.includes(String(t || '')),
    /* ⚠️ ON LIT L'ANNUAIRE, ON N'Y ÉCRIT JAMAIS. `espacePaye()` est déjà la seule autorité sur
       la question « cette entreprise paie-t-elle ? » ; en fabriquer une seconde ici, c'est le
       jour où les deux répondent différemment et où l'horloge tourne pour quelqu'un à jour. */
    /* ⛔⛔ `espacePaye()` EST ASYNCHRONE — elle interroge Stripe. L'appeler sans l'attendre
       rend une PROMESSE, donc `!!promesse.paye` vaut `!!undefined`, donc FAUX pour tout le
       monde : une horloge de suppression sur CHAQUE entreprise, y compris celles à jour.
       Mesuré sur le vrai serveur le 21 septembre 2026. C'était le seul appelant du fichier à
       ne pas l'attendre — les deux autres font `await` ou `.then()`.
       ⚠️ UNE À LA FOIS, PAS EN `Promise.all` : un balayage horaire a tout son temps, et
       lancer un aller-retour Stripe par espace simultanément, c'est se faire limiter par
       Stripe le jour où il y aura cent clients — pour une tâche de fond qui n'est pressée
       par personne. */
    lister: async () => {
      const sortie = [];
      for (const slug of Object.keys(espacesReg)) {
        /* ⛔ L'ENTRÉE ENRICHIE DU SLUG, JAMAIS L'ENTRÉE BRUTE — défaut attrapé par `test-727`
           sur ce code même. `espacePaye()` rattache l'abonnement par `[e.slug, e.t]`, et
           l'entrée du registre ne porte PAS de `slug` : la passer brute ferait répondre
           « ne paie pas » sur une entreprise à jour, donc démarrer une horloge de suppression
           sur un client qui paye. Le slug se recolle AU POINT D'APPEL, et il doit s'y voir :
           le cacher derrière une variable ferait taire le banc sans rien réparer. */
        const e = espacesReg[slug];
        const t = espaceT(e);
        if (!t) continue;
        /* ⛔⛔ UN DOUTE NE POSE NI NE LÈVE AUCUNE HORLOGE (seconde relecture de `gardien`, 30 septembre 2026). Pour
           `balayer`, « payé » veut dire « le client est revenu » : il EFFACE la date. Or le doute rend `paye:true`
           (`payeInconnu` — Stripe illisible, liste périmée, registre des codes illisible : « dans le doute, on ne coupe
           pas »). Une panne de Stripe au redémarrage du serveur — le premier balayage part aussitôt, cache froid —
           effaçait donc la date de TOUTES les entreprises qui ne paient pas, et la date ne se rattrape pas. Une
           exception faisait pareil (on la disait « payée ») : avant le doute, l'erreur allait dans l'autre sens, une
           date posée à tort, levée au balayage suivant. Ni l'un ni l'autre n'est listé : une entreprise absente GARDE
           sa date (`balayer`), et le balayage suivant, qui saura, décidera.
           ⛔ `lecture: true` : balayer n'ACTIVE aucun code promo en attente (voir `espacePaye`). */
        let r = null;
        try { r = await espacePaye(Object.assign({}, facturationDe(e), { slug: slug }), { lecture: true }); } catch (err) { r = null; }
        if (!r || r.doute || r.inconnu) continue;
        sortie.push({ t: t, paye: !!r.paye, motif: String(r.motif || '') });
      }
      return sortie;
    },
  });
  etatConservation = { actif: true };
  console.log('conservation : horloge montée (' + conservation.sante().suivis + ' suivie(s))');
} catch (e) {
  console.error('conservation NON montée —', e && e.message);
  conservation = null;
  etatConservation = { actif: false, erreur: 'montage' };
}
const REFUS_INTOUCHABLE = 'Cet identifiant n\'est pas une entreprise : c\'est l\'espace par défaut de l\'application. '
  + 'Tout appareil qui n\'a rejoint aucun espace y signale ses connexions, et ses données sont partagées par toutes '
  + 'les entreprises qui n\'ont jamais reçu de clé personnalisée. Le supprimer les effacerait toutes à la fois.';

/* L'aperçu : ce qui va disparaître, sans que rien ne disparaisse. Le patron doit voir
   l'ampleur AVANT de taper le nom, pas après — et pouvoir relancer l'aperçu ensuite pour
   vérifier que tout est à zéro. */
app.post('/api/monitor/entreprise/apercu-suppression', monPatronStrict, (req, res) => {
  const t = monStr((req.body || {}).t, 80).trim();
  if (!t) return res.status(400).json({ error: 'identifiant d\'espace manquant' });
  if (ESPACES_INTOUCHABLES.includes(t)) return res.status(403).json({ error: REFUS_INTOUCHABLE });
  const inv = entInventaire(t);
  delete inv._boites; delete inv._abos;
  /* Un espace qui porte des comptes de connexion, un code d'accès ou de l'usage a
     forcément été un vrai espace : on le dit, pour qu'un ménage d'essais ne devienne pas
     la suppression d'un client dont on a perdu le nom. */
  inv.aVecu = !!(inv.comptesAnnuaire || inv.codeAcces || inv.ecransOuverts || inv.comptesSite);
  res.json({ ok: true, apercu: inv });
});

app.post('/api/monitor/entreprise/supprimer', monPatronStrict, async (req, res) => {
  const t0 = Date.now();
  const t = monStr((req.body || {}).t, 80).trim();
  if (!t) return res.status(400).json({ error: 'identifiant d\'espace manquant' });
  if (ESPACES_INTOUCHABLES.includes(t)) return res.status(403).json({ error: REFUS_INTOUCHABLE });

  const codeRecu = monStr((req.body || {}).code, 10).trim();
  let confirme = (req.body || {}).confirme === true;   // question + case + « Oui » dans la Tour — voir `SUPPRIMER SANS CODE`
  if (!supprMailPret()) return res.status(503).json({ error: confirme ? SUPPR_PAS_DE_MAIL : 'e-mail non configuré — impossible d\'envoyer le code' });
  if (!(await supprRattraper())) return res.status(503).json({ error: SUPPR_AVIS_BLOQUE });   // un avis d'avant n'est pas parti : il part d'abord
  const inv = entInventaire(t);   // relu APRÈS l'attente : c'est ce qui va vraiment disparaître
  const etiquette = uneLigne(inv.nom, 80) || t;
  const limite = supprEntLimite(1);   // la 4e entreprise en 24 heures : le code revient (`APRÈS CHAQUE SUPPRESSION`)
  if (limite && supprDestLisible()) return res.status(409).json({ error: supprLisibleTxt(1), limite: true, lisible: true });
  if (limite) confirme = false;
  if (!codeRecu && !confirme) {   // 1er temps : le code part par e-mail, comme pour une fermeture (la Tour d'avant la v2.69)
    const code = String(crypto.randomInt(100000, 1000000));   // `crypto` : au-delà de trois entreprises, ce code est le verrou d'une session volée
    /* Indexé par teamId, PAS par e-mail : deux espaces sans adresse se marcheraient dessus,
       et c'est justement le cas des espaces hors annuaire qu'on cherche à nettoyer. */
    retraitCodes.set('t:' + t, { code, exp: Date.now() + 10 * 60000, tries: 0 });
    const dest = supprDest();
    const detail = [
      inv.dansAnnuaire ? inv.slugs.length + ' entrée(s) d\'annuaire' : 'aucune entrée d\'annuaire',
      inv.comptesAnnuaire + ' compte(s) de connexion',
      (inv.copiesSauvegarde || 0) + ' copie(s) de sauvegarde chiffrée(s)',
      inv.boites + ' boîte(s) mail reliée(s)',
      inv.abonnesPush + ' appareil(s) abonné(s) aux notifications',
      inv.connexions + ' connexion(s) enregistrée(s)',
      inv.erreurs + ' erreur(s)',
      inv.ecransOuverts + ' écran(s) ouvert(s)',
      inv.comptesSite + ' compte(s) du site',
      inv.mailsEnvoyes + ' e-mail(s) envoyé(s) archivé(s)',
      inv.mailsRecus + ' e-mail(s) reçu(s) archivé(s)',
      inv.mailsEcrits + ' e-mail(s) écrit(s) au client, archivé(s)'
    ].join('\n· ')
    + ((inv.partagees || []).length
        ? '\n\nCE QUI RESTE, ET C\'EST VOLONTAIRE : ' + inv.partagees.join(', ')
          + ' — cette adresse est ENCORE la boîte d\'un autre espace. Ses archives de courrier ne\n'
          + 'sont donc pas effacées : elles appartiennent aussi à cet espace-là, qui vit toujours.'
        : '')
    + ((inv.comptesSiteHorsAnnuaire || []).length
        ? '\n\nUn compte du site existe sous ' + inv.comptesSiteHorsAnnuaire.map(masqueMail).join(', ')
          + ', hors annuaire de cet espace. Il n\'est PAS fermé — on ne ferme pas un compte dont\n'
          + 'on ne peut pas prouver l\'appartenance. À faire à part, depuis la fiche du client.'
        : '')
    + (inv.opMessages
        /* Décision de Justin, à ne pas réécrire : OP MESSAGES est encore en développement,
           on ne la supprime pas. Elle est simplement SÉPARÉE d'OP GESTION. La version qui
           disait « à supprimer à part » invitait au contraire. */
        ? '\n\nOP MESSAGES N\'EST PAS TOUCHÉ, ET C\'EST VOULU : l\'application est encore en '
          + 'développement et ne doit pas être supprimée. Ses conversations, ses salons et ses pièces '
          + 'jointes vivent dans un espace séparé d\'OP GESTION et y restent.'
        : '');
    try {
      await mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: dest,
        confidentiel: true, trace: 'code de suppression totale · espace ' + t,
        subject: '🗑 Code de confirmation — suppression totale de « ' + etiquette + ' »',
        text: 'Tu es sur le point de SUPPRIMER TOTALEMENT l\'espace « ' + etiquette + ' » (' + t + ').\n\n'
          + (limite ? supprLimiteTxt(1) : '')
          + 'Ce qui va être effacé :\n· ' + detail + '\n\n'
          + 'Code de confirmation : ' + code + '\n\nValable 10 minutes.\n\n'
          + 'Après validation, rien n\'est récupérable : les données chiffrées sont détruites côté Firestore, '
          + 'et les applications des appareils se vident à leur prochain lancement.\nSi ce n\'est pas toi, ignore ce message.' });
    } catch (e) { return res.status(500).json({ error: 'envoi du code impossible : ' + sansAdresses(String(e.message)).slice(0, 120) }); }
    console.log('Tour : code de suppression totale envoyé pour', t, '→', masqueMail(adrNue(dest)), limite ? '(limite de 24 h atteinte)' : '');
    /* Masqué comme dans le journal juste au-dessus : la Tour n'a besoin que de reconnaître
       la boîte, pas de l'afficher en entier. */
    return res.json(Object.assign({ ok: true, codeEnvoye: true, dest: masqueMail(adrNue(dest)), apercu: (delete inv._boites, delete inv._abos, inv) }, limite ? { limite: true, pourquoi: supprLimiteRaison(1) } : {}));
  }

  if (!confirme) {   // 2e temps : le code revient
    const c = retraitCodes.get('t:' + t);
    if (!c || Date.now() > c.exp) { retraitCodes.delete('t:' + t); return res.status(400).json({ error: 'code expiré — recommence' }); }
    c.tries++; if (c.tries > 5) { retraitCodes.delete('t:' + t); return res.status(429).json({ error: 'trop d\'essais — recommence' }); }
    if (codeRecu !== c.code) return res.status(400).json({ error: 'code incorrect (' + (6 - c.tries) + ' essai(s) restants)' });
  }
  retraitCodes.delete('t:' + t);

  const fait = {};

  // ── 1. LE BLOCAGE D'ABORD. Sans lui, le premier appareil qui rouvre repousse toute sa
  //       base chiffrée et défait tout ce qui suit. Voir app.html vers la ligne 5131.
  if (!entFermes.espaces.includes(t)) entFermes.espaces.push(t);
  /* ⛔ SUPPRIMER RETIRE LA SUSPENSION — même raison que la fermeture d'un client : sinon
     l'entreprise supprimée restait « suspendue », donc ouverte (voir `espaceEstSuspendu`). */
  entFermes.suspendus = (entFermes.suspendus || []).filter(x => x !== t); delete (entFermes.suspendusLe || {})[t];
  for (const m of inv.emails) if (!entFermes.emails.includes(m)) entFermes.emails.push(m);
  const fermesOk = fermesSave();
  if (!fermesOk) return res.status(500).json({ error: 'Le blocage de l\'espace n\'a pas pu être enregistré — RIEN n\'a été supprimé. Vérifie le serveur (disque plein ?) avant de recommencer.' });
  const rang = supprEntCompter(1);   // le blocage est écrit : la suppression a commencé, elle compte
  fait.bloque = true;
  /* Le blocage dit « n'écris plus » à une application qui veut bien demander. La coupure, elle,
     retire le droit d'écrire à un appareil qui ne redemande rien — c'est ce qui empêche la base
     chiffrée de revenir après tout ce qu'on efface en dessous. Elle se dit aussi : `fait` est
     recopié tel quel dans la réponse, donc dans ce que la Tour affiche. */
  { const c = await fbRevoquerEquipe(t); const cs = socleCouper(t, 'suppression'); const ef = socleEffacer(t);
    fait.coupure = c.fait && cs.fait && ef.ok;
    fait.coupureMotif = [c.motif, cs.fait ? null : cs.motif, ef.ok ? null : ef.motif].filter(Boolean).join(' — '); }

  // ── 2. LES BOÎTES MAIL. releveBoite() les relit toutes les 120 s : tant qu'elles sont là,
  //       le serveur se reconnecte et réécrit dans replies.jsonl ce qu'on va en retirer.
  //       Elles portent aussi les mots de passe IMAP/SMTP en clair.
  for (const id of inv._boites) delete mailboxes[id];
  /* saveMailboxes() avale son erreur. Or c'est le fichier qui porte les mots de passe
     IMAP/SMTP EN CLAIR : répondre « supprimé » alors qu'ils sont encore sur le disque est
     exactement ce qu'il ne faut pas faire. On relit pour en être sûr. */
  let ecrit = true;
  if (inv._boites.length) {
    saveMailboxes();
    try { const relu = JSON.parse(fs.readFileSync(MAILBOX_PATH, 'utf8'));
      if (Object.values(relu).some(b => b && b.teamId === t)) ecrit = false;
    } catch (e) { ecrit = false; }
    if (!ecrit) console.error('suppression : mailboxes.json non écrit — mots de passe encore présents pour', t);
  }
  fait.boites = inv._boites.length;

  // ── 3. Les abonnements aux notifications : ils portent le NOM des salariés, et sans ça
  //       le serveur continue de pousser sur les téléphones d'une entreprise supprimée.
  for (const ep of inv._abos) delete subs[ep];
  if (inv._abos.length) saveSubs();
  fait.abonnesPush = inv._abos.length;

  // ── 4. Les registres indexés par teamId.
  if (accesReg[t]) { delete accesReg[t]; if (!accesEcrire()) ecrit = false; }
  fait.codeAcces = !!inv.codeAcces;
  if (comptesReg[t]) { delete comptesReg[t]; if (!comptesEcrire()) ecrit = false; }
  fait.comptesAnnuaire = inv.comptesAnnuaire;
  if (usageData[t]) { delete usageData[t]; usageSave(); }
  try { fs.rmSync(sauvDossier(t), { recursive: true, force: true }); } catch (e) { ecrit = false; console.error('suppression : copies de sauvegarde non effacées :', e.message); }   // « plus rien n'est enregistré nulle part » doit rester vrai
  /* ⛔ ET LES PIÈCES JOINTES AVEC. Ajoutées le 16 septembre 2026 : tout stockage neuf doit
     être effacé partout où les données de l'entreprise le sont, sinon on crée un orphelin de
     plus — des photos de sites de clients qui survivent à la suppression de leur entreprise.
     `effacerEntreprise` rend un NOMBRE, jamais `true` : 0 veut dire « rien trouvé », ce qui
     est une information, là où `true` aurait menti. */
  if (pieces) { try { fait.piecesJointes = pieces.effacerEntreprise(t); } catch (e) { ecrit = false; console.error('suppression : pièces jointes non effacées :', e.message); } }
  if (ordresData[t]) { delete ordresData[t]; ordresSave(); }
  fait.ecransOuverts = inv.ecransOuverts;
  if (cnxData[t]) { delete cnxData[t]; cnxSave(); }
  fait.connexions = inv.connexions;
  if (devisAcces[t]) { delete devisAcces[t]; saveDevisAcces(); }
  fait.devisIA = !!inv.devisIA;
  if (inv.promos.length) promoEffacerEntreprise(t, inv.slugs, inv.emails);
  fait.promos = inv.promos.length;

  // ── 5. L'annuaire EN DERNIER parmi les registres : il est le seul à relier nom, slug,
  //       teamId, e-mail et clé d'équipe. TOUS les slugs qui portent ce t, pas seulement
  //       celui qu'on connaît — un espace renommé en laisse plusieurs, chacun contenant la
  //       clé d'équipe en clair dans son code base64.
  for (const slug of inv.slugs) delete espacesReg[slug];
  /* espacesEcrire() et pas writeFileSync : le commentaire de cette fonction dit pourquoi —
     espaces.json porte le « k » de TOUS les clients, une écriture tronquée les perd tous
     d'un coup. Écrire à côté puis renommer est la seule façon de ne pas transformer une
     suppression ratée en panne générale. */
  if (inv.slugs.length && !espacesEcrire()) ecrit = false;
  fait.entreesAnnuaire = inv.slugs.length;

  /* usageSave(), cnxSave() et saveSubs() écrivent 300 à 800 ms plus tard. Sur un espace
     sans adresse — le cas exact pour lequel cette route existe — la suite ne prend pas
     forcément ce temps-là, et un redémarrage dans cette fenêtre rechargerait usage.json et
     connexions.json AVEC l'espace supprimé dedans, identifiants des salariés compris.
     On force donc l'écriture tout de suite. */
  try { fs.writeFileSync(USAGE_PATH, JSON.stringify(usageData)); } catch (e) { ecrit = false; console.error('suppression : usage.json non écrit :', e.message); }
  try { fs.writeFileSync(CNX_PATH, JSON.stringify(cnxData)); } catch (e) { ecrit = false; console.error('suppression : connexions.json non écrit :', e.message); }
  try { fs.writeFileSync(SUBS_PATH, JSON.stringify(subs)); } catch (e) { ecrit = false; console.error('suppression : subscriptions.json non écrit :', e.message); }

  // ── 6. Les journaux : réécrits sans les lignes de cet espace. Faits après les boîtes,
  //       sinon la relève en réécrit pendant qu'on nettoie.
  /* Rend le nombre de lignes retirées, ou NULL si la purge a échoué. La distinction n'est
     pas cosmétique : sans elle, un fichier trop gros pour être lu d'un coup renvoyait 0, et
     « 0 erreur retirée » se lit comme « il n'y en avait pas » alors que la purge n'a pas eu
     lieu du tout. Un échec doit se voir. */
  const purgeJournal = (chemin, garde) => {
    let n = 0;
    try {
      if (!fs.existsSync(chemin)) return 0;
      const lignes = fs.readFileSync(chemin, 'utf8').split('\n');
      const restant = lignes.filter(l => { if (!l.trim()) return false; try { if (!garde(JSON.parse(l))) { n++; return false; } } catch (err) {} return true; });
      /* tmp + rename : un journal de plusieurs mégaoctets réécrit en place peut être tronqué
         par une coupure au mauvais moment, et il n'y a pas de seconde copie. */
      fs.writeFileSync(chemin + '.tmp', restant.length ? restant.join('\n') + '\n' : '');
      fs.renameSync(chemin + '.tmp', chemin);
    } catch (e) { console.error('purge', chemin, ':', e.message); return null; }
    return n;
  };
  fait.erreurs = purgeJournal(BUGS_PATH, b => !(b && b.team === t));
  fait.reponsesMail = purgeJournal(REPLIES_PATH, r => !(r && r.teamId === t));
  fait.bonsEnvoyes = purgeJournal(SENTMAP_PATH, x => !(x && x.teamId === t));
  /* Le même carnet vit AUSSI en mémoire : le purger sur disque sans le purger ici le
     laisserait servir jusqu'au prochain redémarrage. */
  try { sentMap = sentMap.filter(x => !(x && x.teamId === t)); } catch (e) {}
  /* Les DEUX archives de courrier. Elles échappaient à la suppression : après un ménage
     annoncé « rien n'est récupérable », un utilisateur Tour NON PATRON (GET /api/monitor/mails
     est en monAdmin, un cran sous le monPatronStrict qui a autorisé la suppression) lisait
     encore l'adresse complète et 2 000 caractères de correspondance de l'entreprise effacée.
     Ce n'est pas une fuite vers Internet : c'est un effacement incomplet, et l'e-mail envoyé
     au patron promet l'inverse. Les deux carnets vivent en mémoire ET sur disque. */
  /* L'annuaire ET la boîte reliée, MOINS les adresses qu'une autre équipe utilise encore
     (voir entInventaire) : ces dernières sont écartées de la purge et annoncées à part.
     LIMITE QUI RESTE : un espace hors annuaire ET sans boîte reliée ne laisse aucune adresse
     à filtrer — l'aperçu annonce alors honnêtement 0. Les réponses de clients, purgées par
     teamId, partent quand même. */
  const adrSuppr = new Set((inv.adressesCourrier || inv.emails).map(m => String(m).toLowerCase()));
  const avantMails = mailsLog.length;
  mailsLog = mailsLog.filter(m => !adrSuppr.has(String((m && m.a) || '').toLowerCase()));
  fait.mailsEnvoyes = avantMails - mailsLog.length;
  /* Écriture FORCÉE et synchrone, comme les trois voisines juste au-dessus : supSave() est
     débouncée de 400 ms, donc son écriture partirait APRÈS la réponse HTTP et un échec serait
     hors de portée. Et mailsSave() rend désormais un booléen : un disque plein doit faire
     tomber ecrit, pas passer pour un succès. */
  if (!mailsSave()) ecrit = false;
  const avantRecus = supportMails.length;
  supportMails = supportMails.filter(m => !adrSuppr.has(String((m && m.from) || '').toLowerCase()));
  fait.mailsRecus = avantRecus - supportMails.length;
  try { fs.writeFileSync(SUPPORT_MAILS_PATH, JSON.stringify(supportMails)); } catch (e) { ecrit = false; console.error('suppression : support-mails.json non écrit :', e.message); }
  /* La TROISIÈME archive : ce que la Tour a écrit AU client. Même défaut, même niveau
     d'accès (GET /api/monitor/support/envoyes est en monAdmin), même promesse trahie. */
  const avantEcrits = supportEnvoyes.length;
  supportEnvoyes = supportEnvoyes.filter(m => !adrSuppr.has(String((m && m.to) || '').toLowerCase()));
  fait.mailsEcrits = avantEcrits - supportEnvoyes.length;
  try { fs.writeFileSync(SUPPORT_ENVOYES_PATH, JSON.stringify(supportEnvoyes)); } catch (e) { ecrit = false; console.error('suppression : support-envoyes.json non écrit :', e.message); }

  // ── 7. Les comptes du site, chez Firebase.
  fait.comptesSite = [];
  for (const m of inv.emails) {
    if (clientsData[m]) { delete clientsData[m]; cliSave(); }
    const r = await compteSiteSupprimer(m);
    fait.comptesSite.push({ email: masqueMail(m), motif: r.motif });
  }

  // ── 8. Les données chiffrées, chez Firestore. En dernier : c'est la seule opération qui
  //       peut échouer pour une raison extérieure (réseau, jeton), et tout le reste doit
  //       déjà être fait pour qu'un échec ici ne laisse pas un demi-ménage.
  const FB_CLE = (config.firebase && config.firebase.apiKey) || 'AIzaSyAbah03sO4f4LyNhvmig0Pn00lz1sHSpT8';
  let jeton = await fbAdminJeton(); const jetonAdmin = !!jeton;
  if (!jeton) try {
    const r = await fetch(IDTK_URL + '/accounts:signUp?key=' + FB_CLE,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' });
    const j = await r.json().catch(() => ({}));
    jeton = j.idToken || '';
  } catch (e) { console.error('suppression firestore jeton :', e.message); }
  fait.donneesEffacees = false;
  try {
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(FIRESTORE_URL + '/projects/' + FB_PROJET + '/databases/(default)/documents/elan_teams/' + encodeURIComponent(t) + '?key=' + FB_CLE,
      { method: 'DELETE', headers: jeton ? { 'Authorization': 'Bearer ' + jeton } : {}, signal: ctrl.signal });
    clearTimeout(tm);
    fait.donneesEffacees = r.ok;
    if (!r.ok) console.error('suppression firestore', t, ': HTTP', r.status);
  } catch (e) { console.error('suppression firestore', t, ':', e.message); }
  /* Le document rangé chez nous (`documents.js`) : effacé sans condition, et DIT — la Tour
     affiche ce que la suppression a vraiment fait, pas ce qu'on croit qu'elle a fait. */
  fait.documentEfface = false;
  if (documentsMod) { try { fait.documentEfface = await documentsMod.effacer(t); } catch (e) {} }
  if (jeton && !jetonAdmin) { try { await fetch(IDTK_URL + '/accounts:delete?key=' + FB_CLE,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: jeton }) }); } catch (e) {} }

  monLog(req.tourUser.nom || 'patron', true, req, 'suppression totale d\'un espace · ' + (confirme ? 'confirmée' : 'par code'));
  console.log('Tour :', req.tourUser.nom, 'a SUPPRIMÉ TOTALEMENT l\'espace', t, confirme ? '(confirmée)' : '(par code)',
    '— annuaire', fait.entreesAnnuaire, '· boîtes', fait.boites, '· push', fait.abonnesPush,
    '· connexions', fait.connexions, '· erreurs', fait.erreurs, '· Firestore', fait.donneesEffacees ? 'effacé' : 'ÉCHEC');

  /* Le reste est parti, mais on ne dit pas « tout est propre » si une écriture a échoué :
     un ménage à moitié fait qu'on croit terminé est pire qu'un ménage annoncé incomplet. */
  /* Une purge qui rend null a ÉCHOUÉ — ce n'est pas la même chose que « rien à purger ».
     Sans cette distinction, un journal trop gros pour être lu d'un coup faisait répondre
     « tout est propre ». */
  const purgeRatee = fait.erreurs === null || fait.reponsesMail === null || fait.bonsEnvoyes === null;
  if (purgeRatee) ecrit = false;
  /* ⛔ UNE COUPURE RATÉE EST UN AVERTISSEMENT, PAS UN DÉTAIL. Si les sessions Firebase n'ont
     pas pu être révoquées, les appareils déjà pourvus gardent l'accès aux données — et
     peuvent REPOUSSER la base qu'on vient d'effacer. Dire « supprimée partout » là-dessus
     serait faux. On passe par `avertissement` plutôt que par un champ neuf : c'est le seul
     canal que la Tour affiche déjà, donc le seul qui atteigne vraiment Justin. */
  const ennuis = [];
  if (!(ecrit && fait.donneesEffacees)) ennuis.push('Une partie n\'a pas pu être écrite ou effacée — relance l\'aperçu de suppression pour voir ce qu\'il reste.');
  if (!fait.coupure) ennuis.push('Les sessions Firebase n\'ont pas pu être coupées (' + (fait.coupureMotif || 'raison inconnue') + ') : les appareils déjà connectés gardent l\'accès et peuvent repousser la base effacée.');
  const avis = await supprAvis(req, { t0, confirme, rang, trace: 'suppression totale d\'un espace · ' + (confirme ? 'confirmée' : 'par code'),
    sujet: '🗑 Tour — « ' + etiquette + ' » supprimée partout',
    quoi: 'l\'espace « ' + etiquette + ' » (' + t + ') — supprimé partout : annuaire, comptes de connexion, archives, données chiffrées.',
    attention: ennuis.join(' ') });
  res.json({ ok: true, supprime: true, t, nom: inv.nom, fait, ecrit,
    avertissement: ennuis.join(' · '), avis });
});

// liste des problèmes + compteurs (admin)
app.get('/api/monitor/issues', monAdmin, (req, res) => {
  monPurge();
  /* Filtré par application AVANT tout calcul : compteurs et entreprises se comptent sur ce que le
     compte a le droit de voir — sinon un compte OP MESSAGES apprendrait combien d'incidents
     OP GESTION existent, et chez qui. Forger la requête n'y change rien : le filtre est ici. */
  const vis = monIssues.filter(i => req.tourUser.apps.includes(monAppDeTag(i.app)));
  const compteurs = { nouveau: 0, encours: 0, corrige: 0, ignore: 0 };
  const entSet = new Set();
  for (const i of vis) { compteurs[i.statut] = (compteurs[i.statut] || 0) + 1; for (const e of i.entreprises || []) if (e.nom && e.nom !== 'inconnue') entSet.add(e.nom); }
  res.json({ issues: vis.slice().sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0)), compteurs, entreprises: entSet.size });
});

/* ══ TOUT REMETTRE À ZÉRO SUR SURVEILLANCE — 14 septembre 2026, demandé par Justin ═════════
   L'écran affichait 18 nouveaux répartis sur quatre espaces, dont 215 faux rejets de
   transition de vue corrigés le jour même (v670). Les classer un par un n'a aucun sens, et un
   écran qu'on n'arrive plus à vider finit par ne plus être ouvert.

   ⛔ « IGNORÉ », JAMAIS « CORRIGÉ », ET CE N'EST PAS UN DÉTAIL : passer un problème en
   « corrigé » ENVOIE UN COURRIEL aux entreprises touchées (voir juste en dessous). Un « tout à
   zéro » sur 18 problèmes enverrait 18 courriels à des clients qui n'ont rien demandé, pour
   des incidents dont la plupart n'étaient pas des pannes. « Ignoré » n'envoie rien — c'est
   exactement ce qu'on veut dire : on a regardé, on passe.

   ⛔ ET ON N'EFFACE RIEN : les problèmes changent de statut, ils restent consultables et leur
   historique garde qui a fait le geste et quand. Un problème qui se reproduit revient en
   « nouveau » de lui-même, il n'est pas masqué pour toujours.
   Réservé au patron, comme « Ignorer » à l'unité. */
app.post('/api/monitor/issues/tout-ignorer', monPatronStrict, (req, res) => {
  const note = monStr((req.body || {}).note, 300);
  const cibles = monIssues.filter(i => (i.statut === 'nouveau' || i.statut === 'encours')
    && req.tourUser.apps.includes(monAppDeTag(i.app)));
  if (!cibles.length) return res.json({ ok: true, classes: 0 });
  const quand = Date.now();
  for (const i of cibles) {
    i.statut = 'ignore';
    i.par = req.tourUser.nom;
    i.historique = (i.historique || []).concat([{ ts: quand, par: req.tourUser.nom,
      action: 'Ignoré (remise à zéro de l\'écran)', note }]).slice(-30);
  }
  /* ⚠️ monSave() est DIFFÉRÉE (setTimeout) et ne rend rien : tester sa valeur de retour
     répondrait 500 à tous les coups alors que tout s'est bien passé. Les autres appelants ne
     la testent pas non plus — c'est le contrat de cette fonction, pas un oubli. */
  monSave();
  console.log('Tour :', req.tourUser.nom, 'remet Surveillance à zéro :', cibles.length, 'problème(s) ignoré(s)');
  res.json({ ok: true, classes: cibles.length });
});
// changement de statut (admin) — « corrige » déclenche l'e-mail automatique aux entreprises touchées
app.post('/api/monitor/status', monAdmin, async (req, res) => {
  const { id, statut, note } = req.body || {};
  if (!['nouveau', 'encours', 'corrige', 'ignore'].includes(statut)) return res.status(400).json({ error: 'statut invalide' });
  if (statut === 'ignore' && req.tourUser.role !== 'patron') return res.status(403).json({ error: '« Ignorer » est réservé au patron' });
  const issue = monIssues.find(i => i.id === id);
  if (!issue) return res.status(404).json({ error: 'problème introuvable' });
  if (monIssueRefuse(req, res, issue)) return;
  issue.statut = statut;
  issue.par = req.tourUser.nom;   // qui a agi en dernier (affiché « En cours — Karim »)
  if (note) issue.notes = ((issue.notes ? issue.notes + '\n' : '') + monStr(note, 300)).slice(-1000);
  const ACTION = { nouveau: 'Remis en « nouveau »', encours: 'Prise en charge', corrige: 'Marqué corrigé', ignore: 'Ignoré' };
  issue.historique = (issue.historique || []).concat([{ ts: Date.now(), par: req.tourUser.nom, action: ACTION[statut], note: monStr(note, 300) }]).slice(-30);
  let mails = 0, mailsSimules = 0;
  if (statut === 'corrige' && !issue.mailEnvoye) {
    const dests = (issue.entreprises || []).filter(e => e.email);
    const sujet = 'Votre application a été améliorée ✅';
    /* ⛔ ON NE NOMME PLUS L'ÉCRAN DANS CE COURRIEL. `issue.categorie` n'est pas l'endroit d'où
       vient l'erreur : c'est l'écran qui se trouvait OUVERT quand elle est survenue. Une
       promesse rejetée par un travail de fond tombe sous n'importe lequel. Le 15 septembre
       2026, un rejet d'IndexedDB était rangé sous « Plans » — et ce courriel aurait annoncé à
       un client qu'on avait réparé quelque chose sur Plans, où il n'y avait rien de cassé.
       Deux dégâts : c'est faux, et ça fait douter d'un écran qui marche.
       Ne rien nommer vaut mieux que nommer au hasard : le client n'a de toute façon rien à
       faire de cette information, il a besoin de savoir que c'est réglé. */
    const texte = 'Bonjour,\n\nNotre système de surveillance a détecté puis corrigé un dysfonctionnement mineur sur votre application. Elle est déjà à jour — vous n\'avez rien à faire.\n\n— L\'équipe TEAM OP';
    for (const d of dests) {
      if (mailer) {
        try { await mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: d.email, subject: sujet, text: texte }); mails++; }
        catch (e) { console.error('monitor mail', masqueMail(d.email) + ':', e.message); }
      } else { mailsSimules++; console.log('monitor mail (simulé, smtp non configuré) →', masqueMail(d.email), '·', sujet); }
    }
    issue.mailEnvoye = true;
  }
  monSave();
  res.json({ ok: true, issue, mails, mailsSimules });
});


/* ══════════ LE CONTEXTE D'UN INCIDENT — qui était là, par quelle porte, sur quoi ══════════
   Demandé par Justin le 13 septembre 2026 : « je veux voir pourquoi, qui, le lien qu'il a
   utilisé pour se connecter, l'appareil, le navigateur et la version — en gros pour aller
   plus vite à régler les problèmes ».

   ⛔ RIEN DE NOUVEAU N'EST COLLECTÉ, ET C'EST LE POINT QUI DÉCIDE DE TOUT. L'application
   n'envoie avec une erreur que { teamId, app, version, msg, src, line, stack, ua } — son
   commentaire le dit : « anonyme : aucune donnée métier ». Ajouter l'identité à ce flux
   aurait voulu dire toucher app.html, donc une publication en production. Or tout est DÉJÀ
   là, dans le journal des connexions (cnxData), écrit par la même application depuis des
   mois : login, nom, rôle, via, appareil, os, navigateur, PWA, version. Cette route ne fait
   que RAPPROCHER deux choses que la console tenait côte à côte sans jamais les relier.

   ⚠️ LA RÈGLE DE RAPPROCHEMENT, ET POURQUOI CE N'EST PAS UNE FENÊTRE SYMÉTRIQUE. Une
   connexion ne s'enregistre qu'à l'ENTRÉE (connexion, reprise de session) et à la sortie —
   pas à chaque page. Chercher « ce qui s'est passé à ±15 minutes » ne trouverait donc
   presque jamais rien : quelqu'un entré le matin plante à 16 h. On prend la DERNIÈRE session
   ouverte avant l'erreur, et on rend l'écart — « connecté 3 h avant » n'est pas « connecté
   à l'instant », et l'écran doit pouvoir le dire plutôt que de laisser croire à une
   précision qu'on n'a pas.

   On rend aussi les échecs et blocages survenus dans l'heure QUI SUIT : une erreur suivie de
   trois échecs de connexion, c'est un enchaînement, pas deux faits séparés. */
app.get('/api/monitor/issues/contexte', monAdmin, (req, res) => {
  monPurge();   // le contexte ne se calcule pas sur un incident que la liste aurait déjà purgé
  const issue = monIssues.find(i => i.id === String(req.query.id || ''));
  if (!issue) return res.status(404).json({ error: 'problème introuvable' });
  if (monIssueRefuse(req, res, issue)) return;

  const APRES = 3600000;   // une heure après l'erreur : de quoi voir l'enchaînement, pas la journée
  const SESSION = ['connexion', 'session'];
  const MAX_ENT = 12, MAX_SUITE = 5;
  /* ⛔ LE JOURNAL DES CONNEXIONS EST CLOISONNÉ PAR APPLICATION, COMME LE RESTE.
     Un événement de cnxData porte son app (« gestion », « messages »). Sans ce filtre, un
     compte OP MESSAGES ouvrant le contexte d'un incident MESSAGES recevrait les sessions
     OP GESTION des salariés de l'entreprise — exactement ce que /api/monitor/issues se donne
     du mal à empêcher. Le cloisonnement ne peut pas tenir uniquement sur la table de routage :
     il tient ici, sur la donnée. */
  const appIssue = monAppDeTag(issue.app);
  const memeApp = x => (x.app || 'gestion') === appIssue;
  /* Comparer deux noms d'entreprise à l'octet près rate « ELAN » contre « elan » et renvoie
     « pas de journal » pour une entreprise qui en a un. Le slug est déjà la forme normalisée
     que le reste du serveur emploie. */
  const cle = n => espSlug(String(n || ''));
  const sortie = [];

  for (const ent of (issue.entreprises || []).slice(0, MAX_ENT)) {
    /* Un incident porte le NOM de l'entreprise ; le journal des connexions est rangé par
       identifiant technique. Sans ce pont, le rapprochement ne se fait jamais. */
    let t = '';
    const veut = cle(ent.nom);
    for (const [slug, e] of Object.entries(espacesReg)) {
      if (cle(e.nom || slug) !== veut) continue;
      t = e.t || '';
      if (!t) { try { t = String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t || ''); } catch (err) {} }
      if (t) break;
    }
    const quand = ent.lastTs || 0;
    /* ⛔ TROIS CAUSES DE « RIEN », ET ELLES NE SE DISENT PAS PAREIL À L'ÉCRAN :
       · inconnue  — le nom de l'incident ne correspond à aucune entreprise de l'annuaire ;
       · sansJournal — elle y est, mais aucune connexion n'a jamais été enregistrée ;
       · sansDate  — l'incident n'a pas d'horodatage : on ne peut RIEN chercher. */
    if (!t) { sortie.push({ ent: ent.nom, quand, inconnue: true, session: null, suite: [], suiteTotal: 0 }); continue; }
    if (!cnxData[t]) { sortie.push({ ent: ent.nom, quand, t, sansJournal: true, session: null, suite: [], suiteTotal: 0 }); continue; }
    if (!quand) { sortie.push({ ent: ent.nom, quand: 0, t, sansDate: true, session: null, suite: [], suiteTotal: 0 }); continue; }

    const l = cnxData[t].filter(memeApp);
    const pub = x => ({ ts: x.ts, ev: x.ev, login: x.login || '', nom: x.nom || '', role: x.role || '',
      via: x.via || '', appareil: x.appareil || '', os: x.os || '', nav: x.nav || '', pwa: !!x.pwa,
      version: x.version || '', motif: x.motif || '' });

    /* cnxData est rangé du plus récent au plus ancien (unshift) : le premier qui passe sous
       la date de l'erreur est le bon. */
    const s0 = l.find(x => SESSION.includes(x.ev) && (x.ts || 0) <= quand);
    /* ⛔ « AUCUNE SESSION » NE SE DÉDUIT PAS D'UN JOURNAL PLEIN. cnxData est plafonné à 500
       entrées par entreprise : chez une cliente active, une erreur de trois jours est déjà
       sortie du journal, et `find` rend undefined. Dire « personne n'était connecté » serait
       alors un mensonge — la vraie réponse est « le journal ne remonte pas jusque-là ».
       C'est la faute déjà payée le 11 septembre (« jamais connecté » déduit d'un journal
       plafonné, corrigé une heure après publication) ; on ne la refait pas. */
    const plein = cnxData[t].length >= 500;
    const plusVieux = cnxData[t].length ? (cnxData[t][cnxData[t].length - 1].ts || 0) : 0;
    const horsJournal = !s0 && plein && plusVieux > quand;

    const apres = l.filter(x => ['echec', 'bloque', 'refus'].includes(x.ev) && (x.ts || 0) > quand && (x.ts || 0) <= quand + APRES);

    sortie.push({ ent: ent.nom, quand, t,
      session: s0 ? Object.assign(pub(s0), { avantMs: quand - (s0.ts || 0) }) : null,
      horsJournal,
      suite: apres.slice(0, MAX_SUITE).map(pub), suiteTotal: apres.length });
  }
  /* ⛔ UNE TRONCATURE MUETTE SE LIT COMME UN TOTAL. issue.entreprises va jusqu'à 60 : en
     n'en rendant que 12 sans le dire, l'écran annonçait « douze entreprises touchées » là où
     il y en avait soixante. Le total voyage avec la tranche. */
  res.json({ ok: true, id: issue.id, apresMin: APRES / 60000,
    entreprises: sortie, total: (issue.entreprises || []).length, rendues: sortie.length });
});

/* ══════════ EXPLIQUE — d'un incident à sa cause, en français ══════════
   Un incident dit CE QUI a cassé. Il ne dit pas pourquoi, et c'est tout le travail :
   « Interface figée », « Cannot read properties of undefined » — il faut ensuite ouvrir
   le fichier, trouver la ligne, comprendre. Cette route fait ce chemin-là.

   Deux règles la tiennent :
     • L'extrait de code vient du DÉPÔT, lu ici, jamais du modèle. On lui donne le code
       à lire ; il ne l'invente pas. Quand la trace ne désigne aucun fichier du dépôt,
       la route le dit au lieu de fabriquer un emplacement plausible.
     • Elle n'écrit rien dans l'application. Elle pose une explication à côté de
       l'incident, dans la console — et cette explication est datée, signée du
       collaborateur qui l'a demandée, et relisible. Une explication qu'on ne peut pas
       relire est une explication à laquelle on ne peut pas se fier. */
const DEPOT = path.resolve(__dirname, '..');
/* Le fichier désigné par une trace de sentinelle : un seul nom, à la racine du dépôt,
   et rien d'autre — pas de chemin, pas de remontée, pas d'autre extension. */
function monSource(src, ligne) {
  const n = parseInt(ligne, 10) || 0;
  let f = String(src || '').trim();
  try { if (/^https?:\/\//i.test(f)) f = new URL(f).pathname; } catch (e) {}
  f = f.replace(/^\/+/, '').split('?')[0].split('#')[0];
  if (!/^[a-z0-9._-]+\.(html|js)$/i.test(f)) return null;
  const p = path.join(DEPOT, f);
  if (p !== path.join(DEPOT, path.basename(p)) || !fs.existsSync(p)) return null;
  let lignes;
  try { lignes = fs.readFileSync(p, 'utf8').split('\n'); } catch (e) { return null; }
  if (!n || n > lignes.length) return { fichier: f, ligne: 0, extrait: '' };
  const d = Math.max(1, n - 12), fin = Math.min(lignes.length, n + 12);
  const extrait = lignes.slice(d - 1, fin)
    .map((l, i) => String(d + i).padStart(6) + (d + i === n ? ' ▶ ' : ' │ ') + l.slice(0, 300)).join('\n');
  return { fichier: f, ligne: n, extrait };
}
const EXPLIQUE_SCHEMA = {
  type: 'object',
  properties: {
    cause: { type: 'string' },
    ou: { type: 'string' },
    verifier: { type: 'string' },
    confiance: { type: 'string', enum: ['haute', 'moyenne', 'faible'] }
  },
  required: ['cause', 'ou', 'verifier', 'confiance'],
  additionalProperties: false
};
const EXPLIQUE_QUOTA_PATH = path.join(DATA_DIR, 'explique-quota.json');
/* Un compteur PAR APPLICATION. /api/monitor/report est publique : n'importe qui peut fabriquer des incidents
   étiquetés OP MESSAGES, et un compte messages les expliquer — avec un seul compteur, il aurait vidé le quota
   du jour de la Tour gestion. L'ancien fichier { jour, n } se relit comme le compteur de gestion. */
let expliqueQuota = { jour: '', n: {} };
try { const q = JSON.parse(fs.readFileSync(EXPLIQUE_QUOTA_PATH, 'utf8')); expliqueQuota = { jour: q.jour || '', n: (q.n && typeof q.n === 'object') ? q.n : { gestion: +q.n || 0 } }; } catch (e) {}
function expliqueUtilises(appli) {
  const auj = new Date().toISOString().slice(0, 10);
  if (expliqueQuota.jour !== auj) expliqueQuota = { jour: auj, n: {} };
  return expliqueQuota.n[appli] || 0;
}
function expliqueCompte(appli) { expliqueUtilises(appli); expliqueQuota.n[appli] = (expliqueQuota.n[appli] || 0) + 1; try { fs.writeFileSync(EXPLIQUE_QUOTA_PATH, JSON.stringify(expliqueQuota)); } catch (e) {} }
const EXPLIQUE_MAX = 40;   // par application et par jour
app.post('/api/monitor/expliquer', monAdmin, async (req, res) => {
  try {
    if (!devisActif()) return res.status(503).json({ error: 'Clé Claude non configurée sur le serveur (config.json → anthropic.cleApi)' });
    const issue = monIssues.find(i => i.id === (req.body || {}).id);
    if (!issue) return res.status(404).json({ error: 'incident introuvable' });
    if (monIssueRefuse(req, res, issue)) return;
    if (issue.explication && !(req.body || {}).refaire) return res.json({ ok: true, explication: issue.explication, deja: true });
    const appliQ = monAppDeTag(issue.app);
    if (expliqueUtilises(appliQ) >= EXPLIQUE_MAX) return res.status(429).json({ error: 'Quota du jour atteint (' + EXPLIQUE_MAX + ' explications) — réessaie demain' });

    const s = monSource(issue.src, issue.line);
    const sys = "Tu expliques la cause d'un incident survenu dans une application web de gestion d'interventions, à un artisan qui n'est pas développeur mais qui lit du code quand on le lui montre. Réponds en français, sobrement, sans jargon inutile.\n"
      + "« cause » : deux ou trois phrases qui disent POURQUOI cela s'est produit. Pas de reformulation du message d'erreur — la cause.\n"
      + "« ou » : le fichier et la ligne, repris EXACTEMENT de l'extrait fourni. Si aucun extrait n'est fourni, ou si l'extrait ne montre pas la cause, écris « emplacement non déterminé » — n'invente jamais un fichier ni un numéro de ligne.\n"
      + "« verifier » : ce qu'un humain doit regarder ou reproduire pour confirmer, en une phrase.\n"
      + "« confiance » : « haute » seulement si l'extrait montre la cause noir sur blanc ; « faible » si tu raisonnes sans voir le code fautif. Une explication plausible mais invérifiable est de confiance faible, dis-le.";
    const contexte = 'Incident\n'
      + '- application : ' + (issue.app || '?') + (issue.version ? ' v' + issue.version : '') + '\n'
      + '- type : ' + (issue.type || '?') + ' · écran ouvert : ' + (issue.categorie || '?')
      + (issue.origine ? ' · origine : ' + issue.origine : '') + '\n'
      + '- message : ' + (issue.message || '') + '\n'
      + '- vu ' + (issue.count || 1) + ' fois, sur ' + Object.keys(issue.appareils || {}).length + ' appareil(s)\n'
      + (issue.stack ? '- trace :\n' + issue.stack + '\n' : '')
      + (s && s.extrait
        ? '\nCode du dépôt autour de ' + s.fichier + ':' + s.ligne + ' (▶ = la ligne désignée) :\n' + s.extrait + '\n'
        : '\nAucun extrait de code : la trace ne désigne pas un fichier du dépôt' + (issue.src ? ' (elle indique « ' + String(issue.src).slice(0, 120) + ' »)' : '') + '.\n');

    const msg = await getAnthropic().messages.create({
      model: 'claude-sonnet-5', max_tokens: 2000, system: sys,
      output_config: { format: { type: 'json_schema', schema: EXPLIQUE_SCHEMA } },
      messages: [{ role: 'user', content: contexte }]
    });
    if (msg.stop_reason === 'refusal') return res.status(422).json({ error: 'Explication refusée' });
    const txt = (msg.content.find(b => b.type === 'text') || {}).text || '';
    let e; try { e = JSON.parse(txt); } catch (err) { return res.status(502).json({ error: 'Réponse illisible, réessaie' }); }
    expliqueCompte(appliQ);
    issue.explication = {
      cause: monStr(e.cause, 900), ou: monStr(e.ou, 200), verifier: monStr(e.verifier, 400),
      confiance: ['haute', 'moyenne', 'faible'].includes(e.confiance) ? e.confiance : 'faible',
      /* le fichier et la ligne réellement OUVERTS ici — c'est cela qui fait foi, pas ce
         que le modèle en a redit */
      fichier: s ? s.fichier : '', ligne: s ? s.ligne : 0, codeLu: !!(s && s.extrait),
      ts: Date.now(), par: req.tourUser.nom
    };
    issue.historique = (issue.historique || []).concat([{ ts: Date.now(), par: req.tourUser.nom, action: 'Cause expliquée', note: issue.explication.ou }]).slice(-30);
    monSave();
    console.log('Tour :', req.tourUser.nom, 'a demandé la cause de', issue.id, '→', issue.explication.confiance, issue.explication.ou);
    res.json({ ok: true, explication: issue.explication, restants: Math.max(0, EXPLIQUE_MAX - expliqueUtilises()) });
  } catch (err) {
    const st = err && err.status;
    if (st === 401) return res.status(502).json({ error: 'Clé Claude refusée par Anthropic — expirée ou incomplète. Sur le serveur : bash server/set-claude.sh' });
    if (st === 429 || st === 529) return res.status(503).json({ error: 'Service IA saturé — réessaie dans une minute' });
    console.error('expliquer :', err && err.message);
    res.status(500).json({ error: 'Erreur du serveur' });
  }
});


/* ══════════ PROPOSE — d'une cause à une correction, soumise au patron ══════════
   EXPLIQUE dit pourquoi. PROPOSE écrit le correctif et ouvre une proposition sur
   GitHub. Elle ne fusionne rien : ce fichier n'appelle nulle part la fusion, et
   la proposition part en brouillon. Rien ne va en production sans une main humaine.

   Quatre verrous, dans cet ordre :
     1. Il faut une cause déjà établie, et le code doit avoir été RÉELLEMENT LU pour
        l'établir. Corriger sur une intuition, c'est corriger au hasard.
     2. L'ancre du remplacement doit se trouver UNE SEULE FOIS dans le fichier. Zéro,
        le modèle a inventé du code qui n'existe pas ; deux, on ne sait pas laquelle
        il visait. Dans les deux cas on s'arrête.
     3. Le fichier corrigé doit encore s'analyser. C'est la panne du 3 septembre 2026 :
        un « // » au milieu d'une ligne avait avalé une accolade, app.html avait cessé
        de parser, et la page est restée blanche chez toutes les entreprises. Un
        correctif qui casse le fichier ne doit jamais atteindre une proposition.
     4. app.html commande beta.html : on régénère la bêta avec le générateur livré
        (beta-build.js, exécuté tel quel), sinon la vérification d'intégration
        signalerait à juste titre une bêta désynchronisée.

   La clé GitHub vit UNIQUEMENT dans /opt/teamop/config.json → "github" :
     "github": { "token": "…", "depot": "compte/TeamOP" }
   Sans elle, la route se tait proprement : PROPOSE reste inerte. */
const PROPOSE_SCHEMA = {
  type: 'object',
  properties: {
    titre: { type: 'string' },
    pourquoi: { type: 'string' },
    fichier: { type: 'string' },
    avant: { type: 'string' },
    apres: { type: 'string' },
    verifier: { type: 'string' },
    risque: { type: 'string', enum: ['faible', 'moyen', 'eleve'] }
  },
  required: ['titre', 'pourquoi', 'fichier', 'avant', 'apres', 'verifier', 'risque'],
  additionalProperties: false
};
function ghConf() { return config.github || {}; }
function ghActif() { return !!(ghConf().token && ghConf().depot); }
async function gh(chemin, options) {
  const r = await fetch('https://api.github.com/repos/' + ghConf().depot + chemin, Object.assign({
    headers: {
      'Authorization': 'Bearer ' + ghConf().token,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'teamop-propose',
      'Content-Type': 'application/json'
    }
  }, options || {}));
  const txt = await r.text();
  let j = null; try { j = JSON.parse(txt); } catch (e) {}
  if (!r.ok) { const e = new Error('GitHub ' + r.status + ' : ' + ((j && j.message) || txt.slice(0, 200))); e.statutGh = r.status; throw e; }
  return j;
}
/* Chaque bloc <script> d'une page doit rester analysable — même contrôle que
   scripts/verifier-syntaxe.js, qui existe précisément à cause de la page blanche.
   new Function COMPILE le code sans jamais l'exécuter : c'est ce qu'on veut ici, savoir
   si le navigateur saura lire la page, sans faire tourner une ligne du correctif. */
function pageAnalysable(html) {
  const BLOC = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, n = 0;
  while ((m = BLOC.exec(html))) {
    n++;
    try { new Function(m[1]); }
    catch (e) {
      try { new Function('return (async () => {' + m[1] + '})'); }
      catch (e2) { return 'bloc <script> n°' + n + ' : ' + e2.message; }
    }
  }
  return '';
}
/* beta.html est GÉNÉRÉE depuis app.html. On ne réécrit pas ses règles ici : on exécute
   le générateur livré, en lui donnant l'app corrigée à lire et en captant ce qu'il écrit.
   Ses propres refus (isolation du stockage, de l'espace de synchro) restent actifs. */
function betaDepuis(appHtml) {
  const src = fs.readFileSync(path.join(DEPOT, 'beta-build.js'), 'utf8');
  let sortie = null;
  const fauxFs = {
    readFileSync: (f, e) => (String(f).endsWith('app.html') ? appHtml : fs.readFileSync(f, e)),
    writeFileSync: (f, d) => { if (String(f).endsWith('beta.html')) sortie = d; }
  };
  new Function('require', 'console', 'process', src)(
    (n) => (n === 'fs' ? fauxFs : require(n)),
    { log: () => {}, error: (m) => { throw new Error(String(m)); } },
    { exit: (c) => { if (c) throw new Error('beta-build.js a refusé la génération'); } }
  );
  if (!sortie) throw new Error('beta-build.js n\'a rien produit');
  return sortie;
}
app.post('/api/monitor/proposer', monPatronStrict, async (req, res) => {
  try {
    if (!devisActif()) return res.status(503).json({ error: 'Clé Claude non configurée sur le serveur (config.json → anthropic.cleApi)' });
    if (!ghActif()) return res.status(503).json({ error: 'Dépôt GitHub non configuré sur le serveur (config.json → github.token et github.depot)' });
    const issue = monIssues.find(i => i.id === (req.body || {}).id);
    if (!issue) return res.status(404).json({ error: 'incident introuvable' });
    if (monIssueRefuse(req, res, issue)) return;
    const e = issue.explication;
    if (!e) return res.status(400).json({ error: 'Cherche d\'abord la cause : on ne corrige pas un incident qu\'on n\'a pas compris' });
    if (!e.codeLu || !e.fichier) return res.status(400).json({ error: 'La cause a été établie sans lire le code — pas de correctif automatique là-dessus' });
    if (issue.proposition && !(req.body || {}).refaire) return res.json({ ok: true, proposition: issue.proposition, deja: true });

    const s = monSource(e.fichier, e.ligne);
    if (!s || !s.extrait) return res.status(400).json({ error: 'Le fichier de la cause n\'est plus lisible dans le dépôt' });
    const lignes = fs.readFileSync(path.join(DEPOT, s.fichier), 'utf8').split('\n');
    const d = Math.max(1, s.ligne - 40), fin = Math.min(lignes.length, s.ligne + 40);
    const large = lignes.slice(d - 1, fin).map((l, i) => String(d + i) + ' │ ' + l).join('\n');

    const sys = "Tu corriges un défaut dans une application web française (JavaScript dans des pages HTML d'un seul fichier, sans build ni framework). Le style existant fait loi : mêmes conventions, mêmes noms en français, mêmes commentaires expliquant le POURQUOI. Pas de refactorisation, pas d'amélioration au passage — la plus petite correction qui traite la cause, et rien d'autre.\n"
      + "« avant » : le fragment EXACT à remplacer, copié caractère pour caractère depuis le code fourni (sans les numéros de ligne ni la barre verticale). Il doit être assez long pour n'apparaître QU'UNE FOIS dans le fichier, et assez court pour ne rien emporter d'inutile.\n"
      + "« apres » : ce fragment corrigé. Il doit rester du JavaScript valide au même endroit.\n"
      + "« pourquoi » : deux ou trois phrases expliquant ce que le correctif change et pourquoi cela traite la cause.\n"
      + "« verifier » : comment un humain confirme que c'est réglé, concrètement.\n"
      + "« risque » : « faible » si le correctif ne touche qu'un chemin d'exécution étroit ; « eleve » s'il touche du code partagé ou une donnée persistée.\n"
      + "Si le code fourni ne suffit pas pour corriger sûrement, renvoie « avant » et « apres » identiques : c'est la façon de dire que tu ne corriges pas à l'aveugle.";
    const contexte = 'Incident : ' + (issue.message || '') + '\n'
      + 'Cause établie : ' + (e.cause || '') + '\n'
      + 'Emplacement : ' + s.fichier + ' ligne ' + s.ligne + '\n'
      + (issue.stack ? 'Trace :\n' + issue.stack + '\n' : '')
      + '\nCode du dépôt (' + s.fichier + ', lignes ' + d + ' à ' + fin + ') :\n' + large;

    const msg = await getAnthropic().messages.create({
      model: 'claude-sonnet-5', max_tokens: 8000, system: sys,
      output_config: { format: { type: 'json_schema', schema: PROPOSE_SCHEMA } },
      messages: [{ role: 'user', content: contexte }]
    });
    if (msg.stop_reason === 'refusal') return res.status(422).json({ error: 'Correctif refusé' });
    const txt = (msg.content.find(b => b.type === 'text') || {}).text || '';
    let p; try { p = JSON.parse(txt); } catch (err) { return res.status(502).json({ error: 'Réponse illisible, réessaie' }); }

    // ── verrou 2 : l'ancre, une fois et une seule ──
    if (!p.avant || p.avant === p.apres) return res.status(422).json({ error: 'Aucun correctif sûr à partir de ce code — la cause reste à traiter à la main' });
    if (p.avant.length > 4000) return res.status(422).json({ error: 'Correctif trop large pour être proposé automatiquement' });
    const avantFichier = fs.readFileSync(path.join(DEPOT, s.fichier), 'utf8');
    const occurrences = avantFichier.split(p.avant).length - 1;
    if (occurrences !== 1) return res.status(422).json({
      error: occurrences === 0
        ? 'Le fragment à remplacer ne se trouve pas dans le fichier — correctif écarté'
        : 'Le fragment à remplacer apparaît ' + occurrences + ' fois — on ne sait pas lequel viser, correctif écarté'
    });
    const apresFichier = avantFichier.replace(p.avant, p.apres);

    // ── verrou 3 : le fichier corrigé s'analyse encore ──
    const fichiers = {};
    if (/\.html$/i.test(s.fichier)) {
      const casse = pageAnalysable(apresFichier);
      if (casse) return res.status(422).json({ error: 'Correctif écarté : il rend ' + s.fichier + ' inanalysable (' + casse + ')' });
    } else {
      try { new (require('vm').Script)(apresFichier, { filename: s.fichier }); }
      catch (err) { return res.status(422).json({ error: 'Correctif écarté : il rend ' + s.fichier + ' inanalysable (' + err.message + ')' }); }
    }
    fichiers[s.fichier] = apresFichier;
    // ── verrou 4 : la bêta suit l'app ──
    if (s.fichier === 'app.html') {
      try { fichiers['beta.html'] = betaDepuis(apresFichier); }
      catch (err) { return res.status(422).json({ error: 'Correctif écarté : la bêta ne se régénère pas (' + err.message + ')' }); }
    }

    // ── la proposition, en brouillon ──
    const branche = 'propose/' + issue.id + '-' + Date.now().toString(36);
    const base = await gh('/git/ref/heads/main');
    await gh('/git/refs', { method: 'POST', body: JSON.stringify({ ref: 'refs/heads/' + branche, sha: base.object.sha }) });
    for (const nomF of Object.keys(fichiers)) {
      const actuel = await gh('/contents/' + encodeURIComponent(nomF) + '?ref=main');
      await gh('/contents/' + encodeURIComponent(nomF), {
        method: 'PUT',
        body: JSON.stringify({
          message: monStr(p.titre, 120) + '\n\nIncident #' + String(issue.id).slice(-6) + ' — proposition ouverte depuis la Tour par ' + req.tourUser.nom + '.',
          content: Buffer.from(fichiers[nomF], 'utf8').toString('base64'),
          branch: branche, sha: actuel.sha
        })
      });
    }
    const corps = '## Ce qui ne va pas\n\n' + (issue.message || '') + '\n\n'
      + '_Incident #' + String(issue.id).slice(-6) + ' · vu ' + (issue.count || 1) + ' fois sur '
      + Object.keys(issue.appareils || {}).length + ' appareil(s) · ' + (issue.categorie || '') + '_\n\n'
      + '## La cause\n\n' + (e.cause || '') + '\n\n`' + s.fichier + '` ligne ' + s.ligne + '\n\n'
      + '## Ce que change ce correctif\n\n' + (p.pourquoi || '') + '\n\n'
      + '## À vérifier avant de fusionner\n\n' + (p.verifier || '') + '\n\n'
      + '```\nnode scripts/verifier-syntaxe.js\nnode scripts/verifier-lien-jeton.js\nnode scripts/verifier-explique.js\n```\n\n'
      + '## Ce que cette proposition n\'a pas fait\n\n'
      + '- Elle n\'est **pas** fusionnée, et rien dans le serveur ne peut la fusionner.\n'
      + '- Le correctif a été écrit par Claude à partir du code du dépôt ; il a été vérifié analysable, pas vérifié juste. Risque annoncé : **' + (p.risque || '?') + '**.\n'
      + '- Personne n\'a exécuté l\'application avec ce correctif.\n\n'
      + '---\nProposition ouverte depuis la Tour de contrôle par **' + req.tourUser.nom + '** le '
      + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + '.\n';
    const pr = await gh('/pulls', {
      method: 'POST',
      body: JSON.stringify({ title: monStr(p.titre, 120), head: branche, base: 'main', body: corps, draft: true })
    });

    issue.proposition = {
      url: pr.html_url, numero: pr.number, branche: branche,
      titre: monStr(p.titre, 120), pourquoi: monStr(p.pourquoi, 900), verifier: monStr(p.verifier, 400),
      risque: ['faible', 'moyen', 'eleve'].includes(p.risque) ? p.risque : 'moyen',
      fichiers: Object.keys(fichiers), ts: Date.now(), par: req.tourUser.nom
    };
    issue.historique = (issue.historique || []).concat([{ ts: Date.now(), par: req.tourUser.nom, action: 'Correction proposée', note: '#' + pr.number + ' ' + monStr(p.titre, 120) }]).slice(-30);
    monSave();
    console.log('Tour :', req.tourUser.nom, 'a proposé une correction pour', issue.id, '→', pr.html_url);
    res.json({ ok: true, proposition: issue.proposition });
  } catch (err) {
    const st = err && err.status;
    if (st === 401) return res.status(502).json({ error: 'Clé Claude refusée par Anthropic — expirée ou incomplète. Sur le serveur : bash server/set-claude.sh' });
    if (st === 429 || st === 529) return res.status(503).json({ error: 'Service IA saturé — réessaie dans une minute' });
    if (err && err.statutGh) return res.status(502).json({ error: err.message });
    console.error('proposer :', err && err.message);
    res.status(500).json({ error: 'Erreur du serveur' });
  }
});

// santé globale (admin) : reprend /health + uptime + répartition des problèmes
app.get('/api/monitor/sante', monAdmin, (req, res) => {
  const vis = monIssues.filter(i => req.tourUser.apps.includes(monAppDeTag(i.app)));   // même filtre que /issues : des chiffres qui contredisent la liste ne servent personne
  const compteurs = { nouveau: 0, encours: 0, corrige: 0, ignore: 0 };
  for (const i of vis) compteurs[i.statut] = (compteurs[i.statut] || 0) + 1;
  res.json({ ok: true, uptime: Math.round(process.uptime()), subs: Object.keys(subs).length, email: !!mailer, boite: !!(config.imap && config.imap.user), stripe: !!(config.stripe && config.stripe.secretKey), stripeEchecMin: stripeEchecMin(), bugs1h: bugTimes.filter(t => t > Date.now() - 3600000).length, bugs24h: bugTimes.filter(t => t > Date.now() - 86400000).length, lastRefus, issues: compteurs, issuesTotal: vis.length });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📬 SUPPORT — boîte e-mail support gérée depuis le contrôle (réutilise ImapFlow/nodemailer).
//    Identifiants stockés côté serveur uniquement (jamais renvoyés au navigateur).
// ═══════════════════════════════════════════════════════════════════════════
const SUPPORT_BOX_PATH = path.join(DATA_DIR, 'support-box.json');
const SUPPORT_MAILS_PATH = path.join(DATA_DIR, 'support-mails.json');
let supportBox = null;    // { email, pass, imapHost, imapPort, smtpHost, smtpPort }
let supportMails = [];    // [{ id, mid, from, fromName, subject, text, ts, statut:'nouveau'|'traite'|'archive', reponses:[{ts,par,text}] }]
try { supportBox = JSON.parse(fs.readFileSync(SUPPORT_BOX_PATH, 'utf8')); } catch (e) {}
try { supportMails = JSON.parse(fs.readFileSync(SUPPORT_MAILS_PATH, 'utf8')); } catch (e) {}
const SUPPORT_ENVOYES_PATH = path.join(DATA_DIR, 'support-envoyes.json');
let supportEnvoyes = [];   // [{ id, to, subject, text, ts, par }] — les messages écrits depuis le contrôle
try { supportEnvoyes = JSON.parse(fs.readFileSync(SUPPORT_ENVOYES_PATH, 'utf8')); } catch (e) {}
let supSaveTimer = null;
function supSave() {
  clearTimeout(supSaveTimer);
  supSaveTimer = setTimeout(() => {
    try { if (supportMails.length > 300) supportMails = supportMails.sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 300); fs.writeFileSync(SUPPORT_MAILS_PATH, JSON.stringify(supportMails)); } catch (e) { console.error('support save:', e.message); }
    try { fs.writeFileSync(SUPPORT_ENVOYES_PATH, JSON.stringify(supportEnvoyes)); } catch (e) {}
  }, 400);
}
const supMids = new Set(supportMails.map(m => m.mid).filter(Boolean));
// HTML → texte lisible (beaucoup de mails n'ont AUCUNE version texte : sans ça le message paraissait vide)
function htmlEnTexte(h) {
  if (!h) return '';
  return String(h)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&[a-z#0-9]{2,8};/gi, ' ')
    .replace(/[ \t\u00a0]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function supEntry(env, corps, histo) {
  const from = ((env.from || [])[0] || {});
  const c = (corps && typeof corps === 'object') ? corps : { text: corps };
  const texte = String(c.text || '').trim() || htmlEnTexte(c.html);
  return { id: 'm' + crypto.randomBytes(6).toString('hex'), mid: String(env.messageId || '').slice(0, 200),
    from: String(from.address || '').toLowerCase().slice(0, 120), fromName: String(from.name || '').slice(0, 80),
    subject: String(env.subject || '(sans objet)').slice(0, 200),
    text: texte.slice(0, 12000),
    html: String(c.html || '').slice(0, 120000),                      // affiché dans un cadre isolé côté contrôle
    pieces: (Array.isArray(c.pieces) ? c.pieces : []).slice(0, 12),   // nom + taille des pièces jointes
    ts: env.date ? new Date(env.date).getTime() : Date.now(), statut: 'nouveau', reponses: [], histo: histo ? 1 : 0 };
}
// extraction complète d'un message (texte + HTML + pièces jointes)
async function supCorps(source) {
  try {
    const { simpleParser } = require('mailparser');
    const p = await simpleParser(source);
    return { text: String(p.text || ''), html: typeof p.html === 'string' ? p.html : '',
      pieces: (p.attachments || []).filter(a => a.filename).map(a => ({ nom: String(a.filename).slice(0, 120), taille: a.size || 0 })) };
  } catch (e) { return { text: '', html: '', pieces: [] }; }
}
let supportBusy = false;
async function releveSupport(importHisto) {   // même mécanique que la relève des boîtes commandes
  if (!supportBox || supportBusy) return; supportBusy = true;
  const { ImapFlow } = require('imapflow'); const { simpleParser } = require('mailparser'); let client;
  try {
    client = new ImapFlow({ host: supportBox.imapHost, port: supportBox.imapPort || 993, secure: true, auth: { user: supportBox.email, pass: supportBox.pass }, logger: false });
    client.on('error', () => {});   // une erreur émise en événement tuerait le processus : on l'absorbe, l'échec est déjà traité par le try/catch
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      if (importHisto) {   // à la connexion : les ~30 derniers mails arrivent (sans toucher aux drapeaux)
        const total = (client.mailbox && client.mailbox.exists) || 0;
        if (total) {
          for await (const msg of client.fetch(Math.max(1, total - 29) + ':*', { envelope: true, source: { maxLength: 600000 } })) {
            const env = msg.envelope || {}; const mid = String(env.messageId || '').slice(0, 200);
            if (mid && supMids.has(mid)) continue;
            if (mailProtege(env.messageId)) continue;   // un code ou un avis de suppression : pas dans la liste que toute la Tour lit (`mailProtege`)
            supportMails.push(supEntry(env, await supCorps(msg.source), true)); if (mid) supMids.add(mid);
          }
        }
      }
      const nouveaux = [];
      for await (const msg of client.fetch({ seen: false }, { envelope: true, source: { maxLength: 600000 } })) nouveaux.push(msg);
      for (const msg of nouveaux) {
        const env = msg.envelope || {}; const mid = String(env.messageId || '').slice(0, 200);
        /* Un e-mail de sécurité (code, avis de suppression) n'entre pas dans la liste du support — que TOUT
           compte de la Tour lit — et il n'est pas marqué lu : il doit se voir non lu chez le patron. */
        if (mailProtege(env.messageId)) continue;
        if (mid && supMids.has(mid)) { try { await client.messageFlagsAdd(msg.seq, ['\\Seen']); } catch (_) {} continue; }
        supportMails.push(supEntry(env, await supCorps(msg.source)));
        if (mid) supMids.add(mid);
        try { await client.messageFlagsAdd(msg.seq, ['\\Seen']); } catch (_) {}
      }
      supSave();
    } finally { lock.release(); }
    await client.logout();
  } catch (e) { console.error('support releve:', e.message); try { if (client) client.close(); } catch (_) {} }
  supportBusy = false;
}
setInterval(() => { releveSupport().catch(() => {}); }, 120000);
setTimeout(() => { releveSupport().catch(() => {}); }, 12000);

// connexion de la boîte support (patron uniquement) — Zimbra OVH par défaut
app.post('/api/monitor/support/connect', monPatronStrict, async (req, res) => {
  const { email, pass, imapHost, imapPort, smtpHost, smtpPort } = req.body || {};
  if (!email || !pass) return res.status(400).json({ error: 'adresse et mot de passe requis' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) return res.status(400).json({ error: 'adresse invalide' });
  const box = { email: monStr(email, 120), pass: String(pass).slice(0, 200),
    imapHost: monStr(imapHost, 100) || 'imap.mail.ovh.net', imapPort: parseInt(imapPort, 10) || 993,
    smtpHost: monStr(smtpHost, 100) || 'smtp.mail.ovh.net', smtpPort: parseInt(smtpPort, 10) || 465, ts: Date.now() };
  try {
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({ host: box.smtpHost, port: box.smtpPort, secure: box.smtpPort === 465, auth: { user: box.email, pass: box.pass }, connectionTimeout: 9000, greetingTimeout: 9000 });
    await t.verify();
  } catch (e) { return res.status(400).json({ error: 'Connexion envoi (SMTP) refusée : ' + String(e.message || e).slice(0, 140) }); }
  try {
    const { ImapFlow } = require('imapflow');
    const c = new ImapFlow({ host: box.imapHost, port: box.imapPort, secure: true, auth: { user: box.email, pass: box.pass }, logger: false });
    c.on('error', () => {});   // une erreur émise en événement tuerait le processus : on l'absorbe, l'échec est déjà traité par le try/catch
    await c.connect(); await c.logout();
  } catch (e) { return res.status(400).json({ error: 'Connexion réception (IMAP) refusée : ' + String(e.message || e).slice(0, 140) }); }
  // changement d'adresse : on retire les messages de l'ancienne boîte (ils restent dans la messagerie)
  if (supportBox && supportBox.email && supportBox.email.toLowerCase() !== box.email.toLowerCase()) {
    supportMails.length = 0;
    try { supSave(); } catch (e) {}
  }
  supportBox = box;
  try { fs.writeFileSync(SUPPORT_BOX_PATH, JSON.stringify(box)); } catch (e) {}
  res.json({ ok: true, email: box.email });
  releveSupport(true).catch(() => {});   // import de l'historique en arrière-plan
});
// état de la boîte (sans mot de passe, jamais)
app.get('/api/monitor/support/box', monAdmin, (req, res) => {
  res.json(supportBox ? { connected: true, email: supportBox.email, imapHost: supportBox.imapHost, smtpHost: supportBox.smtpHost } : { connected: false });
});
// liste des mails support
app.get('/api/monitor/support/mails', monAdmin, (req, res) => {
  const list = supportMails.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 200);
  res.json({ mails: list, nonTraites: supportMails.filter(m => m.statut === 'nouveau').length, connected: !!supportBox, email: supportBox ? supportBox.email : '' });
});
// réponse directe depuis le contrôle — envoyée par SMTP au nom de la boîte, tracée au nom de l'agent
app.post('/api/monitor/support/reply', monAdmin, async (req, res) => {
  if (!supportBox) return res.status(503).json({ error: 'boîte support non connectée' });
  const { id, text } = req.body || {};
  const mail = supportMails.find(m => m.id === id);
  if (!mail) return res.status(404).json({ error: 'mail introuvable' });
  const corps = String(text || '').slice(0, 8000);
  if (!corps.trim()) return res.status(400).json({ error: 'réponse vide' });
  try {
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({ host: supportBox.smtpHost, port: supportBox.smtpPort, secure: supportBox.smtpPort === 465, auth: { user: supportBox.email, pass: supportBox.pass }, connectionTimeout: 9000, greetingTimeout: 9000 });
    await t.sendMail({ from: '"TEAM OP" <' + supportBox.email + '>', to: mail.from, subject: (/^re\s*:/i.test(mail.subject) ? mail.subject : 'Re: ' + mail.subject).slice(0, 200), text: corps, inReplyTo: mail.mid || undefined, references: mail.mid || undefined });
  } catch (e) { return res.status(500).json({ error: 'envoi refusé : ' + String(e.message || e).slice(0, 140) }); }
  mail.reponses = (mail.reponses || []).concat([{ ts: Date.now(), par: req.tourUser.nom, text: corps.slice(0, 2000) }]).slice(-20);
  mail.statut = 'traite';
  supSave();
  res.json({ ok: true, mail });
});
// écrire un NOUVEAU message depuis le contrôle (vraie boîte mail : on n'est pas obligé de répondre à un mail reçu)
app.post('/api/monitor/support/envoyer', monAdmin, async (req, res) => {
  if (!supportBox) return res.status(503).json({ error: 'boîte support non connectée' });
  const { to, subject, text } = req.body || {};
  const dest = monStr(to, 200).trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dest.replace(/^.*</, '').replace(/>.*$/, ''))) return res.status(400).json({ error: 'adresse du destinataire invalide' });
  const obj = monStr(subject, 200).trim() || '(sans objet)';
  const corps = String(text || '').slice(0, 8000);
  if (!corps.trim()) return res.status(400).json({ error: 'message vide' });
  try {
    const nodemailer = require('nodemailer');
    const tr = nodemailer.createTransport({ host: supportBox.smtpHost, port: supportBox.smtpPort, secure: supportBox.smtpPort === 465, auth: { user: supportBox.email, pass: supportBox.pass }, connectionTimeout: 9000, greetingTimeout: 9000 });
    // le beau modèle TeamOP (logo, mise en page) — le texte brut reste en secours
    const echap = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = mailTeamOP({
      chip: 'Message', chipBg: '#F1EBFC', chipColor: '#6D3FC4',
      titre: obj,
      corpsHtml: echap(corps).replace(/\n/g, '<br>'),
      boutonTxt: 'Mon espace client', boutonUrl: 'https://teamop.fr/espace.html',
      bouton2Txt: 'Répondre à TEAM OP', bouton2Url: 'mailto:' + supportBox.email
    });
    await tr.sendMail({ from: '"TEAM OP" <' + supportBox.email + '>', to: dest, subject: obj, text: corps, html,
      attachments: [] });
  } catch (e) { return res.status(500).json({ error: 'envoi refusé : ' + String(e.message || e).slice(0, 140) }); }
  mailsJournal(dest, obj, corps, false, '');
  supportEnvoyes.unshift({ id: 'e' + crypto.randomBytes(5).toString('hex'), to: dest, subject: obj, text: corps.slice(0, 2000), ts: Date.now(), par: req.tourUser.nom });
  if (supportEnvoyes.length > 100) supportEnvoyes.length = 100;
  supSave();
  res.json({ ok: true });
});
// messages envoyés depuis le contrôle
app.get('/api/monitor/support/envoyes', monAdmin, (req, res) => res.json({ envoyes: supportEnvoyes.slice(0, 60) }));
// retirer un message de la page (il reste dans la messagerie)
app.post('/api/monitor/support/retirer', monAdmin, (req, res) => {
  const i = supportMails.findIndex(m => m.id === (req.body || {}).id);
  if (i < 0) return res.status(404).json({ error: 'mail introuvable' });
  supportMails.splice(i, 1); supSave();
  res.json({ ok: true });
});
// marquer traité / archiver / rouvrir
app.post('/api/monitor/support/marquer', monAdmin, (req, res) => {
  const { id, statut } = req.body || {};
  if (!['nouveau', 'traite', 'archive'].includes(statut)) return res.status(400).json({ error: 'statut invalide' });
  const mail = supportMails.find(m => m.id === id);
  if (!mail) return res.status(404).json({ error: 'mail introuvable' });
  mail.statut = statut; supSave();
  res.json({ ok: true, mail });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 CLIENTS — les comptes clients vivent dans Firebase (espace.html) : le serveur ne les voit pas.
//    Synchronisation légère : espace.html pousse un résumé minimal à chaque visite du client
//    (email, entreprise, applications, demandes, abonnement, promo — JAMAIS de mot de passe).
//    Les données d'un client n'apparaissent donc qu'à partir de sa prochaine visite.
// ═══════════════════════════════════════════════════════════════════════════
const CLIENTS_PATH = path.join(DATA_DIR, 'clients.json');
let clientsData = {};   // email -> { email, nom, entreprise, inscrit, apps, demandes, plan, planStatus, promo, majTs, noteInterne, demandesTraitees }
try { clientsData = JSON.parse(fs.readFileSync(CLIENTS_PATH, 'utf8')); } catch (e) {}
let cliSaveTimer = null;
function cliSave() {
  clearTimeout(cliSaveTimer);
  cliSaveTimer = setTimeout(() => { try { fs.writeFileSync(CLIENTS_PATH, JSON.stringify(clientsData)); } catch (e) { console.error('clients save:', e.message); } }, 400);
}
// ── Preuve d'identité du client : le jeton de connexion Firebase envoyé par espace.html ──
//    Sans cette vérification, n'importe qui pourrait écraser la fiche d'un vrai client en
//    connaissant simplement son adresse e-mail. Le jeton est signé par Google : on contrôle
//    la signature avec les certificats publics de Google, puis on ne retient QUE l'e-mail
//    contenu dans le jeton — jamais celui envoyé dans le corps de la requête.
const FB_PROJET = (config.firebase && config.firebase.projectId) || 'elan-gestion';
/* Redirigeable pour les bancs, comme les trois autres adresses de Google (`urlBanc` : seul
   `http://127.0.0.1:<port>` est accepté) — sans elle, aucun banc ne pouvait présenter un VRAI
   jeton signé, et la garde de `/api/clients/sync` n'était éprouvée que sur des jetons refusés. */
const FB_CERTS_URL = urlBanc(process.env.TEAMOP_FB_CERTS_URL, 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
const fbCerts = { data: null, exp: 0, encours: null };
function fbCertificats() {
  if (fbCerts.data && Date.now() < fbCerts.exp) return Promise.resolve(fbCerts.data);
  if (!fbCerts.encours) {
    fbCerts.encours = (async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch(FB_CERTS_URL, { signal: ctrl.signal });
        if (!r.ok) throw new Error('certificats google HTTP ' + r.status);
        const d = await r.json();
        const m = String(r.headers.get('cache-control') || '').match(/max-age=(\d+)/);
        fbCerts.data = d; fbCerts.exp = Date.now() + (m ? parseInt(m[1], 10) * 1000 : 3600000);
        return d;
      } finally { clearTimeout(t); fbCerts.encours = null; }
    })();
  }
  return fbCerts.encours;
}
const fbB64 = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
async function fbVerifie(jeton) {
  const p = String(jeton || '').split('.');
  if (p.length !== 3) return null;
  let ent, corps;
  try { ent = JSON.parse(fbB64(p[0]).toString('utf8')); corps = JSON.parse(fbB64(p[1]).toString('utf8')); } catch (e) { return null; }
  if (!ent || ent.alg !== 'RS256' || !ent.kid || !corps) return null;
  const now = Math.floor(Date.now() / 1000);
  if (!(parseInt(corps.exp, 10) > now)) return null;                                              // jeton périmé
  if (parseInt(corps.iat, 10) > now + 300) return null;                                           // daté du futur
  if (corps.aud !== FB_PROJET || corps.iss !== 'https://securetoken.google.com/' + FB_PROJET) return null;
  if (!corps.sub) return null;
  const certs = await fbCertificats();
  const cert = certs && certs[ent.kid];
  if (!cert) return null;
  let cle = cert;
  try { if (crypto.X509Certificate) cle = new crypto.X509Certificate(cert).publicKey; } catch (e) { cle = cert; }
  if (!crypto.createVerify('RSA-SHA256').update(p[0] + '.' + p[1]).verify(cle, fbB64(p[2]))) return null;
  return corps;
}
// réception du résumé poussé par espace.html (signé par le client connecté ; données minimales validées)
let demandesQuota = new Map();   // salves de courriels « nouvelle demande » par adresse (voir /api/clients/sync)
setInterval(() => { demandesQuota = new Map(); }, 3600000).unref();
app.post('/api/clients/sync', async (req, res) => {
  const b = req.body || {};
  let ident = null;
  /* ⛔ APRÈS LA BASCULE DU PORTAIL, LA PREUVE EST UNE SESSION DE `comptes.js`, PLUS UN JETON GOOGLE.
     `cliSync` (espace.html) n'envoyait sa fiche QUE s'il pouvait obtenir un jeton Firebase : avec
     nos comptes, il se taisait — et avec lui tout le circuit d'inscription (espace créé, adresse et
     code d'accès envoyés au client, récapitulatif au patron), le relais des codes promo et la
     fiche de la Tour. Rien ne cassait à l'écran : le client attendait une réponse qui ne venait
     jamais. Une session maison (64 hexadécimaux) se reconnaît à sa forme ; un jeton de Google est
     un JWT et continue de passer par `fbVerifie` tant que Google existe. */
  const brut = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  let cm = null; try { cm = comptes; } catch (e) { cm = null; }
  if (/^[0-9a-f]{64}$/i.test(brut)) {
    const m = cm ? cm.parJeton(brut) : '';
    /* ⛔ UNE SESSION PROUVE UN MOT DE PASSE, PAS UNE ADRESSE (`gardien`, 3e passe, G1). N'importe
       qui ouvre un compte au nom de n'importe quelle adresse — le lien de vérification part chez
       son vrai propriétaire, que l'inconnu ne lit pas, mais la connexion, elle, marchait. Cette
       route lisait l'adresse de la session comme PROUVÉE : l'adresse de contact d'une entreprise
       (publique : un camion, une facture) suffisait pour changer sa formule par une demande —
       « Gratuit » passe pour payé, donc une entreprise payante retombait au forfait gratuit —,
       écraser sa fiche dans la Tour et lui relayer un code promo. Rien de cette route ne part tant
       que l'adresse n'est pas prouvée : la page le dit et redemande le lien, et la fiche repart
       d'elle-même à la visite suivante (`cliSync` ne mémorise que ce qui est accepté). */
    if (m && !cm.verifie(m)) return res.status(403).json({ error: 'adresse_non_verifiee' });
    ident = m ? { email: m } : null;
  } else if (cm) {
    /* ⛔ ET LE PORTAIL MAISON ALLUMÉ, UN JETON DE GOOGLE NE PROUVE PLUS RIEN ICI. Le même défaut
       vivait par Google : un compte Firebase se crée pour n'importe quelle adresse avec la clé
       publique de l'ancien site, et `fbVerifie` ne demande pas que l'adresse soit vérifiée — le
       site ne l'a jamais fait vérifier, donc l'exiger aurait fermé la porte à tout le monde. Une
       fois `comptes.actif` posé, les pages du jour J ne présentent plus que nos sessions ; seule
       la page d'avant, pendant les minutes qui séparent le réglage de la publication, perd son
       relais (REPRISE.md, procédure du jour J). */
    return res.status(401).json({ error: 'connexion non vérifiée' });
  } else {
    try { ident = await fbVerifie(brut); }
    catch (e) { console.error('clients sync jeton:', String(e && e.message || e).slice(0, 200)); ident = null; }
  }
  if (!ident) return res.status(401).json({ error: 'connexion non vérifiée' });
  const email = monStr(ident.email, 120).trim().toLowerCase();   // l'e-mail vient du jeton signé, jamais du corps
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(401).json({ error: 'compte sans e-mail' });
  if (entFermes.emails.includes(email)) return res.status(410).json({ error: 'compte fermé par TeamOP' });
  if (Object.keys(clientsData).length >= 2000 && !clientsData[email]) return res.json({ ok: true });   // cap silencieux
  const prev = clientsData[email] || {};
  const demandes = (Array.isArray(b.demandes) ? b.demandes.slice(0, 20) : []).map(d => ({
    app: monStr(d && d.app, 60), formule: monStr(d && d.formule, 40), statut: monStr(d && d.statut, 20), date: parseInt(d && d.date, 10) || 0, besoin: monStr(d && d.besoin, 200), users: monStr(d && d.users, 10),
    code: monStr(d && d.code, 40), lien: monStr(d && d.lien, 60),
    metier: metierOk(d && d.metier) }));   // le métier DEMANDÉ : une liste fermée ; c'est la Tour qui le pose sur l'espace
  clientsData[email] = {
    email, nom: monStr(b.nom, 80), prenom: monStr(b.prenom, 40) || prev.prenom || '', nomFam: monStr(b.nomFam, 40) || prev.nomFam || '',
    tel: monStr(b.tel, 30) || prev.tel || '', entreprise: monStr(b.entreprise, 80),
    inscrit: parseInt(b.inscrit, 10) || prev.inscrit || Date.now(),
    apps: (Array.isArray(b.apps) ? b.apps.slice(0, 6) : []).map(a => monStr(a, 20)),
    demandes, plan: monStr(b.plan, 40), planStatus: monStr(b.planStatus, 20), promo: monStr(b.promo, 60),
    majTs: Date.now(),
    noteInterne: prev.noteInterne || '',            // les annotations internes du contrôle survivent aux synchros
    metier: prev.metier || '',                      // le métier est fixé depuis le contrôle, jamais par le client
    metierPar: prev.metierPar || '',
    demandesTraitees: prev.demandesTraitees || {}
  };
  cliSave();
  /* Un code promo activé sur le SITE se relaie à l'espace de l'application : l'app se
     débloque toute seule à sa prochaine vérification.

     ⛔ LE CODE ET SON ÉCHÉANCE VIENNENT DE config.promos, JAMAIS DU CORPS DE LA REQUÊTE.
     Jusqu'au 11 septembre 2026, ce bloc lisait `promoCode` ET `promoFin` dans le corps et
     les écrivait tels quels dans promoUsages, sans jamais ouvrir config.promos. Or
     espacePaye() lit promoUsages et rend `paye: true` sans rien revérifier. Conséquence
     mesurée sur serveur isolé : n'importe quel compte du portail client s'offrait
     l'abonnement de son entreprise, à vie, en postant
     { promoCode:'PEU-IMPORTE', promoFin:'9999-12-31' } — un code inexistant faisait
     l'affaire, la date était crue sur parole, et maxUtilisations n'était jamais regardé.
     La requête est signée par Firebase, donc ce n'était pas ouvert à l'anonyme : c'était
     ouvert à tous nos clients, ce qui est pire, parce qu'ils ont une raison d'essayer.

     Trois contrôles, les mêmes que /api/monitor/espaces/promo et que le rattrapage
     d'espacePaye() — ce chemin-ci était le seul des trois à ne pas les faire :
       1. le code doit exister dans config.promos ;
       2. l'échéance se CALCULE depuis p.mois, elle ne se lit pas ;
       3. maxUtilisations se vérifie avant de compter, et un code déjà actif ne se
          prolonge pas — un seul code à la fois, comme depuis la Tour. */
  try {
    const pc = monStr(b.promoCode, 40).trim().toUpperCase();
    const pDef = pc ? (config.promos || []).find(x => String(x.code || '').trim().toUpperCase() === pc) : null;
    if (pDef) {
      const esp = Object.values(espacesReg).find(x => (x.email || '').toLowerCase() === email);
      let tEsp = esp && esp.t;
      if (esp && !tEsp) { try { tEsp = String(JSON.parse(Buffer.from(esp.code, 'base64').toString('utf8')).t || ''); } catch (e2) {} }
      const u = tEsp ? (promoUsages[pc] || { n: 0, equipes: {} }) : null;
      /* ⛔ UN CODE SERT UNE FOIS PAR ENTREPRISE (voir `promoPresente`) : déjà servi, il ne se
         réactive pas ici — le portail le renvoie à CHAQUE synchro tant que SA propre offre court.
         Une période encore en cours sous un ancien identifiant (« repartir à neuf ») se reporte. */
      const pres = u ? promoPresente(pc, tEsp, '') : null;
      /* Un autre code déjà en cours pour cet espace : on ne l'empile pas. Même règle, même
         raison qu'à la Tour — deux codes actifs rendent l'échéance réelle illisible. */
      let autre = '';
      if (pres && pres.etat === 'neuf') {
        const auj = new Date().toISOString().slice(0, 10);
        for (const [c2] of Object.entries(promoUsages || {})) {
          const eq2 = c2 !== pc ? promoServiA(c2, tEsp, '') : null;
          if (eq2 && eq2.finLe && eq2.finLe >= auj) { autre = c2; break; }
        }
      }
      const nouveau = !!(pres && pres.etat === 'neuf' && !autre && !(pDef.maxUtilisations && u.n >= pDef.maxUtilisations));
      if (nouveau || (pres && pres.reporte)) {
        let finLe = pres.finLe;
        if (nouveau) {
          const dF = new Date(); dF.setMonth(dF.getMonth() + Math.max(1, Number(pDef.mois) || 1));
          finLe = dF.toISOString().slice(0, 10);
          u.n++; u.equipes[tEsp] = promoEntree(finLe, tEsp, '');
          promoUsages[pc] = u; savePromoUsages();
        }
        /* ⛔ SANS CES DEUX LIGNES, LE CODE EST CONSOMMÉ ET L'APPLICATION RESTE VERROUILLÉE.
           espacePaye() sort sur « aucune formule » AVANT même de regarder promoUsages : un
           espace qui n'a pas encore de formule voyait donc son code décompté, recevait
           l'e-mail « formule offerte jusqu'au … », et restait fermé. Les deux autres chemins
           posent la formule (la Tour, et jadis la création automatique retirée le 28 septembre 2026) ; celui-ci
           l'avait oublié. Et `codePromo` est ce que relit le rattrapage d'espacePaye() quand
           un espace est recréé — sans lui, un code activé depuis le site est irrécupérable.
           La formule n'écrase que le vide ou le gratuit : la même règle qu'à la Tour, pour
           ne jamais rétrograder une entreprise qui paie déjà mieux. */
        const eMaj = espacesReg[esp.slug] || esp;
        const fPromo = ['pro', 'business', 'premium'].includes(pDef.formule) ? pDef.formule : 'premium';
        if (eMaj) {
          eMaj.codePromo = pc;
          const fE = facturationDe(eMaj).formule;   // (celle de l'ENTREPRISE : un autre de ses noms peut porter mieux)
          if (!fE || fE === 'gratuit') { eMaj.formule = fPromo; eMaj.quantite = eMaj.quantite || 1; eMaj.formulePar = 'code ' + pc + ' (site)'; eMaj.formuleTs = Date.now(); }
          espacesEcrire();
        }
        if (nouveau) { console.log('code promo du site relayé →', pc, tEsp, 'fin', finLe);
          mailPromoActive(tEsp, pc, finLe, fPromo); }
      }
    } else if (pc) {
      /* Le code seul, sans l'adresse ni l'espace : savoir qu'un code inconnu a été tenté
         est utile, savoir PAR QUI ne l'est pas — et ce journal n'est pas le bon endroit. */
      /* `monStr` n'est qu'un `slice` : un code de 40 caractères contenant un saut de ligne
         fabriquait une ENTRÉE DE JOURNAL FORGÉE dans journalctl. On ne journalise que ce qui
         ressemble à un code, et jamais l'adresse ni l'espace — la règle du dépôt. */
      console.log('code promo du site IGNORÉ (inconnu de config.promos) →', pc.replace(/[^A-Z0-9_-]/g, '·'));
    }
  } catch (e) {}
  // Nouvelle demande d'application → e-mail au patron (destinataire : config.notifDemandes,
  // sinon l'expéditeur SMTP). Au plus 1 mail par demande nouvellement apparue.
  try {
    const avant = (prev.demandes || []).length;
    /* ⛔ UN PLAFOND PAR ADRESSE (`gardien`, 28 septembre 2026) : « nouvelle demande » se juge à la LONGUEUR de la liste,
       et en alternant une liste vide et une liste d'une demande, un seul compte déclenchait deux courriels par requête —
       une centaine par minute dans la boîte du patron, qui noyaient les vraies demandes et épuisaient le quota d'envoi
       dont dépendent les liens et les codes de sécurité. Trois salves par heure et par adresse suffisent à un vrai client. */
    const salveOk = () => quotaOk(demandesQuota, 'dem:' + email, 3, 3600000);
    if (demandesQuota.size > 5000) demandesQuota = new Map();
    if (mailer && demandes.length > avant && !salveOk()) console.warn('demande : plafond d\'envoi atteint pour une adresse — courriels non envoyés', masqueMail(email));
    else if (mailer && demandes.length > avant) {
      const dest = (config.notifDemandes || config.smtp.from || config.smtp.user);
      const nv = demandes.slice(avant);
      /* ⛔⛔ PLUS DE CIRCUIT AUTOMATIQUE — Justin, 28 septembre 2026 : « c'est nous qui créons les liens pour les
         entreprises une fois leur demande faite » ; « oui, supprimer la création automatique ».
         Jusque-là une demande du site CRÉAIT l'espace (`espaceAutoPour`), activait le code promo de la demande,
         envoyait au client un CODE D'ACCÈS et marquait la demande « traitée » — sans que personne l'ait lue. Une
         demande ne crée plus RIEN : le patron la reçoit ici, la lit dans sa Tour, et c'est lui qui crée le lien
         (« Accepter la demande ») — formule, code promo de la demande, puis le lien et les identifiants par courriel
         (`/api/monitor/espaces/mail-acces`, qui passe aussi la fiche du portail à « Accès activé »).
         Le client reçoit l'accusé de réception : sa demande est arrivée, et c'est TEAM OP qui lui écrit la suite.
         ⚠️ Rien ici ne touche à promoUsages, à espacesReg, à `demandesTraitees` ni à la fiche du portail : une
         demande n'est pas une décision. `tests/test-841.js` le rejoue sur le vrai serveur. */
      const cli = clientsData[email] || {};
      const nomEnt = cli.entreprise || cli.nom || email;
      const dCode = [...nv].reverse().find(d => d.code) || {};
      let codeLigne = '';
      if (dCode.code) {
        /* Ce qu'on dit du code sort de config.promos, jamais de la demande : le client peut y écrire n'importe quoi. */
        const c = String(dCode.code).trim().toUpperCase();
        const p = (config.promos || []).find(x => String(x.code || '').trim().toUpperCase() === c);
        const cAff = c.replace(/[^A-Z0-9_-]/g, '·');
        codeLigne = p
          ? '🎁 Code promo « ' + cAff + ' » : connu — ' + (FORMULE_LBL[p.formule] || 'Business Premium') + ', ' + Math.max(1, Number(p.mois) || 1) + ' mois. Il s\'applique quand tu acceptes la demande (sauf s\'il a déjà servi à cette entreprise).\n'
          : '⚠️ Code « ' + cAff + ' » INCONNU — il ne s\'appliquera pas.\n';
      }
      const texte = 'Nouvelle demande d\'application sur teamop.fr — À TRAITER\n\n' +
        'Entreprise : ' + nomEnt + '\n' +
        'Contact : ' + (cli.nom || '—') + '\n' +
        'E-mail : ' + email + '\n' +
        'Téléphone : ' + (cli.tel || 'non renseigné') + '\n\n' +
        nv.map(d => '• ' + (d.app || 'Application') + (d.formule ? ' — formule « ' + d.formule + ' »' : ' — formule non précisée') + (d.users ? '\n  Utilisateurs souhaités : ' + d.users : '') + (d.lien ? '\n  Nom de lien souhaité : ' + d.lien : '') + (d.metier ? '\n  Métier : ' + (METIERS_LBL[d.metier] || d.metier) : '\n  Métier : non précisé') + (d.besoin && d.besoin !== 'x' ? '\n  Besoin : ' + d.besoin : '')).join('\n') +
        '\n\n' + codeLigne +
        '\n── À faire ──\nRien n\'a été créé. Ouvre ta Tour → la fiche de cette entreprise → « ✅ Accepter la demande » : l\'espace se crée, la formule, le métier et le code promo s\'appliquent, puis « 📧 Envoyer par e-mail au client » lui envoie son lien et ses identifiants.\n\nhttps://teamop.fr/tour.html';
      mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: dest,
        subject: '📥 Nouvelle demande à traiter — ' + nomEnt, text: texte })
        .then(() => console.log('mail demande envoyé →', masqueMail(dest), '(' + nv.length + ' demande' + (nv.length > 1 ? 's' : '') + ')'))   // le nombre, pas le texte libre du client
        .catch(e => console.error('mail demande:', sansAdresses(String((e && e.message) || e))));
      /* L'accusé au client : ce qui est arrivé, et ce qui va suivre — rien de plus. Pas de promesse sur le code promo :
         c'est à l'acceptation qu'on sait s'il s'applique. Tout ce qui vient du client est échappé dans la version HTML. */
      const escH = (x) => String(x || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      /* Une liste FERMÉE : `app` est du texte libre du client, et l'accusé part à son adresse sous l'en-tête TEAM OP —
         un texte à soi recopié dans un courriel à notre nom ferait de nous un relais (`gardien`). */
      const apps = [...new Set(nv.map(d => /messages/i.test(String(d.app || '')) ? 'OP MESSAGES' : 'OP GESTION'))].join(', ');
      const accuse = 'Bonjour,\n\n' +
        'Nous avons bien reçu votre demande d\'accès (' + apps + ') pour « ' + nomEnt + ' ».\n\n' +
        'L\'équipe TEAM OP prépare votre espace : vous recevrez très vite, par e-mail, votre lien de connexion et vos identifiants. Vous n\'avez rien d\'autre à faire.\n\n' +
        'Vous pouvez suivre ou modifier votre demande dans votre espace client : https://teamop.fr/espace.html\n\n' +
        '— L\'équipe TEAM OP · teamop.fr';
      const accuseHtml = mailTeamOP({
        chip: 'Demande reçue',
        titre: 'Votre demande est bien reçue',
        corpsHtml: 'Bonjour,<br>nous avons bien reçu votre demande d\'accès (<b>' + escH(apps) + '</b>) pour « <b>' + escH(nomEnt) + '</b> ».<br><br>' +
          'L\'équipe TEAM OP prépare votre espace : vous recevrez très vite, par e-mail, <b>votre lien de connexion et vos identifiants</b>. Vous n\'avez rien d\'autre à faire.<br>',
        frise: [
          { titre: 'Reçue', sous: 'aujourd\'hui', fait: true },
          { titre: 'Préparation', sous: 'par TEAM OP', fait: false },
          { titre: 'Connectez-vous', sous: 'avec votre lien', fait: false }
        ],
        boutonTxt: 'Mon espace client', boutonUrl: 'https://teamop.fr/espace.html'
      });
      mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: email,
        subject: '📥 Votre demande est bien reçue — TEAM OP', text: accuse, html: accuseHtml })
        .then(() => console.log('accusé de demande envoyé →', masqueMail(email)))
        .catch(e => console.error('accusé de demande:', sansAdresses(String((e && e.message) || e))));
    }
  } catch (e) { console.error('notif demande:', e && e.message); }
  res.json({ ok: true });
});
// lecture depuis le contrôle (patron ET collaborateurs)
/* ══ LES VRAIS COMPTES DU SITE, LUS CHEZ FIREBASE ══════════════════════════════════════
   /api/monitor/clients ci-dessous est bâtie sur clientsData, qui ne se remplit qu'à la
   PREMIÈRE CONNEXION d'une entreprise. Un compte créé sur espace.html et jamais utilisé
   pour ouvrir un espace n'y figure donc pas : il existe chez Firebase et n'apparaît NULLE
   PART dans la Tour. C'est ce trou qui rendait le ménage impossible — on retrouvait ces
   comptes dans le trousseau de son navigateur, plus dans la console.

   Cette route interroge Firebase directement, et ne rend que ce qu'il faut pour trier :
   l'adresse, les dates, et si un espace lui est rattaché. Firebase ne rend pas les mots de
   passe et on ne demande rien d'autre. Réservée à la Tour (monAdmin) : ce sont des adresses
   de clients réels. */
app.get('/api/monitor/comptes-site', monAdmin, async (req, res) => {
  const tok = await fbAdminJeton();
  /* Nos comptes (`comptes.js`) se listent même sans Google : c'est eux que le portail utilise
     après la bascule, et Google finira éteint. */
  let cm = null, pm = null; try { cm = comptes; pm = portail; } catch (e) {}
  if (!tok && !cm) return res.status(503).json({ error: 'clé admin Firebase absente sur le serveur (firebase-admin.json)' });
  /* Les fiches d'inscription, lues EN UNE PASSE puis croisées par uid. Une requête par
     compte aurait fait des centaines d'allers-retours ; et sans elles on n'a que l'adresse,
     alors qu'il faut le nom de la personne et son entreprise pour supprimer sans se tromper. */
  const fiches = {};
  if (tok) {
  const val = f => f && (f.stringValue !== undefined ? f.stringValue
    : f.integerValue !== undefined ? f.integerValue
    : f.timestampValue !== undefined ? f.timestampValue : '');
  try {
    let pt = '';
    for (let tour = 0; tour < 20; tour++) {
      const r = await fbAdminFetch(fsBase() + '/teamop_requests?pageSize=300' + (pt ? '&pageToken=' + encodeURIComponent(pt) : ''), { method: 'GET' }, tok);
      if (!r.ok) break;                       // pas de fiches lisibles : on continue sans, l'adresse seule vaut mieux que rien
      const j = await r.json().catch(() => ({}));
      for (const d of (j.documents || [])) {
        const uid = String(d.name || '').split('/').pop();
        const f = d.fields || {};
        fiches[uid] = {
          nom: String(val(f.name) || ((val(f.prenom) + ' ' + val(f.nom)).trim())).slice(0, 80),
          societe: String(val(f.company) || '').slice(0, 80),
          statut: String(val(f.status) || '').slice(0, 30)
        };
      }
      pt = j.nextPageToken || ''; if (!pt) break;
    }
  } catch (e) { /* sans fiches, la liste reste utilisable : on ne bloque pas dessus */ }

  }
  const lignes = []; let anonymes = 0; let pageTok = '';
  if (tok) try {
    for (let tour = 0; tour < 20; tour++) {
      const url = IDTK_URL + '/projects/' + FB_PROJET
        + '/accounts:batchGet?maxResults=500' + (pageTok ? '&nextPageToken=' + encodeURIComponent(pageTok) : '');
      const r = await fbAdminFetch(url, { method: 'GET' }, tok);
      if (!r.ok) { if (cm) break; return res.status(502).json({ error: 'Firebase a refusé la lecture (HTTP ' + r.status + ')' }); }
      const j = await r.json().catch(() => ({}));
      for (const u of (j.users || [])) {
        const mail = String(u.email || '').trim().toLowerCase();
        /* ⛔ LES COMPTES ANONYMES NE SONT PAS DES PERSONNES — ne jamais les lister ici.
           app.html ouvre une session anonyme par appareil (syncAuth), parce que les règles
           Firestore exigent un utilisateur connecté pour synchroniser. Il y en a donc autant
           que d'appareils chez les clients : ils n'ont ni adresse, ni nom, et EN SUPPRIMER UN
           COUPERAIT LA SYNCHRO DE L'APPAREIL CORRESPONDANT. Ils sont comptés, pas montrés. */
        if (!mail) { anonymes++; continue; }
        const fi = fiches[u.localId] || {};
        lignes.push({
          email: mail,
          nom: fi.nom || '',
          societe: fi.societe || '',
          statut: fi.statut || '',
          cree: Number(u.createdAt || 0) || 0,
          derniere: Number(u.lastLoginAt || 0) || 0,
          verifie: !!u.emailVerified,
          desactive: !!u.disabled,
          /* Le point décisif pour trier : ce compte porte-t-il une entreprise avec des
             données, ou n'est-ce qu'un compte d'essai qu'on peut effacer sans rien perdre ? */
          entreprise: clientsData[mail] ? (clientsData[mail].entreprise || clientsData[mail].nom || '') : '',
          aUnEspace: !!clientsData[mail]
        });
      }
      pageTok = j.nextPageToken || ''; if (!pageTok) break;
    }
  } catch (e) { if (!cm) return res.status(502).json({ error: 'lecture Firebase impossible : ' + String(e.message).slice(0, 120) }); }
  /* Les comptes maison, fusionnés par adresse : une personne présente des deux côtés (reprise de
     Google, compte « à poser ») n'est qu'UNE ligne, qui dit qu'elle existe chez nous. */
  if (cm) {
    const parMail = new Map(lignes.map(x => [x.email, x]));
    for (const c of cm.liste()) {
      const dos = pm ? pm.dossierDe(c.email) : null;
      const deja = parMail.get(c.email);
      if (deja) { deja.chezNous = true; deja.aPoser = c.aPoser; continue; }
      lignes.push({ email: c.email,
        nom: ((c.prenom + ' ' + c.nom).trim() || (dos && ((dos.prenom || '') + ' ' + (dos.nom || '')).trim()) || '').slice(0, 80),
        societe: String(c.societe || (dos && dos.company) || '').slice(0, 80),
        statut: String((dos && dos.status) || '').slice(0, 30),
        cree: c.cree || 0, derniere: c.maj || 0, verifie: c.verifie, desactive: false,
        entreprise: clientsData[c.email] ? (clientsData[c.email].entreprise || clientsData[c.email].nom || '') : '',
        aUnEspace: !!clientsData[c.email], chezNous: true, aPoser: c.aPoser });
    }
  }
  lignes.sort((a, b) => (b.cree || 0) - (a.cree || 0));
  res.json({ comptes: lignes, total: lignes.length, anonymes, google: !!tok });
});

/* Suppression d'un compte du site — patron seulement, et JAMAIS un compte qui porte une
   entreprise : celui-là passe par « Fermer définitivement », qui efface aussi son espace,
   son code d'accès et ses données chiffrées. Effacer le compte seul laisserait un espace
   orphelin que plus personne ne pourrait rouvrir. */
app.post('/api/monitor/comptes-site/supprimer', monPatronStrict, async (req, res) => {
  const email = monStr((req.body || {}).email, 160).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'adresse invalide' });
  if (clientsData[email]) return res.status(409).json({
    error: 'ce compte porte une entreprise — passe par « Fermer définitivement » dans Entreprises, qui efface aussi son espace et ses données'
  });
  const r = await compteSiteSupprimer(email);
  // Journal : l'adresse est masquée, on ne met pas de données personnelles dans les logs.
  console.log('compte site supprimé ' + masqueMail(email) + ' : ' + (r.fait ? 'ok' : 'échec — ' + r.motif));
  if (!r.fait) return res.status(400).json({ error: r.motif });
  res.json({ ok: true, detail: r.motif });
});

app.get('/api/monitor/clients', monAdmin, (req, res) => {
  const list = Object.values(clientsData).sort((a, b) => (b.majTs || 0) - (a.majTs || 0));
  res.json({ clients: list, total: list.length });
});
// métier du client : c'est lui qui décide du pack livré, et qui sépare les évolutions par métier
app.post('/api/monitor/clients/metier', monAdmin, (req, res) => {
  const email = monStr((req.body || {}).email, 120).toLowerCase();
  const c = clientsData[email];
  if (!c) return res.status(404).json({ error: 'client introuvable' });
  const met = monStr((req.body || {}).metier, 30);
  c.metier = met;
  c.metierPar = met ? (req.tourUser.nom + ' · ' + new Date().toLocaleDateString('fr-FR')) : '';
  cliSave();
  res.json({ ok: true, client: c });
});
// historique complet : tout ce qui est sorti de la liste vivante, jamais supprimé
app.get('/api/monitor/issues/archive', monAdmin, (req, res) => {
  const visible = i => req.tourUser.apps.includes(monAppDeTag(i.app));   // même filtre que /issues
  const archive = monArchive.filter(visible);
  res.json({ archive, total: archive.length, vivants: monIssues.filter(visible).length });
});
// note interne sur un client (tracée)
app.post('/api/monitor/clients/note', monAdmin, (req, res) => {
  const email = monStr((req.body || {}).email, 120).toLowerCase();
  const c = clientsData[email];
  if (!c) return res.status(404).json({ error: 'client introuvable' });
  const note = monStr((req.body || {}).note, 500);
  c.noteInterne = note ? (note + '\n— ' + req.tourUser.nom + ', ' + new Date().toLocaleDateString('fr-FR')) : '';
  cliSave();
  res.json({ ok: true, client: c });
});
// marquer une demande d'accès traitée côté contrôle (suivi interne, tracé)
app.post('/api/monitor/clients/demande', monAdmin, (req, res) => {
  const email = monStr((req.body || {}).email, 120).toLowerCase();
  const c = clientsData[email];
  if (!c) return res.status(404).json({ error: 'client introuvable' });
  const idx = parseInt((req.body || {}).idx, 10);
  if (!(idx >= 0 && idx < (c.demandes || []).length)) return res.status(400).json({ error: 'demande introuvable' });
  c.demandesTraitees = c.demandesTraitees || {};
  if ((req.body || {}).traite === false) delete c.demandesTraitees[idx];
  else c.demandesTraitees[idx] = { par: req.tourUser.nom, ts: Date.now() };
  cliSave();
  res.json({ ok: true, client: c });
});

// ═══════════════════════════════════════════════════════════════════════════
// 💳 STRIPE — lecture seule des abonnements et des paiements pour la tour de contrôle.
//    La clé secrète reste dans /opt/teamop/config.json (set-stripe.sh) : elle ne sort JAMAIS du serveur.
//    Résultats gardés 5 minutes en mémoire pour ne pas interroger Stripe à chaque ouverture de page.
//    Si Stripe ne répond pas : on renvoie le dernier résultat connu, sinon une liste vide + un message.
// ═══════════════════════════════════════════════════════════════════════════
const STRIPE_MON_TTL = 5 * 60000;   // fraîcheur du cache : 5 minutes
const STRIPE_MON_PAUSE = 60000;     // après un échec Stripe : on attend 1 minute avant de retenter
//   ts = date des chiffres en cache · echec = date du dernier échec · encours = appel déjà en route (deux
//   onglets ouverts n'interrogent Stripe qu'une seule fois)
const stripeMonCache = { abos: { ts: 0, data: null, echec: 0, encours: null }, paiements: { ts: 0, data: null, echec: 0, encours: null } };
const stripeEur = n => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
const STRIPE_INDISPO = 'Connexion à Stripe impossible pour le moment — réessaie dans quelques minutes.';
// journalisation sans jamais recopier un morceau de la clé Stripe dans les journaux du serveur
const stripeLog = e => String((e && e.message) || e).replace(/\b(sk|rk|pk)_[A-Za-z0-9_*]+/g, '[clé]').slice(0, 200);
// chiffres périmés : on les renvoie plutôt que rien, mais clairement marqués (la tour affiche leur date)
function stripeVieux(c, vide) {
  if (c.data) return Object.assign({}, c.data, { perime: true, majTs: c.ts, erreur: STRIPE_INDISPO });
  return Object.assign({}, vide, { erreur: STRIPE_INDISPO });
}
// un seul appel Stripe à la fois par jeu de données, et pas de nouvelle tentative pendant 1 minute après un échec
function stripeCache(c, vide, calcul, quoi) {
  if (c.data && !c.echec && Date.now() - c.ts < STRIPE_MON_TTL) return Promise.resolve(c.data);
  if (c.echec && Date.now() - c.echec < STRIPE_MON_PAUSE) return Promise.resolve(stripeVieux(c, vide));
  if (!c.encours) {
    c.encours = calcul()
      .then(out => { c.data = out; c.ts = Date.now(); c.echec = 0; return out; })
      .catch(e => { console.error(quoi + ':', stripeLog(e)); c.echec = Date.now(); return stripeVieux(c, vide); })
      .then(d => { c.encours = null; return d; }, e => { c.encours = null; throw e; });
  }
  return c.encours;
}

// appel GET vers l'API Stripe (même principe que /api/stripe/prices : Authorization Bearer + clé serveur)
async function stripeMonGet(url, sk) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);   // pas d'attente infinie si Stripe ne répond pas
  try {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + sk }, signal: ctrl.signal });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d.error && d.error.message) || ('stripe HTTP ' + r.status));
    return d;
  } finally { clearTimeout(t); }
}
// le client peut arriver sous forme d'objet (expand) ou d'identifiant seul, et peut avoir été supprimé
function stripeClient(c) {
  if (!c || typeof c !== 'object' || c.deleted) return { nom: '', email: '' };
  return { nom: monStr(c.name, 120), email: monStr(c.email, 120) };
}

// ── Abonnements en cours + revenu mensuel récurrent
const STRIPE_ABOS_VIDE = { ok: true, configured: true, abos: [], mrr: 0, actifs: 0, impayes: 0 };
// Stripe ne renvoie que 100 abonnements par appel : on tourne les pages tant qu'il en reste
// (sinon, dès qu'une centaine d'abonnements auront existé, des abonnés actifs disparaîtraient sans bruit).
let stripeAbosDetail = null;   // niveau de détail accepté par ce compte Stripe (retenu pour ne pas retâtonner)
async function stripeAbosBruts(sk) {
  const base = 'https://api.stripe.com/v1/subscriptions?limit=100&status=all&expand[]=data.customer';
  // on demande le maximum de détails ; si le compte Stripe refuse une expansion, on redemande en dégradant
  const details = ['&expand[]=data.items.data.price.product&expand[]=data.discounts.coupon',
                   '&expand[]=data.items.data.price.product', ''];
  if (stripeAbosDetail !== null) details.unshift(stripeAbosDetail);
  let sfx = null, prem = null, dernErr = null;
  for (const o of details) {
    try { prem = await stripeMonGet(base + o, sk); sfx = o; break; } catch (e) { dernErr = e; }
  }
  if (sfx === null) throw dernErr || new Error('stripe abonnements');
  stripeAbosDetail = sfx;
  let tous = (prem.data || []).slice();
  let apres = tous.length ? tous[tous.length - 1].id : '';
  let encore = !!prem.has_more, pages = 0;
  while (encore && apres && ++pages < 10) {   // plafond de sécurité : 10 pages = 1000 abonnements
    const d2 = await stripeMonGet(base + sfx + '&starting_after=' + encodeURIComponent(apres), sk);
    const lot = d2.data || [];
    tous = tous.concat(lot);
    apres = lot.length ? lot[lot.length - 1].id : '';
    encore = !!d2.has_more;
  }
  /* ⛔ UNE LISTE TRONQUÉE N'EST PAS UNE LISTE (seconde relecture de `gardien`, 30 septembre 2026). Stripe liste du plus
     récent au plus ancien, et `status=all` compte les abonnements résiliés : au plafond, les PLUS ANCIENS clients
     disparaissaient sans un mot — et depuis qu'une entreprise qui ne paie pas est suspendue, une entreprise qui paie
     depuis le début l'aurait été. On jette : pour `stripeListe` c'est une lecture ratée (la dernière liste connue sert,
     sinon le doute, `stripeVerdict`), `/health` le compte (`stripeEchecMin`) et le journal dit quoi faire. */
  if (encore) {
    console.error('⛔ liste Stripe TRONQUÉE au plafond (' + tous.length + ' abonnements, il en reste) — rien n\'est décidé sur une liste incomplète : relever le plafond de stripeAbosBruts');
    throw new Error('liste Stripe tronquée au plafond (' + tous.length + ' abonnements)');
  }
  return tous;
}
// périodicité lisible : « mois », « an », « 3 mois »… (interval_count > 1 : tarif trimestriel, semestriel, etc.)
function stripePeriode(inter, n) {
  const un = { month: 'mois', year: 'an', week: 'semaine', day: 'jour' }[inter];
  if (!un) return '';
  if (n <= 1) return un;
  return n + ' ' + (inter === 'month' ? 'mois' : inter === 'year' ? 'ans' : inter === 'week' ? 'semaines' : 'jours');
}
async function stripeAbosCalc(sk) {
  const bruts = await stripeAbosBruts(sk);
  let mrr = 0, actifs = 0, impayes = 0;
  const abos = bruts.map(s => {
    const items = (s.items && Array.isArray(s.items.data)) ? s.items.data : [];
    let montant = 0, mensuel = 0, periodicite = '', libelles = [];
    for (const it of items) {
      const px = it && it.price;
      if (!px) continue;
      const qte = Math.max(1, parseInt(it.quantity, 10) || 1);
      const ligne = ((parseInt(px.unit_amount, 10) || 0) / 100) * qte;
      montant += ligne;
      const inter = px.recurring && px.recurring.interval;
      const n = Math.max(1, parseInt(px.recurring && px.recurring.interval_count, 10) || 1);   // « tous les 3 mois » = 3
      // tout est ramené au mois pour le compteur « revenu mensuel »
      if (inter === 'month') mensuel += ligne / n;
      else if (inter === 'year') mensuel += ligne / (12 * n);
      else if (inter === 'week') mensuel += ligne * 52 / (12 * n);
      else if (inter === 'day') mensuel += ligne * 365 / (12 * n);
      if (!periodicite) periodicite = stripePeriode(inter, n);
      const nom = (px.product && typeof px.product === 'object' ? monStr(px.product.name, 80) : '') || monStr(px.nickname, 80);
      if (nom && libelles.indexOf(nom) === -1) libelles.push(nom);
    }
    // remises et codes promo (le paiement en ligne accepte les codes promo) : le montant affiché doit être celui payé
    const plein = montant;
    const rems = (Array.isArray(s.discounts) ? s.discounts : (s.discount ? [s.discount] : [])).map(x => x && x.coupon).filter(Boolean);
    for (const co of rems) {
      if (co.percent_off) montant *= (1 - co.percent_off / 100);
      else if (co.amount_off) montant = Math.max(0, montant - co.amount_off / 100);
    }
    if (plein > 0 && montant !== plein) mensuel *= (montant / plein);   // la remise vaut aussi pour le revenu mensuel
    const st = String(s.status || '');
    const statut = st === 'active' ? 'actif' : st === 'trialing' ? 'essai'
      : (st === 'past_due' || st === 'unpaid') ? 'impaye'
      : st === 'canceled' ? 'annule'
      : st.indexOf('incomplete') === 0 ? 'incomplet' : 'autre';
    /* ⛔ un abonnement EN ESSAI n'a encore rien versé : il compte parmi les abonnements, pas dans le revenu mensuel. Payer pendant
       une période offerte le diffère jusqu'à la fin du code (`finEssaiPeriode`) — sans ça, tous ces clients gonflaient le chiffre
       que la Tour pose à côté de « N payants » (`gardien`, 29 septembre 2026) */
    if (statut === 'actif' || statut === 'essai') actifs++;
    if (statut === 'actif') mrr += mensuel;
    if (statut === 'impaye') impayes++;
    const cli = stripeClient(s.customer);
    // selon la version d'API, la fin de période est portée par l'abonnement ou par sa première ligne
    const fin = parseInt(s.current_period_end, 10) || parseInt(items[0] && items[0].current_period_end, 10) || 0;
    return { id: monStr(s.id, 60), clientNom: cli.nom, clientEmail: cli.email,
      formule: libelles.join(' + '), montant: stripeEur(montant), periodicite, statut,
      debut: (parseInt(s.start_date, 10) || 0) * 1000, prochaine: fin * 1000 };
  });
  return { ok: true, configured: true, abos, mrr: stripeEur(mrr), actifs, impayes };
}
app.get('/api/monitor/stripe/abos', monAdmin, async (req, res) => {
  const sk = config.stripe && config.stripe.secretKey;
  if (!sk) return res.json({ ok: true, configured: false, abos: [], mrr: 0, actifs: 0, impayes: 0 });
  try { res.json(await stripeCache(stripeMonCache.abos, STRIPE_ABOS_VIDE, () => stripeAbosCalc(sk), 'stripe abos')); }
  catch (e) { console.error('stripe abos:', stripeLog(e)); res.json(Object.assign({}, STRIPE_ABOS_VIDE, { erreur: STRIPE_INDISPO })); }
});

// ── Alerte automatique : un paiement en échec des 7 derniers jours devient un problème dans la tour
//    (même structure d'objet et même sauvegarde que /api/monitor/report, dédoublonnage par signature)
function stripeAlerteImpaye(paiements) {
  const lim = Date.now() - 7 * 86400000;
  let change = false;
  for (const p of paiements) {
    if (p.statut !== 'echec' || !(p.date > lim)) continue;
    const signature = 'stripe|paiement-echec|' + p.id;   // une entrée par facture : jamais de doublon
    const nom = p.clientNom || p.clientEmail || 'client inconnu';
    const quand = p.date || Date.now();
    let issue = monIssues.find(i => i.signature === signature);
    if (!issue) {
      issue = { id: 'i' + crypto.randomBytes(6).toString('hex'), signature, app: 'stripe', version: '',
        categorie: 'Paiements', type: 'reseau', message: monStr('Paiement en échec — ' + nom, 300),
        stack: '', src: '', line: 0, entreprises: [], appareils: {}, count: 1,
        firstTs: quand, lastTs: quand, statut: 'nouveau', notes: '', mailEnvoye: false };
      if (nom !== 'client inconnu') issue.entreprises.push({ nom: monStr(nom, 80), email: monStr(p.clientEmail, 120), count: 1, lastTs: quand });
      monIssues.push(issue); change = true;
    } else if ((issue.lastTs || 0) < quand) { issue.lastTs = quand; change = true; }
  }
  if (change) monSave();
}

// ── Derniers paiements (factures) + nombre d'échecs
const STRIPE_PAY_VIDE = { ok: true, configured: true, paiements: [], echecs: 0 };
const STRIPE_PAY_URL = 'https://api.stripe.com/v1/invoices?limit=50&expand[]=data.customer';
// une facture Stripe → une ligne de paiement (renvoie null pour ce qui n'est pas un paiement)
function stripePaiement(f) {
  if (!f || typeof f !== 'object') return null;
  const st = String(f.status || '');
  if (st === 'draft') return null;   // brouillon jamais envoyé : ce n'est pas un paiement
  let statut = st === 'paid' ? 'paye' : st === 'open' ? 'ouvert'
    : st === 'uncollectible' ? 'echec' : st === 'void' ? 'annule' : 'autre';   // « annulée » par vous ≠ échec de paiement
  if (f.attempted && !f.paid && statut !== 'paye' && statut !== 'annule') statut = 'echec';   // tentative de prélèvement refusée
  const cli = stripeClient(f.customer);
  const cents = parseInt(f.amount_paid, 10) || parseInt(f.amount_due, 10) || 0;
  const paidAt = parseInt(f.status_transitions && f.status_transitions.paid_at, 10) || 0;
  const lien = String(f.hosted_invoice_url || '');
  return { id: monStr(f.id, 60),
    clientNom: cli.nom || monStr(f.customer_name, 120), clientEmail: cli.email || monStr(f.customer_email, 120),
    montant: stripeEur(cents / 100), date: (paidAt || parseInt(f.created, 10) || 0) * 1000,
    statut, url: /^https:\/\//.test(lien) ? monStr(lien, 400) : '' };   // seule une vraie adresse Stripe est transmise
}
function stripePaiements(d) { return ((d && d.data) || []).map(stripePaiement).filter(Boolean); }
// factures encore impayées des 30 derniers jours : c'est là-dessus que se comptent les échecs et les alertes,
// pour qu'un impayé ne sorte pas du compteur simplement parce que 50 factures récentes sont passées devant.
function stripeImpayesUrl() {
  return 'https://api.stripe.com/v1/invoices?status=open&limit=100&expand[]=data.customer&created[gte]=' + Math.floor((Date.now() - 30 * 86400000) / 1000);
}
async function stripePaiementsCalc(sk) {
  const paiements = stripePaiements(await stripeMonGet(STRIPE_PAY_URL, sk));
  const parId = {};
  paiements.filter(p => p.statut === 'echec').forEach(p => { parId[p.id] = p; });
  try { stripePaiements(await stripeMonGet(stripeImpayesUrl(), sk)).forEach(p => { if (p.statut === 'echec') parId[p.id] = p; }); }
  catch (e) { console.error('stripe impayés:', stripeLog(e)); }   // liste affichée quand même : on garde les échecs déjà vus
  const echecs = Object.keys(parId);
  try { stripeAlerteImpaye(echecs.map(k => parId[k])); } catch (e) { console.error('stripe alerte:', stripeLog(e)); }
  return { ok: true, configured: true, paiements, echecs: echecs.length };
}
app.get('/api/monitor/stripe/paiements', monAdmin, async (req, res) => {
  const sk = config.stripe && config.stripe.secretKey;
  if (!sk) return res.json({ ok: true, configured: false, paiements: [], echecs: 0 });
  try { res.json(await stripeCache(stripeMonCache.paiements, STRIPE_PAY_VIDE, () => stripePaiementsCalc(sk), 'stripe paiements')); }
  catch (e) { console.error('stripe paiements:', stripeLog(e)); res.json(Object.assign({}, STRIPE_PAY_VIDE, { erreur: STRIPE_INDISPO })); }
});
// ── Veille : les impayés remontent tout seuls, même si personne n'ouvre la tour de contrôle du week-end
if (config.stripe && config.stripe.secretKey) {
  setInterval(() => {
    stripeMonGet(stripeImpayesUrl(), config.stripe.secretKey)
      .then(d => stripeAlerteImpaye(stripePaiements(d)))
      .catch(e => console.error('stripe veille:', stripeLog(e)));
  }, 15 * 60000).unref();
}

// ═══ MESSAGERIE COMPLÈTE (plusieurs boîtes : réception, envoi, dossiers, pièces jointes) ═══
try {
  const pousseNotif = async (titre, corps, url) => {
    const payload = JSON.stringify({ title: String(titre).slice(0, 120), body: String(corps || '').slice(0, 300), url: url || '/tour.html#support' });
    const cibles = Object.values(subs).filter(x => /^teamop-controle/.test(x.teamId || ''));
    for (const t of cibles) {
      try { await webpush.sendNotification(t.sub, payload); }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { delete subs[t.sub.endpoint]; saveSubs(); } }
    }
    return cibles.length;
  };
  /* `mailProtege` : les e-mails de sécurité que la Messagerie montre sans jamais les déplacer, les supprimer
     ni les marquer (voir plus haut). Et on garde ses boîtes (sans mot de passe) : `supprDestLisible` doit
     savoir si le code d'une suppression y atterrirait. */
  messagerieTour = require('./mail')(app, { DATA_DIR, monAdmin, monPatronStrict, monStr, pousseNotif, mailProtege });
  console.log('messagerie : module chargé');
} catch (e) { console.error('messagerie indisponible :', e.message); }

/* ══════════ DEVIS IA — génération de devis par Claude ══════════
   La clé API vit UNIQUEMENT dans /opt/teamop/config.json → bloc "anthropic" :
     "anthropic": { "cleApi": "sk-ant-…", "secretDevis": "<code partagé à l'équipe>", "quotaJour": 100 }
   Elle ne transite jamais par le navigateur ni par le dépôt. L'app envoie le
   code d'équipe + la demande ; le serveur appelle Claude et renvoie les lignes. */
const DEVIS_QUOTA_PATH = path.join(DATA_DIR, 'devis-quota.json');
let devisQuota = { jour: '', n: 0 };
try { devisQuota = JSON.parse(fs.readFileSync(DEVIS_QUOTA_PATH, 'utf8')); } catch (e) {}
function devisConf() { return config.anthropic || {}; }
function devisActif() { return !!devisConf().cleApi; }
/* ── Le Devis IA tourne sur Gemini, pas sur Claude ────────────────────────────────
   Deux raisons. La première est le prix : Google offre un palier gratuit, et un devis
   n'a pas besoin du modèle le plus cher du marché — c'est de la rédaction structurée à
   partir de prix qu'on lui donne, pas du raisonnement difficile.
   La seconde suit de la première : sur ce palier gratuit, Google se réserve le droit
   d'exploiter ce qu'on lui envoie. On lui envoie donc le strict nécessaire pour
   chiffrer — la prestation — et RIEN qui identifie le client. Ni son nom, ni son
   adresse : ils ne servent pas à faire un prix, et ils ne sont pas à nous.
   La clé vit UNIQUEMENT dans /opt/teamop/config.json → "gemini" :
     "gemini": { "cleApi": "…", "modele": "gemini-3.7-flash" }
   Elle se pose avec server/set-gemini.sh, qui la vérifie avant de l'écrire. */
function geminiConf() { return config.gemini || {}; }
function geminiActif() { return !!geminiConf().cleApi; }
function geminiModele() { return String(geminiConf().modele || 'gemini-3.7-flash'); }
async function geminiGenere(sys, texte, schema) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + encodeURIComponent(geminiModele()) + ':generateContent?key=' + encodeURIComponent(geminiConf().cleApi);
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: texte }] }],
      systemInstruction: { parts: [{ text: sys }] },
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema }
    })
  });
  const txt = await r.text();
  let j = null; try { j = JSON.parse(txt); } catch (e) {}
  if (!r.ok) {
    /* Google répond 400 pour une clé invalide, pas 401 : on lit le motif plutôt que le
       code, sinon « clé morte » et « requête malformée » se confondent. */
    const motif = (j && j.error && (j.error.status || j.error.message)) || ('HTTP ' + r.status);
    const e = new Error(String(motif).slice(0, 200));
    e.geminiCle = /API_KEY_INVALID|API key not valid/i.test(txt);
    e.geminiQuota = r.status === 429 || /RESOURCE_EXHAUSTED/i.test(txt);
    e.geminiModele = r.status === 404 || /NOT_FOUND/i.test(txt);
    throw e;
  }
  const part = j && j.candidates && j.candidates[0] && j.candidates[0].content
    && j.candidates[0].content.parts && j.candidates[0].content.parts[0];
  const sortie = part && part.text;
  if (!sortie) throw new Error('réponse vide');
  return JSON.parse(sortie);
}
/* ── Accès par entreprise : activé depuis la Tour de contrôle — aucun code ni clé ne
   circule chez les clients. data/devis-acces.json : { "<espace>": { actif, depuis, n, dernier } }
   L'ancien code partagé (secretDevis) reste accepté en dépannage tant qu'il est configuré. */
const DEVIS_ACCES_PATH = path.join(DATA_DIR, 'devis-acces.json');
let devisAcces = {};
try { devisAcces = JSON.parse(fs.readFileSync(DEVIS_ACCES_PATH, 'utf8')); } catch (e) {}
function saveDevisAcces() { try { fs.writeFileSync(DEVIS_ACCES_PATH, JSON.stringify(devisAcces)); } catch (e) {} }
function devisTeamOk(team) { const t = devisAcces[String(team || '').trim().slice(0, 80)]; return !!(t && t.actif); }
function devisQuotaJour() { return Number(devisConf().quotaJour) || 100; }
function devisUtilises() {
  const auj = new Date().toISOString().slice(0, 10);
  if (devisQuota.jour !== auj) devisQuota = { jour: auj, n: 0 };
  return devisQuota.n;
}
function devisCompte() { devisUtilises(); devisQuota.n++; try { fs.writeFileSync(DEVIS_QUOTA_PATH, JSON.stringify(devisQuota)); } catch (e) {} }

app.get('/api/devis/etat', (req, res) => {
  const team = String(req.query.team || '').trim().slice(0, 80);
  const rep = { ok: true, actif: devisActif(), quotaJour: devisQuotaJour(), utilises: devisUtilises(), restants: Math.max(0, devisQuotaJour() - devisUtilises()) };
  if (team) rep.equipe = devisActif() && devisTeamOk(team);
  /* L'application n'affiche le second bouton que si l'entreprise y a droit. */
  if (team) { rep.offre = devisOffre(team); rep.approfondi = devisActif() && devisTeamOk(team) && rep.offre === 'deux'; }
  res.json(rep);
});

let anthropicClient = null;
function getAnthropic() {
  if (!anthropicClient) {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey: devisConf().cleApi });
  }
  return anthropicClient;
}

/* Génération d'un devis structuré par Claude — l'équivalent de geminiGenere.
   `output_config.format` impose le schéma, comme `responseSchema` chez Google :
   la réponse est du JSON conforme, pas du texte à deviner.
   Une seule clé alimente désormais tout : EXPLIQUE, PROPOSE, l'assistant et ce
   générateur. Une clé de moins à poser, à renouveler et à surveiller. */
/* Deux moteurs, une seule clé. Haiku est inclus dans l'abonnement ; Sonnet est
   le supplément payant. C'est le même appel — seul l'identifiant de modèle
   change, donc aucune dépendance ni panne supplémentaire à surveiller. */
const DEVIS_MOTEURS = {
  haiku:  { modele: 'claude-haiku-4-5-20251001', libelle: 'Haiku 4.5 · inclus' },
  sonnet: { modele: 'claude-sonnet-5',           libelle: 'Sonnet 5 · supplément' },
};
const DEVIS_MOTEUR_DEFAUT = 'haiku';
/* Trois offres possibles par entreprise :
     haiku  — inclus seulement
     sonnet — supplément seulement
     deux   — les deux, l'utilisateur choisit devis par devis */
const DEVIS_OFFRES = { haiku: 1, sonnet: 1, deux: 1 };
function devisOffre(team) {
  const x = devisAcces[String(team || '').trim().slice(0, 80)];
  const m = (x && x.moteur) || DEVIS_MOTEUR_DEFAUT;
  return DEVIS_OFFRES[m] ? m : DEVIS_MOTEUR_DEFAUT;
}
/* Deux étages de décision :
     — le patron ouvre (ou non) le supplément à une entreprise ;
     — l'utilisateur choisit ensuite, devis par devis, rapide ou approfondi.
   Sans supplément, « approfondi » est simplement ignoré : personne ne peut
   s'octroyer Sonnet en modifiant sa requête. */
function devisMoteurChoisi(team, profond) {
  const o = devisOffre(team);
  if (o === 'sonnet') return 'sonnet';
  if (o === 'deux') return profond ? 'sonnet' : DEVIS_MOTEUR_DEFAUT;
  return DEVIS_MOTEUR_DEFAUT;
}
function devisMoteur(team) {
  const t = devisAcces[String(team || '').trim().slice(0, 80)];
  const m = (t && t.moteur) || DEVIS_MOTEUR_DEFAUT;
  return DEVIS_MOTEURS[m] ? m : DEVIS_MOTEUR_DEFAUT;
}

async function claudeGenere(sys, texte, schema, moteur) {
  const m = DEVIS_MOTEURS[moteur] || DEVIS_MOTEURS[DEVIS_MOTEUR_DEFAUT];
  const msg = await getAnthropic().messages.create({
    model: m.modele, max_tokens: 4000, system: sys,
    output_config: { format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: texte }]
  });
  if (msg.stop_reason === 'refusal') { const e = new Error('demande refusée'); e.refus = true; throw e; }
  const txt = (msg.content.find(b => b.type === 'text') || {}).text || '';
  return JSON.parse(txt);
}

// Le schéma garantit une réponse JSON exploitable : mêmes champs que les lignes de devis de l'app
const DEVIS_SCHEMA = {
  type: 'object',
  properties: {
    titre: { type: 'string' },
    lignes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { designation: { type: 'string' }, qte: { type: 'number' }, pu: { type: 'number' } },
        required: ['designation', 'qte', 'pu'],
        additionalProperties: false
      }
    },
    tva: { type: 'number' },
    remarque: { type: 'string' }
  },
  required: ['titre', 'lignes', 'tva', 'remarque'],
  additionalProperties: false
};

app.post('/api/devis/generer', async (req, res) => {
  try {
    if (!devisActif()) return res.status(503).json({ error: 'Devis IA non configuré sur le serveur — sur le serveur : bash server/set-claude.sh' });
    /* « client » n'est plus lu : le nom et l'adresse d'un client ne servent pas à faire
       un prix, et n'ont donc rien à faire chez un tiers. Le champ reste accepté dans le
       corps pour ne pas casser les applications déjà déployées ; il est ignoré. */
    const { code, team, demande, contexte } = req.body || {};
    const teamKey = String(team || '').trim().slice(0, 80);
    const okEquipe = devisTeamOk(teamKey);
    const okCode = !!(code && devisConf().secretDevis && String(code) === String(devisConf().secretDevis));
    if (!okEquipe && !okCode) return res.status(401).json({ error: "Devis IA non activé pour cette entreprise — demande l'activation à TeamOP" });
    if (!demande || String(demande).trim().length < 5) return res.status(400).json({ error: 'Décris la prestation à chiffrer' });
    if (devisUtilises() >= devisQuotaJour()) return res.status(429).json({ error: 'Quota du jour atteint (' + devisQuotaJour() + ' devis) — réessaie demain' });

    const sys = "Tu prépares des devis pour une entreprise française de gestion de nuisibles (dératisation, désinsectisation, désinfection, dépigeonnage) et petits travaux associés. À partir de la demande, produis un devis réaliste et sobre : des lignes claires (désignation précise, quantité, prix unitaire HT en euros, cohérent avec le marché français), la main d'œuvre et le déplacement en lignes séparées quand c'est pertinent, TVA 20 par défaut (10 seulement pour des travaux d'amélioration d'un logement de plus de 2 ans). « remarque » : 1 ou 2 phrases utiles pour le client (garantie, nombre de passages, conditions). Pas de lignes de remplissage.";
    const devis = await claudeGenere(sys,
      'Demande : ' + String(demande).slice(0, 2000)
        + (contexte ? '\nContexte : ' + String(contexte).slice(0, 1000) : ''),
      DEVIS_SCHEMA, devisMoteurChoisi(teamKey, (req.body || {}).profond));
    if (!devis || !Array.isArray(devis.lignes) || !devis.lignes.length) return res.status(502).json({ error: 'Réponse illisible, réessaie' });
    devisCompte();
    if (okEquipe) { const t = devisAcces[teamKey]; t.n = (t.n || 0) + 1; t.dernier = new Date().toISOString().slice(0, 10); saveDevisAcces(); }
    res.json({ ok: true, devis, restants: Math.max(0, devisQuotaJour() - devisUtilises()) });
  } catch (e) {
    if (e && e.refus) return res.status(422).json({ error: 'Demande refusée — reformule-la.' });
    if (e && e.geminiModele) return res.status(502).json({ error: 'Modèle Gemini introuvable — relance server/set-gemini.sh pour en choisir un disponible' });
    if (e && e.geminiQuota) return res.status(503).json({ error: 'Palier gratuit Gemini saturé pour le moment — réessaie dans quelques minutes' });
    console.error('devis IA:', e && e.message);
    res.status(500).json({ error: 'Erreur du serveur de devis' });
  }
});

// ── Tour de contrôle : activation du Devis IA entreprise par entreprise.
//    Le patron active/désactive un espace depuis tour.html — rien à donner aux clients.
/* Le patron pense en entreprises, pas en codes d'espace : on joint le nom à
   chaque code pour que la Tour de contrôle affiche « teamop teste » et non
   « justin ». Le code reste montré en second — il sert au dépannage. */
/* Toutes les entreprises connues, code d'espace et nom. Sans cette liste, le
   patron devait retrouver et retaper un code à la main — et se tromper, puisque
   celui qu'utilise l'application n'est pas forcément celui qu'il croit. */
function espacesConnus() {
  /* `vus` dit ce qui est RENDU, pas ce qui a été examiné. La nuance a coûté un écran :
     un espace écarté faute de nom était quand même marqué vu, donc la troisième boucle
     — celle qui existe précisément pour rattraper une entreprise activée — passait
     par-dessus. Il finissait dans « espace jamais vu » avec 442 connexions au compteur.
     `ecartes` garde l'autre moitié de l'intention : un espace technique tu ici ne doit pas
     reparaître sous son slug par la boucle de l'annuaire. */
  const out = []; const vus = new Set(); const ecartes = new Set();
  /* Dernière connexion réussie d'un espace. Une seule définition : la lire à trois
     endroits avec trois orthographes est exactement ce qui vient d'arriver. */
  const vuDe = tc => { try { return (cnxResume(tc) || {}).derniere || null; } catch (err) { return null; } };
  /* Les espaces qui se connectent vraiment. cnxData est indexé par code
     d'équipe et se remplit à chaque connexion d'application : c'est la seule
     source réellement peuplée. espacesReg, lui, n'est alimenté que par une
     inscription manuelle que personne ne fait — d'où la liste vide. */
  for (const tc of Object.keys(cnxData)) {
    if (!tc || vus.has(tc)) continue;
    let e = null; try { e = espaceParT(tc); } catch (err) {}
    const nom = (e && espNomPropre(e)) || '';
    /* Sans nom d'entreprise, c'est un espace technique — environnement de test,
       ancienne bascule. Il n'a rien à faire dans une liste de clients. On ne le
       garde que s'il est déjà activé : couper un accès en cours par simple
       ménage d'affichage serait pire que le bruit. */
    if (!nom && !(devisAcces[tc] && devisAcces[tc].actif)) { ecartes.add(tc); continue; }
    vus.add(tc);
    out.push({ t: tc, nom: nom, vu: vuDe(tc) });
  }
  for (const slug of Object.keys(espacesReg)) {
    let e = null;
    try { e = espaceAJour(slug) || espacesReg[slug]; } catch (err) { e = espacesReg[slug]; }
    let t = ''; try { t = espaceT(e); } catch (err) {}
    if (!t || vus.has(t) || ecartes.has(t)) continue;
    vus.add(t);
    out.push({ t: t, nom: espNomPropre(e) || slug, vu: vuDe(t) });
  }
  /* Une entreprise déjà activée doit rester visible même si elle ne s'est
     jamais connectée depuis. `vu` se relit ici aussi : écrire null d'office disait
     « jamais connectée » d'un espace qu'on n'avait pas regardé. */
  for (const tc of Object.keys(devisAcces)) {
    if (vus.has(tc)) continue;
    vus.add(tc);
    let e = null; try { e = espaceParT(tc); } catch (err) {}
    out.push({ t: tc, nom: (e && espNomPropre(e)) || '', vu: vuDe(tc) });
  }
  out.sort(function (a, b) { return (a.nom || a.t).localeCompare(b.nom || b.t, 'fr'); });
  return out;
}
function nomsDesEspaces(codes) {
  const noms = {};
  for (const t of codes) {
    let e = null;
    try { e = espaceParT(t); } catch (err) {}
    noms[t] = (e && espNomPropre(e)) || '';
  }
  return noms;
}
app.get('/api/monitor/devisia', monAdmin, (req, res) => {
  res.json({ ok: true, cle: devisActif(), quotaJour: devisQuotaJour(), utilises: devisUtilises(), equipes: devisAcces, noms: nomsDesEspaces(Object.keys(devisAcces)), entreprises: espacesConnus() });
});
app.post('/api/monitor/devisia', monAdmin, (req, res) => {
  const b = req.body || {};
  const team = String(b.teamId || '').trim().slice(0, 80);
  if (!team) return res.status(400).json({ error: "code d'espace requis" });
  if (b.supprimer) delete devisAcces[team];
  else if (b.actif) devisAcces[team] = { ...(devisAcces[team] || {}), actif: true, depuis: (devisAcces[team] || {}).depuis || new Date().toISOString().slice(0, 10) };
  else if (devisAcces[team]) devisAcces[team].actif = false;
  if (b.moteur && DEVIS_OFFRES[b.moteur] && devisAcces[team]) devisAcces[team].moteur = b.moteur;
  saveDevisAcces();
  res.json({ ok: true, equipes: devisAcces, noms: nomsDesEspaces(Object.keys(devisAcces)) });
});

/* ══════════ CODES PROMO — mois offerts, sans carte bancaire ══════════
   Les codes vivent dans /opt/teamop/config.json → "promos" :
     "promos": [ { "code": "BIENVENUE3", "formule": "premium", "mois": 3, "maxUtilisations": 50 } ]
   formule : pro | business | premium. Les usages sont comptés dans
   data/promos-usages.json — un même code ne compte qu'une fois par équipe. */
const PROMO_USAGE_PATH = path.join(DATA_DIR, 'promos-usages.json');
let promoUsages = {};
/* ⛔ UN REGISTRE ILLISIBLE N'EST PAS UN REGISTRE VIDE — la règle de l'annuaire (`espacesIllisible`,
   relevée par `gardien` le 24 septembre 2026), appliquée aux codes le même jour. Relu vide, ce
   fichier OUBLIE quelles entreprises ont déjà servi leur code : chacune pourrait le remettre (voir
   `promoServiA`), et chaque période offerte en cours sortirait du calcul d'`espacePaye()`. On le DIT
   (journal, `/health.registres.promos`, la surveillance crie) et on n'écrit plus par-dessus. */
let promosIllisible = false;
try { promoUsages = JSON.parse(fs.readFileSync(PROMO_USAGE_PATH, 'utf8')); }
catch (e) { if (e && e.code !== 'ENOENT') { promosIllisible = true; console.error('⛔ promos-usages.json ILLISIBLE — les codes déjà servis sont oubliés en mémoire, et le fichier ne sera pas réécrit tant qu\'il n\'est pas réparé :', e.message); } }
/* Temporaire puis renommage : un fichier tronqué à l'écriture, c'est le même oubli que plus haut. */
function savePromoUsages() {
  if (promosIllisible) { console.error('⛔ promos-usages.json NON réécrit : il était illisible au démarrage — le réparer, puis redémarrer'); return false; }
  try { const tmp = PROMO_USAGE_PATH + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(promoUsages)); fs.renameSync(tmp, PROMO_USAGE_PATH); return true; }
  catch (e) { console.error('promos-usages.json non écrit :', e.message); return false; } }

/* ══ ⛔⛔ UN CODE PROMO SERT UNE FOIS PAR ENTREPRISE — Justin, 24 septembre 2026 ═══════════════════
   « Une fois qu'une entreprise l'a activé, ils peuvent pas le remettre. »
   L'échéance ne se prolongeait déjà jamais : retaper un code rendait la MÊME date. Mais :
   · la réponse disait « ok » — l'application affichait « 🎉 Code accepté ! » et repassait toute
     l'équipe en formule payante jusqu'à la vérification suivante ; le courriel d'une demande faite
     sur le site écrivait « votre code est activé … jusqu'au » une date PASSÉE, sans lien de paiement ;
   · « repartir à neuf » (la Tour) donne à l'entreprise un NOUVEL identifiant d'espace : sans
     mémoire, le même code redevenait neuf pour la même entreprise.
   Une entreprise se reconnaît d'abord à son identifiant d'espace (`t`). Mais « repartir à neuf »
   lui en donne un NOUVEAU : chaque utilisation porte donc aussi l'EMPREINTE de l'adresse e-mail de
   l'entreprise (`em`, jamais l'adresse elle-même), et `/espaces/renaitre` la pose sur les
   anciennes avant d'effacer l'espace.
   ⛔ PAS PAR LE NOM D'ACCÈS (le slug de `teamop.fr/e/…`) — relecture de `gardien`, le même jour :
   un nom libéré (« Supprimer l'accès » passe par `/renaitre`) peut être repris par une AUTRE
   entreprise, qui héritait alors de la période en cours — ou d'un refus. Une entreprise SANS
   e-mail (un accès ouvert par la Tour sans adresse) n'a donc pas de mémoire au-delà de son `t` :
   « repartir à neuf » la remet à zéro. C'est la Tour qui les ouvre, jamais un client.
   ⚠️ Cette mémoire ne sert qu'à REFUSER — ou à reporter sur le nouvel identifiant une période
   ENCORE EN COURS, quand l'entreprise la présente avec la preuve de sa clé. Jamais à rendre une
   entreprise « payée » dans `espacePaye()`, qui ne regarde que `t`.
   ⚠️ L'empreinte est une donnée PSEUDONYMISÉE, donc encore personnelle au sens du RGPD : qui a le
   fichier et une adresse candidate peut vérifier qu'elle y figure. Elle part avec la suppression
   totale de l'entreprise — sauf la mémoire d'une entreprise VIVANTE (`promoEffacerEntreprise`).
   ⚠️ Deux espaces posés par la Tour sous la MÊME adresse se partagent cette mémoire : l'adresse,
   c'est l'entreprise (le site dédoublonne par adresse ; la Tour, non — voir REPRISE.md). */
function promoAujourdhui() { return new Date().toISOString().slice(0, 10); }
function promoDateFr(d) { return String(d || '').split('-').reverse().join('/'); }
/* L'empreinte d'une adresse : de quoi RECONNAÎTRE une entreprise, pas de quoi la lire. Le fichier
   des usages n'a pas à devenir un second carnet d'adresses. */
function promoEmpreinteMail(email) {
  const m = String(email || '').trim().toLowerCase();
  return m ? crypto.createHash('sha256').update('teamop-promo:' + m).digest('hex').slice(0, 24) : ''; }
/* Qui est cette entreprise : l'empreinte des e-mails de ses entrées d'annuaire (un espace renommé en
   garde plusieurs), plus celle de l'entrée qu'on connaît. */
function promoIdentite(t, slug) {
  const ems = new Set();
  for (const [k, x] of Object.entries(espacesReg || {})) {
    if (!x) continue;
    let tx = x.t;
    if (!tx) { try { tx = String(JSON.parse(Buffer.from(x.code, 'base64').toString('utf8')).t || ''); } catch (e) {} }
    if ((t && tx === t) || (slug && k === slug)) { const em = promoEmpreinteMail(x.email); if (em) ems.add(em); }
  }
  return { ems }; }
/* L'utilisation du code `c` par cette entreprise ({date, finLe, em}), ou null. LECTURE seule. */
function promoServiA(c, t, slug) {
  const u = promoUsages[c]; if (!u || !u.equipes) return null;
  if (t && u.equipes[t]) return u.equipes[t];
  const id = promoIdentite(t, slug); if (!id.ems.size) return null;
  for (const eq of Object.values(u.equipes)) if (eq && eq.em && id.ems.has(eq.em)) return eq;
  return null; }
/* Ce qu'on inscrit à l'activation : la date, l'échéance CALCULÉE par l'appelant, et l'empreinte de
   l'e-mail de l'espace (celle de l'entrée la plus récente). */
function promoEntree(finLe, t, slug) {
  let em = '';
  try { const e = t ? espaceParT(t) : null;
    if (e) em = promoEmpreinteMail(e.email);
    if (!em && slug && espacesReg[slug]) em = promoEmpreinteMail(espacesReg[slug].email); } catch (err) {}
  return { date: promoAujourdhui(), finLe, em }; }
/* Un AUTRE code encore en cours pour cette entreprise (son nom, ou '') — « un seul code à la fois ». */
function promoAutreActif(c, t, slug) {
  for (const c2 of Object.keys(promoUsages || {})) {
    if (c2 === c) continue;
    const eq2 = promoServiA(c2, t, slug);
    if (eq2 && eq2.finLe && eq2.finLe >= promoAujourdhui()) return c2;
  }
  return ''; }
/* « Repartir à neuf » (Tour) : l'entreprise va revenir sous un NOUVEL identifiant. Ses utilisations
   passées prennent l'empreinte de son e-mail AVANT que l'annuaire l'oublie — sans ça, le même code
   redevenait neuf pour elle. Sans e-mail, rien à poser (voir l'en-tête). */
function promoMarquerAvantRenaitre(t, slug, email) {
  const em = promoEmpreinteMail(email); let n = 0;
  if (!em) return 0;
  /* (et `renait` : QUAND, et les entreprises VIVANTES qui portaient déjà cette adresse — elles ne reprendront pas sa période,
     `promoRenaissance`) */
  const voisins = [...new Set(Object.values(espacesReg || {}).filter(x => !!x && String(espaceT(x) || '') !== t
    && promoEmpreinteMail(x.email) === em).map(x => String(espaceT(x) || '')).filter(Boolean))];
  /* (et le rappel J-7 déjà envoyé pour cette échéance — `rappelFin`, posé sur l'entrée d'annuaire qui va disparaître : sans
     lui, l'entreprise recréée recevait un second « votre période se termine » pour la même date — relecture finale) */
  const rappelFin = String((espacesReg[slug] && espacesReg[slug].rappelFin) || '');
  for (const u of Object.values(promoUsages || {})) {
    const eq = u && u.equipes && t ? u.equipes[t] : null; if (!eq) continue;
    eq.em = em; eq.renait = rappelFin ? { le: Date.now(), voisins, rappelFin } : { le: Date.now(), voisins }; n++;
  }
  if (n) savePromoUsages();
  return n; }
/* ⛔ LA PÉRIODE D'UNE ENTREPRISE « REPARTIE À NEUF » LA SUIT — ELLE SEULE (relecture des correctifs, 30 septembre 2026, rejouée).
   « Repartir à neuf » retire l'entreprise de l'annuaire, et la Tour la recrée aussitôt sous un NOUVEL identifiant (route
   « lien ») : sa période offerte restait sous l'ancien, et l'entreprise recréée naissait SUSPENDUE — ELAN comprise, si le
   geste était fait pendant sa période. La reconnaître à la seule empreinte de l'e-mail PRÊTAIT la période à toute autre
   entreprise à la même adresse (une voisine qui existait déjà, l'héritière d'une suppression totale), et le rappel J-7, qui
   lit par identifiant, ne la voyait pas. Ce qui distingue l'entreprise recréée n'est pas l'adresse, c'est le GESTE :
   `promoMarquerAvantRenaitre` pose `renait` (quand, et les voisines d'adresse déjà vivantes). Rend les périodes EN COURS
   qu'une entreprise `t` (d'empreintes `ems`) peut reprendre : sous un identifiant qui n'est plus à l'annuaire, à son adresse,
   si elle n'était pas une voisine, et pas déjà reprise par une autre. La reprise se fait à la création (route « lien »,
   `promoReprendreRenaissance`) et s'ÉCRIT sous le nouvel identifiant : ensuite l'application, le rappel J-7 et la facturation
   différée la lisent comme toute période (`periodeOfferte`, par identifiant) — aucune lecture ne prête rien. Une période
   d'avant ce marqueur ne se reprend pas toute seule : la Tour la reporte en réappliquant le même code (`promoPresente` :
   même échéance, rien ne se recompte). */
function promoRenaissance(t, ems) {
  const out = [];
  if (!t || !ems || !ems.size) return out;
  const auj = promoAujourdhui();
  const vivante = cle => Object.values(espacesReg || {}).some(x => !!x && String(espaceT(x) || '') === cle);
  for (const [code, u] of Object.entries(promoUsages || {})) {
    for (const [cle, eq] of Object.entries((u && u.equipes) || {})) {
      if (cle === t || !eq || !eq.renait || !eq.em || !ems.has(eq.em) || !eq.finLe || eq.finLe < auj) continue;
      if ((eq.renait.voisins || []).includes(t) || (eq.renait.repris && eq.renait.repris !== t) || vivante(cle)) continue;
      out.push({ code, cle, eq });
    }
  }
  return out; }
/* La Tour recrée une entreprise repartie à neuf (route « lien ») : sa période la suit, sous son NOUVEL identifiant — le
   rappel J-7, la facturation différée et l'application la lisent alors comme toute période (par identifiant). Rien ne se
   recompte (`u.n`), et la période n'est reprise qu'une fois (`repris`). */
function promoReprendreRenaissance(t, email) {
  const em = promoEmpreinteMail(email); if (!em || promosIllisible) return 0;
  let n = 0, prevenue = '';
  for (const { code, eq } of promoRenaissance(t, new Set([em]))) {
    const u = promoUsages[code];
    if (!u.equipes[t]) { const { renait, ...reste } = eq; u.equipes[t] = Object.assign(reste, { reporte: true }); n++; }
    if (eq.renait.rappelFin && eq.renait.rappelFin === eq.finLe) prevenue = eq.finLe;   // déjà prévenue de CETTE échéance
    eq.renait = Object.assign({}, eq.renait, { repris: t });
  }
  if (n && !savePromoUsages()) console.error('⛔ période offerte reprise en mémoire seulement (promos-usages.json non écrit) pour l\'entreprise', t);
  if (prevenue) {
    for (const x of Object.values(espacesReg || {})) if (x && String(espaceT(x) || '') === t) x.rappelFin = prevenue;
    espacesEcrire();
  }
  return n; }
/* Toutes les utilisations d'une entreprise, pour la suppression TOTALE : celles de son identifiant,
   et celles d'un identifiant d'avant « repartir à neuf » qui portent son e-mail. Une utilisation qui
   porte l'e-mail d'une AUTRE entreprise ne part pas.
   ⛔ NI CELLE D'UNE AUTRE ENTREPRISE VIVANTE À LA MÊME ADRESSE (relecture finale de la poussée, 30 septembre 2026, rejouée) :
   supprimer une voisine d'adresse effaçait la période EN COURS de l'autre — sous son propre identifiant, ou reprise après un
   « repartir à neuf » —, et celle-ci était suspendue. Une utilisation rangée sous l'identifiant d'une entreprise encore à
   l'annuaire est la sienne ; une utilisation d'un ancien identifiant dont l'adresse est encore portée par une autre
   entreprise vivante est aussi la sienne (sa mémoire du code : sans elle, le code redevenait neuf). */
function promoCles(t, slugs, emails) {
  const ems = new Set([...(emails || [])].map(promoEmpreinteMail).filter(Boolean)), out = [];
  const vivante = cle => cle !== t && Object.values(espacesReg || {}).some(x => !!x && String(espaceT(x) || '') === cle);
  for (const [code, u] of Object.entries(promoUsages || {})) {
    for (const [cle, eq] of Object.entries((u && u.equipes) || {})) {
      if (cle === t || (eq && eq.em && ems.has(eq.em) && !vivante(cle) && !promoHeritier(eq, t))) out.push({ code, cle });
    }
  }
  return out; }
/* Une utilisation dont l'e-mail est celui d'une entreprise VIVANTE — un AUTRE identifiant, à
   l'annuaire : la même entreprise, repartie à neuf. */
function promoHeritier(eq, t) {
  if (!eq || !eq.em) return false;
  for (const x of Object.values(espacesReg || {})) {
    if (!x) continue;
    let tx = x.t;
    if (!tx) { try { tx = String(JSON.parse(Buffer.from(x.code, 'base64').toString('utf8')).t || ''); } catch (e) {} }
    if (tx && tx !== t && promoEmpreinteMail(x.email) === eq.em) return true;
  }
  return false; }
/* ⛔ LA SUPPRESSION TOTALE N'EFFACE PAS LA MÉMOIRE D'UNE ENTREPRISE VIVANTE — relevé par `gardien`
   le 24 septembre 2026, rejoué sur un serveur isolé : repartir à neuf, puis supprimer totalement
   l'ANCIEN identifiant resté hors annuaire (le ménage le plus courant de cette route : un appareil
   resté connecté le fait renaître) — et le code redevenait neuf pour l'entreprise qui vit sous le
   nouveau. Ces utilisations-là quittent l'identifiant supprimé (il n'en reste aucune trace) et
   restent attachées à l'empreinte de l'entreprise vivante. Tout le reste part. */
function promoEffacerEntreprise(t, slugs, emails) {
  let n = 0;
  for (const { code, cle } of promoCles(t, slugs, emails)) {
    const u = promoUsages[code]; if (!u || !u.equipes || !u.equipes[cle]) continue;
    const eq = u.equipes[cle];
    if (cle === t && promoHeritier(eq, t)) u.equipes['garde-' + crypto.randomBytes(6).toString('hex')] = Object.assign({}, eq, { garde: true });
    delete u.equipes[cle]; n++;
  }
  if (n) savePromoUsages();
  return n; }
/* Le verdict pour une entreprise qui PRÉSENTE le code (une demande d'activation, pas une lecture) :
     { etat: 'neuf' }                  → jamais servi : l'appelant l'active et compte UNE utilisation ;
     { etat: 'actif', finLe, date, reporte } → déjà servi, période en cours : même échéance, rien ne se recompte
                                         (`reporte` : elle vient d'un ancien identifiant — repartir à neuf —
                                         et on l'inscrit sur le nouveau, toujours sans rien recompter) ;
     { etat: 'servi', finLe }          → déjà servi, période terminée : REFUS, dit par `promoRefusServi` ;
     { etat: 'indisponible' }          → registre illisible : on ne sait pas, donc on n'active RIEN. */
function promoPresente(c, t, slug) {
  /* Registre illisible : on ne SAIT pas si cette entreprise a déjà servi le code — et ce qu'on
     activerait ne serait pas écrit. Aucune activation tant qu'il n'est pas réparé. */
  if (promosIllisible) return { etat: 'indisponible' };
  const eq = promoServiA(c, t, slug);
  if (!eq) return { etat: 'neuf' };
  if (eq.finLe && eq.finLe >= promoAujourdhui()) {
    const u = promoUsages[c]; let reporte = false;
    if (t && u && u.equipes && !u.equipes[t]) { u.equipes[t] = Object.assign({}, eq, { reporte: true }); savePromoUsages(); reporte = true; }
    return { etat: 'actif', finLe: eq.finLe, date: eq.date || '', reporte };
  }
  return { etat: 'servi', finLe: eq.finLe || '' }; }
function promoRefusServi(c, finLe) {
  return 'Le code « ' + c + ' » a déjà été utilisé par cette entreprise' + (finLe ? ' — sa période offerte s’est terminée le ' + promoDateFr(finLe) : '')
    + '. Un code promo ne sert qu’une fois par entreprise.'; }
/* ⛔ UN REFUS DIT VRAI (Justin, 24 septembre 2026, capture à l'appui) : sur la bêta À JOUR, ce
   refus disait « mets l'application à jour ». Mettre à jour n'est le bon geste que quand
   l'appareil n'a RIEN présenté (`absent` : une version d'avant la preuve) ; ailleurs ça ne
   change rien, et ça envoie la personne chercher une panne qu'elle n'a pas.
   ⚠️ TROIS messages, pas cinq, et c'est voulu : les deux premiers ne dépendent que de ce qui
   est PUBLIC (la liste des espaces techniques est écrite dans ce fichier) ou de la requête
   elle-même (a-t-elle un en-tête ?). Séparer `invalide`, `inconnu` et la clé partagée ferait
   de cette route, ouverte à tous, un oracle : « cet identifiant est à l'annuaire », voire
   « cette entreprise est encore sur la clé écrite en clair dans app.html ». */
function promoRefusCle(t, v) {
  if (ESPACES_INTOUCHABLES.includes(t)) return 'Les codes promo ne s’activent pas sur la bêta ni sur l’espace partagé — seulement dans l’espace d’une entreprise.';
  if (v === 'absent') return 'Cet appareil n’a pas prouvé la clé de son entreprise — mets l’application à jour, puis réessaie.';
  return 'Cet appareil n’est pas reconnu par son entreprise — reconnecte-toi avec le lien de connexion de l’entreprise, puis réessaie. Si ça persiste : contact@teamop.fr.'; }

/* ── 🎁 Les codes promo, vus depuis la Tour ──────────────────────────────────────────────
   Les codes sont définis dans config.promos (sur le VPS) et leurs usages vivent dans
   promos-usages.json : quel espace, à quelle date, jusqu'à quand. Rien de tout cela
   n'apparaissait dans la console — on ne pouvait donc pas savoir qui bénéficiait d'une
   formule offerte, ni jusqu'à quand, ni combien d'utilisations restaient sur un code.

   Chaque usage est rendu avec le NOM de l'espace quand l'annuaire le connaît, parce qu'un
   identifiant « ent-a1b2c3… » ne dit rien à personne. Et « actif » se calcule ici, sur la
   date du jour : un code dont l'échéance est passée ne coûte plus rien et ne doit pas être
   compté comme une formule offerte en cours. */
app.get('/api/monitor/promos', monAdmin, (req, res) => {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const codes = (config.promos || []).map(p => {
    const c = String(p.code || '').trim().toUpperCase();
    const u = promoUsages[c] || { n: 0, equipes: {} };
    const usages = Object.entries(u.equipes || {}).map(([t, e]) => {
      const esp = espaceParT(t);
      return {
        t,
        nom: esp ? (esp.nom || esp.slug || '') : '',
        depuis: (e && e.date) || '',
        finLe: (e && e.finLe) || '',
        actif: !!(e && e.finLe && e.finLe >= aujourdhui),
        /* Une période REPORTÉE sur le nouvel identifiant d'une entreprise repartie à neuf : la même
           période que la ligne d'origine, pas une utilisation de plus (voir `promoPresente`). */
        reporte: !!(e && e.reporte)
      };
    }).sort((a, b) => String(b.finLe || '').localeCompare(String(a.finLe || '')));
    return {
      code: c,
      formule: p.formule || '',
      mois: Number(p.mois) || 1,
      maxUtilisations: Number(p.maxUtilisations) || 0,
      utilisations: Number(u.n) || 0,
      restantes: p.maxUtilisations ? Math.max(0, Number(p.maxUtilisations) - (Number(u.n) || 0)) : null,
      actifs: usages.filter(x => x.actif && !x.reporte).length,
      usages
    };
  }).sort((a, b) => (b.actifs - a.actifs) || a.code.localeCompare(b.code));
  /* Un code peut avoir été retiré de la configuration alors que des espaces en profitent
     encore : sans cette reprise, ces espaces disparaîtraient de la vue tout en gardant leur
     formule offerte — exactement ce qu'on ne veut pas rater. */
  const connus = new Set(codes.map(c => c.code));
  for (const [c, u] of Object.entries(promoUsages || {})) {
    if (connus.has(c)) continue;
    const usages = Object.entries((u && u.equipes) || {}).map(([t, e]) => {
      const esp = espaceParT(t);
      return { t, nom: esp ? (esp.nom || esp.slug || '') : '', depuis: (e && e.date) || '', finLe: (e && e.finLe) || '', actif: !!(e && e.finLe && e.finLe >= aujourdhui), reporte: !!(e && e.reporte) };
    });
    codes.push({ code: c, formule: '', mois: 0, maxUtilisations: 0, utilisations: Number(u.n) || 0, restantes: null,
      actifs: usages.filter(x => x.actif && !x.reporte).length, usages, horsConfig: true });
  }
  res.json({ codes, total: codes.length, actifsTotal: codes.reduce((n, c) => n + c.actifs, 0) });
});

/* ⛔ LA MÊME PORTE QUE LE RELAIS DE /api/clients/sync, EN VERSION ANONYME — trouvée par
   `gardien` le 11 septembre 2026, le jour où l'autre a été refermée. Fermer une moitié d'un
   défaut pendant que l'autre reste ouverte ne vaut rien : celle-ci ne demandait AUCUNE
   identité. `teamId` était lu dans le corps, jamais vérifié ; espacePaye() relit ensuite
   promoUsages et rend paye:true. Rejoué sur banc :
     POST /api/promo/valider {"code":"TEST3","teamId":"ent-victime"}   → 200
     POST /api/espaces/etat  {"t":"ent-victime"}  → paye:true, « code promo TEST3 »
   Trois exploitations, toutes mesurées : offrir l'abonnement à n'importe quel espace (le
   teamId n'est pas un secret) ; ÉPUISER un code — `u.n++` s'exécutait avant `if (team)`,
   donc un appel sans teamId incrémentait maxUtilisations et l'écrivait sur disque, deux
   appels suffisant à brûler un code à 2, en déni de service définitif sur une campagne ;
   et énumérer les codes par `apercu:1`, qui répond 404/200 SANS rien écrire.

   Ce qui change : l'ÉCRITURE exige la preuve de la clé d'équipe (le même `kh` que la
   famille mail, la même fonction), le compteur ne bouge plus que quand un espace est
   vraiment servi, et la route passe sous le quota strict par IP.
   ⚠️ L'APERÇU RESTE PUBLIC, et c'est nécessaire : espace.html et recap-abonnement.html
   valident un code AVANT qu'un espace existe — il n'y a alors aucune clé à prouver. Il
   n'écrit rien, donc il ne donne rien ; il reste un oracle sur l'existence d'un code, ce que
   le quota strict borne désormais. */
app.post('/api/promo/valider', (req, res) => {
  const { code, teamId, apercu } = req.body || {};
  const c = String(code || '').trim().toUpperCase();
  if (!c) return res.status(400).json({ error: 'Entre ton code promo' });
  const p = (config.promos || []).find(x => String(x.code || '').trim().toUpperCase() === c);
  if (!p) return res.status(404).json({ error: 'Code promo inconnu' });
  const u = promoUsages[c] || { n: 0, equipes: {} };
  const team = String(teamId || '').slice(0, 80);
  if (!apercu && team) {
    /* `valide` garantit que l'espace est à l'annuaire avec un code lisible — c'est ce dont
       cleEstPublique a besoin pour ne pas rendre « laisse passer » par défaut (voir sa mise
       en garde). Un espace resté sur la clé écrite en clair dans app.html ne prouve rien en
       la présentant : même refus que /api/fb/jeton, pour le même secret. */
    /* ⛔ LES ESPACES TECHNIQUES D'ABORD, ET SANS CONDITION (relecture de `gardien`, 24 septembre
       2026) : le refus AFFIRME que la bêta ne prend pas de code — c'est le code qui doit le
       faire, pas la phrase. Jugés sur le seul verdict, un espace technique inscrit à l'annuaire
       avec une clé propre (la Tour le permet) passait et consommait une utilisation, rejoué :
       200, `n:1`. Même ordre que `cleEquipeExige` : la liste est statique, on la lit en premier. */
    if (ESPACES_INTOUCHABLES.includes(team)) return res.status(403).json({ error: promoRefusCle(team, '') });
    const v = cleEquipeVerdict(team, req.headers['x-teamop-kh'] || '');
    if (v !== 'valide' || cleEstPublique(team))
      return res.status(403).json({ error: promoRefusCle(team, v) });
  }
  /* ⛔⛔ UN CODE SERT UNE FOIS PAR ENTREPRISE (Justin, 24 septembre 2026 — voir `promoPresente`).
     Retapé pendant sa période : la MÊME échéance, rien ne se recompte, et on le DIT
     (`dejaUtilise`). Retapé APRÈS : refus — jusqu'ici la réponse disait « ok » avec une
     échéance passée, et l'application affichait « 🎉 Code accepté ! » puis repassait toute
     l'équipe en formule payante jusqu'à la vérification suivante.
     ⚠️ Seulement pour une entreprise qui a PROUVÉ sa clé : l'aperçu n'a pas d'identité, il ne
     lit donc rien de personne — avant, `{apercu:1, teamId}` disait à n'importe qui quel code
     une entreprise avait en cours, et jusqu'à quand. */
  const pres = (!apercu && team) ? promoPresente(c, team, '') : null;
  if (pres && pres.etat === 'indisponible') return res.status(503).json({ error: 'Les codes promo sont momentanément indisponibles — réessaie un peu plus tard.' });
  if (pres && pres.etat === 'servi')
    return res.status(410).json({ error: promoRefusServi(c, pres.finLe), dejaUtilise: true, finLe: pres.finLe });
  const deja = (pres && pres.etat === 'actif') ? pres : null;
  // un seul code à la fois par espace : si un AUTRE code est encore actif, refus clair
  if (pres && !deja) {
    for (const [c2] of Object.entries(promoUsages || {})) {
      const eq2 = c2 !== c ? promoServiA(c2, team, '') : null;   // par l'adresse aussi : un code en cours survit à « repartir à neuf »
      if (eq2 && eq2.finLe && eq2.finLe >= promoAujourdhui())
        return res.status(409).json({ error: 'Un code (« ' + c2 + ' ») est déjà actif sur cet espace jusqu\'au ' + promoDateFr(eq2.finLe) + ' — un seul code à la fois.' });
    }
  }
  if (!deja && p.maxUtilisations && u.n >= p.maxUtilisations) return res.status(410).json({ error: "Ce code a atteint son nombre maximum d'utilisations" });
  const mois = Math.max(1, Number(p.mois) || 1);
  let finLe;
  if (deja) {
    finLe = deja.finLe;   // le même code retapé pendant sa période : la même échéance, jamais une nouvelle
  } else {
    const d = new Date(); d.setMonth(d.getMonth() + mois);
    finLe = d.toISOString().slice(0, 10);
    /* ⛔ `u.n++` SOUS `if (team)`, jamais au-dessus : au-dessus, un appel sans teamId
       consommait une utilisation et l'écrivait sur disque — un code à maxUtilisations:2
       s'épuisait en deux requêtes, et un vrai client lisait ensuite « ce code a atteint son
       maximum ». On ne compte que ce qu'on a réellement donné à quelqu'un. */
    if (!apercu && team) { u.n++; const neufU = !promoUsages[c]; u.equipes[team] = promoEntree(finLe, team, ''); promoUsages[c] = u;
      /* ⛔ ÉCRIT, OU ON LE DIT (relecture de `gardien`, 24 septembre 2026) : sur un disque plein, la
         période n'existait qu'en mémoire — « ok » au client, et le code redevenait neuf au
         redémarrage. On défait, et on le dit, AVANT le courriel. */
      if (!savePromoUsages()) { u.n--; delete u.equipes[team]; if (neufU) delete promoUsages[c];
        return res.status(503).json({ error: 'Le code n\'a pas pu être enregistré — réessaie dans un instant.' }); }
      mailPromoActive(team, c, finLe, ['pro', 'business', 'premium'].includes(p.formule) ? p.formule : 'premium'); }
  }
  /* la formule que la période SERT à cette entreprise (le code, jamais sous sa fiche) : c'est elle que l'application
     affiche en « essai » — la même que `/api/espaces/etat` lui rendra à la synchro suivante. ⛔ Seulement pour une clé
     PROUVÉE : l'aperçu est public, il ne dit rien de la fiche d'une entreprise (la formule du code, comme avant). */
  const fCode = ['pro', 'business', 'premium'].includes(p.formule) ? p.formule : 'premium';
  res.json({ ok: true, formule: (!apercu && team && formulePromo(espaceParT(team), c)) || fCode, mois, finLe, dejaUtilise: !!deja, debut: deja ? (deja.date || '') : '' });
});

// ── ⏳ Rappel d'échéance : 7 jours avant la fin d'une période offerte, l'entreprise
//    reçoit UN e-mail (modèle orange de la galerie) — jamais deux pour la même
//    échéance (drapeau rappelFin posé sur l'espace).
/* ⛔ CE QUE LE RAPPEL DIT — Justin, 28 septembre 2026 : « des mails automatiques sept jours avant l'expiration :
   tant d'utilisateurs trouvés chez vous, si vous poursuivez votre abonnement, payer la somme de chaque utilisateur ».
   Un abonnement = un utilisateur (27 septembre) : le rappel compte donc les utilisateurs ACTIFS de l'entreprise — son
   annuaire de connexion (`comptesReg[t]`), que l'application dépose en prouvant sa clé : les comptes qui peuvent se
   connecter, sans les désactivés — et chiffre la suite dans la formule du code, au prix de la page de paiement.
   ⚠️ `PRIX_ABO_MOIS` et `MOIS_OFFERTS_ANNEE` RECOPIENT la grille de `recap-abonnement.html` (`FORMULES.prixMensuel`,
   `REMISE_ANNUELLE`) : ce fichier ne peut pas la lire, et deux grilles finissent par dire deux prix. `tests/test-840.js`
   les compare ; un prix changé là-bas sans l'être ici fait tomber le banc.
   Sans annuaire (une entreprise qui n'a jamais ouvert une version qui le dépose), pas de nombre inventé : le prix par
   utilisateur seulement. Et sans formule connue (un code retiré de `config.promos` depuis : l'utilisation ne garde pas
   la formule), pas de prix inventé non plus — le repli sur Premium annonçait 50 € à une entreprise d'un code Pro
   (`gardien`) : on dit « un abonnement par utilisateur, dans la formule de votre choix ». */
const PRIX_ABO_MOIS = { pro: 15, business: 25, premium: 50 };   // € TTC, par utilisateur et par mois
const MOIS_OFFERTS_ANNEE = 2;                                   // à l'année : 12 − 2 mois
function rappelEcheanceMail(code, finLe, f, n, prelev) {
  const finFr = String(finLe).split('-').reverse().join('/');
  /* ⛔ `prelev` ({ limite, debut }) seulement quand c'est VRAI pour ce client — `rappelsEcheances` le décide avec la règle même de la
     page de paiement (`finEssaiPeriode`). Sinon rien : on ne promet pas une facturation différée qu'on ne ferait pas. */
  const prelevTxt = prelev ? 'En vous abonnant au plus tard le ' + prelev.limite + ', rien n\'est prélevé avant le ' + prelev.debut + ' : votre période offerte va jusqu\'au bout.' : '';
  const prelevHtml = prelev ? '<br>💳 En vous abonnant au plus tard le <b>' + prelev.limite + '</b>, rien n\'est prélevé avant le <b>' + prelev.debut + '</b> : votre période offerte va jusqu\'au bout.' : '';
  if (!PRIX_ABO_MOIS[f]) f = '';   // formule inconnue : aucun prix
  const lbl = FORMULE_LBL2[f] || f;
  const prix = PRIX_ABO_MOIS[f] || 0, an = prix * (12 - MOIS_OFFERTS_ANNEE);
  const eur = (x) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
  const pl = (k, mot) => k + ' ' + mot + (k > 1 ? 's' : '');
  const lienDe = g => 'https://teamop.fr/recap-abonnement.html' + (g ? '?formule=' + g + (n ? '&utilisateurs=' + n : '') : (n ? '?utilisateurs=' + n : ''));
  const lien = lienDe(f);
  const actifs = n ? pl(n, 'utilisateur') + ' ' + (n > 1 ? 'actifs' : 'actif') : '';
  const devisTxt = !f
    ? (n ? 'Nous avons trouvé ' + actifs + ' dans votre espace. ' : '') + 'Pour continuer : un abonnement par utilisateur, dans la formule de votre choix.'
    : n
    ? 'Nous avons trouvé ' + pl(n, 'utilisateur') + ' ' + (n > 1 ? 'actifs' : 'actif') + ' dans votre espace. Pour continuer en formule ' + lbl + ' (un abonnement par utilisateur) :\n'
      + n + ' × ' + eur(prix) + ' = ' + eur(n * prix) + ' TTC par mois — ou ' + n + ' × ' + eur(an) + ' = ' + eur(n * an) + ' TTC à l\'année (' + MOIS_OFFERTS_ANNEE + ' mois offerts).'
    : 'Pour continuer en formule ' + lbl + ' : ' + eur(prix) + ' TTC par mois et par utilisateur (un abonnement par personne), ou ' + eur(an) + ' TTC à l\'année (' + MOIS_OFFERTS_ANNEE + ' mois offerts).';
  const devisHtml = !f
    ? (n ? '<b>👥 ' + actifs + ' dans votre espace</b><br>' : '') + 'Un abonnement par utilisateur, dans la formule de votre choix'
    : n
    ? '<b>👥 ' + pl(n, 'utilisateur') + ' ' + (n > 1 ? 'actifs' : 'actif') + ' dans votre espace</b><br>Formule <b>' + lbl + '</b> · un abonnement par utilisateur<br><b>' + n + ' × ' + eur(prix) + ' = ' + eur(n * prix) + ' TTC par mois</b><br><span class="m-muet" style="color:#8593AB;font-size:12.5px">ou à l\'année : ' + n + ' × ' + eur(an) + ' = ' + eur(n * an) + ' TTC (' + MOIS_OFFERTS_ANNEE + ' mois offerts)</span>'
    : '<b>Formule ' + lbl + '</b> · un abonnement par utilisateur<br><b>' + eur(prix) + ' TTC par mois et par utilisateur</b><br><span class="m-muet" style="color:#8593AB;font-size:12.5px">ou ' + eur(an) + ' TTC à l\'année (' + MOIS_OFFERTS_ANNEE + ' mois offerts)</span>';
  /* ⛔ LE CLIENT CHOISIT SA FORMULE, ET C'EST ICI (Justin, 29 septembre 2026 : « ils choisissent le tarif qu'ils veulent » ;
     un code promo ouvre la formule la plus complète « pour mieux montrer l'application », et à la fin chacun prend la
     sienne). Ce courriel part sept jours avant la fin : il propose la formule d'aujourd'hui ET les autres, chacune avec
     son prix pour l'équipe et son lien — la page de paiement accepte n'importe lequel des tarifs, et l'application suit
     ce qui est payé (`formulePayee`). */
  const autres = ['pro', 'business', 'premium'].filter(g => g !== f);
  const pourEquipe = g => n ? ' — ' + pl(n, 'utilisateur') + ' : ' + eur(n * PRIX_ABO_MOIS[g]) + ' TTC par mois' : '';
  /* ⛔ LES OPTIONS DU PRO, à côté de la ligne Pro (1er octobre 2026) : un client que le code a servi en Business Premium et qui
     choisit Pro perd Stock, Achats et Compta — le courriel le dit AVANT, avec la grille du serveur (`OPTIONS_PRIX_MOIS`, comparée
     à la page de paiement par `test-852`). Elle paraît une fois : sous la ligne Pro des autres formules, ou — quand Pro est la
     formule du client — sous son devis. */
  const optPhrase = 'Options du Pro : ' + OPTIONS_CLES.map(k => OPTIONS_COURT[k] + ' +' + OPTIONS_PRIX_MOIS[k] + ' €').join(', ') + ' par utilisateur et par mois';
  const autresTxt = (f ? 'Ou une autre formule, si elle vous convient mieux (un abonnement par utilisateur) :\n' : 'Les formules (un abonnement par utilisateur) :\n')
    + autres.map(g => '· ' + FORMULE_LBL2[g] + ' : ' + eur(PRIX_ABO_MOIS[g]) + ' TTC par mois et par utilisateur' + pourEquipe(g) + '\n  ' + lienDe(g) + (g === 'pro' ? '\n  ' + optPhrase : '')).join('\n');
  const autresHtml = '<b>' + (f ? 'Ou une autre formule, si elle vous convient mieux' : 'Choisissez votre formule') + '</b>'
    + autres.map(g => '<br><a href="' + lienDe(g).replace(/&/g, '&amp;') + '" class="m-lien" style="color:#1E7A4E;font-weight:600;text-decoration:none">' + FORMULE_LBL2[g] + '</a> · '
      + eur(PRIX_ABO_MOIS[g]) + ' TTC par mois et par utilisateur' + (n ? '<span class="m-muet" style="color:#8593AB"> · ' + pl(n, 'utilisateur') + ' : ' + eur(n * PRIX_ABO_MOIS[g]) + '</span>' : '')
      + (g === 'pro' ? '<br><span class="m-muet" style="color:#8593AB;font-size:12.5px">' + optPhrase + '</span>' : '')).join('');
  const optTxtPro = f === 'pro' ? '\n' + optPhrase + '.' : '';
  const optHtmlPro = f === 'pro' ? '<br><span class="m-muet" style="color:#8593AB;font-size:12.5px">' + optPhrase + '</span>' : '';
  return {
    subject: '⏳ Votre période offerte se termine le ' + finFr + ' — TEAM OP',
    text: 'Bonjour,\n\nla période offerte par votre code « ' + code + ' » se termine le ' + finFr + '.\n\n' + devisTxt + optTxtPro + (prelevTxt ? '\n\n' + prelevTxt : '')
      + '\n\nContinuer : ' + lien + '\n(connectez-vous avec l\'adresse qui reçoit ce message : c\'est elle qui est rattachée à votre espace)'
      + '\n\n' + autresTxt
      + '\n\nSans abonnement, après le ' + finFr + ', l\'accès à l\'application sera suspendu jusqu\'au règlement — vos données sont conservées, quoi qu\'il arrive.'
      + '\nDéjà abonné ? Rien à faire : votre abonnement prend le relais.\n\n— TEAM OP · teamop.fr',
    html: mailTeamOP({ chip: 'Échéance', chipBg: '#FFF6EE', chipColor: '#B26E12', titre: 'Plus que quelques jours ⏳',
      corpsHtml: 'Bonjour,<br>la période offerte par votre code « <b>' + code + '</b> » se termine le <b>' + finFr + '</b>. Pour continuer sans coupure, '
        + (f ? 'gardez votre formule ou choisissez-en une autre' : 'choisissez votre formule') + (n ? ' — calculé sur votre équipe d\'aujourd\'hui :' : ' :'),
      blocHtml: MAIL_BLOCS.cadre(devisHtml + optHtmlPro + prelevHtml, '#EEF7F2', '#CFE6D8', '#17233B') + '<div style="height:12px;line-height:12px;font-size:0">&nbsp;</div>'
        + MAIL_BLOCS.cadre(autresHtml) + '<div style="height:12px;line-height:12px;font-size:0">&nbsp;</div>' + MAIL_BLOCS.echeance(finFr)
        + '<div class="m-muet" style="font-size:12px;line-height:18px;color:#8593AB;padding-top:10px">Pour payer, connectez-vous avec l\'adresse qui reçoit ce message : c\'est elle qui est rattachée à votre espace. Déjà abonné ? Rien à faire : votre abonnement prend le relais.</div>',
      boutonTxt: (n && f) ? 'Continuer avec ' + pl(n, 'abonnement') : 'Choisir mon abonnement', boutonUrl: lien,
      bouton2Txt: 'Ouvrir mon application', bouton2Url: 'https://teamop.fr/app.html' })
  };
}
/* ⛔ LE RAPPEL DES SEPT JOURS À UNE ENTREPRISE DÉJÀ ABONNÉE À OP GESTION (`gardien`, 29 septembre 2026, rejoué). Payer
   pendant la période ne prélève plus rien avant sa fin (`finEssaiPeriode`) : rien sur le relevé, donc rien qui rappelle
   au client qu'il a déjà payé — et le courriel habituel lui mettait sous les yeux « Continuer avec N abonnements » et la
   promesse « rien n'est prélevé avant… ». Un second paiement, c'était un second abonnement, prélevé EN DOUBLE à la fin de
   l'essai. Ce courriel-ci ne porte AUCUN lien de paiement : il dit que l'abonnement prend le relais, et quand. */
function rappelAbonneMail(code, finLe, ab) {
  const fr = d => String(d).split('-').reverse().join('/');
  const finFr = fr(finLe);
  /* résilié mais courant au-delà de la période : jusqu'à sa fin, et le prélèvement qui aura lieu avant, s'il est en essai */
  const arret = 'a été résilié : il s\'arrête le ' + fr(ab.resilie) + '. Ensuite, sans nouvel abonnement, l\'accès à l\'application sera suspendu jusqu\'au règlement — vos données sont conservées.';
  /* ⛔ carte refusée = impayé, accès payant bloqué jusqu'au règlement (Justin, 29 septembre 2026) : le premier prélèvement
     d'un abonnement en essai le DIT, pour que la carte soit à jour ce jour-là */
  const siRefus = ' S\'il n\'aboutit pas, les fonctions payantes seront bloquées jusqu\'au règlement — vos données ne bougent pas.';
  const quand = ab.resilie ? (ab.premier ? 'Le premier prélèvement de votre abonnement aura lieu le ' + fr(ab.premier) + '.' + siRefus + ' Il ' + arret : 'Votre abonnement ' + arret)
    : ab.premier ? 'Le premier prélèvement de votre abonnement aura lieu le ' + fr(ab.premier) + '.' + siRefus
    : ab.prochaine ? 'Prochaine échéance de votre abonnement : le ' + fr(ab.prochaine) + '.' : '';
  /* ⛔ un AUTRE abonnement refusé (`impaye` : un impayé parmi des abonnements payés) : l'abonnement qui paie prend le relais,
     mais les places que paie le refusé ne sont plus servies jusqu'au règlement (`placesStripe` ne compte que le payé) ; un
     abonnement résilié prend le relais jusqu'à sa fin, et pas au-delà. Une entreprise dont TOUS les abonnements sont refusés
     reçoit l'autre courriel (`rappelImpayeMail`). */
  const suite = (ab.resilie ? 'Votre abonnement prend le relais jusqu\'au ' + fr(ab.resilie) + '.' : 'Votre abonnement prend le relais' + (ab.impaye ? '.' : ' : vous n\'avez rien à faire.'))
    + (ab.impaye ? ' Mais le dernier prélèvement d\'un autre de vos abonnements n\'a pas abouti : les places qu\'il paie sont suspendues jusqu\'au règlement. Pour le régler, écrivez-nous à contact@teamop.fr.' : '');
  return {
    subject: '⏳ Votre période offerte se termine le ' + finFr + ' — votre abonnement prend le relais',
    text: 'Bonjour,\n\nla période offerte par votre code « ' + code + ' » se termine le ' + finFr + '.\n' + suite + (quand ? '\n' + quand : '')
      + '\n\nUne question : contact@teamop.fr\n\n— TEAM OP · teamop.fr',
    html: mailTeamOP({ chip: 'Abonnement', chipBg: '#EEF7F2', chipColor: '#1E7A4E', titre: 'Votre abonnement prend le relais' + (ab.impaye || ab.resilie ? '' : ' ✅'),
      corpsHtml: 'Bonjour,<br>la période offerte par votre code « <b>' + code + '</b> » se termine le <b>' + finFr + '</b>. ' + suite.replace(/(\d{2}\/\d{2}\/\d{4})/g, '<b>$1</b>'),
      blocHtml: quand ? MAIL_BLOCS.cadre('💳 ' + quand.replace(/le (\d{2}\/\d{2}\/\d{4})/g, 'le <b>$1</b>'), '#EEF7F2', '#CFE6D8', '#17233B') : '',
      boutonTxt: 'Ouvrir mon application', boutonUrl: 'https://teamop.fr/app.html' })
  };
}
/* ⛔⛔ LE RAPPEL DES SEPT JOURS À UNE ENTREPRISE DONT L'ABONNEMENT EST EN IMPAYÉ (Justin, 29 septembre 2026 : carte refusée =
   impayé, « leur accès sont bloqués le temps que c'est pas payé », « rien n'est perdu »). Ni « prend le relais » (l'application
   grisera les fonctions payantes à la fin de la période), ni lien vers la page de paiement (un second abonnement serait
   prélevé EN DOUBLE le jour où Stripe réussit sa nouvelle tentative), ni la promesse « rien n'est prélevé avant… » : la
   FACTURE EN ATTENTE, à régler (`url`, relue chez Stripe au moment d'écrire), sinon l'adresse du support. */
function rappelImpayeMail(code, finLe, url) {
  const fr = d => String(d).split('-').reverse().join('/');
  const finFr = fr(finLe);
  const mL = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(finLe || ''));
  const lendemain = mL ? fr(new Date(Date.UTC(+mL[1], +mL[2] - 1, +mL[3] + 1)).toISOString().slice(0, 10)) : '';
  const bloc = 'Le dernier prélèvement de votre abonnement n\'a pas abouti.' + (lendemain ? ' À partir du ' + lendemain + ', les' : ' Les')
    + ' fonctions payantes seront bloquées tant qu\'il n\'est pas réglé. Vos données ne bougent pas, et tout revient dès le règlement.';
  const agir = url ? 'Réglez votre facture en attente (vous pouvez changer de carte) : ' + url : 'Pour le régler, écrivez-nous à contact@teamop.fr.';
  return {
    subject: '⏳ Votre période offerte se termine le ' + finFr + ' — un prélèvement est à régler',
    text: 'Bonjour,\n\nla période offerte par votre code « ' + code + ' » se termine le ' + finFr + '.\n' + bloc + '\n' + agir
      + '\n\nUne question : contact@teamop.fr\n\n— TEAM OP · teamop.fr',
    html: mailTeamOP({ chip: 'Abonnement', chipBg: '#FDF1E7', chipColor: '#A4501B', titre: 'Un prélèvement est à régler',
      corpsHtml: 'Bonjour,<br>la période offerte par votre code « <b>' + code + '</b> » se termine le <b>' + finFr + '</b>.',
      blocHtml: MAIL_BLOCS.cadre('💳 ' + bloc.replace(/le (\d{2}\/\d{2}\/\d{4})/g, 'le <b>$1</b>').replace(/du (\d{2}\/\d{2}\/\d{4})/g, 'du <b>$1</b>'), '#FDF1E7', '#F2D3BC', '#17233B')
        + (url ? '' : '<p style="margin:12px 0 0">Pour le régler, écrivez-nous à <b>contact@teamop.fr</b>.</p>'),
      boutonTxt: url ? 'Régler ma facture' : 'Ouvrir mon application', boutonUrl: url || 'https://teamop.fr/app.html' })
  };
}
/* L'abonnement OP GESTION d'une entreprise, pour le rappel des sept jours : `aucun` (le courriel habituel), `inconnu` (Stripe
   illisible, ou sa liste périmée : on ne SAIT pas), `impaye` (ses abonnements d'OP GESTION ne sont qu'en impayé — carte
   refusée : `rappelImpayeMail`, avec `surs` pour trouver la facture), ou `abonne` avec la date de son premier prélèvement (en
   essai), de sa prochaine échéance, ou de sa fin s'il est résilié (`impaye` : un autre de ses abonnements est refusé).
   ⛔⛔ LA DÉCISION EST CELLE QU'`espacePaye` PRENDRA LE LENDEMAIN DE LA FIN DE LA PÉRIODE (seconde relecture de `gardien`,
   29 septembre 2026). Décider sur l'état d'aujourd'hui disait « rien à faire » à une entreprise que l'application
   repasserait en Gratuit : un abonnement résilié avant la fin (le sien, ou celui d'une autre entreprise à la même adresse
   qui la rendait « payée »), ou un abonnement résilié qui faisait seul monter une fiche Gratuit. On rejoue donc les mêmes
   règles (`espaceStripeDans`, `formuleEtPlaces`) sur les seuls abonnements encore vivants ce jour-là.
   · réglée à la main dans la Tour : `espacePaye` décide sans lire Stripe — le courriel habituel, comme avant (sans la
     promesse : `finEssaiPeriode` la refuse aussi). Une fiche SANS formule, elle, se juge sur Stripe comme une fiche
     « Gratuit » (30 septembre 2026) ;
   · Gratuit servi ce jour-là (OP MESSAGES seul, fiche Gratuit que rien de lisible ne fait monter) : le courriel habituel ;
   · les dates se lisent sur SES abonnements d'OP GESTION (`memes` : ni OP MESSAGES trouvé le premier, ni l'abonnement d'une
     autre entreprise à la même adresse — abonnée alors, sans date) ; plusieurs : le plus durable ;
   · les jours sont ceux de Paris (un renouvellement à 23 h 30 UTC tombe le lendemain chez le client). */
async function abonnementGestion(e, finLe) {
  if (!(config.stripe && config.stripe.secretKey) || !e) return { etat: 'aucun' };
  /* (une fiche SANS formule ne sort plus ici : `espacePaye` la juge sur Stripe, comme une fiche « Gratuit » — un abonnement
     d'OP GESTION déjà payé la servira, et un lien de paiement ferait un second abonnement, prélevé en double) */
  if (aboManuelDe(e, jourApres(finLe))) return { etat: 'aucun' };   // le lendemain de la période (`gardien` B2)
  try { await espaceStripe(e); } catch (err) {}
  /* ⛔ STRIPE ILLISIBLE — OU SEULEMENT UNE LISTE PÉRIMÉE (la dernière connue sert pendant une panne) : un paiement fait depuis
     n'y est pas, et on inviterait à payer une entreprise qui vient de le faire */
  if (!espStripeCache.data || Date.now() - espStripeCache.ts > STRIPE_CACHE_MS) return { etat: 'inconnu' };
  const mF = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(finLe || ''));
  if (!mF) return { etat: 'inconnu' };
  const debut = Date.UTC(+mF[1], +mF[2] - 1, +mF[3] + 1) / 1000;   // le lendemain de la fin de la période, 0 h UTC
  const lignes = sb => (sb && sb.items && Array.isArray(sb.items.data)) ? sb.items.data : [];
  const sec = x => { const n = parseInt(x, 10); return n > 0 ? n : 0; };
  const finPeriode = sb => sec(sb.current_period_end) || sec((lignes(sb)[0] || {}).current_period_end);
  /* la fin programmée d'un abonnement résilié ; sans date lisible, on ne sait pas quand il s'arrête : il ne compte pas */
  const finProg = sb => sec(sb.cancel_at) || (sb.cancel_at_period_end ? (finPeriode(sb) || sec(sb.trial_end) || 1) : 0);
  let s = null, fp = null, imp = null;
  try {
    const encore = espStripeCache.data.filter(sb => { const f = finProg(sb); return !f || f > debut; });
    s = espaceStripeDans(e, encore);
    /* ⛔ ses abonnements d'OP GESTION en IMPAYÉ ce jour-là (carte refusée) : ils ne servent rien (`espacePaye`), et un
       courriel qui dirait « prend le relais » mentirait — le rappel les nomme (`rappelImpayeMail`) */
    imp = impayesGestion(e, encore);
  } catch (err) { return { etat: 'inconnu' }; }
  /* ⛔ la règle d'`espacePaye` (`impayeBloque`) : ce que le courriel annonce est ce que l'application fera le lendemain —
     OP MESSAGES seul payé, ou le payé d'une voisine d'adresse, n'y change rien quand l'impayé est sûrement à elle ; le
     courriel habituel lui mettrait sous les yeux un lien vers un SECOND abonnement */
  if (impayeBloque(e, s, imp)) return { etat: 'impaye', abo: imp.abo, surs: imp.surs };
  if (!s) return { etat: 'aucun' };
  const gestion = (s.memes || []).filter(sb => sb && aboDeGestion(sb));
  try { fp = formuleEtPlaces(e, s); } catch (err) { fp = null; }
  /* la formule servie le lendemain, décidée comme `espacePaye` la décidera : « gratuit » n'est plus servi (30 septembre
     2026 : suspendue) — le courriel habituel ; une fiche « Gratuit » qu'un abonnement d'OP GESTION illisible paie reçoit Pro
     (`gratuitPayeIllisible`) — elle est servie, pas de lien de paiement */
  const servie = gratuitPayeIllisible(e, s, fp) ? formuleGratuitIllisible(s, e) : ((fp && fp.f) || e.formule);
  /* « gratuit », RIEN (une fiche sans formule que rien de lisible ne paie) ou une formule que l'application ne connaît pas :
     suspendue le lendemain (`accesSuspenduPar`) — le courriel habituel, avec son lien */
  if (!RANG_FORMULE.includes(servie)) return { etat: 'aucun' };
  if (!gestion.length) return { etat: 'abonne', impaye: false, resilie: '', premier: '', prochaine: '' };
  /* le plus durable d'abord : non résilié ; puis actif, en essai ; puis celui qui court le plus loin — un impayé n'est plus
     parmi eux (`espaceStripeDans` ne compte que le payé) */
  const rang = sb => (finProg(sb) ? 4 : 0) + (sb.status === 'trialing' ? 1 : 0);
  const abo = gestion.slice().sort((a, b) => rang(a) - rang(b) || (finProg(b) - finProg(a)))[0];
  const fin = finProg(abo);
  const jour = n => {
    if (!n) return '';
    const p = {};
    for (const x of new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(n * 1000))) p[x.type] = x.value;
    return p.year + '-' + p.month + '-' + p.day;
  };
  return { etat: 'abonne', impaye: !!imp, resilie: fin ? jour(fin) : '',
    premier: abo.status === 'trialing' ? jour(sec(abo.trial_end) || finPeriode(abo)) : '',
    prochaine: !fin && abo.status !== 'trialing' ? jour(finPeriode(abo)) : '' };
}
async function rappelsEcheances() {
  try {
    if (!mailer) return;
    const auj = new Date().toISOString().slice(0, 10);
    const lim = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    /* Ce qui rend une entreprise ÉLIGIBLE au rappel — une fonction, parce qu'elle se relit APRÈS l'attente de Stripe (seconde
       relecture de `gardien`) : l'annuaire, la période et le réglage de la Tour ont pu bouger pendant ce temps (une entreprise
       fermée, supprimée ou « repartie à neuf » depuis la Tour, une adresse changée, une période prolongée ou effacée, un autre
       passage qui l'a déjà prévenue). `null` : pas de rappel pour elle à ce passage. */
    const eligible = (code, t, finLe) => {
      const eq = promoUsages && promoUsages[code] && promoUsages[code].equipes && promoUsages[code].equipes[t];
      if (!eq || !eq.finLe || eq.finLe !== finLe || eq.finLe < auj || eq.finLe > lim) return null;   // ni passée, ni loin, ni changée
      /* Tous les noms de l'entreprise : « déjà prévenu » se lit sur n'importe lequel (un espace renommé en porte
         plusieurs), et la marque se pose sur tous — sinon le rappel repartait le jour où un autre nom devenait
         le plus récent. L'adresse et l'abonnement réglé à la main se lisent sur l'entrée que l'APPLICATION lit
         (`espaceParT` : la plus récente). */
      const noms = Object.keys(espacesReg).filter(s => espacesReg[s] && espaceT(espacesReg[s]) === t);
      if (!noms.length || noms.some(s => espacesReg[s].rappelFin === eq.finLe)) return null;   // inconnue, ou déjà prévenue
      if (espaceFerme(t)) return null;   // une entreprise fermée ne reçoit pas « payez pour continuer »
      const e = espaceParT(t);
      const dest = (e && e.email) || (noms.map(s => espacesReg[s].email).find(Boolean) || '');
      if (!dest) return null;   // pas d'adresse
      /* ⛔ UN ABONNEMENT RÉGLÉ À LA MAIN DANS LA TOUR PRIME sur le code (`espacePaye`) : s'il court au-delà de la
         période offerte, l'application ne sera PAS suspendue — le rappel mentirait. (Une fiche « Gratuit » d'avant réglée
         « active » ne prime plus sur rien : `aboManuelDe`.) */
      if (e && aboManuelDe(e, jourApres(eq.finLe)) && (e.aboStatut === 'actif' || e.aboStatut === 'essai') && (!e.aboFin || e.aboFin > eq.finLe)) return null;
      return { eq, noms, e, dest, sig: [dest, e && e.formule, e && e.aboStatut, e && e.aboFin].join('|') };
    };
    for (const [code, u] of Object.entries(promoUsages || {})) {
      for (const [t, eq0] of Object.entries((u && u.equipes) || {})) {
        /* ⛔ UNE ENTREPRISE QUI JETTE N'ARRÊTE PAS LES AUTRES (seconde relecture de `gardien`) : sans ce `try`, une donnée
           inattendue arrêtait tout le passage — et le même arrêt revenait à chaque passage, sur la même donnée. */
        try {
          if (!eq0 || !eq0.finLe) continue;
          const el0 = eligible(code, t, eq0.finLe);
          if (!el0) continue;
          /* ⛔ DÉJÀ ABONNÉE : le courriel sans lien de paiement (`rappelAbonneMail`) — un second paiement serait un second
             abonnement. La décision est celle qu'`espacePaye` prendra le lendemain de la fin (`abonnementGestion`). */
          const ab = await abonnementGestion(el0.e, eq0.finLe);
          /* ⚠️ L'ATTENTE DE STRIPE REND LA MAIN au serveur : on relit TOUT avant d'écrire. Une entreprise qui a changé pendant
             ce temps attend le passage suivant, qui la reprend de zéro (avant : une entrée disparue faisait jeter la boucle, et
             s'arrêter TOUS les rappels du passage). */
          const el = eligible(code, t, eq0.finLe);
          if (!el || el.sig !== el0.sig) continue;
          const { eq, noms, e, dest } = el;
          /* ⛔ LA FORMULE QUE L'ENTREPRISE UTILISE AUJOURD'HUI D'ABORD — celle que la période offerte SERT (`formulePromo` :
             le code, jamais sous la fiche ; la relecture adverse du 28 septembre avait déjà écarté « celle du code seule »,
             qui décrivait une formule que personne n'avait). Le courriel la présente en premier, puis propose les autres :
             le client choisit (Justin, 29 septembre 2026). Rien de connu (code retiré, fiche sans formule) : pas de prix
             inventé pour « sa » formule, les trois sont proposées. */
          const f = formulePromo(e, code);
          const n = (comptesReg[t] && comptesReg[t].c) ? Object.keys(comptesReg[t].c).length : 0;
          /* ⛔ « RIEN N'EST PRÉLEVÉ AVANT LA FIN » ne s'écrit que si c'est VRAI pour ce client — la règle même de la page de
             paiement (`finEssaiPeriode`) : son adresse désigne cette entreprise et elle SEULE (deux entreprises à une adresse,
             et le paiement sans référence ne choisit pas : facturation immédiate), avec cette période-là. Stripe exige 48 h
             d'essai : la page le fait jusqu'à l'avant-veille de la fin, 23 h 50 UTC. La limite annoncée est donc
             l'avant-veille — en France ce jour finit à 22 h ou 23 h UTC, avant la limite réelle — et seulement si elle est
             encore à venir (un rappel parti tard ne promet pas un délai passé). */
          const es = finEssaiPeriode([], String(dest).trim().toLowerCase());
          const mL = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(eq.finLe));
          const limite = mL ? new Date(Date.UTC(+mL[1], +mL[2] - 1, +mL[3] - 2)).toISOString().slice(0, 10) : '';
          /* ⛔ STRIPE ILLISIBLE (ou sa liste périmée) : on ne sait pas si l'entreprise a déjà payé — l'inviter à payer pourrait
             lui faire prendre un second abonnement. Tant que la promesse aurait encore un délai (la limite est à venir), le
             rappel attend le passage suivant (six heures), sans marque ; ensuite il part tel quel, SANS la promesse : prévenir
             de la fin vaut mieux que se taire (seconde relecture de `gardien`). */
          if (ab.etat === 'inconnu' && limite > auj) {
            console.log('rappel échéance reporté →', masqueMail(dest), '(fin ' + eq.finLe + ', Stripe illisible : nouvel essai au prochain passage)');
            continue;
          }
          /* ⛔ EN IMPAYÉ (carte refusée) : la facture en attente, relue chez Stripe au moment d'écrire — jamais le lien vers un
             second abonnement. Stripe muet : comme « illisible » (on attend tant que ça a un sens, puis sans lien) ; réglée
             depuis la liste : « prend le relais », sans lien, puisque c'est désormais vrai. */
          let urlFacture = '';
          if (ab.etat === 'impaye') {
            let lue = null, echec = false;
            for (const sb of (ab.surs || []).slice(0, 5)) {
              try { const f = await factureOuverteDe(sb.id, config.stripe.secretKey); if (f.impaye) { lue = f; break; }
                if (!lue || (STATUTS_PAYES.includes(f.statut) && !STATUTS_PAYES.includes(lue.statut))) lue = f; }
              catch (err) { echec = true; break; }
            }
            if (echec && limite > auj) { console.log('rappel échéance reporté →', masqueMail(dest), '(fin ' + eq.finLe + ', impayé : facture illisible, nouvel essai au prochain passage)'); continue; }
            /* réglée depuis la liste : l'abonnement COURT (actif, en essai) — « prend le relais ». ANNULÉ depuis, il ne prend
               le relais de rien : le courriel habituel, avec son lien (troisième relecture, 30 septembre 2026 — il disait « vous
               n'avez rien à faire » à une entreprise suspendue le lendemain de la fin) */
            if (lue && !lue.impaye && STATUTS_PAYES.includes(lue.statut)) { ab.etat = 'abonne'; ab.impaye = false; ab.resilie = ''; ab.premier = ''; ab.prochaine = ''; }
            else if (lue && !lue.impaye) { ab.etat = 'aucun'; ab.impaye = false; }
            else urlFacture = (lue && lue.url) || '';
            /* l'attente de la facture rend la main à son tour : on relit, comme plus haut */
            const el2 = eligible(code, t, eq0.finLe);
            if (!el2 || el2.sig !== el0.sig) continue;
          }
          const prelev = ab.etat === 'aucun' && es && es.t === String(t).trim() && es.finLe === eq.finLe && limite > auj
            ? { limite: limite.slice(8, 10) + '/' + limite.slice(5, 7), debut: es.debut.split('-').reverse().join('/') } : null;
          const avant = {}; for (const s of noms) { avant[s] = espacesReg[s].rappelFin; espacesReg[s].rappelFin = eq.finLe; }
          espacesEcrire();
          const m = ab.etat === 'abonne' ? rappelAbonneMail(code, eq.finLe, ab) : ab.etat === 'impaye' ? rappelImpayeMail(code, eq.finLe, urlFacture) : rappelEcheanceMail(code, eq.finLe, f, n, prelev);
          mailerEnvoi({ from: config.smtp.from || config.smtp.user, to: dest, subject: m.subject, text: m.text, html: m.html })
            /* Un destinataire REFUSÉ pendant que la copie cachée passe ne fait pas échouer l'envoi (`gardien`) : le journal
               ne dit donc pas « envoyé » pour lui. Pas de nouvel essai — un refus d'adresse ne change pas en six heures, et
               chaque essai remettrait une copie dans la boîte du support. */
            .then(info => {
              const refus = ((info && info.rejected) || []).some(a => String((a && a.address) || a).toLowerCase() === String(dest).toLowerCase());
              if (refus) console.error('rappel échéance REFUSÉ par la messagerie du client →', masqueMail(dest), '(fin ' + eq.finLe + ') — à prévenir autrement');
              else console.log('rappel échéance envoyé →', masqueMail(dest), '(fin ' + eq.finLe + ', ' + (ab.etat === 'abonne' ? 'déjà abonnée' + (ab.impaye ? ', dont un abonnement en impayé' : '') + (ab.resilie ? ', résiliée au ' + ab.resilie : '')
                : ab.etat === 'impaye' ? 'en impayé, ' + (urlFacture ? 'facture à régler' : 'sans facture lisible : écrire au support')
                : n + ' utilisateur(s), ' + (f || 'formule inconnue') + (ab.etat === 'inconnu' ? ', Stripe illisible : sans la promesse' : '')) + ')');
            })
            /* ⛔ UN RAPPEL QUI N'EST PAS PARTI SE RETENTE : la marque posée avant l'envoi (deux passages ne doivent pas
               le doubler) se retire, et le passage suivant — six heures plus tard — recommence, tant que la période
               court. Avant, un serveur d'e-mails indisponible ce jour-là le perdait pour toujours.
               ⚠️ Un message ARRIVÉ dont la réponse s'est perdue (connexion coupée avant le « 250 ») repart au passage suivant :
               le client le reçoit deux fois. Rare, borné (un essai par passage, sept jours au plus) — accepté : deux rappels
               valent mieux qu'aucun. Et le motif du refus passe par `sansAdresses` : un serveur d'e-mails cite volontiers
               l'adresse qu'il refuse (« 554 5.7.1 <client@…> »), et ce journal ne porte aucune adresse de client en clair. */
            .catch(err => {
              console.error('rappel échéance non parti (' + sansAdresses(String((err && err.message) || err)) + ') — nouvel essai au prochain passage');
              let defait = false;
              for (const s of noms) if (espacesReg[s] && espacesReg[s].rappelFin === eq.finLe) { espacesReg[s].rappelFin = avant[s]; defait = true; }
              if (defait) espacesEcrire();
            });
        } catch (err) { console.error('rappelsEcheances (une entreprise) :', sansAdresses(String((err && err.message) || err))); }
      }
    }
  } catch (e) { console.error('rappelsEcheances:', e.message); }
}
/* Le premier passage attend 90 s après le démarrage ; `TEAMOP_RAPPELS_DELAI_MS` le raccourcit pour un banc d'essai
   (`tests/test-840.js`), qui ne va pas attendre une minute et demie — jamais sous la seconde. */
setTimeout(rappelsEcheances, Math.max(1000, parseInt(process.env.TEAMOP_RAPPELS_DELAI_MS, 10) || 90 * 1000));   // un premier passage peu après le démarrage
setInterval(rappelsEcheances, 6 * 3600000);   // puis toutes les 6 heures

/* ══ LE DOCUMENT D'ÉQUIPE, CHEZ NOUS — LA SORTIE DE FIREBASE (voir `server/documents.js`) ════
   ⛔ MONTÉ ICI, EN FIN DE FICHIER, ET C'EST UNE PRÉCAUTION MESURÉE. Le module a besoin de
   `sauvRefus` (qui lit `ESPACES_INTOUCHABLES`), de `versionsCfg` et de `FB_PROJET` : trois
   `const`/`let` déclarés des centaines de lignes après le montage des pièces jointes. Monté
   là-haut, le premier appel au montage aurait touché une zone morte temporelle — la faute exacte
   qui a éteint toute la sauvegarde hors site le 19 septembre 2026, avalée par un `catch`.
   `versionMin` est une FONCTION pour la même raison : lue à chaque requête, jamais au montage.
   Et s'il refuse de se monter, le reste du serveur continue — `/health` dit `actif:false`. */
let documentsMod = null;
try {
  documentsMod = require('./documents').monterDocuments(app, { config, DATA_DIR, sauvRefus, cleEstPublique, quotaOk, monStr,
    versionMin: () => versionsCfg.min, fbLireDocument,
    /* Le minimum que Firestore a CONFIRMÉ (la copie l'attend), l'annuaire illisible (503, pas
       404), et, pour l'inventaire d'avant l'extinction, le patron et la liste des entreprises. */
    versionFirestore: () => +versionsCfg.minFirestore || 0,
    annuaireIllisible: () => espacesIllisible,
    monPatronStrict,
    espacesConnus: () => Object.values(espacesReg).map(e => {
      if (!e) return '';
      if (e.t) return String(e.t);
      try { return String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t || ''); } catch (err) { return ''; }
    }).filter(Boolean) });
} catch (e) {
  console.error('documents d\'équipe non montés :', e.message);
}

/* ══ AUCUNE ROUTE NE DOIT ÊTRE DÉCLARÉE DEUX FOIS ══════════════════════════════════════════
   ⛔ LA PREMIÈRE ENREGISTRÉE GAGNE, ET LA SECONDE NE RÉPOND JAMAIS — sans un mot. C'est arrivé :
   `/api/devis/etat` était déclarée dans `agent-devis.js` ET ici ; la seconde, plus riche, n'a
   jamais servi, et personne ne l'a vu pendant des mois. Avec 145 routes sur cinq fichiers, une
   route ajoutée en fin de fichier peut être masquée en silence.

   ⚠️ ON NE REFUSE PAS DE DÉMARRER, ET C'EST UN ÉCART ASSUMÉ AU PLAN (§2.4 dit « REFUSE de
   démarrer »). La raison est mesurée : un push sur `main` touchant `server/**` DÉPLOIE
   (`.github/workflows/deploiement.yml`). Un serveur qui refuse de démarrer, c'est ELAN sans API
   du tout — une panne bien pire qu'une route fantôme. L'endroit où il faut refuser, c'est AVANT
   le déploiement : `tests/test-724.js` lance le vrai serveur et exige zéro doublon (723, lui,
   exerce le module sans serveur), donc la CI tombe et le commit ne part pas. Ici, on crie : au journal, et sur `/health` (donc dans la
   surveillance horaire). Bruyant et vivant plutôt que muet ou mort. */
const routesDoublons = (() => {
  const vu = new Map(), doubles = [];
  for (const c of (app._router && app._router.stack) || []) {
    if (!c.route || !c.route.path) continue;
    for (const m of Object.keys(c.route.methods || {})) {
      const k = m.toUpperCase() + ' ' + c.route.path;
      if (vu.has(k)) doubles.push(k); else vu.set(k, 1);
    }
  }
  if (doubles.length) {
    console.error('⛔ ROUTES DÉCLARÉES DEUX FOIS — la seconde ne répondra JAMAIS :');
    for (const d of doubles) console.error('   ' + d);
  }
  return doubles;
})();

/* ══ LE FILET DES ROUTES — EN DERNIER, APRÈS TOUTES LES ROUTES ══════════════════════════════
   ⛔ MESURÉ LE 25 SEPTEMBRE 2026 : un corps JSON malformé (`{"t":`) envoyé à n'importe quelle
   route rendait la page d'erreur d'Express AVEC SA PILE — chemins du serveur, versions des
   bibliothèques — à n'importe qui. Express ne s'en abstient que sous `NODE_ENV=production`,
   que l'unité systemd ne posait pas. Ce filet ne dépend plus de ce réglage : du texte brut, un
   mot, jamais une pile. Le journal garde la route (son MODÈLE, jamais l'adresse demandée, qui
   peut porter n'importe quoi) et le type d'erreur ; `/health` compte les 5xx de l'heure.
   Aucune route n'est montée après ce point (tous les modules se montent au chargement) : le
   404 ne peut en masquer aucune. */
app.use((req, res) => { res.status(404).type('text/plain').send('introuvable'); });
app.use((err, req, res, next) => {
  const code = (err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600) ? err.status : 500;
  if (code >= 500) {
    incidentNoter('erreur');
    console.error('⛔ erreur de route —', req.method, (req.route && req.route.path) || 'hors route', '·',
      String((err && (err.type || err.code || err.name)) || 'erreur').slice(0, 40), '·', incidentOu(err));
  }
  if (res.headersSent) return next(err);
  res.status(code).type('text/plain').send(code === 400 ? 'requête illisible' : code === 413 ? 'requête trop lourde'
    : code < 500 ? 'requête refusée' : 'erreur du serveur');
});

const PORT = process.env.PORT || 8080;
const serveur = app.listen(PORT, '127.0.0.1', () => console.log('TeamOP API sur 127.0.0.1:' + PORT));

/* ══ L'ARRÊT PROPRE ════════════════════════════════════════════════════════════════════════
   ⛔ SIGTERM ARRIVE À CHAQUE DÉPLOIEMENT, et un push sur `main` touchant `server/**` déploie —
   donc plusieurs fois par jour les jours chargés. Sans fermeture, les bases SQLite du socle
   laissent leur journal WAL non fusionné : rien n'est perdu (c'est tout l'intérêt du WAL), mais
   le démarrage suivant doit le rejouer et les fichiers `-wal`/`-shm` traînent.
   ⚠️ LE MINUTEUR EST LA PARTIE QUI COMPTE : si une fermeture s'éternise, systemd envoie SIGKILL
   et on perd le bénéfice. On se donne 5 secondes, puis on sort quand même — un arrêt imparfait
   vaut mieux qu'un arrêt qui pend. */
let enArret = false;
function arretPropre(signal) {
  if (enArret) return; enArret = true;
  console.log('arrêt (' + signal + ') — fermeture en cours');
  const secours = setTimeout(() => { console.error('arrêt : délai dépassé, sortie forcée'); process.exit(0); }, 5000);
  secours.unref();
  /* ⛔ `close()` EST ASYNCHRONE. La première version appelait `clearTimeout` et `process.exit`
     sur le MÊME tick : le minuteur de secours ne pouvait jamais se déclencher, et rien
     n'attendait les requêtes en vol — le commentaire décrivait un comportement que le code
     n'avait pas. `gardien`, 18 septembre 2026. On ferme le socle dans le RAPPEL de `close()`,
     et le secours sert enfin à quelque chose : si une connexion tenue (un long-poll) empêche
     `close()` de rendre la main, on sort quand même au bout de cinq secondes plutôt que de
     pendre jusqu'au SIGKILL de systemd. */
  /* ⛔ ON RELÂCHE LES FLUX AVANT DE FERMER LE SERVEUR. `close()` attend que TOUTES les
     connexions se terminent ; un long-poll est tenu 25 s et il y en a toujours au moins un en
     production. Mesuré : avec un seul flux ouvert, `close()` ne rappelait jamais, le secours
     de 5 s sortait, « socle fermé » n'était jamais écrit et le WAL restait sur le disque — à
     chaque déploiement. Relâcher d'abord fait aboutir `close()` en quelques millisecondes. */
  try { if (opSocle && opSocle.relacher) console.log('flux relâchés :', opSocle.relacher()); } catch (e) {}
  const fermerSocle = () => {
    try { if (opSocle && opSocle.fermer) console.log('socle fermé :', JSON.stringify(opSocle.fermer())); }
    catch (e) { console.error('socle non fermé :', e.code || 'erreur'); }
    clearTimeout(secours);
    process.exit(0);
  };
  try { serveur.close(fermerSocle); } catch (e) { fermerSocle(); }
}
process.on('SIGTERM', () => arretPropre('SIGTERM'));
process.on('SIGINT', () => arretPropre('SIGINT'));
