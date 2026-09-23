/* ══ L'ÉQUIPE : CHACUN VOIT CE QUI LE CONCERNE — ET CORRIGER DES HEURES EST UN GESTE DE RESPONSABLE (v735) ══
   Deux décisions de Justin, 23 septembre 2026, après l'explication en images :
   · écran « Équipe » : « chacun voit ce qui le concerne, et le DR ou autres personnes assignés » ;
   · Pointage : « le ✎ réservé au responsable ».

   Avant : `views.techniciens` n'est pas au menu, donc la garde de `go()` ne le connaissait pas. Tout
   compte qui tapait `#v=techniciens`, ou cherchait un collègue dans la recherche, lisait téléphones,
   e-mails, Certibiocide et TEMPS POINTÉ de toute l'entreprise. Et ni `formPointage` ni
   `savePointage` ne vérifiaient rien : un technicien pouvait réécrire ses propres heures.

   Ce banc EXÉCUTE les vraies fonctions extraites d'app.html sur cinq personnes : l'administrateur,
   un DR avec une personne rattachée (`drId`), un technicien, un responsable des feuilles de temps
   sans « tout voir » (`voirPointages`), et un compte de bureau sans fiche. Puis il vérifie que CHAQUE
   porte passe par la règle : l'écran, la fiche, la recherche, le journal, la ligne de pointage, le
   formulaire, l'enregistrement, la suppression. Le geste dans une vraie page : `scratchpad/sonde-equipe.js`. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), prof = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k];
    if (c === '{') prof++; else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); } }
  return '';
}

console.log('\n── 786 · 0. la population ──');
const NOMS = ['function equipeDe(u){', 'function perimetreTechIds(u){', 'function myTechId(){', 'function ptEstAMoi(p){',
  'function visiblePointages(list){', 'function ptPeutVoirAutres(){', 'function ptPeutCorriger(p){', 'function visibleTechniciens(list){'];
const CODE = NOMS.map(bloc);
v('les fonctions sont trouvées', NOMS.filter((n, i) => !CODE[i]), []);
for (const n of ['function ptPeutCorriger(', 'function visibleTechniciens(']) v('… une seule définition de ' + n.slice(9, -1), SRC.split(n).length - 1, 1);

/* L'entreprise : quatre fiches du personnel, cinq comptes. Léo est DR, Sofia lui est rattachée.
   Karim est technicien. Nadia tient les feuilles de temps (voirPointages) sans « tout voir ».
   Claire est au bureau, sans fiche du personnel. */
/* Pas d'entrée vide ici : l'application n'en produit pas (migrate ne pose que des tableaux), et une
   sonde qui force un état que l'application ne produit jamais fabrique de faux défauts. */
const TECHS = [{ id: 'tK', nom: 'Karim Benali' }, { id: 'tS', nom: 'Sofia Perez' }, { id: 'tL', nom: 'Léo Martin' }, { id: 'tJ', nom: 'Jean Terrain' }];
const USERS = [
  { id: 'uA', prenom: 'Justin', nom: 'Roux', role: 'admin', caps: ['voirTout'] },
  { id: 'uL', prenom: 'Léo', nom: 'Martin', role: 'dr', techId: 'tL', caps: ['voirTout'] },
  { id: 'uS', prenom: 'Sofia', nom: 'Perez', role: 'technicien', techId: 'tS', drId: 'uL', caps: [] },
  { id: 'uK', prenom: 'Karim', nom: 'Benali', role: 'technicien', techId: 'tK', caps: [] },
  { id: 'uN', prenom: 'Nadia', nom: 'Lopez', role: 'comptable', caps: ['voirPointages'] },
  { id: 'uC', prenom: 'Claire', nom: 'Morel', role: 'commercial', caps: [] },
];
const PTS = [{ id: 'pK', techId: 'tK' }, { id: 'pS', techId: 'tS' }, { id: 'pJ', techId: 'tJ' }, { id: 'pC', userId: 'uC' }];
function monde(moi) {
  const u = USERS.find(x => x.id === moi) || null;
  const ctx = { currentUser: u, db: { users: USERS, techniciens: TECHS, pointages: PTS },
    can: k => !!u && u.caps.includes(k), fullName: x => ((x.prenom || '') + ' ' + (x.nom || '')).trim() };
  vm.createContext(ctx); vm.runInContext(CODE.join('\n'), ctx);
  ctx.equipe = () => vm.runInContext('visibleTechniciens(db.techniciens).map(t=>t.id)', ctx);
  ctx.corrige = id => vm.runInContext('ptPeutCorriger(db.pointages.find(p=>p.id===' + JSON.stringify(id) + '))', ctx);
  return ctx;
}

if (CODE.every(Boolean)) {
  console.log('\n── 786 · 1. ⛔⛔ « Équipe » : chacun voit ce qui le concerne ──');
  v('l’administrateur voit toute l’équipe', monde('uA').equipe(), ['tK', 'tS', 'tL', 'tJ']);
  v('⛔ le DR voit les personnes qui lui sont rattachées, et lui-même — pas Karim ni Jean', monde('uL').equipe(), ['tS', 'tL']);
  v('⛔⛔ un technicien ne voit QUE sa propre fiche', monde('uK').equipe(), ['tK']);
  v('… Sofia aussi, rattachée à un DR ou non', monde('uS').equipe(), ['tS']);
  v('la responsable des feuilles de temps, sans équipe rattachée, voit l’entreprise (comme ses pointages)', monde('uN').equipe(), ['tK', 'tS', 'tL', 'tJ']);
  v('⛔ un compte de bureau sans fiche ne voit personne', monde('uC').equipe(), []);
  v('personne de connecté : rien', monde(null).equipe(), []);

  console.log('\n── 786 · 2. ⛔⛔ le ✎ du Pointage : aux seuls responsables, sur leurs lignes ──');
  v('⛔⛔ un technicien NE PEUT PAS corriger ses propres heures', monde('uK').corrige('pK'), false);
  v('… ni celles d’un autre', monde('uK').corrige('pS'), false);
  v('l’administrateur corrige toutes les lignes', ['pK', 'pS', 'pJ', 'pC'].map(monde('uA').corrige), [true, true, true, true]);
  v('⛔ le DR corrige celles de son périmètre, pas celles de Karim ni de Jean', ['pK', 'pS', 'pJ'].map(monde('uL').corrige), [false, true, false]);
  v('la responsable des feuilles de temps corrige (c’est son rôle)', monde('uN').corrige('pK'), true);
  v('⛔ un compte de bureau sans « voir les pointages » ne corrige pas même SA ligne', monde('uC').corrige('pC'), false);
  v('une ligne introuvable ne se corrige pas', monde('uA').corrige('nexiste-pas'), false);
}

console.log('\n── 786 · 3. ⛔ chaque porte passe par la règle ──');
const vue = bloc('views.techniciens=function(){');
vrai('population : l’écran « Équipe » est trouvé', vue.length > 800, vue.length);
vrai('⛔⛔ l’écran liste visibleTechniciens, plus db.techniciens en entier', /const L=visibleTechniciens\(db\.techniciens\)/.test(vue) && /const rows=L\.map\(/.test(vue) && !/db\.techniciens\.map\(/.test(vue));
vrai('… le compte en tête est le sien', /`\$\{L\.length\} membre\(s\)`/.test(vue));
vrai('⛔ « ＋ Technicien » (qui crée aussi un COMPTE) demande en plus le droit de créer des comptes', /peutAjout=canCat\('equipe','ajouter'\)&&!!currentUser&&\(currentUser\.role==='admin'\|\|can\('creerUtilisateurs'\)\)/.test(vue));
vrai('« ＋ Technicien », ✎ et 🗑 n’apparaissent qu’avec le droit correspondant', /peutAjout\?`<button class="btn" onclick="formTech\(\)">/.test(vue) && /\$\{peutModif\?`<button class="btn ghost sm" onclick="formTech\(/.test(vue) && /\$\{peutSuppr\?`<button class="btn danger sm" onclick="delItem\('techniciens'/.test(vue));
vrai('la fusion des doublons n’est proposée qu’à qui voit l’équipe ENTIÈRE', /const nbDbl=\(peutModif&&L\.length===\(db\.techniciens\|\|\[\]\)\.length\)\?techDoublons\(\)\.length:0/.test(vue));
const fiche = bloc('function ficheTech(id){');
vrai('population : la fiche est trouvée', fiche.length > 800, fiche.length);
vrai('⛔⛔ la fiche ne s’ouvre que si elle me concerne (et le dit sinon)', /const t=visibleTechniciens\(db\.techniciens\)\.find\(x=>x\.id===id\);/.test(fiche) && /toast\('Cette fiche ne te concerne pas'\)/.test(fiche));
vrai('… et « Modifier » n’y paraît qu’avec le droit', /\$\{canCat\('equipe','modifier'\)\?`<button class="btn ghost" onclick="closeModal\(\);formTech\(/.test(fiche));
const rech = bloc('function renderSearch(qq){');
vrai('⛔ la recherche ne propose que les fiches qui me concernent', /add\(visibleTechniciens\(db\.techniciens\),'Technicien'/.test(rech) && !/add\(db\.techniciens,/.test(rech));
const jgo = bloc('function journalGo(id){');
vrai('population : journalGo est trouvé', jgo.length > 500, jgo.length);
vrai('⛔ le journal n’ouvre que les fiches qui me concernent', /m=visibleTechniciens\(db\.techniciens\)\.find\(/.test(jgo) && !/m=db\.techniciens\.find\(/.test(jgo));
vrai('le formulaire refuse à l’ouverture ce que l’enregistrement refuserait', /function formTech\(id\)\{ if\(!permGarde\('equipe', id\?'modifier':'ajouter','un technicien'\)\) return;/.test(SRC));
vrai('… y compris la création sans le droit de créer des comptes', /function formTech\(id\)\{[^\n]*\n  if\(!id && !\(currentUser&&\(currentUser\.role==='admin'\|\|can\('creerUtilisateurs'\)\)\)\)\{ toast\('Créer des comptes demande/.test(SRC));
vrai('la fusion des doublons porte la même garde', /function techFusionnerDoublons\(\)\{ if\(!permGarde\('equipe','modifier',/.test(SRC));
const ligne = (SRC.match(/\$\{ptPeutCorriger\(p\)\?`<span style="white-space:nowrap"><button class="btn ghost sm" onclick="formPointage\('\$\{p\.id\}'\)"/) || [])[0];
vrai('⛔ la ligne de pointage ne montre ✎ et 🗑 qu’à qui peut corriger CETTE ligne', !!ligne);
vrai('… et plus aucun ✎ de pointage sans condition', (SRC.match(/onclick="formPointage\(/g) || []).length === 1);
vrai('⛔⛔ le formulaire refuse (une ligne cachée n’est pas une garde)', /function formPointage\(id\)\{[^\n]*\n  if\(id\?!ptPeutCorriger\(p\):!ptPeutVoirAutres\(\)\)\{ toast\('Corriger des heures est réservé aux responsables'\); return; \}/.test(SRC));
vrai('⛔⛔ l’enregistrement refuse aussi', /function savePointage\(e,id\)\{ e\.preventDefault\(\);\n  if\(id\?!ptPeutCorriger\(db\.pointages\.find\(x=>x\.id===id\)\):!ptPeutVoirAutres\(\)\)\{ toast\(/.test(SRC));
const del = bloc('function delItem(coll,id){');
vrai('⛔ la suppression d’un pointage suit la même règle, au point de passage de toutes les suppressions', /if\(coll==='pointages' && !ptPeutCorriger\(\(db\.pointages\|\|\[\]\)\.find\(x=>x\.id===id\)\)\)\{ toast\('Supprimer des heures est réservé aux responsables'\); return; \}/.test(del));

console.log('\n── 786 · 4. la mesure dans une vraie page existe ──');
const P = path.join(__dirname, '..', 'scratchpad', 'sonde-equipe.js');
const SONDE = fs.existsSync(P) ? fs.readFileSync(P, 'utf8') : '';
vrai('scratchpad/sonde-equipe.js existe', !!SONDE);
vrai('… elle ouvre l’écran PAR L’ADRESSE, en technicien, et compte les fiches rendues', /#v=techniciens/.test(SONDE) && /technicien/.test(SONDE) && /row-clk/.test(SONDE));
vrai('… elle essaie la recherche, la fiche d’un collègue et la correction d’heures', /renderSearch\(/.test(SONDE) && /ficheTech\(/.test(SONDE) && /formPointage\(/.test(SONDE));
vrai('… elle sait tourner sur une bêta d’avant (contre-épreuve)', /process\.env\.SOURCE/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

/* ── 786 · 5. ⛔⛔ LA FICHE N'EST PAS UNE PORTE DÉROBÉE VERS LES COMPTES ──
   Trouvé en écrivant ce banc : le droit « modifier » de Temps & équipe vaut OUI par défaut, et
   `saveTech` réécrivait le RÔLE du compte relié — un technicien se nommait chef d'équipe depuis SA
   fiche. On EXÉCUTE la vraie `saveTech`, dans un bac à sable qui compte les comptes. */
async function partieSaveTech() {
  console.log('\n── 786 · 5. ⛔⛔ la fiche n’est pas une porte dérobée vers les comptes ──');
  const st = bloc('async function saveTech(e,id){');
  vrai('population : saveTech est trouvée', st.length > 1500, st.length);
  if (!st) return;
  const essai = async (moi, caps, form, id) => {
    const users = [{ id: 'uA', prenom: 'Justin', nom: 'Roux', role: 'admin' },
      { id: 'uK', prenom: 'Karim', nom: 'Benali', role: 'technicien', techId: 'tK' },
      { id: 'uR', prenom: 'Rémi', nom: 'Chef', role: 'chefEquipe' }];
    const toasts = [];
    const ctx = { currentUser: users.find(u => u.id === moi), db: { users, techniciens: [{ id: 'tK', nom: 'Karim Benali', metier: 'Technicien' }] },
      can: k => caps.includes(k), permGarde: () => true, planPlaceLibre: () => true, proposerAbonnement: () => toasts.push('abonnement'),
      closeModal: () => {}, toast: m => toasts.push(m), save: () => {}, logEvent: () => {}, views: { techniciens: () => {} },
      uid: (() => { let n = 0; return () => 'id' + (++n); })(), nomNorm: x => String(x || '').toLowerCase().trim(),
      sha256: async () => 'h', mdpProvisoire: () => 'pw', userIdentifiantsModal: () => {}, setTimeout: f => f(),
      FormData: function (t) { return Object.entries(t); } };
    vm.createContext(ctx); vm.runInContext(st, ctx);
    await vm.runInContext('saveTech({preventDefault(){},target:' + JSON.stringify(form) + '},' + JSON.stringify(id || '') + ')', ctx);
    return { roleK: users.find(u => u.id === 'uK').role, metierK: ctx.db.techniciens[0].metier, comptes: users.length, fiches: ctx.db.techniciens.length, toasts };
  };
  const K1 = await essai('uK', [], { nom: 'Karim Benali', metier: "Chef d'équipe", tel: '06 00 00 00 00' }, 'tK');
  v('⛔⛔ Karim modifie SA fiche en « Chef d’équipe » : son compte reste technicien', K1.roleK, 'technicien');
  v('… et la fiche garde son rôle (le sélecteur est verrouillé, le formulaire n’est pas lu)', K1.metierK, 'Technicien');
  const K2 = await essai('uK', [], { nom: 'Nouveau Venu', metier: "Chef d'équipe" });
  v('⛔⛔ Karim ne crée ni fiche ni compte sans « Créer des utilisateurs »', [K2.comptes, K2.fiches], [3, 1]);
  vrai('… et le refus est dit, avec le même message que l’écran Utilisateurs', K2.toasts.some(t => /Créer des comptes demande le droit « Créer des utilisateurs »/.test(t)), K2.toasts);
  const A1 = await essai('uA', [], { nom: 'Karim Benali', metier: "Chef d'équipe" }, 'tK');
  v('contre-épreuve : l’administrateur, lui, change le rôle (fiche ET compte)', [A1.roleK, A1.metierK], ['chefEquipe', "Chef d'équipe"]);
  const R1 = await essai('uR', ['creerUtilisateurs'], { nom: 'Nouveau Venu', metier: 'Technicien' });
  v('contre-épreuve : un chef avec « Créer des utilisateurs » crée la fiche et son compte', [R1.comptes, R1.fiches], [4, 2]);
  vrai('le sélecteur de rôle est verrouillé à l’écran pour qui n’est pas administrateur (en modification)',
    /<select name="metier" \$\{id&&currentUser&&currentUser\.role!=='admin'\?'disabled title=/.test(SRC));
}

partieSaveTech().catch(e => { ko++; console.log('  ✗ partie saveTech morte : ' + (e && e.stack || e)); }).then(() => {
  console.log(`\n════ test-786 : ${ok} ✓ ${ko} ✗ ════\n`);
  process.exit(ko ? 1 : 0);
});
