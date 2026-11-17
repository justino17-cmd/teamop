// Restes du technicien, tour 1 (17 novembre 2026) — « Ma journée » : la 1re intervention se voit sans défiler (technicien-02), le rappel du matin ne vit que là (technicien-05),
// le liseré d'une demande de congé refusée est rouge, « C'est quoi ? » n'est plus pré-rempli, la fenêtre « Il manque encore des choses » est sans grands vides.
// Usage : node restes-technicien-1.js [profil] [nuit=0|1]   (profils : iphone android petit mac)
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-technicien/';
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'majournee' }), p = c.p;
  await L.calme(p, 600);
  const mesure = () => p.evaluate(() => { const i = document.querySelector('#contenu .rl-int'), bb = document.querySelector('.barre-bas'), bar = bb && getComputedStyle(bb).display !== 'none' ? bb.getBoundingClientRect().top : innerHeight;
    return { y: i ? Math.round(i.getBoundingClientRect().top + scrollY) : -1, haut: i ? Math.round(i.getBoundingClientRect().top + scrollY + 40) : -1, bar: Math.round(bar), nInt: document.querySelectorAll('#contenu .rl-int').length,
      ordre: [...document.querySelector('#contenu').children].map(e => e.className.split(' ')[0] + (e.id ? '#' + e.id : '')).join(' > '), puce: (document.querySelector('.mj-puce') || {}).textContent || '' }; });
  const pop = await mesure(); v(`[${J}] population : il y a des interventions du jour`, pop.nInt >= 2, pop.nInt);
  // 1. pointage non commencé, avec message (le rappel du matin)
  let m = await mesure(); console.log('   non commencé, avec rappel :', JSON.stringify(m));
  v(`[${J}] 02 · non commencé + message : la 1re intervention est AU-DESSUS de la barre du bas`, m.y > 0 && m.y < m.bar - 24, m);
  if (profil !== 'mac') v(`[${J}] 02 · la puce « message du bureau » précède les interventions`, /message/.test(m.puce) && m.ordre.indexOf('mj-puce') > 0 && m.ordre.indexOf('mj-puce') < m.ordre.indexOf('rl-jour'), m.ordre);
  v(`[${J}] 02 · les messages en entier sont DESSOUS les interventions`, m.ordre.indexOf('rl-jour') < m.ordre.indexOf('#mj-messages') && m.ordre.indexOf('#mj-messages') > 0, m.ordre);
  await L.capture(c, CAP + `restes1-journee-nonc-${J}.png`, false);
  // la puce mène aux messages
  if (m.puce) { await p.evaluate(() => document.querySelector('[data-mjmsg]').click()); await L.calme(p, 700);
    const vu = await p.evaluate(() => { const r = document.getElementById('mj-messages').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }); v(`[${J}] la puce amène aux messages en entier`, vu); await p.evaluate(() => scrollTo(0, 0)); }
  // 2. commencé, sans message
  await L.toucher(c, '[data-ptx^="debut|"]'); await L.calme(p, 500);
  m = await mesure(); console.log('   commencé, sans message :', JSON.stringify(m));
  v(`[${J}] 02 · commencé, sans message : la 1re intervention au-dessus de la barre`, m.y > 0 && m.y < m.bar - 24, m);
  v(`[${J}] 02 · sans message : pas de puce`, !m.puce, m.puce);
  await L.capture(c, CAP + `restes1-journee-commence-${J}.png`, false);
  // 3. commencé, avec un message du bureau
  await p.evaluate(() => { NOTIFS.push({ k: rlQui(), txt: 'Marc a validé ta demande de matériel.', d: AUJ, h: '10:05' }); rendre(); }); await L.calme(p, 500);
  m = await mesure(); console.log('   commencé, avec message :', JSON.stringify(m));
  v(`[${J}] 02 · commencé + message : la 1re intervention au-dessus de la barre`, m.y > 0 && m.y < m.bar - 24, m);
  v(`[${J}] 02 · avec un message : la puce le dit`, /1 message du bureau/.test(m.puce), m.puce);
  await L.capture(c, CAP + `restes1-journee-msg-${J}.png`, false);
  // 05 : le rappel du matin ne se répète ni sur Mes frais ni sur Mon camion (on le repose, journée non commencée côté données)
  await p.evaluate(() => { NOTIFS.push({ k: rlQui(), txt: 'Rappel automatique : tu n’as pas encore commencé ta journée. Touche « Je commence ma journée ».', d: jour(-1), h: '09:30' }); });
  for (const r of ['techfrais', 'moncamion']) { await L.aller(p, r); await L.calme(p, 400);
    const t = await p.evaluate(() => document.querySelector('#contenu').textContent.replace(/\s+/g, ' '));
    v(`[${J}] 05 · ${r} : pas de rappel du matin`, !/Rappel automatique/.test(t) && !/pas encore commencé ta journée/.test(t), t.slice(0, 120)); }
  await L.aller(p, 'majournee'); await L.calme(p, 400);
  const tj = await p.evaluate(() => document.querySelector('#contenu').textContent.replace(/\s+/g, ' '));
  v(`[${J}] 05 · Ma journée garde le rappel d'un jour passé (il vit là)`, /pas encore commencé ta journée/.test(tj));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
