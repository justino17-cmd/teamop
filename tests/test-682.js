/* ══ UN IDENTIFIANT TECHNIQUE N'ARRIVE JAMAIS À L'ÉCRAN COMME UN NOM ═══════════════════
   Demande de Justin, 14 septembre 2026 : « je veux plus le mot elan ou elan gestion dans
   les tests ou autres — ELAN c'est l'entreprise avec qui on travaille, et nous, tout ce
   qu'on fait s'appelle TEAM OP. »

   Le matin même, `nomTechnique()` a été branchée sur Entreprises et Connexions clients.
   Le panneau VERSIONS de Surveillance a été oublié : le serveur rend `nom:''` pour un
   espace hors annuaire, l'écran retombait sur l'identifiant brut, et « elan-gestion » +
   « elan-gestion-beta » s'affichaient en liste avec leurs appareils bloqués, juste sous
   ELAN — la seule vraie cliente des trois. Capture de Justin à l'appui.

   Ce banc tient la règle par le FICHIER : tout repli « nom sinon identifiant » doit passer
   par nomTechnique(). Elle rend `t` inchangé pour tout le reste, donc l'ajouter ne coûte
   rien et l'oublier se voit. */
const fs = require('fs'), path = require('path');
const tour = fs.readFileSync(path.join(__dirname, '..', 'tour.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 682 · aucun identifiant technique affiché comme nom d\'entreprise ──');

/* La fonction, extraite du vrai fichier — la recopier ne prouverait rien du livré. */
const src = tour.match(/function nomTechnique\(t\)\{[\s\S]*?\n\}/);
v('nomTechnique est trouvée dans tour.html', !!src, true);
if (src) {
  const f = new Function(src[0] + '; return nomTechnique;')();
  v('l\'espace par défaut porte le nom de TEAM OP', f('elan-gestion'), 'Espace par défaut — TEAM OP');
  v('la bêta aussi', f('elan-gestion-beta'), 'Bêta TEAM OP');
  /* Le point qui rend l'ajout SANS RISQUE partout : elle ne touche à rien d'autre. */
  v('⛔ elle rend tout autre identifiant inchangé', f('elan-34oc'), 'elan-34oc');
  v('… y compris une chaîne vide', f(''), '');
}

/* ⛔ LA RÈGLE : plus aucun `x.nom||x.t` nu. C'est la forme exacte qui a laissé passer le
   panneau VERSIONS ; si elle réapparaît, un identifiant technique réapparaît avec elle. */
const nus = (tour.match(/\.nom *\|\| *[a-z]\.t\b(?!\w)/g) || []);
v('⛔ aucun repli « nom sinon identifiant » qui court-circuite nomEspace', nus, []);

/* La fonction commune existe, et elle repasse bien par nomTechnique — sans quoi tous les
   points d'appel ci-dessous seraient branchés sur rien. */
const src2 = tour.match(/function nomEspace\(nom,t\)\{[^\n]*\}/);
v('nomEspace est définie en un seul endroit', !!src2, true);
if (src2 && src) {
  const g = new Function(src[0] + '\n' + src2[0] + '; return nomEspace;')();
  v('un espace technique sans nom prend le nom de TEAM OP', g('', 'elan-gestion'), 'Espace par défaut — TEAM OP');
  v('la bêta aussi', g('', 'elan-gestion-beta'), 'Bêta TEAM OP');
  v('⛔ un vrai nom d\'entreprise passe devant tout', g('ELAN', 'elan-34oc'), 'ELAN');
  v('⛔ un espace ordinaire sans nom garde son identifiant', g('', 'elan-34oc'), 'elan-34oc');
}

/* Les cinq points d'appel : le panneau VERSIONS (le défaut constaté), la carte d'une
   cliente, l'initiale de l'avatar d'un espace technique, les deux replis du Courrier, et
   la fiche d'un code promo. Tous doivent passer par la fonction commune. */
const appels = (tour.match(/nomEspace\(/g) || []).length - 1;   // −1 : la définition
v('la fonction est branchée sur tous les points d\'affichage', appels >= 7, true);
v('le panneau VERSIONS nomme les espaces techniques',
  /sous\.map\(function\(x\)\{[\s\S]{0,400}?esc\(nomEspace\(x\.nom,x\.t\)\)/.test(tour), true);
v('la carte d\'une cliente aussi, par sécurité',
  /esc\(sigle\(nomEspace\(x\.nom,x\.t\)\)\)/.test(tour), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
