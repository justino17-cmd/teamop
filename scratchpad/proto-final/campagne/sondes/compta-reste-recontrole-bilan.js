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
    // les lignes se comptent sur le TEXTE (les rectangles du contenu), pas sur la hauteur de la cellule : celle-ci vaut la hauteur de la RANGÉE, qu'une voisine sur deux lignes suffit à doubler (faux « numéro coupé » mesuré à 390 px, le 19/11)
    const lignes = e => { const r = document.createRange(); r.selectNodeContents(e); return Math.max(1, new Set([...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top / 4))).size); };
    const pire = cell.map(e => ({ t: e.innerText.trim().slice(0, 24), n: lignes(e), l: Math.round(e.getBoundingClientRect().width) })).sort((a, b) => b.n - a.n).slice(0, 40);
    return { debPanneau: cal.scrollWidth - cal.clientWidth, cellules: cell.length, pire, largeur: innerWidth }; });
  console.log(JSON.stringify(m));
  v('B1 · population : le tableau a des cellules', m.cellules > 20, m.cellules);
  v('B2 · la fenêtre du bilan ne glisse pas de côté', m.debPanneau <= 2, m.debPanneau);
  // un nom de client peut légitimement passer sur trois lignes à 360 px (« Cabinet / dentaire / Martin ») ; ce que B3 garde, c'est un mot SEUL (numéro, date, montant) coupé en morceaux : on ne regarde que les cellules d'un seul mot
  v('B3 · aucune cellule d’un seul mot (numéro, date, montant) ne passe sur 2 lignes ou plus (« FAC- / 2026- / 0145 »)', m.pire.filter(x => !/\s/.test(x.t)).every(x => x.n <= 1), m.pire.filter(x => !/\s/.test(x.t)));
  v('B4 · aucun numéro de facture n’est coupé au milieu', !(await p.evaluate(() => [...document.querySelectorAll('#calque table td')].some(e => /^FAC-\d{4}-\d{4}$/.test(e.innerText.trim()) && (() => { const r = document.createRange(); r.selectNodeContents(e); return new Set([...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top / 4))).size > 1; })()))), m.pire.slice(0, 2));
  await p.evaluate(() => { const t = document.querySelector('#calque table'); if (t) t.scrollIntoView({ block: 'start' }); }); await L.calme(p, 400);
  await L.capture(c, X.CAP + `rc-bilan-tableau-${suf}.png`);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
