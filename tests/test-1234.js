/* ══ g20 · LA PASTILLE D'UNE CONVERSATION COMPTE LES NON LUS (achats#13) ═════════════════════════════════
   Constat (agents de test de la bêta, 16 octobre 2026) : Messagerie. L'administrateur écrit 3 messages dans
   Général et 1 en privé au technicien ; le technicien ouvre Messagerie puis Général. Les onglets restaient
   « Général 3 », « Justine Admin 1 » PENDANT la lecture : `msgCount` comptait tous les messages du fil (les
   siens compris), sans aucune idée de lecture. Une pastille de nombre sur un onglet de conversation dit
   « ce que tu n'as pas lu » — et elle doit disparaître quand on lit.

   Ce banc EXÉCUTE la vraie `views.messagerie` (le vrai balisage des onglets) avec les vraies `msgInThread`,
   `msgNonLus`, `msgLuMarquer`, et lit les pastilles dans le HTML produit. Il exige aussi que ouvrir l'écran
   n'écrive RIEN dans `db` (la marque est celle d'un appareil et d'un compte : localStorage), qu'un
   rangement refusé ne casse rien, et que deux comptes d'un même appareil aient chacun leurs marques.
   `APP_HTML=<fichier>` rejoue le banc contre une autre version (preuve « avant »).                        */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_HTML || path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return ''; }
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const MATCH = bloc('function msgMatch(m){'), THREAD = bloc('function msgInThread(m,k){'), THREADS = bloc('function msgThreads(){'),
  LUCLE = bloc('function msgLuCle(){'), LULIRE = bloc('function msgLuLire(){'), LUMARQ = bloc('function msgLuMarquer(k){'), NONLU = bloc('function msgNonLus(k){'),
  COUNT = bloc('function msgCount(k){'), VIEW = (() => { const i = SRC.indexOf('views.messagerie=function(){'); if (i < 0) return '';
    let j = SRC.indexOf('{', i), p = 0; for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return SRC.slice(i, k + 1) + ';'; } } return ''; })();

console.log('\n── 1234 · 0. la population ──');
v('la vue et la règle de fil sont trouvées', [VIEW.length > 1500, !!THREAD, !!MATCH, !!THREADS], [true, true, true, true]);
v('⛔ une seule définition de msgInThread (une seconde gagnerait partout, en silence)', SRC.split('function msgInThread(').length - 1, 1);

function monde(moi, opts) {
  opts = opts || {};
  const stock = opts.stock || {};
  const ctx = { console, JSON, Math, Date, Set, Object, Array, String, Number, __html: '', __saves: 0, __stock: stock, __throw: !!opts.rangementRefuse,
    db: { messages: [], groupes: [], users: [{ id: 'uA', prenom: 'Justine', nom: 'Admin', role: 'admin', actif: true }, { id: 'uT', prenom: 'Karim', nom: 'Tech', role: 'technicien', actif: true }, { id: 'uD', prenom: 'Denis', nom: 'Responsable', role: 'dr', actif: true }] },
    currentUser: null, localStorage: null };
  ctx.localStorage = { getItem: k => { if (ctx.__throw) throw new Error('refusé'); return k in stock ? stock[k] : null; }, setItem: (k, x) => { if (ctx.__throw) throw new Error('plein'); stock[k] = String(x); } };
  vm.createContext(ctx);
  vm.runInContext(`var views={}, msgSel='general', msgPhoto='';
    function can(){ return false; } function inGroup(){ return true; } function groupUsers(){ return []; } function fullName(u){ return u.prenom+' '+u.nom; }
    function roleIcon(){ return '👤'; } function setHeader(){} function esc(s){ return String(s==null?'':s); } function grpAvatar(){ return ''; }
    function emptyState(){ return '(vide)'; } function fmtTs(){ return ''; } function formatMsg(t){ return t; } function save(){ __saves++; }
    var $=function(i){ return i==='content' ? { set innerHTML(h){ __html=h; }, get innerHTML(){ return __html; } } : null; };
    ${COUNT}\n${THREAD}\n${MATCH}\n${THREADS}\n${LUCLE}\nvar _msgLuMem={};\n${LULIRE}\n${LUMARQ}\n${NONLU}\n${VIEW}`, ctx);
  ctx.moi = id => { ctx.currentUser = ctx.db.users.find(u => u.id === id); };
  ctx.moi(moi);
  ctx.ouvrir = k => { vm.runInContext(`msgSel=${JSON.stringify(k)}`, ctx); ctx.views.messagerie(); return pastilles(ctx.__html); };
  return ctx; }
function pastilles(html) {
  const out = {}, re = /onclick="msgSel='([^']+)';views\.messagerie\(\)">([\s\S]*?)<\/div>/g; let m;
  while ((m = re.exec(html))) { const t = /<span class="tag"[^>]*>(\d+)<\/span>/.exec(m[2]); out[m[1]] = t ? +t[1] : 0; }
  return out; }
const msgs = () => [
  { id: 'm1', ts: 1000, fromId: 'uA', fromNom: 'Justine Admin', texte: 'Bonjour à tous' }, { id: 'm2', ts: 2000, fromId: 'uA', fromNom: 'Justine Admin', texte: 'Point du matin' },
  { id: 'm3', ts: 3000, fromId: 'uA', fromNom: 'Justine Admin', texte: 'N’oubliez pas les EPI' },
  { id: 'm4', ts: 4000, fromId: 'uA', fromNom: 'Justine Admin', texte: 'Karim, tu peux passer me voir ?', toUserId: 'uT' },
  { id: 'm5', ts: 5000, fromId: 'uT', fromNom: 'Karim Tech', texte: 'Ma propre réponse générale' }];

console.log('\n── 1234 · 1. achats#13 — le scénario des agents : le technicien ouvre Messagerie ──');
{ const W = monde('uT'); W.db.messages = msgs();
  const p0 = W.ouvrir('general');
  v('population : trois onglets de conversation sont lus dans le HTML (Général, 3 collègues dont lui exclu)', Object.keys(p0).sort(), ['general', 'user:uA', 'user:uD']);
  v('⛔ Général, qu’on est en train de LIRE, n’a plus de pastille (avant : « Général 4 », tous les messages)', p0.general, 0);
  v('⛔ le message privé de Justine : 1 non lu (et ses propres messages ne comptent pas)', p0['user:uA'], 1);
  v('Denis, qui n’a rien écrit : aucune pastille', p0['user:uD'], 0);
  const p1 = W.ouvrir('user:uA');
  v('⛔ on ouvre la conversation avec Justine : sa pastille disparaît', p1['user:uA'], 0);
  v('Général reste lu', p1.general, 0);
  W.db.messages.push({ id: 'm6', ts: 6000, fromId: 'uA', fromNom: 'Justine Admin', texte: 'Nouveau dans Général' });
  const p2 = W.ouvrir('user:uA');
  v('⛔ un nouveau message dans Général pendant qu’on lit ailleurs : pastille 1', p2.general, 1);
  v('on y retourne : elle disparaît', W.ouvrir('general').general, 0); }

{ const W = monde('uT'); W.db.messages = msgs(); const p = W.ouvrir('user:uD');
  v('⛔ Général jamais lu : 3 non lus — son PROPRE message (m5) ne compte pas, ni avant ni après', [p.general, p['user:uA']], [3, 1]); }
console.log('\n── 1. suite — les marques sont celles d’un appareil et d’un compte ──');
{ const W = monde('uT'); W.db.messages = msgs(); W.ouvrir('general'); W.ouvrir('user:uD');
  v('⛔ la marque est rangée sur l’appareil, au nom du COMPTE (elan_msg_lu:uT), pas dans db', Object.keys(W.__stock), ['elan_msg_lu:uT']);
  v('une marque par conversation lue : la date de son dernier message', JSON.parse(W.__stock['elan_msg_lu:uT'] || 'null'), { general: 5000 });
  const avant = JSON.stringify(W.db);
  W.ouvrir('general'); W.ouvrir('user:uA'); W.ouvrir('general');
  v('⛔ ouvrir l’écran n’écrit RIEN dans les données de l’entreprise (ni save(), ni champ ajouté)', [JSON.stringify(W.db) === avant, W.__saves], [true, 0]);
  W.moi('uD'); const pd = W.ouvrir('user:uA');
  v('un autre compte du même appareil a ses propres marques : pour Denis, Général est encore plein de non lus', W.ouvrir('user:uA').general, 4);
  vrai('… et il n’a lu aucune de celles de Karim', pd.general === 4, pd); }

console.log('\n── 1. suite — un rangement refusé ne casse rien ──');
{ const W = monde('uT', { rangementRefuse: true }); W.db.messages = msgs();
  let err = null, p0, p1; try { p0 = W.ouvrir('general'); p1 = W.ouvrir('user:uA'); } catch (e) { err = e.message; }
  vrai('aucune exception quand localStorage refuse', err === null, err);
  v('la marque tient en mémoire le temps de la séance : Général lu reste lu', p1 && p1.general, 0); }

console.log('\n── 1. suite — l’ancien compteur n’existe plus ──');
vrai('plus aucune définition de msgCount (le nombre TOTAL de messages d’un fil n’est lu nulle part)', SRC.indexOf('function msgCount(') < 0);

console.log('\n══ test-1234 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
