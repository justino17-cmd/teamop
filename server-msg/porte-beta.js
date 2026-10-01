/* ══ LA PORTE BÊTA — ON DEMANDE À OP GESTION, ON NE GARDE AUCUN MOT DE PASSE ═════════════════
 *
 * L'instance bêta d'OP MESSAGES s'ouvre avec les MÊMES accès que la bêta d'OP GESTION (ceux que
 * la Tour ouvre, coupe et supprime). Il n'y a pas de mot de passe stocké chez nous : la porte
 * APPELLE OP GESTION en boucle locale (`POST /api/beta/login`), et si la réponse est « ok » elle
 * crée ou retrouve le compte `beta:<login>` — adresse confirmée par construction — et la route
 * pose le cookie de session.
 * C'est le SEUL pont entre les deux services, et il est unilatéral : OP GESTION ne sait pas
 * qu'OP MESSAGES existe.
 *
 * ⛔ SON PROPRE PLAFOND D'ABORD (5 essais par 15 min, par identifiant ET par adresse), AVANT tout
 * appel à OP GESTION. Sans lui, ce service servirait de relais de force brute : chaque essai
 * coûterait une requête à OP GESTION, et seul SON plafond (qui compte l'adresse du VPS si on ne
 * lui dit pas laquelle) protégerait quoi que ce soit.
 * ⛔ `X-Forwarded-For: <req.ip>` : OP GESTION lit l'adresse dans cet en-tête (derrière son
 * proxy) ; sans lui, tous nos visiteurs lui paraîtraient venir de 127.0.0.1 et ils partageraient
 * UN plafond — un seul mauvais joueur verrouillerait toute la bêta. `req.ip` vient d'Express
 * (`trust proxy 1`), jamais d'un en-tête brut du client.
 * ⛔ FERMÉE PAR DÉFAUT : si OP GESTION ne répond pas (panne, délai, réponse illisible, tout statut
 * inattendu), la porte répond 503 `porte_indisponible`. Une porte qui s'ouvre quand son
 * gardien se tait est une porte ouverte.
 * ⛔ LE MOT DE PASSE NE SORT PAS DE LA MACHINE (boucle locale), N'EST NI GARDÉ NI JOURNALISÉ : ce
 * module ne journalise aucun champ de la requête.
 *
 * ⛔ UN ACCÈS COUPÉ DEPUIS LA TOUR FERME LES SESSIONS DÉJÀ OUVERTES : toutes les 60 s (réglable),
 * `relire()` demande `POST /api/beta/etat` pour chaque identifiant qui a une session, et supprime
 * les sessions de ceux qu'OP GESTION dit coupés ; l'appelant ferme leurs flux. Une panne d'OP
 * GESTION n'éjecte personne : on ne sait pas, donc on ne coupe pas.
 */
const REGEX_LOGIN = /^[a-z0-9._@-]{3,40}$/;

function creerPorteBeta({ config, quotas, stockage, fetchImpl = fetch, horloge = Date.now }) {
  const q = (nom, def) => Object.assign({}, def, config.quotas[nom] || {});
  const base = String(config.beta.urlGestion).replace(/\/+$/, '');
  let derniereRelectureOk = 0, relecturesEchec = 0, ouvertures = 0, refusAmont = 0;

  async function appeler(chemin, corps, ip) {
    const r = await fetchImpl(base + chemin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(config.beta.timeoutMs),
      redirect: 'error',
    });
    let j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    return { statut: r.status, j };
  }

  /* → { statut, corps, retry?, personne? } ; la route traduit en réponse HTTP. */
  async function entrer({ login, pass, ip }) {
    if (typeof login !== 'string' || typeof pass !== 'string' || !pass || pass.length > 200) return { statut: 400, corps: { error: 'champ_invalide' } };
    const l = login.trim().toLowerCase();
    if (!REGEX_LOGIN.test(l)) return { statut: 400, corps: { error: 'champ_invalide' } };
    /* ⛔ LE PLAFOND AVANT L'APPEL. */
    const qi = q('beta_ip', { max: 5, fenetreMs: 15 * 60000 }), ql = q('beta_login', { max: 5, fenetreMs: 15 * 60000 });
    const a = quotas.essai('betaip:' + ip, qi.max, qi.fenetreMs);
    if (!a.ok) return { statut: 429, corps: { error: 'trop_d_essais' }, retry: a.retry };
    const b = quotas.essai('betalogin:' + l, ql.max, ql.fenetreMs);
    if (!b.ok) return { statut: 429, corps: { error: 'trop_d_essais' }, retry: b.retry };

    let r;
    try { r = await appeler('/api/beta/login', { login: l, pass }, ip); }
    catch (e) { return { statut: 503, corps: { error: 'porte_indisponible' } }; }

    if (r.statut === 200 && r.j && r.j.ok === true && typeof r.j.login === 'string' && REGEX_LOGIN.test(r.j.login)) {
      const nom = typeof r.j.nom === 'string' ? r.j.nom : r.j.login;
      const personne = stockage.personneCreer({ identifiant: 'beta:' + r.j.login, prenom: nom, nom: '', origine: 'beta', verifie: true });
      ouvertures++;
      return { statut: 200, corps: { ok: true }, personne };
    }
    if (r.statut === 403) {
      /* Le message de « coupé » ne vient qu'APRÈS un mot de passe juste côté OP GESTION : le dire
         ne révèle rien à qui ne connaît pas déjà le mot de passe. */
      const coupe = r.j && typeof r.j.error === 'string' && /coup/i.test(r.j.error);
      return coupe ? { statut: 403, corps: { error: 'acces_coupe' } } : { statut: 401, corps: { error: 'identifiants' } };
    }
    if (r.statut === 429) { refusAmont++; return { statut: 429, corps: { error: 'verrouille' }, retry: 900 }; }
    /* Tout le reste — 5xx, 404 (route absente d'un OP GESTION trop ancien), corps illisible — est
       une porte qui ne sait pas : on ferme. */
    return { statut: 503, corps: { error: 'porte_indisponible' } };
  }

  /* Relit l'état des accès bêta qui ont une session. Rend les identifiants de PERSONNES dont les
     sessions viennent d'être supprimées. */
  async function relire() {
    const coupes = [];
    let echec = false;
    for (const p of stockage.sessionsBetaActives()) {
      if (!REGEX_LOGIN.test(p.login)) continue;
      try {
        const r = await appeler('/api/beta/etat', { login: p.login }, '127.0.0.1');
        if (r.statut === 200 && r.j && r.j.ouvert === false) { stockage.sessionsSupprimerPersonne(p.id); coupes.push(p.id); }
        else if (r.statut !== 200 || !r.j || typeof r.j.ouvert !== 'boolean') echec = true;
      } catch (e) { echec = true; }
    }
    if (echec) relecturesEchec++; else { relecturesEchec = 0; derniereRelectureOk = horloge(); }
    return coupes;
  }

  return { entrer, relire, etat: () => ({ ouvertures, refusAmont, relecturesEchec, derniereRelectureOk }) };
}

module.exports = { creerPorteBeta, REGEX_LOGIN };
