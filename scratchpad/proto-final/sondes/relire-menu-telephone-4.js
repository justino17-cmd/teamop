// RELECTURE ADVERSE du lot « menu », angle TÉLÉPHONE, 4e sonde : la ligne de la feuille « Menu » qui s'allume est celle de l'écran où l'on est,
// et rien de fixe ou de collant ne passe sous l'encoche du haut (iPhone, 47 px) une fois la page défilée.
const L = require('../lib.js'), v = L.v;
const ROUTES = { marc:['accueil', 'statistiques', 'historique', 'planning', 'interventions', 'taches', 'absences', 'clients', 'devis', 'contrats', 'boiteMail', 'achats', 'stock', 'produits', 'boxes', 'equipe', 'pointage', 'vehicules'], sm:['majournee', 'taches', 'techfrais', 'mesheures', 'moncamion', 'absences'], julie:['taches', 'interventions', 'clients', 'devis', 'contrats', 'achats'] };
(async () => {
  let n = 0;
  for (const qui of ['marc', 'sm', 'julie']) {
    const c = await L.ouvrir({ profil:'iphone', nuit:false, qui }); const tag = 'iphone/' + qui;
    for (const r of ROUTES[qui]) {
      await L.aller(c.p, r); await c.p.evaluate(() => window.scrollTo(0, 400)); await L.calme(c.p, 300);
      const haut = await c.p.evaluate(top => [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); if (!(cs.position === 'fixed' || cs.position === 'sticky')) return false; if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const b = e.getBoundingClientRect(); return b.width > 20 && b.height > 4 && b.top < top && b.bottom > 0; })
        .map(e => e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 30) + ' top=' + Math.round(e.getBoundingClientRect().top) + ' « ' + (e.textContent || '').trim().slice(0, 25) + ' »'), 47);
      v(`${tag}/${r} : rien de fixe ni de collant sous l'encoche du haut (47 px)`, haut.length === 0, haut);
      await c.p.evaluate(() => window.scrollTo(0, 0)); await L.toucher(c, '#contenu .tt-menu');
      const f = await c.p.evaluate(() => [...document.querySelectorAll('#calque .panneau .ligne-clic.on')].map(b => b.dataset.go));
      n++; v(`${tag}/${r} : la feuille allume UNE ligne, celle de l'écran (${r})`, f.length === 1 && f[0] === (r === 'taches' || r === 'absences' || true ? f[0] : r) && f[0] === r, f);
      await L.ranger(c.p);
    }
    await L.fin(c);
  }
  v('population : des écrans ont été parcourus', n >= 20, n);
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})();
