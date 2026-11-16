// Captures de Temps de travail (à REGARDER) : profils × jour/nuit × onglets. PROFILS=mac,iphone ONGLETS=auj,semaine,mois NUIT=0|1
const L = require('../lib.js'); const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/vehtemps/';
(async () => {
  for (const profil of (process.env.PROFILS || 'mac').split(',')) for (const nuit of (process.env.NUIT || '0').split(',').map(Number)) {
    const c = await L.ouvrir({ profil, qui:'marc', nuit:!!nuit, calme:true }); await L.aller(c.p, 'pointage');
    for (const o of (process.env.ONGLETS || 'auj,semaine,mois').split(',')) {
      await c.p.evaluate(x => { ptOnglet = x; rendre(); }, o); await L.calme(c.p, 500);
      const h = await c.p.evaluate(() => document.getElementById('contenu').scrollHeight);
      console.log(profil, nuit ? 'nuit' : 'jour', o, 'hauteur', h, 'erreurs', c.err.length);
      await L.capture(c, CAP + 'c-' + profil + (nuit ? '-nuit-' : '-jour-') + o + '.png', true); }
    if (c.err.length) console.log(c.err.slice(0, 3)); await L.fin(c); }
  await L.fermer(); })();
