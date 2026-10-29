/* ══ test-2940 · LA DÉMONSTRATION PUBLIQUE — LE VRAI demo-build.js SUR LE VRAI app.html, ET LE VRAI SEMIS POUR CHAQUE MÉTIER ═════════════════════
   23 octobre 2026 (Justin : « sur le site il faudrait faire un système de simulation des applications, qu'ils puissent tester »).
   demo.html est FABRIQUÉE depuis app.html par demo-build.js, comme beta.html par beta-build.js — mais elle s'adresse au public : elle ne
   doit rien envoyer, ne rien lire de l'application des clients (même origine teamop.fr), et ne jamais ressembler à la bêta.
   Ce banc EXÉCUTE : la génération (sur app.html et sur des copies où chaque motif est retiré, une à une), le pare-feu (dans une fenêtre
   simulée où chaque appel sortant est compté), et le semis (les vraies fonctions, pour chaque métier). Ce qu'il ne doit pas laisser passer :
   · une garde qui ne trouve plus son motif sans que la génération échoue (un remplacement qui ne remplace rien coupe… rien) ;
   · une adresse réseau atteignable : TOUTE URL de demo.html est jouée contre fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource,
     window.open et un clic sur un lien, puis comparée à la politique de contenu ; une clé « elan_ » hors du préfixe de la démonstration ;
   · BETA_ESSAI à vrai (la bêta), DEMO_PUBLIQUE à faux, SYNC_SECRET_DEFAULT ou SYNC_SALT touchés (le mot de passe et le sel de chiffrement) ;
   · un semis qui mélange les métiers : un type d'intervention, une catégorie de produit ou un mot de l'anti-nuisibles d'un autre métier,
     un courriel ou un numéro joignable, un produit posé par `db.produits.push` ;
   · la liste des métiers ouverts qui s'écarte de celle du site (tests/metiers-publics.js).
   Population comptée avant chaque absence.                                                                                              */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const { spawnSync } = require('child_process');
const { RACINE, nu, litteral, fonction, evalue, bac } = require('./metiers-outils.js');
const PUBLICS = require('./metiers-publics.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');

const APP = lire('app.html'), DEMO = lire('demo.html'), BUILD = lire('demo-build.js');
const PARE = lire('scripts/demo/pare-feu.js'), MODULE = lire('scripts/demo/demo-publique.js'), SCEN = lire('scripts/demo/scenarios.js');
const N = nu(DEMO);

/* ── 1. LA GÉNÉRATION ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n1. Le vrai demo-build.js sur le vrai app.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'demo2940-'));
const lancer = (dossier, sortie) => spawnSync(process.execPath, [path.join(dossier, 'demo-build.js'), sortie], { encoding: 'utf8', cwd: dossier });
{
  const r = lancer(RACINE, path.join(TMP, 'demo-refaite.html'));
  vrai('la génération réussit (code 0)', r.status === 0, r.stderr);
  const refaite = fs.existsSync(path.join(TMP, 'demo-refaite.html')) ? fs.readFileSync(path.join(TMP, 'demo-refaite.html'), 'utf8') : '';
  vrai('(population) la démonstration refaite pèse plus de 4 Mo et porte le semis', refaite.length > 4e6 && refaite.indexOf('function demoPubliqueSemer(') > 0);
  vrai('⛔ demo.html EST la génération de app.html (à l\'octet) — sinon : node demo-build.js, et commiter', refaite === DEMO);
}
/* Chaque garde, une à une : on retire son motif d'une COPIE d'app.html et la génération doit échouer en nommant la garde. Un remplacement
   qui ne trouve rien ne coupe rien — et c'est ce qui se tait. */
{
  const COPIE = path.join(TMP, 'racine'); fs.mkdirSync(path.join(COPIE, 'scripts', 'demo'), { recursive: true });
  fs.copyFileSync(path.join(RACINE, 'demo-build.js'), path.join(COPIE, 'demo-build.js'));
  ['pare-feu.js', 'demo-publique.js', 'scenarios.js'].forEach(f => fs.copyFileSync(path.join(RACINE, 'scripts', 'demo', f), path.join(COPIE, 'scripts', 'demo', f)));
  const GARDES = [
    ['FB_TEAM', "const FB_TEAM='elan-gestion';"], ['espaceHerite', "if(localStorage.getItem('elan_sync_team')) return;   // déjà rattaché à son entreprise"],
    ['syncEnabled', "function syncEnabled(){ return localStorage.getItem('elan_sync_on')!=='0' && !!syncTeam(); }"], ['teamopLienCheck', 'async function teamopLienCheck(){'],
    ['DEMO_PUBLIQUE', 'const BETA_ESSAI=false;'], ['PAGE_APP', "const PAGE_APP=BETA_ESSAI?'beta.html':'app.html';"],
    ['secuAFaire', 'function secuAFaire(u){ if(BETA_ESSAI) return false;'], ['emailRappelModal', 'function emailRappelModal(passe){ if(BETA_ESSAI) return;'],
    ['horsLigneDebut', 'function horsLigneDebut(motif){'], ['battement', 'async function battement(){\n  clearTimeout(_hbTimer);'], ['rep()', 'function rep(msg,src,line,stack){ try{'],
    ['service worker', "navigator.serviceWorker.register('sw.js')"], ['manifeste', '<link rel="manifest" href="manifest.webmanifest">\n'], ['titre', '<title>OP GESTION</title>'],
    ["Changer d'application", "<button class=\"btn ghost sm\" onclick=\"try{localStorage.removeItem('teamop_app')}catch(e){};location.href='index.html?hub=1'\">Changer d'application</button>"], ['loadLeaflet', 'function loadLeaflet(){ return new Promise((res,rej)=>{\n  if(window.L) return res();'], ['boîtes du courrier', "if(BETA_ESSAI){ const e=new Error('Espace de test : aucune vraie boîte mail ne se connecte ici. Les vrais mails se testent dans la Tour.'); e.calme=true; throw e; }"], ['rangée OP MESSAGES du menu', '<a id="suite-opmsg" href="messages.html"'], ['bouton flottant OP MESSAGES', '<a class="msg-flot" id="msg-flot" href="messages.html"'],
    ['suiteRefresh', "const soOn=!!(can('opMessages')&&planOpMsg()&&opMsgDisponible());"], ['bandeau', 'try{ multiProposer(view); }catch(_e){}'],
    ['démarrage', 'try{ txtAppliquer(); }catch(e){}\nboot();\n'], ['haut de page', '<meta charset="utf-8">\n'],
    ['code d\'équipe devis', "'op_devis_code'"], ['préfixe', "const STORE_KEY = 'elan_gestion_v2';"],
    ['forceUpdate', 'async function forceUpdate(){'], ['Assistant devis', "  if(!adCode()){\n    $('content').innerHTML=`<div class=\"card\"><div class=\"card-head\"><h3>🔒 Code d'accès requis</h3></div>"],
    ['Devis IA — message', "  if(demande.trim().length<5){ show('Décris la prestation d\\'abord.'); return; }\n"],
    ['Devis IA — état', "  // état en direct : le serveur dit si l'entreprise est activée et combien il reste de devis aujourd'hui\n  fetch(PUSH_API+'/api/devis/etat?team='"],
    ['sms: (location.href)', "location.href='sms:'+"], ['mailto: (location.href)', "location.href='mailto:'+"], ['mailto: (window.location.href)', 'window.location.href=`mailto:${mail}?subject=']
  ];
  vrai('(population) ' + GARDES.length + ' gardes à éprouver, chacune avec un motif qui existe UNE fois ou plus dans app.html', GARDES.length >= 27 && GARDES.every(g => APP.indexOf(g[1]) >= 0));
  const tombees = [];
  GARDES.forEach(([nom, motif]) => {
    fs.writeFileSync(path.join(COPIE, 'app.html'), APP.split(motif).join('«MOTIF-RETIRÉ»'));
    const r = lancer(COPIE, path.join(COPIE, 'sortie.html'));
    if (r.status !== 1 || !/ÉCHEC/.test(r.stderr)) tombees.push(nom + ' (code ' + r.status + ')');
  });
  egal('⛔ retirer le motif d\'UNE garde fait échouer la génération (code 1, « ÉCHEC »), pour chacune des ' + GARDES.length, tombees, []);
  /* les deux gardes de non-régression : un renommage global qui emporterait le mot de passe ou le sel de chiffrement */
  [["SYNC_SECRET_DEFAULT='ELAN-GESTION-7F3A9C2E-cloud-2026'", 'SYNC_SECRET_DEFAULT'], ["SYNC_SALT='RUxBTi1HRVNUSU9OLXNhbHQtdjE='", 'SYNC_SALT']].forEach(([motif, nom]) => {
    fs.writeFileSync(path.join(COPIE, 'app.html'), APP.split(motif).join(motif.replace('ELAN', 'DEMO').replace('RUxBTi', 'XXXBTi')));
    const r = lancer(COPIE, path.join(COPIE, 'sortie.html'));
    vrai('⛔ ' + nom + ' modifié : la génération refuse (c\'est le mot de passe / le sel de chiffrement, pas un nom)', r.status === 1 && r.stderr.indexOf(nom) >= 0, r.stderr);
  });
  /* BETA_ESSAI déjà à vrai dans la source : la démonstration ne doit jamais être la bêta */
  fs.writeFileSync(path.join(COPIE, 'app.html'), APP.replace('const BETA_ESSAI=false;', 'const BETA_ESSAI=true;'));
  const rb = lancer(COPIE, path.join(COPIE, 'sortie.html'));
  vrai('⛔ une source dont BETA_ESSAI vaut vrai : la génération échoue', rb.status === 1, rb.stderr);
  /* une clé « elan_ » que le préfixe ne couvrirait pas (écrite avec un accent grave) : la génération la voit */
  fs.writeFileSync(path.join(COPIE, 'app.html'), APP.replace('const BETA_ESSAI=false;', 'const BETA_ESSAI=false; const _k = "elan_oubliee";'));
  const rk = lancer(COPIE, path.join(COPIE, 'sortie.html'));
  vrai('une clé "elan_…" écrite en double guillemet est renommée aussi (aucune ne subsiste)', rk.status === 0 && !/["']elan_/.test(fs.readFileSync(path.join(COPIE, 'sortie.html'), 'utf8')), rk.stderr);
}

/* ── 2. LE DRAPEAU, LE STOCKAGE, LE RÉFÉRENCEMENT ─────────────────────────────────────────────────────────────────────────── */
console.log('\n2. DEMO_PUBLIQUE vrai, BETA_ESSAI faux, un seul préfixe, rien de référencé');
vrai('DEMO_PUBLIQUE est déclaré vrai UNE fois', DEMO.split('const DEMO_PUBLIQUE=true;').length === 2 && DEMO.indexOf('DEMO_PUBLIQUE=false') < 0);
vrai('⛔ BETA_ESSAI reste à FAUX (la démonstration n\'est pas la bêta : il imposerait la porte serveur et ouvrirait les outils de l\'équipe)', DEMO.split('const BETA_ESSAI=false;').length === 2 && DEMO.indexOf('const BETA_ESSAI=true;') < 0);
vrai('⛔ SYNC_SECRET_DEFAULT et SYNC_SALT sont intacts, identiques à app.html', DEMO.indexOf("SYNC_SECRET_DEFAULT='ELAN-GESTION-7F3A9C2E-cloud-2026'") > 0 && DEMO.indexOf("SYNC_SALT='RUxBTi1HRVNUSU9OLXNhbHQtdjE='") > 0
  && APP.indexOf("SYNC_SECRET_DEFAULT='ELAN-GESTION-7F3A9C2E-cloud-2026'") > 0);
vrai('(population) app.html écrit plus de 100 clés « elan_ » : toutes passent au préfixe de la démonstration', (APP.match(/['"]elan_/g) || []).length > 100 && (DEMO.match(/['"]elanD_/g) || []).length >= (APP.match(/['"]elan_/g) || []).length);
vrai('⛔ plus aucune clé « elan_ » (celle de l\'application des clients) : la démonstration ne lit ni n\'écrit chez eux', !/['"]elan_/.test(DEMO) && !/`elan_[a-z_]*\$\{/.test(DEMO));
{
  /* « elanB_ » (la bêta) n'apparaît que dans trois lectures de DIAGNOSTIC, jamais comme clé : deux expressions régulières qui rangent les clés par famille, et un test de préfixe de l'écran d'un jeton refusé */
  const lignes = N.split('\n').filter(l => l.indexOf('elanB_') >= 0);
  egal('« elanB_ » (la bêta) : trois lectures de diagnostic au plus (rangementMesure, jetonRefusEcran), aucune clé de stockage', [lignes.length, lignes.every(l => /\/\^elanB_|indexOf\('elanB_'\)|\/\/.*elanB_/.test(l)), /(?:get|set|remove)Item\(\s*['"]elanB_/.test(N)], [3, true, false]);
}
{
  const nonPrefixes = [];
  const re = /localStorage\.(?:getItem|setItem|removeItem)\(\s*(['"])([^'"]+)\1/g; let m;
  while ((m = re.exec(N))) if (!/^(elanD_|opD_|top_monitor_off$|teamop_promo_en_attente$)/.test(m[2])) nonPrefixes.push(m[2]);
  egal('(les clés écrites en dur) toutes au préfixe de la démonstration — hors deux clés de la page (la vue du pare-feu les range sous le préfixe : la sentinelle éteinte, un code promo en attente)', [...new Set(nonPrefixes)], []);
}
vrai('le stockage est celui de la démonstration (STORE_KEY elanD_gestion_v2) et le code d\'équipe devis aussi (opD_)', DEMO.indexOf("const STORE_KEY = 'elanD_gestion_v2';") > 0 && DEMO.indexOf("'opD_devis_code'") > 0 && DEMO.indexOf("'op_devis_code'") < 0);
vrai('FB_TEAM n\'existe pas côté serveur, et rien ne rattache l\'appareil (espaceHerite, syncEnabled, teamopLienCheck)', DEMO.indexOf("const FB_TEAM='demo-sans-espace';") > 0
  && /if\(DEMO_PUBLIQUE\) return;\s+\/\/ démonstration : aucun espace/.test(DEMO) && DEMO.indexOf('function syncEnabled(){ return !DEMO_PUBLIQUE &&') > 0 && DEMO.indexOf('async function teamopLienCheck(){ if(DEMO_PUBLIQUE) return false;') > 0);
vrai('la page n\'est pas référencée : noindex, nofollow, pas de manifeste, pas d\'enregistrement du service worker', DEMO.indexOf('<meta name="robots" content="noindex,nofollow">') > 0
  && DEMO.indexOf('<link rel="manifest"') < 0 && DEMO.indexOf("serviceWorker.register('sw.js')") < 0 && /serviceWorker\.register\b/.test(DEMO));
vrai('la version se lit « -demo » (elle n\'est jamais prise pour la bêta : aucun bandeau, aucun outil de l\'équipe)', /APP_VERSION = '\d+-demo'/.test(DEMO) && !/APP_VERSION = '\d+-beta'/.test(DEMO));
vrai('les outils de l\'équipe sont ABSENTS : betaOutils() ne rend vrai que pour BETA_ESSAI, et la carte « Outils de bêta » aussi', fonction(N, 'betaOutils').indexOf('BETA_ESSAI===true') > 0
  && /\$\{BETA_ESSAI&&currentUser&&currentUser\.role==='admin'\?`<div class="card"><div class="card-head"><h3>🧪 Outils de bêta/.test(N));
vrai('pas d\'écran de connexion, de campagne mot de passe ni de rappel d\'adresse, ni d\'écran « Connexion requise »', /function secuAFaire\(u\)\{ if\(BETA_ESSAI\|\|DEMO_PUBLIQUE\) return false;/.test(N)
  && /function emailRappelModal\(passe\)\{ if\(BETA_ESSAI\|\|DEMO_PUBLIQUE\) return;/.test(N) && /function horsLigneDebut\(motif\)\{ if\(DEMO_PUBLIQUE\) return;/.test(N)
  && /async function battement\(\)\{\s+if\(DEMO_PUBLIQUE\) return;/.test(N) && /if\(DEMO_PUBLIQUE\) demoPubliqueBoot\(\); else boot\(\);/.test(N));
vrai('OP MESSAGES ne paraît que « Bientôt » : aucun lien vers messages.html ni messages-beta.html, aucun bouton pour l\'ouvrir', !/messages(-beta)?\.html/.test(DEMO) && /<div id="suite-opmsg"[\s\S]{0,700}Bientôt<\/span>/.test(DEMO)
  && DEMO.indexOf("const soOn=DEMO_PUBLIQUE||!!(can('opMessages')") > 0);
vrai('(contre-épreuve) OP MESSAGES reste fermée : messages.html garde OPMSG_EN_TRAVAUX et la démonstration n\'y touche pas', /const OPMSG_EN_TRAVAUX\s*=\s*true;/.test(lire('messages.html')));

/* ── 3. LA POLITIQUE DE CONTENU : le navigateur lui-même refuse ce qui sort ────────────────────────────────────────────────── */
console.log('\n3. La politique de contenu (le filet du navigateur)');
const CSP = (/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(DEMO) || [])[1] || '';
const DIRECTIVES = {}; CSP.split(';').map(x => x.trim()).filter(Boolean).forEach(d => { const [nom, ...src] = d.split(/\s+/); DIRECTIVES[nom] = src; });
vrai('(population) la politique existe et porte ses douze directives, posée AVANT le pare-feu et l\'application', Object.keys(DIRECTIVES).length >= 12 && DEMO.indexOf(CSP) < DEMO.indexOf('LE PARE-FEU DE LA DÉMONSTRATION'));
/* ce que la politique AUTORISE pour une origine donnée dans une directive (repli sur default-src) */
const autorise = (directive, origine) => {
  const src = DIRECTIVES[directive] || DIRECTIVES['default-src'] || [];
  return src.some(s => s === '*' || s === origine || (/^https?:$/.test(s) && origine.indexOf(s) === 0) || (s === "'self'" && origine === 'http://127.0.0.1') || (/^\*\./.test(s) && origine.endsWith(s.slice(1))));
};
egal('default-src est « none » : tout ce que la liste ne nomme pas est refusé', DIRECTIVES['default-src'], ["'none'"]);
egal('connect-src : seulement ce qui est fabriqué dans la page (data: et blob:) — fetch, XHR, WebSocket, EventSource, sendBeacon', DIRECTIVES['connect-src'], ['data:', 'blob:']);
vrai('form-action et manifest-src : aucun', DIRECTIVES['form-action'] && DIRECTIVES['form-action'][0] === "'none'" && DIRECTIVES['manifest-src'][0] === "'none'");
vrai('aucune directive n\'autorise une adresse (ni « * », ni « https: », ni un nom de domaine)', Object.values(DIRECTIVES).every(l => l.every(s => /^('none'|'self'|'unsafe-inline'|'unsafe-eval'|data:|blob:)$/.test(s))), DIRECTIVES);
vrai('les images ne viennent que de la page (icônes), de data: et de blob: — ni avatars, ni tuiles de carte, ni compteur', DIRECTIVES['img-src'].join(' ') === "'self' data: blob:");

/* ── 4. LE PARE-FEU, EXÉCUTÉ : chaque adresse de demo.html contre chaque porte ───────────────────────────────────────────────── */
console.log('\n4. Le pare-feu exécuté contre toutes les adresses de la page');
const VUS = new Set();
(DEMO.match(/https?:\/\/[^\s"'`<>)\\]+/g) || []).forEach(u => VUS.add(u.replace(/[,;.]+$/, '').split(/[${]/)[0]));
const URLS = [...VUS].filter(u => /^https?:\/\/[^/]+/.test(u)).sort();
const ORIGINES = [...new Set(URLS.map(u => (/^(https?:\/\/[^/]+)/.exec(u) || [])[1]))];
vrai('(population) la page nomme ' + URLS.length + ' adresses, ' + ORIGINES.length + ' origines (dont api.teamop.fr, unpkg, cdn.jsdelivr, openstreetmap, anthropic)', URLS.length >= 30 && ORIGINES.length >= 15
  && ['https://api.teamop.fr', 'https://unpkg.com', 'https://cdn.jsdelivr.net', 'https://nominatim.openstreetmap.org', 'https://api.anthropic.com'].every(o => ORIGINES.indexOf(o) >= 0), ORIGINES);
{
  const DIRS = ['default-src', 'script-src', 'style-src', 'img-src', 'font-src', 'media-src', 'connect-src', 'frame-src', 'object-src', 'worker-src', 'manifest-src'];
  egal('⛔ la politique de contenu n\'autorise AUCUNE de ces origines, dans AUCUNE directive (script, style, image, police, média, appel, cadre, objet, worker)',
    ORIGINES.flatMap(o => DIRS.filter(d => autorise(d, o)).map(d => d + ' ← ' + o)), []);
  egal('(contre-épreuve du détecteur) il verrait une origine autorisée : l\'origine de la page, dans img-src', [autorise('img-src', 'http://127.0.0.1'), autorise('connect-src', 'http://127.0.0.1')], [true, false]);
}
const memStockage = init => { const m = Object.assign({}, init); return { get length() { return Object.keys(m).length; }, key: i => Object.keys(m)[i] || null, getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, clear: () => { for (const k of Object.keys(m)) delete m[k]; }, _m: m }; };
function fenetre(opts) {
  opts = opts || {};
  const appels = { fetch: [], xhr: [], beacon: [], open: [], ws: [], es: [], notif: 0, toasts: [], ecouteurs: {}, src: [], attr: [], html: [] };
  const real = memStockage({ elan_sync_team: 'elan-gestion', elan_gestion_v2: '{"clients":[{"nom":"Client réel"}]}', elanB_x: '1', elanD_gestion_v2: '{"demo":1}', opD_devis_code: 'abc', teamop_session: 'zzz' });
  class XHR { open(m, u) { this.u = u; } send() { appels.xhr.push(this.u); } dispatchEvent() { this.erreur = true; return true; } }
  const W = {
    navigator: { userActivation: { isActive: opts.geste !== false }, sendBeacon: u => { appels.beacon.push(String(u)); return true; } },
    document: { addEventListener: (t, f) => { appels.ecouteurs[t] = f; } },
    location: { href: 'http://127.0.0.1/demo.html', origin: 'http://127.0.0.1', pathname: '/demo.html' },
    URL, Event: class { },
    localStorage: real, sessionStorage: memStockage({ elan_session: 'x' }),
    fetch: u => { appels.fetch.push(String(u && u.url || u)); return Promise.resolve({ ok: true, vrai: true }); },
    XMLHttpRequest: XHR, WebSocket: class { constructor(u) { appels.ws.push(u); } }, EventSource: class { constructor(u) { appels.es.push(u); } },
    Notification: class { constructor() { appels.notif++; } }, PushManager: function () { },
    open: u => { appels.open.push(String(u)); return { fenetre: true }; }, toast: m => { appels.toasts.push(m); }
  };
  /* le Cache Storage de l'ORIGINE : celui de la vraie application (teamop-…) et celui de la démonstration (elanD_…) */
  const cachesReel = { m: new Set(['teamop-REEL', 'teamop-statique-v772', 'elanD_cache']), keys() { return Promise.resolve([...this.m]); }, has(n) { return Promise.resolve(this.m.has(n)); },
    open(n) { this.m.add(n); return Promise.resolve({ cache: n }); }, delete(n) { return Promise.resolve(this.m.delete(n)); }, match() { return Promise.resolve('copie'); } };
  W.caches = cachesReel;
  W.SpeechRecognition = function () { }; W.webkitSpeechRecognition = function () { };
  if (opts.figeStockage) Object.defineProperty(W, 'localStorage', { value: real, writable: false, configurable: false });   // un navigateur qui refuse la redéfinition
  /* des éléments dont `src` et `href` sont des accesseurs du prototype (comme dans un navigateur), et un innerHTML qui note ce qu'on lui donne */
  class El { dispatchEvent() { this.erreur = true; return true; } setAttribute(n, v) { appels.attr.push([n, String(v)]); } }
  ['src', 'href', 'data'].forEach(a => Object.defineProperty(El.prototype, a, { configurable: true, get() { return this['_' + a]; }, set(v) { appels.src.push(String(v)); this['_' + a] = v; } }));
  W.document.createElement = () => new El();
  W.Element = class { insertAdjacentHTML(p, v) { appels.html.push(String(v)); } };
  Object.defineProperty(W.Element.prototype, 'innerHTML', { configurable: true, enumerable: true, get() { return ''; }, set(v) { appels.html.push(String(v)); } });
  W.window = W; W.Notification.permission = 'default'; W.Notification.requestPermission = () => Promise.resolve('granted');
  vm.runInNewContext('(function(window){' + PARE + '\n})(__W)', { __W: W, Proxy, Promise, Object, String, Array, Date, JSON, setTimeout: f => { f(); return 0; } });
  return { W, appels, real, cachesReel };
}
(async () => {
  const { W, appels, real } = fenetre();
  vrai('le pare-feu s\'arme (window.__demoPublique) avec le message de la démonstration', W.__demoPublique && W.__demoPublique.msg === "Dans la démonstration, rien n'est envoyé.");
  const MSG = W.__demoPublique.msg;
  const fautes = [];
  for (const u of URLS) {
    let e1 = null; try { await W.fetch(u, { method: 'POST', body: 'x' }); } catch (e) { e1 = e; }
    if (!(e1 && e1.demo && e1.message === MSG)) fautes.push('fetch ' + u);
    const x = new W.XMLHttpRequest(); x.open('GET', u); x.send(); if (!x.erreur) fautes.push('xhr ' + u);
    if (W.navigator.sendBeacon(u, 'x') !== false) fautes.push('beacon ' + u);
    for (const C of ['WebSocket', 'EventSource']) { let t = false; try { new W[C](u); } catch (e) { t = !!e.demo; } if (!t) fautes.push(C + ' ' + u); }
    if (W.open(u, '_blank') !== null) fautes.push('open ' + u);
    let prevenu = false; const a = { getAttribute: () => u, href: u };
    appels.ecouteurs.click({ target: { closest: () => a }, preventDefault() { prevenu = true; }, stopPropagation() { } }); if (!prevenu) fautes.push('lien ' + u);
  }
  /* les éléments posés par le code (une carte qui charge son script, une image d'avatar) : refusés AVANT de partir */
  for (const u of URLS) {
    for (const [tag, attr] of [['script', 'src'], ['link', 'href'], ['img', 'src'], ['iframe', 'src'], ['object', 'data']]) {
      const el = W.document.createElement(tag); el[attr] = u;
      if (!el.erreur) fautes.push(tag + '.' + attr + ' ' + u);
    }
    const e2 = W.document.createElement('script'); e2.setAttribute('src', u); if (!e2.erreur) fautes.push('setAttribute ' + u);
    new W.Element().insertAdjacentHTML('beforeend', '<img src="' + u + '" alt="">'); new (class extends W.Element { })().innerHTML = '<img class="a" src=\'' + u + '\'><source srcset="' + u + '">';
  }
  egal('⛔ ' + URLS.length + ' adresses × (fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource, window.open, clic sur un lien, script/link/img/iframe/object créés, setAttribute) : toutes REFUSÉES', fautes, []);
  egal('⛔ et le balisage écrit en ligne (innerHTML, insertAdjacentHTML) n\'envoie plus aucune de ces adresses à un src / srcset (elles deviennent « data:, »)', appels.html.filter(h => URLS.some(u => h.indexOf('src=' + (h.indexOf('src="') >= 0 ? '"' : "'") + u) >= 0 || h.indexOf(u) >= 0)).length, 0);
  vrai('(population) ' + (URLS.length * 2) + ' balisages ont traversé le pare-feu, tous réécrits en « data:, »', appels.html.length === URLS.length * 2 && appels.html.every(h => /src="data:,"|src='data:,'/.test(h)), appels.html.slice(0, 2));
  { const src0 = appels.src.length; const e = W.document.createElement('img'); e.src = 'icons/logo-day.png'; e.src = 'data:image/png;base64,AAAA'; e.src = 'blob:http://127.0.0.1/z'; e.src = 'http://127.0.0.1/icons/x.png';
    vrai('une image de la page (relative, même origine), data: et blob: passent', appels.src.length === src0 + 4 && !e.erreur);
    new W.Element().insertAdjacentHTML('beforeend', '<img src="icons/logo-night.png"><a href="https://teamop.fr/espace.html">x</a>');
    vrai('un balisage sans adresse externe en src est rendu tel quel — un LIEN (a href) n\'est pas touché : c\'est le clic qu\'on arrête', /icons\/logo-night\.png/.test(appels.html[appels.html.length - 1]) && /<a href="https:\/\/teamop\.fr\/espace\.html">/.test(appels.html[appels.html.length - 1])); }
  appels.src.length = 0;
  egal('⛔ et rien n\'est parti : le vrai fetch, le vrai XMLHttpRequest, le vrai sendBeacon, les vrais WebSocket/EventSource, le vrai window.open et les vrais src/href n\'ont reçu AUCUN appel',
    [appels.fetch, appels.xhr, appels.beacon, appels.ws, appels.es, appels.open, appels.src.filter(x => /^https?:/.test(x) && x.indexOf('127.0.0.1') < 0), appels.attr.filter(a => /^https?:/.test(a[1]))], [[], [], [], [], [], [], [], []]);
  vrai('(population) le journal des refus compte ' + (URLS.length * 7) + ' tentatives (une par porte et par adresse)', W.__demoPublique.refus.length >= 200 || W.__demoPublique.refus.length >= URLS.length * 4);

  console.log('\n   — ce qui doit PASSER (la page se parle à elle-même), sinon le pare-feu casse l\'application');
  let pass = null; try { pass = await W.fetch('data:text/plain,bonjour'); } catch (e) { pass = e; }
  vrai('un data: passe (une photo, un PDF fabriqués ici), et un blob: aussi', pass && pass.vrai === true && appels.fetch.length === 1 && appels.fetch[0].indexOf('data:') === 0);
  await W.fetch('blob:http://127.0.0.1/abc'); vrai('blob: passe', appels.fetch.length === 2);
  vrai('window.open de la page elle-même, d\'une fenêtre vide (impression) et d\'un blob: passe', ['', 'about:blank', 'blob:http://127.0.0.1/x', 'http://127.0.0.1/demo.html#v=planning'].every(u => { appels.open.length = 0; W.open(u); return appels.open.length === 1; }));
  { let prevenu = false; ['#', '#v=planning', 'javascript:void(0)', 'http://127.0.0.1/demo.html#x'].forEach(h => { appels.ecouteurs.click({ target: { closest: () => ({ getAttribute: () => h, href: h.charAt(0) === '#' ? 'http://127.0.0.1/demo.html' + h : h }) }, preventDefault() { prevenu = true; } }); });
    vrai('un lien vers un point de la page (#…) n\'est pas arrêté', prevenu === false); }
  { const q = []; ['mailto:a@b.fr', 'sms:0102030405', 'http://127.0.0.1/connexion.html', 'https://teamop.fr/espace.html'].forEach(h => { let p = false; appels.ecouteurs.click({ target: { closest: () => ({ getAttribute: () => h, href: h }) }, preventDefault() { p = true; }, stopPropagation() { } }); if (!p) q.push(h); });
    egal('un lien mailto:, sms:, ou vers une AUTRE page (même origine comprise : connexion.html) est arrêté', q, []); }

  console.log('\n   — les notifications, le service worker, la sentinelle, les messages');
  vrai('Notification est refusée d\'avance (permission « denied », requestPermission rend « denied »), PushManager n\'existe plus : l\'application ne propose rien',
    W.Notification.permission === 'denied' && (await W.Notification.requestPermission()) === 'denied' && W.PushManager === undefined);
  { let rej = null; try { await W.navigator.serviceWorker.register('sw.js'); } catch (e) { rej = e; }
    vrai('aucun service worker : register refuse, getRegistrations rend une liste vide', !!(rej && rej.demo) && (await W.navigator.serviceWorker.getRegistrations()).length === 0 && W.navigator.serviceWorker.controller === null); }
  vrai('la sentinelle de la Tour ne démarre pas (top_monitor_off = 1, rangée sous le préfixe de la démonstration)', W.localStorage.getItem('top_monitor_off') === '1' && real._m['elanD_x_top_monitor_off'] === '1');
  { const F = fenetre(); try { await F.W.fetch('https://api.teamop.fr/api/sendmail', { method: 'POST' }); } catch (e) { /* attendu */ }
    vrai('⛔ un envoi de courriel refusé après un geste de la personne le DIT : « Dans la démonstration, rien n\'est envoyé. »', F.appels.toasts.length === 1 && F.appels.toasts[0].indexOf(MSG) >= 0, F.appels.toasts); }
  { const F = fenetre(); try { await F.W.fetch('https://api.teamop.fr/health'); await F.W.fetch('https://api.teamop.fr/api/op/flux?depuis=1'); } catch (e) { /* attendu */ }
    vrai('un appel de fond (/health, la synchro) refusé ne dit rien (sinon la page parlerait toute seule)', F.appels.toasts.length === 0); }
  { const F = fenetre({ geste: false }); try { await F.W.fetch('https://api.teamop.fr/api/sendmail'); } catch (e) { /* attendu */ }
    vrai('et sans geste de la personne, même un envoi refusé ne dit rien', F.appels.toasts.length === 0); }

  console.log('\n   — le stockage : la page ne voit QUE le préfixe de la démonstration');
  const LS = W.localStorage;
  egal('(population) le rangement réel porte les clés de l\'application des clients, de la bêta, de la Tour ET de la démonstration', Object.keys(real._m).filter(k => /^(elan_|elanB_|teamop_|elanD_|opD_)/.test(k)).length >= 6, true);
  egal('⛔ elan_sync_team (l\'entreprise des clients), elan_gestion_v2 (leur base), elanB_x (la bêta), teamop_session (la Tour) : INVISIBLES', [LS.getItem('elan_sync_team'), LS.getItem('elan_gestion_v2'), LS.getItem('elanB_x'), LS.getItem('teamop_session'), LS.elan_sync_team], [null, null, null, null, undefined]);
  egal('la base de la démonstration (elanD_gestion_v2) et son code devis (opD_devis_code) se lisent', [LS.getItem('elanD_gestion_v2'), LS.getItem('opD_devis_code')], ['{"demo":1}', 'abc']);
  { const avant = JSON.stringify(real._m); LS.setItem('elan_sync_team', 'pirate'); LS.elan_autre = 'x'; LS.removeItem('elan_gestion_v2');
    vrai('⛔ écrire « elan_sync_team » ne touche PAS la vraie clé (rangée à part, sous elanD_x_) ; en retirer une des clients ne retire rien', real._m.elan_sync_team === 'elan-gestion' && real._m['elanD_x_elan_sync_team'] === 'pirate'
      && real._m['elanD_x_elan_autre'] === 'x' && real._m.elan_gestion_v2 !== undefined && JSON.parse(avant).elan_sync_team === 'elan-gestion'); }
  vrai('length, key(i) et l\'énumération ne comptent que les clés de la démonstration', (() => { const ks = []; for (let i = 0; i < LS.length; i++) ks.push(LS.key(i)); return LS.length === ks.length && ks.length >= 4 && ks.every(k => /^(elanD_|opD_)/.test(k)) && Object.keys(LS).every(k => /^(elanD_|opD_)/.test(k)); })());
  { LS.clear(); vrai('⛔ clear() (« Recommencer ») n\'efface QUE la démonstration : les clés des clients, de la bêta et de la Tour restent', Object.keys(real._m).every(k => /^(elan_|elanB_|teamop_)/.test(k)) && Object.keys(real._m).length === 4, Object.keys(real._m)); }
  vrai('sessionStorage : même vue', (() => { const S = W.sessionStorage; return S.getItem('elan_session') === null; })());

  console.log('\n   — le code de l\'application lui-même : aucun appel nu ne contourne le pare-feu');
  { const sans = N.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const pare = (sans.match(/LE PARE-FEU/g) || []).length;
    vrai('(population) le code de la page porte plus de 40 appels fetch( — tous passent par window.fetch, remplacé avant le premier script', (sans.match(/\bfetch\(/g) || []).length >= 40 && DEMO.indexOf('W.fetch = function') > 0);
    egal('aucun code de la page (hors pare-feu) ne garde une référence au vrai fetch / XMLHttpRequest avant le pare-feu : le pare-feu est le PREMIER script', DEMO.indexOf('<script>') === DEMO.indexOf('<script>\n/* ══ LE PARE-FEU'), true);
    /* les navigations par affectation vers http(s) : recensées, nommées */
    const navs = []; const re = /(?:window\.)?location(?:\.href)?\s*=\s*(?:\\?['"`])(https?:)/g; let m; while ((m = re.exec(sans))) navs.push(sans.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, ' '));
    egal('(les affectations de location vers http) une seule, dans l\'écran d\'un refus de synchro (jetonRefusEcran), qui ne s\'ouvre jamais ici : aucun espace, jamais de jeton refusé', navs.length, 1);
    vrai('… et cet écran n\'a qu\'un déclencheur : docRefusVu, appelé par la synchro — éteinte (syncEnabled vaut faux, FB_TEAM n\'existe pas)', navs[0].indexOf('connexion.html') > 0 && /function syncEnabled\(\)\{ return !DEMO_PUBLIQUE/.test(sans) && fonction(sans, 'jetonRefusEcran').indexOf('_jetonRefus') > 0);
  }
  console.log('\n   — le code du semis lui-même (commentaires retirés)');
  { const code = nu(MODULE + SCEN).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    egal('aucun appel réseau dans le module de la démonstration : ni fetch(, ni XMLHttpRequest, ni sendBeacon, ni WebSocket, ni adresse http', [/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|https?:\/\//.test(code)], [false]);
    egal('⛔ un produit naît par produitCreer(…, {semis:true}) : jamais db.produits.push dans le semis', [/db\.produits\.push\(/.test(code), /produitCreer\(\{[^]*?\},\s*\{\s*semis:\s*true\s*\}\)/.test(code)], [false, true]);
    vrai('le métier se règle par metierServeurAppliquer (la fonction de la Tour), les types par intTypes(), les catégories par categoriesProduit() : aucune liste recopiée dans le semis',
      /metierServeurAppliquer\(\{\s*metier:\s*id\s*\}\)/.test(code) && /intTypes\(\)/.test(code) && /categoriesProduit\(\)/.test(code) && !/INT_TYPES\b|CAT_LIST\b/.test(code));
  }

  console.log('\n   — le cache : la page ne voit que les siens (« Forcer la mise à jour » ne vide pas la copie hors ligne de la VRAIE application)');
  {
    const F = fenetre(), W2 = F.W;
    egal('(population) l\'origine porte 3 caches : deux de la vraie application, un de la démonstration', [...F.cachesReel.m].sort(), ['elanD_cache', 'teamop-REEL', 'teamop-statique-v772']);
    egal('caches.keys() ne rend QUE ceux de la démonstration (elanD_…)', await W2.caches.keys(), ['elanD_cache']);
    await Promise.all((await W2.caches.keys()).map(k => W2.caches.delete(k)));   // le geste exact de forceUpdate
    egal('⛔ le geste de forceUpdate (keys puis delete de chacun) laisse les caches de la vraie application', [...F.cachesReel.m].sort(), ['teamop-REEL', 'teamop-statique-v772']);
    const dir = await W2.caches.delete('teamop-REEL'); let ouvert = null; try { await W2.caches.open('teamop-REEL'); } catch (e) { ouvert = e; }
    vrai('⛔ delete / open / has / match visés sur un cache étranger : refusés ou muets, et le cache est intact', dir === false && !!(ouvert && ouvert.demo) && (await W2.caches.has('teamop-REEL')) === false && (await W2.caches.match('x')) === undefined && F.cachesReel.m.has('teamop-REEL'));
    /* la vraie fonction de la page */
    const rep = { reload: 0, keys: 0 };
    const bf = bac('demo.html', ['forceUpdate'], { DEMO_PUBLIQUE: true, location: { reload: () => { rep.reload++; } }, caches: { keys: () => { rep.keys++; return Promise.resolve(['teamop-REEL']); }, delete: () => Promise.resolve(true) }, window: { caches: {} }, navigator: {} });
    await bf.fn.forceUpdate();
    vrai('⛔ forceUpdate() de la démonstration recharge la page et ne touche à AUCUN cache', rep.reload === 1 && rep.keys === 0, rep);
    const rep2 = { reload: 0, keys: 0 };
    const bf2 = bac('demo.html', ['forceUpdate'], { DEMO_PUBLIQUE: false, location: { reload: () => { rep2.reload++; } }, caches: { keys: () => { rep2.keys++; return Promise.resolve([]); }, delete: () => Promise.resolve(true) }, window: { caches: {} }, navigator: {} });
    await bf2.fn.forceUpdate();
    vrai('(contre-épreuve) sans le drapeau, la même fonction lit bien les caches — le banc la fait entrer', rep2.keys === 1, rep2);
  }

  console.log('\n   — la dictée : retirée (l\'audio partirait chez l\'éditeur du navigateur, hors de portée de la politique de contenu)');
  {
    const W2 = fenetre().W;
    vrai('SpeechRecognition et webkitSpeechRecognition n\'existent plus dans la page (typeof « undefined »)', typeof W2.SpeechRecognition === 'undefined' && typeof W2.webkitSpeechRecognition === 'undefined');
    const els = {}; const el = id => (els[id] = els[id] || { textContent: '' });
    const bm = bac('demo.html', ['devisIAMic'], { window: W2, $: el });
    bm.fn.devisIAMic();
    vrai('la VRAIE devisIAMic() rencontre l\'absence et le dit : « Dictée non disponible sur ce navigateur »', els['dia-mic-etat'] && els['dia-mic-etat'].textContent === 'Dictée non disponible sur ce navigateur', els);
    const Wm = { SpeechRecognition: function () { this.neuf = true; } }; const els2 = {}; const bm2 = bac('demo.html', ['devisIAMic'], { window: Wm, $: id => (els2[id] = els2[id] || { textContent: '' }) });
    bm2.fn.devisIAMic();
    vrai('(contre-épreuve) sur une fenêtre qui GARDE la reconnaissance, la même fonction la démarre : le banc voit la différence', !els2['dia-mic-etat'] || els2['dia-mic-etat'].textContent !== 'Dictée non disponible sur ce navigateur');
  }

  console.log('\n   — le stockage : un navigateur qui refuse la vue n\'ouvre RIEN, et n\'écrit rien chez les clients');
  {
    const bon = fenetre(), mauvais = fenetre({ figeStockage: true });
    vrai('(population) la fenêtre normale pose sa vue (stockageIsole vrai) ; la fenêtre figée la refuse (faux)', bon.W.__demoPublique.stockageIsole === true && mauvais.W.__demoPublique.stockageIsole === false);
    vrai('⛔ sans vue posée, le pare-feu n\'écrit PAS top_monitor_off sur le vrai rangement (il éteindrait la sentinelle de la vraie application) — et le note', mauvais.real._m.top_monitor_off === undefined
      && Object.keys(mauvais.real._m).every(k => !/top_monitor/.test(k)) && mauvais.W.__demoPublique.refus.some(r => r.genre === 'stockage'), Object.keys(mauvais.real._m));
    const appels = []; const els = {}; const el = id => (els[id] = els[id] || { style: {}, innerHTML: '' });
    const mk = stockageIsole => bac('demo.html', ['demoPubliqueBoot', 'demoPubliqueNonPris'], { window: { __demoPublique: { stockageIsole } }, document: { getElementById: el }, location: { search: '', pathname: '/demo.html' },
      demoPubliqueBouchons: () => appels.push('bouchons'), demoPubliqueStyle: () => { }, demoPubliqueChoixLire: () => '', demoPubliqueMetiers: () => ['3d'], demoPubliqueChoix: () => appels.push('choix'),
      demoPubliqueSemer: () => appels.push('semer'), demoPubliqueOuvrir: () => appels.push('ouvrir'), demoPubliqueChoixEcrire: () => { }, db: {} });
    mk(false).fn.demoPubliqueBoot();
    vrai('⛔ la VRAIE demoPubliqueBoot() sans vue du stockage : « Navigateur non pris en charge », aucun bouchon, aucun semis, aucune ouverture, aucun choix de métier', appels.length === 0 && /Navigateur non pris en charge/.test(els['login-box'].innerHTML), appels);
    mk(true).fn.demoPubliqueBoot();
    vrai('(contre-épreuve) avec la vue posée, la même fonction poursuit (bouchons, puis le choix du métier)', appels.join() === 'bouchons,choix', appels);
  }

  console.log('\n   — suivre le lien d\'un AUTRE métier ne remplace pas les essais sans le demander');
  {
    const cas = (search, deja, base, accepte) => {
      const j = { confirm: 0, semer: [], ecrit: [], ouvrir: 0 };
      const b = bac('demo.html', ['demoPubliqueBoot', 'demoPubliqueNonPris'], { window: { __demoPublique: { stockageIsole: true } }, document: { getElementById: () => ({ style: {}, innerHTML: '' }) }, location: { search, pathname: '/demo.html' },
        history: { replaceState: () => { j.replace = true; } }, confirm: () => { j.confirm++; return accepte; }, demoPubliqueBouchons: () => { }, demoPubliqueStyle: () => { }, demoPubliqueChoixLire: () => deja,
        demoPubliqueMetiers: () => ['3d', 'plomberie', 'chauffage'], demoPubliqueChoix: () => { j.choix = true; }, demoPubliqueSemer: id => j.semer.push(id), demoPubliqueOuvrir: () => { j.ouvrir++; },
        demoPubliqueChoixEcrire: id => j.ecrit.push(id), db: base });
      b.fn.demoPubliqueBoot(); return j;
    };
    const posee = { demoPublique: { metier: '3d' }, techniciens: [{}] };
    let j = cas('?metier=plomberie', '3d', posee, false);
    vrai('⛔ une base 3D posée + ?metier=plomberie : on DEMANDE ; refusé, la base reste, rien n\'est resemé, l\'adresse est nettoyée', j.confirm === 1 && j.semer.length === 0 && j.ecrit.join() === '3d' && j.ouvrir === 1 && j.replace === true, j);
    j = cas('?metier=plomberie', '3d', posee, true);
    vrai('accepté : l\'exemple du nouveau métier remplace les essais (resemé une fois)', j.confirm === 1 && j.semer.join() === 'plomberie' && j.ecrit.join() === 'plomberie', j);
    j = cas('?metier=3d', '3d', posee, false);
    vrai('le MÊME métier que celui déjà posé : aucune question, rien n\'est resemé', j.confirm === 0 && j.semer.length === 0 && j.ouvrir === 1, j);
    j = cas('?metier=chauffage', '', {}, false);
    vrai('un premier passage (aucun métier encore choisi) : aucune question, l\'exemple se pose', j.confirm === 0 && j.semer.join() === 'chauffage', j);
    j = cas('?metier=chauffage', '3d', {}, false);
    vrai('un métier mémorisé mais SANS base (effacée) : aucune question — il n\'y a plus d\'essais à perdre', j.confirm === 0 && j.semer.join() === 'chauffage', j);
  }

  console.log('\n   — sms: et mailto: écrits par l\'application : détournés, jamais une messagerie qui s\'ouvre');
  {
    const toasts = [], loc = { href: 'http://127.0.0.1/demo.html' };
    const nav = vm.runInNewContext('(' + litteral(MODULE, 'const demoNav = ') + ')', { location: loc, toast: m => toasts.push(m), DEMO_MSG: MSG, window: { __demoPublique: { refus: [] } }, String, Date });
    ['sms:0199003441?&body=Bonjour', 'mailto:client@exemple.invalid?subject=Devis'].forEach(u => { nav.href = u; });
    vrai('⛔ demoNav.href = sms: / mailto: : la page ne bouge pas, la personne lit « rien n\'est envoyé » et que la messagerie ne s\'ouvre pas', loc.href === 'http://127.0.0.1/demo.html' && toasts.length === 2
      && toasts.every(t => t.indexOf(MSG) >= 0 && /messagerie ne s’ouvre pas/.test(t)), toasts);
    const code = N;   // jamais le nettoyage « tout bloc /* … */ » : il avale du vrai code (CLAUDE.md)
    egal('(population) sept affectations détournées vers demoNav.href dans la page ; AUCUNE affectation de location.href vers sms:, mailto: ou tel: ne subsiste',
      [(code.match(/demoNav\.href\s*=/g) || []).length, /location\.href\s*=\s*['"`](?:sms|mailto|tel):/.test(code)], [7, false]);
  }

  console.log('\n   — les écrans qui promettaient une fonction absente d\'ici');
  {
    /* Paramètres : les cartes retirées existent dans app.html (un renommage les ferait réapparaître en silence) */
    const RETIREES = evalue(litteral(MODULE, 'const DEMO_PARAM_RETIREES = ['));
    const FORFAIT = evalue(litteral(MODULE, 'const DEMO_PARAM_FORFAIT = ').length ? '"' + (/const DEMO_PARAM_FORFAIT = '((?:[^'\\]|\\.)*)'/.exec(MODULE) || [])[1].replace(/\\'/g, '\'') + '"' : '""');
    const titresApp = new Set(); (APP.match(/<h3>(?:[^<]*)<\/h3>/g) || []).forEach(h => titresApp.add(h.replace(/<\/?h3>/g, '').replace(/^[^A-Za-zÀ-ÿ]+/, '').trim()));
    egal('(population) ' + RETIREES.length + ' cartes retirées de Paramètres + la carte Forfait : chaque titre est un <h3> d\'app.html', RETIREES.concat([FORFAIT]).filter(t => !titresApp.has(t)), []);
    egal('les cartes retirées sont celles qui parlent à un serveur ou à une vraie boîte mail', RETIREES.slice().sort(), ['Devis IA', 'E-mails aux clients', 'Installer l\'application', 'Le lien de connexion de ton entreprise', 'Mes envois', 'Mon e-mail professionnel', 'Notifications', 'Synchronisation de l\'équipe']);
    /* la VRAIE fonction, sur des cartes qui portent les titres tels que l'application les écrit (pictogramme devant) */
    const cartes = ['⚙️ Contrôle des mouvements', 'Mon compte', '🔔 Notifications', '💼 Mon e-mail professionnel', 'Apparence', 'Forfait de l\'espace', 'Sauvegarde & synchronisation', '✨ Devis IA', 'Comptabilité',
      'Installer l\'application', 'Synchronisation de l\'équipe', '🔗 Le lien de connexion de ton entreprise', 'Mon entreprise', 'Mes envois', '✉️ E-mails aux clients', 'Mise à jour'].map(t => ({ t, ote: false, html: null }));
    const mkCarte = c => ({ parentNode: { removeChild: () => { c.ote = true; } }, querySelector: () => ({ textContent: c.t }), set innerHTML(v) { c.html = v; } });
    const objets = cartes.map(mkCarte);
    const contenu = { querySelectorAll: () => objets };
    const bp = bac('demo.html', ['demoPubliqueParametres'], { document: { getElementById: () => contenu }, DEMO_PARAM_RETIREES: RETIREES, DEMO_PARAM_FORFAIT: FORFAIT });
    bp.fn.demoPubliqueParametres();
    egal('⛔ Paramètres : seules les 8 cartes à serveur / boîte mail sont retirées', cartes.filter(c => c.ote).map(c => c.t.replace(/^[^A-Za-zÀ-ÿ]+/, '')).sort(), RETIREES.slice().sort());
    vrai('la carte « Forfait de l\'espace » est réécrite (formule de démonstration, tarifs) : plus d\'abonnement, de « Business Premium » ni de « 10 abonnements »', (() => { const f = cartes.find(c => c.t === 'Forfait de l\'espace'); return !f.ote && /toutes les rubriques sont ouvertes/.test(f.html) && /Aucun abonnement n’existe ici/.test(f.html) && !/Business|abonnements|Activer/.test(f.html.replace(/Aucun abonnement/, '')); })());
    vrai('les autres cartes (Mon compte, Apparence, Sauvegarde, Comptabilité, Mon entreprise, Mise à jour…) restent intactes', cartes.filter(c => !c.ote && c.t !== 'Forfait de l\'espace').length === cartes.length - RETIREES.length - 1 && cartes.filter(c => !c.ote && c.html !== null && c.t !== 'Forfait de l\'espace').length === 0);
    /* le crochet : views.parametres est enveloppée UNE fois, rend ce que rend l'originale, puis retouche */
    let rendus = 0, retouches = 0; const views = { parametres: function () { rendus++; return 'RENDU'; } };
    const bq = bac('demo.html', ['demoPubliqueParametresPoser'], { views, demoPubliqueParametres: () => { retouches++; } });
    bq.fn.demoPubliqueParametresPoser(); bq.fn.demoPubliqueParametresPoser();
    vrai('views.parametres est enveloppée UNE seule fois (poser deux fois ne double pas) ; elle rend le rendu de l\'originale et retouche l\'écran juste derrière', views.parametres() === 'RENDU' && rendus === 1 && retouches === 1);
    vrai('… et demoPubliqueBouchons pose ce crochet', fonction(N, 'demoPubliqueBouchons').indexOf('demoPubliqueParametresPoser()') > 0);

    /* Assistant devis : plus de « Code d'accès requis » */
    const els = {}; const el = id => (els[id] = els[id] || { innerHTML: '' });
    const ba = bac('demo.html', ['demoPubliqueAssistantDevis'].concat([]), { document: { getElementById: el } });
    ba.fn.demoPubliqueAssistantDevis();
    vrai('l\'assistant devis dit ce qu\'il en est dans la démonstration — ni « Code d\'accès requis », ni « Demande le code au responsable »', /Dans la démonstration, l’assistant ne répond pas/.test(els.content.innerHTML) && !/Code d'accès|Demande le code/.test(els.content.innerHTML) && /go\('devis'\)/.test(els.content.innerHTML));
    const av = bac('demo.html', ['demoPubliqueAssistantDevis'], { document: { getElementById: el } }, ['views.assistantDevis=function(){']);
    vrai('(le code) views.assistantDevis rend la main à la démonstration AVANT la branche du code d\'accès', (() => { const f = N.slice(N.indexOf('views.assistantDevis=function(){')); return f.indexOf('if(DEMO_PUBLIQUE){ demoPubliqueAssistantDevis(); return; }') > 0 && f.indexOf('if(DEMO_PUBLIQUE){ demoPubliqueAssistantDevis(); return; }') < f.indexOf('if(!adCode()){'); })() && typeof av.fn === 'object');

    /* Devis IA : la VRAIE devisIAGo ne part plus vers le serveur et ne dit pas « Le serveur ne répond pas » */
    const jeu = drapeau => {
      const e = {}; const elx = id => (e[id] = e[id] || { style: {}, value: '', textContent: '', disabled: false });
      elx('dia-demande').value = 'Remplacement d\'un chauffe-eau de 200 L'; let fetches = 0;
      const bg = bac('demo.html', ['devisIAGo', 'demoPubliqueDevisIAMessage'], { DEMO_PUBLIQUE: drapeau, $: elx, can: () => true, permGarde: () => true, clientPropose: () => true, devisIACode: () => '', PUSH_API: 'https://api.teamop.fr', syncTeam: () => '',
        fetch: () => { fetches++; return Promise.reject(new TypeError('refusé')); }, uid: () => 'u1', db: { devis: [] }, toast: () => { } });
      return bg.fn.devisIAGo(false).then(() => ({ e, fetches }));
    };
    const dd = await jeu(true), dn = await jeu(false);
    vrai('⛔ Devis IA : la VRAIE devisIAGo() de la démonstration n\'appelle AUCUN serveur et dit pourquoi (« rien n\'est envoyé ») — pas « Le serveur ne répond pas »', dd.fetches === 0 && /Dans la démonstration, la rédaction par l’IA n’est pas branchée/.test(dd.e['dia-err'].textContent) && !/serveur ne répond pas/.test(dd.e['dia-err'].textContent), dd.e['dia-err']);
    vrai('(contre-épreuve) sans le drapeau, la même fonction appelle le serveur et affiche son échec — le banc la fait bien entrer jusque-là', dn.fetches === 1 && /Le serveur ne répond pas/.test(dn.e['dia-err'].textContent), dn.e['dia-err']);
    vrai('la fenêtre « Devis IA » ne demande pas son état au serveur dans la démonstration (une phrase à la place)', /if\(DEMO_PUBLIQUE\) demoPubliqueDevisIAEtat\(\); else fetch\(PUSH_API\+'\/api\/devis\/etat\?team='/.test(N));
    vrai('le bandeau annonce ce qui ne marche pas ici : l\'IA, la synchro, le courrier — et que toutes les rubriques sont ouvertes', /Toutes les rubriques sont ouvertes ; l’IA, la synchro et le courrier ne fonctionnent pas ici/.test(MODULE));
  }

  console.log('\n   — les fenêtres vides (impression, PDF) ne tiennent que par la politique de contenu héritée : on garde cette politique, directive par directive');
  vrai('default-src \'none\', connect-src data: blob:, form-action \'none\', object-src et frame-src sans hôte : ce qu\'une fenêtre vide hérite', (DIRECTIVES['default-src'] || []).join() === '\'none\'' && (DIRECTIVES['connect-src'] || []).join() === 'data:,blob:'
    && (DIRECTIVES['form-action'] || []).join() === '\'none\'' && (DIRECTIVES['frame-src'] || []).every(x => /^(blob|data):$/.test(x)) && (DIRECTIVES['object-src'] || []).every(x => /^(blob|data):$/.test(x)));
  vrai('et pare-feu.js DIT que ces fenêtres n\'ont pas son pare-feu (une note, pour qu\'un gabarit neuf n\'y compte pas)', /fenêtres VIDES[\s\S]{0,400}n'ont PAS ce pare-feu/.test(PARE));
  { const sw = lire('sw.js');
    /* ⛔ PRÉREQUIS DE PUBLICATION, compté depuis la mise en ligne de la démonstration (23 octobre 2026) : le worker ignore /demo.html AVANT
       toute mise en cache (comme /beta.html), dans le code et pas dans un commentaire — sinon il rangerait la démonstration (4 Mo) dans le cache de
       la VRAIE application et annoncerait « Nouvelle version prête » aux clients. */
    const swCode = sw.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const iDemo = swCode.indexOf("if (url.pathname.endsWith('/demo.html')) return;"), iDoc = swCode.indexOf('const isDoc');
    vrai('⛔ sw.js ignore /demo.html avant toute mise en cache (comme la bêta)', iDemo > 0 && iDoc > 0 && iDemo < iDoc); }
  suite();
})().catch(e => { ko++; console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); finir(); });

/* ── 5. L'ACCORD AVEC LE SITE, ET LES FICHIERS ─────────────────────────────────────────────────────────────────────────────── */
function suite() {
  console.log('\n5. Les métiers proposés : ceux que le site ouvre, ni plus ni moins');
  const METIERS = evalue(litteral(N, 'const METIERS={')), ORDRE = evalue(litteral(N, 'const METIERS_ORDRE=['));
  const CONSTS = {}; (MODULE.match(/^const DEMO_\w+ = .*;$/gm) || []).forEach(l => { const [, nom, v] = /^const (DEMO_\w+) = (.*);$/.exec(l); CONSTS[nom] = vm.runInNewContext('(' + v + ')'); });
  const { DEMO_SCENARIOS, DEMO_SCENARIO_DEFAUT } = new Function(SCEN + '\nreturn {DEMO_SCENARIOS,DEMO_SCENARIO_DEFAUT};')();
  vrai('le fichier de scénarios est recopié TEL QUEL dans demo.html, comme le module et le pare-feu', DEMO.indexOf(SCEN) > 0 && DEMO.indexOf(MODULE) > 0 && DEMO.indexOf(PARE) > 0);
  egal('⛔ la liste des métiers FERMÉS de la démonstration est celle que tests/metiers-publics.js nomme « pas encore ouverts » (quand le site les ouvre, les deux se vident ensemble)', CONSTS.DEMO_METIERS_FERMES, PUBLICS.PAS_ENCORE_OUVERTS);
  const OUVERTS = ORDRE.filter(k => CONSTS.DEMO_METIERS_FERMES.indexOf(k) < 0);
  vrai('(population) 24 métiers dans l\'application ; proposés + fermés = 24, et les fermés sont ceux que le site n\'ouvre pas', ORDRE.length === 24 && OUVERTS.length + CONSTS.DEMO_METIERS_FERMES.length === 24 && OUVERTS.length >= 13);
  egal('chaque métier proposé a SON exemple ; aucun exemple pour un métier fermé (pas de donnée écrite pour rien)', [OUVERTS.filter(k => !DEMO_SCENARIOS[k]), Object.keys(DEMO_SCENARIOS).filter(k => OUVERTS.indexOf(k) < 0)], [[], []]);

  console.log('\n6. Le vrai semis, pour chaque métier (les vraies fonctions de l\'application et du module)');
  const lignesDe = re => (APP.match(re) || [''])[0];
  const norm = new Function('return ' + lignesDe(/^const norm = (.*);$/m).replace(/^const norm = /, '').replace(/;$/, ''))();
  const isoDe = new Function('return ' + lignesDe(/^const isoDe = (.*);$/m).replace(/^const isoDe = /, '').replace(/;$/, ''))();
  const todayISO = () => isoDe(new Date());
  const COLLECTIONS = evalue(litteral(N, 'const COLLECTIONS_DONNEES=['));
  const INT_TYPES = evalue(litteral(N, 'const INT_TYPES = ['));
  const CAT_LIST = evalue(litteral(N, 'const CAT_LIST=['));
  /* 28 depuis le chauffage / climatisation (`appareils`, le parc d'appareils par client), 31 depuis le modèle des documents du métier (`docsMetier`), 30 depuis le pack nettoyage (`cahiers`, `plansPrevention`) : le semis de la démonstration publique n'en pose pas encore */
  vrai('(population) 31 collections de données dans l\'application (appareils, cahiers, plans de prévention et documents du métier compris) et 8 catégories historiques', COLLECTIONS.length === 31 && COLLECTIONS.includes('appareils') && CAT_LIST.length === 8 && INT_TYPES.length >= 10);
  let c = 0; const uid = () => 'u' + (++c);
  const NOMS = ['demoPubliqueSemer', 'metierServeurAppliquer', 'metierId', 'metierPack', 'metiersPlusDe', 'metierPackDe', 'intTypes', 'categoriesProduit', 'produitCreer', 'idProduit', 'idCatalogue', 'slugNom', 'produitMemeNom', 'empreinteNom', 'produitCle', 'intNum', 'nextNum', 'numPlafond', 'shiftDay', 'demoTel', 'demoPubliqueJourOuvre'];
  const monde = () => {
    const db = {}; COLLECTIONS.forEach(k => { db[k] = []; }); db.users = []; db.produits = [];
    const traces = { save: 0, journal: [] };
    return { db, traces, b: bac('demo.html', NOMS, Object.assign({ db, METIERS, METIERS_ORDRE: ORDRE, INT_TYPES, CAT_LIST, COLLECTIONS_DONNEES: COLLECTIONS, norm, isoDe, todayISO, uid }, CONSTS,
      { DEMO_SCENARIOS, DEMO_SCENARIO_DEFAUT, currentUser: null, current: '', views: {}, save: () => { traces.save++; }, logEvent: (a, d) => { traces.journal.push(a); }, renderNav: () => { }, toast: () => { }, ombreRelever: () => { } })) };
  };
  const MOTS_3D = /d[ée]ratis|d[ée]sinsect|punaise|rongeur|nuisible|blatte|frelon|gu[êe]pe|rodenticide|insecticide|xylophag|certibiocide|biocide|souris|\brats?\b/i;
  const TYPES_3D_SEULS = INT_TYPES.filter(t => !OUVERTS.some(k => k !== '3d' && (METIERS[k].types || []).indexOf(t) >= 0));
  const rapports = {};
  [...OUVERTS, ...ORDRE.filter(k => OUVERTS.indexOf(k) < 0)].forEach(k => {
    const { db, traces, b } = monde(); const fn = b.fn;
    const fait = fn.demoPubliqueSemer(k);
    const P = METIERS[k], T = fn.intTypes(), cats = fn.categoriesProduit();
    const tout = JSON.stringify([db.techniciens, db.clients, db.interventions, db.produits, db.devis, db.factures, db.contrats, db.fournisseurs, db.vehicules, db.entreprise]);
    const f = [];   // les fautes de ce métier
    if (!fait) f.push('le semis rend faux');
    if (db.metier !== k) f.push('db.metier = ' + db.metier);
    if (!(db.techniciens.length === 3 && db.clients.length >= 5 && db.clients.length <= 7)) f.push('population : ' + db.techniciens.length + ' techniciens, ' + db.clients.length + ' clients');
    if (db.interventions.length < 10) f.push('moins de 10 interventions');
    if (db.interventions.some(i => T.indexOf(i.type) < 0)) f.push('type hors du métier : ' + db.interventions.filter(i => T.indexOf(i.type) < 0).map(i => i.type).join(' / '));
    if (k !== '3d' && db.interventions.some(i => TYPES_3D_SEULS.indexOf(i.type) >= 0)) f.push('type propre à l\'anti-nuisibles');
    if (db.produits.some(p => cats.indexOf(p.categorie) < 0)) f.push('catégorie hors de la liste du métier : ' + db.produits.filter(p => cats.indexOf(p.categorie) < 0).map(p => p.categorie).join(' / '));
    /* « EPI » et « Matériel » sont des catégories de TOUS les métiers (test-2902) : seules les six propres à l'anti-nuisibles comptent */
    const PROPRES_3D = CAT_LIST.filter(c => ['EPI', 'Matériel'].indexOf(c) < 0);
    if (k === '3d' ? db.produits.some(p => CAT_LIST.indexOf(p.categorie) < 0) : db.produits.some(p => PROPRES_3D.indexOf(p.categorie) >= 0)) f.push('catégorie de l\'anti-nuisibles hors 3D (ou hors CAT_LIST en 3D)');
    if (k !== '3d' && MOTS_3D.test(tout)) f.push('un mot de l\'anti-nuisibles : ' + (MOTS_3D.exec(tout) || [])[0]);
    if (db.produits.length < 4 || db.produits.some(p => p.cree !== 0 || !p.demo)) f.push('produits : < 4, ou pas posés comme semis (cree 0)');
    if (db.clients.some(x => !/@exemple\.invalid$/.test(x.email) || !/^01 99 00 \d\d \d\d$/.test(x.tel))) f.push('courriel ou téléphone joignable');
    if (db.clients.some(x => /\d/.test(x.adresse))) f.push('un numéro de rue');
    if (db.users.length !== 1 || db.users[0].role !== 'admin' || db.users[0].id !== 'demo-admin' || !/@exemple\.invalid$/.test(db.users[0].email)) f.push('administrateur fictif');
    if (/@(?!exemple\.invalid)\w/.test(tout.replace(/@[^"]*\.invalid/g, ''))) f.push('une adresse e-mail réelle');
    const marqueurs = ['techniciens', 'clients', 'interventions', 'produits', 'devis', 'factures', 'contrats', 'fournisseurs', 'vehicules'];
    if (marqueurs.some(m => !db[m].length || db[m].some(x => x.demo !== 1))) f.push('un enregistrement sans demo:1 (ou une collection vide)');
    const nums = [].concat(db.interventions.map(i => i.num), db.devis.map(i => i.num), db.factures.map(i => i.num), db.contrats.map(i => i.num));
    if (new Set(nums).size !== nums.length) f.push('numéros en double');
    if (db.devis.length < 3 || db.factures.length < 3 || [...db.devis, ...db.factures].some(d => !d.lignes.length || d.lignes.some(l => !l.designation || !(l.pu > 0)))) f.push('devis / factures vides');
    const ids = new Set(); [...marqueurs].forEach(m => db[m].forEach(x => ids.add(x.id)));
    if (ids.size !== marqueurs.reduce((s, m) => s + db[m].length, 0)) f.push('identifiants en double');
    const st = new Set(db.interventions.map(i => i.statut));
    if (!['terminee', 'encours', 'planifiee', 'aplanifier'].every(s => st.has(s))) f.push('statuts : ' + [...st].join(','));
    const ecart = db.interventions.filter(i => i.date).map(i => Math.round((new Date(i.date + 'T00:00:00') - new Date(todayISO() + 'T00:00:00')) / 864e5));
    /* quatre jours OUVRÉS avant et après : au plus 6 jours de calendrier (un vendredi → jeudi suivant, un lundi → jeudi précédent) */
    if (Math.min(...ecart) < -4 || Math.max(...ecart) > 6) f.push('des interventions hors de la semaine : ' + Math.min(...ecart) + '…' + Math.max(...ecart));
    const WE = db.interventions.filter(i => i.date && i.date !== todayISO() && [0, 6].indexOf(new Date(i.date + 'T00:00:00').getDay()) >= 0);
    if (WE.length) f.push('une intervention un samedi ou un dimanche : ' + WE.map(i => i.date).join(','));
    if (db.forfait !== 'premium' || db.forfaitQty < 5) f.push('forfait');
    if (!db.demoPublique || db.demoPublique.metier !== k) f.push('marque de semis absente');
    if (traces.save < 1) f.push('rien n\'est rangé (save)');
    /* une base ni plus grosse que 200 Ko : elle vit dans le rangement d'un téléphone (5 Mo partagés par toute l'origine) */
    if (JSON.stringify(db).length > 200000) f.push('base trop lourde : ' + Math.round(JSON.stringify(db).length / 1024) + ' Ko');
    /* le semis rejoué REMPLACE : pas de doublon à la deuxième passe */
    const n1 = marqueurs.map(m => db[m].length).join(','); fn.demoPubliqueSemer(k); const n2 = marqueurs.map(m => db[m].length).join(',');
    if (n1 !== n2) f.push('un second semis double la base : ' + n1 + ' → ' + n2);
    /* les scénarios eux-mêmes : les types écrits existent bien dans le métier (une faute de frappe serait remplacée en silence) */
    const sc = DEMO_SCENARIOS[k]; if (sc) {
      const tp = (sc.types || []).filter(t => T.indexOf(t) < 0); if (tp.length) f.push('scénario : type inconnu du métier : ' + tp.join(' / '));
      if (sc.cli.length !== 6 || new Set(sc.cli.map(x => x[0])).size !== 6) f.push('scénario : 6 clients différents attendus');
      if (sc.prod.some(p => p[1] >= cats.length)) f.push('scénario : indice de catégorie hors liste');
      if (sc.fonc.length !== 3) f.push('scénario : trois fonctions');
    }
    const libres = [...b.vus].filter(x => !['uid', 'db', 'current'].includes(x));
    if (libres.length) f.push('noms muets (une dépendance oubliée du banc) : ' + libres.join(','));
    rapports[k] = { f, n: db.interventions.length };
    egal((OUVERTS.indexOf(k) >= 0 ? 'métier proposé' : 'métier fermé (le semis tient aussi)') + ' « ' + k + ' » : ' + db.techniciens.length + ' techniciens, ' + db.clients.length + ' clients, ' + db.interventions.length + ' interventions, ' + db.produits.length + ' produits, '
      + db.devis.length + ' devis, ' + db.factures.length + ' factures — tous aux types, catégories et mots du métier', f, []);
  });
  vrai('(population) 24 métiers semés, dont ' + OUVERTS.length + ' proposés', Object.keys(rapports).length === 24);
  /* la contre-épreuve du détecteur de mots : il VOIT l'anti-nuisibles quand on en pose un */
  { const { db, b } = monde(); b.fn.demoPubliqueSemer('plomberie'); db.interventions[0].titre = 'Dératisation'; vrai('(contre-épreuve) le détecteur de mots de l\'anti-nuisibles voit une dératisation posée chez un plombier', MOTS_3D.test(JSON.stringify(db.interventions))); }
  { const { db, b } = monde(); b.fn.demoPubliqueSemer('3d'); vrai('(contre-épreuve) la 3D, elle, garde ses types (Dératisation…) : le semis ne vide pas le métier d\'origine', db.interventions.some(i => /Dératisation|Désinsectisation/.test(i.type))); }

  console.log('\n6 bis. Les fonctions de l\'application que la démonstration coupe');
  { const COUPEES = evalue(litteral(MODULE, 'const DEMO_FONCTIONS_COUPEES = ['));
    vrai('(population) ' + COUPEES.length + ' fonctions coupées, chacune DÉCLARÉE dans app.html (un renommage la sortirait de la liste en silence)', COUPEES.length >= 14 && COUPEES.every(n => fonction(nu(APP), n).length > 20), COUPEES.filter(n => !fonction(nu(APP), n)));
    const appels = []; const w = { location: { href: 'http://127.0.0.1/demo.html' } };
    const ASYNC = COUPEES.filter(n => new RegExp('async function ' + n + '\\(').test(nu(APP)));
    vrai('(population) ' + ASYNC.length + ' fonctions coupées sont `async` dans app.html (dont syncInit : `syncInit().then(…)` attend une promesse)', ASYNC.length >= 3 && ASYNC.indexOf('syncInit') >= 0, ASYNC);
    COUPEES.concat(['syncNow', 'syncEtat', 'srvMail', 'logout']).forEach(n => { w[n] = ASYNC.indexOf(n) >= 0 ? async function () { appels.push(n); return 'ORIGINAL'; } : function () { appels.push(n); return 'ORIGINAL'; }; });
    const toasts = []; const b = bac('demo.html', ['demoPubliqueBouchons'], Object.assign({ window: w, location: w.location, DEMO_FONCTIONS_COUPEES: COUPEES, DEMO_MSG: CONSTS.DEMO_MSG, toast: m => toasts.push(m), _srvMailErr: '' }));
    b.fn.demoPubliqueBouchons();
    const rendus = {}; COUPEES.forEach(n => { rendus[n] = w[n](); });
    egal('⛔ chaque fonction coupée ne fait plus rien (elle ne rend plus ce que rendait l\'originale, et ne se déclenche pas)', COUPEES.filter(n => rendus[n] === 'ORIGINAL' || (rendus[n] && rendus[n].then && ASYNC.indexOf(n) < 0)), []);
    egal('⛔ une fonction coupée `async` rend une PROMESSE (comme l\'originale), pas `undefined` : `syncInit().then(…)` levait une TypeError', ASYNC.filter(n => !(rendus[n] && typeof rendus[n].then === 'function')), []);
    { const bs = bac('app.html', ['syncReactivate'], { localStorage: { removeItem: () => { } }, toast: () => { }, syncInit: w.syncInit, current: 'x', views: {} });
      let err = null; try { bs.fn.syncReactivate(); } catch (e) { err = e; }
      vrai('la VRAIE syncReactivate() d\'app.html, jouée sur le bouchon de syncInit, ne lève plus', err === null && COUPEES.indexOf('syncReactivate') >= 0, String(err)); }
    (async () => {
      const r = await w.srvMail('client@exemple.invalid', 'Devis', 'Bonjour');
      vrai('⛔ srvMail rend faux — le document RESTE un brouillon (envoiDoc ne marque « envoyé » que sur un vrai) — et le dit', r === false && toasts.some(t => t.indexOf(CONSTS.DEMO_MSG) >= 0) && w.location.href === 'http://127.0.0.1/demo.html', toasts);
      w.logout(); vrai('« Déconnexion » sort vers le site (il n\'y a pas de compte à quitter) et ne rouvre aucun écran de connexion', w.location.href === 'index.html');
      vrai('« Synchroniser » dit qu\'il n\'y a pas d\'équipe, sans rien envoyer ; l\'état de la synchro se dit « Démonstration »', (() => { w.syncNow(); return /Démonstration|démonstration/.test(w.syncEtat().t) && toasts.some(t => /pas d’équipe/.test(t)); })());
      fin7();
    })();
    return;
  }
  fin7();
}
function fin7() {
  console.log('\n7. Les fichiers : syntaxe, assemblage du site');
  { const r = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'verifier-syntaxe.js')], { encoding: 'utf8' });
    vrai('scripts/verifier-syntaxe.js contrôle demo.html (il lit toutes les pages de la racine) et passe', r.status === 0 && /pages, \d+ blocs/.test(r.stdout) && fs.readdirSync(RACINE).indexOf('demo.html') >= 0, r.stdout + r.stderr);
    const blocs = (DEMO.match(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/g) || []); let bon = 0; blocs.forEach(x => { try { new Function(x.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')); bon++; } catch (e) { /* compté plus bas */ } });
    vrai('(population) les ' + blocs.length + ' blocs <script> de demo.html se compilent', blocs.length >= 5 && bon === blocs.length); }
  { const asm = lire('scripts/assembler-site.sh');
    vrai('assembler-site.sh publie demo.html (toute page .html de la racine) et laisse demo-build.js dans le dépôt (un outil, pas une page), comme beta-build.js', /demo-build\.js\) continue/.test(asm) && /beta-build\.js\) continue/.test(asm) && /\*\.html \*\.js/.test(asm)); }
  { const robots = lire('robots.txt'), plan = lire('sitemap.xml');
    vrai('demo.html n\'est PAS dans le plan du site (aucune page de la démonstration n\'est proposée aux moteurs : elle est noindex, et robots.txt ne la cache pas — un robot doit pouvoir lire le noindex)',
      plan.indexOf('demo') < 0 && robots.indexOf('demo.html') < 0); }
  /* Justin : « le lien de la démo sur le site ». Le lien vit sur l'ACCUEIL et les TARIFS (ajoutés le 23 octobre 2026 : l'accueil n'y menait qu'en
     deux clics), sur OP GESTION, Métiers et chaque page métier — lu dans les pages PUBLIÉES (sorties de scripts/site-marine.js), sur la forme du code. */
  { const LIEN = '<a class="lien-suite" href="/demo.html">Essayer la démonstration ›</a>';
    const pages = ['index.html', 'tarifs.html', 'op-gestion.html', 'metiers.html'].concat(fs.readdirSync(RACINE).filter(f => /^logiciel-[\w-]+\.html$/.test(f)).sort());
    vrai('(population) l\'accueil, les tarifs, OP GESTION, Métiers et ' + (pages.length - 4) + ' pages métier sont lus', pages.length >= 14 && pages.every(f => fs.existsSync(path.join(RACINE, f))));
    egal('⛔ chacune porte le lien « Essayer la démonstration › » vers /demo.html', pages.filter(f => lire(f).indexOf(LIEN) < 0), []);
    egal('   … et l\'aperçu du site aussi', pages.filter(f => fs.existsSync(path.join(RACINE, 'apercu', 'site', f)) && lire('apercu/site/' + f).indexOf('Essayer la démonstration ›') < 0), []); }
  finir();
}
function finir() {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* idem */ }
  console.log('\n════ test-2940 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
}
