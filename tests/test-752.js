/* ══ REFONTE POINT 2 — « ＋ CRÉER » ════════════════════════════════════════════════════════
   Dossier de refonte : « feuille montante (mobile : translateY 104 % → 0, .5 s) / fenêtre
   centrée 520 px (bureau) : grille 3×2 Intervention, Client, Devis, Facture, Demande, Box →
   formulaire → bouton contextuel → toast ».

   Ce que ce banc garde :

   1. ⛔ UNE FEUILLE À PART, PAS `openModal`. `openModal` est appelée par plus de cent endroits,
      et surtout le MULTITÂCHE capture son contenu pour le rendre plus tard : un menu capturé
      proposerait de « reprendre » un choix qu'on n'a jamais commencé.
   2. ⛔ ON NE PROPOSE QUE CE QUE LA PERSONNE PEUT OUVRIR (`canSee`, le filtre du menu — une
      seule règle, pas deux qui divergeront). Une tuile vers un écran que `go()` refuse est un
      piège : on tape, on retombe au tableau de bord avec un cadenas.
   3. ⛔ LA FEUILLE S'EFFACE AVANT QUE LE FORMULAIRE S'OUVRE. Deux couches empilées grisent le
      fond deux fois.
   4. ⛔ L'ÉCOUTEUR CLAVIER SE RETIRE. Un « Échap » global qui survit à la fermeture ferme la
      fenêtre suivante de quelqu'un d'autre.
   5. ⛔ LE BOUTON RESTE VISIBLE SUR LA BARRE CONTEXTUELLE. Mesuré le 21 septembre 2026 : la
      première version le cachait sur `body.ctx` « pour ne pas charger la barre » — donc sur
      tous les écrans de LISTE, là où on passe sa journée et d'où on crée. Un bouton « partout »
      qui disparaît partout où on travaille ne sert à rien.

   ⚠️ L'animation, les 520 px, les trois colonnes et la création réelle d'un client sont mesurés
   au navigateur (`scratchpad/sonde-creer.js`, 32 ✓).                                        */
const fs=require('fs'); const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);

function decoupe(h){ const d=APP.indexOf(h); if(d<0) throw new Error('introuvable : '+h);
  const suite=/\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex=d+h.length;
  const m=suite.exec(APP); const fin=m?m.index:Math.min(APP.length,d+80000);
  let bout=APP.slice(d,fin);
  for(;;){ const k=Math.max(bout.lastIndexOf('}'),bout.lastIndexOf(';')); if(k<0) break;
    const t=bout.slice(0,k+1);
    try{ new Function(t); return t; }catch(e){ bout=bout.slice(0,k); } }
  throw new Error('fin introuvable : '+h); }

const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
const corps=(nom)=>{ const i=NU.indexOf('function '+nom+'('); if(i<0) return '';
  const bornes=['\nfunction ','\nviews.','\nconst ','\nlet ','\nasync function ']
    .map(b=>NU.indexOf(b,i+10)).filter(x=>x>0);
  const j=bornes.length?Math.min(...bornes):-1;
  return NU.slice(i, j<0? i+2600 : j); };

console.log('\n══ 1. LES SIX ENTRÉES, ET LE FILTRE DES DROITS ══\n');
{ const M=new Function('navVu',`
    const NAV=navVu; const canSee=it=>it.vu!==false;
    ${decoupe('const CREER_ENTREES=[')}
    ${decoupe('function creerDispo(){')}
    return { CREER_ENTREES, creerDispo };`);
  const tout=[{g:'x',items:[{k:'interventions'},{k:'clients'},{k:'devis'},{k:'factures'},{k:'demandes'},{k:'boxes'}]}];
  const A=M(tout);
  v('six entrées déclarées', A.CREER_ENTREES.length, 6);
  v('ce sont celles de la maquette', A.CREER_ENTREES.map(e=>e.l),
    ['Intervention','Client','Devis','Facture','Demande','Box']);
  v('toutes visibles → les six tuiles', A.creerDispo().length, 6);

  const partiel=[{g:'x',items:[{k:'interventions'},{k:'clients'},{k:'devis',vu:false},{k:'factures',vu:false},{k:'demandes'},{k:'boxes'}]}];
  const B=M(partiel);
  v('⛔ deux rubriques fermées → deux tuiles en moins', B.creerDispo().map(e=>e.l),
    ['Intervention','Client','Demande','Box']);
  v('⛔⛔ AUCUNE tuile ne mène à un écran non visible',
    B.creerDispo().filter(e=>['devis','factures'].indexOf(e.k)>=0), []);

  const absent=[{g:'x',items:[{k:'interventions'}]}];
  v('⛔ une rubrique ABSENTE du menu ne donne pas de tuile (pas seulement « non visible »)',
    M(absent).creerDispo().map(e=>e.k), ['interventions']);
  v('⛔ un menu vide ne donne aucune tuile, et ne plante pas', M([]).creerDispo(), []);
}

console.log('\n══ 2. ⛔ UNE FEUILLE À PART, JAMAIS `openModal` ══\n');
{ const o=corps('creerOuvrir');
  v('⛔⛔ `creerOuvrir` n\'appelle PAS openModal (le multitâche capturerait un menu)',
    /openModal\(/.test(o), false);
  vrai('elle écrit dans sa propre couche #creer', /getElementById\('creer'\)/.test(o));
  vrai('⛔ elle refuse quand il n\'y a rien à créer, et le DIT', /if\(!l\.length\)/.test(o)&&/toast\(/.test(o));
  vrai('⛔ l\'animation est armée après un rendu (sinon la feuille apparaît au lieu de monter)',
    /requestAnimationFrame\(\(\)=>requestAnimationFrame\(/.test(o));
  vrai('le fond se ferme au clic', /e\.target===ov/.test(o));
}
{ const a=corps('creerAller');
  /* ⛔ −1 N'EST PAS « AVANT ». La première version comparait `indexOf('creerFermer()')` à
     `indexOf('setTimeout')` : supprimer l'appel rendait −1, et −1 < n'importe quoi, donc le
     contrôle passait au vert sur une fonction qui ne fermait PLUS la feuille. C'est la règle
     « une assertion sur un ensemble vide ne prouve rien », par la porte de l'ordre : on prouve
     d'abord la PRÉSENCE, l'ordre ensuite. */
  const iF=a.indexOf('creerFermer()'), iT=a.indexOf('setTimeout');
  vrai('la fermeture est bien appelée', iF>=0);
  vrai('⛔ la feuille s\'efface AVANT d\'ouvrir le formulaire', iF>=0 && iT>iF);
  vrai('… et l\'échec d\'un formulaire se DIT au lieu de passer en silence', /catch\(e\)\{[^}]*toast\(/.test(a));
}
{ const f=corps('creerFermer');
  vrai('⛔ l\'écouteur clavier est RETIRÉ', /removeEventListener\('keydown',creerEchap\)/.test(f));
  vrai('⛔⛔ et l\'effacement a un FILET : sans transitionend (onglet caché, mouvement réduit), la feuille resterait au-dessus de tout, invisible et cliquable',
    /setTimeout\(finir,/.test(f) && /once:true/.test(f));
  vrai('… le filet ne peut pas effacer deux fois', /if\(fait\) return; fait=true/.test(f));
}

console.log('\n══ 3. LE BALISAGE ET LE BOUTON ══\n');
{ const shell=APP.slice(APP.indexOf('<div class="app" id="app-root"'), APP.indexOf('<div class="overlay"'));
  const finDe=(html,depart)=>{ let i=depart,p=0; const re=/<(\/?)div\b[^>]*?(\/?)>/g; re.lastIndex=depart;
    let m; while((m=re.exec(html))){ if(m[2]==='/') continue; p+= m[1]==='/'?-1:1; if(p===0) return m.index; } return -1; };
  const iMain=shell.indexOf('<div class="main">'), finMain=finDe(shell,iMain);
  vrai('⛔ la couche « Créer » est HORS de .main', shell.indexOf('id="creer"')>finMain);
  vrai('le bouton est DANS la barre d\'outils', shell.indexOf('id="creer-btn"')>0 && shell.indexOf('id="creer-btn"')<finMain);
  vrai('il appelle bien creerOuvrir', /id="creer-btn" onclick="creerOuvrir\(\)"/.test(shell));
}

console.log('\n══ 4. LE STYLE — rien sans garde, et les deux formes ══\n');
{ const i0=APP.indexOf('« ＋ CRÉER » — feuille montante (mobile) / fenêtre centrée (bureau)');
  vrai('⛔ le bloc de style est trouvé (sinon tout ce qui suit est creux)', i0>0);
  const fin=APP.indexOf('</style>', i0);
  const css=i0>0?APP.slice(i0, fin>0?fin:i0+7000):'';
  v('   … et il a de la matière', css.length>1800, true);
  vrai('la feuille monte de 104 %', /transform:translateY\(104%\)/.test(css));
  vrai('… avec la courbe de la maquette', /cubic-bezier\(\.32,\.72,0,1\)/.test(css));
  vrai('⛔ bureau : fenêtre centrée de 520 px', /html\[data-kind="desktop"\] \.creer-sheet\{[\s\S]{0,120}max-width:520px/.test(css));
  vrai('⛔ … qui GRANDIT au lieu de monter', /transform:scale\(\.96\)/.test(css));
  vrai('⛔ … et passe à trois colonnes', /html\[data-kind="desktop"\] \.creer-grille\{grid-template-columns:repeat\(3,1fr\)\}/.test(css));
  vrai('deux colonnes par défaut (téléphone)', /\.creer-grille\{display:grid;grid-template-columns:repeat\(2,1fr\)/.test(css));
  vrai('⛔ la tuile fait au moins 44 px de haut', /min-height:96px/.test(css));
  vrai('⛔⛔ LE BOUTON RESTE VISIBLE SUR LA BARRE CONTEXTUELLE (il y perd son libellé, pas sa place)',
    /body\.ctx \.creer-btn \.creer-lbl\{display:none\}/.test(css) && !/body\.ctx \.creer-btn\{display:none\}/.test(css));
  vrai('⛔ le mouvement réduit supprime le DÉPLACEMENT et garde le fondu',
    /prefers-reduced-motion: reduce/.test(css) && /transform:none!important/.test(css));
  vrai('⛔ la transparence réduite éteint le flou de la feuille',
    /prefers-reduced-transparency: reduce/.test(css));
  vrai('le verre ne s\'applique que sur data-verre', /html\[data-verre="1"\] \.creer-sheet\{/.test(css));
  const sansGarde=css.split('}').filter(r=>{ const sel=r.slice(0,r.indexOf('{')).trim();
    if(!sel||/^@/.test(sel)||/^from|^to/.test(sel)) return false;
    if(sel.indexOf('/*')>=0||sel.indexOf('*')===0) return false;
    return sel.indexOf('html[')<0 && sel.indexOf('.creer')<0 && sel.indexOf('body.ctx')<0;
  });
  v('⛔⛔ AUCUNE règle du bloc ne touche un écran existant',
    sansGarde.map(r=>r.slice(0,50).trim()).filter(Boolean), []);
}

console.log('\n══ 5. LES SIX FORMULAIRES EXISTENT VRAIMENT ══\n');
{ /* ⛔ Un appel vers une fonction qui n'existe pas ne se voit qu'au tap de l'utilisateur.
     On vérifie donc que chaque tuile nomme une fonction RÉELLEMENT déclarée. */
  const ent=decoupe('const CREER_ENTREES=[');
  const noms=[...ent.matchAll(/fn:"([a-zA-Z]+)\(/g)].map(m=>m[1]);
  v('six fonctions nommées', noms.length, 6);
  noms.forEach(n=>vrai('   `'+n+'` est déclarée dans le fichier',
    new RegExp('\\nfunction '+n+'\\(|\\nasync function '+n+'\\(').test(APP)));
}

console.log('\n═══ test-752 : '+ok+' ✓ '+ko+' ✗ ═══\n');
process.exit(ko?1:0);
