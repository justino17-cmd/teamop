/* ⛔ CE QUE CE FICHIER GARDE — LA FICHE D'UNE RÉUNION TERMINÉE POUR TOUS DIT CE QUE DIT LA LISTE (lot m16, bug « salle#2 », 17 octobre 2026).

   Constat du testeur : l'agenda dit « Durée 1 min · 2 présents · Terminée » sans « Rejoindre » (8 octobre 2026 : « plus de Rejoindre tant qu'aucune salle n'est rouverte » ; la ligne terminée n'est
   plus un bouton) — et la fiche de la MÊME réunion propose « Rejoindre » et « Rejoindre en audio », sans un mot de fin. Un invité qui touchait le bouton ouvrait une salle neuve, seul. La liste
   décide sur la séance de l'occurrence (`o.seance && !r.salleOuverte`) ; la fiche ne lisait que `d.salle.rejoignable`, que le service garde vrai pendant toute la fenêtre d'entrée.

   Les VRAIES fonctions de la page (`htmlFiche`, `seanceFiche`) sont extraites et exécutées :
     1. la fiche d'une réunion dont la séance est finie (aucune salle ouverte) : ni « Rejoindre » ni « Rejoindre en audio », et elle DIT qu'elle est terminée, la durée et le nombre de présents
        (les mêmes mots que la liste) ;
     2. ⛔ la contre-épreuve : une salle rouverte, ou une réunion sans séance finie, propose encore « Rejoindre » (sans quoi on aurait retiré le bouton à tout le monde) ;
     3. `seanceFiche` : la séance se lit DANS LA LISTE du service, pour l'occurrence de la fiche — la même source que l'agenda —, jamais pour une autre date de la série, jamais avec une salle
        ouverte, jamais pour une réunion annulée ; une relecture qui échoue ne change pas le verdict (`undefined`) ;
     4. dans le texte de `rendreFiche` : la séance est relue et entre dans la signature de la fiche (sinon elle ne se redessinerait pas quand la séance finit).
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque « pas de Rejoindre » est précédé du cas où il y en a un. */
'use strict';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');

const SEANCE = { debut: 1000, fin: 61000, dureeS: 60, n: 2, pourTous: true, presents: null };
const OCC = { debut: 5000000, fin: 8600000 };
function donneesFiche(F, d) {
  return {
    reu: { fiche: F }, esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    CAP: { salles: true, presenceRapport: false }, icone: (n) => '<svg data-i="' + n + '"></svg>', CHEVRON: '', CHEVRON_UD: '',
    libelleHoraire: () => ({ h: '10:00 – 11:00', note: '' }), libelleRepetition: () => '', RAPPELS_REUNION: [[15, '15 minutes avant']],
    FMT_JOUR_LONG: { format: () => 'lundi 19 octobre' }, indexAvatarPage: () => 0, nomPersonne: () => 'Ana Martin', STATUTS_REPONSE: [['accepte', 'Accepter']],
    snapDecalage: () => null, candidats: () => [], modesActifs: () => false, etat: { conversations: [] }, htmlParticipant: () => '', htmlConfirmation: () => '', htmlCourriel: () => '',
  };
}
function fiche(opts) {
  const o = opts || {};
  const d = { id: 'r_x', conv: 'c_x', titre: 'Point du lundi', lieu: '', hote: 'u_ana', version: 1, repetition: 'aucune', debut: OCC.debut, fin: OCC.fin, prochaine: OCC, annulee: !!o.annulee,
    moi: { hote: o.hote !== false, rappels: [15], statut: 'accepte' }, invites: [], ordreDuJour: [], attente: false, plafond: null,
    salle: { rejoignable: true, ouverte: !!o.ouverte, occurrence: OCC } };
  const F = { id: 'r_x', donnees: d, seance: o.seance === undefined ? null : o.seance, confirme: null, courriel: null, presence: null, occurrence: null };
  const M = P.monter({ esc: P.ligne('const esc ='), maj1: P.ligne('const maj1 ='), estUrl: P.ligne('const estUrl ='), rappelCourt: P.ligne('const rappelCourt ='), dureeSeance: P.ligne('const dureeSeance ='), htmlFiche: P.decl('function htmlFiche(') }, donneesFiche(F, d));
  return { html: M.F.htmlFiche(d), M };
}

(async () => {
  console.log('\n0. La population : les vraies fonctions sont trouvées dans la page');
  const base = fiche();
  v('(population) chaque morceau est trouvé', base.M.absents, []);
  vrai('(population) une fiche ordinaire est rendue (titre, horaire)', /Point du lundi/.test(base.html) && /10:00/.test(base.html));

  console.log('\n1. Une réunion dont la séance est finie : plus de « Rejoindre », et la fiche le dit');
  const ouverte = fiche();
  vrai('(population) sans séance finie, la fiche propose « Rejoindre » ET « Rejoindre en audio »', /data-reu="rejoindre" data-type="video"/.test(ouverte.html) && /data-reu="rejoindre" data-type="audio"/.test(ouverte.html));
  const finie = fiche({ seance: SEANCE });
  vrai('⛔ séance finie pour tous : aucun bouton « Rejoindre » (ni vidéo, ni audio)', !/data-reu="rejoindre"/.test(finie.html));
  vrai('⛔ … et la fiche DIT qu\'elle est terminée, avec la durée et les présents — les mots de la liste (« Durée 1 min · 2 présents »)', /terminée/i.test(finie.html) && /Durée 1 min/.test(finie.html) && /2 présents/.test(finie.html));
  vrai('   le titre, l\'horaire et le reste de la fiche sont toujours là (on n\'a pas vidé la fiche)', /Point du lundi/.test(finie.html) && /Ouvrir la conversation de la réunion/.test(finie.html));
  vrai('   un seul présent s\'écrit au singulier', /1 présent(?!s)/.test(fiche({ seance: Object.assign({}, SEANCE, { n: 1 }) }).html));
  vrai('   l\'invité (pas l\'organisateur) voit la même chose : pas de « Rejoindre »', !/data-reu="rejoindre"/.test(fiche({ seance: SEANCE, hote: false }).html));

  console.log('\n2. La contre-épreuve : ce qui doit garder « Rejoindre »');
  vrai('une réunion annulée n\'en propose pas (inchangé) et ne dit pas « terminée »', !/data-reu="rejoindre"/.test(fiche({ annulee: true }).html) && !/terminée/i.test(fiche({ annulee: true }).html));

  console.log('\n3. `seanceFiche` : la séance se lit dans la liste du service, pour l\'occurrence de la fiche');
  const appels = [];
  const source = (liste, panne) => ({ reunions: async (du, au) => { appels.push([du, au]); if (panne) throw new Error('panne'); return liste; } });
  const reunion = (extra) => Object.assign({ id: 'r_x', salleOuverte: false, occurrences: [Object.assign({ debut: OCC.debut, fin: OCC.fin }, { seance: SEANCE })] }, extra || {});
  const dRej = { id: 'r_x', annulee: false, salle: { rejoignable: true, ouverte: false, occurrence: OCC } };
  const lire = (liste, d, panne) => {
    const M = P.monter({ occTerminee: P.ligne('const occTerminee ='), seanceFiche: P.decl('async function seanceFiche(') }, { source: source(liste, panne), CAP: { salles: true } });
    return { M, appel: M.F.seanceFiche && M.F.seanceFiche(d || dRej, 'r_x') };
  };
  const a = lire([reunion()]);
  vrai('(population) `seanceFiche` existe dans la page', !!a.M.F.seanceFiche);
  v('la séance finie de l\'occurrence rejoignable est rendue (la même que la liste)', a.appel ? await a.appel : 'absente', SEANCE);
  v('   elle est demandée pour CETTE occurrence seulement (la fenêtre d\'une milliseconde de son début)', appels.pop(), [OCC.debut, OCC.debut + 1]);
  v('⛔ une salle rouverte (la liste dit `salleOuverte`) : pas de séance finie — « Rejoindre » revient', await lire([reunion({ salleOuverte: true })]).appel, null);
  v('⛔ une AUTRE date de la série n\'est pas la nôtre : sa séance ne termine pas l\'occurrence de la fiche', await lire([reunion({ occurrences: [{ debut: OCC.debut + 86400000, fin: OCC.fin + 86400000, seance: SEANCE }] })]).appel, null);
  v('une occurrence sans séance : rien', await lire([reunion({ occurrences: [{ debut: OCC.debut, fin: OCC.fin }] })]).appel, null);
  v('la salle est ouverte d\'après la fiche : la liste n\'est même pas relue', await (async () => { appels.length = 0; const r = await lire([reunion()], { id: 'r_x', annulee: false, salle: { rejoignable: true, ouverte: true, occurrence: OCC } }).appel; return [r, appels.length]; })(), [null, 0]);
  v('une réunion annulée : rien, et la liste n\'est pas relue', await (async () => { appels.length = 0; const r = await lire([reunion()], { id: 'r_x', annulee: true, salle: { rejoignable: true, ouverte: false, occurrence: OCC } }).appel; return [r, appels.length]; })(), [null, 0]);
  v('hors de la fenêtre d\'entrée (`rejoignable` faux) : rien à décider, la liste n\'est pas relue', await (async () => { appels.length = 0; const r = await lire([reunion()], { id: 'r_x', annulee: false, salle: { rejoignable: false, ouverte: false, occurrence: null } }).appel; return [r, appels.length]; })(), [null, 0]);
  v('⛔ la liste ne répond pas : le verdict ne change pas (`undefined` = « je ne sais pas », la fiche garde le sien)', await lire([reunion()], null, true).appel, undefined);

  console.log('\n4. Dans le texte de `rendreFiche` (sans commentaires) : la séance est relue et entre dans la signature');
  const rendre = P.decl('async function rendreFiche(');
  vrai('(population) `rendreFiche` est trouvée', rendre.length > 500);
  vrai('elle appelle `seanceFiche` pour la fiche ouverte', /seanceFiche\(/.test(rendre));
  vrai('⛔ la séance est dans la SIGNATURE de la fiche (sinon la fiche ne se redessine pas quand la séance finit)', /const sig = JSON\.stringify\(\[[^\n]*F\.seance/.test(rendre));
  fin();
})().catch((e) => { console.error(e); process.exit(2); });
