/* test-3102 — EFFACER LA SURVEILLANCE D'UNE ENTREPRISE SUPPRIMÉE (28 octobre 2026).
 *
 * Justin : « on peut supprimer l'historique ». Il avait supprimé ELAN depuis la Tour, et Surveillance → « Entreprises touchées »
 * montrait encore « ELAN · 45 problèmes · dernier il y a 1 j » : `monitor.json` (incidents, archive) et `bugs.jsonl` ne faisaient pas
 * partie de la suppression totale, et un téléphone resté sur l'ancienne application continuait d'alimenter la ligne.
 * Ce banc monte le VRAI serveur, isolé sur 127.0.0.1 (un faux Google, un faux serveur d'e-mails) et ne lit AUCUNE page : il passe contre celles de `main`,
 * comme le serveur seul. (Le bouton de la Tour part avec la Tour unifiée : son banc l'accompagne.) Il garde :
 *   1. la route patron `POST /api/monitor/issues/purger-entreprise` : retire l'entreprise nommée des incidents VIVANTS et ARCHIVÉS, son
 *      adresse e-mail avec, laisse intactes les autres entreprises d'un même incident (compteur ajusté), supprime l'incident qui n'a plus
 *      personne, anonymise le journal de la Tour sans effacer un geste, et ne note ni nom ni adresse ;
 *   2. ⛔ une entreprise qui VIT est refusée (409), l'espace par défaut aussi (403), un non-patron aussi (403) ;
 *   3. la suppression totale purge d'elle-même (`fait.surveillance`), y compris les lignes brutes de `bugs.jsonl` — écrites atomiquement ;
 *   4. `POST /api/monitor/report` d'un espace fermé n'écrit RIEN (même forme que /api/bug), un espace vivant ou sans espace écrit comme avant ;
 *   5. (§ 5 bis, le gardien, 28 octobre 2026) une adresse d'incident n'est JAMAIS une clé de purge (corps de requête public) ; l'espace par défaut se refuse par son NOM ;
 *      une entreprise qui vit sous un autre nom que celui de l'annuaire se reconnaît à l'ESPACE écrit dans l'entrée ; un annuaire illisible refuse (503) ;
 *      les lignes brutes se retrouvent par cet espace ; un nom d'un seul mot ne fait pas anonymiser les gestes d'une autre entreprise ;
 */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3098-'));
let enfant = null, faux = null, facteurSrv = null; const autresEnfants = [];
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { autresEnfants.forEach(x => x.kill('SIGKILL')); } catch (e) {} try { if (faux) faux.close(); } catch (e) {} try { if (facteurSrv) facteurSrv.close(); } catch (e) {}
  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 180 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 180000).unref();

const texte = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const libre = () => new Promise(r => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

/* un facteur minimal : il accepte tout (l'avis qui suit une suppression part vers lui) */
function facteur() {
  return require('net').createServer(c => {
    c.on('error', () => {}); let tampon = '', corps = false; c.write('220 banc\r\n');
    c.on('data', d => { tampon += d.toString('utf8'); let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) { const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; c.write('250 ok\r\n'); } continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n'); } });
  });
}

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  console.log('\n── 3098 · 0. population ──');

  /* ══ LES DONNÉES : une entreprise qui vit, une qui sera supprimée, une fermée, une partie depuis longtemps ══ */
  faux = http.createServer((q, r) => { let c = ''; q.on('data', d => { c += d; }); q.on('end', () => { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(/accounts:signUp/.test(q.url) ? { idToken: 'jeton-anonyme-de-banc' } : {})); }); });
  await new Promise(res => faux.listen(0, '127.0.0.1', res));
  const GURL = 'http://127.0.0.1:' + faux.address().port;
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.listen(0, '127.0.0.1', () => res(facteurSrv.address().port)));

  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const code64 = (t) => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  const VIV = 't-viv-3098', DEL = 't-delta-3098', FER = 't-ferme-3098', ANC = 't-ancienne-3098', ORPH = 't-orphelin-3098', FER2 = 't-ferme2-3098', ECH = 't-echo-3098';
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({
    'vivante-services': { t: VIV, nom: 'Vivante Services', email: 'viv@exemple-3098.fr', code: code64(VIV), ts: Date.now() },
    'delta': { t: DEL, nom: 'Delta Propreté', email: 'delta@exemple-3098.fr', code: code64(DEL), ts: Date.now() },
    'delta-proprete': { t: DEL, nom: 'DELTA PROPRETE', code: code64(DEL), ts: Date.now() - 1000 },
    'ferme-hygiene': { t: FER, nom: 'Fermée Hygiène', email: 'ferme@exemple-3098.fr', code: code64(FER), ts: Date.now() },
    'ferme-deux': { t: FER2, nom: 'Fermée Deux', email: 'ferme2@exemple-3098.fr', code: code64(FER2), ts: Date.now() },
    /* une entreprise dont le nom tient en UN mot générique : sa suppression ne doit pas anonymiser les gestes d'une autre qui contient ce mot */
    'gestion': { t: ECH, nom: 'Gestion', email: 'echo@exemple-3098.fr', code: code64(ECH), ts: Date.now() } }));
  fs.writeFileSync(path.join(D, 'entreprises-fermees.json'), JSON.stringify({ emails: [], espaces: [FER, FER2], suspendus: [], suspendusLe: {} }));
  fs.writeFileSync(path.join(D, 'comptes.json'), JSON.stringify({ [DEL]: { c: { d1: { s: 'aa', e: 'bb', n: 'D Un' } }, maj: Date.now() } }));
  /* un espace HORS annuaire qui se connecte encore : une entreprise vivante pour qui l'annuaire ne dit rien */
  fs.writeFileSync(path.join(D, 'connexions.json'), JSON.stringify({ [DEL]: [{ ts: Date.now(), ev: 'connexion', login: 'jean', nom: 'Jean', role: 'technicien', version: '772', app: 'gestion' }],
    'horsannuaire-3098': [{ ts: Date.now(), ev: 'connexion', login: 'x', nom: 'X', role: 'technicien', version: '772', app: 'gestion' }],
    /* l'espace par défaut SE CONNECTE (tous les appareils sans entreprise) : le serveur le « connaît » — c'est pourquoi on doit l'écarter exprès */
    'elan-gestion': [{ ts: Date.now(), ev: 'connexion', login: 'repli', nom: 'Repli', role: 'technicien', version: '772', app: 'gestion' }] }));

  const MDP = 'mot-de-passe-du-banc-3098', MDP_C = 'collaborateur-3098-long';
  const N = Date.now();
  const ent = (nom, email, count) => Object.assign({ nom, count, lastTs: N - 1000 }, email ? { email } : {});
  const inc = (id, app, entreprises, count, extra) => Object.assign({ id, signature: id + '|sig', app, statut: 'nouveau', type: 'erreur', message: 'Erreur ' + id, count, firstTs: N - 5000, lastTs: N - 500,
    entreprises, appareils: { 'iPhone Safari': count }, notes: '' }, extra || {});
  const MONITOR = {
    users: [{ id: 'upatron3098', nom: 'Patron', hash: sha(MDP), role: 'patron', actif: true, ts: 1 },
      { id: 'ucollab3098', nom: 'Gaston', hash: sha(MDP_C), role: 'collaborateur', actif: true, ts: 1, apps: ['gestion'] }],
    issues: [
      inc('i1', 'opgestion', [ent('Delta Propreté', 'jean@delta-3098.fr', 3), ent('Nom Tapé Autrement', 'delta@exemple-3098.fr', 1), ent('Vivante Services', 'v@exemple-3098.fr', 2)], 5),   // Delta + son adresse sous un autre nom + Vivante : Vivante reste
      inc('i2', 'opgestion', [ent('DELTA PROPRETE', 'paul@delta-3098.fr', 4)], 4),                                                    // Delta seule (autre graphie) : l'incident part
      inc('i3', 'opmessages', [ent('Delta Propreté', 'm@delta-3098.fr', 7)], 7),                                                      // OP MESSAGES : n'est pas touché
      inc('i4', 'opgestion', [ent('Vivante Services', 'viv@exemple-3098.fr', 6)], 6),                                               // Vivante seule, à l'adresse de son annuaire : intacte
      inc('i5', 'opgestion', [ent('Ancienne Entreprise', 'viv@exemple-3098.fr', 9)], 9),                                         // partie depuis longtemps, mais a écrit sous l'adresse d'une entreprise qui VIT
      inc('i6', 'opgestion', [ent('Ancienne Entreprise', 'old@ancienne-3098.fr', 2), ent('Ancienne Ent', 'old@ancienne-3098.fr', 1), ent('Vivante Services', '', 1)], 4),   // + la même adresse sous un autre nom
      inc('i7', 'opgestion', [ent('Fermée Hygiène', 'ferme@exemple-3098.fr', 5)], 5),
      inc('i8', 'opgestion', [ent('Orpheline Sans Plus', 'orph@exemple-3098.fr', 1)], 1),
      inc('i9', 'opgestion', [ent('Hors Annuaire Vivante', '', 1), ent('horsannuaire-3098', '', 1)], 2) ],
    archive: [
      inc('a1', 'opgestion', [ent('Delta Propreté', 'jean@delta-3098.fr', 8), ent('Vivante Services', '', 1)], 9, { statut: 'corrige' }),
      inc('a2', 'opgestion', [ent('delta-proprete', 'paul@delta-3098.fr', 2)], 2, { statut: 'corrige' }) ],
    journal: [{ ts: N - 9000, qui: 'Patron', ok: true, appareil: 'Mac · Safari', motif: 'Delta Propreté' }, { ts: N - 8000, qui: 'Patron', ok: true, appareil: 'Mac · Safari', motif: '' }],
    actions: [
      { ts: N - 7000, qui: 'Patron', geste: 'a renommé une entreprise', cible: 'Delta Propreté', app: 'gestion' },
      { ts: N - 6000, qui: 'Patron', geste: 'a changé la formule d’une entreprise', cible: DEL, detail: 'pro', app: 'gestion' },
      { ts: N - 5000, qui: 'Patron', geste: 'a réglé l’abonnement d’une entreprise à la main', cible: 'Vivante Services', app: 'gestion' },
      { ts: N - 4000, qui: 'Patron', geste: 'a ouvert l’accès d’une entreprise', cible: 'Gestion Courante SARL', app: 'gestion' },
      { ts: N - 3000, qui: 'Patron', geste: 'a ouvert l’accès d’une entreprise', cible: 'Gestion', app: 'gestion' } ] };
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify(MONITOR));
  const ligne = (team, msg) => JSON.stringify({ ts: N - 100, team, app: 'opgestion', version: '772', msg, src: '', line: 0, stack: '', ua: '' });
  const BUGS = [ligne(DEL, 'd1'), ligne(DEL, 'd2'), ligne(DEL, 'd3'), ligne('delta', 'slug'), ligne(VIV, 'v1'), ligne(VIV, 'v2'), ligne('elan-gestion', 'defaut'),
    ligne(ANC, 'a1'), ligne(ANC, 'a2'), ligne(ORPH, 'o1'), ligne(ECH, 'e1')];
  fs.writeFileSync(path.join(D, 'bugs.jsonl'), BUGS.join('\n') + '\n');

  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP), notifDemandes: 'patron@banc-3098.fr',
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' } }));
  const PORT = await libre();
  let journalSrv = '';
  enfant = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: GURL + '/token', TEAMOP_FIRESTORE_URL: GURL, TEAMOP_IDTK_URL: GURL + '/idtk', TEAMOP_FB_CERTS_URL: GURL + '/certs',
    TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journalSrv += d; }); enfant.stderr.on('data', d => { journalSrv += d; });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre', vivant);
  if (!vivant) { console.log(journalSrv.slice(0, 800)); process.exit(1); }
  const appel = async (route, corps, jeton, brut) => { const r = await fetch(B + route, { method: 'POST',
      headers: Object.assign({ 'Content-Type': brut ? 'text/plain' : 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: brut ? corps : JSON.stringify(corps) });
    let j = null; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j: j || {} }; };
  const login = async (nom, pass) => (await appel('/api/monitor/login', { nom, pass })).j.token;
  const PATRON = await login('Patron', MDP), COLLAB = await login('Gaston', MDP_C);
  vrai('le patron et le collaborateur ouvrent la Tour', PATRON && COLLAB);
  const lireJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
  const mon = () => lireJson(path.join(banc, 'monitor.json'));
  const monTexte = () => fs.readFileSync(path.join(banc, 'monitor.json'), 'utf8');
  const bugsEquipes = () => fs.readFileSync(path.join(D, 'bugs.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l).team);
  const compteBugs = (t) => bugsEquipes().filter(x => x === t).length;
  const issuesVivantes = async () => (await (await fetch(B + '/api/monitor/issues', { headers: { Authorization: 'Bearer ' + PATRON } })).json()).issues;
  const ids = (l) => l.map(i => i.id).sort();
  const entsDe = (l, id) => ((l.find(i => i.id === id) || {}).entreprises || []).map(e => e.nom);
  const ROUTE = '/api/monitor/issues/purger-entreprise';

  /* un SECOND serveur, isolé lui aussi, pour les états que le premier ne peut pas prendre : un annuaire illisible, une entreprise dont
     l'espace n'existe plus. Même configuration, ses propres données ; il s'arrête avec le banc. */
  const lancerAutre = async (nom, o) => {
    const rep = path.join(banc, nom), Da = path.join(rep, 'data'); fs.mkdirSync(Da, { recursive: true });
    fs.copyFileSync(path.join(banc, 'config.json'), path.join(rep, 'config.json'));
    fs.writeFileSync(path.join(Da, 'espaces.json'), typeof o.espaces === 'string' ? o.espaces : JSON.stringify(o.espaces || {}));
    fs.writeFileSync(path.join(Da, 'entreprises-fermees.json'), JSON.stringify(o.fermees || { emails: [], espaces: [], suspendus: [], suspendusLe: {} }));
    fs.writeFileSync(path.join(rep, 'monitor.json'), JSON.stringify(o.monitor));
    if (o.bugs) fs.writeFileSync(path.join(Da, 'bugs.jsonl'), o.bugs.join('\n') + '\n');
    const port = await libre(); let jr = '';
    const e2 = spawn(process.execPath, (o.require ? ['-r', o.require] : []).concat([SERVEUR]), { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(rep, 'config.json'), TEAMOP_DATA: Da, PORT: String(port),
      TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: GURL + '/token', TEAMOP_FIRESTORE_URL: GURL, TEAMOP_IDTK_URL: GURL + '/idtk', TEAMOP_FB_CERTS_URL: GURL + '/certs',
      TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }), stdio: ['ignore', 'pipe', 'pipe'] });
    e2.stdout.on('data', d => { jr += d; }); e2.stderr.on('data', d => { jr += d; }); autresEnfants.push(e2);
    const URLa = 'http://127.0.0.1:' + port; let vif = false;
    for (let i = 0; i < 150 && !vif; i++) { try { vif = (await fetch(URLa + '/health')).ok; } catch (e) {} if (!vif) await dormir(100); }
    const ap = async (route, corps, jeton) => { const r = await fetch(URLa + route, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: JSON.stringify(corps) });
      let j = null; try { j = JSON.parse(await r.text()); } catch (e) {} return { s: r.status, j: j || {} }; };
    const jeton = vif ? (await ap('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token : '';
    return { vif, ap, jeton, rep, Da, journal: () => jr };
  };

  /* la population AVANT : un zéro d'après ne vaut que si on a vu les unités avant */
  const avant = await issuesVivantes();
  v('population : neuf incidents vivants lus par la Tour (l\'archive n\'y est pas)', avant.length, 9);
  v('population : deux incidents archivés, onze lignes de journal brut au total', [mon().archive.length, bugsEquipes().length], [2, 11]);
  v('population : Delta figure dans 3 incidents vivants (dont un d\'OP MESSAGES) et 2 archivés', [avant.filter(i => /delta/i.test(JSON.stringify(i.entreprises))).length, mon().archive.filter(i => /delta/i.test(JSON.stringify(i.entreprises))).length], [3, 2]);

  console.log('\n── 3098 · 1. les refus — une entreprise qui vit ne se purge pas ──');
  let r = await appel(ROUTE, { nom: 'Ancienne Entreprise' }, COLLAB);
  v('un collaborateur : refusé (403)', r.s, 403);
  r = await appel(ROUTE, { nom: 'Ancienne Entreprise' }, '');
  v('sans session : refusé (403)', r.s, 403);
  r = await appel(ROUTE, {}, PATRON);
  v('ni nom ni identifiant : 400', r.s, 400);
  r = await appel(ROUTE, { nom: 'inconnue' }, PATRON);
  v('le nom « inconnue » (celui d\'un rapport sans entreprise) : 400, ce n\'est personne', r.s, 400);
  r = await appel(ROUTE, { nom: '!!!' }, PATRON);
  v('un nom fait de signes seuls : 400', r.s, 400);
  r = await appel(ROUTE, { t: 'elan-gestion' }, PATRON);
  v('⛔ l\'espace par défaut de l\'application : 403 — il est partagé par toutes les entreprises sans clé propre', r.s, 403);
  const photo = monTexte(), photoBugs = fs.readFileSync(path.join(D, 'bugs.jsonl'), 'utf8');
  for (const [lib, corps] of [['par son nom', { nom: 'Vivante Services' }], ['par son nom, autre graphie', { nom: 'vivante-services' }], ['par son identifiant', { t: VIV }],
    ['par le nom d\'un de ses noms d\'accès', { nom: 'delta' }], ['un espace hors annuaire qui se connecte encore', { nom: 'horsannuaire-3098' }], ['hors annuaire, par identifiant', { t: 'horsannuaire-3098' }]]) {
    r = await appel(ROUTE, corps, PATRON);
    v('⛔ entreprise qui vit, ' + lib + ' : 409', r.s, 409);
  }
  vrai('   et RIEN n\'a bougé : ni monitor.json ni bugs.jsonl', monTexte() === photo && fs.readFileSync(path.join(D, 'bugs.jsonl'), 'utf8') === photoBugs);

  console.log('\n── 3098 · 2. effacer une entreprise partie (la route, comme la Tour l’appelle : { nom } exact) ──');
  r = await appel(ROUTE, { nom: 'Ancienne Entreprise' }, PATRON);
  v('une entreprise absente de l\'annuaire : 200, un incident retiré (i5), son entrée d\'un autre (i6), pas de ligne brute', [r.s, r.j.ok, r.j.issues, r.j.archive, r.j.entreprises, r.j.bugs, r.j.ecrit], [200, true, 1, 0, 2, 0, true]);
  vrai('   ⛔ la réponse ne rend que des NOMBRES : ni nom ni adresse', !/ancienne|@/i.test(JSON.stringify(r.j)));
  let m = mon();
  v('i5 (l\'entreprise seule) est supprimé ; i6 reste, sans elle — mais avec l\'entrée écrite sous une AUTRE graphie (« Ancienne Ent »), qui est une ligne à elle dans « Entreprises touchées »', [m.issues.some(i => i.id === 'i5'), entsDe(m.issues, 'i6')], [false, ['Ancienne Ent', 'Vivante Services']]);
  v('   le compteur de i6 retombe à ce qui reste (4 − 2 = 2)', m.issues.find(i => i.id === 'i6').count, 2);
  vrai('   ⛔ son NOM n\'est plus nulle part dans monitor.json ; son adresse reste sous l\'autre graphie, qu\'AUCUN incident ne peut désigner (une adresse d\'incident n\'est pas une clé de purge)', !/Ancienne Entreprise/i.test(monTexte().replace(/entreprise supprimée/g, '')) && /old@ancienne-3098/.test(monTexte()));
  v('   la liste que lit la Tour : plus que huit incidents', (await issuesVivantes()).length, 8);
  const trace = m.actions.filter(a => /^surveillance purgée/.test(a.geste));
  v('   une trace, SANS donnée : « surveillance purgée : 1 incidents, 0 lignes brutes (entreprise supprimée) »', trace.map(a => a.geste), ['surveillance purgée : 1 incidents, 0 lignes brutes (entreprise supprimée)']);
  vrai('   ⛔ elle ne porte ni nom ni adresse ni identifiant (cible vide)', trace.length === 1 && trace.every(a => a.cible === '' && !/ancienne|@/i.test(JSON.stringify(a))));
  vrai('   les autres entreprises d\'i6 et tous les autres incidents sont intacts', ids(m.issues).join() === 'i1,i2,i3,i4,i6,i7,i8,i9' && entsDe(m.issues, 'i4').join() === 'Vivante Services');
  r = await appel(ROUTE, { nom: 'Ancienne Ent' }, PATRON);
  v('   l\'autre graphie se purge de la même façon, par SON nom : une entrée', [r.s, r.j.issues, r.j.entreprises], [200, 0, 1]);
  vrai('   ⛔ l\'adresse de l\'entreprise partie n\'est plus NULLE PART dans monitor.json', !/ancienne-3098|Ancienne Ent/i.test(monTexte().replace(/entreprise supprimée/g, '')) && entsDe(mon().issues, 'i6').join() === 'Vivante Services');
  vrai('   ⛔ l\'adresse de l\'annuaire d\'une entreprise qui VIT (portée aussi par l\'entreprise partie) ne fait rien partir de la sienne : i4 est intact', JSON.stringify(m.issues.find(i => i.id === 'i4')) === JSON.stringify(MONITOR.issues.find(i => i.id === 'i4')));

  console.log('\n── 3098 · 3. par identifiant : les lignes brutes de bugs.jsonl, réécrites atomiquement ──');
  const avantBugs = bugsEquipes().length;
  r = await appel(ROUTE, { t: ANC }, PATRON);
  v('{ t } d\'une entreprise absente de l\'annuaire : 200, deux lignes brutes retirées', [r.s, r.j.ok, r.j.bugs, r.j.issues], [200, true, 2, 0]);
  v('   bugs.jsonl : les deux lignes de CET identifiant sont parties, aucune autre', [compteBugs(ANC), bugsEquipes().length], [0, avantBugs - 2]);
  vrai('   ⛔ le fichier temporaire de la réécriture n\'est pas resté', !fs.existsSync(path.join(D, 'bugs.jsonl.tmp')));
  vrai('   les lignes des autres entreprises et de l\'espace par défaut sont intactes (octet pour octet)', fs.readFileSync(path.join(D, 'bugs.jsonl'), 'utf8') === BUGS.filter(l => !JSON.parse(l).team.startsWith('t-ancienne')).join('\n') + '\n');
  r = await appel(ROUTE, { t: ANC }, PATRON);
  v('   rejouée : 200 et zéro (idempotent) — la population a été comptée plus haut', [r.s, r.j.bugs, r.j.issues, r.j.entreprises], [200, 0, 0, 0]);
  vrai('   le journal ne garde que la première trace de cette purge par identifiant (la seconde ne retire rien)', mon().actions.filter(a => /^surveillance purgée : 0 incidents, 2 lignes brutes/.test(a.geste)).length === 1);
  /* l'entreprise FERMÉE reste dans l'annuaire mais n'est plus ouverte : elle se purge */
  r = await appel(ROUTE, { nom: 'Fermée Hygiène' }, PATRON);
  v('une entreprise FERMÉE (encore dans l\'annuaire) : purgée, 200', [r.s, r.j.issues, r.j.entreprises], [200, 1, 1]);
  vrai('   son adresse a quitté monitor.json', !/ferme@exemple-3098/.test(monTexte()));
  r = await appel(ROUTE, { nom: 'Orpheline Sans Plus', t: ORPH }, PATRON);
  v('nom ET identifiant d\'une entreprise partie : un incident, une ligne brute', [r.s, r.j.issues, r.j.bugs], [200, 1, 1]);

  console.log('\n── 3098 · 4. /api/monitor/report : un espace fermé n\'écrit plus ──');
  const rapport = (espace, nom, id) => JSON.stringify({ reports: [Object.assign({ type: 'erreur', message: 'Erreur du banc ' + id, signature: 'sig-' + id, app: 'opgestion', version: '772', entreprise: nom, email: 'tel-' + id + '@exemple-3098.fr', appareil: 'iPhone', count: 1 }, espace ? { espace } : {})] });
  const nbVivants = async () => (await issuesVivantes()).length;
  const n0 = await nbVivants();
  r = await appel('/api/monitor/report', rapport(FER, 'Fermée Hygiène', 'f1'), '', true);
  v('un téléphone d\'une entreprise FERMÉE : ok, ferme:true — comme /api/bug', [r.s, r.j.ok, r.j.ferme], [200, true, true]);
  v('   ⛔ rien n\'est écrit : ni nouvel incident ni adresse', [await nbVivants(), /tel-f1@/.test(monTexte())], [n0, false]);
  await dormir(700);   // monSave est différée de 500 ms : si le rapport avait écrit, on le verrait maintenant
  v('   (même après la minuterie de sauvegarde)', [(await issuesVivantes()).some(i => /f1/.test(i.signature)), /tel-f1@/.test(monTexte())], [false, false]);
  r = await appel('/api/monitor/report', rapport('t-supprimee-3098', 'Entreprise Sans Espace Connu', 'f2'), '', true);
  vrai('⛔ un espace inconnu du serveur n\'est pas « fermé » : le rapport est écrit comme avant (la route ne prouve rien, elle n\'écarte que le fermé)', r.s === 200 && !r.j.ferme);
  r = await appel('/api/monitor/report', rapport(VIV, 'Vivante Services', 'v1'), '', true);
  v('un téléphone d\'une entreprise VIVANTE : ok, écrit', [r.s, r.j.ok, r.j.ferme, (await issuesVivantes()).some(i => i.signature === 'opgestion|sig-v1')], [200, true, undefined, true]);
  r = await appel('/api/monitor/report', rapport('', 'Ancienne App', 'v2'), '', true);
  v('⛔ un rapport SANS espace (une version d\'avant la v683) : écrit comme avant — le serveur ne sait pas d\'où il vient', [r.s, r.j.ferme, (await issuesVivantes()).some(i => i.signature === 'opgestion|sig-v2')], [200, undefined, true]);
  const mixte = JSON.stringify({ reports: [JSON.parse(rapport(FER, 'Fermée Hygiène', 'm1')).reports[0], JSON.parse(rapport(VIV, 'Vivante Services', 'm2')).reports[0]] });
  r = await appel('/api/monitor/report', mixte, '', true);
  v('un lot mêlé (un espace fermé, un vivant) : le vivant est écrit, le fermé écarté, la réponse ne dit pas « fermé »', [r.s, r.j.ferme, (await issuesVivantes()).map(i => i.signature).filter(s => /sig-m[12]/.test(s))], [200, undefined, ['opgestion|sig-m2']]);

  console.log('\n── 3098 · 5. la suppression totale purge d\'elle-même (fait.surveillance) ──');
  const avantDel = mon();
  const bugsAvant = bugsEquipes();
  r = await appel('/api/monitor/entreprise/supprimer', { t: DEL, confirme: true }, PATRON);
  v('supprimer partout Delta Propreté, confirmée : supprimée', [r.s, r.j.supprime, r.j.t], [200, true, DEL]);
  const S = (r.j.fait || {}).surveillance;
  /* i1 (Delta, son adresse sous un autre nom, Vivante : Vivante reste) · i2 (Delta seule : l'incident part) · a1 (Delta+Vivante) · a2 (Delta seule : part) = 5 entrées, 1 incident vivant, 1 archivé */
  v('fait.surveillance dit des NOMBRES : 1 incident vivant, 1 archivé, 5 entrées retirées (dont une retrouvée par l\'adresse seule)', [S && S.issues, S && S.archive, S && S.entreprises], [1, 1, 5]);
  v('   lignes brutes : celles du nom d\'accès « delta » (1) — les 3 de l\'identifiant sont comptées par fait.erreurs', [S && S.bugs, r.j.fait.erreurs, S && S.ecrit], [1, 3, true]);
  await dormir(900);   // le geste « suppression » est noté à la fin de la réponse, puis sauvegardé 500 ms plus tard
  m = mon();
  v('i2 et a2 (Delta seule) sont partis ; i1 et a1 restent avec Vivante seule', [m.issues.some(i => i.id === 'i2'), m.archive.some(i => i.id === 'a2'), entsDe(m.issues, 'i1'), entsDe(m.archive, 'a1')], [false, false, ['Vivante Services'], ['Vivante Services']]);
  v('   le compteur de i1 retombe à celui de Vivante (5 − 4 = 1 : le plus grand de cela et de la somme de Vivante, 2), celui de a1 (9 − 8 = 1)', [m.issues.find(i => i.id === 'i1').count, m.archive.find(i => i.id === 'a1').count], [2, 1]);
  vrai('   les adresses des salariés de Delta ont quitté les incidents d\'OP GESTION (vivants et archivés)', ![...m.issues, ...m.archive].filter(i => i.app !== 'opmessages').some(i => /delta/i.test(JSON.stringify(i.entreprises))));
  vrai('   ⛔ OP MESSAGES n\'est pas touché, comme la suppression le promet : i3 garde son entrée', entsDe(m.issues, 'i3').join() === 'Delta Propreté');
  vrai('   les incidents des autres entreprises sont intacts (i4, i8…)', JSON.stringify(m.issues.find(i => i.id === 'i4')) === JSON.stringify(avantDel.issues.find(i => i.id === 'i4')));
  v('   bugs.jsonl : plus une ligne de Delta (identifiant ni nom d\'accès) ; Vivante, l\'espace par défaut et les autres : intacts', [compteBugs(DEL), compteBugs('delta'), compteBugs(VIV), compteBugs('elan-gestion'), bugsEquipes().length], [0, 0, 2, 1, bugsAvant.length - 4]);
  vrai('   ⛔ pas de fichier temporaire resté', !fs.existsSync(path.join(D, 'bugs.jsonl.tmp')));
  const motifs = m.journal.map(x => x.motif);
  vrai('   le journal de la Tour : la ligne qui citait le nom est anonymisée (le geste du patron reste, il n\'est pas effacé)', m.journal.length >= avantDel.journal.length && motifs.includes('entreprise supprimée') && !motifs.includes('Delta Propreté'));
  const act = m.actions;
  const citant = act.filter(a => a.geste === 'a renommé une entreprise' || a.geste === 'a changé la formule d’une entreprise');
  vrai('   les gestes qui citaient Delta par son nom ou son identifiant (population : 2) sont anonymisés, SANS en perdre un', citant.length === 2 && citant.every(a => a.cible === 'entreprise supprimée') && act.length >= avantDel.actions.length + 2);
  vrai('   ⛔ le geste d\'une entreprise qui VIT (Vivante) est resté tel quel', act.some(a => a.cible === 'Vivante Services' && a.geste === 'a réglé l’abonnement d’une entreprise à la main'));
  const sup = act.filter(a => /suppression d’une entreprise/.test(a.geste));
  vrai('   la suppression elle-même est notée (population : une ligne), SANS son identifiant ni son nom', sup.length === 1 && sup[0].cible === 'entreprise supprimée');
  const tr2 = act.filter(a => /^surveillance purgée/.test(a.geste)).map(a => a.geste);
  vrai('   la trace dit les nombres (2 incidents, 4 lignes brutes : 3 + 1), sans nom', tr2.includes('surveillance purgée : 2 incidents, 4 lignes brutes (entreprise supprimée)'));
  vrai('   ⛔ ni le nom « Delta » ni ses adresses ne sont dans monitor.json en dehors d\'OP MESSAGES', !/delta/i.test(JSON.stringify({ i: m.issues.filter(i => i.app !== 'opmessages'), a: m.archive, j: m.journal, ac: m.actions })));
  r = await appel('/api/monitor/report', rapport(DEL, 'Delta Propreté', 'd9'), '', true);
  v('⛔ et un téléphone resté sur l\'ancienne application ne la fait pas renaître : ok, ferme:true, rien d\'écrit', [r.s, r.j.ferme, /tel-d9@/.test(monTexte()), (await issuesVivantes()).some(i => /sig-d9/.test(i.signature))], [200, true, false, false]);
  r = await appel(ROUTE, { nom: 'Delta Propreté' }, PATRON);
  v('rejouer la route sur Delta (déjà purgée) : 200, plus rien à retirer côté OP GESTION', [r.s, r.j.issues, r.j.archive, r.j.bugs], [200, 0, 0, 0]);
  vrai('   (i3, d\'OP MESSAGES, y reste encore : la route ne la regarde pas non plus)', entsDe(mon().issues, 'i3').join() === 'Delta Propreté');

  console.log('\n── 3098 · 5 bis. les points du gardien (28 octobre 2026) — rejoués par les routes publiques, pas par des fichiers posés ──');
  const rap = (espace, nom, id, email) => JSON.stringify({ reports: [Object.assign({ type: 'erreur', message: 'Erreur du banc ' + id, signature: 'sig-' + id, app: 'opgestion', version: '772', entreprise: nom, email: email || '', appareil: 'iPhone', count: 1 }, espace ? { espace } : {})] });
  const envoyer = async (espace, nom, id, email) => (await appel('/api/monitor/report', rap(espace, nom, id, email), '', true)).s;
  const trouve = async (id) => (await issuesVivantes()).find(i => i.signature === 'opgestion|sig-' + id);

  /* BLOQUANT — une adresse relevée dans un incident est un corps de requête PUBLIC : elle ne doit jamais devenir une clé de purge. */
  await envoyer(VIV, 'Vivante Services', 'x1', 'salarie@viv-3098.fr');                 // un vrai rapport : un salarié de l'entreprise qui VIT
  await envoyer('', 'Forgeuse Disparue', 'x2', 'salarie@viv-3098.fr');                  // un rapport FORGÉ : un nom absent de l'annuaire, l'adresse de ce salarié
  vrai('population : le rapport vrai (Vivante) et le rapport forgé existent tous deux', (await trouve('x1')) && (await trouve('x2')));
  r = await appel(ROUTE, { nom: 'Forgeuse Disparue' }, PATRON);
  v('⛔ purger le nom forgé : 200, SON entrée seule part (un incident, une entrée)', [r.s, r.j.issues, r.j.entreprises], [200, 1, 1]);
  vrai('   ⛔ l\'incident de l\'entreprise qui VIT, qui porte la même adresse, est INTACT (l\'adresse d\'un incident n\'est pas une clé de purge)',
    !(await trouve('x2')) && (await trouve('x1')) && entsDe([await trouve('x1')], (await trouve('x1')).id).join() === 'Vivante Services');
  /* … et l'adresse de l'ANNUAIRE de l'entreprise purgée, posée sous le nom d'une entreprise qui vit, ne la fait pas partir non plus */
  await envoyer('', 'Vivante Services', 'x3', 'ferme2@exemple-3098.fr');
  r = await appel(ROUTE, { nom: 'Fermée Deux' }, PATRON);
  v('une entreprise fermée dont l\'annuaire porte une adresse : 200, aucune entrée à elle', [r.s, r.j.issues, r.j.entreprises], [200, 0, 0]);
  vrai('   ⛔ cette adresse, présente sous le NOM d\'une entreprise vivante, ne fait rien partir de la sienne', !!(await trouve('x3')));

  /* À CORRIGER 1 — l'espace par défaut se protège par son NOM comme par son identifiant. */
  await envoyer('', 'elan-gestion', 'x4', '');
  const photoX4 = JSON.stringify(await trouve('x4'));
  for (const nom of ['elan-gestion', 'Elan Gestion', 'opgestion-beta', 'elan-gestion-beta']) {
    r = await appel(ROUTE, { nom }, PATRON);
    v('⛔ l\'espace par défaut, par son NOM « ' + nom + ' » : 403', r.s, 403);
  }
  vrai('   et rien n\'est parti', JSON.stringify(await trouve('x4')) === photoX4);

  /* À CORRIGER 2 — le serveur situe l'entrée par l'espace d'où elle vient, pas seulement par le nom que le téléphone a saisi. */
  await envoyer(VIV, 'Vivante Services SARL', 'x5', '');        // le nom tapé dans l'application diffère de celui de l'annuaire
  r = await appel(ROUTE, { nom: 'Vivante Services SARL' }, PATRON);
  v('⛔ une entreprise qui VIT sous un autre nom que celui de l\'annuaire : refusée (409), reconnue par son espace', r.s, 409);
  vrai('   et son incident est intact', !!(await trouve('x5')));
  await dormir(700);   // monSave est différée de 500 ms
  const entDe = (id) => { const i = (mon().issues || []).find(x => x.signature === 'opgestion|sig-' + id); return (i && i.entreprises[0]) || {}; };
  v('   l\'espace est écrit à la réception — celui du serveur, JAMAIS l\'intouchable ni un inconnu', [entDe('x5').espaces, entDe('f2').espaces, entDe('x4').espaces], [[VIV], undefined, undefined]);
  vrai('   ⛔ et la Tour ne reçoit pas ces identifiants d\'espace (ils servent la purge, pas l\'écran)', JSON.stringify(await issuesVivantes()).includes('Vivante Services SARL') && !JSON.stringify(await issuesVivantes()).includes('"espaces"'));
  await envoyer('elan-gestion', 'Entreprise Du Repli', 'x4b', '');
  await dormir(700);
  v('   ⛔ l\'espace par défaut, partagé par toutes les entreprises sans clé propre, n\'est pas écrit', entDe('x4b').espaces, undefined);

  /* À CORRIGER 3 — un annuaire illisible rend tout inconnu : rien ne se purge. Second serveur, espaces.json tronqué. */
  const MON2 = { users: MONITOR.users, issues: [inc('z1', 'opgestion', [ent('Vivante Services', 'v@exemple-3098.fr', 1)], 1)], archive: [], journal: [], actions: [] };
  const S3 = await lancerAutre('illisible', { espaces: '{ "vivante-services": { "t": "t-viv', monitor: MON2 });
  vrai('le second serveur démarre sur un annuaire tronqué', S3.vif && /ILLISIBLE/.test(S3.journal()));
  const txt2 = () => fs.readFileSync(path.join(S3.rep, 'monitor.json'), 'utf8');
  const avant2 = txt2();
  for (const corps of [{ nom: 'Vivante Services' }, { t: VIV }]) {
    r = await S3.ap(ROUTE, corps, S3.jeton);
    v('⛔ annuaire illisible : la purge est refusée (503) — ' + JSON.stringify(Object.keys(corps)), r.s, 503);
  }
  vrai('   et monitor.json n\'a pas bougé', txt2() === avant2);

  /* À CORRIGER 4 — les lignes brutes se retrouvent par l'espace écrit dans l'entrée, et se vérifient : second serveur, espace qui n'existe plus. */
  const HC2 = 't-disparu-3098', ligneH = (team, msg) => JSON.stringify({ ts: N - 100, team, app: 'opgestion', version: '772', msg, src: '', line: 0, stack: '', ua: '' });
  const MON4 = { users: MONITOR.users, archive: [], journal: [], actions: [], issues: [
    inc('y1', 'opgestion', [Object.assign(ent('Partie Sans Annuaire', 'p@exemple-3098.fr', 2), { espaces: [HC2, 'elan-gestion'] })], 2),
    inc('y2', 'opgestion', [ent('Partie Ancienne Version', '', 1)], 1),
    inc('y3', 'opgestion', [ent('Partie Troisième', '', 1)], 1) ] };
  const S4 = await lancerAutre('disparu', { espaces: { 'viv': { t: VIV, nom: 'Vivante', code: code64(VIV), ts: Date.now() } }, monitor: MON4,
    bugs: [ligneH(HC2, 'h1'), ligneH(HC2, 'h2'), ligneH('elan-gestion', 'repli'), ligneH(VIV, 'v1')] });
  vrai('le troisième serveur démarre', S4.vif);
  /* l'écriture de monitor.json passe par un fichier temporaire : si le temporaire ne peut pas s'écrire (ici, un DOSSIER à sa place), l'ancien fichier reste ENTIER et l'échec se dit (500) */
  const mon4 = path.join(S4.rep, 'monitor.json'), avant4 = fs.readFileSync(mon4, 'utf8');
  fs.mkdirSync(mon4 + '.tmp');
  r = await S4.ap(ROUTE, { nom: 'Partie Troisième' }, S4.jeton);
  v('⛔ le disque refuse le fichier temporaire : l\'échec se DIT (500, ecrit:false)', [r.s, r.j.ecrit], [500, false]);
  vrai('   et monitor.json est resté entier, octet pour octet (jamais réécrit en place)', fs.readFileSync(mon4, 'utf8') === avant4);
  fs.rmdirSync(mon4 + '.tmp');
  const equipes4 = () => fs.readFileSync(path.join(S4.Da, 'bugs.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l).team);
  r = await S4.ap(ROUTE, { nom: 'Partie Sans Annuaire' }, S4.jeton);
  v('une entreprise partie dont l\'entrée porte l\'espace disparu : 200, un incident, DEUX lignes brutes retrouvées', [r.s, r.j.issues, r.j.bugs], [200, 1, 2]);
  v('   bugs.jsonl : les lignes de l\'espace disparu sont parties ; ⛔ l\'espace par défaut et une autre entreprise sont intacts', equipes4(), ['elan-gestion', VIV]);
  r = await S4.ap(ROUTE, { nom: 'Partie Ancienne Version' }, S4.jeton);
  v('une entrée d\'une version d\'avant (aucun espace) : le nom seul décide, aucune ligne brute ne peut être retrouvée — et la réponse le DIT par un zéro', [r.s, r.j.issues, r.j.bugs], [200, 1, 0]);

  /* ⛔ test.teamop.fr : ProtectSystem=strict, et ReadWritePaths ne nomme QUE le fichier monitor.json (`server/install-test.sh`). Le dossier
     refuse le temporaire (EROFS) : sans repli, plus rien ne s'écrivait et la Tour de test perdait ses comptes à chaque redémarrage
     (le défaut que `test-2989` garde, rendu à la première version de cette purge). Un module chargé AVANT le serveur refuse le
     temporaire comme systemd le ferait, et le DIT dans le journal : le scénario se prouve, il ne se suppose pas. */
  const RO = path.join(banc, 'lecture-seule.js');
  fs.writeFileSync(RO, "const fs = require('fs'); const w = fs.writeFileSync;\n" +
    "fs.writeFileSync = function (f, ...r) { if (String(f).endsWith('monitor.json.tmp')) { process.stderr.write('[banc] temporaire refusé (EROFS)\\n'); " +
    "const e = new Error(\"EROFS: read-only file system, open '\" + f + \"'\"); e.code = 'EROFS'; throw e; } return w.call(this, f, ...r); };\n");
  const S5 = await lancerAutre('lecture-seule', { require: RO, espaces: { 'viv': { t: VIV, nom: 'Vivante', code: code64(VIV), ts: Date.now() } },
    monitor: { users: MONITOR.users, archive: [], journal: [], actions: [], issues: [inc('z1', 'opgestion', [ent('Partie Lecture Seule', 'ro@exemple-3098.fr', 1)], 1),
      inc('z2', 'opgestion', [ent('Vivante Services', '', 1)], 1)] } });
  vrai('le serveur « dossier en lecture seule » démarre', S5.vif);
  r = await S5.ap(ROUTE, { nom: 'Partie Lecture Seule' }, S5.jeton);
  vrai('   le scénario a bien eu lieu : le temporaire a été REFUSÉ (journal du serveur)', /temporaire refusé \(EROFS\)/.test(S5.journal()));
  v('⛔ dossier en lecture seule : la purge s\'écrit quand même, dans le fichier lui-même (200, ecrit:true)', [r.s, r.j.ecrit], [200, true]);
  const txt5 = fs.readFileSync(path.join(S5.rep, 'monitor.json'), 'utf8'), m5 = JSON.parse(txt5);
  vrai('   monitor.json ne porte plus l\'entreprise partie, et garde l\'autre', !/Partie Lecture Seule|ro@exemple-3098/.test(txt5) && m5.issues.some(i => i.id === 'z2'));
  vrai('   ⛔ les comptes de la Tour sont toujours là (c\'est eux qu\'on perdait)', Array.isArray(m5.users) && m5.users.length === MONITOR.users.length && m5.users.length > 0);
  vrai('   aucun temporaire laissé, aucune plainte « monitor save »', !fs.existsSync(path.join(S5.rep, 'monitor.json.tmp')) && !/monitor save/.test(S5.journal()));

  /* … et la suppression totale ne reprend pas au nom ce qu'un espace vivant porte. Entreprise « Gestion » (un mot générique), homonyme d'une autre. */
  await envoyer(ECH, 'Gestion', 'g1', '');                // l'entreprise qu'on supprime
  await envoyer(VIV, 'Gestion', 'g2', '');                // une AUTRE entreprise (VIV, qui vit) dont le nom saisi est aussi « Gestion »
  await envoyer('', 'Gestion', 'g3', '');                 // une entrée d'avant : nom seul
  vrai('population : les trois entrées « Gestion » existent', (await trouve('g1')) && (await trouve('g2')) && (await trouve('g3')));
  r = await appel('/api/monitor/entreprise/supprimer', { t: ECH, confirme: true }, PATRON);
  v('supprimer partout « Gestion » : supprimée', [r.s, r.j.supprime], [200, true]);
  vrai('   ses deux entrées (son espace, et celle d\'avant sans espace) sont parties', !(await trouve('g1')) && !(await trouve('g3')));
  vrai('   ⛔ l\'entrée du même nom qui vient d\'un espace QUI VIT reste', !!(await trouve('g2')));
  await dormir(900);
  const cibles = mon().actions.filter(a => /ouvert l’accès/.test(a.geste)).map(a => a.cible);
  v('   ⛔ le journal de la Tour : « Gestion » (le nom exact) est anonymisé ; « Gestion Courante SARL », qui contient seulement ce mot, ne l\'est pas', cibles, ['Gestion Courante SARL', 'entreprise supprimée']);

  console.log('\n── 3098 · 6. le serveur ne s\'est pas plaint ──');
  vrai('aucune erreur de purge dans le journal du serveur', !/purge de bugs\.jsonl|surveillance non purgée|monitor save/.test(journalSrv));
  vrai('le journal du serveur ne contient ni le nom ni une adresse de Delta ou d\'Ancienne Entreprise', !/delta@|jean@delta|paul@delta|old@ancienne|Ancienne Entreprise|Delta Propreté/.test(journalSrv));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc tombé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
