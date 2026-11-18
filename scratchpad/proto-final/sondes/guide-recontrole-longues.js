// Guide des nouveautés, recontrôle adverse (étape 4) : phrases les plus longues en paysage (texte jamais sous « Voir », pied dans l’écran).
const G = require('/home/user/wt-soeur/scratchpad/proto-final/sondes/guide-commun.js'), L = G.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/guide-recontrole/';
(async () => {
  for (const [profil,q,nuit,k] of [['petit','sm',0,'journee'],['petit','marc',1,'taches'],['petit','julie',0,'achats']]) {
    const pr = L.PROFILS[profil]; const c = await G.ouvrir(profil, q, !!nuit), p = c.p; const pg = await G.pages(c);
    await p.setViewportSize({ width: pr.h, height: pr.w }); await L.calme(p, 900);
    const i = pg.findIndex(x=>x.k===k); await G.vers(c, i);
    const r = await p.evaluate(() => { const z=document.getElementById('nv'); const car=z.querySelector('.nv-carte:not([inert])'); const b=car.querySelector('.nv-voir').getBoundingClientRect(); const ph=car.querySelector('.nv-phrase').getBoundingClientRect(); const el=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); const fe=z.querySelector('.nv-feuille').getBoundingClientRect(); const pied=z.querySelector('.nv-pied').getBoundingClientRect(); return { voir: !!el && !!el.closest('.nv-voir'), voirBas:Math.round(b.bottom), phraseDroite:Math.round(ph.right), voirGauche:Math.round(b.left), phraseH:Math.round(ph.height), pied:[Math.round(pied.top),Math.round(pied.bottom)], H:innerHeight, defile: car.scrollHeight-car.clientHeight }; });
    console.log(profil, q, k, JSON.stringify(r));
    v(`${profil} ${q} ${k} : Voir touchable, le texte ne passe pas sous Voir, le pied est dans l'écran`, r.voir && r.phraseDroite <= r.voirGauche && r.pied[1] <= r.H, r);
    await p.screenshot({ path: CAP + `long-${profil}-${q}-${k}.png` }); await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko?1:0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });
