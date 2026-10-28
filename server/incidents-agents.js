/* LE REGISTRE DES INCIDENTS, VU PAR LES AGENTS (23 octobre 2026) — Max en ouvre, Jules les prend et les ferme, Victor les compte.
 *
 * Le registre est celui de la Tour (`monIssues`, `monitor.json`) : les incidents de Max sont des incidents comme les autres, dans la même liste, avec les
 * mêmes écrans. Ce module n'en possède RIEN : il reçoit `lire()` (la liste VIVANTE — `monPurge` la réaffecte, on ne garde donc jamais la référence) et
 * `sauver()` (`monSave`, différée).
 *
 * ⛔ LE TEXTE D'UN INCIDENT DE LA TOUR EST FORGEABLE : `/api/monitor/report` est publique, `message`, `stack`, `src`, `origine`, le nom d'une entreprise et
 *    ses gens viennent de l'extérieur. Rien de cela ne sort de ce module vers un agent : `faits()` et `compteurs()` ne rendent que des NOMBRES et des
 *    valeurs de LISTES FERMÉES (`APPS`, `CATEGORIES`, `TYPES`, `GRAVITES`, `STATUTS`, `TRIAGES`). L'inverse est vrai aussi : le texte d'un incident que NOUS
 *    ouvrons (`ouvrir`) est composé par nous, d'après une règle (`plateforme-regles.js`) — aucune chaîne d'un client ne le traverse.
 * ⛔ UN INCIDENT D'AGENT NE PRÉVIENT JAMAIS UN CLIENT. `entreprises` est vide : passer « corrigé » depuis la Tour n'envoie aucun courriel (la route n'écrit
 *    qu'aux entreprises listées), et `fermer()` ne pose que le statut — jamais le courriel. Et `fermer()` REFUSE un incident venu d'un appareil : « corrigé »
 *    envoie un courriel aux entreprises touchées, c'est un jugement de Justin.
 * ⛔ UN INCIDENT « IGNORÉ » PAR JUSTIN LE RESTE : un agent ne le rouvre, ne le reprend et ne le ferme pas.
 * Les statuts, l'historique et `par` sont ceux de `/api/monitor/status` : la Tour les lit tels quels.
 */
'use strict';
const crypto = require('crypto');

const APPS = ['opgestion', 'opmessages', 'espace', 'stripe', 'serveur'];
const CATEGORIES = ['Tableau de bord', 'Planning', 'Interventions', 'Clients', 'Rapports', 'Devis & Factures', 'Comptabilité', 'Stock', 'Plans', 'Commandes', 'Véhicules',
  'Historique', 'Équipe', 'Paramètres', 'Messages', 'Statistiques', 'Paiements', 'Général'];
const TYPES = ['erreur', 'lenteur', 'reseau'];
const GRAVITES = ['haute', 'moyenne', 'faible'];
const STATUTS = ['nouveau', 'encours', 'corrige', 'ignore'];
const TRIAGES = ['', 'veille', 'interne', 'transitoire'];
const AUTEURS = ['max', 'theo', 'nina'];       // les agents qui ouvrent des incidents (leurs règles : `plateforme-regles.js`)
const MESSAGE_MAX = 300;
const HEURE = 3600000;

/* La gravité telle que la Tour la calcule dans le navigateur (`gravite(i)` de tour.html) : la même règle, côté serveur, pour qu'un agent et un écran
   parlent de la même chose. Un incident d'agent porte la sienne (`gravite`). */
function gravite(i) {
  if (i && GRAVITES.includes(i.gravite) && AUTEURS.includes(i.agent)) return i.gravite;
  const nbEnt = Array.isArray(i && i.entreprises) ? i.entreprises.length : 0;
  const count = Number(i && i.count) || 0;
  if (i && i.type === 'erreur') return (count >= 10 || nbEnt >= 3) ? 'haute' : 'moyenne';
  if (i && i.type === 'lenteur') return 'moyenne';
  return count >= 10 ? 'haute' : (count >= 3 ? 'moyenne' : 'faible');
}

/* ⛔ UN INCIDENT D'APPAREIL N'EST « CORROBORÉ » QUE PAR CE QUE LE SERVEUR A VÉRIFIÉ LUI-MÊME. `/api/monitor/report` est publique : le type, le nombre d'occurrences, le nom d'une entreprise sont
   écrits par l'appelant (revue du 23 octobre 2026 : 30 incidents « haute » forgés d'une requête, 10 push à Justin). La seule trace qu'un rapport vient d'une vraie session est une PERSONNE
   (`gens`) que le journal des connexions de l'espace connaît — le serveur ne la retient que contre ce journal. Corroboré = au moins trois entreprises nommées ET une personne vérifiée. Ce qui ne l'est
   pas se voit dans la Tour et se dit en « info » : cela ne sonne pas sur un téléphone et ne rend pas le point du matin urgent. */
function corrobore(i) {
  const ents = Array.isArray(i && i.entreprises) ? i.entreprises : [];
  return ents.length >= 3 && ents.some(e => e && Array.isArray(e.gens) && e.gens.length > 0);
}

module.exports = function incidentsAgents(ctx) {
  const lire = typeof ctx.lire === 'function' ? ctx.lire : (() => []);
  const sauver = typeof ctx.sauver === 'function' ? ctx.sauver : (() => {});
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const liste = () => { const l = lire(); return Array.isArray(l) ? l : []; };
  const trouver = id => liste().find(i => i && i.id === id) || null;
  const propre = (t, n) => String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const historique = (i, par, action, note) => { i.historique = (Array.isArray(i.historique) ? i.historique : []).concat([{ ts: maintenant(), par, action, note: propre(note, 300) }]).slice(-30); };
  const ouvert = i => i.statut === 'nouveau' || i.statut === 'encours';
  const estNotre = i => !!i && AUTEURS.includes(i.agent);

  /* Ouvrir l'incident d'un épisode. `signature` porte l'identifiant de l'épisode : un épisode = un incident, et un retour de la même règle un autre jour en
     ouvre un NEUF (le premier reste dans l'historique, corrigé). Idempotent : la même signature rend le même incident. */
  function ouvrir(o) {
    o = o && typeof o === 'object' ? o : {};
    if (!AUTEURS.includes(o.agent)) return { ok: false, raison: 'agent' };
    const signature = propre(o.signature, 120);
    const message = propre(o.message, MESSAGE_MAX);
    if (!signature || !message) return { ok: false, raison: 'texte' };
    const deja = liste().find(i => i && i.signature === signature);
    if (deja) return { ok: true, id: deja.id, deja: true };
    const t = maintenant();
    const i = { id: 'i' + crypto.randomBytes(6).toString('hex'), signature, app: 'serveur', version: '', categorie: CATEGORIES.includes(o.categorie) ? o.categorie : 'Général',
      type: TYPES.includes(o.type) ? o.type : 'reseau', message, stack: '', src: '', line: 0, entreprises: [], appareils: {}, count: 1, firstTs: t, lastTs: t,
      statut: 'nouveau', notes: '', mailEnvoye: false, agent: o.agent, gravite: GRAVITES.includes(o.gravite) ? o.gravite : 'moyenne', regle: propre(o.regle, 40) };
    historique(i, o.agent, 'Ouvert par l’agent', '');
    liste().push(i);
    sauver();
    return { ok: true, id: i.id, deja: false };
  }

  /* L'agent reprend l'incident : « en cours », avec son nom. Un incident déjà traité par une personne (en cours sous un autre nom, corrigé, ignoré) ne
     change pas — on ne reprend pas le travail de Justin. */
  function prendre(id, par, nom) {
    const i = trouver(id);
    if (!i) return { ok: false, raison: 'introuvable' };
    if (!estNotre(i)) return { ok: false, raison: 'pas_a_nous' };
    if (i.statut !== 'nouveau') return { ok: true, deja: true };
    i.statut = 'encours'; i.par = propre(nom || par, 40);
    historique(i, i.par, 'Prise en charge', '');
    sauver();
    return { ok: true };
  }

  /* Le dernier mot d'un incident d'agent : « corrigé », sans courriel (aucune entreprise n'y est listée). Refusé pour un incident venu d'un appareil. */
  function fermer(id, nom, note) {
    const i = trouver(id);
    if (!i) return { ok: false, raison: 'introuvable' };
    if (!estNotre(i)) return { ok: false, raison: 'pas_a_nous' };
    if (i.statut === 'corrige') return { ok: true, deja: true };
    if (i.statut === 'ignore') return { ok: true, deja: true, ignore: true };
    i.statut = 'corrige'; i.par = propre(nom, 40);
    if (note) i.notes = ((i.notes ? i.notes + '\n' : '') + propre(note, 300)).slice(-1000);
    historique(i, i.par, 'Marqué corrigé', note);
    sauver();
    return { ok: true };
  }

  /* L'incident est-il encore ouvert, et à qui ? (`ok` faux = introuvable : l'appelant ne ferme pas ce qu'il ne voit pas.) */
  function etat(id) {
    const i = trouver(id);
    return i ? { ok: true, statut: STATUTS.includes(i.statut) ? i.statut : 'nouveau' } : { ok: false };
  }

  const dansListe = (v, l, defaut) => (l.includes(v) ? v : defaut);
  /* Les FAITS d'un incident : des nombres et des valeurs de listes fermées. Jamais `message`, `stack`, `src`, `origine`, une entreprise, une personne, une note. */
  function faits(id) {
    const i = trouver(id);
    if (!i) return null;
    const t = maintenant();
    return { notre: estNotre(i), app: dansListe(i.app, APPS, 'serveur'), categorie: dansListe(i.categorie, CATEGORIES, 'Général'), type: dansListe(i.type, TYPES, 'erreur'),
      gravite: gravite(i), statut: dansListe(i.statut, STATUTS, 'nouveau'), triage: dansListe(i.triage || '', TRIAGES, ''), occurrences: Number(i.count) || 0,
      entreprises: Array.isArray(i.entreprises) ? i.entreprises.length : 0, appareils: i.appareils && typeof i.appareils === 'object' ? Object.keys(i.appareils).length : 0,
      ageH: Math.max(0, Math.round((t - (i.firstTs || t)) / HEURE)), dernierH: Math.max(0, Math.round((t - (i.lastTs || t)) / HEURE)), courrielEnvoye: i.mailEnvoye === true,
      corrobore: estNotre(i) || corrobore(i) };
  }

  /* Les compteurs de la file : tout ce que Victor et Inès ont le droit de dire de la Surveillance. */
  function compteurs() {
    const t = maintenant();
    const l = liste().filter(i => i && typeof i === 'object');
    const ouverts = l.filter(ouvert), hauts = ouverts.filter(i => gravite(i) === 'haute');
    const sansPar = ouverts.filter(i => i.statut === 'nouveau' && !i.par && !i.triage);
    const plus = sansPar.reduce((m, i) => Math.max(m, t - (i.firstTs || t)), 0);
    const parApp = {}; for (const a of APPS) parApp[a] = ouverts.filter(i => i.app === a).length;
    return { ouverts: ouverts.length, haute: hauts.length, hauteSure: hauts.filter(i => estNotre(i) || corrobore(i)).length, nouveau: ouverts.filter(i => i.statut === 'nouveau').length, sansPersonne: sansPar.length,
      plusVieuxSansPersonneH: Math.round(plus / HEURE), corriges30j: l.filter(i => i.statut === 'corrige' && (i.lastTs || 0) >= t - 30 * 86400000).length, parApp };
  }

  /* Les incidents venus des appareils qu'un agent peut vouloir regarder : nouveaux, ni en veille ni internes ni passagers, apparus depuis `depuis`. « haute » d'abord ; `moyenne` aussi quand
     l'appelant le demande (`o.moyenne`, 28 octobre 2026 : Justin, « sans limite » — une gravité moyenne n'était jamais signalée à personne, tant qu'elle ne montait pas d'elle-même). Pas de coupe : le
     plafond est celui de l'appelant (par passage et par jour). Rend des IDENTIFIANTS (les faits se lisent un à un par `faits`) — jamais un objet de la liste. */
  function clientsHauts(depuis, o) {
    const moyenne = !!(o && o.moyenne);
    const l = liste().filter(i => i && !estNotre(i) && i.statut === 'nouveau' && !i.triage && (i.firstTs || 0) >= (depuis || 0));
    const hauts = l.filter(i => gravite(i) === 'haute'), moyens = moyenne ? l.filter(i => gravite(i) === 'moyenne') : [];
    return hauts.concat(moyens).map(i => i.id);
  }

  return { ouvrir, prendre, fermer, etat, faits, compteurs, clientsHauts, gravite };
};
module.exports.gravite = gravite;
module.exports.corrobore = corrobore;
module.exports.APPS = APPS;
module.exports.CATEGORIES = CATEGORIES;
