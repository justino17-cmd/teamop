/* MAX — la sentinelle (23 octobre 2026). Catégories de la Tour : Surveillance (et, avec Jules, Incidents).
 *
 * Justin : « je veux aussi des agents qui gèrent la surveillance, incidents ; en gros je veux des agents qui gèrent toutes les catégories de la Tour ».
 *
 * Max surveille ce que surveille déjà la surveillance horaire de GitHub — l'état de santé du serveur, ses compteurs, la sauvegarde (qu'elle tourne), Stripe
 * (qu'il soit lisible) — avec LES MÊMES SEUILS (`plateforme-regles.js`, relus par `test-2920`), mais toutes les cinq minutes et en équipe : un franchissement
 * ouvre un incident dans la Tour, est annoncé dans « Plateforme », réveille Justin (notification) s'il est critique, et se dit « rétabli » une fois revenu.
 * Le moteur (`plateforme-sentinelle.js`) tient tout cela une fois pour Max, Théo et Nina ; ce fichier-ci y ajoute ce qui est propre à Max :
 *
 * ⛔ LES INCIDENTS VENUS DES APPAREILS (de gravité haute, puis moyenne) sont SIGNALÉS à Jules — jamais lus. Le texte de `/api/monitor/report` est forgeable (la route est
 *    publique) : Max ne voit d'un incident que `incidents.faits()` — des nombres et des listes fermées — et la phrase qu'il écrit est composée ici. Le
 *    signalement est une consigne « Qui fait quoi » de Max à Jules (le serveur refuse tout texte libre vers Hugo et Margaux, pas vers Jules — et ce texte-ci
 *    est le nôtre). Une fois par incident : la mémoire de Max range ce qu'il a déjà signalé.
 * ⛔ Max n'appelle JAMAIS Claude : le code surveille. Il ne ferme, ne classe ni n'ignore aucun incident d'un client (« corrigé » envoie un courriel aux
 *    entreprises touchées, « ignoré » est à Justin).
 */
'use strict';
const sentinelle = require('./plateforme-sentinelle');
const O = require('./plateforme-outils');

const CLIENTS_PAR_PASSAGE = 2;
/* ⛔ Six incidents venus des appareils par jour au plus, signalés à Jules : la route qui les reçoit est publique, et chaque signalement consomme les plafonds de messages du fil « Plateforme »
   qui servent aussi aux vraies alarmes. Les autres restent dans la Tour (Surveillance), où ils étaient déjà. Ce plafond-là n'est PAS une limite d'agent : c'est l'anti-abus d'une route forgeable (28 octobre
   2026 : laissé à six quand la gravité moyenne a été ajoutée — la haute passe d'abord). */
const CLIENTS_PAR_JOUR = 6;
/* (28 octobre 2026, Justin : « sans limite ») Plus de fenêtre de 24 h sur l'âge de l'incident : Max regarde depuis son DERNIER PASSAGE COMPLET (`m.clientsDepuis`), qui n'avance que lorsqu'il a tout vu —
   un plafond du jour atteint, ou Max à l'arrêt, laisse le reste pour le passage d'après au lieu de le perdre au bout d'une journée. Au tout premier passage, 24 h (pas d'arriéré déversé d'un coup). */
const PREMIER_PASSAGE_MS = 24 * 3600000;
const MARGE_MS = 15 * 60000;
/* ce qu'il a signalé s'oublie tard : tant que le curseur peut encore ramener un incident, Max ne doit pas le redire */
const OUBLI_MS = 60 * 86400000;

module.exports = function agentMax(ctx) {
  const { agents, conversations, etat, incidents } = ctx;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const moteur = sentinelle(Object.assign({}, ctx, { proprio: 'max', fil: 'plateforme' }));
  if (!agents || !conversations || !etat || !incidents) return moteur;

  async function clients() {
    const m = etat.agent('max');
    if (!m.clientsVus || typeof m.clientsVus !== 'object' || Array.isArray(m.clientsVus)) m.clientsVus = {};
    const now = maintenant();
    for (const k of Object.keys(m.clientsVus)) if (now - m.clientsVus[k] > OUBLI_MS) delete m.clientsVus[k];
    let dits = 0;
    const jour = O.jourParis(now);
    if (!m.clientsJour || m.clientsJour.j !== jour) m.clientsJour = { j: jour, n: 0 };
    /* une marge de quinze minutes derrière le curseur : un incident daté de l'événement (le paiement refusé porte l'heure de Stripe) peut être inscrit un peu après sa date — `clientsVus` empêche de le redire */
    const depuis = m.clientsDepuis > 0 ? m.clientsDepuis - MARGE_MS : now - PREMIER_PASSAGE_MS;
    let toutVu = true;
    for (const id of incidents.clientsHauts(depuis, { moyenne: true })) {
      if (m.clientsVus[id]) continue;
      if (dits >= CLIENTS_PAR_PASSAGE || m.clientsJour.n >= CLIENTS_PAR_JOUR) { toutVu = false; break; }
      if (!agents.peutAgir('max').ok) { toutVu = false; break; }
      const f = incidents.faits(id);
      if (!f) continue;
      const nbEnt = f.entreprises, qui = nbEnt === 0 ? 'sans entreprise identifiée' : 'chez ' + nbEnt + ' ' + O.pluriel(nbEnt, 'entreprise', 'entreprises');
      const grav = f.gravite === 'moyenne' ? 'moyenne' : 'haute';
      const tache = 'Incident venu des appareils [' + id + '] : ' + f.occurrences + ' occurrences, ' + qui + ', catégorie ' + f.categorie + ', gravité ' + grav;
      let c = { ok: false }; try { c = agents.consigner('max', 'jules', tache); } catch (e) { c = { ok: false }; }
      /* hors des heures de travail Jules ne peut pas prendre la consigne : Max PRÉVIENT (c'est l'astreinte), l'incident reste dans la Tour, et Jules le voit à l'ouverture */
      const texte = 'Un incident de gravité ' + grav + ' vient d’arriver des appareils : ' + f.occurrences + ' ' + O.pluriel(f.occurrences, 'occurrence', 'occurrences') + ', ' + qui + ', catégorie ' + f.categorie + '.' +
        (c.ok ? ' Je le passe à Jules.' : c.raison === 'hors_heures' ? ' Jules est hors des heures de travail : l’incident l’attend dans la Tour (Incidents).' : '');
      const d = conversations.parler('max', 'plateforme', texte, { niveau: 'info' });
      if (d.ok || d.raison === 'doublon') { m.clientsVus[id] = now; m.clientsJour.n++; dits++; try { agents.noter('max', 'incident client signalé', { cible: id, resultat: 'ok', detail: f.categorie }); } catch (e) {} }
      else toutVu = false;   // (gardien) le fil a refusé (plafond…) : l'incident n'est pas dit — le repère n'avance pas, il sera retenté
    }
    if (toutVu) m.clientsDepuis = now;
    if (dits || toutVu) etat.sauver();
    return dits;
  }

  async function passer() {
    const r = await moteur.passer();
    if (r && !r.saute) { try { r.clients = await clients(); } catch (e) { r.clients = 0; } }
    return r;
  }
  return Object.assign({}, moteur, { passer });
};
module.exports.CLIENTS_PAR_PASSAGE = CLIENTS_PAR_PASSAGE;
module.exports.CLIENTS_PAR_JOUR = CLIENTS_PAR_JOUR;
