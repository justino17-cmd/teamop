// Captures des FEUILLES de Temps de travail (à REGARDER) : la semaine d'une personne (téléphone), la journée, « Ajouter une journée », « La règle », « Terminer la journée ».
// PROFILS=iphone,mac NUIT=0|1
const L = require('../lib.js'); const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/vehtemps/';
(async () => {
  for (const profil of (process.env.PROFILS || 'iphone').split(',')) for (const nuit of (process.env.NUIT || '0').split(',').map(Number)) {
    const c = await L.ouvrir({ profil, qui:'marc', nuit:!!nuit, calme:true }); await L.aller(c.p, 'pointage'); const tag = 'f-' + profil + (nuit ? '-nuit-' : '-jour-');
    const pose = async (nom, f) => { await f(); await L.calme(c.p, 600); await L.capture(c, CAP + tag + nom + '.png', false); console.log('capturé', tag + nom); await L.ranger(c.p); await L.calme(c.p, 300); };
    await pose('ajout', () => L.toucher(c, '[data-tt="ajout"]'));
    await pose('regle', async () => { await L.toucher(c, '[data-tt="areg"]'); await c.p.evaluate(() => { const b = document.querySelector('[data-tt="regle"]'); if (b) b.click(); }); });
    await pose('fin', () => L.toucher(c, '[data-tt^="fin|"]'));
    await c.p.evaluate(() => { ptOnglet = 'semaine'; rendre(); }); await L.calme(c.p, 400);
    await pose('semaine-karim', () => c.p.evaluate(() => { const b = document.querySelector('[data-tt^="sem|kb|"]'); b.scrollIntoView({ block:'center' }); b.click(); }));
    await pose('jour-karim', async () => { await c.p.evaluate(() => { document.querySelector('[data-tt^="sem|kb|"]').click(); }); await L.calme(c.p, 500); await c.p.evaluate(() => { const j = document.querySelector('#calque .tt-sept .tt-jr'); if (j) j.click(); }); });
    if (c.err.length) console.log(c.err.slice(0, 3)); await L.fin(c); }
  await L.fermer(); })();
