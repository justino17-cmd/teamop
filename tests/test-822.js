/* ══ v755 — CE QUI RESTAIT DE LA LISTE « MINEURS », VÉRIFIÉ AVANT D'ÊTRE TOUCHÉ ══════════════════════
   Justin, 26 septembre 2026 : « ça, si c'est à faire tu le fais, et après tu publies ». Chaque point de la
   liste de REPRISE a été MESURÉ avant d'écrire — et l'un d'eux était faux :
   1. L'ACCUEIL ET LES INITIALES DU HAUT. Leurs éléments (brand-ini, brand-hi, brand-role, topbar-ava) ont
      disparu à la refonte ; l'identité vit dans le pied du menu (foot-ava, foot-name, foot-role) et l'accueil
      dans le toast « 👋 Bienvenue ». Les écritures mortes sont retirées — et un vrai défaut avec elles : se
      renommer soi-même ne remettait pas à jour les initiales du menu (saveUser écrivait dans brand-ini), et
      le rôle y perdait le nom de l'entreprise jusqu'au prochain chargement.
   2. LE CODE MORT. teleTechSwitch (aucun appelant, aucun de ses trois éléments), les retraits de
      #update-banner (plus personne ne le fabrique depuis la v667 — test-666), l'écran du créateur d'avatar
      « avb » (aucun appelant, aucun #avb-prev). ⚠️ « avb* » n'était PAS tout mort, contrairement à ce que
      disait REPRISE : avbSvg et avbSave recolorent, quand la teinte change, les avatars déjà créés avec lui
      (avatarAccentSync). Ils restent, et ce banc les EXÉCUTE.
   3. LA PUCE DU JOURNAL. « Métier de l'entreprise » tombait sur la puce générique — et avec elle quatre
      autres types que le code écrit (intervention, planning, commercial, synchro). Le banc recense chaque
      type passé à logEvent dans le fichier et exige sa puce. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* le code seul : les blocs de commentaire qui commencent une ligne, puis les commentaires de ligne entière
   (la règle du dépôt : un motif vise du code, jamais la phrase qui l'explique) */
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = BRUT.indexOf(debut); if (i < 0) return '';
  let p = 0; for (let k = BRUT.indexOf('{', i); k < BRUT.length; k++) {
    if (BRUT[k] === '{') p++; else if (BRUT[k] === '}') { p--; if (!p) return BRUT.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = BRUT.indexOf(debut); return i < 0 ? '' : BRUT.slice(i, BRUT.indexOf('\n', i)); };

console.log('\n── 822 · 0. la population ──');
const P = { saveUser: bloc('async function saveUser(e,id){'), userAvatarApply: bloc('function userAvatarApply(){'), enterApp: bloc('function enterApp(u){'),
  avatarAccentSync: bloc('function avatarAccentSync(){'), avbSvg: bloc('function avbSvg(a,sz){'), avbSave: bloc('function avbSave(quiet){'),
  initials: ligne('const initials = name =>'), fullName: ligne('const fullName = u =>'), TYPE_ICO: ligne('const TYPE_ICO={'),
  nomNorm: bloc('function nomNorm(s){'), compteHomonyme: bloc('function compteHomonyme(prenom,nom,sauf){'), homonymeMessage: bloc('function homonymeMessage(h,prenom,nom){') };
v('toutes les pièces sont trouvées dans le fichier réel', Object.keys(P).filter(k => !P[k]), []);

console.log('\n── 822 · 1. ⛔ l’identité du compte s’écrit là où elle se voit ──');
{ const MORTS = ['brand-ini', 'brand-hi', 'brand-role', 'topbar-ava'];
  v('⛔ aucun élément ne porte ces identifiants (la refonte les a retirés)', MORTS.filter(id => BRUT.includes('id="' + id + '"')), []);
  v('⛔ … et plus aucun code n’y écrit, ni ne les habille en CSS', MORTS.filter(id => CODE.includes("$('" + id + "')") || CODE.includes("'" + id + "'") || CODE.includes('.' + id + '{') || CODE.includes('.' + id + ',')), []);
  v('les trois cibles du pied de menu existent bien', ['foot-ava', 'foot-name', 'foot-role'].filter(id => !BRUT.includes('id="' + id + '"')), []);
  const ids = ((/\[([^\]]*)\]\.forEach/.exec(P.userAvatarApply) || [])[1] || '').match(/'[^']+'/g) || [];
  v('⛔ userAvatarApply ne vise que des éléments qui existent', ids.map(x => x.slice(1, -1)).filter(id => !BRUT.includes('id="' + id + '"')), []);
  vrai('… et il en vise au moins un (sinon la comparaison ne mesure rien)', ids.length >= 1, ids);
}
/* La vraie saveUser, quand l'administrateur se renomme lui-même : le bac à sable de test-795, plus un « $ » qui
   rend les éléments du pied de menu et le vrai userAvatarApply. */
function monde(users, moi) {
  const els = {}; const el = id => els[id] || (els[id] = { id, textContent: '', style: {} });
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise,
    db: { users, techniciens: [], boxes: [], vehicules: [], entreprise: { nom: 'Sonde SARL' } }, currentUser: moi, __toasts: [], __els: els, __nav: 0,
    localStorage: { getItem: () => null, setItem: () => {} } };
  vm.createContext(ctx);
  vm.runInContext(`${P.nomNorm}\n${P.fullName.replace('const ', 'var ')}\n${P.initials.replace('const ', 'var ')}\n${P.compteHomonyme}\n${P.homonymeMessage}
    var ROLE_PROTEGE='admin', drRattaches=new Set(), nuBoxes=new Set(), nuVehs=new Set(), nuStk=false, views={utilisateurs(){}};
    function toast(m){ __toasts.push(String(m)); } function save(){} function closeModal(){} function logEvent(){} function renderNav(){ __nav++; }
    function can(){ return false; } function planPlaceLibre(){ return true; } function proposerAbonnement(){}
    async function loginExisteAilleurs(){ return false; }
    function roleEstTech(r){ return r==='technicien'; } function roleLbl(r){ return ({admin:'Administrateur',technicien:'Technicien'})[r]||r; }
    function profilDroits(){ return null; } function droitsBorner(){ return []; } function stockageBox(){ return null; } function estStockage(){ return false; }
    function visibleBoxes(l){ return l||[]; } function visibleVehicules(l){ return l||[]; } function userBoxVoit(){} function userVehiculeVoit(){}
    function entrepriseNom(){ return 'Sonde SARL'; } async function sha256(){ return 'h'; } function userIdentifiantsModal(){}
    function setTimeout(f){ } var __id=0; function uid(){ return 'n'+(++__id); } function FormData(t){ return Object.entries(t); }
    function $(id){ return (${JSON.stringify(['foot-ava', 'foot-name', 'foot-role'])}).includes(id) ? (__el(id)) : null; }
    ${P.userAvatarApply}
    ${P.saveUser}`, Object.assign(ctx, { __el: el }));
  return ctx;
}
(async () => {
  const admin = { id: 'uA', prenom: 'Justin', nom: 'Roux', login: 'jroux', role: 'admin', actif: true };
  const W = monde([JSON.parse(JSON.stringify(admin)), { id: 'uK', prenom: 'Karim', nom: 'Benali', login: 'kbenali', role: 'technicien', actif: true }], JSON.parse(JSON.stringify(admin)));
  W.__els['foot-ava'] = { id: 'foot-ava', textContent: 'JR', style: {} };
  await W.saveUser({ preventDefault() {}, target: { prenom: 'Marc', nom: 'Aubert', login: 'jroux', role: 'admin', email: '', actif: 'true' } }, 'uA');
  vrai('population : le renommage a bien eu lieu (l’administrateur s’appelle désormais Marc Aubert)', W.db.users[0].prenom === 'Marc' && W.currentUser.prenom === 'Marc', W.__toasts);
  v('⛔⛔ se renommer met à jour les initiales du menu (avant : elles restaient « JR » jusqu’au prochain chargement)', W.__els['foot-ava'].textContent, 'MA');
  v('… et le nom', W.__els['foot-name'] && W.__els['foot-name'].textContent, 'Marc Aubert');
  v('⛔ … et le rôle garde le nom de l’entreprise, comme à l’ouverture', W.__els['foot-role'] && W.__els['foot-role'].textContent, 'Administrateur · Sonde SARL');
  /* la même ligne à l'ouverture de l'application : enterApp écrit le rôle ET l'entreprise — les deux chemins disent pareil */
  vrai('enterApp écrit le pied de menu de la même façon (rôle · entreprise)',
    /\$\('foot-role'\);\s*if\(fr\) fr\.textContent=\(roleLbl\(u\.role\)\|\|'Technicien'\)\+\(db\.entreprise&&db\.entreprise\.nom\?' · '\+db\.entreprise\.nom:''\)/.test(P.enterApp));
  const Wp = monde([JSON.parse(JSON.stringify(Object.assign({}, admin, { photo: 'data:image/png;base64,AAAA' })))], JSON.parse(JSON.stringify(Object.assign({}, admin, { photo: 'data:image/png;base64,AAAA' }))));
  Wp.__els['foot-ava'] = { id: 'foot-ava', textContent: '', style: {} };
  await Wp.saveUser({ preventDefault() {}, target: { prenom: 'Marc', nom: 'Aubert', login: 'jroux', role: 'admin', email: '', actif: 'true' } }, 'uA');
  vrai('… et une PHOTO de profil reste une photo (pas d’initiales posées par-dessus)', /url\(data:image\/png/.test(Wp.__els['foot-ava'].style.backgroundImage || '') && Wp.__els['foot-ava'].textContent === '', Wp.__els['foot-ava']);

  console.log('\n── 822 · 2. le code mort est parti — et ce qui vivait encore est resté ──');
  vrai('teleTechSwitch n’existe plus, ni rien de ce qu’il visait', !/teleTechSwitch|tele-tech-show|tele-tech-pick|_teleDetId/.test(CODE));
  vrai('#update-banner : plus personne n’y touche (plus personne ne le fabrique depuis la v667)', !/update-banner/.test(CODE));
  vrai('l’écran du créateur d’avatar « avb » est parti (aucun appelant)', !/function avbRandom\(|function avbSet\(|function avbRender\(|AVB_[A-Z]/.test(CODE));
  v('⛔ … mais son dessin et son enregistrement restent, une fois chacun', ['function avbSvg(', 'function avbSave('].map(n => BRUT.split(n).length - 1), [1, 1]);
  vrai('⛔ … parce qu’un changement de teinte recolore les avatars déjà créés avec lui (avatarAccentSync → avbSave)', /m\.type==='avb'&&m\.avb\)\{[^}]*avbSave\(true\)/.test(P.avatarAccentSync), P.avatarAccentSync.slice(0, 120));
  /* on l'EXÉCUTE : sans ses listes retirées, le dessin d'un avatar existant doit sortir entier */
  const Wa = { console, __teinte: '#1E7A4E', __sombre: '#0E3B24' }; vm.createContext(Wa);
  vm.runInContext(`function accentHex(){ return __teinte; } function accentDark(){ return __sombre; }\n${P.avbSvg}`, Wa);
  let svg = ''; try { svg = Wa.avbSvg({ bg: 'elan', hair: 'court', hairColor: '#3B2A1D', skin: '#EAB38B', shirt: '#2563EB', barbe: 'barbe', lun: 'rond' }, 256); } catch (e) { svg = 'ERREUR ' + e.message; }
  vrai('⛔ un avatar « avb » déjà enregistré se redessine entier, à la teinte du moment',
    svg.startsWith('<svg') && svg.endsWith('</svg>') && svg.includes('#1E7A4E') && svg.includes('#3B2A1D') && svg.includes('stroke="#1F2937"'), svg.slice(0, 160));

  console.log('\n── 822 · 3. ⛔ chaque entrée du journal a sa puce ──');
  const W3 = {}; vm.createContext(W3); vm.runInContext(P.TYPE_ICO.replace('const ', 'var '), W3);
  const types = [...new Set([...CODE.matchAll(/logEvent\([^;]{0,400}?,\s*'([a-z]+)'\s*(?:,[^)]*)?\)/g)].map(m => m[1]))].sort();
  vrai('population : les types que le code passe à logEvent (' + types.join(', ') + ')', types.length >= 10 && types.includes('admin') && types.includes('intervention'), types);
  v('⛔⛔ aucun type sans sa puce (« Métier de l’entreprise », une intervention démarrée, une synchro…)', types.filter(t => !W3.TYPE_ICO[t] || (t !== 'general' && W3.TYPE_ICO[t] === '•')), []);
  vrai('… « Métier de l’entreprise » est bien un type « admin », et il a la sienne', /logEvent\('Métier de l’entreprise',[^;]*,'admin'\)/.test(CODE) && W3.TYPE_ICO.admin === '🛠️', W3.TYPE_ICO.admin);
  vrai('… et le journal lit bien cette table pour dessiner la puce', /<div class="tl-dot">\$\{TYPE_ICO\[j\.type\]\|\|'•'\}<\/div>/.test(CODE));

  console.log(`\n════ test-822 : ${ok} ✓ ${ko} ✗ ════`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc est mort : ' + e.message); console.log(`\n════ test-822 : ${ok} ✓ ${ko + 1} ✗ ════`); process.exit(1); });
