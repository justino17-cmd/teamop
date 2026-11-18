// paysage : captures regardées + population de la rotation à chaud (carte conservée) + fenêtre de bureau basse
const G = require('/home/user/wt-soeur/scratchpad/proto-final/sondes/guide-commun.js'), L = G.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/guide-recontrole/';
const TRAVERS = { iphone:{ top:0, bottom:21, left:47, right:47 }, android:{ top:24, bottom:0, left:0, right:0 }, petit:{top:0,bottom:0,left:0,right:0} };
(async () => {
  const cas = [['iphone','marc',1,0],['iphone','julie',0,1],['iphone','sm',0,0],['android','sm',1,5],['petit','marc',0,0],['petit','sm',1,2],['iphone','marc',0,3]];
  for (const [profil, q, nuit, carte] of cas) {
    const pr = L.PROFILS[profil];
    const c = await G.ouvrir(profil, q, !!nuit), p = c.p;
    await p.setViewportSize({ width: pr.h, height: pr.w });
    const e = TRAVERS[profil]; const cdp = await p.context().newCDPSession(p);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top:e.top, bottom:e.bottom, left:e.left, right:e.right, topMax:e.top, bottomMax:e.bottom, leftMax:e.left, rightMax:e.right } });
    await L.calme(p, 900);
    await G.vers(c, carte);
    const nom = `paysage-${profil}-${q}-${nuit?'nuit':'jour'}-c${carte+1}`;
    await p.screenshot({ path: CAP + nom + '.png' });
    const r = await p.evaluate(() => { const z=document.getElementById('nv'); const car=z.querySelector('.nv-carte:not([inert])'); const b=car.querySelector('.nv-voir'); const br=b.getBoundingClientRect(); const el=document.elementFromPoint(br.left+br.width/2, br.top+br.height/2); const fe=z.querySelector('.nv-feuille').getBoundingClientRect(); const lis=[...car.querySelectorAll('li')].map(l=>Math.round(l.getBoundingClientRect().height)); return { voir:!!el&&(el===b||b.contains(el)), bas:Math.round(br.bottom), H:innerHeight, W:innerWidth, sw:document.documentElement.scrollWidth, feuille:[Math.round(fe.top),Math.round(fe.bottom)], lis, voirW:Math.round(br.width), voirH:Math.round(br.height) }; });
    v(`${nom} : « Voir » touchable, rien ne glisse de côté`, r.voir && r.sw <= pr.h + 1, r);
    console.log(nom, JSON.stringify(r));
    await L.fin(c);
  }
  // fenêtre de bureau basse : 1280×440 (le palier joue la hauteur, il vaut aussi pour un ordinateur)
  for (const q of ['marc','sm']) { const c = await G.ouvrir('mac', q, false), p = c.p; await p.setViewportSize({ width:1280, height:440 }); await L.calme(p, 700);
    await G.vers(c, 0); await p.screenshot({ path: CAP + `bureau-bas-${q}-c1.png` });
    const r = await p.evaluate(() => { const b=document.querySelector('#nv .nv-carte:not([inert]) .nv-voir').getBoundingClientRect(); const el=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); return { ok:!!el&&el.closest('.nv-voir'), bas:Math.round(b.bottom), H:innerHeight }; });
    v(`bureau 1280×440 ${q} : « Voir » touchable`, !!r.ok, r); await L.fin(c); }
  const ko = L.bilan(); await L.fermer(); process.exit(ko?1:0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });
