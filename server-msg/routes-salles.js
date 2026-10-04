/* ══ LES ROUTES DES SALLES — LES GESTES DE L'HÔTE ET DES CO-HÔTES, CEUX DES PARTICIPANTS ══════════════════════════════════════════════════════════════════
 *
 * Une SALLE est un appel à plusieurs (genre « groupe » : lancé depuis un groupe ou des personnes choisies) ou la salle d'une réunion programmée (genre « reunion »). On y entre par `POST /api/appels/:id/rejoindre`
 * (ou `POST /api/reunions/:id/rejoindre`), on en sort par `POST /api/appels/:id/quitter` ; ici, ce qu'on y fait. L'identifiant de la salle (`:id`) est celui de l'appel.
 *
 *   GET  /api/salles/:id                       SP   ce que la salle est pour moi (la vue de l'appel) ET ce qui s'y est dit d'éphémère avant (mains levées, états, sondage, minuteur, épingle)
 *   POST /api/salles/:id/admettre {uid|tous}   SH   faire entrer celui qui attend (ou tous, dans la limite de la capacité)
 *   POST /api/salles/:id/refuser {uid}         SH   ne pas le laisser entrer (il peut redemander)
 *   POST /api/salles/:id/exclure {uid}         SH   le retirer pour de bon : le service ne relaie plus rien de lui, et il ne revient pas
 *   POST /api/salles/:id/verrouiller {actif}   SH   plus personne n'entre (l'hôte et les co-hôtes, eux, rentrent)
 *   POST /api/salles/:id/salle_attente {actif} SH   les nouveaux arrivants attendent d'être admis
 *   POST /api/salles/:id/couper_micro {uid|tous} SH   une DEMANDE adressée à la page de la personne (ou de tous) : le navigateur l'honore ou non, le service ne peut pas couper un micro
 *   POST /api/salles/:id/partage {actif}       SH   les participants peuvent partager leur écran (réglage que les pages honorent ; le service refuse d'annoncer un partage non permis)
 *   POST /api/salles/:id/rec {actif}           SH   le bandeau « REC » chez tous : l'hôte enregistre EN LOCAL (rien n'est envoyé au service) ; seul l'hôte le commence
 *   POST /api/salles/:id/cohote {uid, actif}   SO   promouvoir ou retirer un co-hôte (l'hôte seul)
 *   POST /api/salles/:id/terminer              SO   finir la salle pour tout le monde (l'hôte seul)
 *   POST /api/salles/:id/main {actif}          SP   lever / baisser la main
 *   POST /api/salles/:id/reaction {emoji}      SP   pouce, coeur, bravo, rire
 *   POST /api/salles/:id/etat {camera,micro,partage}  SP   l'état de MON appareil (l'image de ma tuile chez les autres)
 *   POST /api/salles/:id/evt {k, donnees}      SP   sondage, minuteur, épingle (2 Ko au plus) : voter est à tous, ouvrir / fermer / démarrer / épingler à l'hôte et aux co-hôtes
 *
 * Les gardes (`app.js`) : SP participant d'une SALLE (un exclu, un non-participant, un appel à deux : le MÊME 404 qu'une salle qui n'existe pas), SH hôte ou co-hôte PRÉSENT (un participant voit 403), SO hôte seul.
 * ⛔ CE QUE LE SERVICE IMPOSE ET CE QU'IL NE FAIT QUE DEMANDER : il impose l'admission, le verrou, la capacité, l'exclusion (il cesse de relayer le signal d'un exclu, qui ne revient pas), la hiérarchie (un co-hôte
 * n'exclut ni l'hôte ni un autre co-hôte). Il ne peut pas couper un micro à distance ni fermer une liaison déjà ouverte : les pages des autres la ferment en lisant la nouvelle liste ; un navigateur modifié le saurait.
 */
'use strict';
const { ID_PERS } = require('./routes');
const { EVT_OCTETS_MAX, tailleEvt, REACTIONS } = require('./appels');

function installerSalles(H, ctx) {
  const { config, stockage, quotas, appels } = ctx;
  const cfg = config.appels;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  /* Les codes de refus du stockage et du chef d'orchestre, traduits : tous des chaînes courtes que la page sait dire (`public/api.js`, `MESSAGES`). Un code inconnu est une vraie panne : il part à `next`. */
  const CODES = { introuvable: [404, 'introuvable'], interdit: [403, 'interdit'], appel_fini: [409, 'appel_fini'], appel_pas_en_cours: [409, 'appel_pas_en_cours'], appel_complet: [409, 'appel_complet'], champ_invalide: [400, 'champ_invalide'] };
  const garder = (f) => (req, res, next) => {
    const traduire = (e) => { const c = e && CODES[e.code]; if (c) return refus(res, c[0], c[1], c[2]); return next(e); };
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(traduire); }
    catch (e) { traduire(e); }
  };
  function plafond(res, cle, max, fenetreMs) {
    const r = quotas.essai(cle, Math.max(1, Math.floor(max)), fenetreMs);
    if (r.ok) return true;
    res.set('Retry-After', String(r.retry));
    refus(res, 429, 'quota_atteint', { retry: r.retry });
    return false;
  }
  const uidDe = (b) => (typeof b.uid === 'string' && ID_PERS.test(b.uid)) ? b.uid : null;
  const booleen = (b) => typeof b.actif === 'boolean' ? b.actif : null;
  /* un geste d'hôte : soixante par minute et par personne et par salle (ouvrir et fermer cent portes n'est pas de l'hôtellerie) ; un geste de participant : `salleEvtMax` par minute */
  const gesteHote = (req, res) => plafond(res, 'salle_admin:' + req.appel.id + ':' + req.moi.id, 60, 60000);
  const gesteSimple = (req, res) => plafond(res, 'salle_evt:' + req.appel.id + ':' + req.moi.id, cfg.salleEvtMax, 60000);
  const vue = (req) => stockage.appelVue(req.moi.id, req.appel.id);

  H['salles.lire'] = (req, res) => res.json({ appel: vue(req), salle: appels.etatSalle(req.appel.id, req.moi.id) });

  /* ── l'hôte et ses co-hôtes ── */
  H['salles.admettre'] = garder((req, res) => {
    const b = corps(req), tous = b.tous === true, uid = uidDe(b);
    if (!tous && !uid) return refus(res, 400, 'champ_invalide');
    if (!gesteHote(req, res)) return;
    const r = appels.admettre({ moi: req.moi, id: req.appel.id, uid, tous });
    res.json({ ok: true, admis: r.admis.length, restent: r.restent.length, appel: vue(req) });
  });
  H['salles.refuser'] = garder((req, res) => {
    const uid = uidDe(corps(req)); if (!uid) return refus(res, 400, 'champ_invalide');
    if (!gesteHote(req, res)) return;
    appels.refuser({ moi: req.moi, id: req.appel.id, uid });
    res.json({ ok: true, appel: vue(req) });
  });
  H['salles.exclure'] = garder((req, res) => {
    const uid = uidDe(corps(req)); if (!uid) return refus(res, 400, 'champ_invalide');
    if (!gesteHote(req, res)) return;
    const r = appels.exclure({ moi: req.moi, id: req.appel.id, uid });
    res.json({ ok: true, deja: !!r.deja, appel: vue(req) });
  });
  H['salles.verrouiller'] = garder((req, res) => {
    const actif = booleen(corps(req)); if (actif === null) return refus(res, 400, 'champ_invalide');
    if (!gesteHote(req, res)) return;
    appels.verrouiller({ moi: req.moi, id: req.appel.id, actif });
    res.json({ ok: true, appel: vue(req) });
  });
  H['salles.salle_attente'] = garder((req, res) => {
    const actif = booleen(corps(req)); if (actif === null) return refus(res, 400, 'champ_invalide');
    if (!gesteHote(req, res)) return;
    appels.salleAttente({ moi: req.moi, id: req.appel.id, actif });
    res.json({ ok: true, appel: vue(req) });
  });
  H['salles.partage'] = garder((req, res) => {
    const actif = booleen(corps(req)); if (actif === null) return refus(res, 400, 'champ_invalide');
    if (!gesteHote(req, res)) return;
    appels.partage({ moi: req.moi, id: req.appel.id, actif });
    res.json({ ok: true, appel: vue(req) });
  });
  H['salles.rec'] = garder((req, res) => {
    const actif = booleen(corps(req)); if (actif === null) return refus(res, 400, 'champ_invalide');
    if (!gesteHote(req, res)) return;
    appels.rec({ moi: req.moi, id: req.appel.id, actif });
    res.json({ ok: true, appel: vue(req) });
  });
  H['salles.couper_micro'] = garder((req, res) => {
    const b = corps(req), tous = b.tous === true, uid = uidDe(b);
    if (!tous && !uid) return refus(res, 400, 'champ_invalide');
    if (!gesteHote(req, res)) return;
    const r = appels.demanderCouperMicro({ moi: req.moi, acces: req.appel, cible: tous ? null : uid });
    res.json({ ok: true, demande: true, atteints: r.atteints });          // « demande » : le service a transmis une demande, il ne sait pas si la page l'a honorée
  });
  H['salles.cohote'] = garder((req, res) => {
    const b = corps(req), uid = uidDe(b), actif = booleen(b);
    if (!uid || actif === null) return refus(res, 400, 'champ_invalide');
    if (!gesteHote(req, res)) return;
    appels.cohote({ moi: req.moi, id: req.appel.id, uid, actif });
    res.json({ ok: true, appel: vue(req) });
  });
  H['salles.terminer'] = garder((req, res) => {
    if (!gesteHote(req, res)) return;
    const r = appels.terminer({ moi: req.moi, id: req.appel.id });
    res.json({ ok: true, deja: !!r.deja });
  });

  /* ── les participants ── */
  H['salles.main'] = garder((req, res) => {
    const actif = booleen(corps(req)); if (actif === null) return refus(res, 400, 'champ_invalide');
    if (!gesteSimple(req, res)) return;
    appels.main({ moi: req.moi, acces: req.appel, actif });
    res.json({ ok: true });
  });
  H['salles.reaction'] = garder((req, res) => {
    const emoji = corps(req).emoji;
    if (typeof emoji !== 'string' || !REACTIONS.includes(emoji)) return refus(res, 400, 'champ_invalide');
    if (!gesteSimple(req, res)) return;
    appels.reaction({ moi: req.moi, acces: req.appel, emoji });
    res.json({ ok: true });
  });
  H['salles.etat'] = garder((req, res) => {
    const b = corps(req), champs = ['camera', 'micro', 'partage'].filter(k => b[k] !== undefined);
    if (!champs.length || champs.some(k => typeof b[k] !== 'boolean')) return refus(res, 400, 'champ_invalide');
    /* ⛔ le service ne voit pas un média, mais il refuse d'ANNONCER un partage d'écran que l'hôte n'a pas permis : les autres pages ne mettent pas en avant ce que la salle ne reconnaît pas */
    if (b.partage === true && !req.appel.partage_ok && req.appel.grade < 1) return refus(res, 403, 'partage_interdit');
    if (!gesteSimple(req, res)) return;
    appels.etatMien({ moi: req.moi, acces: req.appel, camera: b.camera, micro: b.micro, partage: b.partage });
    res.json({ ok: true });
  });
  H['salles.evt'] = garder((req, res) => {
    const b = corps(req);
    if (typeof b.k !== 'string' || !['sondage', 'minuteur', 'epingle'].includes(b.k)) return refus(res, 400, 'champ_invalide');
    if (b.donnees === undefined || b.donnees === null || typeof b.donnees !== 'object' || Array.isArray(b.donnees)) return refus(res, 400, 'champ_invalide');
    if (tailleEvt(b.donnees) > EVT_OCTETS_MAX) return refus(res, 413, 'evt_trop_gros');
    if (!gesteSimple(req, res)) return;
    appels.evt({ moi: req.moi, acces: req.appel, k: b.k, donnees: b.donnees });
    res.json({ ok: true });
  });
}

module.exports = { installerSalles };
