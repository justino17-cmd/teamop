// Mise en page « compta-ventes » : chaque écran de la Comptabilité côté ventes, sur un profil, jour ET nuit — débordement latéral (contre la largeur du profil),
// cibles au doigt, champs sous 16 px, textes écrasés, et des CAPTURES à regarder (outil Read), ordinateur et téléphone.
// usage : node compta-ventes-mise-en-page.js <profil> [qui] [jour|nuit|les-deux]     « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
const ECRANS = [
  ['ensemble', 'ensemble', null, null], ['dossiers', 'dossiers', null, null], ['fventes', 'fventes', 'ventes', null], ['fventes-retard', 'fventes', 'ventes', 'retard'],
  ['clients', 'clients', null, null], ['contrats', 'contrats', null, null], ['paiements', 'paiements', null, null], ['caisse', 'caisse', null, null]];
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc', modes = (process.argv[4] || 'les-deux') === 'les-deux' ? [false, true] : [process.argv[4] === 'nuit'];
  for (const nuit of modes) {
    const c = await L.ouvrir({ profil, qui, nuit }), p = c.p, tag = `${qui}-${profil}-${nuit ? 'nuit' : 'jour'}`;
    for (const [nom, onglet, cat, st] of ECRANS) {
      await X.compta(c, onglet, { cat, st }); await p.waitForTimeout(700);
      const dep = await L.deborde(c); L.v(`${tag} · ${nom} : aucun glissement latéral`, !dep.bouge, dep);
      if (c.doigt) { const d = await L.doigts(p, '#contenu'); L.v(`${tag} · ${nom} : cibles au doigt ≥ 44 px (${d.petits.length} sous le seuil)`, d.petits.length === 0, d.petits.slice(0, 6));
        L.v(`${tag} · ${nom} : champs ≥ 16 px`, d.champs.length === 0, d.champs.slice(0, 4)); L.v(`${tag} · ${nom} : aucun texte écrasé`, d.ecrases.length === 0, d.ecrases.slice(0, 3)); }
      const sansNom = (await X.marquer(p, '#contenu')).filter(g => g.sansNom); L.v(`${tag} · ${nom} : chaque geste a un nom`, sansNom.length === 0, sansNom.slice(0, 4).map(g => g.data));
      await L.capture(c, X.CAP + `mep-${tag}-${nom}.png`);
    }
    // une fiche facture, un panneau, un formulaire
    for (const [nom, fn] of [['fiche-f128', () => X.fiche(c, 'f128')], ['fiche-f145', () => X.fiche(c, 'f145')]]) { await fn(); await p.waitForTimeout(500);
      const dep = await L.deborde(c); L.v(`${tag} · ${nom} : aucun glissement latéral`, !dep.bouge, dep);
      if (c.doigt) { const d = await L.doigts(p, '#contenu'); L.v(`${tag} · ${nom} : cibles ≥ 44 px (${d.petits.length})`, d.petits.length === 0, d.petits.slice(0, 6)); L.v(`${tag} · ${nom} : champs ≥ 16 px`, d.champs.length === 0, d.champs.slice(0, 4)); }
      await L.capture(c, X.CAP + `mep-${tag}-${nom}.png`); }
    await X.fiche(c, 'f128'); await L.toucher(c, '[data-action="partiel"]'); await p.waitForTimeout(400);
    if (c.doigt) { const d = await L.doigts(p, '#calque'); L.v(`${tag} · fenêtre paiement en partie : champs ≥ 16 px, cibles ≥ 44 px`, d.champs.length === 0 && d.petits.length === 0, d); }
    await L.capture(c, X.CAP + `mep-${tag}-partiel.png`); await L.ranger(p);
    await X.compta(c, 'fventes', { cat: 'ventes' }); await L.toucher(c, '[data-cx="nouveau"]'); await L.toucher(c, '#calque [data-cx="facture"]'); await p.waitForTimeout(400);
    if (c.doigt) { const d = await L.doigts(p, '#calque'); L.v(`${tag} · formulaire nouvelle facture : champs ≥ 16 px, cibles ≥ 44 px`, d.champs.length === 0 && d.petits.length === 0, d); }
    const dep2 = await L.deborde(c); L.v(`${tag} · formulaire nouvelle facture : aucun glissement latéral`, !dep2.bouge, dep2);
    await L.capture(c, X.CAP + `mep-${tag}-nouvelle-facture.png`);
    L.v(`${tag} · aucune erreur de page`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
