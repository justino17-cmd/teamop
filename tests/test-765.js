/* ══ v724 — L'AUDIT TOTAL : CHAQUE CATÉGORIE, CHAQUE BOUTON ═════════════════════════════
   Justin, 22 septembre 2026 : « tu vas tout me vérifier un par un, bouton par bouton,
   catégorie par catégorie. Je veux plus qu'il y ait de problème. »

   `scratchpad/audit-total.js` parcourt les 42 rubriques × 2 thèmes × 2 plateformes et mesure
   QUATRE choses sur chaque élément cliquable : hors de l'écran, recouvert, libellé tronqué,
   cible trop petite. Ce fichier-ci garde ce qui se garde sans navigateur.

   ⛔⛔ TROIS VERSIONS DU CONTRÔLE « RECOUVERT » ONT ÉTÉ FAUSSES AVANT LA BONNE, et c'est la
   leçon qui compte : mesurer « qui est sous une barre FIXE » à une position de défilement
   donnée ne prouve RIEN — une barre fixe couvre par construction ce qui passe dessous.
   · version 1, mesurée en haut de page : 14 faux défauts (tout ce qui passait sous la barre
     d'onglets) ;
   · version 2, mesurée tout en bas : 10 autres faux (sous la barre du HAUT, cette fois) ;
   · version 3, la bonne : on amène chaque candidat au MILIEU de l'écran et on reregarde.
     S'il est encore couvert là, il l'est pour de bon. Résultat : **0**.
   ⚠️ Et deux familles de faux positifs pesaient 3 900 des 4 016 « hors de l'écran » :
   le TIROIR FERMÉ (la barre latérale vit à x −252 quand elle est repliée) et ce qui DÉFILE
   latéralement par dessein (grille du planning, frise du tableau de bord). Un faux défaut
   coûte deux fois : le temps de le « corriger », puis celui de la garde inutile.           */
const fs=require('fs'); const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
const T=NU.replace(/\s*\n\s*/g,'');

console.log('\n══ 0. LA POPULATION EXISTE ══\n');
vrai('le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(NU));
const i0=T.indexOf('@media (pointer:coarse){');
vrai('le bloc tactile est trouvé', i0>0);

console.log('\n══ 1. ⛔ LE PLANCHER TACTILE ATTEINT CE QUI A ÉTÉ ÉCRIT AVANT LA REFONTE ══\n');
/* Audit : 242 cibles sous 38 px, toutes sur les écrans dont les commandes sont écrites EN
   STYLE DIRECT — la période de Consommation (19 px), les segments de Bons (34), les filtres
   de Mouvements (37), la barre du planning (26 à 36). Le plancher ne les avait jamais vues. */
vrai('⛔ tout bouton de contenu SANS plancher propre en reçoit un',
  /#content button:not\(\.btn\):not\(\.chip\):not\(\.tab\):not\(\.pf-b\)/.test(T));
/* ⚠️ On compare des CHAÎNES, pas des expressions régulières échappées à la main : la
   première version de ce contrôle échouait sur son propre échappement, pas sur le code. */
['.plg-pl .seg span','.pf-seg2 span','.pf-vues span','.pf-disp button',
 '.filters[style*="padding:3px"] > div','.pf-zoom span','.pf-nav u','.pf-nav .auj'].forEach(s=>
  vrai(`… et « ${s} » aussi`, T.includes('html[data-refonte] '+s)));
vrai('⛔ le retour d’en-tête monte à 44 px (il était à 32 sur 41 catégories)',
  /html\[data-refonte\] \.btn\.ghost\.ph-back,html\[data-refonte\] \.ph-back\{min-height:44px\}/.test(T));
/* ⛔ ET SA RÈGLE DOIT VENIR APRÈS CELLE QUI POSE 32 : à spécificité égale, c'est la dernière
   qui gagne. Un banc qui ne vérifie que la présence accepterait une règle sans effet. */
vrai('⛔ … et cette règle vient APRÈS celle qui pose 32 px',
  T.indexOf('ph-back{min-height:44px}') > T.indexOf('min-height:32px'));

console.log('\n══ 2. ⚠️ CE QUI EST ÉCARTÉ L’EST VOLONTAIREMENT, ET C’EST NOMMÉ ══\n');
/* Même mécanisme que « vu et pas surveillé » de test-726 : une exception tacite devient un
   oubli en une semaine. Les cases d'une grille ne sont pas des boutons — les élargir ferait
   tenir trois jours de moins sur un écran. */
const EXCLUS=['.pg-pt','.tdb-pc','.tdb-cel','.plm-card'];
EXCLUS.forEach(c=>vrai(`« ${c} » est nommément écarté du plancher`,
  new RegExp('#content \\'+c.replace('.','.')+'\\{min-height:0\\}|#content \\'+c.replace('.','.')+',').test(T.replace(/\s/g,''))
  || T.includes('#content '+c)));
vrai('⛔ … et l’exclusion est EXPLIQUÉE dans le code (pas une valeur muette)',
  /ne sont pas des boutons/.test(APP));

console.log('\n══ 3. ⛔ UN LIBELLÉ TRONQUÉ RESTE ATTEIGNABLE ══\n');
/* 212 troncatures mesurées, toutes dans des cases de calendrier. C'est la densité voulue —
   mais `.plm-card` était la SEULE à ne porter aucune infobulle : le mot coupé ne se
   retrouvait nulle part sans ouvrir la fiche. */
vrai('⛔ la carte du planning porte son libellé entier en infobulle',
  /class="plm-card\$\{[^`]*?title="\$\{esc\(/.test(APP.replace(/\s*\n\s*/g,' ')));
/* ⚠️ On nomme les DEUX voisines mesurées, plutôt que de compter des infobulles au hasard
   dans tout le fichier : un compteur global aurait passé au vert sur des titres sans rapport. */
{ const bloc=APP.replace(/\s*\n\s*/g,' ');
  vrai('… la case du planning général en portait déjà une',
    /class="pg-pt[^"]*"[^>]*title=|title="[^"]*"[^>]*class="pg-pt/.test(bloc));
  vrai('… et la case de la frise du tableau de bord aussi',
    /class="tdb-pc[^"]*"[^>]*title=|title="[^"]*"[^>]*class="tdb-pc/.test(bloc)); }

console.log('\n══ 4. LES TROIS DERNIÈRES COMMANDES RELEVÉES ══\n');
vrai('⛔ l’en-tête de jour de la frise (32,4 px) prend le plancher', /#content \.tdb-jh\{min-height:38px\}/.test(T));
vrai('⛔ le « 100 % » du zoom (16,2 px) aussi', /\.pf-zoom b\{min-height:38px/.test(T));
vrai('⛔ l’icône 📅 d’une ligne d’intervention a reçu une CLASSE plutôt qu’un sélecteur nu',
  /class="ic-act"/.test(APP) && /\.ic-act\{min-height:38px;min-width:38px/.test(T));

console.log('\n══ 5. LA MESURE QUI GARDE LE RESTE EXISTE ══\n');
const P=__dirname+'/../scratchpad/audit-total.js';
vrai('scratchpad/audit-total.js existe', fs.existsSync(P));
const S=fs.existsSync(P)?fs.readFileSync(P,'utf8'):'';
['hors','couverts','tronques','petits'].forEach(f=>vrai(`… il mesure la famille « ${f} »`, new RegExp(f+':').test(S)));
vrai('⛔ … il confirme un recouvrement en CENTRANT l’élément (les deux autres façons étaient fausses)',
  /scrollIntoView\(\{block:'center'\}\)/.test(S));
vrai('⛔ … il écarte le tiroir fermé et ce qui défile (3 900 faux positifs)',
  /dansTiroirFerme/.test(S) && /dansRouleau/.test(S));
vrai('… il remplit la base avant de mesurer (un écran vide ne montre aucun défaut)', /betaRemplir/.test(S));
vrai('… et il ne confirme RIEN pendant l’audit (confirm rend NON)', /window\.confirm=\(\)=>false/.test(S));
vrai('… sur la BÊTA, jamais sur app.html', !/'app\.html'/.test(S));

console.log(`\n════ test-765 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko?1:0);
