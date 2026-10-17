/* ══ g16 · accueil#4 — L'HISTORIQUE NOMME SON AUTEUR PAR PRÉNOM ET NOM, PAS PAR LE NOM DE FAMILLE SEUL ═══
   Constaté au navigateur : deux comptes « Karim Benali » et « Sarah Benali » qui signalent un problème
   donnaient deux lignes « 👤 Benali » indiscernables, et la connexion de « Justine Admin » s'affichait
   « 👤 Admin ». `logEvent` rangeait `currentUser.nom` (le nom de famille). Le dépôt exige pourtant
   prénom + nom (`compteHomonyme`) précisément pour que deux personnes se distinguent.

   Deux gestes, et seulement ceux-là :
   · les lignes ÉCRITES désormais portent le nom complet (`fullName`) ;
   · les lignes DÉJÀ écrites ne se réécrivent pas (le journal est plafonné à 500, on ne l'alourdit pas, et
     « Ouvrir un écran n'écrit pas ») : l'AFFICHAGE retrouve le compte par `userId` — l'auteur, jamais
     `cibleUserId` qui est la personne CONCERNÉE — et rend son nom complet. Compte disparu, ou ligne d'un
     autre genre d'auteur (« Système », un identifiant de technicien du semis) : on garde ce qui est écrit.

   Ce banc EXÉCUTE les vraies `logEvent`, `journalAuteur` et `journalView` extraites d'app.html. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1150 · 0. la population ──');
const LOG = bloc('function logEvent('), AUT = bloc('function journalAuteur('), JV = bloc('function journalView('),
  FN = ligne('const fullName = u =>'), ESC = ligne('const esc = s =>'), TI = ligne('const TYPE_ICO='), TL = ligne('const TYPE_LBL=');
v('les fonctions sont trouvées', [LOG.length > 100, AUT.length > 30, JV.length > 500, !!FN, !!ESC, !!TI], [true, true, true, true, true, true]);
v('une seule définition de chacune (une seconde gagnerait partout, en silence)',
  ['function logEvent(', 'function journalAuteur(', 'function journalView('].map(n => SRC.split(n).length - 1), [1, 1, 1]);

function monde(users, moi, journal) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, __page: {}, __uid: 0,
    db: { users, journal: journal || [] }, currentUser: moi, current: 'historique' };
  vm.createContext(ctx);
  vm.runInContext(`${ESC}\n${TI.replace('const ', 'var ')}\n${TL.replace('const ', 'var ')}\n${FN.replace('const ', 'var ')}\n${LOG}\n${AUT}\n
    var histFilter='all', _histMax=80, _histVue='', HIST_PAS=80;
    function uid(){ return 'e'+(++__uid); } function setHeader(){} function t(s){ return s; }
    function visibleJournal(l){ return l; } function fmtTs(ts){ return String(ts); } function fmtTsEcran(ts){ return String(ts); } function nbT(n,u,p){ return n+' '+(n>1?p:u); } /* g16 : journalView compose par nbT et date par fmtTsEcran (test-1154 les joue pour de vrai) */ function emptyState(){ return '<div class="vide"></div>'; }
    function $(id){ return id==='content' ? { set innerHTML(h){ __page.html=h; } } : {}; }
    ${JV}`, ctx);
  return ctx;
}
const compte = (id, prenom, nom, extra) => Object.assign({ id, prenom, nom, login: (prenom || 'x').toLowerCase(), role: 'technicien', actif: true }, extra || {});
const karim = compte('u-k', 'Karim', 'Benali'), sarah = compte('u-s', 'Sarah', 'Benali'), justine = compte('u-j', 'Justine', 'Admin', { role: 'admin' });

console.log('\n── 1. les lignes ÉCRITES portent le nom complet ──');
{
  const m = monde([karim, sarah, justine], karim);
  m.logEvent('Problème signalé', 'Dépôt de test', 'support');
  m.currentUser = sarah; m.logEvent('Problème signalé', 'Dépôt de test', 'support');
  m.currentUser = justine; m.logEvent('Connexion', 'x', 'auth');
  v('Karim Benali est écrit « Karim Benali », pas « Benali »', m.db.journal[2].userNom, 'Karim Benali');
  v('Sarah Benali est écrite « Sarah Benali » : les deux homonymes se distinguent', m.db.journal[1].userNom, 'Sarah Benali');
  v('Justine Admin est écrite « Justine Admin », pas « Admin »', m.db.journal[0].userNom, 'Justine Admin');
  m.currentUser = compte('u-n', '', 'Seul'); m.logEvent('a', 'b');
  v('un compte sans prénom reste écrit par son nom', m.db.journal[0].userNom, 'Seul');
  m.currentUser = null; m.logEvent('a', 'b');
  v('sans personne connectée : « Système » (inchangé)', m.db.journal[0].userNom, 'Système');
  v('l\'identifiant de l\'auteur est toujours écrit', m.db.journal[1].userId, 'u-n');
}

console.log('\n── 2. les lignes DÉJÀ écrites s\'affichent complétées, sans être réécrites ──');
{
  const ancien = [
    { id: 'j1', ts: 3, userId: 'u-k', userNom: 'Benali', action: 'Problème signalé', detail: 'x', type: 'support' },
    { id: 'j2', ts: 2, userId: 'u-s', userNom: 'Benali', action: 'Problème signalé', detail: 'x', type: 'support' },
    { id: 'j3', ts: 1, userId: 'u-j', userNom: 'Admin', action: 'Connexion', detail: 'y', type: 'auth' },
  ];
  const copie = JSON.stringify(ancien);
  const m = monde([karim, sarah, justine], justine, ancien);
  m.journalView('Historique', '');
  const h = m.__page.html;
  vrai('la population est là : trois lignes dessinées', (h.match(/class="tl-item"/g) || []).length === 3, (h.match(/class="tl-item"/g) || []).length);
  vrai('« 👤 Karim Benali » paraît', h.includes('👤 Karim Benali'));
  vrai('« 👤 Sarah Benali » paraît', h.includes('👤 Sarah Benali'));
  vrai('« 👤 Justine Admin » paraît', h.includes('👤 Justine Admin'));
  vrai('plus aucune ligne ne dit « 👤 Benali » ni « 👤 Admin » tout court', !/👤 (Benali|Admin)</.test(h));
  v('⛔ afficher n\'écrit rien : le journal est identique octet pour octet', JSON.stringify(m.db.journal), copie);
}

console.log('\n── 3. ce qu\'on ne sait pas retrouver garde ce qui est écrit ──');
{
  const j = [
    { id: 'a', ts: 5, userId: 'u-disparu', userNom: 'Ancien Collègue', action: 'x', detail: 'd', type: 'crud' },
    { id: 'b', ts: 4, userId: 't1', userNom: 'Marc Dubois', action: 'x', detail: 'd', type: 'stock' },
    { id: 'c', ts: 3, userId: undefined, userNom: 'Système', action: 'x', detail: 'd', type: 'sync' },
    { id: 'd', ts: 2, userId: 'u-k', cibleUserId: 'u-s', userNom: 'Benali', action: 'x', detail: 'd', type: 'stock' },
    { id: 'e', ts: 1, userId: 'u-x', userNom: '<b>Piège</b>', action: 'x', detail: 'd', type: 'crud' },
  ];
  const m = monde([karim, sarah, justine], justine, j);
  m.journalView('Historique', '');
  const h = m.__page.html;
  vrai('compte supprimé : le nom écrit reste', h.includes('👤 Ancien Collègue'));
  vrai('identifiant de technicien du semis (pas un compte) : le nom écrit reste', h.includes('👤 Marc Dubois'));
  vrai('évènement du système : « Système »', h.includes('👤 Système'));
  vrai('⛔ l\'auteur est userId, jamais cibleUserId (la personne concernée) : « Karim Benali », pas « Sarah Benali »',
    /👤 Karim Benali</.test(h) && !/👤 Sarah Benali</.test(h));
  vrai('un nom écrit reste échappé', h.includes('&lt;b&gt;Piège&lt;/b&gt;') && !h.includes('<b>Piège</b>'));
}

console.log('\n── 4. ce que le code écrit ──');
vrai('logEvent n\'écrit plus `currentUser.nom` seul comme auteur', !/userNom:\s*currentUser\?currentUser\.nom/.test(LOG));
vrai('journalView passe par journalAuteur', /journalAuteur\(j\)/.test(JV));

console.log('\n══ test-1150 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
