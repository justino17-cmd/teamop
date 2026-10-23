/* Captures d'écran sous un RÉGLAGE système (contraste accru, transparence réduite…) — pour REGARDER, pas pour compter.
   Usage : MEDIA=prefers-contrast:more VUES=dashboard,interventions node capture-reglage.js <dossier>
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  const feats = (process.env.MEDIA || '').split(',').filter(Boolean).map(x => { const [n, v] = x.split(':'); return { name: n, value: v }; });
  for (const nomP of (process.env.PROFILS || 'tel,bureau').split(',')) {
    const P = PROFILS[nomP]; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
    for (const theme of (process.env.THEMES || 'light,dark').split(',')) {
      await S.ev(`setThemePref('${theme}'); return 1;`); await dormir(1200);
      await S.c.envoyer('Emulation.setEmulatedMedia', { features: feats });
      for (const v of (process.env.VUES || 'dashboard').split(',')) {
        await S.ev(`try{ closeModal(true); }catch(e){} go('${v}'); return 1;`); await dormir(1500);
        for (let k = 0; k < 40; k++) { if (await S.ev(`return document.getAnimations().filter(a=>a.constructor.name==='CSSTransition'&&a.playState==='running').length===0;`)) break; await dormir(100); }
        const img = await S.c.envoyer('Page.captureScreenshot', { format: 'png' });
        const f = path.join(OUT, nomP + '-' + theme + '-' + v + '.png'); fs.writeFileSync(f, Buffer.from(img.data, 'base64')); console.log(f);
      }
    }
  }
  S.fermer(); process.exit(0);
})().catch(e => { console.error('⛔ ' + e.message); process.exit(1); });
