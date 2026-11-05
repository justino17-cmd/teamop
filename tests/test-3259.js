/* test-3259 — « AJOUTER UNE BOÎTE MAIL » DU COURRIER SE CONNECTE AVEC GOOGLE ET AVEC MICROSOFT : LA VRAIE PAGE, LE VRAI MODULE, LE VRAI
 * SERVEUR, UN FAUX GOOGLE ET UN FAUX MICROSOFT (v802, 5 novembre 2026).
 *
 * Justin, dans l'application publique v798 (espace « tester pdg ») : Boîte mail → « Ajouter une boîte mail » ouvre la feuille du module
 * (`opcourrier.js`, « Ajoutez une boîte mail — Tapez votre adresse… »), SANS aucun Google ni Microsoft. La source du Courrier déclarait
 * `oauth:false` et refusait toute adresse Hotmail ; le bouton « Se connecter avec Google » n'existait que dans l'ancienne fenêtre
 * `mailConnect()`, que le Courrier n'ouvre pas. Le serveur a maintenant Google ET Microsoft (`/health` → `oauth`).
 * Ce banc garde la COUTURE entière : la vraie `app.html` sous sa vraie adresse (https://teamop.fr/app.html), le vrai `opcourrier.js`
 * monté par la vraie vue, `api.teamop.fr` détourné vers le vrai serveur isolé, configuré pour les deux fournisseurs ; leurs points
 * d'autorisation sont joués par le banc (ils renvoient vers la VRAIE route de retour), leurs points d'échange des jetons aussi.
 *   1. Gmail : la feuille dit « Connexion sécurisée via Google », pas de mot de passe, « Continuer avec Google » ; le clic ouvre la fenêtre
 *      DANS le geste, l'adresse tapée part en login_hint, l'autorisation revient, la boîte est listée « google » par le serveur ET le Courrier ;
 *   2. Hotmail : la même chose avec Microsoft (plus de refus « Microsoft refuse la connexion par mot de passe ») ;
 *   3. Microsoft non configuré (`/health`) : Hotmail ne se connecte pas et la feuille dit pourquoi ; Gmail, si ;
 *   4. Google non configuré : Gmail redevient le chemin du mot de passe d'application ;
 *   5. la fenêtre refermée avant la fin : la feuille le DIT, reste ouverte, rien n'est ajouté ;
 *   6. 503 `oauth_non_configure` au clic : la fenêtre se referme, la feuille le dit.
 * Contre-épreuve : MUTER=1 rend `capacites()` sans autorisation (oauth:false, la v798) — le banc doit tomber.
 */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { const r = JSON.stringify(a) === JSON.stringify(b); r ? ok++ : ko++; console.log((r ? '  ✓ ' : '  ✗ ') + t + (r ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); return r; };
const vrai = (t, a, det) => { const r = !!a; r ? ok++ : ko++; console.log((r ? '  ✓ ' : '  ✗ ') + t + (r || det === undefined ? '' : '\n      détail : ' + JSON.stringify(det).slice(0, 600))); return r; };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fini = (n) => { console.log('\n' + ok + ' ✓  ' + (ko + n) + ' ✗'); process.exit(ko + n ? 1 : 0); };

let chromium, webpush;
try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); fini(0); }
try { ({ chromium } = require('playwright')); } catch (e) { console.log('  … SAUTÉ : playwright absent'); fini(0); }

let APP = path.join(RACINE, 'app.html');
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3259-'));
if (process.env.MUTER === '1') {
  const src = fs.readFileSync(APP, 'utf8'), m = src.replace('return {oauth:via.length>0,oauthVia:via,', 'return {oauth:false,');
  if (m === src) { console.log('  ✗ mutation sans effet'); fini(1); }
  APP = path.join(BANC, 'app-mutee.html'); fs.writeFileSync(APP, m); console.log('  (MUTÉ : capacites() sans autorisation, comme la v798)');
}

/* ── deux faux fournisseurs : échange des jetons (PKCE vérifié) ; adresses fictives hors [0-9a-f] ── */
const fournisseur = (nom, secret, claim) => {
  const F = { nom, defis: new Map(), adresses: new Map(), echanges: 0, indices: [] };
  F.srv = require('http').createServer((req, res) => {
    let d = ''; req.on('data', c => d += c); req.on('end', () => {
      const p = new URLSearchParams(d), rep = (s, j) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(j)); };
      if (req.url !== '/token') return rep(404, {});
      if (p.get('client_secret') !== secret) return rep(401, { error: 'invalid_client' });
      if (p.get('grant_type') !== 'authorization_code') return rep(400, { error: 'unsupported_grant_type' });
      const code = p.get('code'), defi = F.defis.get(code);
      if (!defi || b64u(crypto.createHash('sha256').update(String(p.get('code_verifier'))).digest()) !== defi) return rep(400, { error: 'invalid_grant' });
      F.echanges++;
      const idt = 'x.' + b64u(JSON.stringify({ [claim]: F.adresses.get(code), email_verified: true })) + '.y';
      rep(200, { access_token: 'ACCES-' + nom + '-QZW-' + F.echanges, refresh_token: 'RENOUV-' + nom + '-QZW-' + F.echanges, expires_in: 3600, id_token: idt });
    });
  });
  return F;
};
const G = fournisseur('G', 'secret-google-du-banc-QZW', 'email');
const M = fournisseur('M', 'secret-microsoft-du-banc-QZW', 'preferred_username');
const fauxSmtp = require('net').createServer(c => { c.on('error', () => {}); c.write('220 banc\r\n'); c.on('data', () => c.write('250 ok\r\n')); });
const ecoute = s => new Promise(r => s.listen(0, '127.0.0.1', () => r(s.address().port)));

const T1 = 'courrier-oauth-qzw', K1 = 'CLE-PRIVEE-QZW-COURRIER';
const ENT = { nom: 'Courrier Oauth Qzw', email: 'patron@courrier-oauth-qzw.fr', adresse: '7 rue du Banc', cp: '17000', ville: 'Qzwville', siret: '12345678900011', tel: '0500000000' };
let enfant = null, journal = '';
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { G.srv.close(); M.srv.close(); fauxSmtp.close(); } catch (e) {} try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 5 min'); fini(1); }, 300000).unref();

(async () => {
  const portG = await ecoute(G.srv), portM = await ecoute(M.srv), portS = await ecoute(fauxSmtp);
  const D = path.join(BANC, 'data'); fs.mkdirSync(D, { recursive: true });
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({
    'courrier-oauth': { slug: 'courrier-oauth', nom: ENT.nom, email: ENT.email, t: T1, code: b64({ t: T1, k: K1 }), formule: 'pro', quantite: 3, aboStatut: 'actif', aboPar: 'Banc', ts: Date.now() } }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(BANC, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc-3259'.padEnd(40, 'x'), adminPassHash: sha('mdp'),
    oauth: { google: { clientId: 'client-google-du-banc-QZW', clientSecret: 'secret-google-du-banc-QZW' }, microsoft: { clientId: 'client-microsoft-du-banc-QZW', clientSecret: 'secret-microsoft-du-banc-QZW' } } }));
  const PORT = 9870 + (process.pid % 60), B = 'http://127.0.0.1:' + PORT;
  const serv = { smtpHost: '127.0.0.1', smtpPort: portS, imapHost: '127.0.0.1', imapPort: 1, tlsAucun: true };
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, {
    TEAMOP_CONFIG: path.join(BANC, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_KEK: 'c9'.repeat(32),
    TEAMOP_OAUTH_GOOGLE_URL: 'http://127.0.0.1:' + portG, TEAMOP_OAUTH_MS_URL: 'http://127.0.0.1:' + portM,
    TEAMOP_OAUTH_SERVEURS: JSON.stringify({ google: serv, microsoft: serv }),
    TEAMOP_FB_ADMIN: path.join(BANC, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1',
    TEAMOP_IDTK_URL: 'http://127.0.0.1:1/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/certs', TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => journal += d); enfant.stderr.on('data', d => journal += d);
  let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  if (!vrai('le vrai serveur démarre, isolé, Google ET Microsoft configurés', vivant)) { console.log(journal.slice(-1200)); fini(1); }
  v('(population) /health : oauth = { microsoft: vrai, google: vrai }', (await (await fetch(B + '/health')).json()).oauth, { microsoft: true, google: true });
  const listeServeur = async () => (JSON.parse(await (await fetch(B + '/api/mailboxes?teamId=' + T1, { headers: { 'x-teamop-kh': sha(K1) } })).text()).mailboxes || []).map(b => [b.email, b.type]).sort();

  const browser = await chromium.launch();
  const horsBanc = [];
  const ouvrir = async (o) => {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: o.viewport || { width: 1280, height: 860 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const erreurs = [];
    page.on('pageerror', e => erreurs.push(e.message));
    page.on('dialog', d => d.dismiss().catch(() => {}));
    await ctx.route('**/*', async r => {
      const u = new URL(r.request().url());
      if (u.protocol === 'mailto:') return r.abort();
      if (u.host === 'teamop.fr') {
        const f = u.pathname === '/app.html' ? APP : path.join(RACINE, decodeURIComponent(u.pathname));
        return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' });
      }
      if (u.host === 'api.teamop.fr') {
        const cors = { 'access-control-allow-origin': 'https://teamop.fr' };
        if (o.sans && u.pathname === '/health') { const j = await (await fetch(B + '/health')).json(); o.sans.forEach(k => { j.oauth[k] = false; }); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j), headers: cors }); }
        if (o.start503 && u.pathname === '/api/mailbox/oauth/start') return r.fulfill({ status: 503, contentType: 'application/json', headers: cors, body: JSON.stringify({ error: 'La connexion Google n\'est pas encore disponible.', code: 'oauth_non_configure' }) });
        try { const resp = await r.fetch({ url: B + u.pathname + u.search, maxRedirects: 0 }); return r.fulfill({ response: resp }); } catch (e) { return r.abort(); }
      }
      /* les points d'autorisation : l'utilisateur accepte (ou referme la fenêtre), on revient sur la VRAIE route de retour */
      const F = u.host === '127.0.0.1:' + portG ? G : u.host === '127.0.0.1:' + portM ? M : null;
      if (F && u.pathname === '/authorize') {
        F.indices.push(u.searchParams.get('login_hint'));
        if (o.refermer) return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><script>window.close()</script>' });
        const code = 'code-' + crypto.randomBytes(4).toString('base64url').replace(/[0-9a-f]/g, 'z');
        F.defis.set(code, u.searchParams.get('code_challenge')); F.adresses.set(code, o.adresse || u.searchParams.get('login_hint'));
        /* pas de 302 : la cible d'une redirection servie par `route.fulfill` n'est pas réinterceptée (test-3252) — une navigation neuve, oui */
        const cible = 'https://api.teamop.fr/api/mailbox/oauth/retour?' + new URLSearchParams({ code, state: u.searchParams.get('state') });
        return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><script>location.replace(' + JSON.stringify(cible) + ')</script>' });
      }
      horsBanc.push(u.host); return r.abort();
    });
    await page.goto('https://teamop.fr/app.html', { timeout: 60000 });
    await page.waitForFunction(() => typeof db !== 'undefined' && document.getElementById('login'), null, { timeout: 30000 });
    await page.waitForTimeout(600);
    await page.evaluate(({ T, K, ENT }) => {
      localStorage.setItem('elan_sync_team', T); localStorage.setItem('elan_sync_secret', K); localStorage.setItem('elan_sync_on', '0');
      window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {}
      db.entreprise = Object.assign(db.entreprise || {}, ENT);
      const admin = db.users.find(u => u.role === 'admin'); admin.prenom = 'Paul'; admin.nom = 'Patron'; admin.email = ENT.email;
      db.users.forEach(u => { u.pwdHash = u.pwdHash || 'banc'; u.secu = SECU_MDP; u.mustChangePwd = false; u.email = u.email || (u.login + '@courrier-oauth-qzw.fr'); });
      /* la proposition « Photo de profil » s'ouvre seule à la première entrée et couvrirait le Courrier : déjà proposée */
      db.users.forEach(u => localStorage.setItem('elan_photo_prompt_' + u.id, '1'));
      save(); enterApp(admin); go('boiteMail');
    }, { T: T1, K: K1, ENT });
    /* le module vit dans une racine fantôme ouverte (`attachShadow`) : on y lit, les sélecteurs de Playwright la traversent d'eux-mêmes */
    await page.waitForFunction(() => { const R=(()=>{ const z=document.getElementById('courrier-zone'); const h=z&&[z].concat(Array.from(z.querySelectorAll('*'))).find(e=>e.shadowRoot); return h?h.shadowRoot:null; })(); return !!(R && R.querySelector('[data-addaccount]')); }, null, { timeout: 20000 });
    await page.waitForTimeout(500);
    return { ctx, page, erreurs };
  };
  /* la feuille « Ajouter un compte » du module, une adresse tapée puis le champ quitté (le module reconnaît alors la messagerie) */
  const feuille = async (P, adresse) => {
    /* une fenêtre de l'application qui s'ouvre seule (bienvenue, photo de profil…) couvrirait le Courrier : on la ferme par l'application */
    await P.page.evaluate(() => { try { if (document.querySelector('#overlay.open')) closeModal(); } catch (e) {} }); await P.page.waitForTimeout(300);
    /* le bouton visible s'il y en a un (écran vide) ; sinon celui du menu des comptes, que le module écoute par délégation */
    const vis = P.page.locator('#courrier-zone [data-addaccount]:visible');
    if (await vis.count()) await vis.first().click();
    else await P.page.evaluate(() => { const z=document.getElementById('courrier-zone'); const h=z&&[z].concat(Array.from(z.querySelectorAll('*'))).find(e=>e.shadowRoot); const R=h?h.shadowRoot:null; R.querySelector('[data-addaccount]').click(); }); await P.page.waitForSelector('#aMail', { timeout: 6000 });
    await P.page.fill('#aMail', adresse); await P.page.locator('#aMail').blur(); await P.page.waitForTimeout(700);
    return P.page.evaluate(() => { const R=(()=>{ const z=document.getElementById('courrier-zone'); const h=z&&[z].concat(Array.from(z.querySelectorAll('*'))).find(e=>e.shadowRoot); return h?h.shadowRoot:null; })();
      return { det: (R.getElementById('aDet') || {}).innerText || '', mdp: !R.getElementById('aPassWrap').hidden, go: R.getElementById('aGo').textContent.trim(), actif: !R.getElementById('aGo').disabled }; });
  };
  const erreurFeuille = P => P.page.evaluate(() => { const R=(()=>{ const z=document.getElementById('courrier-zone'); const h=z&&[z].concat(Array.from(z.querySelectorAll('*'))).find(e=>e.shadowRoot); return h?h.shadowRoot:null; })(); const e = R && R.getElementById('aMailErr'); return e && !e.hidden ? e.innerText.trim() : ''; });
  const zone = P => P.page.evaluate(() => { const R=(()=>{ const z=document.getElementById('courrier-zone'); const h=z&&[z].concat(Array.from(z.querySelectorAll('*'))).find(e=>e.shadowRoot); return h?h.shadowRoot:null; })(); return R ? Array.from(R.children).map(e => e.innerText || '').join(' ') : ''; });
  const goActif = P => P.page.evaluate(() => { const R=(()=>{ const z=document.getElementById('courrier-zone'); const h=z&&[z].concat(Array.from(z.querySelectorAll('*'))).find(e=>e.shadowRoot); return h?h.shadowRoot:null; })(); const g = R && R.getElementById('aGo'); return !!g && !g.disabled; });
  const attendre = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(200); } return false; };

  try {
    console.log('\n── 3259 · 1. Gmail : « Continuer avec Google », la fenêtre, la boîte reliée ──');
    const A = await ouvrir({});
    vrai('la vraie page est chargée, le Courrier monté, sans erreur', /^\d{3}$/.test(await A.page.evaluate(() => APP_VERSION)) && !A.erreurs.length, A.erreurs);
    let f = await feuille(A, 'patron.qzw@gmail.com');
    v('la feuille : connexion sécurisée via Google, sans mot de passe, « Continuer avec Google »', [/Connexion sécurisée via Google/.test(f.det), f.mdp, f.go, f.actif], [true, false, 'Continuer avec Google', true]);
    if (process.env.CAPTURES) await A.page.screenshot({ path: path.join(process.env.CAPTURES, '3259-gmail.png') });
    const [popG] = await Promise.all([A.page.waitForEvent('popup', { timeout: 15000 }).catch(() => null), A.page.click('#aGo')]);
    vrai('le clic ouvre la fenêtre d\'autorisation, dans le geste', !!popG);
    const okG = await attendre(async () => JSON.stringify(await listeServeur()) === JSON.stringify([['patron.qzw@gmail.com', 'google']]), 20000);
    vrai('le serveur liste la boîte « google »', okG, await listeServeur());
    v('l\'adresse tapée est partie en login_hint chez Google, un seul échange de code', [G.indices, G.echanges], [['patron.qzw@gmail.com'], 1]);
    const vueG = await attendre(async () => /patron\.qzw@gmail\.com/.test(await zone(A)) && !(await A.page.$('#aMail')), 15000);
    vrai('le Courrier la montre, et la feuille s\'est fermée d\'elle-même', vueG, (await zone(A)).slice(0, 300));
    vrai('la fenêtre de retour s\'est refermée (elle a parlé à son opener)', await attendre(async () => !popG || popG.isClosed(), 6000));

    console.log('\n── 3259 · 2. Hotmail : « Continuer avec Microsoft », plus de refus ──');
    f = await feuille(A, 'patron.qzw@hotmail.fr');
    v('la feuille : connexion sécurisée via Microsoft, sans mot de passe, « Continuer avec Microsoft »', [/Connexion sécurisée via Microsoft/.test(f.det), f.mdp, f.go, f.actif], [true, false, 'Continuer avec Microsoft', true]);
    const [popM] = await Promise.all([A.page.waitForEvent('popup', { timeout: 15000 }).catch(() => null), A.page.click('#aGo')]);
    vrai('le clic ouvre la fenêtre Microsoft, dans le geste', !!popM);
    const okM = await attendre(async () => (await listeServeur()).some(b => b[0] === 'patron.qzw@hotmail.fr' && b[1] === 'microsoft'), 20000);
    vrai('le serveur liste la boîte « microsoft »', okM, await listeServeur());
    vrai('le Courrier la montre, la feuille est fermée, aucun refus « Microsoft refuse »', await attendre(async () => /patron\.qzw@hotmail\.fr/.test(await zone(A)) && !(await A.page.$('#aMail')), 15000) && !/refuse la connexion par mot de passe/.test(await zone(A)));
    v('login_hint Microsoft, un échange', [M.indices, M.echanges], [['patron.qzw@hotmail.fr'], 1]);
    v('aucune erreur de page', A.erreurs, []);
    await A.ctx.close();

    console.log('\n── 3259 · 3. Microsoft non configuré : Hotmail ne se connecte pas, et la feuille le dit ; Gmail, si ──');
    const C = await ouvrir({ sans: ['microsoft'] });
    f = await feuille(C, 'autre.qzw@outlook.fr');
    v('Hotmail / Outlook : « Bientôt… Microsoft refuse les mots de passe », pas de mot de passe, bouton inactif', [/Microsoft refuse les mots de passe/.test(f.det), f.mdp, f.actif], [true, false, false]);
    await C.page.click('#aClose').catch(() => {}); await C.page.waitForTimeout(400);
    f = await feuille(C, 'autre.qzw@gmail.com');
    v('… et Gmail reste « Continuer avec Google »', f.go, 'Continuer avec Google');
    await C.ctx.close();

    console.log('\n── 3259 · 4. Google non configuré : Gmail redevient le mot de passe d\'application ──');
    const D4 = await ouvrir({ sans: ['google'] });
    f = await feuille(D4, 'autre.qzw@gmail.com');
    v('Gmail : le champ mot de passe, « Se connecter », la mention du mot de passe d\'application', [f.mdp, f.go, /mot de passe d’application/.test(f.det)], [true, 'Se connecter', true]);
    f = await feuille(D4, 'autre.qzw@hotmail.fr').catch(() => null);
    await D4.ctx.close();

    console.log('\n── 3259 · 5. la fenêtre refermée avant la fin : la feuille le dit, rien n\'est ajouté ──');
    const n5 = (await listeServeur()).length;
    const E = await ouvrir({ refermer: true });
    await feuille(E, 'ferme.qzw@gmail.com');
    await Promise.all([E.page.waitForEvent('popup', { timeout: 15000 }).catch(() => null), E.page.click('#aGo')]);
    const dit5 = await attendre(async () => /fermée avant la fin/.test(await erreurFeuille(E)), 15000);
    vrai('« La fenêtre de connexion s’est fermée avant la fin — rien n’a changé », la feuille reste ouverte, le bouton revient',
      dit5 && !!(await E.page.$('#aMail')) && await goActif(E), await erreurFeuille(E));
    v('aucune boîte de plus au serveur', (await listeServeur()).length, n5);
    await E.ctx.close();

    console.log('\n── 3259 · 6. 503 oauth_non_configure au clic : la fenêtre se referme, la feuille le dit ──');
    const F6 = await ouvrir({ start503: true });
    await feuille(F6, 'refus.qzw@gmail.com');
    const [p6] = await Promise.all([F6.page.waitForEvent('popup', { timeout: 6000 }).catch(() => null), F6.page.click('#aGo')]);
    const dit6 = await attendre(async () => /pas encore disponible/.test(await erreurFeuille(F6)), 10000);
    vrai('la fenêtre ouverte se referme, la feuille dit « pas encore disponible », le bouton revient', dit6 && (!p6 || p6.isClosed()) && await goActif(F6), await erreurFeuille(F6));
    await F6.ctx.close();

    v('le navigateur n\'a parlé à aucun autre hôte', Array.from(new Set(horsBanc)).filter(x => !/fonts\.|gstatic|googleapis|cdnjs|jsdelivr|unpkg/.test(x)), []);
    v('ni jeton ni secret dans le journal du serveur', ['ACCES-G-QZW', 'ACCES-M-QZW', 'RENOUV-', 'secret-google-du-banc', 'secret-microsoft-du-banc'].filter(s => journal.includes(s)), []);
  } catch (e) { console.log('  ✗ ' + e.stack); ko++; }
  await browser.close();
  fini(0);
})().catch(e => { console.log('  ✗ ' + e.stack); fini(1); });
