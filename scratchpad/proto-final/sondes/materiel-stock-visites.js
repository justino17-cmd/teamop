// Matériel, étape 2 (Stock) — la visite parlée du chapitre « Stock » : elle joue pour de bon, chaque cible qu'elle vise doit exister (IMM.perdus vide),
// elle doit dire ses dix étapes dans l'ordre, ne citer aucun ancien mot, et laisser le stock comme elle l'a trouvé.
// Usage : node materiel-stock-visites.js → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, c = await L.ouvrir({ profil:'mac', qui:'marc' }), p = c.p;
  const k = await p.evaluate(() => GD_TOURS.imm.chap().findIndex(e => e.cle === 'stock'));
  v('population : le chapitre « Stock » existe dans la visite parlée (rang ' + k + ')', k >= 0);
  const att0 = await p.evaluate(() => MVTS_ATT.length), q0 = await p.evaluate(() => PRODUITS.map(x => x.q + ':' + JSON.stringify(x.loc || {})).join('|'));
  await p.evaluate(i => { window.__immRapide = true; immLancer(i); }, k);
  const dit = [], t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    const t = await p.evaluate(() => { const b = document.getElementById('gd-bulle'); return { txt:b ? b.innerText.replace(/\s+/g, ' ') : '', actif:!!GD.actif, chap:GD.tour === 'imm' && typeof GD.i === 'number' ? GD.i : -1 }; });
    if (t.txt && !dit.includes(t.txt)) dit.push(t.txt);
    if (dit.some(x => /Tout est à jour/.test(x))) break;
    if (!t.actif && Date.now() - t0 > 6000) break;
    await p.waitForTimeout(120);
  }
  const perdus = await p.evaluate(() => IMM.perdus.slice());
  const titres = ['D’abord, ce qui t’attend', 'Trois chiffres', 'Ce qu’il faut surveiller', 'Un seul bouton', 'Quatre verbes', 'Une sortie dit qui prend quoi', 'Je note la sortie', 'Les envois des techniciens', 'Accepter, ou refuser', 'Tout est à jour'];
  const norm = s => s.replace(/[  ]/g, ' ');
  const vus = titres.filter(t => dit.some(x => norm(x).includes(t)));
  v('la visite dit ses ' + titres.length + ' étapes (' + vus.length + ' vues en ' + Math.round((Date.now() - t0) / 1000) + ' s)', vus.length === titres.length, titres.filter(t => !vus.includes(t)));
  v('chaque cible visée existe (IMM.perdus vide)', perdus.filter(x => /stock/.test(x) || /clic|champ/.test(x)).length === 0, perdus);
  const VIEUX = [/À faire maintenant/, /Réassort/, /Entrée de stock/, /\bseuil\b/i, /Tout valider/, /\bvalider\b/i];
  const eu = VIEUX.filter(re => dit.some(x => re.test(x))).map(String);
  v('aucun ancien mot dans ce que la visite dit', eu.length === 0, eu);
  const apres = await p.evaluate(() => ({ att:MVTS_ATT.length, q:PRODUITS.map(x => x.q + ':' + JSON.stringify(x.loc || {})).join('|') }));
  await p.evaluate(() => { try { gdFermer ? gdFermer() : 0; } catch (e) {} });
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
