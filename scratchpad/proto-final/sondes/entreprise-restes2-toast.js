// RESTES ENTREPRISE, TOUR 2 — un champ refusé sur téléphone : la bulle ne recopie plus le message que le champ dit déjà (elle tombait sur l'aide et sur le message, qu'elle coupait).
//   téléphone (iphone, android nuit, petit) : le message est sous le champ, visible, AU-DESSUS de la rangée collée, et aucune bulle ne le répète ;
//   ordinateur (mac) : rien ne change, la bulle dit toujours le premier refus ; et quand le message n'est pas à l'écran (écran très bas), la bulle le dit encore.
// Usage : node …/entreprise-restes2-toast.js. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes2-toast/';
(async () => {
  for (const [profil, nuit, W, H] of [['iphone', false, 390, 844], ['android', true, 360, 740], ['petit', false, 320, 568], ['iphone', false, 360, 420], ['iphone', true, 320, 330]]) {
    const c = await C.ouvrirEnt({ profil, nuit }); const p = c.p; if (W !== 390 || H !== 844) { await p.setViewportSize({ width:W, height:H }); await L.calme(p, 400); }
    await L.toucher(c, '[data-ent="carte|ident"]'); await L.calme(p, 400);
    await C.remplir(p, 'en-site', 'pas un site'); await L.toucher(c, '[data-ent="identok"]'); await L.calme(p, 500);
    const r = await p.evaluate(() => { const m = document.getElementById('en-site-err'), pn = document.querySelector('#calque .panneau'), rg = document.querySelector('#calque .panneau > .actions:last-child'), t = document.getElementById('toast');
      const q = m && m.getBoundingClientRect(), pq = pn && pn.getBoundingClientRect(), g = rg && rg.getBoundingClientRect();
      return { msg:m && m.textContent.trim(), visible:!!(q && q.height > 0 && q.top >= pq.top && q.bottom <= (g ? g.top : pq.bottom) + 1), toast:t && t.classList.contains('on') ? t.textContent.trim() : '', aria:(m || {}).getAttribute && m.getAttribute('role'), focus:(document.activeElement || {}).id }; });
    v(`${profil} ${W}×${H}${nuit ? ' nuit' : ''} : le champ refusé (« Site internet ») a le focus et dit son refus (${r.msg})`, r.focus === 'en-site' && /adresse de site/.test(r.msg || '') && r.aria === 'alert', r);
    v(`${profil} ${W}×${H}${nuit ? ' nuit' : ''} : le message se voit et la bulle ne le répète pas (visible ${r.visible}, bulle « ${r.toast} »)`, r.visible ? r.toast === '' : /adresse de site/.test(r.toast), r);
    await L.capture(c, CAP + `${profil}-${W}x${H}${nuit ? '-nuit' : ''}.png`, false); await L.fin(c);
  }
  { const c = await C.ouvrirEnt({ profil:'mac', nuit:false }); const p = c.p;
    await L.toucher(c, '[data-ent="carte|ident"]'); await L.calme(p, 400); await C.remplir(p, 'en-site', 'pas un site'); await L.toucher(c, '[data-ent="identok"]'); await L.calme(p, 500);
    const t = await C.toast(p); v('mac : la bulle dit toujours le premier refus (rien ne change sur ordinateur)', /adresse de site/.test(t), t); await L.fin(c); }
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });
