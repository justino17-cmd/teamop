// Sonde « perf » : 30 puis 1 500 e-mails. Un clic sur un message < 150 ms (deux images après le clic), et la page ne porte pas 1 500 lignes (D14).
const { lib, v, entrer, fin, sortie } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
const mesure = c => S(c, () => new Promise(ok => { const l = window.R().querySelectorAll('.msg'), t = performance.now(); l[Math.min(8, l.length - 1)].click(); requestAnimationFrame(() => requestAnimationFrame(() => ok({ ms:Math.round(performance.now() - t), lignes:window.R().querySelectorAll('.msg').length }))); }));
(async () => {
  const c = await entrer({ profil:'mac' });
  const total0 = await S(c, () => MAILS.length);
  const m30 = await mesure(c); v('boîte du prototype (' + total0 + ' e-mails) : clic < 150 ms', m30.ms < 150 && m30.lignes >= 5, m30);
  for (const n of [200, 1500]) {
    await S(c, k => { MAILS.splice(8); for (let i = 0; i < k; i++) MAILS.push(mlM('g' + i, jour(-(i % 90)), '09:' + String(i % 60).padStart(2, '0'), { nom:'Contact ' + i, mail:'c' + i + '@exemple.fr' }, 'Message numéro ' + i, 'Texte ' + i, { lu:i % 3 === 0 })); COURRIER.inst.rafraichir(); }, n);
    await c.p.waitForTimeout(3000);
    const tot = await S(c, () => MAILS.length), m = await mesure(c);
    v(tot + ' e-mails : clic < 150 ms, ≤ 240 lignes dans la page', tot >= n && m.ms < 150 && m.lignes <= 240 && m.lignes >= 100, m);
    await S(c, () => { const s = window.R().querySelector('#listScroll'); s.scrollTop = s.scrollHeight; }); await c.p.waitForTimeout(700);
    const plus = await S(c, () => window.R().querySelectorAll('.msg').length);
    v(tot + ' e-mails : en descendant, la liste se prolonge (les lignes suivantes arrivent)', plus > m.lignes, { avant:m.lignes, apres:plus }); }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await fin(c); await sortie();
})().catch(e => { console.log('ERREUR', e.message, (e.stack || '').split('\n')[1]); process.exit(1); });
