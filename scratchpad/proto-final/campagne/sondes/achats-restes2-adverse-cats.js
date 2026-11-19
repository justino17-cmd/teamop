// RECONTRÔLE ADVERSE restes-achats tour 2 (18 novembre 2026), suite : dans CHAQUE catégorie d'achats, la liste « Sans facture » / « Sans justificatif »
// montre autant de lignes que la règle le dit (cxDocs), après la validation des notes de frais avec ticket (qui entrent dans « sans facture »),
// et la puce n'existe que quand il y a de quoi la remplir. Usage : node achats-restes2-adverse-cats.js [profil=mac]
const { L, ouvrirAchats } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await ouvrirAchats({ profil, qui: 'marc' }), p = c.p, E = (f, a) => p.evaluate(f, a);
  await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); await L.calme(p, 400);
  for (const d of await E(() => [...document.querySelectorAll('[data-ac^="ndfok|"]')].map(b => b.dataset.ac).filter(x => !/n3$/.test(x)))) { await E(d => { const b = document.querySelector(`[data-ac="${d}"]`); if (b) b.click(); }, d); await L.calme(p, 600); }
  const cats = await E(() => ['achats', ...CX_CATS.filter(o => o.fam === 'achats' && o.k !== 'ndf').map(o => o.k)]);   // « ndf » a son propre onglet : forcer cette catégorie dans la liste des factures est un état que l'application ne produit pas
  v('C0 population : plusieurs catégories d’achats', cats.length >= 3, cats);
  let lignesTotal = 0;
  for (const cat of cats) for (const st of ['sansfacture', 'sanspiece']) {
    const att = await E(([cat, st]) => { const D = cxDocs(), en = x => cat === x.fam || cat === x.cat; return D.filter(x => x.src !== 'ndf' && en(x) && (st === 'sansfacture' ? x.sf : !x.piece)).length; }, [cat, st]);
    await E(([cat, st]) => { CX.cat = cat; CX.st = st; cxAller('fachats'); }, [cat, st]); await L.calme(p, 450);
    const r = await E(() => ({ st: CX.st, lignes: document.querySelectorAll('#cx-liste [data-cx^="doc|"]').length, puce: !!document.querySelector('.cx-outils [data-cx="st|' + ({ sansfacture: 'sansfacture', sanspiece: 'sanspiece' })[CX.st] + '"]') }));
    lignesTotal += r.lignes;
    const puceAttendue = att > 0;
    v(cat + ' / ' + st + ' : la liste montre ' + att + ' ligne(s) (chiffre de la règle)', (att === 0 ? r.st === 'tous' : r.lignes === att), { att, r });
    if (att > 0) v(cat + ' / ' + st + ' : la puce choisie existe et le compte de la puce est le nombre de lignes', r.puce, r);
  }
  v('C1 population : la passe a lu des lignes', lignesTotal > 0, lignesTotal);
  const ko = L.bilan(); console.log('  erreurs de page :', JSON.stringify(c.err)); await L.fin(c); await L.fermer(); process.exit(ko || c.err.length ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
