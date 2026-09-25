/* ══ SONDE — CE QUE LES BOUTONS FLOTTANTS CACHENT, ET CE QUE « VOIR SUR LA CARTE » MONTRE ══════
   Vidéo de Justin, iPhone, 23 septembre 2026 : sur le Planning, la bulle 💬 de l'assistant était
   posée SUR la flèche « jours suivants » du bandeau des jours, et « Voir sur la carte », empilé
   au-dessus d'elle, flottait au milieu de l'écran. Les audits d'avant ne pouvaient pas le voir :
   pour savoir si une commande est recouverte, ils l'amenaient au MILIEU de l'écran
   (`scrollIntoView({block:'center'})`, la règle de `CLAUDE.md` contre les faux « recouverts » des
   barres fixes) — c'est-à-dire exactement hors de la zone des boutons flottants.
   Trois questions, au téléphone (iPhone de 402 px, encoches posées) :
   1. à l'OUVERTURE de chaque écran, page en haut : pour chaque commande visible, la pile sous son
      centre et ses quatre coins (`elementsFromPoint`) — le premier élément est-il un bouton
      flottant ? Un centre caché = le doigt tomberait sur le bouton flottant.
   2. en BAS de page : tout doit pouvoir sortir de dessous (le contenu dégage ce qui flotte).
   3. « Voir sur la carte », touché POUR DE VRAI (`Input.dispatchTouchEvent`) dans les vues
      semaine, jour et mois : la carte doit être ENTIÈREMENT entre la barre du haut et la barre
      d'onglets. Mesuré sur la v731 : elle s'ouvrait à 2 187 px, sous tout le planning.
   ⚠️ La bulle d'assistance (Leia) cachait encore, selon la hauteur de l'écran, une commande ou
   deux à l'ouverture. Justin a tranché le 23 septembre 2026 au soir : « on supprime la bulle
   Leia, totalement ». Elle reste comptée À PART — et désormais ce compte DOIT être zéro, sur une
   page qui ne porte plus la bulle du tout (sur une bêta d'avant, la contre-épreuve la retrouve).
   ⛔ On compte la population (écrans, commandes regardées, vues de carte jouées).
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.                                     */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
/* Ce qui flotte AU-DESSUS du contenu, en bas de l'écran. ⚠️ Pas `.creer-btn` : c'est le « ＋ Créer »
   de la barre du HAUT — du contenu qui défile sous une barre fixe n'est pas « caché » (la première
   version de cette sonde l'a cru, en bas de page : trois faux défauts). */
const FLOTTANTS='.plm-fab, #assistant > .fab, #assistant > button, .fab, #fdr-banner';
const BULLE='#assistant > .fab';

(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  console.log('page mesurée :',S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} try{ mvtDemoPoser(); }catch(e){} return 1;`); await dormir(2000);
  await S.ev(`if(document.startViewTransition&&!window.__vtSuivi){ window.__vtSuivi=1; window.__vtN=0; const o=document.startViewTransition.bind(document);
    document.startViewTransition=function(cb){ window.__vtN++; const vt=o(cb); const f=()=>{ window.__vtN--; }; vt.finished.then(f,f); return vt; }; } return 1;`);
  const calme=async()=>{ for(let i=0;i<50;i++){ if(await S.ev(`return !(window.__vtN>0) && !document.querySelector('.content.entre');`)) break; await dormir(100); }
    await S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`); };
  const HAUT=+(process.env.HAUT||874);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:402,height:HAUT,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  try{ await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',{insets:{top:59,bottom:34,left:0,right:0,topMax:59,bottomMax:34,leftMax:0,rightMax:0}}); }catch(e){}
  await S.ev(`setPlatForce('iosweb'); setThemePref('light'); return 1;`); await dormir(500);
  let ko=0, ok=0; const vrai=(t,c,d)=>{ if(c){ ok++; console.log('  ✓ '+t); } else { ko++; console.log('  ✗ '+t+(d!==undefined?'  → '+JSON.stringify(d):'')); } };

  /* La pile sous une commande : on rend, pour chaque point caché, QUI le cache. */
  const relever=`const FL=${JSON.stringify(FLOTTANTS)}, BU=${JSON.stringify(BULLE)};
    const cmd=[...document.querySelectorAll('#content button, #content [onclick], #content a[href], #content input, #content select, #content .chip, #content .pld-j, #page-head button')]
      .filter(e=>{ if(e.closest(FL)) return false; const q=e.getBoundingClientRect(); if(q.width<4||q.height<4) return false;
        const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none') return false;
        return q.bottom>0 && q.top<innerHeight && q.right>0 && q.left<innerWidth; });
    const out=[];
    cmd.forEach(e=>{ const q=e.getBoundingClientRect();
      const pts=[[q.left+q.width/2,q.top+q.height/2],[q.left+3,q.top+3],[q.right-3,q.top+3],[q.left+3,q.bottom-3],[q.right-3,q.bottom-3]]
        .filter(([x,y])=>x>=0&&y>=0&&x<innerWidth&&y<innerHeight);
      const sous=pts.map(([x,y])=>{ const t=document.elementFromPoint(x,y); const f=t&&t.closest?t.closest(FL):null; return f?(f.matches(BU)?'bulle':(f.id||String(f.className).split(' ')[0]||'flottant')):''; });
      const n=sous.filter(Boolean).length;
      if(n) out.push({t:(e.getAttribute('aria-label')||e.textContent||e.value||e.tagName).replace(/\\s+/g,' ').trim().slice(0,40), cl:String(e.className||e.tagName).slice(0,40),
        centre:!!sous[0], coins:n, par:[...new Set(sous.filter(Boolean))].join('+'), y:Math.round(q.top)}); });
    return {n:cmd.length, out};`;

  const vues=await S.ev(`return NAV.flatMap(s=>s.items).filter(it=>{ try{ return canSee(it); }catch(e){ return false; } }).map(it=>it.k)
    .concat(['carteBox','produitsDonnes']).filter((k,i,a)=>views[k]&&a.indexOf(k)===i);`);
  const haut=[], bas=[]; let regardees=0, regardeesBas=0, ecrans=0;
  for(const v of vues){
    await S.ev(`try{ closeModal(); }catch(e){} try{ asstOpen=false; renderAsst(); }catch(e){} try{ if('${v}'==='planning') planDispSet('plan'); }catch(e){} try{ go('${v}'); }catch(e){} window.scrollTo(0,0); return 1;`);
    await dormir(700); await calme();
    await S.ev(`try{ closeModal(); }catch(e){} try{ asstOpen=false; renderAsst(); }catch(e){} window.scrollTo(0,0); return 1;`); await calme();
    ecrans++;
    const r=await S.ev(relever); regardees+=r.n; r.out.forEach(o=>haut.push({vue:v,...o}));
    await S.ev(`window.scrollTo(0,1e6); return 1;`); await dormir(250); await calme();
    const b=await S.ev(relever); regardeesBas+=b.n; b.out.forEach(o=>bas.push({vue:v,...o}));
  }

  console.log(`\n══ 1. À L'OUVERTURE, PAGE EN HAUT ══\npopulation : ${ecrans} écrans, ${regardees} commandes visibles regardées (iPhone 402 × ${HAUT})`);
  vrai('population : plus de 30 écrans et 150 commandes regardées', ecrans>30 && regardees>150, {ecrans,regardees});
  const graves=haut.filter(c=>c.centre && c.par!=='bulle');
  vrai('⛔ aucune commande n’a son CENTRE sous un bouton flottant autre que la bulle d’assistance', !graves.length, graves.map(c=>c.vue+' — « '+c.t+' » sous '+c.par));
  const surPlanning=haut.filter(c=>c.vue==='planning' && c.centre);
  vrai('⛔ sur le Planning, aucun centre caché — ni par « Voir sur la carte », ni par la bulle', !surPlanning.length, surPlanning.map(c=>'« '+c.t+' » sous '+c.par));
  const parBulle=haut.filter(c=>c.centre && c.par==='bulle');
  parBulle.forEach(c=>console.log(`     · ${c.vue} — « ${c.t} » (${c.cl}) y ${c.y}`));
  vrai('⛔ la bulle d’assistance est RETIRÉE : aucune commande cachée par elle, et plus de bulle dans la page',
    !parBulle.length && !(await S.ev(`return !!document.querySelector('#assistant, .fab')`)), parBulle.length);
  const effleures=haut.filter(c=>!c.centre);
  console.log(`  (commandes seulement effleurées — un coin, pas le centre : ${effleures.length})`);

  console.log(`\n══ 2. EN BAS DE PAGE : TOUT PEUT SORTIR DE DESSOUS ══\npopulation : ${regardeesBas} commandes regardées`);
  vrai('population : plus de 100 commandes regardées en bas de page', regardeesBas>100, regardeesBas);
  const basGraves=bas.filter(c=>c.centre);
  vrai('⛔ en bas de page, AUCUN centre caché (le contenu dégage tout ce qui flotte)', !basGraves.length, basGraves.map(c=>c.vue+' — « '+c.t+' » sous '+c.par));

  console.log('\n══ 3. « VOIR SUR LA CARTE » MONTRE LA CARTE (vrai toucher) ══');
  /* Des interventions sur la semaine en cours, pour que chaque vue ait quelque chose à placer. */
  await S.ev(`const sem=weekDays(todayISO()); let k=0; db.interventions.slice(0,10).forEach(i=>{ i.date=(k<5)?todayISO():sem[k%7]; i.heure=String(8+k%8).padStart(2,'0')+':00'; i.statut='planifiee'; k++; }); save(); return k;`);
  let jouees=0;
  for(const mode of ['semaine','jour','mois']){
    await S.ev(`try{ closeModal(); }catch(e){} planDispSet('plan'); planMode='${mode}'; planSel=todayISO(); planWeekRef=todayISO(); go('planning'); return 1;`);
    await dormir(900); await calme(); await S.ev(`window.scrollTo(0,0); return 1;`); await calme();
    const avant=await S.ev(`const f=document.querySelector('.plm-fab'), b=document.querySelector('.ph-actions .plan-carte-tete');
      const pos=e=>{ const q=e?e.getBoundingClientRect():null; return q&&q.width?{x:q.left+q.width/2,y:q.top+q.height/2,h:Math.round(q.height),dessus:document.elementFromPoint(q.left+q.width/2,q.top+q.height/2)===e}:null; };
      return {pilule:pos(f), bouton:pos(b)};`);
    vrai(`${mode} : « Voir sur la carte » ne flotte plus`, !avant.pilule);
    vrai(`${mode} : … il est dans les actions de l’écran, visible, atteignable, ≥ 42 px`, !!(avant.bouton&&avant.bouton.dessus&&avant.bouton.h>=42), avant.bouton);
    /* Sur une bêta d'avant (contre-épreuve), il n'y a que le bouton flottant : on le touche LUI,
       pour que la question qui compte — la carte se voit-elle ? — ait quand même sa réponse. */
    const cible=avant.bouton||avant.pilule;
    if(!cible){ vrai(`${mode} : un « Voir sur la carte » à toucher existe`, false); continue; }
    await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cible.x,y:cible.y}]});
    await dormir(60); await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await dormir(1600); await calme();
    const apres=await S.ev(`const m=document.getElementById('plm-map'), tb=document.querySelector('.topbar'), tab=document.getElementById('tabbar');
      if(!m) return {disp:planDisp(), carte:null};
      const q=m.getBoundingClientRect(), h=tb?tb.getBoundingClientRect().bottom:0, qt=tab?tab.getBoundingClientRect():null;
      const b=(qt&&qt.height>0&&qt.top<innerHeight)?qt.top:innerHeight;
      return {disp:planDisp(), carte:[Math.round(q.top),Math.round(q.bottom)], zone:[Math.round(h),Math.round(b)], dedans:q.top>=h-1 && q.bottom<=b+1 && q.height>100};`);
    jouees++;
    vrai(`${mode} : ⛔ après le toucher, la carte est ENTIÈREMENT sous les yeux (entre les deux barres)`, apres.disp==='cote' && !!apres.dedans, apres);
  }
  vrai('population : les trois vues ont été jouées', jouees===3, jouees);

  console.log('\nexceptions :',JSON.stringify(S.exceptions.slice(0,5)));
  vrai('aucune erreur JavaScript', !S.exceptions.length, S.exceptions.slice(0,3));
  console.log(`\n════ sonde-flottants : ${ok} ✓ ${ko} ✗ ════`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});
