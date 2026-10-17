/* ⛔ CE QUE CE FICHIER GARDE — UNE SECTION SANS CONTENU NE S'ÉCRIT PAS : LA FICHE D'UNE RÉUNION ANNULÉE N'A PLUS DE TITRE « ORGANISATEUR » VIDE (lot m16, bug « agenda#2 », 17 octobre 2026).

   Constat du testeur : la fiche d'une réunion ANNULÉE, vue par son organisatrice, garde le titre de section « ORGANISATEUR » — et rien dessous : « Décaler », « Modifier la réunion » et « Envoyer par
   courriel » disparaissent avec l'annulation (une réunion annulée ne se modifie plus), le titre reste, suivi tout de suite du titre « PRÉSENCE ». Un titre posé sans regarder s'il aura des choses à
   dire est le défaut de toutes les fiches qu'on retouche par soustraction.

   La VRAIE `htmlFiche` est extraite et exécutée ; chaque titre de section (`.rubrique`) est suivi de ce qu'il y a VRAIMENT après lui :
     1. une réunion annulée, côté organisateur, avec TOUT ce qui peut se trouver sur une fiche (rapport de présence ouvert, salle, ordre du jour) : aucun titre n'est suivi d'un autre titre ni de la
        fin — et « Supprimer la réunion » reste là, sous un titre qui a du contenu ;
     2. ⛔ la contre-épreuve : la même fiche non annulée garde « Organisateur » avec ses trois gestes dessous (on n'a pas retiré le titre à tout le monde) ;
     3. l'invité (qui n'organise pas) : jamais de titre « Organisateur », annulée ou non.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : le banc compte d'abord les titres qu'il examine. */
'use strict';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');

const OCC = { debut: 5000000, fin: 8600000 };
function fiche(o) {
  o = o || {};
  const d = { id: 'r_x', conv: 'c_x', titre: 'Point du lundi', lieu: 'Salle 3', hote: 'u_ana', version: 1, repetition: 'aucune', debut: OCC.debut, fin: OCC.fin, prochaine: OCC, annulee: !!o.annulee,
    moi: { hote: o.hote !== false, rappels: [15], statut: 'accepte' }, invites: [], ordreDuJour: [{ id: 'p1', texte: 'Budget', fait: false }], attente: false, plafond: null,
    salle: { rejoignable: false, ouverte: false, occurrence: null } };
  const F = { id: 'r_x', donnees: d, seance: null, confirme: null, courriel: null, prevenir: true, presence: o.presence || null, occurrence: null };
  const M = P.monter({ esc: P.ligne('const esc ='), maj1: P.ligne('const maj1 ='), estUrl: P.ligne('const estUrl ='), rappelCourt: P.ligne('const rappelCourt ='), htmlFiche: P.decl('function htmlFiche(') }, {
    reu: { fiche: F }, CAP: { salles: true, presenceRapport: true }, icone: (n) => '<svg data-i="' + n + '"></svg>', CHEVRON: '', CHEVRON_UD: '',
    libelleHoraire: () => ({ h: '10:00 – 11:00', note: '' }), libelleRepetition: () => '', RAPPELS_REUNION: [[15, '15 minutes avant']], FMT_JOUR_LONG: { format: () => 'lundi 19 octobre' },
    indexAvatarPage: () => 0, nomPersonne: () => 'Ana Martin', STATUTS_REPONSE: [['accepte', 'Accepter']], snapDecalage: () => ({ peut: true, debut: OCC.debut }), candidats: () => [], modesActifs: () => false,
    etat: { conversations: [] }, htmlParticipant: () => '', htmlConfirmation: () => '<div class="carte">confirmation</div>', htmlCourriel: () => '', FMT_SUIVI: { format: () => 'lundi' }, presenceLignes: () => ({ venus: [], absents: [] }) });
  return { html: M.F.htmlFiche ? M.F.htmlFiche(d) : '', absents: M.absents };
}
const titres = (html) => P.rubriques(html);
const vides = (html) => titres(html).filter((t) => t.suivi !== 'contenu').map((t) => t.titre + ' → ' + t.suivi);

(async () => {
  console.log('\n0. La population');
  const base = fiche();
  v('(population) la vraie `htmlFiche` est trouvée', base.absents, []);
  vrai('(population) la fiche d\'une réunion à venir compte plusieurs titres de section (' + titres(base.html).map((t) => t.titre).join(', ') + ')', titres(base.html).length >= 5);

  console.log('\n1. Une réunion annulée, côté organisateur : aucun titre sans contenu');
  const annulee = fiche({ annulee: true });
  vrai('(population) la fiche annulée est rendue, avec son bandeau', /Cette réunion est annulée/.test(annulee.html) && titres(annulee.html).length >= 3);
  v('⛔ aucun titre de section n\'est suivi d\'un autre titre, ni de la fin de la fiche', vides(annulee.html), []);
  vrai('   « Organisateur » reste, mais devant « Supprimer la réunion » (ce qui lui reste à dire)', titres(annulee.html).some((t) => t.titre === 'Organisateur') && /data-reu="supprimer-demander"/.test(annulee.html)
    && annulee.html.indexOf('>Organisateur<') < annulee.html.indexOf('data-reu="supprimer-demander"') && annulee.html.indexOf('>Présence<') < annulee.html.indexOf('>Organisateur<'));
  vrai('   les gestes d\'une réunion qui vit (Décaler, Modifier, Envoyer par courriel, Annuler) n\'y sont pas', !/data-reu="(decaler|modifier|courriel-ouvrir|annuler-demander)"/.test(annulee.html));
  vrai('   la section « Présence » garde son rapport', /data-reu="presence"/.test(annulee.html));

  console.log('\n2. La contre-épreuve : la fiche d\'une réunion qui vit garde son titre et ses gestes');
  const vivante = fiche();
  const i = vivante.html.indexOf('>Organisateur<');
  vrai('« Organisateur » est là, suivi de Décaler, Modifier la réunion et Envoyer par courriel', i > 0 && ['decaler', 'modifier', 'courriel-ouvrir'].every((a) => vivante.html.indexOf('data-reu="' + a + '"') > i));
  v('   et aucun titre n\'est vide non plus', vides(vivante.html), []);

  console.log('\n3. L\'invité n\'a pas de section « Organisateur »');
  vrai('ni sur une réunion qui vit, ni sur une réunion annulée', !/>Organisateur</.test(fiche({ hote: false }).html) && !/>Organisateur</.test(fiche({ hote: false, annulee: true }).html));
  v('   et ses titres ne sont jamais vides', [vides(fiche({ hote: false }).html), vides(fiche({ hote: false, annulee: true }).html)], [[], []]);
  fin();
})().catch((e) => { console.error(e); process.exit(2); });
