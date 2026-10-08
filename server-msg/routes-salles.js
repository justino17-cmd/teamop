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
 *   GET  /api/salles/:id/presence               SH   le rapport de présence de la salle : qui est entré (première entrée, dernière sortie, temps passé), qui n'est jamais entré — l'hôte et les co-hôtes
 *   POST /api/salles/:id/annot {op, …}         SP   dessiner et écrire sur l'écran partagé ou le tableau blanc (trait, texte, retirer, annuler, effacer, tableau, permis) — 900 gestes par minute
 *
 * Les gardes (`app.js`) : SP participant d'une SALLE (un exclu, un non-participant, un appel à deux : le MÊME 404 qu'une salle qui n'existe pas), SH hôte ou co-hôte PRÉSENT (un participant voit 403), SO hôte seul.
 * ⛔ LES OUTILS DE L'ORGANISATEUR SE PAIENT, LA SALLE NON (Justin, 4 octobre 2026 : « comme WhatsApp » pour le public ; les réunions à ceux qui organisent). Dans la salle d'une RÉUNION, ou dans un appel de groupe lancé par quelqu'un
 * qui est Pro ou Perso+, l'hôte et les co-hôtes ont tous leurs outils. Dans un appel de groupe lancé par quelqu'un qui n'a ni l'un ni l'autre (`appels.outilsOuverts`), CINQ choses refusent — 402 `formule_requise`,
 * `raison: "organisateur"`, `offre: "perso_plus"` — : la salle d'attente et le verrou (les ALLUMER), retirer quelqu'un, demander de couper les micros, le sondage et le minuteur (les OUVRIR, les DÉMARRER), le bandeau
 * d'enregistrement (l'ALLUMER). Le micro, la caméra, les réactions, la main levée, l'épingle et le partage d'écran restent à tous. ÉTEINDRE un outil (déverrouiller, couper la salle d'attente, arrêter l'enregistrement, fermer un
 * sondage, arrêter un minuteur) n'est JAMAIS refusé : une salle ne reste pas verrouillée, ni « REC », parce que le forfait de celui qui l'a lancé a lâché pendant l'appel.
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
  const CODES = { introuvable: [404, 'introuvable'], interdit: [403, 'interdit'], annot_pleine: [409, 'annot_pleine'], rien_a_annoter: [409, 'rien_a_annoter'], annot_occupe: [409, 'annot_occupe'], appel_fini: [409, 'appel_fini'], appel_pas_en_cours: [409, 'appel_pas_en_cours'], appel_complet: [409, 'appel_complet'], champ_invalide: [400, 'champ_invalide'],
    pas_de_visio: [409, 'pas_de_visio'], visio_indisponible: [503, 'visio_indisponible'], appareil_non_lie: [403, 'appareil_non_lie'] };
  const garder = (f) => (req, res, next) => {
    const traduire = (e) => { const c = e && CODES[e.code]; if (c) return refus(res, c[0], c[1], e.code === 'appel_complet' && Number.isInteger(e.max) ? Object.assign({ max: e.max }, c[2] || {}) : c[2]); return next(e); };
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(traduire); }
    catch (e) { traduire(e); }
  };
  function plafond(res, cle, max, fenetreMs, poids) {
    const r = quotas.essai(cle, Math.max(1, Math.floor(max)), fenetreMs, poids);
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
  /* ⛔ UN OUTIL D'ORGANISATEUR EN SALLE GRATUITE : `true` (et la réponse 402 est déjà partie) si la salle n'a pas ses outils. Jugé APRÈS la garde (un non-participant a son 404, un participant sans pouvoir son 403) et APRÈS la forme
     du corps (un 400 reste un 400), AVANT le plafond et le geste. La règle est celle d'`appels.outilsOuverts` — la même qui décide ce que la page propose : l'écran et le refus ne peuvent pas se contredire. */
  function outilRefuse(req, res) {
    if (appels.outilsOuverts(req.appel.id)) return false;
    refus(res, 402, 'formule_requise', { raison: 'organisateur', offre: 'perso_plus', abonnement_ouvert: !!(ctx.facturation && ctx.facturation.perso.ouvert()) });
    return true;
  }

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
    if (outilRefuse(req, res)) return;
    if (!gesteHote(req, res)) return;
    const r = appels.exclure({ moi: req.moi, id: req.appel.id, uid });
    res.json({ ok: true, deja: !!r.deja, appel: vue(req) });
  });
  H['salles.verrouiller'] = garder((req, res) => {
    const actif = booleen(corps(req)); if (actif === null) return refus(res, 400, 'champ_invalide');
    if (actif && outilRefuse(req, res)) return;                      // verrouiller se paie ; déverrouiller, jamais
    if (!gesteHote(req, res)) return;
    appels.verrouiller({ moi: req.moi, id: req.appel.id, actif });
    res.json({ ok: true, appel: vue(req) });
  });
  H['salles.salle_attente'] = garder((req, res) => {
    const actif = booleen(corps(req)); if (actif === null) return refus(res, 400, 'champ_invalide');
    if (actif && outilRefuse(req, res)) return;                      // allumer la salle d'attente se paie ; l'éteindre, jamais
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
    if (actif && outilRefuse(req, res)) return;                      // allumer le bandeau d'enregistrement se paie ; l'éteindre, jamais
    if (!gesteHote(req, res)) return;
    appels.rec({ moi: req.moi, id: req.appel.id, actif });
    res.json({ ok: true, appel: vue(req) });
  });
  H['salles.couper_micro'] = garder((req, res) => {
    const b = corps(req), tous = b.tous === true, uid = uidDe(b);
    if (!tous && !uid) return refus(res, 400, 'champ_invalide');
    if (outilRefuse(req, res)) return;
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
    /* la séance d'une RÉUNION terminée pour tous : son compte rendu part dans la conversation de la réunion (`routes-reunions.js`) */
    if (!r.deja && req.appel.genre === 'reunion' && req.appel.reunion && typeof ctx.compteRenduSeance === 'function') ctx.compteRenduSeance({ salle: req.appel.id, reunion: req.appel.reunion, par: req.moi });
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
  /* les annotations : un trait en cours part en morceaux (dix par seconde) — un plafond à part, assez large pour dessiner, assez court pour qu'une boucle ne submerge pas la salle */
  /* le rapport de présence : l'hôte et les co-hôtes PRÉSENTS (la garde SH) — « savoir qui était là, et combien de temps », comme les rapports de présence de Teams */
  H['salles.presence'] = garder((req, res) => {
    if (!plafond(res, 'salle_presence:' + req.moi.id, 120, 60000)) return;
    const r = stockage.presenceSalle(req.appel.id, ctx.horloge());
    if (!r) return refus(res, 404, 'introuvable');
    res.json(r);
  });
  H['salles.annot'] = garder((req, res) => {
    const b = corps(req);
    if (typeof b.op !== 'string') return refus(res, 400, 'champ_invalide');
    /* ⛔ un plafond PAR COMPTE, toutes salles confondues (ouvrir dix salles ne le multiplie pas), en gestes ET en points : ce qui coûte, c'est ce que la salle diffuse à chacun de ses présents, et un trait de
       600 points en pèse 600. Cette route est HORS du plafond commun des écritures (300 par minute, `app.js`) : un trait en cours part en morceaux, et ce plafond-là coupait le dessin au bout d'une
       demi-minute (relecture gardien, mesuré avec les plafonds de production). */
    if (!plafond(res, 'salle_annot:' + req.moi.id, 900, 60000)) return;
    const n = Array.isArray(b.pts) ? b.pts.length : 0;
    if (n && !plafond(res, 'salle_annot_pts:' + req.moi.id, 40000, 60000, Math.min(n, 40000))) return;
    res.json({ ok: true, ev: appels.annoter({ moi: req.moi, acces: req.appel, d: b }) });
  });
  H['salles.evt'] = garder((req, res) => {
    const b = corps(req);
    if (typeof b.k !== 'string' || !['sondage', 'minuteur', 'epingle'].includes(b.k)) return refus(res, 400, 'champ_invalide');
    if (b.donnees === undefined || b.donnees === null || typeof b.donnees !== 'object' || Array.isArray(b.donnees)) return refus(res, 400, 'champ_invalide');
    if (tailleEvt(b.donnees) > EVT_OCTETS_MAX) return refus(res, 413, 'evt_trop_gros');
    /* ouvrir un sondage et démarrer un minuteur sont des outils d'organisateur ; voter, fermer, arrêter, épingler ne le sont pas. Un participant sans pouvoir garde son 403 (jugé plus loin, par le service) : le forfait
       ne se lit que pour un hôte ou un co-hôte. */
    const op = b.donnees.op;
    if (req.appel.grade >= 1 && ((b.k === 'sondage' && op === 'ouvrir') || (b.k === 'minuteur' && op === 'demarrer')) && outilRefuse(req, res)) return;
    if (!gesteSimple(req, res)) return;
    const ev = appels.evt({ moi: req.moi, acces: req.appel, k: b.k, donnees: b.donnees });
    /* ⛔ L'ÉVÉNEMENT REVIENT À CELUI QUI L'A POSÉ : le service le pousse aux AUTRES (au sondage près, qui va à tous), et la page de l'hôte qui épingle ou lance un minuteur ne voyait pas son propre geste — pas d'« Arrêter »
       sur son minuteur, une épingle qu'elle croyait encore à poser (mesuré au navigateur, quatre pages). C'est ce que tout le monde reçoit, sans rien de plus. */
    res.json({ ok: true, ev });
  });

  /* ⛔ LE JETON DU SERVEUR DE VISIO (`visio.js`) : à qui est PRÉSENT dans une salle qui passe par la visio, depuis l'appareil LIÉ à l'appel — jamais à la porte (salle d'attente), jamais à un autre appareil du
     même compte, jamais pour une salle en maille. Il vaut pour CETTE salle et CETTE personne, deux minutes ; la page en redemande un s'il faut se reconnecter. Trente par dix minutes et par personne : une page
     qui boucle sur la reconnexion ne fabrique pas des jetons à l'infini. */
  H['salles.visio'] = garder((req, res) => {
    if (!plafond(res, 'salle_visio:' + req.moi.id, 30, 600000)) return;
    res.json(appels.jetonVisio({ moi: req.moi, acces: req.appel, sessionH: req.sessionH }));
  });

  /* ⛔ LES AVIS DE LIVEKIT (webhook) : seulement depuis la machine elle-même (la garde LV : la boucle locale, sans passer par nginx), et seulement signés de notre secret, sur l'empreinte du corps EXACT
     (`visio.avisLire`). Un avis valable d'une ENTRÉE est jugé à la porte du service (`visio.avisRecu` → `appels.admiseVisio`) : qui n'est pas présent dans la salle en ressort aussitôt. Le corps se lit
     ici, brut (64 Ko au plus) : l'empreinte porte sur les octets, pas sur un JSON relu. */
  H['visio.avis'] = (req, res) => {
    const v = ctx.visio;
    if (!v || !v.configure) return refus(res, 404, 'introuvable');
    const morceaux = []; let n = 0, coupe = false;
    req.on('data', (c) => { if (coupe) return; n += c.length; if (n > 65536) { coupe = true; refus(res, 413, 'trop_gros'); req.destroy(); return; } morceaux.push(c); });
    req.on('end', () => {
      if (coupe) return;
      const evt = v.avisLire(req.headers.authorization, Buffer.concat(morceaux));
      if (!evt) return refus(res, 401, 'non_signe');
      v.avisRecu(evt).then(() => res.json({ ok: true }), () => res.json({ ok: true }));
    });
    req.on('error', () => { if (!res.headersSent) refus(res, 400, 'champ_invalide'); });
  };
}

module.exports = { installerSalles };
