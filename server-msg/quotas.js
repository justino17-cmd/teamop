/* ══ LES QUOTAS ANTI-ABUS — EN MÉMOIRE, PAR CLÉ, AVEC `Retry-After` ═════════════════════════
 *
 * Même esprit que `quotaOk` d'OP GESTION : des fenêtres fixes en mémoire, par `req.ip` et par
 * compte. Un redémarrage les remet à zéro — acceptable pour des plafonds de confort ; aucune
 * décision de sécurité ne repose sur leur persistance (le verrouillage d'un compte, plus tard,
 * vivra en base).
 *
 * ⛔ CE MODULE NE JOURNALISE RIEN : une clé de quota est souvent une adresse IP ou un
 * identifiant de connexion, et ce service n'écrit jamais ça dans un journal.
 * ⛔ LA MÉMOIRE EST BORNÉE, ET UNE TABLE PLEINE NE FERME PAS LA PORTE À TOUT LE MONDE. Sans balayage, un attaquant qui
 * varie la clé (une adresse par requête) ferait grossir la table jusqu'à saturer le processus. On balaie les fenêtres
 * échues dès que la table dépasse `MAX_CLES` ; si elle est encore pleine, on ÉVINCE les plus anciennes (5 %), comme un
 * cache. L'ancienne version REFUSAIT toute clé neuve : 50 500 requêtes d'adresses distinctes (14 s) suffisaient à
 * répondre 429 à toute adresse nouvelle — connexion, mobile en 4G, visiteur — pendant une minute (relecture adverse,
 * D10 / gardien 4). Un plafond de confort qui se laisse saturer ne doit pas devenir l'arme du déni de service.
 * ⛔ Les adresses IPv6 se comptent par /64 (`cleReseau`) : un abonné en reçoit au moins un, et en tourne les 2^64
 * adresses — une clé par adresse complète n'arrêterait jamais rien, et remplirait la table.
 */
const MAX_CLES = 50000;

/* La clé de RÉSEAU d'une adresse : l'IPv4 telle quelle, l'IPv4 d'une adresse « mappée » (::ffff:a.b.c.d) comme IPv4, et pour
   une IPv6 son préfixe /64 (les quatre premiers groupes, développés). Une adresse illisible est rendue telle quelle. */
function cleReseau(ip) {
  let s = String(ip === undefined || ip === null ? '' : ip).toLowerCase().replace(/%.*$/, '');
  const m = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (m) return m[1];
  if (!s.includes(':')) return s;
  const parts = s.split('::');
  if (parts.length > 2) return s;
  const tete = parts[0] ? parts[0].split(':') : [], queue = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
  if (parts.length === 1 && tete.length !== 8) return s;
  const manque = 8 - tete.length - queue.length;
  if (manque < (parts.length === 2 ? 1 : 0)) return s;
  const groupes = tete.concat(Array(manque).fill('0'), queue);
  if (groupes.length !== 8 || !groupes.every(g => /^[0-9a-f]{1,4}$/.test(g))) return s;
  return groupes.slice(0, 4).map(g => g.padStart(4, '0')).join(':') + '::/64';
}

function creerQuotas(horloge = Date.now, maxCles = MAX_CLES) {
  const t = new Map();   // clé → { n, fin }
  let refus = 0, evinces = 0;
  function balayer(maintenant) { for (const [k, v] of t) if (v.fin <= maintenant) t.delete(k); }
  return {
    /* Compte UNE tentative pour `cle` : { ok:true } ou { ok:false, retry:<secondes> }. */
    essai(cle, max, fenetreMs) {
      const maintenant = horloge();
      let e = t.get(cle);
      if (e && e.fin <= maintenant) { t.delete(cle); e = null; }
      if (!e) {
        if (t.size >= maxCles) {
          balayer(maintenant);
          /* Encore pleine : les plus anciennes partent (l'ordre d'une Map est celui de l'insertion). */
          if (t.size >= maxCles) { let n = Math.max(1, Math.ceil(maxCles / 20)); for (const k of t.keys()) { if (n-- <= 0) break; t.delete(k); evinces++; } }
        }
        e = { n: 0, fin: maintenant + fenetreMs }; t.set(cle, e);
      }
      if (e.n >= max) { refus++; return { ok: false, retry: Math.max(1, Math.ceil((e.fin - maintenant) / 1000)) }; }
      e.n++;
      return { ok: true };
    },
    /* Rend UNE tentative comptée (la connexion a réussi : un succès n'use pas le plafond des échecs). */
    rembourser(cle) { const e = t.get(cle); if (!e) return; if (e.n > 1) e.n--; else t.delete(cle); },
    oublier(cle) { t.delete(cle); },
    taille() { return t.size; },
    refus() { return refus; },
    evinces() { return evinces; },
  };
}

module.exports = { creerQuotas, cleReseau, MAX_CLES };
