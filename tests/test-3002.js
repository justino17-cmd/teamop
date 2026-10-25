/* ⛔ CE QUE CE FICHIER GARDE — L'AUDIENCE DU SITE, SANS COOKIE NI IDENTIFIANT (25 octobre 2026).
     Justin : « le nombre de personnes qui a cliqué sur les liens, comment ils sont venus, par quel site […] en temps réel ».
       1. `lireVue` : un robot, une page inventée, une forme fausse ne comptent pas ; les sources (Google, Facebook, un courriel d'agent, un lien marqué,
          l'accès direct) ; une navigation DANS le site est une page vue, pas une visite ; un agent inconnu ne devient jamais une source ;
       2. le module : des totaux par jour, et RIEN qui désigne une personne dans le fichier (ni IP, ni adresse complète de la page d'origine, ni requête) ;
          25 mois de garde ; un registre illisible n'est JAMAIS réécrit, et se dit (503) ;
       3. le VRAI serveur : la page vue n'est acceptée que des origines du site ; la lecture est au patron seul ;
       4. le site : chaque page qui porte `cookies.js` porte aussi `audience.js`, qui ne parle que depuis teamop.fr et ne range rien dans le navigateur ;
       5. la signature de Léa, Camille et Chloé porte « ?de=<agent> », celle des autres non. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const RACINE = path.join(__dirname, '..');
const A = require(path.join(RACINE, 'server', 'audience.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 90000).unref();

(async () => {
  console.log('\n── 3002 · L’audience du site ──');

  console.log('\n1. Une page vue, lue');
  const L = A.lireVue;
  v('un robot ne compte pas', L({ p: '/' }, 'Mozilla/5.0 (compatible; Googlebot/2.1)').ignore, 'robot');
  v('une forme fausse ne compte pas', [L(null, 'x').ignore, L([1], 'x').ignore, L('texte', 'x').ignore], ['forme', 'forme', 'forme']);
  v('une page inventée ne compte pas (sans « / », « .. », caractères étranges, trop longue)', ['', 'tarifs.html', '/../etc', '/<script>', '/' + 'a'.repeat(200)].map(p => L({ p }, 'x').ignore), ['page', 'page', 'page', 'page', 'page']);
  v('la requête et l’ancre sont retirées, « /index.html » vaut « / »', [L({ p: '/tarifs.html?x=1#y' }, 'x').page, L({ p: '/blog/index.html' }, 'x').page], ['/tarifs.html', '/blog/']);
  v('Google', L({ p: '/', r: 'https://www.google.fr/' }, 'x').source, 'Google');
  v('Facebook (m.facebook.com, l.facebook.com)', [L({ p: '/', r: 'https://m.facebook.com/' }, 'x').source, L({ p: '/', r: 'https://l.facebook.com/l.php?u=x' }, 'x').source], ['Facebook', 'Facebook']);
  v('ChatGPT', L({ p: '/', r: 'https://chatgpt.com/' }, 'x').source, 'ChatGPT');
  v('un site inconnu garde son nom de domaine, sans « www. » ni chemin', L({ p: '/', r: 'https://www.exemple-3002.fr/article/42?ref=abc' }, 'x').source, 'exemple-3002.fr');
  v('aucune page d’origine : accès direct', L({ p: '/', r: '' }, 'x').source, 'Accès direct');
  const interne = L({ p: '/tarifs.html', r: 'https://teamop.fr/' }, 'x');
  v('⛔ une navigation DANS le site : une page vue, pas une visite, pas de source', [interne.visite, interne.source], [false, '']);
  v('un courriel de Léa (« ?de=lea ») : sa source et sa campagne', [L({ p: '/', de: 'lea' }, 'x').source, L({ p: '/', de: 'lea' }, 'x').campagne], ['Courriel de Léa', 'agent:lea']);
  v('⛔ un « de » inconnu ne devient jamais une source (liste fermée)', L({ p: '/', de: 'pirate', r: '' }, 'x').source, 'Accès direct');
  v('un lien marqué utm : la source et la campagne, nettoyées', [L({ p: '/', us: 'Facebook', um: 'social', uc: 'Article <b>1</b>' }, 'x').source, L({ p: '/', us: 'Facebook', um: 'social', uc: 'Article <b>1</b>' }, 'x').campagne], ['Lien marqué : facebook', 'facebook / social / articleb1b']);
  /* relecture du gardien (25 octobre 2026) */
  v('⛔ une adresse IP, « localhost », un hôte sans vrai domaine : jamais écrits, « Autre site »', ['http://192.168.1.5:8080/x?token=abc', 'http://localhost:3000/', 'http://[::1]/', 'https://intranet/'].map(r => L({ p: '/', r }, 'x').source), ['Autre site', 'Autre site', 'Autre site', 'Autre site']);
  v('⛔ un sous-domaine (qui peut porter un nom) est réduit à son domaine', [L({ p: '/', r: 'https://jean-dupont.wixsite.com/site' }, 'x').source, L({ p: '/', r: 'https://www.entreprise.co.uk/' }, 'x').source], ['wixsite.com', 'entreprise.co.uk']);
  v('⛔ un chemin qui n’a pas la forme d’une page du site (un jeton dans le chemin) ne compte pas', ['/' + 'a1'.repeat(32) + '/reset', '/blog/x/y.html', '/Tarifs.HTML'].map(p => L({ p }, 'x').ignore), ['page', 'page', 'page']);
  v('une page absente du plan du site compte dans « (autre page) »', [L({ p: '/inventee.html' }, 'x', new Set(['/'])).page, L({ p: '/' }, 'x', new Set(['/'])).page], ['(autre page)', '/']);
  v('l’écran se déduit de la largeur', [380, 900, 1400, 0, 'x'].map(l => L({ p: '/', l }, 'x').ecran), ['téléphone', 'tablette', 'ordinateur', 'inconnu', 'inconnu']);

  console.log('\n2. Le module, sur disque');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'aud-'));
  let t = Date.UTC(2026, 9, 25, 10, 0, 0);
  const M = A(null, { DATA_DIR: D, sansMinuterie: true, maintenant: () => t });
  M.enregistrer({ p: '/', r: 'https://www.google.fr/search?q=logiciel+intervention+10.1.2.3', l: 390 }, 'Mozilla');
  M.enregistrer({ p: '/tarifs.html', r: 'https://teamop.fr/', l: 390 }, 'Mozilla');
  M.enregistrer({ p: '/blog/ordre-de-travail.html', de: 'lea', l: 1400 }, 'Mozilla');
  M.enregistrer({ p: '/', r: '' }, 'Googlebot');
  let R = M.resume(1);
  v('3 pages vues, 2 visites (le robot n’est pas compté, la navigation interne n’est pas une visite)', [R.totaux.vues, R.totaux.visites], [3, 2]);
  v('les sources', R.sources, [['Google', 1], ['Courriel de Léa', 1]]);
  v('les campagnes', R.campagnes, [['agent:lea', 1]]);
  v('en direct : 3 pages, 2 arrivées', [R.direct.pages, R.direct.visites], [3, 2]);
  vrai('M.ecrire() écrit', M.ecrire());
  const brut = fs.readFileSync(path.join(D, 'audience.json'), 'utf8');
  vrai('(population) le fichier porte bien les compteurs du jour', /"2026-10-25"/.test(brut) && /"vues":3/.test(brut), brut.slice(0, 200));
  vrai('⛔ le fichier ne garde ni la recherche tapée, ni l’adresse complète d’origine, ni une adresse IP, ni l’heure exacte', !/logiciel|search|q=|10\.1\.2\.3|www\.google|"ts"/.test(brut), brut);
  t += 31 * 60000;
  v('le direct oublie au-delà de 30 minutes', M.resume(1).direct.pages, 0);
  t = Date.UTC(2028, 11, 1);
  M.enregistrer({ p: '/' }, 'Mozilla'); M.elaguer(); M.ecrire();
  vrai('⛔ au-delà de 25 mois, un jour est effacé', !/"2026-10-25"/.test(fs.readFileSync(path.join(D, 'audience.json'), 'utf8')));
  { const D4 = fs.mkdtempSync(path.join(os.tmpdir(), 'aud-')); const M4 = A(null, { DATA_DIR: D4, sansMinuterie: true, maintenant: () => t });
    for (let i = 0; i < 3; i++) M4.enregistrer({ p: '/', us: 'constructor' }, 'Mozilla');
    M4.enregistrer({ p: '/', r: 'https://constructor/' }, 'Mozilla'); M4.enregistrer({ p: '/', us: '__proto__' }, 'Mozilla');
    for (let i = 0; i < 150; i++) M4.enregistrer({ p: '/', r: 'https://site' + i + '-inonde.fr/' }, 'Mozilla');
    M4.enregistrer({ p: '/', r: 'https://www.google.fr/' }, 'Mozilla');
    M4.enregistrer({ p: '/', r: 'https://www.google.com/' }, 'Mozilla');
    const R4 = M4.resume(1), toutes = Object.fromEntries(R4.sources.concat(R4.campagnes));
    v('⛔ « constructor » se compte comme un nombre (3), « __proto__ » est écarté', [R4.campagnes.find(x => x[0] === 'constructor'), R4.campagnes.some(x => x[0] === '__proto__')], [['constructor', 3], false]);
    vrai('⛔ 150 sites inventés n’effacent pas Google : il garde sa ligne', R4.sources.some(x => x[0] === 'Google'), JSON.stringify(R4.sources.slice(0, 3)));
    vrai('…et les sites inconnus sont plafonnés (le reste dans « (autres) »)', toutes['(autres)'] >= 49, JSON.stringify(R4.sources.slice(0, 3)));
    fs.rmSync(D4, { recursive: true, force: true }); }
  v('une période inconnue retombe sur 7 jours', M.resume(12).jours, 7);
  const D2 = fs.mkdtempSync(path.join(os.tmpdir(), 'aud-'));
  fs.writeFileSync(path.join(D2, 'audience.json'), '{ cassé');
  const M2 = A(null, { DATA_DIR: D2, sansMinuterie: true });
  M2.enregistrer({ p: '/' }, 'Mozilla');
  const ecrit2 = M2.ecrire();
  v('⛔ un registre illisible n’est JAMAIS réécrit', [M2.lisible(), fs.readFileSync(path.join(D2, 'audience.json'), 'utf8'), ecrit2], [false, '{ cassé', true]);
  fs.rmSync(D, { recursive: true, force: true }); fs.rmSync(D2, { recursive: true, force: true });

  console.log('\n3. Le vrai serveur');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules', 'express'))) console.log('  (sauté : server/node_modules manque)');
  else {
    const { demarrer } = require('./banc-serveur-gestion.js');
    const S = await demarrer({});
    vrai('le serveur démarre', S.vivant, S.journal().slice(-400));
    if (S.vivant) {
      const vue = (corps, origine) => fetch(S.B + '/api/audience/vue', { method: 'POST', headers: Object.assign({ 'Content-Type': 'text/plain' }, origine ? { Origin: origine } : {}), body: JSON.stringify(corps) });
      v('une page vue depuis teamop.fr : 204', (await vue({ p: '/blog/', r: 'https://www.bing.com/' }, 'https://teamop.fr')).status, 204);
      v('…avec l’en-tête CORS pour teamop.fr', (await vue({ p: '/' }, 'https://teamop.fr')).headers.get('access-control-allow-origin'), 'https://teamop.fr');
      v('⛔ sans origine, ou depuis un autre site : 403', [(await vue({ p: '/' })).status, (await vue({ p: '/' }, 'https://pirate.example')).status], [403, 403]);
      v('un corps illisible : 400', (await fetch(S.B + '/api/audience/vue', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: 'https://teamop.fr' }, body: '{ pas du json' })).status, 400);
      v('⛔ un corps qui n’est pas du texte (application/json) : 415, rien n’est lu', (await fetch(S.B + '/api/audience/vue', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://teamop.fr' }, body: JSON.stringify({ p: '/', x: 'y'.repeat(100000) }) })).status, 415);
      v('⛔ plus de 2 Ko en texte : 413', (await fetch(S.B + '/api/audience/vue', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: 'https://teamop.fr' }, body: JSON.stringify({ p: '/', x: 'y'.repeat(3000) }) })).status, 413);
      const rafale = []; for (let i = 0; i < 31; i++) rafale.push((await fetch(S.B + '/api/audience/vue', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: 'https://teamop.fr', 'X-Forwarded-For': '2001:db8:aa:bb:' + i + '::1' }, body: '{"p":"/blog/"}' })).status);
      v('⛔ trente pages par 10 min pour un même abonné IPv6 (le /64), même en changeant d’adresse : la 31ᵉ est refusée', [rafale.slice(0, 30).every(c => c === 204), rafale[30]], [true, 429]);
      const p = await S.get('/api/monitor/audience?jours=7');
      v('le patron lit : 32 pages vues et 32 visites (2 + la rafale, arrivées sans page d’origine), Bing parmi les sources', [p.s, p.j.totaux && p.j.totaux.vues, p.j.totaux && p.j.totaux.visites, (p.j.sources || []).map(x => x[0])], [200, 32, 32, ['Accès direct', 'Bing']]);
      v('⛔ un collaborateur et un anonyme ne lisent pas : 403', [(await S.get('/api/monitor/audience', S.TA)).s, (await S.get('/api/monitor/audience', '')).s], [403, 403]);
    }
    await S.fin();
  }

  console.log('\n4. Le site');
  const pages = fs.readdirSync(RACINE).filter(f => f.endsWith('.html')).map(f => f).concat(fs.readdirSync(path.join(RACINE, 'blog')).filter(f => f.endsWith('.html')).map(f => 'blog/' + f));
  const avecCookies = pages.filter(f => fs.readFileSync(path.join(RACINE, f), 'utf8').includes('<script src="/cookies.js" defer></script>'));
  vrai('(population) au moins vingt pages portent le bandeau cookies', avecCookies.length >= 20, avecCookies.length);
  v('⛔ chaque page qui porte cookies.js porte aussi audience.js', avecCookies.filter(f => !fs.readFileSync(path.join(RACINE, f), 'utf8').includes('<script src="/audience.js" defer></script>')), []);
  const js = fs.readFileSync(path.join(RACINE, 'audience.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('⛔ audience.js ne range rien dans le navigateur (ni cookie, ni stockage)', !/document\.cookie|localStorage|sessionStorage|indexedDB/.test(js));
  vrai('audience.js ne parle que depuis teamop.fr, et respecte « ne pas me suivre »', /\^\(www\\\.\)\?teamop\\\.fr\$/.test(js) && /globalPrivacyControl/.test(js) && /doNotTrack/.test(js));
  /* on JOUE le script : depuis teamop.fr il envoie, ailleurs il se tait */
  const jouer = (hote, nav) => { const envois = []; const sb = { location: { hostname: hote, pathname: '/blog/', search: '?de=lea' }, document: { referrer: '' }, window: { innerWidth: 390 },
      navigator: Object.assign({ sendBeacon: (u, b) => { envois.push(u); return true; } }, nav || {}), URLSearchParams, Blob: function (x) { this.x = x; }, fetch: () => Promise.resolve() };
    new Function(...Object.keys(sb), fs.readFileSync(path.join(RACINE, 'audience.js'), 'utf8'))(...Object.values(sb)); return envois; };
  v('depuis teamop.fr : un envoi vers api.teamop.fr', jouer('teamop.fr'), ['https://api.teamop.fr/api/audience/vue']);
  v('⛔ depuis l’aperçu local, ou un navigateur piloté, ou « ne pas me suivre » : rien', [jouer('127.0.0.1').length, jouer('teamop.fr', { webdriver: true }).length, jouer('teamop.fr', { doNotTrack: '1' }).length], [0, 0, 0]);
  const conf = fs.readFileSync(path.join(RACINE, 'confidentialite.html'), 'utf8');
  vrai('confidentialite.html dit la mesure sans cookie et sa durée', /sans cookie et sans identifiant/.test(conf) && /25 mois/.test(conf));

  console.log('\n5. Les courriels des agents');
  const SIG = require(path.join(RACINE, 'server', 'agents-signature.js'));
  v('Léa, Camille, Chloé : le lien porte leur nom', ['lea', 'camille', 'chloe'].map(a => SIG.formater('X', 'Assistante virtuelle', 'Équipe TeamOP', 'contact@teamop.fr', true, a).split('\n')[1]),
    ['contact@teamop.fr · https://teamop.fr/?de=lea', 'contact@teamop.fr · https://teamop.fr/?de=camille', 'contact@teamop.fr · https://teamop.fr/?de=chloe']);
  v('les autres (Hugo…) : « teamop.fr » tout court', SIG.formater('Hugo', 'Assistant virtuel', 'Équipe TeamOP', 'contact@teamop.fr').split('\n')[1], 'contact@teamop.fr · teamop.fr');
  const D3 = fs.mkdtempSync(path.join(os.tmpdir(), 'aud-'));
  const S3 = SIG(null, { DATA_DIR: D3, agents: { AGENTS: [{ id: 'lea', nom: 'Léa' }, { id: 'hugo', nom: 'Hugo' }] } });
  v('⛔ par la vraie composition : Léa porte « ?de=lea », Hugo non', [S3.composer('lea', 'contact@teamop.fr').split('\n')[1], S3.composer('hugo', 'contact@teamop.fr').split('\n')[1]],
    ['contact@teamop.fr · https://teamop.fr/?de=lea', 'contact@teamop.fr · teamop.fr']);
  fs.rmSync(D3, { recursive: true, force: true });
  v('⛔ chaque agent marqué est connu de l’audience (sinon ses visites tomberaient dans « Accès direct »)', [...SIG.AGENTS_COURRIER].filter(a => !A.AGENTS[a]), []);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
