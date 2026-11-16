// Relevé de l'ÉTAT D'AVANT (ou de l'état courant) : hauteur et nombre de boutons de Temps de travail, captures pleine page.
const L = require('../lib.js'); const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/vehtemps/';
(async () => {
  for (const profil of (process.env.PROFILS || 'mac,iphone').split(',')) for (const route of (process.env.ROUTES || 'pointage,equipe').split(',')) {
    const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await L.aller(c.p, route);
    const g = await L.gestes(c.p), h = await c.p.evaluate(() => document.getElementById('contenu').scrollHeight);
    console.log(profil, route, 'hauteur', h, 'boutons', g.length, 'erreurs', c.err.length);
    await L.capture(c, CAP + 'avant-' + profil + '-' + route + '.png', true); await L.fin(c); }
  await L.fermer(); })();
