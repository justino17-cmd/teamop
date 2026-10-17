/* ══ h05 · appareils#6 — LE SÉLECTEUR « TOUTE MON ÉQUIPE » DU POINTAGE ÉTAIT UN <select> BRUT ════════
   Rejoué au navigateur : rayon 0, police Arial, fond rgb(107,107,107) de nuit / rgb(239,239,239) de
   jour, 19 px de haut au bureau — le seul <select> « nu » des 41 rubriques. Tout l'habillage des
   champs (rayon, fond `--deep`, liseré, chevron, police, plancher tactile, 16 px contre le zoom d'iOS)
   est porté par `.field select` : un <select> posé hors de `.field` n'en reçoit RIEN.

   Ce banc lit le CODE de la vue (commentaires retirés) : le sélecteur appelant `ptSetTech` doit vivre
   dans un `.field`, dont la marge basse est remise à zéro et qui n'est pas plus large que l'ancien
   (230 px). Il garde aussi l'accord avec la feuille : les règles qui habillent `.field select` existent
   toujours, avec le rayon, le fond et la police de l'application (jetons, pas de couleur en dur).
   La preuve au pixel est une sonde navigateur : scratchpad/gestion/correctifs/h05/sonde-select.js     */
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };

console.log('\n── 1441 · 1. la population ──');
const i = SRC.indexOf('<select onchange="ptSetTech(this.value)"');
const j = SRC.indexOf('<select', SRC.indexOf('ptSetTech(this.value)') - 80);
vrai('le sélecteur de ptSetTech est trouvé dans la vue', i > 0 || j > 0, [i, j]);
const k = SRC.indexOf('ptSetTech(this.value)');
const fin = SRC.indexOf('</select>', k);
const sel = SRC.slice(SRC.lastIndexOf('<select', k), fin + 9);
vrai('l\'extrait est un <select> complet', /^<select[^>]*>[\s\S]*<\/select>$/.test(sel), sel.slice(0, 120));
vrai('il garde ses options (Toute mon équipe + une par personne)', sel.indexOf('Toute mon équipe') > 0 && sel.indexOf('techs.map') > 0);

console.log('\n── 1441 · 2. il vit dans un .field ──');
const avant = SRC.slice(Math.max(0, SRC.lastIndexOf('<select', k) - 160), SRC.lastIndexOf('<select', k));
const div = /<div class="field"([^>]*)>\s*$/.exec(avant);
vrai('le <select> est l\'enfant direct d\'un <div class="field">', !!div, avant.slice(-120));
const st = div ? div[1] : '';
vrai('la marge basse de .field est remise à zéro (sinon la barre grandit de 16 px)', /margin:\s*0\b/.test(st), st);
vrai('le conteneur reste poussé à droite (margin-left:auto → la valeur « auto » à gauche)', /margin:\s*0 0 0 auto/.test(st), st);
vrai('et ne dépasse pas 230 px comme avant', /max-width:\s*230px/.test(st), st);
vrai('il peut rétrécir sous 360 px (min-width:0) pour ne pas sortir de la barre', /min-width:\s*0/.test(st), st);
vrai('le <select> n\'écrit plus de largeur en ligne qui battrait la feuille', !/style=/.test(sel.slice(0, sel.indexOf('>') + 1)), sel.slice(0, 120));
vrai('la fermeture du .field suit le </select>', /^\s*<\/div>/.test(SRC.slice(fin + 9)), SRC.slice(fin + 9, fin + 40));

console.log('\n── 1441 · 3. l\'habillage que .field select apporte existe toujours ──');
const regle = /\.field input,\.field select,\.field textarea,\.search-inp\{[^}]*\}/.exec(SRC);
vrai('la règle de champ est trouvée', !!regle);
vrai('elle donne un rayon par jeton', regle && /border-radius:var\(--r-2\)/.test(regle[0]), regle && regle[0].slice(0, 200));
vrai('un fond par jeton (--deep), pas une couleur', regle && /background:var\(--deep\)/.test(regle[0]));
const fam = /body,\.btn,\.search-inp,\.field input,\.field select,\.field textarea/.test(SRC);
vrai('la police de l\'application est posée sur .field select', fam);
vrai('le chevron du select est posé (appearance:none + --chevron)', /\.field select\{appearance:none;[^}]*var\(--chevron\)/.test(SRC));
vrai('la refonte garde un plancher tactile (min-height) sur .field select', /html\[data-refonte\] \.field input,html\[data-refonte\] \.field select,\s*html\[data-refonte\] \.field textarea[^{]*\{[^}]*min-height:var\(--rf-tap\)/.test(SRC));

console.log('\n' + ok + ' ✓ ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
