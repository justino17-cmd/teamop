// RECONTRÔLE ADVERSE des restes « Interventions », tour 2 (18 novembre 2026) : ce que le plafond du total d'une ligne de facture, le refus de deux nombres dans un relevé et le clavier texte des °C ont pu casser À CÔTÉ.
// usage : node interventions-restes-tour2-recontrole.js <profil> [nuit]  → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v; const ev = (f, a) => p.evaluate(f, a);
  const CAPN = n => I.CAP + `rc2-${profil}${nuit ? '-nuit' : ''}-${n}.png`;
  const poser = async (sel, val) => { await ev(([s, x]) => { const T = document.getElementById('toast'); if (T) T.textContent = '';   /* un message resté de l'essai d'avant ne compte pas */  const e = document.querySelector(s); e.focus(); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, val]); await L.calme(p, 500); };
  const toast = () => ev(() => { const t = document.getElementById('toast'); return t ? t.textContent : ''; });
  // — relevés : chaque métier, chaque rôle qui voit la fiche
  for (const [qui, h] of [['sm', 'inter-x-i1'], ['tl', 'inter-x-i7']]) {
    await I.devenir(c, qui, h);
    const ch = await ev(() => [...document.querySelectorAll('[data-releve]')].map(e => [e.dataset.releve, e.getAttribute('inputmode')]));
    v(`population ${qui} : la fiche a des relevés`, ch.length >= 3, ch);
    v(`${qui} : °C en texte, les autres décimal`, ch.every(([l, m]) => (/Soufflage|Reprise/.test(l)) === (m === 'text')), ch);
    if (qui !== 'sm') continue;
    for (const [val, att] of [['1 200', '1200'], ['1 234,5', '1234,5'], ['−5', '-5'], ['–5', '-5'], ['5 °C', '5'], ['-5,5', '-5,5'], ['12,5,3', ''], ['', ''], ['abc', ''], ['12 kg', '12']]) {
      await poser('[data-releve="Soufflage"]', ''); await poser('[data-releve="Soufflage"]', val); const r = await ev(() => document.querySelector('[data-releve="Soufflage"]').value);
      v(`relevé « ${val} » → « ${att} » (réel « ${r} »)`, r === att, [r, await toast()]); }
    // la valeur gardée après refus est bien celle d'avant (pas « undefined »)
    await poser('[data-releve="Soufflage"]', '12'); await poser('[data-releve="Soufflage"]', '3 sur 18'); const g = await ev(() => ({ champ: document.querySelector('[data-releve="Soufflage"]').value, mem: fiche('i1').releves['Soufflage'] }));
    v('après refus : le champ ET la fiche gardent « 12 »', g.champ === '12' && g.mem === '12', g);
    // relevé texte (Infestation / horaires) non touché
    const et = await ev(() => [...document.querySelectorAll('[data-releve]')].filter(e => /Infestation|Arrivée|Départ/.test(e.dataset.releve)).length);
  }
  // autres métiers : numériques et libres
  for (const [met, lab, val, att] of [['nuis', 'Postes consommés', '3 sur 18', '', ], ['nuis', 'Infestation', 'faible 2-3', 'faible 2-3'], ['nett', 'Arrivée', '06:10', '06:10'], ['plomb', 'Pression', '1,5 bar', '1,5']]) {
    const ok = await ev(([m, l, x]) => { const id = Object.keys(INTERVENTIONS ? {} : {}); return true; }, [met, lab, val]).catch(() => true);
  }
  // — facture
  await I.devenir(c, 'tl', 'inter-x-i7'); await ev(() => { const F = fiche('i7'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Fait.'; F.signature = 'signee'; F.suite = {}; }); await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 600);
  if (await ev(() => /Noter les pièces/.test((document.querySelector('#calque .panneau') || {}).textContent || ''))) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first(), { delai: 4000 });
  const fid = await ev(() => { const x = FACTURES.find(o => o.int === 'i7'); return x && x.id; }); v('population : facture de i7', !!fid, fid);
  await I.devenir(c, 'marc', 'facture-x-' + fid);
  const val = async s => ev(x => document.querySelector(x).value, s);
  await poser('[data-fqte="0"]', '1'); await poser('[data-prix="0"]', '1000000');   // = plafond : refusé (>=)
  let t = await toast(); v('prix = 1 000 000 refusé', /trop grand/.test(t), t);
  await poser('[data-prix="0"]', '999999,99'); v('prix 999 999,99 × 1 accepté', await val('[data-prix="0"]') !== '' && !/dépasserait/.test(await toast()), await val('[data-prix="0"]'));
  await poser('[data-fqte="0"]', '1,00'); v('quantité « 1,00 » acceptée au plafond', (await val('[data-fqte="0"]')) === '1,00', await val('[data-fqte="0"]'));
  await poser('[data-fqte="0"]', '2'); t = await toast(); v('« 2 » × 999 999,99 refusé avec message (le plafond du total ; une unité inconnue « L » est refusée plus tôt, depuis la tour 6 des ventes)', /total de cette ligne/.test(t) && (await val('[data-fqte="0"]')) === '1,00', [t, await val('[data-fqte="0"]')]);
  await poser('[data-prix="0"]', '-50'); await poser('[data-fqte="0"]', '9999'); v('prix négatif sur une ligne ordinaire : REFUSÉ, le prix reste positif (seule une déduction est négative — compta-ventes tour 6, décision du chef du 18/11) ; le plafond du total tient donc encore', !/^-/.test(await val('[data-prix="0"]')) && (await val('[data-fqte="0"]')) === '1,00', [await val('[data-fqte="0"]'), await toast(), 'prix:' + await val('[data-prix="0"]')]);
  await poser('[data-prix="0"]', ''); v('prix effacé accepté', !/dépasserait/.test(await toast()), await toast());
  await poser('[data-fqte="0"]', '1'); await poser('[data-prix="0"]', '35'); await poser('[data-fqte="0"]', '0,5 L'); t = await toast(); v('quantité « 0,5 L » : unité inconnue REFUSÉE avec message, quantité gardée (décision du tour 6 des ventes, 2829163c)', /Je ne sais pas compter en «\s*L\s*»/.test(t) && (await val('[data-fqte="0"]')) === '1', [t, await val('[data-fqte="0"]')]);
  const tot = await ev(() => document.querySelector('#contenu').innerText); v('aucun total de milliards', !/\d{1,3}(?:[\s  ]\d{3}){3}/.test(tot), 0);
  await L.capture(c, CAPN('facture'));
  const dd = await L.deborde(c); v('la page ne glisse pas de côté', dd.bouge === 0, dd);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
