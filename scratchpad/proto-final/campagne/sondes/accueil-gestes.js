// Touche chaque geste recensé de l'écran donné. node accueil-gestes.js <profil> <qui> <vue> [nuit]
const O = require('./accueil-outils.js'), L = O.L, fs = require('fs');
(async () => {
  const [profil, qui, vue, nuit] = [process.argv[2] || 'mac', process.argv[3] || 'marc', process.argv[4] || 'accueil', process.argv[5] === 'nuit'];
  const c = await L.ouvrir({ profil, qui, nuit });
  const REINIT = { statistiques: "stPer='mois'; stK=ST_FIN; stFiltreTech='tout';", historique: "hQui='tous';hType='tous';hCli='tous';hCherche='';hMax=14;hJourSel='tous';hOuverts=new Set([AUJ]);" };
  const r = await O.toutToucher(c, vue, { reinit: REINIT[vue] });
  r.forEach(s => console.log(O.ligne(s)));
  console.log('\nTOUCHÉS', r.filter(s => s.ok).length, '/', r.length, ' ERR', JSON.stringify(c.err.slice(0, 5)));
  fs.writeFileSync(`/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-accueil/gestes-${vue}-${profil}-${qui}.json`, JSON.stringify(r, null, 1));
  await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); process.exit(1); });
