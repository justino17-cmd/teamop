/* ⛔ CE QUE CE FICHIER GARDE — LA TOUR v2.69 QUI SUPPRIME SANS CODE, CONTRE LE VRAI SERVEUR.
   La moitié SERVEUR (les deux chemins, ce que `confirme` n'ouvre pas) est gardée par `test-832`,
   qui part avec le déploiement du serveur ; celle-ci lit `tour.html` et reste sur la branche tant
   que la Tour en service n'est pas remplacée (sur `main`, `tour.html` est encore la v2.66).
   ─────────────────────────────────────────────────────────────────────────────────────────────

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

   Et les deux protections qui doublent la case (Justin : « Oui rajoute ça ») doivent se DIRE dans la
   Tour : au-delà de trois entreprises en 24 heures, le code revient et la question dit pourquoi
   (`limite`) — pas « serveur pas à jour » ; et l'e-mail d'avis qui suit chaque suppression, s'il n'est
   pas parti, se dit dans le verdict (`supprToast`).

   ⛔ LE VRAI SERVEUR (isolé, 127.0.0.1), LES VRAIES FONCTIONS DE LA TOUR. Un facteur SMTP de banc
   compte les courriels, un Google de banc répond à tout ce que les suppressions appellent (jeton
   anonyme, effacement Firestore) — rien ne sort d'ici. Un « serveur d'avant » est simulé par un
   relais qui RETIRE `confirme` du corps : c'est exactement ce que fait un serveur qui l'ignore. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRC_TOUR = fs.readFileSync(process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(RACINE, 'tour.html'), 'utf8');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b833-'));
let enfant = null, faux = null, facteurSrv = null, relais = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (faux) faux.close(); } catch (e) {}
  try { if (relais) relais.close(); } catch (e) {} try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {}
  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

/* ── Les fonctions de la Tour, ancrées sur leur DÉCLARATION (le fichier est très commenté) ── */
const CODE = SRC_TOUR.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function fonction(nom) {
  const m = new RegExp('\\nfunction ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) {
    const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === '/' && CODE[k + 1] === '*') { k = CODE.indexOf('*/', k) + 1; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return CODE.slice(m.index + 1, k + 1);
}
/* Un bac à sable par scénario : `API` vise le serveur voulu (le vrai, ou le relais « d'avant »),
   `prompt` est ce que le patron taperait — et on compte ce qu'on lui a demandé. */
function tour(API, TOKEN, repondre) {
  const noms = ['hAuth', 'apiPost', 'supprReussi', 'supprAppel', 'supprAvisMot', 'supprToast'];
  const src = noms.map(fonction);
  if (src.some(x => !x)) return null;
  const demandes = [], toasts = [];
  const ctx = { fetch, API, TOKEN, Object, String, JSON, Promise, Math,
    prompt: (q) => { demandes.push(q); return repondre ? repondre(q) : null; },
    toast: (t, ms) => { toasts.push([t, ms || 0]); } };
  vm.createContext(ctx);
  vm.runInContext('var API=' + JSON.stringify(API) + ', TOKEN=' + JSON.stringify(TOKEN) + ';\n' + src.join('\n'), ctx);
  return { ctx, demandes, toasts };
}

/* Le facteur du banc (le même que `test-813`) : ce que le serveur envoie, on le lit. Humeur `refuse` :
   un 550 à l'expéditeur, comme un serveur d'e-mails qui dit non — l'avis ne part pas. */
function facteur() {
  const recus = [];
  const f = { recus, mode: 'normal' };
  const s = require('net').createServer(c => {
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }   // le point doublé (RFC 5321 §4.5.2)
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('MAIL FROM') && f.mode === 'refuse') c.write('550 refusé par le facteur du banc\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
    c.on('error', () => {});
  });
  f.s = s;
  return f;
}
const lisible = (m) => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
const dernierCode = () => { const l = facteurSrv.recus.map(lisible); for (let i = l.length - 1; i >= 0; i--) { const m = /Code de confirmation : (\d{6})/.exec(l[i]); if (m) return m[1]; } return ''; };

console.log('\n── 833 · la Tour v2.69 supprime sans code : ses vraies fonctions contre le vrai serveur ──');
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
  /* Trois entreprises déjà supprimées ce matin : la prochaine, même confirmée, bute sur la limite. */
  fs.writeFileSync(path.join(D, 'tour-suppressions.json'), JSON.stringify([3, 2, 1].map(h => Date.now() - h * 3600000)));
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

  /* Le « serveur d'avant » : un relais qui retire `confirme` du corps, puis passe au vrai. */
  relais = http.createServer((q, r) => {
    let c = ''; q.on('data', d => { c += d; }); q.on('end', async () => {
      let corps = c; try { const o = JSON.parse(c || '{}'); delete o.confirme; corps = JSON.stringify(o); } catch (e) {}
      const h = { 'Content-Type': 'application/json' }; if (q.headers.authorization) h.Authorization = q.headers.authorization;
      const x = await fetch(B + q.url, { method: q.method, headers: h, body: q.method === 'POST' ? corps : undefined });
      r.writeHead(x.status, { 'Content-Type': 'application/json' }); r.end(await x.text());
    });
  });
  await new Promise(res => relais.listen(0, '127.0.0.1', res));
  const VIEUX = 'http://127.0.0.1:' + relais.address().port;

  try {
    /* ══ 7. LES VRAIES FONCTIONS DE LA TOUR, CONTRE CE SERVEUR ═════════════════════════════════════ */
    console.log('\n1. La Tour v2.69 contre le serveur — les vraies fonctions (supprAppel, supprReussi)');
    let T = tour(B, PATRON);
    vrai('⛔ les fonctions de la page s\'extraient (hAuth, apiPost, supprReussi, supprAppel)', T && typeof T.ctx.supprAppel === 'function');
    if (!T) throw new Error('extraction impossible');
    n0 = courriels();
    let x = await T.ctx.supprAppel('/api/monitor/compte/supprimer', { t: A, login: 'luc' });
    v('supprimer « luc » : réussi en un appel, sans rien demander au patron — un seul e-mail, l\'avis (pas un code)',
      [T.ctx.supprReussi(x), T.demandes.length, courriels() - n0, /Une suppression vient d'être faite/.test(lisible(facteurSrv.recus[n0])), /Code de confirmation/.test(lisible(facteurSrv.recus[n0]))], [true, 0, 1, true, false]);
    vrai('   luc sort de l\'annuaire', !dansAnnuaire(A, 'luc'));
    v('⛔ une réponse « code envoyé » n\'est PAS une réussite', T.ctx.supprReussi({ ok: true, status: 200, d: { ok: true, codeEnvoye: true, dest: 'p***@x' } }), false);
    /* …quoi qu'elle porte d'autre : un code parti veut dire « premier temps », rien n'est encore fait.
       (Sans ce cas, retirer `!r.d.codeEnvoye` ne changeait rien — neutralisé par le contrôle voisin.) */
    v('⛔ …même si elle porte aussi une marque de réussite', T.ctx.supprReussi({ ok: true, status: 200, d: { ok: true, codeEnvoye: true, attente: true } }), false);
    v('⛔ « ok » tout seul non plus (il faut ce que la route a FAIT)', T.ctx.supprReussi({ ok: true, status: 200, d: { ok: true } }), false);
    v('   un refus non plus', T.ctx.supprReussi({ ok: false, status: 409, d: { error: 'x' } }), false);

    console.log('\n2. La Tour v2.69 face au serveur d\'AVANT (qui ignore `confirme`)');
    T = tour(VIEUX, PATRON, () => dernierCode());
    n0 = courriels();
    x = await T.ctx.supprAppel('/api/monitor/compte/supprimer', { t: A, login: 'nora' });
    /* Deux e-mails : le code, puis l'avis — le relais retire `confirme`, mais derrière lui c'est le serveur neuf. */
    v('elle voit le code parti et le DEMANDE, puis la suppression passe', [T.demandes.length, courriels() - n0, T.ctx.supprReussi(x)], [1, 2, true]);
    vrai('   la question nomme la boîte où le code est parti', /p.*@.*banc-832|\*/.test(T.demandes[0] || ''));
    vrai('   et dit que le serveur n\'est pas à jour — pas une limite', /n’est pas encore à jour/.test(T.demandes[0] || '') && !/Trois entreprises/.test(T.demandes[0] || ''));
    vrai('   nora sort de l\'annuaire', !dansAnnuaire(A, 'nora'));
    T = tour(VIEUX, PATRON, () => null);
    x = await T.ctx.supprAppel('/api/monitor/entreprise/supprimer', { t: 't-zeta-832' });
    v('⛔ code non saisi : pas de réussite annoncée, rien de supprimé', [T.demandes.length, x.annule, T.ctx.supprReussi(x), slugs().includes('zeta')], [1, true, false, true]);

    /* ══ 8. LA LIMITE ET L'AVIS, DITS PAR LA TOUR ════════════════════════════════════════════════ */
    console.log('\n3. Ce que les deux protections font dire à la Tour');
    T = tour(B, PATRON, () => dernierCode());
    n0 = courriels();
    x = await T.ctx.supprAppel('/api/monitor/entreprise/supprimer', { t: 't-delta-832' });
    v('la 4e entreprise en 24 heures : la Tour demande le code et dit POURQUOI, puis la suppression passe',
      [T.demandes.length, /Trois entreprises ont déjà été supprimées ces dernières 24\u00a0heures\u00a0: au-delà, la case ne suffit plus/.test(T.demandes[0] || ''),
        /pas encore à jour/.test(T.demandes[0] || ''), T.ctx.supprReussi(x), courriels() - n0], [1, true, false, true, 2]);
    vrai('   delta est partie', !slugs().includes('delta'));
    vrai('   la question nomme la boîte', /p\*\*\*@banc-832\.fr/.test(T.demandes[0] || ''));
    facteurSrv.mode = 'refuse';
    T = tour(B, PATRON);
    x = await T.ctx.supprAppel('/api/monitor/compte/supprimer', { t: A, login: 'marc' });
    facteurSrv.mode = 'normal';
    vrai('l\'e-mail d\'avis refusé : la suppression a réussi, et la réponse le dit', T.ctx.supprReussi(x) && x.d.avis && x.d.avis.parti === false && !dansAnnuaire(A, 'marc'));
    T.ctx.supprToast(x, 'Suppression ordonnée');
    const tt = T.toasts[0] || ['', 0];
    v('   ⛔ le verdict le DIT, avec la raison, et reste affiché 9 s',
      [/^Suppression ordonnée · ⚠️ L’e-mail d’avis n’est pas parti \(.*550.*\)$/.test(tt[0]), tt[1]], [true, 9000]);
    T.ctx.supprToast({ ok: true, d: { attente: true, avis: { parti: true } } }, 'Fait', 0);
    T.ctx.supprToast({ ok: true, d: { attente: true } }, 'Fait (serveur d’avant)', 0);
    v('   parti, ou serveur d\'avant sans `avis` : le verdict seul, rien d\'inventé', T.toasts.slice(1), [['Fait', 0], ['Fait (serveur d’avant)', 0]]);
    T.ctx.supprToast({ ok: true, d: { supprime: true, avis: { parti: false } } }, '⚠️ incomplet', 8000);
    v('   un avertissement déjà long garde au moins sa durée', T.toasts[3], ['⚠️ incomplet · ⚠️ L’e-mail d’avis n’est pas parti', 9000]);
    v('⛔ les trois écrans disent leur verdict par supprToast (un quatrième le devra aussi)',
      ['compteSupprimer', 'comptesInutilisesSupprimer', 'entSupprimer'].map(f => /fin:function\(\w*\)\{[\s\S]*?supprToast\(\w+,/.test(fonction(f))), [true, true, true]);

    /* ══ 9. LES PORTES DE LA TOUR : toutes par supprAppel, plus aucune par code ═══════════════════ */
    console.log('\n4. Les portes de la Tour');
    const routes = ['compte/supprimer', 'comptes/supprimer', 'entreprise/supprimer'];
    for (const rt of routes) {
      v('⛔ ' + rt + ' : aucun appel direct (apiPost) — seulement par le panneau', (CODE.match(new RegExp("apiPost\\('/api/monitor/" + rt + "'", 'g')) || []).length, 0);
      v('   …et le panneau le porte une fois', (CODE.match(new RegExp("chemin:'/api/monitor/" + rt + "'", 'g')) || []).length, 1);
    }
    v('⛔ « fermer un client » n\'a plus de bouton depuis le 8 septembre : sa fonction est retirée, rien ne l\'appelle', /clients\/retirer/.test(CODE), false);
    const oui = fonction('supprOui'), pan = fonction('supprPanneau'), cse = fonction('supprCase');
    vrai('« Oui » naît ÉTEINT', /id="suppr-oui" class="btn-plein danger large" disabled/.test(pan));
    vrai('la case le rallume, et seulement elle', /b\.disabled=!cb\.checked/.test(cse));
    vrai('⛔ « Oui » relit la case avant d\'agir', /if\(!\(cb&&cb\.checked\)\)\{ supprErr\('Coche la case pour confirmer\.'\); return; \}/.test(oui));
    vrai('⛔ un toucher, un ordre : « Oui » s\'éteint pendant l\'appel', /b\.dataset\.enCours='1'; b\.disabled=true;/.test(oui) && /if\(b\.dataset\.enCours\) return;/.test(oui));
    vrai('⛔ la réussite se lit par supprReussi, le verdict ne se perd pas si le panneau est fermé', /if\(supprReussi\(r\)\)/.test(oui) && /if\(!ouvert\(\)\)\{ toast\(/.test(oui));
    v('⛔ plus aucun « code » demandé pour supprimer : le seul prompt restant est celui du serveur d\'avant',
      ['compteSupprimer', 'comptesInutilisesSupprimer', 'entSupprimer'].map(f => /prompt\(/.test(fonction(f))), [false, false, false]);
    v('   et la question est posée dans les trois', ['compteSupprimer', 'comptesInutilisesSupprimer', 'entSupprimer'].map(f => /question:/.test(fonction(f)) && /supprPanneau\(\{/.test(fonction(f))), [true, true, true]);

    /* ⛔ LA RÉUSSITE SE DIT, ET LE TOAST QUI LA DIT RESTE AFFICHÉ. La sonde l'a vu éteint 0,67 s après
       son appel : l'écouteur de sortie d'un toast précédent, resté accroché, l'éteignait à la fin de son
       entrée — et en laissait un autre pour le suivant. La vraie `toast`, un faux élément dont on
       déclenche les fins d'animation à la main, des minuteries qu'on fait tourner nous-mêmes. */
    {
      const decl = CODE.match(/\nvar _tt=[^\n]*/), f = fonction('toast');
      vrai('la vraie fonction toast s\'extrait', decl && f);
      const jouer = (masquerAvant) => {
        const cls = new Set(), ec = [], mins = []; let annul = new Set();
        const el = { textContent: '', style: {}, offsetWidth: 0,
          classList: { add: x => cls.add(x), remove: x => cls.delete(x), contains: x => cls.has(x) },
          addEventListener: (t, fn, o) => ec.push({ fn, once: !!(o && o.once) }),
          removeEventListener: (t, fn) => { const i = ec.findIndex(x => x.fn === fn); if (i >= 0) ec.splice(i, 1); } };
        const finAnim = () => ec.slice().forEach(x => { if (x.once) ec.splice(ec.indexOf(x), 1); x.fn(); });
        const ctx = { $: () => el, setTimeout: (fn, ms) => { mins.push({ fn, ms }); return mins.length; }, clearTimeout: id => annul.add(id) };
        vm.createContext(ctx); vm.runInContext(decl[0] + '\n' + f, ctx);
        const tourner = (ms) => { mins.forEach((m, i) => { if (!m.fait && !annul.has(i + 1) && m.ms === ms) { m.fait = true; m.fn(); } }); };
        ctx.toast('premier');
        if (masquerAvant) el.style.display = 'none';   // déjà masqué quand sa sortie commence : l'animation n'aura pas lieu
        tourner(2600);                                  // la sortie du premier commence
        ctx.toast('second');                            // …et le second arrive pendant qu'il s'efface
        finAnim();                                      // l'entrée du second se termine
        return { aff: el.style.display, txt: el.textContent, ecouteurs: ec.length };
      };
      v('⛔ un toast arrivé pendant que le précédent s\'efface reste affiché après son entrée', jouer(false), { aff: 'block', txt: 'second', ecouteurs: 0 });
      v('⛔ …même si le précédent était déjà masqué quand sa sortie a commencé', jouer(true), { aff: 'block', txt: 'second', ecouteurs: 0 });
    }

    v('⛔ du début à la fin, rien n\'est parti ailleurs qu\'au Google de banc (127.0.0.1)', G.requetes.every(q => !/googleapis|google\.com/.test(q)), true);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  if (ko) console.log('\n── journal du serveur (fin) ──\n' + journal.slice(-1500));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})();
