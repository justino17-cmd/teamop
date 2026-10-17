/* ══ c2 · LE PDF D'UN DEVIS OU D'UNE FACTURE NE PERD PLUS UNE LETTRE (campagne 2, lot c2-pdf-lignes-longues) ═══════════════════
   Constat (relecture du lot) : `docPdfStr` — le devis ET la facture, les deux documents qui partent chez TOUS les clients — coupait la
   désignation de chaque ligne à 48 signes par « … » (une désignation de 3 000 signes sortait en 47) et le « DÉTAIL » du devis à
   6 lignes de 100 signes. Aucun débordement de page : du texte PERDU, dans le PDF que reçoit le client (pour la facture, un document
   comptable). Le bon de commande avait déjà son pli (`wrapL`, test-1686) ; il est devenu UNE fonction partagée, `_pdfReplier`.
   Le correctif replie la désignation (la ligne grandit de 11 pt par ligne de texte, quantité et prix sur la première), continue une
   ligne trop haute sur la page suivante (en-têtes répétés) et fait de même pour le cadre « DÉTAIL ».

   Ce banc EXÉCUTE la vraie `docPdfStr` (vraies `_pdfTxt`, `_pdfTranslit`, `_pdfLarg`, `_pdfReplier`), relit le flux du PDF produit
   (chaque `Td` / `Tj`) et exige : toutes les lettres de la désignation et du détail sont écrites, rien sous la marge basse ni hors de la
   page, rien au-delà de la marge droite ni sur la colonne de la quantité, en-têtes répétés, quantité et prix écrits UNE fois par ligne,
   aucun « ? ». Une désignation d'une ligne se dessine comme avant (une ligne, 17 pt entre deux lignes).   */
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
const TR = bloc('function _pdfTranslit(s){'), TX = bloc('function _pdfTxt(s){'), LG = bloc('function _pdfLarg(txt,sz,gras){'), RP = bloc('function _pdfReplier(s,sz,gras,maxW){'), DP = bloc('function docPdfStr(kind,d,logo){');

console.log('\n── 1687 · 0. la population ──');
v('les fonctions du bac à sable sont trouvées', [PDFL.length > 500, TR.length > 300, TX.length > 300, LG.length > 200, RP.length > 300, DP.length > 3000], [true, true, true, true, true, true]);
v('⛔ une seule définition de docPdfStr et de _pdfReplier (une seconde gagnerait partout, en silence)', [SRC.split('function docPdfStr(').length - 1, SRC.split('function _pdfReplier(').length - 1], [1, 1]);
vrai('la désignation n\'est plus coupée par `cut(…,48)` ni le détail limité à 6 lignes (le CODE, commentaires retirés)', !/cut\(l\.designation\|\|'',48\)/.test(DP) && !/slice\(0,6\)/.test(DP));

const W = { console, Object, JSON, String, Math, Date, Array, Number, Set };
vm.createContext(W);
vm.runInContext(`${PDFL}\n${TR}\n${TX}\n${LG}\n${RP}\n${DP}
  var db={ clients:[{ id:'c1', nom:'Restaurant Le Gourmet', adresse:'12 rue des Halles', cp:'17000', ville:'La Rochelle', tel:'0500000000', email:'contact@gourmet.fr' }] };
  function docEntete(){ return { nom:'Nettoyage Excellence', couleur:'#1E7A4E', iban:'FR7600000000', bic:'BICXX' }; } function docCoordLignes(){ return []; }
  function ligTotLigne(l){ return Math.round((Number(l.qte)||0)*(Number(l.pu)||0)*100)/100; } function isoDe(d){ return d.toISOString().slice(0,10); } function todayISO(){ return '2026-10-17'; }`, W);

function lire(pdf) {
  const out = [], re = /\/F([12]) ([\d.]+) Tf\n(-?[\d.]+) (-?[\d.]+) Td\n\(((?:[^()\\]|\\.)*)\) Tj/g; let m;
  const flux = pdf.split(/\nstream\n/).slice(1).map(s => s.split('\nendstream')[0]);
  flux.forEach((f, page) => { re.lastIndex = 0; while ((m = re.exec(f))) out.push({ gras: m[1] === '2', sz: +m[2], x: +m[3], y: +m[4], txt: m[5].replace(/\\([()\\])/g, '$1'), page }); });
  return out; }
const sq = s => String(s).toLowerCase().replace(/[^a-z0-9àâäéèêëîïôöùûüç]/g, '');
const doc = (o) => Object.assign({ id: 'd1', num: 'DV-2026-009', date: '2026-10-17', clientId: 'c1', tva: 20, statut: 'brouillon', lignes: [] }, o);
const pages = pdf => (pdf.match(/\/Type \/Page /g) || []).length;
const RGT = 595 - 42;
/* la colonne de désignation : x = 50 (M+8), hors en-tête ; le détail : x = 51 (M+9), hors titre */
const colDes = pdf => lire(pdf).filter(t => t.x === 50 && !/^D.SIGNATION$/.test(t.txt) && t.y > 62).map(t => t.txt);
const colDet = pdf => lire(pdf).filter(t => t.x === 51 && t.y > 62 && !/^D.TAIL( \(suite\))?$/.test(t.txt)).map(t => t.txt);
function borne(pdf, etiquette) {
  const t = lire(pdf);
  const trop = t.filter(l => l.x + W._pdfLarg(l.txt, l.sz, l.gras) > RGT + 0.5);
  const bas = t.filter(l => l.y < 62 && l.y !== 44 && !/^Page /.test(l.txt));
  vrai(etiquette + ' : aucune ligne ne dépasse la marge droite', trop.length === 0, trop.slice(0, 2));
  vrai(etiquette + ' : rien n’est écrit sous la marge basse (y ≥ 62, hors pied de page) ni hors de la page', bas.length === 0, bas.slice(0, 3));
  vrai(etiquette + ' : aucun « ? » dans le document', !t.some(l => l.txt.includes('?')), t.filter(l => l.txt.includes('?')).slice(0, 2)); }
function entetes(pdf, etiquette) {
  const t = lire(pdf), n = pages(pdf), avecTete = new Set(t.filter(l => /^D.SIGNATION$/.test(l.txt)).map(l => l.page));
  vrai(etiquette + ' : les en-têtes de colonnes sont répétés sur chacune des ' + n + ' pages', avecTete.size === n, [...avecTete]); }

const LARGE = Array.from({ length: 3000 / 9 }, (_, i) => (i % 2 ? 'WWWWWWWW ' : 'MMMMMMMM ')).join('').slice(0, 3000);
const COLLE = ('Zq' + 'XJ'.repeat(10)).repeat(3000 / 22 + 1).slice(0, 3000);   // 3 000 signes sans une espace

for (const kind of ['devis', 'factures']) {
  console.log('\n── 1687 · 1. ' + kind + ' : une désignation de 3 000 signes ──');
  for (const [nom, des] of [['en capitales larges', LARGE], ['sans une espace', COLLE]]) {
    const pdf = W.docPdfStr(kind, doc({ lignes: [{ designation: des, qte: 2, pu: 10 }, { designation: 'Ligne suivante', qte: 1, pu: 5 }] }), null);
    vrai(kind + ' ' + nom + ' : la désignation a plusieurs pages à elle (' + pages(pdf) + ' pages)', pages(pdf) >= 2, pages(pdf));
    v(kind + ' ' + nom + ' : toutes les lettres des 3 000 signes sont écrites, dans l\'ordre', sq(colDes(pdf).filter(x => x !== 'Ligne suivante').join('')), sq(des));
    vrai(kind + ' ' + nom + ' : la ligne suivante est écrite', colDes(pdf).includes('Ligne suivante'));
    borne(pdf, kind + ' ' + nom); entetes(pdf, kind + ' ' + nom);
    const t = lire(pdf);
    v(kind + ' ' + nom + ' : la quantité et le prix de la ligne sont écrits UNE fois (le total est de 20,00 EUR)', [t.filter(l => l.txt === '20,00 EUR').length, t.filter(l => l.x < 330 && l.x > 280 && l.txt === '2').length], [1, 1]);
    const desL = t.filter(l => l.x === 50 && l.y > 62 && !/^D.SIGNATION$/.test(l.txt));
    vrai(kind + ' ' + nom + ' : la désignation ne recouvre pas la colonne de la quantité (le « 2 » est cadré à droite sur x = 321)', desL.every(l => 50 + W._pdfLarg(l.txt, l.sz, l.gras) < RGT - 232 - W._pdfLarg('2', 9.2, false)), desL.find(l => 50 + W._pdfLarg(l.txt, l.sz, l.gras) >= RGT - 232 - W._pdfLarg('2', 9.2, false)));
  }
  console.log('\n── 1687 · 2. ' + kind + ' : une ligne géante au MILIEU d\'une page, entre deux lignes ordinaires ──');
  { const norm = i => ({ designation: 'Prestation numéro ' + i, qte: 1, pu: 10 });
    const lignes = [norm(1), norm(2), norm(3), norm(4), { designation: LARGE.slice(0, 1500), qte: 3, pu: 7 }, norm(5), norm(6)];
    const pdf = W.docPdfStr(kind, doc({ lignes }), null), d = colDes(pdf);
    v(kind + ' : les six lignes ordinaires sont là, chacune une fois', [1, 2, 3, 4, 5, 6].map(i => d.filter(x => x === 'Prestation numéro ' + i).length), [1, 1, 1, 1, 1, 1]);
    v(kind + ' : toutes les lettres de la ligne géante', sq(d.filter(x => !/^Prestation/.test(x)).join('')), sq(LARGE.slice(0, 1500)));
    borne(pdf, kind + ' milieu de page'); entetes(pdf, kind + ' milieu de page'); }
  console.log('\n── 1687 · 3. ' + kind + ' : le cas ordinaire est dessiné comme avant ──');
  { const pdf = W.docPdfStr(kind, doc({ lignes: [{ designation: 'Dératisation du local technique', qte: 1, pu: 100 }, { designation: 'Désinsectisation cuisine', qte: 2, pu: 50 }] }), null), t = lire(pdf);
    const a = t.find(l => l.txt === 'Dératisation du local technique' || /^D.ratisation du local technique$/.test(l.txt)), b = t.find(l => /^D.sinsectisation cuisine$/.test(l.txt));
    vrai(kind + ' : deux désignations courtes, une page, une ligne chacune', pages(pdf) === 1 && !!a && !!b, [pages(pdf), !!a, !!b]);
    vrai(kind + ' : 17 pt entre deux lignes, comme avant', !!a && !!b && Math.abs((a.y - b.y) - 17) < 0.01, a && b && a.y - b.y); }
  { const des = 'Remplacement complet des postes d\'appâtage sécurisés du site nord', pdf = W.docPdfStr(kind, doc({ lignes: [{ designation: des, qte: 1, pu: 10 }] }), null);
    v(kind + ' : une désignation de 65 signes n\'est plus tronquée (avant : 47 signes et « … »)', sq(colDes(pdf).join('')), sq(des)); }
  { const des = 'Ligne quarante-trois ', lignes = Array.from({ length: 90 }, (_, i) => ({ designation: 'Ligne ' + (i + 1), qte: 1, pu: 1 })), pdf = W.docPdfStr(kind, doc({ lignes }), null);
    v(kind + ' : 90 lignes courtes, 90 désignations écrites, aucune en double', colDes(pdf).length, 90); borne(pdf, kind + ' 90 lignes'); entetes(pdf, kind + ' 90 lignes'); }
}

console.log('\n── 1687 · 4. le « DÉTAIL » du devis ──');
{ const paragraphes = Array.from({ length: 12 }, (_, i) => 'Consigne ' + (i + 1) + ' : prévenir le gardien avant le passage sur le site ' + (i + 1));
  const notes = paragraphes.join('\n') + '\n' + LARGE;
  const pdf = W.docPdfStr('devis', doc({ notes, lignes: [{ designation: 'Prestation', qte: 1, pu: 10 }] }), null), d = colDet(pdf);
  v('12 consignes + 3 000 signes : toutes les lettres du détail sont écrites (avant : 6 lignes de 100 signes)', sq(d.join('')), sq(notes));
  borne(pdf, 'détail'); }
{ const pdf = W.docPdfStr('devis', doc({ notes: 'Accès par le portail nord\nCode à demander au gardien', lignes: [{ designation: 'Prestation', qte: 1, pu: 10 }] }), null);
  v('un détail de deux lignes tient dans un cadre, une page', [pages(pdf), colDet(pdf)], [1, ['Accès par le portail nord', 'Code à demander au gardien'].map(s => lire(pdf).find(l => sq(l.txt) === sq(s)).txt)]); }
{ const pdf = W.docPdfStr('devis', doc({ notes: LARGE, lignes: Array.from({ length: 22 }, (_, i) => ({ designation: 'Ligne ' + (i + 1), qte: 1, pu: 1 })) }), null);
  v('un détail géant après un tableau déjà long : lettres toutes là', sq(colDet(pdf).join('')), sq(LARGE)); borne(pdf, 'détail après tableau long'); }

console.log('\n══════ test-1687 : ' + ok + ' ✓  ' + ko + ' ✗ ══════');
process.exit(ko ? 1 : 0);
