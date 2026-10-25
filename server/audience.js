/* L'AUDIENCE DU SITE (25 octobre 2026) — combien de visites, quelles pages, d'où viennent les gens, en direct.
 *
 * Justin : « le nombre de personnes qui a cliqué sur les liens, comment ils sont venus, par quel site […] en temps réel, un peu comme
 * BabyLoveGrowth ». Google Analytics est déjà posé (`/cookies.js`), mais il ne compte que ceux qui cliquent « Accepter » : souvent moins
 * de la moitié. Ce module compte TOUT LE MONDE, parce qu'il ne garde rien qui désigne une personne.
 *
 * ⛔ LES CONDITIONS DE LA CNIL POUR SE PASSER DU CONSENTEMENT (« Cookies : solutions pour les outils de mesure d'audience ») — cumulatives :
 *    · finalité limitée à la mesure d'audience du site, pour le compte de TEAM OP seul : rien ne sort d'ici, sauf vers la Tour (patron) ;
 *    · statistiques anonymes : on ne garde que des COMPTEURS par jour (pages, sources, campagnes, type d'écran). Ni adresse IP, ni
 *      identifiant, ni cookie, ni adresse complète de la page d'où l'on vient (on n'en garde que le NOM DE DOMAINE, réduit à une source) ;
 *    · aucun recoupement avec un autre traitement, aucun suivi d'un site à l'autre ;
 *    · conservation : 25 mois au plus (`GARDE_JOURS`), comme le recommande la CNIL.
 *    L'adresse IP ne sert qu'à l'anti-abus, EN MÉMOIRE (comme partout dans ce serveur, `req.ip` et jamais un en-tête du client) ; elle
 *    n'est jamais écrite. `confidentialite.html` § 2 le dit : les deux bougent ensemble.
 * ⛔ UNE « VISITE » SANS IDENTIFIANT : une page vue dont la page précédente n'est PAS teamop.fr (on arrive de Google, d'un courriel, d'un
 *    favori…). Une navigation à l'intérieur du site ajoute une page vue, pas une visite. C'est une estimation honnête, pas un comptage de
 *    personnes : la Tour l'écrit ainsi.
 * ⛔ TROIS ÉTATS, comme partout dans la Tour : un registre illisible au démarrage n'est JAMAIS réécrit par-dessus (on perdrait 25 mois
 *    de chiffres) et la route répond 503 — jamais « aucune visite ».
 * Le temps réel (les 30 dernières minutes) ne vit qu'en mémoire : un redémarrage le vide, et c'est voulu (rien de fin n'est écrit).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const F = 'audience.json';
const GARDE_JOURS = 760;                 // ~25 mois
const DIRECT_MS = 30 * 60 * 1000;        // « en ce moment » : 30 minutes
const DIRECT_MAX = 400;
const MAX_CLES_JOUR = 300;               // pages ou sources distinctes par jour ; au-delà : « (autres) »
const ECRIRE_MS = 60 * 1000;

/* Les agents qui écrivent aux prospects : leur signature porte « ?de=<id> » (`agents-signature.js`). Liste FERMÉE : une valeur
   inconnue ne devient jamais une source (sinon n'importe qui écrirait ce qu'il veut dans la Tour). */
const AGENTS = { lea: 'Léa', camille: 'Camille', chloe: 'Chloé' };

/* D'un nom de domaine à une source lisible. Ce qui n'est pas connu garde son nom de domaine (réduit, sans « www. »). */
const SOURCES = [
  [/(^|\.)google\./, 'Google'], [/(^|\.)bing\.com$/, 'Bing'], [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'], [/(^|\.)qwant\.com$/, 'Qwant'],
  [/(^|\.)ecosia\.org$/, 'Ecosia'], [/(^|\.)yahoo\./, 'Yahoo'], [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'], [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'], [/(^|\.)(x\.com|twitter\.com|t\.co)$/, 'X (Twitter)'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'], [/(^|\.)(chatgpt\.com|openai\.com)$/, 'ChatGPT'], [/(^|\.)perplexity\.ai$/, 'Perplexity'],
  [/(^|\.)claude\.ai$/, 'Claude'], [/(^|\.)gemini\.google\.com$/, 'Gemini'], [/(^|\.)copilot\.microsoft\.com$/, 'Copilot'],
  [/(^|\.)(mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com|webmail\.)/, 'Messagerie (courriel)'],
];
const NOTRE = /(^|\.)teamop\.fr$/;
const ROBOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|curl|wget|python|axios|node-fetch|go-http/i;

const motSur = (v, n) => String(v || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, n || 40);
function hoteDe(u) { try { return new URL(String(u)).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { return ''; } }
function sourceDe(hote) {
  if (!hote) return '';
  for (const [re, nom] of SOURCES) if (re.test(hote)) return nom;
  return /^[a-z0-9.-]{3,80}$/.test(hote) ? hote : '';
}
/* Le chemin d'une page : sans requête ni ancre, caractères sages, et « /index.html » vaut « / ». Rien d'autre n'entre (un chemin inventé ne crée pas de clé). */
function cheminDe(p) {
  let s = String(p || '').split(/[?#]/)[0];
  if (!/^\/[A-Za-z0-9/._-]{0,160}$/.test(s) || s.includes('..')) return '';
  if (s.endsWith('/index.html')) s = s.slice(0, -10);
  return s;
}
const ecranDe = l => { const w = Number(l); return !Number.isFinite(w) || w <= 0 ? 'inconnu' : w < 700 ? 'téléphone' : w < 1100 ? 'tablette' : 'ordinateur'; };
const jourDe = ts => new Date(ts).toISOString().slice(0, 10);
function plus(map, cle, n) {
  if (!cle) return;
  if (!(cle in map) && Object.keys(map).length >= MAX_CLES_JOUR) cle = '(autres)';
  map[cle] = (map[cle] || 0) + (n || 1);
}

/* Le cœur, sans Express ni disque : ce que `enregistrer` fait d'une page vue. Exporté pour le banc. */
function lireVue(corps, ua) {
  if (ROBOT.test(String(ua || ''))) return { ignore: 'robot' };
  const b = corps && typeof corps === 'object' && !Array.isArray(corps) ? corps : null;
  if (!b) return { ignore: 'forme' };
  const page = cheminDe(b.p);
  if (!page) return { ignore: 'page' };
  const hote = hoteDe(b.r);
  const interne = NOTRE.test(hote);
  const de = motSur(b.de, 20);
  const us = motSur(b.us), um = motSur(b.um), uc = motSur(b.uc, 60);
  let source;
  if (AGENTS[de]) source = 'Courriel de ' + AGENTS[de];
  else if (us) source = 'Lien marqué : ' + us;
  else if (interne) source = '';
  else source = sourceDe(hote) || 'Accès direct';
  const campagne = AGENTS[de] ? 'agent:' + de : us ? [us, um, uc].filter(Boolean).join(' / ') : '';
  return { page, visite: !interne, source, campagne, ecran: ecranDe(b.l) };
}

module.exports = function audience(app, ctx) {
  const { DATA_DIR, monPatronStrict, origines, maintenant } = ctx;
  const now = typeof maintenant === 'function' ? maintenant : () => Date.now();
  const P = path.join(DATA_DIR, F);
  let reg = { v: 1, jours: {} }, lisible = true;
  try {
    if (fs.existsSync(P)) {
      const o = JSON.parse(fs.readFileSync(P, 'utf8'));
      if (!o || typeof o !== 'object' || !o.jours || typeof o.jours !== 'object' || Array.isArray(o.jours)) throw new Error('forme');
      reg = o;
    }
  } catch (e) { lisible = false; console.error('audience : registre illisible, rien ne sera réécrit —', e.message); }

  let sale = false, minuterie = null;
  function ecrire() {
    if (!lisible || !sale) return true;
    try { const t = P + '.tmp'; fs.writeFileSync(t, JSON.stringify(reg)); fs.renameSync(t, P); sale = false; return true; }
    catch (e) { console.error('audience : écriture refusée —', e.message); return false; }
  }
  function elaguer() {
    const limite = jourDe(now() - GARDE_JOURS * 86400000);
    for (const d of Object.keys(reg.jours)) if (d < limite) { delete reg.jours[d]; sale = true; }
  }
  if (!ctx.sansMinuterie) {
    minuterie = setInterval(() => { elaguer(); ecrire(); }, ECRIRE_MS);
    if (minuterie.unref) minuterie.unref();
    process.once('beforeExit', ecrire);
  }

  const direct = [];   // { ts, page, source, ecran } — mémoire seule
  const quota = new Map();
  function quotaOk(cle) {
    if (quota.size > 5000) quota.clear();
    const t = now(), q = quota.get(cle) || { n: 0, reset: t + 600000 };
    if (t > q.reset) { q.n = 0; q.reset = t + 600000; }
    q.n++; quota.set(cle, q);
    return q.n <= 120;
  }

  function enregistrer(corps, ua) {
    const v = lireVue(corps, ua);
    if (v.ignore) return v;
    const t = now(), d = jourDe(t);
    const J = reg.jours[d] || (reg.jours[d] = { vues: 0, visites: 0, pages: {}, entrees: {}, sources: {}, campagnes: {}, ecrans: {} });
    J.vues++;
    plus(J.pages, v.page);
    if (v.visite) {
      J.visites++;
      plus(J.entrees, v.page);
      plus(J.sources, v.source);
      plus(J.ecrans, v.ecran);
      if (v.campagne) plus(J.campagnes, v.campagne);
    }
    sale = true;
    direct.push({ ts: t, page: v.page, source: v.visite ? v.source : '', ecran: v.ecran });
    while (direct.length > DIRECT_MAX || (direct.length && direct[0].ts < t - DIRECT_MS)) direct.shift();
    return v;
  }

  /* Le résumé d'une période pour la Tour : des compteurs, rien d'autre. */
  function resume(jours) {
    const n = [1, 7, 30, 90, 365].includes(jours) ? jours : 7;
    const t = now(), L = [], tot = { vues: 0, visites: 0 }, cumul = { pages: {}, entrees: {}, sources: {}, campagnes: {}, ecrans: {} };
    for (let i = n - 1; i >= 0; i--) {
      const d = jourDe(t - i * 86400000), J = reg.jours[d];
      L.push({ d, vues: J ? J.vues : 0, visites: J ? J.visites : 0 });
      if (!J) continue;
      tot.vues += J.vues; tot.visites += J.visites;
      for (const k of Object.keys(cumul)) for (const [c, x] of Object.entries(J[k] || {})) cumul[k][c] = (cumul[k][c] || 0) + x;
    }
    const top = (m, k) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, k || 15);
    const recents = direct.filter(e => e.ts >= t - DIRECT_MS);
    const jours0 = Object.keys(reg.jours).sort();
    return {
      ok: true, jours: n, totaux: tot, parJour: L,
      pages: top(cumul.pages), entrees: top(cumul.entrees), sources: top(cumul.sources), campagnes: top(cumul.campagnes), ecrans: top(cumul.ecrans, 4),
      direct: { pages: recents.length, visites: recents.filter(e => e.source).length, derniers: recents.slice(-25).reverse() },
      depuis: jours0[0] || null,
    };
  }

  if (app) {
    const texte = require('express').text({ type: () => true, limit: '2kb' });
    /* La page vue : publique par nature (c'est le site qui l'envoie). `sendBeacon` part en text/plain : aucune requête préalable. */
    app.post('/api/audience/vue', texte, (req, res) => {
      const o = req.headers.origin;
      if (!o || !(origines || []).includes(o)) return res.status(403).end();
      if (!quotaOk(String(req.ip || '?'))) return res.status(429).end();
      let corps = null;
      try { corps = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) { return res.status(400).end(); }
      enregistrer(corps, req.headers['user-agent']);
      res.status(204).end();
    });
    app.get('/api/monitor/audience', monPatronStrict, (req, res) => {
      if (!lisible) return res.status(503).json({ error: 'Le registre de l’audience est illisible sur le serveur : on ne sait pas combien de visites il y a eu.' });
      res.json(resume(parseInt(req.query.jours, 10)));
    });
  }
  return { enregistrer, resume, ecrire, elaguer, lisible: () => lisible, arreter: () => { if (minuterie) clearInterval(minuterie); } };
};
module.exports.lireVue = lireVue;
module.exports.sourceDe = sourceDe;
module.exports.cheminDe = cheminDe;
module.exports.AGENTS = AGENTS;
module.exports.GARDE_JOURS = GARDE_JOURS;
