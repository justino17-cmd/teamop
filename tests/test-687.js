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

   Trois choses à tenir ici, et la troisième est celle qui protège les gens.

   ⛔ 25 SEPTEMBRE 2026 — LA SORTIE DE FIREBASE A CHANGÉ LE CHEMIN, PAS LA RÈGLE. Il n'y a plus de
   jeton d'équipe : la synchro parle au serveur par `docEquipe` (app.html), et la même porte
   (`sauvRefus`, `cleEstPublique`) garde désormais le document lui-même (`server/documents.js`).
   Le refus remonte par `docRefusVu`, qu'on EXÉCUTE ici plutôt que de le relire. Le parcours
   complet — la vraie page contre le vrai serveur, coupure réseau comprise — est dans `test-810`. */
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

/* 1. La porte, côté serveur — elle ne doit pas s'ouvrir par inadvertance. Le document d'équipe
      d'abord (c'est lui que la synchro lit et écrit depuis la v748), puis l'ancien jeton, qui sert
      encore les appareils restés en v747 et avant tant que Firebase n'est pas éteint. */
const DOCS = fs.readFileSync(path.join(R, 'server', 'documents.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
const porte = (DOCS.match(/function porte\(t, kh\) \{[\s\S]*?\n  \}/) || [''])[0];
v('le document d\'équipe passe par la même garde que la sauvegarde (repli, fermé, clé)',
  /const r = sauvRefus\(t, kh, 'synchro'\);\s*if \(r\) \{/.test(porte), true);
v('… et refuse toute entreprise restée sur la clé partagée (409)',
  /if \(cleEstPublique\(t\)\) return \{ code: 409/.test(porte), true);
v('les trois routes du document passent par cette porte',
  (DOCS.match(/const refus = porte\(t, kh\); if \(refus\) return refuser\(res, refus\.code/g) || []).length, 3);
v('l\'ancien jeton refuse toujours l\'espace de repli',
  /const refus = sauvRefus\(t, kh, 'jeton'\); if \(refus\) return res\.status\(refus\.code\)/.test(SRV), true);
v('… et toute entreprise restée sur la clé partagée',
  /if \(cleEstPublique\(t\)\) return res\.status\(409\)/.test(SRV), true);

/* ⛔ LES DEUX PAGES, PAS UNE : ce banc garde aussi le déploiement du serveur SEUL, qui le lance
   contre l'`app.html` de `main` — la v695, où le refus arrive encore par le jeton Firebase. */
const V748 = APP.indexOf('function docEquipe(') >= 0;
if (V748) {
/* 2. Le refus remonte — et SEULEMENT le refus. On EXÉCUTE la vraie `docRefusVu` sur chaque statut
      que l'adaptateur peut rendre : un motif sur le texte garderait une phrase, pas un comportement. */
const corps = (sig) => { const d = APP.indexOf(sig); if (d < 0) return '';
  let n = 0; for (let i = APP.indexOf('{', d); i < APP.length; i++) { if (APP[i] === '{') n++; else if (APP[i] === '}') { n--; if (!n) return APP.slice(d, i + 1); } } return ''; };
const vu = corps('function docRefusVu(');
v('docRefusVu existe', vu.length > 40, true);
const jouer = (e) => { const f = new Function('e', 'let _jetonRefus=null; const dits=[]; function jetonRefusEcran(){ dits.push(_jetonRefus); }\n' + vu + '\ndocRefusVu(e); return dits;');
  return f(e); };
v('⛔ un 403 ou un 409 est retenu comme définitif, avec son motif',
  [jouer({ statut: 403, motif: 'repli' }), jouer({ statut: 409, motif: 'cle_partagee' })],
  [[{ statut: 403, motif: 'repli' }], [{ statut: 409, motif: 'cle_partagee' }]]);
v('⛔ tout le reste reste muet : un réseau capricieux n\'arrête personne sur un chantier',
  [0, 400, 404, 413, 426, 429, 500, 503].map(st => jouer({ statut: st, motif: 'x' }).length), [0, 0, 0, 0, 0, 0, 0, 0]);
v('… ni une erreur sans statut, ni rien du tout', [jouer(new Error('réseau')).length, jouer(null).length], [0, 0]);
/* Et la page s'en sert aux DEUX endroits où un refus définitif arrive : la file d'écriture et
   l'écoute. Code seul, commentaires retirés. */
const eq = corps('function docEquipe(').replace(/\/\*[\s\S]*?\*\//g, ' ');
v('⛔ la file d\'écriture et l\'écoute appellent docRefusVu sur leur refus définitif',
  [/const e=docErreur\(r\.statut,r\.j&&r\.j\.motif\); const tous=lot\.attentes\.splice\(0\); docRefusVu\(e\);/.test(eq),
   /const refus=e=>\{ actif=false; arreter\(\); docRefusVu\(e\);/.test(eq)], [true, true]);

} else {
/* 2 (v695). Le refus du JETON remonte — et SEULEMENT le refus (le bloc d'avant la sortie, tel quel). */
v('⛔ un 403 ou un 409 est retenu comme définitif',
  /if\(statut===403\|\|statut===409\)\{ _jetonRefus=\{statut:statut/.test(APP), true);
v('⛔ tout le reste reste muet : un réseau capricieux n\'arrête personne sur un chantier',
  /let j=\{\},statut=0;/.test(APP) && !/if\(statut!==200/.test(APP), true);
}

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
