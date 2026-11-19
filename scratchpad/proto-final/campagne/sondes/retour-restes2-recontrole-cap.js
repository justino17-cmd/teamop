// Captures du recontrôle « restes du bouton Retour, tour 2 » : la barre « ‹ OP GESTION » au-dessus d'un panneau ouvert du cadre, puis l'écran d'arrivée après le toucher. Jour et nuit, téléphone et ordinateur.
// La correction ne change aucun pixel : on regarde que la barre reste visible, lisible, et que l'écran d'arrivée est propre. Sort en 1 si la barre manque.
const C = require('../../sondes/retour-commun.js'), L = C.L, v = C.v;
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/43888b8a-bc24-5141-b2d5-216f00c55461/scratchpad/cap/retour2rc';
(async () => {
  for (const [profil, nuit] of [['android', false], ['android', true], ['mac', false], ['mac', true], ['iphone', true]]) {
    const c = await L.ouvrir({ profil, nuit }), p = c.p;
    await L.aller(p, 'clients'); await L.aller(p, 'accueil');
    if (C.etroit(c)) { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(c, '#calque [data-go="comptabilite"]'); } else await L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
    await p.waitForTimeout(1800); await L.calme(p, 300);
    const f = L.cadre(p, /prototype-comptabilite\.html/); v(profil + (nuit ? ' nuit' : '') + ' : le cadre est là (population)', !!f); if (!f) { await L.fin(c); continue; }
    await f.evaluate(() => { const b = document.querySelector('[data-a="reglages"]'); if (b) b.click(); }); await p.waitForTimeout(700);
    const nom = profil + (nuit ? '-nuit' : '-jour');
    await L.capture(c, CAP + '/r2rc-panneau-' + nom + '.png');
    const vis = await p.evaluate(() => { const b = document.querySelector('[data-cpsys="retour"]'); if (!b) return null; const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { h: Math.round(r.height), w: Math.round(r.width), haut: Math.round(r.y), touche: !!(e && (e === b || b.contains(e))) }; });
    v(nom + ' : « ‹ OP GESTION » est visible et touchable au-dessus du panneau — ' + JSON.stringify(vis), !!vis && vis.touche && vis.h >= (c.doigt ? 44 : 28));
    await p.evaluate(() => document.querySelector('[data-cpsys="retour"]').click()); await p.waitForTimeout(1300); await L.calme(p, 300);
    await L.capture(c, CAP + '/r2rc-arrivee-' + nom + '.png');
    v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN ERREUR', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
