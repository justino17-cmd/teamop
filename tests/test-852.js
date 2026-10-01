/* ⛔ CE QUE CE FICHIER GARDE — LA GRILLE DES OPTIONS DU PRO A CINQ COPIES, ET ELLES NE SE LISENT PAS ENTRE ELLES (1er octobre 2026).

   Justin, sur « Quels prix pour les options du Pro ? » : « Plus cher ». Stock 9 €, Achats fournisseurs 6 €, Encaissements et compta
   6 €, Registre sanitaire (métier 3D) 6 €, par utilisateur et par mois ; à l'année, dix mois (deux offerts) ; réservées au Pro.
   Cette grille vit à CINQ endroits, chacun avec son banc, chacun JUSTE séparément — c'est la forme de défaut que ce dépôt a
   payée trois fois (CLAUDE.md : « les deux moitiés avaient chacune leurs bancs, et elles ne se parlaient pas ») :
     · app.html            `OPTIONS_GESTION`   (clés, `prix`, `vues`, `metier3d`) — ce que l'application OUVRE ;
     · server/index.js     `OPTIONS_CLES`, `OPTIONS_PRIX_MOIS`, `OPTIONS_LBL`, `STRIPE_PRIX_OPTION`, `MOIS_OFFERTS_ANNEE` — ce qu'il FACTURE ;
     · recap-abonnement.html (et sa copie d'aperçu)  `OPTIONS_GESTION` (`prixMensuel`), `STRIPE_PRICES_OPTIONS`, `REMISE_ANNUELLE` ;
     · scripts/site-marine.js  `OPTIONS_SITE` (`prix`, `vues`), `MOIS_OFFERTS` — ce que le site VEND ;
     · tour.html           `OPT_CLES`, `OPT_P`, `OPT_L` — ce que la Tour AFFICHE.
   Ce banc LIT les cinq déclarations (jamais d'exécution de code étranger : on extrait la CONSTANTE, littéral seul, et on l'évalue
   dans un contexte vide) et exige : mêmes clés dans le même ordre, mêmes prix, l'année à dix mois partout, le registre sanitaire
   marqué « 3D » partout, les écrans de l'application et du site identiques, les identifiants Stripe de la page égaux à ceux du
   serveur, et l'arithmétique voulue (Pro + deux options coûte PLUS que Business, Pro + Stock MOINS).

   ⛔ ET IL SE PROUVE LUI-MÊME : chaque copie est rejouée avec UNE valeur changée (un prix, une clé, un écran, un mois offert) et le
   banc doit alors tomber — un banc de comparaison qui ne mord jamais garde une croyance. La même épreuve est refaite sur des
   copies de fichiers hors de ce banc par `mutations-858` (voir test-858). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const existe = f => fs.existsSync(path.join(RACINE, f));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

/* ── la lecture, sans rien exécuter d'étranger ─────────────────────────────────────────────────────────────────────────── */
/* un commentaire de bloc qui COMMENCE une ligne se blanchit (les seuls que ce dépôt emploie pour expliquer du code ; un motif plus gourmand
   avale du vrai code — CLAUDE.md) : une déclaration citée dans un commentaire ne se lit pas */
const sansBlocs = s => String(s).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, m => m.replace(/[^\n]/g, ' '));
/* le littéral qui suit « const|let|var NOM = » : accolades ou crochets appariés, chaînes et commentaires de fin de ligne reconnus
   (une apostrophe française dans un commentaire ne doit pas ouvrir une « chaîne ») ; `null` si la déclaration est absente */
function litteral(src, nom) {
  const code = sansBlocs(src);
  const d = new RegExp('^[ \\t]*(?:const|let|var)\\s+' + nom + '\\s*=\\s*', 'm').exec(code);
  if (!d) return null;
  const i0 = d.index + d[0].length, ouvre = code[i0];
  if (ouvre !== '{' && ouvre !== '[') {
    const m = /^[^;\n]+/.exec(code.slice(i0)); return m ? vm.runInNewContext('(' + m[0] + ')', Object.create(null), { timeout: 200 }) : null;
  }
  let prof = 0;
  for (let i = i0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === '`') { for (i++; i < code.length && code[i] !== ch; i++) if (code[i] === '\\') i++; continue; }
    if (ch === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (ch === '{' || ch === '[') prof++;
    else if (ch === '}' || ch === ']') { prof--; if (prof === 0) return vm.runInNewContext('(' + code.slice(i0, i + 1) + ')', Object.create(null), { timeout: 200 }); }
  }
  return null;
}
/* « (métier 3D) » ou « (3D) » : la MARQUE d'un libellé réservé à ce métier — « Stock (et box pour la 3D) » dit seulement que les box existent pour lui */
const MARQUE_3D = /\((?:métier )?3D\)/;
const trie = a => (a || []).slice().sort();

/* chaque copie rendue sous UNE forme : { cles, prix, vues, metier3d, libelles, mois, ids } (ce qu'elle ne porte pas est `undefined`) */
function copies(src) {
  const C = {};
  const app = litteral(src.app, 'OPTIONS_GESTION') || {};
  C.app = { cles: Object.keys(app), prix: Object.fromEntries(Object.entries(app).map(([k, o]) => [k, o.prix])),
    vues: Object.fromEntries(Object.entries(app).map(([k, o]) => [k, trie(o.vues)])), metier3d: Object.keys(app).filter(k => app[k].metier3d), libelles: Object.fromEntries(Object.entries(app).map(([k, o]) => [k, o.l])) };
  C.planPro = trie((litteral(src.app, 'PLAN_BLOQUE') || {}).pro);
  const cles = litteral(src.serveur, 'OPTIONS_CLES') || [], prixS = litteral(src.serveur, 'OPTIONS_PRIX_MOIS') || {}, lbl = litteral(src.serveur, 'OPTIONS_LBL') || {};
  C.serveur = { cles, prix: prixS, libelles: lbl, metier3d: cles.filter(k => MARQUE_3D.test(lbl[k] || '')), mois: litteral(src.serveur, 'MOIS_OFFERTS_ANNEE'),
    ids: litteral(src.serveur, 'STRIPE_PRIX_OPTION') || {}, clesIds: Object.keys(litteral(src.serveur, 'STRIPE_PRIX_OPTION') || {}) };
  C.pro = (litteral(src.serveur, 'PRIX_ABO_MOIS') || {});
  for (const [nom, page] of [['page', src.page], ['apercu', src.apercu]]) {
    const o = litteral(page, 'OPTIONS_GESTION') || {}, ids = litteral(page, 'STRIPE_PRICES_OPTIONS') || {};
    C[nom] = { cles: Object.keys(o), prix: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, x.prixMensuel])), metier3d: Object.keys(o).filter(k => o[k].metier3d),
      libelles: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, x.nom])), mois: litteral(page, 'REMISE_ANNUELLE'),
      ids: Object.fromEntries(Object.entries(ids).map(([k, x]) => [k, [x.mensuel, x.annuel]])), clesIds: Object.keys(ids) };
  }
  const site = litteral(src.site, 'OPTIONS_SITE') || [];
  C.site = { cles: site.map(o => o.cle), prix: Object.fromEntries(site.map(o => [o.cle, o.prix])), vues: Object.fromEntries(site.map(o => [o.cle, trie(o.vues)])),
    metier3d: site.filter(o => o.metier3d).map(o => o.cle), libelles: Object.fromEntries(site.map(o => [o.cle, o.nom])), mois: litteral(src.site, 'MOIS_OFFERTS') };
  const tc = litteral(src.tour, 'OPT_CLES') || [], tp = litteral(src.tour, 'OPT_P') || {}, tl = litteral(src.tour, 'OPT_L') || {};
  C.tour = { cles: tc, prix: tp, libelles: tl, metier3d: tc.filter(k => MARQUE_3D.test(tl[k] || '')) };
  return C;
}

/* les écarts entre copies : la liste de ce qui ne s'accorde pas (vide = d'accord) */
function ecarts(C) {
  const E = [];
  const REF = ['stock', 'achats', 'compta', 'sanitaire'], PRIX = { stock: 9, achats: 6, compta: 6, sanitaire: 6 };
  const noms = ['app', 'serveur', 'page', 'apercu', 'site', 'tour'];
  for (const n of noms) {
    if (JSON.stringify(C[n].cles) !== JSON.stringify(REF)) E.push(n + ' : clés ' + JSON.stringify(C[n].cles) + ' au lieu de ' + JSON.stringify(REF));
    for (const k of REF) if (C[n].prix[k] !== PRIX[k]) E.push(n + ' : prix de « ' + k + ' » = ' + C[n].prix[k] + ' au lieu de ' + PRIX[k]);
    if (JSON.stringify(C[n].metier3d) !== JSON.stringify(['sanitaire'])) E.push(n + ' : le métier 3D est ' + JSON.stringify(C[n].metier3d) + ' au lieu de ["sanitaire"]');
  }
  /* « registre » n'est JAMAIS une clé (déjà une vue et un onglet) */
  for (const n of noms) if (C[n].cles.includes('registre')) E.push(n + ' : « registre » parmi les clés d\'option (c\'est « sanitaire »)');
  /* l'année = dix mois partout : deux mois offerts */
  for (const n of ['serveur', 'page', 'apercu', 'site']) if (C[n].mois !== 2) E.push(n + ' : ' + C[n].mois + ' mois offerts à l\'année au lieu de 2 (l\'année = 10 mois)');
  /* les écrans que l'option OUVRE : l'application et le site disent la même chose */
  for (const k of REF) if (JSON.stringify(C.app.vues[k]) !== JSON.stringify(C.site.vues[k])) E.push('« ' + k + ' » : l\'application ouvre ' + JSON.stringify(C.app.vues[k]) + ', le site dit ' + JSON.stringify(C.site.vues[k]));
  /* chaque écran d'option est un écran que la formule Pro ferme (sinon l'option n'ouvre rien), et chaque écran fermé au Pro est
     ouvert par une option (sinon il l'est pour toujours) */
  const union = trie([...new Set(REF.flatMap(k => C.app.vues[k] || []))]);
  if (JSON.stringify(union) !== JSON.stringify(C.planPro)) E.push('PLAN_BLOQUE.pro ' + JSON.stringify(C.planPro) + ' ≠ union des écrans des options ' + JSON.stringify(union));
  /* le registre sanitaire se dit « 3D » à l'écran, partout */
  for (const n of noms) if (!MARQUE_3D.test((C[n].libelles || {}).sanitaire || '')) E.push(n + ' : le libellé du registre sanitaire ne porte pas la marque « (métier 3D) » ou « (3D) » (' + (C[n].libelles || {}).sanitaire + ')');
  /* les identifiants Stripe : ceux de la page (et de son aperçu) sont ceux du serveur, clé par clé, dans l'ordre [mensuel, annuel] */
  for (const n of ['page', 'apercu']) {
    if (JSON.stringify(C[n].clesIds) !== JSON.stringify(REF)) E.push(n + ' : STRIPE_PRICES_OPTIONS a les clés ' + JSON.stringify(C[n].clesIds));
    for (const k of REF) if (JSON.stringify(C[n].ids[k]) !== JSON.stringify(C.serveur.ids[k])) E.push(n + ' : tarifs Stripe de « ' + k + ' » ' + JSON.stringify(C[n].ids[k]) + ' ≠ serveur ' + JSON.stringify(C.serveur.ids[k]));
  }
  if (JSON.stringify(C.serveur.clesIds) !== JSON.stringify(REF)) E.push('serveur : STRIPE_PRIX_OPTION a les clés ' + JSON.stringify(C.serveur.clesIds));
  /* la page et son aperçu portent la même grille (l'aperçu est une copie générée) */
  if (JSON.stringify([C.page.prix, C.page.libelles]) !== JSON.stringify([C.apercu.prix, C.apercu.libelles])) E.push('l\'aperçu de la page de paiement ne porte pas la grille de la page');
  /* l'arithmétique voulue */
  const pro = C.pro.pro, bus = C.pro.business, p = C.serveur.prix, deux = Object.values(p).sort((a, b) => a - b).slice(0, 2).reduce((a, b) => a + b, 0);
  if (!(pro + p.stock < bus)) E.push('Pro + Stock (' + (pro + p.stock) + ' €) n\'est plus MOINS cher que Business (' + bus + ' €)');
  if (!(pro + deux > bus)) E.push('Pro + deux options (' + (pro + deux) + ' €) n\'est plus PLUS cher que Business (' + bus + ' €)');
  return E;
}

const SOURCES = () => ({ app: lire('app.html'), serveur: lire('server/index.js'), page: lire('recap-abonnement.html'), apercu: existe('apercu/recap-abonnement.html') ? lire('apercu/recap-abonnement.html') : lire('recap-abonnement.html'),
  site: lire('scripts/site-marine.js'), tour: lire('tour.html') });

console.log('\n── 852 · la grille des options du Pro : cinq copies, une seule vérité ──');
const SRC = SOURCES();
const C = copies(SRC);

console.log('1. population : chaque copie est LUE (un littéral introuvable passerait sur tout)');
v('app.html : quatre options', C.app.cles.length, 4);
v('serveur : quatre clés, quatre prix, quatre tarifs', [C.serveur.cles.length, Object.keys(C.serveur.prix).length, C.serveur.clesIds.length], [4, 4, 4]);
v('page de paiement et aperçu : quatre options et quatre lignes de tarifs chacune', [C.page.cles.length, C.page.clesIds.length, C.apercu.cles.length, C.apercu.clesIds.length], [4, 4, 4, 4]);
v('site : quatre options', C.site.cles.length, 4);
v('Tour : quatre options', C.tour.cles.length, 4);
v('les prix de formule du serveur (Pro, Business) sont lus', [C.pro.pro, C.pro.business], [15, 25]);
vrai('PLAN_BLOQUE.pro est lu (dix-neuf écrans, une liste vide passerait sur tout)', C.planPro.length === 19);
vrai('la page et son aperçu sont deux fichiers (la comparaison ne se fait pas d\'un fichier avec lui-même)', existe('apercu/recap-abonnement.html'));

console.log('2. la grille : les cinq copies s\'accordent');
const E0 = ecarts(C);
v('⛔ aucun écart entre les copies — clés, prix, mois offerts, métier 3D, écrans, tarifs Stripe, arithmétique', E0, []);
v('le cahier des charges : Stock 9 €, Achats 6 €, Compta 6 €, Registre sanitaire 6 €, l\'année à 10 mois', [C.serveur.prix, C.serveur.mois], [{ stock: 9, achats: 6, compta: 6, sanitaire: 6 }, 2]);
v('cohérence voulue : Pro + Stock = 24 € < Business 25 € < Pro + deux options (27 € et plus)', [C.pro.pro + C.serveur.prix.stock, C.pro.business, C.pro.pro + 12], [24, 25, 27]);
v('le registre sanitaire est la SEULE option du métier 3D, dans chacune des six lectures', ['app', 'serveur', 'page', 'apercu', 'site', 'tour'].map(n => C[n].metier3d.join()), ['sanitaire', 'sanitaire', 'sanitaire', 'sanitaire', 'sanitaire', 'sanitaire']);

console.log('3. ⛔ CONTRE-ÉPREUVE : une valeur changée dans UNE copie fait tomber la comparaison (population : la mutation a bien eu lieu)');
const muter = (nom, fichier, de, vers) => {
  const S = SOURCES();
  const ancien = S[fichier];
  const neuf = ancien.replace(de, vers);
  const bouge = neuf !== ancien;
  const E = bouge ? ecarts(copies(Object.assign({}, S, { [fichier]: neuf }))) : null;
  vrai(nom + ' — la mutation a touché le fichier, et la comparaison TOMBE (' + (E ? E.length + ' écart(s)' : 'motif introuvable') + ')', bouge && E.length > 0);
};
muter('prix de Stock à 8 € dans app.html', 'app', "stock:{l:'Stock',prix:9,", "stock:{l:'Stock',prix:8,");
muter('prix d\'Achats à 7 € dans le serveur', 'serveur', 'OPTIONS_PRIX_MOIS = { stock: 9, achats: 6,', 'OPTIONS_PRIX_MOIS = { stock: 9, achats: 7,');
muter('prix de Compta à 5 € dans la page de paiement', 'page', "compta:    { nom: 'Encaissements et compta',         prixMensuel: 6,", "compta:    { nom: 'Encaissements et compta',         prixMensuel: 5,");
muter('prix du Registre à 7 € dans l\'aperçu de la page', 'apercu', /(sanitaire: \{ nom: 'Registre sanitaire \(métier 3D\)',\s+prixMensuel: )6/, '$17');
muter('prix de Stock à 10 € sur le site', 'site', "court: 'Stock', prix: 9,", "court: 'Stock', prix: 10,");
muter('prix d\'Achats à 7 € dans la Tour', 'tour', 'var OPT_P={stock:9,achats:6,', 'var OPT_P={stock:9,achats:7,');
muter('l\'année à 11 mois dans le serveur (un mois offert)', 'serveur', 'const MOIS_OFFERTS_ANNEE = 2;', 'const MOIS_OFFERTS_ANNEE = 1;');
muter('l\'année à 11 mois sur le site', 'site', 'const MOIS_OFFERTS = 2;', 'const MOIS_OFFERTS = 1;');
muter('l\'année à 11 mois dans la page de paiement', 'page', 'const REMISE_ANNUELLE = 2;', 'const REMISE_ANNUELLE = 1;');
muter('une clé de moins dans la Tour (« compta »)', 'tour', "var OPT_CLES=['stock','achats','compta','sanitaire'];", "var OPT_CLES=['stock','achats','sanitaire'];");
muter('« registre » au lieu de « sanitaire » dans le serveur', 'serveur', "const OPTIONS_CLES = ['stock', 'achats', 'compta', 'sanitaire'];", "const OPTIONS_CLES = ['stock', 'achats', 'compta', 'registre'];");
muter('le registre sanitaire sans « 3D » dans la Tour', 'tour', "sanitaire:'Registre sanitaire (3D)'};\nvar OPT_C", "sanitaire:'Registre sanitaire'};\nvar OPT_C");
muter('le registre sanitaire n\'est plus du métier 3D dans app.html', 'app', "prix:6,metier3d:true,d:'Registre sanitaire", "prix:6,d:'Registre sanitaire");
muter('un écran de moins pour Compta dans app.html', 'app', "vues:['comptabilite','telecollecte','enveloppes']", "vues:['comptabilite','telecollecte']");
muter('un écran de plus pour Achats sur le site', 'site', "vues: ['fournisseurs', 'bons', 'commandes', 'boiteMail'],", "vues: ['fournisseurs', 'bons', 'commandes', 'boiteMail', 'comptabilite'],");
muter('un écran du Pro qu\'aucune option n\'ouvre (PLAN_BLOQUE.pro)', 'app', "'enveloppes']\n};", "'enveloppes','pointage']\n};");
muter('un tarif Stripe posé dans le serveur et pas dans la page', 'serveur', "  stock:      ['', ''],", "  stock:      ['price_x', 'price_y'],");
muter('un tarif Stripe annuel différent entre la page et son aperçu', 'apercu', "stock:     { mensuel: '', annuel: '' },", "stock:     { mensuel: '', annuel: 'price_z' },");

console.log('4. la lecture ne se laisse pas tromper');
v('une déclaration citée dans un commentaire de bloc n\'est pas la déclaration', litteral('/* const OPTIONS_GESTION = { x:1 }; */\nconst a = 1;', 'OPTIONS_GESTION'), null);
v('une apostrophe française et une accolade dans un commentaire ou une chaîne n\'égarent pas la lecture', litteral("const OPTIONS_GESTION = {\n // l'option { Stock }\n a:{l:'Stock {x}',prix:9},\n b:{prix:6}\n};\nconst Z = {}", 'OPTIONS_GESTION'), { a: { l: 'Stock {x}', prix: 9 }, b: { prix: 6 } });
v('une constante scalaire se lit aussi', litteral('const MOIS_OFFERTS = 2;\nconst b = 3;', 'MOIS_OFFERTS'), 2);
v('une déclaration absente rend null (jamais un objet vide qui passerait sur tout)', litteral('const x = 1;', 'OPTIONS_GESTION'), null);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
