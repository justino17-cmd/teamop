/* ══ v720 — UN `backdrop-filter` SANS SURFACE N'EST PAS UNE VITRE, C'EST UNE LOUPE ═══════
   Justin, 22 septembre 2026, capture à l'appui : « pourquoi y a ce truc d'affichage là qui
   fait hyper brillant et que ça casse les écritures, ça fait mal fini. »

   Mesuré au navigateur sur 57 057 éléments visibles (42 rubriques × 2 thèmes × 2
   plateformes) : **112 éléments** portaient un `backdrop-filter` sur un fond ENTIÈREMENT
   transparent. Ils ne montraient donc aucune surface — ils montraient le décor d'à côté,
   flou et sursaturé, et le texte flottait dessus.

   ⛔ LE MÉCANISME, ET C'EST LUI QU'IL FAUT GARDER : une règle plus spécifique retire le
   `background` posé par la règle du verre, mais **elle ne retire pas le `backdrop-filter`**,
   qui n'est déclaré que dans la règle du verre. Une moitié de règle survit à l'autre.
   Deux endroits, deux fois le même chemin :
   · `.filters.seg-on .chip{background:none!important}` contre `[data-verre] .chip` — 100 cas
   · `input[placeholder^="Rechercher"]{background:transparent!important}` contre
     `[data-verre] input.search-inp` — 12 cas, dans Courrier et Bons

   ⚠️ CE BANC NE PEUT PAS TOUT VOIR, ET IL FAUT LE SAVOIR. Deux règles qui se croisent par
   un ATTRIBUT (le cas du champ de recherche) ne sont pas appariables par le texte : c'est
   `scratchpad/sonde-verre.js` qui le mesure, au navigateur, sur les pixels peints. Ce
   fichier garde ce qui est gardable sans navigateur : les trois compagnons `none`, et
   l'appariement par CLASSE — celui des 100 cas.                                           */
const fs=require('fs'); const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);

/* ⛔ On vise du CODE, sur un texte dont les commentaires de bloc en début de ligne sont
   retirés — le nettoyage SÛR, celui qui ne mange pas `saveVehicule`. Ce dépôt nomme ses
   règles dans les commentaires qui les expliquent : un motif qui tombe dedans garde une
   phrase, pas un comportement. */
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');

console.log('\n══ 0. LA POPULATION EXISTE ══\n');
vrai('le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(NU));
const CSS=(()=>{ const out=[]; const re=/<style[^>]*>([\s\S]*?)<\/style>/g; let m;
  while((m=re.exec(NU))) out.push(m[1]); return out.join('\n'); })();
vrai('les blocs <style> sont extraits', CSS.length > 100000);

/* ── on découpe le CSS en règles { sélecteur, corps } ── */
const REGLES=(()=>{ const out=[]; const re=/([^{}@]+)\{([^{}]*)\}/g; let m;
  while((m=re.exec(CSS))){ const sel=m[1].trim(), corps=m[2];
    if(!sel||sel.startsWith('/*')) continue; out.push({sel,corps}); } return out; })();
v('règles CSS découpées', REGLES.length > 2000, true);

/* la partie utile d'un sélecteur : ce qui suit le DERNIER combinateur */
const cle=s=>{ const t=s.trim().split(/\s*[>+~]\s*|\s+/); return t[t.length-1]||''; };
const classes=k=>(k.match(/\.[A-Za-z0-9_-]+/g)||[]).sort();
const contient=(a,b)=>b.every(x=>a.includes(x));   /* a ⊇ b */

console.log('\n══ 1. LES SURFACES QUI PORTENT UN FLOU, ET CELLES QU’ON EFFACE ══\n');
const FILTRE=[], EFFACE=[], ANNULE=[];
REGLES.forEach(r=>{
  r.sel.split(',').map(s=>s.trim()).filter(Boolean).forEach(s=>{
    if(/backdrop-filter\s*:\s*blur/.test(r.corps)) FILTRE.push(s);
    if(/backdrop-filter\s*:\s*none/.test(r.corps)) ANNULE.push(s);
    if(/background(?:-color|-image)?\s*:\s*(none|transparent)\s*!important/.test(r.corps)) EFFACE.push(s);
  });
});
console.log('  sélecteurs qui posent un flou          : '+FILTRE.length);
console.log('  sélecteurs qui EFFACENT le fond (!important) : '+EFFACE.length);
console.log('  sélecteurs qui annulent le flou        : '+ANNULE.length);
vrai('population : il y a bien des règles de flou', FILTRE.length > 5);
vrai('population : il y a bien des règles qui effacent un fond', EFFACE.length > 3);

console.log('\n══ 2. ⛔ AUCUN EFFACEMENT NE LAISSE UN FLOU DERRIÈRE LUI (appariement par CLASSE) ══\n');
/* Un effacement E menace un flou F quand la clé de E est un RAFFINEMENT de celle de F :
   mêmes classes, plus d'autres. C'est exactement `.filters.seg-on .chip` contre `.chip`. */
const orphelins=[];
let paires=0;
FILTRE.forEach(f=>{ const kf=classes(cle(f)); if(!kf.length) return;
  EFFACE.forEach(e=>{ const ke=classes(cle(e)); if(!ke.length) return;
    if(!contient(ke,kf)) return;                    /* E ne touche pas les éléments de F */
    paires++;
    const couvert=ANNULE.some(a=>{ const ka=classes(cle(a)); return contient(ke,ka)&&ka.length; });
    if(!couvert) orphelins.push({flou:f.slice(0,54),efface:e.slice(0,54)}); }); });
console.log('  population : '+paires+' couples (flou, effacement) examinés');
vrai('population : au moins un couple existe — sinon ce contrôle passerait sur du vide', paires>0);
v('⛔ aucun effacement de fond ne laisse un backdrop-filter orphelin',
  orphelins.map(o=>o.efface+'  ⟵  '+o.flou), []);

console.log('\n══ 3. LES TROIS COMPAGNONS, NOMMÉS UN PAR UN ══\n');
vrai('⛔ la pastille d’un segmenté n’a plus de flou',
  /html\[data-verre="1"\] \.filters\.seg-on \.chip\{[^}]*backdrop-filter:none!important/.test(NU.replace(/\s*\n\s*/g,'')));
vrai('⛔ le champ de recherche NICHÉ dans une pilule n’a plus de flou',
  /\.rech-pilule input\.search-inp[^{]*\{[^}]*backdrop-filter:none!important/.test(NU.replace(/\s*\n\s*/g,'')));
/* ⛔ UNE VITRE SE GARDE PAR SES DEUX MOITIÉS. Mesuré par mutation le 22 septembre 2026 :
   retirer le `background` de la pilule de recherche en lui LAISSANT son flou ne faisait
   tomber AUCUN contrôle — le banc n'exigeait que le flou. C'est pourtant exactement le
   défaut que ce fichier existe pour garder, vu par l'autre bout. On exige donc la surface
   ET le flou, dans la MÊME règle, partout où une vitre est censée vivre. */
const vitre=(nom,sel)=>{ const t=NU.replace(/\s*\n\s*/g,'');
  const m=t.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}'));
  vrai(nom+' : la règle existe', !!m);
  if(!m) return;
  vrai(nom+' : elle pose une SURFACE', /background(?:-color|-image)?:(?!\s*(?:none|transparent))/.test(m[1]));
  vrai(nom+' : … et le flou qui va avec', /backdrop-filter:blur/.test(m[1])); };
/* ⚠️ LA GARDE FAIT PARTIE DU SÉLECTEUR DEPUIS LE 22 SEPTEMBRE 2026 (v725) : sans elle,
   `div:has(> input…)` attrapait `#content` lui-même et peignait toute la zone de contenu
   en pilule de 999 px. Voir test-767. Le banc suit le sélecteur RÉEL, il ne garde pas
   l'ancien. */
vitre('la pilule de recherche', 'html[data-verre="1"] div:has(> input[placeholder^="Rechercher"]):not(:has(> :not(input):not(svg):not(button):not(label)))');
vitre('le curseur du segmenté (c’est LUI la vitre du groupe)', 'html[data-verre="1"] .filters.seg-on .seg-cur');
vitre('une pastille LIBRE (elle a une surface, elle)', 'html[data-verre="1"] .chip');
vrai('… et c’est bien le reflet du document de thème, pas une valeur inventée',
  /html\[data-verre="1"\] \.chip\{[^}]*background:var\(--vr-reflet\),var\(--vr-fond2\)!important/.test(NU.replace(/\s*\n\s*/g,'')));

console.log('\n══ 4. ⛔ UNE SEULE MARQUE POUR L\'ONGLET ACTIF ══\n');
/* Le soulignement de 2,5 px (`html[data-refonte] .tab::after`) est dessiné pour une bande
   d'onglets EN HAUT : coin arrondi en haut, plat en bas, posé à `bottom:-1px`, c'est-à-dire
   SUR l'arête de la bande. La barre du bas est une PILULE FLOTTANTE : le trait y tombe À
   L'INTÉRIEUR, en travers de la pastille qui désigne déjà l'onglet. Mesuré le 22 septembre
   2026 sur les DIX combinaisons téléphone : pastille ET trait, partout.
   ⚠️ Le commentaire du bloc verre disait déjà l'intention — l'onglet actif avait bien perdu
   son FOND, il avait gardé son TRAIT. Encore une moitié de règle qui survit à l'autre. */
{ const t=NU.replace(/\s*\n\s*/g,'');
  const m=t.match(/html\[data-refonte\] \.tabbar:has\(\.tab-cur\) \.tab\.on::after[^{]*\{([^}]*)\}/);
  vrai('⛔ la barre du bas éteint le soulignement', !!m);
  if(m){ vrai('… en opacité ET en échelle (l’un sans l’autre laisse un trait de 1 px)',
              /opacity:0!important/.test(m[1]) && /scaleX\(0\)!important/.test(m[1]));
         vrai('… et il coupe l’animation, qui repeindrait par-dessus', /animation:none!important/.test(m[1])); }
  /* ⛔ LA RÈGLE SE GARDE ELLE-MÊME : `:has(.tab-cur)`. Le jour où un profil n'aurait plus de
     pastille, le trait revient tout seul — on ne laisse jamais un onglet actif sans AUCUNE
     marque. Un banc qui ne vérifierait que « le trait est éteint » accepterait la version
     dangereuse. */
  vrai('⛔ la règle est conditionnée à la PRÉSENCE de la pastille (:has(.tab-cur))',
       /\.tabbar:has\(\.tab-cur\)/.test(t));
  /* ⛔ On ne devine pas avec une négation : on RAMASSE toutes les règles qui éteignent le
     trait d'un onglet actif, et on exige qu'elles soient TOUTES bornées à la barre du bas.
     Une négation mal écrite passe au vert sur n'importe quoi. */
  const eteint=REGLES.flatMap(r=>r.sel.split(',').map(s=>s.trim())
      .filter(s=>/\.tab\.(on|active)::after$/.test(s) && /opacity\s*:\s*0\b/.test(r.corps))
      .map(s=>s));
  v('population : au moins une règle éteint le trait', eteint.length>0, true);
  v('⛔ … et toutes sont bornées à .tabbar (les bandes du HAUT gardent leur trait)',
    eteint.filter(s=>!/\.tabbar/.test(s)), []);
  vrai('population : le trait existe toujours pour les bandes du haut',
       /html\[data-refonte\] \.tab::after\{[^}]*background:var\(--acc\)/.test(t)); }

console.log('\n══ 5. LA MESURE QUI GARDE LE RESTE EXISTE ══\n');
/* ⚠️ Le contrôle 2 n'apparie que par CLASSE : le cas du champ de recherche se croise par un
   ATTRIBUT et lui échappe. La preuve de bout en bout est au navigateur — on exige au moins
   que la sonde soit là, sinon la garde tient sur une phrase de commentaire. */
vrai('scratchpad/sonde-verre.js existe', fs.existsSync(__dirname+'/../scratchpad/sonde-verre.js'));
const SONDE=fs.existsSync(__dirname+'/../scratchpad/sonde-verre.js')?fs.readFileSync(__dirname+'/../scratchpad/sonde-verre.js','utf8'):'';
vrai('… et elle mesure bien le fond ET le filtre', /backdropFilter/.test(SONDE) && /backgroundColor/.test(SONDE));
vrai('… elle porte la CONTRE-ÉPREUVE du soulignement (sinon on supprimerait un marqueur)',
     /CONTRE-ÉPREUVE/.test(SONDE) && /tabs/.test(SONDE));
/* ⛔ UNE COULEUR CALCULÉE NE REVIENT PAS EN rgb() : `color(srgb 0.47 0.86 0.65)` lu comme
   du 0–255 donne du quasi-noir. Mesuré : « contraste 1,2 » sur une pastille lisible, et
   « 17,64 » sur une autre — faux dans les DEUX sens. La sonde doit reconnaître la FORME. */
vrai('⛔ … et elle lit les couleurs par leur FORME (color(srgb …) autant que rgb())',
     /lireCouleur/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

console.log(`\n════ test-763 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko?1:0);
