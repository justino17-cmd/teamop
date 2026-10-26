/* ══ LES ROUTES DE L'INVITÉ SANS COMPTE — « ILS CLIQUENT SUR LE LIEN, ILS PEUVENT REJOINDRE LA RÉUNION » ═════════════════════════════════════════════════
 *
 * Justin, 26 octobre 2026 : « quand on va présenter l'application au client, sans qu'ils aient besoin d'installer : ça passe par le Web, ils cliquent sur le lien, ils peuvent rejoindre la réunion. Moi je valide
 * que c'est bien eux, et quand ça se coupe, le lien est mort. » Un client qui n'a NI compte NI application ouvre un lien, tape son nom (et son entreprise), attend à la porte de la salle, et l'organisateur le fait
 * entrer ou le refuse. Le lien meurt avec la salle.
 *
 *   POST /api/reunions/:id/invite/lien               H   le lien « Invité (sans compte) » de l'organisateur : le jeton (192 bits) — créé s'il n'existe pas ; `no-store`
 *   POST /api/reunions/:id/invite/regenerer          H   un autre jeton : l'ANCIEN MEURT (et ceux qui attendent encore avec lui sont renvoyés) ; dix par heure et par réunion
 *   POST /api/invite/apercu {jeton}                  P   ce qu'il faut pour DÉCIDER d'entrer : le titre et l'organisateur — rien d'autre. 410 `lien_invalide` (inconnu), `reunion_terminee`, `lien_remplace`
 *   POST /api/invite/entrer {jeton, nom, entreprise?}  P   se présenter : ARRIVE TOUJOURS À LA PORTE (même sans salle d'attente demandée), sa session naît (cookie `HttpOnly`, jamais lisible par la page) ;
 *                                                         409 `pas_ouverte` (l'organisateur n'est pas là : on réessaie), 423 `verrouillee`, 409 `invites_attente_max`, 429
 *   GET  /api/invite/etat                            G   où j'en suis : ma place, la salle telle qu'un invité la voit, ce qu'elle a dit d'éphémère (rien tant que je suis à la porte)
 *   GET  /api/invite/flux                            G   le flux d'événements (SSE) — les mêmes que pour un participant, pour MA place seulement
 *   POST /api/invite/redemander                      G   revenir à la porte après être parti (jamais après un refus ni une exclusion)
 *   POST /api/invite/quitter {definitif?}            G   partir : ma session est coupée (sauf `definitif:false`, la page qui se ferme ou se recharge : sa place l'attend)
 *   GET  /api/invite/ice                             GS  les identifiants éphémères du relais — ADMIS seulement (un inconnu muni du lien n'en tire pas)
 *   POST /api/invite/signal {a,type,donnees}         GS  la mise en relation avec un participant PRÉSENT
 *   POST /api/invite/main {actif}  ·  /reaction {emoji}  ·  /media {camera?, micro?}  ·  /visio   GS   lever la main, réagir, dire l'état de mon micro et de ma caméra, le jeton de la visio
 *
 * ⛔ CE QU'UN INVITÉ SANS COMPTE NE PEUT PAS (la liste est FERMÉE : seules les routes ci-dessus acceptent sa session, la garde `G` n'est montée nulle part ailleurs) :
 *   · aucune route de compte, de contact, de conversation, d'agenda, de recherche ni de profil — `garde.S` ne lit pas son cookie, il reçoit 401 partout ;
 *   · il n'est JAMAIS promu : ni hôte (l'intérim ne revient qu'à un invité nommé), ni co-hôte (`salleCohote` refuse), ni successeur de l'organisateur (la requête du successeur écarte les `g_…`) ;
 *   · il ne partage PAS son écran (403 `partage_interdit` — décision prudente : un client n'a aucune raison de montrer son écran dans une présentation, et le service ne voit pas un média, donc ne peut pas le
 *     juger après coup), n'enregistre pas, ne dessine pas, ne lance ni sondage, ni minuteur, ni épingle ;
 *   · à la porte, il ne lit rien de la salle : ni qui est dedans, ni combien, ni les mains levées (voir `stockage.appelRangGroupe` et `appels.etatSalleInvite`).
 * ⛔ LES JOURNAUX NE PORTENT NI NOM NI JETON : rien d'ici n'écrit au journal que des compteurs ; le jeton ne voyage QUE dans le corps d'une requête (jamais dans une adresse ni un en-tête), et la page le tient
 * dans le FRAGMENT de l'adresse, que le navigateur n'envoie à personne.
 */
'use strict';
const crypto = require('crypto');
const { cleReseau } = require('./quotas');

const SHA = (x) => crypto.createHash('sha256').update(x).digest('hex');
const JETON_LIEN = /^[A-Za-z0-9_-]{32}$/;

function installerInvites(H, ctx) {
  const { config, stockage, quotas, appels, hub } = ctx;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  const nomCookie = config.cookie.nom + '-i';
  const cookieTexte = (valeur, effacer) => nomCookie + '=' + valeur + '; Path=/; HttpOnly; SameSite=Strict' + (effacer ? '; Max-Age=0' : '') + (config.cookie.secure ? '; Secure' : '');
  /* Les refus du stockage, traduits en chaînes courtes que la page de l'invité sait dire. Un code inconnu est une vraie panne : il part à `next`. */
  const CODES = {
    lien_invalide: [410, 'lien_invalide'], pas_ouverte: [409, 'pas_ouverte'], verrouillee: [423, 'verrouillee'], invites_attente_max: [409, 'invites_attente_max'], nom_requis: [400, 'nom_requis'],
    session_invalide: [401, 'session_requise'], exclu: [403, 'exclu'], refuse: [403, 'refuse'], appel_fini: [409, 'appel_fini'], introuvable: [404, 'introuvable'], interdit: [403, 'interdit'],
    appel_pas_en_cours: [409, 'appel_pas_en_cours'], appareil_non_lie: [403, 'appareil_non_lie'], pas_de_visio: [409, 'pas_de_visio'], visio_indisponible: [503, 'visio_indisponible'],
  };
  const garder = (f) => (req, res, next) => {
    const traduire = (e) => {
      if (e && e.code === 'lien_mort') return refus(res, 410, e.motif === 'remplace' ? 'lien_remplace' : 'reunion_terminee');
      const c = e && CODES[e.code]; if (c) return refus(res, c[0], c[1]);
      return next(e);
    };
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(traduire); }
    catch (e) { traduire(e); }
  };
  /* un plafond (la configuration le surcharge, comme pour les autres routes) : `true` si l'on peut continuer, sinon la réponse 429 est déjà partie */
  function plafond(res, nom, cle, def) {
    const q = Object.assign({}, def, config.quotas[nom] || {});
    const r = quotas.essai(nom + ':' + cle, q.max, q.fenetreMs);
    if (r.ok) return true;
    res.set('Retry-After', String(r.retry));
    refus(res, 429, 'quota_atteint', { retry: r.retry });
    return false;
  }
  const reseau = (req) => cleReseau(req.ip);      // ⛔ `req.ip` (nginx a posé `trust proxy`), jamais l'en-tête brut : un en-tête fourni par le client se falsifie

  /* ── l'organisateur ── */
  H['reunions.invite_lien'] = garder((req, res) => {
    const l = stockage.inviteLien({ id: req.reunion.id, par: req.moi.id, apresMs: config.appels.reunionApresMin * 60000 });
    res.set('Cache-Control', 'no-store');
    res.json({ jeton: l.jeton });
  });
  H['reunions.invite_regenerer'] = garder((req, res) => {
    if (!plafond(res, 'invite_regenerer', req.reunion.id, { max: 10, fenetreMs: 3600000 })) return;
    const l = stockage.inviteLienRegenerer({ id: req.reunion.id, par: req.moi.id });
    appels.couperInvites();                                   // ceux qui attendaient avec l'ancien jeton : leur session est coupée, leur flux se ferme
    hub.reveiller({ uids: Object.keys(l.gids || {}) });       // …et l'organisateur voit la liste d'attente se vider
    res.set('Cache-Control', 'no-store');
    res.json({ jeton: l.jeton, ancien: l.ancien, coupes: l.coupes });
  });

  /* ── celui qui n'a pas de session : l'aperçu et l'entrée ── */
  /* ⛔ L'APERÇU EST PUBLIC : n'importe qui, sans compte, peut demander ce qu'un jeton désigne. Il ne dit donc que de quoi DÉCIDER d'entrer (le titre, l'organisateur) — ni un participant, ni un horaire, ni un lieu.
     Un jeton inconnu et un jeton mal formé : la MÊME réponse (410 `lien_invalide`). Un jeton qui a existé dit pourquoi il ne vaut plus (`reunion_terminee`, `lien_remplace`) : il a 192 bits, le dire n'apprend
     rien à qui ne l'a pas déjà. Limité par réseau. */
  H['invite.apercu'] = garder((req, res) => {
    if (!plafond(res, 'invite_apercu', reseau(req), { max: 60, fenetreMs: 60000 })) return;
    const j = corps(req).jeton;
    const l = typeof j === 'string' && JETON_LIEN.test(j) ? stockage.inviteLienLire(j, config.appels.reunionApresMin * 60000) : null;
    res.set('Cache-Control', 'no-store');
    if (!l) return refus(res, 410, 'lien_invalide');
    if (l.mort) return refus(res, 410, l.mort === 'remplace' ? 'lien_remplace' : 'reunion_terminee');
    res.json({ reunion: { titre: l.reunion.titre, organisateur: l.reunion.organisateur } });
  });
  H['invite.entrer'] = garder((req, res) => {
    const b = corps(req);
    /* ⛔ QUATRE PLAFONDS, dans cet ordre. Les ESSAIS (un client attend que l'organisateur arrive : la page redemande toutes les 30 s) : par réseau, puis par jeton. Les ENTRÉES (une ligne d'invité naît) : par réseau, puis par
       jeton — jugées APRÈS un essai à blanc, pour que l'attente d'un organisateur absent ne consomme pas le droit d'entrer. Un jeton faux consomme un essai : c'est ce qu'on veut compter. */
    if (!plafond(res, 'invite_entrer', reseau(req), { max: 90, fenetreMs: 3600000 })) return;
    if (typeof b.jeton !== 'string' || !JETON_LIEN.test(b.jeton)) return refus(res, 410, 'lien_invalide');
    if (!plafond(res, 'invite_entrer_jeton', SHA(b.jeton), { max: 240, fenetreMs: 3600000 })) return;
    if (typeof b.nom !== 'string' || (b.entreprise !== undefined && b.entreprise !== null && typeof b.entreprise !== 'string')) return refus(res, 400, 'champ_invalide');
    const corpsEntree = { jeton: b.jeton, nom: b.nom, entreprise: b.entreprise || '' };
    appels.inviteEntrer(Object.assign({ sessionH: '', essai: true }, corpsEntree));        // tout est jugé (lien, salle ouverte et tenue, verrou, porte pleine, nom) et rien n'est écrit
    if (!plafond(res, 'invite_cree', reseau(req), { max: 12, fenetreMs: 3600000 })) return;
    if (!plafond(res, 'invite_cree_jeton', SHA(b.jeton), { max: 60, fenetreMs: 3600000 })) return;
    const session = 'opi_' + crypto.randomBytes(32).toString('base64url');
    const r = appels.inviteEntrer(Object.assign({ sessionH: SHA(session) }, corpsEntree));
    res.append('Set-Cookie', cookieTexte(session, false));      // un cookie de SESSION (sans date : il part avec le navigateur) que la page ne lit pas
    res.set('Cache-Control', 'no-store');
    const g = stockage.inviteParSession(SHA(session));
    res.status(201).json({ invite: { id: r.id, nom: g ? g.nom : '', entreprise: g ? g.entreprise : '' }, appel: r.vue, salle: r.salle, attente: true });
  });

  /* ── l'invité ── */
  H['invite.etat'] = (req, res) => {
    const g = req.invite;
    res.json({ invite: { id: g.id, nom: g.nom, entreprise: g.entreprise }, appel: stockage.appelVue(g.id, g.appel), salle: appels.etatSalleInvite(g.appel, g.id) });
  };
  H['invite.flux'] = (req, res) => {
    const r = hub.ouvrir({ uid: req.invite.id, h: req.sessionH, ip: req.ip, req, res, lastId: req.headers['last-event-id'] !== undefined ? req.headers['last-event-id'] : req.query.depuis });
    if (!r.ok) { res.set('Retry-After', String(r.retry)); refus(res, 429, r.code, { retry: r.retry }); }
  };
  H['invite.redemander'] = garder((req, res) => {
    if (!plafond(res, 'invite_redemander', req.invite.id, { max: 20, fenetreMs: 3600000 })) return;
    const r = appels.inviteRedemander({ id: req.invite.id, sessionH: req.sessionH });
    res.json({ appel: r.vue, attente: true, deja: !!r.deja, salle: r.salle });
  });
  H['invite.quitter'] = garder((req, res) => {
    const definitif = corps(req).definitif !== false;           // le bouton « Quitter » : oui ; la page qui se ferme ou se recharge : non (sa place l'attend)
    const r = appels.inviteQuitter({ invite: req.invite, sessionH: req.sessionH, definitif });
    if (definitif) res.append('Set-Cookie', cookieTexte('', true));
    res.json({ ok: true, deja: !!r.deja, definitif });
  });
  /* ⛔ LES IDENTIFIANTS DU RELAIS NE VONT QU'À UN INVITÉ ADMIS : à la porte, un inconnu muni du lien n'ouvre pas d'allocation chez nous (le relais renvoie des paquets vers Internet depuis NOTRE adresse). */
  H['invite.ice'] = garder((req, res) => {
    if (req.appel.statut !== 'present') return refus(res, 404, 'introuvable');
    return H['ice'](req, res);
  });
  H['invite.signal'] = (req, res, next) => H['appels.signal'](req, res, next);
  H['invite.main'] = (req, res, next) => H['salles.main'](req, res, next);
  H['invite.reaction'] = (req, res, next) => H['salles.reaction'](req, res, next);
  H['invite.visio'] = (req, res, next) => H['salles.visio'](req, res, next);
  /* l'état de MON micro et de MA caméra, dit aux autres tuiles — jamais un partage d'écran (voir l'en-tête) */
  H['invite.media'] = garder((req, res, next) => {
    const b = corps(req);
    if (b.partage !== undefined) return refus(res, 403, 'partage_interdit');
    return H['salles.etat'](req, res, next);
  });
}

module.exports = { installerInvites };
