/* THÉO — les sauvegardes et la conservation des données (23 octobre 2026). Catégorie de la Tour : Système (Sauvegardes).
 *
 * Justin : « je veux des agents qui gèrent toutes les catégories de la Tour ». Théo tient ce que Max ne détaille pas :
 *  · les sauvegardes — l'élagage du coffre, les bases copiées « brutes », la copie mensuelle (les règles de `plateforme-regles.js`, aux seuils de `surveillance.js`),
 *    et, quand Max annonce qu'une sauvegarde a échoué ou vieilli, le MOTIF noté par `sauvegarde.js`, dit en clair (une table fermée : jamais la chaîne brute) ;
 *  · la conservation des données (`conservation.js`) — il LIT ce qui existe (l'horloge des 24 mois, le préavis des CGV) et n'en double RIEN : il ne supprime rien, n'envoie
 *    aucun courriel de préavis (l'horloge dit qu'il se fait à la main), il annonce ce qui approche, une fois quand le nombre monte, et un rappel par semaine tant que ça dure.
 *
 * ⛔ THÉO NE RELANCE RIEN ET NE SUPPRIME RIEN. La minuterie de la sauvegarde réessaie toute seule chaque heure ; une relance est un geste de la Tour (Sauvegardes). La
 *    suppression des données est un geste FIXE de la charte (`supprimer_donnees`) : elle reste à Justin, toujours.
 * ⛔ Théo n'appelle jamais Claude dans sa boucle : le code surveille. Ce qu'il dit est composé ici, avec des nombres et des phrases à nous.
 * ⛔ AUCUNE CLÉ, AUCUN CHEMIN DU COFFRE, AUCUN POIDS : `sauvegarde.etat().derniere.cle` et `.octets` ne sortent pas de ce fichier (le poids d'une archive est un journal d'activité
 *    des clients ; la clé est un chemin dans le coffre). Seul le motif — classé — et l'âge passent.
 * Toutes les dépendances sont INJECTÉES.
 */
'use strict';
const sentinelle = require('./plateforme-sentinelle');
const O = require('./plateforme-outils');

const ID = 'theo';
const SEMAINE_MS = 7 * 86400000;
const SAUVEGARDE_DE_MAX = ['sauvegarde_echec', 'sauvegarde_vieille', 'sauvegarde_inactive'];

/* Ce que `sauvegarde.js` note comme motif, rangé dans une table FERMÉE : `cle` (une clé de table, qui peut entrer dans un fait) et `phrase` (à nous). Une chaîne qu'on ne
   sait pas ranger devient « autre » — jamais recopiée. */
function motifClasse(motif) {
  const m = String(motif == null ? '' : motif);
  let x;
  if (!m) return { cle: 'aucun', phrase: 'aucun motif noté' };
  if (m === 'trop-volumineuse') return { cle: 'volumineuse', phrase: 'l’archive dépasse la taille permise' };
  if ((x = /^depot-(\d{3})$/.exec(m))) return { cle: 'depot_refuse', phrase: 'le coffre a refusé le dépôt (code ' + x[1] + ')' };
  if (m === 'depot-erreur') return { cle: 'depot_echec', phrase: 'le dépôt dans le coffre a échoué (réseau, ou coffre injoignable)' };
  if (m === 'relecture-absente') return { cle: 'relecture_absente', phrase: 'l’archive déposée est introuvable dans le coffre à la relecture' };
  if ((x = /^relecture-(\d{3})$/.exec(m))) return { cle: 'relecture_refusee', phrase: 'la relecture après dépôt a été refusée par le coffre (code ' + x[1] + ')' };
  if (m === 'relecture-differente') return { cle: 'relecture_differente', phrase: 'l’archive relue n’est pas celle qu’on a déposée' };
  if (m === 'taille-differente') return { cle: 'taille', phrase: 'la taille relue n’est pas celle de l’archive déposée' };
  if (m === 'empreinte-differente') return { cle: 'empreinte', phrase: 'l’empreinte relue n’est pas celle de l’archive déposée' };
  if (m === 'archive-vide') return { cle: 'vide', phrase: 'l’archive relue était vide' };
  if (m === 'socle-illisible' || m === 'socle-incomplet') return { cle: 'socle', phrase: 'la copie des bases du socle est ' + (m === 'socle-illisible' ? 'illisible' : 'incomplète') };
  if (m === 'inactive') return { cle: 'inactive', phrase: 'le module de sauvegarde est inactif' };
  if (m === 'deja-en-cours') return { cle: 'en_cours', phrase: 'une sauvegarde était déjà en cours' };
  return { cle: 'autre', phrase: 'un motif que je ne sais pas ranger (il est dans la Tour, Surveillance)' };
}

module.exports = function agentTheo(ctx) {
  const { agents, conversations, etat } = ctx;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  /* `plus` : les nombres de la conservation, joints aux valeurs des règles de Théo avant qu'elles se disent */
  const conservation = () => { try { return ctx.conservation && typeof ctx.conservation.sante === 'function' ? ctx.conservation.sante() : null; } catch (e) { return null; } };
  const lireEtatSauvegarde = () => { try { return ctx.sauvegarde && typeof ctx.sauvegarde.etat === 'function' ? ctx.sauvegarde.etat() : null; } catch (e) { return null; } };
  const moteur = sentinelle(Object.assign({}, ctx, { proprio: ID, fil: 'plateforme', plus: async (actives) => {
    const c = conservation();
    if (!c) return;
    const echu = actives.get('conservation_echu'), pre = actives.get('conservation_preavis');
    if (echu && Number.isFinite(c.echus)) echu.valeurs.entreprises = c.echus;
    if (pre && Number.isFinite(c.enPreavis)) pre.valeurs.entreprises = c.enPreavis;
  } }));
  if (!agents || !conversations || !etat) return moteur;
  const note = (action, o) => { try { agents.noter(ID, action, o); } catch (e) {} };
  const parler = (fil, texte, niveau) => { try { return conversations.parler(ID, fil, texte, { niveau }); } catch (e) { return { ok: false, raison: 'erreur' }; } };
  const dit = d => d.ok || d.raison === 'doublon';

  /* ── quand Max annonce une sauvegarde en défaut : le motif, en clair, une fois par épisode ── */
  function suivreSauvegarde() {
    const m = etat.agent(ID);
    if (!m.suivis || typeof m.suivis !== 'object' || Array.isArray(m.suivis)) m.suivis = {};
    const ouverts = etat.ouverts('max');
    const vivants = new Set(ouverts.map(e => e.id));
    for (const k of Object.keys(m.suivis)) if (!vivants.has(k)) delete m.suivis[k];       // la mémoire ne grossit pas
    let n = 0;
    for (const e of ouverts) {
      if (!SAUVEGARDE_DE_MAX.includes(e.cle) || !e.annonce || m.suivis[e.id]) continue;
      if (!agents.peutAgir(ID).ok) break;
      const s = lireEtatSauvegarde();
      const der = s && s.derniere && typeof s.derniere === 'object' ? s.derniere : null;
      const motif = der && der.ok === false ? motifClasse(der.motif) : { cle: 'aucun', phrase: '' };
      let texte;
      if (e.cle === 'sauvegarde_inactive') texte = 'Sur la sauvegarde : elle est réglée mais le module ne s’est pas monté au démarrage, donc rien ne part hors du serveur. Journal : journalctl -u teamop-api | grep sauvegarde.';
      else if (e.cle === 'sauvegarde_vieille') texte = 'Sur la sauvegarde : la dernière archive réussie date de ' + (Number.isFinite(e.valeurs.heures) ? Math.round(e.valeurs.heures) + ' h' : 'plus de 26 h') +
        '. Le plus souvent la minuterie ne tourne plus (redémarrage, service bloqué)' + (motif.phrase ? ' ; la dernière tentative notée : ' + motif.phrase : '') + '. Elle réessaie chaque heure, je ne la relance pas à ta place.';
      else texte = 'Sur la sauvegarde : ' + (motif.phrase ? motif.phrase.charAt(0).toUpperCase() + motif.phrase.slice(1) : 'le motif n’est pas noté') + '. La minuterie réessaie chaque heure ; je ne la relance pas à ta place, tu peux la lancer depuis la Tour (Sauvegardes) quand tu veux.';
      const d = parler('plateforme', texte, 'info');
      if (dit(d)) { m.suivis[e.id] = maintenant(); n++; note('motif de la sauvegarde dit', { cible: e.cle, resultat: 'ok', detail: motif.cle }); }
    }
    if (n) etat.sauver();
    return n;
  }

  /* ── ce qui approche : la conservation des 24 mois. Une phrase quand le nombre monte, un rappel par semaine tant qu'il y en a. ── */
  function suivreConservation() {
    const c = conservation();
    if (!c || !Number.isFinite(c.enPreavis) || !Number.isFinite(c.echus)) return 0;
    const m = etat.agent(ID), now = maintenant();
    const avant = m.conservation && typeof m.conservation === 'object' ? m.conservation : null;
    const cur = { preavis: c.enPreavis, echus: c.echus };
    if (!avant) { m.conservation = Object.assign({ rappel: now }, cur); etat.sauver(); return 0; }       // le premier relevé fixe la base : l'annonce du premier épisode est faite par le moteur
    if (!agents.peutAgir(ID).ok) return 0;
    /* une montée DEPUIS ZÉRO est le début de l'épisode, que le moteur annonce (avec le nombre) : Théo n'ajoute rien. Il parle quand le nombre monte alors qu'il y en avait déjà. */
    const monte = (avant.preavis > 0 && cur.preavis > avant.preavis) || (avant.echus > 0 && cur.echus > avant.echus);
    const rappelDu = (cur.preavis > 0 || cur.echus > 0) && now - (avant.rappel || 0) >= SEMAINE_MS;
    if (!monte && !rappelDu) {
      if (cur.preavis !== avant.preavis || cur.echus !== avant.echus) { m.conservation = Object.assign({}, avant, cur, (avant.preavis === 0 && cur.preavis > 0) || (avant.echus === 0 && cur.echus > 0) ? { rappel: now } : {}); etat.sauver(); }
      return 0;
    }
    const morceaux = [];
    if (cur.preavis > 0) morceaux.push(cur.preavis + ' ' + O.pluriel(cur.preavis, 'entreprise est', 'entreprises sont') + ' dans les 30 derniers jours avant la fin des 24 mois');
    if (cur.echus > 0) morceaux.push(cur.echus + ' ' + O.pluriel(cur.echus, 'a dépassé', 'ont dépassé') + ' l’échéance');
    const texte = (monte ? 'Ce qui approche côté données : ' : 'Rappel de la semaine, conservation des données : ') + O.liste(morceaux) + '. Rien ne supprime ni n’envoie le courriel de préavis des CGV pour l’instant : c’est à faire à la main, et la suppression te revient toujours.';
    const d = parler('plateforme', texte, cur.echus > avant.echus ? 'important' : 'info');
    if (!dit(d)) return 0;
    m.conservation = Object.assign({}, cur, { rappel: now });
    etat.sauver();
    note(monte ? 'conservation : ça approche' : 'conservation : rappel', { cible: 'conservation', resultat: 'ok', detail: cur.preavis + ' en préavis, ' + cur.echus + ' échue(s)' });
    return 1;
  }

  /* « Je viens de vérifier la sauvegarde hors site » : une fois par jour, quand la dernière archive est réussie. L'annonce est celle de la table fermée (`agent-faits.js`), sans poids ni clé du coffre. */
  function sauvegardeVerifiee() {
    const s = lireEtatSauvegarde(), der = s && s.derniere && typeof s.derniere === 'object' ? s.derniere : null;
    if (der && der.ok === true && typeof agents.fait === 'function' && agents.peutAgir(ID).ok) agents.fait(ID, 'sauvegarde_verifiee', {});
  }

  async function passer() {
    const r = await moteur.passer();
    if (r && !r.saute) { try { r.motifs = suivreSauvegarde(); r.conservation = suivreConservation(); sauvegardeVerifiee(); } catch (e) { note('passage', { cible: 'sauvegarde', resultat: 'erreur', detail: String((e && e.message) || e).slice(0, 100) }); } }
    return r;
  }

  /* ── les relevés fermés que Théo (et lui seul) donne à la conversation : des nombres, des booléens, des clés de table ── */
  const faits = {
    sauvegardes: () => {
      const j = typeof ctx.sante === 'function' ? ctx.sante() : null;
      return Promise.resolve(j).then(sante => {
        const sv = sante && sante.sauvegarde ? sante.sauvegarde : null;
        if (!sv) return null;
        const s = lireEtatSauvegarde(), h = s && Array.isArray(s.histo) ? s.histo.slice(0, 10) : [];
        const der = s && s.derniere && typeof s.derniere === 'object' ? s.derniere : null;
        const num = x => (typeof x === 'number' && Number.isFinite(x)) ? x : null;
        const mo = der && der.ok === false ? motifClasse(der.motif).cle : 'aucun';
        return { active: sv.active === true, configuree: sv.configuree === true, ok: typeof sv.ok === 'boolean' ? sv.ok : null, ageH: num(sv.ageH), echecsInstantane: num(sv.instantaneEchecs), echecsElagage: num(sv.elagageEchecs),
          copieMensuelleJours: sv.mensuelJ === false ? false : num(sv.mensuelJ), tentativesRecentes: h.length, tentativesReussies: h.filter(x => x && x.ok === true).length, motifDuDernierEchec: { [mo]: true } };
      });
    },
    conservation: () => {
      const c = conservation();
      if (!c) return null;
      return { suivies: c.suivis, enPreavis: c.enPreavis, echues: c.echus, jamaisAbonnees: c.jamaisAbonnes, balayageOk: c.balayageOk, joursDeConservation: c.jours };
    },
  };
  return Object.assign({}, moteur, { passer, faits });
};
module.exports.motifClasse = motifClasse;
module.exports.SAUVEGARDE_DE_MAX = SAUVEGARDE_DE_MAX;
