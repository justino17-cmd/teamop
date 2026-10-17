/* ══ L'ADMINISTRATION D'OP MESSAGES — DES LECTURES POUR LA CONSOLE INTERNE, DERRIÈRE DEUX PREUVES ═════════════════════════════
 *
 * La « Tour » (la console interne de TEAM OP) a une console OP MESSAGES. Elle ne parle pas à ce service : elle parle à api.teamop.fr
 * (le serveur d'OP GESTION), qui RELAIE en boucle locale vers les routes ci-dessous (même machine ; ports 8090 en production, 8091 sur la bêta).
 * Décision de Justin, 17 octobre 2026 : « la console OP MESSAGES CONTRÔLE vraiment OP MESSAGES ». Ce fichier est le côté OP MESSAGES du pont ; le relais
 * d'api.teamop.fr s'écrit d'après CE CONTRAT. v1 : des LECTURES seulement (aucune écriture : couper un compte, fermer un espace viendront après, une route à la fois).
 *
 * ⛔ LA GARDE `AD` — DEUX PREUVES, PAS UNE. nginx (ou Caddy) relaie TOUT le public DEPUIS 127.0.0.1 : « la connexion vient de la boucle locale » ne prouve donc RIEN,
 * ni à elle seule ni avec une adresse lue dans un en-tête. Une requête n'est admise que si, ENSEMBLE :
 *   1. l'adresse de la SOCKET est la boucle locale (jamais `req.ip`, jamais un en-tête) ;
 *   2. elle ne porte AUCUN en-tête de proxy — `X-Forwarded-For`, `X-Real-IP`, `Forwarded`, `X-Forwarded-Proto`, `X-Forwarded-Host` : le proxy les pose sur tout ce qu'il relaie
 *      (`install-msg.sh` écrase `X-Forwarded-For` par l'adresse vue), le relais d'api.teamop.fr, lui, parle en direct à 127.0.0.1 et n'en pose pas — il NE DOIT PAS recopier ceux de
 *      la requête de la Tour ;
 *   3. elle porte `X-OPM-Admin: <64 hexadécimaux>` égal au secret de `admin.secret` (configuration de l'instance), comparé EN TEMPS CONSTANT (empreintes SHA-256 des deux côtés).
 * Sans `admin.secret` dans la configuration, les routes sont INERTES : 404, jamais ouvertes. ⛔ TOUT REFUS EST LE MÊME 404 `{"error":"introuvable"}`, octet pour octet celui d'une
 * route qui n'existe pas (inerte, hors boucle, proxy, secret absent, secret faux) : un scanner ne sait pas même que ces routes existent. Le POURQUOI se lit côté service :
 * le journal reçoit `admin_refus` avec un `motif` (`inerte`, `hors_boucle`, `proxy`, `absent`, `faux`) — jamais une adresse, jamais l'en-tête — au plus une ligne par minute et par
 * motif, et `GET /api/admin/sante` donne les compteurs.
 * Le secret se pose par `configurer-admin.js` (saisie masquée) ; ⛔ la MÊME valeur doit être posée côté api.teamop.fr (le relais l'envoie dans `X-OPM-Admin`). Elle ne s'affiche
 * nulle part : `configurer-admin.js --verifier` compare une valeur collée à celle qui est posée, sans rien afficher.
 *
 * ⛔ CE QUI NE SORT JAMAIS PAR CES ROUTES : un numéro de téléphone (l'identité d'un compte « telephone » n'est même pas OUVERTE), un mot de passe, un sel, un jeton, une
 * empreinte de session, une adresse IP, le texte d'un message ou d'une notification, un nom de groupe, un contact, un identifiant Stripe, une clé. Une adresse e-mail sort pour un
 * compte « courriel » (la console est interne et gardée) — et `adresses=non` la retire, l'empreinte restant. Les prénoms et noms ne sortent pas : `ident` (« Prénom#1234 »)
 * est l'identifiant PUBLIC que les gens se donnent entre eux, et il contient le premier mot du prénom — c'est la seule façon de retrouver un compte par téléphone sans son numéro.
 *
 * ══ LE CONTRAT ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * Toutes les routes : GET, en-tête `X-OPM-Admin`, ni cookie ni `Origin` ni `X-OPM` (rien d'une page). Réponses JSON, `Cache-Control: no-store`.
 * Dates = millisecondes depuis 1970 (UTC), `null` quand inconnu. Les refus de la garde sont tous `404 {"error":"introuvable"}`. Autres refus :
 *   400 {"error":"parametre_invalide","champ":"limite"|"apres"|"origine"|"etat"|"id"|"adresses"|"statut"}   un paramètre de requête mal formé (jamais ignoré en silence)
 *   429 {"error":"quota_atteint","retry":s}                                                                 le plafond général par adresse (600 par minute, partagé avec le reste du service)
 *   503 {"error":"admin_indisponible"}                                                                       une base d'un schéma plus ancien que la migration 12 (un banc de migration)
 *   500 {"error":"erreur_interne"}
 * LISTES (comptes, espaces, abonnements, empreintes) : `?limite=N` (1 à 200 ; 1 à 1000 pour les empreintes ; 50 par défaut) et `?apres=<curseur>`. Réponse :
 *   { "total": N, "items": [...], "suivant": "<curseur>" | null }
 * `total` = le nombre de lignes qui répondent aux filtres, toutes pages ; `suivant` = `null` à la dernière page, sinon le curseur À RENDRE TEL QUEL dans `apres` (une chaîne opaque :
 * `<création en ms>.<identifiant>`). La pagination est par clé, pas par décalage : un compte créé entre deux pages ne décale pas la suivante.
 *
 * GET /api/admin/sante
 *   { instance: "beta"|"prod", version, sha, build|null, version_page, min_client|null, client_tour: {minTour, derniereOk, echecs, ignore}|null,
 *     demarre_le, maintenant,
 *     processus: { node, rss_mo, tas_mo },
 *     base: { fichier_mo|null, wal_mo|null, schema, illisibles, stats: {personnes, conversations, messages, sessions, journal, illisibles} },
 *     disque: { libre_mo|null, bas, plancher_mo },
 *     reglages: { tout_ouvert, inscription_courriel, courriel_ouvert, facturation_ouverte, facturation_mode, sauvegarde_configuree, admin_configuree },
 *     decompte: { comptes: { <origine>: {actifs, supprimes, suppression_programmee} }, espaces, abonnements: { <statut>: {n, places} } } | null,
 *     sante: { …exactement ce que rend GET /health… },
 *     admin: { acces, dernier_acces|null, refus: { <motif>: n }, dernier_refus|null, journal: { depuis, capacite, en_memoire } } }
 *   `origine` y vaut les valeurs de la base (`beta`, `compte`, `telephone`).
 *
 * GET /api/admin/comptes[?limite&apres&origine=beta|courriel|telephone&etat=actif|supprime|tous&id=p_…&adresses=oui|non]    (etat : `actif` par défaut ; adresses : `oui` par défaut)
 *   { total, tout_ouvert, items: [ {
 *       id: "p_<32 hexadécimaux>",
 *       origine: "beta"|"courriel"|"telephone",              // le mode d'inscription
 *       etat: "actif"|"suppression_programmee"|"supprime",
 *       suppression_le: ms|null, verifie: bool, cree: ms,
 *       derniere_activite: ms|null,                          // la dernière session ou le dernier appareil vu, à l'heure près ; null : aucune session ouverte
 *       ident: "Prénom#1234"|null,                           // l'identifiant public ; null pour un compte supprimé
 *       acces_beta: "b…"|null,                               // l'identifiant de l'accès chez OP GESTION (origine beta seulement)
 *       email: "x@y"|null,                                   // origine courriel seulement, et jamais avec adresses=non
 *       email_sha256: "<64 hexadécimaux>"|null,              // origine courriel seulement ; le SHA-256 de l'adresse en minuscules
 *       formule: { formule: "perso"|"pro"|"impaye", motif, sursis_jusqua|null }|null,   // la formule RÉELLE (le drapeau de la bêta ignoré ; `tout_ouvert` le dit) ; null : compte supprimé
 *       espaces: N                                           // le nombre d'espaces dont il est membre
 *     } ], suivant }
 *
 * GET /api/admin/espaces[?limite&apres]
 *   { total, items: [ { id: "e_<32 hex>", nom|null, proprio: "p_…", cree, membres, canaux,
 *       formule: { formule, motif, sursis_jusqua|null },
 *       places_depassees: bool,                              // plus de membres que de places payées
 *       abonnement: null | { statut, places, fin_periode|null, annule, impaye_depuis|null, relu_le|null } } ], suivant }
 *   `nom` est le nom de l'entreprise (null : le chiffré ne s'ouvre pas — `base.illisibles` monte).
 *
 * GET /api/admin/abonnements[?limite&apres&statut=<statut Stripe, ex. active>]
 *   { total, facturation: { ouvert, mode, tout_ouvert, stripe_echec_min, derniere_lecture|null },
 *     resume: { par_statut: { <statut>: {n, places} } },
 *     items: [ { espace: "e_…", nom|null, statut, formule: {formule, motif, sursis_jusqua|null}, places, membres, places_depassees, fin_periode|null   // l'échéance de la période payée
 *                annule,                                      // l'abonnement s'arrête à la fin de la période
 *                impaye_depuis|null, relu_le|null, cree, stripe: bool, paiement_en_attente: bool } ], suivant }
 *   Aucun identifiant de client, d'abonnement ou de session Stripe ne sort : `stripe` dit seulement qu'un abonnement existe chez Stripe.
 *
 * GET /api/admin/incidents[?limite=1..200]                                          (50 par défaut)
 *   { depuis, capacite, en_memoire,
 *     compteurs: { <evt>: { n, incidents, dernier|null, dernier_incident|null } },      // TOUS les événements journalisés depuis `depuis` (le démarrage du processus)
 *     incidents: [ { t, evt, <champs de la liste blanche du journal : quota, nom, code, instance, port, sha, etat, n, motif, route, pays, gabarit> } ] }   // du plus récent au plus ancien
 *   ⛔ Ce n'est que ce que le service journalise DÉJÀ, avec sa liste blanche (index.js) — aucune adresse IP, aucun nom, aucun texte de message, aucun jeton — puis une SECONDE
 *   liste blanche ici, et un masque sur toute valeur qui ressemble à une adresse, un numéro, un jeton ou une adresse IP (« (masqué) »). La mémoire est celle du processus : un
 *   redémarrage la vide (`depuis` le dit) ; `journalctl -u teamop-msg@<instance>` garde le reste. Les événements qu'un inconnu peut déclencher en rafale (`quota_refuse`,
 *   `corps_lent`, `piece_depot_lent`, `admin_refus`) sont COMPTÉS, jamais rangés un par un : ils ne chassent pas les vraies pannes de la mémoire.
 *
 * GET /api/admin/empreintes[?limite=1..1000&apres]
 *   { algorithme: "sha256", normalisation: "adresse en minuscules, sans espace de bord", total,
 *     items: [ { id: "p_…", sha256: "<64 hexadécimaux en minuscules>" } ], suivant }
 *   Les comptes « courriel » ACTIFS seulement. De quoi ranger un courriel dans la console sans recevoir les adresses : la Tour calcule SHA-256(adresse en minuscules) et cherche.
 *   L'adresse est celle que la personne a tapée, en minuscules (« Ana@Exemple.fr » → « ana@exemple.fr ») ; ni les points d'une boîte Gmail ni un « +étiquette » ne sont retirés.
 *
 * ⛔ UNE LECTURE N'ÉCRIT RIEN : aucune de ces routes ne touche la base autrement que par `stockage.adminLecture` (des lectures) ; les compteurs de la garde vivent en mémoire.
 * ⛔ LE SECRET N'EST JAMAIS GARDÉ EN CLAIR PAR LE SERVICE : la configuration validée n'en porte que l'empreinte SHA-256 (`config.admin.empreinte`).
 */
'use strict';
const crypto = require('crypto'), fs = require('fs'), path = require('path');

const ENTETE = 'x-opm-admin';
const RE_SECRET = /^[0-9a-fA-F]{64}$/;
/* ce que le proxy pose sur tout ce qu'il relaie — et que le relais d'api.teamop.fr, parlant en direct à la boucle locale, ne pose pas */
const ENTETES_PROXY = ['x-forwarded-for', 'x-real-ip', 'forwarded', 'x-forwarded-proto', 'x-forwarded-host'];
const BOUCLE = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const MOTIFS = ['inerte', 'hors_boucle', 'proxy', 'absent', 'faux'];
const sha256 = (x) => crypto.createHash('sha256').update(x).digest();
const sha256Hex = (x) => crypto.createHash('sha256').update(x).digest('hex');

/* ══ LA CONFIGURATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   `admin: { secret: <64 hexadécimaux, entre guillemets> }`. Absent : l'administration est INERTE. Présent mais faux (pas un objet, une clé inconnue, un secret qui n'est pas 64 hexadécimaux, trop régulier,
   ou égal à la clé maître) : le démarrage est REFUSÉ — un secret à moitié posé ne doit pas laisser croire que la porte est gardée. ⛔ Jamais la valeur dans un message d'erreur. */
function adminConfig(cfg, kek) {
  const err = (m) => { const e = new Error('config: ' + m); e.code = 'CONFIG'; return e; };
  const brut = cfg && cfg.admin;
  if (brut === undefined || brut === null) return null;
  if (typeof brut !== 'object' || Array.isArray(brut)) throw err('admin doit être un objet { secret }');
  for (const k of Object.keys(brut)) if (k !== 'secret') throw err('admin.' + k + ' est inconnu (« secret » est la seule clé)');
  if (typeof brut.secret !== 'string' || !RE_SECRET.test(brut.secret)) throw err('admin.secret doit être 64 caractères hexadécimaux');
  const secret = brut.secret.toLowerCase();
  /* un secret copié d'un exemple (« abab… », « 0000… ») : 64 hexadécimaux tirés au hasard portent toujours bien plus de huit signes différents */
  if (new Set(secret).size < 8) throw err('admin.secret est trop régulier (il doit être tiré au hasard)');
  if (Buffer.isBuffer(kek) && kek.toString('hex') === secret) throw err('admin.secret ne peut pas être la clé maître');
  return { empreinte: sha256(secret) };
}

/* ══ LE JOURNAL EN MÉMOIRE — ce que le service journalise déjà, rangé pour la console ═══════════════════════════════════════════════════
   `index.js` appelle `noterJournal` avec la ligne qu'il écrit (déjà réduite à sa liste blanche). Ici : une SECONDE liste blanche (index.js peut en ajouter un champ, il ne passe pas
   sans que ce fichier le sache), un masque sur toute valeur qui ressemble à une donnée personnelle, un tampon borné. Ce module ne fait jamais échouer le journal. */
const CHAMPS = ['quota', 'nom', 'code', 'instance', 'port', 'sha', 'etat', 'n', 'motif', 'route', 'pays', 'gabarit'];
const RE_SHA = /^[0-9a-zA-Z._-]{1,64}$/;
const MASQUES = [/@/, /\d{6,}/, /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, /[0-9a-f]{0,4}(:[0-9a-f]{0,4}){3,}/i, /\b(opm|opd|opa)_/i, /\b[a-z]{1,2}_[0-9a-f]{16,}/i, /[0-9a-f]{20,}/i, /https?:/i, /\+\d/];
/* une valeur de journal montrable : jamais ce qui ressemble à une adresse, un numéro, un jeton, une adresse IP ou un identifiant */
function chaineSure(v) {
  const s = String(v).replace(/[\r\n]/g, ' ').slice(0, 60);
  for (const m of MASQUES) if (m.test(s)) return '(masqué)';
  return s;
}
function champsSurs(o) {
  const r = {};
  for (const k of CHAMPS) {
    if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
    const v = o[k];
    if (typeof v === 'number') { if (Number.isFinite(v) && Math.abs(v) < 1e9) r[k] = v; }
    else if (typeof v === 'boolean') r[k] = v;
    else if (typeof v === 'string') r[k] = k === 'sha' ? (RE_SHA.test(v) ? v : '(masqué)') : chaineSure(v);
  }
  return r;
}
/* ce qui est un INCIDENT : un échec, un refus, un abandon, une panne, une dérive. Le reste (démarrage, effacement d'un compte échu, envoi d'un message programmé…) est de la vie. */
const EVT_INCIDENT = /(^|_)(echec|echecs|erreur|exception|rejet|refuse?|abandon|abandonne|illisible|coupee?|inactif|retard|perdu|lent|invraisemblable|orphelins?|bouclier|relance|occupe)(_|$)|sans_membre|min_ignoree/;
const EVT_TOUJOURS = new Set(['facturation']);   // chaque ligne de la facturation dit une anomalie (session incohérente, abonnement non reconnu ou introuvable)
const ETAT_INCIDENT = /^(echec|erreur|refuse|occupe|hors_reseau|invraisemblable|trop_lourd|indisponible|perdu)/;
const FLOT = new Set(['quota_refuse', 'corps_lent', 'piece_depot_lent', 'admin_refus']);   // qu'un inconnu peut déclencher en rafale : comptés, jamais rangés un par un
function niveauDe(evt, champs) {
  if (EVT_TOUJOURS.has(evt) || EVT_INCIDENT.test(evt)) return 'incident';
  if (champs && typeof champs.etat === 'string' && ETAT_INCIDENT.test(champs.etat)) return 'incident';
  return 'info';
}
function creerJournalIncidents({ max = 200, cleMax = 150, horloge = Date.now } = {}) {
  let anneau = [], compteurs = new Map(), depuis = horloge();
  function noter(o) {
    if (!o || typeof o !== 'object') return;
    let evt = typeof o.evt === 'string' && /^[a-z0-9_]{1,40}$/.test(o.evt) ? o.evt : '(autre)';
    if (!compteurs.has(evt) && compteurs.size >= cleMax) evt = '(autre)';
    const champs = champsSurs(o), incident = niveauDe(evt, champs) === 'incident';
    const t0 = typeof o.t === 'string' ? Date.parse(o.t) : NaN, t = Number.isFinite(t0) ? t0 : horloge();
    let c = compteurs.get(evt);
    if (!c) { c = { n: 0, incidents: 0, dernier: null, dernier_incident: null }; compteurs.set(evt, c); }
    c.n++; c.dernier = t;
    if (incident) {
      c.incidents++; c.dernier_incident = t;
      if (!FLOT.has(evt)) { anneau.push(Object.assign({ t, evt }, champs)); if (anneau.length > max) anneau.shift(); }
    }
  }
  return {
    noter, max,
    lire: (limite) => anneau.slice(-Math.max(1, limite | 0)).reverse(),
    compteurs: () => { const r = {}; for (const k of Array.from(compteurs.keys()).sort()) r[k] = Object.assign({}, compteurs.get(k)); return r; },
    depuis: () => depuis, taille: () => anneau.length,
    reinitialiser() { anneau = []; compteurs = new Map(); depuis = horloge(); },
  };
}
const journalProcessus = creerJournalIncidents();
/* appelée par `journaliser` (index.js) à CHAQUE ligne : elle ne doit jamais la faire échouer */
function noterJournal(o) { try { journalProcessus.noter(o); } catch (e) { /* un journal qui échoue ne fait pas échouer ce qu'il journalise */ } }

/* ══ LA GARDE `AD` ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
function etatDe(ctx) { return ctx.adminEtat || (ctx.adminEtat = { acces: 0, dernier_acces: null, refus: {}, dernier_refus: null, ligne: {} }); }

function gardeAdmin(ctx) {
  const { config, journaliser } = ctx;
  const horloge = ctx.horloge || Date.now;
  const etat = etatDe(ctx);
  /* ⛔ UN SEUL REFUS pour tout : le même 404 qu'une route inconnue (le corps de `/api` → 404 d'`app.js`). Le motif ne sort que dans le journal et les compteurs. */
  function refuser(res, motif) {
    const t = horloge();
    etat.refus[motif] = (etat.refus[motif] || 0) + 1; etat.dernier_refus = t;
    /* une ligne de journal par motif et par minute : n'importe qui peut frapper à cette porte, il ne remplit pas le journal */
    if (typeof journaliser === 'function' && (!etat.ligne[motif] || t - etat.ligne[motif] >= 60000 || t < etat.ligne[motif])) { etat.ligne[motif] = t; journaliser('admin_refus', { motif }); }
    return res.status(404).json({ error: 'introuvable' });
  }
  return [(req, res, next) => {
    const cfg = config.admin;
    if (!cfg || !Buffer.isBuffer(cfg.empreinte)) return refuser(res, 'inerte');
    if (!BOUCLE.has(req.socket && req.socket.remoteAddress)) return refuser(res, 'hors_boucle');
    for (const h of ENTETES_PROXY) if (req.headers[h] !== undefined) return refuser(res, 'proxy');
    const brut = req.headers[ENTETE];
    if (brut === undefined) return refuser(res, 'absent');
    if (typeof brut !== 'string' || !RE_SECRET.test(brut)) return refuser(res, 'faux');
    if (!crypto.timingSafeEqual(sha256(brut.toLowerCase()), cfg.empreinte)) return refuser(res, 'faux');
    etat.acces++; etat.dernier_acces = horloge();
    next();
  }];
}

/* ══ LES ROUTES ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const ORIGINE_PUBLIQUE = { beta: 'beta', compte: 'courriel', telephone: 'telephone' };
const ORIGINE_BASE = { beta: 'beta', courriel: 'compte', telephone: 'telephone' };
const ID_PERSONNE = /^p_[0-9a-f]{32}$/;
const RE_CURSEUR = /^([0-9]{1,15})\.([a-z]_[0-9a-f]{32})$/;
const RE_STATUT = /^[a-z_]{1,32}$/;
const curseurDe = (l) => l.cree + '.' + l.id;

function installerAdmin(H, ctx) {
  const { config, stockage, formule, facturation } = ctx;
  const horloge = ctx.horloge || Date.now;
  const etat = etatDe(ctx);
  const journal = ctx.adminJournal || journalProcessus;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const garder = (f) => (req, res, next) => {
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(next); }
    catch (e) { next(e); }
  };
  const invalide = (res, champ) => refus(res, 400, 'parametre_invalide', { champ });
  const un = (q, k) => (q && Object.prototype.hasOwnProperty.call(q, k)) ? q[k] : undefined;
  /* lit `limite` et `apres` ; rend `null` (la réponse 400 est déjà partie) ou { limite, apres } */
  function lirePage(req, res, { defaut = 50, max = 200 } = {}) {
    let limite = defaut;
    const l = un(req.query, 'limite');
    if (l !== undefined) {
      if (typeof l !== 'string' || !/^[0-9]{1,4}$/.test(l)) { invalide(res, 'limite'); return null; }
      limite = parseInt(l, 10);
      if (limite < 1 || limite > max) { invalide(res, 'limite'); return null; }
    }
    let apres = null;
    const a = un(req.query, 'apres');
    if (a !== undefined) {
      const m = typeof a === 'string' ? RE_CURSEUR.exec(a) : null;
      if (!m) { invalide(res, 'apres'); return null; }
      apres = { cree: parseInt(m[1], 10), id: m[2] };
    }
    return { limite, apres };
  }
  function lecture(res) {
    if (stockage.adminLecture) return stockage.adminLecture;
    refus(res, 503, 'admin_indisponible');
    return null;
  }
  const formuleVue = (v) => ({ formule: v.formule, motif: v.motif, sursis_jusqua: v.sursis_jusqua || null });
  const pagine = (lignes, plus) => (plus && lignes.length ? curseurDe(lignes[lignes.length - 1]) : null);

  /* ── santé ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
  H['admin.sante'] = garder((req, res) => {
    const L = stockage.adminLecture, t = horloge();
    const mo = (n) => Math.round(n / 1048576 * 10) / 10;
    const taille = (f) => { try { return mo(fs.statSync(f).size); } catch (e) { return null; } };
    const base = path.join(config.dataDir, 'msg.db');
    const libre = ctx.disque && typeof ctx.disque.libreMo === 'function' ? ctx.disque.libreMo() : null;
    const mem = process.memoryUsage();
    res.json({
      instance: config.instance, version: ctx.version, sha: config.sha, build: ctx.build || null, version_page: ctx.versionPage || 0,
      min_client: ctx.versionClient ? ctx.versionClient.exige() : null,
      client_tour: ctx.versionClient ? ctx.versionClient.etat() : null,
      demarre_le: t - Math.round(process.uptime() * 1000), maintenant: t,
      processus: { node: process.version, rss_mo: mo(mem.rss), tas_mo: mo(mem.heapUsed) },
      base: { fichier_mo: taille(base), wal_mo: taille(base + '-wal'), schema: stockage.schema(), illisibles: stockage.illisibles(), stats: stockage.stats() },
      disque: { libre_mo: Number.isFinite(libre) ? Math.round(libre) : null, bas: !!(ctx.disque && ctx.disque.bas()), plancher_mo: config.disqueMinMo },
      reglages: {
        tout_ouvert: formule.toutOuvert(), inscription_courriel: !!config.inscriptionCourriel, courriel_ouvert: !!(config.courriel && config.courriel.mode === 'smtp'),
        facturation_ouverte: !!(facturation && facturation.ouvert()), facturation_mode: facturation ? facturation.mode() : null,
        sauvegarde_configuree: !!config.sauvegarde, admin_configuree: !!config.admin,
      },
      decompte: L ? L.decompte() : null,
      sante: ctx.sante(),
      admin: {
        acces: etat.acces, dernier_acces: etat.dernier_acces, refus: Object.assign({}, etat.refus), dernier_refus: etat.dernier_refus,
        journal: { depuis: journal.depuis(), capacite: journal.max, en_memoire: journal.taille() },
      },
    });
  });

  /* ── comptes ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
  H['admin.comptes'] = garder((req, res) => {
    const L = lecture(res); if (!L) return;
    const p = lirePage(req, res); if (!p) return;
    const q = req.query;
    let origine = null, etatF = 'actif', id = null, adresses = true;
    const o = un(q, 'origine'); if (o !== undefined) { if (typeof o !== 'string' || !Object.prototype.hasOwnProperty.call(ORIGINE_BASE, o)) return invalide(res, 'origine'); origine = ORIGINE_BASE[o]; }
    const e = un(q, 'etat'); if (e !== undefined) { if (e !== 'actif' && e !== 'supprime' && e !== 'tous') return invalide(res, 'etat'); etatF = e === 'tous' ? null : e; }
    const i = un(q, 'id'); if (i !== undefined) { if (typeof i !== 'string' || !ID_PERSONNE.test(i)) return invalide(res, 'id'); id = i; }
    const a = un(q, 'adresses'); if (a !== undefined) { if (a !== 'oui' && a !== 'non') return invalide(res, 'adresses'); adresses = a === 'oui'; }
    const page = L.comptes({ apres: p.apres, limite: p.limite, origine, etat: etatF, id });
    const items = page.lignes.map(l => {
      const empreinte = l.adresse ? sha256Hex(l.adresse) : null;
      return {
        id: l.id, origine: ORIGINE_PUBLIQUE[l.origine] || null, etat: l.etat, suppression_le: l.suppression_le, verifie: l.verifie, cree: l.cree,
        derniere_activite: l.vu, ident: l.ident, acces_beta: l.acces_beta,
        email: adresses ? l.adresse : null, email_sha256: empreinte,
        formule: l.etat === 'supprime' ? null : formuleVue(formule.formuleDe({ personne: l.id, reel: true })),
        espaces: l.espaces,
      };
    });
    res.json({ total: L.comptesTotal({ origine, etat: etatF, id }), tout_ouvert: formule.toutOuvert(), items, suivant: pagine(page.lignes, page.plus) });
  });

  /* ── empreintes d'adresses ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
  H['admin.empreintes'] = garder((req, res) => {
    const L = lecture(res); if (!L) return;
    const p = lirePage(req, res, { max: 1000 }); if (!p) return;
    const page = L.adresses({ apres: p.apres, limite: p.limite });
    const items = page.lignes.filter(l => l.adresse).map(l => ({ id: l.id, sha256: sha256Hex(l.adresse) }));
    res.json({ algorithme: 'sha256', normalisation: 'adresse en minuscules, sans espace de bord', total: L.adressesTotal(), items, suivant: pagine(page.lignes, page.plus) });
  });

  /* ── espaces ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
  H['admin.espaces'] = garder((req, res) => {
    const L = lecture(res); if (!L) return;
    const p = lirePage(req, res); if (!p) return;
    const page = L.espaces({ apres: p.apres, limite: p.limite });
    const items = page.lignes.map(l => ({
      id: l.id, nom: l.nom, proprio: l.proprio, cree: l.cree, membres: l.membres, canaux: l.canaux,
      formule: formuleVue(formule.formuleDe({ espace: l.id, reel: true })), places_depassees: formule.placesDepassees(l.id, l.membres), abonnement: l.abonnement,
    }));
    res.json({ total: L.espacesTotal(), items, suivant: pagine(page.lignes, page.plus) });
  });

  /* ── abonnements ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
  H['admin.abonnements'] = garder((req, res) => {
    const L = lecture(res); if (!L) return;
    const p = lirePage(req, res); if (!p) return;
    let statut = null;
    const s = un(req.query, 'statut'); if (s !== undefined) { if (typeof s !== 'string' || !RE_STATUT.test(s)) return invalide(res, 'statut'); statut = s; }
    const page = L.abonnements({ apres: p.apres, limite: p.limite, statut });
    const items = page.lignes.map(l => ({
      espace: l.id, nom: l.nom, statut: l.statut, formule: formuleVue(formule.formuleDe({ espace: l.id, reel: true })), places: l.places, membres: l.membres,
      places_depassees: formule.placesDepassees(l.id, l.membres), fin_periode: l.fin_periode, annule: l.annule, impaye_depuis: l.impaye_depuis, relu_le: l.relu_le,
      cree: l.cree, stripe: l.stripe, paiement_en_attente: l.paiement_en_attente,
    }));
    const d = L.decompte();
    res.json({
      total: L.abonnementsTotal({ statut }),
      facturation: {
        ouvert: !!(facturation && facturation.ouvert()), mode: facturation ? facturation.mode() : null, tout_ouvert: formule.toutOuvert(),
        stripe_echec_min: facturation ? facturation.echecMin() : 0, derniere_lecture: facturation && facturation.derniereLecture() ? facturation.derniereLecture() : null,
      },
      resume: { par_statut: d.abonnements },
      items, suivant: pagine(page.lignes, page.plus),
    });
  });

  /* ── incidents ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
  H['admin.incidents'] = garder((req, res) => {
    const p = lirePage(req, res); if (!p || p.apres !== null) { if (p) invalide(res, 'apres'); return; }   // une liste en mémoire, la plus récente d'abord : pas de curseur
    res.json({ depuis: journal.depuis(), capacite: journal.max, en_memoire: journal.taille(), compteurs: journal.compteurs(), incidents: journal.lire(p.limite) });
  });
}

module.exports = { adminConfig, gardeAdmin, installerAdmin, noterJournal, creerJournalIncidents, niveauDe, chaineSure, champsSurs, ENTETE, ENTETES_PROXY, MOTIFS, RE_SECRET, journalProcessus };
