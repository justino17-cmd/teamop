/* ══ LE MANIFESTE DES ROUTES — UNE DONNÉE, PAS UN EFFET DE BORD ══════════════════════════════
 *
 * Chaque route du service est UNE ligne ici : son identifiant, sa méthode, son chemin et sa
 * GARDE. `app.js` monte les routes en LISANT ce tableau — il n'existe aucun autre chemin
 * d'enregistrement (`tests/test-900.js` compte les `app.get(` / `app.post(` hors de ce montage :
 * zéro). Le banc de la matrice d'accès (`tests/test-905.js`) part du MÊME tableau : une route
 * ajoutée ici sans ligne dans sa matrice FAIT TOMBER le banc, et une route montée ailleurs
 * n'existerait pas pour lui — d'où l'interdiction.
 *
 * Les gardes (SERVEUR.md § 3.3) :
 *   P  public, plafonné par adresse            S  session valide
 *   V  session ET adresse confirmée            M  membre de la conversation
 *   A  administrateur de la conversation       B  instance bêta (404 ailleurs), plafonnée
 *   J  une pièce (photo, vocal, fichier, photo de profil) que CETTE personne a le droit de lire : session, puis le droit se décide sur la
 *      pièce elle-même (`stockage.pieceVisible`) — membre de sa conversation ET message visible pour soi, dépositaire d'une pièce pas
 *      encore envoyée, ou qui peut voir la personne dont c'est la photo. Pas de droit, ou pas de pièce : 404, la MÊME réponse.
 *   E  membre d'un ESPACE (V d'abord), EA administrateur de l'espace, EP son propriétaire — l'espace se lit dans le chemin (`:id`) ;
 *      un non-membre reçoit le même 404 qu'un espace inexistant. `pro: true` sur une ligne : fonction PRO (voir plus bas).
 *   R  invité d'une RÉUNION (S d'abord : répondre ne demande pas d'adresse confirmée) — l'hôte en est un ; la réunion se lit dans le chemin (`:id`) ;
 *      H  hôte de la réunion (V d'abord : modifier, annuler, inviter, c'est agir au nom d'une adresse). Un non-invité reçoit, sur R comme sur H, le même 404 qu'une réunion inexistante ;
 *      un invité qui n'est pas l'hôte reçoit 403 sur H (il connaît déjà la réunion).
 *   SP, SH, SO, SJ  une SALLE (étape 8) : participant · hôte ou co-hôte PRÉSENT (un participant voit 403) · l'hôte seul · quelqu'un qui veut ENTRER (le droit se juge dans la transaction). Tous bâtis sur S ; un non-participant, un
 *      exclu et un appel à deux reçoivent le même 404 qu'une salle qui n'existe pas.
 *   AP participant d'un APPEL (S d'abord : répondre, raccrocher et signaler ne demandent pas d'adresse confirmée — lancer l'appel, lui, exige V) — l'appel se lit dans le chemin (`:id`) ; un non-participant reçoit le
 *      même 404 qu'un appel qui n'existe pas. « L'appareil lié » (la session qui a lancé l'appel ou qui y a répondu) se juge dans la route, pas dans la garde : un autre appareil du même compte voit 403.
 *
 * ⛔ « Une session prouve un mot de passe, pas une adresse » : tout effet qui agit AU NOM d'une
 * adresse (contact, lien, groupe) exige V. Sur la bêta, l'adresse est confirmée par construction ;
 * l'étape 2 (comptes publics) ne la confirmera qu'après le courriel — la garde est déjà là.
 * ⛔ Un objet auquel on n'a pas droit répond 404, JAMAIS 403 : M et A ne distinguent pas
 * « n'existe pas » de « tu n'en es pas membre ». Seul un membre qui n'est pas admin voit un 403
 * (il connaît déjà l'objet).
 */
const MANIFESTE = [
  { id: 'health',            m: 'GET',  p: '/health',                                garde: 'P' },
  { id: 'config',            m: 'GET',  p: '/api/config',                            garde: 'P' },
  { id: 'beta.entrer',       m: 'POST', p: '/api/beta/entrer',                       garde: 'B' },
  { id: 'compte.deconnexion', m: 'POST', p: '/api/compte/deconnexion',               garde: 'S' },
  { id: 'moi',               m: 'GET',  p: '/api/moi',                               garde: 'S' },
  { id: 'moi.maj',           m: 'POST', p: '/api/moi/maj',                           garde: 'S' },
  { id: 'flux',              m: 'GET',  p: '/api/flux',                              garde: 'S' },
  { id: 'sync',              m: 'GET',  p: '/api/sync',                              garde: 'S' },
  { id: 'notif.liste',       m: 'GET',  p: '/api/notifications',                     garde: 'S' },
  { id: 'notif.lues',        m: 'POST', p: '/api/notifications/lues',                garde: 'S' },
  { id: 'contacts',          m: 'GET',  p: '/api/contacts',                          garde: 'S' },
  { id: 'contacts.lien',     m: 'POST', p: '/api/contacts/lien',                     garde: 'V' },
  { id: 'contacts.liens.revoquer', m: 'POST', p: '/api/contacts/liens/revoquer',    garde: 'V' },
  { id: 'contacts.retirer',  m: 'POST', p: '/api/contacts/retirer',                  garde: 'V' },
  { id: 'contacts.bloquer',  m: 'POST', p: '/api/contacts/bloquer',                  garde: 'V' },
  { id: 'contacts.debloquer', m: 'POST', p: '/api/contacts/debloquer',               garde: 'V' },
  { id: 'liens.lire',        m: 'POST', p: '/api/liens/lire',                        garde: 'S' },
  { id: 'liens.accepter',    m: 'POST', p: '/api/liens/accepter',                    garde: 'V' },
  { id: 'personnes.lire',    m: 'GET',  p: '/api/personnes/:id',                     garde: 'V' },
  { id: 'conv.liste',        m: 'GET',  p: '/api/conversations',                     garde: 'S' },
  { id: 'conv.directe',      m: 'POST', p: '/api/conversations/directe',             garde: 'V' },
  { id: 'conv.groupe',       m: 'POST', p: '/api/conversations/groupe',              garde: 'V' },
  { id: 'conv.lire',         m: 'GET',  p: '/api/conversations/:id',                 garde: 'M' },
  { id: 'conv.maj',          m: 'POST', p: '/api/conversations/:id/maj',             garde: 'A' },
  { id: 'conv.membres.ajouter', m: 'POST', p: '/api/conversations/:id/membres/ajouter', garde: 'A' },
  { id: 'conv.membres.retirer', m: 'POST', p: '/api/conversations/:id/membres/retirer', garde: 'A' },
  { id: 'conv.admins',       m: 'POST', p: '/api/conversations/:id/admins',          garde: 'A' },
  { id: 'conv.lien',         m: 'POST', p: '/api/conversations/:id/lien',            garde: 'A' },
  { id: 'conv.liens.revoquer', m: 'POST', p: '/api/conversations/:id/liens/revoquer', garde: 'A' },
  { id: 'conv.quitter',      m: 'POST', p: '/api/conversations/:id/quitter',         garde: 'M' },
  { id: 'conv.prefs',        m: 'POST', p: '/api/conversations/:id/prefs',           garde: 'M' },
  { id: 'conv.lu',           m: 'POST', p: '/api/conversations/:id/lu',              garde: 'M' },
  { id: 'conv.saisie',       m: 'POST', p: '/api/conversations/:id/saisie',          garde: 'M' },
  { id: 'msg.liste',         m: 'GET',  p: '/api/conversations/:id/messages',        garde: 'M' },
  { id: 'msg.envoyer',       m: 'POST', p: '/api/conversations/:id/messages',        garde: 'M' },
  { id: 'msg.modifier',      m: 'POST', p: '/api/conversations/:id/messages/modifier', garde: 'M' },
  { id: 'msg.supprimer',     m: 'POST', p: '/api/conversations/:id/messages/supprimer', garde: 'M' },
  { id: 'msg.reagir',        m: 'POST', p: '/api/conversations/:id/messages/reagir', garde: 'M' },
  /* Étape 2 : le compte PERSO par numéro de téléphone (`telephone.js`). Les trois premières sont PUBLIQUES (garde P) : on ne peut pas
     avoir de session avant d'en avoir une — leur défense est dans les plafonds, le budget en euros et les réponses uniformes. */
  { id: 'tel.code',          m: 'POST', p: '/api/tel/code',                          garde: 'P' },
  { id: 'tel.verifier',      m: 'POST', p: '/api/tel/verifier',                      garde: 'P' },
  { id: 'tel.appareil',      m: 'POST', p: '/api/tel/appareil',                      garde: 'P' },
  { id: 'moi.confidentialite.lire', m: 'GET',  p: '/api/moi/confidentialite',        garde: 'S' },
  { id: 'moi.confidentialite', m: 'POST', p: '/api/moi/confidentialite',             garde: 'S' },
  { id: 'moi.appareils.deconnecter', m: 'POST', p: '/api/moi/appareils/deconnecter', garde: 'S' },
  { id: 'contacts.chercher', m: 'POST', p: '/api/contacts/chercher',                 garde: 'V' },
  { id: 'contacts.ajouter',  m: 'POST', p: '/api/contacts/ajouter',                  garde: 'V' },
  /* Étape 4 : les pièces (`routes-pieces.js`). Un dépôt exige l'adresse confirmée (V) ET, pour une pièce de conversation, d'en être membre
     (vérifié dans la route : le membre se lit dans l'adresse de la requête, pas dans le chemin) ; une lecture passe la garde J. */
  { id: 'pieces.deposer',    m: 'POST', p: '/api/pieces',                            garde: 'V' },
  { id: 'pieces.lire',       m: 'GET',  p: '/api/pieces/:id',                        garde: 'J' },
  { id: 'moi.avatar',        m: 'POST', p: '/api/moi/avatar',                        garde: 'S' },
  { id: 'moi.stockage',      m: 'GET',  p: '/api/moi/stockage',                      garde: 'S' },
  /* Étape 2 (suite) : les notifications push (`routes-push.js`) et le compte (`compte.js`). Toutes S : l'identité vient de la SESSION, jamais du corps. L'acquittement d'un événement
     (`flux.ack`) est ce qui empêche une notification de doubler une page visible ; le réglage « Aperçu du message » n'a pas de route (c'est `prefs.apercu_notif` de `moi.maj`). */
  { id: 'push.abonner',      m: 'POST', p: '/api/push/abonner',                      garde: 'S' },
  { id: 'push.desabonner',   m: 'POST', p: '/api/push/desabonner',                   garde: 'S' },
  { id: 'push.essai',        m: 'POST', p: '/api/push/essai',                        garde: 'S' },
  { id: 'flux.ack',          m: 'POST', p: '/api/flux/ack',                          garde: 'S' },
  { id: 'compte.export',     m: 'POST', p: '/api/compte/export',                     garde: 'S' },
  { id: 'compte.supprimer',  m: 'POST', p: '/api/compte/supprimer',                  garde: 'S' },
  /* Étape 5 : les ESPACES PROFESSIONNELS (`routes-espaces.js`) et MESSAGES PRO (`facturation.js`). Les gardes d'espace sont bâties sur V (« une session prouve un mot de passe, pas une
     adresse » : tout effet qui agit au nom d'une entreprise exige l'adresse confirmée) ; l'espace se lit dans l'adresse (`:id`), JAMAIS dans le corps :
       E  membre de l'espace  ·  EA  administrateur de l'espace  ·  EP  son propriétaire (le non-membre ne voit RIEN : 404 identique à un espace inexistant ; un membre qui n'a pas le
       rôle voit 403, il connaît déjà l'espace). `pro: true` : la route est une fonction PRO — après sa garde, `formuleDe` doit dire « pro » (402 `formule_requise` sinon). C'est le
       SEUL endroit où une route déclare qu'elle est payante ; la bêta (tout ouvert) les passe toutes. */
  { id: 'espaces.liste',     m: 'GET',  p: '/api/espaces',                           garde: 'S' },
  { id: 'espaces.creer',     m: 'POST', p: '/api/espaces',                           garde: 'V', pro: true },
  { id: 'espaces.lire',      m: 'GET',  p: '/api/espaces/:id',                       garde: 'E' },
  { id: 'espaces.maj',       m: 'POST', p: '/api/espaces/:id/maj',                   garde: 'EP' },
  { id: 'espaces.transferer', m: 'POST', p: '/api/espaces/:id/transferer',           garde: 'EP' },
  { id: 'espaces.supprimer', m: 'POST', p: '/api/espaces/:id/supprimer',             garde: 'EP' },
  { id: 'espaces.quitter',   m: 'POST', p: '/api/espaces/:id/quitter',               garde: 'E' },
  { id: 'espaces.contacts',  m: 'GET',  p: '/api/espaces/:id/contacts',              garde: 'E' },
  { id: 'espaces.membres.role', m: 'POST', p: '/api/espaces/:id/membres/role',       garde: 'EA' },
  { id: 'espaces.membres.retirer', m: 'POST', p: '/api/espaces/:id/membres/retirer', garde: 'EA' },
  { id: 'espaces.invitations.creer', m: 'POST', p: '/api/espaces/:id/invitations',   garde: 'EA', pro: true },
  { id: 'espaces.invitations.revoquer', m: 'POST', p: '/api/espaces/:id/invitations/revoquer', garde: 'EA' },
  { id: 'invitations.lire',  m: 'POST', p: '/api/invitations/lire',                  garde: 'S' },
  { id: 'invitations.accepter', m: 'POST', p: '/api/invitations/accepter',           garde: 'V' },
  { id: 'canaux.creer',      m: 'POST', p: '/api/espaces/:id/canaux',                garde: 'EA', pro: true },
  { id: 'canaux.maj',        m: 'POST', p: '/api/espaces/:id/canaux/:cid/maj',       garde: 'EA' },
  { id: 'canaux.supprimer',  m: 'POST', p: '/api/espaces/:id/canaux/:cid/supprimer', garde: 'EA' },
  { id: 'canaux.membres.ajouter', m: 'POST', p: '/api/espaces/:id/canaux/:cid/membres/ajouter', garde: 'EA' },
  { id: 'canaux.membres.retirer', m: 'POST', p: '/api/espaces/:id/canaux/:cid/membres/retirer', garde: 'EA' },
  { id: 'facturation.offres', m: 'GET', p: '/api/facturation/offres',                garde: 'P' },
  { id: 'facturation.etat',  m: 'GET',  p: '/api/espaces/:id/facturation/etat',      garde: 'EA' },
  { id: 'facturation.paiement', m: 'POST', p: '/api/espaces/:id/facturation/paiement', garde: 'EP' },
  { id: 'facturation.portail', m: 'POST', p: '/api/espaces/:id/facturation/portail', garde: 'EP' },
  { id: 'facturation.relire', m: 'POST', p: '/api/espaces/:id/facturation/relire',   garde: 'EP' },
  /* Étape 6 : les RÉUNIONS PROGRAMMÉES (`routes-reunions.js`). Programmer est une fonction PRO (la bêta ouvre tout) ; être invité, répondre et télécharger le .ics ne coûtent rien — « les invités
     rejoignent sans siège ». L'hôte agit par H, un invité par R : la réunion se lit dans l'adresse (`:id`), JAMAIS dans le corps. */
  { id: 'reunions.liste',    m: 'GET',  p: '/api/reunions',                          garde: 'S' },
  { id: 'reunions.creer',    m: 'POST', p: '/api/reunions',                          garde: 'V', pro: true },
  { id: 'reunions.lire',     m: 'GET',  p: '/api/reunions/:id',                      garde: 'R' },
  { id: 'reunions.modifier', m: 'POST', p: '/api/reunions/:id/modifier',             garde: 'H' },
  { id: 'reunions.annuler',  m: 'POST', p: '/api/reunions/:id/annuler',              garde: 'H' },
  { id: 'reunions.supprimer', m: 'POST', p: '/api/reunions/:id/supprimer',           garde: 'H' },
  { id: 'reunions.inviter',  m: 'POST', p: '/api/reunions/:id/inviter',              garde: 'H' },
  { id: 'reunions.retirer',  m: 'POST', p: '/api/reunions/:id/retirer',              garde: 'H' },
  { id: 'reunions.quitter',  m: 'POST', p: '/api/reunions/:id/quitter',              garde: 'R' },
  { id: 'reunions.reponse',  m: 'POST', p: '/api/reunions/:id/reponse',              garde: 'R' },
  { id: 'reunions.rappels',  m: 'POST', p: '/api/reunions/:id/rappels',              garde: 'R' },
  { id: 'reunions.ics',      m: 'GET',  p: '/api/reunions/:id/ics',                  garde: 'R' },
  /* L'invitation par COURRIEL (`courriel.js`) : l'hôte seul, à l'adresse qu'il saisit — inerte (503) tant qu'aucun relais n'est configuré. Pas `pro` : la fonction Pro est de PROGRAMMER ; ce qui est
     programmé reste à son hôte, comme la modification et l'annulation. */
  { id: 'reunions.courriel', m: 'POST', p: '/api/reunions/:id/courriel',            garde: 'H' },
  /* Étape 7 : les APPELS À DEUX, audio et vidéo (`routes-appels.js`). GRATUITS en Perso (SERVEUR.md § 5, question 3) : aucune ligne n'est `pro`. Lancer exige V (c'est agir au nom d'une adresse), répondre, raccrocher et
     signaler la garde AP. `ice` donne les identifiants éphémères du relais — ou rien, tant qu'il n'est pas installé. */
  { id: 'ice',               m: 'GET',  p: '/api/ice',                               garde: 'S' },
  { id: 'appels.liste',      m: 'GET',  p: '/api/appels',                            garde: 'S' },
  { id: 'appels.creer',      m: 'POST', p: '/api/appels',                            garde: 'V' },
  { id: 'appels.repondre',   m: 'POST', p: '/api/appels/:id/repondre',               garde: 'AP' },
  { id: 'appels.quitter',    m: 'POST', p: '/api/appels/:id/quitter',                garde: 'AP' },
  { id: 'appels.signal',     m: 'POST', p: '/api/appels/:id/signal',                 garde: 'AP' },
  /* Étape 8 : les APPELS À PLUSIEURS et les SALLES EN MAILLE (`routes-appels.js`, `routes-salles.js`, `routes-reunions.js`). Entrer est toujours gratuit ; LANCER un appel à plusieurs (`appels.creer` avec un groupe ou
     des personnes choisies) est jugé dans la route sur la formule de celui qui lance — la route sert aussi les appels à deux, qui restent gratuits, donc ce n'est pas une ligne `pro`. Les gestes de l'hôte sont SH (SO pour
     les deux qui ne se partagent pas : co-hôte, terminer), ceux des participants SP. */
  { id: 'appels.rejoindre',  m: 'POST', p: '/api/appels/:id/rejoindre',              garde: 'SJ' },
  { id: 'salles.lire',       m: 'GET',  p: '/api/salles/:id',                        garde: 'SP' },
  { id: 'salles.admettre',   m: 'POST', p: '/api/salles/:id/admettre',               garde: 'SH' },
  { id: 'salles.refuser',    m: 'POST', p: '/api/salles/:id/refuser',                garde: 'SH' },
  { id: 'salles.exclure',    m: 'POST', p: '/api/salles/:id/exclure',                garde: 'SH' },
  { id: 'salles.verrouiller', m: 'POST', p: '/api/salles/:id/verrouiller',           garde: 'SH' },
  { id: 'salles.salle_attente', m: 'POST', p: '/api/salles/:id/salle_attente',       garde: 'SH' },
  { id: 'salles.couper_micro', m: 'POST', p: '/api/salles/:id/couper_micro',          garde: 'SH' },
  { id: 'salles.partage',    m: 'POST', p: '/api/salles/:id/partage',                garde: 'SH' },
  { id: 'salles.rec',        m: 'POST', p: '/api/salles/:id/rec',                    garde: 'SH' },
  { id: 'salles.cohote',     m: 'POST', p: '/api/salles/:id/cohote',                 garde: 'SO' },
  { id: 'salles.terminer',   m: 'POST', p: '/api/salles/:id/terminer',               garde: 'SO' },
  { id: 'salles.main',       m: 'POST', p: '/api/salles/:id/main',                   garde: 'SP' },
  { id: 'salles.reaction',   m: 'POST', p: '/api/salles/:id/reaction',               garde: 'SP' },
  { id: 'salles.etat',       m: 'POST', p: '/api/salles/:id/etat',                   garde: 'SP' },
  { id: 'salles.evt',        m: 'POST', p: '/api/salles/:id/evt',                    garde: 'SP' },
  /* Le lien d'invité d'une réunion et sa salle. L'aperçu est PUBLIC et limité (il ne dit que de quoi décider de rejoindre, jamais un participant) ; rejoindre par le lien exige un compte (S, v1) ; la salle d'une
     réunion où l'on est invité s'ouvre par R (l'hôte en est un) ; le lien se lit et se renouvelle par H (l'ancien meurt). */
  { id: 'reunions.apercu',   m: 'POST', p: '/api/reunions/apercu',                   garde: 'P' },
  { id: 'reunions.rejoindre_code', m: 'POST', p: '/api/reunions/rejoindre',          garde: 'S' },
  { id: 'reunions.rejoindre', m: 'POST', p: '/api/reunions/:id/rejoindre',           garde: 'R' },
  { id: 'reunions.lien',     m: 'POST', p: '/api/reunions/:id/lien',                 garde: 'H' },
  { id: 'reunions.lien_renouveler', m: 'POST', p: '/api/reunions/:id/lien/renouveler', garde: 'H' },
];

module.exports = { MANIFESTE };
