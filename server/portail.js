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

function monterPortail(app, deps) {
  const d = deps || {};
  const DOSSIER = d.dossier;
  const parJeton = d.parJeton;                 // (brut) => email | ''
  const admin = d.admin;                       // middleware de la Tour
  const quotaOk = d.quotaOk || (() => true);
  const quota = new Map();
  const journal = d.journal || ((...a) => console.log('portail:', ...a));
  const MSG_MAX = 4000, FIL_MAX = 500, ACTUS_MAX = 100;

  const CHEMIN = path.join(DOSSIER, 'portail.json');
  let reg = { d: Object.create(null), f: Object.create(null), a: [] };   // dossiers, fils, actus

  function lire() {
    try {
      const o = JSON.parse(fs.readFileSync(CHEMIN, 'utf8'));
      reg = { d: (o && o.d) || Object.create(null), f: (o && o.f) || Object.create(null), a: (o && o.a) || [] };
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
    const f = reg.f[mail] || (reg.f[mail] = []);
    const m = { de: de === 'admin' ? 'admin' : 'client', t: borne(texte, MSG_MAX), ts: Date.now() };
    if (sup && sup.access) { m.access = borne(sup.access, 2000); m.accessName = borne(sup.accessName, 200); }
    f.push(m);
    if (f.length > FIL_MAX) f.splice(0, f.length - FIL_MAX);
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
     ⚠ Ajouter un champ que la Tour pose → l'ajouter ICI, sinon le client pourra l'écrire. */
  const CHAMPS_SERVEUR = ['status', 'etat', 'apps', 'plan', 'planStatus', 'docs',
    'promo', 'promoUsed', 'promoAlerte', 'venuDe', 'cree', 'maj'];

  const dossierVue = (mail) => {
    const x = reg.d[mail];
    if (!x) return null;
    return Object.assign({}, x, { email: mail });
  };

  /* ── CÔTÉ CLIENT ────────────────────────────────────────────────────────────────────────── */
  app.get('/api/portail/moi', (req, res) => {
    const mail = qui(req);
    if (!mail) return res.status(401).json({ error: 'session_refusee' });
    return res.json({ ok: true, dossier: dossierVue(mail) });
  });

  app.post('/api/portail/demande', (req, res) => {
    const mail = qui(req);
    if (!mail) return res.status(401).json({ error: 'session_refusee' });
    if (!quotaOk(quota, 'dem:' + mail, 30, 3600000)) return res.status(429).json({ error: 'trop_de_demandes' });
    const b = req.body || {};
    const x = reg.d[mail] || (reg.d[mail] = { cree: Date.now(), etat: 'nouvelle' });
    /* On recopie ce que le client envoie, SAUF les champs du serveur. Chaque valeur est bornée
       — un dossier ne doit pas pouvoir peser un mégaoctet, le fichier est commun à tous. */
    let poses = 0;
    for (const k of Object.keys(b)) {
      if (k === 'message' || k === 'email') continue;
      if (CHAMPS_SERVEUR.indexOf(k) >= 0) continue;
      if (poses++ > 60) break;                        // borne le NOMBRE de champs, pas que leur taille
      const val = b[k];
      if (Array.isArray(val)) x[k] = val.slice(0, 40).map(y => (y && typeof y === 'object') ? y : valeur(y, 400));
      else if (val && typeof val === 'object') x[k] = val;   // un sous-objet (facturation) passe tel quel
      else x[k] = valeur(val, 600);
    }
    x.maj = Date.now();
    if (b.message) ajouterMsg(mail, 'client', b.message);
    ecrire();
    return res.json({ ok: true, dossier: dossierVue(mail) });
  });

  app.get('/api/portail/messages', (req, res) => {
    const mail = qui(req);
    if (!mail) return res.status(401).json({ error: 'session_refusee' });
    return res.json({ ok: true, messages: (reg.f[mail] || []).slice(-200) });
  });

  app.post('/api/portail/message', (req, res) => {
    const mail = qui(req);
    if (!mail) return res.status(401).json({ error: 'session_refusee' });
    if (!quotaOk(quota, 'msg:' + mail, 60, 3600000)) return res.status(429).json({ error: 'trop_de_messages' });
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
  app.get('/api/monitor/portail/demandes', admin, (req, res) => {
    const l = Object.keys(reg.d).map(dossierVue).filter(Boolean).sort((a, b) => (b.maj || 0) - (a.maj || 0));
    res.json({ ok: true, demandes: l });
  });

  app.get('/api/monitor/portail/fil', admin, (req, res) => {
    const mail = norm(req.query.email);
    res.json({ ok: true, email: mail, messages: (reg.f[mail] || []).slice(-200) });
  });

  app.post('/api/monitor/portail/message', admin, (req, res) => {
    const mail = norm((req.body || {}).email);
    const t = borne((req.body || {}).texte, MSG_MAX);
    if (!mail || !t.trim()) return res.status(400).json({ error: 'email_et_texte_requis' });
    ajouterMsg(mail, 'admin', t, { access: (req.body || {}).access, accessName: (req.body || {}).accessName });
    ecrire();
    res.json({ ok: true });
  });

  app.post('/api/monitor/portail/etat', admin, (req, res) => {
    const b = req.body || {};
    const mail = norm(b.email);
    const x = reg.d[mail];
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
  app.post('/api/monitor/portail/importer', admin, async (req, res) => {
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

    /* ⛔ ON N'ÉCRASE JAMAIS UN DOSSIER DÉJÀ LOCAL. L'import peut se relancer — après une
       coupure, après un doute — et il ne doit pas effacer ce qu'un client a saisi depuis.
       C'est la même règle que `saveBox` : on part du VIVANT et on ne pose que ce qui manque. */
    let repris = 0, ignores = 0, sansAdresse = 0;
    for (const x of (venus || [])) {
      const mail = norm(x && x.email);
      /* Un dossier sans adresse ne se rattache pas au hasard : l'`uid` de Google n'est pas
         recalculable de notre côté, donc on le RAPPORTE plutôt que de le deviner. */
      if (!mail) { sansAdresse++; continue; }
      if (reg.d[mail]) { ignores++; continue; }
      reg.d[mail] = { prenom: borne(x.prenom, 60), nom: borne(x.nom, 60),
        company: borne(x.company || x.societe, 120),
        apps: Array.isArray(x.apps) ? x.apps.slice(0, 6).map(a => borne(a, 30)) : [],
        formule: borne(x.formule, 30), users: parseInt(x.users, 10) || 0,
        etat: borne(x.etat || 'nouvelle', 30), promo: borne(x.promo, 40),
        cree: parseInt(x.cree, 10) || Date.now(), maj: Date.now(), venuDe: 'firestore' };
      repris++;
    }
    ecrire();
    journal('import : ' + repris + ' repris, ' + ignores + ' déjà là, ' + sansAdresse + ' sans adresse');
    return res.json({ ok: true, repris, ignores, sansAdresse, total: (venus || []).length });
  });

  return {
    dossiers: () => Object.keys(reg.d).length,
    fils: () => Object.keys(reg.f).length,
    actus: () => reg.a.length,
    _reg: () => reg, _relire: lire,
  };
}

module.exports = { monterPortail };
