// Captures À REGARDER des écrans corrigés de la campagne accueil (jamais de page entière au-delà de la fenêtre).
// node accueil-regard.js <profil> [nuit] ; fichiers : cap/campagne-accueil/regard-*.png
const O = require('./accueil-outils.js'), L = O.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  await L.aller(p, 'accueil'); await L.capture(c, O.CAP + `regard-accueil-${tag}.png`, false);
  await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.capture(c, O.CAP + `regard-stats-${tag}.png`, false);
  await p.evaluate(() => { const e = [...document.querySelectorAll('#contenu .carte')].find(x => /Paiements/.test((x.querySelector('h3') || {}).textContent || '')); if (e) e.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(400); await L.capture(c, O.CAP + `regard-stats-paiements-${tag}.png`, false);
  await L.aller(p, 'historique'); await L.capture(c, O.CAP + `regard-histo-${tag}.png`, false);
  await p.evaluate(() => { window.__sv = INTS.slice(); INTS.length = 0; }); await L.aller(p, 'accueil'); await L.capture(c, O.CAP + `regard-accueil-vide-${tag}.png`, false);
  await L.fin(c); await L.fermer(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
