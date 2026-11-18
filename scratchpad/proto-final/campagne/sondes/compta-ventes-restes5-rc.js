// Recontrôle adverse, tour 5 (restes compta-ventes) : ce que les corrections du tour 5 cassent À CÔTÉ.
//  1. une ligne à l'heure dont le PRIX a été retapé garde-t-elle ses minutes ? (la désignation ne fait plus l'heure)
//  2. la ligne d'acompte (prix négatif) : effacer son prix, retaper sa quantité — l'acompte se retourne-t-il ou disparaît-il sans un mot ?
//  3. le prix négatif / illisible : les phrases se lisent-elles, le champ revient-il au prix d'avant ?
//  4. le drapeau l.heure survit-il (aperçu, envoi, comptabilité) et la quantité « 90 min » s'y lit-elle ?
//  5. une ligne qui n'est PAS à l'heure (pièce, forfait) ne devient pas « à l'heure » par un prix égal à celui de l'heure
// Usage : node compta-ventes-restes5-rc.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p;
  await p.evaluate(() => { const i = INTS.find(o => o.cli && o.st !== 'annulee' && !o.fact) || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'temps', tva: 10 }; F.debut = '08:00'; F.fin = '09:50'; F.pieces = [];
    factureDepuis(i); FACTURES.find(f => f.id === 'f-' + i.id).id = 'fx-rc5'; });
  await X.fiche(c, 'fx-rc5');
  const lg = () => p.evaluate(() => lignesDe(FACTURES.find(x => x.id === 'fx-rc5')).map(l => ({ d: l.d, q: l.q, qn: l.qn, pu: l.pu, heure: l.heure, q0: l.q0, total: totLigne(l) })));
  const ch = async (a, k, v) => { const e = p.locator('[data-' + a + '="' + k + '"]').first(); await e.fill(v); await e.press('Tab'); await L.calme(p, 350); };
  const L0 = await lg(); console.log('  · lignes de départ :', JSON.stringify(L0));
  const kmo = L0.findIndex(l => /main.d.œuvre|heure/i.test(l.d));
  L.v('population : une ligne de main-d’œuvre à l’heure au départ', kmo >= 0, JSON.stringify(L0.map(l => l.d)));
  // 1. prix de la main-d'œuvre retapé (remise de 65 à 60), puis « 90 min »
  await ch('prix', kmo, '60'); await ch('fqte', kmo, '90 min'); let t = await X.toasts(p); let r = (await lg())[kmo];
  console.log('  · prix 60 puis « 90 min » :', JSON.stringify(r), '· toast « ' + t + ' »');
  L.v('la ligne à l’heure dont le prix a été remisé accepte toujours « 90 min » (90 min × 60 € = 90 €)', Math.abs(r.total - 90) < 0.006, JSON.stringify(r) + ' · ' + t);
  // 1 bis. quantité ordinaire « 1 » (la ligne perd son drapeau), prix de l'heure remisé, puis minutes
  await ch('fqte', kmo, '1'); await ch('fqte', kmo, '30 min'); t = await X.toasts(p); r = (await lg())[kmo];
  console.log('  · « 1 » puis « 30 min » :', JSON.stringify(r), '· toast « ' + t + ' »');
  L.v('après « 1 » puis « 30 min » sur la même ligne : soit 30 € soit une phrase vraie, jamais 0 ni 60 ×', Math.abs(r.total - 30) < 0.006 || (/heure/.test(t) && r.q === '1'), JSON.stringify(r) + ' · ' + t);
  // 2. forfait « Déplacement » à 65 € (le prix de l'heure) : NE devient PAS une ligne à l'heure
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-rc5'); f.lignes = lignesDe(f); f.lignes.push({ d: 'Forfait main-d’œuvre déplacement', q: '1', pu: TARIFS.horaire }); rendre(); }); await L.calme(p, 400);
  const kf = (await lg()).length - 1;
  await ch('fqte', kf, '90 min'); t = await X.toasts(p); r = (await lg())[kf];
  console.log('  · forfait main-d’œuvre à ' + 65 + ' € + « 90 min » :', JSON.stringify(r), '· toast « ' + t + ' »');
  L.v('population : la ligne forfait existe', kf > kmo, kf + ' ' + kmo);
  // 3. l'acompte : effacer son prix, retaper sa quantité
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-rc5'); f.lignes = lignesDe(f); f.lignes.push({ d: 'Acompte de 30 % déjà facturé', q: '1', pu: -50 }); rendre(); }); await L.calme(p, 400);
  const ka = (await lg()).length - 1;
  const ht0 = await p.evaluate(() => htDe(FACTURES.find(x => x.id === 'fx-rc5')));
  await ch('fqte', ka, '2'); r = (await lg())[ka]; t = await X.toasts(p);
  console.log('  · acompte, quantité « 2 » :', JSON.stringify(r), '· toast « ' + t + ' »');
  L.v('la quantité de la ligne d’acompte ne double pas la déduction en silence (garde ou phrase)', r.pu !== -50 || r.total === -50 || /acompte/.test(t), JSON.stringify(r) + ' · ' + t);
  await ch('fqte', ka, '1');
  await ch('prix', ka, '');
  r = (await lg())[ka]; t = await X.toasts(p); const ht1 = await p.evaluate(() => htDe(FACTURES.find(x => x.id === 'fx-rc5')));
  const btnEnvoi = await p.evaluate(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return b ? !b.disabled : null; });
  console.log('  · acompte, prix effacé :', JSON.stringify(r), '· Total HT avant', ht0, 'après', ht1, '· « Aperçu et envoi » actif :', btnEnvoi, '· toast « ' + t + ' »');
  L.v('prix de l’acompte effacé : la ligne devient « à chiffrer » et l’envoi est bloqué (l’acompte ne disparaît pas sans bloquer)', r.pu === null ? btnEnvoi === false : true, JSON.stringify({ r, btnEnvoi }));
  // 4. retaper « -50 » sur l'acompte
  await ch('prix', ka, '-50'); r = (await lg())[ka]; t = await X.toasts(p);
  console.log('  · acompte, prix « -50 » retapé :', JSON.stringify(r), '· toast « ' + t + ' »');
  // 5. phrases lisibles : champ prix d'une ligne libre
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-rc5'); f.lignes = lignesDe(f); f.lignes.push({ d: 'Pièce libre', q: '1', pu: 12 }); rendre(); }); await L.calme(p, 400);
  const kp = (await lg()).length - 1;
  const champ = k => p.locator('[data-prix="' + k + '"]').first().inputValue();
  for (const v of ['−5', '–5', '12abc', '1e3', '0', '1 000,5', '12,345', '-0']) { await ch('prix', kp, v); const l = (await lg())[kp], tt = await X.toasts(p), cv = await champ(kp);
    console.log('  · prix « ' + v + ' » → pu ' + l.pu + ' · champ « ' + cv + ' » · toast « ' + tt + ' »');
    L.v('prix « ' + v + ' » : le champ montre ce que la ligne porte', cv === (l.pu == null ? '' : String(l.pu).replace('.', ',')), cv + ' / ' + l.pu); }
  // 6. aperçu et envoi : la quantité « 90 min » se lit dans le document
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-rc5'); f.lignes = lignesDe(f).filter(l => l.pu != null && l.pu > 0); rendre(); }); await L.calme(p, 400);
  await ch('fqte', kmo, '90 min');
  await p.evaluate(() => apercuEnvoi({ dataset: { id: 'fx-rc5' } })).catch(() => {}); await L.calme(p, 600);
  const pan = await X.panneau(p).catch(() => ''); console.log('  · aperçu :', pan.slice(0, 500).replace(/\n/g, ' | '));
  L.v('le panneau d’aperçu s’est ouvert (population)', pan.length > 50, pan.length);
  L.v('l’aperçu dit « 90 min » sans « NaN », « undefined » ni « [object »', /90 min/.test(pan) && !/NaN|undefined|\[object/.test(pan), pan.slice(0, 200));
  await L.capture(c, X.CAP.replace('campagne-compta-ventes/', 'cv-rc5/') + 'rc5-apercu-' + profil + (nuit ? '-nuit' : '') + '.png');
  await L.fermer(c); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
