// Recontrôle adverse « compta-ventes », R2b (17 novembre 2026) : une facture EN RETARD encaissée en partie (500 €) puis annulée par un avoir.
// Ce que l'écran en dit, ce que devient la tâche « Relancer le paiement » et ce que le cadre plein écran en pense.
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  await X.fiche(c, 'f128'); await L.toucher(c, '[data-action="partiel"]'); await X.saisir(c, '#pp-m', '500'); await L.toucher(c, '#calque [data-action="partielOk"]'); await L.calme(p, 400);
  await X.fiche(c, 'f128'); await L.toucher(c, '[data-action="avoir"]'); await L.toucher(c, '#calque [data-action="avoirOk"]'); await L.calme(p, 500);
  await X.fiche(c, 'f128'); const fiche = await X.texte(p, '#contenu');
  /* décision du chef (17/11, 9 h 50) : la facture annulée FERME ses tâches de relance ; les 500 € déjà reçus créent UNE tâche « Rembourser 500,00 € à <client> » et une ligne à l'Historique */
  const tc = await p.evaluate(() => ({ ouv: TACHES.filter(x => !x.fait && x.lien && x.lien.id === 'f128').map(x => x.t), relFermee: TACHES.filter(x => x.lien && x.lien.id === 'f128' && /^Relancer le paiement/.test(x.t)).map(x => !!x.fait), histo: JOURNAL.filter(j => /remboursement/.test(j.action)).map(j => j.action + ' · ' + (j.det || '')) }));
  L.v('R2b-1 · la tâche de relance de la facture annulée est TERMINÉE, et la seule tâche ouverte est « Rembourser 500,00 € à M. et Mme Durand »', tc.relFermee.length === 1 && tc.relFermee[0] === true && tc.ouv.length === 1 && /^Rembourser 500,00\s€ à M\. et Mme Durand$/.test(tc.ouv[0].replace(/[  ]/g, ' ')), JSON.stringify(tc));
  L.v('R2b-1b · une ligne à l’Historique dit le remboursement à faire', tc.histo.length === 1, tc.histo);
  L.v('R2b-2 · la fiche de la facture annulée dit ce que devient l’argent déjà reçu (500 €) : à rembourser, ou déduit', /500,00/.test(fiche.replace(/Prix HT[\s\S]*?Total HT/, '')) , fiche.slice(fiche.indexOf('Annulée par un avoir'), fiche.indexOf('Annulée par un avoir') + 400).replace(/\n/g, ' | '));
  await L.capture(c, X.CAP + `r2b-${profil}-fiche-annulee-500.png`);
  await p.evaluate(() => aller('taches')); await L.calme(p, 700); const t = await X.texte(p, '#contenu');
  L.v('R2b-3 · la liste des Tâches ne propose plus « Relancer le paiement de la facture FAC-2026-0128 » (annulée)', !/Relancer le paiement de la facture FAC-2026-0128/.test(t), t.split('\n').filter(l => /0128|Durand/.test(l)));
  await L.capture(c, X.CAP + `r2b-${profil}-taches.png`);
  const f = await X.cadreOuvert(c); await f.evaluate(() => aller('ventes')); await p.waitForTimeout(800);
  const cad = await f.evaluate(() => { const r = document.querySelector('#contenu tr[data-fac="FAC-2026-0128"]'); return { ligne: r ? r.innerText.replace(/\s+/g, ' ') : null, kpi: [...document.querySelectorAll('#contenu .kpi')].map(e => e.innerText.replace(/\s+/g, ' ').trim()) }; });
  console.log('  cadre :', JSON.stringify(cad));
  L.v('R2b-4 · le cadre dit « annulée » pour 0128, pas « en retard » ni « à encaisser »', cad.ligne && /Annulée/.test(cad.ligne) && !/En retard|À encaisser/.test(cad.ligne), cad.ligne);
  await L.capture(c, X.CAP + `r2b-${profil}-cadre-ventes.png`);
  await f.evaluate(() => document.querySelector('#contenu tr[data-fac="FAC-2026-0128"]').click()); await p.waitForTimeout(600);
  const pan = await f.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
  console.log('  panneau cadre :', pan.slice(0, 400));
  L.v('R2b-5 · le panneau du cadre ne propose pas de relancer ni d’encaisser une facture annulée', !f ? false : !(await f.evaluate(() => !!document.querySelector('[data-cmpt="relancer"],[data-cmpt="encaisser"],[data-cmpt="payer"]'))), pan.slice(0, 200));
  await L.capture(c, X.CAP + `r2b-${profil}-cadre-panneau.png`);
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
