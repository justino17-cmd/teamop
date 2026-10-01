/* ══ L'ENVOI D'UN SMS PAR OVHcloud — FAIT MAIN, PAR `fetch`, TOUT ISOLÉ ICI ═════════════════════
 *
 * Décision de Justin, 1er octobre 2026 : le prestataire SMS est OVHcloud (« go »). Aucune bibliothèque (règle
 * du dépôt : chaque dépendance est une surface d'attaque) : l'API REST d'OVH se signe en six lignes.
 *
 * ⚠️ D'APRÈS LA DOCUMENTATION PUBLIQUE D'OVH (schéma `https://eu.api.ovh.com/1.0/sms.json`, relevé le 1er octobre 2026) :
 *   · `POST /sms/{serviceName}/jobs`, corps `{ message, sender, receivers[], noStopClause, priority, validityPeriod, … }` ;
 *     réponse `{ totalCreditsRemoved, validReceivers[], invalidReceivers[], ids[], creditsLeft }` ;
 *   · en-têtes `X-Ovh-Application`, `X-Ovh-Consumer`, `X-Ovh-Timestamp`, `X-Ovh-Signature` ;
 *   · signature « $1$ » + SHA-1 hexadécimal de `secretApplication+clé consommateur+méthode+URL complète+corps+horodatage`,
 *     jointes par « + » ; l'horodatage est celui du SERVEUR d'OVH (`GET /auth/time`, sans authentification), pas le nôtre : une
 *     horloge qui dérive donnerait une signature refusée — on mesure l'écart et on le corrige.
 * Ce qui n'est PAS vérifié ici (pas de compte OVH dans ce dépôt) : l'envoi réel — un compte, un expéditeur validé et des crédits sont
 * les gestes de Justin (`design/opmessages/INSTALLER-LE-SERVEUR.md`). Le banc (`test-913`) joue un FAUX OVH local qui recalcule la
 * signature de son côté : il prouve que ce module signe comme la documentation le dit, pas qu'OVH l'accepte.
 *
 * ⛔ CE MODULE NE JOURNALISE RIEN ET NE GARDE RIEN : ni le numéro, ni le texte (le code y est), ni les clés. Un échec rend un GENRE
 * (`numero`, `refus`, `config`, `incertain`) que l'appelant traduit — jamais le corps d'une réponse d'OVH, qui peut citer un numéro.
 * ⛔ « INCERTAIN » COÛTE : un délai dépassé APRÈS l'envoi de la requête, une coupure en route ou un 500/502/504 ne disent pas si le SMS est
 * parti. L'appelant garde le coût dans le budget (on suppose le pire) ET le code (s'il est arrivé, la personne doit pouvoir le taper).
 * ⛔ MAIS « INCERTAIN » NE COUVRE PAS CE QUI S'EST PASSÉ AVANT L'ENVOI : l'heure d'OVH illisible, un nom qui ne se résout pas, une
 * connexion refusée, un certificat faux, un 503 (« service indisponible » : le travail n'a pas commencé) ne peuvent pas avoir envoyé
 * un SMS. C'est `non_envoye` : le coût et les plafonds sont RENDUS. Les classer « incertain » (relecture adverse) faisait payer à la
 * personne, et au budget, des SMS jamais partis — 20 essais pendant une panne d'OVH fermaient la France pour une heure.
 */
const crypto = require('crypto');

const URL_DEFAUT = 'https://eu.api.ovh.com/1.0';
/* En production, la base ne peut être que l'un des trois points d'entrée d'OVH (Europe, Canada, États-Unis) : une configuration
   mal copiée ne doit pas envoyer nos clés de signature à un autre hôte. Seuls les bancs (instance bêta) pointent ailleurs. */
const URLS_OVH = /^https:\/\/(?:eu\.api\.ovh\.com|ca\.api\.ovh\.com|api\.us\.ovhcloud\.com)\/1\.0$/;

/* Les erreurs réseau qui ne peuvent survenir qu'AVANT que la requête soit écrite sur la ligne : résolution du nom, connexion refusée ou
   impossible, poignée de main TLS. Un délai (`AbortError`, `TimeoutError`) ou une coupure (`ECONNRESET`, `UND_ERR_SOCKET`) ne sont PAS
   ici : on ne sait pas s'ils sont arrivés après l'envoi. */
const ECHECS_AVANT_ENVOI = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH', 'EADDRNOTAVAIL', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'ERR_TLS_CERT_ALTNAME_INVALID', 'ERR_SSL_WRONG_VERSION_NUMBER']);

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

/* La signature d'une requête (exportée : le banc la recalcule de son côté et compare). */
function signer({ appSecret, consumerKey, methode, url, corps, horodatage }) {
  return '$1$' + sha1([appSecret, consumerKey, methode, url, corps, String(horodatage)].join('+'));
}

function creerOvh({ ovh, fetchImpl = fetch, horloge = Date.now }) {
  const base = String(ovh.urlBase || URL_DEFAUT).replace(/\/+$/, '');
  const timeoutMs = Number.isFinite(ovh.timeoutMs) ? ovh.timeoutMs : 8000;
  let ecart = null, ecartLeA = 0;   // serveur OVH − nous, en ms

  async function lireHeure() {
    const r = await fetchImpl(base + '/auth/time', { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
    const t = parseInt(String(await r.text()).trim(), 10);
    if (!r.ok || !Number.isFinite(t) || t < 1e9 || t > 1e11) throw new Error('heure_ovh_illisible');
    ecart = t * 1000 - horloge(); ecartLeA = horloge();
  }
  async function horodatage() {
    if (ecart === null || horloge() - ecartLeA > 10 * 60000) await lireHeure();
    return Math.floor((horloge() + ecart) / 1000);
  }

  async function appeler(methode, chemin, objet) {
    const url = base + chemin;
    const corps = objet === undefined ? '' : JSON.stringify(objet);
    let ts;
    try { ts = await horodatage(); }
    catch (e) { throw Object.assign(new Error('avant_envoi'), { avantEnvoi: true }); }   // la requête n'est même pas écrite
    const h = {
      'X-Ovh-Application': ovh.appKey, 'X-Ovh-Consumer': ovh.consumerKey, 'X-Ovh-Timestamp': String(ts),
      'X-Ovh-Signature': signer({ appSecret: ovh.appSecret, consumerKey: ovh.consumerKey, methode, url, corps, horodatage: ts }),
    };
    if (corps) h['Content-Type'] = 'application/json';
    let r;
    try { r = await fetchImpl(url, { method: methode, headers: h, body: corps || undefined, signal: AbortSignal.timeout(timeoutMs), redirect: 'error' }); }
    catch (e) { throw Object.assign(new Error('echec_envoi'), { avantEnvoi: ECHECS_AVANT_ENVOI.has(e && e.cause && e.cause.code) || ECHECS_AVANT_ENVOI.has(e && e.code) }); }
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    return { statut: r.status, j };
  }

  /* → { ok:true, credits, n } | { ok:false, genre:'numero'|'refus'|'config'|'non_envoye'|'incertain', statut? } */
  async function envoyer({ numero, message }) {
    const corps = { message, sender: ovh.expediteur, receivers: [numero], noStopClause: true, priority: 'high', validityPeriod: 15 };
    const chemin = '/sms/' + encodeURIComponent(ovh.serviceName) + '/jobs';
    let r;
    try {
      r = await appeler('POST', chemin, corps);
      /* Une signature refusée pour cause d'horloge ne coûte rien (rien n'est parti) : on relit l'heure d'OVH et on retente UNE fois. */
      if (r.statut === 401 || (r.statut === 400 && r.j && /signature|timestamp/i.test(String(r.j.message || '')))) {
        ecart = null;
        r = await appeler('POST', chemin, corps);
      }
    } catch (e) {
      /* Rien n'a pu partir : l'heure d'OVH illisible, un nom qui ne se résout pas, une connexion refusée. Sinon (délai, coupure, redirection) : on ne sait pas. */
      return { ok: false, genre: e && e.avantEnvoi ? 'non_envoye' : 'incertain' };
    }
    if (r.statut >= 200 && r.statut < 300) {
      const j = r.j || {};
      const valides = Array.isArray(j.validReceivers) ? j.validReceivers : null;
      const invalides = Array.isArray(j.invalidReceivers) ? j.invalidReceivers : [];
      if (invalides.length || (valides && valides.length === 0)) return { ok: false, genre: 'numero' };
      const credits = typeof j.totalCreditsRemoved === 'number' && j.totalCreditsRemoved >= 0 ? j.totalCreditsRemoved : null;
      return { ok: true, credits, n: Array.isArray(j.ids) ? j.ids.length : 1 };
    }
    if (r.statut === 400 || r.statut === 409 || r.statut === 429) return { ok: false, genre: 'refus', statut: r.statut };
    if (r.statut === 401 || r.statut === 403 || r.statut === 404) return { ok: false, genre: 'config', statut: r.statut };   // clés, droits ou service inconnu : un geste de Justin
    if (r.statut === 503) return { ok: false, genre: 'non_envoye', statut: r.statut };   // « service indisponible » : le travail n'a pas commencé
    if (r.statut >= 500) return { ok: false, genre: 'incertain', statut: r.statut };
    return { ok: false, genre: 'refus', statut: r.statut };
  }

  return { envoyer, base };
}

module.exports = { creerOvh, signer, URL_DEFAUT, URLS_OVH };
