/* ⛔ CE QUE CE FICHIER GARDE — L'ÉCRAN DE SORTIE D'UNE SALLE : UN REFUS D'ENTRER RESTE À L'ÉCRAN AVEC SA RAISON ET « RETOUR » ; LA FIN D'UNE RÉUNION MONTRE LA DURÉE, QUI ÉTAIT LÀ, ET
   « REVENIR À LA CONVERSATION » (Justin, 26 octobre 2026, décisions #4 — salle@4 — et #5 — salle@10).

   Avant : un refus de l'hôte, un retrait, une réunion annulée ou terminée refermaient la couche de l'appel « tout de suite » et laissaient un toast de 2,4 s sur la page d'avant (la phrase du service
   — « L'hôte n'a pas accepté ta demande » — ne se lisait pas) ; la fin d'une réunion ne disait ni combien de temps ni avec qui. Maintenant la couche RESTE : `sortieDe` décide du cas, `sortieMontrer`
   pose l'écran (et lâche le micro et la caméra tout de suite), son bouton ferme la couche ou ouvre la conversation de la réunion.

   Les VRAIES fonctions de la page sont extraites et exécutées :
     1. `sortieDe` (la décision) : refus de l'hôte, retrait, réunion annulée ou supprimée, salle terminée PENDANT qu'on attendait à la porte, entrée dans une salle déjà finie → « refus », avec la
        raison du service ; fin de la réunion (par l'hôte, par la dernière sortie) → « fin » avec durée et conversation ; ⛔ ce qui garde son avis d'avant (connexion perdue, appel pris ailleurs, compte
        supprimé), un appel de groupe qui se termine, un appel à deux → rien (la couche se ferme comme avant) ;
     2. `rafraichirAppel` (la vraie) joue la décision : un snapshot « terminé » pose l'écran au lieu de fermer — sauf appel RÉDUIT (on est ailleurs : pas d'écran plein sur ce qu'on lit) ou
        raccrochage voulu (`etat.raccrocher`) ; un appel déjà sur son écran de sortie n'est pas retouché ; `afficherAppel` fait de même pour une salle déjà finie à l'arrivée ;
     3. `sortieMontrer` (la vraie) : le titre, la raison, les deux lignes « Durée » et « Présents » (la durée absente si la salle n'a pas couru), le bouton (« Retour » ou « Revenir à la conversation »,
        et « Retour » si la conversation n'est pas connue), `data-sortie` posé, les médias lâchés UNE fois, un second appel sans effet ;
     4. `sortiePresents` : « Toi seul », « Toi, Ana », « Toi, Ana et Ben », « … et 2 autres » (quatre noms au plus) ;
     5. le CÂBLAGE (le code, commentaires retirés) : le bouton, Échap, un appel qui arrive, `appliquer`, `quitterAppel`, `rendreAppel`/`majParle` qui se taisent, `rendreSalle` qui note qui était là.
   La mesure au navigateur (la couche reste, la caméra s'éteint, les captures) : scratchpad/opmsg-a/sonde-sortie.js.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque « rien n'est posé » est précédé du cas où l'écran est posé. */
'use strict';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');

const dureeSeance = P.ligne('const dureeSeance =');
const el = () => {
  const e = { _t: '', children: [], dataset: {}, attrs: {}, focused: false, hidden: false,
    get textContent() { return this._t; }, set textContent(x) { this._t = x; if (x === '') this.children = []; },
    append(...c) { this.children.push(...c); }, focus() { this.focused = true; }, setAttribute(k, x) { this.attrs[k] = x; } };
  return e;
};
function monde(over) {
  const ids = {}; const $ = (id) => ids[id] || (ids[id] = el());
  const doc = { documentElement: { dataset: {} }, createElement: () => el() };
  const appels = { lacher: 0, mot: [], raccroche: 0, annonce: [], inert: 0, remplace: [], montre: [] };
  const D = Object.assign({
    $, document: doc, appels, esc: (s) => String(s),
    appelLacherMedias: () => { appels.lacher++; }, synchroInert: () => { appels.inert++; }, annonceAppel: (t) => { appels.annonce.push(t); },
    mot: (t) => { appels.mot.push(t); }, raccrocherCouche: () => { appels.raccroche++; }, remplacer: (r) => { appels.remplace.push(r); }, parentDe: (r) => Object.assign({}, r, { appel: null }),
    perime: (A) => !!A.fini, etat: { appelReduit: false, raccroche: false, raccrocher: false, route: { vue: 'messages', conv: 'c_x', appel: 'a1' } },
    enSalle: (A) => !!(A && A.snap && A.snap.salle && !A.snap.entrant), rendreAppel: () => { appels.rendre = (appels.rendre || 0) + 1; }, arreterSonnerie: () => {}, ouvrirConversationAvec: (m, c) => { appels.conv = [m, c]; },
  }, over || {});
  return { D, $, doc, appels };
}
const snap = (o) => Object.assign({ id: 'a1', etat: 'termine', salle: true, entrant: false, genre: 'reunion', issue: 'termine', avis: 'L\'hôte a mis fin à la réunion.', duree: 2520, conv: 'c_x', membres: [], attente: false }, o || {});
const monter = (over) => {
  const W = monde(over);
  const M = P.monter({ ISSUES_SANS_ECRAN: P.ligne('const ISSUES_SANS_ECRAN ='), sortieDe: P.decl('function sortieDe('), sortiePresents: P.decl('function sortiePresents('), sortieMontrer: P.decl('function sortieMontrer('),
    rafraichirAppel: P.decl('async function rafraichirAppel('), afficherAppel: P.decl('async function afficherAppel('), dureeSeance }, W.D);
  return { M, W };
};

(async () => {
  const base = monter();
  console.log('0. La population');
  v('(population) chaque morceau est trouvé', base.M.absents, []);
  const sd = base.M.F.sortieDe;

  console.log('\n1. `sortieDe` : refus, fin, ou rien');
  const so = (prec, s, ch) => sd(prec, s, ch);
  v('⛔ l\'hôte a mis fin à la réunion : « fin », avec la durée, la conversation et la phrase du service', so({ attente: false }, snap()), { mode: 'fin', titre: 'Réunion terminée', raison: 'L\'hôte a mis fin à la réunion.', duree: 2520, conv: 'c_x' });
  v('la dernière personne est partie (« fini », aucune phrase) : « fin », la raison est vide', so({}, snap({ issue: 'fini', avis: null })), { mode: 'fin', titre: 'Réunion terminée', raison: '', duree: 2520, conv: 'c_x' });
  v('une salle qui n\'a pas couru (durée 0) : « fin » sans durée', so({}, snap({ duree: 0 })).duree, 0);
  v('⛔ l\'hôte n\'a pas accepté ma demande à la porte : « refus », « Tu n\'es pas entré dans la réunion » et SA phrase', so({ attente: true }, snap({ issue: 'refuse_hote', avis: 'L\'hôte n\'a pas accepté ta demande.' })), { mode: 'refus', titre: 'Tu n\'es pas entré dans la réunion', raison: 'L\'hôte n\'a pas accepté ta demande.' });
  v('⛔ la salle se termine PENDANT que j\'attends à la porte : un refus (pas une « fin » : je n\'y suis jamais entré)', so({ attente: true }, snap()).mode, 'refus');
  v('   … et sans phrase du service, la raison est dite quand même', so({ attente: true }, snap({ avis: null })).raison, 'La réunion s\'est terminée avant que tu entres.');
  v('retiré par l\'hôte : « Tu as été retiré », et la phrase', so({}, snap({ issue: 'exclu', avis: 'L\'hôte t\'a retiré de la réunion.' })), { mode: 'refus', titre: 'Tu as été retiré', raison: 'L\'hôte t\'a retiré de la réunion.' });
  v('réunion annulée, supprimée : « refus » avec leur titre', [so({}, snap({ issue: 'annulee', avis: 'La réunion a été annulée.' })).titre, so({}, snap({ issue: 'supprimee', avis: 'La réunion a été supprimée.' })).titre], ['Réunion annulée', 'Réunion supprimée']);
  v('entrer dans une salle DÉJÀ FINIE (à l\'arrivée) : « refus » « Cette réunion est terminée », la raison du service ; un appel : « Cet appel est terminé »', [so(null, snap(), true), so(null, snap({ genre: 'groupe', avis: null }), true)].map(x => [x.mode, x.titre, x.raison]), [['refus', 'Cette réunion est terminée', 'L\'hôte a mis fin à la réunion.'], ['refus', 'Cet appel est terminé', 'Tu ne peux plus y entrer.']]);
  v('un appel de GROUPE retiré par l\'hôte : « refus » aussi (le refus vaut pour toute salle)', so({}, snap({ genre: 'groupe', issue: 'exclu', avis: 'L\'hôte t\'a retiré de l\'appel.' })).mode, 'refus');
  /* — ce qui garde son avis d'avant — */
  v('⛔ connexion perdue, appel pris ailleurs, parti ailleurs, compte supprimé : aucun écran (l\'avis d\'avant, la couche se ferme)', ['perdu', 'pris_ailleurs', 'parti_ailleurs', 'compte'].map(i => so({}, snap({ issue: i }))), [null, null, null, null]);
  v('⛔ un appel de groupe qui se TERMINE (ni refus ni réunion), un appel à deux, un appel pas fini : rien', [so({}, snap({ genre: 'groupe' })), so({}, snap({ salle: false })), so({}, snap({ etat: 'en-cours' }))], [null, null, null]);

  console.log('\n2. `rafraichirAppel` et `afficherAppel` jouent la décision');
  async function rafraichir(prec, s, over) {
    const m = monter(Object.assign({ source: { appel: async () => s } }, over || {}));
    const A = { id: 'a1', snap: prec, fini: false, sx: { venus: new Map([['u1', 'Ana']]) } }; m.W.D.etat.appelUI = A;
    m.W.D.etat.appelId = 'a1';
    m.M.F.rafraichirAppel && await m.M.F.rafraichirAppel();
    return { A, W: m.W };
  }
  const reunionEnCours = snap({ etat: 'en-cours', issue: null, avis: null });
  const a1 = await rafraichir(reunionEnCours, snap());
  vrai('(population) la fonction réelle est trouvée', typeof base.M.F.rafraichirAppel === 'function' && typeof base.M.F.afficherAppel === 'function');
  vrai('⛔ une réunion qui finit sous nos yeux : l\'écran de sortie est posé (la couche ne se ferme pas, aucun toast, aucun raccrochage)', a1.A.sortie && a1.A.sortie.mode === 'fin' && a1.W.appels.raccroche === 0 && a1.W.appels.mot.length === 0 && a1.W.doc.documentElement.dataset.sortie === '1');
  const a2 = await rafraichir(snap({ etat: 'sonne', attente: true, issue: null, avis: null }), snap({ issue: 'refuse_hote', avis: 'L\'hôte n\'a pas accepté ta demande.' }));
  vrai('⛔ refusé à la porte : l\'écran de sortie reste avec la raison — pas de toast de 2,4 s, pas de retour à la page d\'avant', a2.A.sortie && a2.A.sortie.mode === 'refus' && a2.W.D.$('sortie-raison').textContent === 'L\'hôte n\'a pas accepté ta demande.' && a2.W.appels.raccroche === 0 && a2.W.appels.mot.length === 0);
  const a3 = await rafraichir(reunionEnCours, snap({ issue: 'perdu', avis: 'La connexion a été perdue.' }));
  vrai('contre-épreuve : la connexion perdue garde l\'ancien chemin (le toast et la couche qui se ferme), aucun écran', !a3.A.sortie && a3.W.appels.mot[0] === 'La connexion a été perdue.' && a3.W.appels.raccroche === 1 && !a3.W.doc.documentElement.dataset.sortie);
  const a4 = await rafraichir(reunionEnCours, snap(), { etat: { appelReduit: true, route: { vue: 'messages', conv: 'c_x', appel: null } } });
  vrai('⛔ un appel RÉDUIT (on est ailleurs, la barre verte) : pas d\'écran plein sur ce qu\'on lit — la barre se referme avec la phrase, comme avant', !a4.A.sortie && a4.W.appels.raccroche === 1 && a4.W.appels.mot.length === 1);
  const a5 = await rafraichir(reunionEnCours, snap(), { etat: { appelReduit: false, raccrocher: true, route: { vue: 'messages', conv: 'c_x', appel: 'a1' } } });
  vrai('on a raccroché soi-même (`etat.raccrocher`) : pas d\'écran — on est parti de son plein gré', !a5.A.sortie && a5.W.appels.raccroche === 1);
  const a6 = await rafraichir(reunionEnCours, snap({ genre: 'groupe' }));
  vrai('un appel de groupe qui se termine : l\'ancien chemin (toast + couche fermée)', !a6.A.sortie && a6.W.appels.raccroche === 1);
  const a7 = await rafraichir(reunionEnCours, snap({ etat: 'en-cours', issue: null, avis: null }));
  vrai('(population) une salle qui vit encore est redessinée, sans écran de sortie', !a7.A.sortie && (a7.W.appels.rendre || 0) === 1 && a7.W.appels.raccroche === 0);
  const m8 = monter({ source: { appel: async () => { throw new Error('ne doit pas être relu'); } } });
  const A8 = { id: 'a1', snap: snap(), sortie: { mode: 'fin' }, fini: true }; m8.W.D.etat.appelUI = A8;
  let leve = null; try { await m8.M.F.rafraichirAppel(); } catch (e) { leve = e; }
  vrai('⛔ un appel déjà sur son écran de sortie n\'est plus relu ni retouché (aucune lecture de la source, aucun effet)', leve === null && m8.W.appels.raccroche === 0 && m8.W.appels.mot.length === 0);
  /* afficherAppel : une salle déjà finie à l'arrivée */
  async function afficher(s, over) {
    const W = monde(Object.assign({ source: { appel: async () => s }, garderEcran: () => {}, majStatutAppel: () => {} }, over || {}));
    W.D.etat.jetonAppel = 0; W.D.etat.choixEntree = null;
    const pos = [];
    W.D.sortieMontrer = (A, so) => { pos.push([A.snap && A.snap.id, so]); };
    const M2 = P.monter({ ISSUES_SANS_ECRAN: P.ligne('const ISSUES_SANS_ECRAN ='), sortieDe: P.decl('function sortieDe('), afficherAppel: P.decl('async function afficherAppel(') }, W.D);
    await M2.F.afficherAppel('a1');
    return { pos, W };
  }
  const f1 = await afficher(snap());
  v('⛔ entrer dans une réunion déjà finie : l\'écran de sortie (« Cette réunion est terminée »), pas un retour immédiat', [f1.pos.length, f1.pos[0] && f1.pos[0][1].mode, f1.pos[0] && f1.pos[0][1].titre, f1.W.appels.remplace.length, f1.W.appels.mot.length], [1, 'refus', 'Cette réunion est terminée', 0, 0]);
  const f2 = await afficher(snap({ salle: false, etat: 'termine' }));
  v('contre-épreuve : un appel à deux déjà fini garde le chemin d\'avant (retour à la page, toast « L\'hôte… »)', [f2.pos.length, f2.W.appels.remplace.length, f2.W.appels.mot.length], [0, 1, 1]);

  console.log('\n3. `sortieMontrer` : ce que l\'écran dit');
  async function montrer(so, A0) {
    const m = monter();
    const A = Object.assign({ id: 'a1', snap: snap(), sx: { venus: new Map([['u1', 'Ana'], ['u2', 'Ben']]) } }, A0 || {});
    m.M.F.sortieMontrer(A, so);
    return { A, W: m.W, D: m.W.D };
  }
  const fin1 = await montrer({ mode: 'fin', titre: 'Réunion terminée', raison: 'L\'hôte a mis fin à la réunion.', duree: 2520, conv: 'c_x' });
  vrai('⛔ « fin » : le titre, la raison, deux lignes (« Durée 42 min », « Présents Toi, Ana et Ben ») et « Revenir à la conversation »',
    fin1.D.$('sortie-titre').textContent === 'Réunion terminée' && fin1.D.$('sortie-raison').textContent === 'L\'hôte a mis fin à la réunion.' && fin1.D.$('sortie-faits').children.length === 2
    && fin1.D.$('sortie-faits').children.map(d => d.children.map(c => c.textContent).join('|')).join(' / ') === 'Durée|42 min / Présents|Toi, Ana et Ben' && fin1.D.$('sortie-bouton').textContent === 'Revenir à la conversation' && fin1.A.sortie.versConv === true);
  vrai('l\'écran est posé : `data-sortie`, les médias lâchés UNE fois, la salle rendue inerte pour le dessous, annoncé à l\'oreille, focalisé', fin1.D.document.documentElement.dataset.sortie === '1' && fin1.W.appels.lacher === 1 && fin1.W.appels.inert === 1 && /Réunion terminée\. L'hôte a mis fin/.test(fin1.W.appels.annonce[0] || '') && fin1.D.$('sortie-ecran').focused);
  const fin2 = await montrer({ mode: 'fin', titre: 'Réunion terminée', raison: '', duree: 0, conv: 'c_x' });
  v('une salle qui n\'a pas couru : pas de ligne « Durée » — seulement « Présents »', fin2.D.$('sortie-faits').children.map(d => d.children[0].textContent), ['Présents']);
  const fin3 = await montrer({ mode: 'fin', titre: 'Réunion terminée', raison: '', duree: 60, conv: null });
  v('la conversation n\'est pas connue : le bouton dit « Retour » (jamais « Revenir à la conversation » qui ne mènerait nulle part)', [fin3.D.$('sortie-bouton').textContent, fin3.A.sortie.versConv], ['Retour', false]);
  const ref = await montrer({ mode: 'refus', titre: 'Tu as été retiré', raison: 'L\'hôte t\'a retiré de la réunion.' });
  vrai('⛔ « refus » : le titre, la raison, AUCUNE ligne de faits, « Retour »', ref.D.$('sortie-titre').textContent === 'Tu as été retiré' && ref.D.$('sortie-raison').textContent === 'L\'hôte t\'a retiré de la réunion.' && ref.D.$('sortie-faits').children.length === 0 && ref.D.$('sortie-bouton').textContent === 'Retour' && ref.A.sortie.versConv === false);
  const deux = await (async () => { const m = monter(); const A = { id: 'a1', snap: snap(), sx: {} }; m.M.F.sortieMontrer(A, { mode: 'refus', titre: 'x', raison: 'y' }); m.M.F.sortieMontrer(A, { mode: 'fin', titre: 'z', raison: 'w' }); return { A, W: m.W }; })();
  v('⛔ un second appel ne refait rien (l\'écran posé est celui du premier verdict) : titre inchangé, médias lâchés une fois', [deux.A.sortie.titre, deux.W.appels.lacher], ['x', 1]);
  const rienPose = (() => { const m = monter(); m.M.F.sortieMontrer({ id: 'a1', snap: snap() }, null); return [m.W.appels.lacher, m.W.doc.documentElement.dataset.sortie || null]; })();
  v('sans verdict (`null`), rien n\'est posé : aucun média lâché, pas de `data-sortie` (la couche n\'est pas figée sur un écran vide)', rienPose, [0, null]);

  console.log('\n4. `sortiePresents`');
  const pres = (n) => { const m = monter(); return m.M.F.sortiePresents({ sx: { venus: new Map(Array.from({ length: n }, (_, i) => ['u' + i, ['Ana', 'Ben', 'Cléo', 'Dan', 'Eve', 'Fay'][i]])) } }); };
  v('0, 1, 2, 4, 5, 6 présents', [0, 1, 2, 4, 5, 6].map(pres), ['Toi seul', 'Toi, Ana', 'Toi, Ana et Ben', 'Toi, Ana, Ben, Cléo et Dan', 'Toi, Ana, Ben, Cléo et 2 autres', 'Toi, Ana, Ben, Cléo et 3 autres']);
  v('une salle sans mémoire des présents (`sx` absent) : « Toi seul », sans exception', (() => { const m = monter(); return m.M.F.sortiePresents({}); })(), 'Toi seul');

  console.log('\n5. Le câblage (le code de la page, commentaires retirés)');
  const JS = P.JS;
  const corps = (d) => P.decl(d);
  vrai('le bouton : « Revenir à la conversation » ouvre la conversation de la salle (`ouvrirConversationAvec([], conv)`), « Retour » ferme la couche (`raccrocherCouche`)', /\$\('sortie-bouton'\)\.addEventListener\('click', \(\) => \{\s*const A = etat\.appelUI; if \(!A \|\| !A\.sortie\) return;\s*if \(A\.sortie\.versConv\) ouvrirConversationAvec\(\[\], A\.sortie\.conv\); else raccrocherCouche\(\);/.test(JS));
  vrai('Échap : `salleEchap` ne tient pas une salle sur son écran de sortie (la touche ferme la couche, comme un retour)', /function salleEchap\(\) \{\s*const A = etat\.appelUI; if \(!enSalle\(A\) \|\| A\.sortie\) return false;/.test(JS));
  vrai('un appel qui arrive pendant l\'écran de sortie y prend la place (`surAppelEntrant` ne l\'ignore pas), et `appliquer` referme l\'ancien par la sortie unique', /const surSortie = !!\(etat\.appelUI && etat\.appelUI\.sortie\);/.test(JS) && /\(etat\.appelId && !surSortie\)/.test(JS) && /if \(etat\.appelReduit \|\| \(etat\.appelUI && etat\.appelUI\.sortie\)\) quitterAppel\(\); afficherAppel\(veutAppel\);/.test(corps('function appliquer(r)')));
  vrai('la couche qui se ferme retire `data-sortie` (quitterAppel) ; la salle ni l\'appel ne sont redessinés dessous (`rendreAppel`, `majParle`, `rafraichirAppel` se taisent)', /delete document\.documentElement\.dataset\.sortie;/.test(corps('function quitterAppel(')) && /if \(!A \|\| !A\.snap \|\| A\.sortie\) return;/.test(corps('function rendreAppel(')) && /if \(!enSalle\(A\) \|\| A\.sortie\) return;/.test(corps('async function majParle(')) && /if \(A\.sortie\) return;/.test(corps('async function rafraichirAppel(')));
  vrai('`rendreSalle` note qui était là (`X.venus`, les seuls présents, jamais ceux de la salle d\'attente)', /if \(!s\.attente\) \{ if \(!X\.venus\) X\.venus = new Map\(\); for \(const m of s\.membres\) if \(m\.statut === 'present'\) X\.venus\.set\(m\.id, nomM\(m\)\); \}/.test(corps('function rendreSalle(')));
  vrai('l\'écran existe dans le balisage (section, titre, raison, faits, bouton) et sa feuille cache la salle et l\'appel', ['sortie-ecran', 'sortie-titre', 'sortie-raison', 'sortie-faits', 'sortie-bouton'].every(id => P.PAGE.includes('id="' + id + '"')) && /html\[data-sortie\] \.appel-ecran, html\[data-sortie\] \.salle-ecran \{ display: none; \}/.test(P.PAGE) && /html\[data-sortie\] \.sortie-ecran \{ display: flex; \}/.test(P.PAGE));
  fin();
})().catch((e) => { console.error('✗ le banc est mort :', e && e.stack || e); process.exit(1); });
