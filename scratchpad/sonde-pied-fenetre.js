/* ══ SONDE — LE PIED D'UNE FENÊTRE A LA MATIÈRE DE SON EN-TÊTE (audit apple-design, point 22) ═══════════════════════════════
   Dans la vraie page (iPhone, rendu SwiftShader : le flou d'une vitre mince n'est juste que par lui), le formulaire d'un
   client (formClient, un long formulaire à pied collant), défilé au milieu :
     1. le style calculé du pied et de l'en-tête : même fond translucide, même flou ;
     2. AU PIXEL : le formulaire se voit défiler sous le pied — la bande du pied (hors boutons) capturée avant et après un
        défilement de 60 px : sous un aplat elle ne change pas, sous la vitre elle change ;
     3. « moins de transparence » : le pied redevient plein.
   CAPTURES=dossier : le bas de la fenêtre, jour et nuit. SOURCE=fichier : la contre-épreuve sur la page d'avant.
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
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const fini = () => S.ev(`const m=document.getElementById('modal'); const img=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); await img();
    const t0=performance.now(); while(performance.now()-t0<4000){ const a=document.getAnimations().filter(x=>x.playState==='running'&&x.effect&&x.effect.target&&(x.effect.target===m||m.contains(x.effect.target)||x.effect.target.id==='overlay')&&isFinite(x.effect.getComputedTiming().endTime)); if(!a.length) break; await Promise.race([Promise.all(a.map(x=>x.finished.catch(()=>0))),new Promise(r=>setTimeout(r,600))]); await img(); } return 1;`);
  for (const theme of ['light', 'dark']) {
    console.log('\n' + (theme === 'light' ? 'jour' : 'nuit'));
    await S.ev(`try{ closeModal(true); }catch(e){} setThemePref('${theme}'); return 1;`); await dormir(1600);
    await S.ev(`formClient(); return 1;`); await dormir(600); await fini();
    /* au milieu du formulaire : du contenu passe sous le pied */
    const g = await S.ev(`const m=document.getElementById('modal'), f=m.querySelector('.modal-foot'), h=m.querySelector('.modal-head');
      const sc=(()=>{ let x=f; while(x&&x!==document.body){ const s=getComputedStyle(x); if(/(auto|scroll)/.test(s.overflowY)&&x.scrollHeight>x.clientHeight+10) return x; x=x.parentElement; } return document.scrollingElement; })();
      sc.scrollTop=Math.max(0,(sc.scrollHeight-sc.clientHeight)/2); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const cs=getComputedStyle(f), ch=getComputedStyle(h), r=f.getBoundingClientRect();
      const bt=[...f.querySelectorAll('button,.btn')].map(b=>b.getBoundingClientRect()).filter(b=>b.width);
      return {fond:cs.backgroundColor, flou:cs.backdropFilter, fondH:ch.backgroundColor, flouH:ch.backdropFilter, filet:cs.borderTopColor, pos:cs.position,
        r:{l:r.left,t:r.top,w:r.width,h:r.height}, boutons:bt.map(b=>({l:b.left,t:b.top,r:b.right,b:b.bottom})), defile:sc.scrollTop, H:innerHeight, W:innerWidth, dpr:devicePixelRatio};`);
    c('le pied est collant en bas, et la page a défilé (du formulaire passe dessous)', g.pos === 'sticky' && g.defile > 50, [g.pos, g.defile]);
    c('même fond que l’en-tête, translucide', g.fond === g.fondH && /rgba\([^)]*0\.8\)|color\(srgb[^)]*\/ 0\.8\)|oklab|color-mix/.test(g.fond), [g.fond, g.fondH]);
    c('même flou que l’en-tête', g.flou === g.flouH && /blur\(22px\)/.test(g.flou), [g.flou, g.flouH]);
    /* au pixel : le formulaire DÉFILE sous le pied. On capture la bande du pied (hors boutons), on fait défiler le formulaire
       de 60 px, on recapture : sous un aplat, la bande ne bouge pas (écart ~0) ; sous une vitre, ce qui passe dessous change.
       (Un écart-type de la bande seule ne tranchait pas : l'ancien pied opaque passait de jour, sur ses propres bords.) */
    const bande = async () => { const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); return Buffer.from(im.data, 'base64'); };
    const b1 = await bande(); if (CAP) fs.writeFileSync(path.join(CAP, 'pied-' + theme + '.png'), b1);
    await S.ev(`const f=document.querySelector('#modal .modal-foot'); let x=f; while(x&&x!==document.body){ const s=getComputedStyle(x); if(/(auto|scroll)/.test(s.overflowY)&&x.scrollHeight>x.clientHeight+10) break; x=x.parentElement; }
      (x&&x!==document.body?x:document.scrollingElement).scrollTop-=60; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;`);
    const b2 = await bande();
    const g2 = await S.ev(`const r=document.querySelector('#modal .modal-foot').getBoundingClientRect(); return {t:r.top,h:r.height};`);
    const I1 = decoder(b1), I2 = decoder(b2), n = I1.data.length / (I1.w * I1.h), k = g.dpr;
    const lumA = (I, x, y) => { const i = (Math.round(y * k) * I.w + Math.round(x * k)) * n; return 0.2126 * I.data[i] + 0.7152 * I.data[i + 1] + 0.0722 * I.data[i + 2]; };
    const libre = []; for (let y = Math.ceil(g.r.t + 3); y < g.r.t + g.r.h - 3; y++) for (let x = 6; x < g.W - 6; x++) if (!g.boutons.some(b => x >= b.l - 6 && x <= b.r + 6 && y >= b.t - 6 && y <= b.b + 6)) libre.push([x, y]);
    const d = libre.map(([x, y]) => Math.abs(lumA(I1, x, y) - lumA(I2, x, y))), md = d.reduce((a, b) => a + b, 0) / (d.length || 1);
    c('(population) la bande du pied hors boutons est mesurée sur plus de 2 000 points, et le pied n’a pas bougé', d.length > 2000 && Math.abs(g2.t - g.r.t) < 1, [d.length, g2.t, g.r.t]);
    c('au pixel, le formulaire se voit DÉFILER sous le pied : écart moyen de luminance ' + md.toFixed(2) + ' (> 0,5 ; un aplat rend ~0)', md > 0.5, { ecartMoyen: +md.toFixed(2) });
  }
  console.log('\nmoins de transparence');
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  await S.ev(`try{ closeModal(true); }catch(e){} formClient(); return 1;`); await dormir(600); await fini();
  const rt = await S.ev(`const f=document.querySelector('#modal .modal-foot'), cs=getComputedStyle(f); return {fond:cs.backgroundColor, flou:cs.backdropFilter};`);
  c('le pied redevient plein, sans flou', !/0\.8\)/.test(rt.fond) && rt.flou === 'none', rt);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
