/* test-3291 — LES LONGUES LISTES S'AFFICHENT PAR PAGES (nuit du 5 novembre 2026, chantier performance).
   Mesuré processeur ×4 sur une base de 3,5 Mo (2 500 interventions, 800 clients, 500 factures, 300 devis) : Factures 3,0 s,
   Clients 1,24 s, Devis 1,28 s, Interventions en liste 7,0 s — chaque ligne coûte du JavaScript, 6 à 19 éléments à styler et à
   mettre en page, puis le remplacement des émojis par des icônes. On pose 60 lignes, un bouton ajoute les suivantes.
   ⛔ Ce qu'on ne doit JAMAIS perdre de vue : le total est dit dans le bouton, les totaux se calculent sur TOUT, la recherche et
   les filtres s'appliquent AVANT la coupe, une vraie navigation remet la page à 60, et en liste d'interventions on ne coupe que
   l'HISTORIQUE (terminées, annulées) — une intervention à faire ne se cache jamais derrière « Afficher la suite ».
   Ce banc EXÉCUTE les vraies fonctions de page (`listeLim`, `listePlus`, `listeSuite`, `renderClientsList`) et lit le CODE (commentaires
   retirés) des trois autres écrans ; le rendu complet au navigateur est une sonde : scratchpad/sonde-listes.js. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1. la population ──');
const AIDE = [ligne('const LISTE_PAGE='), ligne('let _listeLim='), bloc('function listeLim('), bloc('function listePlus('), bloc('function listeSuite(')];
vrai('l\'aide est trouvée (sinon la tranche est vide et tout passerait)', AIDE.every(x => x.length > 20), AIDE.map(x => x.length));
v('⛔ une seule définition de chaque fonction d\'aide', ['function listeLim(', 'function listePlus(', 'function listeSuite('].map(f => SRC.split(f).length - 1), [1, 1, 1]);
const RCL = bloc('function renderClientsList(');
vrai('renderClientsList est trouvée', RCL.length > 500, RCL.length);

console.log('\n── 2. l\'aide, exécutée ──');
function aide() {
  const ctx = { console, Math, JSON, __rend: 0 };
  vm.createContext(ctx);
  vm.runInContext(AIDE.join('\n') + '\nthis.listeLim=listeLim; this.listePlus=listePlus; this.listeSuite=listeSuite; this.reset=()=>{ _listeLim={}; }; this.LISTE_PAGE=LISTE_PAGE; this.LISTE_PAS=LISTE_PAS; this.lim=()=>_listeLim;', ctx);
  return ctx;
}
{ const A = aide();
  v('une page fait 60 lignes', [A.LISTE_PAGE, A.listeLim('x')], [60, 60]);
  v('une liste qui tient dans la page n\'a pas de bouton (rien ne change d\'un pixel)', [A.listeSuite('x', 60, 60, () => 0), A.listeSuite('x', 12, 12, () => 0)], ['', '']);
  const b = A.listeSuite('x', 500, 60, () => A.__rend++);
  vrai('au-delà, un vrai bouton, qui dit le reste', /<button type="button" class="btn ghost" onclick="listePlus\('x'\)">Afficher 100 de plus <span[^>]*>\(440 restants\)<\/span><\/button>/.test(b), b);
  vrai('le dernier lot dit le nombre qui reste, pas 100', />Afficher 40 de plus /.test(A.listeSuite('z', 500, 460, () => 0)));
  vrai('un seul restant s\'accorde au singulier', /\(1 restant\)/.test(A.listeSuite('z', 61, 60, () => 0)));
  A.listePlus('x'); A.listePlus('x');
  v('chaque clic ajoute 100, par liste', [A.listeLim('x'), A.listeLim('y')], [260, 60]);
  v('et rend la liste (la fonction donnée au bouton est rappelée)', A.__rend, 2);
  A.reset(); v('une vraie navigation remet tout à 60', [A.listeLim('x'), Object.keys(A.lim()).length], [60, 0]); }

console.log('\n── 3. la liste des clients, la VRAIE fonction ──');
function mondeClients(n, nInt) {
  const clients = Array.from({ length: n }, (_, i) => ({ id: 'c' + i, nom: 'Client ' + String(i).padStart(4, '0'), ville: 'Toulouse', tel: '0511' + i, typeClient: 'pro' }));
  const interventions = Array.from({ length: nInt }, (_, i) => ({ id: 'i' + i, clientId: 'c' + (i % Math.max(1, Math.floor(n / 2))) }));
  const el = { innerHTML: '' };
  const ctx = { console, Math, JSON, Intl, Map, Set, Array, String, Object, RegExp, db: { clients, interventions }, cliTagFilter: '', cliTypeF: 'tous', cliSearch: '',
    $: id => id === 'cli-liste' ? el : null, visibleClients: l => l, cliIsPro: c => (c.typeClient || 'pro') !== 'particulier', tagChipsHtml: () => '',
    emptyState: () => '<empty>', views: { clients: () => {} }, __el: el };
  vm.createContext(ctx);
  const src = [ligne('const norm ='), ligne('const esc ='), ligne('const initials ='), AIDE.join('\n'), RCL].join('\n');
  vm.runInContext(src + '\nthis.renderClientsList=renderClientsList; this.listePlus=listePlus; this.cliSet=(a,b)=>{ cliSearch=a; };', ctx);
  return ctx;
}
{ const M = mondeClients(500, 900);
  M.renderClientsList();
  const rangs = h => (h.match(/class="tf-rangee"/g) || []).length;
  v('500 clients : 60 rangées dessinées, pas 500', rangs(M.__el.innerHTML), 60);
  vrai('le bouton dit les 440 restants', /Afficher 100 de plus[\s\S]*\(440 restants\)/.test(M.__el.innerHTML));
  vrai('la liste reste triée par nom : le premier est « Client 0000 »', M.__el.innerHTML.indexOf('Client 0000') < M.__el.innerHTML.indexOf('Client 0059'));
  vrai('le 61e n\'est pas encore là', M.__el.innerHTML.indexOf('Client 0060') < 0);
  /* le nombre d'interventions de chaque fiche est celui d'avant (un filtre par client) : c = 'c3' porte i3, i253, i503, i753 → 4 */
  const n3 = (M.__el.innerHTML.match(/Client 0003[\s\S]*?tf-fin">(\d+) int\./) || [])[1];
  v('« n int. » d\'une fiche = le décompte naïf de la base', +n3, 900 > 3 ? [3, 253, 503, 753].filter(x => x < 900).length : 0);
  M.listePlus('cli');
  v('un clic : 160 rangées, la fonction a redessiné', rangs(M.__el.innerHTML), 160);
  M.listePlus('cli'); M.listePlus('cli'); M.listePlus('cli');
  v('quatre clics en tout : 460 rangées, le bouton reste (il en manque 40)', [rangs(M.__el.innerHTML), /liste-suite/.test(M.__el.innerHTML), /Afficher 40 de plus/.test(M.__el.innerHTML)], [460, true, true]);
  M.listePlus('cli'); v('un cinquième : les 500 d\'un coup, plus de bouton', [rangs(M.__el.innerHTML), /liste-suite/.test(M.__el.innerHTML)], [500, false]);
  const P = mondeClients(40, 10); P.renderClientsList();
  v('40 clients : 40 rangées et aucun bouton (inchangé)', [(P.__el.innerHTML.match(/class="tf-rangee"/g) || []).length, /liste-suite/.test(P.__el.innerHTML)], [40, false]);
  /* la recherche s'applique AVANT la coupe : retrouver le client 0499 parmi 500 sans rien afficher de plus */
  const S = mondeClients(500, 0); S.cliSet('Client 0499'); S.renderClientsList();
  vrai('chercher « Client 0499 » le trouve, sans « Afficher la suite »', /Client 0499/.test(S.__el.innerHTML) && !/liste-suite/.test(S.__el.innerHTML)); }

console.log('\n── 4. les trois autres écrans (le code, commentaires retirés) ──');
const DL = bloc('function docListView(');
vrai('docListView est trouvée', DL.length > 800, DL.length);
vrai('devis & co : la liste est coupée AVANT de dessiner les lignes', /limL=listeLim\(cleL\), vus=list\.slice\(0,limL\)/.test(DL) && /const rows=vus\.map\(/.test(DL));
vrai('devis & co : le bouton suit le tableau, sur le total de la liste', /tableCard\(\[[^\]]*\],rows\)\+listeSuite\(cleL,list\.length,vus\.length,\(\)=>docListView\(kind,xyloOnly\)\)/.test(DL));
vrai('devis & co : les totaux de l\'en-tête restent sur TOUTE la liste', /const total=list\.reduce\(/.test(DL) && /\$\{list\.length\} \$\{cfg\.un\}/.test(DL));
const FA = SRC.slice(SRC.indexOf('views.factures=function(){'), SRC.indexOf('/* ═══════════════ FINANCE : Comptabilité & Télécollecte'));
vrai('factures : l\'écran est trouvé', FA.length > 3000, FA.length);
vrai('factures : seules 60 lignes sont dessinées, le bouton dit le reste', /list\.slice\(0,listeLim\('fact'\)\)\.map\(row\)\.join\(''\)\+listeSuite\('fact',list\.length,Math\.min\(list\.length,listeLim\('fact'\)\),\(\)=>views\.factures\(\)\)/.test(FA));
vrai('factures : les chiffres (facturé, encaissé, à encaisser, en retard) se calculent sur TOUT', /const totFact=emis\.reduce/.test(FA) && /const totPaid=all\.filter/.test(FA) && /const totDue=dueList\.reduce/.test(FA) && /totLate=lateList\.reduce/.test(FA));
vrai('factures : le titre de la carte dit le total de la catégorie, pas le nombre dessiné', /\(\$\{list\.length\}\)<\/h3>/.test(FA));
const IV = SRC.slice(SRC.indexOf('views.interventions=function(){'), SRC.indexOf('// Vue semaine'));
vrai('interventions : la liste est trouvée', IV.length > 3000, IV.length);
vrai('interventions : on ne coupe QUE l\'historique (terminées, annulées)', /list=list\.filter\(i=>\(i\.statut!=='terminee'&&i\.statut!=='annulee'\)\|\|\(_nHist\+\+\)<_limI\)/.test(IV));
vrai('interventions : la coupe vient APRÈS la recherche, les filtres et le tri', IV.indexOf('const _totL=list.length') > IV.indexOf("if(intPeriod==='jour')") && IV.indexOf('const _totL=list.length') > IV.indexOf('list.sort('));
vrai('interventions : la coupe vient AVANT le regroupement par jour ou par statut', IV.indexOf('const _totL=list.length') < IV.indexOf('const groups={}'));
vrai('interventions : le bouton suit la liste, sur le total d\'avant la coupe', /<div class="int-liste">\$\{body\}<\/div>\$\{listeSuite\('int',_totL,list\.length,\(\)=>views\.interventions\(\)\)\}/.test(IV));
vrai('interventions : les pastilles de comptage (Toutes, À venir…) restent calculées sur TOUT', /histCounts\[k\]= k==='supprimees'\?[\s\S]*?SRC\.filter\(HIST_TESTS\[k\]\)\.length/.test(IV));

console.log('\n── 5. une vraie navigation remet à 60 ──');
const RV = bloc('function rendreVueSure(');
vrai('rendreVueSure est trouvée', RV.length > 300, RV.length);
vrai('`remonter` (vraie navigation) remet les listes à leur première page, AVANT d\'écrire la vue', /if\(remonter\) _listeLim=\{\};/.test(RV) && RV.indexOf('_listeLim={}') < RV.indexOf('views[view]()'));
vrai('seul `remonter` la remet à 60 : un rafraîchissement automatique ne ferme pas la liste sous les doigts', (RV.match(/_listeLim=\{\}/g) || []).length === 1 && /if\(remonter\) _listeLim=\{\};/.test(RV));

console.log('\n════ test-3291 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
