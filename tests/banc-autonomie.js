/* ⛔ L'ÉTABLI COMMUN DE test-3113 À test-3123 (28 octobre 2026) — les agents autonomes : racine d'un message de Justin, @tous, annonces de fin de travail, budget du jour.
 *
 * Justin, 28 octobre 2026 : « La limite de messages par heure, c'est pas normal. Je t'ai dit que je veux des agents qui soient autonomes de A à Z […] J'aimerais que les agents
 * communiquent entre eux. » ; « je veux qu'à chaque fois qu'ils ont fini, ils mettent dans le groupe "je viens d'effectuer ça" ».
 *
 * Monte, dans un dossier jetable, les VRAIS modules : `agents.js`, `conversations.js`, `agent-equipe.js`, `cerveau.js`, `agent-faits.js` (et `agents-horaires.js` à la demande). Seul `appeler`, l'appel
 * réseau d'Anthropic, est un faux : il COMPTE les appels, GARDE chaque requête reçue et rend des `usage` fictifs (de quoi faire un coût en dollars). Rien d'HTTP : les routes sont capturées et appelées
 * à la main (la couture avec le vrai serveur est jouée par test-3123).
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
const S = f => path.join(RACINE, 'server', f);
const dormir = ms => new Promise(r => setTimeout(r, ms));

function monter(o) {
  o = o || {};
  const AG = require(S('agents.js')), CV = require(S('conversations.js')), EQ = require(S('agent-equipe.js')), CER = require(S('cerveau.js'));
  let FAITS = null; try { FAITS = require(S('agent-faits.js')); } catch (e) { FAITS = null; }   // absent tant que les annonces ne sont pas écrites (commit 4)
  const REG = AG.AGENTS.map(a => a.id);
  const NOM2ID = new Map(AG.AGENTS.map(a => [a.nom, a.id]));
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'bauto-'));
  const horloge = { t: o.t0 || Date.UTC(2026, 9, 28, 10, 0, 0) };   // mercredi 28 octobre 2026, 11 h à Paris (heure d'hiver depuis le 25)
  const maintenant = () => horloge.t;
  const routes = { get: {}, post: {} };
  const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; }, use() {} };
  const modes = {}; for (const id of REG) modes[id] = (o.modes && o.modes[id]) || o.mode || 'brouillon';
  fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
  if (o.avant) o.avant(D);
  const pousses = [], pont = [], surBudget = [], expirations = [];
  let annonceur = null, eq = null, conv = null;
  const horaires = o.horaires ? require(S('agents-horaires.js'))({ DATA_DIR: D }) : undefined;
  const agents = AG(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, maintenant, horaires, pousseNotif: (t, c) => { pousses.push([t, c]); return Promise.resolve(); },
    surFait: f => (annonceur ? annonceur.annoncer(f) : null), surExpiration: x => { expirations.push(x); if (annonceur && o.expirationDite !== false) annonceur.expiree(x); } });
  conv = CV(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, agents, maintenant, pousseNotif: (t, c) => { pousses.push([t, c]); return Promise.resolve(); },
    surMessage: m => (o.sansReveil ? null : eq.surMessage(m)), surAjout: m => { pont.push(m); }, fenetreFaitsMs: o.fenetreFaitsMs === undefined ? 25 : o.fenetreFaitsMs });
  annonceur = FAITS ? FAITS({ agents, conversations: conv }) : null;
  const appels = [];
  const cerveau = CER({ DATA_DIR: D, agents, cleApi: 'cle-du-banc', maintenant, plafondsJour: o.plafondsJour, surBudget: x => { surBudget.push(x); if (o.surBudget) o.surBudget(x); },
    appeler: async (cle, requete) => {
      const nom = (/^Tu es ([^,]+),/.exec(String(requete.system)) || [])[1] || '?';
      const trace = { id: NOM2ID.get(nom) || nom, system: requete.system, messages: JSON.parse(JSON.stringify(requete.messages)), requete: { max_tokens: requete.max_tokens, thinking: requete.thinking, tools: (requete.tools || []).map(t => t.name) }, ts: horloge.t };
      appels.push(trace);
      const r = typeof o.script === 'function' ? await o.script(trace, appels.length) : { texte: 'Réponse du banc.' };
      return { texte: r.texte == null ? '' : r.texte, entree: r.entree == null ? (o.entree || 200) : r.entree, sortie: r.sortie == null ? (o.sortie || 60) : r.sortie, stop_reason: 'end_turn',
        actions: (r.actions || []).map((a, i) => ({ id: 'tu_' + a.nom + i, nom: a.nom, entree: a.entree })) };
    } });
  eq = EQ({ agents, conversations: conv, cerveau, faits: o.faits || {}, outilsAgents: o.outilsAgents, arbitrer: o.arbitrer, memoire: o.memoire, compteurs: o.compteurs });
  const fakeRes = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };
  const post = async (chemin, corps) => { const r = fakeRes(); await routes.post[chemin]({ body: corps, tourUser: { nom: 'Justin', role: 'patron' }, query: {} }, r); return r; };
  const get = async (chemin, params, query) => { const r = fakeRes(); await routes.get[chemin]({ params: params || {}, query: query || {}, tourUser: { nom: 'Justin', role: 'patron' } }, r); return r; };
  /* « calme » : plus aucun réveil en cours, deux relevés de suite */
  const calme = async () => { let calmes = 0; for (let i = 0; i < 400 && calmes < 3; i++) { if (eq.enCours() === 0) calmes++; else calmes = 0; await dormir(8); } };
  /* La mémoire de Victor (`plateforme-etat.js`) et son module, à la demande : le suivi, le point, l'équilibrage */
  let etatMod = null;
  const victor = () => { if (!etatMod) etatMod = require(S('plateforme-etat.js'))({ fichier: require(S('agents-fichier.js'))(D), maintenant }); return require(S('agent-victor.js'))({ agents, conversations: conv, cerveau, etat: etatMod, maintenant, equipe: () => eq }); };
  const H = {
    victor, D, REG, agents, conv, eq, cerveau, appels, pousses, pont, surBudget, expirations, horloge, horaires, calme, dormir,
    avance: ms => { horloge.t += ms; },
    post, get,
    justin: async (fil, texte) => { const r = await post('/api/monitor/conversations/envoyer', { fil, texte }); await calme(); return r; },
    messages: async fil => (await get('/api/monitor/conversations/:fil', { fil })).corps.messages,
    taches: () => { try { return JSON.parse(fs.readFileSync(path.join(D, 'agents-taches.json'), 'utf8')); } catch (e) { return []; } },
    registre: () => JSON.parse(fs.readFileSync(path.join(D, 'agents-messages.json'), 'utf8')),
    budget: () => cerveau.etatBudget(),
    nettoyer: () => { try { conv.viderFaits(); } catch (e) {} try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {} },   // les annonces en attente (rafales) s'écrivent AVANT que le dossier ne disparaisse
  };
  return H;
}
const rep = (texte, actions) => ({ texte, actions: actions || [] });
const outil = (nom, entree) => ({ nom, entree });
module.exports = { monter, rep, outil, dormir, RACINE, S };
