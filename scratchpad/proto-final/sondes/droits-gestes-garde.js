// LA GARDE SUR TOUTE LA TABLE : pour chaque verbe d'écriture de la table des gestes (et chaque droit à part), on crée un bouton qui porte l'attribut, on le touche en tant que quelqu'un à qui la case manque
// (le témoin ne se déclenche JAMAIS, le compteur de refus monte de 1) puis en tant que quelqu'un qui l'a (le témoin se déclenche, aucun refus). Les verbes de LECTURE ne sont jamais refusés,
// même à une personne qui n'a que « Voir ». Le témoin est posé APRÈS la garde et coupe la propagation : aucun vrai gestionnaire de la page ne tourne. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
(async () => {
  const c = await ouvrirComme({ k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, '1111'])), sp:{ tout:1, prix:1, atelier:1, valstock:1, commander:1, corrpt:1, comptes:1 } });
  const r = await c.p.evaluate(() => {
    window.__w = 0; window.addEventListener('click', ev => { if (ev.target && ev.target.dataset && ev.target.dataset.essaiDroits) { window.__w++; ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
    const p = eqDe('rp'), toucher = (fam, verbe) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-' + fam, verbe + '|essai'); b.dataset.essaiDroits = '1'; document.body.appendChild(b); const w0 = __w, r0 = DROITS_REFUS.length; b.click(); b.remove(); return { fire:__w - w0, refus:DROITS_REFUS.length - r0 }; };
    const sortie = { combos:0, verbes:0, mal:[], sp:0, lecture:0 };
    // 1. chaque (catégorie, case) : on retire la case, tous ses verbes sont refusés ; on la rend, tous passent
    const par = {};
    Object.entries(GESTES).forEach(([fam, E]) => { const T = GESTES_TJ[fam];
      ['c', 'm', 's'].forEach(x => Object.entries(T[x]).forEach(([verbe, c]) => { const cat = c || E.k; if (cat) (par[cat + '.' + x] = par[cat + '.' + x] || []).push([fam, verbe]); }));
      if (E.d && E.d !== 'l' && E.k) (par[E.k + '.' + E.d] = par[E.k + '.' + E.d] || []).push([fam, 'essaiok']); });
    Object.entries(par).forEach(([cle, liste]) => { const [cat, x] = cle.split('.'); sortie.combos++;
      p.droits.cats[cat][x] = 0;
      liste.forEach(([fam, verbe]) => { const t = toucher(fam, verbe); sortie.verbes++; if (!(t.fire === 0 && t.refus === 1)) sortie.mal.push(`${fam}|${verbe} sans ${cle} : ${JSON.stringify(t)}`); });
      p.droits.cats[cat][x] = 1;
      liste.forEach(([fam, verbe]) => { const t = toucher(fam, verbe); if (!(t.fire === 1 && t.refus === 0)) sortie.mal.push(`${fam}|${verbe} avec ${cle} : ${JSON.stringify(t)}`); }); });
    // 2. chaque droit à part
    Object.entries(GESTES_SP).forEach(([fam, V]) => Object.entries(V).forEach(([verbe, sp]) => { p.droits.sp[sp] = 0; const a = toucher(fam, verbe); p.droits.sp[sp] = 1; const b = toucher(fam, verbe); sortie.sp++;
      if (!(a.fire === 0 && a.refus === 1 && b.fire === 1 && b.refus === 0)) sortie.mal.push(`${fam}|${verbe} droit « ${sp} » : ${JSON.stringify([a, b])}`); }));
    // 3. la lecture n'est jamais refusée, même à qui n'a que « Voir »
    CATS_ = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin']; CATS_.forEach(k => { p.droits.cats[k] = { v:1, c:0, m:0, s:0 }; });
    Object.keys(p.droits.sp).forEach(k => p.droits.sp[k] = 0);
    Object.entries(GESTES).forEach(([fam, E]) => Object.keys(GESTES_TJ[fam].l).forEach(verbe => { const t = toucher(fam, verbe); sortie.lecture++; if (!(t.fire === 1 && t.refus === 0)) sortie.mal.push(`lecture ${fam}|${verbe} refusée : ${JSON.stringify(t)}`); }));
    return sortie; });
  console.log(`  · ${r.combos} couples (catégorie, case), ${r.verbes} verbes d'écriture, ${r.sp} verbes à droit à part, ${r.lecture} verbes de lecture`);
  v('population : plus de 20 couples, 250 verbes d\'écriture, 10 verbes à droit à part, 150 verbes de lecture', r.combos > 20 && r.verbes > 250 && r.sp >= 10 && r.lecture > 150, r);
  v('chaque verbe d\'écriture : refusé sans sa case (témoin muet, refus +1), accepté avec (témoin, aucun refus) ; chaque droit à part de même ; la lecture jamais refusée', r.mal.length === 0, r.mal.slice(0, 25));
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c); await fin();
})().catch(e => { console.error(e); process.exit(1); });
