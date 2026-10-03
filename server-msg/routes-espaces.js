/* ══ LES ROUTES DES ESPACES PROFESSIONNELS — ESPACES, MEMBRES, INVITATIONS, CANAUX, « CONTACTS DE L'ENTREPRISE » ═══════════════════════════════
 *
 *   GET  /api/espaces                                   S   mes espaces, ma formule (celle de la PERSONNE) et si l'abonnement est ouvert
 *   POST /api/espaces                          {nom}    V PRO  créer un espace (3 au plus par personne) — la fonction Pro par excellence
 *   GET  /api/espaces/:id                               E   l'espace, mon rôle, les canaux que JE vois ; l'administrateur y lit aussi la formule, les places, les invitations
 *   POST /api/espaces/:id/maj                  {nom}    EP
 *   POST /api/espaces/:id/transferer           {uid}    EP  passer la propriété à un membre (qui devient administrateur ; l'ancien reste administrateur)
 *   POST /api/espaces/:id/supprimer {confirmation}      EP  dissoudre (refusé tant qu'un abonnement court)
 *   POST /api/espaces/:id/quitter                       E   le propriétaire ne part pas (409 `proprio`) : il passe la main d'abord
 *   GET  /api/espaces/:id/contacts                      E   « Contacts de l'entreprise » : les membres de MON espace, et personne d'autre
 *   POST /api/espaces/:id/membres/role      {uid,admin} EA  seul le propriétaire rétrograde un administrateur ; le propriétaire ne change pas (409 `proprio`)
 *   POST /api/espaces/:id/membres/retirer       {uid}   EA  seul le propriétaire retire un administrateur ; jamais le propriétaire ; les liens d'invitation de l'espace sont RÉVOQUÉS (le retiré en connaît les codes)
 *   POST /api/espaces/:id/invitations      {max,jours}  EA PRO  un lien : un code long, expirant, borné en utilisations, révocable ; 402 `places_epuisees`
 *   POST /api/espaces/:id/invitations/revoquer          EA
 *   POST /api/invitations/lire                  {code}  S   aperçu — n'accepte rien, ne dit que l'espace et celui qui invite
 *   POST /api/invitations/accepter              {code}  V   rejoindre : membre de l'espace et de ses canaux publics
 *   POST /api/espaces/:id/canaux     {nom,prive,membres} EA PRO  créer un canal (public : tous les membres de l'espace ; privé : ceux qu'on y met)
 *   POST /api/espaces/:id/canaux/:cid/maj      {nom}    EA  renommer — l'administrateur doit être MEMBRE du canal
 *   POST /api/espaces/:id/canaux/:cid/supprimer {confirmation}  EA
 *   POST /api/espaces/:id/canaux/:cid/membres/ajouter {uids} / .../retirer {uid}  EA  (canaux PRIVÉS ; ceux d'un canal public sont ceux de l'espace) ; retirer suit la hiérarchie de l'espace : seul le propriétaire retire un administrateur, personne ne retire le propriétaire
 *
 * Comme `routes-push.js` et `compte.js`, ce fichier branche ses gestionnaires dans le tableau de `routes.js` (`installerEspaces`) : une fonction par ligne du manifeste. Le SQL est
 * dans `stockage.js` ; la formule est `formule.js` (le garde `PRO` d'`app.js` la lit AVANT d'arriver ici).
 *
 * ⛔ L'ESPACE, LA PERSONNE ET LE RÔLE VIENNENT DE LA SESSION ET DE LA BASE, jamais du corps : un `{espace, role, proprio}` envoyé pour s'attribuer un droit est ignoré. Un espace dont on
 * n'est pas membre répond 404, la MÊME réponse qu'un espace qui n'existe pas : un non-membre ne voit RIEN (ni le nom, ni les membres, ni le nombre de canaux).
 * ⛔ « Contacts de l'entreprise » n'est PAS un annuaire public : les membres de MON espace seulement. Aucune recherche par nom hors de l'espace (décision du 1er octobre 2026 : on
 * trouve quelqu'un par son numéro exact, par un lien, ou parce qu'on est dans le même espace — jamais par un nom).
 * ⛔ Seul l'administrateur voit POURQUOI une fonction Pro refuse (impayé, jamais abonné) : un membre ne voit que « fonction Pro ». Une fonction refusée ne retire RIEN — ni les messages,
 * ni les canaux, ni les membres.
 */
'use strict';
const crypto = require('crypto');
const { nettoyerNom, ID_CONV, ID_PERS, CODE } = require('./routes');
const { cleReseau } = require('./quotas');

const ID_ESPACE = /^e_[0-9a-f]{32}$/;
const JOUR = 86400000;
const NOM_MAX = 80;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');

function installerEspaces(H, ctx) {
  const { config, stockage, quotas, hub, formule, horloge } = ctx;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  const entier = (x) => Number.isInteger(x) ? x : null;
  /* Les codes de refus du stockage, traduits : tous des chaînes courtes que la page sait dire (`public/api.js`, `MESSAGES`). Un code inconnu est une vraie panne : il part à `next`. */
  const CODES = { introuvable: [404, 'introuvable'], interdit: [403, 'interdit'], proprio: [409, 'proprio'], trop_d_espaces: [409, 'trop_d_espaces'], lien_invalide: [410, 'lien_invalide'],
    canal_public: [409, 'canal_public'], membre_inconnu: [400, 'membre_inconnu'], trop_de_canaux: [409, 'trop_de_canaux'], groupe_plein: [409, 'groupe_plein'],
    destinataire_invalide: [409, 'destinataire_invalide'], champ_invalide: [400, 'champ_invalide'], espace_complet: [409, 'espace_indisponible'] };
  const garder = (f) => (req, res, next) => {
    const traduire = (e) => { const c = e && CODES[e.code]; if (c) return refus(res, c[0], c[1]); return next(e); };
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(traduire); }
    catch (e) { traduire(e); }
  };
  function plafond(res, nom, cle, def) {
    const q = Object.assign({}, def, config.quotas[nom] || {});
    const r = quotas.essai(nom + ':' + cle, q.max, q.fenetreMs);
    if (r.ok) return true;
    res.set('Retry-After', String(r.retry));
    refus(res, 429, 'quota_atteint', { retry: r.retry });
    return false;
  }
  const effacer = (ids) => { if (ids && ids.length && typeof ctx.effacerPieces === 'function') ctx.effacerPieces(ids); };
  /* Une notification DANS l'application (pas de push : « un nouveau membre » n'est pas un message) — ratée, elle ne défait pas le geste. */
  function notifier(uid, titre, texte, cible) {
    try { stockage.notifCreer({ uid, type: 'espace', titre, texte, cible }); hub.reveiller({ uids: [uid] }); } catch (e) { /* une notification ratée ne défait pas le geste */ }
  }
  const nomAffiche = (p) => (p && ((p.prenom + ' ' + p.nom).trim())) || 'Quelqu\'un';
  /* Les membres d'un espace apprennent que quelque chose a changé (membre arrivé, parti, rôle, nom, canal) : un événement éphémère, la page relit ce qu'elle a le droit de voir. */
  const prevenir = (uids, espace) => { try { hub.emettre(Array.from(new Set(uids)), 'espace', { espace }); } catch (e) { /* pas de flux ouvert : la page relira à l'ouverture */ } };
  const nomValide = (v) => { if (typeof v !== 'string') return null; const n = nettoyerNom(v); return n && Array.from(n).length <= NOM_MAX ? n : null; };
  const CONFIRMATION = 'SUPPRIMER';
  function detail(req) {
    const e = req.espace, uid = req.moi.id, id = e.espace.id, admin = e.moi.role === 'admin';
    const v = formule.formuleDe({ espace: id });
    const o = {
      espace: { id, nom: e.espace.nom, proprio: e.espace.proprio === uid, cree: e.espace.cree },
      moi: { role: e.moi.role }, membres_n: stockage.espaceMembresN(id), canaux: stockage.canauxVisibles(id, uid),
      fonctions_pro: v.formule === 'pro',          // un membre ne sait que ceci : les fonctions Pro marchent ou non — le POURQUOI est pour l'administrateur
    };
    if (admin) {
      const places = formule.placesDe(id);
      o.admin = { formule: v.formule, motif: v.motif, sursis_jusqua: v.sursis_jusqua || null, places: Number.isFinite(places) ? places : null, invitations: stockage.invitationsVivantes(id) };
    }
    return o;
  }

  /* ── les espaces ── */
  H['espaces.liste'] = garder((req, res) => {
    const v = formule.formuleDe({ personne: req.moi.id });
    res.json({
      espaces: stockage.espacesDe(req.moi.id).map(e => ({ id: e.id, nom: e.nom, role: e.role, proprio: e.proprio === req.moi.id, membres_n: e.membres_n })),
      formule: v.formule, abonnement_ouvert: !!(ctx.facturation && ctx.facturation.ouvert()),
    });
  });

  H['espaces.creer'] = garder((req, res) => {
    const nom = nomValide(corps(req).nom);
    if (!nom) return refus(res, 400, 'champ_invalide');
    if (!plafond(res, 'espace_creer', req.moi.id, { max: 10, fenetreMs: 3600000 })) return;
    const r = stockage.espaceCreer({ nom, proprio: req.moi.id });
    const e = stockage.espacePourMembre(r.id, req.moi.id);
    req.espace = e;
    res.status(201).json(detail(req));
  });

  H['espaces.lire'] = garder((req, res) => res.json(detail(req)));

  H['espaces.maj'] = garder((req, res) => {
    const nom = nomValide(corps(req).nom);
    if (!nom) return refus(res, 400, 'champ_invalide');
    const id = req.espace.espace.id;
    const r = stockage.espaceMaj({ id, nom });
    if (r.change) prevenir(stockage.espaceUids(id), id);
    req.espace = stockage.espacePourMembre(id, req.moi.id);
    res.json(detail(req));
  });

  const e0 = (req) => req.espace.espace.nom || 'Espace';
  H['espaces.transferer'] = garder((req, res) => {
    const u = corps(req).uid, id = req.espace.espace.id;
    if (typeof u !== 'string' || !ID_PERS.test(u)) return refus(res, 400, 'champ_invalide');
    const r = stockage.espaceTransferer({ espace: id, de: req.moi.id, vers: u });
    for (const c of r.convs) hub.reveiller({ conv: c });
    notifier(u, e0(req), 'Tu es maintenant propriétaire de l\'espace.', id);
    prevenir(stockage.espaceUids(id), id);
    req.espace = stockage.espacePourMembre(id, req.moi.id);
    res.json(detail(req));
  });

  H['espaces.supprimer'] = garder((req, res) => {
    if (corps(req).confirmation !== CONFIRMATION) return refus(res, 400, 'confirmation_requise');
    const id = req.espace.espace.id, a = stockage.abonnementLire(id);
    /* ⛔ UN ABONNEMENT QUI COURT NE SE LAISSE PAS SANS ESPACE : dissoudre l'espace laisserait Stripe prélever pour rien. On le résilie d'abord (portail) ; la relecture le voit. */
    if (a && a.abonnement && !['canceled', 'incomplete_expired', 'aucun'].includes(a.statut)) return refus(res, 409, 'abonnement_actif');
    const r = stockage.espaceSupprimer(id);
    effacer(r.pieces);
    for (const u of r.membres) hub.reveiller({ uids: [u] });
    prevenir(r.membres, id);
    res.json({ ok: true });
  });

  H['espaces.quitter'] = garder((req, res) => {
    const id = req.espace.espace.id, uid = req.moi.id;
    const r = stockage.espaceMembreRetirer({ espace: id, uid });
    effacer(r.pieces);
    hub.reveiller({ uids: [uid] });
    for (const c of r.convs) hub.reveiller({ conv: c });
    prevenir(stockage.espaceUids(id).concat([uid]), id);
    res.json({ ok: true });
  });

  /* « Contacts de l'entreprise » : les membres de l'espace. Un administrateur lit la liste COMPLÈTE (c'est le registre de son entreprise) ; un membre ne voit pas ceux avec qui un
     blocage existe. Jamais un autre espace, jamais une recherche par nom côté service : la page filtre ce qu'elle a reçu. */
  H['espaces.contacts'] = garder((req, res) => {
    const id = req.espace.espace.id;
    res.json({ espace: { id, nom: req.espace.espace.nom }, contacts: stockage.espaceMembres(id, req.moi.id, { tous: req.espace.moi.role === 'admin' }) });
  });

  /* ── les membres ── */
  const cibleMembre = (req, res) => {
    const u = corps(req).uid;
    if (typeof u !== 'string' || !ID_PERS.test(u)) { refus(res, 400, 'champ_invalide'); return null; }
    return u;
  };
  const estAdmin = (id, u) => { const x = stockage.espacePourMembre(id, u); return !!x && x.moi.role === 'admin'; };
  H['espaces.membres.role'] = garder((req, res) => {
    const u = cibleMembre(req, res); if (!u) return;
    const b = corps(req), id = req.espace.espace.id;
    if (typeof b.admin !== 'boolean') return refus(res, 400, 'champ_invalide');
    /* ⛔ SEUL LE PROPRIÉTAIRE RÉTROGRADE UN ADMINISTRATEUR (deux administrateurs ne se défont pas l'un l'autre) ; n'importe quel administrateur en nomme un */
    if (!b.admin && estAdmin(id, u) && req.espace.espace.proprio !== req.moi.id) return refus(res, 403, 'interdit');
    const r = stockage.espaceRoleMembre({ espace: id, uid: u, admin: b.admin });
    if (r.change) { for (const c of r.convs) hub.reveiller({ conv: c }); prevenir(stockage.espaceUids(id), id); }
    res.json({ ok: true, change: r.change });
  });

  H['espaces.membres.retirer'] = garder((req, res) => {
    const u = cibleMembre(req, res); if (!u) return;
    const id = req.espace.espace.id;
    if (u === req.moi.id) return refus(res, 400, 'champ_invalide');            // on se retire par « quitter »
    if (estAdmin(id, u) && req.espace.espace.proprio !== req.moi.id) return refus(res, 403, 'interdit');   // seul le propriétaire retire un administrateur
    /* ⛔ RETIRER QUELQU'UN RÉVOQUE LES LIENS D'INVITATION DE L'ESPACE (il en connaît les codes ; `liens_revoques` le dit à l'administrateur, qui en recrée un). Quitter, lui, n'en révoque aucun. */
    const r = stockage.espaceMembreRetirer({ espace: id, uid: u, revoquerLiens: true });
    effacer(r.pieces);
    hub.reveiller({ uids: [u] });
    for (const c of r.convs) hub.reveiller({ conv: c });
    prevenir(stockage.espaceUids(id).concat([u]), id);
    res.json({ ok: true, liens_revoques: r.liens });
  });

  /* ── les invitations ── */
  const borne = (b, defMax, defJours) => {
    const max = b.max === undefined ? defMax : entier(b.max), jours = b.jours === undefined ? defJours : entier(b.jours);
    return (max !== null && max >= 1 && max <= 100 && jours !== null && jours >= 1 && jours <= 30) ? { max, jours } : null;
  };
  H['espaces.invitations.creer'] = garder((req, res) => {
    const b = borne(corps(req), 10, 7);
    if (!b) return refus(res, 400, 'champ_invalide');
    if (!plafond(res, 'lien', req.moi.id, { max: 20, fenetreMs: 3600000 })) return;
    const id = req.espace.espace.id;
    /* ⛔ AU-DELÀ DES PLACES PAYÉES, RIEN : un lien ne laisse pas entrer plus de monde que l'abonnement n'en couvre. Les places restantes bornent ses utilisations (et l'acceptation
       les recompte : d'autres liens ont pu les prendre entre-temps). Sans abonnement, la bêta n'a pas de limite (`Infinity`). */
    const places = formule.placesDe(id), n = stockage.espaceMembresN(id);
    if (n >= places) return refus(res, 402, 'places_epuisees', { places, membres: n });
    const max = Math.min(b.max, Number.isFinite(places) ? places - n : b.max);
    const code = crypto.randomBytes(16).toString('base64url');
    stockage.lienCreer({ h: sha(code), genre: 'espace', cible: id, par: req.moi.id, ttlMs: b.jours * JOUR, max });
    res.status(201).json({ code, expire_le: horloge() + b.jours * JOUR, max });
  });

  H['espaces.invitations.revoquer'] = garder((req, res) => res.json({ ok: true, n: stockage.invitationsRevoquer(req.espace.espace.id) }));

  H['invitations.lire'] = garder((req, res) => {
    if (!plafond(res, 'lien_ip', cleReseau(req.ip), { max: 60, fenetreMs: 60000 })) return;
    const c = corps(req).code;
    if (typeof c !== 'string' || !CODE.test(c)) return refus(res, 410, 'lien_invalide');
    const a = stockage.invitationApercu(sha(c));
    if (!a) return refus(res, 410, 'lien_invalide');
    res.json({ apercu: a });
  });

  H['invitations.accepter'] = garder((req, res) => {
    if (!plafond(res, 'lien_ip', cleReseau(req.ip), { max: 60, fenetreMs: 60000 })) return;
    const c = corps(req).code;
    if (typeof c !== 'string' || !CODE.test(c)) return refus(res, 410, 'lien_invalide');
    const h = sha(c), cible = stockage.invitationEspace(h);
    if (!cible) return refus(res, 410, 'lien_invalide');
    /* ⛔ REJOINDRE NE COÛTE RIEN À CELUI QUI REJOINT : aucune formule exigée de sa part. C'est l'ESPACE qui doit pouvoir accueillir (formule Pro, places) ; sinon une seule phrase
       neutre, la même pour « complet » et « abonnement en retard » — celui qui arrive n'a pas à savoir pourquoi, il demande à l'administrateur. */
    const dejaMembre = !!stockage.espacePourMembre(cible, req.moi.id);
    if (!dejaMembre && formule.formuleDe({ espace: cible }).formule !== 'pro') return refus(res, 409, 'espace_indisponible');
    const r = stockage.invitationAccepter({ h, uid: req.moi.id, max: formule.placesDe(cible) });
    const e = stockage.espacePourMembre(cible, req.moi.id);
    if (!r.deja) {
      for (const cv of r.convs) hub.reveiller({ conv: cv });
      notifier(r.par, e.espace.nom || 'Espace', nomAffiche(req.moi) + ' a rejoint l\'espace.', cible);
      prevenir(stockage.espaceUids(cible), cible);
    }
    res.json({ deja: r.deja, espace: { id: cible, nom: e.espace.nom } });
  });

  /* ── les canaux ── */
  H['canaux.creer'] = garder((req, res) => {
    const b = corps(req), nom = nomValide(b.nom);
    if (!nom) return refus(res, 400, 'champ_invalide');
    if (b.prive !== undefined && typeof b.prive !== 'boolean') return refus(res, 400, 'champ_invalide');
    const prive = b.prive === true;
    let membres = [];
    if (b.membres !== undefined) {
      if (!Array.isArray(b.membres) || b.membres.length > 200 || !b.membres.every(x => typeof x === 'string' && ID_PERS.test(x))) return refus(res, 400, 'champ_invalide');
      membres = prive ? b.membres : [];       // un canal public a pour membres TOUS ceux de l'espace : une liste n'y a pas de sens, elle est ignorée
    }
    if (!plafond(res, 'canal', req.moi.id, { max: 30, fenetreMs: 3600000 })) return;
    const id = req.espace.espace.id;
    const r = stockage.canalCreer({ espace: id, par: req.moi.id, nom, prive, membres });
    hub.reveiller({ conv: r.id });
    res.status(201).json({ canal: { id: r.id, nom, prive }, canaux: stockage.canauxVisibles(id, req.moi.id) });
  });

  /* Le canal de CET espace dont l'administrateur est membre — sinon 404 : un canal privé qu'on ne compte pas n'existe pas, même pour l'administrateur de l'espace. */
  const canalDeAdmin = (req, res) => {
    const cid = req.params.cid;
    const k = ID_CONV.test(cid) ? stockage.canalPourAdmin(req.espace.espace.id, cid, req.moi.id) : null;
    if (!k) { refus(res, 404, 'introuvable'); return null; }
    return { cid, prive: k.prive };
  };
  H['canaux.maj'] = garder((req, res) => {
    const nom = nomValide(corps(req).nom);
    if (!nom) return refus(res, 400, 'champ_invalide');
    const k = canalDeAdmin(req, res); if (!k) return;
    const r = stockage.convMaj({ conv: k.cid, par: req.moi.id, nom });
    if (r.change) hub.reveiller({ conv: k.cid });
    res.json({ ok: true, canaux: stockage.canauxVisibles(req.espace.espace.id, req.moi.id) });
  });

  H['canaux.supprimer'] = garder((req, res) => {
    if (corps(req).confirmation !== CONFIRMATION) return refus(res, 400, 'confirmation_requise');
    const k = canalDeAdmin(req, res); if (!k) return;
    const membres = stockage.membresActifs(k.cid);
    const r = stockage.convSupprimer(k.cid);
    effacer(r.pieces);
    hub.reveiller({ uids: membres });
    prevenir(membres, req.espace.espace.id);
    res.json({ ok: true, canaux: stockage.canauxVisibles(req.espace.espace.id, req.moi.id) });
  });

  H['canaux.membres.ajouter'] = garder((req, res) => {
    const k = canalDeAdmin(req, res); if (!k) return;
    const u = corps(req).uids;
    if (!Array.isArray(u) || u.length < 1 || u.length > 50 || !u.every(x => typeof x === 'string' && ID_PERS.test(x))) return refus(res, 400, 'champ_invalide');
    const r = stockage.canalMembresAjouter({ conv: k.cid, par: req.moi.id, uids: Array.from(new Set(u)) });
    if (r.gid) hub.reveiller({ conv: k.cid });
    res.json({ ajoutes: r.ajoutes });
  });

  H['canaux.membres.retirer'] = garder((req, res) => {
    const k = canalDeAdmin(req, res); if (!k) return;
    const u = cibleMembre(req, res); if (!u) return;
    if (u === req.moi.id) return refus(res, 400, 'champ_invalide');            // on quitte un canal privé par « quitter », comme un groupe
    stockage.canalMembreRetirer({ conv: k.cid, par: req.moi.id, uid: u });
    hub.reveiller({ conv: k.cid, uids: [u] });
    res.json({ ok: true });
  });
}

module.exports = { installerEspaces, ID_ESPACE };
