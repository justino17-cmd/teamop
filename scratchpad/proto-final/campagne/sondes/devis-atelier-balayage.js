// Balaie CHAQUE élément qui répond des écrans « Devis » : page neuve, un geste, ce qu'il a fait. Copie de contrats-balayage.js,
// avec plusieurs écrans dans UN navigateur. usage : node devis-atelier-balayage.js <profil> <qui> <lot>
// lots : liste | fiches-a | fiches-b | panneaux
const O = require('./devis-atelier-outils.js'), L = O.L, fs = require('fs');
const LOTS = {
  liste: [['devis', '', 'liste'], ['devis', 'dvFiltre="attente"; rendre()', 'liste-attente'], ['devis', 'dvFiltre="accepte"; rendre()', 'liste-acceptes'], ['devis', 'dvFiltre="perdu"; rendre()', 'liste-perdus'], ['devis', 'dvFiltre="tous"; rendre()', 'liste-tous']],
  'fiches-a': [['devis-x-BR1', '', 'fiche-brouillon'], ['devis-x-D-2026-031', '', 'fiche-attente-031'], ['devis-x-D-2026-038', '', 'fiche-attente-038']],
  'fiches-b': [['devis-x-D-2026-034', '', 'fiche-accepte-034'], ['devis-x-D-2026-040', '', 'fiche-accepte-040'], ['devis-x-D-2026-036', '', 'fiche-refuse-036'], ['devis-x-D-2026-027', '', 'fiche-expire-027']],
  panneaux: [['devis', 'dvNouveau()', 'rapide', '#calque'], ['devis', 'dvDicter()', 'dicter', '#calque'], ['devis-x-D-2026-031', 'dvClient(DEVIS_REG["D-2026-031"])', 'client-voit', '#calque'], ['devis-x-D-2026-031', 'dvReponse(DEVIS_REG["D-2026-031"])', 'reponse', '#calque'], ['devis-x-D-2026-031', 'dvRelancer(DEVIS_REG["D-2026-031"])', 'relancer', '#calque']]
};
(async () => {
  const [profil, qui, lot] = [process.argv[2] || 'mac', process.argv[3] || 'marc', process.argv[4] || 'liste'];
  const c = await L.ouvrir({ profil, qui, hash: 'devis' }); let tot = 0, rien = 0; const sortie = [];
  for (const [route, prep, etiq, zone] of LOTS[lot]) {
    const prepare = async () => { await O.neuf(c, route); if (prep) { await c.p.evaluate(prep); await L.calme(c.p, 400); } };
    await prepare(); const liste = await O.marquer(c.p, zone || '#contenu'); console.log(`${qui}/${profil}/${etiq} : ${liste.length} gestes recensés`);
    for (const g of liste) {
      await prepare(); await O.marquer(c.p, zone || '#contenu'); const avant = await O.lire(c.p);
      const ok = await L.toucher(c, `[data-sonde="${g.i}"]`, { delai: 3500 }); const apres = await O.lire(c.p); const d = O.diff(avant, apres);
      const l = { etiq, i: g.i, lib: g.lib, data: g.data, touche: ok, change: d, h1: apres.h1, panneau: apres.panneau, hash: apres.hash, toast: apres.toast, atelier: apres.atelier, sansNom: g.sansNom, l: g.l, h: g.h };
      sortie.push(l); tot++; if (ok && !d.length) rien++;
      console.log(`${String(g.i).padStart(2)} ${ok ? 'T' : '✗'} ${(g.lib || '(sans nom)').slice(0, 44).padEnd(44)} ${g.data.slice(0, 30).padEnd(30)} → ${d.length ? d.join(',') : 'RIEN'} ${apres.panneau ? '[P:' + apres.panneau.slice(0, 40) + ']' : ''} ${apres.toast ? '[T:' + apres.toast.slice(0, 50) + ']' : ''} ${apres.h1 !== avant.h1 ? '[H1:' + apres.h1 + ']' : ''}`);
    }
  }
  console.log(`== ${tot} touchés · ${rien} sans effet visible · err ${c.err.length}`, c.err.slice(0, 3));
  fs.writeFileSync(O.CAP + `balayage-${qui}-${profil}-${lot}.json`, JSON.stringify({ profil, qui, lot, sortie, err: c.err }, null, 1));
  await L.fin(c); await L.fermer();
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
