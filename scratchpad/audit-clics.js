/* ══ AUDIT DES CLICS — PASSE B : ON APPUIE VRAIMENT SUR CHAQUE BOUTON ═══════════════════
   Justin, 22 septembre 2026 : « bouton par bouton, catégorie par catégorie ».
   `audit-total.js` MESURE ce qui est rendu. Il ne clique pas — et un bouton peut être
   parfaitement dessiné, parfaitement atteignable, et jeter une exception au premier appui.

   Ce qu'on cherche, NOMMÉ AVANT de chercher :
   1. ERREUR — le clic jette. C'est le défaut qui se voit chez le client.
   2. INERTE — le clic ne change RIEN d'observable : ni fenêtre, ni vue, ni écran, ni
      message. Ce n'est pas forcément un défaut (un bouton peut écrire dans la base sans
      rien repeindre) : on le RAPPORTE, on ne l'accuse pas.
   3. ÉCARTÉ — ce qu'on refuse de cliquer, NOMMÉ un par un (une déconnexion tuerait la
      passe). « Pas de plafond silencieux » : ce qui est sauté est écrit.

   ⛔ PIÈGES ENCODÉS ICI, tous payés dans ce dépôt :
   · UNE RÉFÉRENCE PRISE AVANT LE CLIC EST MORTE APRÈS — `rendreVueSure` réécrit `#content`.
     On ne garde donc AUCUN nœud : on ré-énumère et on vise par INDEX à chaque tour.
   · UNE EXCEPTION DANS UN ÉCOUTEUR NE REMONTE PAS À `el.click()` — elle part au gestionnaire
     global. On écoute donc `Runtime.exceptionThrown`, et on le PROUVE avec un bouton
     volontairement cassé avant de croire un zéro.
   · `document.body.innerHTML` CONTIENT LE CODE SOURCE (fichier unique) — on lit `#content`.
   · L'ÉCRAN « CONNEXION REQUISE » couvre tout au premier contrôle de santé raté.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.                                   */
const fs=require('fs'), path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));

/* ⛔ CE QU'ON NE CLIQUE PAS, ET POURQUOI — la liste est courte et elle est écrite. */
const ECARTS=[
  [/déconnexion|se déconnecter|quitter l'espace|changer d'espace/i,'sortirait de la session et tuerait la passe'],
  [/^(réinitialiser|repartir à neuf|tout effacer|vider la base)/i,'détruit la base d’essai sous la passe'],
];

(async()=>{
  const S=await ouvrir();
  console.log('  page mesurée : '+S.version);

  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const e=document.getElementById('hl-ecran'); if(e)e.remove(); return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; if(typeof enterApp==='function') enterApp(currentUser);
    try{ localStorage.setItem('elan_onboarded_'+currentUser.id,'1'); }catch(e){} return 1;`);
  await dormir(1200);
  await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`);
  await dormir(2500);

  /* ── LES GARDE-FOUS. Après eux, plus rien ne se confirme et rien ne quitte la page. ── */
  await S.ev(`
    window.confirm=()=>false; window.alert=()=>{}; window.prompt=(q,d)=>null; window.print=()=>{};
    window.open=()=>null;
    try{ HTMLFormElement.prototype.submit=function(){}; }catch(e){}
    /* une ancre qui sort de la page tuerait la passe : on la neutralise à la capture */
    document.addEventListener('click',ev=>{ const a=ev.target&&ev.target.closest&&ev.target.closest('a[href]');
      if(a){ const h=a.getAttribute('href')||''; if(h&&!/^#|^javascript:/i.test(h)){ ev.preventDefault(); } } },true);
    return 1;`);

  const ranger=async()=>{ for(let k=0;k<6;k++){
    await S.ev(`const b=[...document.querySelectorAll('button,.btn')].find(x=>/Plus tard|Fermer|Non merci|Annuler/.test(x.textContent||''));
      if(b) b.click(); try{ closeModal(); }catch(e){} try{ if(typeof closeModal2==='function') closeModal2(); }catch(e){}
      try{ asstOpen=false; renderAsst(); }catch(e){} return 1;`);
    await dormir(200);
    const r=await S.ev(`const o=document.querySelector('#overlay'), o2=document.querySelector('#overlay2');
      const ouv=n=>!!(n&&getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().width>100);
      return ouv(o)||ouv(o2)||!!document.querySelector('.asst.open');`);
    if(!r) return true; } return false; };

  /* ── LE RECENSEMENT D'UN ÉCRAN. On ne rend que des INDEX et des identités, jamais un nœud. ── */
  const RECENSER=`
    const vis=e=>{ const b=e.getBoundingClientRect(); if(b.width<6||b.height<6) return false;
      const st=getComputedStyle(e); return st.visibility!=='hidden'&&st.display!=='none'&&+st.opacity>0.05; };
    const SEL='button,.btn,.chip,.tab,.tchip,.pf-b,.pf-opt,.seg span,a[href],[onclick]';
    const zones=[document.getElementById('content'),document.querySelector('#page-head .ph-actions'),
                 document.getElementById('topbar-actions')].filter(Boolean);
    const vu=new Set(), out=[];
    zones.forEach(z=>[...z.querySelectorAll(SEL)].forEach(e=>{
      if(vu.has(e)||!vis(e)) return;
      /* un parent cliquable qui contient un enfant cliquable : on garde le plus profond */
      if([...e.querySelectorAll(SEL)].some(c=>vis(c))) return;
      vu.add(e);
      out.push({ t:(e.textContent||e.getAttribute('aria-label')||e.title||'').trim().replace(/\\s+/g,' ').slice(0,44),
                 n:e.tagName.toLowerCase()+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'') });
    }));
    window.__cibles=out.length; return out;`;

  /* ── L'ÉTAT OBSERVABLE, avant et après : c'est lui qui dit « inerte » ou non. ── */
  const ETAT=`
    const c=document.getElementById('content');
    const ouv=n=>!!(n&&getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().width>100);
    return { vue:(window.current||''), len:(c?c.innerHTML.length:0),
             tete:(c?c.innerHTML.slice(0,400):''),
             ov:ouv(document.querySelector('#overlay'))||ouv(document.querySelector('#overlay2')),
             /* ⛔ UN MESSAGE DÉJÀ À L'ÉCRAN N'EST PAS L'EFFET DU CLIC QUI SUIT. La première
                version rendait un booléen : un toast resté affiché depuis le remplissage
                faisait passer les mille clics pour « il s'est passé quelque chose ». On
                compare une SIGNATURE (combien, et lesquels), pas une présence. */
             toast:[...document.querySelectorAll('.toast,.snack,.notif-toast')]
                     .map(t=>(t.textContent||'').trim().slice(0,30)).join('¦'),
             enfants:document.body.children.length };`;

  /* ⛔⛔ CONTRE-ÉPREUVE AVANT DE CROIRE UN ZÉRO : un bouton qui jette DOIT être vu.
     Sans ça, « 0 erreur » peut vouloir dire « la sonde ne regarde pas ». */
  const avantEssai=S.exceptions.length;
  await S.ev(`const b=document.createElement('button'); b.id='__casse'; b.textContent='essai';
    b.onclick=function(){ throw new Error('SONDE-TEMOIN'); };
    document.getElementById('content').appendChild(b); b.click(); b.remove(); return 1;`);
  await dormir(300);
  const temoinVu=S.exceptions.slice(avantEssai).some(x=>/SONDE-TEMOIN/.test(x));
  console.log('  contre-épreuve : un clic qui jette est '+(temoinVu?'VU ✓':'INVISIBLE ✗ — tout zéro ci-dessous est faux'));
  if(!temoinVu){ S.fermer(); process.exit(3); }

  /* ⛔ NAV EST UN TABLEAU DE GROUPES, PAS DE RUBRIQUES — `NAV.map(x=>x.k)` rend 42 `undefined`,
     donc ZÉRO catégorie, donc « 0 clic qui jette ». Le compteur de population l'a attrapé à la
     première exécution ; sans lui, cet audit annonçait un sans-faute sur du néant. */
  /* ⛔⛔ ET LA MÊME CONTRE-ÉPREUVE POUR L'INERTIE : un bouton qui ne fait RIEN doit être vu
     comme inerte, sinon « 0 bouton mort » ne dit rien du tout. */
  {
    /* ⛔ LA SONDE NE DOIT PAS BOUGER CE QU'ELLE MESURE. Poser le bouton PUIS lire l'état
       comptait le bouton lui-même dans `body.children.length` : la contre-épreuve échouait
       toute seule et accusait le détecteur. On le pose, on lit, on clique, on relit. */
    await S.ev(`const b=document.createElement('button'); b.id='__muet'; b.textContent='muet';
      b.style.cssText='position:fixed;left:-9999px'; b.onclick=function(){};
      document.body.appendChild(b); return 1;`);
    await dormir(300);
    const av=await S.ev(ETAT);
    await S.ev(`document.getElementById('__muet').click(); return 1;`);
    await dormir(280);
    const ap=await S.ev(ETAT);
    await S.ev(`const b=document.getElementById('__muet'); if(b)b.remove(); return 1;`);
    /* ⛔ UNE MESURE QUI ÉCHOUE DOIT DIRE POURQUOI — sinon on essaie trois hypothèses
       fausses avant de regarder. On nomme le champ qui a bougé, et on montre l'écart. */
    const ecarts=[];
    if(ap.vue!==av.vue) ecarts.push('vue '+av.vue+'→'+ap.vue);
    if(ap.ov!==av.ov) ecarts.push('overlay '+av.ov+'→'+ap.ov);
    if(ap.toast!==av.toast) ecarts.push('toast «'+av.toast+'»→«'+ap.toast+'»');
    if(ap.len!==av.len) ecarts.push('longueur '+av.len+'→'+ap.len);
    if(ap.tete!==av.tete){ let i=0; while(i<av.tete.length&&av.tete[i]===ap.tete[i]) i++;
      ecarts.push('tête@'+i+' «'+av.tete.slice(i,i+40)+'» → «'+ap.tete.slice(i,i+40)+'»'); }
    if(ap.enfants!==av.enfants) ecarts.push('enfants '+av.enfants+'→'+ap.enfants);
    const vuMuet = !ecarts.length;
    console.log('  contre-épreuve : un clic sans effet est '+(vuMuet?'VU comme inerte ✓':'INVISIBLE ✗ — tout « 0 inerte » est faux'));
    if(!vuMuet) console.log('      ce qui a bougé tout seul : '+ecarts.join(' | ').slice(0,300));
    if(!vuMuet){ S.fermer(); process.exit(5); }
  }

  const CATS=await S.ev(`return NAV.flatMap(g=>g.items).map(x=>x.k).filter(k=>k&&views[k]);`);
  console.log('  catégories jouées : '+CATS.length);
  if(CATS.length<20){ console.log('  ✗ POPULATION TROP MAIGRE — on n’audite rien, on s’arrête.'); S.fermer(); process.exit(4); }

  /* téléphone, thème nuit — c'est l'appareil de terrain */
  await S.ev(`try{ setPlatForce('ios27'); }catch(e){} try{ setTheme('dark'); }catch(e){} return 1;`);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await dormir(500);

  const R={err:[],inertes:[],ecartes:[]};
  let clics=0, ecrans=0, cibles=0, rates=0, derives=0;
  /* ⛔ « 0 inerte » sur mille clics n'est croyable que si l'on sait CE QUI a changé à chaque
     fois. Sans ces compteurs, un détecteur qui ne peut jamais dire « inerte » rend le même
     zéro qu'une application sans bouton mort. */
  const RAISONS={vue:0,overlay:0,toast:0,longueur:0,tete:0,enfants:0};

  for(const k of CATS){
    await S.ev(`try{ go('${k}'); }catch(e){} return 1;`); await dormir(600); await ranger();
    const liste=await S.ev(RECENSER);
    if(!Array.isArray(liste)||!liste.length){ console.log('  '+k+' — 0 cible'); continue; }
    ecrans++; cibles+=liste.length;

    for(let i=0;i<liste.length;i++){
      const c=liste[i];
      const motif=ECARTS.find(([re])=>re.test(c.t));
      if(motif){ R.ecartes.push({ou:k,t:c.t,n:c.n,pourquoi:motif[1]}); continue; }

      /* ⛔⛔ VISER PAR INDEX SANS REMETTRE L'ÉCRAN D'APLOMB, C'EST NE PAS CLIQUER.
         Premier tour mesuré le 22 septembre 2026 : sur 1 016 frappes, **748 n'ont trouvé
         personne** — un clic sur un filtre change la liste, et tous les index d'après
         tombent dans le vide. « 0 clic qui jette » portait alors sur 268 clics, pas 1 016,
         et rien ne le disait. On REVIENT donc à l'écran neuf avant CHAQUE frappe, et on
         vérifie que le recensement retrouve le même nombre de cibles. */
      await S.ev(`try{ if(window.current!=='${k}') go('${k}'); else go('${k}'); }catch(e){} return 1;`);
      await dormir(420);
      const avant=await S.ev(ETAT);
      const nErr=S.exceptions.length;
      const frappe=await S.ev(RECENSER.replace('return out;',
        `const e=[...vu][${i}]; if(!e) return {rate:true,n:out.length};
         const id=(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,44);
         e.click(); return {rate:false,n:out.length,id:id};`));
      await dormir(300);
      clics++;
      const apres=await S.ev(ETAT);
      const neuves=S.exceptions.slice(nErr);
      if(frappe.rate) rates++;
      else if(frappe.id!==c.t) derives++;   /* l'index a bougé : on a cliqué autre chose */
      if(neuves.length) R.err.push({ou:k,t:c.t,n:c.n,e:neuves.join(' | ').slice(0,160)});
      else if(!frappe.rate){
        if(apres.vue!==avant.vue) RAISONS.vue++;
        else if(apres.ov!==avant.ov) RAISONS.overlay++;
        else if(apres.toast!==avant.toast) RAISONS.toast++;
        else if(apres.tete!==avant.tete) RAISONS.tete++;
        else if(apres.len!==avant.len) RAISONS.longueur++;
        else if(apres.enfants!==avant.enfants) RAISONS.enfants++;
        else R.inertes.push({ou:k,t:c.t,n:c.n});
      }

      if(apres.ov || apres.vue!==avant.vue) await ranger();
    }
    console.log('  '+k+' — '+liste.length+' cibles');
  }

  const grouper=(l,cle)=>{ const m={}; l.forEach(x=>{ const g=cle(x); (m[g]=m[g]||[]).push(x); });
    return Object.entries(m).sort((a,b)=>b[1].length-a[1].length); };

  console.log('\n════════ AUDIT DES CLICS ════════');
  console.log('  page mesurée : '+S.version);
  console.log('  population : '+ecrans+' écrans, '+cibles+' cibles recensées, '+clics+' clics réels');
  console.log('  frappes qui n’ont trouvé personne : '+rates+'  ·  frappes tombées sur une AUTRE cible : '+derives);
  console.log('  → clics vraiment portés sur la cible visée : '+(clics-rates-derives)+' / '+clics);
  console.log('  ce qui a changé après un clic : '+Object.entries(RAISONS).map(([a,b])=>a+' '+b).join(' · '));
  console.log('\n══ 1. CLICS QUI JETTENT : '+R.err.length+' ══');
  grouper(R.err,x=>x.e.slice(0,70)).slice(0,15).forEach(([g,v])=>
    console.log('   '+String(v.length).padStart(3)+'×  '+g+'   ex. « '+v[0].t+' » ['+v[0].ou+']'));
  console.log('\n══ 2. CLICS SANS EFFET OBSERVABLE : '+R.inertes.length+'  (à VÉRIFIER, pas à accuser) ══');
  grouper(R.inertes,x=>x.n).slice(0,15).forEach(([g,v])=>
    console.log('   '+String(v.length).padStart(3)+'×  '+g.padEnd(28)+' ex. « '+v[0].t+' » ['+v[0].ou+']'));
  console.log('\n══ 3. ÉCARTÉS VOLONTAIREMENT : '+R.ecartes.length+' ══');
  grouper(R.ecartes,x=>x.pourquoi).forEach(([g,v])=>
    console.log('   '+String(v.length).padStart(3)+'×  '+g+'   ex. « '+v[0].t+' »'));

  fs.writeFileSync(__dirname+'/audit-clics.json',JSON.stringify({version:S.version,ecrans,cibles,clics,rates,derives,raisons:RAISONS,...R}));
  console.log('\n  détail complet : scratchpad/audit-clics.json');
  S.fermer(); process.exit(0);
})().catch(e=>{console.error('AUDIT MORT :',e&&e.stack||e);process.exit(2);});
