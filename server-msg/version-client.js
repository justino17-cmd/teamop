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
 * ⛔ AU DÉMARRAGE, rien n'est encore lu : le plancher du fichier seul (`minClient`) jusqu'à la première réponse — un redémarrage
 *    pendant une panne d'OP GESTION n'enferme personne.
 */
function creerVersionClient({ config, fetchImpl = fetch, horloge = Date.now }) {
  const base = String((config.beta && config.beta.urlGestion) || 'http://127.0.0.1:8080').replace(/\/+$/, '');
  const canal = 'messages-' + config.instance;
  const plancher = Number.isInteger(config.minClient) && config.minClient > 0 ? config.minClient : 1;
  const timeoutMs = (config.beta && config.beta.timeoutMs) || 5000;
  let minTour = 0, derniereOk = 0, echecs = 0;

  async function relire() {
    try {
      const r = await fetchImpl(base + '/api/version?app=messages&canal=' + encodeURIComponent(config.instance), { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
      let j = null; try { j = await r.json(); } catch (e) { j = null; }
      if (r.status === 200 && j && j.ok === true && j.canal === canal && Number.isInteger(j.min) && j.min >= 0 && j.min <= 99999) {
        minTour = j.min; derniereOk = horloge(); echecs = 0;
        return true;
      }
    } catch (e) { /* une panne d'OP GESTION : on garde ce qu'on savait */ }
    echecs++;
    return false;
  }

  return {
    relire,
    exige: () => Math.max(plancher, minTour),
    etat: () => ({ minTour, derniereOk, echecs }),
  };
}

module.exports = { creerVersionClient };
