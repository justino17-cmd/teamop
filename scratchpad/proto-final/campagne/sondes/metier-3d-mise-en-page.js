// Campagne « métiers » : la mise en page des trois écrans du métier 3D (et du registre vu par la technicienne), sur cinq profils, jour ET nuit :
// aucun glissement latéral (contre la largeur POSÉE du profil), cibles au doigt ≥ 44 px, champs ≥ 16 px, une capture de la fenêtre visible par écran
// (à REGARDER : une sonde verte ne voit pas tout). Usage : node metier-3d-mise-en-page.js [profils séparés par des virgules]
const O = require('./metier-3d-outils.js'), L = O.L;
const PROFILS = (process.argv[2] || 'mac,ipad,iphone,android,petit').split(',');
let ok = 0, ko = 0; const notes = [];
const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
(async () => {
  let ecrans = 0;
  for (const profil of PROFILS) for (const nuit of [false, true]) for (const [qui, routes] of [['marc', ['registre', 'carteBox', 'devisXylo']], ['sm', ['registre']]]) {
    const c = await O.ouvrir({ profil, nuit, qui, packs: O.METIERS.d3 });
    for (const r of routes) {
      await c.p.evaluate(x => aller(x), r); await L.calme(c.p, 900); ecrans++;
      const nom = `${profil}-${nuit ? 'nuit' : 'jour'}-${qui}-${r}`, e = await O.lire(c.p);
      v(nom + ' : l\'écran est celui qu\'on a demandé', !!e.h1 && e.route === r, 'route=' + e.route + ' h1=' + e.h1);
      const d = await L.deborde(c); v(nom + ' : aucun glissement latéral', d.bouge === 0 && d.seconde <= c.largeur + 1, JSON.stringify(d));
      if (c.doigt) { const t = await L.doigts(c.p, '#contenu'); const pt = (t.petits || []), ch = (t.champs || []);
        v(nom + ' : cibles au doigt ≥ 44 px', pt.length === 0, pt.slice(0, 6).join(' | ')); v(nom + ' : champs ≥ 16 px', ch.length === 0, ch.slice(0, 4).join(' | ')); }
      await L.capture(c, O.CAP + 'mep-' + nom + '.png');
    }
    v(`${profil} ${nuit ? 'nuit' : 'jour'} ${qui} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2).join(' // '));
    await L.fin(c);
  }
  notes.push(ecrans + ' écrans mesurés et capturés dans ' + O.CAP);
  await L.fermer(); process.exit(O.bilan('metier-3d-mise-en-page', ok, ko, notes));
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });
