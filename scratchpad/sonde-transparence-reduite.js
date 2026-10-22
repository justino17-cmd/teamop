/* ══ SONDE — « RÉDUIRE LA TRANSPARENCE » ÉTEINT TOUT LE VERRE ═══════════════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026 (§ 14 : « prefers-reduced-transparency: reduce — make translucent surfaces
   frostier/solid: raise background opacity, drop the blur »). Mesuré : sous le réglage, le curseur du segmenté du tableau
   de bord, le groupe de liste de la maquette (Interventions, Clients, Boxes) et la recherche des Clients gardaient leur
   flou — la règle listait ses surfaces une par une, et trois lui avaient échappé.
   Ici, sans le réglage, on MARQUE chaque élément qui porte un flou de fond (population) ; puis on pose le réglage et on
   relit LES MÊMES : plus aucun flou, et un fond plein (95 % au moins) pour chacun de ceux qui avaient un fond. Le voile
   des fenêtres (#overlay) est un assombrissement voulu : il perd son flou, il garde sa transparence.
   Cinq écrans et une fenêtre, iPhone et Mac, jour et nuit. ⛔ Bêta uniquement, copie locale en 127.0.0.1.        */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));

function marquer() {
  let n = 0;
  document.querySelectorAll('[data-sonde-verre]').forEach(e => e.removeAttribute('data-sonde-verre'));
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el), bf = cs.backdropFilter || cs.webkitBackdropFilter || 'none';
    if (bf === 'none') continue;
    const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.right <= 2 || r.bottom < 0 || r.top > innerHeight) continue;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    el.setAttribute('data-sonde-verre', String(n++));
  }
  return n;
}
function relire() {
  const lire = (s) => {
    let m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(s); if (m) return m[4] === undefined ? 1 : +m[4];
    m = /^color\(srgb [\d.e-]+ [\d.e-]+ [\d.e-]+(?: \/ ([\d.e-]+))?\)$/.exec(s); if (m) return m[1] === undefined ? 1 : +m[1];
    return null;
  };
  const out = [];
  for (const el of document.querySelectorAll('[data-sonde-verre]')) {
    const cs = getComputedStyle(el), bf = cs.backdropFilter || cs.webkitBackdropFilter || 'none';
    const voile = el.id === 'overlay' || el.id === 'overlay2';
    const a = lire(cs.backgroundColor), image = cs.backgroundImage !== 'none';
    out.push({ cl: el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean).slice(0, 2).join('.'),
      flou: bf, alpha: a, image, voile });
  }
  return out;
}

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  const calme = async () => { for (let k = 0; k < 40; k++) { if (await S.ev(`return document.getAnimations().filter(a=>a.constructor.name==='CSSTransition'&&a.playState==='running').length===0;`)) break; await dormir(100); } };
  let ok = 0, ko = 0; const echecs = [];
  for (const nomP of ['tel', 'bureau']) {
    const P = PROFILS[nomP]; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
    for (const theme of ['light', 'dark']) {
      await S.ev(`setThemePref('${theme}'); return 1;`); await dormir(1200);
      let pop = 0; const faibles = [];
      for (const v of ['dashboard', 'interventions', 'clients', 'planning', 'stock', 'fenetre']) {
        await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
        if (v === 'fenetre') { await S.ev(`go('clients'); return 1;`); await dormir(900); await S.ev(`openModal('<h3>Essai</h3><div class="field"><label>Nom</label><input></div>'); return 1;`); await dormir(600); }
        else { await S.ev(`try{ closeModal(true); }catch(e){} go('${v}'); return 1;`); await dormir(900); }
        await calme();
        const n = await S.ev(`return (${marquer.toString()})();`); pop += n;
        await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
        if (!(await S.ev(`return matchMedia('(prefers-reduced-transparency: reduce)').matches;`))) { console.log('⛔ le réglage n’a pas pris'); S.fermer(); process.exit(2); }
        await dormir(300); await calme();
        for (const x of await S.ev(`return (${relire.toString()})();`)) {
          if (x.flou !== 'none') faibles.push(v + ' ' + x.cl + ' garde son flou (' + x.flou.slice(0, 30) + ')');
          else if (!x.voile && x.alpha !== null && x.alpha > 0 && x.alpha < 0.95) faibles.push(v + ' ' + x.cl + ' fond à ' + x.alpha.toFixed(2));
        }
        if (v === 'fenetre') await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);
      }
      const nom = P.lbl + ' · ' + theme, uniques = [...new Set(faibles)];
      if (pop < 10) { ko++; echecs.push(nom + ' : ' + pop + ' vitres seulement, trop peu pour conclure'); }
      else if (uniques.length) { ko++; echecs.push(nom + ' : ' + uniques.length + ' vitres hors règle\n      ' + uniques.slice(0, 14).join('\n      ')); }
      else { ok++; console.log('  ✓ ' + nom + ' — ' + pop + ' vitres suivies, plus une n’est floue ni translucide'); }
    }
  }
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [] });
  echecs.forEach(e => console.log('  ✗ ' + e));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (S.exceptions.length ? '  · exceptions : ' + S.exceptions.slice(0, 3).join(' | ') : ''));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });
