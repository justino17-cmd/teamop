/* ══ LES ROUTES DES APPELS À DEUX — LE RELAIS, LANCER, RÉPONDRE, RACCROCHER, SIGNALER, L'HISTORIQUE ═════════════════════════════════════════════════
 *
 *   GET  /api/ice                          S   les identifiants ÉPHÉMÈRES du relais (quinze minutes) et ses adresses, à qui est dans un appel qui sonne ou qui court (404 sinon) — `relais:false` tant que le relais n'est pas installé
 *   POST /api/appels  {conv|uid|uids, type}  V   lancer un appel AUDIO ou VIDÉO : à UNE personne (une conversation directe, ou une personne qu'on peut joindre) — gratuit — ou à PLUSIEURS (un groupe, ou des personnes choisies) — fonction Pro
 *   GET  /api/appels?filtre=tous|manques   S   mon historique (les appels finis, du plus récent, bornés) et `actif` : l'appel qui sonne ou court pour moi, s'il y en a un
 *   POST /api/appels/:id/repondre {accepte}   AP   répondre (cet appareil est LIÉ à l'appel) ou refuser
 *   POST /api/appels/:id/rejoindre         SJ   entrer dans une salle (un appel de groupe de mes conversations, la salle d'une réunion où je suis invité) : toujours gratuit
 *   POST /api/appels/:id/quitter           AP   raccrocher, annuler (avant la réponse) ou refuser — l'appareil lié seulement quand l'appel court ; dans une salle, on en SORT (elle continue pour les autres)
 *   POST /api/appels/:id/signal {a,type,donnees}   AP   un message de mise en relation (offre, réponse, candidats, pouls) pour l'AUTRE participant — pour une salle, pour un participant PRÉSENT (`a`) — 16 Ko, débit plafonné
 *
 * Une fonction par ligne du manifeste (`manifeste.js`), branchée par `routes.js`. L'orchestration (relais, signaux, balayeur, pushs) est dans `appels.js`, le SQL dans `stockage.js`.
 * Les appels à deux sont GRATUITS en Perso (SERVEUR.md § 5, question 3) : aucune de ces routes ne porte `pro: true`, `formuleDe` n'intervient que pour LANCER un appel à plusieurs (402 `formule_requise` : c'est
 * l'hôte qui paie) — être appelé, répondre et rejoindre restent gratuits. Les gestes de l'hôte et des participants d'une salle sont dans `routes-salles.js`.
 *
 * ⛔ LES PERSONNES VIENNENT DE LA SESSION ET DE LA BASE, jamais du corps : l'appelant est la personne connectée, l'appel se lit dans l'adresse (`:id`), l'AUTRE participant est celui de l'appel.
 * ⛔ « QUI PEUT SE JOINDRE » EST LA RÈGLE DE LA MESSAGERIE, À LA LETTRE : `peutEcrire` (un contact mutuel, ou un collègue d'un même espace) et jamais un blocage, dans un sens ou dans l'autre. Quelqu'un qu'on ne peut pas
 * appeler reçoit la MÊME réponse que quelqu'un qu'on ne peut pas écrire (404 `introuvable`) : un appel ne dit pas qu'on a été bloqué. Un non-participant d'un appel reçoit le même 404 qu'un appel qui n'existe pas.
 * ⛔ LES PLAFONDS SONT PAR PERSONNE (30 appels lancés par heure, un tiers pour un compte de moins de 24 h), PAR PAIRE (6 vers la même personne) ET PAR PERSONNE APPELÉE (30 appels reçus par heure, tous appelants
 * confondus) : faire sonner trente fois quelqu'un est du harcèlement, à un compte comme à plusieurs. Réglables mais bornés (`config.appels`, qui refuse un nombre absurde au démarrage).
 */
'use strict';
const { ID_PERS, ID_CONV } = require('./routes');
const { TYPES_SIGNAL, SIGNAL_OCTETS_MAX } = require('./appels');

const JOUR = 86400000;

/* ⛔ LA TAILLE D'UN SIGNAL SE MESURE SANS JAMAIS LEVER. `JSON.stringify` d'un objet imbriqué sur quelques milliers de niveaux lève « Maximum call stack size exceeded » : mesuré par la relecture, 5 000 niveaux
   (30 Ko de corps, loin sous la limite) donnaient un 500 `erreur_interne` au lieu du refus. Une enveloppe d'appel est PLATE (une offre : { type, sdp } ; des candidats : une liste d'objets à trois champs ; l'état
   de la caméra : un booléen) : au-delà de `PROFONDEUR_SIGNAL_MAX` niveaux, ou de `NOEUDS_SIGNAL_MAX` valeurs, ce n'est pas un signal — et on le dit comme un signal trop gros (413), sans l'avoir sérialisé. Le parcours
   est ITÉRATIF (une pile, jamais de récursion) : le mesurer ne peut pas lui-même déborder. → des octets, ou Infinity. */
const PROFONDEUR_SIGNAL_MAX = 8, NOEUDS_SIGNAL_MAX = 4096;
function tailleSignal(d) {
  const pile = [[d, 1]];
  let noeuds = 0;
  while (pile.length) {
    const [x, niveau] = pile.pop();
    if (x === null || typeof x !== 'object') continue;
    if (niveau > PROFONDEUR_SIGNAL_MAX || ++noeuds > NOEUDS_SIGNAL_MAX) return Infinity;
    for (const k of Object.keys(x)) pile.push([x[k], niveau + 1]);
  }
  try { return Buffer.byteLength(JSON.stringify(d), 'utf8'); } catch (e) { return Infinity; }
}

function installerAppels(H, ctx) {
  const { config, stockage, quotas, horloge, appels } = ctx;
  const cfg = config.appels;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  /* Les codes de refus du stockage et du chef d'orchestre, traduits : tous des chaînes courtes que la page sait dire (`public/api.js`, `MESSAGES`). Un code inconnu est une vraie panne : il part à `next`. */
  const CODES = { introuvable: [404, 'introuvable'], interdit: [403, 'interdit'], appel_pris: [409, 'appel_pris'], appel_fini: [409, 'appel_fini'], appareil_non_lie: [403, 'appareil_non_lie'], appel_pas_en_cours: [409, 'appel_pas_en_cours'],
    /* les salles : ENTRER (verrou, capacité, exclusion, un autre appel) et les gestes de l'hôte */
    occupe_moi: [409, 'occupe', { moi: true }], appel_complet: [409, 'appel_complet'], verrouillee: [423, 'verrouillee'], exclu: [403, 'exclu'], reunion_annulee: [409, 'reunion_annulee'], champ_invalide: [400, 'champ_invalide'], trop_d_invites: [409, 'trop_d_invites'] };
  const garder = (f) => (req, res, next) => {
    const traduire = (e) => { const c = e && CODES[e.code]; if (c) return refus(res, c[0], c[1], c[2]); return next(e); };
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
    /* ⛔ DES IDENTIFIANTS DE RELAIS NE SE DONNENT QU'À QUI EST DANS UN APPEL (relecture, I1) : n'importe quel compte, à n'importe quel moment, en tirait pour une heure — et ouvrait ainsi, sans appeler personne,
       des allocations (autant que le plafond du relais le permet) qui relayent des paquets UDP vers l'Internet depuis NOTRE adresse. Il faut maintenant être PARTICIPANT d'un appel qui sonne ou qui court
       (`appelActifDe`, l'échéance de la sonnerie comprise) — l'appelant dès son lancement, l'appelé dès la sonnerie, jusqu'à la fin. Hors de là, le MÊME 404 qu'un appel qui n'existe pas : rien ne dit
       qu'un relais existe. La page demande ses identifiants APRÈS avoir lancé l'appel ou avant de répondre : elle n'en a jamais besoin à vide. Jugé AVANT le plafond (un refus ne consomme rien). */
    if (!stockage.appelActifDe(req.moi.id)) return refus(res, 404, 'introuvable');
    if (!plafond(res, 'ice:' + req.moi.id, cfg.iceParHeure, 3600000)) return;
    res.set('Cache-Control', 'no-store');
    res.json(appels.ice(req.moi.id));
  };

  /* ── l'historique, et l'appel qui sonne ou court ── */
  H['appels.liste'] = (req, res) => {
    const f = req.query.filtre === undefined ? 'tous' : req.query.filtre;
    if (f !== 'tous' && f !== 'manques') return refus(res, 400, 'champ_invalide');
    res.json({ appels: stockage.appelsListe(req.moi.id, { manques: f === 'manques', limite: cfg.listeMax }), actif: stockage.appelActifVue(req.moi.id), salles: stockage.sallesOuvertes(req.moi.id) });
  };

  /* ── lancer ── */
  /* ⛔ UN APPEL À PLUSIEURS est une fonction PRO — celle de l'HÔTE : `formuleDe` est jugée sur la personne qui lance, jamais sur ceux qu'elle appelle (être appelé et rejoindre sont gratuits). La bêta ouvre tout.
     Même refus que la garde PRO des autres routes (`formule_requise`, et si le paiement est ouvert). Jugé APRÈS le droit de joindre (un refus d'existence ne passe pas par la formule) et AVANT les plafonds. */
  function exigerPro(req, res) {
    const v = ctx.formule.formuleDe({ personne: req.moi.id });
    if (v.formule === 'pro') return true;
    refus(res, 402, 'formule_requise', { abonnement_ouvert: !!(ctx.facturation && ctx.facturation.ouvert()) });
    return false;
  }
  /* Les invités d'un appel de groupe qui peuvent SONNER : la personne a le droit de les joindre (une conversation commune ou la règle de la messagerie), et aucun plafond de réception n'est atteint chez eux
     — celui dont le plafond est atteint ne sonne pas (il ne lit rien : un plafond ne se dit pas à un tiers). */
  function sonnables(moi, candidats) {
    const depuis = horloge() - 3600000;
    return candidats.filter(u => stockage.appelsRecusDepuis(u, depuis).n < cfg.entrantsParHeure);
  }
  H['appels.creer'] = garder((req, res) => {
    const b = corps(req), moi = req.moi;
    if (b.type !== 'audio' && b.type !== 'video') return refus(res, 400, 'champ_invalide');
    const aConv = b.conv !== undefined && b.conv !== null, aUid = b.uid !== undefined && b.uid !== null, aUids = b.uids !== undefined && b.uids !== null;
    if ([aConv, aUid, aUids].filter(Boolean).length !== 1) return refus(res, 400, 'champ_invalide');                      // l'un des trois, jamais deux ni aucun
    let appele = null, groupe = null, conv = null;
    if (aConv) {
      if (typeof b.conv !== 'string' || !ID_CONV.test(b.conv)) return refus(res, 400, 'champ_invalide');
      const c = stockage.convPourMembre(b.conv, moi.id);
      if (!c) return refus(res, 404, 'introuvable');
      if (c.conv.type === 'groupe') {
        /* un GROUPE : tous ses membres sonnent, sauf ceux qu'un blocage sépare de la personne qui appelle (dans un sens ou dans l'autre — la définition de la messagerie) */
        const autres = stockage.membresActifs(b.conv).filter(u => u !== moi.id);
        if (autres.length + 1 > cfg.groupeInvitesMax + 1) return refus(res, 409, 'groupe_trop_grand', { max: cfg.groupeInvitesMax });
        groupe = autres.filter(u => !stockage.contactBloque(moi.id, u));
        conv = b.conv;
      } else if (c.conv.type !== 'direct') return refus(res, 409, 'appel_a_deux');         // un canal, une réunion : pas d'appel (une réunion a sa salle, « Rejoindre »)
      else {
        if (stockage.autreSupprime(b.conv, moi.id)) return refus(res, 410, 'compte_supprime');
        appele = stockage.autreDirect(b.conv, moi.id);
        if (!appele) return refus(res, 404, 'introuvable');
      }
    } else if (aUids) {
      /* des personnes CHOISIES : chacune doit pouvoir être jointe (la règle de la messagerie) ; une seule vaut un appel à deux */
      if (!Array.isArray(b.uids) || b.uids.length < 1 || b.uids.length > cfg.groupeInvitesMax || !b.uids.every(x => typeof x === 'string' && ID_PERS.test(x) && x !== moi.id)) return refus(res, 400, 'champ_invalide');
      const ids = Array.from(new Set(b.uids));
      if (!ids.every(u => stockage.peutEcrire(moi.id, u))) return refus(res, 404, 'introuvable');           // ⛔ la MÊME réponse pour qui n'existe pas, est bloqué ou n'est pas un contact : on ne dit pas lequel
      if (ids.length === 1) appele = ids[0]; else groupe = ids;
    } else {
      if (typeof b.uid !== 'string' || !ID_PERS.test(b.uid) || b.uid === moi.id) return refus(res, 400, 'champ_invalide');
      appele = b.uid;
    }
    if (groupe) {
      if (!groupe.length) return refus(res, 404, 'introuvable');
      if (!exigerPro(req, res)) return;
      if (!plafond(res, 'appel:' + moi.id, cfg.parHeure * jeune(moi), 3600000)) return;
      const sonnent = sonnables(moi, groupe);
      let r;
      try { r = appels.creerGroupe({ moi, invites: sonnent, type: b.type, sessionH: req.sessionH, conv }); }
      catch (e) { if (e && e.code === 'occupe_moi') return refus(res, 409, 'occupe', { moi: true }); throw e; }
      if (r.occupe) return refus(res, 409, 'occupe', { moi: false });
      return res.status(201).json({ appel: r.vue });
    }
    /* ⛔ la règle de la messagerie, et SA réponse : pas de contact, un blocage dans un sens ou dans l'autre, une personne qui n'existe pas — 404, le même */
    if (!stockage.peutEcrire(moi.id, appele)) return refus(res, 404, 'introuvable');
    /* ⛔ UNE TENTATIVE COMPTE, RÉUSSIE OU NON : le plafond de la paire est jugé APRÈS celui de la personne, donc un lancement refusé parce qu'on harcèle la même personne a déjà consommé une place du plafond
       de la personne (les quotas du service comptent les essais, pas les réussites — comme les messages à la minute). Le banc `test-981` joue l'arithmétique. */
    if (!plafond(res, 'appel:' + moi.id, cfg.parHeure * jeune(moi), 3600000)) return;
    if (!plafond(res, 'appel_paire:' + moi.id + ':' + appele, cfg.parPaireHeure, 3600000)) return;
    /* ⛔ ET PAR PERSONNE APPELÉE (relecture, I4) : les deux plafonds ci-dessus sont ceux de l'APPELANT — dix comptes, ou dix collègues qui s'y mettent, font sonner trois cents fois la même personne par heure sans en
       atteindre un seul. Au-delà de `entrantsParHeure` appels reçus dans l'heure (tous appelants confondus, les « occupé » compris), le lancement est refusé 429 `appele_sature`, et l'appelant LIT pourquoi
       (« cette personne reçoit beaucoup d'appels ») au lieu d'une sonnerie qui ne vient pas. Jugé APRÈS le droit de joindre (404 identique pour qui ne le peut pas) et APRÈS les plafonds de l'appelant (la
       tentative lui coûte), AVANT l'écriture ; synchrone, donc sans course entre le compte et l'appel qui l'augmente. */
    const recus = stockage.appelsRecusDepuis(appele, horloge() - 3600000);
    if (recus.n >= cfg.entrantsParHeure) {
      const retry = Math.min(3600, Math.max(1, Math.ceil((recus.plusAncien + 3600000 - horloge()) / 1000)));
      res.set('Retry-After', String(retry));
      return refus(res, 429, 'appele_sature', { retry });
    }
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
    if (b.accepte && r.vue && r.vue.genre && r.vue.genre !== 'deux') r.salle = appels.etatSalle(req.appel.id, req.moi.id);
    res.json({ appel: r.vue, etat: r.etat, deja: !!r.deja, attente: !!r.attente, salle: r.salle });
  });
  /* ENTRER dans une salle : un appel de groupe d'une de mes conversations (la bannière « Rejoindre »), la salle d'une réunion où je suis invité. La garde SJ ne juge que la forme de l'identifiant — c'est la
     transaction qui juge le droit d'entrer : sans lui, la MÊME réponse (404) qu'une salle qui n'existe pas. Gratuit, toujours. */
  H['appels.rejoindre'] = garder((req, res) => {
    if (!plafond(res, 'rejoindre:' + req.params.id + ':' + req.moi.id, 12, 60000)) return;          // une personne à qui l'hôte refuse l'entrée ne redemande pas dix fois par seconde
    const r = appels.rejoindre({ moi: req.moi, id: req.params.id, sessionH: req.sessionH });
    res.json({ appel: r.vue, etat: r.etat, deja: !!r.deja, attente: !!r.attente, salle: r.salle });
  });
  H['appels.quitter'] = garder((req, res) => {
    const r = appels.quitter({ moi: req.moi, id: req.appel.id, sessionH: req.sessionH });
    res.json({ ok: true, appel: r.vue, deja: !!r.deja });
  });

  /* ── le signal ── */
  H['appels.signal'] = garder((req, res) => {
    const b = corps(req), moi = req.moi, acces = req.appel;
    if (typeof b.type !== 'string' || !TYPES_SIGNAL.includes(b.type)) return refus(res, 400, 'champ_invalide');
    /* ⛔ le destinataire est l'AUTRE participant de CET appel, rien d'autre : un identifiant quelconque, ou le sien, est refusé (on ne fait pas relayer une enveloppe vers quelqu'un qui n'y est pas). Dans une
       SALLE, c'est un participant PRÉSENT (la transaction du service le juge : un parti, un exclu, un invité à la porte ne reçoit rien) — et le pouls n'a pas de destinataire. */
    const salle = acces.genre !== 'deux';
    if (!salle || b.type !== 'pouls') {
      if (typeof b.a !== 'string' || !ID_PERS.test(b.a) || (salle ? b.a === moi.id : b.a !== acces.autre)) return refus(res, 400, 'champ_invalide');
    }
    let d;
    if (b.type !== 'pouls') {
      if (b.donnees === null || typeof b.donnees !== 'object' || Array.isArray(b.donnees)) return refus(res, 400, 'champ_invalide');      // un OBJET : l'enveloppe est { type, donnees }, la page lit des champs, pas une liste
      d = b.donnees;
      if (tailleSignal(d) > SIGNAL_OCTETS_MAX) return refus(res, 413, 'signal_trop_gros');
    }
    if (!plafond(res, 'signal:' + acces.id + ':' + moi.id, salle ? cfg.groupeSignalMax : cfg.signalMax, cfg.signalFenetreMs)) return;
    appels.signal({ moi, acces, sessionH: req.sessionH, type: b.type, donnees: d, cible: salle ? b.a : undefined });
    res.json({ ok: true });
  });
}

module.exports = { installerAppels, tailleSignal, PROFONDEUR_SIGNAL_MAX, NOEUDS_SIGNAL_MAX };
