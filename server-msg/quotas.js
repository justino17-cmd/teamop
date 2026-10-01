/* ══ LES QUOTAS ANTI-ABUS — EN MÉMOIRE, PAR CLÉ, AVEC `Retry-After` ═════════════════════════
 *
 * Même esprit que `quotaOk` d'OP GESTION : des fenêtres fixes en mémoire, par `req.ip` et par
 * compte. Un redémarrage les remet à zéro — acceptable pour des plafonds de confort ; aucune
 * décision de sécurité ne repose sur leur persistance (le verrouillage d'un compte, plus tard,
 * vivra en base).
 *
 * ⛔ CE MODULE NE JOURNALISE RIEN : une clé de quota est souvent une adresse IP ou un
 * identifiant de connexion, et ce service n'écrit jamais ça dans un journal.
 * ⛔ LA MÉMOIRE EST BORNÉE : sans balayage, un attaquant qui varie la clé (une adresse par
 * requête) ferait grossir la table jusqu'à saturer le processus. On balaie les fenêtres échues
 * dès que la table dépasse `MAX_CLES`, et si elle est encore pleine on REFUSE plutôt que de
 * grossir (fermé par défaut).
 */
const MAX_CLES = 50000;

function creerQuotas(horloge = Date.now) {
  const t = new Map();   // clé → { n, fin }
  let refus = 0;
  function balayer(maintenant) { for (const [k, v] of t) if (v.fin <= maintenant) t.delete(k); }
  return {
    /* Compte UNE tentative pour `cle` : { ok:true } ou { ok:false, retry:<secondes> }. */
    essai(cle, max, fenetreMs) {
      const maintenant = horloge();
      let e = t.get(cle);
      if (e && e.fin <= maintenant) { t.delete(cle); e = null; }
      if (!e) {
        if (t.size >= MAX_CLES) {
          balayer(maintenant);
          if (t.size >= MAX_CLES) { refus++; return { ok: false, retry: Math.ceil(fenetreMs / 1000) }; }
        }
        e = { n: 0, fin: maintenant + fenetreMs }; t.set(cle, e);
      }
      if (e.n >= max) { refus++; return { ok: false, retry: Math.max(1, Math.ceil((e.fin - maintenant) / 1000)) }; }
      e.n++;
      return { ok: true };
    },
    oublier(cle) { t.delete(cle); },
    taille() { return t.size; },
    refus() { return refus; },
  };
}

module.exports = { creerQuotas, MAX_CLES };
