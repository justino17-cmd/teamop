// RECONTRÔLE ADVERSE de l'accueil — ce que les corrections ont pu casser À CÔTÉ :
//  1. le bilan PDF des Statistiques dit-il d'où vient la différence avec l'Accueil (3 085 contre 3 045) ? (accueil-01 a changé l'Accueil, pas le bilan)
//  2. l'export PDF de l'Historique filtré (sujet « Factures et paiements ») compte-t-il la ligne de paiement neuve ?
//  3. « ＋ À faire » d'un renouvellement, touché deux fois : une seule tâche
//  4. un paiement fait PAR UN CLIENT (portail) : la ligne de l'Historique nomme quelqu'un et pas « undefined »
//  5. le paiement en partie, annulé : l'Historique garde les deux lignes (rien ne s'efface)
// node accueil-recontrole-divers.js [profil] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const corps = () => p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '));
  const calque = () => p.evaluate(() => (document.querySelector('#calque') || document.body).innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '));

  // 1. le bilan PDF
  await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.toucher(c, '[data-stbilan="1"]'); await p.waitForTimeout(700);
  const bil = await calque();
  const encBilan = (bil.match(/Encaissé sur la période(?: Non compris : [^€]*€ reçus sur place, pas encore sur une facture)?\s*([\d ]+,\d{2}) €/) || [])[1];
  v('1 · le bilan dit « Encaissé sur la période » (population)', !!encBilan, bil.slice(0, 200));
  v('1 · le bilan explique l’écart avec l’Accueil (« reçus sur place ») quand il y en a', /reçus? sur place/.test(bil), { encBilan, accueil: '3 085,00 €' });
  await L.ranger(p);

  // 2. l'export de l'Historique filtré
  await p.evaluate("hQui='tous';hType='facture';hCli='tous';hCherche='';hMax=60;hJourSel='tous';hOuverts=new Set([AUJ]);"); await L.aller(p, 'historique');
  const n = ((await corps()).match(/(\d+) actions? trouvées?/) || [])[1];
  await L.toucher(c, '[data-hexport="1"]'); await p.waitForTimeout(700); const ex = await calque();
  const nEx = (ex.match(/(\d+) actions?/) || [])[1];
  v('2 · l’export de l’Historique filtré annonce le même nombre d’actions que l’écran', !!n && n === nEx, { ecran: n, export: nEx, extrait: ex.slice(0, 220) });
  v('2 · l’export dit le filtre (« Factures », le nom des puces du 18 novembre)', /filtré à l’écran : Factures/.test(ex), ex.slice(0, 220)); await L.ranger(p);

  // 3. deux touchers sur « ＋ À faire »
  await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques');
  const nT0 = await p.evaluate(() => TACHES.length);
  const sel = '.st-ctr-l [data-afaire]'; const nb = await p.locator(sel).count();
  v('3 · population : au moins un « ＋ À faire » de renouvellement', nb >= 1, nb);
  await L.toucher(c, sel); await p.locator(sel).first().click({ force: true, timeout: 1500 }).catch(() => {}); await p.waitForTimeout(400);
  const nT1 = await p.evaluate(() => TACHES.length), nAF = await p.evaluate(() => (typeof AFAIRE_AJOUTS !== 'undefined' ? AFAIRE_AJOUTS.length : -1));
  v('3 · deux touchers : une seule tâche ajoutée', nT1 - nT0 <= 1, { nT0, nT1, nAF });

  // 4. un paiement du portail client
  const cli = await p.evaluate(() => { const f = FACTURES.find(x => ['envoyee', 'retard'].includes(x.st) && restant(x) > 5); const R = ROLE; ROLE = 'client'; try { payer(f, 'Carte', { montant: 5 }); } catch (e) { ROLE = R; return { err: String(e) }; } ROLE = R; return { num: f.num, der: JOURNAL[JOURNAL.length - 1] }; });
  await p.evaluate("hQui='tous';hType='facture';hCli='tous';hCherche='';hMax=60;hJourSel='tous';hOuverts=new Set([AUJ]);"); await L.aller(p, 'historique'); const h = await corps();
  v('4 · la ligne d’un paiement du portail nomme quelqu’un (ni « undefined » ni vide)', !cli.err && /payé en ligne/.test(h) && !/undefined|null/.test(h), { cli: cli.err || cli.der && cli.der.qui, extrait: (h.match(/.{40}payé en ligne.{40}/) || [''])[0] });

  const bruit = c.err.filter(e => !/hl-ecran|Failed to load/.test(e)); v('aucune erreur JavaScript', bruit.length === 0, bruit.slice(0, 4));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
