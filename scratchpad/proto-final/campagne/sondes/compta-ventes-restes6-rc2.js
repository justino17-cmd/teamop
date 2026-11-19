// Recontrôle adverse, tour 6 (2) : la ligne d'acompte fabriquée par la VRAIE porte (devis accepté + facture d'acompte → facture du solde) porte son drapeau et résiste aux saisies,
// puis le refus se LIT (capture). Usage : node compta-ventes-restes6-rc2.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p;
  const r0 = await p.evaluate(() => { const dv = dvInit().find(x => x.int && x.e === 'accepte'); if (!dv) return { dv: false };
    const i = INTS.find(o => o.id === dv.int); if (!i) return { dv: true, i: false };
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = null; delete dv.facSolde; delete dv.facAcompte; dv.acompte = 30; dv.acompteHT = undefined; dvAcompte(dv, true);
    const F = fiche(i.id); F.debut = F.debut || '08:00'; F.fin = F.fin || '09:50'; factureDepuis(i);
    const f = FACTURES.find(x => x.id === 'f-' + i.id); const ac = f ? f.lignes.findIndex(l => /Acompte/.test(l.d)) : -1;
    return { dv: true, i: true, id: i.id, f: !!f, ac, ligne: ac >= 0 ? f.lignes[ac] : null, n: f ? f.lignes.length : 0 }; });
  console.log('  ·', JSON.stringify(r0));
  L.v('population : un devis accepté lié à une intervention, une facture du solde avec sa ligne d’acompte', r0.dv && r0.i && r0.f && r0.ac >= 0, JSON.stringify(r0));
  L.v('la ligne d’acompte fabriquée par la vraie porte porte son drapeau et un prix négatif', !!r0.ligne && r0.ligne.acompte === true && r0.ligne.pu < 0, JSON.stringify(r0.ligne));
  await X.fiche(c, 'f-' + r0.id);
  const lg = () => p.evaluate(id => lignesDe(FACTURES.find(x => x.id === 'f-' + id)).map(l => ({ d: l.d, q: l.q, pu: l.pu, total: totLigne(l) })), r0.id);
  const ht0 = await p.evaluate(id => htDe(FACTURES.find(x => x.id === 'f-' + id)), r0.id);
  const attendre = () => p.waitForFunction(() => { const t = document.getElementById('toast'); return !t || t.hidden || !t.textContent.trim(); }, null, { timeout: 6000 }).catch(() => {});
  const ch = async (a, k, v) => { await attendre(); const e = p.locator('[data-' + a + '="' + k + '"]').first(); await e.fill(v); await e.press('Tab'); await L.calme(p, 350); return X.toasts(p); };
  const L0 = await lg(), k = r0.ac, pu0 = L0[k].pu;
  for (const [a, v] of [['prix', ''], ['prix', '50'], ['prix', String(pu0).replace('.', ',')], ['prix', '-1'], ['prix', 'abc'], ['fqte', '2'], ['fqte', '0,5'], ['fqte', '1 h']]) {
    const t = await ch(a, k, v), l = (await lg())[k];
    L.v('acompte réel : « ' + v + ' » dans ' + (a === 'prix' ? 'le prix' : 'la quantité') + ' : prix ' + pu0 + ' et quantité « 1 » gardés, une phrase', l.pu === pu0 && l.q === '1' && t.length > 20, l.pu + ' · ' + l.q + ' · ' + t); }
  L.v('le Total HT n’a pas bougé', (await p.evaluate(id => htDe(FACTURES.find(x => x.id === 'f-' + id)), r0.id)) === ht0, '');
  // la désignation de l'acompte peut-elle le faire disparaître ? (doute noté, pas un verdict) et le retrait de la ligne
  const ret = await p.evaluate(k => { const b = [...document.querySelectorAll('[data-fsuppr],[data-fdel],[data-retirer]')].length; return b; }, k); console.log('  · boutons de retrait de ligne trouvés :', ret);
  await L.capture(c, '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/r6rc/rc-acompte-' + profil + (nuit ? '-nuit' : '') + '.png');
  await L.fermer(c); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
