// RECONTRÔLE ADVERSE restes-achats tour 1 (18 novembre 2026) : sur téléphone la rangée de filtres de la Comptabilité défile ; quand on y arrive PAR UN LIEN
// (« sans facture », « sans justificatif », « en retard »…), la puce choisie doit se VOIR (dans l'écran de la rangée) — sinon on lit une liste réduite sans savoir pourquoi.
// Usage : node achats-restes1-puce.js profil1,profil2
const { L, ouvrirAchats } = require('./achats-outils.js'), v = L.v;
(async () => {
  for (const profil of (process.argv[2] || 'petit,android,iphone,ipad,mac').split(',')) {
    const c = await ouvrirAchats({ profil, qui: 'marc' }), p = c.p, E = (f, a) => p.evaluate(f, a);
    for (const st of ['traiter', 'retard', 'payee', 'sanspiece', 'sansfacture']) {
      await E(st => { CX.cat = 'tous'; CX.st = st; cxAller('fachats'); }, st); await L.calme(p, 700);
      const r = await E(() => { const b = document.querySelector('#contenu [data-cx^="st|"][aria-pressed="true"]'); if (!b) return null; const rg = b.getBoundingClientRect(), row = b.parentElement, rr = row.getBoundingClientRect();
        return { puce: b.textContent.trim(), gauche: Math.round(rg.left - rr.left), droite: Math.round(rr.right - rg.right), largeurRangee: Math.round(rr.width), scrollLeft: Math.round(row.scrollLeft), defile: row.scrollWidth > row.clientWidth + 2 }; });
      console.log('  ' + profil + ' ' + st + ' :', JSON.stringify(r));
      v(profil + ' ' + st + ' : la puce choisie existe', !!r, r);
      if (r) v(profil + ' ' + st + ' : la puce choisie se voit en entier dans la rangée', r.gauche >= -1 && r.droite >= -1, r);
    }
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
