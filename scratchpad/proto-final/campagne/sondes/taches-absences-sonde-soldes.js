// Mesure du tableau « L'équipe en un coup d'œil » (Soldes) : chaque colonne, sur les largeurs de téléphone (défaut taches-absences-09).
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
(async () => {
  for (const profil of (process.argv[2] ? [process.argv[2]] : ['petit', 'android', 'iphone'])) {
    const c = await L.ouvrir({ profil, qui: 'marc', hash: 'absences' }); const p = c.p; await L.calme(p, 500);
    await p.evaluate(() => document.querySelector('[data-aonglet=soldes]').click()); await L.calme(p, 500);
    const m = await p.evaluate(() => { const t = document.querySelector('.as-t'), b = t.parentElement; return { table: t.scrollWidth, boite: b.clientWidth, cols: [...t.querySelectorAll('thead th')].map(h => Math.round(h.getBoundingClientRect().width)), lignes: t.querySelectorAll('tbody tr').length }; });
    console.log(profil, JSON.stringify(m));
    v(`${profil} : la population est là (${m.lignes} personnes)`, m.lignes >= 3);
    v(`${profil} : le tableau tient dans sa boîte (${m.table} dans ${m.boite})`, m.table <= m.boite + 1, m);
    await p.evaluate(() => document.querySelector('.as-t').scrollIntoView({ block: 'center' })); await L.calme(p, 300); await L.capture(c, O.CAP + `soldes-${profil}.png`);
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
