/* ══ 1300 · UTILISATEURS : LE DERNIER ADMINISTRATEUR NE SE COUPE PAS (admin#0), LES NOMS SE ROGNENT (admin#7) ══
   Rapport du testeur, 16 octobre 2026 :
   · admin#0 — l'administrateur UNIQUE ouvrait sa fiche, passait « Statut = Désactivé » (ou « Rôle = Technicien »)
     et enregistrait : « Mis à jour », et l'entreprise n'avait plus aucun administrateur actif — plus personne
     pour régler les droits ni réactiver le compte. `delUser` garde « Impossible de supprimer votre compte » ;
     `saveUser` écrivait `role` et `actif` sans rien contrôler. Le refus vit dans `saveUser` (à la SOURCE), pas
     seulement dans le formulaire : un second chemin suffirait sinon.
   · admin#7 — « ␣␣Paul␣ » / « ␣Durand␣␣ » s'enregistraient bruts ; la fiche technicien devenait « Paul   Durand »
     et la recherche « paul durand » ne la trouvait pas (l'écran masque les espaces, rien ne se voit).

   Ce banc EXÉCUTE la vraie `saveUser` (comme test-795) et la vraie `renderSearch`.                           */
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

console.log('\n── 1300 · 0. la population ──');
const HOM = bloc('function compteHomonyme(prenom,nom,sauf){'), MSG = bloc('function homonymeMessage(h,prenom,nom){'), NN = bloc('function nomNorm(s){'),
  FN = ligne('const fullName = u =>'), SU = bloc('async function saveUser(e,id){'), RS = bloc('function renderSearch(qq){'),
  NORM = ligne('const norm = s =>'), NET = bloc('function nomSaisieNet(s){');
v('les fonctions sont trouvées (saveUser, renderSearch, compteHomonyme, nomSaisieNet…)', [!!HOM, !!MSG, !!NN, !!FN, SU.length > 3000, RS.length > 800, !!NORM, !!NET], [true, true, true, true, true, true, true, true]);
vrai('⛔ une seule définition de saveUser, de renderSearch et de nomSaisieNet', SRC.split('async function saveUser(').length === 2 && SRC.split('function renderSearch(').length === 2 && SRC.split('function nomSaisieNet(').length === 2);

function monde(users, moi, techs) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, RegExp,
    db: { users, techniciens: techs || [], boxes: [], vehicules: [] }, currentUser: moi, __toasts: [], __saves: 0,
    localStorage: { getItem: () => null, setItem: () => {} } };
  vm.createContext(ctx);
  vm.runInContext(`${NN}\n${FN.replace('const ', 'var ')}\n${HOM}\n${MSG}\n${NET}
    var ROLE_PROTEGE='admin', drRattaches=new Set(), nuBoxes=new Set(), nuVehs=new Set(), nuStk=false, views={utilisateurs(){}};
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function closeModal(){} function logEvent(){} /* lot g01 : saveUser verrouille son bouton (btnOccupe) ; ici l'événement n'a pas de bouton, le double suffit — la vraie est jouée par test-1100 §5 */ function btnOccupe(){ return function(){}; }
    function can(){ return false; } function planPlaceLibre(){ return true; } function proposerAbonnement(){ __toasts.push('abonnement'); }
    async function loginExisteAilleurs(){ return false; }
    function roleEstTech(r){ return r==='technicien'; } function roleLbl(r){ return r; } function profilDroits(){ return null; }
    function droitsBorner(){ return []; } function stockageBox(){ return null; } function estStockage(){ return false; }
    function visibleBoxes(l){ return l||[]; } function visibleVehicules(l){ return l||[]; } function userBoxVoit(){} function userVehiculeVoit(){}
    function entrepriseNom(){ return 'Sonde SARL'; } async function sha256(){ return 'h'; } function userIdentifiantsModal(){}
    function userAvatarApply(){} function renderNav(){} function $(){ return null; }
    function setTimeout(f){ }
    var __id=0; function uid(){ return 'n'+(++__id); }
    function FormData(t){ return Object.entries(t); }
    ${SU}`, ctx);
  return ctx;
}
const admin = () => ({ id: 'uA', prenom: 'Justin', nom: 'Roux', login: 'jroux', role: 'admin', actif: true });
const tech = () => ({ id: 'uT', prenom: 'Sofia', nom: 'Perez', login: 'sperez', role: 'technicien', actif: true, techId: 'tS' });
const admin2 = (actif) => Object.assign(tech(), { id: 'uB', login: 'b', prenom: 'Bea', nom: 'Admin', role: 'admin', actif: actif !== false, techId: '' });
const modifierMoi = async (users, id, champs) => { const W = monde(users, users.find(u => u.id === 'uA'), [{ id: 'tS', nom: 'Sofia Perez' }]);
  const u = W.db.users.find(x => x.id === id);
  await W.saveUser({ preventDefault() {}, target: Object.assign({ prenom: u.prenom, nom: u.nom, login: u.login, role: u.role, email: '', actif: u.actif === false ? 'false' : 'true', techId: u.techId || '' }, champs) }, id);
  return { u: W.db.users.find(x => x.id === id), toasts: W.__toasts, saves: W.__saves, techs: W.db.techniciens, cur: W.currentUser }; };
const creer = async (champs) => { const W = monde([admin(), tech()], admin());
  await W.saveUser({ preventDefault() {}, target: Object.assign({ role: 'technicien', login: 'nouveau', email: '', pwd: 'provisoire1' }, champs) }, '');
  return { W, nu: W.db.users.find(x => x.login === 'nouveau'), toasts: W.__toasts }; };

(async () => {
  console.log('\n── 1300 · 1. ⛔⛔ admin#0 : le dernier administrateur actif ne se désactive ni ne se rétrograde ──');
  { const r = await modifierMoi([admin(), tech()], 'uA', { actif: 'false' });
    v('⛔⛔ l’administrateur UNIQUE se désactive : refusé, rien n’est écrit', [r.u.actif, r.saves], [true, 0]);
    vrai('… et on dit pourquoi (au moins un administrateur actif)', r.toasts.some(t => /administrateur/i.test(t) && /au moins un|dernier/i.test(t)), r.toasts);
    const r2 = await modifierMoi([admin(), tech()], 'uA', { role: 'technicien' });
    v('⛔⛔ … se rétrograde en technicien : refusé, rôle inchangé, aucune fiche technicien créée à son nom', [r2.u.role, r2.saves, r2.techs.length], ['admin', 0, 1]);
    vrai('… avec le même message', r2.toasts.some(t => /administrateur/i.test(t) && /au moins un|dernier/i.test(t)), r2.toasts);
    const r3 = await modifierMoi([admin(), admin2(false)], 'uA', { actif: 'false' });
    v('⛔ un autre administrateur DÉSACTIVÉ ne compte pas : le seul actif reste protégé', [r3.u.actif, r3.saves], [true, 0]);
    const r4 = await modifierMoi([admin(), admin2()], 'uA', { actif: 'false' });
    v('contre-épreuve : avec un SECOND administrateur actif, on peut se désactiver', [r4.u.actif, r4.saves], [false, 1]);
    const r5 = await modifierMoi([admin(), admin2()], 'uA', { role: 'technicien' });
    v('contre-épreuve : … ou se rétrograder', [r5.u.role, r5.saves], ['technicien', 1]);
    const r6 = await modifierMoi([admin(), tech()], 'uA', { email: 'justin@exemple.fr' });
    v('contre-épreuve : le seul administrateur corrige son e-mail sans toucher au rôle ni au statut', [r6.u.email, r6.u.role, r6.u.actif, r6.saves], ['justin@exemple.fr', 'admin', true, 1]);
    const r7 = await modifierMoi([admin(), tech()], 'uT', { actif: 'false' });
    v('contre-épreuve : désactiver un technicien reste possible', [r7.u.actif, r7.saves], [false, 1]);
    const r8 = await modifierMoi([admin(), tech()], 'uT', { role: 'admin' });
    v('contre-épreuve : promouvoir un technicien en administrateur reste possible', [r8.u.role, r8.saves], ['admin', 1]);
    const r9 = await modifierMoi([admin(), admin2(false)], 'uB', { actif: 'true' });
    v('contre-épreuve : RÉACTIVER un administrateur désactivé reste possible', [r9.u.actif, r9.saves], [true, 1]); }

  console.log('\n── 1300 · 2. ⛔ admin#7 : prénom et nom rognés, espaces multiples réduits ──');
  { const r = await creer({ prenom: '  Paul ', nom: ' Durand  ' });
    v('⛔ le compte est enregistré rogné', r.nu && [r.nu.prenom, r.nu.nom], ['Paul', 'Durand']);
    v('⛔ … et la fiche technicien aussi (un seul espace entre les deux)', r.W.db.techniciens.map(t => t.nom), ['Paul Durand']);
    const r2 = await creer({ prenom: 'Jean   Marc', nom: 'De   la  Tour' });
    v('⛔ les espaces multiples À L’INTÉRIEUR se réduisent', r2.nu && [r2.nu.prenom, r2.nu.nom], ['Jean Marc', 'De la Tour']);
    v('… la fiche : « Jean Marc De la Tour »', r2.W.db.techniciens.map(t => t.nom), ['Jean Marc De la Tour']);
    const r3 = await creer({ prenom: ' Sofia ', nom: ' Perez  ' });
    v('⛔ l’homonyme est jugé APRÈS nettoyage : « ␣Sofia␣ ␣Perez␣␣ » existe déjà, refusé', [!!r3.nu, r3.toasts.some(t => /est déjà le nom d’un autre compte/.test(t))], [false, true]);
    const r4 = await creer({ prenom: '   ', nom: 'Durand' });
    vrai('contre-épreuve : un prénom d’espaces seuls reste refusé', !r4.nu && r4.toasts.some(t => /obligatoires/.test(t)), r4.toasts);
    const r5 = await creer({ prenom: 'Anne-Sophie', nom: "O'Neil" });
    v('contre-épreuve : un nom composé ou avec apostrophe n’est pas altéré', r5.nu && [r5.nu.prenom, r5.nu.nom], ['Anne-Sophie', "O'Neil"]);
    const W = monde([Object.assign(tech(), { prenom: '  Paul ', nom: ' Durand  ' }), admin()], admin(), [{ id: 'tS', nom: 'Paul   Durand' }]);
    v('⛔ un compte DÉJÀ en base garde ses espaces tant qu’on ne l’enregistre pas (rien ne s’écrit au chargement)', [W.db.users[0].prenom, W.__saves], ['  Paul ', 0]);
    const r6 = await modifierMoi([Object.assign(tech(), { prenom: '  Paul ', nom: ' Durand  ' }), admin()], 'uT', { prenom: '  Paul ', nom: ' Durand  ', email: 'p@exemple.fr' });
    v('… et il se nettoie à son prochain enregistrement', [r6.u.prenom, r6.u.nom, r6.techs.map(t => t.nom)], ['Paul', 'Durand', ['Paul Durand']]); }

  console.log('\n── 1300 · 3. ⛔ admin#7 : la recherche reste tolérante aux comptes d’avant ──');
  { const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp,
      db: { clients: [], interventions: [], produits: [], boxes: [], vehicules: [], devis: [], factures: [], fournisseurs: [], techniciens: [{ id: 't1', nom: 'Paul   Durand', metier: 'Technicien' }] }, currentUser: { id: 'u', role: 'admin' } };
    vm.createContext(ctx);
    vm.runInContext(`${NORM}
      ${ligne('let _rechPlus={}, _rechDerniere=').replace('let ', 'var ')}   // clients#8 (lot g16) : la recherche retient ce qu'elle a déplié
      var el={}; function $(){ return el; } function rechVoit(){ return true; } function esc(s){ return String(s); }
      function visibleClients(l){return l;} function visibleInts(l){return l;} function visibleBoxes(l){return l;} function visibleVehicules(l){return l;}
      function visibleDocs(l){return l;} function visibleTechniciens(l){return l;} function vPlaque(v){return v.plaque;} function clientName(){return '';} function fmtShort(){return '';}
      ${RS}`, ctx);
    for (const q of ['paul durand', 'Paul  Durand', ' paul   durand ']) { vm.runInContext(`renderSearch(${JSON.stringify(q)})`, ctx); const h = vm.runInContext('el.innerHTML', ctx);
      vrai('« ' + q + ' » trouve la fiche « Paul   Durand » (espaces d’avant)', /Paul   Durand/.test(h), h.slice(0, 120)); }
    vm.runInContext('renderSearch("zzz qqq")', ctx);
    vrai('contre-épreuve : un nom absent ne trouve rien', /Aucun résultat/.test(vm.runInContext('el.innerHTML', ctx))); }

  console.log(`\n════ test-1300 : ${ok} ✓ ${ko} ✗ ════\n`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log(`\n════ test-1300 : ${ok} ✓ ${ko + 1} ✗ ════\n`); process.exit(1); });
