/* L'ANNONCE DE FIN DE TRAVAIL (28 octobre 2026) — « chaque fois qu'ils ont fini, ils mettent dans le groupe "je viens d'effectuer ça", comme ça moi je vois tout en temps réel ».
 *
 * Justin, Tour de contrôle, 28 octobre 2026 : « je veux qu'à chaque fois qu'ils ont fini, ils mettent dans le groupe "je viens d'effectuer ça" ». Ce fichier compose la phrase ;
 * `conversations.annoncerFait` l'écrit dans le fil « Équipe » ; `agents.js` (terminer, proposer, fait) et les modules la déclenchent.
 *
 * ⛔ LA PHRASE EST COMPOSÉE ICI, PAR LE CODE, JAMAIS PAR CLAUDE — donc sans appel, sans coût, sans invention. Tout ce qui vient d'un module ou d'un client passe par une FORME FERMÉE :
 *    un code d'une table, un numéro de dossier (`DOS-nnnnnn`), un entier, un jour. Aucun nom, aucune adresse, aucun texte de client ne traverse. Un code inconnu n'écrit RIEN (le journal
 *    garde la trace) : c'est l'ajout d'une ligne à cette table, et pas la bonne volonté d'un module, qui permet une nouvelle annonce.
 *    Deux exceptions, NOMMÉES : le RÉSUMÉ que le modèle écrit lui-même en appelant l'outil `terminer` (≤ 140 caractères) et le TITRE d'une consigne. Ce sont des textes LIBRES, et « sans donnée
 *    client » n'était vrai que des adresses et des téléphones : un nom, une adresse postale, un montant, un numéro de facture traversaient (« Rappelé Mme Sophie Martin, 3 avenue Foch… » a été
 *    publié tel quel, copié au pont). Ils ne s'affichent donc QUE s'ils passent `AC.donneeClientProbable` (aucun nom propre, adresse, montant, référence ni lien) ; sinon rien n'en sort, et la
 *    phrase fermée de la table reste (« Je viens de terminer une tâche »). Le résumé complet reste au registre des tâches, que seule la Tour lit. Un module qui termine une tâche n'a PAS ce droit.
 * ⛔ UNE ANNONCE NE RÉVEILLE PERSONNE ET NE COMPTE DANS AUCUN PLAFOND (`annoncerFait`, conversations.js) : le demandeur est NOMMÉ (« demandé par Victor »), jamais cité par un « @ ».
 * ⛔ UNE ANNONCE NE SE RÉPÈTE PAS : sa clé (`fait:<tâche>` ou `fait:<agent>:<code>:<dossier>:<jour>`) est stable — la même tâche annoncée deux fois n'écrit qu'une ligne, même après un
 *    redémarrage (la clé est rangée avec le message).
 */
'use strict';
const AC = require('./agent-conversation');

const FORME_DOSSIER = /^DOS-\d{6}$/;
const LIBRE_MAX = 140, TITRE_MAX = 90;

/* ⛔ LES VERBES SONT À L'INFINITIF : « Je viens de TRAITER… », « Je n'ai pas pu TRAITER… » (un participe passé — « Je viens de traité » — était la première version, relevée par le banc). Pour chaque
   entrée, `fait` et `echec` disent donc la même chose ; ils restent deux champs pour qu'une entrée puisse un jour diverger. */
/* Une tâche entre agents (type fermé de `agents.js`) : ce que l'agent a fait / n'a pas pu faire. */
const TACHES = {
  verifier_paiement:    { fait: 'vérifier un paiement', echec: 'vérifier un paiement' },
  preparer_espace:      { fait: 'préparer l’espace d’un client', echec: 'préparer l’espace d’un client' },
  escalade_humain:      { fait: 'traiter une demande à passer à une vraie personne', echec: 'traiter une demande à passer à une vraie personne' },
  signaler_erreur:      { fait: 'traiter une erreur signalée', echec: 'traiter une erreur signalée' },
  relire_envoi:         { fait: 'relire un envoi', echec: 'relire un envoi' },
  resilier_fin_periode: { fait: 'traiter une fin d’abonnement', echec: 'traiter une fin d’abonnement' },
  rendez_vous_prospect: { fait: 'traiter une demande de rendez-vous', echec: 'traiter une demande de rendez-vous' },
  choix_creneau:        { fait: 'enregistrer le créneau choisi par un prospect', echec: 'enregistrer le créneau choisi par un prospect' },
  consigne:             { fait: 'terminer une tâche', echec: 'terminer une tâche' },
};
/* Ce que l'agent a PRÉPARÉ pour Justin (une demande de validation, `agents.proposer`) : rien ne part sans lui. */
const VALIDATIONS = {
  creer_espace:         'la création d’un espace client',
  suspendre_acces:      'une suspension d’accès',
  envoyer_mail:         'un courriel',
  publier:              'une publication',
  repondre_avis:        'une réponse à un avis',
  correctif:            'un correctif',
  resilier_fin_periode: 'une fin d’abonnement',
  courrier_agent:       'un courrier',
  mise_en_demeure:      'une mise en demeure',
  annonce_clients:      'une annonce aux clients',
};
/* Ce que l'agent a FAIT de ce que Justin avait validé (`agents.decider` : l'exécuteur du type a tourné). */
const VALIDATIONS_FAITES = {
  creer_espace:         { fait: 'créer l’espace client que tu avais validé', echec: 'créer l’espace client que tu avais validé' },
  suspendre_acces:      { fait: 'suspendre l’accès que tu avais validé', echec: 'suspendre l’accès que tu avais validé' },
  envoyer_mail:         { fait: 'envoyer le courriel que tu avais validé', echec: 'envoyer le courriel que tu avais validé' },
  publier:              { fait: 'publier ce que tu avais validé', echec: 'publier ce que tu avais validé' },
  repondre_avis:        { fait: 'répondre à l’avis que tu avais validé', echec: 'répondre à l’avis que tu avais validé' },
  correctif:            { fait: 'appliquer le correctif que tu avais validé', echec: 'appliquer le correctif que tu avais validé' },
  resilier_fin_periode: { fait: 'programmer la fin d’abonnement que tu avais validée', echec: 'programmer la fin d’abonnement que tu avais validée' },
  courrier_agent:       { fait: 'envoyer le courrier que tu avais validé', echec: 'envoyer le courrier que tu avais validé' },
  mise_en_demeure:      { fait: 'envoyer la mise en demeure que tu avais validée', echec: 'envoyer la mise en demeure que tu avais validée' },
  annonce_clients:      { fait: 'envoyer l’annonce aux clients que tu avais validée', echec: 'envoyer l’annonce aux clients que tu avais validée' },
};
/* Les faits qui ne sont pas une tâche (`agents.fait(id, code, …)`). `groupe: false` : un fait rare, annoncé tout de suite ; sinon les faits du même agent et du même code
   s'agrègent 20 secondes en UNE ligne « ×N ». */
const CODES = {
  courrier_brouillon:   { fait: 'mettre un courriel en brouillon', echec: 'mettre un courriel en brouillon' },
  courrier_envoye:      { fait: 'envoyer un courriel que tu avais validé', echec: 'envoyer un courriel que tu avais validé' },
  courrier_classe:      { fait: 'classer un courriel reçu', echec: 'classer un courriel reçu' },
  sauvegarde_verifiee:  { fait: 'vérifier la sauvegarde hors site', echec: 'vérifier la sauvegarde hors site', groupe: false },
  incident_traite:      { fait: 'traiter un incident', echec: 'traiter un incident' },
  validation_executee:  { fait: 'exécuter ce que tu avais validé', echec: 'exécuter ce que tu avais validé' },
  publication:          { fait: 'publier ce que tu avais validé', echec: 'publier ce que tu avais validé' },
  rendez_vous_fixe:     { fait: 'fixer un rendez-vous', echec: 'fixer un rendez-vous' },
  relance_envoyee:      { fait: 'relancer un impayé', echec: 'relancer un impayé' },
  point_du_jour:        { fait: 'publier le point du jour', echec: 'publier le point du jour', groupe: false },
  reunion_tenue:        { fait: 'tenir la réunion', echec: 'tenir la réunion', groupe: false },
  base_enrichie:        { fait: 'proposer une entrée pour la base de connaissances', echec: 'proposer une entrée pour la base de connaissances' },
};
/* La raison d'un échec : une liste, jamais le message d'une exception. */
const RAISONS = { indisponible: 'service indisponible', hors_heures: 'hors des heures de travail', refus: 'refusé par un contrôle', pas_de_cle: 'clé absente', budget: 'budget atteint',
  introuvable: 'introuvable', ecriture: 'écriture impossible' };

/* « Je viens DE traiter », « Je viens D'envoyer » : l'élision devant une voyelle ou un « h » */
const de = v => (/^[aeiouyàâäéèêëîïôöùûüh]/i.test(v) ? 'd’' : 'de ') + v;
const court = (t, n) => { t = String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
/* Un texte libre (le résumé du modèle, le titre d'une consigne) : adresses et numéros masqués, ni accolade ni « @ ». */
const propre = (t, n) => court(AC.sansTel(String(t == null ? '' : t).replace(AC.ADRESSE, '(adresse)')).replace(/[{}@\u0000-\u001f\u007f]/g, ' '), n);
/* ⛔ Un texte libre ne s'affiche que s'il ne ressemble à aucune donnée de client (nom propre, adresse postale, montant, référence, lien — `AC.donneeClientProbable`) : sinon on n'en affiche RIEN et la phrase fermée de la table reste.
   `connus` : les prénoms des agents (ensemble de mots sans accent ni majuscule), qui peuvent s'écrire en majuscule. Rend le texte nettoyé et coupé, ou ''. */
const sur = (t, n, connus) => (t == null || AC.donneeClientProbable(AC.sansTel(String(t).replace(AC.ADRESSE, '(adresse)')), connus) ? '' : propre(t, n));   // jugé APRÈS le masquage des adresses et des numéros, sur le texte entier (pas sur la coupe)
const jourDe = ts => new Date(Number.isFinite(ts) ? ts : Date.now()).toISOString().slice(0, 10);

/* `f` : { agent, code, issue:'fait'|'prepare'|'echec', dossier?, n?, tache?, ref?, jour?, libre?, titre?, raison?, demandeur?, ts? } — `nomDe(id)` : le prénom d'un agent du registre.
   Rend `{ texte, cle, groupe }` ou `null` (code inconnu : rien à écrire). */
function composer(f, nomDe, connus) {
  if (!f || typeof f !== 'object' || typeof f.agent !== 'string' || !f.agent) return null;
  nomDe = typeof nomDe === 'function' ? nomDe : (x => x);
  const issue = f.issue === 'prepare' || f.issue === 'echec' ? f.issue : 'fait';
  const code = String(f.code == null ? '' : f.code);
  const dossier = typeof f.dossier === 'string' && FORME_DOSSIER.test(f.dossier) ? f.dossier : '';
  const n = Number.isInteger(f.n) && f.n >= 0 && f.n <= 9999 ? f.n : null;
  const jour = typeof f.jour === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.jour) ? f.jour : jourDe(f.ts);
  let fait = '', echec = '', chose = '', groupe = '';
  if (code.startsWith('tache:')) {
    const t = Object.prototype.hasOwnProperty.call(TACHES, code.slice(6)) ? TACHES[code.slice(6)] : null;
    if (!t) return null;
    fait = t.fait; echec = t.echec;
  } else if (code.startsWith('valide-fait:')) {
    const c = Object.prototype.hasOwnProperty.call(VALIDATIONS_FAITES, code.slice(12)) ? VALIDATIONS_FAITES[code.slice(12)] : null;
    if (!c) return null;
    fait = c.fait; echec = c.echec; groupe = f.agent + ':' + code;
  } else if (code.startsWith('valide:')) {
    const c = Object.prototype.hasOwnProperty.call(VALIDATIONS, code.slice(7)) ? VALIDATIONS[code.slice(7)] : null;
    if (!c) return null;
    chose = c; groupe = f.agent + ':' + code;
  } else {
    const c = Object.prototype.hasOwnProperty.call(CODES, code) ? CODES[code] : null;
    if (!c) return null;
    fait = c.fait; echec = c.echec;
    if (c.groupe !== false) groupe = f.agent + ':' + code;
  }
  const doss = dossier ? ' (dossier ' + dossier + ')' : '';
  const nbre = n !== null && n > 1 ? ' (' + n + ')' : '';
  const dem = f.demandeur && f.demandeur !== f.agent && (f.demandeur === 'justin' || typeof f.demandeur === 'string') ? ' (demandé par ' + (f.demandeur === 'justin' ? 'Justin' : propre(nomDe(f.demandeur), 30)) + ')' : '';
  let texte;
  if (issue === 'prepare') {
    if (!chose) chose = fait ? fait : 'quelque chose';
    texte = '📝 Je viens de préparer ' + chose + doss + ' — en attente de ta validation.';
  } else if (issue === 'echec') {
    const rs = Object.prototype.hasOwnProperty.call(RAISONS, f.raison) ? ' (' + RAISONS[f.raison] + ')' : '';
    texte = '⚠️ Je n’ai pas pu ' + (echec || 'finir un travail') + doss + rs + dem + '.';
  } else if (typeof f.libre === 'string' && sur(f.libre, LIBRE_MAX, connus)) {
    texte = '✅ Je viens de terminer : ' + sur(f.libre, LIBRE_MAX, connus) + dem;
  } else if (code === 'tache:consigne' && sur(f.titre, TITRE_MAX, connus)) {
    texte = '✅ Je viens de terminer « ' + sur(f.titre, TITRE_MAX, connus) + ' »' + dem + '.';
  } else {
    texte = '✅ Je viens ' + de(fait || 'finir un travail') + doss + nbre + dem + '.';
  }
  /* la clé : la tâche, la validation, ou (agent, code, référence, jour) — stable, donc la même chose ne s'annonce pas deux fois */
  const ref = typeof f.tache === 'string' && /^[0-9a-f]{6,32}$/.test(f.tache) ? f.tache : (typeof f.ref === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(f.ref) ? f.ref : dossier);
  const cle = ref && (f.tache || f.ref) ? 'fait:' + (issue === 'echec' ? 'echec:' : issue === 'prepare' ? 'prepare:' : '') + (f.tache ? '' : f.agent + ':' + code + ':') + ref
    : 'fait:' + f.agent + ':' + code + ':' + (dossier || '-') + ':' + jour + (issue === 'echec' ? ':echec' : '');
  return { texte, cle: cle.slice(0, 120), groupe: f.tache ? '' : groupe };
}

/* UNE TÂCHE QUI EXPIRE SE DIT (28 octobre 2026) : sept jours sans être finie, elle sortait de la file sans un mot — « disparaître en silence ». `x` : { id, vers, type, texte? } venu d'`agents.perimer`. Le texte
   d'une consigne est celui que Justin ou un collègue a écrit (déjà au fil) ; celui d'une demande fermée est le libellé de la table. */
function ligneExpiration(x, nomDe, connus) {
  if (!x || typeof x !== 'object' || typeof x.vers !== 'string') return null;
  nomDe = typeof nomDe === 'function' ? nomDe : (y => y);
  if (x.type === 'consigne') { const ti = sur(x.texte, TITRE_MAX, connus); return 'La tâche ' + (ti ? '« ' + ti + ' » ' : '') + 'de ' + propre(nomDe(x.vers), 30) + ' a expiré sans être terminée (sept jours) : elle n’est plus à faire — redonne-la si elle compte encore.'; }
  const t = Object.prototype.hasOwnProperty.call(TACHES, x.type) ? TACHES[x.type] : null;
  return t ? 'La demande « ' + t.echec + ' » faite à ' + propre(nomDe(x.vers), 30) + ' a expiré sans être traitée : elle n’est plus à faire.' : null;
}

/* Le branchement : `annoncer(f)` compose puis écrit dans « Équipe ». Les dépendances sont INJECTÉES. */
module.exports = function annonceur(ctx) {
  const { agents, conversations } = ctx || {};
  if (!agents || !Array.isArray(agents.AGENTS) || !conversations || typeof conversations.annoncerFait !== 'function') return { annoncer: () => ({ ok: false, raison: 'pas_de_dependances' }), expiree: () => ({ ok: false, raison: 'pas_de_dependances' }), composer };
  const noms = new Map(agents.AGENTS.map(a => [a.id, a.nom]));
  const nomDe = id => noms.get(id) || id;
  const connus = new Set(agents.AGENTS.map(a => String(a.nom || a.id).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  function annoncer(f) {
    let c = null; try { c = noms.has(f && f.agent) ? composer(f, nomDe, connus) : null; } catch (e) { c = null; }
    if (!c) { try { agents.noter(noms.has(f && f.agent) ? f.agent : 'systeme', 'annonce', { cible: String(f && f.code || '').slice(0, 40), resultat: 'refuse', detail: 'code inconnu' }); } catch (e) {} return { ok: false, raison: 'code' }; }
    try { return conversations.annoncerFait(f.agent, c.texte, { cle: c.cle, groupe: c.groupe }); } catch (e) { return { ok: false, raison: 'erreur' }; }
  }
  function expiree(x) {
    const l = ligneExpiration(x, nomDe, connus);
    if (!l || typeof conversations.systeme !== 'function') return { ok: false, raison: 'code' };
    try { return conversations.systeme('equipe', l, { cle: 'expire:' + String(x.id || '').slice(0, 40), unique: true }); } catch (e) { return { ok: false, raison: 'erreur' }; }
  }
  return { annoncer, expiree, composer, connus };
};
module.exports.composer = composer;
module.exports.ligneExpiration = ligneExpiration;
module.exports.VALIDATIONS_FAITES = VALIDATIONS_FAITES;
module.exports.TACHES = TACHES;
module.exports.VALIDATIONS = VALIDATIONS;
module.exports.CODES = CODES;
module.exports.RAISONS = RAISONS;
