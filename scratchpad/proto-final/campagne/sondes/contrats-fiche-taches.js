// La bande « 1 tâche ouverte pour ce contrat » de la fiche : se déplie, la tâche s'ouvre, « ＋ Nouvelle tâche » part avec le contrat déjà choisi.
// usage : node contrats-fiche-taches.js [profil]
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', qui: 'marc', hash: 'contrat-x-c1' }); const p = c.p; await L.calme(p, 500);
  const bande = await p.evaluate(() => { const b = document.querySelector('#contenu .tkx-lie'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : ''; }); console.log('  · bande :', bande);
  v('T : la bande dit « 1 tâche ouverte pour ce contrat »', /1 tâche ouverte/.test(bande), bande);
  await p.locator('#contenu .tkx-lie summary').click(); await L.calme(p, 600);   // le vrai geste : un clic sur le résumé (un click() JS sur le <details> le referme)
  const sel = await p.evaluate(() => !!document.querySelector('#contenu [data-tmodif]') && document.querySelector('#contenu [data-tmodif]').offsetParent !== null); v('T : dépliée, la tâche est visible', sel, sel);
  await L.toucher(c, '#contenu [data-tmodif]'); await L.calme(p, 500); const e = await O.lire(p);
  v('T : toucher la tâche l’ouvre (panneau « Préparer la visite 3… »)', /visite 3/i.test(e.panneau), e); await L.capture(c, O.CAP + 'T-tache-ouverte.png'); await L.ranger(p);
  await L.toucher(c, '#contenu [data-tkxnouv]'); await L.calme(p, 500); const e2 = await O.lire(p);
  const lien = await p.evaluate(() => (document.getElementById('tkx-lien') || {}).value || '');
  v('T : « ＋ Nouvelle tâche » s’ouvre avec le contrat CTR-2026-004 déjà choisi', /Nouvelle tâche/.test(e2.panneau) && /CTR-2026-004/.test(lien), [e2.panneau, lien]);
  console.log('err', c.err.length, c.err.slice(0, 3)); v('T : aucune erreur de la page', c.err.length === 0, c.err);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
