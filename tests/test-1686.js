/* ══ c2 · LE PDF D'UN BON DE COMMANDE CONTINUE UNE LIGNE TROP HAUTE SUR LA PAGE SUIVANTE (campagne 2, lot c2-pdf-lignes-longues) ═══
   Constat : `bonPdfStr` ne changeait de page qu'ENTRE deux lignes de produit (`if(y-plus<118) newPage()`). Une SEULE ligne dont la
   référence (colonne de 76 pt : une quinzaine de signes par ligne) ou la désignation se replie sur plus d'une page de hauteur
   dépassait donc le bas : les lignes du dessous s'écrivaient sous la marge, dans le pied de page puis hors de la page (y < 0),
   et ce que le fournisseur devait lire se perdait dans le PDF qu'il reçoit. `newPage` ne sauvait que la ligne qui tenait sur une page NEUVE.
   Le correctif écrit la ligne par TRANCHES : tant qu'elle ne tient pas, on remplit la page, on en ouvre une (en-têtes de colonnes
   répétés par `newPage`), et la quantité reste sur la première tranche. Une ligne qui tient (ici ou sur une page neuve) est dessinée
   exactement comme avant.

   Ce banc EXÉCUTE la vraie `bonPdfStr` (vraies `_pdfTxt`, `_pdfTranslit`, `_pdfLarg`), relit le flux du PDF produit (chaque `Td` / `Tj`)
   et exige : toutes les lettres sont là (3 000 signes de désignation, 3 000 de référence), rien n'est écrit sous la marge basse
   (y < 62, hors pied de page) ni hors de la page, les en-têtes de colonnes sont répétés sur chaque page de tableau, aucun « ? ».
   Un banc de TEXTE qui chercherait `y-plus<118` garderait une phrase : ici on lit ce qui est ÉCRIT.   */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER ? path.resolve(process.env.APP_FICHIER) : path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return ''; }
const iL = SRC.indexOf('const _PDF_L=['), PDFL = iL < 0 ? '' : SRC.slice(iL, SRC.indexOf("].map(l=>l.split(' ').map(Number));", iL) + 36);
const TR = bloc('function _pdfTranslit(s){'), TX = bloc('function _pdfTxt(s){'), LG = bloc('function _pdfLarg(txt,sz,gras){'), BP = bloc('function bonPdfStr(b){');

console.log('\n── 1686 · 0. la population ──');
v('les fonctions du bac à sable sont trouvées', [PDFL.length > 500, TR.length > 300, TX.length > 300, LG.length > 200, BP.length > 3000], [true, true, true, true, true]);
v('⛔ une seule définition de bonPdfStr (une seconde gagnerait partout, en silence)', SRC.split('function bonPdfStr(').length - 1, 1);

const W = { console, Object, JSON, String, Math, Date, Array, Number, Set };
vm.createContext(W);
vm.runInContext(`${PDFL}\n${TR}\n${TX}\n${LG}\n${BP}
  var db={ fournisseurs:[{ id:'f1', nom:'ARMOSA', email:'commandes@armosa.fr', adresse:'1 rue du Port', codePostal:'17000', ville:'La Rochelle', telephone:'0500000000' }] };
  function bcEntete(){ return 'Nettoyage Excellence'; } function bcCouleur(){ return '#1E7A4E'; } function docCoordLignes(){ return []; } function docEntete(){ return {}; }
  function bonNum(b){ return b.numero||'BC-1'; } function bonQteTxt(){ return '2 ctn'; } function bonQteTotTxt(){ return '2 ctn'; } function todayISO(){ return '2026-10-17'; }`, W);

/* Relit le flux : { x, y, sz, gras, txt, page } pour chaque Tj (la page = le rang du flux de contenu). */
function lire(pdf) {
  const out = [], re = /\/F([12]) ([\d.]+) Tf\n(-?[\d.]+) (-?[\d.]+) Td\n\(((?:[^()\\]|\\.)*)\) Tj/g; let m;
  const flux = pdf.split(/\nstream\n/).slice(1).map(s => s.split('\nendstream')[0]);
  flux.forEach((f, page) => { re.lastIndex = 0; while ((m = re.exec(f))) out.push({ gras: m[1] === '2', sz: +m[2], x: +m[3], y: +m[4], txt: m[5].replace(/\\([()\\])/g, '$1'), page }); });
  return out; }
const sq = s => String(s).toLowerCase().replace(/[^a-z0-9àâäéèêëîïôöùûüç]/g, '');
const bon = (o) => Object.assign({ id: 'b1', numero: 'BC-2026-009', date: '2026-10-17', fournisseurId: 'f1', statut: 'prete', lignes: [], faitPar: 'Zoé Müller' }, o);
const pages = pdf => (pdf.match(/\/Type \/Page /g) || []).length;
const tout = pdf => lire(pdf).filter(t => t.y !== 44).map(t => t.txt).join(' ');
const compte = (pdf, car) => (sq(tout(pdf)).split(car).length - 1);
function borne(pdf, etiquette) {
  const t = lire(pdf); const RGT = 595 - 42;
  const trop = t.filter(l => l.x + W._pdfLarg(l.txt, l.sz, l.gras) > RGT + 0.5);
  const bas = t.filter(l => l.y < 62 && l.y !== 44 && !/^Page /.test(l.txt));
  vrai(etiquette + ' : aucune ligne ne dépasse la marge droite', trop.length === 0, trop.slice(0, 2));
  vrai(etiquette + ' : rien n’est écrit sous la marge basse (y ≥ 62, hors pied de page) ni hors de la page', bas.length === 0, bas.slice(0, 3)); }
/* chaque page porte ses en-têtes de colonnes (« DÉSIGNATION » : le É est l'octet WinAnsi 201, d'où le point du motif) */
function entetes(pdf, etiquette) {
  const t = lire(pdf), n = pages(pdf), avecTete = new Set(t.filter(l => /^D.SIGNATION$/.test(l.txt)).map(l => l.page));
  vrai(etiquette + ' : les en-têtes de colonnes sont répétés sur chacune des ' + n + ' pages', avecTete.size === n, [...avecTete]); }

/* 3 000 signes d'un seul mot en capitales larges (« WWWWWM… », cassé à la largeur de la colonne) : ~70 lignes de désignation, plus haut qu'une page */
const LARGE = Array.from({ length: 500 }, () => 'WWWWWM').join('').slice(0, 3000);
/* 3 000 signes de lettres ordinaires, avec espaces : une quarantaine de lignes, qui tiennent sur UNE page neuve */
const ORDI = Array.from({ length: 600 }, (_, i) => 'mot' + String.fromCharCode(97 + i % 26)).join(' ').slice(0, 3000);
/* 3 000 signes sans une espace en référence (colonne de 76 pt) : plus de 200 lignes, quatre pages */
const REF = Array.from({ length: 3000 }, (_, i) => 'REFQ'[i % 4]).join('');
const nW = LARGE.split('W').length - 1, nM = LARGE.split('M').length - 1;
/* les « W » et « M » écrits, comptés dans les seules lignes de désignation faites de ces deux lettres (le reste du bon porte des « m » ailleurs) */
const wm = (pdf, c) => lire(pdf).filter(t => /^[WM ]+$/.test(t.txt)).map(t => t.txt).join('').split(c).length - 1;

console.log('\n── 1686 · 1. une désignation de 3 000 signes, plus haute qu’une page ──');
{ const pdf = W.bonPdfStr(bon({ lignes: [{ reference: 'A1', designation: LARGE, cartons: 1, quantite: 12 }, { reference: 'A2', designation: 'Ligne suivante', cartons: 1, quantite: 3 }] }));
  const lg = lire(pdf).filter(t => /^[WM ]+$/.test(t.txt)).length;
  vrai('population : la désignation fait plus de 59 lignes (plus qu’une page neuve) et le document plusieurs pages', LARGE.length === 3000 && lg > 59 && pages(pdf) >= 2, [LARGE.length, lg, pages(pdf)]);
  vrai('⛔ les 3 000 signes sont là : ' + nW + ' « W » et ' + nM + ' « M » (avant : les dernières lignes écrites sous la page)', wm(pdf, 'W') === nW && wm(pdf, 'M') === nM, [wm(pdf, 'W'), wm(pdf, 'M'), nW, nM]);
  borne(pdf, 'désignation géante'); entetes(pdf, 'désignation géante');
  vrai('la ligne suivante est toujours là, et le total une fois', /Ligne suivante/.test(tout(pdf)) && (tout(pdf).match(/TOTAL/g) || []).length === 1);
  vrai('la quantité de la ligne géante est écrite une seule fois (sur sa première tranche) : deux quantités en tout avec la ligne suivante', lire(pdf).filter(t => t.txt === '2 ctn' && t.gras && t.sz === 9.2).length === 2, lire(pdf).filter(t => t.txt === '2 ctn').length); }

console.log('\n── 1686 · 2. une référence de 3 000 signes sans espace ──');
{ const pdf = W.bonPdfStr(bon({ lignes: [{ reference: REF, designation: 'Gel appât', cartons: 1, quantite: 12 }, { reference: 'Z9', designation: 'Dernier', cartons: 1, quantite: 1 }] }));
  vrai('population : la référence se replie sur plus de 200 lignes', lire(pdf).filter(t => /^REFQ/.test(t.txt)).length > 200, lire(pdf).filter(t => /^REFQ/.test(t.txt)).length);
  vrai('⛔ les 3 000 signes de la référence sont là (750 de chaque lettre)', ['r', 'e', 'f', 'q'].every(c => compte(pdf, c) >= 750), ['r', 'e', 'f', 'q'].map(c => compte(pdf, c)));
  borne(pdf, 'référence géante'); entetes(pdf, 'référence géante');
  vrai('la désignation de la ligne et la ligne suivante sont là', /Gel app/.test(tout(pdf)) && /Dernier/.test(tout(pdf))); }

console.log('\n── 1686 · 3. une ligne géante qui COMMENCE en milieu de page, suivie d’un commentaire ──');
{ const avant = Array.from({ length: 12 }, (_, i) => ({ reference: 'R' + i, designation: 'Produit ' + i, cartons: 1, quantite: 2 }));
  const com = Array.from({ length: 30 }, (_, i) => 'Consigne ' + (i + 1) + ' de livraison').join(' ');
  const pdf = W.bonPdfStr(bon({ notes: 'À livrer lundi avant 8h.', lignes: [...avant, { reference: 'GEANT', designation: LARGE, commentaire: com, cartons: 1, quantite: 12 }, { reference: 'FIN', designation: 'Dernier produit', cartons: 1, quantite: 1 }] }));
  vrai('⛔ la ligne géante est écrite en entier (3 000 signes), après douze lignes sur la même page', wm(pdf, 'W') === nW && wm(pdf, 'M') === nM && /Produit 11/.test(tout(pdf)), [wm(pdf, 'W'), wm(pdf, 'M'), nW, nM]);
  vrai('… le commentaire aussi (de la première à la dernière consigne), la ligne suivante et la note', /Consigne 1 de/.test(tout(pdf)) && /Consigne 30 de/.test(tout(pdf)) && /Dernier produit/.test(tout(pdf)) && /livrer lundi/.test(tout(pdf)));
  borne(pdf, 'ligne géante en milieu de page'); entetes(pdf, 'ligne géante en milieu de page');
  const p0 = lire(pdf).find(t => /^WWWWWM/.test(t.txt)), p1 = lire(pdf).find(t => t.txt === 'Produit 11');
  vrai('la première tranche commence sur la page où commence la ligne (elle n’est pas repoussée en entier)', !!p0 && !!p1 && p0.page === p1.page, [p0 && p0.page, p1 && p1.page]); }

console.log('\n── 1686 · 4. une ligne qui tient (ici ou sur une page neuve) est dessinée COMME AVANT ──');
{ const pdf = W.bonPdfStr(bon({ lignes: [{ reference: 'ARM-1', designation: ORDI, cartons: 1, quantite: 12 }, { reference: 'B', designation: 'Court', cartons: 0, quantite: 1 }] }));
  const lg = lire(pdf).filter(t => /^mot[a-z]/.test(t.txt)).length;
  vrai('population : 3 000 signes ordinaires, 30 lignes et plus', lg >= 30, lg);
  vrai('tous les mots sont là', (tout(pdf).match(/mot[a-z]/g) || []).length === 600, (tout(pdf).match(/mot[a-z]/g) || []).length);
  borne(pdf, 'désignation de 3 000 signes ordinaires'); entetes(pdf, 'désignation de 3 000 signes ordinaires'); }
{ const pdf = W.bonPdfStr(bon({ notes: 'À livrer lundi.', lignes: [{ reference: 'A1', designation: 'Gel', cartons: 1, quantite: 12 }, { reference: 'A2', designation: 'Appât', cartons: 1, quantite: 6 }] }));
  const g = lire(pdf).filter(l => l.sz === 9.2 && !l.gras).map(l => l.y);
  vrai('un bon court : une page, deux désignations 17 pt l’une sous l’autre (pas de saut de page, pas de tranche)', pages(pdf) === 1 && g.length === 2 && Math.abs(g[0] - g[1] - 17) < 0.11, [pages(pdf), g]); }

console.log('\n── 1686 · 5. jamais de « ? » dans un document que reçoit un fournisseur ──');
{ const pdf = W.bonPdfStr(bon({ lignes: [{ reference: 'A1', designation: ('Gel → 30 g ≥ 2 boîtes ✓ ' + LARGE).slice(0, 3000), cartons: 1, quantite: 2 }] }));
  const t = lire(pdf).map(l => l.txt).join('|');
  vrai('aucun « ? » dans le texte écrit, même sur une ligne coupée en tranches', pages(pdf) >= 2 && !/\?/.test(t) && /->/.test(t) && /OK/.test(t), t.slice(0, 200)); }

console.log('\n══ test-1686 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
