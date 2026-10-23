/* LA MÉMOIRE DES AGENTS DE LA PLATEFORME (23 octobre 2026) — ce qu'ils ont déjà dit, pour ne le dire qu'UNE fois.
 *
 * Justin : « je veux des agents qui gèrent la surveillance, incidents… comme une vraie équipe d'entreprise ». Un collègue qui répète la même alarme
 * toutes les cinq minutes n'est pas un collègue, c'est une sirène. Ce fichier tient la notion d'ÉPISODE : une règle de la sentinelle
 * (`plateforme-regles.js`) qui se déclenche ouvre un épisode, il est ANNONCÉ une seule fois, et quand la condition a disparu pendant deux passages de suite
 * il est « rétabli » — dit une seule fois, lui aussi.
 *
 * ⛔ UN ÉPISODE NE S'ANNONCE QUE QUAND L'ANNONCE EST PARTIE. L'agent appelle `marquer(id, { annonce: true })` APRÈS un `parler` réussi : un message refusé
 *    (plafond d'heure, fil illisible) laisse l'épisode « à annoncer », et le passage suivant réessaie. Le contraire — marquer d'abord — fait taire pour
 *    toujours une panne que personne n'a entendue.
 * ⛔ DEUX PASSAGES CLAIRS, PAS UN. Un compteur qui frôle son seuil (`bugs1h`, un p95) ne doit pas faire alterner « panne » et « rétabli » toutes les cinq
 *    minutes. Un épisode clos dont le rétabli n'a pas encore été dit se ROUVRE s'il revient : le retour est absorbé, personne n'est prévenu deux fois.
 * ⛔ ILLISIBLE = ON NE SAIT PAS : sans mémoire de ce qui a été dit, on recommencerait à chaque passage. Le fichier est écrit par un temporaire puis un
 *    renommage (`agents-fichier.js`), jamais par-dessus un fichier qu'on n'a pas su lire — et `illisible()` le dit aux agents, qui se taisent (la Tour le
 *    montre).
 * ⛔ AUCUN TEXTE LIBRE NE SE RANGE ICI : des identifiants, des nombres, des dates, des booléens. Les phrases sont recomposées par le code à chaque lecture.
 */
'use strict';
const crypto = require('crypto');

const F = 'agents-plateforme.json';
const CLAIRS_MIN = 2;                       // passages clairs de suite avant de dire « rétabli »
const HISTORIQUE_PAR_REGLE = 30;            // les épisodes passés qu'on garde, par règle (les récidives se comptent là-dessus)
const EPISODES_MAX = 200;                   // bornes : une règle qui bat la mesure ne remplit pas le disque
const JOUR = 86400000;
const CHAMPS = ['annonce', 'prive', 'incident', 'incidentFerme', 'retabliDit', 'pris', 'diagnostic', 'consigne', 'dernierRappel', 'incidentRefuse', 'sourdine'];

module.exports = function etatPlateforme(ctx) {
  const fichier = ctx.fichier;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const S = fichier.charger(F, { v: 1, episodes: {}, historique: {}, agents: {} });
  const forme = o => o !== null && typeof o === 'object' && !Array.isArray(o);
  if (!forme(S.episodes)) S.episodes = {};
  if (!forme(S.historique)) S.historique = {};
  if (!forme(S.agents)) S.agents = {};
  const illisible = () => fichier.illisible(F);
  const sauver = () => fichier.ecrire(F, S);
  const copie = e => Object.assign({}, e, { valeurs: Object.assign({}, e.valeurs) });

  /* la mémoire libre d'un agent (dernier passage, compteurs du jour…) : un objet vivant, à ranger puis `sauver()` */
  function agent(id) { if (!forme(S.agents[id])) S.agents[id] = {}; return S.agents[id]; }

  const vivants = () => Object.values(S.episodes).filter(e => forme(e) && !e.fin);
  const vivant = (proprio, cle) => vivants().find(e => e.proprio === proprio && e.cle === cle) || null;

  /* Un passage d'un propriétaire : `actives` est la Map rendue par `evaluer()` (cle → { niveau, zone, valeurs }). Rend
     { nouveaux, retablis } — les épisodes à ANNONCER (jamais annoncés, ou dont l'annonce n'est pas partie) et à dire RÉTABLIS ; ou `null` si la mémoire est
     illisible (on ne sait pas : on ne dit rien). */
  function suivre(proprio, actives) {
    if (illisible() || !(actives instanceof Map)) return null;
    const now = maintenant();
    const nouveaux = [];
    for (const [cle, a] of actives) {
      let e = vivant(proprio, cle);
      if (!e) {
        /* un épisode clos dont le « rétabli » n'a pas été dit : il revient, on le rouvre — le retour est absorbé */
        e = Object.values(S.episodes).find(x => forme(x) && x.proprio === proprio && x.cle === cle && x.fin && !x.retabliDit) || null;
        if (e) { e.fin = 0; e.clairs = 0; }
      }
      if (!e) {
        if (Object.keys(S.episodes).length >= EPISODES_MAX) continue;      // borne dure : une règle qui bat la mesure ne remplit pas le fichier
        e = { id: 'e' + crypto.randomBytes(5).toString('hex'), proprio, cle, zone: a.zone, niveau: a.niveau, depuis: now, valeurs: a.valeurs || {}, passes: 1, clairs: 0, fin: 0,
          annonce: false, prive: false, incident: '', incidentFerme: false, retabliDit: false };
        S.episodes[e.id] = e;
      } else { e.clairs = 0; e.passes = (e.passes || 0) + 1; e.valeurs = a.valeurs || {}; e.niveau = a.niveau; }
      /* à DIRE : jamais annoncé, ou critique dont le message à Justin (qui le notifie) n'est pas parti */
      if (!e.annonce || (e.niveau === 'critique' && !e.prive)) nouveaux.push(copie(e));
    }
    for (const e of vivants()) {
      if (e.proprio !== proprio || actives.has(e.cle)) continue;
      e.clairs = (e.clairs || 0) + 1;
      if (e.clairs >= CLAIRS_MIN) e.fin = now;
    }
    /* un épisode clos qui n'a jamais été annoncé n'a rien à « rétablir » : il se referme sans un mot */
    for (const e of Object.values(S.episodes)) if (forme(e) && e.proprio === proprio && e.fin && !e.annonce && !e.retabliDit) e.retabliDit = true;
    /* …et un épisode refermé sans un mot dont l'incident n'a jamais été ouvert n'a plus de raison de rester */
    for (const e of Object.values(S.episodes)) if (forme(e) && e.proprio === proprio && e.fin && e.retabliDit && !e.incident) delete S.episodes[e.id];
    const retablis = Object.values(S.episodes).filter(e => forme(e) && e.proprio === proprio && e.fin && e.annonce && !e.retabliDit).map(copie);
    sauver();
    return { nouveaux, retablis };
  }

  /* Ranger ce qu'un agent vient de FAIRE (annoncé, incident ouvert, rétabli dit…) : seuls les champs de `CHAMPS`. */
  function marquer(id, champs) {
    const e = S.episodes[id];
    if (!forme(e) || !forme(champs)) return false;
    for (const k of Object.keys(champs)) if (CHAMPS.includes(k)) e[k] = champs[k];
    /* terminé : annoncé rétabli (ou jamais annoncé), incident fermé — l'épisode passe à l'historique */
    if (e.fin && e.retabliDit && (e.incidentFerme || !e.incident)) {
      const h = S.historique[e.cle] = (Array.isArray(S.historique[e.cle]) ? S.historique[e.cle] : []);
      if (e.annonce) h.push({ depuis: e.depuis, fin: e.fin, niveau: e.niveau });
      if (h.length > HISTORIQUE_PAR_REGLE) S.historique[e.cle] = h.slice(-HISTORIQUE_PAR_REGLE);
      delete S.episodes[id];
    }
    return sauver();
  }

  /* Les épisodes d'un propriétaire (ou de tous) : en cours, ou clos mais pas encore refermés (incident à fermer, rétabli à dire). */
  const episodes = proprio => Object.values(S.episodes).filter(e => forme(e) && (!proprio || e.proprio === proprio)).map(copie);
  const ouverts = proprio => episodes(proprio).filter(e => !e.fin);
  const aFermer = () => episodes().filter(e => e.fin && e.incident && !e.incidentFerme);
  /* Combien de fois cette règle s'est déjà déclenchée sur les `jours` derniers jours (l'épisode en cours compris s'il date de moins que ça) ? */
  function recidives(cle, jours) {
    const lim = maintenant() - (jours || 30) * JOUR;
    const h = Array.isArray(S.historique[cle]) ? S.historique[cle] : [];
    return h.filter(x => x && x.depuis >= lim).length + (Object.values(S.episodes).some(e => forme(e) && e.cle === cle && e.depuis >= lim) ? 1 : 0);
  }
  /* Les `n` derniers épisodes passés de toutes les règles, du plus récent au plus ancien : [{ cle, depuis, fin, niveau }] — pour les chiffres de la semaine. */
  function passes(depuis) {
    const sortie = [];
    for (const cle of Object.keys(S.historique)) for (const x of (Array.isArray(S.historique[cle]) ? S.historique[cle] : [])) if (x && x.fin >= depuis) sortie.push(Object.assign({ cle }, x));
    return sortie.sort((a, b) => b.fin - a.fin);
  }

  return { illisible, agent, suivre, marquer, episodes, ouverts, aFermer, recidives, passes, sauver, vivant: (p, c) => { const e = vivant(p, c); return e ? copie(e) : null; }, CLAIRS_MIN };
};
module.exports.F = F;
module.exports.CLAIRS_MIN = CLAIRS_MIN;
