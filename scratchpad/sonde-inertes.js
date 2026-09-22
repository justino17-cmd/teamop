/* ══ SONDE DES CLICS « SANS EFFET » — LES VÉRIFIER, PAS LES ACCUSER ══════════════════════
   La passe de clics (audit-clics2.js) range dans « sans effet observable » tout clic après
   lequel NI la vue, NI une fenêtre, NI l'empreinte de #content, NI le titre, NI le message
   n'ont bougé. C'est une liste de SUSPECTS : un clic peut agir hors de #content (classe de
   <body>, menu latéral, calque de carte, presse-papiers, stockage, données) sans que l'audit
   le voie. Cette sonde rejoue chaque suspect et regarde PARTOUT, avant de dire « inerte ».

   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : node scratchpad/sonde-inertes.js [tel|bureau]                                   */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
const PROFIL=process.argv[2]||'tel';
const P = PROFIL==='bureau' ? {plat:'macweb',w:1440,h:900,tac:false,theme:'light'} : {plat:'iosweb',w:390,h:844,tac:true,theme:'dark'};

/* [rubrique, sélecteur, texte (début), préparation éventuelle] */
/* SUSPECTS=bureau2 : les clics muets propres au BUREAU (second passage) */
const SUSPECTS_BUREAU2=[
  ['rapports','button.btn.ghost','Rédiger'],
  ['telecollecte','button.btn.ghost','＋ Encaissement oublié'],
  ['produits','button.btn','＋ Produit'],
  ['boxes','button.btn.ghost','Ajouter produit'],
  ['boiteMail','div','Réception'],
  ['boiteMail','button.btn.ghost','Gérer mes boîtes'],
  ['boiteMail','button.btn.ghost','Actualiser'],
];
const SUSPECTS_TOUS=[
  ['audit','div.tl-item','Droits repris'],
  ['planning','div.plm-th','SM Sophie Martin', `try{ planModeSet&&planModeSet('multi'); }catch(e){}`],
  ['planningGeneral','span','+'],
  ['planningGeneral','b','%'],
  ['planningGeneral','span.pf-ib','Le planning prend'],
  ['absences','button.btn.ghost','Revenir dessus'],
  ['carteInt','span','Tous'],
  ['carteInt','button.btn.ghost','Secteurs'],
  ['carteInt','span.chip','Satellite'],
  ['carteBox','span.chip','Satellite'],
  ['produits','button.btn.ghost','Copier la liste'],
  ['stock','div.kpi','À commander'],
  ['mouvements','div.kpi','Mouvements au journal'],
  ['saisieConso','button.btn.ghost','Remettre à zéro'],
  ['messagerie','button.btn','Envoyer'],
  ['boiteMail','button.btn.ghost','Boîtes'],
  ['bons','div','Par box'],
  ['validations','div.mvl',''],
  ['validations','div.pl-row',''],
  ['utilisateurs','button.btn.ghost','Poser un mot de passe provisoire'],
  ['modulesElan','button.btn','Afficher dans le menu'],
  ['modulesElan','button.btn','Masquer du menu'],
];
const SUSPECTS = process.env.LOT==='bureau2' ? SUSPECTS_BUREAU2 : SUSPECTS_TOUS;

const INSTANTANE=`
  const h=s=>{ let e=0; s=String(s||''); for(let i=0;i<s.length;i++) e=(e*31+s.charCodeAt(i))>>>0; return e; };
  const ls=[]; try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); ls.push(k+'='+(localStorage.getItem(k)||'').length); } }catch(e){}
  const t=document.querySelector('.toast.show,.toast,#toast');
  return {
    body:document.body.className, html:[...document.documentElement.attributes].map(a=>a.name+'='+a.value).join(' '),
    contenu:h(document.getElementById('content')&&document.getElementById('content').innerHTML),
    menu:h(document.querySelector('.sidebar')&&document.querySelector('.sidebar').innerHTML),
    couches:[...document.querySelectorAll('#overlay.open,#overlay2.open,.dp-fond,.creer-ov.on')].map(x=>x.id||x.className).join('|'),
    carte:document.querySelectorAll('.leaflet-overlay-pane path,.leaflet-marker-icon,.leaflet-tile').length,
    tuiles:[...document.querySelectorAll('.leaflet-tile')].slice(0,1).map(x=>(x.src||'').replace(/\\/\\d+\\/\\d+\\/\\d+.*/,'')).join(''),
    toast:(t&&t.textContent||'').trim().slice(0,80), y:Math.round(scrollY),
    ls:h(ls.sort().join('|')), db:h(JSON.stringify(db)).toString(),
    presse:window.__presse||'' };`;

(async()=>{
  const S=await ouvrir();
  console.log('  page mesurée : '+S.version+'  ·  '+PROFIL);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:P.w,height:P.h,deviceScaleFactor:P.tac?3:1,mobile:P.tac});
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:P.tac,maxTouchPoints:P.tac?5:1});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1300); await S.ev(`window.confirm=()=>true; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
  await S.ev(`try{ setPlatForce('${P.plat}'); }catch(e){} try{ setThemePref('${P.theme}'); }catch(e){} return 1;`); await dormir(600);
  /* le presse-papiers : on ÉCOUTE ce qui y est écrit, par les deux chemins */
  await S.ev(`window.__presse=''; try{ const w=navigator.clipboard&&navigator.clipboard.writeText&&navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText=(t)=>{ window.__presse='clipboard:'+String(t).length; return Promise.resolve(); }; }catch(e){}
    const ex=document.execCommand.bind(document); document.execCommand=function(c,...r){ if(c==='copy') window.__presse='execCommand:copy'; return ex(c,...r); };
    window.confirm=()=>false; window.prompt=()=>null; window.alert=()=>{}; return 1;`);
  for(const [k,sel,txt,prep] of SUSPECTS){
    await S.ev(`try{ closeModal(); }catch(e){} try{ go('${k}'); }catch(e){} window.scrollTo(0,0); return 1;`); await dormir(900);
    if(prep){ await S.ev(prep+'; return 1;'); await dormir(700); }
    const avant=await S.ev(INSTANTANE); const nErr=S.exceptions.length;
    const trouve=await S.ev(`const c=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>2&&b.height>2&&(e.textContent||'').trim().startsWith(${JSON.stringify(txt)}); });
      if(!c.length) return null; c[0].scrollIntoView({block:'center'}); c[0].click(); return (c[0].getAttribute('onclick')||'').slice(0,90)||'(écouteur)';`);
    if(trouve===null){ console.log('\n  ? '+k+' › '+sel+' « '+txt+' » : introuvable'); continue; }
    await dormir(900);
    const apres=await S.ev(INSTANTANE);
    const bouge=Object.keys(avant).filter(x=>String(avant[x])!==String(apres[x]));
    const err=S.exceptions.slice(nErr);
    console.log('\n  '+(bouge.length||err.length?'✓ AGIT':'✗ RIEN')+'  '+k+' › '+sel+' « '+txt+' »   onclick='+trouve);
    for(const x of bouge) console.log('       '+x+' : '+String(avant[x]).slice(0,70)+'  →  '+String(apres[x]).slice(0,70));
    if(err.length) console.log('       ⛔ exception : '+err.join(' | ').slice(0,160));
  }
  S.fermer();
})().catch(e=>{ console.error('ÉCHEC',e); process.exit(1); });
