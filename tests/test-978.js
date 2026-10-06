/* test-978 — LA TOUR v2.84 : CHAQUE CONSOLE RÈGLE LES VERSIONS DE SES APPLICATIONS, BÊTA ET PUBLIQUE À PART (6 octobre 2026).
 *
 * Justin : « je veux qu'on sépare la version bêta et la version publique. Pour les mises à jour, je veux aussi le forçage de mise à jour,
 * comme sur OP GESTION depuis la Tour ; je veux le panneau OP MESSAGES, le panneau OP GESTION, et que tout soit bien séparé. »
 *
 * Ce banc fait parler les VRAIES fonctions de la Tour (extraites de `tour.html`) au VRAI serveur d'OP GESTION, lancé isolé, avec deux
 * fausses instances d'OP MESSAGES et une fausse beta.html à côté — tout sur 127.0.0.1. C'est la couture que `test-999` (le serveur
 * seul) ne voit pas : ce que la Tour ENVOIE est ce que le serveur attend, et ce qu'il répond est ce que la Tour AFFICHE.
 *   1. console OP GESTION : deux cartes, « Version publique » et « Bêta » ; « Exiger » sur la bêta ne touche PAS la publique ;
 *   2. console OP MESSAGES : deux cartes, une par instance ; « Exiger » sur la publique ne touche PAS la bêta ;
 *      le service qui n'a pas encore relu le minimum se DIT ; une instance éteinte se DIT ;
 *   3. « Accès » d'OP MESSAGES montre sa version publique, à côté de la bêta ;
 *   4. un serveur d'AVANT (sans ces routes) : chaque carte le dit, aucune n'invente « aucun minimum » ;
 *   5. un collaborateur voit, ne règle pas.
 */
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), http = require('http'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
const SRC_TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-978-'));
let enfant = null; const serveurs = [];
process.on('exit', () => { try { if (enfant) enfant.kill(); } catch (e) {} for (const s of serveurs) try { s.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} });

/* le code de la Tour, commentaires de début de ligne retirés (CLAUDE.md : un motif vise du code), découpé fonction par fonction */
const CODE = SRC_TOUR.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function bloc(motif) {
  const m = new RegExp('\\n(?:async )?function ' + motif + '\\(|\\nvar ' + motif + '\\s*=').exec(CODE); if (!m) return '';
  const suite = /\n(?:async function |function |var |setInterval|document\.)/g; suite.lastIndex = m.index + 8;
  const f = suite.exec(CODE);
  return CODE.slice(m.index + 1, f ? f.index : CODE.length);
}
const NOMS = ['hAuth', 'srvRepond', 'srvMuet', 'apiGet', 'apiPost', 'msgErreur', 'esc', 'jsq', 'ini', 'fmtJour', 'videTour', 'nomEspace', 'nomTechnique',
  'chargerVersion', 'versionRegler', 'versionExigerLigne', 'versionLever', 'blocVersions', 'carteCanal', 'blocVersionBeta', 'versionBetaPrete', 'versionBetaExiger', 'versionBetaLever',
  'chargerVersionsMsg', 'versionMsgRegler', 'versionMsgExiger', 'versionMsgLever', 'carteMsg', 'blocVersionsMsg',
  'chargerEssais', 'btDeLaConsole', 'btAppsDe', 'btAvec', 'accLigneBeta', 'accBlocBeta', 'accFormBeta', 'vueEssaisMsg'];
const VARS = ['VER', 'MV', 'MSG_CANAUX', 'BT', 'BT_APPS', 'BETA_MSG_ADRESSE', 'APPS_TOUR', 'INJOIGNABLE'];
const SRC = NOMS.map(bloc), SRCV = VARS.map(bloc);

function tour(API, jeton, app, role) {
  const toasts = [], confirmations = [], ctx = { fetch, URL, Object, String, JSON, Promise, Math, Date, Array, Error, document: { getElementById: () => null }, console };
  vm.createContext(ctx);
  vm.runInContext('var API=' + JSON.stringify(API) + ', TOKEN=' + JSON.stringify(jeton) + ', APP=' + JSON.stringify(app) + ", TAB='surveillance', MYROLE=" + JSON.stringify(role || 'patron') + ", MYNOM='Patron banc';\n" +
    "var JR={actions:[]}, IC={cadenas:''}; function doLogout(){} function srvEtat(){} function render(){} function squelListe(){ return '<i class=\"squel\"></i>'; }\n" +
    "function svg(){ return ''; } function enTete(t,p){ return '<div class=\"page-tete\">'+t+' — '+p+'</div>'; } function accAllerForm(){} function tourCopie(){} function setTab(){}\n" +
    SRCV.join('\n') + '\n' + SRC.join('\n'), ctx);
  ctx.toast = (t) => { toasts.push(t); };
  ctx.confirm = (q) => { confirmations.push(q); return true; };
  return { ctx, toasts, confirmations, run: (code) => vm.runInContext(code, ctx),
    attendre: async (cond, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await vm.runInContext(cond, ctx)) return true; await dormir(40); } return false; } };
}
const texte = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ');
/* les cartes d'un bloc, une par titre « VERSIONS · … » : on découpe le texte rendu à chaque titre */
const cartes = (h) => { const t = texte(h), o = {}; t.split(/(?=VERSIONS · )/).forEach(x => { const m = /^VERSIONS · (VERSION PUBLIQUE|BÊTA)/.exec(x); if (m) o[m[1]] = x; }); return o; };
function faux(reponse) {
  const etat = { reponse, port: 0 };
  const s = http.createServer((q, r) => { const x = etat.reponse(q); if (!x) { r.writeHead(500); return r.end(); } r.writeHead(200, { 'Content-Type': x.type || 'application/json' }); r.end(x.corps); });
  serveurs.push(s);
  return new Promise(res => s.listen(0, '127.0.0.1', () => { etat.port = s.address().port; res(etat); }));
}
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const libre = () => new Promise(r => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  console.log('\n── 978 · 0. population ──');
  vrai('les ' + NOMS.length + ' fonctions et les ' + VARS.length + ' variables de la Tour sont trouvées', SRC.every(Boolean) && SRCV.every(Boolean));
  if (!(SRC.every(Boolean) && SRCV.every(Boolean))) { console.log('      manquent : ' + [...NOMS.filter((n, i) => !SRC[i]), ...VARS.filter((n, i) => !SRCV[i])].join(', ')); process.exit(1); }
  const vTour = (/\bvar TOUR_VERSION='v(\d+)\.(\d+)'/.exec(CODE) || []).slice(1).map(Number);
  vrai('la Tour porte au moins la v2.84', vTour.length === 2 && (vTour[0] > 2 || (vTour[0] === 2 && vTour[1] >= 84)));
  vrai('⛔ chaque console sa Surveillance des versions : GESTION les siennes, MESSAGES les siennes', /\(APP==='gestion'\?blocVersions\(\)\+blocSortieFirebase\(\):blocVersionsMsg\(\)\)/.test(CODE));

  /* le serveur, ses deux instances d'OP MESSAGES, sa beta.html */
  let cfgBeta = { version_client: 14, min_client: 1, build: 'a1b2c3d4e5f6', comptes: { inscription: true } };
  const msgBeta = await faux(() => cfgBeta ? { corps: JSON.stringify(cfgBeta) } : null);
  const msgProd = await faux(() => ({ corps: JSON.stringify({ version_client: 12, min_client: 1, build: 'f6e5d4c3b2a1', comptes: { inscription: false } }) }));
  const pageBeta = await faux(() => ({ type: 'text/html', corps: "<script>\nconst APP_VERSION = '771-beta';\n</script>" }));
  const pagePub = await faux(() => ({ type: 'text/html', corps: "<script>\nconst APP_VERSION = '767';\n</script>" }));
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const vap = webpush.generateVAPIDKeys(), MDP = 'mot-de-passe-du-banc-978', MDP_C = 'collaborateur-978-long';
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, adminPassHash: sha(MDP) }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [
    { id: 'upatron0978', nom: 'Patron', hash: sha(MDP), role: 'patron', actif: true, ts: 1 },
    { id: 'ucollab0978', nom: 'Collab', hash: sha(MDP_C), role: 'collaborateur', actif: true, ts: 1, apps: ['gestion', 'messages'] } ] }));
  fs.writeFileSync(path.join(D, 'versions.json'), JSON.stringify({ min: 760, minFirestore: 760, maj: 1, par: 'avant' }));
  const PORT = await libre();
  enfant = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:' + msgBeta.port, TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:' + msgProd.port, TEAMOP_BETA_PAGE_URL: 'http://127.0.0.1:' + pageBeta.port + '/beta.html', TEAMOP_APP_PAGE_URL: 'http://127.0.0.1:' + pagePub.port + '/app.html' }), stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre', vivant);
  const login = async (nom, pass) => (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom, pass }) })).json()).token;
  const PATRON = await login('Patron', MDP), COLLAB = await login('Collab', MDP_C);
  vrai('le patron et un collaborateur ouvrent la Tour', PATRON && COLLAB);
  const version = async (q) => (await (await fetch(B + '/api/version' + q)).json()).min;

  try {
    console.log('\n── 978 · 1. la console OP GESTION : publique et bêta, deux cartes ──');
    const TG = tour(B, PATRON, 'gestion');
    TG.run('blocVersions()');
    vrai('population : la Tour a lu /api/monitor/version', await TG.attendre('!!VER.d'));
    let c = cartes(TG.run('blocVersions()'));
    v('deux cartes, dans cet ordre : la publique, puis la bêta', Object.keys(c), ['VERSION PUBLIQUE', 'BÊTA']);
    vrai('la publique dit la version que app.html sert (v767) et son minimum (v760)', /v767 version en ligne/.test(c['VERSION PUBLIQUE'] || '') && /v760 minimum exigé/.test(c['VERSION PUBLIQUE'] || ''));
    vrai('la bêta dit la version que beta.html sert (v771) et « aucun » minimum', /v771/.test(c['BÊTA'] || '') && /aucun/.test(c['BÊTA'] || ''));
    vrai('la bêta dit qu\'elle ne touche pas les clients', /ne touche les clients/.test(c['BÊTA'] || ''));
    TG.run('versionBetaExiger()');
    vrai('« Exiger » de la bêta demande confirmation, et parle de la bêta seule', /BÊTA d’OP GESTION/.test(TG.confirmations[0] || '') && /clients ne sont pas touchés/.test(TG.confirmations[0] || ''));
    vrai('… le serveur l\'a posé : la bêta lit 771', await (async () => { for (let i = 0; i < 80; i++) { if ((await version('?canal=beta')) === 771) return true; await dormir(40); } return false; })());
    v('⛔ et la version PUBLIQUE est restée à 760', await version(''), 760);
    vrai('la Tour le dit (toast) et relit', await TG.attendre('VER.d&&VER.d.beta&&VER.d.beta.min===771'));
    c = cartes(TG.run('blocVersions()'));
    vrai('la carte bêta montre v771 exigé et « Lever l’exigence »', /v771/.test(c['BÊTA']) && /Lever l’exigence/.test(c['BÊTA']));
    TG.run('versionBetaLever()');
    vrai('« Lever » de la bêta : 0', await (async () => { for (let i = 0; i < 80; i++) { if ((await version('?canal=beta')) === 0) return true; await dormir(40); } return false; })());
    v('⛔ la publique toujours 760', await version(''), 760);

    console.log('\n── 978 · 2. la console OP MESSAGES : ses deux instances ──');
    const TM = tour(B, PATRON, 'messages');
    TM.run('blocVersionsMsg()');
    vrai('population : la Tour a lu /api/monitor/messages/versions', await TM.attendre('!!MV.d'));
    c = cartes(TM.run('blocVersionsMsg()'));
    v('deux cartes : la publique (msg.teamop.fr), puis la bêta (msg-beta.teamop.fr)', [Object.keys(c), /msg\.teamop\.fr/.test(c['VERSION PUBLIQUE']), /msg-beta\.teamop\.fr/.test(c['BÊTA'])], [['VERSION PUBLIQUE', 'BÊTA'], true, true]);
    vrai('chacune dit la version que son instance sert (v12, v14)', /v12/.test(c['VERSION PUBLIQUE']) && /v14/.test(c['BÊTA']));
    vrai('⛔ et aucune ne parle de la porte du nuage d\'OP GESTION', !/nuage|Firestore|app\.html/.test(c['VERSION PUBLIQUE'] + c['BÊTA']));
    TM.run("versionMsgExiger('prod')");
    vrai('« Exiger » de la publique parle de msg.teamop.fr, et dit que la bêta n\'est pas touchée', /msg\.teamop\.fr/.test(TM.confirmations[0] || '') && /La bêta n’est pas touchée/.test(TM.confirmations[0] || ''));
    vrai('… le serveur l\'a posé : la publique d\'OP MESSAGES lira 12', await (async () => { for (let i = 0; i < 80; i++) { if ((await version('?app=messages&canal=prod')) === 12) return true; await dormir(40); } return false; })());
    v('⛔ la bêta d\'OP MESSAGES est restée à 0, les deux d\'OP GESTION aussi', [await version('?app=messages&canal=beta'), await version('?canal=beta'), await version('')], [0, 0, 760]);
    vrai('la Tour relit', await TM.attendre('MV.d&&MV.d.prod&&MV.d.prod.min===12'));
    c = cartes(TM.run('blocVersionsMsg()'));
    vrai('⛔ l\'instance n\'a pas encore relu (elle applique « aucun ») : la carte le DIT', /pas encore relu/.test(c['VERSION PUBLIQUE']));
    vrai('   la bêta, elle, n\'a rien à relire : pas d\'avertissement', !/pas encore relu/.test(c['BÊTA']));
    TM.run("versionMsgLever('prod')");
    vrai('« Lever » de la publique : 0', await (async () => { for (let i = 0; i < 80; i++) { if ((await version('?app=messages&canal=prod')) === 0) return true; await dormir(40); } return false; })());

    console.log('\n── 978 · 2 bis. une instance éteinte ──');
    cfgBeta = null;
    TM.run('MV.d=null; chargerVersionsMsg()');
    await TM.attendre('!!MV.d');
    c = cartes(TM.run('blocVersionsMsg()'));
    vrai('⛔ la carte bêta dit « injoignable » et « ne répond pas »', /injoignable/.test(c['BÊTA']) && /ne répond pas/.test(c['BÊTA']));
    vrai('⛔ son bouton « Exiger » est désactivé (on n\'exige pas une version qu\'on ne lit pas)', /<button class="btn-plein" onclick="versionMsgExiger\('beta'\)" disabled>/.test(TM.run('blocVersionsMsg()')));
    vrai('   la publique, elle, reste lisible', /v12/.test(c['VERSION PUBLIQUE']) && !/injoignable/.test(c['VERSION PUBLIQUE']));
    cfgBeta = { version_client: 14, min_client: 1, build: 'a1b2c3d4e5f6', comptes: { inscription: true } };

    console.log('\n── 978 · 3. « Accès » d\'OP MESSAGES : la version publique, à côté de la bêta ──');
    TM.run("TAB='essais'; BT.loaded=true; BT.comptes=[]");
    const acces = texte(TM.run('vueEssaisMsg()'));
    vrai('« Accès à la bêta d’OP MESSAGES » et « Version publique d’OP MESSAGES », deux groupes', /Accès à la bêta d’OP MESSAGES/.test(acces) && /Version publique d’OP MESSAGES/.test(acces));
    vrai('la publique dit son état : en ligne, v12, inscriptions fermées', /En ligne · v12/.test(acces) && /inscriptions fermées/.test(acces));
    vrai('⛔ et on n\'y crée pas d\'accès (chacun ouvre son compte)', /On ne crée pas d’accès ici/.test(acces));

    console.log('\n── 978 · 4. un serveur d\'AVANT : chaque carte le dit ──');
    const TA = tour(B, PATRON, 'gestion');
    const avant = texte(TA.run('blocVersionBeta(undefined)'));
    TA.run('VER.d={ok:true,min:760}');
    TA.run('versionBetaExiger()');
    vrai('⛔ et « Exiger » de la bêta ne POSTE rien sur un serveur d\'avant (il le lirait comme le minimum PUBLIC)', TA.confirmations.length === 0 && /rien n’a été posé/.test(TA.toasts.join(' ')));
    v('   (le minimum public est resté à 760)', await version(''), 760);
    vrai('⛔ la bêta d\'OP GESTION : « pas encore de minimum à part », jamais « aucun »', /ne tient pas encore de minimum à part/.test(avant) && !/aucun/.test(avant));
    const TV = tour(B + '/inexistant', PATRON, 'messages');
    TV.run('chargerVersionsMsg()');
    await TV.attendre('!!MV.err');
    vrai('⛔ OP MESSAGES : une route absente (404) se dit « prochain déploiement »', /prochain déploiement/.test(TV.run('blocVersionsMsg()')));

    console.log('\n── 978 · 5. un collaborateur voit, ne règle pas ──');
    const TC = tour(B, COLLAB, 'messages', 'collaborateur');
    TC.run('chargerVersionsMsg()');
    vrai('il lit les versions d\'OP MESSAGES', await TC.attendre('!!MV.d'));
    vrai('⛔ sans aucun bouton « Exiger » ni « Lever »', !/versionMsgExiger|versionMsgLever/.test(TC.run('blocVersionsMsg()')));
    const TCG = tour(B, COLLAB, 'gestion', 'collaborateur');
    TCG.run('chargerVersion()'); await TCG.attendre('!!VER.d');
    vrai('⛔ ni sur la bêta d\'OP GESTION', !/versionBetaExiger|versionBetaLever/.test(TCG.run('blocVersions()')));
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
