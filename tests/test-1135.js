/* ══ g10 · clients#9 — LA CARTE EST BORD À BORD, PAS LA RANGÉE QUI LA SURMONTE ═════════════════════════════
   Mesuré au navigateur (bêta, 1440 px) : la liste Clients commence à x=292 (menu à 258 + la marge de la page, 34), mais
   le segmenté « Liste · Carte · Produits donnés » de la Carte des box commençait à 258 (collé au menu) et la barre
   « Carte du … / Technicien » de la Carte interventions s'étendait de 258 à 1440 (pleine largeur, sans marge).
   La cause : `.content-map{padding:0!important}` (la carte bord à bord) retire la marge de TOUT l'écran, rangées
   comprises. Même chose à 820 px (272 au lieu de 296) et à 390 px (0 au lieu de 16).

   La preuve est une sonde au navigateur (3 profils, mesurée avant/après, captures) :
     scratchpad/gestion/correctifs/g10/sonde-marges.js  — « tout est aligné » (segmenté et barre sur la marge de la liste
     Clients, cartes toujours bord à bord, aucun défilement latéral), avant : 3 profils sur 3 en défaut.
   Ce banc garde la RÈGLE (par classe, pas par écran) et ses deux conditions : la carte reste bord à bord, et rien ne
   peut la battre — `!important` parce que le segmenté porte `style="margin:0 0 10px"` en ligne (boxSousCats).      */
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

console.log('\n── 1135 · 0. la population ──');
const m = SRC.match(/(html\[data-refonte\] \.content-map[^{}]*)\{([^}]*)\}/g) || [];
const regle = m.find(r => /\.pf-bar/.test(r) && /seg-on/.test(r)) || '';
vrai('la règle « rangée sous une carte » est trouvée', regle.length > 60, m);
vrai('la règle bord à bord d’origine est toujours là', /\.content-map\{padding:0 !important;\}/.test(SRC) && /\.content-map \.map-card\{margin:0;border-radius:0;border:0;\}/.test(SRC));

console.log('\n── 1135 · 1. la règle : par classe, la marge de la page, zone sûre comprise, impossible à battre ──');
const sel = regle.slice(0, regle.indexOf('{')), corps = regle.slice(regle.indexOf('{') + 1);
vrai('elle vise le segmenté (.filters.seg-on) ET la barre (.pf-bar), directement sous .content-map — pas un écran nommé', /\.content-map > \.filters\.seg-on/.test(sel) && /\.content-map > \.pf-bar/.test(sel) && !/#content|carteBox|carteInt|data-vue/.test(sel), sel);
vrai('⛔ marge gauche = celle de la page (--rf-marge) et la zone sûre', /margin-left:max\(var\(--rf-marge,30px\),env\(safe-area-inset-left\)\)/.test(corps), corps);
vrai('⛔ marge droite de même', /margin-right:max\(var\(--rf-marge,30px\),env\(safe-area-inset-right\)\)/.test(corps), corps);
vrai('⛔ `!important` : le segmenté écrit sa marge en ligne (style="margin:0 0 10px")', (corps.match(/!important/g) || []).length >= 2, corps);
vrai('… et c’est bien la même variable que la page (`.content` de la refonte la lit)', /html\[data-refonte\] \.content\{\s*padding-left:max\(var\(--rf-marge,30px\),env\(safe-area-inset-left\)\);\s*padding-right:max\(var\(--rf-marge,30px\),env\(safe-area-inset-right\)\)\}/.test(SRC));
v('--rf-marge existe aux trois largeurs (16, 24, 34)', ['html[data-refonte]{--rf-marge:16px}', 'html[data-refonte]{--rf-marge:24px}', 'html[data-refonte]{--rf-marge:34px}'].map(x => SRC.includes(x)), [true, true, true]);
vrai('la carte, elle, ne reçoit aucune marge de cette règle (bord à bord)', !/map-card/.test(regle));

console.log('\n── 1135 · 2. le balisage que la règle suppose ──');
const cb = SRC.slice(SRC.indexOf('views.carteBox=function(){'), SRC.indexOf('views.carteBox=function(){') + 1400),
  ci = SRC.slice(SRC.indexOf('views.carteInt=function(){'), SRC.indexOf('views.carteInt=function(){') + 3500);
vrai('Carte des box : le segmenté est le premier enfant de #content, avant la carte', /\$\('content'\)\.innerHTML=`\$\{boxSousCats\('carteBox'\)\}\s*<div class="card map-card"/.test(cb), cb.slice(0, 300));
vrai('… et boxSousCats rend un <nav class="filters"> à marge en ligne (d’où !important)', /<nav class="filters" aria-label="Boxes" style="margin:0 0 10px">/.test(SRC));
vrai('Carte interventions : la barre est le premier enfant de #content, avant la carte', /\$\('content'\)\.innerHTML=carteFiltreBar\(tousPts\)\+`<div class="card map-card"/.test(ci));
vrai('… et carteFiltreBar rend une carte .pf-bar', /return `<div class="card pf-bar" onclick="event\.stopPropagation\(\)">/.test(SRC));
vrai('les deux écrans reçoivent bien .content-map (c’est elle qui retire la marge)', /\$\('content'\)\.classList\.toggle\('content-map', view==='carteBox'\|\|view==='carteInt'\)/.test(SRC));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
