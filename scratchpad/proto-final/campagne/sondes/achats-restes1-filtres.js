// RECONTRÔLE ADVERSE restes-achats tour 1 (18 novembre 2026) : les filtres « Sans justificatif » et « Sans facture » de la Comptabilité sous TOUTES les catégories :
// la puce n'existe que s'il y a de quoi la remplir, le filtre retombe sur « Toutes » quand la catégorie n'a rien, les lignes affichées = les achats de la catégorie qui portent le défaut.
// Usage : node achats-restes1-filtres.js [profil=mac] [nuit]
const { L, ouvrirAchats, CAP } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '');
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a);
  await E(() => { CX.cat = 'tous'; CX.st = 'tous'; cxAller('fachats'); }); await L.calme(p, 600);
  const cats = await E(() => [...document.querySelectorAll('#contenu [data-cx^="cat|"]')].filter(e => e.offsetParent).map(e => e.dataset.cx.split('|')[1]));
  console.log('  catégories vues :', JSON.stringify(cats));
  v(tag + ' F0 population : des catégories d’achats sont proposées', cats.length >= 3, cats);
  let essais = 0;
  for (const st of ['sansfacture', 'sanspiece']) for (const cat of cats) {
    await E(([cat, st]) => { CX.cat = cat; CX.st = st; cxAller('fachats'); }, [cat, st]); await L.calme(p, 450);
    const r = await E(([cat, st]) => { const D = cxDocs(), enCat = x => cat === 'tous' || cat === x.fam || cat === x.cat, att = D.filter(x => x.fam === 'achats' && x.src !== 'ndf' && enCat(x) && (st === 'sansfacture' ? x.sf : !x.piece)).length;
      const puces = [...document.querySelectorAll('#contenu [data-cx^="st|"]')].filter(e => e.offsetParent).map(e => ({ k: e.dataset.cx.split('|')[1], on: e.getAttribute('aria-pressed') === 'true', t: e.textContent.trim() }));
      return { st: CX.st, att, lignes: document.querySelectorAll('#cx-liste [data-cx^="doc|"]').length, puces }; }, [cat, st]);
    essais++;
    const puceSt = r.puces.find(x => x.k === st);
    if (r.att > 0) { v(tag + ' F1 ' + st + ' sous « ' + cat + ' » : ' + r.att + ' attendu(s) = lignes affichées', r.lignes === r.att && r.st === st && !!puceSt && puceSt.on, r); }
    else { v(tag + ' F2 ' + st + ' sous « ' + cat + ' » : rien à montrer → pas de puce, retombe sur Toutes', !puceSt && r.st === 'tous', r); }
  }
  v(tag + ' F3 population : ' + essais + ' combinaisons jouées', essais === cats.length * 2 && essais > 4, essais);
  // la page Comptabilité > Achats ne déborde pas, la rangée de filtres tient (320 px)
  await E(() => { CX.cat = 'tous'; CX.st = 'sansfacture'; cxAller('fachats'); }); await L.calme(p, 500);
  const dep = await L.deborde(c); v(tag + ' F4 aucun glissement latéral', dep.bouge === 0, dep);
  await L.capture(c, CAP + 'restes1-filtres-' + tag + '.png');
  const err = c.err.filter(x => !/ERR_/.test(x)); v(tag + ' aucune erreur JavaScript', err.length === 0, err.slice(0, 2));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
