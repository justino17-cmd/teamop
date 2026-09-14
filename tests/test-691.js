/* ══ DEUX ÉCRANS DE CONNEXION D'AFFILÉE, ET LA COMPRESSION QUI ARRIVE ═════════════════════

   1. LES DEUX ÉCRANS. Vidéo de Justin : on donne son identifiant et son mot de passe sur la
   page de son entreprise, le serveur les vérifie — et l'application affiche SON PROPRE écran
   de connexion, qu'elle remplace elle-même quelques secondes plus tard. Le formulaire était
   dessiné d'abord, et cnxAutoTenter() attendait derrière jusqu'à 12 s que les comptes de
   l'équipe arrivent par la synchro. Ça ne se lit pas comme une attente : ça se lit comme
   « ma connexion n'a pas marché ». La v673 avait corrigé l'identifiant affiché et fait parler
   les abandons — elle n'avait pas retiré le second écran.

   2. LA COMPRESSION, PHASE 1. L'application apprend à LIRE le format compressé ; elle
   n'écrira compressé qu'à la version suivante, une fois le parc à jour. C'est la règle du
   dépôt — les appareils d'abord, la porte ensuite : un appareil qui ne saurait pas lire
   perdrait l'accès aux données de sa propre entreprise.

   MESURÉ au navigateur sur la base réelle d'ELAN (scratchpad/preuve-gzip.js) : 930,9 Ko de
   clair → 77,5 Ko compressés (−92 %), document final 103,3 Ko contre 1024 Ko de limite dure,
   relu à l'identique et JSON.parse passe. 19 ms pour compresser, 46 ms pour relire. */
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const APP = fs.readFileSync(path.join(R, 'app.html'), 'utf8');
const SRV = fs.readFileSync(path.join(R, 'server', 'index.js'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 691 · un seul écran de connexion, et la compression se lit ──');

/* ── 1. L'attente remplace le formulaire, elle ne s'y ajoute pas ── */
const src = APP.match(/function cnxAutoEnAttente\(\)\{[\s\S]*?\n\}/);
v('cnxAutoEnAttente est trouvée', !!src, true);
if (src) {
  const f = new Function('sessionStorage', src[0] + '; return cnxAutoEnAttente;');
  const avec = (o) => f({ getItem: () => (o === null ? null : JSON.stringify(o)) })();
  const h = 'a'.repeat(64);
  v('un jeton frais et valide annonce la personne', avec({ login: 'justin', h, ts: Date.now() }), 'justin');
  v('pas de jeton → pas d\'attente', avec(null), '');
  /* ⛔ Les mêmes conditions que cnxAutoTenter, sinon on montre une attente que personne
     n\'honore et l\'écran tourne indéfiniment. */
  v('⛔ un jeton périmé n\'ouvre pas d\'attente', avec({ login: 'justin', h, ts: Date.now() - 130000 }), '');
  v('⛔ une empreinte mal formée non plus', avec({ login: 'justin', h: 'court', ts: Date.now() }), '');
  v('⛔ ni un jeton sans identifiant', avec({ login: '', h, ts: Date.now() }), '');
}
v('le formulaire est masqué tant que l\'ouverture est en route',
  /<div id="li-form"\$\{_auto\?' style="display:none"':''\}>/.test(APP), true);
v('… et on montre qu\'on ouvre, avec le nom de la personne',
  /Connexion de \$\{esc\(_auto\)\}…/.test(APP), true);
/* ⛔ Un seul point de sortie : un oubli laisse quelqu'un devant un écran qui tourne. */
v('⛔ toutes les sorties passent par cnxAutoRevele',
  (APP.match(/cnxAutoRevele\(\)/g) || []).length >= 4, true);
v('⛔ et un filet de 15 s rend la main quoi qu\'il arrive',
  /setTimeout\(cnxAutoRevele,15000\)/.test(APP), true);
v('l\'identifiant est reposé dans le champ quand le formulaire revient',
  /const el=document\.getElementById\('li-login'\); if\(el\) el\.value=String\(j\.login\)/.test(APP), true);

/* ── 2. La compression : lire d'abord, écrire ensuite ── */
v('gzipper et degzipper existent', /async function gzipper\(txt\)\{/.test(APP) && /async function degzipper\(buf\)\{/.test(APP), true);
v('… sans aucune dépendance ajoutée', /new CompressionStream\('gzip'\)/.test(APP) && /new DecompressionStream\('gzip'\)/.test(APP), true);
v('⛔ un navigateur sans CompressionStream n\'est pas bloqué', /if\(!gzipPossible\(\)\) return null;/.test(APP), true);
v('⛔ la LECTURE comprend les deux formats', /if\(o&&o\.z\) return await degzipper\(pt\);/.test(APP), true);
/* ⛔ Phase 1 : on ne doit PAS encore écrire compressé. La version suivante l'allumera. */
const enc = APP.slice(APP.indexOf('async function syncEncrypt(plain){'), APP.indexOf('async function syncDecrypt(o){'));
v('⛔ PHASE 1 : l\'écriture reste en clair, le parc n\'est pas encore à jour',
  /gzipper\(/.test(enc), false);
/* Le drapeau voyage partout, sinon une copie compressée serait relue comme du texte. */
v('le document Firestore porte le drapeau', /_fbDoc\.set\(\{enc:e\.enc,iv:e\.iv,salt:e\.salt,z:\(e\.z\?1:0\)/.test(APP), true);
v('la sauvegarde serveur aussi', /enc:e\.enc,iv:e\.iv,salt:e\.salt,z:\(e\.z\?1:0\)/.test(APP), true);
v('⛔ et la sauvegarde RELUE ne le perd pas', /salt:cp\.salt,z:cp\.z/.test(APP), true);
v('le serveur le conserve avec la copie', /z: \(b\.z \? 1 : 0\)/.test(SRV), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
