/* ══ test-2987 · LA COUTURE DE L'ESPACE DE TEST — LES VRAIES PAGES FABRIQUÉES PARLENT AU VRAI SERVEUR DE TEST ═════════════════════════════════
   23 octobre 2026. Trois chantiers ont chacun leurs bancs verts : le SERVEUR de test (`test-2980` à `2984` : le fragment `#essai=` que rend
   `/api/essais/connexion`), les PAGES (`test-2985`, `2986` : le script injecté, sur du JSON fabriqué à la main), le VPS (`2988`, `2989`). Aucun ne
   fait parler la page FABRIQUÉE au serveur : or le contrat du fragment — les noms de clés, la page visée, l'encodage — est exactement là où
   ils peuvent se manquer, chacun étant juste de son côté (la règle de ce dépôt : les deux moitiés se lisent très bien séparément).
   Ce banc, tout sur 127.0.0.1, sans réseau sortant :
     1. lance le VRAI `server/index.js` en mode test (établi `banc-essais.js`), attend la fin du semis ;
     2. fabrique les VRAIES pages avec `scripts/essais-build.js` (la clé lue dans la config du banc, comme sur le VPS) ;
     3. pour les quatre comptes : `GET /api/essais/connexion` SANS suivre la redirection, lit le `Location` (hôte, page, `#essai=`) ;
     4. extrait le VRAI script injecté de la page fabriquée visée (espace.html, tour.html — pas une copie), l'EXÉCUTE (faux localStorage,
        sessionStorage, location, history) sur l'adresse du `Location` : chaque clé du fragment est rangée, aucune « clé refusée », le fragment
        est effacé, un rechargement est demandé ;
     5. prouve que CE QUI A ÉTÉ RANGÉ ouvre une session : le portail (`portailMaison` de l'espace.html fabriqué : jeton → `/api/compte/moi`
        → l'adresse du compte), la Tour (le démarrage de la tour.html fabriquée relit les clés rangées, `hAuth` du fichier fabriqué → `/api/monitor/moi`
        → le bon rôle ; le collaborateur est refusé sur une route du patron ; un jeton bidon est refusé) ;
     6. un courriel déclenché par une vraie route (« mot de passe oublié » du portail) est capté, son lien vise l'origine de test et ouvre une
        vraie réinitialisation ; la page `courriels.html` fabriquée l'affiche (faux DOM, vraie fonction) à partir du JSON que le serveur rend.
   Le faux facteur COMPTE ses connexions : il reste à zéro du début à la fin (rien n'est parti). Population comptée avant chaque absence.
   Mutations (rejouées à la main après commit, voir le journal du commit) : `tour_token` retiré de la liste fermée du générateur, la clé du jeton du
   portail renommée côté serveur, le base64url cassé côté serveur, la page visée fausse. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const { spawnSync } = require('child_process');
const B2 = require('./banc-essais');
const { RACINE, dormir, attendre } = B2;
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')); } };
const vivants = [];
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'essais2987-'));
const fin = () => { for (const s of vivants) { try { s.enfant() && s.enfant().kill('SIGKILL'); } catch (e) {} try { s.smtp.s.close(); } catch (e) {} try { fs.rmSync(s.banc, { recursive: true, force: true }); } catch (e) {} } try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 170000).unref();

const lire = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');
/* ⛔ un motif de banc vise du CODE : on retire les commentaires de bloc qui COMMENCENT une ligne et les lignes de commentaire (CLAUDE.md) */
const sans = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
/* le Location, sans le jeton : un échec n'affiche jamais une session */
const sansFragment = (loc) => String(loc || '').replace(/#essai=.*/, '#essai=…');

/* Le VRAI script injecté, extrait de la page FABRIQUÉE. */
function scriptInjecte(dossier, page) {
  const m = /<script id="essai-fragment">([\s\S]*?)<\/script>/.exec(lire(dossier, page));
  return m ? m[1] : '';
}
/* Le jouer sur l'adresse du Location : tout ce qu'il écrit est noté. */
function jouer(script, urlTexte) {
  const u = new URL(urlTexte), j = { ls: new Map(), ss: new Map(), effaces: [], replace: [], reload: 0, avis: [] };
  const stock = (m) => ({ setItem(k, x) { m.set(String(k), String(x)); }, getItem(k) { return m.has(k) ? m.get(k) : null; }, removeItem(k) { m.delete(k); } });
  const sb = {
    location: { hash: u.hash, pathname: u.pathname, search: u.search, replace(x) { j.replace.push(x); }, reload() { j.reload++; } },
    history: { replaceState(a, b, c) { j.effaces.push(c); } },
    localStorage: stock(j.ls), sessionStorage: stock(j.ss),
    atob, TextDecoder, console: { warn(...a) { j.avis.push(a.join(' ')); }, log() {}, error() {} },
  };
  vm.runInNewContext(script, sb, { timeout: 2000 });
  return j;
}

/* Le portail, tel que la page FABRIQUÉE le fait : `portailMaison` extrait d'espace.html (le fichier de sortie, pas la source du dépôt). */
function portailDe(dossier, base, rangement) {
  const PAGE = lire(dossier, 'espace.html');
  const i = PAGE.indexOf('const API_PORTAIL'), j = PAGE.indexOf('const _pv = portailMaison();', i + 1);
  if (i < 0 || j < 0) return null;
  const adaptateur = PAGE.slice(i, j);
  const code = adaptateur.replace(/const API_PORTAIL = [\s\S]*?;\n/, 'const API_PORTAIL = ' + JSON.stringify(base) + ';\n') + '\nreturn { pv: portailMaison() };';
  const f = new Function('fetch', 'window', 'crypto', 'TextEncoder', 'console', 'location', 'localStorage', 'sessionStorage', 'setTimeout', 'clearTimeout', code);
  const session = new Map();
  return f(fetch, { fetch }, require('crypto').webcrypto, TextEncoder, { warn() {}, log() {}, error() {} }, { hostname: '127.0.0.1' },
    { getItem: k => (rangement.has(k) ? rangement.get(k) : null), setItem: (k, x) => rangement.set(k, String(x)), removeItem: k => rangement.delete(k) },
    { getItem: k => (session.has(k) ? session.get(k) : null), setItem: (k, x) => session.set(k, String(x)), removeItem: k => session.delete(k) }, setTimeout, clearTimeout);
}

/* La Tour, telle que la page FABRIQUÉE le fait au démarrage : le bloc « une session déjà ouverte reprend la main » est celui du fichier de sortie. */
function tourDe(dossier, rangement) {
  const PAGE = lire(dossier, 'tour.html');
  const marque = PAGE.indexOf('démarrage : une session déjà ouverte reprend la main');
  const debut = marque < 0 ? -1 : PAGE.indexOf('(function(){', marque);
  const fini = debut < 0 ? -1 : PAGE.indexOf('\n})();', debut);
  const hA = /function hAuth\(\)\{[^\n]*\}/.exec(PAGE);
  if (marque < 0 || debut < 0 || fini < 0 || !hA) return null;
  const j = { apps: null, entrees: 0 };
  const session = new Map();
  const sb = {
    TOKEN: '', MYNOM: '', MYROLE: '',
    localStorage: { getItem: k => (rangement.has(k) ? rangement.get(k) : null), setItem: (k, x) => rangement.set(k, String(x)), removeItem: k => rangement.delete(k) },
    sessionStorage: { getItem: k => (session.has(k) ? session.get(k) : null), setItem: (k, x) => session.set(k, String(x)), removeItem: k => session.delete(k) },
    poserApps(a) { j.apps = a; }, entrer() { j.entrees++; },
  };
  vm.createContext(sb);
  vm.runInContext(hA[0], sb);
  vm.runInContext(PAGE.slice(debut, fini + 6), sb, { timeout: 2000 });
  return { sb, j, entetes: () => vm.runInContext('hAuth()', sb) };
}

/* Un faux DOM, juste assez pour exécuter le script de courriels.html. */
function fauxDom() {
  const parIds = new Map();
  const noeud = (nom) => {
    const n = { nom, attrs: {}, enfants: [], _t: '', className: '', srcdoc: '', ecouteurs: {} };
    n.setAttribute = (k, x) => { n.attrs[k] = String(x); }; n.getAttribute = (k) => (k in n.attrs ? n.attrs[k] : null);
    n.appendChild = (c) => { n.enfants.push(c); return c; };
    n.addEventListener = (e, f) => { n.ecouteurs[e] = f; };
    Object.defineProperty(n, 'textContent', { get() { return n._t + n.enfants.map(c => c.textContent).join(''); }, set(x) { n.enfants = []; n._t = String(x); } });
    return n;
  };
  const document = { visibilityState: 'visible', getElementById: (id) => { if (!parIds.has(id)) parIds.set(id, noeud('#' + id)); return parIds.get(id); }, createElement: (nom) => noeud(nom) };
  return { document, noeud };
}
const parcourir = (n, f) => { f(n); for (const c of n.enfants) parcourir(c, f); };

(async () => {
  console.log('\n── test-2987 : la couture — les pages fabriquées parlent au serveur de test ──');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  /* ── 1. le vrai serveur de test ── */
  const S = await B2.lancer({ essai: true, config: { mailPreuveExigee: false } }); vivants.push(S);
  vrai('le vrai serveur démarre en mode test', S.vivant);
  vrai('le semis se termine (drapeau posé)', await attendre(() => fs.existsSync(path.join(S.D, 'essais-semis.json')), 200));
  const cle = S.CLE;

  /* ── 2. les vraies pages ── */
  console.log('\n1. Les pages sont fabriquées par le vrai générateur, avec la clé lue dans la config du serveur de test');
  const OUT = path.join(TMP, 'pages');
  const env = Object.assign({}, process.env); delete env.ESSAIS_CLE; delete env.TEAMOP_CONFIG; delete env.ESSAIS_PARCOURS; delete env.ESSAIS_RACINE;
  const fab = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'essais-build.js'), OUT, 'abcdef1', 'claude/essai-couture', '--config', S.CONFIG], { encoding: 'utf8', env, timeout: 120000 });
  v('la fabrication réussit (code 0)', fab.status, 0);
  vrai('   et n\'affiche jamais la clé', !String(fab.stdout + fab.stderr).includes(cle));
  const pagesBatie = ['espace.html', 'tour.html', 'courriels.html'].every(f => fs.existsSync(path.join(OUT, f)));
  vrai('(population) espace.html, tour.html et courriels.html sont dans la sortie', pagesBatie);
  if (!pagesBatie) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const scripts = { 'espace.html': scriptInjecte(OUT, 'espace.html'), 'tour.html': scriptInjecte(OUT, 'tour.html') };
  vrai('(population) le script injecté s\'extrait des deux pages de session', scripts['espace.html'].length > 200 && scripts['tour.html'].length > 200);

  /* ── 3 et 4. les quatre portes : Location → script injecté → stockage ── */
  console.log('\n2. « Se connecter comme… » : le Location du serveur, le script de la page, le stockage');
  const attendu = {
    client:        { page: '/espace.html', cles: ['teamop_portail_jeton'] },
    prospect:      { page: '/espace.html', cles: ['teamop_portail_jeton'] },
    patron:        { page: '/tour.html', cles: ['tour_apps', 'tour_nom', 'tour_role', 'tour_token'] },
    collaborateur: { page: '/tour.html', cles: ['tour_apps', 'tour_nom', 'tour_role', 'tour_token'] },
  };
  const portes = {};
  for (const compte of Object.keys(attendu)) {
    const a = attendu[compte];
    const r = await S.appel('/api/essais/connexion?compte=' + compte + '&cle=' + cle);
    const loc = r.h.get('location') || '';
    v(compte + ' : 302 (la redirection n\'est pas suivie)', r.s, 302);
    let u = null; try { u = new URL(loc); } catch (e) { u = null; }
    v('   vers l\'origine de test et la page ' + a.page, u && [u.origin, u.pathname], ['https://test.teamop.fr', a.page]);
    vrai('   avec un fragment #essai= en base64url (jamais +, /, =)', u && /^#essai=[A-Za-z0-9_-]+$/.test(u.hash), sansFragment(loc));
    vrai('   ⛔ ni la clé d\'essais ni un mot de passe dans l\'adresse', !loc.includes(cle) && !/mdp|pass/i.test(sansFragment(loc)));
    const page = a.page.slice(1);
    const script = scripts[page];
    if (!u || !script) { vrai('   (population) un Location lisible et le script de ' + page + ' à jouer', false, sansFragment(loc)); continue; }
    const frag = B2.lireFragment(loc);
    vrai('   (population) le fragment se lit et porte du stockage', frag && frag.stockage && Object.keys(frag.stockage).length > 0, frag && Object.keys(frag));
    v('   les clés du fragment sont celles que la page lit', frag && Object.keys(frag.stockage).sort(), a.cles);
    /* le VRAI script de la page fabriquée, sur l'adresse du Location */
    const j = jouer(script, loc);
    const cles = frag ? Object.keys(frag.stockage) : [];
    v('   ⛔ chaque clé du fragment est RANGÉE par le script de la page (aucune « clé refusée »)', [cles.filter(k => !j.ls.has(k)), j.avis.filter(x => /refus/.test(x))], [[], []]);
    vrai('   et avec la valeur que le serveur a posée', frag && cles.every(k => j.ls.get(k) === (typeof frag.stockage[k] === 'string' ? frag.stockage[k] : JSON.stringify(frag.stockage[k]))));
    v('   le fragment est effacé de l\'adresse (replaceState vers le chemin nu)', j.effaces, [u.pathname + u.search]);
    vrai('   un rechargement est demandé, sur la bonne page', j.reload === 1 || (j.replace.length === 1 && j.replace[0] === a.page), { reload: j.reload, replace: j.replace });
    portes[compte] = { j, frag, loc };
  }

  /* ── 5a. le portail ── */
  console.log('\n3. Le portail : le jeton rangé ouvre « Mon espace » (portailMaison de l\'espace.html fabriqué)');
  const ESP = sans(lire(OUT, 'espace.html'));
  vrai('la page fabriquée parle au serveur de TEST (API_PORTAIL)', /const API_PORTAIL = [\s\S]{0,120}'https:\/\/test\.teamop\.fr'/.test(ESP));
  vrai('et lit la session sous la clé que le serveur a posée', portes.client && /const CLE_JETON = 'teamop_portail_jeton'/.test(ESP) && portes.client.j.ls.has('teamop_portail_jeton'));
  const adresses = { client: 'client@exemple-essai.fr', prospect: 'prospect@exemple-essai.fr' };
  for (const compte of ['client', 'prospect']) {
    const p = portes[compte];
    if (!p) { vrai(compte + ' : (population) une porte jouée', false); continue; }
    const rangement = new Map(p.j.ls);   // ce que le SCRIPT a rangé, pas ce que le banc lit dans le fragment
    const page = portailDe(OUT, S.B, rangement);
    vrai(compte + ' : la vraie fonction de la page s\'extrait', page && page.pv);
    if (!(page && page.pv)) continue;
    const moi = await new Promise(res => { page.pv.auth.onAuthStateChanged(u => res(u)); setTimeout(() => res('délai'), 5000); });
    v('   ⛔ le stockage rangé OUVRE la session : la page voit ' + adresses[compte] + ', adresse confirmée', [moi && moi.email, moi && moi.emailVerified], [adresses[compte], true]);
    vrai('   (le jeton) 64 hexadécimaux, au format que le serveur lit en Bearer', /^[0-9a-f]{64}$/.test(rangement.get('teamop_portail_jeton') || ''));
    const jeton = rangement.get('teamop_portail_jeton') || '';
    const dos = await S.appel('/api/portail/moi', undefined, jeton);
    v('   et la route que « Mon espace » lit ensuite répond pour la bonne entreprise', [dos.s, dos.j.dossier && dos.j.dossier.company], [200, compte === 'client' ? 'Clim Essai' : 'Plomberie Essai']);
    const bidon = jeton.replace(/.$/, c => (c === '0' ? '1' : '0'));
    v('   un jeton bidon (un caractère changé) est refusé', (await S.appel('/api/compte/moi', undefined, bidon)).s, 401);
    const pageBidon = portailDe(OUT, S.B, new Map([['teamop_portail_jeton', bidon]]));
    const refus = await new Promise(res => { pageBidon.pv.auth.onAuthStateChanged(u => res(u)); setTimeout(() => res('délai'), 5000); });
    v('   la page, avec ce jeton bidon, retombe sur « pas connecté »', refus, null);
  }

  /* ── 5b. la Tour ── */
  console.log('\n4. La Tour : les clés rangées sont relues au démarrage, le jeton passe `/api/monitor/moi`');
  const TOUR = sans(lire(OUT, 'tour.html'));
  vrai('la page fabriquée parle au serveur de TEST (API)', /var API='https:\/\/test\.teamop\.fr';/.test(TOUR));
  vrai('au démarrage elle appelle /api/monitor/moi avec l\'en-tête de hAuth (Bearer)', /apiGet\('\/api\/monitor\/moi'\)/.test(TOUR) && /function hAuth\(\)\{ return \{[^}]*'Authorization':'Bearer '\+TOKEN/.test(TOUR) && /fetch\(API\+u,\{headers:hAuth\(\)\}\)/.test(TOUR));
  const roles = { patron: { nom: 'Patron Essai', apps: ['gestion', 'messages'] }, collaborateur: { nom: 'Collaborateur Essai', apps: ['gestion'] } };
  const jetons = {};
  for (const compte of ['patron', 'collaborateur']) {
    const p = portes[compte];
    if (!p) { vrai(compte + ' : (population) une porte jouée', false); continue; }
    const rangement = new Map(p.j.ls);
    const t = tourDe(OUT, rangement);
    vrai(compte + ' : le démarrage de la page fabriquée s\'extrait et tourne', t);
    if (!t) continue;
    v('   ⛔ il relit ce que le script a rangé : jeton, nom, rôle, applications', [t.sb.TOKEN === rangement.get('tour_token') && /^[0-9a-f]{48}$/.test(t.sb.TOKEN), t.sb.MYNOM, t.sb.MYROLE, t.j.apps, t.j.entrees], [true, roles[compte].nom, compte, roles[compte].apps, 1]);
    const entetes = t.entetes();
    const r = await fetch(S.B + '/api/monitor/moi', { headers: entetes });
    const m = await r.json().catch(() => ({}));
    v('   ⛔ l\'en-tête que la page fabrique ouvre `/api/monitor/moi` : le bon nom, le bon rôle, les bonnes applications', [r.status, m.nom, m.role, m.apps], [200, roles[compte].nom, compte, roles[compte].apps]);
    jetons[compte] = t.sb.TOKEN;
    const users = await fetch(S.B + '/api/monitor/users', { headers: entetes });
    v('   la route du patron : ' + (compte === 'patron' ? '200' : '403 (réservée au patron)'), users.status, compte === 'patron' ? 200 : 403);
    const entBidon = Object.assign({}, entetes, { Authorization: 'Bearer ' + 'f'.repeat(48) });
    const rb = await fetch(S.B + '/api/monitor/moi', { headers: entBidon });
    vrai('   un jeton bidon est refusé (401 ou 403)', rb.status === 401 || rb.status === 403, rb.status);
  }
  vrai('(population) les deux jetons de la Tour sont différents', jetons.patron && jetons.collaborateur && jetons.patron !== jetons.collaborateur);

  /* ── 6. un courriel de bout en bout ── */
  console.log('\n5. Un courriel déclenché par une vraie route est capté et la page courriels.html l\'affiche');
  const avant = (await S.appel('/api/essais/courriels?cle=' + cle)).j;
  v('(population) la boîte de captation répond et est un tableau', [avant.ok, Array.isArray(avant.courriels)], [true, true]);
  const dem = await S.appel('/api/compte/mdp/demander', { email: 'client@exemple-essai.fr' });
  v('« mot de passe oublié » du portail pour client@exemple-essai.fr : 200', dem.s, 200);
  const trouve = await attendre(async () => ((await S.appel('/api/essais/courriels?cle=' + cle)).j.courriels || []).find(c => (c.a || []).includes('client@exemple-essai.fr') && /mode=resetPassword/.test((c.liens || []).join(' '))), 80);
  vrai('⛔ le courriel est CAPTÉ : destiné à client@exemple-essai.fr, avec un lien resetPassword', trouve);
  if (trouve) {
    const lien = (trouve.liens || []).find(l => /mode=resetPassword/.test(l)) || '';
    let lu = null; try { lu = new URL(lien); } catch (e) { lu = null; }
    v('   le lien vise l\'origine de TEST, pas la production', lu && [lu.origin, lu.pathname, lu.searchParams.get('mode')], ['https://test.teamop.fr', '/reinit.html', 'resetPassword']);
    vrai('   avec un jeton non vide', lu && lu.searchParams.get('jeton') && lu.searchParams.get('jeton').length > 20);
    vrai('   la page reinit.html fabriquée lit ces deux paramètres (mode, jeton)', /Q\.get\('mode'\)/.test(lire(OUT, 'reinit.html')) && /Q\.get\('jeton'\)/.test(lire(OUT, 'reinit.html')));
    vrai('   ⛔ aucune adresse de production ni dans le texte ni dans le html du courriel', !/https?:\/\/(?:www\.|api\.)?teamop\.fr/.test(trouve.texte + ' ' + trouve.html), 'liens : ' + (trouve.liens || []).join(' ').slice(0, 200));
    /* le lien MARCHE : le jeton du courriel pose un nouveau mot de passe, puis la connexion réussit avec lui (l'empreinte est celle de la page) */
    const emp = require('crypto').createHash('sha256').update('teamop-portail:nouveau-mot-de-passe-du-banc').digest('hex');
    const pose = await S.appel('/api/compte/mdp/poser', { jeton: lu && lu.searchParams.get('jeton'), h: emp });
    vrai('   le jeton du lien est accepté par la vraie route de réinitialisation', pose.s === 200, [pose.s, pose.j]);
    const cx = await S.appel('/api/compte/connexion', { email: 'client@exemple-essai.fr', h: emp });
    v('   et le client se connecte avec le mot de passe posé par ce lien', [cx.s, /^[0-9a-f]{64}$/.test(cx.j.jeton || '')], [200, true]);

    /* la page courriels.html fabriquée, sur le JSON que le serveur rend */
    const PAGE = lire(OUT, 'courriels.html');
    const ms = Array.from(PAGE.matchAll(/<script>([\s\S]*?)<\/script>/g)).map(m => m[1]).filter(s => /api\/essais\/courriels/.test(s));
    vrai('(population) le script de courriels.html s\'extrait', ms.length === 1);
    if (ms.length === 1) {
      const { document } = fauxDom();
      let intervalles = 0;
      const appels = [], entetes = [];
      const sb = { document, setInterval() { intervalles++; return 1; }, encodeURIComponent, Array, Date, String, isNaN,
        fetch: (u, o) => { appels.push(u); entetes.push((o && o.headers) || {}); return fetch(S.B + u, o); } };
      vm.runInNewContext(ms[0], sb, { timeout: 3000 });
      const liste = document.getElementById('liste'), compte = document.getElementById('compte');
      const serveur = (await S.appel('/api/essais/courriels?cle=' + cle)).j;
      await attendre(() => /courriel/.test(compte.textContent), 80);
      v('⛔ la page appelle la route avec la clé de son propre fichier, dans l\'EN-TÊTE X-Essai-Cle (le serveur l\'accepte : la liste s\'affiche)', [appels.length >= 1, appels[0], entetes[0] && entetes[0]['X-Essai-Cle'] === cle], [true, '/api/essais/courriels', true]);
      vrai('⛔ …et la clé n\'est dans AUCUNE adresse demandée (une adresse s\'écrit dans le journal d\'accès de nginx)', appels.length >= 1 && !appels.some(u => String(u).includes(cle)));
      v('   elle affiche autant de cartes que le serveur de courriels', liste.enfants.filter(c => /carte/.test(c.attrs.class || '')).length, (serveur.courriels || []).length);
      vrai('   (population) il y a au moins un courriel à afficher', (serveur.courriels || []).length >= 1);
      let objetVu = false; const hrefs = [];
      parcourir(liste, (n) => { if (n.nom === 'b' && n.textContent === trouve.objet) objetVu = true; if (n.nom === 'a' && n.attrs.href) hrefs.push(n.attrs.href); });
      vrai('   la carte du courriel porte son objet', objetVu, trouve.objet);
      vrai('   et son lien de réinitialisation est un lien cliquable, tel que le serveur l\'a rendu', hrefs.includes(lien), hrefs.slice(0, 5));
      v('   le compteur dit le nombre de courriels', compte.textContent, (serveur.courriels.length) + ' courriel' + (serveur.courriels.length > 1 ? 's' : ''));
      v('   la page se rafraîchit toute seule (une minuterie posée)', intervalles, 1);
    }
  }

  /* ── rien n'est parti ── */
  console.log('\n6. Rien n\'est parti');
  v('⛔ le faux serveur d\'envoi n\'a vu AUCUNE connexion, du semis au dernier courriel', [S.smtp.connexions(), S.smtp.recus.length], [0, 0]);
  vrai('(population) des courriels ont bien été captés pendant ce banc', ((await S.appel('/api/essais/courriels?cle=' + cle)).j.nombre || 0) >= 1);
  vrai('le journal du serveur n\'a jamais affiché la clé d\'essais', !S.sortie().includes(cle));

  await S.nettoyer();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
