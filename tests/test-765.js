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
/* ⛔ ON BORNE AU BLOC TACTILE. Mesuré par mutation : retirer « .pf-disp button » du
   plancher ne faisait tomber AUCUN contrôle — la même chaîne vit dans la règle de dessin
   du segmenté, 600 lignes plus haut, où elle pose 30 px. Un banc qui cherche une chaîne
   dans TOUT le fichier trouve la mauvaise occurrence et passe au vert sur un plancher
   disparu. C'est la règle du dépôt — viser du CODE à l'endroit où il agit. */
const BLOC=(()=>{ const d=T.indexOf('@media (pointer:coarse){'); if(d<0) return '';
  let n=0,i=d+23; for(; i<T.length; i++){ if(T[i]==='{') n++; else if(T[i]==='}'){ n--; if(!n) break; } }
  return T.slice(d,i); })();
vrai('population : le bloc tactile est borné des deux côtés', BLOC.length>400);
/* ⚠️ `.plg-pl .seg` est devenu `.seg` en v725 : le segment est un composant, pas un
   morceau de la barre du planning — Pointage en met un, avec des <button>. */
 ['.seg span','.pf-seg2 span','.pf-vues span','.pf-disp button',
 '.filters[style*="padding:3px"] > div','.pf-zoom span','.pf-nav u','.pf-nav .auj'].forEach(s=>
  vrai(`… et « ${s} » aussi`, BLOC.includes('html[data-refonte] '+s)));
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
/* ⚠ Depuis le thème final (24 septembre 2026), la ligne d'intervention est une rangée de la
   maquette : l'ancienne icône en style direct (`.ic-act`) est devenue un BOUTON rond (`.tf-act`),
   nommé « Voir au planning », de 40 px — au-dessus du plancher. On garde la règle, sur la pièce neuve. */
vrai('⛔ l’icône 📅 d’une ligne d’intervention est un vrai bouton, au-dessus du plancher',
  /<button class="tf-act tf-large"[^>]*aria-label="Voir au planning">/.test(APP) && /\.tf-act\{flex:0 0 40px;width:40px;height:40px/.test(T));

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

/* ⛔ LA CROIX DES PANNEAUX DU TABLEAU DE BORD (.dp-hd .x) — 28 × 28 px au doigt, trouvée le
   22 septembre 2026 par l'audit des écrans PROFONDS (scratchpad/audit-profond.js) : l'audit
   des rubriques ne la voyait pas, elle ne vit que dans un panneau qui s'ouvre. Elle ne se
   redessine pas : elle rejoint la croix des fenêtres, dans les MÊMES règles. */
{ /* ⛔ T n'a plus de retours à la ligne : on découpe chaque bloc par compteur d'accolades
     (la première version cherchait la fin sur un « \n} » et rendait une tranche VIDE —
     le compteur de population l'a attrapée) */
  const blocs=[]; let i=0;
  while((i=T.indexOf('@media (pointer:coarse){',i))>=0){ let p=1, j=T.indexOf('{',i)+1;
    while(j<T.length&&p>0){ if(T[j]==='{')p++; else if(T[j]==='}')p--; j++; } blocs.push(T.slice(i,j)); i=j; }
  const tactile=blocs.join('\n');
  vrai('population : les blocs tactiles sont relus', tactile.length>1000, tactile.length+' caractères');
  vrai('⛔ au doigt, la croix des panneaux prend les 44 px de la croix des fenêtres',
    /html\[data-refonte\] \.modal-close,html\[data-refonte\] \.dp-hd \.x\{width:44px;height:44px\}/.test(tactile));
  vrai('⛔ à la souris, elle prend ses 38 px', /\.modal-close,html\[data-refonte\] \.dp-hd \.x\{width:38px;height:38px\}/.test(T));
  vrai('⛔ et sa forme : ronde, teintée, comme sa jumelle', /\.bell,\.menu-btn,\.modal-close,\.dp-hd \.x\{background:var\(--tint-gris\)!important/.test(T)); }

console.log(`\n════ test-765 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko?1:0);
