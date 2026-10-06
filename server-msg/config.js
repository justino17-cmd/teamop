/* ══ LA CONFIGURATION ET LA GARDE DE DÉMARRAGE D'OP MESSAGES ═════════════════════════════════
 *
 * Tout vient de l'ENVIRONNEMENT : `OPMSG_CONFIG` (un fichier JSON), `OPMSG_DATA` (un dossier),
 * `OPMSG_INSTANCE` (`beta` ou `prod`), `PORT` (8091 par défaut), `OPMSG_SHA` (posé par le
 * déploiement), et la clé maître dans le credential systemd `kek` (`$CREDENTIALS_DIRECTORY/kek`).
 * ⛔ Aucun chemin, aucune adresse de machine, aucun domaine en dur dans le code : une machine
 * à lui, le jour venu, ne demande qu'une autre configuration.
 *
 * ⛔ LA GARDE DE SÉPARATION. Ce service n'est PAS OP GESTION : sa configuration, ses données et sa
 * clé ne vivent jamais sous `/opt/teamop` ni `/etc/teamop`. Refuser ICI, au démarrage, est la
 * dernière barrière — une unité mal copiée, un chemin collé de l'autre installation ferait sinon
 * écrire une base de messages dans le dossier d'OP GESTION (sauvegardée avec lui, lisible par
 * lui) sans que rien ne casse. Le refus passe AVANT toute création de dossier ou de fichier.
 *
 * ⛔ UN CHEMIN SE COMPARE RÉSOLU : un lien symbolique ou un `..` ne doit pas contourner la
 * garde (`/opt/opmsg/../teamop/data`). Les liens sont suivis quand le chemin existe.
 *
 * Réglages du fichier JSON (tous optionnels) :
 *   origines      ["https://…"]  Origines autorisées à écrire. Absent : l'origine DOIT être celle de
 *                                l'en-tête Host (même origine). Un tableau fixe l'exclusivité.
 *   cookie        {nom, secure}  `__Host-opm` et Secure par défaut. Seuls les bancs en http local
 *                                relâchent l'un ou l'autre.
 *   beta          {urlGestion, relectureMs, timeoutMs}   La porte (instance beta seulement).
 *   quotas        {nom:{max,fenetreMs}}   Surcharge des plafonds de départ (bancs).
 *   pieces        {photoMax, vocalMax, fichierMax, avatarMax, quotaPersonne, depotsHeure, orphelineMs, simultanes, parPersonne, bloc, memoireImages,
 *                  depotDebitMin, depotGraceMs, lectureAttenteMs, lectureMaxMs}
 *                                Les pièces (photos, vocaux, fichiers) : tailles maximales en octets, quota par personne, envois par heure,
 *                                durée de vie d'une pièce jamais envoyée, envois en même temps, mémoire que les images en cours de nettoyage se partagent,
 *                                débit minimal d'un envoi (octets par seconde) après sa grâce (ms), attente maximale d'un lecteur qui ne lit plus (ms) et durée maximale d'une lecture (ms).
 *                                Voir `piecesConfig` pour les valeurs de départ.
 *   compte        {exportOctetsMax, exportAttenteMs, exportMaxMs}   Le plafond de taille de l'export des données d'une personne (64 Mo par défaut ; au-delà, le fichier se termine proprement et dit où il s'est arrêté),
 *                                l'attente maximale d'un lecteur qui ne lit plus (30 s : la réponse est alors COUPÉE) et la durée maximale d'un export (15 min : le fichier se termine proprement, `tronque_cause: "duree"`).
 *   push          {contact, ackMs, echecsMax, etalementMs, simultanes, fileMax, timeoutMs, ttlS, ttlApercuS}   Les notifications push. `contact` : le sujet VAPID (`mailto:` ou une adresse
 *                                https) ; absent, c'est le `contactEmail` de l'installation, à défaut l'origine https du service. Les autres : délai d'acquittement (5 s), refus du service de suite avant le retrait d'un
 *                                abonnement (5) et durée minimale de la série (1 h : cinq refus en cinq minutes sont une panne), envois en même temps (16), file d'attente (2 000), délai d'un envoi (8 s), durée de vie d'un message poussé (24 h) et, quand l'APERÇU part, d'un message dont le texte voyage (1 h : il
 *                                n'attend pas un jour entier sur la machine d'un tiers parce qu'un téléphone était éteint ; un message éphémère ne survit jamais à ce qui lui reste à vivre).
 *   vapidPublicKey, vapidPrivateKey   La paire VAPID que l'installation écrit (`install-msg.sh`) : le service l'ADOPTE à son premier démarrage (elle est alors rangée dans la
 *                                base, privée scellée, et la base fait foi ensuite : une paire DIFFÉRENTE posée plus tard ne la remplace pas, et le journal le dit à chaque démarrage).
 *                                Absente, le service en fabrique une. L'une sans l'autre, ou deux clés qui ne vont pas ensemble, REFUSENT le démarrage.
 *   formule       {toutOuvert}   Le DRAPEAU de la bêta : vrai (par défaut sur la bêta), tout est ouvert (Pro), sans paiement — lu à UN seul endroit (`formule.js`). La production
 *                                REFUSE de démarrer avec `toutOuvert: true`.
 *   facturation   {cle, prix:{mensuel, annuel}, affichage:{mensuel, annuel}, relectureMs, timeoutMs}   Messages Pro (Stripe, mode test d'abord). `cle` : une clé RESTREINTE de
 *                                Stripe, PROPRE à OP MESSAGES (jamais celle d'OP GESTION) — `rk_test_…` sur la bêta, qui refuse une clé de production ; une clé secrète complète
 *                                (`sk_…`) est refusée. `prix` : la LISTE BLANCHE des tarifs vendus (un identifiant `price_…` par rythme, au moins un) — le corps d'une requête ne
 *                                choisit jamais un tarif. `affichage` : les euros par place que la page DIT (le montant réel est celui de Stripe). Sans `cle`, la facturation est
 *                                INERTE et le dit. La clé s'écrit par `configurer-stripe.js` (saisie masquée), jamais à la main.
 *                                `facturation.perso` {prix:{mensuel, annuel}, affichage:{mensuel, annuel}} : le forfait d'une PERSONNE (Perso+, 5 € par mois, 50 € l'année), SANS espace d'entreprise. Mêmes règles que les
 *                                tarifs d'espace : une liste blanche de `price_…` (le corps d'une requête ne choisit jamais un tarif), des euros que la page DIT (le montant réel est celui de Stripe). Un tarif ne peut pas
 *                                figurer dans les deux listes : un abonnement d'espace ne donnerait pas Perso+, ni l'inverse. Sans tarif Perso+, le forfait est INERTE (503 `abonnement_non_ouvert`) même si Messages Pro est ouvert.
 *   reunions      {planificateurMs, bailMs, rappelsParTour, tourMaxMs, urgentesMax}   Les réunions programmées : le rythme du planificateur de rappels (12 s ; EN PRODUCTION entre 10 et 15 s, les bancs
 *                                et la bêta peuvent le presser jusqu'à 50 ms) et la durée de son bail (60 s ; au moins deux tours : un arrêt brutal le laisse expirer, il ne bloque personne). Le BUDGET d'un tour :
 *                                `rappelsParTour` (2000 rappels envoyés, à une réunion près), `tourMaxMs` (1000 ms de temps réel : passé ce délai le tour s'arrête après la réunion en cours) et
 *                                `urgentesMax` (2000 réunions urgentes regardées) — ce qui reste attend le tour suivant, qui vient vite : un tour ne gèle jamais le service.
 *   appels        {sonnerieMs, perduMs, balayageMs, historiqueJours, listeMax, parHeure, parPaireHeure, entrantsParHeure, signalMax, signalFenetreMs, iceParHeure, relais:{secret, hote, port, portTls, ttlS}}   Les appels à deux (étape 7) :
 *                                sonnerie (45 s, puis « manqué »), temps sans signe d'un appareil lié avant de finir l'appel (45 s), rythme du balayeur, plafonds par heure et par personne (30) ou vers la même personne (6),
 *                                signaux par appel, et le RELAIS (coturn) : sans `relais`, pas de relais et la page le dit (jamais de serveur STUN tiers) ; son `secret`, posé par `install-turn.sh`, ne s'affiche ni ne se copie.
 *   courriel      {hote, port, securite, utilisateur, mot_de_passe, de, nom, timeoutMs}   L'envoi des invitations aux réunions par courriel (un fichier .ics joint). SANS `hote`, INERTE et le dit.
 *                                `securite` : starttls (défaut, port 587), ssl (465) ou aucune (relais local seulement en production). `de` : l'adresse d'expédition. Le mot de passe s'écrit par
 *                                `configurer-courriel.js` (saisie masquée), jamais à la main ni affiché.
 *   inscriptionCourriel  true pour OUVRIR les inscriptions par adresse e-mail (« comme Discord ») ; absent ou autre chose : fermées (503 `inscription_fermee`). Il faut aussi un relais (`courriel`).
 *   disqueMinMo   plancher d'espace libre sous lequel les écritures refusent (503).
 *   pulsationMs, presenceGraceMs, balayageMs, relectureMs   Rythmes (bancs).
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const INTERDITS = ['/opt/teamop', '/etc/teamop'];

function resolu(p) {
  const abs = path.resolve(String(p));
  // realpath si le chemin (ou son plus proche ancêtre existant) existe : suit les liens.
  let cur = abs; const reste = [];
  for (;;) {
    try { const r = fs.realpathSync(cur); return path.join(r, ...reste.reverse()); }
    catch (e) {
      const parent = path.dirname(cur);
      if (parent === cur) return abs;
      reste.push(path.basename(cur)); cur = parent;
    }
  }
}

function sousArbre(p, racine) { return p === racine || p.startsWith(racine + path.sep); }

/* Lève `separation: <nom>` si un des chemins est sous un arbre d'OP GESTION. */
function verifierSeparation(chemins, interdits = INTERDITS) {
  for (const [nom, p] of Object.entries(chemins)) {
    if (!p) continue;
    const r = resolu(p);
    for (const interdit of interdits) {
      if (sousArbre(r, interdit) || sousArbre(path.resolve(String(p)), interdit)) {
        const e = new Error('separation: ' + nom + ' est sous ' + interdit + ' — OP MESSAGES ne vit jamais dans l\'arbre d\'OP GESTION');
        e.code = 'SEPARATION'; throw e;
      }
    }
  }
}

function lireCle(dossier) {
  if (!dossier) { const e = new Error('cle: $CREDENTIALS_DIRECTORY absent — la clé maître arrive par le credential systemd « kek »'); e.code = 'CLE'; throw e; }
  let v;
  try { v = fs.readFileSync(path.join(dossier, 'kek'), 'utf8').trim(); }
  catch (e) { const er = new Error('cle: credential « kek » illisible'); er.code = 'CLE'; throw er; }
  if (!/^[0-9a-fA-F]{64}$/.test(v)) { const e = new Error('cle: le credential « kek » n\'est pas 64 caractères hexadécimaux'); e.code = 'CLE'; throw e; }
  return Buffer.from(v, 'hex');
}

/* ⛔ Les origines autorisées : la liste `origines`, OU la chaîne `origine` que l'installation écrit (`install-msg.sh`). Les deux
   noms n'étaient pas lus pareil — l'installation écrivait `origine`, le service lisait `origines` — et la clé était IGNORÉE : la
   vérification retombait sur « Origin = Host », sans que rien ne le dise (relecture du gardien, point 9). Une valeur qui n'est
   pas une origine (schéma, hôte, port — ni chemin, ni requête) REFUSE le démarrage plutôt que de relâcher la garde. */
function origines(cfg) {
  const liste = Array.isArray(cfg.origines) ? cfg.origines.map(String) : (typeof cfg.origine === 'string' && cfg.origine ? [cfg.origine] : null);
  const FORME = new RegExp('^https?:' + '//[A-Za-z0-9.-]+(:\\d{1,5})?$');   // schéma, hôte, port : ni chemin, ni requête
  if (liste && !liste.every(o => FORME.test(o))) { const e = new Error('config: origine invalide (attendu : schéma, hôte et port éventuel, sans chemin)'); e.code = 'CONFIG'; throw e; }
  return liste && liste.length ? liste : null;
}

/* ⛔ LES PIÈCES : les valeurs de départ sont celles de SERVEUR.md § 5.6 (photo 12 Mo, vocal 10 Mo, fichier 25 Mo, 2 Go par personne en Perso). Une valeur qui n'a pas
   de sens (négative, fractionnaire, hors bornes) REFUSE le démarrage plutôt que de tourner de travers : un quota à zéro fermerait toutes les pièces, un plafond à 10 Go
   tiendrait en mémoire des photos que rien n'arrête. `bloc` est la taille de bloc du scellage (une puissance de deux) : il ne change que les fichiers à venir, chaque fichier
   porte la sienne dans son en-tête. */
const Mo = 1048576;
/* ⛔ UN ENVOI, OU UNE LECTURE, NE TIENT PAS UNE PLACE SANS AVANCER (relecture du gardien, A2 et A4). `depotDebitMin` : un envoi doit avoir reçu au moins ce débit moyen, après `depotGraceMs` de grâce
   (64 Ko/s après 30 s, soit ~0,5 Mbit/s : un « slowloris » qui annonce 25 Mo et envoie un octet par seconde ne tient plus 300 s une des seize places). `lectureAttenteMs` : un lecteur dont la
   connexion reste pleine plus longtemps que cela est coupé (le fichier ouvert est rendu) ; `lectureMaxMs` : plafond d'une lecture entière, pour celui qui lit juste assez vite pour ne jamais s'arrêter. */
const PIECES_DEFAUT = { photoMax: 12 * Mo, vocalMax: 10 * Mo, fichierMax: 25 * Mo, avatarMax: 2 * Mo, quotaPersonne: 2048 * Mo, depotsHeure: 60, orphelineMs: 24 * 3600000, simultanes: 16, parPersonne: 4, bloc: 65536, memoireImages: 96 * Mo,
  depotDebitMin: 64 * 1024, depotGraceMs: 30000, lectureAttenteMs: 30000, lectureMaxMs: 600000 };
function piecesConfig(c) {
  const brut = c && typeof c === 'object' && !Array.isArray(c) ? c : {};
  const o = {};
  const bornes = { photoMax: [1, 256 * Mo], vocalMax: [1, 256 * Mo], fichierMax: [1, 1024 * Mo], avatarMax: [1, 64 * Mo], quotaPersonne: [1, 1024 * 1024 * Mo], depotsHeure: [1, 100000], orphelineMs: [1000, 30 * 86400000], simultanes: [1, 256], parPersonne: [1, 64], bloc: [256, 1 << 24], memoireImages: [16 * Mo, 8192 * Mo],
    depotDebitMin: [1024, 1024 * Mo], depotGraceMs: [200, 600000], lectureAttenteMs: [100, 3600000], lectureMaxMs: [1000, 86400000] };
  for (const [k, [min, max]] of Object.entries(bornes)) {
    const v = brut[k] === undefined ? PIECES_DEFAUT[k] : brut[k];
    if (!Number.isInteger(v) || v < min || v > max) { const e = new Error('config: pieces.' + k + ' doit être un entier entre ' + min + ' et ' + max); e.code = 'CONFIG'; throw e; }
    o[k] = v;
  }
  if (!Number.isInteger(Math.log2(o.bloc))) { const e = new Error('config: pieces.bloc doit être une puissance de deux'); e.code = 'CONFIG'; throw e; }
  /* ⛔ la mémoire d'images doit couvrir une image du plus gros maximum, deux fois (son corps et sa version nettoyée) : sinon toute grosse photo serait refusée pour toujours */
  if (o.memoireImages < 2 * Math.max(o.photoMax, o.avatarMax)) { const e = new Error('config: pieces.memoireImages doit couvrir deux fois la plus grosse image (photoMax ou avatarMax)'); e.code = 'CONFIG'; throw e; }
  return o;
}

/* ⛔ LES NOTIFICATIONS PUSH. Une valeur qui n'a pas de sens REFUSE le démarrage (comme les pièces). La paire VAPID de l'installation est contrôlée ICI : une clé privée qui n'est pas celle de la
   publique ferait refuser TOUS les envois par les services push, sans une ligne d'erreur côté serveur — on la refuse au démarrage plutôt qu'en production. */
const PUSH_DEFAUT = { ackMs: 5000, echecsMax: 5, etalementMs: 3600000, simultanes: 16, fileMax: 2000, timeoutMs: 8000, ttlS: 86400, ttlApercuS: 3600 };
const SUJET_MAILTO = /^mailto:[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const SUJET_HTTPS = new RegExp('^https:' + '//[A-Za-z0-9.-]+(:\\d{1,5})?$');
function pushConfig(cfg, env, instance) {
  const brut = cfg.push && typeof cfg.push === 'object' && !Array.isArray(cfg.push) ? cfg.push : {};
  const err = (m) => { const e = new Error('config: ' + m); e.code = 'CONFIG'; return e; };
  const o = {};
  const bornes = { ackMs: [100, 60000], echecsMax: [1, 100], etalementMs: [0, 7 * 86400000], simultanes: [1, 256], fileMax: [10, 100000], timeoutMs: [500, 60000], ttlS: [60, 4 * 7 * 86400], ttlApercuS: [60, 4 * 7 * 86400] };
  for (const [k, [min, max]] of Object.entries(bornes)) {
    const v = brut[k] === undefined ? PUSH_DEFAUT[k] : brut[k];
    if (!Number.isInteger(v) || v < min || v > max) throw err('push.' + k + ' doit être un entier entre ' + min + ' et ' + max);
    o[k] = v;
  }
  if (brut.contact !== undefined && brut.contact !== null) {
    const c = String(brut.contact);
    const sujet = c.startsWith('mailto:') || SUJET_HTTPS.test(c) ? c : 'mailto:' + c;   // une adresse nue est admise : on lui met son « mailto: »
    if (!SUJET_MAILTO.test(sujet) && !SUJET_HTTPS.test(sujet)) throw err('push.contact doit être une adresse de courriel ou une origine https');
    if (/@localhost$|\/\/localhost(:|$)/i.test(sujet)) throw err('push.contact ne peut pas être « localhost » (le service push d\'Apple le refuse)');
    o.contact = sujet;
  } else {
    /* `push.contact` absent : le courriel que l'installation écrit déjà (`contactEmail`, comme celui d'OP GESTION) fait le sujet — les services push savent ainsi qui joindre. Illisible, ou « localhost » (Apple le
       refuse) : on le laisse de côté sans refuser le démarrage, l'origine https du service prend le relais (`push.js`). */
    const ce = typeof cfg.contactEmail === 'string' ? cfg.contactEmail.trim() : '';
    o.contact = ce && SUJET_MAILTO.test('mailto:' + ce) && !/@localhost$/i.test(ce) ? 'mailto:' + ce : null;
  }
  /* la paire VAPID de l'installation : les deux ou aucune, bien formées, et faites l'une pour l'autre */
  const pub = cfg.vapidPublicKey, priv = cfg.vapidPrivateKey;
  if ((pub === undefined) !== (priv === undefined)) throw err('vapidPublicKey et vapidPrivateKey vont ensemble (une seule des deux est posée)');
  if (pub !== undefined) {
    const B64U = /^[A-Za-z0-9_-]+$/;
    if (typeof pub !== 'string' || typeof priv !== 'string' || !B64U.test(pub) || !B64U.test(priv)) throw err('la paire VAPID doit être en base64 URL');
    const bp = Buffer.from(pub, 'base64url'), bk = Buffer.from(priv, 'base64url');
    if (bp.length !== 65 || bp[0] !== 4 || bk.length !== 32) throw err('la paire VAPID n\'a pas la bonne forme (65 octets publics, 32 privés)');
    let derivee = null;
    try { const e = crypto.createECDH('prime256v1'); e.setPrivateKey(bk); derivee = e.getPublicKey(); } catch (x) { derivee = null; }
    if (!derivee || !derivee.equals(bp)) throw err('la clé VAPID privée n\'est pas celle de la publique');
    o.vapid = { publique: pub, privee: priv };
  } else o.vapid = null;
  /* ⛔ LA PORTE DE TEST DU SERVICE PUSH : autorise UN faux service push (hôte et port exacts, sur la boucle locale, en http) pour que les bancs jouent un envoi sans réseau. Comme celle des codes SMS,
     elle est FERMÉE en production : une variable oubliée dans une unité systemd ne doit pas faire de ce service un client HTTP vers un port local. */
  const porte = env.OPMSG_TEST_PUSH ? String(env.OPMSG_TEST_PUSH) : null;
  if (porte && instance !== 'beta') throw err('OPMSG_TEST_PUSH (porte de test du service push) est refusée en production');
  if (porte && !/^127\.0\.0\.1:\d{2,5}$/.test(porte)) throw err('OPMSG_TEST_PUSH doit valoir 127.0.0.1:<port>');
  o.testHote = porte;
  return o;
}

/* ⛔ LE COMPTE : le plafond de taille de l'export, l'attente d'un lecteur qui ne lit plus et la durée maximale (un nombre absurde refuse le démarrage, comme les pièces). */
function compteConfig(c) {
  const brut = c && typeof c === 'object' && !Array.isArray(c) ? c : {};
  const defauts = { exportOctetsMax: 64 * Mo, exportAttenteMs: 30000, exportMaxMs: 900000 };
  const bornes = { exportOctetsMax: [1024, 512 * Mo], exportAttenteMs: [100, 3600000], exportMaxMs: [1000, 86400000] };
  const o = {};
  for (const [k, [min, max]] of Object.entries(bornes)) {
    const v = brut[k] === undefined ? defauts[k] : brut[k];
    if (!Number.isInteger(v) || v < min || v > max) { const e = new Error('config: compte.' + k + ' doit être un entier entre ' + min + ' et ' + max); e.code = 'CONFIG'; throw e; }
    o[k] = v;
  }
  return o;
}

/* ⛔ LA FORMULE : le drapeau de la bêta. Par défaut vrai sur la bêta (tout est ouvert pour qu'on puisse tout éprouver), faux ailleurs ; la production refuse `true` — une
   configuration copiée de la bêta ne doit pas offrir Messages Pro à tout le monde. */
function formuleConfig(cfg, instance) {
  const err = (m) => { const e = new Error('config: ' + m); e.code = 'CONFIG'; return e; };
  const brut = cfg.formule === undefined ? {} : cfg.formule;
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) throw err('formule doit être un objet');
  if (brut.toutOuvert !== undefined && typeof brut.toutOuvert !== 'boolean') throw err('formule.toutOuvert doit être vrai ou faux');
  const toutOuvert = brut.toutOuvert === undefined ? instance === 'beta' : brut.toutOuvert;
  if (toutOuvert && instance !== 'beta') throw err('formule.toutOuvert est refusé en production (tout y serait Pro, sans paiement)');
  return { toutOuvert };
}

/* ⛔ LA FACTURATION (Stripe). Une valeur qui n'a pas de sens REFUSE le démarrage, comme les SMS et la sauvegarde — jamais une configuration à moitié posée (une clé sans tarif
   vendrait rien, des tarifs sans clé ne diraient pas pourquoi). La clé est RESTREINTE (Checkout, Customers, Subscriptions, portail) et propre à OP MESSAGES : une clé secrète
   complète (`sk_…`) donnerait au service tout le compte Stripe d'OP GESTION. La bêta n'accepte qu'une clé de TEST (« sans Stripe réel », SERVEUR.md § 3.9). */
const RE_CLE_STRIPE = new RegExp('^rk_(test|live)_[A-Za-z0-9]{8,200}$');
const RE_PRIX_STRIPE = /^price_[A-Za-z0-9]{8,100}$/;
const FACTURATION_DEFAUT = { relectureMs: 600000, timeoutMs: 10000 };
function facturationConfig(cfg, env, instance) {
  const err = (m) => { const e = new Error('config: ' + m); e.code = 'CONFIG'; return e; };
  const brut = cfg.facturation === undefined ? {} : cfg.facturation;
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) throw err('facturation doit être un objet');
  const o = { cle: null, mode: 'inerte', prix: {}, affichage: { mensuel: 15, annuel: 150 }, perso: { prix: {}, affichage: { mensuel: 5, annuel: 50 } }, relectureMs: FACTURATION_DEFAUT.relectureMs, timeoutMs: FACTURATION_DEFAUT.timeoutMs, testHote: null };
  const bornes = { relectureMs: [100, 3600000], timeoutMs: [200, 60000] };
  for (const [k, [min, max]] of Object.entries(bornes)) {
    if (brut[k] === undefined) continue;
    if (!Number.isInteger(brut[k]) || brut[k] < min || brut[k] > max) throw err('facturation.' + k + ' doit être un entier entre ' + min + ' et ' + max);
    o[k] = brut[k];
  }
  if (brut.prix !== undefined) {
    if (!brut.prix || typeof brut.prix !== 'object' || Array.isArray(brut.prix)) throw err('facturation.prix doit être un objet { mensuel, annuel }');
    for (const [k, v] of Object.entries(brut.prix)) {
      if (k !== 'mensuel' && k !== 'annuel') throw err('facturation.prix : seuls « mensuel » et « annuel » existent');
      if (typeof v !== 'string' || !RE_PRIX_STRIPE.test(v)) throw err('facturation.prix.' + k + ' doit être un identifiant de tarif Stripe (price_…)');
      o.prix[k] = v;
    }
  }
  if (brut.affichage !== undefined) {
    if (!brut.affichage || typeof brut.affichage !== 'object' || Array.isArray(brut.affichage)) throw err('facturation.affichage doit être un objet { mensuel, annuel }');
    for (const [k, v] of Object.entries(brut.affichage)) {
      if (k !== 'mensuel' && k !== 'annuel') throw err('facturation.affichage : seuls « mensuel » et « annuel » existent');
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 10000) throw err('facturation.affichage.' + k + ' doit être un nombre d\'euros entre 0 et 10 000');
      o.affichage[k] = v;
    }
  }
  /* ⛔ PERSO+ : le forfait d'une personne. Même validation que les tarifs d'espace, dans un bloc à part — et AUCUN tarif commun aux deux listes (un abonnement d'espace n'ouvrirait pas Perso+, mais deux listes qui
     partageraient un tarif rendraient la lecture ambiguë le jour où l'une des deux change de règle). */
  if (brut.perso !== undefined) {
    if (!brut.perso || typeof brut.perso !== 'object' || Array.isArray(brut.perso)) throw err('facturation.perso doit être un objet { prix, affichage }');
    for (const k of Object.keys(brut.perso)) if (k !== 'prix' && k !== 'affichage') throw err('facturation.perso : seuls « prix » et « affichage » existent');
    if (brut.perso.prix !== undefined) {
      if (!brut.perso.prix || typeof brut.perso.prix !== 'object' || Array.isArray(brut.perso.prix)) throw err('facturation.perso.prix doit être un objet { mensuel, annuel }');
      for (const [k, v] of Object.entries(brut.perso.prix)) {
        if (k !== 'mensuel' && k !== 'annuel') throw err('facturation.perso.prix : seuls « mensuel » et « annuel » existent');
        if (typeof v !== 'string' || !RE_PRIX_STRIPE.test(v)) throw err('facturation.perso.prix.' + k + ' doit être un identifiant de tarif Stripe (price_…)');
        if (Object.values(o.prix).includes(v)) throw err('facturation.perso.prix.' + k + ' est aussi un tarif de Messages Pro : un tarif ne sert qu\'à un forfait');
        o.perso.prix[k] = v;
      }
    }
    if (brut.perso.affichage !== undefined) {
      if (!brut.perso.affichage || typeof brut.perso.affichage !== 'object' || Array.isArray(brut.perso.affichage)) throw err('facturation.perso.affichage doit être un objet { mensuel, annuel }');
      for (const [k, v] of Object.entries(brut.perso.affichage)) {
        if (k !== 'mensuel' && k !== 'annuel') throw err('facturation.perso.affichage : seuls « mensuel » et « annuel » existent');
        if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 10000) throw err('facturation.perso.affichage.' + k + ' doit être un nombre d\'euros entre 0 et 10 000');
        o.perso.affichage[k] = v;
      }
    }
    if (Object.values(o.perso.prix).length === 2 && o.perso.prix.mensuel === o.perso.prix.annuel) throw err('facturation.perso.prix : le tarif mensuel et le tarif annuel sont le même');
  }
  if (brut.cle !== undefined && brut.cle !== null && brut.cle !== '') {
    if (typeof brut.cle !== 'string' || !RE_CLE_STRIPE.test(brut.cle)) throw err('facturation.cle doit être une clé RESTREINTE de Stripe (rk_test_… ou rk_live_…), propre à OP MESSAGES : une clé secrète complète est refusée');
    if (instance === 'beta' && !/^rk_test_/.test(brut.cle)) throw err('facturation.cle : la bêta n\'accepte qu\'une clé de TEST (rk_test_…) — pas de Stripe réel hors production');
    if (!Object.keys(o.prix).length) throw err('facturation.cle sans facturation.prix : aucun tarif à vendre (au moins « mensuel » ou « annuel »)');
    o.cle = brut.cle; o.mode = /^rk_test_/.test(brut.cle) ? 'test' : 'live';
  }
  /* ⛔ LA PORTE DE TEST DE STRIPE : redirige les appels vers UN faux Stripe en boucle locale (hôte et port exacts, http) pour que les bancs jouent un paiement sans réseau.
     Fermée en production, comme celle des codes SMS et du service push : une variable oubliée dans une unité systemd ne doit pas faire de ce service un client HTTP vers un port local. */
  const porte = env.OPMSG_TEST_STRIPE ? String(env.OPMSG_TEST_STRIPE) : null;
  if (porte && instance !== 'beta') throw err('OPMSG_TEST_STRIPE (porte de test de Stripe) est refusée en production');
  if (porte && !/^127\.0\.0\.1:\d{2,5}$/.test(porte)) throw err('OPMSG_TEST_STRIPE doit valoir 127.0.0.1:<port>');
  o.testHote = porte;
  return o;
}

/* ⛔ LES RÉUNIONS PROGRAMMÉES : le rythme du planificateur de rappels et la durée de son bail. EN PRODUCTION le planificateur passe toutes les 10 à 15 secondes — jamais plus vite (un
   réglage de banc qui s'y glisserait martèlerait la base) ni plus lentement (un rappel « 5 minutes avant » qui part avec une minute de retard n'en est plus un). La bêta et les bancs peuvent
   le presser (50 ms) ou l'endormir. Le bail doit durer au moins DEUX tours : un bail qui expire entre deux renouvellements laisserait une autre instance le prendre à chaque fois.
   ⛔ Le BUDGET d'un tour (`rappelsParTour`, `tourMaxMs`, `urgentesMax`) borne ce qu'UN tour fait avant de rendre la main : le planificateur est synchrone, un tour de trente secondes est un service
   qui ne répond plus pendant trente secondes. Au-delà de cinq secondes de temps réel le réglage serait lui-même le gel qu'il est censé empêcher : refusé. */
function reunionsConfig(cfg, instance) {
  const err = (m) => { const e = new Error('config: ' + m); e.code = 'CONFIG'; return e; };
  const brut = cfg.reunions === undefined ? {} : cfg.reunions;
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) throw err('reunions doit être un objet');
  const prod = instance === 'prod';
  const o = { planificateurMs: 12000, bailMs: 60000, rappelsParTour: 2000, tourMaxMs: 1000, urgentesMax: 2000 };
  const bornes = { planificateurMs: prod ? [10000, 15000] : [50, 300000], bailMs: [200, 600000], rappelsParTour: [1, 100000], tourMaxMs: [10, 5000], urgentesMax: [1, 100000] };
  for (const [k, [min, max]] of Object.entries(bornes)) {
    if (brut[k] === undefined) continue;
    if (!Number.isInteger(brut[k]) || brut[k] < min || brut[k] > max) throw err('reunions.' + k + ' doit être un entier entre ' + min + ' et ' + max + (prod && k === 'planificateurMs' ? ' en production (un rappel part avec dix à quinze secondes de retard au plus)' : ''));
    o[k] = brut[k];
  }
  if (o.bailMs < 2 * o.planificateurMs) throw err('reunions.bailMs doit durer au moins deux tours du planificateur (' + (2 * o.planificateurMs) + ' ms)');
  return o;
}

/* ⛔ LE COURRIEL (invitations aux réunions). SANS bloc, ou sans `hote`, il est INERTE et le dit : la page affiche « l'envoi par courriel n'est pas encore ouvert », rien ne part, rien n'est
   demandé à personne. Un bloc à moitié posé (un hôte sans adresse d'expédition, un identifiant sans mot de passe, un port absurde) REFUSE le démarrage, comme les SMS et la facturation.
   Le mot de passe du compte de messagerie se SAISIT par `configurer-courriel.js` (masqué), il ne se tape jamais à la main dans ce fichier ni ne s'affiche nulle part : `/api/config` ne
   publie que `courriel.ouvert`, `/health` rien, les journaux un état et un nombre.
   ⛔ EN PRODUCTION le canal est CHIFFRÉ (`ssl`, ou `starttls` exigé — jamais en clair) sauf vers un relais local (`127.0.0.1`, `localhost`) : un mot de passe d'application ne traverse pas Internet en clair. */
const RE_HOTE = /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/;
const RE_ADRESSE_MEL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const SECURITES = ['ssl', 'starttls', 'aucune'];
function courrielConfig(cfg, instance) {
  const err = (m) => { const e = new Error('config: ' + m); e.code = 'CONFIG'; return e; };
  const brut = cfg.courriel === undefined || cfg.courriel === null ? {} : cfg.courriel;
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) throw err('courriel doit être un objet');
  const inerte = { mode: 'inerte', hote: null, port: null, securite: null, utilisateur: null, motDePasse: null, de: null, nom: 'OP MESSAGES', timeoutMs: 15000 };
  if (brut.hote === undefined || brut.hote === null || brut.hote === '') {
    for (const k of ['port', 'securite', 'utilisateur', 'mot_de_passe', 'de']) if (brut[k] !== undefined && brut[k] !== null && brut[k] !== '') throw err('courriel.' + k + ' sans courriel.hote : un bloc à moitié posé refuse le démarrage');
    return inerte;
  }
  if (typeof brut.hote !== 'string' || !RE_HOTE.test(brut.hote)) throw err('courriel.hote doit être un nom d\'hôte (lettres, chiffres, points, tirets)');
  const o = Object.assign({}, inerte, { mode: 'smtp', hote: brut.hote });
  const securite = brut.securite === undefined ? 'starttls' : brut.securite;
  if (!SECURITES.includes(securite)) throw err('courriel.securite doit valoir ssl, starttls ou aucune');
  const local = o.hote === '127.0.0.1' || o.hote === 'localhost';
  if (securite === 'aucune' && instance === 'prod' && !local) throw err('courriel.securite « aucune » est refusée en production hors d\'un relais local : un mot de passe ne traverse pas Internet en clair');
  o.securite = securite;
  const port = brut.port === undefined ? (securite === 'ssl' ? 465 : securite === 'starttls' ? 587 : 25) : brut.port;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw err('courriel.port doit être un entier entre 1 et 65535');
  o.port = port;
  const texte = (k, max) => { const v = brut[k]; if (v === undefined || v === null || v === '') return null; if (typeof v !== 'string' || v.length > max || /[\u0000-\u001f\u007f]/.test(v)) throw err('courriel.' + k + ' doit être un texte d\'une ligne de ' + max + ' signes au plus'); return v; };
  o.utilisateur = texte('utilisateur', 200); o.motDePasse = texte('mot_de_passe', 500);
  if ((o.utilisateur === null) !== (o.motDePasse === null)) throw err('courriel.utilisateur et courriel.mot_de_passe vont ensemble (l\'un sans l\'autre ne ferait rien)');
  /* Le mot de passe se lit (`o.motDePasse`) mais ne se COPIE ni ne se SÉRIALISE : il n'est pas énumérable, donc un `JSON.stringify(config)`, un `Object.assign({}, config.courriel)` ou un
     `util.inspect` oublié dans un journal ne l'emportent pas. */
  Object.defineProperty(o, 'motDePasse', { value: o.motDePasse, enumerable: false, writable: false, configurable: false });
  const de = texte('de', 254);
  if (de === null || !RE_ADRESSE_MEL.test(de)) throw err('courriel.de doit être l\'adresse d\'expédition (nom@domaine) : sans elle, le courriel n\'a pas d\'expéditeur');
  o.de = de;
  const nom = texte('nom', 60); if (nom !== null) o.nom = nom;
  if (brut.timeoutMs !== undefined) { if (!Number.isInteger(brut.timeoutMs) || brut.timeoutMs < 1000 || brut.timeoutMs > 60000) throw err('courriel.timeoutMs doit être un entier entre 1000 et 60000'); o.timeoutMs = brut.timeoutMs; }
  return o;
}

/* ⛔ LES APPELS À DEUX (étape 7). Une valeur qui n'a pas de sens REFUSE le démarrage, comme les pièces et les réunions : un délai de sonnerie à zéro ferait « manquer » tout appel avant qu'il ait sonné, un
   plafond à dix mille laisserait une personne en faire sonner mille autres à l'heure.
   · `sonnerieMs` (45 s) : sans réponse au bout de ce délai, l'appel est « manqué » — par l'horloge du service, jamais celle de l'appareil. `perduMs` (45 s) : sans AUCUN signe d'un appareil lié (un signal,
     dont le pouls que la page envoie toutes les 15 s), l'appel finit « connexion perdue » — c'est ce qui borne un appareil qui disparaît en plein appel (page tuée, réseau coupé), qu'aucune connexion
     fermée ne dit toujours. `balayageMs` : le rythme du balayeur d'appels (sonneries échues, appareils perdus) ; EN PRODUCTION entre 0,5 et 10 s, la bêta et les bancs peuvent le presser.
   · `parHeure` (30 appels lancés par heure et par personne, SERVEUR.md § 3.6, divisé par trois pour un compte de moins de 24 h) et `parPaireHeure` (6 vers la MÊME personne : sonner trente fois chez quelqu'un
     est du harcèlement, pas de l'usage) ; `entrantsParHeure` (30 appels REÇUS par heure et par personne appelée, tous appelants confondus : plusieurs comptes qui appellent la même personne ne sont pas arrêtés par
     les plafonds de chaque appelant ; l'appelant qui se heurte à ce plafond lit que la personne reçoit beaucoup d'appels, SERVEUR.md § 5, question 33) ; `signalMax` signaux par appel et par participant dans `signalFenetreMs` ; `iceParHeure` : combien de fois par heure une personne demande des identifiants de relais.
   · `historiqueJours` (180) : un appel plus ancien est effacé ; `listeMax` (100) : les lignes de l'historique rendues d'un coup.
   · LES SALLES (étape 8, la maille) : `maxVideo` (4) et `maxAudio` (6) — combien de personnes une salle porte, dans le type où elle a été ouverte : ce que la maille tient sur des téléphones (SERVEUR.md § 3.5, à mesurer
     sur de vrais appareils) ; `groupeInvitesMax` (12) : le plus de personnes qu'un appel de groupe fait SONNER d'un coup (un groupe plus grand ne lance pas d'appel : 409 `groupe_trop_grand`) ; `groupeSignalMax` (600
     par minute et par participant : une maille de six ouvre cinq liaisons, chacune négocie et envoie ses candidats) ; `salleEvtMax` (120 gestes éphémères par minute et par participant : main, réaction, état, sondage) ;
     `reunionAvantMin` (15) et `reunionApresMin` (180) : on entre dans la salle d'une réunion programmée de quinze minutes avant son début à trois heures après sa fin.
   · `relais` : le relais d'appel (coturn). SANS ce bloc, il n'y a pas de relais et la page le DIT ; JAMAIS de serveur STUN d'un tiers (Google…) en repli — rien ne sort de nos machines.
     `secret` : le secret PARTAGÉ avec coturn (`static-auth-secret`), posé par `install-turn.sh` sur le VPS sans jamais s'afficher ; il se lit (`relais.secret`) mais ne se COPIE ni ne se SÉRIALISE (propriété
     non énumérable, comme le mot de passe du relais SMTP) et aucune erreur de configuration ne le cite. `hote` : le nom du relais (`turn.teamop.fr`) ; `port` (3478, UDP et TCP) ; `portTls` (5349) ou absent :
     pas de `turns:` (le certificat n'a pas pu être obtenu) ; `ttlS` : la durée de vie d'un identifiant — QUINZE MINUTES (900), entre une minute et une heure : un identifiant vole en une requête, et coturn ne
     le re-vérifie jamais sur une allocation déjà ouverte (mesuré) ; la page les renouvelle aux trois quarts de leur vie, tant que l'appel court. */
const APPELS_DEFAUT = { sonnerieMs: 45000, perduMs: 45000, balayageMs: 2000, historiqueJours: 180, listeMax: 100, parHeure: 30, parPaireHeure: 6, entrantsParHeure: 30, signalMax: 240, signalFenetreMs: 60000, iceParHeure: 120,
  maxVideo: 4, maxAudio: 6, groupeInvitesMax: 12, groupeSignalMax: 600, salleEvtMax: 120, reunionAvantMin: 15, reunionApresMin: 180 };
const RE_SECRET_RELAIS = /^[A-Za-z0-9_-]{32,128}$/;
function appelsConfig(cfg, instance) {
  const err = (m) => { const e = new Error('config: ' + m); e.code = 'CONFIG'; return e; };
  const brut = cfg.appels === undefined || cfg.appels === null ? {} : cfg.appels;
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) throw err('appels doit être un objet');
  const prod = instance === 'prod';
  const o = Object.assign({}, APPELS_DEFAUT, { relais: null });
  const bornes = { sonnerieMs: prod ? [20000, 120000] : [200, 300000], perduMs: prod ? [20000, 180000] : [200, 600000], balayageMs: prod ? [500, 10000] : [20, 60000], historiqueJours: [1, 3650], listeMax: [1, 500],
    parHeure: [1, 1000], parPaireHeure: [1, 100], entrantsParHeure: [1, 600], signalMax: [10, 2000], signalFenetreMs: [1000, 600000], iceParHeure: [1, 1000],
    maxVideo: [2, 8], maxAudio: [2, 12], groupeInvitesMax: [1, 30], groupeSignalMax: [10, 5000], salleEvtMax: [10, 1000], reunionAvantMin: [0, 120], reunionApresMin: [15, 1440] };
  for (const [k, [min, max]] of Object.entries(bornes)) {
    if (brut[k] === undefined) continue;
    if (!Number.isInteger(brut[k]) || brut[k] < min || brut[k] > max) throw err('appels.' + k + ' doit être un entier entre ' + min + ' et ' + max + (prod && (k === 'sonnerieMs' || k === 'perduMs' || k === 'balayageMs') ? ' en production' : ''));
    o[k] = brut[k];
  }
  if (o.perduMs < 2 * o.balayageMs) throw err('appels.perduMs doit durer au moins deux tours du balayeur (' + (2 * o.balayageMs) + ' ms)');
  const r = brut.relais;
  if (r !== undefined && r !== null) {
    if (typeof r !== 'object' || Array.isArray(r)) throw err('appels.relais doit être un objet { secret, hote, port, portTls }');
    if (typeof r.hote !== 'string' || !RE_HOTE.test(r.hote)) throw err('appels.relais.hote doit être un nom d\'hôte (lettres, chiffres, points, tirets)');
    /* ⛔ jamais la valeur dans le message : une erreur de configuration finit dans le journal du démarrage, que Justin recolle dans la conversation */
    if (typeof r.secret !== 'string' || !RE_SECRET_RELAIS.test(r.secret)) throw err('appels.relais.secret doit être un secret de 32 à 128 caractères (lettres, chiffres, tiret, soulignement) — il se pose par install-turn.sh');
    const port = r.port === undefined ? 3478 : r.port;
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw err('appels.relais.port doit être un entier entre 1 et 65535');
    let portTls = null;
    if (r.portTls !== undefined && r.portTls !== null) { if (!Number.isInteger(r.portTls) || r.portTls < 1 || r.portTls > 65535) throw err('appels.relais.portTls doit être un entier entre 1 et 65535'); portTls = r.portTls; }
    const ttlS = r.ttlS === undefined ? 900 : r.ttlS;
    if (!Number.isInteger(ttlS) || ttlS < 60 || ttlS > 3600) throw err('appels.relais.ttlS doit être un entier entre 60 et 3600');
    const relais = { hote: r.hote, port, portTls, ttlS };
    Object.defineProperty(relais, 'secret', { value: r.secret, enumerable: false, writable: false, configurable: false });
    o.relais = relais;
  }
  return o;
}

function charger(env = process.env) {
  const manque = (n) => { const e = new Error('config: ' + n + ' est obligatoire'); e.code = 'CONFIG'; return e; };
  const instance = env.OPMSG_INSTANCE;
  if (instance !== 'beta' && instance !== 'prod') { const e = new Error('config: OPMSG_INSTANCE doit valoir beta ou prod'); e.code = 'CONFIG'; throw e; }
  if (!env.OPMSG_CONFIG) throw manque('OPMSG_CONFIG');
  if (!env.OPMSG_DATA) throw manque('OPMSG_DATA');
  /* ⛔ LA GARDE D'ABORD — avant de lire la clé, avant de créer le moindre dossier. */
  verifierSeparation({ OPMSG_CONFIG: env.OPMSG_CONFIG, OPMSG_DATA: env.OPMSG_DATA, CREDENTIALS_DIRECTORY: env.CREDENTIALS_DIRECTORY });
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(env.OPMSG_CONFIG, 'utf8')); }
  catch (e) { const er = new Error('config: ' + (e && e.code === 'ENOENT' ? 'fichier introuvable' : 'fichier illisible ou JSON invalide')); er.code = 'CONFIG'; throw er; }
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) { const e = new Error('config: le fichier doit contenir un objet JSON'); e.code = 'CONFIG'; throw e; }
  const kek = lireCle(env.CREDENTIALS_DIRECTORY);
  const port = parseInt(env.PORT || '8091', 10);
  if (!(port > 0 && port < 65536)) { const e = new Error('config: PORT invalide'); e.code = 'CONFIG'; throw e; }
  /* ⛔ LA PORTE DE TEST DES CODES SMS : un fichier où le service écrit le code EN CLAIR, pour que les bancs jouent une inscription sans
     prestataire. Elle est FERMÉE en production : une variable d'environnement oubliée dans une unité systemd ne doit pas écrire des codes
     de connexion en clair sur le disque — le démarrage est refusé, avant toute création de dossier. */
  const testCodes = env.OPMSG_TEST_CODES ? path.resolve(String(env.OPMSG_TEST_CODES)) : null;
  if (testCodes && instance !== 'beta') { const e = new Error('config: OPMSG_TEST_CODES (porte de test des codes SMS) est refusée en production'); e.code = 'CONFIG'; throw e; }
  const cookie = Object.assign({ nom: '__Host-opm', secure: true }, cfg.cookie || {});
  /* Le préfixe __Host- impose Secure : un cookie « __Host-… » sans Secure est refusé par le
     navigateur, donc personne ne pourrait se connecter. On le refuse ICI plutôt qu'en production. */
  if (/^__Host-/.test(cookie.nom) && !cookie.secure) { const e = new Error('config: un cookie __Host- exige secure:true'); e.code = 'CONFIG'; throw e; }
  return {
    instance, port, kek,
    dataDir: path.resolve(env.OPMSG_DATA),
    sha: String(env.OPMSG_SHA || '').replace(/[^0-9a-zA-Z._-]/g, '').slice(0, 64) || 'inconnu',
    origines: origines(cfg),
    cookie,
    beta: Object.assign({ urlGestion: 'http://127.0.0.1:8080', relectureMs: 60000, timeoutMs: 5000 }, cfg.beta || {}),
    quotas: cfg.quotas && typeof cfg.quotas === 'object' ? cfg.quotas : {},
    pieces: piecesConfig(cfg.pieces),
    push: pushConfig(cfg, env, instance),
    compte: compteConfig(cfg.compte),
    formule: formuleConfig(cfg, instance),
    facturation: facturationConfig(cfg, env, instance),
    reunions: reunionsConfig(cfg, instance),
    appels: appelsConfig(cfg, instance),
    courriel: courrielConfig(cfg, instance),
    sms: cfg.sms && typeof cfg.sms === 'object' && !Array.isArray(cfg.sms) ? cfg.sms : {},   // validée par `lireConfigSms` (sms-garde.js)
    sauvegarde: cfg.sauvegarde === undefined ? null : cfg.sauvegarde,   // validée par `lireConfigSauvegarde` (sauvegarde.js) : absente = module inerte, invalide = démarrage refusé
    testCodes: testCodes,
    disqueMinMo: Number.isFinite(cfg.disqueMinMo) ? cfg.disqueMinMo : 512,
    pulsationMs: Number.isFinite(cfg.pulsationMs) ? cfg.pulsationMs : 20000,
    presenceGraceMs: Number.isFinite(cfg.presenceGraceMs) ? cfg.presenceGraceMs : 20000,
    balayageMs: Number.isFinite(cfg.balayageMs) ? cfg.balayageMs : 60000,
    minClient: Number.isInteger(cfg.minClient) ? cfg.minClient : 1,
    /* les inscriptions par adresse e-mail (« comme Discord ») : FERMÉES sauf `true` écrit dans le fichier — un geste de Justin, jamais une valeur par défaut */
    inscriptionCourriel: cfg.inscriptionCourriel === true,
  };
}

module.exports = { charger, verifierSeparation, lireCle, piecesConfig, pushConfig, compteConfig, formuleConfig, facturationConfig, reunionsConfig, appelsConfig, courrielConfig, RE_CLE_STRIPE, RE_ADRESSE_MEL, RE_SECRET_RELAIS, INTERDITS };
