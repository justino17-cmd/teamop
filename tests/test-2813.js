/* ══ test-2813 : LOT 1 DE LA REFONTE DE LA TOUR — (d) INCIDENTS (21 octobre 2026) ══
   La page « Incidents » : un problème par ligne, le plus grave d'abord, puis ce que personne n'a pris, puis le plus récent ; qui s'en occupe
   (le dernier qui a agi, « personne » sinon), depuis quand, combien d'entreprises. La MÊME liste que la Surveillance (`chargerIncidents`,
   /api/monitor/issues) : aucune route neuve, aucune écriture. La couture se joue avec le VRAI serveur (incidents posés dans `monitor.json`,
   une prise en charge faite par la VRAIE route de statut) et les VRAIES fonctions de la page :
     · ordre : gravité, puis « personne dessus », puis récence ; ⛔ la console ouverte seulement (un incident d'OP MESSAGES n'est pas ici) ;
     · ⛔ « suivi par » nomme qui a VRAIMENT pris en charge (le serveur l'a écrit), « personne dessus » sinon ;
     · corrigés des trente derniers jours à part ; ignorés nulle part ; un nom reçu d'une application est ÉCHAPPÉ ;
     · ⛔ une surveillance en panne n'est jamais « aucun incident » ; une relève ratée après une bonne le dit.
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
console.log('── test-2813 : la Tour, lot 1 (d) — Incidents ──');
let webpush; try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  (sauté : server/node_modules absent)\n\n0 ✓  0 ✗'); process.exit(0); }
const T = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let j = src.indexOf('{', i), p = 0; for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };
const ligne = (debut) => { const i = T.indexOf(debut); return i < 0 ? '' : T.slice(i, T.indexOf('\n', i)); };
const FN = ['function chargerIncidents(', 'function vueIncidents(', 'function incDernierGeste(', 'function incOuverts(', 'function incDeLaConsole(', 'function incTitre(', 'function entNom(', 'function gravite(',
  'function appDe(', 'function appVisible(', 'function filtreEff(', 'function sourcesAff(', 'function ligneAc(', 'function abnGroupe(', 'function acErr(', 'function videTour(', 'function esc(', 'function jsq(', 'function fmtJour(', 'function fmtAgo(', 'function apiGet('].map(e => corps(T, e));
const VARS = ['var INC_GRAV_R=', 'var APP_L='].map(ligne);
const APPS = corps(T, 'var APPS_TOUR=');
v('(population) les 21 fonctions, deux tables et APPS_TOUR sont trouvées dans le fichier livré', [FN.filter(f => f.length < 30).length, VARS.map(x => x.length > 15), APPS.length > 100], [0, [true, true], true]);

(async () => {
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2813-'));
  let enfant = null;
  const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
  process.on('exit', fin);
  setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const H = 3600000, now = Date.now(), MDP = 'banc-2813-patron';
  const ent = (n, k) => Array.from({ length: n }, (_, i) => ({ nom: 'Entreprise ' + k + i, count: 1, lastTs: now }));
  const I = (id, o) => Object.assign({ id, app: 'opgestion', type: 'erreur', statut: 'nouveau', count: 1, firstTs: now - 48 * H, lastTs: now - H, entreprises: ent(1, id), message: 'Problème ' + id }, o);
  const issues = [
    I('moyen-pris', { lastTs: now - 2 * H }),                                                 // moyenne, sera pris en charge par la vraie route
    I('moyen-libre-vieux', { lastTs: now - 5 * H }),                                          // moyenne, personne
    I('moyen-libre-neuf', { lastTs: now - 0.5 * H, entreprises: [{ nom: '<img src=x onerror=alert(1)>', count: 1 }] }),
    I('haut', { count: 12, lastTs: now - 9 * H, entreprises: ent(4, 'h') }),                  // gravité haute (≥ 10, ≥ 3 entreprises)
    I('lent', { type: 'lenteur', lastTs: now - 3 * H, entreprises: [] }),                      // moyenne, aucune entreprise identifiée
    I('corrige-recent', { statut: 'corrige', par: 'Léa', lastTs: now - 3 * 86400000, historique: [{ ts: now - 2 * 86400000, par: 'Léa', action: 'Marqué corrigé' }] }),
    I('corrige-vieux', { statut: 'corrige', par: 'Léa', lastTs: now - 40 * 86400000, historique: [{ ts: now - 40 * 86400000, par: 'Léa', action: 'Marqué corrigé' }] }),
    I('ignore', { statut: 'ignore', lastTs: now - H }),
    I('messages', { app: 'opmessages', lastTs: now - 0.1 * H })];
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues, users: [{ id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: now }] }));
  const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  let journal = '';
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9', TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk',
    TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs' }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  let vivant = false; for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + PORT + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le serveur démarre', vivant, journal.slice(-300));
  const TP = (await (await fetch('http://127.0.0.1:' + PORT + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json()).token;
  vrai('une session de patron', TP);
  const pris = await fetch('http://127.0.0.1:' + PORT + '/api/monitor/status', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TP }, body: JSON.stringify({ id: 'moyen-pris', statut: 'encours' }) });
  v('la VRAIE route de statut prend « moyen-pris » en charge, au nom du patron', pris.status, 200);

  let jeton = TP, rendus = 0;
  const bac = { API: 'http://127.0.0.1:' + PORT, fetch, Promise, JSON, Date, String, Array, Math, Error, Number, MYAPPS: ['gestion', 'messages'], FILTRE: 'gestion', TAB: 'incidents',
    hAuth: () => ({ Authorization: 'Bearer ' + jeton }), srvRepond: r => r, srvMuet: e => { throw e; }, doLogout: () => {}, render: () => { rendus++; },
    msgErreur: () => 'Serveur injoignable.', setBdg: () => {}, majCompteursApp: () => {}, majBarreBas: () => {}, incNoteEnCours: () => false,
    svg: n => '<svg data-ic="' + n + '"></svg>', enTete: (t, ph, ac) => '<h1>' + t + '</h1>', acSquel: () => '<squelette>',
    INC: { list: [], cnt: {}, nbEnt: 0, loaded: false, err: '', sel: null, f: {} } };
  vm.createContext(bac);
  vm.runInContext(APPS + ';\n' + VARS.join('\n') + '\n' + FN.join('\n') + '\nthis.chargerIncidents=chargerIncidents;this.vueIncidents=vueIncidents;', bac);
  const texte = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const lignes = h => (h.match(/<button type="button" class="reg-l[^"]*" onclick="allerIncident\('[^']+'\)">[\s\S]*?<\/button>/g) || []);
  const idDe = l => (l.match(/allerIncident\('([^']+)'\)/) || [])[1];
  v('avant la lecture : un squelette', /<squelette>/.test(bac.vueIncidents()), true);
  bac.chargerIncidents(); for (let i = 0; i < 40 && !bac.INC.loaded; i++) await dormir(25);
  v('la vraie chargerIncidents lit le vrai serveur et redessine la page ouverte', [bac.INC.loaded, bac.INC.err, bac.INC.list.length, rendus > 0], [true, '', 9, true]);
  const Hm = bac.vueIncidents(), L = lignes(Hm), X = texte(Hm);
  const ouverts = L.filter(l => !/p-vert/.test(l)).map(idDe), corriges = L.filter(l => /p-vert/.test(l)).map(idDe);
  v('ouverts : gravité haute, puis personne dessus (le plus récent d\'abord), puis le pris en charge', ouverts, ['haut', 'moyen-libre-neuf', 'lent', 'moyen-libre-vieux', 'moyen-pris']);
  v('⛔ la console ouverte seulement : l\'incident d\'OP MESSAGES n\'est pas ici ; l\'ignoré nulle part', [L.some(l => idDe(l) === 'messages'), L.some(l => idDe(l) === 'ignore')], [false, false]);
  v('corrigés des trente derniers jours, à part (le vieux non)', corriges, ['corrige-recent']);
  const lp = L.find(l => idDe(l) === 'moyen-pris') || '', ll = L.find(l => idDe(l) === 'moyen-libre-vieux') || '', lh = L.find(l => idDe(l) === 'haut') || '';
  vrai('⛔ « suivi par » nomme qui a VRAIMENT pris en charge (écrit par le serveur)', /suivi par <b>Patron<\/b>/.test(lp), lp);
  vrai('…et « personne dessus » quand personne ne l\'a pris', /personne dessus/.test(ll), ll);
  vrai('la gravité haute : ligne haute, en rouge, « 4 entreprises », ×12', / haut"/.test(lh.slice(0, 60)) && /ac-ico rouge/.test(lh) && /4 entreprises/.test(lh) && /p-rouge">×12</.test(lh), lh);
  vrai('depuis quand, et la dernière fois', /depuis le /.test(ll) && /dernière fois /.test(ll), ll);
  vrai('aucune entreprise identifiée : la ligne le DIT', /aucune entreprise identifiée/.test(L.find(l => idDe(l) === 'lent') || ''));
  vrai('un corrigé nomme qui l\'a corrigé', /corrigé par <b>Léa<\/b>/.test(L.find(l => idDe(l) === 'corrige-recent') || ''));
  vrai('⛔ un nom d\'entreprise reçu d\'une application est ÉCHAPPÉ', Hm.indexOf('<img src=x') < 0 && Hm.indexOf('&lt;img src=x') > 0);
  vrai('tuiles : 5 ouverts, 1 grave, 4 personne dessus (le grave compris), 1 corrigé', /5 Ouverts 1 Gravité haute 4 Personne dessus 1 Corrigés en 30 jours/.test(X), X.slice(0, 200));

  bac.FILTRE = 'messages';
  const Hmsg = bac.vueIncidents();
  v('avec le filtre « Messages », seul son incident paraît', lignes(Hmsg).map(idDe), ['messages']);
  bac.FILTRE = 'tout';
  v('avec « Tout », les incidents des DEUX applications paraissent (v2.119)', lignes(bac.vueIncidents()).length > lignes(Hmsg).length && lignes(bac.vueIncidents()).map(idDe).indexOf('messages') >= 0, true);
  bac.FILTRE = 'gestion';

  bac.API = 'http://127.0.0.1:1'; bac.chargerIncidents(); await dormir(300);
  const Hav = texte(bac.vueIncidents());
  vrai('une relève ratée après une bonne : la liste d\'avant reste, et la page le DIT', /la liste affichée est celle d’avant/.test(Hav) && /Problème haut/.test(Hav), Hav.slice(0, 200));
  bac.INC.loaded = false; bac.INC.list = []; bac.INC.err = ''; bac.INC.avert = '';
  bac.chargerIncidents(); for (let i = 0; i < 40 && !bac.INC.loaded; i++) await dormir(25);
  const Hp = texte(bac.vueIncidents());
  vrai('⛔ surveillance injoignable, rien de lu : « La surveillance ne répond pas » — jamais « aucun incident »', /La surveillance ne répond pas/.test(Hp) && !/Aucun incident/.test(Hp), Hp);
  bac.INC = { list: [], loaded: true, err: '' };
  vrai('rien de signalé : « Aucun incident »', /Aucun incident Rien de signalé/.test(texte(bac.vueIncidents())));
  bac.INC = { list: [I('c', { statut: 'corrige', lastTs: now - H })], loaded: true, err: '' };
  const Hc = texte(bac.vueIncidents());
  vrai('que des corrigés : « Aucun incident ouvert », puis les corrigés', /Aucun incident ouvert/.test(Hc) && /Corrigés récemment/.test(Hc), Hc);

  const SANS = T.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  vrai('plus « en construction » ; sa branche de rendu ; chargée à l\'ouverture ; redessinée quand la relève arrive',
    !/\n  incidents:\['Incidents'/.test(T) && /else if\(TAB==='incidents'\) v\.innerHTML=groupeOnglets\('incidents'\)\+vueIncidents\(\);/.test(SANS) &&
    /if\(t==='incidents'&&\(!INC\.loaded\|\|INC\.err\)\) chargerIncidents\(\);/.test(SANS) && (corps(T, 'function chargerIncidents(').match(/TAB==='incidents'/g) || []).length === 2);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
