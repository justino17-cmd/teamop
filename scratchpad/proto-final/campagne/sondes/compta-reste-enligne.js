// « Paiement en ligne » (cadre prototype-paiement.html dans Trésorerie) : payer une facture par carte DANS le module, puis demander à OP GESTION
// si cette facture est payée. Question de Justin : « est-elle payée dans OP GESTION ? ». « N ✓ · M ✗ », code 1 si un contrôle tombe.
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  await X.compta(c, 'enligne'); await p.waitForTimeout(1500);
  const f = L.cadre(p, /prototype-paiement\.html/); v('EL0 le module de paiement est ouvert dans Trésorerie › Paiement en ligne', !!f);
  const hote = () => p.evaluate(() => { const g = id => FACTURES.find(x => x.num === id); return { f143: { st: g('FAC-2026-0143').st, recu: g('FAC-2026-0143').recu || 0 }, enc: ENCAISSEMENTS.length, du: Math.round(FACTURES.filter(x => ['envoyee', 'retard', 'partielle'].includes(x.st)).reduce((s, x) => s + restant(x), 0) * 100) }; });
  const mod = () => f.evaluate(() => { const x = S.factures.find(y => y.num === 'FAC-2026-0143'); return { etat: etatFac(x), paiements: S.paiements.filter(q => q.fid === x.id).map(q => q.mode + ':' + q.etat), tests: Object.keys(S.tests).length }; });
  const h0 = await hote(), m0 = await mod();
  console.log('avant : OP GESTION', JSON.stringify(h0), '| module', JSON.stringify(m0));
  await L.capture(c, X.CAP + `${profil}-enligne-ouverture.png`);
  const boutons = async () => f.evaluate(() => [...document.querySelectorAll('[data-cli],[data-act]')].filter(e => e.offsetParent).map(e => (e.dataset.cli ? 'cli=' : 'act=') + (e.dataset.cli || e.dataset.act) + ' « ' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) + ' »'));
  // 1) « Voir chez le client » sur la facture du cabinet dentaire (la 0143, 114 € dans OP GESTION)
  await f.locator('[data-act="voir|f143"]').first().click({ timeout: 6000 }).catch(e => console.log('voir', e.message.slice(0, 80))); await p.waitForTimeout(600);
  console.log('écran du client :', (await boutons()).join(' · '));
  for (const sel of ['[data-cli="moyen|carte"]', '[data-cli="payer-carte"]']) { await f.locator(sel).first().click({ timeout: 5000 }).catch(e => console.log('clic', sel, e.message.slice(0, 60))); await p.waitForTimeout(500); console.log(sel, '→', (await boutons()).join(' · ')); }
  await L.capture(c, X.CAP + `${profil}-enligne-client.png`);
  await f.locator('[data-cli="3ds|ok"]').first().click({ timeout: 5000 }).catch(e => console.log('3ds', e.message.slice(0, 60))); await p.waitForTimeout(900);
  const m1 = await mod(), h1 = await hote(); console.log('après : OP GESTION', JSON.stringify(h1), '| module', JSON.stringify(m1));
  await L.capture(c, X.CAP + `${profil}-enligne-apres.png`);
  v('EL1 le client a payé la facture 0143 par carte DANS le module', /payee|paye|ok/i.test(m1.etat) || m1.paiements.some(x => /carte:reussi/.test(x)), m1);
  v('EL2 OP GESTION voit cette facture payée (compta-ventes-20 : le module n’est pas relié)', h1.f143.st === 'payee' && h1.du < h0.du, { avant: h0, apres: h1 });
  v('EL3 le paiement apparaît dans les encaissements d’OP GESTION', h1.enc > h0.enc, { avant: h0.enc, apres: h1.enc });
  v('EL erreurs JavaScript : aucune', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
