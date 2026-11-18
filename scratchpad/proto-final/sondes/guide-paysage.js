// Guide des nouveautés : après rotation en paysage, « Voir » est-il VRAIMENT visible (elementFromPoint + part visible dans la zone qui défile) ? Mesure le rectangle ne suffit pas : un bouton caché sous le pli passe un contrôle de 44 px. Voir refonte/guide-relecture-tout.json (tout-01).
const G = require('./guide-commun.js'), L = G.L, v = L.v;
(async () => {
  for (const PROFIL of ['iphone','android','petit','ipad']) for (const q of ['sm','marc']) {
    const pr = L.PROFILS[PROFIL];
    const c = await G.ouvrir(PROFIL, q, false), p = c.p;
    await p.setViewportSize({ width: pr.h, height: pr.w }); await L.calme(p, 900);
    const pg = await G.pages(c);
    for (let i = 0; i < pg.length; i += 1) {
      await G.vers(c, i);
      const r = await p.evaluate(() => { const z = document.getElementById('nv'); const car = z.querySelector('.nv-carte:not([inert])'); const b = car.querySelector('.nv-voir'); const br = b.getBoundingClientRect(); const cx = br.left + br.width/2, cy = br.top + br.height/2;
        const el = document.elementFromPoint(cx, cy); const f = z.querySelector('.nv-defile').getBoundingClientRect();
        const hautVu = Math.round(Math.min(br.bottom, f.bottom) - br.top), reste = Math.round(car.scrollHeight - car.clientHeight);
        return { voirVisible: !!el && (el === b || b.contains(el)), voirVu: hautVu + '/' + Math.round(br.height), cache: Math.round(br.bottom - f.bottom), defileCarte: reste, H: innerHeight }; });
      v(`${q}/${PROFIL} paysage carte ${i+1} : « Voir » entièrement visible sans défiler (${r.voirVu} px vus, cache ${r.cache})`, r.voirVisible && r.cache <= 0, r);
    }
    await L.fin(c);
  }
  L.bilan(); await L.fermer(); process.exit(0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });
