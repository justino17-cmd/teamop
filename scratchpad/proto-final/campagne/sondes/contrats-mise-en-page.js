// Mise en page des écrans « Contrats » sur un profil, jour ou nuit : la page ne glisse pas (contre la largeur POSÉE du profil), cibles au
// doigt ≥ 44 px mesurées à ce qui répond, champs ≥ 16 px, textes écrasés, et la grille de la fiche (le PDF à gauche, les cartes à droite
// quand l'écran est large). Une capture par écran, à REGARDER.
// usage : node contrats-mise-en-page.js <profil> [nuit]
const O = require('./contrats-outils.js'), L = O.L, v = L.v, fs = require('fs');
const ECRANS = [['liste', 'contrats'], ['fiche-signe', 'contrat-x-c1'], ['fiche-attente', 'contrat-x-c3'], ['nouveau', 'contrat-nouveau'], ['signer', 'signer-x-c3']];
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); const p = c.p; const bilan = [];
  const seuls = process.env.SEULS ? process.env.SEULS.split(',') : null;
  for (const [nom, h] of ECRANS) {
    if (seuls && !seuls.includes(nom)) continue;
    await O.neuf(c, nom === 'signer' ? 'contrats' : h); if (nom === 'signer') await L.aller(p, h); await L.calme(p, 500);
    // l'écran visé est-il VRAIMENT là ? (recharger sur #signer-x-… ramène à l'accueil : une mesure prise là ne dirait rien de la signature)
    const la = await p.evaluate(n => n === 'signer' ? !!document.querySelector('#contenu .client-web') : n === 'liste' ? /^Contrats$/.test((document.querySelector('#contenu h1') || {}).textContent || '') : n === 'nouveau' ? !!document.querySelector('[data-b="prix"]') : !!document.querySelector('#contenu .pdf'), nom);
    v(`F ${tag} · ${nom} : l'écran mesuré est bien celui-là`, la, la);
    const d = await L.deborde(c); v(`F ${tag} · ${nom} : la page ne glisse pas (${d.seconde}/${d.largeur})`, !d.bouge, d);
    const m = await L.doigts(p, '#contenu');
    if (c.doigt) { v(`F ${tag} · ${nom} : champs ≥ 16 px (${m.champs.length} sous)`, m.champs.length === 0, m.champs); const dr = await O.doigtsReel(p, '#contenu'); v(`F ${tag} · ${nom} : cibles au doigt ≥ 44 px (${dr.length} sous)`, dr.length === 0, dr); bilan.push({ nom, petits: dr }); }
    v(`F ${tag} · ${nom} : aucun texte écrasé`, m.ecrases.length === 0, m.ecrases);
    if (nom.startsWith('fiche')) { const g = await p.evaluate(() => { const pdf = document.querySelector('#contenu .pdf'), col = document.querySelector('#contenu .col'); if (!pdf || !col) return null; const a = pdf.getBoundingClientRect(), b = col.getBoundingClientRect(); return { pdfDroite: Math.round(a.right), colGauche: Math.round(b.left), colHaut: Math.round(b.top + scrollY), pdfBas: Math.round(a.bottom + scrollY), largeur: innerWidth }; });
      if (g && g.largeur >= 1000) v(`contrats-05 · F ${tag} · ${nom} : les cartes (chemin, visites, facturation) sont À CÔTÉ du PDF, pas dessous (col à ${g.colGauche} px, PDF jusqu'à ${g.pdfDroite} px)`, g.colGauche >= g.pdfDroite - 4, g); console.log('  · grille', nom, JSON.stringify(g)); }
    await L.capture(c, O.CAP + `F-${nom}-${tag}.png`, true);
  }
  // la feuille « Lire le contrat en entier » (page de signature) et « Voir en grand » (fiche)
  if (seuls && !seuls.includes('signer')) { console.log('err', c.err.length); const k0 = L.bilan(); await L.fin(c); await L.fermer(); process.exit(k0 ? 1 : 0); }
  await O.neuf(c, 'contrats'); await L.aller(p, 'signer-x-c3'); await L.toucher(c, '[data-action="lireContrat"]'); await L.calme(p, 500);
  const dp = await L.deborde(c); v(`F ${tag} · lire le contrat : la page ne glisse pas (${dp.seconde}/${dp.largeur})`, !dp.bouge, dp);
  await L.capture(c, O.CAP + `F-lire-${tag}.png`);
  await O.neuf(c, 'contrat-x-c1'); await p.evaluate(() => document.querySelector('[data-pdfplein]').click()); await L.calme(p, 600);
  const dg = await p.evaluate(() => { const z = document.getElementById('docplein'); if (!z) return null; const f = z.querySelector('.doc-feuille'), r = f.getBoundingClientRect(); return { gauche: Math.round(r.left), droite: Math.round(r.right), largeur: innerWidth, zoom: f.style.zoom }; });
  v(`F ${tag} · « Voir en grand » : la feuille tient dans l'écran`, dg && dg.gauche >= -1 && dg.droite <= dg.largeur + 1, dg);
  await L.capture(c, O.CAP + `F-engrand-${tag}.png`);
  console.log('err', c.err.length, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
