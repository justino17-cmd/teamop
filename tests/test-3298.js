/* ⛔ CE QUE CE FICHIER GARDE — DANS OP COURRIER, LE PLANCHER TACTILE SE POSE SUR LE DOIGT, PAS SUR LE FORMAT (13 novembre 2026).

   Justin : « la boîte mail, je veux celle qui était, juste la vérifier et corriger ». La vérification (toutes les cibles qu'un doigt touche, relevées
   dans l'arbre d'ombre sur iPhone, Android, iPad portrait et paysage : 199 cibles) a trouvé trois familles trop petites, toutes sur TABLETTE :
     · « Sélectionner » : 28 px de haut (le 44 px n'était posé que pour le format téléphone) ;
     · les réponses rapides de la lecture : 30 px ;
     · le segmenté « Tous / Non lus / Marqués » : 30 px sur un iPad en paysage (qui prend le format ordinateur).
   C'est la règle du dépôt (CLAUDE.md, « un audit sur deux appareils ») : la navigation se choisit à la largeur, un plancher tactile se pose sous
   `(pointer:coarse)`. Ce banc lit les RÈGLES (commentaires retirés) ; la preuve au navigateur est `scratchpad/courrier/cibles-tactiles.js`,
   qui touche pour de vrai et sort en 1 au moindre écart. Les trois copies du module restent identiques (`test-2994` le garde déjà).
   Éprouvé : chaque règle retirée fait tomber son contrôle (mutations jouées après le commit). */
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (m, c, d) => { if (c) { ok++; console.log('  ✓ ' + m); } else { ko++; console.log('  ✗ ' + m + (d === undefined ? '' : ' — ' + String(d).slice(0, 200))); } };
const SRC = fs.readFileSync(path.join(R, 'opcourrier.js'), 'utf8');
const CSS = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');
vrai('(population) la feuille du module est lue, et elle porte des règles « au doigt »', CSS.length > 100000 && (CSS.match(/@media \(pointer:\s*coarse\)/g) || []).length >= 5, (CSS.match(/@media \(pointer:\s*coarse\)/g) || []).length);

/* chaque bloc `@media (pointer:coarse) { … }` de la feuille, son corps entier (accolades appariées) */
const blocs = []; { const re = /@media \(pointer:\s*coarse\)\s*\{/g; let m; while ((m = re.exec(CSS))) { let n = 1, j = re.lastIndex; while (j < CSS.length && n > 0) { const c = CSS[j++]; if (c === '{') n++; else if (c === '}') n--; } blocs.push(CSS.slice(re.lastIndex, j - 1)); } }
const doigt = blocs.join('\n');
const regle = (sel) => { const i = doigt.indexOf(sel + '{'); return i < 0 ? '' : doigt.slice(i + sel.length + 1, doigt.indexOf('}', i)); };

vrai('⛔ « Sélectionner » fait au moins 44 px au doigt, SANS condition de format (une tablette se touche)', /min-height:\s*44px/.test(regle('.opc .seltog')), regle('.opc .seltog'));
vrai('⛔ les réponses rapides : au moins 36 px dessinés au doigt, sans condition de format', /min-height:\s*36px/.test(regle('.opc .rquick button')) && /position:\s*relative/.test(regle('.opc .rquick button')), regle('.opc .rquick button'));
vrai('⛔ … et leur zone qui répond déborde de 4 px en haut et en bas (44 px)', /inset:\s*-4px 0/.test(regle('.opc .rquick button::before')) && /content:\s*""/.test(regle('.opc .rquick button::before')), regle('.opc .rquick button::before'));
vrai('⛔ le segmenté du format ordinateur fait 36 px au doigt (un iPad en paysage prend ce format)', /height:\s*36px/.test(regle('.opc:where([data-fmt="mac"]) .seg button')), regle('.opc:where([data-fmt="mac"]) .seg button'));
vrai('⛔ … et sa zone qui répond déborde de 4 px en haut et en bas', /inset:\s*-4px 0/.test(regle('.opc:where([data-fmt="mac"]) .seg button::before')), regle('.opc:where([data-fmt="mac"]) .seg button::before'));
vrai('le bouton du segmenté est bien positionné (sans quoi le pseudo-élément sortirait du bouton)', /\.opc \.seg button\{[^}]*position:\s*relative/.test(CSS));
vrai('hors du doigt, rien ne change : « Sélectionner » reste à 28 px à la souris', /\.opc \.seltog\{[^}]*height:\s*28px/.test(CSS.replace(doigt, '')) || /\.opc \.seltog\{[^}]*height:\s*28px/.test(CSS));
vrai('la preuve au navigateur existe (elle touche, et sort en 1 au moindre écart)', fs.existsSync(path.join(R, 'scratchpad', 'courrier', 'cibles-tactiles.js')) && /process\.exit\(ecarts\.length \|\| zonesCourtes/.test(fs.readFileSync(path.join(R, 'scratchpad', 'courrier', 'cibles-tactiles.js'), 'utf8')));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
