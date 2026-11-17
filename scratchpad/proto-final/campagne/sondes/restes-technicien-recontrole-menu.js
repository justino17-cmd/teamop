// Recontrôle adverse des restes du technicien, tour 1 : « Nouveautés » à 44 px au doigt (règle pointer:coarse posée pour tous les rôles) — le tiroir du menu au téléphone ne perd rien :
// le dernier geste du pied (« Se déconnecter ») reste atteignable et dans l'écran, sans que la page glisse de côté, pour trois rôles, jour et nuit.
// Plus : aucun identifiant en double dans Mon camion (la carte « mj-autres » est posée par deux écrans).
// Usage : node restes-technicien-recontrole-menu.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-technicien-rc/';
(async () => {
  const profil = process.argv[2] || 'petit', nuit = process.argv[3] === '1', J = profil + (nuit ? '-nuit' : '-jour');
  for (const qui of ['sm', 'marc', 'julie']) {
    const c = await L.ouvrir({ profil, qui, nuit, hash: qui === 'julie' ? 'accueil' : 'majournee' }), p = c.p; await L.calme(p, 600);
    const ouvre = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(e => /^\s*Menu\s*\d*\s*$/.test(e.textContent) && e.getBoundingClientRect().width > 0); if (b) { b.click(); return true; } return false; }); await L.calme(p, 800);
    const m = await p.evaluate(() => { const vis = e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0, nvs = [...document.querySelectorAll('.nv-menu')].filter(vis), nv = nvs[0], r = nv && nv.getBoundingClientRect();
      const ds = [...document.querySelectorAll('button, a')].filter(e => /Se déconnecter/.test(e.textContent) && vis(e)), d = ds[0];
      let sc = d, defile = null; while (sc && sc !== document.body) { const o = getComputedStyle(sc).overflowY; if ((o === 'auto' || o === 'scroll') && sc.scrollHeight > sc.clientHeight + 1) { defile = sc; break; } sc = sc.parentElement; }
      if (defile) defile.scrollTop = defile.scrollHeight; else window.scrollTo(0, document.documentElement.scrollHeight);
      const rd = d && d.getBoundingClientRect(); return { nbNv: nvs.length, nv: r ? { h: Math.round(r.height), top: Math.round(r.top), bas: Math.round(r.bottom) } : null, deco: rd ? { top: Math.round(rd.top), bas: Math.round(rd.bottom), h: Math.round(rd.height) } : null, defileDansTiroir: !!defile, H: innerHeight }; });
    console.log(`   ${qui}`, JSON.stringify({ ouvre, ...m }));
    v(`[${qui} ${J}] population : le tiroir est ouvert et « Nouveautés » existe`, ouvre && !!m.nv, m);
    if (m.nv && c.doigt) v(`[${qui} ${J}] « Nouveautés » ≥ 44 px au doigt`, m.nv.h >= 44, m.nv);
    if (m.deco) v(`[${qui} ${J}] « Se déconnecter », une fois le tiroir défilé jusqu'en bas, est entièrement dans l'écran`, m.deco.top >= 0 && m.deco.bas <= m.H + 1, m);
    const d = await L.deborde(c); v(`[${qui} ${J}] le tiroir ouvert ne fait pas glisser la page`, d.bouge === 0, d);
    await L.capture(c, CAP + `menu-${qui}-${J}.png`, false);
    await L.fin(c); }
  { const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'majournee' }), p = c.p; await L.calme(p, 500);
    await p.evaluate(() => { NOTIFS.push({ k: rlQui(), txt: 'Marc a validé ta demande de matériel.', d: AUJ, h: '10:05' }); NOTIFS.push({ k: rlQui(), txt: 'Rappel automatique : tu n’as pas encore commencé ta journée.', d: jour(-1), h: '09:30' }); });
    for (const r of ['majournee', 'techfrais', 'moncamion', 'mesheures']) { await L.aller(p, r); await L.calme(p, 600);
      const dbl = await p.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id), c = {}; ids.forEach(i => c[i] = (c[i] || 0) + 1); return { n: ids.length, doubles: Object.keys(c).filter(k => c[k] > 1) }; });
      v(`[${J}] ${r} : population d'identifiants non vide`, dbl.n > 10, dbl); v(`[${J}] ${r} : aucun identifiant en double`, dbl.doubles.length === 0, dbl); }
    await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
