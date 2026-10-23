/* LE MOTEUR DE VEILLE PAR ÉPISODES (23 octobre 2026) — celui de MAX (le service), de THÉO (sauvegardes et conservation) et de NINA (la sécurité) : chacun
 * l'instancie avec SON propriétaire de règles (`plateforme-regles.js`). Il regarde l'état de santé du serveur, ouvre un incident quand une alarme de son
 * propriétaire se déclenche, la dit à l'équipe, réveille Justin si c'est grave, et dit quand c'est rétabli.
 *
 * Justin : « je veux aussi des agents qui gèrent la surveillance, incidents ; en gros je veux des agents qui gèrent toutes les catégories de la Tour ».
 *
 * ⛔ LE CODE SURVEILLE, LE MODÈLE NE JUGE PAS ICI : Max n'appelle JAMAIS Claude dans sa boucle. Un passage lit l'état de santé (sans vider la fenêtre de latence que
 *    lit la surveillance horaire de GitHub : `santeCorps(false)`), applique les règles de `plateforme-regles.js` — les SEUILS de `surveillance.js`, relus par un
 *    banc — et ne parle que d'un FRANCHISSEMENT. Toutes les cinq minutes, sans un centime tant que rien ne change.
 * ⛔ UNE SEULE FOIS PAR ÉPISODE (`plateforme-etat.js`) : pas d'alerte en boucle. L'annonce n'est marquée faite qu'APRÈS un message parti ; le « rétabli » se dit
 *    deux passages clairs plus tard, une fois. Un message refusé (plafond d'heure, fil illisible) est retenté au passage suivant.
 * ⛔ CE QU'IL ÉCRIT EST COMPOSÉ ICI, d'après une règle : un chiffre arrondi, une phrase à nous. Le texte d'un incident de la Tour (forgeable) n'entre ni dans un incident
 *    de Max, ni dans un message, ni dans un prompt. Il ne lit AUCUN incident d'un client.
 * ⛔ IL N'AGIT SUR RIEN : il ne redémarre rien, ne relance rien, ne change aucune configuration. Il constate, il ouvre un incident dans le registre de la Tour
 *    (sans entreprise listée, donc sans courriel à un client), il parle, et il laisse Jules diagnostiquer. Ce qui engage (une sauvegarde à relancer, une version à
 *    exiger) est une proposition à Justin.
 * ⛔ UN ÉTAT DE SANTÉ ILLISIBLE N'EST NI « TOUT VA BIEN » NI UNE PANNE : Max ne dit rien et le note — trois fois de suite, il le dit une fois.
 * Toutes les dépendances sont INJECTÉES.
 */
'use strict';
const R = require('./plateforme-regles');
const O = require('./plateforme-outils');

const ANNONCES_PAR_PASSAGE = 3;
const ILLISIBLE_AVANT_DE_DIRE = 3;
/* ⛔ DEUX PLAFONDS PAR JOUR ET PAR RÈGLE, parce qu'une règle peut être déclenchée de l'EXTÉRIEUR (revue du 23 octobre 2026 : le courrier refusé, les erreurs d'application postées sur une route
   publique) et qu'un épisode neuf se rouvre dès que le précédent est clos. Un push « urgent » : un par règle et par jour (le suivant se dit dans le fil privé, sans notification). Un incident
   (donc un diagnostic de Jules, donc un appel à Claude) : deux par règle et par jour (l'épisode est annoncé quand même). Un déclencheur forgeable reste ainsi BORNÉ, quel que soit son rythme. */
const URGENTS_PAR_JOUR_ET_REGLE = 1;
const INCIDENTS_PAR_JOUR_ET_REGLE = 2;

module.exports = function sentinelle(ctx) {
  const { agents, conversations, etat, incidents } = ctx;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const sante = typeof ctx.sante === 'function' ? ctx.sante : (async () => null);
  const proprio = ctx.proprio || 'max';              // Max, Théo ou Nina : l'agent dont ce sont les règles ET la voix
  const fil = ctx.fil || 'plateforme';
  /* `plus(actives, j)` : un agent peut ajouter des NOMBRES aux valeurs d'une règle (Théo : combien d'entreprises sont en préavis) — jamais du texte */
  const plus = typeof ctx.plus === 'function' ? ctx.plus : null;
  if (!agents || !conversations || typeof conversations.parler !== 'function' || !etat || !incidents) return { passer: async () => ({ saute: 'pas_de_dependances' }), etat: () => ({}) };
  const nom = ((agents.AGENTS || []).find(a => a.id === proprio) || {}).nom || proprio;
  const julesPeut = () => { try { return agents.peutAgir('jules').ok; } catch (e) { return false; } };
  const note = (action, o) => { try { agents.noter(proprio, action, o); } catch (e) {} };

  /* Ce que Max (ou Théo, Nina) dit — composé d'après la règle et les valeurs de l'épisode. */
  function titre(e) { return R.texteDe(e.cle, e.valeurs) || e.cle; }
  function messages(e) {
    const t = titre(e), h = O.heureParis(e.depuis), j = julesPeut();
    return {
      groupe: O.cap(t) + ' (depuis ' + h + ').' + (e.incident ? ' Incident ouvert' + (j ? ', Jules le prend' : '') + '.' : ''),
      prive: 'Justin, c’est sérieux : ' + t + ' (depuis ' + h + ').' + (e.incident ? ' J’ai ouvert un incident dans la Surveillance' + (j ? ' et Jules le prend' : '') + '.' : '') + ' Je continue de regarder et je te dis dès que c’est rétabli.',
    };
  }
  function messagesRetabli(e) {
    const h = O.heureParis(e.fin);
    return {
      groupe: 'Rétabli à ' + h + ' : « ' + O.cap(titre(e)) + ' ». Les compteurs sont revenus à la normale.',
      prive: 'Justin, c’est rétabli à ' + h + ' : « ' + O.cap(titre(e)) + ' ». Plus rien à faire de ton côté.',
    };
  }

  let enCours = false, dernierPassage = 0, illisibles = 0;
  function memoire() { return etat.agent(proprio); }
  /* Les compteurs du jour (Paris), rangés avec la mémoire de l'agent : { j, urgent:{règle:n}, incident:{règle:n} } */
  function plafonds() {
    const m = memoire(), j = O.jourParis(maintenant());
    if (!m.plafonds || typeof m.plafonds !== 'object' || m.plafonds.j !== j) m.plafonds = { j, urgent: {}, incident: {} };
    return m.plafonds;
  }
  const dejaFait = (genre, cle, max) => (plafonds()[genre][cle] || 0) >= max;
  const compter = (genre, cle) => { const p = plafonds(); p[genre][cle] = (p[genre][cle] || 0) + 1; };

  async function passer() {
    if (enCours) return { saute: 'en_cours' };
    enCours = true;
    try {
      const p = agents.peutAgir(proprio);
      if (!p.ok) return { saute: p.raison };            // à l'arrêt ou en pause : il ne lit rien
      if (etat.illisible()) return { saute: 'memoire_illisible' };
      let j = null;
      try { j = await sante(); } catch (e) { j = null; }
      const actives = R.evaluer(j, proprio, maintenant);
      if (!actives) {
        illisibles++;
        if (illisibles === ILLISIBLE_AVANT_DE_DIRE) { note('état de santé illisible', { cible: 'sante', resultat: 'erreur', detail: illisibles + ' passages de suite' }); try { conversations.systeme(fil, nom + ' ne peut pas lire l’état de santé du serveur (' + illisibles + ' passages de suite).', { cle: 'sante-illisible:' + proprio, parHeure: true }); } catch (e) {} }
        return { saute: 'sante_illisible' };
      }
      illisibles = 0;
      if (plus) { try { await plus(actives, j); } catch (e) {} }
      for (const x of actives.values()) for (const k of Object.keys(x.valeurs)) if (!(typeof x.valeurs[k] === 'number' ? Number.isFinite(x.valeurs[k]) : x.valeurs[k] === null)) delete x.valeurs[k];   // des nombres, rien d'autre
      dernierPassage = maintenant();
      const m = memoire(); m.dernier = dernierPassage; m.actives = actives.size;
      const suivi = etat.suivre(proprio, actives);
      if (!suivi) return { saute: 'memoire_illisible' };

      let annonces = 0;
      for (const e of suivi.nouveaux) {
        if (annonces >= ANNONCES_PAR_PASSAGE) break;
        const p2 = agents.peutAgir(proprio); if (!p2.ok) break;          // revérifié avant chaque geste
        /* 1. l'incident : le registre de la Tour, un texte de NOTRE code, aucune entreprise listée */
        if (!e.incident && !e.incidentRefuse && !(R.PAR_CLE.get(e.cle) || {}).sansIncident && dejaFait('incident', e.cle, INCIDENTS_PAR_JOUR_ET_REGLE)) {
          etat.marquer(e.id, { incidentRefuse: true }); e.incidentRefuse = true;       // le plafond du jour est atteint : annoncé, sans incident (et on ne le retente pas à chaque passage)
          note('incident ouvert', { cible: e.cle, resultat: 'refuse', detail: 'plafond du jour pour cette règle' });
        }
        if (!e.incident && !e.incidentRefuse && !(R.PAR_CLE.get(e.cle) || {}).sansIncident) {     // un verrou de connexion s'annonce, il n'ouvre pas d'incident
          const o = incidents.ouvrir({ agent: proprio, signature: 'agent|' + proprio + '|' + e.cle + '|' + e.id, gravite: R.GRAVITE[e.niveau], regle: e.cle,
            message: 'Surveillance — ' + O.cap(titre(e)) });
          if (o.ok) { if (!o.deja) compter('incident', e.cle); etat.marquer(e.id, { incident: o.id }); e.incident = o.id; note('incident ouvert', { cible: e.cle, resultat: 'ok', detail: e.niveau }); }
          else note('incident ouvert', { cible: e.cle, resultat: 'erreur', detail: o.raison });
        }
        /* 2. l'annonce, une seule fois — marquée APRÈS un message parti (« doublon » : c'est déjà dit dans les 24 h) */
        const ms = messages(e);
        if (!e.annonce) {
          const d = conversations.parler(proprio, fil, ms.groupe, { niveau: 'info' });
          if (d.ok || d.raison === 'doublon') { etat.marquer(e.id, { annonce: true }); e.annonce = true; annonces++; note('épisode annoncé', { cible: e.cle, resultat: 'ok', detail: e.niveau }); }
          else note('épisode annoncé', { cible: e.cle, resultat: 'refuse', detail: d.raison });
        }
        /* 3. critique : Justin est prévenu à part, dans le fil privé, en « urgent » (la messagerie le notifie) */
        if (e.niveau === 'critique' && !e.prive) {
          const sourdine = dejaFait('urgent', e.cle, URGENTS_PAR_JOUR_ET_REGLE);       // déjà réveillé pour cette règle aujourd'hui : il le lit dans son fil, sans notification
          const d = conversations.parler(proprio, proprio, ms.prive, { niveau: sourdine ? 'info' : 'urgent' });
          if (d.ok || d.raison === 'doublon') { if (d.ok && !sourdine) compter('urgent', e.cle); etat.marquer(e.id, sourdine ? { prive: true, sourdine: true } : { prive: true }); e.prive = true; e.sourdine = sourdine; }
          else note('Justin prévenu', { cible: e.cle, resultat: 'refuse', detail: d.raison });
        }
      }

      /* le rétabli : dit une fois ; l'incident se ferme (Jules s'en charge ; sans lui, Max) */
      let retablis = 0;
      for (const e of suivi.retablis) {
        if (retablis >= ANNONCES_PAR_PASSAGE) break;
        const p2 = agents.peutAgir(proprio); if (!p2.ok) break;
        const ms = messagesRetabli(e);
        const d = conversations.parler(proprio, fil, ms.groupe, { niveau: 'info' });
        let dit = d.ok || d.raison === 'doublon';
        if (dit && e.niveau === 'critique') {
          const d2 = conversations.parler(proprio, proprio, ms.prive, { niveau: e.sourdine ? 'info' : 'important' });       // pas de notification pour un « rétabli » dont le départ n'en a pas eu
          dit = d2.ok || d2.raison === 'doublon';
        }
        if (!dit) { note('rétabli dit', { cible: e.cle, resultat: 'refuse', detail: d.raison }); continue; }
        retablis++;
        const champs = { retabliDit: true };
        if (e.incident && !julesPeut()) { const f = incidents.fermer(e.incident, nom, 'Rétabli à ' + O.heureParis(e.fin) + ' : les compteurs sont revenus à la normale.'); if (f.ok || f.raison === 'introuvable') champs.incidentFerme = true; }
        etat.marquer(e.id, champs);
        note('épisode rétabli', { cible: e.cle, resultat: 'ok', detail: e.niveau });
      }
      /* le filet : un incident dont l'épisode est rétabli et dit, que Jules ne peut plus fermer (à l'arrêt), se ferme ICI — sinon il resterait « en cours » pour toujours */
      if (!julesPeut()) {
        for (const e of etat.aFermer().filter(x => x.proprio === proprio && x.retabliDit)) {
          const f = incidents.fermer(e.incident, nom, 'Rétabli à ' + O.heureParis(e.fin) + ' : les compteurs sont revenus à la normale.');
          if (f.ok || f.raison === 'introuvable') etat.marquer(e.id, { incidentFerme: true });
        }
      }
      return { actives: actives.size, nouveaux: suivi.nouveaux.length, cles: suivi.nouveaux.map(e => e.cle), annonces, retablis };
    } catch (e) {
      note('passage', { cible: 'sante', resultat: 'erreur', detail: String((e && e.message) || e).slice(0, 100) });
      return { saute: 'erreur' };
    } finally { enCours = false; }
  }

  /* Ce que l'écran et les autres agents peuvent savoir de moi : des identifiants, des nombres, des niveaux. */
  const resume = () => ({ dernier: dernierPassage || (memoire().dernier || 0), illisible: etat.illisible(),
    episodes: etat.ouverts(proprio).map(e => ({ cle: e.cle, niveau: e.niveau, zone: e.zone, depuis: e.depuis, incident: !!e.incident })) });
  return { passer, etat: resume, titre, messages };
};
module.exports.ANNONCES_PAR_PASSAGE = ANNONCES_PAR_PASSAGE;
module.exports.URGENTS_PAR_JOUR_ET_REGLE = URGENTS_PAR_JOUR_ET_REGLE;
module.exports.INCIDENTS_PAR_JOUR_ET_REGLE = INCIDENTS_PAR_JOUR_ET_REGLE;
