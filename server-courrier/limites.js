/* ══ LES PLAFONDS ANTI-ABUS — fenêtres fixes, en mémoire ═════════════════════════════════════════════════════════════════════
 * `prendre(cle, max, fenetreMs, poids)` : refuse (ok:false, reessayerS) quand la fenêtre est pleine. Le « poids » compte les SMS :
 * une demande à trois signataires par code SMS pèse 3. La clé d'une adresse réseau vient de `req.ip` (Express, `trust proxy 1`),
 * JAMAIS d'un en-tête brut que le client fournit.
 */
'use strict';
function creerLimiteur(horloge = Date.now, tailleMax = 20000) {
  const m = new Map();
  function balayer(now) { for (const [k, v] of m) if (v.fin <= now) m.delete(k); }
  return {
    prendre(cle, max, fenetreMs, poids = 1) {
      const now = horloge();
      let v = m.get(cle);
      if (!v || v.fin <= now) {
        if (m.size >= tailleMax) { balayer(now); if (m.size >= tailleMax) return { ok: false, reessayerS: 60 }; }
        v = { n: 0, fin: now + fenetreMs }; m.set(cle, v);
      }
      if (v.n + poids > max) return { ok: false, reessayerS: Math.max(1, Math.ceil((v.fin - now) / 1000)) };
      v.n += poids; return { ok: true };
    },
    taille: () => m.size,
  };
}
module.exports = { creerLimiteur };
