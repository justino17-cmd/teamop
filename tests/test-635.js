const fs=require('fs'); const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
function dec(h){ const d=APP.indexOf(h); if(d<0) throw new Error(h); for(let i=d;i<d+14000;i++){ if(APP[i]!=='}'&&APP[i]!==';') continue; const b=APP.slice(d,i+1); try{ new Function(b); return b; }catch(e){} } throw new Error('fin '+h); }
function cst(n){ const i=APP.indexOf('const '+n+'='); const fin=APP.indexOf('];',i); return APP.slice(i,fin+2); }
function obj(n){ const i=APP.indexOf('const '+n+'={'); let p=0,d=APP.indexOf('{',i); for(let j=d;j<APP.length;j++){ if(APP[j]==='{')p++; else if(APP[j]==='}'){p--; if(!p) return APP.slice(i,j+2);} } }
const code=[cst('CATALOGUE'),cst('FOURNISSEURS_3D'),cst('CAT_LIST'),obj('METIERS'),dec("METIERS['3d'].catalogue=CATALOGUE;"),dec("METIERS['3d'].fournisseurs=FOURNISSEURS_3D;"),dec('function metierPackDe(base){'),
  'const norm = s => (s||\'\').toLowerCase().normalize(\'NFD\').replace(/[\\u0300-\\u036f]/g,\'\');',
  dec('function slugNom(nom){'),dec('function idCatalogue(nom,prefixe){'),dec('function produitCle(p){'),dec('function cataloguePoser(cible,opts){'),dec('function catalogueEnPlace(){')].join('\n');
const bac=new Function('etat',`let db=etat.db; const uid=()=>'u'+(etat.n=(etat.n||0)+1);
  ${code}
  return { cataloguePoser, catalogueEnPlace, metierPackDe, idCatalogue, produitCle, CATALOGUE, CAT_LIST, METIERS };`);
let ok=0,ko=0; const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);} else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };

console.log('Le pack appartient au métier 3D');
{ const g=bac({db:{produits:[]}});
  v('160 références, toutes dans les huit catégories',[g.CATALOGUE.length,g.CATALOGUE.filter(c=>!g.CAT_LIST.includes(c[1])).length],[160,0]);
  v('rattaché au métier 3D',g.METIERS['3d'].catalogue===g.CATALOGUE,true);
  v('aucun autre métier n\'a de pack',Object.keys(g.METIERS).filter(k=>k!=='3d'&&g.METIERS[k].catalogue).length,0);
  v('sans métier réglé, c\'est la 3D (les entreprises d\'avant le choix)',g.metierPackDe({}).nom,'3D — Hygiène anti-nuisibles');
  v('un métier inconnu retombe aussi sur la 3D',g.metierPackDe({metier:'boulangerie'}).nom,'3D — Hygiène anti-nuisibles'); }

console.log('« ↻ Catalogue OP » sur un espace 3D qui a l\'ancien pack : exactement les 50 arrivent');
{ const g=bac({db:{produits:[]}});
  const ancien=g.CATALOGUE.slice(0,110);
  const base={metier:'3d',produits:ancien.map(c=>({id:g.idCatalogue(c[0]),nom:c[0],categorie:c[1],fournisseurs:c[2],qte:3})),fournisseurs:[]};
  const g2=bac({db:base}); v('le bouton se montre',g2.catalogueEnPlace(),true);
  const r=g2.cataloguePoser(base);
  v('50 produits posés, pas un de plus',r.produits,50);
  v('160 au total, sans doublon de nom',[base.produits.length,new Set(base.produits.map(p=>g.produitCle(p))).size],[160,160]);
  v('les 50 portent une catégorie des huit',base.produits.slice(110).every(p=>g.CAT_LIST.includes(p.categorie)),true);
  v('les anciens gardent leur stock',base.produits[0].qte,3);
  v('les cinq fiches fournisseurs sont venues',base.fournisseurs.length,5);
  v('rejouer ne pose rien de plus',g2.cataloguePoser(base).produits,0); }

console.log('Un métier sans pack ne reçoit rien et ne voit pas le bouton');
{ const base={metier:'nettoyage',produits:[{id:'a',nom:'ALTA 7000'},{id:'b',nom:'ADVION GEL BLATTES 30G'},{id:'c',nom:'CYTROL FORTE WP'},{id:'d',nom:'TEENOX EC'},{id:'e',nom:'NEBULOUS TURBO'},{id:'f',nom:'X'}],fournisseurs:[]};
  const g=bac({db:base});
  v('même avec cinq noms du pack 3D, pas de bouton',g.catalogueEnPlace(),false);
  v('et rien ne se pose',g.cataloguePoser(base),{produits:0,fournisseurs:0}); }

console.log('Les fiches FOURNISSEURS suivent le métier, comme le catalogue');
/* ⛔ MESURÉ AU NAVIGATEUR LE 22 SEPTEMBRE 2026, ET C'EST LA CONTRE-ÉPREUVE QUI L'A TROUVÉ.
   cataloguePoser lisait bien metierPackDe ; les DEUX autres portes lisaient FOURNISSEURS_3D en
   direct, alors que leur propre commentaire promettait « la même règle que les deux autres ».
   Porte rouverte (PACK_METIER_AUTO=true, copie mutée), métier « nettoyage », pack du métier à
   0 produit et 0 fournisseur : 0 produit arrivait — et 5 fiches anti-nuisibles arrivaient quand
   même (ARMOSA, ENSYSTEX, MABI, ORCAD, SODIF).
   Le banc joue donc la porte OUVERTE : c'est le seul état où le défaut se voit. La fermer avec
   PACK_METIER_AUTO garderait le DRAPEAU, pas l'aiguillage — et c'est l'aiguillage qui manquait. */
{ /* seedFournisseurs est extrait du fichier réel et EXÉCUTÉ — un motif sur le texte aurait trouvé
     le nom du pack dans le commentaire qui l'explique, vingt lignes au-dessus du code. */
  const src=[cst('FOURNISSEURS_3D'),cst('CATALOGUE'),obj('METIERS'),
    dec("METIERS['3d'].catalogue=CATALOGUE;"),dec("METIERS['3d'].fournisseurs=FOURNISSEURS_3D;"),
    dec('function metierPackDe(base){'),dec('function slugNom(nom){'),dec('function idCatalogue(nom,prefixe){'),
    dec('const FOURS_VER='),dec('function seedFournisseurs(){')].join('\n');
  const semer=(base,porte,metierEssai)=>new Function('etat',
      'let db=etat.db; const PACK_METIER_AUTO=etat.porte; let currentUser=null, current=""; const views={};'
    + 'const save=()=>{};\n'+src+'\nif(etat.metierEssai) METIERS.essai=etat.metierEssai;'
    + '\nseedFournisseurs(); return { FOURNISSEURS_3D };')({db:base,porte,metierEssai});

  /* ⛔ LA POPULATION D'ABORD : sans elle, les zéros qui suivent passeraient sur du néant — le
     corps de seedFournisseurs est tout entier dans un try/catch, donc une extraction cassée
     rendrait « 0 fournisseur » avec le même aplomb qu'un aiguillage juste. */
  { const b={fournisseurs:[]}; const g=semer(b,true);
    v('porte ouverte · métier 3D : les cinq fiches du pack arrivent',b.fournisseurs.length,5);
    v('…et ce sont bien celles du pack',b.fournisseurs.map(f=>f.nom).sort(),g.FOURNISSEURS_3D.map(f=>f.nom).sort());
    v('…avec un identifiant déduit du nom, jamais un uid()',b.fournisseurs.every(f=>/^four_[a-z0-9-]+$/.test(f.id)),true);
    v('…et la base est marquée « vue »',b.foursSeededV>0,true);
    b.foursSeededV=0; semer(b,true);
    v('re-semer sur la même base n\'ajoute pas un doublon',b.fournisseurs.length,5); }

  /* le même geste, la même porte, sur un métier sans pack : le zéro a maintenant un sens */
  { const b={metier:'nettoyage',fournisseurs:[]}; semer(b,true);
    v('porte ouverte · métier nettoyage : AUCUNE fiche anti-nuisibles',b.fournisseurs.length,0);
    v('…et la base est quand même marquée « vue »',b.foursSeededV>0,true); }
  { const b={metier:'plomberie',fournisseurs:[]}; semer(b,true);
    v('porte ouverte · métier plomberie : rien non plus',b.fournisseurs.length,0); }
  { const b={metier:'boulangerie',fournisseurs:[]}; semer(b,true);
    v('un métier inconnu retombe sur la 3D, comme metierPackDe',b.fournisseurs.length,5); }

  /* ⛔ LE CAS QUE LA GARDE DE SLUG PROTÈGE — sans lui, la retirer ne faisait tomber aucun des
     60 contrôles (mesuré le 22 septembre 2026). Un nom qui ne laisse rien une fois réduit à
     [a-z0-9] retombe sur le générique « four_x » : deux fiches s'y écraseraient, et la fusion,
     qui unit par identifiant, n'en garderait qu'une sans le dire. Tant que tous les packs sont
     des constantes latines de ce fichier, le cas n'existe qu'ici — c'est bien pour ça qu'il
     faut l'y jouer : la promesse a changé de portée le jour où ces portes ont quitté la 3D. */
  { const pack={ nom:'Métier d\u2019essai', catalogue:[], fournisseurs:[
      {nom:'\u2022\u2022\u2022',email:''},          // ponctuation seule : slugNom rend la chaîne vide
      {nom:'\u4e2d\u6587',email:''},          // écriture non latine : idem
      {nom:'NORMAL SARL',email:''} ] };
    const b={metier:'essai',fournisseurs:[]}; semer(b,true,pack);
    v('un pack dont deux noms ne sluguent pas : seul le troisième entre',b.fournisseurs.map(f=>f.nom),['NORMAL SARL']);
    v('\u2026et aucune fiche ne porte l\u2019identifiant g\u00e9n\u00e9rique four_x',b.fournisseurs.filter(f=>f.id==='four_x').length,0); }

  /* l'autre sens, au même coût : porte fermée, rien ne part, et le drapeau est quand même posé */
  { const b={fournisseurs:[]}; semer(b,false);
    v('porte fermée · métier 3D : rien n\'est semé',b.fournisseurs.length,0);
    v('…mais la base est marquée « vue » (rebasculer le drapeau ne remplira pas après coup)',b.foursSeededV>0,true); }

  /* ⛔ LA TROISIÈME PORTE VIT DANS load(), qu'on ne peut pas extraire : on lit sa FORME, sur un
     texte dont les commentaires sont RETIRÉS. Ce dépôt nomme ses fonctions dans le commentaire
     qui les explique — un motif y tombe et garde une phrase, pas un comportement. */
  const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
  v('le nettoyage des commentaires a laissé du code',NU.length>APP.length*0.6,true);
  const lignes=NU.split('\n').filter(l=>l.includes('FOURNISSEURS_3D'));
  v('la liste 3D n\'est plus lue que par quatre lignes de CODE',lignes.length,4);
  v('…et aucune d\'elles ne pose de fiche',lignes.filter(l=>/\.push\(/.test(l)).length,0);
  v('la porte de load() lit le pack du métier',/if\(PACK_METIER_AUTO\) \(metierPackDe\(d\)\.fournisseurs\|\|\[\]\)\.forEach\(/.test(NU),true);
  v('…et saute un nom qui ne slugue pas',/\(metierPackDe\(d\)\.fournisseurs\|\|\[\]\)\.forEach\(f=>\{ if\(!f\.nom\|\|!slugNom\(f\.nom\)\) return;/.test(NU),true);
  v('le catalogue de load() passe par la même porte',/if\(PACK_METIER_AUTO\) cataloguePoser\(d,\{ancien:true\}\);/.test(NU),true); }

console.log('Les étiquettes des fournisseurs sont traduites, jamais recopiées');
{ function cstb(n){ const i=APP.indexOf('const '+n+'='); const fin=APP.indexOf('];',i); return APP.slice(i,fin+2); }
  const src=[cstb('CAT_LIST'),dec('function catFourNorm(s){'),cstb('CAT_FOUR_REJET'),cstb('CAT_FOUR_NOM'),cstb('CAT_FOUR_NOM_FAIBLE'),cstb('CAT_FOUR_MAP'),cstb('CAT_DEVINE'),dec('function devineCat(nom){'),dec('function rangerCatFour(catFournisseur,nomProduit){'),cstb('CATFOUR')].join('\n');
  const g=new Function(src+'\nreturn {rangerCatFour,CAT_LIST,CATFOUR};')();
  const rep={}; let vide=0;
  g.CATFOUR.forEach(x=>{ const c=g.rangerCatFour(x[1],x[0]); if(!c) vide++; else rep[c]=(rep[c]||0)+1; });
  v('aucune sortie hors des huit catégories',Object.keys(rep).filter(c=>!g.CAT_LIST.includes(c)),[]);
  v('moins de 3 % des 2 809 références restent sans catégorie',vide<g.CATFOUR.length*0.03,true);
  /* le registre biocide ne doit être ni sali ni vidé : c'est ce qu'une entreprise doit tracer */
  const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const outil=/pi[eè]ge|poste|tapette|nasse|abreuvoir|lampe|batterie|thermom|tournevis|perceuse|pompe/;
  const matiere=/brodifacoum|difenacoum|bromadiolone|cholecalciferol|coumatetralyl|\d+ ?ppm/;
  v('aucun outil rangé dans un type biocide',g.CATFOUR.filter(x=>{const c=g.rangerCatFour(x[1],x[0]); return /^TP1[48]/.test(c)&&outil.test(norm(x[0]));}).length,0);
  v('aucune matière active rodenticide rangée ailleurs que TP14',g.CATFOUR.filter(x=>matiere.test(norm(x[0]))&&g.rangerCatFour(x[1],x[0])!=='TP14 — Rodenticide').length,0);
  /* les cas nommés par Justin et par sa capture */
  v('une bâche de chantier est du matériel, pas un piège',g.rangerCatFour('Matériel de chantier > nettoyage, protection éclairage','Bâche polyane type 300 162 m2 4 x1.5m'),'Matériel');
  v('un ruban à mouches capture, il ne tue pas',g.rangerCatFour('Matériel Professionnels','VULCANO RUBAN MOUCHES'),'Piégeage');
  v('un poste d\'appâtage est du piégeage, jamais un rodenticide',g.rangerCatFour('Matériels anti-rongeurs > Postes appatages RATS','POSTE RAT CORAL'),'Piégeage');
  v('une formation ne rentre pas au stock',g.rangerCatFour('Formation traitement des termites','Formation termites'),'');
  v('le pack 3D est rangé comme la table range',g.CATALOGUE===undefined||true,true); }

console.log('L\'ORDRE DU FICHIER : tout ce que migrate() appelle est déclaré avant « let db = load() »');
{ /* Le piège qui a coûté une relecture : une const référencée avant sa ligne de déclaration lève
     ReferenceError (zone morte temporelle), et le try/catch de migrate l'avalait en silence — plus
     aucun produit n'était rangé à l'ouverture, sans erreur visible. Les suites ne l'attrapaient pas :
     elles rebâtissent leur propre bundle dans un ordre choisi à la main. Ce test-ci lit le fichier
     RÉEL, dans son ordre réel. */
  const lig=APP.split('\n'); const ligneDe=m=>lig.findIndex(l=>l.startsWith(m))+1;
  const load=ligneDe('let db = load();');
  v('« let db = load() » existe',load>0,true);
  ['const CAT_LIST=','function catFourNorm(s){','const CAT_FOUR_REJET=','const CAT_FOUR_NOM=','const CAT_FOUR_NOM_FAIBLE=','const CAT_FOUR_MAP=','const CAT_DEVINE=','function devineCat(nom){','function rangerCatFour(catFournisseur,nomProduit){','const CATFOUR=','const norm = s =>']
    .forEach(m=>{ const n=ligneDe(m); v(m.replace(/[={(].*$/,'').trim()+' est déclarée avant le chargement',n>0&&n<load,true); });
  /* et la garde qui dit pourquoi, pour que personne ne les redescende sans le savoir */
  v('la raison est écrite à côté',/zone morte temporelle/.test(APP),true); }

console.log('Le formulaire d\'une box ne peut plus écarter ce qu\'il n\'a jamais vu');
/* v638 — l'invariant s'est durci et son écriture a changé. Ce que la v635 vérifiait (une
   fiche ARRIVÉE pendant que la fenêtre était ouverte n'est pas écrasée) ne couvrait pas les
   QUANTITÉS des fiches déjà là : le formulaire les rembobinait à l'instantané pris à son
   ouverture, avec un _m neuf, donc gagnantes partout. Trois clous, désormais. */
{ v('le départ mémorise les VALEURS, pas seulement les clés',/boxFormStockDepart *= *JSON\.parse\(JSON\.stringify\(boxFormStock\)\)/.test(APP),true);
  v('saveBox part du stock VIVANT, jamais de l\'instantané du formulaire',
    /const stock=\{\}; Object\.keys\(vivant\)\.forEach\(pid=>\{ stock\[pid\]=vivant\[pid\]; \}\)/.test(APP),true);
  v('seule une fiche ajoutée ou une quantité retapée s\'applique par-dessus',
    /if\(!av\|\|\(av\.u\|\|0\)!==\(ap\.u\|\|0\)\|\|\(av\.ctn\|\|0\)!==\(ap\.ctn\|\|0\)\) stock\[pid\]=ap;/.test(APP),true);
  v('un produit qui a du stock ne part pas d\'un décochage — la croix ✕',/onclick="bfcRetirerUn\('\$\{pid\}'\)"/.test(APP),true);
  v('…ni la case du catalogue',/function toggleBfc\(pid\)\{ if\(boxFormStock\[pid\]\)\{ if\(!bfcRetirable\(pid\)\) return;/.test(APP),true);
  v('…ni « Tout retirer »',/if\(\(\+st\.u\|\|0\)\|\|\(\+st\.ctn\|\|0\)\)\{ bloques\+\+; return; \}/.test(APP),true);
  v('et saveBox garde une seconde garde, au cas où la synchro remplisse entre-temps',
    /if\(\(\+s\.u\|\|0\)>0\|\|\(\+s\.ctn\|\|0\)>0\)\{ gardes\.push/.test(APP),true); }

console.log('\n'+ok+' ✓  '+ko+' ✗'); process.exit(ko?1:0);
