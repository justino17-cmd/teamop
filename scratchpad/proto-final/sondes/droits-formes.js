// LA FORME d'écran : une personne qui ne travaille pas sur le terrain n'a jamais les cinq écrans personnels (#mesheures tapé → refus « pas dans ton espace ») ; un terrain n'a jamais un écran d'équipe ;
// changer « Travaille sur le terrain » change la coque, le menu, la barre et l'ouverture À L'INSTANT (par la vraie ouverture de session), sans recharger. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, etatPersonne, toast, fin } = require('./droits-commun.js');
const PERSO = ['majournee', 'techfrais', 'mesheures', 'moncamion'], EQUIPE = ['planning', 'interventions', 'clients', 'devis', 'comptabilite', 'achats', 'stock', 'equipe', 'pointage', 'vehicules', 'boiteMail', 'accueil'];
(async () => {
  let nPerso = 0, nEquipe = 0;
  // 1. une personne du bureau qui a TOUTES les cases : aucun écran personnel
  const c = await ouvrirComme({ k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false, cases:Object.fromEntries(['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'].map(k => [k, '1111'])), sp:{ atelier:1, valstock:1, commander:1, corrpt:1, comptes:1 } });
  for (const r of PERSO) { const raison = await c.p.evaluate(x => droitRaison(x), r); nPerso++; v(`personne du bureau (toutes les cases) : #${r} est fermé par la FORME`, raison === 'forme', raison); }
  await c.p.evaluate(() => { location.hash = '#mesheures'; }); await L.calme(c.p, 500);
  v('#mesheures tapé : « Cette page n’est pas dans ton espace. » et retour à l\'ouverture', (await toast(c.p)).includes('Cette page n’est pas dans ton espace.') && (await c.p.evaluate(() => location.hash)) !== '#mesheures', await toast(c.p));
  const bureau = await etatPersonne(c.p); v('personne du bureau : aucune ligne personnelle au menu', PERSO.every(k => !bureau.lignes.includes(k)), bureau.lignes);
  await L.fin(c);
  // 2. un terrain qui a TOUTES les cases : aucun écran d'équipe, malgré ses cases
  const t = await ouvrirComme({ k:'tr', prenom:'Théo', nom:'Terrain', pd:'tech', terrain:true, cases:Object.fromEntries(['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'].map(k => [k, '1111'])) });
  for (const r of EQUIPE) { const raison = await t.p.evaluate(x => droitRaison(x), r); nEquipe++; v(`terrain (toutes les cases) : #${r} est fermé par la FORME`, raison === 'forme', raison); }
  const eT = await etatPersonne(t.p); v('terrain : son menu est celui des cinq écrans personnels', eT.lignes.join() === 'majournee,taches,techfrais,mesheures,moncamion,absences' && eT.role === 'tech', eT);
  await L.fin(t);
  // 3. le changement de forme se voit à l'instant : on décoche « Travaille sur le terrain » de Sophie, puis on ouvre l'application COMME elle (la vraie ouverture de session)
  const g = await ouvrirComme('marc');
  const av = await g.p.evaluate(() => { sessionOuvrir('sm'); return { role:ROLE, lignes:rlLignes().map(x => x.k), barre:rlOnglets().map(o => o.k), ouv:rlOuverture() }; }); await L.calme(g.p, 500);
  await g.p.evaluate(() => { sessionOuvrir('marc'); eqDe('sm').terrain = false; eqxSynchro(); });
  const ap = await g.p.evaluate(() => { sessionOuvrir('sm'); return { role:ROLE, lignes:rlLignes().map(x => x.k), barre:rlOnglets().map(o => o.k), ouv:rlOuverture() }; }); await L.calme(g.p, 600);
  v('Sophie terrain : coque « tech », ouverture « majournee »', av.role === 'tech' && av.ouv === 'majournee' && av.lignes.includes('moncamion'), av);
  v('Sophie décochée : coque « gestion » (le bureau), plus de journée ni de camion, barre recomposée, ouverture changée', ap.role === 'gestion' && !ap.lignes.includes('majournee') && !ap.lignes.includes('moncamion') && !ap.barre.includes('majournee') && ap.ouv !== 'majournee', ap);
  const errs = g.err.length; v('aucune erreur de page (le planning, l\'Équipe, le passé de Sophie restent lisibles)', errs === 0, g.err.slice(0, 3));
  v('population : 4 écrans personnels et 12 écrans d\'équipe testés', nPerso === 4 && nEquipe === 12, { nPerso, nEquipe });
  await L.fin(g); await fin();
})().catch(e => { console.error(e); process.exit(1); });
