/* ══ test-2985 · LES PAGES DE TEST — LE VRAI scripts/essais-build.js SUR LES VRAIS FICHIERS DU DÉPÔT ═══════════════════════════════════════
   23 octobre 2026 (Justin : « toute modification, site, application, la Tour, je veux des espaces de test, et après on pousse »).
   test.teamop.fr sert des copies des vraies pages, pointées sur un serveur de test. ⛔ LE PIRE DÉFAUT POSSIBLE : une page de test qui
   écrirait dans les données de production. Ce banc EXÉCUTE la fabrication (dans un dossier temporaire) et relit TOUT ce qui en sort :
   · aucune adresse de production ne subsiste (api.teamop.fr, teamop.fr, services -beta, Firebase, Analytics, service worker) — et la
     POPULATION est comptée d'abord : les sources en portent des dizaines, un « zéro » sur des pages qui n'en avaient pas ne prouverait rien ;
   · app.html de test a son préfixe elanT_ (aucune clé « elan_ » dans le CODE), son FB_TEAM, sa version « -essai », BETA_ESSAI faux, le mot
     de passe et le sel de chiffrement intacts ; la Tour ne joint ni OP Courrier ni OP MESSAGES ; connexion.html et recap-abonnement.html, qui
     posent les clés de l'application, suivent le préfixe ;
   · chaque page porte le bandeau, noindex, « [TEST] », le script du fragment (sauf demo.html), le jeu de caractères avant lui, pas de manifeste ;
   · le dépôt est INCHANGÉ (git status avant/après), la clé d'essais n'est ni affichée ni écrite ailleurs que dans essais.html/courriels.html ;
   · chaque garde est ÉPROUVÉE EN LA RETIRANT : un motif ôté d'une copie du dépôt (ESSAIS_RACINE) doit faire échouer la fabrication en nommant la
     garde, et le générateur lui-même, mutilé, est rattrapé par la dernière passe (qui relit tout) et vide le dossier.
   Ce que ce banc NE VOIT PAS — et que la sonde `scratchpad/sonde-essais.js` mesure au navigateur, contre un faux serveur de test en HTTPS
   (résolution de test.teamop.fr vers 127.0.0.1) : que « Se connecter comme client » ouvre Mon espace connecté, que courriels.html affiche
   un courriel avec son lien cliquable, qu'app.html écrit sous elanT_, et qu'aucune requête ne part ailleurs que vers test.teamop.fr.
   Dernière passe de la sonde (23/10/2026, Chromium 141) : 43 ✓ 0 ✗. Le script injecté est exécuté par test-2986.                                */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const { spawnSync } = require('child_process');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

const RACINE = path.join(__dirname, '..');
const BUILD = path.join(RACINE, 'scripts', 'essais-build.js');
const CLE = crypto.randomBytes(32).toString('hex');          // tirée à chaque exécution : elle n'est donc écrite dans aucun fichier du dépôt
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'essais2985-'));
let n = 0;
const neuf = () => path.join(TMP, 'sortie-' + (++n));
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const git = a => spawnSync('git', a, { cwd: RACINE, encoding: 'utf8' }).stdout;

function construire(sortie, o) {
  const opt = o || {};
  const env = Object.assign({}, process.env); delete env.ESSAIS_CLE; delete env.TEAMOP_CONFIG; delete env.ESSAIS_RACINE; delete env.ESSAIS_PARCOURS;
  if (!opt.sansCle) env.ESSAIS_CLE = opt.cle || CLE;
  if (opt.racine) env.ESSAIS_RACINE = opt.racine;
  return spawnSync(process.execPath, [opt.script || BUILD, sortie, opt.commit || 'abcdef1234', opt.branche || 'claude/essai-banc'].concat(opt.args || []), { encoding: 'utf8', env, timeout: 120000 });
}
/* une copie du dépôt où des fichiers sont réécrits (les autres sont des liens) : la fabrication la lit à la place du vrai dépôt */
function racineMutee(muts) {
  const R = path.join(TMP, 'racine-' + (++n)); fs.mkdirSync(R);
  const ecartes = new Set(['.git', '.claude', 'tests', 'scratchpad', 'server', 'server-msg', 'server-courrier', 'apercu', 'design', 'node_modules']);
  for (const e of fs.readdirSync(RACINE)) {
    if (ecartes.has(e)) continue;
    if (Object.prototype.hasOwnProperty.call(muts, e)) {
      if (muts[e] === null) continue;                                   // le fichier disparaît
      const avant = lire(e), apres = muts[e](avant);
      if (apres === avant) throw new Error('la mutation de ' + e + ' ne change RIEN — une mutation qui ne touche pas ne prouve rien');
      fs.writeFileSync(path.join(R, e), apres);
    } else fs.symlinkSync(path.join(RACINE, e), path.join(R, e));
  }
  return R;
}
const lireSortie = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');
const nu = s => s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function fichiers(dossier, re) { const r = []; (function m(rel) { for (const e of fs.readdirSync(path.join(dossier, rel), { withFileTypes: true })) { const p = path.join(rel, e.name); if (e.isDirectory()) m(p); else if (!re || re.test(e.name)) r.push(p); } })(''); return r; }

/* ── 0. LA POPULATION : ce que les sources portent, avant de compter les absences ─────────────────────────────────────────────────────────── */
console.log('\n0. La population des sources (un zéro n\'a de sens que s\'il y avait de quoi compter)');
const PORTE = { 'app.html': 3, 'espace.html': 12, 'connexion.html': 3, 'recap-abonnement.html': 2, 'reinit.html': 1, 'tour.html': 1 };
for (const [f, min] of Object.entries(PORTE)) vrai(f + ' porte au moins ' + min + ' fois « https://api.teamop.fr » à la source', (lire(f).match(/https:\/\/api\.teamop\.fr/g) || []).length >= min, (lire(f).match(/https:\/\/api\.teamop\.fr/g) || []).length);
vrai('app.html porte plus de 100 clés « elan_ » à la source', (lire('app.html').match(/(?<![A-Za-z0-9])elan_(?=[A-Za-z])/g) || []).length > 100);
vrai('tour.html porte COURRIER_SRV, BETA_MSG_ADRESSE et 4 liens Stripe à la source', /var COURRIER_SRV='https:\/\/courrier-beta\.teamop\.fr'/.test(lire('tour.html')) && /var BETA_MSG_ADRESSE='https:\/\/msg-beta\.teamop\.fr'/.test(lire('tour.html')) && (lire('tour.html').match(/https:\/\/dashboard\.stripe\.com\//g) || []).length >= 4);
vrai('cookies.js charge bien Google Analytics à la source', /googletagmanager\.com\/gtag\/js/.test(lire('cookies.js')));
vrai('app.html enregistre bien un service worker à la source', /navigator\.serviceWorker\.register\('sw\.js'\)/.test(lire('app.html')));

/* ── 1. LA FABRICATION ───────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n1. Le vrai générateur, sur le vrai dépôt');
const avantGit = git(['status', '--porcelain']);
const OUT = neuf();
const r1 = construire(OUT);
vrai('la fabrication réussit (code 0)', r1.status === 0, (r1.stderr || '').slice(0, 400));
vrai('⛔ le dépôt est INCHANGÉ (git status avant = après)', git(['status', '--porcelain']) === avantGit);
vrai('⛔ la clé d\'essais n\'est ni affichée ni écrite dans la sortie du générateur', (r1.stdout + r1.stderr).indexOf(CLE) < 0);
if (r1.status !== 0) { console.log('\n════ test-2985 : ' + ok + ' ✓  ' + ko + ' ✗ ════'); process.exit(1); }

const ABSENTES = ['beta.html', 'dev.html', 'messages.html', 'messages-beta.html', 'diag-geste.html', 'google151be914dcdfaf7e.html'];
const sourcesHtml = fs.readdirSync(RACINE).filter(f => /\.html$/.test(f));
const attendues = sourcesHtml.filter(f => ABSENTES.indexOf(f) < 0);
const sorties = fs.readdirSync(OUT).filter(f => /\.html$/.test(f));
vrai('(population) ' + attendues.length + ' pages du dépôt sont attendues (plus de 30)', attendues.length > 30, attendues.length);
egal('exactement les pages du dépôt, moins les canaux à part, plus essais.html et courriels.html', sorties.sort(), attendues.concat(['essais.html', 'courriels.html']).sort());
egal('les six canaux à part sont ABSENTS', ABSENTES.filter(f => fs.existsSync(path.join(OUT, f))), []);
egal('ni service worker, ni manifeste, ni aperçu, ni référentiel de travail dans la sortie', ['sw.js', 'manifest.webmanifest', 'manifest-teamop.webmanifest', 'apercu', 'metiers.json', 'op-fs.js'].filter(f => fs.existsSync(path.join(OUT, f))), []);
vrai('les ressources chargées par les pages y sont (opcourrier.js, cookies.js, icons/, vitrine/v2/site.css, sons/, robots.txt, essai.json)',
  ['opcourrier.js', 'cookies.js', 'icons/teamop-192.png', 'vitrine/v2/site.css', 'sons/message.mp3', 'robots.txt', 'essai.json', 'rubriques-choix.js', 'rubriques-choix.css'].every(f => fs.existsSync(path.join(OUT, f))));
egal('robots.txt interdit tout', lireSortie(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
{ const j = JSON.parse(lireSortie(OUT, 'essai.json')); vrai('essai.json dit le commit et la branche (sans la clé)', j.commit === 'abcdef1234' && j.branche === 'claude/essai-banc' && JSON.stringify(j).indexOf(CLE) < 0, j); }

/* ── 2. AUCUNE ADRESSE DE PRODUCTION NE SUBSISTE ──────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n2. Aucune adresse de production ne subsiste');
const TEXTES = fichiers(OUT, /\.(html|js|css|json|txt)$/);
vrai('(population) plus de 50 fichiers texte sont relus', TEXTES.length > 50, TEXTES.length);
const INTERDITS = [['https://api.teamop.fr', /https:\/\/api\.teamop\.fr/], ['api.teamop.fr nu', /(?<![A-Za-z0-9-])api\.teamop\.fr/], ['https://teamop.fr', /https:\/\/teamop\.fr/], ['https://www.teamop.fr', /https:\/\/www\.teamop\.fr/],
  ['//api.teamop.fr', /\/\/api\.teamop\.fr/], ['courrier-beta en adresse', /https?:\/\/courrier-beta\.teamop\.fr/], ['msg-beta en adresse', /https?:\/\/msg-beta\.teamop\.fr/], ['msg.teamop.fr en adresse', /https?:\/\/msg\.teamop\.fr/],
  ['firestore.googleapis.com', /firestore\.googleapis\.com/], ['identitytoolkit', /identitytoolkit\.googleapis/], ['inscription de service worker', /navigator\.serviceWorker\.register\(/]];
for (const [nom, re] of INTERDITS) egal('⛔ aucun fichier ne porte « ' + nom + ' »', TEXTES.filter(f => re.test(lireSortie(OUT, f))), []);
for (const f of Object.keys(PORTE)) {
  const src = (lire(f).match(/https:\/\/api\.teamop\.fr/g) || []).length, dst = (lireSortie(OUT, f).match(/https:\/\/test\.teamop\.fr/g) || []).length;
  vrai(f + ' : les ' + src + ' adresses d\'API sont devenues des adresses de test (' + dst + ' dans la sortie)', dst >= src, [src, dst]);
}
vrai('les liens de connexion et de paiement de l\'application mènent au test (https://test.teamop.fr/connexion.html, /espace.html, /recap-abonnement.html)',
  ['connexion.html', 'espace.html', 'recap-abonnement.html'].every(p => lireSortie(OUT, 'app.html').indexOf("'https://test.teamop.fr/" + p) >= 0));
vrai('l\'adresse écrite par la Tour au client (« teamop.fr/e/… ») mène au test', /var adr='test\.teamop\.fr\/e\/'/.test(lireSortie(OUT, 'tour.html')) && !/var adr='teamop\.fr\/e\//.test(lireSortie(OUT, 'tour.html')));
vrai('les expressions qui reconnaissent « teamop.fr » reconnaissent aussi test.teamop.fr (reinit, connexion, app)',
  /\^https:\\\/\\\/\(www\\\.\|test\\\.\)\?teamop\\\.fr\\\//.test(lireSortie(OUT, 'reinit.html')) && /\(www\\\.\|test\\\.\)\?teamop\\\.fr/.test(lireSortie(OUT, 'connexion.html')) && /\(www\\\.\|test\\\.\)\?teamop\\\.fr/.test(lireSortie(OUT, 'app.html')));
vrai('le sentinelle de pannes réseau reconnaît l\'API de test (app.html, espace.html)', ['app.html', 'espace.html'].every(f => /\/test\\\.teamop\\\.fr\/\.test\(url\)/.test(lireSortie(OUT, f)) && !/\/api\\\.teamop\\\.fr\/\.test\(url\)/.test(lireSortie(OUT, f))));

/* ── 3. L'APPLICATION DE TEST ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n3. app.html de test : jamais la base d\'une vraie entreprise');
const APP = lireSortie(OUT, 'app.html'), APPN = nu(APP);
vrai('STORE_KEY a le préfixe elanT_', APP.indexOf("const STORE_KEY = 'elanT_gestion_v2';") >= 0);
egal('⛔ aucune clé « elan_ » dans le CODE (commentaires retirés)', (APPN.match(/(?<![A-Za-z0-9])elan_[A-Za-z]/g) || []).length, 0);
vrai('(population) plus de 100 clés « elanT_ » à la place', (APP.match(/elanT_/g) || []).length > 100, (APP.match(/elanT_/g) || []).length);
vrai('FB_TEAM est celui de l\'essai, et plus « elan-gestion »', APP.indexOf("const FB_TEAM='opgestion-test';") >= 0 && APP.indexOf("const FB_TEAM='elan-gestion';") < 0);
vrai('le code d\'équipe du devis a son préfixe (opT_devis_code)', APP.indexOf("'opT_devis_code'") >= 0 && APP.indexOf("'op_devis_code'") < 0);
vrai('la version porte « -essai » et le nombre reste lisible (parseInt)', /const APP_VERSION = '\d+-essai'/.test(APP) && parseInt(/const APP_VERSION = '(\d+-essai)'/.exec(APP)[1], 10) > 700);
vrai('⛔ BETA_ESSAI reste FAUX : on essaie la vraie application, pas la porte de la bêta', APP.indexOf('const BETA_ESSAI=false;') >= 0 && APP.indexOf('const BETA_ESSAI=true;') < 0);
vrai('⛔ le mot de passe et le sel de chiffrement des entreprises sont INTACTS', APP.indexOf("SYNC_SECRET_DEFAULT='ELAN-GESTION-7F3A9C2E-cloud-2026'") >= 0 && APP.indexOf("SYNC_SALT='RUxBTi1HRVNUSU9OLXNhbHQtdjE='") >= 0);
vrai('l\'API et les rapports d\'erreurs de l\'application vont au serveur de test', /const PUSH_API='https:\/\/test\.teamop\.fr';/.test(APP) && /TM_URL='https:\/\/test\.teamop\.fr\/api\/monitor\/report'/.test(APP));
for (const f of ['connexion.html', 'recap-abonnement.html']) {
  vrai(f + ' (qui pose/lit les clés de l\'application) suit le préfixe : elanT_ et plus aucune clé elan_', (lireSortie(OUT, f).match(/elanT_/g) || []).length >= 3 && (nu(lireSortie(OUT, f)).match(/(?<![A-Za-z0-9])elan_[A-Za-z]/g) || []).length === 0, (lireSortie(OUT, f).match(/elanT_/g) || []).length);
}
{ // la poignée de main connexion → application : les deux écrivent et lisent LA MÊME clé
  const c = lireSortie(OUT, 'connexion.html');
  vrai('la connexion range « elanT_savedLogin » et « elanT_cnx_auto », que l\'application lit sous le même nom', /elanT_savedLogin/.test(c) && /elanT_cnx_auto/.test(c) && APP.indexOf('elanT_cnx_auto') >= 0 && APP.indexOf('elanT_savedLogin') >= 0);
}
{ const T = lireSortie(OUT, 'tour.html');
  vrai('la Tour ne joint plus OP Courrier (signature) : un nom qui ne se résout jamais', T.indexOf("var COURRIER_SRV='https://courrier-indisponible-en-essai.invalid';") >= 0);
  vrai('… ni OP MESSAGES (adresse de lien)', T.indexOf("var BETA_MSG_ADRESSE='https://msg-indisponible-en-essai.invalid';") >= 0);
  vrai('ses liens Stripe ouvrent le tableau de bord en mode TEST', (T.match(/https:\/\/dashboard\.stripe\.com\/test\//g) || []).length >= 4 && (T.match(/https:\/\/dashboard\.stripe\.com\/(?!test\/)/g) || []).length === 0);
  vrai('son API est celle de l\'essai', /var API='https:\/\/test\.teamop\.fr';/.test(T)); }
{ const c = lireSortie(OUT, 'cookies.js');
  vrai('cookies.js ne charge JAMAIS Google Analytics (chargerGA rend la main d\'emblée)', /function chargerGA\(\) \{\s*return;/.test(c) && c.indexOf('googletagmanager.com') >= 0, 'la balise reste écrite mais inatteignable');
  // la balise est inatteignable : tout ce qui suit le premier « return; » de chargerGA est du code mort
  const corps = c.slice(c.indexOf('function chargerGA()'), c.indexOf('function afficherBandeau'));
  vrai('(…) et rien ne l\'appelle avant ce « return; »', /^function chargerGA\(\) \{\s*return;/.test(corps.trim()), corps.slice(0, 120)); }

/* ── 4. CHAQUE PAGE ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n4. Chaque page : bandeau, noindex, titre, script du fragment, jeu de caractères');
const BANDEAU = 'ESPACE DE TEST — claude/essai-banc · abcdef1';
const mal = { bandeau: [], robots: [], titre: [], fragment: [], charset: [], manifeste: [], ordre: [] };
for (const f of sorties) {
  const t = lireSortie(OUT, f);
  if (t.indexOf(BANDEAU + '</div>') < 0) mal.bandeau.push(f);
  if (!/<meta[^>]+name="robots"[^>]+noindex/i.test(t)) mal.robots.push(f);
  if (!/<title>\[TEST\] /.test(t)) mal.titre.push(f);
  const tete = /<meta\s+charset=/i.exec(t);
  if (!tete || tete.index > 1000) mal.charset.push(f);
  const sansFragment = ['demo.html', 'essais.html', 'courriels.html'].indexOf(f) >= 0;   // la démonstration n'a aucun compte à ranger ; l'accueil des essais est l'émetteur des liens, pas leur destination
  if (!sansFragment && (t.match(/<script id="essai-fragment">/g) || []).length !== 1) mal.fragment.push(f);
  if (sansFragment && t.indexOf('essai-fragment') >= 0) mal.fragment.push(f + ' (n\'en a pas besoin)');
  if (!sansFragment && tete && t.indexOf('<script id="essai-fragment">') < tete.index) mal.ordre.push(f);
  if (/<link\b[^>]*\brel=["']manifest["']/i.test(t)) mal.manifeste.push(f);
}
for (const k of Object.keys(mal)) egal('(' + sorties.length + ' pages) aucune ne manque à : ' + { bandeau: 'le bandeau « ESPACE DE TEST — branche · commit »', robots: 'noindex', titre: 'le titre « [TEST] … »', fragment: 'le script du fragment #essai=', charset: 'le jeu de caractères dans les 1 000 premiers octets', manifeste: 'l\'absence de manifeste installable', ordre: 'l\'ordre : le jeu de caractères AVANT le script' }[k], mal[k], []);
vrai('le bandeau ne couvre rien : position fixe, sans prise sur le clic', /id="essai-bandeau"[^>]*pointer-events:none/.test(lireSortie(OUT, 'espace.html')));
vrai('demo.html garde sa politique de contenu sans réseau', /Content-Security-Policy[^>]*connect-src data: blob:/.test(lireSortie(OUT, 'demo.html')));

/* ── 5. LES JAVASCRIPTS ENCORE VALIDES APRÈS LES REMPLACEMENTS ────────────────────────────────────────────────────────────────────────── */
console.log('\n5. Les remplacements n\'ont rien cassé : chaque script embarqué compile');
{
  const defauts = []; let compte = 0;
  for (const f of sorties) {
    const t = lireSortie(OUT, f), re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi; let m;
    while ((m = re.exec(t))) {
      if (/\bsrc=/.test(m[1]) || /type=["'](?!text\/javascript|module)/i.test(m[1]) || !m[2].trim()) continue;
      compte++;
      try { new vm.Script(m[2], { filename: f }); } catch (e) { defauts.push(f + ' : ' + String(e.message).slice(0, 80)); }
    }
  }
  vrai('(population) plus de 40 scripts embarqués sont compilés (' + compte + ')', compte > 40, compte);
  egal('aucun ne produit une erreur de syntaxe', defauts, []);
}

/* ── 6. LA CLÉ D'ESSAIS ───────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n6. La clé des routes d\'essais ne vit que dans essais.html et courriels.html');
{
  const portent = TEXTES.filter(f => lireSortie(OUT, f).indexOf(CLE) >= 0).sort();
  egal('⛔ seuls essais.html et courriels.html portent la clé', portent, ['courriels.html', 'essais.html']);
  const suivis = git(['ls-files']).split('\n').filter(f => f && fs.existsSync(path.join(RACINE, f)) && fs.statSync(path.join(RACINE, f)).size < 4e6);
  vrai('⛔ la clé (tirée à cette exécution) n\'est dans AUCUN fichier suivi du dépôt', suivis.every(f => { try { return fs.readFileSync(path.join(RACINE, f), 'latin1').indexOf(CLE) < 0; } catch (e) { return true; } }), suivis.length);
  vrai('(population) plus de 500 fichiers suivis relus', suivis.length > 500, suivis.length);
}

/* ── 7. LES REFUS DU GÉNÉRATEUR ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n7. Ce que le générateur refuse');
{
  const refus = (nom, r, motif) => vrai(nom, r.status !== 0 && (r.stderr || '').indexOf(motif) >= 0, [r.status, (r.stderr || '').slice(0, 160)]);
  refus('un commit qui n\'est pas un SHA', construire(neuf(), { commit: 'pas-un-sha' }), 'SHA');
  refus('une branche qui n\'est pas un nom de branche', construire(neuf(), { branche: 'a b;rm -rf' }), 'nom de la branche');
  refus('pas de clé (ni ESSAIS_CLE ni --config)', construire(neuf(), { sansCle: true }), 'clé d\'essais est introuvable');
  refus('une clé qui n\'est pas 64 hexadécimaux', construire(neuf(), { cle: 'abc' }), '64 hexadécimaux');
  const conf = (o) => { const f = path.join(TMP, 'conf-' + (++n) + '.json'); fs.writeFileSync(f, JSON.stringify(o)); return f; };
  refus('une config SANS espaceTest (la config de production n\'a pas de pages d\'essai)', construire(neuf(), { sansCle: true, args: ['--config', conf({ espaceTestCle: CLE })] }), 'espaceTest');
  const sortieConf = neuf(), rc = construire(sortieConf, { sansCle: true, args: ['--config', conf({ espaceTest: true, espaceTestCle: CLE })] });
  vrai('la clé se lit aussi dans la config du serveur de test (--config)', rc.status === 0 && lireSortie(sortieConf, 'essais.html').indexOf(CLE) >= 0, (rc.stderr || '').slice(0, 160));
  const plein = neuf(); fs.mkdirSync(plein); fs.writeFileSync(path.join(plein, 'x'), '1');
  refus('un dossier de sortie qui n\'est pas vide', construire(plein), 'pas vide');
  refus('la racine du dépôt comme sortie', construire(RACINE), 'racine du dépôt');
  refus('un parent du dépôt comme sortie', construire(path.dirname(RACINE)), 'racine du dépôt');
  refus('un parcours illisible', construire(neuf(), { args: ['--parcours', path.join(TMP, 'absent.json')] }), 'parcours est illisible');
  const pf = (o) => { const f = path.join(TMP, 'par-' + (++n) + '.json'); fs.writeFileSync(f, JSON.stringify(o)); return f; };
  refus('un parcours dont une étape n\'a pas de « ce que tu dois voir »', construire(neuf(), { args: ['--parcours', pf([{ titre: 't', quoi: 'q' }])] }), 'titre, quoi et attendu');
  refus('un parcours dont le lien sort du site', construire(neuf(), { args: ['--parcours', pf([{ titre: 't', quoi: 'q', attendu: 'a', lien: 'https://exemple.fr/x' }])] }), 'chemin du site');
  const sansArg = spawnSync(process.execPath, [BUILD], { encoding: 'utf8', env: Object.assign({}, process.env, { ESSAIS_CLE: CLE }) });
  vrai('sans arguments : le mode d\'emploi', sansArg.status !== 0 && /usage/.test(sansArg.stderr));
}

/* ── 8. CHAQUE GARDE, ÉPROUVÉE EN LA RETIRANT ─────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n8. Chaque garde tombe quand son motif disparaît (une copie du dépôt, un motif ôté)');
{
  const temoin = construire(neuf(), { racine: racineMutee({ 'index.html': t => t.replace('<title>', '<title>') === t ? t + ' ' : t }) });
  vrai('(témoin) une copie du dépôt SANS mutation se fabrique (la fabrication lit bien ESSAIS_RACINE)', temoin.status === 0, (temoin.stderr || '').slice(0, 200));
  const GARDES = [
    ['FB_TEAM', { 'app.html': t => t.replace("const FB_TEAM='elan-gestion';", "const FB_TEAM='autre';") }, 'FB_TEAM'],
    ["code d'équipe devis", { 'app.html': t => t.split("'op_devis_code'").join("'op_devis_x'") }, 'code d\'équipe devis'],
    ['APP_VERSION', { 'app.html': t => t.replace("const APP_VERSION = '", 'const APP_VERSION = "').replace(/(const APP_VERSION = "\d+)'/, '$1"') }, 'APP_VERSION'],
    ['BETA_ESSAI doit rester faux', { 'app.html': t => t.replace('const BETA_ESSAI=false;', 'const BETA_ESSAI=true;') }, 'BETA_ESSAI'],
    ['préfixe elan_ (moins de 100 clés)', { 'app.html': t => t.replace(/(?<![A-Za-z0-9])elan_(?=[A-Za-z])/g, 'elanQ_') }, 'clés elan_'],
    ['SYNC_SALT', { 'app.html': t => t.replace("SYNC_SALT='RUxBTi1HRVNUSU9OLXNhbHQtdjE='", "SYNC_SALT='AAAA'") }, 'SYNC_SALT'],
    ['SYNC_SECRET_DEFAULT', { 'app.html': t => t.replace("SYNC_SECRET_DEFAULT='ELAN-GESTION-7F3A9C2E-cloud-2026'", "SYNC_SECRET_DEFAULT='autre'") }, 'SYNC_SECRET_DEFAULT'],
    ['PUSH_API (l\'API de l\'application)', { 'app.html': t => t.replace("const PUSH_API='https://api.teamop.fr';", "const PUSH_API='https://exemple.invalid';") }, 'PUSH_API'],
    ['rapports d\'erreurs de l\'application', { 'app.html': t => t.replace("TM_URL='https://api.teamop.fr/api/monitor/report'", "TM_URL='https://exemple.invalid/r'") }, 'rapports d\'erreurs'],
    ['COURRIER_SRV de la Tour', { 'tour.html': t => t.replace("var COURRIER_SRV='https://courrier-beta.teamop.fr';", "var COURRIER_SRV='https://autre.exemple.fr';") }, 'COURRIER_SRV'],
    ['BETA_MSG_ADRESSE de la Tour', { 'tour.html': t => t.replace("var BETA_MSG_ADRESSE='https://msg-beta.teamop.fr';", "var BETA_MSG_ADRESSE='https://autre.exemple.fr';") }, 'BETA_MSG_ADRESSE'],
    ['liens Stripe de la Tour', { 'tour.html': t => t.split('https://dashboard.stripe.com/').join('https://exemple.fr/') }, 'liens Stripe'],
    ['API de la Tour', { 'tour.html': t => t.replace("var API='https://api.teamop.fr';", "var API='';") }, 'l\'API de la Tour'],
    ['Google Analytics (cookies.js)', { 'cookies.js': t => t.replace('function chargerGA() {', 'function chargerGA(){') }, 'Google Analytics coupé'],
    ['une page indispensable', { 'espace.html': null }, 'espace.html manque'],
    ['la fermeture </body> d\'une page', { 'merci.html': t => t.replace(/<\/body>/g, '') }, 'fermeture </body>'],
    ['le <head> d\'une page', { 'merci.html': t => t.replace(/<head[^>]*>/i, '<header>') }, '<head>'],
  ];
  for (const [nom, muts, motif] of GARDES) {
    let r; try { r = construire(neuf(), { racine: racineMutee(muts) }); } catch (e) { vrai('garde « ' + nom + ' » : la mutation s\'applique', false, e.message); continue; }
    vrai('garde « ' + nom + ' » : la fabrication ÉCHOUE et la nomme', r.status !== 0 && (r.stderr || '').indexOf(motif) >= 0, [r.status, (r.stderr || '').slice(0, 200)]);
  }
}

/* ── 9. LA DERNIÈRE PASSE : elle relit tout, indépendamment des remplacements ─────────────────────────────────────────────────────────── */
console.log('\n9. La dernière passe vide le dossier quand une adresse de production subsiste');
{
  const D1 = neuf();
  const r1b = construire(D1, { racine: racineMutee({ 'mentions-legales.html': t => t.replace('</body>', '<a href="https://msg.teamop.fr/x">x</a></body>') }) });
  vrai('une adresse que rien ne remplace (https://msg.teamop.fr) fait ÉCHOUER la fabrication', r1b.status !== 0 && /subsiste/.test(r1b.stderr) && /mentions-legales\.html/.test(r1b.stderr), (r1b.stderr || '').slice(0, 200));
  vrai('⛔ … et le dossier est VIDÉ : rien n\'est livré', !fs.existsSync(D1));
  // le générateur lui-même mutilé. ⚠️ Retirer le seul remplacement de « https://api.teamop.fr » ne casse RIEN : le remplacement de « api.teamop.fr » nu
  // le rattrape (« https:// » ne le protège pas). Une mutation neutralisée par une autre garde ne prouve rien — on retire donc les DEUX.
  const src = fs.readFileSync(BUILD, 'utf8');
  const motifA = "s = s.split('https://api.teamop.fr').join('https://' + HOTE);";
  const motifB = "s = s.replace(/(?<![A-Za-z0-9-])api\\.teamop\\.fr/g, HOTE);";
  const motifC = "s = s.split('https://teamop.fr').join('https://' + HOTE);";
  vrai('(témoins) le générateur porte chacun des trois remplacements, une seule fois', [motifA, motifB, motifC].every(m => src.split(m).length === 2), [motifA, motifB, motifC].map(m => src.split(m).length - 1));
  // … et les contrôles propres à app.html/tour.html (apresApp, apresTour), qui diraient la même chose avant la dernière passe
  const motifD = "  if (f === 'app.html') s = apresApp(s);\n  else if (f === 'tour.html') s = apresTour(s);\n";
  vrai('(témoin) les contrôles de page sont là, une seule fois', src.split(motifD).length === 2);
  const sansPages = src.replace(motifD, '');
  const muet = path.join(TMP, 'essais-build-muet.js'); fs.writeFileSync(muet, sansPages.replace(motifA, '/* retiré */').replace(motifB, '/* retiré */'));
  const D2 = neuf(), r2 = construire(D2, { script: muet, racine: RACINE });
  vrai('⛔ sans les remplacements de l\'API, la dernière passe voit « https://api.teamop.fr » et refuse de livrer', r2.status !== 0 && /subsiste/.test(r2.stderr) && /https:\/\/api\.teamop\.fr/.test(r2.stderr), (r2.stderr || '').slice(0, 200));
  vrai('⛔ … et le dossier est vidé', !fs.existsSync(D2));
  const muetC = path.join(TMP, 'essais-build-c.js'); fs.writeFileSync(muetC, sansPages.replace(motifC, '/* retiré */'));
  const D2c = neuf(), r2c = construire(D2c, { script: muetC, racine: RACINE });
  vrai('⛔ sans le remplacement de « https://teamop.fr » : refus aussi, dossier vidé', r2c.status !== 0 && /https:\/\/teamop\.fr/.test(r2c.stderr) && !fs.existsSync(D2c), (r2c.stderr || '').slice(0, 200));
  const motif2 = "s = s.replace(/navigator\\.serviceWorker\\.register\\(/g,";
  vrai('(témoin) le générateur neutralise bien le service worker (une seule fois)', src.split(motif2).length === 2);
  const muet2 = path.join(TMP, 'essais-build-sw.js'); fs.writeFileSync(muet2, src.replace(motif2, 's = s.replace(/navigator\\.serviceWorkerX\\.register\\(/g,'));
  const D3 = neuf(), r3 = construire(D3, { script: muet2, racine: RACINE });
  vrai('⛔ sans la neutralisation du service worker, la dernière passe refuse aussi', r3.status !== 0 && /service worker/.test(r3.stderr) && !fs.existsSync(D3), (r3.stderr || '').slice(0, 200));
}

/* ── 10. LA SONDE AU NAVIGATEUR EST LÀ, ET CITÉE ──────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n10. La sonde au navigateur');
{
  const sonde = path.join(RACINE, 'scratchpad', 'sonde-essais.js');
  vrai('scratchpad/sonde-essais.js existe', fs.existsSync(sonde));
  const S = fs.existsSync(sonde) ? fs.readFileSync(sonde, 'utf8') : '';
  vrai('elle fabrique les pages par LE VRAI générateur (pas une copie)', /scripts['"], ?['"]essais-build\.js|scripts', 'essais-build\.js/.test(S));
  vrai('elle ouvre « Se connecter comme client » et attend Mon espace connecté (#u-email), puis lit courriels.html', /lien-client/.test(S) && /u-email/.test(S) && /courriels\.html/.test(S));
  vrai('elle compte les requêtes : aucune vers api.teamop.fr ni teamop.fr', /AUCUNE requête vers api\.teamop\.fr/.test(S) && /host-resolver-rules/.test(S));
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* le dossier temporaire ne gêne personne */ }
console.log('\n════ test-2985 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
