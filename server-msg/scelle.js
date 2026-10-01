/* ══ LE SCELLAGE AU REPOS — AES-256-GCM, UNE CLÉ PAR CHAMP, DES DONNÉES ASSOCIÉES ════════════
 *
 * Ce qui est scellé : le corps des messages, les noms de groupes, les adresses e-mail, les
 * titres et textes de notification. Ce qui reste en clair : identifiants, dates, relations
 * (qui est dans quelle conversation), prénom et nom affichés — les métadonnées sont donc
 * visibles du serveur. ⛔ Ce n'est PAS du chiffrement de bout en bout et le site ne le dit pas :
 * le serveur lit un message (aperçu, signalement, export).
 *
 * ⛔ POURQUOI DES DONNÉES ASSOCIÉES (`conv|seq|auteur` pour un message). GCM authentifie le
 * texte chiffré ET ce qu'on lui associe : une ligne recopiée d'une conversation dans une autre,
 * ou deux corps permutés, ne s'ouvrent plus — l'authentification échoue au lieu de rendre le
 * texte d'un autre à la mauvaise place. Sans elles, quiconque a un accès en écriture au fichier
 * peut mélanger les conversations et personne ne le voit.
 *
 * ⛔ POURQUOI UNE CLÉ PAR (table, champ). Dérivée par HKDF de la clé maître avec le contexte
 * `msg|<table>|<champ>` : un chiffré de `nom_ch` ne s'ouvre pas à la place d'un `corps_ch`,
 * même avec les mêmes données associées. Un octet de version de clé en tête permet la rotation
 * (la génération courante chiffre, les anciennes lisent).
 *
 * ⛔ LA PERTE DE LA CLÉ MAÎTRE REND TOUT ILLISIBLE. C'est le risque n°1 du service : elle va
 * au gestionnaire de mots de passe de Justin, jamais affichée (voir `poser-cle.js`).
 *
 * Aucune dépendance : `node:crypto` seulement. Ce module ne lit ni fichier ni variable
 * d'environnement — la clé lui est PASSÉE, ce qui le rend testable seul.
 */
const crypto = require('crypto');

const LONG_IV = 12, LONG_TAG = 16;

function creerScelleur(kek, { generation = 1, anciennes = {} } = {}) {
  if (!Buffer.isBuffer(kek) || kek.length !== 32) throw new Error('cle_maitre_invalide');
  if (!Number.isInteger(generation) || generation < 1 || generation > 255) throw new Error('generation_invalide');
  const cles = new Map();   // (génération|table|champ) → clé dérivée
  const maitre = (gen) => gen === generation ? kek : (anciennes[gen] || null);
  function cle(gen, table, champ) {
    const k = gen + '|' + table + '|' + champ;
    let c = cles.get(k);
    if (!c) {
      const m = maitre(gen);
      if (!m) throw new Error('generation_inconnue');
      c = Buffer.from(crypto.hkdfSync('sha256', m, Buffer.alloc(0), 'msg|' + table + '|' + champ, 32));
      cles.set(k, c);
    }
    return c;
  }
  return {
    generation,
    /* clair (chaîne ou Buffer) → Buffer [gen][iv][tag][chiffré]. IV aléatoire de 96 bits : avec
       une clé par champ, le plafond de collision (2^32 messages par clé) n'est pas un sujet. */
    sceller(table, champ, aad, clair) {
      const iv = crypto.randomBytes(LONG_IV);
      const c = crypto.createCipheriv('aes-256-gcm', cle(generation, table, champ), iv);
      c.setAAD(Buffer.from(String(aad), 'utf8'));
      const ct = Buffer.concat([c.update(Buffer.isBuffer(clair) ? clair : Buffer.from(String(clair), 'utf8')), c.final()]);
      return Buffer.concat([Buffer.from([generation]), iv, c.getAuthTag(), ct]);
    },
    /* Un scellé qui ne s'ouvre pas LÈVE : on ne rend jamais « vide » à la place — un texte qui
       disparaît en silence est pire qu'une erreur. */
    ouvrir(table, champ, aad, blob) {
      if (!blob || blob.length < 1 + LONG_IV + LONG_TAG) throw new Error('scelle_invalide');
      const b = Buffer.from(blob);
      let d;
      try {
        d = crypto.createDecipheriv('aes-256-gcm', cle(b[0], table, champ), b.subarray(1, 1 + LONG_IV));
        d.setAAD(Buffer.from(String(aad), 'utf8'));
        d.setAuthTag(b.subarray(1 + LONG_IV, 1 + LONG_IV + LONG_TAG));
        return Buffer.concat([d.update(b.subarray(1 + LONG_IV + LONG_TAG)), d.final()]).toString('utf8');
      } catch (e) { throw new Error('scelle_invalide'); }
    },
    /* Empreinte déterministe pour l'unicité (adresse e-mail) sans la stocker en clair. */
    hmac(table, champ, valeur) {
      return crypto.createHmac('sha256', cle(generation, table, champ)).update(String(valeur)).digest('hex');
    },
  };
}

module.exports = { creerScelleur };
