/* ══ LES BOÎTES MAIL D'UNE PERSONNE — LA RUBRIQUE « COURRIER » D'OP MESSAGES (6 novembre 2026) ═══════════════════════════════════
 *
 * Justin : « je veux qu'ils puissent avoir leur boîte mail dans l'application » — et pour OP MESSAGES : « ça doit marcher sur OP MESSAGES ».
 * Une PERSONNE (le compte OP MESSAGES connecté) relie ses boîtes (IMAP/SMTP avec un mot de passe d'application, ou Google / Microsoft par
 * autorisation, `boites-mail-oauth.js`), les lit, y répond, les délie. Rien n'est partagé avec OP GESTION (`tests/test-900.js`) : le code d'OP GESTION
 * (`server/index.js`, `coffre-boites.js`, `boite-oauth.js`) a servi de MODÈLE, recopié et adapté ; ses boîtes, elles, ne sont jamais lues ici.
 *
 *   GET  /api/boites-mail                              S  {ouvert, oauth:{google, microsoft}, boites:[{id, adresse, nom, fournisseur, etat}]}
 *   POST /api/boites-mail                              V  {adresse, nom?, mdp, serveurs?:{imap, imapPort, smtp, smtpPort}} → 201 {boite}
 *   POST /api/boites-mail/oauth/demarrer               V  {fournisseur:'google'|'microsoft', email?} → {url}
 *   GET  /api/boites-mail/oauth/retour                 P  le retour du fournisseur (SANS cookie : le `state` signé dit qui) → une page qui renvoie vers « / »
 *   POST /api/boites-mail/:id/supprimer                S  délier (le secret part avec la ligne)
 *   GET  /api/boites-mail/:id/messages                 S  {messages:[…]} — les derniers de la réception, lus chez le fournisseur À LA DEMANDE
 *   GET  /api/boites-mail/:id/messages/:uid            S  {corps, pj:[{nom, taille, type, id}]} — du TEXTE, jamais du HTML
 *   GET  /api/boites-mail/:id/messages/:uid/pieces/:p  S  une pièce jointe, en téléchargement seulement
 *   POST /api/boites-mail/:id/messages/:uid/marquer    S  {lu?, drapeau?}
 *   POST /api/boites-mail/:id/envoyer                  V  {a, objet, texte, pieces?:[{nom, type, b64}], enReponseA?:uid}
 *
 * ⛔ INERTE SANS CONFIGURATION (`config.boitesMail`, `config.js`) : toutes ces routes répondent 503 `boites_mail_fermees` et la page garde « Bientôt ».
 * ⛔ UNE BOÎTE EST À UNE PERSONNE. Toute lecture se fait POUR `req.moi.id` : la boîte d'une autre répond 404, le MÊME 404 qu'une boîte qui n'existe pas.
 * ⛔ LE SECRET (mot de passe d'application, jeton de renouvellement) est scellé au repos (`stockage.boiteMailCreer`) avec tout ce qui ouvre la boîte, n'est
 * renvoyé par AUCUNE réponse, n'entre dans AUCUN journal (le journal n'a que des champs d'une liste blanche), et part avec le compte.
 * ⛔ AUCUN MESSAGE N'EST RANGÉ ICI : le service les lit chez le fournisseur quand la page les demande, les rend, et les oublie. Rien à fuir du disque.
 * ⛔ UN MESSAGE EST UNE ENTRÉE HOSTILE. Seul le TEXTE est rendu (`text` de mailparser, qui convertit un HTML en texte) — aucun HTML ne traverse, donc aucune image
 * distante, aucun script, aucun lien piégé exécuté. Les en-têtes sont des lignes assainies et bornées ; une pièce ne se sert qu'en `attachment`, `nosniff`, sous
 * `sandbox` ; un message trop gros ou illisible répond une erreur, il ne fait pas tomber le service.
 * ⛔ LE SERVEUR QU'ON NOUS DONNE EST UNE DESTINATION : une personne qui tape `serveurs` ne doit pas faire parler ce service à nos machines (SSRF). Un nom d'hôte
 * ne passe que s'il se RÉSOUT vers des adresses PUBLIQUES (jamais boucle locale, réseau privé, lien local, métadonnées), on se connecte à l'adresse résolue (pas de
 * seconde résolution à exploiter), le nom reste le nom TLS, les ports sont ceux du courriel chiffré (993 ; 465 ou 587), et un mot de passe ne part JAMAIS en clair.
 * Seul le crochet des bancs (bêta, `index.js`) lève ces gardes — pour 127.0.0.1.
 * ⛔ DES PLAFONDS : tentatives de connexion, lectures, envois — par compte ET par réseau (`req.ip`, jamais l'en-tête brut) ; au plus 5 boîtes par personne, 3
 * connexions IMAP simultanées par personne, 16 au total.
 */
'use strict';
const net = require('net');
const { hotePublic, adressePrivee } = require('./hote-public');
const crypto = require('crypto');
const { cleReseau } = require('./quotas');

const BOITES_MAX = 5;
const PAR_PERSONNE = 3, PAR_RESEAU = 6, EN_TOUT = 16, PIECES_EN_MEME_TEMPS = 2;
const LISTE_N = 40;                                  // les messages de la réception qu'on rend
const LISTE_OCTETS = 1536 * 1024;                    // au plus ce cumul d'octets lus pour UNE liste : un serveur qui ment sur `exists` ne remplit pas la mémoire
const SOURCE_LISTE = 6000, SOURCE_MESSAGE = 3 * 1024 * 1024, SOURCE_PIECE = 15 * 1024 * 1024;
const CORPS_MAX = 100000, APERCU_MAX = 140;
const PJ_ENVOI_NB = 3, PJ_ENVOI_OCTETS = 4 * 1024 * 1024, DEST_MAX = 5, OBJET_MAX = 300, TEXTE_MAX = 200000;
const ID_BOITE = /^bm_[0-9a-f]{32}$/;
const UID = /^[1-9][0-9]{0,9}$/;
const ID_PIECE = /^[1-9][0-9]{0,2}$/;
const RE_ADRESSE = /^[^@\s<>"(),;:\\]{1,64}@[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?\.[A-Za-z][A-Za-z0-9-]{1,23}$/;
const RE_HOTE = /^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/;
const PORTS_IMAP = [993], PORTS_SMTP = [465, 587];
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const ligne = (s, max) => Array.from(String(s === undefined || s === null ? '' : s).replace(CTRL, '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, max).join('');
/* ⛔ un lien d'un autre genre qu'un lien web (« [javascript:…] » que le texte tiré d'un HTML garde entre crochets) ne traverse ni dans le corps ni dans l'aperçu : même si la page ne lie que le web, rien ne s'y prête */
const sansLiensDangereux = (t) => String(t).replace(/\[(?:javascript|vbscript|data|file|blob):[^\]\n]*\]/gi, '[lien retiré]');
const texte = (s, max) => Array.from(String(s === undefined || s === null ? '' : s).replace(CTRL, '').replace(/\r\n?/g, '\n').replace(/\n{4,}/g, '\n\n\n')).slice(0, max).join('');

/* Les réglages des grands fournisseurs, par domaine (les serveurs publiés par chacun). `oauth` : la voie sans mot de passe, quand ce fournisseur la propose.
   Un domaine inconnu : on essaie `imap.<domaine>` / `smtp.<domaine>` (la convention la plus répandue) — sinon la personne saisit ses serveurs. */
const PRESETS = [
  { re: /^(gmail|googlemail)\.com$/, f: 'google', imap: 'imap.gmail.com', smtp: 'smtp.gmail.com', smtpPort: 465 },
  { re: /^(outlook|hotmail|live|msn)\.[a-z.]+$/, f: 'microsoft', imap: 'outlook.office365.com', smtp: 'smtp.office365.com', smtpPort: 587 },
  { re: /^(yahoo\.[a-z.]+|ymail\.com|rocketmail\.com)$/, f: 'imap', imap: 'imap.mail.yahoo.com', smtp: 'smtp.mail.yahoo.com', smtpPort: 465 },
  { re: /^(icloud\.com|me\.com|mac\.com)$/, f: 'imap', imap: 'imap.mail.me.com', smtp: 'smtp.mail.me.com', smtpPort: 587 },
  { re: /^(orange|wanadoo)\.fr$/, f: 'imap', imap: 'imap.orange.fr', smtp: 'smtp.orange.fr', smtpPort: 465 },
  { re: /^free\.fr$/, f: 'imap', imap: 'imap.free.fr', smtp: 'smtp.free.fr', smtpPort: 465 },
  { re: /^(sfr|neuf)\.fr$/, f: 'imap', imap: 'imap.sfr.fr', smtp: 'smtp.sfr.fr', smtpPort: 465 },
  { re: /^laposte\.net$/, f: 'imap', imap: 'imap.laposte.net', smtp: 'smtp.laposte.net', smtpPort: 465 },
  { re: /^bbox\.fr$/, f: 'imap', imap: 'imap.bbox.fr', smtp: 'smtp.bbox.fr', smtpPort: 465 },
  { re: /^(gmx\.[a-z.]+)$/, f: 'imap', imap: 'imap.gmx.net', smtp: 'mail.gmx.net', smtpPort: 465 },
  { re: /^aol\.com$/, f: 'imap', imap: 'imap.aol.com', smtp: 'smtp.aol.com', smtpPort: 465 },
  { re: /^(zoho\.com|zohomail\.com)$/, f: 'imap', imap: 'imap.zoho.com', smtp: 'smtp.zoho.com', smtpPort: 465 },
];

/* ⛔ `nous: true` : SEULES nos erreurs (un code et une phrase écrits ici) partent dans une réponse. Toute autre — une exception de bibliothèque, une erreur SQLite — devient `boites_mail_erreur` (500), sans son texte. */
const erreur = (statut, code, message) => Object.assign(new Error(code), { statut, code, message, nous: true });

/* ⛔ Une adresse est PUBLIQUE ou elle n'est pas une destination — le jugement est celui de `hote-public.js` (IPv4 en décimal strict, IPv6 DÉPLIÉE et jugée sur liste blanche 2000::/3). */
function adressePublique(ip) {
  const f = net.isIP(String(ip));
  return f !== 0 && !adressePrivee(String(ip), f);
}

function creerBoitesMail({ config, stockage, quotas, horloge, journaliser, oauth, crochet }) {
  const cfg = config.boitesMail || null;             // null : INERTE
  const test = crochet || null;                      // le crochet des bancs (bêta seulement) : { boucle, serveurs, delaiMs }
  const maintenant = horloge || Date.now;
  const journal = (evt, champs) => { try { if (journaliser) journaliser(evt, champs); } catch (e) { /* un journal qui échoue ne défait rien */ } };
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const compteurs = { echecs: 0, reconnexions: 0 };
  const ouvert = () => !!cfg;
  const oauthDispo = () => (oauth ? oauth.disponibles() : { google: false, microsoft: false });
  const delai = (test && test.delaiMs) || 15000;
  const enCours = new Map();                         // uid -> connexions IMAP ouvertes
  const enCoursReseau = new Map();                   // réseau (`req.ip`, /64 en IPv6) -> connexions IMAP ouvertes
  let enTout = 0, piecesEnCours = 0;
  const echeanceDe = (genre) => (test && test.echeanceMs) || (genre === 'liste' ? 45000 : genre === 'piece' ? 60000 : 30000);

  const fermee = (res) => { if (ouvert()) return false; refus(res, 503, 'boites_mail_fermees'); return true; };
  function plafond(res, cle, max, fenetreMs) {
    const r = quotas.essai(cle, max, fenetreMs);
    if (r.ok) return true;
    res.set('Retry-After', String(r.retry)); refus(res, 429, 'quota_atteint', { retry: r.retry });
    return false;
  }
  /* ⛔ NOS CODES SEULEMENT : une erreur qui n'est pas une des nôtres (`nous`) — une exception de bibliothèque, une erreur SQLite — répond `boites_mail_erreur` (500), jamais son texte. */
  const repErr = (res, e) => {
    if (res.headersSent) return;
    if (e && e.nous === true) return refus(res, e.statut || 500, e.code || 'boites_mail_erreur', e.message && e.message !== e.code ? { message: e.message } : undefined);
    compteurs.echecs++; journal('boite_mail_echec', { motif: 'erreur_interne' });
    return refus(res, 500, 'boites_mail_erreur');
  };
  const NOM_COOKIE_OA = (config.cookie && config.cookie.nom ? config.cookie.nom : 'opm') + '-oa';
  const cookieDe = (req, nom) => {
    const h = req.headers && req.headers.cookie; if (!h) return '';
    for (const part of String(h).split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === nom) return part.slice(i + 1).trim().slice(0, 200); }
    return '';
  };
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};

  /* ── La destination : un nom d'hôte public, résolu UNE fois ─────────────────────────────────────────────── */
  async function resoudre(hote) {
    if (test && test.boucle) return { ip: hote, nom: hote };
    if (!RE_HOTE.test(hote)) throw erreur(400, 'serveur_invalide', 'Ce nom de serveur n\'est pas valide.');
    try { return await hotePublic(hote, { delaiMs: (test && test.dnsMs) || 5000 }); }
    catch (e) {
      if (e && e.code === 'hote_invalide') throw erreur(400, 'serveur_invalide', 'Ce nom de serveur n\'est pas valide.');
      if (e && e.code === 'hote_non_public') throw erreur(400, 'serveur_refuse', 'Ce serveur n\'est pas une adresse publique de courrier.');
      throw erreur(502, 'serveur_introuvable', 'Ce serveur est introuvable : vérifie son nom, ou saisis les réglages du serveur de ta boîte.');
    }
  }

  /* ── Les réglages d'une adresse : saisis, sinon ceux du fournisseur, sinon la convention ─────────────────── */
  function reglagesPour(adresse, saisis) {
    const domaine = adresse.slice(adresse.lastIndexOf('@') + 1).toLowerCase();
    let f = 'imap', imap = 'imap.' + domaine, smtp = 'smtp.' + domaine, smtpPort = 465;
    for (const p of PRESETS) if (p.re.test(domaine)) { f = p.f; imap = p.imap; smtp = p.smtp; smtpPort = p.smtpPort; break; }
    let imapPort = 993;
    if (saisis && typeof saisis === 'object') {
      const h = (v) => { const s = String(v === undefined || v === null ? '' : v).trim().toLowerCase(); return s; };
      if (h(saisis.imap)) imap = h(saisis.imap);
      if (h(saisis.smtp)) smtp = h(saisis.smtp);
      if (saisis.imapPort !== undefined && saisis.imapPort !== null && saisis.imapPort !== '') imapPort = Number(saisis.imapPort);
      if (saisis.smtpPort !== undefined && saisis.smtpPort !== null && saisis.smtpPort !== '') smtpPort = Number(saisis.smtpPort);
    }
    if (test && test.serveurs) { imap = test.serveurs.imap.hote; imapPort = test.serveurs.imap.port; smtp = test.serveurs.smtp.hote; smtpPort = test.serveurs.smtp.port; }
    else {
      if (!RE_HOTE.test(imap) || !RE_HOTE.test(smtp) || imap.length > 253 || smtp.length > 253) throw erreur(400, 'serveur_invalide', 'Ce nom de serveur n\'est pas valide.');
      if (!PORTS_IMAP.includes(imapPort)) throw erreur(400, 'port_refuse', 'Le serveur de réception doit utiliser le port 993 (connexion chiffrée).');
      if (!PORTS_SMTP.includes(smtpPort)) throw erreur(400, 'port_refuse', 'Le serveur d\'envoi doit utiliser le port 465 ou 587 (connexion chiffrée).');
    }
    return { fournisseur: f, imap: { hote: imap, port: imapPort }, smtp: { hote: smtp, port: smtpPort } };
  }

  /* ── Les connexions : IMAP (relevé) et SMTP (envoi), mot de passe ou jeton d'accès ─────────────────────── */
  async function authentification(boite, type) {
    if (boite.fournisseur === 'imap') return { user: boite.adresse, pass: boite.secret };
    const jeton = await oauth.jeton({ id: boite.id, fournisseur: boite.fournisseur, secret: boite.secret }, (nouveau) => { stockage.boiteMailSecretMaj(boite.uid, boite.id, nouveau); });
    return type === 'smtp' ? { type: 'OAuth2', user: boite.adresse, accessToken: jeton } : { user: boite.adresse, accessToken: jeton };
  }
  /* ⛔ DES EMPLACEMENTS, par personne, par RÉSEAU (`req.ip`) et pour tout le service : un seul compte, ou dix comptes d'un même réseau, ne tiennent pas toutes les connexions. */
  const reserver = (uid, reseau) => {
    if (enTout >= EN_TOUT || (enCours.get(uid) || 0) >= PAR_PERSONNE || (enCoursReseau.get(reseau) || 0) >= PAR_RESEAU) throw erreur(429, 'trop_de_connexions', 'Trop de relevés en même temps — réessaie dans un instant.');
    enTout++; enCours.set(uid, (enCours.get(uid) || 0) + 1); enCoursReseau.set(reseau, (enCoursReseau.get(reseau) || 0) + 1);
    let rendu = false;
    const moins = (m, k) => { const n = (m.get(k) || 1) - 1; if (n <= 0) m.delete(k); else m.set(k, n); };
    return () => { if (rendu) return; rendu = true; enTout--; moins(enCours, uid); moins(enCoursReseau, reseau); };
  };
  /* Traduit une panne de relevé en erreur DITE — sans jamais citer le message du serveur (il peut porter l'adresse ou un identifiant). */
  function panne(e, boite) {
    if (e && e.nous === true) return e;                          // déjà une de nos erreurs (les autres sont traduites, jamais citées)
    const c = String((e && (e.code || e.name)) || '');
    if (e && (e.authenticationFailed || /EAUTH|AUTH/i.test(c))) return erreur(401, 'identifiants_refuses', boite && boite.fournisseur !== 'imap'
      ? 'Le fournisseur a refusé la connexion à cette boîte — reconnecte-la.' : 'Le serveur a refusé l\'identifiant ou le mot de passe. (Gmail, iCloud et Yahoo demandent un mot de passe d\'application, pas celui du compte.)');
    if (/ENOTFOUND|EAI_AGAIN/.test(c)) return erreur(502, 'serveur_introuvable', 'Ce serveur est introuvable : vérifie son nom, ou saisis les réglages du serveur de ta boîte.');
    if (/ECONNREFUSED|ETIMEDOUT|ECONNRESET|EHOSTUNREACH|ESOCKET|NoConnection|Timeout/i.test(c)) return erreur(502, 'serveur_injoignable', 'Le serveur de cette boîte ne répond pas — réessaie dans un instant.');
    return erreur(502, 'boite_indisponible', 'Cette boîte n\'a pas pu être lue pour l\'instant.');
  }
  async function marquerPanne(e, boite) {
    compteurs.echecs++;
    if (e && (e.statut === 409 || e.statut === 401) && boite && (e.code === 'a_reconnecter' || (e.code === 'identifiants_refuses' && boite.fournisseur !== 'imap'))) {
      if (stockage.boiteMailEtat(boite.uid, boite.id, 'a_reconnecter')) compteurs.reconnexions++;
    }
    journal('boite_mail_echec', { motif: (e && e.code) || 'inconnue' });
  }
  /* Ouvre la réception de `boite`, exécute `fn(client)`, referme TOUJOURS.
     ⛔ UNE ÉCHÉANCE GLOBALE par commande (`opts.genre` : liste 45 s, pièce 60 s, le reste 30 s), EN PLUS du délai d'inactivité de la prise : un serveur qui répond un octet de temps en temps tient
     sinon l'emplacement pour toujours. Passé l'échéance, la connexion est fermée de force, l'emplacement rendu, et la personne reçoit « le serveur ne répond pas ». */
  async function avecImap(boite, fn, opts) {
    const liberer = reserver(boite.uid, boite.reseau || '?');
    let client = null, minuterie = null;
    try {
      const ImapFlow = require('imapflow').ImapFlow;
      const cible = await resoudre(boite.imap.hote);
      const auth = await authentification(boite, 'imap');
      client = new ImapFlow({
        host: cible.ip, port: boite.imap.port, secure: !(test && test.boucle), servername: cible.nom, auth, logger: false,
        tls: { servername: cible.nom, minVersion: 'TLSv1.2' }, doSTARTTLS: false, connectionTimeout: delai, greetingTimeout: delai, socketTimeout: 30000, disableAutoIdle: true,
      });
      client.on('error', () => { /* absorbée : l'échec est traité par le try/catch — une erreur émise en événement tuerait le processus */ });
      const echeance = new Promise((ok, ko) => { minuterie = setTimeout(() => { try { client.close(); } catch (e) { /* déjà fermée */ } ko(erreur(502, 'serveur_injoignable', 'Le serveur de cette boîte ne répond pas — réessaie dans un instant.')); }, echeanceDe(opts && opts.genre)); });
      echeance.catch(() => {});
      return await Promise.race([(async () => { await client.connect(); return fn(client); })(), echeance]);
    } catch (e) {
      const p = panne(e, boite); await marquerPanne(p, boite); throw p;
    } finally {
      if (minuterie) clearTimeout(minuterie);
      try { if (client) { await Promise.race([client.logout().catch(() => { try { client.close(); } catch (e2) {} }), new Promise(r => setTimeout(r, 2000))]); try { client.close(); } catch (e3) {} } } catch (e) { /* déjà fermée */ }
      liberer();
    }
  }
  async function transport(boite) {
    const nodemailer = require('nodemailer');
    const cible = await resoudre(boite.smtp.hote);
    const auth = await authentification(boite, 'smtp');
    const local = !!(test && test.boucle);
    let nomEhlo = 'localhost';
    try { if (config.origines && config.origines[0]) nomEhlo = new URL(config.origines[0]).hostname; } catch (e) {}
    return nodemailer.createTransport({
      host: cible.ip, port: boite.smtp.port, secure: !local && boite.smtp.port === 465, requireTLS: !local && boite.smtp.port === 587, ignoreTLS: local, name: nomEhlo,
      auth, tls: { servername: cible.nom, minVersion: 'TLSv1.2' }, connectionTimeout: delai, greetingTimeout: delai, socketTimeout: 30000, disableFileAccess: true, disableUrlAccess: true,
    });
  }

  /* ── La boîte d'une personne, ou 404 ────────────────────────────────────────────────────────────────────── */
  function boiteDe(req, res) {
    const id = req.params.id;
    const b = ID_BOITE.test(String(id)) ? stockage.boiteMailLire(req.moi.id, id) : null;
    if (!b) { refus(res, 404, 'introuvable'); return null; }
    return Object.assign(b, { uid: req.moi.id, reseau: cleReseau(req.ip), imap: b.imap, smtp: b.smtp });
  }
  const vueBoite = (b) => ({ id: b.id, adresse: b.adresse, nom: b.nom, fournisseur: b.fournisseur, etat: b.etat });

  /* ── Lire : les messages d'une réception, assainis ─────────────────────────────────────────────────────── */
  const adresseDe = (x) => ({ nom: ligne((x && x.name) || '', 120), email: ligne((x && x.address) || '', 254).toLowerCase() });
  function piecesDe(n, sortie) {
    if (!n || typeof n !== 'object' || sortie.length >= 50) return sortie;
    if (Array.isArray(n.childNodes)) { for (const c of n.childNodes) piecesDe(c, sortie); return sortie; }
    const nom = (n.dispositionParameters && (n.dispositionParameters.filename || n.dispositionParameters['filename*'])) || (n.parameters && n.parameters.name) || '';
    if ((n.disposition && /^attachment$/i.test(n.disposition)) || (nom && !/^text\//i.test(n.type || '') && !/^multipart\//i.test(n.type || ''))) {
      sortie.push({ nom: ligne(nom || 'pièce jointe', 150), taille: Math.max(0, Number(n.size) || 0), type: ligne(n.type || 'application/octet-stream', 80) });
    }
    return sortie;
  }
  async function apercuDe(source) {
    if (!source) return '';
    try {
      const { simpleParser } = require('mailparser');
      const p = await simpleParser(source, { skipImageLinks: true, skipTextToHtml: true, skipTextLinks: true });
      return ligne(sansLiensDangereux(p.text || ''), APERCU_MAX);
    } catch (e) { return ''; }
  }
  async function listerMessages(boite) {
    return avecImap(boite, async (client) => {
      const verrou = await client.getMailboxLock('INBOX');
      const sortie = [];
      try {
        const total = Number((client.mailbox && client.mailbox.exists) || 0);
        if (total > 0) {
          const plage = Math.max(1, total - LISTE_N + 1) + ':*';
          let lus = 0, octets = 0;
          for await (const m of client.fetch(plage, { uid: true, envelope: true, flags: true, bodyStructure: true, source: { maxLength: SOURCE_LISTE }, headers: ['auto-submitted', 'precedence', 'list-unsubscribe'] })) {
            /* ⛔ un serveur qui ment sur `exists` (ou rend plus que demandé) ne remplit pas la mémoire : au plus LISTE_N messages et LISTE_OCTETS octets lus */
            lus++; octets += (m.source ? m.source.length : 0) + (m.headers ? m.headers.length : 0);
            if (lus > LISTE_N || octets > LISTE_OCTETS) break;
            const env = m.envelope || {};
            const flags = m.flags || new Set();
            let automatique;
            if (m.headers) {
              const h = Buffer.isBuffer(m.headers) ? m.headers.toString('utf8') : String(m.headers);
              automatique = /^auto-submitted:\s*(?!no\b)\S/im.test(h) || /^precedence:\s*(bulk|list|junk)/im.test(h) || /^list-unsubscribe:/im.test(h);
            }
            sortie.push({
              id: boite.id + '.' + m.uid, uid: m.uid,
              de: adresseDe((env.from || [])[0]), a: boite.nom || boite.adresse,
              objet: ligne(env.subject || '', OBJET_MAX), apercu: await apercuDe(m.source),
              date: env.date ? new Date(env.date).getTime() || maintenant() : maintenant(),
              lu: flags.has('\\Seen'), drapeau: flags.has('\\Flagged'),
              pj: piecesDe(m.bodyStructure, []), destinataires: ((env.to || []).concat(env.cc || [])).map(x => ligne(x && x.address, 254).toLowerCase()).filter(Boolean).slice(0, 20),
              ...(automatique === undefined ? {} : { automatique }),
            });
          }
        }
      } finally { verrou.release(); }
      return sortie.sort((x, y) => y.date - x.date);
    }, { genre: 'liste' });
  }
  async function lireUn(boite, uid, pour) {
    /* ⛔ DEUX LECTURES DE PIÈCE AU PLUS, pour tout le service : chacune tient jusqu'à 15 Mo de source plus son analyse en mémoire */
    if (pour === 'piece') { if (piecesEnCours >= PIECES_EN_MEME_TEMPS) throw erreur(429, 'trop_de_connexions', 'Trop de relevés en même temps — réessaie dans un instant.'); piecesEnCours++; }
    try {
    return await avecImap(boite, async (client) => {
      const verrou = await client.getMailboxLock('INBOX');
      try {
        const max = pour === 'piece' ? SOURCE_PIECE : SOURCE_MESSAGE;
        const m = await client.fetchOne(uid, { uid: true, size: true, flags: true, source: { maxLength: max } }, { uid: true });
        if (!m || !m.source) throw erreur(404, 'introuvable', 'Ce message n\'existe plus.');
        if (pour === 'piece' && Number(m.size) > max) throw erreur(413, 'trop_gros', 'Ce message est trop gros pour être ouvert ici.');
        const { simpleParser } = require('mailparser');
        let p;
        try { p = await simpleParser(m.source, { skipImageLinks: true, skipTextToHtml: true, skipTextLinks: true, maxHtmlLengthToParse: 2000000 }); }
        catch (e) { throw erreur(502, 'message_illisible', 'Ce message n\'a pas pu être lu.'); }
        return { parse: p, lu: (m.flags || new Set()).has('\\Seen'), tronque: Number(m.size) > max };
      } finally { verrou.release(); }
    }, { genre: pour === 'piece' ? 'piece' : 'texte' });
    } finally { if (pour === 'piece') piecesEnCours--; }
  }

  /* ── Les gestionnaires ─────────────────────────────────────────────────────────────────────────────────── */
  const H = {};

  H['boites.lister'] = (req, res) => {
    if (fermee(res)) return;
    if (!plafond(res, 'bm_lis:' + req.moi.id, 120, 60000)) return;
    res.json({ ouvert: true, oauth: oauthDispo(), boites: stockage.boitesMailDe(req.moi.id).map(vueBoite) });
  };

  H['boites.ajouter'] = async (req, res) => {
    if (fermee(res)) return;
    if (!plafond(res, 'bm_co:' + req.moi.id, 10, 3600000) || !plafond(res, 'bm_co_ip:' + cleReseau(req.ip), 30, 3600000)) return;
    const b = corps(req);
    const adresse = ligne(b.adresse, 254).toLowerCase();
    const mdp = typeof b.mdp === 'string' ? b.mdp : '';
    if (!RE_ADRESSE.test(adresse)) return refus(res, 400, 'boite_adresse_invalide', { message: 'Cette adresse e-mail n\'est pas valide.' });
    if (!mdp || mdp.length > 500 || /[\u0000\r\n]/.test(mdp)) return refus(res, 400, 'mot_de_passe_requis', { message: 'Entre le mot de passe (d\'application) de cette boîte.' });
    if (stockage.boitesMailDe(req.moi.id).length >= BOITES_MAX && !stockage.boitesMailDe(req.moi.id).some(x => x.adresse === adresse)) return refus(res, 409, 'trop_de_boites', { message: 'Tu as déjà ' + BOITES_MAX + ' boîtes reliées : retire-en une avant d\'en ajouter.' });
    let r;
    try { r = reglagesPour(adresse, b.serveurs); } catch (e) { return repErr(res, e); }
    if (r.fournisseur === 'microsoft') {
      /* Microsoft refuse les mots de passe dans toutes les applications : on le DIT avant de faire attendre (la voie est l'autorisation). */
      return refus(res, 400, 'microsoft_sans_mot_de_passe', { message: 'Microsoft refuse les mots de passe dans les applications : utilise « Continuer avec Microsoft ».' });
    }
    const boite = { id: 'bm_essai', uid: req.moi.id, reseau: cleReseau(req.ip), fournisseur: 'imap', adresse, secret: mdp, nom: '', imap: r.imap, smtp: r.smtp };
    try { await avecImap(boite, async () => true); }
    catch (e) { return repErr(res, e); }
    const nom = ligne(b.nom, 80) || adresse.slice(0, adresse.indexOf('@'));
    let c;
    try { c = stockage.boiteMailCreer(req.moi.id, 'imap', { adresse, nom, imap: r.imap, smtp: r.smtp, secret: mdp }); }
    catch (e) { if (e && e.code === 'trop_de_boites') return refus(res, 409, 'trop_de_boites', { message: 'Tu as déjà ' + BOITES_MAX + ' boîtes reliées : retire-en une avant d\'en ajouter.' }); return repErr(res, e); }
    if (!c) return refus(res, 401, 'session_requise');
    res.status(201).json({ boite: { id: c.id, adresse, nom, fournisseur: 'imap', etat: 'ok' } });
  };

  H['boites.supprimer'] = (req, res) => {
    if (fermee(res)) return;
    const b = boiteDe(req, res); if (!b) return;
    stockage.boiteMailSupprimer(req.moi.id, b.id);
    if (oauth) oauth.oublier(b.id);
    res.json({ ok: true });
  };

  H['boites.messages'] = async (req, res) => {
    if (fermee(res)) return;
    const b = boiteDe(req, res); if (!b) return;
    if (!plafond(res, 'bm_lec:' + req.moi.id, 240, 60000) || !plafond(res, 'bm_lec_ip:' + cleReseau(req.ip), 600, 60000)) return;
    try { res.json({ messages: await listerMessages(b) }); }
    catch (e) { repErr(res, e); }
  };

  H['boites.message'] = async (req, res) => {
    if (fermee(res)) return;
    const b = boiteDe(req, res); if (!b) return;
    if (!UID.test(String(req.params.uid))) return refus(res, 404, 'introuvable');
    if (!plafond(res, 'bm_lec:' + req.moi.id, 240, 60000) || !plafond(res, 'bm_lec_ip:' + cleReseau(req.ip), 600, 60000)) return;
    try {
      const r = await lireUn(b, Number(req.params.uid), 'texte');
      const p = r.parse;
      let t = sansLiensDangereux(texte(p.text || '', CORPS_MAX));
      if (r.tronque) t += '\n\n[Message très long : la suite n\'est pas affichée ici.]';
      const pj = (p.attachments || []).slice(0, 50).map((a, i) => ({ id: String(i + 1), nom: ligne(a.filename || 'pièce jointe', 150), taille: Math.max(0, Number(a.size) || 0), type: ligne(a.contentType || 'application/octet-stream', 80) }));
      res.json({ corps: t, pj });
    } catch (e) { repErr(res, e); }
  };

  H['boites.piece'] = async (req, res) => {
    if (fermee(res)) return;
    const b = boiteDe(req, res); if (!b) return;
    if (!UID.test(String(req.params.uid)) || !ID_PIECE.test(String(req.params.p))) return refus(res, 404, 'introuvable');
    if (!plafond(res, 'bm_lec:' + req.moi.id, 240, 60000) || !plafond(res, 'bm_pj:' + req.moi.id, 60, 3600000)) return;
    try {
      const r = await lireUn(b, Number(req.params.uid), 'piece');
      const a = (r.parse.attachments || [])[Number(req.params.p) - 1];
      if (!a || !a.content) return refus(res, 404, 'introuvable');
      const nom = ligne(String(a.filename || 'piece').replace(/[\\/]/g, '_'), 120) || 'piece';
      /* jamais servie pour être EXÉCUTÉE : octets opaques, téléchargement forcé, rien d'interprété, sous `sandbox` */
      res.set({ 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="piece"; filename*=UTF-8\'\'' + encodeURIComponent(nom).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()),
        'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox; default-src \'none\'', 'Cache-Control': 'no-store', 'Content-Length': String(a.content.length) });
      res.end(a.content);
    } catch (e) { if (!res.headersSent) repErr(res, e); }
  };

  H['boites.marquer'] = async (req, res) => {
    if (fermee(res)) return;
    const b = boiteDe(req, res); if (!b) return;
    if (!UID.test(String(req.params.uid))) return refus(res, 404, 'introuvable');
    if (!plafond(res, 'bm_lec:' + req.moi.id, 240, 60000)) return;
    const d = corps(req);
    if (d.lu !== undefined && typeof d.lu !== 'boolean') return refus(res, 400, 'champ_invalide');
    if (d.drapeau !== undefined && typeof d.drapeau !== 'boolean') return refus(res, 400, 'champ_invalide');
    if (d.lu === undefined && d.drapeau === undefined) return refus(res, 400, 'champ_invalide');
    try {
      await avecImap(b, async (client) => {
        const verrou = await client.getMailboxLock('INBOX');
        try {
          const u = Number(req.params.uid);
          if (d.lu === true) await client.messageFlagsAdd(u, ['\\Seen'], { uid: true }); else if (d.lu === false) await client.messageFlagsRemove(u, ['\\Seen'], { uid: true });
          if (d.drapeau === true) await client.messageFlagsAdd(u, ['\\Flagged'], { uid: true }); else if (d.drapeau === false) await client.messageFlagsRemove(u, ['\\Flagged'], { uid: true });
        } finally { verrou.release(); }
      });
      res.json({ ok: true });
    } catch (e) { repErr(res, e); }
  };

  /* L'envoi : un corps JSON JUSQU'À 7 Mo (des pièces en base64), lu APRÈS la garde de session — un anonyme n'a jamais fait lire un octet. */
  const lecteurEnvoi = require('express').json({ limit: '7mb', strict: true });
  H['boites.envoyer'] = (req, res, next) => { if (fermee(res)) return; lecteurEnvoi(req, res, (err) => { if (err) return next(err); suiteEnvoi(req, res).catch((e) => repErr(res, e)); }); };
  async function suiteEnvoi(req, res) {
    if (fermee(res)) return;
    const b = boiteDe(req, res); if (!b) return;
    if (!plafond(res, 'bm_env:' + req.moi.id, 30, 3600000) || !plafond(res, 'bm_env_j:' + req.moi.id, 100, 86400000) || !plafond(res, 'bm_env_ip:' + cleReseau(req.ip), 60, 3600000)) return;
    const d = corps(req);
    const dest = String(typeof d.a === 'string' ? d.a : '').split(/[,;]/).map(x => { const m = /<([^<>]+)>\s*$/.exec(x.trim()); return (m ? m[1] : x).trim(); }).filter(Boolean);
    if (!dest.length || dest.length > DEST_MAX) return refus(res, 400, 'boite_destinataire_invalide', { message: dest.length ? 'Au plus ' + DEST_MAX + ' destinataires.' : 'Indique un destinataire.' });
    if (!dest.every(x => RE_ADRESSE.test(x) && x.length <= 254)) return refus(res, 400, 'boite_destinataire_invalide', { message: 'Une adresse de destinataire n\'est pas valide.' });
    const objet = ligne(d.objet, OBJET_MAX) || '(sans objet)';
    const txt = texte(d.texte, TEXTE_MAX);
    const pieces = [];
    if (d.pieces !== undefined) {
      if (!Array.isArray(d.pieces) || d.pieces.length > PJ_ENVOI_NB) return refus(res, 400, 'pieces_invalides', { message: 'Au plus ' + PJ_ENVOI_NB + ' pièces jointes.' });
      let total = 0;
      for (const p of d.pieces) {
        if (!p || typeof p !== 'object' || typeof p.b64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(p.b64)) return refus(res, 400, 'pieces_invalides', { message: 'Une pièce jointe est illisible.' });
        const buf = Buffer.from(p.b64, 'base64'); total += buf.length;
        if (total > PJ_ENVOI_OCTETS) return refus(res, 413, 'trop_gros', { message: 'Les pièces jointes dépassent ' + Math.round(PJ_ENVOI_OCTETS / 1048576) + ' Mo.' });
        pieces.push({ filename: ligne(String(p.nom || 'piece').replace(/[\\/]/g, '_'), 120) || 'piece', content: buf, contentType: 'application/octet-stream' });
      }
    }
    let reponseA = null;
    if (d.enReponseA !== undefined && d.enReponseA !== null && d.enReponseA !== '') {
      const u = String(d.enReponseA);
      if (!UID.test(u)) return refus(res, 400, 'champ_invalide');
      try {
        reponseA = await avecImap(b, async (client) => {
          const verrou = await client.getMailboxLock('INBOX');
          try { const m = await client.fetchOne(Number(u), { uid: true, envelope: true }, { uid: true }); const id = m && m.envelope && m.envelope.messageId; return /^<[^<>\s]{1,200}>$/.test(String(id || '')) ? String(id) : null; }
          finally { verrou.release(); }
        });
      } catch (e) { reponseA = null; }          // la réponse part quand même, sans le fil
    }
    let t = null;
    try {
      t = await transport(b);
      const nomAffiche = ligne(b.nom, 80).replace(/["<>]/g, '');
      await t.sendMail({
        from: { name: nomAffiche, address: b.adresse }, to: dest, subject: objet, text: txt, attachments: pieces,
        ...(reponseA ? { inReplyTo: reponseA, references: [reponseA] } : {}),
      });
      res.json({ ok: true });
    } catch (e) {
      const p = panne(e, b);
      await marquerPanne(p, b);
      /* un refus d'authentification à l'ENVOI se dit « envoi », pas « lecture » */
      refus(res, p.statut || 502, p.code === 'boite_indisponible' ? 'envoi_refuse' : p.code, { message: p.code === 'boite_indisponible' ? 'Le message n\'a pas pu partir : le serveur d\'envoi de cette boîte l\'a refusé.' : p.message });
    } finally { try { if (t) t.close(); } catch (e) {} }
  }

  /* ── Google / Microsoft ───────────────────────────────────────────────────────────────────────────────── */
  H['boites.oauth.demarrer'] = (req, res) => {
    if (fermee(res)) return;
    if (!plafond(res, 'bm_oa:' + req.moi.id, 20, 3600000) || !plafond(res, 'bm_oa_ip:' + cleReseau(req.ip), 60, 3600000)) return;
    const d = corps(req);
    if (!['google', 'microsoft'].includes(d.fournisseur)) return refus(res, 400, 'fournisseur_inconnu', { message: 'Fournisseur inconnu (google ou microsoft).' });
    if (stockage.boitesMailDe(req.moi.id).length >= BOITES_MAX) {
      const adr = typeof d.email === 'string' ? d.email.trim().toLowerCase() : '';
      if (!stockage.boitesMailDe(req.moi.id).some(x => x.adresse === adr)) return refus(res, 409, 'trop_de_boites', { message: 'Tu as déjà ' + BOITES_MAX + ' boîtes reliées : retire-en une avant d\'en ajouter.' });
    }
    try {
      const r = oauth.demarrer({ fournisseur: d.fournisseur, uid: req.moi.id, email: typeof d.email === 'string' ? d.email.trim() : '' });
      /* ⛔ le cookie du NAVIGATEUR (A1) : HttpOnly (la page ne le lit pas), SameSite=Lax (il revient sur la navigation qui vient de Google — pas sur une requête d'un autre site), limité au chemin du retour, dix minutes */
      /* ⛔ `Path=/` (vérification de `gardien`) : en production le cookie de session s'appelle `__Host-opm`, donc celui-ci `__Host-opm-oa` — et le préfixe
         `__Host-` IMPOSE `Secure`, aucun `Domain` et `Path=/`. Posé sur `/api/boites-mail/oauth`, le navigateur le rejetait : le retour arrivait sans
         cookie et aucune connexion Google/Microsoft n'aboutissait. Le préfixe empêche aussi un sous-domaine frère (msg / msg-beta) de poser le sien. */
      res.cookie(NOM_COOKIE_OA, r.navigateur, { httpOnly: true, sameSite: 'lax', secure: !!(config.cookie && config.cookie.secure), path: '/', maxAge: 10 * 60 * 1000 });
      res.json({ url: r.url });
    }
    catch (e) { repErr(res, e); }
  };
  const MESSAGES_RETOUR = {
    ok: 'Ta boîte mail est reliée.', refuse: 'La connexion a été annulée.', state_invalide: 'Ce lien de connexion n\'est pas valide.', state_rejoue: 'Ce lien de connexion a déjà servi ou a expiré.',
    state_expire: 'Ce lien de connexion a expiré.', navigateur_inconnu: 'Cette connexion doit se terminer dans le navigateur où tu l\'as commencée.', sans_renouvellement: 'L\'accès durable n\'a pas été accordé.', echange_refuse: 'Le fournisseur a refusé la connexion.', adresse_inconnue: 'Le fournisseur n\'a pas donné l\'adresse de la boîte.',
    fournisseur_injoignable: 'Le fournisseur ne répond pas.', oauth_non_configure: 'Cette connexion n\'est pas disponible.', trop_de_boites: 'Tu as déjà ' + BOITES_MAX + ' boîtes reliées.', compte_inactif: 'Ton compte n\'est plus actif.', erreur: 'La connexion n\'a pas pu aboutir.',
  };
  /* ⛔ LA PAGE DE RETOUR NE PORTE AUCUN SCRIPT (la politique de la page les refuse) et ne répète RIEN de ce qui arrive dans l'adresse : un code FIXE, jamais le texte du fournisseur. Elle
     RENVOIE vers « / » par un rafraîchissement : la navigation vient alors d'une page de NOTRE site, donc le cookie de session (`SameSite=Strict`) repart — sur le retour direct de Google, non. */
  function pageRetour(res, code) {
    const ok = code === 'ok';
    const cible = (ok ? '/?boites=ok' : '/?boites=erreur&c=' + encodeURIComponent(code)) + '#courrier';
    const msg = MESSAGES_RETOUR[code] || MESSAGES_RETOUR.erreur;
    res.clearCookie(NOM_COOKIE_OA, { path: '/', httpOnly: true, sameSite: 'lax', secure: !!(config.cookie && config.cookie.secure) });   // le cookie du navigateur a servi (ou ne servira plus) : il part
    res.set({ 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=utf-8' });
    res.status(200).send('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
      + '<meta http-equiv="refresh" content="0;url=' + cible + '"><title>OP MESSAGES</title></head><body style="font-family:system-ui,-apple-system,sans-serif;padding:24px;line-height:1.5">'
      + '<p>' + msg + '</p><p><a href="' + cible + '">Retourner dans OP MESSAGES</a></p></body></html>');
  }
  H['boites.oauth.retour'] = async (req, res) => {
    if (!ouvert()) return pageRetour(res, 'oauth_non_configure');
    const q = req.query || {};
    if (typeof q.error === 'string') {
      /* le fournisseur refuse (« access_denied ») : on consomme quand même le `state` — il ne resservira pas */
      try { await oauth.retour({ code: '', state: typeof q.state === 'string' ? q.state : '', navigateur: cookieDe(req, NOM_COOKIE_OA) }); } catch (e) { /* attendu : « code_absent » */ }
      return pageRetour(res, 'refuse');
    }
    try {
      const r = await oauth.retour({ code: typeof q.code === 'string' ? q.code : '', state: typeof q.state === 'string' ? q.state : '', navigateur: cookieDe(req, NOM_COOKIE_OA) });
      const s0 = oauth.serveurs(r.fournisseur);
      const s = test && test.serveurs ? { imapHost: test.serveurs.imap.hote, imapPort: test.serveurs.imap.port, smtpHost: test.serveurs.smtp.hote, smtpPort: test.serveurs.smtp.port } : s0;   // le crochet des bancs : de faux serveurs, jamais ceux du fournisseur
      let c;
      try {
        c = stockage.boiteMailCreer(r.uid, r.fournisseur, { adresse: r.email, nom: r.email.slice(0, r.email.indexOf('@')), imap: { hote: s.imapHost, port: s.imapPort }, smtp: { hote: s.smtpHost, port: s.smtpPort }, secret: r.refresh });
      } catch (e) { if (e && e.code === 'trop_de_boites') return pageRetour(res, 'trop_de_boites'); throw e; }
      if (!c) return pageRetour(res, 'compte_inactif');
      oauth.amorcer(c.id, r.acces, r.exp);
      return pageRetour(res, 'ok');
    } catch (e) {
      const code = e && e.code && MESSAGES_RETOUR[e.code] ? e.code : 'erreur';
      if (code === 'erreur') journal('boite_mail_echec', { motif: 'retour_oauth' });
      return pageRetour(res, code);
    }
  };

  /* ⛔ AUCUN GESTIONNAIRE NE REJETTE SANS RÉPONSE : un rejet non rattrapé ARRÊTE le processus (`index.js`) — chaque gestionnaire, synchrone ou asynchrone, est enveloppé ; ce qui lui échappe répond `boites_mail_erreur`. */
  for (const k of Object.keys(H)) {
    const f = H[k];
    H[k] = (req, res, next) => { let r; try { r = f(req, res, next); } catch (e) { repErr(res, e); return; } if (r && typeof r.catch === 'function') r.catch((e) => repErr(res, e)); };
  }

  function sante() {
    const o = oauthDispo();
    return { ouvert: ouvert(), google: !!o.google, microsoft: !!o.microsoft, echecs: compteurs.echecs, reconnexions: compteurs.reconnexions };
  }
  return { handlers: H, ouvert, oauthDispo, sante, _reglagesPour: reglagesPour, _resoudre: resoudre };
}

module.exports = { creerBoitesMail, adressePublique, PRESETS, BOITES_MAX };
