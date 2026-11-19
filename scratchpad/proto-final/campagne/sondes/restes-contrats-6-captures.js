// RESTES CONTRATS, tour 6 : captures à REGARDER — liste des Contrats, fiche d'un contrat (carte Facturation, prix à six chiffres), aperçu de « Composer un contrat » (prix « 12 € » et prix refusé « 0x10 »).
// usage : node restes-contrats-6-captures.js <profil> [nuit] → fichiers dans CAP6 (hors dépôt)
const O = require('./contrats-outils.js'), L = O.L;
const CAP = process.env.CAP6 || '/tmp/cr6/cap/';
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }), p = c.p; await L.calme(p, 500);
  await p.evaluate(() => { const l = document.querySelector('#contenu .ctr-liste'); l && l.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }); await L.calme(p, 400);
  await L.capture(c, CAP + 'liste-' + tag + '.png');
  const k = await O.creerSigner(c, { modele: 'clim', cli: 'hp', freq: 12, prix: 12345.67, fact: 'mois', lieu: 'les locaux techniques du sous-sol' });
  if (k) { await L.aller(p, 'contrat-x-' + k.id); await L.calme(p, 450);
    await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h3')].find(x => /^Facturation/.test(x.textContent)); h && h.scrollIntoView({ block: 'center' }); }); await L.calme(p, 400);
    await L.capture(c, CAP + 'fiche-facturation-' + tag + '.png'); }
  for (const [saisie, nom] of [['12 €', 'ok'], ['0x10', 'refus']]) {
    await O.neuf(c, 'contrat-nouveau'); await p.fill('[data-b="prix"]', saisie); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(p, 300);
    await p.evaluate(() => { const f = document.querySelector('[data-b="prix"]'); f && f.scrollIntoView({ block: 'center' }); }); await L.calme(p, 300);
    await L.capture(c, CAP + 'composer-' + nom + '-' + tag + '.png');
  }
  await L.fin(c); await L.fermer();
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
