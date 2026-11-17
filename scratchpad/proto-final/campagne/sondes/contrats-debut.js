// La date de début d'un contrat rapide : elle se choisit (calendrier), et la fin, les visites et le PDF la suivent.
// usage : node contrats-debut.js [profil]
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', qui: 'marc', hash: 'contrat-nouveau' }); const p = c.p; await L.calme(p, 500);
  await L.toucher(c, '[data-dtpour]'); await L.calme(p, 400);
  const jours = await p.evaluate(() => [...document.querySelectorAll('[data-dtj]')].map(b => b.dataset.dtj + (b.disabled ? '(x)' : '')).slice(0, 40)); console.log('  · jours proposés :', jours.join(' '));
  v('D : le calendrier propose des jours', jours.length > 20, jours.length);
  const passe = jours.find(j => /^2026-10-1\d/.test(j)); console.log('  · un jour passé proposé :', passe || 'aucun');
  await L.toucher(c, '[data-dtj="2026-11-20"]'); await L.calme(p, 400);
  const d = await p.inputValue('[data-b="debut"]'); v('D : le jour touché devient la date de début (2026-11-20)', d === '2026-11-20', d);
  const pdf = await p.evaluate(() => document.querySelector('#contenu .pdf').innerText.replace(/\s+/g, ' ')); v('D : l’aperçu du PDF dit « à compter du 20/11/2026 »', /à compter du 20\/11\/2026/.test(pdf), pdf.slice(-300));
  await p.fill('[data-b="prix"]', '240'); await p.selectOption('[data-b="freq"]', '2'); await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 500);
  const k = await p.evaluate(() => CONTRATS[CONTRATS.length - 1]); v('D : le contrat garde le 20/11/2026 et finit le 19/11/2027', k.debut === '20/11/2026' && k.fin === '19/11/2027', k);
  console.log('err', c.err.length);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
