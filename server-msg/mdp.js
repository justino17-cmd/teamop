/* ══ LES MOTS DE PASSE — scrypt CÔTÉ SERVEUR, SÉMAPHORE, MÊME TRAVAIL POUR UN INCONNU ═══════
 *
 * ⚠️ LIVRÉ PRÊT, PAS ENCORE BRANCHÉ : l'étape 1 n'a pas de comptes publics (la porte bêta
 * appelle OP GESTION et ne stocke AUCUN mot de passe chez nous). L'inscription par courriel
 * (étape 2) s'en servira ; il est éprouvé dès maintenant (`tests/test-902.js`) parce que ses
 * trois pièges se paient à la première utilisation, pas à l'écriture.
 *
 * ⛔ `maxmem` EXPLICITE. `crypto.scrypt` plafonne la mémoire à 32 Mio par défaut ; N = 2^15 avec
 * r = 8 demande 128 × N × r = 32 Mio pile — au-dessus de la limite, l'erreur sort au premier
 * essai (« memory limit exceeded »), pas à la revue. Le banc l'éprouve SANS `maxmem`.
 * ⛔ UN SÉMAPHORE. Une dérivation coûte ~32 Mio et ~80 ms de processeur : sans plafond de
 * dérivations simultanées, quelques dizaines de connexions d'un coup saturent la mémoire du
 * VPS qui porte aussi OP GESTION. 4 en parallèle, une file bornée, et au-delà on REFUSE
 * (`file_pleine`) plutôt que d'empiler.
 * ⛔ LE MÊME TRAVAIL POUR UNE ADRESSE INCONNUE (`verifierInconnu`) : sinon le temps de réponse
 * dit quelles adresses ont un compte. Le banc le mesure par un COMPTEUR de dérivations, jamais
 * par un chronomètre.
 * ⛔ COMPARAISON À TEMPS CONSTANT (`timingSafeEqual`).
 * Les paramètres (N, r, p) sont rangés AVEC le hachage : on peut monter N plus tard sans
 * invalider les mots de passe existants.
 */
const crypto = require('crypto');

function creerMdp({ N = 2 ** 15, r = 8, p = 1, concurrence = 4, fileMax = 64, longueur = 64 } = {}) {
  let actifs = 0, derivations = 0;
  const file = [];
  const maxmemDe = (n, rr, pp) => 128 * n * rr * 2 + 128 * rr * pp + (1 << 20);   // 2× la mémoire utile + marge

  function prendre() {
    if (actifs < concurrence) { actifs++; return Promise.resolve(); }
    if (file.length >= fileMax) return Promise.reject(new Error('file_pleine'));
    return new Promise(res => file.push(res));
  }
  function rendre() { const s = file.shift(); if (s) s(); else actifs--; }

  async function deriver(mdp, sel, params) {
    await prendre();
    try {
      derivations++;
      return await new Promise((res, rej) => {
        crypto.scrypt(String(mdp).normalize('NFKC'), sel, longueur,
          { N: params.N, r: params.r, p: params.p, maxmem: maxmemDe(params.N, params.r, params.p) },
          (e, cle) => e ? rej(e) : res(cle));
      });
    } finally { rendre(); }
  }

  /* Un mot de passe de ce service : 10 caractères au moins, hors liste de mots courants. */
  const COURANTS = new Set(['0123456789', 'azertyuiop', 'qwertyuiop', '1234567890', 'motdepasse', 'password12',
    'password123', 'azerty1234', '1234567890123', 'abcdefghij', 'teamop2026', 'opmessages', 'opgestion']);
  function mdpRecevable(mdp) {
    if (typeof mdp !== 'string' || mdp.length < 10 || mdp.length > 200) return false;
    return !COURANTS.has(mdp.toLowerCase());
  }

  return {
    params: { N, r, p },
    mdpRecevable,
    async hacher(mdp) {
      const sel = crypto.randomBytes(16);
      const params = { N, r, p };
      const cle = await deriver(mdp, sel, params);
      return { sel, params: JSON.stringify(params), hash: cle };
    },
    async verifier(mdp, rec) {
      let params; try { params = JSON.parse(rec.params); } catch (e) { return false; }
      if (!params || !Number.isInteger(params.N) || !Number.isInteger(params.r) || !Number.isInteger(params.p)) return false;
      const cle = await deriver(mdp, Buffer.from(rec.sel), params);
      const attendu = Buffer.from(rec.hash);
      return cle.length === attendu.length && crypto.timingSafeEqual(cle, attendu);
    },
    /* Même coût qu'une vérification réelle, résultat toujours faux. */
    async verifierInconnu(mdp) {
      await deriver(mdp, Buffer.alloc(16, 7), { N, r, p });
      return false;
    },
    derivations() { return derivations; },
    etat() { return { actifs, enFile: file.length }; },
    /* Pour le banc : la dérivation SANS `maxmem`, qui doit échouer au paramètre de production. */
    _sansMaxmem(mdp) {
      return new Promise((res, rej) => crypto.scrypt(String(mdp), Buffer.alloc(16), longueur, { N, r, p }, (e, c) => e ? rej(e) : res(c)));
    },
  };
}

module.exports = { creerMdp };
