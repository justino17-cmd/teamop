/* ══ LE PLANNING DANS TOUTES SES FORMES — 4 VUES × 3 DISPOSITIONS × 4 APPAREILS ═════════════
   Les sondes de charpente n'ouvraient le Planning que dans sa forme d'arrivée (vue Multi,
   « Planning seul »). Mesuré le 23 septembre 2026, les autres formes cachaient deux défauts :
   · « Côte à côte » en vue Multi : page à 413 px sur un iPhone de 390, 993 sur un iPad portrait
     (la colonne unique était un `1fr`, qui ne descend pas sous la grille des techniciens) ;
   · vues Jour et Semaine : le libellé de la période ne passait pas à la ligne — page à 366 et
     390 px sur un Android de 360.
   Pour chaque forme : la page tient-elle dans l'écran, et ce qui est large défile-t-il DANS son
   propre cadre ? (Au bureau, les 15 px de la barre de défilement verticale ne comptent pas.)
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : node scratchpad/sonde-planning.js   (SOURCE=<beta d'avant> pour la contre-épreuve)   */
const path=require('path');
const { ouvrir, dormir } = require(path.join(__dirname,'pilote.js')); const { profil, poserProfil } = require(path.join(__dirname,'profils.js'));
const SRC=process.env.SOURCE;
(async()=>{
  let ko=0;
  for (const nom of ['petitand','tel','ipad','bureau']) {
    const P=profil(nom); const S=await ouvrir(SRC?{source:SRC}:{}); await poserProfil(S,P);
    await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
      currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
    await dormir(1200); await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
    await S.ev(`window.confirm=()=>false; try{ closeModal(); }catch(e){} setPlatForce('${P.plat}'); go('planning'); return 1;`); await dormir(1500);
    const lignes=[];
    for (const mode of ['multi','jour','semaine','mois']) for (const disp of ['plan','cote','carte']) {
      await S.ev(`try{ planMode='${mode}'; planDispSet('${disp}'); }catch(e){} window.scrollTo(0,0); return 1;`); await dormir(1800);
      const lire=`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
        const sp=document.querySelector('#content .plm-split'); const rouleaux=sp?[...sp.querySelectorAll('*')].filter(e=>{ const q=getComputedStyle(e); return /auto|scroll/.test(q.overflowX)&&e.scrollWidth>e.clientWidth+2; }).length:0;
        return {page:document.documentElement.scrollWidth, split:!!sp, rouleaux};`;
      let r=await S.ev(lire); if(r.page>P.w){ await dormir(700); r=await S.ev(lire); }
      const ok=r.page<=P.w+(P.tac?0:15);   /* au bureau, la barre verticale (15 px) n'est pas un débordement */
      if(!ok) ko++;
      lignes.push((ok?'✓':'✗')+' '+mode+'/'+disp+' '+r.page+(r.rouleaux?' (défile dedans ×'+r.rouleaux+')':''));
    }
    console.log(nom.padEnd(9)+String(P.w).padStart(5)+'px  '+lignes.join(' · '));
    S.fermer();
  }
  console.log(ko? '\n  '+ko+' ✗' : '\n  toutes tiennent');
  process.exit(ko?1:0);
})().catch(e=>{ console.error('MORTE', e); process.exit(2); });
