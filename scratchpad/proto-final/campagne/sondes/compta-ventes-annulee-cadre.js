// Une facture ENVOYÉE annulée par un avoir (compta-ventes-06) doit sortir du « à encaisser » du cadre plein écran de la Comptabilité,
// comme elle sort de celui d'OP GESTION : une seule comptabilité. Joue la VRAIE action (avoir, puis avoirOk), puis lit le cadre.
// usage : node compta-ventes-annulee-cadre.js [profil]      « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const du0 = await X.du(p);
  await p.evaluate(() => { ACTIONS.avoirOk({ dataset: { id: 'f143' } }); });
  const hote = await p.evaluate(() => ({ st: FACTURES.find(f => f.id === 'f143').st, du: Math.round(FACTURES.filter(f => ['envoyee', 'retard', 'partielle'].includes(f.st)).reduce((s, f) => s + restant(f), 0) * 100) }));
  L.v('population : la facture 0143 était à recevoir avant, elle est annulée après', du0 > hote.du && hote.st === 'annulee', { du0, hote });
  const f = await X.cadreOuvert(c); L.v('le cadre est ouvert', !!f);
  await f.evaluate(() => { try { aller('ventes'); } catch (e) {} }); await p.waitForTimeout(900);
  const cad = await f.evaluate(() => ({ lignes: [...document.querySelectorAll('#contenu tbody tr')].map(tr => tr.innerText.replace(/\s+/g, ' ').trim()), kpi: [...document.querySelectorAll('#contenu .kpi')].map(k => k.innerText.replace(/\s+/g, ' ').trim()) }));
  const l143 = cad.lignes.find(l => /FAC-2026-0143/.test(l)) || '';
  await L.capture(c, X.CAP + `annulee-cadre-${profil}.png`);
  L.v('population : la ligne de la facture 0143 est dans le cadre', !!l143, cad.lignes.length);
  L.v('compta-ventes-06 · le cadre ne dit plus « à encaisser » ni « en retard » pour la facture annulée', !!l143 && !/À encaisser|En retard/.test(l143), l143);
  const kAenc = cad.kpi.find(k => /encaisser|recevoir/i.test(k)) || '';
  L.v('compta-ventes-06 · le chiffre « à encaisser » du cadre = celui d’OP GESTION', L.cents((kAenc.match(/[\d\s\u00a0\u202f]+,\d\d/) || [''])[0]) === hote.du, { kAenc, hote: hote.du });
  L.v('compta-ventes-06 · la ligne dit « Annulée par un avoir » (ni « Payée », ni « À encaisser »)', /Annulée par un avoir/.test(l143) && !/Payée/.test(l143), l143);
  const filtres = await f.evaluate(() => [...document.querySelectorAll('.cmpt-filtres .seg button')].map(b => b.textContent.trim()));
  L.v('la pastille « Payées » ne compte pas la facture annulée (et « À encaisser » non plus)', filtres.some(t => /^Payées \(5\)/.test(t)) && filtres.some(t => /^À encaisser \(2\)/.test(t)), filtres);
  await f.evaluate(() => document.querySelector('#contenu tr[data-fac="FAC-2026-0143"]').click()); await p.waitForTimeout(600);
  const pan = await f.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
  L.v('le panneau de la facture annulée dit « Annulée par un avoir », sans « Relancer maintenant »', /Annulée par un avoir/.test(pan) && !/Relancer maintenant/.test(pan), pan.slice(0, 200));
  await L.capture(c, X.CAP + `annulee-cadre-panneau-${profil}.png`);
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
