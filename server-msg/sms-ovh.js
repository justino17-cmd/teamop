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
 * ⛔ « INCERTAIN » COÛTE : un délai dépassé, une coupure ou un 5xx ne disent pas si le SMS est parti. L'appelant garde le coût dans le
 * budget (on suppose le pire). Seuls les refus FRANCS (4xx, numéro invalide) rendent le coût.
 */
const crypto = require('crypto');

const URL_DEFAUT = 'https://eu.api.ovh.com/1.0';
/* En production, la base ne peut être que l'un des trois points d'entrée d'OVH (Europe, Canada, États-Unis) : une configuration
   mal copiée ne doit pas envoyer nos clés de signature à un autre hôte. Seuls les bancs (instance bêta) pointent ailleurs. */
const URLS_OVH = /^https:\/\/(?:eu\.api\.ovh\.com|ca\.api\.ovh\.com|api\.us\.ovhcloud\.com)\/1\.0$/;

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
    const ts = await horodatage();
    const h = {
      'X-Ovh-Application': ovh.appKey, 'X-Ovh-Consumer': ovh.consumerKey, 'X-Ovh-Timestamp': String(ts),
      'X-Ovh-Signature': signer({ appSecret: ovh.appSecret, consumerKey: ovh.consumerKey, methode, url, corps, horodatage: ts }),
    };
    if (corps) h['Content-Type'] = 'application/json';
    const r = await fetchImpl(url, { method: methode, headers: h, body: corps || undefined, signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    return { statut: r.status, j };
  }

  /* → { ok:true, credits, n } | { ok:false, genre:'numero'|'refus'|'config'|'incertain', statut? } */
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
      return { ok: false, genre: 'incertain' };   // coupure, délai, redirection, heure illisible : on ne sait pas si c'est parti
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
    if (r.statut >= 500) return { ok: false, genre: 'incertain', statut: r.statut };
    return { ok: false, genre: 'refus', statut: r.statut };
  }

  return { envoyer, base };
}

module.exports = { creerOvh, signer, URL_DEFAUT, URLS_OVH };
