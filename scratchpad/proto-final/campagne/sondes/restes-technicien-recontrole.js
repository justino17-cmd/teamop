// Recontrôle ADVERSE des restes du technicien, tour 1 (17 novembre 2026) : ce que les corrections de « Ma journée » (ordre, pointage couché, puce), du rappel du matin,
// de « C'est quoi ? », du liseré des congés, du pied du menu et de « Il manque » ont pu casser ailleurs — les AUTRES rôles qui ouvrent Ma journée, tous les états du pointage,
// des messages longs, aucune intervention, la nuit, le téléphone.
// Usage : node restes-technicien-recontrole.js [profil] [nuit=0|1] [qui=sm,kb,lr,tl]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-technicien-rc/';
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', quis = (process.argv[4] || 'sm,kb,lr,tl').split(',');
  for (const qui of quis) {
    const J = `${qui}-${profil}-${nuit ? 'nuit' : 'jour'}`;
    const c = await L.ouvrir({ profil, qui, nuit, hash: 'majournee' }), p = c.p; await L.calme(p, 600);
    const mesure = () => p.evaluate(() => { const i = document.querySelector('#contenu .rl-int'), bb = document.querySelector('.barre-bas'), bar = bb && getComputedStyle(bb).display !== 'none' ? bb.getBoundingClientRect().top : innerHeight;
      const ch = [...document.querySelector('#contenu').children].map(e => e.className.split(' ')[0] + (e.id ? '#' + e.id : ''));
      const pt = document.querySelector('.ptx-carte'), r = pt ? pt.getBoundingClientRect() : null;
      return { y: i ? Math.round(i.getBoundingClientRect().top + scrollY) : -1, bar: Math.round(bar), nInt: document.querySelectorAll('#contenu .rl-int').length, ordre: ch.join(' > '), puce: (document.querySelector('.mj-puce') || {}).textContent || '',
        ptH: r ? Math.round(r.height) : -1, ptFils: pt ? [...pt.children].map(e => e.className.split(' ')[0] || e.tagName).join(',') : '', gp: [...document.querySelectorAll('#contenu *')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible' && e.getBoundingClientRect().right > innerWidth + 1).length,
        h1: (document.querySelector('#contenu h1') || {}).textContent || '' }; });
    const nom = await p.evaluate(() => rlQui()); console.log(`-- ${J} : compte ${nom}`);
    let m = await mesure();
    v(`[${J}] population : l'écran Ma journée est rendu (Bonjour…)`, /Bonjour/.test(m.h1), m.h1);
    v(`[${J}] l'ordre : jour avant messages, camion et habilitations`, m.ordre.indexOf('rl-jour') > 0, m.ordre);
    console.log('   interventions :', m.nInt, '| ordre :', m.ordre, '| pt :', m.ptFils);
    // messages LONGS (cinq, dont un mot de 90 signes sans espace) : la puce reste sur UNE ligne, rien ne déborde
    await p.evaluate(() => { const k = rlQui(); for (let i = 0; i < 5; i++) NOTIFS.push({ k, txt: 'Marc a répondu à ta demande numéro ' + i + ' : ' + 'Précisions sur le chantier de la résidence des Mouettes à La Rochelle-sur-Mer, étage trois, escalier B — ' + (i === 2 ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJ' : ''), d: AUJ, h: '10:0' + i }); rendre(); }); await L.calme(p, 500);
    m = await mesure(); console.log('   avec 5 messages longs :', JSON.stringify({ y: m.y, bar: m.bar, puce: m.puce, ordre: m.ordre }));
    v(`[${J}] 5 messages : la puce dit « 5 messages du bureau »`, /5 messages du bureau/.test(m.puce), m.puce);
    if (m.nInt > 0) v(`[${J}] 5 messages longs : la 1re intervention reste au-dessus de la barre du bas`, m.y > 0 && m.y < m.bar - 24, m);
    const d1 = await L.deborde(c); v(`[${J}] 5 messages longs : la page ne glisse pas de côté`, d1.bouge === 0, d1);
    await L.capture(c, CAP + `msg-longs-${J}.png`, false);
    // le pointage, tous ses états, par les gestes
    const etapes = [['debut', 'commencé'], ['pause', 'en pause'], ['reprendre', 'repris'], ['termine', 'terminé (proposition)']];
    for (const [geste, lib] of etapes) {
      const ok = await L.toucher(c, `[data-ptx^="${geste}|"]`, { delai: 2500 }); if (!ok) { console.log(`   · geste ${geste} introuvable (${J})`); continue; }
      await L.calme(p, 450); m = await mesure();
      console.log(`   ${lib} :`, JSON.stringify({ y: m.y, bar: m.bar, ptH: m.ptH, pt: m.ptFils, puce: m.puce.slice(0, 20) }));
      if (m.nInt > 0) v(`[${J}] pointage ${lib} : la 1re intervention est au-dessus de la barre du bas`, m.y > 0 && m.y < m.bar - 24, { y: m.y, bar: m.bar, ptH: m.ptH });
      const d = await L.deborde(c); v(`[${J}] pointage ${lib} : la page ne glisse pas de côté`, d.bouge === 0, d);
      await L.capture(c, CAP + `pt-${geste}-${J}.png`, false);
      // les cibles du pointage au doigt
      if (c.doigt) { const dg = await L.doigts(p, '.ptx-carte'); v(`[${J}] pointage ${lib} : cibles ≥ 44 px dans la carte`, dg.petits.length === 0, dg.petits); }
    }
    // confirmation de fin (termineok / termineprop)
    for (const g of ['termineok', 'termineprop', 'plustard']) { const ok = await L.toucher(c, `[data-ptx^="${g}"]`, { delai: 1500 }); if (ok) { await L.calme(p, 450); m = await mesure(); console.log(`   après ${g} :`, JSON.stringify({ y: m.y, ptH: m.ptH, pt: m.ptFils })); if (m.nInt > 0) v(`[${J}] après ${g} : 1re intervention au-dessus de la barre`, m.y > 0 && m.y < m.bar - 24, m); await L.capture(c, CAP + `pt-${g}-${J}.png`, false); break; } }
    const e = c.err.filter(x => !/Failed|net::/.test(x)); v(`[${J}] aucune erreur de script`, e.length === 0, e.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
