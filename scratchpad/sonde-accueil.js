/* ══ SONDE — UN SEUL ACCUEIL LE MATIN ═══════════════════════════════════════════════════════
   Justin, 23 septembre 2026 : « chaque matin pour tes techniciens, fais ce qui est le mieux ».
   Jusque-là un technicien qui avait des interventions recevait DEUX accueils à 200 ms d'écart :
   le panneau de Leia (« Petits rappels du jour ») ET le bandeau « Ta journée ». La sonde « Ma
   journée » devait elle-même fermer Leia pour photographier le bandeau.

   On joue ici les situations d'un matin, avec le vrai `enterApp`, et on COMPTE ce qui s'affiche :
     A. technicien, interventions aujourd'hui (+ une en retard) → « Ta journée », retard compris
     B. le même, qui rouvre l'application dans la journée     → plus rien
     C. technicien sans intervention aujourd'hui, une en retard → les rappels de Leia
     D. administrateur (lui aussi technicien, et occupé aujourd'hui) → les rappels de Leia
     E. tout premier lancement d'un technicien                  → la bienvenue, rien d'autre
   ⛔ Chaque cas compte d'abord sa POPULATION (un technicien lié, des interventions posées) : un
   « zéro accueil » sur un compte sans intervention ne prouverait rien.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.                                     */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));

let ok=0,ko=0; const L=[];
const v=(t,a,b)=>{const bon=JSON.stringify(a)===JSON.stringify(b); bon?ok++:ko++;
  L.push((bon?'  ✓ ':'  ✗ ')+t+(bon?'':`\n      attendu : ${JSON.stringify(b)}\n      obtenu  : ${JSON.stringify(a)}`));};
const vrai=(t,c)=>v(t,!!c,true);
const titre=t=>L.push('\n══ '+t+' ══\n');

(async()=>{
  /* SOURCE=<une bêta d'avant> pour la contre-épreuve : elle doit voir les DEUX accueils. */
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  L.push('      page mesurée : '+S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);

  /* Un matin : on efface les marques « déjà vu aujourd'hui », on referme tout, on se connecte
     avec le vrai `enterApp`, et on relève ce qui s'est ouvert tout seul. */
  const matin=async(js, garderMarques)=>{
    await S.ev(`try{ asstOpen=false; asstMsgs.length=0; renderAsst(); }catch(e){} try{ closeModal(); }catch(e){}
      const b=document.getElementById('fdr-banner'); if(b) b.remove();
      ${garderMarques?'':"Object.keys(localStorage).filter(k=>/(rappels_|fdr_)/.test(k)).forEach(k=>localStorage.removeItem(k));"}
      ${js} return 1;`);
    await dormir(3200);
    return S.ev(`const b=document.getElementById('fdr-banner');
      const leia=(typeof asstOpen!=='undefined'&&asstOpen) ? (asstMsgs||[]).map(m=>String(m.t||'')).join(' | ') : '';
      return { bandeau: b ? b.textContent.replace(/\\s+/g,' ').trim() : '',
               leiaOuverte: !!(typeof asstOpen!=='undefined'&&asstOpen),
               rappels: /Petits rappels du jour/.test(leia), bienvenue: !!leia && !/Petits rappels du jour/.test(leia) };`);
  };
  const accueils=r=>(r.bandeau?1:0)+(r.leiaOuverte?1:0);

  /* La population : un technicien lié à un compte, une journée posée. */
  const pop=await S.ev(`const t=db.techniciens&&db.techniciens[0]; if(!t) return null; const J=d=>shiftDay(todayISO(),d);
    const ints=db.interventions.slice(0,5); if(ints.length<5) return null;
    const plan=[[0,'planifiee'],[0,'planifiee'],[-1,'planifiee'],[2,'planifiee'],[-3,'terminee']];
    ints.forEach((i,k)=>{ i.techId=t.id; i.techIds=[t.id]; i.date=J(plan[k][0]); i.heure=String(8+k).padStart(2,'0')+':30'; i.statut=plan[k][1]; });
    db.interventions.slice(5).forEach(i=>{ i.techIds=(i.techIds||[]).filter(x=>x!==t.id); if(i.techId===t.id) i.techId=''; });
    let u=db.users.find(x=>x.id==='u-tech');
    if(!u){ u={id:'u-tech',prenom:'Jean',nom:'Terrain',role:'technicien',techId:t.id,username:'jt',pass:'x',actif:true,pref:{}}; db.users.push(u); }
    const a=db.users.find(x=>x.role==='admin'); if(a) a.techId=t.id;
    save(); return {tech:t.id, jour:ints.filter(i=>i.date===todayISO()).length, retard:1, admin:!!a};`);
  titre('0. LA POPULATION EXISTE');
  vrai('un technicien, lié à un compte technicien ET à l’administrateur', pop && pop.tech && pop.admin);
  v('deux interventions à lui aujourd’hui, une en retard', pop && [pop.jour,pop.retard], [2,1]);
  if(!pop){ console.log(L.join('\n')); S.fermer(); process.exit(1); }

  titre('A. TECHNICIEN, OCCUPÉ AUJOURD’HUI → « TA JOURNÉE », ET RIEN D’AUTRE');
  const A=await matin(`const u=db.users.find(x=>x.id==='u-tech'); localStorage.setItem('elanB_onboarded_'+u.id,'1'); currentUser=u; enterApp(u);`);
  L.push('      bandeau : « '+A.bandeau+' »');
  vrai('le bandeau « Ta journée » est là', /Ta journée : 2 interventions/.test(A.bandeau));
  vrai('⛔ … et il dit le retard (la seule ligne de Leia qui n’y était pas)', /1 en retard/.test(A.bandeau));
  v('⛔⛔ Leia ne s’ouvre PAS en plus', A.leiaOuverte, false);
  v('⛔⛔ UN seul accueil', accueils(A), 1);

  titre('B. LE MÊME, QUI ROUVRE L’APPLICATION DANS LA JOURNÉE → RIEN');
  const B=await matin(`const u=db.users.find(x=>x.id==='u-tech'); currentUser=u; enterApp(u);`, true);
  v('ni bandeau ni Leia : l’accueil du jour a déjà eu lieu', accueils(B), 0);

  titre('C. TECHNICIEN SANS INTERVENTION AUJOURD’HUI → LES RAPPELS DE LEIA');
  const C=await matin(`const t='${pop.tech}';
    db.interventions.filter(i=>(i.techIds||[]).includes(t)&&i.date===todayISO()).forEach(i=>{ i.date=shiftDay(todayISO(),4); });
    save(); const u=db.users.find(x=>x.id==='u-tech'); currentUser=u; enterApp(u);`);
  v('pas de bandeau (il n’a rien aujourd’hui)', C.bandeau, '');
  vrai('⛔ les rappels de Leia s’ouvrent (son retard, entre autres)', C.rappels);
  v('UN seul accueil', accueils(C), 1);

  titre('D. ADMINISTRATEUR — LUI AUSSI TECHNICIEN, ET OCCUPÉ → LES RAPPELS DE LEIA');
  const D=await matin(`const t='${pop.tech}';
    db.interventions.filter(i=>(i.techIds||[]).includes(t)&&i.date===shiftDay(todayISO(),4)).forEach(i=>{ i.date=todayISO(); });
    save(); const a=db.users.find(x=>x.role==='admin'); currentUser=a; enterApp(a);`);
  v('pas de bandeau : un responsable a plus à voir que sa propre journée', D.bandeau, '');
  vrai('⛔ les rappels de Leia s’ouvrent', D.rappels);
  v('UN seul accueil', accueils(D), 1);

  titre('E. TOUT PREMIER LANCEMENT D’UN TECHNICIEN → LA BIENVENUE, RIEN D’AUTRE');
  const E=await matin(`const u=db.users.find(x=>x.id==='u-tech'); localStorage.removeItem('elanB_onboarded_'+u.id); currentUser=u; enterApp(u);`);
  vrai('la bienvenue s’ouvre', E.bienvenue);
  v('⛔ pas de bandeau par-dessus', E.bandeau, '');
  v('UN seul accueil', accueils(E), 1);

  titre('F. AUCUNE ERREUR JAVASCRIPT');
  v('exceptions', S.exceptions, []);
  v('erreurs console', S.consoleErr.filter(x=>!/net::|Failed to load|favicon/i.test(x)), []);

  console.log(L.join('\n'));
  console.log(`\n════ sonde-accueil : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});
