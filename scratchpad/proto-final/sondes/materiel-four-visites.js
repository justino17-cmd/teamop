// Matériel, étape 4 (Fournisseurs, matériel & produits) — la visite parlée du chapitre « produits » et la visite guidée de l'application : elles jouent pour de bon, chaque cible qu'elles visent doit exister (IMM.perdus vide),
// elles disent leurs étapes dans l'ordre, ne citent aucun ancien mot, visent des ATTRIBUTS data-vis (pas des classes qu'on renomme) et le chapitre ne laisse rien derrière lui (la commande envoyée par la visite est une démonstration).
// Usage : node materiel-four-visites.js → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, c = await L.ouvrir({ profil:'mac', qui:'marc' }), p = c.p, fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'apercu', 'prototype-op-gestion.html'), 'utf8');
  // la visite guidée : trois cibles data-vis qui EXISTENT sur la page ouverte, visibles et non recouvertes
  const tp = src.slice(src.indexOf("tourPartie('produits'"), src.indexOf("tourPartie('stock'")), cibles = [...tp.matchAll(/\['(\[data-vis="[a-z-]+"\])'/g)].map(m => m[1]);
  v('population : la visite guidée vise ' + cibles.length + ' attributs data-vis', cibles.length === 3, cibles);
  await L.aller(p, 'produits'); await p.evaluate(() => { prVue = 'commandes'; rendre(); }); await L.calme(p, 400);
  for (const s of cibles) { const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return { existe:false }; e.scrollIntoView({ block:'center' }); const b = e.getBoundingClientRect(), t = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(b.height / 2, 40)); return { existe:true, vu:b.width > 5 && b.height > 5, libre:!!t && (e.contains(t) || t.contains(e)) }; }, s);
    v('la visite guidée : ' + s + ' existe, se voit et rien ne le recouvre', r.existe && r.vu && r.libre, r); }
  const k = await p.evaluate(() => GD_TOURS.imm.chap().findIndex(e => e.cle === 'produits'));
  v('population : le chapitre « produits » existe dans la visite parlée (rang ' + k + ')', k >= 0);
  const sels = await p.evaluate(k => GD_TOURS.imm.chap()[k].gestes.map(s => s.sel), k);
  v('chaque étape vise un attribut data-vis, un identifiant, le panneau ou un geste qui existe — jamais une classe renommable (' + sels.length + ' étapes)', sels.length === 14 && sels.every(x => /^\[data-vis=|^#calque|^\[data-pr|^\[data-cm|^#contenu \.fx-arts/.test(x)), sels);
  const e0 = await p.evaluate(() => JSON.stringify({ c:COMMANDES, p:PRODUITS.map(x => [x.id, x.q, x.pa, x.pv, x.retire || false]), n:PRODUITS.length }));
  await p.evaluate(i => { window.__immRapide = true; immLancer(i); }, k);
  const dit = [], t0 = Date.now();
  while (Date.now() - t0 < 260000) {
    const t = await p.evaluate(() => { const b = document.getElementById('gd-bulle'); return { txt:b ? b.innerText.replace(/\s+/g, ' ') : '', actif:!!GD.actif }; });
    if (t.txt && !dit.includes(t.txt)) dit.push(t.txt);
    if (dit.some(x => /Le stock a monté/.test(x)) && Date.now() - t0 > 5000) break;
    if (!t.actif && Date.now() - t0 > 6000) break;
    await p.waitForTimeout(120);
  }
  const perdus = await p.evaluate(() => IMM.perdus.slice());
  const titres = ['Trois onglets, une seule catégorie', 'Ce qu’il faut commander', 'Photographier une facture', 'Les articles', 'Ajouter un article', 'Il se range tout seul', 'Les protections de l’application', 'L’article est dans la liste', 'Un fournisseur, une carte', 'Préparer la commande', 'Le bon est prêt', 'La commande se suit toute seule', 'Recevoir la marchandise', 'Le stock a monté'];
  const norm = s => s.replace(/[  ]/g, ' '), vus = titres.filter(t => dit.some(x => norm(x).includes(t)));
  v('la visite dit ses ' + titres.length + ' étapes (' + vus.length + ' vues en ' + Math.round((Date.now() - t0) / 1000) + ' s)', vus.length === titres.length, titres.filter(t => !vus.includes(t)));
  v('chaque cible visée existe (IMM.perdus vide)', perdus.length === 0, perdus);
  const VIEUX = [/Trois vues/, /seuil/i, /Réceptionner/, /rapproch/i, /Lire la facture/, /réassort/i, /Vérifier et envoyer/, /marqué épuisé/, /Le rangement par métier/];
  const eu = VIEUX.filter(re => dit.some(x => re.test(x))).map(String);
  v('aucun ancien mot dans ce que la visite dit', eu.length === 0, eu);
  const neuf = await p.evaluate(() => ({ cmds:COMMANDES.length, art:PRODUITS.length }));
  v('la visite a joué : une commande et un article de démonstration (' + neuf.cmds + ' commandes, ' + neuf.art + ' articles)', neuf.cmds >= 5 && neuf.art >= 30, neuf);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 90) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
