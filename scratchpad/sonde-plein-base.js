/* ══ v750 — UN APPAREIL DONT LE RANGEMENT EST PLEIN, DANS LA VRAIE PAGE ══════════════════════════
   `tests/test-817.js` joue `save()` et `baseRangementPlein` extraites. Ici, la bêta ENTIÈRE, un
   iPhone Safari 26, le rangement de l'origine rempli jusqu'au refus (Safari le borne à 5 Mo,
   partagés par l'application, la bêta et la Tour), et un vrai geste qui enregistre :
     1. l'écran dit juste ce qui se passe (plus de « photos »), une fois ;
     2. la Tour reçoit « Rangement de l'appareil plein … base non enregistrée » (`sendBeacon`) ;
     3. la saisie reste en mémoire ;
     4. la place revenue, la base est rangée et l'écran le dit ;
     5. aucune erreur JavaScript.
   Contre-épreuve : SOURCE=/chemin/beta-749.html doit tomber (l'ancien bandeau, rien vers la Tour).
   ⛔ Bêta seulement, 127.0.0.1 seulement (pilote.js). */
const { ouvrir, dormir } = require('./pilote.js');
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '\n      ' + d : '')); } };

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  const { c, ev } = S;
  try {
    await c.envoyer('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'iPhone' });
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 3, mobile: true });
    await ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.some(u=>u.id==='beta-justin')){ db.users.push({id:'beta-justin',prenom:'Justin',nom:'',login:'justin',role:'admin',actif:true,essai:true}); save(); }
      currentUser=db.users.find(u=>u.id==='beta-justin');
      try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); localStorage.setItem('elanB_push_ask_'+currentUser.id,'1'); }catch(e){}
      enterApp(currentUser);
      window._toasts=[]; const t0=window.toast; window.toast=function(m){ window._toasts.push(String(m)); return t0.apply(this,arguments); };
      window._balises=[]; Object.defineProperty(navigator,'sendBeacon',{configurable:true,value:function(u,b){
        try{ b.text().then(t=>window._balises.push(String(t))); }catch(e){ window._balises.push('?'); } return true; }});
      return 1;`);
    await dormir(1500);
    const version = await ev(`return APP_VERSION;`);
    console.log('\n══ ' + version + ' · iPhone Safari 26 · rangement plein ══');

    /* le rangement rempli jusqu'au refus */
    const refus = await ev(`const bloc='x'.repeat(65536); let i=0; for(;;){ try{ localStorage.setItem('zz_plein_'+i, bloc); i++; }catch(e){ break; } }
      let petit='y'.repeat(4096), j=0; while(petit.length>=1){ try{ localStorage.setItem('zz_fin_'+j, petit); j++; }catch(e){ petit=petit.slice(0,Math.floor(petit.length/2)); } }
      let r=''; try{ localStorage.setItem('zz_t','0123456789abcdef'); localStorage.removeItem('zz_t'); }catch(e){ r=e.name; } return r;`);
    vrai('la population : le rangement est plein (16 caractères refusés)', refus === 'QuotaExceededError', refus);

    /* un vrai geste qui enregistre : un client créé, comme le fait le formulaire */
    const nErr = S.exceptions.length;
    const g = await ev(`const avant=localStorage.getItem(STORE_KEY);
      db.clients.push({id:'cl-plein',nom:'Client saisi appareil plein',ville:'Lyon'}); logEvent('Client créé','Client saisi appareil plein','clients');
      save(); toast('✓ Client enregistré');
      await new Promise(f=>setTimeout(f,60));
      return { enMemoire: db.clients.some(x=>x.id==='cl-plein'), range: (localStorage.getItem(STORE_KEY)||'').includes('cl-plein'), inchange: localStorage.getItem(STORE_KEY)===avant,
        ecran: (document.getElementById('toast')||{}).textContent||'', toasts: window._toasts.slice() };`);
    vrai('⛔ la saisie reste en mémoire', g.enMemoire);
    vrai('   et la base rangée est l\'ancienne (le refus est bien réel)', !g.range && g.inchange);
    vrai('⛔ l\'écran dit que l\'appareil n\'a plus de place pour enregistrer les données', /plus de place pour enregistrer tes données/.test(g.ecran), 'à l\'écran : ' + g.ecran);
    vrai('   il passe devant « ✓ Client enregistré », qui mentirait seul', !/Client enregistré/.test(g.ecran));
    vrai('   sans synchro, il ne promet pas un envoi à l\'équipe', /restent là tant que l’application est ouverte/.test(g.ecran) && !/équipe/.test(g.ecran), g.ecran);
    vrai('⛔ plus aucune mention des photos', !g.toasts.some(x => /photo/i.test(x)), JSON.stringify(g.toasts));

    /* trois gestes de plus : pas de pluie de bandeaux */
    await ev(`for(let k=0;k<3;k++){ db.clients.push({id:'cl-plein-'+k,nom:'Encore '+k}); save(); } await new Promise(f=>setTimeout(f,60)); return 1;`);
    const nb = await ev(`return window._toasts.filter(x=>/plus de place pour enregistrer/.test(x)).length;`);
    vrai('⛔ trois enregistrements de plus : toujours UN seul bandeau', nb === 1, 'bandeaux : ' + nb);

    /* la Tour */
    let balises = [];
    for (let i = 0; i < 45; i++) { await dormir(1000);
      balises = await ev(`return window._balises.filter(x=>/base non enregistrée/.test(x));`); if (balises.length) break; }
    vrai('⛔ la Tour reçoit « base non enregistrée sur l\'appareil », malgré le rangement plein', balises.length >= 1);
    vrai('   avec ce qui occupe la place, par famille — sans nom de clé ni contenu',
      balises.length && /Ko occupés : /.test(balises[0]) && !/zz_plein|zz_fin|cl-plein|Lyon/.test(balises[0]), (balises[0] || '').slice(0, 300));
    await dormir(1500);
    const n2 = await ev(`return window._balises.filter(x=>/base non enregistrée/.test(x)).length;`);
    vrai('   une seule fois dans la séance', n2 === 1, 'signaux : ' + n2);

    /* la place revient */
    const r = await ev(`for(let i=localStorage.length-1;i>=0;i--){ const k=localStorage.key(i); if(/^zz_/.test(k)) localStorage.removeItem(k); }
      save(); await new Promise(f=>setTimeout(f,60));
      return { range: (localStorage.getItem(STORE_KEY)||'').includes('cl-plein-2'), ecran: (document.getElementById('toast')||{}).textContent||'' };`);
    vrai('⛔ la place revenue : la base est rangée, saisie comprise', r.range);
    vrai('   et l\'écran le dit', /enregistre de nouveau/.test(r.ecran), 'à l\'écran : ' + r.ecran);
    const errs = S.exceptions.slice(nErr);
    vrai('aucune erreur JavaScript', !errs.length, errs.slice(0, 3).join(' || '));
  } finally { S.fermer(); }
  console.log('\n═══ sonde-plein-base : ' + ok + ' ✓ ' + ko + ' ✗ ═══');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('MORTE', e && e.stack || e); process.exit(2); });
