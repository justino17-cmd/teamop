// le vide entre le titre et la phrase en paysage compact : on mesure, sur CHAQUE carte, l'écart réel entre le bas de la rangée du titre et le haut de la phrase
const G = require('/home/user/wt-soeur/scratchpad/proto-final/sondes/guide-commun.js'), L = G.L, v = L.v;
const TRAVERS = { iphone:{ top:0, bottom:21, left:47, right:47 }, android:{ top:24, bottom:0, left:0, right:0 }, petit:{top:0,bottom:0,left:0,right:0} };
const PROFILS = (process.env.PROFIL||'iphone,android,petit').split(','), QUI = (process.env.QUI||'marc,julie,sm').split(',');
(async () => {
  for (const profil of PROFILS) for (const q of QUI) {
    const pr = L.PROFILS[profil]; const c = await G.ouvrir(profil, q, false), p = c.p;
    await p.setViewportSize({ width: pr.h, height: pr.w });
    const e = TRAVERS[profil]; const cdp = await p.context().newCDPSession(p);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top:e.top, bottom:e.bottom, left:e.left, right:e.right, topMax:e.top, bottomMax:e.bottom, leftMax:e.left, rightMax:e.right } });
    await L.calme(p, 700);
    const n = await p.evaluate(() => NV.pages.length);
    v(`${profil} ${q} : le guide a des cartes (population)`, n > 0, n);
    let mesurees = 0;
    for (let i = 0; i < n; i++) {
      await G.vers(c, i);
      const r = await p.evaluate(() => { const car=document.querySelector('#nv .nv-carte:not([inert])'); const h=car.querySelector('.nv-haut'), ph=car.querySelector('.nv-phrase'); if(!h||!ph) return null; const a=h.getBoundingClientRect(), b=ph.getBoundingClientRect(); return { ecart: Math.round(b.top-a.bottom), hautH: Math.round(a.height), voirH: Math.round(car.querySelector('.nv-voir').getBoundingClientRect().height) }; });
      if (!r) continue; mesurees++;
      v(`${profil} ${q} carte ${i+1} : écart titre→phrase ≤ 8 px (la grille ne doit pas l'étirer)`, r.ecart <= 8, r);
    }
    v(`${profil} ${q} : au moins une carte à phrase mesurée`, mesurees > 0, mesurees);
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko?1:0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });
