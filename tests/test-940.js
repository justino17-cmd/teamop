/* ⛔ CE QUE CE FICHIER GARDE — LA TOUR v2.81 OUVRE DES ACCÈS BÊTA POUR OP MESSAGES, CONTRE LE VRAI SERVEUR D'OP GESTION.

   Justin, 1er octobre 2026 : « j'aimerais tester l'application [OP MESSAGES] aussi ; fais un lien bêta dans la Tour, fais le
   même système pour les accès comme OP GESTION ». Deux moitiés, chacune juste de son côté, et c'est leur COUTURE qu'on garde :
     · le serveur (`server/index.js`) : un accès porte `apps` (gestion, messages) ; `POST /api/monitor/beta` l'accepte,
       `POST /api/monitor/beta/apps` le règle, `/api/beta/login` et `/etat` le lisent (`app`) ;
     · la Tour (`tour.html`) : la console MESSAGES a son « Accès » (liste, fiche, formulaire), ne montre que les accès qui
       ont « messages », crée avec `apps:['messages']` (plus « gestion » si la case est cochée), règle les deux cases de la fiche.

   ⛔ LES VRAIES FONCTIONS DE LA TOUR (btAjouter, btAppsBasculer, btToggle, btSuppr, chargerEssais, accBlocBeta, accFicheBeta…),
   extraites de `tour.html`, CONTRE LE VRAI `server/index.js` isolé (127.0.0.1, rien ne sort). Un « serveur d'avant » est simulé
   par un relais qui RETIRE `apps` (de la requête et des réponses) : c'est ce que fait un serveur qui ne connaît pas le champ.
   Ce que le banc exige de VOIR à l'écran, pas seulement dans la base : la fiche dit l'adresse de la bêta d'OP MESSAGES, le
   bouton « Copier le lien », et que la bêta n'est pas encore installée (Justin n'a pas fait les gestes).
   Il saute de lui-même sans `server/node_modules` (comme `test-833`). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRC_TOUR = fs.readFileSync(process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(RACINE, 'tour.html'), 'utf8');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b940-'));
let enfant = null, relais = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (relais) relais.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();

/* ── Les fonctions de la Tour, ancrées sur leur DÉCLARATION (le fichier est très commenté : on retire d'abord les commentaires
   qui COMMENCENT une ligne — jamais les autres, voir CLAUDE.md). Une fonction va jusqu'à la prochaine déclaration de premier niveau :
   un balayage d'accolades se tromperait sur les littéraux d'expressions régulières (`/[&<>"']/g`). ── */
const CODE = SRC_TOUR.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function bloc(motif) {
  const m = new RegExp('\\n(?:async )?function ' + motif + '\\(|\\nvar ' + motif + '\\s*=').exec(CODE); if (!m) return '';
  const suite = /\n(?:async function |function |var |setInterval|document\.)/g; suite.lastIndex = m.index + 8;
  const f = suite.exec(CODE);
  return CODE.slice(m.index + 1, f ? f.index : CODE.length);
}
const NOMS = ['hAuth', 'srvRepond', 'srvMuet', 'apiGet', 'apiPost', 'msgErreur', 'chargerEssais', 'btChamp', 'btAjouter', 'btToggle', 'btSuppr', 'btChantier',
  'btAppsDe', 'btAvec', 'btDeLaConsole', 'btAppsBasculer', 'accLigneBeta', 'accBlocBeta', 'accFicheBeta', 'accFormBeta', 'vueEssaisMsg', 'esc', 'jsq', 'ini', 'fmtJour', 'videTour'];
const VARS = ['BT', 'BT_APPS', 'BETA_MSG_ADRESSE', 'APPS_TOUR', 'INJOIGNABLE'];
const SRC = NOMS.map(bloc), SRCV = VARS.map(bloc);

function tour(API, jeton, app, { confirmer = true } = {}) {
  const toasts = [], panneaux = [], ctx = { fetch, URL, Object, String, JSON, Promise, Math, Date, Array, Error, document: { getElementById: () => null }, console };
  vm.createContext(ctx);
  vm.runInContext('var API=' + JSON.stringify(API) + ', TOKEN=' + JSON.stringify(jeton) + ', APP=' + JSON.stringify(app) + ", TAB='essais', MYROLE='patron', MYNOM='Patron banc';\n" +
    "var JR={actions:[]}, IC={cadenas:''}; function doLogout(){} function srvEtat(){} function render(){} function squelListe(){ return '<i class=\"squel\"></i>'; }\n" +
    "function svg(){ return ''; } function enTete(t,p){ return '<div class=\"page-tete\">'+t+' — '+p+'</div>'; } function accAllerForm(){} function tourCopie(){}\n" +
    SRCV.join('\n') + '\n' + SRC.join('\n'), ctx);
  ctx.toast = (t) => { toasts.push(t); };
  ctx.confirm = () => confirmer; ctx.prompt = () => null;
  ctx.tourPanneau = (html) => { panneaux.push(html); };
  ctx.tourPanneauFermer = () => {};
  return { ctx, toasts, panneaux, run: (code) => vm.runInContext(code, ctx),
    attendre: async (cond, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await vm.runInContext(cond, ctx)) return true; await dormir(50); } return false; } };
}
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const libre = () => new Promise(r => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

console.log('\n── 940 · la Tour v2.81 ouvre les accès bêta d\'OP MESSAGES : ses vraies fonctions contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  console.log('\n0. Population : de quoi parler');
  vrai('les ' + NOMS.length + ' fonctions et les ' + VARS.length + ' variables de la Tour sont trouvées', SRC.every(Boolean) && SRCV.every(Boolean));
  if (!(SRC.every(Boolean) && SRCV.every(Boolean))) { console.log('      manquent : ' + [...NOMS.filter((n, i) => !SRC[i]), ...VARS.filter((n, i) => !SRCV[i])].join(', ')); process.exit(1); }
  vrai('la Tour porte sa version v2.81', /\bvar TOUR_VERSION='v2\.81'/.test(CODE));
  vrai('« Accès » est au menu des DEUX consoles', /\['essais','Accès','gestion messages'\]/.test(CODE));
  vrai('⛔ le texte périmé de Firebase pour OP MESSAGES a disparu de la Tour (plus de FB_CONFIG, plus de règles Firestore d\'OP MESSAGES)', !/FB_CONFIG|firestore-opmessages/.test(CODE));
  vrai('le lien de la bêta d\'OP MESSAGES est https://msg-beta.teamop.fr', /var BETA_MSG_ADRESSE='https:\/\/msg-beta\.teamop\.fr'/.test(CODE));

  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const vap = webpush.generateVAPIDKeys(), MDP = 'mot-de-passe-du-banc-940';
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP) }));
  /* ⛔ UN FICHIER D'AVANT : un accès écrit par le serveur d'AVANT `apps` n'a pas le champ. Le banc ne peut pas le fabriquer par la route
     (le serveur neuf grave toujours `apps` à la création) : on l'écrit comme l'ancien serveur l'écrivait, AVANT de démarrer. */
  fs.writeFileSync(path.join(D, 'beta-comptes.json'), JSON.stringify([{ id: 'b0a1b2c3d4e5', login: 'ancien', nom: 'Accès d\'avant', chantier: 'écrit avant apps', hash: sha('pw-ancien-940-a'), actif: true, ts: Date.now() - 86400000, creePar: 'Patron' }]));
  const PORT = await libre();
  let journal = '';
  enfant = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre', vivant);
  if (!vivant) { console.log(journal.slice(0, 800)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: JSON.stringify(corps) });
    let j = {}; try { j = JSON.parse(await r.text()); } catch (e) {} return { s: r.status, j }; };
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
  vrai('la Tour ouvre une session de patron', PATRON);
  const lire = async (jeton) => (await (await fetch(B + '/api/monitor/beta', { headers: { Authorization: 'Bearer ' + jeton } })).json()).comptes;
  const parLogin = async (l) => (await lire(PATRON)).find(c => c.login === l);
  const saisir = (T, login, mdp, extra) => T.run('BT.login=' + JSON.stringify(login) + '; BT.nom=' + JSON.stringify('Nom ' + login) + '; BT.pass=' + JSON.stringify(mdp) + '; BT.chantier="banc 940"; BT.aussi=' + (extra ? 'true' : 'false') + ';');

  try {
    console.log('\n1. Créer depuis la console MESSAGES (btAjouter) : « messages » seul');
    const TM = tour(B, PATRON, 'messages');
    saisir(TM, 'mona', 'pw-mona-940-a');
    TM.run('btAjouter()');
    vrai('population : l\'accès est créé (la Tour recharge sa liste)', await TM.attendre('BT.comptes.some(function(c){ return c.login==="mona"; })'));
    const mona = await parLogin('mona');
    v('⛔ le serveur a gravé apps = [\'messages\'] (la Tour l\'envoie, le serveur le lit)', mona && mona.apps, ['messages']);
    v('   la console MESSAGES le montre', TM.run('btDeLaConsole().map(function(c){ return c.login; })'), ['mona']);
    const TG = tour(B, PATRON, 'gestion');
    TG.run('chargerEssais()'); await TG.attendre('BT.loaded');
    v('⛔ la console GESTION ne le montre PAS (il n\'ouvre pas la bêta d\'OP GESTION) : elle ne montre que l\'accès d\'avant', TG.run('btDeLaConsole().map(function(c){ return c.login; })'), ['ancien']);
    vrai('   et sa liste ne contient pas son identifiant', !/mona/.test(TG.run('accBlocBeta()')));
    vrai('   la liste de la console MESSAGES, elle, le contient', /mona/.test(TM.run('accBlocBeta()')));

    console.log('\n2. Créer depuis la console GESTION : « gestion » seul — ce qui existait ne change pas');
    saisir(TG, 'gaston', 'pw-gaston-940-a');
    TG.run('btAjouter()');
    vrai('population : créé', await TG.attendre('BT.comptes.some(function(c){ return c.login==="gaston"; })'));
    v('apps = [\'gestion\']', (await parLogin('gaston')).apps, ['gestion']);
    v('la console GESTION le montre, avec l\'accès d\'avant (« gestion » par défaut)', TG.run('btDeLaConsole().map(function(c){ return c.login; })').sort(), ['ancien', 'gaston']);
    TM.run('chargerEssais()'); await TM.attendre('BT.comptes.length>=2');
    v('la console MESSAGES ne le montre pas', TM.run('btDeLaConsole().map(function(c){ return c.login; })'), ['mona']);

    console.log('\n3. La case « ouvre aussi la bêta d\'OP GESTION » du formulaire MESSAGES');
    saisir(TM, 'duo', 'pw-duo-940-aaa', true);
    TM.run('btAjouter()');
    vrai('population : créé', await TM.attendre('BT.comptes.some(function(c){ return c.login==="duo"; })'));
    v('⛔ apps = les deux quand la case est cochée (rangées dans l\'ordre du serveur)', (await parLogin('duo')).apps, ['gestion', 'messages']);
    TG.run('chargerEssais()'); await TG.attendre('BT.comptes.some(function(c){ return c.login==="duo"; })');
    v('il paraît dans les DEUX consoles', [TM.run('btAvec(BT.comptes.filter(function(c){ return c.login==="duo"; })[0],"messages")'), TG.run('btDeLaConsole().some(function(c){ return c.login==="duo"; })')], [true, true]);
    vrai('   et chaque ligne dit qu\'il ouvre AUSSI l\'autre application', /ouvre aussi OP GESTION/.test(TM.run('accBlocBeta()')) && /ouvre aussi OP MESSAGES/.test(TG.run('accBlocBeta()')));
    vrai('   la case est remise à zéro après la création', TM.run('BT.aussi') === false);
    const formM = TM.run('accFormBeta()'), formG = TG.run('accFormBeta()');
    vrai('   le formulaire MESSAGES porte la case, celui de GESTION non (inchangé)', /Ouvre aussi la bêta d’OP GESTION/.test(formM) && !/Ouvre aussi/.test(formG));
    vrai('   et chacun dit SA bêta : msg-beta.teamop.fr / teamop.fr/beta.html', /msg-beta\.teamop\.fr/.test(formM) && /teamop\.fr\/beta\.html/.test(formG) && !/msg-beta/.test(formG));

    console.log('\n4. La fiche : l\'adresse, « Copier le lien », et ce qui n\'est pas encore installé');
    TM.panneaux.length = 0; TM.run('accFicheBeta(' + JSON.stringify(mona.id) + ')');
    const fiche = TM.panneaux[0] || '';
    vrai('la fiche s\'ouvre', fiche.length > 200);
    vrai('⛔ elle dit « Sur msg-beta.teamop.fr : cet identifiant et son mot de passe »', /Sur <b>msg-beta\.teamop\.fr<\/b> : cet identifiant et son mot de passe/.test(fiche));
    vrai('⛔ elle porte le lien https://msg-beta.teamop.fr ET le bouton « Copier le lien » qui copie CE lien', /id="bt-lien-msg"[^>]*>https:\/\/msg-beta\.teamop\.fr<\/span>/.test(fiche) && /tourCopie\('bt-lien-msg',this\)">Copier le lien</.test(fiche));
    vrai('⛔ elle dit, sans affoler, que la bêta d\'OP MESSAGES n\'est pas encore installée (les gestes de Justin) et que l\'accès, lui, est prêt', /n’est pas encore installée/.test(fiche) && /INSTALLER-LE-SERVEUR\.md/.test(fiche) && /L’accès, lui, est prêt/.test(fiche));
    vrai('   un accès « messages » seul n\'affiche PAS l\'encart de teamop.fr/beta.html', !/teamop\.fr\/beta\.html/.test(fiche));
    const cases = {}; fiche.replace(/<input type="checkbox"( checked)? onchange="btAppsBasculer\('[^']+','(\w+)'/g, (m, c, a) => { cases[a] = !!c; return m; });
    v('   deux cases, une par application : OP GESTION décochée, OP MESSAGES cochée', cases, { gestion: false, messages: true });
    TG.panneaux.length = 0; TG.run('accFicheBeta(' + JSON.stringify((await parLogin('gaston')).id) + ')');
    vrai('la fiche d\'un accès « gestion » seul garde l\'encart de teamop.fr/beta.html et ne parle pas de msg-beta', /teamop\.fr\/beta\.html/.test(TG.panneaux[0]) && !/msg-beta/.test(TG.panneaux[0]));
    TM.panneaux.length = 0; TM.run('accFicheBeta(' + JSON.stringify((await parLogin('duo')).id) + ')');
    vrai('la fiche d\'un accès qui a les DEUX montre les deux adresses, celle de la console ouverte en premier', TM.panneaux[0].indexOf('msg-beta.teamop.fr') < TM.panneaux[0].indexOf('teamop.fr/beta.html') && /teamop\.fr\/beta\.html/.test(TM.panneaux[0]));

    console.log('\n5. Les cases de la fiche (btAppsBasculer, la vraie route /apps)');
    TM.run('btAppsBasculer(' + JSON.stringify(mona.id) + ',"messages",false)');
    await dormir(150);
    vrai('⛔ décocher la DERNIÈRE application est refusé par la Tour (« au moins une application »)', TM.toasts.some(t => /au moins une application/.test(t)));
    v('   et le serveur n\'a pas bougé', (await parLogin('mona')).apps, ['messages']);
    TM.run('btAppsBasculer(' + JSON.stringify(mona.id) + ',"gestion",true)');
    vrai('cocher OP GESTION : le serveur grave les deux', await (async () => { for (let i = 0; i < 60; i++) { const a = (await parLogin('mona')).apps; if (a.length === 2) return JSON.stringify(a) === JSON.stringify(['gestion', 'messages']); await dormir(50); } return false; })());
    TG.run('chargerEssais()'); await TG.attendre('BT.comptes.some(function(c){ return c.login==="mona"&&btAvec(c,"gestion"); })');
    v('   elle paraît alors dans la console GESTION', TG.run('btDeLaConsole().some(function(c){ return c.login==="mona"; })'), true);
    TM.run('btAppsBasculer(' + JSON.stringify(mona.id) + ',"gestion",false)');
    vrai('décocher OP GESTION : revient à messages seul', await (async () => { for (let i = 0; i < 60; i++) { const a = (await parLogin('mona')).apps; if (a.length === 1) return a[0] === 'messages'; await dormir(50); } return false; })());
    vrai('   et la Tour a journalisé le réglage', TM.run('JR.actions.some(function(a){ return /a réglé les applications/.test(a.tx); })'));

    console.log('\n6. Ce que la porte d\'OP GESTION répond, selon les cases (la vraie route de connexion)');
    const login = (l, p, app) => appel('/api/beta/login', app === undefined ? { login: l, pass: p } : { login: l, pass: p, app });
    v('« messages » seul : messages passe', (await login('mona', 'pw-mona-940-a', 'messages')).s, 200);
    const refus = await login('mona', 'pw-mona-940-a'), mauvais = await login('mona', 'pas-le-bon');
    v('⛔ « messages » seul demande « gestion » (beta.html n\'envoie rien) : EXACTEMENT la réponse d\'un mauvais mot de passe', [refus.s, refus.j], [mauvais.s, mauvais.j]);
    v('« gestion » seul : gestion passe, messages est refusé comme un mauvais mot de passe', [(await login('gaston', 'pw-gaston-940-a')).s, (await login('gaston', 'pw-gaston-940-a', 'messages')).j], [200, mauvais.j]);
    v('les deux : les deux passent', [(await login('duo', 'pw-duo-940-aaa')).s, (await login('duo', 'pw-duo-940-aaa', 'messages')).s], [200, 200]);

    console.log('\n7. Couper, rouvrir, supprimer : mêmes gestes que pour OP GESTION (btToggle, btSuppr), depuis la console MESSAGES');
    TM.run('btToggle(' + JSON.stringify(mona.id) + ')');
    vrai('couper depuis la Tour : actif passe à false', await (async () => { for (let i = 0; i < 60; i++) { if ((await parLogin('mona')).actif === false) return true; await dormir(50); } return false; })());
    vrai('   la liste le montre « Coupé »', await TM.attendre('BT.comptes.some(function(c){ return c.login==="mona"&&c.actif===false; })') && /Coupé/.test(TM.run('accBlocBeta()')));
    const coupe = await login('mona', 'pw-mona-940-a', 'messages');
    v('   la porte répond « coupé » à qui a le bon mot de passe (OP MESSAGES le traduit en acces_coupe)', [coupe.s, /coup/i.test(coupe.j.error || '')], [403, true]);
    const etat = await appel('/api/beta/etat', { ids: [mona.id], app: 'messages' });
    v('   et la relecture d\'OP MESSAGES lit false pour son identifiant de compte', [etat.s, etat.j.ouverts[mona.id]], [200, false]);
    TM.run('btToggle(' + JSON.stringify(mona.id) + ')');
    vrai('rouvrir : actif revient', await (async () => { for (let i = 0; i < 60; i++) { if ((await parLogin('mona')).actif === true) return true; await dormir(50); } return false; })());
    TM.run('btSuppr(' + JSON.stringify(mona.id) + ',"mona")');
    vrai('supprimer (après confirmation) : l\'accès disparaît du serveur', await (async () => { for (let i = 0; i < 60; i++) { if (!(await parLogin('mona'))) return true; await dormir(50); } return false; })());
    v('   et la relecture dit false (accès inconnu = comme coupé)', (await appel('/api/beta/etat', { ids: [mona.id], app: 'messages' })).j.ouverts[mona.id], false);

    console.log('\n8. Un accès créé par la Tour D\'AVANT (sans `apps`) n\'ouvre qu\'OP GESTION — rien ne s\'ouvre en silence');
    const ancien = await appel('/api/monitor/beta', { login: 'avant', pass: 'pw-avant-940-a', nom: 'Avant', chantier: 'banc 940' }, PATRON);
    v('le serveur le grave « gestion »', [ancien.s, ancien.j.compte.apps], [200, ['gestion']]);
    TM.run('chargerEssais()'); await TM.attendre('BT.comptes.some(function(c){ return c.login==="avant"; })');
    v('la console MESSAGES ne le montre pas', TM.run('btDeLaConsole().some(function(c){ return c.login==="avant"; })'), false);
    v('une liste d\'applications fausse est refusée : 400 (vide, inconnue, pas une liste)', [(await appel('/api/monitor/beta', { login: 'x1x', pass: 'pw-x1x-940-aa', apps: [] }, PATRON)).s, (await appel('/api/monitor/beta', { login: 'x2x', pass: 'pw-x2x-940-aa', apps: ['compta'] }, PATRON)).s, (await appel('/api/monitor/beta/apps', { id: ancien.j.compte.id, apps: 'messages' }, PATRON)).s], [400, 400, 400]);
    v('la route /apps d\'un accès inconnu : 404, et sans jeton de patron : refusée', [(await appel('/api/monitor/beta/apps', { id: 'bnexistepas', apps: ['gestion'] }, PATRON)).s, [401, 403].includes((await appel('/api/monitor/beta/apps', { id: ancien.j.compte.id, apps: ['messages'] })).s)], [404, true]);

    const anc = await parLogin('ancien');
    v('⛔ un accès ÉCRIT PAR LE SERVEUR D\'AVANT (fichier sans `apps`) est rendu « gestion » seul — rien ne s\'ouvre en silence', anc && anc.apps, ['gestion']);
    v('   la console MESSAGES ne le montre pas', TM.run('btDeLaConsole().some(function(c){ return c.login==="ancien"; })'), false);
    const ancMsg = await login('ancien', 'pw-ancien-940-a', 'messages');
    v('   et la porte d\'OP MESSAGES le refuse comme un mauvais mot de passe, alors que OP GESTION l\'accepte', [ancMsg.s, ancMsg.j, (await login('ancien', 'pw-ancien-940-a')).s], [403, mauvais.j, 200]);

    console.log('\n9. Face à un serveur D\'AVANT (qui ne connaît pas `apps`) la Tour le DIT au lieu de croire');
    relais = http.createServer((q, r) => {
      let c = ''; q.on('data', d => { c += d; }); q.on('end', async () => {
        let corps = c; try { const o = JSON.parse(c || '{}'); delete o.apps; corps = JSON.stringify(o); } catch (e) {}
        const h = { 'Content-Type': 'application/json' }; if (q.headers.authorization) h.Authorization = q.headers.authorization;
        const x = await fetch(B + q.url, { method: q.method, headers: h, body: q.method === 'POST' ? corps : undefined });
        let t = await x.text(); try { const o = JSON.parse(t); if (o.comptes) o.comptes.forEach(k => delete k.apps); if (o.compte) delete o.compte.apps; t = JSON.stringify(o); } catch (e) {}
        r.writeHead(x.status, { 'Content-Type': 'application/json' }); r.end(t);
      });
    });
    await new Promise(res => relais.listen(0, '127.0.0.1', res));
    const VIEUX = 'http://127.0.0.1:' + relais.address().port;
    const TV = tour(VIEUX, PATRON, 'messages');
    TV.run('chargerEssais()'); await TV.attendre('BT.loaded');
    vrai('⛔ la console MESSAGES ne fait pas croire à une liste vide : « Le serveur ne connaît pas encore OP MESSAGES »', /Le serveur ne connaît pas encore OP MESSAGES/.test(TV.run('accBlocBeta()')));
    saisir(TV, 'vieux', 'pw-vieux-940-aa');
    TV.run('btAjouter()');
    vrai('⛔ créer depuis MESSAGES prévient que l\'accès n\'ouvre que la bêta d\'OP GESTION (pas de faux « ouvert »)', await TV.attendre('1', 1) && await (async () => { for (let i = 0; i < 60; i++) { if (TV.toasts.some(t => /ne connaît pas encore OP MESSAGES/.test(t))) return true; await dormir(50); } return false; })());
    v('   et il est bien « gestion » seul côté serveur', (await parLogin('vieux')).apps, ['gestion']);
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); ko++;
    console.log(journal.slice(-800));
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})();
