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
/* ⛔ v737 : les trois règles lisent chacune SA case (« Voir les fiches de son équipe », « Corriger
   les pointages », « Régler les fiches du personnel »), dont le défaut se DÉDUIT d'autres cases.
   Le bac à sable reçoit donc les VRAIS userCap / can / capDeduitRegle — un faux `can` qui connaît
   « voirTout » ne connaissait pas les nouvelles cases, et le banc aurait gardé une copie. */
const NOMS = ['function capDeduitRegle(cap){', 'function userCap(u,cap){', 'function can(cap){', 'function equipeDe(u){', 'function perimetreTechIds(u){', 'function myTechId(){', 'function ptEstAMoi(p){',
  'function visiblePointages(list){', 'function ptPeutVoirAutres(){', 'function fichesGere(){', 'function ptPeutCorriger(p){', 'function visibleTechniciens(list){',
  /* v742 : la fiche crée un compte — prénom ET nom, jamais celui d'un autre technicien qui a son compte */
  'function compteHomonyme(prenom,nom,sauf){', 'function homonymeMessage(h,prenom,nom){'];
const CODE = NOMS.map(bloc);
v('les fonctions sont trouvées', NOMS.filter((n, i) => !CODE[i]), []);
for (const n of ['function ptPeutCorriger(', 'function visibleTechniciens(', 'function fichesGere(']) v('… une seule définition de ' + n.slice(9, -1), SRC.split(n).length - 1, 1);

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
].map(u => Object.assign(u, { acces: { caps: Object.fromEntries(u.caps.map(k => [k, true])) } }));
/* un réglage À PART pour une personne (ce que l'administrateur coche sur sa ligne) */
const avec = (moi, reglage) => USERS.map(x => (x.id === moi && reglage) ? { ...x, acces: { caps: { ...x.acces.caps, ...reglage } } } : x);
const PTS = [{ id: 'pK', techId: 'tK' }, { id: 'pS', techId: 'tS' }, { id: 'pJ', techId: 'tJ' }, { id: 'pC', userId: 'uC' }];
function monde(moi, reglage) {
  const users = avec(moi, reglage), u = users.find(x => x.id === moi) || null;
  const ctx = { currentUser: u, db: { users, techniciens: TECHS, pointages: PTS }, CAPS: { technicien: {} },
    fullName: x => ((x.prenom || '') + ' ' + (x.nom || '')).trim() };
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
/* v737 : la saisie à la main d'une ligne neuve demande la case « Corriger les pointages » */
vrai('⛔⛔ le formulaire refuse (une ligne cachée n’est pas une garde)', /function formPointage\(id\)\{[^\n]*\n  if\(id\?!ptPeutCorriger\(p\):!can\('corrigerPointages'\)\)\{ toast\('Corriger des heures demande le droit « Corriger les pointages » \(Utilisateurs\)'\); return; \}/.test(SRC));
vrai('⛔⛔ l’enregistrement refuse aussi', /function savePointage\(e,id\)\{ e\.preventDefault\(\);\n  if\(id\?!ptPeutCorriger\(db\.pointages\.find\(x=>x\.id===id\)\):!can\('corrigerPointages'\)\)\{ toast\(/.test(SRC));
vrai('⛔ v737 : le menu des techniciens d’une saisie à la main ne propose que son périmètre', /<select name="techId" required><option value="">—<\/option>\$\{ptTechsVisibles\(\)\.map\(/.test(SRC) && !/<select name="techId" required><option value="">—<\/option>\$\{db\.techniciens\.map\(/.test(SRC));
vrai('⛔ … et l’enregistrement le vérifie (on ne saisit pas les heures d’un technicien qui n’est pas le sien)', /if\(d\.techId && !ptTechsVisibles\(\)\.some\(t=>t\.id===d\.techId\)\)\{ toast\(/.test(SRC));
const del = bloc('function delItem(coll,id){');
vrai('⛔ la suppression d’un pointage suit la même règle, au point de passage de toutes les suppressions', /if\(coll==='pointages' && !ptPeutCorriger\(\(db\.pointages\|\|\[\]\)\.find\(x=>x\.id===id\)\)\)\{ toast\('Supprimer des heures est réservé aux responsables'\); return; \}/.test(del));

/* ── 786 · 3 bis. ⛔⛔ LA PORTE OUBLIÉE : SECTEURS ET LE FORMULAIRE D'UNE FICHE ──
   Trouvée par la relecture de la v735 : « Équipe », la fiche, la recherche et le journal passaient
   par le périmètre ; Secteurs listait TOUTE l'entreprise et chaque ligne ouvrait `formTech`, qui ne
   regardait que le droit de catégorie (OUI par défaut). Fermé par défaut, mais l'administrateur
   l'ouvre à une personne depuis Permissions. On EXÉCUTE les deux. */
console.log('\n── 786 · 3 bis. ⛔⛔ Secteurs et le formulaire d’une fiche ──');
const SECT = bloc('views.secteurs=function(){'), FT = bloc('function formTech(id){');
vrai('population : Secteurs et formTech sont trouvés', SECT.length > 900 && FT.length > 2500, [SECT.length, FT.length]);
function mondeEcran(moi, reglage) {
  const users = avec(moi, reglage), u = users.find(x => x.id === moi) || null, out = { html: '', modal: '', toasts: [] };
  const techs = [{ id: 'tK', nom: 'Karim Benali', departements: '44', tel: '06 12', droitConges: 25 }, { id: 'tS', nom: 'Sofia Perez', departements: '85', tel: '06 98' },
    { id: 'tL', nom: 'Léo Martin', departements: '', tel: '07 11' }, { id: 'tJ', nom: 'Jean Terrain', departements: '49', tel: '06 55' }];
  const ctx = { currentUser: u, db: { users, techniciens: techs, pointages: PTS, interventions: [{ clientId: 'c44' }, { clientId: 'c85' }, { clientId: 'c49' }] },
    CAPS: { technicien: {} }, fullName: x => ((x.prenom || '') + ' ' + (x.nom || '')).trim(), views: {},
    setHeader: () => {}, $: () => ({ set innerHTML(h) { out.html = h; } }), keyForClient: id => id.slice(1), parseTechDepts: s => String(s || '').split(',').map(x => x.trim()).filter(Boolean),
    techColor: () => '#123', initials: n => n[0], keyLabel: d => d, deptColor: () => '#456', encreSur: () => '#fff', esc: x => String(x == null ? '' : x),
    techForKey: dep => techs.find(t => t.departements === dep) || null, badge: (o, k) => '<b>' + o[k].l + '</b>', canCat: () => true,
    permGarde: () => true, toast: m => out.toasts.push(m), openModal: h => { out.modal = h; }, TECH_PALETTE: ['#0a0'] };
  vm.createContext(ctx); vm.runInContext(CODE.join('\n') + '\n' + SECT + '\n' + FT, ctx);
  ctx.out = out; return ctx;
}
if (SECT && FT && CODE.every(Boolean)) {
  const K = mondeEcran('uK'); K.views.secteurs();
  vrai('⛔⛔ Karim (Secteurs ouvert pour lui) n’y voit QUE sa ligne', /Karim Benali/.test(K.out.html) && !/Sofia Perez|Jean Terrain|Léo Martin/.test(K.out.html), K.out.html.slice(0, 300));
  vrai('⛔ … et un département couvert par une collègue dit « Couvert », sans son nom', /Couvert</.test(K.out.html) && !/Sofia/.test(K.out.html));
  vrai('… le sien, lui, porte son nom', /<b>Karim Benali<\/b>/.test(K.out.html));
  const A = mondeEcran('uA'); A.views.secteurs();
  vrai('contre-épreuve : l’administrateur voit les quatre, et qui couvre quoi', ['Karim Benali', 'Sofia Perez', 'Léo Martin', 'Jean Terrain'].every(n => A.out.html.includes(n)) && /<b>Sofia Perez<\/b>/.test(A.out.html));
  const L = mondeEcran('uL'); L.views.secteurs();
  vrai('⛔ le DR y voit Sofia et lui-même — pas Karim ni Jean', /Sofia Perez/.test(L.out.html) && /Léo Martin/.test(L.out.html) && !/Karim Benali|Jean Terrain/.test(L.out.html));
  const K2 = mondeEcran('uK'); K2.formTech('tS');
  vrai('⛔⛔ le formulaire de la fiche de Sofia ne s’ouvre pas pour Karim, même appelé directement', !K2.out.modal && K2.out.toasts.includes('Cette fiche ne te concerne pas'), K2.out);
  const K3 = mondeEcran('uK'); K3.formTech('tK');
  vrai('sa propre fiche s’ouvre', /name="tel"/.test(K3.out.modal));
  vrai('⛔ … congés, capacité, secteur et rattachement y sont verrouillés (réglés par un responsable)',
    ['departements', 'capH', 'droitConges'].every(n => new RegExp('name="' + n + '" disabled').test(K3.out.modal)) && /<select name="chef" disabled/.test(K3.out.modal), K3.out.modal.slice(0, 200));
  vrai('… et le rattachement n’énumère pas les collègues', !/Sofia Perez|Jean Terrain|Léo Martin/.test(K3.out.modal));
  vrai('… téléphone et e-mail restent à lui', /<input name="tel" value=/.test(K3.out.modal) && /<input type="email" name="email" value=/.test(K3.out.modal));
  const A2 = mondeEcran('uA'); A2.formTech('tK');
  vrai('contre-épreuve : l’administrateur règle tout', !/ disabled title="Réglé par ton responsable"/.test(A2.out.modal) && /Sofia Perez/.test(A2.out.modal));
  const L2 = mondeEcran('uL'); L2.formTech('tS');
  vrai('contre-épreuve : le DR règle la fiche de Sofia (son périmètre)', /name="tel"/.test(L2.out.modal) && !/ disabled title="Réglé par ton responsable"/.test(L2.out.modal));
}

/* ── 786 · 3 ter. ⛔⛔ v737 — LES TROIS RÈGLES SONT DES CASES ─────────────────────────────────
   Justin, 23 septembre 2026 : « technicien, DR… c'est juste des noms ; tout doit être sélectionné ».
   Le DÉFAUT (rien de coché à part) reste celui des sections 1 à 3 — c'est ce qu'elles jouent. Ici,
   on règle chaque case À PART, dans les deux sens, et on EXÉCUTE : elle doit l'emporter. */
console.log('\n── 786 · 3 ter. ⛔⛔ v737 : les trois règles sont des cases ──');
if (CODE.every(Boolean)) {
  v('⛔⛔ un DR à qui l’on retire « Voir les fiches de son équipe » ne voit plus que la sienne', monde('uL', { voirEquipe: false }).equipe(), ['tL']);
  v('⛔⛔ un technicien à qui on la donne voit l’entreprise (personne ne lui est rattaché)', monde('uK', { voirEquipe: true }).equipe(), ['tK', 'tS', 'tL', 'tJ']);
  v('⛔ la case « Voir les pointages » seule ouvre toujours l’équipe (le défaut suit sa base)', monde('uK', { voirPointages: true }).equipe(), ['tK', 'tS', 'tL', 'tJ']);
  v('⛔⛔ la responsable des feuilles de temps SANS « Corriger les pointages » : elle voit, elle ne réécrit pas', monde('uN', { corrigerPointages: false }).corrige('pK'), false);
  v('⛔⛔ un technicien à qui l’on confie « Corriger les pointages » corrige SES heures…', monde('uK', { corrigerPointages: true }).corrige('pK'), true);
  v('⛔⛔ … et PAS celles d’un collègue : corriger ne sort jamais de ce qu’il voit', monde('uK', { corrigerPointages: true }).corrige('pS'), false);
  v('⛔ un DR sans « Corriger les pointages » ne corrige pas même son périmètre', ['pK', 'pS', 'pJ'].map(monde('uL', { corrigerPointages: false }).corrige), [false, false, false]);
  v('contre-épreuve : l’administrateur n’a rien à cocher (une case retirée ne lui retire rien)', monde('uA', { corrigerPointages: false, voirEquipe: false }).corrige('pK'), true);
}
if (SECT && FT && CODE.every(Boolean)) {
  const K5 = mondeEcran('uK', { gererFiches: true }); K5.formTech('tK');
  vrai('⛔⛔ Karim avec « Régler les fiches du personnel » règle congés, capacité, secteur et rattachement de SA fiche',
    /name="tel"/.test(K5.out.modal) && !/ disabled title="Réglé par ton responsable"/.test(K5.out.modal), K5.out.modal.slice(0, 200));
  const L5 = mondeEcran('uL', { gererFiches: false }); L5.formTech('tS');
  vrai('⛔⛔ un DR SANS la case voit la fiche de Sofia, mais ces quatre champs y sont verrouillés',
    /name="tel"/.test(L5.out.modal) && ['departements', 'capH', 'droitConges'].every(n => new RegExp('name="' + n + '" disabled').test(L5.out.modal)), L5.out.modal.slice(0, 200));
}
vrai('⛔ les trois règles lisent LEUR case, et plus « Tout voir / Voir les pointages » en direct',
  /function fichesGere\(\)\{ return !!currentUser&&can\('gererFiches'\); \}/.test(SRC)
  && /function ptPeutCorriger\(p\)\{ return can\('corrigerPointages'\) && !!p && visiblePointages\(\[p\]\)\.length===1; \}/.test(SRC)
  && /function visibleTechniciens\(list\)\{\n  if\(can\('voirEquipe'\)\)\{/.test(SRC));

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
  const essai = async (moi, caps, form, id, courant) => {
    const users = [{ id: 'uA', prenom: 'Justin', nom: 'Roux', role: 'admin' },
      { id: 'uK', prenom: 'Karim', nom: 'Benali', role: 'technicien', techId: 'tK' },
      { id: 'uR', prenom: 'Rémi', nom: 'Chef', role: 'chefEquipe' },
      { id: 'uL', prenom: 'Léo', nom: 'Martin', role: 'dr', techId: 'tL' }];
    /* ce qu'on donne à la personne connectée, posé comme l'administrateur le poserait */
    { const cu = users.find(u => u.id === moi); if (cu) cu.acces = { caps: Object.fromEntries(caps.map(k => [k, true])) }; }
    const toasts = [];
    const redessins = [];
    const bornes = [];
    const ctx = { currentUser: users.find(u => u.id === moi), db: { users, techniciens: [{ id: 'tK', nom: 'Karim Benali', metier: 'Technicien', tel: '06 12', droitConges: 25, capMin: 420, departements: '44', chef: '' }, { id: 'tL', nom: 'Léo Martin', metier: 'Technicien', tel: '07 11' }] },
      /* les VRAIS userCap / can (dans CODE) : l'administrateur a tout, les autres leurs cases */
      CAPS: { technicien: {} }, permGarde: () => true, planPlaceLibre: () => true, proposerAbonnement: () => toasts.push('abonnement'),
      closeModal: () => {}, toast: m => toasts.push(m), save: () => {}, logEvent: () => {}, current: courant,
      views: { techniciens: () => redessins.push('techniciens'), secteurs: () => redessins.push('secteurs') }, pointages: [],
      fullName: x => ((x.prenom || '') + ' ' + (x.nom || '')).trim(),
      uid: (() => { let n = 0; return () => 'id' + (++n); })(), nomNorm: x => String(x || '').toLowerCase().trim(),
      sha256: async () => 'h', mdpProvisoire: () => 'pw', userIdentifiantsModal: () => {}, setTimeout: f => f(),
      /* v738 : saveTech borne le compte qu'elle crée (droitsBorner, exécuté pour de vrai par test-789) —
         ici un témoin qui NOTE l'appel : la règle est ailleurs, ce banc vérifie qu'elle est appelée */
      droitsBorner: (nu, par) => { bornes.push([nu.role, par && par.id]); return []; },
      FormData: function (t) { return Object.entries(t); } };
    ctx.db.pointages = [];
    vm.createContext(ctx); vm.runInContext(CODE.join('\n') + '\n' + st, ctx);
    await vm.runInContext('saveTech({preventDefault(){},target:' + JSON.stringify(form) + '},' + JSON.stringify(id || '') + ')', ctx);
    return { roleK: users.find(u => u.id === 'uK').role, roleL: users.find(u => u.id === 'uL').role, metierK: ctx.db.techniciens[0].metier, comptes: users.length, fiches: ctx.db.techniciens.length, toasts, bornes,
      K: JSON.parse(JSON.stringify(ctx.db.techniciens[0])), L: JSON.parse(JSON.stringify(ctx.db.techniciens[1])), redessins };
  };
  const K1 = await essai('uK', [], { nom: 'Karim Benali', metier: "Chef d'équipe", tel: '06 00 00 00 00' }, 'tK');
  v('⛔⛔ Karim modifie SA fiche en « Chef d’équipe » : son compte reste technicien', K1.roleK, 'technicien');
  v('… et la fiche garde son rôle (le sélecteur est verrouillé, le formulaire n’est pas lu)', K1.metierK, 'Technicien');
  const K2 = await essai('uK', [], { nom: 'Nouveau Venu', metier: "Chef d'équipe" });
  v('⛔⛔ Karim ne crée ni fiche ni compte sans « Créer des utilisateurs »', [K2.comptes, K2.fiches], [4, 2]);
  /* Le cas où le rôle du COMPTE diffère de la fiche : un DR dont la fiche dit « Technicien ». Sans la
     garde, modifier SA fiche (son téléphone, rien d'autre) le rétrogradait en technicien. C'est ce cas
     qui fait mordre la garde du rôle quand le sélecteur, lui, est déjà verrouillé. */
  const L1 = await essai('uL', ['voirTout'], { nom: 'Léo Martin', tel: '07 00 00 00 00' }, 'tL');
  v('⛔ un DR qui corrige son téléphone sur sa fiche reste DR', L1.roleL, 'dr');
  vrai('… et le refus est dit, avec le même message que l’écran Utilisateurs', K2.toasts.some(t => /Créer des comptes demande le droit « Créer des utilisateurs »/.test(t)), K2.toasts);
  const A1 = await essai('uA', [], { nom: 'Karim Benali', metier: "Chef d'équipe" }, 'tK');
  v('contre-épreuve : l’administrateur, lui, change le rôle (fiche ET compte)', [A1.roleK, A1.metierK], ['chefEquipe', "Chef d'équipe"]);
  const R1 = await essai('uR', ['creerUtilisateurs'], { nom: 'Nouveau Venu', metier: 'Technicien' });
  v('contre-épreuve : un chef avec « Créer des utilisateurs » crée la fiche et son compte', [R1.comptes, R1.fiches], [5, 3]);
  v('⛔ v738 : … et le compte créé passe par droitsBorner, avec le chef comme créateur', R1.bornes, [['technicien', 'uR']]);
  /* ⛔⛔ la porte oubliée, à l'enregistrement (une ligne cachée n'est pas une garde) */
  const K3 = await essai('uK', [], { nom: 'Léo Martin', tel: '06 66 66 66 66' }, 'tL');
  v('⛔⛔ Karim n’enregistre pas la fiche de Léo : son téléphone ne bouge pas', K3.L.tel, '07 11');
  vrai('… et le refus est dit', K3.toasts.includes('Cette fiche ne te concerne pas'), K3.toasts);
  /* ⛔ les champs de GESTION de SA fiche : un technicien ne s'accorde pas 60 jours de congés */
  const K4 = await essai('uK', [], { nom: 'Karim Benali', tel: '06 99 99 99 99', droitConges: '60', capH: '12', departements: '75', chef: 'tL' }, 'tK');
  v('⛔⛔ Karim change son téléphone, mais ni ses congés, ni sa capacité, ni son secteur, ni son rattachement',
    [K4.K.tel, K4.K.droitConges, K4.K.capMin, K4.K.departements, K4.K.chef], ['06 99 99 99 99', 25, 420, '44', '']);
  const A3 = await essai('uA', [], { nom: 'Karim Benali', tel: '06 12', droitConges: '30', capH: '8', departements: '44, 85', chef: 'tL' }, 'tK');
  v('contre-épreuve : l’administrateur les règle', [A3.K.droitConges, A3.K.capMin, A3.K.departements, A3.K.chef], [30, 480, '44, 85', 'tL']);
  const L3 = await essai('uL', ['voirTout'], { nom: 'Karim Benali', tel: '06 12', droitConges: '28' }, 'tK');
  v('contre-épreuve : un responsable (DR, « tout voir ») les règle aussi', L3.K.droitConges, 28);
  const A4 = await essai('uA', [], { nom: 'Léo Martin', tel: '07 22' }, 'tL', 'secteurs');
  v('enregistrer depuis Secteurs redessine Secteurs (et plus « Équipe » par-dessus)', A4.redessins, ['secteurs']);
  /* ⛔ v742 — Justin, 24 septembre 2026 : « l'obligation est d'avoir le prénom et le nom de famille pour
     différencier les deux personnes ». La fiche d'un technicien CRÉE un compte : elle suit la même règle. */
  const N1 = await essai('uA', [], { nom: 'Nouveau', metier: 'Technicien' });
  v('⛔⛔ un seul mot (« Nouveau ») : ni fiche ni compte, et on dit pourquoi', [N1.comptes, N1.fiches, N1.toasts.some(t => /prénom ET le nom/.test(t))], [4, 2, true]);
  const N2 = await essai('uA', [], { nom: 'karim  BENALI', metier: 'Technicien' });
  v('⛔⛔ le nom d’un autre technicien qui a son compte (casse et espaces confondus) : refusé, et le message dit comment distinguer', [N2.comptes, N2.fiches, N2.toasts.some(t => /est déjà le nom d’un autre compte \(@/.test(t) && /initiale ou un second prénom/.test(t))], [4, 2, true]);
  const N3 = await essai('uA', [], { nom: 'Rémi Chef', metier: 'Technicien' });
  v('contre-épreuve : le nom d’un compte SANS fiche technicien est la même personne — la fiche s’y relie, aucun compte de plus', [N3.comptes, N3.fiches], [4, 3]);
  const N4 = await essai('uA', [], { nom: 'Karim Benali-Roux', metier: 'Technicien' });
  v('contre-épreuve : un nom distinct crée la fiche et son compte', [N4.comptes, N4.fiches], [5, 3]);
  /* ⛔ v742 (relecture, rejoué sur la vraie fonction) : RENOMMER une fiche suivait la création… sauf qu'elle ne
     suivait rien — « Karim Benali » devenait « Léo Martin » à côté d'un vrai « Léo Martin », deux cartes
     indiscernables au planning, et la liste des utilisateurs (qui compare les COMPTES) ne disait rien. */
  const M1 = await essai('uA', [], { nom: 'Léo Martin', tel: '06 12' }, 'tK');
  v('⛔⛔ renommer la fiche de Karim en « Léo Martin » (une AUTRE fiche) : refusé, rien ne bouge, et on dit pourquoi',
    [M1.K.nom, M1.toasts.some(t => /Un autre technicien porte déjà ce nom/.test(t))], ['Karim Benali', true]);
  const M2 = await essai('uA', [], { nom: 'Karim', tel: '06 12' }, 'tK');
  v('⛔ … en un seul mot : refusé', [M2.K.nom, M2.toasts.some(t => /prénom ET le nom/.test(t))], ['Karim Benali', true]);
  const M3 = await essai('uA', [], { nom: 'Rémi Chef', tel: '06 12' }, 'tK');
  v('⛔⛔ … au nom d’un AUTRE compte (Rémi, sans fiche) : refusé, avec le message des homonymes',
    [M3.K.nom, M3.toasts.some(t => /« Rémi Chef » est déjà le nom d’un autre compte/.test(t))], ['Karim Benali', true]);
  const M4 = await essai('uA', [], { nom: 'Karim A. Benali', tel: '06 12' }, 'tK');
  v('contre-épreuve : un nom qui distingue passe', M4.K.nom, 'Karim A. Benali');
  const M5 = await essai('uA', [], { nom: 'karim benali', tel: '06 34' }, 'tK');
  v('contre-épreuve : SON propre nom (casse changée) n’est pas un doublon — le téléphone s’enregistre', [M5.K.nom, M5.K.tel], ['karim benali', '06 34']);
  vrai('le sélecteur de rôle est verrouillé à l’écran pour qui n’est pas administrateur (en modification)',
    /<select name="metier" \$\{id&&currentUser&&currentUser\.role!=='admin'\?'disabled title=/.test(SRC));
}

partieSaveTech().catch(e => { ko++; console.log('  ✗ partie saveTech morte : ' + (e && e.stack || e)); }).then(() => {
  console.log(`\n════ test-786 : ${ok} ✓ ${ko} ✗ ════\n`);
  process.exit(ko ? 1 : 0);
});
