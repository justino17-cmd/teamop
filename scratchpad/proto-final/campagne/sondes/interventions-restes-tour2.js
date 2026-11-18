// RESTES « Interventions », tour 2 : le total d'une ligne de facture est plafonné (prix ET quantité, avec un message), un relevé numérique refuse « 3 sur 18 » / « 10-12 » au lieu de les recoller, la température a un clavier avec le signe moins. Regarde aussi les écrans (captures).
// usage : node interventions-restes-tour2.js <profil> [nuit]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }); const p = c.p, v = L.v; const ev = (f, a) => p.evaluate(f, a);
  const CAPN = n => I.CAP + `restes2-${profil}${nuit ? '-nuit' : ''}-${n}.png`;
  const poser = async (sel, val) => { await ev(([s, x]) => { const e = document.querySelector(s); e.focus(); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, val]); await L.calme(p, 700); };
  const toast = () => ev(() => { const t = document.getElementById('toast'); return t ? t.textContent : ''; });
  // — facture (celle de i7, que la technicienne vient de terminer : le bureau la relit)
  const tap = sel => L.toucher(c, sel, { delai: 4000 });
  await I.devenir(c, 'tl', 'inter-x-i7'); await ev(() => { const F = fiche('i7'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Fait.'; F.signature = 'signee'; F.suite = {}; }); await tap('[data-action="terminer"]'); await L.calme(p, 600);
  if (await ev(() => /Noter les pièces/.test((document.querySelector('#calque .panneau') || {}).textContent || ''))) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first(), { delai: 4000 });
  const fid = await ev(() => { const x = FACTURES.find(o => o.int === 'i7'); return x && x.id; }); v('population : la facture de i7 existe', !!fid, fid);
  await I.devenir(c, 'marc', 'facture-x-' + fid);
  const n = await ev(() => document.querySelectorAll('[data-fqte]').length); v('population : la facture a des lignes modifiables', n > 0, n);
  await poser('[data-fqte="0"]', '1'); await poser('[data-prix="0"]', '999999,99');
  await poser('[data-fqte="0"]', '9999'); let t = await toast(); let l = await ev(() => { const f = FACTURES.find(x => /./.test(x.id) && lignesDe(x).length && document.querySelector('[data-fqte="0"]')); return document.querySelector('[data-fqte="0"]').value; });
  v('quantité 9999 × 999 999,99 refusée avec un message', /total de cette ligne/.test(t) && l === '1', [t, l]);
  await L.capture(c, CAPN('1-quantite'));
  await poser('[data-prix="0"]', '1000'); await poser('[data-fqte="0"]', '10'); await poser('[data-prix="0"]', '500000'); t = await toast(); const pu = await ev(() => document.querySelector('[data-prix="0"]').value);
  v('prix 500 000 × 10 refusé avec un message, ancien prix gardé', /total de cette ligne/.test(t) && pu !== '500000', [t, pu]);
  await L.capture(c, CAPN('2-prix'));
  const tot = await ev(() => document.querySelector('#contenu').innerText); v('aucun total de milliards à l’écran', !/\d{1,3}(?:[\s  ]\d{3}){3}/.test(tot), 0);
  await poser('[data-prix="0"]', '1000'); await poser('[data-fqte="0"]', '10'); const q = await ev(() => document.querySelector('[data-fqte="0"]').value); v('10 × 1 000 € (10 000 €) reste accepté', q === '10', q);
  // — relevé
  await I.devenir(c, 'sm', 'inter-x-i1');
  const cl = await ev(() => ({ t: document.querySelector('[data-releve="Soufflage"]').getAttribute('inputmode'), k: document.querySelector('[data-releve="Charge de fluide"]').getAttribute('inputmode') }));
  v('clavier : le °C a le signe moins, le kg reste décimal', cl.t === 'text' && cl.k === 'decimal', cl);
  for (const [val, att] of [['3 sur 18', ''], ['10-12', ''], ['-5', '-5'], ['2,4 kg', '2,4'], ['1 2', ''], ['12', '12']]) {
    await poser('[data-releve="Soufflage"]', ''); await poser('[data-releve="Soufflage"]', val); const r = await ev(() => document.querySelector('[data-releve="Soufflage"]').value);
    v(`relevé « ${val} » → « ${att} »`, r === att, r); if (val === '3 sur 18') { const m = await toast(); v('« 3 sur 18 » : un message le dit', /Un seul nombre/.test(m), m); await L.capture(c, CAPN('3-releve-refuse')); } }
  await poser('[data-releve="Soufflage"]', '-5'); await ev(() => document.querySelector('[data-releve="Soufflage"]').scrollIntoView({ block: 'center' })); await L.calme(p, 300); await L.capture(c, CAPN('4-releve-negatif'));
  const dd = await L.deborde(c); v('la fiche ne glisse pas de côté', dd.bouge === 0, dd);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
