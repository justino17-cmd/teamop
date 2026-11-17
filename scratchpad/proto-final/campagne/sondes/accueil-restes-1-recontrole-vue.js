// Captures du graphique des 12 mois aux largeurs où il tient SANS défiler (700, 744) et où il défile (390, 820), jour ou nuit : le fondu de 30 px ne doit rien salir quand il ne sert pas.
// node accueil-restes-1-recontrole-vue.js [profil] [nuit]
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), tag = profil + (nuit ? '-nuit' : '-jour');
(async () => {
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  for (const w of (profil === 'ipad' ? [744, 820] : [390, 700])) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250);
    await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 500);
    await p.evaluate(() => { const e = document.querySelector('.st-graph'); e.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300);
    v(`vue ${w} · le graphique existe`, !!(await p.$('.st-graph')));
    await L.capture(c, O.CAP + `restes1-rec-vue-${w}-${tag}.png`, false);
  }
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
