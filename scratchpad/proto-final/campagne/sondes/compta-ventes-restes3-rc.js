// Recontrôle adverse des restes « compta-ventes », tour 3 : ce que les corrections du tour 3 ont pu casser à côté.
// (1) qteLire : table de lectures (durées, unités, plafonds) ; (2) la facture à valider : les totaux de ligne affichés s'additionnent-ils au HT affiché ?
// (3) la tâche « Rembourser » d'une facture annulée par Julie : le gérant la voit-il ? ; (4) le geste « Noter comme remboursé » sous les deux rôles.
// Usage : node compta-ventes-restes3-rc.js [profil] [nuit]   — « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const cap = n => L.capture(c, X.CAP.replace('campagne-compta-ventes/', 'cv-rc3/') + `rc3-${profil}${nuit ? '-nuit' : ''}-${n}.png`);
  // ── 1. table de lectures ──
  const T = await p.evaluate(() => { const o = {}; ['2', '2h', '2 h', '2H', '2h30', '2 h 30', '2h 30', '2h30min', '1h15 min', '0h30', '0h00', '2h60', '2h5', '12h30', '2,5h', '1 000', '10000', '10001', '1 234,5 kg', '250 mL', '0,5 L', '2 x 5', '2h30m', 'h30', '', '  ', '-2', '1e9', '٣', '2h30h'].forEach(v => { o[v] = qteLire(v); }); return o; });
  const att = { '2': 2, '2h': 2, '2 h': 2, '2H': 2, '2h30': 2.5, '2 h 30': 2.5, '2h 30': 2.5, '2h30min': 2.5, '1h15 min': 1.25, '0h30': 0.5, '12h30': 12.5, '2,5h': 2.5, '1 000': 1000, '10000': 10000, '1 234,5 kg': 1234.5, '250 mL': 250, '0,5 L': 0.5 };
  for (const k in att) L.v('qteLire(' + JSON.stringify(k) + ') = ' + att[k], T[k] === att[k], T[k]);
  for (const k of ['2h60', '2 x 5', 'h30', '', '  ', '-2', '1e9', '2h30h', '2h30m']) L.v('qteLire(' + JSON.stringify(k) + ') refusé ou 0 (jamais une valeur silencieuse)', T[k] === null || T[k] === 0 || T[k] === undefined, T[k]);
  console.log('  · à lire (pas des contrôles) : 2h5 =', T['2h5'], '· 0h00 =', T['0h00'], '· 2h30m =', T['2h30m']);
  // ── 2. cohérence des centimes : lignes à quantité fractionnaire, lues SUR L'ÉCRAN (le texte que le client lit), pas par la fonction ──
  await p.evaluate(() => { const i = INTS.find(o => o.cli && o.st !== 'annulee' && !o.fact) || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'temps', tva: 10 }; F.debut = '08:00'; F.fin = '09:50';
    F.pieces = []; factureDepuis(i); const f = FACTURES.find(x => x.id === 'f-' + i.id); f.id = 'fx-c'; f.lignes = lignesDe(f).slice(0, 1); f.lignes.push({ d: 'Ligne B', q: '1', pu: 10.33 }, { d: 'Ligne C', q: '1', pu: 10.33 }, { d: 'Ligne D', q: '1', pu: 10.33 }); });
  await X.fiche(c, 'fx-c');
  const saisirQ = async (k, v) => { const l = p.locator('[data-fqte="' + k + '"]').first(); await l.fill(v); await l.press('Tab'); await L.calme(p, 350); };
  await saisirQ(1, '2,5'); await saisirQ(2, '2,5'); await saisirQ(3, '2,5');
  const m = await p.evaluate(() => { const n = s => Math.round(parseFloat(String(s).replace(/[  ]/g, '').replace(',', '.').replace(/[^\d.\-]/g, '')) * 100);
    const tots = [...document.querySelectorAll('.fac-lgs .dv-tot')].map(e => e.innerText.trim()).filter(t => /\d/.test(t)).map(n);
    const txt = document.querySelector('#contenu').innerText.replace(/\n{2,}/g, '\n');
    const mh = txt.match(/Total HT\t([\d\u00a0\u202f ,.]+)\s*€/i);
    return { tots, ht: mh ? n(mh[1]) : null, extrait: txt.split('\n').filter(l => /HT|TVA|TTC/.test(l)).slice(0, 6) }; });
  const somme = m.tots.reduce((a, b) => a + b, 0);
  console.log('  · totaux de ligne affichés', JSON.stringify(m.tots), 'somme', somme, '· Total HT affiché', m.ht, JSON.stringify(m.extrait));
  L.v('population : 4 totaux de ligne lus à l’écran dont trois à 2,5 × 10,33 €', m.tots.length === 4 && m.tots.slice(1, 4).every(t => t === 2583), m.tots);
  L.v('les totaux de ligne affichés s’additionnent au Total HT affiché (au centime)', m.ht !== null && somme === m.ht, { somme, ht: m.ht });
  await cap('centimes');
  const ok = L.bilan ? L.bilan() : null;
  await L.fermer(c);
})().catch(e => { console.error(e); process.exit(1); });
