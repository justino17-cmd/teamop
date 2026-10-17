/* ⛔ CE QUE CE FICHIER GARDE — LE COMPTEUR « INVITÉS » DU FORMULAIRE D'UNE RÉUNION COMPTE CEUX QUI SONT DÉJÀ COCHÉS (lot m16, bug « contacts#4 », 17 octobre 2026).

   Constat du testeur : « Programmer une réunion avec Dan » depuis la fiche d'un contact ouvre le formulaire avec Dan déjà coché — et le titre de section dit « INVITÉS 0 », pendant que la phrase du
   dessous (« tu peux encore en inviter 8 ») le compte bien. Le gabarit écrivait le « 0 » en dur ; le compteur ne se corrigeait qu'au premier coche (`basculerInviteForm`). Deux nombres qui disent
   la même chose et se contredisent : celui qui est écrit à la main ment.

   La VRAIE `rendreFormReunion` est extraite et exécutée (le reste de la page est un décor qui ne fait rien) :
     1. ouvert avec un invité pré-choisi (`reu.prechoisis`) : le compteur dit 1, et la phrase du plafond, relue après le service, dit « encore 8 » — les deux se répondent ;
     2. ⛔ la contre-épreuve : ouvert sans personne de pré-choisi, il dit 0 et « encore 9 » ;
     3. le pré-choix ne sert qu'une fois : le formulaire suivant repart vide (compteur 0) ;
     4. `basculerInviteForm` (le coche) continue de tenir le compteur à jour : cocher une deuxième personne dit 2.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : la phrase du plafond est lue AVANT d'être comparée (elle existe, avec un nombre). */
'use strict';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');

function elements() {
  const E = {};
  const neuf = (id) => new Proxy({ id, innerHTML: '', textContent: '', value: '', hidden: false, dataset: {}, children: [], attrs: {} }, {
    get: (t, k) => (k in t ? t[k] : (k === 'querySelectorAll' ? () => [] : function () { return ''; })),
    set: (t, k, val) => { t[k] = val; return true; },
  });
  return { E, $: (id) => E[id] || (E[id] = neuf(id)) };
}

async function ouvrir(prechoisis, plafond) {
  const { E, $ } = elements();
  const reu = { form: null, prechoisis: prechoisis || null, colleagues: [] };
  const etat = { groupe: { ouvert: true, mode: 'reunion-new', reunionId: null }, mode: 'pro' };
  const M = P.monter({ rendreFormReunion: P.decl('async function rendreFormReunion('), noteInvitesForm: P.decl('function noteInvitesForm('), basculerInviteForm: P.decl('function basculerInviteForm('),
    htmlInvitesForm: P.decl('function htmlInvitesForm('), esc: P.ligne('const esc =') }, {
    $, reu, etat, CAP: { reunionPlafond: true, salles: false }, source: { plafondReunion: async () => plafond },
    fuseauAppareil: () => 'Europe/Paris', minutesEntre: () => 60, localDans: () => '2026-10-19T10:00', REPETITIONS: [], PAYS_FUSEAUX: [], htmlDuree: () => '', htmlRappelsForm: () => '',
    optionsDe: () => '', chargerCollegues: async () => {}, candidats: () => [], mot: () => {}, villeDe: () => 'Paris',
  });
  if (M.absents.length) return { absents: M.absents };
  await M.F.rendreFormReunion(null);
  await T.dort(20);                                    // le plafond arrive après le service (une promesse) : la phrase se pose alors
  const html = E['info-corps'] ? E['info-corps'].innerHTML : '';
  const n = (/id="rf-invites-n"[^>]*>(\d+)</.exec(html) || [])[1];
  const note = (E['rf-invites-note'] || {}).textContent || '';
  const reste = (/encore en inviter (\d+)/.exec(note) || [])[1];
  return { n: n === undefined ? null : +n, reste: reste === undefined ? null : +reste, choisis: reu.form ? reu.form.choisis.slice() : null, note, M, E, reu };
}

(async () => {
  console.log('\n0. La population');
  const a = await ouvrir('u_dan', 10);
  v('(population) la vraie `rendreFormReunion` (et ses voisines) est trouvée', a.absents || [], []);
  vrai('(population) le formulaire est rendu, avec son compteur et la phrase du plafond lue (« ' + a.note + ' »)', a.n !== null && a.reste !== null);

  console.log('\n1. Dan est pré-choisi depuis sa fiche');
  v('⛔ le compteur « Invités » dit 1 (Dan est coché)', a.n, 1);
  v('   et la phrase du plafond dit « encore 8 » : les deux nombres se répondent (9 places en plus de toi, moins Dan)', [a.reste, a.n + a.reste], [8, 9]);
  v('   la liste des choisis porte Dan', a.choisis, ['u_dan']);

  console.log('\n2. La contre-épreuve : personne de pré-choisi');
  const b = await ouvrir(null, 10);
  v('le compteur dit 0 et la phrase « encore 9 »', [b.n, b.reste], [0, 9]);

  console.log('\n3. Le pré-choix ne sert qu\'une fois');
  vrai('après l\'ouverture, `reu.prechoisis` est vidé : le formulaire suivant repart vide', a.reu.prechoisis === null);

  console.log('\n4. Cocher continue de tenir le compteur à jour');
  const c = await ouvrir('u_dan', 10);
  c.E['rf-invites'] = { querySelectorAll: () => [{ dataset: { uid: 'u_eve' }, setAttribute() {} }] };
  c.M.F.basculerInviteForm('u_eve');
  v('cocher une deuxième personne : le compteur dit 2 et la phrase « encore 7 »', [c.E['rf-invites-n'] ? c.E['rf-invites-n'].textContent : null, +((/encore en inviter (\d+)/.exec(c.E['rf-invites-note'].textContent) || [])[1])], ['2', 7]);
  fin();
})().catch((e) => { console.error(e); process.exit(2); });
