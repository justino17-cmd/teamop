// Recontrôle adverse « compta-ventes », R2b (17 novembre 2026) : une facture EN RETARD encaissée en partie (500 €) puis annulée par un avoir.
// Ce que l'écran en dit, ce que devient la tâche « Relancer le paiement » et ce que le cadre plein écran en pense.
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  await X.fiche(c, 'f128'); await L.toucher(c, '[data-action="partiel"]'); await X.saisir(c, '#pp-m', '500'); await L.toucher(c, '#calque [data-action="partielOk"]'); await L.calme(p, 400);
  await X.fiche(c, 'f128'); await L.toucher(c, '[data-action="avoir"]'); await L.toucher(c, '#calque [data-action="avoirOk"]'); await L.calme(p, 500);
  await X.fiche(c, 'f128'); const fiche = await X.texte(p, '#contenu');
  L.v('R2b-1 · la fiche de la facture annulée ne garde AUCUNE tâche ouverte « pour cette facture » (plus rien à relancer)', !/tâche ouverte/.test(fiche), fiche.match(/\d+ tâche[^|\n]*/)?.[0]);
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
