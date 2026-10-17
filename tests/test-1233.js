/* ══ g20 · UN E-MAIL QUI NE PART PAS NE SE PERD PAS (achats#10) ═════════════════════════════════════════
   Constat (agents de test de la bêta, 16 octobre 2026) : Boîte mail > Nouveau message. Le serveur d'envoi
   est injoignable (ou refuse) : `srvMail` rend `false` et lance un brouillon `mailto:` ; `mailSend`
   FERMAIT la fenêtre quand même (`closeModal()` après le `if(ok)`). Sur un poste sans client Mail le
   brouillon n'existe pas : objet, destinataire et message tapés partaient avec la fenêtre, rien n'était
   enregistré (`mailSent` à 0). Les bons, eux, gardent leur fenêtre (« Envoi automatique impossible »).

   Ce banc EXÉCUTE la vraie `mailSend`, avec un `srvMail` qui réussit ou échoue : à l'échec la fenêtre reste
   ouverte, le texte est conservé, rien n'est écrit dans `mailSent`, et un toast le dit ; au succès tout se
   passe comme avant (message gardé dans « Envoyés », fenêtre fermée).                                    */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return ''; }
const MS = bloc('async function mailSend(){');

console.log('\n── 1233 · 0. la population ──');
v('mailSend est trouvée', MS.length > 800, true);
v('⛔ une seule définition de mailSend', SRC.split('function mailSend(').length - 1, 1);

function monde(srvMailRend) {
  const champs = { 'mc-to': 'dest@exemple.fr', 'mc-subject': 'Objet important', 'mc-text': 'Corps du message long à ne pas perdre', 'mc-from': '' };
  const ctx = { console, JSON, Math, Date, Set, Object, Array, String, Number, Promise, __toasts: [], __closes: 0, __saves: 0, __srv: 0, __rafraichi: 0,
    db: { mailSent: [] }, current: 'boiteMail', currentUser: { id: 'u', prenom: 'Zoé', nom: 'Martin' }, _mailAtt: null, _mailboxes: [], views: {} };
  ctx.views.boiteMail = () => { ctx.__rafraichi++; };
  vm.createContext(ctx);
  vm.runInContext(`var $=function(i){ return i in ${JSON.stringify(champs)} ? { value: ${JSON.stringify(champs)}[i] } : null; };
    function toast(m){ __toasts.push(String(m)); } function closeModal(){ __closes++; } function save(){ __saves++; }
    function fullName(u){ return u.prenom+' '+u.nom; } function mailBrandName(){ return 'Nettoyage Excellence'; }
    async function srvFeatures(){ return {}; }
    async function srvMail(){ __srv++; return ${srvMailRend}; }
    ${MS}`, ctx);
  return ctx; }

console.log('\n── 1233 · 1. achats#10 — l’envoi échoue : la fenêtre reste, le texte aussi ──');
(async () => {
  { const W = monde(false); await W.mailSend();
    v('population : le serveur d’envoi a bien été appelé une fois', W.__srv, 1);
    v('⛔ la fenêtre N’EST PAS fermée (avant le correctif : fermée)', W.__closes, 0);
    v('rien n’est enregistré dans « Envoyés » : le message n’est pas parti', [W.db.mailSent.length, W.__saves], [0, 0]);
    vrai('un toast dit clairement que le texte est conservé', W.__toasts.some(t => /non envoy/i.test(t) && /conserv/i.test(t)), W.__toasts);
    v('la liste de la boîte n’est pas redessinée sous la fenêtre', W.__rafraichi, 0); }

  console.log('\n── 1233 · 2. l’envoi réussit : comme avant ──');
  { const W = monde(true); await W.mailSend();
    v('la fenêtre se ferme', W.__closes, 1);
    v('le message est rangé dans « Envoyés » (destinataire, objet, texte)', W.db.mailSent.map(m => [m.to, m.subject, m.text]), [['dest@exemple.fr', 'Objet important', 'Corps du message long à ne pas perdre']]);
    v('sauvegardé une fois, et la boîte redessinée', [W.__saves, W.__rafraichi], [1, 1]);
    vrai('aucun toast d’échec', !W.__toasts.some(t => /non envoy/i.test(t)), W.__toasts); }

  console.log('\n── 1233 · 3. les refus de saisie sont inchangés ──');
  { const W = monde(true); W.$ = null; vm.runInContext(`var $=function(i){ return i==='mc-to'?{value:'pas-une-adresse'}:{value:''}; };`, W); await W.mailSend();
    v('adresse invalide : « Destinataire invalide », rien n’est tenté', [W.__toasts[0], W.__srv, W.__closes], ['Destinataire invalide', 0, 0]); }

  console.log('\n══ test-1233 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
  process.exit(ko ? 1 : 0);
})();
