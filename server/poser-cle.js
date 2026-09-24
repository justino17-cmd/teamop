#!/usr/bin/env node
/* ══ POSER LA CLÉ MAÎTRE DU SOCLE SUR UN SERVEUR DÉJÀ INSTALLÉ ══════════════════════════════
 *
 * ⛔ POURQUOI CE FICHIER EXISTE. `install.sh` pose la clé — mais il ne tourne QU'À
 * L'INSTALLATION. `.github/workflows/deploiement.yml` fait un `git pull` et un
 * `systemctl restart` : il ne l'exécute jamais. Sur le VPS de production, installé avant que
 * le socle existe, la clé n'arriverait donc JAMAIS. Et le jour où `socle.actif` passe à `true`,
 * ce ne sont pas les données qui cassent en premier — ce sont les QUATRE PORTES DE FERMETURE
 * de la Tour, parce que `socleCouper()` a besoin de la clé pour fermer une entreprise.
 *
 * ⛔ CE QU'IL NE FAIT JAMAIS : remplacer une clé existante. Une clé neuve sur des bases
 * existantes rend les données de toutes les entreprises définitivement illisibles — le nuage
 * ne stocke que du chiffré. Le serveur refuse déjà de les ouvrir dans ce cas ; cet outil ne
 * doit pas pouvoir contourner ce refus par mégarde.
 *
 * Sur le VPS :
 *     node /opt/teamop/repo/server/poser-cle.js              → état, et génère si absente
 *     node /opt/teamop/repo/server/poser-cle.js <64 hexa>    → pose une clé du séquestre
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const DIR = process.env.TEAMOP_KEK_DIR || '/etc/teamop';
const CHEMIN = path.join(DIR, 'kek');
const DATA_DIR = process.env.TEAMOP_DATA || '/opt/teamop/data';
const SOCLE_DIR = path.join(DATA_DIR, 'socle');

const dit = (...a) => console.log(...a);

/* ⛔ « INSTALLATION NEUVE » NE SE DÉCIDE PAS SUR LES SEULES BASES. L'annuaire porte les clés
   de toutes les entreprises : s'il existe, des données chiffrées existent, même si aucun
   `base.db` n'est encore là (une entreprise créée sans écriture, une restauration en cours).
   Générer une clé neuve là-dessus rendrait ces DEK illisibles pour toujours. */
function bases() {
  let n = 0;
  try { n = fs.readdirSync(SOCLE_DIR).filter(d => fs.existsSync(path.join(SOCLE_DIR, d, 'base.db'))).length; } catch (e) {}
  if (!n && fs.existsSync(path.join(DATA_DIR, 'socle-annuaire.db'))) n = 1;   // l'annuaire compte
  return n;
}

/* ⛔ POSER LA CLÉ NE SUFFIT PAS : ENCORE FAUT-IL QUE LE SERVICE LA LISE. La ligne
   `LoadCredential=` vit dans `install.sh`, qui ne tourne QU'À L'INSTALLATION — jamais au
   déploiement. Sur le VPS de production, installé avant que le socle existe, la clé serait
   donc posée dans un fichier que le serveur ne regarde pas, pendant que cet outil annonce
   « ✅ posée ». Un `drop-in` systemd est ADDITIF : il complète l'unité sans la réécrire, donc
   sans risquer d'effacer ce que `install.sh` y a mis d'autre. */
const DROPIN_DIR = process.env.TEAMOP_DROPIN_DIR || '/etc/systemd/system/teamop-api.service.d';
const DROPIN = path.join(DROPIN_DIR, 'kek.conf');
function unitePrete() {
  try { return /LoadCredential\s*=\s*teamop_kek:/.test(fs.readFileSync(DROPIN, 'utf8')); } catch (e) {}
  /* Une unité principale qui porte déjà la ligne (installation faite après le socle) suffit. */
  for (const u of ['/etc/systemd/system/teamop-api.service', '/lib/systemd/system/teamop-api.service']) {
    try { if (/LoadCredential\s*=\s*teamop_kek:/.test(fs.readFileSync(u, 'utf8'))) return true; } catch (e) {}
  }
  return false;
}
function poserUnite() {
  fs.mkdirSync(DROPIN_DIR, { recursive: true });
  fs.writeFileSync(DROPIN, '# Posé par server/poser-cle.js — la clé maître du socle vit HORS de /opt.\n'
    + '# systemd la dépose dans un répertoire éphémère, effacé à l\'arrêt du service ; le serveur\n'
    + '# la lit par $CREDENTIALS_DIRECTORY et ne la voit nulle part ailleurs.\n'
    + '[Service]\nLoadCredential=teamop_kek:' + CHEMIN + '\n');
}

function existante() {
  try { const v = fs.readFileSync(CHEMIN, 'utf8').trim(); return /^[0-9a-fA-F]{64}$/.test(v) ? v : null; }
  catch (e) { return null; }
}

function poser(hex) {
  fs.mkdirSync(DIR, { recursive: true });
  try { fs.chmodSync(DIR, 0o700); } catch (e) {}
  /* Écriture puis droits AVANT que la clé existe en clair dans un fichier lisible : on crée
     avec 0600 d'emblée plutôt que d'écrire puis de resserrer. */
  fs.writeFileSync(CHEMIN, hex, { mode: 0o600 });
  try { fs.chmodSync(CHEMIN, 0o600); } catch (e) {}
}

const arg = String(process.argv[2] || '').trim();
const deja = existante();
const n = bases();

dit('');
dit('  Clé maître du socle — ' + CHEMIN);
dit('  bases d\'entreprise présentes : ' + n);
dit('');

/* ⛔ LE RÉGLAGE SYSTEMD NE SE POSE QU'UNE FOIS LA CLÉ ÉCRITE, ET JAMAIS AVANT. Il était posé
   EN PREMIER, avant même de savoir si une clé existait — et il restait en place sur les
   chemins qui sortent en erreur. Conséquence : l'opérateur lance ce script sans avoir la clé
   du séquestre sous la main (ou colle une valeur mal formée), le script refuse et sort en 1 —
   mais le drop-in `LoadCredential=teamop_kek:/etc/teamop/kek` est déjà là, pointant sur un
   fichier qui n'existe pas. ⚠️ systemd REFUSE de démarrer une unité dont une source de
   `LoadCredential` manque : au prochain redémarrage, l'API ne repart plus DU TOUT. Un outil
   censé réparer une clé absente mettait donc toute la plateforme à terre — les ~30 personnes
   d'ELAN comprises — pour avoir été lancé une minute trop tôt.
   La règle est simple et vaut aussi pour `install.sh` : **la clé d'abord, le réglage qui la
   lit ensuite.** Jamais l'inverse, jamais sur un chemin d'erreur. */
function assurerUnite() {
  if (unitePrete()) { dit('  → réglage systemd déjà en place (le service lira la clé)'); return; }
  try { poserUnite(); dit('  → réglage systemd ajouté : ' + DROPIN);
        dit('    ⚠️ il ne prendra effet qu\'après : systemctl daemon-reload && systemctl restart teamop-api'); }
  catch (e) { dit('  ⚠️ réglage systemd NON posé (' + (e.code || 'erreur') + ') — le serveur ne lira PAS la clé.');
              dit('     À ajouter à la main dans [Service] de teamop-api.service :');
              dit('        LoadCredential=teamop_kek:' + CHEMIN); }
}

if (deja) {
  assurerUnite();   // la clé est là : le réglage qui la lit peut l'être aussi
  dit('');
  dit('  ✅ Une clé est DÉJÀ posée. On n\'y touche pas.');
  dit('');
  dit('     La remplacer rendrait les données de toutes les entreprises définitivement');
  dit('     illisibles. Si tu crois qu\'elle est fausse, ne la remplace pas : compare-la à');
  dit('     celle du séquestre AVANT de faire quoi que ce soit.');
  dit('');
  dit('     Pour vérifier que le service la lit bien :');
  dit('        systemctl restart teamop-api && curl -s localhost:8080/health | grep -o \'"socle":{[^}]*}\'');
  dit('     → « "cle":true » veut dire qu\'elle est lue.');
  dit('');
  process.exit(0);
}

if (arg) {
  if (!/^[0-9a-fA-F]{64}$/.test(arg)) {
    console.error('  ✗ Attendu : 64 caractères hexadécimaux (celle du séquestre, telle quelle).');
    process.exit(1);
  }
  poser(arg.toLowerCase());
  assurerUnite();   // ⛔ APRÈS l'écriture, jamais avant
  dit('');
  dit('  ✅ Clé du séquestre posée.');
  dit('');
  dit('     systemctl restart teamop-api');
  dit('');
  process.exit(0);
}

/* ⛔ ON NE GÉNÈRE UNE CLÉ NEUVE QUE S'IL N'Y A AUCUNE BASE. Avec des bases existantes, une clé
   absente est un INCIDENT — quelqu'un a perdu la clé, ou l'annuaire vient d'ailleurs — et
   générer là-dessus détruit tout en donnant l'illusion d'avoir réparé. */
if (n > 0) {
  console.error('  ⛔ ' + n + ' base(s) d\'entreprise existent et la clé est ABSENTE.');
  console.error('');
  console.error('     C\'est un INCIDENT, pas une installation neuve. NE PAS générer de clé :');
  console.error('     elle ne déchiffrerait rien et rendrait tout retour en arrière impossible.');
  console.error('');
  console.error('     Récupérer la clé du séquestre, puis :');
  console.error('        node ' + __filename + ' <les 64 caractères>');
  console.error('');
  process.exit(1);
}

const neuve = crypto.randomBytes(32).toString('hex');
poser(neuve);
assurerUnite();   // ⛔ APRÈS l'écriture, jamais avant
dit('');
dit('  ✅ Clé maître générée (aucune base n\'existait encore).');
dit('');
dit('  ⛔⛔ À METTRE EN SÉQUESTRE MAINTENANT, PAS PLUS TARD :');
dit('');
dit('      ' + neuve);
dit('');
dit('     Sans elle, un VPS perdu = des sauvegardes définitivement illisibles : le coffre ne');
dit('     stocke que du chiffré. La ranger dans DEUX endroits distincts (gestionnaire de mots');
dit('     de passe + copie scellée hors ligne), puis vérifier qu\'on sait la relire.');
dit('');
dit('     Puis : systemctl restart teamop-api');
dit('');
