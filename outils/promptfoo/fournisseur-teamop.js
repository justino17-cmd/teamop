/* LE FOURNISSEUR PROMPTFOO MAISON DES AGENTS DE LA TOUR (28 octobre 2026).
 *
 * Il fait ce que promptfoo ne sait pas faire : construire le VRAI prompt. Pour chaque cas (`vars.canal`, `vars.agent`, le courriel ou le message), il monte le vrai module de
 * l'agent (`construire-prompt.js` — les mêmes établis que les bancs), laisse le module fabriquer sa requête, puis confie CETTE requête, telle quelle, à l'un de deux « modèles » :
 *
 *   · `TEAMOP_PF_MODE=simule` (par défaut) — aucune clé, aucun réseau : la réponse est celle écrite à la main dans le cas (`vars.simule.bonne` ou `vars.simule.mauvaise`, au choix de
 *     `TEAMOP_PF_QUALITE`). Ce mode ne juge pas un modèle : il PROUVE QUE LES ASSERTIONS ATTRAPENT une mauvaise réponse et laissent passer une bonne — un banc qu'on n'a jamais vu
 *     échouer ne prouve rien (CLAUDE.md).
 *   · `TEAMOP_PF_MODE=reel` — sur le VPS seulement : la requête part à Anthropic par `appelerAnthropic` de `server/cerveau.js` (le même appel que les agents, le même SDK), avec la clé
 *     lue dans la configuration du serveur.
 *
 * ⛔ LA CLÉ. Lue ICI, dans `callApi`, au premier appel réel, depuis `TEAMOP_CONFIG` (`/opt/teamop/config.json` par défaut), champ `TEAMOP_PF_CLE_CHAMP` (`agents.cleApi` par défaut — la clé
 *    des agents, celle de `cerveau.js`, jamais celle du Devis IA). Elle ne va nulle part sauf dans l'appel au SDK : jamais dans une variable d'environnement, un journal, un message d'erreur
 *    (`purger` l'efface de tout texte rendu), le résultat de l'évaluation ni les métadonnées. Une configuration illisible ne cite JAMAIS l'erreur d'analyse du JSON (V8 y recopie un
 *    extrait du fichier — donc possiblement la clé).
 * ⛔ Rien ne part ailleurs qu'à Anthropic : `garde-réseau.js` (chargé par `lancer.sh`) le tient au niveau des sockets.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { jouer } = require('./construire-prompt.js');
const { ecrireSortie } = require('./sortie.js');

/* Les tarifs de `server/cerveau.js` (un peu au-dessus du réel : on estime vers le haut) — `test-3132` vérifie qu'ils n'ont pas divergé. */
const USD_ENTREE_M = 3.5, USD_SORTIE_M = 17.5;
const CHAMP_DEFAUT = 'agents.cleApi';

function cheminConfig() { return process.env.TEAMOP_CONFIG || '/opt/teamop/config.json'; }

/* La clé de l'API. Rend une chaîne, ou JETTE une erreur qui ne contient ni la clé ni un extrait de la configuration. */
function lireCle() {
  const champ = String(process.env.TEAMOP_PF_CLE_CHAMP || CHAMP_DEFAUT);
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(cheminConfig(), 'utf8')); }
  catch (e) { throw new Error('configuration du serveur illisible (' + cheminConfig() + ') : l’évaluation réelle se lance sur le VPS'); }
  let v = cfg;
  for (const k of champ.split('.')) v = v && typeof v === 'object' ? v[k] : undefined;
  cfg = null;
  if (typeof v !== 'string' || !/^sk-ant-/.test(v)) throw new Error('aucune clé dans le champ « ' + champ + ' » de la configuration');
  return v;
}

/* Efface une clé de tout texte qui sort d'ici : la clé exacte, et toute chaîne qui en a la forme. */
function purger(texte, cle) {
  let t = String(texte == null ? '' : texte);
  if (cle) t = t.split(cle).join('[clé]');
  return t.replace(/sk-ant-[A-Za-z0-9_-]{6,}/g, '[clé]');
}

function repondreSimule(vars, qualite) {
  return async () => {
    const s = vars.simule && vars.simule[qualite];
    if (s === undefined || s === null) throw new Error('pas de réponse simulée « ' + qualite + ' » dans ce cas');
    const r = typeof s === 'string' ? { texte: s } : s;
    /* `[[X]]` → `{{X}}` : les cas écrivent les emplacements de rubriques de Chloé sans accolades (le moteur de gabarits de promptfoo les avalerait — voir cas/aides.js) */
    return { texte: String(r.texte || '').replace(/\[\[([A-Z_]+)\]\]/g, '{{$1}}'), actions: (r.outils || []).map((o, i) => ({ id: 'sim' + i, nom: o.nom, entree: o.entree || {} })), entree: 0, sortie: 0 };
  };
}

function repondreReel(etat) {
  const { appelerAnthropic } = require(path.join(__dirname, '..', '..', 'server', 'cerveau.js'));
  const cle = lireCle();
  etat.cle = cle;
  const modele = process.env.TEAMOP_PF_MODELE;
  return async (requete) => {
    if (modele) requete.model = modele;
    const r = await appelerAnthropic(cle, requete);
    return { texte: r.texte, actions: r.actions || [], entree: Number(r.entree) || 0, sortie: Number(r.sortie) || 0 };
  };
}

class FournisseurTeamop {
  constructor(options) { this.options = options || {}; }
  id() { return 'teamop-agents'; }

  async callApi(prompt, context) {
    const vars = (context && context.vars) || {};
    const mode = process.env.TEAMOP_PF_MODE || 'simule';
    const qualite = process.env.TEAMOP_PF_QUALITE || 'bonne';
    const etat = { cle: '' };
    try {
      if (mode !== 'simule' && mode !== 'reel') throw new Error('TEAMOP_PF_MODE doit valoir « simule » ou « reel » (reçu : ' + mode + ')');
      const repondre = mode === 'reel' ? repondreReel(etat) : repondreSimule(vars, qualite);
      let usage = { entree: 0, sortie: 0 };
      const { requete, reponse, autres } = await jouer(vars, async (req) => { const r = await repondre(req); usage = { entree: r.entree || 0, sortie: r.sortie || 0 }; return r; });
      const messages = requete.messages.map(m => '[' + m.role + '] ' + (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join('\n');
      return {
        output: ecrireSortie(reponse),
        tokenUsage: { prompt: usage.entree, completion: usage.sortie, total: usage.entree + usage.sortie },
        cost: (usage.entree * USD_ENTREE_M + usage.sortie * USD_SORTIE_M) / 1e6,
        metadata: { agent: vars.agent, canal: vars.canal, mode, qualite: mode === 'simule' ? qualite : undefined, modele: requete.model,
          autresReveilles: autres || 0, outilsOfferts: (requete.tools || []).map(t => t.name), promptCaracteres: requete.system.length + messages.length,
          /* de quoi annoncer le coût AVANT l'appel (`estimer.js`) : la même estimation que la réservation de `cerveau.js` (un jeton pour trois signes, la sortie au maximum demandé) */
          entreeEstimee: Math.ceil((JSON.stringify(requete.system).length + JSON.stringify(requete.messages).length + JSON.stringify(requete.tools || []).length) / 3), sortieMax: requete.max_tokens,
          /* le prompt réel : lu par les assertions qui comparent la réponse à ce que l'agent savait (`nombresSansInvention`), et par qui ouvre le rapport */
          promptReel: purger(requete.system + '\n\n── messages ──\n' + messages, etat.cle) }
      };
    } catch (e) {
      return { error: purger(e && e.message || e, etat.cle) };
    }
  }
}

module.exports = FournisseurTeamop;
module.exports.USD_ENTREE_M = USD_ENTREE_M;
module.exports.USD_SORTIE_M = USD_SORTIE_M;
module.exports.lireCle = lireCle;
module.exports.purger = purger;
module.exports.repondreSimule = repondreSimule;
