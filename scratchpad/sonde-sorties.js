/* ══ SONDE — CE QUI FLOTTE ENTRE ET SORT PAR LE MÊME CHEMIN (audit apple-design du 21 octobre 2026, points 12 à 16) ═══════════
   Huit surfaces apparaissaient ou disparaissaient en une image : la fenêtre secondaire (#overlay2), les roues d'heure, la
   lecture d'un courriel, le catalogue des bons, le panneau des notifications, le menu contextuel du planning, la carte de
   survol du planning et le menu du compte. Pour sept d'entre elles, dans la vraie page, sur iPhone (la carte de survol ne
   vit qu'à la souris, et ce Chromium n'en a pas : tests/test-2838.js l'exécute) :
     · à l'ouverture, une animation TOURNE sur la surface (elle entre) ;
     · à la fermeture, la surface est ENCORE LÀ, avec une animation de sortie, puis elle a disparu 600 ms plus tard ;
     · sous « réduire les animations », aucune animation, et la surface part tout de suite.
   CAPTURES=dossier : une image de chaque entrée, figée à mi-chemin (Animation.currentTime), jour et nuit.
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const CAP = process.env.CAPTURES; if (CAP) fs.mkdirSync(CAP, { recursive: true });
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} db.mailSent=db.mailSent||[]; db.mailSent.push({ts:Date.now(),to:'client-essai@exemple.invalid',subject:'Essai de lecture',text:'Bonjour,\\nceci est un essai.',att:'',from:'OP GESTION'}); save(); return 1;`); await dormir(1500);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  /* l'état d'une surface : présente ? visible ? combien d'animations CSS y tournent (elle et ses descendants proches) ? */
  const etat = (sel) => S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return {la:false};
    const cs=getComputedStyle(e); const an=[e,...e.querySelectorAll(':scope > *')].flatMap(x=>x.getAnimations()).filter(a=>a.animationName&&a.playState==='running').map(a=>a.animationName);
    return {la:e.isConnected, vu:cs.display!=='none'&&cs.visibility!=='hidden', an, cls:typeof e.className==='string'?e.className:''};`);
  const SURF = [
    { nom: 'la fenêtre secondaire (photo, détail d’un traitement)', sel: '#overlay2', ouvre: `openSub('<div class="modal-head"><h3>Essai</h3><button class="modal-close" onclick="closeSub()">✕</button></div><div style="padding:20px">Fenêtre secondaire</div>')`, ferme: `closeSub()`, vu: (e) => e.la && e.vu },
    { nom: 'les roues d’heure', sel: '#roues-ov', ouvre: `ouvreRoues('09:00',()=>{})`, ferme: `fermeRoues()` },
    { nom: 'la lecture d’un courriel', sel: '#mail-read', avant: `go('boiteMail')`, ouvre: `mailOpen('envoye',0)`, ferme: `document.querySelector('#mail-read button').click()` },
    { nom: 'le catalogue des bons', sel: '#bon-cat', ouvre: `bonCatOpen()`, ferme: `bonCatClose()` },
    { nom: 'le panneau des notifications', sel: '.notif-panel', avant: `go('dashboard')`, ouvre: `openNotif()`, ferme: `closeNotif()` },
    { nom: 'le menu contextuel du planning', sel: '#plan-ctx', avant: `go('planning')`, ouvre: `planCtxOpen(160,320,[{ic:'✎',l:'Modifier',fn(){}},{ic:'⧉',l:'Dupliquer',fn(){}}])`, ferme: `planCtxClose()` },
    { nom: 'le menu du compte', sel: '#foot-menu', ouvre: `userFootMenu({preventDefault(){},stopPropagation(){},clientX:120,clientY:700})`, ferme: `document.getElementById('page-head').dispatchEvent(new MouseEvent('click',{bubbles:true}))` },   // un toucher à côté, comme un vrai
  ];
  const vuOuLa = (e) => e.la && e.vu !== false;
  const jouer = async (sobre, theme) => {
    await S.c.envoyer('Emulation.setEmulatedMedia', { features: sobre ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [] });
    await S.ev(`setThemePref('${theme}'); return 1;`); await dormir(400);
    for (const s of SURF) {
      if (s.avant) { await S.ev(`try{ closeModal(true); }catch(e){} ${s.avant}; return 1;`); await dormir(1800); }
      await S.ev(`${s.ouvre}; return 1;`);
      const e1 = await etat(s.sel);
      if (CAP && !sobre) { await S.ev(`const e=document.querySelector(${JSON.stringify(s.sel)}); if(e) [e,...e.querySelectorAll(':scope > *')].flatMap(x=>x.getAnimations()).forEach(a=>{ a.pause(); a.currentTime=(a.effect.getComputedTiming().duration||0)*0.45; }); return 1;`);
        await dormir(120); const img = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, theme + '-' + s.sel.replace(/[^a-z0-9]/gi, '') + '.png'), Buffer.from(img.data, 'base64'));
        await S.ev(`const e=document.querySelector(${JSON.stringify(s.sel)}); if(e) [e,...e.querySelectorAll(':scope > *')].flatMap(x=>x.getAnimations()).forEach(a=>a.finish()); return 1;`); }
      await dormir(700);
      await S.ev(`${s.ferme}; return 1;`);
      const e2 = await etat(s.sel); await dormir(600); const e3 = await etat(s.sel);
      const parti = !e3.la || e3.vu === false || (s.sel === '#overlay2' && !/\bopen\b/.test(e3.cls));
      if (!sobre) {
        c(s.nom + ' : à l’ouverture, une animation d’ENTRÉE tourne', vuOuLa(e1) && e1.an.length > 0, e1);
        c(s.nom + ' : à la fermeture, elle est encore là, et SORT (animation en cours)', vuOuLa(e2) && e2.an.length > 0, e2);
        c(s.nom + ' : … puis elle est partie', parti, e3);
      } else {
        c('« réduire les animations » — ' + s.nom + ' : aucune animation, elle part tout de suite', vuOuLa(e1) && !e1.an.length && (!e2.la || e2.vu === false || (s.sel === '#overlay2' && !/\bopen\b/.test(e2.cls))), { e1, e2 });
      }
    }
  };
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
  console.log('\n1. iPhone, de jour'); await jouer(false, 'light');
  if (CAP) { console.log('\n   (captures de nuit)'); await jouer(false, 'dark'); }
  console.log('\n2. « réduire les animations »'); await jouer(true, 'light');
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (S.exceptions.length ? '  · exceptions : ' + S.exceptions.slice(0, 3).join(' | ') : ''));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });
