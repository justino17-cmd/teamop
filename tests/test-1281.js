/* ══ g15 · accueil#5 — UN REFUS NE SURVIT PAS À LA RÉUSSITE QUI LE DÉMENT (Changer mon mot de passe) ══════════
   `monComptePwdSave` posait « ⚠ 8 caractères minimum. » (#mc-err) sur un essai raté et ne l'effaçait JAMAIS :
   à l'essai suivant, réussi, le bouton disait « ✓ Mot de passe modifié » et le toast confirmait… pendant que le
   message rouge restait affiché pendant les 1,7 s avant la fermeture. C'est la règle de CLAUDE.md « un refus ne
   survit pas à la réussite » (espace.html : `_vider()` au début de chaque essai).

   Ce banc EXÉCUTE la vraie `monComptePwdSave` dans un bac à sable à DOM minimal : un champ, un bouton, une zone
   #mc-err ; il joue l'essai raté PUIS l'essai réussi sur la même fenêtre et lit l'état de la zone d'erreur.     */
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
console.log('\n── 1281 · 0. la population ──');
const FN = bloc('async function monComptePwdSave(btn){');
vrai('monComptePwdSave est trouvée', FN.length > 500);
vrai('⛔ une seule définition (une seconde gagnerait partout, en silence)', SRC.split('function monComptePwdSave(').length - 1 === 1);

function monde(pwdPose) {
  const els = { 'mc-p0': { value: '' }, 'mc-p1': { value: '' }, 'mc-p2': { value: '' }, 'mc-err': { textContent: '', style: { display: 'none' } } };
  const ctx = { console, JSON, Math, Date, Promise, els, __toasts: [], __ferme: 0, __depose: 0,
    currentUser: { id: 'u1', login: 'a', email: 'a@b.fr', pwdHash: 'h:Ancien1234' }, current: 'dashboard', views: {} };
  vm.createContext(ctx);
  vm.runInContext(`var $=function(i){ return els[i]||null; }; var SECU_MDP=2;
    async function sha256(s){ return 'h:'+s; }
    function btnOccupe(b){ return function(){}; } function btnFait(b){ return true; }
    function identifiantsDeposer(u,avant){ __depose++; return Promise.resolve(''); }
    function logEvent(){} function toast(m){ __toasts.push(String(m)); } function closeModal(){ __ferme++; }
    function setTimeout(f){ }
    ${FN}`, ctx);
  return ctx;
}
const saisir = (W, p0, p1, p2) => { W.els['mc-p0'].value = p0; W.els['mc-p1'].value = p1; W.els['mc-p2'].value = p2; };
const err = W => ({ texte: W.els['mc-err'].textContent, visible: W.els['mc-err'].style.display !== 'none' });

(async () => {
  console.log('\n── 1281 · 1. l\'erreur d\'un essai raté disparaît quand l\'essai suivant réussit ──');
  { const W = monde(); const btn = {};
    saisir(W, 'Ancien1234', 'abc', 'abc'); await W.monComptePwdSave(btn);
    vrai('l\'essai raté (8 caractères) pose bien son erreur — sinon le banc ne regarde rien', err(W).visible && /8 caractères/.test(err(W).texte), err(W));
    vrai('… et n\'écrit rien (aucun dépôt de mot de passe)', W.__depose === 0, W.__depose);
    saisir(W, 'Ancien1234', 'MotDePasse1', 'MotDePasse1'); await W.monComptePwdSave(btn);
    vrai('l\'essai réussi dépose le mot de passe', W.__depose === 1 && W.currentUser.pwdHash === 'h:MotDePasse1', [W.__depose, W.currentUser.pwdHash]);
    vrai('⛔ … et l\'erreur du premier essai n\'est PLUS affichée', !err(W).visible && err(W).texte === '', err(W)); }

  console.log('\n── 1281 · 2. chaque refus écrit SON verdict, et un refus suivant remplace le précédent ──');
  { const W = monde(); const btn = {};
    saisir(W, 'faux', 'MotDePasse1', 'MotDePasse1'); await W.monComptePwdSave(btn);
    vrai('mot de passe actuel faux : refus dit', err(W).visible && /actuel incorrect/.test(err(W).texte), err(W));
    saisir(W, 'Ancien1234', 'MotDePasse1', 'Autre12345'); await W.monComptePwdSave(btn);
    vrai('les deux ne correspondent pas : le NOUVEAU refus remplace l\'ancien', err(W).visible && /ne correspondent pas/.test(err(W).texte) && !/actuel incorrect/.test(err(W).texte), err(W));
    saisir(W, 'Ancien1234', 'MotDePasse1', 'MotDePasse1'); await W.monComptePwdSave(btn);
    vrai('puis la réussite efface tout', !err(W).visible && W.__depose === 1, [err(W), W.__depose]); }

  console.log('\n── 1281 · 3. un refus du serveur (identifiantsDeposer) reste dit, sans survivre à l\'essai suivant ──');
  { const W = monde(); const btn = {};
    vm.runInContext('identifiantsDeposer=function(u,avant){ __depose++; return Promise.resolve(globalThis.__refus||""); }', W);
    W.__refus = 'Le serveur n\'a pas pris le mot de passe.';
    saisir(W, 'Ancien1234', 'MotDePasse1', 'MotDePasse1'); await W.monComptePwdSave(btn);
    vrai('le refus du serveur est affiché', err(W).visible && /serveur/.test(err(W).texte), err(W));
    W.__refus = ''; W.currentUser.pwdHash = 'h:Ancien1234'; saisir(W, 'Ancien1234', 'MotDePasse2', 'MotDePasse2'); await W.monComptePwdSave(btn);
    vrai('l\'essai suivant, réussi, efface le refus du serveur', !err(W).visible, err(W)); }

  console.log('\n══ test-1281 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
  process.exit(ko ? 1 : 0);
})();
