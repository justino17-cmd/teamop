/* ══ v704 — LE POINTAGE : UN COMPTEUR DE PAIE NE SE TROMPE PAS ═══════════════════════════
   Demande de Justin, 21 septembre 2026 : « quand le technicien pointe, ça calcule à l'heure.
   Quand il a fait sa journée, il dépointe. […] Sans qu'ils aient besoin de recompter entre
   chaque heure. Il faut que ce soit un comptage automatique. Et s'il repointe dans la même
   journée […] que ça s'ajoute mais qu'on voit bien les deux pointages. »

   Ce fichier fait tourner les VRAIES fonctions extraites d'app.html. Ce qui est gardé ici,
   ce sont les quatre manières connues de faire mentir une feuille de temps :

   1. LA NUIT. `minutes('23:50','00:20')` rend 0 — la soustraction est négative et se
      plafonne. Une équipe de nuit pointait des journées de 0 h. Seuls `debutTs`/`finTs`
      (epoch) donnent la bonne durée ; le banc l'exige.
   2. L'OUBLI. Un « dépointer » sauté un vendredi soir compte 63 h le lundi. Le compteur se
      plafonne à PT_MAX_H et le pointage est SIGNALÉ, pas compté en silence.
   3. LA RÉTROCOMPATIBILITÉ. Tous les pointages déjà saisis n'ont que 'HH:MM'. Si la lecture
      ne retombait pas dessus, la mise à jour EFFACERAIT le passé de chaque feuille de temps.
   4. LES DEUX HORODATAGES QUI DIVERGENT. Corriger « 17:00 » en « 16:35 » sans réécrire
      `finTs` ferait afficher 16:35 et compter jusqu'à 17:00 — la panne silencieuse type de
      ce dépôt, une donnée en deux exemplaires dont un seul est mis à jour.

   ⚠️ Ce banc ne voit PAS le chrono qui avance ni le PDF téléchargé : ça se mesure au
   navigateur (`scratchpad/sonde-pointage.js`, 53 contrôles). Il garde le CALCUL.          */
const fs=require('fs'); const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);

/* Même découpe que test-639 : on borne à la déclaration suivante de premier niveau, puis on
   garde le PLUS LONG bloc qui compile — un préfixe qui compile est presque toujours une
   fonction amputée. */
function decoupe(h){ const d=APP.indexOf(h); if(d<0) throw new Error('introuvable : '+h);
  const suite=/\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex=d+h.length;
  const m=suite.exec(APP); const fin=m?m.index:Math.min(APP.length,d+80000);
  let bout=APP.slice(d,fin);
  for(;;){ const k=Math.max(bout.lastIndexOf('}'),bout.lastIndexOf(';')); if(k<0) break;
    const t=bout.slice(0,k+1);
    try{ new Function(t); return t; }catch(e){ bout=bout.slice(0,k); } }
  throw new Error('fin introuvable : '+h); }

const CODE=['const PT_MAX_H = 16;','function minutes(deb,fin){','function dureeStr(min){','function pt2(n){',
  'function ptHM(ts){','function ptHMS(ts){','function ptJourDe(d){','function ptJour(ts){','function ptOuvert(p){',
  'function ptOubli(p,now){','function ptSecs(p,now){','function ptDuree(sec){','function ptChrono(sec){',
  'function ptHoraires(p){','function ptOuverteDe(tid){','function ptTotal(list,now){','function ptParJour(list,now){',
  'function ptLundi(d){','function ptBornes(){','function ptListe(){'].map(h=>decoupe(h)).join('\n');

const M=new Function(`let db={pointages:[]}; let _ptPeriode='semaine',_ptRef='',_ptTech='';
  const visiblePointages=l=>l;
  ${CODE}
  return { PT_MAX_H, minutes, ptSecs, ptOuvert, ptOubli, ptDuree, ptChrono, ptHoraires, ptHM, ptHMS,
           ptJour, ptJourDe, ptOuverteDe, ptTotal, ptParJour, ptBornes, ptLundi, ptListe,
           setDb:d=>{db=d;}, setPeriode:(p,r)=>{_ptPeriode=p;_ptRef=r||'';} };`)();

const H=3600000;
const jourDe=(iso,h,m,s)=>new Date(iso+'T'+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s||0).padStart(2,'0')).getTime();

console.log('\n══ 1. LE COMPTAGE AUTOMATIQUE, À LA SECONDE ══\n');
{ const p={id:'a',techId:'t1',date:'2026-09-21',debut:'08:00',debutTs:jourDe('2026-09-21',8,0,0),
           fin:'16:35',finTs:jourDe('2026-09-21',16,35,42),pause:0};
  v('8:00:00 → 16:35:42 fait 8 h 35 min 42 s', M.ptSecs(p), 8*3600+35*60+42);
  v('… affiché « 8h35 »', M.ptDuree(M.ptSecs(p)), '8h35');
  v('… et au chrono « 08:35:42 »', M.ptChrono(M.ptSecs(p)), '08:35:42');
  v('les horaires montrent la seconde', M.ptHoraires(p), '08:00:00 → 16:35:42');
}

console.log('\n══ 2. ⛔ LA NUIT — le défaut que HH:MM ne peut pas voir ══\n');
{ v('minutes() seule rend 0 sur 23:50 → 00:20 (le défaut)', M.minutes('23:50','00:20'), 0);
  const p={debut:'23:50',debutTs:jourDe('2026-09-21',23,50,0),fin:'00:20',finTs:jourDe('2026-09-22',0,20,0),pause:0};
  v('⛔ avec les horodatages, 30 minutes', M.ptSecs(p), 1800);
}

console.log('\n══ 3. ⛔ L\'OUBLI — plafonné ET signalé ══\n');
{ const now=jourDe('2026-09-21',12,0,0);
  const p={debut:'08:00',debutTs:now-63*H,pause:0};
  v('un pointage ouvert depuis 63 h compte '+M.PT_MAX_H+' h, pas 63', M.ptSecs(p,now), M.PT_MAX_H*3600);
  vrai('⛔ … et il est SIGNALÉ comme un oubli', M.ptOubli(p,now));
  const q={debut:'08:00',debutTs:now-3*H,pause:0};
  v('un pointage ouvert depuis 3 h compte 3 h', M.ptSecs(q,now), 3*3600);
  v('⛔ … et n\'est PAS signalé (sinon l\'alarme crie tous les jours)', M.ptOubli(q,now), false);
  vrai('un pointage sans fin est « ouvert »', M.ptOuvert(p));
  v('un pointage avec finTs ne l\'est plus', M.ptOuvert({debutTs:1,finTs:2}), false);
  v('un pointage avec seulement un HH:MM de fin ne l\'est plus', M.ptOuvert({debut:'8:00',fin:'17:00'}), false);
}

console.log('\n══ 4. ⛔ LE PASSÉ CONTINUE DE COMPTER (aucun horodatage) ══\n');
{ v('08:30 → 12:00 sans horodatage : 3 h 30', M.ptSecs({debut:'08:30',fin:'12:00',pause:0}), 12600);
  v('09:00 → 17:30 avec 60 min de pause : 7 h 30', M.ptSecs({debut:'09:00',fin:'17:30',pause:60}), 27000);
  v('la pause se déduit aussi des horodatages',
    M.ptSecs({debutTs:jourDe('2026-09-21',9,0,0),finTs:jourDe('2026-09-21',17,0,0),pause:30}), 7*3600+1800);
  v('une pause plus longue que la journée ne rend jamais un négatif',
    M.ptSecs({debut:'09:00',fin:'10:00',pause:600}), 0);
  v('un pointage ouvert SANS horodatage ne compte rien (on ne sait pas depuis quand)',
    M.ptSecs({debut:'08:00'}), 0);
  v('les horaires d\'un ancien pointage restent lisibles', M.ptHoraires({debut:'08:30',fin:'12:00'}), '08:30 → 12:00');
  v('un pointage ouvert le dit', M.ptHoraires({debut:'08:30',debutTs:1}), M.ptHMS(1)+' → en cours');
}

console.log('\n══ 5. ⛔⛔ REPOINTER LE MÊME JOUR : ÇA S\'AJOUTE, LES DEUX RESTENT ══\n');
{ const j='2026-09-21';
  const matin={id:'m',techId:'t1',date:j,debut:'08:00',debutTs:jourDe(j,8,0,0),fin:'16:35',finTs:jourDe(j,16,35,0),pause:0};
  const soir ={id:'s',techId:'t1',date:j,debut:'17:00',debutTs:jourDe(j,17,0,0),fin:'19:00',finTs:jourDe(j,19,0,0),pause:0};
  const g=M.ptParJour([soir,matin]);
  v('une seule journée', g.length, 1);
  v('⛔ DEUX pointages y restent, distincts', g[0].ps.length, 2);
  v('⛔ dans l\'ordre où ils ont eu lieu', g[0].ps.map(x=>x.id), ['m','s']);
  v('⛔ le total de la journée est la SOMME (8h35 + 2h00 = 10h35)', M.ptDuree(g[0].sec), '10h35');
  v('… soit très exactement la somme des deux', g[0].sec, M.ptSecs(matin)+M.ptSecs(soir));
  v('la journée n\'est pas « ouverte »', g[0].ouvert, false);
  const g2=M.ptParJour([matin,{id:'o',techId:'t1',date:j,debut:'20:00',debutTs:Date.now()-600000}]);
  vrai('… mais elle l\'est dès qu\'un pointage court encore', g2[0].ouvert);
  v('les journées sortent de la plus récente à la plus ancienne',
    M.ptParJour([{date:'2026-09-19'},{date:'2026-09-21'},{date:'2026-09-20'}]).map(x=>x.jour),
    ['2026-09-21','2026-09-20','2026-09-19']);
}

console.log('\n══ 6. LA SEMAINE ET LE MOIS ══\n');
{ M.setPeriode('semaine','2026-09-23');           // un mercredi
  const b=M.ptBornes();
  v('la semaine part du LUNDI', b.de, '2026-09-21');
  v('… et finit le DIMANCHE', b.a, '2026-09-27');
  M.setPeriode('semaine','2026-09-21');
  v('un lundi reste le début de SA semaine', M.ptBornes().de, '2026-09-21');
  M.setPeriode('semaine','2026-09-27');
  v('un dimanche appartient à la semaine qui commence le lundi d\'avant', M.ptBornes().de, '2026-09-21');
  M.setPeriode('mois','2026-09-15');
  v('le mois part du 1er', M.ptBornes().de, '2026-09-01');
  v('… et finit au dernier jour, pas au 30 de tous les mois', M.ptBornes().a, '2026-09-30');
  M.setPeriode('mois','2026-02-10');
  v('février 2026 finit le 28', M.ptBornes().a, '2026-02-28');
  M.setPeriode('tout','');
  v('« Tout » n\'a pas de borne basse', M.ptBornes().de, '');
}

console.log('\n══ 7. LE FILTRE : PÉRIODE, PUIS PERSONNE ══\n');
/* ⚠️ CHAQUE LIGNE D'ESSAI PORTE UNE FIN. Sans elle, ptOuvert() les tient TOUTES pour « en
   cours » et ptOuverteDe rend la première venue : le banc accusait alors le code d'un défaut
   qu'il n'a pas. Une donnée d'essai incomplète fabrique un faux défaut aussi sûrement qu'un
   motif mal ancré. */
{ const lignes=[{id:'1',techId:'t1',date:'2026-09-21',debut:'08:00',fin:'12:00'},
                {id:'2',techId:'t2',date:'2026-09-21',debut:'08:00',fin:'12:00'},
                {id:'3',techId:'t1',date:'2026-09-10',debut:'08:00',fin:'12:00'}];
  M.setDb({pointages:lignes}); M.setPeriode('semaine','2026-09-23');
  v('la semaine du 21 ne retient que ses deux lignes', M.ptListe().map(x=>x.id), ['1','2']);
  M.setPeriode('tout','');
  v('« Tout » les retient toutes', M.ptListe().length, 3);
  const ouverte={id:'o',techId:'t1',date:'2026-09-21',debutTs:1};
  M.setDb({pointages:[...lignes,ouverte]});
  v('ptOuverteDe trouve le pointage en cours du bon technicien', M.ptOuverteDe('t1').id, 'o');
  v('… et rien pour un autre', M.ptOuverteDe('t2'), null);
}

console.log('\n══ 8. CE QUI EST GARDÉ DANS LE TEXTE (ne s\'exécute pas hors navigateur) ══\n');
/* ⛔ MOTIF SUR DU CODE, JAMAIS SUR UNE PHRASE : on retire d'abord les commentaires — et avec
   le nettoyage SÛR (blocs qui COMMENCENT une ligne), celui qui n'avale pas 107 069 caractères. */
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
/* ⛔ BORNER LA DÉCOUPE, SINON ELLE DÉBORDE SUR LA SUIVANTE. `ptTickStart` est suivie de
   `views.pointage=function(){`, qui n'est pas une `function ` de premier niveau : la découpe
   emportait toute la VUE, et le banc accusait le chrono de redessiner #content — ce que fait
   la vue, pas lui. Déjà payé sur test-748, et c'est la même leçon : un motif juste sur une
   zone fausse rend un verdict faux. */
const corps=(nom)=>{ const i=NU.indexOf('function '+nom+'('); if(i<0) return '';
  const bornes=['\nfunction ','\nviews.','\nconst ','\nlet ','\nasync function ']
    .map(b=>NU.indexOf(b,i+10)).filter(x=>x>0);
  const j=bornes.length?Math.min(...bornes):-1;
  return NU.slice(i, j<0? i+2600 : j); };

{ const sp=corps('savePointage');
  vrai('⛔⛔ savePointage réécrit debutTs', /d\.debutTs\s*=/.test(sp));
  vrai('⛔⛔ … ET finTs, dans le même geste', /d\.finTs\s*=/.test(sp));
  vrai('⛔ une fin avant le début bascule au lendemain (la nuit saisie à la main)',
    /d\.finTs\s*<\s*d\.debutTs/.test(sp) && /86400000/.test(sp));
  vrai('savePointage n\'est toujours pas gardé par le droit de catégorie (décision écrite)',
    !/permGarde\(/.test(sp));

  const pd=corps('pointerDebut');
  vrai('⛔ pointer prend l\'heure de l\'APPAREIL (Date.now), pas un champ',
    /const ts\s*=\s*Date\.now\(\)/.test(pd));
  vrai('⛔ pointer refuse quand le compte n\'a pas de fiche technicien', /if\(!tid\)/.test(pd));
  vrai('⛔ … et refuse un second pointage en cours', /ptOuverteDe\(tid\)/.test(pd));
  vrai('pointer pose les DEUX formes (HH:MM et horodatage)', /debut:ptHM\(ts\)/.test(pd)&&/debutTs:ts/.test(pd));

  const pf=corps('ptFermer');
  vrai('⛔ dépointer pose finTs ET fin', /p\.finTs\s*=\s*ts/.test(pf)&&/p\.fin\s*=\s*ptHM\(ts\)/.test(pf));
  vrai('⛔ une fin ne peut pas précéder le début', /ts\s*<\s*p\.debutTs/.test(pf));

  const co=corps('ptCloreOubliOk');
  vrai('⛔ un oubli se clôture à l\'heure QU\'ON DIT, pas à l\'heure qu\'il est',
    /new Date\(d\.jour\+'T'\+d\.heure/.test(co) && !/Date\.now\(\)/.test(co));

  const tk=corps('ptTickStart');
  vrai('⛔ le chrono s\'arrête tout seul dès qu\'on quitte l\'écran',
    /current!=='pointage'/.test(tk) && /ptTickStop\(\)/.test(tk));
  vrai('… et il ne redessine jamais la vue entière (il touche le chrono, pas #content)',
    !/views\.pointage\(\)/.test(tk) && !/\$\('content'\)\.innerHTML/.test(tk));
}
/* ⛔⛔ CE BLOC A ÉTÉ AVEUGLE, ET LA MUTATION L'A DIT. Retirer `||can('voirPointages')` de
   `visiblePointages` ne faisait tomber AUCUN contrôle : la fenêtre de 420 caractères débordait
   sur `ptPeutVoirAutres`, qui porte la même expression. Le motif était juste, la ZONE était
   fausse — exactement le défaut corrigé quinze lignes plus haut sur `corps()`.
   La parade n'est pas une fenêtre mieux bornée : c'est d'EXÉCUTER la vraie fonction. Un droit
   se mesure par ce qu'il laisse passer, pas par le texte qui le nomme. */
{ const D=new Function('cap','peri','tid',`
    const can=c=>cap[c]===true;
    const perimetreTechIds=()=>peri;
    const myTechId=()=>tid;
    ${decoupe('function visiblePointages(')}
    ${decoupe('function ptPeutVoirAutres(){')}
    return { visiblePointages, ptPeutVoirAutres };`);
  const lignes=[{id:'a',techId:'t1'},{id:'b',techId:'t2'},{id:'c',techId:'t3'}];

  const tech=D({}, null, 't1');
  v('⛔ sans droit, on ne voit QUE ses propres pointages',
    tech.visiblePointages(lignes).map(x=>x.id), ['a']);
  v('… et pas de sélecteur d\'équipe', tech.ptPeutVoirAutres(), false);

  const chef=D({voirPointages:true}, new Set(['t1','t2']), 't1');
  v('⛔ LE DROIT DÉDIÉ « voirPointages » OUVRE LES FEUILLES DE TEMPS',
    chef.visiblePointages(lignes).map(x=>x.id), ['a','b']);
  vrai('… et donne le sélecteur d\'équipe', chef.ptPeutVoirAutres());

  const chefSansPerim=D({voirPointages:true}, null, 't1');
  v('⛔ un périmètre absent (personne rattachée) laisse tout voir, il ne VIDE pas l\'écran',
    chefSansPerim.visiblePointages(lignes).length, 3);

  const admin=D({voirTout:true}, null, 't1');
  v('« tout voir » continue de tout voir : rien ne change le jour de la mise à jour',
    admin.visiblePointages(lignes).length, 3);

  const autre=D({voirTout:true}, new Set(['t3']), 't1');
  v('⛔ … mais toujours borné au périmètre quand il y en a un',
    autre.visiblePointages(lignes).map(x=>x.id), ['c']);

  vrai('le droit est déclaré dans USER_CAPS', /\['voirPointages'/.test(NU));
  vrai('… et rangé dans la catégorie Temps & équipe',
    /equipe:\[[^\]]*'voirPointages'/.test(NU));
}
{ vrai('⛔ l\'export PDF est bâti à la main, sans bibliothèque', /function ptPdfStr\(list,b\)\{/.test(NU));
  vrai('… il produit un vrai en-tête PDF', /out='%PDF-1\.4/.test(NU.slice(NU.indexOf('function ptPdfStr'))));
  /* Le motif visait une écriture littérale que le code n'a pas : il passe par `const list`.
     On garde donc le COMPORTEMENT — l'export part de la même liste et des mêmes bornes que
     l'écran — plutôt qu'une forme de rédaction. */
  const pp=corps('ptPdf');
  vrai('… et il exporte CE QUI EST À L\'ÉCRAN (même liste, mêmes bornes)',
    /const list=ptListe\(\)/.test(pp) && /ptPdfStr\(list,\s*ptBornes\(\)\)/.test(pp));
  vrai('… et une période vide le DIT, au lieu de rendre un PDF blanc',
    /if\(!list\.length\)/.test(pp) && /toast\(/.test(pp));
}
{ const pb=NU.slice(NU.indexOf('function planBloque('), NU.indexOf('function planBloque(')+200);
  vrai('⛔ LA BÊTA VOIT TOUTES LES CATÉGORIES (le forfait ne masque rien sur la bêta)',
    /if\(BETA_ESSAI\)\s*return false;/.test(pb));
  const mb=NU.slice(NU.indexOf('function metierBloque('), NU.indexOf('function metierBloque(')+220);
  vrai('⛔ … ni le métier', /if\(BETA_ESSAI\)\s*return false;/.test(mb));
  vrai('⛔ et en PRODUCTION le forfait Gratuit bloque toujours « pointage »',
    /gratuit:\[[^\]]*'pointage'/.test(NU));
}

console.log('\n═══ test-749 : '+ok+' ✓ '+ko+' ✗ ═══\n');
process.exit(ko?1:0);
