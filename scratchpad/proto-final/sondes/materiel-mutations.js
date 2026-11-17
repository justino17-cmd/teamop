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
  ['13 · le technicien n\'a plus la phrase du garage (l\'état du camion ne passe plus par vhPhraseCamion)', "if (v.statut === 'atelier') return { t:'Ton camion est au garage'", "if (false) return { t:'Ton camion est au garage'", [['camion']]],
  ['14 · le conteneur réservé à la partie Véhicule disparaît', "<div id=\"mc-vehicule\" data-vis=\"camion-vehicule\">${V ? vhCamionBloc(V) : ''}</div>", "", [['camion']]],
  // ── Lot 2 : Stock ──
  ['18 · un comptage qui trouve un écart NÉGATIF ne s\'enregistre plus (« > 0 » au lieu de « !== 0 »)', "(stkAppliquer(m) !== 0 ? (MVTS.unshift(m), 'applique') : 'rien')", "(stkAppliquer(m) > 0 ? (MVTS.unshift(m), 'applique') : 'rien')", [['stock-gestes']]],
  ['19 · le bureau perd la route Stock (sa case « Stock › Voir » ne suffit plus à l\'ouvrir)', "stock:{ equipe:['stock'] }, produits:{ equipe:['stock'] },", "stock:{ equipe:['admin'] }, produits:{ equipe:['stock'] },", [['stock-roles']]],
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
  // ── Lot 3 : Dépôts et camions ──
  ['28 · la carte d\'un camion au garage perd sa pastille « Au garage » (il passe pour prêt ou « il manque »)', "if (g) { pas = `<span class=\"st st-b\">${esc(bxGarageTxt(g))}</span>`; l3 = M.length ? 'On le remplira à son retour' : ''; }", "if (false) { pas = ''; l3 = ''; }", [['depots-gestes']]],
  ['29 · le bouton du haut compte des CAMIONS au lieu des articles qui manquent', "Remplir les camions · ${n}</button>` : mdReservesOk()", "Remplir les camions · ${camionsARemplir().camions.length}</button>` : mdReservesOk()", [['depots-gestes']]],
  ['30 · la feuille « Remplir les camions » ne coche plus rien d\'office', "BX.cfg = cfg; if (!surPlace) BX.sel = new Set(cfg.groupes.flatMap(g => g.L.filter(m => m.q > 0 && (!g.garage || cfg.garageOk)).map(m => m.cle)));", "BX.cfg = cfg; if (!surPlace) BX.sel = new Set();", [['depots-gestes']]],
  ['31 · un double appui sur « Tout mettre » double le déplacement (la feuille ne se ferme plus)', "  fermerPanneau(); prCatalogueMaj(); rendre();\n  sxToast(`${sxPl(n.length, 'article')} mis dans", "  prCatalogueMaj(); rendre();\n  sxToast(`${sxPl(n.length, 'article')} mis dans", [['depots-gestes']]],
  ['32 · « Annuler » ne rend plus la liste à bord, le nom ni la fermeture des lieux (la photo les oublie)', ", lx:LIEUX.map(l => [l, l.cible, l.dotP, l.nom, l.resp, l.note, l.adr, l.ferme]), nl:LIEUX.length }; }", " }; }", [['depots-gestes'], ['depots-fonctions']]],
  ['33 · « Ajouter aux commandes » crée une demande à chaque appui', "if (DEM_ACHAT.some(d => d.etat === 'attente' && d.pid === pid)) return toast(`${esc(x.nom)} est déjà dans les commandes.`);", "", [['depots-gestes']]],
  ['34 · le bandeau « Avant les visites » compte les camions au lieu des pièces', "const n = G.reduce((s, g) => s + g.L.length, 0), i0 = G[0].L[0].int;\n  return `<div class=\"carte dv-focus ms-bandeau\"", "const n = G.length, i0 = G[0].L[0].int;\n  return `<div class=\"carte dv-focus ms-bandeau\"", [['depots-gestes']]],
  ['35 · « Déplacer » (fiche d\'un camion) ouvre la feuille sans le camion de départ', "if (a === 'deplacer') return matGOuvrir('deplacer', { de:x });", "if (a === 'deplacer') return matGOuvrir('deplacer', {});", [['depots-gestes']]],
  ['36 · enregistrer la liste d\'un camion écrase celle que Karim partage (même modèle « clim »)', "const k = 'dot-' + l.id; DOTATION[k] = nv; l.dot = k; delete l.dotP;", "const k = l.dot || 'dot-' + l.id; DOTATION[k] = nv; l.dot = k; delete l.dotP;", [['depots-gestes']]],
  ['37 · le bureau (Julie) reçoit la route Dépôts et camions (elle ne demande plus « Supprimer » en plus)', "boxes:{ equipe:['stock', 'stock.s'], terrain:['stock'] }", "boxes:{ equipe:['stock'], terrain:['stock'] }", [['depots-roles']]],
  ['38 · le titre de la feuille redevient « Réassort des camions » (l\'ancien lexique)', "titre:seul ? 'Remplir ' + mdDe(lieu(seul)) : 'Remplir les camions'", "titre:seul ? 'Remplir ' + mdDe(lieu(seul)) : 'Réassort des camions'", [['depots-mots'], ['depots-gestes']]],
  ['39 · un nom de camion long écrase le titre de sa carte (la pastille ne passe plus dessous)', "html .md-t{display:flex;flex-wrap:wrap;align-items:flex-start", "html .md-t{display:flex;flex-wrap:nowrap;align-items:flex-start", [['depots-appareils', 'petit']]],
  ['40 · l\'en-tête de la page se coince à 175 px sur téléphone (le bouton recouvre le titre)', "html #contenu .tete.md-tete{flex-wrap:wrap;", "html #contenu .tete.md-tete{flex-wrap:nowrap;", [['depots-appareils', 'iphone']]],
  ['41 · le lien « Stock » de la phrase retombe à 23 px de haut (sous le plancher du doigt)', "padding:11px 8px!important;margin:-11px -8px;", "padding:0!important;margin:0;", [['depots-appareils', 'iphone']]],
  ['42 · la visite parlée perd sa cible « Avant les visites » (le bandeau n\'a plus son attribut)', "<div class=\"carte dv-focus ms-bandeau\"${matVis('depots-visites')}>", "<div class=\"carte dv-focus ms-bandeau\">", [['depots-visites']]],
  ['43 · l\'ancien « À faire maintenant » est de retour dans le code (bxAFaire)', "function mdBandeau(){", "function bxAFaire(){ return ''; }\nfunction mdBandeau(){", [['depots-fonctions']]],
  // ── Lot 4 : Fournisseurs, matériel & produits ──
  ['44 · le compteur de l\'onglet Commandes compte des paniers au lieu des lignes à commander', "const nc = cmdNbACommander(), na = PRODUITS.filter(x => !x.retire).length, nf = MES_FOURN.length;", "const nc = cmdPaniers().length, na = PRODUITS.filter(x => !x.retire).length, nf = MES_FOURN.length;", [['four-gestes']]],
  ['45 · « Annuler » après un envoi ne remet plus la commande en brouillon (la photo n\'est pas relue)', "Object.keys(c).forEach(k => delete c[k]); Object.assign(c, avant); tk.forEach(([t, e, l]) => { t.etat = e;", "tk.forEach(([t, e, l]) => { t.etat = e;", [['four-gestes']]],
  ['46 · le bureau peut ajouter un fournisseur (le bouton ne regarde plus le rôle)', "const fxGerant = () => msReglages();", "const fxGerant = () => true;", [['four-roles']]],
  ['47 · le bureau peut retirer un article depuis sa fiche', "${msReglages() ? `<button type=\"button\" class=\"lien ms-rouge\" data-pr=\"retirer|${x.id}\">Retirer cet article</button>` : ''}", "${true ? `<button type=\"button\" class=\"lien ms-rouge\" data-pr=\"retirer|${x.id}\">Retirer cet article</button>` : ''}", [['four-roles']]],
  ['48 · une commande en retard offre « J\'ai reçu » au lieu de « Relancer » sur sa ligne (l\'ordre des états s\'inverse)', "  if (a && (a.t === 'retard' || a.t === 'silence')) return `<button type=\"button\" class=\"btn gris petit fx-ab\" data-cm=\"relance|${c.id}\">Relancer</button>`;\n  if (cmdOuverte(c))", "  if (cmdOuverte(c) && !(a && a.t === 'facture'))", [['four-gestes']]],
  ['49 · « Annuler » après « J\'ai reçu la livraison » ne rend plus les articles (le stock reste monté)', "const ids = new Set(snap.p.map(x => x.id)); for (let k = PRODUITS.length - 1; k >= 0; k--) if (!ids.has(PRODUITS[k].id)) PRODUITS.splice(k, 1);\n    snap.p.forEach(x => { const y = PRODUITS.find(z => z.id === x.id); if (y) { Object.keys(y).forEach(k => delete y[k]); Object.assign(y, x); } });", "", [['four-gestes']]],
  ['50 · cocher « Je le retire au comptoir » ne génère plus le texte du délai (le courriel garde l\'ancien)', "const delaiTxt = f => f && f.dj != null ? pdxDelaiTexte(f.dj) : (f && f.delai) || '';", "const delaiTxt = f => (f && f.delai) || '';", [['four-gestes']]],
  ['51 · le titre de la feuille de réception redevient « Réceptionner » (l\'ancien lexique)', "<h2>J’ai reçu la livraison</h2><span class=\"gris\">Dis ce qui est arrivé", "<h2>Réceptionner</h2><span class=\"gris\">Dis ce qui est arrivé", [['four-mots']]],
  ['52 · un émoji revient dans un menu (il ne rend pas pareil sur Mac, Windows et Android)', "{ ic:svg('registre'), l:'Voir ce que voit le fournisseur (démonstration)'", "{ ic:'👁', l:'Voir ce que voit le fournisseur (démonstration)'", [['four-mots']]],
  ['53 · l\'appareil photo de l\'en-tête perd son nom (icône seule, plus d\'aria-label)', " data-fo=\"facture|\"${matVis('four-photo')} aria-label=\"Photographier une facture\" title=\"Photographier une facture\">", " data-fo=\"facture|\"${matVis('four-photo')}>", [['four-mots'], ['four-gestes']]],
  ['54 · les trois onglets ne tiennent plus dans leur colonne (police et marges énormes sur téléphone)', "html .fx-seg button{flex:1 1 auto;min-width:0;padding:0 8px;font-size:14.5px}", "html .fx-seg button{flex:none;min-width:0;padding:0 26px;font-size:20px}", [['four-appareils', 'petit']]],
  ['55 · la visite perd sa cible « À commander » (la carte n\'a plus son attribut)', "<div class=\"carte fx-acmd\" id=\"pans\"${matVis('four-commander')}>", "<div class=\"carte fx-acmd\" id=\"pans\">", [['four-visites']]],
  ['56 · le filtre « Prix à compléter » garde tous les articles', "(f === 'ac' && x.ac);", "(f === 'ac' && true);", [['four-gestes']]],
  ['57 · une seconde définition de cmdEtapes revient dans le code (la seconde gagne en silence)', "function cmdEtapes(c){", "function cmdEtapes(c){ return ''; }\nfunction cmdEtapes(c){", [['four-fonctions']]],
  ['58 · un grand vide se glisse avant la première ligne à commander (la densité s\'effondre)', "html .fx-acmd{padding:18px 20px}", "html .fx-acmd{padding:18px 20px;margin-top:440px}", [['four-densite', 'mac', 'iphone']]],
  ['59 · les lignes de réglage de la fiche d\'un fournisseur ne s\'empilent plus sur téléphone (le champ sort de l\'écran)', "html .fx-lg{flex-direction:column;align-items:stretch;gap:6px}", "html .fx-lg{flex-direction:row;align-items:center;gap:6px;flex-wrap:nowrap}", [['four-appareils', 'petit']]],
  ['60 · la zone « Choisir le fichier » se laisse écraser sous son propre texte (la feuille est une colonne flex)', "html .fo-depot{flex:none}", "html .fo-depot{flex:0 1 auto}", [['four-appareils', 'iphone']]],
  ['61 · l\'en-tête perd sa forme commune : la barre d\'onglets saute entre les onglets', "html #contenu .tete.fx-tete{flex-wrap:wrap;row-gap:12px}html .fx-tete>div:first-child{flex:1 1 100%;min-width:0}html .fx-tete .actions{flex:1 1 100%}", "html .fx-tete .actions{flex:0 1 auto}", [['four-appareils', 'mac']]],
  ['62 · le rond « Pourquoi cette quantité ? » retombe à 22 px sous le doigt', "html .fx-ib{position:relative;flex:none;width:44px;height:44px;", "html .fx-ib{position:relative;flex:none;width:22px;height:22px;", [['four-appareils', 'iphone']]],
  ['63 · le bon de commande garde ses quatre colonnes sur téléphone (la désignation passe sur huit lignes)', "  html .bc-t thead{display:none}html .bc-t,html .bc-t tbody{display:block}html .bc-t tr{display:grid;grid-template-columns:auto 1fr auto;gap:2px 12px;padding:9px 0;border-bottom:1px solid var(--trait)}\n  html .bc-t td{padding:0;border:0;text-align:left}html .bc-t td:first-child{grid-column:1/-1}html .bc-t td:nth-child(3){text-align:right;color:var(--doux)}html .bc-t td:nth-child(4){text-align:right;font-weight:650}", "", [['four-appareils', 'iphone']]],
  ['64 · le nom d\'un fournisseur long fait sortir le bouton « Envoyer à… » de la feuille', "html .fo-pied .btn{max-width:100%;white-space:normal;overflow-wrap:anywhere;line-height:1.25}", "html .fo-pied .btn{white-space:nowrap}", [['four-appareils', 'iphone']]],
  // ── Lot 5 et lot 6 : voisins, guides et recette ──
  ['65 · la carte « Matériel » de l\'Accueil compte les camions au lieu des articles qui manquent', "t:`${sxPl(c.n, 'article')} ${c.n > 1 ? 'manquent' : 'manque'} dans", "t:`${sxPl(c.camions.length, 'article')} ${c.n > 1 ? 'manquent' : 'manque'} dans", [['voisins'], ['coherence']]],
  ['66 · le bureau lit sur sa carte « N envois à accepter » (la ligne ne regarde plus le droit d\'accepter)', "if (voit('stock') && typeof msAccepte === 'function' && msAccepte() && STK_VALID)", "if (voit('stock') && typeof msAccepte === 'function' && STK_VALID)", [['voisins']]],
  ['67 · la technicienne reçoit le bouton « Commander » sur ses pièces prévues', "const peut = ROLE !== 'tech' && ROLE !== 'client' && rlPermis('produits');", "const peut = true;", [['voisins']]],
  ['68 · une pièce est « Prête » dès qu\'on a un article quelque part (plus de « À commander »)', "if (at + bord >= q) return { k:'prete'", "if (at + bord >= 0) return { k:'prete'", [['voisins']]],
  ['69 · la pastille du menu « Fournisseurs, matériel & produits » ne compte plus le « à commander »', "    else if (k === 'produits') n = cmdNbACommander();", "", [['coherence']]],
  ['70 · le guide montre à chacun les quatre lignes du matériel, même celles qu\'il ne peut pas ouvrir', "const L = NV_MAT.filter(l => l[0] !== 'moncamion' ? ROLE !== 'tech' && nvVoit(l[0]) : ROLE === 'tech' && nvVoit(l[0]));", "const L = NV_MAT;", [['voisins']]],
  ['71 · la création d\'une intervention n\'enregistre plus l\'article de la pièce prévue (le pid se perd)', "return x ? { nom, q, pid:x.id } : { nom, q };", "return { nom, q };", [['voisins']]],
  ['72 · « Annuler » son envoi redevient une suppression de Stock (la règle des cases le cache à la technicienne)', "mchginter', l:'retire messages usage bord ret mliste mpiece mlibre mquand minter inter' },", "mchginter', s:'retire', l:'messages usage bord ret mliste mpiece mlibre mquand minter inter' },", [['camion']]],
  ['73 · la visite perd sa cible « Où est l\'article ? » (le bouton du lieu n\'a plus son attribut)', "data-ms=\"ou\"${matVis('stock-lieu')} aria-haspopup", "data-ms=\"ou\" aria-haspopup", [['visites']]],
  ['74 · le guide redit « Mouvements » et « À valider » pour dire où est passé le journal', "'Stock › onglet « Ce qui a bougé » et « Envois à accepter »'", "'Stock › onglets « Mouvements » et « À valider »'", [['mots']]],
  ['75 · la pastille « Pièces » du planning dit « commandées » au lieu de « en route »', "court:'en route', arr }", "court:'commandées', arr }", [['mots']]],
  ['76 · la pastille d\'une pièce « Prête » devient pâle (elle ne se lit plus de nuit)', ".pp-e .btn{margin-left:auto}", ".pp-e .btn{margin-left:auto}.pp-e .st{opacity:.4}", [['nuit', 'mac']]],
  ['77 · une étape de la visite guidée du Stock vise une classe au lieu d\'un attribut', "['[data-vis=\"stock-lieu\"]', 'Où est l’article ?'", "['#contenu .ms-cherche', 'Où est l’article ?'", [['visites']]],
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
  if ((parseInt(nom, 10) || 0) < (parseInt(process.env.DEPUIS || '0', 10) || 0)) continue;   // DEPUIS=44 : seules les mutations de l'étape 4
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
