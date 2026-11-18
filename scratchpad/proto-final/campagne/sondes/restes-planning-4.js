// Voie « restes », planning, TOUR 4 (18 novembre 2026). Garde de la casse trouvée au recontrôle du tour 3 : dans un panneau (colonne flex qui défile),
// `.ligne-clic` (min-height:58px) se tassait sous son texte quand la liste était longue. La correction est générale (`.panneau .ligne-clic, .kpi-l`) :
// cette sonde BALAIE donc toutes les vues du Planning et ouvre chaque tuile `[data-kpi]` pour exiger qu'aucune ligne d'un panneau ne soit plus petite que son texte.
// Usage : timeout 580 node restes-planning-4.js <profil> [nuit]    « N ✓ · M ✗ », code 1 si un contrôle tombe.
const L = require('../../lib.js');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-planning-4/';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
  let tuiles = 0, lignes = 0, coupees = [];
  // Seul le Planning porte des tuiles `[data-kpi]` : on le balaie dans chacune de ses vues (la liste est longue en Semaine, Mois, Vue d'ensemble).
  for (const v of ['jour', 'semaine', 'mois', 'general', 'multi']) {
    await c.p.evaluate(v => { try { aller('planning'); } catch (e) {} plVue = v; plRef = AUJ; plMasques = new Set(); multiExclu = new Set(); rendre(); scrollTo(0, 0); }, v); await L.calme(c.p, 500);
    const ks = await c.p.evaluate(() => [...document.querySelectorAll('#contenu [data-kpi]')].map(e => e.dataset.kpi));
    for (const k of [...new Set(ks)]) {
      await c.p.evaluate(k => { const e = document.querySelector(`#contenu [data-kpi="${k}"]`); if (e) e.click(); }, k); await L.calme(c.p, 550);
      const m = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); if (!P) return null; const R = [...P.querySelectorAll('.ligne-clic, .kpi-l')];
        return { n: R.length, cou: R.filter(x => x.scrollHeight > x.clientHeight + 2).map(x => Math.round(x.getBoundingClientRect().height) + ' pour ' + x.scrollHeight) }; });
      if (m) { tuiles++; lignes += m.n; if (m.cou.length) coupees.push(v + '/' + k + ' : ' + m.cou.slice(0, 2).join(', ')); }
      if (m && v === 'semaine' && k === 'int') await L.capture(c, CAP + `panneau-int-${profil}${nuit ? '-nuit' : ''}.png`);
      await c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(c.p, 200);
    }
  }
  L.v('population : tuiles ouvertes (≥ 15) et lignes mesurées (≥ 60)', tuiles >= 15 && lignes >= 60, { tuiles, lignes });
  L.v('aucune ligne de panneau n\'est plus petite que son texte', coupees.length === 0, coupees);
  await L.fermer();
  process.exit(L.bilan());
})().catch(e => { console.error(e); process.exit(2); });
