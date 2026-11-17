// Exploration de la journée du technicien au téléphone (campagne du 17 novembre 2026) : pour chaque écran, le titre, les gestes
// recensés depuis le DOM, les débordements, les cibles trop petites, et une capture à regarder. Ne conclut rien : prépare les sondes.
const L = require('../../lib.js');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
const ROUTES = ['majournee', 'taches', 'techfrais', 'mesheures', 'moncamion', 'absences'];
(async () => {
  const profil = process.env.PROFIL || 'iphone', qui = process.env.QUI || 'sm', nuit = process.env.NUIT === '1';
  const c = await L.ouvrir({ profil, qui, nuit });
  for (const r of ROUTES) {
    await L.aller(c.p, r);
    const e = await L.etat(c.p), g = await L.gestes(c.p), d = await L.deborde(c, null), f = await L.doigts(c.p);
    console.log('\n##', r, '→', JSON.stringify(e).slice(0, 160));
    console.log('  gestes', g.length, 'sans nom', g.filter(x => x.sansNom).length, '| déborde', JSON.stringify(d).slice(0, 200), '| petits', f.petits.length, 'champs', f.champs.length);
    g.slice(0, 60).forEach(x => console.log('   -', x.balise, x.lib, '|', x.data.slice(0, 60), x.l + '×' + x.h));
    await L.capture(c, CAP + 'explore-' + qui + '-' + profil + (nuit ? '-nuit' : '-jour') + '-' + r + '.png', true);
  }
  console.log('erreurs page', c.err);
  await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); process.exit(1); });
