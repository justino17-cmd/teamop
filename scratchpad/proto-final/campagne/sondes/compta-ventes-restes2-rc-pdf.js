// Recontrôle adverse des restes « compta-ventes », tour 2 : la règle commune de l'aperçu d'un document (.pdf).
// Le correcteur a posé `.pdf{container:pdf/inline-size}` et `.pdf table td[style*="text-align:right"]{white-space:nowrap}` pour TOUS les documents (facture, avoir, devis, compte rendu, bilan, contrat) :
// on mesure chacun, sur chaque profil, avec des valeurs LONGUES — un montant ou une cellule qui sort de la feuille, un document qui s'effondre, un montant coupé en deux lignes.
// Usage : [RACINE=…] node compta-ventes-restes2-rc-pdf.js [profil] [nuit] ; sort en 1 si un contrôle tombe.
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const larg = L.PROFILS[profil].largeur || (L.PROFILS[profil].viewport || {}).width;
  await p.evaluate(() => {
    FACTURES.unshift({ id: 'fx-long', num: 'FAC-2026-0199', cli: 'md', objet: 'Valeurs longues', lignes: [{ d: 'Remplacement complet du groupe extérieur et du détendeur — fourniture et pose', q: '3', pu: 1234567.5, qn: 3 }, { d: 'Heures', q: '250 mL', pu: 999999, qn: 250 }, { d: 'Déplacement', q: '1,5', pu: 29.17 }], ht: 0, tva: 10, st: 'envoyee', emise: '30/10', ech: '29/11', relances: 0, trace: [] });
    FACTURES.unshift({ id: 'fx-reel', num: 'FAC-2026-0198', cli: 'md', objet: 'Réaliste', lignes: [{ d: 'Remplacement complet du groupe extérieur et du détendeur — fourniture et pose', q: '3', pu: 1234.5 }, { d: 'Déplacement', q: '1,5', pu: 29.17 }], ht: 0, tva: 10, st: 'envoyee', emise: '30/10', ech: '29/11', relances: 0, trace: [] });
    FACTURES.unshift({ id: 'av-long', num: 'AV-2026-0099', cli: 'md', objet: 'Avoir sur FAC-2026-0199', ht: 1234567.5, tva: 10, st: 'avoir', emise: '31/10', ech: '—', lignes: [{ d: 'Avoir sur la facture FAC-2026-0199', q: '1', pu: -1234567.5 }] }); });
  const docs = await p.evaluate(() => { const D = Object.keys(DEVIS_REG)[0]; return [
    ['facture ordinaire', () => pdfFacture(FACTURES.find(f => f.id === 'f145'))],
    ['facture à valeurs longues', () => 0],['facture réaliste', () => 0],
    ['avoir', () => { const a = FACTURES.find(f => f.st === 'avoir'); return a ? pdfFacture(a) : ''; }],
    ['devis', () => docDevis(DEVIS_REG[D])],
    ['compte rendu', () => compteRenduPdf(INTS.find(i => i.st === 'fait').id)],
    ['bilan', () => bilanPdf()],
  ].map(x => x[0]); });
  const num = /^[\d\s  ,.−\-–+×€%Qté]+$/;
  for (const nom of docs) {
    const m = await p.evaluate(async ([nom, num]) => {
      const gen = { 'facture ordinaire': () => pdfFacture(FACTURES.find(f => f.id === 'f145')), 'facture à valeurs longues': () => pdfFacture(FACTURES.find(f => f.id === 'fx-long')), 'facture réaliste': () => pdfFacture(FACTURES.find(f => f.id === 'fx-reel')), 'avoir': () => { const a = FACTURES.find(f => f.st === 'avoir'); return a ? pdfFacture(a) : ''; },
        'devis': () => docDevis(DEVIS_REG[Object.keys(DEVIS_REG)[0]]), 'compte rendu': () => compteRenduPdf(INTS.find(i => i.st === 'fait').id), 'bilan': () => bilanPdf() }[nom];
      const h = gen(); if (!h) return null; ouvrirPanneau('<h2>' + nom + '</h2>' + h, true); await new Promise(r => setTimeout(r, 1100));   /* le panneau entre en glissant : on mesure et on photographie une fois posé */
      const d = document.querySelector('#calque .pdf'); if (!d) return null; (d.querySelector('table') || d).scrollIntoView({ block: 'center' });
      const re = new RegExp(num), cel = [...d.querySelectorAll('table td, table th')];
      const lignesDe = e => { const r = document.createRange(); r.selectNodeContents(e); return new Set([...r.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top / 4))).size; };
      const coupees = cel.filter(e => { const t = e.textContent.trim(); return t && (re.test(t) || t === 'Qté') && lignesDe(e) > 1; }).map(e => e.textContent.trim().replace(/\s+/g, ' '));
      const dr = d.getBoundingClientRect(), sortent = cel.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > dr.right + 1 || r.left < dr.left - 1); }).map(e => e.textContent.trim().slice(0, 30));
      const dep = cel.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim().slice(0, 30));
      return { cellules: cel.length, coupees, sortent, dep, sw: d.scrollWidth, cw: d.clientWidth, w: Math.round(dr.width), pageSW: document.documentElement.scrollWidth };
    }, [nom, num.source]);
    if (!m) { console.log('  · ' + nom + ' : non généré'); continue; }
    L.v(nom + ' · population (≥ 4 cellules)', m.cellules >= 4, m.cellules);
    L.v(nom + ' · le document garde une largeur utile (≥ 200 px)', m.w >= 200, m.w);
    L.v(nom + ' · aucun montant ni « Qté » coupé en deux lignes', m.coupees.length === 0, m.coupees);
    L.v(nom + ' · aucune cellule ne sort de la feuille', m.sortent.length === 0 && m.sw <= m.cw + 1, { sortent: m.sortent, sw: m.sw, cw: m.cw });
    L.v(nom + ' · aucun texte ne déborde de sa cellule', m.dep.length === 0, m.dep);
    await L.capture(c, X.CAP + `rc-pdf-${profil}${nuit ? '-nuit' : ''}-${nom.replace(/\W+/g, '-')}.png`); await L.ranger(p);
  }
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
