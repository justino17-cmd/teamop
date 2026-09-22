/* ══ SONDE DES CIBLES AU DOIGT — CE QUI RÉPOND VRAIMENT, PAS CE QUI SE DESSINE ═════════════
   L'audit des écrans profonds mesure le RECTANGLE d'un élément. Or un doigt ne touche pas un
   rectangle : il touche un point, et ce point déclenche ce que `elementFromPoint` y trouve —
   l'élément lui-même, son libellé (`label.control`), ou la rangée `.frow` qui fait suivre le
   tap à son champ unique. Cette sonde mesure donc la ZONE QUI RÉPOND : sur la verticale qui
   passe par le centre de l'élément, combien de pixels d'affilée déclenchent CET élément.

   Elle sert à deux choses : décrire chaque famille avant de la corriger (structure, règles
   calculées), et prouver après coup que la zone a grandi — au navigateur, pas à la relecture.

   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1 (pilote.js).
   Usage : node scratchpad/sonde-cibles.js [scénario…]                                      */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
const P={plat:'iosweb', w:390, h:844, theme:'dark'};

/* chaque scénario atteint un écran par la fonction même que son bouton appelle */
const SCENARIOS={
  intervention:{ va:`formIntervention();`, racine:'#overlay .modal' },
  compteRendu:{ va:`formRapport(db.interventions[0].id);`, racine:'#overlay .modal' },
  box:{ va:`formBox();`, racine:'#overlay .modal' },
  produit:{ va:`formProduit();`, racine:'#overlay .modal' },
  absence:{ va:`formAbsence();`, racine:'#overlay .modal' },
  codeAssistant:{ va:`adDemanderCode();`, racine:'#overlay .modal' },
  xylo:{ va:`formDevisXylo();`, racine:'#overlay .modal' },
  planningEquipe:{ va:`go('planning'); await new Promise(r=>setTimeout(r,900)); planDD('equipe');`, racine:'#content' },
  planningJours:{ va:`go('planning'); await new Promise(r=>setTimeout(r,900)); planDD('jours');`, racine:'#content' },
  planningGeneral:{ va:`go('planningGeneral');`, racine:'#content' },
  quiAfficher:{ va:`go('planningGeneral'); await new Promise(r=>setTimeout(r,900)); pgPersListe();`, racine:'#pg-perslist .dp' },
  mouvements:{ va:`go('mouvements');`, racine:'#content' },
  mouvementsBox:{ va:`go('mouvements'); await new Promise(r=>setTimeout(r,700)); mvtMenu('box');`, racine:'#content' },
  interventions:{ va:`go('interventions');`, racine:'#content' },
  comptabilite:{ va:`go('comptabilite');`, racine:'#content' },
  telecollecte:{ va:`go('telecollecte');`, racine:'#content' },
  fiche:{ va:`go('interventions'); await new Promise(r=>setTimeout(r,700)); renderIntDetail((db.interventions.find(i=>i.statut==='terminee')||db.interventions[0]).id);`, racine:'#content' },
  ficheTech:{ va:`go('planningGeneral'); await new Promise(r=>setTimeout(r,900)); (document.querySelector('.pg-pers[onclick]')||{click(){}}).click();`, racine:'#content' },
};

const MESURE=(racine)=>`
  const R=document.querySelector(${JSON.stringify(racine)}); if(!R) return {erreur:'racine absente : '+${JSON.stringify(racine)}};
  const SEL='button,.btn,.chip,.tab,.tchip,.pf-b,.pf-opt,.seg span,.seg button,a[href],[onclick],.pl-row,.list-row,input,select,textarea';
  const vis=e=>{ const b=e.getBoundingClientRect(); if(b.width<6||b.height<6) return false;
    const st=getComputedStyle(e); return st.visibility!=='hidden'&&st.display!=='none'&&+st.opacity>0.05; };
  const nom=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');
  const champUnique=r=>{ const c=r.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]),select,textarea'); return c.length===1?c[0]:null; };
  /* ce qu'un tap en (x,y) déclenche : l'élément lui-même, son libellé, ou la rangée qui fait suivre */
  const declenche=(e,x,y)=>{
    const h=document.elementFromPoint(x,y); if(!h) return false;
    if(h===e||e.contains(h)) return true;
    const lab=h.closest&&h.closest('label'); if(lab&&lab.control===e) return true;
    /* ce que fait l’écouteur de l’application : la rangée .frow, puis l'ENROBE d'un champ
       (premier ancêtre à quatre crans au plus qui porte un champ en enfant direct : un seul,
       et 64 px de haut au plus) — même règle, recopiée pour mesurer ce qu'elle rend */
    if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && !h.closest('input,select,textarea,button,a,label,.chip,[onclick],[contenteditable="true"]')){
      const r=h.closest&&h.closest('.frow');
      if(r) return r.contains(e)&&champUnique(r)===e;
      const CH='input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]),select,textarea';
      for(let n=h,k=0; n&&n!==document.body&&k<4; n=n.parentElement,k++){
        const f=[...n.children].filter(x=>x.matches(CH));
        if(!f.length) continue;
        return f.length===1 && f[0]===e && n.getBoundingClientRect().height<=64;
      }
    }
    return false; };
  const etendue=(e,axe)=>{ const b=e.getBoundingClientRect(); const cx=b.left+b.width/2, cy=b.top+b.height/2;
    let n=0; for(const s of [1,-1]){ for(let d=(s>0?0:1); d<=30; d++){
      const x=axe==='y'?cx:cx+s*d, y=axe==='y'?cy+s*d:cy;
      if(x<0||y<0||x>=innerWidth||y>=innerHeight) break;
      if(declenche(e,x,y)) n++; else break; } }
    return n; };
  const out=[], ecartes=[];
  /* HORS DE L'ÉCRAN — hors conteneur qui défile par construction */
  const dansRouleau=e=>{ let n=e.parentElement; while(n&&n!==document.body){ const st=getComputedStyle(n);
    if(/auto|scroll/.test(st.overflowX)&&n.scrollWidth>n.clientWidth+4) return true; n=n.parentElement; } return false; };
  const hors=[...new Set(R.querySelectorAll(SEL))].filter(vis).filter(e=>{ const b=e.getBoundingClientRect();
    return (b.left<-1.5||b.right>innerWidth+1.5)&&!dansRouleau(e)&&!e.closest('.sidebar:not(.open)'); })
    .map(e=>nom(e)+' x '+Math.round(e.getBoundingClientRect().left)+'→'+Math.round(e.getBoundingClientRect().right));
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  for(const e of [...new Set(R.querySelectorAll(SEL))].filter(vis)){
    let b=e.getBoundingClientRect();
    if(b.height>=37.5) continue;
    /* ⛔ ÉCARTÉS PAR DÉCISION ÉCRITE (app.html, bloc « au doigt ») : les cases des grilles de
       planning et de la frise. Comptés à part et NOMMÉS, jamais passés sous silence. */
    if(e.closest('.pg-pt,.tdb-pc,.tdb-cel,.plm-card,.tbl')){ ecartes.push(nom(e)); continue; }
    if(e.tagName==='INPUT'&&/checkbox|radio/.test(e.type)) continue;
    e.scrollIntoView({block:'center',inline:'nearest'});
    await new Promise(r=>requestAnimationFrame(r));
    b=e.getBoundingClientRect();
    const st=getComputedStyle(e);
    const chaine=[]; let p=e.parentElement; for(let k=0;k<4&&p&&p!==R;k++,p=p.parentElement) chaine.push(nom(p));
    out.push({ n:nom(e), t:(e.textContent||e.value||e.placeholder||'').trim().replace(/\\s+/g,' ').slice(0,30),
      h:Math.round(b.height*10)/10, w:Math.round(b.width), effH:etendue(e,'y'), effW:etendue(e,'x'),
      css:{pad:st.paddingTop+'/'+st.paddingBottom, minH:st.minHeight, fs:st.fontSize, lh:st.lineHeight, disp:st.display},
      style:(e.getAttribute('style')||'').slice(0,110), chaine:chaine.join(' < '),
      html:e.outerHTML.replace(/\\s+/g,' ').slice(0,170) });
  }
  return {out, ecartes, hors};`;

(async()=>{
  const choix=process.argv.slice(2); const liste=choix.length?choix:Object.keys(SCENARIOS);
  const S=await ouvrir();
  console.log('  page mesurée : '+S.version+'  ·  '+P.plat+' '+P.w+'×'+P.h);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:P.w,height:P.h,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){}
    const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){}; return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0];
    try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){}
    if(typeof enterApp==='function') enterApp(currentUser); return 1;`);
  await dormir(1300);
  await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`);
  await dormir(2500);
  await S.ev(`try{ setPlatForce('${P.plat}'); }catch(e){} try{ setThemePref('${P.theme}'); }catch(e){} try{ setAccent('green'); }catch(e){}
    window.confirm=()=>false; return 1;`);
  await dormir(800);
  /* ⛔ on prouve que le doigt est bien simulé : sans (pointer:coarse), aucune règle tactile */
  const coarse=await S.ev(`return matchMedia('(pointer:coarse)').matches;`);
  console.log('  (pointer:coarse) : '+coarse+(coarse?'':'   ⛔ LES RÈGLES TACTILES NE S’APPLIQUENT PAS — mesure sans valeur'));
  for(const k of liste){
    const sc=SCENARIOS[k]; if(!sc){ console.log('\n  scénario inconnu : '+k); continue; }
    await S.ev(`try{ closeModal(); }catch(e){} document.querySelectorAll('.dp-fond').forEach(x=>{ try{x.click();}catch(e){} }); return 1;`);
    await dormir(400);
    try{ await S.ev(sc.va+' return 1;'); }catch(e){ console.log('\n══ '+k+' : ÉCHEC POUR ATTEINDRE L’ÉCRAN — '+e.message.split('\n')[0]); continue; }
    await dormir(1100);
    const R0=await S.ev(MESURE(sc.racine));
    if(R0&&R0.erreur){ console.log('\n══ '+k+' : '+R0.erreur); continue; }
    const r=R0.out;
    console.log('\n══ '+k+' : '+r.length+' cible(s) dessinée(s) sous 38 px'+(R0.ecartes.length?'  · écartées par décision (grilles denses) : '+R0.ecartes.length+' ('+[...new Set(R0.ecartes)].join(', ')+')':'')+' ══');
    if(R0.hors.length) console.log('  ⛔ HORS DE L’ÉCRAN : '+R0.hors.length+' — '+R0.hors.slice(0,4).join(' · '));
    for(const x of r){
      const ok = x.effH>=38;
      console.log('  '+(ok?'✓':'✗')+' '+String(x.h).padStart(5)+' px dessiné · '+String(x.effH).padStart(3)+' px qui répondent · '+x.n+' « '+x.t+' »');
      if(process.env.DETAIL) console.log('       css '+JSON.stringify(x.css)+'\n       style '+x.style+'\n       dans '+x.chaine+'\n       html '+x.html);
    }
  }
  if(S.exceptions.length) console.log('\n  ⛔ exceptions : '+S.exceptions.slice(0,5).join(' || '));
  S.fermer();
})().catch(e=>{ console.error('ÉCHEC', e); process.exit(1); });
