/* ══ LE PONT DES AGENTS — LA MESSAGERIE DE LA TOUR PASSE SUR OP MESSAGES (28 octobre 2026) ═════════════════════════════════════════
 *
 * Justin : « tu vas implanter OP MESSAGES à la place » — les seize agents de la Tour (`server/conversations.js` : quatre groupes `equipe`, `clients`, `plateforme`,
 * `reunions` et un fil privé par agent) parlent à Justin DANS OP MESSAGES, et il y répond de son téléphone. Les agents, leurs règles, leurs réunions restent ce qu'ils sont, côté
 * Tour : OP MESSAGES devient le transport et l'écran. Ce fichier est le côté OP MESSAGES. Le côté Tour est `server/pont-messages.js` (il APPELLE ce service en boucle locale ;
 * ⛔ `server-msg/` n'importe toujours JAMAIS `server/`).
 *
 * ⛔ INERTE PAR DÉFAUT. Sans `pont: { actif: true, secretSha256, justin }` dans la configuration de l'instance, les cinq routes répondent le MÊME 404 qu'une route inconnue. Bêta
 * seulement pour l'instant (Justin : « d'abord sur la bêta ») : en production, un bloc `pont` REFUSE le démarrage.
 *
 * ⛔ LA GARDE `PT` — LES TROIS PREUVES DE L'ADMINISTRATION (`admin.js`), AVEC SON PROPRE SECRET. nginx relaie TOUT le public depuis 127.0.0.1 : « la connexion vient de la boucle locale »
 * ne prouve donc rien seul. Une requête n'est admise que si, ENSEMBLE : l'adresse de la SOCKET est la boucle locale ; elle ne porte AUCUN en-tête de proxy ; elle porte
 * `X-OPM-Pont: <64 hexadécimaux>` dont le SHA-256 égale `pont.secretSha256`, comparé en temps constant. Le service ne garde jamais le secret en clair — seulement son empreinte —
 * et refuse un secret DONT L'EMPREINTE est celle de l'administration (un secret par pouvoir : celui-ci ÉCRIT, l'autre ne fait que lire). Tout refus est le même 404.
 * ⚠️ Les écritures du pont ne passent PAS par l'`Origin` ni l'en-tête `X-OPM` d'une page (`app.js`) : ce ne sont pas des gestes d'une page, et leur garde est plus stricte.
 *
 * ⛔ QUI ÉCRIT, ET OÙ. Les auteurs sont des PERSONNES-ROBOTS (identifiant `pont:<agent>`, jamais une adresse ni un accès bêta : aucune porte du service n'ouvre une session pour elles).
 * Le pont écrit au nom d'un robot, jamais au nom de Justin — sauf l'IMPORT de l'historique (`import: true`), qui garde les dates d'origine. Un message n'entre que dans une
 * conversation de LA TABLE du pont (fil → conversation, rangée dans la base : une sauvegarde la ramène avec les conversations), et le robot doit en être MEMBRE : un robot ne
 * parle pas dans le fil privé d'un collègue ni dans une conversation d'une autre personne. Ce que le pont lit de Justin ne vient que de ces conversations-là.
 *
 * LE CONTRAT (toutes les routes : en-tête `X-OPM-Pont`, JSON, `Cache-Control: no-store`)
 *   POST /api/pont/installer  { agents:[{id,nom,role}], groupes:[{fil,nom,membres:[id]}] }
 *       Crée ou retrouve : Justin (la personne de l'accès bêta `pont.justin`), un robot par agent et le robot « Système », l'espace PRO « Équipe TeamOP — agents » (Justin propriétaire, les
 *       robots membres : donc COLLÈGUES, sans demande de contact), une conversation directe Justin ↔ chaque agent (fil = l'identifiant de l'agent) et un groupe par entrée de `groupes`
 *       (Justin administrateur). Idempotent : un second appel ne crée rien, n'ajoute que les membres nouveaux, ne renomme rien. → { ok, fils:[…], robots, creees:{personnes,conversations,membres} }
 *   POST /api/pont/poster     { messages:[{fil,de,texte,cid,ts?,lu?,push?}], import? }   (1 à 25 messages ; `de` : un agent, « systeme », ou « justin » avec `import:true`)
 *       → { ok, resultats:[{ok,seq,deja,ts}|{ok:false,raison}] }   Un message refusé n'empêche pas les autres. `cid` idempotent : le rejouer rend « deja ».
 *   GET  /api/pont/nouveaux?depuis=<curseur>   Ce que JUSTIN a fait dans les conversations du pont depuis le curseur : ses messages (texte) et les suppressions (pour tous OU pour lui).
 *       Sans `depuis`, rend seulement le curseur d'aujourd'hui. → { ok, curseur, plein, evenements:[{gid,type:'message',fil,seq,texte|null,genre,ts}|{gid,type:'suppression',fil,seq,pour}] }
 *       Les messages que le pont a lui-même recopiés de la Tour (`cid` « tour-… ») n'y sont JAMAIS : ils ne reviennent pas à leur source.
 *   POST /api/pont/supprimer  { fil, seq }   Retire un message POUR TOUS (la Tour l'a supprimé). → { ok }
 *   POST /api/pont/avatar?cible=<id>   LA PHOTO d'un robot ou d'un groupe. Corps BRUT `application/octet-stream` (une image : le service juge la SIGNATURE aux octets, jamais le nom ni le type annoncé,
 *       et retire les métadonnées — `pieces.deposer`, le seul chemin d'écriture d'un fichier image), `Content-Length` OBLIGATOIRE (411), au plus `pieces.avatarMax` (413), `X-OPM-Empreinte: <64 hexadécimaux>` = le
 *       SHA-256 du corps REÇU, recalculé ici (400 s'il manque ou diffère : un corps tronqué ou changé en route ne se pose pas). `cible` : un robot de LA TABLE (un agent, « systeme ») ou le fil d'un GROUPE de
 *       la table — JAMAIS une directe (sa photo est celle de l'autre personne : le robot) → 400 champ_invalide. Posée en UNE transaction avec l'empreinte source rangée dans la table du pont ; l'ancienne
 *       photo est effacée (ligne ET fichier). Même empreinte que la dernière posée → 200 { ok, deja:true } sans rien écrire. → 200 { ok, deja } · 415 type_refuse (pas une image) · 429 (budget).
 *       ⛔ AUCUN message système « a changé la photo du groupe » : le pont pose ses photos sans rien dire dans la conversation (voir `stockage.avatarPontPoser`).
 *       `installer` rend en plus `avatars: { <cible>: <empreinte source> }` — ce que le service a DÉJÀ posé : la Tour n'envoie que les photos manquantes ou changées.
 *
 * ⛔ UN BANC (tests/test-3094.js) MONTE LE VRAI SERVICE ET LE VRAI SERVEUR D'OP GESTION et joue le tout par leurs vraies routes.
 */
'use strict';
const crypto = require('crypto');
const { ENTETES_PROXY } = require('./admin');

const ENTETE = 'x-opm-pont';
const RE_SECRET = /^[0-9a-fA-F]{64}$/;
const RE_ID_ACCES = /^b[0-9a-f]{6,32}$/;      // l'identifiant d'un accès bêta chez OP GESTION (comme `porte-beta.js`)
const RE_AGENT = /^[a-z][a-z0-9]{1,19}$/;
const RE_FIL = /^[a-z][a-z0-9]{1,19}$/;
const CID = /^[A-Za-z0-9_-]{8,64}$/;
const BOUCLE = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const MOTIFS = ['inerte', 'hors_boucle', 'proxy', 'absent', 'faux'];
const META_CLE = 'pont_agents';
const NOM_ESPACE = 'Équipe TeamOP — agents';
const SYSTEME = { id: 'systeme', nom: 'Système', role: 'Ce qui se passe dans l’équipe' };
const MSG_MAX = 8000, LOT_MAX = 25, AGENTS_MAX = 40, GROUPES_MAX = 20;
const PAR_MINUTE_AVATAR = 120;                // photos par minute (un démarrage de la Tour en envoie 21, une à la fois) : de la décompression d'image à chaque appel, donc un budget à part, plus bas
const RE_EMPREINTE = /^[0-9a-fA-F]{64}$/;
const PAR_MINUTE = 900;                        // lots du pont par minute : un emballement côté Tour s'arrête ici (l'import tient en ~30 lots)
const sha256 = (x) => crypto.createHash('sha256').update(x).digest();
const INVISIBLE = /^[\s\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff\u00ad]*$/u;
const CTRL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const nettoyerTexte = (s) => String(s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029]/g, '');
const nettoyerNom = (s, n) => String(s).replace(CTRL, '').replace(/\s+/g, ' ').trim().slice(0, n);

/* ══ LA CONFIGURATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   `pont: { actif: true, secretSha256: <64 hexadécimaux>, justin: "b…" }`. Absent ou `actif` différent de `true` : le pont est INERTE. Présent mais faux (pas un objet, une clé
   inconnue, une empreinte qui n'est pas 64 hexadécimaux ou trop régulière, un accès qui n'a pas la forme d'un identifiant, production, la MÊME empreinte que l'administration) :
   le démarrage est REFUSÉ — un pont à moitié posé ne doit pas laisser croire que la porte est gardée. ⛔ Jamais la valeur dans un message d'erreur. */
function pontConfig(cfg, instance, adminEmpreinte) {
  const err = (m) => { const e = new Error('config: ' + m); e.code = 'CONFIG'; return e; };
  const brut = cfg && cfg.pont;
  if (brut === undefined || brut === null) return null;
  if (typeof brut !== 'object' || Array.isArray(brut)) throw err('pont doit être un objet { actif, secretSha256, justin }');
  for (const k of Object.keys(brut)) if (!['actif', 'secretSha256', 'justin'].includes(k)) throw err('pont.' + k + ' est inconnu (actif, secretSha256, justin)');
  if (brut.actif !== true) return null;
  if (instance !== 'beta') throw err('pont : seulement sur la bêta (la production viendra après l\'essai)');
  if (typeof brut.secretSha256 !== 'string' || !RE_SECRET.test(brut.secretSha256)) throw err('pont.secretSha256 doit être 64 caractères hexadécimaux (l\'empreinte SHA-256 du secret)');
  const hex = brut.secretSha256.toLowerCase();
  if (new Set(hex).size < 8) throw err('pont.secretSha256 est trop régulier (c\'est l\'empreinte d\'un secret tiré au hasard)');
  if (typeof brut.justin !== 'string' || !RE_ID_ACCES.test(brut.justin)) throw err('pont.justin doit être l\'identifiant de l\'accès bêta de Justin (b + hexadécimaux, celui que la Tour affiche)');
  const empreinte = Buffer.from(hex, 'hex');
  if (Buffer.isBuffer(adminEmpreinte) && crypto.timingSafeEqual(adminEmpreinte, empreinte)) throw err('pont.secretSha256 ne peut pas être celui de l\'administration (un secret par pouvoir)');
  return { empreinte, justin: brut.justin };
}

/* ══ LA GARDE ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
function gardePont(ctx) {
  const { config, journaliser } = ctx;
  const horloge = ctx.horloge || Date.now;
  const etat = { acces: 0, dernier_acces: null, refus: {}, dernier_refus: null, ligne: {} };
  ctx.pontGarde = etat;
  function refuser(res, motif) {
    const t = horloge();
    etat.refus[motif] = (etat.refus[motif] || 0) + 1; etat.dernier_refus = t;
    if (typeof journaliser === 'function' && (!etat.ligne[motif] || t - etat.ligne[motif] >= 60000 || t < etat.ligne[motif])) { etat.ligne[motif] = t; journaliser('pont_refus', { motif }); }
    return res.status(404).json({ error: 'introuvable' });
  }
  return [(req, res, next) => {
    const cfg = config.pont;
    if (!cfg || !Buffer.isBuffer(cfg.empreinte)) return refuser(res, 'inerte');
    if (!BOUCLE.has(req.socket && req.socket.remoteAddress)) return refuser(res, 'hors_boucle');
    for (const h of ENTETES_PROXY) if (req.headers[h] !== undefined) return refuser(res, 'proxy');
    const brut = req.headers[ENTETE];
    if (brut === undefined) return refuser(res, 'absent');
    if (typeof brut !== 'string' || !RE_SECRET.test(brut)) return refuser(res, 'faux');
    if (!crypto.timingSafeEqual(sha256(Buffer.from(brut.toLowerCase(), 'utf8')), cfg.empreinte)) return refuser(res, 'faux');
    etat.acces++; etat.dernier_acces = horloge();
    next();
  }];
}

/* ══ LE MODULE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
function installerPont(H, ctx) {
  const { config, stockage, hub, push, quotas } = ctx;
  const horloge = ctx.horloge || Date.now;
  const journaliser = typeof ctx.journaliser === 'function' ? ctx.journaliser : () => {};
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  const REFUS_STOCKAGE = { introuvable: [404, 'introuvable'], trop_d_espaces: [409, 'trop_d_espaces'], espace_complet: [409, 'espace_complet'], groupe_plein: [409, 'groupe_plein'], type: [400, 'champ_invalide'], interdit: [403, 'interdit'], vide: [400, 'champ_invalide'] };
  const garder = (f) => (req, res, next) => {
    const gerer = (e) => { const r = e && REFUS_STOCKAGE[e.code]; if (r) return refus(res, r[0], r[1]); return next(e); };
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(gerer); } catch (e) { gerer(e); }
  };
  const bilan = { installs: 0, postes: 0, refuses: 0, importes: 0, suppressions: 0, avatars: 0 };

  /* ── La table du pont : { v, justin, espace, robots:{agent→uid}, fils:{fil→conv}, membres:{fil→[agents]} } — dans la base (`meta`), donc avec ses sauvegardes ── */
  function lireTable() {
    const brut = stockage.metaLire(META_CLE);
    if (!brut) return null;
    try {
      const t = JSON.parse(brut);
      if (!t || t.v !== 1 || typeof t.justin !== 'string' || typeof t.espace !== 'string' || !t.robots || !t.fils || !t.membres) return null;
      return t;
    } catch (e) { return null; }
  }
  const ecrireTable = (t) => stockage.metaPoser(META_CLE, JSON.stringify(t));

  /* Justin : la personne de l'accès bêta. Si elle n'a pas encore ouvert OP MESSAGES, elle est créée ICI sous le même identifiant (`beta:<accès>`) : la porte la retrouvera. */
  const justinDe = () => stockage.personneCreer({ identifiant: 'beta:' + config.pont.justin, prenom: 'Justin', nom: '', origine: 'beta', verifie: true });

  function lireAgents(b) {
    if (!Array.isArray(b.agents) || !b.agents.length || b.agents.length > AGENTS_MAX) return null;
    const vus = new Set(), sortie = [];
    for (const a of b.agents) {
      if (!a || typeof a !== 'object' || typeof a.id !== 'string' || !RE_AGENT.test(a.id) || a.id === SYSTEME.id || vus.has(a.id)) return null;
      const nom = typeof a.nom === 'string' ? nettoyerNom(a.nom, 60) : '';
      if (!nom) return null;
      vus.add(a.id);
      sortie.push({ id: a.id, nom, role: typeof a.role === 'string' ? nettoyerNom(a.role, 140) : '' });
    }
    return sortie;
  }
  function lireGroupes(b, agents) {
    const g = b.groupes === undefined ? [] : b.groupes;
    if (!Array.isArray(g) || g.length > GROUPES_MAX) return null;
    const ids = new Set(agents.map(a => a.id)), vus = new Set(), sortie = [];
    for (const x of g) {
      if (!x || typeof x !== 'object' || typeof x.fil !== 'string' || !RE_FIL.test(x.fil) || ids.has(x.fil) || x.fil === SYSTEME.id || vus.has(x.fil)) return null;
      const nom = typeof x.nom === 'string' ? nettoyerNom(x.nom, 60) : '';
      if (!nom || !Array.isArray(x.membres) || x.membres.length > AGENTS_MAX || x.membres.some(m => typeof m !== 'string' || !ids.has(m))) return null;
      vus.add(x.fil);
      sortie.push({ fil: x.fil, nom, membres: Array.from(new Set(x.membres)) });
    }
    return sortie;
  }

  /* ── installer ── */
  function installer(b) {
    const agents = lireAgents(b); if (!agents) return { statut: 400, erreur: 'champ_invalide' };
    const groupes = lireGroupes(b, agents); if (!groupes) return { statut: 400, erreur: 'champ_invalide' };
    const creees = { personnes: 0, conversations: 0, membres: 0 };
    const r = stockage.tx(() => {
      const justin = justinDe();
      const t = lireTable() || { v: 1, justin: justin.id, espace: '', robots: {}, fils: {}, membres: {} };
      if (t.justin !== justin.id) throw Object.assign(new Error('pont'), { code: 'justin_change' });   // l'accès de Justin a changé depuis l'installation : on ne mélange pas deux personnes
      /* les robots : un par agent, et « Système » */
      for (const a of [SYSTEME].concat(agents)) {
        const avant = stockage.personneParIdentifiant('pont:' + a.id);
        const p = stockage.personneCreer({ identifiant: 'pont:' + a.id, prenom: a.nom, nom: '', origine: 'beta', verifie: true });
        if (!avant) { creees.personnes++; if (t.avatars) delete t.avatars[a.id]; }   // un robot NEUF n'a pas de photo, quoi que la table ait gardé d'un robot de même nom
        if (p.prenom !== a.nom || p.statut !== (a.role || '')) stockage.personneMaj(p.id, { prenom: a.nom, statut: a.role || '' });
        t.robots[a.id] = p.id;
      }
      /* l'espace : Justin propriétaire, les robots membres */
      if (!t.espace || !stockage.espacePourMembre(t.espace, justin.id)) {
        t.espace = stockage.espaceCreer({ nom: NOM_ESPACE, proprio: justin.id }).id;
      }
      for (const id of Object.keys(t.robots)) {
        if (!stockage.espaceMembreAjouter({ espace: t.espace, uid: t.robots[id] }).deja) creees.membres++;
      }
      /* les fils privés : une directe Justin ↔ agent, dont l'identifiant de fil est celui de l'agent */
      for (const a of agents) {
        if (t.fils[a.id] && stockage.convPourMembre(t.fils[a.id], justin.id)) continue;
        t.fils[a.id] = stockage.convDirecteObtenir(justin.id, t.robots[a.id]).id; creees.conversations++;   // (la photo d'une directe est celle du robot : rien à oublier ici)
      }
      /* les groupes : Justin administrateur ; les membres déjà posés ne sont jamais remis (Justin a pu en retirer un), seuls les NOUVEAUX entrent */
      for (const g of groupes) {
        const voulus = g.membres.map(m => t.robots[m]).concat(t.robots[SYSTEME.id]);
        if (t.fils[g.fil] && stockage.convPourMembre(t.fils[g.fil], justin.id)) {
          const deja = new Set(t.membres[g.fil] || []);
          const neufs = g.membres.filter(m => !deja.has(m));
          if (neufs.length) { stockage.membresAjouter({ conv: t.fils[g.fil], par: justin.id, uids: neufs.map(m => t.robots[m]) }); creees.membres += neufs.length; }
          t.membres[g.fil] = Array.from(new Set(g.membres.concat(Array.from(deja))));
        } else {
          t.fils[g.fil] = stockage.convCreerGroupe({ createur: justin.id, nom: g.nom, membres: voulus }).id; creees.conversations++;
          if (t.avatars) delete t.avatars[g.fil];   // un groupe recréé (base restaurée, groupe quitté) n'a plus la photo que la table croyait lui avoir posée
          t.membres[g.fil] = g.membres.slice();
        }
      }
      ecrireTable(t);
      return t;
    });
    if (creees.personnes || creees.conversations || creees.membres) { try { hub.reveiller({ uids: [r.justin] }); } catch (e) {} }
    bilan.installs++;
    journaliser('pont_installe', { n: creees.personnes + creees.conversations + creees.membres });
    return { statut: 200, corps: { ok: true, fils: Object.keys(r.fils), robots: Object.keys(r.robots), creees, avatars: Object.assign({}, r.avatars || {}) } };
  }

  /* ── poster ── */
  function unMessage(t, m, importe) {
    const non = (raison) => { bilan.refuses++; return { ok: false, raison }; };
    if (!m || typeof m !== 'object' || Array.isArray(m)) return non('champ_invalide');
    if (typeof m.fil !== 'string' || !Object.prototype.hasOwnProperty.call(t.fils, m.fil)) return non('fil_inconnu');
    if (typeof m.cid !== 'string' || !CID.test(m.cid)) return non('champ_invalide');
    if (typeof m.texte !== 'string' || m.texte.length > MSG_MAX * 2) return non('champ_invalide');
    let texte = nettoyerTexte(m.texte);
    if (INVISIBLE.test(texte) || Array.from(texte).length > MSG_MAX) return non('champ_invalide');
    const conv = t.fils[m.fil], prive = Object.prototype.hasOwnProperty.call(t.robots, m.fil) && m.fil !== SYSTEME.id;
    let auteur;
    if (m.de === 'justin') {
      /* ⛔ AU NOM DE JUSTIN, SEULEMENT L'IMPORT : un message qu'il a déjà écrit dans la Tour. Sinon le pont se ferait passer pour lui. */
      if (importe !== true) return non('justin_interdit');
      auteur = t.justin;
    } else if (m.de === SYSTEME.id) {
      /* une ligne du système : dans un groupe, le robot « Système » (membre de chaque groupe) ; dans un fil PRIVÉ (une directe à deux), l'agent du fil la porte, marquée */
      if (prive) { auteur = t.robots[m.fil]; texte = 'ℹ️ ' + texte; } else auteur = t.robots[SYSTEME.id];
    } else if (typeof m.de === 'string' && Object.prototype.hasOwnProperty.call(t.robots, m.de) && m.de !== SYSTEME.id) {
      auteur = t.robots[m.de];
    } else return non('auteur_inconnu');
    if (!auteur) return non('auteur_inconnu');
    /* ⛔ MEMBRE DE LA CONVERSATION : un robot ne parle ni dans le fil privé d'un collègue ni ailleurs que dans une conversation du pont */
    if (!stockage.convPourMembre(conv, auteur)) return non('pas_membre');
    let tsImpose = null;
    if (importe === true) {
      /* un import porte TOUJOURS un `cid` « tour-… » : c'est ce que `nouveaux` écarte pour ne pas renvoyer à la Tour ce qui vient d'elle — la règle ne repose plus sur
         une convention du client (relecture de `gardien`) */
      if (!m.cid.startsWith('tour-')) return non('champ_invalide');
      if (!Number.isSafeInteger(m.ts) || m.ts <= 0 || m.ts > horloge() + 60000) return non('champ_invalide');
      tsImpose = m.ts;
    }
    const r = stockage.messageEnvoyer({ conv, auteur, cid: m.cid, type: 'texte', texte, tsImpose });
    if (r.deja) return { ok: true, deja: true, seq: r.seq, ts: r.ts };
    bilan.postes++; if (importe === true) bilan.importes++;
    /* l'historique importé garde son état lu / non lu : Justin avait déjà lu ce qu'il avait lu dans la Tour */
    if (importe === true && m.lu === true && auteur !== t.justin) { try { stockage.membreLu({ conv, uid: t.justin, seq: r.seq }); } catch (e) {} }
    /* la notification de téléphone : celle de la Tour (`niveau` important ou urgent) seulement, jamais pour un import */
    if (importe !== true && m.push === true && push && typeof push.message === 'function') {
      try {
        const p = stockage.personneParId(auteur), c = stockage.convPourMembre(conv, t.justin);
        push.message({ conv, seq: r.seq, gid: r.gid, auteur, nomAuteur: p ? p.prenom : 'Agent', nomConv: c && c.conv.nom ? c.conv.nom : '', groupe: !!(c && c.conv.type !== 'direct'), type: 'texte', texte, sauf: new Set() });
      } catch (e) { journaliser('pont_push_echec', { nom: (e && (e.code || e.name)) || 'Erreur' }); }
    }
    return { ok: true, deja: false, seq: r.seq, ts: r.ts, _conv: conv };
  }
  H['pont.poster'] = garder((req, res) => {
    const b = corps(req), t = lireTable();
    if (!t) return refus(res, 409, 'pont_non_installe');
    if (!Array.isArray(b.messages) || !b.messages.length || b.messages.length > LOT_MAX) return refus(res, 400, 'champ_invalide');
    if (b.import !== undefined && typeof b.import !== 'boolean') return refus(res, 400, 'champ_invalide');
    const q = quotas.essai('pont:poster', PAR_MINUTE, 60000);
    if (!q.ok) { res.set('Retry-After', String(q.retry)); return refus(res, 429, 'quota_atteint', { retry: q.retry }); }
    const convs = new Set();
    const resultats = b.messages.map(m => {
      let x;
      try { x = unMessage(t, m, b.import === true); }
      catch (e) { bilan.refuses++; x = { ok: false, raison: (e && REFUS_STOCKAGE[e.code]) ? e.code : 'erreur' }; }
      if (x._conv) { convs.add(x._conv); delete x._conv; }
      return x;
    });
    for (const c of convs) { try { hub.reveiller({ conv: c }); } catch (e) {} }
    res.json({ ok: true, resultats });
  });
  H['pont.installer'] = garder((req, res) => {
    let r;
    try { r = installer(corps(req)); }
    catch (e) { if (e && e.code === 'justin_change') return refus(res, 409, 'justin_change'); throw e; }
    if (r.erreur) return refus(res, r.statut, r.erreur);
    res.json(r.corps);
  });

  /* ── avatar : la photo d'un robot ou d'un groupe ── */
  /* UN dépôt à la fois : la table (empreintes) se lit, le fichier se dépose, la table se réécrit — deux photos de la même cible en même temps se marcheraient dessus. */
  let verrouAvatar = Promise.resolve();
  const seul = (f) => { const p = verrouAvatar.then(f, f); verrouAvatar = p.catch(() => {}); return p; };
  /* ⛔ LA CIBLE SE LIT DANS LA TABLE, jamais dans la demande : un robot (agent ou « systeme ») ou le fil d'un GROUPE — pas la directe d'un agent (même identifiant que l'agent : le robot gagne),
     et `hasOwnProperty` pour qu'aucune clé héritée (`__proto__`, `constructor`) ne passe pour une entrée de la table. */
  function cibleAvatar(t, cible) {
    if (typeof cible !== 'string' || !RE_FIL.test(cible)) return null;
    const a = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    if (a(t.robots, cible)) return { robot: t.robots[cible] };
    if (a(t.fils, cible)) return { conv: t.fils[cible], par: t.robots[SYSTEME.id] };
    return null;
  }
  H['pont.avatar'] = garder((req, res) => seul(async () => {
    const t = lireTable();
    if (!t) return refus(res, 409, 'pont_non_installe');
    const cible = req.query.cible, dest = cibleAvatar(t, cible);
    if (!dest || !dest.robot && !dest.par) return refus(res, 400, 'champ_invalide');
    const emp = req.headers['x-opm-empreinte'];
    if (typeof emp !== 'string' || !RE_EMPREINTE.test(emp)) return refus(res, 400, 'champ_invalide');
    if (!/^application\/octet-stream\s*(;|$)/i.test(String(req.headers['content-type'] || ''))) return refus(res, 415, 'type_refuse');
    const q = quotas.essai('pont:avatar', PAR_MINUTE_AVATAR, 60000);
    if (!q.ok) { res.set('Retry-After', String(q.retry)); return refus(res, 429, 'quota_atteint', { retry: q.retry }); }
    /* la longueur est OBLIGATOIRE : sans elle on ne sait pas, avant de lire, si l'envoi tient dans le maximum (un envoi fractionné n'en a pas : 411) */
    const cl = req.headers['content-length'], max = config.pieces.avatarMax;
    if (req.headers['transfer-encoding'] !== undefined || typeof cl !== 'string' || !/^\d{1,13}$/.test(cl)) return refus(res, 411, 'longueur_requise');
    const taille = parseInt(cl, 10);
    if (taille === 0) return refus(res, 400, 'champ_invalide');
    if (taille > max) return refus(res, 413, 'piece_trop_lourde', { max });
    const voulue = emp.toLowerCase();
    if (t.avatars && Object.prototype.hasOwnProperty.call(t.avatars, cible) && t.avatars[cible] === voulue) return res.json({ ok: true, deja: true });
    if (ctx.disque.libreMo() - taille / 1048576 < config.disqueMinMo) return refus(res, 503, 'disque_plein');

    const id = stockage.nouvelId('f'), somme = crypto.createHash('sha256');
    /* le flux passe par le calcul de l'empreinte AU FIL DE L'EAU : ce qui est comparé est ce qui est ARRIVÉ, pas ce que la Tour croit avoir envoyé */
    const flux = { async *[Symbol.asyncIterator]() { for await (const morceau of req) { somme.update(morceau); yield morceau; } } };
    let r;
    try { r = await ctx.pieces.deposer({ id, genre: 'avatar', flux, max, attendu: taille }); }
    catch (e) {
      await ctx.pieces.effacer(id).catch(() => {});
      const c = e && e.code;
      if (c === 'trop_gros') return refus(res, 413, 'piece_trop_lourde', { max });
      if (c === 'type_refuse') return refus(res, 415, 'type_refuse');
      if (c === 'occupe') { res.set('Retry-After', '2'); return refus(res, 429, 'quota_atteint', { retry: 2 }); }
      if (c === 'vide' || c === 'incomplet') return refus(res, 400, 'champ_invalide');
      if (req.aborted || req.destroyed || res.destroyed) return;
      throw e;
    }
    if (somme.digest('hex') !== voulue) { await ctx.pieces.effacer(id).catch(() => {}); return refus(res, 400, 'champ_invalide'); }
    let pose;
    try {
      pose = stockage.tx(() => {
        /* ⛔ LA CIBLE SE RELIT DANS LA TRANSACTION : pendant le dépôt (`await`), une réinstallation a pu recréer le robot ou le groupe — la photo se serait attachée à l'ANCIEN
           et la table aurait dit « posée » pour le nouveau. Même cible ou rien : sinon le fichier part avec la transaction, et la Tour reprendra au démarrage. */
        const maintenant = cibleAvatar(lireTable() || {}, cible);
        if (!maintenant || (maintenant.robot || maintenant.conv) !== (dest.robot || dest.conv)) { const e = new Error('cible_changee'); e.code = 'cible_changee'; throw e; }
        const proprio = dest.robot || dest.par;
        stockage.pieceCreer({ id, proprio, conv: null, genre: 'avatar', taille: r.taille, mime: r.mime, nom: null, ttlMs: config.pieces.orphelineMs });
        const x = stockage.avatarPontPoser(dest.robot ? { piece: id, personne: dest.robot } : { piece: id, conv: dest.conv, par: dest.par });
        /* l'empreinte SOURCE est rangée dans la MÊME transaction que la photo : l'une sans l'autre ferait renvoyer toute la série, ou croire posée une photo qui ne l'est pas */
        const tab = lireTable();
        const av = Object.assign({}, tab.avatars || {}); av[cible] = voulue; tab.avatars = av;
        ecrireTable(tab);
        return x;
      });
    } catch (e) {
      await ctx.pieces.effacer(id).catch(() => {});
      if (e && e.code === 'cible_changee') return refus(res, 409, 'cible_changee');
      throw e;
    }
    if (typeof ctx.effacerPieces === 'function') ctx.effacerPieces(pose.pieces);          // l'ancienne photo : le fichier part avec sa ligne
    bilan.avatars++;
    try {
      if (dest.robot) hub.personneChangee(dest.robot); else hub.reveiller({ conv: dest.conv });
      hub.reveiller({ uids: [t.justin] });                                                // ses écrans relisent la liste (les photos y sont)
    } catch (e) {}
    journaliser('pont_avatar', { n: 1 });
    res.json({ ok: true, deja: false });
  }));

  /* ── nouveaux : ce que JUSTIN a fait dans les conversations du pont ── */
  H['pont.nouveaux'] = garder((req, res) => {
    const t = lireTable();
    if (!t) return refus(res, 409, 'pont_non_installe');
    const brut = req.query.depuis;
    if (brut === undefined) return res.json({ ok: true, curseur: stockage.journalMax(), plein: false, evenements: [] });
    if (typeof brut !== 'string' || !/^[0-9]{1,15}$/.test(brut)) return refus(res, 400, 'parametre_invalide', { champ: 'depuis' });
    const filDe = new Map(Object.entries(t.fils).map(([fil, conv]) => [conv, fil]));
    const lu = stockage.evenementsPour(t.justin, parseInt(brut, 10), 200);
    const evenements = [];
    for (const e of lu.evenements) {
      const d = e.data || {};
      if (!filDe.has(d.conv)) continue;
      const fil = filDe.get(d.conv);
      if (e.event === 'message' && d.auteur === t.justin && d.type !== 'systeme' && !d.supprime) {   // (« Justin a créé le groupe » est une ligne du SERVICE, jamais un message de lui)
        if (typeof d.cid === 'string' && d.cid.startsWith('tour-')) continue;   // ce que le pont a recopié de la Tour n'y retourne pas
        const x = stockage.messageATransferer(d.conv, d.seq, t.justin);
        if (!x) continue;                                                         // déjà supprimé, masqué ou échu : rien à faire entrer
        evenements.push({ gid: e.gid, type: 'message', fil, seq: d.seq, genre: x.type === 'texte' && !x.meta ? 'texte' : 'autre', texte: x.type === 'texte' && !x.meta && typeof x.texte === 'string' ? x.texte : null, ts: d.ts });
      } else if (e.event === 'message_supprime' && (d.pour === 'tous' || d.pour === 'moi')) {
        evenements.push({ gid: e.gid, type: 'suppression', fil, seq: d.seq, pour: d.pour });
      }
    }
    res.json({ ok: true, curseur: lu.dernier, plein: lu.plein, evenements });
  });

  /* ── supprimer : la Tour a supprimé un message ── */
  H['pont.supprimer'] = garder((req, res) => {
    const b = corps(req), t = lireTable();
    if (!t) return refus(res, 409, 'pont_non_installe');
    if (typeof b.fil !== 'string' || !Object.prototype.hasOwnProperty.call(t.fils, b.fil) || !Number.isInteger(b.seq) || b.seq < 1) return refus(res, 400, 'champ_invalide');
    const conv = t.fils[b.fil];
    /* ⛔ UN MESSAGE QUI N'EST PLUS LÀ EST DÉJÀ RETIRÉ — 200, JAMAIS 404 (relecture de `gardien`, 28 octobre 2026). Le 404 est la réponse de la GARDE, au corps
       identique exprès : la Tour ne peut pas les distinguer, le prenait pour « le service refuse », et la suppression restait en tête de file — plus RIEN ne partait
       jusqu'au redémarrage. Absent (base restaurée, numéro disparu), Justin sorti de la conversation, ligne du système : il n'y a rien à retirer, la Tour passe. */
    if (!stockage.messageExiste(conv, b.seq)) return res.json({ ok: true, deja: true, absent: true });
    /* Justin est administrateur de ses groupes ; dans une directe, `admin` lui donne le droit de retirer le message d'un agent, comme dans la Tour */
    let r;
    try { r = stockage.messageSupprimer({ conv, seq: b.seq, uid: t.justin, pour: 'tous', admin: true }); }
    catch (e) {
      if (e && (e.code === 'introuvable' || e.code === 'type' || e.code === 'interdit')) return res.json({ ok: true, deja: true, absent: true });
      throw e;
    }
    if (r.gid) { try { hub.reveiller({ conv }); } catch (e) {} }
    bilan.suppressions++;
    res.json({ ok: true, deja: r.deja === true });
  });

  return { bilan: () => Object.assign({}, bilan), table: lireTable };
}

module.exports = { pontConfig, gardePont, installerPont, ENTETE, MOTIFS, META_CLE, NOM_ESPACE, SYSTEME, LOT_MAX };
