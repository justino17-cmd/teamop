// Captures de Véhicules (liste + fiche, trois onglets), à REGARDER : profils × jour/nuit. PROFILS=mac,iphone NUIT=0,1
// La fenêtre visible seulement (jamais « page entière » d'un écran de plus de 6 000 px) : le panneau est un conteneur qui défile, on le relève tel qu'il s'ouvre.
const L = require('../lib.js'); const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/vehtemps4/';
(async () => {
  for (const profil of (process.env.PROFILS || 'mac,iphone').split(',')) for (const nuit of (process.env.NUIT || '0,1').split(',').map(Number)) {
    const c = await L.ouvrir({ profil, qui:'marc', nuit:!!nuit, calme:true }); await L.aller(c.p, 'vehicules');
    const base = CAP + 'v-' + profil + (nuit ? '-nuit-' : '-jour-');
    const h = await c.p.evaluate(() => document.getElementById('contenu').scrollHeight);
    console.log(profil, nuit ? 'nuit' : 'jour', 'liste hauteur', h, 'erreurs', c.err.length);
    await L.capture(c, base + 'liste.png', false);
    for (const o of ['afaire', 'papiers', 'depenses']) {
      await c.p.evaluate(a => { fermerPanneau(); vehFiche('veh2', a); }, o); await L.calme(c.p, 600);
      const ph = await c.p.evaluate(() => { const p = document.querySelector('#calque .panneau'); return p ? p.scrollHeight : -1; });
      console.log('  fiche', o, 'hauteur', ph);
      await L.capture(c, base + 'fiche-' + o + '.png', false); }
    if (c.err.length) console.log(c.err.slice(0, 3)); await L.fin(c); }
  await L.fermer(); })();
