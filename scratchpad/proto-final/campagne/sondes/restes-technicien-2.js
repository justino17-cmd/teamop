// Restes du technicien, tour 1 (17 novembre 2026), suite : le pied du menu au doigt (Jour · Nuit · Auto, Nouveautés ≥ 44 px) sur iPad, jour et nuit, pour les trois rôles ;
// le liseré d'une demande de congé REFUSÉE est rouge (« d'autres dates » ambre) ; « C'est quoi ? » n'est plus pré-rempli ; « Il manque encore des choses » sans grands vides.
// Usage : node restes-technicien-2.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-technicien/';
(async () => {
  const profil = process.argv[2] || 'ipad', nuit = process.argv[3] === '1', J = profil + (nuit ? '-nuit' : '-jour');
  // 1. le pied du menu (iPad et ordinateur : le menu latéral est affiché), pour chaque rôle
  for (const qui of ['sm', 'julie', 'marc']) {
    const c = await L.ouvrir({ profil, qui, nuit, hash: qui === 'sm' ? 'majournee' : 'accueil' }); await L.calme(c.p, 500);
    const r = await c.p.evaluate(() => [...document.querySelectorAll('.menu .pied button, .menu .pied .nv-menu')].filter(b => b.offsetParent !== null).map(b => { const q = b.getBoundingClientRect(); return { t: b.textContent.trim(), w: Math.round(q.width), h: Math.round(q.height) }; }));
    v(`[${J}] ${qui} : population : le pied du menu porte Jour, Nuit, Auto et Nouveautés`, ['Jour', 'Nuit', 'Auto', 'Nouveautés'].every(t => r.some(x => x.t === t)), r);
    if (c.doigt) v(`[${J}] ${qui} : pied du menu ≥ 44 px au doigt`, r.every(x => x.h >= 44), r);
    await L.fin(c);
  }
  // 2. un congé refusé / d'autres dates : le liseré suit l'état (téléphone ou iPad, la carte est la même)
  { const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'absences' }), p = c.p; await L.calme(p, 500);
    await p.evaluate(() => { aAvis('sm', { ic:'non', titre:'Marc a refusé ta demande', det:'Congé · du 3 au 5 novembre', msg:'Trop de monde ce jour-là.', rep:true, ref:{ type:'Congé', du:'2026-11-03', au:'2026-11-05', demi:null } });
      aAvis('sm', { ic:'info', titre:'Marc te propose d’autres dates', det:'Congé · du 10 au 12 novembre', msg:'' }); aAvis('sm', { ic:'ok', titre:'Marc a validé ta demande', det:'Congé · du 20 au 21 novembre', msg:'' }); rendre(); });
    await L.calme(p, 500);
    const r = await p.evaluate(() => [...document.querySelectorAll('.carte.a-avis:not(.tkx-avis)')].map(e => { const i = e.querySelector('.a-dec-i'), cs = getComputedStyle(e), ci = getComputedStyle(i); return { t: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), cls: i.className, lis: cs.boxShadow.slice(0, 40), fond: ci.backgroundColor }; }));
    const rgb = x => (x.match(/rgba?\([^)]*\)/) || [''])[0];
    const non = r.find(x => /non/.test(x.cls)), info = r.find(x => /info/.test(x.cls)), ok = r.find(x => /ok/.test(x.cls));
    v(`[${J}] population : les trois avis (refusé, autres dates, validé) sont à l'écran`, !!(non && info && ok), r);
    if (non && info && ok) {
      v(`[${J}] refusé : le liseré est celui de sa pastille (rouge), pas celui du « validé »`, rgb(non.lis) === non.fond && rgb(non.lis) !== rgb(ok.lis), { non, ok });
      v(`[${J}] autres dates : liseré = pastille (ambre), ni vert ni rouge`, rgb(info.lis) === info.fond && rgb(info.lis) !== rgb(ok.lis) && rgb(info.lis) !== rgb(non.lis), { info });
      v(`[${J}] validé : liseré = pastille (vert)`, rgb(ok.lis) === ok.fond, { ok }); }
    await p.evaluate(() => { const e = document.querySelector('.carte.a-avis'); if (e) e.scrollIntoView({ block: 'center' }); }); await L.calme(p, 300);
    await L.capture(c, CAP + `restes2-avis-${J}.png`, false); await L.fin(c); }
  // 3. « C'est quoi ? » n'est plus pré-rempli : un péage ne devient pas « Carburant »
  { const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'techfrais' }), p = c.p; await L.calme(p, 500);
    await L.toucher(c, '[data-rl="ndf"]'); await L.calme(p, 500);
    const o = await p.evaluate(() => { const s = document.getElementById('rn-o'); return s ? { val: s.value, n: s.options.length, premier: s.options[0].textContent } : null; });
    v(`[${J}] « C'est quoi ? » : rien n'est choisi d'avance`, !!o && o.val === '' && o.n === 6, o);
    await p.fill('#rn-pr', 'Péage A10'); await p.fill('#rn-m', '9,40');
    const avant = await p.evaluate(() => NDF.length);
    await L.toucher(c, '[data-rl="ndfok"]'); await L.calme(p, 400);
    const ap = await p.evaluate(() => ({ n: NDF.length, ouvert: !!document.getElementById('rn-o'), toast: (document.getElementById('toast') || {}).textContent || '' }));
    v(`[${J}] sans choix : l'envoi est refusé avec une phrase claire, la fenêtre reste ouverte, rien n'est créé`, ap.n === avant && ap.ouvert && /Choisis d’abord/.test(ap.toast), ap);
    await p.selectOption('#rn-o', 'Péage ou parking'); await L.toucher(c, '[data-rl="ndfok"]'); await L.calme(p, 600);
    const f = await p.evaluate(() => ({ n: NDF.length, objet: NDF[0].objet }));
    v(`[${J}] choisi « Péage ou parking » + « Péage A10 » : la note est titrée comme tapé, sans plaque ni « Carburant »`, f.n === avant + 1 && f.objet === 'Péage ou parking · Péage A10' && !/Carburant|[A-Z]{2}-\d{3}-[A-Z]{2}/.test(f.objet), f);
    await L.fin(c); }
  // 4. « Il manque encore des choses » : pas de grands vides autour de la liste
  { const c = await L.ouvrir({ profil, qui: 'kb', nuit, hash: 'inter-x-i3' }), p = c.p; await L.calme(p, 600);
    const ouvre = await p.evaluate(() => { const b = document.querySelector('#contenu [data-action="terminer"]'); if (b) { b.click(); return b.textContent.trim(); } return ''; }); await L.calme(p, 500);
    const t = await p.evaluate(() => { const h = document.querySelector('#calque .panneau h2'); if (!h || !/Il manque encore/.test(h.textContent)) return null; const pn = h.parentNode, ks = [...pn.children].filter(e => e.tagName !== 'BUTTON'), r = ks.map(e => e.getBoundingClientRect());
      return { n: ks.length, vides: r.slice(1).map((q, i) => Math.round(q.top - r[i].bottom)), lis: pn.querySelectorAll('li').length }; });
    v(`[${J}] la fenêtre « Il manque encore des choses » s'ouvre (population)`, !!t && t.lis >= 1, { ouvre, t });
    if (t) v(`[${J}] « Il manque » : écarts entre les blocs ≤ 24 px (avant : ≈ 50)`, t.vides.every(x => x <= 24 && x >= 0), t);
    await L.capture(c, CAP + `restes2-manque-${J}.png`, false); await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
