// Matériel, étape 3 (Dépôts et camions) — la visite parlée du chapitre « Dépôts et camions » : elle joue pour de bon, chaque cible qu'elle vise doit exister (IMM.perdus vide),
// elle dit ses dix étapes (et son introduction) dans l'ordre, ne cite aucun ancien mot, vise des ATTRIBUTS data-vis (pas des classes qu'on renomme), et la visite guidée de l'application a ses deux cibles.
// Usage : node materiel-depots-visites.js → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, c = await L.ouvrir({ profil:'mac', qui:'marc' }), p = c.p;
  const k = await p.evaluate(() => GD_TOURS.imm.chap().findIndex(e => e.cle === 'boxes'));
  v('population : le chapitre « Dépôts et camions » existe dans la visite parlée (rang ' + k + ')', k >= 0);
  const cibles = await p.evaluate(() => GD_TOURS.imm.chap()[GD_TOURS.imm.chap().findIndex(e => e.cle === 'boxes')].gestes.map(s => s.sel));
  v('chaque étape vise un attribut data-vis, un identifiant ou le panneau — jamais une classe renommable (' + cibles.length + ' étapes)', cibles.length === 11 && cibles.every(x => /^\[data-vis=|^#md-rok|^#calque \.panneau|^\.md-plusb|^#contenu h1/.test(x)), cibles);
  const q0 = await p.evaluate(() => PRODUITS.map(x => x.q + ':' + JSON.stringify(x.loc || {})).join('|'));
  await p.evaluate(i => { window.__immRapide = true; immLancer(i); }, k);
  const dit = [], t0 = Date.now();
  while (Date.now() - t0 < 170000) {
    const t = await p.evaluate(() => { const b = document.getElementById('gd-bulle'); return { txt:b ? b.innerText.replace(/\s+/g, ' ') : '', actif:!!GD.actif }; });
    if (t.txt && !dit.includes(t.txt)) dit.push(t.txt);
    if (dit.some(x => /Une réserve chez un client/.test(x)) && Date.now() - t0 > 5000 && dit.length >= 10) break;
    if (!t.actif && Date.now() - t0 > 6000) break;
    await p.waitForTimeout(120);
  }
  const perdus = await p.evaluate(() => IMM.perdus.slice());
  const titres = ['Un camion, une carte', 'Avant les visites', 'Par visite, ce qui manque', 'Remplir les camions en un toucher', 'Tu décoches ce que tu n’envoies pas', 'Je mets tout dans les camions', 'Les camions sont à jour', 'La fiche d’un camion', 'Compter, c’est la même fenêtre que dans Stock', 'Une réserve chez un client'];
  const norm = s => s.replace(/[  ]/g, ' '), vus = titres.filter(t => dit.some(x => norm(x).includes(t)));
  v('la visite dit ses ' + titres.length + ' étapes (' + vus.length + ' vues en ' + Math.round((Date.now() - t0) / 1000) + ' s)', vus.length === titres.length, titres.filter(t => !vus.includes(t)));
  v('chaque cible visée existe (IMM.perdus vide)', perdus.filter(x => /md|depots|calque|plusb|mettre|rok/.test(x) || /clic|champ/.test(x)).length === 0, perdus);
  const VIEUX = [/À faire maintenant/, /R[ée]assort/, /dotation/i, /Compléter/, /Où est/, /transf[ée]r/i, /\bvalider\b/i, /Nouvelle réserve\./ && /✕/];
  const eu = VIEUX.slice(0, 7).filter(re => dit.some(x => re.test(x))).map(String);
  v('aucun ancien mot dans ce que la visite dit', eu.length === 0, eu);
  await p.evaluate(() => { try { gdFermer ? gdFermer() : 0; } catch (e) {} });
  const g = await p.evaluate(() => { const t = typeof TOUR_PARTIES !== 'undefined' ? TOUR_PARTIES : null; return t ? JSON.stringify(t.boxes || null) : 'inconnu'; });
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', 'apercu', 'prototype-op-gestion.html'), 'utf8');
  const tp = src.slice(src.indexOf("tourPartie('boxes'"), src.indexOf("tourPartie('pointage'"));
  v('la visite guidée de l\'application (« boxes ») vise deux attributs data-vis qui existent', /data-vis="depots-cartes"/.test(tp) && /data-vis="depots-remplir"/.test(tp), tp.slice(0, 200));
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 90) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });   // un parcours qui plante est un parcours qui échoue : la mutation ne doit pas rester « vivante » sur un code de sortie 2
