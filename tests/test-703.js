/* ══ LA RUBRIQUE D'UN RAPPORT D'ERREUR MENTAIT PAR CONSTRUCTION ═══════════════════════════

   Dossier de la console TEAM OP, 15 septembre 2026 : ELAN, iPhone · Safari, **rubrique
   « Plans »**, « Promesse rejetée : Attempt to get records from database without an
   in-progress transaction ».

   L'écran Plans ne contient pas une ligne d'IndexedDB. La rubrique ne désignait rien : `tmCat()`
   nomme l'écran OUVERT au moment de l'incident, et une promesse rejetée par un travail de fond
   (le poll de Firebase Auth, ici) tombe sous n'importe lequel. Le diagnostic est parti chercher
   au mauvais endroit.

   ⛔ ET CE N'ÉTAIT PAS QU'UN LIBELLÉ INTERNE. Cette même valeur partait dans le COURRIEL AU
   CLIENT à la clôture : « un dysfonctionnement mineur sur Plans ». On allait annoncer à une
   entreprise qu'on avait réparé un écran où rien n'était cassé — c'est faux, et ça fait douter
   d'un écran qui marche.

   Trois corrections, et ce banc les tient :
     1. l'application calcule l'ORIGINE réelle — le premier cadre nommé de la pile ;
     2. la Tour dit « Écran ouvert » au lieu de « Catégorie », et montre l'origine à côté ;
     3. le courriel au client ne nomme plus aucun écran. Ne rien nommer vaut mieux que nommer
        au hasard : le client a besoin de savoir que c'est réglé, pas où.

   ⚠️ `tmOrigine` est extraite du fichier livré et EXÉCUTÉE sur de vraies piles — deux familles
   de navigateurs, parce que les téléphones de terrain sont des deux côtés. Une fonction qui lit
   du texte produit par quelqu'un d'autre se teste sur ce texte-là, pas sur l'idée qu'on s'en
   fait. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
const TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

/* ⛔ CE BANC NE GARDE QUE CE QUI EST EN LIGNE — 15 septembre 2026 au soir. Les trois moitiés
   ont été écrites ensemble, mais Justin n'en a publié que deux : le serveur et la Tour, qui
   réparent un dégât existant. La moitié APPLICATION (`tmOrigine`, qui lit la pile) attend sa
   phrase, avec son propre banc (`tests/test-704.js`, sur la branche de travail).
   Garder ici des contrôles sur du code non publié mettrait la suite au rouge sur `main` pour
   une raison qui n'est pas un défaut — et une suite qui rougit sans défaut, on finit par ne
   plus la lire. Les deux bancs se rejoindront quand la v692 sortira. */

console.log('\n── 703 · 2. l\'origine voyage, et la Tour dit ce que chaque champ EST ──');
v('la Tour ne dit plus « Catégorie »', /fait\('Catégorie'/.test(TOUR), false);
v('… elle dit « Écran ouvert », et prévient que ce n\'est pas la cause',
  /fait\('Écran ouvert'[\s\S]{0,140}pas forcément la cause/.test(TOUR), true);
/* ⛔ ET ELLE DOIT TOLÉRER SON ABSENCE, puisque aucun client ne l'envoie encore : la moitié
   application n'est pas publiée. Une Tour qui afficherait « Origine : — » sur tous les dossiers
   d'aujourd'hui ajouterait un champ vide partout, et donnerait à croire qu'on a perdu une
   information qu'on n'a jamais eue. La ligne n'existe que si la valeur existe. */
v('… elle montre l\'origine quand l\'application a su la calculer',
  /i\.origine\?fait\('Origine'/.test(TOUR), true);
v('⛔ … et n\'affiche RIEN quand elle est absente (le parc actuel ne l\'envoie pas)',
  /i\.origine\?fait\('Origine'[\s\S]{0,260}:''\)\+/.test(TOUR), true);
v('le texte à copier ne pousse la ligne que si elle existe',
  /if\(i\.origine\) d\.push\('ORIGINE/.test(TOUR), true);
v('le texte à copier distingue les deux, lui aussi',
  /\\u00c9CRAN OUVERT/.test(TOUR) && /if\(i\.origine\) d\.push\('ORIGINE/.test(TOUR), true);

console.log('\n── 703 · 3. le courriel au client ne nomme plus un écran au hasard ──');
/* ⛔ LE POINT QUI SORT DU DÉPÔT. Ce texte part chez une entreprise qui paie. */
/* ⚠️ On vise LA LIGNE qui compose le texte, pas une fenêtre autour : la fenêtre attrapait le
   commentaire qui explique pourquoi `issue.categorie` n'y est plus, et le banc se mettait au
   rouge sur son propre pourquoi. Un test qui lit les commentaires ne teste rien. */
/* ⚠️ Et on vise la BONNE ligne : `server/index.js` contient trois `const texte = 'Bonjour,`
   (annonce de mise à jour, espace prêt, clôture d'incident). Le premier match attrapait
   l'annonce, et le banc jugeait un texte qui n'a rien à voir. Une ancre qui n'est pas unique
   n'est pas une ancre. */
const ligneTexte = (SRV.match(/^\s*const texte = 'Bonjour,[^\n]*surveillance[^\n]*$/m) || [''])[0];
v('la ligne du courriel de clôture est trouvée', ligneTexte.length > 80, true);
v('⛔ elle ne contient plus `issue.categorie`', /issue\.categorie/.test(ligneTexte), false);
v('… et elle dit simplement « votre application »',
  /dysfonctionnement mineur sur votre application/.test(ligneTexte), true);
/* Le serveur accepte le champ, mais ne le croit pas sur parole : /api/monitor/report n'exige
   aucune preuve, donc tout ce qui en vient est borné et filtré. */
v('le serveur borne `origine` et n\'en garde que des caractères de nom de fonction',
  /origine: monStr\(r\.origine, 60\)\.replace\(\/\[\^A-Za-z0-9_\.\$\]\/g, ''\)\.slice\(0, 60\) \|\| undefined/.test(SRV), true);
v('le récapitulatif interne dit « écran ouvert », plus « rubrique »',
  /écran ouvert : ' \+ \(issue\.categorie/.test(SRV) && !/rubrique : ' \+ \(issue\.categorie/.test(SRV), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
