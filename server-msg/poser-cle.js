#!/usr/bin/env node
/* ══ POSER LA CLÉ MAÎTRE D'OP MESSAGES — IMITÉ DE `server/poser-cle.js`, JAMAIS IMPORTÉ ═══════
 *
 *     node server-msg/poser-cle.js <beta|prod>            → état ; génère la clé si AUCUNE n'existe
 *                                                           et qu'AUCUNE base n'existe
 *     … | node server-msg/poser-cle.js <beta|prod> --stdin → pose une clé du séquestre lue sur
 *                                                           l'entrée standard (saisie masquée :
 *                                                           `read -rs K && printf %s "$K" | …`)
 *
 * ⛔ CE QU'IL NE FAIT JAMAIS : remplacer une clé existante, ni en générer une neuve quand une
 * base existe déjà. Une clé neuve sur des messages déjà scellés les rend définitivement
 * illisibles — le service refuse déjà d'ouvrir une base avec une mauvaise clé (témoin), cet
 * outil ne doit pas pouvoir contourner ce refus par mégarde. Le cas qui coûte : un volume de
 * données restauré SANS la clé (la clé vit hors des données exprès) — la relancer ne doit pas
 * « réparer » en générant une clé qui ne déchiffrera rien.
 *
 * ⛔ LA CLÉ N'EST JAMAIS AFFICHÉE, ni en argument (visible dans `ps`) : elle est générée ici ou
 * lue sur l'entrée standard. Justin colle toutes ses sorties dans la conversation — un secret
 * affiché y arrive (règle du 24 septembre 2026).
 * ⛔ L'ORDRE : LA CLÉ D'ABORD, LE RÉGLAGE SYSTEMD QUI LA LIT ENSUITE, et jamais sur un chemin
 * d'erreur. `LoadCredential=` vers un fichier absent fait REFUSER à systemd de démarrer l'unité.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const instance = String(process.argv[2] || '');
const dit = (...a) => console.log(...a);
if (instance !== 'beta' && instance !== 'prod') { console.error('  ✗ Attendu : beta ou prod.'); process.exit(2); }

const DIR = process.env.OPMSG_KEK_DIR || '/etc/opmsg';
const CHEMIN = path.join(DIR, instance + '.kek');
const DATA = process.env.OPMSG_DATA || path.join('/opt/opmsg', instance, 'data');
const DROPIN_DIR = process.env.OPMSG_DROPIN_DIR || '/etc/systemd/system/teamop-msg@' + instance + '.service.d';
const DROPIN = path.join(DROPIN_DIR, 'kek.conf');

/* ⛔ Même garde que le service : ni la clé ni les données ne vivent dans l'arbre d'OP GESTION. */
for (const [nom, p] of [['clé', CHEMIN], ['données', DATA]]) {
  const r = path.resolve(p);
  if (/^\/(opt|etc)\/teamop(\/|$)/.test(r)) { console.error('  ✗ ' + nom + ' sous l\'arbre d\'OP GESTION : refusé.'); process.exit(1); }
}

const existante = () => { try { return /^[0-9a-fA-F]{64}$/.test(fs.readFileSync(CHEMIN, 'utf8').trim()); } catch (e) { return false; } };
/* « Installation neuve » ne se décide pas sur la clé : la base compte. */
const baseExiste = () => { try { return fs.existsSync(path.join(DATA, 'msg.db')); } catch (e) { return false; } };

function poser(hex) {
  /* ⛔ ON NE TOUCHE PAS AUX DROITS DU DOSSIER. `/etc/opmsg` porte aussi la configuration (`<instance>.json`, lue par le service sous
     l'utilisateur `opmsg`) : le resserrer à 0700 la rendait illisible pour lui et le premier déploiement échouait sur « fichier
     illisible » (relecture du gardien, point 1 — le banc d'installation tournait en root et ne pouvait pas le voir). Le secret,
     c'est le FICHIER de la clé : 0600, à root. Un dossier créé ici naît en 0755 (lisible, pas modifiable). */
  fs.mkdirSync(DIR, { recursive: true, mode: 0o755 });
  fs.writeFileSync(CHEMIN, hex, { mode: 0o600 });   // créée en 0600 d'emblée, pas resserrée après coup
  try { fs.chmodSync(CHEMIN, 0o600); } catch (e) {}
}
function poserUnite() {
  fs.mkdirSync(DROPIN_DIR, { recursive: true });
  fs.writeFileSync(DROPIN, '# Posé par server-msg/poser-cle.js — la clé maître d\'OP MESSAGES vit HORS de /opt.\n'
    + '# systemd la dépose dans un répertoire éphémère ; le service la lit par $CREDENTIALS_DIRECTORY/kek.\n'
    + '[Service]\nLoadCredential=kek:' + CHEMIN + '\n');
}
const unitePrete = () => { try { return /LoadCredential\s*=\s*kek:/.test(fs.readFileSync(DROPIN, 'utf8')); } catch (e) { return false; } };
function assurerUnite() {
  if (unitePrete()) { dit('  → réglage systemd déjà en place'); return; }
  try { poserUnite(); dit('  → réglage systemd ajouté : ' + DROPIN); dit('    ⚠️ à prendre en compte : systemctl daemon-reload && systemctl restart teamop-msg@' + instance); }
  catch (e) { dit('  ⚠️ réglage systemd NON posé (' + (e.code || 'erreur') + ') — le service ne lira PAS la clé.'); }
}

dit('');
dit('  Clé maître d\'OP MESSAGES (' + instance + ') — ' + CHEMIN);
dit('');

if (existante()) {
  assurerUnite();   // la clé est là : le réglage qui la lit peut l'être aussi
  dit('');
  dit('  ✅ Une clé est DÉJÀ posée. On n\'y touche pas.');
  dit('     La remplacer rendrait les messages définitivement illisibles : compare-la à celle du');
  dit('     séquestre AVANT de faire quoi que ce soit (sans l\'afficher).');
  dit('');
  process.exit(0);
}

if (process.argv.includes('--stdin')) {
  let v = '';
  try { v = fs.readFileSync(0, 'utf8').trim(); } catch (e) {}
  if (!/^[0-9a-fA-F]{64}$/.test(v)) { console.error('  ✗ Attendu sur l\'entrée standard : 64 caractères hexadécimaux (celle du séquestre).'); process.exit(1); }
  poser(v.toLowerCase());
  assurerUnite();   // ⛔ APRÈS l'écriture, jamais avant
  dit('');
  dit('  ✅ Clé du séquestre posée.');
  dit('');
  process.exit(0);
}

if (baseExiste()) {
  console.error('  ⛔ UNE BASE EXISTE (' + path.join(DATA, 'msg.db') + ') et AUCUNE clé n\'est posée.');
  console.error('     Générer une clé neuve rendrait ses messages définitivement illisibles.');
  console.error('     Retrouve la clé du séquestre et pose-la : … | node poser-cle.js ' + instance + ' --stdin');
  process.exit(1);
}

/* ⛔ LA PRODUCTION NE GÉNÈRE JAMAIS SA CLÉ ICI. Une clé née sur le VPS n'a aucun chemin propre
   vers le séquestre : pour la mettre au gestionnaire de mots de passe il faudrait l'AFFICHER, et
   Justin colle toutes ses sorties dans la conversation (règle du 24 septembre 2026). Elle naît
   donc au gestionnaire (64 caractères hexadécimaux) et arrive ici par `--stdin`, en saisie masquée.
   La bêta, dont les données sont jetables et le disent, peut générer la sienne. */
if (instance === 'prod') {
  console.error('  ⛔ La clé de PRODUCTION se génère dans le gestionnaire de mots de passe, jamais ici.');
  console.error('     Génère 64 caractères hexadécimaux, mets-les au séquestre, puis :');
  console.error('        read -rs K && printf %s "$K" | node poser-cle.js prod --stdin');
  process.exit(1);
}
poser(crypto.randomBytes(32).toString('hex'));
assurerUnite();   // ⛔ APRÈS l'écriture, jamais avant
dit('');
dit('  ✅ Clé de la BÊTA générée (installation neuve). Elle n\'est PAS affichée.');
dit('     Les données de la bêta sont jetables : pas de séquestre. Celles de la production, non.');
dit('');
