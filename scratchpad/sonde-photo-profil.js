/* ══ « QUAND JE CHOISIS UNE PHOTO, J'AIMERAIS POUVOIR LA REDIMENSIONNER, ET ELLE NE S'AFFICHE PAS ICI » ══════════
   Justin, 26 septembre 2026, capture à l'appui : Paramètres → Apparence → « Photo de profil », un disque lilas VIDE
   (thème TEAM OP, teinte Violet) — ni photo, ni initiales. Les initiales disparaissent dès que `currentUser.photo`
   existe : la photo était donc bien ENREGISTRÉE, c'est l'AFFICHAGE qui ne suivait pas.
   Cause mesurée (v755) : `html[data-refonte] .avatar{background:…!important}` — un raccourci `background` en
   `!important` remet aussi `background-image` à `none` et bat le style en ligne. Style calculé `none`, pixels
   lilas (232,219,238), sur le disque des Paramètres ET sur celui du pied du menu.

   Cette sonde rejoue les gestes réels, au doigt (`Input.dispatchTouchEvent`), avec l'agent d'un iPhone :
     A. « Choisir une photo » (un vrai JPEG de 1 200 × 800 fabriqué dans la page, quatre quadrants de couleur pour
        savoir CE QUI a été gardé, passé au champ par un `DataTransfer`) → le recadrage s'ouvre → toucher
        « Choisir » sans rien bouger : le disque montre le CENTRE de la photo (rouge en haut à gauche, jaune en
        bas à droite) — au pixel, pas au style calculé ;
     B. rechoisir → glisser, pincer, le curseur : cadrer le coin rouge à ×4 → « Choisir » : l'image enregistrée
        est ROUGE partout, 256 × 256 ;
     C. rechoisir → « Annuler » : la photo d'avant reste ;
     D. un fichier illisible : un message, pas de fenêtre vide ;
     E. la fenêtre « Photo de profil » de la première connexion passe par le même recadrage.
   Chaque geste se mesure à ce que l'œil voit APRÈS (la règle du dépôt), et les mouvements de doigt sont relevés
   côté page : ce Chromium piloté ne transmet pas un mouvement de moins de ~15 px.
   Usage : node scratchpad/sonde-photo-profil.js           (la bêta du dépôt)
           SOURCE=/chemin/beta.html node scratchpad/…      (une autre copie : la contre-épreuve)
   ⛔ Bêta seulement, 127.0.0.1 seulement (pilote.js). */
const { ouvrir, dormir } = require('./pilote.js');
const { decoder } = require('./png.js');
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const coul = p => !Array.isArray(p) ? '?' : (p[0] > 170 && p[1] < 100 && p[2] < 100) ? 'rouge' : (p[1] > 120 && p[0] < 100 && p[2] < 100) ? 'vert'
  : (p[2] > 170 && p[0] < 100 && p[1] < 120) ? 'bleu' : (p[0] > 190 && p[1] > 150 && p[2] < 100) ? 'jaune' : 'autre(' + p.join(',') + ')';

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  const { c, ev } = S;
  const trames = () => ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;`);
  const toucher = async (type, pts) => c.envoyer('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i + 1 })) });
  /* un tap au centre d'un élément — après l'avoir amené au milieu de l'écran, et en prouvant que le point touché
     est bien lui (la règle du dépôt : une frappe qui ne porte pas se DIT perdue) */
  const taper = async sel => {
    const r = await ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=e.getBoundingClientRect();
      const x=b.left+b.width/2, y=b.top+b.height/2, h=document.elementFromPoint(x,y);
      return {x,y,w:b.width,h:b.height,touche:!!h&&(h===e||e.contains(h))};`);
    if (!r || !r.w || !r.touche) return r;
    await toucher('touchStart', [[r.x, r.y]]); await dormir(60); await toucher('touchEnd', []); await dormir(350);
    return r;
  };
  /* la couleur, AU PIXEL, de points d'un élément (fractions de sa largeur et de sa hauteur) */
  const pixels = async (sel, points) => {
    const r = await ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=e.getBoundingClientRect();
      return {x:b.left+window.scrollX,y:b.top+window.scrollY,w:b.width,h:b.height};`);
    if (!r || !r.w) return null;
    const cap = await c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
    const img = decoder(Buffer.from(cap.data, 'base64'));
    const at = (fx, fy) => { const x = Math.min(img.w - 1, Math.floor(img.w * fx)), y = Math.min(img.h - 1, Math.floor(img.h * fy)), i = (y * img.w + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
    const o = {}; for (const [n, fx, fy] of points) o[n] = coul(at(fx, fy)); return o;
  };
  /* choisir un fichier pour de vrai : le champ reçoit un File, puis l'événement change */
  const choisir = async (sel, illisible) => ev(`
      let blob;
      if(${!!illisible}){ blob=new Blob(['ceci n’est pas une image'],{type:'image/jpeg'}); }
      else { const cv=document.createElement('canvas'); cv.width=1200; cv.height=800; const g=cv.getContext('2d');
        g.fillStyle='#e02020'; g.fillRect(0,0,600,400);  g.fillStyle='#20a020'; g.fillRect(600,0,600,400);
        g.fillStyle='#2040e0'; g.fillRect(0,400,600,400); g.fillStyle='#f0c020'; g.fillRect(600,400,600,400);
        blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.92)); }
      const inp=document.querySelector(${JSON.stringify(sel)}); if(!inp) return {err:'champ absent'};
      const dt=new DataTransfer(); dt.items.add(new File([blob],'photo.jpg',{type:'image/jpeg'}));
      inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return {taille:blob.size};`);
  const attendreCadre = async () => { for (let i = 0; i < 40; i++) { if (await ev(`return !!document.querySelector('#overlay.open #pp-cadre')&&typeof _pp!=='undefined'&&!!_pp;`)) return true; await dormir(100); } return false; };
  /* l'image ENREGISTRÉE sur le compte, décodée dans la page : sa taille et ses couleurs */
  const lirePhoto = () => ev(`const u=db.users.find(x=>x.id==='beta-justin'); const d=(u&&u.photo)||'';
      if(!d) return {vide:true};
      const img=new Image(); await new Promise(r=>{ img.onload=r; img.onerror=r; img.src=d; });
      const cv=document.createElement('canvas'); cv.width=img.naturalWidth||1; cv.height=img.naturalHeight||1; const g=cv.getContext('2d'); g.drawImage(img,0,0);
      const px=(fx,fy)=>Array.from(g.getImageData(Math.floor(cv.width*fx),Math.floor(cv.height*fy),1,1).data).slice(0,3);
      return {debut:d.slice(0,23), l:d.length, w:img.naturalWidth, h:img.naturalHeight, hg:px(.2,.2), hd:px(.8,.2), bg:px(.2,.8), bd:px(.8,.8), c:px(.5,.5)};`);

  try {
    await c.envoyer('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'iPhone' });
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 2, mobile: true });
    await c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      try{ localStorage.removeItem(PLAT_CLE); }catch(e){} opPlatAppliquer();
      try{ localStorage.setItem('elanB_accent','purple'); }catch(e){} try{ applyTheme(); }catch(e){}
      if(!db.users.some(u=>u.id==='beta-justin')){ db.users.push({id:'beta-justin',prenom:'Justin',nom:'Bernard',login:'justin',role:'admin',actif:true,essai:true}); save(); }
      currentUser=db.users.find(u=>u.id==='beta-justin');
      try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); localStorage.setItem('elanB_push_ask_'+currentUser.id,'1'); localStorage.setItem('elanB_photo_prompt_'+currentUser.id,'1'); }catch(e){}
      enterApp(currentUser);
      window._toasts=[]; const t0=window.toast; window.toast=function(m){ window._toasts.push(String(m)); return t0.apply(this,arguments); };
      return 1;`);
    await dormir(1500);
    const v = await ev(`return {version:APP_VERSION, refonte:document.documentElement.hasAttribute('data-refonte'), plat:document.documentElement.getAttribute('data-plat')};`);
    console.log('\n══ ' + v.version + ' · ' + v.plat + (v.refonte ? ' · refonte' : '') + ' ══');
    await ev(`go('parametres'); return 1;`); await dormir(900);
    vrai('population : le disque « Photo de profil » des Paramètres est là, et montre les initiales',
      await ev(`const e=document.querySelector('#content .card span.avatar'); return !!e && e.textContent.trim().length>0;`));

    /* ── A. choisir, puis « Choisir » sans rien bouger ── */
    console.log('\n── A. choisir une photo, la garder telle qu’elle est cadrée ──');
    vrai('le fichier est passé au champ « Choisir une photo »', ((await choisir('#pp-file2')) || {}).taille > 1000);
    const cadreA = await attendreCadre();
    vrai('⛔ le RECADRAGE s’ouvre (puits, rond, curseur)', cadreA && await ev(`return !!document.querySelector('#pp-cadre .pp-rond')&&!!document.getElementById('pp-zoom');`));
    if (!cadreA) {
      /* sans recadrage (la contre-épreuve sur l'ancienne bêta) : on juge seulement l'affichage */
      await dormir(800);
      const st = await ev(`const e=document.querySelector('#content .card span.avatar'), f=document.getElementById('foot-ava');
        return {para:getComputedStyle(e).backgroundImage.slice(0,22), pied:getComputedStyle(f).backgroundImage.slice(0,22)};`);
      const dq = await pixels('#content .card span.avatar', [['hg', .3, .3], ['bd', .7, .7]]);
      console.log('   styles : ' + JSON.stringify(st) + ' · disque au pixel : ' + JSON.stringify(dq));
      vrai('⛔⛔ le disque des Paramètres AFFICHE la photo — au pixel', dq && dq.hg !== dq.bd && /rouge|vert|bleu|jaune/.test(dq.hg), dq);
      vrai('⛔⛔ le disque du pied du menu peint la photo', /^url\(/.test(st.pied), st);
      throw new Error('arrêt : pas de recadrage à jouer');
    }
    const e0 = await ev(`const p=_pp; return {z:p.z, x:+p.x.toFixed(2), y:+p.y.toFixed(2), D:p.D, k:+p.k.toFixed(5), iw:p.src.width, ih:p.src.height};`);
    console.log('   état initial : ' + JSON.stringify(e0));
    vrai('la source est ramenée à 1 600 px au plus, proportions gardées (1 200 × 800 : inchangée)', e0.iw === 1200 && e0.ih === 800, e0);
    vrai('au départ la photo REMPLIT le rond et se centre (hauteur = rond, marges égales à gauche et à droite)',
      Math.abs(e0.k * 800 - e0.D) < 0.5 && Math.abs(e0.y) < 0.01 && Math.abs(e0.x - (e0.D - e0.k * 1200) / 2) < 0.5, e0);
    const puitsA = await pixels('#pp-cadre', [['hg', .3, .3], ['bd', .7, .7]]);
    console.log('   puits au pixel : ' + JSON.stringify(puitsA));
    vrai('⛔ au pixel, le puits MONTRE la photo (rouge en haut à gauche du rond, jaune en bas à droite)', puitsA && puitsA.hg === 'rouge' && puitsA.bd === 'jaune', puitsA);
    const tA = await taper('#pp-ok');
    vrai('« Choisir » est touché au doigt (le point touché est bien le bouton)', tA && tA.touche, tA);
    await dormir(600);
    vrai('la fenêtre se ferme', !(await ev(`return document.getElementById('overlay').classList.contains('open');`)));
    const phA = await lirePhoto();
    console.log('   photo enregistrée : ' + JSON.stringify({ debut: phA.debut, l: phA.l, w: phA.w, h: phA.h }));
    vrai('⛔ la photo enregistrée fait 256 × 256, en JPEG', phA.w === 256 && phA.h === 256 && /^data:image\/jpeg;base64,/.test(phA.debut), phA);
    vrai('⛔ c’est le CARRÉ DU ROND : rouge en haut à gauche, vert en haut à droite, bleu en bas à gauche, jaune en bas à droite',
      coul(phA.hg) === 'rouge' && coul(phA.hd) === 'vert' && coul(phA.bg) === 'bleu' && coul(phA.bd) === 'jaune', [phA.hg, phA.hd, phA.bg, phA.bd].map(coul));
    await dormir(400);
    const disqueA = await pixels('#content .card span.avatar', [['hg', .3, .3], ['bd', .7, .7]]);
    const styleA = await ev(`const e=document.querySelector('#content .card span.avatar'), f=document.getElementById('foot-ava');
      return {para:getComputedStyle(e).backgroundImage.slice(0,22), pied:getComputedStyle(f).backgroundImage.slice(0,22), txt:e.textContent.trim()};`);
    console.log('   disque des Paramètres au pixel : ' + JSON.stringify(disqueA) + ' · styles : ' + JSON.stringify(styleA));
    vrai('⛔⛔ le disque des Paramètres AFFICHE la photo — au pixel (rouge en haut à gauche, jaune en bas à droite)',
      disqueA && disqueA.hg === 'rouge' && disqueA.bd === 'jaune', disqueA);
    vrai('⛔⛔ le disque du pied du menu peint la photo (style calculé : une image)', /^url\(/.test(styleA.pied), styleA);

    /* ── B. rechoisir, cadrer le coin rouge à ×4 : glisser, pincer, le curseur ── */
    console.log('\n── B. glisser, pincer, curseur : cadrer le coin rouge ──');
    await choisir('#pp-file2');
    if (!(await attendreCadre())) throw new Error('le recadrage ne s’est pas rouvert');
    await ev(`window._tm=0; document.getElementById('pp-cadre').addEventListener('touchmove',()=>{ window._tm++; },{capture:true}); return 1;`);
    const bx = await ev(`const e=document.getElementById('pp-cadre'); e.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const b=e.getBoundingClientRect(); return {x:b.left,y:b.top,w:b.width,h:b.height};`);
    const cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2;
    /* glisser vers la droite de 100 px : la photo suit le doigt, jusqu'au bord (elle doit couvrir le rond) */
    const avG = await ev(`return {x:_pp.x,y:_pp.y};`);
    await toucher('touchStart', [[cx - 50, cy]]); await trames();
    for (let i = 1; i <= 5; i++) { await toucher('touchMove', [[cx - 50 + i * 20, cy]]); await trames(); }
    await toucher('touchEnd', []); await trames();
    const apG = await ev(`return {x:_pp.x,y:_pp.y,tm:window._tm};`);
    console.log('   glisser : ' + JSON.stringify(avG) + ' → ' + JSON.stringify(apG));
    vrai('population : la page a reçu les mouvements du doigt', apG.tm >= 3, apG.tm);
    vrai('⛔ un doigt DÉPLACE la photo, dans le sens du doigt, et s’arrête au bord (x = 0 : le bord gauche de la photo sur celui du rond)',
      apG.x > avG.x && Math.abs(apG.x) < 0.01 && Math.abs(apG.y - avG.y) < 0.01, { avant: avG, apres: apG });
    /* pincer : deux doigts qui s'écartent de 60 à 180 px → ×3 */
    const avP = await ev(`return {z:_pp.z};`);
    await toucher('touchStart', [[cx - 30, cy], [cx + 30, cy]]); await trames();
    for (let i = 1; i <= 4; i++) { await toucher('touchMove', [[cx - 30 - i * 15, cy], [cx + 30 + i * 15, cy]]); await trames(); }
    await toucher('touchEnd', []); await trames();
    const apP = await ev(`return {z:+_pp.z.toFixed(3), curseur:+document.getElementById('pp-zoom').value};`);
    console.log('   pincer : ' + JSON.stringify(avP) + ' → ' + JSON.stringify(apP));
    vrai('⛔ deux doigts qui s’écartent AGRANDISSENT (×3 attendu, à l’arrondi des mouvements transmis près)', apP.z > 2.2 && apP.z <= 4, apP);
    vrai('   le curseur suit le pincement', Math.abs(apP.curseur - apP.z) < 0.02, apP);
    /* le curseur, jusqu'au bout (×4) */
    await ev(`const z=document.getElementById('pp-zoom'); z.value='4'; z.dispatchEvent(new Event('input',{bubbles:true})); return 1;`); await trames();
    const apC = await ev(`return {z:_pp.z, k:_pp.k, kmin:_pp.kmin};`);
    vrai('le curseur agrandit jusqu’à ×4, pas au-delà', Math.abs(apC.z - 4) < 1e-9 && Math.abs(apC.k - 4 * apC.kmin) < 1e-9, apC);
    /* glisser vers le bas-droite, loin — deux passages de 280 px (à ×4 la photo déborde de 420 px de chaque
       côté du rond) : le coin haut-gauche de la photo vient au coin du rond, et s'y arrête */
    for (let passe = 0; passe < 2; passe++) {
      await toucher('touchStart', [[cx - 140, cy - 140]]); await trames();
      for (let i = 1; i <= 7; i++) { await toucher('touchMove', [[cx - 140 + i * 40, cy - 140 + i * 40]]); await trames(); }
      await toucher('touchEnd', []); await trames();
    }
    const apD = await ev(`return {x:_pp.x,y:_pp.y};`);
    vrai('⛔ la photo couvre toujours le rond : poussée au-delà, elle s’arrête à son coin (x = 0, y = 0)', Math.abs(apD.x) < 0.01 && Math.abs(apD.y) < 0.01, apD);
    const puitsB = await pixels('#pp-cadre', [['hg', .25, .25], ['hd', .75, .25], ['bg', .25, .75], ['bd', .75, .75]]);
    vrai('⛔ au pixel, le rond n’est plus que ROUGE (le coin de la photo, agrandi ×4)', puitsB && Object.values(puitsB).every(x => x === 'rouge'), puitsB);
    const tB = await taper('#pp-ok'); await dormir(600);
    vrai('« Choisir » touché au doigt', tB && tB.touche, tB);
    const phB = await lirePhoto();
    console.log('   photo enregistrée : ' + JSON.stringify({ w: phB.w, h: phB.h, l: phB.l, px: [phB.hg, phB.hd, phB.bg, phB.bd, phB.c].map(coul) }));
    vrai('⛔⛔ ce qui est ENREGISTRÉ est ce qu’on a cadré : rouge aux quatre coins et au centre, 256 × 256',
      phB.w === 256 && [phB.hg, phB.hd, phB.bg, phB.bd, phB.c].every(p => coul(p) === 'rouge'), [phB.hg, phB.hd, phB.bg, phB.bd, phB.c].map(coul));
    await dormir(400);
    const disqueB = await pixels('#content .card span.avatar', [['hg', .3, .3], ['bd', .7, .7], ['c', .5, .5]]);
    vrai('⛔ et le disque des Paramètres le montre, au pixel', disqueB && Object.values(disqueB).every(x => x === 'rouge'), disqueB);
    vrai('   la photo reste légère (elle voyage dans la synchro de l’équipe) : moins de 30 Ko', phB.l < 30000, phB.l);

    /* ── C. « Annuler » ne touche à rien ── */
    console.log('\n── C. « Annuler » ──');
    await choisir('#pp-file2'); await attendreCadre();
    const tC = await taper('.sheet-head .btn.ghost');
    await dormir(500);
    vrai('« Annuler » touché au doigt, la fenêtre se ferme', tC && tC.touche && !(await ev(`return document.getElementById('overlay').classList.contains('open');`)), tC);
    const phC = await lirePhoto();
    vrai('⛔ la photo d’avant reste (toujours le rouge cadré en B)', coul(phC.c) === 'rouge' && coul(phC.bd) === 'rouge', [phC.c, phC.bd].map(coul));
    vrai('   et l’état du recadrage est oublié', await ev(`return _pp===null;`));

    /* ── D. un fichier illisible ── */
    console.log('\n── D. un fichier qui n’est pas une image ──');
    await ev(`window._toasts=[]; return 1;`);
    await choisir('#pp-file2', true); await dormir(900);
    const d = await ev(`return {ouvert:document.getElementById('overlay').classList.contains('open'), toasts:window._toasts.slice()};`);
    vrai('⛔ un message le dit, et aucune fenêtre vide ne s’ouvre', !d.ouvert && d.toasts.some(t => /n'a pas pu être lue/.test(t)), d);

    /* ── F. fermer par Échap, puis par une navigation : le recadrage est oublié (relecture v756) ── */
    console.log('\n── F. Échap et navigation : le recadrage ne survit pas à sa fenêtre ──');
    await choisir('#pp-file2'); vrai('population : le recadrage est ouvert', await attendreCadre());
    await ev(`document.getElementById('pp-cadre').focus(); return 1;`);
    await c.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await c.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await dormir(400);
    const f1 = await ev(`return {ouvert:document.getElementById('overlay').classList.contains('open'), pp:_pp===null};`);
    vrai('⛔ Échap ferme la fenêtre ET oublie le recadrage', !f1.ouvert && f1.pp, f1);
    await choisir('#pp-file2'); await attendreCadre();
    await ev(`go('dashboard'); return 1;`); await dormir(700);
    const f2 = await ev(`return {ouvert:document.getElementById('overlay').classList.contains('open'), pp:_pp===null, vue:current};`);
    vrai('⛔ une navigation (le geste « retour » y mène) ferme la fenêtre ET oublie le recadrage', !f2.ouvert && f2.pp && f2.vue === 'dashboard', f2);
    await ev(`go('parametres'); return 1;`); await dormir(700);

    /* ── E. la première connexion propose aussi une photo : même chemin ── */
    console.log('\n── E. la fenêtre « Photo de profil » de la première connexion ──');
    await ev(`setProfilePhoto('',null,true); try{ localStorage.removeItem('elanB_photo_prompt_beta-justin'); }catch(e){} closeModal(); maybeProfilePhoto(); return 1;`); await dormir(500);
    vrai('population : la fenêtre de première connexion est ouverte, avec son champ', await ev(`return !!document.querySelector('#overlay.open #pp-file');`));
    await choisir('#pp-file'); const cadreE = await attendreCadre();
    vrai('⛔ choisir une photo depuis cette fenêtre ouvre AUSSI le recadrage (il la remplace)', cadreE && !(await ev(`return !!document.getElementById('pp-file');`)));
    if (cadreE) { await taper('#pp-ok'); await dormir(500); }
    const phE = await lirePhoto();
    vrai('   et la photo s’enregistre', phE.w === 256, { w: phE.w, vide: phE.vide });
  } catch (e) { if (!/^arrêt/.test(e.message)) { ko++; console.log('  ✗ la sonde s’est arrêtée : ' + e.message); } else console.log('   ' + e.message); }
  finally {
    console.log('\n   exceptions : ' + S.exceptions.length + (S.exceptions.length ? ' — ' + S.exceptions.slice(0, 3).join(' ‖ ') : ''));
    vrai('aucune exception JavaScript', S.exceptions.length === 0, S.exceptions.slice(0, 3));
    S.fermer();
  }
  console.log(`\n════ sonde-photo-profil : ${ok} ✓ ${ko} ✗ ════`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
