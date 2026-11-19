// RESTES CONTRATS, tour 6 : le prix d'un contrat se lit par la RÈGLE COMMUNE des montants (cxNum / cxMontantRefus), en VALEURS ABSOLUES :
// « 12 € », « 12€ », « 1.000,50 » se lisent ; « 0x10 » se refuse ; 20 chiffres = « trop grand » ; chaque refus dit sa VRAIE raison (jamais « au moins 1 € » pour
// autre chose) ; le champ et le toast disent la même phrase ; 1.005 reste 1,01 € ; aucun NaN, aucune erreur de page, un refus ne consomme pas de numéro.
// usage : node restes-contrats-6.js [profil] [nuit] → « N ✓ · M ✗ »
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }), p = c.p; await L.calme(p, 400);
  const CAS = [   // [saisie, rangé attendu | null, morceau de la phrase de refus]
    ['12 €', 12], ['12€', 12], ['12 euros', 12], ['480', 480], ['1.000,50', 1000.5], ['1 000,50 €', 1000.5], ['1,000.50', 1000.5], ['1.005', 1.01], ['1000000', 1000000],
    ['0x10', null, /ne se lit pas/], ['1e5', null, /ne se lit pas/], ['abc', null, /ne se lit pas/], ['-5', null, /ne se lit pas/], ['1,2,3', null, /ne se lit pas/],
    ['99999999999999999999', null, /trop grand/], ['123456789012345678901234', null, /trop grand/], ['1000000,01', null, /trop grand/], ['1234567890123', null, /trop grand/],
    ['0', null, /trop bas.*au moins 1 €/], ['0,5', null, /trop bas.*au moins 1 €/], ['', null, /Indique le prix/], ['   ', null, /Indique le prix/]];
  for (const [saisie, attendu, phrase] of CAS) {
    await O.neuf(c, 'contrat-nouveau'); await p.fill('[data-b="prix"]', saisie); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(p, 250);
    const n0 = await p.evaluate(() => [CONTRATS.length, ctrNum()]); const e0 = c.err.length;
    const champ = await p.evaluate(() => { const f = document.querySelector('[data-b="prix"]'); return { val: f.value, aide: f.parentElement.querySelector('.faible.mini').textContent.replace(/\s+/g, ' ').trim() }; });
    await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 400);
    const r = await p.evaluate(a => ({ n: CONTRATS.length, num: ctrNum(), prix: CONTRATS.length > a[0] ? CONTRATS[CONTRATS.length - 1].prix : null, toast: ((document.getElementById('toast') || {}).textContent || '').replace(/\s+/g, ' ').trim(), page: document.getElementById('contenu').textContent }), n0);
    const t = JSON.stringify(saisie), creeLa = r.n > n0[0];
    v(t + ' : aucune erreur de page, aucun NaN / ∞ / undefined à l’écran', c.err.length === e0 && !/NaN|Infinity|∞|undefined/.test(r.page), { err: c.err.slice(e0), toast: r.toast });
    v(t + ' : le champ garde le texte tapé (rien n’est réécrit sous les doigts)', champ.val === saisie, champ.val);
    if (attendu != null) {
      v(t + ' : créé, prix rangé = ' + attendu, creeLa && r.prix === attendu, { creeLa, prix: r.prix, toast: r.toast });
      v(t + ' : le champ ne parle pas de refus (il annonce le TTC)', /TTC/.test(champ.aide), champ.aide);
    } else {
      v(t + ' : refusé (rien n’est rangé, aucun numéro consommé)', !creeLa && r.num === n0[1], { creeLa, num: r.num, avant: n0[1] });
      v(t + ' : le toast dit la VRAIE raison', phrase.test(r.toast), r.toast);
      v(t + ' : le champ dit la même phrase', phrase.test(champ.aide), champ.aide);
      if (!/trop bas/.test(String(phrase))) v(t + ' : « au moins 1 € » n’est dit que pour un prix trop bas', !/au moins 1 €/.test(r.toast + champ.aide), r.toast + ' | ' + champ.aide);
    }
  }
  // le prix change de modèle : un prix tapé en « 12 € » n'est pas écrasé par le modèle (il se lit)
  await O.neuf(c, 'contrat-nouveau'); await p.fill('[data-b="prix"]', '12 €'); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(p, 250);
  const mods = await p.evaluate(() => [...document.querySelectorAll('[data-b="modele"] option')].map(o => o.value));
  if (mods.length > 1) { await p.selectOption('[data-b="modele"]', mods[1]); await L.calme(p, 300); const val = await p.evaluate(() => document.querySelector('[data-b="prix"]').value); v('changer de modèle garde un prix tapé « 12 € » (lu, pas écrasé)', val === '12 €', val); }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
