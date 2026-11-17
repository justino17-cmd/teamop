// Matériel, étape 2 (Stock) — QUI VOIT QUOI (spec § 4), joué avec les trois personnes : Marc (gérant), Julie (bureau), Sophie (technicienne).
//  · Marc : tout (accepter, réglages, prix de vente) ; · Julie : Stock et Fournisseurs ouverts, MAIS ni « accepter », ni réglages, ni prix de vente, ni Dépôts ;
//  · Sophie : la route Stock est fermée (« Cette page n'existe pas. »), et sa fiche d'article (depuis Mon camion) ne montre ni prix, ni valeur, ni marge.
// Usage : node materiel-stock-roles.js → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, NB = s => String(s).replace(/[  ]/g, ' ');
  // ── Marc
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' }), p = c.p; await L.aller(p, 'stock');
    const a = await p.evaluate(() => ({ acc:!!document.querySelector('[data-ms="toutacc"]'), lignes:document.querySelectorAll('.ms-l').length }));
    v('Marc : « Tout accepter » est là, devant ' + a.lignes + ' articles', a.acc && a.lignes >= 20);
    await p.evaluate(() => document.querySelector('[data-ms="plus"]').click()); await p.waitForTimeout(250);
    v('Marc : le menu Plus porte « Réglages du stock »', (await p.evaluate(() => [...document.querySelectorAll('.ctx button')].map(e => e.textContent))).some(t => /Réglages du stock/.test(t))); await p.evaluate(() => fermerMenu());
    await p.evaluate(() => prFiche('p3')); await p.waitForTimeout(300);
    v('Marc : la fiche d\'article montre prix d\'achat, prix de vente et marge', await p.evaluate(() => { const t = document.querySelector('#calque').innerText; return /Je l’achète/.test(t) && /Je le vends/.test(t) && /Marge/.test(t); }));
    await p.evaluate(() => document.querySelector('[data-ms^="fprixo|"]').click()); await p.waitForTimeout(200);
    v('Marc : le champ du prix de vente est modifiable', await p.evaluate(() => { const e = document.querySelector('[data-msf="pv"]'); return !!e && !e.disabled; }));
    v('Marc : Dépôts et camions est dans son menu', await p.evaluate(() => /Dépôts et camions/.test(document.getElementById('menu').innerText)));
    v('Marc : aucune erreur de page', c.err.length === 0, c.err); await L.fin(c); }
  // ── Julie
  { const c = await L.ouvrir({ profil:'mac', qui:'julie' }), p = c.p;
    const menu = await p.evaluate(() => document.getElementById('menu').innerText);
    v('Julie : le menu a un groupe « Matériel » avec Stock et Fournisseurs, matériel & produits, SANS Dépôts et camions', /Matériel/i.test(menu) && /Stock/.test(menu) && /Fournisseurs, matériel & produits/.test(NB(menu)) && !/Dépôts et camions/.test(menu), NB(menu).replace(/\s+/g, ' ').slice(0, 200));
    await L.aller(p, 'stock');
    v('Julie : Stock s\'ouvre avec ses articles', await p.evaluate(() => document.querySelectorAll('.ms-l').length) >= 20);
    if (!(await p.evaluate(() => !!document.querySelector('.ms-l')))) { v('Julie : sans la page Stock, le reste du parcours est impossible', false); await L.fin(c); } else {
    v('Julie : aucun bandeau, aucun bouton « accepter » dans la page', await p.evaluate(() => !document.querySelector('.ms-bandeau') && !document.querySelector('[data-ms="toutacc"]') && !document.querySelector('[data-ms="envois"]')));
    await p.evaluate(() => msEnvois()); await p.waitForTimeout(250);
    v('Julie : même par la porte de l\'adresse, la feuille « Envois à accepter » ne s\'ouvre pas', await p.evaluate(() => !document.querySelector('#calque .panneau')));
    await p.evaluate(() => { document.querySelector('[data-ms="plus"]').click(); }); await p.waitForTimeout(250);
    const mj = await p.evaluate(() => [...document.querySelectorAll('.ctx button')].map(e => e.textContent.trim()));
    v('Julie : le menu Plus offre le registre, compter, exporter, annuler — pas de réglages', mj.some(t => /Registre/.test(t)) && mj.some(t => /Compter/.test(t)) && mj.some(t => /Exporter/.test(t)) && !mj.some(t => /Réglages/.test(t)), mj); await p.evaluate(() => fermerMenu());
    await p.evaluate(() => prFiche('p3')); await p.waitForTimeout(300);
    v('Julie : la fiche d\'article montre le prix d\'achat (elle prépare les commandes)', /Je l’achète/.test(await p.evaluate(() => document.querySelector('#calque').innerText)));
    await p.evaluate(() => document.querySelector('[data-ms^="fprixo|"]').click()); await p.waitForTimeout(200);
    const pv = await p.evaluate(() => { const e = document.querySelector('[data-msf="pv"]'); return e ? e.disabled : null; });
    v('Julie : le prix de VENTE n\'est pas modifiable (champ grisé, avec sa raison)', pv === true && /gérant/.test(await p.evaluate(() => document.querySelector('#calque').innerText)), pv);
    await p.evaluate(() => { fermerPanneau(); location.hash = '#boxes'; }); await p.waitForTimeout(700);
    v('Julie : #boxes (Dépôts et camions) ramène sur son écran d\'ouverture (la route est refusée)', await p.evaluate(() => route !== 'boxes'), await p.evaluate(() => route));
    await L.aller(p, 'produits'); await p.waitForTimeout(300);
    v('Julie : « Fournisseurs, matériel & produits » s\'ouvre', await p.evaluate(() => /Fournisseurs, matériel/.test((document.querySelector('#contenu h1') || {}).textContent || '')));
    v('Julie : aucune erreur de page', c.err.length === 0, c.err); await L.fin(c); } }
  // ── Sophie
  { const c = await L.ouvrir({ profil:'iphone', qui:'sm' }), p = c.p;
    await p.evaluate(() => { location.hash = '#stock'; }); await p.waitForTimeout(800);
    v('Sophie : #stock est refusé (elle reste sur son écran, sans lignes de stock)', await p.evaluate(() => route !== 'stock' && !document.querySelector('.ms-l')), await p.evaluate(() => route));
    v('Sophie : #produits aussi', await (async () => { await p.evaluate(() => { location.hash = '#produits'; }); await p.waitForTimeout(600); return p.evaluate(() => route !== 'produits'); })());
    await p.evaluate(() => { location.hash = '#moncamion'; }); await p.waitForTimeout(600);
    await p.evaluate(() => prFiche('p3')); await p.waitForTimeout(300);
    const t = NB(await p.evaluate(() => document.querySelector('#calque').innerText));
    v('Sophie : la fiche d\'article ne contient AUCUN €, prix, marge, valeur ni « Changer un prix »', !/€|Je l’achète|Je le vends|Marge|TVA|Changer un prix|Prix/.test(t), t.slice(0, 160));
    v('Sophie : elle y trouve « J\'ai utilisé » et « Il me manque » et rien d\'autre à faire', /J’ai utilisé/.test(t) && /Il me manque/.test(t) && !/Modifier|Retirer cet article|Ranger|Déplacer/.test(t));
    v('Sophie : aucune erreur de page', c.err.length === 0, c.err); await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
