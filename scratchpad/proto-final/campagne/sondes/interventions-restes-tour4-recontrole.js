// RECONTRÔLE ADVERSE du tour 4 « Interventions » (18 novembre 2026) : plages, signes moins, milliers, champs libres, frappe réelle au clavier, message « Lu … », autres rôles.
// usage : node interventions-restes-tour4-recontrole.js <profil> [nuit] [capture]  → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', cap = process.argv.includes('capture');
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v; const ev = (f, a) => p.evaluate(f, a);
  const poser = async (sel, val) => { await ev(([s, x]) => { const e = document.querySelector(s); e.focus(); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, val]); };
  const lire = sel => ev(s => { const e = document.querySelector(s); return { champ: e.value, mem: (fiche(e.dataset.id).releves || {})[e.dataset.releve] }; }, sel);
  const toast = () => ev(() => (document.getElementById('toast') || {}).textContent || '');
  const metier = m => ev(x => { fiche('i1').metier = x; return x; }, m);
  const ouvrirFiche = async () => I.devenir(c, 'sm', 'inter-x-i1');
  await metier('clim'); await ouvrirFiche();
  const S = l => `[data-releve="${l}"]`;
  const n = await ev(() => document.querySelectorAll('[data-releve]').length); v('population : relevés numériques affichés (3 en clim)', n === 3, n);
  const refuse = ['10 – 12', '10 −12', '10 - 12', '10–12', '10 — 12', '10 ‒ 12', '1 200 - 1 300', '3 sur 18', '12x3', '1 2', '10 à 12', '1,2,3', '1 -2'];
  for (const val of refuse) { await poser(S('Soufflage'), '12'); await poser(S('Soufflage'), val); const r = await lire(S('Soufflage')); v(`refusé « ${val} » : garde 12`, r.champ === '12' && r.mem === '12', r); }
  const accepte = [['-5', '-5'], ['−5', '-5'], ['–5', '-5'], ['-5,5', '-5,5'], ['1 200', '1200'], ['1 234,5', '1234,5'], ['1 200', '1200'], ['1 234,5', '1234,5'], ['12,5', '12,5'], ['5 °C', '5'], ['10 100', '10100']];
  for (const [val, att] of accepte) { await poser(S('Soufflage'), '12'); await poser(S('Soufflage'), val); const r = await lire(S('Soufflage')); v(`« ${val} » → « ${att} »`, r.champ === att && r.mem === att, r); }
  // message « Lu » : visible, juste, et pas pour « 1200 » tapé net
  await poser(S('Soufflage'), '12'); await poser(S('Soufflage'), '10 100'); const t1 = await toast(); v('« 10 100 » : message « Lu 10 100 : enregistré 10100. »', /Lu 10\s100\s:\senregistré 10100\./.test(t1), t1);
  if (cap) { await L.capture(c, I.CAP + `t4-lu-${profil}-${nuit ? 'nuit' : 'jour'}.png`); }
  await poser(S('Soufflage'), '12'); await ev(() => { document.getElementById('toast').textContent = ''; }); await poser(S('Soufflage'), '1200'); const t2 = await toast(); v('« 1200 » net : pas de message « Lu »', !/Lu /.test(t2), t2);
  // valeurs LONGUES : 12 chiffres plafond, message long, la page ne glisse pas
  await poser(S('Soufflage'), '12'); await poser(S('Soufflage'), '123 456 789 012 345'); const rl = await lire(S('Soufflage')); v('valeur très longue : bornée à 12 signes ou refusée, jamais plus', rl.champ.length <= 12, rl);
  if (cap) await L.capture(c, I.CAP + `t4-longue-${profil}-${nuit ? 'nuit' : 'jour'}.png`);
  await poser(S('Soufflage'), '1 234 567 890,5'); const t3 = await toast(); const r3 = await lire(S('Soufflage')); v('milliers longs recollés, borne 12', r3.champ.length <= 12, [r3, t3]);
  // frappe RÉELLE au clavier, caractère par caractère (un vrai téléphone ne colle pas la valeur d'un coup)
  await poser(S('Soufflage'), ''); await p.locator(S('Soufflage')).click(); await p.keyboard.type('-5'); await p.keyboard.press('Tab'); let r = await lire(S('Soufflage')); v('frappe « -5 » au clavier → -5', r.champ === '-5' && r.mem === '-5', r);
  await poser(S('Soufflage'), ''); await p.locator(S('Soufflage')).click(); await p.keyboard.type('12,5'); await p.keyboard.press('Tab'); r = await lire(S('Soufflage')); v('frappe « 12,5 » → 12,5', r.champ === '12,5', r);
  await poser(S('Soufflage'), ''); await p.locator(S('Soufflage')).click(); await p.keyboard.type('1 200'); await p.keyboard.press('Tab'); r = await lire(S('Soufflage')); console.log('  · NOTE frappe « 1 200 » caractère par caractère →', JSON.stringify(r), ' toast:', await toast());
  await poser(S('Soufflage'), ''); await p.locator(S('Soufflage')).click(); await p.keyboard.type('10 - 12'); await p.keyboard.press('Tab'); r = await lire(S('Soufflage')); v('frappe « 10 - 12 » : jamais 1012', r.champ !== '1012' && r.mem !== '1012', r);
  // les trois relevés de la clim se comportent pareil
  for (const l of ['Charge de fluide', 'Reprise']) { await poser(S(l), '7'); await poser(S(l), '10 – 12'); const x = await lire(S(l)); v(`${l} : plage refusée`, x.champ === '7', x); await poser(S(l), '−3'); const y = await lire(S(l)); v(`${l} : −3 négatif`, y.champ === '-3', y); }
  // libres + autres métiers (numériques : Surface, Postes, Pression…)
  for (const [m, lab, val] of [['nuis', 'Infestation', 'faible – moyenne'], ['nuis', 'Infestation', '2 100 individus'], ['nuis', 'Infestation', '10 - 12'], ['nett', 'Arrivée', '06:10 – 06:40'], ['nett', 'Départ', '08:40 −10 min'], ['nett', 'Arrivée', '6 h 10']]) {
    await metier(m); await ouvrirFiche(); if (!(await ev(s => !!document.querySelector(s), S(lab)))) { v(`population : ${lab} (${m}) présent`, false); continue; }
    await poser(S(lab), val); const x = await lire(S(lab)); v(`libre ${lab} « ${val} » intact`, x.champ === val && x.mem === val, x); }
  for (const [m, lab] of [['nuis', 'Postes consommés'], ['nett', 'Surface faite'], ['plomb', 'Pression'], ['plomb', 'CO mesuré']]) {
    await metier(m); await ouvrirFiche(); if (!(await ev(s => !!document.querySelector(s), S(lab)))) { v(`population : ${lab} (${m}) présent`, false); continue; }
    await poser(S(lab), '4'); await poser(S(lab), '10 – 12'); let x = await lire(S(lab)); v(`${m}/${lab} : plage refusée`, x.champ === '4', x);
    await poser(S(lab), '1 200,5'); x = await lire(S(lab)); v(`${m}/${lab} : 1 200,5 → 1200,5`, x.champ === '1200,5', x);
    await poser(S(lab), '−2'); x = await lire(S(lab)); v(`${m}/${lab} : −2 négatif`, x.champ === '-2', x); }
  // la fiche gardée survit à un changement d'écran
  await metier('clim'); await ouvrirFiche(); await poser(S('Soufflage'), '1 200'); await ev(() => { route = 'accueil'; }); await ouvrirFiche(); const rr = await lire(S('Soufflage')); v('valeur recollée gardée après retour sur la fiche', rr.champ === '1200', rr);
  // autres rôles : la fiche ouverte par une technicienne / un gérant porte la même règle
  for (const qui of ['marc', 'julie', 'kb']) { try { await I.devenir(c, qui, 'inter-x-i1'); const ex = await ev(s => !!document.querySelector(s), S('Soufflage')); if (!ex) { console.log(`  · NOTE ${qui} : pas de champ relevé sur cette fiche`); continue; }
    await poser(S('Soufflage'), '12'); await poser(S('Soufflage'), '10 – 12'); const x = await lire(S('Soufflage')); v(`rôle ${qui} : plage refusée`, x.champ === '12', x); } catch (e) { console.log(`  · NOTE ${qui} : ${String(e).slice(0, 100)}`); } }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  v('la page ne glisse pas de côté', !(await ev(() => document.documentElement.scrollWidth > innerWidth + 1)));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
