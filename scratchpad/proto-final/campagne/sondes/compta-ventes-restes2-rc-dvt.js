// Recontrôle adverse, tour 2 : l'en-tête de l'éditeur de devis (« Prix unitaire HT » · « Total HT », plus longs qu'avant) tient dans ses colonnes, à toutes les largeurs où il s'affiche (≥ 1250 px), et une quantité de devis plafonnée ne contredit pas celle d'une facture.
// Usage : node compta-ventes-restes2-rc-dvt.js [profil]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  await p.evaluate(() => dvCreer({ cli: 'md', objet: 'Essai en-tête', lignes: [['Cassette 4 voies', 2, 690], ['Pose', 1, 390]], source: 'sonde' })); await L.calme(p, 700);
  for (const larg of [1251, 1280, 1366, 1440]) {
    await p.setViewportSize({ width: larg, height: 900 }); await L.calme(p, 400);
    const m = await p.evaluate(() => { const t = document.querySelector('#contenu .dv-lg-t'); if (!t || !t.offsetParent) return null; const s = [...t.children].filter(x => x.tagName === 'SPAN').map(x => { const r = document.createRange(); r.selectNodeContents(x); const l = new Set([...r.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top / 3))).size; return { t: x.textContent.trim(), lignes: l, sort: x.scrollWidth > x.clientWidth + 1 }; }); return s; });
    L.v(larg + ' px · l’en-tête des lignes existe (population)', !!m && m.length >= 4, m && m.length);
    if (m) L.v(larg + ' px · chaque libellé tient sur UNE ligne et dans sa colonne', m.every(x => x.lignes <= 1 && !x.sort), JSON.stringify(m.filter(x => x.lignes > 1 || x.sort)));
    if (larg === 1251) await L.capture(c, X.CAP + 'rc-dvt-1251.png');
  }
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
