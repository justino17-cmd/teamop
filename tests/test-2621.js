/* ⛔ CE QUE CE FICHIER GARDE — LA PAGE NE PROPOSE PAS « TERMINER POUR TOUS » À L'HÔTE PAR INTÉRIM (lot p01, `n#10`, 17 octobre 2026 ; les VRAIES fonctions de la page, exécutées).

   `test-2620` joue le SERVICE : l'invité nommé arrivé avant l'organisateur reçoit 403 `interdit` s'il termine la réunion pour tous. Ici, la PAGE. Le service renvoie `moi.proprietaire` = grade >= 2, intérimaire
   compris : trois endroits lisaient ce seul drapeau et lui proposaient quand même le geste (le bouton rouge de « Plus », le choix « Quitter la salle / Terminer pour tous » du bouton Quitter, et les deux
   actions `terminer-demander` / `terminer-confirmer` de `salleAgir`, que la liste de refus de l'intérim omettait). Le bouton aurait mené à une erreur « La salle n'a pas pu être terminée. » : une commande
   offerte qui ne peut pas aboutir.

     1. `htmlPlus` (le vrai) : l'hôte (grade 2, sans `interim`) a « Terminer pour tous » ; l'intérimaire n'a PAS ce bouton — et garde le reste de « Plus » (on n'a pas vidé le panneau) ;
     2. `salleAgir` (la vraie) : `terminer-demander` ouvre le panneau pour l'hôte ; l'intérimaire est arrêté (un mot, aucun panneau) ; `terminer-confirmer` n'appelle `salleGeste` pour lui ni ne ferme le panneau ;
     3. `salleTerminable` (la règle unique) : vrai pour l'hôte, faux pour l'intérimaire, faux pour un co-hôte / participant ; et le bouton Quitter la lit (le choix « finir pour tous » n'est plus ouvert à l'intérimaire).
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque « pas de bouton » est précédé du cas où il y en a un (la population est comptée). */
'use strict';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');

const snap = (moi) => ({ moi: Object.assign({ hote: false, proprietaire: false, grade: 0, main: false }, moi), membres: [], genre: 'reunion', reunion: '', outils: false, nb: 3, rec: null, minuteur: null });
const aff = (s) => ({ snap: s, ecran: false });

function plus(s) {
  const M = P.monter({ htmlPlus: P.decl('function htmlPlus(A) {'), salleTerminable: P.ligne('const salleTerminable =') },
    { esc: (x) => String(x), sx: () => ({ vue: 'galerie' }), MOI: { id: 'u_moi' }, EMOJI_SALLE: {}, NOM_REACTION: {}, MINUTEURS: [], CAP: { presenceRapport: false }, salleRecPossible: () => false, pipPossible: () => false, source: {}, ID_REUNION: /^$/, clavierPresent: () => false,
      sortieChoisissable: () => false, ligneFlou: () => '', document: {}, matchMedia: () => ({ matches: false }) });
  return { M, html: M.F.htmlPlus ? M.F.htmlPlus(aff(s)) : '' };
}

(async () => {
  console.log('1. « Plus » : le bouton « Terminer pour tous »');
  const hote = plus(snap({ hote: true, proprietaire: true, grade: 2 }));
  v('(population) les morceaux sont trouvés', hote.M.absents, []);
  vrai('(population) « Plus » est rendu en entier (Réagir, Lever la main)', /Réagir/.test(hote.html) && /Lever la main/.test(hote.html));
  vrai('l\'hôte (grade 2) a « Terminer pour tous »', /data-sa="terminer-demander"/.test(hote.html));
  const inter = plus(snap({ hote: true, proprietaire: true, grade: 2, interim: true }));
  vrai('(population) le panneau de l\'intérimaire est rendu aussi (Réagir, Lever la main) — on n\'a pas vidé « Plus »', /Réagir/.test(inter.html) && /Lever la main/.test(inter.html));
  vrai('⛔ l\'intérimaire n\'a PAS « Terminer pour tous » (le service le lui refuse)', !/terminer-demander/.test(inter.html) && !/Terminer pour tous/.test(inter.html));
  vrai('un participant (grade 0) non plus (inchangé)', !/terminer-demander/.test(plus(snap({})).html) && /Réagir/.test(plus(snap({})).html));

  console.log('\n2. `salleAgir` : les deux actions du geste');
  function agir(s, act) {
    const j = { mots: [], panneaux: [], gestes: [], fermes: 0 };
    const A = aff(s);
    const M = P.monter({ salleAgir: P.decl('async function salleAgir(act, el) {') },
      { etat: { appelUI: A }, enSalle: () => true, sx: () => ({}), mot: (t) => j.mots.push(t), salleOuvrirPanneau: (a, nom) => j.panneaux.push(nom), salleFermerPanneau: () => { j.fermes++; },
        salleGeste: async (a, nom) => { j.gestes.push(nom); }, raccrocherCouche: () => {}, $: () => ({}) });
    return M.F.salleAgir ? M.F.salleAgir(act, { dataset: {} }).then(() => j) : Promise.resolve(Object.assign(j, { absent: true }));
  }
  const h1 = await agir(snap({ hote: true, proprietaire: true, grade: 2 }), 'terminer-demander');
  v('(population) `salleAgir` est trouvée ; l\'hôte qui demande ouvre le panneau « quitter »', [!!h1.absent, h1.panneaux], [false, ['quitter']]);
  const h2 = await agir(snap({ hote: true, proprietaire: true, grade: 2 }), 'terminer-confirmer');
  v('(population) l\'hôte qui confirme : le geste `terminerPourTous` part', [h2.gestes, h2.fermes], [['terminerPourTous'], 1]);
  const i1 = await agir(snap({ hote: true, proprietaire: true, grade: 2, interim: true }), 'terminer-demander');
  v('⛔ l\'intérimaire qui demande : aucun panneau, un mot le lui dit', [i1.panneaux, i1.mots.length], [[], 1]);
  const i2 = await agir(snap({ hote: true, proprietaire: true, grade: 2, interim: true }), 'terminer-confirmer');
  v('⛔ l\'intérimaire qui confirme (commande restée affichée) : AUCUN geste ne part, aucun panneau n\'est fermé', [i2.gestes, i2.fermes, i2.mots.length], [[], 0, 1]);
  const i3 = await agir(snap({ hote: true, proprietaire: true, grade: 2, interim: true }), 'quitter-simple');
  v('contre-épreuve : « Quitter la salle » reste permis à l\'intérimaire (il part, le rôle passe)', [i3.mots.length, i3.gestes], [0, []]);

  console.log('\n3. La règle unique, et le bouton Quitter');
  const R = P.monter({ salleTerminable: P.ligne('const salleTerminable =') }, {});
  v('(population) `salleTerminable` est trouvée', R.absents, []);
  v('l\'hôte : oui · l\'intérimaire : non · un co-hôte : non · un participant : non',
    [R.F.salleTerminable(snap({ proprietaire: true, grade: 2 })), R.F.salleTerminable(snap({ proprietaire: true, grade: 2, interim: true })), R.F.salleTerminable(snap({ grade: 1 })), R.F.salleTerminable(snap({}))], [true, false, false, false]);
  /* le bouton Quitter : son écouteur n'est pas une fonction nommée — on lit le CODE (commentaires retirés), jamais une phrase */
  vrai('le bouton Quitter n\'ouvre le choix « finir pour tous » que si `salleTerminable(s)` (plus `s.moi.proprietaire` seul)', /enSalle\(A\) && salleTerminable\(s\) && s\.nb > 1\) \{ salleOuvrirPanneau\(A, 'quitter'/.test(P.JS) && !/enSalle\(A\) && s\.moi\.proprietaire && s\.nb > 1/.test(P.JS));
  fin();
})().catch((e) => { console.error('✗ le banc est mort :', e && e.stack || e); process.exit(1); });
