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
 * ⛔ L'IDENTITÉ EST L'IDENTIFIANT DU COMPTE (`b…`, rendu par OP GESTION), PAS LE TEXTE DU LOGIN. Un accès supprimé puis
 * recréé sous le même login est UNE AUTRE personne : l'ancien code l'identifiait par `beta:<login>`, et le nouvel
 * arrivant héritait des contacts, des conversations et des confidences du précédent (relecture du gardien, point 3).
 * Un OP GESTION qui ne rend pas d'identifiant (trop ancien) ferme la porte : on ne retombe pas sur le login.
 *
 * ⛔ SON PROPRE PLAFOND D'ABORD (5 essais ÉCHOUÉS par 15 min, par adresse-réseau ET par couple login + réseau),
 * AVANT tout appel à OP GESTION. Un essai réussi se REMBOURSE : une équipe derrière une même sortie réseau n'use
 * pas le plafond en se connectant, et — surtout — le plafond d'un login n'est plus PARTAGÉ entre adresses : cinq
 * mauvais mots de passe tapés depuis cinq adresses sur « alice » verrouillaient Alice pendant 15 min (relecture
 * adverse, D6). Le verrou global d'un login reste celui d'OP GESTION (5 échecs, 15 min), qui nous protège déjà. Sans lui, ce service servirait de relais de force brute : chaque essai
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
const { cleReseau } = require('./quotas');
const REGEX_LOGIN = /^[a-z0-9._@-]{3,40}$/;
const REGEX_ID = /^b[0-9a-f]{6,32}$/;   // l'identifiant d'un accès bêta chez OP GESTION : 'b' + 10 hexadécimaux
const PAQUET_ETAT = 50;                 // OP GESTION plafonne les accès bêta à 50

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
    const reseau = cleReseau(ip), cleIp = 'betaip:' + reseau, cleLogin = 'betalogin:' + l + ':' + reseau;
    const a = quotas.essai(cleIp, qi.max, qi.fenetreMs);
    if (!a.ok) return { statut: 429, corps: { error: 'trop_d_essais' }, retry: a.retry };
    const b = quotas.essai(cleLogin, ql.max, ql.fenetreMs);
    if (!b.ok) { quotas.rembourser(cleIp); return { statut: 429, corps: { error: 'trop_d_essais' }, retry: b.retry }; }
    const rembourserTout = () => { quotas.rembourser(cleIp); quotas.rembourser(cleLogin); };

    let r;
    try { r = await appeler('/api/beta/login', { login: l, pass }, ip); }
    catch (e) { rembourserTout(); return { statut: 503, corps: { error: 'porte_indisponible' } }; }   // une panne de NOTRE côté n'use pas le plafond de l'essayeur

    if (r.statut === 200 && r.j && r.j.ok === true && typeof r.j.login === 'string' && REGEX_LOGIN.test(r.j.login)) {
      if (typeof r.j.id !== 'string' || !REGEX_ID.test(r.j.id)) { rembourserTout(); return { statut: 503, corps: { error: 'porte_indisponible' } }; }
      const nom = typeof r.j.nom === 'string' ? r.j.nom : r.j.login;
      const personne = stockage.personneCreer({ identifiant: 'beta:' + r.j.id, prenom: nom, nom: '', origine: 'beta', verifie: true });
      ouvertures++;
      rembourserTout();   // un succès n'use pas le plafond des échecs
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
       une porte qui ne sait pas : on ferme (et ce n'est pas un échec de l'essayeur). */
    rembourserTout();
    return { statut: 503, corps: { error: 'porte_indisponible' } };
  }

  /* Relit l'état des accès bêta qui ont une session — EN UNE SEULE REQUÊTE par paquet de 50 (`ids`). Une requête par
     accès dépassait le plafond d'OP GESTION (20 par minute et par adresse pour `/api/beta`) dès 21 sessions : les
     relectures répondaient 429, et un accès COUPÉ dans la Tour gardait sa session (relecture du gardien, point 2).
     Rend les identifiants de PERSONNES dont les sessions viennent d'être supprimées. Ce qu'OP GESTION ne dit pas
     (absent, non booléen, panne) ne coupe personne : on ne sait pas. */
  async function relire() {
    const coupes = [];
    let echec = false;
    const actives = stockage.sessionsBetaActives().filter(p => REGEX_ID.test(p.bid));
    for (let i = 0; i < actives.length; i += PAQUET_ETAT) {
      const paquet = actives.slice(i, i + PAQUET_ETAT);
      try {
        const r = await appeler('/api/beta/etat', { ids: Array.from(new Set(paquet.map(p => p.bid))) }, '127.0.0.1');
        if (r.statut !== 200 || !r.j || !r.j.ouverts || typeof r.j.ouverts !== 'object') { echec = true; continue; }
        for (const p of paquet) {
          const o = r.j.ouverts[p.bid];
          if (o === false) { stockage.sessionsSupprimerPersonne(p.id); coupes.push(p.id); }
          else if (typeof o !== 'boolean') echec = true;
        }
      } catch (e) { echec = true; }
    }
    if (echec) relecturesEchec++; else { relecturesEchec = 0; derniereRelectureOk = horloge(); }
    return coupes;
  }

  return { entrer, relire, etat: () => ({ ouvertures, refusAmont, relecturesEchec, derniereRelectureOk }) };
}

module.exports = { creerPorteBeta, REGEX_LOGIN };
