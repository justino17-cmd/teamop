/* ══ lot h04 / appareils#7 — LES SEPT JOURS D'INTERVENTIONS TIENNENT AU DOIGT, AU TÉLÉPHONE ══════════
   Mesuré par l'audit des appareils : la zone qui RÉPOND (elementFromPoint balayé) de chaque jour du bandeau
   d'Interventions faisait 26 px sur Android 360 et 30 px sur iPhone 390 — sous le plancher de 38 px du dépôt
   (test-771). Cause : les flèches ‹ › (42 px chacune + espacements = 92 px sur 312) vivaient DANS la rangée
   des jours. Les 7 taps tombaient pourtant sur le bon jour : seul le gabarit était en cause.

   Le correctif est une règle de feuille (`@media (max-width:480px)`) qui range les flèches sur la ligne du mois :
   la rangée des jours cesse d'avoir une boîte (`display:contents`) et `order` replace ses trois enfants dans la
   carte. ⛔ Ce banc garde ce que la règle doit GAGNER, pas seulement son texte : le gabarit écrit déjà
   `display:flex` (rangée) et `flex:1` (groupe de jours) EN LIGNE, et un style en ligne bat la feuille — sans
   `!important` sur ces deux propriétés, la règle ne s'applique pas du tout (c'était le premier essai).
   La preuve de comportement est une sonde navigateur : scratchpad/gestion/correctifs/h04/sonde-jours.js
   (360/320/390/820 px, jour et nuit : zone qui répond ≥ 38 px, chaque jour touché sélectionne CE jour — premier,
   milieu, dernier —, ‹ › changent de semaine).
   BANC_FICHIER : une copie mutée d'app.html. */
'use strict';
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(process.env.BANC_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
// ⛔ seulement les blocs qui COMMENCENT une ligne (le motif naïf avale 107 000 caractères d'app.html)
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };

console.log('— le gabarit —');
const i0 = SRC.indexOf('views.interventions=function');
const iv = i0 < 0 ? -1 : i0;
vrai('views.interventions est trouvée', iv > 0);
const bande = SRC.slice(iv, iv + 40000);
const m = /const strip=`<div class="([^"]*)" style="padding:10px 8px;margin-bottom:12px">/.exec(bande);
vrai('la carte du bandeau des jours est trouvée', !!m);
vrai('elle porte .int-jours (la règle ne vise QUE cette bande, pas la liste semaine du Planning)', !!m && /\bint-jours\b/.test(m[1]), m && m[1]);
const nbCartes = (SRC.match(/<div class="card int-jours"/g) || []).length;
vrai('une seule carte porte .int-jours', nbCartes === 1, nbCartes);
vrai('la rangée des jours écrit toujours display:flex en ligne (c\'est ce que la règle doit battre)', /<div style="display:flex;align-items:center;gap:4px">\s*<button[^>]*>‹<\/button>\s*<div style="flex:1;display:flex;gap:3px">/.test(bande));

console.log('— la feuille —');
const M = /@media \(max-width:480px\)\{\s*html\[data-refonte\] \.card\.int-jours\{[\s\S]*?\n\}/.exec(SRC);
vrai('le bloc @media (max-width:480px) du bandeau est trouvé', !!M);
const bloc = M ? M[0] : '';
const regle = (sel) => { const r = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}').exec(bloc); return r ? r[1] : null; };
const rangee = regle('html[data-refonte] .card.int-jours > div:nth-child(2)');
vrai('la rangée des jours n\'a plus de boîte : display:contents!important (le gabarit écrit display:flex en ligne)', !!rangee && /display:\s*contents\s*!important/.test(rangee), rangee);
const groupe = regle('html[data-refonte] .card.int-jours > div:nth-child(2) > div');
vrai('le groupe des sept jours prend toute la largeur de la carte : flex:1 1 100%!important (le gabarit écrit flex:1 en ligne)', !!groupe && /flex:\s*1 1 100%\s*!important/.test(groupe), groupe);
vrai('le groupe des jours passe APRÈS la navigation (order:4)', !!groupe && /order:\s*4/.test(groupe), groupe);
const g = regle('html[data-refonte] .card.int-jours > div:nth-child(2) > button:first-child');
const d = regle('html[data-refonte] .card.int-jours > div:nth-child(2) > button:last-child');
const a = regle('html[data-refonte] .card.int-jours > div:last-child');
vrai('‹ (order:1) · Aujourd\'hui (order:2) · › (order:3) : la navigation se lit dans l\'ordre', !!g && !!a && !!d && /order:\s*1/.test(g) && /order:\s*2/.test(a) && /order:\s*3/.test(d), [g, a, d]);
vrai('une carte étroite (≤ 340 px) rend de la place aux jours (rembourrage réduit)', /@media \(max-width:340px\)\{[\s\S]*?\.card\.int-jours\{padding:\d+px \d+px!important\}/.test(SRC));
const horsMedia = SRC.replace(/@media \(max-width:(480|340)px\)\{[\s\S]*?\n\}/g, '').replace(/<div class="card int-jours"/g, '');
vrai('aucune règle .int-jours n\'existe en dehors des deux @media', !/int-jours/.test(horsMedia), (/.{40}int-jours.{40}/.exec(horsMedia) || [''])[0]);

console.log('— les interdits —');
vrai('pas de container-type dans le bloc (CLAUDE.md : jamais sur #content)', !/container-type/.test(bloc));
vrai('pas de :has() qui lit [style…] (test-823)', !/:has\([^)]*\[style/.test(bloc));
vrai('aucune variable CSS reprise par elle-même dans le bloc (cycle)', !/--([\w-]+)\s*:\s*var\(--\1\)/.test(bloc));
vrai('la logique du glisser-déposer reste en ligne, intacte (ondrop → intDropDay)', /ondrop="this\.style\.outline='';intDropDay\(event,'\$\{iso\}'\)"/.test(bande));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
