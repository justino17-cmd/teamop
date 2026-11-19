// Restes compta-ventes, tour 6 (3) : la commande fournisseur « Nouvelle commande » — « Prix unitaire HT », total de ligne au centime, Total HT qui retombe sur ses lignes. Joué dans la vraie fenêtre.
// Usage : node compta-ventes-restes6-commande.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p;
  await p.evaluate(() => { cmdEdOuvrir(); CMD_ED.lignes = [{ nom: 'Filtre test', ref: 'T-1', q: 3, pu: 12.345 }, { nom: 'Joint test', ref: 'T-2', q: 3, pu: 12.345 }]; cmdEdVue(); });
  await L.calme(p, 600);
  const lire = () => p.evaluate(() => { const num = s => Math.round(parseFloat(s.replace(/[^\d,-]/g, '').replace(',', '.')) * 100);
    const P = document.querySelector('#calque .panneau') || document.body;
    return { lib: [...P.querySelectorAll('.fx-ep > span')].map(e => e.textContent.trim()), pus: [...P.querySelectorAll('[data-cedl$="|pu"]')].map(e => e.value),
      lignes: [...P.querySelectorAll('.fx-et')].map(e => num(e.textContent)), tot: (P.querySelector('.ced-tot b') || {}).textContent, deborde: document.documentElement.scrollWidth > innerWidth + 1 }; });
  let r = await lire(); console.log('  ·', JSON.stringify(r));
  L.v('population : deux lignes de commande à l’écran', r.pus.length === 2 && r.lignes.length === 2, JSON.stringify(r));
  L.v('le libellé du champ dit « Prix unitaire HT »', r.lib.every(t => t === 'Prix unitaire HT'), r.lib.join(' | '));
  L.v('le prix 12,345 s’affiche tel qu’il est stocké', r.pus.every(v => v === '12,345'), r.pus.join(' | '));
  L.v('chaque ligne affiche 37,04 €', r.lignes.every(n => n === 3704), r.lignes.join(' | '));
  L.v('le Total HT (74,08 €) est la somme des lignes lues', /74,08/.test(r.tot || '') && r.lignes.reduce((s, n) => s + n, 0) === 7408, r.tot);
  L.v('aucun débordement horizontal', !r.deborde, '');
  await L.capture(c, X.CAP.replace('campagne-compta-ventes/', 'cv-r6/') + 'r6-commande-' + profil + (nuit ? '-nuit' : '') + '.png');
  await L.fermer(c); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
