// Sonde de LECTURE (ne modifie rien) : le menu, la barre, l'ouverture et la coque de chaque personne de la démonstration, et la
// largeur (px) de textes candidats pour la ligne grise du menu, contre la place réellement disponible (147 px à l'ordinateur).
// Sert de point de départ aux sondes `droits-menus.js` (spécification MON-ENTREPRISE-ET-DROITS.md § 2.12 et § 3) : après D2,
// les cinq mêmes personnes doivent rendre 20 / 20 (Responsable à créer) / 7 / 6 / 6 lignes.
// Usage, depuis la racine du dépôt : timeout 300 node scratchpad/proto-final/refonte/entreprise-droits-outils/menus-actuels.js
const L = require('../../lib.js');
const TEXTES = process.argv.slice(2).length ? process.argv.slice(2) : ['Factures, paiements, paie', 'Demandes de l’équipe', 'Demandes et notes de frais', 'Matériel et notes de frais'];
(async () => {
  let code = 0;
  for (const qui of ['marc', 'julie', 'sm', 'kb']) {
    const c = await L.ouvrir({ profil: 'mac', qui });
    const m = await c.p.evaluate(() => ({ role: ROLE, lignes: rlLignes().map(x => (x.g ? x.g + ' > ' : '') + x.l), barre: rlOnglets().map(o => o.nom), ouverture: rlOuverture() }));
    console.log(qui, m.role, m.lignes.length + ' lignes', '| barre : ' + m.barre.join(', '), '| ouverture : ' + m.ouverture);
    if (qui === 'marc') {
      const w = await c.p.evaluate(ts => { const s = document.querySelector('.m-sous'), col = s && s.closest('.m-t'); if (!s || !col) return null; const cs = getComputedStyle(s);
        const mesure = t => { const e = document.createElement('span'); e.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' + cs.font; e.textContent = t; document.body.appendChild(e); const x = e.getBoundingClientRect().width; e.remove(); return Math.round(x); };
        return { dispo: Math.round(col.getBoundingClientRect().width), mesures: Object.fromEntries(ts.map(t => [t, mesure(t)])) }; }, TEXTES);
      if (!w) { console.log('  ✗ aucune ligne grise trouvée dans le menu (la mesure ne prouve rien)'); code = 1; } else console.log('  place disponible : ' + w.dispo + ' px ;', JSON.stringify(w.mesures));
    }
    await L.fin(c);
  }
  await L.fermer(); process.exit(code);
})().catch(e => { console.error(e); process.exit(1); });
