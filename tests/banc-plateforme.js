/* ⛔ L'ÉTABLI COMMUN DES BANCS DE LA PLATEFORME (test-2920 à test-2924) — 23 octobre 2026. Les VRAIS modules, tout le reste simulé, rien ne sort.
 *
 * Monte, dans un dossier jetable : le vrai `agents.js` (registre, modes, journal, tâches, validations), le vrai `conversations.js` (fils, groupes, mentions,
 * plafonds), le vrai `cerveau.js` (budget — seul `appeler`, l'appel réseau, est remplacé), le vrai `agents-fichier.js`, `plateforme-etat.js` (la mémoire des épisodes)
 * et `incidents-agents.js` (le registre des incidents, sur un tableau que le banc tient). Sont simulés : le serveur HTTP (un `app` qui note ses routes, appelées par
 * `appeler()` en rejouant leurs intergiciels), l'horloge (`horloge.t`, avancée à la main), la poussée de notifications (chaque envoi est GARDÉ) et Claude
 * (`claude(requete, n)` rend le texte voulu ; chaque requête reçue est GARDÉE — c'est ce qui permet de prouver ce qui part chez Anthropic, et QU'IL N'Y EN A PAS
 * quand le code surveille seul).
 * Ce que cet établi ne voit pas, `test-2925` le voit : le VRAI `index.js`, parlé en HTTP, avec un faux Claude.
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
const S = f => path.join(RACINE, 'server', f);

/* L'état de santé d'un serveur en bonne forme : aucune règle ne se déclenche (le banc le prouve). */
const SANTE_BONNE = () => ({ ok: true, email: true, atts: true, stripe: true, stripeEchecMin: 0, bugs1h: 0, bugs24h: 0, uptime: 100000,
  cles: { valide: 3, absent: 0, invalide: 0, inconnu: 0, depuis: 1 }, mailRefus: { n: 0, parMotif: {}, parRoute: {}, ts: 0 },
  socle: { actif: true, cle: true, bases: 5, illisibles: 0, ancreJours: 1, refus7j: {}, divergences: { espaces: 3, muets: 0, avecEcart: 0, jours: 7 }, latence: { pousser: { p95: 20 }, depuis: { p95: 30 } } },
  portail: { comptes: { actif: true }, dossiers: { actif: true } }, documents: { actif: true, illisibles1h: 0, ecrituresEchec1h: 0, quotaRefus1h: 0, copiesEnAttente1h: 0, copiesEchec1h: 0 },
  processus: { rejets1h: 0, erreurs1h: 0 }, limites: { refusSynchro1h: 0, refusAutres1h: 0 }, conservation: { actif: true, balayageOk: true, echu: false, preavis: false },
  registres: { espaces: true, fermes: true, promos: true }, routesDoublons: 0, pieces: { remplissage: 10 },
  sauvegarde: { active: true, configuree: true, ageH: 3, ok: true, instantaneEchecs: 0, elagageEchecs: 0, mensuelActif: true, mensuelJ: 10 }, ghExpireBientot: false });

function monter(o) {
  o = o || {};
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'bplateforme-'));
  const horloge = { t: o.t0 || Date.UTC(2026, 9, 23, 7, 0, 0) };     // vendredi 23 octobre 2026, 9 h à Paris (heure d'été) — le samedi 24, le dimanche 25 (heure d'hiver), le lundi 26
  const maintenant = () => horloge.t;
  const routes = {};
  const app = { use() {} };
  for (const m of ['get', 'post', 'put', 'delete', 'patch']) app[m] = (p, ...h) => { routes[m.toUpperCase() + ' ' + p] = h; };
  const monAdmin = (req, res, next) => (req.tourUser ? next() : res.status(401).json({ error: 'non connecté' }));
  const monPatronStrict = (req, res, next) => (req.tourUser && req.tourUser.role === 'patron' ? next() : res.status(403).json({ error: 'réservé au patron' }));
  async function appeler(cle, req) {
    const hs = routes[cle];
    if (!hs) throw new Error('route absente : ' + cle);
    const res = { code: 200, corps: null, fini: false, status(c) { this.code = c; return this; }, json(x) { this.corps = x; this.fini = true; return this; }, setHeader() {} };
    req = Object.assign({ body: {}, query: {}, params: {}, tourUser: null }, req);
    let i = 0;
    const suite = async () => { const h = hs[i++]; if (!h) return; let passe = false; await h(req, res, () => { passe = true; }); if (passe && !res.fini) await suite(); };
    await suite();
    return { status: res.code, corps: res.corps };
  }
  const PATRON = { nom: 'Justin', role: 'patron' }, COLLAB = { nom: 'Agent', role: 'collaborateur' };

  const modes = {}; for (const a of require(S('agents.js')).AGENTS) modes[a.id] = (o.modes && o.modes[a.id]) || o.mode || 'brouillon';
  fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
  if (o.avant) o.avant(D);

  const pousses = [];
  const pousseNotif = async (titre, corps) => { pousses.push({ titre, corps }); return 1; };
  const agents = require(S('agents.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, maintenant, pousseNotif, cerveaux: [], cleCerveauPosee: true,
    horaires: typeof o.horaires === 'function' ? o.horaires(D) : undefined });   // les heures de travail (`test-3011`) : une FABRIQUE (le dossier n'existe qu'ici) ; sans elle, pas de garde horaire
  const conversations = require(S('conversations.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents, maintenant, pousseNotif, surMessage: m => (o.surMessage ? o.surMessage(m) : null) });

  const recus = [];
  const cerveau = require(S('cerveau.js'))({ DATA_DIR: D, agents, cleApi: o.sansCle ? '' : 'sk-ant-banc-2920-xxxxxxxxxxxxxxxx', maintenant,
    appeler: async (cle, requete) => {
      recus.push(JSON.parse(JSON.stringify(requete)));
      const r = o.claude ? await o.claude(requete, recus.length) : 'Réponse du banc.';
      if (r instanceof Error) throw r;
      if (r && typeof r === 'object') return Object.assign({ entree: 900, sortie: 300, stop_reason: 'end_turn' }, r);
      return { texte: r, entree: 900, sortie: 300, stop_reason: 'end_turn' };
    } });

  const fichier = require(S('agents-fichier.js'))(D);
  const etat = require(S('plateforme-etat.js'))({ fichier, maintenant });
  const issues = o.issues || [];
  const sauvees = { n: 0 };
  const incidents = require(S('incidents-agents.js'))({ lire: () => issues, sauver: () => { sauvees.n++; }, maintenant });

  const journal = () => agents.lireJournal();
  const fil = f => conversations.lire(f, 50);
  const textes = f => fil(f).map(m => m.texte);
  const fichierJson = nom => JSON.parse(fs.readFileSync(path.join(D, nom), 'utf8'));
  const nettoyer = () => { try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {} };
  const heure = (h, min, jour) => { const d = new Date(horloge.t); horloge.t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), jour || d.getUTCDate(), h, min || 0, 0); };
  const avancer = ms => { horloge.t += ms; };
  return { D, horloge, maintenant, app, routes, appeler, PATRON, COLLAB, agents, conversations, cerveau, recus, pousses, fichier, etat, issues, incidents, sauvees,
    journal, fil, textes, fichierJson, nettoyer, heure, avancer };
}
module.exports = { monter, SANTE_BONNE, S, RACINE };
