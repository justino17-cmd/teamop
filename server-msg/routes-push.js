/* ══ LES ROUTES DES NOTIFICATIONS PUSH — S'ABONNER, SE DÉSABONNER, UN ESSAI, ACQUITTER ═══════════════════════════════════════════
 *
 *   POST /api/push/abonner     {sub}       S  inscrit CET appareil (le `PushSubscription.toJSON()` du navigateur) pour la personne de la SESSION
 *   POST /api/push/desabonner  {endpoint}  S  retire un appareil — le sien seulement
 *   POST /api/push/essai       {}          S  envoie une notification d'essai aux appareils de la personne (3 par heure) ; dit combien l'ont reçue
 *   POST /api/flux/ack         {gid}       S  « j'ai REÇU et MONTRÉ les événements jusqu'à `gid` » — la page visible l'envoie, la notification n'est pas envoyée
 *
 * Comme `routes-pieces.js` et `telephone.js`, ce fichier branche ses gestionnaires dans le tableau de `routes.js` (`installerPush`) : une fonction par ligne du
 * manifeste. Le cœur (liste blanche, VAPID, charge, acquittement) vit dans `push.js` ; la clé publique est servie par `GET /api/config` (`push.vapid`).
 * Le réglage « Aperçu du message dans la notification » n'a PAS de route à lui : c'est `prefs.apercu_notif` de `POST /api/moi/maj`, qui existe déjà — une seconde route
 * qui ferait la même chose serait une seconde porte à garder.
 *
 * ⛔ L'IDENTITÉ VIENT DE LA SESSION, jamais du corps : on n'inscrit jamais un appareil au nom d'une autre personne. Un point d'accès déjà inscrit pour quelqu'un d'autre
 * passe à la personne qui l'inscrit (« un appareil, une personne » : l'appareil prêté ou revendu suit son dernier utilisateur).
 * ⛔ UN ACQUITTEMENT NE PEUT PAS DÉPASSER LE JOURNAL : un `gid` plus grand que le dernier événement écrit est ramené à ce dernier. Sans ça, une page qui se trompe (ou une
 * personne qui s'amuse) acquitterait d'avance TOUS les événements à venir et ne recevrait plus jamais une notification.
 * ⛔ Chaque refus est une chaîne courte que la page sait dire (`public/api.js`, `MESSAGES`) : `champ_invalide`, `service_push_refuse` (le navigateur utilise un service
 * push que le service n'accepte pas), `push_indisponible` (la paire de clés est illisible), `quota_atteint`.
 */
'use strict';

function installerPush(H, ctx) {
  const { config, stockage, quotas, push } = ctx;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};

  /* Chaque gestionnaire est protégé ici : une exception (ou un rejet) devient une réponse 500 propre, jamais un processus qui tombe. */
  const garder = (f) => (req, res, next) => {
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(next); }
    catch (e) { next(e); }
  };
  function plafond(res, nom, cle, def) {
    const q = Object.assign({}, def, config.quotas[nom] || {});
    const r = quotas.essai(nom + ':' + cle, q.max, q.fenetreMs);
    if (r.ok) return true;
    res.set('Retry-After', String(r.retry));
    refus(res, 429, 'quota_atteint', { retry: r.retry });
    return false;
  }

  H['push.abonner'] = garder((req, res) => {
    if (!plafond(res, 'push_abonner', req.moi.id, { max: 60, fenetreMs: 3600000 })) return;
    const r = push.abonner(req.moi.id, corps(req).sub);
    if (!r.ok) return refus(res, r.code === 'push_indisponible' ? 503 : 400, r.code);
    res.json({ ok: true, appareils: r.appareils });
  });

  H['push.desabonner'] = garder((req, res) => {
    const e = corps(req).endpoint;
    if (typeof e !== 'string' || e.length < 1 || e.length > 2048) return refus(res, 400, 'champ_invalide');
    if (!plafond(res, 'push_desabonner', req.moi.id, { max: 60, fenetreMs: 3600000 })) return;
    res.json({ ok: true, retire: push.desabonner(req.moi.id, e) });
  });

  H['push.essai'] = garder(async (req, res) => {
    if (!push.actif()) return refus(res, 503, 'push_indisponible');
    if (!plafond(res, 'push_essai', req.moi.id, { max: 3, fenetreMs: 3600000 })) return;
    const r = await push.essai(req.moi.id);
    res.json({ ok: true, appareils: r.appareils | 0, envoyes: r.envoyes | 0 });
  });

  H['flux.ack'] = garder((req, res) => {
    const g = corps(req).gid;
    if (!Number.isInteger(g) || g < 0) return refus(res, 400, 'champ_invalide');
    push.acquitter(req.moi.id, Math.min(g, stockage.journalMax()));
    res.json({ ok: true });
  });
}

module.exports = { installerPush };
