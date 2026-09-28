/* ══ PLUS DE CODE D'ACCÈS DANS LA TOUR — ET L'ESPACE SANS COMPTE LE DIT ═══════════════════════
   Justin, 14 septembre 2026 : « je veux plus de code ». Le code était alors retiré espace par espace, au rythme où
   chacun pouvait s'en passer (le compteur `annuaire`). Le 28 septembre 2026 : « je veux plus de code, que des liens
   pour les connexions » — il est retiré PARTOUT : le serveur ne le fabrique plus (410).

   ⛔ La moitié qui compte : un espace DÉJÀ inscrit dont le serveur ne connaît aucun compte n'a plus de porte de
   secours. Le panneau doit donc le DIRE et proposer le geste qui répare (poser ses identifiants) — jamais afficher une
   adresse qui n'ouvre rien comme si tout allait bien. Ce banc tient les deux moitiés ; la couture avec le vrai serveur
   est jouée par `test-841`. */
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

console.log('\n── 683 · plus de code d\'accès ; l\'espace sans compte le dit ──');
const sansCom = (x) => x.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const tourC = sansCom(tour);

/* ── Le serveur dit combien de comptes l'espace connaît déjà ── */
v('lien-existant rend le nombre de comptes de l\'espace',
  /res\.json\(\{ ok: true, existe: true,[^\n]*ident, annuaire \}\)/.test(srv), true);
v('… compté sur comptesReg, comme partout ailleurs',
  /const annuaire = \(\(\) => \{ const a = comptesReg\[tEsp\]; return \(a && a\.c\) \? Object\.keys\(a\.c\)\.length : 0; \}\)\(\)/.test(srv), true);
v('tourEspaceDe transmet le compteur', /annuaire:Number\(connu\.annuaire\)\|\|0/.test(tour), true);

/* ── Le panneau : plus de code, et l'espace sans compte le dit ── */
const i0 = tourC.indexOf('async function tourLienEntreprise('), i1 = tourC.indexOf('\nfunction lgMessagePoser(', i0);
const pan = (i0 > 0 && i1 > i0) ? tourC.slice(i0, i1) : '';
v('le panneau « Lien de connexion » est trouvé', pan.length > 3000, true);
v('⛔ il n\'a plus de section « code d\'accès »', /CODE D\\'ACC|lg-acces|__CODE__|tourAccesCharger/.test(pan), false);
v('⛔ l\'espace sans compte : décidé sur le compteur du SERVEUR, seulement pour un espace déjà inscrit',
  /var existant=\(typeof e\.annuaire==='number'\);/.test(pan) && /var sansCompte=existant && e\.annuaire===0;/.test(pan), true);
v('⛔ …et il le dit, avec le geste qui répare (poser ses identifiants)',
  /\(sansCompte\?'<div class="encart" id="lg-sans-compte"[\s\S]*?tourIdentModifier\(/.test(pan), true);
v('⛔ un espace déjà inscrit ne montre JAMAIS le mot de passe qu\'on vient de tirer (le serveur ne l\'a pas haché)',
  /var mdpAff=e\.mdp\|\|\(existant\?'':mdp\);/.test(pan), true);
v('⛔ le courriel part avec le mot de passe AFFICHÉ, que le serveur vérifie', /tourMailAcces\(\\''\+jsq\(e\.nom\)\+'\\',this,\\''\+jsq\(mdpAff\)\+'\\'\)/.test(pan), true);

/* ── Les deux boutons de la fiche n'annoncent plus « et le code » ── */
v('les deux boutons disent « Revoir le lien », sans code', (tour.match(/>🔗 Revoir le lien<\/button>/g) || []).length, 2);
v('⛔ …et plus aucun « et le code »', /et le code'/.test(tour), false);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
