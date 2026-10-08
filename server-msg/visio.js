/* ══ LE SERVEUR DE VISIO (LiveKit) — JETONS, COMMANDES, AVIS ══════════════════════════════════════════════════════════════════════════
 *
 * La maille (étape 8) envoie la vidéo de chaque téléphone à CHACUN des autres : à quatre, un téléphone envoie trois copies de sa caméra ; à huit, il en enverrait sept, et la 4G
 * montante ne suit plus. Au-delà de ce que la maille tient, une salle passe par un SERVEUR DE VISIO : chaque appareil n'envoie qu'UNE copie, le serveur la redistribue (petite
 * image pour les vignettes, grande pour qui parle). C'est LiveKit (logiciel libre, Apache 2.0, version ÉPINGLÉE), installé À CÔTÉ du service par `install-sfu.sh` — décision de
 * Justin du 8 octobre 2026 (« oui plus en vidéo et audio »), exception écrite à « fait main » : un serveur de visio ne s'écrit pas à la main. Ce module est TOUT ce que le service
 * en connaît : des jetons qu'il signe, deux commandes qu'il envoie, des avis qu'il reçoit. Le mot « relais » désigne coturn dans ce dépôt (`appels.relais`) : ici, c'est « visio ».
 *
 * ⛔ AUCUNE BIBLIOTHÈQUE. Un jeton LiveKit est un JWT HS256 (en-tête, charge, HMAC-SHA256 du secret partagé) ; une commande est du JSON en POST (Twirp) vers
 *   `/twirp/livekit.RoomService/<Méthode>`, signée par un jeton d'administration ; un avis arrive en POST avec un JWT (SANS « Bearer ») dont la charge porte l'empreinte SHA-256
 *   du corps. Formes relevées dans les sources de la version épinglée (`livekit/protocol` : auth/grants.go, auth/verifier.go, webhook/url_notifier.go) et JOUÉES contre le vrai
 *   serveur construit depuis ces sources (`tests/test-953.js`, sonde du scratchpad).
 *
 * ⛔ LE SERVICE GARDE LA PORTE, LIVEKIT NE FAIT QU'OBÉIR AUX JETONS. Un jeton ne naît QUE dans la route qui fait entrer dans la salle (verrou, salle d'attente, retraits : jugés là,
 *   exactement comme pour la maille). MAIS LiveKit RAFRAÎCHIT lui-même le jeton d'un participant connecté (toutes les 5 min, valable 10 min — `tokenRefreshInterval`,
 *   `tokenDefaultTTL`) : une personne retirée garde en poche un jeton qui la ferait revenir pendant dix minutes, sans repasser par nous. D'où les AVIS : à chaque
 *   `participant_joined`, le service demande « est-elle ADMISE dans cette salle, maintenant ? » et la retire aussitôt sinon (`avisRecu`). Le jeton d'entrée vit peu (`ttlS`).
 * ⛔ LE SECRET ne s'affiche, ne se journalise, ne se sérialise jamais (propriété non énumérable, posée par `config.js`), et ne part jamais vers la page : seuls des jetons
 *   SIGNÉS en sortent, chacun borné à UNE salle et à UNE identité.
 * ⛔ UNE PANNE DE LIVEKIT NE CASSE PAS LES APPELS. `actif()` dit si le serveur répond (sondé toutes les `sondeMs`) : sinon une salle neuve s'ouvre en maille, avec les capacités
 *   de la maille, et le dit (`test-954`). Une salle déjà ouverte par la visio y reste : ses participants voient la coupure et rejoignent.
 */
'use strict';

const crypto = require('crypto');

const b64url = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');

/* Un JWT HS256. `charge` porte déjà `iss`, `sub`, `nbf`, `exp` et les droits. */
function signer(charge, secret) {
  const corps = b64url({ alg: 'HS256', typ: 'JWT' }) + '.' + b64url(charge);
  return corps + '.' + crypto.createHmac('sha256', secret).update(corps).digest('base64url');
}

/* Vérifie un JWT HS256 signé par `cle`/`secret` : la charge, ou null. Une minute de jeu sur l'horloge, comme LiveKit (`tokenLeeway`). JAMAIS un autre algorithme : un en-tête
   qui dit `none` ou `RS256` est refusé AVANT de regarder la signature. */
function verifierJwt(jeton, cle, secret, maintenantMs) {
  if (typeof jeton !== 'string' || jeton.length > 8192) return null;
  const p = jeton.split('.');
  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return null;
  let tete, charge;
  try { tete = JSON.parse(Buffer.from(p[0], 'base64url').toString('utf8')); charge = JSON.parse(Buffer.from(p[1], 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!tete || tete.alg !== 'HS256' || !charge || typeof charge !== 'object') return null;
  const attendu = crypto.createHmac('sha256', secret).update(p[0] + '.' + p[1]).digest();
  let recu;
  try { recu = Buffer.from(p[2], 'base64url'); } catch (e) { return null; }
  if (recu.length !== attendu.length || !crypto.timingSafeEqual(recu, attendu)) return null;
  const t = Math.floor(maintenantMs / 1000), jeu = 60;
  if (charge.iss !== cle) return null;
  if (!Number.isFinite(charge.exp) || charge.exp + jeu < t) return null;
  if (charge.nbf !== undefined && (!Number.isFinite(charge.nbf) || charge.nbf - jeu > t)) return null;
  return charge;
}

/* Ce qu'une personne peut publier dans une salle : la caméra et l'écran seulement dans une salle VIDÉO (comme la maille). Les noms sont ceux de LiveKit (`TrackSource` en minuscules). */
const SOURCES_VIDEO = ['camera', 'microphone', 'screen_share', 'screen_share_audio'];
const SOURCES_AUDIO = ['microphone'];

/**
 * @param {object} o
 * @param {object|null} o.visio   la configuration (`config.appels.visio`) : { url, interne, cle, secret (non énumérable), ttlS, sondeMs, delaiMs } — null : pas de serveur de visio
 * @param {function} [o.horloge]
 * @param {function} [o.appeler]  fetch (injecté par les bancs)
 * @param {function} [o.journal]  une ligne de journal SANS donnée personnelle
 */
function creerVisio({ visio, horloge = Date.now, appeler = (...a) => fetch(...a), journal = () => {} } = {}) {
  const v = visio || null;
  const etat = { ok: false, dernierOk: 0, echecs: 0, sondes: 0, avisRecus: 0, avisRefuses: 0, retraitsForces: 0, commandesEchouees: 0 };
  let sondeEnCours = null, minuterie = null;
  /* branché par `index.js` : (salle, identite) → la personne est-elle admise MAINTENANT ? ⛔ PERSONNE tant que rien n'est branché (échec = fermé) : un oubli de branchement retire tout le monde, ce qui se voit,
     au lieu d'admettre tout le monde, ce qui ne se voit pas. */
  let admise = () => false;

  const configure = !!v;
  const t = () => Math.floor(horloge() / 1000);

  /* Le jeton d'ENTRÉE d'une personne dans une salle. `identite` : l'identifiant que la page et les avis se partagent (la personne) ; `nom` : ce que les autres voient s'afficher
     par LiveKit — la page affiche, elle, le nom que le SERVICE connaît (un nom n'entre jamais dans une décision). `canPublishData` faux : les gestes (main, réactions, ordre du
     jour) passent par le service, jamais par LiveKit — une seule vérité, et des plafonds qui s'appliquent. `canUpdateOwnMetadata` faux : personne ne se renomme chez les autres. */
  function jetonEntree({ salle, identite, nom, audioSeul, maxParticipants }) {
    if (!configure) throw new Error('visio: pas de serveur de visio');
    if (typeof salle !== 'string' || !salle || typeof identite !== 'string' || !identite) throw new Error('visio: salle et identité obligatoires');
    const maintenant = t();
    const charge = {
      iss: v.cle, sub: identite, nbf: maintenant - 10, exp: maintenant + v.ttlS,
      name: typeof nom === 'string' ? nom.slice(0, 80) : '',
      video: { roomJoin: true, room: salle, canSubscribe: true, canPublish: true, canPublishData: false, canUpdateOwnMetadata: false, canPublishSources: audioSeul ? SOURCES_AUDIO : SOURCES_VIDEO }
    };
    /* La salle que LiveKit crée à la première entrée porte NOTRE plafond (`max_participants`) : le service juge déjà la capacité, LiveKit la tient aussi, au cas où. */
    if (Number.isInteger(maxParticipants) && maxParticipants > 0) charge.roomConfig = { maxParticipants, emptyTimeout: 60, departureTimeout: 20 };
    return signer(charge, v.secret);
  }

  /* Un jeton d'administration, court : une salle (`roomAdmin`) ou la création/suppression (`roomCreate`). */
  function jetonAdmin(droits) {
    const maintenant = t();
    return signer({ iss: v.cle, nbf: maintenant - 10, exp: maintenant + 60, video: droits }, v.secret);
  }

  async function commande(methode, corps, droits) {
    if (!configure) return { ok: false, statut: 0 };
    let r;
    try {
      r = await appeler(v.interne + '/twirp/livekit.RoomService/' + methode, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jetonAdmin(droits) },
        body: JSON.stringify(corps), signal: AbortSignal.timeout(v.delaiMs)
      });
    } catch (e) { etat.commandesEchouees++; journal('visio commande ' + methode + ' échec réseau'); return { ok: false, statut: 0 }; }
    let json = null;
    try { json = await r.json(); } catch (e) { json = null; }
    /* 404 « n'existe pas » : la personne est déjà partie, la salle déjà fermée — c'est le résultat voulu. */
    if (!r.ok && r.status !== 404) { etat.commandesEchouees++; journal('visio commande ' + methode + ' refusée ' + r.status); }
    return { ok: r.ok || r.status === 404, statut: r.status, json };
  }

  /* Retirer une personne de la salle chez LiveKit : sa connexion se coupe aussitôt (elle ne reçoit plus rien, n'envoie plus rien). */
  const retirer = (salle, identite) => commande('RemoveParticipant', { room: salle, identity: identite }, { roomAdmin: true, room: salle });
  /* Fermer la salle chez LiveKit : tout le monde est déconnecté (« Terminer pour tous », fin de séance). */
  const fermer = (salle) => commande('DeleteRoom', { room: salle }, { roomCreate: true });

  /* La sonde : LiveKit répond « OK » sur `/` tant qu'il tourne. Un seul essai à la fois ; deux échecs de suite et la visio est déclarée hors service (une salle neuve s'ouvre en
     maille). Un succès la remet en service. */
  function sonder() {
    if (!configure) return Promise.resolve(false);
    if (sondeEnCours) return sondeEnCours;
    etat.sondes++;
    sondeEnCours = (async () => {
      let bon = false;
      try {
        const r = await appeler(v.interne + '/', { method: 'GET', signal: AbortSignal.timeout(v.delaiMs) });
        bon = r.ok && (await r.text()).trim() === 'OK';
      } catch (e) { bon = false; }
      if (bon) { if (!etat.ok) journal('visio en service'); etat.ok = true; etat.dernierOk = horloge(); etat.echecs = 0; }
      else { etat.echecs++; if (etat.ok && etat.echecs >= 2) { etat.ok = false; journal('visio hors service'); } }
      return etat.ok;
    })().finally(() => { sondeEnCours = null; });
    return sondeEnCours;
  }

  function demarrer() {
    if (!configure || minuterie) return;
    sonder();
    minuterie = setInterval(() => { sonder(); }, v.sondeMs);
    if (minuterie.unref) minuterie.unref();
  }
  function arreter() { if (minuterie) clearInterval(minuterie); minuterie = null; }

  /* Un AVIS de LiveKit (webhook). → l'événement lu, ou null s'il n'est pas de LiveKit. L'en-tête `Authorization` porte le JWT NU (pas de « Bearer ») ; sa charge `sha256`
     est l'empreinte (base64 standard) du corps EXACT : le corps se vérifie octet pour octet, avant tout `JSON.parse`. */
  function avisLire(autorisation, corpsBrut) {
    if (!configure || !Buffer.isBuffer(corpsBrut)) { etat.avisRefuses++; return null; }
    const charge = verifierJwt(typeof autorisation === 'string' ? autorisation.replace(/^Bearer\s+/i, '') : '', v.cle, v.secret, horloge());
    if (!charge || typeof charge.sha256 !== 'string') { etat.avisRefuses++; return null; }
    const attendu = Buffer.from(crypto.createHash('sha256').update(corpsBrut).digest('base64'));
    const recu = Buffer.from(charge.sha256);
    if (recu.length !== attendu.length || !crypto.timingSafeEqual(recu, attendu)) { etat.avisRefuses++; return null; }
    let evt = null;
    try { evt = JSON.parse(corpsBrut.toString('utf8')); } catch (e) { etat.avisRefuses++; return null; }
    etat.avisRecus++;      // ⛔ un avis SIGNÉ de notre secret est arrivé : c'est ce que `install-sfu.sh` relit pour prouver que LiveKit joint le service (sans avis, un retrait ne se rattrape plus)
    return evt;
  }

  /* Ce que le service fait d'un avis : une personne qui ENTRE sans être admise dans la salle à cet instant (retirée, salle finie, jeton rejoué) est retirée aussitôt. Le reste
     des avis ne décide de rien : la présence, la capacité et les gestes restent ceux du service. */
  async function avisRecu(evt) {
    if (!evt || evt.event !== 'participant_joined') return { suite: 'rien' };
    const salle = evt.room && typeof evt.room.name === 'string' ? evt.room.name : '';
    const identite = evt.participant && typeof evt.participant.identity === 'string' ? evt.participant.identity : '';
    if (!salle || !identite) return { suite: 'rien' };
    let ok = false;
    try { ok = !!admise(salle, identite); } catch (e) { ok = false; }
    if (ok) return { suite: 'admise' };
    etat.retraitsForces++;
    journal('visio retrait forcé d\'une entrée non admise');
    await retirer(salle, identite);
    return { suite: 'retiree' };
  }

  return {
    configure,
    /* Le serveur de visio est-il utilisable pour une salle NEUVE ? Configuré ET la dernière sonde a répondu. */
    actif: () => configure && etat.ok,
    url: () => (configure ? v.url : null),
    jetonEntree, retirer, fermer, sonder, demarrer, arreter, avisLire, avisRecu,
    brancherAdmission(f) { admise = typeof f === 'function' ? f : () => false; },
    /* Pour `/health` : aucune salle, aucune personne, aucun secret — des compteurs. */
    sante: () => configure ? { configuree: true, ok: etat.ok, ageS: etat.dernierOk ? Math.round((horloge() - etat.dernierOk) / 1000) : null, echecs: etat.echecs, avisRecus: etat.avisRecus, avisRefuses: etat.avisRefuses, retraitsForces: etat.retraitsForces, commandesEchouees: etat.commandesEchouees } : { configuree: false }
  };
}

module.exports = { creerVisio, signer, verifierJwt, SOURCES_VIDEO, SOURCES_AUDIO };
