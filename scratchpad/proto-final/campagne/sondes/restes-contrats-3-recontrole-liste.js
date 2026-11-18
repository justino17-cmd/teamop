// RECONTRÔLE tour 3 : la liste des Contrats (tableau + compteurs) avec les données de départ ET avec des prix à sept chiffres, sur les profils étroits.
// usage : node restes-contrats-3-recontrole-liste.js → « N ✓ · M ✗ » (les ✗ qui restent sont des constats ouverts, voir restes-contrats-tour3-recontrole.json)
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  for (const [profil, nuit] of [['ipad', true], ['iphone', true], ['petit', false]]) for (const grand of [false, true]) {
    const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }), p = c.p; await L.calme(p, 400);
    if (grand) { await p.evaluate(() => { CONTRATS.filter(k => k.st === 'signe').forEach(k => { k.prix = 999999.99; }); }); await L.aller(p, 'accueil'); await L.aller(p, 'contrats'); await L.calme(p, 500); }
    const r = await p.evaluate(() => ({ kp: [...document.querySelectorAll('#contenu .kpis .kpi b')].map(b => ({ t: b.textContent, coupe: b.scrollWidth > b.clientWidth + 1 })),
      th: [...document.querySelectorAll('#contenu table thead th')].map(h => [h.textContent, Math.round(h.getBoundingClientRect().width)]) }));
    const tag = profil + (grand ? ' prix à sept chiffres' : ' données de départ');
    v('population : 4 compteurs (' + tag + ')', r.kp.length === 4, r.kp);
    v('aucun compteur coupé (' + tag + ')', !r.kp.some(k => k.coupe), r.kp.filter(k => k.coupe));
    const cl = r.th.find(h => h[0] === 'Client');
    v('colonne Client du tableau lisible : au moins 100 px ou tableau remplacé par des cartes (' + tag + ')', !!cl && (cl[1] >= 100 || r.th.some(h => h[1] === 0)), r.th);
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
