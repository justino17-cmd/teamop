// Recontrôle adverse : kilométrique (valeurs longues, virgule, gros kilométrages), refus du tarif, vus par un technicien.
const { L, ouvrirAchats, toast } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', qui = process.argv[4] || 'julie';
  const c = await ouvrirAchats({ profil, qui, nuit, hash: false }), p = c.p, E = (f, a) => p.evaluate(f, a); await L.aller(p, 'techfrais'); await L.calme(p, 600);
  const tarifs = [0.603, 0.6, 0.631, 0.5];
  const cas = ['85', '85,5', '85.5', '1 200', '1500', '1501', '7', '0,5', '12345', '2,25'];
  let pop = 0, mal = [];
  for (const t of tarifs) for (const k of cas) {
    await E(t => { AX.kmTarif = t; }, t);
    await E(() => { try { fermerPanneau(); } catch (e) {} document.querySelector('#contenu [data-rl="ndf"]').click(); const o = document.getElementById('rn-o'); o.value = AX_NATURES[4]; o.dispatchEvent(new Event('change', { bubbles: true })); const cv = document.getElementById('rn-cv'); if (cv && !cv.value) cv.value = '5'; });
    await p.fill('#rn-km', k); await E(() => document.getElementById('rn-km').dispatchEvent(new Event('input', { bubbles: true }))); await L.calme(p, 60);
    const ph = await E(() => document.getElementById('rn-kmtxt').textContent), m = ph.match(/= ([\d\s  ]+,\d\d)\s?€/), annonce = m ? m[1].replace(/[\s  ]/g, '') : '';
    const nAvant = await E(() => NDF.length);
    await E(() => (document.querySelector('#calque [data-rl="ndfok"]')||document.querySelector('[data-rl="ndfok"]')).click()); await L.calme(p, 120);
    let conf = await E(() => { const z = document.getElementById('rn-dbl'); return z && !z.hidden ? z.textContent : ''; });
    let confMontant = '';
    const doublon = /^Une note de/.test(conf); if (conf) { confMontant = ((conf.match(/soit ([\d\s  ]+,\d\d)\s?€/) || [])[1] || '').replace(/[\s  ]/g, ''); await E(() => document.querySelector('[data-axa="dblautre"]').click()); await L.calme(p, 120); }
    const r = await E(n0 => ({ n: NDF.length - n0, ttc: NDF[0].ttc }), nAvant), ttc = r.ttc.toFixed(2).replace('.', ','), t3 = (await toast(p)).replace(/[\s  ]/g, '');
    pop++; const attendu = (() => { const mill = Math.round(t * 1000), kk = parseFloat(k.replace(/\s/g, '').replace(',', '.')); return (Math.round(kk * mill / 10 + 1e-7) / 100).toFixed(2).replace('.', ','); })();
    // une règle de lecture indépendante, en entiers : demi-centime vers le haut
    const kk = parseFloat(k.replace(/\s/g, '').replace(',', '.')), mill = Math.round(t * 1000), kc = Math.round(kk * 100), ent = Math.floor((kc * mill + 500) / 1000) / 100, ent2 = ent.toFixed(2).replace('.', ',');
    const ok = r.n === 1 && annonce === ttc && ttc === ent2 && (!conf || doublon || confMontant === ttc);
    if (!ok) mal.push({ t, k, annonce, ttc, ent2, confMontant, nouveau: r.n, toast: t3.slice(0, 80) });
  }
  v('B1 population : ' + pop + ' envois (4 tarifs × 10 kilométrages), rôle ' + qui, pop === 40, pop);
  v('B2 phrase du formulaire = note = confirmation = arithmétique entière', mal.length === 0, mal.slice(0, 6));
  await L.fermer(c); L.bilan();
})().catch(e => { console.error(e); process.exit(1); });
