// RECONTRÔLE : copie du balayage du correcteur, avec NUIT=1 et LOT=<nom> pour ranger la sortie. Même méthode, mêmes gestes.
// Balayage « Interventions » : chaque élément qui répond d'un écran est touché dans une page NEUVE, et on dit ce que le geste a fait.
// usage : node interventions-balayage.js <profil> <qui:route[:préparation]>…   (un seul navigateur pour toute la série)
// Même méthode que taches-absences-balayage.js (recensement depuis le DOM), avec plusieurs écrans par lancement : le navigateur
// est la ressource rare de la machine (quatre places au plus), autant n'en prendre qu'une.
const I = require('./interventions-outils.js'), L = I.L, fs = require('fs');
(async () => {
  const profil = process.argv[2] || 'mac', specs = process.argv.slice(3);
  const nuit = process.env.NUIT === '1'; const c = await L.ouvrir({ profil, nuit, qui: specs[0].split(':')[0], hash: 'accueil' }); const sorties = {};
  for (const s of specs) {
    const [qui, route, prep] = s.split(':'); const nom = `${qui}-${profil}-${route}`;
    if (qui !== specs[0].split(':')[0]) { try { await c.p.evaluate(q => { location.search = '?app=1&auto=' + q; }, qui); await c.p.waitForTimeout(1500); } catch (e) {} }
    const prepare = async () => { await I.neuf(c, route); if (prep) { await c.p.evaluate(prep); await L.calme(c.p, 400); } };
    await prepare(); const liste = await I.marquer(c.p, '#contenu'); console.log(`\n== ${nom} : ${liste.length} gestes recensés`); const lignes = [];
    for (const g of liste) {
      await prepare(); await I.marquer(c.p, '#contenu'); const avant = await I.lire(c.p);
      const ok = await L.toucher(c, `[data-sonde="${g.i}"]`, { delai: 3500 }); const apres = await I.lire(c.p); const d = I.diff(avant, apres);
      lignes.push({ i: g.i, lib: g.lib, data: g.data, touche: ok, change: d, h1: apres.h1, panneau: apres.panneau, hash: apres.hash, toast: apres.toast, sansNom: g.sansNom, l: g.l, h: g.h });
      console.log(`${String(g.i).padStart(2)} ${ok ? 'T' : '✗'} ${(g.lib || '(sans nom)').slice(0, 44).padEnd(44)} ${g.data.slice(0, 30).padEnd(30)} → ${d.length ? d.join(',') : 'RIEN'} ${apres.panneau ? '[P:' + apres.panneau.slice(0, 40) + ']' : ''} ${apres.toast ? '[T:' + apres.toast.slice(0, 50) + ']' : ''}${apres.hash !== avant.hash ? ' #' + apres.hash : ''}`);
    }
    sorties[nom] = { recenses: liste.length, touches: lignes.filter(l => l.touche).length, lignes };
  }
  console.log('err', c.err.length, c.err.slice(0, 5));
  fs.writeFileSync(`${__dirname}/../balayage-interv-rc-${profil}${nuit ? '-nuit' : ''}-${process.env.LOT || 'a'}.json`, JSON.stringify({ profil, sorties, err: c.err }, null, 1));
  await L.fin(c); await L.fermer();
})();
