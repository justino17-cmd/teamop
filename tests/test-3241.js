/* test-3241 — LE LOGO, LA COULEUR ET LE CACHET DE L'ENTREPRISE, PARTOUT OÙ ILS DOIVENT ÊTRE (v793, bêta, 3 novembre 2026).
 *
 * Justin : « vérifie et teste le système de logo pour les devis, couleur et tout ce qui est facture aussi, couleur, logo et cachet de
 * l'entreprise, et que tout fonctionne, et que ça ne change pas le logo de notre application ; organise-le mieux dans l'application ».
 * Mesuré dans la vraie page (scratchpad/sonde-docs/s.js) avant correction : deux défauts.
 *   1. le CACHET (et ses deux cases) et la couleur Premium s'écrivaient dans `db.entreprise` sans date : la synchro d'un autre appareil
 *      les effaçait, exactement comme la couleur des documents avant la v788 ;
 *   2. le BON DE COMMANDE portait la couleur et le nom de sa société, jamais son logo.
 * Ce banc EXÉCUTE les vraies fonctions (entPose, entFusion, entCachetDel, entCachetOpt, entCouleurSet/Del, bonPdfStr, docApercuZone). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return ''; }

console.log('\n── 3241 · 1. le cachet et la couleur Premium survivent à la synchro ──');
const F = ['function entFusion(P,A){', 'function entPose(cle,val){', 'function entCachetDel(){', 'function entCachetOpt(cle,on){', 'function entCouleurSet(hex){', 'function entCouleurDel(){'].map(bloc);
v('les six fonctions sont trouvées', F.map(f => f.length > 40), [true, true, true, true, true, true]);
const W = { console, Object, JSON, String, Math, Date, Array, Number, document: { getElementById: () => null } };
vm.createContext(W);
vm.runInContext(F.join('\n') + `
  var db={ entreprise:{ nom:'Clim Test', cachet:'data:image/jpeg;base64,AA' } }, current='';
  function save(){} function toast(){} function logEvent(){} function applyBrand(){} function docCachetZone(){ return ''; } function docApercuMaj(){} var views={ parametres(){} };`, W);
const autre = { nom: 'Clim Test', tel: '0102' };   // la fiche telle qu'un AUTRE appareil la connaît : ni cachet, ni cases, ni couleur
W.db.entreprise.cachet = 'data:image/jpeg;base64,AA'; W.entPose('cachet', W.db.entreprise.cachet);
W.entCachetOpt('cachetDevis', true); W.entCachetOpt('cachetFacture', false); W.entCouleurSet('#8B1E3F');
let f = W.entFusion(autre, W.db.entreprise);   // à la réception, le distant est prioritaire : P = l'autre appareil, A = celui-ci
v('après la synchro, le cachet est resté', !!f.cachet, true);
v('…la case « devis » cochée est restée', f.cachetDevis, true);
v('…la case « factures » décochée est restée décochée (false, pas effacée)', f.cachetFacture, false);
v('…la couleur Premium est restée', f.couleur, '#8B1E3F');
v('…et ce que l’autre appareil avait changé (le téléphone) est gardé', f.tel, '0102');
W.entCachetDel(); W.entCouleurDel();
f = W.entFusion({ nom: 'Clim Test', cachet: 'data:image/jpeg;base64,VIEUX', couleur: '#000000' }, W.db.entreprise);
v('un retrait du cachet et de la couleur gagne contre une copie plus ancienne qui les porte encore', [!!f.cachet, !!f.couleur], [false, false]);

console.log('\n── 3241 · 2. le bon de commande porte le logo de sa société ──');
const iL = SRC.indexOf('const _PDF_L=['), PDFL = iL < 0 ? '' : SRC.slice(iL, SRC.indexOf("].map(l=>l.split(' ').map(Number));", iL) + 36);
const B = ['function _pdfTranslit(s){', 'function _pdfTxt(s){', 'function _pdfLarg(txt,sz,gras){', 'function bonPdfStr(b){'].map(bloc);
v('bonPdfStr et ses aides sont trouvées', [PDFL.length > 500].concat(B.map(x => x.length > 200)), [true, true, true, true, true]);
const W2 = { console, Object, JSON, String, Math, Date, Array, Number, Set, atob: s => Buffer.from(s, 'base64').toString('binary') };
vm.createContext(W2);
vm.runInContext(`${PDFL}\n${B.join('\n')}
  var db={ fournisseurs:[{ id:'f1', nom:'ARMOSA' }] };
  function bcEntete(){ return 'Clim Test'; } function bcCouleur(){ return '#8B1E3F'; } function docCoordLignes(){ return []; } function docEntete(){ return { logo:'' }; }
  function bonNum(){ return 'BC-1'; } function bonQteTxt(){ return '2'; } function bonQteTotTxt(){ return '2'; } function todayISO(){ return '2026-11-03'; } function dateFr(d){ return d; }`, W2);
const bon = { id: 'b1', numero: 'BC-1', date: '2026-11-03', fournisseurId: 'f1', lignes: [{ designation: 'Tube', qte: 2 }] };
const LOGO = { b64: Buffer.from('JPEGFAUX').toString('base64'), w: 40, h: 20 };
const avec = W2.bonPdfStr(bon, LOGO), sans = W2.bonPdfStr(bon, null);
v('avec le logo de la société : une image dans le PDF, posée en tête', [/\/Subtype \/Image/.test(avec), /\/I1 Do/.test(avec), /\/XObject << \/I1 /.test(avec)], [true, true, true]);
v('sans logo : aucune image', [/\/Subtype \/Image/.test(sans), /\/I1 Do/.test(sans)], [false, false]);
vrai('la couleur de la société colore le bon', /0\.545 0\.118 0\.247 rg/.test(avec));
vrai('⛔ l’envoi par e-mail et la feuille PDF attendent le logo (bonLogoPret)', /content:btoa\(bonPdfStr\(b,await bonLogoPret\(b\)\)\)/.test(SRC) && /fabrique:async\(\)=>\(\{pdf:bonPdfStr\(b,await bonLogoPret\(b\)\)\}\)/.test(SRC));

console.log('\n── 3241 · 3. les Paramètres : un bloc « Tes documents » avec aperçu, plus de logo d’application ──');
vrai('le bloc s’appelle « Tes documents », dans l’ordre couleur → logo → cachet, avec l’aperçu', /🧾 Tes documents/.test(SRC) && SRC.indexOf('1 · Couleur') < SRC.indexOf('2 · Logo') && SRC.indexOf('2 · Logo') < SRC.indexOf('3 · Cachet') && /id="doc-apercu-zone"/.test(SRC));
vrai('⛔ plus aucun bouton de logo d’application (ent-logo-file) ni promesse « logo dans l’application »', !/id="ent-logo-file"/.test(SRC) && !/logo dans l\\'application|logo dans l'application/.test(SRC));
const AP = bloc('function docApercuZone(){');
vrai('docApercuZone est trouvée', AP.length > 300);
const W3 = { console, Object, String };
vm.createContext(W3);
vm.runInContext(AP + `
  var db={ entreprise:{ logo:'data:image/png;base64,LOGO', cachet:'data:image/jpeg;base64,CACHET', cachetDevis:true }, societes:[] };
  function docEntete(){ return { couleur:'#8B1E3F', nom:'Clim Test' }; } function esc(s){ return String(s); } function encreSur(){ return '#fff'; }`, W3);
let h = W3.docApercuZone();
v('l’aperçu montre la couleur, le logo, le nom et le cachet de l’entreprise', [h.includes('#8B1E3F'), h.includes('LOGO'), h.includes('Clim Test'), h.includes('CACHET')], [true, true, true, true]);
W3.db.entreprise.cachetDevis = false; h = W3.docApercuZone();
vrai('sans la case « devis », l’aperçu (un devis) ne montre pas le cachet', !h.includes('CACHET'));
vrai('chaque geste du bloc redessine l’aperçu', ['function docCouleurSet(hex){', 'function entCachetDel(){', 'function entCachetOpt(cle,on){'].every(n => bloc(n).includes('docApercuMaj()')));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
