/* test-3253 — UN APPAREIL NEUF QUI OUVRE LA BÊTA REJOINT LA SYNCHRO DE LA BÊTA (v799-beta, 4 novembre 2026).
 *
 * Justin : « sur mon compte bêta OP GESTION, je ne vois pas ce que j'ai fait sur mon PC sur les autres appareils, mon téléphone ou mon
 * Mac ». Mesuré : la bêta ne rattachait un appareil à son espace (`opgestion-beta`) que s'il portait déjà des traces de la bêta au
 * premier chargement (`espaceHerite`) ou par un lien d'entreprise ; la connexion bêta n'écrivait rien, donc un appareil neuf travaillait
 * seul (`syncTeam()` vide). `beta-build.js` pose désormais le rattachement juste après une connexion bêta ACCEPTÉE.
 *
 * La vraie `beta.html` (fabriquée par `beta-build.js`) est servie sous sa vraie adresse dans Chromium ; `api.teamop.fr` est détourné
 * vers le VRAI serveur isolé sur 127.0.0.1 (vraie `/api/beta/login`, vrai document d'équipe `documents.js`) :
 *   1. appareil neuf, bon mot de passe : rattaché à `opgestion-beta`, clé par défaut, synchro allumée, et il LIT le document de la bêta ;
 *   2. mauvais mot de passe, accès coupé depuis la Tour : aucun rattachement, aucune lecture ;
 *   3. appareil déjà rattaché (une entreprise de test par son lien) : rien ne change ;
 *   4. deux appareils neufs, le même accès : ce que l'un écrit, l'autre le reçoit.
 * Contre-épreuve : MUTER=1 retire la ligne posée par `beta-build.js` — les cas 1 et 4 doivent tomber.
 */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { const r = JSON.stringify(a) === JSON.stringify(b); r ? ok++ : ko++; console.log((r ? '  ✓ ' : '  ✗ ') + t + (r ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); return r; };
const vrai = (t, a, det) => { const r = !!a; r ? ok++ : ko++; console.log((r ? '  ✓ ' : '  ✗ ') + t + (r || det === undefined ? '' : '\n      détail : ' + JSON.stringify(det).slice(0, 600))); return r; };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const fini = (n) => { console.log('\n' + ok + ' ✓  ' + (ko + n) + ' ✗'); process.exit(ko + n ? 1 : 0); };

let chromium, webpush;
try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); fini(0); }
try { ({ chromium } = require('playwright')); } catch (e) { console.log('  … SAUTÉ : playwright absent'); fini(0); }

const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3253-'));
let BETA = path.join(RACINE, 'beta.html');
const LIGNE = "    try{ if(!syncTeam()){ localStorage.setItem('elanB_sync_team',FB_TEAM); localStorage.setItem('elanB_sync_secret',SYNC_SECRET_DEFAULT); localStorage.setItem('elanB_sync_on','1'); } }catch(_e){}   // beta-build.js : un appareil neuf rejoint la synchro de la bêta";
{
  const src = fs.readFileSync(BETA, 'utf8');
  vrai('(population) beta.html porte la ligne de rattachement posée par beta-build.js, une fois', src.split(LIGNE).length === 2);
  if (process.env.MUTER) {
    const m = src.split(LIGNE).join('');
    if (m === src) { console.log('  ✗ mutation sans effet'); fini(1); }
    BETA = path.join(BANC, 'beta-mutee.html'); fs.writeFileSync(BETA, m); console.log('  (MUTÉ : la connexion bêta ne rattache plus l\'appareil)');
  }
}

let enfant = null, journal = '';
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 4 min'); fini(1); }, 240000).unref();

(async () => {
  const D = path.join(BANC, 'data'); fs.mkdirSync(D, { recursive: true });
  fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
  /* Firebase est éteint dans le banc : la copie paresseuse se coupe par le réglage ET un inventaire complet (`documents.js`,
     `copieActive`) — sans eux, la première lecture d'un espace sans fichier attend Google et rend 503. */
  fs.mkdirSync(path.join(D, 'documents'), { recursive: true });
  fs.writeFileSync(path.join(D, 'documents', 'inventaire.json'), JSON.stringify({ complet: true, espaces: {}, le: Date.now() }));
  /* deux accès de la bêta : un ouvert, un coupé depuis la Tour ; identifiants hors [0-9a-f] */
  fs.writeFileSync(path.join(D, 'beta-comptes.json'), JSON.stringify([
    { id: 'bqzwun', login: 'justin-qzw', nom: 'Justin Qzw', hash: sha('mdp-qzw-ouvert'), actif: true, apps: ['gestion'], ts: Date.now() },
    { id: 'bqzwdeux', login: 'coupe-qzw', nom: 'Coupé Qzw', hash: sha('mdp-qzw-coupe'), actif: false, apps: ['gestion'], ts: Date.now() }]));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(BANC, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc-3253'.padEnd(40, 'x'), adminPassHash: sha('mdp'), documents: { copieFirebase: false } }));
  const PORT = 9870 + (process.pid % 50);
  const B = 'http://127.0.0.1:' + PORT;
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, {
    TEAMOP_CONFIG: path.join(BANC, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_KEK: 'c9'.repeat(32), TEAMOP_DOC_ATTENTE_MS: '3000',
    TEAMOP_FB_ADMIN: path.join(BANC, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1',
    TEAMOP_IDTK_URL: 'http://127.0.0.1:1/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/certs', TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => journal += d); enfant.stderr.on('data', d => journal += d);
  let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  if (!vrai('le vrai serveur démarre, isolé', vivant)) { console.log(journal.slice(-1200)); fini(1); }

  const browser = await chromium.launch();
  const horsBanc = [];
  /* un appareil : un contexte neuf (rangement vide), `avant` pose ce qu'il portait déjà */
  const appareil = async (avant) => {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const erreurs = [], docs = [];
    page.on('pageerror', e => erreurs.push(e.message));
    if (process.env.DEBUG) page.on('console', m => { if (/synchro|sync|doc|nuage/i.test(m.text())) console.log('      [console] ' + m.text().slice(0, 300)); });
    page.on('dialog', d => d.dismiss().catch(() => {}));
    if (avant) await ctx.addInitScript(a => { try { if (!sessionStorage.getItem('__pose')) { sessionStorage.setItem('__pose', '1'); Object.keys(a).forEach(k => localStorage.setItem(k, a[k])); } } catch (e) {} }, avant);
    await ctx.route('**/*', async r => {
      const u = new URL(r.request().url());
      if (u.host === 'teamop.fr') {
        const f = u.pathname === '/beta.html' ? BETA : path.join(RACINE, decodeURIComponent(u.pathname));
        return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' });
      }
      if (u.host === 'api.teamop.fr') {
        if (/^\/api\/doc\//.test(u.pathname)) { let t = ''; try { t = JSON.parse(r.request().postData() || '{}').t || ''; } catch (e) {} docs.push(u.pathname + ' ' + t); }
        try { const resp = await r.fetch({ url: B + u.pathname + u.search, maxRedirects: 0 }); return r.fulfill({ response: resp }); } catch (e) { return r.abort(); }
      }
      horsBanc.push(u.host); return r.abort();
    });
    await page.goto('https://teamop.fr/beta.html', { timeout: 60000 });
    await page.waitForFunction(() => typeof db !== 'undefined' && document.getElementById('li-login'), null, { timeout: 30000 });
    await page.evaluate(() => { window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {} const e = document.getElementById('hl-ecran'); if (e) e.remove(); });
    return { ctx, page, erreurs, docs };
  };
  const connecter = async (A, login, pass) => {
    await A.page.evaluate(({ login, pass }) => { document.getElementById('li-login').value = login; document.getElementById('li-pin').value = pass; return doLogin({ preventDefault() {} }); }, { login, pass });
    await A.page.waitForTimeout(1500);
  };
  const etat = A => A.page.evaluate(() => ({ team: syncTeam(), on: localStorage.getItem('elanB_sync_on'), cleParDefaut: localStorage.getItem('elanB_sync_secret') === SYNC_SECRET_DEFAULT,
    entre: !!(typeof currentUser !== 'undefined' && currentUser), deja: APPAREIL_DEJA_VU }));
  const attendre = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(250); } return false; };

  try {
    console.log('\n── 3253 · 1. appareil neuf, bon mot de passe ──');
    const A = await appareil(null);
    v('(population) la page est la bêta 799 ou plus', /^(799|8\d\d)-beta$/.test(await A.page.evaluate(() => APP_VERSION)), true);
    let e = await etat(A);
    v('(population) avant la connexion : appareil neuf, sans espace de synchro', [e.deja, e.team], [false, '']);
    await connecter(A, 'justin-qzw', 'mdp-qzw-ouvert');
    e = await etat(A);
    v('connecté à la bêta', e.entre, true);
    v('rattaché à l\'espace de la bêta, synchro allumée, clé par défaut', [e.team, e.on, e.cleParDefaut], ['opgestion-beta', '1', true]);
    vrai('il lit le document de la bêta chez le vrai serveur', await attendre(() => A.docs.some(x => x === '/api/doc/lire opgestion-beta'), 8000), A.docs);

    console.log('\n── 3253 · 2. refus : aucun rattachement ──');
    for (const [quoi, login, pass] of [['mauvais mot de passe', 'justin-qzw', 'faux-qzw'], ['accès coupé depuis la Tour', 'coupe-qzw', 'mdp-qzw-coupe']]) {
      const R = await appareil(null); await connecter(R, login, pass); const r = await etat(R);
      v(quoi + ' : pas connecté, aucun espace, rien lu', [r.entre, r.team, R.docs.length], [false, '', 0]);
      await R.ctx.close();
    }

    console.log('\n── 3253 · 3. appareil déjà rattaché : rien ne change ──');
    const C = await appareil({ elanB_sync_team: 'entreprise-test-qzw', elanB_sync_secret: 'CLE-QZW', elanB_sync_on: '1' });
    await connecter(C, 'justin-qzw', 'mdp-qzw-ouvert');
    const c = await etat(C);
    v('connecté, il garde son espace et sa clé', [c.entre, c.team, await C.page.evaluate(() => localStorage.getItem('elanB_sync_secret'))], [true, 'entreprise-test-qzw', 'CLE-QZW']);
    v('il ne lit jamais le document de la bêta', C.docs.filter(x => / opgestion-beta$/.test(x)), []);
    await C.ctx.close();

    console.log('\n── 3253 · 4. deux appareils neufs, le même accès : ce que l\'un écrit, l\'autre le reçoit ──');
    const P = await appareil(null);   // le « téléphone » ; A est le « PC »
    await connecter(P, 'justin-qzw', 'mdp-qzw-ouvert');
    v('le second appareil est rattaché lui aussi', (await etat(P)).team, 'opgestion-beta');
    await dormir(1500);
    await A.page.evaluate(() => { db.clients = db.clients || []; db.clients.push({ id: 'cliKwqzw', nom: 'Client Kwazulu Qzw', ville: 'Qzwville' }); save(); });
    const recu = await attendre(() => P.page.evaluate(() => (db.clients || []).some(x => x.nom === 'Client Kwazulu Qzw')), 30000);
    if (process.env.DEBUG) console.log('      A.docs', A.docs.slice(-12), '\n      P.docs', P.docs.slice(-12), await A.page.evaluate(() => ({ on: _syncOn, init: typeof _syncGotInitial !== 'undefined' && _syncGotInitial })));
    vrai('le client créé sur le PC paraît sur le téléphone', recu, await P.page.evaluate(() => ({ team: syncTeam(), clients: (db.clients || []).length })));
    await P.page.evaluate(() => { db.clients.push({ id: 'cliZwqzw', nom: 'Client Zwazi Qzw', ville: 'Qzwville' }); save(); });
    vrai('et dans l\'autre sens', await attendre(() => A.page.evaluate(() => (db.clients || []).some(x => x.nom === 'Client Zwazi Qzw')), 30000));
    v('aucune erreur JavaScript sur les deux appareils', [A.erreurs, P.erreurs], [[], []]);
    v('rien n\'est parti hors du banc (ni teamop.fr réel, ni api.teamop.fr réel)', [...new Set(horsBanc)].filter(h => !/^(fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)$/.test(h)), []);
  } catch (e) { vrai('le banc s\'est déroulé sans exception', false, String(e && e.stack || e)); }
  await browser.close();
  fini(0);
})();
