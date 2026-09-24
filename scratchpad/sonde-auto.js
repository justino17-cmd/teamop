/* Le mode « Auto » suit l'appareil. On bascule le réglage SYSTÈME (prefers-color-scheme) et on relit ce
   que la page applique, sans recharger.
   ⛔ LE NAVIGATEUR PILOTÉ N'ÉMET PAS TOUJOURS L'ÉVÉNEMENT `change` d'une préférence ÉMULÉE — mesuré le
   24 septembre 2026 par un écouteur INDÉPENDANT de l'application : sur six bascules, trois sans aucun
   événement alors que `matches` avait changé. Un vrai appareil l'émet. La mesure juste est donc : à
   chaque événement REÇU, la page suit (1 pour 1) — et la population d'événements doit être non nulle. */
const { ouvrir, dormir } = require(require('path').join(__dirname, 'pilote.js'));
(async () => {
  const S = await ouvrir();
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); localStorage.setItem('elanB_push_ask_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1500);
  let ok = 0, ko = 0; const vrai = (n, c, d) => { console.log((c ? '  ✓ ' : '  ✗ ') + n + (d ? ' — ' + d : '')); c ? ok++ : ko++; };
  const emu = v => S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: v }] });
  await emu('light'); await dormir(300);
  await S.ev(`window.__ev=[]; matchMedia('(prefers-color-scheme: dark)').addEventListener('change',e=>{
      /* relevé APRÈS les écouteurs de la page (même tâche, file suivante) */
      setTimeout(()=>window.__ev.push({ sys:e.matches?'dark':'light', attr:document.documentElement.getAttribute('data-theme'), pref:getThemePref() }),0); }); return 1;`);
  for (const M of ['teamop', 'opgestion']) {
    await S.ev(`setMarque('${M}'); setThemePref('auto'); return 1;`); await dormir(300);
    for (const sys of ['dark', 'light', 'dark', 'light', 'dark', 'light']) { await emu(sys); await dormir(450); }
  }
  const evs = await S.ev(`return window.__ev.filter(x=>x.pref==='auto');`);
  vrai('des changements d’appareil ont bien été signalés à la page (population)', evs.length >= 3, evs.length + ' événements sur 12 bascules');
  const faux = evs.filter(x => x.attr !== x.sys);
  vrai('à CHAQUE changement signalé, la page suit l’appareil', evs.length && !faux.length, faux.length ? JSON.stringify(faux.slice(0, 3)) : evs.map(x => x.sys).join(' '));
  /* un choix EXPLICITE ne suit plus l'appareil, même quand l'événement arrive */
  await S.ev(`setThemePref('light'); window.__ev=[]; return 1;`);
  for (const sys of ['dark', 'light', 'dark']) { await emu(sys); await dormir(450); }
  const ex = await S.ev(`return { ev:window.__ev.length, attr:document.documentElement.getAttribute('data-theme') };`);
  vrai('« Jour » choisi : la page reste en jour quoi que fasse l’appareil', ex.attr === 'light', JSON.stringify(ex));
  await S.ev(`setThemePref('auto'); return 1;`); await emu('light'); await dormir(300); await emu('dark'); await dormir(450);
  const note = await S.ev(`themeCouleur(); await new Promise(r=>setTimeout(r,300)); const n=document.querySelector('#modal .tc-note'); return (n?n.textContent.trim():'')+' | eff='+effectiveTheme();`);
  vrai('l’écran « Thème et couleur » dit ce qu’« Auto » applique en ce moment', /en ce moment : (nuit|jour)/.test(note) && ((/nuit/.test(note) && /eff=dark/.test(note)) || (/jour/.test(note) && /eff=light/.test(note))), note);
  vrai('aucune erreur JavaScript', S.exceptions.length === 0, S.exceptions.slice(0, 3).join(' || '));
  console.log('\n  ' + ok + ' ✓ ' + ko + ' ✗  (page ' + S.version + ')');
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
