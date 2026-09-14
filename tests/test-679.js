/* ══ 679 · LA SURVEILLANCE NE DOIT REMONTER QUE DE VRAIS PROBLÈMES ═════════════════════════
   14 septembre 2026. Justin, capture de l'écran Surveillance : « supprime-moi ça ». Lecture
   des incidents avant de les ranger — et aucun n'était une panne :

     · « Promesse rejetée : View transition was skipped because document visibility state
       is hidden » ×165, « Transition was aborted because of invalid state » ×45,
       « Old view transition aborted by new view transition » ×5 → 215 en une journée ;
     · « Interface figée pendant 5 917 488 ms » — 98 minutes, soit un ordinateur rouvert.

   ⛔ LES DEUX SONT DES DÉFAUTS DE LA SENTINELLE, PAS DE L'APPLICATION. Et ils coûtent plus
   cher qu'ils n'en ont l'air : 215 faux incidents noient les vrais, et un écran de
   surveillance qu'on n'ouvre plus ne surveille rien.

   ⚠️ Ce banc vérifie qu'on les tait À LA SOURCE. Un filtre sur le libellé dans le rapporteur
   aurait fait taire aussi les VRAIS rejets portant le même message — et laissé le défaut en
   place pour la prochaine transition qu'on écrirait. */
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}
console.log('\n── 679 · plus de faux incidents dans la Tour ──');

// ── 1. Le plafond de la branche longtask
const mLong = SRC.match(/getEntries\(\)\.forEach\(function\(en\)\{[\s\S]{0,900}?\}\);/);
v('la branche longtask est bien trouvée', !!mLong, true);
if (mLong) {
  v('⛔ elle a un plafond haut (au-delà, c\'est une veille, pas un gel)', /en\.duration<15000/.test(mLong[0]), true);
  v('✅ et garde son plancher de 2 s', /en\.duration>2000/.test(mLong[0]), true);
}
/* Le contre-test : la branche requestAnimationFrame avait DÉJÀ ce plafond, avec le commentaire
   qui explique pourquoi. S'il disparaissait, le défaut reviendrait par l'autre porte. */
v('✅ la branche requestAnimationFrame garde le sien', /d>2000&&d<15000&&actif/.test(SRC), true);

// ── 2. Les transitions de vue : les trois promesses sont traitées
const mT = SRC.match(/function vtTaire\(vt\)\{[\s\S]*?\n\}/);
v('vtTaire existe', !!mT, true);
if (mT) {
  for (const q of ['ready', 'finished', 'updateCallbackDone'])
    v('⛔ vt.' + q + ' est traitée', new RegExp('vt\\.' + q + '\\.catch').test(mT[0]), true);
}
/* ⛔ LE CONTRÔLE QUI COMPTE : chaque startViewTransition passe par vtTaire. En ajouter un
   nouveau sans l'envelopper ramènerait le bruit, et personne ne ferait le lien un mois plus
   tard. On compte les appels, pas les mentions — le commentaire ci-dessus nomme la fonction
   lui aussi, et un test qui compterait les deux serait au vert par hasard. */
const appels = (SRC.match(/document\.startViewTransition\(/g) || []).length;
const enveloppes = (SRC.match(/vtTaire\(document\.startViewTransition\(/g) || []).length;
/* Les gardes « if(!document.startViewTransition||sobre) » n'ont pas de parenthèse ouvrante :
   elles ne comptent donc pas comme des appels, et il n'y a rien à soustraire. Chaque appel
   RÉEL doit être enveloppé — l'égalité stricte est le contrôle, pas une soustraction. */
v('⛔ chaque transition lancée est enveloppée', appels, enveloppes);
v('(et il y en a bien au moins deux)', enveloppes >= 2, true);

// ── 3. On n'a PAS filtré à l'arrivée — ce qui aurait masqué de vrais rejets
v('🔒 aucun filtre sur « view transition » dans le rapporteur',
  /View transition|view transition/.test(SRC.slice(SRC.indexOf('unhandledrejection'), SRC.indexOf('unhandledrejection') + 2000)), false);
/* Le rapporteur garde son filtre réseau d'origine : celui-là est légitime, une coupure de
   réseau n'est pas un défaut de l'application. */
v('✅ le filtre réseau d\'origine est intact', /Failed to fetch\|NetworkError\|Load failed/.test(SRC), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
