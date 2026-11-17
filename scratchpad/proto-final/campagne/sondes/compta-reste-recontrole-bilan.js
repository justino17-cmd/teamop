// Recontrôle du défaut 10 : le bilan des encaissements sur TÉLÉPHONE (iphone, android, petit) — le tableau « Détail » tient-il sans casser un numéro de facture en trois lignes,
// et la fenêtre glisse-t-elle de côté ? On mesure le NOMBRE DE LIGNES de chaque cellule (hauteur / interligne), pas seulement le débordement.
// usage : node compta-reste-recontrole-bilan.js [profil] [nuit] → « N ✓ · M ✗ »
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', suf = profil + (nuit ? '-nuit' : '');
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p;
  await X.compta(c, 'archives');
  const ouvert = await p.evaluate(() => { const b = [...document.querySelectorAll('#contenu button')].find(x => /Bilan des encaissements/i.test((x.closest('.cx-ligne, .ligne, li, tr, div') || x).innerText) && /Ouvrir|Voir/i.test(x.textContent)); if (b) { b.click(); return true; } return false; });
  await p.waitForTimeout(700); v('B0 · le bilan s’ouvre', ouvert && await p.evaluate(() => !!document.querySelector('#calque table')));
  const m = await p.evaluate(() => { const cal = document.querySelector('#calque .panneau') || document.querySelector('#calque'); const cell = [...document.querySelectorAll('#calque table td, #calque table th')];
    const lignes = e => { const cs = getComputedStyle(e), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3, h = e.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom); return Math.max(1, Math.round(h / lh)); };
    const pire = cell.map(e => ({ t: e.innerText.trim().slice(0, 24), n: lignes(e), l: Math.round(e.getBoundingClientRect().width) })).sort((a, b) => b.n - a.n).slice(0, 6);
    return { debPanneau: cal.scrollWidth - cal.clientWidth, cellules: cell.length, pire, largeur: innerWidth }; });
  console.log(JSON.stringify(m));
  v('B1 · population : le tableau a des cellules', m.cellules > 20, m.cellules);
  v('B2 · la fenêtre du bilan ne glisse pas de côté', m.debPanneau <= 2, m.debPanneau);
  v('B3 · aucune cellule ne passe sur 3 lignes ou plus (« FAC- / 2026- / 0145 »)', m.pire[0].n <= 2, m.pire);
  v('B4 · aucun numéro de facture n’est coupé au milieu', !(await p.evaluate(() => [...document.querySelectorAll('#calque table td')].some(e => /^FAC-\d{4}-\d{4}$/.test(e.innerText.trim()) && e.getBoundingClientRect().height > 40))), m.pire.slice(0, 2));
  await p.evaluate(() => { const t = document.querySelector('#calque table'); if (t) t.scrollIntoView({ block: 'start' }); }); await L.calme(p, 400);
  await L.capture(c, X.CAP + `rc-bilan-tableau-${suf}.png`);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
