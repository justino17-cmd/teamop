/* test-3295 — DEUX FAILLES DE L'AUDIT DE SÉCURITÉ DE LA NUIT DU 5 NOVEMBRE 2026, FERMÉES CÔTÉ SERVEUR.
 *
 * D1 · POST /api/espaces/lien (route PUBLIQUE) : connaître `t` et envoyer un `kh` FAUX posait `clePerimee` et réécrivait l'annuaire — le
 *      site cessait de servir le code de connexion de l'entreprise (409 `cle_perimee`) jusqu'à ce que la Tour la réinscrive : un déni de
 *      service anonyme. Une requête qui ne prouve pas la clé de l'annuaire ne change plus AUCUN état ; la réponse 404 `cle_changee` reste.
 * D2 · POST /api/compte/identifiants : envoyait un courriel officiel (identifiant et mot de passe CHOISIS PAR L'APPELANT) à n'importe quelle
 *      adresse sur la seule foi d'un `teamId`. Il exige la preuve de la clé (`X-Teamop-Kh`) : une empreinte PRÉSENTE qui ne prouve pas → 403 JSON ;
 *      ABSENTE → acceptée (et comptée) tant que `versionsCfg.min` < 802, refusée dès qu'il vaut 802 (les appareils d'abord, la porte ensuite).
 * Le VRAI serveur, isolé sur 127.0.0.1 (deux démarrages : minimum 801, puis 802), un facteur SMTP local ; et la VRAIE `identifiantsParMail`
 * d'app.html, qui doit porter l'en-tête. La contre-épreuve (mutations) est décrite dans le commit. */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3295-'));
const enfants = []; let facteurSrv = null;
const fin = () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } try { facteurSrv && facteurSrv.s.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');

function facteur() {
  const f = { recus: [] };
  f.s = require('net').createServer(c => {
    c.on('error', () => {});
    let tampon = '', corps = false, msg = '', rcpt = [];
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8'); let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; f.recus.push({ rcpt: rcpt.slice(), texte: msg }); msg = ''; rcpt = []; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('RCPT TO')) { rcpt.push(((/<([^>]*)>/.exec(l) || [])[1] || '').toLowerCase()); c.write('250 ok\r\n'); }
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
  });
  return f;
}

/* Les vraies pages : commentaires retirés (un motif vise du CODE, jamais une phrase — les blocs qui COMMENCENT une ligne seulement). */
const nettoye = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));
  const NOUS = 'contact@teamop-banc.fr', CLE_API = 'cle-api-du-banc-3295-'.padEnd(40, 'x');
  const T = 'clim-banc-3295', K = 'cle-propre-3295', TP = 'partagee-3295';
  const code64 = (t, k) => Buffer.from(JSON.stringify({ t, k })).toString('base64');
  let n = 0;
  async function demarrer(min) {
    const i = ++n, D = path.join(banc, 'data' + i); fs.mkdirSync(D, { recursive: true });
    fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({
      'clim-banc': { t: T, nom: 'Clim Banc', email: 'patron@clim-banc-3295.fr', code: code64(T, K), ts: Date.now() },
      'partagee': { t: TP, nom: 'Partagee', email: 'p@partagee-3295.fr', code: code64(TP, 'ELAN-GESTION-7F3A9C2E-cloud-2026'), ts: Date.now() } }));
    fs.writeFileSync(path.join(D, 'versions.json'), JSON.stringify({ min, enLigne: 'enLigne', maj: 1 }));
    const vap = webpush.generateVAPIDKeys();
    fs.writeFileSync(path.join(banc, 'config' + i + '.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: CLE_API, adminPassHash: sha('mdp-3295'), notifDemandes: NOUS,
      smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: NOUS, pass: 'y', from: 'TeamOP <' + NOUS + '>' } }));
    const PORT = 9600 + ((process.pid + i * 7) % 300);
    const e = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, {
      TEAMOP_CONFIG: path.join(banc, 'config' + i + '.json'), TEAMOP_DATA: D, PORT: String(PORT),
      TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1',
      TEAMOP_IDTK_URL: 'http://127.0.0.1:1/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/certs',
      TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }), stdio: ['ignore', 'pipe', 'pipe'] });
    enfants.push(e); let journal = ''; e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
    const B = 'http://127.0.0.1:' + PORT; let vivant = false;
    for (let k = 0; k < 150 && !vivant; k++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    const post = async (route, corps, entetes) => { const r = await fetch(B + route, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, entetes || {}), body: JSON.stringify(corps) });
      let j = {}; try { j = await r.json(); } catch (x) {} return { s: r.status, j, type: r.headers.get('content-type') || '' }; };
    return { B, D, vivant, post, journal: () => journal, annuaire: () => fs.readFileSync(path.join(D, 'espaces.json'), 'utf8') };
  }
  const A = await demarrer(801), C = await demarrer(802);
  vrai('le vrai serveur démarre (minimum exigé 801)', A.vivant); vrai('le vrai serveur démarre (minimum exigé 802)', C.vivant);
  if (!A.vivant || !C.vivant) { console.log((A.journal() + C.journal()).slice(0, 800)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }

  const KH = sha(K), FAUX = sha('une-autre-cle'), KHP = sha('ELAN-GESTION-7F3A9C2E-cloud-2026');
  console.log('\n── 3295 · D1 · /api/espaces/lien : un `kh` faux ne change RIEN ──');
  const avant = A.annuaire();
  let r = await A.post('/api/espaces/lien', { t: T, kh: FAUX });
  v('empreinte fausse → 404 `cle_changee` (l\'application lit ce motif)', [r.s, r.j.motif], [404, 'cle_changee']);
  v('… l\'annuaire est octet pour octet inchangé sur le disque', A.annuaire(), avant);
  vrai('… et aucune marque `clePerimee` n\'y est posée', !/clePerimee/.test(A.annuaire()));
  r = await A.post('/api/espaces/connexion', { nom: 'clim-banc', login: 'x', h: sha('x') });
  vrai('… le site ne tombe pas en `cle_perimee` (il sert toujours l\'entreprise)', r.j.motif && r.j.motif !== 'cle_perimee');
  for (let i = 0; i < 3; i++) await A.post('/api/espaces/lien', { t: T, kh: sha('essai' + i) });
  v('… ni après plusieurs essais forgés', A.annuaire(), avant);
  r = await A.post('/api/espaces/lien', { t: T, kh: KH });
  v('empreinte juste → 200, slug rendu', [r.s, r.j.ok, r.j.slug], [200, true, 'clim-banc']);

  console.log('\n── 3295 · D2 · /api/compte/identifiants (minimum exigé 801) ──');
  const corps = (extra) => Object.assign({ teamId: T, to: 'nouveau@client-3295.fr', prenom: 'Jean', entreprise: 'Clim Banc', login: 'jean.dupont', mdp: 'Provis0ire' }, extra || {});
  const attendre = async (k) => { for (let i = 0; i < 40 && facteurSrv.recus.length < k; i++) await dormir(100); return facteurSrv.recus.length >= k; };
  r = await A.post('/api/compte/identifiants', corps());
  v('SANS empreinte (v801 en service) → accepté', r.s, 200);
  vrai('… et le courriel part', await attendre(1));
  const cles = await (await fetch(A.B + '/api/mail/cles?key=' + CLE_API)).json();
  v('… l\'acceptation sans empreinte est comptée', cles.identifiantsSansPreuve && cles.identifiantsSansPreuve.n, 1);
  const k1 = facteurSrv.recus.length;
  r = await A.post('/api/compte/identifiants', corps(), { 'x-teamop-kh': FAUX });
  v('empreinte FAUSSE → 403 en JSON {error}', [r.s, /json/.test(r.type), typeof r.j.error], [403, true, 'string']);
  vrai('… le message ne dit pas « envoyé » et n\'est pas vide', r.j.error && !/e-mail envoyé/i.test(r.j.error) && r.j.error.length > 20);
  r = await A.post('/api/compte/identifiants', corps({ teamId: 'espace-inconnu-3295' }), { 'x-teamop-kh': FAUX });
  v('empreinte présente sur un espace inconnu de l\'annuaire → 403 (rien à prouver contre)', r.s, 403);
  r = await A.post('/api/compte/identifiants', corps({ teamId: TP }), { 'x-teamop-kh': KHP });
  v('clé PUBLIQUE (écrite dans l\'application) présentée → 403 : elle ne prouve rien', r.s, 403);
  r = await A.post('/api/compte/identifiants', corps({ teamId: 'opgestion-beta' }), { 'x-teamop-kh': sha('cle-beta') });
  v('espace technique (bêta sans son jeton) → 403', r.s, 403);
  await dormir(500);
  v('… aucun courriel n\'est parti pour ces refus', facteurSrv.recus.length, k1);
  r = await A.post('/api/compte/identifiants', corps(), { 'x-teamop-kh': KH });
  v('empreinte JUSTE → 200', r.s, 200);
  vrai('… et le courriel part', await attendre(k1 + 1));
  v('… le compteur « sans empreinte » n\'a pas bougé', (await (await fetch(A.B + '/api/mail/cles?key=' + CLE_API)).json()).identifiantsSansPreuve.n, 1);

  console.log('\n── 3295 · D2 · minimum exigé 802 : la porte se ferme d\'elle-même ──');
  const k2 = facteurSrv.recus.length;
  r = await C.post('/api/compte/identifiants', corps());
  v('SANS empreinte → 403 JSON', [r.s, /json/.test(r.type), typeof r.j.error], [403, true, 'string']);
  vrai('… le message dit de mettre l\'application à jour (juste, pas « envoyé »)', /trop ancienne|mets-la à jour/i.test(r.j.error || ''));
  r = await C.post('/api/compte/identifiants', corps(), { 'x-teamop-kh': FAUX });
  v('empreinte fausse → 403', r.s, 403);
  await dormir(400);
  v('… aucun courriel pour ces deux refus', facteurSrv.recus.length, k2);
  r = await C.post('/api/compte/identifiants', corps(), { 'x-teamop-kh': KH });
  v('empreinte juste → 200 (la v802 passe)', r.s, 200);
  vrai('… et le courriel part', await attendre(k2 + 1));
  const sante = await (await fetch(C.B + '/health')).json();
  vrai('les refus sont comptés dans `mailRefus` sous la route', sante.mailRefus && sante.mailRefus.parRoute && sante.mailRefus.parRoute['compte/identifiants'] >= 2);

  console.log('\n── 3295 · app.html : le VRAI appel porte l\'empreinte ──');
  const page = nettoye(fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8'));
  const i0 = page.indexOf("fetch(PUSH_API+'/api/compte/identifiants'");
  vrai('l\'appel existe dans le code (commentaires retirés)', i0 > 0);
  vrai('… et ses en-têtes passent par `enteteEquipe(`', /^fetch\(PUSH_API\+'\/api\/compte\/identifiants',\{method:'POST',headers:await enteteEquipe\(/.test(page.slice(i0, i0 + 200)));
  const vm = require('vm');
  const a = page.indexOf('let _khCle='), b = page.indexOf('let _ck={};', a);
  const c = page.indexOf('async function identifiantsParMail('), d = page.indexOf('async function identifiantsRenvoyer(', c);
  const e = page.indexOf('function identifiantsMailEtat('), f = page.indexOf('function userIdentifiantsModal(', e);
  vrai('les trois morceaux réels sont trouvés', a > 0 && b > a && c > 0 && d > c && e > 0 && f > e);
  if (a > 0 && b > a && c > 0 && d > c && e > 0 && f > e) {
    const appels = []; let reponse = { ok: true, status: 200, j: { ok: true } };
    const zone = { innerHTML: '' };
    const sandbox = { PUSH_API: 'http://x', BETA_ESSAI: false, localStorage: { getItem() { return null; } }, console,
      syncSecret: () => K, sha256: async (x) => sha(x), syncTeam: () => T, entrepriseNom: () => 'Clim Banc', lienConnexionEntreprise: () => 'https://teamop.fr/connexion.html',
      currentUser: null, fullName: () => 'X', $: () => zone, esc: (x) => String(x),
      fetch: async (url, o) => { appels.push({ url, h: o.headers, b: JSON.parse(o.body) }); return { ok: reponse.ok, status: reponse.status, json: async () => reponse.j }; } };
    vm.createContext(sandbox);
    vm.runInContext(page.slice(a, b) + page.slice(c, d) + page.slice(e, f) + ';globalThis.identifiantsParMail=identifiantsParMail;globalThis.identifiantsMailEtat=identifiantsMailEtat;', sandbox);
    const x = await sandbox.identifiantsParMail({ email: 'nouveau@client-3295.fr', prenom: 'J', login: 'jean.dupont' }, 'Provis0ire');
    v('la VRAIE fonction envoie `x-teamop-kh` = l\'empreinte de la clé de l\'équipe', appels[0] && appels[0].h['x-teamop-kh'], KH);
    v('… sur la bonne route, avec le teamId', [appels[0].url, appels[0].b.teamId], ['http://x/api/compte/identifiants', T]);
    v('… résultat ok sur un 200', x.ok, true);
    r = await C.post('/api/compte/identifiants', appels[0].b, appels[0].h);
    v('… et le serveur (minimum 802) accepte exactement cet appel', r.s, 200);
    reponse = { ok: false, status: 403, j: { error: 'Cet appareil n\'a pas pu prouver la clé de son entreprise — essaie encore' } };
    const y = await sandbox.identifiantsParMail({ email: 'nouveau@client-3295.fr', login: 'jean.dupont' }, 'Provis0ire');
    sandbox.identifiantsMailEtat(y, 'u1', 'Provis0ire');
    vrai('sur un refus 403 l\'écran dit « non envoyé » avec la raison, jamais « E-mail envoyé »', /E-mail non envoyé/.test(zone.innerHTML) && /prouver la clé/.test(zone.innerHTML) && !/<b>E-mail envoyé/.test(zone.innerHTML));
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
