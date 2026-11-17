// Captures à REGARDER des corrections « restes » du planning (17 novembre) : la carte amenée à l'écran, puis le dessous (liste des étapes avec le temps de route).
// Usage : timeout 580 node planning-restes-captures.js <profil> [nuit]      (sortie : le dossier cap/campagne-planning-recontrole, hors dépôt)
const L = require('../../lib.js');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'iphone', nuit = args.includes('nuit');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-planning-recontrole/';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
  await c.p.evaluate(() => { crSel = null; crFocus = null; crLV = null; if (location.hash !== '#planning') aller('planning'); plVue = 'carte'; plRef = AUJ; rendre(); });
  for (let i = 0; i < 40; i++) { await c.p.waitForTimeout(500); if (await c.p.evaluate(() => crReelEtat === 'ok' && document.querySelectorAll('.cr-mk[data-crpin]').length > 0)) break; }
  await L.calme(c.p, 1500);
  await c.p.evaluate(() => { document.getElementById('cr-carte').scrollIntoView({ block: 'start' }); crLV = null; crCadrerReel(false); }); await L.calme(c.p, 1200);
  await L.capture(c, CAP + `restes-carte-${profil}${nuit ? '-nuit' : ''}.png`);
  const n = await c.p.evaluate(() => ({ pins: document.querySelectorAll('.cr-mk[data-crpin]').length, bulles: document.querySelectorAll('.cr-lbl-tr').length }));
  L.v('captures · la carte est montée (' + n.pins + ' repères, ' + n.bulles + ' bulle(s))', n.pins >= 6, n);
  await c.p.evaluate(() => { document.getElementById('cr-l').scrollIntoView({ block: 'start' }); }); await L.calme(c.p, 600);
  await L.capture(c, CAP + `restes-liste-${profil}${nuit ? '-nuit' : ''}.png`);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();
