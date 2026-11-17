// RECONTRÔLE ADVERSE des contrats, parcours R5 : valeurs hostiles dans « Contrat rapide » (prix, lieu de 130 signes sans espace, double appui),
// puis la fiche du contrat créé ne glisse pas de côté (contre la largeur POSÉE du profil).
// usage : node contrats-recontrole-e.js [profil] [nuit]  → « N ✓ · M ✗ »
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); const p = c.p; const larg = c.largeur; await L.calme(p, 400);
  const n = () => p.evaluate(() => CONTRATS.length);
  const essai = async prix => { await L.aller(p, 'contrat-nouveau'); await p.fill('[data-b="prix"]', prix); const n0 = await n(); await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 400); return { cree: (await n()) - n0, toast: (await O.lire(p)).toast }; };
  for (const [prix, attendu] of [['0,4', 0], ['0', 0], ['', 0], ['abc', 0], ['-50', 0], ['1e9', 0], ['99999999', 0]]) { const r = await essai(prix); v(`R5 prix « ${prix} » refusé avec un message`, r.cree === attendu && !!r.toast, r); }
  const ok = await essai('1 200,5'); const k = await p.evaluate(() => CONTRATS[CONTRATS.length - 1].prix); v('R5 prix « 1 200,5 » accepté et lu 1200,5', ok.cree === 1 && k === 1200.5, [ok, k]);
  // double appui
  await L.aller(p, 'contrat-nouveau'); await p.fill('[data-b="prix"]', '300'); const n0 = await n();
  await p.evaluate(() => { const b = document.querySelector('[data-action="creerContrat"]'); b.click(); b.click(); }); await L.calme(p, 600);
  v('R5 double appui sur « Envoyer à signer » : UN seul contrat', (await n()) - n0 === 1, (await n()) - n0);
  // lieu très long
  await L.aller(p, 'contrat-nouveau'); await p.fill('[data-b="lieu"]', 'X'.repeat(130)); await p.fill('[data-b="prix"]', '300'); await L.capture(c, O.CAP.replace('campagne-contrats', 'recontrole-contrats') + `R5-formulaire-long-${tag}.png`);
  const d1 = await L.deborde(c); v('R5 le formulaire avec un lieu de 130 signes ne fait pas glisser la page', !(d1 && d1.bouge > 0), d1);
  await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 600);
  const d2 = await L.deborde(c); v('R5 la fiche du contrat avec ce lieu ne fait pas glisser la page', !(d2 && d2.bouge > 0), d2);
  await L.capture(c, O.CAP.replace('campagne-contrats', 'recontrole-contrats') + `R5-fiche-long-${tag}.png`);
  await L.aller(p, 'contrats'); const d3 = await L.deborde(c); v('R5 la liste avec ce contrat ne fait pas glisser la page', !(d3 && d3.bouge > 0), d3);
  await L.capture(c, O.CAP.replace('campagne-contrats', 'recontrole-contrats') + `R5-liste-long-${tag}.png`);
  console.log('err', c.err.length, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
