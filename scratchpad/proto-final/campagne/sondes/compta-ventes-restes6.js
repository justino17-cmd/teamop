// Restes compta-ventes, tour 6 : (1) la ligne d'acompte est VERROUILLÉE (prix et quantité), (2) une UNITÉ INCONNUE est refusée avec une phrase,
// (3) la commande fournisseur arrondit son total de ligne comme le devis et la facture, « Prix unitaire HT », (4) « Forfait main-d'œuvre » n'accepte « 90 min » que si sa quantité est en heures.
// Usage : node compta-ventes-restes6.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p;
  await p.evaluate(() => { const i = INTS.find(o => o.cli && o.st !== 'annulee' && !o.fact) || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'temps', tva: 10 }; F.debut = '08:00'; F.fin = '09:50';
    F.pieces = [{ nom: 'Nettoyant échangeur', q: '0,5 L', pu: 10.33 }]; factureDepuis(i); FACTURES.find(f => f.id === 'f-' + i.id).id = 'fx-r6';
    const f = FACTURES.find(x => x.id === 'fx-r6'); f.lignes = lignesDe(f);
    f.lignes.push({ acompte: true, d: 'Acompte de 30 % déjà facturé', q: '1', pu: -50 });          // celle que fabrique factureDepuis (drapeau)
    f.lignes.push({ d: 'Acompte ancien sans drapeau', q: '1', pu: -20 });                           // une ligne d'avant le drapeau : le prix négatif la désigne
    f.lignes.push({ d: 'Forfait main-d’œuvre déplacement', q: '1', pu: TARIFS.horaire });
    f.lignes.push({ d: 'Forfait main-d’œuvre mise en route', q: '2h', pu: TARIFS.horaire }); rendre(); });
  await X.fiche(c, 'fx-r6');
  const lg = () => p.evaluate(() => lignesDe(FACTURES.find(x => x.id === 'fx-r6')).map(l => ({ d: l.d, q: l.q, pu: l.pu, total: totLigne(l) })));
  const ht = () => p.evaluate(() => htDe(FACTURES.find(x => x.id === 'fx-r6')));
  const attendre = () => p.waitForFunction(() => { const t = document.getElementById('toast'); return !t || t.hidden || !t.textContent.trim(); }, null, { timeout: 6000 }).catch(() => {});
  const ch = async (a, k, v) => { await attendre(); const e = p.locator('[data-' + a + '="' + k + '"]').first(); await e.fill(v); await e.press('Tab'); await L.calme(p, 350); return X.toasts(p); };
  const L0 = await lg(), kA = 3, kB = 4, kF = 5, kH = 6, kP = 2;
  L.v('population : 7 lignes (main-d’œuvre, déplacement, pièce, deux acomptes, deux forfaits)', L0.length === 7 && L0[kA].pu === -50 && L0[kB].pu === -20, JSON.stringify(L0.map(l => l.q + '@' + l.pu)));
  const h0 = await ht();
  // 1. acompte
  for (const [k, nom] of [[kA, 'acompte (drapeau)'], [kB, 'acompte sans drapeau']]) {
    const pu0 = L0[k].pu;
    let t = await ch('fqte', k, '2'); let r = (await lg())[k];
    L.v(nom + ' : quantité « 2 » refusée avec la phrase de l’acompte, la ligne reste à ' + pu0, r.q === '1' && r.total === pu0 && /acompte se reprend/.test(t), r.q + ' · ' + r.total + ' · ' + t);
    t = await ch('prix', k, ''); r = (await lg())[k];
    L.v(nom + ' : prix effacé refusé, la déduction reste', r.pu === pu0 && /acompte se reprend/.test(t), r.pu + ' · ' + t);
    t = await ch('prix', k, '50'); r = (await lg())[k];
    L.v(nom + ' : « 50 » ne devient pas un +50 € facturé', r.pu === pu0 && /acompte se reprend/.test(t), r.pu + ' · ' + t);
    t = await ch('prix', k, String(pu0).replace('.', ',')); r = (await lg())[k];
    L.v(nom + ' : retaper le même montant est aussi refusé, avec une phrase juste (pas « fais un avoir »)', r.pu === pu0 && /acompte se reprend/.test(t) && !/avoir/.test(t), t);
  }
  L.v('le Total HT n’a pas bougé après ces huit essais', (await ht()) === h0, (await ht()) + ' / ' + h0);
  // 2. unités inconnues
  const uni = [['3 forfaits', 1], ['250 mL', 1], ['2 kg', 1], ['5 m', 1], ['3 jours', 1]];
  for (const [v] of uni) { const t = await ch('fqte', kF, v), r = (await lg())[kF];
    L.v('« ' + v + ' » sur le déplacement refusé avec une phrase, quantité d’avant « 1 »', r.q === '1' && /sais pas compter/.test(t) && r.total === 65, r.q + ' · ' + r.total + ' · ' + t); }
  { const t = await ch('fqte', kP, '250 mL'), r = (await lg())[kP];
    L.v('« 250 mL » sur la pièce au flacon (0,5 L) refusé : le flacon reste à 10,33 €', /sais pas compter/.test(t) && Math.abs(r.total - 10.33) < .006, r.q + ' · ' + r.total + ' · ' + t); }
  for (const [v, att] of [['0,5 l', 10.33], ['0,5L', 10.33], ['2', 20.66], ['3', 30.99], ['2 u', 20.66], ['2 pièces', 20.66]]) { await ch('fqte', kP, v); const r = (await lg())[kP];
    L.v('pièce « ' + v + ' » acceptée : ' + att + ' €', Math.abs(r.total - att) < .006, r.q + ' · ' + r.total); }
  for (const [v, att] of [['2h', 130], ['1h30', 97.5], ['2 h', 130], ['90 min', 97.5], ['2 heures', 130]]) { await ch('fqte', 0, v); const r = (await lg())[0];
    L.v('main-d’œuvre « ' + v + ' » toujours lue : ' + att + ' €', Math.abs(r.total - att) < .006, r.q + ' · ' + r.total); }
  // 4. forfait
  { const t = await ch('fqte', kF, '90 min'), r = (await lg())[kF];
    L.v('« Forfait main-d’œuvre » en quantité 1 : « 90 min » refusé (la quantité n’est pas en heures), reste 65 €', r.q === '1' && r.total === 65 && /durée en minutes/.test(t), r.q + ' · ' + r.total + ' · ' + t); }
  { const t = await ch('fqte', kH, '90 min'), r = (await lg())[kH];
    L.v('« Forfait main-d’œuvre » dont la quantité est en heures (2h) : « 90 min » accepté = 97,50 €', Math.abs(r.total - 97.5) < .006, r.q + ' · ' + r.total + ' · ' + t); }
  await L.capture(c, X.CAP.replace('campagne-compta-ventes/', 'cv-r6/') + 'r6-facture-' + profil + (nuit ? '-nuit' : '') + '.png');
  // 3. commande fournisseur : 3 × 12,345 €
  const cm = await p.evaluate(() => { const c = { id: 'cmd-r6', four: (COMMANDES[0] || {}).four, st: 'brouillon', lignes: [{ nom: 'Pièce test', ref: 'T-1', q: 3, pu: 12.345 }, { nom: 'Autre', ref: 'T-2', q: 3, pu: 12.345 }], liv: 'atelier' };
    return { ligne: cmdLigneHT(c.lignes[0]), ht: cmdHT(c), puT: cmdPuTexte(12.345), puT2: cmdPuTexte(12.3), tva: cmdTVA(c), franco: cmdFranco({ four: c.four, lignes: c.lignes.map(l => ({ q: l.q, pu: l.pu })) }).ht }; });
  L.v('commande : 3 × 12,345 € = 37,04 € la ligne, 74,08 € les deux (le total retombe sur ses lignes)', cm.ligne === 37.04 && cm.ht === 74.08, JSON.stringify(cm));
  L.v('commande : le prix 12,345 s’écrit « 12,345 », 12,3 s’écrit « 12,30 »', cm.puT === '12,345' && cm.puT2 === '12,30', cm.puT + ' · ' + cm.puT2);
  L.v('commande : le seuil de livraison gratuite compte le même HT', cm.franco === 74.08, cm.franco);
  await L.fermer(c); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
