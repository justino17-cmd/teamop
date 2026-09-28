/* ⛔ CE QUE CE FICHIER GARDE — LES CONTOURNEMENTS DES PROTECTIONS DE SUPPRESSION, TROUVÉS PAR `gardien`
   LE 27 SEPTEMBRE 2026 ET REJOUÉS ICI SUR LE VRAI SERVEUR.

   Justin avait accepté de supprimer depuis la Tour sans code (« Fait les 4 ») en échange de deux
   protections (« Oui rajoute ça ») : un e-mail d'avis après chaque suppression, et le code qui revient
   au-delà de trois entreprises en 24 heures. La promesse : « une session de la Tour volée détruit trois
   entreprises au plus, et chacune a prévenu ». `gardien` l'a contournée trois fois, sur le vrai serveur :
     · B1 — une adresse de client portant CINQ espaces d'autres entreprises (rattachés par
       `/api/monitor/espaces`), puis une seule fermeture confirmée : six entreprises, compteur à 1 ;
     · B2 — l'espace PARTAGÉ de l'application rattaché de même, et effacé par la fermeture ;
     · B3 — « repartir à neuf » effaçait tout, sans avis et hors compteur ;
     · B4 — le code et l'avis partaient dans une boîte que la Tour RELÈVE elle-même : la Messagerie
       les lisait, les déplaçait, les supprimait ; la relève du support les rangeait dans une liste que
       tout compte de la Tour lit.
   Et, à corriger : C1 un avis manqué ne fermait rien (joué par `test-832`), C2 le journal des e-mails
   disait « parti » (`test-832`), C3 une écriture ratée répondait « supprimé », R3 une adresse en clair
   dans un motif (`test-832`), R4 un nom d'entreprise qui glissait une fausse ligne dans l'avis, R5 des
   effacements en série qui dépassaient les 60 s de nginx.

   ⛔ LE VRAI SERVEUR, isolé sur 127.0.0.1 : un facteur SMTP de banc, un Google de banc (qui sait se faire
   attendre), et une FAUSSE BOÎTE IMAP — un module `imapflow` de banc glissé dans le cache de `require`
   par `node -r` avant que le serveur ne démarre. C'est ce qui permet de voir, sans réseau, ce que la
   relève du support et la Messagerie (`server/mail.js`) font d'un e-mail de sécurité. Rien ne sort
   d'ici. Ce fichier ne lit aucune page : il part avec le déploiement du serveur seul. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b834-'));
let enfant = null, faux = null, facteurSrv = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (faux) faux.close(); } catch (e) {}
  try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {}
  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 200 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 200000).unref();

/* ── La fausse boîte IMAP : l'état vit dans un fichier JSON que le banc écrit et relit ──────────────── */
const FAUX_IMAP_MODULE = `'use strict';
const fs = require('fs');
const FICHIER = process.env.FAUX_IMAP;
const lire = () => { try { return JSON.parse(fs.readFileSync(FICHIER, 'utf8')); } catch (e) { return { messages: [], actions: [] }; } };
const ecrire = (b) => { fs.writeFileSync(FICHIER + '.tmp', JSON.stringify(b)); fs.renameSync(FICHIER + '.tmp', FICHIER); };
const dans = (b, d) => b.messages.filter(m => (m.dossier || 'INBOX') === d);
function choisir(b, d, plage, parUid) {
  const l = dans(b, d);
  if (plage && typeof plage === 'object') {
    if (plage.seen === false) return l.filter(m => !(m.flags || []).includes('\\\\Seen'));
    if (plage.uid != null) { const s = new Set(String(plage.uid).split(',').map(Number)); return l.filter(m => s.has(m.uid)); }
    return l;
  }
  const txt = String(plage), cle = parUid ? 'uid' : 'seq';
  if (/^\\d+:\\*$/.test(txt)) { const a = +txt.split(':')[0]; return l.filter(m => m[cle] >= a); }
  const s = new Set(txt.split(',').map(Number)); return l.filter(m => s.has(m[cle]));
}
function vue(m) {
  const src = 'Message-ID: ' + m.messageId + '\\r\\nFrom: ' + m.from + '\\r\\nTo: ' + (m.to || '') + '\\r\\nSubject: ' + m.subject
    + '\\r\\nContent-Type: text/plain; charset=utf-8\\r\\n\\r\\n' + (m.text || '') + '\\r\\n';
  return { seq: m.seq, uid: m.uid, flags: new Set(m.flags || []), source: Buffer.from(src), size: src.length, bodyStructure: { childNodes: [] },
    envelope: { messageId: m.messageId, from: [{ address: m.from, name: '' }], to: [{ address: m.to || '', name: '' }], subject: m.subject, date: new Date(m.ts || Date.now()) } };
}
class ImapFlow {
  constructor(o) { this.o = o || {}; this.chemin = 'INBOX'; this.mailbox = { exists: 0 }; }
  on() {}
  async connect() { this.mailbox = { exists: dans(lire(), 'INBOX').length }; }
  async logout() {}
  close() {}
  async getMailboxLock(p) { this.chemin = p || 'INBOX'; this.mailbox = { exists: dans(lire(), this.chemin).length }; return { release() {} }; }
  async list() { return [{ path: 'INBOX', name: 'INBOX', flags: new Set() }, { path: 'Corbeille', name: 'Corbeille', specialUse: '\\\\Trash', flags: new Set() }]; }
  async search(q, o) { const l = choisir(lire(), this.chemin, (q && q.seen === false) ? { seen: false } : {}, true); return l.map(m => (o && o.uid) ? m.uid : m.seq); }
  async *fetch(plage, q, o) { for (const m of choisir(lire(), this.chemin, plage, !!(o && o.uid))) yield vue(m); }
  async fetchOne(id, q, o) { const l = choisir(lire(), this.chemin, String(id), !!(o && o.uid)); return l.length ? vue(l[0]) : false; }
  _agir(plage, o, fn, action) {
    const b = lire();
    for (const m of choisir(b, this.chemin, typeof plage === 'number' ? String(plage) : plage, !!(o && o.uid))) { fn(m); b.actions.push({ action, messageId: m.messageId }); }
    ecrire(b); return true;
  }
  async messageFlagsAdd(p, f, o) { return this._agir(p, o, m => { m.flags = [...new Set([...(m.flags || []), ...f])]; }, 'marque+' + f.join('')); }
  async messageFlagsRemove(p, f, o) { return this._agir(p, o, m => { m.flags = (m.flags || []).filter(x => !f.includes(x)); }, 'marque-' + f.join('')); }
  async messageMove(p, d, o) { return this._agir(p, o, m => { m.dossier = d; }, 'deplace'); }
  async messageDelete(p, o) { return this._agir(p, o, m => { m.dossier = '(supprimé)'; }, 'supprime'); }
  async append() { return true; }
}
module.exports = { ImapFlow };
`;
const PRECHARGE = `'use strict';
const Module = require('module');
const cible = require.resolve('imapflow', { paths: [process.env.FAUX_IMAP_RACINE] });
const m = new Module(cible); m.filename = cible; m.loaded = true; m.exports = require(process.env.FAUX_IMAP_MODULE);
require.cache[cible] = m;
`;

/* ── Le facteur (le même que `test-832`) ────────────────────────────────────────────────────────── */
function facteur() {
  const f = { recus: [] };
  f.s = require('net').createServer(c => {
    c.on('error', () => {});
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; f.recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
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
const lisible = (m) => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
const sujetDe = (m) => {
  const x = /^Subject: (.*(?:\n[ \t].*)*)/m.exec(String(m || '')); if (!x) return '';
  const brut = x[1].replace(/\n[ \t]/g, ' ')
    .replace(/=\?UTF-8\?Q\?(.*?)\?=\s*/gi, (_, q) => q.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (__, h) => String.fromCharCode(parseInt(h, 16))))
    .replace(/=\?UTF-8\?B\?(.*?)\?=\s*/gi, (_, b) => Buffer.from(b, 'base64').toString('latin1'));
  return Buffer.from(brut, 'latin1').toString('utf8');
};
const entete = (m, nom) => { const x = new RegExp('^' + nom + ': *(.*)$', 'mi').exec(String(m || '')); return x ? x[1].trim() : ''; };
const EST_AVIS = /Une suppression vient d'être faite depuis la Tour de contrôle\./;

console.log('\n── 834 · les contournements des protections de suppression (`gardien`) : fermés, sur le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); require.resolve('imapflow', { paths: [path.join(RACINE, 'server')] }); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  /* ══ 1. LE GOOGLE DE BANC — il compte les effacements, et sait se faire attendre ══════════════════ */
  const G = { requetes: [], lent: 0 };
  faux = http.createServer((q, r) => {
    let c = ''; q.on('data', d => { c += d; }); q.on('end', () => {
      G.requetes.push(q.method + ' ' + q.url.split('?')[0]);
      const rendre = () => { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(/accounts:signUp/.test(q.url) ? { idToken: 'jeton-anonyme-de-banc' } : {})); };
      if (q.method === 'DELETE' && G.lent) setTimeout(rendre, G.lent); else rendre();
    });
  });
  await new Promise(res => faux.listen(0, '127.0.0.1', res));
  const GURL = 'http://127.0.0.1:' + faux.address().port;
  const effaces = () => G.requetes.filter(x => /^DELETE .*\/elan_teams\//.test(x)).map(x => decodeURIComponent(x.split('/elan_teams/')[1]));
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));

  /* ══ 2. LES DONNÉES — des entreprises fictives, et un rattachement « d'avant » à l'espace partagé ══ */
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const code64 = (t) => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  const ESP = {
    omegaun: ['t-omega1-834', 'Omega Un', 'omega@exemple-834.fr'], omegadeux: ['t-omega2-834', 'Omega Deux', 'omega@exemple-834.fr'],
    omegapartage: ['elan-gestion', 'Omega Partage', 'omega@exemple-834.fr'],   // une entrée d'annuaire d'avant la règle, sur l'espace PARTAGÉ
    kappanettoyage: ['t-kappa-834', 'Kappa Nettoyage', 'kappa@exemple-834.fr'],
    sigmahygiene: ['t-sigma-834', 'Sigma Hygiène', ''], taupropre: ['t-tau-834', 'Tau Propre', ''], upsilonservices: ['t-upsilon-834', 'Upsilon Services', ''],
    lambdaun: ['t-lambda1-834', 'Lambda Un', 'lambda@exemple-834.fr'], lambdadeux: ['t-lambda2-834', 'Lambda Deux', 'lambda@exemple-834.fr'],
    munettoyage: ['t-mu-834', 'Mu Nettoyage', 'mu@exemple-834.fr'],
    phiun: ['t-phi1-834', 'Phi Un', 'phi@exemple-834.fr'], phideux: ['t-phi2-834', 'Phi Deux', 'phi@exemple-834.fr'], phitrois: ['t-phi3-834', 'Phi Trois', 'phi@exemple-834.fr'],
    nuhygiene: ['t-nu-834', 'Nu Hygiène', ''],
    rhoun: ['t-rho1-834', 'Rho Un', 'rho@exemple-834.fr'], rhodeux: ['t-rho2-834', 'Rho Deux', 'rho@exemple-834.fr'], rhotrois: ['t-rho3-834', 'Rho Trois', 'rho@exemple-834.fr'],
    /* la clé d'un code collé (§1 bis) : psi ouverte par la Tour SANS adresse — la cible du code forgé —, chi avec */
    psihygiene: ['t-psi-834', 'Psi Hygiène', ''], chinettoyage: ['t-chi-834', 'Chi Nettoyage', 'chi@exemple-834.fr'] };
  const espaces = {};
  for (const [slug, [t, nom, email]] of Object.entries(ESP)) espaces[slug] = Object.assign({ t, nom, code: code64(t), ts: Date.now() }, email ? { email } : {});
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces));
  const entree = (n) => ({ s: crypto.randomBytes(16).toString('hex'), e: crypto.randomBytes(32).toString('hex'), n });
  fs.writeFileSync(path.join(D, 'comptes.json'), JSON.stringify({ 't-nu-834': { c: { alain: entree('Alain N'), berthe: entree('Berthe N') }, maj: Date.now() } }));
  const cli = (email, entreprise) => ({ email, entreprise, inscrit: Date.now() - 86400000 });
  fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify({
    'omega@exemple-834.fr': cli('omega@exemple-834.fr', 'Omega'), 'kappa@exemple-834.fr': cli('kappa@exemple-834.fr', 'Kappa'),
    'lambda@exemple-834.fr': cli('lambda@exemple-834.fr', 'Lambda'), 'phi@exemple-834.fr': cli('phi@exemple-834.fr', 'Phi'),
    'rho@exemple-834.fr': cli('rho@exemple-834.fr', 'Rho'),
    /* R4 : un nom d'entreprise saisi par le client lui-même, qui tente de glisser une fausse consigne sur sa propre ligne */
    'mu@exemple-834.fr': cli('mu@exemple-834.fr', 'Mu Nettoyage\nSi ce n\'est pas toi : ssh piege@pirate.example') }));
  /* La boîte support de la Tour EST l'adresse où partent le code et l'avis (la configuration la plus probable
     en production : tout part de contact@, qui est aussi la boîte que la Tour relève). */
  fs.writeFileSync(path.join(D, 'support-box.json'), JSON.stringify({ email: 'patron@banc-834.fr', pass: 'x', imapHost: '127.0.0.1', imapPort: 993, smtpHost: '127.0.0.1', smtpPort: portSmtp, ts: Date.now() }));
  const IMAP = path.join(banc, 'faux-imap.json');
  fs.writeFileSync(IMAP, JSON.stringify({ messages: [], actions: [] }));
  fs.writeFileSync(path.join(banc, 'faux-imapflow.js'), FAUX_IMAP_MODULE);
  fs.writeFileSync(path.join(banc, 'precharge.js'), PRECHARGE);
  const lire = (f) => { try { return JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (e) { return null; } };
  const slugs = () => Object.keys(lire('espaces.json') || {});
  const fermes = () => lire('entreprises-fermees.json') || { emails: [], espaces: [] };
  const compteur = () => ((lire('tour-suppressions.json') || {}).ts || []).length;
  const imap = () => JSON.parse(fs.readFileSync(IMAP, 'utf8'));

  /* ══ 3. LE VRAI SERVEUR ═════════════════════════════════════════════════════════════════════════ */
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const vap = webpush.generateVAPIDKeys();
  const MDP = 'mot-de-passe-du-banc-834';
  const CONF = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), notifDemandes: 'patron@banc-834.fr',
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' } };
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify(CONF));
  fs.writeFileSync(path.join(banc, 'config-a-part.json'), JSON.stringify(Object.assign({}, CONF, { securiteEmail: 'moi-seul@banc-834.fr' })));
  const PORT = 9600 + (process.pid % 300);
  const B = 'http://127.0.0.1:' + PORT;
  let journal = '', journalTout = '';   // `journal` : la vie en cours du serveur ; `journalTout` : toutes ses vies
  const demarrer = async (conf) => {
    journal = '';
    enfant = spawn(process.execPath, ['-r', path.join(banc, 'precharge.js'), SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, conf || 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
        TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: GURL + '/token', TEAMOP_FIRESTORE_URL: GURL,
        TEAMOP_IDTK_URL: GURL + '/idtk', TEAMOP_FB_CERTS_URL: GURL + '/certs',
        FAUX_IMAP: IMAP, FAUX_IMAP_MODULE: path.join(banc, 'faux-imapflow.js'), FAUX_IMAP_RACINE: path.join(RACINE, 'server') }),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; journalTout += d; }); enfant.stderr.on('data', d => { journal += d; journalTout += d; });
    let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
    await dormir(150);   // la ligne de diagnostic s'écrit juste après le montage (setImmediate)
    return vivant;
  };
  const arreter = async () => { const e = enfant; enfant = null; await new Promise(r => { e.once('exit', r); e.kill('SIGKILL'); }); };
  let jeton = '';
  const appel = async (route, corps) => { const r = await fetch(B + route, { method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: JSON.stringify(corps) });
    let j = null; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j: j || {} }; };
  const lireApi = async (route) => { const r = await fetch(B + route, { headers: { Authorization: 'Bearer ' + jeton } }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };
  vrai('le serveur démarre (fausse boîte IMAP glissée par `node -r`)', await demarrer());
  jeton = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
  vrai('la Tour ouvre une session de patron', jeton);
  const courriels = () => facteurSrv.recus.length;
  const dernier = () => facteurSrv.recus[facteurSrv.recus.length - 1] || '';
  const dernierCode = () => { for (let i = facteurSrv.recus.length - 1; i >= 0; i--) { const m = /Code de confirmation : (\d{6})/.exec(lisible(facteurSrv.recus[i])); if (m) return m[1]; } return ''; };

  try {
    vrai('au démarrage, le serveur DIT que la Tour relève la boîte des e-mails de sécurité — sans l\'écrire',
      /suppressions de la Tour — e-mails de sécurité : adresse par défaut · ⚠ la Tour relève cette boîte/.test(journal) && !/patron@banc-834\.fr/.test(journal));

    /* ══ 4. B1 et B2 À LA SOURCE : L'ANNUAIRE NE RATTACHE NI L'ESPACE PARTAGÉ, NI CELUI D'UN AUTRE CLIENT ══ */
    console.log('\n1. L\'annuaire refuse les rattachements qui servaient à tout effacer d\'un coup');
    let r = await appel('/api/monitor/espaces', { nom: 'Leurre', code: code64('elan-gestion'), email: 'omega@exemple-834.fr' });
    v('⛔ rattacher l\'espace PARTAGÉ à un client : 403, rien d\'écrit', [r.s, /espace par défaut de l'application/.test(r.j.error || ''), slugs().includes('leurre')], [403, true, false]);
    r = await appel('/api/monitor/espaces', { nom: 'Leurre Kappa', code: code64('t-kappa-834'), email: 'omega@exemple-834.fr' });
    v('⛔ rattacher l\'espace d\'un AUTRE client (kappa) à l\'adresse d\'omega : 409, rien d\'écrit', [r.s, /appartient déjà à « Kappa Nettoyage »/.test(r.j.error || ''), slugs().includes('leurrekappa')], [409, true, false]);
    /* ⛔ … et la casse n'y change rien (`gardien`, 28 septembre 2026) : le paiement lit l'identifiant SANS casse — un code
       collé en capitales donnait une seconde adresse à kappa, et son vrai patron était refusé au paiement */
    r = await appel('/api/monitor/espaces', { nom: 'Leurre Kappa Maj', code: code64('T-KAPPA-834'), email: 'omega@exemple-834.fr' });
    v('⛔ … le MÊME identifiant écrit en capitales : 409 aussi, rien d\'écrit', [r.s, /appartient déjà à « Kappa Nettoyage »/.test(r.j.error || ''), slugs().includes('leurrekappamaj')], [409, true, false]);
    r = await appel('/api/monitor/espaces', { nom: 'Kappa Nettoyage', code: code64('t-kappa-834'), email: 'omega@exemple-834.fr' });
    v('⛔ changer l\'adresse d\'un espace déjà relié : 409, kappa garde la sienne', [r.s, (lire('espaces.json').kappanettoyage || {}).email], [409, 'kappa@exemple-834.fr']);

    /* ══ 4 bis. LA CLÉ D'UN CODE COLLÉ — Justin, 28 septembre 2026 : « on ne la rattachera pas, sauf si je le confirme
       moi-même ». Le scénario rejoué par `gardien` : une entreprise ouverte SANS adresse (psi), un code FORGÉ — son vrai
       identifiant, une clé inventée — collé avec l'adresse d'un tiers. Avant, 200 : l'entrée du tiers devenait la
       référence de psi (sa fausse clé), un compte était semé dans son annuaire, et le paiement suivait. ══ */
    console.log('\n1 bis. Un code collé avec une clé DIFFÉRENTE ne passe que si le patron le confirme');
    /* avec un identifiant ET un mot de passe de départ : accepté, ce code SÈMERAIT un compte dans l'annuaire de psi */
    const code64k = (t, k) => Buffer.from(JSON.stringify({ t, k, a: 'pirate', m: 'Mot-De-Passe-Pirate-834' })).toString('base64');
    const annuPsi = () => Object.keys((((lire('comptes.json') || {})['t-psi-834']) || {}).c || {}).length;
    const psiAvant = JSON.stringify(lire('espaces.json').psihygiene);
    r = await appel('/api/monitor/espaces', { nom: 'Psi Collée', code: code64k('t-psi-834', 'cle-forgee-834'), email: 'pirate@exemple-834.fr' });
    await dormir(400);   // le semis de l'annuaire part sans être attendu : on lui laisse le temps de se tromper
    v('⛔ le bon identifiant, une clé FORGÉE, l\'adresse d\'un tiers : 409 cle_differente, rien d\'écrit, aucun compte semé, psi intacte',
      [r.s, r.j.motif, /clé DIFFÉRENTE/.test(r.j.error || ''), slugs().includes('psicollee'), annuPsi(), JSON.stringify(lire('espaces.json').psihygiene) === psiAvant],
      [409, 'cle_differente', true, false, 0, true]);
    r = await appel('/api/monitor/espaces', { nom: 'Psi Collée Maj', code: code64k('T-PSI-834', 'cle-forgee-834'), email: 'pirate@exemple-834.fr' });
    v('⛔ … l\'identifiant écrit en capitales n\'y change rien : 409 cle_differente', [r.s, r.j.motif, slugs().includes('psicolleemaj')], [409, 'cle_differente', false]);
    r = await appel('/api/monitor/espaces', { nom: 'Psi Collée', code: code64k('t-psi-834', 'cle-forgee-834'), email: 'pirate@exemple-834.fr', confirmeCle: 'true' });
    v('⛔ une confirmation écrite en TEXTE n\'en est pas une (booléen strict) : 409', [r.s, r.j.motif, slugs().includes('psicollee')], [409, 'cle_differente', false]);
    r = await appel('/api/monitor/espaces', { nom: 'Psi Hygiène', code: code64('t-psi-834'), email: 'psi@exemple-834.fr' });
    v('le MÊME code (la vraie clé) collé une seconde fois : 200, rien à confirmer, l\'adresse est posée',
      [r.s, (lire('espaces.json').psihygiene || {}).email, !!(lire('espaces.json').psihygiene || {}).cleConfirmee], [200, 'psi@exemple-834.fr', false]);
    /* L'entreprise qui a changé sa clé (« Enregistrer une nouvelle clé d'équipe ») : le même nom, la même adresse, une
       clé NEUVE. C'est le cas légitime — il passe, mais seulement sur la confirmation, et elle se garde. */
    r = await appel('/api/monitor/espaces', { nom: 'Chi Nettoyage', code: code64k('t-chi-834', 'cle-neuve-834'), email: 'chi@exemple-834.fr' });
    v('⛔ une clé NEUVE sur le même nom et la même adresse, sans confirmation : 409, l\'ancienne clé reste',
      [r.s, r.j.motif, /cle-propre-t-chi-834/.test(Buffer.from((lire('espaces.json').chinettoyage || {}).code || '', 'base64').toString('utf8'))], [409, 'cle_differente', true]);
    r = await appel('/api/monitor/espaces', { nom: 'Chi Nettoyage', code: code64k('t-chi-834', 'cle-neuve-834'), email: 'chi@exemple-834.fr', confirmeCle: true });
    const chi = lire('espaces.json').chinettoyage || {};
    v('… avec la confirmation du patron : 200, la nouvelle clé est enregistrée, et QUI l\'a confirmée aussi',
      [r.s, /cle-neuve-834/.test(Buffer.from(chi.code || '', 'base64').toString('utf8')), (chi.cleConfirmee || {}).par, typeof (chi.cleConfirmee || {}).ts],
      [200, true, 'Patron', 'number']);
    vrai('… et le journal du serveur le dit (qui, quel espace — sans adresse)', /Tour : Patron confirme une clé DIFFÉRENTE pour l'espace t-chi-834/.test(journal) && !/chi@exemple-834\.fr/.test(journal));
    r = await appel('/api/monitor/espaces', { nom: 'Xi Neuve', code: code64k('t-xi-834', 'cle-quelconque-834'), email: 'xi@exemple-834.fr' });
    v('un identifiant que le serveur ne connaît pas : 200 sans question (c\'est une entreprise neuve)', [r.s, slugs().includes('xineuve')], [200, true]);

    /* ══ 5. B3 : « REPARTIR À NEUF » AU MÊME RÉGIME QUE LES SUPPRESSIONS ══════════════════════════════ */
    console.log('\n2. « Repartir à neuf » : avis, compteur, et jamais l\'espace partagé');
    r = await appel('/api/monitor/espaces/renaitre', { nom: 'Omega Partage' });
    v('⛔ un nom posé sur l\'espace partagé : 403, rien d\'effacé', [r.s, slugs().includes('omegapartage'), effaces().includes('elan-gestion')], [403, true, false]);
    let n0 = courriels();
    r = await appel('/api/monitor/espaces/renaitre', { nom: 'Sigma Hygiène' });
    v('la Tour en service (sans `confirme`), sous la limite : l\'espace est effacé, l\'avis part, l\'entreprise compte',
      [r.s, r.j.supprime, r.j.ancien, r.j.avis, courriels() - n0, compteur(), effaces().includes('t-sigma-834'), slugs().includes('sigmahygiene')],
      [200, true, 't-sigma-834', { parti: true }, 1, 1, true, false]);
    const avisSigma = dernier();
    vrai('   l\'avis dit « repart à neuf », qui, comment, et « la 1re entreprise »',
      EST_AVIS.test(lisible(avisSigma)) && /« Sigma Hygiène » repart à neuf/.test(sujetDe(avisSigma)) && /Confirmée : dans la Tour\n/.test(lisible(avisSigma))
      && /C'est la 1re entreprise supprimée en 24 heures/.test(lisible(avisSigma)));
    r = await appel('/api/monitor/espaces/renaitre', { nom: 'Personne Inconnue' });
    v('   un nom sans espace : rien à faire, rien au compteur', [r.s, r.j.rien, compteur()], [200, true, 1]);

    /* ══ 6. B1 et B2 : LA FERMETURE COMPTE CHAQUE ESPACE, ET ÉPARGNE L'ESPACE PARTAGÉ ══════════════════ */
    console.log('\n3. Fermer un client : chaque espace compte, l\'espace partagé est épargné');
    /* ⛔ Le contrôle de limite compte ce que la fermeture VA effacer : avec une entreprise déjà supprimée, un client
       à TROIS espaces ferait 4 — au-delà de 3. Compté pour un, il passerait (1 + 1 = 2). */
    n0 = courriels();
    r = await appel('/api/monitor/clients/retirer', { email: 'rho@exemple-834.fr', confirme: true });
    v('⛔ rho porte TROIS espaces, une entreprise déjà supprimée : 1 + 3 > 3, la confirmation ne suffit pas (et le code serait lisible : 409)',
      [r.s, r.j.limite, courriels() - n0, compteur(), slugs().includes('rhoun'), effaces().includes('t-rho1-834')], [409, true, 0, 1, true, false]);
    vrai('   le refus compte les trois espaces', /cette suppression effacerait 3 espaces d'un coup/.test(r.j.error || ''));
    n0 = courriels();
    r = await appel('/api/monitor/clients/retirer', { email: 'omega@exemple-834.fr', confirme: true });
    v('omega porte deux espaces (et un nom sur l\'espace partagé) : fermé, DEUX espaces effacés, compteur 1 → 3',
      [r.s, r.j.supprime, r.j.espaces, compteur(), courriels() - n0], [200, true, 2, 3, 1]);
    v('⛔ l\'espace partagé n\'est ni fermé ni effacé ; son nom, lui, s\'en va',
      [fermes().espaces.includes('elan-gestion'), effaces().includes('elan-gestion'), slugs().includes('omegapartage')], [false, false, false]);
    vrai('   les deux espaces d\'omega sont fermés et effacés', ['t-omega1-834', 't-omega2-834'].every(t => fermes().espaces.includes(t) && effaces().includes(t)));
    const avisOmega = lisible(dernier());
    vrai('   l\'avis les NOMME, dit que l\'espace partagé n\'est pas touché, et compte deux entreprises',
      /ses 2 espaces sont effacés : « Omega Un », « Omega Deux »\./.test(avisOmega) && /L'espace partagé de l'application, qui lui était rattaché, n'est pas touché\./.test(avisOmega)
      && /Elle compte pour 2 entreprises \(une par espace effacé\) : 3 supprimées en 24 heures\. À partir de la 4e/.test(avisOmega));

    /* ══ 7. B4 : LA LIMITE, QUAND LE CODE PARTIRAIT DANS UNE BOÎTE QUE LA TOUR LIT ═══════════════════ */
    console.log('\n4. Au-delà de la limite, un code lisible dans la Tour ne protégerait rien : la suppression attend');
    n0 = courriels();
    r = await appel('/api/monitor/clients/retirer', { email: 'lambda@exemple-834.fr', confirme: true });
    const refus = r.j.error || '';
    v('fermer lambda (2 espaces) avec le compteur à 3 : 409, aucun e-mail, rien de fermé',
      [r.s, r.j.limite, r.j.lisible, courriels() - n0, slugs().includes('lambdaun'), fermes().emails.includes('lambda@exemple-834.fr')], [409, true, true, 0, true, false]);
    vrai('   le refus dit POURQUOI (2 espaces, 3 déjà), OÙ partirait le code (masqué), QUAND ça se rouvre, et QUOI faire',
      /cette suppression effacerait 2 espaces d'un coup/.test(refus) && /3 entreprises ont déjà été supprimées/.test(refus) && /p\*\*\*@banc-834\.fr, une boîte que la Tour lit elle-même/.test(refus)
      && /suffira de nouveau à partir de .* \(heure de Paris\)/.test(refus) && /bash server\/set-securite\.sh/.test(refus) && !/patron@banc-834\.fr/.test(refus));
    r = await appel('/api/monitor/clients/retirer', { email: 'lambda@exemple-834.fr' });
    v('⛔ par le chemin du code (la Tour d\'avant) non plus : 409, aucun code envoyé', [r.s, courriels() - n0], [409, 0]);
    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-tau-834', confirme: true });
    v('⛔ supprimer partout : 409', [r.s, slugs().includes('taupropre')], [409, true]);
    r = await appel('/api/monitor/espaces/renaitre', { nom: 'Tau Propre', confirme: true });
    v('⛔ repartir à neuf : 409', [r.s, slugs().includes('taupropre'), courriels() - n0], [409, true, 0]);
    r = await appel('/api/monitor/compte/supprimer', { t: 't-nu-834', login: 'alain', confirme: true });
    v('   un COMPTE, lui, ne compte pas : il se supprime encore en un appel', [r.s, r.j.attente, r.j.avis], [200, true, { parti: true }]);

    /* ══ 8. B4 : LA TOUR NE CACHE NI N'EFFACE UN E-MAIL DE SÉCURITÉ ═══════════════════════════════════ */
    console.log('\n5. Les e-mails de sécurité, dans la boîte que la Tour relève');
    const proteges = new Set(lire('mails-proteges.json') || []);
    const secu = facteurSrv.recus.filter(m => /Une suppression vient d'être faite|Code de confirmation/.test(lisible(m)));
    const mids = secu.map(m => entete(m, 'Message-ID').replace(/^<|>$/g, '').toLowerCase());
    vrai('chaque avis et chaque code parti porte un identifiant tiré au sort et retenu par le serveur (' + secu.length + ')',
      secu.length >= 3 && mids.every(x => /^[0-9a-f]{32}\.securite@teamop\.fr$/.test(x) && proteges.has(x)));
    /* Dans la boîte : l'avis de sigma (protégé), un vrai message de client, et un faux « avis » envoyé du dehors. */
    const avisMid = entete(avisSigma, 'Message-ID');
    fs.writeFileSync(IMAP, JSON.stringify({ actions: [], messages: [
      { seq: 1, uid: 11, messageId: avisMid, from: 'banc@teamop.fr', to: 'patron@banc-834.fr', subject: sujetDe(avisSigma), text: lisible(avisSigma).split('\n\n').slice(1).join('\n\n'), ts: Date.now() - 60000 },
      { seq: 2, uid: 12, messageId: '<client-1@exemple-834.fr>', from: 'client@exemple-834.fr', to: 'patron@banc-834.fr', subject: 'Une question sur ma facture', text: 'Bonjour, …', ts: Date.now() - 50000 },
      { seq: 3, uid: 13, messageId: '<imitation-1@pirate.example>', from: 'banc@teamop.fr', to: 'patron@banc-834.fr', subject: '🗑 Tour — un faux avis', text: 'imitation', ts: Date.now() - 40000 }] }));
    await arreter();
    vrai('le serveur redémarre sur la boîte remplie', await demarrer());
    jeton = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
    for (let i = 0; i < 180 && !(lire('support-mails.json') || []).length; i++) await dormir(100);   // la relève passe 12 s après le démarrage
    const sup = lire('support-mails.json') || [];
    v('⛔ la relève du support range le client et l\'imitation — PAS l\'avis (la liste que tout compte de la Tour lit)',
      sup.map(m => m.mid).sort(), ['<client-1@exemple-834.fr>', '<imitation-1@pirate.example>']);
    v('⛔ et elle ne marque PAS l\'avis « lu » : il doit se voir non lu chez le patron',
      imap().actions.filter(a => a.messageId === avisMid).length, 0);
    vrai('   (elle marque lus les deux autres, comme avant)', ['<client-1@exemple-834.fr>', '<imitation-1@pirate.example>'].every(id => imap().actions.some(a => a.messageId === id && a.action === 'marque+\\Seen')));

    const bx = await lireApi('/api/monitor/mail/boites');
    const boite = ((bx.j.boites || [])[0] || {}).id;
    vrai('la Messagerie a repris la boîte support', boite);
    const liste = await lireApi('/api/monitor/mail/liste?boite=' + boite + '&dossier=INBOX');
    const par = {}; (liste.j.messages || []).forEach(m => { par[m.mid] = m; });
    v('la Messagerie MONTRE l\'avis (le patron le lit peut-être ici), marqué protégé — et seulement lui',
      [!!par[avisMid], par[avisMid] && par[avisMid].protege, (par['<client-1@exemple-834.fr>'] || {}).protege, (par['<imitation-1@pirate.example>'] || {}).protege], [true, true, false, false]);
    const lu = await lireApi('/api/monitor/mail/message?boite=' + boite + '&dossier=INBOX&uid=11');
    v('   on peut l\'ouvrir — sans qu\'il passe « lu »', [lu.s, lu.j.protege, /Sigma Hygiène/.test(lu.j.objet || ''), imap().actions.filter(a => a.messageId === avisMid).length], [200, true, true, 0]);
    await dormir(700);   // le suivi s'écrit 500 ms plus tard
    vrai('   et il n\'entre pas dans le suivi des demandes du support', !Object.prototype.hasOwnProperty.call(lire('mail-suivi.json') || {}, avisMid));
    const gestes = [['mail/flag', { boite, dossier: 'INBOX', uid: 11, lu: false }], ['mail/flag', { boite, dossier: 'INBOX', uid: 11, marque: true }],
      ['mail/deplacer', { boite, dossier: 'INBOX', uid: 11, role: 'corbeille' }], ['mail/supprimer', { boite, dossier: 'INBOX', uid: 11 }]];
    const reps = [];
    for (const [rt, corps] of gestes) reps.push(await appel('/api/monitor/' + rt, corps));
    v('⛔ ni marquer, ni déplacer, ni supprimer l\'avis depuis la Tour : 403 à chaque geste',
      reps.map(x => [x.s, /E-mail de sécurité/.test(x.j.error || '')]), [[403, true], [403, true], [403, true], [403, true]]);
    v('   l\'avis est toujours là, intact', [imap().actions.filter(a => a.messageId === avisMid).length, (imap().messages.find(m => m.uid === 11) || {}).dossier || 'INBOX'], [0, 'INBOX']);
    r = await appel('/api/monitor/mail/supprimer', { boite, dossier: 'INBOX', uid: 13 });
    v('   un faux avis venu du dehors se supprime normalement (la protection tient à l\'identifiant, pas à l\'objet)',
      [r.s, imap().actions.some(a => a.messageId === '<imitation-1@pirate.example>' && a.action === 'deplace')], [200, true]);

    /* ══ 9. UNE ADRESSE À SOI : LA LIMITE RETROUVE SON CODE ════════════════════════════════════════ */
    console.log('\n6. Avec une adresse de sécurité à part, le code revient au-delà de la limite');
    await arreter();
    vrai('le serveur redémarre avec `securiteEmail`', await demarrer('config-a-part.json'));
    vrai('   et le dit — sans écrire l\'adresse', /e-mails de sécurité : adresse réglée à part · la Tour ne relève pas cette boîte/.test(journal) && !/moi-seul@banc-834\.fr/.test(journal));
    jeton = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
    n0 = courriels();
    r = await appel('/api/monitor/clients/retirer', { email: 'lambda@exemple-834.fr', confirme: true });
    v('fermer lambda (2 espaces) au-delà de la limite : un code part, la réponse dit pourquoi, rien de fermé',
      [r.s, r.j.codeEnvoye, r.j.limite, r.j.espaces, r.j.dest, courriels() - n0, slugs().includes('lambdaun')], [200, true, true, 2, 'm***@banc-834.fr', 1, true]);
    v('   « pourquoi » dit le vrai compte', r.j.pourquoi, 'cette suppression effacerait 2 espaces d\'un coup (chacun compte pour une entreprise), et 3 entreprises ont déjà été supprimées ces dernières 24 heures : au-delà de 3, la confirmation de la Tour ne suffit plus');
    const codeLambda = dernierCode(), mailCode = dernier();
    vrai('   le code part à l\'adresse À PART, et l\'e-mail nomme les deux espaces',
      /moi-seul@banc-834\.fr/.test(entete(mailCode, 'To')) && /Les 2 espaces reliés à cette adresse seront effacés, avec toutes leurs données : « Lambda Un », « Lambda Deux »/.test(lisible(mailCode)));
    /* Le code vaut pour la liste qu'il a nommée : un espace rattaché entre-temps le rend caduc. */
    r = await appel('/api/monitor/espaces', { nom: 'Lambda Trois', code: code64('t-lambda3-834'), email: 'lambda@exemple-834.fr' });
    v('un TROISIÈME espace est rattaché à lambda (légitime : un espace neuf, la même adresse)', r.s, 200);
    r = await appel('/api/monitor/clients/retirer', { email: 'lambda@exemple-834.fr', code: codeLambda });
    v('⛔ le code reçu pour DEUX espaces ne ferme pas les TROIS : « code expiré », rien de fermé', [r.s, /code expiré/.test(r.j.error || ''), slugs().includes('lambdatrois'), fermes().emails.includes('lambda@exemple-834.fr')], [400, true, true, false]);
    r = await appel('/api/monitor/clients/retirer', { email: 'lambda@exemple-834.fr' });
    v('   la Tour d\'avant redemande : le nouveau code nomme les TROIS', [r.s, r.j.codeEnvoye, r.j.espaces, /« Lambda Trois »/.test(lisible(dernier()))], [200, true, 3, true]);
    n0 = courriels();
    r = await appel('/api/monitor/clients/retirer', { email: 'lambda@exemple-834.fr', code: dernierCode() });
    v('   avec ce code : fermé, trois espaces effacés, compteur 3 → 6, l\'avis parti', [r.s, r.j.supprime, r.j.espaces, compteur(), r.j.avis, courriels() - n0], [200, true, 3, 6, { parti: true }, 1]);
    vrai('   l\'avis compte trois entreprises et dit que le code a été demandé',
      /Elle compte pour 3 entreprises \(une par espace effacé\) : 6 supprimées en 24 heures\. Au-delà de 3, le code par e-mail a été demandé\./.test(lisible(dernier())) && /Confirmée : par le code/.test(lisible(dernier())));

    n0 = courriels();
    r = await appel('/api/monitor/espaces/renaitre', { nom: 'Upsilon Services' });
    v('⛔ « repartir à neuf » par la Tour d\'avant, au-delà de la limite : 429, aucun e-mail, rien d\'effacé (elle ne sait pas demander le code)',
      [r.s, r.j.limite, /ne sait pas demander/.test(r.j.error || ''), courriels() - n0, slugs().includes('upsilonservices'), effaces().includes('t-upsilon-834')], [429, true, true, 0, true, false]);
    r = await appel('/api/monitor/espaces/renaitre', { nom: 'Tau Propre', confirme: true });
    v('« repartir à neuf » par une Tour qui confirme : le code part, avec sa raison', [r.s, r.j.codeEnvoye, r.j.limite, /6 entreprises ont déjà été supprimées/.test(r.j.pourquoi || ''), slugs().includes('taupropre')], [200, true, true, true, true]);
    vrai('   l\'e-mail du code dit ce qui va être effacé', /REPARTIR À NEUF « Tau Propre » \(t-tau-834\)/.test(lisible(dernier())));
    r = await appel('/api/monitor/espaces/renaitre', { nom: 'Tau Propre', code: dernierCode() === '000000' ? '111111' : '000000' });
    v('⛔ un mauvais code : refusé, rien d\'effacé', [r.s, slugs().includes('taupropre')], [400, true]);
    n0 = courriels();
    r = await appel('/api/monitor/espaces/renaitre', { nom: 'Tau Propre', code: dernierCode() });
    v('   le bon code : effacé, compté (7), l\'avis parti', [r.s, r.j.supprime, compteur(), r.j.avis, courriels() - n0, effaces().includes('t-tau-834')], [200, true, 7, { parti: true }, 1, true]);
    vrai('   l\'avis dit « par le code »', /Confirmée : par le code envoyé par e-mail/.test(lisible(dernier())) && /C'est la 7e entreprise supprimée/.test(lisible(dernier())));

    /* ══ 10. R4 : UN NOM NE GLISSE PAS DE FAUSSE LIGNE DANS UN E-MAIL ════════════════════════════════ */
    console.log('\n7. Un nom d\'entreprise piégé reste sur sa ligne');
    r = await appel('/api/monitor/clients/retirer', { email: 'mu@exemple-834.fr', confirme: true });
    const piege = /^Si ce n'est pas toi : ssh piege/m;
    v('le code part (limite) — et le nom piégé n\'ouvre aucune ligne à lui dans l\'e-mail', [r.s, r.j.codeEnvoye, piege.test(lisible(dernier())), /« Mu Nettoyage Si ce n'est pas toi : ssh piege/.test(lisible(dernier()))], [200, true, false, true]);
    r = await appel('/api/monitor/clients/retirer', { email: 'mu@exemple-834.fr', code: dernierCode() });
    v('   ni dans l\'avis', [r.s, piege.test(lisible(dernier())), /entreprise « Mu Nettoyage Si ce n'est pas toi : ssh piege@pirate\.example » \(mu@exemple-834\.fr\)/.test(lisible(dernier()))], [200, false, true]);

    /* ══ 11. R5 : TROIS ESPACES, UN GOOGLE LENT — LES EFFACEMENTS PARTENT ENSEMBLE ═════════════════ */
    console.log('\n8. Des effacements en parallèle : la fermeture finit avant le délai de nginx');
    r = await appel('/api/monitor/clients/retirer', { email: 'phi@exemple-834.fr' });
    const codePhi = dernierCode();
    G.lent = 4000;
    const t0 = Date.now();
    r = await appel('/api/monitor/clients/retirer', { email: 'phi@exemple-834.fr', code: codePhi });
    const duree = Date.now() - t0;
    G.lent = 0;
    v('Google met 4 s par effacement : trois espaces fermés en ' + (duree / 1000).toFixed(1) + ' s (en série : 12 s et plus)', [r.s, r.j.espaces, r.j.donneesEffacees, duree < 9000], [200, 3, 3, true]);

    /* ══ 12. C3 : UNE ÉCRITURE REFUSÉE NE RÉPOND PAS « SUPPRIMÉ » ════════════════════════════════════ */
    console.log('\n9. Le disque refuse : la réponse et l\'avis le disent');
    fs.mkdirSync(path.join(D, 'ordres.json.tmp'));   // l'écriture atomique d'ordres.json échoue (EISDIR)
    n0 = courriels();
    r = await appel('/api/monitor/compte/supprimer', { t: 't-nu-834', login: 'berthe', confirme: true });
    v('⛔ ordres.json non écrit : 500, `ecrit:false`, et la réponse dit jusqu\'où la suppression vaut',
      [r.s, r.j.ecrit, /jusqu'au prochain redémarrage/.test(r.j.error || ''), r.j.avis, courriels() - n0], [500, false, true, { parti: true }, 1]);
    vrai('   l\'avis le dit aussi', /Attention : l'écriture sur le disque du serveur a échoué/.test(lisible(dernier())));
    fs.rmdirSync(path.join(D, 'ordres.json.tmp'));

    vrai('⛔ du début à la fin, sur les trois vies du serveur : ni l\'adresse du patron, ni l\'adresse à part, en clair dans son journal',
      journalTout.length > 500 && !/patron@banc-834\.fr|moi-seul@banc-834\.fr/.test(journalTout));
    const tousSecu = facteurSrv.recus.filter(m => /Une suppression vient d'être faite|Code de confirmation/.test(lisible(m)));
    const registre = new Set(lire('mails-proteges.json') || []);
    vrai('⛔ TOUS les e-mails de sécurité — les codes partis à l\'adresse à part compris — portent un identifiant retenu (' + tousSecu.length + ')',
      tousSecu.filter(m => EST_AVIS.test(lisible(m))).length === 8 && tousSecu.filter(m => /Code de confirmation/.test(lisible(m))).length === 5
      && tousSecu.every(m => registre.has(entete(m, 'Message-ID').replace(/^<|>$/g, '').toLowerCase())));
    v('⛔ rien n\'est parti ailleurs qu\'au Google de banc (127.0.0.1)', G.requetes.every(q => !/googleapis|google\.com/.test(q)), true);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  if (ko) console.log('\n── journal du serveur (fin) ──\n' + journal.slice(-2000));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})();
