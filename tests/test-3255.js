/* test-3255 — LES BOÎTES MAIL DE LA BÊTA (4 novembre 2026).
 *
 * Justin : « En bêta, je devrais pouvoir me connecter avec mes boîtes mail pour pouvoir tester. Active que je puisse me connecter avec
 * mes boîtes mail. » L'espace de la bêta (`opgestion-beta`) était refusé d'office sur les routes mail (« technique »). Sa clé est PUBLIQUE
 * (écrite en clair dans beta.html) : la présenter ne prouve rien. La porte s'ouvre donc sur une AUTRE preuve, le jeton d'accès bêta
 * (`/api/beta/login`, en-tête `X-Teamop-Beta`), et chaque accès de la Tour a SES boîtes (`opgestion-beta~<compte>`).
 *
 * Ce banc monte le VRAI serveur isolé sur 127.0.0.1 (faux fournisseur d'autorisation, faux SMTP en XOAUTH2, patron de la Tour) et garde :
 *   1. la connexion bêta rend un jeton ; un accès coupé n'en reçoit pas ;
 *   2. sans jeton, avec un jeton forgé, ou en écrivant soi-même « opgestion-beta~… » : refus (compté « technique », jamais « inconnu ») ;
 *   3. le testeur A relie SA boîte par autorisation ; A la voit, B ne la voit pas ;
 *   4. un envoi bêta part SEULEMENT par la boîte du testeur — jamais par le relais de TEAM OP, jamais par la boîte d'un autre ;
 *   5. l'accès coupé depuis la Tour : son jeton ne vaut plus ; supprimé : ses boîtes partent avec lui ;
 *   6. une vraie entreprise : rien ne change (sa preuve de clé suffit, un jeton bêta ne lui sert à rien).
 */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3255-'));
let enfant = null; const serveurs = [];
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} serveurs.forEach(s => { try { s.close(); } catch (e) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 100 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 100000).unref();
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ecoute = (srv) => new Promise(r => { serveurs.push(srv); srv.listen(0, '127.0.0.1', () => r(srv.address().port)); });

const fournisseur = { defis: new Map() };
function fauxFournisseur() {
  return require('http').createServer((req, res) => {
    let d = ''; req.on('data', c => d += c); req.on('end', () => {
      const p = new URLSearchParams(d); const rep = (s, j) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(j)); };
      if (req.url !== '/token' || p.get('client_secret') !== 'secret-du-banc-QXZ') return rep(401, { error: 'invalid_client' });
      if (p.get('grant_type') === 'authorization_code') {
        const defi = fournisseur.defis.get(p.get('code'));
        if (!defi || b64u(crypto.createHash('sha256').update(String(p.get('code_verifier'))).digest()) !== defi) return rep(400, { error: 'invalid_grant' });
        const idt = 'x.' + b64u(JSON.stringify({ email: 'testeur@boite-beta-qxz.fr' })) + '.y';
        return rep(200, { access_token: 'ACCES-QXZ-BETA', refresh_token: 'RENOUV-QXZ-BETA', expires_in: 3600, id_token: idt });
      }
      rep(200, { access_token: 'ACCES-QXZ-BETA', expires_in: 3600 });
    });
  });
}
const smtp = { recus: [] };
function fauxSmtp() {
  return require('net').createServer(c => {
    c.on('error', () => {}); let tampon = '', corps = false, msg = '', rcpt = [];
    c.write('220 banc\r\n');
    c.on('data', d => { tampon += d.toString('utf8'); let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) { const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; smtp.recus.push({ rcpt: rcpt.slice(), texte: msg }); msg = ''; rcpt = []; c.write('250 ok\r\n'); } else msg += l + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH XOAUTH2 PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH XOAUTH2')) { const a = Buffer.from(l.split(' ')[2] || '', 'base64').toString('utf8'); c.write(/auth=Bearer ACCES-QXZ-/.test(a) ? '235 ok\r\n' : '535 non\r\n'); }
        else if (h.startsWith('AUTH')) c.write('535 non\r\n');
        else if (h.startsWith('MAIL FROM')) c.write('250 ok\r\n');
        else if (h.startsWith('RCPT TO')) { rcpt.push(((/<([^>]*)>/.exec(l) || [])[1] || '').toLowerCase()); c.write('250 ok\r\n'); }
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n'); } });
  });
}

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const portF = await ecoute(fauxFournisseur()), portS = await ecoute(fauxSmtp());
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const T = 'vraie-ent-3255', K = 'cle-propre-' + T;
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ 'vraie-ent': { t: T, nom: 'Vraie Entreprise', email: 'patron@vraie-ent-qxz.fr', code: Buffer.from(JSON.stringify({ t: T, k: K })).toString('base64'), ts: Date.now() } }));
  /* trois accès de la Tour (identifiants « b » + hexadécimaux, comme ceux que la Tour fabrique) : A et B ouverts, C coupé */
  fs.writeFileSync(path.join(D, 'beta-comptes.json'), JSON.stringify([
    { id: 'b1a2b3c4d5', login: 'alice-qzw', nom: 'Alice', hash: sha('mdp-alice-qzw'), actif: true, apps: ['gestion'], ts: Date.now() },
    { id: 'b9e8d7c6b5', login: 'bruno-qzw', nom: 'Bruno', hash: sha('mdp-bruno-qzw'), actif: true, apps: ['gestion'], ts: Date.now() },
    { id: 'b5c5c5c5c5', login: 'coupe-qzw', nom: 'Coupé', hash: sha('mdp-coupe-qzw'), actif: false, apps: ['gestion'], ts: Date.now() }]));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc-3255'.padEnd(40, 'x'), adminPassHash: sha('mdp-patron-qzw'),
    oauth: { microsoft: { clientId: 'client-du-banc-QXZ', clientSecret: 'secret-du-banc-QXZ' } } }));
  const PORT = 9320 + (process.pid % 200);
  let journal = '';
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, {
    TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_KEK: 'b8'.repeat(32),
    TEAMOP_OAUTH_MS_URL: 'http://127.0.0.1:' + portF,
    TEAMOP_OAUTH_SERVEURS: JSON.stringify({ microsoft: { smtpHost: '127.0.0.1', smtpPort: portS, imapHost: '127.0.0.1', imapPort: 1, tlsAucun: true } }),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1',
    TEAMOP_IDTK_URL: 'http://127.0.0.1:1/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/certs', TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => journal += d); enfant.stderr.on('data', d => journal += d);
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre', vivant);
  if (!vivant) { console.log(journal.slice(0, 900)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, h, methode) => { const r = await fetch(B + route, { method: methode || (corps === undefined ? 'GET' : 'POST'), headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    const txt = await r.text(); let j = {}; try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j, txt, ct: r.headers.get('content-type') || '' }; };
  const motifs = async () => (((await appel('/health')).j.mailRefus || {}).parMotif || {});
  const BETA = 'opgestion-beta', kPub = { 'x-teamop-kh': sha('CLE-PUBLIQUE-DE-LA-BETA-QZW') };

  console.log('\n── 3255 · 1. la connexion bêta rend un jeton ──');
  const la = await appel('/api/beta/login', { login: 'alice-qzw', pass: 'mdp-alice-qzw' });
  const lb = await appel('/api/beta/login', { login: 'bruno-qzw', pass: 'mdp-bruno-qzw' });
  const lc = await appel('/api/beta/login', { login: 'coupe-qzw', pass: 'mdp-coupe-qzw' });
  vrai('Alice et Bruno reçoivent chacun un jeton', la.s === 200 && typeof la.j.jeton === 'string' && lb.s === 200 && typeof lb.j.jeton === 'string' && la.j.jeton !== lb.j.jeton);
  v('l’accès coupé : refusé, aucun jeton', [lc.s, lc.j.jeton], [403, undefined]);
  vrai('le jeton ne porte ni mot de passe ni empreinte', la.j.jeton && !la.j.jeton.includes('mdp-alice') && !la.j.jeton.includes(sha('mdp-alice-qzw')));
  const JA = { 'x-teamop-beta': la.j.jeton }, JB = { 'x-teamop-beta': lb.j.jeton };
  const et = await appel('/api/beta/etat', { login: 'alice-qzw', jeton: la.j.jeton });
  vrai('/api/beta/etat renouvelle le jeton de CET accès', et.j.ouvert === true && typeof et.j.jeton === 'string');
  const et2 = await appel('/api/beta/etat', { login: 'bruno-qzw', jeton: la.j.jeton });
  v('… mais pas celui d’un autre nom', et2.j.jeton, undefined);

  console.log('\n── 3255 · 2. sans preuve de compte : refus ──');
  const m0 = await motifs();
  let r = await appel('/api/mailboxes?teamId=' + BETA, undefined, kPub);
  v('sans jeton (clé publique seule) : 403 en text/plain', [r.s, /^text\/plain/.test(r.ct)], [403, true]);
  r = await appel('/api/mailboxes?teamId=' + BETA, undefined, { 'x-teamop-beta': la.j.jeton.slice(0, -4) + 'AAAA' });
  v('jeton à la signature forgée : 403', r.s, 403);
  r = await appel('/api/mailboxes?teamId=' + encodeURIComponent(BETA + '~b1a2b3c4d5'), undefined, kPub);
  v('« opgestion-beta~<Alice> » écrit à la main, sans jeton : 403', r.s, 403);
  r = await appel('/api/mailboxes?teamId=' + encodeURIComponent(BETA + '~b1a2b3c4d5'), undefined, JB);
  v('… et même avec le jeton de Bruno : 403 (seul le jeton compose l’espace)', r.s, 403);
  const m1 = await motifs();
  v('ces refus comptent « technique », jamais « inconnu » (l’alarme reste propre)', [(m1.technique || 0) - (m0.technique || 0) >= 4, (m1.inconnu || 0) - (m0.inconnu || 0)], [true, 0]);
  r = await appel('/api/mailboxes?teamId=' + BETA, undefined, JA);
  v('avec son jeton, Alice lit ses boîtes (aucune encore)', [r.s, r.j.mailboxes], [200, []]);

  console.log('\n── 3255 · 3. Alice relie SA boîte, Bruno ne la voit pas ──');
  r = await appel('/api/mailbox/oauth/start', { teamId: BETA, fournisseur: 'microsoft' }, JA);
  v('autorisation démarrée avec le jeton', [r.s, typeof r.j.url], [200, 'string']);
  const u = new URL(r.j.url || 'http://x/'); fournisseur.defis.set('code-beta', u.searchParams.get('code_challenge'));
  const x = await fetch(B + '/api/mailbox/oauth/retour?' + new URLSearchParams({ code: 'code-beta', state: u.searchParams.get('state') }));
  v('retour : « Boîte connectée »', [x.status, /Boîte connectée/.test(await x.text())], [200, true]);
  const lA = await appel('/api/mailboxes?teamId=' + BETA, undefined, JA), lB = await appel('/api/mailboxes?teamId=' + BETA, undefined, JB);
  v('Alice voit sa boîte', (lA.j.mailboxes || []).map(b => b.email), ['testeur@boite-beta-qxz.fr']);
  v('Bruno ne la voit pas', lB.j.mailboxes, []);
  const mbA = ((lA.j.mailboxes || [])[0] || {}).id;
  const stock = JSON.parse(fs.readFileSync(path.join(D, 'mailboxes.json'), 'utf8') || '{}');
  vrai('rangée sous l’espace d’Alice (opgestion-beta~<son accès>), jamais sous l’espace partagé', Object.values(stock).some(b => b.teamId === BETA + '~b1a2b3c4d5') && !Object.values(stock).some(b => b.teamId === BETA));
  r = await appel('/api/mailbox/oauth/start', { teamId: BETA, fournisseur: 'microsoft' }, kPub);
  v('sans jeton, pas d’autorisation non plus', r.s, 403);

  console.log('\n── 3255 · 4. un envoi bêta part SEULEMENT par la boîte du testeur ──');
  const envoi = (extra) => Object.assign({ teamId: BETA, to: 'client@dehors-qzw.fr', subject: 'Devis essai', text: 'Bonjour' }, extra || {});
  const n0 = smtp.recus.length;
  r = await appel('/api/sendmail', envoi(), JA);
  v('sans boîte choisie : refusé (pas de relais TEAM OP au nom de « l’entreprise bêta »)', [r.s, r.j.code], [403, 'beta_boite']);
  r = await appel('/api/sendmail', envoi({ smtpHost: '127.0.0.1', smtpPort: portS, smtpUser: 'x@y.fr', smtpPass: 'z' }), JA);
  v('… ni par des identifiants SMTP venus de la requête', [r.s, smtp.recus.length - n0], [403, 0]);
  r = await appel('/api/sendmail', envoi({ useMailbox: { id: mbA } }), JB);
  v('Bruno avec la boîte d’Alice : refusé, rien ne part', [r.s >= 400, smtp.recus.length - n0], [true, 0]);
  r = await appel('/api/sendmail', envoi({ useMailbox: { id: mbA } }), JA);
  v('Alice par SA boîte : parti, au client', [r.s, smtp.recus.length - n0, (smtp.recus[smtp.recus.length - 1] || {}).rcpt], [200, 1, ['client@dehors-qzw.fr']]);

  console.log('\n── 3255 · 5. coupé, puis supprimé depuis la Tour ──');
  const patron = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mdp-patron-qzw' })).j.token;
  vrai('le patron de la Tour se connecte', typeof patron === 'string');
  const P = { Authorization: 'Bearer ' + patron };
  r = await appel('/api/monitor/beta/toggle', { id: 'b1a2b3c4d5' }, P);
  r = await appel('/api/mailboxes?teamId=' + BETA, undefined, JA);
  v('accès d’Alice coupé : son jeton ne lit plus rien', r.s, 403);
  r = await appel('/api/sendmail', envoi({ useMailbox: { id: mbA } }), JA);
  v('… et n’envoie plus', [r.s, smtp.recus.length - n0], [403, 1]);
  await appel('/api/monitor/beta/delete', { id: 'b1a2b3c4d5' }, P);
  const stock2 = JSON.parse(fs.readFileSync(path.join(D, 'mailboxes.json'), 'utf8') || '{}');
  vrai('accès supprimé : sa boîte part avec lui', !Object.values(stock2).some(b => b.teamId === BETA + '~b1a2b3c4d5'));

  console.log('\n── 3255 · 6. une vraie entreprise : rien ne change ──');
  r = await appel('/api/mailboxes?teamId=' + T, undefined, { 'x-teamop-kh': sha(K) });
  v('sa preuve de clé suffit, comme avant', [r.s, r.j.mailboxes], [200, []]);
  r = await appel('/api/mailboxes?teamId=' + T, undefined, JB);
  v('un jeton bêta ne lui sert à rien', r.s, 403);
  r = await appel('/api/mailboxes?teamId=elan-gestion', undefined, JB);
  v('l’espace de repli reste fermé, jeton bêta ou pas', r.s, 403);
  vrai('aucun jeton, aucun mot de passe dans le journal du serveur', !journal.includes(lb.j.jeton) && !/mdp-(alice|bruno)-qzw/.test(journal) && !/RENOUV-QXZ/.test(journal));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + e.stack); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
