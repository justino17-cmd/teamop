// Contre-épreuve de la refonte Matériel : on REMET dans une COPIE de la page un défaut que les sondes « materiel-* » gardent, et on exige que la
// sonde concernée TOMBE. « Un banc qui passe ne prouve rien tant qu'on ne l'a pas vu échouer » — et une mutation qui ne casse rien est ou bien une
// sonde qui ne regarde pas au bon endroit, ou bien une mutation mal visée : chaque remplacement doit toucher EXACTEMENT une occurrence, sinon rien n'est joué.
// Les étapes suivantes (Stock, Dépôts, Fournisseurs…) ajoutent leurs lignes à ce tableau : une ligne = [nom, texte visé, texte remis, [sondes, avec leurs arguments]].
// node scratchpad/proto-final/sondes/materiel-mutations.js [filtre]      DRY=1 : vérifie seulement que chaque mutation vise juste
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.join(__dirname, '..', '..', '..'), PAGE = path.join(REPO, 'apercu', 'prototype-op-gestion.html');
const TMP = process.env.MUT_DIR || '/tmp/mutations-materiel';
const SRC = fs.readFileSync(PAGE, 'utf8');
const M = [
  // ── Lot 0 : les règles communes ──
  ['1 · un envoi identique en attente se redouble (le double appui crée une seconde demande)', "{ if (matDejaEnvoye(m)) return 'doublon'; MVTS_ATT.unshift(m); return 'attente'; }", "{ MVTS_ATT.unshift(m); return 'attente'; }", [['camion']]],
  ['2 · un camion au garage est de nouveau compté parmi les camions à remplir', "LIEUX.filter(l => l.type === 'vehicule' && !l.ferme && !bxGarage(l.id)).map(l => ({ l, manques:bxManques(l.id) }))", "LIEUX.filter(l => l.type === 'vehicule' && !l.ferme).map(l => ({ l, manques:bxManques(l.id) }))", [['pieces']]],
  ['3 · « à commander » compte des paniers au lieu des lignes (l\'ancienne règle)', "cmdPaniers().reduce((n, p) => n + p.lignes.length, 0)", "cmdPaniers().length", [['pieces'], ['camion']]],
  ['4 · « Plus en stock » redevient « Épuisé »', "mot:'Plus en stock'", "mot:'Épuisé'", [['pieces']]],
  ['5 · « Bientôt fini » perd sa couleur d\'alerte (orange)', "mot:'Bientôt fini', cls:'st-o'", "mot:'Bientôt fini', cls:'st-g'", [['pieces']]],
  ['6 · « BC-2026-039 » s\'affiche de nouveau avec son préfixe', "String(n || '').replace(/^(BC|BR)-/, '')", "String(n || '')", [['pieces']]],
  // ── Lot 1 : Mon camion ──
  ['7 · un prix paraît dans l\'écran du technicien (la liste « À bord » dépliée)', "prévus : le compte y est`", "prévus : le compte y est · ${eur(12.5)}`", [['camion']]],
  ['8 · la pastille Camion compte les messages du bureau au lieu des envois refusés', "n = SX.refus.filter(o => o.m.qui === q).length;", "n = rlNotifsListe(q).length;", [['camion']]],
  ['9 · l\'envoi mis de côté sans réseau ne repart jamais', "if (!MAT.file.length) return; const L = MAT.file.splice(0)", "if (true) return; const L = MAT.file.splice(0)", [['camion']]],
  ['10 · « J\'ai tout pris » compte aussi ce qui attend déjà (le bouton promet une double demande)', "prenables = M.filter(o => stkAt(o.x, 'atelier') > 0 && !att(o.x.id))", "prenables = M.filter(o => stkAt(o.x, 'atelier') > 0)", [['camion']]],   // le filtre du clic, lui, est doublé par matDejaEnvoye (mutation 1) : le muter seul ne change rien, c'est un mutant équivalent
  ['11 · une prise dépasse ce que l\'atelier a en stock', "q = Math.min(man || sxPas(x), stkAt(x, 'atelier'))", "q = man || sxPas(x)", [['camion']]],
  ['12 · la ligne grise « Envoyé au bureau » ne remplace plus le bouton', "return e ? `<div class=\"mc-l envoye\">", "return false ? `<div class=\"mc-l envoye\">", [['camion']]],
  ['13 · le technicien n\'a plus la phrase du garage', "${g ? '<div class=\"info petit mc-garage\">Ton camion est au garage.</div>' : ''}", "", [['camion']]],
  ['14 · le conteneur réservé à la partie Véhicule disparaît', "<div id=\"mc-vehicule\" data-vis=\"camion-vehicule\"></div>", "", [['camion']]],
  // ── Lot 2 : Stock ──
  ['18 · un comptage qui trouve un écart NÉGATIF ne s\'enregistre plus (« > 0 » au lieu de « !== 0 »)', "(stkAppliquer(m) !== 0 ? (MVTS.unshift(m), 'applique') : 'rien')", "(stkAppliquer(m) > 0 ? (MVTS.unshift(m), 'applique') : 'rien')", [['stock-gestes']]],
  ['19 · le bureau perd la route Stock (l\'ancienne liste de ses routes)', "ROLES.gestion.routes.push('stock', 'produits');", "ROLES.gestion.routes.push();", [['stock-roles']]],
  ['20 · le bureau peut accepter ce que les techniciens notent', "const msAccepte = () => rlPermis('stockAccepter'),", "const msAccepte = () => true,", [['stock-roles']]],
  ['21 · le bandeau « envois à accepter » ne regarde plus qui peut accepter', "if (!STK_VALID || !MVTS_ATT.length || !msAccepte()) return '';", "if (!STK_VALID || !MVTS_ATT.length) return '';", [['stock-roles']]],
  ['22 · la tuile « manquent dans les camions » compte des camions et non des articles', "cam = camionsARemplir().n;", "cam = camionsARemplir().camions.length;", [['stock-coherence']]],
  ['23 · « Annuler » ne retire plus le ticket rangé dans les achats (la photo du stock oublie ACHATS)', "dem:DEM_ACHAT.slice(), ach:ACHATS.slice(), dot:", "dem:DEM_ACHAT.slice(), dot:", [['stock-gestes']]],
  ['24 · le menu Plus reparle de « mouvements » (l\'ancien lexique)', "l:'Exporter l’historique'", "l:'Exporter les mouvements'", [['stock-mots']]],
  ['25 · le message d\'une sortie pour un collègue montre le numéro du bon AVEC son préfixe BR-', "' · bon de remise ' + esc(matNumAff(br))", "' · bon de remise ' + esc(br)", [['stock-gestes']]],
  ['26 · la fiche d\'article laisse le bureau changer le prix de VENTE (champ plus grisé)', "${msPrixVente() ? '' : 'disabled'}", "", [['stock-roles']]],
  ['27 · les trois choix « Pour qui ? » ne passent plus à la ligne (ils sortent de la feuille à 320 px)', "html .ms-seg2 button{flex:1 1 0;min-width:0;white-space:normal;", "html .ms-seg2 button{flex:1 1 0;min-width:0;white-space:nowrap;", [['stock-appareils', 'petit']]],
  // ── Mise en page (sept profils) ──
  ['15 · le nom d\'un article long ne se coupe plus (la colonne de texte ne rétrécit pas)', "html .mc-l>.fo-n{flex:1 1 0;min-width:0}html .mc-l>.fo-n>b{font-size:16px;overflow-wrap:anywhere}", "html .mc-l>.fo-n{flex:none}html .mc-l>.fo-n>b{font-size:16px;white-space:nowrap}", [['appareils', 'petit', 'iphone']]],
  ['16 · les boutons de ligne retombent sous le plancher du doigt', "html .mc-l .btn,html .mc-l .lien{min-height:44px;flex:none}", "html .mc-l .btn,html .mc-l .lien{min-height:28px;flex:none}", [['appareils', 'iphone']]],
  ['17 · les deux boutons gris ne passent plus à la ligne (ils sortent de l\'écran à 320 px)', "html .mc-duo .btn{min-height:56px;white-space:normal;", "html .mc-duo .btn{min-height:56px;white-space:nowrap;", [['appareils', 'petit']]],
];
const filtre = process.argv[2] || '';
fs.mkdirSync(TMP, { recursive: true });
function racine(nom, page) {   // une copie du dépôt visible du serveur : apercu/ en liens, sauf la page mutée
  const R = path.join(TMP, nom), A = path.join(R, 'apercu'); fs.rmSync(R, { recursive: true, force: true }); fs.mkdirSync(A, { recursive: true });
  for (const f of fs.readdirSync(path.join(REPO, 'apercu'))) if (f !== 'prototype-op-gestion.html') fs.symlinkSync(path.join(REPO, 'apercu', f), path.join(A, f));
  fs.writeFileSync(path.join(A, 'prototype-op-gestion.html'), page); return R; }
let tombes = 0, vivantes = [], jouees = 0;
for (const [nom, ancien, neuf, sondes] of M) {
  if (filtre && !nom.includes(filtre)) continue;
  const c = SRC.split(ancien).length - 1;
  if (c !== 1) { console.log(`✗ « ${nom} » : ${c} occurrence(s) du texte visé, 1 attendue — la mutation est mal visée, rien n'est joué`); process.exit(2); }
  if (process.env.DRY) { console.log('✓ visée juste :', nom); continue; }
  const page = SRC.replace(ancien, () => neuf); if (page === SRC) { console.log('✗ la copie est identique à la page : ' + nom); process.exit(2); }
  const R = racine('m', page);
  let tombe = false, detail = '';
  for (const [s, ...args] of sondes) {
    const r = cp.spawnSync('node', [path.join(__dirname, 'materiel-' + s + '.js'), ...args], { env: { ...process.env, RACINE: R }, encoding: 'utf8', timeout: 400000 });
    const bil = ((r.stdout || '').match(/== (\d+) ✓ · (\d+) ✗/) || [])[0] || '(pas de bilan : ' + String(r.stderr || '').split('\n')[0].slice(0, 80) + ')';
    detail += ` ${s}: ${bil} sortie ${r.status}`; if (r.status === 1 && /✗/.test(r.stdout || '')) { tombe = true; break; } }
  jouees++; if (tombe) tombes++; else vivantes.push(nom);
  console.log((tombe ? '✓ TOMBE ' : '✗ VIVANTE') + ' · ' + nom + ' →' + detail);
}
console.log(`\n== ${tombes} ✓ · ${vivantes.length} ✗  (${jouees} mutations jouées)`); vivantes.forEach(v => console.log(' ✗ vivante :', v));
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(vivantes.length ? 1 : 0);
