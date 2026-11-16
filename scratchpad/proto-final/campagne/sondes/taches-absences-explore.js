// exploration : recense ce que montre Tâches (gérant, ordinateur) — sert à écrire les vraies sondes
const L = require('../../lib.js');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-taches-absences/';
(async () => {
  const [profil, qui, route] = [process.argv[2] || 'mac', process.argv[3] || 'marc', process.argv[4] || 'taches'];
  const c = await L.ouvrir({ profil, qui, hash: route });
  await L.calme(c.p, 600);
  const e = await L.etat(c.p); console.log(JSON.stringify(e));
  const g = await L.gestes(c.p, '#contenu'); console.log('gestes', g.length); g.forEach(x => console.log(' -', x.balise, '|', x.lib, '|', x.data, '|', x.l + 'x' + x.h));
  await L.capture(c, CAP + `explo-${qui}-${profil}-${route}.png`, true);
  console.log('err', c.err);
  await L.fin(c); await L.fermer();
})();
