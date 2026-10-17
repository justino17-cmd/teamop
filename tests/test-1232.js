/* ══ g20 · LE PDF D'UN BON DE COMMANDE NE COUPE PLUS SES TEXTES LONGS (achats#4) ═════════════════════════
   Constat (agents de test de la bêta, 16 octobre 2026) : `bonPdfStr` — l'aperçu, le téléchargement ET la
   pièce jointe que reçoit le FOURNISSEUR — coupait par nombre de signes : la note à 100 (`cut(line,100)`),
   cinq lignes de note au plus (`slice(0,5)`), la désignation à 56, le commentaire de ligne à 78, la
   référence à 14. Le « … » ajouté par `cut` n'a pas empêché la perte : une note de 230 signes (« …ne pas
   laisser les cartons dans le couloir… sinon refus de réception ») sortait arrêtée à ~99 signes, sans que
   le fournisseur sache qu'il manquait quelque chose — et ce sont des instructions de livraison.

   Ce banc EXÉCUTE la vraie `bonPdfStr` (avec les vraies `_pdfTxt`, `_pdfTranslit`, `_pdfLarg`), relit le
   flux du PDF produit (chaque `Td` / `Tj`, sa police, sa taille) et exige : tout le texte est là, plus
   large qu'aucune ligne n'est dessinée que la marge, rien ne tombe dans le pied de page, et aucun « ? ».
   Un banc de TEXTE qui chercherait `cut(line,100)` garderait une phrase : ici on lit ce qui est ÉCRIT.   */
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
const iL = SRC.indexOf('const _PDF_L=['), PDFL = iL < 0 ? '' : SRC.slice(iL, SRC.indexOf("].map(l=>l.split(' ').map(Number));", iL) + 36);
const TR = bloc('function _pdfTranslit(s){'), TX = bloc('function _pdfTxt(s){'), LG = bloc('function _pdfLarg(txt,sz,gras){'), RP = bloc('function _pdfReplier(s,sz,gras,maxW){'), BP = bloc('function bonPdfStr(b){');

console.log('\n── 1232 · 0. la population ──');
v('les fonctions du bac à sable sont trouvées', [PDFL.length > 500, TR.length > 300, TX.length > 300, LG.length > 200, RP.length > 300, BP.length > 3000], [true, true, true, true, true, true]);
v('⛔ une seule définition de bonPdfStr (une seconde gagnerait partout, en silence)', SRC.split('function bonPdfStr(').length - 1, 1);

const W = { console, Object, JSON, String, Math, Date, Array, Number, Set };
vm.createContext(W);
vm.runInContext(`${PDFL}\n${TR}\n${TX}\n${LG}\n${RP}\n${BP}
  var db={ fournisseurs:[{ id:'f1', nom:'ARMOSA', email:'commandes@armosa.fr', adresse:'1 rue du Port', codePostal:'17000', ville:'La Rochelle', telephone:'0500000000' }] };
  function bcEntete(){ return 'Nettoyage Excellence'; } function bcCouleur(){ return '#1E7A4E'; } function docCoordLignes(){ return []; } function docEntete(){ return {}; }
  function bonNum(b){ return b.numero||'BC-1'; } function bonQteTxt(){ return '2 ctn'; } function bonQteTotTxt(){ return '2 ctn'; } function todayISO(){ return '2026-10-16'; }`, W);

/* Relit le flux : { x, y, sz, gras, txt } pour chaque Tj. L'échappement PDF (\\( \\) \\\\) est défait ; le texte est en WinAnsi
   (un octet = un signe), 133 est le « … » de WinAnsi. */
function lire(pdf) {
  const out = [], re = /\/F([12]) ([\d.]+) Tf\n(-?[\d.]+) (-?[\d.]+) Td\n\(((?:[^()\\]|\\.)*)\) Tj/g; let m;
  while ((m = re.exec(pdf))) out.push({ gras: m[1] === '2', sz: +m[2], x: +m[3], y: +m[4], txt: m[5].replace(/\\([()\\])/g, '$1') });
  return out; }
const sq = s => String(s).toLowerCase().replace(/[^a-z0-9àâäéèêëîïôöùûüç]/g, '');   // sans espaces ni ponctuation : l’apostrophe typographique devient l’octet 146 dans le flux
const bon = (o) => Object.assign({ id: 'b1', numero: 'BC-2026-007', date: '2026-10-16', fournisseurId: 'f1', statut: 'prete', lignes: [], faitPar: 'Zoé Müller' }, o);
const NOTE = 'Livrer impérativement avant 8h le matin, sonner à l\'interphone, demander Mme Dupont puis le gardien ; ne pas laisser les cartons dans le couloir ni devant la porte coupe-feu, sinon refus de réception par le client. Merci !';
function tout(pdf) { return lire(pdf).filter(t => t.y !== 44).map(t => t.txt).join(' '); }
function contient(pdf, texte) { return sq(tout(pdf)).includes(sq(texte)); }
function borne(pdf, etiquette) {
  const t = lire(pdf); const RGT = 595 - 42;
  const trop = t.filter(l => l.x + W._pdfLarg(l.txt, l.sz, l.gras) > RGT + 0.5);
  const bas = t.filter(l => l.y < 62 && l.y !== 44 && !/^Page /.test(l.txt));
  vrai(etiquette + ' : aucune ligne ne dépasse la marge droite', trop.length === 0, trop.slice(0, 2));
  vrai(etiquette + ' : rien n’est écrit dans le pied de page (y < 62)', bas.length === 0, bas.slice(0, 2)); }

console.log('\n── 1232 · 1. achats#4 — la note complète arrive chez le fournisseur ──');
{ const pdf = W.bonPdfStr(bon({ notes: NOTE }));
  vrai('population : le flux contient du texte et la note commence', lire(pdf).length > 10 && /Livrer imp/.test(tout(pdf)), lire(pdf).length);
  vrai('⛔ la fin de la note (« sinon refus de réception par le client. Merci ! ») est dans le PDF (avant : perdue)', contient(pdf, 'sinon refus de réception par le client. Merci !'), tout(pdf).slice(-200));
  vrai('… et la note ENTIÈRE, mot pour mot', contient(pdf, NOTE));
  borne(pdf, 'note longue'); }
{ const lignes = Array.from({ length: 9 }, (_, i) => 'Consigne ' + (i + 1) + ' : ne pas oublier de prévenir le gardien'), pdf = W.bonPdfStr(bon({ notes: lignes.join('\n') }));
  vrai('⛔ neuf lignes de note : la neuvième est là (avant : coupé à cinq)', /Consigne 9/.test(tout(pdf)) && /Consigne 6/.test(tout(pdf)), tout(pdf).slice(-200));
  borne(pdf, 'neuf lignes de note'); }

console.log('\n── 1232 · 2. achats#4 — désignation, commentaire, référence ──');
{ const des = 'Gel appât blattes professionnel haute efficacité sans odeur boîte de trente grammes avec applicateur et notice de sécurité en français', com = 'Livrer à l’arrière du bâtiment, porte B, après avoir prévenu le responsable de site au téléphone la veille de la livraison sans faute',
  pdf = W.bonPdfStr(bon({ lignes: [{ reference: 'ARM-2026-LONGUE-REFERENCE-X', designation: des, commentaire: com, cartons: 2, quantite: 24 }, { reference: 'R2', designation: 'Court', cartons: 0, quantite: 3 }] }));
  vrai('⛔ la désignation entière (140 signes) est écrite (avant : coupée à 56)', contient(pdf, des), tout(pdf).slice(0, 400));
  vrai('⛔ le commentaire entier est écrit (avant : coupé à 78)', contient(pdf, com), tout(pdf).slice(0, 600));
  vrai('⛔ la référence entière est écrite (avant : coupée à 14)', sq(tout(pdf)).includes(sq('ARM-2026-LONGUE-REFERENCE-X')), tout(pdf).slice(0, 200));
  vrai('la ligne suivante est toujours là', /Court/.test(tout(pdf)));
  borne(pdf, 'ligne longue'); }
{ const pdf = W.bonPdfStr(bon({ lignes: [{ designation: 'X'.repeat(120), cartons: 0, quantite: 1 }] }));
  vrai('un mot sans espace plus long que la colonne est cassé, pas perdu (120 « X »)', (tout(pdf).match(/X/g) || []).length === 120, (tout(pdf).match(/X/g) || []).length);
  borne(pdf, 'mot géant'); }

console.log('\n── 1232 · 3. pagination : un document long reste lisible, du début à la fin ──');
{ const lignes = Array.from({ length: 40 }, (_, i) => ({ reference: 'R' + i, designation: 'Produit numéro ' + i + ' avec une désignation assez longue pour passer sur deux lignes dans la colonne du tableau', commentaire: i % 3 === 0 ? 'Commentaire de la ligne ' + i + ' à lire avec soin' : '', cartons: 1, quantite: i + 1 }));
  const notes = Array.from({ length: 30 }, (_, i) => 'Ligne de note numéro ' + (i + 1)).join('\n'), pdf = W.bonPdfStr(bon({ lignes, notes }));
  vrai('plusieurs pages', (pdf.match(/\/Type \/Page /g) || []).length >= 2, (pdf.match(/\/Type \/Page /g) || []).length);
  vrai('⛔ la dernière ligne de produit ET la dernière ligne de note sont dans le PDF', /Produit numéro 39/.test(tout(pdf)) && /Ligne de note numéro 30/.test(tout(pdf)), tout(pdf).slice(-120));
  borne(pdf, 'document long');
  vrai('le « total » est écrit une fois', (tout(pdf).match(/TOTAL/g) || []).length === 1); }

console.log('\n── 1232 · 3 bis. un commentaire de ligne très long passe à la page suivante, il ne s’écrit pas dans le pied de page ──');
{ const phrase = 'Instruction de livraison numéro ', com = Array.from({ length: 80 }, (_, i) => phrase + (i + 1) + ' à respecter').join(' ');
  const lignes = Array.from({ length: 25 }, (_, i) => ({ reference: 'R' + i, designation: 'Produit ' + i, cartons: 1, quantite: 2 }));
  lignes.push({ reference: 'RC', designation: 'Produit avec consigne', commentaire: com, cartons: 1, quantite: 2 }, { reference: 'RZ', designation: 'Dernier produit', cartons: 1, quantite: 2 });
  const pdf = W.bonPdfStr(bon({ lignes }));
  vrai('population : le commentaire fait beaucoup de lignes (> 28) et le document plusieurs pages', lire(pdf).filter(t => /Instruction de livraison/.test(t.txt)).length > 28 && (pdf.match(/\/Type \/Page /g) || []).length >= 2, lire(pdf).filter(t => /Instruction de livraison/.test(t.txt)).length);
  vrai('⛔ le commentaire ENTIER est dans le PDF, de la première à la dernière consigne (avant : écrit sous la page, perdu)', /Instruction de livraison numéro 1 /.test(tout(pdf)) && /numéro 80 à respecter/.test(tout(pdf)));
  vrai('… et la ligne suivante, après le commentaire, est là', /Dernier produit/.test(tout(pdf)));
  borne(pdf, 'commentaire très long en fin de page');
  vrai('⛔ le texte du commentaire ne sort ni de la page (y ≥ 0) ni du pied', lire(pdf).every(t => t.y >= 0), lire(pdf).filter(t => t.y < 0).slice(0, 2)); }

console.log('\n── 1232 · 4. jamais de « ? » dans un document que reçoit un fournisseur ──');
{ const pdf = W.bonPdfStr(bon({ notes: 'Porte B → sonner ✓ puis 📞 appeler', lignes: [{ designation: 'Gel → 30 g ≥ 2 boîtes ✓', commentaire: 'à l’arrière 🚪', cartons: 1, quantite: 2 }] }));
  const t = lire(pdf).map(l => l.txt).join('|');
  vrai('aucun « ? » dans le texte écrit', !/\?/.test(t), t.slice(0, 300));
  vrai('la flèche et la coche sont dites autrement', /->/.test(t) && /OK/.test(t), t.slice(0, 300)); }

console.log('\n── 1232 · 5. un bon court est dessiné comme avant ──');
{ const pdf = W.bonPdfStr(bon({ notes: 'À livrer lundi.', lignes: [{ reference: 'A1', designation: 'Gel', cartons: 1, quantite: 12 }] }));
  vrai('une page, la note, la ligne, le total', (pdf.match(/\/Type \/Page /g) || []).length === 1 && /À livrer lundi/.test(tout(pdf)) && /Gel/.test(tout(pdf)) && /TOTAL/.test(tout(pdf)));
  borne(pdf, 'bon court');
  vrai('PDF bien formé (en-tête, xref, EOF)', pdf.startsWith('%PDF-1.4') && /startxref/.test(pdf) && pdf.endsWith('%%EOF')); }

console.log('\n══ test-1232 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
