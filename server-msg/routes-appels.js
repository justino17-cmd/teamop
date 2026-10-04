/* ══ LES ROUTES DES APPELS À DEUX — LE RELAIS, LANCER, RÉPONDRE, RACCROCHER, SIGNALER, L'HISTORIQUE ═════════════════════════════════════════════════
 *
 *   GET  /api/ice                          S   les identifiants ÉPHÉMÈRES du relais (une heure) et ses adresses — ou `relais:false` et rien, tant que le relais n'est pas installé
 *   POST /api/appels  {conv|uid, type}     V   lancer un appel AUDIO ou VIDÉO à UNE personne (une conversation directe, ou une personne qu'on peut joindre) — à deux seulement
 *   GET  /api/appels?filtre=tous|manques   S   mon historique (les appels finis, du plus récent, bornés) et `actif` : l'appel qui sonne ou court pour moi, s'il y en a un
 *   POST /api/appels/:id/repondre {accepte}   AP   répondre (cet appareil est LIÉ à l'appel) ou refuser
 *   POST /api/appels/:id/quitter           AP   raccrocher, annuler (avant la réponse) ou refuser — l'appareil lié seulement quand l'appel court
 *   POST /api/appels/:id/signal {a,type,donnees}   AP   un message de mise en relation (offre, réponse, candidats, état de la caméra, pouls) pour l'AUTRE participant — 16 Ko, débit plafonné
 *
 * Une fonction par ligne du manifeste (`manifeste.js`), branchée par `routes.js`. L'orchestration (relais, signaux, balayeur, pushs) est dans `appels.js`, le SQL dans `stockage.js`.
 * Les appels à deux sont GRATUITS en Perso (SERVEUR.md § 5, question 3) : aucune de ces routes ne porte `pro: true`, `formuleDe` n'intervient pas ici. L'appel de groupe (étape 8) est Pro ; en demander
 * un ici est refusé proprement (`appel_a_deux`).
 *
 * ⛔ LES PERSONNES VIENNENT DE LA SESSION ET DE LA BASE, jamais du corps : l'appelant est la personne connectée, l'appel se lit dans l'adresse (`:id`), l'AUTRE participant est celui de l'appel.
 * ⛔ « QUI PEUT SE JOINDRE » EST LA RÈGLE DE LA MESSAGERIE, À LA LETTRE : `peutEcrire` (un contact mutuel, ou un collègue d'un même espace) et jamais un blocage, dans un sens ou dans l'autre. Quelqu'un qu'on ne peut pas
 * appeler reçoit la MÊME réponse que quelqu'un qu'on ne peut pas écrire (404 `introuvable`) : un appel ne dit pas qu'on a été bloqué. Un non-participant d'un appel reçoit le même 404 qu'un appel qui n'existe pas.
 * ⛔ LES PLAFONDS SONT À LA FOIS PAR PERSONNE (30 appels lancés par heure, un tiers pour un compte de moins de 24 h) ET PAR PAIRE (6 vers la même personne) : faire sonner trente fois quelqu'un est du
 * harcèlement. Réglables mais bornés (`config.appels`, qui refuse un nombre absurde au démarrage).
 */
'use strict';
const { ID_PERS, ID_CONV } = require('./routes');
const { TYPES_SIGNAL, SIGNAL_OCTETS_MAX } = require('./appels');

const JOUR = 86400000;

function installerAppels(H, ctx) {
  const { config, stockage, quotas, horloge, appels } = ctx;
  const cfg = config.appels;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  /* Les codes de refus du stockage et du chef d'orchestre, traduits : tous des chaînes courtes que la page sait dire (`public/api.js`, `MESSAGES`). Un code inconnu est une vraie panne : il part à `next`. */
  const CODES = { introuvable: [404, 'introuvable'], interdit: [403, 'interdit'], appel_pris: [409, 'appel_pris'], appel_fini: [409, 'appel_fini'], appareil_non_lie: [403, 'appareil_non_lie'], appel_pas_en_cours: [409, 'appel_pas_en_cours'] };
  const garder = (f) => (req, res, next) => {
    const traduire = (e) => { const c = e && CODES[e.code]; if (c) return refus(res, c[0], c[1]); return next(e); };
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(traduire); }
    catch (e) { traduire(e); }
  };
  /* un plafond : `true` si on peut continuer ; sinon la réponse 429 + `Retry-After` est déjà partie */
  function plafond(res, cle, max, fenetreMs) {
    const r = quotas.essai(cle, Math.max(1, Math.floor(max)), fenetreMs);
    if (r.ok) return true;
    res.set('Retry-After', String(r.retry));
    refus(res, 429, 'quota_atteint', { retry: r.retry });
    return false;
  }
  const jeune = (moi) => (moi.origine !== 'beta' && horloge() - moi.cree < JOUR) ? 1 / 3 : 1;   // un compte de moins de 24 h a des limites plus basses (SERVEUR.md § 3.6)

  /* ── le relais ── */
  H['ice'] = (req, res) => {
    if (!plafond(res, 'ice:' + req.moi.id, cfg.iceParHeure, 3600000)) return;
    res.set('Cache-Control', 'no-store');
    res.json(appels.ice(req.moi.id));
  };

  /* ── l'historique, et l'appel qui sonne ou court ── */
  H['appels.liste'] = (req, res) => {
    const f = req.query.filtre === undefined ? 'tous' : req.query.filtre;
    if (f !== 'tous' && f !== 'manques') return refus(res, 400, 'champ_invalide');
    res.json({ appels: stockage.appelsListe(req.moi.id, { manques: f === 'manques', limite: cfg.listeMax }), actif: stockage.appelActifVue(req.moi.id) });
  };

  /* ── lancer ── */
  H['appels.creer'] = garder((req, res) => {
    const b = corps(req), moi = req.moi;
    if (b.type !== 'audio' && b.type !== 'video') return refus(res, 400, 'champ_invalide');
    const aConv = b.conv !== undefined && b.conv !== null, aUid = b.uid !== undefined && b.uid !== null;
    if (aConv === aUid) return refus(res, 400, 'champ_invalide');                      // l'un ou l'autre, jamais les deux ni aucun
    let appele = null;
    if (aConv) {
      if (typeof b.conv !== 'string' || !ID_CONV.test(b.conv)) return refus(res, 400, 'champ_invalide');
      const c = stockage.convPourMembre(b.conv, moi.id);
      if (!c) return refus(res, 404, 'introuvable');
      if (c.conv.type !== 'direct') return refus(res, 409, 'appel_a_deux');             // un groupe, un canal, une réunion : l'appel de groupe est l'étape 8
      if (stockage.autreSupprime(b.conv, moi.id)) return refus(res, 410, 'compte_supprime');
      appele = stockage.autreDirect(b.conv, moi.id);
      if (!appele) return refus(res, 404, 'introuvable');
    } else {
      if (typeof b.uid !== 'string' || !ID_PERS.test(b.uid) || b.uid === moi.id) return refus(res, 400, 'champ_invalide');
      appele = b.uid;
    }
    /* ⛔ la règle de la messagerie, et SA réponse : pas de contact, un blocage dans un sens ou dans l'autre, une personne qui n'existe pas — 404, le même */
    if (!stockage.peutEcrire(moi.id, appele)) return refus(res, 404, 'introuvable');
    if (!plafond(res, 'appel:' + moi.id, cfg.parHeure * jeune(moi), 3600000)) return;
    if (!plafond(res, 'appel_paire:' + moi.id + ':' + appele, cfg.parPaireHeure, 3600000)) return;
    let r;
    try { r = appels.creer({ moi, appele, type: b.type, sessionH: req.sessionH }); }
    catch (e) { if (e && e.code === 'occupe_moi') return refus(res, 409, 'occupe', { moi: true }); throw e; }
    /* l'appelé est dans un appel : la ligne est écrite (il la lira « Manqué »), l'appelant lit « occupé » */
    if (r.occupe) return refus(res, 409, 'occupe', { moi: false });
    res.status(201).json({ appel: r.vue });
  });

  /* ── répondre, raccrocher ── */
  H['appels.repondre'] = garder((req, res) => {
    const b = corps(req);
    if (typeof b.accepte !== 'boolean') return refus(res, 400, 'champ_invalide');
    const r = appels.repondre({ moi: req.moi, id: req.appel.id, sessionH: req.sessionH, accepte: b.accepte });
    res.json({ appel: r.vue, etat: r.etat, deja: !!r.deja });
  });
  H['appels.quitter'] = garder((req, res) => {
    const r = appels.quitter({ moi: req.moi, id: req.appel.id, sessionH: req.sessionH });
    res.json({ ok: true, appel: r.vue, deja: !!r.deja });
  });

  /* ── le signal ── */
  H['appels.signal'] = garder((req, res) => {
    const b = corps(req), moi = req.moi, acces = req.appel;
    if (typeof b.type !== 'string' || !TYPES_SIGNAL.includes(b.type)) return refus(res, 400, 'champ_invalide');
    /* ⛔ le destinataire est l'AUTRE participant de CET appel, rien d'autre : un identifiant quelconque, ou le sien, est refusé (on ne fait pas relayer une enveloppe vers quelqu'un qui n'y est pas) */
    if (typeof b.a !== 'string' || !ID_PERS.test(b.a) || b.a !== acces.autre) return refus(res, 400, 'champ_invalide');
    let d;
    if (b.type !== 'pouls') {
      if (b.donnees === null || typeof b.donnees !== 'object') return refus(res, 400, 'champ_invalide');
      d = b.donnees;
      if (Buffer.byteLength(JSON.stringify(d), 'utf8') > SIGNAL_OCTETS_MAX) return refus(res, 413, 'signal_trop_gros');
    }
    if (!plafond(res, 'signal:' + acces.id + ':' + moi.id, cfg.signalMax, cfg.signalFenetreMs)) return;
    appels.signal({ moi, acces, sessionH: req.sessionH, type: b.type, donnees: d });
    res.json({ ok: true });
  });
}

module.exports = { installerAppels };
