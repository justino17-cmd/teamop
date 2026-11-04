/* test-3247 — UNE BOÎTE MICROSOFT OU GOOGLE SE CONNECTE PAR AUTORISATION (OAuth), SANS MOT DE PASSE (4 novembre 2026).
 *
 * Justin : « fais tout ce qu'il faut pour tout type de boîte mail ». Microsoft refuse le mot de passe depuis 2024 : une entreprise sur
 * Outlook / Hotmail / Microsoft 365 ne pouvait connecter aucune boîte. `server/boite-oauth.js` + les routes `/api/mailbox/oauth/*`.
 * Ce banc monte le VRAI serveur isolé sur 127.0.0.1, avec un faux fournisseur d'autorisation (point d'échange des jetons) et un faux
 * SMTP qui exige AUTH XOAUTH2. Il garde :
 *   1. routes INERTES sans réglage (Google non configuré → 503 `oauth_non_configure`), `/health` ne dit que deux booléens ;
 *   2. `start` exige la preuve de clé d'équipe (sans elle : 403 JSON) et rend une adresse d'autorisation avec `state` + PKCE S256 ;
 *   3. le retour : `state` falsifié → refus ; `state` rejoué → refus ; code échangé AVEC le vérificateur PKCE qui répond au défi ;
 *      la boîte est enregistrée type « microsoft », le jeton de renouvellement CHIFFRÉ (jamais en clair sur le disque si la clé est là,
 *      jamais dans une réponse, jamais dans le journal) ;
 *   4. un envoi par cette boîte part en XOAUTH2 avec un jeton d'ACCÈS, jamais le jeton de renouvellement ;
 *   5. jeton expiré → rafraîchi (et la rotation du jeton de renouvellement est gardée) ; `invalid_grant` → « à reconnecter », dit par
 *      `/api/mailboxes` et par l'envoi (JSON 409), sans boucle.
 */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3247-'));
let enfant = null; const serveurs = [];
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} serveurs.forEach(s => { try { s.close(); } catch (e) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 100 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 100000).unref();
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ecoute = (srv) => new Promise(r => { serveurs.push(srv); srv.listen(0, '127.0.0.1', () => r(srv.address().port)); });

/* Le faux fournisseur : un point d'échange des jetons. Les jetons portent des lettres hors [0-9a-f] (règle du dépôt : un jeton court
   cherché dans un texte qui contient une empreinte tombe au hasard dedans). */
const fournisseur = { defis: new Map(), echanges: [], rafraichis: 0, refuserRafraichir: false };
function fauxFournisseur() {
  return require('http').createServer((req, res) => {
    let d = ''; req.on('data', c => d += c); req.on('end', () => {
      const p = new URLSearchParams(d); const rep = (s, j) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(j)); };
      if (req.url !== '/token') return rep(404, {});
      if (p.get('client_secret') !== 'secret-du-banc-QXZ') return rep(401, { error: 'invalid_client' });
      if (p.get('grant_type') === 'authorization_code') {
        fournisseur.echanges.push({ code: p.get('code'), verif: p.get('code_verifier'), redir: p.get('redirect_uri') });
        const defi = fournisseur.defis.get(p.get('code'));
        if (!defi || b64u(crypto.createHash('sha256').update(String(p.get('code_verifier'))).digest()) !== defi) return rep(400, { error: 'invalid_grant' });
        const idt = 'x.' + b64u(JSON.stringify({ email: 'Patron@Clim-OAuth-QXZ.fr', preferred_username: 'patron@clim-oauth-qxz.fr' })) + '.y';
        return rep(200, { access_token: 'ACCES-QXZ-UN', refresh_token: 'RENOUV-QXZ-UN', expires_in: 3600, id_token: idt });
      }
      if (p.get('grant_type') === 'refresh_token') {
        fournisseur.rafraichis++;
        if (fournisseur.refuserRafraichir) return rep(400, { error: 'invalid_grant' });
        return rep(200, { access_token: 'ACCES-QXZ-DEUX', refresh_token: 'RENOUV-QXZ-DEUX', expires_in: 3600 });
      }
      rep(400, { error: 'unsupported_grant_type' });
    });
  });
}
/* Le faux SMTP : il n'accepte QUE AUTH XOAUTH2, et retient la chaîne décodée. */
const smtp = { auths: [], recus: [] };
function fauxSmtp() {
  return require('net').createServer(c => {
    c.on('error', () => {}); let tampon = '', corps = false, msg = '', rcpt = [], auth = '';
    c.write('220 banc\r\n');
    c.on('data', d => { tampon += d.toString('utf8'); let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) { const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; smtp.recus.push({ rcpt: rcpt.slice(), texte: msg, auth }); msg = ''; rcpt = []; c.write('250 ok\r\n'); } else msg += l + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH XOAUTH2\r\n');
        else if (h.startsWith('AUTH XOAUTH2')) { auth = Buffer.from(l.split(' ')[2] || '', 'base64').toString('utf8'); smtp.auths.push(auth);
          if (/auth=Bearer ACCES-QXZ-/.test(auth)) c.write('235 ok\r\n'); else c.write('535 refus\r\n'); }
        else if (h.startsWith('AUTH')) c.write('504 seulement XOAUTH2\r\n');
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
  const T = 'clim-oauth-3247', K = 'cle-propre-' + T;
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ 'clim-oauth': { t: T, nom: 'Clim OAuth', email: 'patron@clim-oauth-qxz.fr', code: Buffer.from(JSON.stringify({ t: T, k: K })).toString('base64'), ts: Date.now() } }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc-3247'.padEnd(40, 'x'), adminPassHash: sha('mdp'),
    oauth: { microsoft: { clientId: 'client-du-banc-QXZ', clientSecret: 'secret-du-banc-QXZ' } } }));
  const PORT = 9620 + (process.pid % 300);
  let journal = '';
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, {
    TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_KEK: 'a7'.repeat(32),
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
  const preuve = { 'x-teamop-kh': sha(K) };
  const post = async (route, corps, h) => { const r = await fetch(B + route, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}), body: JSON.stringify(corps) });
    let j = {}; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };

  console.log('\n── 3247 · 1. inerte sans réglage, et /health ne dit que deux booléens ──');
  const h = await (await fetch(B + '/health')).json();
  v('/health : oauth = { microsoft: vrai, google: faux }', h.oauth, { microsoft: true, google: false });
  let r = await post('/api/mailbox/oauth/start', { teamId: T, fournisseur: 'google' }, preuve);
  v('Google non configuré → 503 oauth_non_configure', [r.s, r.j.code], [503, 'oauth_non_configure']);
  r = await post('/api/mailbox/oauth/start', { teamId: T, fournisseur: 'yahoo' }, preuve);
  v('fournisseur inconnu → 400', r.s, 400);

  console.log('\n── 3247 · 2. démarrer exige la preuve de clé, et rend state + PKCE ──');
  r = await post('/api/mailbox/oauth/start', { teamId: T, fournisseur: 'microsoft' });
  v('sans preuve de clé → 403, en JSON (l\'écran sait le dire)', [r.s, typeof r.j.error], [403, 'string']);
  r = await post('/api/mailbox/oauth/start', { teamId: 'espace-invente-qxz', fournisseur: 'microsoft' }, preuve);
  v('espace inventé → refusé', r.s >= 400, true);
  r = await post('/api/mailbox/oauth/start', { teamId: T, fournisseur: 'microsoft' }, preuve);
  v('avec la preuve → 200 et une adresse', [r.s, typeof r.j.url], [200, 'string']);
  const u = new URL(r.j.url || 'http://x/');
  v('l\'adresse vise le point d\'autorisation du fournisseur', u.origin + u.pathname, 'http://127.0.0.1:' + portF + '/authorize');
  v('PKCE S256, redirection fixe, portées SMTP et IMAP, accès hors connexion',
    [u.searchParams.get('code_challenge_method'), u.searchParams.get('redirect_uri'), /SMTP\.Send/.test(u.searchParams.get('scope')), /IMAP\.AccessAsUser\.All/.test(u.searchParams.get('scope')), /offline_access/.test(u.searchParams.get('scope'))],
    ['S256', 'https://api.teamop.fr/api/mailbox/oauth/retour', true, true, true]);
  const state = u.searchParams.get('state'), defi = u.searchParams.get('code_challenge');
  vrai('le state ne porte ni la clé ni le secret client', state && !state.includes(K) && !r.j.url.includes('secret-du-banc'));

  console.log('\n── 3247 · 3. le retour : state falsifié, rejoué, puis le bon ──');
  const retour = async (q) => { const x = await fetch(B + '/api/mailbox/oauth/retour?' + new URLSearchParams(q)); return { s: x.status, t: await x.text() }; };
  let x = await retour({ code: 'code-bon', state: state.slice(0, -3) + 'AAA' });
  v('state à la signature falsifiée → refus, rien n\'est échangé', [x.s >= 400, fournisseur.echanges.length], [true, 0]);
  const [corps] = state.split('.'); const forge = JSON.parse(Buffer.from(corps.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()); forge.t = 'autre-espace-qxz';
  x = await retour({ code: 'code-bon', state: b64u(JSON.stringify(forge)) + '.' + state.split('.')[1] });
  v('state dont on a changé l\'ESPACE → refus (la signature ne suit pas)', [x.s >= 400, fournisseur.echanges.length], [true, 0]);
  fournisseur.defis.set('code-bon', defi);
  x = await retour({ code: 'code-bon', state });
  v('le bon retour → 200, page « Boîte connectée »', [x.s, /Boîte connectée/.test(x.t)], [200, true]);
  vrai('le code a été échangé AVEC le vérificateur PKCE qui répond au défi', fournisseur.echanges.length === 1 && fournisseur.echanges[0].verif);
  vrai('la page prévient l\'application par postMessage, origine teamop.fr seulement, sans jeton', /postMessage\(d,o\)/.test(x.t) && /https:\/\/teamop\.fr/.test(x.t) && !/QXZ-UN/.test(x.t));
  x = await retour({ code: 'code-bon', state });
  v('le même state rejoué → refus (usage unique)', [x.s >= 400, /déjà servi|expiré/.test(x.t), fournisseur.echanges.length], [true, true, 1]);
  vrai('la vérification de l\'envoi est passée en XOAUTH2 avec le jeton d\'ACCÈS', smtp.auths.some(a => /user=patron@clim-oauth-qxz\.fr\x01auth=Bearer ACCES-QXZ-UN/.test(a)));

  const liste = await (await fetch(B + '/api/mailboxes?teamId=' + T, { headers: preuve })).json();
  const mb = (liste.mailboxes || [])[0] || {};
  v('/api/mailboxes : la boîte, type microsoft, état ok, adresse en minuscules', [mb.email, mb.type, mb.etat], ['patron@clim-oauth-qxz.fr', 'microsoft', 'ok']);
  vrai('…et aucun jeton dans la réponse', !JSON.stringify(liste).includes('QXZ-UN'));
  await dormir(200);
  const disque = fs.readFileSync(path.join(D, 'mailboxes.json'), 'utf8');
  vrai('sur le disque : le jeton de renouvellement est CHIFFRÉ (passScelle), jamais en clair', !disque.includes('RENOUV-QXZ') && /passScelle/.test(disque) && /"auth":\s*"oauth"/.test(disque));

  console.log('\n── 3247 · 4. un envoi part en XOAUTH2, jamais avec le jeton de renouvellement ──');
  const n0 = smtp.recus.length;
  r = await post('/api/sendmail', { teamId: T, to: 'client-final@ailleurs-qxz.fr', subject: 'Devis DV-QXZ', text: 'Votre devis.', useMailbox: { id: mb.id }, brand: { name: 'Clim OAuth' } }, preuve);
  v('envoi accepté', r.s, 200);
  for (let i = 0; i < 30 && smtp.recus.length <= n0; i++) await dormir(100);
  const m = smtp.recus[n0] || {};
  v('parti par la boîte de l\'entreprise, au seul client', m.rcpt, ['client-final@ailleurs-qxz.fr']);
  vrai('authentifié par un jeton d\'ACCÈS', /auth=Bearer ACCES-QXZ-/.test(m.auth || ''));
  vrai('aucune connexion n\'a présenté le jeton de renouvellement', !smtp.auths.some(a => /RENOUV/.test(a)));

  console.log('\n── 3247 · 5. rafraîchir, garder la rotation ; invalid_grant → « à reconnecter » ──');
  /* Le jeton d'accès vit une heure en mémoire : on force l'échéance en redémarrant le serveur — c'est le vrai chemin d'un VPS qui
     redémarre (le cache est perdu, le jeton de renouvellement chiffré est relu du disque). */
  enfant.kill('SIGKILL'); await dormir(300);
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, {
    TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_KEK: 'a7'.repeat(32),
    TEAMOP_OAUTH_MS_URL: 'http://127.0.0.1:' + portF,
    TEAMOP_OAUTH_SERVEURS: JSON.stringify({ microsoft: { smtpHost: '127.0.0.1', smtpPort: portS, imapHost: '127.0.0.1', imapPort: 1, tlsAucun: true } }),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1',
    TEAMOP_IDTK_URL: 'http://127.0.0.1:1/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/certs', TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => journal += d); enfant.stderr.on('data', d => journal += d);
  vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le serveur redémarre', vivant);
  const r0 = fournisseur.rafraichis, n1 = smtp.recus.length;
  r = await post('/api/sendmail', { teamId: T, to: 'client-final@ailleurs-qxz.fr', subject: 'Facture FAC-QXZ', text: 'Votre facture.', useMailbox: { id: mb.id }, brand: { name: 'Clim OAuth' } }, preuve);
  v('après redémarrage : envoi accepté', r.s, 200);
  vrai('le jeton d\'accès a été RAFRAÎCHI auprès du fournisseur', fournisseur.rafraichis > r0);
  for (let i = 0; i < 30 && smtp.recus.length <= n1; i++) await dormir(100);
  vrai('…et l\'envoi est parti avec le NOUVEAU jeton d\'accès', /ACCES-QXZ-DEUX/.test((smtp.recus[n1] || {}).auth || ''));
  await dormir(200);
  const disque2 = fs.readFileSync(path.join(D, 'mailboxes.json'), 'utf8');
  vrai('la rotation du jeton de renouvellement est gardée (toujours chiffrée)', !disque2.includes('RENOUV-QXZ') && disque2 !== disque);

  enfant.kill('SIGKILL'); await dormir(300);
  fournisseur.refuserRafraichir = true;
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, {
    TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_KEK: 'a7'.repeat(32),
    TEAMOP_OAUTH_MS_URL: 'http://127.0.0.1:' + portF,
    TEAMOP_OAUTH_SERVEURS: JSON.stringify({ microsoft: { smtpHost: '127.0.0.1', smtpPort: portS, imapHost: '127.0.0.1', imapPort: 1, tlsAucun: true } }),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1',
    TEAMOP_IDTK_URL: 'http://127.0.0.1:1/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/certs', TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => journal += d); enfant.stderr.on('data', d => journal += d);
  vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  r = await post('/api/sendmail', { teamId: T, to: 'client-final@ailleurs-qxz.fr', subject: 'Relance QXZ', text: 'x', useMailbox: { id: mb.id }, brand: { name: 'Clim OAuth' } }, preuve);
  v('autorisation retirée (invalid_grant) → 409 JSON « à reconnecter », rien ne part', [r.s, r.j.code, /reconnect/.test(r.j.error || '')], [409, 'a_reconnecter', true]);
  const l2 = await (await fetch(B + '/api/mailboxes?teamId=' + T, { headers: preuve })).json();
  v('/api/mailboxes le dit : etat a_reconnecter', ((l2.mailboxes || [])[0] || {}).etat, 'a_reconnecter');
  const rAvant = fournisseur.rafraichis;
  await post('/api/sendmail', { teamId: T, to: 'client-final@ailleurs-qxz.fr', subject: 'Relance QXZ 2', text: 'x', useMailbox: { id: mb.id }, brand: { name: 'Clim OAuth' } }, preuve);
  vrai('un nouvel essai ne relance pas d\'envoi par la plateforme (aucun courriel neuf au facteur)', smtp.recus.length === n1 + 1);
  vrai('(le compteur de rafraîchissements est borné : un essai = au plus un appel)', fournisseur.rafraichis - rAvant <= 1);

  console.log('\n── 3247 · 6. rien de secret dans le journal ──');
  v('ni jeton d\'accès, ni jeton de renouvellement, ni secret client, ni code', ['ACCES-QXZ', 'RENOUV-QXZ', 'secret-du-banc', 'code-bon'].filter(s => journal.includes(s)), []);

  console.log('\n── 3247 · 7. le module seul : échéance du state, adresse Google non vérifiée, serveurs ──');
  { const M = require(path.join(RACINE, 'server', 'boite-oauth.js'));
    let horloge = 1e12; const appels = [];
    const faux = async (url, o) => { appels.push(url); return { ok: true, status: 200, json: async () => ({ access_token: 'ACCES-QXZ-M', refresh_token: 'RENOUV-QXZ-M', expires_in: 3600,
      id_token: 'x.' + b64u(JSON.stringify({ email: 'gens@gmail.com', email_verified: false })) + '.y' }) }; };
    const o = M.creer({ config: { oauth: { google: { clientId: 'a', clientSecret: 'b' } } }, fetch: faux, maintenant: () => horloge, env: {} });
    const st = new URL(o.demarrer({ fournisseur: 'google', t: 'esp-qxz' }).url).searchParams;
    v('Google : accès hors connexion et consentement demandés (sinon pas de jeton de renouvellement)', [st.get('access_type'), st.get('prompt')], ['offline', 'consent']);
    horloge += 11 * 60 * 1000;
    let e = null; try { await o.retour({ code: 'c', state: st.get('state') }); } catch (x) { e = x; }
    v('state de plus de dix minutes → expiré, et AUCUN échange avec le fournisseur', [e && e.code, appels.length], ['state_expire', 0]);
    horloge = 1e12;
    const st2 = new URL(o.demarrer({ fournisseur: 'google', t: 'esp-qxz' }).url).searchParams;
    e = null; try { await o.retour({ code: 'c', state: st2.get('state') }); } catch (x) { e = x; }
    v('Google : une adresse NON vérifiée n\'est pas acceptée', e && e.code, 'adresse_inconnue');
    v('serveurs par défaut : Microsoft 587 STARTTLS, Google 465', [M.creer({ config: {}, env: {} }).serveurs('microsoft').smtpPort, M.creer({ config: {}, env: {} }).serveurs('google').smtpPort], [587, 465]);
    v('sans réglage : rien de disponible', M.creer({ config: {}, env: {} }).disponibles(), { microsoft: false, google: false });
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + e.stack); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
