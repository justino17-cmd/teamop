/* ══ v741 · LE STOCKAGE — LE STOCK RANGÉ HORS DES BOX ═══════════════════════════════════════════
   Justin, 24 septembre 2026 : « B, ça regroupe toutes les box — et si des entreprises n'ont pas de
   box, elles peuvent tout mettre dans le stock directement, et donner un accès aux utilisateurs qui
   se servent dans le stockage, avec un suivi de qui prend quoi ».

   Mesuré la veille (scratchpad/sonde-entrepot.js) : le même produit disait « 40 unités » dans Stock,
   « Épuisé » dans Produits et « Stock bas (0/5) » dans la cloche — deux règles pour une question.
   Le stockage est UNE BOX à identifiant fixe : il hérite de l'arrivage, de la validation du DR, de
   « Pour qui ? » et du bon de remise (qui prend quoi), du journal et de l'accès personne par personne.

   Ce banc EXÉCUTE les vraies fonctions, extraites d'app.html, dans un bac à sable :
     1. qui est le stockage (identifiant fixe, inactif = absent) ;
     2. Stock, Produits, la cloche et la commande suggérée lisent UN total (stockLines) ;
     3. le créer RANGE l'ancien stock du catalogue (p.qte → 0), une fois, et jamais deux stockages ;
     4. ⛔ une intervention ne déduit RIEN — ni box, ni stockage, ni compteur (Justin : « on doit juste
        savoir ce qu'il a utilisé ») — onze gestes joués, avant et après la clôture ;
     5. (fondu dans 4) ;
     6. la commande suggérée prend le PLUS GRAND des deux besoins, pas leur somme ;
     7. la cloche : le seuil contre ce que Stock montre ;
     8. celui qui a REÇU voit la ligne qui porte son nom ;
     9. « qui peut s'y servir » écrit l'accès d'une box, dans le bon ordre ;
    10. la carte de Stock dit pourquoi elle est vide, et ne montre que les gestes permis ;
    11. le scanner du catalogue range dans le stockage quand il existe.
   Le comportement au doigt, dans la vraie page, est mesuré par scratchpad/sonde-stockage.js.        */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ Seuls les blocs de commentaire qui COMMENCENT une ligne (CLAUDE.md : le motif naïf avale du code). */
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut, depuis) {
  const i = SRC.indexOf(debut, depuis || 0); if (i < 0) return '';
  let j = SRC.indexOf('{', i), prof = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k];
    if (c === '{') prof++; else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 794 · 0. la population ──');
const FN = ['estStockage', 'stockageBox', 'stockageVisible', 'stockLines', 'stockTotaux', 'stockVoitTout', 'boxVuePar', 'stockageAccesGens', 'adminSeul',
  'stockageGens', 'stockageCarte', 'stockageCreer', 'stockageOuvert', 'stockageServir', 'stockageArrivage', 'stockageJournal', 'stockageAcces',
  'stockageAccesTous', 'stockageAccesRender', 'stockageAccesSave', 'traceBox', 'bonSuggere', 'boxTotalStock', 'boxEtat',
  'stockConv', 'userBoxVoit', 'nomCle', 'nomsConcernes', 'visibleMouvements', 'openScanner',
  /* v741 : les gestes qui écrivent une ligne de produit utilisé sur une intervention */
  't3dProdDelta', 't3dProdSet', 't3dProdUnit', 't3dProdDel', 'asProdQte', 'asProdDel', 'asProdAdd', 'intAddProduit', 'intDelProduit', 'intToggleProd', 'papSheetProduit'];
const CODE = {};
FN.forEach(n => { CODE[n] = bloc('function ' + n + '('); });
v('toutes les fonctions sont trouvées', FN.filter(n => !CODE[n]), []);
v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)', FN.filter(n => SRC.split('function ' + n + '(').length - 1 !== 1), []);
const K_ID = ligne('const STOCKAGE_ID='), K_EXCLU = ligne('const boxExclu=');
vrai('l’identifiant du stockage est UNE constante, fixe', /^const STOCKAGE_ID='stockage';$/.test(K_ID) && SRC.split('const STOCKAGE_ID=').length === 2, K_ID);
vrai('la règle d’exception d’une box est trouvée', K_EXCLU.length > 30, K_EXCLU);

/* ── Le bac à sable : les vraies fonctions, et des doubles pour ce qui touche l'écran. ── */
function monde(opts) {
  const o = opts || {};
  const ctx = { console, Date, Math, JSON, Set, Map, Object, Array, String, Number, Promise, setTimeout: f => f(),
    db: o.db || { produits: [], boxes: [], mouvements: [], users: [], techniciens: [] },
    currentUser: o.moi || null,
    __vus: o.vus || null,             // visibleBoxes : l'ensemble des ids visibles (null = tout)
    __caps: o.caps || {}, __perim: o.perim || null, __gerer: o.gerer || {}, __valid: !!o.valid, __modules: o.modules || null,
    __toasts: [], __logs: [], __saves: 0, __confirm: o.confirm !== false, __ouvert: [], __modales: [], __go: [], __rafr: 0, __etiq: [],
    __uid: 0 };
  vm.createContext(ctx);
  vm.runInContext(`
    var K=${JSON.stringify(K_ID)};
    ${K_ID.replace('const ', 'var ')}
    ${K_EXCLU.replace('const ', 'var ')}
    var mvtFBox='', mvtFType='', mvtFQ='', boxView=null, bonLignes=[], _stkAcces=null, current='stock';
    function uid(){ return 'id'+(++__uid); }
    function visibleBoxes(l){ if(__vus===null) return (l||[]).slice(); return (l||[]).filter(b=>__vus.includes(b.id)); }
    function can(c){ return !!__caps[c]; }
    /* v742 : comme le vrai — l'administrateur a tout, une case RÉGLÉE (acces.caps) passe avant la base */
    function userCap(u,c){ if(u&&u.role==='admin') return true; const ov=u&&u.acces&&u.acces.caps; if(ov&&Object.prototype.hasOwnProperty.call(ov,c)) return !!ov[c]; return !!(u&&u.caps&&u.caps[c]); }
    function perimetreTechIds(u){ return __perim; }
    function perimetreUserIds(){ return null; }
    function mesBoxIds(){ return new Set(visibleBoxes(db.boxes||[]).map(b=>b.id)); }
    function produit(id){ return (db.produits||[]).find(p=>p.id===id)||{}; }
    function fullName(u){ return u?((u.prenom||'')+' '+(u.nom||'')).trim():''; }
    function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }
    function roleLbl(r){ return r||''; }
    function toast(m){ __toasts.push(String(m)); }
    function logEvent(a,b){ __logs.push(a+' · '+b); }
    function save(){ __saves++; }
    function refreshEcran(){ __rafr++; }
    function confirm(){ return __confirm; }
    function boxGerer(d){ return !!__gerer[d]; }
    function boxGererGarde(d){ if(__gerer[d]) return true; toast('refus '+d); return false; }
    function boxValidRequis(){ return __valid; }
    function userSeesModule(u,k){ return __modules?__modules.includes(k):true; }
    function openBox(id){ __ouvert.push(id); boxView=id; }
    function openArrivage(id){ __modales.push('arrivage:'+id); }
    function boxDonneModal(id){ __modales.push('donne:'+id); }
    function renderBoxProdList(){}
    function openModal(h){ __modales.push('modal'); }
    function closeModal(){}
    function go(v){ __go.push(v); current=v; }
    function $(){ return null; }
    function notifyDrBoxLow(){} function notifyDrBoxMove(){} function boxMvtEnvoyer(){} function valideursPour(){ return []; } function pushNotify(){}
    function intHisto(i,t){ (i.histo=i.histo||[]).push(t); }
    function roleDeNom(){ return ''; }
    function peutCommander(){ return true; } function refusCommander(){}
    function formBon(){} function renderBonLignes(){} function bonQtyOpen(){}
    function permGarde(){ return true; }
    function etiqVersBox(id){ __etiq.push('box:'+id); } function etiqOuvrir(m){ __etiq.push(m); }
    function t3dRefresh(){} function assistRender(){} function renderIntDetail(){} function papPosteSheet(){} function papTouch(){} function papMarque(){}
    function papFindPoste(cid,pid){ const po=(__poste&&__poste.id===pid)?__poste:null; return po?{pl:{},po}:null; }
    function produitCle(x){ return String((x&&x.nom)||'').toLowerCase(); } function idProduit(n){ return 'p-'+n; } function produitCreer(f){ db.produits.push(f); return f; }
    function prodLineUnit(l){ return l.unite||'u'; }
    var __poste=null;
    ${FN.map(n => CODE[n]).join('\n')}
  `, ctx);
  return ctx;
}
const P = (id, nom, extra) => Object.assign({ id, nom, unite: 'u' }, extra || {});
const moi = { id: 'uA', prenom: 'Justin', nom: 'Roux', role: 'admin' };

console.log('\n── 794 · 1. qui est le stockage ──');
{ const W = monde({ db: { produits: [], boxes: [{ id: 'bx1', nom: 'Nord' }, { id: 'stockage', nom: 'Dépôt', actif: false }] }, moi });
  v('reconnu par son identifiant, quel que soit son nom', [W.estStockage({ id: 'stockage', nom: 'Dépôt' }), W.estStockage({ id: 'bx1', stockage: true }), W.estStockage(null)], [true, false, false]);
  v('⛔ un stockage désactivé n’est pas « le stockage » : l’écran propose de le rouvrir', W.stockageBox(), null);
  W.db.boxes[1].actif = true;
  v('… actif, il l’est', (W.stockageBox() || {}).id, 'stockage');
  W.__vus = ['bx1'];
  v('⛔ visible ou pas : la règle d’une box (visibleBoxes), pas une seconde', W.stockageVisible(), false);
  W.__vus = null; v('… vue par qui voit tout', W.stockageVisible(), true); }

console.log('\n── 794 · 2. UN total pour Stock, Produits, la cloche et la commande ──');
{ const W = monde({ moi, db: { produits: [P('a', 'ADVION', { qteCarton: 10 }), P('c', 'RATICIDE', { qte: 3 }), P('x', 'CACHÉ')],
    boxes: [{ id: 'bxN', nom: 'Nord', stock: { a: { u: 5, ctn: 1 } } }, { id: 'stockage', nom: 'Stockage', stock: { a: { u: 12, ctn: 0 } } },
      { id: 'bxZ', nom: 'Zone interdite', stock: { x: { u: 9, ctn: 0 } } }] }, vus: ['bxN', 'stockage'] });
  const L = W.stockLines(), a = L.find(l => l.p.id === 'a'), c = L.find(l => l.p.id === 'c');
  v('ADVION : stockage 12 + box 5 u + 1 carton de 10 = 27', a && a.eff, 27);
  v('⛔ le stockage passe en tête de la ligne', a && a.boxes.map(b => [b.nom, b.stockage]), [['Stockage', true], ['Nord', false]]);
  v('⛔ l’ancien stock du catalogue compte, nommé « hors box »', c && [c.eff, c.boxes.map(b => b.nom)], [3, ['Hors box (catalogue)']]);
  v('⛔ une box qu’on ne voit pas ne compte pas', L.some(l => l.p.id === 'x'), false);
  v('stockTotaux rend exactement les mêmes chiffres que les lignes', W.stockTotaux(), { a: 27, c: 3 });
  const SP = bloc('function renderProduitsList(');
  vrai('⛔ Produits lit stockTotaux — plus `boxEtat(p.qte)`', /const TOT=stockTotaux\(\), toutVu=stockVoitTout\(\);/.test(SP) && /boxEtat\(tq\|\|0\)/.test(SP) && !/boxEtat\(p\.qte\)/.test(SP), SP.length);
  vrai('… et un produit absent de SES box n’est pas « Épuisé » pour qui ne voit pas tout', /\(tq==null&&!toutVu\)\?\{k:'hors',l:'Pas dans tes box'/.test(SP));
  vrai('⛔ plus aucun écran ne lit l’état d’un produit sur `p.qte`', !/boxEtat\(\s*p\.qte/.test(SRC)); }

console.log('\n── 794 · 3. créer le stockage : l’ancien stock y est RANGÉ, une fois ──');
{ vrai('⛔ la garde est la PREMIÈRE instruction', /function stockageCreer\(\)\{ if\(!boxGererGarde\('ajouter'\)\) return;/.test(BRUT));
  const base = () => ({ produits: [P('a', 'ADVION', { qte: 12 }), P('c', 'RATICIDE', { qte: 3 }), P('b', 'PIÈGE', { qte: 0 })], boxes: [], mouvements: [] });
  let W = monde({ db: base(), moi, gerer: {} });
  W.stockageCreer();
  v('⛔ sans le droit de créer une box : rien n’est écrit', [W.db.boxes.length, W.__saves, W.db.produits.map(p => p.qte)], [0, 0, [12, 3, 0]]);
  W = monde({ db: base(), moi, gerer: { ajouter: 1 }, confirm: false });
  W.stockageCreer();
  v('⛔ la confirmation refusée : rien n’est écrit', [W.db.boxes.length, W.__saves], [0, 0]);
  W = monde({ db: base(), moi, gerer: { ajouter: 1 } });
  W.stockageCreer();
  const s = W.db.boxes.find(b => b.id === 'stockage') || {};
  v('le stockage naît avec l’identifiant fixe, fermé à tous d’office', [s.id, s.stockage, s.visibleTous, s.userIds, s.actif], ['stockage', true, false, [], true]);
  v('⛔⛔ il reçoit l’ancien stock du catalogue', s.stock, { a: { ctn: 0, u: 12 }, c: { ctn: 0, u: 3 } });
  v('⛔⛔ … qui QUITTE le catalogue — sinon le total le compterait deux fois', W.db.produits.map(p => p.qte), [0, 0, 0]);
  v('⛔ une ligne au journal par produit rangé, dans le stockage', W.db.mouvements.map(m => [m.produitId, m.type, m.qte, m.boxId]).sort(), [['a', 'entree', 12, 'stockage'], ['c', 'entree', 3, 'stockage']]);
  v('… et UNE ligne d’historique pour le geste (le journal est plafonné)', W.__logs.length, 1);
  v('le total ne bouge pas : il change de place', W.stockTotaux(), { a: 12, c: 3 });
  W.stockageCreer();
  v('⛔ un second geste ne crée pas un second stockage', [W.db.boxes.filter(b => b.id === 'stockage').length, W.__toasts.slice(-1)[0]], [1, 'Le stockage existe déjà']);
  s.actif = false; W.stockageCreer();
  v('⛔ un stockage désactivé se ROUVRE (même enregistrement, même stock)', [W.db.boxes.length, s.actif, s.stock.a.u], [1, true, 12]);
  W.traceBox(s, 'a', -2, 'u', 'Sortie box', 'Karim Benali', '', 'Karim Benali'); W.traceBox({ id: 'bxN', nom: 'Nord' }, 'a', 1, 'u', 'Entrée box');
  v('la trace d’une sortie du stockage ne dit pas « box » ; celle d’une box, si', W.db.mouvements.slice(0, 2).map(m => m.motif), ['Entrée box — Nord', 'Sortie — Stockage']); }

console.log('\n── 794 · 4. ⛔⛔ une intervention ne déduit RIEN — ni box, ni stockage, ni compteur ──');
/* Justin, 24 septembre 2026 : « le produit ne doit pas se déduire par intervention, on doit juste savoir
   ce qu'il a utilisé, sinon ça fausserait tout le stock ou la box ». On JOUE chaque geste qui écrit une
   ligne de produit utilisé — avant ET après la clôture — sur une entreprise qui a une box, un stockage
   et un ancien compteur du catalogue, et on exige que le stock n'ait pas bougé d'une unité. */
{ vrai('⛔ intStockDeduire et intStockAjuste n’existent plus', !/function intStockDeduire\(/.test(SRC) && !/intStockAjuste\(/.test(SRC) && !/intStockDeduire\(/.test(SRC));
  /* Cinq portes posent « terminée » : le compte-rendu, l'assistant, « terminée à la date prévue », la case
     « effectuée » et le menu de statut. Les trois dernières n'ont jamais déduit : elles sont gardées pour
     qu'aucune ne s'y mette le jour où l'on croira « harmoniser » les clôtures. */
  const PORTES = [['function saveRapport(e,id){', 1200], ['function assistFinish(id){', 1200], ['function intTerminerPrevu(id){', 300],
    ['function intEffToggle(id,checked){', 300], ['function intSetStatutDo(id,st){', 300]];
  const FERME = PORTES.map(([n]) => bloc(n));
  vrai('population : les cinq portes de clôture sont trouvées, et chacune pose « terminee »', FERME.every((b, k) => b.length > PORTES[k][1] && /'terminee'/.test(b)), FERME.map(b => b.length));
  v('⛔ aucune n’écrit le stock (box, compteur, journal, validation du DR)', FERME.map(b => (b.match(/\.stock\[|mouvements\.unshift|traceBox\(|boxMvtEnvoyer\(|boxAdj\(|\.qte\s*=|stockDeduit\s*=/g) || [])), [[], [], [], [], []]);
  const base = () => ({ produits: [P('a', 'ADVION', { qte: 7 }), P('c', 'RATICIDE', { qte: 0 })], mouvements: [], interventions: [],
    boxes: [{ id: 'bxN', nom: 'Nord', actif: true, techIds: ['tK'], stock: { a: { u: 5, ctn: 0 } } },
      { id: 'stockage', nom: 'Stockage', actif: true, visibleTous: true, stock: { a: { u: 20, ctn: 0 }, c: { u: 9, ctn: 0 } } }] });
  const empreinte = d => JSON.stringify([d.boxes.map(b => b.stock), d.produits.map(p => p.qte), d.mouvements.length]);
  for (const cloturee of [false, true]) {
    const W = monde({ moi, db: base() }); const avant = empreinte(W.db);
    const i = { id: 'i1', clientId: 'cl', techIds: ['tK'], stockDeduit: cloturee, produitsUtilises: [{ produitId: 'a', qte: 2, unite: 'u' }, { produitId: 'c', qte: 1, unite: 'u' }] };
    W.db.interventions.push(i);
    vm.runInContext(`__poste={id:'po1',num:1,produitId:''};`, W);
    const gestes = [
      ['t3dProdDelta +1', () => W.t3dProdDelta('i1', 0, 1)], ['t3dProdSet 6', () => W.t3dProdSet('i1', 0, '6')], ['t3dProdUnit mL', () => W.t3dProdUnit('i1', 0, 'mL')],
      ['asProdQte +1', () => W.asProdQte('i1', 1, 1)], ['asProdAdd', () => { vm.runInContext(`$=function(id){ return id==='as-prod'?{value:'c'}:null; }`, W); W.asProdAdd('i1'); }],
      ['intAddProduit', () => { vm.runInContext(`$=function(id){ return id==='ip-prod'?{value:'a'}:id==='ip-qte'?{value:'3'}:null; }`, W); W.intAddProduit('i1'); }],
      ['intToggleProd (ajout puis retrait)', () => { W.intToggleProd('i1', 'RATICIDE'); W.intToggleProd('i1', 'RATICIDE'); }],
      ['papSheetProduit (appât posé)', () => W.papSheetProduit('i1', 'po1', 'a')],
      ['asProdDel', () => W.asProdDel('i1', 0)], ['intDelProduit', () => W.intDelProduit('i1', 0)], ['t3dProdDel', () => W.t3dProdDel('i1', 0)] ];
    const bouge = [];
    gestes.forEach(([nom, f]) => { try { f(); } catch (e) { bouge.push(nom + ' : ' + e.message); return; } if (empreinte(W.db) !== avant) bouge.push(nom); });
    v('⛔⛔ ' + (cloturee ? 'APRÈS' : 'AVANT') + ' la clôture : onze gestes sur les lignes, le stock ne bouge pas d’une unité', bouge, []);
    vrai('… et les lignes, elles, ont bien changé (population : ce n’est pas un banc qui ne fait rien)', JSON.stringify(i.produitsUtilises) !== JSON.stringify([{ produitId: 'a', qte: 2, unite: 'u' }, { produitId: 'c', qte: 1, unite: 'u' }]), i.produitsUtilises);
  }
  const T = bloc('function t3dProdUnit(intId,ix,u){');
  vrai('changer l’unité d’une ligne ne touche que la ligne', /l\.unite=u; save\(\); t3dRefresh\(intId\);/.test(T) && !/stock/i.test(T), T);
  v('⛔ plus aucun code n’écrit une ligne de journal « Intervention … » (démonstrations comprises — relecture v741)',
    SRC.match(/motif:[^,}\n]*Intervention[^,}\n]*/g) || [], []);
  const txt = BRUT.split('Le stock sera déduit').length - 1;
  v('⛔ plus aucun écran n’annonce « Le stock sera déduit »', txt, 0); }

console.log('\n── 794 · 6. la commande suggérée : le PLUS GRAND des deux besoins ──');
/* v742 : « voir tout », c'est « Tout voir » ET la case du stockage (une permission, depuis la v742) — sans
   elle, un produit absent de ses lignes n'est pas « à zéro » à ses yeux : la même règle que Produits et la cloche. */
{ const W6 = caps => { const W = monde({ moi, caps, db: { produits: [P('a', 'ADVION', { seuil: 5 }), P('c', 'RATICIDE', { seuil: 10 }), P('r', 'RIEN', { seuil: 4 }), P('z', 'SANS SEUIL')], mouvements: [],
    boxes: [{ id: 'bxN', nom: 'Nord', stock: { a: { u: 0, ctn: 0 } } }, { id: 'stockage', stock: { a: { u: 20, ctn: 0 }, c: { u: 1, ctn: 0 } } }] } });
    W.bonSuggere(); return W.bonLignes.map(l => [l.produitId, l.quantite]).sort(); };
  v('⛔⛔ ADVION 3 (la box à 0), RATICIDE 19 (2×10−1, pas 2+19), RIEN 8 (absent partout)', W6({ voirTout: 1, stockage: 1 }), [['a', 3], ['c', 19], ['r', 8]]);
  v('⛔ v742 : « Tout voir » SANS la case stockage — RIEN (absent de ses lignes) n’est pas racheté à l’aveugle', W6({ voirTout: 1 }), [['a', 3], ['c', 19]]); }

console.log('\n── 794 · 7. la cloche : le seuil contre ce que Stock montre ──');
{ const iC = SRC.indexOf('if(vStock){ const avecSeuil=');
  const code = iC > 0 ? bloc('if(vStock){ const avecSeuil=') : '';
  vrai('population : la ligne « Stock bas » de computeNotifs est trouvée', code.length > 200, code.length);
  vrai('⛔ plus aucune alerte sur le compteur caché `p.qte`', !/\(p\.qte\|\|0\)<=p\.seuil/.test(SRC));
  const jouer = (toutVoir, vus, caps) => { const W = monde({ moi, caps: caps || (toutVoir ? { voirTout: 1, stockage: 1 } : {}), vus,   // v742 : voir tout = « Tout voir » + la case du stockage
      db: { produits: [P('a', 'ADVION', { seuil: 5 }), P('c', 'RATICIDE', { seuil: 10 }), P('r', 'RIEN', { seuil: 4 })], mouvements: [],
        boxes: [{ id: 'stockage', stock: { a: { u: 20, ctn: 0 }, c: { u: 3, ctn: 0 } } }] } });
    W.out = []; W.vStock = true; vm.runInContext(code, W); return W.out.map(n => n.txt.replace(/<[^>]+>/g, '')); };
  v('qui voit tout : RATICIDE (3/10) et RIEN (0/4) — pas ADVION (20/5)', jouer(true, null), ['Stock bas : RATICIDE (3/10)', 'Stock bas : RIEN (0/4)']);
  v('⛔ qui ne voit que ses box : ce qu’il n’a pas n’est pas à lui de signaler', jouer(false, ['stockage']), ['Stock bas : RATICIDE (3/10)']);
  v('⛔ v742 : « Tout voir » SANS la case stockage ne connaît pas le total de l’entreprise — RIEN n’est pas « à 0 » pour lui', jouer(true, null, { voirTout: 1 }), ['Stock bas : RATICIDE (3/10)']); }

console.log('\n── 794 · 8. qui a pris quoi : celui qui a REÇU voit sa ligne ──');
{ const W = monde({ moi: { id: 'uK', prenom: 'Karim', nom: 'Benali' }, vus: [], caps: {},
    db: { produits: [], boxes: [{ id: 'stockage' }], users: [], techniciens: [],
      mouvements: [] } });
  const M = [{ id: 'm1', boxId: 'stockage', technicien: 'Justin Roux', donneA: '  KARIM benali ' }, { id: 'm2', boxId: 'stockage', technicien: 'Justin Roux', donneA: 'Sofia Perez' },
    { id: 'm3', boxId: '', technicien: 'Karim Benali' }];
  v('⛔ la sortie du stockage faite POUR lui est visible, même sans accès — pas celle d’une autre', W.visibleMouvements(M).map(m => m.id), ['m1', 'm3']); }

console.log('\n── 794 · 9. ⛔⛔ « qui peut s’y servir » écrit la PERMISSION, et c’est à l’administrateur (v742) ──');
/* Justin, 24 septembre 2026 : « l'accès au stockage est une permission ». La fenêtre n'est qu'un raccourci
   vers la case « Se servir dans le stockage » de chaque personne (u.acces.caps.stockage) — plus rien ne
   s'écrit sur la box. Et régler un droit est un geste d'administrateur (usrDroitsValider). */
{ vrai('⛔ la garde est la PREMIÈRE instruction, à l’ouverture ET à l’enregistrement (adminSeul)', /function stockageAcces\(\)\{ if\(!adminSeul\(\)\) return;/.test(BRUT) && /function stockageAccesSave\(\)\{ if\(!adminSeul\(\)\) return;/.test(BRUT));
  const gens = [{ id: 'uA', prenom: 'Justin', nom: 'Roux', role: 'admin', actif: true }, { id: 'uK', prenom: 'Karim', nom: 'Benali', role: 'technicien', actif: true },
    { id: 'uS', prenom: 'Sofia', nom: 'Perez', role: 'technicien', actif: true, caps: { stockage: 1 } }, { id: 'uB', prenom: 'Bureau', nom: 'Compta', role: 'compta', actif: true, caps: { stockage: 1 } },
    { id: 'uP', prenom: 'Parti', nom: 'Ancien', role: 'technicien', actif: false }];
  const neuf = () => ({ produits: [], mouvements: [], users: JSON.parse(JSON.stringify(gens)), boxes: [{ id: 'stockage', nom: 'Stockage', actif: true, visibleTous: false, userIds: [], userIdsExclus: [] }] });
  const chef = { id: 'uR', prenom: 'Rémi', nom: 'Chef', role: 'chefEquipe' };
  let W = monde({ moi: chef, gerer: { modifier: 1, ajouter: 1 }, db: neuf() });
  W.stockageAcces();
  v('⛔ un non-administrateur — même s’il gère les box — : refusé, aucune fenêtre', [W.__modales.length, W.__toasts.some(t => /Réservé à l'administrateur/.test(t))], [0, true]);
  vm.runInContext('_stkAcces={on:{uK:true},avant:{uK:false}}; stockageAccesSave();', W);
  v('⛔ … et l’enregistrement appelé quand même n’écrit rien', [W.db.users.find(u => u.id === 'uK').acces, W.__saves], [undefined, 0]);
  W = monde({ moi, db: neuf() });
  W.stockageAcces();
  v('l’administrateur ouvre la fenêtre : chaque personne ACTIVE, à l’état réel de sa case', [W.__modales.length, vm.runInContext('JSON.stringify(_stkAcces.on)', W)], [1, JSON.stringify({ uB: true, uA: true, uK: false, uS: true })]);
  vm.runInContext('_stkAcces.on.uK=true; _stkAcces.on.uS=false; stockageAccesSave();', W);
  const u = id => W.db.users.find(x => x.id === id);
  v('⛔⛔ Karim coché → sa case écrite OUI ; Sofia décochée → NON ; le bureau, pas touché, n’est PAS écrit (il garde son défaut)',
    [u('uK').acces.caps.stockage, u('uS').acces.caps.stockage, 'stockage' in (((u('uB').acces) || {}).caps || {})], [true, false, false]);
  v('⛔ l’administrateur n’est jamais écrit (il a tout, d’office) ; un compte désactivé n’est pas touché', [!!u('uA').acces, !!u('uP').acces], [false, false]);
  v('… une ligne « Droits modifiés », un enregistrement', [W.__logs.filter(l => /Droits modifiés/.test(l)).length, W.__saves], [1, 1]);
  v('⛔ rien n’est posé sur la box (plus de liste d’accès sur le stockage)', [W.db.boxes[0].userIds, W.db.boxes[0].visibleTous], [[], false]);
  W = monde({ moi, db: neuf() }); W.stockageAcces(); W.stockageAccesTous(true);
  v('« Tout cocher » : chaque personne active, l’administrateur restant d’office', vm.runInContext('JSON.stringify(_stkAcces.on)', W), JSON.stringify({ uB: true, uA: true, uK: true, uS: true }));
  W.stockageAccesTous(false);
  v('« Tout décocher » : tout le monde sauf l’administrateur', vm.runInContext('JSON.stringify(_stkAcces.on)', W), JSON.stringify({ uB: false, uA: true, uK: false, uS: false }));
}

console.log('\n── 794 · 10. boxVuePar rend TOUJOURS l’utilisateur courant ──');
{ const W = monde({ moi });
  vm.runInContext('visibleBoxes=function(){ throw new Error("boum"); };', W);
  v('une règle qui lève rend « non » …', W.boxVuePar({ id: 'uX' }, { id: 'stockage' }), false);
  v('⛔ … et currentUser est remis', W.currentUser && W.currentUser.id, 'uA'); }

console.log('\n── 794 · 11. la carte de Stock dit pourquoi, et ne montre que les gestes permis ──');
{ const carte = o => { const W = monde(o); return W.stockageCarte().replace(/\s+/g, ' '); };
  const avecAncien = { produits: [P('a', 'ADVION', { qte: 12 }), P('c', 'RATICIDE', { qte: 3 })], boxes: [], mouvements: [], users: [] };
  v('pas de stockage, pas le droit de le créer : rien', carte({ moi, db: avecAncien, gerer: {} }), '');
  const c1 = carte({ moi, db: avecAncien, gerer: { ajouter: 1 } });
  vrai('pas de stockage, droit de créer : on le propose, et on dit ce qui y sera rangé', /Créer le stockage/.test(c1) && /2 produits · 15 u/.test(c1), c1.slice(0, 300));
  vrai('… « Pas de box ? » à une entreprise sans box ; « un stock central » à celle qui en a', /Pas de box \?/.test(c1)
    && /Un stock central, hors des box \? Crée le stockage/.test(carte({ moi, db: Object.assign({}, avecAncien, { boxes: [{ id: 'bxN', nom: 'Nord' }] }), gerer: { ajouter: 1 } })));
  const avecS = { produits: [P('a', 'ADVION')], boxes: [{ id: 'stockage', nom: 'Stockage', stock: { a: { u: 4, ctn: 0 } } }], mouvements: [], users: [] };
  const c2 = carte({ moi, db: avecS, vus: [] });
  vrai('⛔ un stockage fermé à cette personne : on le lui DIT', /ne t[’']est pas ouvert/.test(c2) && !/Me servir/.test(c2), c2);
  const chef = { id: 'uR', prenom: 'Rémi', nom: 'Chef', role: 'chefEquipe' };
  const c3 = carte({ moi: chef, db: avecS, vus: ['stockage'], gerer: {}, modules: ['stock'] });
  vrai('ouvert, sans gérer les box ni voir le journal : « Me servir » et « Arrivage », rien d’autre', /Me servir/.test(c3) && /Arrivage/.test(c3) && !/Qui peut s[’']y servir/.test(c3) && !/Qui a pris quoi/.test(c3), c3);
  const c4 = carte({ moi, db: avecS, vus: ['stockage'], gerer: {}, modules: ['stock', 'mouvements'] });
  vrai('… l’administrateur : « Qui a pris quoi » et « Qui peut s’y servir » (une permission se règle par qui règle les droits)', /Qui a pris quoi/.test(c4) && /Qui peut s[’']y servir/.test(c4), c4);
  const c5 = carte({ moi: chef, db: avecS, vus: ['stockage'], gerer: { modifier: 1, ajouter: 1 }, modules: ['stock', 'mouvements'] });
  vrai('⛔ … et PAS celui qui gère les box sans être administrateur (v741 le lui montrait)', /Qui a pris quoi/.test(c5) && !/Qui peut s[’']y servir/.test(c5), c5);
  const VS = bloc('views.stock=function(){');
  vrai('Stock dit ce qu’il regroupe, et porte la carte', /setHeader\('Stock','Le stockage et toutes les box'/.test(VS) && /\$\{stockageCarte\(\)\}/.test(VS), VS.length); }

console.log('\n── 794 · 12. le scanner du catalogue range dans le stockage quand il existe ──');
{ vrai('⛔ sa garde reste la PREMIÈRE instruction (test-747)', /function openScanner\(\)\{ if\(!permGarde\('stock','modifier','le stock'\)\) return;/.test(BRUT));
  let W = monde({ moi, db: { produits: [], boxes: [{ id: 'stockage' }] }, vus: ['stockage'] }); W.openScanner();
  v('stockage visible : le scanner s’ouvre DANS le stockage (chemin d’une box)', W.__etiq, ['box:stockage']);
  W = monde({ moi, db: { produits: [], boxes: [] } }); W.openScanner();
  v('sans stockage : l’ancien scanner du catalogue', W.__etiq, ['cat']);
  W = monde({ moi, db: { produits: [], boxes: [{ id: 'stockage' }] }, vus: [] }); W.openScanner();
  v('⛔ un stockage qui ne m’est pas ouvert : on le DIT, et rien ne s’écrit dans l’ancien compteur (relecture v741)', [W.__etiq, W.__toasts.some(t => /ne t’est pas ouvert/.test(t))], [[], true]); }

console.log('\n── 794 · 14. la relecture : le stockage ne se supprime pas, ne s’ouvre qu’avec l’accès, et l’ancien compteur ne revit pas ──');
/* Relecture adversariale du 24 septembre 2026 (trois angles, chaque constat contre-vérifié). On JOUE les vraies
   fonctions, dans un bac à sable à part : openBox, delItem, etiqAppliquerCat, saveProduitDonne. */
{ const NOMS = ['openBox', 'delItem', 'etiqAppliquerCat', 'saveProduitDonne', 'estStockage', 'stockageBox', 'stockageOuvert'];
  const C = {}; NOMS.forEach(n => { C[n] = bloc('function ' + n + '('); });
  v('population : les sept fonctions sont trouvées', NOMS.filter(n => !C[n]), []);
  const bac = o => { const ctx = { console, JSON, Math, Date, Set, Object, Array, String, Number,
      db: o.db, currentUser: moi, __vus: o.vus === undefined ? null : o.vus, __toasts: [], __ouvert: [], __conf: [], __saves: 0 };
    vm.createContext(ctx);
    vm.runInContext(`${K_ID.replace('const ', 'var ')}
      var boxView=null, current='boxes', etiq={sel:'a',action:'ajouter'}, COLL_GRP={boxes:'stock',produitsDonnes:'stock'}, views={boxes(){}};
      function visibleBoxes(l){ return __vus===null?(l||[]).slice():(l||[]).filter(b=>__vus.includes(b.id)); }
      function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function closeModal(){} function go(v){ current=v; }
      function logEvent(){} function canCat(){ return true; } function can(){ return true; } function permGarde(){ return true; }
      function confirm(m){ __conf.push(m); return true; } function ptPeutCorriger(){ return true; }
      function boxDonneOublier(){} function ecranDetail(f){ __ouvert.push(boxView); } function rendreDirige(){} function renderBoxDetail(){}
      function produit(id){ return (db.produits||[]).find(p=>p.id===id)||{}; } function uid(){ return 'u'+Math.random(); }
      function fullName(u){ return u?((u.prenom||'')+' '+(u.nom||'')).trim():''; } function esc(x){ return String(x); }
      function $(id){ return id==='etiq-qty'?{value:'3'}:null; } function etiqSuivant(){}
      ${NOMS.map(n => C[n]).join('\n')}`, ctx);
    return ctx; };
  const S = () => ({ id: 'stockage', nom: 'Stockage', actif: true, stock: { a: { u: 9, ctn: 0 } } });
  // a. supprimer
  let W = bac({ db: { boxes: [S(), { id: 'bxN', nom: 'Nord', stock: {} }], boxDecisions: [], bons: [], demandes: [], produits: [] } });
  W.delItem('boxes', 'stockage');
  v('⛔⛔ « supprimer » le stockage : refusé, AVANT toute question, et il est toujours là avec son contenu',
    [W.db.boxes.some(b => b.id === 'stockage' && b.stock.a.u === 9), W.__conf.length, W.__saves, W.__toasts.some(t => /ne se supprime pas/.test(t) && /Stockage actif/.test(t))], [true, 0, 0, true]);
  W.db.boxes.find(b => b.id === 'stockage').actif = false; W.delItem('boxes', 'stockage');
  v('… même désactivé (c’est son identifiant fixe qui compte, pas son état)', W.db.boxes.some(b => b.id === 'stockage'), true);
  W.delItem('boxes', 'bxN');
  v('contre-épreuve : une box ordinaire se supprime toujours, après confirmation', [W.db.boxes.some(b => b.id === 'bxN'), W.__conf.length], [false, 1]);
  const RBD = bloc('function renderBoxDetail(){');
  vrai('la fiche du stockage n’offre pas la corbeille (le bouton est conditionné à « pas le stockage »)', /\$\{!stk&&canCat\('stock','supprimer'\)\?`<button onclick="delItem\('boxes'/.test(RBD), RBD.length);
  vrai('… et la case du formulaire dit « Stockage actif »', /\$\{estStockage\(b\)\?'Stockage actif':'Box active'\}/.test(bloc('function formBox(id){')));
  // b. ouvrir
  W = bac({ db: { boxes: [S(), { id: 'bxN' }] }, vus: ['bxN'] });
  W.openBox('stockage');
  v('⛔⛔ ouvrir le stockage SANS y avoir accès (lien, notification, étiquette, adresse) : refusé, rien ne s’affiche', [W.boxView, W.__ouvert, W.__toasts.some(t => /ne t’est pas ouvert/.test(t))], [null, [], true]);
  W.db.boxes[0].actif = false; W.openBox('stockage');
  v('… désactivé non plus', [W.boxView, W.__ouvert], [null, []]);
  W.openBox('bxN');
  v('contre-épreuve : une box ordinaire s’ouvre comme avant', [W.boxView, W.__ouvert], ['bxN', ['bxN']]);
  W = bac({ db: { boxes: [Object.assign(S(), { actif: false })] }, vus: ['stockage'] }); W.openBox('stockage');
  v('… et qui y a accès l’ouvre, même désactivé (c’est par sa fiche qu’on le réactive)', W.__ouvert, ['stockage']);
  vrai('⛔ la fiche revérifie à CHAQUE rendu (un accès retiré pendant qu’on la regarde)', /if\(!b\)\{ go\('boxes'\); return; \}\s*\n\s*(\/\*[^\n]*\*\/\s*\n\s*)?if\(estStockage\(b\)&&!visibleBoxes\(\[b\]\)\.length\)\{ boxView=null;/.test(RBD), RBD.slice(0, 400));
  vrai('le bouton retour dit où il ramène', /title="\$\{retour==='stock'\?'Revenir au stock':'Revenir aux boxes'\}"/.test(RBD));
  // c. l'ancien compteur ne revit pas
  W = bac({ db: { boxes: [S()], produits: [P('a', 'ADVION', { qte: 0 })], mouvements: [] } });
  W.etiqAppliquerCat();
  v('⛔ scanner « catalogue » alors qu’un stockage existe : refusé, l’ancien compteur reste à 0, rien au journal', [W.db.produits[0].qte, W.db.mouvements.length, W.__toasts.some(t => /vit dans le stockage/.test(t))], [0, 0, true]);
  W = bac({ db: { boxes: [], produits: [P('a', 'ADVION', { qte: 2 })], mouvements: [] } });
  W.etiqAppliquerCat();
  v('contre-épreuve : sans stockage, le scanner du catalogue ajoute comme avant (2 + 3)', [W.db.produits[0].qte, W.db.mouvements.length], [5, 1]);
  // d. « Produits donnés » saisi à la main : la trace dit ce qui a BOUGÉ
  const don = (qte, q) => { const X = bac({ db: { boxes: [S()], produits: [P('a', 'ADVION', { qte })], mouvements: [], produitsDonnes: [] } });
    vm.runInContext(`FormData=function(t){ this.t=t; }; FormData.prototype[Symbol.iterator]=function*(){ yield* Object.entries(this.t); };`, X);
    X.saveProduitDonne({ preventDefault() {}, target: { produitNom: 'ADVION', quantite: String(q), date: '2026-09-24' } }, '');
    return [X.db.produits[0].qte, X.db.mouvements.map(m => m.qte), X.db.produitsDonnes.length]; };
  v('⛔ un don saisi à la main quand l’ancien compteur est à 0 (rangé dans le stockage) : noté, et AUCUNE sortie fantôme', don(0, 4), [0, [], 1]);
  v('… compteur à 2 pour un don de 4 : la sortie dit 2, pas 4', don(2, 4), [0, [2], 1]);
  v('contre-épreuve : compteur à 10, don de 4 → 6, une sortie de 4', don(10, 4), [6, [4], 1]); }

console.log('\n── 794 · 15. ⛔⛔ le stockage ne se voit que par sa PERMISSION — la vraie visibleBoxes (v742) ──');
{ const VB = bloc('function visibleBoxes(list){'), EXC = ligne('const boxExclu=');
  vrai('population : la vraie visibleBoxes est trouvée, et elle lit la case', VB.length > 800 && /can\('stockage'\)/.test(VB), VB.length);
  const jouer = (caps, boxes) => { const ctx = { currentUser: { id: 'uX', role: 'technicien', techId: 'tX' }, __caps: caps, Set, Array, Object, JSON, String };
    vm.createContext(ctx);
    vm.runInContext(K_ID.replace('const ', 'var ') + '\n' + bloc('function estStockage(') + '\n' + EXC.replace('const ', 'var ')
      + "\nfunction can(c){ return !!__caps[c]; }\nfunction perimetreTechIds(){ return null; }\nfunction myTechId(){ return 'tX'; }\nfunction delegationsRecues(){ return []; }\n" + VB, ctx);
    return ctx.visibleBoxes(boxes).map(b => b.id); };
  const B = () => [{ id: 'b1', visibleTous: true }, { id: 'stockage', visibleTous: true, userIds: ['uX'], techIds: ['tX'] }, { id: 'b2', techIds: ['tX'] }, { id: 'b3' }];
  v('⛔⛔ sans la case : pas le stockage — même « visible par toute l’équipe », même nommé, même par sa fiche technicien', jouer({}, B()), ['b1', 'b2']);
  v('⛔⛔ « Tout voir » sans la case : toutes les box, PAS le stockage', jouer({ voirTout: 1 }, B()), ['b1', 'b2', 'b3']);
  v('⛔ la case seule : le stockage, et ses box à lui — dans l’ordre de la liste', jouer({ stockage: 1 }, B()), ['b1', 'stockage', 'b2']);
  v('« Tout voir » et la case : tout, dans l’ordre', jouer({ voirTout: 1, stockage: 1 }, B()), ['b1', 'stockage', 'b2', 'b3']);
  v('contre-épreuve : une liste SANS stockage suit la règle d’avant', jouer({}, [{ id: 'b1', visibleTous: true }, { id: 'b3' }]), ['b1']);
  const UD = bloc('function usrDroitsHtml(u,admin){'), NB = bloc('function nuBoxHtml(){'), SU = bloc('async function saveUser(e,id){'), FB = bloc('function formBox(id){');
  vrai('⛔ la ligne d’une personne ne liste plus le stockage parmi ses box (c’est une case de la catégorie Stock)', /const boxes=\(db\.boxes\|\|\[\]\)\.filter\(b=>b\.actif!==false&&!estStockage\(b\)\);/.test(UD), UD.length);
  vrai('⛔ … ni le formulaire de création', /filter\(b=>b&&b\.actif!==false&&!estStockage\(b\)\)/.test(NB) && /\$\{!id\?nuStkHtml\(\):''\}/.test(SRC), NB.length);
  const iStk = SU.indexOf('if(nuStk&&stockageBox()) acces.caps.stockage=true;'), iBorne = SU.indexOf('const _retenus=droitsBorner(nu,currentUser);');
  vrai('⛔⛔ la case cochée à la création s’écrit AVANT droitsBorner (qui la retire à un créateur qui ne l’a pas)', iStk > 0 && iBorne > iStk, [iStk, iBorne]);
  vrai('le ✎ du stockage remplace « Qui peut voir ce box » par la permission', /estStockage\(b\)\?`<div class="form-sec">Qui peut s’y servir<\/div>/.test(FB) && /C’est une <b>permission<\/b>/.test(FB), FB.length); }

console.log('\n── 794 · 16. ⛔ le contrôle de CI des permissions tourne JUSQU’AU BOUT ──');
/* ⛔ DEUX FOIS MORT EN SILENCE : scripts/verifier-permissions.js découpe les vraies fonctions d'app.html
   dans un bac à sable, et chaque fonction neuve qu'elles lisent doit y entrer. Il plantait de la v733 à la
   v738 (trois fonctions manquantes), et de nouveau à la v742 (estStockage, lu par visibleBoxes) — et
   seule verification.yml l'exécute, sur main et les demandes de fusion : jamais sur cette branche. Un
   contrôle qu'on ne lance pas est une garde décrite, pas une garde. On le LANCE donc ici. */
{ const r = require('child_process').spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'verifier-permissions.js')], { encoding: 'utf8', timeout: 60000 });
  const sortie = (r.stdout || '') + (r.stderr || ''), fin = (sortie.match(/✓ (\d+) vérifications, aucun échec/) || [])[1];
  vrai('⛔ il se termine en 0, sans exception', r.status === 0 && !/Error|introuvable/.test(sortie), { code: r.status, erreur: (sortie.match(/^\w*Error.*$/m) || [''])[0] });
  vrai('… et il a vraiment vérifié quelque chose (population ≥ 30 contrôles)', +fin >= 30, fin); }

console.log('\n── 794 · 17. ⛔⛔ le stockage ne PARLE qu’à qui a la permission — responsable et noms d’avant compris (relecture v742) ──');
/* La relecture adversariale de la v742 l'a trouvé, et rejoué : la case ouvrait le stockage, mais un
   « Responsable » choisi sur sa fiche (ou un nom posé sur la box en v741) le faisait encore parler à
   quelqu'un qui ne le voit pas — arrivages et alertes dans la cloche (produits, quantités, fournisseur),
   historique des mouvements d'un DR, validations, avis « pour ta box ». Et « Tout voir » sans la case
   disait « Épuisé » d'un produit qui n'est QUE dans le stockage, et la commande suggérée le rachetait.
   On EXÉCUTE les vraies fonctions. */
{ const NOMS17 = ['stkLienOk', 'estStockage', 'visibleBoxes', 'notifBoxOk', 'notifBoxConcerne', 'visibleBoxMvts', 'valideursDR', 'valideursPour', 'boxGensIds',
    'stockLines', 'stockTotaux', 'stockVoitTout', 'bonSuggere'];
  const C17 = NOMS17.map(n => bloc('function ' + n + '('));
  v('population : les vraies fonctions sont trouvées', NOMS17.filter((n, i) => !C17[i]), []);
  const jouer = (moiId, users, boxes, extra) => {
    const x = extra || {};
    const ctx = { console, Set, Map, Object, Array, String, JSON, Math, db: { users, boxes, produits: x.produits || [] }, __drp: x.drp || null, __toasts: [] };
    vm.createContext(ctx);
    vm.runInContext(K_ID.replace('const ', 'var ') + '\n' + K_EXCLU.replace('const ', 'var ') + '\n' + C17.join('\n') + `
      var currentUser=db.users.find(u=>u.id===${JSON.stringify(moiId)})||null, bonLignes=[];
      function userCap(u,c){ if(!u) return false; if(u.role==='admin') return true; return !!(u.acces&&u.acces.caps&&u.acces.caps[c]); }
      function can(c){ return userCap(currentUser,c); }
      function myTechId(){ return (currentUser&&currentUser.techId)||''; }
      function perimetreTechIds(){ return null; } function perimetreUserIds(){ return null; }
      function drPerimetre(){ return new Set(__drp||[]); } function delegationsRecues(){ return []; } function remplacantDe(x){ return x; }
      function produit(id){ return db.produits.find(p=>p.id===id)||{}; }
      function peutCommander(){ return true; } function refusCommander(){} function formBon(){} function renderBonLignes(){} function bonQtyOpen(){}
      function toast(m){ __toasts.push(String(m)); }`, ctx);
    return ctx; };
  const gens = () => [{ id: 'uA', prenom: 'Justin', nom: 'Roux', role: 'admin' },
    { id: 'uR', prenom: 'Rita', nom: 'Resp', role: 'technicien' },                                   // responsable du stockage, SANS la case
    { id: 'uK', prenom: 'Karim', nom: 'Benali', role: 'technicien', drId: 'uD2' },                  // nommé sur le stockage en v741, SANS la case
    { id: 'uP', prenom: 'Paul', nom: 'Perm', role: 'technicien', acces: { caps: { stockage: true } } },
    { id: 'uD', prenom: 'Dora', nom: 'Dir', role: 'dr', acces: { caps: { validerDR: true, voirTout: true } } },
    { id: 'uD2', prenom: 'Didier', nom: 'Dir', role: 'dr', acces: { caps: { validerDR: true, voirTout: true, stockage: true } } }];
  const avecCase = (users, id) => { const u = users.find(x => x.id === id); u.acces = u.acces || { caps: {} }; u.acces.caps.stockage = true; return users; };
  const B = (resp) => [{ id: 'stockage', stockage: true, respUserId: resp, userIds: ['uK', 'uP'], techIds: [], stock: { p1: { u: 20 } } },
    { id: 'bN', respUserId: resp, userIds: ['uK', 'uP'], techIds: [], stock: { p2: { u: 1 } } }];
  const S = w => w.db.boxes[0], N = w => w.db.boxes[1];
  { const w = jouer('uR', gens(), B('uR')), w2 = jouer('uR', avecCase(gens(), 'uR'), B('uR'));
    v('⛔⛔ cloche : le responsable SANS la case n’a ni les arrivages ni les alertes du stockage — avec la case, oui ; une box ordinaire, oui',
      [w.notifBoxOk(S(w)), w.notifBoxConcerne(S(w)), w2.notifBoxOk(S(w2)), w2.notifBoxConcerne(S(w2)), w.notifBoxOk(N(w)), w.notifBoxConcerne(N(w))], [false, false, true, true, true, true]); }
  { const w = jouer('uK', gens(), B('uR'));
    v('⛔ … ni le nom posé sur la box en v741 (Karim, sans la case)', [w.notifBoxConcerne(S(w)), w.notifBoxConcerne(N(w))], [false, true]); }
  { const m = [{ id: 'm1', boxId: 'stockage', parId: 'uX' }, { id: 'm2', boxId: 'bN', parId: 'uX' }];
    const w = jouer('uD', gens(), B('uD'), { drp: ['uY'] }), w2 = jouer('uD', avecCase(gens(), 'uD'), B('uD'), { drp: ['uY'] });
    v('⛔⛔ historique d’un DR responsable du stockage SANS la case : pas ses mouvements (la box ordinaire, si) ; avec la case, les deux',
      [w.visibleBoxMvts(m).map(x => x.id), w2.visibleBoxMvts(m).map(x => x.id)], [['m2'], ['m1', 'm2']]); }
  { const w = jouer('uK', gens(), B('uD')), w2 = jouer('uK', avecCase(gens(), 'uD'), B('uD'));
    v('⛔⛔ validations : le DR responsable du stockage SANS la case n’en reçoit pas les sorties (celui de Karim, si) ; avec la case, les deux ; une box ordinaire, les deux',
      [w.valideursPour(S(w)), w2.valideursPour(S(w2)), w.valideursPour(N(w))], [['uD2'], ['uD2', 'uD'], ['uD2', 'uD']]); }
  { const w = jouer('uA', gens(), B('uR'));
    v('⛔ avis « pour ta box » : sur le stockage, seuls ceux qui ont la case (Paul) ; une box ordinaire, tous ses rattachés',
      [w.boxGensIds(S(w)), w.boxGensIds(N(w))], [['uP'], ['uR', 'uK', 'uP']]); }
  { const P = [{ id: 'p1', nom: 'P1', seuil: 5 }, { id: 'p2', nom: 'P2', seuil: 5 }];
    const wD = jouer('uD', gens(), B(''), { produits: P }), wD2 = jouer('uD2', gens(), B(''), { produits: P }), wSans = jouer('uD', gens(), [B('')[1]], { produits: P });
    v('⛔⛔ « Tout voir » SANS la case ne voit pas tout quand un stockage existe ; avec la case, si ; sans stockage du tout, « Tout voir » suffit',
      [wD.stockVoitTout(), wD2.stockVoitTout(), wSans.stockVoitTout()], [false, true, true]);
    wD.bonSuggere(); wD2.bonSuggere();
    v('⛔⛔ commande suggérée : sans la case, P1 (20 u au stockage, seuil 5) n’est PAS rachetée ; P2 (1 u en box) l’est — même chose avec la case',
      [wD.bonLignes.map(l => l.produitId + ':' + l.quantite), wD2.bonLignes.map(l => l.produitId + ':' + l.quantite)], [['p2:9'], ['p2:9']]); }
  vrai('⛔ le ✎ du stockage propose un responsable parmi ceux qui ont la permission (celui d’avant reste lisible, signalé)',
    /filter\(u=>u\.actif!==false&&u\.role!=='admin'&&\(stkLienOk\(b,u\)\|\|b\.respUserId===u\.id\)\)/.test(SRC) && /\$\{stkLienOk\(b,u\)\?'':' — sans la permission'\}/.test(SRC)); }

console.log('\n── 794 · 13. la mesure dans une vraie page existe ──');
{ const P2 = path.join(__dirname, '..', 'scratchpad', 'sonde-stockage.js');
  const SONDE = fs.existsSync(P2) ? fs.readFileSync(P2, 'utf8') : '';
  vrai('scratchpad/sonde-stockage.js existe', !!SONDE);
  vrai('… elle joue les deux entreprises (sans box, avec box) au doigt', /A\.0 LA POPULATION/.test(SONDE) && /B\.7/.test(SONDE) && /Input\.dispatchTouchEvent/.test(SONDE));
  vrai('… sur la BÊTA, jamais sur app.html', !!SONDE && !/app\.html/.test(SONDE)); }

console.log('\n── 794 · 18. ⛔ le ✎ du stockage ne montre que ce qui a un sens pour lui — et ne perd rien ──');
{ /* Relevé en v742 (« inoffensif, mais bavard ») : le ✎ du stockage ouvrait le formulaire COMPLET
     d'une box. ⛔ `saveBox` relit le formulaire ENTIER (`new FormData`) : un champ RETIRÉ s'écrirait
     vide. Les rangées sans objet sont donc MASQUÉES, leurs champs restent. Le comportement (champs
     cachés, valeurs conservées à l'enregistrement) est mesuré au navigateur :
     `scratchpad/sonde-stockage-form.js`, 7 ✓ — contre-épreuve sur la v743 : les 7 champs visibles. */
  const i = SRC.indexOf('function formBox(id){');
  const F = i > 0 ? SRC.slice(i, SRC.indexOf('let drRattaches=new Set();', i)) : '';
  vrai('   formBox est trouvé', F.length > 2000);
  vrai('   le stockage est reconnu une fois, en tête', /const S=estStockage\(b\), cache=S\?' hidden':'';/.test(F));
  const cachesId = ['numero', 'categorie', 'groupe', 'secteur'].map(n => new RegExp('<div class="frow"\\$\\{cache\\}>[^\\n]*name="' + n + '"').test(F));
  v('⛔ numéro, catégorie, groupe, secteur : masqués pour le stockage', cachesId, [true, true, true, true]);
  const suivi = ["Date d'installation", 'Fréquence de passage', 'Prochaine visite'].map(l => F.includes('<div class="frow"${cache}><span class="frow-lbl">' + l));
  v('⛔ installation, fréquence, prochaine visite : masquées aussi', suivi, [true, true, true]);
  /* ⛔⛔ ET LES CHAMPS SONT TOUJOURS LÀ : c'est la seule chose qui empêche l'enregistrement de les vider. */
  v('⛔⛔ aucun de ces champs n\'est RETIRÉ du formulaire', ['numero', 'categorie', 'groupe', 'secteur', 'dateInstallation', 'frequence', 'prochaineVisite'].filter(n => !F.includes('name="' + n + '"')), []);
  /* ⚠️ `hidden` ne cache pas une `.frow` tout seul : `.frow{display:flex}` bat le `display:none` du navigateur. */
  vrai('⛔ et `hidden` cache vraiment une rangée (`.frow[hidden]`)', /\.frow\[hidden\]\{display:none!important\}/.test(SRC)); }

console.log(`\n════ test-794 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
