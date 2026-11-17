// Matériel, étape 2 (Stock) — LE MÊME NOMBRE PARTOUT : « à commander » (tuile de Stock, compteur de Commandes, règle cmdNbACommander) et « camions à remplir »
// (tuile de Stock, camionsARemplir) ; un camion au garage n'est compté nulle part ; et la tuile suit le monde (un article de plus en panier = un de plus).
// Usage : node materiel-stock-coherence.js → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, c = await L.ouvrir({ profil:'mac', qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a);
  await L.aller(p, 'stock');
  const tuiles = () => R(() => [...document.querySelectorAll('.ms-kpis .kpi b')].map(e => Number(e.textContent)));
  const t0 = await tuiles(), reg = await R(() => ({ cmd:cmdNbACommander(), cam:camionsARemplir().n, liv:COMMANDES.filter(cmdOuverte).length }));
  v('population : trois tuiles (' + t0.join(' · ') + ') et trois règles (' + JSON.stringify(reg) + ')', t0.length === 3 && reg.cmd > 0 && reg.cam > 0 && reg.liv > 0);
  v('tuile « à commander » = cmdNbACommander() (' + t0[0] + ' = ' + reg.cmd + ')', t0[0] === reg.cmd);
  v('tuile « livraisons attendues » = les commandes envoyées, confirmées ou partielles (' + t0[1] + ' = ' + reg.liv + ')', t0[1] === reg.liv);
  v('tuile « manquent dans les camions » = camionsARemplir().n (' + t0[2] + ' = ' + reg.cam + ')', t0[2] === reg.cam);
  // un camion au garage n'est pas compté : on y met un manque, puis on l'envoie au garage
  const g = await R(() => { const v1 = LIEUX.find(l => l.type === 'vehicule' && bxManques(l.id).length && !bxGarage(l.id)); const av = camionsARemplir().n; const veh = bxVeh(v1.id); const st = veh.statut; veh.statut = 'garage'; const ap = camionsARemplir().n, n = bxManques(v1.id).length; veh.statut = st; return { av, ap, n, nom:v1.nom }; });
  v('un camion au garage sort du compte (' + g.av + ' → ' + g.ap + ' : ses ' + g.n + ' articles ne comptent plus)', g.av - g.ap === g.n && g.n > 0, g);
  // la tuile suit : un article de plus en panier = un de plus ; la tuile de Dépôts dit la même chose (Dépôts n'est pas dans ce lot : on relit la règle)
  const pid = await R(() => { const x = PRODUITS.find(o => !o.retire && !aCommander().includes(o) && o.seuil > 0 && enCommande(o) === 0); const q = x.q; x.q = 0; rendre(); window.__q = [x, q]; return x.id; });
  await L.calme(p, 400); const t1 = await tuiles();
  v('un article qui tombe à zéro ajoute UNE ligne à la tuile « à commander » (' + t0[0] + ' → ' + t1[0] + ')', t1[0] === t0[0] + 1, [pid, t0, t1]);
  await R(() => { const [x, q] = window.__q; x.q = q; rendre(); });
  // les mêmes mots, la même règle : la couleur dit si quelque chose attend, le vert dit « rien à faire »
  // cmdNbACommander est une constante : on rejoue la VRAIE fonction msTuiles avec « rien à commander », « aucune livraison », « camions prêts »
  await R(() => { const src = msTuiles.toString().replace('cmdNbACommander()', '0').replace('COMMANDES.filter(cmdOuverte)', '[]').replace('camionsARemplir().n', '0'); window.__sv = msTuiles; msTuiles = new Function('return ' + src)(); rendre(); });
  await L.calme(p, 400);
  const z = await R(() => [...document.querySelectorAll('.ms-kpis .kpi')].map(e => ({ n:e.querySelector('b').textContent, c:getComputedStyle(e.querySelector('b')).color, t:e.querySelector('span').textContent })));
  v('à zéro, chaque tuile dit « rien à … » en vert', z.length === 3 && z.every(x => x.n === '0') && /rien à commander/.test(z[0].t) && /aucune livraison/.test(z[1].t) && /camions sont prêts/.test(z[2].t.replace(/ /g, ' ')), z);
  const vert = await R(() => getComputedStyle(document.documentElement).getPropertyValue('--vert').trim());
  v('… et leur chiffre n\'est pas orange (la couleur dit « en règle »)', z.every(x => !/^rgb\(2[0-9]{2}, (1[0-9]{2}|9[0-9]), ?[0-9]{1,2}\)$/.test(x.c)), z.map(x => x.c));
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
