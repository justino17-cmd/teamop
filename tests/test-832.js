/* ⛔ CE QUE CE FICHIER GARDE — SUPPRIMER DEPUIS LA TOUR SANS CODE PAR E-MAIL (Tour v2.69).

   Justin, 27 septembre 2026, à la question « supprimer un compte, un lot de comptes, un client ou
   une entreprise demande encore un code par e-mail — on passe à question, case à cocher et Oui,
   comme dans OP GESTION ? » : « Fait les 4 ». Deux moitiés, et c'est leur COUTURE qu'on garde :
     · le serveur (`SUPPRIMER SANS CODE`, server/index.js) accepte `confirme: true` — un booléen
       strict — à la place du code, sur les quatre routes ;
     · la Tour (`supprAppel`, tour.html) l'envoie, et lit `codeEnvoye` AVANT de croire à une
       réussite : face au serveur d'avant, la route répond `ok:true` avec un code parti.
   Et ce qui ne doit PAS bouger : la Tour en service (v2.68 et avant) n'envoie pas `confirme` — son
   premier appel doit toujours envoyer un code et ne RIEN supprimer, sinon elle détruirait sans la
   question qu'elle pose avant.

   ⛔ LE VRAI SERVEUR, isolé sur 127.0.0.1 : un facteur SMTP de banc compte les courriels, un Google
   de banc répond à tout ce que les suppressions appellent (jeton anonyme, effacement Firestore) —
   rien ne sort d'ici. Ce fichier ne lit AUCUNE page : il part avec le déploiement du serveur seul
   (`scripts/bancs-serveur.liste`). L'autre moitié — les vraies fonctions de la Tour contre ce
   serveur, et contre un serveur d'avant — est `test-833`, qui lit `tour.html`. */
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
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

/* Le facteur du banc (le même que `test-813`) : ce que le serveur envoie, on le lit. */
function facteur() {
  const recus = [];
  const s = require('net').createServer(c => {
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += l + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
    c.on('error', () => {});
  });
  return { s, recus };
}
const lisible = (m) => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
const dernierCode = () => { const l = facteurSrv.recus.map(lisible); for (let i = l.length - 1; i >= 0; i--) { const m = /Code de confirmation : (\d{6})/.exec(l[i]); if (m) return m[1]; } return ''; };

console.log('\n── 832 · supprimer depuis la Tour : question, case, « Oui » — le code n\'est plus demandé ──');
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

  /* ══ 2. LES DONNÉES : sept entreprises fictives, leurs annuaires, leurs connexions ═══════════ */
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const hx = n => crypto.randomBytes(n).toString('hex');
  const code64 = (t) => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  const ESP = { alpha: ['t-alpha-832', 'Alpha Nettoyage', ''], sature: ['t-sature-832', 'Saturée Hygiène', ''],
    beta: ['t-beta-832', 'Beta Hygiène', 'beta@exemple-832.fr'], gamma: ['t-gamma-832', 'Gamma Services', 'gamma@exemple-832.fr'],
    delta: ['t-delta-832', 'Delta Propreté', ''], epsilon: ['t-epsilon-832', 'Epsilon Désinfection', ''], zeta: ['t-zeta-832', 'Zeta Vapeur', ''] };
  const espaces = {};
  for (const [slug, [t, nom, email]] of Object.entries(ESP)) espaces[slug] = Object.assign({ t, nom, code: code64(t), ts: Date.now() }, email ? { email } : {});
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces));
  const entree = (n) => ({ s: hx(16), e: hx(32), n });
  const A = 't-alpha-832';
  const LOGINS = ['jean', 'paul', 'marc', 'luc', 'nora', 'ines', 'neuf1', 'neuf2', 'neuf3', 'neuf4', 'jean2'];
  const comptes = { [A]: { c: {}, maj: Date.now() }, 't-sature-832': { c: { x1: entree('X Un'), x2: entree('X Deux') }, maj: Date.now() },
    't-delta-832': { c: { d1: entree('D Un') }, maj: Date.now() }, 't-epsilon-832': { c: { e1: entree('E Un') }, maj: Date.now() } };
  for (const l of LOGINS) comptes[A].c[l] = entree('Nom ' + l);
  fs.writeFileSync(path.join(D, 'comptes.json'), JSON.stringify(comptes));
  /* « a servi » = une connexion réussie à son nom ; les neufN ne se sont jamais connectés */
  const ev = (login, n) => ({ ts: Date.now() - n * 60000, ev: 'connexion', login, nom: '', role: 'technicien', version: '758', app: 'gestion' });
  const cnx = { [A]: ['jean', 'paul', 'marc', 'luc', 'nora', 'ines', 'jean2'].map((l, n) => ev(l, n)),
    't-sature-832': Array.from({ length: 500 }, (_, n) => ev('x1', n)) };
  fs.writeFileSync(path.join(D, 'connexions.json'), JSON.stringify(cnx));
  fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify({
    'beta@exemple-832.fr': { email: 'beta@exemple-832.fr', entreprise: 'Beta Hygiène', inscrit: Date.now() - 86400000 },
    'gamma@exemple-832.fr': { email: 'gamma@exemple-832.fr', entreprise: 'Gamma Services', inscrit: Date.now() - 86400000 } }));
  const lire = (f) => { try { return JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (e) { return null; } };
  const dansAnnuaire = (t, l) => !!((lire('comptes.json') || {})[t] || { c: {} }).c[l];
  const ordres = (t, l) => (((lire('ordres.json') || {})[t]) || []).filter(o => o.login === l && o.type !== 'mdp').length;
  const slugs = () => Object.keys(lire('espaces.json') || {});
  const fermes = () => lire('entreprises-fermees.json') || { emails: [], espaces: [] };

  /* ══ 3. LE VRAI SERVEUR, ISOLÉ ════════════════════════════════════════════════════════════ */
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const vap = webpush.generateVAPIDKeys();
  const MDP = 'mot-de-passe-du-banc-832';
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey,
    apiKey: 'banc', adminPassHash: kh(MDP), notifDemandes: 'patron@banc-832.fr',
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' } }));
  const PORT = 9300 + (process.pid % 300);
  let journal = '';
  enfant = spawn(process.execPath, [SERVEUR], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
      TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: GURL + '/token', TEAMOP_FIRESTORE_URL: GURL,
      TEAMOP_IDTK_URL: GURL + '/idtk', TEAMOP_FB_CERTS_URL: GURL + '/certs' }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le serveur démarre', vivant);
  if (!vivant) { console.log(journal.slice(0, 800)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: JSON.stringify(corps) });
    let j = null; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j: j || {} }; };
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
  vrai('la Tour ouvre une session de patron', PATRON);
  const courriels = () => facteurSrv.recus.length;

  try {
    /* ══ 4. LA TOUR EN SERVICE (v2.68 et avant) : son chemin ne bouge pas ═══════════════════════ */
    console.log('\n1. La Tour d\'avant : le premier appel envoie un code et ne supprime RIEN');
    let n0 = courriels();
    let r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'jean' }, PATRON);
    v('compte : 1er appel → un code part, rien d\'autre', [r.s, r.j.codeEnvoye, courriels() - n0], [200, true, 1]);
    vrai('   jean est toujours dans l\'annuaire, aucun ordre', dansAnnuaire(A, 'jean') && ordres(A, 'jean') === 0);
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'jean', code: dernierCode() }, PATRON);
    v('   avec le code : suppression ordonnée', [r.s, r.j.attente], [200, true]);
    vrai('   jean sort de l\'annuaire, un ordre', !dansAnnuaire(A, 'jean') && ordres(A, 'jean') === 1);

    n0 = courriels();
    r = await appel('/api/monitor/comptes/supprimer', { t: A, logins: ['neuf1'] }, PATRON);
    v('lot : 1er appel → un code, la liste relue par le serveur', [r.s, r.j.codeEnvoye, r.j.logins, courriels() - n0], [200, true, ['neuf1'], 1]);
    vrai('   neuf1 est toujours là', dansAnnuaire(A, 'neuf1'));
    r = await appel('/api/monitor/comptes/supprimer', { t: A, logins: ['neuf1'], code: dernierCode() }, PATRON);
    v('   avec le code : 1 compte supprimé', [r.s, r.j.n], [200, 1]);

    n0 = courriels();
    r = await appel('/api/monitor/clients/retirer', { email: 'gamma@exemple-832.fr' }, PATRON);
    v('fermer un client : 1er appel → un code', [r.s, r.j.codeEnvoye, courriels() - n0], [200, true, 1]);
    const codeG = dernierCode();
    r = await appel('/api/monitor/clients/retirer', { email: 'gamma@exemple-832.fr', code: codeG === '000000' ? '111111' : '000000' }, PATRON);
    v('   ⛔ un MAUVAIS code est refusé', r.s, 400);
    vrai('   gamma est toujours là', slugs().includes('gamma'));
    r = await appel('/api/monitor/clients/retirer', { email: 'gamma@exemple-832.fr', code: codeG }, PATRON);
    v('   le bon code ferme', [r.s, r.j.supprime], [200, true]);
    vrai('   gamma est parti de l\'annuaire', !slugs().includes('gamma'));

    n0 = courriels();
    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-epsilon-832' }, PATRON);
    v('supprimer partout : 1er appel → un code, un aperçu', [r.s, r.j.codeEnvoye, !!r.j.apercu, courriels() - n0], [200, true, true, 1]);
    vrai('   epsilon est toujours là', slugs().includes('epsilon'));
    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-epsilon-832', code: dernierCode() }, PATRON);
    v('   avec le code : supprimée', [r.s, r.j.supprime], [200, true]);
    vrai('   epsilon est partie, et fermée', !slugs().includes('epsilon') && fermes().espaces.includes('t-epsilon-832'));

    /* ══ 5. LA TOUR v2.69 : confirme:true, une seule fois, et aucun courriel ══════════════════════ */
    console.log('\n2. La Tour v2.69 : la question, la case et « Oui » suffisent');
    n0 = courriels();
    r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'paul', confirme: true }, PATRON);
    v('compte : supprimé en UN appel', [r.s, r.j.attente, r.j.codeEnvoye], [200, true, undefined]);
    vrai('   paul sort de l\'annuaire, un ordre', !dansAnnuaire(A, 'paul') && ordres(A, 'paul') === 1);

    r = await appel('/api/monitor/comptes/supprimer', { t: A, logins: ['neuf2', 'neuf3', 'jean2'], confirme: true }, PATRON);
    v('lot : supprimé en UN appel — seulement ceux qui n\'ont jamais servi', [r.s, r.j.n, r.j.logins], [200, 2, ['neuf2', 'neuf3']]);
    v('   ⛔ celui qui a servi est gardé, et la réponse le DIT', (r.j.refuses || []).map(x => [x.login, /déjà servi/.test(x.raison)]), [['jean2', true]]);
    vrai('   neuf2 et neuf3 partent, jean2 reste', !dansAnnuaire(A, 'neuf2') && !dansAnnuaire(A, 'neuf3') && dansAnnuaire(A, 'jean2'));

    r = await appel('/api/monitor/clients/retirer', { email: 'beta@exemple-832.fr', confirme: true }, PATRON);
    v('fermer un client : fermé en UN appel', [r.s, r.j.supprime], [200, true]);
    await dormir(600);   // clients.json s'écrit 400 ms plus tard (cliSave)
    vrai('   beta sort de l\'annuaire, fermée, et de la liste des clients',
      !slugs().includes('beta') && fermes().emails.includes('beta@exemple-832.fr') && fermes().espaces.includes('t-beta-832') && !(lire('clients.json') || {})['beta@exemple-832.fr']);

    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-delta-832', confirme: true }, PATRON);
    v('supprimer partout : supprimée en UN appel', [r.s, r.j.supprime, r.j.t], [200, true, 't-delta-832']);
    vrai('   delta est partie, fermée, son annuaire aussi', !slugs().includes('delta') && fermes().espaces.includes('t-delta-832') && !(lire('comptes.json') || {})['t-delta-832']);
    v('⛔ les quatre suppressions confirmées n\'ont envoyé AUCUN courriel', courriels() - n0, 0);

    /* ══ 6. CE QUE `confirme` N'OUVRE PAS ═════════════════════════════════════════════════════════ */
    console.log('\n3. Ce que la confirmation n\'ouvre pas');
    for (const [nom, val] of [['la chaîne « true »', 'true'], ['le nombre 1', 1], ['un objet', { oui: true }]]) {
      n0 = courriels();
      r = await appel('/api/monitor/compte/supprimer', { t: A, login: 'marc', confirme: val }, PATRON);
      v('⛔ confirme = ' + nom + ' → le chemin du code, rien de supprimé', [r.s, r.j.codeEnvoye, dansAnnuaire(A, 'marc'), courriels() - n0], [200, true, true, 1]);
    }
    r = await appel('/api/monitor/entreprise/supprimer', { t: 't-zeta-832', confirme: 'true' }, PATRON);
    v('⛔ même chose pour « supprimer partout »', [r.s, r.j.codeEnvoye, slugs().includes('zeta')], [200, true, true]);

    const sans = [['compte/supprimer', { t: A, login: 'nora' }], ['comptes/supprimer', { t: A, logins: ['neuf4'] }],
      ['clients/retirer', { email: 'beta@exemple-832.fr' }], ['entreprise/supprimer', { t: 't-zeta-832' }]];
    for (const [route, corps] of sans) {
      const x = await appel('/api/monitor/' + route, Object.assign({ confirme: true }, corps));
      const y = await appel('/api/monitor/' + route, Object.assign({ confirme: true }, corps), 'f'.repeat(48));
      v('⛔ ' + route + ' : sans session de patron → 403, même confirmé', [x.s, y.s], [403, 403]);
    }
    vrai('   nora, neuf4 et zeta sont toujours là', dansAnnuaire(A, 'nora') && dansAnnuaire(A, 'neuf4') && slugs().includes('zeta'));

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

    v('⛔ du début à la fin, rien n\'est parti ailleurs qu\'au Google de banc (127.0.0.1)', G.requetes.every(q => !/googleapis|google\.com/.test(q)), true);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  if (ko) console.log('\n── journal du serveur (fin) ──\n' + journal.slice(-1500));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})();
