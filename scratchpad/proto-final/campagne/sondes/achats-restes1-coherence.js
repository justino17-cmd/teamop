// RECONTRÔLE ADVERSE restes-achats tour 1 (18 novembre 2026) : « sans facture » dit le MÊME nombre partout, y compris après la validation
// d'une note de frais avec ticket (ticket = justificatif, mais la TVA ne se récupère pas sans facture) et d'une note validée sans justificatif.
// Les endroits qui comptent : Comptabilité (À faire, Conformité, tuile), Fournisseurs (tuile), filtre « Sans facture » de la liste ; et « sans justificatif » (Achats, Accueil).
// Usage : node achats-restes1-coherence.js [profil=mac]
const { L, ouvrirAchats, devenir, txt, toast, CAP } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await ouvrirAchats({ profil, qui: 'marc' }), p = c.p, E = (f, a) => p.evaluate(f, a);
  const mesure = async (etiq) => {
    const m = await E(() => { const D = cxDocs(); return {
      tvSans: cpTva().sans.length, tvSansNoms: cpTva().sans.map(a => a.four + '|' + a.d + '|' + a.piece),
      sfListe: D.filter(x => x.fam === 'achats' && x.src !== 'ndf' && x.sf).length, spListe: D.filter(x => x.fam === 'achats' && x.src !== 'ndf' && !x.piece).length,
      spTuile: axSansJustif(), fournisseurs: +((cxVueFournisseurs().match(/<b>(\d+)<\/b><span>achats sans facture/) || [])[1]) }; });   // la tuile de Comptes fournisseurs, lue dans ce qu'elle rend (restes achats 2)
    console.log('  ' + etiq + ' :', JSON.stringify(m)); return m; };
  const m0 = await mesure('avant');
  v('K0 population : des achats existent, « sans facture » > 0', m0.tvSans > 0 && m0.sfListe > 0, m0);
  v('K1 avant tout geste : Comptabilité = liste = Fournisseurs pour « sans facture »', m0.tvSans === m0.sfListe && m0.sfListe === m0.fournisseurs, m0);
  // le gérant valide la note n1 (ticket, TVA 10 %) puis la note n3 (sans ticket) sans justificatif
  await L.aller(p, 'achats'); await E(() => { acOnglet = 'notes'; rendre(); }); await L.calme(p, 600);
  const dispo = await E(() => [...document.querySelectorAll('[data-ac^="ndfok|"]')].map(b => b.dataset.ac));
  console.log('  boutons de validation :', JSON.stringify(dispo));
  v('K2 population : la validation d’une note avec ticket est proposée', dispo.includes('ndfok|n1'), dispo);
  await L.toucher(c, '[data-ac="ndfok|n1"]', { delai: 1500 }); await L.calme(p, 600);
  const m1 = await mesure('après validation de n1 (ticket, TVA 10 %)');
  console.log('  toast :', await toast(p));
  v('K3 une note validée avec son ticket ne rend pas Comptabilité ≠ liste « Sans facture » (même nombre partout)', m1.tvSans === m1.sfListe && m1.sfListe === m1.fournisseurs, m1);
  v('K4 « sans justificatif » ne bouge pas pour une note qui a son ticket', m1.spListe === m0.spListe && m1.spTuile === m0.spTuile, { m0, m1 });
  await L.aller(p, 'achats'); await E(() => { acOnglet = 'notes'; rendre(); }); await L.calme(p, 500);
  await E(() => { const b = document.querySelector('[data-ac="ndfsans|n3"]') || document.querySelector('[data-ac="ndfok|n3"]'); if (b) b.click(); }); await L.calme(p, 700);
  const conf = await E(() => { const b = document.querySelector('[data-ac="ndfoksans|n3"]'); return !!b; });
  if (conf) { await L.toucher(c, '[data-ac="ndfoksans|n3"]', { delai: 1500 }); await L.calme(p, 600); }
  const m2 = await mesure('après validation de n3 (sans ticket)');
  v('K5 population : n3 validée sans justificatif (la règle du patron le permet)', conf, { conf });
  v('K6 note validée sans justificatif : Comptabilité = liste = Fournisseurs', m2.tvSans === m2.sfListe && m2.sfListe === m2.fournisseurs, m2);
  v('K7 note validée sans justificatif : « sans justificatif » monte de 1 partout (tuile = liste)', m2.spListe === m1.spListe + 1 && m2.spListe === m2.spTuile, { m1, m2 });
  // ce qu'on lit à l'écran : la ligne de la Comptabilité, puis le lien qui mène à la liste
  await L.aller(p, 'comptabilite'); await L.calme(p, 600);
  const lig = await E(() => { const b = [...document.querySelectorAll('[data-cx$="sansfacture"]')].filter(e => e.offsetParent); return b.map(e => ((e.closest('li, .cx-af, .ligne, .fo-r, .cx-fai') || e.parentElement).textContent).replace(/\s+/g, ' ').trim().slice(0, 160)); });
  console.log('  liens à l’écran :', JSON.stringify(lig));
  const nAff = parseInt(((lig.join(' ')).match(/(\d+) achat/) || [])[1] || '0', 10);
  await E(() => { const b = [...document.querySelectorAll('[data-cx$="sansfacture"]')].find(e => e.offsetParent); if (b) b.click(); }); await L.calme(p, 700);
  const l = await E(() => ({ lignes: document.querySelectorAll('#cx-liste [data-cx^="doc|"]').length, marques: [...document.querySelectorAll('#cx-liste .cx-sans')].map(e => e.textContent.trim()) }));
  console.log('  liste où mène le lien :', JSON.stringify(l), 'annoncé', nAff);
  v('K8 le nombre lu sur l’écran de la Comptabilité = les lignes de la liste où il mène', nAff === l.lignes, { nAff, l });
  await L.capture(c, CAP + 'restes1-coherence-' + profil + '.png').catch(() => {});
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
