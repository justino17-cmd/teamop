/* ══ SONDE — LE JOUR ET LA NUIT SE FONDENT, PAR TOUS LES CHEMINS (audit apple-design, point 24) ════════════════════════════
   Dans la vraie page (iPhone), on touche pour de vrai « Sombre » puis « Clair » dans la fenêtre Apparence (themeCouleur), on
   fait passer le système à la nuit (prefers-color-scheme émulé, réglage « Auto »), et on fait arriver un réglage d'un autre
   appareil (prefAppliquer(…, true)). Pour chacun :
     · une transition de vue part, et c'est le FONDU (animation opFondu sur ::view-transition-new(root)) ;
     · arrêtée à mi-temps, la page est là où la courbe la met, entre les deux fonds (au pixel) — ni l'ancien, ni le
       nouveau, ni plus clair que le plus clair des deux (l'addition plus-lighter du navigateur, qu'on écarte) ;
     · à la fin, le thème est posé.
   Et les cas où rien ne doit se fondre : choisir le thème déjà affiché ; l'ouverture d'une session (enterApp), où le
   thème se pose AVANT de dessiner, tout de suite. Sous « réduire les animations », le fondu reste (une opacité n'est pas un
   mouvement), plus court. SOURCE=fichier : la contre-épreuve sur la page d'avant. CAPTURES=dossier : la mi-course.
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const png = require(path.join(__dirname, 'png.js')); const decoder = png.decoder || png.decode || png;
const CAP = process.env.CAPTURES; if (CAP) fs.mkdirSync(CAP, { recursive: true });
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); (typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('light'); go('dashboard'); return 1;`); await dormir(1800);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  /* on guette la transition qu'un geste va lancer : startViewTransition enveloppé, et l'animation de la nouvelle image */
  await S.ev(`window.__vt=[]; const sv=document.startViewTransition&&document.startViewTransition.bind(document);
    if(sv) document.startViewTransition=function(f){ const vt=sv(f); __vt.push({vt, classes:document.documentElement.className}); return vt; }; return 1;`);
  /* un point de FOND (aucun texte) : le haut de la zone de contenu, sous la barre */
  const point = await S.ev(`const c=document.getElementById('content').getBoundingClientRect(); return {x:Math.round(c.left+8), y:Math.round(c.top+6), dpr:devicePixelRatio};`);
  const pixel = async () => { const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); const b = Buffer.from(im.data, 'base64'); const I = decoder(b), n = I.data.length / (I.w * I.h);
    const i = (Math.round(point.y * point.dpr) * I.w + Math.round(point.x * point.dpr)) * n; return { l: Math.round(0.2126 * I.data[i] + 0.7152 * I.data[i + 1] + 0.0722 * I.data[i + 2]), b }; };
  /* lance le geste ; arrête l'animation de la nouvelle image à mi-course, mesure, puis la laisse finir */
  const essai = async (nom, geste, attendu) => {
    const l0 = (await pixel()).l;
    await S.ev(`window.__vt.length=0; return 1;`);
    await geste();
    const a = await S.ev(`for(let k=0;k<40;k++){ const v=window.__vt[0]; if(v){ await v.vt.ready.catch(()=>0); break; } await new Promise(r=>setTimeout(r,25)); }
      const v=window.__vt[0]; if(!v) return {vt:false, theme:document.documentElement.getAttribute('data-theme')};
      const an=document.getAnimations().filter(x=>x.effect&&/view-transition-new\\(root\\)/.test(x.effect.pseudoElement||''));
      const nomA=an.map(x=>x.animationName); const d=an[0]?an[0].effect.getComputedTiming().duration:0;
      an.forEach(x=>{ x.pause(); x.currentTime=d/2; }); const prog=an[0]?an[0].effect.getComputedTiming().progress:null;
      const old=document.getAnimations().filter(x=>x.effect&&/view-transition-old\\(root\\)/.test(x.effect.pseudoElement||'')).map(x=>x.animationName);
      return {vt:true, anims:nomA, old, duree:d, prog, classes:v.classes};`);
    let mi = null;
    if (a.vt) { await dormir(120); const px = await pixel(); mi = px.l; if (CAP) fs.writeFileSync(path.join(CAP, 'mi-course-' + nom + '.png'), px.b);
      await S.ev(`document.getAnimations().filter(x=>x.effect&&/view-transition/.test(x.effect.pseudoElement||'')).forEach(x=>x.play()); const v=window.__vt[0]; await Promise.race([v.vt.finished.catch(()=>0), new Promise(r=>setTimeout(r,3000))]); return 1;`); }
    await dormir(300);
    const l1 = (await pixel()).l, th = await S.ev(`return document.documentElement.getAttribute('data-theme');`);
    return { a, l0, mi, l1, th, attendu };
  };
  /* la courbe « ease » (cubic-bezier(.25,.1,.25,1)) posée sur l'image clé : la progression de l'effet est linéaire, l'opacité
     suit la courbe — à mi-temps elle en est à ~80 % */
  const ease = (x) => { const bz = (a, b, t) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t; let lo = 0, hi = 1;
    for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (bz(.25, .25, m) < x) lo = m; else hi = m; } return bz(.1, 1, (lo + hi) / 2); };
  const juger = (nom, r, duree) => {
    c(nom + ' : une transition part, et c’est le FONDU (opFondu, sans le glissement de la navigation)', r.a.vt && r.a.anims.includes('opFondu') && /theme-fondu/.test(r.a.classes || ''), r.a);
    if (duree) c(nom + ' : … de ' + duree + ' ms', r.a.duree === duree, r.a.duree);
    /* à mi-temps, la courbe (ease) en est à r.a.prog : la nouvelle image POSÉE sur l'ancienne donne l0 + (l1 − l0) × prog ;
       l'addition du navigateur (plus-lighter) donnerait l0 + l1 × prog — au-delà du plus clair des deux */
    const att = r.a.prog === null ? null : r.l0 + (r.l1 - r.l0) * ease(r.a.prog);
    c(nom + ' : à mi-course, la nouvelle image se POSE sur l’ancienne (' + r.l0 + ' → ' + r.mi + ' → ' + r.l1 + ', attendu ' + (att === null ? '?' : Math.round(att)) + ', la courbe à ' + Math.round(ease(r.a.prog || 0) * 100) + ' %)', r.mi !== null && att !== null && Math.abs(r.mi - att) <= 10 && r.mi > Math.min(r.l0, r.l1) && r.mi < Math.max(r.l0, r.l1), { l0: r.l0, mi: r.mi, l1: r.l1, prog: r.a.prog });
    c(nom + ' : à la fin, le thème « ' + r.attendu + ' » est posé', r.th === r.attendu, r.th);
  };

  console.log('\n1. la fenêtre Apparence : « Sombre », puis « Clair »');
  await S.ev(`themeCouleur(); return 1;`); await dormir(900);
  const toucher = (k) => async () => { const p = await S.ev(`const x=[...document.querySelectorAll('.tc-modes .chip')].find(e=>e.getAttribute('onclick')==="tcMode('${k}')"); if(!x) return null; x.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const r=x.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};`);
    if (!p) return; await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] }); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  c('(population) la fenêtre Apparence est ouverte, avec ses trois modes', (await S.ev(`return document.querySelectorAll('.tc-modes .chip').length;`)) === 3);
  juger('Sombre', await essai('sombre', toucher('dark'), 'dark'), 280);
  juger('Clair', await essai('clair', toucher('light'), 'light'), 280);
  const meme = await essai('meme', toucher('light'), 'light');
  c('le thème DÉJÀ affiché, choisi de nouveau : aucune transition (rien ne clignote)', !meme.a.vt, meme.a);
  await S.ev(`try{ closeModal(true); }catch(e){} return 1;`); await dormir(600);

  console.log('\n2. le système passe à la nuit (réglage « Auto »)');
  await S.ev(`(typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('auto'); return 1;`); await dormir(900);
  juger('Système', await essai('systeme', () => S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] }), 'dark'));

  console.log('\n3. un réglage arrive d’un autre appareil (synchro)');
  juger('Synchro', await essai('synchro', () => S.ev(`currentUser.pref=Object.assign({},currentUser.pref,{theme:'light'}); prefAppliquer(currentUser,true); return 1;`), 'light'));

  console.log('\n4. l’ouverture d’une session pose le thème tout de suite');
  const ouv = await S.ev(`window.__vt.length=0; currentUser.pref=Object.assign({},currentUser.pref,{theme:'dark'}); prefAppliquer(currentUser); return {th:document.documentElement.getAttribute('data-theme'), vt:window.__vt.length};`);
  c('prefAppliquer sans fondu (enterApp) : thème posé dans le même instant, aucune transition', ouv.th === 'dark' && ouv.vt === 0, ouv);
  await dormir(500);

  console.log('\n5. réduire les animations : le fondu reste, plus court');
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`themeCouleur(); return 1;`); await dormir(900);
  juger('Sobre', await essai('sobre', toucher('light'), 'light'), 200);
  await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
