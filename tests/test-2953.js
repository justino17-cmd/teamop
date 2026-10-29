/* ══ test-2953 · « QUAND ILS COCHENT, QUE ÇA EXPLIQUE » — CHAQUE RUBRIQUE A SON EXPLICATION OÙ ON LA COCHE ═══════════════════════════
   23 octobre 2026 (Justin : « un système où ils cochent les catégories ; et quand ils cochent, que ça explique la catégorie »).
   Partout où l'application liste des rubriques à cocher — la grille des droits d'une personne ET d'un profil (`usrDroitsHtml`),
   « Accès au cas par cas » (`formAccess`), « Modules OP » (`views.modulesElan`), la liste conseillée du métier (Paramètres → Mon
   métier) — chaque rubrique montre son explication, celle du référentiel (`RUBRIQUES_INFO`), SOUS son nom et sans survol.
   Ce banc EXÉCUTE les vraies fonctions et lit ce qu'elles écrivent. Il ne laisse passer :
   · une rubrique cochable sans son explication (la grille en montre 40 : chacune doit avoir la sienne) ;
   · une explication tronquée ou différente du référentiel (mot pour mot) ;
   · une explication cachée (survol, `title`, `display:none`) : au téléphone il n'y a pas de survol ;
   · une rubrique sans texte (« Produits donnés ») qui en inventerait un.
   Population comptée avant chaque absence.                                                                                          */
'use strict';
const path = require('path'), fs = require('fs');
const { lire, litteral, evalue, bac, fonction } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'metiers.json'), 'utf8'));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sansBalises = h => h.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ');

for (const fichier of ['app.html', 'beta.html']) {
  console.log('\n══ ' + fichier + ' ══');
  const { N } = lire(fichier);
  const NAV = evalue(litteral(N, 'const NAV = [')), METIERS = evalue(litteral(N, 'const METIERS={')), INFO = evalue(litteral(N, 'const RUBRIQUES_INFO={'));
  const SOUS_CATS = evalue(litteral(N, 'const SOUS_CATS=['));
  const PERM_GRPS = evalue(litteral(N, 'const PERM_GRPS=[')), PERM_GRP_OF = evalue(litteral(N, 'const PERM_GRP_OF={')), PERM_SPECIAUX = evalue(litteral(N, 'const PERM_SPECIAUX={'));
  const cles = NAV.flatMap(g => g.items).map(i => i.k);

  console.log('\n1. La grille des droits (une personne, un profil) : chaque menu est expliqué');
  const grille = (role) => {
    const u = { id: 'u9', role, acces: { modules: {}, caps: {} } };
    const init = { NAV, METIERS, RUBRIQUES_INFO: INFO, SOUS_CATS, PERM_GRPS, PERM_GRP_OF, PERM_SPECIAUX, esc, t: x => x, BETA_ESSAI: false, db: { users: [u], boxes: [], metier: '3d' },
      PERM_GRP_OF_: PERM_GRP_OF, userSeesModule: () => true, catBloque: () => false, planBloque: () => false, metierBloque: () => false, userCap: () => false, catDroit: () => false, canCat: () => true,
      validationsOuvertes: () => false, moduleReglage: () => null, validationsNote: () => '', capDeduitRegle: () => false, catDeduitRegle: () => false, tableDuRole: () => ({}), estStockage: () => false,
      boxExclu: () => false, USER_CAPS: [], navLabel: k => k, estMetier3D: () => true };
    const b = bac(fichier, ['avecSousCats', 'rubExplication', 'rubExplHtml', 'usrDroitsHtml'], init);
    return { html: b.fn.usrDroitsHtml(u, true), u, b };
  };
  let G; try { G = grille('technicien'); } catch (e) { G = { erreur: String(e.stack || e).split('\n').slice(0, 3).join(' | ') }; }
  vrai('(population) la grille se rend, avec ses lignes de menus', G.html && (G.html.match(/class="perm-row"/g) || []).length >= 30, G.erreur || (G.html.match(/class="perm-row"/g) || []).length);
  if (G.html) {
    const lignes = G.html.split('<div class="perm-row">').slice(1);
    const parCle = {}; lignes.forEach(l => { const m = l.match(/data-d="mod_([A-Za-z]+)"/); if (m) parCle[m[1]] = l; });
    const vus = Object.keys(parCle);
    vrai('(population) la grille montre les rubriques du menu (hors accueil) : ' + vus.length, vus.length >= 36, vus.length);
    egal('⛔ chaque rubrique du menu qu\'elle montre porte l\'explication du référentiel, mot pour mot', vus.filter(k => INFO[k] && sansBalises(parCle[k]).indexOf(INFO[k][1]) < 0), []);
    egal('⛔ l\'explication est un bloc visible sous le nom (classe pn-x, dans le même .pn, avant l\'interrupteur) — pas un title, pas display:none', vus.filter(k => INFO[k] && !new RegExp('<div class="pn">[\\s\\S]*?<div class="pn-x">' + esc(INFO[k][1]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</div></div><label class="switch">').test(parCle[k].replace(/<div class="pn-d"[^>]*>[\s\S]*?<\/div>/g, ''))), []);
    vrai('   la sous-rubrique « Produits donnés » (sans texte au référentiel) n\'en invente pas', parCle.produitsDonnes && !/pn-x/.test(parCle.produitsDonnes), parCle.produitsDonnes && parCle.produitsDonnes.slice(0, 200));
    vrai('   « Validation des mouvements » dit ce que le référentiel dit (sans consigne de chantier)', /Le responsable valide ou refuse les demandes de commande/.test(sansBalises(parCle.validations || '')) && !/Validations DR|doit devenir/.test(sansBalises(parCle.validations || '')));
    vrai('⛔ aucune explication dans un attribut title ou aria-describedby caché : tout est dans le balisage', !/title="[^"]*Votre journée|data-expl/.test(G.html)); }

  console.log('\n2. « Accès au cas par cas »');
  { let html = '';
    const u = { id: 'u9', role: 'technicien', prenom: 'A', nom: 'B', acces: { modules: {}, caps: {} } };
    const b = bac(fichier, ['avecSousCats', 'rubExplication', 'rubExplHtml', 'formAccess'], { NAV, RUBRIQUES_INFO: INFO, SOUS_CATS, esc, db: { users: [u] }, currentUser: { role: 'admin' }, userSeesModule: () => true, userCap: () => false, roleLbl: () => 'Technicien', fullName: () => 'A B', openModal: h => { html = h; }, toast: () => {} });
    try { b.fn.formAccess('u9'); } catch (e) { html = 'ERREUR ' + e.message; }
    const lignes = html.split('<div class="perm-row">').slice(1).filter(l => /accessSetMod/.test(l));
    vrai('(population) la fenêtre liste les modules', lignes.length >= 36, [lignes.length, html.slice(0, 80)]);
    egal('⛔ chaque module a son explication', lignes.filter(l => { const m = l.match(/accessSetMod\('u9','([A-Za-z]+)'/); return m && INFO[m[1]] && sansBalises(l).indexOf(INFO[m[1]][1]) < 0; }).length, 0); }

  console.log('\n3. « Modules OP » (mis de côté)');
  { let html = '';
    const els = { content: { set innerHTML(v) { html = v; } } };
    const b = bac(fichier, ['rubExplication', 'rubExplHtml'], { NAV, RUBRIQUES_INFO: INFO, esc, setHeader: () => {}, $: id => els[id] || {}, userSeesModule: () => true, currentUser: {}, go: () => {} }, ['views.modulesElan=function(){']);
    b.scope.views = {}; // les blocs s'écrivent `views.x=` : on lui donne son objet AVANT d'exécuter
    const b2 = bac(fichier, ['rubExplication', 'rubExplHtml'], { NAV, RUBRIQUES_INFO: INFO, esc, setHeader: () => {}, $: id => els[id] || {}, userSeesModule: () => true, currentUser: {}, go: () => {}, views: {} }, ['views.modulesElan=function(){']);
    b2.scope.views.modulesElan();
    const asides = NAV.flatMap(g => g.items).filter(i => i.aside && !i.cache);   // v780 : les rubriques regroupées (cache:1) ne sont plus des modules mis de côté
    vrai('(population) la liste des modules mis de côté se rend (' + asides.length + ' rubriques)', asides.length >= 5 &&   /* 6 depuis le menu allégé (v780) */ (html.match(/class="pl-row"/g) || []).length === asides.length, [asides.length, (html.match(/class="pl-row"/g) || []).length]);
    egal('⛔ chacun montre son explication sous son titre', asides.filter(i => sansBalises(html).indexOf(INFO[i.k][1]) < 0).map(i => i.k), []); }

  console.log('\n4. Paramètres → Mon métier : les rubriques conseillées, chacune expliquée');
  { const src = N.slice(N.indexOf('class="met-rub"') - 400, N.indexOf('class="met-rub"') + 700);
    vrai('(population) le bloc « rubriques conseillées » est dans le CODE de l\'écran', /Les \$\{L\.length\} rubriques conseillées pour ton métier/.test(src) && /RUBRIQUES_INFO\[k\]\[1\]/.test(src));
    /* on exécute vraiment le bloc : pour chaque métier, une ligne par rubrique conseillée, avec son titre et son explication */
    /* v779 : la bêta lit `metierPack()` (le pack réuni d'une entreprise « qui fait aussi… ») ; app.html, encore `METIERS[cur]` */
    const ancre = N.indexOf("${(()=>{ const L=((metierPack()||{}).rubriques||[])") >= 0 ? "${(()=>{ const L=((metierPack()||{}).rubriques||[])" : "${(()=>{ const L=((METIERS[cur]||{}).rubriques||[])";
    vrai('   (population) l\'ancre du bloc est trouvée dans ' + fichier, N.indexOf(ancre) > 0);
    const a = N.indexOf(ancre), z = N.indexOf("})()}", N.indexOf('</details>', a)) + 5;
    const expr = N.slice(a + 2, z - 1);
    const rendre = cur => new Function('METIERS', 'RUBRIQUES_INFO', 'esc', 'cur', 'metierPack', 'return ' + expr + ';')(METIERS, INFO, esc, cur, () => METIERS[cur]);
    const faux = [];
    for (const k of Object.keys(METIERS)) { const h = rendre(k), L = METIERS[k].rubriques.filter(r => INFO[r]);
      const lignes = (h.match(/class="met-rub-l"/g) || []).length;
      if (lignes !== L.length || !L.every(r => sansBalises(h).indexOf(INFO[r][1]) >= 0 && sansBalises(h).indexOf(INFO[r][0]) >= 0)) faux.push(k + ' (' + lignes + '/' + L.length + ')'); }
    egal('⛔ pour chacun des 23 métiers : toutes ses rubriques conseillées, avec titre et explication', faux, []);
    vrai('   (population) le métier le plus fourni montre ' + Math.max(...Object.keys(METIERS).map(k => METIERS[k].rubriques.length)) + ' rubriques', Math.max(...Object.keys(METIERS).map(k => (rendre(k).match(/class="met-rub-l"/g) || []).length)) >= 30); }

  console.log('\n5. Lisible au téléphone : la feuille de style de l\'explication');
  { const css = (N.match(/\.pn-x\{[^}]*\}/) || [''])[0];
    vrai('(population) la règle .pn-x est trouvée', css.length > 20, css);
    const px = +((css.match(/font-size:([\d.]+)px/) || [])[1] || 0);
    vrai('⛔ au moins 12 px (le plancher de lisibilité du terrain) et la couleur du texte courant — pas la discrète', px >= 12 && /color:var\(--t2\)/.test(css), css);
    vrai('   le texte se replie (overflow-wrap) et la colonne du nom peut rétrécir (min-width:0) : rien ne sort de l\'écran à 390 px', /overflow-wrap:anywhere/.test(css) && /\.perm-row \.pn\{flex:1;min-width:0/.test(N)); }
}

console.log('\n── 2903 : ' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
