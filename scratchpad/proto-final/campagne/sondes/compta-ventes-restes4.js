// Restes compta-ventes, tour 4 : les trois casses du recontrôle du tour 3, JOUÉES dans la vraie fenêtre d'une facture à valider.
//  1. une durée en MINUTES (« 90 min », « 45 mn », « 90 minutes ») sur la main-d'œuvre vaut des heures (jamais 90 × le prix de l'heure) ; sur une ligne qui n'est pas à l'heure, elle est REFUSÉE avec une phrase ;
//  2. les totaux de ligne affichés s'additionnent au Total HT affiché (au centime), quantité fractionnaire comprise ;
//  3. une pièce préparée retapée avec une autre casse ou sans espace (« 0,5 l », « 0,5L ») garde son total.
// Usage : node compta-ventes-restes4.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', nuit: process.argv[3] === 'nuit', qui: 'marc' }), p = c.p;
  await p.evaluate(() => { const i = INTS.find(o => o.cli && o.st !== 'annulee' && !o.fact) || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'temps', tva: 10 }; F.debut = '08:00'; F.fin = '09:50';
    F.pieces = [{ nom: 'Nettoyant échangeur', q: '0,5 L', pu: 10.33 }]; factureDepuis(i); FACTURES.find(f => f.id === 'f-' + i.id).id = 'fx-r4'; });
  await X.fiche(c, 'fx-r4');
  const lg = () => p.evaluate(() => lignesDe(FACTURES.find(x => x.id === 'fx-r4')).map(l => ({ d: l.d, q: l.q, qn: l.qn, total: totLigne(l) })));
  const saisir = async (k, v) => { const l = p.locator('[data-fqte="' + k + '"]').first(); await l.fill(v); await l.press('Tab'); await L.calme(p, 350); };
  const L0 = await lg();
  L.v('population : une ligne de main-d’œuvre à l’heure, un déplacement, une pièce en litres', L0.length === 3 && /h$/.test(L0[0].q) && !/h|L/.test(L0[1].q) && /L$/.test(L0[2].q), JSON.stringify(L0.map(l => l.q)));
  const pu0 = await p.evaluate(() => lignesDe(FACTURES.find(x => x.id === 'fx-r4'))[0].pu);
  // 1. minutes
  for (const [v, att] of [['90 min', 97.5], ['45 mn', 48.75], ['90 minutes', 97.5], ['30 min', 32.5], ['50 min', 54.17], ['2 h', 130], ['1h30', 97.5]]) {
    await saisir(0, v); const l = (await lg())[0];
    L.v(`main-d’œuvre « ${v} » = ${att} € (le prix de l’heure ${pu0} €)`, Math.abs(l.total - att) < 0.006, l.total);
  }
  for (const v of ['0 min', '0,0 mn']) { await saisir(0, '1h'); await saisir(0, v); const l = (await lg())[0], t = await X.toasts(p);
    L.v(`« ${v} » refusé : la quantité d'avant reste (${l.q})`, l.q === '1h' && /supérieur à zéro/.test(t), l.q + ' · ' + t); }
  await saisir(0, '2 h');
  // minutes sur une ligne qui n'est pas à l'heure : refusées, dites
  for (const v of ['30 min', '45 mn']) { await saisir(1, v); const l = (await lg())[1], t = await X.toasts(p);
    L.v(`« ${v} » sur le déplacement : refusé avec une phrase, la quantité reste « 1 »`, l.q === '1' && l.total === 29.17 && /durée en minutes/.test(t) && /heure/.test(t), l.q + ' · ' + l.total + ' · ' + t); }
  await L.capture(c, X.CAP + 'restes4-minutes-refusees-' + (process.argv[2] || 'mac') + '.png');
  // 3. casse et espaces de la pièce
  for (const v of ['0,5 l', '0,5L', '0,5 L', '0,5 l', ' 0,5  L ']) { await saisir(2, v); const l = (await lg())[2];
    L.v(`pièce « ${v} » = le même flacon (10,33 €)`, Math.abs(l.total - 10.33) < 0.006, l.total); }
  for (const [v, att] of [['1', 10.33], ['2', 20.66], ['250 mL', 2582.5]]) { await saisir(2, v); const l = (await lg())[2];
    L.v(`pièce « ${v} » : l'ancienne règle tient (${att} €)`, Math.abs(l.total - att) < 0.006, l.total); }
  await saisir(2, '0,5 L');
  // 2. addition des lignes
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-r4'); f.lignes = lignesDe(f); f.lignes[1].q = '2,5'; f.lignes[1].qn = 2.5; f.lignes[1].pu = 10.33; f.lignes.push({ d: 'Joint', q: '2,5', qn: 2.5, pu: 10.33 }, { d: 'Filtre', q: '2,5', qn: 2.5, pu: 10.33 }); rendre(); });
  await L.calme(p, 450);
  const aff = await p.evaluate(() => { const num = s => Math.round(parseFloat(s.replace(/[^\d,-]/g, '').replace(',', '.')) * 100);
    const lignes = [...document.querySelectorAll('.dv-lg .dv-tot')].map(e => num(e.textContent)), ht = [...document.querySelectorAll('tfoot tr')].map(r => r.innerText.replace(/\s+/g, ' ').trim());
    return { lignes, ht }; });
  const sHT = (aff.ht.find(t => /^Total HT/.test(t)) || '').match(/([\d\s.,]+)\s?€/);
  const htAff = sHT ? Math.round(parseFloat(sHT[1].replace(/[\s ]/g, '').replace(',', '.')) * 100) : null;
  L.v('population : au moins trois totaux de ligne fractionnaires lus à l’écran', aff.lignes.filter(x => x === 2583).length >= 3, JSON.stringify(aff.lignes));
  L.v('les totaux de ligne affichés s’additionnent au Total HT affiché', aff.lignes.reduce((s, x) => s + x, 0) === htAff, aff.lignes.reduce((s, x) => s + x, 0) + ' contre ' + htAff);
  const TTC = await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-r4'); return { ht: htDe(f), ttc: ttcDe(f) }; });
  L.v('le TTC part du HT au centime', Math.abs(TTC.ttc - Math.round(TTC.ht * 110) / 100) < 0.006, JSON.stringify(TTC));
  await L.capture(c, X.CAP + 'restes4-totaux-' + (process.argv[2] || 'mac') + (process.argv[3] === 'nuit' ? '-nuit' : '') + '.png');
  await L.fermer(c); L.bilan();
})().catch(e => { console.error(e); process.exit(1); });
