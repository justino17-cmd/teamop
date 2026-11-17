// Accueil, Statistiques, Historique selon la PERSONNE : que voit-elle à l'ouverture, que montre son menu, que répond l'adresse #accueil / #statistiques / #historique ?
// Contrôles : « N ✓ · M ✗ », sortie 1 si un contrôle tombe. node accueil-roles.js [profil]
const O = require('./accueil-outils.js'), L = O.L;
(async () => {
  const profil = process.argv[2] || 'mac'; const out = {};
  for (const qui of ['marc', 'julie', 'kb', 'sm']) {
    const c = await L.ouvrir({ profil, qui }); const p = c.p;
    const ouv = await O.etat2(p);
    const menu = await p.evaluate(() => [...document.querySelectorAll('#menu a, #menu button, nav a, nav button, .menu [data-go], [data-nav]')].filter(e => e.offsetParent).map(e => (e.getAttribute('aria-label') || e.textContent).replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 60));
    const r = { ouverture: ouv, menu };
    for (const h of ['accueil', 'statistiques', 'historique']) {
      await L.aller(p, h); const e = await O.etat2(p); const t = await p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ').slice(0, 220));
      r[h] = { hash: e.hash, h1: e.h1, debut: t };
    }
    out[qui] = r; console.log('\n##', qui, JSON.stringify(r, null, 1).slice(0, 2600)); await L.capture(c, O.CAP + `roles-ouverture-${qui}-${profil}.png`, false); console.log('ERR', c.err.slice(0, 3)); await L.fin(c);
  }
  require('fs').writeFileSync(O.CAP + `roles-${profil}.json`, JSON.stringify(out, null, 1)); await L.fermer();
})().catch(e => { console.error(e); process.exit(1); });
