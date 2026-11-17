// Recontrôle adverse des restes du technicien, tour 1 : la pastille ambre des « autres dates » (corrigée pour suivre le liseré) porte-t-elle une encre lisible ? JOUR ET NUIT, côté technicien ET côté gérant.
// Le correcteur a mesuré que le liseré = la pastille ; personne n'a mesuré le glyphe SUR la pastille. Contraste calculé sur les couleurs calculées (aplats unis).
// Usage : node restes-technicien-recontrole-avis.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-technicien-rc/';
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = profil + (nuit ? '-nuit' : '-jour');
  for (const [qui, hash, pour] of [['sm', 'absences', 'sm'], ['marc', 'absences', 'marc']]) {
    const c = await L.ouvrir({ profil, qui, nuit, hash }), p = c.p; await L.calme(p, 600);
    await p.evaluate(pr => { aAvis(pr, { ic:'non', titre:'Refus de test', det:'Congé · du 1 au 2', msg:'' }); aAvis(pr, { ic:'info', titre:'Autres dates de test', det:'Congé · du 3 au 4', msg:'' }); aAvis(pr, { ic:'ok', titre:'Validation de test', det:'Congé · du 5 au 6', msg:'' }); rendre(); }, pour); await L.calme(p, 500);
    const r = await p.evaluate(() => {
      const lum = c => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
      return [...document.querySelectorAll('.carte.a-avis:not(.tkx-avis)')].filter(e => /de test/.test(e.textContent)).map(e => { const i = e.querySelector('.a-dec-i'), s = getComputedStyle(i), a = lum(s.color), b = lum(s.backgroundColor);
        return { t: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 22), cls: i.className.replace('a-dec-i ', ''), encre: s.color, fond: s.backgroundColor, contraste: Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100 }; }); });
    console.log(`-- ${qui} ${J}`, JSON.stringify(r));
    v(`[${qui} ${J}] population : les trois avis de test sont à l'écran`, r.length === 3, r);
    for (const x of r) v(`[${qui} ${J}] pastille « ${x.cls} » : encre lisible sur son fond (≥ 3 pour un glyphe de 13 px gras, cible 4,5)`, x.contraste >= 3, x);
    await p.evaluate(() => { const e = [...document.querySelectorAll('.carte.a-avis')].find(e => /de test/.test(e.textContent)); if (e) e.scrollIntoView({ block: 'center' }); }); await L.calme(p, 300);
    await L.capture(c, CAP + `avis-${qui}-${J}.png`, false); await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
