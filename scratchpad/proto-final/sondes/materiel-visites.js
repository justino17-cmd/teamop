// Matériel, étape 5 (lot 6) — LES VISITES (guidée et parlées) visent des ATTRIBUTS, jamais des classes (spec § 9.11, § 12.5, § 13). Les seize `data-vis` de la spécification existent, sont visibles et ne
// sont pas recouverts, sur la page où la visite les cherche ; aucune étape des trois visites guidées ni des trois chapitres parlés ne vise une classe renommable (`.sk-liste`, `.bx-c`…) ; les anciens
// contrats DOM du § 12.5 ont disparu de la page. Chaque rubrique rejoue ses propres visites (« materiel-*-visites ») ; celle-ci tient le CONTRAT d'ensemble. Usage : node materiel-visites.js [profil] → « N ✓ · M ✗ »
const L = require('../lib.js'), fs = require('fs'), path = require('path');
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac';
  const src0 = fs.readFileSync(path.join(process.env.RACINE || path.join(__dirname, '..', '..', '..'), 'apercu', 'prototype-op-gestion.html'), 'utf8'), src = src0.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  // ───────── le texte des visites : chaque cible
  const tranche = (d, f) => { const i = src.indexOf(d), j = src.indexOf(f, i + d.length); return i < 0 ? '' : src.slice(i, j < 0 ? i + 9000 : j); };
  const visites = { 'visite guidée · Fournisseurs':tranche("tourPartie('produits'", "tourPartie('stock'"), 'visite guidée · Stock':tranche("tourPartie('stock'", "tourPartie('boxes'"), 'visite guidée · Dépôts':tranche("tourPartie('boxes'", "tourPartie('pointage'"),
    'visite parlée · Fournisseurs':tranche("immChap('produits'", "immChap('stock'"), 'visite parlée · Stock':tranche("immChap('stock'", "immChap('boxes'"), 'visite parlée · Dépôts':tranche("immChap('boxes'", "\nimmChap('") };
  let nCibles = 0; const classes = [], vis = new Set();
  for (const [nom, t] of Object.entries(visites)) {
    const cibles = [...t.matchAll(/(?:^|[\s{(,\[])(?:c|sel):\s*'((?:[^'\\]|\\.)*)'|\[\s*'(\[data-vis="[a-z-]+"\])'/gm)].map(m => (m[1] || m[2] || '').replace(/\\'/g, "'")).filter(Boolean);
    v('population : « ' + nom + ' » vise ' + cibles.length + ' cible(s)', cibles.length >= 2, cibles); nCibles += cibles.length;
    for (const sel of cibles) { for (const m of sel.matchAll(/\[data-vis="([a-z-]+)"\]/g)) vis.add(m[1]);
      // une classe n'est permise que dans « #calque .panneau » (le panneau qui s'ouvre) ou « #contenu .kpis » : le reste se renomme sans prévenir
      const sansOk = sel.replace(/#calque \.panneau/g, '').replace(/\[data-[a-z-]+[^\]]*\]/g, '');
      if (/\.[a-z]/i.test(sansOk)) classes.push(nom + ' : ' + sel); }
  }
  v('population : ' + nCibles + ' cibles lues dans les six visites', nCibles >= 25);
  v('aucune étape des visites ne vise une classe renommable (un attribut data-vis, un identifiant, un geste, ou le panneau)', classes.length === 0, classes);
  // « .pr-vues » vit encore : c'est le segmenté d'Achats et frais, qui n'est pas de ce groupe
  const vieux = ['.sk-liste', '.sx-afaire', '.sk-lieux', '.bxl-af', '.pr-pack', '#bxl-rok', '[data-sk="reassort"]', '[data-sk="fok"]', '[data-sk="onglet|valider"]'].filter(s => src.includes(s));
  v('les anciens contrats DOM du § 12.5 ont disparu de la page (' + vieux.length + ' restent)', vieux.length === 0, vieux);
  // ───────── les seize attributs de la spécification, sur leur page
  const SEIZE = { stock:['stock-tuiles', 'stock-maj', 'stock-liste', 'stock-bandeau', 'stock-lieu'], boxes:['depots-remplir', 'depots-cartes', 'depots-visites'], produits:['four-onglets', 'four-commander', 'four-photo', 'four-articles', 'four-fournisseurs'], moncamion:['camion-utilise', 'camion-manque', 'camion-cherche'] };
  v('population : la spécification en nomme 16', Object.values(SEIZE).flat().length === 16);
  const c = await L.ouvrir({ profil, qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a);
  const cible = async nom => R(n => { const e = document.querySelector('[data-vis="' + n + '"]'); if (!e) return { existe:false }; e.scrollIntoView({ block:'center' }); const b = e.getBoundingClientRect(), hautV = Math.max(b.top, 0), basV = Math.min(b.bottom, innerHeight), x = b.left + b.width / 2, y = (hautV + basV) / 2, t = document.elementFromPoint(x, y);   // un élément plus haut que l'écran se vise dans la partie qu'on VOIT
    return { existe:true, vu:b.width > 4 && b.height > 4 && getComputedStyle(e).visibility !== 'hidden', libre:!!t && (e.contains(t) || t.contains(e)) }; }, nom);
  const verifie = async (nom, ou) => { const r = await cible(nom); v('data-vis « ' + nom + ' » (' + ou + ') : existe, se voit, rien ne le recouvre', r.existe && r.vu && r.libre, r); };
  await L.aller(p, 'stock'); await L.calme(p, 400); for (const n of SEIZE.stock) await verifie(n, 'Stock');
  await L.aller(p, 'boxes'); await L.calme(p, 400); for (const n of SEIZE.boxes) await verifie(n, 'Dépôts et camions');
  await L.aller(p, 'produits'); await R(() => { prVue = 'commandes'; rendre(); }); await L.calme(p, 400); for (const n of ['four-onglets', 'four-commander', 'four-photo']) await verifie(n, 'Fournisseurs › Commandes');
  await R(() => { prVue = 'articles'; rendre(); }); await L.calme(p, 300); await verifie('four-articles', 'Fournisseurs › Articles');
  await R(() => { prVue = 'fournisseurs'; rendre(); }); await L.calme(p, 300); await verifie('four-fournisseurs', 'Fournisseurs › Fournisseurs');
  await L.fin(c);
  const ct = await L.ouvrir({ profil, qui:'sm' }), q = ct.p; await L.aller(q, 'moncamion'); await L.calme(q, 500);
  const cibleT = n => q.evaluate(n => { const e = document.querySelector('[data-vis="' + n + '"]'); if (!e) return { existe:false }; e.scrollIntoView({ block:'center' }); const b = e.getBoundingClientRect(), t = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(b.height / 2, 24)); return { existe:true, vu:b.width > 4 && b.height > 4, libre:!!t && (e.contains(t) || t.contains(e)) }; }, n);
  for (const n of SEIZE.moncamion) { const r = await cibleT(n); v('data-vis « ' + n + ' » (Mon camion) : existe, se voit, rien ne le recouvre', r.existe && r.vu && r.libre, r); }
  v('toutes les cibles data-vis des visites existent dans la page (aucune faute de frappe) : ' + [...vis].join(', '), [...vis].every(n => src.includes('\'' + n + '\'') || src.includes('"' + n + '"')), [...vis].filter(n => !src.includes('\'' + n + '\'') && !src.includes('"' + n + '"')));
  v('aucune erreur de page', c.err.length === 0 && ct.err.length === 0, [...c.err, ...ct.err].slice(0, 3));
  await L.fin(ct); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 100) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
