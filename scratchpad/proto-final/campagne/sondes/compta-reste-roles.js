// Les droits sur ma partie : qui voit quoi dans la Comptabilité (Achats, Paie, Trésorerie, Fiscal, Conformité) selon la personne connectée, par le menu ET par l'adresse.
// marc (gérant) tout ; julie (secrétariat) la Comptabilité sans la Paie ; sm (technicienne) et kb (chef d'équipe) : selon leurs cases. « N ✓ · M ✗ ».
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  for (const qui of ['marc', 'julie', 'sm', 'kb']) {
    const c = await L.ouvrir({ profil: 'mac', qui }), p = c.p;
    const menu = await p.evaluate(() => ({ compta: !!document.querySelector('#menu a[href="#comptabilite"]'), achats: !!document.querySelector('#menu a[href="#achats"]'), frais: !!document.querySelector('#menu a[href="#techfrais"]'), mesheures: !!document.querySelector('#menu a[href="#mesheures"]') }));
    // par l'adresse : #comptabilite, puis les onglets de la paie forcés
    await L.aller(p, 'comptabilite'); await L.calme(p, 600);
    const g = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent || '', espaces: [...document.querySelectorAll('[data-cx^=\"grp|\"]')].map(b => b.textContent.replace(/\s+/g, ' ').trim().slice(0, 22)), erreurPage: /n.existe pas|non autoris|pas accès|réservé/i.test(document.body.innerText.slice(0, 600)) }));
    console.log(qui, JSON.stringify(menu), JSON.stringify(g));
    const paieVue = await p.evaluate(() => { cpSysteme = false; CP.onglet = 'paiemois'; try { rendre(); } catch (e) {} return { onglet: CP.onglet, texte: (document.querySelector('#contenu') || {}).innerText.slice(0, 80).replace(/\s+/g, ' '), paie: /Paie d.octobre|Le mois, étape/.test((document.querySelector('#contenu') || {}).innerText) }; });
    if (qui === 'marc') { v('R marc voit la Comptabilité et la Paie', menu.compta && g.espaces.some(e => /Paie/.test(e)) && paieVue.paie, { menu, g, paieVue }); }
    if (qui === 'julie') { v('R julie : la Comptabilité oui, l’espace Paie non (réservé au patron)', menu.compta && !g.espaces.some(e => /Paie/.test(e)), { menu, g }); v('R julie : forcer l’onglet de la paie par l’adresse ne montre pas la paie', !paieVue.paie, paieVue); }
    if (qui === 'sm' || qui === 'kb') { const aVoir = menu.compta || /Comptabilité/.test(g.h1); console.log(`  ${qui} ${aVoir ? 'VOIT' : 'ne voit pas'} la Comptabilité`);
      v(`R ${qui} : ce qu’il voit de la Comptabilité ne montre jamais la Paie des autres`, !paieVue.paie, paieVue); v(`R ${qui} : « Mes frais » est là pour ses notes de frais`, menu.frais || menu.achats, menu); }
    if (qui === 'julie' || qui === 'marc') { // la Comptabilité de Julie s'ouvre dans le cadre OP COMPTABLE : sans la Paie, sans « La démo » ni « Tests guidés »
      const f = await X.cadreCompta(c); if (f) { const m = await f.evaluate(() => [...document.querySelectorAll('#menu a')].map(a => a.getAttribute('href').slice(1)));
        const dem = await f.evaluate(() => { try { aller('demo'); } catch (e) {} return { route: UI.route, texte: (document.querySelector('#contenu') || {}).innerText.slice(0, 80).replace(/\s+/g, ' ') }; }); const tes = await f.evaluate(() => { try { aller('tests'); } catch (e) {} return { route: UI.route }; });
        console.log('  cadre', qui, 'menu :', m.join(' '), '| #demo →', JSON.stringify(dem), '| #tests →', JSON.stringify(tes));
        v(`R ${qui} : le cadre ne propose ni « La démo » ni « Tests guidés » au menu`, !m.includes('demo') && !m.includes('tests'), m);
        v(`R ${qui} : l’adresse #demo / #tests du cadre ne mène pas à l’échafaudage`, dem.route !== 'demo' && tes.route !== 'tests', { dem, tes });
        if (qui === 'julie') v('R julie : le cadre n’a pas la rubrique Paie (réservée au patron)', !m.includes('paie'), m); else v('R marc : le cadre a la rubrique Paie', m.includes('paie'), m); } }
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
