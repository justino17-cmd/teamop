/* 3077 — LA PAGE AGENTS NE REMONTE PLUS EN HAUT (Tour v2.113). Justin, 27 octobre 2026, Safari sur Mac : « dans la page des agents, quand je suis tout en bas,
   elle remonte d'un coup tout en haut ». Le Mac de Pauline envoie un relevé par minute ; seule l'HEURE de réception changeait, et toute la page se redessinait.
   Sous Safari, remplacer le contenu de #vue peut perdre la position.
   Deux gestes : une heure neuve sur le même relevé ne met à jour que la ligne d'état ; une relecture de l'onglet Agents rend la position (tout de suite, puis après la
   mise en page). Ouvrir l'onglet, lui, part du haut. Preuve au navigateur (Safari simulé : la page remise en haut après chaque remplacement) :
   `scratchpad/sonde-agents-saut.js` (PERTURBE=1) — v2.112 : 1691 → 0 à chaque relecture ; v2.113 : 1691 → 1691, et 0 rendu complet pour un relevé à l'heure seule.
   Ce banc lit le CODE de tour.html (commentaires retirés). */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? ' — ' + String(d).slice(0, 200) : '')); } };
const S = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
const corps = nom => { const i = S.indexOf('function ' + nom + '('); if (i < 0) return ''; const j = S.indexOf('\nfunction ', i + 10); return S.slice(i, j < 0 ? i + 6000 : j); };
console.log('\n── 3077 · la page Agents ne remonte plus en haut ──');
const CP = corps('chargerPauline'), RV = corps('renderVue'), ST = corps('setTab');
vrai('(population) chargerPauline, renderVue et setTab sont trouvées', CP.length > 200 && RV.length > 500 && ST.length > 200, [CP.length, RV.length, ST.length].join(','));
vrai('⛔ un relevé de Pauline dont seule l’heure change ne redessine pas : la signature est celle du RELEVÉ, pas de l’heure de réception', /var sig=JSON\.stringify\(d\.releve\|\|null\)/.test(CP) && !/JSON\.stringify\(\[d\.recuLe/.test(CP));
vrai('…un relevé qui arrive (ou disparaît) redessine quand même', /!PA\.d\.recuLe!==!d\.recuLe/.test(CP));
vrai('…et l’heure neuve se dit par la ligne d’état (paApres → paMajAge)', /paApres\(chg\)/.test(CP) && /function paApres\(change\)\{[^}]*paMajAge\(\)/.test(S));
const i0 = RV.indexOf("TAB==='agents'){"), ag = i0 < 0 ? '' : RV.slice(i0, RV.indexOf("TAB==='messagerie'", i0));
vrai('(population) la branche Agents de renderVue est trouvée', ag.length > 200, ag.length);
vrai('⛔ l’onglet Agents relevé sur place rend sa position, tout de suite puis après la mise en page', /y=window\.scrollY/.test(ag) && /meme=v\.getAttribute\('data-rendu'\)===cle/.test(ag) && /rendre\(\); if\(window\.requestAnimationFrame\) requestAnimationFrame\(rendre\)/.test(ag) && /window\.scrollTo\(0,y\)/.test(ag), ag.slice(0, 200));
vrai('…seulement si l’écran était déjà le même (même sous-onglet)', /cle='agents\/'\+AG\.sec/.test(ag) && /if\(meme&&y>0\)/.test(ag));
vrai('⛔ ouvrir un onglet efface la marque AVANT de dessiner (la page part du haut)', ST.indexOf("removeAttribute('data-rendu')") > 0 && ST.indexOf("removeAttribute('data-rendu')") < ST.indexOf('render()'));
vrai('…et un autre onglet efface la marque (revenir aux Agents n’est pas une relecture)', /if\(TAB!=='agents'\) v\.removeAttribute\('data-rendu'\)/.test(RV));
vrai('la version de la Tour est montée (v2.113) aux quatre endroits', (fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8').match(/v2\.113/g) || []).length >= 4);
console.log(`\ntest-3077 : ${ok} ✓ ${ko} ✗`);
process.exit(ko ? 1 : 0);
