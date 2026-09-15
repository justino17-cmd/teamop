/* ══ L'ESPACE PAR DÉFAUT : LA SYNCHRO ÉTAIT MORTE, LA PORTE ÉTAIT RESTÉE OUVERTE ══════════

   Justin, 15 septembre 2026 : « que plus personne ne se connecte et que ce ne soit pas
   n'importe où et que n'importe qui se connecte ».

   Audit des routes, ce jour-là :
     /api/fb/jeton            ✅ fermée (403 par sauvRefus) depuis la v672
     /api/espaces/sauvegarde  ✅ fermée (403 par sauvRefus)
     /api/espaces/connexion   ⛔ OUVERTE — on pouvait encore s'y connecter par identifiant
     /api/espaces/comptes     ⛔ OUVERTE — un appareil pouvait encore y déposer des comptes

   Un espace sans nuage où des gens travaillent quand même est PIRE qu'un espace fermé : ils
   saisissent, rien ne part, et personne ne le voit. C'est exactement ce qui est arrivé aux
   techniciens d'ELAN restés dessus.

   ⚠️ LA BÊTA EST DANS LA MÊME LISTE ET NE DOIT RIEN PERDRE. Elle n'a jamais déposé d'annuaire
   (`annuaireDeposer` sort sur `BETA_ESSAI`), donc la route de connexion lui répondait déjà
   « sans-annuaire » ; ses accès vivent dans `beta-comptes.json`, gérés par la Tour. */
const fs = require('fs'), path = require('path');
const SRV = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}
console.log('\n── 697 · on ne se connecte plus à l\'espace par défaut ──');

/* ⛔ PAS DE FENÊTRE DE N CARACTÈRES. Quatre tests s'y sont cassés ce mois-ci : la fenêtre
   s'arrête avant la fin de la route, `indexOf` rend -1, et la comparaison passe au vert ou au
   rouge pour une raison qui n'a rien à voir avec le code. On compte les accolades. */
const route = (chemin) => {
  const i = SRV.indexOf("app.post('" + chemin + "'");
  if (i < 0) return '';
  let n = 0;
  for (let k = SRV.indexOf('{', i); k < SRV.length; k++) {
    if (SRV[k] === '{') n++; else if (SRV[k] === '}') { n--; if (!n) return SRV.slice(i, k + 1); } }
  return '';
};
const CNX = route('/api/espaces/connexion'), CPT = route('/api/espaces/comptes');
v('les deux routes sont trouvées', [!!CNX, !!CPT], [true, true]);

v('⛔ la connexion refuse un espace intouchable', /if \(t && ESPACES_INTOUCHABLES\.includes\(t\)\)/.test(CNX), true);
v('… avec un motif qui le NOMME, pas un refus générique', /motif: 'technique'/.test(CNX), true);
v('… et un message qui dit quoi faire', /Utilise le lien de ton entreprise/.test(CNX), true);
v('⛔ le dépôt d\'annuaire aussi', /if \(ESPACES_INTOUCHABLES\.includes\(t\)\)\n    return res\.status\(403\)\.json\(\{ error: 'Espace par défaut/.test(SRV), true);

/* La garde vient AVANT tout calcul coûteux : un refus ne doit pas faire tourner PBKDF2. */
const iGarde = CNX.indexOf('ESPACES_INTOUCHABLES'), iPbk = CNX.indexOf('crypto.pbkdf2');
v('le corps entier de la route est bien extrait (les deux repères sont là)', [iGarde > 0, iPbk > 0], [true, true]);
v('⛔ la garde de connexion est posée avant la vérification du mot de passe',
  iGarde > 0 && iPbk > 0 && iGarde < iPbk, true);
/* Et le refus d'un intouchable doit être distinct du refus « identifiant inconnu » — sinon
   quelqu'un cherche un mot de passe pendant une heure au lieu de changer d'adresse. */
v('⛔ il ne se confond pas avec le refus générique',
  CNX.indexOf("motif: 'technique'") < CNX.indexOf("'Entreprise, identifiant ou mot de passe incorrect.'")
  || /motif: 'technique'/.test(CNX), true);

/* Ce qui était DÉJÀ fermé et doit le rester. */
v('sauvRefus refuse toujours l\'espace de repli',
  /if \(ESPACES_INTOUCHABLES\.includes\(t\)\) return \{ code: 403, error: 'pas de '/.test(SRV), true);
v('⛔ /api/fb/jeton passe toujours par sauvRefus', /const refus = sauvRefus\(t, kh, 'jeton'\)/.test(SRV), true);

/* ⚠️ La bêta : rien ne doit changer pour elle. */
v('⛔ la bêta ne dépose toujours aucun annuaire', /if\(_annuaireEnCours\|\|BETA_ESSAI\) return;/.test(APP), true);
v('… et les deux espaces techniques sont bien les mêmes qu\'avant',
  /const ESPACES_INTOUCHABLES = \['elan-gestion', 'elan-gestion-beta'\];/.test(SRV), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
