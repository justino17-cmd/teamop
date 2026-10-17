/* ══ g14 · MENU ET NOTIFICATIONS DE LA BÊTA, FAVORIS, VISITE GUIDÉE ═══════════════════════════════════
   accueil#1 — Sur beta.html, Ctrl/⌘+clic (ou clic molette) sur une rubrique du menu ou d'un favori ouvrait
     app.html : la PRODUCTION, qui partage l'origine teamop.fr. Les notifications push de la bêta pointaient
     elles aussi vers /app.html. Une page de test ne doit jamais renvoyer l'équipe vers la production.
   accueil#3 — favorisBloc() rendait '' sans favori hors édition, et le SEUL bouton « Modifier » vit dans ce
     bloc : aucun moyen d'épingler un premier favori (ni bouton, ni étoile, ni texte d'aide).
   accueil#16 — la visite guidée annonçait « Menu : parametres » : Paramètres n'est pas dans NAV.
   Ce banc EXÉCUTE les vraies fonctions d'app.html (pushNotify, pushTest, favorisBloc, renderNav, menuLabel)
   avec BETA_ESSAI vrai ET faux : la production reste byte-identique en comportement.               */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1210 · 0. la population ──');
const PU = bloc('function pushUrl('), PN = bloc('function pushNotify('), PT = bloc('async function pushTest('), FB = bloc('function favorisBloc('), RN = bloc('function renderNav('),
  FE = bloc('function favorisEtoile('), ML = bloc('function menuLabel('), MH = ligne('const MENU_HORS_NAV'), PAGE = ligne('const PAGE_APP');
vrai('les fonctions sont trouvées', PN.length > 100 && PT.length > 100 && FB.length > 300 && RN.length > 1500 && FE.length > 100 && ML.length > 50, [PN.length, PT.length, FB.length, RN.length, FE.length, ML.length]);
vrai('⛔ une seule définition de chacune', ['function pushNotify(', 'function favorisBloc(', 'function renderNav(', 'function menuLabel('].every(n => SRC.split(n).length === 2));
vrai('la page courante est UNE constante (PAGE_APP) déclarée une fois', PAGE.length > 10 && SRC.split('const PAGE_APP').length === 2, PAGE);

function monde(beta, favoris, edit) {
  const posts = [];
  const nav = { innerHTML: '', querySelectorAll: () => [], insertAdjacentHTML() {} };
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, __posts: posts, __nav: nav, __toasts: [],
    BETA_ESSAI: beta, PUSH_API: 'https://api.x', currentUser: { id: 'u1', role: 'admin' }, current: 'dashboard',
    NAV: [{ g: 'Suivi', items: [{ k: 'statistiques', ic: '📊', l: 'Statistiques' }, { k: 'historique', ic: '🕘', l: 'Historique' }] }],
    $: id => id === 'nav' ? nav : null,
    document: { querySelectorAll: () => [] } };
  vm.createContext(ctx);
  vm.runInContext(`
    var _favEdit=${!!edit};
    function syncTeam(){ return 'eq'; }
    function toast(m){ __toasts.push(String(m)); }
    function fetch(u,o){ __posts.push({u:u,b:JSON.parse(o.body)}); return Promise.resolve({json:()=>({sent:1})}); }
    async function pushSubscribe(){ return true; }
    function applyBrand(){} function accesSuspendu(){ return false; } function canSee(){ return true; }
    function userSeesModule(){ return true; } function t(s){ return s; } function multiEnCours(){ return false; }
    function catVars(){ return ''; } function refreshBadges(){} function navGlisseInit(){} function renderOnglets(){}
    function favorisLire(){ return ${JSON.stringify(favoris || [])}; }
    function ongletItem(k){ return NAV.flatMap(s=>s.items).find(x=>x.k===k)||null; }
    function avecSousCats(i){ return i; }
    const esc = s => (s ?? '').toString().replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    ${PAGE}
    ${PU}\n${PN}\n${PT}\n${FE}\n${FB}\n${RN}\n${MH}\n${ML}`, ctx);
  return ctx;
}
const page = b => b ? 'beta.html' : 'app.html';
(async () => {
  for (const beta of [true, false]) {
    console.log('\n── 1210 · accueil#1 · ' + (beta ? 'BÊTA' : 'PRODUCTION') + ' ──');
    const W = monde(beta, ['statistiques']);
    W.renderNav();
    const html = W.__nav.innerHTML;
    const ouvre = [...html.matchAll(/window\.open\('([^']*)'/g)].map(m => m[1]);
    vrai('le menu et le favori ouvrent des fenêtres (population non vide)', ouvre.length >= 3, ouvre);
    vrai('chaque fenêtre ouverte (Ctrl/⌘+clic, clic molette, favori) vise ' + page(beta), ouvre.length > 0 && ouvre.every(u => u.startsWith(page(beta) + '#v=')), ouvre);
    if (beta) vrai('⛔ aucune ne vise la production', !ouvre.some(u => u.startsWith('app.html')), ouvre);
    W.pushNotify('T', 'B', '/app.html#v=boxes', ['u2']);
    W.pushNotify('T', 'B');
    W.pushNotify('T', 'B', 'https://exemple.test/x');
    W.pushNotify('T', 'B', '/beta.html#v=x');
    const u = W.__posts.map(p => p.b.url);
    vrai('pushNotify : l\'adresse transmise suit la page (avec son fragment)', u[0] === '/' + page(beta) + '#v=boxes', u[0]);
    vrai('pushNotify sans adresse : la page courante', u[1] === '/' + page(beta), u[1]);
    vrai('pushNotify garde les destinataires', JSON.stringify(W.__posts[0].b.userIds) === '["u2"]');
    vrai('une adresse qui n\'est pas celle d\'une page de l\'application reste telle quelle', u[2] === 'https://exemple.test/x', u[2]);
    vrai('beta.html#… suit la page courante aussi', u[3] === '/' + page(beta) + '#v=x', u[3]);
    const T = monde(beta, []); await T.pushTest();
    vrai('pushTest : la notification de test mène à ' + page(beta), T.__posts.length === 1 && T.__posts[0].b.url === '/' + page(beta), T.__posts.map(p => p.b.url));
  }

  console.log('\n── 1210 · accueil#3 · favoris sans favori ──');
  for (const edit of [false, true]) {
    const W = monde(false, [], edit); const h = W.favorisBloc();
    vrai('sans favori' + (edit ? ' (en édition)' : '') + ' : le bouton ' + (edit ? '« Terminé »' : '« Modifier »') + ' existe', h.includes('favorisEditer()') && h.includes(edit ? 'Terminé' : 'Modifier'), h.slice(0, 200));
    vrai('sans favori' + (edit ? ' (en édition)' : '') + ' : le texte d\'aide est là', /nav-fav-vide/.test(h) && /étoile/.test(h), h.slice(0, 300));
  }
  { const W = monde(false, [], false); W.renderNav();
    vrai('le menu rendu porte le bouton « Modifier » (compte neuf, aucun favori)', /class="nav-fav-edit"[^>]*>Modifier</.test(W.__nav.innerHTML)); }
  { const W = monde(false, ['statistiques'], false); const h = W.favorisBloc();
    vrai('avec un favori : le bouton et la ligne sont là, pas d\'aide en trop', h.includes('Modifier') && h.includes('data-fav="1"') && !/nav-fav-vide/.test(h)); }

  console.log('\n── 1210 · accueil#16 · visite guidée ──');
  { const W = monde(false, []);
    vrai('menuLabel d\'une rubrique du menu', W.menuLabel('statistiques') === 'Statistiques', W.menuLabel('statistiques'));
    vrai('menuLabel(parametres) : « Paramètres », jamais la clé brute', W.menuLabel('parametres') === 'Paramètres', W.menuLabel('parametres'));
    vrai('une clé inconnue reste inchangée (pas de masquage)', W.menuLabel('inconnue') === 'inconnue'); }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
