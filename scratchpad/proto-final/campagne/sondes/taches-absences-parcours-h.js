// Parcours H (gérant, ordinateur) : le contrat créé par le VRAI chemin (« Envoyer à signer », puis la signature du client) arrive-t-il
// dans « Tâches » sans la faire tomber ? (indice de MENU-FINAL : « Un contrat créé puis signé n'a pas de date de fin : Statistiques et Tâches plantent »)
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', hash: 'contrat-nouveau' }); const p = c.p; await L.calme(p, 600);
  const av = await p.evaluate(() => CONTRATS.length);
  await p.evaluate(() => { const f = document.querySelector('[data-b="prix"]'); if (f) { f.value = '480'; f.dispatchEvent(new Event('input', { bubbles: true })); } });
  const bouton = await p.evaluate(() => !!document.querySelector('[data-action="creerContrat"]'));
  v('H0 : le formulaire de nouveau contrat a son bouton « Envoyer à signer »', bouton);
  await p.evaluate(() => document.querySelector('[data-action="creerContrat"]').click()); await L.calme(p, 800);
  const k = await p.evaluate(() => CONTRATS[CONTRATS.length - 1]);
  v('H1 : un contrat de plus, « envoyé »', (await p.evaluate(() => CONTRATS.length)) === av + 1 && k.st === 'envoye', k);
  await p.evaluate(id => aller('signer-x-' + id), k.id); await L.calme(p, 600);
  await p.evaluate(() => { document.getElementById('lu').checked = true; immDccTrace('signe-ctr'); document.querySelector('[data-action="signerContrat"]').click(); }); await L.calme(p, 800);
  const s = await p.evaluate(id => JSON.parse(JSON.stringify(CONTRATS.find(x => x.id === id))), k.id);
  v('H2 : le contrat est signé', s.st === 'signe', s);
  console.log('contrat signé :', JSON.stringify(s).replace(/"sigImg":"[^"]*"/, '"sigImg":"…"'));
  v('H3 (tâches-absences-01) : un contrat signé porte une date de fin (sinon « Tâches » et « Statistiques » plantent)', /^\d\d\/\d\d\/\d{4}$/.test(s.fin || ''), s.fin);
  await p.evaluate(() => aller('taches')); await L.calme(p, 800);
  const r = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, nb: document.querySelectorAll('#contenu [data-tmodif]').length }));
  v('H4 (tâches-absences-01) : « Tâches » s’affiche après la signature d’un contrat', r.h1 === 'Tâches' && r.nb > 0 && !c.err.length, [r, c.err.slice(0, 2)]);
  await L.capture(c, O.CAP + 'H4-taches-apres-contrat.png');
  await p.evaluate(() => aller('statistiques')); await L.calme(p, 800);
  const st = await p.evaluate(() => (document.querySelector('#contenu h1') || {}).textContent);
  v('H5 (tâches-absences-01) : « Statistiques » s’affiche après la signature d’un contrat', st === 'Statistiques', [st, c.err.slice(0, 2)]);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
