/* ══ « MOT DE PASSE ENREGISTRÉ » NE SE DIT QUE SI LE SERVEUR L'A PRIS ══════════════════════

   ELAN, 15 septembre 2026, capture WhatsApp à l'appui. Florian change son mot de passe,
   l'application répond « Mot de passe enregistré », `mustChangePwd` est effacé donc elle ne le
   redemandera JAMAIS — et Justin ne peut se connecter qu'avec le mot de passe PROVISOIRE,
   celui qui a circulé par WhatsApp.

   Le serveur n'avait jamais reçu le nouveau. Les trois écrans qui changent un mot de passe
   faisaient tous la même chose : changer l'empreinte en local, appeler `save()` — qui programme
   le dépôt CINQ SECONDES plus tard, sans accusé — puis annoncer le succès.

   Deux conséquences, et la seconde est une faille :
   · la personne croit son mot de passe changé, et se fait refuser à la connexion suivante ;
   · le mot de passe PROVISOIRE reste valable pour toujours, et il a circulé en clair.

   C'est la même règle que `_syncTs` ailleurs dans ce fichier : un repère n'avance que sur une
   écriture ACQUITTÉE. Ici : on applique, on dépose, et si le serveur refuse on REMET TOUT
   COMME AVANT — un demi-changement serait pire, ça ferait deux vérités, celle de l'appareil et
   celle de la connexion.

   MESURÉ au navigateur (scratchpad/sonde-mdp.js), les trois verdicts :
     refus 426  → empreinte INCHANGÉE, mustChangePwd CONSERVÉ, aucun toast de succès
     accepté    → empreinte changée, mustChangePwd retiré, succès annoncé
     rien à déposer (appareil sans entreprise) → succès : un mot de passe local est ce qu'on veut */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}
function corps(entete) {
  const d = APP.indexOf(entete); if (d < 0) return '';
  let n = 0;
  for (let i = APP.indexOf('{', d); i < APP.length; i++) {
    if (APP[i] === '{') n++; else if (APP[i] === '}') { n--; if (!n) return APP.slice(d, i + 1); } }
  return '';
}
console.log('\n── 698 · un mot de passe n\'est « enregistré » qu\'une fois le serveur d\'accord ──');

/* ── Le dépôt rend un verdict ── */
const DEP = corps('async function annuaireDeposer(){');
v('annuaireDeposer est trouvée', !!DEP, true);
v('⛔ elle rend {ok:true} quand le serveur a pris', /return \(r&&r\.ok\)\?\{ok:true\}:\{ok:false,status:\(r&&r\.status\)\|\|0\};/.test(DEP), true);
v('⛔ … et {ok:false} sur un réseau muet — on ne SAIT pas, donc on ne promet pas',
  /catch\(e\)\{ return \{ok:false,status:0\}; \}/.test(DEP), true);
v('⛔ « rien à déposer » se distingue d\'un échec', (DEP.match(/return \{ok:null\}/g) || []).length >= 5, true);

/* ── Le dépôt immédiat, sans les 5 secondes ── */
const MNT = corps('async function annuaireMaintenant(){');
v('annuaireMaintenant existe', !!MNT, true);
v('… elle annule la temporisation de 5 s', /clearTimeout\(_annuaireTimer\)/.test(MNT), true);
v('… et laisse finir un dépôt en cours plutôt que de rendre un verdict qui n\'est pas le sien',
  /for\(let i=0;i<25&&_annuaireEnCours;i\+\+\)/.test(MNT), true);

/* ── Le cœur : on applique, on dépose, on REMET si c'est refusé ── */
const ID = corps('async function identifiantsDeposer(u,avant){');
v('identifiantsDeposer existe', !!ID, true);
v('⛔ elle attend le verdict AVANT de rendre la main', /const v=await annuaireMaintenant\(\);/.test(ID), true);
v('⛔ elle REMET l\'état d\'avant quand c\'est refusé',
  /Object\.keys\(avant\)\.forEach\(k=>\{ if\(avant\[k\]===undefined\) delete u\[k\]; else u\[k\]=avant\[k\]; \}\);/.test(ID), true);
v('… et réenregistre après avoir remis', (ID.match(/save\(\);/g) || []).length >= 2, true);
v('⛔ le 426 est nommé, avec quoi faire', /Mets l.?.?application à jour \(recharge la page\), puis recommence/.test(ID), true);
v('… un réseau muet aussi', /Pas de réseau : ton mot de passe n.?.?a PAS été enregistré/.test(ID), true);
v('⛔ « rien à déposer » n\'est PAS un échec', /if\(!v\|\|v\.ok!==false\) return null;/.test(ID), true);

/* ── Les TROIS écrans passent par là. Un oublié, et le défaut revient par cette porte. ── */
[['forcePwdSave', 'async function forcePwdSave(){'],
 ['monComptePwdSave', 'async function monComptePwdSave(){'],
 ['pwdForgotSave', 'async function pwdForgotSave(){']].forEach(([nom, entete]) => {
  const f = corps(entete);
  v(nom + ' attend le verdict', /await identifiantsDeposer\(/.test(f), true);
  v(nom + ' … et n\'annonce rien si ça a échoué', /if\(pb\)\{ show\(pb\);/.test(f), true);
  v(nom + ' … garde l\'état d\'avant pour pouvoir le remettre', /const avant=\{pwdHash:/.test(f), true);
});

/* ⚠️ ET ON N'ENFERME PERSONNE : la fenêtre forcée n'a pas de croix. */
const FPS = corps('async function forcePwdSave(){');
v('⛔ sur échec, la fenêtre forcée cesse de l\'être', /_modalForcee=false; const s=\$\('fp-sortie'\); if\(s\) s\.style\.display='';/.test(FPS), true);
v('… et une sortie existe dans la fenêtre', /id="fp-sortie"/.test(APP), true);
v('… qui dit qu\'on redemandera', /Continuer sans changer — on te le redemandera/.test(APP), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
