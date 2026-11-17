// Exploration de la partie « compta-ventes » : ce que montre la Comptabilité à l'ouverture (cadre plein écran puis vue
// quotidienne « Factures et paiements »). Sert à écrire la carte des écrans ; ne conclut rien.
const L = require('../../lib.js'), CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-compta-ventes';
(async () => {
  const c = await L.ouvrir({ profil: process.env.PROFIL || 'mac', qui: process.env.QUI || 'marc' });
  const { p } = c;
  await L.toucher(c, '#menu a[href="#comptabilite"]'); await p.waitForTimeout(1800);
  console.log('état', JSON.stringify(await L.etat(p)));
  console.log('cadres', p.frames().map(f => f.url().slice(-60)));
  await L.capture(c, CAP + '/explore-' + c.profil + '-cadre.png');
  const f = L.cadre(p);
  if (f) {
    const g = await f.evaluate(() => [...document.querySelectorAll('button,a,[data-a],[data-r]')].filter(e => e.offsetParent).slice(0, 100).map(e => e.tagName + '|' + (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) + '|' + [...e.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value.slice(0, 25)).join(' ')));
    console.log(g.join('\n'));
  }
  console.log(c.err.join('\n'));
  await L.fermer();
})();
