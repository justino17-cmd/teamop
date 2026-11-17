// Matériel, étape 5 (lot 6) — LE MÊME NOMBRE PARTOUT (spec § 3.1, § 3.2, § 13) : un seul chiffre par notion, relu à chaque endroit où l'application le dit, puis relu encore après un geste qui le change.
//  « à commander » : la fonction, la tuile de Stock, le compteur de l'onglet Commandes, le titre et les lignes de la carte « À commander », la carte « Matériel » de l'Accueil, la pastille du menu ;
//  « camions à remplir » (des ARTICLES, pas des camions) : la fonction, la tuile de Stock, le bouton de Dépôts, la somme des cartes, la carte de l'Accueil — et un camion au garage n'est compté nulle part.
// Chaque lecture compte d'abord sa population (un nombre qu'on ne trouve pas est dit, pas passé au vert). Usage : node materiel-coherence.js [profil] → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a);
  const n1 = s => R(s => { const e = document.querySelector(s); const m = e && e.textContent.replace(/[  ]/g, ' ').match(/\d+/); return m ? +m[0] : null; }, s);
  const lire = async () => {
    const o = { fonction:await R(() => cmdNbACommander()) };
    await L.aller(p, 'stock'); o.tuile = await n1('[data-ms="t|cmd"] b');
    await L.aller(p, 'produits'); await R(() => { prVue = 'commandes'; rendre(); }); await L.calme(p, 300);
    o.onglet = await R(() => { const b = document.querySelector('[data-pr="vue|commandes"] .pr-nb'); return b ? +b.textContent.trim() : null; });
    o.carte = await R(() => { const m = (document.querySelector('#pans > h3, #pans h3') || {}).textContent; const r = m && m.match(/À commander · (\d+)/); return r ? +r[1] : null; });
    o.lignes = await R(() => document.querySelectorAll('#pans [data-cm^="hors|"]').length);
    o.menu = await R(() => { const a = document.querySelector('#menu a[href="#produits"] .nb'); return a ? +a.textContent.trim() : 0; });
    await L.aller(p, 'accueil'); o.accueil = await R(() => { const t = [...document.querySelectorAll('[data-vis="accueil-materiel"] .pdx-at')].map(e => e.textContent).find(s => /à commander$/.test(s)); const m = t && t.match(/^(\d+)/); return m ? +m[1] : 0; });
    return o; };
  const lireCam = async () => {
    const o = { fonction:await R(() => camionsARemplir().n), camions:await R(() => camionsARemplir().camions.length) };
    await L.aller(p, 'stock'); o.tuile = await n1('[data-ms="t|cam"] b');
    await L.aller(p, 'boxes'); o.bouton = await R(() => { const b = document.querySelector('[data-md="remplir"]'); const m = b && b.textContent.match(/(\d+)\s*$/); return m ? +m[1] : null; });
    o.cartes = await R(() => [...document.querySelectorAll('[data-vis="depots-cartes"] .md-c .md-t .st-o')].map(e => (e.textContent.match(/Il manque (\d+)/) || [0, 0])[1] * 1).reduce((s, x) => s + x, 0));
    await L.aller(p, 'accueil'); o.accueil = await R(() => { const t = [...document.querySelectorAll('[data-vis="accueil-materiel"] .pdx-at')].map(e => e.textContent).find(s => /camion/.test(s)); const m = t && t.match(/^(\d+)/); return m ? +m[1] : 0; });
    return o; };
  const egal = (o, cles) => cles.every(k => o[k] === o[cles[0]]);
  // ── « à commander »
  const a0 = await lire();
  v('population : il y a des articles à commander (' + a0.fonction + ') et chaque endroit a pu être lu', a0.fonction >= 4 && ['tuile', 'onglet', 'carte', 'lignes', 'accueil'].every(k => a0[k] !== null), a0);
  v('« à commander » : le MÊME nombre (' + a0.fonction + ') dans la fonction, la tuile de Stock, l\'onglet Commandes, le titre de la carte, ses lignes, l\'Accueil et la pastille du menu', egal(a0, ['fonction', 'tuile', 'onglet', 'carte', 'lignes', 'accueil', 'menu']), a0);
  // un geste qui le change : une demande d'achat d'un article du catalogue entre dans le panier (« Demandé par … »)
  const x = await R(() => { const x = PRODUITS.find(o => !o.retire && !(o.seuil > 0) && enCommande(o) === 0 && !DEM_ACHAT.some(d => d.pid === o.id && d.etat === 'attente')); window.__d = DEM_ACHAT.length; DEM_ACHAT.unshift({ id:'da-coh', qui:'sm', d:AUJ, h:'09:00', quoi:x.nom, q:2, u:x.u, pid:x.id, pourquoi:'test', est:0, quand:null, etat:'attente' }); rendre(); return x.nom; });
  const a1 = await lire();
  v('une demande de Sophie entre dans le panier (« ' + x + ' ») : tout monte de 1 ENSEMBLE (' + a0.fonction + ' → ' + a1.fonction + ')', a1.fonction === a0.fonction + 1 && egal(a1, ['fonction', 'tuile', 'onglet', 'carte', 'lignes', 'accueil', 'menu']), a1);
  // traitée (commandée) : elle sort du panier, partout
  await R(() => { DEM_ACHAT.find(d => d.id === 'da-coh').etat = 'approuvee'; rendre(); });
  const a2 = await lire();
  v('traitée, elle SORT du panier partout (' + a1.fonction + ' → ' + a2.fonction + ') : on ne compte pas deux fois la même pièce', a2.fonction === a0.fonction && egal(a2, ['fonction', 'tuile', 'onglet', 'carte', 'lignes', 'accueil', 'menu']), a2);
  await R(() => { DEM_ACHAT.splice(DEM_ACHAT.findIndex(d => d.id === 'da-coh'), 1); rendre(); });
  // ── « camions à remplir »
  const b0 = await lireCam();
  v('population : des camions à remplir (' + b0.fonction + ' articles dans ' + b0.camions + ' camions)', b0.fonction >= 5 && b0.camions >= 2 && ['tuile', 'bouton', 'accueil'].every(k => b0[k] !== null), b0);
  v('« camions à remplir » : le MÊME nombre d\'ARTICLES (' + b0.fonction + ') dans la fonction, la tuile de Stock, le bouton de Dépôts, la somme des cartes et la carte de l\'Accueil', egal(b0, ['fonction', 'tuile', 'bouton', 'cartes', 'accueil']), b0);
  // un camion au garage n'est compté nulle part (F3 : Stock le réassortissait, Dépôts non)
  const g = await R(() => { const l = camionsARemplir().camions[0].l, v = bxVeh(l.id); window.__g = { id:l.id, s:v.statut }; v.statut = 'garage'; rendre(); return { id:l.id, nom:l.nom }; });
  const b1 = await lireCam();
  v('« ' + g.nom + ' » passe au garage : il sort du compte PARTOUT (' + b0.fonction + ' → ' + b1.fonction + ' articles, ' + b0.camions + ' → ' + b1.camions + ' camions)', b1.fonction < b0.fonction && b1.camions === b0.camions - 1 && egal(b1, ['fonction', 'tuile', 'bouton', 'cartes', 'accueil']), b1);
  await R(() => { bxVeh(window.__g.id).statut = window.__g.s; rendre(); });
  const b2 = await lireCam();
  v('de retour du garage, le compte est celui du départ (' + b2.fonction + ')', b2.fonction === b0.fonction && egal(b2, ['fonction', 'tuile', 'bouton', 'cartes', 'accueil']), b2);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 100) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
