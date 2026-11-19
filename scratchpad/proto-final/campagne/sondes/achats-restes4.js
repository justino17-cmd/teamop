// Restes achats 4 : phrases propres du refus du tarif au kilomètre (zéro de tête, séparateur de milliers).
const { L, ouvrirAchats, toast } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a);
  const lire = async t => { await E(() => { AX.kmTarif = 0.6; try { fermerPanneau(); } catch (e) {} });
    await E(() => { document.body.insertAdjacentHTML('beforeend', '<button id="t3-b" data-axa="kmtarif" hidden></button>'); document.getElementById('t3-b').click(); document.getElementById('t3-b').remove(); }); await L.calme(p, 250);
    await E(t => { document.getElementById('ax-km').value = t; }, t); await E(() => document.querySelector('[data-axa="kmok"]').click()); await L.calme(p, 250);
    const tt = await toast(p); if (t === '00,603' || t === '1.500') await L.capture(c, CAP + 'restes4-' + (t === '1.500' ? 'mille' : 'zero') + '-' + profil + (nuit ? '-nuit' : '') + '.png'); const ok = await E(() => AX.kmTarif); return { t, tt, ok }; };
  const attendu = { '0,603': 0.603, '0.603': 0.603, '0,6': 0.6, '1': 1, '0,50': 0.5, '0,6034': 'refus3', '1,2345': 'refus3', '0,6 €': 0.6, '0,603 €/km': 0.603, '0,60 € par km': 0.6, '00,603': 'zero', '1.500': 'mille', '1 500': 'mille', '1.50': 1.5, '1.5': 1.5, '1.503': 'mille', 'abc': 'refus', '0': 'refus', '-1': 'refus', '0,01': 'refus', '11': 'refus', '0,05': 0.05, '10': 10 };
  const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/';
  const mal = [], vus = [];
  for (const [t, a] of Object.entries(attendu)) { const r = await lire(t); vus.push(r);
    const ph = { zero: /^Le zéro de tête est en trop : tape 0,603\.$/, mille: /^Un tarif au kilomètre se tape comme 0,603\.$/ }[a];
    const ok = ph ? (r.ok === 0.6 && ph.test(r.tt) && !/1500|très élevé|montant/.test(r.tt)) : typeof a === 'number' ? r.ok === a : (r.ok === 0.6 && (a !== 'refus3' || /trois décimales/.test(r.tt)) && r.tt.length > 5 && !/^Tarif au kilomètre/.test(r.tt));
    if (!ok) mal.push({ t, a, r }); }
  v('C1 population : ' + vus.length + ' saisies de tarif', vus.length === Object.keys(attendu).length, vus.length);
  v('C2 chaque saisie est acceptée ou refusée avec une phrase qui dit pourquoi, sans changer le tarif quand elle est refusée', mal.length === 0, mal);
  console.log(JSON.stringify(vus.filter(x => typeof attendu[x.t] !== 'number').map(x => [x.t, x.tt])));
  await L.fermer(c); L.bilan();
})().catch(e => { console.error(e); process.exit(1); });
