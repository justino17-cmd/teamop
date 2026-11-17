// Matériel, étape 8 — les écrans corrigés de la relecture « technicien » CAPTURÉS pour être REGARDÉS : Stock au téléphone (bandeau d'une rangée, tuiles à 320 px),
// la feuille « J'ai utilisé » (phrase de contrôle dans le pied), la recherche de pièce de la fiche d'intervention. Usage : node materiel-technicien-captures.js [profil] [nuit]
const L = require('../lib.js'), path = require('path');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel-corr/';
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', suf = profil + '-' + (nuit ? 'nuit' : 'jour');
  const g = await L.ouvrir({ profil, nuit, qui: 'marc' });
  await L.aller(g.p, 'stock'); await L.calme(g.p, 450); await L.capture(g, path.join(CAP, 'tech-stock-' + suf + '.png')); await L.fin(g);
  const c = await L.ouvrir({ profil, nuit, qui: 'sm' }), p = c.p;
  await L.aller(p, 'moncamion'); await L.calme(p, 400); await L.toucher(c, '[data-mat="usage"]'); await L.calme(p, 400);
  await p.fill('#mat-q', 'filtre à charbon'); await L.calme(p, 350); await L.toucher(c, '#calque [data-mat^="ajoute|"]'); await L.calme(p, 500); await L.capture(c, path.join(CAP, 'tech-utilise-' + suf + '.png')); await L.ranger(p);
  await L.aller(p, 'inter-x-i1'); await L.calme(p, 600); await p.evaluate(() => { const n = document.getElementById('p-nom'); if (n) n.scrollIntoView({ block: 'center' }); }); await L.calme(p, 400); await L.capture(c, path.join(CAP, 'tech-fiche-pieces-' + suf + '.png'));
  console.log('3 captures · erreurs : ' + (c.err.length + g.err.length)); await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); try { L.fermer(); } catch (x) {} process.exit(1); });
