/* ══ test-2952 · LES CATÉGORIES DE PRODUITS SUIVENT LE MÉTIER — ET LA 3D GARDE LES SIENNES, À L'IDENTIQUE ═══════════════════════════
   23 octobre 2026 (Justin : « je vérifie bien les catégories d'OP GESTION par métier, car là je trouve ça léger »). `CAT_LIST` — huit
   catégories d'anti-nuisibles — était la seule taxonomie : un plombier rangeait ses raccords sous « TP14 — Rodenticide ». Désormais
   UNE fonction, `categoriesProduit()`, rend la liste du métier courant ; toutes les lectures (formulaire produit, groupement du
   catalogue, liste collée, migration du chargement) y passent.
   Ce banc EXÉCUTE les vraies fonctions (categoriesProduit, categorieListe, formProduit, renderProduitsList, plAnalyse, le bloc de
   rangement de migrate, la fabrique de couleurs) pour les 23 métiers. Ce qu'il ne doit pas laisser passer :
   · la 3D qui change d'une lettre : même liste (la MÊME, `=== CAT_LIST`), mêmes huit couleurs, même traducteur de catalogues ;
   · une catégorie d'un autre métier qui passe par le traducteur de l'anti-nuisibles (`rangerCatFour`) ;
   · une catégorie inconnue d'une base d'avant EFFACÉE, réécrite au chargement, ou qui change à l'enregistrement d'une fiche ;
   · deux catégories d'un même métier de la même couleur, ou une catégorie sans couleur ;
   · une lecture directe de `CAT_LIST` hors de la 3D (recensée dans le CODE, commentaires retirés).
   Population comptée avant chaque absence.                                                                                        */
'use strict';
const { lire, litteral, evalue, bac, fonction } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

/* Les huit couleurs historiques de la 3D, telles qu'elles étaient le 22 octobre 2026 : elles ne bougent pas. */
const COULEURS_3D = { 'TP18 — Insecticide': '#EF9F27', 'TP14 — Rodenticide': '#E24B4A', 'Xylophage': '#8B5A2B', 'Piégeage': '#BA7517', 'Matériel': '#378ADD', 'EPI': '#1D9E75', 'Proofing': '#7F77DD', 'Désinfection': '#5DCAA5' };
const { BETA_SEULE } = require('./beta-en-avance.js');   // les métiers que seule la bêta connaît (déclarés : tests/beta-en-avance.js)
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

for (const fichier of ['app.html', 'beta.html']) {
  console.log('\n══ ' + fichier + ' ══');
  const { N } = lire(fichier);
  const METIERS = evalue(litteral(N, 'const METIERS={')), ORDRE = evalue(litteral(N, 'const METIERS_ORDRE=[')), CAT_LIST = evalue(litteral(N, 'const CAT_LIST=['));
  const HORS = ORDRE.filter(k => k !== '3d');
  const appels = [];
  const monter = (m, noms, extra, blocs) => bac(fichier, ['metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'categoriesProduit', 'categorieListe'].concat(noms || []),
    Object.assign({ METIERS, CAT_LIST, BETA_ESSAI: false, norm, db: { metier: m, produits: [] }, esc: s => String(s == null ? '' : s), rangerCatFour: (c, n) => { appels.push([c, n]); return 'TP18 — Insecticide'; } }, extra || {}), blocs);

  console.log('\n1. categoriesProduit : la liste du métier');
  const NB = 23 + (fichier === 'beta.html' ? BETA_SEULE.length : 0);   // app.html : les 23 de la production ; beta.html : + ceux que seule la bêta connaît
  vrai('(population) ' + NB + ' métiers, dont ' + (NB - 1) + ' avec leur propre liste', ORDRE.length === NB && HORS.length === NB - 1 && BETA_SEULE.every(k => (ORDRE.indexOf(k) >= 0) === (fichier === 'beta.html')) && HORS.every(k => Array.isArray(METIERS[k].produits) && METIERS[k].produits.length >= 4));
  const b3 = monter('3d');
  vrai('⛔ la 3D rend LA MÊME liste que CAT_LIST (même objet, huit catégories, même ordre) — rien ne change pour ELAN', b3.fn.categoriesProduit() === b3.scope.CAT_LIST && b3.fn.categoriesProduit().length === 8 && b3.fn.categoriesProduit()[0] === 'TP18 — Insecticide');
  egal('⛔ les ' + HORS.length + ' autres rendent chacun SA liste, celle du référentiel', HORS.filter(k => JSON.stringify(monter(k).fn.categoriesProduit()) !== JSON.stringify(METIERS[k].produits)), []);
  egal('   aucune des ' + HORS.length + ' listes ne contient une catégorie de l\'anti-nuisibles (TP14, TP18, xylophage, piégeage, proofing)', HORS.filter(k => METIERS[k].produits.some(c => /TP ?1[48]|xylophag|pi[ée]geage|proofing|rodent|insecticide/i.test(c))), []);
  egal('   sans métier réglé ou avec un métier inconnu : la 3D, comme partout (les entreprises d\'avant le choix du métier)', [monter(undefined).fn.categoriesProduit() === CAT_LIST, monter('boulangerie').fn.categoriesProduit() === CAT_LIST, b3.fn.categoriesProduit({ metier: 'piscine' }).length], [true, true, METIERS.piscine.produits.length]);

  console.log('\n2. Les couleurs : une par catégorie, jamais deux pareilles dans un métier');
  { const bloc = N.slice(N.indexOf('const CAT_PALETTE='), N.indexOf('function catColor(c)'));
    const origine = (N.match(/^const CAT_COLORS=\{[^\n]*\};/m) || [''])[0];
    vrai('(population) la fabrique de couleurs et les huit couleurs historiques se lisent dans le CODE', bloc.length > 200 && origine.length > 50 && /\(function\(\)\{ METIERS_ORDRE\.forEach/.test(bloc));
    const CAT_COLORS = new Function('METIERS', 'METIERS_ORDRE', origine + '\n' + bloc + '\nreturn CAT_COLORS;')(METIERS, ORDRE);
    egal('⛔ les huit couleurs de la 3D sont EXACTEMENT celles d\'avant', Object.keys(COULEURS_3D).filter(c => CAT_COLORS[c] !== COULEURS_3D[c]), []);
    egal('⛔ chaque catégorie des ' + HORS.length + ' métiers a une couleur (un hexadécimal)', HORS.flatMap(k => METIERS[k].produits.filter(c => !/^#[0-9A-Fa-f]{6}$/.test(CAT_COLORS[c] || '')).map(c => k + ' : ' + c)), []);
    egal('⛔ dans un même métier, deux catégories ne se confondent jamais', HORS.filter(k => new Set(METIERS[k].produits.map(c => CAT_COLORS[c])).size !== METIERS[k].produits.length), []);
    egal('   une catégorie partagée avec la 3D (« EPI ») garde sa couleur partout', HORS.filter(k => METIERS[k].produits.includes('EPI') && CAT_COLORS.EPI !== COULEURS_3D.EPI), []); }

  console.log('\n3. categorieListe : une ligne collée');
  { const t = monter('plomberie'), t3 = monter('3d');
    egal('⛔ hors 3D : la catégorie exacte, ou la même à la casse et aux accents près, sinon « Sans catégorie » — jamais le traducteur de l\'anti-nuisibles',
      [t.fn.categorieListe('Robinetterie et mitigeurs', 'X'), t.fn.categorieListe('robinetterie ET mitigeurs', 'X'), t.fn.categorieListe('TP14 — Rodenticide', 'Raccord'), t.fn.categorieListe('', 'Gel blattes'), t.fn.categorieListe('Insecticides', 'Gel blattes'), appels.length],
      ['Robinetterie et mitigeurs', 'Robinetterie et mitigeurs', '', '', '', 0]);
    appels.length = 0;
    egal('⛔ la 3D : une catégorie de la liste passe telle quelle, tout le reste va au traducteur (rangerCatFour), comme avant', [t3.fn.categorieListe('Xylophage', 'N'), t3.fn.categorieListe('Insecticides', 'Gel'), appels], ['Xylophage', 'TP18 — Insecticide', [['Insecticides', 'Gel']]]); }

  console.log('\n4. Le chargement ne range QUE la 3D');
  { const deb = N.indexOf('    if(typeof rangerCatFour===\'function\' && Array.isArray(d.produits)');
    const fin = N.indexOf('}catch(e){}', deb);
    vrai('(population) le bloc de rangement de migrate() est trouvé dans le CODE', deb > 0 && fin > deb);
    const bloc = N.slice(deb, fin);
    const CATFOUR = [['x', 'Insecticides', 'F'], ['y', 'Rongeurs', 'F']];
    const jouer = metier => { appels.length = 0; const d = { metier, produits: [{ id: 'a', nom: 'Raccord laiton' }, { id: 'b', nom: 'Gel blattes', categorie: 'Insecticides' }, { id: 'c', nom: 'Joint', categorie: 'Joints, filasse, pâtes' }] };
      new Function('d', 'rangerCatFour', 'CATFOUR', 'CAT_LIST', 'try{\n' + bloc + '\n}catch(e){}')(d, (c, n) => { appels.push([c, n]); return 'TP18 — Insecticide'; }, CATFOUR, CAT_LIST);
      return d.produits.map(p => p.categorie || ''); };
    egal('⛔ la 3D : une fiche sans catégorie et une étiquette de fournisseur sont rangées, comme avant', jouer('3d'), ['TP18 — Insecticide', 'TP18 — Insecticide', 'Joints, filasse, pâtes']);
    egal('⛔ sans métier réglé (entreprise d\'avant) : comme la 3D', jouer(undefined), ['TP18 — Insecticide', 'TP18 — Insecticide', 'Joints, filasse, pâtes']);
    egal('⛔ hors 3D : RIEN ne bouge au chargement — ni la fiche sans catégorie, ni l\'étiquette inconnue, ni la catégorie du métier', ['plomberie', 'piscine', 'autre'].map(jouer), [['', 'Insecticides', 'Joints, filasse, pâtes'], ['', 'Insecticides', 'Joints, filasse, pâtes'], ['', 'Insecticides', 'Joints, filasse, pâtes']]);
    vrai('   et le traducteur n\'est même pas appelé hors 3D', (jouer('plomberie'), appels.length === 0)); }

  console.log('\n5. Les écrans : le formulaire produit, le catalogue, la liste collée');
  const monde = m => ({ db: { metier: m, fournisseurs: [{ nom: 'Négoce' }], boxes: [], produits: [
      { id: 'p1', nom: 'Gel blattes', categorie: 'TP18 — Insecticide', fournisseurs: ['MABI'] }, { id: 'p2', nom: 'Raccord laiton 20/27', categorie: 'Raccords et fittings', fournisseurs: ['Négoce'] },
      { id: 'p3', nom: 'Vieux produit', categorie: 'Catégorie d\'avant', fournisseurs: ['X'] }, { id: 'p4', nom: 'Sans catégorie', fournisseurs: ['X'] }] } });
  { let html = '';
    const opts = (m, id) => { const w = monde(m), b = monter(m, ['formProduit', 'renderProdFours'], Object.assign(w, { openModal: h => { html = h; }, permGarde: () => true, produit: i => w.db.produits.find(p => p.id === i) || {}, visibleBoxes: () => [], $: () => ({}), prodFours: new Set(), FOUR_PILLS: [], fourColor: () => '#000', aplatDe: () => ['#000', '#fff'], encreDonnee: c => c }));
      b.fn.formProduit(id); const sel = (html.match(/<select name="categorie"[^>]*>([\s\S]*?)<\/select>/) || [])[1] || ''; return { liste: (sel.match(/<option[^>]*>([^<]*)<\/option>/g) || []).map(o => o.replace(/<[^>]*>/g, '')), choisie: (sel.match(/<option selected>([^<]*)<\/option>/) || [])[1] }; };
    const f3 = opts('3d', ''); const fp = opts('plomberie', ''), fv = opts('plomberie', 'p3'), fp2 = opts('plomberie', 'p2');
    vrai('(population) les formulaires se rendent avec des options', f3.liste.length >= 8 && fp.liste.length >= 4, [f3.liste.length, fp.liste.length]);
    egal('⛔ la 3D : les huit catégories, puis celles déjà présentes dans la base (comme avant)', f3.liste, CAT_LIST.concat(['Raccords et fittings', 'Catégorie d\'avant']));
    egal('⛔ un plombier : SA liste fermée — pas une catégorie de la 3D, pas celles des autres fiches', fp.liste, METIERS.plomberie.produits);
    egal('⛔ la fiche d\'un produit rangé hors liste (base d\'avant) PROPOSE sa catégorie et la garde choisie : enregistrer ne la change pas', [fv.liste[fv.liste.length - 1], fv.choisie], ['Catégorie d\'avant', 'Catégorie d\'avant']);
    egal('   une fiche dans la liste garde la sienne choisie', fp2.choisie, 'Raccords et fittings'); }
  { const groupes = m => { const w = monde(m); const el = {}; let c = '';
      const b = monter(m, ['renderProduitsList'], Object.assign(w, { $: id => (id === 'prd-list' ? { set innerHTML(v) { c = v; }, get innerHTML() { return c; } } : null), prdSearch: '', prdOnglet: 'tous', prdExpanded: {}, stockTotaux: () => ({}), stockVoitTout: () => true, produitsVisibles: () => w.db.produits, prdCataloguePont: () => '', catColor: () => '#000', encreDonnee: x => x, catAbrev: x => x.slice(0, 2), boxEtat: () => ({ k: 'ok', l: 'ok', c: '#000' }), prdBoxCount: () => 0, fourBadge: () => '', emptyState: () => '' }));
      b.fn.renderProduitsList(); return [...c.matchAll(/prd-cat-h[^>]*>[\s\S]*?<div style="font-weight:700[^>]*>([^<]*)<\/div>/g)].map(x => x[1]); };
    const g3 = groupes('3d'), gp = groupes('plomberie');
    egal('⛔ la 3D : ses huit catégories d\'abord (celles qui ont des produits), puis les autres, triées', g3, ['TP18 — Insecticide', 'Catégorie d\'avant', 'Raccords et fittings', 'Sans catégorie']);
    egal('⛔ un plombier : les catégories de SON métier d\'abord, puis les inconnues d\'une base d\'avant TELLES QUELLES (jamais effacées), « Sans catégorie » en bas', gp, ['Raccords et fittings', 'Catégorie d\'avant', 'Sans catégorie', 'TP18 — Insecticide'].filter(x => gp.includes(x)).sort((a, b) => gp.indexOf(a) - gp.indexOf(b)));
    vrai('   (population) la fiche « TP18 — Insecticide » est toujours affichée chez le plombier — rien n\'est effacé', gp.includes('TP18 — Insecticide') && gp[0] === 'Raccords et fittings', gp); }
  { const lignes = (m, texte) => { const w = monde(m); let c = '';
      const els = { 'pl-texte': { value: texte }, 'pl-count': {}, 'pl-apercu': { set innerHTML(v) { c = v; }, get innerHTML() { return c; } } };
      const b = monter(m, ['plAnalyse'], Object.assign(w, { $: id => els[id] || null, plPrix: x => (x ? Number(String(x).replace(',', '.')) : 0), _plLignes: [], _plRefus: [], catColor: () => '#000', encreDonnee: x => x }));
      b.fn.plAnalyse(); return { l: b.scope._plLignes.map(x => [x.nom, x.categorie]), html: c }; };
    const texte = 'Raccord laiton ; Négoce ; 2,40 ; R1 ; Raccords et fittings\nFlexible inox ; Négoce ; 5 ; R2 ; robinetterie ET mitigeurs\nGel blattes ; MABI ; 9 ; R3 ; Insecticides\nGants ; Négoce';
    const lp = lignes('plomberie', texte), l3 = lignes('3d', texte);
    egal('⛔ un plombier collant une liste : sa catégorie (casse et accents tolérés) ou « Sans catégorie » — jamais celle du traducteur 3D', lp.l, [['Raccord laiton', 'Raccords et fittings'], ['Flexible inox', 'Robinetterie et mitigeurs'], ['Gel blattes', ''], ['Gants', '']]);
    egal('⛔ la 3D : le traducteur de catalogues, comme avant (rien d\'autre dans cet appel)', l3.l.map(x => x[1]).slice(0, 3), ['TP18 — Insecticide', 'TP18 — Insecticide', 'TP18 — Insecticide']);
    vrai('   la liste du menu de chaque ligne est celle du métier (« Raccords et fittings » proposée au plombier, pas « TP14 — Rodenticide »)', /Raccords et fittings/.test(lp.html) && !/TP14 — Rodenticide/.test(lp.html) && /TP14 — Rodenticide/.test(l3.html)); }

  console.log('\n6. Plus aucune lecture directe de CAT_LIST hors de la 3D');
  { const lectures = [...N.matchAll(/\bCAT_LIST\b/g)].map(m => m.index);
    const ou = lectures.map(i => { const debutLigne = N.lastIndexOf('\n', i) + 1; return N.slice(debutLigne, N.indexOf('\n', i)).trim().slice(0, 100); });
    vrai('(population) les mentions de CAT_LIST dans le code sont comptées', lectures.length >= 3, lectures.length);
    /* les seules lectures admises : la déclaration, la fonction qui rend la liste, et le rangement de la 3D (migrate, derrière sa garde) */
    const admises = ou.filter(l => /^const CAT_LIST=/.test(l) || /^function categoriesProduit\(/.test(l) || /if\(CAT_LIST\.includes\(p\.categorie\) \|\| !brutes\.has\(p\.categorie\)\) return;/.test(l));
    egal('⛔ CAT_LIST n\'est lu que par sa déclaration, `categoriesProduit` et le rangement de migrate (3D seulement) — tout le reste passe par la fonction', ou.filter(l => admises.indexOf(l) < 0), []); }
}

console.log('\n── 2902 : ' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
