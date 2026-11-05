/* test-3244 — UN DOCUMENT QU'UNE ENTREPRISE ENVOIE À SON CLIENT NE LAISSE RIEN CHEZ TEAM OP (4 novembre 2026).
 *
 * Justin, capture de la Tour à l'appui : la boîte contact@teamop.fr recevait les factures que les entreprises envoyaient à LEURS
 * clients depuis OP GESTION. Le « mode simple » de `/api/sendmail` (aucune boîte ni SMTP de l'entreprise) passe par `mailerEnvoi`,
 * qui posait une copie cachée vers notre adresse sur tout envoi extérieur ; le journal des e-mails gardait destinataire, objet et texte ;
 * et sans adresse de réponse réglée dans l'application, la réponse du client final arrivait chez nous.
 * Ce banc monte le VRAI serveur, isolé sur 127.0.0.1, avec un facteur SMTP local qui retient l'enveloppe (MAIL FROM, chaque RCPT TO)
 * et les en-têtes. Il garde :
 *   1. un document d'entreprise ne part qu'à son destinataire — aucun RCPT vers TEAM OP, ni Bcc ni Cc ;
 *   2. son Reply-To est l'adresse de l'entreprise lue dans l'ANNUAIRE (jamais le corps de la requête), et une adresse fournie par
 *      l'application reste prioritaire ;
 *   3. le journal des e-mails (`mails-envoyes.json`, lu par la Tour) n'en garde ni le destinataire, ni l'objet, ni le texte ;
 *   4. un e-mail de TEAM OP lui-même (`/api/email`) garde sa copie cachée — la trace voulue le 20 août 2026 ne se perd pas.
 */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3244-'));
let enfant = null, facteurSrv = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { facteurSrv && facteurSrv.s.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');

/* Le facteur : il retient, pour chaque message, l'ENVELOPPE (c'est là que vit une copie cachée : un RCPT TO sans en-tête) et le
   texte reçu, point doublé retiré (RFC 5321 §4.5.2). */
function facteur() {
  const f = { recus: [] };
  f.s = require('net').createServer(c => {
    c.on('error', () => {});
    let tampon = '', corps = false, msg = '', rcpt = [], de = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) {
          if (l === '.') { corps = false; f.recus.push({ de, rcpt: rcpt.slice(), texte: msg }); msg = ''; rcpt = []; c.write('250 ok\r\n'); }
          else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n';
          continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('MAIL FROM')) { de = (/<([^>]*)>/.exec(l) || [])[1] || ''; c.write('250 ok\r\n'); }
        else if (h.startsWith('RCPT TO')) { rcpt.push(((/<([^>]*)>/.exec(l) || [])[1] || '').toLowerCase()); c.write('250 ok\r\n'); }
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
  });
  return f;
}
const entete = (m, nom) => { const x = new RegExp('^' + nom + ': (.*(?:\\n[ \\t].*)*)', 'mi').exec(String(m || '')); return x ? x[1].replace(/\n[ \t]/g, ' ').trim() : ''; };

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const T = 'clim-banc-3244', T2 = 'sans-adresse-3244';
  const code64 = (t) => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({
    'clim-banc': { t: T, nom: 'Clim Banc', email: 'patron@clim-banc-3244.fr', code: code64(T), ts: Date.now() },
    'sans-adresse': { t: T2, nom: 'Sans Adresse', code: code64(T2), ts: Date.now() } }));
  const vap = webpush.generateVAPIDKeys();
  const CLE = 'cle-api-du-banc-3244-'.padEnd(40, 'x');
  const NOUS = 'contact@teamop-banc.fr';
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey,
    apiKey: CLE, adminPassHash: sha('mdp-3244'), notifDemandes: NOUS,
    /* la preuve de clé d'équipe a ses propres bancs (`test-2692`) : ici on regarde ce que le serveur ENVOIE */
    mailPreuveExigee: false,
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: NOUS, pass: 'y', from: 'TeamOP <' + NOUS + '>' } }));
  const PORT = 9300 + (process.pid % 300);
  let journalSrv = '';
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, {
    TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1',
    TEAMOP_IDTK_URL: 'http://127.0.0.1:1/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/certs',
    TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journalSrv += d; }); enfant.stderr.on('data', d => { journalSrv += d; });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre', vivant);
  if (!vivant) { console.log(journalSrv.slice(0, 800)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const post = async (route, corps) => { const r = await fetch(B + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    let j = {}; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };
  const attendre = async (n) => { for (let i = 0; i < 50 && facteurSrv.recus.length < n; i++) await dormir(100); return facteurSrv.recus.length >= n; };

  const CLIENT = 'client-final@ailleurs-3244.fr';
  const OBJET = 'Facture FAC-QXZ-3244 — Clim Banc';
  const TEXTE = 'Bonjour, veuillez trouver votre facture FAC-QXZ-3244. Total TTC : 1 200,00 €.';
  const pdf = Buffer.from('%PDF-1.4 banc 3244').toString('base64');

  console.log('\n── 3244 · 1. un document d\'entreprise ne part qu\'à son destinataire ──');
  let r = await post('/api/sendmail', { teamId: T, to: CLIENT, subject: OBJET, text: TEXTE, brand: { name: 'Clim Banc' }, atts: [{ filename: 'Facture-FAC-QXZ-3244.pdf', content: pdf }] });
  v('l\'envoi en mode simple est accepté', r.s, 200);
  vrai('le facteur l\'a reçu', await attendre(1));
  const m1 = facteurSrv.recus[0] || { rcpt: [], texte: '' };
  v('enveloppe : UN seul destinataire, le client — aucune copie vers TEAM OP', m1.rcpt, [CLIENT]);
  v('aucun en-tête Bcc ni Cc', [entete(m1.texte, 'Bcc'), entete(m1.texte, 'Cc')], ['', '']);
  vrai('le nom affiché reste celui de l\'entreprise', /Clim Banc/.test(entete(m1.texte, 'From')));
  v('Reply-To : l\'adresse de l\'entreprise, lue dans l\'annuaire', entete(m1.texte, 'Reply-To'), 'patron@clim-banc-3244.fr');

  console.log('\n── 3244 · 2. une adresse de réponse fournie par l\'application reste prioritaire ; sans annuaire, pas de Reply-To ──');
  r = await post('/api/sendmail', { teamId: T, to: CLIENT, subject: 'Devis DV-QXZ-1', text: 'Votre devis.', brand: { name: 'Clim Banc', replyTo: 'bureau@clim-banc-3244.fr' }, meta: { bonNum: 'BC-2026-001', track: true } });
  vrai('accepté et reçu', r.s === 200 && await attendre(2));
  v('Reply-To = l\'adresse fournie', entete((facteurSrv.recus[1] || {}).texte, 'Reply-To'), 'bureau@clim-banc-3244.fr');
  v('… toujours sans copie', (facteurSrv.recus[1] || {}).rcpt, [CLIENT]);
  /* 5 novembre 2026 (Justin : un « Merci de votre devis » est arrivé dans contact@teamop.fr) : sans adresse de réponse, le document
     partait quand même, de NOTRE adresse — la réponse du client final revenait chez nous. Désormais RIEN ne part, et c'est dit. */
  const nAvant = facteurSrv.recus.length;
  r = await post('/api/sendmail', { teamId: T2, to: CLIENT, subject: 'Devis DV-QXZ-2', text: 'Votre devis.', brand: { name: 'Sans Adresse' } });
  v('⛔ espace sans adresse dans l\'annuaire, aucune fournie : refusé (409 adresse_reponse)', [r.s, r.j.code], [409, 'adresse_reponse']);
  vrai('… et l\'écran saura dire quoi faire (Mon entreprise, ou connecter sa boîte)', /Mon entreprise/.test(r.j.error || '') && /boîte mail/.test(r.j.error || ''));
  await dormir(400);
  v('⛔ … rien n\'est parti : la réponse du client ne peut plus revenir chez TEAM OP', facteurSrv.recus.length - nAvant, 0);
  vrai('le serveur le compte, sans nom', /envoi refusé, aucune adresse de réponse pour l'entreprise \(1 depuis le démarrage\)/.test(journalSrv) && !/sans-adresse-3244|Sans Adresse/.test(journalSrv.split('\n').filter(l => /aucune adresse de réponse/.test(l)).join('')));
  r = await post('/api/sendmail', { teamId: T2, to: CLIENT, subject: 'Devis DV-QXZ-3', text: 'Votre devis.', brand: { name: 'Sans Adresse', replyTo: 'bureau@sans-adresse-banc.fr' } });
  vrai('le même espace, avec une adresse fournie par l\'application : accepté et reçu', r.s === 200 && await attendre(nAvant + 1));
  v('… Reply-To = l\'adresse fournie', entete((facteurSrv.recus[nAvant] || {}).texte, 'Reply-To'), 'bureau@sans-adresse-banc.fr');

  console.log('\n── 3244 · 3. le journal des e-mails ne garde rien du client final ──');
  await dormir(300);
  const jr = fs.readFileSync(path.join(D, 'mails-envoyes.json'), 'utf8');
  vrai('le journal existe et porte les trois envois', (JSON.parse(jr) || []).length >= 3);
  v('ni le destinataire, ni l\'objet, ni le texte, ni le nom de la pièce jointe', [jr.includes('client-final'), jr.includes('QXZ'), jr.includes('1 200'), jr.includes('Facture-FAC')], [false, false, false, false]);
  vrai('une trace sans contenu reste (diagnostic d\'un envoi)', /Document envoyé au nom d’une entreprise/.test(jr));
  vrai('le journal du processus ne nomme pas le client non plus', !journalSrv.includes('client-final') && !journalSrv.includes('QXZ'));
  const reg = fs.readFileSync(path.join(D, 'envois-entreprises.json'), 'utf8');
  const mid1 = (entete(m1.texte, 'Message-ID').match(/<([^>]+)>/) || [])[1] || '';
  vrai('le registre des envois retient le Message-ID du document (pour que Camille reconnaisse une réponse)', mid1 && reg.includes(mid1));
  v('…et rien d\'autre du client final', [reg.includes('client-final'), reg.includes('QXZ'), reg.includes('ailleurs')], [false, false, false]);
  vrai('sans boîte commandes partagée (`config.imap`), `sentmap.jsonl` n\'est pas écrit', !fs.existsSync(path.join(D, 'sentmap.jsonl')));

  console.log('\n── 3244 · 4. un e-mail de TEAM OP lui-même garde sa copie cachée ──');
  r = await post('/api/email', { key: CLE, to: 'prospect@ailleurs-3244.fr', subject: 'Votre essai TEAM OP', text: 'Bonjour.' });
  v('/api/email accepté', r.s, 200);
  vrai('reçu', await attendre(4));
  v('enveloppe : le destinataire ET la copie vers TEAM OP', ((facteurSrv.recus[3] || {}).rcpt || []).slice().sort(), [NOUS, 'prospect@ailleurs-3244.fr'].sort());

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + e.stack); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
