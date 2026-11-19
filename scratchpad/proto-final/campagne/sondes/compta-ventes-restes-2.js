// Restes compta-ventes, tour 1 (17 novembre 2026), décision du chef 11 : sur la fiche d'une facture ET sur son PDF, trois colonnes « Prix unitaire HT · Qté · Total HT »,
// UNE fonction pour le total de ligne (celle du total de la facture). Valeurs LONGUES : 3 × 1 234,50 €, 1,5 × 29,17 €, une désignation de 80 signes.
// Usage : node compta-ventes-restes-2.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const cap = n => L.capture(c, X.CAP + `restes2-${profil}${nuit ? '-nuit' : ''}-${n}.png`);
  await p.evaluate(() => { const lg = [{ d: 'Remplacement complet du groupe extérieur et du détendeur — fourniture et pose', q: '3', pu: 1234.5 }, { d: 'Déplacement', q: '1,5', pu: 29.17 }];
    FACTURES.unshift({ id: 'fx-env', num: 'FAC-2026-0150', cli: 'md', objet: 'Remplacement groupe · 30/10', lignes: lg.map(l => ({ ...l })), ht: 0, tva: 10, st: 'envoyee', emise: '30/10', ech: '29/11' });
    FACTURES.unshift({ id: 'fx-val', num: '—', cli: 'md', objet: 'Remplacement groupe · 30/10', lignes: lg.map(l => ({ ...l })), ht: 0, tva: 10, st: 'avalider', emise: '—', ech: '—' }); });
  const attendu = await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-env'); return { l1: Math.round(totLigne(f.lignes[0]) * 100), l2: Math.round(totLigne(f.lignes[1]) * 100), ht: Math.round(htDe(f) * 100) }; });
  L.v('population : un total de ligne 370 350 c, un autre 4 376 c, et un total HT qui est leur somme (une seule multiplication)', attendu.l1 === 370350 && attendu.l2 === 4376 && attendu.ht === attendu.l1 + attendu.l2, attendu);
  for (const [id, nom] of [['fx-env', 'facture envoyée (lecture)'], ['fx-val', 'facture à valider (modifiable)']]) {
    await X.fiche(c, id); await p.evaluate(() => { const e = document.querySelector('.tableau'); e && e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); }); await L.calme(p, 450);
    const m = await p.evaluate(() => { const t = document.querySelector('#contenu .tableau'); const e = t.innerText.replace(/\s+/g, ' ');
      return { sw: t.scrollWidth, cw: t.clientWidth, txt: e, entetes: [...t.querySelectorAll('thead th, .dv-lg-t span')].map(x => x.textContent.trim()) }; });
    L.v(nom + ' · le tableau ne défile pas de côté', m.sw <= m.cw + 1, { sw: m.sw, cw: m.cw });
    L.v(nom + ' · les en-têtes disent « Prix unitaire HT », « Qté », « Total HT »', /Prix unitaire HT/.test(m.entetes.join('|')) && /Qté/.test(m.entetes.join('|')) && /Total HT/.test(m.entetes.join('|')), m.entetes);
    if (id === 'fx-env') { L.v(nom + ' · la ligne à 3 × 1 234,50 € totalise 3 703,50 €', /3 703,50\s*€/.test(m.txt.replace(/[\u00a0\u202f]/g, ' ')), m.txt.slice(0, 260)); L.v(nom + ' · la ligne à 1,5 × 29,17 € totalise 43,76 €', /43,76\s*€/.test(m.txt.replace(/[\u00a0\u202f]/g, ' ')), m.txt.slice(0, 260)); }
    else { const v = await p.evaluate(() => [...document.querySelectorAll('#contenu .dv-tot')].map(x => x.textContent.replace(/[\u00a0\u202f]/g, ' ').trim())); L.v(nom + ' · les totaux de ligne (3 703,50 € ; 43,76 €)', /3 703,50/.test(v[0]) && /43,76/.test(v[1]), v); }
    await cap(id);
    if (id === 'fx-env') {
      await L.toucher(c, '[data-action="pdfFacture"]'); await L.calme(p, 500);
      const q = await p.evaluate(() => { const d = document.querySelector('#calque .pdf'); if (!d) return null; const t = d.querySelector('table'); return { sw: d.scrollWidth, cw: d.clientWidth, entetes: [...t.querySelectorAll('thead th')].map(x => x.textContent.trim()), txt: t.innerText.replace(/\s+/g, ' ').replace(/[\u00a0\u202f]/g, ' '), pied: [...t.querySelectorAll('tfoot td')].map(x => x.textContent.trim()) }; });
      L.v('PDF · il existe', !!q); if (q) { L.v('PDF · le document ne défile pas de côté', q.sw <= q.cw + 1, { sw: q.sw, cw: q.cw }); L.v('PDF · en-têtes « Prix unitaire HT », « Qté », « Total HT »', /Prix unitaire HT/.test(q.entetes.join('|')) && /Qté/.test(q.entetes.join('|')) && /Total HT/.test(q.entetes.join('|')), q.entetes);
        L.v('PDF · 3 703,50 € et 43,76 € par ligne ; total HT 3 747,26 €', /3 703,50/.test(q.txt) && /43,76/.test(q.txt) && /3 747,26/.test(q.txt), q.txt.slice(0, 300)); }
      await cap('pdf'); await L.ranger(p);
    }
  }
  console.log('  erreurs de page :', c.err.length ? c.err.slice(0, 3) : 'aucune'); L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const k = L.bilan(); await L.fermer(); process.exit(k ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
