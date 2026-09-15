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
  /* On rejoue la VRAIE boucle de création, avec les variables qu'elle attend autour d'elle. */
  ctx.creer = (nu, coches) => {
    ctx.nu = nu; ctx.nuBoxes = new Set(coches || []); ctx.nuVehs = new Set();
    ctx.acces = { caps: { voirTout: false } };
    vm.runInContext('let _nBox=0, _nVeh=0;\n' + SRC_BOUCLE + '\nthis.nBox=_nBox;', ctx);
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

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
if (ko) process.exitCode = 1;
