// Le relevé des absences (« Exporter en PDF ») se lit en entier sur téléphone : tableaux dans leur boîte, pas de période en colonne de mots (défaut taches-absences-03).
// usage : node taches-absences-sonde-export.js [profil]   — jour ET nuit ; rend « N ✓ · M ✗ ».
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
(async () => {
  for (const profil of (process.argv[2] ? [process.argv[2]] : ['petit', 'android', 'iphone', 'mac'])) for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil, qui: 'marc', nuit, hash: 'absences' }); const p = c.p; await L.calme(p, 500);
    await p.evaluate(() => document.querySelector('[data-aexport]').click()); await L.calme(p, 600);
    const m = await p.evaluate(() => { const b = document.querySelector('#calque .panneau .bil'); if (!b) return null;
      return { tables: [...b.querySelectorAll('table')].map(t => ({ w: t.scrollWidth, boite: t.parentElement.clientWidth })), lignes: b.querySelectorAll('section:first-of-type tbody tr').length,
        periodeVue: [...b.querySelectorAll('tbody tr td:nth-child(3)')].map(td => { const h = td.getBoundingClientRect().height; return Math.round(h); }), motifVu: [...b.querySelectorAll('.bil-bur')].some(e => e.offsetParent !== null),
        sousVu: [...b.querySelectorAll('.bil-sous')].some(e => e.offsetParent !== null) }; });
    const tag = `${profil}${nuit ? ' nuit' : ' jour'}`;
    v(`${tag} : le relevé est ouvert et porte des lignes (${m && m.lignes})`, !!m && m.lignes >= 1, m);
    if (!m) { await L.fin(c); continue; }
    v(`${tag} : chaque tableau tient dans sa boîte`, m.tables.every(t => t.w <= t.boite + 2), m.tables);
    if (c.largeur <= 760) { v(`${tag} : type et motif sous le nom (colonnes larges retirées)`, m.sousVu && !m.motifVu, m);
      v(`${tag} : une période tient sur une ou deux lignes (≤ 80 px de haut)`, m.periodeVue.every(h => h <= 80), m.periodeVue); }
    else v(`${tag} : le tableau large garde ses colonnes Type et Motif`, m.motifVu && !m.sousVu, m);
    await p.evaluate(() => { const b = document.querySelector('#calque .panneau .bil'); b.scrollIntoView({ block: 'start' }); }); await L.calme(p, 300);
    await L.capture(c, O.CAP + `export-${tag.replace(' ', '-')}.png`);
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
