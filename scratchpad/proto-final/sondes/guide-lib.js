// lib.ouvrir({ guide:true }) laisse le guide paraître tout seul (900 ms après l'ouverture) ; sans l'option, les autres sondes ne le voient pas (entrées par ?auto=, il ne se propose pas ; si jamais il paraît, lib le ferme).
// Usage : PROFIL=mac|iphone node guide-lib.js
const G = require('./guide-commun.js'), L = G.L, v = L.v;
const PROFIL = process.env.PROFIL || 'mac';
(async () => {
  { const c = await L.ouvrir({ profil:PROFIL, qui:'marc', guide:true }); await c.p.waitForTimeout(1500);
    v('guide:true : le guide a paru tout seul à l\'ouverture', await G.ouvert(c.p));
    const n = await c.p.evaluate(() => NV ? NV.pages.length : 0); v('…avec ses cartes (' + n + ')', n >= 2);
    await L.fin(c); }
  { const c = await L.ouvrir({ profil:PROFIL, qui:'marc' }); await c.p.waitForTimeout(1500);
    v('sans guide:true : le guide n\'est pas là (les autres sondes ne le voient pas)', !(await G.ouvert(c.p)));
    await L.fin(c); }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });
