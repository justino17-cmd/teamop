/* ⛔ CE QUE CE FICHIER GARDE — « TESTER L'APPLICATION » : la démonstration publique lit ce que le visiteur a coché sur le site.
   Justin : « ils ont aussi les cases qu'ils n'ont pas sélectionnées, et ça met : vous n'avez pas sélectionné cette case, mais vous pouvez la visualiser ».
   Le contrat d'adresse (fixé avec la page de commande) : demo.html?metier=<id>&variante=<deux|chauffage|climatisation>&cats=<clés de NAV, séparées par des virgules>.
     1. L'ADRESSE EST LUE SANS RIEN EN CROIRE : liste FERMÉE (seules les clés de NAV comptent — celles de la VRAIE application), longueur bornée, variante de la liste ;
     2. LE CHOIX SE RANGE dans elanD_demo_etat (jamais dans db, jamais dans la clé `cats` de l'application, qui FERMERAIT les rubriques) et survit à « Recommencer » ;
     3. RIEN NE SE FERME : une rubrique non cochée affiche un bandeau, elle ne se verrouille pas ; sans `cats` dans l'adresse, AUCUN bandeau ;
     4. LE BANDEAU suit l'écran (le parent d'une sous-rubrique, comme catBloque), se repose après une réécriture de #content, et « L'ajouter » ne fait AUCUN envoi réseau :
        un message vers https://teamop.fr seulement, sinon un lien vers creer.html.
   Les fonctions sont les VRAIES (extraites de demo.html, générée) ; le rendu réel est mesuré au navigateur (scratchpad/sonde-demo-cats.js). */
'use strict';
const fs = require('fs'), path = require('path');
const { RACINE, nu, litteral, evalue, bac } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const APP = nu(lire('app.html')), DEMO = lire('demo.html'), MODULE = lire('scripts/demo/demo-publique.js');

const NAV = evalue(litteral(APP, 'const NAV = ['));
const TOUJOURS = evalue(litteral(APP, 'const CATS_TOUJOURS=['));
const CONNUES = NAV.flatMap(s => s.items).map(i => i.k).filter(k => TOUJOURS.indexOf(k) < 0);
/* la table des parents, recomposée comme l'application la fabrique (SOUS_CATS, FUSIONS, assistantDevis) sur les VRAIS littéraux */
const VUE_PARENT = Object.fromEntries(evalue(litteral(APP, 'const SOUS_CATS=[')).map(x => [x.k, x.parent])
  .concat(Object.entries(evalue(litteral(APP, 'const FUSIONS={'))).flatMap(([p, L]) => L.filter(([k]) => k !== p).map(([k]) => [k, p]))).concat([['assistantDevis', 'devis']]));

console.log('\n1. L\'adresse, lue sans rien en croire');
vrai('(population) la VRAIE liste de NAV : plus de 30 rubriques connues, planning et factures dedans, le tableau de bord dehors', CONNUES.length > 30 && CONNUES.includes('planning') && CONNUES.includes('factures') && !CONNUES.includes('dashboard'), CONNUES.length);
const outils = bac('demo.html', ['demoPubliqueAdresse', 'demoPubliquePack', 'demoPubliqueCatsConnues', 'demoPubliqueNonChoisie'],
  { DEMO_VARIANTES: ['deux', 'chauffage', 'climatisation'], DEMO_CATS_MAX: 60, catsConnues: () => CONNUES.slice(), VUE_PARENT, _demoSel: null });
const A = (s) => outils.fn.demoPubliqueAdresse(s, CONNUES);
let r = A('?metier=plomberie&variante=deux&cats=planning,factures,clients');
egal('métier, variante et rubriques lus', [r.metier, r.variante, r.cats], ['plomberie', 'deux', ['planning', 'factures', 'clients']]);
r = A('?metier=plomberie');
egal('⛔ SANS cats dans l\'adresse (le lien « Essayer la démo plombier ») : cats vaut null — aucun bandeau', [r.metier, r.variante, r.cats], ['plomberie', '', null]);
r = A('?metier=plomberie&cats=planning,__proto__,<img src=x>,inconnue,planning,../x,factures');
egal('une clé inconnue est ignorée (liste fermée), un doublon aussi, du balisage ne passe pas', r.cats, ['planning', 'factures']);
r = A('?metier=plomberie&cats=inconnue,autre');
egal('rien de connu : comme si cats était absent (null)', r.cats, null);
r = A('?metier=plomberie&cats=' + encodeURIComponent('planning, factures ,clients'));
egal('une adresse encodée (virgules %2C, espaces) se lit', r.cats, ['planning', 'factures', 'clients']);
r = A('?metier=plomberie&cats=%E0%A4%A');
egal('un encodage cassé ne jette pas : cats null', r.cats, null);
const longue = CONNUES.join(',') + ',' + 'x'.repeat(5000);
r = A('?metier=plomberie&cats=' + longue);
vrai('longueur BORNÉE : 800 caractères lus au plus, soixante clés au plus', r.cats && r.cats.length <= 60 && r.cats.length > 5, r.cats && r.cats.length);
{
  const synth = Array.from({ length: 100 }, (_, i) => 'k' + i);
  r = outils.fn.demoPubliqueAdresse('?metier=plomberie&cats=' + synth.join(','), synth);
  egal('(population : 100 clés connues et fournies) au plus soixante retenues', r.cats && r.cats.length, 60);
  r = A('?metier=plomberie&cats=' + 'x,'.repeat(450) + 'planning');
  egal('une clé écrite au-delà des 800 premiers caractères n\'est pas lue', r.cats, null);
}
r = A('?metier=plomberie&variante=<script>');
egal('une variante hors liste est ignorée', r.variante, '');
r = A('?metier=Plomberie%20x&cats=planning');
egal('un métier mal formé n\'est pas lu', r.metier, '');
r = A('?cats=planning&metier=chauffage&variante=climatisation');
egal('l\'ordre des paramètres ne compte pas', [r.metier, r.variante, r.cats], ['chauffage', 'climatisation', ['planning']]);

console.log('\n2. La variante chauffage / climatisation');
const P = (m, v) => outils.fn.demoPubliquePack(m, v);
egal('chauffage + « deux » : le chauffage et, en complément, la climatisation', P('chauffage', 'deux'), { metier: 'chauffage', plus: 'climatisation', variante: 'deux' });
egal('chauffage + « chauffage » : le chauffage seul', P('chauffage', 'chauffage'), { metier: 'chauffage', plus: '', variante: 'chauffage' });
egal('chauffage + « climatisation » : le métier climatisation', P('chauffage', 'climatisation'), { metier: 'climatisation', plus: '', variante: 'climatisation' });
egal('le nom du pack combiné de l\'application (cvc) vaut « deux »', P('cvc', ''), { metier: 'chauffage', plus: 'climatisation', variante: 'deux' });
egal('pour tout autre métier la variante ne dit rien', P('plomberie', 'deux'), { metier: 'plomberie', plus: '', variante: '' });
{
  const pc = evalue(litteral(APP, 'const METIERS_COMBOS=['));
  vrai('(l\'application sait ce pack) METIERS_COMBOS porte « cvc » = chauffage + climatisation, et METIERS connaît les deux', JSON.stringify(pc.find(c => c.k === 'cvc').liste) === '["chauffage","climatisation"]' && /\n  'chauffage':\{/.test(APP) && /\n  'climatisation':\{/.test(APP));
}

console.log('\n3. Le métier de l\'application : le complément est posé avant les types et les catégories');
{
  const sem = nu(MODULE).slice(nu(MODULE).indexOf('function demoPubliqueSemer'));
  const i1 = sem.indexOf('db.metierPlus ='), i2 = sem.indexOf('intTypes()'), i3 = sem.indexOf('categoriesProduit()');
  vrai('db.metierPlus est posé AVANT intTypes() et categoriesProduit() (sinon l\'exemple ignore la climatisation)', i1 > 0 && i1 < i2 && i1 < i3, [i1, i2, i3]);
  vrai('l\'exemple retient son complément (db.demoPublique.plus) : changer de variante resème', /db\.demoPublique = \{ metier: id, plus:/.test(sem));
}

console.log('\n4. La rubrique non cochée : laquelle, et jamais le reste');
const nc = (sel, vue) => { outils.scope._demoSel = sel; return outils.fn.demoPubliqueNonChoisie(vue); };
egal('rubrique cochée : rien', nc({ cats: ['planning', 'factures'] }, 'planning'), '');
egal('rubrique non cochée : sa clé', nc({ cats: ['planning', 'factures'] }, 'stock'), 'stock');
egal('⛔ sans choix du site (null) : AUCUN bandeau, même sur une rubrique quelconque', nc(null, 'stock'), '');
egal('liste vide : aucun bandeau', nc({ cats: [] }, 'stock'), '');
egal('le tableau de bord et les réglages ne sont jamais « non choisis » (CATS_TOUJOURS)', ['dashboard', 'parametres', 'utilisateurs'].map(k => nc({ cats: ['planning'] }, k)), ['', '', '']);
{
  const sous = Object.keys(VUE_PARENT).find(k => CONNUES.includes(VUE_PARENT[k]) && VUE_PARENT[k] !== 'planning');
  vrai('(population) une sous-rubrique existe : ' + sous, !!sous);
  egal('une sous-rubrique suit son PARENT : parent coché, rien ; parent non coché, la clé du parent', [nc({ cats: [VUE_PARENT[sous]] }, sous), nc({ cats: ['planning'] }, sous)], ['', VUE_PARENT[sous]]);
}

console.log('\n5. Le bandeau, posé là où l\'écran s\'écrit vraiment');
function El(tag) {
  const e = { tag, id: '', className: '', innerHTML: '', kids: [], parentNode: null, attrs: {} };
  e.setAttribute = (k, v) => { e.attrs[k] = v; }; e.getAttribute = k => (k in e.attrs ? e.attrs[k] : null);
  Object.defineProperty(e, 'firstElementChild', { get: () => e.kids[0] || null });
  Object.defineProperty(e, 'previousElementSibling', { get: () => { const i = e.parentNode ? e.parentNode.kids.indexOf(e) : -1; return i > 0 ? e.parentNode.kids[i - 1] : null; } });
  Object.defineProperty(e, 'nextSibling', { get: () => { const i = e.parentNode ? e.parentNode.kids.indexOf(e) : -1; return i >= 0 ? e.parentNode.kids[i + 1] || null : null; } });
  e.insertBefore = (n, ref) => { if (n.parentNode) n.parentNode.removeChild(n); const i = ref ? e.kids.indexOf(ref) : e.kids.length; e.kids.splice(i < 0 ? e.kids.length : i, 0, n); n.parentNode = e; return n; };
  e.removeChild = n => { e.kids.splice(e.kids.indexOf(n), 1); n.parentNode = null; return n; };
  return e;
}
function page(sel, vue) {
  const content = El('div'); content.id = 'content';
  const doc = { getElementById: id => (id === 'content' ? content : (function f(x) { for (const k of x.kids) { if (k.id === id) return k; const r = f(k); if (r) return r; } return null; })(content)), createElement: El };
  const b = bac('demo.html', ['demoPubliqueBandeau', 'demoPubliqueNonChoisie', 'demoPubliqueCatsConnues'], { document: doc, currentUser: { id: 1 }, current: vue, catsConnues: () => CONNUES.slice(), VUE_PARENT, _demoSel: sel });
  return { content, b, ids: () => content.kids.map(k => k.id) };
}
{
  let p = page({ cats: ['planning', 'factures'] }, 'stock'); p.b.fn.demoPubliqueBandeau();
  egal('rubrique non cochée : le bandeau de la démonstration, puis celui de la rubrique (dessous)', p.ids(), ['demo-bandeau', 'demo-nonchoisie']);
  const m = p.content.kids[1];
  vrai('⛔ la phrase de Justin, et le geste « L\'ajouter à ma demande » qui porte la clé de la rubrique', /Vous n’avez pas sélectionné cette rubrique — vous pouvez la visualiser ici\./.test(m.innerHTML) && /L’ajouter à ma demande/.test(m.innerHTML) && /demoPubliqueAjouter\('stock'\)/.test(m.innerHTML), m.innerHTML);
  p.b.fn.demoPubliqueBandeau();
  egal('rejoué (l\'observateur repose le bandeau) : toujours un seul de chaque', p.ids(), ['demo-bandeau', 'demo-nonchoisie']);
  p.content.kids.length = 0;
  p.b.fn.demoPubliqueBandeau();
  egal('#content réécrit (tout est emporté) : les deux reviennent', p.ids(), ['demo-bandeau', 'demo-nonchoisie']);
  p = page({ cats: ['planning', 'factures'] }, 'planning'); p.b.fn.demoPubliqueBandeau();
  egal('rubrique COCHÉE : seul le bandeau de la démonstration — rien de spécial', p.ids(), ['demo-bandeau']);
  p = page(null, 'stock'); p.b.fn.demoPubliqueBandeau();
  egal('⛔ sans choix du site (lien « Essayer la démo plombier ») : AUCUN bandeau de rubrique', p.ids(), ['demo-bandeau']);
  p = page({ cats: ['planning'] }, 'stock'); p.b.fn.demoPubliqueBandeau();
  p.b.scope.current = 'planning'; p.b.fn.demoPubliqueBandeau();
  egal('on passe à une rubrique cochée sans réécriture de #content : le bandeau de rubrique s\'en va', p.ids(), ['demo-bandeau']);
}

console.log('\n6. « L\'ajouter à ma demande » : aucun envoi réseau');
{
  const mk = (opener) => { const j = { msgs: [], href: null, toasts: [], focus: 0 }; const loc = { set href(u) { j.href = u; }, get href() { return ''; } };
    const b = bac('demo.html', ['demoPubliqueAjouter', 'demoPubliqueCatsConnues'], { window: { opener: opener ? { closed: false, postMessage: (m, o) => j.msgs.push([m, o]), focus: () => j.focus++ } : null }, location: loc, toast: m => j.toasts.push(m), catsConnues: () => CONNUES.slice(), encodeURIComponent });
    return { b, j }; };
  let { b, j } = mk(true); b.fn.demoPubliqueAjouter('stock');
  vrai('avec un onglet d\'origine : UN message, vers https://teamop.fr seulement, avec la clé ; pas de navigation', j.msgs.length === 1 && j.msgs[0][1] === 'https://teamop.fr' && j.msgs[0][0].rubrique === 'stock' && j.msgs[0][0].type === 'teamop-demo' && j.href === null && j.focus === 1, j);
  ({ b, j } = mk(false)); b.fn.demoPubliqueAjouter('stock');
  egal('sans onglet d\'origine : un lien vers creer.html (la page du site), rien d\'autre', [j.msgs.length, j.href], [0, 'creer.html?ajouter=stock']);
  ({ b, j } = mk(true)); b.fn.demoPubliqueAjouter('<img>'); b.fn.demoPubliqueAjouter('inconnue');
  egal('une clé inconnue n\'envoie rien et ne navigue pas', [j.msgs.length, j.href], [0, null]);
}

console.log('\n7. Le branchement : l\'adresse, le rangement, le semis');
{
  const cas = (search, stocke, base) => {
    const j = { semer: [], ecrit: [], ouvrir: 0 };
    const b = bac('demo.html', ['demoPubliqueBoot', 'demoPubliqueNonPris', 'demoPubliqueAdresse', 'demoPubliquePack', 'demoPubliqueCatsConnues'], { window: { __demoPublique: { stockageIsole: true } }, document: { getElementById: () => ({ style: {}, innerHTML: '' }) },
      location: { search, pathname: '/demo.html' }, history: { replaceState: () => { j.replace = true; } }, confirm: () => { j.confirm = (j.confirm || 0) + 1; return true; }, DEMO_VARIANTES: ['deux', 'chauffage', 'climatisation'], DEMO_CATS_MAX: 60,
      catsConnues: () => CONNUES.slice(), demoPubliqueBouchons: () => { }, demoPubliqueStyle: () => { }, demoPubliqueChoixLire: () => (stocke && stocke.metier) || '', demoPubliqueEtatLire: () => stocke || {},
      demoPubliqueMetiers: () => ['plomberie', 'chauffage', 'electricite'], demoPubliqueChoix: () => { j.choix = true; }, demoPubliqueSemer: (id, plus) => j.semer.push([id, plus]), demoPubliqueOuvrir: () => { j.ouvrir++; },
      demoPubliqueChoixEcrire: (id, x) => j.ecrit.push([id, x]), db: base || {}, _demoSel: null });
    b.fn.demoPubliqueBoot(); j.sel = b.scope._demoSel; return j;
  };
  let j = cas('?metier=plomberie&cats=planning,factures');
  egal('métier + rubriques : semé pour le métier, choix rangé avec ses rubriques, la sélection est retenue', [j.semer, j.ecrit[0][0], j.ecrit[0][1].cats, j.sel], [[['plomberie', '']], 'plomberie', ['planning', 'factures'], { cats: ['planning', 'factures'] }]);
  j = cas('?metier=plomberie');
  egal('⛔ le lien « Essayer la démo plombier » (sans cats) : aucune sélection, aucun bandeau', [j.sel, j.ecrit[0][1].cats], [null, null]);
  j = cas('?metier=chauffage&variante=deux&cats=planning');
  egal('chauffage + « deux » : semé avec la climatisation en complément', [j.semer, j.ecrit[0][1].plus, j.ecrit[0][1].variante], [[['chauffage', 'climatisation']], 'climatisation', 'deux']);
  j = cas('?metier=chauffage&variante=climatisation&cats=planning');
  egal('chauffage + « climatisation » : le métier climatisation (fermé au choix libre, ouvert par l\'adresse)', j.semer, [['climatisation', '']]);
  j = cas('?metier=climatisation&cats=planning');
  vrai('la climatisation SANS la variante qui la demande reste fermée : on ouvre le choix du métier', j.choix === true && j.semer.length === 0, j);
  j = cas('', { metier: 'plomberie', cats: ['planning'] }, { demoPublique: { metier: 'plomberie' }, techniciens: [{}] });
  egal('retour sur demo.html sans adresse : le choix rangé revient (rubriques comprises), sans resemer', [j.semer, j.sel], [[], { cats: ['planning'] }]);
  j = cas('?metier=plomberie', { metier: 'plomberie', cats: ['planning'] }, { demoPublique: { metier: 'plomberie' }, techniciens: [{}] });
  egal('un nouveau lien du MÊME métier sans cats remplace les rubriques sans resemer ni demander', [j.semer, j.sel, j.confirm || 0], [[], null, 0]);
  j = cas('?metier=chauffage&variante=deux', { metier: 'chauffage', variante: 'chauffage' }, { demoPublique: { metier: 'chauffage', plus: '' }, techniciens: [{}] });
  egal('passer de « chauffage » à « chauffage + clim » change l\'exemple : on DEMANDE puis on resème', [j.confirm, j.semer], [1, [['chauffage', 'climatisation']]]);
}

console.log('\n8. Le rangement et le menu');
{
  {
    const rangee = (vue, coche) => { const el = { attrs: {}, getAttribute(k) { return k === 'data-view' ? vue : (this.attrs[k] === undefined ? null : this.attrs[k]); }, setAttribute(k, v) { this.attrs[k] = v; } };
      const ins = []; const leg = { l: null };
      const nav = { children: [], querySelectorAll: () => [el], querySelector: sel => (/demo-legende/.test(sel) ? leg.l : el), insertBefore: x => { leg.l = x; ins.push(x); } };
      const b = bac('demo.html', ['demoPubliqueMenu', 'demoPubliqueNonChoisie', 'demoPubliqueCatsConnues'], { document: { getElementById: () => nav, createElement: () => ({ className: '', innerHTML: '' }) }, catsConnues: () => CONNUES.slice(), VUE_PARENT, _demoSel: { cats: coche } });
      b.fn.demoPubliqueMenu(); b.fn.demoPubliqueMenu(); return Object.assign({ legendes: ins.length }, el.attrs); };
    egal('le menu : une rubrique NON cochée porte la marque et son infobulle', rangee('stock', ['planning']), { legendes: 1, 'data-nonchoisie': '1', title: 'Non choisie dans votre demande' });
    egal('le menu : une rubrique cochée n\'en porte aucune (la légende, elle, se pose UNE fois même rejouée)', rangee('planning', ['planning']), { legendes: 1 });
  }
  vrai('le complément est posé par la vraie expression de demoPubliqueSemer (plus valable, ≠ du métier, connu de METIERS)', /db\.metierPlus = \(plus && plus !== id && plus !== '3d' && METIERS\[plus\]\) \? plus : ''/.test(nu(MODULE)));
  const m = nu(MODULE);
  vrai('le choix vit dans le rangement de la démonstration (DEMO_ETAT_CLE, préfixe elanD_) — jamais la clé `cats` de l\'application, qui FERMERAIT les rubriques', /localStorage\.setItem\(DEMO_ETAT_CLE/.test(m) && !/_cats|catsCle|catsServeurAppliquer|catBloque/.test(m));
  vrai('aucune rubrique n\'est fermée par la démonstration : pas de go(\'dashboard\') ni de toast de refus dans le code des rubriques non choisies', !/demoPubliqueNonChoisie[^;]*go\(/.test(m));
  vrai('« Recommencer » relit le choix AVANT l\'effacement et le réécrit', /const etat = demoPubliqueEtatLire\(\);[^]*?demoPubliqueEffacer\(\);\s*if \(id\) demoPubliqueChoixEcrire\(id, etat\)/.test(m));
  vrai('la marque du menu est un attribut (data-nonchoisie) dont le rond pointillé vient du CSS (pas de mot dans la ligne : « Interventions 13 » débordait) — et une légende le dit', /\.nav-item\[data-nonchoisie\]::after\{content:"";[^}]*border-radius:50%/.test(m) && /demo-legende/.test(m) && /Rubrique non choisie dans votre demande/.test(m));
  vrai('le bandeau est reposé par l\'observateur de #content (après chaque écriture), pas depuis go()', /new MutationObserver\(function \(\) \{ _demoObs\.disconnect\(\); try \{ demoPubliqueBandeau\(\)/.test(m) && !/function go\(/.test(m));
  vrai('le pare-feu n\'est pas touché par ce chantier : aucun message ni lien nouveau n\'y est autorisé', !/postMessage|creer\.html/.test(lire('scripts/demo/pare-feu.js')));
  vrai('la page générée porte le tout (demo.html contient demoPubliqueAdresse et demoPubliqueAjouter)', /function demoPubliqueAdresse\(/.test(DEMO) && /function demoPubliqueAjouter\(/.test(DEMO));
}

console.log('\n9. La fenêtre « Ton entreprise — Bienvenue ! » ne s\'ouvre pas dans la démonstration');
{
  const joue = (fichier, demo) => { const ouv = []; const b = bac(fichier, ['entAccueilCheck'], { DEMO_PUBLIQUE: demo, BETA_ESSAI: false, currentUser: { role: 'admin' }, entPlusTardActif: () => false, syncEnabled: () => false,
    document: { querySelector: () => null }, docMentionsManquantes: () => ['le nom'], entCompleterModal: (...a) => ouv.push(a), setTimeout: () => 0 }); b.fn.entAccueilCheck(); return ouv.length; };
  egal('démonstration (vraie fonction de demo.html, DEMO_PUBLIQUE vrai) : aucune fenêtre', joue('demo.html', true), 0);
  egal('(contre-épreuve) la même fonction d\'app.html, hors démonstration, ouvre la fenêtre une fois', joue('app.html', false), 1);
  egal('(contre-épreuve) la bêta garde son comportement : le code de la fonction y est celui d\'app.html (garde absente)', [/entAccueilCheck\(n\)\{ n=n\|\|0; try\{ if\(DEMO_PUBLIQUE\)/.test(lire('app.html')), /entAccueilCheck\(n\)\{ n=n\|\|0; try\{ if\(DEMO_PUBLIQUE\)/.test(lire('beta.html'))], [false, false]);
}

{ // les gestes du bandeau se touchent au doigt (44 px), au téléphone comme au bureau — test de A à Z du 30 octobre 2026 : 38 et 32 px
  const hauteurs = [...MODULE.matchAll(/\.demo-bandeau button\{[^}]*min-height:(\d+)px/g)].map(m => +m[1]);
  vrai('(population) les règles de taille des boutons du bandeau sont trouvées (bureau + téléphone)', hauteurs.length >= 2, hauteurs);
  vrai('⛔ chaque bouton du bandeau mesure au moins 44 px de haut', hauteurs.length >= 2 && hauteurs.every(h => h >= 44), hauteurs);
}

console.log('\n════ test-3211 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
