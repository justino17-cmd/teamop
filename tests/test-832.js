/* ⛔ CE QUE CE FICHIER GARDE — SUPPRIMER DEPUIS LA TOUR SANS CODE PAR E-MAIL (Tour v2.69),
   ET LES DEUX PROTECTIONS QUI LE DOUBLENT.

   Justin, 27 septembre 2026, à la question « supprimer un compte, un lot de comptes, un client ou
   une entreprise demande encore un code par e-mail — on passe à question, case à cocher et Oui,
   comme dans OP GESTION ? » : « Fait les 4 ». Deux moitiés, et c'est leur COUTURE qu'on garde :
     · le serveur (`SUPPRIMER SANS CODE`, server/index.js) accepte `confirme: true` — un booléen
       strict — à la place du code, sur les quatre routes ;
     · la Tour (`supprAppel`, tour.html) l'envoie, et lit `codeEnvoye` AVANT de croire à une
       réussite : face au serveur d'avant, la route répond `ok:true` avec un code parti.
   Et ce qui ne doit PAS bouger : la Tour en service (v2.66, comme toute Tour d'avant la v2.69)
   n'envoie pas `confirme` — son premier appel doit toujours envoyer un code et ne RIEN supprimer,
   sinon elle détruirait sans la question qu'elle pose avant.

   Le même jour, aux deux protections proposées en échange du code : « Oui rajoute ça »
   (`APRÈS CHAQUE SUPPRESSION, UN E-MAIL`, server/index.js) :
     · après CHAQUE suppression — quatre routes, deux chemins — un e-mail d'avis part à la boîte du
       patron, attendu huit secondes au plus, et la réponse DIT s'il est parti (`avis`) ; sans
       e-mail configuré, rien ne se supprime ;
     · au-delà de TROIS ENTREPRISES en 24 heures, `confirme` ne suffit plus : le code revient
       (`limite`). Le compteur survit à un redémarrage, et illisible il reste FERMÉ.

   ⛔ LE VRAI SERVEUR, isolé sur 127.0.0.1 : un facteur SMTP de banc compte les courriels (et sait
   refuser, ou se taire), un Google de banc répond à tout ce que les suppressions appellent (jeton
   anonyme, effacement Firestore) — rien ne sort d'ici. Ce fichier ne lit AUCUNE page : il part avec
   le déploiement du serveur seul (`scripts/bancs-serveur.liste`). L'autre moitié — les vraies
   fonctions de la Tour contre ce serveur, et contre un serveur d'avant — est `test-833`, qui lit
   `tour.html`. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b832-'));
let enfant = null, faux = null, facteurSrv = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (faux) faux.close(); } catch (e) {}
  try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {}
  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 150000).unref();

/* Le facteur du banc (le même que `test-813`) : ce que le serveur envoie, on le lit. Deux humeurs de
   plus pour l'avis : `refuse` (un 550 à l'expéditeur, comme un serveur d'e-mails qui dit non) et
   `muet` (il accepte la connexion et ne dit même pas bonjour — nodemailer attendrait deux minutes). */
function facteur() {
  const f = { recus: [], mode: 'normal' };
  f.s = require('net').createServer(c => {
    c.on('error', () => {});
    if (f.mode === 'muet') return;
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        /* ⚠️ le point doublé (RFC 5321 §4.5.2) : une ligne qui commence par « . » arrive « .. ». Un vrai serveur le
           retire ; sans ça, un repli quoted-printable juste avant « .sh » faisait lire « set-admin..sh » au banc. */
        if (corps) { if (l === '.') { corps = false; f.recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('MAIL FROM') && f.mode === 'refuse') c.write('550 refusé par le facteur du banc\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
  });
  return f;
}
const lisible = (m) => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
/* L'objet, décodé (RFC 2047, mots Q ou B, lignes repliées) — les octets de mots voisins se recollent AVANT l'UTF-8. */
const sujetDe = (m) => {
  const x = /^Subject: (.*(?:\n[ \t].*)*)/m.exec(String(m || '')); if (!x) return '';
  const brut = x[1].replace(/\n[ \t]/g, ' ')
    .replace(/=\?UTF-8\?Q\?(.*?)\?=\s*/gi, (_, q) => q.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (__, h) => String.fromCharCode(parseInt(h, 16))))
    .replace(/=\?UTF-8\?B\?(.*?)\?=\s*/gi, (_, b) => Buffer.from(b, 'base64').toString('latin1'));
  return Buffer.from(brut, 'latin1').toString('utf8');
};
const mauvais = (c) => c === '000000' ? '111111' : '000000';
const dernierCode = () => { const l = facteurSrv.recus.map(lisible); for (let i = l.length - 1; i >= 0; i--) { const m = /Code de confirmation : (\d{6})/.exec(l[i]); if (m) return m[1]; } return ''; };
const EST_AVIS = /Une suppression vient d'être faite depuis la Tour de contrôle\./;
const dernier = () => facteurSrv.recus[facteurSrv.recus.length - 1] || '';

console.log('\n── 832 · supprimer depuis la Tour : question, case, « Oui » — un avis après, le code au-delà de trois entreprises ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  /* ══ 1. UN GOOGLE DE BANC — il répond à tout ce que les suppressions appellent, et il compte ══ */
  const G = { requetes: [] };
  faux = http.createServer((q, r) => {
    let c = ''; q.on('data', d => { c += d; }); q.on('end', () => {
      G.requetes.push(q.method + ' ' + q.url.split('?')[0]);
      r.writeHead(200, { 'Content-Type': 'application/json' });
      r.end(JSON.stringify(/accounts:signUp/.test(q.url) ? { idToken: 'jeton-anonyme-de-banc' } : {}));
    });
  });
  await new Promise(res => faux.listen(0, '127.0.0.1', res));
  const GURL = 'http://127.0.0.1:' + faux.address().port;
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));

  /* ══ 2. LES DONNÉES : des entreprises fictives, leurs annuaires, leurs connexions ════════════ */
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const hx = n => crypto.randomBytes(n).toString('hex');
  const code64 = (t) => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  const ESP = { alpha: ['t-alpha-832', 'Alpha Nettoyage', ''], sature: ['t-sature-832', 'Saturée Hygiène', ''],
    beta: ['t-beta-832', 'Beta Hygiène', 'beta@exemple-832.fr'], gamma: ['t-gamma-832', 'Gamma Services', 'gamma@exemple-832.fr'],
    eta: ['t-eta-832', 'Eta Propreté', 'eta@exemple-832.fr'],
    delta: ['t-delta-832', 'Delta Propreté', ''], epsilon: ['t-epsilon-832', 'Epsilon Désinfection', ''], zeta: ['t-zeta-832', 'Zeta Vapeur', ''] };
  const espaces = {};
  for (const [slug, [t, nom, email]] of Object.entries(ESP)) espaces[slug] = Object.assign({ t, nom, code: code64(t), ts: Date.now() }, email ? { email } : {});
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces));
  const entree = (n) => ({ s: hx(16), e: hx(32), n });
  const A = 't-alpha-832';
  const LOGINS = ['jean', 'paul', 'marc', 'luc', 'nora', 'ines', 'olga', 'remi', 'yves', 'neuf1', 'neuf2', 'neuf3', 'neuf4', 'jean2'];
  const comptes = { [A]: { c: {}, maj: Date.now() }, 't-sature-832': { c: { x1: entree('X Un'), x2: entree('X Deux') }, maj: Date.now() },
    't-delta-832': { c: { d1: entree('D Un') }, maj: Date.now() }, 't-epsilon-832': { c: { e1: entree('E Un') }, maj: Date.now() } };
  for (const l of LOGINS) comptes[A].c[l] = entree('Nom ' + l);
  fs.writeFileSync(path.join(D, 'comptes.json'), JSON.stringify(comptes));
  /* « a servi » = une connexion réussie à son nom ; les neufN ne se sont jamais connectés */
  const ev = (login, n) => ({ ts: Date.now() - n * 60000, ev: 'connexion', login, nom: '', role: 'technicien', version: '758', app: 'gestion' });
  const cnx = { [A]: ['jean', 'paul', 'marc', 'luc', 'nora', 'ines', 'olga', 'remi', 'yves', 'jean2'].map((l, n) => ev(l, n)),
    't-sature-832': Array.from({ length: 500 }, (_, n) => ev('x1', n)) };
  fs.writeFileSync(path.join(D, 'connexions.json'), JSON.stringify(cnx));
  fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify({
    'beta@exemple-832.fr': { email: 'beta@exemple-832.fr', entreprise: 'Beta Hygiène', inscrit: Date.now() - 86400000 },
    'gamma@exemple-832.fr': { email: 'gamma@exemple-832.fr', entreprise: 'Gamma Services', inscrit: Date.now() - 86400000 },
    'eta@exemple-832.fr': { email: 'eta@exemple-832.fr', entreprise: 'Eta Propreté', inscrit: Date.now() - 86400000 } }));
  /* Cinq suppressions d'entreprises d'AVANT-HIER, déjà au compteur : elles ne doivent pas compter. Si elles
     comptaient, la toute première suppression confirmée buterait sur la limite. */
  const COMPTEUR = path.join(D, 'tour-suppressions.json');
  fs.writeFileSync(COMPTEUR, JSON.stringify(Array.from({ length: 5 }, (_, n) => Date.now() - 25 * 3600000 - n * 60000)));
  const lire = (f) => { try { return JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (e) { return null; } };
  const dansAnnuaire = (t, l) => !!((lire('comptes.json') || {})[t] || { c: {} }).c[l];
  const ordres = (t, l) => (((lire('ordres.json') || {})[t]) || []).filter(o => o.login === l && o.type !== 'mdp').length;
  const slugs = () => Object.keys(lire('espaces.json') || {});
  const fermes = () => lire('entreprises-fermees.json') || { emails: [], espaces: [] };

  /* ══ 3. LE VRAI SERVEUR, ISOLÉ — et on sait l'arrêter net puis le relancer sur les mêmes données ══ */
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const vap = webpush.generateVAPIDKeys();
  const MDP = 'mot-de-passe-du-banc-832';
  const CONF = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey,
    apiKey: 'banc', adminPassHash: kh(MDP), notifDemandes: 'patron@banc-832.fr',
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' } };
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify(CONF));
  fs.writeFileSync(path.join(banc, 'config-sans-mail.json'), JSON.stringify(Object.assign({}, CONF, { smtp: undefined })));
  const PORT = 9300 + (process.pid % 300);
  const B = 'http://127.0.0.1:' + PORT;
  let journal = '';
  const demarrer = async (conf) => {
    enfant = spawn(process.execPath, [SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, conf || 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
        TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: GURL + '/token', TEAMOP_FIRESTORE_URL: GURL,
        TEAMOP_IDTK_URL: GURL + '/idtk', TEAMOP_FB_CERTS_URL: GURL + '/certs' }),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
    let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
    return vivant;
  };
  const arreter = async () => { const e = enfant; enfant = null; await new Promise(r => { e.once('exit', r); e.kill('SIGKILL'); }); };
  const vivant = await demarrer();
  vrai('le serveur démarre', vivant);
  if (!vivant) { console.log(journal.slice(0, 800)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: JSON.stringify(corps) });
    let j = null; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j: j || {} }; };
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
  vrai('la Tour ouvre une session de patron', PATRON);
  const courriels = () => facteurSrv.recus.length;
  /* L'avis qui vient d'arriver : c'est le DERNIER courriel, il porte la marque de l'avis, et jamais un code. */
  const avisVu = (titre, attendus) => {
    const m = lisible(dernier()), s = sujetDe(dernier());
    vrai(titre + ' — c\'est bien l\'avis, sans aucun code', EST_AVIS.test(m) && !/Code de confirmation/.test(m));
    const manque = attendus.filter(re => !re.test(m + '\n' + s));
    v('   il dit ce qu\'il faut (' + attendus.length + ' mentions)', manque.map(String), []);
  };
  const COMMUN = [/Par : Patron\n/, /Quand : \S+ \d{1,2} \S+ 20\d\d à \d\d:\d\d \(heure de Paris\)/, /Appareil : \S/,
    /Si ce n'est pas toi, quelqu'un se sert de ta session de la Tour/, /bash server\/set-admin\.sh/];

  try {
    /* ══ 4. LA TOUR EN SERVICE (v2.68 et avant) : son chemin ne bouge pas — et l'avis suit le code ══ */
    console.log('\n1. La Tour d\'avant : le premier appel envoie un code et ne supprime RIEN ; après le code, l\'avis');
    let n0 = courriels();
    let r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'jean' }, PATRON);
    v('compte : 1er appel → un code part, rien d\'autre', [r.s, r.j.codeEnvoye, courriels() - n0], [200, true, 1]);
    vrai('   jean est toujours dans l\'annuaire, aucun ordre', dansAnnuaire(A, 'jean') && ordres(A, 'jean') === 0);
    /* ⛔ un MAUVAIS code, sur CHACUNE des quatre routes (`gardien` : retirer la vérification sur deux d'entre
       elles laissait ce banc vert — une Tour d'avant qui envoie n'importe quel code aurait tout supprimé) */
    n0 = courriels();
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'jean', code: mauvais(dernierCode()) }, PATRON);
    v('   ⛔ un mauvais code est refusé, rien supprimé, aucun avis', [r.s, dansAnnuaire(A, 'jean'), ordres(A, 'jean'), courriels() - n0], [400, true, 0, 0]);
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'jean', code: dernierCode() }, PATRON);
    v('   avec le code : suppression ordonnée, et l\'avis est parti', [r.s, r.j.attente, r.j.avis, courriels() - n0], [200, true, { parti: true }, 1]);
    vrai('   jean sort de l\'annuaire, un ordre', !dansAnnuaire(A, 'jean') && ordres(A, 'jean') === 1);
    avisVu('   l\'avis du compte', COMMUN.concat([/Quoi : le compte « jean » de Alpha Nettoyage/, /Confirmée : par le code envoyé par e-mail/,
      /compte « jean » supprimé chez Alpha Nettoyage/]));
    vrai('   ⛔ un compte ne compte pas parmi les entreprises', !/entreprise supprimée en 24 heures/.test(lisible(dernier())));

    n0 = courriels();
    r = await appel('/api/monitor/comptes/supprimer', { t: A, logins: ['neuf1'] }, PATRON);
    v('lot : 1er appel → un code, la liste relue par le serveur', [r.s, r.j.codeEnvoye, r.j.logins, courriels() - n0], [200, true, ['neuf1'], 1]);
    vrai('   neuf1 est toujours là', dansAnnuaire(A, 'neuf1'));
    r = await appel('/api/monitor/comptes/supprimer', { t: A, logins: ['neuf1'], code: mauvais(dernierCode()) }, PATRON);
    v('   ⛔ un mauvais code est refusé, rien supprimé', [r.s, dansAnnuaire(A, 'neuf1'), ordres(A, 'neuf1')], [400, true, 0]);
    r = await appel('/api/monitor/comptes/supprimer', { t: A, logins: ['neuf1'], code: dernierCode() }, PATRON);
    v('   avec le code : 1 compte supprimé, l\'avis parti', [r.s, r.j.n, r.j.avis], [200, 1, { parti: true }]);
    avisVu('   l\'avis du lot (un seul compte : au singulier)', COMMUN.concat([/Quoi : le compte jamais utilisé de Alpha Nettoyage :\n +· neuf1\n +Retiré de l'annuaire/,
      /Confirmée : par le code/, /compte jamais utilisé « neuf1 » supprimé chez Alpha Nettoyage/]));

    n0 = courriels();
    r = await appel('/api/monitor/clients/retirer', { email: 'gamma@exemple-832.fr' }, PATRON);
    v('fermer un client : 1er appel → un code', [r.s, r.j.codeEnvoye, r.j.limite, courriels() - n0], [200, true, undefined, 1]);
    const codeG = dernierCode();
    r = await appel('/api/monitor/clients/retirer', { email: 'gamma@exemple-832.fr', code: codeG === '000000' ? '111111' : '000000' }, PATRON);
    v('   ⛔ un MAUVAIS code est refusé', r.s, 400);
    vrai('   gamma est toujours là', slugs().includes('gamma'));
    r = await appel('/api/monitor/clients/retirer', { email: 'gamma@exemple-832.fr', code: codeG }, PATRON);
    v('   le bon code ferme, l\'avis est parti', [r.s, r.j.supprime, r.j.avis], [200, true, { parti: true }]);
    vrai('   gamma est parti de l\'annuaire', !slugs().includes('gamma'));
    avisVu('   l\'avis de la fermeture', COMMUN.concat([/Quoi : l'entreprise « Gamma Services » \(gamma@exemple-832\.fr\) — fermée définitivement/,
      /son espace est effacé\./, /Confirmée : par le code/, /entreprise « Gamma Services » fermée/,
      /C'est la 1re entreprise supprimée en 24 heures\. À partir de la 4e, la Tour redemande un code par e-mail\./]));
    vrai('   ⛔ les cinq suppressions d\'avant-hier ne comptent pas (1re, pas 6e)', /la 1re entreprise/.test(lisible(dernier())));

    /* ══ 5. LA TOUR v2.69 : confirme:true, une seule fois, et un avis — jamais un code ════════════ */
    console.log('\n2. La Tour v2.69 : la question, la case et « Oui » suffisent ; l\'avis part après');
    n0 = courriels();
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'paul', confirme: true }, PATRON);
    v('compte : supprimé en UN appel, l\'avis parti', [r.s, r.j.attente, r.j.codeEnvoye, r.j.avis], [200, true, undefined, { parti: true }]);
    vrai('   paul sort de l\'annuaire, un ordre', !dansAnnuaire(A, 'paul') && ordres(A, 'paul') === 1);
    avisVu('   l\'avis', COMMUN.concat([/Quoi : le compte « paul » de Alpha Nettoyage/, /Confirmée : dans la Tour, par la question et la case/]));

    r = await appel('/api/monitor/comptes/supprimer', { t: A, logins: ['neuf2', 'neuf3', 'jean2'], confirme: true }, PATRON);
    v('lot : supprimé en UN appel — seulement ceux qui n\'ont jamais servi', [r.s, r.j.n, r.j.logins], [200, 2, ['neuf2', 'neuf3']]);
    v('   ⛔ celui qui a servi est gardé, et la réponse le DIT', (r.j.refuses || []).map(x => [x.login, /déjà servi/.test(x.raison)]), [['jean2', true]]);
    vrai('   neuf2 et neuf3 partent, jean2 reste', !dansAnnuaire(A, 'neuf2') && !dansAnnuaire(A, 'neuf3') && dansAnnuaire(A, 'jean2'));
    avisVu('   l\'avis du lot nomme les deux', COMMUN.concat([/Quoi : 2 comptes jamais utilisés de Alpha Nettoyage :\n +· neuf2\n +· neuf3\n +Retirés de l'annuaire/,
      /2 comptes jamais utilisés supprimés chez Alpha Nettoyage/]));
    vrai('   ⛔ jean2, gardé, n\'est pas dans l\'avis', !/jean2/.test(lisible(dernier())));

    r = await appel('/api/monitor/clients/retirer', { email: 'beta@exemple-832.fr', confirme: true }, PATRON);
    v('fermer un client : fermé en UN appel (2e entreprise)', [r.s, r.j.supprime, r.j.avis], [200, true, { parti: true }]);
    await dormir(600);   // clients.json s'écrit 400 ms plus tard (cliSave)
    vrai('   beta sort de l\'annuaire, fermée, et de la liste des clients',
      !slugs().includes('beta') && fermes().emails.includes('beta@exemple-832.fr') && fermes().espaces.includes('t-beta-832') && !(lire('clients.json') || {})['beta@exemple-832.fr']);
    avisVu('   l\'avis', COMMUN.concat([/entreprise « Beta Hygiène » fermée/, /Confirmée : dans la Tour/, /C'est la 2e entreprise supprimée en 24 heures/]));

    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-delta-832', confirme: true }, PATRON);
    v('supprimer partout : supprimée en UN appel (3e entreprise)', [r.s, r.j.supprime, r.j.t, r.j.limite, r.j.avis], [200, true, 't-delta-832', undefined, { parti: true }]);
    vrai('   delta est partie, fermée, son annuaire aussi', !slugs().includes('delta') && fermes().espaces.includes('t-delta-832') && !(lire('comptes.json') || {})['t-delta-832']);
    avisVu('   l\'avis', COMMUN.concat([/Quoi : l'espace « Delta Propreté » \(t-delta-832\) — supprimé partout/, /« Delta Propreté » supprimée partout/,
      /Confirmée : dans la Tour/, /C'est la 3e entreprise supprimée en 24 heures\. À partir de la 4e, la Tour redemande un code/]));
    v('⛔ les quatre suppressions confirmées : quatre avis, AUCUN code', [courriels() - n0, facteurSrv.recus.slice(n0).map(lisible).filter(m => EST_AVIS.test(m) && !/Code de confirmation/.test(m)).length], [4, 4]);
    /* Le journal de la Tour dit le CHEMIN (`gardien`) : après une session volée, c'est ce qui distingue une
       suppression confirmée d'une suppression par code — sans adresse ni identifiant dans le motif. */
    let jr = await fetch(B + '/api/monitor/journal', { headers: { Authorization: 'Bearer ' + PATRON } }).then(x => x.json()).catch(() => ({}));
    let motifs = (jr.journal || []).map(x => x.motif || '');
    const compte = re => motifs.filter(m => re.test(m)).length;
    v('le journal de la Tour dit le chemin de chaque suppression (3 par code, 4 confirmées)', [compte(/· par code$/), compte(/· confirmée$/)], [3, 4]);
    vrai('   sans adresse ni identifiant dans le motif', motifs.every(m => !/@|t-[a-z]+-832|jean|paul|neuf/.test(m)));

    /* ══ 6. LA LIMITE : la 4e entreprise en 24 heures redemande le code ═══════════════════════════ */
    console.log('\n3. Au-delà de trois entreprises en 24 heures, le code revient');
    n0 = courriels();
    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-epsilon-832', confirme: true }, PATRON);
    v('supprimer partout, 4e entreprise, CONFIRMÉE : un code part, la réponse dit pourquoi', [r.s, r.j.codeEnvoye, r.j.limite, !!r.j.apercu, courriels() - n0], [200, true, true, true, 1]);
    vrai('   ⛔ epsilon est toujours là, pas fermée', slugs().includes('epsilon') && !fermes().espaces.includes('t-epsilon-832'));
    vrai('   le courriel dit pourquoi un code, et quoi faire si ce n\'est pas toi',
      /Pourquoi un code : 3 entreprises ont déjà été supprimées ces dernières 24 heures/.test(lisible(dernier())) && /ne donne ce code à personne/.test(lisible(dernier())));
    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-epsilon-832', code: mauvais(dernierCode()) }, PATRON);
    v('   ⛔ un mauvais code est refusé, rien supprimé', [r.s, slugs().includes('epsilon'), fermes().espaces.includes('t-epsilon-832')], [400, true, false]);
    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-epsilon-832', confirme: true, code: mauvais(dernierCode()) }, PATRON);
    v('   ⛔ ni avec `confirme` en plus : le code est vérifié', [r.s, slugs().includes('epsilon')], [400, true]);
    n0 = courriels();
    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-epsilon-832', code: dernierCode() }, PATRON);
    v('   avec le bon code : supprimée, l\'avis parti', [r.s, r.j.supprime, r.j.avis, courriels() - n0], [200, true, { parti: true }, 1]);
    vrai('   epsilon est partie, et fermée', !slugs().includes('epsilon') && fermes().espaces.includes('t-epsilon-832'));
    avisVu('   l\'avis', COMMUN.concat([/« Epsilon Désinfection » supprimée partout/, /Confirmée : par le code/,
      /C'est la 4e entreprise supprimée en 24 heures\. Au-delà de 3, le code par e-mail a été demandé\./]));

    n0 = courriels();
    r = await appel('/api/monitor/clients/retirer', { email: 'eta@exemple-832.fr', confirme: true }, PATRON);
    v('fermer un client, 5e entreprise, CONFIRMÉE : le code aussi', [r.s, r.j.codeEnvoye, r.j.limite, courriels() - n0], [200, true, true, 1]);
    vrai('   ⛔ eta n\'est pas fermée', slugs().includes('eta') && !fermes().emails.includes('eta@exemple-832.fr'));
    vrai('   le courriel dit pourquoi', /Pourquoi un code : 3 entreprises/.test(lisible(dernier())));
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'luc', confirme: true }, PATRON);
    v('⛔ les comptes ne comptent pas : un compte se supprime encore en UN appel', [r.s, r.j.attente, r.j.codeEnvoye, r.j.limite], [200, true, undefined, undefined]);
    const surDisque = lire('tour-suppressions.json') || [];
    v('le compteur sur disque : quatre dates, toutes de moins de 24 heures (celles d\'avant-hier balayées)',
      [surDisque.length, surDisque.every(x => typeof x === 'number' && Date.now() - x < 3600000)], [4, true]);
    jr = await fetch(B + '/api/monitor/journal', { headers: { Authorization: 'Bearer ' + PATRON } }).then(x => x.json()).catch(() => ({}));
    motifs = (jr.journal || []).map(x => x.motif || '');
    v('   le journal : la 4e est passée PAR CODE', compte(/suppression totale d'un espace · par code$/), 1);

    /* ══ 7. CE QUE `confirme` N'OUVRE PAS ═════════════════════════════════════════════════════════ */
    console.log('\n4. Ce que la confirmation n\'ouvre pas');
    for (const [nom, val] of [['la chaîne « true »', 'true'], ['le nombre 1', 1], ['un objet', { oui: true }]]) {
      n0 = courriels();
      r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'marc', confirme: val }, PATRON);
      v('⛔ confirme = ' + nom + ' → le chemin du code, rien de supprimé', [r.s, r.j.codeEnvoye, dansAnnuaire(A, 'marc'), courriels() - n0], [200, true, true, 1]);
    }
    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-zeta-832', confirme: 'true' }, PATRON);
    v('⛔ même chose pour « supprimer partout » (et ce n\'est pas la limite qui parle)', [r.s, r.j.codeEnvoye, r.j.limite, slugs().includes('zeta')], [200, true, undefined, true]);

    const sans = [['compte/supprimer', { t: A, login: 'nora' }], ['comptes/supprimer', { t: A, logins: ['neuf4'] }],
      ['clients/retirer', { email: 'eta@exemple-832.fr' }], ['entreprise/supprimer', { t: 't-zeta-832' }]];
    for (const [route, corps] of sans) {
      const x = await appel('/api/monitor/' + route, Object.assign({ confirme: true }, corps));
      const y = await appel('/api/monitor/' + route, Object.assign({ confirme: true }, corps), 'f'.repeat(48));
      v('⛔ ' + route + ' : sans session de patron → 403, même confirmé', [x.s, y.s], [403, 403]);
    }
    vrai('   nora, neuf4, eta et zeta sont toujours là', dansAnnuaire(A, 'nora') && dansAnnuaire(A, 'neuf4') && slugs().includes('eta') && slugs().includes('zeta'));

    r = await appel('/api/monitor/entreprise/supprimer', { t: 'opgestion-beta', confirme: true }, PATRON);
    v('⛔ un espace intouchable le reste (403)', r.s, 403);
    r = await appel('/api/monitor/comptes/supprimer', { t: 't-sature-832', logins: ['x2'], confirme: true }, PATRON);
    v('⛔ journal saturé : le lot est refusé (409), « jamais connecté » n\'y prouve rien', [r.s, dansAnnuaire('t-sature-832', 'x2')], [409, true]);
    r = await appel('/api/monitor/comptes/supprimer', { t: A, logins: ['nora', 'ines'], confirme: true }, PATRON);
    v('⛔ un lot qui n\'a que des comptes qui ont servi : refusé (409)', [r.s, dansAnnuaire(A, 'nora'), dansAnnuaire(A, 'ines')], [409, true, true]);
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'personne-832', confirme: true }, PATRON);
    v('⛔ un compte inconnu : 404', r.s, 404);

    /* Un code demandé AVANT (par la Tour d'avant), puis la même suppression confirmée : le code en
       attente ne sert plus — sinon il ordonnerait une seconde fois, dix minutes durant. */
    n0 = courriels();
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'ines' }, PATRON);
    const codeInes = dernierCode();
    vrai('ines : un code demandé (Tour d\'avant), rien de supprimé', r.j.codeEnvoye && courriels() - n0 === 1 && dansAnnuaire(A, 'ines') && ordres(A, 'ines') === 0);
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'ines', confirme: true }, PATRON);
    v('   puis supprimée par confirmation : un ordre', [r.s, r.j.attente, ordres(A, 'ines')], [200, true, 1]);
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'ines', code: codeInes }, PATRON);
    v('⛔ le code demandé avant est périmé : pas de second ordre', [r.s, ordres(A, 'ines')], [400, 1]);

    /* ══ 8. L'AVIS QUI NE PART PAS SE DIT — et la suppression, elle, est faite ══════════════════════ */
    console.log('\n5. Un avis qui ne part pas : la réponse le dit');
    facteurSrv.mode = 'refuse';
    n0 = courriels();
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'olga', confirme: true }, PATRON);
    v('le serveur d\'e-mails refuse : la suppression est faite, et la réponse DIT que l\'avis n\'est pas parti',
      [r.s, r.j.attente, r.j.avis && r.j.avis.parti, /550|refus/i.test((r.j.avis && r.j.avis.motif) || ''), courriels() - n0], [200, true, false, true, 0]);
    vrai('   olga est bien supprimée', !dansAnnuaire(A, 'olga') && ordres(A, 'olga') === 1);
    facteurSrv.mode = 'muet';
    const t0 = Date.now();
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'remi', confirme: true }, PATRON);
    const duree = Date.now() - t0;
    v('le serveur d\'e-mails se tait : la réponse arrive quand même, en 8 s et des poussières — pas en deux minutes',
      [r.s, r.j.attente, r.j.avis && r.j.avis.parti, duree >= 7500 && duree < 12000], [200, true, false, true]);
    vrai('   et elle dit pourquoi (' + ((r.j.avis && r.j.avis.motif) || '—') + ')', /8 s/.test((r.j.avis && r.j.avis.motif) || ''));
    vrai('   remi est bien supprimé', !dansAnnuaire(A, 'remi') && ordres(A, 'remi') === 1);
    facteurSrv.mode = 'normal';
    /* Le journal des e-mails garde la TRACE de l'avis, jamais son contenu : il se relit à plusieurs. */
    const mj = await fetch(B + '/api/monitor/mails', { headers: { Authorization: 'Bearer ' + PATRON } }).then(x => x.json()).catch(() => ({}));
    const avisJ = (mj.mails || []).filter(m => /^avis de suppression · /.test(m.txt || ''));
    vrai('le journal des e-mails a gardé la trace des avis (' + avisJ.length + ')', avisJ.length >= 10);
    vrai('   ⛔ sans objet, sans nom d\'entreprise, sans identifiant ni adresse',
      avisJ.every(m => m.sujet === '(objet confidentiel)' && !/@|t-[a-z]+-832|Alpha|Gamma|Beta|Delta|Epsilon|jean|paul|neuf|olga|remi/.test(m.txt)));

    /* ══ 9. LE COMPTEUR SURVIT À UN REDÉMARRAGE — et illisible, il reste FERMÉ ═══════════════════════ */
    console.log('\n6. Le compteur : un redémarrage ne le remet pas à zéro ; illisible, il reste fermé');
    await arreter();
    vrai('le serveur redémarre sur les mêmes données', await demarrer());
    n0 = courriels();
    r = await appel('/api/monitor/clients/retirer', { email: 'eta@exemple-832.fr', confirme: true }, PATRON);
    v('après redémarrage, la limite tient : un code, pas de fermeture', [r.s, r.j.codeEnvoye, r.j.limite, slugs().includes('eta'), courriels() - n0], [200, true, true, true, 1]);

    await arreter();
    fs.writeFileSync(COMPTEUR, '[1, 2, ');   // une écriture interrompue
    vrai('le serveur redémarre sur un compteur illisible', await demarrer());
    vrai('   et il le dit dans son journal', /tour-suppressions\.json illisible/.test(journal));
    r = await appel('/api/monitor/clients/retirer', { email: 'eta@exemple-832.fr', confirme: true }, PATRON);
    v('⛔ illisible, le compteur ne s\'ouvre pas : le code est demandé', [r.s, r.j.codeEnvoye, r.j.limite, slugs().includes('eta')], [200, true, true, true]);
    r = await appel('/api/monitor/clients/retirer', { email: 'eta@exemple-832.fr', code: dernierCode() }, PATRON);
    v('   avec le code, la fermeture passe', [r.s, r.j.supprime, r.j.avis], [200, true, { parti: true }]);
    v('   et le compteur est réécrit, lisible (une date)', (lire('tour-suppressions.json') || []).length, 1);
    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-zeta-832', confirme: true }, PATRON);
    v('   la suppression confirmée suivante repasse en UN appel (2e sur ce compteur)', [r.s, r.j.supprime, r.j.limite], [200, true, undefined]);

    /* ══ 10. SANS E-MAIL CONFIGURÉ, RIEN NE SE SUPPRIME ════════════════════════════════════════════ */
    console.log('\n7. Sans e-mail configuré, rien ne se supprime');
    await arreter();
    vrai('le serveur redémarre sans e-mail', await demarrer('config-sans-mail.json'));
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'yves', confirme: true }, PATRON);
    v('⛔ compte confirmé : 503, et yves est toujours là', [r.s, /avis/.test(r.j.error || ''), dansAnnuaire(A, 'yves'), ordres(A, 'yves')], [503, true, true, 0]);
    r = await appel('/api/monitor/comptes/supprimer', { t: A, logins: ['neuf4'], confirme: true }, PATRON);
    v('⛔ lot confirmé : 503, neuf4 est toujours là', [r.s, dansAnnuaire(A, 'neuf4')], [503, true]);
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'yves' }, PATRON);
    v('⛔ et le chemin du code non plus (503, comme avant)', [r.s, dansAnnuaire(A, 'yves')], [503, true]);

    v('⛔ du début à la fin, rien n\'est parti ailleurs qu\'au Google de banc (127.0.0.1)', G.requetes.every(q => !/googleapis|google\.com/.test(q)), true);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  if (ko) console.log('\n── journal du serveur (fin) ──\n' + journal.slice(-1500));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})();
