/* ══ lot h04 / appareils#8 — UN TÉLÉPHONE EN PAYSAGE NE MONTRE PAS DE CONTENU ═════════════════════════════
   Mesuré (iPhone 844×390, Android 800×360) : la barre du haut (68 px) et l'en-tête d'écran (196 à 213 px : retour, puis
   titre et sous-titre, puis actions — trois rangées) repoussaient le premier bloc de contenu à 288-352 px sur 390.
   Le menu latéral permanent (272 px dès 781 px) n'est PAS en cause et ne change pas : « la navigation se choisit à la
   largeur » est une décision d'architecture (iPad) ; un menu rétractable en paysage téléphone serait une décision de
   produit — noté, pas inventé.

   Le correctif est un bloc de feuille borné au paysage bas des téléphones. Ce banc garde LA BORNE (c'est elle qui
   protège l'iPad paysage 1180×820, le Mac 1440×900 et les portraits : contre-épreuve de la sonde) et ce que le bloc doit
   GAGNER : la couche du thème final écrit `html[data-marque][data-refonte] .ph-title{font-size:34px!important}` — le bloc
   n'a de sens que s'il a la même force ET vient APRÈS elle (la cascade tranche à force égale par l'ordre).
   La preuve au navigateur : scratchpad/gestion/correctifs/h04/sonde-paysage.js (en-tête avant/après, appareils de contre-épreuve
   comparés ligne à ligne).
   BANC_FICHIER : une copie mutée d'app.html. */
'use strict';
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(process.env.BANC_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
// ⛔ seulement les blocs qui COMMENCENT une ligne (le motif naïf avale 107 000 caractères d'app.html)
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };

const ENTETE = '@media (orientation:landscape) and (max-height:560px) and (max-width:1024px){';
const i0 = SRC.indexOf(ENTETE);
vrai('le bloc paysage-bas des téléphones est trouvé', i0 > 0);
const fin = i0 < 0 ? -1 : SRC.indexOf('\n}', i0);
const bloc = i0 < 0 || fin < 0 ? '' : SRC.slice(i0, fin + 2);
vrai('le bloc est borné (paysage ET hauteur ≤ 560 px ET largeur ≤ 1024 px)', bloc.length > 200);

console.log('— la borne protège les autres appareils —');
const mh = /max-height:(\d+)px/.exec(ENTETE), mw = /max-width:(\d+)px/.exec(ENTETE);
// hauteurs et largeurs de contre-épreuve (sonde) : iPad paysage 1180×820, Mac 1440×900, iPad portrait 820×1180, iPhone portrait 390×844
const appareils = [['iPad paysage 1180×820', 1180, 820, true], ['Mac 1440×900', 1440, 900, true], ['iPad portrait 820×1180', 820, 1180, false], ['iPhone portrait 390×844', 390, 844, false], ['iPad mini paysage 1024×768', 1024, 768, true]];
const vise = (w, h, paysage) => paysage && h <= +mh[1] && w <= +mw[1];
for (const [n, w, h, p] of appareils) vrai(n + ' : le bloc ne le vise pas', !vise(w, h, p));
for (const [n, w, h] of [['iPhone paysage 844×390', 844, 390], ['Android paysage 800×360', 800, 360], ['iPhone Pro Max paysage 932×430', 932, 430]]) vrai(n + ' : le bloc le vise', vise(w, h, true));
vrai('la hauteur maximale reste celle du bloc paysage voisin (560 px)', mh && +mh[1] === 560 && /@media\(orientation:landscape\) and \(max-height:560px\)\{/.test(SRC));

console.log('— ce que le bloc doit gagner —');
const regle = (sel) => { const r = new RegExp(sel.replace(/[.*+?^${}()|[\]\\>]/g, '\\$&') + '\\s*\\{([^}]*)\\}').exec(bloc); return r ? r[1] : null; };
const F = 'html[data-refonte][data-refonte]';
const titre = regle(F + ' .ph-title');
vrai('le titre se réduit, en !important (la couche du thème final écrit 34px!important)', !!titre && /font-size:\s*2\d(\.\d+)?px\s*!important/.test(titre), titre);
vrai('la force du bloc égale celle du thème final : deux attributs sur <html>', /^html\[data-refonte\]\[data-refonte\]/.test(F) && /html\[data-marque\]\[data-refonte\] \.ph-title\{/.test(SRC));
const iTheme = SRC.indexOf('html[data-marque][data-refonte] .ph-title{'), iBloc = SRC.indexOf(ENTETE);
vrai('le bloc vient APRÈS la couche du thème final (à force égale, c\'est l\'ordre qui tranche)', iTheme > 0 && iBloc > iTheme, [iTheme, iBloc]);
const ph = regle(F + ' .page-head');
vrai('l\'en-tête range retour · titre · actions sur UNE rangée (flex, retour à la ligne permis)', !!ph && /display:\s*flex/.test(ph) && /flex-wrap:\s*wrap/.test(ph), ph);
vrai('l\'en-tête perd son rembourrage de 18 px du haut (en !important : le gabarit l\'écrit ainsi)', !!ph && /padding-top:\s*\d+px\s*!important/.test(ph), ph);
const row = regle(F + ' .page-head > .ph-row'), pre = regle(F + ' .page-head > .ph-back');
vrai('le retour ne prend plus de rangée à lui seul (flex:0 0 auto, sans marge)', !!pre && /flex:\s*0 0 auto/.test(pre) && /margin:\s*0\s*!important/.test(pre), pre);
vrai('titre et actions partagent la rangée, les actions repassent dessous si elles ne tiennent pas', !!row && /flex:\s*1 1 \d+px/.test(row) && !/nowrap/.test(row), row);
const act = regle(F + ' .ph-actions');
vrai('les actions ne prennent plus toute la largeur (flex:0 1 auto!important : le gabarit écrit 1 1 100%)', !!act && /flex:\s*0 1 auto\s*!important/.test(act), act);
const tb = regle(F + ' .topbar');
vrai('la barre du haut perd son plancher de 58 px (en !important)', !!tb && /min-height:\s*4\d+px\s*!important/.test(tb) && /padding-bottom:\s*\d+px\s*!important/.test(tb), tb);
vrai('la barre du haut garde la zone sûre de l\'encoche (env(safe-area-inset-top))', !!tb && /env\(safe-area-inset-top\)/.test(tb), tb);

console.log('— rien ne touche à la navigation ni aux cibles tactiles —');
vrai('aucune règle du bloc ne touche au menu latéral (#sidebar, .sidebar, .rf-tabs, #tabbar)', !/sidebar|rf-tabs|tabbar/.test(bloc));
vrai('aucune règle du bloc ne réduit la hauteur des boutons (min-height des actions ou du retour)', !/\.ph-actions \.btn[^{]*\{[^}]*min-height/.test(bloc) && !/ph-back[^{]*\{[^}]*min-height/.test(bloc));
vrai('pas de container-type, pas de :has() qui lit [style…] (test-823)', !/container-type/.test(bloc) && !/:has\([^)]*\[style/.test(bloc));
vrai('aucune variable CSS reprise par elle-même (cycle)', !/--([\w-]+)\s*:\s*var\(--\1\)/.test(bloc));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
