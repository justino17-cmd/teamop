/* ══ test-2815 : LOT 1 DE LA REFONTE DE LA TOUR — (f) AGENTS : « QUI FAIT QUOI, EN CE MOMENT » (21 octobre 2026) ══
   En tête de l'onglet Équipe d'Agents : au travail, disponibles, à l'arrêt, tâches en attente — et, sur la carte de chaque agent, ce qu'il
   fait en ce moment. EN LECTURE, sur la file de tâches entre agents qui existe (/api/monitor/agents/taches). La couture se joue avec le
   VRAI serveur (modes et tâches posés dans leurs fichiers, pause générale par la VRAIE route du patron, un second serveur dont la file est
   illisible) et les VRAIES fonctions de la page, `vueAgents` comprise :
     · « au travail » = une tâche PRISE ; « en attente » = elle l'attend ; une tâche finie ne compte nulle part ;
     · ⛔ un agent à l'arrêt, ou une pause générale, ne fait rien, quoi que la file contienne — ce qui l'attend est dit ;
     · ⛔ une file illisible n'est jamais « disponible » ni « rien en cours » : on dit qu'on ne sait pas ;
     · un nom de tâche se lit en français, une valeur inconnue est échappée. Rien ne s'écrit d'ici.
   Rien ne sort d'ici : 127.0.0.1, configuration et données jetables. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
console.log('── test-2815 : la Tour, lot 1 (f) — Agents, qui fait quoi ──');
let webpush; try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  (sauté : server/node_modules absent)\n\n0 ✓  0 ✗'); process.exit(0); }
const T = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let j = src.indexOf('{', i), p = 0; for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };
const ligne = d => { const i = T.indexOf(d); return i < 0 ? '' : T.slice(i, T.indexOf('\n', i)); };
const NEUVES = ['agTachesDe', 'agDispo', 'agEnCoursTxt', 'agQuiFaitQuoi', 'agAide'];
const FN = NEUVES.concat(['vueAgents', 'chargerAgents', 'agMode', 'agEnPause', 'agNom', 'agParId', 'agParams', 'esc', 'apiGet', 'fmtDate', 'fmtHeure', 'agAvatar']).map(n => corps(T, 'function ' + n + '('));
const VARS = ['var AG_MODES=', 'var AG_STATUTS=', 'var AG_PHOTOS='].map(ligne).concat([corps(T, 'var AG_TYPES=')]);
v('(population) les 16 fonctions et les quatre tables sont trouvées dans le fichier livré', [FN.filter(f => f.length < 30).length, VARS.map(x => x.length > 40)], [0, [true, true, true, true]]);
v('⛔ les fonctions neuves n\'écrivent rien (aucun apiPost, aucun fetch)', FN.slice(0, NEUVES.length).filter(f => /apiPost|fetch\(/.test(f)).length, 0);

const MDP = 'banc-2815-patron', now = Date.now();
const preparer = (taches) => {
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2815-')), D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [{ id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: now }] }));
  fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes: { camille: 'brouillon', hugo: 'auto', max: 'auto' } }));
  fs.writeFileSync(path.join(D, 'agents-taches.json'), taches);
  return { banc, D };
};
const demarrer = async ({ banc, D }) => {
  const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  let journal = '';
  const e = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9', TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk',
    TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs' }), stdio: ['ignore', 'pipe', 'pipe'] });
  e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
  let vivant = false; for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + PORT + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
  const TP = vivant ? (await (await fetch('http://127.0.0.1:' + PORT + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json()).token : '';
  return { e, API: 'http://127.0.0.1:' + PORT, vivant, TP, journal: () => journal };
};
const K = (id, vers, de, type, statut, dt, params) => ({ id, ts: now - dt * 60000, de, vers, type, params: params || { ref: 'x' }, statut });
const TACHES = [
  K('t1', 'camille', 'victor', 'escalade_humain', 'prise', 30),
  K('t2', 'camille', 'max', 'signaler_erreur', 'attente', 20),
  K('t3', 'jules', 'camille', 'relire_envoi', 'attente', 15),          // jules est à l'arrêt
  K('t4', 'hugo', 'victor', 'verifier_paiement', 'faite', 60),          // finie : ne compte nulle part
  K('t5', 'max', 'victor', 'verifier_paiement', 'attente', 10),
  K('t6', 'nina', 'max', 'signaler_erreur', 'prise', 5),                // nina est à l'arrêt : elle ne « travaille » pas
  K('t7', 'hugo', 'camille', '<img src=x onerror=alert(1)>', 'attente', 2),
  K('t8', 'jules', 'victor', 'relire_envoi', 'faite', 40),             // finie, chez un agent à l'arrêt : ne l'attend pas
  K('t9', 'jules', 'victor', 'relire_envoi', 'echec', 45)];            // échouée : ne l'attend pas non plus

(async () => {
  const enfants = [], bancs = [];
  const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); bancs.forEach(b => { try { fs.rmSync(b, { recursive: true, force: true }); } catch (x) {} }); };
  process.on('exit', fin);
  setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();
  const P1 = preparer(JSON.stringify(TACHES)); bancs.push(P1.banc);
  const S = await demarrer(P1); enfants.push(S.e);
  vrai('le serveur démarre, une session de patron', S.vivant && S.TP, S.journal().slice(-300));

  let jeton = S.TP;
  const bac = { API: S.API, fetch, Promise, JSON, Date, String, Array, Math, Error, Number, Object, MYROLE: 'patron', TAB: 'agents',
    hAuth: () => ({ Authorization: 'Bearer ' + jeton }), srvRepond: r => r, srvMuet: e => { throw e; }, doLogout: () => {}, render: () => {}, msgErreur: () => 'Serveur injoignable.',
    agCvCharger: () => {}, agCvVue: () => '', agDirVue: () => '', agDosFiche: () => '', agDosListe: () => '', acSquel: () => '<squelette>', agIllisible: t => '<illisible>' + t,
    enTete: (t) => '<h1>' + t + '</h1>', svg: () => '',
    AG: { loaded: false, err: '', illisible: false, pause: null, agents: [], enAttente: 0, validations: [], journal: [], taches: [], lec: { validations: 0, journal: 0, taches: 0 }, sec: 'equipe', busy: false, cv: { nonLus: 0 }, dos: {} } };
  vm.createContext(bac);
  vm.runInContext(VARS.join('\n') + '\n' + FN.join('\n') + '\n' + NEUVES.concat(['vueAgents', 'chargerAgents']).map(n => 'this.' + n + '=' + n + ';').join(''), bac);
  const texte = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const lire = async () => { bac.AG.loaded = false; bac.AG.lec = { validations: 0, journal: 0, taches: 0 }; bac.chargerAgents(); for (let i = 0; i < 80 && !(bac.AG.loaded && bac.AG.lec.taches); i++) await dormir(25); };
  /* Tour v2.112 : la ligne d'une rangée = le mot d'état (« Auto », « À l'arrêt »…) puis, SEULEMENT s'il sert, une phrase d'aide. On lit [data-d, aide] ; aide = '' quand rien n'est dit. */
  const carte = (H, nom) => { const m = H.match(new RegExp('<h3>' + nom + '</h3>[\\s\\S]*?<div class="ag-encours" data-d="([a-z]+)"><span class="ag-etat" data-e="[a-z]+">[^<]*</span>(?:<span class="ag-aide"> · ([\\s\\S]*?)</span>)?</div>')); return m ? [m[1], m[2] || ''] : null; };
  const compte = (H, d) => (H.match(new RegExp('<div class="ag-encours" data-d="' + d + '">', 'g')) || []).length;
  await lire();
  v('la vraie chargerAgents lit les agents et la file de tâches du vrai serveur', [bac.AG.loaded, bac.AG.err, bac.AG.agents.length, bac.AG.lec.taches, bac.AG.taches.length], [true, '', 16, 1, 9]);
  const H = bac.vueAgents(), X = texte(H);
  vrai('la ligne d\'état : 2 en auto · 1 en brouillon · 13 à l\'arrêt · 4 tâches en attente (plus de tuiles)', /2 en auto · 1 en brouillon · 13 à l’arrêt · 4 tâches en attente/.test(X) && !/Au travail|Disponibles/.test(X), X.slice(0, 300));
  v('(population) la répartition « au travail / disponibles / à l\'arrêt » tient dans les données des rangées : 1 · 2 · 13', [compte(H, 'occupe'), compte(H, 'libre'), compte(H, 'arret')], [1, 2, 13]);
  v('Camille : au travail sur SA tâche prise, puis une en attente', carte(H, 'Camille'), ['occupe', 'En ce moment : <b>Passer la main à une personne</b> · demandé par Victor · puis 1 en attente']);
  v('Max : disponible, une tâche l\'attend', carte(H, 'Max'), ['libre', 'En attente : <b>Vérifier un paiement</b> · demandé par Victor']);
  v('⛔ Jules, à l\'arrêt : il ne fait rien — et ce qui l\'attend est dit', carte(H, 'Jules'), ['arret', '1 tâche l’attend']);
  v('⛔ Nina, à l\'arrêt avec une tâche « prise » : elle ne travaille PAS — la tâche interrompue l\'attend', carte(H, 'Nina'), ['arret', '1 tâche l’attend']);
  const hugo = carte(H, 'Hugo');
  vrai('⛔ Hugo : sa tâche finie ne compte pas ; un type inconnu est ÉCHAPPÉ', hugo[0] === 'libre' && /^En attente : <b>&lt;img src=x/.test(hugo[1]) && H.indexOf('<img src=x') < 0, hugo);
  v('un agent allumé sans rien dans la file : rien à dire (le mot « Auto » suffit — plus de « Rien en cours »)', bac.agEnCoursTxt({ id: 'zzz', mode: 'auto' }), '');
  v('un agent à l\'arrêt sans tâche : rien à dire non plus (plus de « Ne fait rien tant que tu ne l\'allumes pas »)', carte(H, 'Louis'), ['arret', '']);
  vrai('la ligne d\'état paraît sous le rôle de CHAQUE rangée (16, hors Pauline qui est externe), et plus aucune redite « Branché — … »', (H.match(/<div class="ag-encours" data-d="(?!externe)/g) || []).length === 16 && (H.match(/data-d="externe"/g) || []).length === 1 && !/Branché|Ne fait rien tant que|Rien en cours/.test(H), [(H.match(/<div class="ag-encours" data-d="(?!externe)/g) || []).length, (H.match(/Branché|Ne fait rien tant que|Rien en cours/) || [])[0]]);

  /* pause générale, par la VRAIE route du patron */
  const pz = await fetch(S.API + '/api/monitor/agents/pause', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.TP }, body: JSON.stringify({ pause: true, motif: 'banc' }) });
  v('le patron pose la pause générale (vraie route)', pz.status, 200);
  await lire();
  const HP = bac.vueAgents(), XP = texte(HP);
  vrai('⛔ pause générale : les 16 à l\'arrêt, personne « au travail », Camille ne fait rien — le mot d\'état dit « En pause »', compte(HP, 'arret') === 16 && compte(HP, 'occupe') + compte(HP, 'libre') === 0 && /Pause générale : tous les agents sont à l’arrêt/.test(XP) && (HP.match(/data-e="pause">En pause</g) || []).length === 16 && carte(HP, 'Camille')[0] === 'arret' && carte(HP, 'Camille')[1] === '2 tâches l’attendent', XP.slice(0, 300));

  /* ⛔ un second serveur, file de tâches ILLISIBLE */
  const P2 = preparer('{ tronqué'); bancs.push(P2.banc);
  const S2 = await demarrer(P2); enfants.push(S2.e);
  vrai('(second serveur, file de tâches illisible) il démarre', S2.vivant && S2.TP, S2.journal().slice(-300));
  bac.API = S2.API; jeton = S2.TP;
  await lire();
  const HI = bac.vueAgents(), XI = texte(HI);
  vrai('⛔ file illisible (503) : la ligne d\'état DIT « tâches illisibles » (jamais « 0 tâche »), et aucun agent allumé n\'est « disponible »', bac.AG.lec.taches === -1 && /13 à l’arrêt · tâches illisibles/.test(XI) && !/0 tâche/.test(XI) && compte(HI, 'libre') === 0 && compte(HI, 'occupe') === 0, XI.slice(0, 400));
  v('⛔ …et Camille, allumée, n\'est ni « disponible » ni « rien en cours »', carte(HI, 'Camille'), ['inconnu', 'On ne sait pas : les tâches n’ont pas pu être lues']);
  v('…Jules, à l\'arrêt, l\'est toujours (le mode, lui, a été lu)', carte(HI, 'Jules'), ['arret', '']);
  bac.AG.lec.taches = 0;
  vrai('pendant la lecture : la ligne d\'état ne parle pas des tâches (jamais un zéro), et personne n\'est « disponible »', !/tâche/.test(texte(bac.vueAgents()).split('Équipe Validations')[0].replace('Les agents IA','')) && compte(bac.vueAgents(), 'libre') === 0);

  const SANS = T.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  vrai('la ligne d\'état est dans la barre du haut, avec les deux boutons globaux', /<b>'\+\s*\(AG\.illisible\?'État illisible[^\n]*:agQuiFaitQuoi\(\)\)\+'<\/b>'\+/.test(SANS));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
