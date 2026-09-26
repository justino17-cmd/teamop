/* ══ SONDE — OP GESTION : LE RELÂCHER D'UN APPUI LONG SUR LA BARRE NE TOUCHE RIEN DANS LA FENÊTRE ══════════
   La fenêtre « Barre d'onglets » s'ouvre SOUS le doigt encore posé ; au relâcher, le navigateur produit le
   clic de ce qui s'y trouve MAINTENANT. Mesuré le 26 septembre 2026 (même défaut que la Tour v2.67) : le clic
   atteignait la fenêtre — le pied, le fond, parfois un bouton selon la taille du téléphone. La bêta v758
   l'avale, où qu'il tombe, et seulement celui-là : un nouvel appui ferme la fenêtre du clic avalé.
   De vrais événements tactiles, trois tailles de téléphone, animations réduites (un toucher pendant une
   transition de vue vise le calque de la transition — règle du dépôt).
   Usage : node scratchpad/sonde-appui-long.js          SOURCE=/chemin/beta.html node …   (contre-épreuve)
   ⛔ Bêta seulement, 127.0.0.1 seulement (pilote.js). */
const { ouvrir, dormir } = require('./pilote.js');
let ok = 0, ko = 0;
const v = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? ' — ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
(async () => {
  for (const [L0, H0] of [[430, 932], [390, 844], [375, 667]]) {
    const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
    try {
      console.log('\n── ' + L0 + ' × ' + H0 + ' · ' + S.version + ' ──');
      await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const e=document.getElementById('hl-ecran'); if(e)e.remove(); window.pushPropose=function(){}; return 1;`);
      await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
        currentUser=db.users[0]; try{ ['onboarded_','push_ask_','photo_prompt_'].forEach(k=>localStorage.setItem('elanB_'+k+currentUser.id,'1')); }catch(e){}
        if(typeof enterApp==='function') enterApp(currentUser); return 1;`);
      await dormir(1200); await S.ev(`window.confirm=()=>true;window.alert=()=>{};return 1;`);
      await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: L0, height: H0, deviceScaleFactor: 3, mobile: true });
      await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      try { await S.c.envoyer('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0, topMax: 47, bottomMax: 34, leftMax: 0, rightMax: 0 } }); } catch (e) {}
      await S.ev(`setPlatForce('iosweb'); setThemePref('light'); try{ closeModal(true); }catch(e){} go('dashboard'); return 1;`); await dormir(900);
      await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);
      const bar = await S.ev(`const b=document.getElementById('tabbar'); const r=b.getBoundingClientRect();
        return {y:Math.round(r.y+r.height/2), tabs:[...b.querySelectorAll('.tab')].map(t=>{const q=t.getBoundingClientRect(); return {k:t.dataset.tab,c:q.left+q.width/2};})};`);
      v('population : la barre a ses onglets et « Plus »', bar.tabs.length >= 5, bar.tabs.map(t => t.k).join(','));
      await S.ev(`window.__J=[]; document.addEventListener('click',e=>window.__J.push(e.defaultPrevented?'annulé':'ATTEINT'),false);
        document.addEventListener('click',e=>{ if(!e.defaultPrevented) window.__J.push('?'); },true); return 1;`);
      const touche = (type, x, y) => S.c.envoyer('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      for (const t of bar.tabs.filter(x => x.k !== 'dashboard')) {
        await S.ev(`window.__J=[]; try{ closeModal(true); }catch(e){} return 1;`); await dormir(300);
        const avant = await S.ev(`return ongletsLire().join(',');`);
        await touche('touchStart', t.c, bar.y); await dormir(900); await touche('touchEnd'); await dormir(700);
        const r = await S.ev(`return {vue:current, ouverte:document.getElementById('overlay').classList.contains('open')&&!!document.getElementById('og-compte'), br:(_ongletsBrouillon||[]).join(','), j:window.__J.slice()};`);
        v('appui long sur « ' + t.k + ' » : la fenêtre s’ouvre et RESTE ouverte au relâcher, rien n’y est touché', r.ouverte && r.vue === 'dashboard' && r.br === avant && r.j.indexOf('ATTEINT') < 0, r);
      }
      /* un navigateur qui ne produit AUCUN clic au relâcher : le tap suivant (« ✕ ») n'est pas avalé */
      await S.ev(`try{ closeModal(true); }catch(e){} window.__mange=1; window.addEventListener('click',e=>{ if(window.__mange){ window.__mange=0; e.stopImmediatePropagation(); e.preventDefault(); } },true); return 1;`); await dormir(300);
      const p = bar.tabs.find(x => x.k !== 'dashboard' && x.k !== '_plus');
      await touche('touchStart', p.c, bar.y); await dormir(900); await touche('touchEnd'); await dormir(100);
      const x = await S.ev(`const b=document.querySelector('#modal .modal-close'); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,mange:window.__mange};`);
      if (x) { await touche('touchStart', x.x, x.y); await dormir(40); await touche('touchEnd'); await dormir(500); }
      const f = await S.ev(`return {ouverte:document.getElementById('overlay').classList.contains('open')};`);
      v('sans clic au relâcher, le tap suivant sur « ✕ » n’est PAS avalé : la fenêtre se ferme', !!x && x.mange === 0 && !f.ouverte, { x, f });
      v('aucune exception', S.exceptions.length === 0, S.exceptions.slice(0, 3));
    } finally { S.fermer(); }
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE : ' + (e && e.stack || e)); process.exit(2); });
