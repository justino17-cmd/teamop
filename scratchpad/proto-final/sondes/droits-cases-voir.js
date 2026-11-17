// CHAQUE case « Voir » : pour chacune des dix catégories, décocher « Voir » à une personne qui a tout le reste ferme EXACTEMENT les routes que la table dit, et les retire du menu, de la barre, de la recherche
// « Aller à », des raccourcis ⌘ 1-9 ; recocher les rend. Population : lignes et routes comptées avant et après. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, etatPersonne, toast, fin } = require('./droits-commun.js');
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
const TOUT = Object.fromEntries(CATS.map(c => [c, '1111']));
// ce que ferme chaque case « Voir » (spécification § 2.6 ; les routes qui exigent DEUX cases sont fermées par chacune des deux)
const FERME = {
  planif:['planning', 'absences'], inter:['interventions', 'inter', 'registre'], crm:['clients', 'client', 'clientvoit'],
  ventes:['devis', 'contrats', 'contrat', 'contrat-nouveau', 'signer', 'devisXylo', 'factures', 'facture', 'encaissements'], compta:['comptabilite', 'factures', 'encaissements'],
  stock:['stock', 'produits', 'boxes', 'carteBox'], temps:['pointage', 'vehicules'], com:['boiteMail'], achats:['achats'], admin:['accueil', 'statistiques', 'historique', 'equipe', 'entreprise']
};
(async () => {
  const c = await ouvrirComme({ k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false, cases:TOUT, sp:{ prix:1, atelier:1, valstock:1, commander:1, corrpt:1, comptes:1 } });
  const R = await c.p.evaluate(() => [...new Set([...Object.keys(vues()), ...Object.keys(ROUTE_DROIT)])].filter(x => x !== 'espaceclient').sort());
  const lire = () => c.p.evaluate(() => ({ permis:[...new Set([...Object.keys(vues()), ...Object.keys(ROUTE_DROIT)])].filter(x => x !== 'espaceclient' && rlPermis(x)).sort(), lignes:rlLignes().map(x => x.k), barre:rlOnglets().map(o => o.k), pal:rcRubriques().map(x => x.k) }));
  const base = await lire(); let nLignes = 0, nRoutes = 0, nCats = 0;
  for (const cat of CATS) {
    await c.p.evaluate(k => { eqDe('rp').droits.cats[k] = { v:0, c:0, m:0, s:0 }; }, cat);
    const ap = await lire(); const ferme = base.permis.filter(r => !ap.permis.includes(r)).sort(), att = FERME[cat].filter(r => base.permis.includes(r)).sort();
    v(`« Voir » décoché pour ${cat} : ferme exactement ${att.join(', ')}`, JSON.stringify(ferme) === JSON.stringify(att), { ferme, att });
    const lignesPerdues = base.lignes.filter(k => !ap.lignes.includes(k)); nLignes += lignesPerdues.length; nRoutes += ferme.length; nCats++;
    v(`${cat} : les lignes perdues du menu sont des routes fermées, la barre et la recherche lisent le même menu`, lignesPerdues.every(k => ferme.includes(k)) && JSON.stringify(ap.pal) === JSON.stringify(ap.lignes) && ap.barre.every(k => ap.lignes.includes(k)), { lignesPerdues, ap:ap.barre });
    // l'adresse tapée à la main : refusée, la raison est « case »
    if (ferme.length) { const r = await c.p.evaluate(x => droitRaison(x), ferme[0]); v(`${cat} : l'adresse #${ferme[0]} est fermée par la CASE (« ${r} »)`, r === 'case', r); }
    await c.p.evaluate(k => { eqDe('rp').droits.cats[k] = { v:1, c:1, m:1, s:1 }; }, cat);
    const re = await lire(); v(`${cat} : recoché, tout revient`, JSON.stringify(re.permis) === JSON.stringify(base.permis), null);
  }
  v('population : dix catégories, des routes fermées (≥ 25) et des lignes de menu perdues (≥ 12), comptées', nCats === 10 && nRoutes >= 25 && nLignes >= 12, { nCats, nRoutes, nLignes });
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c); await fin();
})().catch(e => { console.error(e); process.exit(1); });
