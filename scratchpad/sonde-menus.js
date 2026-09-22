/* ══ SONDE — LES MENUS DÉROULANTS DE LA BARRE D'OUTILS ══════════════════════════════════
   Justin, 22 septembre 2026, capture à l'appui : une colonne blanche au milieu de l'écran
   avec « A / A / I. / J » — les PREMIÈRES LETTRES des techniciens, une par ligne.

   ⛔ LE MÉCANISME, et c'est le troisième du même genre dans la journée : une règle a changé
   une moitié et laissé l'autre. `html[data-refonte] .pf-dd{flex:0 1 auto}` a rendu aux menus
   leur largeur naturelle — c'est juste — mais la règle téléphone du panneau
   (`.pf-pan{left:0;right:0;width:auto}`) avait été écrite quand `.pf-dd` prenait TOUTE la
   largeur. Le panneau héritait donc de la largeur du BOUTON : 48 px sur un bouton d'icône.
   ⚠️ Et son jumeau, mesuré dans la même passe : `.pf-pan.large` (0,2,0) bat cette règle
   (0,1,0) et garde `width:330px` ancré à GAUCHE — le menu « Jours » sortait de **81 px à
   droite de l'écran** (x 141→471 sur 390 de large).

   Ce que cette sonde garde : sur téléphone, TOUT panneau ouvert depuis la barre d'outils
   tient dans l'écran et reste lisible ; sur ordinateur, rien n'a bougé.

   ⛔ TROIS PIÈGES DE MESURE PAYÉS ICI :
   · une fenêtre « Notifications » s'ouvre APRÈS la navigation et couvre tout : les boutons
     rendaient 0 px de large. On la ferme par SON bouton, et on prouve que rien n'est devant ;
   · le clic REDESSINE la barre : une référence prise avant le clic est détachée après, et
     `getBoundingClientRect()` rend des zéros. On mesure le bouton AVANT, on re-cherche APRÈS ;
   · ⛔ on ne DÉTRUIT pas le panneau pour « repartir propre » — on referme par où
     l'application ferme. Détruire casse la bascule qu'on veut mesurer.
   ⛔ Bêta uniquement, servie en 127.0.0.1.                                                */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));

let ok=0,ko=0; const L=[];
const v=(t,a,b)=>{const bon=JSON.stringify(a)===JSON.stringify(b); bon?ok++:ko++;
  L.push((bon?'  ✓ ':'  ✗ ')+t+(bon?'':`\n      attendu : ${JSON.stringify(b)}\n      obtenu  : ${JSON.stringify(a)}`));};
const vrai=(t,c)=>v(t,!!c,true);
const titre=t=>L.push('\n══ '+t+' ══\n');

(async()=>{
  const S=await ouvrir();
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const e=document.getElementById('hl-ecran'); if(e)e.remove(); return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; if(typeof enterApp==='function') enterApp(currentUser);
    try{ localStorage.setItem('elan_onboarded_'+currentUser.id,'1'); }catch(e){}
    /* des techniciens aux noms LONGS : un panneau trop étroit se voit sur un nom, pas sur « A » */
    if(!db.techniciens||db.techniciens.length<4){ db.techniciens=[
      {id:'t1',nom:'ANDRIEUX',prenom:'Alain',actif:true},{id:'t2',nom:'ALBERTINI',prenom:'Aline',actif:true},
      {id:'t3',nom:'IMBERT-ROUX',prenom:'Ivan',actif:true},{id:'t4',nom:'JULIENNE',prenom:'Jean',actif:true}]; save(); }
    return 1;`);
  await dormir(1000);

  const ranger=async()=>{ for(let k=0;k<4;k++){
    await S.ev(`const b=[...document.querySelectorAll('button,.btn')].find(x=>/Plus tard/.test(x.textContent||''));
      if(b) b.click(); try{ closeModal(); }catch(e){} try{ asstOpen=false; renderAsst(); }catch(e){} return 1;`);
    await dormir(300);
    const reste=await S.ev(`const o=document.querySelector('#overlay');
      return !!(o && getComputedStyle(o).display!=='none' && o.getBoundingClientRect().width>100);`);
    if(!reste) return true; } return false; };

  /* on CLIQUE chaque bouton de la barre : on ne suppose pas lequel ouvre un panneau */
  const passer=async(largeur)=>{
    const res=[];
    const n=await S.ev(`return document.querySelectorAll('.pf-bar button, .pf-bar .pf-b').length;`);
    for(let i=0;i<n;i++){
      const r=await S.ev(`
        document.body.click();
        await new Promise(r=>setTimeout(r,140));
        const b=[...document.querySelectorAll('.pf-bar button, .pf-bar .pf-b')][${i}];
        if(!b) return null;
        b.scrollIntoView({block:'center'});
        await new Promise(r=>setTimeout(r,220));
        /* ⛔ on mesure le bouton AVANT le clic : après, la barre est redessinée */
        const rb=b.getBoundingClientRect();
        const lib=(b.textContent||'').trim().replace(/\\s+/g,' ').slice(0,16)||'(icône)';
        if(rb.width<4) return { lib, invisible:true };
        b.click();
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        await new Promise(r=>setTimeout(r,280));
        const pan=document.querySelector('.pf-pan');
        if(!pan) return { lib, bouton:Math.round(rb.width), sansPanneau:true };
        const rp=pan.getBoundingClientRect();
        /* le plus long libellé du panneau, et s'il se coupe */
        const opts=[...pan.querySelectorAll('.pf-opt')];
        let coupe=0; opts.forEach(o=>{ const t=o.querySelector('b')||o;
          if(t.scrollWidth>t.clientWidth+1) coupe++; });
        return { lib, bouton:Math.round(rb.width), large:pan.classList.contains('large'),
                 x:Math.round(rp.x), droite:Math.round(rp.right), w:Math.round(rp.width),
                 opts:opts.length, coupe };`);
      if(r) res.push(r);
    }
    await S.ev(`document.body.click(); return 1;`);
    return res;
  };

  /* ── TÉLÉPHONE ── */
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  try{ await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',{insets:{top:47,bottom:34,left:0,right:0,topMax:47,bottomMax:34,leftMax:0,rightMax:0}}); }catch(e){}
  await S.ev(`setPlatForce('iosweb'); setThemePref('light'); go('planning'); return 1;`); await dormir(1800);
  vrai('population : l’écran est dégagé avant de mesurer', await ranger());
  const tel=await passer(390);

  titre('1. ⛔ TÉLÉPHONE (390 px) — AUCUN PANNEAU NE SORT DE L’ÉCRAN');
  const avecPan=tel.filter(r=>r.w);
  L.push('      '+tel.length+' boutons cliqués, '+avecPan.length+' ouvrent un panneau');
  avecPan.forEach(r=>L.push(`      « ${r.lib} » bouton ${r.bouton}px → panneau ${r.w}px (x ${r.x}→${r.droite})${r.large?' [large]':''}  ${r.opts} options, ${r.coupe} coupées`));
  vrai('population : au moins deux panneaux ont pu être ouverts', avecPan.length>=2);
  v('⛔ aucun panneau ne dépasse à droite', avecPan.filter(r=>r.droite>390).map(r=>r.lib+' jusqu’à x='+r.droite), []);
  v('⛔ aucun panneau ne dépasse à gauche', avecPan.filter(r=>r.x<0).map(r=>r.lib+' depuis x='+r.x), []);
  /* ⛔ LE DÉFAUT DE LA CAPTURE : un panneau aussi étroit que son bouton d'icône. Un menu
     lisible fait au moins 240 px sur un écran de 390 — en dessous, les noms passent à la
     ligne lettre par lettre, ce que Justin a photographié. */
  v('⛔ aucun panneau ne se mesure sur son bouton (≥ 240 px)', avecPan.filter(r=>r.w<240).map(r=>r.lib+' = '+r.w+'px'), []);
  v('⛔ aucun libellé ne se coupe dans un panneau', avecPan.filter(r=>r.coupe>0).map(r=>r.lib+' : '+r.coupe), []);

  /* ── ORDINATEUR : la contre-épreuve, rien ne doit avoir bougé ── */
  await S.c.envoyer('Emulation.clearDeviceMetricsOverride');
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:false});
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:2,mobile:false});
  await S.ev(`setPlatForce('macweb'); go('planning'); return 1;`); await dormir(1600);
  await ranger();
  const bur=await passer(1440);
  titre('2. ⛔ CONTRE-ÉPREUVE — L’ORDINATEUR N’A PAS BOUGÉ');
  const avecPanB=bur.filter(r=>r.w);
  L.push('      '+bur.length+' boutons cliqués, '+avecPanB.length+' ouvrent un panneau');
  avecPanB.forEach(r=>L.push(`      « ${r.lib} » → panneau ${r.w}px (x ${r.x}→${r.droite})${r.large?' [large]':''}`));
  vrai('population : au moins deux panneaux ouverts sur ordinateur', avecPanB.length>=2);
  v('aucun panneau ne sort de l’écran', avecPanB.filter(r=>r.droite>1440||r.x<0).map(r=>r.lib), []);
  /* ⚠️ Sur large écran le panneau garde sa largeur DESSINÉE (285 ou 330), il ne s’étale pas :
     c’est la règle d’origine, et la corriger « pour faire pareil » serait une régression. */
  v('⛔ … et il garde sa largeur dessinée (il ne prend pas toute la barre)',
    avecPanB.filter(r=>r.w>420).map(r=>r.lib+' = '+r.w+'px'), []);

  titre('3. AUCUNE ERREUR JAVASCRIPT');
  v('exceptions', S.exceptions, []);
  v('erreurs console', S.consoleErr.filter(x=>!/net::|Failed to load|favicon/i.test(x)), []);

  console.log(L.join('\n'));
  console.log(`\n════ sonde-menus : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});
