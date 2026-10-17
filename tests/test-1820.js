/* ══ 1820 · UN COMPTE DÉSACTIVÉ N'EST PLUS PROPOSÉ LÀ OÙ L'ON AFFECTE ═════════════════════════════════
   Justin, 17 octobre 2026 (campagne de test, admin#6 : « un technicien dont le compte est désactivé reste
   proposé dans le planning et le formulaire d'intervention — on le retire des listes d'affectation ? »
   → « Oui, le retirer »). Ses interventions passées et déjà planifiées restent visibles et signalées
   (« compte désactivé ») ; on peut les réaffecter ; réactiver le compte le rend de nouveau assignable ; un
   technicien sans compte lié reste assignable.

   ⛔ L'inactivité se DÉDUIT du compte lié (`users[].techId`, `actif===false`) : aucun champ de plus sur
   `db.techniciens` (rien ne s'écrit au seul chargement). UNE fonction décide, `techAssignable`.

   Ce banc EXÉCUTE les vraies fonctions d'`app.html` (extraites du fichier, dans un bac à sable) :
     · la règle et ses dérivées (techsAffectables, techsAffichees, techNomAff, techPeutRecevoir) ;
     · les portes qui AFFECTENT et qui se jouent sans écran : le dépôt sur une colonne (planDepotAvant), la
       création sur une case vide (planMultiVide, planWeekVide), l'activité déplacée (actDeplace), le
       changement de personne du menu (planChangerTech), la proposition de passage suivant
       (planNextCompute), la copie d'une intervention (_copieInt), l'affectation automatique par département
       (techForKey / techForClient) ;
     · le signe « compte désactivé » (techPuces).
   Les portes dont le geste est un formulaire (sélecteurs) sont RECENSÉES dans le texte du code réel : aucune
   liste d'`<option>` ni de pastilles de saisie ne se construit sur `db.techniciens` brut — sauf les listes de
   CONSULTATION, nommées une à une. La preuve au doigt vit dans une sonde navigateur du scratchpad
   (scratchpad/decisions-c2/d-technicien-inactif/sonde.js).                                              */
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
const compte = n => SRC.split(n).length - 1;

console.log('\n── 1820 · 0. la population ──');
const FN = {
  techAssignable: bloc('function techAssignable(t){'), techCompteDesactive: ligne('function techCompteDesactive(id){'),
  techsAffectables: bloc('function techsAffectables(garder){'), optTechs: ligne('function optTechs(sel){'),
  techNomAff: ligne('function techNomAff(t){'), techPeutRecevoir: ligne('function techPeutRecevoir(techId,i){'),
  techRefusDesactive: ligne('function techRefusDesactive(techId){'), planAffecteGate: ligne('function planAffecteGate(techId,i){'),
  techsAffichees: bloc('function techsAffichees(jours){'), intTechIds: ligne('function intTechIds(i){'),
  techName: ligne('const techName = id =>'), LBL: ligne('const TECH_INACTIF_LBL='), esc: ligne('const esc = s =>'),
  planDepotAvant: bloc('function planDepotAvant(e,i,iso,techId,m,patchDup){'), planMultiVide: bloc('function planMultiVide(e,iso,techId,h0,PPH){'),
  planWeekVide: bloc('function planWeekVide(e,iso,techId,h0,PPH){'), actDeplace: bloc('function actDeplace(id,date,techId,mins){'),
  planChangerTech: bloc('function planChangerTech(id,tid){'), planNextCompute: bloc('function planNextCompute(i){'),
  planPrefOf: ligne('function planPrefOf(clientId){'), copieInt: bloc('function _copieInt(i,extra){'),
  techForKey: ligne('function techForKey(key,affectable){'), techForClient: ligne('function techForClient(clientId){'),
  intTechsAff: ligne('function intTechsAff(i){'), techConnu: ligne('function techConnu(id){'), techPastille: bloc('function techPastille(id,taille){'),
  techPuces: bloc('function techPuces(i,opts){'), techPile: bloc('function techPile(i,max){'), shiftDay: ligne('function shiftDay(iso,n){'),
  PLAN_FREQ: ligne('const PLAN_FREQ='), pgPersSet: bloc('function pgPersSet(){'), pgPersCompte: bloc('function pgPersCompte(jours){'), planTechsAff: ligne('function planTechsAff(){'), planGroups: bloc('function planGroups(){'),
};
v('toutes les fonctions sont trouvées dans app.html', Object.keys(FN).filter(k => !FN[k]), []);
v('⛔ une seule définition de chaque (une seconde gagnerait partout, en silence)',
  ['function techAssignable(', 'function techsAffectables(', 'function techsAffichees(', 'function techPeutRecevoir(', 'function planAffecteGate(', 'function techNomAff(', 'function techCompteDesactive('].map(compte), [1, 1, 1, 1, 1, 1, 1]);

if (ko) { console.log('\n════ test-1820 : ' + ok + ' ✓ ' + ko + ' ✗ ════  (la règle n’existe pas : rien à jouer)'); process.exit(1); }

/* ── le bac à sable ── */
function monde(db, extra) {
  const ctx = Object.assign({ console, JSON, Math, Date, Set, Map, Object, Array, String, Number, db, __t: [], __save: 0, __dup: 0, __modal: 0, __form: [] }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(`
    function toast(m){ __t.push(String(m)); } function toastAnnuler(m){ __t.push(String(m)); } function save(){ __save++; } var window={};
    function initials(n){ return String(n||'').split(' ').map(x=>x[0]||'').join('').toUpperCase(); }
    function encreSur(){ return '#fff'; } function techColor(){ return '#123456'; }
    function canPlan(){ return true; } function canCat(){ return true; }
    function absentOn(){ return null; } function indispoAt(){ return null; } function intConflictOf(){ return null; }
    function planAbsGate(){ return true; } function planSnap(){ return {}; } function planDup(i,p){ __dup++; }
    function intHisto(){} function planStamp(){} function planObligationLever(){} function planDepotApres(){}
    function planTechsOf(i){ return intTechIds(i); } function toMinH(){ return null; } function fmtShort(x){ return String(x); }
    function planEquipeApres(i,vers){ return vers?[vers]:[]; }
    function planPoserEquipe(i,vers){ const t=planEquipeApres(i,vers); i.techIds=t; i.techId=t[0]||''; return t; }
    function planDeplacerModal(){} function confirm(){ return true; } function planSel_(){}
    var views={planning(){ __modal++; }}; var current='planning'; var planSel='2026-10-20';
    function actAll(){ return db.activites||[]; } function actTitre(){ return 'garage'; } function clockFromMin(m){ return String(m); }
    function formIntervention(id,p){ __form.push(p); }
    function keyForClient(){ return '75'; } function depDeKey(k){ return String(k).slice(0,2); } function parseTechDepts(s){ return String(s||'').split(',').map(x=>x.trim()).filter(Boolean); }
    var pgPers=null; var localStorage={getItem(){ return null; }, setItem(){} };
    var __u=0; function uid(){ return 'u'+(++__u); } function intNum(){ return 'N'+(++__u); }
    function planTechMSet(){ return new Set(db.techniciens.map(t=>t.id).concat([''])); } function can(){ return true; } function myTechId(){ return null; }
    function planPlageHoraire(){} function planJoursCarte(){ return ['2026-10-20']; }
    function todayISO(){ return '2026-10-17'; } function toMin(h){ if(!h) return 0; const [a,b]=(h||'0:0').split(':'); return (+a)*60+(+b||0); }
    ${FN.esc.replace('const ', 'var ')}
    ${FN.LBL.replace('const ', 'var ')}
    ${FN.techName.replace('const ', 'var ')}
    ${FN.PLAN_FREQ.replace('const ', 'var ')}
    ${[FN.techAssignable, FN.techCompteDesactive, FN.techsAffectables, FN.optTechs, FN.techNomAff, FN.techPeutRecevoir, FN.techRefusDesactive, FN.planAffecteGate,
      FN.techsAffichees, FN.intTechIds, FN.planDepotAvant, FN.planMultiVide, FN.planWeekVide, FN.actDeplace, FN.planChangerTech, FN.planNextCompute, FN.planPrefOf,
      FN.copieInt, FN.techForKey, FN.techForClient, FN.intTechsAff, FN.techConnu, FN.techPastille, FN.techPuces, FN.techPile, FN.shiftDay, FN.planTechsAff, FN.planGroups, FN.pgPersSet, FN.pgPersCompte].join('\n')}
  `, ctx);
  return ctx;
}
const J = '2026-10-20', hier = '2026-10-10';
const base = () => ({
  techniciens: [{ id: 'tA', nom: 'Alice Actif', departements: '75' }, { id: 'tO', nom: 'Omar Off', departements: '75' }, { id: 'tS', nom: 'Sans Compte' }, { id: 'tD', nom: 'Deux Comptes' }],
  users: [{ id: 'uA', techId: 'tA', actif: true }, { id: 'uO', techId: 'tO', actif: false }, { id: 'uD1', techId: 'tD', actif: false }, { id: 'uD2', techId: 'tD', actif: true }, { id: 'uAd', role: 'admin', actif: true }],
  interventions: [
    { id: 'i1', titre: 'Demain chez Omar', date: J, heure: '09:00', statut: 'planifiee', techId: 'tO', techIds: ['tO'] },
    { id: 'i2', titre: 'Passée chez Omar', date: hier, heure: '09:00', statut: 'terminee', techId: 'tO', techIds: ['tO'] },
    { id: 'i3', titre: 'Autre jour', date: '2026-11-30', heure: '09:00', statut: 'planifiee', techId: 'tO', techIds: ['tO'] },
    { id: 'i4', titre: 'Chez Alice', date: J, heure: '10:00', statut: 'planifiee', techId: 'tA', techIds: ['tA'] }],
  activites: [{ id: 'a1', techId: 'tA', date: J }], clients: []
});

console.log('\n── 1. la règle : déduite du compte lié, jamais un champ de plus ──');
{
  const db = base(), avant = JSON.stringify(db.techniciens), W = monde(db);
  const A = id => vm.runInContext(`techAssignable(${JSON.stringify(id)})`, W);
  v('compte actif → assignable', A('tA'), true);
  v('compte DÉSACTIVÉ → pas assignable', A('tO'), false);
  v('technicien SANS compte lié → assignable, comme avant', A('tS'), true);
  v('deux comptes liés dont un actif → assignable', A('tD'), true);
  v('« Non assigné » (id vide) → toujours assignable', A(''), true);
  v('la fiche passée en objet donne le même verdict', vm.runInContext(`techAssignable(db.techniciens[1])`, W), false);
  v('techCompteDesactive : vrai pour la fiche au compte désactivé seulement', ['tO', 'tA', 'tS', 'tD', '', 'inconnu'].map(id => vm.runInContext(`techCompteDesactive(${JSON.stringify(id)})`, W)), [true, false, false, false, false, false]);
  db.users.find(u => u.id === 'uO').actif = true;
  v('RÉACTIVER le compte le rend de nouveau assignable', A('tO'), true);
  db.users.find(u => u.id === 'uO').actif = false;
  v('⛔ aucun champ n’a été écrit sur les fiches techniciens', JSON.stringify(db.techniciens), avant);
  db.users.find(u => u.id === 'uO').actif = undefined;
  v('un ancien compte sans champ `actif` reste assignable (seul `false` retire)', A('tO'), true);
}

console.log('\n── 2. les listes d’affectation ──');
{
  const db = base(), W = monde(db);
  const ids = x => vm.runInContext(x, W).map(t => t.id);
  v('techsAffectables() : le désactivé en est RETIRÉ', ids('techsAffectables()'), ['tA', 'tS', 'tD']);
  v('techsAffectables([déjà porté]) : ce que l’enregistrement porte déjà RESTE', ids("techsAffectables(['tO'])"), ['tA', 'tO', 'tS', 'tD']);
  v('techsAffectables(id) accepte une valeur vide sans rien ajouter', ids("techsAffectables([''])"), ['tA', 'tS', 'tD']);
  const html = vm.runInContext("optTechs('tO')", W);
  vrai('optTechs : le désactivé porté est sélectionné ET signalé', /value="tO" selected>Omar Off \(compte désactivé\)</.test(html), html);
  vrai('optTechs : sans sélection, le désactivé n’est pas offert', !/tO/.test(vm.runInContext("optTechs('tA')", W)));
  v('techNomAff : signale seulement le compte désactivé', ['tO', 'tA', 'tS'].map(id => vm.runInContext(`techNomAff(db.techniciens.find(t=>t.id==='${id}'))`, W)), ['Omar Off (compte désactivé)', 'Alice Actif', 'Sans Compte']);
  v('techPeutRecevoir : refusé au désactivé, accepté à celui qu’il porte déjà, accepté au vide',
    [vm.runInContext("techPeutRecevoir('tO',db.interventions[3])", W), vm.runInContext("techPeutRecevoir('tO',db.interventions[0])", W), vm.runInContext("techPeutRecevoir('',db.interventions[3])", W), vm.runInContext("techPeutRecevoir('tA',db.interventions[0])", W)], [false, true, true, true]);

  console.log('   lignes du planning (consultation de ce qui est à réaffecter)');
  const aff = j => vm.runInContext(`techsAffichees(${JSON.stringify(j)})`, W).map(t => t.nom);
  v('le jour où il porte une intervention : sa ligne reste, signalée', aff([J]), ['Alice Actif', 'Omar Off (compte désactivé)', 'Sans Compte', 'Deux Comptes']);
  v('un jour où il ne porte rien : sa ligne disparaît', aff(['2026-10-21']), ['Alice Actif', 'Sans Compte', 'Deux Comptes']);
  v('sa journée PASSÉE reste visible (historique) : sa ligne reparaît ce jour-là', aff([hier]), ['Alice Actif', 'Omar Off (compte désactivé)', 'Sans Compte', 'Deux Comptes']);
  v('sans jours montrés : rien de désactivé', aff([]), ['Alice Actif', 'Sans Compte', 'Deux Comptes']);
  db.interventions[0].statut = 'annulee';
  v('une intervention ANNULÉE ne lui garde pas sa ligne', aff([J]), ['Alice Actif', 'Sans Compte', 'Deux Comptes']);
  db.interventions[0].statut = 'planifiee';
  const g = vm.runInContext('planGroups().map(x=>x.nom)', Object.assign(W, {}));
  vrai('planGroups (lignes des vues Semaine et Jour) lit la même règle', JSON.stringify(g) === JSON.stringify(['Alice Actif', 'Omar Off (compte désactivé)', 'Sans Compte', 'Deux Comptes', 'Non assigné']), g);
}

console.log('\n── 2 bis. le compteur « Équipe n / N » du Planning général (relecture du 17 octobre 2026) ──');
{
  /* Planning général : le bouton « Équipe » comptait le désactivé MASQUÉ au numérateur (pgPersSet garde son id)
     mais plus au dénominateur : « 4 / 3 » à l'ouverture, puis « 3 / 3 » (bouton éteint) alors qu'une personne
     venait d'être décochée. Les deux nombres se comptent sur ce qui est à l'écran. */
  const cpt = (j, avant) => { const W = monde(base()); if (avant) vm.runInContext(avant, W); return vm.runInContext(`pgPersCompte(${JSON.stringify(j)})`, W); };
  const c1 = cpt(['2026-10-21']);
  vrai('population : le désactivé est bien masqué ce jour-là (sinon le contrôle est creux)',
    vm.runInContext(`techsAffichees(['2026-10-21']).map(t=>t.id)`, monde(base())).indexOf('tO') < 0);
  v('désactivé masqué, tout le monde coché : le compteur est égal au total (jamais « 4 / 3 »)', c1, { n: 4, tot: 4 });
  vrai('n ne dépasse jamais le total', c1.n <= c1.tot, c1);
  const c2 = cpt(['2026-10-21'], "pgPersSet().delete('tA')");
  v('une personne décochée : n passe sous le total (le bouton se marque actif)', c2, { n: 3, tot: 4 });
  vrai('… et c’est bien « n < total » que le bouton teste', c2.n < c2.tot);
  v('le désactivé qui porte une intervention ce jour-là est compté des deux côtés', cpt([J]), { n: 5, tot: 5 });
  v('… décoché, il fait baisser n', cpt([J], "pgPersSet().delete('tO')"), { n: 4, tot: 5 });
  const L = ligne('  const cptPers=pgPersCompte(jours)');
  vrai('views.planningGeneral lit le compteur par la fonction (une seule définition du compte)',
    L.length > 30 && /nPers=cptPers\.n/.test(L) && /totPers=cptPers\.tot/.test(L), L);
  vrai('⛔ plus de compteur bâti sur deux populations (pgPersSet().size contre techsAffichees)', compte('pgPersSet().size') === 0, compte('pgPersSet().size'));
}

console.log('\n── 3. les gestes qui AFFECTENT, joués ──');
{
  const mk = () => { const db = base(); return { db, W: monde(db) }; };
  const ev = { altKey: false }, evAlt = { altKey: true };
  // dépôt sur une colonne (Multi, Semaine, Jour, case)
  { const { db, W } = mk(); const i = db.interventions[3];
    const r = vm.runInContext(`planDepotAvant(${JSON.stringify(ev)}, db.interventions[3], '${J}', 'tO', null, {})`, W);
    vrai('dépôt sur la colonne du compte désactivé : REFUSÉ (rend null)', r === null, r);
    vrai('… et le dit', W.__t.some(m => /compte désactivé/.test(m)), W.__t);
    const r2 = vm.runInContext(`planDepotAvant(${JSON.stringify(evAlt)}, db.interventions[3], '${J}', 'tO', null, {})`, W);
    vrai('Alt + dépôt (duplication) sur le compte désactivé : refusé aussi, rien n’est dupliqué', r2 === null && W.__dup === 0, [r2, W.__dup]);
    const r3 = vm.runInContext(`planDepotAvant(${JSON.stringify(ev)}, db.interventions[3], '${J}', 'tS', null, {})`, W);
    vrai('dépôt sur une personne sans compte : accepté (comme avant)', r3 !== null, r3);
    const r4 = vm.runInContext(`planDepotAvant(${JSON.stringify(ev)}, db.interventions[0], '${J}', 'tO', null, {})`, W);
    vrai('déplacer l’intervention qu’il PORTE déjà, sur sa propre colonne : accepté (pas une réaffectation)', r4 !== null, r4);
    void i; }
  // création sur une case vide
  { const { W } = mk(); const e = { currentTarget: { getBoundingClientRect: () => ({ top: 0 }) }, clientY: 40, target: null }; e.target = e.currentTarget;
    W.e0 = { currentTarget: { getBoundingClientRect: () => ({ top: 0 }) }, clientY: 40 };
    vm.runInContext(`planMultiVide(e0, '${J}', 'tO', 7, 46)`, W);
    vrai('case vide de la colonne désactivée (Multi) : aucune création proposée', W.__form.length === 0 && W.__t.some(m => /compte désactivé/.test(m)), [W.__form, W.__t]);
    W.__t.length = 0;
    W.e = { currentTarget: { getBoundingClientRect: () => ({ top: 0 }) }, clientY: 40 }; W.e.target = W.e.currentTarget;
    vm.runInContext(`planWeekVide(e, '${J}', 'tO', 7, 46)`, W);
    vrai('case vide de la colonne désactivée (Semaine) : aucune création proposée', W.__form.length === 0 && W.__t.some(m => /compte désactivé/.test(m)), [W.__form, W.__t]);
    W.__t.length = 0;
    W.e2 = { currentTarget: { getBoundingClientRect: () => ({ top: 0 }) }, clientY: 40 };
    vm.runInContext(`planMultiVide(e2, '${J}', 'tA', 7, 46)`, W);
    vrai('case vide d’une personne active : la création s’ouvre, personne et heure emportées', W.__form.length === 1 && W.__form[0].techId === 'tA', W.__form);
    vm.runInContext(`planWeekVide(e, '${J}', 'tS', 7, 46)`, W);
    vrai('case vide d’une personne sans compte : la création s’ouvre', W.__form.length === 2 && W.__form[1].techId === 'tS', W.__form); }
  // activité déplacée
  { const { db, W } = mk();
    vm.runInContext(`actDeplace('a1','${J}','tO',480)`, W);
    vrai('activité glissée sur le compte désactivé : refusée, restée chez Alice', db.activites[0].techId === 'tA', db.activites[0]);
    vm.runInContext(`actDeplace('a1','${J}','tS',480)`, W);
    vrai('activité glissée sur une personne sans compte : acceptée', db.activites[0].techId === 'tS', db.activites[0]);
    db.activites[0].techId = 'tO';
    vm.runInContext(`actDeplace('a1','2026-10-21','tO',480)`, W);
    vrai('une activité DÉJÀ chez le désactivé peut changer d’heure sans être réaffectée', db.activites[0].date === '2026-10-21', db.activites[0]); }
  // menu « Changer de personne »
  { const { db, W } = mk();
    vm.runInContext(`planChangerTech('i4','tO')`, W);
    vrai('« Changer de personne » vers le compte désactivé : refusé, l’intervention reste chez Alice', db.interventions[3].techId === 'tA' && W.__t.some(m => /compte désactivé/.test(m)), [db.interventions[3], W.__t]);
    vm.runInContext(`planChangerTech('i1','tA')`, W);
    vrai('RÉAFFECTER l’intervention de demain au technicien actif : accepté', db.interventions[0].techId === 'tA' && JSON.stringify(db.interventions[0].techIds) === '["tA"]', db.interventions[0]);
    vm.runInContext(`planChangerTech('i1','tO')`, W);
    vrai('… et la RÉAFFECTER au désactivé n’est plus possible', db.interventions[0].techId === 'tA', db.interventions[0]); }
  // propositions de passage
  { const { db, W } = mk();
    db.interventions[0].recurrence = 'hebdo';
    const p = vm.runInContext('planNextCompute(db.interventions[0])', W);
    vrai('« Passage suivant » : jamais proposé au compte désactivé — il part « Non assigné »', p && p.techId === '', p);
    db.clients.push({ id: 'c1', prefPassage: { techId: 'tO' } }); db.interventions[0].clientId = 'c1';
    const p2 = vm.runInContext('planNextCompute(db.interventions[0])', W);
    vrai('… même quand la préférence du client le nomme', p2 && p2.techId === '', p2);
    const p3 = vm.runInContext('planNextCompute(db.interventions[3])', W);
    vrai('… et une intervention d’un technicien actif garde son technicien', p3 && p3.techId === 'tA', p3); }
  // copie
  { const { db, W } = mk();
    db.interventions[0].techIds = ['tO', 'tA']; db.interventions[0].techId = 'tO';
    const c = vm.runInContext('_copieInt(db.interventions[0],{})', W);
    v('une COPIE (passage suivant, duplication) ne reprend pas le compte désactivé', [c.techId, c.techIds], ['tA', ['tA']]);
    const c2 = vm.runInContext('_copieInt(db.interventions[1],{})', W);
    v('copie d’une intervention portée par le seul désactivé : sans technicien', [c2.techId, c2.techIds], ['', []]);
    const c3 = vm.runInContext('_copieInt(db.interventions[3],{})', W);
    v('copie d’une intervention d’un technicien actif : inchangée', [c3.techId, c3.techIds], ['tA', ['tA']]); }
  // affectation automatique par département
  { const { W } = mk();
    v('techForKey sans option (cartes de couverture, consultation) : retrouve la première fiche du département', vm.runInContext("techForKey('75').id", W), 'tA');
    W.db.techniciens.reverse(); vm.runInContext('db.techniciens=db.techniciens', W);
    v('la carte voit toujours le désactivé s’il est en tête', vm.runInContext("techForKey('75').id", W), 'tO');
    v('⛔ l’affectation AUTOMATIQUE (techForClient) saute le compte désactivé', vm.runInContext("techForClient('c1').id", W), 'tA');
    W.db.users.find(u => u.id === 'uA').actif = false;
    v('département couvert par personne d’affectable : aucune affectation automatique', vm.runInContext("techForClient('c1')", W) || null, null); }
}

console.log('\n── 4. le signe « compte désactivé » sur ce qu’il porte ──');
{
  const db = base(), W = monde(db);
  const puces = vm.runInContext('techPuces(db.interventions[0])', W), puces2 = vm.runInContext('techPuces(db.interventions[3])', W);
  vrai('l’intervention de demain chez le désactivé : « compte désactivé » à côté de son nom', /Omar Off[^<]*<span class="tpu-off"[^>]*>· compte désactivé/.test(puces), puces);
  vrai('… et elle reste VISIBLE (nom + pastille, pas masquée)', /tpu-p/.test(puces) && /Omar Off/.test(puces), puces);
  vrai('sa journée passée porte le signe aussi', /compte désactivé/.test(vm.runInContext('techPuces(db.interventions[1])', W)));
  vrai('une intervention d’un technicien actif ne porte aucun signe', !/compte désactivé/.test(puces2), puces2);
  vrai('techPile : le nom accessible le dit', /Omar Off \(compte désactivé\)/.test(vm.runInContext('techPile(db.interventions[0])', W)));
  db.users.find(u => u.id === 'uO').actif = true;
  vrai('compte RÉACTIVÉ : le signe s’efface', !/compte désactivé/.test(vm.runInContext('techPuces(db.interventions[0])', W)));
}

console.log('\n── 5. les portes à formulaire : recensées dans le code réel ──');
{
  // chaque porte, par un morceau de CODE qui la porte (jamais une phrase de commentaire — les commentaires sont retirés)
  const PORTES = [
    ['formulaire d’intervention (pastilles Technicien(s))', '<span class="frow-lbl" style="padding-top:4px">Technicien(s)</span>', 'techsAffectables(intTechIds(i))'],
    ['activité : sélecteur Technicien (act-tech)', 'id="act-tech"', 'techsAffectables([t])'],
    ['indisponibilité : sélecteur Technicien (ind-tech)', 'id="ind-tech"', 'techsAffectables()'],
    ['passage suivant : choix manuel (pn-tech)', 'id="pn-tech"', 'techsAffectables()'],
    ['tâche : Assignée à', 'name="techId"><option value="">—</option>', 'optTechs(t.techId)'],
    ['absence : Personne', 'name="techId" required>', 'optTechs(a?a.techId:myTid)'],
    ['client : technicien habituel (pp_techId)', 'name="pp_techId"', 'techsAffectables([pp.techId])'],
    ['enveloppe : technicien (création)', 'name="technicienId"><option value="">—</option>${techsAffectables()', 'techsAffectables()'],
    ['enveloppe : technicien (fiche)', 'name="technicienId"><option value="">—</option>${techsAffectables([e.technicienId])', 'techsAffectables([e.technicienId])'],
    ['véhicule : technicien', 'const techOpt=sel=>', 'techsAffectables([sel])'],
    ['box : techniciens autorisés', 'function renderBoxTechs()', 'techsAffectables([...boxTechSel])'],
    ['fiche technicien : Rattaché à', 'name="chef"', 'techsAffectables([t.chef])'],
    ['menu « Changer de personne »', 'function planCtxItemsTech(id,x,y)', 'techsAffectables(planTechsOf(i))'],
    ['fenêtre « Déplacer l’intervention »', 'function planDeplacerRender()', 'techsAffectables(planTechsOf(i))'],
  ];
  for (const [nom, ancre, attendu] of PORTES) {
    const i = SRC.indexOf(ancre);
    const tranche = i < 0 ? '' : SRC.slice(i, i + 1400);
    vrai('porte « ' + nom + ' » : ancre trouvée', i >= 0, ancre);
    vrai('porte « ' + nom + ' » : lit la règle (' + attendu + ')', tranche.indexOf(attendu) >= 0, tranche.slice(0, 160));
  }
  // les garde-fous des gestes (ordre : AVANT toute écriture)
  const G = (nom, corps, motif) => vrai('geste « ' + nom + ' » : porte le refus du compte désactivé', new RegExp(motif).test(corps), motif);
  G('dépôt sur une colonne (planDepotAvant)', bloc('function planDepotAvant('), 'planAffecteGate\\(techId,e\\.altKey\\?null:i\\)');
  G('dépôt sur une ligne (planDropTech)', bloc('function planDropTech('), 'planAffecteGate\\(techId,i\\)');
  G('fenêtre Déplacer (planDeplacerValider)', bloc('function planDeplacerValider('), 'planAffecteGate\\(DEP\\.tech,i\\)');
  G('menu Changer de personne (planChangerTech)', bloc('function planChangerTech('), 'planAffecteGate\\(tid,i\\)');
  G('passage suivant, choix manuel (planNextCreate)', bloc('function planNextCreate('), 'techPeutRecevoir\\(t,null\\)');
  // aucune liste d'affectation sur db.techniciens BRUT : les <option> et les pastilles de saisie passent par la règle
  const lignes = SRC.split('\n');
  const brutes = lignes.map((l, k) => [k + 1, l]).filter(([, l]) => /db\.techniciens/.test(l) && /<option|class="chip int-tech|techOpt/.test(l) && !/techsAffectables|optTechs/.test(l));
  const CONSULTATION = [
    ['filtre de la liste des interventions (chips)', /intTechF/],
    ['filtre carte / planning (consultation)', /carteTech|pgPers/],
    ['liste des utilisateurs (lien fiche)', /techId.*users|users.*techId/],
  ];
  const inattendues = brutes.filter(([, l]) => !CONSULTATION.some(([, re]) => re.test(l)));
  v('⛔ aucun sélecteur d’affectation ne se construit sur db.techniciens brut', inattendues.map(([k, l]) => k + ': ' + l.trim().slice(0, 110)), []);
  vrai('(le recensement a regardé quelque chose : les listes de consultation nommées existent)', compte('intTechF') > 3);
}

console.log('\n── 6. la consultation ne change pas : l’historique retrouve la personne ──');
{
  vrai('techName / techNames n’appellent pas la règle d’affectation (on retrouve toujours le nom)',
    bloc('function techNames(i){').length > 40 && !/techAssignable|techCompteDesactive/.test(bloc('function techNames(i){') + ligne('const techName = id =>')));
  vrai('les filtres de recherche (chips de la liste des interventions) ne l’appellent pas',
    ligne('<div class="filters" style="margin-top:6px"><div class="chip ${!intTechF').length > 50 && !/techAssignable|techsAffectables/.test(ligne('<div class="filters" style="margin-top:6px"><div class="chip ${!intTechF')));
  const db = base(), W = monde(db);
  v('le nom du désactivé se lit toujours (historique, rapports, statistiques)', vm.runInContext("techName('tO')", W), 'Omar Off');
}

console.log('\n════ test-1820 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
