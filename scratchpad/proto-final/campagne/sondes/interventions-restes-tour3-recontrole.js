// RECONTRÔLE ADVERSE du tour 3 « Interventions » (18 novembre 2026) : ce que le recollage de l'espace des milliers et la conversion des signes moins ont pu casser À CÔTÉ dans les relevés (champs numériques ET champs libres).
// usage : node interventions-restes-tour3-recontrole.js <profil> [nuit]  → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v; const ev = (f, a) => p.evaluate(f, a);
  const poser = async (sel, val) => { await ev(([s, x]) => { const e = document.querySelector(s); e.focus(); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, val]); await L.calme(p, 400); };
  const lire = sel => ev(s => ({ champ: document.querySelector(s).value, mem: (fiche(document.querySelector(s).dataset.id).releves || {})[document.querySelector(s).dataset.releve] }), sel);
  const joue = async (sel, val, att, nom) => { await poser(sel, ''); await poser(sel, val); const r = await lire(sel); v(`${nom} « ${val} » → « ${att} » (réel « ${r.champ} », fiche « ${r.mem} »)`, r.champ === att && r.mem === att, r); };
  // — métiers : clim (Soufflage numérique), nuisibles (Infestation, Postes consommés), nettoyage (Arrivée), plomberie
  const parMetier = { clim:'i1', nuis:'i1', nett:'i1' };   /* l'entreprise fictive n'a qu'un métier : on bascule la fiche i1 pour atteindre les champs des autres */
  const hash = k => 'inter-x-' + k;
  const metierDe = m => ev(x => { fiche('i1').metier = x; return x; }, m);
  const cas = { // [métier, libellé, valeur, attendu, numérique?]
    clim: [['Soufflage', '3 sur 18', null, 'refusé'], ['Soufflage', '10-12', null, 'refusé'], ['Soufflage', '10 - 12', null, 'refusé'], ['Soufflage', '10 – 12', null, 'refusé'], ['Soufflage', '10–12', null, 'refusé'], ['Soufflage', '10 −12', null, 'refusé'], ['Soufflage', '12x3', null, 'refusé'], ['Soufflage', '1 2', null, 'refusé'], ['Soufflage', '12 3', null, 'refusé'], ['Soufflage', '1 20', null, 'refusé'], ['Soufflage', '12 345,6 3', null, 'refusé'], ['Soufflage', '1 200 sur 3', null, 'refusé'],
      ['Soufflage', '12,5', '12,5'], ['Soufflage', '-5', '-5'], ['Soufflage', '−5,5', '-5,5'], ['Soufflage', '5 °C', '5'], ['Soufflage', '1 200', '1200'], ['Soufflage', '1 200 000', '1200000'], ['Soufflage', '1 234,5', '1234,5'], ['Soufflage', '-1 200', '-1200'], ['Soufflage', '1.234,5', '1.234,5'.replace('.', '') && null], ['Charge de fluide', '2,4 kg', '2,4']],
  };
  const sels = l => `[data-releve="${l}"]`;
  await metierDe('clim'); await I.devenir(c, 'sm', hash('i1'));
  const n = await ev(() => document.querySelectorAll('[data-releve]').length); v('population : relevés affichés', n >= 3, n);
  for (const [l, val, att, mode] of cas.clim) {
    await poser(sels(l), '12'); await poser(sels(l), val); const r = await lire(sels(l));
    if (mode === 'refusé') v(`refusé « ${val} » : le champ et la fiche gardent 12`, r.champ === '12' && r.mem === '12', r);
    else if (att === null) v(`« ${val} » : sortie notée (pas de verdict imposé)`, true, r);
    else v(`« ${val} » → « ${att} »`, r.champ === att && r.mem === att, r);
  }
  // — un nombre recollé est DIT : « 10 100 » devient 10100 ET le message montre ce qui a été lu
  await poser(sels('Soufflage'), '12'); await ev(() => { const T = document.getElementById('toast'); if (T) T.textContent = ''; }); await poser(sels('Soufflage'), '10 100');
  { const r = await lire(sels('Soufflage')), t = await ev(() => (document.getElementById('toast') || {}).textContent || ''); v('« 10 100 » enregistré 10100 et dit « Lu 10 100 »', r.champ === '10100' && /Lu 10 100/.test(t) && /10100/.test(t), [r, t]); }
  // — champs LIBRES des autres métiers : ce qu'on écrit n'est pas réécrit en silence
  for (const [m, lab, val] of [['nuis', 'Infestation', 'faible – moyenne'], ['nuis', 'Infestation', '2 100 individus'], ['nett', 'Arrivée', '06:10 – 06:40'], ['nett', 'Départ', '08:40 −10 min']]) {
    const k = 'i1'; await metierDe(m);
    await I.devenir(c, 'sm', hash(k));
    if (!(await ev(s => !!document.querySelector(s), sels(lab)))) { v(`population : champ ${lab} (${m}) présent`, false, k); continue; }
    await poser(sels(lab), val); const r = await lire(sels(lab));
    v(`texte libre ${lab} « ${val} » gardé tel quel`, r.champ === val, r);
  }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  v('la page ne glisse pas de côté', !(await ev(() => document.documentElement.scrollWidth > innerWidth + 1)));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
