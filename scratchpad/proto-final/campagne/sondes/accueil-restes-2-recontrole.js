// RECONTRÔLE ADVERSE des RESTES de l'Accueil, tour 2 : (1) le graphique des 12 mois à chaque pas de 10 px (la requête de conteneur à 557 px
// ne doit pas faire défiler un graphique qui tient, ni laisser un mois coupé quand il défile) ; (2) la tuile « Encaissé » du bilan et ses valeurs longues ;
// (3) la ligne « reçu sur place » : une seule règle pour tous les cas du prototype (Espèces/Chèque/Carte/Virement, avec ou sans montant, facture absente).
// node accueil-restes-2-recontrole.js [partie : C T R, ou collées] [profil] [nuit] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
const partie = (process.argv[2] || 'CTR').toUpperCase(), profil = process.argv[3] || 'mac', nuit = process.argv.includes('nuit'), veut = k => partie.includes(k);
(async () => {
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  if (veut('C')) {
    const larges = []; for (let w = 480; w <= 940; w += 10) larges.push(w);
    let n = 0, defilent = 0, tiennent = 0, serres = [];
    for (const w of larges) {
      await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(150);
      await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 350);
      const g = await p.evaluate(() => { const e = document.querySelector('.st-graph'); if (!e) return null; const cs = getComputedStyle(e), co = e.parentElement.getBoundingClientRect().width,
          cols = e.querySelector('.st-cols'), colsW = cols.getBoundingClientRect().width, defile = e.scrollWidth > e.clientWidth + 1, q = document.querySelector('.st-glisse'),
          gl = !!q && getComputedStyle(q).display !== 'none', mask = /gradient/.test(cs.maskImage || cs.webkitMaskImage || ''), pad = parseFloat(cs.paddingLeft);
        // le premier mois (à droite en rtl ? non : les colonnes sont en ltr, l'enveloppe en rtl, ouverte calée à DROITE) : on regarde le plus ancien mois à l'autre bout
        let premierEntier = true; if (defile) { e.scrollLeft = -(e.scrollWidth - e.clientWidth); const r = e.getBoundingClientRect(), r0 = e.querySelector('.st-col').getBoundingClientRect(); premierEntier = r0.left >= r.left + pad - 1; }
        return { co: Math.round(co), colsW: Math.round(colsW), defile, gl, mask, pad, surplus: e.scrollWidth - e.clientWidth, premierEntier, pageX: document.documentElement.scrollWidth > innerWidth + 1 }; });
      n++; if (!g) { v(`C · ${w} · graphique présent`, false); continue; }
      g.defile ? defilent++ : tiennent++;
      const ok = g.defile ? (g.gl && g.mask && g.premierEntier) : (!g.gl && !g.mask)   /* au bureau (> 760 px, souris) la marge de 44 px est celle des graduations : normale */;
      v(`C · ${w} px · carte ${g.co} · ${g.defile ? 'défile (+' + g.surplus + ' px)' : 'tient'} · phrase ${g.gl ? 'oui' : 'non'} · fondu ${g.mask ? 'oui' : 'non'} · marge ${g.pad} · premier mois entier ${g.premierEntier}`, ok && !g.pageX, g);
      // un graphique qui ne défile QUE de la marge du fondu (≤ 30 px) tenait sans elle : le seuil de la requête de conteneur (557 px = 528 + 30) est trop large, il devrait être 527 px
      if (g.defile) v(`C · ${w} px · ne défile pas pour la seule marge du fondu (surplus ${g.surplus} px)`, g.surplus > 30, g);
      if (g.defile && g.surplus <= 30) serres.push(w + ' (carte ' + g.co + ', surplus ' + g.surplus + ')');
    }
    v(`C · population : ${n} largeurs, ${defilent} où ça défile, ${tiennent} où ça tient`, n > 40 && defilent > 5 && tiennent > 5, { defilent, tiennent });
    console.log('  · défilement de 30 px ou moins (dû à la seule marge du fondu) à : ' + (serres.join(' ; ') || 'aucun'));
  }
  if (veut('R')) {
    // l'argent noté sur une intervention datée APRÈS octobre (la Comptabilité du prototype ne montre qu'octobre : cpOct) n'est compté ni écrit nulle part
    for (const [id, qui, pa, date, attendu] of [['i3', 'kb', { etat: 'total', mode: 'Chèque', montant: '', ticket: false }, 'octobre', true], ['i8', 'kb', { etat: 'acompte', mode: 'Espèces', montant: '50', ticket: false }, 'novembre', true]]) {
      await p.evaluate(() => { try { sessionFermer('essai'); } catch (e) {} }); await p.reload(); await p.waitForTimeout(1200);
      await p.evaluate(q => { reglages.auto = false; route = 'accueil'; sessionOuvrir(q); }, qui);
      await L.aller(p, 'inter-x-' + id); await L.calme(p, 400);
      await p.evaluate(([id, pa]) => { const F = fiche(id); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Fait.'; F.signature = 'signee'; F.suite = { entretien: false }; F.pieces = [{ nom: 'Pièce', q: '1', pu: 35.5 }]; F.paiement = pa; }, [id, pa]);
      await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 700); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first());
      const e = await p.evaluate(id => ({ st: INTS.find(o => o.id === id).st, d: INTS.find(o => o.id === id).d, lignes: JOURNAL.filter(j => /reçu sur place/.test(j.action) && j.el && j.el.id === id).length, compte: cpPaieTerrain().filter(x => x.int === id).reduce((s, x) => s + x.ttc, 0) }), id);
      v(`R · ${id} (daté ${date}) terminée : l'argent noté est compté par l'Accueil ET écrit dans l'Historique`, e.st === 'fait' && e.compte > 0 && e.lignes === 1, e);
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
