// La barre sous le PDF d'une fiche de contrat (contrats-05, contrats-12) : elle reste dans la cellule du PDF, « Voir en grand » ouvre le
// document, « Télécharger » répond, et il n'existe plus qu'UN bouton de téléchargement. Sur ordinateur, les cartes sont à droite du PDF.
// usage : node contrats-fiche-barre.js [profil] [nuit]
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrat-x-c1', nuit }); const p = c.p;
  await L.calme(p, 600);
  const e = await p.evaluate(() => { const d = document.querySelector('.ctr-doc'), pdf = d && d.querySelector('.pdf'), bar = d && d.querySelector('.doc-barre'), col = document.querySelector('.grille2 > .col'), b = el => el.getBoundingClientRect();
    return { cell: !!d, pdf: !!pdf, barDansCellule: !!bar, barApresPdf: !!(bar && pdf && pdf.nextElementSibling === bar), colGauche: col ? Math.round(b(col).left) : null, pdfDroite: pdf ? Math.round(b(pdf).right) : null, colHaut: col ? Math.round(b(col).top) : null, pdfBas: pdf ? Math.round(b(pdf).bottom) : null, largeur: innerWidth,
      telechargements: [...document.querySelectorAll('#contenu button, #content button, main button')].filter(x => /Télécharger/.test(x.textContent)).length }; });
  console.log(JSON.stringify(e));
  v('le PDF est dans sa cellule et sa barre juste dessous', e.cell && e.pdf && e.barDansCellule && e.barApresPdf, e);
  v('un seul bouton « Télécharger » sur la fiche', e.telechargements === 1, e.telechargements);
  if (e.largeur >= 1100) v('les cartes sont à droite du PDF, en haut', e.colGauche >= e.pdfDroite - 4 && e.colHaut < e.pdfBas - 200, e);
  await L.toucher(c, '[data-pdfplein]'); await L.calme(p, 600);
  const g = await p.evaluate(() => { const d = document.getElementById('docplein'); return { ouvert: !!d && getComputedStyle(d).display !== 'none' && d.getBoundingClientRect().height > 100, pdf: !!(d && d.querySelector('.pdf')) }; });
  v('« Voir en grand » ouvre le document', g.ouvert && g.pdf, g);
  await L.capture(c, O.CAP + `barre-${profil}${nuit ? '-nuit' : ''}-grand.png`);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
