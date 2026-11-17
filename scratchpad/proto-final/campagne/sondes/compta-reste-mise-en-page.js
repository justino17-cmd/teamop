// Mise en page « compta-reste » : chaque onglet de ma partie, sur chaque profil, jour et nuit — débordement (contre la largeur du profil),
// cibles au doigt, champs sous 16 px, textes écrasés. Captures dans le dossier temporaire (à REGARDER). Écrit campagne/mise-en-page-compta-reste-<profil>.json
// usage : node compta-reste-mise-en-page.js <profil> [jour|nuit|les-deux] [onglets séparés par des virgules]
const X = require('./compta-reste-outils.js'), L = X.L, fs = require('fs');
(async () => {
  const profil = process.argv[2] || 'iphone', modes = process.argv[3] === 'jour' ? [false] : process.argv[3] === 'nuit' ? [true] : [false, true];
  const liste = process.argv[4] ? X.ONGLETS.filter(o => process.argv[4].split(',').includes(o[0])) : X.ONGLETS; const sortie = [];
  for (const nuit of modes) {
    const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
    for (const [o, nom] of liste) {
      await X.compta(c, o); await L.calme(c.p, 500);
      const dep = await L.deborde(c), dg = c.doigt ? await X.doigtsReel(p) : await L.doigts(p), pop = (await L.gestes(p, '#contenu')).length;
      const sansNom = (await L.gestes(p, '#contenu')).filter(g => g.sansNom).length;
      const ligne = { onglet: o, nom, nuit, profil, gestes: pop, debordeDe: dep.bouge, coupable: dep.coupable, petits: c.doigt ? dg : dg.petits, champs: c.doigt ? [] : dg.champs, ecrases: c.doigt ? [] : dg.ecrases, sansNom };
      if (c.doigt) { const d2 = await L.doigts(p); ligne.champs = d2.champs; ligne.ecrases = d2.ecrases; }
      sortie.push(ligne); console.log(`${nuit ? 'nuit' : 'jour'} ${profil} ${o.padEnd(12)} glisse=${dep.bouge} petits=${ligne.petits.length} champs=${ligne.champs.length} écrasés=${ligne.ecrases.length} sansNom=${sansNom} gestes=${pop}`);
      await L.capture(c, X.CAP + `mep-${profil}-${nuit ? 'nuit' : 'jour'}-${o}.png`);
    }
    console.log('erreurs', c.err.slice(0, 3)); await L.fin(c);
  }
  fs.writeFileSync(`${__dirname}/../mise-en-page-compta-reste-${profil}.json`, JSON.stringify(sortie, null, 1));
  await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
