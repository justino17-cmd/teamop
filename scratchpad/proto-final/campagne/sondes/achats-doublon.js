// Le doublon de note de frais (campagne du 17 novembre 2026) : même personne, même jour, même montant → « une note de 12,50 € existe déjà : c'est la même ? ».
// Joué à l'identique sur ordinateur ET au doigt : le premier passage de la sonde des notes l'a vu tomber sur iPhone seulement.
// Usage : node achats-doublon.js [profil=iphone]
const { L, PNG, toast, panneau } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'iphone';
  const c = await L.ouvrir({ profil, qui: 'sm', hash: 'techfrais' }), p = c.p, E = (f, a) => p.evaluate(f, a), clic = s => L.toucher(c, s);
  const nb = () => E(() => NDF.length);
  const noteA = async () => { await clic('[data-rl="ndf"]'); await L.calme(p, 300); await p.selectOption('#rn-o', 'Carburant'); await p.fill('#rn-pr', 'station Leclerc, Aytré'); await p.fill('#rn-m', '12,50');
    await p.setInputFiles('#rn-p', { name: 'ticket.png', mimeType: 'image/png', buffer: PNG }); await L.calme(p, 200); await clic('[data-rl="ndfok"]'); await L.calme(p, 400); };
  const n0 = await nb(); await noteA(); v('DB1 la première note de 12,50 € est créée', (await nb()) === n0 + 1, { n0, n1: await nb(), msg: await toast(p) });
  const infos = await E(() => ({ d: NDF[0].d, qui: NDF[0].qui, ttc: NDF[0].ttc, AUJ }));
  console.log('   première note :', JSON.stringify(infos));
  await clic('[data-rl="ndf"]'); await L.calme(p, 300);
  console.log('   2e formulaire : nature =', await E(() => document.getElementById('rn-o').value), '| date =', await E(() => (document.getElementById('rn-d') || {}).value), '| km masqué =', await E(() => document.getElementById('rn-kms').hidden));
  await p.selectOption('#rn-o', 'Carburant'); await p.fill('#rn-m', '12,50'); await clic('[data-rl="ndfok"]'); await L.calme(p, 400);   // rien n'est choisi d'avance : la personne choisit « Carburant »
  const dbl = await E(() => { const z = document.getElementById('rn-dbl'); return z && !z.hidden ? z.textContent.replace(/\s+/g, ' ').trim() : ''; });
  v('DB2 même montant, même jour : « existe déjà, c’est la même ? »', /existe déjà/.test(dbl), { dbl, n: await nb(), msg: await toast(p) });
  v('DB3 rien n’est créé tant qu’on n’a pas répondu', (await nb()) === n0 + 1, { n: await nb(), n0 });
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
