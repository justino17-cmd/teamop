/* ══ SONDE — UN SEUL ACCUEIL LE MATIN, ET PLUS DE LEIA ═════════════════════════════════════
   Justin, 23 septembre 2026 : « chaque matin pour tes techniciens, fais ce qui est le mieux ».
   Jusque-là un technicien qui avait des interventions recevait DEUX accueils à 200 ms d'écart :
   le panneau de Leia (« Petits rappels du jour ») ET le bandeau « Ta journée ».
   Puis, le soir même : « on supprime la bulle Leia, on supprime totalement, on fera un vrai
   agent dans le futur ». Plus de bulle, plus de bienvenue ni de rappels qu'elle ouvrait. Ce
   qu'elle était SEULE à dire (retards, factures impayées) est passé dans la cloche.

   On joue ici les situations d'un matin, avec le vrai `enterApp`, et on COMPTE ce qui s'affiche :
     A. technicien, interventions aujourd'hui (+ une en retard) → « Ta journée », retard compris
     B. le même, qui rouvre l'application dans la journée     → plus rien
     C. technicien sans intervention aujourd'hui, une en retard → rien ne s'ouvre ; le retard
        est dans la CLOCHE
     D. administrateur (lui aussi technicien, et occupé aujourd'hui) → rien ne s'ouvre ; la
        cloche dit le retard et les factures impayées
     E. tout premier lancement d'un technicien → plus de bienvenue (c'était Leia) ; la visite
        guidée et « Signaler un problème » sont dans Paramètres → Aide, et ils marchent
     G. au téléphone, le message se pose JUSTE au-dessus de la barre d'onglets (la bulle qu'il
        évitait est partie) — et remonte au-dessus du bouton d'OP MESSAGES quand il est là
   ⛔ Chaque cas compte d'abord sa POPULATION (un technicien lié, des interventions posées) : un
   « zéro accueil » sur un compte sans intervention ne prouverait rien.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1. SOURCE=<une bêta d'avant> pour la
   contre-épreuve : elle doit voir la bulle et les accueils de Leia.                          */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));

let ok=0,ko=0; const L=[];
const v=(t,a,b)=>{const bon=JSON.stringify(a)===JSON.stringify(b); bon?ok++:ko++;
  L.push((bon?'  ✓ ':'  ✗ ')+t+(bon?'':`\n      attendu : ${JSON.stringify(b)}\n      obtenu  : ${JSON.stringify(a)}`));};
const vrai=(t,c,d)=>{ c?ok++:ko++; L.push((c?'  ✓ ':'  ✗ ')+t+(c||d===undefined?'':'\n      obtenu  : '+JSON.stringify(d))); };
const titre=t=>L.push('\n══ '+t+' ══\n');

(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  L.push('      page mesurée : '+S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  try{ await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',{insets:{top:59,bottom:34,left:0,right:0,topMax:59,bottomMax:34,leftMax:0,rightMax:0}}); }catch(e){}
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser);
    /* un iPhone, pas un ordinateur à 390 px : sans ça, pas de barre d'onglets à mesurer */
    setPlatForce('iosweb'); return 1;`);
  await dormir(1200); await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);

  /* Un matin : on efface les marques « déjà vu aujourd'hui », on referme tout, on se connecte
     avec le vrai `enterApp`, et on relève ce qui s'est ouvert tout seul. Ce qui peut encore
     s'ouvrir : le bandeau, et — sur une bêta d'avant — le panneau de Leia. */
  const matin=async(js, garderMarques)=>{
    await S.ev(`try{ if(typeof asstOpen!=='undefined'){ asstOpen=false; asstMsgs.length=0; renderAsst(); } }catch(e){} try{ closeModal(); }catch(e){}
      const b=document.getElementById('fdr-banner'); if(b) b.remove();
      ${garderMarques?'':"Object.keys(localStorage).filter(k=>/(rappels_|fdr_)/.test(k)).forEach(k=>localStorage.removeItem(k));"}
      ${js} return 1;`);
    await dormir(3200);
    return S.ev(`const b=document.getElementById('fdr-banner');
      const leia=document.querySelector('.asst.open');
      return { bandeau: b ? b.textContent.replace(/\\s+/g,' ').trim() : '', leiaOuverte: !!leia,
               bulle: !!document.getElementById('assistant') && !!document.querySelector('#assistant .fab'),
               cloche: (typeof computeNotifs==='function' ? computeNotifs() : []).map(n=>String(n.txt||'').replace(/<[^>]+>/g,'')) };`);
  };
  const accueils=r=>(r.bandeau?1:0)+(r.leiaOuverte?1:0);

  /* La population : un technicien lié à un compte, une journée posée, une facture envoyée. */
  const pop=await S.ev(`const t=db.techniciens&&db.techniciens[0]; if(!t) return null; const J=d=>shiftDay(todayISO(),d);
    const ints=db.interventions.slice(0,5); if(ints.length<5) return null;
    const plan=[[0,'planifiee'],[0,'planifiee'],[-1,'planifiee'],[2,'planifiee'],[-3,'terminee']];
    ints.forEach((i,k)=>{ i.techId=t.id; i.techIds=[t.id]; i.date=J(plan[k][0]); i.heure=String(8+k).padStart(2,'0')+':30'; i.statut=plan[k][1]; });
    db.interventions.slice(5).forEach(i=>{ i.techIds=(i.techIds||[]).filter(x=>x!==t.id); if(i.techId===t.id) i.techId=''; if(i.date<todayISO()&&(i.statut==='planifiee'||i.statut==='encours')) i.statut='terminee'; });
    let u=db.users.find(x=>x.id==='u-tech');
    if(!u){ u={id:'u-tech',prenom:'Jean',nom:'Terrain',role:'technicien',techId:t.id,username:'jt',pass:'x',actif:true,pref:{}}; db.users.push(u); }
    const a=db.users.find(x=>x.role==='admin'); if(a) a.techId=t.id;
    db.factures=db.factures||[]; db.factures.forEach(f=>{ if(f.statut==='envoyee'||f.statut==='retard') f.statut='payee'; });
    db.factures.push({id:'f-sonde',num:'FA-SONDE',clientId:(db.clients[0]||{}).id||'',date:J(-20),statut:'envoyee',lignes:[]});
    save(); return {tech:t.id, jour:ints.filter(i=>i.date===todayISO()).length, retard:1, admin:!!a,
      impayees:(db.factures||[]).filter(f=>f.statut==='envoyee'||f.statut==='retard').length};`);
  titre('0. LA POPULATION EXISTE');
  vrai('un technicien, lié à un compte technicien ET à l’administrateur', pop && pop.tech && pop.admin, pop);
  v('deux interventions à lui aujourd’hui, une en retard, une facture impayée', pop && [pop.jour,pop.retard,pop.impayees], [2,1,1]);
  if(!pop){ console.log(L.join('\n')); S.fermer(); process.exit(1); }

  titre('A. TECHNICIEN, OCCUPÉ AUJOURD’HUI → « TA JOURNÉE », ET RIEN D’AUTRE');
  const A=await matin(`const u=db.users.find(x=>x.id==='u-tech'); localStorage.setItem('elanB_onboarded_'+u.id,'1'); currentUser=u; enterApp(u);`);
  L.push('      bandeau : « '+A.bandeau+' »');
  vrai('le bandeau « Ta journée » est là', /Ta journée : 2 interventions/.test(A.bandeau), A.bandeau);
  vrai('⛔ … et il dit le retard', /1 en retard/.test(A.bandeau), A.bandeau);
  v('⛔⛔ aucune bulle d’aide dans la page', A.bulle, false);
  v('⛔⛔ UN seul accueil', accueils(A), 1);
  /* Le rappel se pose juste au-dessus de la barre d'onglets — mesuré, pas lu dans la feuille. */
  const posB=await S.ev(`const b=document.getElementById('fdr-banner'), t=document.getElementById('tabbar');
    if(!b||!t) return null; const rb=b.getBoundingClientRect(), rt=t.getBoundingClientRect();
    return {ecart:Math.round(rt.top-rb.bottom), tabVisible:getComputedStyle(t).display!=='none'&&rt.height>0};`);
  vrai('⛔ le rappel se pose juste au-dessus de la barre d’onglets (entre 2 et 24 px, sans la toucher)',
    posB && posB.tabVisible && posB.ecart>=2 && posB.ecart<=24, posB);

  titre('B. LE MÊME, QUI ROUVRE L’APPLICATION DANS LA JOURNÉE → RIEN');
  const B=await matin(`const u=db.users.find(x=>x.id==='u-tech'); currentUser=u; enterApp(u);`, true);
  v('ni bandeau ni bulle : l’accueil du jour a déjà eu lieu', [accueils(B), B.bulle], [0, false]);

  titre('C. TECHNICIEN SANS INTERVENTION AUJOURD’HUI → RIEN NE S’OUVRE, LE RETARD EST DANS LA CLOCHE');
  const C=await matin(`const t='${pop.tech}';
    db.interventions.filter(i=>(i.techIds||[]).includes(t)&&i.date===todayISO()).forEach(i=>{ i.date=shiftDay(todayISO(),4); });
    save(); const u=db.users.find(x=>x.id==='u-tech'); currentUser=u; enterApp(u);`);
  v('pas de bandeau (il n’a rien aujourd’hui)', C.bandeau, '');
  v('⛔ rien ne s’ouvre tout seul', [accueils(C), C.bulle], [0, false]);
  vrai('⛔ la cloche dit son retard', C.cloche.some(x=>/1 intervention en retard/.test(x)), C.cloche);

  titre('D. ADMINISTRATEUR — LUI AUSSI TECHNICIEN, ET OCCUPÉ → LA CLOCHE, PAS DE BANDEAU');
  const D=await matin(`const t='${pop.tech}';
    db.interventions.filter(i=>(i.techIds||[]).includes(t)&&i.date===shiftDay(todayISO(),4)).forEach(i=>{ i.date=todayISO(); });
    save(); const a=db.users.find(x=>x.role==='admin'); currentUser=a; enterApp(a);`);
  v('pas de bandeau : un responsable a plus à voir que sa propre journée', D.bandeau, '');
  v('⛔ rien ne s’ouvre tout seul', [accueils(D), D.bulle], [0, false]);
  vrai('⛔ la cloche dit le retard', D.cloche.some(x=>/intervention.? en retard/.test(x)), D.cloche);
  vrai('⛔ … et la facture impayée (c’était Leia seule qui le disait)', D.cloche.some(x=>/1 facture impayée/.test(x)), D.cloche);

  titre('E. PREMIER LANCEMENT D’UN TECHNICIEN → PLUS DE BIENVENUE ; L’AIDE EST DANS SES PARAMÈTRES');
  const E=await matin(`const u=db.users.find(x=>x.id==='u-tech'); localStorage.removeItem('elanB_onboarded_'+u.id); currentUser=u; enterApp(u);`);
  /* Occupé aujourd'hui (deux interventions) : son accueil est « Ta journée ». Avant, la bienvenue
     de Leia passait À LA PLACE ; elle n'existe plus. */
  vrai('⛔ plus de bienvenue : le seul accueil est « Ta journée »', accueils(E)===1 && /Ta journée/.test(E.bandeau) && !E.bulle, E);
  const aide=await S.ev(`closeModal&&closeModal(); const b0=document.getElementById('fdr-banner'); if(b0) b0.remove();
    v0: if(currentUser.role!=='technicien') return {pasTech:currentUser.role};
    go('parametres'); await new Promise(r=>setTimeout(r,900));
    const cartes=[...document.querySelectorAll('#content .card')].filter(c=>/^\\s*Aide\\s*$/.test((c.querySelector('h3')||{}).textContent||''));
    const c=cartes[0]; if(!c) return {carte:false};
    const btns=[...c.querySelectorAll('button')].map(b=>({t:b.textContent.replace(/\\s+/g,' ').trim(), on:b.getAttribute('onclick')}));
    const n0=(db.journal||[]).length;
    signalerProbleme(); await new Promise(r=>setTimeout(r,500));
    const ta=document.querySelector('#overlay textarea[name=txt]'); const fenetre=!!ta;
    if(ta){ ta.value='La carte ne charge pas au dépôt de Nord'; ta.closest('form').requestSubmit(); }
    await new Promise(r=>setTimeout(r,400));
    const j=(db.journal||[]).find(x=>x.action==='Problème signalé'||x.a==='Problème signalé'||JSON.stringify(x).includes('La carte ne charge pas'));
    startTour(); await new Promise(r=>setTimeout(r,900));
    const tour=!!document.getElementById('tour-layer');
    try{ tourEnd(); }catch(e){}
    return {carte:true, btns, fenetre, trace:!!j, plus:(db.journal||[]).length-n0, tour, role:currentUser.role};`);
  vrai('⛔ un TECHNICIEN trouve une carte « Aide » dans ses Paramètres', aide.carte && aide.role==='technicien', aide);
  vrai('… avec la visite guidée et « Signaler un problème »', aide.carte && aide.btns.some(b=>/startTour\(\)/.test(b.on)) && aide.btns.some(b=>/signalerProbleme\(\)/.test(b.on)), aide.btns);
  vrai('⛔ « Signaler un problème » ouvre une vraie fenêtre (plus un prompt)', aide.fenetre, aide);
  vrai('⛔ … et le message arrive à l’Historique', aide.trace && aide.plus>=1, aide);
  vrai('⛔ la visite guidée se lance', aide.tour, aide);

  titre('G. AU TÉLÉPHONE, LE MESSAGE SE POSE JUSTE AU-DESSUS DE LA BARRE');
  const posT=await S.ev(`go('dashboard'); await new Promise(r=>setTimeout(r,700));
    const mesure=async()=>{ toast('Essai de position'); await new Promise(r=>setTimeout(r,900));
      const t=document.querySelector('.toast'), bar=document.getElementById('tabbar'); if(!t||!bar) return null;
      const rt=t.getBoundingClientRect(), rb=bar.getBoundingClientRect(); return Math.round(rb.top-rt.bottom); };
    const sans=await mesure();
    const f=document.getElementById('msg-flot'); let avec=null, flot=null;
    if(f){ f.style.display='flex'; await new Promise(r=>setTimeout(r,100)); avec=await mesure();
      const rf=f.getBoundingClientRect(), t=document.querySelector('.toast').getBoundingClientRect();
      flot=Math.round(rf.top-t.bottom); f.style.display='none'; }
    return {sans, avec, flot};`);
  vrai('⛔ sans bulle, le message est à moins de 24 px de la barre (il n’évite plus rien)', posT && posT.sans>=2 && posT.sans<=24, posT);
  vrai('⛔ contre-épreuve : quand le bouton d’OP MESSAGES est là, le message passe AU-DESSUS de lui', posT && posT.flot!==null && posT.flot>=2, posT);

  titre('F. AUCUNE ERREUR JAVASCRIPT');
  v('exceptions', S.exceptions, []);
  v('erreurs console', S.consoleErr.filter(x=>!/net::|Failed to load|favicon/i.test(x)), []);

  console.log(L.join('\n'));
  console.log(`\n════ sonde-accueil : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});
