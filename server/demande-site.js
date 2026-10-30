/* LES DEMANDES « CRÉER VOTRE APPLICATION » DU SITE (30 octobre 2026).

   Un client a rempli le formulaire de teamop.fr : rien n'est arrivé, ni dans la Tour ni dans les courriels. La page n'envoyait RIEN au serveur, elle ouvrait
   le logiciel de courrier du visiteur (`mailto:`) : sans logiciel configuré, ou sans clic sur « Envoyer », la demande était perdue en silence pendant que
   la page laissait croire qu'elle était partie. Ici, la page envoie la demande à CE module, qui la range sur disque et PRÉVIENT Justin.

   ⛔ UNE DEMANDE EST UNE DEMANDE. Aucune valeur du corps ne décide de quoi que ce soit de payé ou d'ouvert : rien n'est créé, aucun code promo n'est lu, aucun
      espace n'est touché. C'est Justin qui la traite dans la Tour (« Demandes » → « Demande du site »), comme celles des comptes du portail.
   ⛔ « 200 {ok:true} » VEUT DIRE « C'EST ÉCRIT SUR DISQUE » : écriture par fichier temporaire + renommage, relue par la route de la Tour. Une écriture qui échoue répond
      503 (la page propose alors le courriel de secours) ; jamais un 200 de politesse. Seul le champ piège (`site_web`, que seul un robot remplit) rend 200 sans rien écrire.
   ⛔ UN REGISTRE ILLISIBLE AU DÉMARRAGE N'EST JAMAIS RÉÉCRIT PAR-DESSUS (on perdrait les demandes d'avant) : la route répond 503 et la Tour le dit.
   ⛔ AUCUNE DONNÉE PERSONNELLE DANS LES JOURNAUX : ni adresse, ni téléphone, ni nom. Le courriel à Justin, lui, les porte (c'est son métier) ; la notification du
      téléphone et le message d'OP MESSAGES ne disent que l'entreprise et les métiers. L'adresse IP ne sert qu'à l'anti-abus, EN MÉMOIRE (`req.ip`, jamais l'en-tête
      brut), et n'est pas écrite.
   Anti-abus : un budget par adresse IP (compté dès l'arrivée, AVANT de lire le corps), un par adresse de courriel, un pour tout le site ; corps de 24 Ko au plus ;
   champ piège ; une même demande répétée dans les dix minutes (double clic) n'est pas rangée deux fois. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const F = 'demandes-site.json';
const MAX_DEMANDES = 3000;
const CORPS_MAX = '24kb';
const QUOTA_IP = 6, QUOTA_MAIL = 3, QUOTA_GLOBAL = 120, FENETRE = 3600000;
const DOUBLON_MS = 10 * 60000;
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;
const FORBIDDEN = ['__proto__', 'constructor', 'prototype'];
const MAIL_RE = /^[^\s@<>"',;:()\[\]\\]{1,64}@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
const TEL_RE = /^[0-9 +().\-\/]{6,30}$/;

/* un texte libre : une chaîne (jamais un objet), sans caractère de contrôle, sur une ligne si `ligne`, borné */
function texte(v, max, ligne) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') return null;
  let t = v.replace(CTRL, ' ');
  t = ligne ? t.replace(/[\r\n\t]+/g, ' ') : t.replace(/\r\n?/g, '\n');
  t = t.replace(/[ ]{2,}/g, ' ').trim();
  return t.length > max ? t.slice(0, max) : t;
}

/* La demande telle que la page l'envoie → { ok:true, demande } ou { ok:false, error }.
   `choisir(metier, cats, variante, metiers)` est `choixAbonnement` du serveur : les MÊMES règles que `/api/clients/sync` (métiers ouverts, 3 au plus, la 3D seule,
   variante réservée au chauffage, rubriques d'une liste fermée). */
function valider(b, choisir, catsAvecBase) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, error: 'forme' };
  for (const k of FORBIDDEN) if (Object.prototype.hasOwnProperty.call(b, k)) return { ok: false, error: 'forme' };
  const champs = { nom: [60, true], prenom: [60, true], entreprise: [100, true], equipe: [60, true], message: [1500, false] };
  const d = {};
  for (const k of Object.keys(champs)) { const t = texte(b[k], champs[k][0], champs[k][1]); if (t === null) return { ok: false, error: 'forme', champ: k }; d[k] = t; }
  const em = texte(b.email, 120, true);
  if (em === null || !em || !MAIL_RE.test(em)) return { ok: false, error: 'email_invalide' };
  d.email = em.toLowerCase();
  const tel = texte(b.tel, 30, true);
  if (tel === null || (tel && !TEL_RE.test(tel))) return { ok: false, error: 'tel_invalide' };
  d.tel = tel;
  if (!Array.isArray(b.metiers) || !b.metiers.length) return { ok: false, error: 'metier_requis' };
  if (b.metiers.length > 3 || b.metiers.some(k => typeof k !== 'string' || !/^[a-z0-9]{1,20}$/.test(k))) return { ok: false, error: 'metiers_invalides' };
  let variante = b.variante;
  if (variante === '' || variante === null) variante = undefined;
  if (variante !== undefined && typeof variante !== 'string') return { ok: false, error: 'variante_inconnue' };
  if (b.cats !== undefined && b.cats !== null && !Array.isArray(b.cats)) return { ok: false, error: 'cats_inconnues' };
  const c = choisir(b.metiers[0], b.cats, variante, b.metiers);
  if (!c.ok) return { ok: false, error: c.error || 'metiers_invalides' };
  d.metier = b.metiers[0];
  d.metiers = b.metiers.slice();
  d.variante = c.variante || null;
  d.cats = c.cats || null;
  if (b.besoins !== undefined && b.besoins !== null) {
    if (!Array.isArray(b.besoins) || b.besoins.length > 10) return { ok: false, error: 'besoins_invalides' };
    d.besoins = [];
    for (const x of b.besoins) { const t = texte(x, 80, true); if (t === null) return { ok: false, error: 'besoins_invalides' }; if (t) d.besoins.push(t); }
  } else d.besoins = [];
  return { ok: true, demande: d };
}

module.exports = function monterDemandeSite(app, ctx) {
  const { DATA_DIR, monAdmin, express, quotaOk, choisir, catsAvecBase, surDemande } = ctx;
  const chemin = path.join(DATA_DIR, F);
  let liste = [], illisible = false;
  try {
    if (fs.existsSync(chemin)) { const j = JSON.parse(fs.readFileSync(chemin, 'utf8')); if (!j || !Array.isArray(j.l)) throw new Error('forme'); liste = j.l.filter(x => x && typeof x === 'object' && typeof x.id === 'string'); }
  } catch (e) { illisible = true; console.error('demandes-site.json illisible — rien ne sera écrit par-dessus, la route répond 503'); }

  /* écriture par fichier temporaire puis renommage ; rend vrai SEULEMENT si c'est sur disque (le jeu de données n'est remplacé en mémoire qu'alors) */
  function ecrire(nouvelle) {
    try {
      const tmp = chemin + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({ v: 1, l: nouvelle }), { mode: 0o600 });
      fs.renameSync(tmp, chemin);
      liste = nouvelle;
      return true;
    } catch (e) { console.error('demandes-site.json non écrit :', (e && e.code) || 'erreur disque'); return false; }
  }

  const qIp = new Map(), qMail = new Map(), qGlobal = new Map();
  const nettoyer = () => { for (const m of [qIp, qMail]) if (m.size > 5000) m.clear(); };
  const analyseur = express.json({ limit: CORPS_MAX });

  /* 1. le budget, AVANT de lire le corps : un inconnu ne fait pas lire 24 Ko à répétition pour rien */
  const budget = (req, res, next) => {
    nettoyer();
    if (!quotaOk(qGlobal, 'g', QUOTA_GLOBAL, FENETRE) || !quotaOk(qIp, 'ip:' + (req.ip || '?'), QUOTA_IP, FENETRE)) return res.status(429).json({ error: 'trop_de_demandes' });
    next();
  };
  /* 2. le corps : JSON, 24 Ko ; un corps cassé ou trop gros est une forme invalide, pas une panne */
  const corps = (req, res, next) => analyseur(req, res, err => {
    if (err) return res.status(err.type === 'entity.too.large' ? 413 : 400).json({ error: err.type === 'entity.too.large' ? 'trop_gros' : 'forme' });
    next();
  });

  app.post('/api/site/demande', budget, corps, (req, res) => {
    const b = req.body;
    /* le champ piège : un humain ne le voit pas (hors écran, hors tabulation) ; un robot le remplit. On répond comme si de rien n'était, et on n'écrit rien. */
    if (b && typeof b === 'object' && typeof b.site_web === 'string' && b.site_web.trim()) return res.json({ ok: true, muted: true });
    const v = valider(b, choisir, catsAvecBase);
    if (!v.ok) return res.status(400).json({ error: v.error });
    if (illisible) return res.status(503).json({ error: 'indisponible' });
    const d = v.demande;
    if (!quotaOk(qMail, 'm:' + d.email, QUOTA_MAIL, FENETRE)) return res.status(429).json({ error: 'trop_de_demandes' });
    const empreinte = crypto.createHash('sha256').update(JSON.stringify([d.email, d.metiers, d.variante, d.cats, d.entreprise, d.message])).digest('hex').slice(0, 16);
    const maintenant = Date.now();
    if (liste.some(x => x.empreinte === empreinte && maintenant - x.ts < DOUBLON_MS)) return res.json({ ok: true, doublon: true });   // déjà écrite : un double clic ne fait pas deux demandes
    let base = liste;
    if (base.length >= MAX_DEMANDES) {
      /* plein : on retire d'abord les plus anciennes TRAITÉES ; s'il n'y en a plus, on refuse (503) plutôt que d'effacer une demande à traiter */
      const i = base.findIndex(x => x.traitee);
      if (i < 0) return res.status(503).json({ error: 'plein' });
      base = base.slice(0, i).concat(base.slice(i + 1));
    }
    const enr = Object.assign({ id: crypto.randomBytes(8).toString('hex'), ts: maintenant, empreinte, traitee: null }, d);
    if (!ecrire(base.concat([enr]))) return res.status(503).json({ error: 'non_ecrite' });
    res.json({ ok: true });
    /* l'alerte vient APRÈS la réponse et ne jette jamais : la demande est écrite, c'est ce qui compte */
    try { Promise.resolve(surDemande && surDemande(enr)).catch(e => console.error('demande du site : alerte non partie —', String((e && e.message) || e).replace(/\S+@\S+/g, '·').slice(0, 120))); }
    catch (e) { console.error('demande du site : alerte non partie'); }
  });

  /* la Tour (patron ET collaborateurs, comme /api/monitor/clients) */
  app.get('/api/monitor/demandes-site', monAdmin, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'registre illisible' });
    res.json({ demandes: liste.slice().sort((a, b) => b.ts - a.ts).map(x => { const o = Object.assign({}, x); delete o.empreinte; return o; }), total: liste.length });
  });
  app.post('/api/monitor/demandes-site/traiter', monAdmin, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'registre illisible' });
    const b = req.body || {};
    const id = typeof b.id === 'string' ? b.id.slice(0, 40) : '';
    const i = liste.findIndex(x => x.id === id);
    if (i < 0) return res.status(404).json({ error: 'demande introuvable' });
    const nouvelle = liste.slice();
    nouvelle[i] = Object.assign({}, liste[i], { traitee: b.traite === false ? null : { par: String((req.tourUser && req.tourUser.nom) || '').slice(0, 60), ts: Date.now() } });
    if (!ecrire(nouvelle)) return res.status(503).json({ error: 'non écrite' });
    res.json({ ok: true });
  });

  return { valider: b => valider(b, choisir, catsAvecBase), nombre: () => liste.length };
};
module.exports.valider = valider;
