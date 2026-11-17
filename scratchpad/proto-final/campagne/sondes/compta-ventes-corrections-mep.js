// Mise en page des ÉCRANS CORRIGÉS de « compta-ventes » (17 novembre 2026) : l'éditeur de lignes d'une facture à valider (valeurs LONGUES), la fenêtre
// « Annuler cette facture par un avoir », la fiche d'une facture annulée, la relance avec son lien, le formulaire de nouvelle facture, et le cadre
// Comptabilité au doigt. Débordement contre la largeur du profil, cibles ≥ 44 px, champs ≥ 16 px, captures à REGARDER, jour ET nuit.
// usage : node compta-ventes-corrections-mep.js <profil> [jour|nuit|les-deux]     « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', modes = (process.argv[3] || 'les-deux') === 'les-deux' ? [false, true] : [process.argv[3] === 'nuit'];
  for (const nuit of modes) {
    const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p, tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
    // 1. une facture à valider aux valeurs les plus longues plausibles
    const id = await p.evaluate(() => { const id = 'fmep'; FACTURES.unshift({ id, num:'—', cli:'vp', objet:'Mise en service', lignes:[{ d:'Mise en service d’une pompe à chaleur air-eau avec groupe extérieur, kit hydraulique et appoint électrique 9 kW', q:'1', pu:12345.67 }, { d:'Fluide frigorigène R32', q:'250 mL', pu:48.5 }], ht:0, tva:20, st:'avalider', emise:'—', ech:'—' }); return id; });
    await X.fiche(c, id); await L.toucher(c, '[data-action="ligneAjout"]'); await p.waitForTimeout(300);
    await p.locator('[data-fdes="2"]').fill('Déplacement hors zone, deuxième passage avec nacelle et deux techniciens'); await p.locator('[data-fqte="2"]').fill('12 345'); await p.locator('[data-prix="2"]').fill('98 765,43');
    await p.locator('[data-prix="2"]').blur(); await L.calme(p, 400);
    const n = await p.evaluate(() => document.querySelectorAll('#contenu .fac-lgs .dv-lg:not(.dv-lg-t)').length); L.v(`${tag} · population : 3 lignes dans l’éditeur`, n === 3, n);
    const dep = await L.deborde(c); L.v(`${tag} · éditeur de lignes : aucun glissement latéral (valeurs longues)`, !dep.bouge, dep);
    if (c.doigt) { const d = await L.doigts(p, '#contenu'); L.v(`${tag} · éditeur : cibles ≥ 44 px (${d.petits.length} sous le seuil)`, d.petits.length === 0, d.petits.slice(0, 6)); L.v(`${tag} · éditeur : champs ≥ 16 px`, d.champs.length === 0, d.champs.slice(0, 4)); L.v(`${tag} · éditeur : aucun texte écrasé`, d.ecrases.length === 0, d.ecrases.slice(0, 3)); }
    const larg = await p.evaluate(() => [...document.querySelectorAll('#contenu .fac-lgs .dv-lg:not(.dv-lg-t) input')].map(i => Math.round(i.getBoundingClientRect().width)));
    L.v(`${tag} · chaque champ de ligne garde au moins 44 px de large`, larg.every(w => w >= 44), larg);
    await L.capture(c, X.CAP + `corr-${tag}-editeur.png`);
    // 2. une facture envoyée : avoir, annulée, relance
    await X.fiche(c, 'f143'); await L.capture(c, X.CAP + `corr-${tag}-fiche-envoyee.png`);
    await L.toucher(c, '[data-action="relance"]'); await p.waitForTimeout(300);
    const depR = await L.deborde(c); L.v(`${tag} · relance : aucun glissement latéral`, !depR.bouge, depR);
    await L.capture(c, X.CAP + `corr-${tag}-relance.png`); await L.ranger(p);
    await L.toucher(c, '[data-action="avoir"]'); await p.waitForTimeout(300);
    if (c.doigt) { const d = await L.doigts(p, '#calque'); L.v(`${tag} · fenêtre avoir : cibles ≥ 44 px`, d.petits.length === 0, d.petits.slice(0, 4)); }
    const depA = await L.deborde(c); L.v(`${tag} · fenêtre avoir : aucun glissement latéral`, !depA.bouge, depA);
    await L.capture(c, X.CAP + `corr-${tag}-avoir.png`);
    await L.toucher(c, '#calque [data-action="avoirOk"]'); await p.waitForTimeout(500);
    const depF = await L.deborde(c); L.v(`${tag} · fiche annulée : aucun glissement latéral`, !depF.bouge, depF);
    await L.capture(c, X.CAP + `corr-${tag}-annulee.png`);
    // 3. nouvelle facture
    await X.compta(c, 'fventes', { cat: 'ventes' }); await L.toucher(c, '[data-cx="nouveau"]'); await L.toucher(c, '#calque [data-cx="facture"]'); await p.waitForTimeout(400);
    if (c.doigt) { const d = await L.doigts(p, '#calque'); L.v(`${tag} · nouvelle facture : champs ≥ 16 px, cibles ≥ 44 px`, d.champs.length === 0 && d.petits.length === 0, d); }
    await L.capture(c, X.CAP + `corr-${tag}-nouvelle.png`); await L.ranger(p);
    // 4. cibles au doigt des pastilles de la Comptabilité (compta-ventes-14)
    await X.compta(c, 'fventes', { cat: 'ventes' });
    if (c.doigt) { const d = await L.doigts(p, '#contenu'); L.v(`${tag} · pastilles de la Comptabilité : cibles ≥ 44 px (${d.petits.length})`, d.petits.length === 0, d.petits.slice(0, 6)); }
    // 5. le cadre plein écran, au doigt (compta-ventes-21)
    const f = await X.cadreOuvert(c); if (f) { await f.evaluate(() => { try { aller('ventes'); } catch (e) {} }); await p.waitForTimeout(900);
      if (c.doigt) { const d = await L.doigts(f, 'body'); L.v(`${tag} · cadre Ventes : cibles ≥ 44 px (${d.petits.length})`, d.petits.length === 0, d.petits.slice(0, 6)); }
      await L.capture(c, X.CAP + `corr-${tag}-cadre.png`); }
    L.v(`${tag} · aucune erreur de page`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
