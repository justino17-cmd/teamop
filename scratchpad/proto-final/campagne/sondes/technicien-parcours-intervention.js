// Du bout de Ma journée à la fiche d'une intervention et retour (campagne du 17 novembre 2026) : « Commencer », le rappel « Tu n'as pas commencé ta journée »
// et son bouton, « Retour », le retour du navigateur, l'itinéraire. Usage : node technicien-parcours-intervention.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, s);
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = nuit ? 'nuit' : 'jour';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'majournee' }), p = c.p;
  const toast = () => p.evaluate(() => { const e = document.getElementById('toast'); return e ? e.textContent.trim() : ''; });
  await L.aller(p, 'majournee');
  await L.toucher(c, '[data-rl="go|inter-x-i2"]'); await L.calme(p, 600);
  v('I1 « Commencer » ouvre la fiche « Mise en service pompe à chaleur »', /Mise en service/.test(await txt(p, '#contenu h1')), await txt(p, '#contenu h1'));
  v('I2 le rappel « Tu n’as pas commencé ta journée » est dit, avec le geste pour le faire', /pas commencé ta journée/.test(await toast()) && /Commencer/.test(await toast()), await toast());
  const retour = await p.evaluate(() => { const b = [...document.querySelectorAll('#contenu button, #contenu a')].find(x => /Retour/.test(x.textContent)); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
  console.log('   bouton de retour :', retour);
  v('I3 le bouton « Retour » nomme l’écran d’où l’on vient (« Ma journée »)', /Ma journée|Journée/.test(retour), retour);
  await L.capture(c, CAP + `intervention-i2-${profil}-${J}.png`, true);
  const d = await L.deborde(c); v('I4 fiche : pas de glissement latéral', d.bouge === 0, d);
  const g = await L.gestes(p, '#contenu'); console.log('   gestes de la fiche :', g.length, JSON.stringify(g.slice(0, 30).map(x => x.lib.slice(0, 28))));
  v('I5 la fiche propose des gestes (population non vide)', g.length >= 5, g.length);
  const nom = g.filter(x => x.sansNom); v('I6 aucun bouton sans nom', nom.length === 0, nom);
  if (retour) { await p.evaluate(() => { const b = [...document.querySelectorAll('#contenu button, #contenu a')].find(x => /Retour/.test(x.textContent)); b && b.click(); }); await L.calme(p, 500);
    v('I7 « Retour » ramène à Ma journée', /Bonjour/.test(await txt(p, '#contenu h1')), await txt(p, '#contenu h1')); }
  // retour du navigateur
  await L.toucher(c, '[data-rl="go|inter-x-i2"]'); await L.calme(p, 500);
  await p.goBack(); await L.calme(p, 600);
  v('I8 le retour du navigateur ramène à Ma journée (et non à la page d’avant l’application)', /Bonjour/.test(await txt(p, '#contenu h1')), { h: await p.evaluate(() => location.hash), h1: await txt(p, '#contenu h1') });
  // le geste du rappel : « Commencer à 10:40 » dans le message
  await L.toucher(c, '[data-rl="go|inter-x-i2"]'); await L.calme(p, 400);
  const bt = await p.$('#toast button'); v('I9 le message du rappel porte un bouton', !!bt);
  if (bt) { await bt.click(); await L.calme(p, 500); console.log('   après le bouton du rappel : toast =', await toast());
    v('I10 le bouton du rappel commence la journée', await p.evaluate(() => !!(PTX && Object.keys(PTX.debut || PTX.jours || {}).length) ) || /Commencée|commenc/.test(await toast()), await toast()); }
  v('Z aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  // lien direct vers une intervention (notification, favori, adresse envoyée par le bureau) : « Retour » ramène-t-il sans message d'erreur ?
  await L.fin(c);
  const c2 = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'inter-x-i2' }), p2 = c2.p; await L.calme(p2, 600);
  const t2 = () => p2.evaluate(() => { const e = document.getElementById('toast'); return e ? e.textContent.trim() : ''; });
  v('I11a l’adresse directe #inter-x-i2 ouvre la fiche', /Mise en service/.test(await txt(p2, '#contenu h1')), await txt(p2, '#contenu h1'));
  await p2.evaluate(() => { const b = document.querySelector('[data-retour]'); b && b.click(); }); await L.calme(p2, 600);
  console.log('   « Retour » depuis une adresse directe : écran =', await txt(p2, '#contenu h1'), '| message =', await t2());
  v('I11b « Retour » depuis une adresse directe ramène à Ma journée (technicien-07)', /Bonjour/.test(await txt(p2, '#contenu h1')), await txt(p2, '#contenu h1'));
  v('I11c et ne dit pas « Cette page n’est pas dans ton espace » (technicien-07)', !/n’est pas dans ton espace/.test(await t2()), await t2());
  v('Z2 aucune erreur de page', c2.err.length === 0, c2.err.slice(0, 3));
  await L.fin(c2); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
