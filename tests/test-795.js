/* ══ v742 · DEUX COMPTES NE PORTENT JAMAIS LE MÊME PRÉNOM ET LE MÊME NOM ════════════════════════════
   Justin, 24 septembre 2026 : « si deux comptes ont le même nom, l'obligation est d'avoir le prénom et le
   nom de famille pour différencier les deux personnes ».

   Pourquoi c'est une règle et pas une politesse : le nom complet sert de CLÉ à plusieurs endroits — qui a
   écrit une ligne du journal (`technicien`), à qui elle a été donnée (`donneA`), le « pour qui » d'un bon
   de remise, le périmètre d'un responsable (perimetreTechIds relie par le nom). La relecture de la v741
   l'a mesuré : deux « Karim Benali » se voient l'un l'autre. Prénom + nom obligatoires existaient depuis
   le 10 septembre ; il manquait qu'ils DISTINGUENT.

   Ce banc EXÉCUTE la vraie `saveUser` (création et modification) dans un bac à sable, avec les vraies
   `compteHomonyme`, `homonymeMessage`, `nomNorm` et `fullName`. La fiche d'un technicien, qui crée aussi
   un compte, est jouée par test-786. Le geste au doigt : scratchpad/sonde-v742.js.                    */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 795 · 0. la population ──');
const HOM = bloc('function compteHomonyme(prenom,nom,sauf){'), MSG = bloc('function homonymeMessage(h,prenom,nom){'), NN = bloc('function nomNorm(s){'),
  FN = ligne('const fullName = u =>'), SU = bloc('async function saveUser(e,id){');
v('les fonctions sont trouvées', [!!HOM, !!MSG, !!NN, !!FN, SU.length > 3000], [true, true, true, true, true]);
v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)',
  ['function compteHomonyme(', 'function homonymeMessage(', 'function nomNorm('].map(n => SRC.split(n).length - 1), [1, 1, 1]);

/* ── Le bac à sable : la vraie saveUser, et des doubles pour le réseau, l'écran et ce qui n'est pas en jeu. ── */
function monde(users, moi) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise,
    db: { users, techniciens: [], boxes: [], vehicules: [] }, currentUser: moi, __toasts: [], __serveur: 0, __saves: 0,
    localStorage: { getItem: () => null, setItem: () => {} } };
  vm.createContext(ctx);
  vm.runInContext(`${NN}\n${FN.replace('const ', 'var ')}\n${HOM}\n${MSG}
    var ROLE_PROTEGE='admin', drRattaches=new Set(), nuBoxes=new Set(), nuVehs=new Set(), nuStk=false, views={utilisateurs(){}};
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function closeModal(){} function logEvent(){}
    function can(){ return false; } function planPlaceLibre(){ return true; } function proposerAbonnement(){ __toasts.push('abonnement'); }
    async function loginExisteAilleurs(){ __serveur++; return false; }
    function roleEstTech(r){ return r==='technicien'; } function roleLbl(r){ return r; } function profilDroits(){ return null; }
    function droitsBorner(){ return []; } function stockageBox(){ return null; } function estStockage(){ return false; }
    function visibleBoxes(l){ return l||[]; } function visibleVehicules(l){ return l||[]; } function userBoxVoit(){} function userVehiculeVoit(){}
    function entrepriseNom(){ return 'Sonde SARL'; } async function sha256(){ return 'h'; } function userIdentifiantsModal(){}
    function setTimeout(f){ }
    var __id=0; function uid(){ return 'n'+(++__id); }
    function FormData(t){ return Object.entries(t); }
    ${SU}`, ctx);
  return ctx;
}
const admin = { id: 'uA', prenom: 'Justin', nom: 'Roux', login: 'jroux', role: 'admin', actif: true };
const base = () => [JSON.parse(JSON.stringify(admin)),
  { id: 'uK', prenom: 'Karim', nom: 'Benali', login: 'kbenali', role: 'technicien', actif: true },
  { id: 'uS', prenom: 'Sofia', nom: 'Perez', login: 'sperez', role: 'technicien', actif: true },
  { id: 'uO', prenom: 'Omar', nom: 'Diallo', login: 'odiallo', role: 'technicien', actif: false },
  { id: 'uJ1', prenom: 'Jean', nom: 'Dupont', login: 'jdupont', role: 'technicien', actif: true },
  { id: 'uJ2', prenom: 'Jean', nom: 'Dupont', login: 'jdupont2', role: 'technicien', actif: true }];
const creer = async (champs, users) => { const W = monde(users || base(), admin); const n0 = W.db.users.length;
  await W.saveUser({ preventDefault() {}, target: Object.assign({ role: 'technicien', login: 'nouveau', email: '', pwd: 'provisoire1' }, champs) }, '');
  return { cree: W.db.users.length - n0, toasts: W.__toasts, serveur: W.__serveur, W }; };
const modifier = async (id, champs) => { const W = monde(base(), admin); const u = W.db.users.find(x => x.id === id);
  await W.saveUser({ preventDefault() {}, target: Object.assign({ prenom: u.prenom, nom: u.nom, login: u.login, role: u.role, email: u.email || '', actif: 'true' }, champs) }, id);
  return { u: W.db.users.find(x => x.id === id), toasts: W.__toasts, saves: W.__saves }; };

(async () => {
  console.log('\n── 795 · 1. compteHomonyme : on compare comme on lit, en plus strict ──');
  { const W = monde(base(), admin);
    v('⛔ le même prénom + nom, casse, accents et espaces confondus', ['Karim|Benali', 'karim|BENALI', 'Kârim |  Bénali', ' KARIM|benali '].map(x => { const [p, n] = x.split('|'); const h = W.compteHomonyme(p, n, ''); return h && h.id; }), ['uK', 'uK', 'uK', 'uK']);
    v('⛔ un compte DÉSACTIVÉ compte aussi (un ancien salarié homonyme verrait l’historique du nouveau)', (W.compteHomonyme('Omar', 'Diallo', '') || {}).id, 'uO');
    v('on ne se compare pas à soi-même (modifier son téléphone)', W.compteHomonyme('Karim', 'Benali', 'uK'), null);
    v('contre-épreuve : un nom distinct, ou vide, ne trouve personne', [W.compteHomonyme('Karim A.', 'Benali', ''), W.compteHomonyme('', '', ''), W.compteHomonyme('Karim', 'Benalia', '')], [null, null, null]);
    const m1 = W.homonymeMessage(W.db.users.find(u => u.id === 'uK'), 'Karim', 'Benali'), m2 = W.homonymeMessage(W.db.users.find(u => u.id === 'uO'), 'Omar', 'Diallo');
    vrai('le message dit QUI (le nom, l’identifiant) et COMMENT distinguer (une initiale, un second prénom, un exemple)', /« Karim Benali » est déjà le nom d’un autre compte \(@kbenali\)/.test(m1) && /initiale ou un second prénom/.test(m1) && /« Karim A\. Benali »/.test(m1), m1);
    vrai('… et pour un compte désactivé, il propose de le RÉACTIVER s’il s’agit de la même personne', /d’un compte désactivé \(@odiallo\)/.test(m2) && /réactive ce compte/.test(m2), m2); }

  console.log('\n── 795 · 2. ⛔⛔ la vraie saveUser — CRÉER un compte ──');
  { const r = await creer({ prenom: 'Karim', nom: 'Benali' });
    v('⛔⛔ « Karim Benali » existe déjà : aucun compte créé', r.cree, 0);
    vrai('… on dit pourquoi, et comment distinguer', r.toasts.some(t => /est déjà le nom d’un autre compte \(@kbenali\)/.test(t)), r.toasts);
    v('⛔ … et on le dit AVANT d’interroger le serveur (le refus est local, il ne coûte pas un aller-retour)', r.serveur, 0);
    const r2 = await creer({ prenom: 'kârim', nom: '  BENALI' });
    v('⛔ casse, accents, espaces : même refus', r2.cree, 0);
    const r3 = await creer({ prenom: 'Omar', nom: 'Diallo' });
    vrai('⛔ le nom d’un compte désactivé : refusé, avec « réactive ce compte »', r3.cree === 0 && r3.toasts.some(t => /désactivé/.test(t) && /réactive ce compte/.test(t)), r3.toasts);
    const r4 = await creer({ prenom: 'Karim A.', nom: 'Benali' });
    v('contre-épreuve : « Karim A. Benali » est créé (une initiale suffit à distinguer)', [r4.cree, r4.serveur], [1, 1]);
    const r5 = await creer({ prenom: 'Nadia', nom: 'Kacem' });
    v('contre-épreuve : un nom neuf est créé', r5.cree, 1);
    const r6 = await creer({ prenom: 'Karim', nom: '' });
    vrai('la règle du 10 septembre tient toujours : sans nom, refusé', r6.cree === 0 && r6.toasts.some(t => /prénom et le nom sont obligatoires/.test(t)), r6.toasts); }

  console.log('\n── 795 · 3. ⛔⛔ la vraie saveUser — MODIFIER un compte ──');
  { const r = await modifier('uS', { prenom: 'Karim', nom: 'Benali' });
    v('⛔⛔ renommer Sofia en « Karim Benali » : refusé, son nom ne bouge pas', [r.u.prenom, r.u.nom, r.saves], ['Sofia', 'Perez', 0]);
    vrai('… et on le dit', r.toasts.some(t => /est déjà le nom d’un autre compte/.test(t)), r.toasts);
    const r2 = await modifier('uJ1', { email: 'jean@exemple.fr' });
    v('⛔ un doublon d’AVANT la règle : corriger son e-mail sans toucher au nom reste possible (la liste le signale)', [r2.u.email, r2.saves], ['jean@exemple.fr', 1]);
    const r3 = await modifier('uJ1', { prenom: 'Jean-Marc', nom: 'Dupont' });
    v('… et le renommer pour le distinguer, aussi', [r3.u.prenom, r3.saves], ['Jean-Marc', 1]);
    const r4 = await modifier('uK', { prenom: 'karim', nom: 'benali' });
    v('contre-épreuve : changer la casse de SON propre nom n’est pas un doublon', [r4.u.prenom, r4.saves], ['karim', 1]); }

  console.log('\n── 795 · 4. les autres portes, et ce que l’écran montre ──');
  { const CA = bloc('async function submitCreateAdmin(e){');
    const iNom = CA.indexOf("if(!prenom||!nom){ show('Le prénom et le nom sont obligatoires.'); return; }"), iPush = CA.indexOf('db.users.push(admin)');
    vrai('⛔ le premier administrateur : prénom et nom vérifiés (des espaces passent « required ») AVANT de créer le compte', iNom > 0 && iPush > iNom, [iNom, iPush]);
    const iHa = CA.indexOf("h=compteHomonyme(prenom,nom,a0?a0.id:'');"), iMsg = CA.indexOf('if(h){ show(homonymeMessage(h,prenom,nom)); return; }');
    vrai('⛔ … et jamais le nom d’un autre compte (le compte d’administrateur qu’on remplit est écarté), vérifié AVANT de le créer',
      iHa > iNom && iMsg > iHa && iPush > iMsg && /const a0=db\.users\.find\(u=>u\.role==='admin'\)/.test(CA), [iHa, iMsg, iPush]);
    const ST = bloc('async function saveTech(e,id){');
    const iH = ST.indexOf('const h=compteHomonyme(ps[0],ps.slice(1).join(\' \'),\'\');'), iT = ST.indexOf('db.techniciens.push({id:tid,...obj});');
    vrai('⛔ la fiche technicien (qui crée un compte) vérifie AVANT de créer (joué par test-786)', iH > 0 && iT > iH, [iH, iT]);
    const VU = bloc('views.utilisateurs=function(){');
    vrai('la liste des utilisateurs SIGNALE un doublon d’avant la règle (à l’administrateur)', /\(admin&&compteHomonyme\(u\.prenom,u\.nom,u\.id\)\)\?'<span class="st st-org"/.test(VU) && /même nom qu’un autre compte/.test(VU), VU.length);
    const P2 = path.join(__dirname, '..', 'scratchpad', 'sonde-v742.js');
    const SONDE = fs.existsSync(P2) ? fs.readFileSync(P2, 'utf8') : '';
    vrai('la mesure dans une vraie page existe (scratchpad/sonde-v742.js), sur la BÊTA', !!SONDE && /saveUser|formUser/.test(SONDE) && !/app\.html/.test(SONDE)); }

  console.log(`\n════ test-795 : ${ok} ✓ ${ko} ✗ ════\n`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log(`\n════ test-795 : ${ok} ✓ ${ko + 1} ✗ ════\n`); process.exit(1); });
