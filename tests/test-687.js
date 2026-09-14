/* ══ UN BANNISSEMENT QUE PERSONNE NE VOIT N'EN EST PAS UN ════════════════════════════════
   Demande de Justin, 14 septembre 2026 : « force les déconnexions à tout le monde, et bannis
   ce lien-là, elan-gestion ».

   Le bannissement EXISTAIT DÉJÀ, et depuis longtemps : /api/fb/jeton refuse l'espace de
   repli (403, via sauvRefus) et toute entreprise restée sur la clé écrite en clair dans
   app.html (409, via cleEstPublique). Ce qui manquait n'était pas la porte, c'était de le
   DIRE : fbJetonEquipe() rendait `''` aussi bien sur un refus que sur un délai réseau.
   L'appareil repartait en anonyme, la règle Firestore ne lui donnait rien, et l'application
   continuait comme si de rien n'était. Mesuré chez ELAN : cinq personnes saisissaient tous
   les jours dans un espace coupé, sans qu'aucun écran ne le dise.

   Trois choses à tenir ici, et la troisième est celle qui protège les gens. */
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

console.log('\n── 687 · l\'appareil coupé du nuage l\'apprend, au lieu de saisir dans le vide ──');

/* 1. La porte, côté serveur — elle ne doit pas s'ouvrir par inadvertance. */
v('le serveur refuse toujours le jeton à l\'espace de repli',
  /const refus = sauvRefus\(t, kh, 'jeton'\); if \(refus\) return res\.status\(refus\.code\)/.test(SRV), true);
v('… et à toute entreprise restée sur la clé partagée',
  /if \(cleEstPublique\(t\)\) return res\.status\(409\)/.test(SRV), true);

/* 2. Le refus remonte — et SEULEMENT le refus. */
v('⛔ un 403 ou un 409 est retenu comme définitif',
  /if\(statut===403\|\|statut===409\)\{ _jetonRefus=\{statut:statut/.test(APP), true);
v('⛔ tout le reste reste muet : un réseau capricieux n\'arrête personne sur un chantier',
  /let j=\{\},statut=0;/.test(APP) && !/if\(statut!==200/.test(APP), true);

/* 3. ⛔ CE QUI PROTÈGE LES GENS. La base locale est la SEULE copie de ce qui a été saisi
      depuis la coupure, et rejoindre une entreprise passe par espaceQuitter(), qui l'efface.
      L'export doit donc être proposé AVANT le rattachement — sinon on répare notre défaut en
      détruisant le travail de quelqu'un. */
/* ⚠️ La fonction s'isole par ses ACCOLADES, jamais par un nombre de caractères : une fenêtre
   fixe casse le jour où un libellé s'allonge et apprend à élargir un nombre plutôt qu'à
   vérifier. Troisième fois ce soir que ce raccourci se retourne — il ne sera pas repris. */
const ec = (function(){
  const d = APP.indexOf('function jetonRefusEcran()');
  if (d < 0) return '';
  let n = 0, f = d;
  for (let i = APP.indexOf('{', d); i < APP.length; i++) {
    if (APP[i] === '{') n++; else if (APP[i] === '}') { n--; if (!n) { f = i; break; } } }
  return APP.slice(d, f + 1);
})();
v('l\'écran de refus existe', ec.length > 100, true);
v('⛔ il propose d\'ENREGISTRER les données avant tout', /exportData\(\)/.test(ec), true);
v('⛔ et l\'export vient AVANT le rattachement dans l\'ordre des boutons',
  ec.indexOf('exportData()') < ec.indexOf('connexion.html'), true);
v('il donne la sortie : la page de connexion', /connexion\.html/.test(ec), true);
v('il dit ce que ça change POUR LE TRAVAIL, pas juste « erreur »',
  /Rien de ce qui est saisi ici ne rejoint ton équipe/.test(ec), true);

/* ⛔ LA BÊTA VIT SUR L'ESPACE DE REPLI PAR CONSTRUCTION (préfixe elanB_, espace
   elan-gestion-beta) : elle reçoit le même 403. La bloquer arrêterait tout le développement,
   et elle n'a jamais de données d'entreprise — rien à protéger, rien à dire. */
v('⛔ la bêta n\'est jamais bloquée par cet écran',
  /indexOf\('elanB_'\)===0\) return;/.test(ec), true);
/* Une seule fois : l'écran se pose, il ne se redessine pas à chaque tentative de synchro. */
v('l\'écran ne se repose pas en boucle', /if\(_jetonEcranDit\|\|!_jetonRefus\) return; _jetonEcranDit=true;/.test(APP), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
