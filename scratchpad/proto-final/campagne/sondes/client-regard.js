// Espace client, ce qu'on REGARDE après les corrections (17 novembre 2026) : une capture par écran corrigé, à relire à l'œil (outil Read).
// node client-regard.js <profil> [nuit]  → captures dans O.CAP (hors dépôt), « N ✓ · M ✗ » (la sonde vérifie seulement que chaque écran s'est ouvert).
const O = require('./client-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
(async () => {
  const c = await O.client({ profil, nuit, cli: 'md', ec: 'factures' }); const p = c.p;
  const cap = async n => L.capture(c, O.CAP + `regard-${tag}-${n}.png`);
  await L.calme(p, 300); await p.evaluate(() => { const e = document.querySelector('.ec-vir'); if (e) e.scrollIntoView({ block: 'center' }); }); await L.calme(p, 300); await cap('factures-virement');
  await L.toucher(c, '[data-ec^="payer|"]'); let d = await O.dessus(p); v('la fenêtre de paiement s’ouvre', /Payer la facture/.test(d.panneau), d.panneau.slice(0, 80)); await cap('payer');
  await p.evaluate(() => { document.getElementById('ec-cvc').value = ''; }); await L.toucher(c, '[data-ec^="payok|"]'); d = await O.dessus(p); v('un code au dos vide est refusé et le message le dit', /code au dos/.test(d.toast), d.toast); await cap('payer-refus-code');
  await O.nettoyer(p);
  await p.evaluate(() => { RL_CLI.cli = 'vp'; EC.tab = 'devis'; rendre(); }); await L.calme(p, 300); await cap('devis-liste');
  await p.evaluate(() => { RL_CLI.cli = 'mi'; EC.tab = 'interventions'; rendre(); }); await L.calme(p, 300); await cap('interventions-retard');
  await p.evaluate(() => { RL_CLI.cli = 'hp'; EC.tab = 'interventions'; rendre(); }); await L.calme(p, 300);
  await L.toucher(c, '[data-ec^="cr|"]'); d = await O.dessus(p); v('le compte rendu s’ouvre, sous son titre « Votre compte rendu »', /Votre compte rendu/.test(d.panneau) && !/Badge|Local technique|envoyé au client/.test(d.panneau), d.panneau.slice(0, 160)); await cap('compte-rendu'); await O.nettoyer(p);
  await p.evaluate(() => { RL_CLI.cli = 'md'; EC.tab = 'contrats'; rendre(); }); await L.calme(p, 300);
  await L.toucher(c, '[data-ecctr]'); d = await O.dessus(p); v('« Demander un contrat » ouvre une fenêtre de contrat', /Demander un contrat d’entretien/.test(d.panneauTitre), d.panneauTitre); await cap('demande-contrat'); await O.nettoyer(p);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
