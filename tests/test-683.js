/* ══ LE CODE D'ACCÈS NE SORT PLUS QUAND L'ESPACE PEUT S'EN PASSER ═════════════════════════
   Demande de Justin, 14 septembre 2026 : « on a "Revoir le lien et le code" mais du coup ça
   sera que lien, je veux plus de code. » Une adresse se retient et s'écrit sur un camion ;
   un code de dix caractères se perd, se retape de travers et se redemande.

   ⛔ MAIS IL NE SE RETIRE PAS EN BLOC. Le rattrapage d'annuaire du serveur le dit noir sur
   blanc : un espace ancien dont le code ne porte ni « a » ni « mh » ne PEUT PAS être semé,
   donc le code d'accès reste SA SEULE PORTE. Le cacher là l'enfermerait dehors, pour de bon.
   D'où le compteur `annuaire` rendu par /api/monitor/espaces/lien-existant : au-dessus de
   zéro, l'adresse et l'identifiant suffisent et le code disparaît — de l'écran ET du message
   envoyé au client ; à zéro, il reste affiché. Le retrait se fait espace par espace, au
   rythme où chacun devient capable de s'en passer.

   Ce banc tient les deux moitiés : que le code parte quand il le doit, et qu'il RESTE quand
   il est la seule porte. La seconde compte plus que la première. */
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const tour = fs.readFileSync(path.join(R, 'tour.html'), 'utf8');
const srv = fs.readFileSync(path.join(R, 'server', 'index.js'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 683 · le code d\'accès ne sort que s\'il est encore la seule porte ──');

/* ── Le serveur dit combien de comptes l'espace connaît déjà ── */
v('lien-existant rend le nombre de comptes de l\'espace',
  /res\.json\(\{ ok: true, existe: true,[^\n]*ident, annuaire \}\)/.test(srv), true);
v('… compté sur comptesReg, comme partout ailleurs',
  /const annuaire = \(\(\) => \{ const a = comptesReg\[tEsp\]; return \(a && a\.c\) \? Object\.keys\(a\.c\)\.length : 0; \}\)\(\)/.test(srv), true);

/* ── La Tour le fait traverser jusqu'au panneau ── */
v('tourEspaceDe transmet le compteur', /annuaire:Number\(connu\.annuaire\)\|\|0/.test(tour), true);
v('le panneau en tire sa décision, une seule fois', /var sansCode=\(e\.annuaire\|\|0\)>0;/.test(tour), true);

/* ── L'écran : la section du code est enfermée dans la condition ── */
const sec = tour.indexOf("SON CODE D\\'ACCÈS <span style=\"color:var(--muted);font-weight:400;text-transform:none\">— pour la TOUTE PREMIÈRE connexion, une seule fois");
v('la section « SON CODE D\'ACCÈS » du panneau est trouvée', sec > 0, true);
if (sec > 0) {
  const avant = tour.slice(Math.max(0, sec - 700), sec);
  v('⛔ elle n\'est rendue que si le code sert encore', /\(sansCode\?'':\s*$/.test(avant.trimEnd() + '\n') || /\(sansCode\?'':/.test(avant), true);
}

/* ── Le message envoyé au client suit la même règle, sinon on retire le code de l'écran
      en continuant de l'envoyer par courriel. ── */
v('le message ne porte le paragraphe du code que si besoin',
  /\+\(sansCode\?'' *:'\\n\\nTA TOUTE PREMIÈRE CONNEXION/.test(tour), true);
v('… ni la phrase « garde ce code pour toi »',
  /\+\(sansCode\?'':'\\n\\nGarde ce code pour toi/.test(tour), true);

/* ── Et on ne va plus DEMANDER au serveur un code qu'on a décidé de ne pas montrer. ── */
v('le chargement du code ne part plus pour rien',
  /if\(sansCode\) lgMessagePoser\(e\.ident\|\|' '\);\s*\n\s*else tourAccesCharger\(e\.slug\|\|e\.nom\);/.test(tour), true);

/* ── Le libellé des deux boutons de la fiche dit ce que le panneau montrera vraiment. ── */
const lib = (tour.match(/>🔗 Revoir le lien'\+\(e\.annuaire\?'':' et le code'\)\+'<\/button>/g) || []).length;
v('les deux boutons annoncent le bon contenu', lib, 2);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
