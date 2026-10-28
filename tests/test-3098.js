/* test-3098 — EFFACER LA SURVEILLANCE D'UNE ENTREPRISE SUPPRIMÉE (28 octobre 2026).
 *
 * Justin : « on peut supprimer l'historique ». Il avait supprimé ELAN depuis la Tour, et Surveillance → « Entreprises touchées »
 * montrait encore « ELAN · 45 problèmes · dernier il y a 1 j » : `monitor.json` (incidents, archive) et `bugs.jsonl` ne faisaient pas
 * partie de la suppression totale, et un téléphone resté sur l'ancienne application continuait d'alimenter la ligne.
 * Ce banc monte le VRAI serveur, isolé sur 127.0.0.1 (un faux Google, un faux serveur d'e-mails) et ne lit AUCUNE page : il passe contre celles de `main`,
 * comme le serveur seul. (Le bouton de la Tour est gardé à part par `test-3099`, qui lit `tour.html`.) Il garde :
 *   1. la route patron `POST /api/monitor/issues/purger-entreprise` : retire l'entreprise nommée des incidents VIVANTS et ARCHIVÉS, son
 *      adresse e-mail avec, laisse intactes les autres entreprises d'un même incident (compteur ajusté), supprime l'incident qui n'a plus
 *      personne, anonymise le journal de la Tour sans effacer un geste, et ne note ni nom ni adresse ;
 *   2. ⛔ une entreprise qui VIT est refusée (409), l'espace par défaut aussi (403), un non-patron aussi (403) ;
 *   3. la suppression totale purge d'elle-même (`fait.surveillance`), y compris les lignes brutes de `bugs.jsonl` — écrites atomiquement ;
 *   4. `POST /api/monitor/report` d'un espace fermé n'écrit RIEN (même forme que /api/bug), un espace vivant ou sans espace écrit comme avant ;
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
let enfant = null, faux = null, facteurSrv = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (faux) faux.close(); } catch (e) {} try { if (facteurSrv) facteurSrv.close(); } catch (e) {}
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
  const VIV = 't-viv-3098', DEL = 't-delta-3098', FER = 't-ferme-3098', ANC = 't-ancienne-3098', ORPH = 't-orphelin-3098';
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({
    'vivante-services': { t: VIV, nom: 'Vivante Services', email: 'viv@exemple-3098.fr', code: code64(VIV), ts: Date.now() },
    'delta': { t: DEL, nom: 'Delta Propreté', email: 'delta@exemple-3098.fr', code: code64(DEL), ts: Date.now() },
    'delta-proprete': { t: DEL, nom: 'DELTA PROPRETE', code: code64(DEL), ts: Date.now() - 1000 },
    'ferme-hygiene': { t: FER, nom: 'Fermée Hygiène', email: 'ferme@exemple-3098.fr', code: code64(FER), ts: Date.now() } }));
  fs.writeFileSync(path.join(D, 'entreprises-fermees.json'), JSON.stringify({ emails: [], espaces: [FER], suspendus: [], suspendusLe: {} }));
  fs.writeFileSync(path.join(D, 'comptes.json'), JSON.stringify({ [DEL]: { c: { d1: { s: 'aa', e: 'bb', n: 'D Un' } }, maj: Date.now() } }));
  /* un espace HORS annuaire qui se connecte encore : une entreprise vivante pour qui l'annuaire ne dit rien */
  fs.writeFileSync(path.join(D, 'connexions.json'), JSON.stringify({ [DEL]: [{ ts: Date.now(), ev: 'connexion', login: 'jean', nom: 'Jean', role: 'technicien', version: '772', app: 'gestion' }],
    'horsannuaire-3098': [{ ts: Date.now(), ev: 'connexion', login: 'x', nom: 'X', role: 'technicien', version: '772', app: 'gestion' }] }));

  const MDP = 'mot-de-passe-du-banc-3098', MDP_C = 'collaborateur-3098-long';
  const N = Date.now();
  const ent = (nom, email, count) => Object.assign({ nom, count, lastTs: N - 1000 }, email ? { email } : {});
  const inc = (id, app, entreprises, count, extra) => Object.assign({ id, signature: id + '|sig', app, statut: 'nouveau', type: 'erreur', message: 'Erreur ' + id, count, firstTs: N - 5000, lastTs: N - 500,
    entreprises, appareils: { 'iPhone Safari': count }, notes: '' }, extra || {});
  const MONITOR = {
    users: [{ id: 'upatron3098', nom: 'Patron', hash: sha(MDP), role: 'patron', actif: true, ts: 1 },
      { id: 'ucollab3098', nom: 'Gaston', hash: sha(MDP_C), role: 'collaborateur', actif: true, ts: 1, apps: ['gestion'] }],
    issues: [
      inc('i1', 'opgestion', [ent('Delta Propreté', 'jean@delta-3098.fr', 3), ent('Vivante Services', 'v@exemple-3098.fr', 2)], 5),   // Delta + Vivante : Vivante reste
      inc('i2', 'opgestion', [ent('DELTA PROPRETE', 'paul@delta-3098.fr', 4)], 4),                                                    // Delta seule (autre graphie) : l'incident part
      inc('i3', 'opmessages', [ent('Delta Propreté', 'm@delta-3098.fr', 7)], 7),                                                      // OP MESSAGES : n'est pas touché
      inc('i4', 'opgestion', [ent('Vivante Services', 'viv@exemple-3098.fr', 6)], 6),                                               // Vivante seule, à l'adresse de son annuaire : intacte
      inc('i5', 'opgestion', [ent('Ancienne Entreprise', 'viv@exemple-3098.fr', 9)], 9),                                         // partie depuis longtemps, mais a écrit sous l'adresse d'une entreprise qui VIT
      inc('i6', 'opgestion', [ent('Ancienne Entreprise', 'old@ancienne-3098.fr', 2), ent('Vivante Services', '', 1)], 3),
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
      { ts: N - 5000, qui: 'Patron', geste: 'a réglé l’abonnement d’une entreprise à la main', cible: 'Vivante Services', app: 'gestion' } ] };
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify(MONITOR));
  const ligne = (team, msg) => JSON.stringify({ ts: N - 100, team, app: 'opgestion', version: '772', msg, src: '', line: 0, stack: '', ua: '' });
  const BUGS = [ligne(DEL, 'd1'), ligne(DEL, 'd2'), ligne(DEL, 'd3'), ligne('delta', 'slug'), ligne(VIV, 'v1'), ligne(VIV, 'v2'), ligne('elan-gestion', 'defaut'),
    ligne(ANC, 'a1'), ligne(ANC, 'a2'), ligne(ORPH, 'o1')];
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

  /* la population AVANT : un zéro d'après ne vaut que si on a vu les unités avant */
  const avant = await issuesVivantes();
  v('population : neuf incidents vivants lus par la Tour (l\'archive n\'y est pas)', avant.length, 9);
  v('population : deux incidents archivés, dix lignes de journal brut au total', [mon().archive.length, bugsEquipes().length], [2, 10]);
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
  v('une entreprise absente de l\'annuaire : 200, un incident retiré (i5), une entrée retirée d\'un autre (i6), pas de ligne brute', [r.s, r.j.ok, r.j.issues, r.j.archive, r.j.entreprises, r.j.bugs, r.j.ecrit], [200, true, 1, 0, 2, 0, true]);
  vrai('   ⛔ la réponse ne rend que des NOMBRES : ni nom ni adresse', !/ancienne|@/i.test(JSON.stringify(r.j)));
  let m = mon();
  v('i5 (l\'entreprise seule) est supprimé ; i6 reste, sans elle', [m.issues.some(i => i.id === 'i5'), entsDe(m.issues, 'i6')], [false, ['Vivante Services']]);
  v('   le compteur de i6 retombe à ce qui vient de Vivante (3 − 2 = 1)', m.issues.find(i => i.id === 'i6').count, 1);
  vrai('   ⛔ l\'adresse de l\'entreprise partie n\'est plus NULLE PART dans monitor.json', !/ancienne-3098|Ancienne Entreprise/i.test(monTexte().replace(/entreprise supprimée/g, '')));
  v('   la liste que lit la Tour : plus que huit incidents', (await issuesVivantes()).length, 8);
  const trace = m.actions.filter(a => /^surveillance purgée/.test(a.geste));
  v('   une trace, SANS donnée : « surveillance purgée : 1 incidents, 0 lignes brutes (entreprise supprimée) »', trace.map(a => a.geste), ['surveillance purgée : 1 incidents, 0 lignes brutes (entreprise supprimée)']);
  vrai('   ⛔ elle ne porte ni nom ni adresse ni identifiant (cible vide)', trace.length === 1 && trace.every(a => a.cible === '' && !/ancienne|@/i.test(JSON.stringify(a))));
  vrai('   les autres entreprises d\'i6 et tous les autres incidents sont intacts', ids(m.issues).join() === 'i1,i2,i3,i4,i6,i7,i8,i9' && entsDe(m.issues, 'i4').join() === 'Vivante Services');
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
  /* i1 (Delta+Vivante, seule Delta part) · i2 (Delta seule : l'incident part) · a1 (Delta+Vivante) · a2 (Delta seule : part) = 4 entrées, 1 incident vivant, 1 archivé */
  v('fait.surveillance dit des NOMBRES : 1 incident vivant, 1 archivé, 4 entrées retirées', [S && S.issues, S && S.archive, S && S.entreprises], [1, 1, 4]);
  v('   lignes brutes : celles du nom d\'accès « delta » (1) — les 3 de l\'identifiant sont comptées par fait.erreurs', [S && S.bugs, r.j.fait.erreurs, S && S.ecrit], [1, 3, true]);
  await dormir(900);   // le geste « suppression » est noté à la fin de la réponse, puis sauvegardé 500 ms plus tard
  m = mon();
  v('i2 et a2 (Delta seule) sont partis ; i1 et a1 restent avec Vivante seule', [m.issues.some(i => i.id === 'i2'), m.archive.some(i => i.id === 'a2'), entsDe(m.issues, 'i1'), entsDe(m.archive, 'a1')], [false, false, ['Vivante Services'], ['Vivante Services']]);
  v('   le compteur de i1 retombe à celui de Vivante (5 − 3 = 2), celui de a1 (9 − 8 = 1)', [m.issues.find(i => i.id === 'i1').count, m.archive.find(i => i.id === 'a1').count], [2, 1]);
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

  console.log('\n── 3098 · 6. le serveur ne s\'est pas plaint ──');
  vrai('aucune erreur de purge dans le journal du serveur', !/purge de bugs\.jsonl|surveillance non purgée|monitor save/.test(journalSrv));
  vrai('le journal du serveur ne contient ni le nom ni une adresse de Delta ou d\'Ancienne Entreprise', !/delta@|jean@delta|paul@delta|old@ancienne|Ancienne Entreprise|Delta Propreté/.test(journalSrv));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc tombé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
