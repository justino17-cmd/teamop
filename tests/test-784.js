/* ══ BOX : DONNER PLUSIEURS PRODUITS DANS LA MÊME LISTE (v734) ═══════════════════════════════
   Justin, 23 septembre 2026, capture de la fenêtre « Ces produits sont pour qui ? » à l'appui :
   « il faudrait pouvoir ajouter plusieurs produits dans la même liste quand on donne les
   produits ». Pour un administrateur ou un DR (sortie directe, sans validation), un « − » sortait
   UN produit, et les suivants partaient en silence vers la même personne : personne ne voyait la
   liste se composer. La fenêtre la porte désormais — le produit touché y est, on en ajoute
   d'autres avec leur quantité, et un seul geste sort le tout : un mouvement par produit, UN bon.

   Le risque qui coûte : que le produit touché sorte DEUX fois — une fois par la liste, une fois par
   la « suite » que `boxAdj` passait à la fenêtre pour rejouer le tap. Ce banc EXÉCUTE la vraie
   `boxDonneSave` (et ses voisines) dans un bac à sable qui compte chaque sortie. Le geste au
   doigt, dans une vraie page, est dans `scratchpad/sonde-dons-liste.js`.                      */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), prof = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k];
    if (c === '{') prof++; else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); } }
  return '';
}

console.log('\n── 784 · 0. la population ──');
const NOMS = ['function donBox(){', 'function donStock(b,l){', 'function donUnite(l){', 'function donStep(pid,d){', 'function donSet(pid,v){',
  'function donAjout(pid){', 'function donRetirer(pid){', 'function boxDonneSave(){', 'function boxDonneAnnuler(){',
  'function boxDonneModal(boxId,suite,depart){', 'function boxDonneChanger(boxId){'];
const CODE = NOMS.map(bloc);
const STK = (() => { const i = SRC.indexOf("const STOCKAGE_ID="); return (i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)).replace('const ', 'var ')) + '\n' + bloc('function estStockage(b){'); })();
v('la règle du stockage est trouvée (v741)', /var STOCKAGE_ID='stockage';/.test(STK) && /function estStockage\(b\)\{/.test(STK), true);
v('les fonctions de la liste sont trouvées', NOMS.filter((n, i) => !CODE[i]), []);
for (const n of NOMS) { const tete = n.slice(0, n.indexOf('(') + 1); v('… une seule définition de ' + tete.slice(9, -1), SRC.split(tete).length - 1, 1); }

/* Le bac à sable : une box à trois produits, une fenêtre dont on règle le choix « moi / autre » et
   le nom, et un `boxAdj` témoin qui SORT vraiment du stock et compte chaque appel. */
function monde({ autre = false, nom = '', liste = [], suite = null, vue = 'bx' } = {}) {
  const ctx = {
    db: { boxes: [{ id: 'bx', nom: 'Box Nord', stock: { A: { u: 10, ctn: 0 }, B: { u: 5, ctn: 0 }, C: { u: 0, ctn: 2 } } }], users: [] },
    esc: x => String(x == null ? '' : x), openModal: () => { ctx.ouvre++; }, donAjoutRender: () => {}, ouvre: 0,
    boxView: vue, currentUser: { prenom: 'Justin', nom: 'Roux' }, _boxDonne: null, _boxDonneBox: 'bx', _boxLotSilence: false,
    appels: [], rendus: 0, sauves: 0, toasts: [], ferme: 0, suiteJouee: 0, silencePendant: [],
    fullName: u => u.prenom + ' ' + u.nom, produit: pid => ({ id: pid, nom: 'Produit ' + pid }),
    closeModal: () => { ctx.ferme++; }, save: () => { ctx.sauves++; }, renderBoxProdList: () => { ctx.rendus++; },
    toast: m => { ctx.toasts.push(m); }, donListeRender: () => {}, donLigneMaj: () => {}, donPiedRender: () => {},
    document: { querySelector: () => ({ value: autre ? 'autre' : 'moi' }) },
    $: id => (id === 'bd-nom' ? { value: nom } : null),
  };
  ctx.boxAdj = (pid, field, delta) => { ctx.appels.push([pid, field, delta]); ctx.silencePendant.push(ctx._boxLotSilence);
    const s = ctx.db.boxes[0].stock[pid]; s[field] = Math.max(0, (s[field] || 0) + delta); };
  vm.createContext(ctx);
  /* v741 : la liste parle du stockage quand c'est lui — la vraie règle (estStockage), extraite du fichier. */
  vm.runInContext('var _donListe=[], _donRech="", _donAjoutOuvert=false, _boxDonneSuite=null;\n' + STK + '\n' + CODE.join('\n'), ctx);
  ctx._donListe = liste; vm.runInContext('_donListe=this._donListe', ctx);
  ctx._boxDonneSuite = suite ? () => { ctx.suiteJouee++; suite(ctx); } : null; vm.runInContext('_boxDonneSuite=this._boxDonneSuite', ctx);
  ctx.run = js => vm.runInContext(js, ctx);
  return ctx;
}
const rejoueLeTap = c => c.boxAdj('A', 'u', -1);   // la suite que boxAdj passait : rejouer le « − »

console.log('\n── 784 · 1. ⛔⛔ UNE LISTE DE DEUX PRODUITS : UN GESTE, CHACUN SORT UNE FOIS ──');
if (CODE.every(Boolean)) {
  const W = monde({ autre: true, nom: 'Nadia Lopez', liste: [{ pid: 'A', field: 'u', qte: 1 }, { pid: 'B', field: 'u', qte: 2 }], suite: rejoueLeTap });
  W.run('boxDonneSave()');
  v('⛔⛔ A sort UNE fois (1), B sort 2 — la suite du tap n’est PAS rejouée', W.appels, [['A', 'u', -1], ['B', 'u', -2]]);
  v('… la suite n’a pas été appelée', W.suiteJouee, 0);
  v('stocks : A 9, B 3', [W.db.boxes[0].stock.A.u, W.db.boxes[0].stock.B.u], [9, 3]);
  v('⛔ la personne est retenue pour la box (les sorties suivantes iront chez elle)', W.run('_boxDonne&&[_boxDonne.boxId,_boxDonne.nom]'), ['bx', 'Nadia Lopez']);
  vrai('⛔ la boucle tourne en SILENCE (un seul rendu, un seul message), et le silence est levé après', W.silencePendant.every(Boolean) && W.run('_boxLotSilence') === false, W.silencePendant);
  v('un rendu, une fenêtre fermée, un message', [W.rendus, W.ferme, W.toasts.length], [1, 1, 1]);
  vrai('… qui dit combien, à qui, et le bon unique', /^2 produits remis à Nadia Lopez — sur un seul bon de remise$/.test(W.toasts[0]), W.toasts[0]);
  v('la liste est vidée derrière elle', W.run('_donListe.length'), 0);

  console.log('\n── 784 · 2. ⛔ « POUR MOI », UN SEUL PRODUIT : IL SORT UNE FOIS ──');
  const M = monde({ liste: [{ pid: 'A', field: 'u', qte: 1 }], suite: rejoueLeTap });
  M.run('boxDonneSave()');
  v('⛔⛔ un seul appel — pas deux', M.appels, [['A', 'u', -1]]);
  v('… A passe de 10 à 9', M.db.boxes[0].stock.A.u, 9);
  vrai('le message est au singulier', /^1 produit sorti pour toi$/.test(M.toasts[0]), M.toasts[0]);
  v('la personne retenue est soi-même', M.run('_boxDonne.nom'), 'Justin Roux');

  console.log('\n── 784 · 3. « CHANGER DE PERSONNE » (liste vide) : la suite, et rien d’autre ──');
  const C = monde({ autre: true, nom: 'Léo Martin', liste: [], suite: c => c.renderBoxProdList() });
  C.run('boxDonneSave()');
  v('aucune sortie', C.appels, []);
  v('… la suite est jouée (elle redessine la box)', [C.suiteJouee, C.rendus], [1, 1]);
  v('… et la personne est changée', C.run('_boxDonne.nom'), 'Léo Martin');

  console.log('\n── 784 · 3 bis. ⛔⛔ LE PRODUIT TOUCHÉ, RETIRÉ DE LA LISTE, NE SORT PAS ──');
  /* Trouvé en relecture le 23 septembre 2026. La séquence RÉELLE : un « − » ouvre la fenêtre avec la
     suite que `boxAdj` lui passe (rejouer le tap) ; on retire la ligne au ✕ ; on valide. La liste
     est vide — et la suite rejouait le « − » : le produit sortait quand même, tracé et porté sur un
     bon de remise au nom choisi, sans un mot à l'écran. On joue ici la VRAIE fenêtre, pas un
     `_boxDonneSuite` posé à la main. */
  const Q = monde({ autre: true, nom: 'Nadia Lopez' });
  Q.run("boxDonneModal('bx', function(){ boxAdj('A','u',-1); }, {pid:'A',field:'u',delta:-1})");
  v('population : la fenêtre s’ouvre, le produit touché en tête de liste', [Q.ouvre, Q.run('JSON.stringify(_donListe)')], [1, JSON.stringify([{ pid: 'A', field: 'u', qte: 1 }])]);
  Q.run("donRetirer('A')");
  v('… ✕ le retire : la liste est vide', Q.run('_donListe.length'), 0);
  Q.run('boxDonneSave()');
  v('⛔⛔ RIEN ne sort — ni par la liste, ni par le geste d’origine rejoué', Q.appels, []);
  v('… le stock de A reste à 10', Q.db.boxes[0].stock.A.u, 10);
  vrai('⛔ et l’écran le DIT (un geste sans effet visible se refait)', Q.toasts.some(t => /Rien n’est sorti/.test(t)), Q.toasts);
  v('la personne choisie est retenue pour les prochaines sorties de la box', Q.run('_boxDonne&&_boxDonne.nom'), 'Nadia Lopez');
  const Q2 = monde();
  Q2.run("boxDonneModal('bx', function(){ boxAdj('A','u',-1); }, {pid:'A',field:'u',delta:-1})");
  Q2.run('boxDonneSave()');
  v('contre-épreuve : sans rien retirer, le produit touché sort UNE fois', Q2.appels, [['A', 'u', -1]]);
  const Q3 = monde();
  Q3.run("boxDonneModal('bx', function(){ renderBoxProdList(); })");
  Q3.run('boxDonneSave()');
  v('contre-épreuve : « changer de personne » (sans produit touché) garde sa suite — elle redessine', [Q3.appels, Q3.rendus], [[], 1]);
  /* … et par la VRAIE porte : `boxDonneChanger`, le bouton « changer » de la box. Sans ce contrôle,
     lui retirer sa suite ne faisait rien tomber (mutation du 23 septembre 2026). */
  const Q4 = monde({ autre: true, nom: 'Léo Martin' });
  Q4.run("_boxDonne={boxId:'bx',nom:'Nadia Lopez',ts:1}; boxDonneChanger('bx')");
  v('population : « changer » ouvre la fenêtre, liste vide, l’ancienne personne oubliée', [Q4.ouvre, Q4.run('_donListe.length'), Q4.run('_boxDonne')], [1, 0, null]);
  Q4.run('boxDonneSave()');
  v('⛔ changer de personne : rien ne sort, la box est redessinée, la nouvelle personne retenue', [Q4.appels, Q4.rendus, Q4.run('_boxDonne&&_boxDonne.nom')], [[], 1, 'Léo Martin']);
  vrai('… et l’écran ne dit PAS « Rien n’est sorti » (on n’avait rien voulu sortir)', !Q4.toasts.some(t => /Rien n’est sorti/.test(t)), Q4.toasts);

  console.log('\n── 784 · 4. ⛔ ON NE SORT PAS À MOITIÉ ──');
  const T = monde({ autre: true, nom: 'Nadia Lopez', liste: [{ pid: 'A', field: 'u', qte: 1 }, { pid: 'B', field: 'u', qte: 9 }], suite: rejoueLeTap });
  T.run('boxDonneSave()');
  v('⛔ une ligne demande plus que la box n’a : RIEN ne sort, même la ligne juste', T.appels, []);
  vrai('… le message dit combien il y en a', /Il n’y a que 5 u de « Produit B » dans la box/.test(T.toasts[0]), T.toasts[0]);
  v('… la fenêtre reste ouverte, la liste reste là, la personne n’est pas retenue', [T.ferme, T.run('_donListe.length'), T.run('_boxDonne')], [0, 2, null]);
  const N = monde({ autre: true, nom: '', liste: [{ pid: 'A', field: 'u', qte: 1 }] });
  N.run('boxDonneSave()');
  v('« une autre personne » sans nom : rien ne sort, on le demande', [N.appels.length, N.toasts[0]], [0, 'Écris le nom et le prénom']);
  const F = monde({ autre: true, nom: 'Nadia Lopez', liste: [{ pid: 'A', field: 'u', qte: 1 }], vue: 'autre-box' });
  F.run('boxDonneSave()');
  v('la box a été fermée entre-temps : rien ne sort, et c’est dit', [F.appels.length, /rien n’est sorti/.test(F.toasts[0])], [0, true]);
  const Z = monde({ autre: true, nom: 'Nadia Lopez', liste: [{ pid: 'A', field: 'u', qte: 0 }, { pid: 'B', field: 'u', qte: 1 }] });
  Z.run('boxDonneSave()');
  v('une ligne ramenée à zéro ne sort rien, les autres si', Z.appels, [['B', 'u', -1]]);

  console.log('\n── 784 · 5. les réglages d’une ligne ──');
  const R = monde({ liste: [{ pid: 'A', field: 'u', qte: 1 }] });
  R.run('donStep("A",-1)'); v('« − » ne descend pas sous 1', R.run('_donListe[0].qte'), 1);
  R.run('for(let i=0;i<20;i++) donStep("A",1)'); v('« ＋ » s’arrête au stock de la box (10)', R.run('_donListe[0].qte'), 10);
  R.run('donAjout("B")'); v('ajouter un produit le met à 1, en unités quand il y en a', R.run('JSON.stringify(_donListe[1])'), JSON.stringify({ pid: 'B', field: 'u', qte: 1 }));
  R.run('donAjout("C")'); v('… en cartons quand la box n’a que des cartons', R.run('_donListe[2].field'), 'ctn');
  R.run('donAjout("B")'); v('⛔ un produit déjà dans la liste ne s’ajoute pas deux fois', R.run('_donListe.length'), 3);
  R.run('donRetirer("B")'); v('✕ le retire', R.run('_donListe.map(l=>l.pid).join()'), 'A,C');
  v('donUnite : « cart. » pour les cartons', R.run('donUnite({field:"ctn"})'), 'cart.');
  const A2 = monde({ liste: [{ pid: 'A', field: 'u', qte: 1 }] });
  A2.run('boxDonneAnnuler()');
  v('⛔ annuler : rien ne sort, la liste est vidée, et c’est dit', [A2.appels.length, A2.run('_donListe.length'), /Sortie annulée/.test(A2.toasts[0])], [0, 0, true]);
}

console.log('\n── 784 · 6. ⛔ LE CÂBLAGE : le « − » passe le produit touché à la fenêtre ──');
const adj = bloc('function boxAdj(pid,field,delta){');
const modal = bloc('function boxDonneModal(boxId,suite,depart){');
vrai('population : boxAdj est trouvé', adj.length > 2000, adj.length);
vrai('⛔ boxAdj passe à la fenêtre le produit, son unité et la quantité touchés — et AUCUN geste à rejouer',
  /boxDonneModal\(b\.id,null,\{pid:pid,field:field,delta:delta\}\)/.test(adj) && !/boxDonneModal\(b\.id,function/.test(adj));
vrai('⛔ … et la fenêtre ne garde aucune suite quand elle porte une sortie', /_boxDonneSuite=depart\?null:\(suite\|\|null\)/.test(modal));
vrai('population : la fenêtre est trouvée', modal.length > 1500, modal.length);
vrai('⛔ la fenêtre commence la liste avec le produit touché', /_donListe=\(depart&&depart\.pid&&\(\+depart\.delta\|\|0\)<0\)\?\[\{pid:depart\.pid/.test(modal));
vrai('… et porte la liste, l’ajout et un bouton qui dit ce qui va se passer', /id="don-liste"/.test(modal) && /id="don-ajout-bloc"/.test(modal) && /id="don-go"/.test(modal));
vrai('la recherche ne redessine que les résultats (le clavier reste dans le champ)', /function donAjoutListe\(\)\{ const garde=_donRech; donAjoutRender\(\); const i=\$\('don-rech'\); if\(i\)\{ i\.focus\(\);/.test(SRC));

console.log('\n── 784 · 7. la mesure au doigt existe ──');
const P = path.join(__dirname, '..', 'scratchpad', 'sonde-dons-liste.js');
const SONDE = fs.existsSync(P) ? fs.readFileSync(P, 'utf8') : '';
vrai('scratchpad/sonde-dons-liste.js existe', !!SONDE);
vrai('… elle TOUCHE pour de vrai et TAPE pour de vrai', /Input\.dispatchTouchEvent/.test(SONDE) && /Input\.insertText/.test(SONDE));
vrai('… elle compte les mouvements ET le bon de remise', /donneA/.test(SONDE) && /bonsRemise/.test(SONDE));
vrai('… elle joue le « pour moi » à un seul produit (le double compte)', /il sort UNE fois/.test(SONDE));
vrai('… elle sait tourner sur une bêta d’avant (contre-épreuve)', /process\.env\.SOURCE/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

console.log(`\n════ test-784 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
