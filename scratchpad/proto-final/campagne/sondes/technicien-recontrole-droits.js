// Recontrôle ADVERSE de la partie « technicien » (17 novembre 2026) : ce que les corrections ont cassé à côté, et ce que le technicien ne doit PAS voir.
// 01 (la note de pied) : la contre-épreuve — une personne du BUREAU à moitié ouverte la lit toujours ; 07 (retourSure) : le bureau revient où il était ;
// adresses tapées à la main vers chaque écran du bureau ; aucun prix ni montant sur les écrans du technicien ; les interventions des autres.
// Usage : node technicien-recontrole-droits.js [profil] [nuit=0|1] [qui=sm|kb]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien-recontrole/';
const devenir = async (p, k, h) => { await p.evaluate(([k, h]) => { if (SESSION) sessionFermer('deconnexion'); sessionOuvrir(k); aller(h); }, [k, h]); await L.calme(p, 800); };
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, s);
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', qui = process.argv[4] || 'sm', J = nuit ? 'nuit' : 'jour';
  const c = await L.ouvrir({ profil, qui, nuit, hash: 'majournee' }), p = c.p;
  const toast = () => p.evaluate(() => { const e = document.getElementById('toast'); return e ? e.textContent.trim() : ''; });
  // ── 1. ce que le technicien ne voit PAS : chaque écran du bureau, tapé à la main (location.hash), puis par aller()
  const bureau = await p.evaluate(() => Object.keys(ROUTE_DROIT).filter(r => !droitVoit(r)));
  const ouverts = await p.evaluate(() => Object.keys(ROUTE_DROIT).filter(r => droitVoit(r)));
  console.log('   fermés :', bureau.join(','), '\n   ouverts :', ouverts.join(','));
  v('D0 population : le technicien a des écrans fermés ET des écrans ouverts', bureau.length >= 15 && ouverts.length >= 6, { f: bureau.length, o: ouverts.length });
  const fuites = [];
  for (const r of bureau) {
    await L.aller(p, 'majournee');
    await p.evaluate(x => { location.hash = '#' + x; }, r); await L.calme(p, 450);
    const e = await p.evaluate(() => ({ h: location.hash, h1: (document.querySelector('#contenu h1') || {}).textContent || '', t: document.getElementById('contenu').textContent.replace(/\s+/g, ' ').trim().slice(0, 90), route: typeof route !== 'undefined' ? route : '' }));
    if (e.route === r || e.h === '#' + r && /€|Chiffre|Factures|Devis|Facture/.test(e.t) && e.route === r) fuites.push({ r, e });
  }
  v('D1 aucun écran du bureau ne s’ouvre par une adresse tapée à la main', fuites.length === 0, fuites.slice(0, 5));
  // ── 2. des écrans à paramètre : l'intervention d'un AUTRE technicien, une fiche client, un devis, une facture
  const autres = await p.evaluate(qui => INTS.filter(i => i.tech !== qui).map(i => i.id).slice(0, 4), qui);
  const miennes = await p.evaluate(qui => INTS.filter(i => i.tech === qui).map(i => i.id), qui);
  v('D2 population : des interventions d’autres personnes ET les siennes existent', autres.length >= 2 && miennes.length >= 2, { autres, miennes });
  const vus = [];
  for (const id of autres) { await L.aller(p, 'majournee'); await p.evaluate(x => { location.hash = '#inter-x-' + x; }, id); await L.calme(p, 450);
    const e = await p.evaluate(() => ({ route: route, h1: (document.querySelector('#contenu h1') || {}).textContent || '' })); if (/^inter-x/.test(e.route) || /^inter/.test(e.route)) vus.push({ id, e, toast: await toast() }); }
  console.log('   interventions des autres ouvertes par adresse :', JSON.stringify(vus));
  v('D3 l’intervention d’un AUTRE technicien ne s’ouvre pas par adresse tapée', vus.length === 0, vus.slice(0, 3));
  const aut = [];
  for (const h of ['client-x-vp', 'facture-x-f1', 'devis-x-d1', 'contrat-x-c1', 'contrat-nouveau', 'signer']) { await L.aller(p, 'majournee'); await p.evaluate(x => { location.hash = '#' + x; }, h); await L.calme(p, 450);
    const e = await p.evaluate(() => ({ route: route, t: document.getElementById('contenu').textContent.replace(/\s+/g, ' ').trim().slice(0, 100) })); if (e.route === h) aut.push({ h, e }); }
  console.log('   fiches à paramètre ouvertes :', JSON.stringify(aut));
  v('D4 ni fiche client, ni devis, ni facture, ni contrat par adresse tapée', aut.length === 0, aut);
  // ── 3. aucun prix, aucun montant du bureau sur les écrans du technicien (hors ses propres notes de frais)
  const prix = [];
  for (const r of ['majournee', 'taches', 'techfrais', 'mesheures', 'moncamion', 'absences', 'inter-x-' + miennes[0], 'inter-x-' + (miennes[1] || miennes[0])]) { await L.aller(p, r); await L.calme(p, 500);
    const t = await p.evaluate(() => document.getElementById('contenu').textContent.replace(/\s+/g, ' ')); const m = [...t.matchAll(/(.{40})(\d[\d  .,]*\s?€|\bTVA\b|\bHT\b|\bTTC\b|marge|prix de vente|tarif|chiffre d.affaires)(.{20})/gi)].map(x => x[0]);
    if (m.length) prix.push({ r, m: m.slice(0, 4) }); }
  console.log('   montants / prix relevés :', JSON.stringify(prix, null, 0).slice(0, 1400));
  /* ses PROPRES montants (l'argent qu'elle a sur elle, la TVA de SA note de frais) sont à elle ; ce qui est du bureau (marge, tarif, prix de vente, chiffre d'affaires, HT/TTC d'un devis) ne doit jamais paraître */
  const duBureau = prix.map(x => ({ r: x.r, m: x.m.filter(s => /marge|tarif|prix de vente|chiffre|\bHT\b|\bTTC\b/i.test(s) || (!/techfrais/.test(x.r) && /TVA/.test(s))) })).filter(x => x.m.length);
  v('D5 aucun prix, marge, tarif ni chiffre du bureau sur ses écrans (ses propres frais mis à part)', duBureau.length === 0, duBureau);
  await L.capture(c, CAP + `droits-${qui}-${profil}-${J}.png`);
  // ── 4. contre-épreuve de 01 : Julie (bureau) à moitié ouverte lit TOUJOURS la note ; Marc (gérant) jamais
  await devenir(p, 'julie', 'accueil');
  const rj = await p.evaluate(() => { const q = eqDe(acteur()); const res = []; for (const r of Object.keys(ROUTE_DROIT)) { if (!droitVoit(r)) continue; aller(r); const n = document.querySelectorAll('#contenu .droits-note').length; res.push([r, n]); } return res; });
  const avecNote = rj.filter(x => x[1] > 0);
  console.log('   Julie, rubriques avec une note :', JSON.stringify(avecNote), '/ ouvertes :', rj.length);
  v('D6 contre-épreuve de technicien-01 : une personne du bureau à moitié ouverte lit toujours la note de pied', avecNote.length >= 1, { ouvertes: rj.length, avecNote });
  // ── 5. 07 : le bureau revient où il était — et la fiche, sans historique, ramène à SA liste
  for (const [k, base, h] of [['julie', 'interventions', 'inter-x-i2'], ['marc', 'interventions', 'inter-x-i2']]) {
    const c2 = await L.ouvrir({ profil, qui: k, nuit, hash: h }), p2 = c2.p; await L.calme(p2, 600);
    await p2.evaluate(() => { const b = document.querySelector('[data-retour]'); b && b.click(); }); await L.calme(p2, 600);
    const e = await p2.evaluate(() => ({ route, h1: (document.querySelector('#contenu h1') || {}).textContent || '' }));
    v(`D7 ${k} : « Retour » d’une fiche ouverte par adresse ramène à sa liste (${base})`, e.route === base, e);
    await L.fin(c2); }
  // 07 encore : une personne SANS la catégorie Interventions mais avec une fiche ouverte par lien : retour vers sa première rubrique, pas d'erreur
  v('Z aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
