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

function bases() {
  try { return fs.readdirSync(SOCLE_DIR).filter(d => fs.existsSync(path.join(SOCLE_DIR, d, 'base.db'))).length; }
  catch (e) { return 0; }
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

if (deja) {
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
