/* ⛔ CE QUE CE FICHIER GARDE — LA MATRICE D'ACCÈS : chaque route, contre chaque profil (famille 4).

   `server-msg/manifeste.js` est UNE DONNÉE : chaque route y a sa garde. Ce banc part du MÊME tableau et
   joue CHAQUE route contre six profils — anonyme, jeton invalide, compte non confirmé, personne
   confirmée mais non-membre, membre, administrateur — avec une table de ce qui doit se passer :

        P public · S session · V session ET adresse confirmée · M membre · A administrateur · B bêta · R invité d'une réunion · H son hôte · AP participant d'un appel
        SP participant d'une salle · SH hôte ou co-hôte présent · SO l'hôte seul · SJ qui veut entrer (étape 8)

   ⛔ UNE ROUTE ABSENTE DE LA MATRICE FAIT TOMBER LE BANC (et une ligne de matrice sans route aussi) :
   ajouter une route au manifeste oblige à dire, ICI, ce qu'elle doit refuser à qui. Et il n'existe aucun
   autre chemin d'enregistrement (`app.get(`… hors de la boucle de montage : zéro), sinon une route
   montée « à côté » n'aurait jamais de ligne.
   ⛔ UN OBJET SANS DROIT RÉPOND 404, JAMAIS 403 : pour chaque route M/A, la réponse faite à un non-membre
   d'une conversation qui EXISTE est identique, octet pour octet, à celle d'une conversation qui
   n'existe pas — c'est ce qui empêche de sonder l'existence d'une conversation.
   ⛔ UN REFUS N'ÉCRIT RIEN : l'état de toute la base est relevé avant et après chaque cellule refusée.
   ⛔ L'AUTORITÉ NE VIENT PAS DU CORPS : un `{auteur, uid, role}` envoyé pour se faire passer pour un autre
   est ignoré (cellule dédiée).

   Les fixtures sont écrites DIRECTEMENT dans la base par le module de stockage (WAL : deux processus, une
   base — comme `test-724`), ce qui permet d'avoir un compte NON CONFIRMÉ, que la porte bêta ne fabrique
   jamais (elle confirme par construction). Les gardes se jouent, elles, par le VRAI service en HTTP. */

const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const F_PIECES = require('./outils-pieces');
const PUSH_OUTILS = require('./outils-push');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { MANIFESTE } = require(path.join(T.SERVICE, 'manifeste.js'));
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const PNG = F_PIECES.png();

/* La TABLE : pour chaque route, la requête VALIDE (jouée par un acteur qui en a le droit) et son code. */
const T_OK = [200, 201];
const MATRICE = {
  'health':             { ok: () => ['GET', '/health'], codes: [200] },
  'config':             { ok: () => ['GET', '/api/config'], codes: [200] },
  'beta.entrer':        { ok: () => ['POST', '/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' }], codes: [200] },
  'compte.deconnexion': { ok: () => ['POST', '/api/compte/deconnexion', {}], codes: [200] },
  'moi':                { ok: () => ['GET', '/api/moi'], codes: [200] },
  'moi.maj':            { ok: () => ['POST', '/api/moi/maj', { statut: 'ok' }], codes: [200] },
  'flux':               { ok: () => ['FLUX', '/api/flux'], codes: [200] },
  'sync':               { ok: () => ['GET', '/api/sync'], codes: [200] },
  'notif.liste':        { ok: () => ['GET', '/api/notifications'], codes: [200] },
  'notif.lues':         { ok: () => ['POST', '/api/notifications/lues', { toutes: true }], codes: [200] },
  'contacts':           { ok: () => ['GET', '/api/contacts'], codes: [200] },
  'contacts.lien':      { ok: () => ['POST', '/api/contacts/lien', {}], codes: [201] },
  'contacts.liens.revoquer': { ok: () => ['POST', '/api/contacts/liens/revoquer', {}], codes: [200] },
  'contacts.retirer':   { ok: (F, a) => ['POST', '/api/contacts/retirer', { uid: F.cibleDe(a) }], codes: [200] },
  'contacts.bloquer':   { ok: (F, a) => ['POST', '/api/contacts/bloquer', { uid: F.cibleDe(a) }], codes: [200] },
  'contacts.debloquer': { prep: (F, S, a) => S.contactEtat(a, F.cibleDe(a), 'bloque'), ok: (F, a) => ['POST', '/api/contacts/debloquer', { uid: F.cibleDe(a) }], codes: [200] },
  'liens.lire':         { ok: (F) => ['POST', '/api/liens/lire', { code: F.code }], codes: [200] },
  'liens.accepter':     { ok: (F) => ['POST', '/api/liens/accepter', { code: F.code }], codes: [200] },
  'personnes.lire':     { ok: (F) => ['GET', '/api/personnes/' + F.A], codes: [200] },
  'conv.liste':         { ok: () => ['GET', '/api/conversations'], codes: [200] },
  'conv.directe':       { ok: (F, a) => ['POST', '/api/conversations/directe', { uid: a === F.A ? F.B : F.A }], codes: T_OK },
  'conv.groupe':        { ok: () => ['POST', '/api/conversations/groupe', { nom: 'Nouveau', membres: [] }], codes: [201] },
  'conv.lire':          { ok: (F) => ['GET', '/api/conversations/' + F.G], codes: [200] },
  'conv.maj':           { ok: (F) => ['POST', '/api/conversations/' + F.G + '/maj', { nom: 'Renommé' }], codes: [200] },
  'conv.membres.ajouter': { ok: (F) => ['POST', '/api/conversations/' + F.G + '/membres/ajouter', { uids: [F.C] }], codes: [200] },
  'conv.membres.retirer': { ok: (F) => ['POST', '/api/conversations/' + F.G + '/membres/retirer', { uid: F.B }], codes: [200] },
  'conv.admins':        { ok: (F) => ['POST', '/api/conversations/' + F.G + '/admins', { uid: F.B, admin: true }], codes: [200] },
  'conv.lien':          { ok: (F) => ['POST', '/api/conversations/' + F.G + '/lien', {}], codes: [201] },
  'conv.liens.revoquer': { ok: (F) => ['POST', '/api/conversations/' + F.G + '/liens/revoquer', {}], codes: [200] },
  'conv.quitter':       { ok: (F) => ['POST', '/api/conversations/' + F.G + '/quitter', {}], codes: [200] },
  'conv.prefs':         { ok: (F) => ['POST', '/api/conversations/' + F.G + '/prefs', { epingle: true }], codes: [200] },
  'conv.lu':            { ok: (F) => ['POST', '/api/conversations/' + F.G + '/lu', { seq: 1 }], codes: [200] },
  'conv.saisie':        { ok: (F) => ['POST', '/api/conversations/' + F.G + '/saisie', { actif: true }], codes: [200] },
  'msg.liste':          { ok: (F) => ['GET', '/api/conversations/' + F.G + '/messages'], codes: [200] },
  'msg.envoyer':        { ok: (F) => ['POST', '/api/conversations/' + F.G + '/messages', { cid: 'cid-' + crypto.randomBytes(6).toString('hex'), texte: 'bonjour' }], codes: [201] },
  'msg.modifier':       { ok: (F, a) => ['POST', '/api/conversations/' + F.G + '/messages/modifier', { seq: F.seqDe(a), texte: 'modifié' }], codes: [200] },
  'msg.supprimer':      { ok: (F, a) => ['POST', '/api/conversations/' + F.G + '/messages/supprimer', { seq: F.seqDe(a), pour: 'tous' }], codes: [200] },
  'msg.reagir':         { ok: (F) => ['POST', '/api/conversations/' + F.G + '/messages/reagir', { seq: 1, emoji: '👍' }], codes: [200] },
  /* Le téléphone (étape 2). Les trois routes PUBLIQUES passent la garde pour tout le monde : `tel.code` avec un numéro belge NEUF à chaque
     cellule (un plafond « 1 par 60 s par numéro » refuserait la deuxième sinon), `tel.verifier` avec un code que personne n'a demandé — la
     réponse d'une garde P qui a passé est le 401 uniforme `code_invalide`, et `tel.appareil` sans jeton d'appareil le 401 `appareil_inconnu`. */
  'tel.code':           { ok: () => ['POST', '/api/tel/code', { numero: '+3247' + String(crypto.randomInt(1000000, 9999999)) }], codes: [200] },
  'tel.verifier':       { ok: () => ['POST', '/api/tel/verifier', { numero: '+32470123456', code: '000000' }], codes: [401] },
  'tel.appareil':       { ok: () => ['POST', '/api/tel/appareil', {}], codes: [401] },
  'moi.confidentialite.lire': { ok: () => ['GET', '/api/moi/confidentialite'], codes: [200] },
  'moi.confidentialite': { ok: () => ['POST', '/api/moi/confidentialite', { trouvable: 'tous' }], codes: [200] },
  'moi.appareils.deconnecter': { ok: () => ['POST', '/api/moi/appareils/deconnecter', {}], codes: [200] },
  'contacts.chercher':  { ok: () => ['POST', '/api/contacts/chercher', { numero: '+32470999888' }], codes: [200] },
  'contacts.ajouter':   { ok: (F) => ['POST', '/api/contacts/ajouter', { id: F.A }], codes: [400, 404] },   // sans recherche préalable, ou son propre identifiant : la garde V a passé, le geste dit non
  /* Les pièces (étape 4). Le dépôt se joue en `avatar` : c'est le seul genre qui n'exige pas d'être MEMBRE d'une conversation, donc le seul que les quatre profils confirmés
     peuvent tous réussir — l'appartenance (404 pour un non-membre, 403 dans un groupe d'annonces) est jouée par `test-943`. La lecture passe la garde J : une pièce attachée à
     un message du groupe (Ana et Ben y sont, Cleo non). */
  'pieces.deposer':     { ok: (F) => ['BIN', { genre: 'avatar', corps: F.png }], codes: [201] },
  'pieces.lire':        { ok: (F) => ['GET', '/api/pieces/' + F.P], codes: [200] },
  'moi.avatar':         { ok: () => ['POST', '/api/moi/avatar', { piece: null }], codes: [200] },
  'moi.stockage':       { ok: () => ['GET', '/api/moi/stockage'], codes: [200] },
  /* Les notifications push et le compte (étape 2, suite). Un abonnement se joue avec un hôte de la liste blanche (FCM) et de VRAIES clés : la route juge la forme de l'appareil, pas
     seulement la garde. `push.desabonner` d'un point d'accès inconnu rend 200 (« 0 retiré ») : même réponse qu'un point d'accès qui est à quelqu'un d'autre. `compte.supprimer` coupe les
     sessions de l'acteur ET programme sa suppression : la matrice ouvre une session NEUVE à chaque cellule, donc les cellules suivantes ne s'en ressentent pas. */
  'push.abonner':       { ok: () => ['POST', '/api/push/abonner', { sub: PUSH_OUTILS.appareil('https://fcm.googleapis.com/fcm/send/' + crypto.randomBytes(12).toString('hex')).sub }], codes: [200] },
  'push.desabonner':    { ok: () => ['POST', '/api/push/desabonner', { endpoint: 'https://fcm.googleapis.com/fcm/send/' + crypto.randomBytes(12).toString('hex') }], codes: [200] },
  'push.essai':         { ok: () => ['POST', '/api/push/essai', {}], codes: [200] },
  'flux.ack':           { ok: () => ['POST', '/api/flux/ack', { gid: 0 }], codes: [200] },
  'compte.export':      { ok: () => ['POST', '/api/compte/export', {}], codes: [200] },
  'compte.supprimer':   { ok: () => ['POST', '/api/compte/supprimer', { confirmation: 'SUPPRIMER' }], codes: [200] },
  /* Les ESPACES PROFESSIONNELS et Messages Pro (étape 5). Le service de ce banc a le drapeau de la bêta ÉTEINT (`formule.toutOuvert: false`) : la formule décide pour de vrai. Le
     fixture de chaque route est un espace PAYÉ (Ana propriétaire, Ben membre, Dan membre, Cleo dehors) avec un canal public et un canal privé ; les routes `pro` ont leur cellule
     « impayé hors sursis » en plus (402, et seul l'administrateur y lit la raison). `attendu` remplace la case de la garde pour un profil : Cleo n'est dans aucun espace payé, créer
     un espace lui est refusé (402) alors que la garde V la laisse passer. Le propriétaire qui « quitte » reçoit 409 `proprio` : la garde a passé, le geste dit non (test-961 le joue). */
  'espaces.liste':      { ok: () => ['GET', '/api/espaces'], codes: [200] },
  'espaces.creer':      { pro: 'personne', ok: () => ['POST', '/api/espaces', { nom: 'Nouvelle entreprise' }], codes: [201], attendu: { nonmembre: [402, 'formule_requise'] } },
  'espaces.lire':       { ok: (F) => ['GET', '/api/espaces/' + F.E], codes: [200] },
  'espaces.maj':        { ok: (F) => ['POST', '/api/espaces/' + F.E + '/maj', { nom: 'Renommé' }], codes: [200] },
  /* le destinataire est Dan : Ben, lui, a joué `compte.supprimer` plus haut (sa suppression est PROGRAMMÉE : `destinataire_invalide`, on ne passe pas une entreprise à qui s'en va) */
  'espaces.transferer': { ok: (F) => ['POST', '/api/espaces/' + F.E + '/transferer', { uid: F.D }], codes: [200] },
  /* dissoudre un espace dont l'abonnement COURT est refusé (409 `abonnement_actif`, joué par `test-961`) : pour la cellule du propriétaire, Stripe a dit « résilié » */
  'espaces.supprimer':  { prep: (F, S) => S.abonnementPoser(F.E, { client: 'cus_banc905', abonnement: 'sub_b905_fin_' + F.E.slice(2, 10), statut: 'canceled', places: 50, fin_periode: null, annule: true, impaye: false }, { adopter: true }),
                          ok: (F) => ['POST', '/api/espaces/' + F.E + '/supprimer', { confirmation: 'SUPPRIMER' }], codes: [200] },
  'espaces.quitter':    { ok: (F) => ['POST', '/api/espaces/' + F.E + '/quitter', {}], codes: [200, 409] },
  'espaces.contacts':   { ok: (F) => ['GET', '/api/espaces/' + F.E + '/contacts'], codes: [200] },
  'espaces.membres.role': { ok: (F) => ['POST', '/api/espaces/' + F.E + '/membres/role', { uid: F.B, admin: true }], codes: [200] },
  'espaces.membres.retirer': { ok: (F) => ['POST', '/api/espaces/' + F.E + '/membres/retirer', { uid: F.D }], codes: [200] },
  'espaces.invitations.creer': { pro: 'espace', ok: (F) => ['POST', '/api/espaces/' + F.E + '/invitations', { max: 3, jours: 2 }], codes: [201] },
  'espaces.invitations.revoquer': { ok: (F) => ['POST', '/api/espaces/' + F.E + '/invitations/revoquer', {}], codes: [200] },
  'invitations.lire':   { ok: (F) => ['POST', '/api/invitations/lire', { code: F.codeE }], codes: [200] },
  'invitations.accepter': { ok: (F) => ['POST', '/api/invitations/accepter', { code: F.codeE }], codes: [200] },
  'canaux.creer':       { pro: 'espace', ok: (F) => ['POST', '/api/espaces/' + F.E + '/canaux', { nom: 'nouveau canal' }], codes: [201] },
  'canaux.maj':         { ok: (F) => ['POST', '/api/espaces/' + F.E + '/canaux/' + F.CP + '/maj', { nom: 'renommé' }], codes: [200] },
  'canaux.supprimer':   { ok: (F) => ['POST', '/api/espaces/' + F.E + '/canaux/' + F.CP + '/supprimer', { confirmation: 'SUPPRIMER' }], codes: [200] },
  'canaux.membres.ajouter': { ok: (F) => ['POST', '/api/espaces/' + F.E + '/canaux/' + F.CV + '/membres/ajouter', { uids: [F.D] }], codes: [200] },
  /* ⛔ LA HIÉRARCHIE DES ADMINISTRATEURS vaut dans les canaux privés (`hier`, cellules jouées APRÈS les six profils) : Ben et Dan deviennent administrateurs de l'espace et du privé ; Ben, qui n'est
     pas propriétaire, ne retire NI le propriétaire NI un autre administrateur (403, et le refus n'écrit rien) — Ana, elle, retire Dan (200). Relevé par le gardien le 3 octobre 2026 : un simple
     administrateur retirait le propriétaire d'un canal privé, qui n'y rentrait plus. */
  'canaux.membres.retirer': { ok: (F) => ['POST', '/api/espaces/' + F.E + '/canaux/' + F.CV + '/membres/retirer', { uid: F.B }], codes: [200],
                              hier: { prep: (F, S) => { S.espaceRoleMembre({ espace: F.E, uid: F.B, admin: true }); S.espaceRoleMembre({ espace: F.E, uid: F.D, admin: true }); S.canalMembresAjouter({ conv: F.CV, par: F.A, uids: [F.B, F.D] }); },
                                      refus: (F) => [['retire le PROPRIÉTAIRE', { uid: F.A }, [403, 'interdit']], ['retire un AUTRE administrateur', { uid: F.D }, [403, 'interdit']]], permis: (F) => ({ uid: F.D }) } },
  'facturation.offres': { ok: () => ['GET', '/api/facturation/offres'], codes: [200] },
  'facturation.etat':   { ok: (F) => ['GET', '/api/espaces/' + F.E + '/facturation/etat'], codes: [200] },
  'facturation.paiement': { ok: (F) => ['POST', '/api/espaces/' + F.E + '/facturation/paiement', { places: 3 }], codes: [503] },   // sans clé Stripe : la garde a passé, la facturation est INERTE et le dit
  'facturation.portail': { ok: (F) => ['POST', '/api/espaces/' + F.E + '/facturation/portail', {}], codes: [503] },
  'facturation.relire': { ok: (F) => ['POST', '/api/espaces/' + F.E + '/facturation/relire', {}], codes: [503] },
  /* Les RÉUNIONS PROGRAMMÉES (étape 6). Le fixture de chaque route est une réunion à venir : Ana l'héberge (H), Ben et Dan sont invités (R), Cleo (contact d'Ana) et Nina (non confirmée) n'y sont pas. Créer
     une réunion est une fonction Pro (garde V + `pro`) : Cleo, qui n'est dans aucun espace payé, reçoit 402 — « Perso qui programme hors bêta ». Un invité qui n'est pas l'hôte reçoit 403 sur
     les routes d'hôte (H) ; l'hôte qui « répond » à sa propre réunion reçoit 409 `hote_reponse` : la garde a passé, le geste dit non (test-973 le joue). */
  'reunions.liste':     { ok: () => ['GET', '/api/reunions'], codes: [200] },
  'reunions.creer':     { pro: 'personne', ok: (F, a) => ['POST', '/api/reunions', { titre: 'Point ' + (a ? a.slice(2, 8) : 'x'), debut: Date.now() + 3 * 86400000, fin: Date.now() + 3 * 86400000 + 3600000, invites: [] }], codes: [201], attendu: { nonmembre: [402, 'formule_requise'] } },
  'reunions.lire':      { ok: (F) => ['GET', '/api/reunions/' + F.R], codes: [200] },
  'reunions.modifier':  { ok: (F) => ['POST', '/api/reunions/' + F.R + '/modifier', { lieu: 'Salle 2' }], codes: [200] },
  'reunions.annuler':   { ok: (F) => ['POST', '/api/reunions/' + F.R + '/annuler', {}], codes: [200] },
  'reunions.supprimer': { ok: (F) => ['POST', '/api/reunions/' + F.R + '/supprimer', {}], codes: [200] },
  'reunions.inviter':   { ok: (F) => ['POST', '/api/reunions/' + F.R + '/inviter', { uids: [F.C] }], codes: [200] },
  'reunions.retirer':   { ok: (F) => ['POST', '/api/reunions/' + F.R + '/retirer', { uid: F.B }], codes: [200] },
  'reunions.quitter':   { ok: (F) => ['POST', '/api/reunions/' + F.R + '/quitter', {}], codes: [200, 409],
                          exactes: { membre: [200, null], admin: [409, 'hote_non_quittable'] } },   // l'invité (Ben) sort : 200 ; l'hôte (Ana) ne quitte pas : 409 `hote_non_quittable` — la garde a passé, le geste dit non
  'reunions.reponse':   { ok: (F) => ['POST', '/api/reunions/' + F.R + '/reponse', { statut: 'accepte' }], codes: [200, 409] },
  'reunions.rappels':   { ok: (F) => ['POST', '/api/reunions/' + F.R + '/rappels', { rappels: [5] }], codes: [200] },
  'reunions.ics':       { ok: (F) => ['GET', '/api/reunions/' + F.R + '/ics'], codes: [200] },
  'reunions.courriel':  { ok: (F) => ['POST', '/api/reunions/' + F.R + '/courriel', { destinataire: 'banc.invite@exemple.invalid' }], codes: [503] },   // sans relais SMTP : la garde a passé, le courriel est INERTE et le dit (test-975 joue le relais)
  /* Les APPELS À DEUX (étape 7). Lancer est V (agir au nom d'une adresse) : chacun appelle SON contact, un appel par acteur (la route précédente a libéré les lignes). Les trois gestes d'un appel sont AP : la
     garde ne laisse passer que les deux participants, et un non-participant reçoit le 404 d'un appel qui n'existe pas. Pendant ces routes, Ana et Ben parlent depuis les appareils LIÉS à l'appel (`liees`) :
     répondre se joue sur un appel qui SONNE (Ben l'appelé : 200 ; Ana l'appelante : 403 `interdit` — la garde a passé, le geste dit non), raccrocher et signaler sur un appel qui COURT. Les cases que la
     garde ne voit pas (un autre appareil, un appel pris, un appel fini) sont jouées plus bas. */
  'ice':                { ok: () => ['GET', '/api/ice'], codes: [404] },   // S laisse passer tout compte connecté ; le geste dit non à qui n'est dans AUCUN appel (404 `introuvable`, test-981 joue les identifiants rendus à qui sonne ou court)
  'appels.liste':       { ok: () => ['GET', '/api/appels'], codes: [200] },
  'appels.creer':       { ok: (F, a) => ['POST', '/api/appels', { uid: F.cibleDe(a), type: 'audio' }], codes: [201] },
  'appels.repondre':    { ok: (F) => ['POST', '/api/appels/' + F.AP + '/repondre', { accepte: true }], codes: [200, 403],
                          exactes: { membre: [200, null], admin: [403, 'interdit'] } },
  'appels.quitter':     { ok: (F) => ['POST', '/api/appels/' + F.AP + '/quitter', {}], codes: [200] },
  'appels.signal':      { ok: (F, a) => ['POST', '/api/appels/' + F.AP + '/signal', { a: a === F.A ? F.B : F.A, type: 'etat', donnees: { camera: false } }], codes: [200] },
  /* Les SALLES (étape 8 : appels à plusieurs, salles de réunion). Chaque route a sa salle NEUVE (`F.SA`) : un appel de groupe d'Ana (l'hôte), avec Ben présent (sauf pour `appels.rejoindre`, où il est invité et ENTRE)
     et Dan invité (il attend à la porte pour `admettre` et `refuser`). Les gestes de l'hôte sont SH (un participant reçoit 403), ceux de l'hôte seul SO ; un non-participant, un non confirmé et un exclu reçoivent le
     MÊME 404 qu'une salle qui n'existe pas. `evt` : l'épingle est un geste d'hôte, Ben (participant) reçoit donc 403 — la garde a passé, le geste dit non. Les cases que la garde ne voit pas (un exclu qui revient, une
     salle verrouillée, un co-hôte qui vise l'hôte, un Perso qui lance un groupe) sont jouées plus bas. */
  'appels.rejoindre':   { ok: (F) => ['POST', '/api/appels/' + F.SA + '/rejoindre', {}], codes: [200] },
  'salles.lire':        { ok: (F) => ['GET', '/api/salles/' + F.SA], codes: [200] },
  'salles.admettre':    { ok: (F) => ['POST', '/api/salles/' + F.SA + '/admettre', { uid: F.D }], codes: [200] },
  'salles.refuser':     { ok: (F) => ['POST', '/api/salles/' + F.SA + '/refuser', { uid: F.D }], codes: [200] },
  'salles.exclure':     { ok: (F) => ['POST', '/api/salles/' + F.SA + '/exclure', { uid: F.D }], codes: [200] },
  'salles.verrouiller': { ok: (F) => ['POST', '/api/salles/' + F.SA + '/verrouiller', { actif: true }], codes: [200] },
  'salles.salle_attente': { ok: (F) => ['POST', '/api/salles/' + F.SA + '/salle_attente', { actif: true }], codes: [200] },
  'salles.couper_micro': { ok: (F) => ['POST', '/api/salles/' + F.SA + '/couper_micro', { tous: true }], codes: [200] },
  'salles.partage':     { ok: (F) => ['POST', '/api/salles/' + F.SA + '/partage', { actif: false }], codes: [200] },
  'salles.rec':         { ok: (F) => ['POST', '/api/salles/' + F.SA + '/rec', { actif: true }], codes: [200] },
  'salles.cohote':      { ok: (F) => ['POST', '/api/salles/' + F.SA + '/cohote', { uid: F.B, actif: true }], codes: [200] },
  'salles.terminer':    { ok: (F) => ['POST', '/api/salles/' + F.SA + '/terminer', {}], codes: [200] },
  'salles.main':        { ok: (F) => ['POST', '/api/salles/' + F.SA + '/main', { actif: true }], codes: [200] },
  'salles.reaction':    { ok: (F) => ['POST', '/api/salles/' + F.SA + '/reaction', { emoji: 'pouce' }], codes: [200] },
  'salles.etat':        { ok: (F) => ['POST', '/api/salles/' + F.SA + '/etat', { micro: false }], codes: [200] },
  'salles.evt':         { ok: (F) => ['POST', '/api/salles/' + F.SA + '/evt', { k: 'epingle', donnees: { op: 'retirer' } }], codes: [200, 403],
                          exactes: { membre: [403, 'interdit'], admin: [200, null] } },
  /* Le lien d'invité et la salle d'une réunion. `apercu` est PUBLIC (le code vient de la fixture : celui de la réunion d'Ana) ; entrer par le lien est S, par l'identifiant R (l'invité, l'hôte) ; le lien se lit et se
     renouvelle par H. Les deux routes qui ENTRENT jouent une réunion dont la fenêtre est ouverte (elle commence dans deux minutes) : une réunion dans trois jours refuse, et le refus est joué plus bas. */
  'reunions.apercu':    { ok: (F) => ['POST', '/api/reunions/apercu', { code: F.codeR }], codes: [200] },
  'reunions.rejoindre_code': { ok: (F) => ['POST', '/api/reunions/rejoindre', { code: F.codeR }], codes: [200] },
  'reunions.rejoindre': { ok: (F) => ['POST', '/api/reunions/' + F.R + '/rejoindre', {}], codes: [200] },
  'reunions.lien':      { ok: (F) => ['POST', '/api/reunions/' + F.R + '/lien', {}], codes: [200] },
  'reunions.lien_renouveler': { ok: (F) => ['POST', '/api/reunions/' + F.R + '/lien/renouveler', {}], codes: [200] },
};

/* Ce que chaque garde doit répondre à chaque profil : { code, error } ou 'passe'. */
const PROFILS = ['anonyme', 'invalide', 'nonconfirme', 'nonmembre', 'membre', 'admin'];
const ATTENDU = {
  P: { anonyme: 'passe', invalide: 'passe', nonconfirme: 'passe', nonmembre: 'passe', membre: 'passe', admin: 'passe' },
  B: { anonyme: 'passe', invalide: 'passe', nonconfirme: 'passe', nonmembre: 'passe', membre: 'passe', admin: 'passe' },
  S: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: 'passe', nonmembre: 'passe', membre: 'passe', admin: 'passe' },
  V: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [403, 'adresse_non_confirmee'], nonmembre: 'passe', membre: 'passe', admin: 'passe' },
  M: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [404, 'introuvable'], nonmembre: [404, 'introuvable'], membre: 'passe', admin: 'passe' },
  J: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [404, 'introuvable'], nonmembre: [404, 'introuvable'], membre: 'passe', admin: 'passe' },
  A: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [404, 'introuvable'], nonmembre: [404, 'introuvable'], membre: [403, 'interdit'], admin: 'passe' },
  /* un ESPACE : bâti sur V (le non confirmé reçoit 403 avant tout), puis l'appartenance — un non-membre reçoit 404, identique à un espace inexistant */
  E:  { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [403, 'adresse_non_confirmee'], nonmembre: [404, 'introuvable'], membre: 'passe', admin: 'passe' },
  EA: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [403, 'adresse_non_confirmee'], nonmembre: [404, 'introuvable'], membre: [403, 'interdit'], admin: 'passe' },
  EP: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [403, 'adresse_non_confirmee'], nonmembre: [404, 'introuvable'], membre: [403, 'interdit'], admin: 'passe' },
  /* une RÉUNION : R est bâtie sur S (répondre ne demande pas d'adresse confirmée — le non confirmé n'est simplement pas invité : 404), H sur V (le non confirmé reçoit 403 avant tout) ; un non-invité reçoit 404,
     identique à une réunion inexistante ; l'invité qui n'est pas l'hôte reçoit 403 sur H */
  R:  { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [404, 'introuvable'], nonmembre: [404, 'introuvable'], membre: 'passe', admin: 'passe' },
  H:  { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [403, 'adresse_non_confirmee'], nonmembre: [404, 'introuvable'], membre: [403, 'interdit'], admin: 'passe' },
  /* un APPEL : bâti sur S (un non confirmé n'est simplement pas participant : 404, comme un appel qui n'existe pas) ; les deux participants passent la garde, le geste dit ensuite lequel a le droit */
  AP: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [404, 'introuvable'], nonmembre: [404, 'introuvable'], membre: 'passe', admin: 'passe' },
  /* une SALLE : bâtie sur S comme AP. SP (participant) : un non-participant — non confirmé compris — reçoit le 404 d'une salle qui n'existe pas ; SH (hôte ou co-hôte PRÉSENT) et SO (l'hôte seul) : le participant,
     qui connaît déjà la salle, reçoit 403. SJ (qui veut ENTRER) : la garde ne juge que la forme de l'identifiant, c'est la transaction qui juge le droit — pas invité, pas membre : le MÊME 404. */
  SP: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [404, 'introuvable'], nonmembre: [404, 'introuvable'], membre: 'passe', admin: 'passe' },
  SH: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [404, 'introuvable'], nonmembre: [404, 'introuvable'], membre: [403, 'interdit'], admin: 'passe' },
  SO: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [404, 'introuvable'], nonmembre: [404, 'introuvable'], membre: [403, 'interdit'], admin: 'passe' },
  SJ: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [404, 'introuvable'], nonmembre: [404, 'introuvable'], membre: 'passe', admin: 'passe' },
};

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url, config: { formule: { toutOuvert: false } } });   // ⛔ le drapeau de la bêta ÉTEINT : la formule décide pour de vrai (les routes `pro` refusent qui n'est pas abonné)
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  const lire = T.lireBase;
  const instantane = () => {
    const d = lire(path.join(svc.data, 'msg.db'));
    try { return ['personne', 'conversation', 'membre', 'message', 'reaction', 'msg_masque', 'lien', 'notification', 'contact', 'journal', 'piece', 'push', 'espace', 'espace_membre', 'canal', 'abonnement', 'reunion', 'reunion_invite', 'rappel', 'appel', 'appel_part'].map(t => d.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(LENGTH(CAST(rowid AS TEXT))),0) AS s FROM ' + t).get().n).join(',') + '|' + d.prepare('SELECT COALESCE(SUM(lu_seq),0) AS a, COALESCE(SUM(role=\'admin\'),0) AS b, COALESCE(SUM(epingle),0) AS c FROM membre').get().a; } finally { d.close(); }
  };
  try {
    console.log('Le manifeste et la matrice disent la MÊME chose');
    {
      const ids = MANIFESTE.map(r => r.id);
      v('⛔ aucune route du manifeste n\'est absente de la matrice', ids.filter(i => !MATRICE[i]), []);
      v('⛔ aucune ligne de matrice ne vise une route qui n\'existe plus', Object.keys(MATRICE).filter(i => !ids.includes(i)), []);
      v('les identifiants du manifeste sont uniques, et chaque (méthode, chemin) aussi', [new Set(ids).size === ids.length, new Set(MANIFESTE.map(r => r.m + ' ' + r.p)).size === ids.length], [true, true]);
      v('toutes les gardes du manifeste sont connues de la table des attentes', MANIFESTE.filter(r => !ATTENDU[r.garde]).map(r => r.id), []);
      vrai('population : au moins 30 routes à jouer', MANIFESTE.length >= 30);
      v('les treize routes des réunions sont au manifeste, avec leurs gardes (liste S, programmer V + Pro, fiche R, six gestes d\'hôte H, quitter R, réponse R, rappels R, fichier R, courriel H)', ['reunions.liste', 'reunions.creer', 'reunions.lire', 'reunions.modifier', 'reunions.annuler', 'reunions.supprimer', 'reunions.inviter', 'reunions.retirer', 'reunions.quitter', 'reunions.reponse', 'reunions.rappels', 'reunions.ics', 'reunions.courriel'].map(i => { const x = MANIFESTE.find(y => y.id === i) || {}; return x.garde + (x.pro ? '+pro' : ''); }), ['S', 'V+pro', 'R', 'H', 'H', 'H', 'H', 'H', 'R', 'R', 'R', 'R', 'H']);
      v('les six routes des appels à deux sont au manifeste, avec leurs gardes (relais S, historique S, lancer V, répondre AP, raccrocher AP, signal AP), et AUCUNE n\'est Pro — les appels à deux sont gratuits en Perso', ['ice', 'appels.liste', 'appels.creer', 'appels.repondre', 'appels.quitter', 'appels.signal'].map(i => { const x = MANIFESTE.find(y => y.id === i) || {}; return x.garde + (x.pro ? '+pro' : ''); }), ['S', 'S', 'V', 'AP', 'AP', 'AP']);
      v('les vingt et une routes de l\'étape 8 sont au manifeste, avec leurs gardes (rejoindre SJ, lire SP, huit gestes d\'hôte SH, cohote et terminer SO, quatre gestes de participant SP, aperçu P, entrer par le lien S, entrer par l\'identifiant R, lien H, renouveler H), et AUCUNE n\'est Pro — entrer est toujours gratuit',
        ['appels.rejoindre', 'salles.lire', 'salles.admettre', 'salles.refuser', 'salles.exclure', 'salles.verrouiller', 'salles.salle_attente', 'salles.couper_micro', 'salles.partage', 'salles.rec', 'salles.cohote', 'salles.terminer', 'salles.main', 'salles.reaction', 'salles.etat', 'salles.evt', 'reunions.apercu', 'reunions.rejoindre_code', 'reunions.rejoindre', 'reunions.lien', 'reunions.lien_renouveler'].map(i => { const x = MANIFESTE.find(y => y.id === i) || {}; return x.garde + (x.pro ? '+pro' : ''); }),
        ['SJ', 'SP', 'SH', 'SH', 'SH', 'SH', 'SH', 'SH', 'SH', 'SH', 'SO', 'SO', 'SP', 'SP', 'SP', 'SP', 'P', 'S', 'R', 'H', 'H']);
      v('les quatre routes des pièces sont au manifeste, avec leurs gardes (déposer V, lire J, avatar S, stockage S)', ['pieces.deposer', 'pieces.lire', 'moi.avatar', 'moi.stockage'].map(i => (MANIFESTE.find(x => x.id === i) || {}).garde), ['V', 'J', 'S', 'S']);
      v('les six routes des notifications et du compte sont au manifeste, TOUTES en garde S (l\'identité vient de la session, jamais du corps)', ['push.abonner', 'push.desabonner', 'push.essai', 'flux.ack', 'compte.export', 'compte.supprimer'].map(i => (MANIFESTE.find(x => x.id === i) || {}).garde), ['S', 'S', 'S', 'S', 'S', 'S']);
      const sources = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'app.js'), 'utf8')) + T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'routes.js'), 'utf8')) + T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'index.js'), 'utf8'));
      v('⛔ aucune route enregistrée EN DEHORS de la boucle de montage du manifeste (app.get/post/put/delete/all/use(\'/api…\' : zéro)', (sources.match(/\bapp\.(get|post|put|patch|delete|all)\(/g) || []).length + (sources.match(/\bapp\.use\(\s*['"`]\/(?!api['"`])/g) || []).length, 0);
      vrai('et le montage lit bien le manifeste (une seule boucle, `app[r.m.toLowerCase()]`)', (sources.match(/app\[r\.m\.toLowerCase\(\)\]\(/g) || []).length === 1);
      const c = T.client(svc.base);
      for (const [m, p] of [['GET', '/api/inconnue'], ['POST', '/api/inconnue'], ['GET', '/api/conversations/x/inconnue'], ['POST', '/api/moi'], ['GET', '/api/beta/entrer'], ['GET', '/api/conversations/' + 'c_' + '0'.repeat(32) + '/maj']]) {
        const r = await c.appel(m, p, m === 'POST' ? {} : undefined);
        v('méthode ou chemin hors manifeste : ' + m + ' ' + p + ' → 404 (pas 405, pas 200)', r.code, 404);
      }
    }

    // ── Les personnes (fixtures écrites par le module de stockage) ─────────────────────────
    const nouvellePers = (nom, confirme) => S.personneCreer({ identifiant: 'beta:' + nom + crypto.randomBytes(3).toString('hex'), prenom: nom, nom: 'Matrice', origine: confirme ? 'beta' : 'compte', verifie: confirme });
    const A = nouvellePers('Ana', true), B = nouvellePers('Ben', true), C = nouvellePers('Cleo', true), N = nouvellePers('Nina', false), Z = nouvellePers('Zed', true), D = nouvellePers('Dan', true);
    const raw = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));   // une connexion qui ÉCRIT dans la base du service (WAL) : pour reculer des dates que le module date de « maintenant »
    let abo = 0;
    for (const p of [B, C]) S.contactLier(A.id, p.id);
    let K = {};
    vrai('population : une personne NON CONFIRMÉE existe (la porte bêta n\'en fabrique jamais)', N.verifie === false && A.verifie === true);

    const acteurs = { nonconfirme: N, nonmembre: C, membre: B, admin: A };
    const session = (p) => { const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 86400000 }); return j; };
    /* Pendant une route d'APPEL, Ana et Ben parlent depuis les appareils LIÉS à l'appel (`liees`) : un appel n'obéit qu'à l'appareil qui l'a lancé ou pris. */
    let liees = null;
    const clientDe = (profil) => {
      const c = T.client(svc.base);
      if (profil === 'invalide') c.poserCookie(jeton());
      else if (liees && (profil === 'membre' || profil === 'admin')) c.poserCookie(profil === 'admin' ? liees.A : liees.B);
      else if (acteurs[profil]) c.poserCookie(session(acteurs[profil]));
      return c;
    };
    /* Une ligne libre pour chacun, puis un appel d'Ana à Ben depuis deux appareils connus : 'sonne' (Ben n'a pas répondu) ou 'en_cours' (il a répondu). */
    const libre = (u) => { const id = S.appelActifDe(u); if (id) S.appelFinir({ id, motif: 'banc' }); };
    /* Une SALLE d'Ana : un appel de groupe (vidéo, quatre places) où Ben est invité — et PRÉSENT, sauf demande contraire —, Dan aussi invité ; `attend` : Dan est à la porte (la salle d'attente est allumée). Ana et Ben parlent
       depuis les appareils liés à la salle (`liees`), comme pour un appel à deux. */
    const sallePrepare = ({ benPresent = true, attend = false } = {}) => {
      for (const p of [A, B, C, D, N]) libre(p.id);
      const jA = session(A), jB = session(B), jD = session(D);
      const cree = S.appelCreerGroupe({ appelant: A.id, invites: [B.id, D.id], type: 'video', session: sha(jA), sonnerieMs: 45000, capacite: 4, conv: null });
      if (benPresent) S.appelRepondre({ id: cree.id, uid: B.id, session: sha(jB), accepte: true });
      if (attend) { S.salleAttente(cree.id, A.id, true); S.appelRejoindre({ id: cree.id, uid: D.id, session: sha(jD) }); }
      liees = { A: jA, B: jB };
      return cree.id;
    };
    const appelPrepare = (etat) => {
      for (const p of [A, B, C, D, N]) libre(p.id);
      const jA = session(A), jB = session(B);
      const cree = S.appelCreer({ appelant: A.id, appele: B.id, type: 'audio', session: sha(jA), sonnerieMs: 45000 });
      if (etat === 'en_cours') S.appelRepondre({ id: cree.id, uid: B.id, session: sha(jB), accepte: true });
      liees = { A: jA, B: jB };
      return cree.id;
    };
    let cellules = 0, refusSansEffet = 0, refusAvecEffet = [], espacesVerifies = 0, reunionsVerifiees = 0, appelsVerifies = 0, sallesVerifiees = 0, cellulesPro = 0, cellulesHier = 0;

    console.log('\nCHAQUE route contre CHAQUE profil');
    for (const r of MANIFESTE) {
      const M = MATRICE[r.id];
      /* La fixture de CETTE route : un groupe neuf (Ana admin, Ben membre, Cleo dehors), un message de chacun,
         un lien d'invitation de Zed, un contact bloquable par acteur. */
      /* Un contact NEUF par acteur et par route : la route précédente a pu retirer ou bloquer le sien. */
      K = { [A.id]: nouvellePers('K1', true), [B.id]: nouvellePers('K2', true), [C.id]: nouvellePers('K3', true) };
      for (const [u, k] of Object.entries(K)) S.contactLier(u, k.id);
      const G = S.convCreerGroupe({ createur: A.id, nom: 'Matrice ' + r.id, membres: [B.id], annonces_seules: false, ephemere_s: 0 }).id;
      const mA = S.messageEnvoyer({ conv: G, auteur: A.id, cid: 'cid-fx-ana-0001', texte: 'de Ana' }), mB = S.messageEnvoyer({ conv: G, auteur: B.id, cid: 'cid-fx-ben-0001', texte: 'de Ben' });
      const code = crypto.randomBytes(16).toString('base64url');
      S.lienCreer({ h: sha(code), genre: 'contact', cible: null, par: Z.id, ttlMs: 3600000, max: 50 });
      /* l'ESPACE de cette route : payé (Stripe a dit « active », 50 places), Ana propriétaire, Ben et Dan membres (par de vraies invitations), un canal public (Ana, Ben, Dan) et un canal
         privé (Ana, Ben), un code d'invitation d'Ana. Ana en possède trois au plus : les fixtures des routes d'avant partent. */
      for (const e of S.espacesDe(A.id)) S.espaceSupprimer(e.id);
      const E = S.espaceCreer({ nom: 'Entreprise ' + r.id, proprio: A.id }).id;
      const inv = (par) => { const c = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(c), genre: 'espace', cible: E, par, ttlMs: 3600000, max: 50 }); return c; };
      for (const u of [B, D]) S.invitationAccepter({ h: sha(inv(A.id)), uid: u.id, max: Infinity });
      const CP = S.canalCreer({ espace: E, par: A.id, nom: 'général', prive: false }).id, CV = S.canalCreer({ espace: E, par: A.id, nom: 'direction', prive: true, membres: [B.id] }).id;
      abo++; S.abonnementPoser(E, { client: 'cus_banc905', abonnement: 'sub_b905_' + abo, statut: 'active', places: 50, fin_periode: Date.now() + 86400000 * 20, annule: false, impaye: false }, { adopter: true });
      /* la RÉUNION de cette route (celles des routes d'avant partent : un hôte en tient 300 au plus) : Ana l'héberge, Ben et Dan sont invités */
      let R = null, codeR = null;
      if (r.id.startsWith('reunions.')) {
        const entre = r.id === 'reunions.rejoindre' || r.id === 'reunions.rejoindre_code';          // celles qui ENTRENT jouent une réunion dont la fenêtre est ouverte (dans deux minutes)
        const debutR = Date.now() + (entre ? 2 * 60000 : 3 * 86400000);
        R = S.reunionCreer({ hote: A.id, titre: 'Réunion ' + r.id, lieu: '', debut: debutR, fin: debutR + 3600000, tz: 'Europe/Paris', rep: 'aucune', rappels: [15], invites: [B.id, D.id], prochain: debutR }).id;
        codeR = S.reunionLien({ id: R, par: A.id }).code;
      }
      const F = { A: A.id, B: B.id, C: C.id, D: D.id, G, E, CP, CV, R, codeR, codeE: inv(A.id), code, seqDe: (a) => a === A.id ? mA.seq : mB.seq, cibleDe: (a) => K[a] ? K[a].id : A.id, png: PNG };
      /* la fixture des APPELS : les lignes sont libérées (la route précédente a pu laisser un appel qui sonne), et une route AP a son appel — qui sonne pour `repondre`, qui court pour les autres */
      liees = null;
      for (const p of [A, B, C, D, N]) libre(p.id);
      if (r.garde === 'AP') F.AP = appelPrepare(r.id === 'appels.repondre' ? 'sonne' : 'en_cours');
      if (['SP', 'SH', 'SO', 'SJ'].includes(r.garde)) F.SA = sallePrepare({ benPresent: r.garde !== 'SJ', attend: r.id === 'salles.admettre' || r.id === 'salles.refuser' });
      /* la fixture des pièces : une photo déposée PAR LA ROUTE (le fichier est réellement rangé et scellé), attachée à un message du groupe par le module de stockage */
      if (r.garde === 'J') {
        const dep = await F_PIECES.deposer(clientDe('admin'), { conv: G, genre: 'photo', corps: PNG });
        if (dep.code !== 201) throw new Error('fixture de pièce refusée : ' + dep.code);
        S.messageEnvoyer({ conv: G, auteur: A.id, cid: 'cid-fx-piece-01', type: 'photo', pieces: [{ id: dep.j.id, w: 8, h: 8 }] });
        F.P = dep.j.id;
      }
      /* ⛔ une pièce qu'on n'a pas le droit de lire répond EXACTEMENT comme une pièce qui n'existe pas */
      if (r.garde === 'J') {
        const c = clientDe('nonmembre');
        const a = await c.appel('GET', '/api/pieces/' + F.P), b = await c.appel('GET', '/api/pieces/f_' + '0'.repeat(32));
        v('⛔ ' + r.id + ' : la réponse faite à qui n\'a PAS LE DROIT de lire une pièce qui existe est identique à celle d\'une pièce INEXISTANTE (même code, même corps)', [a.code, a.txt], [b.code, b.txt]);
      }
      // 404 et non 403 : un non-membre d'une conversation qui existe n'apprend RIEN de plus qu'avec une qui n'existe pas.
      // ⚠️ AVANT la boucle des profils : la cellule « admin » de `conv.membres.ajouter` fait de Cleo un membre.
      if (r.garde === 'M' || r.garde === 'A') {
        const c = clientDe('nonmembre');
        const reel = M.ok(F, C.id), faux = M.ok(Object.assign({}, F, { G: 'c_' + '0'.repeat(32) }), C.id);
        const a = await c.appel(reel[0], reel[1], reel[2]), b = await c.appel(faux[0], faux[1], faux[2]);
        v('⛔ ' + r.id + ' : la réponse faite à un NON-MEMBRE d\'une conversation qui existe est identique à celle d\'une conversation INEXISTANTE (même code, même corps)', [a.code, a.txt], [b.code, b.txt]);
      }
      /* ⛔ UN NON-MEMBRE NE VOIT RIEN D'UN ESPACE : la réponse faite à qui n'en est pas membre est identique, octet pour octet, à celle d'un espace qui n'existe pas */
      if (['E', 'EA', 'EP'].includes(r.garde)) {
        const c = clientDe('nonmembre');
        const reel = M.ok(F, C.id), faux = M.ok(Object.assign({}, F, { E: 'e_' + '0'.repeat(32) }), C.id);
        const a = await c.appel(reel[0], reel[1], reel[2]), b = await c.appel(faux[0], faux[1], faux[2]);
        v('⛔ ' + r.id + ' : la réponse faite à un NON-MEMBRE d\'un espace qui existe est identique à celle d\'un espace INEXISTANT (même code, même corps)', [a.code, a.txt], [b.code, b.txt]);
        espacesVerifies++;
      }
      /* ⛔ UN NON-INVITÉ NE VOIT RIEN D'UNE RÉUNION : la réponse faite à qui n'y est pas invité est identique, octet pour octet, à celle d'une réunion qui n'existe pas */
      if (['R', 'H'].includes(r.garde)) {
        const c = clientDe('nonmembre');
        const reel = M.ok(F, C.id), faux = M.ok(Object.assign({}, F, { R: 'r_' + '0'.repeat(32) }), C.id);
        const a = await c.appel(reel[0], reel[1], reel[2]), b = await c.appel(faux[0], faux[1], faux[2]);
        v('⛔ ' + r.id + ' : la réponse faite à un NON-INVITÉ d\'une réunion qui existe est identique à celle d\'une réunion INEXISTANTE (même code, même corps)', [a.code, a.txt], [b.code, b.txt]);
        reunionsVerifiees++;
      }
      /* ⛔ UN NON-PARTICIPANT NE VOIT RIEN D'UN APPEL : la réponse faite à qui n'y est pas est identique, octet pour octet, à celle d'un appel qui n'existe pas */
      if (r.garde === 'AP') {
        const c = clientDe('nonmembre');
        const reel = M.ok(F, C.id), faux = M.ok(Object.assign({}, F, { AP: 'a_' + '0'.repeat(32) }), C.id);
        const a = await c.appel(reel[0], reel[1], reel[2]), b = await c.appel(faux[0], faux[1], faux[2]);
        v('⛔ ' + r.id + ' : la réponse faite à un NON-PARTICIPANT d\'un appel qui existe est identique à celle d\'un appel INEXISTANT (même code, même corps)', [a.code, a.txt], [b.code, b.txt]);
        appelsVerifies++;
      }
      /* ⛔ UN NON-PARTICIPANT NE VOIT RIEN D'UNE SALLE : la réponse faite à qui n'y est pas (ou à qui n'y a pas droit) est identique, octet pour octet, à celle d'une salle qui n'existe pas */
      if (['SP', 'SH', 'SO', 'SJ'].includes(r.garde)) {
        const c = clientDe('nonmembre');
        const reel = M.ok(F, C.id), faux = M.ok(Object.assign({}, F, { SA: 'a_' + '0'.repeat(32) }), C.id);
        const a = await c.appel(reel[0], reel[1], reel[2]), b = await c.appel(faux[0], faux[1], faux[2]);
        v('⛔ ' + r.id + ' : la réponse faite à un NON-PARTICIPANT d\'une salle qui existe est identique à celle d\'une salle INEXISTANTE (même code, même corps)', [a.code, a.txt], [b.code, b.txt]);
        sallesVerifiees++;
      }
      for (const profil of PROFILS) {
        const acteur = acteurs[profil];
        const attendu = (M.attendu && M.attendu[profil]) || ATTENDU[r.garde][profil];
        const c = clientDe(profil);
        const ok = M.ok(F, acteur && acteur.id);
        if (M.prep && attendu === 'passe' && acteur) M.prep(F, S, acteur.id);
        const avant = instantane();
        let code_, err_;
        if (ok[0] === 'FLUX') {
          const f = await T.flux(c);
          code_ = f.statut; err_ = f.corps && f.corps.error; f.fermer();
        } else if (ok[0] === 'BIN') {
          const rep = await F_PIECES.deposer(c, ok[1]);
          code_ = rep.code; err_ = rep.j && rep.j.error;
        } else {
          const rep = await c.appel(ok[0], ok[1], ok[2]);
          code_ = rep.code; err_ = rep.j && rep.j.error;
        }
        cellules++;
        /* ⛔ une route dont deux profils qui PASSENT la garde n'ont pas la même issue (l'invité sort, l'hôte est refusé) dit laquelle, pour chacun : `codes` seul laisserait passer l'inverse */
        if (M.exactes && M.exactes[profil]) v(r.id + ' [' + r.garde + '] × ' + profil + ' → EXACTEMENT ' + M.exactes[profil][0] + (M.exactes[profil][1] ? ' ' + M.exactes[profil][1] : ''), [code_, err_ || null], M.exactes[profil]);
        if (attendu === 'passe') {
          /* un échec dit CE QUI a répondu (code et erreur) : « faux » seul ne dit pas si la garde a refusé ou si le geste a dit non */
          v(r.id + ' [' + r.garde + '] × ' + profil + ' → passe la garde et réussit (' + M.codes.join('/') + ')', M.codes.includes(code_) ? 'oui' : [code_, err_], 'oui');
        } else {
          v(r.id + ' [' + r.garde + '] × ' + profil + ' → ' + attendu[0] + ' ' + attendu[1], [code_, err_], attendu);
          const apres = instantane();
          if (apres === avant) refusSansEffet++; else refusAvecEffet.push(r.id + '×' + profil);
        }
      }
      /* ⛔ LES ROUTES PRO ont deux cellules de plus : l'abonnement en retard DEPUIS TROIS JOURS (dans le sursis : tout passe encore), puis depuis HUIT (hors sursis : 402 `formule_requise`,
         l'administrateur y lit pourquoi, un membre non, et RIEN n'est écrit par le refus). Les dates se reculent dans la base : le module date l'impayé de « maintenant ». */
      if (M.pro) {
        const retard = (jours) => { const d = raw(); try { d.prepare(`UPDATE abonnement SET statut = 'past_due', impaye_depuis = ?, relu_le = ? WHERE espace = ?`).run(Date.now() - jours * 86400000, Date.now(), E); } finally { d.close(); } };
        const jouer = async (profil) => { const c = clientDe(profil), ok = M.ok(F, acteurs[profil].id); const rep = await c.appel(ok[0], ok[1], ok[2]); return { code: rep.code, err: rep.j && rep.j.error, raison: rep.j && rep.j.raison }; };
        retard(3);
        const sursis = await jouer('admin');
        vrai(r.id + ' [pro] × administrateur, impayé depuis 3 jours (dans le sursis) → passe encore (' + M.codes.join('/') + ')', M.codes.includes(sursis.code));
        retard(8);
        const avantPro = instantane();
        const adm = await jouer('admin'), mem = await jouer('membre');
        v('⛔ ' + r.id + ' [pro] × administrateur, impayé depuis 8 jours (hors sursis) → 402 formule_requise, et il lit POURQUOI', [adm.code, adm.err, adm.raison !== undefined ? adm.raison : null], r.garde === 'V' ? [402, 'formule_requise', null] : [402, 'formule_requise', 'impaye']);
        v('⛔ ' + r.id + ' [pro] × membre, impayé depuis 8 jours → ' + (r.garde === 'V' ? '402 sans raison' : '403 (il n\'est pas administrateur : la garde passe avant la formule)'), [mem.code, mem.err, mem.raison === undefined ? 'sans raison' : mem.raison], r.garde === 'V' ? [402, 'formule_requise', 'sans raison'] : [403, 'interdit', 'sans raison']);
        v('⛔ ' + r.id + ' [pro] : les deux refus n\'ont rien écrit', instantane(), avantPro);
        cellulesPro += 3;
      }
      /* ⛔ LA HIÉRARCHIE : un administrateur qui n'est pas propriétaire ne touche ni au propriétaire ni à un autre administrateur ; le propriétaire, si */
      if (M.hier) {
        M.hier.prep(F, S);
        const ben = clientDe('membre'), ana = clientDe('admin'), ok1 = M.ok(F, B.id);
        for (const [quoi, corps, attendu] of M.hier.refus(F)) {
          const avantH = instantane();
          const rep = await ben.appel(ok1[0], ok1[1], corps);
          v('⛔ ' + r.id + ' [hiérarchie] × administrateur qui n\'est PAS propriétaire, ' + quoi + ' → ' + attendu[0] + ' ' + attendu[1] + ', et le refus n\'écrit rien', [rep.code, rep.j && rep.j.error, instantane() === avantH], attendu.concat([true]));
          cellulesHier++;
        }
        const permis = await ana.appel(ok1[0], ok1[1], M.hier.permis(F));
        v('⛔ ' + r.id + ' [hiérarchie] × le PROPRIÉTAIRE retire un administrateur → 200 (contre-épreuve : la règle protège les administrateurs, elle ne ferme pas la route)', permis.code, 200);
        cellulesHier++;
      }
    }
    v('⛔ ' + cellules + ' cellules jouées = routes × profils (aucune sautée en silence)', cellules, MANIFESTE.length * PROFILS.length);
    vrai('population : la hiérarchie des administrateurs a joué ses cellules (' + cellulesHier + ' : deux refus et un geste permis)', cellulesHier === 3);
    vrai('population : les routes Pro ont chacune leurs trois cellules de formule (' + cellulesPro + ')', cellulesPro >= 9 && cellulesPro % 3 === 0 && cellulesPro / 3 === Object.values(MATRICE).filter(m => m.pro).length);
    vrai('population : le 404 « espace inexistant » a été comparé pour toutes les routes d\'espace (' + espacesVerifies + ')', espacesVerifies >= 18);
    vrai('population : le 404 « réunion inexistante » a été comparé pour toutes les routes de réunion à garde R ou H (' + reunionsVerifiees + ')', reunionsVerifiees === MANIFESTE.filter(r => ['R', 'H'].includes(r.garde)).length && reunionsVerifiees >= 8);
    vrai('population : le 404 « appel inexistant » a été comparé pour les trois routes à garde AP (' + appelsVerifies + ')', appelsVerifies === MANIFESTE.filter(r => r.garde === 'AP').length && appelsVerifies === 3);
    vrai('population : le 404 « salle inexistante » a été comparé pour les seize routes à garde SP, SH, SO ou SJ (' + sallesVerifiees + ')', sallesVerifiees === MANIFESTE.filter(r => ['SP', 'SH', 'SO', 'SJ'].includes(r.garde)).length && sallesVerifiees === 16);
    vrai('population : des refus ont bien été relevés avant/après (' + refusSansEffet + ')', refusSansEffet >= 60);
    v('⛔ AUCUN refus n\'a écrit quoi que ce soit (instantané de la base identique avant/après)', refusAvecEffet, []);

    console.log('\nLes appels : ce que la garde ne voit pas — l\'appareil LIÉ, l\'appel déjà pris, l\'appel déjà fini');
    {
      let extra = 0;
      const depuis = async (jetonH, id, geste, corps) => { const c = T.client(svc.base); c.poserCookie(jetonH); return c.post('/api/appels/' + id + '/' + geste, corps); };
      const dit = (rep) => [rep.code, rep.j && rep.j.error];
      libre(A.id); libre(B.id);
      /* un appel qui COURT : un AUTRE appareil de chacun (session valide, personne participante, mais pas l'appareil de l'appel) ne signale ni ne raccroche — et le refus n'écrit rien */
      {
        const id = appelPrepare('en_cours'), autreA = session(A), autreB = session(B);
        const avant = instantane();
        for (const [quoi, geste, corps, jt] of [
          ['signaler depuis un autre appareil d\'Ana', 'signal', { a: B.id, type: 'etat', donnees: { camera: true } }, autreA],
          ['signaler depuis un autre appareil de Ben', 'signal', { a: A.id, type: 'etat', donnees: { camera: true } }, autreB],
          ['raccrocher depuis un autre appareil d\'Ana', 'quitter', {}, autreA],
          ['raccrocher depuis un autre appareil de Ben', 'quitter', {}, autreB],
        ]) {
          v('⛔ appel en cours : ' + quoi + ' → 403 appareil_non_lie', dit(await depuis(jt, id, geste, corps)), [403, 'appareil_non_lie']);
          extra++;
        }
        v('⛔ ces quatre refus n\'ont rien écrit', instantane(), avant);
        v('⛔ un second appareil de Ben ne PREND pas un appel déjà pris → 409 appel_pris', dit(await depuis(session(B), id, 'repondre', { accepte: true })), [409, 'appel_pris']);
        extra++;
        v('contre-épreuve : l\'appareil LIÉ de Ben signale (200), puis l\'appareil lié d\'Ana raccroche (200) — la règle protège l\'appel, elle ne ferme pas les routes', [dit(await depuis(liees.B, id, 'signal', { a: A.id, type: 'etat', donnees: { camera: true } })), dit(await depuis(liees.A, id, 'quitter', {}))], [[200, undefined], [200, undefined]]);
        extra++;
      }
      /* un appel qui SONNE : l'appelante annule depuis son appareil lié (ok) mais pas depuis un autre ; elle ne signale rien d'autre qu'un pouls tant que Ben n'a pas répondu */
      {
        const id = appelPrepare('sonne'), autreA = session(A);
        v('⛔ appel qui sonne : annuler depuis un autre appareil d\'Ana → 403 appareil_non_lie', dit(await depuis(autreA, id, 'quitter', {})), [403, 'appareil_non_lie']);
        v('⛔ appel qui sonne : une offre avant que Ben ait répondu → 409 appel_pas_en_cours', dit(await depuis(liees.A, id, 'signal', { a: B.id, type: 'offre', donnees: { sdp: 'v=0' } })), [409, 'appel_pas_en_cours']);
        v('un pouls de l\'appareil lié passe pendant la sonnerie (il prouve que l\'appareil est là)', dit(await depuis(liees.A, id, 'signal', { a: B.id, type: 'pouls' })), [200, undefined]);
        extra += 3;
      }
      /* un appel FINI : on ne signale plus (409), on ne répond plus (409), raccrocher est un geste sans effet qui répond 200 `deja` (la page raccroche après que l'autre l'a fait) */
      {
        const id = appelPrepare('en_cours'); S.appelFinir({ id, motif: 'banc' });
        const avant = instantane();
        v('⛔ appel fini : signaler → 409 appel_fini', dit(await depuis(liees.A, id, 'signal', { a: B.id, type: 'etat', donnees: { camera: true } })), [409, 'appel_fini']);
        v('⛔ appel fini : répondre → 409 appel_fini', dit(await depuis(liees.B, id, 'repondre', { accepte: true })), [409, 'appel_fini']);
        const q = await depuis(liees.A, id, 'quitter', {});
        v('appel fini : raccrocher → 200 deja, sans rien écrire', [q.code, q.j && q.j.deja === true, instantane() === avant], [200, true, true]);
        extra += 3;
      }
      liees = null;
      vrai('population : les douze cellules d\'appel que la garde ne voit pas ont été jouées (' + extra + ')', extra === 12);
    }

    console.log('\nLes salles : ce que la garde ne voit pas — l\'exclu qui revient, la salle verrouillée, le co-hôte qui vise l\'hôte, le Perso qui lance un groupe');
    {
      let extra = 0;
      const dit = (rep) => [rep.code, rep.j && rep.j.error];
      const depuis = async (jetonH, chemin, corps) => { const c = T.client(svc.base); c.poserCookie(jetonH); return corps === undefined ? c.get(chemin) : c.post(chemin, corps); };
      /* — l'EXCLU : il ne revient pas (403 `exclu`), ne lit plus la salle (404), ne signale à personne (404), et ses refus n'écrivent rien — */
      {
        const id = sallePrepare({ benPresent: true });
        const jD = session(D);
        const ex = await depuis(liees.A, '/api/salles/' + id + '/exclure', { uid: D.id });
        v('Ana exclut Dan, invité qui n\'est pas venu : 200', [ex.code, ex.j && ex.j.ok], [200, true]);
        const avant = instantane();
        v('⛔ l\'exclu qui REVIENT : 403 `exclu`', dit(await depuis(jD, '/api/appels/' + id + '/rejoindre', {})), [403, 'exclu']);
        v('⛔ … ne lit plus la salle : le MÊME 404 qu\'une salle inconnue', [dit(await depuis(jD, '/api/salles/' + id)), (await depuis(jD, '/api/salles/' + id)).txt === (await depuis(jD, '/api/salles/a_' + '0'.repeat(32))).txt], [[404, 'introuvable'], true]);
        v('⛔ … ne signale à personne', dit(await depuis(jD, '/api/appels/' + id + '/signal', { a: B.id, type: 'etat', donnees: { camera: true } })), [404, 'introuvable']);
        v('⛔ … ne lève pas la main, ne réagit pas', [dit(await depuis(jD, '/api/salles/' + id + '/main', { actif: true })), dit(await depuis(jD, '/api/salles/' + id + '/reaction', { emoji: 'pouce' }))], [[404, 'introuvable'], [404, 'introuvable']]);
        v('⛔ ces refus n\'ont rien écrit', instantane(), avant);
        const bis = await depuis(liees.A, '/api/salles/' + id + '/exclure', { uid: D.id });
        v('contre-épreuve : Ana exclut une SECONDE fois : 200 `deja`', [bis.code, bis.j && bis.j.deja], [200, true]);
        extra += 7;
      }
      /* — la salle VERROUILLÉE : Dan (invité) n'entre pas (423), la salle PLEINE non plus (409), et les refus n'écrivent rien — */
      {
        const id = sallePrepare({ benPresent: true });
        const jD = session(D);
        await depuis(liees.A, '/api/salles/' + id + '/verrouiller', { actif: true });
        const avant = instantane();
        v('⛔ salle verrouillée : l\'invité qui entre reçoit 423 `verrouillee`, et le refus n\'écrit rien', [dit(await depuis(jD, '/api/appels/' + id + '/rejoindre', {})), instantane() === avant], [[423, 'verrouillee'], true]);
        await depuis(liees.A, '/api/salles/' + id + '/verrouiller', { actif: false });
        v('contre-épreuve : déverrouillée, Dan entre (200) — le verrou ne ferme pas la route', dit(await depuis(jD, '/api/appels/' + id + '/rejoindre', {})), [200, undefined]);
        extra += 2;
      }
      /* — le CO-HÔTE : il gère la salle (exclure Dan : 200), mais ne vise ni l'hôte ni un autre co-hôte (403), et ne nomme pas de co-hôte (SO) — */
      {
        const id = sallePrepare({ benPresent: true });
        const jD = session(D);
        v('Ana nomme Ben co-hôte : 200', dit(await depuis(liees.A, '/api/salles/' + id + '/cohote', { uid: B.id, actif: true })), [200, undefined]);
        const avant = instantane();
        v('⛔ Ben (co-hôte) ne peut pas exclure l\'HÔTE : 403 `interdit`, et rien n\'est écrit', [dit(await depuis(liees.B, '/api/salles/' + id + '/exclure', { uid: A.id })), instantane() === avant], [[403, 'interdit'], true]);
        v('⛔ Ben (co-hôte) ne nomme pas de co-hôte (hôte seul, SO) : 403 `interdit`', dit(await depuis(liees.B, '/api/salles/' + id + '/cohote', { uid: D.id, actif: true })), [403, 'interdit']);
        v('⛔ Ben (co-hôte) ne termine pas la salle (hôte seul, SO) : 403 `interdit`', dit(await depuis(liees.B, '/api/salles/' + id + '/terminer', {})), [403, 'interdit']);
        v('contre-épreuve : Ben (co-hôte) exclut Dan : 200 — la hiérarchie protège l\'hôte, elle ne ferme pas la route', dit(await depuis(liees.B, '/api/salles/' + id + '/exclure', { uid: D.id })), [200, undefined]);
        extra += 5;
        void jD;
      }
      /* — le PERSO qui lance un groupe : fonction Pro (402), jugée sur celui qui lance ; le Pro, lui, lance (201). Deux contacts à appeler, un seul appel serait un appel à DEUX (gratuit). — */
      {
        for (const p of [A, B, C, D, N]) libre(p.id);
        const c2 = nouvellePers('K4', true); S.contactLier(C.id, c2.id); S.contactLier(C.id, A.id);
        const avant = instantane();
        const perso = await clientDe('nonmembre').post('/api/appels', { uids: [A.id, c2.id], type: 'audio' });
        v('⛔ un compte PERSO (Cleo, dans aucun espace payé) qui lance un appel à PLUSIEURS : 402 `formule_requise`, rien d\'écrit', [dit(perso), instantane() === avant], [[402, 'formule_requise'], true]);
        const deux = await clientDe('nonmembre').post('/api/appels', { uids: [c2.id], type: 'audio' });
        v('   … et un appel à DEUX reste gratuit (201) : seule la salle est Pro', [deux.code, deux.j && deux.j.appel && deux.j.appel.genre], [201, 'deux']);
        libre(C.id);
        const pro = await clientDe('admin').post('/api/appels', { uids: [B.id, D.id], type: 'audio' });
        v('contre-épreuve : Ana (propriétaire d\'un espace payé) lance le même appel à plusieurs : 201, genre « groupe »', [pro.code, pro.j && pro.j.appel && pro.j.appel.genre], [201, 'groupe']);
        libre(A.id);
        extra += 3;
      }
      liees = null;
      vrai('population : les dix-sept cellules de salle que la garde ne voit pas ont été jouées (' + extra + ')', extra === 17);
    }

    console.log('\nUn identifiant mal formé est un 404, jamais une erreur de format qui distinguerait les cas');
    {
      const c = clientDe('admin');
      for (const id of ['x', 'c_', 'c_zzzz', 'C_' + '0'.repeat(32), 'c_' + '0'.repeat(31), 'c_' + '0'.repeat(33), '..', '%00', 'c_' + '0'.repeat(32) + '%20']) {
        const a = await c.get('/api/conversations/' + id), b = await c.get('/api/conversations/' + id + '/messages');
        v('« ' + id + ' » → 404 introuvable (lecture et messages)', [a.code, a.j && a.j.error, b.code], [404, 'introuvable', 404]);
      }
      v('une fiche personne mal formée : 404', (await c.get('/api/personnes/x')).code, 404);
      for (const id of ['x', 'r_', 'r_zzzz', 'R_' + '0'.repeat(32), 'r_' + '0'.repeat(31), 'r_' + '0'.repeat(33), 'c_' + '0'.repeat(32), '..', '%00']) {
        const a = await c.get('/api/reunions/' + id), b = await c.get('/api/reunions/' + id + '/ics');
        v('réunion « ' + id + ' » → 404 introuvable (fiche et fichier)', [a.code, a.j && a.j.error, b.code], [404, 'introuvable', 404]);
      }
    }

    console.log('\nL\'autorité ne vient pas du corps : un auteur, un uid ou un rôle envoyés sont ignorés');
    {
      const F = {}; const G = S.convCreerGroupe({ createur: A.id, nom: 'Usurpation', membres: [B.id], annonces_seules: false, ephemere_s: 0 }).id;
      const cB = clientDe('membre');
      const r = await cB.post('/api/conversations/' + G + '/messages', { cid: 'cid-usurp-0001', texte: 'je me fais passer pour Ana', auteur: A.id, uid: A.id, role: 'admin', conv: 'c_' + '1'.repeat(32) });
      const lu = (await cB.get('/api/conversations/' + G + '/messages')).j.messages.find(m => m.seq === r.j.seq);
      v('⛔ l\'auteur du message est la SESSION (Ben), pas le champ `auteur`', lu.auteur, B.id);
      const p = await cB.post('/api/conversations/' + G + '/maj', { nom: 'Pirate', role: 'admin' });
      v('⛔ un membre non administrateur qui ajoute `role:"admin"` à sa demande reste refusé (403)', p.code, 403);
      const q = await cB.post('/api/moi/maj', { prenom: 'Ben', id: A.id, verifie: false, origine: 'compte', etat: 'suspendu' });
      const moi = (await cB.get('/api/moi')).j.moi;
      v('⛔ /api/moi/maj ignore id, verifie, origine, etat : la personne reste elle-même, confirmée, bêta, active', [q.code, moi.id === B.id, moi.verifie, moi.origine, moi.etat], [200, true, true, 'beta', 'actif']);
      void F;
    }

    console.log('\nUn blocage coupe l\'écriture dans la directe (404, comme si elle n\'existait pas) mais pas la lecture de l\'historique');
    {
      /* Ana et Ben ne sont plus COLLÈGUES (les espaces des fixtures de la matrice partent) : seul le contact les lie, comme avant le lot des espaces. Que des collègues, eux, s'écrivent sans être
         contacts est jouée par `test-960`/`test-961`. */
      for (const e of S.espacesDe(A.id)) S.espaceSupprimer(e.id);
      const D = S.convDirecteObtenir(A.id, B.id).id;
      S.messageEnvoyer({ conv: D, auteur: A.id, cid: 'cid-bloc-0001', texte: 'avant le blocage' });
      const cA = clientDe('admin'), cB = clientDe('membre');
      v('population : avant le blocage, Ben écrit à Ana', (await cB.post('/api/conversations/' + D + '/messages', { cid: 'cid-bloc-0002', texte: 'salut' })).code, 201);
      S.contactEtat(A.id, B.id, 'bloque');
      const e = await cB.post('/api/conversations/' + D + '/messages', { cid: 'cid-bloc-0003', texte: 'je suis bloqué' });
      v('⛔ Ben, BLOQUÉ par Ana, n\'écrit plus : 404 introuvable (il ne doit pas apprendre qu\'il est bloqué)', [e.code, e.j.error], [404, 'introuvable']);
      const e2 = await cA.post('/api/conversations/' + D + '/messages', { cid: 'cid-bloc-0004', texte: 'je bloque et j\'écris' });
      v('Ana, qui a bloqué, n\'écrit pas non plus tant qu\'elle n\'a pas débloqué', e2.code, 404);
      v('l\'historique reste lisible des deux côtés', [(await cA.get('/api/conversations/' + D + '/messages')).code, (await cB.get('/api/conversations/' + D + '/messages')).code], [200, 200]);
      v('⛔ Ben ne peut plus ouvrir de directe avec Ana (404) tant qu\'il est bloqué', (await cB.post('/api/conversations/directe', { uid: A.id })).code, 404);
      v('⛔ ni réagir dans cette directe', (await cB.post('/api/conversations/' + D + '/messages/reagir', { seq: 1, emoji: '👍' })).code, 404);
      S.contactEtat(A.id, B.id, 'ok');
      v('débloqué, l\'écriture reprend', (await cB.post('/api/conversations/' + D + '/messages', { cid: 'cid-bloc-0005', texte: 'de nouveau' })).code, 201);
      S.contactRetirer(A.id, B.id); S.contactLier(A.id, B.id);
      v('retirer le contact coupe aussi l\'écriture (jusqu\'à ce qu\'ils redeviennent contacts)', await (async () => { S.contactRetirer(A.id, B.id); const r = (await cB.post('/api/conversations/' + D + '/messages', { cid: 'cid-bloc-0006', texte: 'plus contact' })).code; S.contactLier(A.id, B.id); return r; })(), 404);
    }

    console.log('\nUn groupe « seuls les admins écrivent » : le membre est refusé (403 annonces_seules), l\'administrateur écrit');
    {
      const G = S.convCreerGroupe({ createur: A.id, nom: 'Annonces', membres: [B.id], annonces_seules: true, ephemere_s: 0 }).id;
      const cA = clientDe('admin'), cB = clientDe('membre');
      const m = await cB.post('/api/conversations/' + G + '/messages', { cid: 'cid-ann-00001', texte: 'moi aussi' });
      v('⛔ un membre simple : 403 annonces_seules', [m.code, m.j.error], [403, 'annonces_seules']);
      v('l\'administrateur écrit', (await cA.post('/api/conversations/' + G + '/messages', { cid: 'cid-ann-00002', texte: 'annonce' })).code, 201);
      v('le membre peut toujours LIRE', (await cB.get('/api/conversations/' + G + '/messages')).code, 200);
      v('et réagir (une réaction n\'est pas un message)', (await cB.post('/api/conversations/' + G + '/messages/reagir', { seq: 2, emoji: '👍' })).code, 200);
      await cA.post('/api/conversations/' + G + '/maj', { annonces_seules: false });
      v('l\'administrateur rouvre le groupe : le membre écrit', (await cB.post('/api/conversations/' + G + '/messages', { cid: 'cid-ann-00003', texte: 'ouvert' })).code, 201);
    }

    console.log('\nPersonne qui a quitté ou été retiré n\'a plus aucun droit sur la conversation');
    {
      const G = S.convCreerGroupe({ createur: A.id, nom: 'Départs', membres: [B.id, C.id], annonces_seules: false, ephemere_s: 0 }).id;
      const cB = clientDe('membre'), cC = clientDe('nonmembre'), cA = clientDe('admin');
      v('population : Ben lit le groupe', (await cB.get('/api/conversations/' + G)).code, 200);
      await cB.post('/api/conversations/' + G + '/quitter', {});
      v('⛔ après avoir QUITTÉ : 404 en lecture, en messages, en écriture', [(await cB.get('/api/conversations/' + G)).code, (await cB.get('/api/conversations/' + G + '/messages')).code, (await cB.post('/api/conversations/' + G + '/messages', { cid: 'cid-dep-00001', texte: 'x' })).code], [404, 404, 404]);
      await cA.post('/api/conversations/' + G + '/membres/retirer', { uid: C.id });
      v('⛔ après avoir été RETIRÉE par un admin : 404 partout', [(await cC.get('/api/conversations/' + G)).code, (await cC.get('/api/conversations/' + G + '/messages')).code, (await cC.post('/api/conversations/' + G + '/lu', { seq: 1 })).code], [404, 404, 404]);
      v('et la conversation n\'est plus dans sa liste', (await cC.get('/api/conversations')).j.conversations.some(c => c.id === G), false);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  S.fermer();
  await svc.arreter(); await og.fermer();
  fin();
})();
