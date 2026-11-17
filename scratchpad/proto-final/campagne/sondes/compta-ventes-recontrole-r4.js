// Recontrôle adverse « compta-ventes », R4 (17 novembre 2026) : la TVA proposée à une facture faite à la main selon le client choisi (particulier / professionnel),
// et ce que la fiche en dit. Une facture à un particulier ne doit pas partir au taux d'un professionnel sans que la personne l'ait choisi.
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', qui: 'marc' }), p = c.p;
  await X.compta(c, 'fventes', { cat: 'ventes' }); await L.toucher(c, '[data-cx="nouveau"]'); await L.toucher(c, '#calque [data-cx="facture"]');
  const cl = await p.evaluate(() => [...document.getElementById('nf-c').options].filter(o => o.value).map(o => ({ v: o.value, t: o.textContent, type: CLIENTS[o.value] && CLIENTS[o.value].type })));
  console.log('  clients :', JSON.stringify(cl.map(x => [x.t, x.type])));
  const part = cl.find(x => x.type === 'part'), pro = cl.find(x => x.type === 'pro');
  L.v('population : un client particulier et un professionnel', !!part && !!pro, cl.length);
  for (const [nom, k] of [['particulier', part], ['professionnel', pro]]) {
    await p.selectOption('#nf-c', k.v); await L.calme(p, 200);
    const tva = await p.evaluate(() => document.getElementById('nf-t').value);
    console.log(`  ${nom} (${k.t}) → TVA proposée : ${tva} %`);
    if (nom === 'particulier') L.v('R4-1 · pour un particulier, la TVA proposée n’est pas celle d’un professionnel (10 % : logement de plus de 2 ans) OU la fenêtre dit de la vérifier', tva !== '20' || /particulier|vérifi/i.test(await X.panneau(p).then(t => t.replace(/[\s\S]*TVA/, 'TVA'))), tva);
  }
  await p.selectOption('#nf-c', part.v); await X.saisir(c, '#nf-d', 'Entretien chaudière'); await X.saisir(c, '#nf-p', '100');
  await L.capture(c, X.CAP + 'r4-formulaire-particulier.png');
  await L.toucher(c, '#calque [data-cx="factureok"]'); await L.calme(p, 600);
  const t = await X.texte(p, '#contenu'); const m = t.match(/TVA[^\n]*\n?[^\n]*/g);
  console.log('  fiche :', JSON.stringify(m && m.slice(0, 4)));
  L.v('R4-2 · la fiche ne dit pas « client professionnel » pour un client particulier', !(/client professionnel/.test(t) && part.type === 'part'), m);
  await L.capture(c, X.CAP + 'r4-fiche-particulier.png');
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
