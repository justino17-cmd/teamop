/* ⛔ CE QUE CE FICHIER GARDE — CE QU'UN INCIDENT ENVOIE À ANTHROPIC EST FILTRÉ, CE QUE LA TOUR AFFICHE NE CHANGE PAS (23 octobre 2026).

   Relecture juridique : « Expliquer la cause » et « Proposer un correctif » (la Tour) envoyaient le message d'erreur, la trace et la source d'un
   incident TELS QUELS chez Anthropic. Or ces champs arrivent par `/api/monitor/report`, publique et sans preuve, et peuvent citer ce qu'un client
   avait saisi. Le serveur retire DÉJÀ adresses et numéros des courriels qu'il donne aux agents (`agents-connaissance.js`) : l'incident passe par
   LA MÊME définition (`pourAnthropic`), juste avant l'appel, sans toucher au stockage.

   Le VRAI serveur, parlé en HTTP (127.0.0.1, adresses et numéros fictifs), contre un FAUX Anthropic (`ANTHROPIC_BASE_URL`) qui note ce qu'il reçoit :
     1. un rapport PUBLIC dont le message, la trace, la version, l'origine et la source portent une adresse, des numéros (français, international,
        pleine chasse, avec barres), un IBAN et une adresse ENCODÉE (« %40 ») ;
     2. `/api/monitor/expliquer` : rien de tout cela n'arrive chez le faux Anthropic, le reste du texte si ; l'extrait de code du dépôt est filtré lui aussi ;
     3. un rapport dont le message se termine sur « …@ » et la trace sur « 06 98 76 5 » (COUPÉS à la longueur de stockage) : le bout est masqué ;
     4. `/api/monitor/proposer` : message, trace ET la cause rendue par le modèle (qui a recopié une adresse) sont filtrés ; le CODE de la fenêtre reste
        tel quel (le modèle doit en recopier un fragment au caractère près) ;
     5. ⛔ la Tour GARDE l'original : `GET /api/monitor/issues` rend toujours l'adresse et le numéro en clair.
     6. ⛔ un numéro écrit DANS une URL (« 06%2098%2076… », « 06+98+76… », « %2B33%206… ») ou en paires (« 06_98_76_54_32 », « 06,98,76,54,32 ») est masqué ;
        une liste de nombres ou « 3+4 » reste lisible ;
     7. ⛔ `/api/monitor/proposer` jusqu'au bout, contre un FAUX GitHub (`TEAMOP_GITHUB_API_URL`) : le corps, le titre de la demande de fusion ET le message de
        commit ne portent ni adresse ni numéro (le message et la cause de l'incident, le titre / le pourquoi / le « à vérifier » du modèle) ; la Tour garde l'original.
   Chaque « n'arrive pas » a sa CONTRE-ÉPREUVE (le marqueur du même texte arrive) et sa population (l'appel a eu lieu). Jetons de recherche : des
   lettres HORS de [0-9a-f] (CLAUDE.md : un jeton court tombe au hasard dans une empreinte). Rien ne sort d'ici : 127.0.0.1. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2975-'));
let srv = null;
const fin = () => { try { if (srv) srv.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();

/* Ce qui ne doit JAMAIS arriver chez Anthropic. Tous contiennent une lettre hors [0-9a-f], sauf les numéros, qui se cherchent écrits comme le
   rapport les écrit ET en chiffres seuls (le filtre rend « (numéro) », jamais un morceau). */
const INTERDITS = ['zqxwvu', 'exemple-banc', 'entreprise-zqxw', 'lea.zqxw', '06 98 76 54 32', '0698765432', '06.98.76.54.32', '06/98/76/54/32', '7946 0958', '79460958',
  '3000 6000 0112', 'NWBK', '6016 1331', '０６９８７６５４３２', 'zqxwvu.cut@', '06 98 76 5'];
const fuites = corps => INTERDITS.filter(x => corps.includes(x));

(async () => {
  console.log('\n── test-2975 : ce qu\'un incident envoie à Anthropic ──');
  const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const COUR = fs.readFileSync(path.join(RACINE, 'opcourrier.js'), 'utf8').split('\n');
  const LIGNE_ADR = COUR.findIndex(l => l.includes('contact@exemple.fr')) + 1;
  v('(population) le dépôt porte une adresse dans opcourrier.js, qui sert d\'extrait de code', LIGNE_ADR > 0, true);
  /* une seule définition : l'incident n'embarque ni sa propre expression de numéro ni sa propre expression d'adresse */
  v('server/index.js : le filtre de l\'incident est `pourAnthropic` de agents-connaissance.js (une seule définition), appelé sur le message, la trace et la cause',
    [/require\('\.\/agents-connaissance'\)/.test(SRV), (SRV.match(/incidentTexte\(issue\.message\)/g) || []).length, (SRV.match(/incidentTexte\(issue\.stack\)/g) || []).length, /incidentTexte\(e\.cause\)/.test(SRV)], [true, 2, 2, true]);
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE (partie serveur) : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }

  const recus = [];
  let PROPOSITION = null;   /* null : « aucun correctif sûr » (avant = après) ; une fonction : une vraie proposition, pour la section 7 */
  const gh = [];            /* ce que reçoit le FAUX GitHub */
  const fauxGh = http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
    gh.push({ m: q.method, url: q.url, brut: b });
    const rep = /\/git\/ref\/heads\/main/.test(q.url) ? { object: { sha: 'aaaa' } } : /\/contents\//.test(q.url) && q.method === 'GET' ? { sha: 'bbbb' } : /\/pulls$/.test(q.url) ? { html_url: 'http://127.0.0.1/pr/1', number: 1 } : {};
    r.writeHead(200, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(rep));
  }); });
  await new Promise(r => fauxGh.listen(0, '127.0.0.1', r));
  const faux = http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
    let j = {}; try { j = JSON.parse(b); } catch (e) {} recus.push({ url: q.url, brut: b, corps: j });
    const props = (((j.output_config || {}).format || {}).schema || {}).properties || {};
    const texte = props.avant
      ? JSON.stringify(PROPOSITION ? PROPOSITION() : { titre: 't', pourquoi: 'p', fichier: 'opcourrier.js', avant: 'x', apres: 'x', verifier: 'v', risque: 'faible' })
      : JSON.stringify({ cause: 'Le champ lu vaut zqxwvu.echo@entreprise-zqxw.test (MARQUEUR-CAUSE) et le téléphone 06 98 76 54 32.', ou: 'opcourrier.js', verifier: 'Rejouer', confiance: 'moyenne' });
    r.writeHead(200, { 'Content-Type': 'application/json' });
    r.end(JSON.stringify({ id: 'msg_x', type: 'message', role: 'assistant', model: j.model, stop_reason: 'end_turn', content: [{ type: 'text', text: texte }], usage: { input_tokens: 1, output_tokens: 1 } }));
  }); });
  await new Promise(r => faux.listen(0, '127.0.0.1', r));
  const D = path.join(banc, 'data'); fs.mkdirSync(D);
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')), vap = webpush.generateVAPIDKeys();
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'), MDP = 'mot-de-passe-du-banc-2975';
  const CONFIG = path.join(banc, 'config.json');
  fs.writeFileSync(CONFIG, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), anthropic: { cleApi: 'sk-ant-banc' },
    github: { token: 'jeton-du-banc', depot: 'banc/depot' } }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', hash: kh(MDP), role: 'patron', actif: true, ts: Date.now() }] }));
  const port = await libre(), B = 'http://127.0.0.1:' + port; let sortie = '';
  srv = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: CONFIG, TEAMOP_DATA: D, PORT: String(port),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), ANTHROPIC_BASE_URL: 'http://127.0.0.1:' + faux.address().port, TEAMOP_GITHUB_API_URL: 'http://127.0.0.1:' + fauxGh.address().port }), stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', d => { sortie += d; }); srv.stderr.on('data', d => { sortie += d; });
  let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  v('le vrai serveur démarre', vivant, true);
  const login = async () => (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json()).token;
  const T = await login(); v('(population) une session de la Tour', !!T, true);
  const aut = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + T };
  const post = async (url, corps) => { const r = await fetch(B + url, { method: 'POST', headers: aut, body: JSON.stringify(corps) }); let j = {}; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };
  const rapporter = async r0 => (await fetch(B + '/api/monitor/report', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ reports: [Object.assign({ type: 'erreur', app: 'elan', entreprise: 'Entreprise du banc' }, r0)] }) })).status;
  const issues = async () => (await (await fetch(B + '/api/monitor/issues', { headers: aut })).json()).issues;
  const trouver = async sig => (await issues()).find(i => i.signature.endsWith('|' + sig));

  /* ── 1 · le rapport public ── */
  const MESSAGE = 'Adresse invalide : zqxwvu.banc@entreprise-zqxw.test, tel 06 98 76 54 32 · +44 20 7946 0958 · ０６９８７６５４３２ · 06/98/76/54/32 · 06.98.76.54.32 MARQUEUR-MSG';
  const PILE = 'Error: saisie\n at lire (https://127.0.0.1/app.html?mail=lea.zqxw%40exemple-banc.test&t=1:12:5)\n at iban FR76 3000 6000 0112 3456 7890 189 puis GB29 NWBK 6016 1331 9268 19 MARQUEUR-PILE';
  v('le rapport public est accepté (200)', await rapporter({ signature: 'sig-complet', message: MESSAGE, stack: PILE, src: 'opcourrier.js', line: LIGNE_ADR, version: '0698765432', origine: 'fn0698765432x', categorie: 'Clients' }), 200);
  const i1 = await trouver('sig-complet');
  v('(population) l\'incident est dans la Tour avec son texte ORIGINAL (adresse, numéro, IBAN en clair)', [!!i1, !!i1 && i1.message.includes('zqxwvu.banc@entreprise-zqxw.test'), !!i1 && i1.message.includes('06 98 76 54 32'), !!i1 && i1.stack.includes('FR76 3000 6000 0112')], [true, true, true, true]);

  /* ── 2 · Expliquer la cause ── */
  let n0 = recus.length;
  let r = await post('/api/monitor/expliquer', { id: i1.id });
  v('Expliquer : 200, et le faux Anthropic est appelé UNE fois', [r.s, recus.length - n0], [200, 1]);
  const e1 = recus[recus.length - 1] || { brut: '', corps: {} };
  const ctx1 = ((e1.corps.messages || [])[0] || {}).content || '';
  v('(population) le contexte a la forme attendue : incident, message, trace, extrait du dépôt', [/^Incident\n/.test(ctx1), ctx1.includes('- message : '), ctx1.includes('- trace :'), ctx1.includes('Code du dépôt autour de opcourrier.js:' + LIGNE_ADR)], [true, true, true, true]);
  v('⛔ rien d\'une adresse, d\'un numéro ou d\'un IBAN du rapport n\'arrive chez Anthropic (aucune des variantes)', fuites(e1.brut), []);
  v('…le reste du texte arrive (contre-épreuve : les marqueurs du message et de la trace, la version, l\'écran)', [ctx1.includes('MARQUEUR-MSG'), ctx1.includes('MARQUEUR-PILE'), ctx1.includes('Adresse invalide'), ctx1.includes('écran ouvert : Clients'), ctx1.includes('app.html?mail=')], [true, true, true, true, true]);
  v('…et les valeurs masquées le sont par les mots du filtre existant', [ctx1.includes('(adresse)'), ctx1.includes('(numéro)'), ctx1.includes('(IBAN)')], [true, true, true]);
  v('⛔ la version (10 chiffres) et l\'origine (chiffres au milieu d\'un nom) sont filtrées aussi', [ctx1.includes('v0698765432'), ctx1.includes('origine : fn0698765432x'), /application : elan v\(numéro\)/.test(ctx1), ctx1.includes('origine : fn(numéro)x')], [false, false, true, true]);
  v('⛔ l\'extrait de code du dépôt est filtré aussi (l\'adresse de opcourrier.js n\'arrive pas), et ses numéros de ligne restent', [e1.brut.includes('contact@exemple.fr'), ctx1.includes('(adresse)'), new RegExp('\\s' + LIGNE_ADR + ' ▶ ').test(ctx1)], [false, true, true]);
  const ex = (await issues()).find(i => i.id === i1.id);
  v('⛔ la Tour GARDE l\'original : le message et la trace de l\'incident sont inchangés', [ex.message === MESSAGE, ex.stack === PILE], [true, true]);

  /* ── 2 bis · la source, quand la trace ne désigne aucun fichier du dépôt ── */
  await rapporter({ signature: 'sig-src', message: 'Échec MARQUEUR-SRC', src: 'https://127.0.0.1/inconnu.js?mail=zqxwvu.src@entreprise-zqxw.test&tel=0698765432', line: 4 });
  const i2 = await trouver('sig-src');
  n0 = recus.length; r = await post('/api/monitor/expliquer', { id: i2.id });
  const e2 = recus[recus.length - 1] || { brut: '', corps: {} }, ctx2 = ((e2.corps.messages || [])[0] || {}).content || '';
  v('Expliquer sans extrait : l\'appel a eu lieu, la source est citée SANS adresse ni numéro', [r.s, recus.length - n0, ctx2.includes('Aucun extrait de code'), ctx2.includes('inconnu.js'), fuites(e2.brut)], [200, 1, true, true, []]);

  /* ── 3 · coupés à la longueur de stockage ── */
  const base = 'MARQUEUR-COUPE ';
  const msgCoupe = base + 'y'.repeat(300 - base.length - 12) + ' zqxwvu.cut@' + 'exemple-banc.test';
  const pileCoupe = base + 'y'.repeat(600 - base.length - 1 - 10) + ' 06 98 76 5' + '4 32 fin';
  await rapporter({ signature: 'sig-coupe', message: msgCoupe, stack: pileCoupe, src: 'opcourrier.js', line: LIGNE_ADR });
  const i3 = await trouver('sig-coupe');
  v('(population) le texte stocké a bien été COUPÉ au milieu de l\'adresse et du numéro (c\'est ce que le filtre doit rattraper)', [i3.message.endsWith('zqxwvu.cut@'), i3.stack.endsWith('06 98 76 5'), i3.message.length, i3.stack.length], [true, true, 300, 600]);
  n0 = recus.length; r = await post('/api/monitor/expliquer', { id: i3.id });
  const e3 = recus[recus.length - 1] || { brut: '', corps: {} }, ctx3 = ((e3.corps.messages || [])[0] || {}).content || '';
  v('⛔ le bout d\'une adresse (« …@ ») et le bout d\'un numéro (« 06 98 76 5 ») coupés par la troncature sont masqués', [r.s, recus.length - n0, fuites(e3.brut), ctx3.includes('MARQUEUR-COUPE')], [200, 1, [], true]);

  /* ── 4 · Proposer un correctif ── */
  n0 = recus.length; r = await post('/api/monitor/proposer', { id: i1.id });
  const e4 = recus[recus.length - 1] || { brut: '', corps: {} }, ctx4 = ((e4.corps.messages || [])[0] || {}).content || '';
  v('Proposer : l\'appel à Anthropic a lieu (UNE fois) ; le faux répond « aucun correctif sûr » (422), rien n\'est proposé', [recus.length - n0, r.s], [1, 422]);
  v('(population) le contexte est celui de Proposer : incident, cause établie, emplacement, trace, code', [ctx4.startsWith('Incident : '), ctx4.includes('Cause établie : '), ctx4.includes('Emplacement : opcourrier.js ligne ' + LIGNE_ADR), ctx4.includes('Trace :\n'), ctx4.includes('Code du dépôt (opcourrier.js')], [true, true, true, true, true]);
  const sansCode = ctx4.slice(0, ctx4.indexOf('\nCode du dépôt'));
  v('⛔ le message, la trace ET la cause rendue par le modèle (qui avait recopié une adresse et un numéro) sont filtrés', [fuites(sansCode), sansCode.includes('MARQUEUR-MSG'), sansCode.includes('MARQUEUR-PILE'), sansCode.includes('MARQUEUR-CAUSE')], [[], true, true, true]);
  v('le CODE de la fenêtre reste tel quel : le modèle doit en recopier un fragment au caractère près (l\'adresse du dépôt y est encore)', ctx4.includes('contact@exemple.fr'), true);

  /* ── 6 · un numéro DANS une URL, ou en paires ── */
  const FORMES_URL = ['06%2098%2076%2054%2032', '06+98+76+54+32', '%2B33%206%2098%2076%2054%2032', '+33+6+98+76+54+32', '06_98_76_54_32', '06,98,76,54,32'];
  const PILE_URL = 'Error: appel\n at f (https://127.0.0.1/api/x?a=' + FORMES_URL.slice(0, 4).join('&b=') + '&c=' + FORMES_URL[4] + '&d=' + FORMES_URL[5] + '&n=3+4%205&q=12%2034%2056 MARQUEUR-URL)';
  await rapporter({ signature: 'sig-url', message: 'Paramètres : tel=' + FORMES_URL[0] + ' puis ' + FORMES_URL[1] + ' MARQUEUR-MSGURL', stack: PILE_URL, src: 'opcourrier.js', line: LIGNE_ADR });
  const i6 = await trouver('sig-url');
  v('(population) les six formes sont dans l\'incident stocké, EN CLAIR (ce que la Tour montre)', FORMES_URL.every(f => (i6.message + i6.stack).includes(f)), true);
  n0 = recus.length; r = await post('/api/monitor/expliquer', { id: i6.id });
  const e6 = recus[recus.length - 1] || { brut: '', corps: {} }, ctx6 = ((e6.corps.messages || [])[0] || {}).content || '';
  v('⛔ aucune des six formes d\'un numéro (%20, +, %2B, paires « _ » et « , ») n\'arrive chez Anthropic — ni un morceau de chiffres', [r.s, recus.length - n0, FORMES_URL.filter(f => ctx6.includes(f)), /98(?:%20|\+|_|,)76/.test(ctx6)], [200, 1, [], false]);
  v('…le reste arrive (contre-épreuve : les marqueurs, « 3+4%205 » et « 12%2034%2056 » (six chiffres : les « 20 » du %20 ne comptent pas), qui ne sont pas des téléphones, restent lisibles)', [ctx6.includes('MARQUEUR-MSGURL'), ctx6.includes('MARQUEUR-URL'), ctx6.includes('n=3+4%205'), ctx6.includes('q=12%2034%2056'), ctx6.includes('(numéro)')], [true, true, true, true, true]);

  /* ── 7 · Proposer jusqu'à la demande de fusion : ce que reçoit GitHub ── */
  const FICHIER_BRUT = fs.readFileSync(path.join(RACINE, 'opcourrier.js'), 'utf8');
  const FRAG = COUR.map(l => l.trim()).find(t => t.length > 30 && t.length < 90 && /;$/.test(t) && !/^(\/\/|\*|\/\*)/.test(t) && !/[@'`]/.test(t) && FICHIER_BRUT.split(t).length === 2);
  v('(population) un fragment du dépôt qui n\'apparaît qu\'UNE fois, pour que la proposition passe tous les verrous', !!FRAG, true);
  PROPOSITION = () => ({ titre: 'Titre MARQUEUR-TITRE zqxwvu.titre@entreprise-zqxw.test', fichier: 'opcourrier.js', avant: FRAG, apres: FRAG + ' ',
    pourquoi: 'Le champ vaut zqxwvu.pourquoi@entreprise-zqxw.test, tel 06%2098%2076%2054%2032 MARQUEUR-POURQUOI.', verifier: 'Rejouer avec 06 98 76 54 32 et zqxwvu.verif@entreprise-zqxw.test MARQUEUR-VERIF', risque: 'faible' });
  n0 = recus.length; const g0 = gh.length;
  r = await post('/api/monitor/proposer', { id: i1.id, refaire: true });
  v('Proposer va au bout : 200, une proposition ouverte chez le faux GitHub (branche, fichier, demande de fusion)', [r.s, !!(r.j && r.j.proposition), gh.slice(g0).filter(x => x.m === 'POST' && /\/pulls$/.test(x.url)).length, gh.slice(g0).filter(x => x.m === 'PUT').length], [200, true, 1, 1]);
  const pull = JSON.parse((gh.slice(g0).find(x => /\/pulls$/.test(x.url)) || { brut: '{}' }).brut), put = JSON.parse((gh.slice(g0).find(x => x.m === 'PUT') || { brut: '{}' }).brut);
  const visible = [pull.body, pull.title, put.message].join('\n=====\n');
  v('(population) le corps, le titre et le message de commit portent bien l\'incident, la cause et le texte du modèle', [pull.body.includes('MARQUEUR-MSG'), pull.body.includes('MARQUEUR-CAUSE'), pull.body.includes('MARQUEUR-POURQUOI'), pull.body.includes('MARQUEUR-VERIF'), pull.title.includes('MARQUEUR-TITRE'), put.message.includes('MARQUEUR-TITRE')], [true, true, true, true, true, true]);
  v('⛔ rien d\'une adresse ni d\'un numéro n\'arrive chez GitHub (corps, titre, message de commit)', [fuites(visible), ['zqxwvu.titre', 'zqxwvu.pourquoi', 'zqxwvu.verif', '06%2098', 'entreprise-zqxw'].filter(x => visible.includes(x))], [[], []]);
  const ex7 = (await issues()).find(i => i.id === i1.id);
  v('⛔ la Tour GARDE l\'original : le message de l\'incident et la cause établie sont intacts', [ex7.message === MESSAGE, ex7.explication.cause.includes('zqxwvu.echo@entreprise-zqxw.test')], [true, true]);

  /* ── 5 · rien du texte brut au journal du serveur ── */
  await dormir(200);
  v('⛔ rien de l\'adresse ni du numéro de l\'incident n\'entre au journal du serveur', [sortie.includes('zqxwvu'), sortie.includes('0698765432')], [false, false]);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  faux.close(); fauxGh.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
