/* Le fondu « il y a une suite » ne va qu'à ce qui défile : au téléphone, un segmenté qui TIENT
   n'a plus de fondu (bout du contrôle entier), un segmenté qui DÉFILE le garde. On le relève sur
   les écrans qui en portent, et on prouve la population des deux côtés quand elle existe. */
const { ouvrir, dormir } = require(require('path').join(__dirname, 'pilote.js'));
(async () => {
  const S = await ouvrir();
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); localStorage.setItem('elanB_push_ask_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1500);
  await S.ev(`window.confirm=()=>true; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
  await S.ev(`try{ setPlatForce('iosweb'); }catch(e){} return 1;`); await dormir(1500);
  let ok = 0, ko = 0; const vrai = (n, c, d) => { console.log((c ? '  ✓ ' : '  ✗ ') + n + (d ? ' — ' + d : '')); c ? ok++ : ko++; };
  /* ⛔ UNE CLÉ DE PLATEFORME INCONNUE RETOMBE EN SILENCE SUR LA DÉTECTION RÉELLE — « ios26 » donnait
     un bureau Windows de 390 px, sans barre d'onglets (mesuré le 24 septembre 2026). On PROUVE le
     téléphone avant de mesurer. */
  const pf = await S.ev(`const r=document.documentElement; return r.getAttribute('data-plat')+'/'+r.getAttribute('data-kind');`);
  vrai('la page est bien un iPhone (population juste)', pf === 'iosweb/mobile', pf);
  const tiennent = [], defilent = [];
  for (const v of ['boxes', 'bons', 'dashboard', 'interventions', 'produits', 'stock', 'factures', 'devis', 'clients', 'planning', 'pointage', 'mouvements', 'validations', 'demandes']) {
    await S.ev(`try{ go('${v}'); }catch(e){} return 1;`); await dormir(1100);
    const r = await S.ev(`return [...document.querySelectorAll('#content .filters.seg-on')].filter(f=>f.getBoundingClientRect().width>0).map(f=>{ const q=getComputedStyle(f);
      return { deb:f.scrollWidth>f.clientWidth+1, cls:f.classList.contains('seg-deborde'), mask:(q.webkitMaskImage||q.maskImage)!=='none', txt:f.textContent.trim().replace(/\\s+/g,' ').slice(0,40) }; });`);
    r.forEach(x => (x.deb ? defilent : tiennent).push(Object.assign({ v }, x)));
  }
  vrai('des segmentés qui TIENNENT ont été relevés (population)', tiennent.length > 0, tiennent.length + ' : ' + tiennent.map(x => x.v).join(', '));
  vrai('aucun segmenté qui tient ne porte le fondu', tiennent.length && tiennent.every(x => !x.mask && !x.cls), JSON.stringify(tiennent.filter(x => x.mask || x.cls)));
  if (defilent.length) vrai('un segmenté qui DÉFILE garde le fondu (« il y a une suite »)', defilent.every(x => x.mask && x.cls), JSON.stringify(defilent));
  else console.log('  · aucun segmenté qui défile sur ces écrans à 390 px (rien à prouver de ce côté)');
  /* l'écran Thème et couleur : son segmenté Jour/Nuit/Auto n'a plus de fondu */
  const tc = await S.ev(`themeCouleur(); await new Promise(r=>setTimeout(r,500)); const f=document.querySelector('#modal .tc-modes'); const q=getComputedStyle(f); return (q.webkitMaskImage||q.maskImage);`);
  vrai('« Jour / Nuit / Auto » n’a plus de fondu', tc === 'none', tc);
  vrai('aucune erreur JavaScript', S.exceptions.length === 0, S.exceptions.slice(0, 3).join(' || '));
  console.log('\n  ' + ok + ' ✓ ' + ko + ' ✗  (page ' + S.version + ')');
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
