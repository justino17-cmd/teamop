/* test-3252 — « SE CONNECTER AVEC GOOGLE » DANS OP GESTION : LA VRAIE PAGE CONTRE LE VRAI SERVEUR, AVEC UN FAUX GOOGLE (v798, 4 novembre 2026).
 *
 * Justin : « fais tout avant la mise à jour ». Le serveur sait connecter une boîte par autorisation (`server/boite-oauth.js`, `test-3247`) ;
 * ce banc garde la COUTURE (CLAUDE.md : « dès qu'app.html appelle une route neuve, un banc fait parler la VRAIE fonction de la page au
 * VRAI serveur »). La vraie `app.html` est servie sous sa vraie adresse (https://teamop.fr/app.html) dans Chromium, `api.teamop.fr` est
 * détourné vers le vrai serveur isolé sur 127.0.0.1, configuré pour Google seulement ; le point d'autorisation de « Google » est joué par
 * le banc (il renvoie vers la vraie route de retour), son point d'échange des jetons et un SMTP qui n'accepte que XOAUTH2 aussi.
 *   1. le bouton paraît en haut de « Connecter une boîte mail » pour Google, pas pour Microsoft (non configuré) ;
 *   2. un vrai clic : la fenêtre s'ouvre, l'autorisation revient, la page de retour prévient l'application (postMessage), la fenêtre se
 *      ferme, la boîte est listée « google », l'écran le dit ; un devis part ensuite par elle, en XOAUTH2 ;
 *   3. l'étape « connecte ta boîte » du blocage d'envoi porte le bouton, et la connexion fait REPARTIR l'envoi en attente ;
 *   4. une autorisation retirée : l'envoi le DIT (« reconnectée »), rien ne part sans un oui, « Mes boîtes mail » propose « Reconnecter » ;
 *   5. serveur qui ne propose pas Google (`/health`) : pas de bouton ; 503 `oauth_non_configure` au clic : le bouton se retire, l'écran le dit.
 * Contre-épreuve : MUTER=1 rend `oauthBoutonsHtml` vide (le bouton ne paraît nulle part) — le banc doit tomber.
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

/* la page jouée : app.html du dépôt, ou une copie MUTÉE */
let APP = path.join(RACINE, 'app.html');
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3252-'));
if (process.env.MUTER) {
  const src = fs.readFileSync(APP, 'utf8'), m = src.replace("function oauthBoutonsHtml(ou){ return `<div", "function oauthBoutonsHtml(ou){ return ''; return `<div");
  if (m === src) { console.log('  ✗ mutation sans effet'); fini(1); }
  APP = path.join(BANC, 'app-mutee.html'); fs.writeFileSync(APP, m); console.log('  (MUTÉ : oauthBoutonsHtml ne rend rien)');
}

/* ── le faux Google : échange des jetons (PKCE vérifié), rafraîchissement refusable ; adresses fictives hors [0-9a-f] ── */
const G = { defis: new Map(), echanges: 0, refuserRafraichir: false, adresses: new Map() };
const fauxJetons = require('http').createServer((req, res) => {
  let d = ''; req.on('data', c => d += c); req.on('end', () => {
    const p = new URLSearchParams(d), rep = (s, j) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(j)); };
    if (req.url !== '/token') return rep(404, {});
    if (p.get('client_secret') !== 'secret-google-du-banc-QZW') return rep(401, { error: 'invalid_client' });
    if (p.get('grant_type') === 'authorization_code') {
      const code = p.get('code'), defi = G.defis.get(code);
      if (!defi || b64u(crypto.createHash('sha256').update(String(p.get('code_verifier'))).digest()) !== defi) return rep(400, { error: 'invalid_grant' });
      G.echanges++;
      const idt = 'x.' + b64u(JSON.stringify({ email: G.adresses.get(code), email_verified: true })) + '.y';
      return rep(200, { access_token: 'ACCES-QZW-' + G.echanges, refresh_token: 'RENOUV-QZW-' + G.echanges, expires_in: 3600, id_token: idt });
    }
    if (p.get('grant_type') === 'refresh_token') { if (G.refuserRafraichir) return rep(400, { error: 'invalid_grant' }); return rep(200, { access_token: 'ACCES-QZW-R', expires_in: 3600 }); }
    rep(400, { error: 'unsupported_grant_type' });
  });
});
/* ── le SMTP « Gmail » : AUTH XOAUTH2 seulement ── */
const smtp = { auths: [], recus: [] };
const fauxSmtp = require('net').createServer(c => {
  c.on('error', () => {}); let tampon = '', corps = false, msg = '', rcpt = [], auth = '';
  c.write('220 banc\r\n');
  c.on('data', d => { tampon += d.toString('utf8'); let i;
    while ((i = tampon.indexOf('\r\n')) >= 0) { const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
      if (corps) { if (l === '.') { corps = false; smtp.recus.push({ rcpt: rcpt.slice(), texte: msg, auth }); msg = ''; rcpt = []; c.write('250 ok\r\n'); } else msg += l + '\n'; continue; }
      const h = l.toUpperCase();
      if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH XOAUTH2\r\n');
      else if (h.startsWith('AUTH XOAUTH2')) { auth = Buffer.from(l.split(' ')[2] || '', 'base64').toString('utf8'); smtp.auths.push(auth); c.write(/auth=Bearer ACCES-QZW-/.test(auth) ? '235 ok\r\n' : '535 refus\r\n'); }
      else if (h.startsWith('AUTH')) c.write('504 seulement XOAUTH2\r\n');
      else if (h.startsWith('RCPT TO')) { rcpt.push(((/<([^>]*)>/.exec(l) || [])[1] || '').toLowerCase()); c.write('250 ok\r\n'); }
      else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
      else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
      else c.write('250 ok\r\n'); } });
});
const ecoute = s => new Promise(r => s.listen(0, '127.0.0.1', () => r(s.address().port)));

const T1 = 'clim-google-qzw', K1 = 'CLE-PRIVEE-QZW-UN', T2 = 'nettoyage-google-qzw', K2 = 'CLE-PRIVEE-QZW-DEUX';
const ENT = { nom: 'Clim Google Qzw', email: 'patron@clim-google-qzw.fr', adresse: '7 rue du Banc', cp: '17000', ville: 'Qzwville', siret: '12345678900011', tel: '0500000000' };
const CLIENT = { nom: 'Madame Kwazulu Qzw', email: 'mme-kwqzw@client-wkqzw.fr' };
let enfant = null, journal = '';
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fauxJetons.close(); fauxSmtp.close(); } catch (e) {} try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 4 min'); fini(1); }, 240000).unref();

(async () => {
  const portJ = await ecoute(fauxJetons), portS = await ecoute(fauxSmtp);
  const D = path.join(BANC, 'data'); fs.mkdirSync(D, { recursive: true });
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({
    'clim-google': { slug: 'clim-google', nom: ENT.nom, email: ENT.email, t: T1, code: b64({ t: T1, k: K1 }), formule: 'pro', quantite: 3, aboStatut: 'actif', aboPar: 'Banc', ts: Date.now() },
    'nettoyage-google': { slug: 'nettoyage-google', nom: 'Nettoyage Google Qzw', email: 'patron@nettoyage-google-qzw.fr', t: T2, code: b64({ t: T2, k: K2 }), formule: 'pro', quantite: 3, aboStatut: 'actif', aboPar: 'Banc', ts: Date.now() } }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(BANC, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc-3252'.padEnd(40, 'x'), adminPassHash: sha('mdp'),
    oauth: { google: { clientId: 'client-google-du-banc-QZW', clientSecret: 'secret-google-du-banc-QZW' } } }));
  const PORT = 9930 + (process.pid % 60);
  const B = 'http://127.0.0.1:' + PORT;
  const demarrer = async () => {
    enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, {
      TEAMOP_CONFIG: path.join(BANC, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_KEK: 'b8'.repeat(32),
      TEAMOP_OAUTH_GOOGLE_URL: 'http://127.0.0.1:' + portJ,
      TEAMOP_OAUTH_SERVEURS: JSON.stringify({ google: { smtpHost: '127.0.0.1', smtpPort: portS, imapHost: '127.0.0.1', imapPort: 1, tlsAucun: true } }),
      TEAMOP_FB_ADMIN: path.join(BANC, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1',
      TEAMOP_IDTK_URL: 'http://127.0.0.1:1/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/certs', TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => journal += d); enfant.stderr.on('data', d => journal += d);
    let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
    return vivant;
  };
  if (!vrai('le vrai serveur démarre, isolé, Google configuré', await demarrer())) { console.log(journal.slice(-1200)); fini(1); }
  const h = await (await fetch(B + '/health')).json();
  v('(population) /health : oauth = { microsoft: faux, google: vrai }', h.oauth, { microsoft: false, google: true });

  const browser = await chromium.launch();
  const horsBanc = [];
  /* une page = un appareil rattaché à une entreprise (synchro coupée : on éprouve la boîte, pas la synchro) */
  const ouvrir = async (o) => {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const erreurs = [];
    page.on('pageerror', e => erreurs.push(e.message));
    page._dialogues = []; page.on('dialog', d => { page._dialogues.push(d.message()); (d.type() === 'confirm' && !page._confirmer ? d.dismiss() : d.accept()).catch(() => {}); });
    await ctx.route('**/*', async r => {
      const u = new URL(r.request().url());
      if (u.protocol === 'mailto:') return r.abort();
      if (u.host === 'teamop.fr') {
        const f = u.pathname === '/app.html' ? APP : path.join(RACINE, decodeURIComponent(u.pathname));
        return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' });
      }
      if (u.host === 'api.teamop.fr') {
        if (o.healthSansGoogle && u.pathname === '/health') { const j = await (await fetch(B + '/health')).json(); j.oauth = { microsoft: false, google: false }; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j), headers: { 'access-control-allow-origin': '*' } }); }
        if (o.start503 && u.pathname === '/api/mailbox/oauth/start') return r.fulfill({ status: 503, contentType: 'application/json', headers: { 'access-control-allow-origin': 'https://teamop.fr' }, body: JSON.stringify({ error: 'La connexion Google n\'est pas encore disponible.', code: 'oauth_non_configure' }) });
        if (process.env.DEBUG && /oauth/.test(u.pathname)) console.log('API', u.href.slice(0, 300));
        try { const resp = await r.fetch({ url: B + u.pathname + u.search, maxRedirects: 0 }); return r.fulfill({ response: resp }); } catch (e) { return r.abort(); }
      }
      /* le point d'autorisation de « Google » : l'utilisateur accepte, on revient sur la VRAIE route de retour */
      if (u.host === '127.0.0.1:' + portJ && u.pathname === '/authorize') {
        const code = 'code-' + crypto.randomBytes(4).toString('base64url').replace(/[0-9a-f]/g, 'z');
        G.defis.set(code, u.searchParams.get('code_challenge')); G.adresses.set(code, o.adresseGoogle); if (process.env.DEBUG) console.log('AUTH', u.href.slice(0, 400));
        /* ⛔ pas de 302 : la cible d'une redirection servie par `route.fulfill` n'est PAS réinterceptée — elle partait VRAIMENT vers
           api.teamop.fr (mesuré le 4 novembre 2026 : « Lien de connexion invalide » rendu par la production). Une navigation neuve, oui. */
        const cible = 'https://api.teamop.fr/api/mailbox/oauth/retour?' + new URLSearchParams({ code, state: u.searchParams.get('state') });
        return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><script>location.replace(' + JSON.stringify(cible) + ')</script>' });
      }
      horsBanc.push(u.host); return r.abort();
    });
    await page.goto('https://teamop.fr/app.html', { timeout: 60000 });
    await page.waitForFunction(() => typeof db !== 'undefined' && document.getElementById('login'), null, { timeout: 30000 });
    await page.waitForTimeout(600);
    await page.evaluate(({ T, K, ENT, CLIENT, sansAdresse }) => {
      localStorage.setItem('elan_sync_team', T); localStorage.setItem('elan_sync_secret', K); localStorage.setItem('elan_sync_on', '0');
      window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {}
      const auj = new Date().toISOString().slice(0, 10);
      db.entreprise = Object.assign(db.entreprise || {}, ENT); if (sansAdresse) delete db.entreprise.email;
      const admin = db.users.find(u => u.role === 'admin'); admin.prenom = 'Paul'; admin.nom = 'Patron'; admin.email = ENT.email;
      db.clients = [{ id: 'cliQZ', nom: CLIENT.nom, email: CLIENT.email, adresse: '1 rue Kwazulu', ville: 'Qzwville' }];
      db.devis = [{ id: 'devQZ', num: 'DV-QZW-001', clientId: 'cliQZ', date: auj, statut: 'brouillon', tva: 20, notes: 'Pose', lignes: [{ designation: 'Klimatiseur Qzw', qte: 1, pu: 900 }] }];
      db.mailBoxes = []; db.mailFrom = '';
      db.users.forEach(u => { u.pwdHash = u.pwdHash || 'banc'; u.secu = SECU_MDP; u.mustChangePwd = false; u.email = u.email || (u.login + '@clim-google-qzw.fr'); });
      save(); enterApp(admin);
      window.__toasts = []; const t0 = window.toast; window.toast = function (m) { window.__toasts.push(String(m)); return t0.apply(this, arguments); };
    }, { T: o.T, K: o.K, ENT, CLIENT, sansAdresse: !!o.sansAdresse });
    await page.waitForTimeout(1000);
    return { ctx, page, erreurs };
  };
  const modalTexte = p => p.evaluate(() => { const m = document.querySelector('#overlay.open'); return m ? m.innerText : ''; });
  const toasts = p => p.evaluate(() => (window.__toasts || []).join(' | '));
  const boutonsOauth = p => p.evaluate(() => Array.from(document.querySelectorAll('#overlay.open .oauth-boutons button')).filter(b => b.offsetWidth > 0).map(b => b.innerText.trim()));
  const boites = p => p.evaluate(() => Array.isArray(_mailboxes) ? _mailboxes.map(b => [b.email, b.type, b.etat]) : _mailboxes);
  const attendre = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(200); } return false; };

  try {
    console.log('\n── 3252 · 1. le bouton, en haut de « Connecter une boîte mail » ──');
    let A = await ouvrir({ T: T1, K: K1, adresseGoogle: 'patron.qzw@gmail.com' });
    vrai('la vraie page est chargée (v798 ou plus), sans erreur', /^79[8-9]|^8/.test(await A.page.evaluate(() => APP_VERSION)) && !A.erreurs.length, A.erreurs);
    await A.page.evaluate(() => mailConnect()); await A.page.waitForTimeout(1200);
    v('un seul bouton d\'autorisation : Google (Microsoft n\'est pas configuré)', await boutonsOauth(A.page), ['Se connecter avec Google']);
    const ordre = await A.page.evaluate(() => { const z = document.querySelector('#overlay.open .oauth-boutons'), e = document.getElementById('mb-email'); return !!(z && e && (z.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)); });
    vrai('il est AU-DESSUS du formulaire adresse + mot de passe, précédé de « Gmail ? »', ordre && /Gmail \?/.test(await modalTexte(A.page)));
    if (process.env.CAPTURES) await A.page.screenshot({ path: path.join(process.env.CAPTURES, '3252-connecter.png') });

    console.log('\n── 3252 · 2. un vrai clic : la fenêtre, l\'autorisation, la boîte listée, puis un devis par elle ──');
    const [popup] = await Promise.all([A.page.waitForEvent('popup', { timeout: 15000 }), A.page.click('#overlay.open .oauth-boutons button')]);
    vrai('le clic ouvre une fenêtre (dans le geste)', !!popup);
    const connectee = await attendre(async () => JSON.stringify(await boites(A.page)) === JSON.stringify([['patron.qzw@gmail.com', 'google', 'ok']]), 20000);
    vrai('la boîte est connectée : le serveur la liste « google », état ok', connectee, await boites(A.page));
    await attendre(async () => popup.isClosed(), 6000);
    vrai('la page de retour s\'est refermée d\'elle-même (elle a parlé à son opener)', popup.isClosed());
    vrai('l\'écran le dit, et la fenêtre « Connecter » est fermée', /Boîte mail connectée/.test(await toasts(A.page)) && !(await A.page.evaluate(() => !!document.querySelector('#overlay.open #mb-email'))), await toasts(A.page));
    v('un seul échange de code chez le fournisseur', G.echanges, 1);
    const n0 = smtp.recus.length;
    const r2 = await A.page.evaluate(() => envoiDoc('devis', 'devQZ', 'email'));
    await attendre(async () => smtp.recus.length > n0, 10000);
    const m2 = smtp.recus[n0] || {};
    vrai('le devis part par la boîte Google, au seul client, en XOAUTH2 avec un jeton d\'accès', r2 !== false && JSON.stringify(m2.rcpt) === JSON.stringify([CLIENT.email]) && /user=patron\.qzw@gmail\.com\x01auth=Bearer ACCES-QZW-/.test(m2.auth || ''), { r2, rcpt: m2.rcpt, auth: (m2.auth || '').replace(/Bearer \S+/, 'Bearer …') });
    await A.page.evaluate(() => mailBoxesManage()); await A.page.waitForTimeout(900);
    { const t = await modalTexte(A.page);   // v803 : « Connectée · avec Google » (l'écran des boîtes a été refait)
      vrai('« Mes boîtes mail » : la boîte est « Connectée », « avec Google »', /Connectée/.test(t) && /avec Google/.test(t) && !/À reconnecter/.test(t), t.slice(0, 300)); }
    await A.page.evaluate(() => closeModal());

    console.log('\n── 3252 · 3. l\'étape du blocage d\'envoi : le bouton, et l\'envoi qui repart ──');
    const Bp = await ouvrir({ T: T2, K: K2, sansAdresse: true, adresseGoogle: 'nettoyage.qzw@gmail.com' });
    const n1 = smtp.recus.length;
    const envoi = Bp.page.evaluate(() => envoiDoc('devis', 'devQZ', 'email'));
    await Bp.page.waitForSelector('#boite-etape', { timeout: 15000 }).catch(() => {});
    await Bp.page.waitForTimeout(1000);
    v('l\'étape « l\'adresse de ton entreprise » porte « Se connecter avec Google »', await boutonsOauth(Bp.page), ['Se connecter avec Google']);
    if (process.env.CAPTURES) await Bp.page.screenshot({ path: path.join(process.env.CAPTURES, '3252-etape.png') });
    const [popup2] = await Promise.all([Bp.page.waitForEvent('popup', { timeout: 15000 }), Bp.page.click('#overlay.open .oauth-boutons button')]);
    const r3 = await Promise.race([envoi, dormir(25000).then(() => 'FIGÉ')]);
    await attendre(async () => smtp.recus.length > n1, 10000);
    vrai('la boîte connectée, l\'étape se ferme et l\'envoi en attente REPART par elle', r3 !== false && r3 !== 'FIGÉ' && JSON.stringify((smtp.recus[n1] || {}).rcpt) === JSON.stringify([CLIENT.email]) && /nettoyage\.qzw@gmail\.com/.test((smtp.recus[n1] || {}).auth || ''), { r3, recus: smtp.recus.length - n1 });
    vrai('(la fenêtre du fournisseur s\'est refermée)', await attendre(async () => popup2.isClosed(), 6000));
    await Bp.ctx.close();

    console.log('\n── 3252 · 4. autorisation retirée : l\'envoi le dit, rien ne part sans un oui, « Reconnecter » ──');
    enfant.kill('SIGKILL'); await dormir(300); G.refuserRafraichir = true;   // un redémarrage perd le jeton d'accès en mémoire : le prochain envoi rafraîchit
    vrai('le serveur redémarre', await demarrer());
    const n2 = smtp.recus.length; A.page._dialogues = []; A.page._confirmer = false;
    const r4 = await A.page.evaluate(() => srvMail('mme-kwqzw@client-wkqzw.fr', 'Relance DV-QZW', 'Bonjour', '', 'devis', null, { sansMailto: true }));
    await A.page.waitForTimeout(800);
    const dit = (A.page._dialogues || []).join(' ') + ' ' + await toasts(A.page);
    v('l\'envoi rend « non parti »', r4, false);
    vrai('l\'écran DIT que la boîte doit être reconnectée', /reconnect/i.test(dit), dit.slice(0, 300));
    v('rien n\'est parti (la reprise par OP GESTION n\'est qu\'une proposition, refusée ici)', smtp.recus.length - n2, 0);
    await A.page.evaluate(() => mailBoxesManage()); await A.page.waitForTimeout(900);
    const gm = await modalTexte(A.page);
    if (process.env.CAPTURES) await A.page.screenshot({ path: path.join(process.env.CAPTURES, '3252-reconnecter.png') });
    /* v803 : le bouton appelle boiteReconnecter(id), qui relit le fournisseur de la boîte. On le CLIQUE, l'ouverture chez le fournisseur
       remplacée le temps du clic par un témoin : ce qui compte est ce que le bouton lance, pas le texte de son onclick. */
    const lance = await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('#overlay.open button')).find(x => /^Reconnecter$/.test(x.innerText.trim()));
      if (!b) return 'aucun bouton'; const vrai0 = window.mailOauthDemarrer; let vu = null; window.mailOauthDemarrer = (f) => { vu = f; };
      try { b.click(); } finally { window.mailOauthDemarrer = vrai0; } return vu; });
    vrai('« Mes boîtes mail » : « À reconnecter » et un bouton « Reconnecter » qui relance l\'autorisation Google', /À reconnecter/.test(gm) && lance === 'google', { lance, gm: gm.slice(0, 300) });
    await A.page.evaluate(() => closeModal());
    v('aucune erreur JavaScript sur la page', A.erreurs, []);
    await A.ctx.close();

    console.log('\n── 3252 · 5. Google non proposé : pas de bouton ; 503 au clic : le bouton se retire ──');
    const C = await ouvrir({ T: T1, K: K1, healthSansGoogle: true });
    await C.page.evaluate(() => mailConnect()); await C.page.waitForTimeout(1200);
    v('/health sans Google : aucun bouton d\'autorisation', await boutonsOauth(C.page), []);
    vrai('… et le formulaire adresse + mot de passe reste là', await C.page.evaluate(() => !!document.getElementById('mb-email')));
    await C.ctx.close();
    const E = await ouvrir({ T: T1, K: K1, start503: true });
    await E.page.evaluate(() => mailConnect()); await E.page.waitForTimeout(1200);
    const avant5 = await boutonsOauth(E.page);
    const pop5 = E.page.waitForEvent('popup', { timeout: 4000 }).catch(() => null);
    await E.page.click('#overlay.open .oauth-boutons button').catch(() => {});
    const p5 = await pop5; await E.page.waitForTimeout(1200);
    vrai('503 oauth_non_configure : la fenêtre ouverte se referme, le bouton se retire, l\'écran le dit',
      avant5.length === 1 && (!p5 || p5.isClosed()) && (await boutonsOauth(E.page)).length === 0 && /pas encore disponible/.test(await toasts(E.page)), { avant5, ferme: !p5 || p5.isClosed(), apres: await boutonsOauth(E.page), toast: await toasts(E.page) });
    await E.ctx.close();
    v('le navigateur n\'a parlé à aucun autre hôte', Array.from(new Set(horsBanc)).filter(x => !/fonts\.|gstatic|googleapis|cdnjs|jsdelivr|unpkg/.test(x)), []);
    v('ni jeton ni secret dans le journal du serveur', ['ACCES-QZW', 'RENOUV-QZW', 'secret-google-du-banc'].filter(s => journal.includes(s)), []);
  } catch (e) { console.log('  ✗ ' + e.stack); ko++; }
  await browser.close();
  fini(0);
})().catch(e => { console.log('  ✗ ' + e.stack); fini(1); });
