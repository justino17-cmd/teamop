// Constat : deux clics dans la MÊME tâche sur « ‹ OP GESTION » — que reste-t-il dans l'historique ? PROFIL, QUI. Sert à savoir si la protection `if (!cpSysteme) return` mord.
const C = require('../../sondes/retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'android', QUI = process.env.QUI || 'marc';
(async () => {
  for (const panneau of [true, false]) {
    const c = await L.ouvrir({ profil: PROFIL, qui: QUI }), p = c.p;
    await L.aller(p, 'interventions'); await L.aller(p, 'clients');
    if (C.etroit(c)) { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(c, '#calque [data-go="comptabilite"]'); } else await L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
    await p.waitForTimeout(1700); await L.calme(p, 300); const f = L.cadre(p, /prototype-comptabilite\.html/);
    if (panneau && f) { await f.evaluate(() => { const b = document.querySelector('[data-a="reglages"]'); if (b) b.click(); }); await p.waitForTimeout(500); }
    const av = await p.evaluate(() => ({ n: history.length, h: location.hash }));
    await p.evaluate(() => { const b = document.querySelector('#cpsys [data-cpsys="retour"]'); b.click(); b.click(); });
    await p.waitForTimeout(1800); await L.calme(p, 300);
    const ap = await p.evaluate(() => ({ n: history.length, h: location.hash, pousse: CAL.pousse, cpsys: !!document.querySelector('#cpsys:not([hidden])') }));
    await C.retour(p); const r1 = await p.evaluate(() => location.hash);
    console.log('  ·', PROFIL, QUI, panneau ? 'panneau' : 'sans', JSON.stringify({ av, ap, r1 }));
    await L.fin(c);
  }
  await L.fermer(); process.exit(0);
})().catch(e => { console.log('exception', e.message); L.fermer().then(() => process.exit(1)); });
