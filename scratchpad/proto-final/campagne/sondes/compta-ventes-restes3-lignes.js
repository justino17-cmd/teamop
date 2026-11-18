// Restes « compta-ventes », tour 3 : sur une facture à valider, chaque champ d'une ligne porte son MOT au-dessus quand l'en-tête de colonnes est caché (moins de 1250 px) — « 2 h » et « 100 » ne se devinent plus —
// et rien ne se chevauche, même avec des valeurs longues. À l'ordinateur large, l'en-tête suffit et les mots n'existent pas.
// Usage : node compta-ventes-restes3-lignes.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const cap = n => L.capture(c, X.CAP + `restes3-lignes-${profil}${nuit ? '-nuit' : ''}-${n}.png`);
  await p.evaluate(() => { const i = INTS.find(o => o.cli && o.st !== 'annulee' && !o.fact) || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'temps', tva: 10 }; F.debut = '08:00'; F.fin = '09:50';
    F.pieces = [{ nom: 'Nettoyant échangeur', q: '0,5 L', pu: 10.33 }, { nom: 'Installation pompe à chaleur — main-d’œuvre et déplacement longue durée', q: '1 250', pu: 1234567.89 }];
    factureDepuis(i); FACTURES.find(f => f.id === 'f-' + i.id).id = 'fx-l'; });
  await X.fiche(c, 'fx-l');
  const m = await p.evaluate(() => { const W = innerWidth, plage = W < 1250, lgs = [...document.querySelectorAll('.fac-lgs .dv-lg:not(.dv-lg-t)')];
    const R = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right, b: b.bottom, vu: b.width > 0 && getComputedStyle(e).display !== 'none' }; };
    return { W, plage, n: lgs.length, lignes: lgs.map(l => { const q = l.querySelector('.dv-q2'), pu = l.querySelector('.dv-pu'), eq = l.querySelector('.fac-et-q'), ep = l.querySelector('.fac-et-p'), t = l.querySelector('.dv-tot'), x = l.querySelector('.dv-x');
      return { q: R(q), pu: R(pu), eq: R(eq), ep: R(ep), t: R(t), x: R(x), eqTxt: eq.textContent, epTxt: ep.textContent, epCoupe: ep.scrollWidth > ep.clientWidth + 1, ligneDebord: l.scrollWidth > l.clientWidth + 1 }; }),
      page: document.documentElement.scrollWidth - innerWidth, carte: (document.querySelector('.fac-lgs') || {}).clientWidth }; });
  L.v('population : des lignes de facture à valider (≥ 3)', m.n >= 3, m.n);
  if (m.plage) {
    L.v('E1 · chaque ligne montre « Qté » et « Prix unitaire HT » (deux mots visibles)', m.lignes.every(l => l.eq.vu && l.ep.vu && l.eqTxt === 'Qté' && l.epTxt === 'Prix unitaire HT'), m.lignes[0]);
    L.v('E2 · le mot est AU-DESSUS de son champ, aligné sur lui (bords gauche et droit à 12 px près)', m.lignes.every(l => l.eq.b <= l.q.y + 1 && l.ep.b <= l.pu.y + 1 && Math.abs(l.eq.r - l.q.r) <= 12 && Math.abs(l.ep.r - l.pu.r) <= 12), m.lignes.map(l => [l.eq.b, l.q.y, l.ep.b, l.pu.y]));
    L.v('E3 · le mot « Prix unitaire HT » n’est pas coupé, et rien ne déborde de la ligne', m.lignes.every(l => !l.epCoupe && !l.ligneDebord), m.lignes.map(l => [l.epCoupe, l.ligneDebord]));
    L.v('E4 · quantité, prix et croix sur la même rangée, le total dessous', m.lignes.every(l => Math.abs(l.q.y - l.pu.y) < 2 && Math.abs(l.q.y - l.x.y) < 30 && l.t.y >= l.q.b - 1), m.lignes.map(l => [l.q.y, l.pu.y, l.x.y, l.t.y]));
  } else L.v('E1 · à l’ordinateur large les mots d’étiquette n’existent pas (l’en-tête de colonnes suffit)', m.lignes.every(l => !l.eq.vu && !l.ep.vu), m.lignes[0]);
  L.v('E5 · la page ne défile pas de côté', m.page <= 0, m.page);
  await p.evaluate(() => { const e = document.querySelector('.fac-lgs'); if (e) e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90); }); await L.calme(p, 400); await cap('lignes');
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
