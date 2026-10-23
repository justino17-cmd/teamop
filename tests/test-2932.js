/* ⛔ CE QUE CE FICHIER GARDE — LA CLÉ D'EXAMEN CONTRE LE VRAI SERVEUR (23 octobre 2026, cahier `design/EQUIPE-AGENTS.md` §13, dernier point).
   Justin : « plutôt qu'un accès à la Tour (qui ferait lire les vraies données des clients à une IA, flux non couvert par sous-traitance.html), la Tour génère une clé qui
   ne permet QUE deux gestes : lancer l'examen et lire ses résultats (données fictives uniquement) ». Le vrai `server/index.js`, un faux Claude, du HTTP :
     · la clé se crée et se supprime depuis la Tour, par le patron seul ; elle est montrée UNE fois (la réponse de création), jamais relue ; UNE seule vivante ;
     · ⛔ ELLE N'EST NULLE PART SUR LE DISQUE : le dossier de données ENTIER est fouillé (fichiers, sous-dossiers) après sa création, après son usage et après un redémarrage ;
     · elle lance l'examen et lit l'état et le résultat — et RIEN d'autre : ⛔ sur CHAQUE route /api/monitor du serveur (relevées dans les sources, comme les enregistre
       Express), la réponse avec la clé est la MÊME que sans aucun identifiant — hors les trois routes d'examen. Ni les agents, ni les conversations, ni les dossiers, ni le
       courrier, ni les clients ne lui répondent ;
     · elle ne passe pas autrement que par l'en-tête `Authorization: Bearer` (ni la requête, ni le corps, ni un autre en-tête) ;
     · la supprimer ou la remplacer la tue à l'instant, et la suppression survit à un redémarrage ;
     · chaque usage est journalisé (« clé d'examen : examen lancé »), sans jamais écrire la clé ; un par heure vaut pour elle aussi ;
     · l'en-tête `Authorization` est dans la liste CORS (la liste ne porte que Content-Type, Authorization, X-Teamop-Devis, X-Teamop-Kh). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 700)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 400) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2932-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); fin(); process.exit(1); }, 170000).unref();
const att = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(80); } return false; };
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

/* Les routes /api/monitor déclarées par le serveur, relevées dans le CODE (commentaires retirés) de tous ses fichiers. */
function routesMonitor() {
  const sortie = new Map();
  for (const f of fs.readdirSync(path.join(RACINE, 'server')).filter(x => x.endsWith('.js'))) {
    const code = fs.readFileSync(path.join(RACINE, 'server', f), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    for (const m of code.matchAll(/\bapp\.(get|post|put|patch|delete)\(\s*(['"`])(\/api\/monitor\/[^'"`]*)\2/g)) sortie.set(m[1].toUpperCase() + ' ' + m[3], { methode: m[1].toUpperCase(), chemin: m[3], fichier: f });
  }
  return [...sortie.values()];
}
/* Tous les fichiers d'un dossier, sous-dossiers compris, avec leur contenu. */
function toutLire(dir) { const l = []; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) l.push(...toutLire(p)); else { try { l.push([p, fs.readFileSync(p, 'latin1')]); } catch (x) {} } } return l; }

console.log('\n── 2932 · la clé d’examen contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const PRE = path.join(banc, 'claude.js'), DEFAUTS = path.join(banc, 'defauts.json');
  fs.writeFileSync(DEFAUTS, '[]');
  fs.writeFileSync(PRE, `const vrai = globalThis.fetch; const B = require(${JSON.stringify(path.join(__dirname, 'banc-examen.js'))});
globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) return new Response(JSON.stringify(B.reponseHttp(JSON.parse(String(opts && opts.body)), [])), { status: 200, headers: { 'content-type': 'application/json' } });
  if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
  return vrai.apply(this, arguments); };\n`);
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-du-banc-2932';
  async function serveur(nom) {
    const D = path.join(banc, nom, 'data'); fs.mkdirSync(D, { recursive: true });
    if (!fs.existsSync(path.join(D, 'clients.json'))) { fs.writeFileSync(path.join(D, 'clients.json'), '{}'); fs.writeFileSync(path.join(D, 'espaces.json'), '{}'); }
    const vap = webpush.generateVAPIDKeys(); const conf = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_2932' }, agents: { cleApi: 'sk-ant-' + 'api03-banc-2932-xxxxxxxxxxxxxxxx', reunionsAuto: false } };
    fs.writeFileSync(path.join(banc, nom, 'config.json'), JSON.stringify(conf));
    const PORT = await libre(); let journal = '';
    const env = Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, nom, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z' });
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
    const B = 'http://127.0.0.1:' + PORT; let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    vrai('le serveur « ' + nom + ' » démarre', vivant); if (!vivant) { console.log(journal.slice(0, 800)); process.exit(1); }
    let nreq = 0;
    const req = async (m, r, c, j, plus) => { const x = await fetch(B + r, { method: m, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.7.' + Math.floor(nreq / 200) + '.' + (1 + (nreq++ % 200)) }, j ? { Authorization: 'Bearer ' + j } : {}, plus || {}), body: m === 'GET' || m === 'HEAD' ? undefined : JSON.stringify(c || {}) }); let r2 = null, texte = ''; try { texte = await x.text(); r2 = JSON.parse(texte); } catch (y) {} return { s: x.status, j: r2 || {}, texte, h: x.headers }; };
    const jeton = (await req('POST', '/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
    return { B, D, req, journal: () => journal, G: r => req('GET', r, null, jeton), P: (r, c) => req('POST', r, c, jeton), jeton, lire: f => { try { return JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (x) { return null; } },
      arreter: async () => { e.kill('SIGKILL'); await dormir(300); } };
  }
  const attendreFin = async (S, h) => att(async () => { const g = (await S.req('GET', '/api/monitor/agents/examen', null, h)).j; return g && g.courant === null && g.resultats && g.resultats.length > 0; }, 60000);

  let S = await serveur('cle');
  const g0 = (await S.G('/api/monitor/agents/examen')).j;
  v('au départ : aucune clé', g0.cle, { existe: false });

  console.log('\n1. La clé se crée depuis la Tour, une seule fois visible');
  const c1 = await S.P('/api/monitor/agents/examen/cle');
  vrai('création : « exam_ » + 48 hexadécimaux', c1.s === 200 && /^exam_[a-f0-9]{48}$/.test(c1.j.cle), c1.texte);
  const CLE = c1.j.cle, HEX = CLE.slice(5);
  vrai('réponse jamais mise en cache', /no-store/.test(c1.h.get('cache-control') || ''));
  const gk = (await S.G('/api/monitor/agents/examen')).j;
  vrai('⛔ la Tour revoit qu’elle existe, sa date, qui l’a créée — jamais la clé ni son empreinte', gk.cle.existe === true && gk.cle.par === 'Patron' && gk.cle.creeLe > 0 && !JSON.stringify(gk).includes(HEX) && !JSON.stringify(gk).includes(kh(CLE)));
  const fouille = () => toutLire(S.D).filter(([p, c]) => c.includes(CLE) || c.includes(HEX));
  v('⛔ la clé n’est dans AUCUN fichier du dossier de données (fouille complète, sous-dossiers compris)', fouille().map(x => path.basename(x[0])), []);
  vrai('…seule son empreinte SHA-256 est gardée', fs.readFileSync(path.join(S.D, 'examen-etat.json'), 'utf8').includes(kh(CLE)));
  vrai('…et rien de la clé ne sort dans les journaux du serveur', !S.journal().includes(HEX));

  console.log('\n2. Elle lance l’examen et en lit les résultats');
  const K = c => ({ Authorization: 'Bearer ' + c });
  const lk = await S.req('GET', '/api/monitor/agents/examen', null, null, K(CLE));
  vrai('lire l’état : 200, sans le détail de la clé', lk.s === 200 && Array.isArray(lk.j.resultats) && !('cle' in lk.j), lk.texte);
  v('lire un résultat quand il n’y en a pas : 404', (await S.req('GET', '/api/monitor/agents/examen/resultat', null, null, K(CLE))).s, 404);
  const pk = await S.req('POST', '/api/monitor/agents/examen/lancer', {}, null, K(CLE));
  v('lancer : 202 avec l’identifiant et le coût annoncé', [pk.s, typeof pk.j.id, pk.j.appelsMax, pk.j.usdMax], [202, 'string', 200, 12]);
  vrai('l’examen se termine', await attendreFin(S, CLE), 'figé');
  const rk = (await S.req('GET', '/api/monitor/agents/examen/resultat?id=' + pk.j.id, null, null, K(CLE))).j.resultat;
  vrai('…et la clé lit le résultat COMPLET (neuf scénarios, conversations)', rk && rk.scenarios.length === 9 && rk.scenarios.every(s => Array.isArray(s.verifs)) && rk.source === 'cle', JSON.stringify(rk).slice(0, 200));
  v('…9 réussis, rien d’autre', [rk.bilan.ok, rk.bilan.ko, rk.bilan.inconnu], [9, 0, 0]);
  const rk2 = await S.req('POST', '/api/monitor/agents/examen/lancer', {}, null, K(CLE));
  v('⛔ un par heure vaut aussi pour la clé : 429 avec le délai', [rk2.s, rk2.j.raison, rk2.j.reessayerDans > 3000], [429, 'heure', true]);
  const jr = (await S.G('/api/monitor/agents/journal?limite=500')).j.journal;
  const lignes = jr.filter(e => /clé d'examen/.test(e.action)).map(e => e.action);
  vrai('chaque usage est journalisé : « clé d\'examen : examen lancé », la lecture, le refus', lignes.includes('clé d\'examen : examen lancé') && lignes.includes('clé d\'examen : résultats lus') && lignes.includes('clé d\'examen : lancement refusé'), JSON.stringify(lignes));
  vrai('…avec l’identifiant « systeme », jamais la clé', jr.filter(e => /clé d'examen/.test(e.action)).every(e => e.agent === 'systeme') && !JSON.stringify(jr).includes(HEX));
  v('⛔ après l’usage, toujours aucune trace de la clé sur le disque', fouille().map(x => path.basename(x[0])), []);

  console.log('\n3. ⛔ ELLE NE FAIT RIEN D’AUTRE : chaque route /api/monitor du serveur répond comme SANS identifiant');
  const routes = routesMonitor();
  const examen = r => /^\/api\/monitor\/agents\/examen(\/(resultat|lancer))?$/.test(r.chemin);
  vrai('(population) les routes /api/monitor relevées dans les sources : plus de cent, GET et POST', routes.length > 100 && routes.some(r => r.methode === 'GET') && routes.some(r => r.methode === 'POST'), routes.length);
  vrai('(population) les routes des fichiers mail, agents, conversations, dossiers, contrats, reunions, direction et portail y sont', ['mail.js', 'agents.js', 'conversations.js', 'dossiers.js', 'contrats.js', 'reunions.js', 'direction.js', 'portail.js', 'examen.js', 'index.js'].every(f => routes.some(r => r.fichier === f)), [...new Set(routes.map(r => r.fichier))].join(' '));
  const aTester = routes.filter(r => !examen(r)).map(r => ({ methode: r.methode, url: r.chemin.replace(/:[A-Za-z_]+/g, 'x') }));
  const diff = [];
  let comptes = 0;
  for (const r of aTester) {
    const sans = await S.req(r.methode, r.url, {}), avec = await S.req(r.methode, r.url, {}, null, K(CLE));
    comptes++;
    if (sans.s !== avec.s || (sans.s < 400 && JSON.stringify(sans.j) !== JSON.stringify(avec.j))) diff.push(r.methode + ' ' + r.url + ' : ' + sans.s + ' sans, ' + avec.s + ' avec la clé');
  }
  v('⛔ ' + comptes + ' routes éprouvées une à une : la clé ne change JAMAIS la réponse (même code, même corps quand la route est ouverte)', diff, []);
  const refusees = [];
  for (const r of aTester.filter(x => /\/agents|\/conversations|\/dossiers|\/contrats|\/mail|\/clients|\/espaces|\/users|\/journal|\/issues/.test(x.url)).slice(0, 80)) { const a = await S.req(r.methode, r.url, {}, null, K(CLE)); if (a.s < 400) refusees.push(r.methode + ' ' + r.url + ' → ' + a.s); }
  vrai('…et les routes sensibles (agents, conversations, dossiers, contrats, courrier, clients, entreprises, comptes, journal, incidents) la REFUSENT toutes (401 ou 403)', refusees.length === 0, refusees.join(' ; '));
  const sensibles = ['/api/monitor/agents', '/api/monitor/agents/validations', '/api/monitor/agents/taches', '/api/monitor/agents/journal', '/api/monitor/conversations', '/api/monitor/conversations/margaux', '/api/monitor/dossiers', '/api/monitor/mail/liste', '/api/monitor/users', '/api/monitor/journal'];
  v('(témoins) dix routes qui portent des données de clients ou de l’équipe : toutes refusées à la clé', await Promise.all(sensibles.map(async u => (await S.req('GET', u, null, null, K(CLE))).s >= 400)), sensibles.map(() => true));
  v('(contre-épreuve) ces dix mêmes routes répondent au patron — la clé est refusée, pas les routes absentes', (await Promise.all(sensibles.map(async u => (await S.G(u)).s))).filter(s => s === 404).length, 0);
  v('⛔ la clé ne crée pas de clé et ne la supprime pas', [(await S.req('POST', '/api/monitor/agents/examen/cle', {}, null, K(CLE))).s, (await S.req('POST', '/api/monitor/agents/examen/cle/supprimer', {}, null, K(CLE))).s], [403, 403]);
  vrai('…ni ne lance une réunion, ne change un mode, ne décide d’une validation, n’écrit dans une conversation', await (async () => {
    const x = await Promise.all([['/api/monitor/agents/reunions/lancer', { type: 'objectifs' }], ['/api/monitor/agents/mode', { agent: 'lea', mode: 'brouillon' }], ['/api/monitor/agents/pause', { pause: true }], ['/api/monitor/conversations/envoyer', { fil: 'equipe', texte: 'bonjour' }], ['/api/monitor/agents/validations/decider', { id: 'abc', decision: 'accepter' }]].map(([u, c]) => S.req('POST', u, c, null, K(CLE))));
    return x.every(r => r.s === 403 || r.s === 401);
  })());
  v('…et rien n’a bougé : tous les agents réels sont toujours à l’arrêt, pas de pause', await (async () => { const a = (await S.G('/api/monitor/agents')).j; return [a.agents.filter(x => x.mode !== 'arret').length, a.pause.actif]; })(), [0, false]);

  console.log('\n4. Elle ne passe que par l’en-tête « Authorization: Bearer »');
  const hors = [
    ['dans la requête (?cle=)', S.req('GET', '/api/monitor/agents/examen?cle=' + CLE + '&key=' + CLE + '&token=' + CLE)],
    ['dans un autre en-tête (X-Teamop-Kh, X-API-Key, Cookie)', S.req('GET', '/api/monitor/agents/examen', null, null, { 'X-Teamop-Kh': CLE, 'X-API-Key': CLE, Cookie: 'cle=' + CLE })],
    ['sans « Bearer »', S.req('GET', '/api/monitor/agents/examen', null, null, { Authorization: CLE })],
    ['avec « Basic »', S.req('GET', '/api/monitor/agents/examen', null, null, { Authorization: 'Basic ' + Buffer.from('examen:' + CLE).toString('base64') })],
    ['en majuscules', S.req('GET', '/api/monitor/agents/examen', null, null, { Authorization: 'Bearer ' + CLE.toUpperCase() })],
    ['tronquée', S.req('GET', '/api/monitor/agents/examen', null, null, { Authorization: 'Bearer ' + CLE.slice(0, 40) })],
    ['avec un caractère de trop', S.req('GET', '/api/monitor/agents/examen', null, null, { Authorization: 'Bearer ' + CLE + '0' })],
    ['dans le corps d’un lancement', S.req('POST', '/api/monitor/agents/examen/lancer', { cle: CLE, Authorization: 'Bearer ' + CLE })],
  ];
  for (const [nom, p] of hors) { const x = await p; vrai('refusée ' + nom + ' (401 ou 403)', x.s === 401 || x.s === 403, x.s); }
  v('une clé de la bonne forme mais fausse : 401', (await S.req('GET', '/api/monitor/agents/examen', null, null, K('exam_' + '0'.repeat(48)))).s, 401);
  v('un jeton de session de la Tour de la forme d’une clé n’en est pas une', (await S.req('GET', '/api/monitor/agents/examen', null, null, K('exam_' + S.jeton))).s, 401);
  v('la clé n’ouvre pas non plus les routes des autres consoles du serveur (santé, bêta)', [(await S.req('GET', '/api/monitor/beta', null, null, K(CLE))).s >= 400, (await S.req('GET', '/api/monitor/sante', null, null, K(CLE))).s >= 400], [true, true]);

  console.log('\n5. CORS : « Authorization » est dans la liste, les requêtes préalables passent');
  const pre = await fetch(S.B + '/api/monitor/agents/examen/lancer', { method: 'OPTIONS', headers: { Origin: 'https://teamop.fr', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
  v('requête préalable : 204, l’origine est la nôtre, « Authorization » permis, « POST » permis', [pre.status, pre.headers.get('access-control-allow-origin'), /Authorization/.test(pre.headers.get('access-control-allow-headers') || ''), /POST/.test(pre.headers.get('access-control-allow-methods') || '')], [204, 'https://teamop.fr', true, true]);
  const pre2 = await fetch(S.B + '/api/monitor/agents/examen', { method: 'OPTIONS', headers: { Origin: 'https://autre-site.example', 'Access-Control-Request-Headers': 'authorization' } });
  v('…une origine étrangère n’obtient aucun accès (aucun en-tête d’autorisation)', pre2.headers.get('access-control-allow-origin'), null);

  console.log('\n6. Remplacer ou supprimer la clé la tue à l’instant — et la suppression survit à un redémarrage');
  const c2 = await S.P('/api/monitor/agents/examen/cle');
  v('une autre clé remplace la première', [c2.s, c2.j.remplacee, c2.j.cle !== CLE], [200, true, true]);
  v('⛔ la première est morte à l’instant, la seconde vit', [(await S.req('GET', '/api/monitor/agents/examen', null, null, K(CLE))).s, (await S.req('GET', '/api/monitor/agents/examen', null, null, K(c2.j.cle))).s], [401, 200]);
  v('⛔ un seul empreinte sur le disque (une seule clé vivante)', (fs.readFileSync(path.join(S.D, 'examen-etat.json'), 'utf8').match(/[a-f0-9]{64}/g) || []).length, 1);
  const sup = await S.P('/api/monitor/agents/examen/cle/supprimer');
  v('supprimer : la seconde meurt à l’instant', [sup.j, (await S.req('GET', '/api/monitor/agents/examen', null, null, K(c2.j.cle))).s], [{ ok: true, supprimee: true }, 401]);
  const c3 = await S.P('/api/monitor/agents/examen/cle');
  await S.arreter();
  S = await serveur('cle');
  v('après un redémarrage, la clé vivante vit encore (l’empreinte suffit)', (await S.req('GET', '/api/monitor/agents/examen', null, null, K(c3.j.cle))).s, 200);
  await S.P('/api/monitor/agents/examen/cle/supprimer');
  await S.arreter();
  S = await serveur('cle');
  v('…et supprimée avant un redémarrage, elle reste morte', [(await S.req('GET', '/api/monitor/agents/examen', null, null, K(c3.j.cle))).s, (await S.req('GET', '/api/monitor/agents/examen', null, null, K(CLE))).s], [401, 401]);
  v('⛔ en fin de banc, aucune des trois clés n’a laissé de trace dans le dossier de données', toutLire(S.D).filter(([p, c]) => [CLE, c2.j.cle, c3.j.cle].some(k => c.includes(k.slice(5)))).map(x => path.basename(x[0])), []);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); process.exit(1); });
