/* ══ LA VERSION MINIMALE DE LA PAGE — RÉGLÉE DEPUIS LA TOUR, RELUE CHEZ OP GESTION ═════════════════════════════════════════════
 *
 * Justin, 6 octobre 2026 : « pour les mises à jour, je veux aussi le forçage de mise à jour, comme sur OP GESTION depuis la Tour ;
 * le panneau OP MESSAGES, le panneau OP GESTION, et que tout soit bien séparé ». La Tour pose le minimum de CHAQUE instance
 * (`messages-beta`, `messages-prod`) sur le serveur d'OP GESTION (`server/index.js`, `versionsCfg.canaux`) ; ce module vient le
 * relire, en boucle locale, comme `porte-beta.js` relit les accès bêta. Ce service ne garde aucun réglage de la Tour sur son disque.
 *
 * Ce qu'il rend : `exige()` — le numéro de page en dessous duquel ce service REFUSE d'écrire (426) et la page se met à jour d'elle-même.
 * C'est le plus grand de deux : le plancher du fichier de configuration (`minClient`, 1 par défaut) et celui de la Tour.
 *
 * ⛔ L'INSTANCE SE NOMME, ET LA RÉPONSE DOIT LA NOMMER EN RETOUR (`canal`). Un OP GESTION d'avant ignore `app` et `canal` et rend le
 *    minimum PUBLIC d'OP GESTION (des centaines) : pris pour le nôtre, il bloquerait TOUTES les pages d'OP MESSAGES d'un coup. Une
 *    réponse sans l'écho exact ne change rien.
 * ⛔ UNE PANNE NE CHANGE RIEN : on garde le dernier minimum lu. Lever l'exigence sur une panne rouvrirait l'écriture aux vieilles
 *    pages ; en inventer une bloquerait tout le monde. On ne sait pas, donc on ne bouge pas.
 * ⛔ UN MINIMUM AU-DESSUS DE LA PAGE SERVIE (`versionPage`) est ignoré : personne ne pourrait le satisfaire.
 * ⛔ AU DÉMARRAGE, rien n'est encore lu : le plancher du fichier seul (`minClient`) jusqu'à la première réponse — un redémarrage
 *    pendant une panne d'OP GESTION n'enferme personne.
 */
function creerVersionClient({ config, versionPage = 0, fetchImpl = fetch, horloge = Date.now, journaliser = () => {} }) {
  const base = String((config.beta && config.beta.urlGestion) || 'http://127.0.0.1:8080').replace(/\/+$/, '');
  const canal = 'messages-' + config.instance;
  const plancher = Number.isInteger(config.minClient) && config.minClient > 0 ? config.minClient : 1;
  const timeoutMs = (config.beta && config.beta.timeoutMs) || 5000;
  let minTour = 0, derniereOk = 0, echecs = 0, ignore = 0;

  async function relire() {
    try {
      const r = await fetchImpl(base + '/api/version?app=messages&canal=' + encodeURIComponent(config.instance), { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
      let j = null; try { j = await r.json(); } catch (e) { j = null; }
      if (r.status === 200 && j && j.ok === true && j.canal === canal && Number.isInteger(j.min) && j.min >= 0 && j.min <= 99999) {
        /* ⛔ UN MINIMUM QU'AUCUNE PAGE SERVIE N'ATTEINT N'EST PAS APPLIQUÉ (relecture du gardien, 6 octobre 2026) : au-dessus du numéro de la page que CE service
           sert, toutes les pages — même à jour — recevraient 426 et tourneraient sur « Réessayer » sans issue. Une faute de frappe dans la Tour, un retour en arrière du
           déploiement, et tout le monde serait muet. On l'ignore, et on le DIT au journal (un nombre, rien d'autre). */
        if (versionPage > 0 && j.min > versionPage) { if (ignore !== j.min) journaliser('version_min_ignoree', { n: j.min, motif: 'au-dessus de la page servie v' + versionPage }); ignore = j.min; minTour = 0; }
        else { minTour = j.min; ignore = 0; }
        derniereOk = horloge(); echecs = 0;
        return true;
      }
    } catch (e) { /* une panne d'OP GESTION : on garde ce qu'on savait */ }
    echecs++;
    return false;
  }

  return {
    relire,
    exige: () => Math.max(plancher, minTour),
    etat: () => ({ minTour, derniereOk, echecs, ignore }),
  };
}

module.exports = { creerVersionClient };
