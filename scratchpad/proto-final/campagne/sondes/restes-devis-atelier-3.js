// Restes devis-atelier, tour 2 : GARDE du plancher des interrupteurs. La règle `:where(html[data-app]) .interr{min-height:44px}` (sous pointer:coarse) doit
// (1) faire passer un `.interr` nu de 38 à 44 px sur iPad, (2) ne RIEN rapetisser : les contextes à 48 px (clause, liste d'articles, feuille vierge, téléphones) restent à 48.
// Contre-épreuve intégrée : règle retirée EN MÉMOIRE → le `.interr` nu retombe à 38 (sur iPad). Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
// Usage : node restes-devis-atelier-3.js [profils séparés par des virgules] [nuit]
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
(async () => {
  for (const profil of (process.argv[2] || 'ipad,iphone,android').split(',')) {
    const c = await L.ouvrir({ profil, nuit: process.argv[3] === 'nuit', qui: 'marc', hash: 'devis' });
    const f = await A.ouvrirAtelier(c, 'devis', 'devis'); v(`${profil} : l'atelier s'ouvre`, !!f); if (!f) { await L.fermer(); continue; }
    const r = await f.evaluate(() => {
      const ctx = { nu: '', clause: 'clause', liste: 'ac-l', vierge: 'vierge' };
      const mesure = () => { const o = {}; for (const [n, cl] of Object.entries(ctx)) { const w = document.createElement('div'); if (cl) w.className = cl; w.innerHTML = '<label class="interr"><input type="checkbox"><span>x</span></label>'; document.body.appendChild(w); o[n] = Math.round(w.firstChild.getBoundingClientRect().height); w.remove(); } return o; };
      const avec = mesure(); let retire = 0;
      for (const ss of document.styleSheets) { let rr; try { rr = ss.cssRules } catch (e) { continue } for (const m of rr) { if (m.media && /pointer:\s*coarse/.test(m.conditionText || m.media.mediaText)) for (let j = m.cssRules.length - 1; j >= 0; j--) { const t = m.cssRules[j].selectorText || ''; if (/where/.test(t) && /\.interr$/.test(t)) { m.deleteRule(j); retire++; } } } }
      return { avec, sans: mesure(), retire, larg: innerWidth };
    });
    v(`${profil} : la règle est dans la feuille (population)`, r.retire === 1, r.retire);
    for (const [n, h] of Object.entries(r.avec)) v(`${profil} (${r.larg} px) ${n} : ${h} px, jamais sous 44`, h >= 44, h);
    for (const n of ['clause', 'liste', 'vierge']) v(`${profil} ${n} : la règle ne le rapetisse pas (${r.sans[n]} → ${r.avec[n]})`, r.avec[n] >= r.sans[n], r);
    if (profil === 'ipad') v('ipad : sans la règle le .interr nu retombe à 38 (la contre-épreuve mord)', r.sans.nu === 38 && r.avec.nu === 44, r);
    await L.fermer();
  }
  process.exit(L.bilan());
})();
