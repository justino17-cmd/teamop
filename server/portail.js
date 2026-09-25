/* ══ LE PORTAIL CLIENT, CHEZ NOUS ════════════════════════════════════════════════════════════
 *
 * `espace.html` est la seule page qui parle ENCORE à Firestore en direct : `teamop_requests`
 * (le dossier d'inscription), `teamop_threads/{uid}/msgs` (la conversation avec l'équipe) et
 * `teamop_news` (les annonces). ⚠️ La Tour, elle, n'a AUCUN Firebase — elle passe déjà par le
 * serveur, qui lit et écrit `teamop_requests` par l'API d'administration (`fbAdminFetch`).
 * Autrement dit : le serveur connaît déjà ces données. Ce fichier arrête juste de les ranger
 * chez Google.
 *
 * ⛔ LA CLÉ CHANGE, ET C'EST LE POINT QUI COÛTE. Chez Firebase, le dossier était rangé sous
 * l'`uid` du compte — une chaîne que Google fabrique et que nous ne savons pas recalculer. Ici
 * la clé est l'ADRESSE normalisée, celle de `comptes.js`. Un import depuis Firestore doit donc
 * TRADUIRE uid → adresse, et un dossier dont l'adresse est inconnue ne s'invente pas : il est
 * rapporté comme non repris, jamais rattaché au hasard.
 *
 * ⛔ IL NE RELIT PAS `comptes-portail.json` DE SON CÔTÉ. Savoir qui parle passe par
 * `comptes.parJeton` — deux lectures du même fichier, ce sont deux vérités qui divergent le
 * jour où l'une garde un jeton que l'autre a brûlé.
 */
'use strict';
const fs = require('fs'), path = require('path');

const borne = (x, n) => String(x == null ? '' : x).slice(0, n);
/* ⛔ UN DOSSIER EST LIBRE : IL NE DOIT PAS CHANGER LE TYPE DE CE QU'ON LUI DONNE. `borne`
   passe tout par `String()` — utile pour un texte, faux pour le reste : un `createdAt` numérique
   revenait en chaîne, et un `false` serait revenu en `'false'`, donc VRAI à la relecture. Le
   nombre et le booléen traversent tels quels (JSON ne porte ni NaN ni Infinity, mais on le
   vérifie quand même) ; tout le reste est un texte, et se borne. */
const valeur = (x, n) => (typeof x === 'boolean') ? x
  : (typeof x === 'number' && Number.isFinite(x)) ? x
  : borne(x, n);
const norm = (x) => String(x == null ? '' : x).trim().toLowerCase();
const mailOk = (x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x) && x.length <= 200;
/* ⛔ DES TABLES SANS PROTOTYPE, AUSSI APRÈS UNE RELECTURE (`gardien`, C6). `JSON.parse` rend des
   objets ORDINAIRES : après un redémarrage, `reg.d['__proto__']` désignait `Object.prototype`, et
   `/api/monitor/portail/etat` y écrivait les champs de la Tour — toute propriété absente de
   n'importe quel objet du processus prenait alors cette valeur. On recopie dans des tables nues,
   et on ne lit jamais une entrée sans `hasOwnProperty`. */
const table = (o) => { const t = Object.create(null); if (o && typeof o === 'object') for (const k of Object.keys(o)) t[k] = o[k]; return t; };
const a = (t, k) => Object.prototype.hasOwnProperty.call(t, k) ? t[k] : undefined;
/* Un nom de champ : court, sans rien qui désigne la mécanique des objets. */
const CLE_OK = (k) => /^[A-Za-z0-9_]{1,60}$/.test(k) && k !== '__proto__' && k !== 'constructor' && k !== 'prototype';
/* ⛔ UNE VALEUR BORNÉE EN PROFONDEUR ET EN POIDS (`gardien`, B2). Un sous-objet passait TEL QUEL :
   `express.json` accepte 6 Mo, donc chaque appel pouvait ajouter 6 Mo à un fichier commun que
   chaque écriture, de n'importe quel client, re-sérialise en bloquant le serveur. La profondeur
   s'arrête à quatre niveaux SANS descendre plus loin (pas de pile qui déborde), le poids se mesure
   sur la forme sérialisée. Rend la valeur bornée, ou `undefined` si elle est refusée. */
const VALEUR_MAX = 16000;
function profondeurOk(v, n) {
  if (n > 4) return false;
  if (Array.isArray(v)) { for (const x of v) if (!profondeurOk(x, n + 1)) return false; return true; }
  if (v && typeof v === 'object') { for (const k of Object.keys(v)) if (!profondeurOk(v[k], n + 1)) return false; return true; }
  return true;
}
function borneValeur(val) {
  if (Array.isArray(val)) val = val.slice(0, 40).map(y => (y && typeof y === 'object') ? y : valeur(y, 400));
  else if (!(val && typeof val === 'object')) return valeur(val, 600);
  if (!profondeurOk(val, 0)) return undefined;
  let txt = ''; try { txt = JSON.stringify(val); } catch (e) { return undefined; }
  return (txt && txt.length <= VALEUR_MAX) ? val : undefined;
}

function monterPortail(app, deps) {
  const d = deps || {};
  const DOSSIER = d.dossier;
  const parJeton = d.parJeton;                 // (brut) => email | ''
  const admin = d.admin;                       // middleware de la Tour
  const quotaOk = d.quotaOk || (() => true);
  const quota = new Map();
  const journal = d.journal || ((...a) => console.log('portail:', ...a));
  const MSG_MAX = 4000, FIL_MAX = 500, ACTUS_MAX = 100;
  /* ⛔ CE QU'UN COMPTE JAMAIS VÉRIFIÉ PEUT ENTASSER (`gardien`, B2). Créer un compte ne demande
     aucune preuve : sans bornes propres, mille comptes jetables rempliraient `portail.json`, que
     chaque écriture re-sérialise d'un bloc. Une adresse prouvée a de la place ; une adresse qui ne
     l'est pas en a assez pour déposer sa demande — et le nombre de ces dossiers est plafonné. */
  const DOSSIER_MAX = 64000, DOSSIER_MAX_NV = 16000, FIL_MAX_NV = 30, NV_MAX = 1000;
  /* `verifie(mail)` vient de `comptes.js`. Sans lui, personne n'est vérifié : le défaut prudent. */
  const verifie = (mail) => { try { return typeof d.verifie === 'function' && !!d.verifie(mail); } catch (e) { return false; } };
  /* Réservé au PATRON (`gardien`, C5) : ce qui écrit des comptes, décide d'un abonnement ou dépose
     un code d'accès. Sans garde patron fournie, la garde de la Tour s'applique — jamais aucune. */
  const patron = d.patron || d.admin;

  const CHEMIN = path.join(DOSSIER, 'portail.json');
  let reg = { d: Object.create(null), f: Object.create(null), a: [] };   // dossiers, fils, actus

  function lire() {
    try {
      const o = JSON.parse(fs.readFileSync(CHEMIN, 'utf8'));
      reg = { d: table(o && o.d), f: table(o && o.f), a: (o && Array.isArray(o.a)) ? o.a : [] };
    } catch (e) { /* premier démarrage */ }
  }
  /* Temporaire puis renommage, comme `espacesEcrire`. Tronqué, ce fichier fait disparaître les
     dossiers d'inscription de TOUS les prospects d'un coup. */
  function ecrire() {
    const tmp = CHEMIN + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(reg));
    fs.renameSync(tmp, CHEMIN);
  }
  lire();

  const porteur = (req) => {
    const m = /^Bearer\s+([A-Fa-f0-9]{64})$/.exec(String(req.headers['authorization'] || ''));
    return m ? m[1] : '';
  };
  const qui = (req) => { try { return parJeton(porteur(req)) || ''; } catch (e) { return ''; } };

  /* ⛔ LE FIL EST PLAFONNÉ, ET IL SE TRONQUE PAR LE DÉBUT. C'est la leçon de `db.journal` :
     un fil sans plafond grossit jusqu'à ce que le fichier entier devienne illisible, et c'est
     alors TOUS les clients qui perdent leur conversation, pas un. On garde les 500 derniers
     messages — largement au-delà d'un échange commercial, et borné pour toujours. */
  /* ⛔ `sup` PORTE LE CODE D'ACTIVATION D'UN ESPACE, ET SEULE LA TOUR PEUT LE POSER.
     `espace.html:1240` fait apparaître le bouton « 🚀 Activer mon espace » dès qu'un message
     porte `access` — c'est la seule porte d'entrée d'un client dans OP GESTION. Le laisser
     passer depuis le corps d'une requête CLIENT, ce serait laisser n'importe qui se fabriquer
     ce bouton dans son propre fil. C'est la règle déjà payée sur `/api/clients/sync` : une
     valeur du CORPS ne décide jamais d'un accès. Les deux appels clients n'ont donc que trois
     arguments, et le quatrième n'existe que sur la route `admin`. */
  function ajouterMsg(mail, de, texte, sup) {
    const f = a(reg.f, mail) || (reg.f[mail] = []);
    const m = { de: de === 'admin' ? 'admin' : 'client', t: borne(texte, MSG_MAX), ts: Date.now() };
    if (sup && sup.access) { m.access = borne(sup.access, 2000); m.accessName = borne(sup.accessName, 200); }
    f.push(m);
    const max = verifie(mail) ? FIL_MAX : FIL_MAX_NV;
    if (f.length > max) f.splice(0, f.length - max);
  }

  /* ⛔ LE DOSSIER EST LIBRE, SAUF CE QUI DÉCIDE DE L'ARGENT ET DE L'ACCÈS.
     Première conception : une liste FERMÉE de champs (prénom, nom, société, formule…). Le
     relevé d'`espace.html` l'a démenti — la page écrit aussi `plan`, `docs`, `demandes`,
     `tel`, l'adresse de facturation, le SIRET, la TVA… Une liste fermée aurait fait
     DISPARAÎTRE en silence tout ce qu'elle ne connaît pas, et personne ne l'aurait vu avant
     qu'un client réclame sa facture.
     On inverse donc : le dossier accepte ce qu'on lui donne, et une liste NOMMÉE de champs
     reste interdite au client. C'est la faute déjà payée sur `/api/clients/sync` — une
     valeur du CORPS décidait de l'abonnement — refermée par la seule voie qui tienne : dire
     ce qui appartient au SERVEUR, pas essayer de deviner tout ce qui appartient au client.
     ⚠ Ajouter un champ que la Tour pose → l'ajouter ICI, sinon le client pourra l'écrire.
     ⛔ `promo`, `promoUsed` ET `promoAlerte` N'Y SONT PLUS — ils y étaient, et c'était une panne
     silencieuse : `promoActivate` et l'alerte J-2 d'`espace.html` les écrivent dans le dossier
     du client, la route les ÉCARTAIT sans un mot, et l'activation d'un code depuis le portail
     n'allait nulle part (le relais `/api/clients/sync` lit `promo.code` dans le dossier). Ce sont
     des MIROIRS d'affichage, comme au temps de Firestore où le client les écrivait lui-même :
     l'autorité est ailleurs — le relais revérifie le code dans `config.promos`, CALCULE
     l'échéance depuis `p.mois` et ne l'accepte qu'une fois par entreprise (`promoPresente`), et
     c'est `espacePaye()` qui décide de l'accès. Un `until` forgé ne change que l'écran du client. */
  const CHAMPS_SERVEUR = ['status', 'etat', 'apps', 'plan', 'planStatus', 'planFin', 'docs',
    'venuDe', 'cree', 'maj'];

  const dossierDe = (mail) => a(reg.d, mail) || null;
  const dossierVue = (mail) => {
    const x = dossierDe(mail);
    if (!x) return null;
    return Object.assign({}, x, { email: mail });
  };
  /* ⛔ UN DOSSIER REPRIS DE GOOGLE NE SE MONTRE QU'À UNE ADRESSE PROUVÉE (`gardien`, B1). `preparer`
     remet déjà « à poser » tout compte non vérifié à l'import, et seul le lien reçu dans la boîte
     du client en rouvre un — cette garde-ci est la seconde serrure, pour le jour où l'ordre des
     gestes ne serait pas celui prévu. */
  const refusPortail = (mail) => {
    const x = dossierDe(mail);
    return (x && x.venuDe === 'firestore' && !verifie(mail)) ? 'adresse_non_verifiee' : '';
  };
  const nonVerifies = () => { let n = 0; for (const m of Object.keys(reg.d)) if (!verifie(m)) n++; return n; };

  /* ── CÔTÉ CLIENT ────────────────────────────────────────────────────────────────────────── */
  app.get('/api/portail/moi', (req, res) => {
    const mail = qui(req);
    if (!mail) return res.status(401).json({ error: 'session_refusee' });
    const refus = refusPortail(mail); if (refus) return res.status(403).json({ error: refus });
    return res.json({ ok: true, dossier: dossierVue(mail) });
  });

  app.post('/api/portail/demande', (req, res) => {
    const mail = qui(req);
    if (!mail) return res.status(401).json({ error: 'session_refusee' });
    const refus = refusPortail(mail); if (refus) return res.status(403).json({ error: refus });
    if (!quotaOk(quota, 'dem:' + mail, 30, 3600000)) return res.status(429).json({ error: 'trop_de_demandes' });
    const b = req.body || {};
    const sur = verifie(mail);
    if (!dossierDe(mail) && !sur && nonVerifies() >= NV_MAX) {
      journal('dossier refusé : plafond des adresses non vérifiées atteint');
      return res.status(503).json({ error: 'capacite' });
    }
    /* On travaille sur une COPIE : un dossier refusé pour son poids ne doit rien laisser derrière. */
    const x = Object.assign({}, dossierDe(mail) || { cree: Date.now(), etat: 'nouvelle' });
    /* On recopie ce que le client envoie, SAUF les champs du serveur. Chaque valeur est bornée
       — un dossier ne doit pas pouvoir peser un mégaoctet, le fichier est commun à tous. */
    let poses = 0;
    for (const k of Object.keys(b)) {
      if (k === 'message' || k === 'email' || !CLE_OK(k)) continue;
      if (CHAMPS_SERVEUR.indexOf(k) >= 0) continue;
      if (poses++ > 60) break;                        // borne le NOMBRE de champs, pas que leur taille
      const val = borneValeur(b[k]);
      if (val === undefined) return res.status(413).json({ error: 'champ_trop_gros', champ: k });
      x[k] = val;
    }
    x.maj = Date.now();
    let poids = 0; try { poids = JSON.stringify(x).length; } catch (e) { poids = Infinity; }
    if (poids > (sur ? DOSSIER_MAX : DOSSIER_MAX_NV)) return res.status(413).json({ error: 'dossier_trop_gros' });
    reg.d[mail] = x;
    if (b.message) ajouterMsg(mail, 'client', b.message);
    ecrire();
    return res.json({ ok: true, dossier: dossierVue(mail) });
  });

  app.get('/api/portail/messages', (req, res) => {
    const mail = qui(req);
    if (!mail) return res.status(401).json({ error: 'session_refusee' });
    const refus = refusPortail(mail); if (refus) return res.status(403).json({ error: refus });
    return res.json({ ok: true, messages: (a(reg.f, mail) || []).slice(-200) });
  });

  app.post('/api/portail/message', (req, res) => {
    const mail = qui(req);
    if (!mail) return res.status(401).json({ error: 'session_refusee' });
    const refus = refusPortail(mail); if (refus) return res.status(403).json({ error: refus });
    if (!quotaOk(quota, 'msg:' + mail, 60, 3600000)) return res.status(429).json({ error: 'trop_de_messages' });
    if (!a(reg.f, mail) && !verifie(mail) && Object.keys(reg.f).filter(m => !verifie(m)).length >= NV_MAX) {
      journal('message refusé : plafond des adresses non vérifiées atteint');
      return res.status(503).json({ error: 'capacite' });
    }
    const t = borne((req.body || {}).texte, MSG_MAX);
    if (!t.trim()) return res.status(400).json({ error: 'texte_vide' });
    ajouterMsg(mail, 'client', t);
    ecrire();
    return res.json({ ok: true });
  });

  /* Les annonces sont publiques par nature — elles s'affichent sur la page d'accueil du
     portail, avant même qu'on se connecte. Rien de personnel n'y entre. */
  app.get('/api/portail/actus', (req, res) => res.json({ ok: true, actus: reg.a.slice(0, 30) }));

  /* ── CÔTÉ TOUR ──────────────────────────────────────────────────────────────────────────── */
  /* La Tour voit, pour chaque dossier, si l'adresse a été PROUVÉE : c'est ce qui dit si elle parle
     au client ou à quelqu'un qui a seulement tapé son adresse. */
  app.get('/api/monitor/portail/demandes', admin, (req, res) => {
    const l = Object.keys(reg.d).map(m => { const v = dossierVue(m); if (v) v.verifie = verifie(m); return v; })
      .filter(Boolean).sort((a, b) => (b.maj || 0) - (a.maj || 0));
    res.json({ ok: true, demandes: l });
  });

  app.get('/api/monitor/portail/fil', admin, (req, res) => {
    const mail = norm(req.query.email);
    if (!mailOk(mail)) return res.status(400).json({ error: 'email_invalide' });
    res.json({ ok: true, email: mail, messages: (a(reg.f, mail) || []).slice(-200), verifie: verifie(mail) });
  });

  /* ⛔ UN CODE D'ACCÈS NE PART QU'À UNE ADRESSE PROUVÉE, ET SEUL LE PATRON L'ENVOIE (`gardien`,
     C4-C5). `access` fait apparaître « 🚀 Activer mon espace » : c'est l'entrée d'un client dans
     OP GESTION. Déposé dans le fil d'un compte que n'importe qui a pu créer avec l'adresse d'un
     autre, il ouvrait l'espace à ce quelqu'un. Un message sans code, lui, reste à la Tour. */
  app.post('/api/monitor/portail/message', admin, (req, res, next) => {
    const b = req.body || {};
    if (b.access) return patron(req, res, next);
    return next();
  }, (req, res) => {
    const b = req.body || {};
    const mail = norm(b.email);
    const t = borne(b.texte, MSG_MAX);
    if (!mailOk(mail) || !t.trim()) return res.status(400).json({ error: 'email_et_texte_requis' });
    if (b.access && !verifie(mail)) return res.status(409).json({ error: 'adresse_non_verifiee' });
    ajouterMsg(mail, 'admin', t, { access: b.access, accessName: b.accessName });
    ecrire();
    res.json({ ok: true });
  });

  app.post('/api/monitor/portail/etat', patron, (req, res) => {
    const b = req.body || {};
    const mail = norm(b.email);
    if (!mailOk(mail)) return res.status(400).json({ error: 'email_invalide' });
    const x = dossierDe(mail);
    if (!x) return res.status(404).json({ error: 'dossier_inconnu' });
    /* La Tour, elle, pose EXACTEMENT les champs que le client ne peut pas. */
    for (const k of CHAMPS_SERVEUR) {
      if (k === 'cree' || k === 'maj' || k === 'venuDe') continue;
      if (b[k] !== undefined) x[k] = Array.isArray(b[k]) ? b[k].slice(0, 40).map(y => valeur(y, 400)) : valeur(b[k], 400);
    }
    x.maj = Date.now(); ecrire();
    res.json({ ok: true, dossier: dossierVue(mail) });
  });

  app.post('/api/monitor/portail/actu', admin, (req, res) => {
    const b = req.body || {};
    const t = borne(b.titre, 140);
    if (!t.trim()) return res.status(400).json({ error: 'titre_requis' });
    reg.a.unshift({ id: 'a' + Date.now().toString(36), titre: t, texte: borne(b.texte, 2000),
      tag: borne(b.tag, 30), url: borne(b.url, 300), ts: Date.now() });
    if (reg.a.length > ACTUS_MAX) reg.a.length = ACTUS_MAX;
    ecrire();
    res.json({ ok: true });
  });

  app.post('/api/monitor/portail/actu/supprimer', admin, (req, res) => {
    const id = borne((req.body || {}).id, 40);
    const n = reg.a.length;
    reg.a = reg.a.filter(x => x.id !== id);
    ecrire();
    res.json({ ok: true, retirees: n - reg.a.length });
  });

  /* ── L'IMPORT DEPUIS FIRESTORE, UNE FOIS ────────────────────────────────────────────────── */
  app.post('/api/monitor/portail/importer', patron, async (req, res) => {
    if (typeof d.lireFirestore !== 'function') return res.status(503).json({ error: 'firebase_off' });
    let venus;
    try { venus = await d.lireFirestore(); }
    catch (e) {
      /* ⛔ UN REFUS QUI NE NOMME PAS SA RAISON FAIT CHERCHER AU MAUVAIS ENDROIT. C'est la
         leçon payée le même jour sur `firebase-console.js` : « REFUSÉ (403) » écrit en dur a
         fait ajouter deux rôles pour rien. Ici, « Firebase est éteint » (attendu, c'est le but
         du chantier) et « la lecture a cassé » (à regarder) ne se soignent pas pareil.
         Le motif vient de l'exception ; on ne le devine pas, et on ne le remplace pas. */
      const motif = String((e && e.code) || 'lecture_impossible');
      journal('import impossible —', motif);
      return res.status(503).json({ error: motif });
    }

    /* ⛔ LES COMPTES D'ABORD, LES DOSSIERS ENSUITE (`gardien`, B1). Chaque adresse reprise reçoit
       son compte « à poser » (`preparer`, comptes.js), et un compte déjà là mais jamais vérifié
       y redevient : un dossier repris ne doit jamais se montrer à quelqu'un qui a seulement tapé
       l'adresse. `douteux` : les adresses dont le compte n'était pas sûr au moment de l'import. */
    const src = (x) => (x && x.champs && typeof x.champs === 'object') ? x.champs : (x || {});
    const pr = typeof d.preparer === 'function'
      ? d.preparer((venus || []).map(x => { const c = src(x); return { email: norm(x && x.email),
          prenom: c.prenom, nom: c.nom, societe: c.company || c.societe }; }).filter(x => mailOk(x.email)))
      : null;
    const prepares = pr ? (typeof pr === 'number' ? pr : (pr.prepares || 0)) : 0;
    const remis = (pr && pr.remis) || 0;
    const douteux = new Set((pr && pr.douteux) || []);
    /* ⛔ ON N'ÉCRASE JAMAIS UN DOSSIER QUE SON PROPRIÉTAIRE A POSÉ. L'import peut se relancer — après
       une coupure, après un doute — et il ne doit pas effacer ce qu'un client a saisi depuis :
       c'est la règle de `saveBox`, on part du VIVANT. Un dossier posé AVANT l'import par un compte
       jamais vérifié n'est pas « le vivant » : c'est peut-être celui d'un tiers, qui aurait sinon
       fait écarter le vrai dossier de Google (`gardien`, B1, variante). Il est remplacé, et son
       fil part avec lui. Un dossier déjà repris de Google, lui, ne se reprend pas deux fois. */
    let repris = 0, ignores = 0, sansAdresse = 0, remplaces = 0, champsRefuses = 0;
    for (const x of (venus || [])) {
      const mail = norm(x && x.email);
      /* Un dossier sans adresse ne se rattache pas au hasard : l'`uid` de Google n'est pas
         recalculable de notre côté, donc on le RAPPORTE plutôt que de le deviner. */
      if (!mailOk(mail)) { sansAdresse++; continue; }
      const local = dossierDe(mail);
      if (local && (local.venuDe === 'firestore' || !douteux.has(mail))) { ignores++; continue; }
      /* TOUT le dossier de Google, pas une liste choisie : la facturation, les demandes, la formule,
         les documents, l'offre en cours. Une liste fermée faisait disparaître en silence ce qu'elle
         ne connaissait pas — la leçon écrite plus haut sur `CHAMPS_SERVEUR`. Mêmes bornes que ce que
         le client dépose lui-même ; les champs du serveur y compris, parce qu'ils viennent de
         l'histoire du client et pas du corps d'une requête. */
      const c = src(x), dos = {};
      for (const k of Object.keys(c)) {
        if (k === 'email' || k === 'uid' || !CLE_OK(k)) continue;
        const val = borneValeur(c[k]);
        if (val === undefined) { champsRefuses++; continue; }
        dos[k] = val;
      }
      if (c.societe && !dos.company) dos.company = borne(c.societe, 120);
      dos.etat = borne(dos.etat || 'nouvelle', 30);
      dos.cree = parseInt(c.cree || c.createdAt, 10) || Date.now();
      dos.maj = Date.now(); dos.venuDe = 'firestore';
      let poids = 0; try { poids = JSON.stringify(dos).length; } catch (e) { poids = Infinity; }
      if (poids > DOSSIER_MAX) { for (const k of ['docs', 'demandes', 'promoUsed']) { if (poids <= DOSSIER_MAX) break; if (dos[k]) { delete dos[k]; champsRefuses++; try { poids = JSON.stringify(dos).length; } catch (e) {} } } }
      if (local) { remplaces++; delete reg.f[mail]; }
      reg.d[mail] = dos;
      repris++;
    }
    ecrire();
    journal('import : ' + repris + ' repris (' + remplaces + ' remplaçant un dossier non vérifié), ' + ignores + ' déjà là, '
      + sansAdresse + ' sans adresse, ' + prepares + ' compte(s) à poser, ' + remis + ' compte(s) non vérifié(s) remis à poser, '
      + champsRefuses + ' champ(s) trop gros');
    return res.json({ ok: true, repris, ignores, sansAdresse, remplaces, champsRefuses,
      comptesPrepares: prepares, comptesRemis: remis, total: (venus || []).length });
  });

  /* ⛔ CE QUE LE SERVEUR DIT DU CLIENT S'ÉCRIT ICI, PLUS CHEZ GOOGLE. `fbMajFicheClient`
     (`index.js`) posait « accès activé », la formule et l'échéance dans `teamop_requests` : après
     la bascule, le portail lit ce fichier, et un client qui venait de payer aurait continué de
     voir son ancien état. Seuls les champs du SERVEUR passent ; un dossier absent est créé. */
  function majServeur(mail, champs) {
    const m = norm(mail); if (!mailOk(m)) return false;
    const x = Object.assign({}, dossierDe(m) || { cree: Date.now(), etat: 'nouvelle' });
    for (const k of Object.keys(champs || {})) {
      if (CHAMPS_SERVEUR.indexOf(k) < 0 || k === 'cree' || k === 'maj' || k === 'venuDe') continue;
      const v = champs[k];
      x[k] = Array.isArray(v) ? v.slice(0, 40).map(y => valeur(y, 400)) : valeur(v, 400);
    }
    x.maj = Date.now(); reg.d[m] = x;
    try { ecrire(); return true; } catch (e) { journal('dossier non écrit —', e.code || 'erreur'); return false; }
  }
  /* Le dossier ET le fil : ce que « supprimer un compte du site » doit emporter chez nous. */
  function supprimer(mail) {
    const m = norm(mail); let fait = false;
    if (a(reg.d, m)) { delete reg.d[m]; fait = true; }
    if (a(reg.f, m)) { delete reg.f[m]; fait = true; }
    if (fait) ecrire();
    return fait;
  }

  return {
    majServeur, supprimer, dossierDe: (m) => dossierDe(norm(m)),
    dossiers: () => Object.keys(reg.d).length,
    fils: () => Object.keys(reg.f).length,
    actus: () => reg.a.length,
    _reg: () => reg, _relire: lire,
  };
}

module.exports = { monterPortail };
