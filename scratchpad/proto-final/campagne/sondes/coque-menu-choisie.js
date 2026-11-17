// Restes coque, tour 1 (17 novembre 2026) — « Menu de l'ordinateur » vu par le chef de chantier : l'entrée CHOISIE (en gras, donc plus large)
// ne doit pas changer de hauteur (le gras ne change pas le retour à la ligne) et doit être ENTIÈRE dans la zone qui défile (pas coupée par le pied).
// Pour chaque rôle, chaque entrée du menu est ouverte par son adresse ; on relève (après deux trames et la fin de la mise en page) la hauteur de la
// ligne choisie, la même hauteur sans la classe « on », et si la ligne est entièrement dans .m-liste. Population comptée d'abord.
// Usage : PROFIL=mac|mac720|windows QUI=marc,julie,sm,kb NUIT=1 node coque-menu-choisie.js   (« N ✓ · M ✗ », sort en 1 si un contrôle tombe)
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT, QUIS = (process.env.QUI || 'marc,julie,sm').split(',');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
(async () => {
  for (const qui of QUIS) {
    const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui }), p = c.p;
    await p.evaluate(() => { const e = document.getElementById('cpsys'); if (e && !e.hidden) { const b = document.querySelector('[data-cpsys="retour"]'); b && b.click(); } });
    const hrefs = await p.evaluate(() => [...document.querySelectorAll('#menu a[href^="#"]:not(.logo)')].map(a => a.getAttribute('href')));
    v(qui + ' ' + PROFIL + ' : population — des entrées dans le menu (' + hrefs.length + ')', hrefs.length >= 4, hrefs);
    let ok = 0, vus = [];
    for (const h of hrefs) {
      if (h === '#comptabilite') continue;   // plein écran : n'a pas de ligne choisie dans la colonne
      await p.evaluate(h => { location.hash = h; }, h); await L.calme(p, 450);
      await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { void document.body.offsetWidth; r(); }))));
      const m = await p.evaluate(h => {
        const a = document.querySelector('#menu a.on'); const l = document.querySelector('#menu .m-liste');
        if (!a || !l) return null;
        const r = a.getBoundingClientRect(), z = l.getBoundingClientRect(), hc = a.getBoundingClientRect().height;
        a.classList.remove('on'); const hn = a.getBoundingClientRect().height; a.classList.add('on');
        return { href: a.getAttribute('href'), texte: a.textContent.replace(/\s+/g, ' ').trim(), hc: Math.round(hc * 10) / 10, hn: Math.round(hn * 10) / 10,
          entiere: r.top >= z.top - 0.5 && r.bottom <= z.bottom + 0.5, dedans: [Math.round(r.top - z.top), Math.round(z.bottom - r.bottom)], liste: [Math.round(z.height), l.scrollHeight] };
      }, h);
      if (!m) { v(qui + ' : ' + h + ' : une ligne est allumée', false); continue; }
      vus.push(m.href);
      const bon = Math.abs(m.hc - m.hn) < 0.6 && m.entiere;
      if (bon) ok++;
      v(qui + ' ' + PROFIL + ' : « ' + m.texte + ' » (' + h + ') : même hauteur choisie ou non (' + m.hc + ' / ' + m.hn + ' px) et entière dans la liste (' + m.dedans.join(' / ') + ' px)', bon, m);
    }
    v(qui + ' : population — ' + vus.length + ' entrées jouées', vus.length >= 3);
    await p.screenshot({ path: CAP + `menu-choisie-${PROFIL}-${qui}.png` });
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
