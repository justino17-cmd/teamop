// Matériel, étape 3 (Dépôts et camions) — QUI VOIT QUOI (spec § 4 et § 6) : Marc (gérant) a la rubrique, Julie (bureau) ne l'a pas — même en tapant l'adresse —,
// Sophie (technicienne) n'a jamais « Dépôts et camions » : la même route lui rend « Mon camion », sans un prix, sans un geste de gérant.
// Usage : node materiel-depots-roles.js → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, NB = s => String(s).replace(/[  ]/g, ' ');
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' }), p = c.p; await L.aller(p, 'boxes');
    v('Marc : « Dépôts et camions » est dans son menu et s\'ouvre sur ses cartes', await p.evaluate(() => /Dépôts et camions/.test(document.getElementById('menu').innerText) && document.querySelector('#contenu h1').textContent === 'Dépôts et camions' && document.querySelectorAll('.md-c').length >= 6));
    v('Marc : il a le bouton « Remplir les camions » et le menu Plus (Compter, Exporter, Nouvelle réserve)', await p.evaluate(() => { document.querySelector('[data-md="plus"]').click(); const t = [...document.querySelectorAll('.ctx button')].map(e => e.textContent).join('|'); fermerMenu(); return !!document.querySelector('[data-md="remplir"]') && /Compter un lieu/.test(t) && /Exporter/.test(t) && /Nouvelle réserve chez un client/.test(t); }));
    v('Marc : aucune erreur de page', c.err.length === 0, c.err); await L.fin(c); }
  { const c = await L.ouvrir({ profil:'mac', qui:'julie' }), p = c.p;
    const menu = await p.evaluate(() => document.getElementById('menu').innerText);
    v('Julie : le menu porte Stock, Fournisseurs, matériel & produits ET « Dépôts et camions » (équipe-11, MENU-FINAL.md : « Voir » décide SEULE, le Secrétariat (stock 1110) voit donc Dépôts et camions)', /Stock/.test(menu) && /Fournisseurs, matériel/.test(NB(menu)) && /Dépôts et camions/.test(menu), NB(menu).replace(/\s+/g, ' ').slice(0, 200));
    await p.evaluate(() => { location.hash = '#boxes'; }); await p.waitForTimeout(800);
    v('Julie : #boxes s\'ouvre sur « Dépôts et camions » avec ses cartes de lieu (le même droit « Voir » que Stock)', await p.evaluate(() => route === 'boxes' && document.querySelector('#contenu h1').textContent === 'Dépôts et camions' && document.querySelectorAll('.md-c').length >= 6), await p.evaluate(() => route));
    await p.evaluate(() => { try { vueBoxes(); } catch (e) {} });
    v('Julie : aucune erreur de page', c.err.length === 0, c.err); await L.fin(c); }
  { const c = await L.ouvrir({ profil:'iphone', qui:'sm' }), p = c.p;
    await p.evaluate(() => { location.hash = '#boxes'; }); await p.waitForTimeout(900);
    const t = await p.evaluate(() => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, md:document.querySelectorAll('[data-md]').length, txt:document.getElementById('contenu').innerText.replace(/[\u00a0\u202f]/g, ' ') }));
    v('Sophie : la route #boxes lui rend « Mon camion » (la rubrique des gérants ne s\'ouvre pas)', t.h1 === 'Mon camion' && t.md === 0, [t.h1, t.md]);
    v('Sophie : aucun €, aucune valeur, aucun « Remplir les camions », aucun lieu des autres dans sa page', !/€|Remplir les camions|Camion de Karim|Camion de Tom|Dépôts et camions/.test(t.txt), t.txt.slice(0, 200));
    v('Sophie : aucune erreur de page', c.err.length === 0, c.err); await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 90) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });   // un parcours qui plante est un parcours qui échoue : la mutation ne doit pas rester « vivante » sur un code de sortie 2
