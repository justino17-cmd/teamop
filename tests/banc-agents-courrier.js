/* ⛔ L'ÉTABLI COMMUN DE test-2862, test-2863 ET test-2864 (23 octobre 2026) — les VRAIS modules, tout le reste simulé, rien ne sort.
 *
 * Monte, dans un dossier jetable : le vrai `agents.js` (registre, journal, validations, modes), le vrai `direction.js` (la charte), le vrai
 * `cerveau.js` (budget, `thinking` désactivé — seul `appeler`, l'appel réseau, est remplacé), le vrai `agents-brouillons.js`, le vrai `agent-lea.js`
 * et le vrai `agent-camille.js`. Sont simulés : le serveur HTTP (un `app` qui note ses routes, appelées par `appeler()` en rejouant leurs
 * intergiciels — `monAdmin` / `monPatronStrict` y ont leur sens : le patron seul passe le second), la messagerie (`mail` : boîtes, lecture
 * d'un message, envoi d'un agent — chaque appel est NOTÉ), et Claude (`claude(requete)` rend le texte voulu ; chaque requête reçue est GARDÉE,
 * c'est ce qui permet de prouver ce qui part chez Anthropic).
 * Ce que cet établi ne voit pas, les deux autres moitiés le voient : `mail.js` lui-même (lecture sans marquer, envoi, crochet de la veille) et le
 * câblage d'`index.js` sont joués par le VRAI serveur (test-2863 §3, test-2864 §2).
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
const S = f => path.join(RACINE, 'server', f);

const SIGNATURE = 'Justin Dupont\nTeamOP — OP GESTION';
/* Un courriel que Claude pourrait rendre : il passe `refusDe` (pas d'adresse, de lien, de numéro, un seul prix : 15 €). */
const COURRIEL = [
  'Objet : TeamOP — OP GESTION pour votre activité',
  '',
  'Bonjour,',
  '',
  'Nous vous remercions pour votre inscription sur teamop.fr. Nous avons bien noté votre activité.',
  '',
  'TeamOP édite OP GESTION, la gestion de vos interventions, sur ordinateur, tablette et téléphone, sans installation.',
  '',
  'Notre différence : une formule sur mesure, à partir de 15 € par mois et par utilisateur (TVA non applicable).',
  '',
  'Pour vous proposer une offre adaptée, pourriez-vous nous préciser :',
  '1. La taille de votre équipe ?',
  '2. Votre clientèle ?',
  '3. Les outils que vous utilisez aujourd’hui ?',
  '4. Vos attentes principales ?',
  '',
  'Dès réception de vos réponses, nous vous adresserons une proposition adaptée ; nous pourrons ensuite vous ouvrir une période d’essai d’une semaine.',
  '',
  'Nous restons à votre disposition par retour de mail ou par téléphone.',
  '',
  'Bien cordialement,'
].join('\n');

function monter(o) {
  o = o || {};
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'bcourrier-'));
  const horloge = { t: o.t0 || Date.UTC(2026, 9, 23, 9, 0, 0) };
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
    req = Object.assign({ body: {}, query: {}, tourUser: null }, req);
    let i = 0;
    const suite = async () => { const h = hs[i++]; if (!h) return; let passe = false; await h(req, res, () => { passe = true; }); if (passe && !res.fini) await suite(); };
    await suite();
    return { status: res.code, corps: res.corps };
  }
  const PATRON = { nom: 'Justin', role: 'patron' }, COLLAB = { nom: 'Agent', role: 'collaborateur' };

  if (o.modes) fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes: o.modes }));
  if (o.avant) o.avant(D);

  const agents = require(S('agents.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, maintenant, pousseNotif: async () => 0, cerveaux: [], cleCerveauPosee: true });
  const direction = require(S('direction.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents, maintenant });

  /* Claude simulé : chaque requête est gardée ; `o.claude(requete, n)` choisit la réponse (texte brut, ou un objet d'erreur à jeter). */
  const recus = [];
  const cerveau = require(S('cerveau.js'))({ DATA_DIR: D, agents, cleApi: o.sansCle ? '' : 'sk-ant-banc-2862-xxxxxxxxxxxxxxxx', maintenant,
    appeler: async (cle, requete) => {
      recus.push(JSON.parse(JSON.stringify(requete)));
      const r = o.claude ? await o.claude(requete, recus.length) : COURRIEL;
      if (r instanceof Error) throw r;
      return { texte: r, entree: 900, sortie: 400, stop_reason: 'end_turn' };
    } });

  /* La messagerie simulée. `messages` : 'boite|dossier|uid' → le message que rendrait `lireMessage` (ou une Error à jeter). */
  const boites = o.boites || [{ id: 'b-contact', email: 'contact@teamop.fr', nom: 'TEAM OP' }, { id: 'b-support', email: 'support@teamop.fr', nom: 'TEAM OP' }];
  const messages = {}, lectures = [], envoyes = [];
  const mail = {
    boites: () => boites.map(b => Object.assign({}, b)),
    boiteParRole: r => { const b = boites.find(x => x.email.toLowerCase().startsWith(String(r) + '@')) || boites[0]; return b ? b.id : null; },
    signature: () => SIGNATURE,
    lireMessage: async (b, d, u) => { lectures.push([b, d, u]); const m = messages[b + '|' + d + '|' + u]; if (m instanceof Error) throw m; return m || null; },
    envoyerAgent: async (x) => { if (o.panneEnvoi) throw new Error('smtp en panne pour jean.dupont@client-secret.fr'); envoyes.push(JSON.parse(JSON.stringify(x))); return { copieOk: true }; }
  };
  const fichier = require(S('agents-fichier.js'))(D);
  const brouillons = require(S('agents-brouillons.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents, mail, direction, fichier, maintenant });
  const lea = require(S('agent-lea.js'))({ agents, cerveau, brouillons, fichier, maintenant,
    libelleMetier: m => ({ chauffage: 'Chauffage / Climatisation', nettoyage: 'Nettoyage' }[m] || ''), metiers: ['chauffage', 'nettoyage', 'autre'] });
  const camille = require(S('agent-camille.js'))({ agents, cerveau, brouillons, mail, fichier, maintenant, domainesNotres: () => ['teamop.fr', 'notre-societe.fr'], adressesNotres: () => ['moi-meme@webmail-2863.example'] });

  const validations = async () => (await appeler('GET /api/monitor/agents/validations', { tourUser: PATRON, query: { statut: 'tout' } })).corps.validations;
  const journal = () => agents.lireJournal();
  const fichierJson = nom => JSON.parse(fs.readFileSync(path.join(D, nom), 'utf8'));
  const nettoyer = () => { try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {} };
  return { D, horloge, agents, direction, cerveau, mail, brouillons, lea, camille, fichier, recus, messages, lectures, envoyes, routes, appeler, PATRON, COLLAB,
    validations, journal, fichierJson, nettoyer };
}
module.exports = { monter, COURRIEL, SIGNATURE };
