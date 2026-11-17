// Recontrôle adverse des restes du technicien, tour 1 : la puce « N messages du bureau › » (neuve) — cible au doigt ≥ 44 px, atteignable et activable AU CLAVIER (Tab puis Entrée), focus visible,
// nom lisible ; et l'écran « Ma journée » pour les rôles de bureau (marc, julie) : l'enveloppe de vueMaJournee ne doit rien déplacer chez eux.
// Usage : node restes-technicien-recontrole-puce.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-technicien-rc/';
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = profil + (nuit ? '-nuit' : '-jour');
  { const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'majournee' }), p = c.p; await L.calme(p, 600);
    await p.evaluate(() => { NOTIFS.push({ k: rlQui(), txt: 'Marc a validé ta demande de matériel.', d: AUJ, h: '10:05' }); rendre(); }); await L.calme(p, 500);
    const b = await p.evaluate(() => { const e = document.querySelector('[data-mjmsg]'); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.width), h: Math.round(r.height), tag: e.tagName, nom: e.textContent.trim() }; });
    v(`[${J}] population : la puce existe`, !!b, b);
    if (b) { if (c.doigt) v(`[${J}] la puce fait ≥ 44 px de haut au doigt`, b.h >= 44, b);
      // clavier : Tab jusqu'à la puce, Entrée
      let atteint = false; for (let i = 0; i < 40 && !atteint; i++) { await p.keyboard.press('Tab'); atteint = await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-mjmsg')); }
      v(`[${J}] la puce reçoit le focus au clavier (Tab ≤ 40)`, atteint);
      if (atteint) { const f = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return { outline: s.outlineStyle + ' ' + s.outlineWidth, ombre: s.boxShadow.slice(0, 40) }; });
        v(`[${J}] focus visible sur la puce (contour ou ombre)`, (f.outline && !/^none/.test(f.outline) && !/ 0px$/.test(f.outline)) || (f.ombre && f.ombre !== 'none'), f);
        await L.capture(c, CAP + `puce-focus-${J}.png`, false);
        await p.keyboard.press('Enter'); await L.calme(p, 900);
        const vu = await p.evaluate(() => { const r = document.getElementById('mj-messages').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }); v(`[${J}] Entrée sur la puce amène aux messages`, vu); }
    }
    await L.fin(c); }
  for (const qui of ['marc', 'julie']) { const c = await L.ouvrir({ profil, qui, nuit, hash: 'majournee' }), p = c.p; await L.calme(p, 600);
    const r = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent || '', ordre: [...document.querySelector('#contenu').children].map(e => e.className.split(' ')[0] + (e.id ? '#' + e.id : '')).join(' > ').slice(0, 200), puce: !!document.querySelector('[data-mjmsg]'), mjpt: !!document.querySelector('.mj-pt') }));
    console.log(`   ${qui} :`, JSON.stringify(r));
    v(`[${J}] ${qui} : l'écran se rend (population)`, r.h1.length > 0, r);
    v(`[${J}] ${qui} : ni puce ni pointage couché (réservés au technicien)`, !r.puce && !r.mjpt, r);
    const e = c.err.filter(x => !/Failed|net::/.test(x)); v(`[${J}] ${qui} : aucune erreur de script`, e.length === 0, e.slice(0, 3)); await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
