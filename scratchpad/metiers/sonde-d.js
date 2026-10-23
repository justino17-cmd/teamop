/* SONDE D — « QUAND ILS COCHENT, QUE ÇA EXPLIQUE », au navigateur. Pour la 3D, la plomberie, le chauffage et la piscine, jour ET nuit,
   1440 / 1100 px / téléphone 390 : (1) Paramètres → Mon métier, liste des rubriques conseillées dépliée ; (2) la grille des droits d'une
   personne (Utilisateurs → ligne dépliée → catégorie « Stock » dépliée) ; (3) « Modules OP ». Mesure : chaque rubrique montrée porte
   son explication VISIBLE (hauteur > 0, police ≥ 12 px, opacité 1, pas coupée), aucun défilement latéral, et capture.
   Usage : OUT=/chemin node sonde-d.js   ⛔ bêta seulement. */
const path=require('path'), os=require('os');
const {demarrer,dormir}=require('./lib.js');
const OUT=process.env.OUT||path.join(os.tmpdir(),'op-metiers-sonde-d');
const METIERS=process.argv.slice(2).length?process.argv.slice(2):['3d','plomberie','chauffage','piscine'];
(async()=>{
  const S=await demarrer({demo:false});
  console.log('page',S.version);
  await S.ev(`window.confirm=()=>true; window.equipeTeamOP=()=>true; window.metierBloque=function(k){ const p=metierPack(); return !!(p&&p.masque&&p.masque.indexOf(k)>=0); };
    db.users.push({id:'u2',prenom:'Marc',nom:'Dubois',login:'marc',role:'technicien',actif:true}); db.techniciens=[{id:'t1',nom:'Marc Dubois'}]; save(); return 1;`);
  let ok=0,ko=0; const ligne=(b,t)=>{ b?ok++:ko++; console.log((b?'  ✓ ':'  ✗ ')+t); };
  const mesureExpl=()=>S.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
    const xs=[...document.querySelectorAll('.pn-x, .met-rub-l span')]; 
    const faux=xs.filter(e=>{ const b=e.getBoundingClientRect(), s=getComputedStyle(e); return !(b.height>8 && b.width>40 && s.opacity==='1' && s.visibility!=='hidden' && s.display!=='none' && parseFloat(s.fontSize)>=12 && e.scrollWidth<=e.clientWidth+1); }).map(e=>(e.textContent||'').slice(0,40));
    window.scrollTo(9999,0); const sx=window.scrollX; window.scrollTo(0,0);
    return {n:xs.length,faux,sx};`);
  for(const [pn,theme] of (process.env.PROFILS?process.env.PROFILS.split(',').map(x=>x.split(':')):[['bureau','light'],['bureau','dark'],['b1100','dark'],['b1100','light'],['tel','dark'],['tel','light']])){
    await S.profil(pn,theme);
    for(const m of METIERS){
      await S.metier(m);
      // 1. Mon métier
      await S.ev(`go('parametres'); return 1;`); await dormir(900);
      /* les cartes des métiers (TEAM OP les voit toutes : 23) — capture avant de déplier la liste conseillée */
      const cartes=await S.ev(`const c=document.querySelector('.met-cards'); if(c) c.scrollIntoView({block:'start'}); window.scrollBy(0,-70); return {n:document.querySelectorAll('.met-card').length, on:(document.querySelector('.met-card.on .nm')||{}).textContent};`); await dormir(400);
      ligne(cartes.n===23 && !!cartes.on, `${pn} ${theme} ${m} · Mon métier : ${cartes.n} cartes de métier (TEAM OP), actif « ${cartes.on} »`);
      await S.snap(`${OUT}/${pn}-${theme}-${m}-cartes.png`);
      await S.ev(`const d=document.querySelector('details.met-rub'); if(d){ d.open=true; d.scrollIntoView({block:'start'}); } return 1;`); await dormir(500);
      let r=await mesureExpl(); await dormir(300); r=await mesureExpl();
      const attendu=await S.ev(`return ((METIERS['${m}']||{}).rubriques||[]).filter(k=>RUBRIQUES_INFO[k]).length;`);
      ligne(r.n===attendu && r.faux.length===0 && r.sx===0, `${pn} ${theme} ${m} · Mon métier : ${r.n}/${attendu} rubriques expliquées, ${r.faux.length} illisible(s), défilement latéral ${r.sx}`);
      /* `mesureExpl` remet la page en haut (pour lire la largeur) : on revient sur la liste AVANT la capture, sinon elle montre le haut de la page */
      await S.ev(`const d=document.querySelector('details.met-rub'); if(d) d.scrollIntoView({block:'start'}); window.scrollBy(0,-70); return 1;`); await dormir(400);
      await S.snap(`${OUT}/${pn}-${theme}-${m}-monmetier.png`);
      // 2. la grille des droits
      await S.ev(`go('utilisateurs'); return 1;`); await dormir(900);
      await S.ev(`usrDeplier('u2'); return 1;`); await dormir(700);
      await S.ev(`document.querySelectorAll('.usr-cat').forEach(d=>d.open=true); const c=document.querySelector('.usr-cat'); if(c) c.scrollIntoView({block:'start'}); return 1;`); await dormir(600);
      r=await mesureExpl(); await dormir(300); r=await mesureExpl();
      const menus=await S.ev(`return document.querySelectorAll('.usr-d input[data-d^="mod_"]').length;`);
      ligne(r.n>=Math.min(menus,36) && r.faux.length===0 && r.sx===0, `${pn} ${theme} ${m} · droits : ${r.n} explications pour ${menus} menus, ${r.faux.length} illisible(s), défilement latéral ${r.sx}`);
      await S.ev(`const c=document.querySelector('.usr-cat'); if(c) c.scrollIntoView({block:'start'}); window.scrollBy(0,-70); return 1;`); await dormir(400);
      await S.snap(`${OUT}/${pn}-${theme}-${m}-droits.png`);
      // 3. Modules OP
      await S.ev(`go('modulesElan'); return 1;`); await dormir(700);
      const mo=await S.ev(`const l=[...document.querySelectorAll('#content .pl-row')]; return {n:l.length, sans:l.filter(x=>!x.querySelector('.pl-meta')).length, sx:(window.scrollTo(9999,0),window.scrollX)};`);
      ligne(mo.n>0 && mo.sans===0 && mo.sx===0, `${pn} ${theme} ${m} · Modules OP : ${mo.n} rubriques, ${mo.sans} sans explication`);
      await S.snap(`${OUT}/${pn}-${theme}-${m}-modules.png`);
    }
  }
  console.log('\n'+ok+' ✓  '+ko+' ✗   · erreurs de page : '+JSON.stringify(S.exceptions.slice(0,3)));
  S.fermer();
})().catch(e=>{console.error(e);process.exit(1)});
