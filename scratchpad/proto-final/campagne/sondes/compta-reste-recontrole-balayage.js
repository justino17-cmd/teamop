// Balayage « compta-reste » : chaque élément qui répond d'un écran de la Comptabilité est touché dans une page NEUVE, et on dit ce que le geste a fait.
// usage : node compta-ventes-balayage.js <profil> <qui@@étiquette@@route@@préparation>…   (un seul navigateur pour toute la série)
// Même méthode que interventions-balayage.js (recensement depuis le DOM) ; la préparation range l'onglet voulu de la Comptabilité.
const O = require('./taches-absences-outils.js'), L = O.L, fs = require('fs');
(async () => {
  const profil = process.argv[2] || 'mac', specs = process.argv.slice(3);
  const c = await L.ouvrir({ profil, nuit: process.env.NUIT === '1', qui: specs[0].split('@@')[0], hash: 'accueil' }); const sorties = {};
  for (const s of specs) {
    const [qui, etiq, route, prep] = s.split('@@'); const nom = `${qui}-${profil}-${etiq}`;
    if (qui !== specs[0].split('@@')[0]) { try { await c.p.evaluate(q => { location.search = '?app=1&auto=' + q; }, qui); await c.p.waitForTimeout(1500); } catch (e) {} }
    const prepare = async () => { await O.neuf(c, route); if (prep) { await c.p.evaluate(prep); await L.calme(c.p, 400); } };
    await prepare(); const liste = await O.marquer(c.p, '#contenu'); console.log(`\n== ${nom} : ${liste.length} gestes recensés`); const lignes = [];
    for (const g of liste) {
      await prepare(); await O.marquer(c.p, '#contenu'); const avant = await O.lire(c.p);
      const ok = await L.toucher(c, `[data-sonde="${g.i}"]`, { delai: 3500 }); const apres = await O.lire(c.p); const d = O.diff(avant, apres);
      lignes.push({ i: g.i, lib: g.lib, data: g.data, touche: ok, change: d, h1: apres.h1, panneau: apres.panneau, hash: apres.hash, toast: apres.toast, sansNom: g.sansNom, l: g.l, h: g.h });
      console.log(`${String(g.i).padStart(2)} ${ok ? 'T' : '✗'} ${(g.lib || '(sans nom)').slice(0, 44).padEnd(44)} ${g.data.slice(0, 30).padEnd(30)} → ${d.length ? d.join(',') : 'RIEN'} ${apres.panneau ? '[P:' + apres.panneau.slice(0, 40) + ']' : ''} ${apres.toast ? '[T:' + apres.toast.slice(0, 50) + ']' : ''}${apres.hash !== avant.hash ? ' #' + apres.hash : ''}`);
    }
    sorties[nom] = { recenses: liste.length, touches: lignes.filter(l => l.touche).length, lignes };
  }
  console.log('err', c.err.length, c.err.slice(0, 5));
  fs.writeFileSync(`/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-compta-reste/rc-balayage-${process.env.NUIT === '1' ? 'nuit-' : ''}${(specs[0].split("@@")[0])}-${profil}-${process.env.GROUPE || "tout"}.json`, JSON.stringify({ profil, sorties, err: c.err }, null, 1));
  await L.fin(c); await L.fermer();
})();
