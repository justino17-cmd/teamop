/* ══ v719 — LA CARTE NE DEMANDE PAS DEUX FOIS LE MÊME RÉGLAGE ═══════════════════════════
   Justin, 22 septembre 2026, capture de « Carte des box » à l'appui : « le mode jour et nuit
   de la carte c'est en fonction de l'appareil sélectionné dans les paramètres, je veux pas
   voir ces boutons ici, c'est automatique — si c'est en automatique donc la journée c'est
   jour, la nuit ça passe en mode nuit, et satellite reste. »

   Ce fichier fait tourner les VRAIES fonctions extraites d'app.html — jusqu'à `effectiveTheme`
   et `prefAppliquer`, pour que la chaîne entière soit jouée et pas seulement son bout visible.
   Quatre pièges sont gardés ici :

   1. L'ENFERMEMENT. La version d'avant rangeait 'm' ou 'n' dans `elan_carte`. Les pastilles
      Jour/Nuit qui permettaient d'en sortir n'existent plus : une préférence héritée DOIT
      valoir « pas satellite », sinon quelqu'un reste en nuit pour toujours, sans recours.
   2. LE RÉGLAGE QUI NE VOYAGE PAS. `prefAppliquer` ignore une valeur vide
      (`if(typeof v!=='string'||!v) return`). Éteindre le satellite en effaçant la clé ne
      serait donc JAMAIS parti sur les autres appareils : le banc fait le trajet en entier,
      d'un appareil à l'autre, plutôt que de croire une constante.
   3. LA BASCULE DE 18 H. En thème « auto », la nuit tombe côté système — `mapFond()` doit
      suivre `effectiveTheme()` SANS mémo, sinon le premier appel de la journée gèle la carte
      en jour jusqu'au prochain rechargement. C'est ce que faisait `_mapLayer`.
   4. LA ZONE MORTE TEMPORELLE. `mapNuitSync()` est appelée depuis `applyTheme()`, qui tourne
      aussi au démarrage : lire `_map`/`_planMap` (des `let`) y tomberait en zone morte, et le
      `try` d'en face avalerait l'erreur sans un mot. Le banc exige le passage par le DOM.

   ⚠️ Ce banc ne voit PAS les tuiles Google ni la teinte à l'écran : ça se mesure au
   navigateur (`scratchpad/sonde-carte.js`). Il garde l'AIGUILLAGE.                        */
const fs=require('fs'); const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);
const faux=(t,c)=>v(t,!!c,false);

/* Même découpe que test-749 : on borne à la déclaration suivante de premier niveau, puis on
   garde le PLUS LONG bloc qui compile. */
function decoupe(h){ const d=APP.indexOf(h); if(d<0) throw new Error('introuvable : '+h);
  const suite=/\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex=d+h.length;
  const m=suite.exec(APP); const fin=m?m.index:Math.min(APP.length,d+80000);
  let bout=APP.slice(d,fin);
  for(;;){ const k=Math.max(bout.lastIndexOf('}'),bout.lastIndexOf(';')); if(k<0) break;
    const t=bout.slice(0,k+1);
    try{ new Function(t); return t; }catch(e){ bout=bout.slice(0,k); } }
  throw new Error('fin introuvable : '+h); }

/* v747 : `prefAppliquer` et `getThemePref` lisent et rangent par `prefLocal`/`prefLocalLire` (la
   mémoire de repli d'un appareil plein, test-808) — fournies ici avec la chaîne. */
const CODE=['const _prefVue={};','function prefLocal(k,v){','function prefLocalLire(k){',
  'const PREF_CLES=','function prefEcrire(cle,val){','function prefAppliquer(u){',
  'function systemDark(){','function effectiveTheme(){','function getThemePref(){',
  'function mapSatOn(){','function mapFond(){','function mapFondBarre(){',
  'function setMapSat(on){','function mapNuitSync(){'].map(h=>decoupe(h)).join('\n');

/* Un appareil = un bac : son stockage, son système, ses volets de carte. Deux bacs séparés
   font le trajet d'un téléphone à l'autre (piège 2). */
function bac(nuitSysteme){
  const panes=[{cl:new Set()},{cl:new Set()}];
  const M=new Function('PANES','SYS_NUIT',`
    const LS={};
    let db={users:[]}; let currentUser=null; let current=''; const views={};
    const save=()=>{}; const applyTheme=()=>{}; const avatarAccentSync=()=>{}; const prefRangementPlein=()=>{};
    const localStorage={ getItem:k=>(k in LS?LS[k]:null), setItem:(k,x)=>{LS[k]=String(x);}, removeItem:k=>{delete LS[k];} };
    const window={ matchMedia:q=>({matches:!!SYS_NUIT}) };
    const document={ querySelectorAll:()=>PANES.map(p=>({classList:{toggle:(c,on)=>{ on?p.cl.add(c):p.cl.delete(c); }}})) };
    ${CODE}
    return { PREF_CLES, prefEcrire, prefAppliquer, effectiveTheme, mapSatOn, mapFond,
             mapFondBarre, setMapSat, mapNuitSync,
             connecter:u=>{ currentUser=u; db.users=[u]; },
             user:()=>currentUser, lire:k=>LS[k], ecrire:(k,x)=>{LS[k]=x;} };`)(panes,!!nuitSysteme);
  return { M, panes };
}

console.log('\n══ 1. LE JOUR ET LA NUIT VIENNENT DU THÈME, PAS DE LA CARTE ══\n');
{ const j=bac(false).M, n=bac(true).M;
  v('thème auto + système en jour → carte de jour', j.mapFond(), 'm');
  v('thème auto + système en nuit → carte de nuit', n.mapFond(), 'n');
  v('… et c\'est bien le thème effectif qui décide', [j.effectiveTheme(),n.effectiveTheme()], ['light','dark']);
  j.ecrire('elan_theme','dark'); v('thème forcé sombre sur un système clair → nuit', j.mapFond(), 'n');
  n.ecrire('elan_theme','light'); v('thème forcé clair sur un système sombre → jour', n.mapFond(), 'm');
}

console.log('\n══ 2. ⛔ LA BASCULE DE 18 H — aucun mémo ne fige la carte ══\n');
{ const b=bac(false);
  v('premier appel de la journée : jour', b.M.mapFond(), 'm');
  b.M.ecrire('elan_theme','dark');            /* la nuit tombe */
  v('⛔ le deuxième appel suit, il ne rejoue pas le premier', b.M.mapFond(), 'n');
  b.M.ecrire('elan_theme','light');
  v('… et il revient au jour', b.M.mapFond(), 'm');
}

console.log('\n══ 3. ⛔ L\'ENFERMEMENT — une préférence héritée ne verrouille rien ══\n');
{ for(const héritée of ['m','n']){
    const j=bac(false).M, n=bac(true).M;
    j.ecrire('elan_carte',héritée); n.ecrire('elan_carte',héritée);
    faux(`'${héritée}' hérité n'allume pas le satellite`, j.mapSatOn());
    v(`'${héritée}' hérité, système en jour → jour`, j.mapFond(), 'm');
    v(`'${héritée}' hérité, système en nuit → nuit`, n.mapFond(), 'n');
  }
  const s=bac(false).M; s.ecrire('elan_carte','s');
  vrai('seul \'s\' allume le satellite', s.mapSatOn());
  v('… et le satellite ne dépend pas du thème', s.mapFond(), 's');
}

console.log('\n══ 4. LA BARRE : UNE SEULE PASTILLE, ET C\'EST LE SATELLITE ══\n');
{ const b=bac(true).M;
  const html=b.mapFondBarre();
  v('une seule pastille rendue', (html.match(/class="chip/g)||[]).length, 1);
  vrai('elle dit « Satellite »', /Satellite</.test(html));
  faux('⛔ plus aucune pastille « Jour »', />[^<]*\bJour\b/.test(html));
  faux('⛔ plus aucune pastille « Nuit »', />[^<]*\bNuit\b/.test(html));
  faux('éteinte tant que le satellite n\'est pas choisi', /chip active/.test(html));
  b.ecrire('elan_carte','s');
  vrai('allumée quand il l\'est', /chip active/.test(b.mapFondBarre()));
  vrai('et elle propose d\'en sortir', /setMapSat\(false\)/.test(b.mapFondBarre()));
}

console.log('\n══ 5. ⛔ LE RÉGLAGE QUI VOYAGE — d\'un téléphone à l\'autre ══\n');
{ const a=bac(false), b=bac(false);
  const u={id:'u1',pref:{}};
  a.M.connecter(u);
  a.M.setMapSat(true);
  v('sur l\'appareil A, le satellite est rangé', a.M.lire('elan_carte'), 's');
  vrai('… et déposé sur la fiche de la personne', a.M.user().pref.carte==='s');
  vrai('⛔ l\'appareil B le reçoit', b.M.prefAppliquer(a.M.user())===true && b.M.mapSatOn()===true);

  a.M.setMapSat(false);
  vrai('on éteint le satellite sur A', a.M.mapSatOn()===false);
  vrai('… la fiche porte une valeur NON VIDE (sinon prefAppliquer la saute)',
       typeof a.M.user().pref.carte==='string' && a.M.user().pref.carte.length>0);
  vrai('⛔ et B l\'éteint aussi', b.M.prefAppliquer(a.M.user())===true && b.M.mapSatOn()===false);
  v('… B est bien revenu au thème', b.M.mapFond(), 'm');
}

console.log('\n══ 6. ⛔ LA TEINTE SE POSE SANS RECONSTRUIRE LA VUE ══\n');
{ const n=bac(true), j=bac(false);
  v('population : deux volets de tuiles par bac', [n.panes.length,j.panes.length], [2,2]);
  n.M.mapNuitSync();
  vrai('en nuit, TOUTES les cartes sont teintées', n.panes.every(p=>p.cl.has('tiles-night')));
  j.M.mapNuitSync();
  vrai('en jour, aucune ne l\'est', j.panes.every(p=>!p.cl.has('tiles-night')));
  n.M.ecrire('elan_carte','s'); n.M.mapNuitSync();
  vrai('⛔ le satellite n\'est JAMAIS assombri', n.panes.every(p=>!p.cl.has('tiles-night')));
  n.M.ecrire('elan_carte','a'); n.M.mapNuitSync();
  vrai('… et la carte redevient nocturne quand on quitte le satellite', n.panes.every(p=>p.cl.has('tiles-night')));
}

console.log('\n══ 7. LE CÂBLAGE DANS LE FICHIER — du CODE, pas un commentaire ══\n');
/* Ce dépôt est très commenté : tout motif cherché ici vise une FORME de code, sur un texte
   dont les commentaires de bloc en début de ligne ont été retirés (voir CLAUDE.md). */
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
/* ⛔ On découpe dans le texte BRUT (l'ancre est parfois un commentaire), on nettoie APRÈS —
   et le nettoyage est le sûr, celui qui ne mange que les blocs commençant une ligne. */
const sansCom=s=>s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
const CORPS_SYNC=sansCom(decoupe('function mapNuitSync(){'));
{ vrai('population : le nettoyage n\'a rien aval\u00e9 (saveVehicule survit)', /function saveVehicule/.test(NU));
  vrai('population : le corps de mapNuitSync reste lisible apr\u00e8s nettoyage', CORPS_SYNC.length>80);
  vrai('⛔ applyTheme() appelle mapNuitSync()', /mapNuitSync\(\)\s*;/.test(
        NU.slice(NU.indexOf('function applyTheme(){'), NU.indexOf('function setThemePref('))));
  v('⛔ mapNuitSync passe par le DOM, pas par _map / _planMap (zone morte temporelle)',
    (CORPS_SYNC.match(/_planMap|_map\b/g)||[]).length, 0);
  vrai('… elle vise bien le volet de tuiles de Leaflet',
       /querySelectorAll\('\.leaflet-tile-pane'\)/.test(CORPS_SYNC));
  v('⛔ le mémo _mapLayer a disparu (il figeait la bascule de 18 h)', (NU.match(/_mapLayer/g)||[]).length, 0);
  v('⛔ plus aucune table MAP_FONDS ni setMapLayer', (NU.match(/MAP_FONDS|setMapLayer/g)||[]).length, 0);
  v('mapFondBarre reste le seul point de montage de la barre',
    (NU.match(/mapFondBarre\(\)/g)||[]).length, 4);   /* 1 définition + 3 vues */
  vrai('la clé de préférence reste déclarée', /carte:'elan_carte'/.test(NU));
}

console.log('\n══ 8. ⛔ LA PASTILLE EST DANS L\'EN-TÊTE, ET L\'EN-TÊTE A SON PLANCHER ══\n');
/* Mesuré au navigateur le 22 septembre 2026, iPhone de 390 px, écran « Carte des box » :
   la pastille rendait 40 px pendant que Liste et Carte des box, à deux centimètres sur la
   même vue, rendaient 44 — deux planchers dans un même regard, et le plus bas sur la
   commande qu'on presse devant un bâtiment. La règle vit dans `@media (pointer:coarse)` et
   ne vise QUE `.ph-actions` : les ~240 filtres du contenu restent à 40 px, c'est la densité
   voulue par la refonte. Le banc garde les deux moitiés — la règle, et sa portée. */
{ const i0=NU.indexOf('@media (pointer:coarse){');
  vrai('population : le bloc tactile est trouvé', i0>0);
  const bloc=NU.slice(i0, NU.indexOf('\n}', i0));
  vrai('population : le bloc contient bien le plancher des chips', /\.chip\{min-height:40px/.test(bloc));
  vrai('⛔ une pastille d’en-tête monte à 44 px', /\.ph-actions \.chip\{min-height:44px\}/.test(bloc));
  /* ⚠️ Un motif « tout sauf .ph-actions » se laisse tromper par l'espace qui précède :
     on RAMASSE chaque règle qui monte une chip à 44 px et on exige qu'elles soient toutes
     préfixées par `.ph-actions`, plutôt que de croire une négation. */
  const haut44=[...bloc.matchAll(/([^{};]*)\.chip\{min-height:44px/g)].map(m=>m[1].trim());
  v('population : une seule règle monte une chip à 44 px ici', haut44.length, 1);
  v('… et elle est bornée à l’en-tête (le contenu garde sa densité)',
    haut44.filter(s=>!/\.ph-actions$/.test(s)), []);
  v('mapFondBarre est le SEUL endroit qui pose une chip dans .ph-actions de la carte',
    (NU.match(/class="chip\$\{on\?' active':''\}"/g)||[]).length, 1);
}

console.log(`\n════ test-762 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko?1:0);
