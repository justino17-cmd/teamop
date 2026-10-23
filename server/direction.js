/* LA DIRECTION DES AGENTS (20 octobre 2026) — la charte d'autonomie et le rapport du jour de Victor.
 * Justin : « je veux une entreprise que quand j'arrive, on me dit : ça a été fait ici, ça a été relancé là » et « pas qu'à chaque fois
 * qu'ils font un truc, je dois valider ». Deux pièces, et aucune n'appelle Anthropic ni ne parle à un client :
 *
 *  · LA CHARTE dit, GESTE PAR GESTE, ce qu'un agent peut faire SEUL. Le patron la règle UNE fois ; un agent la lit avant chaque geste
 *    (`autorise`). Les gestes dits « fixes » (mise en demeure, changement du texte d'un contrat, suppression de données) ne passent
 *    JAMAIS en auto : la charte ne sait pas les ouvrir. Une charte illisible n'autorise RIEN (tout reste en brouillon) et ne se
 *    réécrit pas par-dessus.
 *  · LE RAPPORT est construit à partir du journal des agents, sans intelligence artificielle : ce qui a été fait, par qui, ce qui a
 *    échoué ou a été refusé. Un journal illisible est un 503, jamais « rien ne s'est passé ».
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* Les gestes connus. `fixe` : toujours un humain. Les bornes sont celles que la route accepte — rien d'autre ne s'écrit. */
const GESTES = {
  envoyer_contrat:  { libelle: 'Envoyer le contrat et la facture à chaque paiement', auto: true },
  envoyer_acces:    { libelle: 'Envoyer les accès une fois le contrat accepté',        auto: true },
  relancer_impaye:  { libelle: 'Relancer un impayé',                                   auto: true,  jours: [3, 7], bornes: { min: 1, max: 60, n: 4 } },
  suspendre_impaye: { libelle: 'Suspendre un impayé',                                  auto: true,  apresJours: 14, bornes: { min: 3, max: 90 } },
  /* OUVERT PAR DÉFAUT depuis le 23 octobre 2026 (Justin : « je veux que tous mes agents soient autonomes et se débrouillent sans moi »). Ce que le serveur a DÉJÀ enregistré reste
     tel quel : `charger` relit `agents-charte.json` par-dessus ce défaut. Ouvert ne veut pas dire « sans contrôle » : un courriel ne part seul que si le MODE de l'agent est « auto »
     (Justin les passe un à un), que le contrôle qualité l'a jugé bon, que l'expéditeur est authentifié, et dans les plafonds — voir `agents-brouillons.js`. */
  repondre_client:  { libelle: 'Répondre seul aux questions courantes par courrier',   auto: true },
  rembourser:       { libelle: 'Rembourser ou faire un geste commercial',              auto: false, plafondEur: 0, bornes: { min: 0, max: 500 } },
  mise_en_demeure:  { libelle: 'Mise en demeure',                                      auto: false, fixe: true },
  changer_contrat:  { libelle: 'Changer le texte d’un contrat',                        auto: false, fixe: true },
  supprimer_donnees:{ libelle: 'Supprimer des données',                                auto: false, fixe: true },
};
const PARAMS = ['jours', 'apresJours', 'plafondEur'];

const defaut = () => { const o = {}; for (const [k, g] of Object.entries(GESTES)) { o[k] = { auto: g.auto }; for (const p of PARAMS) if (g[p] !== undefined) o[k][p] = Array.isArray(g[p]) ? g[p].slice() : g[p]; } return o; };

function entierBorne(v, b) { return Number.isInteger(v) && v >= b.min && v <= b.max; }

/* Valide un corps de requête : rend la charte complète ou `{erreur}`. Un geste inconnu, un geste fixe ouvert, un nombre hors bornes : refus. */
function valider(corps, actuelle) {
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return { erreur: 'Forme inattendue' };
  const out = JSON.parse(JSON.stringify(actuelle));
  for (const [k, v] of Object.entries(corps)) {
    const g = GESTES[k];
    if (!g) return { erreur: 'Geste inconnu : ' + String(k).slice(0, 40) };
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { erreur: 'Forme inattendue pour ' + k };
    for (const [c, val] of Object.entries(v)) {
      if (c === 'auto') {
        if (typeof val !== 'boolean') return { erreur: 'auto : vrai ou faux (' + k + ')' };
        if (g.fixe && val === true) return { erreur: 'Ce geste reste toujours à un humain : ' + g.libelle };
        out[k].auto = val;
      } else if (c === 'jours') {
        if (g.jours === undefined) return { erreur: 'Réglage inconnu : ' + c };
        if (!Array.isArray(val) || !val.length || val.length > g.bornes.n || !val.every(x => entierBorne(x, g.bornes)) || val.some((x, i) => i && x <= val[i - 1])) return { erreur: 'jours : une liste croissante de jours entre ' + g.bornes.min + ' et ' + g.bornes.max };
        out[k].jours = val.slice();
      } else if (c === 'apresJours' || c === 'plafondEur') {
        if (g[c] === undefined) return { erreur: 'Réglage inconnu : ' + c };
        if (!entierBorne(val, g.bornes)) return { erreur: c + ' : un entier entre ' + g.bornes.min + ' et ' + g.bornes.max };
        out[k][c] = val;
      } else return { erreur: 'Réglage inconnu : ' + String(c).slice(0, 40) };
    }
  }
  const r = out.relancer_impaye, sp = out.suspendre_impaye;
  if (r && sp && Math.max.apply(null, r.jours) >= sp.apresJours) return { erreur: 'La suspension doit venir après la dernière relance' };
  return { charte: out };
}

/* Le rapport : fenêtre [depuis, jusqu[ en millisecondes. Pur : aucune lecture de disque. */
function construireRapport(journal, depuis, jusqu, noms) {
  const dans = journal.filter(e => e && typeof e.ts === 'number' && e.ts >= depuis && e.ts < jusqu);
  const par = new Map();
  const cpt = { ok: 0, refuse: 0, erreur: 0, propose: 0 };
  for (const e of dans) {
    const r = cpt[e.resultat] !== undefined ? e.resultat : 'ok';
    cpt[r]++;
    const a = par.get(e.agent) || { agent: e.agent, nom: (noms && noms[e.agent]) || e.agent, faits: 0, refuses: 0, erreurs: 0 };
    a.faits++; if (r === 'refuse') a.refuses++; if (r === 'erreur') a.erreurs++;
    par.set(e.agent, a);
  }
  /* À regarder d'abord : ce qui a échoué ou a été refusé, puis ce qui attend une décision, puis le reste — les plus récents en premier. */
  const rang = e => (e.resultat === 'erreur' ? 0 : e.resultat === 'refuse' ? 1 : e.resultat === 'propose' ? 2 : 3);
  const lignes = dans.slice().sort((x, y) => rang(x) - rang(y) || y.ts - x.ts).slice(0, 60)
    .map(e => ({ ts: e.ts, agent: e.agent, nom: (noms && noms[e.agent]) || e.agent, action: e.action, cible: e.cible || '', resultat: e.resultat, detail: e.detail || '' }));
  return { depuis, jusqu, total: dans.length, ...cpt, parAgent: Array.from(par.values()).sort((x, y) => y.faits - x.faits), lignes, tronque: dans.length > lignes.length };
}

module.exports = function direction(app, ctx) {
  const { DATA_DIR, monAdmin, monPatronStrict, agents } = ctx;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const FICHIER = 'agents-charte.json';
  let illisible = false;
  let charte = defaut();
  try {
    const brut = fs.readFileSync(path.join(DATA_DIR, FICHIER), 'utf8');
    const v = valider(JSON.parse(brut), defaut());
    if (v.erreur) throw new Error(v.erreur);
    charte = v.charte;
  } catch (e) { if (!(e && e.code === 'ENOENT')) { illisible = true; console.error('⛔ charte des agents illisible : rien ne passe en auto tant qu’elle n’est pas réparée'); } }

  /* Un agent demande, AVANT son geste, s'il peut le faire seul. Charte illisible, geste inconnu ou fixe : non. */
  function autorise(geste) {
    const g = GESTES[geste];
    if (!g) return { auto: false, raison: 'inconnu' };
    if (illisible) return { auto: false, raison: 'charte_illisible' };
    if (g.fixe) return { auto: false, raison: 'humain' };
    return { auto: charte[geste].auto === true, raison: charte[geste].auto === true ? 'ok' : 'brouillon' };
  }
  const reglage = (geste, cle) => (!illisible && charte[geste] && charte[geste][cle] !== undefined) ? charte[geste][cle] : (GESTES[geste] ? GESTES[geste][cle] : undefined);
  const vue = () => Object.keys(GESTES).map(k => ({ id: k, libelle: GESTES[k].libelle, fixe: GESTES[k].fixe === true, ...charte[k] }));
  const noms = {}; for (const a of (agents && agents.AGENTS) || []) noms[a.id] = a.nom;

  app.get('/api/monitor/agents/charte', monAdmin, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'La charte est illisible : rien ne passe en auto' });
    res.json({ ok: true, gestes: vue() });
  });
  app.post('/api/monitor/agents/charte', monPatronStrict, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'La charte est illisible : réparer le fichier avant de la modifier' });
    const v = valider(req.body && req.body.gestes, charte);
    if (v.erreur) return res.status(400).json({ error: v.erreur });
    try {
      const f = path.join(DATA_DIR, FICHIER), tmp = f + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(v.charte)); fs.renameSync(tmp, f);
    } catch (e) { console.error('charte non écrite :', e.message); return res.status(503).json({ error: 'Charte non enregistrée' }); }
    charte = v.charte;
    if (agents && agents.noter) agents.noter('systeme', 'charte modifiée', { qui: req.tourUser && req.tourUser.nom, detail: Object.keys(req.body.gestes).join(', ') });
    res.json({ ok: true, gestes: vue() });
  });
  app.get('/api/monitor/agents/rapport', monAdmin, (req, res) => {
    if (!agents || agents.journalIllisible()) return res.status(503).json({ error: 'Le journal des agents est illisible : le rapport ne peut pas être établi' });
    const h = Math.min(Math.max(parseInt(req.query.heures, 10) || 24, 1), 24 * 31);
    const fin = maintenant();
    res.json({ ok: true, rapport: construireRapport(agents.lireJournal(), fin - h * 3600 * 1000, fin + 1, noms) });
  });

  return { autorise, reglage, construireRapport, GESTES };
};
module.exports.GESTES = GESTES;
module.exports.valider = valider;
module.exports.defaut = defaut;
module.exports.construireRapport = construireRapport;
