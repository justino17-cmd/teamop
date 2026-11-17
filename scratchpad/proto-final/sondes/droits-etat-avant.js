// Photographie du câblage des droits : pour chaque personne de la démonstration, TOUTES les routes connues (vues() + menu) et ce que
// rlPermis en dit, plus son menu, sa barre et son ouverture. Écrit un JSON (argument 1) ; deux photos se comparent (argument 2 = l'autre).
// Sert à PROUVER que le câblage D2 ne change que ce que la spécification dit (Julie neuf lignes, Responsable, terrain) et rien d'autre.
const L = require('../lib.js'), fs = require('fs');
(async () => {
  const sortie = {}, qui = (process.env.QUI || 'marc,julie,sm,kb,lr,tl').split(',');
  for (const k of qui) {
    const c = await L.ouvrir({ profil: 'mac', qui: k });
    sortie[k] = await c.p.evaluate(() => { const R = [...new Set([...Object.keys(vues()), ...CAT_LIGNES.map(x => x.k), 'stockAccepter', 'stockReglages', 'produitsPrixVente'])].sort();
      return { role: ROLE, routes: Object.fromEntries(R.map(r => [r, !!rlPermis(r)])), lignes: rlLignes().map(x => x.k), barre: rlOnglets().map(o => o.k), ouverture: rlOuverture() }; });
    await L.fin(c);
  }
  await L.fermer(); fs.writeFileSync(process.argv[2], JSON.stringify(sortie, null, 1)); console.log('écrit', process.argv[2], Object.keys(sortie).map(k => k + ':' + sortie[k].lignes.length).join(' '));
})().catch(e => { console.error(e); process.exit(1); });
