/* ══ g15 · accueil#15 — « SIGNALER UN PROBLÈME » AVEC UN TEXTE D'ESPACES NE RÉPOND RIEN ═══════════════════════
   Le `required` natif du <textarea> laisse passer des espaces ; `signalerEnvoyer` faisait alors
   `if(!txt) return;` : la fenêtre restait ouverte, aucun message, aucune ligne dans l'Historique — la personne
   croit que son bouton est cassé. Un envoi refusé le DIT, la fenêtre reste ouverte pour qu'elle écrive.

   Ce banc EXÉCUTE la vraie `signalerEnvoyer` (FormData, logEvent, save, closeModal, toast de bac à sable).    */
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
console.log('\n── 1284 · 0. la population ──');
const FN = bloc('function signalerEnvoyer(e){');
vrai('signalerEnvoyer est trouvée', FN.length > 100);
vrai('⛔ une seule définition', SRC.split('function signalerEnvoyer(').length - 1 === 1);

function jouer(texte) {
  const ctx = { console, String, __toasts: [], __logs: [], __saves: 0, __ferme: 0, __vide: 0 };
  vm.createContext(ctx);
  vm.runInContext(`function FormData(t){ this.get=function(k){ return t[k]; }; }
    function logEvent(a,b,c){ __logs.push([a,b,c]); } function save(){ __saves++; } function closeModal(){ __ferme++; } function toast(m){ __toasts.push(String(m)); }
    ${FN}`, ctx);
  const champ = { value: texte, focus() { ctx.__focus = true; } };
  const e = { preventDefault() { ctx.__pd = true; }, target: { txt: texte, elements: { txt: champ } } };
  ctx.signalerEnvoyer(e);
  return { ctx, champ };
}

console.log('\n── 1284 · 1. un texte vide ou d\'espaces : refus DIT, fenêtre ouverte, rien d\'enregistré ──');
for (const [nom, t] of [['espaces', '     '], ['retours à la ligne', ' \n \n '], ['tabulations', '\t\t'], ['vide', '']]) {
  const { ctx } = jouer(t);
  vrai('« ' + nom + ' » : la fenêtre RESTE ouverte, rien enregistré', ctx.__ferme === 0 && ctx.__logs.length === 0 && ctx.__saves === 0, [ctx.__ferme, ctx.__logs.length]);
  vrai('« ' + nom + ' » : ⛔ un toast demande d\'écrire quelques mots', ctx.__toasts.length === 1 && /écris/i.test(ctx.__toasts[0]) && !/transmis/i.test(ctx.__toasts[0]), ctx.__toasts);
}
console.log('\n── 1284 · 2. contre-épreuves : un vrai texte part, rogné ──');
{ const { ctx } = jouer('  Le planning ne s\'ouvre plus  ');
  vrai('une ligne dans l\'Historique (catégorie support), texte rogné', ctx.__logs.length === 1 && ctx.__logs[0][0] === 'Problème signalé' && ctx.__logs[0][1] === 'Le planning ne s\'ouvre plus' && ctx.__logs[0][2] === 'support', ctx.__logs);
  vrai('enregistré, fenêtre fermée, « Merci » seulement', ctx.__saves === 1 && ctx.__ferme === 1 && ctx.__toasts.length === 1 && /Merci/.test(ctx.__toasts[0]), [ctx.__saves, ctx.__ferme, ctx.__toasts]); }

console.log('\n══ test-1284 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
