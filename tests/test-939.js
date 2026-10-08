/* ⛔ CE QUE CE FICHIER GARDE — UNE SALLE PAR LE SERVEUR DE VISIO : LA PAGE ET LE SERVICE SE PARLENT (le moteur, dans Node).

   Les VRAIES fonctions de la page (`public/source-serveur.js`, `creerMoteurSalle`) contre le VRAI service, qui a un serveur de visio configuré — un FAUX LiveKit côté service (sa sonde,
   ses commandes) et une FAUSSE bibliothèque LiveKit côté page (`visio.charger`, injectée comme le ferait le chargement de `vendor/livekit-client`). La sonde au navigateur
   (`tests/sonde-opmessages-visio.js`) fait la même chose contre un VRAI LiveKit, mais elle ne tourne pas en CI : ce banc-ci tient la couture à chaque poussée.

     · ⛔ EN VISIO, AUCUNE LIAISON PAIR À PAIR : la page n'ouvre AUCUN RTCPeerConnection à elle ; elle demande SON jeton au service (`salles.visio`) et rejoint LiveKit avec ;
     · ⛔ LES SERVEURS STUN DE LA LIAISON SONT LES NÔTRES OU AUCUN : la page passe sa propre liste à LiveKit (vide ici) — jamais celle que LiveKit envoie par défaut (Google, Twilio) ;
     · ses pistes sont publiées sous leur source (micro, caméra), la caméra en simulcast ; ce que LiveKit donne des autres devient LEUR flux, sous LEUR paire — et seulement pour qui le service dit présent ;
     · ⛔ UNE FIN DÉFINITIVE (salle fermée, personne retirée) ne redemande PAS de jeton ; une coupure ordinaire, si ;
     · quitter la salle referme la connexion à LiveKit, sans arrêter les pistes de la page. */
'use strict';
const path = require('path'), crypto = require('crypto'), http = require('http');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { creerMonde } = require('./bac-webrtc');
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 8);

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (180 s)'); process.exit(1); }, 180000).unref();

const DELAIS = { pouls: 150, candidats: 5, veille: 3000, deconnecte: 250, reessai: [40, 80], iceMax: 1500, quitter: [40, 80], marge: 600000, renouvMin: 600000, nettoyage: 600000,
  relaisApres: 1000, toutApres: 500, reoffre: 2500, reprise: 400, niveau: 40, tenuParle: 150, etat: 20, visioReessai: [60, 120, 180], visioAttente: 400 };

/* ── le FAUX LiveKit côté service : sa sonde répond « OK », ses commandes sont notées ── */
function fauxServeurLiveKit(port) {
  const f = { commandes: [] };
  f.serveur = http.createServer((q, r) => {
    const m = []; q.on('data', c => m.push(c));
    q.on('end', () => {
      if (q.method === 'GET' && q.url === '/') { r.writeHead(200); return r.end('OK'); }
      const x = /^\/twirp\/livekit\.RoomService\/(\w+)$/.exec(q.url);
      if (!x) { r.writeHead(404); return r.end(); }
      f.commandes.push(x[1]);
      r.writeHead(200, { 'Content-Type': 'application/json' }); r.end('{}');
    });
  });
  return new Promise(ok => f.serveur.listen(port, '127.0.0.1', () => ok(f)));
}

/* ── la FAUSSE bibliothèque LiveKit côté page : ce que le moteur appelle, et rien d'autre. Chaque salle est notée (options, connexion, publications, fermeture) ── */
function fausseBibliotheque(nom) {
  const B = { salles: [], refuserConnexion: 0 };
  class Salle {
    constructor(options) { this.options = options; this.ecouteurs = {}; this.remoteParticipants = new Map(); this.publiees = []; this.depubliees = []; this.connexion = null; this.fermetures = []; this.etat = 'neuve'; B.salles.push(this);
      const s = this;
      this.localParticipant = {
        publishTrack: async (track, opts) => { const pub = { track: { mediaStreamTrack: track, remplacee: [], replaceTrack: async (t) => { pub.track.remplacee.push(t); pub.track.mediaStreamTrack = t; } }, source: opts && opts.source, options: opts }; s.publiees.push(pub); return pub; },
        unpublishTrack: async (track, arreter) => { s.depubliees.push({ track, arreter }); },
      };
    }
    on(evt, f) { (this.ecouteurs[evt] = this.ecouteurs[evt] || []).push(f); return this; }
    removeAllListeners() { this.ecouteurs = {}; }
    emettre(evt, ...args) { for (const f of (this.ecouteurs[evt] || []).slice()) f(...args); }
    async connect(url, jeton, opts) {
      this.connexion = { url, jeton, opts };
      if (B.refuserConnexion > 0) { B.refuserConnexion--; this.etat = 'refusee'; throw new Error('could not establish pc connection'); }
      this.etat = 'connectee';
    }
    disconnect(arreterPistes) { this.fermetures.push(arreterPistes); this.etat = 'fermee'; return Promise.resolve(); }
    /* le banc joue LiveKit : une personne arrive avec ses pistes, s'abonne, s'en va, la connexion tombe */
    arrivee(identite, pistes) {
      const pubs = new Map();
      const part = { identity: identite, trackPublications: pubs, isSpeaking: false, audioLevel: 0 };
      this.remoteParticipants.set(identite, part);
      this.emettre(LK.RoomEvent.ParticipantConnected, part);
      for (const [source, track] of Object.entries(pistes)) {
        const pub = { track: { source, mediaStreamTrack: track, kind: track.kind }, source, kind: track.kind, isSubscribed: true, qualites: [], setVideoQuality(q) { this.qualites.push(q); } };
        pubs.set(source, pub);
        this.emettre(LK.RoomEvent.TrackSubscribed, pub.track, pub, part);
      }
      return part;
    }
    depart(identite) { const part = this.remoteParticipants.get(identite); this.remoteParticipants.delete(identite); this.emettre(LK.RoomEvent.ParticipantDisconnected, part); }
  }
  const LK = {
    Room: Salle,
    RoomEvent: { TrackSubscribed: 'trackSubscribed', TrackUnsubscribed: 'trackUnsubscribed', ParticipantConnected: 'participantConnected', ParticipantDisconnected: 'participantDisconnected', Reconnecting: 'reconnecting', Reconnected: 'reconnected', Disconnected: 'disconnected' },
    DisconnectReason: { UNKNOWN_REASON: 0, CLIENT_INITIATED: 1, DUPLICATE_IDENTITY: 2, SERVER_SHUTDOWN: 3, PARTICIPANT_REMOVED: 4, ROOM_DELETED: 5 },
    Track: { Source: { Microphone: 'microphone', Camera: 'camera', ScreenShare: 'screen_share' } },
    VideoQuality: { LOW: 0, MEDIUM: 1, HIGH: 2 },
  };
  B.LK = LK; B.nom = nom;
  B.charger = () => Promise.resolve(LK);
  return B;
}

(async () => {
  const MDP = { ana: 'pw-ana-1234567', ben: 'pw-ben-1234567', cleo: 'pw-cleo-123456' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  const portLk = await T.portLibre();
  const LKS = await fauxServeurLiveKit(portLk);
  const URL_VISIO = 'ws://127.0.0.1:' + portLk;
  const svc = await T.lancerService({ urlGestion: og.url, config: { appels: { balayageMs: 100, perduMs: 20000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, iceParHeure: 900, signalMax: 2000, groupeSignalMax: 5000, salleEvtMax: 1000,
    visio: { url: URL_VISIO, interne: 'http://127.0.0.1:' + portLk, cle: 'APIbanc939', secret: crypto.randomBytes(36).toString('base64url'), sondeMs: 100, delaiMs: 1000 } } } });
  const sources = [];
  function monter(login) {
    const nav = T.navigateur(svc.base);
    const monde = creerMonde(login);
    /* un MediaStream de poche qui sait AUSSI retirer une piste (le moteur recompose le flux d'une personne quand elle change de caméra pour son écran) */
    class Flux { constructor() { this.pistes = []; } getTracks() { return this.pistes.slice(); } getAudioTracks() { return this.pistes.filter(p => p.kind === 'audio'); } getVideoTracks() { return this.pistes.filter(p => p.kind === 'video'); } addTrack(p) { if (!this.pistes.includes(p)) this.pistes.push(p); } removeTrack(p) { this.pistes = this.pistes.filter(x => x !== p); } }
    const webrtc = { RTCPeerConnection: monde.RTCPeerConnection, MediaStream: Flux };
    const D = { login, nav, monde, requetes: [], evs: [], lib: fausseBibliotheque(login) };
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null, fermerNotifications: async () => {} };
    D.lenteur = { ms: 0 };      // la relecture de la salle (GET /api/salles/:id) ralentie à la demande : c'est ce qui sépare « reprendre tout de suite » de « relire d'abord »
    const f = async (url, init) => {
      const u = String(url), m = (init && init.method) || 'GET', chemin = u.replace(svc.base, '').split('?')[0];
      D.requetes.push(m + ' ' + chemin);
      if (D.lenteur.ms && m === 'GET' && /^\/api\/salles\/[^/]+$/.test(chemin)) await new Promise(r => setTimeout(r, D.lenteur.ms));
      return nav.fetch(url, init);
    };
    D.src = creerSourceServeur({ OPMSG, base: svc.base, fetch: f, EventSource: nav.EventSource, navigateur: faux, webrtc, visio: D.lib, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 20, appelsDelais: DELAIS });
    sources.push(D.src);
    D.src.ecouter(e => { D.evs.push(e); });
    D.entrer = async () => { await D.src.connexion(login, MDP[login]); const d = await D.src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé'); D.moi = D.src.moi(); return D.moi; };
    D.jetons = () => D.requetes.filter(r => /^POST \/api\/salles\/[^/]+\/visio$/.test(r)).length;
    D.salle = () => D.lib.salles[D.lib.salles.length - 1] || null;
    return D;
  }
  const piste = (D, kind) => D.monde.piste(kind, D.login + '-' + kind);
  try {
    const A = monter('ana'), B = monter('ben'), C = monter('cleo');
    const ana = await A.entrer(), ben = await B.entrer(), cleo = await C.entrer();
    const l1 = await A.src.lienContact(); await B.src.accepterLien(l1.code);
    const l2 = await A.src.lienContact(); await C.src.accepterLien(l2.code);
    const vu = await att(async () => { const j = await (await fetch(svc.base + '/health')).json(); return j.visio && j.visio.ok ? j.visio : null; }, 10000);
    vrai('le service voit son serveur de visio (le faux répond « OK » à sa sonde)', !!vu);

    console.log('Une salle par le serveur de visio : le jeton, la connexion, AUCUNE liaison pair à pair');
    const groupe = await A.src.creerGroupe({ nom: 'Équipe visio', membres: [ben.id, cleo.id] });
    const snapA = await A.src.demarrerAppel({ membres: [], video: true, conv: groupe.id });
    const id = snapA.id;
    vrai('la salle passe par la visio (le service l\'a décidé à l\'ouverture)', snapA.visio === true || (await A.src.appel(id) || {}).visio === true);
    await A.src.appelPistes(id, { audio: piste(A, 'audio'), video: piste(A, 'video') });
    const sA = await att(() => { const s = A.salle(); return s && s.etat === 'connectee' && s.publiees.length >= 2 ? s : null; });
    vrai('Ana demande SON jeton au service, puis rejoint LiveKit avec', !!sA && A.jetons() >= 1 && sA.connexion.url === URL_VISIO && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(sA.connexion.jeton));
    if (sA) {
      const ice = sA.connexion.opts && sA.connexion.opts.rtcConfig && sA.connexion.opts.rtcConfig.iceServers;
      v('⛔ elle passe SA liste de serveurs STUN (vide ici : aucun relais lu) — jamais celle que LiveKit envoie par défaut (Google, Twilio)', [Array.isArray(ice), Array.isArray(ice) ? ice.length : -1, JSON.stringify(ice || null).match(/google|twilio/i)], [true, 0, null]);
      v('   les options de la salle : la qualité reçue choisie par la page (pas adaptative), l\'envoi qui s\'adapte, les pistes de la page jamais arrêtées par LiveKit', [sA.options.adaptiveStream, sA.options.dynacast, sA.options.stopLocalTrackOnUnpublish, sA.options.disconnectOnPageLeave], [false, true, false, false]);
      v('ses pistes : la voix publiée comme micro, la caméra comme caméra, en simulcast', sA.publiees.map(p => [p.source, p.options.simulcast === true]), [['microphone', false], ['camera', true]]);
    }
    v('⛔ AUCUNE liaison pair à pair ouverte par la page en visio', A.monde.pcs.length, 0);

    console.log('\nBen entre : LiveKit donne son image et sa voix — elles deviennent SON flux, sous SA paire');
    await att(async () => { const s = await B.src.appel(id); return s && s.entrant ? s : null; }, 5000);   // la sonnerie du groupe arrive chez Ben
    await B.src.repondreAppel(id, true);
    await B.src.appelPistes(id, { audio: piste(B, 'audio'), video: piste(B, 'video') });
    const sB = await att(() => { const s = B.salle(); return s && s.etat === 'connectee' ? s : null; });
    vrai('Ben rejoint LiveKit avec SON jeton (un autre que celui d\'Ana)', !!sB && !!sA && sB.connexion.jeton !== sA.connexion.jeton);
    const vb = piste(B, 'video'), ab = piste(B, 'audio');
    sA.arrivee(ben.id, { microphone: ab, camera: vb });
    const fluxBen = await att(() => { const f = A.src.appelFlux ? A.src.appelFlux(id, ben.id) : null; return f && f.getTracks && f.getTracks().length === 2 ? f : null; });
    vrai('chez Ana, le flux de Ben porte SA voix et SA caméra', !!fluxBen && fluxBen.getTracks().includes(ab) && fluxBen.getTracks().includes(vb));
    const snap2 = await att(async () => { const s = await A.src.appel(id); const p = s && (s.membres || []).find(x => x.id === ben.id); return p && p.liaison === 'connecte' ? s : null; });
    vrai('et la salle dit Ben « connecté » (c\'est LiveKit qui le montre, le service qui le dit présent)', !!snap2);
    const intrus = 'p_' + crypto.randomBytes(16).toString('hex');
    sA.arrivee(intrus, { microphone: piste(A, 'audio') });
    await new Promise(r => setTimeout(r, 200));
    const snap3 = await A.src.appel(id);
    vrai('⛔ une personne que LiveKit montre mais que le service ne dit PAS présente n\'a pas de place dans la salle (population : la salle montre bien Ben)', (snap3.membres || []).some(p => p.id === ben.id) && !(snap3.membres || []).some(p => p.id === intrus));
    v('⛔ toujours AUCUNE liaison pair à pair, ni chez Ana ni chez Ben', [A.monde.pcs.length, B.monde.pcs.length], [0, 0]);

    console.log('\nUne coupure ordinaire se reprend');
    {
      const j0 = A.jetons();
      sA.emettre(A.lib.LK.RoomEvent.Disconnected, A.lib.LK.DisconnectReason.UNKNOWN_REASON);
      const repris = await att(() => A.jetons() > j0 && A.salle() !== sA && A.salle().etat === 'connectee' ? A.salle() : null, 5000);
      vrai('une coupure ordinaire : la page redemande un jeton et rejoint de nouveau', !!repris);
      v('   ses pistes sont publiées de nouveau, sur la nouvelle connexion', repris ? repris.publiees.map(p => p.source) : null, ['microphone', 'camera']);
    }

    console.log('\n⛔ Une fin définitive (« retiré ») attend la relecture de la salle avant tout jeton');
    {
      B.lenteur.ms = 600;
      const sB = B.salle(), j0 = B.jetons();
      sB.emettre(B.lib.LK.RoomEvent.Disconnected, B.lib.LK.DisconnectReason.PARTICIPANT_REMOVED);
      await new Promise(r => setTimeout(r, 400));
      v('⛔ AUCUN jeton redemandé avant que la salle soit relue (400 ms écoulées, la relecture en prend 600) — une reprise immédiate, c\'était un refus de plus à chaque fin', B.jetons() - j0, 0);
      B.lenteur.ms = 0;
      const re = await att(() => B.jetons() > j0 && B.salle() !== sB && B.salle().etat === 'connectee' ? B.salle() : null, 5000);
      vrai('   puis la salle relue le dit PRÉSENT : il revient (le service a le dernier mot, pas LiveKit)', !!re);
    }

    console.log('\nUne connexion qui échoue se réessaie, et ne laisse rien ouvert');
    {
      C.lib.refuserConnexion = 1;
      await att(async () => { const s = await C.src.appel(id); return s && s.entrant ? s : null; }, 5000);
      await C.src.repondreAppel(id, true);
      await C.src.appelPistes(id, { audio: piste(C, 'audio'), video: null });
      const ok = await att(() => { const s = C.salle(); return C.lib.salles.length >= 2 && s.etat === 'connectee' ? s : null; }, 5000);
      vrai('Cléo : la première connexion échoue, la seconde passe', !!ok);
      vrai('⛔ la connexion ratée a été REFERMÉE (rien ne reste ouvert derrière elle)', C.lib.salles[0].etat === 'fermee' || C.lib.salles[0].fermetures.length > 0);
      v('   Cléo n\'a qu\'une voix (pas de caméra) : seule la voix est publiée', ok ? ok.publiees.map(p => p.source) : null, ['microphone']);
    }

    console.log('\nQuitter la salle referme la connexion, sans arrêter les pistes de la page');
    {
      const sC = C.salle();
      await C.src.terminerAppel(id);
      await att(() => sC.etat === 'fermee' ? true : null, 3000);
      v('Cléo part : sa connexion à LiveKit est refermée, et ses pistes ne sont pas arrêtées par LiveKit (disconnect(false))', [sC.etat, sC.fermetures[sC.fermetures.length - 1]], ['fermee', false]);
    }
    console.log('\n« Terminer pour tous » : une fin DÉFINITIVE ne redemande aucun jeton');
    {
      const sB = B.salle(), sA = A.salle(), jB = B.jetons(), jA = A.jetons();
      await A.src.salleAction(id, 'terminerPourTous');
      sB.emettre(B.lib.LK.RoomEvent.Disconnected, B.lib.LK.DisconnectReason.ROOM_DELETED);      // ce que LiveKit dit à Ben quand le service ferme la salle
      await new Promise(r => setTimeout(r, 800));
      v('⛔ Ben (salle supprimée) et Ana (qui l\'a terminée) : AUCUN nouveau jeton demandé — la page relit la salle, le service la dit finie', [B.jetons() - jB, A.jetons() - jA], [0, 0]);
      vrai('   population : chacun avait bien UNE connexion ouverte avant la fin, et celle d\'Ana est refermée par la page', !!sB && !!sA && sB.connexion && sA.connexion && sA.etat === 'fermee');
    }
  } finally {
    for (const s of sources) { try { s.arreter && s.arreter(); } catch (e) { /* fini */ } }
    await svc.arreter();
    LKS.serveur.close(); og.fermer && og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exitCode = 1; fin(); });
