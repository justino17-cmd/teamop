// RESTES de l'Accueil, tour 2 : la tuile « Encaissé » des Statistiques garde SA comparaison (« par rapport à sept. 2026 ») ET dit « hors X € reçus sur place », comme la tuile « Facturé » garde la sienne ;
// la tuile ne coupe rien sur téléphone, valeur longue comprise. node accueil-restes-2.js [profil] [nuit] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), tag = profil + (nuit ? '-nuit' : '-jour');
(async () => {
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const lire = () => p.evaluate(() => { const t = id => { const k = document.querySelector(`[data-stdet="${id}"]`); if (!k) return null; const r = k.getBoundingClientRect(); return { txt: k.innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '), droite: Math.round(r.right), coupe: [...k.querySelectorAll('small,b')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent.slice(0, 30)), larg: innerWidth, page: document.documentElement.scrollWidth }; };
    return { fac: t('fac'), enc: t('enc'), sur: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0) }; });
  for (const long of [false, true]) {
    if (long) await p.evaluate(() => { try { fiche('i6').paiement.montant = '12345,67'; PAIE_DEMO.i6.montant = '12345,67'; } catch (e) {} });
    await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 500);
    const e = await lire();
    v(`${long ? 'valeur longue' : 'démo'} · population : l'argent reçu sur place est compté (${e.sur} €) et les deux tuiles existent`, e.sur > 0 && !!e.fac && !!e.enc, e);
    v(`${long ? 'valeur longue' : 'démo'} · la tuile Facturé garde sa comparaison`, /par rapport à/.test(e.fac.txt), e.fac.txt);
    v(`${long ? 'valeur longue' : 'démo'} · la tuile Encaissé garde SA comparaison (par rapport à…)`, /par rapport à/.test(e.enc.txt), e.enc.txt);
    v(`${long ? 'valeur longue' : 'démo'} · … et dit « hors X € reçus sur place »`, /hors .+ reçus sur place/.test(e.enc.txt), e.enc.txt);
    v(`${long ? 'valeur longue' : 'démo'} · rien de coupé, rien ne dépasse, la page ne glisse pas`, e.enc.coupe.length === 0 && e.enc.droite <= e.enc.larg + 1 && e.enc.page <= e.enc.larg + 1, e.enc);
    await p.evaluate(() => { const k = document.querySelector('[data-stdet="enc"]'); k.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(250);
    await L.capture(c, O.CAP + `restes2-tuile-enc-${long ? 'longue' : 'demo'}-${tag}.png`, false);
    // le bilan en PDF : sa tuile « Encaissé » garde la comparaison ET dit « hors X € reçus sur place », comme sur l'écran
    await L.toucher(c, '[data-stbilan="1"]', { delai: 4000 }); await p.waitForTimeout(700);
    const b = await p.evaluate(() => { const q = document.querySelector('#calque'); const tu = [...q.querySelectorAll('.bil-t')], t = x => tu.find(k => k.querySelector('span').textContent.trim() === x);
      const f = t('Facturé'), en = t('Encaissé'); const r = en && en.getBoundingClientRect(), pr = q.getBoundingClientRect(), sm = en && en.querySelector('small');
      return { commentaireAffiche: /\/\*|\*\//.test(q.innerText), n: tu.length, fac: f && f.innerText.replace(/\s+/g, ' ').replace(/[\u00a0\u202f]/g, ' '), enc: en && en.innerText.replace(/\s+/g, ' ').replace(/[\u00a0\u202f]/g, ' '), coupe: sm ? sm.scrollWidth > sm.clientWidth + 1 : null, droite: r && Math.round(r.right), panneauDroite: Math.round(pr.right), larg: innerWidth }; });
    v(`${long ? 'valeur longue' : 'démo'} · bilan · population : des tuiles, dont Facturé et Encaissé`, b.n >= 4 && !!b.fac && !!b.enc && !b.commentaireAffiche, b);   // un commentaire de code tombé dans le gabarit s'imprime dans le bilan : vu sur capture
    v(`${long ? 'valeur longue' : 'démo'} · bilan · la tuile Encaissé garde « par rapport à » et dit « hors … reçus sur place »`, /par rapport à/.test(b.enc) && /hors .+ reçus sur place/.test(b.enc), b.enc);
    v(`${long ? 'valeur longue' : 'démo'} · bilan · rien de coupé, la tuile reste dans la fenêtre`, b.coupe === false && b.droite <= b.panneauDroite + 1 && b.droite <= b.larg + 1, b);
    await L.capture(c, O.CAP + `restes2-bilan-${long ? 'longue' : 'demo'}-${tag}.png`, false); await L.ranger(p);
  }
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
