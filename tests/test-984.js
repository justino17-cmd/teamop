/* ⛔ CE QUE CE FICHIER GARDE — LA PAGE ET LE SERVICE SE PARLENT, POUR LES APPELS À DEUX (famille 4, étape 7 ; modèle `test-976`).

   Les VRAIES fonctions de `server-msg/public/api.js` et de `server-msg/public/source-serveur.js` (le module que la page appelle, et son MOTEUR d'appel) sont exécutées dans Node contre le VRAI service,
   à deux ou trois « appareils de poche » (cookie, Origin, flux). La connexion pair à pair est une FAUSSE (`bac-webrtc.js`) qui refuse ce que la vraie refuse (deux offres qui se croisent, un candidat
   avant la description distante…) et qui ne « se connecte » que si ce qu'elle a reçu est ce que l'autre a produit — l'offre, la réponse et les candidats voyagent par les vraies routes. Qu'une voix passe
   VRAIMENT, c'est la sonde du navigateur (`sonde-opmessages-appels.js`, deux Chromium) qui le prouve. Ce que ni `test-981` (les routes seules) ni la sonde (le DOM) ne voient :
     · LE CONTRAT : les capacités (`appels`, `appelsMedias` vraies, `appelsGroupe` fausse), chaque méthode que la page appelle ; un navigateur SANS connexion pair à pair ne lance pas d'appel, et le dit ;
     · UN APPEL DE BOUT EN BOUT : il sonne chez l'autre (et l'écran est acquitté, page visible seulement), AUCUNE connexion n'existe avant la réponse, puis l'appelant offre, l'appelé répond, les candidats se
       croisent, la liaison s'établit ; l'offre reçue EST l'offre produite, les identifiants du relais arrivent intacts à la connexion, le flux de l'autre porte ses deux pistes ; raccrocher ferme les DEUX
       connexions, l'historique des deux se met à jour, raccrocher deux fois rend le même enregistrement ;
     · LES PISTES de la page sont posées sans renégocier, la caméra de l'un est dite à l'autre (au début, puis à chaque changement) ; une piste du mauvais genre ne coupe pas l'appel ;
     · REFUSER, ANNULER, SANS RÉPONSE, OCCUPÉ, INCONNU, À PLUSIEURS : chaque issue a sa phrase, du côté de chacun, et aucune connexion ne naît pour un appel qui n'a pas eu lieu ;
     · DEUX APPAREILS DE LA MÊME PERSONNE (et deux ONGLETS d'une même session) : un seul prend l'appel, l'autre le laisse et ne touche à aucun signal ;
     · LA LIAISON QUI TOMBE : l'appelant redémarre (l'appelé ne fait jamais d'offre), une coupure brève qui revient seule ne relance rien, une liaison qui ne s'établit pas est raccrochée avec sa phrase ;
     · UN SIGNAL NE SE CROIT PAS SUR PAROLE : une offre trop grosse, un candidat illisible, un état qui n'est pas un booléen, un signal d'un mauvais rôle ;
     · LE POULS garde un appel en vie, son absence le termine « perdu » ; une offre perdue repart ; un raccrochage perdu repart ; la page qui se ferme raccroche (keepalive) — mais ne refuse pas une sonnerie ;
     · L'ÉVÉNEMENT QUI DEVANCE LA RÉPONSE de la route (l'autre répond avant que l'appelant ait lu sa propre réponse) n'est pas perdu ; un événement perdu est relu quand la sonnerie devrait être finie ;
     · LES IDENTIFIANTS DU RELAIS durent une heure : un appel plus long les renouvelle, côté appelant PUIS côté appelé, sans couper ; sans relais, ou si le service ne répond pas, l'appel part quand même ;
     · L'HISTORIQUE (deux manqués d'affilée = une ligne), la notification d'un appel (seule l'adresse `/#appels` de CE service ouvre l'onglet), les refus du service dits en clair.
   Toute attente est au GESTE (on sonde la condition), jamais au chronomètre ; les négatifs se prouvent par SENTINELLE (un événement qui arrive APRÈS), et chaque « zéro » est précédé de ce qu'il aurait pu compter. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { creerMonde } = require('./bac-webrtc');
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur, serveursSurs, candidatSur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 8);
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };
const dort = (ms) => new Promise((ok) => setTimeout(ok, ms));
const codeDe = (e) => e ? e.code : null;
const phrase = (e) => e && e.dit ? e.phrase() : '';

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

/* les délais du MOTEUR, raccourcis pour le banc : le pouls toutes les 150 ms (le service attend le sien pendant `perduMs`), les candidats par paquets de 5 ms, la veille de 2 s, les reprises à 40 ms. `renouvMin` est
   énorme : le renouvellement des identifiants n'a lieu que dans la section qui le joue. */
const DELAIS = { pouls: 150, candidats: 5, veille: 2000, deconnecte: 250, reessai: [40, 80], iceMax: 1500, quitter: [40, 80], marge: 600000, renouvMin: 600000, nettoyage: 600000 };

(async () => {
  const MDP = { ana: 'pw-ana-1234567', ben: 'pw-ben-1234567', cleo: 'pw-cleo-123456', dan: 'pw-dan-1234567' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  /* le secret du relais est TIRÉ au hasard à chaque passage (jamais un secret écrit dans un fichier) */
  const SECRET = crypto.randomBytes(24).toString('hex');
  const RELAIS = { secret: SECRET, hote: 'turn.exemple.invalid', port: 3478, portTls: 5349, ttlS: 60 };
  const APPELS = { balayageMs: 100, perduMs: 20000, parHeure: 900, parPaireHeure: 90, iceParHeure: 900, signalMax: 2000 };
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { appels: Object.assign({ relais: RELAIS }, APPELS) } });
  const svcN = await T.lancerService({ urlGestion: og.url, horloge: true, config: { appels: Object.assign({ sonnerieMs: 1200 }, APPELS) } });          // SANS relais, et une sonnerie de 1,2 s
  const sources = [];

  /* Un « appareil » : un navigateur de poche, le module de la page branché dessus, sa propre fausse connexion pair à pair.
     `visible` : la page est-elle sous les yeux ? · `panne` : { re, restant } — les requêtes qui répondent 500 (`restant` fois) · `retenir` : { re, porte } — une réponse retenue jusqu'à `porte.ouvrir()` ·
     `perdre` : un événement du flux que la page ne voit jamais · `recus` : combien d'événements de chaque genre sont arrivés (avant le module) · `fermees` : les notifications retirées de l'écran */
  function monter(service, login, opts) {
    const o = opts || {};
    const nav = o.nav || T.navigateur(service.base);
    const monde = creerMonde(login);
    const D = { login, service, nav, monde, reseau: { requetes: [] }, recus: {}, gids: {}, fermees: [], sw: null, visible: true, panne: null, retenir: null, perdre: null, evs: [], ordre: [] };
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => D.visible, surMessage: (cb) => { D.sw = cb; }, abonnementActuel: async () => null, fermerNotifications: async (tag) => { D.fermees.push(tag); } };
    const f = async (url, init) => {
      const u = String(url), m = (init && init.method) || 'GET', chemin = u.replace(service.base, '').split('?')[0];
      D.reseau.requetes.push({ m, chemin, corps: init && typeof init.body === 'string' ? init.body : null, keepalive: !!(init && init.keepalive) });
      const cle = m + ' ' + chemin;
      if (D.panne && D.panne.restant > 0 && D.panne.re.test(cle)) { D.panne.restant--; D.panne.vues = (D.panne.vues || 0) + 1; return new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } }); }
      const r = await nav.fetch(url, init);
      D.ordre.push('rep ' + cle);
      if (D.retenir && D.retenir.re.test(cle) && !D.retenir.faite) { D.retenir.faite = true; D.retenir.enRoute = true; await D.retenir.porte; }
      return r;
    };
    /* le flux, vu AVANT le module : on compte ce qui arrive et on peut en laisser perdre */
    const ES = class extends nav.EventSource {
      addEventListener(t, g) {
        super.addEventListener(t, (ev) => {
          D.recus[t] = (D.recus[t] || 0) + 1; if (ev && ev.lastEventId) D.gids[t] = parseInt(ev.lastEventId, 10);
          if (D.perdre && D.perdre(t, ev)) return;
          g(ev);
        });
      }
    };
    const src = creerSourceServeur({ OPMSG, base: service.base, fetch: f, EventSource: ES, navigateur: faux, webrtc: o.sansWebrtc ? {} : monde, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 20, appelsDelais: Object.assign({}, DELAIS, o.delais || {}) });
    D.src = src;
    src.ecouter(e => { D.evs.push(e); D.ordre.push('ev ' + e.type); });
    sources.push(src);
    D.entrer = async () => { await src.connexion(login, MDP[login]); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d)); D.moi = src.moi(); return D.moi; };
    D.attendreEv = (pred, ms) => att(() => D.evs.find(pred) || null, ms);
    D.snap = (id) => src.appel(id);
    D.attendreSnap = async (id, pred, ms) => { let s = null; await att(async () => { s = await src.appel(id); return s && pred(s) ? s : null; }, ms); return s && pred(s) ? s : null; };
    D.requetes = (re) => D.reseau.requetes.filter(r => re.test(r.m + ' ' + r.chemin));
    return D;
  }
  /* un tour du balayeur QUI A EU LIEU APRÈS maintenant : l'âge du dernier tour (dans /health) repart à zéro */
  const passage = (service) => { const c = T.client(service.base); return att(async () => { const h = (await c.get('/health')).j; return h && h.appels && typeof h.appels.ageS === 'number' && h.appels.ageS <= 1 ? h : null; }, 8000); };
  const actifDe = async (D) => (await D.nav.client.get('/api/appels')).j.actif;
  const hmac = (user) => crypto.createHmac('sha1', SECRET).update(user).digest('base64');
  /* l'offre produite par une connexion et celle que l'autre a reçue : le même texte */
  const sdpLocal = (pc) => pc && pc.localDescription && pc.localDescription.sdp;
  const sdpDistant = (pc) => pc && pc.remoteDescription && pc.remoteDescription.sdp;
  const liees = async (X, Y, ms) => att(() => X.monde.dernier() && Y.monde.dernier() && X.monde.dernier().iceConnectionState === 'connected' && Y.monde.dernier().iceConnectionState === 'connected', ms || 8000);

  try {
    const A = monter(svc, 'ana'), B = monter(svc, 'ben'), C = monter(svc, 'cleo'), N = monter(svc, 'dan');
    const ana = await A.entrer(), ben = await B.entrer(), cleo = await C.entrer(), dan = await N.entrer();

    /* ═══ 1. LE CONTRAT ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('Le contrat : les capacités, les méthodes de la page, un navigateur sans connexion pair à pair');
    {
      v('le module annonce les appels À DEUX avec leurs médias, et dit « bientôt » aux appels de groupe', [A.src.capacites.appels, A.src.capacites.appelsMedias, A.src.capacites.appelsGroupe], [true, true, false]);
      v('chaque méthode que la page appelle existe', ['appels', 'demarrerAppel', 'appel', 'terminerAppel', 'repondreAppel', 'appelPistes', 'appelFlux', 'appelActif', 'appelFermeture'].filter(k => typeof A.src[k] !== 'function'), []);
      vrai('population : quatre personnes sont entrées par la porte bêta', new Set([ana.id, ben.id, cleo.id, dan.id]).size === 4);
      const sans = monter(svc, 'cleo', { sansWebrtc: true });
      await sans.entrer();
      const e1 = await attrape(sans.src.demarrerAppel({ membres: [ben.id], video: false }));
      v('⛔ un navigateur SANS connexion pair à pair ne lance pas d\'appel — il le DIT (aucune requête partie)', [codeDe(e1), e1 && e1.dit, /ne sait pas passer d'appels/.test(phrase(e1)), sans.requetes(/POST \/api\/appels$/).length], ['appel_navigateur', true, true, 0]);
      sans.src.arreter();
      v('⛔ les serveurs de relais sont jugés avant d\'être donnés au navigateur : un schéma inconnu, une adresse trop longue, un champ qui n\'est pas du texte sont écartés',
        serveursSurs([{ urls: ['stun:turn.exemple.invalid:3478', 'javascript:alert(1)', 'http://pirate.invalid'] }, { urls: 'turn:r.exemple.invalid:3478?transport=udp', username: 'u', credential: 7 }, { urls: ['turn:' + 'x'.repeat(300)] }, 'texte', null]),
        [{ urls: ['stun:turn.exemple.invalid:3478'] }, { urls: ['turn:r.exemple.invalid:3478?transport=udp'], username: 'u' }]);
      v('un candidat est réduit à ses quatre champs, de type connu', [candidatSur({ candidate: 'candidate:1 1 udp 2 192.0.2.1 5 typ host', sdpMid: '0', sdpMLineIndex: 0, usernameFragment: 'uf', extra: 'x' }), candidatSur({ candidate: '' }), candidatSur({ candidate: 'x'.repeat(2000) }), candidatSur(null)],
        [{ candidate: 'candidate:1 1 udp 2 192.0.2.1 5 typ host', sdpMid: '0', sdpMLineIndex: 0, usernameFragment: 'uf' }, null, null, null]);
    }
    /* Ana est le contact de Ben et de Dan ; Dan est le contact de Ben ; Cléo n'est le contact de personne */
    const l1 = await A.src.lienContact(); await B.src.accepterLien(l1.code);
    const l2 = await A.src.lienContact(); await N.src.accepterLien(l2.code);
    const l3 = await B.src.lienContact(); await N.src.accepterLien(l3.code);

    /* ═══ 2. UN APPEL AUDIO DE BOUT EN BOUT ═══════════════════════════════════════════════════════════════════════ */
    console.log('\nUn appel audio : il sonne, rien ne naît avant la réponse, l\'appelant offre, l\'appelé répond, la liaison s\'établit, raccrocher ferme les deux');
    let idAudio = null;
    {
      A.evs.length = 0; B.evs.length = 0;
      const snapA = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      idAudio = snapA.id;
      vrai('l\'identifiant d\'un appel est celui du service (a_ + 32 hexa)', /^a_[0-9a-f]{32}$/.test(idAudio));
      v('Ana : l\'appel SONNE chez l\'autre — sortant, audio, le nom de Ben, une seule personne, pas un groupe, rien à répondre',
        [snapA.etat, snapA.sens, snapA.entrant, snapA.type, snapA.nom, snapA.membres.map(m => [m.id === ben.id, m.etat, m.camera]), snapA.groupe, snapA.liaison], ['sonne', 'sortant', false, 'audio', 'Ben Banc', [[true, 'sonne', false]], false, 'attente']);
      const ring = await B.attendreEv(e => e.type === 'appel-entrant' && e.id === idAudio);
      vrai('⛔ Ben l\'apprend SANS recharger : l\'événement `appel-entrant`', !!ring);
      const sb = await B.src.appelActif();
      v('Ben : l\'appel est ENTRANT (c\'est à lui de répondre), du nom d\'Ana, et l\'appel de CET onglet', [sb && sb.id === idAudio, sb.entrant, sb.sens, sb.etat, sb.nom, sb.membres[0].etat, (await B.src.appel(idAudio)).entrant], [true, true, 'entrant', 'sonne', 'Ana Banc', 'connecte', true]);
      vrai('⛔ la sonnerie sous les yeux est ACQUITTÉE (le service n\'enverra pas de notification qui la double) : une requête `ack` part avec le gid de l\'événement', !!(await att(() => B.requetes(/POST \/api\/flux\/ack/).some(r => r.corps && JSON.parse(r.corps).gid >= B.gids.appel))));
      v('⛔ AUCUNE connexion n\'existe avant la réponse — ni chez l\'appelante ni chez l\'appelé — et l\'appelé n\'a demandé aucun relais', [A.monde.pcs.length, B.monde.pcs.length, B.requetes(/GET \/api\/ice/).length], [0, 0, 0]);
      const rep = await B.src.repondreAppel(idAudio, true);
      v('Ben répond : l\'appel COURT, et ce n\'est plus à lui de répondre', [rep.etat, rep.entrant], ['en-cours', false]);
      vrai('⛔ les deux liaisons s\'établissent (l\'appelante a offert dès que l\'autre a répondu)', !!(await liees(A, B)));
      const pa = A.monde.dernier(), pb = B.monde.dernier();
      v('une seule connexion de chaque côté, deux émetteurs (audio, vidéo) en envoi ET réception dès le début — la caméra se pose et s\'ôte sans renégocier', [A.monde.pcs.length, B.monde.pcs.length, pa.transceivers.map(t => t.kind + ':' + t.direction), pb.transceivers.map(t => t.kind + ':' + t.direction)],
        [1, 1, ['audio:sendrecv', 'video:sendrecv'], ['audio:sendrecv', 'video:sendrecv']]);
      v('⛔ L\'APPELÉ N\'AJOUTE AUCUN ÉMETTEUR avant l\'offre (un émetteur d\'`addTransceiver` n\'est pas rattaché aux sections de l\'offre : sa réponse n\'enverrait rien — trouvé en vrai navigateur) : il ADOPTE ceux que l\'offre fait naître et les passe en `sendrecv`',
        [pb.journal.filter(x => /^addTransceiver/.test(x)), pb.journal.filter(x => /^transceiverNeuf/.test(x)).sort(), pa.journal.filter(x => /^addTransceiver/.test(x)).sort()], [[], ['transceiverNeuf:audio', 'transceiverNeuf:video'], ['addTransceiver:audio', 'addTransceiver:video']]);
      v('⛔ chacun REÇOIT les deux pistes de l\'autre (la section de l\'appelé répond en envoi : sinon l\'appelant n\'aurait rien)', [pa.recues(), pb.recues()], [['audio', 'video'], ['audio', 'video']]);
      v('⛔ L\'APPELANT OFFRE, l\'appelé répond — jamais l\'inverse (l\'appelé n\'a créé aucune offre)', [pa.journal.filter(x => x === 'createOffer').length, pa.journal.includes('setRemoteDescription:answer'), pb.journal.filter(x => /^createOffer/.test(x)).length, pb.journal.includes('setRemoteDescription:offer'), pb.journal.includes('createAnswer')], [1, true, 0, true, true]);
      vrai('⛔ l\'offre que l\'appelé a reçue EST celle que l\'appelante a produite, et la réponse de même (par les vraies routes, le vrai flux)', !!sdpLocal(pa) && sdpDistant(pb) === sdpLocal(pa) && !!sdpLocal(pb) && sdpDistant(pa) === sdpLocal(pb));
      v('⛔ les candidats se sont croisés dans les deux sens, sans perte ni doublon (population : chacun en avait produit deux)', [pa.candidatsEmis.length, pb.candidatsEmis.length, pb.candidatsRecus.map(c => c.candidate), pa.candidatsRecus.map(c => c.candidate)], [2, 2, pa.candidatsEmis.map(c => c.candidate), pb.candidatsEmis.map(c => c.candidate)]);
      const srv = pa.conf.iceServers, turn = srv.find(s => s.username);
      v('⛔ les identifiants du relais arrivent INTACTS à la connexion : les adresses du service, l\'utilisateur « échéance:identifiant », l\'HMAC du secret (recalculé ici)',
        [srv[0].urls, turn.urls, /^\d{10}:p_[0-9a-f]{32}$/.test(turn.username) && turn.username.endsWith(':' + ana.id), turn.credential === hmac(turn.username), pa.conf.bundlePolicy], [['stun:turn.exemple.invalid:3478'], ['turn:turn.exemple.invalid:3478?transport=udp', 'turn:turn.exemple.invalid:3478?transport=tcp', 'turns:turn.exemple.invalid:5349?transport=tcp'], true, true, 'max-bundle']);
      vrai('chacun a ses PROPRES identifiants (celui de l\'appelé porte son identifiant à lui)', pb.conf.iceServers.find(s => s.username).username.endsWith(':' + ben.id));
      const fa = A.src.appelFlux(idAudio), fb = B.src.appelFlux(idAudio);
      v('le flux de l\'autre est là, avec ses deux pistes (la page le branche sur son élément audio)', [fa.getTracks().map(t => t.kind), fb.getTracks().map(t => t.kind)], [['audio', 'video'], ['audio', 'video']]);
      const sa = await A.src.appel(idAudio), sb2 = await B.src.appel(idAudio);
      v('les deux disent « connecté », l\'appel court, sa durée COMMENCE (une horloge de cette page, pas celle du service)', [sa.liaison, sb2.liaison, sa.etat, sb2.etat, typeof sa.debut, typeof sb2.debut, sa.duree >= 0], ['connecte', 'connecte', 'en-cours', 'en-cours', 'number', 'number', true]);
      vrai('la page est prévenue de chaque changement (événements `appel` et `appel-flux`)', A.evs.some(e => e.type === 'appel' && e.id === idAudio) && A.evs.some(e => e.type === 'appel-flux') && B.evs.some(e => e.type === 'appel-flux'));
      const fermeesAvant = B.fermees.slice();
      /* — raccrocher — */
      const r1 = A.src.terminerAppel(idAudio), r2 = A.src.terminerAppel(idAudio);
      const [e1, e2] = await Promise.all([r1, r2]);
      v('Ana raccroche : l\'enregistrement (sortant, audio, Ben), et RACCROCHER DEUX FOIS rend LE MÊME', [e1.id === idAudio, e1.sens, e1.type, e1.nom, e1.duree >= 0, e1 === e2], [true, 'sortant', 'audio', 'Ben Banc', true, true]);
      vrai('⛔ la connexion de l\'appelante est FERMÉE tout de suite, et plus rien ne tient l\'appel (pas de flux)', pa.fermee && A.src.appelFlux(idAudio) === null && A.monde.vivants().length === 0);
      const sfin = await B.attendreSnap(idAudio, s => s.etat === 'termine');
      v('Ben l\'apprend SANS rien faire : l\'appel est terminé, sans phrase (l\'autre a raccroché, rien d\'anormal), sa connexion est fermée', [sfin && sfin.etat, sfin && sfin.issue, sfin && sfin.avis, pb.fermee, B.src.appelFlux(idAudio)], ['termine', 'fini', null, true, null]);
      const eB = await B.src.terminerAppel(idAudio);
      v('Ben raccroche à son tour : le même appel, SANS rien dire au service (il sait déjà : aucune requête `quitter` de Ben)', [eB.id === idAudio, eB.sens, B.requetes(/POST \/api\/appels\/a_[0-9a-f]+\/quitter/).length], [true, 'entrant', 0]);
      v('plus d\'appel dans aucun des deux onglets', [A.src.appelActif(), B.src.appelActif(), await A.src.appel(idAudio), await B.src.appel(idAudio)], [null, null, null, null]);
      const hA = await A.src.appels('tous'), hB = await B.src.appels('tous');
      v('⛔ l\'historique des DEUX s\'est mis à jour (événement `appels`) : sortant chez Ana, ENTRANT chez Ben, la même durée', [hA[0].id === idAudio, hA[0].sens, hA[0].membres[0] === ben.id, hA[0].nom, hB[0].id === idAudio, hB[0].sens, hB[0].nom, hA[0].duree === hB[0].duree], [true, 'sortant', true, 'Ben Banc', true, 'entrant', 'Ana Banc', true]);
      vrai('l\'événement `appels` est arrivé à la page des deux', A.evs.some(e => e.type === 'appels') && B.evs.some(e => e.type === 'appels'));
      const iq = A.ordre.map((x, i) => /^rep POST \/api\/appels\/a_[0-9a-f]+\/quitter$/.test(x) ? i : -1).filter(i => i >= 0).pop();
      vrai('⛔ l\'historique est redit APRÈS que le service a reçu le raccrochage (trouvé en vrai navigateur : relu avant, il ne portait pas encore l\'appel qu\'on venait de finir)', iq !== undefined && A.ordre.slice(iq).includes('ev appels'));
      vrai('la notification de la sonnerie est retirée de l\'écran de l\'appelé (étiquette `appel:<identifiant>`)', fermeesAvant.concat(B.fermees).includes('appel:' + idAudio));
    }

    /* ═══ 3. LA VIDÉO, LES PISTES DE LA PAGE ══════════════════════════════════════════════════════════════════════ */
    console.log('\nUn appel vidéo : les pistes de la page sont posées sans renégocier, la caméra de l\'un est dite à l\'autre');
    {
      const pAudioA = A.monde.piste('audio', 'a-micro'), pVideoA = A.monde.piste('video', 'a-camera'), pAudioB = B.monde.piste('audio', 'b-micro'), pVideoB = B.monde.piste('video', 'b-camera');
      const sn = await B.src.demarrerAppel({ membres: [ana.id], video: true });
      const id = sn.id;
      v('Ben lance un appel VIDÉO vers Ana', [sn.type, sn.sens, sn.nom], ['video', 'sortant', 'Ana Banc']);
      vrai('population : la page de l\'appelant remet ses pistes AVANT la réponse (permission accordée pendant la sonnerie) — le moteur les garde', B.src.appelPistes(id, { audio: pAudioB, video: pVideoB }) === true);
      await A.attendreEv(e => e.type === 'appel-entrant' && e.id === id);
      await A.src.repondreAppel(id, true);
      A.src.appelPistes(id, { audio: pAudioA, video: null });
      vrai('les liaisons s\'établissent', !!(await liees(A, B)));
      const qa = A.monde.dernier(), qb = B.monde.dernier();
      v('⛔ les pistes sont posées sur les émetteurs SANS renégocier : une seule offre, et `replaceTrack` pour chaque piste remise — l\'appelé (qui n\'a d\'émetteur qu\'après l\'offre) les pose à l\'arrivée de l\'offre', [qb.journal.filter(x => x === 'createOffer').length, qb.journal.filter(x => /^replaceTrack/.test(x)).sort(), qa.journal.filter(x => /^replaceTrack/.test(x)).sort()],
        [1, ['replaceTrack:audio:b-micro', 'replaceTrack:video:b-camera'], ['replaceTrack:audio:a-micro']]);
      v('⛔ ce qui passe VRAIMENT : Ben envoie sa voix ET son image, Ana sa voix seule — et chacun reçoit ce que l\'autre envoie', [qb.envoyes(), qa.envoyes(), qb.recues(), qa.recues()], [['audio', 'video'], ['audio'], ['audio', 'video'], ['audio', 'video']]);
      const sa = await A.attendreSnap(id, s => s.membres[0].camera === true), sb = await B.src.appel(id);
      v('⛔ la caméra de Ben est DITE à Ana dès le début (signal d\'état, sans qu\'il ait rien changé) ; celle d\'Ana est éteinte', [sa && sa.membres[0].camera, sb.membres[0].camera, sa.type], [true, false, 'video']);
      /* — Ana allume sa caméra en cours d'appel, puis l'éteint — */
      A.src.appelPistes(id, { audio: pAudioA, video: pVideoA });
      const sb2 = await B.attendreSnap(id, s => s.membres[0].camera === true);
      v('Ana allume sa caméra : Ben le sait (aucune renégociation : toujours UNE offre) et la piste est sur son émetteur', [sb2 && sb2.membres[0].camera, qa.journal.filter(x => /^createOffer/.test(x)).length, qb.journal.filter(x => x === 'createOffer').length, qa.journal.includes('replaceTrack:video:a-camera'), qa.envoyes()], [true, 0, 1, true, ['audio', 'video']]);
      A.src.appelPistes(id, { audio: pAudioA, video: null });
      const sb3 = await B.attendreSnap(id, s => s.membres[0].camera === false);
      v('Ana éteint sa caméra : Ben le sait, la piste est retirée de l\'émetteur (`replaceTrack(null)`)', [sb3 && sb3.membres[0].camera, qa.journal.includes('replaceTrack:video:null')], [false, true]);
      A.src.appelPistes(id, { audio: pVideoA, video: pAudioA });          // deux pistes du MAUVAIS genre : l'émetteur les refuse
      await dort(150);
      const sOk = await A.src.appel(id);
      v('⛔ une piste du mauvais genre est refusée par l\'émetteur et NE COUPE PAS l\'appel', [sOk.etat, sOk.liaison, qa.fermee], ['en-cours', 'connecte', false]);
      v('remettre des pistes à un appel qui n\'existe pas : faux, sans erreur', [A.src.appelPistes('a_' + '0'.repeat(32), { audio: pAudioA })], [false]);
      await B.src.terminerAppel(id);
      await A.attendreSnap(id, s => s.etat === 'termine');
      await A.src.terminerAppel(id);
    }

    /* ═══ 4. REFUSER, ANNULER, SANS RÉPONSE, OCCUPÉ, INCONNU, À PLUSIEURS ═════════════════════════════════════════ */
    console.log('\nLes issues d\'un appel qui n\'a pas lieu : chacune a sa phrase, de chaque côté, et aucune connexion ne naît');
    {
      const avantA = A.monde.pcs.length, avantB = B.monde.pcs.length;
      /* — Ben refuse — */
      const s1 = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s1.id);
      B.evs.length = 0;
      const rf = await B.src.repondreAppel(s1.id, false);
      v('Ben REFUSE : l\'écran de Ben est terminé SANS phrase (il l\'a voulu)', [rf.etat, rf.issue, rf.avis], ['termine', 'refuse', null]);
      const sa1 = await A.attendreSnap(s1.id, s => s.etat === 'termine');
      v('⛔ Ana l\'apprend, avec SA phrase : le nom de celui qui a refusé', [sa1.issue, sa1.avis], ['refuse', 'Ben Banc a refusé l\'appel.']);
      await A.src.terminerAppel(s1.id); await B.src.terminerAppel(s1.id);
      /* — Ana annule pendant la sonnerie — */
      const s2 = await A.src.demarrerAppel({ membres: [ben.id], video: true });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s2.id);
      const eAnn = await A.src.terminerAppel(s2.id);
      v('Ana ANNULE pendant la sonnerie : son enregistrement dure 0 s', [eAnn.id === s2.id, eAnn.duree, eAnn.sens], [true, 0, 'sortant']);
      const sb2 = await B.attendreSnap(s2.id, s => s.etat === 'termine');
      v('⛔ Ben a MANQUÉ cet appel : sa phrase, et la sonnerie est retirée de son écran de notifications', [sb2.issue, sb2.avis, B.fermees.includes('appel:' + s2.id)], ['annule', 'Appel manqué.', true]);
      vrai('… et l\'événement `appels` lui dit que son historique a changé (l\'appel manqué y est)', !!(await att(async () => { const h = await B.src.appels('manques'); return h.length ? h : null; })));
      await B.src.terminerAppel(s2.id);
      /* — personne ne répond — */
      const s3 = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s3.id);
      svc.avancer(46000);
      await passage(svc);
      const sa3 = await A.attendreSnap(s3.id, s => s.etat === 'termine'), sb3 = await B.attendreSnap(s3.id, s => s.etat === 'termine');
      v('⛔ +46 s sans réponse (l\'horloge du SERVICE) : « Pas de réponse. » chez l\'appelante, « Appel manqué. » chez l\'appelé', [sa3.issue, sa3.avis, sb3.issue, sb3.avis], ['manque', 'Pas de réponse.', 'manque', 'Appel manqué.']);
      await A.src.terminerAppel(s3.id); await B.src.terminerAppel(s3.id);
      v('⛔ aucun de ces trois appels n\'a fait naître une connexion (population : trois appels ont eu lieu)', [A.monde.pcs.length - avantA, B.monde.pcs.length - avantB], [0, 0]);
      /* — occupé — */
      const s4 = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s4.id);
      const eOc = await attrape(N.src.demarrerAppel({ membres: [ben.id], video: false }));
      v('⛔ Dan appelle Ben, DÉJÀ dans un appel : « Cette personne est déjà dans un appel. » — pas la phrase de quelqu\'un qui est lui-même en ligne', [codeDe(eOc), eOc && eOc.moi, phrase(eOc)], ['occupe', false, 'Cette personne est déjà dans un appel. Réessaie dans un moment.']);
      const eOc2 = await attrape(A.src.demarrerAppel({ membres: [dan.id], video: false }));
      v('⛔ Ana, déjà dans un appel, en lance un autre : refus LOCAL, avec SA phrase (« Tu es déjà dans un appel… »), aucune requête de plus', [codeDe(eOc2), eOc2 && eOc2.moi, phrase(eOc2), A.requetes(/POST \/api\/appels$/).filter(r => r.corps && JSON.parse(r.corps).uid === dan.id).length], ['occupe', true, 'Tu es déjà dans un appel (peut-être sur un autre de tes appareils).', 0]);
      vrai('population : Dan n\'a ni appel actif ni connexion (le refus ne laisse rien derrière lui)', N.src.appelActif() === null && N.monde.pcs.length === 0);
      await A.src.terminerAppel(s4.id);
      await B.attendreSnap(s4.id, s => s.etat === 'termine'); await B.src.terminerAppel(s4.id);
      /* — un inconnu, un groupe, personne — */
      const eInc = await attrape(C.src.demarrerAppel({ membres: [ben.id], video: false }));
      v('⛔ appeler quelqu\'un qu\'on ne peut pas joindre (Cléo n\'est le contact de personne) : le même refus que pour « écrire » — « Introuvable »', [codeDe(eInc), eInc && eInc.statut, /Introuvable/.test(phrase(eInc))], ['introuvable', 404, true]);
      const eGr = await attrape(A.src.demarrerAppel({ membres: [ben.id, dan.id], video: false }));
      v('⛔ un appel à PLUSIEURS est refusé avec sa phrase, avant toute requête', [codeDe(eGr), phrase(eGr), A.requetes(/POST \/api\/appels$/).filter(r => r.corps && /dan|p_/.test(r.corps) && JSON.parse(r.corps).uid === undefined).length], ['appel_a_deux', 'Un appel se passe à deux pour l\'instant : les appels à plusieurs arrivent bientôt.', 0]);
      const eVi = await attrape(A.src.demarrerAppel({ membres: [], video: false }));
      v('personne à appeler : « Choisis un contact à appeler. »', [codeDe(eVi), phrase(eVi)], ['appel_vide', 'Choisis un contact à appeler.']);
      const conv = (await A.src.conversationPour([ben.id])).id;
      const sc = await A.src.demarrerAppel({ membres: [], video: false, conv });
      vrai('l\'appel part aussi depuis la CONVERSATION directe (sans la liste des membres : le service la lit)', sc.nom === 'Ben Banc' && sc.etat === 'sonne');
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === sc.id);
      await A.src.terminerAppel(sc.id);
      await B.attendreSnap(sc.id, s => s.etat === 'termine'); await B.src.terminerAppel(sc.id);
    }

    /* ═══ 5. DEUX APPAREILS DE LA MÊME PERSONNE, DEUX ONGLETS D'UNE MÊME SESSION ═════════════════════════════════ */
    console.log('\nDeux appareils de Ben sonnent ensemble : un seul prend l\'appel ; deux onglets d\'une même session ne répondent pas deux fois');
    {
      const B2 = monter(svc, 'ben'); await B2.entrer();
      const s = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s.id); await B2.attendreEv(e => e.type === 'appel-entrant' && e.id === s.id);
      v('l\'appel sonne sur LES DEUX appareils de Ben (population de la suite)', [B.src.appelActif().entrant, B2.src.appelActif().entrant], [true, true]);
      await B.src.repondreAppel(s.id, true);
      const pris = await B2.attendreSnap(s.id, x => x.etat === 'termine');
      v('⛔ le premier prend l\'appel, le second le LAISSE avec sa phrase — et ne touche à aucune connexion', [pris.issue, pris.avis, B2.monde.pcs.length, B2.src.appelActif()], ['pris_ailleurs', 'Cet appel a été pris sur un autre de tes appareils.', 0, null]);
      vrai('la liaison de celui qui a répondu s\'établit, sans être dérangée', !!(await liees(A, B)));
      const e2 = await attrape(B2.src.repondreAppel(s.id, true));
      v('répondre sur le second appareil, trop tard : refus (cet appel est fini pour CET appareil)', [codeDe(e2)], ['appel_fini']);
      await A.src.terminerAppel(s.id); await B.attendreSnap(s.id, x => x.etat === 'termine'); await B.src.terminerAppel(s.id); await B2.src.terminerAppel(s.id).catch(() => {});
      /* — les deux répondent en même temps — */
      const s2 = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s2.id); await B2.attendreEv(e => e.type === 'appel-entrant' && e.id === s2.id);
      const avantB = B.monde.pcs.length, avantB2 = B2.monde.pcs.length;
      const [r1, r2] = await Promise.allSettled([B.src.repondreAppel(s2.id, true), B2.src.repondreAppel(s2.id, true)]);
      const gagnant = r1.status === 'fulfilled' ? B : B2, perdant = gagnant === B ? B2 : B, rp = (gagnant === B ? r2 : r1).reason;
      v('⛔ DEUX réponses au même instant : une seule passe, l\'autre reçoit « déjà pris sur un autre appareil » (code `appel_pris`)', [[r1.status, r2.status].sort(), codeDe(rp), phrase(rp)], [['fulfilled', 'rejected'], 'appel_pris', 'Cet appel a déjà été pris sur un autre appareil.']);
      const sp = await perdant.attendreSnap(s2.id, x => x.etat === 'termine');
      v('le perdant a laissé l\'appel et n\'a créé AUCUNE connexion (le gagnant, une)', [sp.issue, perdant.monde.pcs.length - (perdant === B ? avantB : avantB2), gagnant.monde.pcs.length - (gagnant === B ? avantB : avantB2)], ['pris_ailleurs', 0, 1]);
      vrai('la liaison du gagnant s\'établit', !!(await att(() => A.monde.dernier().iceConnectionState === 'connected' && gagnant.monde.dernier().iceConnectionState === 'connected')));
      await A.src.terminerAppel(s2.id); await gagnant.attendreSnap(s2.id, x => x.etat === 'termine'); await gagnant.src.terminerAppel(s2.id); await perdant.src.terminerAppel(s2.id).catch(() => {});
      B2.src.arreter();
      /* — deux ONGLETS : la même session, donc les mêmes événements ET les mêmes signaux — */
      const T1 = monter(svc, 'cleo'); await T1.entrer();
      const T2 = monter(svc, 'cleo', { nav: T1.nav }); await T2.src.demarrer();
      const cl = await T1.src.lienContact(); await A.src.accepterLien(cl.code);
      const s3 = await A.src.demarrerAppel({ membres: [cleo.id], video: false });
      await T1.attendreEv(e => e.type === 'appel-entrant' && e.id === s3.id); await T2.attendreEv(e => e.type === 'appel-entrant' && e.id === s3.id);
      await T1.src.repondreAppel(s3.id, true);
      vrai('la liaison de l\'onglet qui a répondu s\'établit', !!(await liees(A, T1)));
      const recusAvant = T2.recus.signal || 0;
      vrai('population : l\'autre onglet de la MÊME session reçoit lui aussi les signaux (le service les envoie à la session)', !!(await att(() => (T2.recus.signal || 0) >= 2)));
      const t2 = await T2.attendreSnap(s3.id, x => x.etat === 'termine');
      v('⛔ l\'onglet qui n\'a pas répondu laisse l\'appel et IGNORE tous les signaux : aucune connexion, aucune description posée', [t2.issue, T2.monde.pcs.length, T1.monde.pcs.length, recusAvant >= 0], ['pris_ailleurs', 0, 1, true]);
      await A.src.terminerAppel(s3.id); await T1.attendreSnap(s3.id, x => x.etat === 'termine'); await T1.src.terminerAppel(s3.id); await T2.src.terminerAppel(s3.id).catch(() => {});
      T1.src.arreter(); T2.src.arreter();
    }

    /* ═══ 6. LA LIAISON QUI TOMBE, QUI NE S'ÉTABLIT PAS ═══════════════════════════════════════════════════════════ */
    console.log('\nLa liaison tombe : l\'appelant redémarre, l\'appelé ne fait jamais d\'offre, une coupure brève ne relance rien, une liaison qui ne vient pas est raccrochée');
    {
      const s = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s.id); await B.src.repondreAppel(s.id, true);
      vrai('liaison établie', !!(await liees(A, B)));
      const pa = A.monde.dernier(), pb = B.monde.dernier();
      A.evs.length = 0;
      pa.casser('failed');
      vrai('⛔ la liaison tombée est DITE à la page (« reconnexion »), puis l\'appelant redémarre : `restartIce`, une offre de redémarrage, la réponse de l\'appelé', !!(await A.attendreEv(e => e.type === 'appel')) && !!(await att(() => pa.relances === 1 && pb.journal.filter(x => x === 'setRemoteDescription:offer').length === 2 && pb.journal.filter(x => x === 'createAnswer').length === 2)));
      vrai('… et la liaison REVIENT (les candidats de la nouvelle génération se sont croisés)', !!(await att(async () => pa.iceConnectionState === 'connected' && (await A.src.appel(s.id)).liaison === 'connecte')));
      v('⛔ L\'APPELÉ N\'A JAMAIS OFFERT : toujours zéro offre de son côté, et l\'offre de redémarrage porte `a=restart`', [pb.journal.filter(x => /^createOffer/.test(x)).length, pa.journal.filter(x => x === 'createOffer:restart').length, /a=restart/.test(sdpDistant(pb))], [0, 1, true]);
      /* — une coupure brève qui revient seule : rien n'est relancé — */
      pa.casser('disconnected');
      const sd = await A.attendreSnap(s.id, x => x.liaison === 'reconnexion');
      pa.casser('connected');
      await dort(DELAIS.deconnecte * 3);
      v('⛔ une coupure BRÈVE qui revient seule ne relance rien (population : l\'écran a bien dit « reconnexion » pendant la coupure)', [sd && sd.liaison, pa.relances, (await A.src.appel(s.id)).liaison], ['reconnexion', 1, 'connecte']);
      pb.casser('failed');
      const fb = await B.attendreSnap(s.id, x => x.etat === 'termine', 9000);
      v('⛔ l\'APPELÉ dont la liaison tombe n\'offre pas : il attend, puis la veille raccroche avec sa phrase (« La connexion a été perdue. » : elle était établie)', [fb && fb.issue, fb && fb.avis, pb.journal.filter(x => /^createOffer/.test(x)).length], ['echec', 'La connexion a été perdue.', 0]);
      const fa = await A.attendreSnap(s.id, x => x.etat === 'termine');
      vrai('l\'appelante l\'apprend (l\'appel est fini chez le service)', fa && fa.etat === 'termine');
      await A.src.terminerAppel(s.id); await B.src.terminerAppel(s.id);
      vrai('population : plus d\'appel actif pour personne', (await actifDe(A)) === null && (await actifDe(B)) === null);
      /* — la liaison ne s'établit jamais — */
      A.monde.bloquer = true; B.monde.bloquer = true;
      const s2 = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s2.id); await B.src.repondreAppel(s2.id, true);
      const fa2 = await A.attendreSnap(s2.id, x => x.etat === 'termine', 9000);
      v('⛔ une liaison qui ne s\'établit JAMAIS est raccrochée, et la personne l\'apprend : « La connexion n\'a pas pu s\'établir. Vérifie ta connexion, puis réessaie. »', [fa2 && fa2.issue, fa2 && fa2.avis], ['echec', 'La connexion n\'a pas pu s\'établir. Vérifie ta connexion, puis réessaie.']);
      vrai('… et le service le sait (plus d\'appel actif), les deux connexions sont fermées', !!(await att(async () => (await actifDe(A)) === null)) && A.monde.dernier().fermee);
      await A.src.terminerAppel(s2.id); await B.attendreSnap(s2.id, x => x.etat === 'termine'); await B.src.terminerAppel(s2.id);
      A.monde.bloquer = false; B.monde.bloquer = false;
    }

    /* ═══ 7. UN SIGNAL NE SE CROIT PAS SUR PAROLE ═════════════════════════════════════════════════════════════════ */
    console.log('\nLes signaux qu\'on ne croit pas : trop gros, illisibles, d\'un mauvais rôle — et l\'appel continue');
    {
      const s = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s.id); await B.src.repondreAppel(s.id, true);
      vrai('liaison établie', !!(await liees(A, B)));
      const pa = A.monde.dernier(), pb = B.monde.dernier();
      const avantA = pa.journal.length, avantB = pb.journal.length;
      /* Ana (l'appelante) envoie à Ben, par SA session (la liée) ; puis Ben envoie à Ana */
      const envoyer = (D, de, a, type, donnees) => D.nav.client.post('/api/appels/' + s.id + '/signal', donnees === undefined ? { a, type } : { a, type, donnees });
      const r1 = await envoyer(A, ana, ben.id, 'offre', { sdp: 'v=0\r\n' + 'x'.repeat(13000) });
      const r2 = await envoyer(A, ana, ben.id, 'candidats', { liste: [{ candidate: 7 }, null, 'x', { candidate: '' }, { candidate: 'x'.repeat(1500) }] });
      const r3 = await envoyer(A, ana, ben.id, 'etat', { camera: 'oui' });
      const r4 = await envoyer(B, ben, ana.id, 'offre', { sdp: 'v=0\r\no=pirate\r\n' });
      const r5 = await envoyer(B, ben, ana.id, 'reponse', { sdp: 'v=0\r\no=pirate\r\n' });
      v('population : le service relaie ces cinq signaux (il ne lit pas le contenu : forme, taille, rôle ne sont pas son affaire)', [r1.code, r2.code, r3.code, r4.code, r5.code], [200, 200, 200, 200, 200]);
      await att(() => (B.recus.signal || 0) >= 3 && (A.recus.signal || 0) >= 2);
      /* SENTINELLE : un état valide, arrivé APRÈS, prouve que les précédents ont été traités (ou rejetés) */
      const r6 = await envoyer(A, ana, ben.id, 'etat', { camera: true });
      const sb = await B.attendreSnap(s.id, x => x.membres[0].camera === true);
      v('sentinelle : un état valide arrivé après est pris en compte', [r6.code, sb && sb.membres[0].camera], [200, true]);
      v('⛔ rien de tout cela n\'a touché une connexion : ni description posée, ni candidat ajouté (l\'offre de 13 000 signes, les candidats illisibles, l\'offre d\'un APPELÉ, la réponse d\'un appelé sans offre)',
        [pb.journal.slice(avantB).filter(x => /^setRemoteDescription|^addIceCandidate|^createAnswer/.test(x)), pa.journal.slice(avantA).filter(x => /^setRemoteDescription|^addIceCandidate/.test(x))], [[], []]);
      v('⛔ un état qui n\'est pas un booléen est ignoré (la caméra de Ben vue par Ana n\'a pas bougé), et l\'appel court toujours', [(await A.src.appel(s.id)).membres[0].camera, (await A.src.appel(s.id)).etat, (await B.src.appel(s.id)).liaison], [false, 'en-cours', 'connecte']);
      /* un signal d'un autre appel, d'une autre personne : le service refuse, la page n'en reçoit jamais */
      const r7 = await C.nav.client.post('/api/appels/' + s.id + '/signal', { a: ben.id, type: 'etat', donnees: { camera: true } });
      v('⛔ une personne qui n\'est pas dans l\'appel : 404 comme pour un appel qui n\'existe pas (Cléo)', [r7.code], [404]);
      await A.src.terminerAppel(s.id); await B.attendreSnap(s.id, x => x.etat === 'termine'); await B.src.terminerAppel(s.id);
    }

    /* ═══ 8. LE POULS, LES APPAREILS PERDUS, LES REPRISES ═════════════════════════════════════════════════════════ */
    console.log('\nLe pouls garde un appel en vie, son absence le termine ; une offre perdue repart ; un raccrochage perdu repart ; la page qui se ferme raccroche');
    {
      const s = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s.id); await B.src.repondreAppel(s.id, true);
      vrai('liaison établie', !!(await liees(A, B)));
      const pouls = (D) => D.requetes(/\/signal$/).filter(r => r.corps && /"pouls"/.test(r.corps)).length;
      /* l'horloge du service avance PAR PAS plus courts que `perduMs` (20 s), chacun suivi d'un pouls de CHACUN qui a eu lieu APRÈS : sinon le balayeur passerait avant le pouls suivant et jugerait les deux perdus */
      const nA0 = pouls(A);
      for (let i = 0; i < 3; i++) { const a0 = pouls(A), b0 = pouls(B); svc.avancer(12000); await att(() => pouls(A) > a0 && pouls(B) > b0); await passage(svc); }
      const encore = await actifDe(A);
      vrai('⛔ le POULS a gardé l\'appel : 36 s de l\'horloge du service passent (plus que `perduMs` = 20 s), l\'appel court toujours (population : l\'appelante a envoyé des pouls)', encore && encore.id === s.id && encore.etat === 'en_cours' && pouls(A) > nA0 + 2);
      B.panne = { re: /POST \/api\/appels\/.*\/signal/, restant: 1e9 };
      for (let i = 0; i < 3; i++) { const a0 = pouls(A); svc.avancer(12000); await att(() => pouls(A) > a0 || !!A.evs.find(e => e.type === 'appel' && e.id === s.id && A.src.appelActif() === null)); await passage(svc); }
      const fa = await A.attendreSnap(s.id, x => x.etat === 'termine'), fb = await B.attendreSnap(s.id, x => x.etat === 'termine');
      v('⛔ l\'appareil de Ben ne donne plus de signe (pouls refusés) : l\'appel est fini « connexion perdue », et LES DEUX l\'apprennent', [fa.issue, fa.avis, fb.issue, fb.avis], ['perdu', 'La connexion a été perdue.', 'perdu', 'La connexion a été perdue.']);
      B.panne = null;
      await A.src.terminerAppel(s.id); await B.src.terminerAppel(s.id);
      /* — une offre perdue repart — */
      A.panne = { re: /POST \/api\/appels\/.*\/signal/, restant: 0 };
      const i2 = A.reseau.requetes.length;
      const s2 = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s2.id);
      A.panne.restant = 1;                                       // la PREMIÈRE requête de signal échoue (500) : ce sera l'offre
      await B.src.repondreAppel(s2.id, true);
      vrai('⛔ l\'offre perdue (500) REPART : la liaison s\'établit quand même', !!(await liees(A, B)));
      const offres = A.reseau.requetes.slice(i2).filter(r => /\/signal$/.test(r.chemin) && r.corps && /"offre"/.test(r.corps));
      v('… l\'offre est partie DEUX fois (la perdue, puis la bonne), de contenu identique', [offres.length, offres[0].corps === offres[1].corps, A.panne.vues], [2, true, 1]);
      /* — un raccrochage perdu repart — */
      A.panne = { re: /POST \/api\/appels\/.*\/quitter/, restant: 1 };
      const rec = await A.src.terminerAppel(s2.id);
      const fin2 = await B.attendreSnap(s2.id, x => x.etat === 'termine');
      v('⛔ un raccrochage perdu (500) REPART : Ben apprend la fin, l\'enregistrement est rendu', [A.reseau.requetes.slice(i2).filter(r => /\/quitter$/.test(r.chemin)).length, fin2 && fin2.issue, rec.id === s2.id], [2, 'fini', true]);
      A.panne = null; await B.src.terminerAppel(s2.id);
      /* — la page qui se ferme raccroche, par `keepalive` — */
      const s3 = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s3.id); await B.src.repondreAppel(s3.id, true);
      await liees(A, B);
      const f3 = A.src.appelFermeture();
      const q = A.requetes(/POST \/api\/appels\/a_[0-9a-f]+\/quitter/).slice(-1)[0];
      v('⛔ la page d\'Ana se FERME : la connexion est coupée tout de suite et le raccrochage part avec `keepalive` (une requête de page qui meurt doit partir quand même)', [f3, q.keepalive, A.monde.dernier().fermee], [true, true, true]);
      const fb3 = await B.attendreSnap(s3.id, x => x.etat === 'termine');
      v('Ben n\'attend pas 45 s dans le vide : l\'appel est fini chez lui', [fb3 && fb3.issue], ['fini']);
      await B.src.terminerAppel(s3.id);
      v('fermer la page quand rien ne court : faux, et aucune requête', [A.src.appelFermeture(), B.src.appelFermeture()], [false, false]);
      /* — fermer la page pendant qu'une sonnerie ENTRANTE sonne ne la refuse PAS : un autre appareil peut encore répondre — */
      const s4 = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s4.id);
      const avantQ = B.requetes(/\/quitter$|\/repondre$/).length;
      const f4 = B.src.appelFermeture();
      await dort(150);
      v('⛔ la page de Ben se ferme pendant la sonnerie : RIEN n\'est refusé (aucune requête), l\'appel sonne toujours pour le service', [f4, B.requetes(/\/quitter$|\/repondre$/).length - avantQ, (await actifDe(B)).etat], [false, 0, 'sonne']);
      await A.src.terminerAppel(s4.id); await B.attendreSnap(s4.id, x => x.etat === 'termine'); await B.src.terminerAppel(s4.id);
    }

    /* ═══ 9. L'ÉVÉNEMENT QUI DEVANCE LA RÉPONSE, L'ÉVÉNEMENT PERDU, LA REPRISE ═══════════════════════════════════ */
    console.log('\nL\'événement qui devance la réponse de la route, l\'événement perdu qu\'on relit, la sonnerie qu\'on retrouve au chargement');
    {
      /* — l'autre répond avant qu'Ana ait lu la réponse de sa propre requête — */
      let ouvrir; const base = A.recus.appel || 0;
      A.retenir = { re: /POST \/api\/appels$/, porte: new Promise((ok) => { ouvrir = ok; }), faite: false, enRoute: false };
      const p = A.src.demarrerAppel({ membres: [ben.id], video: false });
      await att(() => B.src.appelActif() && B.src.appelActif().entrant);
      const idRace = B.src.appelActif().id;
      await B.src.repondreAppel(idRace, true);
      vrai('population : l\'appelante n\'a pas encore la réponse de sa requête (retenue), mais l\'événement « en cours » lui est DÉJÀ arrivé', !!A.retenir.enRoute && !!(await att(() => (A.recus.appel || 0) >= base + 2)) && A.src.appelActif() === null);
      ouvrir();
      const sn = await p;
      v('⛔ l\'événement qui a DEVANCÉ la réponse n\'est pas perdu : l\'appel est « en cours » dès qu\'Ana le lit, et la liaison s\'établit', [sn.id === idRace, sn.etat, !!(await liees(A, B))], [true, 'en-cours', true]);
      A.retenir = null;
      await A.src.terminerAppel(idRace); await B.attendreSnap(idRace, x => x.etat === 'termine'); await B.src.terminerAppel(idRace);
      /* — une page CACHÉE ne montre rien, donc n'acquitte pas : la notification doit pouvoir partir — */
      const acks = () => B.requetes(/POST \/api\/flux\/ack/).length;
      B.visible = false;
      const a0 = acks();
      const sh = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === sh.id);
      await dort(200);
      v('⛔ une page CACHÉE qui voit sonner n\'ACQUITTE pas (le service enverra sa notification) — aucune requête `ack` en 200 ms', [acks() - a0, B.src.appelActif().entrant], [0, true]);
      await A.src.terminerAppel(sh.id); await B.attendreSnap(sh.id, x => x.etat === 'termine'); await B.src.terminerAppel(sh.id);
      B.visible = true;
      const sv = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === sv.id);
      vrai('sentinelle : la même page, VISIBLE, acquitte la sonnerie suivante (exactement une requête de plus)', !!(await att(() => acks() - a0 === 1)));
      await A.src.terminerAppel(sv.id); await B.attendreSnap(sv.id, x => x.etat === 'termine'); await B.src.terminerAppel(sv.id);
      /* — la reprise : une sonnerie qui sonne quand la page se charge — */
      const s = await A.src.demarrerAppel({ membres: [ben.id], video: true });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s.id);
      const B3 = monter(svc, 'ben'); await B3.entrer();
      const liste = await B3.src.appels('tous');
      const ac = B3.src.appelActif();
      v('⛔ une page qui se CHARGE pendant la sonnerie la retrouve (la liste des appels dit « actif ») : entrante, vidéo, du nom d\'Ana', [ac && ac.id === s.id, ac && ac.entrant, ac && ac.type, ac && ac.nom, liste.every(x => x.id !== s.id)], [true, true, 'video', 'Ana Banc', true]);
      B3.src.arreter();
      /* Ana (même session) recharge pendant SON appel : cet onglet n'en tient aucun, et ne casse rien */
      const A2 = monter(svc, 'ana', { nav: A.nav }); await A2.src.demarrer();
      await A2.src.appels('tous');
      v('⛔ une AUTRE page de la session d\'Ana, chargée pendant son appel sortant, ne s\'en empare pas (aucun appel actif, aucune connexion)', [A2.src.appelActif(), A2.monde.pcs.length, A.src.appelActif().id === s.id], [null, 0, true]);
      A2.src.arreter();
      await A.src.terminerAppel(s.id); await B.attendreSnap(s.id, x => x.etat === 'termine'); await B.src.terminerAppel(s.id);
    }

    /* ═══ 9 bis. ARRÊTER LA SOURCE EN PLEIN APPEL ════════════════════════════════════════════════════════════════ */
    console.log('\nLa session se termine (déconnexion, session morte) pendant un appel : l\'autre n\'attend pas dans le vide');
    {
      const Q = monter(svc, 'ana'); await Q.entrer();
      const s = await Q.src.demarrerAppel({ membres: [ben.id], video: false });
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s.id); await B.src.repondreAppel(s.id, true);
      await liees(Q, B);
      Q.src.arreter();
      const fb = await B.attendreSnap(s.id, x => x.etat === 'termine');
      v('⛔ la source d\'Ana s\'arrête en plein appel : sa liaison est fermée et Ben apprend la fin (sans 45 s d\'attente)', [Q.monde.dernier().fermee, fb && fb.issue, Q.requetes(/\/quitter$/).length], [true, 'fini', 1]);
      await B.src.terminerAppel(s.id);
    }

    /* ═══ 10. LE RENOUVELLEMENT DES IDENTIFIANTS DU RELAIS ════════════════════════════════════════════════════════ */
    console.log('\nLes identifiants du relais durent une heure (ici une minute) : un appel plus long les renouvelle, l\'appelant PUIS l\'appelé');
    {
      const R1 = monter(svc, 'ana', { delais: { renouv: 0.01, renouvMin: 200 } }), R2 = monter(svc, 'ben', { delais: { renouv: 0.01, renouvMin: 200 } });
      await R1.entrer(); await R2.entrer();
      const s = await R1.src.demarrerAppel({ membres: [ben.id], video: false });
      await R2.attendreEv(e => e.type === 'appel-entrant' && e.id === s.id);
      svc.avancer(30000);                                       // l'horloge du service avance : les identifiants renouvelés auront une AUTRE échéance
      await R2.src.repondreAppel(s.id, true);
      await att(() => R1.monde.dernier() && R2.monde.dernier());
      const pa = R1.monde.dernier(), pb = R2.monde.dernier();
      vrai('la liaison s\'établit, puis le renouvellement a lieu (une seconde configuration chez l\'appelant ET chez l\'appelé)', !!(await att(() => pa && pb && pa.confs.length === 2 && pb.confs.length === 2 && pa.iceConnectionState === 'connected' && pb.iceConnectionState === 'connected', 10000)));
      const u0 = pa.confs[0].iceServers.find(x => x.username), u1 = pa.confs[1].iceServers.find(x => x.username), w1 = pb.confs[1].iceServers.find(x => x.username);
      v('⛔ les NOUVEAUX identifiants ont une autre échéance, la bonne signature, et l\'appelé a les siens (son identifiant)', [u1.username !== u0.username, u1.credential === hmac(u1.username), w1.username.endsWith(':' + ben.id), w1.credential === hmac(w1.username), Number(u1.username.split(':')[0]) > Number(u0.username.split(':')[0])], [true, true, true, true, true]);
      const ordreA = pa.journal.filter(x => /setConfiguration|restartIce|^createOffer/.test(x)), ordreB = pb.journal.filter(x => /setConfiguration|setRemoteDescription|createAnswer/.test(x));
      v('⛔ l\'appelant renouvelle PUIS relance la liaison ; l\'appelé renouvelle AVANT de répondre à l\'offre de renouvellement (sinon sa nouvelle allocation naîtrait avec les vieux identifiants)',
        [ordreA.slice(0, 4), ordreB.slice(-3)], [['createOffer', 'setConfiguration', 'restartIce', 'createOffer:restart'], ['setConfiguration', 'setRemoteDescription:offer', 'createAnswer']]);
      v('et l\'appel n\'a pas été coupé (même connexion, état connecté)', [R1.monde.pcs.length, R2.monde.pcs.length, (await R1.src.appel(s.id)).etat, pa.fermee], [1, 1, 'en-cours', false]);
      await R1.src.terminerAppel(s.id); await R2.attendreSnap(s.id, x => x.etat === 'termine'); await R2.src.terminerAppel(s.id);
      R1.src.arreter(); R2.src.arreter();
    }

    /* ═══ 11. SANS RELAIS, ET UN RELAIS QUI NE RÉPOND PAS ═════════════════════════════════════════════════════════ */
    console.log('\nSans relais installé, ou quand le service des identifiants ne répond pas : l\'appel part quand même, direct');
    {
      const X = monter(svcN, 'ana'), Y = monter(svcN, 'ben');
      await X.entrer(); await Y.entrer();
      const yid = Y.moi.id;           // ce service-ci a ses propres identifiants de personnes
      const k = await X.src.lienContact(); await Y.src.accepterLien(k.code);
      const s = await X.src.demarrerAppel({ membres: [yid], video: false });
      await Y.attendreEv(e => e.type === 'appel-entrant' && e.id === s.id); await Y.src.repondreAppel(s.id, true);
      vrai('liaison établie SANS relais', !!(await liees(X, Y)));
      const sn = await X.src.appel(s.id);
      v('⛔ aucun serveur n\'est donné à la connexion (JAMAIS un STUN d\'un tiers en repli), et la vue dit qu\'il n\'y a pas de relais', [X.monde.dernier().conf.iceServers, Y.monde.dernier().conf.iceServers, sn.relais], [[], [], false]);
      await X.src.terminerAppel(s.id); await Y.attendreSnap(s.id, x => x.etat === 'termine'); await Y.src.terminerAppel(s.id);
      /* — le service des identifiants ne répond pas (500) : l'appel part, sans attendre plus que `iceMax` — */
      X.panne = { re: /GET \/api\/ice/, restant: 1e9 }; Y.panne = { re: /GET \/api\/ice/, restant: 1e9 };
      const t0 = Date.now();
      const s2 = await X.src.demarrerAppel({ membres: [yid], video: false });
      await Y.attendreEv(e => e.type === 'appel-entrant' && e.id === s2.id); await Y.src.repondreAppel(s2.id, true);
      vrai('⛔ `/api/ice` refusée (500) : l\'appel s\'établit quand même, directement', !!(await liees(X, Y)) && X.panne.vues >= 1 && Y.panne.vues >= 1);
      v('… avec une liste vide de serveurs, et sans attendre plus de `iceMax` (1,5 s) + l\'établissement', [X.monde.dernier().conf.iceServers, Date.now() - t0 < 6000], [[], true]);
      await X.src.terminerAppel(s2.id); await Y.attendreSnap(s2.id, x => x.etat === 'termine'); await Y.src.terminerAppel(s2.id);
      X.panne = null; Y.panne = null;
      /* — il NE RÉPOND JAMAIS (la requête reste pendante) : après `iceMax` l'appel part sans relais, il n'attend pas pour toujours — */
      X.retenir = { re: /GET \/api\/ice/, porte: new Promise(() => {}), faite: false }; Y.retenir = { re: /GET \/api\/ice/, porte: new Promise(() => {}), faite: false };
      const t1 = Date.now();
      const s2b = await X.src.demarrerAppel({ membres: [yid], video: false });
      await Y.attendreEv(e => e.type === 'appel-entrant' && e.id === s2b.id); await Y.src.repondreAppel(s2b.id, true);
      vrai('⛔ `/api/ice` qui ne répond JAMAIS : l\'appel part après `iceMax` (1,5 s), sans relais, et la liaison s\'établit — il n\'attend pas pour toujours (population : la requête est bien partie des deux côtés, retenue)', !!(await liees(X, Y)) && X.retenir.enRoute !== undefined && X.requetes(/GET \/api\/ice/).length >= 3 && Y.requetes(/GET \/api\/ice/).length >= 3);
      v('… avec une liste vide de serveurs, et après AU MOINS le délai (le moteur a bien attendu les identifiants avant de renoncer)', [X.monde.dernier().conf.iceServers, Y.monde.dernier().conf.iceServers, Date.now() - t1 >= DELAIS.iceMax - 100], [[], [], true]);
      X.retenir = null; Y.retenir = null;
      await X.src.terminerAppel(s2b.id); await Y.attendreSnap(s2b.id, x => x.etat === 'termine'); await Y.src.terminerAppel(s2b.id);
      /* — la sonnerie de 1,2 s, et l'événement de fin que la page ne voit JAMAIS : elle relit l'état quand la sonnerie devrait être finie — */
      const Z = monter(svcN, 'ben', { delais: { marge: 150 } });
      await Z.entrer();
      const s3 = await X.src.demarrerAppel({ membres: [yid], video: false });
      await Z.attendreEv(e => e.type === 'appel-entrant' && e.id === s3.id);
      Z.perdre = (t) => t === 'appel';                           // à partir de maintenant, Ben ne reçoit plus aucun événement d'appel
      const sz = await Z.attendreSnap(s3.id, x => x.etat === 'termine', 9000);
      v('⛔ l\'événement de fin s\'est PERDU : la sonnerie de Ben devrait être finie, la page relit l\'état au service (ni l\'écran qui sonne pour toujours, ni un refus inventé)', [sz && sz.issue, sz && sz.avis, Z.recus.appel >= 1], ['annule', 'Appel manqué.', true]);
      vrai('population : l\'appelante (qui, elle, voit ses événements) a appris « Pas de réponse. »', (await X.attendreSnap(s3.id, x => x.etat === 'termine')).avis === 'Pas de réponse.');
      await X.src.terminerAppel(s3.id); await Z.src.terminerAppel(s3.id);
      X.src.arreter(); Y.src.arreter(); Z.src.arreter();
    }

    /* ═══ 12. L'HISTORIQUE, LA NOTIFICATION, LES REFUS DITS ═══════════════════════════════════════════════════════ */
    console.log('\nL\'historique (deux manqués d\'affilée = une ligne), la notification d\'un appel, les refus du service dits en clair');
    {
      /* Dan appelle Ben deux fois sans réponse d'affilée : une ligne « Dan Banc · manqué (2) » */
      const manquer = async () => { const s = await N.src.demarrerAppel({ membres: [ben.id], video: false }); await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s.id); svc.avancer(46000); await passage(svc); await N.attendreSnap(s.id, x => x.etat === 'termine'); await N.src.terminerAppel(s.id); await B.attendreSnap(s.id, x => x.etat === 'termine'); await B.src.terminerAppel(s.id); return s.id; };
      const m1 = await manquer(), m2 = await manquer();
      const h = await B.src.appels('tous');
      v('⛔ deux manqués D\'AFFILÉE de la même personne = UNE ligne « manqué (2) », la plus récente (m1 n\'a plus de ligne à lui)', [h[0].nom, h[0].sens, h[0].repetitions, h[0].id === m2, h.some(x => x.id === m1), h[1].id === m2], ['Dan Banc', 'manque', 2, true, false, false]);
      /* un appel RÉPONDU de quelqu'un d'autre entre deux manqués rompt la série */
      const sa = await A.src.demarrerAppel({ membres: [ben.id], video: false }); await B.attendreEv(e => e.type === 'appel-entrant' && e.id === sa.id); await B.src.repondreAppel(sa.id, true);
      await liees(A, B); await A.src.terminerAppel(sa.id); await B.attendreSnap(sa.id, x => x.etat === 'termine'); await B.src.terminerAppel(sa.id);
      const m3 = await manquer();
      const h2 = await B.src.appels('tous');
      v('un appel répondu entre deux manqués ROMPT la série : [manqué, appel d\'Ana, manqué (2)] — pas un « manqué (3) »', [h2.slice(0, 3).map(x => [x.nom, x.sens, x.repetitions]), h2[0].id === m3], [[['Dan Banc', 'manque', 1], ['Ana Banc', 'entrant', 1], ['Dan Banc', 'manque', 2]], true]);
      const mq = await B.src.appels('manques');
      v('« Manqués » ne garde que les appels manqués, et les séries restent celles de l\'historique entier (population : l\'historique contient aussi des appels répondus)', [mq.length < h2.length, mq.every(x => x.sens === 'manque'), mq.slice(0, 2).map(x => [x.nom, x.repetitions])], [true, true, [['Dan Banc', 1], ['Dan Banc', 2]]]);
      const hA = await A.src.appels('tous');
      v('l\'historique d\'Ana : jamais « manqué » (ses appels sortants restent sortants même sans réponse), du plus récent au plus ancien', [hA.every(x => x.sens !== 'manque'), hA.some(x => x.sens === 'sortant'), hA.every((x, i) => i === 0 || hA[i - 1].t >= x.t), (await A.src.appels('manques')).length], [true, true, true, 0]);
      v('un filtre inconnu est refusé', [codeDe(await attrape(B.src.appels('rien')))], ['invalide']);
      /* — la notification d'un appel : seule l'adresse de CE service ouvre l'onglet des appels — */
      B.evs.length = 0;
      B.sw({ type: 'ouvrir', url: '/#appels' });
      vrai('toucher la notification d\'un appel (`/#appels`) demande d\'ouvrir l\'onglet des appels', B.evs.some(e => e.type === 'ouvrir' && e.appels === true));
      B.evs.length = 0;
      for (const u of ['https://pirate.exemple.invalid/#appels', '/#appels?x=1', '/#appelsx', '//pirate.exemple.invalid/#appels', 'javascript:alert(1)', '/#reunions', 7]) B.sw({ type: 'ouvrir', url: u });
      B.sw({ type: 'ouvrir', url: '/#messages/c_' + 'a'.repeat(32) });
      v('⛔ toute autre adresse n\'ouvre pas l\'onglet des appels (sentinelle : une adresse de conversation, arrivée APRÈS, est bien passée)', [B.evs.filter(e => e.type === 'ouvrir' && e.appels).length, B.evs.filter(e => e.type === 'ouvrir' && e.conv).length], [0, 1]);
      /* — les refus du service, dits en clair — */
      const e1 = await attrape(A.src.repondreAppel('a_' + '1'.repeat(32), true)), e2 = await attrape(A.src.terminerAppel('a_' + '1'.repeat(32)));
      v('répondre à, ou raccrocher, un appel que cette page ne tient pas : refus dits (« déjà terminé », « introuvable »)', [codeDe(e1), phrase(e1), codeDe(e2), e2 && e2.dit], ['appel_fini', 'Cet appel est déjà terminé.', 'introuvable', true]);
      v('lire un appel qui n\'existe pas : rien (pas une erreur) ; le flux de l\'autre : rien', [await A.src.appel('a_' + '1'.repeat(32)), A.src.appelFlux('a_' + '1'.repeat(32)), A.src.appelActif()], [null, null, null]);
    }
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêtée */ } }
    await svc.arreter(); await svcN.arreter(); await og.fermer();
  }
  fin();
})().catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack ? e.stack : e)); process.exitCode = 1; process.exit(1); });
