/* test-979 — LA TOUR v2.85 : OP GESTION ET OP MESSAGES BIEN SÉPARÉS (6 octobre 2026).
 *
 * Justin : « je veux que dans la Tour tu sépares bien OP GESTION, OP MESSAGES ». Un recensement de toutes les vues partagées (Accueil,
 * Entreprises, Surveillance, Courrier, Accès, Équipe, Journal) a trouvé ce que la console OP MESSAGES montrait d'OP GESTION — et l'inverse.
 * Ce banc fait parler les VRAIES fonctions de la Tour (extraites de `tour.html`) au VRAI serveur, lancé isolé sur 127.0.0.1, et garde :
 *   1. Surveillance : un incident Stripe ou de l'espace client est d'OP GESTION (il passait dans OP MESSAGES) ; chaque console ses compteurs ;
 *   2. « Tout remettre à zéro » ne classe QUE les problèmes de la console ouverte (le serveur ne classe qu'elle) ;
 *   3. le Courrier n'est plus au menu d'OP MESSAGES, ni sur son accueil ;
 *   4. Journal : une action d'une console ne paraît pas dans l'autre (celles de la session, et celles que le serveur a notées) ;
 *   5. Équipe : chaque console ses comptes ; les autres, rangés à part pour que le patron leur ouvre la console ;
 *   6. Entreprises : les erreurs d'OP MESSAGES ne gonflent plus le compteur d'une entreprise d'OP GESTION ; la fiche d'OP GESTION ne règle plus
 *      OP MESSAGES (elle dit où ça se règle) ; la console OP MESSAGES ne montre pas les espaces techniques.
 */
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
const SRC_TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-979-'));
let enfant = null;
process.on('exit', () => { try { if (enfant) enfant.kill(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} });

const CODE = SRC_TOUR.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function bloc(motif) {
  const m = new RegExp('\\n(?:async )?function ' + motif + '\\(|\\nvar ' + motif + '\\s*=').exec(CODE); if (!m) return '';
  const suite = /\n(?:async function |function |var |setInterval|document\.|\(function\(\)|<\/script>)/g; suite.lastIndex = m.index + 8;   // la dernière fonction du script finit avant le démarrage (« (function(){ ») ou « </script> »
  const f = suite.exec(CODE);
  return CODE.slice(m.index + 1, f ? f.index : CODE.length);
}
const NOMS = ['hAuth', 'srvRepond', 'srvMuet', 'apiGet', 'apiPost', 'msgErreur', 'esc', 'jsq', 'ini', 'fmtJour', 'fmtDate', 'fmtHeure', 'fmtAgo', 'videTour', 'nMot',
  'appDe', 'appVisible', 'incDeLaConsole', 'incOuverts', 'incToutIgnorer', 'nbEntSurveillees', 'entQ', 'chargerIncidents', 'chargerJournal', 'chargerEquipe',
  'vuesDe', 'vuePermise', 'vues', 'vueJournal', 'jrGroupe', 'teteListe', 'vueEquipe', 'eqNoteCollaborateur', 'libsPatronSeul', 'appsDuCompte', 'enPhrase', 'acSquel'];
const VARS = ['MENU', 'PATRON_SEUL', 'APPS_TOUR', 'APP_TEINTE', 'INJOIGNABLE', 'INC', 'JR', 'EQ', 'ENT', 'CLI'];
const SRC = NOMS.map(bloc), SRCV = VARS.map(bloc);

function tour(API, jeton, app, apps) {
  const toasts = [], envois = [], ctx = { fetch, URL, Object, String, JSON, Promise, Math, Date, Array, Error, Number, document: { getElementById: () => null }, console };
  vm.createContext(ctx);
  vm.runInContext('var API=' + JSON.stringify(API) + ', TOKEN=' + JSON.stringify(jeton) + ', APP=' + JSON.stringify(app) + ", TAB='surveillance', MYROLE='patron', MYNOM='Patron', MYAPPS=" + JSON.stringify(apps || ['gestion', 'messages']) + ";\n" +
    "var IC={cadenas:''}; function doLogout(){} function srvEtat(){} function render(){} function rafraichirSiConcerne(){} function setBdg(){} function majCompteursApp(){} function majBarreBas(){} function squelListe(){ return '<i class=\"squel\"></i>'; }\n" +
    "function svg(){ return ''; } function enTete(t,p){ return '<div class=\"page-tete\">'+t+' — '+p+'</div>'; }\n" +
    SRCV.join('\n') + '\n' + SRC.join('\n'), ctx);
  ctx.toast = (t) => { toasts.push(t); };
  ctx.confirm = () => true; ctx.alert = () => {};
  const vraiPost = ctx.apiPost; ctx.apiPost = (u, b) => { envois.push([u, b]); return vraiPost(u, b); };
  return { ctx, toasts, envois, run: (code) => vm.runInContext(code, ctx),
    attendre: async (cond, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await vm.runInContext(cond, ctx)) return true; await dormir(40); } return false; } };
}
const texte = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const libre = () => new Promise(r => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  console.log('\n── 979 · 0. population ──');
  vrai('les ' + NOMS.length + ' fonctions et les ' + VARS.length + ' variables de la Tour sont trouvées', SRC.every(Boolean) && SRCV.every(Boolean));
  if (!(SRC.every(Boolean) && SRCV.every(Boolean))) { console.log('      manquent : ' + [...NOMS.filter((n, i) => !SRC[i]), ...VARS.filter((n, i) => !SRCV[i])].join(', ')); process.exit(1); }

  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const vap = webpush.generateVAPIDKeys(), MDP = 'mot-de-passe-du-banc-979', MDP_C = 'collaborateur-979-long';
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, adminPassHash: sha(MDP) }));
  const N = Date.now();
  const inc = (id, app, statut, ent) => ({ id, app, statut, type: 'erreur', titre: 'Incident ' + id, msg: 'm', count: 1, firstTs: N - 1000, lastTs: N - 500, entreprises: [{ nom: ent }], historique: [] });
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({
    users: [
      { id: 'upatron0979', nom: 'Patron', hash: sha(MDP), role: 'patron', actif: true, ts: 1 },
      { id: 'ugestion979', nom: 'Gaston', hash: sha(MDP_C), role: 'collaborateur', actif: true, ts: 1, apps: ['gestion'] },
      { id: 'umessage979', nom: 'Mona', hash: sha(MDP_C), role: 'collaborateur', actif: true, ts: 1, apps: ['messages'] },
      { id: 'ulesdeux979', nom: 'Dora', hash: sha(MDP_C), role: 'collaborateur', actif: true, ts: 1, apps: ['gestion', 'messages'] } ],
    issues: [inc('g1', 'opgestion', 'nouveau', 'Boulangerie'), inc('g2', 'opgestion', 'encours', 'Garage'), inc('s1', 'stripe', 'nouveau', 'Garage'), inc('e1', 'espace', 'nouveau', 'Hôtel'),
      inc('m1', 'opmessages', 'nouveau', 'Boulangerie'), inc('m2', 'opmessages', 'nouveau', 'Pressing')] }));
  /* une entreprise de l'annuaire, pour son compteur d'erreurs (§ 6) */
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ entx: { slug: 'entx', nom: 'Entreprise X', email: 'x@exemple.fr', t: 'ent-x', code: Buffer.from(JSON.stringify({ t: 'ent-x', k: 'CLE-X-979' })).toString('base64'), ts: 1 } }));
  const PORT = await libre();
  enfant = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1', TEAMOP_BETA_PAGE_URL: 'http://127.0.0.1:1/beta.html', TEAMOP_APP_PAGE_URL: 'http://127.0.0.1:1/app.html' }), stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre', vivant);
  const login = async (nom, pass) => (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom, pass }) })).json()).token;
  const PATRON = await login('Patron', MDP);
  vrai('le patron ouvre la Tour', PATRON);
  const lireIssues = async () => (await (await fetch(B + '/api/monitor/issues', { headers: { Authorization: 'Bearer ' + PATRON } })).json()).issues;

  try {
    console.log('\n── 979 · 1. Surveillance : chaque console ses incidents ──');
    const TG = tour(B, PATRON, 'gestion'), TM = tour(B, PATRON, 'messages');
    TG.run('chargerIncidents()'); TM.run('chargerIncidents()');
    vrai('population : les six incidents sont lus', (await TG.attendre('INC.loaded&&INC.list.length===6')) && (await TM.attendre('INC.loaded&&INC.list.length===6')));
    v('⛔ console OP GESTION : les siens, Stripe et l\'espace client compris', TG.run('incDeLaConsole().map(function(i){ return i.id; }).sort()'), ['e1', 'g1', 'g2', 's1']);
    v('⛔ console OP MESSAGES : les siens SEULS (plus de « Paiement en échec » d\'OP GESTION)', TM.run('incDeLaConsole().map(function(i){ return i.id; }).sort()'), ['m1', 'm2']);
    v('appDe : espace, stripe et la chaîne vide sont d\'OP GESTION — comme le serveur', TG.run("['espace','stripe','','opmessages','opgestion'].map(appDe)"), ['gestion', 'gestion', 'gestion', 'messages', 'gestion']);

    console.log('\n── 979 · 2. « Tout remettre à zéro » : la console ouverte seulement ──');
    TM.run('incToutIgnorer()');
    v('la Tour envoie la console (app: messages)', TM.envois.find(e => /tout-ignorer/.test(e[0])), ['/api/monitor/issues/tout-ignorer', { app: 'messages' }]);
    let l = [];
    for (let i = 0; i < 80; i++) { l = await lireIssues(); if (l.filter(x => x.statut === 'ignore').length) break; await dormir(40); }
    v('⛔ le serveur n\'a classé QUE ceux d\'OP MESSAGES', l.filter(x => x.statut === 'ignore').map(x => x.id).sort(), ['m1', 'm2']);
    v('   ceux d\'OP GESTION restent ouverts', l.filter(x => x.statut === 'nouveau' || x.statut === 'encours').map(x => x.id).sort(), ['e1', 'g1', 'g2', 's1']);
    const r400 = await fetch(B + '/api/monitor/issues/tout-ignorer', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + PATRON }, body: JSON.stringify({ app: 'autre' }) });
    v('⛔ une console inconnue : 400, rien de classé', r400.status, 400);

    console.log('\n── 979 · 3. le Courrier est d\'OP GESTION ──');
    v('⛔ il n\'est plus au menu d\'OP MESSAGES', TM.run('vuesDe("messages").indexOf("support")'), -1);
    vrai('   il reste à celui d\'OP GESTION', TG.run('vuesDe("gestion").indexOf("support")') >= 0);
    vrai('⛔ l\'accueil d\'OP MESSAGES ne lit plus le courrier (ni MSG.nonLus, ni la liste)', !/MSG\.nonLus|MSG\.messages/.test(bloc('vueAccueilMsg')));

    console.log('\n── 979 · 4. Journal : chaque console le sien ──');
    /* deux actions posées par des routes de deux consoles différentes : le serveur les note avec la console de leur route */
    const post = (route, corps) => fetch(B + route, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + PATRON }, body: JSON.stringify(corps) });
    await post('/api/monitor/messages/version-min', { canal: 'beta', min: 0 });
    await post('/api/monitor/version-min', { canal: 'beta', min: 0 });
    TG.run('chargerJournal()'); TM.run('chargerJournal()');
    vrai('population : le journal du serveur est lu, et porte les deux actions', (await TG.attendre('JR.loaded&&JR.cnx.some(function(j){ return /messages-beta/.test(j.motif); })&&JR.cnx.some(function(j){ return /gestion-beta/.test(j.motif); })')) && (await TM.attendre('JR.loaded')));
    TG.run("JR.actions=[{ts:Date.now(),app:'gestion',tx:'Geste fait dans OP GESTION'},{ts:Date.now(),app:'messages',tx:'Geste fait dans OP MESSAGES'}]");
    TM.run("JR.actions=[{ts:Date.now(),app:'gestion',tx:'Geste fait dans OP GESTION'},{ts:Date.now(),app:'messages',tx:'Geste fait dans OP MESSAGES'}]");
    TG.run("JR.f='tout'"); TM.run("JR.f='tout'");
    const jg = texte(TG.run('vueJournal()')), jm = texte(TM.run('vueJournal()'));
    v('⛔ Journal d\'OP GESTION : son geste, pas celui d\'OP MESSAGES', [/Geste fait dans OP GESTION/.test(jg), /Geste fait dans OP MESSAGES/.test(jg)], [true, false]);
    v('⛔ Journal d\'OP MESSAGES : l\'inverse', [/Geste fait dans OP MESSAGES/.test(jm), /Geste fait dans OP GESTION/.test(jm)], [true, false]);
    v('⛔ l\'action notée par le serveur suit la console de sa route (messages-beta ici, gestion-beta là)', [TM.run("vueJournal(); (JR.cnx||[]).filter(function(j){ return j.app; }).map(function(j){ return j.app+':'+(/messages-beta/.test(j.motif)?'m':'g'); }).sort().join(',')")], ['gestion:g,messages:m']);
    vrai('⛔ le renvoi vers « Courrier → Envois TeamOP » n\'est que dans le Journal d\'OP GESTION', /Envois TeamOP/.test(jg) && !/Envois TeamOP/.test(jm));

    console.log('\n── 979 · 5. Équipe : chaque console ses comptes ──');
    TG.run('chargerEquipe()'); TM.run('chargerEquipe()');
    vrai('population : les quatre comptes sont lus', (await TG.attendre('EQ.loaded&&EQ.users.length===4')) && (await TM.attendre('EQ.loaded&&EQ.users.length===4')));
    const groupes = (T) => { const h = T.run('vueEquipe()'); const o = {}; h.split('<div class="reg-g">').slice(1).forEach(g => { const nom = texte((/<span class="reg-nom">([\s\S]*?)<\/span>/.exec(g) || [])[1]); o[nom.trim()] = ['Patron', 'Gaston', 'Mona', 'Dora'].filter(n => g.indexOf('title="' + n + '"') >= 0); }); return o; };
    const gG = groupes(TG), gM = groupes(TM);
    v('⛔ console OP GESTION : le patron, Gaston et Dora ; Mona à part', [gG['Accès ouverts'], gG['Sans accès à la Tour OP GESTION']], [['Patron', 'Gaston', 'Dora'], ['Mona']]);
    v('⛔ console OP MESSAGES : le patron, Mona et Dora ; Gaston à part', [gM['Accès ouverts'], gM['Sans accès à la Tour OP MESSAGES']], [['Patron', 'Mona', 'Dora'], ['Gaston']]);
    vrai('le formulaire coche la console ouverte, pas l\'autre', /id="eq-app-messages" checked/.test(TM.run('vueEquipe()')) && !/id="eq-app-gestion" checked/.test(TM.run('vueEquipe()')) && /id="eq-app-gestion" checked/.test(TG.run('vueEquipe()')));
    vrai('⛔ plus de « (en travaux) » à côté d\'OP MESSAGES', !/en travaux/.test(TM.run('vueEquipe()')));
    vrai('la note du collaborateur décrit SA console : dans OP MESSAGES, pas d\'Abonnements ni de Courrier', !/Abonnements|Courrier/.test(TM.run('eqNoteCollaborateur()')) && /Courrier/.test(TG.run('eqNoteCollaborateur()')));

    console.log('\n── 979 · 6. Entreprises ──');
    /* une erreur d'OP GESTION et deux d'OP MESSAGES, chez la même entreprise */
    fs.appendFileSync(path.join(D, 'bugs.jsonl'), [{ team: 'ent-x', app: 'opgestion', ts: N, msg: 'a' }, { team: 'ent-x', app: 'opmessages', ts: N, msg: 'b' }, { team: 'ent-x', app: 'opmessages', ts: N, msg: 'c' }].map(x => JSON.stringify(x)).join('\n') + '\n');
    const ents = (await (await fetch(B + '/api/monitor/entreprises', { headers: { Authorization: 'Bearer ' + PATRON } })).json());
    const x = (ents.entreprises || ents.liste || []).find(e => e.t === 'ent-x');
    v('⛔ le compteur d\'erreurs d\'une entreprise ne compte que celles d\'OP GESTION', x ? x.erreurs : 'introuvable (' + Object.keys(ents).join(',') + ')', 1);
    const fiche = bloc('ficheEntrepriseHtml') || CODE;
    vrai('⛔ la fiche d\'OP GESTION n\'ouvre ni ne ferme plus OP MESSAGES (elle dit où ça se règle)', /Se règle dans la console OP MESSAGES/.test(fiche) && !/Application séparée, abonnement séparé\. Fermée, elle disparaît/.test(CODE));
    TM.run("ENT.loaded=true; ENT.liste=[{t:'opgestion-beta',technique:true,nom:'',slug:''},{t:'a1',nom:'Atelier',slug:'atelier',opMessages:true},{t:'b1',nom:'Boucherie',slug:'boucherie'}]");
    v('la console OP MESSAGES surveille ses entreprises ouvertes, sans les espaces techniques', TM.run('nbEntSurveillees()'), 1);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
