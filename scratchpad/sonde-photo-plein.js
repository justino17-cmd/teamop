/* ══ SONDE — UNE PHOTO S'OUVRE EN GRAND DANS L'APPLICATION, ET ELLE SE LIT (audit apple-design, point 21) ══════════════════
   Dans la vraie page (iPhone), au vrai doigt (Input.dispatchTouchEvent), sur une photo gardée sur l'appareil (adresse data:,
   le cas où window.open n'affichait RIEN) posée sur une intervention :
     1. toucher la vignette de la fiche : aucun onglet ouvert (window.open compté), la visionneuse couvre TOUT l'écran
        (barre d'onglets comprise), la photo est contenue dans l'écran, « Fermer » a le focus ;
     2. pincer à deux doigts : la photo grandit ; double toucher : elle revient ;
     3. tirer vers le bas : elle suit, puis part ; aucun clic ne traverse vers la vignette ; la fiche est toujours là ;
     4. Échap et le retour système la ferment, et seulement elle (la fiche reste, la rubrique ne change pas) ;
     5. ouverte depuis une feuille secondaire (#overlay2, comme au Contrôle) : la feuille est encore là, intacte, après.
   CAPTURES=dossier : la visionneuse ouverte, puis tirée à mi-course, jour et nuit.
   SOURCE=fichier : la contre-épreuve sur la page d'avant (window.open appelé, aucune visionneuse).
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
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
  const T = (type, pts) => S.c.envoyer('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i + 1 })) });
  /* ⛔ on attend que la photo soit ARRIVÉE, pas un délai ni la seule liste des animations : ce Chromium n'avance une transition
     qu'au rythme des images qu'il produit, et une transition posée dans un gestionnaire de toucher n'est pas toujours déjà dans
     la liste quand on la lit. On attend donc deux images, puis que plus rien ne bouge sur la couche (4 s au plus). */
  const finAnim = (sel) => S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 0; const img=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    await img(); const t0=performance.now();
    while(performance.now()-t0<4000){ const a=(e.isConnected?e.getAnimations({subtree:true}):[]).filter(x=>x.playState==='running'||x.playState==='pending'); if(!a.length) break;
      await Promise.race([Promise.all(a.map(x=>x.finished.catch(()=>0))), new Promise(r=>setTimeout(r,600))]); await img(); }
    return 1;`);
  const etat = () => S.ev(`const o=document.querySelector('.vph'), i=o&&o.querySelector('img'); if(!o) return {ouverte:false};
    const r=i.getBoundingClientRect(), m=getComputedStyle(i).transform, v=m&&m!=='none'?m.match(/-?[\\d.]+/g).map(Number):[1,0,0,1,0,0];
    return {ouverte:true, vu:o.classList.contains('vu'), sort:o.classList.contains('feuille-sort'), s:+v[0].toFixed(3), x:Math.round(v[4]), y:Math.round(v[5]),
      r:{l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}, fond:getComputedStyle(o).backgroundColor,
      focus:document.activeElement&&document.activeElement.className, dedans:!!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.vph')),
      anneau:document.activeElement?getComputedStyle(document.activeElement).outlineStyle:'', W:innerWidth, H:innerHeight};`);
  /* une photo de 1 200 × 900, gardée sur l'appareil (data:), avec une mire et un texte fin qu'il faut zoomer pour lire */
  await S.ev(`const cv=document.createElement('canvas'); cv.width=1200; cv.height=900; const g=cv.getContext('2d');
    const d=g.createLinearGradient(0,0,1200,900); d.addColorStop(0,'#2b6cb0'); d.addColorStop(1,'#38a169'); g.fillStyle=d; g.fillRect(0,0,1200,900);
    g.fillStyle='#fff'; g.font='bold 120px sans-serif'; g.fillText('BON N° 4521',120,300); g.font='28px sans-serif';
    for(let k=0;k<10;k++) g.fillText('Ligne '+(k+1)+' — Raticide pâte 10 kg × 3 · lot A-2026-'+(100+k),120,420+k*42);
    window.__photo=cv.toDataURL('image/jpeg',.85);
    const i=db.interventions.find(x=>x.statut!=='annulee')||db.interventions[0]; i.photos=[__photo,__photo]; save(); window.__int=i.id; return 1;`);
  await S.ev(`window.__onglets=0; window.open=function(){ __onglets++; return null; }; return 1;`);

  console.log('\n1. toucher la vignette de la fiche');
  await S.ev(`go('interventions'); return 1;`); await dormir(900);
  await S.ev(`detailIntervention(__int); return 1;`); await dormir(1200);
  await S.ev(`intTab='docs'; fsTab='medias'; renderIntDetail(__int); return 1;`); await dormir(900);   // l'onglet Documents → Médias : la grille des photos
  /* la vignette : dans la fiche, la grille des photos (selon l'onglet), sinon le bloc Photos du détail */
  let v = await S.ev(`const vis=[...document.querySelectorAll('img')].filter(x=>x.src===__photo&&x.offsetWidth>20); return vis.length;`);
  if (!v) { await S.ev(`const t=[...document.querySelectorAll('.tab,.seg span,button,[onclick]')].find(x=>/Photos|Médias/.test(x.textContent||'')&&x.offsetWidth); if(t) t.click(); return 1;`); await dormir(900); }
  const vig = await S.ev(`const x=[...document.querySelectorAll('img')].find(x=>x.src===__photo&&x.offsetWidth>20); if(!x) return null; x.scrollIntoView({block:'center'});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); window.__vig=x; window.__clicsVig=0; x.addEventListener('click',()=>__clicsVig++);
    const r=x.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2), w:Math.round(r.width), onclick:x.getAttribute('onclick')};`);
  c('(population) une vignette de la photo est à l’écran', !!vig, vig);
  if (!vig) { console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); await S.fermer(); process.exit(1); }
  const vue0 = await S.ev(`return current;`);
  await T('touchStart', [[vig.x, vig.y]]); await T('touchEnd', []); await dormir(150);
  await finAnim('.vph'); await finAnim('.vph img');
  await S.ev(`window.__clicsVig=0; window.__vphLog=[]; for(const n of ['vphBascule','photoPleinFermer','vphRamener']){ const f=window[n]; window[n]=function(){ __vphLog.push(n); return f.apply(this,arguments); }; } return 1;`);   // l'appui qui l'ouvre était voulu
  let e = await etat();
  c('aucun onglet ouvert (window.open jamais appelé)', (await S.ev(`return __onglets;`)) === 0, await S.ev(`return __onglets;`));
  c('la visionneuse est ouverte, fond noir PLEIN (' + e.fond + ')', e.ouverte && e.vu && /^rgba?\(0, 0, 0(, 1)?\)$/.test(e.fond), e);
  /* au pixel (partie W) : sous l'en-tête, là où la barre de l'application transparaissait (« ＋ Créer », la cloche), plus rien */
  { const { decoder } = require(path.join(__dirname, 'png.js')); const F0 = await S.ev(`return {w:innerWidth, x:scrollX, y:scrollY};`);
    /* ⚠ le clip se donne en coordonnées du DOCUMENT (la fiche est défilée jusqu'à la vignette), comme dans sonde-barre.js */
    const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: F0.x, y: F0.y + 40, width: F0.w, height: 70, scale: 1 } });
    const I = decoder(Buffer.from(im.data, 'base64')), k0 = I.w / F0.w; let fantome = 0, n = 0;
    const titre = await S.ev(`const r=document.querySelector('.vph-tete').getBoundingClientRect(), f=document.querySelector('.vph-fermer').getBoundingClientRect(), t=document.querySelector('.vph-titre').getBoundingClientRect(); return {f:[f.left-6,f.right+6], t:[t.left-6,t.right+6]};`);
    for (let y = 0; y < I.h; y++) for (let x = 0; x < I.w; x++) { const xc = x / k0; if ((xc >= titre.f[0] && xc <= titre.f[1]) || (xc >= titre.t[0] && xc <= titre.t[1])) continue;
      const k = (y * I.w + x) * 4; n++; if (Math.max(I.data[k], I.data[k + 1], I.data[k + 2]) > 6) fantome++; }
    c('… au pixel : hors de « Fermer » et du titre, la bande de l’en-tête est noire (' + fantome + ' points de l’application qui transparaissent, sur ' + n + ')', n > 5000 && fantome === 0, { fantome, n, I: [I.w, I.h] }); }
  c('la photo est à sa place : aucune transformation, contenue dans l’écran (4:3, pleine largeur moins les marges)', e.ouverte && e.s === 1 && e.x === 0 && e.y === 0 && e.r.l >= 0 && e.r.l + e.r.w <= e.W && Math.abs(e.r.w / e.r.h - 4 / 3) < 0.02 && e.r.w >= e.W - 30, e);
  const dessus = await S.ev(`const H=innerHeight, W=innerWidth; return [[W/2,H/2],[W/2,H-30],[W/2,20],[20,H/2]].map(([x,y])=>{ const t=document.elementFromPoint(x,y); return !!(t&&t.closest('.vph')); });`);
  c('elle couvre TOUT : le centre, la barre d’onglets, le haut, les bords', dessus.every(Boolean), dessus);
  c('le focus est DANS la visionneuse (lecteur d’écran, clavier), sans anneau dessiné au toucher', e.dedans && e.anneau === 'none', [e.focus, e.anneau]);
  /* captures : le thème se pose AVANT d'ouvrir (son changement passe par une transition de vue, qui recouvre tout le temps
     qu'elle dure — une capture prise pendant montre un mélange des deux pages, pas la visionneuse) */
  if (CAP) { for (const th of ['light', 'dark']) {
      await S.ev(`photoPleinFermer(); return 1;`); await dormir(500); await S.ev(`setThemePref('${th}'); return 1;`); await dormir(1800);
      const r = await S.ev(`const x=__vig; x.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=x.getBoundingClientRect(); return {x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2)};`);
      await T('touchStart', [[r.x, r.y]]); await T('touchEnd', []); await dormir(150); await finAnim('.vph'); await finAnim('.vph img'); await dormir(300);
      const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, 'photo-ouverte-' + th + '.png'), Buffer.from(im.data, 'base64')); }
    await S.ev(`window.__clicsVig=0; return 1;`); }

  if (!e.ouverte) { console.log('\n(la visionneuse ne s’est pas ouverte : la suite n’a rien à mesurer)\n' + ok + ' ✓  ' + ko + ' ✗'); await S.fermer(); process.exit(1); }   // contre-épreuve sur la page d'avant

  console.log('\n2. pincer, puis double toucher');
  const cx = Math.round(e.W / 2), cy = Math.round(e.r.t + e.r.h / 2);
  await T('touchStart', [[cx - 50, cy], [cx + 50, cy]]); await images();
  for (const d of [80, 110, 140]) { await T('touchMove', [[cx - d, cy], [cx + d, cy]]); await images(); }
  e = await etat(); c('deux doigts qui s’écartent de 100 à 280 px : la photo grandit (~2,8×) sous les doigts', e.s > 2.4 && e.s < 3.2, e);
  await T('touchEnd', []); await dormir(150); await finAnim('.vph img');
  e = await etat(); c('relâchée : elle reste agrandie, ouverte', e.ouverte && e.s > 2.4, e);
  await T('touchStart', [[cx, cy]]); await T('touchEnd', []); await dormir(90); await T('touchStart', [[cx, cy]]); await T('touchEnd', []);
  await dormir(150); await finAnim('.vph img');
  e = await etat(); c('double toucher : elle revient à sa taille, centrée', e.ouverte && e.s === 1 && e.x === 0 && e.y === 0, [e, await S.ev(`return __vphLog.splice(0);`)]);
  /* les deux touchers d'un double toucher tombent au même endroit (30 px de tolérance) : ici, 60 px à droite du centre */
  await T('touchStart', [[cx + 60, cy - 40]]); await T('touchEnd', []); await dormir(90); await T('touchStart', [[cx + 62, cy - 38]]); await T('touchEnd', []);
  await dormir(150); await finAnim('.vph img');
  e = await etat(); c('double toucher sur une photo à sa taille : 2,5×, autour du point touché (il reste sous le doigt : x ≈ −1,5 × 61)', e.ouverte && Math.abs(e.s - 2.5) < 0.01 && Math.abs(e.x + 91) < 4, e);
  await T('touchStart', [[cx, cy]]); await T('touchEnd', []); await dormir(90); await T('touchStart', [[cx, cy]]); await T('touchEnd', []); await dormir(150); await finAnim('.vph img');

  console.log('\n3. tirer vers le bas');
  await T('touchStart', [[cx, cy]]);
  for (let k = 1; k <= 6; k++) { await T('touchMove', [[cx, cy + k * 20]]); await images(); }
  e = await etat(); c('elle suit le doigt (120 px), rapetisse, et le fond s’éclaircit', e.ouverte && e.y > 90 && e.s < 1 && /rgba\(0, 0, 0, 0\.[5-8]/.test(e.fond), e);
  { await dormir(260);   // le doigt toujours posé : l'en-tête s'efface en --d-2
    const t = await S.ev(`const h=document.querySelector('.vph-tete'); return h?+getComputedStyle(h).opacity:null;`);
    c('… et l’en-tête s’efface : la photo seule suit le doigt (opacité ' + t + ')', t !== null && t < 0.05, t); }
  if (CAP) { const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, 'photo-tiree.png'), Buffer.from(im.data, 'base64')); }
  await dormir(300); await T('touchEnd', []); await dormir(150); await finAnim('.vph img');
  e = await etat(); c('lâchée à 120 px après un arrêt : elle revient', e.ouverte && e.y === 0 && e.s === 1, e);
  await T('touchStart', [[cx, cy]]);
  for (let k = 1; k <= 12; k++) { await T('touchMove', [[cx, cy + k * 30]]); await images(); }
  await T('touchEnd', []); await dormir(600);
  e = await etat(); c('tirée de 360 px : elle part, et la couche est retirée', !e.ouverte, e);
  c('aucun clic n’a traversé vers la vignette', (await S.ev(`return __clicsVig;`)) === 0, await S.ev(`return __clicsVig;`));
  c('la fiche est toujours là, la rubrique n’a pas changé', (await S.ev(`return current;`)) === vue0 && (await S.ev(`return __vig.isConnected;`)), await S.ev(`return current;`));

  console.log('\n4. Échap, puis le retour système');
  const rouvre = async () => { const r = await S.ev(`const x=__vig; x.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=x.getBoundingClientRect(); return {x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2)};`);
    await T('touchStart', [[r.x, r.y]]); await T('touchEnd', []); await dormir(150); await finAnim('.vph'); return etat(); };
  e = await rouvre(); c('rouverte', e.ouverte && e.vu, e);
  await S.c.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await S.c.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await dormir(600);
  e = await etat(); c('Échap la ferme', !e.ouverte, e);
  c('… et seulement elle : la fiche est encore là', (await S.ev(`return __vig.isConnected&&current;`)) === vue0);
  e = await rouvre(); c('rouverte', e.ouverte, e);
  await S.ev(`history.back(); return 1;`); await dormir(900);
  e = await etat(); c('le retour système la ferme', !e.ouverte, e);
  c('… et seulement elle : la fiche est encore là', (await S.ev(`return __vig.isConnected&&current;`)) === vue0, await S.ev(`return [__vig.isConnected,current];`));

  console.log('\n5. depuis une feuille secondaire (#overlay2)');
  await S.ev(`openSub('<div class="modal-head"><h3>Détail sonde</h3></div><div style="padding:16px"><img id="sonde-sub" src="'+__photo+'" onclick="photoPlein(this,\\'Ticket TPE\\')" style="width:120px;height:90px;object-fit:cover"></div>'); return 1;`);
  await dormir(500);
  const s5 = await S.ev(`const x=document.getElementById('sonde-sub').getBoundingClientRect(); return {x:Math.round(x.left+x.width/2), y:Math.round(x.top+x.height/2)};`);
  await T('touchStart', [[s5.x, s5.y]]); await T('touchEnd', []); await dormir(150); await finAnim('.vph');
  e = await etat(); c('la photo s’ouvre au-dessus de la feuille', e.ouverte && e.vu, e);
  c('… et la feuille est intacte dessous (son contenu n’est pas remplacé)', await S.ev(`return document.getElementById('overlay2').classList.contains('open') && !!document.getElementById('sonde-sub');`));
  await S.ev(`document.querySelector('.vph-fermer').click(); return 1;`); await dormir(600);
  c('« Fermer » : la photo part, la feuille reste ouverte avec son contenu', !(await etat()).ouverte && await S.ev(`return document.getElementById('overlay2').classList.contains('open') && !!document.getElementById('sonde-sub');`));
  await S.ev(`closeSub(); return 1;`); await dormir(400);

  console.log('\n6. animations réduites');
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const s6 = await S.ev(`const x=__vig; x.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=x.getBoundingClientRect(); return {x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2)};`);
  await T('touchStart', [[s6.x, s6.y]]); await T('touchEnd', []); await images();
  e = await etat(); c('elle paraît à sa place, sans voyage depuis la vignette', e.ouverte && e.s === 1 && e.x === 0 && e.y === 0, e);
  await S.ev(`document.querySelector('.vph-fermer').click(); return 1;`); await images();
  c('… et disparaît tout de suite', !(await etat()).ouverte);
  c('(fin) toujours aucun onglet ouvert', (await S.ev(`return __onglets;`)) === 0);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
