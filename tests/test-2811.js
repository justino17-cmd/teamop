/* ══ test-2811 : LOT 1 DE LA REFONTE DE LA TOUR — (b) « AU RAPPORT » SUR L'ACCUEIL (21 octobre 2026) ══
   Ce qui attend un client, du plus ancien au plus récent : les demandes « À traiter » et « En cours » du Courrier. Deux moitiés, jouées
   ensemble — c'est la couture (CLAUDE.md : « dès qu'une page appelle une route neuve, un banc fait parler la VRAIE fonction au VRAI serveur ») :
     1. LE SERVEUR : `/api/monitor/mail/stats` rend `ouverts` — ouverts seulement (jamais « résolu »), sans les notifications automatiques
        (elles n'attendent personne), du plus ancien au plus récent, vingt au plus, et en LECTURE (le fichier de suivi ne bouge pas) ;
        un collaborateur le lit aussi (monAdmin), un anonyme non ;
     2. LA PAGE : la VRAIE `chargerRapport` (par la vraie `apiGet`) contre ce serveur, puis le VRAI bloc de l'accueil qui en fait le groupe
        « Au rapport » : quatre lignes au plus, le total vrai, « personne » quand rien n'est assigné, l'attente en rouge passé un jour ;
        ⛔ un serveur d'AVANT (sans `ouverts`) ou une lecture refusée : AUCUN groupe — jamais une liste vide qui dirait « rien n'attend ».
   Rien ne sort d'ici : 127.0.0.1, configuration et données jetables. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
console.log('── test-2811 : la Tour, lot 1 (b) — « Au rapport » ──');
let webpush; try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  (sauté : server/node_modules absent)\n\n0 ✓  0 ✗'); process.exit(0); }

const T = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let j = src.indexOf('{', i), p = 0; for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };
/* le bloc de l'accueil : de « if(RAP.l.length) » jusqu'au commentaire du groupe suivant. v2.119 : il vit dans `accueilGestion` (le groupe OP GESTION de l'accueil unique),
   que `vueAccueil` n'appelle que si la source Gestion est affichée — la condition `APP==='gestion'` est donc celle de cet appel. */
const iB = T.indexOf("if(RAP.l.length) G.push("), jB = T.indexOf('\n  /* v2.87 : une demande du site', iB);
const BLOC = iB > 0 && jB > iB ? T.slice(iB, jB) : '';
const iR = T.indexOf('var RAP={'), RAPV = iR > 0 ? T.slice(iR, T.indexOf('\n', iR)) : '';
const FN = ['function chargerRapport(', 'function attenteCourte(', 'function ligneAc(', 'function apiGet(', 'function esc(', 'function jsq(', 'function filtreEff(', 'function sourcesAff(', 'function aGestion('].map(e => corps(T, e));
v('(population) le bloc de l\'accueil, l\'état et les neuf fonctions sont trouvés dans le fichier livré', [BLOC.length > 300, RAPV.length > 10, FN.map(f => f.length > 40)], [true, true, [true, true, true, true, true, true, true, true, true]]);
const SANS = T.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
vrai('l\'accueil le charge en entrant (console OP GESTION) et le relit à la minute, onglet visible, accueil ouvert',
  /if\(MYAPPS\.indexOf\('gestion'\)>=0\)\{ chargerRapport\(\); setInterval\(function\(\)\{ if\(document\.visibilityState==='visible'&&TAB==='accueil'\) chargerRapport\(\); \},60000\); \}/.test(SANS));
vrai('⛔ l\'attente de moins d\'un jour ne porte JAMAIS .p-gris (4,44:1, le couple qui ne se rattrape pas)', !/p-gris/.test(BLOC) && /\.past\.p-attente\{background:var\(--tint-gris\);color:var\(--text2\)\}/.test(T));

(async () => {
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2811-'));
  let enfant = null;
  const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
  process.on('exit', fin);
  setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const MDP = 'banc-2811-patron', MDP2 = 'banc-2811-agent', H = 3600000, now = Date.now();
  /* 26 conversations ouvertes (plus que les vingt rendues), une résolue, deux notifications ouvertes — dans le désordre */
  const suivi = {};
  for (let i = 0; i < 26; i++) suivi['<o' + i + '@b2811>'] = { statut: i % 3 ? 'aTraiter' : 'enCours', assigne: i % 3 ? '' : 'Léa', par: '', ts: now, recuTs: now - (i * 7 % 26 + 1) * H, de: 'client' + i + '@exemple-2811.fr', objet: 'Demande ' + i };
  suivi['<vieille-resolue@b2811>'] = { statut: 'resolu', assigne: 'Léa', recuTs: now - 900 * H, de: 'r@exemple-2811.fr', objet: 'Résolue' };
  suivi['<notif1@b2811>'] = { statut: 'aTraiter', auto: true, recuTs: now - 999 * H, de: 'noreply@exemple-2811.fr', objet: 'Notification' };
  suivi['<notif2@b2811>'] = { statut: 'enCours', auto: 1, recuTs: now - 998 * H, de: 'noreply@exemple-2811.fr', objet: 'Notification 2' };
  const SUIVI = path.join(D, 'mail-suivi.json'); fs.writeFileSync(SUIVI, JSON.stringify(suivi)); const avant = fs.readFileSync(SUIVI, 'utf8');
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [
    { id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: now },
    { id: 'u-agent', nom: 'Agent', email: '', hash: sha(MDP2), role: 'collaborateur', actif: true, ts: now }] }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' }));
  const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  let journal = '';
  enfant = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9', TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk',
    TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs' }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  let vivant = false; for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + PORT + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le serveur démarre', vivant, journal.slice(-300));
  const login = async (nom, pass) => (await (await fetch('http://127.0.0.1:' + PORT + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.1' }, body: JSON.stringify({ nom, pass }) })).json()).token;
  const TP = await login('Patron', MDP), TA = await login('Agent', MDP2);
  vrai('une session de patron et une de collaborateur', TP && TA);
  const lire = async jet => { const r = await fetch('http://127.0.0.1:' + PORT + '/api/monitor/mail/stats', { headers: jet ? { Authorization: 'Bearer ' + jet } : {} }); return { s: r.status, d: r.ok ? await r.json() : null }; };

  console.log('\n── 1. Le serveur ──');
  const { d } = await lire(TP);
  const ouv = d && d.ouverts;
  vrai('`ouverts` est une liste', Array.isArray(ouv));
  v('vingt au plus (26 ouvertes au fichier)', ouv && ouv.length, 20);
  v('⛔ ouvertes seulement : ni « résolu », ni notification automatique', ouv && ouv.filter(x => !['aTraiter', 'enCours'].includes(x.statut) || /Notification|Résolue/.test(x.objet)).length, 0);
  v('du plus ANCIEN au plus récent', ouv && ouv.every((x, i) => !i || ouv[i - 1].recuTs <= x.recuTs), true);
  const attendu = Object.values(suivi).filter(x => !x.auto && x.statut !== 'resolu').sort((a, b) => a.recuTs - b.recuTs).slice(0, 20).map(x => x.objet);
  v('…et ce sont les vingt plus anciennes, dans l\'ordre', ouv && ouv.map(x => x.objet), attendu);
  v('chaque ligne porte cinq champs, rien d\'autre (ni `par`, ni identifiant)', ouv && Object.keys(ouv[0]).sort(), ['assigne', 'de', 'objet', 'recuTs', 'statut']);
  v('le total des ouverts reste celui du fichier (26), même quand la liste s\'arrête à vingt', d && d.aTraiter + d.enCours, 26);
  v('⛔ en LECTURE : le fichier de suivi n\'a pas bougé', fs.readFileSync(SUIVI, 'utf8') === avant, true);
  v('un collaborateur le lit (200), un anonyme non (401)', [(await lire(TA)).s, (await lire('')).s], [200, 401]);

  console.log('\n── 2. La page : la vraie chargerRapport, puis le vrai bloc de l\'accueil ──');
  let jeton = TP, rendus = 0, deconnexions = 0;
  const bac = { API: 'http://127.0.0.1:' + PORT, fetch, Promise, JSON, Date, String, Array, Math, Error, MYAPPS: ['gestion', 'messages'], TAB: 'accueil', FILTRE: 'gestion',
    hAuth: () => ({ Authorization: 'Bearer ' + jeton }), srvRepond: r => r, srvMuet: e => { throw e; }, doLogout: () => { deconnexions++; }, render: () => { rendus++; },
    msgErreur: () => 'Serveur injoignable.', svg: n => '<svg data-ic="' + n + '"></svg>', G: [] };
  vm.createContext(bac);
  vm.runInContext(RAPV + '\n' + FN.join('\n') + '\nthis.RAP=RAP;this.chargerRapport=chargerRapport;this.attenteCourte=attenteCourte;this.aGestion=aGestion;', bac);
  const groupe = () => { bac.G = []; vm.runInContext('(function(){ var G=this.G; ' + BLOC + ' }).call(this)', bac); return bac.G.find(g => g.titre === 'Au rapport') || null; };
  v('avant toute lecture : aucun groupe (on ne sait rien, on ne dit rien)', groupe(), null);
  await bac.chargerRapport();
  v('la lecture est faite, et l\'accueil ouvert est redessiné', [bac.RAP.loaded, bac.RAP.l.length, rendus], [true, 20, 1]);
  const g = groupe();
  vrai('le groupe « Au rapport » paraît', g);
  v('quatre lignes au plus ; le compteur dit le VRAI total (26), pas la longueur de la liste', g && [g.l.length, g.n, g.tot], [4, 4, 26]);
  v('⛔ le bandeau de l\'accueil ne compte que ce qui ATTEND quelqu\'un (17 « à traiter ») — pas les 9 déjà « en cours »', g && g.compte, 17);
  v('« Voir tout » et chaque ligne mènent au Courrier', g && [g.voir, g.l.every(x => x.indexOf("setTab('support')") > 0)], ["setTab('support')", true]);
  const L0 = g ? g.l[0] : '';
  vrai('la première ligne est la plus ancienne (« ' + attendu[0] + ' »), avec son expéditeur', L0.indexOf('>' + attendu[0] + '<') > 0 && /client\d+@exemple-2811\.fr/.test(L0), L0);
  const enCours = g ? g.l.find(x => /en cours/.test(x)) : '', aTraiter = g ? g.l.find(x => /à traiter/.test(x)) : '';
  vrai('« en cours » nomme qui s\'en occupe (avant l\'adresse, qui se coupe), en bleu', enCours && /en cours · <b>Léa<\/b> · /.test(enCours) && /ac-ico bleu/.test(enCours), enCours);
  vrai('« à traiter » sans personne le DIT (« personne »), en ambre', aTraiter && /à traiter · personne · /.test(aTraiter) && /ac-ico ambre/.test(aTraiter), aTraiter);
  vrai('⛔ passé un jour, l\'attente est en ROUGE (la plus ancienne attend 26 h)', /past p-rouge">26 h</.test(L0), L0);
  v('l\'attente se dit court : « 12 min », « 5 h », « 3 j »', [bac.attenteCourte(Date.now() - 12 * 60000), bac.attenteCourte(Date.now() - 5 * H), bac.attenteCourte(Date.now() - 72 * H)], ['12 min', '5 h', '3 j']);
  bac.FILTRE = 'messages';
  v('⛔ filtre « Messages » : la Tour ne relit pas le rapport pour l\'accueil (le Courrier est celui d\'OP GESTION — chargerRapport se tait sur l\'accueil)', bac.aGestion(), false);
  vrai('⛔ …et l\'accueil ne dessine le groupe OP GESTION (donc « Au rapport ») que si la source Gestion est affichée', (s => /g=G\?accueilGestion\(\):null/.test(s) && /var G=aGestion\(\), M=aMessages\(\)/.test(s))(T.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ')));
  bac.FILTRE = 'gestion';
  const nom = '<img src=x onerror=alert(1)>';
  bac.RAP.l = [{ statut: 'aTraiter', assigne: '', recuTs: Date.now() - 60000, de: nom, objet: nom }];
  const gx = groupe();
  vrai('⛔ un objet ou un expéditeur reçu de l\'extérieur est ÉCHAPPÉ (aucune balise ne passe)', gx && gx.l[0].indexOf('<img') < 0 && gx.l[0].indexOf('&lt;img') > 0, gx && gx.l[0]);
  vrai('…et l\'attente de moins d\'un jour porte la pastille lisible (p-attente)', gx && /past p-attente">1 min</.test(gx.l[0]), gx && gx.l[0]);

  /* ⛔ un serveur d'AVANT : pas de champ `ouverts`. On le simule par un relais qui RETIRE le champ neuf (la règle de test-833). */
  const vraiFetch = fetch;
  bac.fetch = (u, o) => vraiFetch(u, o).then(r => r.json().then(j => { delete j.ouverts; return new Response(JSON.stringify(j), { status: r.status, headers: { 'Content-Type': 'application/json' } }); }));
  await bac.chargerRapport();
  v('⛔ serveur d\'avant (sans `ouverts`) : la liste est VIDE et AUCUN groupe ne paraît', [bac.RAP.l.length, groupe()], [0, null]);
  bac.fetch = vraiFetch;
  await bac.chargerRapport();
  vrai('(contre-épreuve) le vrai serveur rend le groupe de nouveau', groupe());
  jeton = 'a'.repeat(48);
  await bac.chargerRapport();
  v('⛔ session expirée : aucun groupe, et la Tour ramène à la connexion', [groupe(), deconnexions], [null, 1]);
  jeton = TP; await bac.chargerRapport();
  vrai('(population) une liste pleine avant la panne', bac.RAP.l.length === 20 && groupe());
  bac.API = 'http://127.0.0.1:1';
  await bac.chargerRapport();
  v('⛔ serveur injoignable : la liste d\'avant RESTE (rien ne s\'efface sur une panne) et la panne est notée pour l\'accueil', [!!groupe(), bac.RAP.l.length, bac.RAP.err], [true, 20, 'Serveur injoignable.']);
  bac.API = 'http://127.0.0.1:' + PORT; await bac.chargerRapport();
  v('…et une relève réussie efface la panne', bac.RAP.err, '');
  bac.MYAPPS = ['messages']; bac.RAP.l = []; const r0 = rendus;
  await bac.chargerRapport();
  v('une Tour sans la console OP GESTION ne le lit pas', [bac.RAP.l.length, rendus], [0, r0]);

  /* l'accueil (relecture du 22 octobre 2026) : la panne se dit dans « Ce qui n'a pas pu être lu », le vide n'est dit qu'une fois lu, le bandeau compte « compte » */
  const SANS = T.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  vrai('⛔ une relève ratée se DIT dans « Ce qui n\'a pas pu être lu », avec « Réessayer » (chargerRapport)', /if\(RAP\.err\) pannes\.push\(ligneAc\(\{[^]*?action:"chargerRapport\(\)"\}\)\);/.test(SANS));
  vrai('⛔ « Rien en attente » n\'est dit qu\'une fois « Au rapport » lu (squelette avant)', /else if\(!INC\.loaded\|\|!CLI\.loaded\|\|!ABO\.loaded\|\|!RAP\.loaded\) prio=acSquel\(\);/.test(SANS));
  vrai('le bandeau additionne `compte` quand un groupe le donne, sinon `tot`', /t\+\(g\.compte!=null\?g\.compte:\(g\.tot\|\|0\)\)/.test(SANS));
  vrai('⛔ côté serveur, une date d\'en-tête dans le futur se borne À LA CRÉATION à l\'heure du serveur', /recuTs: Math\.min\(\(env\.date && new Date\(env\.date\)\.getTime\(\)\) \|\| Date\.now\(\), Date\.now\(\)\)/.test(fs.readFileSync(path.join(RACINE, 'server', 'mail.js'), 'utf8')));

  /* ⛔ une entrée déjà écrite avec une date dans le FUTUR (avant le correctif, ou un fichier recopié) : un second serveur, trois demandes */
  try { enfant.kill('SIGKILL'); } catch (e) {}
  fs.writeFileSync(SUIVI, JSON.stringify({ '<a@b2811>': { statut: 'aTraiter', recuTs: now - 2 * H, de: 'a@exemple-2811.fr', objet: 'Ancienne' },
    '<f@b2811>': { statut: 'aTraiter', recuTs: now + 30 * 86400000, de: 'f@exemple-2811.fr', objet: 'Datée du futur' }, '<b@b2811>': { statut: 'enCours', recuTs: now - H, de: 'b@exemple-2811.fr', objet: 'Récente' } }));
  journal = '';
  enfant = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9', TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk',
    TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs' }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', x => { journal += x; }); enfant.stderr.on('data', x => { journal += x; });
  let vivant2 = false; for (let i = 0; i < 100 && !vivant2; i++) { try { vivant2 = (await fetch('http://127.0.0.1:' + PORT + '/health')).ok; } catch (e) {} if (!vivant2) await dormir(100); }
  const TP2 = vivant2 ? await login('Patron', MDP) : '';
  const o2 = vivant2 ? (await lire(TP2)).d.ouverts : [];
  const fut = (o2 || []).find(x => x.objet === 'Datée du futur');
  v('⛔ (second serveur) une demande datée du futur : bornée à maintenant, jamais au-delà', [o2.map(x => x.objet), !!fut && fut.recuTs <= Date.now() && fut.recuTs >= now], [['Ancienne', 'Récente', 'Datée du futur'], true]);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
