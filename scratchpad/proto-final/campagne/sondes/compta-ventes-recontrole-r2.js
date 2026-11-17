// Recontrôle adverse « compta-ventes », parcours R2 (17 novembre 2026) : ce que les corrections d'avoir et de paiement ont pu casser À CÔTÉ.
// Marc encaisse en partie une facture en retard PUIS l'annule par un avoir ; annule une facture envoyée dont le client avait annoncé un virement ;
// puis on regarde partout où une facture annulée pourrait encore se montrer comme « à faire » : tâches, courrier, Accueil, fiche client, cadre.
// usage : node compta-ventes-recontrole-r2.js [profil] [qui] [jour|nuit]     « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
const cts = n => Math.round(n * 100);
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc', nuit = process.argv[4] === 'nuit', tag = `${profil}-${qui}-${nuit ? 'nuit' : 'jour'}`;
  const c = await L.ouvrir({ profil, qui, nuit }), p = c.p;
  const d0 = await X.donnees(p), du0 = await X.du(p);
  L.v('population : 8 factures, 1 475,00 € à recevoir', d0.F.length === 8 && du0 === 147500, { n: d0.F.length, du0 });
  console.log('  factures :', JSON.stringify(d0.F.map(f => [f.id, f.num, f.st, f.recu])));
  console.log('  annonces :', JSON.stringify(await p.evaluate(() => FACTURES.filter(f => f.annonce).map(f => [f.id, f.num, f.st, f.annonce]))));
  // — 1. encaissement partiel d'une facture EN RETARD, puis avoir —
  await X.fiche(c, 'f128'); await L.toucher(c, '[data-action="partiel"]'); await X.saisir(c, '#pp-m', '500'); await L.toucher(c, '#calque [data-action="partielOk"]'); await L.calme(p, 400);
  let a = await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'f128'); return { st: f.st, recu: f.recu, reste: restant(f) }; });
  console.log('  après 500 € :', JSON.stringify(a));
  await X.fiche(c, 'f128'); const offre = await p.evaluate(() => !!document.querySelector('[data-action="avoir"]'));
  console.log('  avoir offert sur une facture en retard payée en partie :', offre);
  await L.capture(c, X.CAP + `r2-${tag}-retard-partielle.png`);
  const enc0 = (await X.donnees(p)).E.length;
  if (offre) {
    await L.toucher(c, '[data-action="avoir"]'); const dlg = await X.panneau(p); console.log('  fenêtre :', dlg.replace(/\n/g, ' ').slice(0, 400));
    await L.toucher(c, '#calque [data-action="avoirOk"]'); await L.calme(p, 400);
    const b = await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'f128'); return { st: f.st, recu: f.recu, reste: restant(f), av: FACTURES.find(x => x.st === 'avoir' && x.objet === 'Avoir sur ' + f.num) && Math.round(FACTURES.find(x => x.st === 'avoir' && x.objet === 'Avoir sur ' + f.num).ht * 100), ttc: Math.round(ttcDe(f) * 100) }; });
    console.log('  après avoir :', JSON.stringify(b));
    await X.fiche(c, 'f128'); const t = await X.texte(p, '#contenu'); console.log('  fiche annulée :', t.replace(/\n/g, ' | ').slice(0, 500));
    L.v('R2-1 · une facture annulée par un avoir qui avait reçu 500 € ne laisse pas ces 500 € sans explication (la fiche le dit : à rembourser, ou le montant de l’avoir tient compte)', /500|rembours/i.test(t) || b.av === 50000 / 1.2 , { b });
  }
  // — 2. facture envoyée dont le client a annoncé un paiement —
  const ann = await p.evaluate(() => FACTURES.filter(f => f.annonce).map(f => f.id)); console.log('  factures avec paiement annoncé :', ann);
  // — 3. où une facture annulée se montre-t-elle encore ? —
  await X.fiche(c, 'f143'); await L.toucher(c, '[data-action="avoir"]'); await L.toucher(c, '#calque [data-action="avoirOk"]'); await L.calme(p, 400);
  const st143 = await p.evaluate(() => FACTURES.find(x => x.id === 'f143').st); L.v('f143 annulée', st143 === 'annulee', st143);
  for (const [nom, h] of [['accueil', 'accueil'], ['taches', 'taches'], ['messages', 'courrier'], ['clients', 'clients'], ['historique', 'historique']]) {
    try { await p.evaluate(x => aller(x), h); await L.calme(p, 600); } catch (e) { console.log('  route', h, 'KO', e.message.slice(0, 60)); continue; }
    const t = await X.texte(p, '#contenu'); const m = t.split('\n').filter(l => /0143|Cabinet|Restaurant/.test(l)).slice(0, 6);
    console.log(`  ${nom} (${t.length} signes) · lignes qui parlent de la facture 0143 :`, JSON.stringify(m));
    await L.capture(c, X.CAP + `r2-${tag}-${nom}.png`);
  }
  console.log('  tâches ouvertes qui visent une facture :', JSON.stringify(await p.evaluate(() => (typeof TACHES !== 'undefined' ? TACHES : []).filter(t => t.facture || t.fac || (t.lien && t.lien.t === 'facture')).map(t => [t.id, t.titre || t.t, t.etat, t.facture || t.fac || (t.lien && t.lien.id)]))));
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
