/* ══ LES MOTS DE PASSE DES BOÎTES MAIL, CHIFFRÉS AU REPOS ══════════════════════════════════════
 *
 * Trois fichiers portaient des mots de passe IMAP/SMTP EN CLAIR : `mailboxes.json` (les boîtes
 * que les entreprises connectent dans OP GESTION), `mail-boites.json` (les boîtes de la Tour)
 * et `support-box.json` (l'ancienne boîte unique du support). Seules les SAUVEGARDES étaient
 * chiffrées : qui lisait le disque du VPS, une image de volume ou un instantané lisait aussi,
 * en clair, les identifiants de la boîte de chaque client. (Dette notée dans `REPRISE.md`.)
 *
 * ⛔ UNE SEULE DÉFINITION DU CHIFFREMENT. Ce fichier ne sait pas chiffrer : il appelle
 * `socle.sceller` / `socle.desceller` (AES-256-GCM, enveloppe `v1:`) avec la clé maître du socle
 * (`socle.kek()` : `TEAMOP_KEK` ou `$CREDENTIALS_DIRECTORY/teamop_kek`, c'est-à-dire
 * `/etc/teamop/kek` déposée par systemd `LoadCredential`). Un second algorithme maison serait un
 * second endroit à auditer. Seule différence : la clé de ce fichier est une SOUS-clé (HKDF-SHA256
 * de la clé maître, étiquette propre) — la clé maître elle-même ne sert qu'à dériver, jamais à
 * chiffrer deux usages différents.
 *
 * ⛔ DEUX CHAMPS, JAMAIS UN SEUL. Un enregistrement chiffré porte `passScelle` et PAS `pass` ;
 * un enregistrement d'avant porte `pass` (clair) et pas `passScelle`. Un préfixe dans `pass`
 * aurait confondu un mot de passe qui commence par ce préfixe avec un chiffré — et tué la boîte.
 * Le chiffré est lié à l'adresse de l'enregistrement (AAD) : on ne peut pas coller le chiffré
 * d'une boîte dans une autre.
 *
 * ⛔ AUCUNE PERTE, JAMAIS. Le reste du serveur lit `b.pass` en clair, en mémoire (il faut bien
 * le présenter à IMAP) : la lecture déchiffre, l'écriture chiffre, personne d'autre ne change.
 *   · ancien format en clair → lu tel quel, et réécrit chiffré (au démarrage dès que la clé est
 *     là, sinon à la première écriture suivante) ;
 *   · chiffré mais clé absente ou différente → l'enregistrement reste dans la liste (adresse,
 *     serveurs…), son `pass` vaut '' (on ne présente JAMAIS le chiffré comme mot de passe), et
 *     son chiffré d'origine est gardé à l'écart pour être réécrit OCTET POUR OCTET : un serveur
 *     démarré sans la clé ne détruit pas les mots de passe en réécrivant le fichier ;
 *   · clé absente à l'écriture (installation de test, `TEAMOP_DATA` d'un banc) → écrit en clair
 *     et le DIT une fois dans le journal. Les bases du socle, elles, refusent de s'ouvrir sans
 *     clé dès qu'une base existe : ici un refus supprimerait la possibilité de connecter une
 *     boîte à un serveur qui n'a pas (encore) de clé, et ne protégerait rien de plus. Sur le VPS
 *     la clé est déposée depuis le 24 septembre 2026.
 *   · le fichier s'écrit par un temporaire puis un renommage (droits 600) : un arrêt en cours
 *     d'écriture laissait un fichier TRONQUÉ — c'est-à-dire toutes les boîtes perdues d'un coup.
 *
 * ⚠️ LA CLÉ MAÎTRE DEVIENT NÉCESSAIRE À CES BOÎTES. Perdue, les mots de passe chiffrés ne se
 * relisent plus : les boîtes restent listées mais ne se connectent plus, et leurs propriétaires
 * les reconnectent. C'est le même séquestre que celui des bases du socle (`poser-cle.js`).
 *
 * Ce fichier ne renvoie JAMAIS un mot de passe par une route et n'en écrit aucun dans le journal :
 * il ne parle que de NOMBRES.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const socle = require('./socle');

const ETIQUETTE = 'teamop-mdp-boites-v1';
const aad = (email) => 'boite-mdp|' + String(email || '').trim().toLowerCase();

/* La sous-clé. `kek()` est relue à chaque appel (un fichier de 64 caractères) : l'appelant la
   demande UNE fois par lecture ou écriture, pas une fois par boîte. */
function sousCle() {
  const k = socle.kek();
  if (!k) return null;
  return Buffer.from(crypto.hkdfSync('sha256', k, Buffer.alloc(0), Buffer.from(ETIQUETTE, 'utf8'), 32));
}

function sceller(clair, email, cle) {
  return socle.sceller(cle, Buffer.from(String(clair), 'utf8'), aad(email)).toString('base64');
}
function desceller(scelle, email, cle) {
  return socle.desceller(cle, Buffer.from(String(scelle), 'base64'), aad(email)).toString('utf8');
}

/* Les enregistrements « boîte » d'un contenu de fichier, quelle que soit sa forme : un tableau
   (`mail-boites.json`), un objet indexé par identifiant (`mailboxes.json`), ou la boîte seule
   (`support-box.json`). Une boîte = un objet qui a une adresse ET un mot de passe (clair ou scellé). */
function estBoite(o) {
  return !!o && typeof o === 'object' && !Array.isArray(o) && typeof o.email === 'string'
    && (typeof o.pass === 'string' || typeof o.passScelle === 'string');
}
function boitesDe(data) {
  if (Array.isArray(data)) return data.filter(estBoite);
  if (estBoite(data)) return [data];
  if (data && typeof data === 'object') return Object.values(data).filter(estBoite);
  return [];
}

/* Déchiffre en place ce qui est chiffré. Rend { clairs, illisibles } : combien de mots de passe
   étaient encore en clair (à migrer), combien n'ont pas pu être relus. */
function ouvrirEnPlace(data, cle) {
  let clairs = 0, illisibles = 0;
  for (const b of boitesDe(data)) {
    if (typeof b.passScelle === 'string') {
      const scelle = b.passScelle;
      delete b.passScelle;
      let clair = null;
      if (cle) { try { clair = desceller(scelle, b.email, cle); } catch (e) { clair = null; } }
      if (clair === null) {
        illisibles++;
        b.pass = '';
        /* Non énumérables : ni `JSON.stringify` ni une copie par `{...b}` ne les emportent — le
           chiffré d'origine ne voyage que par `versDisque`, qui sait le remettre tel quel. */
        Object.defineProperty(b, '_passScelle', { value: scelle, enumerable: false, writable: true, configurable: true });
      } else b.pass = clair;
    } else clairs++;
  }
  return { clairs, illisibles };
}

/* Le contenu à écrire : mêmes formes, `pass` remplacé par `passScelle` — ou, sans clé, laissé en
   clair. Rend { texte, enClair } (`enClair` : combien de mots de passe partent sans chiffrement). */
function versDisque(data, cle) {
  let enClair = 0;
  const conv = (b) => {
    const o = Object.assign({}, b);
    if (!b.pass && b._passScelle) { delete o.pass; o.passScelle = b._passScelle; return o; }   // illisible : le chiffré d'origine, intact
    if (typeof b.pass !== 'string') return o;
    if (!cle) { enClair++; return o; }
    delete o.pass;
    o.passScelle = sceller(b.pass, b.email, cle);
    return o;
  };
  let sortie;
  if (Array.isArray(data)) sortie = data.map(b => estBoite(b) ? conv(b) : b);
  else if (estBoite(data)) sortie = conv(data);
  else if (data && typeof data === 'object') {
    sortie = {};
    for (const k of Object.keys(data)) sortie[k] = estBoite(data[k]) ? conv(data[k]) : data[k];
  } else sortie = data;
  return { texte: JSON.stringify(sortie), enClair };
}

let _dejaDit = false;
function direClairUneFois(n) {
  if (_dejaDit || !n) return;
  _dejaDit = true;
  console.error('boîtes mail : clé maître absente — ' + n + ' mot(s) de passe écrit(s) en clair (installation sans clé)');
}

/* Écrit `texte` dans `chemin` par un temporaire puis un renommage ; droits 600. Jette en cas d'échec
   (l'appelant décide quoi en faire) — et ne laisse pas de temporaire derrière lui. */
function ecrireAtomique(chemin, texte) {
  const tmp = chemin + '.' + process.pid + '.tmp';
  let fd = null;
  try {
    fd = fs.openSync(tmp, 'w', 0o600);
    fs.writeSync(fd, texte);
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = null;
    fs.renameSync(tmp, chemin);
  } catch (e) {
    if (fd !== null) { try { fs.closeSync(fd); } catch (_) {} }
    try { fs.unlinkSync(tmp); } catch (_) {}
    throw e;
  }
}

/* Écrit un contenu (mots de passe EN CLAIR en mémoire) sur le disque, chiffré. Rend true/false —
   jamais ne jette : tous les appelants d'avant avalaient l'erreur, mais celle-ci se DIT (code seul). */
function ecrire(chemin, data) {
  try {
    const cle = sousCle();
    const { texte, enClair } = versDisque(data, cle);
    ecrireAtomique(chemin, texte);
    direClairUneFois(enClair);
    return true;
  } catch (e) {
    console.error('boîtes mail : ' + path.basename(chemin) + ' non écrit (' + (e && e.code || 'erreur') + ')');
    return false;
  }
}

/* Lit un fichier de boîtes : les mots de passe sortent EN CLAIR (c'est ce que le reste du code
   attend). Fichier absent ou illisible → `defaut`. Si des mots de passe étaient encore en clair et
   que la clé est là, le fichier est réécrit chiffré tout de suite — après avoir VÉRIFIÉ qu'on sait
   relire ce qu'on va écrire (un chiffrement qui ne se relit pas ne remplace jamais l'original). */
function lire(chemin, defaut) {
  let data;
  try { data = JSON.parse(fs.readFileSync(chemin, 'utf8')); } catch (e) { return defaut; }
  if (data === null || typeof data !== 'object') return defaut;
  const cle = sousCle();
  const { clairs, illisibles } = ouvrirEnPlace(data, cle);
  if (illisibles) console.error('boîtes mail : ' + path.basename(chemin) + ' — ' + illisibles + ' mot(s) de passe illisible(s) (clé maître absente ou différente) : conservés tels quels, boîtes à reconnecter');
  if (clairs && cle) {
    try {
      const { texte } = versDisque(data, cle);
      const verif = JSON.parse(texte);
      const { illisibles: nonRelus } = ouvrirEnPlace(verif, cle);
      const memes = boitesDe(verif).every((b, i) => b.pass === boitesDe(data)[i].pass);
      if (nonRelus || !memes) throw new Error('relecture différente');
      ecrireAtomique(chemin, texte);
    } catch (e) {
      console.error('boîtes mail : ' + path.basename(chemin) + ' — migration vers le chiffré impossible (' + (e && e.code || e && e.message || 'erreur') + '), fichier laissé tel quel');
    }
  }
  return data;
}

module.exports = { lire, ecrire, versDisque, ouvrirEnPlace, boitesDe, ETIQUETTE };
