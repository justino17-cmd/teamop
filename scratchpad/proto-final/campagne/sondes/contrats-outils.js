// Outils communs des sondes « Contrats » de la campagne du 17 novembre 2026 : ceux des sondes Tâches / Absences, plus les
// lectures propres aux contrats. Une page NEUVE avant chaque geste (le prototype garde son état en mémoire jusqu'au rechargement).
const O = require('./taches-absences-outils.js');
exports.L = O.L; exports.marquer = O.marquer; exports.neuf = O.neuf; exports.lire = O.lire; exports.diff = O.diff; exports.doigtsReel = O.doigtsReel;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-contrats/';
// ce que les écrans de la partie « Contrats » montrent, lu dans les données ET dans la page (pour comparer les deux)
exports.donnees = p => p.evaluate(() => ({ contrats: CONTRATS.map(k => ({ id: k.id, num: k.num, cli: k.cli, st: k.st, freq: k.freq, prix: k.prix, fact: k.fact, fin: k.fin || '', debut: k.debut, faites: ctrFaites(k) })   /* ce que la page AFFICHE (le chiffre de départ + les visites terminées), pas le champ brut */), nInts: INTS.length, nFact: FACTURES.length, nTaches: TACHES.length, nJournal: JOURNAL.length, auj: AUJ }));
exports.kpis = p => p.evaluate(() => [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => ({ n: (k.querySelector('b') || {}).textContent, l: ((k.querySelector('span') || {}).textContent || '').trim() })));
// Crée un contrat par le formulaire « Contrat rapide » (les VRAIS champs), l'envoie à signer, puis le signe en client (VRAIE page de
// signature, VRAI tracé à la souris). Rend { id, num }. o : { modele, cli, freq, prix, fact, lieu, signer:true }
exports.creerSigner = async (c, o) => { const p = c.p, L = exports.L;
  await L.aller(p, 'contrat-nouveau'); if (o.modele) await p.selectOption('[data-b="modele"]', o.modele); await L.calme(p, 250);
  if (o.cli) await p.selectOption('[data-b="cli"]', o.cli); if (o.freq) await p.selectOption('[data-b="freq"]', String(o.freq)); if (o.fact) await p.selectOption('[data-b="fact"]', o.fact);
  if (o.prix !== undefined) await p.fill('[data-b="prix"]', String(o.prix)); if (o.lieu !== undefined) await p.fill('[data-b="lieu"]', o.lieu);
  const n0 = await p.evaluate(() => CONTRATS.length); await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 500);
  const k = await p.evaluate(n => CONTRATS.length > n ? CONTRATS[CONTRATS.length - 1] : null, n0); if (!k) return null;
  if (o.signer === false) return { id: k.id, num: k.num };
  await L.aller(p, 'signer-x-' + k.id); await p.check('#lu'); const bb = await p.locator('#signe-ctr').boundingBox();
  await p.mouse.move(bb.x + bb.width * .2, bb.y + bb.height * .6); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * .5, bb.y + bb.height * .3, { steps: 6 }); await p.mouse.move(bb.x + bb.width * .8, bb.y + bb.height * .6, { steps: 6 }); await p.mouse.up();
  await L.toucher(c, '[data-action="signerContrat"]'); await L.calme(p, 500); return { id: k.id, num: k.num }; };
// termine une visite de contrat comme le fait « Terminer » (contrôles cochés, signature du client, compte rendu), et rend la facture qui en sort
exports.terminerVisite = (p, id) => p.evaluate(id => { const i = INTS.find(o => o.id === id); const F = fiche(id); tousControles(F).forEach(k => { F.coches[k] = true; }); F.signature = 'data:image/png;base64,x'; F.compte = 'Entretien fait'; i.tech = i.tech || 'tl'; ACTIONS.terminer({ dataset: { id } }); const f = FACTURES.find(o => o.int === id); return { st: i.st, facture: f ? { id: f.id, lignes: f.lignes.map(l => ({ d: l.d, q: l.q, pu: l.pu })), tva: f.tva } : null }; }, id);
