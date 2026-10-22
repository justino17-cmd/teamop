/* ══ SONDE — LA FEUILLE « CRÉER » A LE VOILE DES FENÊTRES (audit apple-design, point 28) ═════════════════════════════════════
   Dans la vraie page (iPhone, rendu SwiftShader : seul il floute juste), jour et nuit :
     · ouverte (montée FINIE), son voile a la teinte et le flou de celui d'une fenêtre (#overlay, mesuré dans la même page) ;
     · AU PIXEL : la page sous le voile perd son détail — l'énergie des contrastes entre pixels voisins, dans une bande au-dessus
       de la feuille, chute nettement par rapport à la même bande sans voile (sur la page d'avant, elle restait celle d'un aplat
       teinté : le texte se lisait) ;
     · tirée de 80 px au doigt (moins du tiers de sa hauteur), le flou s'allège avec la couleur ; relâchée après un arrêt,
       elle remonte et le voile redevient entier ;
     · fermée, plus de flou ; « moins de transparence » : teinte sans flou.
   CAPTURES=dossier : la feuille ouverte, jour et nuit. SOURCE=fichier : la contre-épreuve. ⛔ Bêta uniquement, 127.0.0.1. */
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
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const images = () => S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`);
  const fini = (sel) => S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 0; const img=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); await img();
    const t0=performance.now(); while(performance.now()-t0<4000){ const a=e.getAnimations({subtree:true}).filter(x=>x.playState==='running'); if(!a.length) break; await Promise.race([Promise.all(a.map(x=>x.finished.catch(()=>0))),new Promise(r=>setTimeout(r,600))]); await img(); } return 1;`);
  /* l'énergie des contrastes entre voisins dans une bande (y0..y1), à la densité de l'écran */
  const energie = async (y0, y1) => { const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); const b = Buffer.from(im.data, 'base64'); const I = decoder(b), n = I.data.length / (I.w * I.h);
    const k = I.w / (await S.ev(`return innerWidth;`)); let e = 0, m = 0; const L = (x, y) => { const i = (y * I.w + x) * n; return 0.2126 * I.data[i] + 0.7152 * I.data[i + 1] + 0.0722 * I.data[i + 2]; };
    for (let y = Math.round(y0 * k); y < Math.round(y1 * k); y++) for (let x = 1; x < I.w; x++) { e += Math.abs(L(x, y) - L(x - 1, y)); m++; } return { e: +(e / m).toFixed(2), b }; };
  for (const theme of ['light', 'dark']) {
    console.log('\n' + (theme === 'light' ? 'jour' : 'nuit'));
    await S.ev(`(typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('${theme}'); go('dashboard'); return 1;`); await dormir(1800);
    /* la référence : une fenêtre, dans la même page */
    await S.ev(`formClient(); return 1;`); await dormir(500); await fini('#overlay');
    const fen = await S.ev(`const cs=getComputedStyle(document.getElementById('overlay')); return {bg:cs.backgroundColor, bf:cs.backdropFilter};`);
    await S.ev(`closeModal(true); return 1;`); await dormir(700);
    const sans = await energie(120, 300);
    await S.ev(`creerOuvrir(); return 1;`); await dormir(300); await fini('#creer');
    const g = await S.ev(`const o=document.getElementById('creer'), cs=getComputedStyle(o), f=o.querySelector('.creer-sheet').getBoundingClientRect(); return {bg:cs.backgroundColor, bf:cs.backdropFilter, haut:Math.round(f.top), x:Math.round(f.left+f.width/2), y:Math.round(f.top+22)};`);
    c('ouverte : la teinte du voile est celle d’une fenêtre (' + fen.bg + ')', g.bg === fen.bg, [g.bg, fen.bg]);
    c('… et son flou aussi (' + fen.bf + ')', g.bf === fen.bf && /blur\(20px\)/.test(g.bf), [g.bf, fen.bf]);
    const avec = await energie(120, Math.min(300, g.haut - 10));
    if (CAP) fs.writeFileSync(path.join(CAP, 'creer-' + theme + '.png'), avec.b);
    c('au pixel, la page sous le voile perd son détail : énergie des contrastes ' + sans.e + ' → ' + avec.e + ' (moins de la moitié)', g.haut > 320 && avec.e < sans.e * 0.5, { sans: sans.e, avec: avec.e, hautFeuille: g.haut });
    /* tirée de 80 px (moins du tiers de sa hauteur), puis relâchée après un arrêt */
    await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.x, y: g.y, id: 1 }] });
    for (let y = g.y + 20; y <= g.y + 80; y += 20) { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.x, y, id: 1 }] }); await images(); }
    const tire = await S.ev(`const o=document.getElementById('creer'); return {bf:o.style.backdropFilter, bg:o.style.backgroundColor};`);
    const fb = +((/blur\(([\d.]+)px\)/.exec(tire.bf) || [])[1] || -1);
    c('tirée de 80 px : le flou s’allège avec la couleur (entre 0 et 20 px)', fb > 0 && fb < 20 && /rgba/.test(tire.bg), tire);
    await dormir(300); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await dormir(200); await fini('#creer');
    const rel = await S.ev(`const o=document.getElementById('creer'), cs=getComputedStyle(o); return {ouverte:o.classList.contains('vu'), enLigne:o.style.backdropFilter, bf:cs.backdropFilter};`);
    c('relâchée lentement : elle remonte, le voile redevient entier (plus rien en ligne)', rel.ouverte && rel.enLigne === '' && rel.bf === fen.bf, rel);
    await S.ev(`creerFermer(); return 1;`); await dormir(200); await fini('#creer'); await dormir(300);
    const fe = await S.ev(`const o=document.getElementById('creer'); return o?{on:o.classList.contains('on'), bf:getComputedStyle(o).backdropFilter}:{retire:true};`);
    c('fermée : plus de flou', fe.retire || !fe.on || fe.bf === 'none', fe);
  }
  console.log('\nmoins de transparence');
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  await S.ev(`creerOuvrir(); return 1;`); await dormir(300); await fini('#creer');
  const rt = await S.ev(`const cs=getComputedStyle(document.getElementById('creer')); return {bg:cs.backgroundColor, bf:cs.backdropFilter};`);
  c('teinte gardée, aucun flou', rt.bf === 'none' && /rgba\([^)]*0\.[1-9]/.test(rt.bg), rt);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
