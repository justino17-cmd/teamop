// Recontrôle adverse « compta-ventes », R5 (17 novembre 2026) : un avoir sur une facture PAYÉE (remboursement) — ce qu'en disent la fiche, la liste d'OP GESTION et le cadre plein écran,
// et si OP GESTION et le cadre racontent la même chose (états, « facturé en octobre », « encaissé en octobre »).
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const fcad = async () => { const f = await X.cadreOuvert(c); await f.evaluate(() => aller('ventes')); await p.waitForTimeout(900);
    return f.evaluate(() => ({ ligne: (r => r ? r.innerText.replace(/\s+/g, ' ') : null)(document.querySelector('#contenu tr[data-fac="FAC-2026-0145"]')), avoir: [...document.querySelectorAll('#contenu tr[data-fac^="AV-"]')].map(r => r.innerText.replace(/\s+/g, ' ')), kpi: [...document.querySelectorAll('#contenu .kpi')].map(e => e.innerText.replace(/\s+/g, ' ').trim()) })); };
  const avant = await fcad(); await p.evaluate(() => { cpSysteme = false; try { fermerPanneau(); } catch (e) {} aller('accueil'); }); await L.calme(p, 400);
  console.log('  cadre avant :', JSON.stringify(avant));
  await X.fiche(c, 'f145'); await L.toucher(c, '[data-action="avoir"]'); await L.toucher(c, '#calque [data-action="avoirOk"]'); await L.calme(p, 500);
  const hote = await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'f145'); return { st: f.st, av: FACTURES.filter(x => x.st === 'avoir').map(x => [x.num, x.objet, Math.round(x.ht * 100)]) }; });
  console.log('  hôte :', JSON.stringify(hote));
  await X.fiche(c, 'f145'); const fiche = await X.texte(p, '#contenu'); console.log('  fiche :', fiche.replace(/\n/g, ' | ').slice(0, 700));
  await L.capture(c, X.CAP + `r5-${profil}-fiche-payee-avoir.png`);
  const apres = await fcad(); console.log('  cadre après :', JSON.stringify(apres));
  await L.capture(c, X.CAP + `r5-${profil}-cadre.png`);
  L.v('R5-1 · le cadre ne dit pas « Payée » seule pour une facture remboursée par un avoir (il dit l’avoir)', !!apres.ligne && /avoir/i.test(apres.ligne), apres.ligne);
  L.v('R5-2 · la fiche d’une facture payée avoirée dit que l’argent est à rendre au client (ou renvoie vers les paiements)', /rembours|rendre|rendu/i.test(fiche), fiche.slice(0, 200));
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
