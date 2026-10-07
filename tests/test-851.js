/* ⛔ CE QUE CE FICHIER GARDE — PUBLIER OP MESSAGES DEPUIS LA TOUR (le VRAI serveur d'OP GESTION, un faux GitHub, deux fausses instances d'OP MESSAGES).

   7 octobre 2026, Justin : « la bêta, tu la fais ; la version publique, comme OP GESTION, on la fait dans la Tour ». `POST /api/monitor/messages/publier`
   (patron) lit le commit que SERT la bêta, lance `deploiement-messages.yml` (cible prod, ce commit), et approuve l'environnement `msg-prod` quand le job
   de production l'attend — après les bancs. Ce banc tient :
     · ⛔ le patron seul ; sans jeton GitHub sur le serveur, le DIRE (503) ;
     · ⛔ on publie le commit de la BÊTA (son `/health`), jamais un autre ; une bêta qui ne le dit pas, ou une publique qui sert déjà le même : rien ne part ;
     · la demande à GitHub : la bonne route, le jeton du serveur, `ref: main`, `cible: prod` ;
     · le suivi : lancé → bancs → approuvé (au nom du patron, l'environnement `msg-prod`, une seule fois) → en ligne ; un banc rouge → échec ;
     · une approbation que le jeton ne peut pas donner : « à approuver », avec le lien ; un refus de GitHub a sa phrase ;
     · une publication à la fois ; `GET /api/monitor/messages/versions` dit le commit de chaque instance et l'état de la publication.  */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
if (!fs.existsSync(path.join(T.RACINE, 'server', 'node_modules', 'web-push'))) { console.log('  (server/node_modules absent : banc sauté)'); fin('test-851'); process.exit(0); }

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const MDP_TOUR = 'mot-de-passe-de-la-tour-851';
const SHA_BETA = 'b'.repeat(8) + crypto.randomBytes(16).toString('hex');
const SHA_PROD = 'a'.repeat(8) + crypto.randomBytes(16).toString('hex');

/* un petit serveur HTTP : `traiter(req, corps)` → { code, j } */
function serveur(traiter) {
  return new Promise(ok => {
    const s = http.createServer((req, res) => {
      let corps = ''; req.on('data', d => { corps += d; });
      req.on('end', () => { let j = null; try { j = corps ? JSON.parse(corps) : null; } catch (e) {} const r = traiter(req, j) || { code: 404 }; res.writeHead(r.code, { 'Content-Type': 'application/json' }); res.end(r.j === undefined ? '' : JSON.stringify(r.j)); });
    });
    s.listen(0, '127.0.0.1', () => ok({ s, port: s.address().port, url: 'http://127.0.0.1:' + s.address().port }));
  });
}

(async () => {
  /* les deux instances d'OP MESSAGES : ce qu'elles servent se règle pendant le banc */
  const inst = { beta: { sha: SHA_BETA, v: 68 }, prod: { sha: SHA_PROD, v: 21 } };
  const instance = (k) => serveur((req) => {
    if (req.url === '/api/config') return { code: 200, j: { version_client: inst[k].v, build: 'abcdef012345', min_client: 1, comptes: { inscription: false } } };
    if (req.url === '/health') return { code: 200, j: inst[k].sha === null ? { ok: true } : { ok: true, sha: inst[k].sha } };
  });
  const [ib, ip] = await Promise.all([instance('beta'), instance('prod')]);

  /* le faux GitHub : il note chaque demande ; le déroulé d'un lancement se règle pendant le banc */
  const G = { demandes: [], run: null, deroule: [], peutApprouver: true, refusLancer: 0, approbations: [] };
  const gh = await serveur((req, j) => {
    G.demandes.push({ m: req.method, u: req.url, auth: req.headers.authorization, j });
    const base = '/repos/org-banc/depot-banc';
    if (!req.url.startsWith(base)) return { code: 404, j: { message: 'Not Found' } };
    const u = req.url.slice(base.length);
    if (req.method === 'POST' && u === '/actions/workflows/deploiement-messages.yml/dispatches') {
      if (G.refusLancer) return { code: G.refusLancer, j: { message: 'Resource not accessible by personal access token' } };
      G.run = { id: 4242 + G.demandes.length, created_at: new Date().toISOString(), html_url: 'https://github.example/run/' + (4242 + G.demandes.length), etapes: G.deroule.slice() };
      return { code: 204 };
    }
    if (req.method === 'GET' && u.startsWith('/actions/workflows/deploiement-messages.yml/runs')) return { code: 200, j: { workflow_runs: G.run ? [{ id: G.run.id, created_at: G.run.created_at, html_url: G.run.html_url }] : [] } };
    if (G.run && req.method === 'GET' && u === '/actions/runs/' + G.run.id) {
      const e = G.run.etapes.length > 1 ? G.run.etapes.shift() : G.run.etapes[0];
      return { code: 200, j: { id: G.run.id, html_url: G.run.html_url, status: e[0], conclusion: e[1] || null } };
    }
    if (G.run && req.method === 'GET' && u === '/actions/runs/' + G.run.id + '/pending_deployments') return { code: 200, j: [{ environment: { id: 77, name: 'msg-prod' }, current_user_can_approve: G.peutApprouver }] };
    if (G.run && req.method === 'POST' && u === '/actions/runs/' + G.run.id + '/pending_deployments') {
      G.approbations.push(j);
      G.run.etapes = [['in_progress'], ['completed', 'success']];
      return { code: 200, j: [] };
    }
    return { code: 404, j: { message: 'Not Found' } };
  });

  /* le VRAI serveur d'OP GESTION, isolé */
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-851-'));
  fs.mkdirSync(path.join(dossier, 'data'), { recursive: true });
  const webpush = require(path.join(T.RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  const lancer = async (github) => {
    const cfg = path.join(dossier, github ? 'config.json' : 'config-sans.json');
    fs.writeFileSync(cfg, JSON.stringify(Object.assign({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP_TOUR) }, github ? { github: { token: 'jeton-du-banc-851', depot: 'org-banc/depot-banc' } } : {})));
    const port = await T.portLibre();
    const enfant = spawn(process.execPath, [path.join(T.RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, {
      TEAMOP_CONFIG: cfg, TEAMOP_DATA: path.join(dossier, github ? 'data' : 'data-sans'), PORT: String(port),
      TEAMOP_GITHUB_API_URL: gh.url, TEAMOP_MSG_BETA_URL: ib.url, TEAMOP_MSG_PROD_URL: ip.url, TEAMOP_MSG_PUB_PAS_MS: '150' }), stdio: ['ignore', 'pipe', 'pipe'] });
    let sortie = ''; enfant.stdout.on('data', d => { sortie += d; }); enfant.stderr.on('data', d => { sortie += d; });
    const base = 'http://127.0.0.1:' + port;
    const vivant = await T.attendre(async () => { try { return (await fetch(base + '/health')).ok; } catch (e) { return false; } }, 15000, 100);
    if (!vivant) throw new Error('OP GESTION n\'a pas démarré\n' + sortie.slice(0, 800));
    return { base, tuer: () => { try { enfant.kill('SIGKILL'); } catch (e) {} }, sortie: () => sortie };
  };
  fs.mkdirSync(path.join(dossier, 'data-sans'), { recursive: true });
  const json = async (base, m, chemin, corps, ent) => { const r = await fetch(base + chemin, { method: m, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.' + (1 + Math.floor(Math.random() * 200)) }, ent || {}), body: corps === undefined ? undefined : JSON.stringify(corps) }); let j = null; try { j = await r.json(); } catch (e) {} return { code: r.status, j }; };
  const og = await lancer(true), ogSans = await lancer(false);
  try {
    const H = { Authorization: 'Bearer ' + (await json(og.base, 'POST', '/api/monitor/login', { nom: 'Justin', pass: MDP_TOUR })).j.token };
    const Hs = { Authorization: 'Bearer ' + (await json(ogSans.base, 'POST', '/api/monitor/login', { nom: 'Justin', pass: MDP_TOUR })).j.token };
    const publier = (h, base) => json(base || og.base, 'POST', '/api/monitor/messages/publier', {}, h);
    const versions = async () => (await json(og.base, 'GET', '/api/monitor/messages/versions', undefined, H)).j;

    console.log('\n1. Qui publie, et avec quoi');
    v('⛔ sans être le patron (aucun jeton de la Tour) : 403, et rien ne part chez GitHub', [(await publier({})).code, G.demandes.length], [403, 0]);
    let r = await publier(Hs, ogSans.base);
    vrai('⛔ un serveur sans jeton GitHub le DIT (503), au lieu de faire semblant', r.code === 503 && /jeton GitHub/.test(r.j.error));
    let x = await versions();
    v('les versions disent le commit de chaque instance (7 signes) et que la publication est possible', [x.beta.service.sha, x.prod.service.sha, x.publier, x.publication], [SHA_BETA.slice(0, 7), SHA_PROD.slice(0, 7), true, null]);

    console.log('\n2. Ce qu\'on publie : le commit de la bêta, rien d\'autre');
    inst.beta.sha = null;
    r = await publier(H);
    v('⛔ une bêta qui ne dit pas son commit : 409, rien ne part', [r.code, /ne dit pas quel commit/.test(r.j.error), G.demandes.length], [409, true, 0]);
    inst.beta.sha = SHA_PROD;
    r = await publier(H);
    v('⛔ la publique sert déjà le commit de la bêta : 409, rien ne part', [r.code, /déjà le même commit/.test(r.j.error), G.demandes.length], [409, true, 0]);
    inst.beta.sha = SHA_BETA;
    G.refusLancer = 403;
    r = await publier(H);
    vrai('un jeton sans le droit de lancer un workflow : 502 et la phrase qui dit quoi ajouter (« Actions : lecture et écriture »)', r.code === 502 && /Actions : lecture et écriture/.test(r.j.error));
    G.refusLancer = 0; G.demandes = [];

    console.log('\n3. Le lancement, les bancs, l\'approbation, la mise en ligne');
    G.deroule = [['queued'], ['in_progress'], ['in_progress'], ['waiting']];
    r = await publier(H);
    v('Justin publie : 200, état « lancé », le commit de la bêta', [r.code, r.j.publication.etat, r.j.publication.sha, r.j.publication.par], [200, 'lance', SHA_BETA.slice(0, 7), 'Justin']);
    const lancement = G.demandes.find(d => d.m === 'POST' && /dispatches$/.test(d.u));
    v('la demande à GitHub : la route du workflow, le jeton du serveur, `main`, la production, CE commit', [!!lancement, lancement && lancement.auth, lancement && lancement.j], [true, 'Bearer jeton-du-banc-851', { ref: 'main', inputs: { cible: 'prod', sha: SHA_BETA, retour: 'false' } }]);
    v('⛔ une seconde publication pendant celle-ci : 409', (await publier(H)).code, 409);
    vrai('pendant les bancs : « tests », avec le lien du déploiement', !!(await T.attendre(async () => { const p = (await versions()).publication; return p && p.etat === 'tests' && /run\//.test(p.url); }, 8000, 50)));
    vrai('les bancs passés, le job attend msg-prod : approuvé au nom de Justin, puis EN LIGNE', !!(await T.attendre(async () => (await versions()).publication.etat === 'en_ligne', 10000, 50)));
    v('⛔ une seule approbation, pour l\'environnement msg-prod (77), « approved », au nom de Justin', [G.approbations.length, G.approbations[0] && G.approbations[0].environment_ids, G.approbations[0] && G.approbations[0].state, /Justin/.test(G.approbations[0] && G.approbations[0].comment || '')], [1, [77], 'approved', true]);

    console.log('\n4. Un banc rouge, une approbation impossible');
    G.deroule = [['in_progress'], ['completed', 'failure']];
    inst.prod.sha = 'c'.repeat(40);
    r = await publier(H);
    v('après une publication finie, on peut republier (200)', r.code, 200);
    vrai('⛔ les bancs tombent : « échec » (rien n\'a été approuvé)', !!(await T.attendre(async () => (await versions()).publication.etat === 'echec', 8000, 50)) && G.approbations.length === 1);
    G.deroule = [['in_progress'], ['waiting']]; G.peutApprouver = false;
    r = await publier(H);
    vrai('un jeton qui ne peut pas approuver : « à approuver », avec le lien où le faire — rien n\'est approuvé à sa place', !!(await T.attendre(async () => { const p = (await versions()).publication; return p.etat === 'a_approuver' && /run\//.test(p.url); }, 8000, 50)) && G.approbations.length === 1);
    v('…et tant qu\'elle attend, pas de seconde publication (409)', (await publier(H)).code, 409);
    vrai('⛔ le jeton du serveur ne paraît ni dans les réponses de la Tour ni dans le journal', !JSON.stringify(await versions()).includes('jeton-du-banc') && !og.sortie().includes('jeton-du-banc'));
  } catch (e) {
    vrai('le banc est mort : ' + (e && e.stack || e), false);
  } finally {
    og.tuer(); ogSans.tuer(); ib.s.close(); ip.s.close(); gh.s.close();
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
    fin('test-851');
  }
})();
