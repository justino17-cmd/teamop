// Restes compta-ventes, tour 3 : dans l'éditeur de variantes de l'atelier de devis, le champ prix dit « Prix unitaire HT (€) » (comme l'éditeur de devis d'OP GESTION et la facture),
// il tient en entier au-dessus de son champ (pas coupé, pas sur deux lignes), la ligne ne déborde pas, la page ne défile pas de côté.
// PROFIL=mac|windows|ipad|iphone|android|petit  NUIT=0|1  node atelier-variantes-libelle.js — « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const pr = process.env.PROFIL || 'mac', nuit = process.env.NUIT === '1';
(async () => {
  const c = await L.ouvrir({ profil: pr, nuit, qui: 'marc' }), p = c.p;
  await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
  const clic = async s => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(250); };
  await clic('[data-vv="client"][data-id="vp"]'); await clic('[data-vv="art-add"][data-id="EL-ALL"]'); await clic('[data-vv="art-add"][data-id="DEP-Z1"]').catch(() => {});
  const m = await f.evaluate(() => { const W = innerWidth; return { W, n: document.querySelectorAll('.vv-l-c .vv-mini').length,
    lignes: [...document.querySelectorAll('.vv-l-c')].map(l => { const labs = [...l.querySelectorAll('.vv-mini')], b = l.getBoundingClientRect(); return { txt: labs.map(x => x.firstChild.textContent.trim()), coupe: labs.some(x => x.scrollWidth > x.clientWidth + 1), debord: l.scrollWidth > l.clientWidth + 1, droite: Math.max(...labs.map(x => x.getBoundingClientRect().right)) - b.right, hLab: labs.map(x => Math.round(x.firstChild.parentElement.getBoundingClientRect().height)) }; }), page: document.documentElement.scrollWidth - innerWidth }; });
  v('population : des lignes avec Quantité et Prix (≥ 2 champs)', m.n >= 2, m.n);
  v('V1 · le champ prix dit « Prix unitaire HT (€) »', m.lignes.every(l => l.txt.includes('Prix unitaire HT (€)')), m.lignes.map(l => l.txt));
  v('V2 · rien n’est coupé et la ligne ne déborde pas', m.lignes.every(l => !l.coupe && !l.debord && l.droite <= 1), m.lignes);
  v('V3 · la page ne défile pas de côté', m.page <= 0, m.page);
  await f.evaluate(() => { const e = document.querySelector('.vv-l-c'); if (e) e.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(500);
  await L.capture(c, (process.env.CAP || A.CAP) + 'atelier-variantes-libelle-' + pr + (nuit ? '-nuit' : '') + '.png');
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
