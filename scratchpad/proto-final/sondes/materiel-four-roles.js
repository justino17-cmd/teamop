// Matériel, étape 4 (Fournisseurs, matériel & produits) — QUI VOIT QUOI (spec § 4 et § 7) : Marc (gérant) a tout ; Julie (bureau) prépare, envoie et reçoit les commandes, comparer les factures, change un prix d'achat —
// mais ne peut NI ajouter NI retirer un fournisseur, NI retirer un article ; Sophie (technicienne) n'a pas la rubrique et son DOM ne porte AUCUN prix.
// Usage : node materiel-four-roles.js → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, NB = s => String(s).replace(/[  ]/g, ' ');
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a); await L.aller(p, 'produits');
    v('Marc : « Fournisseurs, matériel & produits » est dans son menu et s\'ouvre', await R(() => /Fournisseurs, matériel/.test(NB(document.getElementById('menu').innerText)) && document.querySelector('#contenu h1').textContent === 'Fournisseurs, matériel & produits'));
    await R(() => { prVue = 'fournisseurs'; rendre(); });
    v('Marc : sur Fournisseurs il a « ＋ Ajouter un fournisseur »', await R(() => !!document.querySelector('#contenu .fx-tete [data-fo="liste"]')));
    await R(() => fournFiche('cpa')); await R(() => document.querySelector('#calque [data-fx^="fplus|"]').click()); await p.waitForTimeout(200);
    v('Marc : le menu Plus de la fiche porte « Ce n’est plus mon fournisseur »', await R(() => [...document.querySelectorAll('.ctx button')].some(b => /Ce n’est plus mon fournisseur/.test(b.textContent))));
    await R(() => { fermerMenu(); fermerPanneau(); prVue = 'articles'; rendre(); }); await R(() => prFiche('p3'));
    v('Marc : la fiche d’un article porte « Retirer cet article »', await R(() => !!document.querySelector('#calque [data-pr^="retirer|"]')));
    v('Marc : aucune erreur de page', c.err.length === 0, c.err); await L.fin(c); }
  { const c = await L.ouvrir({ profil:'mac', qui:'julie' }), p = c.p, R = (f, a) => p.evaluate(f, a);
    const menu = await R(() => NB(document.getElementById('menu').innerText));
    v('Julie : son menu porte Stock et Fournisseurs, matériel & produits, JAMAIS « Dépôts et camions »', /Stock/.test(menu) && /Fournisseurs, matériel/.test(menu) && !/Dépôts et camions/.test(menu), menu.replace(/\s+/g, ' ').slice(0, 200));
    await L.aller(p, 'produits');
    const pg = await R(() => ({ h1:document.querySelector('#contenu h1').textContent, onglets:document.querySelectorAll('.fx-seg button').length, photo:!!document.querySelector('[data-vis="four-photo"]'), prep:document.querySelectorAll('[data-cm^="preparer|"]').length, recep:document.querySelectorAll('.fx-ab[data-cm^="recep|"]').length, nouvelle:!!document.querySelector('[data-ce="nouvelle"]') }));
    v('Julie : elle ouvre la rubrique (Commandes d’abord), prépare les commandes, reçoit les livraisons, photographie une facture', pg.h1 === 'Fournisseurs, matériel & produits' && pg.onglets === 3 && pg.photo && pg.prep >= 3 && pg.recep >= 1 && pg.nouvelle, pg);
    await R(() => { prVue = 'fournisseurs'; rendre(); });
    const fo = await R(() => ({ ajout:!!document.querySelector('#contenu .fx-tete [data-fo="liste"]'), noirs:document.querySelectorAll('#contenu .fx-tete .btn:not(.gris)').length, cartes:document.querySelectorAll('.fx-c').length }));
    v('Julie : sur Fournisseurs, AUCUN « ＋ Ajouter un fournisseur » (le bouton est ABSENT, pas grisé), mais elle voit les cartes (' + fo.cartes + ')', !fo.ajout && fo.noirs === 0 && fo.cartes >= 5, fo);
    await R(() => fournFiche('cpa')); await R(() => document.querySelector('#calque [data-fx^="fplus|"]').click()); await p.waitForTimeout(200);
    const mfo = await R(() => [...document.querySelectorAll('.ctx button')].map(b => NB(b.textContent)));
    v('Julie : le menu Plus de la fiche ne propose PAS « Ce n’est plus mon fournisseur »', mfo.length === 1 && /articles habituels/.test(mfo[0]) && !mfo.some(t => /plus mon fournisseur/.test(t)), mfo);
    await R(() => { fermerMenu(); document.querySelector('#calque [data-fochamp="cpa|compte"]').value = 'CPA-9999'; document.querySelector('#calque [data-fochamp="cpa|compte"]').dispatchEvent(new Event('change', { bubbles:true })); });
    v('Julie : elle corrige le compte d’un fournisseur (fiche : oui)', await R(() => MES_FOURN.find(f => f.id === 'cpa').compte) === 'CPA-9999'); await R(() => { MES_FOURN.find(f => f.id === 'cpa').compte = 'CPA-4471'; fermerPanneau(); });
    await R(() => { prVue = 'articles'; rendre(); }); await R(() => prFiche('p3'));
    const ar = await R(() => ({ retirer:!!document.querySelector('#calque [data-pr^="retirer|"]'), modifier:!!document.querySelector('#calque [data-pr^="modif|"]') }));
    v('Julie : sur la fiche d’un article elle peut Modifier mais ne peut pas « Retirer cet article »', ar.modifier && !ar.retirer, ar);
    await R(() => { fermerPanneau(); });
    v('Julie : aucune erreur de page', c.err.length === 0, c.err); await L.fin(c); }
  { const c = await L.ouvrir({ profil:'iphone', qui:'sm' }), p = c.p, R = (f, a) => p.evaluate(f, a);
    await R(() => { location.hash = '#produits'; }); await p.waitForTimeout(900);
    const t = await R(() => ({ route, h1:(document.querySelector('#contenu h1') || {}).textContent || '', fx:document.querySelectorAll('.fx-tete, .fx-seg, [data-cm], [data-fo]').length, txt:NB(document.getElementById('contenu').innerText) }));
    v('Sophie : la route #produits ne s’ouvre pas (aucun onglet, aucune commande, aucun fournisseur dans son écran)', t.route !== 'produits' && t.fx === 0 && !/Fournisseurs, matériel/.test(t.h1), t);
    v('Sophie : AUCUN €, aucun prix d’achat, aucune marge, aucun nom de fournisseur dans son écran', !/€|marge|Clim Pièces|Frigo Distribution|Daikin/.test(t.txt), t.txt.slice(0, 200));
    const menu = await R(() => NB(document.getElementById('menu').innerText) + NB((document.getElementById('tabbar') || { innerText:'' }).innerText));
    v('Sophie : ni son menu ni sa barre du bas ne portent la rubrique', !/Fournisseurs, matériel|Fournisseurs/.test(menu), menu.replace(/\s+/g, ' ').slice(0, 160));
    v('Sophie : aucune erreur de page', c.err.length === 0, c.err); await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 120) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
