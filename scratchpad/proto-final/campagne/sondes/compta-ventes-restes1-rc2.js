// Recontrôle adverse des restes « compta-ventes », tour 1 : l'aperçu du PDF d'une facture (« La facture ») à quatre colonnes.
// Un montant ou « Qté » qui se coupe EN DEUX LIGNES (« 3 747 / ,26 € », « Qt / é ») est un document laid que le client recevrait : on le compte, cellule par cellule.
// Usage : node compta-ventes-restes1-rc2.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  await p.evaluate(() => { const lg = [{ d: 'Remplacement complet du groupe extérieur et du détendeur — fourniture et pose', q: '3', pu: 1234.5 }, { d: 'Déplacement', q: '1,5', pu: 29.17 }];
    FACTURES.unshift({ id: 'fx-env', num: 'FAC-2026-0150', cli: 'md', objet: 'Remplacement groupe · 30/10', lignes: lg.map(l => ({ ...l })), ht: 0, tva: 10, st: 'envoyee', emise: '30/10', ech: '29/11', relances: 0, trace: [] }); });
  for (const [id, nom] of [['f145', 'facture ordinaire (186,00 €)'], ['fx-env', 'facture à valeurs longues']]) {
    await X.fiche(c, id); await L.toucher(c, '[data-action="pdfFacture"]'); await L.calme(p, 600);
    const m = await p.evaluate(() => { const d = document.querySelector('#calque .pdf'); if (!d) return null; const cel = [...d.querySelectorAll('table td, table th')];
      const num = /^[\d\s  ,.−\-–+×€%Qté]+$/;
      const lignesDe = e => { const r = document.createRange(); r.selectNodeContents(e); return new Set([...r.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top / 4))).size; };
      const coupees = cel.filter(e => { const t = e.textContent.trim(); return t && (num.test(t) || t === 'Qté') && lignesDe(e) > 1; }).map(e => e.textContent.trim().replace(/\s+/g, ' '));
      return { cellules: cel.length, numeriques: cel.filter(e => num.test(e.textContent.trim())).length, coupees, sw: d.scrollWidth, cw: d.clientWidth }; });
    L.v(nom + ' · l’aperçu existe et la population est là (≥ 8 cellules)', !!m && m.cellules >= 8, m && m.cellules);
    if (m) { L.v(nom + ' · aucun montant ni « Qté » ne se coupe en deux lignes', m.coupees.length === 0, m.coupees); L.v(nom + ' · pas de défilement latéral', m.sw <= m.cw + 1, { sw: m.sw, cw: m.cw }); }
    await L.capture(c, X.CAP + `rc2-${profil}${nuit ? '-nuit' : ''}-pdf-${id}.png`); await L.ranger(p);
  }
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
