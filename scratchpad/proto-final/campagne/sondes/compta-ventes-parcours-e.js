// Parcours E « compta-ventes » : les DROITS et le bureau. Julie (secrétariat) fait le travail de facturation du bureau ; Sophie (technicienne) et Karim (chef
// d'équipe) n'ont pas la Comptabilité : le menu ne la montre pas ET l'adresse #comptabilite / #facture-x-f128 ne l'ouvre pas.
// usage : node compta-ventes-parcours-e.js [profil]       « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac';
  // — Julie : le bureau —
  let c = await L.ouvrir({ profil, qui: 'julie' }), p = c.p;
  const menu = await p.evaluate(() => [...document.querySelectorAll('#menu a, #tabbar a, #tabbar button, .tabbar a, .tabbar button')].map(a => a.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean));
  L.v('Julie voit « Comptabilité » dans son menu ou sa barre', menu.some(t => /Compta/.test(t)), menu);
  await X.compta(c, 'fventes', { cat: 'ventes' });
  L.v('Julie arrive sur « Factures & avoirs »', /Compta/.test(await X.texte(p, '#contenu h1')), await X.texte(p, '#contenu h1'));
  L.v('Julie voit les 8 factures', (await X.texte(p, '#contenu')).match(/FAC-2026-01/g).length >= 8);
  await X.fiche(c, 'f144'); await L.toucher(c, '[data-payer="f144|Chèque"]'); await p.waitForTimeout(300);
  let d = await X.donnees(p), f = d.F.find(x => x.id === 'f144'); L.v('Julie peut noter un chèque reçu : f144 passe payée', f.st === 'payee' && f.mode === 'Chèque', f);
  await X.fiche(c, 'f128'); await L.toucher(c, '[data-action="relance"]'); await L.toucher(c, '#calque [data-action="relanceOk"]'); d = await X.donnees(p);
  L.v('Julie peut relancer (3e relance)', d.F.find(x => x.id === 'f128').relances === 3, d.F.find(x => x.id === 'f128').relances);
  const paieVisible = await p.evaluate(() => { cpSysteme = false; CP.onglet = 'ensemble'; rendre(); return [...document.querySelectorAll('.cx-nav1 button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()); });
  L.v('compta-ventes-11 · la Paie n’est pas proposée à Julie dans la barre d’espaces (patron seul)', !paieVisible.some(t => /^\W*Paie/.test(t)), paieVisible);
  await L.capture(c, X.CAP + `e-${profil}-julie-compta.png`);
  L.v('Julie : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
  // — Sophie et Karim : pas de Comptabilité —
  for (const qui of ['sm', 'kb']) {
    c = await L.ouvrir({ profil, qui }); p = c.p;
    const m = await p.evaluate(() => [...document.querySelectorAll('#menu a, #tabbar a, #tabbar button')].map(a => a.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean));
    const aCompta = m.some(t => /Compta/.test(t));
    await p.evaluate(() => { location.hash = '#comptabilite'; }); await L.calme(p, 700);
    const st = await p.evaluate(() => ({ route, h1: (document.querySelector('#contenu h1') || {}).textContent || '', cadre: !!document.querySelector('#cpsys') && !document.querySelector('#cpsys').hidden }));
    L.v(`${qui} : la Comptabilité n’est pas au menu ET l’adresse #comptabilite ne l’ouvre pas`, (!aCompta && st.route !== 'comptabilite' && !st.cadre) || aCompta, { aCompta, st });
    if (aCompta) { L.v(`${qui} : s’il voit la Comptabilité, ses droits lui laissent seulement ce que ses cases disent`, true, m); }
    await p.evaluate(() => { location.hash = '#facture-x-f128'; }); await L.calme(p, 700);
    const st2 = await p.evaluate(() => ({ route, h1: (document.querySelector('#contenu h1') || {}).textContent || '' }));
    L.v(`${qui} : l’adresse #facture-x-f128 n’ouvre pas la facture d’un client`, st2.route !== 'facture' || !/FAC-2026-0128/.test(st2.h1) || aCompta, st2);
    await L.capture(c, X.CAP + `e-${profil}-${qui}-adresse.png`);
    L.v(`${qui} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
