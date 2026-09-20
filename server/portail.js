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
  function ajouterMsg(mail, de, texte) {
    const f = reg.f[mail] || (reg.f[mail] = []);
    f.push({ de: de === 'admin' ? 'admin' : 'client', t: borne(texte, MSG_MAX), ts: Date.now() });
    if (f.length > FIL_MAX) f.splice(0, f.length - FIL_MAX);
  }

  const dossierVue = (mail) => {
    const x = reg.d[mail];
    if (!x) return null;
    return { email: mail, prenom: x.pr || '', nom: x.no || '', societe: x.so || '',
      apps: x.ap || [], formule: x.fo || '', users: x.us || 0, etat: x.et || 'nouvelle',
      promo: x.promo || '', cree: x.cree || 0, maj: x.maj || 0 };
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
    const x = reg.d[mail] || (reg.d[mail] = { cree: Date.now(), et: 'nouvelle' });
    /* ⛔ LE CLIENT NE DÉCIDE PAS DE SON ÉTAT NI DE SA PROMO. C'est exactement la faute que ce
       dépôt a déjà payée sur `/api/clients/sync` : une valeur du CORPS décidait de ce qu'une
       entreprise avait payé. `et` et `promo` ne se posent que depuis la Tour. */
    if (b.prenom !== undefined) x.pr = borne(b.prenom, 60);
    if (b.nom !== undefined) x.no = borne(b.nom, 60);
    if (b.societe !== undefined) x.so = borne(b.societe, 120);
    if (Array.isArray(b.apps)) x.ap = b.apps.slice(0, 6).map(a => borne(a, 30));
    if (b.formule !== undefined) x.fo = borne(b.formule, 30);
    if (b.users !== undefined) x.us = Math.max(0, Math.min(9999, parseInt(b.users, 10) || 0));
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
    ajouterMsg(mail, 'admin', t);
    ecrire();
    res.json({ ok: true });
  });

  app.post('/api/monitor/portail/etat', admin, (req, res) => {
    const b = req.body || {};
    const mail = norm(b.email);
    const x = reg.d[mail];
    if (!x) return res.status(404).json({ error: 'dossier_inconnu' });
    if (b.etat !== undefined) x.et = borne(b.etat, 30);
    if (b.promo !== undefined) x.promo = borne(b.promo, 40);
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
      reg.d[mail] = { pr: borne(x.prenom, 60), no: borne(x.nom, 60), so: borne(x.company || x.societe, 120),
        ap: Array.isArray(x.apps) ? x.apps.slice(0, 6).map(a => borne(a, 30)) : [],
        fo: borne(x.formule, 30), us: parseInt(x.users, 10) || 0,
        et: borne(x.etat || 'nouvelle', 30), promo: borne(x.promo, 40),
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
