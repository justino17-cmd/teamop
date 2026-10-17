/* ══ EXPORT CSV — UN NUMÉRO DE TÉLÉPHONE N'EST PAS UNE FORMULE ═══════════════════════════════════════════
   Lot i03 (17 octobre 2026), bug r3#6. csvCellule neutralisait (apostrophe) tout texte commençant par + ou -
   sauf un nombre nu : « +33 6 12 34 56 78 » (un numéro écrit comme on l'écrit) sortait donc « '+33 6 12 34 56 78 »,
   avec l'apostrophe visible dans Excel. L'injection de formule (lot g07) reste fermée : une formule porte des
   LETTRES, des « = », « @ », « | », « ! », « , » ou un second « + » — jamais seulement des chiffres, espaces,
   points, tirets et parenthèses. Ce banc EXÉCUTE la vraie csvCellule, extraite d'app.html.                    */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const iT = SRC.indexOf('function csvEstNumeroTel('); const i0 = SRC.indexOf('function csvCellule(v){'); const iDeb = iT >= 0 && iT < i0 ? iT : i0; const i1 = SRC.indexOf('\nfunction csvCellMontant', i0);
vrai('csvCellule est trouvée (une seule définition)', i0 > 0 && i1 > i0 && SRC.split('function csvCellule(').length - 1 === 1);
const ctx = {}; vm.createContext(ctx); vm.runInContext(SRC.slice(iDeb, i1), ctx); const C = ctx.csvCellule;

console.log('— des numéros de téléphone écrits comme on les écrit : tels quels');
for (const t of ['+33 6 12 34 56 78', '+33-6-12-34-56-78', '+33.6.12.34.56.78', '+33 (0)6 12 34 56 78', '+33612345678', '0612345678', '06 12 34 56 78', '+33 6 12 34 56 78', '-12,50', '+3'])
  vrai('« ' + t + ' » : aucune apostrophe', C(t) === '"' + t + '"', C(t));

console.log('— les vraies formules restent neutralisées (CSV injection)');
for (const t of ['=1+1 Resto', '=HYPERLINK("http://x")', '@SUM(A1)', '+SUM(A1)', '-2+3', '+cmd|\' /C calc\'!A0', '-1+cmd|x', '+33 6 =A1', '- tiret', '-', '+', '+ -', '+33 6 12 34 56 78 abc', '+1+1', '\t=1', '\r=1', '+33\n=1'])
  vrai('« ' + JSON.stringify(t) + ' » : apostrophe', C(t).startsWith('"\''), C(t));

console.log('— le reste de la fabrique ne bouge pas');
vrai('un nombre JavaScript : virgule française', C(33.5) === '"33,5"' && C(-5) === '"-5"');
vrai('null / undefined / vide : cellule vide', C(null) === '""' && C(undefined) === '""' && C('') === '""');
vrai('les guillemets se doublent', C('dit "oui"') === '"dit ""oui"""');
vrai('un texte banal reste intact', C('Dupont') === '"Dupont"');

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
