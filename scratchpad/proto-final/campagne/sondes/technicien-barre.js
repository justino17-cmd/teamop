// La barre du bas depuis CHAQUE écran du technicien : chacun des 5 onglets mène au bon écran (le balayage en a laissé 7 sur un délai de machine chargée :
// ils se rejouent ici, avec un délai long, avant d'en conclure quoi que ce soit). Usage : node technicien-barre.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }), p = c.p;
  const ROUTES = ['majournee', 'taches', 'techfrais', 'mesheures', 'moncamion', 'absences'], TABS = ['majournee', 'techfrais', 'mesheures', 'taches', 'moncamion'];
  let n = 0;
  for (const r of ROUTES) for (const t of TABS) {
    await L.aller(p, r); const ok = await L.toucher(c, `[data-tab="${t}"]`, { delai: 10000 }); await L.calme(p, 400); n++;
    const h = await p.evaluate(() => location.hash);
    v(`barre : de « ${r} » vers l’onglet « ${t} »`, ok && h === '#' + t, { ok, h });
  }
  v('population : 30 trajets joués', n === 30, n);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
