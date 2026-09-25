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
{ /* Les noms et les prix doivent exister DANS `tarifs.html` — sinon la page d'accueil
     annoncerait un engagement commercial que le site ne tient pas. */
  const noms=['Gratuit','Pro','Business','Business Premium','Perso','Messages Pro','Messages Business Premium'];
  noms.forEach(n=>{
    vrai('   « '+n+' » est dans l\'aperçu', S.indexOf("n:'"+n+"'")>0 || S.indexOf('n:"'+n+'"')>0);
    vrai('   … et existe vraiment dans tarifs.html', TAR.indexOf('>'+n+'</')>0);
  });
  [['0 €',2],['15 €',2],['25 €',2],['50 €',1]].forEach(([p])=>{
    vrai('   le prix '+p+' est dans l\'aperçu', S.indexOf("p:'"+p+"'")>0);
    vrai('   … et dans tarifs.html', TAR.indexOf(p)>0);
  });
  v('⛔ AUCUN prix inventé : tout prix de l\'aperçu existe dans tarifs.html',
    [...S.matchAll(/p:'(\d+) €'/g)].map(m=>m[1]).filter(x=>TAR.indexOf(x+' €')<0), []);
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
