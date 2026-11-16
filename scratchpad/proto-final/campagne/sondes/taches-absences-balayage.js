// Balaie CHAQUE élément qui répond d'un écran : page neuve, un geste, ce qu'il a fait.
// usage : node taches-absences-balayage.js <profil> <qui> <route> [préparation JS exécutée dans la page] [étiquette]
const O = require('./taches-absences-outils.js'), L = O.L, fs = require('fs');
(async () => {
  const [profil, qui, route, prep, etiq] = [process.argv[2] || 'mac', process.argv[3] || 'marc', process.argv[4] || 'taches', process.argv[5] || '', process.argv[6] || ''];
  const c = await L.ouvrir({ profil, qui, hash: route }); const lignes = [];
  const prepare = async () => { await O.neuf(c, route); if (prep) { await c.p.evaluate(prep); await L.calme(c.p, 400); } };
  await prepare(); const liste = await O.marquer(c.p, process.argv[7] || '#contenu'); console.log(`${qui}/${profil}/${route} ${etiq} : ${liste.length} gestes recensés`);
  for (const g of liste) {
    await prepare(); await O.marquer(c.p, process.argv[7] || '#contenu'); const avant = await O.lire(c.p);
    const ok = await L.toucher(c, `[data-sonde="${g.i}"]`, { delai: 3500 }); const apres = await O.lire(c.p);
    const d = O.diff(avant, apres); const l = { i: g.i, lib: g.lib, data: g.data, touche: ok, change: d, h1: apres.h1, panneau: apres.panneau, hash: apres.hash, toast: apres.toast, atelier: apres.atelier, compta: apres.compta, sansNom: g.sansNom, l: g.l, h: g.h };
    lignes.push(l); console.log(`${String(g.i).padStart(2)} ${ok ? 'T' : '✗'} ${(g.lib || '(sans nom)').slice(0, 44).padEnd(44)} ${g.data.slice(0, 30).padEnd(30)} → ${d.length ? d.join(',') : 'RIEN'} ${apres.panneau ? '[P:' + apres.panneau.slice(0, 40) + ']' : ''} ${apres.toast ? '[T:' + apres.toast.slice(0, 50) + ']' : ''} ${apres.h1 !== avant.h1 ? '[H1:' + apres.h1 + ']' : ''}`);
  }
  console.log('err', c.err.length, c.err.slice(0, 3));
  fs.writeFileSync(`${__dirname}/../balayage-${qui}-${profil}-${route}${etiq ? '-' + etiq : ''}.json`, JSON.stringify({ profil, qui, route, etiq, lignes, err: c.err }, null, 1));
  await L.fin(c); await L.fermer();
})();
