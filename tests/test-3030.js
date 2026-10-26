/* ⛔ CE QUE CE FICHIER GARDE — LA FICHE D'UNE RÉUNION TERMINÉE NE PROPOSE NI RÉPONSE, NI RAPPEL, NI TRAJET (Justin, 26 octobre 2026, décision #2).

   Le 17 octobre (`test-2581`, salle#2) la fiche d'une séance finie a perdu « Rejoindre » et l'audio, et dit « terminée · durée · présents ». Elle gardait trois choses qui n'ont plus de sens une fois la
   réunion passée : « Ta réponse » (Accepter / Peut-être / Refuser), « Me rappeler » (les puces, et « Rétablir les rappels de la réunion »), et la zone du trajet (« Partir à… »). Justin : « retirer
   Répondre, le rappel et le trajet ; garder les participants et la durée ».

   Les VRAIES fonctions de la page (`htmlFiche`) sont extraites et exécutées :
     1. une séance finie (`F.seance`, lue dans la liste — la même règle que la ligne de l'agenda) : plus de « Ta réponse », plus de « Me rappeler », plus de « Rétablir les rappels », plus de zone du trajet ;
        et la durée, les présents et la liste des participants sont toujours là ;
     2. ⛔ la contre-épreuve, JOUÉE dans les mêmes conditions : sans séance finie, la même fiche garde les trois (sans quoi on aurait retiré à tout le monde ce qui sert à la réunion de demain) ;
     3. l'organisateur et l'invité voient la même fin (le rappel ne se pose plus pour personne) ; l'invité garde « Quitter la réunion » ;
     4. une réunion ANNULÉE n'a pas changé (elle n'a jamais proposé de réponse ni de rappel) ;
     5. la zone du trajet n'existe pas dans le balisage d'une fiche terminée : `peindreTrajetReu` (la vraie) sort sans rien écrire, même si un trajet est rangé.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque « n'a plus » est précédé du cas où il y en a un. */
'use strict';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');

const SEANCE = { debut: 1000, fin: 61000, dureeS: 2520, n: 3, pourTous: true, presents: null };
const OCC = { debut: 5000000, fin: 8600000 };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function donneesFiche(F) {
  return {
    reu: { fiche: F }, esc,
    CAP: { salles: true, presenceRapport: false }, icone: (n) => '<svg data-i="' + n + '"></svg>', CHEVRON: '', CHEVRON_UD: '',
    libelleHoraire: () => ({ h: '10:00 – 11:00', note: '' }), libelleRepetition: () => '', RAPPELS_REUNION: [[15, '15 minutes avant'], [60, '1 heure avant']],
    FMT_JOUR_LONG: { format: () => 'lundi 19 octobre' }, indexAvatarPage: () => 0, nomPersonne: () => 'Ana Martin',
    STATUTS_REPONSE: [['accepte', 'Accepter'], ['peutetre', 'Peut-être'], ['decline', 'Refuser']],
    snapDecalage: () => null, candidats: () => [], modesActifs: () => false, etat: { conversations: [] },
    htmlParticipant: (r, p) => '<div class="contact" data-participant="' + esc(p.id) + '"></div>', htmlConfirmation: () => '', htmlCourriel: () => '',
  };
}
function fiche(opts) {
  const o = opts || {};
  const d = { id: 'r_x', conv: 'c_x', titre: 'Point du lundi', lieu: '12 rue des Lilas, Lyon', hote: 'u_ana', version: 1, repetition: 'aucune', debut: OCC.debut, fin: OCC.fin, prochaine: OCC, annulee: !!o.annulee,
    moi: { hote: o.hote === true, rappels: [15], rappelsPerso: !!o.rappelsPerso, statut: 'accepte', trajet: o.trajet || null }, invites: [{ id: 'u_ana', statut: 'accepte', hote: true }, { id: 'u_ben', statut: 'accepte' }], ordreDuJour: [], attente: false, plafond: null,
    salle: { rejoignable: true, ouverte: !!o.ouverte, occurrence: OCC } };
  const F = { id: 'r_x', donnees: d, seance: o.seance === undefined ? null : o.seance, confirme: null, courriel: null, presence: null, occurrence: null };
  const M = P.monter({ esc: P.ligne('const esc ='), maj1: P.ligne('const maj1 ='), estUrl: P.ligne('const estUrl ='), rappelCourt: P.ligne('const rappelCourt ='), dureeSeance: P.ligne('const dureeSeance ='), htmlFiche: P.decl('function htmlFiche(') }, donneesFiche(F));
  return { html: M.F.htmlFiche(d), M, d, F };
}
const A_REPONSE = (h) => /Ta réponse/.test(h) || /data-reu="reponse"/.test(h);
const A_RAPPEL = (h) => /Me rappeler/.test(h) || /rappel-puce/.test(h) || /id="reu-rappels"/.test(h);
const A_TRAJET = (h) => /id="reu-trajet-zone"/.test(h);

(async () => {
  console.log('\n0. La population : les vraies fonctions sont trouvées');
  const base = fiche();
  v('(population) chaque morceau est trouvé', base.M.absents, []);
  vrai('(population) une fiche ordinaire est rendue (titre, horaire, participants)', /Point du lundi/.test(base.html) && /10:00/.test(base.html) && (base.html.match(/data-participant/g) || []).length === 2);

  console.log('\n1. Une réunion qui vit encore garde les trois (la contre-épreuve vient D\'ABORD)');
  const vivante = fiche({ rappelsPerso: true });
  vrai('⛔ un invité : « Ta réponse » avec ses trois choix, « Me rappeler » avec ses puces, « Rétablir les rappels », la zone du trajet', A_REPONSE(vivante.html) && (vivante.html.match(/data-reu="reponse"/g) || []).length === 3 && A_RAPPEL(vivante.html) && (vivante.html.match(/rappel-puce/g) || []).length === 2 && /data-reu="rappels-defaut"/.test(vivante.html) && A_TRAJET(vivante.html));
  vrai('⛔ l\'organisateur : les rappels et le trajet, pas de réponse (il n\'en a jamais eu)', !A_REPONSE(fiche({ hote: true }).html) && A_RAPPEL(fiche({ hote: true }).html) && A_TRAJET(fiche({ hote: true }).html));

  console.log('\n2. Une réunion TERMINÉE : plus de réponse, de rappel ni de trajet — la durée et les participants restent');
  const finie = fiche({ seance: SEANCE, rappelsPerso: true });
  vrai('⛔ l\'invité : aucun « Ta réponse », aucun bouton de réponse (Accepter, Peut-être, Refuser)', !A_REPONSE(finie.html) && !/Accepter|Peut-être|Refuser/.test(finie.html));
  vrai('⛔ … aucun « Me rappeler », aucune puce, aucun « Rétablir les rappels de la réunion » (même quand l\'invité avait réglé les siens)', !A_RAPPEL(finie.html) && !/rappels-defaut/.test(finie.html) && !/Rétablir les rappels/.test(finie.html));
  vrai('⛔ … aucune zone du trajet', !A_TRAJET(finie.html));
  vrai('   la fiche DIT toujours qu\'elle est terminée, la durée et les présents : « Durée 42 min · 3 présents »', /Cette réunion est terminée/.test(finie.html) && /Durée 42 min/.test(finie.html) && /3 présents/.test(finie.html));
  vrai('   les participants sont toujours là (deux lignes), avec leur titre', (finie.html.match(/data-participant/g) || []).length === 2 && /<span>Participants<\/span><span>2<\/span>/.test(finie.html));
  vrai('   le titre, l\'horaire et le lieu aussi (on n\'a pas vidé la fiche) ; l\'invité garde « Quitter la réunion »', /Point du lundi/.test(finie.html) && /10:00/.test(finie.html) && /12 rue des Lilas/.test(finie.html) && /data-reu="quitter-demander"/.test(finie.html));

  console.log('\n3. L\'organisateur voit la même fin');
  const finieH = fiche({ seance: SEANCE, hote: true });
  vrai('⛔ organisateur : ni rappel, ni trajet ; durée et participants conservés', !A_RAPPEL(finieH.html) && !A_TRAJET(finieH.html) && /Durée 42 min/.test(finieH.html) && (finieH.html.match(/data-participant/g) || []).length === 2);

  console.log('\n4. Les autres états n\'ont pas bougé');
  const annulee = fiche({ annulee: true });
  vrai('une réunion ANNULÉE n\'a ni réponse ni rappel (inchangé), et la zone du trajet est posée comme avant', !A_REPONSE(annulee.html) && !A_RAPPEL(annulee.html) && A_TRAJET(annulee.html));
  vrai('une séance finie ET annulée (la salle a eu lieu, puis l\'annulation) : la fiche est celle d\'une annulée, pas d\'une terminée', /annulée/.test(fiche({ annulee: true, seance: SEANCE }).html) && !/Cette réunion est terminée/.test(fiche({ annulee: true, seance: SEANCE }).html));
  vrai('une salle rouverte (`seance` effacée) : les trois reviennent (la réunion vit de nouveau)', A_REPONSE(fiche({ seance: null, ouverte: true }).html) && A_RAPPEL(fiche({ seance: null, ouverte: true }).html) && A_TRAJET(fiche({ seance: null, ouverte: true }).html));

  console.log('\n5. `peindreTrajetReu` (la vraie) n\'écrit rien dans une fiche terminée');
  const posees = [];
  const zone = { innerHTML: '', _trajet: undefined };       // (la zone n'est dans aucune page : `$` rend null, comme `getElementById` d'un balisage qui ne la pose pas)
  const trajet = { depart: 'position', mode: 'voiture', avance: 5, minutes: 20 };
  const F5 = { donnees: fiche({ seance: SEANCE, trajet }).d, seance: SEANCE };
  const M5 = P.monter({ peindreTrajetReu: P.decl('function peindreTrajetReu(') }, {
    $: () => null, reu: { fiche: F5 }, CAP: { trajet: true }, TJ: { ouvert: true }, source: { trajetReunion() {} },
    occurrenceTrajetReu: () => OCC, reuTrajetVoulu: () => false, trajetReuPossible: () => true, htmlTrajetReu: () => { posees.push('peint'); return '<p>trajet</p>'; }, trajetReuEtat: () => ({}), lieuARanger: () => false, estUrl: () => false, document: { activeElement: null },
  });
  vrai('(population) `peindreTrajetReu` est trouvée', !!M5.F.peindreTrajetReu && M5.absents.length === 0);
  M5.F.peindreTrajetReu();
  v('la zone n\'existe pas (le balisage ne la pose plus) : la fonction sort, rien n\'est écrit — ni trajet, ni « Il ne sert plus »', [zone.innerHTML, posees.length], ['', 0]);
  fin();
})().catch((e) => { console.error('✗ le banc est mort :', e && e.stack || e); process.exit(1); });
