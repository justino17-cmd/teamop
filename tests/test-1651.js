/* ══ k03 · r5#3 — UN TIRET ENTRE DEUX CHIFFRES EST UNE SOUSTRACTION POUR UN TABLEUR ═══════════════════════════
   Le lot i03 (test-1522) a exempté de l'apostrophe tout « + ou - en tête, puis chiffres, espaces, points, TIRETS et
   parenthèses ». Or « - » est un opérateur : « +33-6-12-34-56-78 » est la formule 33-6-12-34-56-78 = -153, « +1-2 » vaut -1 —
   le numéro est remplacé par un nombre, sans un mot (changement silencieux de valeur). Le principe sûr : ne passe tel quel que
   ce qui est un nombre ou un numéro lisible fait de CHIFFRES, d'ESPACES et de POINTS (« +33 6 12 34 56 78 », « +33.6.12.34.56.78 »,
   et le « (0) » collé au chiffre qui le suit, « +33 (0)6… », qu'aucune syntaxe de formule n'accepte). Tout ce qu'un tableur peut
   évaluer — un opérateur (+ - * / ^ & = < >), une parenthèse ordinaire, un @, une lettre — reste préfixé (injection CSV, lot g07).
   Ce banc EXÉCUTE la vraie csvCellule, extraite d'app.html, sur une table d'entrées, et applique à chaque sortie sans apostrophe
   un « tableur » minimal : si ce qu'elle contient après le signe de tête peut s'évaluer, c'est un échec.            */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_HTML || path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const i0 = SRC.indexOf('function csvCellule(v){'); const i1 = SRC.indexOf('\nfunction csvCellMontant', i0);
vrai('csvCellule est trouvée (une seule définition)', i0 > 0 && i1 > i0 && SRC.split('function csvCellule(').length - 1 === 1);
const ctx = {}; vm.createContext(ctx); vm.runInContext(SRC.slice(i0, i1), ctx); const C = ctx.csvCellule;
const lu = t => { const s = C(t); return s.slice(1, -1).replace(/""/g, '"'); };   // le contenu de la cellule, guillemets défaits

/* Le « tableur » : une cellule qui commence par + - = @ (ou tab/CR) et n'a pas d'apostrophe est lue comme une formule. Elle est
   INOFFENSIVE si, après le signe de tête, elle ne porte que des chiffres, espaces et points (ou un « (0) » collé à un chiffre) —
   aucun opérateur, aucune lettre, aucune parenthèse libre : il n'y a rien à calculer. */
const evaluable = c => { if (!/^[=+\-@\t\r]/.test(c)) return false; if (/^[+-]\d+(?:[.,]\d+)?$/.test(c)) return false;   // un nombre nu (« -12,50 ») est un nombre, pas un calcul
  const reste = c.slice(1).replace(/\(0\)(?=\d)/g, '');
  return !/^[\d   .]*\d[\d   .]*$/.test(reste); };

console.log('\n── 1651 · 1. des numéros et des nombres lisibles : tels quels, et NON évaluables ──');
for (const t of ['+33 6 12 34 56 78', '+33.6.12.34.56.78', '+33612345678', '+33 (0)6 12 34 56 78', '+44 (0)20 7946 0958', '+33 6 12 34', '+33 6 12',
  '-12,50', '-12.50', '+3', '-0,5', '+1,5', '0612345678', '06 12 34 56 78', '06-12-34-56-78']) {
  const c = lu(t);
  vrai('« ' + t + ' » : aucune apostrophe', c === t, c);
  vrai('« ' + t + ' » : rien qu\'un tableur puisse calculer', !evaluable(c), c);
}

console.log('\n── 1651 · 2. ⛔ r5#3 · ce qu\'un tableur évalue est neutralisé : apostrophe ──');
for (const t of ['+33-6-12-34-56-78', '+1-2', '-1-2', '-2+3', '+1+1', '+33 6-12', '+33 (0)6-12-34', '-5-3', '+33 - 6',
  '+33 (6) 12', '+1 (555) 123 4567', '+(1)', '+1/2', '+2*3', '+2^3', '-1&2',
  '=SOMME(A1:A3)', '=1+1 Resto', '+A1', '-A1', '+SUM(A1)', '@SUM(A1)', '=HYPERLINK("http://x")', '+cmd|\' /C calc\'!A0', '-1+cmd|x',
  '+33 6 =A1', '- tiret', '-', '+', '+ -', '+33 6 12 34 56 78 abc', '\t=1', '\r=1', '+33\n=1', '=', '@', '+(0)', '+33 (0) 6']) {
  const c = lu(t);
  vrai('« ' + JSON.stringify(t) + ' » : apostrophe en tête', c === "'" + t, c);
}

console.log('\n── 1651 · 3. la propriété, sur un balayage : aucune sortie sans apostrophe n\'est évaluable ──');
{ const alphabet = ['+', '-', '=', '@', '1', '2', '3', '0', ' ', '.', '(', ')', ',', 'A', '*', '/', '\t'];
  let n = 0, mauvais = [], sansApostrophe = 0;
  const rec = (s, d) => { if (d === 0) return; for (const a of alphabet) { const t = s + a; n++; const c = lu(t); if (!c.startsWith("'")) { sansApostrophe++; if (evaluable(c)) mauvais.push(t); } rec(t, d - 1); } };
  rec('', 4);
  vrai('population : ' + n + ' chaînes essayées, dont ' + sansApostrophe + ' sorties sans apostrophe (ensemble non vide)', n > 80000 && sansApostrophe > 1000, [n, sansApostrophe]);
  vrai('⛔ aucune des ' + sansApostrophe + ' sorties sans apostrophe n\'est évaluable par un tableur', mauvais.length === 0, mauvais.slice(0, 8)); }

console.log('\n── 1651 · 4. le reste de la fabrique ne bouge pas ──');
vrai('un nombre JavaScript : virgule française', C(33.5) === '"33,5"' && C(-5) === '"-5"');
vrai('null / undefined / vide : cellule vide', C(null) === '""' && C(undefined) === '""' && C('') === '""');
vrai('les guillemets se doublent', C('dit "oui"') === '"dit ""oui"""');
vrai('un texte banal reste intact', C('Dupont') === '"Dupont"');

console.log('\n════ test-1651 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
