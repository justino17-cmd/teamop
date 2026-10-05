/* ⛔ CE QUE CE FICHIER GARDE — LA TOUR v2.81 OUVRE DES ACCÈS BÊTA POUR OP MESSAGES, CONTRE LE VRAI SERVEUR D'OP GESTION.

   Justin, 1er octobre 2026 : « j'aimerais tester l'application [OP MESSAGES] aussi ; fais un lien bêta dans la Tour, fais le
   même système pour les accès comme OP GESTION ». Puis le 2 octobre, capture de la console MESSAGES à l'appui : « je veux
   pouvoir créer les accès d'OP MESSAGES ici, car je veux que ça soit bien séparé dans la Tour ». Deux moitiés, chacune juste
   de son côté, et c'est leur COUTURE qu'on garde :
     · le serveur (`server/index.js`) : un accès ouvre UNE application (`apps`, gravé à la création) ; un même identifiant peut
       exister dans les deux bêtas, chacun avec son mot de passe — l'unicité, la porte (`/api/beta/login`), la relecture
       (`/etat`) et le verrou se lisent par (identifiant, application) ;
     · la Tour (`tour.html`) : chaque console a son « Accès » (liste, fiche, formulaire), ne montre que les SIENS et crée avec
       `apps:[son application]` — plus de case « ouvre aussi », plus de cases croisées dans la fiche.

   ⛔ LES VRAIES FONCTIONS DE LA TOUR (btAjouter, btToggle, btSuppr, chargerEssais, accBlocBeta, accFicheBeta…),
   extraites de `tour.html`, CONTRE LE VRAI `server/index.js` isolé (127.0.0.1, rien ne sort). Un « serveur d'avant » est simulé
   par un relais qui RETIRE `apps` (de la requête et des réponses) : c'est ce que fait un serveur qui ne connaît pas le champ.
   Ce que le banc exige de VOIR à l'écran, pas seulement dans la base : la fiche dit l'adresse de la bêta d'OP MESSAGES, le
   bouton « Copier le lien », et que la bêta n'est pas encore installée (Justin n'a pas fait les gestes).
   v2.83 (§ 11) : « Nouveau mot de passe » (Justin, 5 octobre 2026 : « il faudrait mot de passe oublié ») — la vraie `btMdp` contre la vraie route
   `/api/monitor/beta/mdp` : refus (sans jeton, collaborateur, inconnu, trop court), l'ancien mot de passe refusé ensuite, le même compte, rien de
   secret dans la réponse ni le journal, un refus ou une coupure LUS à l'écran. La chute des sessions d'OP MESSAGES est dans `test-945`.
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
  'btMdp', 'tirageSur', 'btAppsDe', 'btAvec', 'btDeLaConsole', 'accLigneBeta', 'accBlocBeta', 'accFicheBeta', 'accFormBeta', 'vueEssaisMsg', 'vueAccueilMsg', 'esc', 'jsq', 'ini', 'fmtJour', 'videTour'];
const VARS = ['BT', 'BT_APPS', 'BETA_MSG_ADRESSE', 'APPS_TOUR', 'INJOIGNABLE'];
const SRC = NOMS.map(bloc), SRCV = VARS.map(bloc);

function tour(API, jeton, app, { confirmer = true } = {}) {
  const toasts = [], panneaux = [], ctx = { fetch, URL, Object, String, JSON, Promise, Math, Date, Array, Error, crypto: globalThis.crypto, Uint8Array, document: { getElementById: () => null }, console };
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
  const vTour = (/\bvar TOUR_VERSION='v(\d+)\.(\d+)'/.exec(CODE) || []).slice(1).map(Number);   // « au moins » : la Tour monte à chaque correction
  vrai('la Tour porte au moins la v2.81 (accès bêta séparés par console)', vTour.length === 2 && (vTour[0] > 2 || (vTour[0] === 2 && vTour[1] >= 81)));
  vrai('« Accès » est au menu des DEUX consoles', /\['essais','Accès','gestion messages'\]/.test(CODE));
  vrai('⛔ le texte périmé de Firebase pour OP MESSAGES a disparu de la Tour (plus de FB_CONFIG, plus de règles Firestore d\'OP MESSAGES)', !/FB_CONFIG|firestore-opmessages/.test(CODE));
  vrai('le lien de la bêta d\'OP MESSAGES est https://msg-beta.teamop.fr', /var BETA_MSG_ADRESSE='https:\/\/msg-beta\.teamop\.fr'/.test(CODE));

  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const vap = webpush.generateVAPIDKeys(), MDP = 'mot-de-passe-du-banc-940';
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP) }));
  /* ⛔ UN FICHIER D'AVANT : un accès écrit par le serveur d'AVANT `apps` n'a pas le champ. Le banc ne peut pas le fabriquer par la route
     (le serveur neuf grave toujours `apps` à la création) : on l'écrit comme l'ancien serveur l'écrivait, AVANT de démarrer. */
  fs.writeFileSync(path.join(D, 'beta-comptes.json'), JSON.stringify([{ id: 'b0a1b2c3d4e5', login: 'ancien', nom: 'Accès d\'avant', chantier: 'écrit avant apps', hash: sha('pw-ancien-940-a'), actif: true, ts: Date.now() - 86400000, creePar: 'Patron' }]));
  /* Et l'état d'OP MESSAGES tel que le serveur d'avant l'écrivait : avec sa note qui parle de Firebase (Justin l'a lue dans la Tour
     le 2 octobre 2026). Le serveur neuf ne la rend plus, et la Tour ne l'affiche plus même si un serveur la lui rendait. */
  const NOTE_FIREBASE = 'Les collections sont sorties du projet elan-gestion ; bascule vers le projet OP MESSAGES en attente de sa configuration web.';
  fs.writeFileSync(path.join(D, 'opmessages.json'), JSON.stringify({ enTravaux: true, depuis: '2026-09-10', note: NOTE_FIREBASE, projet: '' }));
  const PORT = await libre();
  let journal = '';
  enfant = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre', vivant);
  if (!vivant) { console.log(journal.slice(0, 800)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  /* Une adresse par appel sur `/api/beta` : ces routes sont au plafond de 20 par minute et par adresse (ROUTES_SENSIBLES), et le
     banc en fait davantage — le serveur est derrière nginx (`trust proxy`), il lit l'adresse dans X-Forwarded-For. */
  let nAdr = 0;
  const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}, /^\/api\/beta\//.test(route) ? { 'X-Forwarded-For': '10.94.' + ((++nAdr >> 8) & 255) + '.' + (nAdr & 255) } : {}), body: JSON.stringify(corps) });
    let j = {}; try { j = JSON.parse(await r.text()); } catch (e) {} return { s: r.status, j }; };
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
  vrai('la Tour ouvre une session de patron', PATRON);
  const lire = async (jeton) => (await (await fetch(B + '/api/monitor/beta', { headers: { Authorization: 'Bearer ' + jeton } })).json()).comptes;
  const parLogin = async (l) => (await lire(PATRON)).find(c => c.login === l);
  const saisir = (T, login, mdp) => T.run('BT.login=' + JSON.stringify(login) + '; BT.nom=' + JSON.stringify('Nom ' + login) + '; BT.pass=' + JSON.stringify(mdp) + '; BT.chantier="banc 940";');
  const jusqua = async (cond) => { for (let i = 0; i < 60; i++) { if (await cond()) return true; await dormir(50); } return false; };

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

    console.log('\n3. Le MÊME identifiant dans les deux bêtas : deux accès, deux mots de passe, chacun dans sa console');
    saisir(TM, 'duo', 'pw-duo-msg-940');
    TM.run('btAjouter()');
    vrai('population : le « duo » d\'OP MESSAGES est créé (il est rangé AVANT celui d\'OP GESTION)', await TM.attendre('BT.comptes.some(function(c){ return c.login==="duo"; })'));
    saisir(TG, 'duo', 'pw-duo-gest-940');
    TG.toasts.length = 0; TG.run('btAjouter()');
    vrai('⛔ le même identifiant s\'ouvre dans la console GESTION : pas de « existe déjà », ce sont deux bêtas', await TG.attendre('BT.comptes.filter(function(c){ return c.login==="duo"; }).length===2'));
    const duos = (await lire(PATRON)).filter(c => c.login === 'duo');
    v('   le serveur a deux accès « duo », un par application, deux identifiants de compte', [duos.map(c => c.apps.join('+')).sort(), new Set(duos.map(c => c.id)).size], [['gestion', 'messages'], 2]);
    const duoM = duos.find(c => c.apps[0] === 'messages') || {}, duoG = duos.find(c => c.apps[0] === 'gestion') || {};
    TM.run('chargerEssais()'); await TM.attendre('BT.comptes.filter(function(c){ return c.login==="duo"; }).length===2');
    v('⛔ chaque console ne montre que le sien', [TM.run('btDeLaConsole().filter(function(c){ return c.login==="duo"; }).map(function(c){ return c.id; })'), TG.run('btDeLaConsole().filter(function(c){ return c.login==="duo"; }).map(function(c){ return c.id; })')], [[duoM.id], [duoG.id]]);
    saisir(TM, 'duo', 'pw-duo-msg-bis-940');
    TM.toasts.length = 0; TM.run('btAjouter()');
    vrai('⛔ le même identifiant DEUX FOIS dans la même bêta : refusé, et la Tour le dit', await jusqua(() => TM.toasts.some(t => /existe déjà dans cette bêta/.test(t))));
    v('   le serveur n\'en a pas créé de troisième', (await lire(PATRON)).filter(c => c.login === 'duo').length, 2);
    const deux = await appel('/api/monitor/beta', { login: 'deux', pass: 'pw-deux-940-aaa', nom: 'Deux', apps: ['gestion', 'messages'] }, PATRON);
    v('⛔ un accès à DEUX applications est refusé par le serveur (400) : un accès, une application', [deux.s, !(await lire(PATRON)).some(c => c.login === 'deux')], [400, true]);
    vrai('⛔ plus de case « ouvre aussi », plus de « ouvre aussi … » sur une ligne, plus de bascule d\'application dans la Tour', !/BT\.aussi|btAppsBasculer|[Oo]uvre aussi/.test(CODE));
    vrai('   aucune ligne des deux consoles ne parle de l\'autre application', !/OP GESTION/.test(TM.run('accBlocBeta()')) && !/OP MESSAGES/.test(TG.run('accBlocBeta()')));
    const formM = TM.run('accFormBeta()'), formG = TG.run('accFormBeta()');
    vrai('   aucun des deux formulaires ne porte de case à cocher', !/type="checkbox"/.test(formM) && !/type="checkbox"/.test(formG));
    vrai('   et chacun dit SA bêta, et rien que la sienne : msg-beta.teamop.fr / teamop.fr/beta.html', /msg-beta\.teamop\.fr/.test(formM) && /n’ouvre QUE la bêta d’OP MESSAGES/.test(formM) && !/beta\.html/.test(formM) && /teamop\.fr\/beta\.html/.test(formG) && !/msg-beta/.test(formG));
    vrai('   l\'en-tête de la console MESSAGES dit où vivent les accès d\'OP GESTION', /les accès à la bêta d’OP GESTION se créent dans sa console/.test(TM.run('vueEssaisMsg()')));

    console.log('\n4. La fiche : SA bêta, l\'adresse, « Copier le lien », et ce que « Couper » y fait');
    TM.panneaux.length = 0; TM.run('accFicheBeta(' + JSON.stringify(mona.id) + ')');
    const fiche = TM.panneaux[0] || '';
    vrai('la fiche s\'ouvre', fiche.length > 200);
    vrai('⛔ elle dit « Sur msg-beta.teamop.fr : cet identifiant et son mot de passe »', /Sur <b>msg-beta\.teamop\.fr<\/b> : cet identifiant et son mot de passe/.test(fiche));
    vrai('⛔ elle porte le lien https://msg-beta.teamop.fr ET le bouton « Copier le lien » qui copie CE lien', /id="bt-lien-msg"[^>]*>https:\/\/msg-beta\.teamop\.fr<\/span>/.test(fiche) && /tourCopie\('bt-lien-msg',this\)">Copier le lien</.test(fiche));
    /* v2.82 — la bêta d'OP MESSAGES est installée depuis le 2 octobre 2026 : la fiche disait le contraire. Elle dit maintenant ce que
       « Couper » fait là-bas, et la promesse « dans la minute » se relit dans la configuration du service, pas dans une phrase. */
    vrai('⛔ elle ne dit plus que la bêta d\'OP MESSAGES « n’est pas encore installée » (installée le 2 octobre 2026)', !/pas encore installée/.test(fiche));
    vrai('⛔ elle dit ce que « Couper » fait là-bas : plus de connexion, et les sessions ouvertes se ferment « dans la minute » (pas « immédiatement »)', /« Couper » ferme la porte : plus aucune connexion, et les sessions déjà ouvertes se ferment dans la minute/.test(fiche) && !/immédiatement/.test(fiche));
    /* ⛔ LU PAR LE VRAI CHARGEUR, PAS DANS LE TEXTE (3 octobre 2026) : le premier `relectureMs:` du fichier était celui de la porte ;
       depuis le lot 4 d'OP MESSAGES, c'est celui de la facturation (dix minutes), et ce contrôle accusait la porte d'un délai qu'elle
       n'a pas. Une configuration MINIMALE (sans réglage de la porte) passe par `charger` : la valeur que le service prend vraiment. */
    let relectureMs = NaN;
    try {
      const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-940-')), cred = path.join(bac, 'cred');
      fs.mkdirSync(cred); fs.writeFileSync(path.join(cred, 'kek'), crypto.randomBytes(32).toString('hex') + '\n');
      fs.writeFileSync(path.join(bac, 'config.json'), JSON.stringify({ origines: ['https://exemple.invalide'] }));
      const { charger } = require(path.join(RACINE, 'server-msg', 'config.js'));
      relectureMs = charger({ OPMSG_INSTANCE: 'beta', OPMSG_CONFIG: path.join(bac, 'config.json'), OPMSG_DATA: path.join(bac, 'data'), CREDENTIALS_DIRECTORY: cred }).beta.relectureMs;
      fs.rmSync(bac, { recursive: true, force: true });
    } catch (e) { console.log('      (le chargeur de server-msg/config.js a jeté : ' + (e && e.message) + ')'); }
    vrai('   et « dans la minute » est tenu : la porte d\'OP MESSAGES relit les accès toutes les 60 s au plus (relectureMs de server-msg/config.js : ' + relectureMs + ')', relectureMs > 0 && relectureMs <= 60000);
    vrai('   elle n\'affiche PAS l\'encart de teamop.fr/beta.html', !/teamop\.fr\/beta\.html/.test(fiche));
    vrai('⛔ aucune case à cocher : la fiche dit ce que l\'accès ouvre (« la bêta d’OP MESSAGES »), elle ne règle plus d\'autre application', !/type="checkbox"/.test(fiche) && /Ouvre<\/span><span[^>]*>la bêta d’OP MESSAGES/.test(fiche));
    TG.panneaux.length = 0; TG.run('accFicheBeta(' + JSON.stringify((await parLogin('gaston')).id) + ')');
    vrai('la fiche d\'un accès d\'OP GESTION garde l\'encart de teamop.fr/beta.html, ne parle pas de msg-beta, sans case', /teamop\.fr\/beta\.html/.test(TG.panneaux[0]) && !/msg-beta/.test(TG.panneaux[0]) && !/type="checkbox"/.test(TG.panneaux[0]));
    TM.panneaux.length = 0; TM.run('accFicheBeta(' + JSON.stringify(duoM.id) + ')'); TG.panneaux.length = 0; TG.run('accFicheBeta(' + JSON.stringify(duoG.id) + ')');
    vrai('les deux « duo » : chacun sa fiche, chacune sa seule adresse', /msg-beta/.test(TM.panneaux[0] || '') && !/beta\.html/.test(TM.panneaux[0] || '') && /beta\.html/.test(TG.panneaux[0] || '') && !/msg-beta/.test(TG.panneaux[0] || ''));

    console.log('\n5. Deux portes, deux mots de passe, deux verrous (les vraies routes de connexion et de relecture)');
    const login = (l, p, app) => appel('/api/beta/login', app === undefined ? { login: l, pass: p } : { login: l, pass: p, app });
    const mauvais = await login('mona', 'pas-le-bon');   // la réponse d'un mauvais mot de passe, pour comparer
    const lm = await login('duo', 'pw-duo-msg-940', 'messages'), lgs = await login('duo', 'pw-duo-gest-940');
    v('chaque porte ouvre SON accès, avec SON mot de passe', [lm.s, lm.j.id, lm.j.apps, lgs.s, lgs.j.id], [200, duoM.id, ['messages'], 200, duoG.id]);
    const croiseM = await login('duo', 'pw-duo-gest-940', 'messages'), croiseG = await login('duo', 'pw-duo-msg-940');
    v('⛔ le mot de passe de l\'AUTRE bêta : exactement la réponse d\'un mauvais mot de passe, des deux côtés', [croiseM.s, croiseM.j, croiseG.s, croiseG.j], [mauvais.s, mauvais.j, mauvais.s, mauvais.j]);
    v('⛔ la relecture publique de la page bêta d\'OP GESTION ({login}) lit SON accès, pas le « duo » d\'OP MESSAGES rangé avant lui', (await appel('/api/beta/etat', { login: 'duo' })).j, { ouvert: true });
    TM.run('btToggle(' + JSON.stringify(duoM.id) + ')');
    vrai('couper le « duo » d\'OP MESSAGES depuis sa console', await jusqua(async () => ((await lire(PATRON)).find(x => x.id === duoM.id) || {}).actif === false));
    v('   OP MESSAGES lit son accès fermé, sa porte le dit « coupé »', [(await appel('/api/beta/etat', { ids: [duoM.id], app: 'messages' })).j.ouverts[duoM.id], (await login('duo', 'pw-duo-msg-940', 'messages')).s], [false, 403]);
    v('⛔ et celui d\'OP GESTION reste ouvert : sa porte et ses deux relectures ne bougent pas', [(await login('duo', 'pw-duo-gest-940')).s, (await appel('/api/beta/etat', { login: 'duo' })).j.ouvert, (await appel('/api/beta/etat', { ids: [duoG.id] })).j.ouverts[duoG.id]], [200, true, true]);
    TM.run('btToggle(' + JSON.stringify(duoM.id) + ')');
    vrai('rouvrir', await jusqua(async () => ((await lire(PATRON)).find(x => x.id === duoM.id) || {}).actif === true));
    for (let i = 0; i < 5; i++) await login('duo', 'faux-' + i + '-faux-faux', 'messages');
    v('⛔ cinq échecs à la porte d\'OP MESSAGES la verrouillent (429)…', (await login('duo', 'pw-duo-msg-940', 'messages')).s, 429);
    v('   … sans verrouiller l\'accès d\'OP GESTION du même identifiant : deux comptes, deux verrous', (await login('duo', 'pw-duo-gest-940')).s, 200);
    v('« messages » : la porte d\'OP MESSAGES s\'ouvre', (await login('mona', 'pw-mona-940-a', 'messages')).s, 200);
    const refus = await login('mona', 'pw-mona-940-a');
    v('⛔ un accès d\'OP MESSAGES à la page bêta d\'OP GESTION (sans `app`) : EXACTEMENT la réponse d\'un mauvais mot de passe', [refus.s, refus.j], [mauvais.s, mauvais.j]);
    v('« gestion » : gestion passe, messages est refusé comme un mauvais mot de passe', [(await login('gaston', 'pw-gaston-940-a')).s, (await login('gaston', 'pw-gaston-940-a', 'messages')).j], [200, mauvais.j]);

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
    v('une application fausse est refusée : 400 (liste vide, inconnue, pas une liste)', [(await appel('/api/monitor/beta', { login: 'x1x', pass: 'pw-x1x-940-aa', apps: [] }, PATRON)).s, (await appel('/api/monitor/beta', { login: 'x2x', pass: 'pw-x2x-940-aa', apps: ['compta'] }, PATRON)).s, (await appel('/api/monitor/beta', { login: 'x3x', pass: 'pw-x3x-940-aa', apps: 'messages' }, PATRON)).s], [400, 400, 400]);
    v('⛔ la route qui AJOUTAIT une application à un accès n\'existe plus (404) : l\'autre bêta, c\'est un autre accès', (await appel('/api/monitor/beta/apps', { id: ancien.j.compte.id, apps: ['gestion', 'messages'] }, PATRON)).s, 404);

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

    console.log('\n10. L\'accueil de la console MESSAGES ne parle plus de Firebase (capture de Justin, 2 octobre 2026)');
    const et0 = await (await fetch(B + '/api/monitor/messages/etat', { headers: { Authorization: 'Bearer ' + PATRON } })).json();
    v('⛔ le serveur ne rend plus la note, même écrite dans son fichier par le serveur d\'avant', ['note' in et0, et0.enTravaux], [false, true]);
    TM.run('var ENT={liste:[]}, MSG={loaded:false}, OPM={loaded:true,err:"",d:' + JSON.stringify({ enTravaux: true, depuis: '2026-09-10', note: NOTE_FIREBASE }) + "}; function incOuverts(){ return []; } function acGroupe(){ return ''; } function ligneAc(){ return ''; } function vueInfo(){ return {section:'Pilotage',lib:'Accueil'}; }");
    const accueil = TM.run('vueAccueilMsg()');
    vrai('population : l\'accueil se dessine, « En travaux »', /En travaux/.test(accueil));
    vrai('⛔ et même si un serveur lui rend la note Firebase, la Tour ne l\'affiche pas : elle dit le serveur d\'OP MESSAGES', !/elan-gestion|projet OP MESSAGES|Firebase\s*\)|configuration web/.test(accueil) && /son propre serveur, séparé d’OP GESTION et de Firebase/.test(accueil));
    vrai('   et elle envoie vers l\'onglet Accès pour essayer la bêta', /la bêta s’essaie avec les accès de l’onglet <b>Accès<\/b>/.test(accueil));
    const bascule = await appel('/api/monitor/messages/etat', { enTravaux: false, projet: 'msg.teamop.fr' }, PATRON);
    v('⛔ « Déclarer la bascule faite » accepte le nom de serveur que la Tour propose en exemple (msg.teamop.fr, avec ses points)', [bascule.s, bascule.j.projet], [200, 'msg.teamop.fr']);
    v('   un nom fait de rien est toujours refusé (400)', (await appel('/api/monitor/messages/etat', { enTravaux: false, projet: '' }, PATRON)).s, 400);
    await appel('/api/monitor/messages/etat', { enTravaux: true }, PATRON);

    console.log('\n11. ⛔ MOT DE PASSE OUBLIÉ (v2.83, Justin 5 octobre 2026) : la route, ses refus, la chute de l\'ancien, la Tour');
    const NEUF = 'nouveau-mdp-940-Zq7';
    saisir(TM, 'oubli', 'pw-oubli-940-a'); TM.run('btAjouter()');
    vrai('population : l\'accès « oubli » (OP MESSAGES) est créé', await TM.attendre('BT.comptes.some(function(c){ return c.login==="oubli"; })'));
    const oubli = await parLogin('oubli');
    const entre = async (mdp) => (await appel('/api/beta/login', { login: 'oubli', pass: mdp, app: 'messages' }));
    const etatMdp = async () => (await appel('/api/beta/etat', { ids: [oubli.id], app: 'messages' })).j;
    const av = await entre('pw-oubli-940-a');
    v('population : avant, l\'ancien mot de passe ouvre la porte d\'OP MESSAGES (avec l\'identifiant de compte)', [av.s, av.j.id], [200, oubli.id]);
    const e0 = await etatMdp();
    v('   et la relecture d\'OP MESSAGES ne signale AUCUN changement de mot de passe (`mdp` sans cet accès)', [e0.ouverts[oubli.id], oubli.id in e0.mdp], [true, false]);
    /* les refus : rien ne change, et on le prouve par l'ancien mot de passe qui passe toujours */
    v('⛔ sans être patron (aucun jeton) : 403', (await appel('/api/monitor/beta/mdp', { id: oubli.id, pass: NEUF })).s, 403);
    v('identifiant inconnu : 404', (await appel('/api/monitor/beta/mdp', { id: 'bffffffffff', pass: NEUF }, PATRON)).s, 404);
    v('sans identifiant : 404', (await appel('/api/monitor/beta/mdp', { pass: NEUF }, PATRON)).s, 404);
    v('7 caractères : 400', (await appel('/api/monitor/beta/mdp', { id: oubli.id, pass: '1234567' }, PATRON)).s, 400);
    v('mot de passe absent : 400', (await appel('/api/monitor/beta/mdp', { id: oubli.id }, PATRON)).s, 400);
    v('⛔ après tous ces refus, l\'ANCIEN mot de passe ouvre toujours (rien n\'a bougé)', (await entre('pw-oubli-940-a')).s, 200);
    saisir(TM, 'huit', 'pw-huit-940-aa'); TM.run('btAjouter()');
    vrai('population : l\'accès « huit » est créé', await TM.attendre('BT.comptes.some(function(c){ return c.login==="huit"; })'));
    const huit = await appel('/api/monitor/beta/mdp', { id: (await parLogin('huit')).id, pass: '12345678' }, PATRON);
    v('exactement 8 caractères : accepté (même minimum que la création)', [huit.s, huit.j.ok], [200, true]);
    v('   et il ouvre la porte de SON accès (huit), l\'ancien non', [(await appel('/api/beta/login', { login: 'huit', pass: '12345678', app: 'messages' })).s, (await appel('/api/beta/login', { login: 'huit', pass: 'pw-huit-940-aa', app: 'messages' })).s], [200, 403]);
    const ok1 = await appel('/api/monitor/beta/mdp', { id: oubli.id, pass: NEUF }, PATRON);
    v('⛔ le patron pose un nouveau mot de passe : 200', [ok1.s, ok1.j.ok], [200, true]);
    v('   la réponse est `betaPublic` (mêmes champs que les routes voisines)', Object.keys(ok1.j.compte).sort(), Object.keys(await parLogin('oubli')).sort());
    vrai('   ⛔ ni le mot de passe, ni son hachage, ni l\'ancien n\'apparaissent dans la réponse', !new RegExp(NEUF + '|' + sha(NEUF) + '|pw-oubli-940-a').test(JSON.stringify(ok1.j)));
    vrai('   ⛔ ni le mot de passe ni son hachage dans la liste de la Tour', !new RegExp(NEUF + '|' + sha(NEUF)).test(JSON.stringify(await lire(PATRON))));
    vrai('   ⛔ ni dans le journal du serveur (qui, lui, nomme l\'accès)', !journal.includes(NEUF) && !journal.includes(sha(NEUF)) && /nouveau mot de passe à l'accès bêta oubli/.test(journal));
    const vieux1 = await entre('pw-oubli-940-a');
    v('⛔ l\'ANCIEN mot de passe est refusé tout de suite (403, même phrase qu\'un mauvais mot de passe)', [vieux1.s, vieux1.j.error], [403, 'identifiant ou mot de passe incorrect']);
    const nouveau = await entre(NEUF);
    v('⛔ le NOUVEAU ouvre la porte, et c\'est le MÊME compte (même identifiant `b…` : pour OP MESSAGES, la même personne)', [nouveau.s, nouveau.j.id], [200, oubli.id]);
    const apres = await parLogin('oubli');
    v('   l\'accès reste ouvert, avec son chantier et son application', { actif: apres.actif, chantier: apres.chantier, apps: apres.apps }, { actif: true, chantier: 'banc 940', apps: ['messages'] });
    const e2 = await etatMdp();
    vrai('⛔ la relecture d\'OP MESSAGES DIT l\'instant du changement (`mdp[id]`, un nombre récent) — c\'est ce qui fait tomber les sessions d\'avant', e2.ouverts[oubli.id] === true && Number.isFinite(e2.mdp[oubli.id]) && Math.abs(Date.now() - e2.mdp[oubli.id]) < 30000);
    const gastonId = (await parLogin('gaston')).id;
    v('   et seulement pour un accès dont le mot de passe a changé (gaston, jamais changé, n\'y figure pas)', Object.keys((await appel('/api/beta/etat', { ids: [oubli.id, gastonId], app: 'messages' })).j.mdp), [oubli.id]);
    v('l\'accès d\'OP MESSAGES ne s\'ouvre toujours pas par la porte d\'OP GESTION (le nouveau mot de passe n\'élargit rien)', (await appel('/api/beta/login', { login: 'oubli', pass: NEUF, app: 'gestion' })).s, 403);

    console.log('   … et la Tour : sa vraie btMdp, ses refus lus à l\'écran');
    TM.panneaux.length = 0; TM.run('accFicheBeta(' + JSON.stringify(oubli.id) + ')');
    const f2 = TM.panneaux[0] || '';
    vrai('⛔ la fiche porte le bouton « Nouveau mot de passe » qui appelle btMdp de CET accès, dans la rangée des gestes voisins (chantier, couper, supprimer)', /class="btn-fant" onclick="tourPanneauFermer\(\);btMdp\('[^']+','oubli'\)">🔑 Nouveau mot de passe</.test(f2) && f2.indexOf('btChantier(') < f2.indexOf('btMdp(') && f2.indexOf('btMdp(') < f2.indexOf('btSuppr('));
    const vus = []; let proposition = '', reponse = null;
    TM.ctx.prompt = (q, def) => { vus.push(q); proposition = def; return reponse; };
    const n0 = TM.toasts.length;
    TM.run('btMdp(' + JSON.stringify(oubli.id) + ',"oubli")'); await dormir(300);
    v('annuler la fenêtre ne change rien et ne dit rien', [TM.toasts.length, (await entre(NEUF)).s], [n0, 200]);
    vrai('   la fenêtre propose un mot de passe tiré au hasard de 12 caractères, et dit qu\'il ne sera plus affiché', /^[A-Za-z0-9!#%]{12}$/.test(proposition) && /ne sera plus affiché/.test(vus[0]) && /dans la minute/.test(vus[0]));
    reponse = 'court'; TM.run('btMdp(' + JSON.stringify(oubli.id) + ',"oubli")'); await dormir(300);
    const dern = () => TM.toasts[TM.toasts.length - 1] || '';
    vrai('⛔ un mot de passe trop court est REFUSÉ À L\'ÉCRAN (8 caractères minimum, « rien n\'a été changé ») et rien n\'est parti', /8 caractères minimum/.test(dern()) && /rien n’a été changé/.test(dern()) && (await entre(NEUF)).s === 200);
    const TAUTRE = 'autre-mdp-940-Wk3';
    reponse = TAUTRE; TM.run('btMdp(' + JSON.stringify(oubli.id) + ',"oubli")');
    vrai('⛔ un mot de passe valable : la Tour DIT la réussite (« l\'ancien ne passe plus »)', await jusqua(() => /Nouveau mot de passe posé pour « oubli »/.test(dern())));
    v('   et le serveur l\'a posé : le précédent est refusé, le nouveau ouvre', [(await entre(NEUF)).s, (await entre(TAUTRE)).s], [403, 200]);
    vrai('   ⛔ ni le toast ni le journal de la Tour ne contiennent le mot de passe', !TM.toasts.some(t => t.includes(TAUTRE)) && !JSON.stringify(TM.run('JR.actions')).includes(TAUTRE) && /a posé un nouveau mot de passe à l’accès bêta « oubli » \(OP MESSAGES\)/.test(TM.run('JR.actions[0].tx')));
    const TX = tour(B, 'f'.repeat(48), 'messages'); TX.ctx.prompt = () => 'refus-patron-940-x';
    TX.run('btMdp(' + JSON.stringify(oubli.id) + ',"oubli")');
    vrai('⛔ un REFUS du serveur (jeton non patron : 403) se LIT : « Réservé au patron… rien n\'a été changé »', await jusqua(() => /Réservé au patron/.test(TX.toasts[TX.toasts.length - 1] || '') && /rien n’a été changé/.test(TX.toasts[TX.toasts.length - 1])));
    v('   et ce refus n\'a rien changé (le mot de passe posé juste avant ouvre toujours)', (await entre(TAUTRE)).s, 200);
    reponse = 'inconnu-940-ok1'; TM.run('btMdp("bffffffffff","fantôme")');
    vrai('⛔ un accès inconnu du serveur (404) se lit : « accès introuvable »', await jusqua(() => /accès introuvable/.test(dern())));
    const TN = tour('http://127.0.0.1:1', PATRON, 'messages'); TN.ctx.prompt = () => 'reseau-coupe-940-x';
    TN.run('btMdp(' + JSON.stringify(oubli.id) + ',"oubli")');
    vrai('⛔ un serveur injoignable se lit (« Serveur injoignable… rien n\'a été changé »), jamais une réussite', await jusqua(() => /Serveur injoignable/.test(TN.toasts[TN.toasts.length - 1] || '')) && !/posé/.test(TN.toasts.join('|')));
    const TGp = tour(B, PATRON, 'gestion'); TGp.run('chargerEssais()'); await TGp.attendre('BT.loaded');
    TGp.ctx.prompt = () => 'gaston-nouveau-940'; TGp.run('btMdp(' + JSON.stringify(gastonId) + ',"gaston")');
    vrai('la console GESTION pose aussi un mot de passe (sans « (OP MESSAGES) » dans son journal) : l\'ancien tombe, le nouveau ouvre', await jusqua(() => /Nouveau mot de passe posé pour « gaston »/.test(TGp.toasts[TGp.toasts.length - 1] || '')) && (await login('gaston', 'pw-gaston-940-a')).s === 403 && (await login('gaston', 'gaston-nouveau-940')).s === 200 && !/OP MESSAGES/.test(TGp.run('JR.actions[0].tx')));
    /* En DERNIER : dès qu'un compte nominatif existe, le jeton du mot de passe de départ (celui des essais ci-dessus) ne passe plus. */
    v('population : un compte collaborateur est créé (le jeton de départ cesse alors de valoir patron — d\'où sa place, en dernier)', (await appel('/api/monitor/users', { nom: 'Collab 940', pass: 'pw-collab-940-a' }, PATRON)).s, 200);
    const COLLAB = (await appel('/api/monitor/login', { nom: 'Collab 940', pass: 'pw-collab-940-a' })).j.token;
    vrai('population : il a une session', COLLAB);
    v('⛔ un collaborateur de la Tour, PAS patron : 403 (et l\'ancien mot de passe de l\'accès n\'a pas bougé)', [(await appel('/api/monitor/beta/mdp', { id: oubli.id, pass: 'collab-essaie-940' }, COLLAB)).s, (await entre(TAUTRE)).s], [403, 200]);
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); ko++;
    console.log(journal.slice(-800));
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})();
