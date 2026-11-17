// « Paiement en ligne » (Trésorerie › Paiement en ligne, cadre prototype-paiement.html) : est-il relié aux factures d'OP GESTION ? (indice de MENU-FINAL : « n'est pas relié »)
// On regarde ce que le cadre montre (factures, montants, clients), on le compare aux factures d'OP GESTION, et on joue un paiement dans le cadre pour voir s'il arrive.
// usage : node compta-ventes-enligne.js [profil]       « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  await X.compta(c, 'enligne'); await p.waitForTimeout(1500);
  const f = L.cadre(p, /prototype-paiement\.html/);
  L.v('le cadre « Paiement en ligne » s’ouvre dans Trésorerie', !!f, p.frames().map(x => x.url().slice(-40)));
  await L.capture(c, X.CAP + `enligne-${profil}-1.png`);
  if (!f) { await L.fermer(); process.exit(1); }
  const txt = await f.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 1500));
  console.log('texte du cadre :', txt.slice(0, 900));
  const hote = await p.evaluate(() => ({ nums: FACTURES.filter(f => f.num !== '—').map(f => f.num), du: FACTURES.filter(f => ['envoyee', 'retard', 'partielle'].includes(f.st)).map(f => ({ num: f.num, reste: Math.round(restant(f) * 100) / 100, client: CLIENTS[f.cli].nom })) }));
  const nums = (txt.match(/FAC-\d{4}-\d{4}/g) || []);
  L.v('population : le cadre cite des numéros de facture', nums.length > 0, nums.slice(0, 5));
  L.v('compta-ventes-20 · les factures citées dans « Paiement en ligne » sont celles d’OP GESTION (mêmes numéros)', nums.length > 0 && nums.every(n => hote.nums.includes(n)), { cadre: [...new Set(nums)].slice(0, 8), hote: hote.nums });
  const gestes = await L.gestes(f, 'body'); console.log('gestes du cadre :', gestes.length); gestes.slice(0, 25).forEach(g => console.log('  ', g.balise, '|', g.lib, '|', g.data));
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
