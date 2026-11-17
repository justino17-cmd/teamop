// Mise en page de la journée du technicien (campagne du 17 novembre 2026) : 6 écrans × profils × jour/nuit.
// Contre la largeur POSÉE du profil : glissement latéral, cibles au doigt < 44 px, champs < 16 px, texte écrasé. Une capture par écran pour la REGARDER.
// Usage : node technicien-mise-en-page.js <profils séparés par des virgules> [nuit=0|1|2 (2 = les deux)] [qui=sm]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
const ROUTES = ['majournee', 'taches', 'techfrais', 'mesheures', 'moncamion', 'absences'];
(async () => {
  const profils = (process.argv[2] || 'iphone,android,petit').split(','), mode = process.argv[3] || '2', qui = process.argv[4] || 'sm';
  for (const profil of profils) for (const nuit of mode === '2' ? [false, true] : [mode === '1']) {
    const c = await L.ouvrir({ profil, qui, nuit }); let vus = 0;
    for (const r of ROUTES) {
      await L.aller(c.p, r); await L.calme(c.p, 500);
      const h1 = await c.p.evaluate(() => (document.querySelector('#contenu h1') || {}).textContent || '');
      if (!h1) { v(`[${profil} ${nuit ? 'nuit' : 'jour'}] ${r} : l’écran a un titre`, false); continue; } vus++;
      const d = await L.deborde(c), f = await L.doigts(c.p);
      const nom = `[${profil} ${nuit ? 'nuit' : 'jour'}] ${r}`;
      v(nom + ' : aucun glissement latéral', d.bouge === 0 && d.premiere <= c.largeur, d);
      if (c.doigt) { v(nom + ' : cibles ≥ 44 px', f.petits.length === 0, f.petits.slice(0, 6)); v(nom + ' : champs ≥ 16 px', f.champs.length === 0, f.champs.slice(0, 6)); }
      const note = await c.p.evaluate(() => { const e = document.querySelector('#contenu .droits-note'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; });
      v(nom + ' : pas de phrase « ton compte ne peut pas … » sur un écran fait pour le technicien (technicien-01)', !note, note);
      v(nom + ' : aucun texte écrasé', f.ecrases.length === 0, f.ecrases.slice(0, 4));
      if (r === 'majournee') { const y = await c.p.evaluate(() => { const e = document.querySelector('#contenu .rl-int'); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : -1; }); console.log('   1re intervention du jour à y =', y, 'px (écran de', c.hauteur, 'px)'); v(nom + ' : la 1re intervention du jour se voit sans défiler (technicien-02)', y > 0 && y < c.hauteur - 120, { y, hauteur: c.hauteur }); }
      await L.capture(c, CAP + `mep-${qui}-${profil}-${nuit ? 'nuit' : 'jour'}-${r}.png`, true);
    }
    v(`[${profil} ${nuit ? 'nuit' : 'jour'}] population : les 6 écrans ont été vus`, vus === ROUTES.length, vus);
    v(`[${profil} ${nuit ? 'nuit' : 'jour'}] aucune erreur de page`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
