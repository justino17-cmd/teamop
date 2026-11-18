// Restes devis-atelier, tour 1 — recontrôle adverse : la règle neuve `html[data-app] .interr{min-height:44px}` (sous pointer:coarse) bat-elle des règles plus
// généreuses (48 px téléphone, 48 px des clauses) ? On construit, dans le cadre réel, un interrupteur par contexte du fichier, on lit sa hauteur calculée AVEC la règle,
// puis on RETIRE la règle de la feuille (en mémoire, rien d'écrit) et on relit. Rend « N ✓ · M ✗ ».
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
(async () => {
  for (const profil of (process.argv[2] || 'iphone,ipad,android').split(',')) {
    const c = await L.ouvrir({ profil, nuit: process.argv[3] === 'nuit', qui: 'marc', hash: 'devis' }), p = c.p;
    const f = await A.ouvrirAtelier(c, 'devis', 'devis'); v(`${profil} : l'atelier s'ouvre`, !!f); if (!f) { await L.fermer(); continue; }
    const r = await f.evaluate(() => {
      const ctx = { 'fenêtre d’envoi (.interr nu)': '', 'clause (.clause .interr)': 'clause', 'liste d’articles (.ac-l .interr)': 'ac-l', 'vierge (.vierge .interr)': 'vierge', 'vv-libre (.vv-libre .interr)': 'vv-libre' };
      const mesure = () => { const o = {}; for (const [nom, cl] of Object.entries(ctx)) { const w = document.createElement('div'); if (cl) w.className = cl; w.innerHTML = '<label class="interr"><input type="checkbox"><span>x</span></label>'; document.body.appendChild(w); o[nom] = Math.round(w.firstChild.getBoundingClientRect().height * 10) / 10; w.remove(); } return o; };
      const avec = mesure(); let retire = 0;
      for (const ss of document.styleSheets) { let rr; try { rr = ss.cssRules } catch (e) { continue } for (let i = rr.length - 1; i >= 0; i--) { const m = rr[i]; if (m.media && /pointer:\s*coarse/.test(m.conditionText || m.media.mediaText)) { for (let j = m.cssRules.length - 1; j >= 0; j--) { const s = m.cssRules[j]; if (s.selectorText === 'html[data-app] .interr') { m.deleteRule(j); retire++ } } } } }
      return { avec, sans: mesure(), retire, coarse: matchMedia('(pointer:coarse)').matches, larg: innerWidth };
    });
    v(`${profil} : la règle neuve est trouvée dans la feuille (population)`, r.retire === 1, r.retire);
    for (const k of Object.keys(r.avec)) v(`${profil} (${r.larg} px, tactile ${r.coarse}) ${k} : ${r.sans[k]} px avant la règle, ${r.avec[k]} px avec — la règle ne rapetisse rien`, r.avec[k] >= r.sans[k] - 0.5, { avant: r.sans[k], avec: r.avec[k] });
    await L.fermer();
  }
  process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e.message.slice(0, 900)); await L.fermer(); process.exit(2); });
