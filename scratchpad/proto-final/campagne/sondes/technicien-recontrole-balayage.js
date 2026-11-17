// Recontrôle ADVERSE : chaque geste de chaque écran du technicien (corps de page entier : contenu, bouton Menu, barre du bas), touché dans une page NEUVE, jour ou nuit,
// puis comparé au balayage d'avant les corrections (technicien-balayage-<qui>-<profil>-<écran>.json) : un geste qui FAISAIT quelque chose et ne fait plus rien est une casse.
// Usage : node technicien-recontrole-balayage.js <profil> <qui> <nuit=0|1> <routes séparées par des virgules> [préparation]
const O = require('./taches-absences-outils.js'), L = O.L, fs = require('fs'), v = L.v;
(async () => {
  const [profil, qui, nuit, routes] = [process.argv[2] || 'iphone', process.argv[3] || 'sm', process.argv[4] === '1', (process.argv[5] || 'majournee,taches,techfrais,mesheures,moncamion,absences').split(',')];
  const c = await L.ouvrir({ profil, qui, nuit, hash: routes[0] }); const J = nuit ? 'nuit' : 'jour', sortie = {};
  for (const route of routes) {
    await O.neuf(c, route); const liste = await O.marquer(c.p, 'body'); const lignes = [];
    let avant = null; try { avant = JSON.parse(fs.readFileSync(`${__dirname}/../technicien-balayage-${qui}-${profil === 'mac' ? 'mac' : 'iphone'}-${route}.json`, 'utf8')).lignes; } catch (e) {}
    v(`[${profil} ${J} ${qui}] ${route} : population, des gestes recensés`, liste.length >= 3, liste.length);
    for (const g of liste) {
      await O.neuf(c, route); await O.marquer(c.p, 'body'); const av = await O.lire(c.p);
      const ok = await L.toucher(c, `[data-sonde="${g.i}"]`, { delai: 3500 }); const ap = await O.lire(c.p), d = O.diff(av, ap);
      lignes.push({ i: g.i, lib: g.lib, data: g.data, touche: ok, change: d, h1: ap.h1, panneau: ap.panneau, toast: ap.toast, hash: ap.hash, sansNom: g.sansNom, l: g.l, h: g.h }); }
    const rien = lignes.filter(l => l.touche && !l.change.length), nontouche = lignes.filter(l => !l.touche), sansNom = lignes.filter(l => l.sansNom);
    const casse = avant ? lignes.filter(l => { const o = avant.find(x => x.lib === l.lib && x.data === l.data); return o && o.change.length && !l.change.length; }) : [];
    console.log(`   ${route} : ${lignes.length} gestes · ${lignes.filter(l => l.touche).length} touchés · RIEN ${rien.length} · non atteints ${nontouche.length} · sans nom ${sansNom.length}${avant ? ' · comparés à l’avant : ' + lignes.filter(l => avant.find(x => x.lib === l.lib && x.data === l.data)).length + ', casses ' + casse.length : ''}`);
    rien.forEach(l => console.log('      RIEN        ', (l.lib || '(sans nom)').slice(0, 40), '|', l.data.slice(0, 50)));
    nontouche.forEach(l => console.log('      NON ATTEINT ', (l.lib || '(sans nom)').slice(0, 40), '|', l.data.slice(0, 50), `${l.l}×${l.h}`));
    sansNom.forEach(l => console.log('      SANS NOM    ', l.data.slice(0, 60)));
    casse.forEach(l => console.log('      CASSE       ', l.lib.slice(0, 40), '|', l.data.slice(0, 50)));
    v(`[${profil} ${J} ${qui}] ${route} : aucun geste qui faisait quelque chose ne reste muet`, casse.length === 0, casse.map(l => l.lib));
    v(`[${profil} ${J} ${qui}] ${route} : tout geste recensé est atteignable au toucher`, nontouche.length === 0, nontouche.map(l => l.lib).slice(0, 6));
    v(`[${profil} ${J} ${qui}] ${route} : aucun geste sans nom`, sansNom.length === 0, sansNom.map(l => l.data).slice(0, 4));
    sortie[route] = lignes; }
  v(`[${profil} ${J} ${qui}] aucune erreur de page`, c.err.length === 0, c.err.slice(0, 3));
  fs.writeFileSync(`${__dirname}/../technicien-recontrole-balayage-${qui}-${profil}-${J}.json`, JSON.stringify({ profil, qui, nuit, sortie, err: c.err }, null, 1));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
