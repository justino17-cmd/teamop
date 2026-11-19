// Angle « accès » · sonde 1 : l'adresse tapée à la main (#route, #route-x-id) — pour chaque personne de l'équipe, chaque écran de l'application.
// Une route fermée par droitVoit() doit RESTER fermée quand on la tape dans la barre d'adresse. On mesure ce que la PAGE montre, pas ce qu'elle croit.
// ⛔ 127.0.0.1 seulement, entreprise fictive. Population comptée avant de conclure (un zéro sur un ensemble vide ne prouve rien).
const L = require('../lib.js');
(async () => {
  const QUI = (process.env.QUI || 'marc,julie,sm,kb,lr,tl').split(',');
  const resultat = {};
  for (const qui of QUI) {
    const c = await L.ouvrir({ profil: 'mac', qui, attente: 900 });
    const routes = await c.p.evaluate(() => Object.keys(vues()));
    L.v(qui + ' : population de routes comptée', routes.length > 30, routes.length);
    const ouvertes = [], fermeesMontrees = [], fermeesRefusees = [];
    for (const r of routes) {
      await c.p.evaluate(h => { location.hash = '#' + h; }, r);
      await c.p.waitForTimeout(260);
      const s = await c.p.evaluate(r => {
        const droit = droitVoit(r), c = document.getElementById('contenu'), h1 = c.querySelector('h1');
        return { droit, route, param, h1: h1 ? h1.textContent.trim().slice(0, 50) : '', len: c.innerText.length, hash: location.hash, cpsys: !!document.getElementById('cpsys') && !document.getElementById('cpsys').hidden };
      }, r);
      const montre = s.route === r || (r === 'comptabilite' && s.cpsys);
      if (s.droit) ouvertes.push(r);
      else if (montre) fermeesMontrees.push({ r, h1: s.h1, len: s.len, hash: s.hash });
      else fermeesRefusees.push(r);
    }
    resultat[qui] = { ouvertes: ouvertes.length, fermeesMontrees, fermeesRefusees: fermeesRefusees.length };
    console.log('\n[' + qui + '] droitVoit=oui : ' + ouvertes.length + ' · fermées et refusées : ' + fermeesRefusees.length + ' · fermées MAIS montrées : ' + fermeesMontrees.length);
    fermeesMontrees.forEach(f => console.log('    ⚠', f.r, '→', JSON.stringify(f.h1), f.len + ' car.', f.hash));
    L.v(qui + ' : aucune route fermée ne s\'affiche', fermeesMontrees.length === 0, fermeesMontrees.map(f => f.r).join(','));
    if (c.err.length) console.log('  erreurs page :', c.err.slice(0, 3));
    await L.fin(c);
  }
  require('fs').writeFileSync('/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/acces/routes.json', JSON.stringify(resultat, null, 1));
  await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
