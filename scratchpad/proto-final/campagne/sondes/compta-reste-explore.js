// Exploration : visite chaque onglet de ma partie, capture, recense les gestes, ne conclut rien. usage : node compta-reste-explore.js [profil] [qui] [nuit]
const X = require('./compta-reste-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc', nuit = process.argv[4] === 'nuit';
  const c = await L.ouvrir({ profil, qui, nuit }), p = c.p;
  for (const [o, nom] of X.ONGLETS) {
    await X.compta(c, o); await p.waitForTimeout(300);
    const h1 = await p.evaluate(() => (document.querySelector('#contenu h1') || {}).textContent), g = await L.gestes(p, '#contenu'), t = await X.texte(p);
    console.log(`\n=== ${nom} (${o}) h1=${h1} gestes=${g.length} lignes=${t.split('\n').length}`);
    await L.capture(c, X.CAP + `${profil}-${nuit ? 'nuit' : 'jour'}-${qui}-${o}.png`);
  }
  console.log('erreurs', c.err.slice(0, 5));
  await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
