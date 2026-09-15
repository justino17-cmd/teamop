/* ══ UN DÉPÔT D'IDENTIFIANTS REFUSÉ NE DOIT PAS SE TAIRE ═══════════════════════════════════

   ELAN, 15 septembre 2026, 10 h 45. La v678 venait d'être exigée depuis la Tour ; l'appareil
   de l'administrateur était encore en v677. Le serveur refuse alors le dépôt d'annuaire en
   426 (`/api/espaces/comptes`, « version trop ancienne ») — et `annuaireDeposer` n'avait
   PAS de `else` : rien à l'écran, rien au journal.

   Conséquence exacte, vécue : l'administrateur règle le mot de passe d'un collègue, le voit
   juste dans SON application, et le collègue ne peut pas se connecter — parce que la page de
   connexion, elle, n'interroge que le serveur. « Mais c'est bien les bons identifiants. »
   Une heure perdue à chercher un mot de passe qui n'avait jamais été faux.

   ⚠️ Le 426 est le plus traître des refus : il naît d'un geste VOLONTAIRE (exiger une
   version) et frappe D'ABORD celui qui l'a fait. Il se nomme donc à part, et le message dit
   quoi faire — pas seulement que ça a raté. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRV = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}
console.log('\n── 696 · les identifiants qui ne partent pas le disent ──');

/* Le corps réel de la fonction, par comptage d'accolades. */
const d = APP.indexOf('async function annuaireDeposer(){');
v('annuaireDeposer est trouvée', d > 0, true);
let n = 0, f = d;
for (let i = APP.indexOf('{', d); i < APP.length; i++) {
  if (APP[i] === '{') n++; else if (APP[i] === '}') { n--; if (!n) { f = i; break; } } }
const DEP = APP.slice(d, f + 1);

v('⛔ le refus du serveur a maintenant une branche', /else if\(r\)\{/.test(DEP), true);
v('⛔ … et le 426 est nommé à part', /r\.status===426/.test(DEP), true);
/* ⚠️ Les apostrophes sont ÉCHAPPÉES dans app.html (`l\'application`) : une expression qui
   cherche une apostrophe nue ne trouve rien, et fait croire à une régression. On vise donc le
   texte autour, pas la ponctuation. */
v('… le message dit QUOI FAIRE, pas seulement que ça a raté',
  /Mets l.?.?application à jour, puis refais le réglage/.test(DEP), true);
v('… et il dit la conséquence : ça n\'arrive pas au serveur',
  /ARRIVENT PAS au serveur/.test(DEP), true);
v('un autre refus est dit aussi, avec son code',
  /pas pu être envoyés au serveur \('\+r\.status\+'\)/.test(DEP), true);
v('⛔ ça part AUSSI au journal de l\'entreprise (l\'écran, ça se rate)',
  /logEvent\('Identifiants non déposés'/.test(DEP), true);
v('une seule fois par session tant que ça échoue', /if\(!_annuaireDit\)\{ _annuaireDit=true;/.test(DEP), true);
v('⛔ … et on se tait de nouveau dès qu\'un dépôt passe', /_annuaireSig=sig; _annuaireDit=false;/.test(DEP), true);
v('le drapeau est déclaré avec les autres', /_annuaireSig='',_annuaireDit=false;/.test(APP), true);

/* Le refus côté serveur existe bien, et c'est celui-là qu'on raconte. */
v('⛔ le serveur refuse bien le dépôt en 426 sous le minimum',
  /if \(ver < versionsCfg\.min\) return res\.status\(426\)/.test(SRV), true);
v('… et la route concernée est bien le dépôt d\'annuaire',
  SRV.slice(SRV.indexOf("app.post('/api/espaces/comptes'"), SRV.indexOf("app.post('/api/espaces/comptes'") + 2000).indexOf('426') > 0, true);

/* ⛔ Ce qui n'a PAS changé : un dépôt réussi reste silencieux, et le cache est posé. */
v('un dépôt réussi ne dit toujours rien à l\'utilisateur',
  /if\(r&&r\.ok\)\{ _annuaireSig=sig; _annuaireDit=false; try\{ localStorage\.setItem\('elan_annuaire_cache'/.test(DEP), true);
/* ⚠️ On vise la SORTIE ANTICIPÉE, pas ce qu'elle rend : `annuaireDeposer` a gagné un verdict
   en v680 (`return {ok:null}`), et une expression collée à `return;` a fait croire à une
   régression alors que la garantie n'avait pas bougé d'un pouce. */
v('⛔ la bêta ne dépose toujours rien', /if\(_annuaireEnCours\|\|BETA_ESSAI\) return\b/.test(DEP), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
