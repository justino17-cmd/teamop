// Tour 5 : les deux plafonds d'une ligne de FACTURE ont chacun leur cas, que l'autre ne peut pas doubler.
//  · prix unitaire (« v >= DV_PU_MAX », saisie du prix) : 1 500 000 € × 0,5 = 750 000 € passerait le plafond du TOTAL, seul le plafond du prix le refuse ; 1 000 000 € × 1 non plus (1 M€ n'est pas > 1 M€)
//  · total par la quantité (« nq * pu > DV_PU_MAX », saisie de la quantité) : le prix 600 € est posé d'abord (quantité 1), puis 2 000 en quantité — seul ce plafond le refuse
// usage : node devis-contrats-plafond-tour5.js <profil> [nuit] → « N ✓ · M ✗ »
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 500);
  const ev = (f, a) => p.evaluate(f, a), toast = () => ev(() => (document.getElementById('toast') || {}).textContent || '');
  await L.aller(p, 'inter-x-i6'); await L.toucher(c, '[data-action="prepFacture"]'); await L.calme(p, 500);
  const fid = await ev(() => { const x = FACTURES.find(o => o.st === 'avalider'); return x && x.id; }); v('population : une facture existe', !!fid, fid);
  await L.aller(p, 'facture-x-' + fid); await L.calme(p, 500); await L.toucher(c, '[data-action="ligneAjout"]'); await L.calme(p, 400);
  const kl = (await ev(() => document.querySelectorAll('[data-fdes]').length)) - 1, fp = `[data-prix="${kl}"]`, fq = `[data-fqte="${kl}"]`;
  v('population : la ligne neuve est la dernière', kl >= 0, kl);
  const pose = async (sel, x) => { await ev(() => { const T = document.getElementById('toast'); if (T) T.textContent = ''; }); await p.fill(sel, x); await p.dispatchEvent(sel, 'change'); await L.calme(p, 450); };
  const lg = () => ev(([id, k]) => { const l = FACTURES.find(o => o.id === id).lignes[k]; return l && { q: l.q, pu: l.pu }; }, [fid, kl]);
  // plafond du PRIX UNITAIRE
  await pose(fq, '0,5'); await pose(fp, '1500000'); let g = await lg(), t = await toast();
  v('prix 1 500 000 € × 0,5 (total 750 000 €) : refusé par le plafond du PRIX, message « trop grand »', g && !(g.pu >= 1e6) && /trop grand/.test(t), [g, t]);
  await pose(fq, '1'); await pose(fp, '1000000'); g = await lg(); t = await toast();
  v('prix 1 000 000 € × 1 : refusé (le plafond du prix est strict)', g && !(g.pu >= 1e6) && /trop grand/.test(t), [g, t]);
  await pose(fp, '999999'); g = await lg(); v('prix 999 999 € × 1 : accepté', g && g.pu === 999999, g);
  // plafond du TOTAL par la quantité
  await pose(fp, '600'); await pose(fq, '2000'); g = await lg(); t = await toast();
  v('quantité 2 000 × 600 € (1,2 M€) : refusée par le plafond du total, la quantité précédente est gardée', g && String(g.q) === '1' && /dépasserait/.test(t), [g, t]);
  await pose(fq, '1500'); g = await lg(); v('quantité 1 500 × 600 € (900 000 €) : acceptée', g && g.q === '1500' && g.pu === 600, g);
  await L.capture(c, O.CAP + `plafond5-facture-${profil}${nuit ? '-nuit' : ''}.png`);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
