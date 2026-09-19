/* ⛔ CE QUE CE FICHIER GARDE — LES CINQ CORRECTIFS DU 19 SEPTEMBRE 2026 QU'AUCUN BANC NE VOYAIT.

   La troisième vérification les a nommés ensemble : on pouvait défaire chacun d'eux sans
   qu'une seule des 85 suites bouge. Un correctif sans banc n'est pas un correctif, c'est un
   coup de chance qui dure jusqu'à la prochaine refonte du fichier.

   Deux d'entre eux (`install.sh` et `poser-cle.js`) sont gardés par `tests/test-729.js`, qui
   les EXÉCUTE. Les trois autres vivent dans des fichiers d'interface — du balisage et un
   ternaire — qu'on ne peut pas exécuter sans navigateur. Ce banc lit donc le TEXTE des
   fichiers RÉELLEMENT SERVIS, et la preuve fonctionnelle vit dans une sonde du scratchpad,
   citée plus bas. C'est la règle du dépôt pour ce cas-là, pas un pis-aller.

   ⚠️ `app.html` ET `beta.html` : la bêta est régénérée depuis l'application, donc un correctif
   qui n'existe que dans l'une des deux est un correctif à moitié. Tout est vérifié en double. */

const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const lire = (f) => { try { return fs.readFileSync(path.join(RACINE, f), 'utf8'); } catch (e) { return ''; } };

console.log('\n── 730 · les correctifs du 19 septembre, gardés ──');

for (const f of ['app.html', 'beta.html']) {
  const SRC = lire(f);
  vrai('[' + f + '] le fichier est lisible', SRC.length > 100000);

  /* ══ 1. ⛔ L'IDENTIFIANT DE REDESSIN DES PHOTOS ════════════════════════════════════════
     Il était posé sur la tuile « 🔒 Stylo ✏️ pour ajouter » — c'est-à-dire sur UNE SEULE
     branche d'un ternaire, celle de la lecture seule. En mode ÉDITION, là où un technicien
     travaille vraiment, `getElementById('int-detail-photos')` rendait `null` :
     `intPhotosCombler` téléchargeait les photos du VPS, les mettait en mémoire… et ne
     redessinait JAMAIS. Les photos d'un collègue restaient invisibles jusqu'au changement
     d'onglet. Mesuré au navigateur avant et après (scratchpad/sonde-regreffe.js).
     On exige donc que l'identifiant soit porté par la GRILLE — le `<div style="display:grid`
     qui existe dans les deux modes — et qu'il n'apparaisse qu'UNE fois dans le balisage. */
  const poses = (SRC.match(/id="int-detail-photos"/g) || []).length;
  v('[' + f + '] ⛔ « int-detail-photos » n\'est posé qu\'UNE fois', poses, 1);
  const iId = SRC.indexOf('id="int-detail-photos"');
  const ligne = iId > 0 ? SRC.slice(SRC.lastIndexOf('\n', iId) + 1, SRC.indexOf('\n', iId)) : '';
  vrai('[' + f + '] ⛔ il est porté par la GRILLE, qui existe dans les deux modes',
    /display:grid/.test(ligne));
  /* ⛔ ET LE CONTRÔLE QUI COMPTE VRAIMENT : il ne doit pas être DANS une branche de ternaire.
     `${intEdit?`…`:`…`}` est la forme exacte du défaut. On regarde donc s'il y a un `${…?`
     ouvert entre le début de la ligne et l'identifiant. */
  const avantId = ligne.slice(0, ligne.indexOf('id="int-detail-photos"'));
  v('[' + f + '] ⛔ et JAMAIS dans une branche de ternaire', /\$\{[^}]*\?/.test(avantId), false);
  /* La contre-épreuve : le lecteur qui s'en sert doit exister, sinon on garde un identifiant
     que plus personne ne regarde. */
  vrai('[' + f + '] et quelqu\'un s\'en sert pour redessiner',
    /getElementById\('int-detail-photos'\)/.test(SRC));

  /* ══ 2. LE CODE PROMO MÉMORISÉ PAR LA PAGE D'ABONNEMENT ══════════════════════════════
     `recap-abonnement.html` range le code dans `teamop_promo_en_attente` quand le visiteur
     n'a pas encore d'espace. Si l'application ne le relit pas, la page a promis pour rien. */
  vrai('[' + f + '] promoEnAttente() existe', /function promoEnAttente\(\)/.test(SRC));
  vrai('[' + f + ']    et lit la clé que la page d\'abonnement écrit',
    /promoEnAttente[\s\S]{0,200}teamop_promo_en_attente/.test(SRC));
  vrai('[' + f + '] ⛔ le champ « Abonnement » est PRÉ-REMPLI avec',
    /id="promo-inp"[^>]*value="\$\{esc\(promoEnAttente\(\)\)\}"/.test(SRC));
  /* ⛔ ET IL S'EFFACE UNE FOIS SERVI. Sans ça, le code ressurgit dans le champ des mois plus
     tard, sur un espace où il a déjà été utilisé — et l'écran propose d'activer un code qui
     sera refusé, sans que personne comprenne d'où il sort. */
  vrai('[' + f + '] ⛔ et il est effacé une fois qu\'il a servi',
    /removeItem\('teamop_promo_en_attente'\)/.test(SRC));
  /* Un `value=""` non échappé serait une injection de balisage par le stockage local. */
  vrai('[' + f + ']    la valeur passe par esc()', /value="\$\{esc\(promoEnAttente\(\)\)\}"/.test(SRC));
}

/* ══ 3. LA PAGE D'ABONNEMENT ══════════════════════════════════════════════════════════════ */
{
  const R = lire('recap-abonnement.html');
  vrai('[recap-abonnement.html] le fichier est lisible', R.length > 10000);

  /* ⛔ `minmax(0, 1fr)` ET PAS `1fr`. Une piste `1fr` a pour taille minimale `auto` : elle
     refuse de descendre sous la largeur de son contenu, donc la grille déborde de l'écran
     d'un téléphone — sur la page où un prospect PAIE. */
  vrai('[recap-abonnement.html] ⛔ la grille étroite peut rétrécir (minmax(0, 1fr))',
    /\.grille\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);?\s*\}/.test(R));

  /* ⛔ ON NE RENVOIE PLUS UN VISITEUR SANS ESPACE VERS `app.html#promo=`. `promoAppliquer`
     exige la preuve de la clé d'équipe : un prospect atterrissait sur l'écran de connexion,
     le code perdu avec le hash, sans comprendre pourquoi. La redirection doit donc être
     GARDÉE par la présence d'un espace — jamais inconditionnelle. */
  const iRedir = R.indexOf("'app.html#promo='");
  vrai('[recap-abonnement.html] la redirection existe encore (pour qui A un espace)', iRedir > 0);
  const avant = R.slice(Math.max(0, iRedir - 900), iRedir);
  vrai('[recap-abonnement.html] ⛔ et elle est GARDÉE par « cet appareil a-t-il un espace ? »',
    /if\s*\(aUnEspace\)/.test(avant) && /elan_sync_team/.test(avant));
  vrai('[recap-abonnement.html]    sinon le code est mémorisé pour plus tard',
    /setItem\('teamop_promo_en_attente'/.test(R));

  /* ⛔ ET LE PAIEMENT PORTE LA RÉFÉRENCE DE L'ESPACE — sans elle, le correctif Stripe du
     serveur est inerte. Le chemin complet est exercé par `tests/test-727.js` ; ici on garde
     seulement le fait que la page la lit. */
  vrai('[recap-abonnement.html] ⛔ le paiement envoie la référence de l\'espace',
    /ref:\s*espaceRattacheRef\(\)/.test(R));

  /* ⛔ ON NE SE PORTE PAS GARANT D'UN STOCKAGE LOCAL. « Nous avons noté votre code » n'était
     vrai que sur CE navigateur : le prospect change d'appareil et le code a disparu. */
  v('[recap-abonnement.html] ⛔ la page ne promet plus d\'avoir « noté » le code',
    /nous avons noté votre code/i.test(R), false);
  vrai('[recap-abonnement.html]    elle le donne en clair, à noter', /Notez-le\s*:/.test(R));
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
