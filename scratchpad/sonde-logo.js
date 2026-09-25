/* Le thème « Logo OP GESTION », au navigateur (tests/test-807.js exige cette sonde).
   1. L'écran « Thème et couleur » : trois thèmes, choisir Logo le pose et l'écrit sur la fiche de
      la personne ; revenir à TEAM OP retire la mesure de la coupe.
   2. Sur cinq largeurs (Android 360, iPhone 390 et 430, tablette 820, Mac 1 440), de jour et de
      nuit : la coupe passe dans l'espace avant le dernier mot du titre (à 2 px près), la tuile
      prend toute la rangée d'un téléphone, le titre tient sur une ligne, la page ne glisse pas.
   3. ⛔ AU PIXEL, LA DÉCOUPE EST PEINTE : un texte `color:transparent` que le navigateur ne sait
      pas découper serait INVISIBLE, et aucun contrôle de style ne le verrait. On capture la tuile
      et on compte, dans le rectangle de chaque mot, les pixels de l'encre attendue : « Tableau »
      à l'encre du côté clair, « bord » à celle du côté foncé, le début de la date en sauge.
   ⚠ La largeur se mesure contre la largeur POSÉE (règle du dépôt) ; animations réduites (un vrai
   réglage d'utilisateur) pour ne pas relever une transition de vue. */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { decoder } = require(path.join(__dirname, 'png.js'));
(async () => {
  const S = await ouvrir();
  let ok = 0, ko = 0; const vrai = (n, c, d) => { console.log((c ? '  ✓ ' : '  ✗ ') + n + (d !== undefined ? ' — ' + d : '')); c ? ok++ : ko++; };
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); localStorage.setItem('elanB_push_ask_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1500);
  await S.ev(`try{ setPlatForce('iosweb'); }catch(e){} try{ setThemePref('light'); }catch(e){} go('dashboard'); return 1;`); await dormir(1200);

  console.log('\n── 1. L’écran « Thème et couleur »');
  const tc = await S.ev(`themeCouleur(); await new Promise(r=>setTimeout(r,500));
    const b=[...document.querySelectorAll('#modal .tc-theme')];
    const noms=b.map(x=>x.querySelector('b').textContent);
    b[2].click(); await new Promise(r=>setTimeout(r,500));
    const u=db.users.find(x=>x.id===currentUser.id)||{};
    const apres={ marque:document.documentElement.getAttribute('data-marque'), accent:document.documentElement.getAttribute('data-accent'),
      pref:(u.pref||{}).marque, coche:[...document.querySelectorAll('#modal .tc-theme')].map(x=>x.getAttribute('aria-pressed')).join(',') };
    closeModal(); return {noms, apres};`);
  vrai('trois thèmes proposés (population)', tc.noms.length === 3, tc.noms.join(' · '));
  vrai('choisir « Logo » pose le thème, garde une teinte connue et coche la bonne carte', tc.apres.marque === 'logo' && tc.apres.accent === 'opgestion' && tc.apres.coche === 'false,false,true', JSON.stringify(tc.apres));
  vrai('   … et l’écrit sur la fiche de la personne (il voyage avec elle, pas avec l’entreprise)', tc.apres.pref === 'logo', tc.apres.pref);

  console.log('\n── 2 et 3. La coupe, la tuile, et la découpe peinte — cinq largeurs, jour et nuit');
  const PROFILS = [['Android 360', 360, 740, 'android'], ['iPhone 390', 390, 844, 'iosweb'], ['iPhone 430', 430, 932, 'iosweb'], ['tablette 820', 820, 1180, 'iosweb'], ['Mac 1 440', 1440, 900, 'macweb']];
  for (const [nom, w, h, plat] of PROFILS) for (const mode of ['light', 'dark']) {
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
    await S.c.envoyer('Emulation.setTouchEmulationEnabled', w < 1100 ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
    await S.ev(`try{ setPlatForce('${plat}'); }catch(e){} setThemePref('${mode}'); go('dashboard'); return 1;`);
    await dormir(1300);
    const m = await S.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
      document.querySelectorAll('.multi-bar,.toast,#toast').forEach(x=>x.style.display='none'); window.scrollTo(0,0);
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const tuile=document.querySelector('#page-head .ph-row > div:first-child'), ti=tuile&&tuile.querySelector('.ph-title'), da=tuile&&tuile.querySelector('.ph-surtitre');
      if(!ti||!da) return {erreur:'pas de tuile'};
      const T=tuile.getBoundingClientRect(), cs=getComputedStyle(tuile);
      const n=[...ti.childNodes].find(c=>c.nodeType===3), t=n.textContent, i=t.trimEnd().lastIndexOf(' ');
      const rg=(node,a,b)=>{ const r=document.createRange(); r.setStart(node,a); r.setEnd(node,b); const q=r.getBoundingClientRect(); return {x:q.left,y:q.top,w:q.width,h:q.height}; };
      const esp=rg(n,i,i+1), mot1=rg(n,0,t.indexOf(' ')), dernier=rg(n,i+1,t.trimEnd().length);
      const dn=[...da.childNodes].find(c=>c.nodeType===3), d1=rg(dn,0,dn.textContent.indexOf(' '));
      const coupe=parseFloat(cs.getPropertyValue('--lg-coupe-titre'));
      const yg=esp.y+esp.h/2-T.top, xg=esp.x+esp.w/2-T.left, xc=(coupe-.53*yg)/.848;
      const encre=k=>cs.getPropertyValue(k).trim();
      return { T:{x:T.left,y:T.top,w:T.width,h:T.height}, xg, xc, lignes:Math.round(ti.getBoundingClientRect().height/parseFloat(getComputedStyle(ti).lineHeight)),
        mot1, dernier, d1, encres:{a:encre('--lg-encre-a'), b:encre('--lg-encre-b'), date:encre('--lg-date-a')},
        page:document.documentElement.scrollWidth, marque:document.documentElement.getAttribute('data-marque') };`);
    const lib = nom + ', ' + (mode === 'light' ? 'jour' : 'nuit');
    if (m.erreur) { vrai(lib + ' — la tuile est là', false, m.erreur); continue; }
    vrai(lib + ' — la coupe passe dans l’espace avant « ' + 'bord' + ' » (à 2 px)', Math.abs(m.xc - m.xg) <= 2, 'coupe ' + m.xc.toFixed(1) + ' / espace ' + m.xg.toFixed(1));
    vrai(lib + ' — le titre tient sur une ligne, la page ne glisse pas', m.lignes === 1 && m.page <= w, m.lignes + ' ligne(s), page ' + m.page + '/' + w);
    if (w < 600) vrai(lib + ' — la tuile prend toute la rangée', m.T.w >= w - 40, Math.round(m.T.w) + ' px');
    /* la découpe, au pixel */
    const cap = await S.c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: m.T.x, y: m.T.y, width: m.T.w, height: m.T.h, scale: 1 } });
    const img = decoder(Buffer.from(cap.data, 'base64'));
    const hex = h => { const v = parseInt(h.replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
    const compte = (r, coul) => { const [cr, cg, cb] = hex(coul); let n = 0;
      for (let y = Math.max(0, Math.floor(r.y - m.T.y)); y < Math.min(img.h, Math.ceil(r.y - m.T.y + r.h)); y++)
        for (let x = Math.max(0, Math.floor(r.x - m.T.x)); x < Math.min(img.w, Math.ceil(r.x - m.T.x + r.w)); x++) {
          const o = (y * img.w + x) * 4, d = Math.abs(img.data[o] - cr) + Math.abs(img.data[o + 1] - cg) + Math.abs(img.data[o + 2] - cb); if (d < 45) n++; }
      return n; };
    const a = compte(m.mot1, m.encres.a), b = compte(m.dernier, m.encres.b), dt = compte(m.d1, m.encres.date);
    vrai(lib + ' — au pixel : le premier mot est peint à l’encre du côté clair, le dernier à celle du côté foncé, la date en sauge', a > 40 && b > 40 && dt > 8, a + ' / ' + b + ' / ' + dt + ' pixels');
  }

  console.log('\n── 4. Revenir à TEAM OP');
  const ret = await S.ev(`setMarque('teamop'); go('dashboard'); await new Promise(r=>setTimeout(r,900));
    const tuile=document.querySelector('#page-head .ph-row > div:first-child');
    return { marque:document.documentElement.getAttribute('data-marque'), inline:tuile?tuile.style.getPropertyValue('--lg-coupe-titre'):'?',
      fond:tuile?getComputedStyle(tuile).backgroundImage:'?' };`);
  vrai('TEAM OP revient : plus de coupe mesurée, plus de tuile découpée', ret.marque === 'teamop' && ret.inline === '' && !/122deg/.test(ret.fond), JSON.stringify(ret).slice(0, 160));
  vrai('aucune erreur JavaScript', S.exceptions.length === 0, S.exceptions.slice(0, 3).join(' || '));
  console.log('\n  ' + ok + ' ✓ ' + ko + ' ✗  (page ' + S.version + ')');
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
