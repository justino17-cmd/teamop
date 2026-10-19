/* ⛔ CE QUE CE FICHIER GARDE — LE MOTEUR DE TRI D'OP COURRIER (18 octobre 2026) : celui du MODULE, pas une copie.

   OP Courrier classe chaque mail reçu (Principal, Notifications, Reçus, Voyages, Promotions, Indésirables) par un moteur de fonctions pures, `classify(msg, ctx)`.
   Le module `opcourrier.js` l'EMBARQUE (un seul fichier, aucun chargement), et le futur serveur d'OP Courrier prendra le même code : « même code côté serveur ».
   Les quatre bancs de la maquette (`tests/courrier-moteur-tri/`) le jugent : le sien (39 cas) et trois jeux « à l'aveugle » (60, 60 et 72 mails, écrits sans regarder
   les règles). Ce banc les joue deux fois :
     1. sur la copie de RÉFÉRENCE (`tests/courrier-moteur-tri/classify.js`) ;
     2. sur le moteur EXTRAIT DU MODULE LIVRÉ — la même suite, les mêmes cas, le même juge : c'est ce que le client exécute ;
   et il garde que les deux sont le MÊME texte (au fichier d'export Node près) : un moteur retouché dans le module seul serait un tri que le serveur ne ferait pas.
   ⛔ LA POPULATION AVANT LE ZÉRO : « aucun légitime classé indésirable » n'a de sens que si les cas légitimes existent — chaque jeu est compté (39, 60, 60, 72), chaque
   catégorie aussi, et les dénominateurs sont lus dans la sortie des bancs (un jeu amputé ne passerait pas pour « 100 % »).
   Sans dépendance. Aucun appel réseau. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const { spawnSync } = require('child_process');
let ok = 0, ko = 0;
/* ⛔ un banc qui MEURT n'est pas un banc vert : une exception (une tranche introuvable, un fichier absent) s'imprime comme un échec, avec son total */
process.on('uncaughtException', (e) => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const RACINE = path.join(__dirname, '..');
const REF = path.join(__dirname, 'courrier-moteur-tri');
const PAGE = fs.readFileSync(path.join(RACINE, 'opcourrier.js'), 'utf8');
const FICHIERS = ['classify.js', 'test_classify.js', 'run_blind.js', 'run_blind2.js', 'run_blind3.js', 'blind_cases.js', 'blind2_cases.js', 'blind3_cases.js'];
/* ce que chaque banc doit rendre : son total ET son dénominateur */
const BANCS = [['test_classify.js', /(\d+)\/(\d+) correctement classés/, 39], ['run_blind.js', /TOTAL (\d+)\/(\d+)/, 60], ['run_blind2.js', /TOTAL (\d+)\/(\d+)/, 60], ['run_blind3.js', /TOTAL (\d+)\/(\d+)/, 72]];

/* ── le moteur, tel que le module l'embarque : du `var OPClassify = (function () {` au `})();` qui le ferme ── */
const iDebut = PAGE.indexOf('var OPClassify = (function () {');
const iFin = PAGE.indexOf('\n})();', iDebut);
vrai('le moteur est trouvé dans le module (début et fin)', iDebut > 0 && iFin > iDebut);
const EMBARQUE = PAGE.slice(iDebut, iFin + '\n})();'.length);
vrai('population : le moteur embarqué fait plus de 20 000 signes (' + EMBARQUE.length + ') — une tranche vide ne passe pas', EMBARQUE.length > 20000);
const REFERENCE = fs.readFileSync(path.join(REF, 'classify.js'), 'utf8');

/* ── 1. la référence et le module sont le MÊME texte ── */
console.log('1. Le module embarque la référence, au fichier d\'export près');
const sansExport = REFERENCE.replace(/\nif \(typeof module !== "undefined"\) module\.exports = OPClassify;\s*$/, '');
vrai('la référence se termine par SA ligne d\'export Node (et rien d\'autre ne la distingue)', sansExport !== REFERENCE);
const iRef = sansExport.indexOf('var OPClassify = (function () {');
v('le moteur embarqué est EXACTEMENT celui de la référence (' + EMBARQUE.length + ' signes)', EMBARQUE, sansExport.slice(iRef));
vrai('le module ne porte pas la ligne d\'export Node (il n\'a pas de `module`)', !/module\.exports/.test(PAGE));

/* ── 2. le moteur est pur : ni réseau, ni DOM, ni stockage ── */
console.log('\n2. Des fonctions pures');
const code = EMBARQUE.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
/* des FORMES de code, pas des mots : « document » est aussi un mot que le moteur cherche dans les courriels (« documents joints ») */
const INTERDITS = [[/\bfetch\s*\(/, 'fetch('], [/\bXMLHttpRequest\b/, 'XMLHttpRequest'], [/\bdocument\s*[.[]/, 'document.'], [/\bwindow\s*[.[]/, 'window.'], [/\b(?:local|session)Storage\b/, 'stockage'],
  [/\brequire\s*\(/, 'require('], [/\bimport\s*\(/, 'import('], [/\beval\s*\(/, 'eval('], [/\bnew\s+Function\b/, 'new Function'], [/\bnavigator\b/, 'navigator'], [/\blocation\s*[.[]/, 'location.']];
v('aucun accès au réseau, au document, au stockage, à la page ni à un module dans le moteur', INTERDITS.filter(([re]) => re.test(code)).map(x => x[1]), []);
vrai('(population) le test des formes sait voir : un `fetch(` ajouté serait trouvé', INTERDITS.some(([re]) => re.test(code + '\nfetch(x)')));

/* ── 3. les quatre bancs, deux fois ── */
function jouer(dossier, etiquette) {
  for (const [nom, motif, attendu] of BANCS) {
    const r = spawnSync(process.execPath, [path.join(dossier, nom)], { cwd: dossier, encoding: 'utf8', timeout: 60000 });
    const sortie = (r.stdout || '') + (r.stderr || '');
    const m = motif.exec(sortie);
    vrai(etiquette + ' : ' + nom + ' rend un total (la sortie a parlé : ' + (m ? m[0] : 'RIEN') + ')', !!m);
    if (!m) { console.log(sortie.split('\n').slice(0, 8).join('\n')); continue; }
    v(etiquette + ' : ' + nom + ' — ' + m[1] + '/' + m[2] + ', tous justes, sur ' + attendu + ' cas (dénominateur lu dans la sortie)', [+m[1], +m[2], r.status], [attendu, attendu, 0]);
  }
}
console.log('\n3. Les quatre bancs sur la référence (39 + 60 + 60 + 72 mails)');
jouer(REF, 'référence');

console.log('\n4. Les MÊMES bancs sur le moteur extrait du module livré');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-2700-'));
try {
  for (const f of FICHIERS) fs.copyFileSync(path.join(REF, f), path.join(tmp, f));
  /* on remplace SA copie du moteur par celle de la PAGE, rien d'autre : le juge, les cas et les bancs sont ceux de la référence */
  fs.writeFileSync(path.join(tmp, 'classify.js'), EMBARQUE + '\nif (typeof module !== "undefined") module.exports = OPClassify;\n');
  vrai('(population) le moteur du module a bien remplacé celui du dossier de travail', fs.readFileSync(path.join(tmp, 'classify.js'), 'utf8') !== REFERENCE || EMBARQUE === sansExport.slice(iRef));
  jouer(tmp, 'module');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

/* ── 5. ce que « 100 % » veut dire : la population de chaque jeu, par catégorie, et aucun légitime en indésirable ── */
console.log('\n5. La population des jeux à l\'aveugle, et le seul risque qui compte : un mail légitime perdu en indésirable');
const moteur = (() => { const sb = { }; vm.createContext(sb); vm.runInContext(EMBARQUE + '\n;this.OPClassify = OPClassify;', sb); return sb.OPClassify; })();
const ctx = { contacts: {}, rules: { senders: {}, domains: {} } };
const JEUX = [['blind_cases.js', 60], ['blind2_cases.js', 60], ['blind3_cases.js', 72]];
let legitimesEnIndesirable = [], legitimes = 0;
for (const [f, n] of JEUX) {
  const cas = require(path.join(REF, f));
  v(f + ' : ' + n + ' mails', cas.length, n);
  const par = {}; for (const k of cas) par[k.expect] = (par[k.expect] || 0) + 1;
  vrai(f + ' : les six catégories sont représentées, chacune par au moins dix mails (' + JSON.stringify(par) + ')', ['principal', 'notif', 'recus', 'voyages', 'promos', 'junk'].every(c => par[c] >= 10));
  for (const k of cas) {
    const r = moteur.classify(k.m, ctx);
    if (k.expect !== 'junk') { legitimes++; if (r.junk) legitimesEnIndesirable.push(f + ' : ' + k.m.from.email + ' « ' + k.m.subject + ' »'); }
  }
}
vrai('(population) ' + legitimes + ' mails légitimes joués par le moteur du module', legitimes >= 150);
v('⛔ AUCUN mail légitime classé indésirable (sur ' + legitimes + ')', legitimesEnIndesirable, []);
/* un contact connu n'est jamais mis en indésirable, même au score le plus haut ; et la règle « pas indésirable » de la personne est respectée */
const pourriel = { from: { name: 'Gagnez', email: 'promo@gagnez-gros.xyz' }, subject: 'FÉLICITATIONS !!! Vous avez gagné 1 000 000 € — cliquez ICI', body: ['Cliquez vite pour récupérer votre cadeau gratuit !!!'], unsub: true };
vrai('un pourriel évident est bien classé indésirable (la garde a quelque chose à garder)', moteur.classify(pourriel, ctx).junk === true);
vrai('…mais jamais s\'il vient d\'un contact connu', moteur.classify(pourriel, { contacts: { 'promo@gagnez-gros.xyz': true }, rules: { senders: {}, domains: {} } }).junk === false);
vrai('…ni quand la personne a dit « pas indésirable » pour cet expéditeur', moteur.classify(pourriel, { contacts: {}, rules: { senders: { 'promo@gagnez-gros.xyz': 'notjunk' }, domains: {} } }).junk === false);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
