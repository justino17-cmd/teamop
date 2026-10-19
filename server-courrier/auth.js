/* ══ QUI A LE DROIT — LA PERSONNE EST CELLE QUE LA TOUR DIT, JAMAIS UN SECRET PARTAGÉ ═══════════════════════════════════════════
 *
 * CHOIX (et pourquoi). Ce service n'a AUCUN compte : il demande à OP GESTION qui est la personne qui présente un jeton de la Tour
 * (`GET /api/monitor/moi`, qui rend { id, nom, role }). Même forme que la porte bêta d'OP MESSAGES : un pont UNILATÉRAL, OP GESTION ne
 * sait pas que ce service existe, et `server/` n'a pas bougé d'une ligne. Pourquoi pas un secret partagé : il vivrait dans le
 * JavaScript de `tour.html` (servi à n'importe qui) ou serait un second mot de passe à tenir ; ici, couper un accès dans la Tour ferme
 * ce service dans la minute, et il n'y a rien à voler dans la page.
 *
 *  · seul le rôle `patron` passe (la signature engage l'entreprise) ; l'identité retenue est l'ID du compte — pas son nom ;
 *  · ⛔ FERMÉ PAR DÉFAUT : OP GESTION muet, lent, illisible, ou un statut inattendu → 503, jamais « on laisse passer » ;
 *  · ⛔ la FORME du jeton (48 hexadécimaux) est vérifiée ICI avant tout appel : ce service ne sert pas de relais de devinette ;
 *  · le verdict POSITIF est retenu 60 s (un accès coupé à la Tour tombe donc ici en moins d'une minute), le refus 10 s ;
 *    la clé du cache est l'empreinte du jeton — le jeton lui-même n'est jamais gardé ni journalisé ;
 *  · chaque requête de ce service vérifie ensuite que la DEMANDE appartient à cet identifiant (voir demandes.js).
 */
'use strict';
const crypto = require('crypto');
const FORME = /^Bearer\s+([a-f0-9]{48})$/;

function creerAuth({ gestionUrl, timeoutMs = 4000, fetchImpl = fetch, horloge = Date.now, ttlOkMs = 60000, ttlRefusMs = 10000, roles = ['patron'], tailleMax = 500 }) {
  const cache = new Map();
  const stats = { appels: 0, refus: 0, indisponible: 0 };
  async function verifier(entete) {
    const m = FORME.exec(String(entete || ''));
    if (!m) { stats.refus++; return { ok: false, statut: 401, code: 'jeton_absent' }; }
    const cle = crypto.createHash('sha256').update(m[1]).digest('hex');
    const now = horloge(), c = cache.get(cle);
    if (c && c.fin > now) return c.v;
    stats.appels++;
    let r;
    try {
      r = await fetchImpl(gestionUrl + '/api/monitor/moi', { headers: { Authorization: 'Bearer ' + m[1], Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
    } catch (e) { stats.indisponible++; return { ok: false, statut: 503, code: 'verification_indisponible' }; }
    let v;
    if (r.status === 401 || r.status === 403) v = { ok: false, statut: 401, code: 'jeton_refuse' };
    else if (r.status !== 200) { stats.indisponible++; return { ok: false, statut: 503, code: 'verification_indisponible' }; }
    else {
      let j; try { j = await r.json(); } catch (e) { stats.indisponible++; return { ok: false, statut: 503, code: 'verification_indisponible' }; }
      if (!j || j.ok !== true || (j.id == null || String(j.id) === '') || typeof j.role !== 'string') { stats.indisponible++; return { ok: false, statut: 503, code: 'verification_indisponible' }; }
      v = roles.includes(j.role) ? { ok: true, proprio: 'u:' + String(j.id).slice(0, 64), nom: String(j.nom || '').slice(0, 100) } : { ok: false, statut: 403, code: 'role_refuse' };
    }
    if (!v.ok) stats.refus++;
    if (cache.size >= tailleMax) { for (const [k, x] of cache) if (x.fin <= now) cache.delete(k); if (cache.size >= tailleMax) cache.delete(cache.keys().next().value); }
    cache.set(cle, { v, fin: now + (v.ok ? ttlOkMs : ttlRefusMs) });
    return v;
  }
  return { verifier, stats, oublier: () => cache.clear() };
}
module.exports = { creerAuth };
