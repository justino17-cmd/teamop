/* ⛔ CE QUE CE FICHIER GARDE — créer un compte ne doit JAMAIS lui retirer les box que
   l'entreprise a ouvertes à toute l'équipe.

   15 septembre 2026, chez ELAN : « certains utilisateurs ne voient plus les box dans leur
   espace. Mais les box ne sont pas vides. Ils les voient plus, c'est tout. »

   LE MÉCANISME, et il est entièrement dans le code livré :
   1. le formulaire de création rend TOUTES les cases de box décochées — `nuBoxes=new Set()`
      quand il n'y a pas d'identifiant (app.html:24386) ;
   2. à l'enregistrement, `saveUser` boucle sur TOUTES les box actives et appelle
      `userBoxVoit(nu.id, b.id, false)` pour chaque case non cochée (app.html:24655-24656) ;
   3. `userBoxVoit` avec `on=false` calcule `auto = visibleTous || sa fiche technicien est
      cochée || il en est responsable` — et si `auto` est vrai, il POUSSE la personne dans
      `b.userIdsExclus` (app.html:8563) ;
   4. `visibleBoxes` teste `!boxExclu(b,moi)` EN PREMIER (app.html:8520) : l'exclusion passe
      avant tout, y compris avant « visible par toute l'équipe » et avant les congés.

   Autrement dit : l'administrateur crée un compte, ne descend pas jusqu'à la liste des box —
   et le geste de création EXCLUT activement la personne de toutes les box de l'équipe. Rien
   n'est supprimé, aucune box n'est vidée, aucun message n'est affiché.

   ⛔ LE REMÈDE NE DOIT PAS ÉLARGIR UN DROIT. Justin, le même soir : « si on a fait plusieurs
   accès, plusieurs permissions, c'est qu'il y a un but ». Cocher « visible par toute l'équipe »
   pour débloquer les gens serait débrancher la fonctionnalité. Ce qu'on répare, c'est que
   l'ABSENCE de geste ne vaille pas RETRAIT. */

const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

console.log('Créer un compte ne lui retire pas les box de l’équipe (vraies fonctions exécutées)');

/* ── extraction par comptage d'accolades, comme les autres suites ── */
function extraire(nom) {
  const d = APP.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let i = APP.indexOf('{', d), p = 0;
  for (; i < APP.length; i++) { const c = APP[i]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return APP.slice(d, i + 1); } }
  return null;
}
const SRC_VOIT = extraire('userBoxVoit');
const SRC_VIS = extraire('visibleBoxes');
const L_EXCLU = (APP.match(/^const boxExclu=.*$/m) || [])[0];
/* ⛔ ET SURTOUT : LA BOUCLE DE CRÉATION ELLE-MÊME, découpée dans le fichier livré. Un banc qui
   rejoue une COPIE de la boucle ne dit rien de ce qui part en production — il dirait seulement
   que ma transcription est juste. Bornée par deux repères de texte, jamais par une longueur. */
const _d = APP.indexOf('if(!acces.caps.voirTout){ (db.boxes||[])');
const _f = APP.indexOf('logEvent(\'Utilisateur créé\'', _d);
const SRC_BOUCLE = (_d > -1 && _f > _d) ? APP.slice(_d, _f) : null;
v('userBoxVoit est extraite du fichier livré', !!SRC_VOIT, true);
v('visibleBoxes est extraite du fichier livré', !!SRC_VIS, true);
v('boxExclu est extraite du fichier livré', !!L_EXCLU, true);
v('⛔ la boucle de création est extraite du fichier livré', !!SRC_BOUCLE, true);

function banc(db, moi) {
  const ctx = {
    db, currentUser: moi, JSON, Set, Array, Object, String,
    can: () => false,                    // un technicien : pas de « Tout voir »
    perimetreTechIds: () => null,
    delegationsRecues: () => [],
    myTechId: () => (moi && moi.techId) || null,
  };
  ctx.userVehiculeVoit = () => {};
  ctx.vehiculeAuto = () => false;
  vm.createContext(ctx);
  vm.runInContext(L_EXCLU + '\n' + SRC_VOIT + '\n' + SRC_VIS, ctx);
  /* On rejoue la VRAIE boucle de création, avec les variables qu'elle attend autour d'elle.
     ⚠️ v737 : c'est le CRÉATEUR qui est connecté pendant la boucle (un administrateur, sauf si
     l'essai en nomme un autre) — la boucle ne laisse un créateur ouvrir que ce qu'il voit
     lui-même. Avant, ce banc jouait la boucle avec le NOUVEAU compte comme utilisateur connecté,
     ce qui ne changeait rien tant que la boucle ne regardait pas qui crée. */
  ctx.creer = (nu, coches, createur) => {
    ctx.nu = nu; ctx.nuBoxes = new Set(coches || []); ctx.nuVehs = new Set();
    ctx.acces = { caps: { voirTout: false } };
    const avant = ctx.currentUser; ctx.currentUser = createur || { id: 'uAdm', role: 'admin' };
    try { vm.runInContext('let _nBox=0, _nVeh=0;\n' + SRC_BOUCLE + '\nthis.nBox=_nBox;', ctx); }
    finally { ctx.currentUser = avant; }
    return ctx.nBox;
  };
  return ctx;
}
const troisBox = () => [
  { id: 'b1', nom: 'Cuisine', visibleTous: true, actif: true },
  { id: 'b2', nom: 'Réserve', visibleTous: true, actif: true },
  { id: 'b3', nom: 'Cave', visibleTous: true, actif: true },
];

/* ── 1) ⛔ LE CAS D'ELAN : on crée un compte sans descendre jusqu'aux box ── */
{
  const nu = { id: 'u9', prenom: 'Nouveau', nom: 'Technicien', role: 'technicien' };
  const db = { boxes: troisBox(), users: [nu] };
  const c = banc(db, nu);
  v('⛔ avant création, les trois box de l’équipe lui sont visibles', c.visibleBoxes(db.boxes).length, 3);

  /* L'administrateur crée le compte et ne déroule pas la liste des box : rien n'est coché. */
  const nOuvertes = c.creer(nu, []);
  v('⛔ APRÈS création, il voit TOUJOURS les trois box de l’équipe', c.visibleBoxes(db.boxes).length, 3);
  v('⛔ …et il n’a été exclu d’AUCUNE', db.boxes.map(b => (b.userIdsExclus || []).length), [0, 0, 0]);
  v('le journal n’annonce aucun droit qu’il n’a pas donné', nOuvertes, 0);
  v('aucune box n’a été vidée ni supprimée', db.boxes.length, 3);
}

/* ── 2) Le même geste sur les box qui nomment sa fiche technicien ── */
{
  const nu = { id: 'u9', prenom: 'Nouveau', nom: 'Technicien', role: 'technicien', techId: 't3' };
  const db = { boxes: [
    { id: 'b1', nom: 'Sa tournée', techIds: ['t3'], actif: true },
    { id: 'b2', nom: 'Son autre', techIds: ['t3'], actif: true },
    { id: 'b3', nom: 'Pas la sienne', techIds: ['t7'], actif: true },
  ], users: [nu] };
  const c = banc(db, nu);
  v('avant, il voit les deux box qui le nomment', c.visibleBoxes(db.boxes).length, 2);
  c.creer(nu, []);
  v('⛔ après création, il garde SES tournées', c.visibleBoxes(db.boxes).map(b => b.id), ['b1', 'b2']);
  v('…et celle des autres ne lui est pas ouverte pour autant', c.visibleBoxes(db.boxes).some(b => b.id === 'b3'), false);
  v('aucune exclusion posée nulle part', db.boxes.map(b => (b.userIdsExclus || []).length), [0, 0, 0]);
}

/* ── 2b) ⚠️ ET COCHER DOIT TOUJOURS OUVRIR : sans ça, on aurait « réparé » en ne faisant rien ── */
{
  const nu = { id: 'u9', role: 'technicien' };
  const db = { boxes: [
    { id: 'b1', nom: 'Fermée', actif: true },
    { id: 'b2', nom: 'Fermée aussi', actif: true },
  ], users: [nu] };
  const c = banc(db, nu);
  v('avant, il ne voit rien', c.visibleBoxes(db.boxes).length, 0);
  const n = c.creer(nu, ['b1']);
  v('⚠️ la box COCHÉE lui est bien ouverte', c.visibleBoxes(db.boxes).map(b => b.id), ['b1']);
  v('…et elle seule', (db.boxes[1].userIds || []).length, 0);
  v('le journal compte exactement une box ouverte', n, 1);
}

/* ── 2c) ⛔⛔ v737 — UN CRÉATEUR QUI N'EST PAS ADMINISTRATEUR N'OUVRE QUE CE QU'IL VOIT ──
   Le formulaire ne lui montre que ses box ; la boucle le vérifie aussi, car une case cochée
   peut arriver d'ailleurs que du formulaire (un état resté d'une création précédente). */
{
  const nu = { id: 'u9', role: 'technicien' };
  const chef = { id: 'uR', role: 'chefEquipe' };
  const db = { boxes: [
    { id: 'b1', nom: 'La sienne', userIds: ['uR'], actif: true },
    { id: 'b2', nom: 'Pas la sienne', actif: true },
  ], users: [nu, chef] };
  const c = banc(db, nu);
  const n = c.creer(nu, ['b1', 'b2'], chef);
  v('⛔⛔ le chef ouvre au nouveau compte la box qu’il voit lui-même…', (db.boxes[0].userIds || []).includes('u9'), true);
  v('⛔⛔ …et PAS celle qu’il ne voit pas, même cochée', (db.boxes[1].userIds || []).includes('u9'), false);
  v('le journal ne compte que la box vraiment ouverte', n, 1);
  const n2 = banc(db, nu).creer({ id: 'u8', role: 'technicien' }, ['b2']);   // un bac neuf : la boucle déclare ses compteurs
  v('contre-épreuve : un administrateur ouvre la même box sans difficulté', [(db.boxes[1].userIds || []).includes('u8'), n2], [true, 1]);
}

/* ── 3) ⚠️ CE QUI DOIT RESTER VRAI — une exclusion VOULUE reste une exclusion ── */
{
  const nu = { id: 'u9', role: 'technicien' };
  const db = { boxes: troisBox(), users: [nu] };
  const c = banc(db, nu);
  c.userBoxVoit('u9', 'b2', false);            // l'administrateur décoche EXPRÈS la Réserve
  v('⚠️ une box retirée à la main reste retirée', c.visibleBoxes(db.boxes).map(b => b.id), ['b1', 'b3']);
  c.userBoxVoit('u9', 'b2', true);             // il la recoche
  v('…et la recocher la rend', c.visibleBoxes(db.boxes).map(b => b.id), ['b1', 'b2', 'b3']);
}

/* ── 4) ⚠️ ET LE CONTRE-TEST QUI COMPTE : sur une box NON ouverte à l'équipe,
      ne pas cocher ne doit rien exclure — il n'y a rien à retirer. ── */
{
  const nu = { id: 'u9', role: 'technicien' };
  const db = { boxes: [{ id: 'b1', nom: 'Fermée', actif: true }], users: [nu] };
  const c = banc(db, nu);
  c.userBoxVoit('u9', 'b1', false);
  v('⚠️ une box qu’il ne voyait pas ne le met pas dans les exclus', (db.boxes[0].userIdsExclus || []).length, 0);
  v('…et il ne la voit toujours pas, ce qui est juste', c.visibleBoxes(db.boxes).length, 0);
}

/* ── 5) L'ÉCRAN DE REMISE EN ÉTAT — il montre ce qui prive, et RIEN d'autre ──
   Le correctif arrête la cause ; les comptes déjà créés portent toujours leur exclusion.
   ⚠️ Cet écran ne prétend PAS distinguer un retrait accidentel d'un retrait voulu : rien ne
   les distingue dans les données. Il liste ce qui PRIVE, et l'humain tranche. Ce que le banc
   garde, c'est qu'il ne noie pas le signal — une exclusion qui ne retire rien n'y figure pas. */
{
  const SRC_PRIV = extraire('exclusionsPrivantes');
  v('⛔ exclusionsPrivantes est extraite du fichier livré', !!SRC_PRIV, true);
  const nu = { id: 'u9', prenom: 'Nouveau', nom: 'Tech', role: 'technicien', techId: 't3' };
  const db = { boxes: [
    { id: 'b1', nom: 'Équipe', visibleTous: true, actif: true, userIdsExclus: ['u9'] },
    { id: 'b2', nom: 'Sa tournée', techIds: ['t3'], actif: true, userIdsExclus: ['u9'] },
    { id: 'b3', nom: 'Dont il répond', respUserId: 'u9', actif: true, userIdsExclus: ['u9'] },
    { id: 'b4', nom: 'Jamais la sienne', actif: true, userIdsExclus: ['u9'] },
    { id: 'b5', nom: 'Désactivée', visibleTous: true, actif: false, userIdsExclus: ['u9'] },
    { id: 'b6', nom: 'Rien à signaler', visibleTous: true, actif: true },
  ], users: [nu] };
  const c = banc(db, nu);
  c.userCap = () => false;
  vm.runInContext(SRC_PRIV, c);

  const l = c.exclusionsPrivantes(nu).map(b => b.id);
  v('⛔ les trois exclusions qui PRIVENT sont listées', l, ['b1', 'b2', 'b3']);
  v('⚠️ une exclusion sur une box qu’il ne verrait pas n’y figure PAS — elle ne retire rien', l.includes('b4'), false);
  v('⚠️ une box désactivée non plus', l.includes('b5'), false);
  v('⚠️ ni une box sans exclusion', l.includes('b6'), false);

  c.userCap = (u, cap) => cap === 'voirTout';
  v('⚠️ et « Tout voir » ne fait rien remonter — l’exclusion n’y joue pas', c.exclusionsPrivantes(nu).length, 0);
  c.userCap = () => false;

  c.userBoxVoit('u9', 'b1', true);
  v('⛔ rendre une box la rend vraiment visible', c.visibleBoxes(db.boxes).map(b => b.id).includes('b1'), true);
  v('…et les autres restent privées tant qu’on n’y touche pas', c.exclusionsPrivantes(nu).map(b => b.id), ['b2', 'b3']);
  v('⚠️ rendre n’ouvre AUCUNE box qui ne lui était pas destinée', (db.boxes[3].userIdsExclus || []).includes('u9'), true);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
if (ko) process.exitCode = 1;
