/* ⛔ CE QUE CE FICHIER GARDE — LA DEMANDE « CRÉER VOTRE APPLICATION » ARRIVE VRAIMENT (30 octobre 2026).

   Un client réel a rempli le formulaire de teamop.fr : rien n'est arrivé. La page ouvrait le logiciel de courrier du visiteur (`mailto:`) ; sans logiciel ou sans clic, la demande se perdait en
   silence pendant que la page laissait croire qu'elle était partie. Désormais `vitrine/v2/site.js` l'envoie à `POST /api/site/demande`, qui la range sur disque et prévient Justin.

   Le VRAI serveur isolé, parlé en HTTP, et la VRAIE fonction d'envoi de `site.js` (le bloc DEMANDE_SITE, extrait du fichier réel et exécuté contre ce serveur — `fetch` réel) :
     1. 200 `{ok:true}` seulement si c'est écrit : le fichier existe, la demande y est, la route de la Tour (`/api/monitor/demandes-site`) la relit, aucun `.tmp` ne traîne ;
     2. 400 pour chaque forme invalide (chacune avec sa contre-épreuve : le même corps valide passe), prototype pollué refusé, 413 pour un corps énorme ;
     3. 429 au-delà du budget par adresse IP, par adresse de courriel ; un double clic ne fait pas deux demandes ; le champ piège rend 200 SANS rien écrire ;
     4. 503 quand le disque refuse l'écriture (et la demande n'est pas comptée), et quand le registre est illisible au démarrage (il n'est JAMAIS réécrit par-dessus) ;
     5. la Tour : refus sans session ; marquer traitée / remettre à traiter, relu ;
     6. l'ÉCRAN : la fonction d'envoi de la page ne dit « envoyée » que sur un 200 `ok:true` ; 400/413 → invalide, 429 → trop, 5xx / corps illisible → serveur, coupure → réseau ;
        et le code de la page n'affiche « envoyée » que dans la branche de ce succès, avec le bouton « Envoyer par e-mail à la place » sur l'échec, le bouton éteint pendant l'envoi ;
     7. RIEN de personnel dans le journal du serveur (ni nom, ni adresse, ni téléphone). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3230-'));
const enfants = [];
const fin = () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

console.log('\n── 3230 · la demande du site arrive, est rangée, et la page ne ment pas ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const REFB = require('./metiers-banc.js').ecrire(RACINE, banc);
  const MAINT = Date.now();
  const vap = webpush.generateVAPIDKeys();
  const config = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('mot-de-passe-3230'), comptes: { actif: true } };
  const PRE = path.join(banc, 'pre.js'); fs.writeFileSync(PRE, require('./metiers-banc.js').preload(RACINE, REFB.chemin));
  let PORTS = 9500 + (process.pid % 80) * 2, journalTout = '';
  const demarrer = async (nom, avant, confSup) => {
    const D = path.join(banc, nom, 'data'); fs.mkdirSync(D, { recursive: true });
    fs.writeFileSync(path.join(banc, nom, 'config.json'), JSON.stringify(Object.assign({}, config, confSup || {})));
    fs.writeFileSync(path.join(D, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', email: '', hash: sha('mot-de-passe-3230'), role: 'patron', actif: true, ts: MAINT }] }));
    if (avant) avant(D);
    const port = PORTS++; const B = 'http://127.0.0.1:' + port;
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, nom, 'config.json'), TEAMOP_DATA: D, PORT: String(port), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
    enfants.push(e); e.stdout.on('data', d => { journalTout += d; }); e.stderr.on('data', d => { journalTout += d; });
    let vivant = false;
    for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    return { D, B, vivant };
  };
  const S = await demarrer('a');
  vrai('le vrai serveur démarre, isolé', S.vivant, journalTout.slice(0, 600));
  if (!S.vivant) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  let ipN = 0;
  const brut = async (B, corps, ip, entetes) => { const r = await fetch(B + '/api/site/demande', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': ip || ('10.30.' + (++ipN % 250) + '.' + (process.pid % 250)) }, entetes || {}), body: typeof corps === 'string' ? corps : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j: j || {} }; };
  const envoi = (corps, ip) => brut(S.B, corps, ip);
  const appel = async (route, corps, jeton) => { const r = await fetch(S.B + route, { method: corps === undefined ? 'GET' : 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j: j || {} }; };
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-3230' })).j.token;
  vrai('(population) la Tour se connecte (patron)', typeof PATRON === 'string' && PATRON.length > 10);
  const lire = async () => (await appel('/api/monitor/demandes-site', undefined, PATRON)).j.demandes || [];
  const FICHIER = path.join(S.D, 'demandes-site.json');

  const EMAIL = 'zanzibar.quux@exemple-3230.fr', TEL = '06 11 22 33 44';
  const bonne = plus => Object.assign({ nom: 'Zorglub', prenom: 'Marie', email: EMAIL, tel: TEL, entreprise: 'Plomberie Banc 3230', equipe: '5 personnes', metiers: ['plomberie'], besoins: ['Planning et rendez-vous'], message: 'Trois techniciens, quarante clients.' }, plus || {});

  console.log('\n1. une demande valide est ÉCRITE, puis relue par la Tour');
  vrai('(population) aucune demande au départ', (await lire()).length === 0 && !fs.existsSync(FICHIER));
  let r = await envoi(bonne({ metiers: ['plomberie', 'electricite'] }));
  v('POST valide (deux métiers) : 200 { ok:true }', [r.s, r.j.ok], [200, true]);
  const disque = fs.existsSync(FICHIER) ? JSON.parse(fs.readFileSync(FICHIER, 'utf8')) : null;
  vrai('⛔ le fichier existe et porte la demande (l\'écriture a vraiment eu lieu)', disque && disque.l && disque.l.length === 1 && disque.l[0].email === EMAIL, JSON.stringify(disque));
  vrai('   aucun fichier temporaire ne traîne (écriture atomique)', !fs.readdirSync(S.D).some(f => /demandes-site.*\.tmp$/.test(f)));
  let l = await lire();
  v('la route de la Tour la relit : métiers (principal en tête), contact, non traitée', [l.length, l[0] && l[0].metiers, l[0] && l[0].metier, l[0] && l[0].email, l[0] && l[0].traitee], [1, ['plomberie', 'electricite'], 'plomberie', EMAIL, null]);
  vrai('   l\'empreinte interne ne sort pas vers la Tour', l[0] && !('empreinte' in l[0]));
  v('un double clic (même demande) : 200, PAS de seconde ligne', [(await envoi(bonne({ metiers: ['plomberie', 'electricite'] }))).s, (await lire()).length], [200, 1]);
  r = await envoi(bonne({ metiers: ['chauffage', 'plomberie'], variante: 'climatisation', cats: ['planning', 'devis'], entreprise: 'CVC Banc', email: 'cvc@exemple-3230.fr' }));
  l = await lire();
  v('chauffage + variante + rubriques : 200, rangées (la base s\'ajoute d\'office, comme à la synchro)', [r.s, l[0].variante, l[0].cats.includes('planning') && l[0].cats.includes('devis') && l[0].cats.length > 2], [200, 'climatisation', true]);
  r = await envoi({ email: 'minimal@exemple-3230.fr', metiers: ['3d'] });
  v('CONTRE-ÉPREUVE — le strict minimum (adresse + un métier) passe', [r.s, r.j.ok], [200, true]);

  console.log('\n2. chaque forme invalide est refusée (400), sans rien écrire');
  const avant = (await lire()).length;
  const refus = async (t, corps, code) => { const x = await envoi(corps); v(t, [x.s, x.j.error], [code || 400, x.j.error || undefined].slice(0, 1).concat([x.j.error])); return x; };
  const cas = [
    ['sans adresse', bonne({ email: undefined })], ['adresse sans @', bonne({ email: 'pas-une-adresse' })], ['adresse avec retour à la ligne (injection d\'en-tête)', bonne({ email: 'a@exemple.fr\nBcc: x@y.fr' })],
    ['adresse en tableau', bonne({ email: ['a@b.fr'] })], ['sans métier', bonne({ metiers: [] })], ['métiers absents', bonne({ metiers: undefined })], ['quatre métiers', bonne({ metiers: ['plomberie', 'electricite', 'chauffage', 'serrurerie'] })],
    ['métier inconnu', bonne({ metiers: ['zzzz'] })], ['la 3D avec un autre métier', bonne({ metiers: ['3d', 'plomberie'] })], ['métier en doublon', bonne({ metiers: ['plomberie', 'plomberie'] })],
    ['variante pour un métier sans chauffage', bonne({ variante: 'deux' })], ['variante inconnue', bonne({ metiers: ['chauffage'], variante: 'tout' })], ['rubrique inconnue', bonne({ cats: ['nimportequoi'] })],
    ['rubriques qui ne sont pas une liste', bonne({ cats: 'planning' })], ['téléphone absurde', bonne({ tel: 'appelez-moi' })], ['nom qui est un objet', bonne({ nom: { a: 1 } })], ['besoins qui ne sont pas une liste', bonne({ besoins: 'x' })],
    ['corps qui est une liste', [1, 2]], ['JSON cassé', '{"email":'], ['prototype : __proto__', '{"__proto__":{"pollue":"oui"},"email":"p@exemple-3230.fr","metiers":["plomberie"]}'],
    ['prototype : constructor', '{"constructor":{"prototype":{"pollue":"oui"}},"email":"p@exemple-3230.fr","metiers":["plomberie"]}']];
  for (const [t, corps] of cas) { const x = await envoi(corps); v('400 — ' + t, x.s, 400); }
  const gros = await envoi(bonne({ message: 'x'.repeat(40000) }));
  v('413 — un corps de 40 Ko (la limite est de 24 Ko, lue APRÈS le budget)', gros.s, 413);
  v('rien n\'a été écrit par tous ces refus', (await lire()).length, avant);
  v('CONTRE-ÉPREUVE — le même corps valide passe (message bien trop long : BORNÉ, pas refusé)', [(await envoi(bonne({ email: 'borne@exemple-3230.fr', message: 'y'.repeat(5000) }))).s, ((await lire())[0].message || '').length <= 1500], [200, true]);
  const l2 = await lire();
  vrai('   le prototype n\'a rien pollué (aucune ligne ne porte « pollue »)', !JSON.stringify(l2).includes('pollue'));

  console.log('\n3. le budget, le double clic, le champ piège');
  const IP = '10.77.0.1';
  const codes = []; for (let i = 0; i < 8; i++) codes.push((await envoi({ email: 'budget' + i + '@exemple-3230.fr', metiers: ['plomberie'] }, IP)).s);
  v('⛔ 429 au-delà de 6 demandes par heure et par adresse IP (les 6 premières passent, les suivantes non)', codes, [200, 200, 200, 200, 200, 200, 429, 429]);
  v('   une AUTRE adresse IP n\'est pas touchée', (await envoi(bonne({ email: 'autre-ip@exemple-3230.fr' }), '10.77.0.2')).s, 200);
  const cm = []; for (let i = 0; i < 4; i++) cm.push((await envoi(bonne({ email: 'repete@exemple-3230.fr', message: 'essai ' + i }))).s);
  v('⛔ 429 au-delà de 3 demandes par heure pour une même adresse de courriel (depuis des IP différentes)', cm, [200, 200, 200, 429]);
  const nAvant = (await lire()).length;
  r = await envoi(bonne({ email: 'robot@exemple-3230.fr', site_web: 'http://spam.example' }));
  v('le champ piège rempli : 200 « muet », RIEN d\'écrit', [r.s, r.j.muted, (await lire()).length], [200, true, nAvant]);

  console.log('\n4. le disque refuse → 503 ; registre illisible → 503 et jamais réécrit');
  fs.mkdirSync(FICHIER + '.tmp');   // le temporaire ne peut plus s'écrire : le rangement échoue vraiment
  r = await envoi(bonne({ email: 'disque@exemple-3230.fr' }));
  v('⛔ le disque refuse : 503 (jamais un 200 de politesse), et la demande n\'est PAS comptée', [r.s, r.j.error, (await lire()).some(x => x.email === 'disque@exemple-3230.fr')], [503, 'non_ecrite', false]);
  fs.rmdirSync(FICHIER + '.tmp');
  v('   CONTRE-ÉPREUVE — le disque revient : la même demande passe', (await envoi(bonne({ email: 'disque@exemple-3230.fr' }))).s, 200);
  const S2 = await demarrer('b', D => fs.writeFileSync(path.join(D, 'demandes-site.json'), '{pas du json'));
  vrai('(population) le serveur au registre illisible démarre', S2.vivant);
  r = await brut(S2.B, bonne());
  v('⛔ registre illisible : 503, et le fichier n\'est PAS réécrit par-dessus', [r.s, fs.readFileSync(path.join(S2.D, 'demandes-site.json'), 'utf8')], [503, '{pas du json']);


  console.log('\n4 bis. le courriel à Justin : les coordonnées, une réponse directe, rien d\'injecté — et toujours rien au journal');
  const recus = []; let msgC = '', corpsC = false;
  const smtp = require('net').createServer(c => { c.on('error', () => {}); let t = ''; c.write('220 banc\r\n');
    c.on('data', d => { t += d.toString('utf8'); let i; while ((i = t.indexOf('\r\n')) >= 0) { const l = t.slice(0, i); t = t.slice(i + 2);
      if (corpsC) { if (l === '.') { corpsC = false; recus.push(msgC); msgC = ''; c.write('250 ok\r\n'); } else msgC += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
      const h = l.toUpperCase();
      if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n'); else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
      else if (h.startsWith('DATA')) { corpsC = true; c.write('354 go\r\n'); } else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); } else c.write('250 ok\r\n'); } }); });
  await new Promise(r2 => smtp.listen(0, '127.0.0.1', r2));
  const S3 = await demarrer('c', null, { smtp: { host: '127.0.0.1', port: smtp.address().port, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' }, notifDemandes: 'patron@banc-3230.fr' });
  vrai('(population) le serveur au courrier branché démarre', S3.vivant);
  r = await brut(S3.B, bonne({ email: 'courrier@exemple-3230.fr', entreprise: 'Banc Courrier\nBcc: evil@exemple.fr' }));
  v('la demande est reçue (200)', r.s, 200);
  for (let i = 0; i < 50 && !recus.length; i++) await dormir(100);
  const mel = recus.map(m => Buffer.from(m.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8')).find(m => /courrier@exemple-3230\.fr/.test(m)) || '';
  vrai('⛔ le courriel part vraiment, à l\'adresse de Justin', /^To: .*patron@banc-3230\.fr/mi.test(mel), mel.slice(0, 300));
  vrai('   il porte les coordonnées (adresse, téléphone, entreprise, métier) et dit que rien n\'a été créé', /courrier@exemple-3230\.fr/.test(mel) && /06 11 22 33 44/.test(mel) && /Banc Courrier/.test(mel) && /Métiers : /.test(mel) && /Rien n'a été créé/.test(mel));
  vrai('   « répondre » écrit au client (Reply-To)', /^Reply-To: .*courrier@exemple-3230\.fr/mi.test(mel));
  vrai('   ⛔ la retombée à la ligne du nom d\'entreprise n\'a pas fabriqué un en-tête « Bcc »', !/^Bcc:/mi.test(mel.split('\n\n')[0]));
  smtp.close();

  console.log('\n5. la Tour : session exigée, traiter / remettre à traiter');
  v('sans session : la liste est refusée', (await appel('/api/monitor/demandes-site')).s, 401);
  v('sans session : « traiter » est refusé', (await appel('/api/monitor/demandes-site/traiter', { id: 'x' })).s, 401);
  const une = (await lire())[0];
  r = await appel('/api/monitor/demandes-site/traiter', { id: une.id, traite: true }, PATRON);
  const apres = (await lire()).find(x => x.id === une.id);
  v('marquer traitée : 200, relue avec « par »', [r.s, apres.traitee && apres.traitee.par], [200, 'Patron']);
  r = await appel('/api/monitor/demandes-site/traiter', { id: une.id, traite: false }, PATRON);
  v('remettre à traiter : 200, relue', [r.s, (await lire()).find(x => x.id === une.id).traitee], [200, null]);
  v('une demande inconnue : 404', (await appel('/api/monitor/demandes-site/traiter', { id: 'inconnue' }, PATRON)).s, 404);
  const pre = await fetch(S.B + '/api/site/demande', { method: 'OPTIONS', headers: { Origin: 'https://teamop.fr', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  v('CORS : la requête préalable de teamop.fr (Content-Type seul) est acceptée', [pre.status, pre.headers.get('access-control-allow-origin'), /content-type/i.test(pre.headers.get('access-control-allow-headers') || '')], [204, 'https://teamop.fr', true]);

  console.log('\n6. l\'ÉCRAN : la VRAIE fonction d\'envoi de site.js contre le vrai serveur');
  const SITE = fs.readFileSync(path.join(RACINE, 'vitrine', 'v2', 'site.js'), 'utf8');
  const i0 = SITE.indexOf('/* ══ DEMANDE_SITE:DEBUT'), i1 = SITE.indexOf('/* ══ DEMANDE_SITE:FIN');
  vrai('(population) le bloc d\'envoi est trouvé dans site.js', i0 > 0 && i1 > i0, [i0, i1]);
  const bac = { window: {}, fetch: (...a) => fetch(...a), AbortController, setTimeout, clearTimeout, JSON, String, Array, RegExp };
  bac.window.TEAMOP_API = S.B; vm.runInNewContext(SITE.slice(i0, i1), bac);
  const D = bac.window.TeamOpDemande;
  vrai('la fonction réelle est exposée', D && typeof D.envoyer === 'function' && typeof D.corps === 'function');
  v('l\'adresse visée est celle du serveur réglé… et par défaut api.teamop.fr', [D.url(), (() => { const b2 = { window: {}, fetch, AbortController, setTimeout, clearTimeout, JSON, String, Array, RegExp }; vm.runInNewContext(SITE.slice(i0, i1), b2); return b2.window.TeamOpDemande.url(); })()], [S.B + '/api/site/demande', 'https://api.teamop.fr/api/site/demande']);
  const champs = { nom: 'Zorglub', prenom: 'Marie', email: 'ecran@exemple-3230.fr', tel: '', entreprise: 'Écran SARL', equipe: '3', message: '', metiers: ['plomberie'], variante: '', cats: null, besoins: ['Planning et rendez-vous'], piege: '' };
  const corps = D.corps(champs);
  v('le corps envoyé : les champs vides ne partent pas, le piège vide non plus', [Object.keys(corps).sort()], [['besoins', 'email', 'entreprise', 'equipe', 'metiers', 'nom', 'prenom']]);
  const nL = (await lire()).length;
  let e = await D.envoyer(corps);
  v('⛔ 200 du serveur → « envoyée » (ok:true), et la demande est BIEN rangée', [e.ok, e.etat, (await lire()).length, (await lire()).some(x => x.email === 'ecran@exemple-3230.fr')], [true, 'envoyee', nL + 1, true]);
  e = await D.envoyer(D.corps(Object.assign({}, champs, { email: 'faux' })));
  v('⛔ 400 → PAS « envoyée » : état « invalide »', [e.ok, e.etat, e.status], [false, 'invalide', 400]);
  for (let i = 0; i < 8; i++) await brut(S.B, { email: 'x' }, '10.88.0.1');
  const lim = await (async () => { const b3 = { window: { TEAMOP_API: S.B }, fetch: (u, o) => fetch(u, Object.assign({}, o, { headers: Object.assign({}, o.headers, { 'X-Forwarded-For': '10.88.0.1' }) })), AbortController, setTimeout, clearTimeout, JSON, String, Array, RegExp }; vm.runInNewContext(SITE.slice(i0, i1), b3); return b3.window.TeamOpDemande.envoyer(D.corps(champs)); })();
  v('⛔ 429 → PAS « envoyée » : état « trop »', [lim.ok, lim.etat, lim.status], [false, 'trop', 429]);
  /* un faux serveur pour 500, 503, 200 sans ok, 200 illisible, coupure */
  const http = require('http'); let mode = 'ok';
  const faux = http.createServer((q, s) => { q.resume(); if (mode === '500') { s.writeHead(500); s.end('{}'); } else if (mode === '503') { s.writeHead(503, { 'Content-Type': 'application/json' }); s.end('{"error":"non_ecrite"}'); } else if (mode === '200vide') { s.writeHead(200, { 'Content-Type': 'application/json' }); s.end('{}'); } else if (mode === '200html') { s.writeHead(200); s.end('<html>captif</html>'); } else if (mode === 'coupe') { q.socket.destroy(); } else { s.writeHead(200, { 'Content-Type': 'application/json' }); s.end('{"ok":true}'); } });
  await new Promise(r2 => faux.listen(0, '127.0.0.1', r2)); const pf = faux.address().port;
  const b4 = { window: { TEAMOP_API: 'http://127.0.0.1:' + pf }, fetch: (...a) => fetch(...a), AbortController, setTimeout, clearTimeout, JSON, String, Array, RegExp }; vm.runInNewContext(SITE.slice(i0, i1), b4);
  const F = b4.window.TeamOpDemande;
  const essai = async m => { mode = m; const x = await F.envoyer(F.corps(champs)); return [x.ok, x.etat]; };
  v('500 → échec « serveur »', await essai('500'), [false, 'serveur']);
  v('503 → échec « serveur »', await essai('503'), [false, 'serveur']);
  v('⛔ 200 SANS « ok:true » (un portail captif, un relais) → échec, pas « envoyée »', await essai('200vide'), [false, 'serveur']);
  v('⛔ 200 qui n\'est pas du JSON → échec', await essai('200html'), [false, 'serveur']);
  v('coupure du réseau → échec « réseau »', await essai('coupe'), [false, 'reseau']);
  v('CONTRE-ÉPREUVE — le faux serveur qui dit ok:true → « envoyée »', await essai('ok'), [true, 'envoyee']);
  faux.close();
  const CODE = nu(SITE);
  const iS = CODE.indexOf('DemandeSite.envoyer(corps).then');
  const gestion = CODE.slice(iS, iS + 3200);
  vrai('(population) le gestionnaire du résultat est trouvé', iS > 0 && gestion.length > 500);
  const iOk = gestion.indexOf('if (r.ok) {'), iFin = gestion.indexOf('return;', iOk);
  vrai('⛔ « Demande envoyée » n\'est affiché QUE dans la branche r.ok', iOk > 0 && iFin > iOk && (gestion.match(/succes\.hidden = false/g) || []).length === 1 && gestion.indexOf('succes.hidden = false') > iOk && gestion.indexOf('succes.hidden = false') < iFin);
  vrai('   sur l\'échec : le message se dit et le bouton « e-mail à la place » ouvre le mailto d\'avant', /echecMail\.onclick = function \(\) \{ location\.href = mail; \}/.test(gestion) && /echec\.hidden = false/.test(gestion) && /mailto:contact@teamop\.fr\?subject=/.test(CODE));
  vrai('   le bouton est éteint pendant l\'envoi (pas de double demande) et rendu sur l\'échec', /bouton\.disabled = true/.test(CODE) && /bouton\.disabled = false/.test(gestion) && /if \(envoiEnCours\) return;/.test(CODE));
  vrai('   ⛔ plus de navigation vers le mailto à la soumission (`location.href` n\'y est qu\'au clic du bouton de secours)', (CODE.match(/location\.href = (mail|'mailto)/g) || []).length === 1);
  vrai('   aucun en-tête maison (CORS) : seul Content-Type', /headers: \{ 'Content-Type': 'application\/json' \}/.test(CODE) && !/'X-Teamop/.test(CODE.slice(CODE.indexOf('DemandeSite = {'), CODE.indexOf('window.TeamOpDemande'))));
  /* les pages (racine v1 intacte, aperçu) portent l'ancien bouton : c'est site.js qui complète l'écran — champ piège, erreur d'adresse, bloc d'échec, libellés — sans rien doubler */
  vrai('site.js complète la page : bouton « Envoyer ma demande », champ piège, erreur d\'adresse, bloc d\'échec avec « Envoyer par e-mail à la place »',
    /'Envoyer ma demande'/.test(CODE) && /name = 'site_web'/.test(CODE) && /id = 'erreur-email'/.test(CODE) && /echec-envoi/.test(CODE) && /Envoyer par e-mail à la place/.test(CODE) && /if \(!\$\('\[name="site_web"\]', demande\)\)/.test(CODE) && /\$\('\.echec-envoi', demande\)/.test(CODE));
  for (const page of ['creer.html', 'apercu/site/creer.html']) vrai('la page ' + page + ' charge site.js et porte le formulaire (#demande, E-mail c2)', /vitrine\/v2\/site\.js/.test(fs.readFileSync(path.join(RACINE, page), 'utf8')) && /name="c2"/.test(fs.readFileSync(path.join(RACINE, page), 'utf8')));

  console.log('\n7. rien de personnel dans le journal');
  await dormir(300);
  const perso = ['zanzibar', 'zorglub', 'exemple-3230', '0611223344', '06 11 22 33 44', 'plomberie banc', 'quarante clients'].filter(x => journalTout.toLowerCase().includes(x));
  v('⛔ le journal du serveur ne contient ni nom, ni adresse, ni téléphone, ni texte libre', perso, []);
  vrai('(population) le journal n\'est pas vide (le contrôle regarde quelque chose)', journalTout.length > 50, journalTout.length);
  fin();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
