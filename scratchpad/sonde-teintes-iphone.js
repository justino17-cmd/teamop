/* ══ « LES COULEURS EN DESSOUS, JE VEUX QU'ELLES MARCHENT » — au doigt, comme l'iPhone de Justin ══
   Justin, 25 septembre 2026 : toucher Bleu ou Rose sous « Teinte d'accentuation » ne changeait
   RIEN, pas même le « + Créer ». Le navigateur de test disait que tout marchait : son rangement
   est vide et il n'a pas de synchro. Cette sonde rejoue le geste dans les QUATRE états qui
   comptent, avec l'agent Safari d'un iPhone 17 Pro (402 × 874, densité 3, verre natif) et de
   VRAIS touchers (`Input.dispatchTouchEvent`) :
     propre  — l'appareil du navigateur de test ;
     plein   — le rangement de l'origine rempli jusqu'au refus (Safari le borne à 5 Mo, partagés
               par app.html, la bêta et la Tour sur teamop.fr) ;
     badges  — un maillon de `save()` qui jette après avoir rangé ;
     retour  — une copie PLUS ANCIENNE de la fiche arrive par la synchro (un appareil qui a poussé
               avant d'avoir reçu le choix) : on joue les étapes de la réception — la fusion des
               comptes (`usersFusionner`, priorité au distant), `compteVerifier`, `prefAppliquer`.
               ⚠ Le vrai écouteur Firestore ne se déclenche pas hors réseau : c'est test-808 qui
               garde son câblage (la réception relève les heures et repousse).
   Pour chaque état : ouvrir « Thème et couleur » en TOUCHANT la ligne des Paramètres, faire
   défiler la fenêtre (comme sur la capture de Justin), toucher « Bleu », fermer par la croix, et
   lire le « + » de la barre du haut. Dans l'état « plein », on écoute aussi ce qui PART vers la
   Tour (`navigator.sendBeacon`) : le rapport « Rangement de l'appareil plein » doit y être.

   Usage : node scratchpad/sonde-teintes-iphone.js            (la bêta du dépôt)
           SOURCE=/chemin/beta.html node scratchpad/…         (une autre copie : la contre-épreuve)
           ETATS=plein,retour node scratchpad/…
   ⛔ Bêta seulement, 127.0.0.1 seulement (pilote.js). */
const { ouvrir, dormir } = require('./pilote.js');
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const ETATS = (process.env.ETATS || 'propre,plein,badges,retour').split(',').filter(Boolean);
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '\n      ' + d : '')); } };

async function unEtat(ETAT) {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  const { c, ev } = S;
  try {
    await c.envoyer('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'iPhone' });
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 3, mobile: true });
    await c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      try{ localStorage.removeItem(PLAT_CLE); }catch(e){} opPlatAppliquer();
      if(!db.users.some(u=>u.id==='beta-justin')){ db.users.push({id:'beta-justin',prenom:'Justin',nom:'',login:'justin',role:'admin',actif:true,essai:true}); save(); }
      currentUser=db.users.find(u=>u.id==='beta-justin');
      try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); localStorage.setItem('elanB_push_ask_'+currentUser.id,'1'); }catch(e){}
      enterApp(currentUser);
      window._toasts=[]; const t0=window.toast; window.toast=function(m){ window._toasts.push(String(m)); return t0.apply(this,arguments); };
      window._balises=[]; Object.defineProperty(navigator,'sendBeacon',{configurable:true,value:function(u,b){
        try{ b.text().then(t=>window._balises.push(String(t))); }catch(e){ window._balises.push('?'); } return true; }});
      return 1;`);
    await dormir(1800);
    const plat = await ev(`const r=document.documentElement; return {plat:r.getAttribute('data-plat'), natif:r.getAttribute('data-verre-natif'), version:APP_VERSION};`);
    console.log('\n══ ' + ETAT + ' — ' + plat.version + ' · ' + plat.plat + (plat.natif ? ' (verre natif)' : '') + ' ══');
    vrai('le rendu est celui d\'un iPhone Safari 26', plat.plat === 'iosweb' && plat.natif === '1', JSON.stringify(plat));

    if (ETAT === 'plein') {
      const r = await ev(`const bloc='x'.repeat(65536); let i=0; for(;;){ try{ localStorage.setItem('zz_plein_'+i, bloc); i++; }catch(e){ break; } }
        let petit='y'.repeat(4096), j=0; while(petit.length>=1){ try{ localStorage.setItem('zz_fin_'+j, petit); j++; }catch(e){ petit=petit.slice(0,Math.floor(petit.length/2)); } }
        let refus=''; try{ localStorage.setItem('zz_t','0123456789abcdef'); localStorage.removeItem('zz_t'); }catch(e){ refus=e.name; } return refus;`);
      vrai('le rangement est plein (16 caractères refusés)', r === 'QuotaExceededError', r);
    }
    if (ETAT === 'badges') await ev(`refreshBadges=function(){ throw new Error('refreshBadges : donnée inattendue (simulée)'); }; return 1;`);

    const tap = async (x, y) => { await c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await dormir(70);
      await c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    /* une frappe prouve qu'elle vise le bon élément : `elementFromPoint` au point touché est lui ou dedans */
    /* ⛔ Une mesure qui échoue dit POURQUOI : on nomme l'élément sous le doigt. Et un voile
       passager (l'entrée animée de l'écran, un message) se laisse passer — trois lectures. */
    const centre = sel => ev(`const e=${sel}; if(!e) return null; let r=null;
      for(let k=0;k<3;k++){ e.scrollIntoView({block:'center'}); await new Promise(f=>requestAnimationFrame(()=>requestAnimationFrame(f)));
        const b=e.getBoundingClientRect(); const x=b.left+b.width/2, y=b.top+b.height/2; const q=document.elementFromPoint(x,y);
        r={x,y,dedans:!!(q&&(q===e||e.contains(q))), taille:b.width>0&&b.height>0,
          sous:q?(q.tagName+(q.id?'#'+q.id:'')+(typeof q.className==='string'&&q.className?'.'+q.className.trim().split(/\\s+/).join('.'):'')):'∅'};
        if(r.dedans) break; await new Promise(f=>setTimeout(f,450)); }
      return r;`);
    const lirePlus = () => ev(`const b=document.querySelector('.topbar .creer-btn'); const r=document.documentElement;
      return {accent:r.getAttribute('data-accent'), plus:b?getComputedStyle(b).backgroundColor:'∅', visible:!!(b&&b.offsetWidth)};`);

    await ev(`closeModal(); go('parametres'); return 1;`);
    for (let i = 0; i < 40; i++) { await dormir(300); if (await ev(`return !!document.querySelector('.tc-rangee');`)) break; }
    await dormir(400);
    const avant = await lirePlus();
    vrai('le « + » de la barre du haut est visible, à la teinte du thème', avant.visible && avant.accent === 'teamop', JSON.stringify(avant));
    let p = await centre(`document.querySelector('.tc-rangee')`);
    vrai('la ligne « Thème et couleur » est sous le doigt', p && p.dedans && p.taille, JSON.stringify(p));
    if (!p) return;
    await tap(p.x, p.y); await dormir(1000);
    vrai('le toucher ouvre « Thème et couleur »', await ev(`return !!document.querySelector('#modal .tc-grille');`));
    await ev(`const m=document.getElementById('modal'); m.scrollTop=60; return 1;`); await dormir(300);
    p = await centre(`[...document.querySelectorAll('#modal .tc-teinte')].find(x=>(x.getAttribute('onclick')||'').includes("'blue'"))`);
    vrai('la pastille « Bleu » est sous le doigt', p && p.dedans && p.taille, JSON.stringify(p));
    if (!p) return;
    const nErr = S.exceptions.length;
    await tap(p.x, p.y); await dormir(900);
    const fen = await ev(`return {coche:(document.querySelector('#modal .tc-teinte.on .tc-nom')||{}).textContent||null,
      apercu:(()=>{const d=document.querySelector('#modal .tc-demo-creer'); return d?getComputedStyle(d).backgroundColor:'∅';})()};`);
    vrai('la coche passe sur « Bleu »', fen.coche === 'Bleu', JSON.stringify(fen));
    vrai('l\'aperçu « + Créer » de la fenêtre passe au bleu', fen.apercu !== avant.plus, JSON.stringify(fen));
    if (ETAT === 'retour') {
      const r = await ev(`const vieux=JSON.parse(JSON.stringify(db)); const u=vieux.users.find(x=>x.id==='beta-justin');
        u.pref=Object.assign({},u.pref,{accent:'teamop'}); if(u.prefTs){ u.prefTs=Object.assign({},u.prefTs); delete u.prefTs.accent; }
        const fus=usersFusionner(db.users, vieux.users, usersTombesFusion(db,vieux), false);
        db.users=fus; compteVerifier(); prefAppliquer(currentUser); return (currentUser.pref||{}).accent;`);
      vrai('⛔ la copie plus ancienne ne défait pas le choix', r === 'blue', 'fiche après réception : ' + r);
      await dormir(400);
    }
    p = await centre(`document.querySelector('#modal .modal-close')`);
    await tap(p.x, p.y); await dormir(900);
    vrai('la croix ferme la fenêtre', !(await ev(`return document.getElementById('overlay').classList.contains('open');`)));
    const apres = await lirePlus();
    vrai('⛔ le « + » de la barre du haut est BLEU', apres.accent === 'blue' && apres.plus !== avant.plus, JSON.stringify({ avant: avant.plus, apres }));
    const errs = S.exceptions.slice(nErr);
    vrai('aucune erreur JavaScript pendant le geste', !errs.length, errs.slice(0, 2).join(' || '));
    if (ETAT === 'plein') {
      /* Deux rangements refusent dans le même geste : le réglage (`prefRangementPlein`) puis la base
         (`save()` → `baseRangementPlein`, v750). Chacun le dit une fois. */
      const t = await ev(`return [window._toasts.filter(x=>/plus de place pour ranger tes réglages/.test(x)).length, window._toasts.filter(x=>/plus de place pour enregistrer tes données/.test(x)).length];`);
      vrai('⛔ l\'écran DIT que l\'appareil est plein — une fois pour le réglage, une fois pour la base', t[0] === 1 && t[1] === 1, 'messages : ' + JSON.stringify(t));
      /* ⛔ le DERNIER message gagne (un seul bandeau). Avant la v750, celui de `save()` (« réduis le
         nombre/poids des photos », 2,2 s, FAUX) passait par-dessus. Depuis, l'avertissement de la base
         paraît au PREMIER enregistrement refusé (ici en ouvrant les Paramètres), puis se tait cinq
         minutes : au toucher de la teinte, c'est donc celui du réglage qui reste. Mesuré, pas supposé :
         la première attente de cette sonde voulait l'inverse, et c'est elle qui avait tort. */
      const vu = await ev(`return (document.getElementById('toast')||{}).textContent||'';`);
      vrai('… et l\'écran dit « plus de place » — jamais l\'ancien « photos »', /plus de place pour (ranger tes réglages|enregistrer tes données)/.test(vu) && !/photo/i.test(vu), 'à l\'écran : ' + vu);
      let balise = '';
      for (let i = 0; i < 45 && !balise; i++) { await dormir(1000);
        balise = await ev(`return (window._balises.find(x=>/Rangement de l’appareil plein/.test(x))||'');`); }
      vrai('⛔ la Tour reçoit « Rangement de l\'appareil plein », malgré le rangement plein', !!balise);
      vrai('… avec ce qui occupe la place, par famille — sans nom de clé ni contenu',
        /Ko occupés : /.test(balise) && !/zz_plein|zz_fin|beta-justin/.test(balise), balise.slice(0, 260));
    }
  } finally { S.fermer(); }
}

(async () => {
  for (const e of ETATS) await unEtat(e);
  console.log('\n═══ sonde-teintes-iphone : ' + ok + ' ✓ ' + ko + ' ✗ ═══');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('MORTE', e && e.stack || e); process.exit(2); });
