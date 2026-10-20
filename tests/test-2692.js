/* ══ test-2692 — LES TROIS ROUTES QUI AGISSENT AU NOM D'UNE ENTREPRISE EXIGENT LA PREUVE DE CLÉ ══
   `/api/mailbox/connect`, `/api/mailbox/disconnect` et `/api/sendmail` n'étaient qu'OBSERVÉES : connaître le
   `teamId` d'une entreprise (ni secret ni révocable) suffisait à envoyer depuis sa boîte — SPF et DKIM valides —
   ou à la lui déconnecter. Elles passent à la garde de `/api/replies` et `/api/mailboxes` (`cleEquipeExige`),
   même réglage (« mailPreuveExigee »: false rouvre), même comptage (`mailRefus`, plus `parRoute`).

   Ce que ce banc joue, et pourquoi :
   · le VRAI serveur, isolé (config, données, port à lui), parlé en HTTP — un facteur SMTP local reçoit tout ce qui
     « part » (boîte connectée, mode avancé, plateforme) ; aucun octet ne sort de la machine : `nodemailer` est
     remplacé, pour tout hôte autre que 127.0.0.1, par un faux qui valide et n'envoie rien, `imapflow` par
     `tests/faux-imap.js` ;
   · pour chaque route : sans preuve, mauvaise preuve, preuve malformée, preuve d'UNE entreprise sur l'espace d'une
     AUTRE, clé partagée (kh juste, sans valeur), espace technique (la bêta), espace hors annuaire → 403 et RIEN
     ne sort (zéro courriel au facteur, `mailboxes.json` inchangé octet pour octet) ;
   · la bonne preuve passe, dans les trois modes d'envoi ; « mailPreuveExigee »: false rouvre ;
   · ⛔ les VRAIES fonctions d'`app.html` (`srvMail`, `mailDoConnect`, `mailDisconnect`, avec la vraie
     `enteteEquipe`/`khEquipe`/`sha256`) contre ce serveur : l'appareil et le serveur se parlent, et l'ÉCRAN dit ce
     que le serveur a répondu (« Connexion refusée » + la raison, jamais « Serveur injoignable »). C'est la couture
     que CLAUDE.md désigne comme la plus dangereuse ;
   · le CORS : `x-teamop-kh` est autorisé à la requête préalable, et le refus porte l'en-tête d'origine (sans lui
     le navigateur ne pourrait pas LIRE le refus). */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), net = require('net'), vm = require('vm');
const crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
const SURV = fs.readFileSync(path.join(RACINE, '.github', 'scripts', 'surveillance.js'), 'utf8');
/* Les seuls commentaires retirés sont ceux qui COMMENCENT une ligne (règle du dépôt : le motif naïf avale du vrai code). */
const sansCom = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const CODE = sansCom(SRV);

let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

/* Une fonction d'app.html par son nom, découpée à l'accolade (`async` fait partie de la déclaration). */
function extraire(src, nom) {
  let d0 = src.indexOf('function ' + nom + '(');
  if (d0 < 0) return '';
  if (src.slice(d0 - 6, d0) === 'async ') d0 -= 6;
  let p = 0;
  for (let k = src.indexOf('{', d0); k < src.length; k++) { if (src[k] === '{') p++; else if (src[k] === '}') { p--; if (!p) return src.slice(d0, k + 1); } }
  return '';
}

const banc = path.join(os.tmpdir(), 'teamop-test-2692-' + process.pid);
const enfants = [];
let facteurSrv = null;
function fin() {
  for (const e of enfants) { try { if (e.pid) process.kill(e.pid); } catch (x) {} }
  try { if (facteurSrv) facteurSrv.s.close(); } catch (x) {}
  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {}
}
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 180 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 180000).unref();

/* Le facteur du banc (celui de test-832) : ce que le serveur envoie, on le lit. Le point doublé est retiré (RFC 5321 §4.5.2). */
function facteur() {
  const f = { recus: [] };
  f.s = net.createServer(c => {
    c.on('error', () => {});
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) {
          if (l === '.') { corps = false; f.recus.push(msg); msg = ''; c.write('250 ok\r\n'); }
          else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n';
          continue;
        }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
  });
  return f;
}

console.log('\n── 2692 · connecter, déconnecter, envoyer : la preuve de clé est EXIGÉE, comme pour la Réception ──');

/* ══ 1. LE TEXTE : le montage, l'ordre, les cinq routes ══ */
console.log('\n1. Le montage');
{
  const M = /app\.use\(\[([^\]]*)\], cleEquipeExige\);/.exec(CODE);
  const exige = M ? M[1].split(',').map(x => x.trim().replace(/['"]/g, '')) : [];
  const obs = /app\.use\(\[([^\]]*)\], cleEquipeObserve\);/.exec(CODE);
  const observe = obs ? obs[1].split(',').map(x => x.trim().replace(/['"]/g, '')) : [];
  vrai('population : la garde est montée (et la liste de ce qu\'elle garde est lue)', exige.length > 0 && observe.length > 0, { exige, observe });
  v('elle garde les deux routes de lecture, les trois qui agissent, et la traduction (20 octobre 2026) — et elles seules',
    exige.slice().sort(), ['/api/mail/traduire', '/api/mailbox/connect', '/api/mailbox/disconnect', '/api/mailboxes', '/api/replies', '/api/sendmail']);
  vrai('chacune est AUSSI observée (req.cleEquipe est posé par l\'observation)', exige.every(r => observe.includes(r)));
  vrai('et la garde est montée APRÈS l\'observation (montée avant, elle refuserait tout le monde)',
    CODE.indexOf('], cleEquipeObserve);') > 0 && CODE.indexOf('], cleEquipeObserve);') < CODE.indexOf('], cleEquipeExige);'));
  vrai('et AVANT les routes elles-mêmes (le quota de connexion et d\'envoi ne se consomme pas sur un refus)',
    ['/api/mailbox/connect', '/api/mailbox/disconnect', '/api/sendmail'].every(r =>
      CODE.indexOf('], cleEquipeExige);') < CODE.indexOf("app.post('" + r + "'")));
  vrai('le réglage de secours est le MÊME pour les cinq (un seul `mailPreuveExigee === false`)',
    (CODE.match(/mailPreuveExigee === false/g) || []).length === 1);
  vrai('le refus compte aussi par route', /mailRefus\.parRoute\[rt\] = /.test(CODE) && /parRoute: mailRefus\.parRoute/.test(CODE));
  vrai('la surveillance LIT la ventilation (un champ de /health que personne ne lit est du code mort)',
    /j\.mailRefus\.parRoute\b/.test(sansCom(SURV)));
}

/* ══ 2. LE VRAI SERVEUR ══ */
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) {
    console.log('  … partie exécutée SAUTÉE : server/node_modules absent (cd server && npm i)');
    console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
  }

  const CLE_A = 'CLE-PRIVEE-DE-A-2692';
  const CLE_B = 'CLE-PRIVEE-DE-B-2692';
  const CLE_PARTAGEE = 'ELAN-GESTION-7F3A9C2E-cloud-2026';   // celle d'app.html : publique, donc sans valeur de preuve
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');

  facteurSrv = facteur();
  await new Promise(r => facteurSrv.s.listen(0, '127.0.0.1', r));
  const PS = facteurSrv.s.address().port;

  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  const cfg = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    smtp: { host: '127.0.0.1', port: PS, user: 'plateforme@banc-2692.fr', pass: 'x', from: '"Plateforme" <plateforme@banc-2692.fr>' } };
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify(cfg));                                                  // SANS réglage → fermé
  fs.writeFileSync(path.join(banc, 'config-ouvert.json'), JSON.stringify(Object.assign({ mailPreuveExigee: false }, cfg)));   // le secours
  const ESPACES = {
    'entreprise-a': { slug: 'entreprise-a', nom: 'A', email: 'a@exemple.fr', t: 'ent-a-9x', code: b64({ t: 'ent-a-9x', k: CLE_A }), ts: 1 },
    'entreprise-b': { slug: 'entreprise-b', nom: 'B', email: 'b@exemple.fr', t: 'ent-b-7y', code: b64({ t: 'ent-b-7y', k: CLE_B }), ts: 2 },
    'entreprise-p': { slug: 'entreprise-p', nom: 'P', email: 'p@exemple.fr', t: 'ent-p-3z', code: b64({ t: 'ent-p-3z', k: CLE_PARTAGEE }), ts: 3 },
    'elan-gestion': { slug: 'elan-gestion', nom: 'Repli', email: 'r@exemple.fr', t: 'elan-gestion', code: b64({ t: 'elan-gestion', k: CLE_PARTAGEE }), ts: 4 } };
  const BOITES = {
    mb1: { id: 'mb1', teamId: 'ent-a-9x', email: 'a@exemple.fr', pass: 'mot-de-passe-secret-A', name: 'Boite A', imapHost: '127.0.0.1', smtpHost: '127.0.0.1', smtpPort: PS },
    mb2: { id: 'mb2', teamId: 'ent-b-7y', email: 'b@exemple.fr', pass: 'mot-de-passe-secret-B', name: 'Boite B', imapHost: '127.0.0.1', smtpHost: '127.0.0.1', smtpPort: PS } };
  const monter = (dossier) => {
    fs.mkdirSync(dossier, { recursive: true });
    fs.writeFileSync(path.join(dossier, 'espaces.json'), JSON.stringify(ESPACES));
    fs.writeFileSync(path.join(dossier, 'mailboxes.json'), JSON.stringify(BOITES));
  };
  monter(path.join(banc, 'data')); monter(path.join(banc, 'data-ouvert'));

  /* Le faux courrier du banc, préchargé AVANT le serveur : tout `nodemailer.createTransport` vers un hôte autre que
     127.0.0.1 devient un faux qui valide et n'envoie rien (la connexion d'une boîte vérifie un SMTP de fournisseur,
     dont l'hôte vient de l'adresse — impossible à rediriger) ; `imapflow` vient de tests/faux-imap.js. */
  const PRELOAD = path.join(banc, 'faux-courrier.js');
  fs.writeFileSync(PRELOAD, `'use strict';
const nm = require(${JSON.stringify(path.join(RACINE, 'server', 'node_modules', 'nodemailer'))});
const vrai = nm.createTransport;
nm.createTransport = function (o) {
  if (o && o.host && o.host !== '127.0.0.1') return { verify: async () => true, sendMail: async () => { throw new Error('banc : réseau coupé'); } };
  return vrai.apply(nm, arguments);
};`);
  fs.writeFileSync(path.join(banc, 'imap.json'), '{}');

  const lancer = (conf, dossier, port) => {
    const e = spawn(process.execPath, ['-r', path.join(RACINE, 'tests', 'faux-imap.js'), '-r', PRELOAD, path.join(RACINE, 'server', 'index.js')], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, conf), TEAMOP_DATA: path.join(banc, dossier), PORT: String(port),
        FAUX_IMAP: path.join(banc, 'imap.json'), FAUX_IMAP_RACINE: path.join(RACINE, 'server') }),
      stdio: 'ignore' });
    enfants.push(e);
    return e;
  };
  const PORT = 8100 + (process.pid % 700);
  lancer('config.json', 'data', PORT);
  lancer('config-ouvert.json', 'data-ouvert', PORT + 1);
  const B = 'http://127.0.0.1:' + PORT, B2 = 'http://127.0.0.1:' + (PORT + 1);
  for (const base of [B, B2]) for (let i = 0; i < 80; i++) { try { await fetch(base + '/health'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }

  const FICHIER = path.join(banc, 'data', 'mailboxes.json');
  const lireBoites = () => fs.readFileSync(FICHIER, 'utf8');
  const poster = async (base, chemin, corps, entetes, methode) => {
    const r = await fetch(base + chemin, { method: methode || 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, entetes || {}), body: JSON.stringify(corps) });
    const txt = await r.text(); let json = null; try { json = JSON.parse(txt); } catch (e) {}
    return { statut: r.status, txt, json, ct: r.headers.get('content-type') || '', cors: r.headers.get('access-control-allow-origin') };
  };
  const preuve = (k) => ({ 'x-teamop-kh': kh(k) });
  const mailEnvoi = (t, extra) => Object.assign({ teamId: t, to: 'client@dehors.fr', subject: 'Sujet banc 2692', text: 'Bonjour' }, extra || {});
  /* On compte les courriels adressés au CLIENT du banc : l'application, sur un envoi refusé, signale aussi l'incident au
     support de TeamOP (`/api/bug`, route publique, le domaine du destinataire seulement) — un courriel à `contact@teamop.fr`
     qui n'est pas l'envoi qu'on garde. */
  const recusAvant = () => facteurSrv.recus.filter(m => /^To: .*client@dehors\.fr/m.test(m)).length;
  const sante = async () => (await (await fetch(B + '/health')).json());

  try {
    /* ── A. SANS PREUVE : refusé, rien ne sort, rien ne s'écrit ── */
    console.log('\n2. Sans preuve (ou avec une mauvaise) : 403, aucun courriel, aucune boîte touchée');
    const boitesAvant = lireBoites();
    const n0 = facteurSrv.recus.length;
    const refus = [];   // [libellé, réponse]
    const essayer = async (lib, chemin, corps, entetes) => { const r = await poster(B, chemin, corps, entetes); refus.push([lib, r]); return r; };

    for (const mode of [
      ['boîte connectée', { useMailbox: { id: 'mb1' } }],
      ['mode avancé (SMTP fourni par l\'appelant)', { smtp: { host: '127.0.0.1', port: PS, user: 'x@banc.fr', pass: 'y' } }],
      ['plateforme', {}]]) {
      const r = await essayer('sendmail ' + mode[0] + ' sans preuve', '/api/sendmail', mailEnvoi('ent-a-9x', mode[1]));
      v('sendmail ' + mode[0] + ' : sans preuve → 403', r.statut, 403);
    }
    let r = await essayer('connect sans preuve', '/api/mailbox/connect', { teamId: 'ent-a-9x', email: 'pirate@exemple.fr', pass: 'pw', name: 'x' });
    v('connect : sans preuve → 403', r.statut, 403);
    r = await essayer('disconnect sans preuve', '/api/mailbox/disconnect', { teamId: 'ent-a-9x', id: 'mb1' });
    v('disconnect : sans preuve → 403', r.statut, 403);

    r = await essayer('sendmail mauvaise clé', '/api/sendmail', mailEnvoi('ent-a-9x', { useMailbox: { id: 'mb1' } }), preuve('MAUVAISE-CLE'));
    v('sendmail : mauvaise clé → 403', r.statut, 403);
    r = await essayer('connect kh malformé', '/api/mailbox/connect', { teamId: 'ent-a-9x', email: 'pirate@exemple.fr', pass: 'pw' }, { 'x-teamop-kh': 'pas-un-sha256' });
    v('connect : kh malformé → 403', r.statut, 403);
    r = await essayer('disconnect kh vide', '/api/mailbox/disconnect', { teamId: 'ent-a-9x', id: 'mb1' }, { 'x-teamop-kh': '' });
    v('disconnect : kh vide → 403', r.statut, 403);

    /* La preuve d'UNE entreprise n'ouvre pas l'espace d'une AUTRE : la clé de A, présentée pour le teamId de B. */
    r = await essayer('A sur B : sendmail', '/api/sendmail', mailEnvoi('ent-b-7y', { useMailbox: { id: 'mb2' } }), preuve(CLE_A));
    v('⛔ la clé de A ne fait pas envoyer depuis la boîte de B', r.statut, 403);
    r = await essayer('A sur B : disconnect', '/api/mailbox/disconnect', { teamId: 'ent-b-7y', id: 'mb2' }, preuve(CLE_A));
    v('⛔ … ni la déconnecter', r.statut, 403);
    r = await essayer('A sur B : connect', '/api/mailbox/connect', { teamId: 'ent-b-7y', email: 'pirate@exemple.fr', pass: 'pw' }, preuve(CLE_A));
    v('⛔ … ni y brancher une boîte', r.statut, 403);

    /* Une clé écrite en clair dans app.html ne prouve rien quand on la présente : le kh est JUSTE, la porte reste fermée. */
    r = await essayer('clé partagée : sendmail', '/api/sendmail', mailEnvoi('ent-p-3z'), preuve(CLE_PARTAGEE));
    v('⛔ clé partagée, kh juste : sendmail refusé quand même', r.statut, 403);
    r = await essayer('clé partagée : connect', '/api/mailbox/connect', { teamId: 'ent-p-3z', email: 'pirate@exemple.fr', pass: 'pw' }, preuve(CLE_PARTAGEE));
    v('⛔ … connect aussi', r.statut, 403);
    r = await essayer('clé partagée : disconnect', '/api/mailbox/disconnect', { teamId: 'ent-p-3z', id: 'mb1' }, preuve(CLE_PARTAGEE));
    v('⛔ … disconnect aussi', r.statut, 403);

    /* L'espace technique (la bêta) : refusé comme « technique », avec SON message, et sans entrer dans « inconnu ». */
    const h0 = await sante();
    r = await essayer('bêta : sendmail', '/api/sendmail', mailEnvoi('opgestion-beta'), preuve('PREUVE-BIEN-FORMEE-MAIS-SANS-OBJET'));
    v('bêta (opgestion-beta) : sendmail refusé', r.statut, 403);
    vrai('… avec le message de l\'espace de test (pas celui d\'une clé à prouver)', /espace de test/.test((r.json || {}).error || ''), r.json);
    r = await essayer('bêta : connect', '/api/mailbox/connect', { teamId: 'opgestion-beta', email: 'pirate@exemple.fr', pass: 'pw' }, preuve('PREUVE-BIEN-FORMEE-MAIS-SANS-OBJET'));
    v('bêta : connexion de boîte refusée', r.statut, 403);
    r = await essayer('repli : sendmail', '/api/sendmail', mailEnvoi('elan-gestion'), preuve(CLE_PARTAGEE));
    v('espace de repli (elan-gestion) : sendmail refusé', r.statut, 403);
    r = await essayer('hors annuaire : sendmail', '/api/sendmail', mailEnvoi('espace-hors-annuaire'), preuve(CLE_A));
    v('espace hors annuaire : invérifiable, donc refusé', r.statut, 403);
    const h1 = await sante();
    const pm = h => (h.mailRefus || {}).parMotif || {};
    v('⛔ la bêta est comptée « technique », JAMAIS « inconnu » (l\'alarme reste propre)',
      [(pm(h1).technique || 0) - (pm(h0).technique || 0), (pm(h1).inconnu || 0) - (pm(h0).inconnu || 0)], [3, 1]);   // 3 refus bêta/repli ; 1 hors annuaire = inconnu

    /* Les formes de requête qui pourraient contourner le montage. */
    const bruts = [];
    let rb = await fetch(B + '/API/SENDMAIL', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mailEnvoi('ent-a-9x', { useMailbox: { id: 'mb1' } })) });
    bruts.push(['casse', rb.status]);
    rb = await fetch(B + '/api/sendmail/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mailEnvoi('ent-a-9x', { useMailbox: { id: 'mb1' } })) });
    bruts.push(['barre finale', rb.status]);
    rb = await fetch(B + '/api/sendmail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mailEnvoi(['ent-a-9x'], { useMailbox: { id: 'mb1' } })) });
    bruts.push(['teamId en tableau', rb.status]);
    rb = await fetch(B + '/api/sendmail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign(mailEnvoi('ent-a-9x', { useMailbox: { id: 'mb1' } }), { t: 'ent-a-9x' })) });
    bruts.push(['t en plus', rb.status]);
    rb = await fetch(B + '/api/sendmail', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(mailEnvoi('ent-a-9x', { useMailbox: { id: 'mb1' } })) });
    bruts.push(['corps non JSON', rb.status]);
    rb = await fetch(B + '/api/sendmail', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teamop-kh': kh(CLE_A) + 'ff' }, body: JSON.stringify(mailEnvoi('ent-a-9x', { useMailbox: { id: 'mb1' } })) });
    bruts.push(['kh trop long', rb.status]);
    rb = await fetch(B + '/api/sendmail?kh=' + kh(CLE_A), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mailEnvoi('ent-a-9x', { useMailbox: { id: 'mb1' } })) });
    bruts.push(['kh dans l\'adresse (jamais lu : il entrerait dans les journaux)', rb.status]);
    /* ⛔ LA PREUVE ET LA ROUTE DOIVENT LIRE LE MÊME teamId : un `t` de l'attaquant (SON espace, SA clé, juste) à côté du
       `teamId` de la victime. Si la garde préférait `t`, elle jugerait l'attaquant et la route enverrait chez la victime. */
    rb = await fetch(B + '/api/sendmail', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teamop-kh': kh(CLE_B) }, body: JSON.stringify(Object.assign(mailEnvoi('ent-a-9x', { useMailbox: { id: 'mb1' } }), { t: 'ent-b-7y' })) });
    bruts.push(['t = mon espace (clé juste), teamId = celui de la victime', rb.status]);
    rb = await fetch(B + '/api/mailbox/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teamop-kh': kh(CLE_B) }, body: JSON.stringify({ teamId: 'ent-a-9x', t: 'ent-b-7y', id: 'mb1' }) });
    bruts.push(['… idem pour la déconnexion', rb.status]);
    /* Et l'inverse, qui vise les deux refus d'espace (clé partagée, espace technique) : leur `teamId` est jugé « valide »
       par la clé publique d'app.html, et un `t` d'une entreprise ordinaire à côté ferait juger CELUI-CI par la garde. */
    rb = await fetch(B + '/api/sendmail', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teamop-kh': kh(CLE_PARTAGEE) }, body: JSON.stringify(Object.assign(mailEnvoi('ent-p-3z'), { t: 'ent-a-9x' })) });
    bruts.push(['teamId sur clé partagée (kh publique juste), t = une entreprise ordinaire', rb.status]);
    rb = await fetch(B + '/api/sendmail', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teamop-kh': kh(CLE_PARTAGEE) }, body: JSON.stringify(Object.assign(mailEnvoi('elan-gestion'), { t: 'ent-a-9x' })) });
    bruts.push(['teamId de l\'espace de repli (kh publique juste), t = une entreprise ordinaire', rb.status]);
    for (const [lib, st] of bruts) v('contournement ? ' + lib + ' → 403', st, 403);

    v('⛔ AUCUN courriel n\'est sorti, tous modes et toutes variantes confondus', facteurSrv.recus.length - n0, 0);
    v('⛔ `mailboxes.json` est inchangé octet pour octet (ni boîte ajoutée, ni boîte retirée)', lireBoites() === boitesAvant, true);
    vrai('population : les refus ci-dessus sont bien ceux de la garde (un JSON `error`, jamais une 400 ni une 429)',
      refus.length >= 18 && refus.every(([, x]) => x.statut === 403 && x.json && typeof x.json.error === 'string'), refus.filter(([, x]) => x.statut !== 403).map(([l, x]) => [l, x.statut]));
    vrai('aucun refus ne nomme une adresse, un serveur, un mot de passe ou un espace',
      refus.every(([, x]) => !/exemple\.fr|127\.0\.0\.1|mot-de-passe-secret|ent-[abp]-|entreprise-|opgestion|elan-gestion|pirate/.test(x.txt)));
    /* Le piège de la Réception, à l'envers : ici l'écran LIT le JSON (`mailDoConnect` fait `await r.json()`). Un
       refus en text/plain fait jeter `r.json()` et afficher « Serveur injoignable » — vérifié plus bas sur la vraie fonction. */
    vrai('le refus de ces trois routes est du JSON (l\'inverse de /api/replies, dont l\'écran lit la liste)', refus.every(([, x]) => /^application\/json/.test(x.ct)));
    vrai('… et il porte l\'en-tête d\'origine : sans lui le navigateur ne pourrait pas LIRE le refus',
      (await fetch(B + '/api/sendmail', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://teamop.fr' }, body: JSON.stringify(mailEnvoi('ent-a-9x')) })).headers.get('access-control-allow-origin') === 'https://teamop.fr');
    vrai('les mots du message évitent ceux que l\'écran de connexion prend pour un mot de passe de boîte (refus, auth, login, invalid, password, mot de passe)',
      refus.every(([, x]) => !/refus|auth|login|535|credential|invalid|password|mot de passe/i.test((x.json || {}).error || '')), refus.map(([, x]) => (x.json || {}).error).filter((e, i, a) => a.indexOf(e) === i));
    /* Le comptage : par motif ET par route, sans nom d'entreprise. */
    const h2 = await sante();
    const pr = (h2.mailRefus || {}).parRoute || {};
    vrai('/health ventile les refus par route (sendmail, connexion, déconnexion)', (pr.sendmail || 0) >= 10 && (pr['mailbox/connect'] || 0) >= 5 && (pr['mailbox/disconnect'] || 0) >= 4, pr);
    v('⛔ la route écrite en MAJUSCULES est comptée sous la même clé (la table ne grossit pas)', Object.keys(pr).sort(), ['mailbox/connect', 'mailbox/disconnect', 'sendmail']);
    vrai('⛔ /health ne nomme AUCUN espace', !/ent-a-9x|ent-b-7y|ent-p-3z|entreprise-a|entreprise-b|elan-gestion|opgestion-beta/.test(JSON.stringify(h2.mailRefus)), h2.mailRefus);
    vrai('le total des refus monte avec eux', (h2.mailRefus || {}).n >= refus.length, (h2.mailRefus || {}).n);

    /* Un refus ne consomme AUCUN quota : 40 refus d'envoi (le plafond est de 30 par heure) n'empêchent pas le vrai envoi. */
    for (let i = 0; i < 40; i++) await poster(B, '/api/sendmail', mailEnvoi('ent-a-9x', { subject: 'Sujet banc 2692 quota' }));
    r = await poster(B, '/api/sendmail', mailEnvoi('ent-a-9x', { subject: 'Sujet banc 2692 apres refus', useMailbox: { id: 'mb1' } }), preuve(CLE_A));
    v('⛔ après 40 refus, le vrai envoi de l\'entreprise passe encore (200, pas 429) : on ne peut plus épuiser son heure d\'envoi', r.statut, 200);

    /* ── B. LA BONNE PREUVE PASSE ── */
    console.log('\n3. Avec la preuve de SA clé : ça passe (les trois modes d\'envoi, la connexion, la déconnexion)');
    const nB = facteurSrv.recus.length;
    r = await poster(B, '/api/sendmail', mailEnvoi('ent-a-9x', { subject: 'Sujet banc 2692 boite', useMailbox: { id: 'mb1' } }), preuve(CLE_A));
    v('sendmail depuis la boîte connectée : 200', r.statut, 200);
    r = await poster(B, '/api/sendmail', mailEnvoi('ent-a-9x', { subject: 'Sujet banc 2692 avance', smtp: { host: '127.0.0.1', port: PS, user: 'x@banc.fr', pass: 'y' } }), preuve(CLE_A));
    v('sendmail en mode avancé : 200', r.statut, 200);
    r = await poster(B, '/api/sendmail', mailEnvoi('ent-a-9x', { subject: 'Sujet banc 2692 plateforme', brand: { name: 'Entreprise A' } }), { 'X-TEAMOP-KH': kh(CLE_A).toUpperCase() });
    v('sendmail par la plateforme, nom d\'en-tête et empreinte en MAJUSCULES : 200 (l\'empreinte est comparée en minuscules)', r.statut, 200);
    await new Promise(res => setTimeout(res, 600));
    const sujets = facteurSrv.recus.slice(nB).map(m => (/^Subject: (.*)$/m.exec(m) || [])[1]);
    vrai('trois courriels sont arrivés au facteur, un par mode', ['boite', 'avance', 'plateforme'].every(s => sujets.some(x => (x || '').includes(s))), sujets);
    vrai('celui de la boîte connectée part bien de l\'adresse de la boîte', facteurSrv.recus.slice(nB).some(m => /^Subject: .*boite/m.test(m) && /^From: .*a@exemple\.fr/m.test(m)));

    r = await poster(B, '/api/mailbox/connect', { teamId: 'ent-a-9x', email: 'nouvelle@exemple.fr', pass: 'pw-nouvelle', name: 'Nouvelle' }, preuve(CLE_A));
    v('connect avec la preuve : 200 {ok:true}', [r.statut, (r.json || {}).ok], [200, true]);
    const apres = JSON.parse(lireBoites());
    vrai('… et la boîte est enregistrée pour SON entreprise', Object.values(apres).some(b => b.email === 'nouvelle@exemple.fr' && b.teamId === 'ent-a-9x'));
    const idNouvelle = (r.json || {}).id;
    r = await poster(B, '/api/mailbox/disconnect', { teamId: 'ent-a-9x', id: idNouvelle }, preuve(CLE_A));
    v('disconnect avec la preuve : 200', r.statut, 200);
    vrai('… et la boîte a bien disparu', !JSON.parse(lireBoites())[idNouvelle]);
    r = await poster(B, '/api/mailbox/disconnect', { teamId: 'ent-b-7y', id: 'mb2' }, preuve(CLE_B));
    v('B déconnecte SA boîte avec SA clé : 200', r.statut, 200);
    vrai('… elle a disparu, celle de A est intacte', !JSON.parse(lireBoites()).mb2 && !!JSON.parse(lireBoites()).mb1);
    /* La réponse 200 d'avant a laissé `mb2` sortir : on la remet pour la suite. */
    fs.writeFileSync(FICHIER, JSON.stringify(Object.assign(JSON.parse(lireBoites()), { mb2: BOITES.mb2 })));

    /* ── C. LE CORS ── */
    console.log('\n4. La requête préalable CORS autorise l\'en-tête de la preuve, sur les trois routes');
    for (const route of ['/api/sendmail', '/api/mailbox/connect', '/api/mailbox/disconnect']) {
      const o = await fetch(B + route, { method: 'OPTIONS', headers: { Origin: 'https://teamop.fr', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-teamop-kh' } });
      const ah = (o.headers.get('access-control-allow-headers') || '').toLowerCase();
      vrai(route + ' : préalable 204 qui autorise x-teamop-kh', o.status === 204 && ah.split(',').map(x => x.trim()).includes('x-teamop-kh'), [o.status, ah]);
    }

    /* ── D. LE SECOURS ── */
    console.log('\n5. « mailPreuveExigee »: false rouvre les trois d\'un coup (le secours documenté)');
    const n2 = facteurSrv.recus.length;
    r = await poster(B2, '/api/sendmail', mailEnvoi('ent-a-9x', { subject: 'Sujet banc 2692 secours', useMailbox: { id: 'mb1' } }));
    v('sendmail sans preuve : 200', r.statut, 200);
    r = await poster(B2, '/api/mailbox/connect', { teamId: 'ent-a-9x', email: 'secours@exemple.fr', pass: 'pw', name: 's' });
    v('connect sans preuve : 200', r.statut, 200);
    const idSecours = (r.json || {}).id;
    r = await poster(B2, '/api/mailbox/disconnect', { teamId: 'ent-a-9x', id: idSecours });
    v('disconnect sans preuve : 200', r.statut, 200);
    await new Promise(res => setTimeout(res, 400));
    vrai('le courriel du secours est bien parti', facteurSrv.recus.length - n2 >= 1);
    const h3 = await (await fetch(B2 + '/health')).json();
    v('… et le secours ne compte aucun refus', (h3.mailRefus || {}).n, 0);

    /* ── E. LES VRAIES FONCTIONS D'app.html CONTRE CE SERVEUR ── */
    console.log('\n6. ⛔ Les VRAIES fonctions d\'app.html (srvMail, mailDoConnect, mailDisconnect) contre ce serveur');
    const FN = [extraire(APP, 'srvMail'), extraire(APP, 'mailDoConnect'), extraire(APP, 'mailDisconnect'), extraire(APP, 'enteteEquipe'),
      extraire(APP, 'khEquipe'), extraire(APP, 'syncSecret'), extraire(APP, 'sha256')];
    vrai('population : les sept fonctions sont trouvées dans app.html (et ne sont pas des coquilles)', FN.every(f => f.length > 80), FN.map(f => f.length));
    vrai('app.html présente la preuve sur CES trois appels (`enteteEquipe`), et sur aucun autre chemin d\'envoi',
      ['/api/sendmail', '/api/mailbox/connect', '/api/mailbox/disconnect'].every(rt => new RegExp("fetch\\(PUSH_API\\+'" + rt.replace(/\//g, '\\/') + "',\\{method:'POST',headers:await enteteEquipe\\(").test(sansCom(APP))));
    const sandbox = (cle, team) => {
      const W = { console, JSON, String, Math, Date, Array, Number, Object, Promise, parseInt, TextEncoder, Uint8Array, fetch, crypto: globalThis.crypto,
        __cle: cle, __t: team, __toasts: [], __modales: [], __charge: 0, __ferme: 0, SYNC_SECRET_DEFAULT: 'x', PUSH_API: B, current: '', views: {},
        localStorage: { getItem: k => (k === 'elan_sync_secret' ? W.__cle : null) },
        toast: m => W.__toasts.push(String(m)), openModal: h => W.__modales.push(String(h)), closeModal: () => { W.__ferme++; },
        syncTeam: () => W.__t, mailBrandName: () => 'Entreprise A', mailBoxFor: () => null, can: () => true, currentUser: null, db: { mailReply: '' },
        loadMailboxes: async () => { W.__charge++; }, mailBoxesManage: () => {}, setTimeout: () => 0,
        mailMdpApplication: () => null, mailMdpOublie: () => null, esc: s => String(s), confirm: () => true, alert: () => {}, location: {}, navigator: { userAgent: '' } };
      W.window = W;
      const champs = { 'mb-email': { value: 'jolie@exemple.fr' }, 'mb-pass': { value: 'pw-jolie' }, 'mb-btn': { textContent: '', disabled: false } };
      W.$ = id => champs[id] || null; W.__champs = champs;
      vm.createContext(W);
      vm.runInContext("let _khCle='', _khVal=''; let _srvMailErr='';\n" + FN.join('\n') + '\nthis.srvMail=srvMail; this.mailDoConnect=mailDoConnect; this.mailDisconnect=mailDisconnect; this.__err=()=>_srvMailErr;', W);
      return W;
    };

    /* srvMail : la boîte connectée, avec la preuve de l'entreprise — passe. */
    let W = sandbox(CLE_A, 'ent-a-9x');
    const nS = recusAvant();
    let res = await W.srvMail('client@dehors.fr', 'Sujet banc 2692 appareil', 'Bonjour', '', 'devis', null, { mailboxId: 'mb1' });
    v('srvMail (avec la clé de l\'entreprise) : l\'envoi réussit', res, true);
    await new Promise(x => setTimeout(x, 400));
    v('… et le facteur a reçu le courriel', recusAvant() - nS, 1);
    /* srvMail avec une mauvaise clé : refus, l'écran DIT pourquoi (toast + raison), rien ne part. */
    W = sandbox('UNE-AUTRE-CLE', 'ent-a-9x');
    const nS2 = recusAvant();
    res = await W.srvMail('client@dehors.fr', 'Sujet banc 2692 appareil refuse', 'Bonjour', '', 'devis', null, { mailboxId: 'mb1', sansMailto: true });
    v('srvMail (mauvaise clé) : l\'envoi échoue', res, false);
    vrai('… l\'écran DIT pourquoi : « Envoi refusé (… prouver la clé de son entreprise …) », pas un « erreur serveur » muet',
      W.__toasts.some(t => /Envoi refusé \(.*prouver la clé de son entreprise/.test(t)), W.__toasts);
    vrai('… et la raison est gardée pour l\'écran de diagnostic (`_srvMailErr`)', /prouver la clé/.test(W.__err()), W.__err());
    await new Promise(x => setTimeout(x, 300));
    v('⛔ … rien n\'est parti', recusAvant() - nS2, 0);
    /* Le repli de srvMail : une boîte pro configurée refusée → nouvel essai par la plateforme. Le serveur refuse aussi le second. */
    W = sandbox('UNE-AUTRE-CLE', 'ent-a-9x');
    W.mailBoxFor = () => ({ user: 'pro@exemple.fr', pass: 'x', host: '127.0.0.1', port: PS });
    const nS3 = recusAvant();
    res = await W.srvMail('client@dehors.fr', 'Sujet banc 2692 repli', 'Bonjour', '', 'devis', null, { sansMailto: true });
    v('srvMail (boîte pro + mauvaise clé) : le repli « plateforme » est refusé lui aussi, pas contourné', res, false);
    await new Promise(x => setTimeout(x, 300));
    v('⛔ … rien n\'est parti, par aucun des deux chemins', recusAvant() - nS3, 0);

    /* mailDoConnect : la preuve juste connecte ; la fausse affiche « Connexion refusée » + la raison. */
    W = sandbox(CLE_A, 'ent-a-9x');
    await W.mailDoConnect();
    vrai('mailDoConnect (clé juste) : « Boîte connectée », la liste est rechargée, la fenêtre se ferme',
      W.__toasts.some(t => /Boîte connectée/.test(t)) && W.__charge === 1 && W.__ferme === 1, [W.__toasts, W.__charge, W.__ferme]);
    const idJolie = Object.values(JSON.parse(lireBoites())).find(b => b.email === 'jolie@exemple.fr');
    vrai('… et la boîte existe côté serveur, pour SON entreprise', !!idJolie && idJolie.teamId === 'ent-a-9x');
    W = sandbox('UNE-AUTRE-CLE', 'ent-a-9x');
    W.__champs['mb-email'].value = 'refusee@exemple.fr';
    await W.mailDoConnect();
    const modale = W.__modales.join('\n');
    vrai('⛔ mailDoConnect (mauvaise clé) : l\'écran dit « Connexion refusée » et la raison du serveur',
      /Connexion refusée/.test(modale) && /prouver la clé de son entreprise/.test(modale), modale.slice(0, 200));
    vrai('⛔ … et NE dit PAS « Serveur injoignable » (un refus en text/plain l\'aurait dit : r.json() aurait jeté)', !W.__toasts.some(t => /injoignable/i.test(t)), W.__toasts);
    vrai('⛔ … ni ne propose de réinitialiser le mot de passe de la boîte (le mot de passe n\'y est pour rien)', !/Mot de passe oublié|mot de passe incorrect|réinitialis/i.test(modale), modale.slice(0, 400));
    vrai('… le bouton redevient utilisable', W.__champs['mb-btn'].disabled === false && /Connecter et vérifier/.test(W.__champs['mb-btn'].textContent), W.__champs['mb-btn']);
    vrai('⛔ … et aucune boîte n\'a été enregistrée', !Object.values(JSON.parse(lireBoites())).some(b => b.email === 'refusee@exemple.fr'));

    /* mailDisconnect : avec la clé juste, la boîte part ; avec une fausse, elle reste. */
    W = sandbox('UNE-AUTRE-CLE', 'ent-a-9x');
    await W.mailDisconnect(idJolie.id);
    vrai('⛔ mailDisconnect (mauvaise clé) : la boîte reste', !!JSON.parse(lireBoites())[idJolie.id]);
    W = sandbox(CLE_A, 'ent-a-9x');
    await W.mailDisconnect(idJolie.id);
    vrai('mailDisconnect (clé juste) : la boîte est retirée', !JSON.parse(lireBoites())[idJolie.id]);

    /* Et un appareil de B qui connaîtrait le teamId de A : même verdict, avec les vraies fonctions. */
    W = sandbox(CLE_B, 'ent-a-9x');
    const nS4 = recusAvant();
    res = await W.srvMail('client@dehors.fr', 'Sujet banc 2692 B sur A', 'Bonjour', '', 'devis', null, { mailboxId: 'mb1', sansMailto: true });
    v('⛔ un appareil de B qui vise le teamId de A (avec SA clé à lui) : refusé', res, false);
    await new Promise(x => setTimeout(x, 300));
    v('… et rien n\'est parti de la boîte de A', recusAvant() - nS4, 0);
  } catch (e) {
    ko++; console.log('  ✗ EXCEPTION du banc : ' + (e && e.stack || e));
  } finally {
    fin();
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
