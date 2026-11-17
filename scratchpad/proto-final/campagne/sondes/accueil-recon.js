// Reconnaissance : recense l'Accueil, Statistiques, Historique (gérant), par profil. Sortie JSON sur la console.
const L = require('../../lib.js'); const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-accueil/';
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc', nuit = process.argv[4] === 'nuit';
  const c = await L.ouvrir({ profil, qui, nuit });
  for (const h of ['accueil', 'statistiques', 'historique']) {
    await L.aller(c.p, h);
    const g = await L.gestes(c.p, '#contenu'); const e = await L.etat(c.p);
    console.log('\n##', h, profil, qui, JSON.stringify(e));
    g.forEach((x, i) => console.log(i, x.balise, '|', x.lib, '|', x.data, '|', x.l + 'x' + x.h, x.sansNom ? 'SANS NOM' : ''));
    await L.capture(c, CAP + `recon-${h}-${profil}-${qui}${nuit ? '-nuit' : ''}.png`, true);
  }
  console.log('ERR', c.err); await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); process.exit(1); });
