/* JULES — les incidents (23 octobre 2026). Catégories de la Tour : Incidents (et, avec Max, Surveillance).
 *
 * Justin : « je veux aussi des agents qui gèrent la surveillance, incidents… ». Quand Max ouvre un incident, Jules le PREND (« Qui fait quoi » : une consigne
 * de Max à Jules, et l'incident passe « en cours » à son nom), lit les FAITS fermés (la règle, la zone, les compteurs, depuis quand, combien de fois ces trente
 * derniers jours — jamais un texte forgeable), propose à Justin un diagnostic et un correctif, et FERME l'incident quand les compteurs sont revenus.
 *
 * ⛔ UN DIAGNOSTIC EST UNE PROPOSITION. Jules ne touche à aucun code, ne lance aucune commande, n'ouvre aucune demande de fusion (« pas de GitHub pour l'instant ») :
 *    il écrit à Justin ce qu'il pense et ce qu'il ferait, et c'est Justin qui agit. Le message ne dit jamais « j'ai corrigé ».
 * ⛔ CE QUI PART CHEZ CLAUDE : le nom de la règle (une clé de NOTRE table), sa zone, son niveau, des nombres, les autres règles actives (des clés) et les PISTES
 *    écrites par nous (`plateforme-regles.js`). Rien de plus : pas un incident de la Tour, pas un message d'erreur, pas une entreprise. `fait()` est la seconde
 *    barrière — une chaîne qui n'est pas d'une liste fermée devient `null`.
 * ⛔ LE MODÈLE NE JUGE QUE QUAND IL Y A QUELQUE CHOSE DE NEUF : un appel par incident pris (six par jour au plus). Sans clé, plafond atteint ou panne de l'API,
 *    Jules écrit lui-même les pistes du runbook — un incident n'attend jamais le modèle. Fermer et reprendre sont du CODE, sans appel.
 * ⛔ IL NE FERME QUE LES INCIDENTS DE L'ÉQUIPE (Max, Théo, Nina). Un incident venu d'un appareil, il le lit en faits fermés, il explique comment avancer dans la Tour
 *    (« Expliquer », puis « Proposer une correction » : une demande de fusion en brouillon que Justin valide) — mais passer un incident client en « corrigé »
 *    envoie un courriel aux entreprises touchées : c'est le jugement de Justin, et `incidents-agents.js` le refuse.
 * Toutes les dépendances sont INJECTÉES.
 */
'use strict';
const R = require('./plateforme-regles');
const O = require('./plateforme-outils');
const AC = require('./agent-conversation');

const ID = 'jules';
const DIAGNOSTICS_PAR_JOUR = 6;
const PRISES_PAR_PASSAGE = 2;
const CLIENTS_PAR_PASSAGE = 2;
/* ⛔ Un incident venu des appareils ne SONNE sur le téléphone de Justin que s'il est corroboré (`incidents-agents.js`), et trois fois par jour au plus : la route qui les reçoit est publique. */
const SONNERIES_CLIENTS_PAR_JOUR = 3;
const ID_INCIDENT = /\[(i[0-9a-f]{12})\]/;
const ARRET_LIB = AC.CAUSES;

const masquer = t => AC.sansTel(String(t == null ? '' : t).replace(AC.ADRESSE, '(adresse)'));

module.exports = function agentJules(ctx) {
  const { agents, conversations, cerveau, etat, incidents } = ctx;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const equipe = () => (typeof ctx.equipe === 'function' ? ctx.equipe() : ctx.equipe) || null;
  if (!agents || !conversations || typeof conversations.parler !== 'function' || !etat || !incidents) return { passer: async () => ({ saute: 'pas_de_dependances' }), etat: () => ({}) };
  const nomDe = id => ((agents.AGENTS || []).find(a => a.id === id) || {}).nom || id;
  const note = (action, o) => { try { agents.noter(ID, action, o); } catch (e) {} };
  const titreDe = e => O.cap(R.texteDe(e.cle, e.valeurs) || e.cle);

  /* ── ce que Claude lit : des clés de NOS tables, des nombres ── */
  const CLES = new Set([...R.PAR_CLE.keys(), ...R.ZONES, ...R.NIVEAUX]);
  function fait(v, prof) {
    prof = prof || 0;
    if (prof > 3) return null;
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') return CLES.has(v) ? v : null;
    if (Array.isArray(v)) return v.slice(0, 12).map(x => fait(x, prof + 1));
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).slice(0, 20)) if (/^[a-z_]{1,30}$/.test(k)) o[k] = fait(v[k], prof + 1); return o; }
    return null;
  }
  function faitsEpisode(e) {
    const autres = etat.ouverts().filter(x => x.cle !== e.cle).map(x => x.cle).slice(0, 10);
    return fait({ regle: e.cle, zone: e.zone, niveau: e.niveau, depuis_minutes: Math.max(0, Math.round((maintenant() - e.depuis) / 60000)), valeurs: e.valeurs,
      recidives_mois: etat.recidives(e.cle, 30), autres_regles_actives: autres });
  }

  function systemDiag(e) {
    const eq = equipe();
    const base = eq && typeof eq.systemDe === 'function' ? eq.systemDe(ID) : 'Tu es Jules, l’agent « Maintenance dev » de Team OP. Tu parles à Justin, le fondateur, que tu tutoies, en français, avec des phrases courtes et concrètes.';
    const r = R.PAR_CLE.get(e.cle);
    return base + '\n\nDIAGNOSTIC D’INCIDENT. Tu écris à Justin, dans ton fil privé, ce que tu penses d’un incident que la surveillance vient d’ouvrir. Dans ce message tu n’as AUCUN outil : tu écris, c’est tout. ' +
      'Les faits ci-dessous sont relevés par le serveur ; les PISTES sont les notes de l’équipe pour cette alarme. Tu ne cites que ces éléments. Ne répète aucune adresse électronique ni aucun numéro de téléphone.\n' +
      'Dis, en 450 caractères au plus, sans titre ni liste à puces : (1) l’hypothèse la plus probable d’après les faits, et ce qui la rendrait fausse ; (2) ce que tu proposes de faire, dans l’ordre — des commandes à lancer sur le serveur si utile, JAMAIS une commande qui affiche un secret ; (3) ce que Justin doit trancher, s’il y a lieu. ' +
      'Tu ne dis jamais que tu as corrigé ou lancé quoi que ce soit : tu proposes, Justin décide.\n' +
      'Alarme : ' + R.texteDe(e.cle, e.valeurs) + '\nPistes de l’équipe : ' + (r ? r.pistes : 'aucune') + '\nFaits : ' + JSON.stringify(faitsEpisode(e));
  }

  /* Le jour (Paris) et les appels du jour : un compteur rangé avec la mémoire de Jules */
  function appelsDuJour() {
    const m = etat.agent(ID), j = O.jourParis(maintenant());
    if (!m.jour || m.jour.j !== j) m.jour = { j, n: 0 };
    return m.jour;
  }

  /* Le diagnostic d'un incident de l'équipe : Claude s'il peut, sinon les pistes du runbook. Rend { texte, modele:boolean, cause } */
  async function diagnostiquer(e) {
    const r = R.PAR_CLE.get(e.cle);
    const secours = cause => ({ modele: false, cause: cause || '', texte: (cause && ARRET_LIB[cause] ? 'Je n’ai pas pu réfléchir avec Claude (' + ARRET_LIB[cause] + '), voici les pistes de l’équipe : ' : 'Pistes de l’équipe : ') + (r ? r.pistes : 'à regarder dans le journal du serveur.') });
    if (!cerveau || typeof cerveau.penser !== 'function') return secours('');
    const jour = appelsDuJour();
    if (jour.n >= DIAGNOSTICS_PAR_JOUR) return secours('');
    jour.n++; etat.sauver();
    let rep;
    try { rep = await cerveau.penser(ID, systemDiag(e), [{ role: 'user', content: 'Voici l’incident à diagnostiquer : écris ton message à Justin.' }], { reflechir: true }); }
    catch (x) { return secours('erreur_api'); }
    if (!rep || !rep.ok || !rep.texte) return secours(rep && rep.raison);
    return { modele: true, cause: '', texte: rep.texte };
  }

  const parler = (fil, texte, niveau) => { try { return conversations.parler(ID, fil, texte, { niveau }); } catch (x) { return { ok: false, raison: 'erreur' }; } };
  const dit = d => d.ok || d.raison === 'doublon';

  /* ── 1. FERMER : l'épisode est fini, les compteurs sont revenus ── */
  function fermer() {
    let n = 0;
    for (const e of etat.aFermer()) {
      if (!agents.peutAgir(ID).ok) break;
      const f = incidents.fermer(e.incident, nomDe(ID), 'Rétabli à ' + O.heureParis(e.fin) + ' : les compteurs sont revenus à la normale (« ' + titreDe(e).slice(0, 90) + ' »).');
      if (!f.ok && f.raison !== 'introuvable') { note('incident fermé', { cible: e.cle, resultat: 'refuse', detail: f.raison }); continue; }
      if (e.consigne) { try { agents.terminer(e.consigne, ID, 'ok', 'Incident fermé : les compteurs sont revenus à la normale'); } catch (x) {} }
      etat.marquer(e.id, { incidentFerme: true });
      note('incident fermé', { cible: e.cle, resultat: 'ok', detail: f.ignore ? 'ignoré par Justin' : e.niveau });
      n++;
      /* une ligne dans « Plateforme » pour ce qui comptait ; les petits incidents se ferment sans bruit */
      if (!f.ignore && (e.niveau === 'critique' || e.niveau === 'important')) {
        const duree = Math.max(1, Math.round(((e.fin || maintenant()) - e.depuis) / 60000));
        parler('plateforme', 'J’ai fermé l’incident « ' + titreDe(e).slice(0, 110) + ' » : les compteurs sont revenus à la normale, ça a duré ' + (duree >= 90 ? Math.round(duree / 60) + ' h' : duree + ' min') + '.', 'info');
      }
    }
    return n;
  }

  /* ── 2. PRENDRE les incidents de l'équipe qui viennent de s'ouvrir ── */
  async function prendre() {
    let n = 0;
    const m = etat.agent(ID); if (!m.diagnostics || typeof m.diagnostics !== 'object' || Array.isArray(m.diagnostics)) m.diagnostics = {};
    for (const e of etat.ouverts().filter(x => x.incident && !x.fin)) {
      if (n >= PRISES_PAR_PASSAGE) break;
      if (!agents.peutAgir(ID).ok) break;
      if (!e.pris) {
        const p = incidents.prendre(e.incident, ID, nomDe(ID));
        if (!p.ok && p.raison !== 'introuvable') { note('incident pris', { cible: e.cle, resultat: 'refuse', detail: p.raison }); continue; }
        let consigne = '';
        try { const c = agents.consigner(e.proprio, ID, 'Incident ouvert par ' + nomDe(e.proprio) + ' : ' + titreDe(e)); if (c.ok) consigne = c.id; } catch (x) {}
        etat.marquer(e.id, { pris: true, consigne }); e.pris = true; e.consigne = consigne;
        note('incident pris', { cible: e.cle, resultat: 'ok', detail: e.niveau });
        n++;
      }
      if (!e.diagnostic) {
        /* le texte est rangé tant qu'il n'est pas PARTI : un message refusé ne coûte pas un second appel à Claude */
        let texte = m.diagnostics[e.id] && m.diagnostics[e.id].texte;
        if (!texte) {
          const d = await diagnostiquer(e);
          texte = AC.raccourcir(masquer('À propos de l’incident « ' + titreDe(e).slice(0, 100) + ' » : ' + d.texte));
          m.diagnostics[e.id] = { texte, modele: d.modele }; etat.sauver();
        }
        const envoi = parler(ID, texte, e.niveau === 'critique' ? 'important' : 'info');
        if (dit(envoi)) {
          delete m.diagnostics[e.id];
          etat.marquer(e.id, { diagnostic: true });
          parler('plateforme', 'Je prends l’incident « ' + titreDe(e).slice(0, 110) + ' ». Mon diagnostic est dans mon fil avec Justin.', 'info');
          note('diagnostic proposé', { cible: e.cle, resultat: 'propose', detail: e.niveau });
        } else note('diagnostic proposé', { cible: e.cle, resultat: 'refuse', detail: envoi.raison });
      }
    }
    return n;
  }

  /* ── 3. LES INCIDENTS VENUS DES APPAREILS que Max m'a signalés : des FAITS, et le chemin à suivre dans la Tour ── */
  function clients() {
    let n = 0;
    const m = etat.agent(ID); if (!m.clients || typeof m.clients !== 'object' || Array.isArray(m.clients)) m.clients = {};
    let taches = []; try { taches = agents.tachesDe(ID); } catch (x) { taches = []; }
    for (const t of taches) {
      const id = t.type === 'consigne' && t.de === 'max' && ID_INCIDENT.exec(String(t.texte || ''));
      if (!id) continue;
      const iid = id[1], s = incidents.etat(iid);
      /* l'incident n'est plus à traiter (corrigé, ignoré, purgé) : la tâche se termine */
      if (!s.ok || s.statut === 'corrige' || s.statut === 'ignore') { try { agents.terminer(t.id, ID, 'ok', 'Incident traité par Justin'); } catch (x) {} delete m.clients[iid]; continue; }
      if (m.clients[iid] || n >= CLIENTS_PAR_PASSAGE) continue;
      if (!agents.peutAgir(ID).ok) break;
      const f = incidents.faits(iid); if (!f) continue;
      const nb = f.entreprises;
      const texte = 'Incident venu des appareils : ' + f.occurrences + ' ' + O.pluriel(f.occurrences, 'occurrence', 'occurrences') + ' ' + (nb ? 'chez ' + nb + ' ' + O.pluriel(nb, 'entreprise', 'entreprises') : 'sans entreprise identifiée') +
        ', catégorie ' + f.categorie + ', dernier signalement il y a ' + f.dernierH + ' h. Je ne lis pas son texte (il vient des appareils). Pour la cause : « Expliquer » dans la Tour ; ensuite « Proposer une correction » ouvre une demande de fusion en brouillon que tu valides. Je ne le classe pas « corrigé » : ça écrit aux entreprises.';
      const jour = O.jourParis(maintenant());
      if (!m.sonneries || m.sonneries.j !== jour) m.sonneries = { j: jour, n: 0 };
      const sonne = f.corrobore === true && m.sonneries.n < SONNERIES_CLIENTS_PAR_JOUR;
      const d1 = parler(ID, texte, sonne ? 'important' : 'info');
      if (d1.ok && sonne) m.sonneries.n++;
      if (dit(d1)) { m.clients[iid] = maintenant(); etat.sauver(); n++; note('incident client lu', { cible: iid, resultat: 'propose', detail: f.categorie }); }
    }
    return n;
  }

  let enCours = false, dernier = 0;
  async function passer() {
    if (enCours) return { saute: 'en_cours' };
    enCours = true;
    try {
      const p = agents.peutAgir(ID);
      if (!p.ok) return { saute: p.raison };
      if (etat.illisible()) return { saute: 'memoire_illisible' };
      dernier = maintenant(); etat.agent(ID).dernier = dernier;
      const fermes = fermer(), pris = await prendre(), clientsLus = clients();
      return { fermes, pris, clients: clientsLus };
    } catch (e) {
      note('passage', { cible: 'incidents', resultat: 'erreur', detail: String((e && e.message) || e).slice(0, 100) });
      return { saute: 'erreur' };
    } finally { enCours = false; }
  }
  return { passer, etat: () => ({ dernier: dernier || (etat.agent(ID).dernier || 0), illisible: etat.illisible(), diagnosticsAujourdhui: (etat.agent(ID).jour || {}).n || 0 }), faitsEpisode };
};
module.exports.DIAGNOSTICS_PAR_JOUR = DIAGNOSTICS_PAR_JOUR;
module.exports.SONNERIES_CLIENTS_PAR_JOUR = SONNERIES_CLIENTS_PAR_JOUR;
