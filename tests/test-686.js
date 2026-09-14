/* ══ LA PAGE DE CONNEXION PRÉSENTAIT L'ESPACE DE REPLI COMME UNE ENTREPRISE ═══════════════
   Capture de Justin, 14 septembre 2026, sur son téléphone :
     « Ton appareil est déjà relié à ton entreprise · 🏢 Ton espace : elan-gestion »
   suivie des trois cartes d'applications. Or `elan-gestion` N'EST PAS une entreprise : c'est
   l'espace de repli, partagé par toutes celles qui n'ont jamais reçu de clé personnalisée —
   exactement l'endroit où personne ne doit travailler. La page l'annonçait comme un fait
   acquis, invitait à entrer dans les applications, et la seule issue était un lien bleu de
   douze pixels. Cinq personnes d'ELAN y travaillent encore à cause de ça.

   MESURÉ au navigateur à 390 px (scratchpad/sonde-cnx-repli.js), avant/après :
     avant — sous-titre « déjà relié à ton entreprise », cartes d'apps offertes, pas de champ
     après — « Cet appareil n'est relié à aucune entreprise », avertissement ambre, champ
             d'adresse OFFERT, cartes d'apps masquées, les trois sorties présentes
   Et le cas témoin (vraie entreprise) est inchangé : cartes offertes, pas de champ. */
const fs = require('fs'), path = require('path');
const cnx = fs.readFileSync(path.join(__dirname, '..', 'connexion.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 686 · l\'espace de repli n\'est plus présenté comme une entreprise ──');

/* Les deux identifiants de repli sont nommés ici comme côté serveur (ESPACES_INTOUCHABLES).
   Une seule oubliée et la moitié des appareils garde le défaut. */
v('les deux espaces de repli sont reconnus',
  /var REPLI=\['elan-gestion','elan-gestion-beta'\];/.test(cnx), true);
v('⛔ un appareil sur le repli ne s\'entend plus dire qu\'il est relié à son entreprise',
  /if\(_esp&&REPLI\.indexOf\(_esp\)>=0&&!adr\)\{[\s\S]{0,200}Cet appareil n’est relié à aucune entreprise/.test(cnx), true);
v('… on lui dit ce que ça change pour son travail, pas juste « erreur »',
  /ce que tu y saisis ne rejoint pas ton équipe/.test(cnx), true);

/* ⛔ LE POINT QUI COMPTE LE PLUS : on AJOUTE l'avertissement, on ne remplace pas le bloc.
   Il porte le champ d'adresse et les deux autres sorties ; les écraser laisserait la
   personne devant une explication sans aucun moyen d'en sortir — le défaut qu'on corrige. */
v('⛔ l\'avertissement s\'insère AVANT le bloc, sans l\'écraser',
  /br\.insertBefore\(av,br\.firstChild\);/.test(cnx), true);
const bloc = cnx.slice(cnx.indexOf('REPLI.indexOf(_esp)'), cnx.indexOf('Appareil relié à une VRAIE entreprise'));
v('⛔ et la branche du repli ne touche jamais à innerHTML du bloc', /br\.innerHTML/.test(bloc), false);
v('… ni ne montre les cartes d\'applications', /cartes-apps/.test(bloc), false);

/* Le cas ordinaire n'a pas bougé — sauf la sortie, qui n'était pas cliquable au doigt.
   ⚠️ On isole la branche par ses ACCOLADES, jamais par un nombre de caractères : une fenêtre
   fixe casse le jour où un libellé s'allonge, et apprend à élargir un nombre plutôt qu'à
   vérifier. La leçon vient du banc 645, cassé ce soir-là pour cette raison exacte. */
(function(){
  const d = cnx.indexOf('if(_esp&&!adr){');
  v('la branche « vraie entreprise » est trouvée', d > 0, true);
  if (d < 0) return;
  let n = 0, f = d;
  for (let i = cnx.indexOf('{', d); i < cnx.length; i++) {
    if (cnx[i] === '{') n++; else if (cnx[i] === '}') { n--; if (!n) { f = i; break; } } }
  const br = cnx.slice(d, f + 1);
  v('une vraie entreprise garde ses cartes d\'applications', /cartes-apps/.test(br), true);
  v('… et son nom lui est montré', /Ton espace/.test(br), true);
})();
v('⛔ « Changer d\'entreprise » est une cible de 44 px, plus un lien de douze pixels',
  /Changer d\\'entreprise<\/a>/.test(cnx) && /min-height:44px[^']*">Changer d/.test(cnx), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
