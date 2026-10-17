/* ══ g14 · technicien#4 et #5 — LE RETOUR SYSTÈME ET « FERMER » NE PERDENT RIEN EN SILENCE ═══════════════
   technicien#4 — Android/iPhone : depuis une fiche d'intervention, le retour système sautait la liste (la fiche n'est pas une
     vue, goBack() dépilait la rubrique d'AVANT) ; depuis la Clôture guidée, la fenêtre se fermait ET la rubrique était quittée,
     saisie perdue.
   technicien#5 — « Fermer » de la Clôture guidée vidait observations, matériel, niveau, signatures sans un mot (seuls les produits
     s'enregistrent au fil de l'eau).
   Règle : une fenêtre ouverte absorbe le retour (la Clôture guidée demande avant de perdre une saisie) ; sinon une fiche ouverte
   revient à la liste de sa rubrique ; sinon le retour est celui d'avant. UNE fonction ferme la Clôture guidée (assistFermer) :
   le bouton « Fermer » ET le retour système. Rien n'est écrit dans db. « Un geste, une navigation » : l'entrée d'historique que
   le navigateur consomme est REMISE.
   Ce banc EXÉCUTE les vraies retourFerme, goBack, assistCloture, assistFermer, assistModifie, asEmpreinte, ficheRetour, ET le
   vrai bloc des enveloppes de go/goBack/popstate (celui qui parle à l'historique du navigateur).                          */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1213 · 0. la population ──');
const F = {};
['function retourFerme(', 'function goBack(', 'function ficheRetour(', 'function assistCloture(', 'function asEmpreinte(', 'function assistModifie(', 'function assistOuverte(',
  'function assistFermer(', 'function asKeepSigs(', 'function asSigsVives(', 'function closeSub(', 'function t3dQuestModalEnd(', 'function closeModal(', 'function intStatutPermis('].forEach(h => { F[h] = bloc(h); });
const ligneOuvre = ligne('function assistOuverte(');
const ligneEchap = ligne("document.addEventListener('keydown',e=>{ if(e.key==='Escape'");
// le bloc des enveloppes (go / goBack / popstate), de « var goNatif » à la fin de son try
const i0 = SRC.indexOf('var goNatif=window.go'), debutBloc = SRC.lastIndexOf('try{', i0), finBloc = SRC.indexOf("if(typeof window.closeModal==='function'", i0);
const ENVELOPPES = (i0 > 0 && finBloc > i0) ? SRC.slice(debutBloc, finBloc).trim() : '';
let syntaxe = false; try { new Function(ENVELOPPES); syntaxe = true; } catch (e) { }
vrai('toutes les fonctions sont trouvées', Object.values(F).every(x => x.length > 40) && ligneOuvre.length > 40 && ligneEchap.length > 40, Object.entries(F).filter(([k, v]) => v.length <= 40).map(([k]) => k));
vrai('le bloc des enveloppes (go, goBack, popstate) est trouvé et valide', ENVELOPPES.length > 1500 && syntaxe, ENVELOPPES.length);
vrai('⛔ une seule définition de retourFerme, assistFermer, goBack', ['function retourFerme(', 'function assistFermer(', 'function goBack('].every(n => SRC.split(n).length === 2));
vrai('le bouton « Fermer » de la Clôture guidée appelle assistFermer (pas closeModal directement)', /onclick="assistFermer\(\)">Fermer<\/button><h3>Clôture guidée/.test(SRC) && !/onclick="closeModal\(\)">Fermer<\/button><h3>Clôture guidée/.test(SRC));

function monde(opts) {
  opts = opts || {};
  const ov = { s: new Set(), classList: { contains: c => ov.s.has(c), add: c => ov.s.add(c), remove: c => ov.s.delete(c) } };
  const ov2 = { s: new Set(), classList: { contains: c => ov2.s.has(c), add: c => ov2.s.add(c), remove: c => ov2.s.delete(c) } };
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, __log: [], __urls: [], __confirms: [], __saves: 0, __push: 0, __back: 0,
    __handlers: {}, __ov: ov, __ov2: ov2, __elts: {}, $: id => id === 'overlay' ? ov : id === 'overlay2' ? ov2 : (ctx.__elts[id] || null),
    document: { getElementById: () => null, querySelector: () => null, addEventListener(t, f) { ctx.__handlers['doc_' + t] = f; } },
    history: { state: { rf: 1 }, pushState(s, t, u) { ctx.__push++; ctx.__urls.push(u); this.state = s; }, back() { ctx.__back++; }, replaceState() {} },
    confirm: m => { ctx.__confirms.push(m); return !!ctx.__reponse; }, __reponse: false };
  ctx.window = ctx;
  ctx.addEventListener = (t, f) => { ctx.__handlers[t] = f; };
  vm.createContext(ctx);
  vm.runInContext(`
    let current='interventions'; var _ecranRendu=null, _modalForcee=false, _multiHtml='', _balayageFin=0, _t3dModalCat='';
    window._viewStack=['planning'];
    var asW=null, intNuis=new Set(['Rats']), intMeth=new Set(), intTrait={}, rapPresta=new Set(), rapConstat={indices:[]}, rapPhotos=[], rapTags=[];
    var db={interventions:[{id:'i1',titre:'T',clientId:'c1',compteRendu:'',noteInterne:'',materiel:'',zones:'',nuisibles:['Rats'],constat:{}}]};
    var scanTimer=null, scanStream=null, _pp=null;
    function stopBoxScanCamera(){} function save(){ __saves++; } function toast(){} function intInfOf(){ return ''; }
    /* assistCloture lit la règle du menu de statut (intStatutPermis, lot g05) : la vraie, avec un compte qui a toutes les cases */
    function can(){ return true; } function canCat(){ return true; } function intTechIds(i){ return (i&&i.techIds)||[]; } function myTechId(){ return null; }
    ${F['function intStatutPermis(']}
    function logEvent(){}
    function go(v){ __log.push('go '+v); if(!window._goingBack && current!==v) window._viewStack.push(current); window._goingBack=false; current=v; _ecranRendu=null; }
    function assistRender(){ _multiHtml='<button onclick="assistFermer()">Fermer</button>'; $('overlay').classList.add('open'); }
    function t3dQuestModalEnd(id){ __log.push('t3dEnd '+id); _t3dModalCat=''; closeModal(); assistRender(); }
    function marquer(){}
    ${F['function closeModal(']}
    ${F['function closeSub(']}
    ${F['function asSigsVives(']}
    ${F['function asKeepSigs(']}
    ${F['function ficheRetour(']}
    ${F['function asEmpreinte(']}\n${F['function assistModifie(']}\n${ligneOuvre.startsWith('function') ? F['function assistOuverte('] : ''}\n${F['function assistFermer(']}
    ${F['function assistCloture(']}
    ${F['function retourFerme(']}\n${F['function goBack(']}
    ${ENVELOPPES}
    ${ligneEchap}
  `, ctx);
  return ctx;
}
const popstate = W => W.__handlers.popstate();
const etat = W => ({ current: vm.runInContext('current', W), pile: vm.runInContext('window._viewStack.slice()', W), ouvert: W.__ov.s.has('open'), asW: vm.runInContext('asW?asW.id:null', W), confirms: W.__confirms.length, urls: W.__urls.slice(), push: W.__push, back: W.__back, log: W.__log.slice() });
const ouvrirCloture = (W, saisie) => { vm.runInContext("assistCloture('i1')", W); if (saisie) vm.runInContext("asW.obs='mes observations'; asW.materiel='pulvérisateur'; asW.infest='fort'", W); };

console.log('\n── 1213 · technicien#4 · retour système depuis une fiche d\'intervention ──');
{ const W = monde(); vm.runInContext('_ecranRendu=function(){}', W);
  popstate(W); const e = etat(W);
  vrai('le retour ramène à LA LISTE de la rubrique (current inchangé), il ne saute pas au Planning', e.current === 'interventions' && !e.log.includes('go planning'), e);
  vrai('la pile des vues n\'a pas bougé (la rubrique d\'avant reste d\'avant)', JSON.stringify(e.pile) === '["planning"]', e.pile);
  vrai('la fiche est refermée (la liste se redessine : go(current))', e.log.join() === 'go interventions', e.log);
  vrai('⛔ l\'entrée d\'historique consommée est REMISE (une seule, par l\'enveloppe de go)', e.push === 1, e.push); }
{ const W = monde(); vm.runInContext('_ecranRendu=function(){}', W);
  W.goBack(); const e = etat(W);
  vrai('le bouton « ‹ » de la page (goBack) fait pareil sans toucher à l\'historique', e.current === 'interventions' && e.log.join() === 'go interventions' && e.back === 0 && e.push === 0, e); }
{ const W = monde();
  popstate(W); const e = etat(W);
  vrai('sans fenêtre ni fiche : le retour est celui d\'avant (retour au Planning, pile dépilée)', e.current === 'planning' && e.pile.length === 0, e); }

console.log('\n── 1213 · technicien#4 et #5 · retour système avec la Clôture guidée ──');
{ const W = monde(); ouvrirCloture(W, true); W.__reponse = false;
  vrai('population : la Clôture guidée est ouverte avec une saisie', etat(W).ouvert && etat(W).asW === 'i1' && vm.runInContext('assistModifie()', W) === true, etat(W));
  popstate(W); const e = etat(W);
  vrai('retour avec saisie : on DEMANDE (une confirmation)', e.confirms === 1, e.confirms);
  vrai('refusé : la fenêtre reste ouverte, la saisie est intacte', e.ouvert && e.asW === 'i1' && vm.runInContext('asW.obs', W) === 'mes observations', e);
  vrai('refusé : la rubrique n\'est PAS quittée, la pile est intacte', e.current === 'interventions' && e.log.length === 0 && JSON.stringify(e.pile) === '["planning"]', e);
  vrai('⛔ refusé : l\'entrée d\'historique est remise', e.push === 1, e.push);
  vrai('⛔ … et elle porte l\'adresse de la rubrique où l\'on reste (« current » est un let, pas window.current)', e.urls[0] === '#v=interventions', e.urls); }
{ const W = monde(); ouvrirCloture(W, true); W.__reponse = true; popstate(W); const e = etat(W);
  vrai('accepté : la fenêtre se ferme SEULE (la rubrique n\'est pas quittée)', !e.ouvert && e.current === 'interventions' && e.log.length === 0 && JSON.stringify(e.pile) === '["planning"]', e);
  vrai('accepté : l\'état de la clôture est jeté (asW nul), et l\'entrée d\'historique remise', e.asW === null && e.push === 1, e); }
{ const W = monde(); ouvrirCloture(W, false); popstate(W); const e = etat(W);
  vrai('ouverte puis rien saisi : fermée sans rien demander', !e.ouvert && e.confirms === 0 && e.current === 'interventions' && e.asW === null, e); }
{ const W = monde(); ouvrirCloture(W, true); const db0 = JSON.stringify(vm.runInContext('db', W)); W.__reponse = true; popstate(W);
  vrai('⛔ ouvrir puis fermer n\'écrit RIEN dans db (ni save())', JSON.stringify(vm.runInContext('db', W)) === db0 && W.__saves === 0, W.__saves); }
{ const W = monde(); ouvrirCloture(W, true); vm.runInContext("_t3dModalCat='fourmis'; _multiHtml='<div>questionnaire</div>'", W); popstate(W); const e = etat(W);
  vrai('le questionnaire d\'un type de nuisible revient à la Clôture guidée (il ne la quitte pas)', e.log[0] === 't3dEnd i1' && e.ouvert && e.current === 'interventions' && e.asW === 'i1', e); }

console.log('\n── 1213 · technicien#5 · le bouton « Fermer » ──');
{ const W = monde(); ouvrirCloture(W, true); W.__reponse = false;
  const r = W.assistFermer(); const e = etat(W);
  vrai('« Fermer » avec saisie : demande, et refusé = ne ferme pas', r === false && e.confirms === 1 && e.ouvert && e.asW === 'i1', e);
  W.__reponse = true; const r2 = W.assistFermer(); const e2 = etat(W);
  vrai('« Fermer » confirmé : ferme', r2 === true && !e2.ouvert && e2.asW === null, e2); }
{ const W = monde(); ouvrirCloture(W, false); W.assistFermer(); const e = etat(W);
  vrai('« Fermer » sans saisie : ferme sans rien demander', e.confirms === 0 && !e.ouvert, e); }
{ const W = monde();
  for (const [nom, js] of [['une observation', "asW.obs='x'"], ['le niveau', "asW.infest='fort'"], ['le matériel', "asW.materiel='m'"], ['les zones', "asW.zones='z'"], ['la note interne', "asW.noteInterne='n'"],
    ['les recommandations', "asW.reco='r'"], ['la signature technicien', "asW.sigT='data:image/png;base64,AAA'"], ['un nuisible coché', "intNuis.add('Souris')"], ['une méthode cochée', "intMeth.add('Piégeage')"],
    ['client absent', "asW.absent=true"], ['une photo', "rapPhotos.push('data:x'); rapTags.push('')"]]) {
    const V = monde(); ouvrirCloture(V, false);
    vrai('rien saisi : pas de modification', vm.runInContext('assistModifie()', V) === false);
    vm.runInContext(js, V);
    vrai('saisir ' + nom + ' compte comme une saisie à ne pas perdre', vm.runInContext('assistModifie()', V) === true); } }

console.log('\n── 1213 · ⛔ un canvas de signature RÉSIDUEL ne se lit pas à l\'ouverture ──');
// closeModal() ne vide pas #modal : le canvas dessiné pour l'intervention A y reste quand on ouvre la Clôture de B.
const canvasSig = (has, drawn, url) => ({ dataset: Object.assign({}, has ? { has: '1' } : {}, drawn ? { drawn: '1' } : {}), toDataURL: () => url });
{ const W = monde(); W.__elts['as-sig'] = canvasSig(true, true, 'SIGNATURE_DE_A'); W.__elts['as-sig-t'] = canvasSig(true, true, 'SIGNATURE_TECH_DE_A');
  ouvrirCloture(W, false);
  vrai('la signature du canvas résiduel n\'entre PAS dans la Clôture de l\'autre intervention (asW.sig vide)', vm.runInContext('asW.sig', W) === '' && vm.runInContext('asW.sigT', W) === '', vm.runInContext('[asW.sig,asW.sigT]', W));
  vrai('… et elle n\'est pas « modifiée » à l\'ouverture', vm.runInContext('assistModifie()', W) === false);
  // l'étape Signatures rend un canvas NEUF : seul ce qui est dessiné DEPUIS compte
  vm.runInContext('asW.step=5', W); W.__elts['as-sig'] = canvasSig(false, false, 'BLANC'); W.__elts['as-sig-t'] = canvasSig(false, false, 'BLANC');
  vrai('étape Signatures, canvas neufs, rien dessiné : pas de modification', vm.runInContext('assistModifie()', W) === false); }
console.log('\n── 1213 · signatures dessinées : elles comptent, une signature déjà enregistrée non ──');
{ const W = monde(); ouvrirCloture(W, false); vm.runInContext('asW.step=5', W);
  W.__elts['as-sig-t'] = canvasSig(true, true, 'data:image/png;base64,DESSINEE');
  vrai('signature technicien DESSINÉE à l\'étape Signatures : saisie à ne pas perdre', vm.runInContext('assistModifie()', W) === true);
  W.__reponse = false; const r = W.assistFermer();
  vrai('« Fermer » la demande, et refusé = ne ferme pas', r === false && W.__confirms.length === 1 && vm.runInContext('asW', W) !== null, W.__confirms.length); }
{ const W = monde(); vm.runInContext("db.interventions[0].signature='data:image/png;base64,ANCIENNE'", W); ouvrirCloture(W, false); vm.runInContext('asW.step=5', W);
  W.__elts['as-sig'] = canvasSig(true, false, 'data:image/png;base64,REENCODEE');   // initSigPad a redessiné l'ancienne : has, mais pas drawn
  vrai('une signature DÉJÀ enregistrée, redessinée par initSigPad et non touchée, n\'est pas une modification', vm.runInContext('assistModifie()', W) === false);
  vm.runInContext("asW.sig=''", W); W.__elts['as-sig'] = canvasSig(false, true, '');   // « Effacer »
  vrai('« Effacer » la signature enregistrée en est une', vm.runInContext('assistModifie()', W) === true); }

console.log('\n── 1213 · la touche Échap passe par la même garde ──');
const echap = W => W.__handlers.doc_keydown({ key: 'Escape' });
{ const W = monde(); ouvrirCloture(W, true); W.__reponse = false; echap(W); const e = etat(W);
  vrai('Échap sur la Clôture guidée avec saisie : on DEMANDE, et refusé = la saisie est intacte', e.confirms === 1 && e.ouvert && e.asW === 'i1' && vm.runInContext('asW.obs', W) === 'mes observations', e); }
{ const W = monde(); ouvrirCloture(W, true); W.__reponse = true; echap(W); const e = etat(W);
  vrai('Échap confirmé : la Clôture se ferme, asW jeté, la rubrique n\'est pas quittée', !e.ouvert && e.asW === null && e.current === 'interventions' && e.log.length === 0, e); }
{ const W = monde(); ouvrirCloture(W, false); echap(W); const e = etat(W);
  vrai('Échap sans rien saisi : ferme sans rien demander', !e.ouvert && e.confirms === 0 && e.asW === null, e); }
{ const W = monde(); W.__ov.s.add('open'); vm.runInContext("_multiHtml='<div>fenêtre ordinaire</div>'", W); echap(W); const e = etat(W);
  vrai('Échap sur une fenêtre ordinaire : elle se ferme (comportement d\'avant)', !e.ouvert && e.confirms === 0, e); }
{ const W = monde(); vm.runInContext('_ecranRendu=function(){}', W); echap(W); const e = etat(W);
  vrai('Échap sur une fiche plein écran : ne la quitte pas (c\'est le retour système qui le fait)', e.log.length === 0 && e.current === 'interventions', e); }
{ const W = monde(); W.__ov.s.add('open'); vm.runInContext('_modalForcee=true', W); echap(W);
  vrai('Échap sur un écran obligatoire : ne le ferme pas', etat(W).ouvert); }

console.log('\n── 1213 · feuilles secondaires (#overlay2) : on les ferme AVANT la fenêtre qu\'elles recouvrent ──');
{ const W = monde(); ouvrirCloture(W, true); W.__ov2.s.add('open'); W.__reponse = true; popstate(W); const e = etat(W);
  vrai('retour système avec une feuille secondaire sur la Clôture : elle seule se ferme, la Clôture reste, sans confirmation', !W.__ov2.s.has('open') && e.ouvert && e.asW === 'i1' && e.confirms === 0, e);
  vrai('… l\'entrée d\'historique est remise (un geste, une navigation) et la rubrique n\'est pas quittée', e.push === 1 && e.current === 'interventions' && e.log.length === 0, e);
  popstate(W); const e2 = etat(W);
  vrai('… un second retour traite alors la Clôture (confirmation, puis fermeture)', e2.confirms === 1 && !e2.ouvert && e2.asW === null, e2); }
{ const W = monde(); ouvrirCloture(W, true); W.__ov2.s.add('open'); W.__reponse = true; echap(W); const e = etat(W);
  vrai('Échap : la feuille secondaire d\'abord, la Clôture ensuite', !W.__ov2.s.has('open') && e.ouvert && e.asW === 'i1' && e.confirms === 0, e); }
{ const W = monde(); vm.runInContext('_ecranRendu=function(){}', W); W.__ov2.s.add('open'); popstate(W); const e = etat(W);
  vrai('visionneuse de photo ouverte sur une fiche : le retour ferme la visionneuse, la fiche n\'est pas redessinée dessous', !W.__ov2.s.has('open') && e.log.length === 0 && e.push === 1, e); }

console.log('\n── 1213 · fenêtres ordinaires et écran obligatoire ──');
{ const W = monde(); W.__ov.s.add('open'); vm.runInContext("_multiHtml='<div>une fenêtre ordinaire</div>'", W); popstate(W); const e = etat(W);
  vrai('une fenêtre ordinaire : le retour la ferme seule, la rubrique reste', !e.ouvert && e.current === 'interventions' && e.log.length === 0 && e.confirms === 0 && e.push === 1, e); }
{ const W = monde(); W.__ov.s.add('open'); vm.runInContext("_modalForcee=true", W); popstate(W); const e = etat(W);
  vrai('un écran obligatoire (mot de passe à la 1re connexion) : le retour ne le ferme pas et ne quitte rien', e.ouvert && e.current === 'interventions' && e.log.length === 0 && e.push === 1, e); }
{ const W = monde(); W.__ov.s.add('open'); W.__ov.s.add('ferme'); popstate(W); const e = etat(W);
  vrai('une fenêtre en train de se fermer (animation de sortie) n\'est plus « ouverte » : le retour est celui d\'avant', e.current === 'planning', e); }
{ const W = monde(); vm.runInContext('window._balayageFin=Date.now()', W); vm.runInContext('_ecranRendu=function(){}', W); popstate(W); const e = etat(W);
  vrai('« un geste, une navigation » : le doublon d\'un balayage est toujours ignoré (et son entrée remise)', e.log.length === 0 && e.push === 1, e);
  vrai('… avec l\'adresse de la rubrique courante, pas « #v= »', e.urls[0] === '#v=interventions', e.urls); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
