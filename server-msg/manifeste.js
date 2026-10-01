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
];

module.exports = { MANIFESTE };
