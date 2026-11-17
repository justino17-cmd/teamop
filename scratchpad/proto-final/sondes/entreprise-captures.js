// Les captures À REGARDER de « Mon entreprise » : plusieurs appareils (Windows, iPad, Android, petit téléphone), jour ET nuit, le bandeau « Il manque… »,
// un panneau avec ses messages d'erreur SOUS les champs, la lecture seule, des valeurs longues défilées. Elles vont hors dépôt (cap/entreprise/).
// ⛔ 127.0.0.1 seulement.
const { L, CAP, ouvrirEnt, remplir, fin } = require('./entreprise-commun.js');
(async () => {
  if (!process.env.SANS_ECRANS) for (const [profil, nuit] of [['windows', false], ['ipad', false], ['ipad', true], ['android', true], ['mac720', false]]) {
    const c = await ouvrirEnt({ profil, nuit }); await L.capture(c, `${CAP}ecran-${profil}-${nuit ? 'nuit' : 'jour'}.png`, false); await L.fin(c); }
  { const c = await ouvrirEnt({ profil:'mac' });   // le bandeau « Il manque… » et un panneau en erreur
    await c.p.evaluate(() => { ENTREPRISE.siret = ''; ENTREPRISE.adr = '4 rue du Port'; rendre(); }); await L.calme(c.p, 300); await L.capture(c, `${CAP}manque-mac-jour.png`, false);
    await L.toucher(c, '[data-ent="completer"]'); await L.calme(c.p, 400);
    await remplir(c.p, 'en-cp', '17'); await remplir(c.p, 'en-tel', 'abc'); await c.p.locator('[data-ent="identok"]').click(); await L.calme(c.p, 300); await L.capture(c, `${CAP}erreurs-ident-mac.png`, false); await L.fin(c); }
  { const c = await ouvrirEnt({ profil:'iphone', nuit:true });
    await c.p.evaluate(() => { entModifiable = () => false; rendre(); }); await L.calme(c.p, 300); await L.toucher(c, '[data-ent="carte|banque"]'); await L.capture(c, `${CAP}lecture-seule-iphone-nuit.png`, false); await L.fin(c); }
  { const c = await ouvrirEnt({ profil:'iphone' });
    await c.p.evaluate(() => { ENTREPRISE.nom = 'Société Générale de Climatisation et de Chauffage Atlantique'.slice(0, 60); ENTREPRISE.adr = 'Zone industrielle de la Pointe de Beauregard bâtiment C, 17000 La Rochelle'; ENTREPRISE.iban = 'FR76 3000 6000 0112 3456 7890 1890 1234'.slice(0, 40); rendre(); }); await L.calme(c.p, 300);
    await c.p.evaluate(() => { document.querySelector('[data-ent="carte|ident"]').scrollIntoView({ block:'start' }); window.scrollBy(0, -80); }); await L.calme(c.p, 300); await L.capture(c, `${CAP}longues-iphone-cartes.png`, false); await L.fin(c); }
  await fin();
})();
