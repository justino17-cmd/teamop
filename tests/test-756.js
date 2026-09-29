/* ══ REFONTE POINT 6 — LE SITE VITRINE ════════════════════════════════════════════════════
   Dossier de refonte : « deux palettes (Apple bleu, Marine), trois modes (Jour / Nuit / Auto),
   nav 48 px collante avec le sélecteur, hero → vitrine appareils → Deux applications → métiers
   → tarifs (bascule OP GESTION / OP MESSAGES) → Né sur le terrain → trois étapes → FAQ ».

   ⛔ CETTE PAGE NE REMPLACE RIEN. `index.html` et `tarifs.html` sont la porte d'entrée de
   teamop.fr. La règle du dépôt est qu'aucune page utilisée par des clients ne change sans que
   Justin l'ait vue : la refonte vit donc dans `apercu/`, qui se commite seul sur `main` sans
   toucher un seul point d'entrée. Ce banc garde AUSSI cette frontière — si `index.html` se met
   à ressembler à l'aperçu sans qu'on l'ait décidé, il le dit.

   Trois choses que la mesure a corrigées :
   1. ⛔ LES TARIFS SONT CEUX DE `tarifs.html`, pas des chiffres réinventés. Un prix faux sur
      la page d'accueil est un engagement commercial faux.
   2. ⛔ LE DOIGT PASSE AVANT LA MAQUETTE. Le dossier demande une nav de 48 px ET des cibles
      ≥ 44 px : les deux ne tiennent pas ensemble. Mesuré : 28 px, soit 16 px sous le plancher.
      48 px là où il y a un pointeur, une barre plus haute là où il y a un doigt.
   3. ⛔ « AUTO » N'EST PAS DU JAVASCRIPT — c'est l'ABSENCE de choix, donc une requête média.
      Si le script ne tourne pas, la page suit quand même le système.                        */
const fs=require('fs');
const S=fs.readFileSync(__dirname+'/../apercu/site-apple.html','utf8');
const IDX=fs.readFileSync(__dirname+'/../index.html','utf8');
const TAR=fs.readFileSync(__dirname+'/../tarifs.html','utf8');
const APPH=fs.readFileSync(__dirname+'/../app.html','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);
/* ⛔ CSS/HTML NU : ce fichier commente au-dessus de ses règles comme le reste du dépôt. */
const NU=S.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/<!--[\s\S]*?-->/g,' ');

console.log('\n══ 1. ⛔ LA FRONTIÈRE : L\'APERÇU NE REMPLACE RIEN ══\n');
vrai('l\'aperçu existe', S.length>8000);
vrai('⛔ il porte un ruban qui le dit', /class="ruban"[^>]*>[^<]*rien n.est publi/i.test(S));
vrai('⛔ … et il le redit dans son pied de page', /ne remplace aucune page du site/.test(S));
v('⛔⛔ `index.html` n\'a PAS été touché par la refonte (aucun jeton de l\'aperçu)',
  /data-palette|site-apple|--sombre-tuile/.test(IDX), false);
vrai('… et il existe toujours', IDX.length>10000);

console.log('\n══ 2. DEUX PALETTES, TROIS MODES ══\n');
['apple','marine'].forEach(p=>{
  vrai('la palette « '+p+' » est déclarée en JOUR', new RegExp('html\\[data-palette="'+p+'"\\]\\{').test(NU));
  vrai('   … et en NUIT', new RegExp('html\\[data-palette="'+p+'"\\]\\[data-mode="dark"\\]\\{').test(NU));
  vrai('   … et en AUTO, par requête média', new RegExp('html\\[data-palette="'+p+'"\\]\\[data-mode="auto"\\]').test(NU));
});
vrai('⛔⛔ LA NUIT MARINE EST MARINE, JAMAIS NOIR PUR (le noir absolu fait baver le blanc sur OLED)',
  /html\[data-palette="marine"\]\[data-mode="dark"\]\{[\s\S]{0,60}--fond:#0b1426/.test(NU));
vrai('⛔ … et la nuit Apple est bien noire, c\'est SA charte',
  /html\[data-palette="apple"\]\[data-mode="dark"\]\{[\s\S]{0,60}--fond:#000/.test(NU));
vrai('⛔ les boutons Marine s\'inversent la nuit (clair sur marine)',
  /html\[data-palette="marine"\]\[data-mode="dark"\]\{[\s\S]{0,400}--btn:#f0f3f8/.test(NU));
vrai('⛔⛔ « AUTO » EST UNE REQUÊTE MÉDIA, pas un écouteur : sans JavaScript, la page suit quand même le système',
  /@media \(prefers-color-scheme: dark\)\{[\s\S]{0,500}data-mode="auto"/.test(NU));
vrai('le sélecteur fait 150 px, comme la maquette', /\.seg\{[\s\S]{0,200}width:150px/.test(NU));
vrai('… avec un curseur animé', /\.seg \.cur\{[\s\S]{0,260}transition:transform \.4s/.test(NU));

console.log('\n══ 3. ⛔ LES TARIFS SONT CEUX DU SITE, PAS DES CHIFFRES RÉINVENTÉS ══\n');
{ /* Les formules de la maquette se relisent contre la SOURCE de `tarifs.html` — le générateur du site
     (FORMULES_GESTION, FORMULES_MESSAGES) — : mêmes formules, même ordre, mêmes prix. Un prix faux sur une
     page servie est un engagement commercial faux. Jusqu'au 29 septembre 2026 ce bloc comparait une liste de
     noms RECOPIÉE ici (« Gratuit » compris) : le jour où Justin a retiré la formule gratuite du site
     (« je veux que l'application soit payante directement »), la maquette la montrait encore à 0 € — c'est
     cette liste recopiée qui l'a vu, par chance, parce que tarifs.html ne la portait plus. Un banc qui relit
     la source garde un accord ; un banc qui recopie garde une croyance (CLAUDE.md). */
  const GEN=require('../scripts/site-marine.js');
  const i=S.indexOf('var TARIFS='), j=S.indexOf('function rendPrix');
  let T=null;
  try{ T=new Function('return '+S.slice(i+'var TARIFS='.length, S.lastIndexOf('};',j)+1))(); }catch(e){}
  vrai('(population) les formules de la maquette se lisent dans son CODE (var TARIFS)',
    T && T.gestion && T.gestion.length>=3 && T.messages && T.messages.length>=3);
  const maq=l=>(l||[]).map(f=>f.n+' · '+f.p), gen=l=>l.map(f=>f.nom+' · '+f.prix+' €');
  vrai('(population) le générateur du site porte ses formules', GEN.FORMULES_GESTION.length>=3 && GEN.FORMULES_MESSAGES.length>=3);
  v('⛔ OP GESTION : les formules et les prix du site, dans le même ordre', maq(T&&T.gestion), gen(GEN.FORMULES_GESTION));
  v('⛔ OP MESSAGES : les formules et les prix du site, dans le même ordre', maq(T&&T.messages), gen(GEN.FORMULES_MESSAGES));
  v('⛔⛔ plus de formule « Gratuit » pour OP GESTION — ni dans la maquette, ni dans tarifs.html (Justin, 29 septembre 2026)',
    [/n:\s*'Gratuit'|Tout le Gratuit/.test(NU), TAR.indexOf('>Gratuit</')>0], [false, false]);
  v('⛔ plus de badge « Le plus choisi » (retiré du site le même soir)', /plus choisi/i.test(NU), false);
  const noms=[].concat(T?T.gestion:[], T?T.messages:[]).map(f=>f.n);
  v('   … et chaque formule existe vraiment dans tarifs.html (le fichier servi)', noms.filter(n=>TAR.indexOf('>'+n+'</')<0), []);
  v('⛔ AUCUN prix inventé : tout prix de l\'aperçu existe dans tarifs.html',
    [...S.matchAll(/p:'(\d+) €'/g)].map(m=>m[1]).filter(x=>TAR.indexOf('<b>'+x+'</b>')<0), []);
  vrai('   (population) le motif des prix reconnaît ce qu\'il cherche', [...S.matchAll(/p:'(\d+) €'/g)].length===noms.length);
  vrai('⛔ les formules d\'OP MESSAGES disent qu\'elles ne se prennent pas encore (la note du site, sous les cartes)',
    /id="note-msg"[^>]*>OP MESSAGES change d'infrastructure/.test(NU) && /note-msg'\)\.hidden=\(k!=='messages'\)/.test(NU));
}

console.log('\n══ 3 bis. ⛔ LA MAQUETTE NE PROMET RIEN QUE LE SITE REFUSE ══\n');
{ /* Elle est servie à qui connaît l'adresse (teamop.fr/apercu/site-apple.html) : ce qu'elle promet, un client
     peut le lire. La liste des promesses refusées est celle du site, lue dans `test-846` — pas une copie. */
  const T846=fs.readFileSync(__dirname+'/test-846.js','utf8');
  const a=T846.indexOf('const FAUX = ['), b=T846.indexOf('];',a);
  let FAUX=[];
  try{ FAUX=new Function('return '+T846.slice(a+'const FAUX = '.length, b+1))(); }catch(e){}
  vrai('(population) la liste des promesses refusées est lue dans test-846 ('+FAUX.length+' motifs)',
    FAUX.length>=40 && FAUX.every(x=>x[0] instanceof RegExp) && FAUX.some(x=>x[0].test('Deux applications. Un seul compte.')));
  v('⛔ aucune ne se trouve dans la maquette', FAUX.filter(([re])=>re.test(NU)).map(([,nom])=>nom), []);
  v('⛔ « temps réel » réservé à OP MESSAGES — un seul emploi, dans sa carte (comme sur le site)',
    [...NU.matchAll(/temps réel|instantané/gi)].map(m=>NU.slice(m.index-20,m.index)), ['versation : chat en ']);
  v('⛔ les métiers présentés comme prêts sont les six packs de l\'application (METIERS_ORDRE)',
    [...S.matchAll(/<div class="carte"><h3>([^<]+)<\/h3>/g)].map(m=>m[1]).filter(n=>!/^(Bientôt|Autre)$/.test(n)).length,
    (APPH.match(/const METIERS_ORDRE=\[([^\]]*)\]/)||['',''])[1].split(',').filter(Boolean).length);
  v('   … sous leurs noms', [...S.matchAll(/<div class="carte"><h3>([^<]+)<\/h3>/g)].map(m=>m[1]),
    ['3D','Plomberie','Électricité','Chauffage · Clim','Serrurerie','Nettoyage','Bientôt','Autre']);
  v('⛔ un impayé ne « revient » à aucun forfait gratuit (il n\'y en a plus sur le site)', /forfait gratuit/i.test(NU), false);
}

console.log('\n══ 4. LE DOIGT, ET LA STRUCTURE ══\n');
vrai('⛔⛔ LE PLANCHER TACTILE EST POSÉ, et par DEUX portes (le type de pointeur ne s\'émule pas toujours)',
  /@media \(pointer: coarse\), \(max-width: 900px\)\{/.test(NU));
vrai('   … et il monte bien les segments à 44 px', /\.seg button\{min-height:44px/.test(NU));
vrai('⛔ la pastille de palette agrandit sa ZONE de tap, pas son rond',
  /\.pal button::after\{[\s\S]{0,140}width:44px;height:44px/.test(NU));
vrai('les boutons principaux font 44 px', /\.b\{[\s\S]{0,180}min-height:44px/.test(NU));
['hero','apps','metiers','tarifs','faq'].forEach(id=>
  vrai('   la section « '+id+' » existe', new RegExp('id="'+id+'"').test(S)));
vrai('la FAQ est un accordéon dont le + tourne de 45°', /details\[open\] summary::after\{transform:rotate\(45deg\)\}/.test(NU));
vrai('⛔ le mouvement réduit coupe les glissements', /prefers-reduced-motion: reduce/.test(NU));
vrai('⛔ la transparence réduite rend la nav opaque', /prefers-reduced-transparency: reduce/.test(NU));
vrai('⛔ un contraste renforcé cerne les cartes', /prefers-contrast: more/.test(NU));

console.log('\n═══ test-756 : '+ok+' ✓ '+ko+' ✗ ═══\n');
process.exit(ko?1:0);
