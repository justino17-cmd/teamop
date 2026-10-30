/* ⛔ L'ÉTABLI COMMUN DE test-2911 À test-2915 (23 octobre 2026) — Hugo, Margaux, Emma, Sarah : les VRAIS modules, tout le reste simulé, rien ne sort.
 *
 * Monte, dans un dossier jetable : le vrai `agents.js` (registre, journal, validations, modes, tâches), le vrai `direction.js` (la charte), le vrai `conversations.js` (les fils et le
 * groupe « Clients »), le vrai `cerveau.js` (budget, réglages — seul `appeler`, l'appel réseau, est remplacé), le vrai `agents-documents.js`, puis les vrais `agent-hugo.js`,
 * `agent-margaux.js`, `agent-emma.js` et `agent-sarah.js`. Sont simulés : le serveur HTTP (un `app` qui note ses routes, appelées par `appeler()` en rejouant leurs intergiciels —
 * `monAdmin` / `monPatronStrict` y ont leur sens : le patron seul passe le second), la messagerie du Courrier (`mail` : boîtes, envoi d'un agent — chaque envoi est NOTÉ, signature
 * comprise), Stripe (les dépendances `resilier`, `impayes`, `facture`, `faits`, que l'index branche sur le serveur — leurs liaisons sont jouées par test-2917 contre le VRAI serveur)
 * et Claude (`claude(requete)` rend le texte voulu ; chaque requête reçue est GARDÉE, c'est ce qui permet de prouver ce qui part chez Anthropic).
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
const S = f => path.join(RACINE, 'server', f);

function monter(o) {
  o = o || {};
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'bgestion-'));
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

  const modes = Object.assign({ hugo: 'auto', margaux: 'auto', emma: 'auto', sarah: 'auto', camille: 'auto' }, o.modes || {});
  fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
  if (o.avant) o.avant(D);

  const agents = require(S('agents.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, maintenant, pousseNotif: async () => 0, cerveaux: [], cleCerveauPosee: true,
    horaires: typeof o.horaires === 'function' ? o.horaires(D) : undefined });   // les heures de travail (`test-3021`) : une FABRIQUE ; sans elle, pas de garde horaire
  const direction = require(S('direction.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents, maintenant });
  let equipe = null;
  const conversations = require(S('conversations.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents, maintenant, pousseNotif: async () => 0,
    dossierExiste: n => !o.dossiersExistants || o.dossiersExistants.includes(n),
    surMessage: m => (equipe ? equipe.surMessage(m) : null) });

  const recus = [];
  const cerveau = require(S('cerveau.js'))(Object.assign({ DATA_DIR: D, agents, cleApi: o.cleApi || (o.sansCle ? '' : 'sk-ant-banc-2911-xxxxxxxxxxxxxxxx'), maintenant }, o.cerveauCtx || {}, {
    travailActif: id => { try { return !!(travail && travail.actif(id)); } catch (e) { return false; } },   // les plafonds du mode travail suivent l'interrupteur (comme index.js)
    appeler: async (cle, requete, optsAppel) => {
      recus.push(JSON.parse(JSON.stringify(requete)));
      if (o.appelerReel) return o.appelerReel(cle, requete, optsAppel);   // le VRAI modèle (`server/outils/evaluation-travail/rejouer.js`)
      const r = o.claude ? await o.claude(requete, recus.length) : 'Objet : Mise à jour d’OP GESTION\n\nBonjour,\n\nVotre application OP GESTION vient de recevoir une mise à jour : le planning s’affiche plus vite.\n\nBien cordialement,';
      if (r instanceof Error) throw r;
      if (r && typeof r === 'object') return Object.assign({ texte: '', entree: 900, sortie: 400, stop_reason: 'end_turn' }, r);   // { texte, actions:[{ id, nom, entree }] } : un faux Claude qui joue un outil
      return { texte: r, entree: 900, sortie: 400, stop_reason: 'end_turn' };
    } }));

  const boites = o.boites || [{ id: 'b-contact', email: 'contact@teamop.fr', nom: 'TEAM OP' }, { id: 'b-support', email: 'support@teamop.fr', nom: 'TEAM OP' }];
  const envoyes = [];
  const mail = {
    boites: () => boites.map(b => Object.assign({}, b)),
    boiteParRole: r => { const b = boites.find(x => x.email.toLowerCase().startsWith(String(r) + '@')) || boites[0]; return b ? b.id : null; },
    signature: () => 'SIGNATURE-DU-COURRIER',
    envoyerAgent: async (x) => { if (o.panneEnvoi) throw new Error('smtp en panne pour jean.dupont@client-secret.fr'); envoyes.push(JSON.parse(JSON.stringify(x))); return { copieOk: true }; },
  };
  const fichier = require(S('agents-fichier.js'))(D);
  const diffusions = [];
  /* `o.signatures` : le REGISTRE des signatures du chantier commercial (`agents-signature.js`, réglable par la Tour) branché sur les documents — comme le fait `index.js` ; sans lui, la signature par défaut du module. */
  const signatures = o.signatures ? require(S('agents-signature.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents, fichier }) : undefined;
  const documents = require(S('agents-documents.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents, mail, direction, fichier, maintenant, signatures,
    diffuser: async (doc) => { if (o.panneDiffusion) throw new Error('smtp en panne'); diffusions.push(doc); return { envoyes: o.destinataires === undefined ? 12 : o.destinataires, refus: 0 }; },
    destinataires: () => (o.destinataires === undefined ? 12 : o.destinataires) });

  /* ── le monde que l'index fournit : un annuaire de deux entreprises, des dossiers, Stripe ── */
  const monde = o.monde || {};
  const espaces = Object.assign({ 'alpha-proprete': { dossier: 'DOS-000001', adresse: 'alpha@exemple-2911.fr', nom: 'Alpha Propreté' }, 'beta-nettoyage': { dossier: 'DOS-000002', adresse: 'beta@exemple-2911.fr', nom: 'Beta Nettoyage' } }, monde.espaces || {});
  const appelsStripe = [];
  const dep = {
    dossierDe: slug => (espaces[slug] || {}).dossier || '',
    espaceDeDossier: n => Object.keys(espaces).find(s => espaces[s].dossier === n) || '',
    resilier: async (slug) => { appelsStripe.push(['resilier', slug]); if (monde.resilier) return monde.resilier(slug); const e = espaces[slug]; return e ? { etat: 'ok', finMs: Date.UTC(2026, 10, 12, 10), adresse: e.adresse, nb: 1 } : { etat: 'inconnu' }; },
    faits: async (n) => { appelsStripe.push(['faits', n]); if (monde.faits) return monde.faits(n); return { numero: n, paiement: { etat: 'paye', formule: 'pro' } }; },
    adresseDe: async (n) => (monde.adresseDe ? monde.adresseDe(n) : ((Object.values(espaces).find(e => e.dossier === n) || {}).adresse || '')),
  };
  const hugo = require(S('agent-hugo.js'))({ agents, conversations, cerveau, slug: x => String(x).toLowerCase().replace(/[^a-z0-9]+/g, '-'), fichier, maintenant, documents,
    clients: () => [], espaceExiste: () => true, stripeListe: async () => [], paiement: () => ({ sur: false }), dossierDe: dep.dossierDe, espaceDeDossier: dep.espaceDeDossier, resilier: dep.resilier, faits: dep.faits });
  const impayesListe = { ok: true, liste: [] };
  const factureDe = { v: null };
  /* le mode « travail » (30 octobre 2026) : levé par `o.travail` seulement ; sinon Margaux est montée comme avant, au caractère près */
  const travail = o.travail ? require(S('agents-travail.js'))({ cerveau, agents, conversations, maintenant, travail: o.travail }) : null;
  const outilsLecture = o.travail ? require(S('agents-outils-lecture.js'))({ agents, louis: o.louis || null, faits: {}, margaux: () => null }) : null;
  const margaux = require(S('agent-margaux.js'))({ agents, conversations, documents, direction, fichier, maintenant, cerveau, travail, outilsLecture, indemniteConfirmee: o.indemniteConfirmee,
    impayes: async () => (monde.impayes ? monde.impayes() : impayesListe),
    facture: async (aboId) => { appelsStripe.push(['facture', aboId]); if (monde.facture) return monde.facture(aboId); return factureDe.v; } });
  const emma = require(S('agent-emma.js'))(app, { agents, conversations, documents, fichier, maintenant, monAdmin, monPatronStrict, adresseDe: dep.adresseDe });
  const sarah = require(S('agent-sarah.js'))(app, { agents, conversations, cerveau, documents, fichier, maintenant, monPatronStrict });

  /* LA MESSAGERIE (`agent-equipe.js`, le vrai module) : seulement si `o.equipe` — avec les outils propres de Hugo, Margaux, Emma, Sarah et les faits fermés `dossier` et `facture` */
  if (o.equipe) {
    equipe = require(S('agent-equipe.js'))({ agents, conversations, cerveau,
      faits: { dossier: dep.faits, facture: async (n) => (monde.factureFait ? monde.factureFait(n) : { numero: n, nb: 1, factures: [{ statut: 'paye', montantEur: 15, jour: 1, mois: 10, annee: 2026 }] }) },
      outilsAgents: { hugo: hugo.outilsEquipe, margaux: margaux.outilsEquipe, emma: emma.outilsEquipe, sarah: sarah.outilsEquipe } });
  }
  const validations = async (statut) => (await appeler('GET /api/monitor/agents/validations', { tourUser: PATRON, query: { statut: statut || 'tout' } })).corps.validations;
  const decider = async (id, decision, corps) => appeler('POST /api/monitor/agents/validations/decider', { tourUser: PATRON, body: Object.assign({ id, decision }, corps || {}) });
  const journal = () => agents.lireJournal();
  const fil = (f) => conversations.historique(f, 50);
  const fichierJson = nom => JSON.parse(fs.readFileSync(path.join(D, nom), 'utf8'));
  const nettoyer = () => { try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {} };
  /* un document lu comme la Tour le lit, puis accepté AVEC son empreinte */
  const lireDoc = async (ref) => (await appeler('GET /api/monitor/agents/documents', { tourUser: PATRON, query: { refs: ref } })).corps[ref];
  const accepter = async (v) => { const ref = v.params.ref; const d = ref ? await lireDoc(ref) : null; return decider(v.id, 'accepter', d ? { empreinte: d.empreinte } : {}); };
  return { D, horloge, equipe, agents, direction, conversations, cerveau, travail, mail, documents, hugo, margaux, emma, sarah, fichier, recus, envoyes, diffusions, appelsStripe, impayesListe, factureDe, dep, espaces,
    routes, appeler, PATRON, COLLAB, validations, decider, journal, fil, fichierJson, nettoyer, lireDoc, accepter };
}
module.exports = { monter };
