/* ══ OP MESSAGES — LA SOURCE DE DONNÉES DU SERVICE ═══════════════════════════════════════════════════════════════════════════
   C'est le module qui REMPLACE `apercu/opmessages/source.js` dans la version servie par le service (`scripts/opmsg-public.js` copie
   l'interface de l'aperçu et ne change que cette pièce) : mêmes méthodes, mêmes formes, les écrans ne bougent pas. Il parle au
   service par `api.js` (le client : routes, en-têtes, codes de refus) et rien d'autre — jamais de `fetch` ici, jamais de jeton :
   la session est un cookie `HttpOnly` que le JavaScript ne voit pas.

   LE CONTRAT est celui de `apercu/opmessages/source.js` (en-tête de ce fichier), PLUS ce qu'un vrai service impose :
     demarrer()            → { connecte:true } | { connecte:false, motif, phrase } : lit la session (cookie), charge la personne, les contacts, la
                             liste, ouvre le flux. `connecte:false` + `motif:'session_requise'` n'est PAS une panne : personne n'est connecté.
     connexion(login,pass) → la personne (la porte bêta : l'identifiant et le mot de passe d'accès donnés par la Tour). La page repart de zéro ensuite.
     deconnexion()         → ferme la session côté service PUIS le flux ; si le service refuse, le flux reste ouvert et l'erreur se dit.
     surSessionMorte(cb)   → cb(motif) quand la session est morte (coupée, expirée) ou que la personne n'est plus la même : la page REPART DE ZÉRO.
     verifierSession()     → relit /api/moi : une autre personne ou plus de session déclenche `surSessionMorte`.
     capacites             → { service, connexion, photos, vocaux, fichiers, avatars, reglages, appels, reunions, actionsMessage, groupeInfos, liens, presence, saisie,
                               historique, texteMax } : ce que le service SAIT faire. Ce qu'il ne sait pas encore dit « bientôt » (les appels à plusieurs : `appelsGroupe`).
     personne(id)          → { id, nom, prenom, initiales, avatar, photo } d'une personne déjà vue (contact, membre, auteur), sinon null.
     répondre, modifier, supprimer, réagir, saisie, infos de groupe, liens de contact : voir plus bas.
   LES PIÈCES (étape 4). `envoyer(id, brouillon)` accepte aussi `{ photos:[{blob,url,w,h}] }`, `{ vocal:{blob,url,dur,bars} }` et `{ fichier:{blob,nom,taille} }` : chaque pièce est
   DÉPOSÉE (`POST /api/pieces`, corps binaire) puis le message la cite ; un envoi lent est dans la file locale, affiché « Envoi… », et un renvoi ne redépose pas ce qui l'est
   déjà. Un message rendu porte `photos:[{url,w,h,piece,etat}]`, `vocal:{url,dur,bars,piece}` ou `fichier:{nom,taille,piece}` : `url` est une adresse `blob:` FABRIQUÉE ICI
   (la pièce est lue par `GET /api/pieces/:id` puis gardée EN MÉMOIRE, jamais sur l'appareil), `null` tant qu'elle n'est pas arrivée (`etat` : 'chargement' | 'indisponible').
     pieceUrl(piece)       → l'adresse `blob:` d'une image ou d'un son (gardée en mémoire, rendue à la fermeture) ;  pieceBlob(piece) → le Blob d'un fichier (jamais gardé).
     ⛔ UNE PIÈCE QUE LE SERVICE REFUSE POUR L'INSTANT (429, 402 espace plein, 503 lecture seule, 408 envoi trop lent) RESTE dans le fil : son message en file porte `attente:true` et
     `echec:'<la phrase du service>'` (sans `envoi`), l'avis le dit aussi, et elle ne repart JAMAIS toute seule : `reessayer(cid)` → vrai si elle repart (même `cid`, pièces déjà déposées gardées),
     `abandonner(cid)` → vrai si elle quitte la file (son adresse locale est rendue). Un refus définitif (trop lourd, type refusé, plus le droit) la jette, avec son avis. Un message en file SANS
     `echec` attend le réseau : `envoi:true` seulement quand une requête part vraiment (« Envoi… »), une panne se dit UNE fois (événement 'avis'), les essais s'espacent (3 s, 6 s, 12 s, 24 s).
     `limitesPieces()` → { photo_max, vocal_max, fichier_max, avatar_max, par_message, quota } (octets, et le nombre de photos par message) ; plus de dix photos (le `par_message` du service, que `test-944` compare) : refus local 'trop-de-photos'.
     `moi()` porte `presence` (faux : MA présence est masquée — la barre de la page ne dit plus « Disponible »). Un nom de fichier long garde son extension (`couperNom`, 120 signes).
   LES RÉGLAGES (capacité `reglages`) : profil, majProfil, poserPhotoProfil, retirerPhotoProfil, confidentialite, majConfidentialite, bloques, bloquer, debloquer,
   deconnecterAutres, stockage, aPropos — voir plus bas. Chacun rend une promesse (sauf `bloques`) et lève une erreur qui se DIT.
   LES NOTIFICATIONS, L'EXPORT, LA SUPPRESSION (capacités `notifications` et `compte`) : notifEtat, notifActiver, notifDesactiver, notifApercu, notifEssai, sourdine, exporterDonnees,
   supprimerCompte. Le navigateur (Notification, PushManager, service worker) n'est JAMAIS touché ici directement : il passe par un adaptateur (`options.navigateur`), que le banc
   remplace. La page ACQUITTE ce qu'elle a montré (`POST /api/flux/ack`, seulement visible) pour que le service n'envoie pas une notification qui doublerait l'écran.
   LES ESPACES PROFESSIONNELS ET MESSAGES PRO (capacité `espaces`, étape 5) : espaces, espace, espaceCreer, espaceRenommer, espaceTransferer, espaceQuitter, espaceDissoudre, espaceContacts (« Contacts de
   l'entreprise » : les membres de MON espace, jamais un annuaire), membreRole, membreRetirer, invitationCreer, invitationsRevoquer, invitationLire, invitationAccepter, canalCreer, canalRenommer,
   canalSupprimer, canalAjouterMembres, canalRetirerMembre ; Messages Pro : abonnementOffres, abonnement (l'état, sans réseau), abonnementPayer et abonnementPortail (rendent l'adresse de Stripe,
   en https seulement), abonnementRelire (« J'ai réglé — vérifier » : relu chez Stripe). Une conversation de type 'canal' porte `espace` et `prive`. Un refus de fonction Pro garde sa forme
   (`ErreurApi.raison` : « impaye » ou « perso », que le seul administrateur reçoit).
   LES RÉUNIONS PROGRAMMÉES (capacité `reunions`, étape 6) : reunions(du, au) (l'agenda d'une fenêtre : chaque réunion avec ses occurrences), reunion(id) (la fiche : horaire, répétition, invités et
   leur réponse, MES rappels), programmer, modifierReunion, annulerReunion, supprimerReunion, inviterReunion, retirerInviteReunion, quitterReunion, repondreReunion, rappelsReunion ; adresseIcs(id, {occurrence}) (l'adresse
   du fichier .ics, que la page télécharge par un lien : le cookie de session suit) ; courrielOuvert() (vrai/faux, ou null si on n'a pas pu savoir) et courrielReunion(id, adresse, {occurrence}).
   Les heures se disent en millisecondes UTC (rendues) ou en heure LOCALE « 2026-10-26T14:00 » + un fuseau (envoyées) : le service fait autorité sur le fuseau. Les personnes d'une réunion sont des
   IDENTIFIANTS (la page les habille avec `personne(id)`, au moment de peindre : une photo arrivée après coup apparaît). Le fuseau de CET appareil est dit au service UNE fois par séance (quand la page
   ouvre l'agenda, programme, répond ou règle ses rappels) : les notifications de la personne se composent dans son fuseau.
   LES APPELS À DEUX (capacités `appels` et `appelsMedias`, étape 7) : appels(filtre) (l'historique : `manque` pour un entrant qu'on n'a pas pris, deux manqués d'affilée de la même personne ne font qu'une ligne
   `repetitions:2`), demarrerAppel({ membres:[<une personne>], video, conv }) (l'appel qui sonne chez l'autre), appel(id) (la vue de l'appel de CET onglet : `etat` 'sonne'|'en-cours'|'termine', `entrant` quand
   c'est à moi de répondre, `liaison` 'attente'|'etablissement'|'connecte'|'reconnexion'|'echec', `issue` et `avis` quand il est fini, la caméra de l'autre dans `membres[0].camera`), repondreAppel(id, accepte),
   terminerAppel(id) (raccrocher, annuler, refuser — idempotent), appelPistes(id, { audio, video }) (les pistes de la PAGE, remises au moteur), appelFlux(id) (le `MediaStream` de l'autre : sa voix, son image),
   appelActif() (l'appel qui sonne ou court dans CET onglet, ou null), appelFermeture() (la page se ferme : la liaison est coupée, le raccrochage part quand même). Un appel à plusieurs est refusé (`appel_a_deux`).
   Les événements de `ecouter(cb)` : 'liste', 'appels' (l'historique a changé), 'appel' (id : un appel a changé), 'appel-entrant' (id : il sonne pour moi), 'appel-flux' (id : l'autre a une piste de plus), 'reunions' (id, supprime : une réunion a changé, ici ou ailleurs), 'conversation' (id), 'contacts', 'espaces' (id : un espace a changé), 'presence', 'reseau' (etat), 'arrivee' (un message d'un autre : de quoi
   afficher une bannière), 'notification', 'retire' (id : la personne n'est plus dans cette conversation), 'avis' (texte : un refus arrivé après coup),
   'moi' (mon profil a changé : nom, statut ou photo, ici ou sur un autre appareil),
   'ouvrir' (conv, ou reunion : une notification touchée demande d'ouvrir cette conversation, ou la fiche de cette réunion).

   ⛔ TOUT REFUS SE DIT. Chaque appel qui échoue rend une `ErreurApi` d'`api.js` (`code`, `statut`, `retry`, `phrase()` en français, `dit:true`) ; les refus
   LOCAUX de ce module (message vide, trop long, « bientôt ») ont la même forme. Un écran n'a jamais à inventer une phrase pour un refus qu'il ne comprend pas.
   ⛔ UN ENVOI NE SE PERD PAS ET NE SE DOUBLE PAS. Un message qui part pendant une coupure (réseau, 5xx) reste dans une FILE locale, affiché « En attente »,
   et repart avec le MÊME `cid` à la reprise : le service ne crée jamais deux messages pour le même `cid`, donc une réponse perdue puis un renvoi ne font qu'un.
   ⛔ RIEN N'EST RANGÉ SUR L'APPAREIL : tout vit en mémoire. Un autre compte, dans le même onglet, ne peut rien y retrouver — et la page repart de zéro
   à la déconnexion (`location.replace`), ce module avec elle.
   ⛔ Un texte venu d'un tiers (nom, message, nom de fichier) est rendu TEL QUEL : l'échapper est le travail de l'écran. Ce module n'invente aucune adresse d'image :
   les seules adresses qu'il rend sont des `blob:` qu'il fabrique lui-même à partir d'un Blob LU du service (jamais une adresse venue du service).
   ⛔ RIEN N'EST RANGÉ SUR L'APPAREIL, PIÈCES COMPRISES : les adresses `blob:` vivent en mémoire, bornées (nombre et octets), libérées à la déconnexion et à l'arrêt. */
(function (racine) {
  'use strict';
  const MIN = 60000;

  /* Un refus qui ne vient pas du service mais de ce module : même forme qu'une `ErreurApi`. */
  const PHRASES_LOCALES = {
    vide: 'Le message est vide.',
    'trop-long': 'Ce message est trop long (8 000 signes au plus).',
    'trop-de-photos': '10 photos au plus par message : les autres n\'ont pas été envoyées.',
    bientot: 'Cette fonction arrive bientôt.',
    introuvable: 'Introuvable (la conversation a peut-être été supprimée ou tu n\'y es plus).',
    reunion_introuvable: 'Cette réunion n\'existe plus, ou tu n\'y es plus invité.',
    invalide: 'La demande est incorrecte.',
    appel_vide: 'Choisis un contact à appeler.',
    appel_navigateur: 'Ce navigateur ne sait pas passer d\'appels. Essaie avec une version récente de Chrome, Firefox, Edge ou Safari.',
    /* les notifications : chaque état où l'interrupteur ne peut pas tourner DIT pourquoi, et comment en sortir */
    notif_ios: 'Sur iPhone et iPad, les notifications ne marchent que depuis l\'écran d\'accueil : ajoute OP MESSAGES à l\'écran d\'accueil (Partager, puis « Sur l\'écran d\'accueil »), puis rouvre-le depuis son icône.',
    notif_navigateur: 'Ce navigateur ne sait pas recevoir de notifications. Essaie avec une version récente de Chrome, Firefox, Edge ou Safari.',
    notif_service: 'Les notifications ne sont pas disponibles pour le moment sur ce service.',
    notif_refusee: 'Ce navigateur a refusé les notifications pour OP MESSAGES. Pour les autoriser, ouvre les réglages du site dans le navigateur (le cadenas à côté de l\'adresse), autorise les notifications, puis reviens ici.',
    notif_sans_reponse: 'Tu n\'as pas répondu à la demande d\'autorisation : les notifications restent désactivées.',
    notif_abonnement: 'Ce navigateur n\'a pas pu s\'abonner au service de notification. Réessaie dans un moment.',
  };
  /* Le nom d'un compte supprimé : une espace INSÉCABLE, pour que « le prénom » (ce que la page garde avant la première espace) soit « Compte supprimé » tout entier. */
  const NOM_SUPPRIME = 'Compte\u00A0supprimé';
  const SOURDINES = { '8h': 8 * 3600000, '1s': 7 * 86400000, tj: 9 * 365 * 86400000, off: 0 };   // « toujours » = neuf ans (le service refuse plus de dix)
  const MOTIF_OUVRIR = /^\/#messages\/(c_[0-9a-f]{32})$/;
  const MOTIF_OUVRIR_REUNION = /^\/#reunions\/(r_[0-9a-f]{32})$/;
  const MOTIF_OUVRIR_APPELS = /^\/#appels$/;
  function erreurLocale(code) {
    const e = new Error(PHRASES_LOCALES[code] || PHRASES_LOCALES.invalide);
    e.name = 'ErreurLocale'; e.code = code; e.statut = 0; e.retry = 0; e.dit = true; e.phrase = () => e.message;
    return e;
  }

  const initialesDe = (nom) => {
    const mots = String(nom || '').trim().split(/\s+/).filter(Boolean);
    if (!mots.length) return '?';
    const a = Array.from(mots[0]), b = mots.length > 1 ? Array.from(mots[mots.length - 1]) : a.slice(1);
    return (a[0] + (b[0] || '')).toUpperCase();
  };
  const indexAvatar = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 6007; return h % 6; };
  const nomComplet = (p) => p ? ((p.prenom || '') + ' ' + (p.nom || '')).trim() || 'Quelqu\'un' : 'Quelqu\'un';
  const extrait = (t, n) => { const a = Array.from(String(t || '').replace(/\s+/g, ' ').trim()); return a.length > n ? a.slice(0, n).join('') + '…' : a.join(''); };
  /* Un nom de fichier coupé à `max` signes (points de code) EN GARDANT SON EXTENSION : « rapport-très-long….pdf » reste un pdf — sans elle le fichier téléchargé n'a plus de type (relecture du
     testeur). L'extension est bornée elle aussi (un point et 16 signes sans espace au plus) ; sans extension reconnaissable, ou si elle ne laisse pas de place au radical, on coupe simplement.
     ⛔ LA MÊME RÈGLE QUE LE SERVICE (`couperNom` de pieces.js) : `test-944` compare les deux sur une batterie de noms. */
  function couperNom(nom, max) {
    const signes = Array.from(String(nom));
    if (signes.length <= max) return signes.join('');
    const m = /\.[^.\s\/\\]{1,16}$/u.exec(signes.join(''));
    const ext = m ? Array.from(m[0]) : [];
    if (!ext.length || ext.length >= max) return signes.slice(0, max).join('');
    return signes.slice(0, signes.length - ext.length).slice(0, max - ext.length).join('') + ext.join('');
  }
  const duree = (s) => s % 86400 === 0 ? (s / 86400) + (s === 86400 ? ' jour' : ' jours') : s + ' s';

  /* ── Le navigateur, derrière un adaptateur (injectable : le banc le remplace). Rien ici ne s'exécute avant qu'on le demande. ── */
  const cleBinaire = (b64) => { const t = atob(String(b64).replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };
  const base64Url = (buf) => { const u = new Uint8Array(buf); let t = ''; for (const o of u) t += String.fromCharCode(o); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  function navigateurReel(w) {
    const nav = w.navigator, doc = w.document;
    const iOS = () => /iPad|iPhone|iPod/.test(nav.userAgent || '') || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    const autonome = () => { try { return nav.standalone === true || !!(w.matchMedia && w.matchMedia('(display-mode: standalone)').matches); } catch (e) { return false; } };
    return {
      /* → { ok } ou { ok:false, raison:'ios'|'navigateur' } : sur iPhone, une page dans Safari n'a ni PushManager ni Notification tant qu'elle n'est pas « ajoutée à l'écran d'accueil » */
      priseEnCharge() {
        if (nav.serviceWorker && w.PushManager && w.Notification && w.isSecureContext !== false) return { ok: true, raison: null };
        return { ok: false, raison: iOS() && !autonome() ? 'ios' : 'navigateur' };
      },
      permission: () => (w.Notification && w.Notification.permission) || 'default',
      demander() { return new Promise((ok, ko) => { try { const p = w.Notification.requestPermission(ok); if (p && typeof p.then === 'function') p.then(ok, ko); } catch (e) { ko(e); } }); },
      /* l'enregistrement du service worker (la portée est celle de l'origine) ; rend l'enregistrement PRÊT */
      async enregistrer() { await nav.serviceWorker.register('/sw.js', { scope: '/' }); return nav.serviceWorker.ready; },
      /* l'abonnement actuel de ce navigateur, SANS rien enregistrer : null s'il n'y en a pas */
      async abonnementActuel() { const reg = await nav.serviceWorker.getRegistration('/'); return reg ? reg.pushManager.getSubscription() : null; },
      async souscrire(reg, cle) { return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleBinaire(cle) }); },
      /* la clé publique avec laquelle un abonnement a été fait (base64 URL), ou null si le navigateur ne la dit pas */
      cleDe(sub) { try { const k = sub && sub.options && sub.options.applicationServerKey; return k ? base64Url(k) : null; } catch (e) { return null; } },
      visible: () => !doc || doc.visibilityState === 'visible',
      /* une notification d'appel (sonnerie, manqué) que la page vient de régler est retirée de l'écran : `tag` est celui du service (`appel:<identifiant>`) */
      async fermerNotifications(tag) {
        const reg = nav.serviceWorker && nav.serviceWorker.getRegistration ? await nav.serviceWorker.getRegistration('/') : null;
        if (!reg || typeof reg.getNotifications !== 'function') return;
        for (const n of await reg.getNotifications({ tag })) n.close();
      },
      /* ce que dit le service worker (« ouvre cette conversation » au toucher d'une notification) */
      surMessage(cb) { if (nav.serviceWorker && nav.serviceWorker.addEventListener) { nav.serviceWorker.addEventListener('message', (ev) => cb(ev && ev.data)); if (nav.serviceWorker.startMessages) nav.serviceWorker.startMessages(); } },
    };
  }

  /* ══ LES APPELS À DEUX — LE MOTEUR (étape 7) ═══════════════════════════════════════════════════════════════════════════════════════════════
     Le service met deux pages en relation (`server-msg/appels.js`) ; ce moteur est la moitié PAGE de la même conversation : il tient l'appel de CET onglet (un seul à la fois), parle au service par `api.js` et
     fait vivre la connexion pair à pair (`RTCPeerConnection`) : l'offre, la réponse, les candidats, le redémarrage, la veille. Les médias, eux, restent à la page (`getUserMedia`) : elle lui REMET ses pistes
     (`pistes`) et lit ce qui arrive de l'autre (`flux`). Le service ne voit jamais un octet de voix ni d'image.
     ⛔ RIEN ICI NE TOUCHE AU NAVIGATEUR : la connexion (`d.webrtc`), l'horloge et les minuteries sont données. C'est ce qui permet à `test-984` de le jouer dans Node contre le VRAI service avec une fausse
     connexion pair à pair, et à la sonde du navigateur de le rejouer avec la vraie.
     ⛔ UN ONGLET NE PORTE QUE L'APPEL QU'IL A LANCÉ OU QUE LUI A PRIS. Deux onglets d'un même navigateur partagent la session, donc reçoivent les mêmes événements ET les mêmes signaux : celui qui n'a pas répondu
     laisse sonner (puis dit « pris sur un autre appareil ») et ignore tout signal. Sans cela, deux onglets répondraient à la même offre.
     ⛔ L'APPELANT OFFRE, TOUJOURS. Deux offres ne se croisent jamais, et redémarrer la liaison est l'affaire de l'appelant seul (l'appelé répond à ce qu'on lui offre).
     ⛔ UN SIGNAL NE SE CROIT PAS SUR PAROLE : il vient de l'autre participant (le service ne le relaie qu'à l'appareil lié), mais sa forme, sa taille et son moment sont jugés ici ; un signal que le navigateur refuse
     ne défait pas l'appel (la veille dit si la liaison ne s'établit pas).
     ⛔ RIEN N'EST RANGÉ : ni identifiants du relais (redemandés à chaque appel, une heure de vie), ni adresses réseau. Les candidats vont à l'autre par le service, ne sont pas gardés. */
  const SDP_MAX = 12000;
  const SCHEMA_ICE = /^(stun|turn|turns):[A-Za-z0-9.\-_\[\]:%]{1,200}(\?transport=(udp|tcp))?$/;
  /* les serveurs de relais que le service annonce, jugés avant d'être donnés au navigateur : un schéma connu, une taille bornée — jamais une adresse d'un autre genre */
  function serveursSurs(l) {
    const out = [];
    for (const s of (Array.isArray(l) ? l : []).slice(0, 6)) {
      if (!s || typeof s !== 'object') continue;
      const urls = (Array.isArray(s.urls) ? s.urls : typeof s.urls === 'string' ? [s.urls] : []).filter((u) => typeof u === 'string' && u.length <= 220 && SCHEMA_ICE.test(u)).slice(0, 6);
      if (!urls.length) continue;
      const x = { urls };
      if (typeof s.username === 'string' && s.username.length <= 200) x.username = s.username;
      if (typeof s.credential === 'string' && s.credential.length <= 200) x.credential = s.credential;
      out.push(x);
    }
    return out;
  }
  /* un candidat venu de l'autre (ou du navigateur) : quatre champs, de type et de taille connus, ou rien */
  function candidatSur(x) {
    if (!x || typeof x !== 'object' || typeof x.candidate !== 'string' || !x.candidate || x.candidate.length > 1000) return null;
    const c = { candidate: x.candidate };
    if (typeof x.sdpMid === 'string' && x.sdpMid.length <= 64) c.sdpMid = x.sdpMid; else if (x.sdpMid === null) c.sdpMid = null;
    if (Number.isInteger(x.sdpMLineIndex) && x.sdpMLineIndex >= 0 && x.sdpMLineIndex < 8) c.sdpMLineIndex = x.sdpMLineIndex;
    if (typeof x.usernameFragment === 'string' && x.usernameFragment.length <= 64) c.usernameFragment = x.usernameFragment;
    return c;
  }
  /* la connexion pair à pair du navigateur — null quand il n'en a pas (le moteur le dit : `appel_navigateur`) */
  function webrtcReel(w) { return { RTCPeerConnection: w.RTCPeerConnection || w.webkitRTCPeerConnection || null, MediaStream: w.MediaStream || null }; }
  const CODES_APPEL_FINI = ['appel_fini', 'introuvable', 'appareil_non_lie', 'appel_pas_en_cours'];
  const CODES_RESEAU = ['reseau', 'serveur', 'erreur_interne'];

  function creerMoteurAppels(d) {
    /* les délais : `pouls` (le signe de vie que le service attend, bien avant ses 45 s), `candidats` (les candidats partent par paquets), `veille` (une liaison qui ne s'établit pas dans ce temps est un échec),
       `deconnecte` (une coupure brève se rétablit seule avant qu'on relance), `reessai` (une offre ou une réponse perdue repart), `iceMax` (les identifiants du relais ne retardent jamais un appel au-delà),
       `renouv`/`renouvMin` (les identifiants du relais durent une heure : un appel plus long les renouvelle aux trois quarts de leur vie), `quitter` (un raccrochage perdu repart), `marge` (après la fin annoncée
       de la sonnerie, on relit l'état au service plutôt que de laisser sonner un écran) */
    const T = Object.assign({ pouls: 15000, candidats: 60, veille: 30000, deconnecte: 6000, reessai: [600, 1800], iceMax: 4000, renouv: 0.75, renouvMin: 30000, quitter: [500, 1500], marge: 3000, nettoyage: 60000 }, d.delais || {});
    const planifier = d.planifier, annuler = d.annuler, maintenant = d.maintenant;
    const pause = (ms) => new Promise((ok) => planifier(ok, ms));
    let courant = null, lancement = false;
    const dernieres = new Map();           // id d'appel → la dernière vue lue sur le flux : un événement qui devance la réponse de la route n'est pas perdu
    const memoriser = (v) => { dernieres.delete(v.id); dernieres.set(v.id, v); while (dernieres.size > 8) dernieres.delete(dernieres.keys().next().value); };
    const emettreAppel = (c) => d.emettre({ type: 'appel', id: c.id });

    function entree(v, extra) {
      return Object.assign({
        id: v.id, vue: v, role: v.sens === 'sortant' ? 'appelant' : 'appele',
        local: false, accepte: false, reponse: false, demarrage: false, relance: false, etablie: false,
        pc: null, pret: false, conf: null, serveurs: [], relais: false, ttl: 0, promesseIce: null,
        file: [], candDistants: [], candLocaux: [], chaineIn: Promise.resolve(), chaineOut: Promise.resolve(),
        pistes: { audio: null, video: null }, emetteurs: { audio: null, video: null }, cameraDite: null,
        flux: null, distantCamera: false, liaison: 'attente', derniereOffre: null,
        debut: null, fini: null, serviceInforme: false, informe: null, terminaison: null,
        minPouls: null, minCands: null, minVeille: null, minDeconnecte: null, minRenouv: null, minSonnerie: null, minNettoyage: null,
      }, extra || {});
    }
    function noterAutre(v) { if (v && v.autre && typeof v.autre.id === 'string') d.noter(v.autre); }
    function autreVue(c) {
      const a = c.vue.autre;
      if (!a || typeof a.id !== 'string') return { id: null, nom: d.nomSupprime, prenom: d.nomSupprime, initiales: '?', avatar: 0, photo: null, supprime: true };
      return d.personne(a.id) || { id: a.id, nom: 'Quelqu\'un', prenom: 'Quelqu\'un', initiales: '?', avatar: 0, photo: null };
    }
    function dureeFinale(c) {
      const v = c.vue;
      if (v.etat !== 'sonne' && v.etat !== 'en_cours' && v.repondu !== null && Number.isInteger(v.duree_s)) return v.duree_s;
      return c.debut ? Math.max(0, Math.round(((c.fini ? c.fini.t : maintenant()) - c.debut) / 1000)) : 0;
    }
    /* → ce que la page lit (`source.appel(id)`) : le contrat de l'aperçu, PLUS ce qu'un vrai appel ajoute (`sens`, `entrant`, `liaison`, `issue`, `avis`, `relais`) */
    function instantane(c) {
      const v = c.vue, p = autreVue(c), fini = !!c.fini;
      const entrant = !fini && c.role === 'appele' && v.etat === 'sonne' && !c.accepte;
      const etat = fini ? 'termine' : v.etat === 'en_cours' ? 'en-cours' : 'sonne';
      return {
        id: c.id, etat, type: v.type, groupe: false, conv: null, nom: p.nom, court: p.nom, initiales: p.initiales, avatar: p.avatar, photo: p.photo,
        membres: [{ id: p.id, nom: p.nom, prenom: p.prenom, initiales: p.initiales, avatar: p.avatar, etat: etat === 'sonne' && !entrant ? 'sonne' : 'connecte', camera: !fini && c.distantCamera }],
        debut: c.debut, fin: fini ? c.fini.t : null, duree: fini ? dureeFinale(c) : (c.debut ? Math.max(0, Math.round((maintenant() - c.debut) / 1000)) : 0),
        sens: c.role === 'appelant' ? 'sortant' : 'entrant', entrant, liaison: fini ? 'fini' : c.liaison, issue: fini ? c.fini.issue : null, avis: fini ? c.fini.avis : null, relais: c.relais,
      };
    }
    function enregistrement(c) {
      const v = c.vue, p = autreVue(c);
      return { id: c.id, type: v.type, sens: c.role === 'appelant' ? 'sortant' : 'entrant', groupe: false, conv: null, membres: p.id ? [p.id] : [], nom: p.nom, court: p.nom, initiales: p.initiales, avatar: p.avatar, photo: p.photo, repetitions: 1, t: v.debut, duree: dureeFinale(c) };
    }

    /* ── ce qu'on dit quand un appel finit autrement que par un geste de la personne ── */
    function phraseFin(c, issue) {
      const sortant = c.role === 'appelant', p = autreVue(c);
      switch (issue) {
        case 'refuse': return sortant ? p.nom + ' a refusé l\'appel.' : null;
        case 'manque': return sortant ? 'Pas de réponse.' : 'Appel manqué.';
        case 'annule': return sortant ? null : 'Appel manqué.';
        case 'occupe': return sortant ? p.nom + ' est déjà dans un appel.' : null;
        case 'perdu': return 'La connexion a été perdue.';
        case 'compte': return 'L\'appel a pris fin.';
        case 'pris_ailleurs': return 'Cet appel a été pris sur un autre de tes appareils.';
        case 'echec': return 'La connexion n\'a pas pu s\'établir. Vérifie ta connexion, puis réessaie.';
        default: return null;
      }
    }
    const issueDe = (v) => v.etat === 'fini' ? (v.motif === 'perdu' ? 'perdu' : v.motif === 'compte' ? 'compte' : 'fini') : v.etat;

    /* ── la fin : TOUT ce qui tient l'appel est lâché ici, d'un coup, de façon synchrone (la connexion fermée, les minuteries arrêtées) — le service l'apprend ensuite (`informer`) ── */
    function liberer(c) {
      for (const k of ['minPouls', 'minCands', 'minVeille', 'minDeconnecte', 'minRenouv', 'minSonnerie']) if (c[k]) { annuler(c[k]); c[k] = null; }
      const pc = c.pc;
      c.pc = null; c.pret = false; c.file = []; c.candDistants = []; c.candLocaux = []; c.emetteurs = { audio: null, video: null }; c.flux = null;
      if (pc) {
        pc.onicecandidate = null; pc.ontrack = null; pc.oniceconnectionstatechange = null;
        try { pc.close(); } catch (e) { /* déjà fermée */ }
      }
    }
    /* `opts` : { vue (la vue finale du service), avis (null = rien à dire ; absent = la phrase de l'issue), service (vrai : le service sait déjà que l'appel est fini) } */
    function finir(c, issue, opts) {
      if (c.fini) return false;
      const o2 = opts || {};
      if (o2.vue) c.vue = o2.vue;
      liberer(c);
      c.liaison = 'fini';
      c.fini = { issue, avis: o2.avis === undefined ? phraseFin(c, issue) : o2.avis, t: maintenant() };
      if (o2.service) c.serviceInforme = true;
      c.minNettoyage = planifier(() => { c.minNettoyage = null; if (courant === c) courant = null; }, T.nettoyage);
      if (d.fermerNotif) { try { d.fermerNotif('appel:' + c.id); } catch (e) { /* une notification qui reste n'est pas un appel qui dure */ } }
      emettreAppel(c);
      d.emettre({ type: 'appels' });
      return true;
    }
    /* Le service apprend la fin (un raccrochage perdu repart deux fois). Rend la vue finale, ou null. Rien à envoyer quand c'est lui qui l'a dite. */
    function informer(c) {
      if (c.serviceInforme) return Promise.resolve(null);
      if (!c.informe) {
        c.informe = (async () => {
          for (let n = 0; ; n++) {
            try { const r = await d.api.quitterAppel(c.id); c.serviceInforme = true; if (r && r.appel) c.vue = r.appel; return r && r.appel ? r.appel : null; }
            catch (e) {
              if (e && CODES_APPEL_FINI.includes(e.code)) { c.serviceInforme = true; return null; }
              if (n >= T.quitter.length || !e || !CODES_RESEAU.includes(e.code)) return null;        // le pouls manquera : le service y mettra fin de lui-même
              await pause(T.quitter[n]);
            }
          }
        })();
      }
      return c.informe;
    }

    /* ── les signaux sortants : dans l'ordre, un à la fois (une offre part toujours avant les candidats qui la suivent) ── */
    function signaler(c, type, donnees, important) {
      const autre = c.vue.autre && c.vue.autre.id;
      if (!autre) return Promise.resolve(false);
      const essai = async (n) => {
        try { await d.api.signalAppel(c.id, autre, type, donnees); return true; }
        catch (e) {
          if (c.fini) return false;
          if (e && CODES_APPEL_FINI.includes(e.code)) { relireActif(); return false; }
          if (important && n < T.reessai.length && e && CODES_RESEAU.includes(e.code)) { await pause(T.reessai[n]); return c.fini ? false : essai(n + 1); }
          return false;
        }
      };
      const p = c.chaineOut.then(() => essai(0));
      c.chaineOut = p.catch(() => false);
      return p;
    }
    function envoyerCandidats(c) {
      if (c.minCands || !c.pret) return;
      c.minCands = planifier(() => {
        c.minCands = null;
        if (c.fini || !c.pc) return;
        const liste = c.candLocaux.splice(0, 40);
        if (liste.length) signaler(c, 'candidats', { liste }, false);
        if (c.candLocaux.length) envoyerCandidats(c);
      }, T.candidats);
    }
    function envoyerEtatCamera(c) {
      const on = !!c.pistes.video;
      if (c.fini || !c.pret || c.cameraDite === on) return;
      c.cameraDite = on;
      signaler(c, 'etat', { camera: on }, false);
    }
    /* le pouls : un signe de vie toutes les `pouls` ms tant que l'appel est le nôtre — sans lui, le service met fin à l'appel « connexion perdue » au bout de 45 s */
    function armerPouls(c) {
      if (c.minPouls) annuler(c.minPouls);
      c.minPouls = planifier(async () => {
        c.minPouls = null;
        if (c.fini) return;
        const autre = c.vue.autre && c.vue.autre.id;
        try { if (autre) await d.api.signalAppel(c.id, autre, 'pouls'); }
        catch (e) { if (!c.fini && e && CODES_APPEL_FINI.includes(e.code)) { relireActif(); return; } }
        if (!c.fini) armerPouls(c);
      }, T.pouls);
    }
    /* ce que le service dit de l'appel qui sonne ou court : relu quand un événement a pu se perdre (la sonnerie devrait être finie, le flux est revenu, le service a demandé de tout relire) */
    async function relireActif() {
      let r;
      try { r = await d.api.appels('manques'); } catch (e) { return; }      // le réseau est coupé : on ne sait pas, on ne conclut rien
      if (!r || typeof r !== 'object') return;
      const c = courant;
      if (c && !c.fini) {
        if (r.actif && r.actif.id === c.id) { memoriser(r.actif); appliquer(c, r.actif); }
        else finir(c, c.vue.etat === 'sonne' ? (c.role === 'appelant' ? 'manque' : 'annule') : 'fini', { service: true });
      } else reprendre(r.actif);
    }

    /* ── la liaison pair à pair ── */
    function lireIce() {
      return new Promise((ok) => {
        let fait = false;
        const rendre = (x) => { if (fait) return; fait = true; annuler(h); ok(x || { serveurs: [], relais: false, ttl: 0, indisponible: true }); };
        const h = planifier(() => rendre(null), T.iceMax);
        Promise.resolve().then(() => d.api.ice()).then((r) => rendre({ serveurs: serveursSurs(r && r.serveurs), relais: !!(r && r.relais), ttl: r && Number.isInteger(r.ttl_s) && r.ttl_s > 0 ? r.ttl_s : 0 }), () => rendre(null));
      });
    }
    function creerPc(c) {
      const W = d.webrtc;
      const conf = { iceServers: c.serveurs, bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' };
      const pc = new W.RTCPeerConnection(conf);
      c.pc = pc; c.conf = conf;
      c.flux = typeof W.MediaStream === 'function' ? new W.MediaStream() : null;
      /* ⛔ DEUX ÉMETTEURS DÈS LE DÉBUT, DANS LES DEUX SENS : la caméra se met et s'enlève en cours d'appel par `replaceTrack`, sans nouvelle négociation (et un appel audio peut devenir vidéo) */
      for (const kind of ['audio', 'video']) {
        const tr = pc.addTransceiver(kind, { direction: 'sendrecv' });
        c.emetteurs[kind] = tr && tr.sender ? tr.sender : null;
      }
      pc.ontrack = (ev) => {
        if (c.pc !== pc || !ev || !ev.track || !c.flux) return;
        if (!c.flux.getTracks().includes(ev.track)) c.flux.addTrack(ev.track);          // un seul flux pour les deux pistes : l'autre n'associe aucun flux à ses émetteurs
        d.emettre({ type: 'appel-flux', id: c.id });
      };
      pc.onicecandidate = (ev) => {
        if (c.pc !== pc || c.fini) return;
        const x = ev && ev.candidate ? candidatSur(typeof ev.candidate.toJSON === 'function' ? ev.candidate.toJSON() : ev.candidate) : null;
        if (!x) return;                                                                  // la fin des candidats n'apprend rien à l'autre
        c.candLocaux.push(x);
        envoyerCandidats(c);
      };
      pc.oniceconnectionstatechange = () => surEtatIce(c, pc);
      return pc;
    }
    async function appliquerPistes(c) {
      for (const k of ['audio', 'video']) {
        const s = c.emetteurs[k], t = c.pistes[k] || null;
        if (!s || s.track === t) continue;
        try { await s.replaceTrack(t); } catch (e) { /* une piste que l'émetteur refuse ne coupe pas l'appel */ }
      }
    }
    function armerVeille(c) {
      if (c.minVeille || c.fini) return;
      c.minVeille = planifier(() => { c.minVeille = null; echec(c); }, T.veille);
    }
    /* la liaison ne s'établit pas (ou ne se rétablit pas) : l'appel est raccroché, et la personne l'apprend — jamais un écran qui attend pour toujours */
    function echec(c) {
      if (c.fini) return;
      c.liaison = 'echec';
      finir(c, 'echec', { avis: c.etablie ? 'La connexion a été perdue.' : undefined });
      informer(c);
    }
    function surEtatIce(c, pc) {
      if (c.pc !== pc || c.fini) return;
      const s = pc.iceConnectionState;
      if (s === 'connected' || s === 'completed') {
        if (c.minVeille) { annuler(c.minVeille); c.minVeille = null; }
        if (c.minDeconnecte) { annuler(c.minDeconnecte); c.minDeconnecte = null; }
        c.etablie = true;
        if (c.liaison !== 'connecte') { c.liaison = 'connecte'; emettreAppel(c); }
      } else if (s === 'disconnected' || s === 'failed') {
        if (c.etablie && c.liaison !== 'reconnexion') { c.liaison = 'reconnexion'; emettreAppel(c); }
        armerVeille(c);
        if (c.role !== 'appelant') return;                                               // l'appelé attend l'offre de l'appelant
        if (s === 'failed') relancer(c);
        else if (!c.minDeconnecte) c.minDeconnecte = planifier(() => { c.minDeconnecte = null; if (!c.fini && c.pc === pc && pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') relancer(c); }, T.deconnecte);
      }
    }
    async function offrir(c, relance, renouveler) {
      const pc = c.pc;
      if (!pc) return;
      const offre = await pc.createOffer(relance ? { iceRestart: true } : undefined);
      if (c.pc !== pc || c.fini) return;
      await pc.setLocalDescription(offre);
      const corps = { sdp: offre.sdp };
      if (renouveler) corps.renouveler = true;
      await signaler(c, 'offre', corps, true);
    }
    async function relancer(c) {
      if (c.fini || c.role !== 'appelant' || !c.pc || c.relance) return;
      c.relance = true;
      try { if (typeof c.pc.restartIce === 'function') c.pc.restartIce(); await offrir(c, true, false); }
      catch (e) { /* la veille tranche */ }
      finally { c.relance = false; }
    }
    /* les identifiants du relais durent une heure : un appel plus long les renouvelle aux trois quarts de leur vie. L'appelant les redemande, les donne à sa connexion, relance la liaison, et DIT à l'appelé de
       faire de même avant de répondre (`renouveler`) — sans quoi la nouvelle allocation naîtrait avec des identifiants qui meurent à l'heure. */
    async function renouvelerServeurs(c) {
      const ice = await lireIce();
      if (c.fini || !c.pc || ice.indisponible || !ice.serveurs.length) return false;
      c.serveurs = ice.serveurs; c.ttl = ice.ttl || c.ttl;
      try { if (typeof c.pc.setConfiguration === 'function') c.pc.setConfiguration(Object.assign({}, c.conf, { iceServers: ice.serveurs })); return true; }
      catch (e) { return false; }
    }
    function armerRenouvellement(c) {
      if (c.minRenouv || c.fini || c.role !== 'appelant' || !c.relais || !(c.ttl > 0)) return;
      c.minRenouv = planifier(async () => {
        c.minRenouv = null;
        if (c.fini || !c.pc) return;
        await renouvelerServeurs(c);
        if (c.fini || !c.pc) return;
        armerRenouvellement(c);
        try { if (typeof c.pc.restartIce === 'function') c.pc.restartIce(); await offrir(c, true, true); } catch (e) { /* la veille tranche */ }
      }, Math.max(T.renouvMin, Math.floor(c.ttl * 1000 * T.renouv)));
    }
    /* la liaison d'un appel qui court : l'appelant offre dès que l'autre a répondu, l'appelé attend l'offre (ce qui est arrivé avant que la liaison soit prête a été mis de côté) */
    async function demarrerLiaison(c) {
      if (c.pc || c.fini || c.demarrage) return;
      c.demarrage = true;
      c.liaison = 'etablissement';
      emettreAppel(c);
      armerVeille(c);
      try {
        if (!d.webrtc || typeof d.webrtc.RTCPeerConnection !== 'function') { echec(c); return; }
        const ice = await (c.promesseIce || (c.promesseIce = lireIce()));
        if (c.fini) return;
        c.serveurs = ice.serveurs; c.relais = ice.relais; c.ttl = ice.ttl;
        creerPc(c);
        await appliquerPistes(c);
        if (c.fini) return;
        c.pret = true;
        armerRenouvellement(c);
        for (const s of c.file.splice(0)) enfiler(c, s);
        envoyerCandidats(c);
        if (c.role === 'appelant') await offrir(c, false, false);
        envoyerEtatCamera(c);
      } catch (e) { if (!c.fini) echec(c); }
      finally { c.demarrage = false; }
    }

    /* ── les signaux entrants ── */
    function traiterEtat(c, x) {
      if (x && typeof x === 'object' && typeof x.camera === 'boolean' && x.camera !== c.distantCamera) { c.distantCamera = x.camera; emettreAppel(c); }
    }
    function surSignal(s) {
      if (!s || typeof s !== 'object' || typeof s.appel !== 'string' || typeof s.type !== 'string') return;
      const c = courant;
      if (!c || c.fini || c.id !== s.appel || !(c.local || c.accepte)) return;          // pas le nôtre : ni cet appel, ni cet onglet
      const de = c.vue.autre && c.vue.autre.id;
      if (!de || s.de !== de) return;
      if (s.type === 'etat') { traiterEtat(c, s.donnees); return; }
      if (s.type !== 'offre' && s.type !== 'reponse' && s.type !== 'candidats') return;
      if (!c.pret) { if (c.file.length < 200) c.file.push(s); return; }
      enfiler(c, s);
    }
    function enfiler(c, s) { c.chaineIn = c.chaineIn.then(() => traiter(c, s)).catch(() => {}); }
    async function ajouterCandidat(c, cd) { try { await c.pc.addIceCandidate(cd); } catch (e) { /* un candidat que le navigateur refuse (liaison relancée, adresse inconnue) n'en défait pas d'autres */ } }
    async function viderCandidats(c) { for (const cd of c.candDistants.splice(0)) { if (!c.pc) return; await ajouterCandidat(c, cd); } }
    async function traiter(c, s) {
      const pc = c.pc;
      if (c.fini || !pc) return;
      const x = s.donnees && typeof s.donnees === 'object' && !Array.isArray(s.donnees) ? s.donnees : {};
      try {
        if (s.type === 'offre') {
          if (c.role !== 'appele' || typeof x.sdp !== 'string' || !x.sdp || x.sdp.length > SDP_MAX || x.sdp === c.derniereOffre) return;
          c.derniereOffre = x.sdp;
          if (x.renouveler === true && c.relais) await renouvelerServeurs(c);
          if (c.pc !== pc || c.fini) return;
          await pc.setRemoteDescription({ type: 'offer', sdp: x.sdp });
          await viderCandidats(c);
          const rep = await pc.createAnswer();
          if (c.pc !== pc || c.fini) return;
          await pc.setLocalDescription(rep);
          await signaler(c, 'reponse', { sdp: rep.sdp }, true);
        } else if (s.type === 'reponse') {
          if (c.role !== 'appelant' || typeof x.sdp !== 'string' || !x.sdp || x.sdp.length > SDP_MAX || pc.signalingState !== 'have-local-offer') return;
          await pc.setRemoteDescription({ type: 'answer', sdp: x.sdp });
          await viderCandidats(c);
        } else if (s.type === 'candidats') {
          const liste = (Array.isArray(x.liste) ? x.liste : []).slice(0, 64).map(candidatSur).filter(Boolean);
          for (const cd of liste) {
            if (c.pc !== pc) return;
            if (pc.remoteDescription) await ajouterCandidat(c, cd);
            else if (c.candDistants.length < 200) c.candDistants.push(cd);
          }
        }
      } catch (e) { /* un signal que le navigateur refuse ne défait pas l'appel : la veille dit si la liaison ne s'établit pas */ }
    }

    /* ── les changements d'état que le service dit ── */
    function sonner(v, gid) {
      noterAutre(v);
      const c = entree(v);
      courant = c;
      c.minSonnerie = planifier(() => { c.minSonnerie = null; relireActif(); }, Math.max(1000, (v.sonne_jusqua - v.debut) || 0) + T.marge);
      if (Number.isInteger(gid)) d.acquitter(gid);          // la sonnerie est sous les yeux de la personne (page visible) : le service n'enverra pas de notification qui la doublerait
      d.emettre({ type: 'appel-entrant', id: c.id });
      emettreAppel(c);
    }
    function appliquer(c, v) {
      if (c.fini) return;
      c.vue = v;
      noterAutre(v);
      if (v.etat === 'sonne') { emettreAppel(c); return; }
      if (v.etat === 'en_cours') {
        if (c.minSonnerie) { annuler(c.minSonnerie); c.minSonnerie = null; }
        if (c.role === 'appelant' && c.local) {
          if (!c.debut) c.debut = maintenant();
          if (!c.pc && !c.demarrage) demarrerLiaison(c);
        } else if (c.role === 'appele' && c.accepte) {
          if (!c.debut) c.debut = maintenant();
        } else { finir(c, 'pris_ailleurs', { service: true }); return; }
        emettreAppel(c);
        return;
      }
      finir(c, issueDe(v), { vue: v, service: true });
    }
    function surAppel(v, gid) {
      if (!v || typeof v !== 'object' || typeof v.id !== 'string') return;
      memoriser(v);
      const c = courant && courant.id === v.id ? courant : null;
      if (c) { appliquer(c, v); return; }
      /* un appel que cet onglet ne tient pas : seule une sonnerie ENTRANTE à laquelle aucun appareil n'a répondu sonne ici, et pas quand on est déjà dans un appel */
      if (v.etat === 'sonne' && v.sens === 'entrant' && !v.lie && (!courant || courant.fini)) sonner(v, gid);
    }
    function reprendre(actif) {
      if (!actif || typeof actif !== 'object' || typeof actif.id !== 'string') return;
      memoriser(actif);
      if (courant && !courant.fini) { if (courant.id === actif.id) appliquer(courant, actif); return; }
      if (actif.etat === 'sonne' && actif.sens === 'entrant' && !actif.lie) sonner(actif, null);
    }

    /* ── les gestes de la personne ── */
    async function lancer(spec) {
      spec = spec || {};
      const ids = (Array.isArray(spec.membres) ? spec.membres : []).filter((x, i, t) => typeof x === 'string' && t.indexOf(x) === i);
      const conv = typeof spec.conv === 'string' && spec.conv ? spec.conv : null;
      if (ids.length > 1) throw d.refus('appel_a_deux', 409);
      if (!ids.length && !conv) throw d.erreurLocale('appel_vide');
      if (!d.webrtc || typeof d.webrtc.RTCPeerConnection !== 'function') throw d.erreurLocale('appel_navigateur');
      if (lancement || (courant && !courant.fini)) throw d.refus('occupe', 409, { moi: true });
      lancement = true;
      try {
        const r = await d.api.lancerAppel(Object.assign({ type: spec.video ? 'video' : 'audio' }, conv ? { conv } : { uid: ids[0] }));
        const v = r.appel;
        noterAutre(v);
        const c = entree(v, { local: true, accepte: true });
        courant = c;
        c.promesseIce = lireIce();
        armerPouls(c);
        c.minSonnerie = planifier(() => { c.minSonnerie = null; relireActif(); }, Math.max(1000, (v.sonne_jusqua - v.debut) || 0) + T.marge);
        const tard = dernieres.get(v.id);
        if (tard && tard !== v && tard.etat !== 'sonne') appliquer(c, tard);            // l'autre a répondu avant que la réponse de la route nous arrive
        return instantane(c);
      } finally { lancement = false; }
    }
    async function repondre(id, accepte) {
      const c = courant;
      if (!c || c.id !== id || c.fini) throw d.refus('appel_fini', 409);
      if (c.role !== 'appele') throw d.erreurLocale('invalide');
      if (c.reponse) return instantane(c);                                                // deux touchers : un seul départ
      c.reponse = true;
      try {
        if (!accepte) {
          finir(c, 'refuse', { avis: null });
          await informer(c);
          return instantane(c);
        }
        c.accepte = true;                                                                 // avant la requête : ce que le service dit pendant qu'elle part est déjà pour nous
        c.promesseIce = lireIce();
        let r;
        try { r = await d.api.repondreAppel(id, true); }
        catch (e) {
          c.accepte = false;
          if (e && e.code === 'appel_pris') finir(c, 'pris_ailleurs', { service: true });
          else if (e && e.code === 'appel_fini') relireActif();
          throw e;
        }
        if (c.fini) return instantane(c);
        c.local = true;
        if (r && r.appel) { c.vue = r.appel; memoriser(r.appel); }
        if (!c.debut) c.debut = maintenant();
        if (c.minSonnerie) { annuler(c.minSonnerie); c.minSonnerie = null; }
        if (d.fermerNotif) { try { d.fermerNotif('appel:' + id); } catch (e) { /* rien */ } }
        armerPouls(c);
        await demarrerLiaison(c);
        return instantane(c);
      } finally { c.reponse = false; }
    }
    /* raccrocher, annuler (avant la réponse), refuser (sonnerie entrante) : la liaison est fermée tout de suite, le service l'apprend ensuite. IDEMPOTENT : le même enregistrement. */
    function terminer(id) {
      const c = courant;
      if (!c || c.id !== id) return Promise.reject(d.erreurLocale('introuvable'));
      if (!c.terminaison) {
        c.terminaison = (async () => {
          if (!c.fini) finir(c, c.vue.etat === 'sonne' ? (c.role === 'appelant' ? 'annule' : 'refuse') : 'fini', { avis: null });
          await informer(c);
          const rec = enregistrement(c);
          if (courant === c) courant = null;
          return rec;
        })();
      }
      return c.terminaison;
    }
    /* la page se ferme : la liaison est coupée et le raccrochage PART quand même (`keepalive`). Une sonnerie entrante qu'on n'a pas prise n'est pas refusée : un autre appareil peut encore répondre. */
    function fermeture() {
      const c = courant;
      if (!c || c.fini || !c.local) return false;
      finir(c, c.vue.etat === 'sonne' ? 'annule' : 'fini', { avis: null });
      c.serviceInforme = true;
      try { Promise.resolve(d.api.quitterAppel(c.id, { keepalive: true })).catch(() => {}); } catch (e) { /* la page se ferme */ }
      return true;
    }
    /* les pistes de la page : audio et vidéo, ou rien. Posées sur les émetteurs sans renégocier ; l'état de la caméra est dit à l'autre. */
    function pistes(id, p) {
      const c = courant;
      if (!c || c.id !== id || c.fini) return false;
      c.pistes.audio = p && p.audio ? p.audio : null;
      c.pistes.video = p && p.video ? p.video : null;
      if (c.pc) appliquerPistes(c).then(() => envoyerEtatCamera(c), () => {});
      return true;
    }
    const flux = (id) => courant && courant.id === id && !courant.fini ? courant.flux : null;
    const instantaneDe = (id) => courant && courant.id === id ? instantane(courant) : null;
    const actif = () => courant && !courant.fini ? instantane(courant) : null;

    /* ── l'historique : des appels de la liste du service, rangés comme l'aperçu les rend ── */
    function vueHistorique(a) {
      noterAutre(a);
      const p = a.autre && typeof a.autre.id === 'string' ? (d.personne(a.autre.id) || { id: a.autre.id, nom: 'Quelqu\'un', initiales: '?', avatar: 0, photo: null }) : { id: null, nom: d.nomSupprime, initiales: '?', avatar: 0, photo: null };
      return { id: a.id, type: a.type, sens: a.manque ? 'manque' : a.sens === 'sortant' ? 'sortant' : 'entrant', groupe: false, conv: null, membres: p.id ? [p.id] : [], nom: p.nom, court: p.nom, initiales: p.initiales, avatar: p.avatar, photo: p.photo, repetitions: 1, t: a.debut, duree: Number.isInteger(a.duree_s) ? a.duree_s : 0 };
    }
    /* ⛔ « manqués » se juge sur TOUT l'historique : deux manqués de la même personne ne sont « d'affilée » que si rien d'autre ne s'est passé entre les deux */
    async function liste(filtre) {
      if (filtre !== undefined && filtre !== 'tous' && filtre !== 'manques') throw d.erreurLocale('invalide');
      const r = await d.api.appels('tous');
      reprendre(r && r.actif);
      const out = [];
      for (const a of (r && Array.isArray(r.appels) ? r.appels : [])) {
        const x = vueHistorique(a), prec = out[out.length - 1];
        if (x.sens === 'manque' && prec && prec.sens === 'manque' && prec.membres[0] === x.membres[0] && x.membres.length) prec.repetitions++;
        else out.push(x);
      }
      return filtre === 'manques' ? out.filter((x) => x.sens === 'manque') : out;
    }

    function arreter() {
      const c = courant;
      if (c && !c.fini) fermeture();
      if (c) { liberer(c); if (c.minNettoyage) { annuler(c.minNettoyage); c.minNettoyage = null; } }
      courant = null;
    }
    return {
      lancer, repondre, terminer, fermeture, pistes, flux, instantane: instantaneDe, actif, liste,
      surAppel, surSignal, surResync: () => { relireActif(); }, surReseau: (etat) => { if (etat === 'ok' && courant && !courant.fini) relireActif(); },
      reprendre, arreter,
      etat: () => courant ? { id: courant.id, liaison: courant.liaison, role: courant.role, fini: !!courant.fini, local: courant.local, relais: courant.relais, pc: !!courant.pc } : null,
    };
  }

  function creerSourceServeur(options) {
    const o = options || {};
    const OPMSG = o.OPMSG || racine.OPMSG;
    if (!OPMSG || typeof OPMSG.creer !== 'function') throw new Error('api.js doit être chargé avant source-serveur.js');
    const api0 = o.api || OPMSG.creer({ base: o.base || '', fetch: o.fetch, EventSource: o.EventSource, attente: o.attente });
    const maintenant = o.maintenant || (() => Date.now());
    const nav = o.navigateur || navigateurReel(racine);                                    // le navigateur, derrière son adaptateur
    const planifier = o.planifier || ((f, ms) => setTimeout(f, ms));
    const annuler = o.annuler || ((h) => clearTimeout(h));
    const delaiSaisieMs = o.delaiSaisieMs == null ? 6000 : o.delaiSaisieMs;       // une frappe sans nouvelle depuis ce temps s'éteint toute seule
    const delaiRelireMs = o.delaiRelireMs == null ? 60 : o.delaiRelireMs;          // la liste se relit en un coup après une rafale d'événements
    const delaiAckMs = o.delaiAckMs == null ? 250 : o.delaiAckMs;                  // un acquittement attend ce temps pour grouper une rafale (le service attend 5 s avant d'envoyer une notification)

    const attenteEnvoi = typeof o.attenteEnvoi === 'function' ? o.attenteEnvoi : (n) => Math.min(30000, 1500 * Math.pow(2, Math.min(n, 4)));
    const creerUrl = typeof o.creerUrl === 'function' ? o.creerUrl : (b) => URL.createObjectURL(b);
    const revoquerUrl = typeof o.revoquerUrl === 'function' ? o.revoquerUrl : (u) => { try { URL.revokeObjectURL(u); } catch (e) { /* déjà libérée */ } };
    const cacheMax = o.cacheMax > 0 ? o.cacheMax : 150, cacheOctetsMax = o.cacheOctetsMax > 0 ? o.cacheOctetsMax : 96 * 1048576;   // bornes de la mémoire des pièces lues
    const chargesMax = o.chargesMax > 0 ? o.chargesMax : 3;                                                                         // lectures de pièces en même temps
    const delaiReessaiPieceMs = o.delaiReessaiPieceMs == null ? 15000 : o.delaiReessaiPieceMs;                                      // une pièce illisible n'est pas redemandée à chaque rendu

    let moiApi = null, mort = false, enMarche = false, ecoute = null, suiviMort = null;
    const supprimesIds = new Set();        // les identifiants de comptes SUPPRIMÉS que le service a signalés (liste, pages de messages) : leur nom est « Compte supprimé »
    let suppressionEnCours = false;        // la demande de suppression est partie : le service va fermer notre flux, ce n'est pas une session « morte » à signaler
    const registre = new Map();            // uid → { id, prenom, nom, statut }
    const enLigne = new Set();
    let contactsApi = [], contactsTous = [], convsApi = [], listeFraiche = false;
    const convs = new Map();               // id → { detail, messages[], aPlus, charge }
    const saisies = new Map();             // conv → Map(uid → minuterie)
    const lecture = new Map();             // conv → Map(uid → { seq, ts })
    const file = [];                       // l'envoi en attente : { cid, conv, texte, reponse, t, essais }
    let minuterieFile = null, enRelecture = null, derniereSaisie = new Map();
    const ecouteurs = [];
    const emettre = (ev) => ecouteurs.slice().forEach(f => { try { f(Object.assign({}, ev)); } catch (e) { /* un écouteur fautif n'arrête pas les autres */ } });

    /* ── l'API, enveloppée : une session morte se voit partout, d'un seul endroit ── */
    const A = {};
    for (const k of Object.keys(api0)) {
      if (typeof api0[k] !== 'function' || k === 'ecouter' || k === 'appel') continue;
      A[k] = async (...a) => {
        try { return await api0[k](...a); }
        catch (e) { if (e && e.code === 'session_requise' && enMarche) sessionMorte('session_requise'); throw e; }
      };
    }
    A.appel = api0.appel;
    function sessionMorte(motif) {
      if (mort || suppressionEnCours) return;
      mort = true; arreter();
      if (typeof suiviMort === 'function') suiviMort(motif || 'session_requise');
    }

    /* ── les pièces : lues par le service (GET /api/pieces/:id), gardées EN MÉMOIRE sous forme d'adresses blob:, jamais sur l'appareil ──
       ⛔ Le service ne sert une pièce qu'à qui a le droit de la lire (sinon 404, le même qu'une pièce inexistante) : une adresse n'est donc jamais devinée, elle est fabriquée ici
       à partir d'un Blob que le service vient de rendre. La mémoire est BORNÉE (nombre et octets : la moins récemment vue part d'abord) et LIBÉRÉE à l'arrêt et à la déconnexion. */
    const cachePieces = new Map();       // id de pièce → { url, octets, vu }
    const lectures = new Map();          // id → Promise<url> : une seule lecture à la fois par pièce
    const echecs = new Map();            // id → { t, definitif } : une pièce qui n'a pas pu être lue n'est pas redemandée à chaque rendu (15 s), ni du tout si elle n'existe plus (404)
    const attentePieces = [];            // les pièces à lire, la plus récente d'abord
    let lecturesEnCours = 0, tickCache = 0, octetsCache = 0, signalPlanifie = false, generation = 0;
    const PHOTOS_AUTO = 30, VOCAUX_AUTO = 6, PHOTOS_PAR_MESSAGE = 10;   // ce que l'ouverture d'une conversation lit toute seule ; le reste se lit au toucher
    const LIMITES_DEFAUT = { photo_max: 12582912, vocal_max: 10485760, fichier_max: 26214400, avatar_max: 2097152, par_message: 10, quota: 2147483648 };
    let limitesPieces = null;
    /* Les maximums du service (GET /api/config), lus à la première utilisation : la page refuse AVANT d'envoyer un fichier trop lourd, sans lui faire parcourir le réseau pour rien. */
    async function limites() {
      if (limitesPieces) return limitesPieces;
      try { const c = await A.config(); limitesPieces = Object.assign({}, LIMITES_DEFAUT, c && c.limites && c.limites.pieces); }
      catch (e) { return LIMITES_DEFAUT; }          // pas de mémoire d'un échec : on redemandera la prochaine fois (le service refusera de toute façon ce qui est trop lourd)
      return limitesPieces;
    }
    const maxDe = (l, genre) => genre === 'photo' ? l.photo_max : genre === 'vocal' ? l.vocal_max : genre === 'avatar' ? l.avatar_max : l.fichier_max;
    /* Prévient l'écran qu'une adresse est arrivée : une seule rafale, quel que soit le nombre de pièces lues d'un coup. */
    function signalerPieces() {
      if (signalPlanifie || mort) return;
      signalPlanifie = true;
      planifier(() => {
        signalPlanifie = false;
        if (mort) return;
        emettre({ type: 'moi' }); emettre({ type: 'contacts' }); emettre({ type: 'liste' });
        for (const id of convs.keys()) emettre({ type: 'conversation', id });
      }, delaiRelireMs);
    }
    function poserCache(id, url, octets) {
      const avant = cachePieces.get(id);
      if (avant) { octetsCache -= avant.octets; if (avant.url !== url) revoquerUrl(avant.url); }
      cachePieces.set(id, { url, octets, vu: ++tickCache }); octetsCache += octets;
      while (cachePieces.size > cacheMax || octetsCache > cacheOctetsMax) {
        let plus = null;
        for (const [k, e] of cachePieces) if (k !== id && (!plus || e.vu < plus.e.vu)) plus = { k, e };
        if (!plus) break;
        revoquerUrl(plus.e.url); octetsCache -= plus.e.octets; cachePieces.delete(plus.k);
      }
    }
    function oublierPieces() {
      generation++;
      for (const e of cachePieces.values()) revoquerUrl(e.url);
      cachePieces.clear(); lectures.clear(); echecs.clear(); attentePieces.length = 0; octetsCache = 0; lecturesEnCours = 0;
    }
    function liberer(id) {
      const e = cachePieces.get(id);
      if (e) { revoquerUrl(e.url); octetsCache -= e.octets; cachePieces.delete(id); }
      echecs.delete(id);
    }
    /* un message effacé (pour tous, pour moi, échu) : ses pièces n'ont plus rien à faire en mémoire */
    function oublierMeta(meta) {
      if (!meta) return;
      if (Array.isArray(meta.pieces)) meta.pieces.forEach(p => p && liberer(p.id));
      if (typeof meta.piece === 'string') liberer(meta.piece);
    }
    function lirePieceUrl(id) {
      const deja = cachePieces.get(id);
      if (deja) { deja.vu = ++tickCache; return Promise.resolve(deja.url); }
      if (lectures.has(id)) return lectures.get(id);
      const gen = generation;
      lecturesEnCours++;
      const p = A.lirePiece(id).then(({ blob }) => {
        if (gen !== generation) throw erreurLocale('introuvable');       // la session a été fermée pendant la lecture : rien n'est gardé
        const url = creerUrl(blob); poserCache(id, url, blob.size || 0); echecs.delete(id);
        return url;
      }, (er) => { if (gen === generation) echecs.set(id, { t: maintenant(), definitif: !!er && er.statut === 404 }); throw er; });
      lectures.set(id, p);
      const fin = () => { if (gen !== generation) return; lectures.delete(id); lecturesEnCours--; signalerPieces(); pomperPieces(); };
      p.then(fin, fin);
      return p;
    }
    function pomperPieces() {
      while (lecturesEnCours < chargesMax && attentePieces.length && !mort) {
        const id = attentePieces.shift();
        if (cachePieces.has(id) || lectures.has(id)) continue;
        lirePieceUrl(id).catch(() => {});
      }
    }
    function demanderPiece(id) {
      if (typeof id !== 'string' || cachePieces.has(id) || lectures.has(id) || mort) return;
      const e = echecs.get(id);
      if (e && (e.definitif || maintenant() - e.t < delaiReessaiPieceMs)) return;
      const i = attentePieces.indexOf(id); if (i >= 0) attentePieces.splice(i, 1);
      attentePieces.unshift(id);                                           // la dernière demandée (la plus récente d'une conversation) part la première
      pomperPieces();
    }
    /* l'adresse d'une pièce déjà lue, ou null (sans rien demander) */
    function urlSiLue(id) {
      const e = typeof id === 'string' ? cachePieces.get(id) : null;
      if (e) { e.vu = ++tickCache; return e.url; }
      return null;
    }
    /* l'adresse d'une pièce, ou null — et sa lecture est demandée en arrière-plan : l'écran est prévenu (événements) quand elle arrive */
    function photoPiece(id) {
      const u = urlSiLue(id);
      if (u || typeof id !== 'string') return u;
      demanderPiece(id);
      return null;
    }
    const etatPiece = (id) => cachePieces.has(id) ? 'pret' : (lectures.has(id) || attentePieces.includes(id)) ? 'chargement' : echecs.has(id) ? 'indisponible' : 'attente';
    /* l'adresse d'une image ou d'un son, lue maintenant s'il le faut (le toucher d'une photo ou d'un vocal pas encore arrivés) */
    const pieceUrl = (id) => typeof id === 'string' ? lirePieceUrl(id) : Promise.reject(erreurLocale('introuvable'));
    /* un fichier : le Blob, JAMAIS gardé (25 Mo en mémoire pour un clic de téléchargement serait un gaspillage) */
    const pieceBlob = async (id) => { if (typeof id !== 'string') throw erreurLocale('introuvable'); return (await A.lirePiece(id)).blob; };

    /* ── les personnes ── */
    function noter(p) {
      if (!p || typeof p.id !== 'string') return;
      const avant = registre.get(p.id) || {};
      registre.set(p.id, { id: p.id, prenom: p.prenom !== undefined ? p.prenom : avant.prenom, nom: p.nom !== undefined ? p.nom : avant.nom, statut: p.statut !== undefined ? p.statut : avant.statut,
        avatar: p.avatar !== undefined ? p.avatar : avant.avatar });
    }
    /* `avatar` d'une vue = l'indice de couleur du repli (un nombre) ; `photo` = l'adresse blob: de la photo de profil quand elle est arrivée, sinon null */
    const vueSupprimee = (id) => ({ id, nom: NOM_SUPPRIME, prenom: NOM_SUPPRIME, initiales: '?', avatar: indexAvatar(id), photo: null, supprime: true });
    const noterSupprimes = (liste) => { if (Array.isArray(liste)) for (const id of liste) if (typeof id === 'string') supprimesIds.add(id); };
    const vuePersonne = (p) => { if (supprimesIds.has(p.id)) return vueSupprimee(p.id); const n = nomComplet(p); return { id: p.id, nom: n, prenom: (p.prenom || n).split(' ')[0] || n, initiales: initialesDe(n), avatar: indexAvatar(p.id), photo: photoPiece(p.avatar) }; };
    const personne = (id) => { if (supprimesIds.has(id)) return vueSupprimee(id); const p = registre.get(id); return p ? vuePersonne(p) : null; };
    const estMoi = (id) => !!moiApi && id === moiApi.id;
    const prenomDe = (id) => estMoi(id) ? 'Vous' : supprimesIds.has(id) ? NOM_SUPPRIME : (registre.has(id) ? vuePersonne(registre.get(id)).prenom : 'Quelqu\'un');
    const nomDe = (id) => estMoi(id) ? 'Vous' : supprimesIds.has(id) ? NOM_SUPPRIME : (registre.has(id) ? vuePersonne(registre.get(id)).nom : 'Quelqu\'un');

    /* ── les contacts ── */
    const vueContact = (c) => Object.assign(vuePersonne(c), { role: enLigne.has(c.id) ? 'En ligne' : (c.statut || ''), enLigne: enLigne.has(c.id) });
    function installerContacts(liste) {
      contactsTous = liste.slice();
      contactsApi = liste.filter(c => c.mutuel && !c.bloque);
      enLigne.clear();
      for (const c of liste) { noter(c); if (c.en_ligne) enLigne.add(c.id); }
    }
    async function rafraichirContacts() {
      installerContacts(await A.contacts());
      emettre({ type: 'contacts' });
    }

    /* ── la liste ── */
    function resume(c) {
      const direct = c.type === 'direct';
      const supprime = direct && !!c.autre && c.autre.supprime === true;     // l'autre a supprimé son compte : la conversation reste lisible, on n'y écrit plus
      if (supprime) supprimesIds.add(c.autre.id);
      else if (direct && c.autre) noter(c.autre);
      if (c.apercu && c.apercu.par) noter(c.apercu.par);   // ⛔ l'auteur du dernier message d'un GROUPE : son nom vient avec l'aperçu (sinon « Quelqu'un » tant que la conversation n'est pas ouverte)
      const canal = c.type === 'canal';
      const nom = direct ? (supprime ? NOM_SUPPRIME : nomComplet(c.autre)) : (c.nom || (canal ? 'Canal' : 'Groupe'));
      let apercu = '';
      if (c.apercu) {
        const a = c.apercu;
        let corps = a.supprime ? 'Message supprimé' : a.illisible ? 'Message illisible' : a.type === 'systeme' ? (canal ? 'Activité du canal' : c.type === 'reunion' ? 'Activité de la réunion' : 'Activité du groupe') : (a.texte || '');
        corps = corps.replace(/\s+/g, ' ').slice(0, 160);
        const prefixe = a.type === 'systeme' ? '' : estMoi(a.auteur) ? 'Vous : ' : (!direct ? prenomDe(a.auteur) + ' : ' : '');
        apercu = prefixe + corps;
      }
      const loc = convs.get(c.id);
      const nonLus = loc && loc.luLocal !== undefined && loc.luLocal >= c.dernier_seq ? 0 : c.non_lus;
      return {
        id: c.id, type: c.type, nom, court: nom, initiales: supprime ? '?' : direct ? initialesDe(nom) : '#', avatar: indexAvatar(c.id), photo: supprime ? null : direct ? photoPiece(c.autre && c.autre.avatar) : photoPiece(c.avatar), epingle: !!c.epingle, supprime,
        membres: [], admins: c.role === 'admin' && moiApi ? [moiApi.id] : [], annoncesSeulement: !!c.annonces_seules, ephemeres: c.ephemere_s || 0,
        nonLu: nonLus > 0, nonLus, apercu, t: c.dernier_ts, enLigne: direct && c.autre ? enLigne.has(c.autre.id) : false,
        autre: direct && c.autre ? c.autre.id : null,
        /* un CANAL dit l'espace auquel il appartient et s'il est privé (la liste s'en sert pour le nommer « # canal ») ; les autres conversations n'ont ni l'un ni l'autre */
        espace: canal && typeof c.espace === 'string' ? c.espace : null, prive: canal && c.prive === true,
        /* la conversation d'une RÉUNION dit laquelle (la page ouvre sa fiche au toucher du titre) */
        reunion: c.type === 'reunion' && typeof c.reunion === 'string' ? c.reunion : null,
      };
    }
    async function relireListe() {
      const liste = await A.conversations();
      /* ⛔ UNE CONVERSATION OUVERTE QUI DISPARAÎT DE LA LISTE (un canal supprimé par son administrateur, un espace dissous) : la page qui l'affiche doit s'en retirer. Seules celles que ce module
         tient en mémoire (ouvertes ou lues) sont dites — une conversation que la personne vient de quitter elle-même a déjà été oubliée (`quitter`) : pas de second avis. */
      const parties = convsApi.filter(c => !liste.some(x => x.id === c.id) && convs.has(c.id)).map(c => c.id);
      convsApi = liste; listeFraiche = true;
      for (const c of liste) if (c.autre) noter(c.autre);
      for (const id of parties) { convs.delete(id); emettre({ type: 'retire', id }); }
    }
    /* Plusieurs événements d'affilée ne font qu'UNE relecture de la liste. */
    function relireListePlusTard() {
      listeFraiche = false;
      if (enRelecture) return enRelecture;
      enRelecture = new Promise((ok) => {
        planifier(async () => {
          enRelecture = null;
          /* ⛔ une relecture que le service refuse (429, 503) ne se perd PAS en silence : l'écran garde sa liste et DIT pourquoi elle n'est plus à jour (« Réessayer » la relit) */
          try { await relireListe(); emettre({ type: 'liste' }); } catch (e) { emettre({ type: 'liste', erreur: e }); }
          ok();
        }, delaiRelireMs);
      });
      return enRelecture;
    }
    /* `forcer` : relire même si la liste est fraîche (le bouton « Réessayer » d'un refus ne doit pas se contenter de la copie qu'il a déjà) */
    const lister = async (forcer) => {
      if (forcer || !listeFraiche) await relireListe();
      return convsApi.map(resume).sort((x, y) => y.t - x.t);
    };

    /* ── les messages ── */
    function lecteursDe(id) { return lecture.get(id) || lecture.set(id, new Map()).get(id); }
    /* « Lu » : mon message est lu quand l'autre (une directe) ou tous les autres (un groupe) sont allés au moins jusqu'à lui. `true` si l'heure est inconnue. */
    function luDe(conv, c, m) {
      if (!estMoi(m.auteur) || m.type === 'systeme' || !c.detail) return null;
      const autres = c.detail.membres.filter(x => !estMoi(x.id) && x.lu_seq !== null && x.lu_seq !== undefined);
      if (!autres.length || !autres.every(x => x.lu_seq >= m.seq)) return null;
      const L = lecture.get(conv);
      let ts = 0;
      for (const x of autres) { const e = L && L.get(x.id); if (e && e.seq >= m.seq && e.ts > ts) ts = e.ts; else { ts = 0; break; } }
      return ts || true;
    }
    /* `genre` : 'canal' (un CANAL d'espace) ou 'reunion' (la conversation d'une réunion) — les phrases disent « le canal », « la réunion » là où un groupe dit « le groupe » (le reste est commun :
       mêmes messages système) */
    function texteSysteme(m, genre) {
      const k = m.meta && m.meta.k, u = m.meta && m.meta.uid, a = m.auteur;
      const canal = genre === 'canal', reunion = genre === 'reunion';
      const LE = canal ? 'le canal' : reunion ? 'la réunion' : 'le groupe', DU = canal ? 'du canal' : reunion ? 'de la réunion' : 'du groupe';
      switch (k) {
        case 'reunion_creee': return estMoi(a) ? 'Vous avez programmé la réunion' : nomDe(a) + ' a programmé la réunion';
        case 'reunion_modifiee': return (estMoi(a) ? 'Vous avez' : nomDe(a) + ' a') + (m.meta.horaire ? ' changé l\'horaire de la réunion' : ' modifié la réunion');
        case 'reunion_annulee': return (estMoi(a) ? 'Vous avez' : nomDe(a) + ' a') + ' annulé la réunion';
        case 'groupe_cree': return estMoi(a) ? 'Vous avez créé le groupe' : nomDe(a) + ' a créé le groupe';
        case 'canal_cree': return estMoi(a) ? 'Vous avez créé le canal' : nomDe(a) + ' a créé le canal';
        case 'membre_ajoute': return estMoi(a) ? 'Vous avez ajouté ' + nomDe(u) : nomDe(a) + ' a ajouté ' + (estMoi(u) ? 'vous' : nomDe(u));
        case 'rejoint': return estMoi(u) ? 'Vous avez rejoint ' + LE : nomDe(u) + ' a rejoint ' + LE;
        case 'membre_retire': return estMoi(a) ? 'Vous avez retiré ' + nomDe(u) : estMoi(u) ? nomDe(a) + ' vous a retiré ' + DU : nomDe(a) + ' a retiré ' + nomDe(u);
        case 'membre_parti': return estMoi(u) ? 'Vous avez quitté ' + LE : nomDe(u) + ' a quitté ' + LE;
        case 'admin_promu': return estMoi(u) ? 'Vous êtes maintenant administrateur' : nomDe(u) + ' est maintenant administrateur';
        case 'admin_retire': return estMoi(u) ? 'Vous n\'êtes plus administrateur' : nomDe(u) + ' n\'est plus administrateur';
        case 'renomme': return (estMoi(a) ? 'Vous avez' : nomDe(a) + ' a') + ' renommé ' + LE;
        case 'avatar': return (estMoi(a) ? 'Vous avez' : nomDe(a) + ' a') + ' changé la photo ' + DU;
        case 'avatar_retire': return (estMoi(a) ? 'Vous avez' : nomDe(a) + ' a') + ' retiré la photo ' + DU;
        case 'annonces_seules': return m.meta.valeur ? 'Seuls les administrateurs peuvent écrire' : 'Tout le monde peut écrire';
        case 'ephemere': return m.meta.valeur ? 'Les messages disparaissent après ' + duree(m.meta.valeur) : 'Les messages éphémères sont désactivés';
        default: return canal ? 'Le canal a été modifié' : reunion ? 'La réunion a été modifiée' : 'Le groupe a été modifié';
      }
    }
    /* le genre d'une conversation pour les phrases système : 'canal', 'reunion', ou '' (un groupe) */
    const genreSysteme = (c) => { const t = c && c.detail && c.detail.conversation && c.detail.conversation.type; return t === 'canal' || t === 'reunion' ? t : ''; };
    /* ce que dit de lui-même un message qui n'est pas du texte : dans une citation, une bannière */
    function resumeMedia(type, meta) {
      if (type === 'photo') { const n = meta && Array.isArray(meta.pieces) ? meta.pieces.length : 1; return n > 1 ? n + ' photos' : 'Photo'; }
      if (type === 'vocal') { const d = meta && meta.dur > 0 ? Math.round(meta.dur) : 0; return 'Message vocal' + (d ? ' · ' + Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0') : ''); }
      if (type === 'fichier') return 'Fichier' + (meta && meta.nom ? ' · ' + meta.nom : '');
      return '';
    }
    function citation(c, seq) {
      const q = c.messages.find(x => x.seq === seq);
      if (!q) return { seq, auteur: null, nom: 'Message plus ancien', texte: '', introuvable: true };
      return { seq, id: q.id, auteur: q.auteur, nom: nomDe(q.auteur), texte: q.supprime ? 'Message supprimé' : extrait(q.type === 'systeme' ? texteSysteme(q, genreSysteme(c)) : (q.texte || resumeMedia(q.type, q.meta)), 120), supprime: !!q.supprime };
    }
    /* Les pièces d'un message : l'adresse est celle d'une pièce DÉJÀ LUE (sinon null, et `etat` dit où on en est). `auto` : les pièces que l'ouverture lit toute seule — les plus
       récentes ; les autres attendent le toucher (une conversation de cent photos ne se télécharge pas d'un coup sur un téléphone). */
    function vuePieces(m, auto) {
      const meta = m.meta || {}, lue = (id) => auto && auto.has(id) ? photoPiece(id) : urlSiLue(id);
      if (m.type === 'photo' && Array.isArray(meta.pieces) && meta.pieces.length) return { photos: meta.pieces.map(p => ({ url: lue(p.id), w: p.w | 0, h: p.h | 0, piece: p.id, etat: etatPiece(p.id) })) };
      if (m.type === 'vocal' && typeof meta.piece === 'string') return { vocal: { url: lue(meta.piece), dur: Math.max(1, Math.round(meta.dur) || 1), bars: Array.isArray(meta.bars) ? meta.bars.slice(0, 64) : [], piece: meta.piece } };
      if (m.type === 'fichier' && typeof meta.piece === 'string') return { fichier: { nom: String(meta.nom || 'Fichier'), taille: meta.taille | 0, piece: meta.piece } };
      return { texte: 'Pièce illisible' };
    }
    /* quelles pièces l'ouverture d'une conversation lit toute seule : les 30 dernières photos, les 6 derniers vocaux (le plus récent d'abord).
       ⛔ Jamais plus que la moitié de la mémoire : lire d'avance plus de pièces qu'elle n'en garde ferait relire sans fin celles qu'elle vient d'évincer. */
    function piecesAuto(messages) {
      const s = new Set(); let photos = 0, vocaux = 0;
      const maxPhotos = Math.max(1, Math.min(PHOTOS_AUTO, cacheMax >> 1)), maxVocaux = Math.max(1, Math.min(VOCAUX_AUTO, cacheMax >> 2));
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i]; if (m.supprime || !m.meta) continue;
        if (m.type === 'photo' && Array.isArray(m.meta.pieces)) { for (const p of m.meta.pieces) if (photos < maxPhotos) { s.add(p.id); photos++; } }
        else if (m.type === 'vocal' && typeof m.meta.piece === 'string' && vocaux < maxVocaux) { s.add(m.meta.piece); vocaux++; }
      }
      return s;
    }
    const MEDIAS = ['photo', 'vocal', 'fichier'];
    function vueMessage(conv, c, m, auto) {
      const base = { id: m.id, seq: m.seq, auteur: m.auteur, t: m.ts, lu: luDe(conv, c, m) };
      if (m.type === 'systeme') return Object.assign(base, { systeme: true, texte: texteSysteme(m, genreSysteme(c)) });
      const media = MEDIAS.includes(m.type);
      const v = Object.assign(base, { texte: m.supprime ? '' : (m.illisible ? 'Message illisible' : (media ? '' : (m.texte === null || m.texte === undefined ? '…' : m.texte))) });
      if (m.supprime) v.supprime = true;
      else if (media && !m.illisible) Object.assign(v, vuePieces(m, auto));
      if (m.modifie) v.modifie = m.modifie;
      if (m.repond_a) v.reponse = citation(c, m.repond_a);
      if (m.reactions && m.reactions.length) {
        const par = new Map();
        for (const r of m.reactions) { const e = par.get(r.emoji) || { emoji: r.emoji, n: 0, moi: false, noms: [] }; e.n++; if (estMoi(r.uid)) e.moi = true; e.noms.push(prenomDe(r.uid)); par.set(r.emoji, e); }
        v.reactions = Array.from(par.values());
      }
      return v;
    }
    /* un message qui n'a pas encore quitté l'appareil : `envoi` = un essai est en cours (« Envoi… »), sinon il attend la reprise du réseau. Ses pièces sont celles de l'appareil. */
    /* ⛔ « Envoi… » DIT VRAI (relecture du testeur). Une tentative de RENVOI qui échoue sur-le-champ (réseau coupé : la requête tombe en quelques millisecondes) ne doit pas faire passer le message
       de « En attente de connexion… » à « Envoi… » : rien ne part. Le premier essai se montre tout de suite ; un renvoi seulement quand il dure (`DELAI_ENVOI_VU_MS`), et la source
       redit l'état à ce moment-là. `echec` : un refus qui peut réussir plus tard (429, 402, 503, 408) — la pièce RESTE, avec sa phrase, un « Réessayer » et un « Annuler ». */
    const DELAI_ENVOI_VU_MS = 400;
    function vueEnAttente(p) {
      const envoi = !!p.enVol && !p.echec && (p.essais === 0 || maintenant() - p.debutEssai >= DELAI_ENVOI_VU_MS);
      const v = { id: 'p:' + p.cid, seq: null, auteur: moiApi.id, t: p.t, lu: null, texte: p.texte || '', attente: true, envoi, cid: p.cid };
      if (p.echec) v.echec = p.echec.phrase;
      if (p.type === 'photo') v.photos = p.photos.map(x => ({ url: x.url, w: x.w, h: x.h, piece: null }));
      else if (p.type === 'vocal') v.vocal = { url: p.vocal.url, dur: p.vocal.dur, bars: p.vocal.bars.slice(), piece: null };
      else if (p.type === 'fichier') v.fichier = { nom: p.fichier.nom, taille: p.fichier.taille, piece: null };
      return v;
    }

    /* Range un message dans la copie d'une conversation : sans doublon, trié par `seq`. */
    function ranger(c, m) {
      const i = c.messages.findIndex(x => x.seq === m.seq);
      if (i >= 0) c.messages[i] = Object.assign({}, c.messages[i], m);
      else { c.messages.push(m); c.messages.sort((x, y) => x.seq - y.seq); }
    }
    async function charger(id) {
      const d = await A.conversation(id);
      for (const m of d.membres) noter(m);
      const c = convs.get(id) || { messages: [], aPlus: false, charge: false, detail: null };
      c.detail = d;
      const r = await A.messages(id, { limite: 100 });
      noterSupprimes(r.supprimes);
      c.messages = r.messages.slice(); c.aPlus = !!r.a_plus; c.charge = true;
      convs.set(id, c);
      return c;
    }
    async function ouvrir(id) {
      let c = convs.get(id);
      if (!c || !c.charge) {
        try { c = await charger(id); }
        catch (e) { if (e && e.code === 'introuvable') { convs.delete(id); return null; } throw e; }
      }
      const resumeConv = (convsApi.find(x => x.id === id));
      const d = c.detail, canalD = d.conversation.type === 'canal';
      const base = resumeConv ? resume(resumeConv) : { id, type: d.conversation.type, nom: d.conversation.nom || (canalD ? 'Canal' : 'Groupe'), court: d.conversation.nom || (canalD ? 'Canal' : 'Groupe'), initiales: '#', avatar: indexAvatar(id), photo: null, epingle: false, nonLu: false, nonLus: 0, apercu: '', t: d.conversation.dernier_ts,
        espace: canalD && typeof d.conversation.espace === 'string' ? d.conversation.espace : null, prive: canalD && d.conversation.prive === true,
        reunion: d.conversation.type === 'reunion' && typeof d.conversation.reunion === 'string' ? d.conversation.reunion : null };
      const autre = d.conversation.type === 'direct' ? d.membres.find(x => !estMoi(x.id)) : null;
      if (autre) { Object.assign(base, { nom: nomComplet(autre), court: nomComplet(autre), initiales: initialesDe(nomComplet(autre)), enLigne: enLigne.has(autre.id), autre: autre.id, photo: photoPiece(autre.avatar) }); }
      else if (d.conversation.type === 'groupe' || canalD) { base.nom = base.court = d.conversation.nom || (canalD ? 'Canal' : 'Groupe'); base.photo = photoPiece(d.conversation.avatar); }
      else if (d.conversation.type === 'reunion') { base.nom = base.court = d.conversation.nom || 'Réunion'; base.photo = null; }
      if (d.conversation.type === 'direct' && !autre) { base.supprime = true; base.nom = base.court = NOM_SUPPRIME; base.initiales = '?'; base.photo = null; }   // l'autre n'est plus membre : son compte est supprimé
      base.membres = d.membres.map(x => x.id); base.admins = d.membres.filter(x => x.role === 'admin').map(x => x.id);
      base.annoncesSeulement = !!d.conversation.annonces_seules; base.ephemeres = d.conversation.ephemere_s || 0;
      const auto = piecesAuto(c.messages);
      const vues = c.messages.map(m => vueMessage(id, c, m, auto));
      for (const p of file) if (p.conv === id) vues.push(vueEnAttente(p));
      const S = saisies.get(id); let qui = null;
      if (S) for (const u of S.keys()) { if (!estMoi(u)) { qui = u; break; } }
      return Object.assign(base, { messages: vues, saisie: qui ? { contact: qui } : null, aPlus: c.aPlus });
    }
    async function precedents(id) {
      const c = convs.get(id); if (!c || !c.charge || !c.aPlus || !c.messages.length) return false;
      const r = await A.messages(id, { avant_seq: c.messages[0].seq, limite: 100 });
      noterSupprimes(r.supprimes);
      for (const m of r.messages) ranger(c, m);
      c.aPlus = !!r.a_plus;
      emettre({ type: 'conversation', id });
      return true;
    }

    /* ── l'envoi, et sa file ── */
    const erreurCoupure = (e) => !!e && (e.code === 'reseau' || e.code === 'serveur' || e.code === 'reponse_illisible');
    /* ⛔ UN REFUS QUI PEUT RÉUSSIR PLUS TARD GARDE LA PIÈCE (relecture du testeur) : trop de demandes (429), espace plein (402 : on supprime des messages puis on réessaie), service en lecture seule
       (503), envoi trop lent (408). La jeter obligeait à rechoisir la photo. Un refus DÉFINITIF (trop lourd, type refusé, plus le droit d'écrire) la jette, comme avant. */
    const retentable = (e) => !!e && (e.statut === 429 || e.statut === 402 || e.statut === 503 || e.statut === 408);
    const phraseDe = (e) => e && e.dit ? (e.phrase ? e.phrase() : e.message) : 'erreur inattendue.';
    function valider(texte) {
      if (typeof texte !== 'string' || !texte.trim()) throw erreurLocale('vide');
      const t = texte.replace(/\r\n?/g, '\n').trim();
      if (Array.from(t).length > 8000) throw erreurLocale('trop-long');
      return t;
    }
    function apresEnvoi(conv, m) {
      const c = convs.get(conv);
      if (c && c.charge) ranger(c, m);
      emettre({ type: 'conversation', id: conv });
      relireListePlusTard();
    }
    /* ⛔ `retirer` : l'envoi qui a réussi QUITTE la file AVANT que l'écran soit redit. Sinon l'événement émis par `apresEnvoi` redessinait le fil pendant que le message
       était encore dans la file : le vrai message (rangé) ET sa copie « En attente de connexion… » paraissaient ensemble, et rien ne redessinait après le retrait
       (relecture du testeur, D1 : réponse perdue, renvoi réussi, le message resté en double 35 s). */
    async function poster(p, retirer) {
      const r = await A.envoyer(p.conv, p.texte, { cid: p.cid, reponse_a: p.reponse || undefined });
      if (retirer) retirer();
      apresEnvoi(p.conv, { seq: r.seq, id: r.id, auteur: moiApi.id, ts: r.ts, type: 'texte', texte: p.texte, repond_a: p.reponse || null, supprime: false, modifie: null, reactions: [] });
      return r;
    }
    /* ── les messages de pièces : photo, vocal, fichier ──
       Chaque pièce est DÉPOSÉE (POST /api/pieces, corps binaire) puis le message la cite. Le message entre dans la file DÈS L'ENVOI (affiché « Envoi… » tant qu'un essai court) :
       un dépôt lent ne laisse pas l'écran muet, et ce qui est écrit après lui attend son tour (l'ordre d'envoi est l'ordre des messages). ⛔ Une pièce DÉJÀ déposée n'est pas
       redéposée à un renvoi (`x.id`) : la réponse perdue d'un envoi réussi ne coûte pas un second téléversement, et le `cid` fait le reste. */
    const SUJETS = { photo: ['Une photo', 'envoyée'], vocal: ['Un message vocal', 'envoyé'], fichier: ['Un fichier', 'envoyé'] };
    const sujetEnvoi = (p) => SUJETS[p.type] || ['Un message', 'envoyé'];
    const lesPieces = (p) => p.type === 'photo' ? p.photos : p.type === 'vocal' ? [p.vocal] : p.type === 'fichier' ? [p.fichier] : [];
    function metaDe(p) {
      if (p.type === 'photo') return { pieces: p.photos.map(x => ({ id: x.id, w: x.w, h: x.h, taille: x.blob.size })) };
      if (p.type === 'vocal') return { piece: p.vocal.id, dur: p.vocal.dur, bars: p.vocal.bars.slice(), taille: p.vocal.blob.size };
      return { piece: p.fichier.id, nom: p.fichier.nom, taille: p.fichier.blob.size };
    }
    async function posterPieces(p, retirer) {
      p.enVol = true; p.debutEssai = maintenant();
      emettre({ type: 'conversation', id: p.conv });             // ⛔ l'état « Envoi… » se pose AVANT l'événement : la page relit tout de suite, elle le voit
      if (p.essais > 0) planifier(() => { if (p.enVol && !mort) emettre({ type: 'conversation', id: p.conv }); }, DELAI_ENVOI_VU_MS + 50);   // un renvoi qui DURE devient « Envoi… »
      try {
        const l = await limites();
        for (const x of lesPieces(p)) {
          if (x.id) continue;
          const d = await A.deposer(x.blob, { conv: p.conv, genre: p.type, nom: p.type === 'fichier' ? x.nom : undefined, max: maxDe(l, p.type) });
          x.id = d.id;
          /* ⛔ l'adresse que la page avait fabriquée devient TOUT DE SUITE la mémoire de cette pièce : le message qui la cite revient parfois par le flux AVANT la réponse de l'envoi,
             et il ne doit pas faire relire une image que l'appareil a déjà */
          if (x.url && (p.type === 'photo' || p.type === 'vocal')) poserCache(x.id, x.url, x.blob.size);
        }
        const champs = p.type === 'photo' ? { pieces: p.photos.map(x => ({ id: x.id, w: x.w, h: x.h })) } : p.type === 'vocal' ? { piece: p.vocal.id, dur: p.vocal.dur, bars: p.vocal.bars } : { piece: p.fichier.id };
        const r = await A.envoyerPieces(p.conv, p.type, champs, { cid: p.cid });
        if (retirer) retirer();
        apresEnvoi(p.conv, { seq: r.seq, id: r.id, auteur: moiApi.id, ts: r.ts, type: p.type, texte: null, meta: metaDe(p), repond_a: null, supprime: false, modifie: null, reactions: [] });
        return r;
      } finally { p.enVol = false; }
    }
    /* ⛔ UNE PANNE SE DIT, UNE FOIS PAR ENVOI (relecture du testeur : « En attente de connexion… » était le seul signe, et aucun avis, même sur un 502). Pas de répétition à chaque renvoi : le message
       finit par partir tout seul, la personne n'a rien à faire. Les textes ont leur statut ; ce sont les PIÈCES, longues à envoyer, que la personne laisse en route. */
    const QUI_PARTIRA = (p) => p.type === 'photo' ? (p.photos.length > 1 ? ['tes photos', 'partiront'] : ['ta photo', 'partira']) : p.type === 'vocal' ? ['ton message vocal', 'partira'] : ['ton fichier', 'partira'];
    function direPanne(p, e) {
      if (!p.type || p.dit) return;
      p.dit = true;
      const [qui, verbe] = QUI_PARTIRA(p);
      emettre({ type: 'avis', texte: e && e.code === 'reseau' ? 'Pas de connexion : ' + qui + ' ' + verbe + ' dès que le réseau reviendra.' : 'Le service ne répond pas pour l\'instant : ' + qui + ' ' + verbe + ' dès qu\'il répondra.' });
    }
    function mettreEnEchec(p, e) {
      p.echec = { phrase: phraseDe(e), code: e && e.code, statut: e && e.statut };
      emettre({ type: 'conversation', id: p.conv });
      const [sujet, accord] = sujetEnvoi(p);
      emettre({ type: 'avis', texte: sujet + ' n\'a pas pu être ' + accord + ' : ' + p.echec.phrase });
    }
    /* « Réessayer » : le même envoi (même `cid`, mêmes pièces déjà déposées) repart tout de suite ; « Annuler » le retire pour de bon et rend ses adresses. */
    function reessayer(cid) {
      const p = file.find(x => x.cid === cid && x.echec);
      if (!p || mort) return false;
      p.echec = null; p.essais = 0; p.dit = false;
      emettre({ type: 'conversation', id: p.conv });
      viderFile();
      return true;
    }
    function abandonner(cid) {
      const i = file.findIndex(x => x.cid === cid && !x.enVol);
      if (i < 0) return false;
      const p = file[i]; file.splice(i, 1);
      lesPieces(p).forEach(x => { if (x.id && cachePieces.has(x.id)) liberer(x.id); else if (x.url) revoquerUrl(x.url); });
      emettre({ type: 'conversation', id: p.conv });
      return true;
    }
    const livrer = (p, retirer) => (p.type === 'photo' || p.type === 'vocal' || p.type === 'fichier') ? posterPieces(p, retirer) : poster(p, retirer);
    function planifierFile(n) {
      if (minuterieFile || !file.some(x => !x.echec) || mort) return;
      minuterieFile = planifier(() => { minuterieFile = null; viderFile(); }, attenteEnvoi(n || 0));
    }
    let viderEnCours = false;
    async function viderFile() {
      if (viderEnCours || mort) return;
      viderEnCours = true;
      try {
        for (const p of file.slice()) {
          if (p.echec) continue;                                  // ⛔ un refus qui attend la PERSONNE (« Réessayer ») ne bloque pas ce qui est derrière lui
          if (p.enVol) { planifierFile(0); break; }              // ⛔ un dépôt de pièce est en cours (un autre appel) : ce qui est derrière lui attend son tour
          try { await livrer(p, () => { const i = file.indexOf(p); if (i >= 0) file.splice(i, 1); }); }
          catch (e) {
            if (mort) return;
            if (erreurCoupure(e)) { p.essais++; direPanne(p, e); planifierFile(p.essais); emettre({ type: 'conversation', id: p.conv }); break; }   // ⛔ l'écran est redit : le renvoi a fini d'échouer, « Envoi… » doit s'éteindre
            if (p.type && retentable(e)) { mettreEnEchec(p, e); continue; }
            /* un refus DÉFINITIF (le groupe est devenu « annonces seules », on n'en est plus membre…) : le message ne partira jamais, on le DIT */
            file.splice(file.indexOf(p), 1);
            lesPieces(p).forEach(x => { if (x.id && cachePieces.has(x.id)) liberer(x.id); else if (x.url) revoquerUrl(x.url); });   // la page ne sait plus que ce message existe : ses adresses locales n'ont plus de propriétaire
            emettre({ type: 'conversation', id: p.conv });
            const [sujet, accord] = sujetEnvoi(p);
            emettre({ type: 'avis', texte: sujet + ' n\'a pas pu être ' + accord + ' : ' + (e && e.dit ? (e.phrase ? e.phrase() : e.message) : 'erreur inattendue.') });
          }
        }
      } finally {
        viderEnCours = false;
        /* ⛔ UN « RÉESSAYER » TOUCHÉ PENDANT UN PASSAGE NE RESTE PAS SANS LENDEMAIN : le passage en cours avait déjà dépassé la pièce (il l'avait sautée, en échec) et `viderFile` rendait la main (« déjà en
           cours ») — le passage finissait sans plus rien programmer, et la pièce restait « en attente » pour toujours. Une pièce qui attend sans que rien ne soit prévu pour elle redonne rendez-vous ici.
           (Sans effet quand un rendez-vous existe déjà : `planifierFile` ne double jamais la minuterie.) */
        if (!mort && file.some(x => !x.echec && !x.enVol)) planifierFile(0);
      }
    }
    /* Un message de pièces. Les refus qu'on peut juger ICI (rien à envoyer, trop lourd) tombent avant tout dépôt ; un refus du service rejette (la page le DIT et libère ses adresses) ;
       une coupure met le message dans la file (« En attente de connexion… »), où il repart avec le même `cid`. */
    async function envoyerMedia(id, type, b) {
      const p = { cid: OPMSG.nouveauCid(), conv: id, type, texte: '', t: maintenant(), essais: 0, enVol: false, reponse: null };
      if (type === 'photo') {
        const liste = (b.photos || []).filter(x => x && x.blob && x.blob.size > 0);
        if (!liste.length) throw erreurLocale('vide');
        if (liste.length > PHOTOS_PAR_MESSAGE) throw erreurLocale('trop-de-photos');      // ⛔ jamais « les dix premières, le reste en silence »
        p.photos = liste.map(x => ({ blob: x.blob, url: x.url || null, w: Math.max(1, x.w | 0), h: Math.max(1, x.h | 0), id: null }));
      } else if (type === 'vocal') {
        const v = b.vocal;
        if (!v || !v.blob || !(v.blob.size > 0) || !(v.dur > 0)) throw erreurLocale('vide');
        const barres = (Array.isArray(v.bars) ? v.bars : []).slice(0, 64).map(n => Math.max(0, Math.min(100, Math.round(+n) || 0)));
        /* ⛔ `floor`, pas `round` : le compteur de l'enregistrement montre 1:05 à 65,9 s, et « arrondi » la bulle disait 1:06 (0:01 devenait 0:02) — relecture du testeur */
        p.vocal = { blob: v.blob, url: v.url || null, dur: Math.max(1, Math.min(600, Math.floor(v.dur))), bars: barres.length ? barres : [8], id: null };
      } else {
        const f = b.fichier;
        if (!f || !f.blob || !(f.blob.size > 0)) throw erreurLocale('vide');
        const nom = couperNom(String(f.nom || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[\/\\]/g, '_').trim(), 120) || 'fichier';
        p.fichier = { blob: f.blob, nom, taille: f.blob.size, id: null };
      }
      const l = await limites(), max = maxDe(l, type);
      for (const x of lesPieces(p)) if (x.blob.size > max) throw new OPMSG.ErreurApi('piece_trop_lourde', 413, 0, { max });
      if (!moiApi || mort) throw erreurLocale('introuvable');
      const attend = file.some(x => x.conv === id && !x.echec);
      file.push(p);
      if (attend) { emettre({ type: 'conversation', id }); planifierFile(0); return vueEnAttente(p); }
      const retirer = () => { const i = file.indexOf(p); if (i >= 0) file.splice(i, 1); };
      try { await posterPieces(p, retirer); return { id: p.cid, auteur: moiApi.id, t: p.t, lu: null }; }
      catch (e) {
        if (erreurCoupure(e)) { p.essais++; direPanne(p, e); planifierFile(p.essais); emettre({ type: 'conversation', id }); return vueEnAttente(p); }
        if (retentable(e)) { mettreEnEchec(p, e); return vueEnAttente(p); }
        retirer(); lesPieces(p).forEach(x => { if (x.id) liberer(x.id); });     // refusé pour de bon : les pièces déjà déposées n'ont plus de message (le balayeur du service les ôtera), leur adresse n'a plus de raison d'être gardée
        emettre({ type: 'conversation', id });
        throw e;
      } finally { if (file.length) planifierFile(0); }
    }
    async function envoyer(id, brouillon) {
      brouillon = brouillon || {};
      const media = brouillon.photos && brouillon.photos.length ? 'photo' : brouillon.vocal ? 'vocal' : brouillon.fichier ? 'fichier' : null;
      if (media) return envoyerMedia(id, media, brouillon);
      const texte = valider(brouillon.texte);
      const c = convs.get(id);
      let reponse = null;
      if (brouillon.reponse) { const q = c && c.messages.find(x => x.id === brouillon.reponse); if (q) reponse = q.seq; }
      const p = { cid: OPMSG.nouveauCid(), conv: id, texte, reponse, t: maintenant(), essais: 0 };
      /* Tant qu'une file attend pour cette conversation, le suivant la REJOINT : l'ordre d'envoi est l'ordre des messages. */
      if (file.some(x => x.conv === id && !x.echec)) { file.push(p); emettre({ type: 'conversation', id }); planifierFile(0); return vueEnAttente(p); }
      try { await poster(p); return { id: p.cid, auteur: moiApi.id, t: p.t, texte, lu: null }; }
      catch (e) {
        if (!erreurCoupure(e)) throw e;
        file.push(p); emettre({ type: 'conversation', id }); planifierFile(0);
        return vueEnAttente(p);
      }
    }

    /* ── lu, saisie ── */
    async function marquerLu(id) {
      const c = convs.get(id), r = convsApi.find(x => x.id === id);
      const dernier = c && c.messages.length ? c.messages[c.messages.length - 1].seq : (r ? r.dernier_seq : 0);
      if (!dernier) return;
      const connu = Math.max(c && c.luLocal !== undefined ? c.luLocal : 0, r ? r.lu_seq : 0, c && c.detail ? c.detail.moi.lu_seq : 0);
      if (dernier <= connu) return;
      if (c) c.luLocal = dernier;
      try { await A.marquerLu(id, dernier); }
      catch (e) {
        if (c) c.luLocal = connu;
        /* ⛔ UN « LU » REFUSÉ SE DIT (relecture du gardien, remarque 2) : l'écran appelle `marquerLu` sans attendre de réponse et jette l'erreur (« la source le dira par
           ecouter ») — or la source ne disait rien : disque plein (503) ou 429, aucun avis, le point « non lu » revenait au retour à la liste et l'autre ne verrait jamais « Lu ».
           Une session morte a son propre écran, et une coupure son bandeau « Connexion perdue » : pas d'avis par-dessus. */
        if (!mort && e && e.code !== 'session_requise' && e.code !== 'reseau') emettre({ type: 'avis', texte: 'Ton accusé de lecture n\'a pas pu être envoyé : ' + (e.dit ? (e.phrase ? e.phrase() : e.message) : 'erreur inattendue.') });
        throw e;
      }
      if (r) { r.lu_seq = dernier; r.non_lus = 0; }
      emettre({ type: 'liste' });
    }
    function saisie(id, actif) {
      const t = maintenant();
      if (actif && t - (derniereSaisie.get(id) || 0) < 2500) return Promise.resolve();   // le service n'accepte qu'une frappe par 2 s
      derniereSaisie.set(id, actif ? t : 0);
      return A.saisie(id, !!actif).then(() => {}, () => { /* une frappe perdue n'est pas une erreur à montrer */ });
    }
    function poserSaisie(conv, uid, actif) {
      let S = saisies.get(conv);
      if (!actif) { if (S && S.has(uid)) { annuler(S.get(uid)); S.delete(uid); emettre({ type: 'conversation', id: conv }); } return; }
      if (!S) saisies.set(conv, S = new Map());
      if (S.has(uid)) annuler(S.get(uid));
      S.set(uid, planifier(() => { S.delete(uid); emettre({ type: 'conversation', id: conv }); }, delaiSaisieMs));
      emettre({ type: 'conversation', id: conv });
    }

    /* ── les gestes sur un message ── */
    const trouver = (id, mid) => { const c = convs.get(id); const m = c && c.messages.find(x => x.id === mid); if (!m) throw erreurLocale('introuvable'); return { c, m }; };
    async function modifier(id, mid, texte) {
      const t = valider(texte), { c, m } = trouver(id, mid);
      const r = await A.modifier(id, m.seq, t);
      ranger(c, { seq: m.seq, texte: t, modifie: r.modifie || maintenant() });
      emettre({ type: 'conversation', id }); relireListePlusTard();
    }
    async function supprimer(id, mid, pour) {
      const { c, m } = trouver(id, mid);
      await A.supprimer(id, m.seq, pour === 'moi' ? 'moi' : 'tous');
      oublierMeta(m.meta);
      if (pour === 'moi') c.messages = c.messages.filter(x => x.seq !== m.seq);
      else ranger(c, { seq: m.seq, supprime: true, texte: null, meta: null, reactions: [], modifie: null });
      emettre({ type: 'conversation', id }); relireListePlusTard();
    }
    async function reagir(id, mid, emoji) {
      const { c, m } = trouver(id, mid);
      const r = await A.reagir(id, m.seq, emoji || '');
      ranger(c, { seq: m.seq, reactions: r.reactions || [] });
      emettre({ type: 'conversation', id });
    }

    /* ── groupes, contacts, liens ── */
    /* une photo de profil (d'une personne ou d'un groupe) : trop lourde, on le dit AVANT de la déposer ; rend l'identifiant de la pièce déposée */
    async function deposerAvatar(blob) {
      const l = await limites();
      if (blob.size > l.avatar_max) throw new OPMSG.ErreurApi('piece_trop_lourde', 413, 0, { max: l.avatar_max });
      return (await A.deposer(blob, { genre: 'avatar', max: l.avatar_max })).id;
    }
    async function creerGroupe(spec) {
      spec = spec || {};
      const membres = (spec.membres || []).filter((x, i, t) => t.indexOf(x) === i);
      if (!membres.length) throw erreurLocale('vide');
      /* la photo du groupe se dépose AVANT (une pièce « avatar » n'a pas de conversation). Si ce dépôt est refusé, le groupe est créé quand même — et le refus est DIT : une photo
         perdue en silence serait pire qu'un groupe sans photo. */
      let pieceAvatar = null, refusPhoto = null;
      if (spec.photoBlob && spec.photoBlob.size > 0) {
        try { pieceAvatar = await deposerAvatar(spec.photoBlob); }
        catch (e) { if (e && e.code === 'session_requise') throw e; refusPhoto = e; }
      }
      const r = await A.groupe({ nom: String(spec.nom || '').trim().slice(0, 80) || 'Nouveau groupe', membres, annonces_seules: !!spec.annonces, ephemere_s: spec.ephemeres | 0, avatar_piece: pieceAvatar || undefined });
      if (refusPhoto) emettre({ type: 'avis', texte: 'Le groupe est créé, mais sa photo n\'a pas pu être envoyée : ' + (refusPhoto.dit ? (refusPhoto.phrase ? refusPhoto.phrase() : refusPhoto.message) : 'erreur inattendue.') });
      await relireListe(); emettre({ type: 'liste' });
      const c = convsApi.find(x => x.id === r.conversation.id);
      return c ? resume(c) : { id: r.conversation.id, type: 'groupe', nom: r.conversation.nom || 'Groupe', court: r.conversation.nom || 'Groupe', initiales: '#', avatar: indexAvatar(r.conversation.id), photo: null, epingle: false, membres: [], admins: [], annoncesSeulement: false, ephemeres: 0, nonLu: false, nonLus: 0, apercu: '', t: maintenant(), enLigne: false };
    }
    async function ouvrirDirecte(uid) {
      const r = await A.directe(uid);
      await relireListe(); emettre({ type: 'liste' });
      return r.conversation.id;
    }
    async function conversationPour(membres) {
      const ids = (membres || []).filter((x, i, t) => t.indexOf(x) === i);
      if (ids.length !== 1) throw erreurLocale('bientot');
      const id = await ouvrirDirecte(ids[0]);
      const c = convsApi.find(x => x.id === id);
      return c ? resume(c) : { id };
    }
    const vueMembre = (c, x) => Object.assign(vuePersonne(x), { role: x.role, moi: estMoi(x.id), enLigne: enLigne.has(x.id), contact: contactsApi.some(k => k.id === x.id) });
    async function infos(id) {
      let c = convs.get(id);
      if (!c || !c.detail) { try { const d = await A.conversation(id); for (const m of d.membres) noter(m); c = convs.get(id) || { messages: [], aPlus: false, charge: false }; c.detail = d; convs.set(id, c); } catch (e) { if (e && e.code === 'introuvable') return null; throw e; } }
      const d = c.detail, direct = d.conversation.type === 'direct', autre = direct ? d.membres.find(x => !estMoi(x.id)) : null;
      const canal = d.conversation.type === 'canal';
      const nom = autre ? nomComplet(autre) : (direct ? NOM_SUPPRIME : (d.conversation.nom || (canal ? 'Canal' : 'Groupe')));
      return {
        id, type: d.conversation.type, nom, initiales: autre ? initialesDe(nom) : (direct ? '?' : '#'), avatar: indexAvatar(autre ? autre.id : id), photo: autre ? photoPiece(autre.avatar) : (direct ? null : photoPiece(d.conversation.avatar)), supprime: direct && !autre,
        sourdine: d.moi && d.moi.muet_jusqua > maintenant() ? d.moi.muet_jusqua : 0,
        membres: d.membres.map(x => vueMembre(c, x)), moiAdmin: d.moi.role === 'admin', annoncesSeulement: !!d.conversation.annonces_seules, ephemeres: d.conversation.ephemere_s || 0,
        enLigne: autre ? enLigne.has(autre.id) : false,
        /* un canal dit son espace (l'identifiant que les gestes de l'administrateur réclament) et s'il est privé */
        espace: canal && typeof d.conversation.espace === 'string' ? d.conversation.espace : null, prive: canal && d.conversation.prive === true,
      };
    }
    async function rafraichirDetail(id) {
      const c = convs.get(id); if (!c) return;
      const d = await A.conversation(id);
      for (const m of d.membres) noter(m);
      c.detail = d;
    }
    async function majConversation(id, champs) {
      const o2 = {};
      if (champs.annonces !== undefined) o2.annonces_seules = !!champs.annonces;
      if (champs.ephemeres !== undefined) o2.ephemere_s = champs.ephemeres | 0;
      if (champs.nom !== undefined) o2.nom = String(champs.nom);
      if (champs.photoBlob !== undefined) o2.avatar_piece = champs.photoBlob === null ? null : await deposerAvatar(champs.photoBlob);
      await A.majConversation(id, o2);
      await rafraichirDetail(id); await relireListe();
      emettre({ type: 'conversation', id }); emettre({ type: 'liste' });
    }
    async function retirerMembre(id, uid) { await A.retirerMembre(id, uid); await rafraichirDetail(id); emettre({ type: 'conversation', id }); relireListePlusTard(); }
    async function nommerAdmin(id, uid, admin) { await A.admin(id, uid, !!admin); await rafraichirDetail(id); emettre({ type: 'conversation', id }); }
    async function ajouterMembres(id, uids) { const r = await A.ajouterMembres(id, uids); await rafraichirDetail(id); emettre({ type: 'conversation', id }); return r; }
    async function quitter(id) { await A.quitter(id); convs.delete(id); await relireListe(); emettre({ type: 'liste' }); }
    async function lienGroupe(id) { const r = await A.lienGroupe(id, { max: 20, jours: 7 }); return { code: r.code, expireLe: r.expire_le }; }
    /* ⛔ un lien de CONTACT sert UNE fois : celui qui s'échappe (historique synchronisé, transfert) ajoutait jusqu'à dix inconnus aux contacts mutuels de son auteur, sans son
       accord à l'acceptation (relecture du gardien, remarque 6). Un lien de GROUPE garde plusieurs usages — une invitation s'envoie à plusieurs, et l'administrateur la révoque. */
    async function lienContact() { const r = await A.lienContact({ max: 1, jours: 7 }); return { code: r.code, expireLe: r.expire_le }; }
    async function revoquerLiens() { const r = await A.revoquerLiensContact(); return r.n | 0; }
    async function lireLien(code) {
      const a = await A.lireLien(code);
      noter(a.par);
      return { genre: a.genre, de: nomComplet(a.par), groupe: a.groupe ? { nom: a.groupe.nom, membres: a.groupe.membres } : null };
    }
    async function accepterLien(code) {
      const r = await A.accepterLien(code);
      if (r.genre === 'contact') {
        noter(r.contact);
        await rafraichirContacts();
        const id = await ouvrirDirecte(r.contact.id);
        return { genre: 'contact', conv: id, deja: !!r.deja };
      }
      await relireListe(); emettre({ type: 'liste' });
      return { genre: 'groupe', conv: r.conversation.id, deja: !!r.deja };
    }

    /* ── le temps réel ── */
    function marquerTout() { for (const c of convs.values()) c.charge = false; listeFraiche = false; }
    function surMessage(d, gid) {
      acquitter(gid);
      if (!convsApi.some(x => x.id === d.conv)) relireListePlusTard();   // une conversation neuve (quelqu'un nous a écrit, ou ajoutés)
      const c = convs.get(d.conv);
      const moi = estMoi(d.auteur);
      if (d.cid) { const i = file.findIndex(p => p.cid === d.cid); if (i >= 0) file.splice(i, 1); }   // notre propre envoi, revenu par le flux : la file n'a plus rien à renvoyer
      if (c && c.charge) {
        if (d.relis) A.messages(d.conv, { apres_seq: d.seq - 1, limite: 1 }).then(r => { noterSupprimes(r.supprimes); r.messages.forEach(m => ranger(c, m)); emettre({ type: 'conversation', id: d.conv }); }, () => {});
        else ranger(c, { seq: d.seq, id: d.id, auteur: d.auteur, ts: d.ts, type: d.type, repond_a: d.repond_a || null, texte: d.texte === undefined ? null : d.texte, meta: d.meta || null, supprime: !!d.supprime, illisible: !!d.illisible, reactions: [], modifie: null });
        if (c.detail && d.type === 'systeme') rafraichirDetail(d.conv).then(() => emettre({ type: 'conversation', id: d.conv }), () => {});
      }
      if (d.type === 'systeme' && !(c && c.charge)) { const cc = convs.get(d.conv); if (cc && cc.detail) rafraichirDetail(d.conv).catch(() => {}); }
      if (d.auteur) { const S = saisies.get(d.conv); if (S && S.has(d.auteur)) { annuler(S.get(d.auteur)); S.delete(d.auteur); } }
      emettre({ type: 'conversation', id: d.conv });
      relireListePlusTard();
      if (!moi && d.type !== 'systeme') {
        const r = convsApi.find(x => x.id === d.conv);
        emettre({ type: 'arrivee', conv: d.conv, de: nomDe(d.auteur), convNom: r ? resume(r).nom : null, groupe: r ? r.type === 'groupe' : false, texte: d.supprime ? '' : (d.texte === undefined || d.texte === null ? resumeMedia(d.type, d.meta) : extrait(d.texte, 140)) });
      }
    }
    const gestionnaires = {
      message: surMessage,
      message_modifie: (d) => {
        const c = convs.get(d.conv); if (!c || !c.charge) return;
        if (d.relis) A.messages(d.conv, { apres_seq: d.seq - 1, limite: 1 }).then(r => { r.messages.forEach(m => ranger(c, m)); emettre({ type: 'conversation', id: d.conv }); }, () => {});
        else { ranger(c, { seq: d.seq, texte: d.texte === undefined ? null : d.texte, illisible: d.illisible === true, modifie: d.modifie || maintenant() }); emettre({ type: 'conversation', id: d.conv }); }
        relireListePlusTard();
      },
      message_supprime: (d) => {
        const c = convs.get(d.conv);
        if (c && c.charge) {
          const m = c.messages.find(x => x.seq === d.seq); if (m) oublierMeta(m.meta);
          if (d.pour === 'moi' || d.pour === 'expire') c.messages = c.messages.filter(x => x.seq !== d.seq);
          else ranger(c, { seq: d.seq, supprime: true, texte: null, meta: null, reactions: [], modifie: null });
          emettre({ type: 'conversation', id: d.conv });
        }
        relireListePlusTard();
      },
      reaction: (d) => { const c = convs.get(d.conv); if (!c || !c.charge) return; ranger(c, { seq: d.seq, reactions: d.reactions || [] }); emettre({ type: 'conversation', id: d.conv }); },
      conversation: (d) => {
        const c = convs.get(d.conv);
        const fin = () => { emettre({ type: 'conversation', id: d.conv }); relireListePlusTard(); };
        if (c && c.detail) rafraichirDetail(d.conv).then(fin, fin); else fin();
      },
      retire: (d) => { convs.delete(d.conv); const S = saisies.get(d.conv); if (S) { for (const h of S.values()) annuler(h); saisies.delete(d.conv); } emettre({ type: 'retire', id: d.conv }); relireListePlusTard(); },
      lu: (d) => {
        if (estMoi(d.uid)) { const r = convsApi.find(x => x.id === d.conv); if (r && d.seq > r.lu_seq) { r.lu_seq = d.seq; relireListePlusTard(); } const c = convs.get(d.conv); if (c) c.luLocal = Math.max(c.luLocal || 0, d.seq); return; }
        lecteursDe(d.conv).set(d.uid, { seq: d.seq, ts: d.ts || maintenant() });
        const c = convs.get(d.conv);
        if (c && c.detail) { const x = c.detail.membres.find(m => m.id === d.uid); if (x && (x.lu_seq === null || x.lu_seq === undefined || d.seq > x.lu_seq)) x.lu_seq = d.seq; emettre({ type: 'conversation', id: d.conv }); }
      },
      notification: (d, gid) => {
        acquitter(gid);
        emettre({ type: 'notification', titre: d.titre, texte: d.texte, nature: d.type, cible: d.cible });
        if (d.type === 'contact_ajoute') rafraichirContacts().catch(() => {});
        if (d.type === 'groupe_ajoute') relireListePlusTard();
        if (d.type === 'appel_manque') emettre({ type: 'appels' });          // un appel manqué entre dans l'historique
      },
      saisie: (d) => { if (!estMoi(d.uid)) poserSaisie(d.conv, d.uid, !!d.actif); },
      personne: (d) => {
        if (estMoi(d.uid)) api0.moi().then(m => { moiApi = m; noter(m); emettre({ type: 'moi' }); }, () => {});
        rafraichirContacts().catch(() => {});
        for (const [id, c] of convs) if (c.detail && c.detail.membres.some(m => m.id === d.uid)) rafraichirDetail(id).then(() => emettre({ type: 'conversation', id }), () => {});
        relireListePlusTard();
      },
      presence: (d) => {
        if (d.en_ligne) enLigne.add(d.uid); else enLigne.delete(d.uid);
        emettre({ type: 'presence', id: d.uid }); emettre({ type: 'contacts' }); emettre({ type: 'liste' });
        for (const [id, c] of convs) if (c.detail && c.detail.membres.some(m => m.id === d.uid)) emettre({ type: 'conversation', id });
      },
      /* une réunion a changé (programmée, modifiée, annulée, supprimée, un invité arrivé ou parti, une réponse, un rappel réglé) : la page relit l'agenda et la fiche ouverte ; la conversation de la
         réunion suit son propre chemin (liste, messages) */
      reunion: (d) => { emettre({ type: 'reunions', id: d && typeof d.id === 'string' ? d.id : null, supprime: !!(d && d.supprime) }); relireListePlusTard(); },
      /* quelque chose a changé dans un espace (un membre arrivé ou parti, un rôle, un nom, un canal, l'abonnement) : un événement éphémère — la page relit ce qu'elle a le droit de voir */
      espace: (d) => { emettre({ type: 'espaces', id: d && typeof d.espace === 'string' ? d.espace : null }); relireListePlusTard(); },
      /* un appel change d'état (il sonne pour moi, l'autre répond, il finit) : la vue est celle de l'instant. Un signal de mise en relation (offre, réponse, candidats…) n'est jamais rangé ni montré : il va au moteur. */
      appel: (v, gid) => { moteur.surAppel(v, gid); },
      signal: (s) => { moteur.surSignal(s); },
      resync: () => {
        moteur.surResync();
        marquerTout();
        Promise.all([relireListe(), rafraichirContacts()]).then(() => { emettre({ type: 'liste' }); emettre({ type: 'espaces', id: null }); for (const id of convs.keys()) emettre({ type: 'conversation', id }); }, () => {});
      },
      reseau: (etat) => {
        emettre({ type: 'reseau', etat });
        moteur.surReseau(etat);
        if (etat === 'ok') { verifierSession(); planifierFile(0); }
      },
      erreur: (e) => {
        if (e && e.code === 'session_requise') { sessionMorte('session_requise'); return; }
        emettre({ type: 'avis', texte: e && e.dit ? (e.phrase ? e.phrase() : e.message) : 'Le temps réel a rencontré une erreur.' });
      },
    };
    function demarrerFlux() {
      ecoute = api0.ecouter(gestionnaires);
    }
    function arreter() {
      enMarche = false;
      moteur.arreter();
      oublierPieces();
      if (ecoute) { try { ecoute.fermer(); } catch (e) { /* déjà fermé */ } ecoute = null; }
      if (minuterieFile) { annuler(minuterieFile); minuterieFile = null; }
      for (const S of saisies.values()) for (const h of S.values()) annuler(h);
      saisies.clear();
    }

    /* ── la session ── */
    async function verifierSession() {
      if (!enMarche || mort) return true;
      try {
        const m = await api0.moi();
        if (moiApi && m.id !== moiApi.id) { sessionMorte('identite'); return false; }
        return true;
      } catch (e) {
        if (e && e.code === 'session_requise') { sessionMorte('session_requise'); return false; }
        return true;   // une coupure n'est pas une session morte : on ne sait pas, on ne sort personne
      }
    }
    /* La page revient (onglet visible, réseau revenu) : le flux est rouvert si une pulsation est en retard (`force` : toujours) — une connexion à moitié morte ne se
       détecte pas toute seule avant des minutes (relecture du testeur, D3). */
    function reveiller(force) {
      if (!enMarche || mort || !ecoute || typeof ecoute.rouvrir !== 'function') return false;
      return ecoute.rouvrir({ force: !!force });
    }
    async function demarrer() {
      let m;
      try { m = await api0.moi(); }
      catch (e) { return { connecte: false, motif: (e && e.code) || 'inconnue', phrase: e && e.dit ? (e.phrase ? e.phrase() : e.message) : '' }; }
      moiApi = m; noter(m);
      try {
        installerContacts(await api0.contacts());
        await relireListe();
      } catch (e) {
        if (e && e.code === 'session_requise') return { connecte: false, motif: 'session_requise', phrase: '' };
        /* Un échec de chargement n'est PAS « personne n'est connecté » : on le dit tel quel (le gardien : un 429 ou un 503 devenait un écran de connexion muet). */
        return { connecte: false, motif: (e && e.code) || 'inconnue', phrase: e && e.dit ? (e.phrase ? e.phrase() : e.message) : 'Le chargement a échoué.', connectee: true };
      }
      enMarche = true;
      demarrerFlux();
      ecouterServiceWorker();
      reabonner();                                       // en arrière-plan : un abonnement que ce navigateur porte déjà est redit au service (jamais bloquant, jamais une erreur)
      direFuseau();                                      // dès l'entrée, pas au premier geste d'agenda : on invite quelqu'un qui n'a PAS encore ouvert l'onglet, et sa notification doit dire l'heure de SON fuseau
      return { connecte: true };
    }
    async function connexion(login, pass) {
      const m = await api0.connexionBeta(String(login || ''), String(pass || ''));
      return m;
    }
    async function deconnexion() {
      const sub = await abonnementLocal();                 // le point d'accès push de CE navigateur, s'il y en a un (jamais une erreur)
      await api0.deconnexion(sub && sub.endpoint);        // ⛔ d'abord le service : s'il refuse, le flux reste ouvert et l'écran n'a pas menti. L'abonnement part avec la session, dans la même requête.
      mort = true; arreter();
      if (sub) { try { await sub.unsubscribe(); } catch (e) { /* le service l'a déjà retiré : un navigateur qui garde un abonnement mort ne reçoit rien */ } }
      return true;
    }

    /* ── les réglages du compte (capacité `reglages`) ──
       ⛔ Chaque geste rend ce que le SERVICE a retenu (jamais ce que la page croit avoir demandé) : un réglage refusé lève l'erreur et la page garde l'état d'avant. */
    const vueProfil = (m) => Object.assign(vuePersonne(m), { champs: { prenom: m.prenom || '', nom: m.nom || '', statut: m.statut || '' }, origine: m.origine || '' });
    function adopterMoi(m) { moiApi = m; noter(m); emettre({ type: 'moi' }); relireListePlusTard(); }
    async function profil() { const m = await A.moi(); moiApi = m; noter(m); return vueProfil(m); }
    async function majProfil(champs) {
      champs = champs || {};
      const c = {};
      for (const k of ['prenom', 'nom', 'statut']) if (champs[k] !== undefined) c[k] = String(champs[k]);
      if (!Object.keys(c).length) throw erreurLocale('vide');
      const m = await A.majMoi(c);
      adopterMoi(m);
      return vueProfil(m);
    }
    async function poserPhotoProfil(blob) {
      if (!blob || !(blob.size > 0)) throw erreurLocale('vide');
      const ancien = moiApi && moiApi.avatar;
      const piece = await deposerAvatar(blob);
      const r = await A.poserAvatar(piece);
      poserCache(piece, creerUrl(blob), blob.size);                          // l'image qu'on vient de choisir est déjà là : rien à relire
      if (ancien && ancien !== piece) liberer(ancien);
      adopterMoi(r.moi);
      return vueProfil(r.moi);
    }
    async function retirerPhotoProfil() {
      const ancien = moiApi && moiApi.avatar;
      const r = await A.poserAvatar(null);
      if (ancien) liberer(ancien);
      adopterMoi(r.moi);
      return vueProfil(r.moi);
    }
    const etatConfidentialite = (r) => ({ presence: r.presence !== false, accuses: r.accuses !== false });
    async function confidentialite() { return etatConfidentialite(await A.confidentialite()); }
    async function majConfidentialite(champs) {
      const c = {};
      for (const k of ['presence', 'accuses']) if (champs && typeof champs[k] === 'boolean') c[k] = champs[k];
      if (!Object.keys(c).length) throw erreurLocale('vide');
      const r = etatConfidentialite(await A.majConfidentialite(c));
      if (moiApi) { moiApi.prefs = Object.assign({}, moiApi.prefs, { presence: r.presence, accuses: r.accuses }); emettre({ type: 'moi' }); }      // la barre de la page redit MA présence
      /* ce que je vois des autres change avec mes réglages (leur présence, leur « Lu ») : tout se relit */
      rafraichirContacts().catch(() => {});
      for (const id of convs.keys()) rafraichirDetail(id).then(() => emettre({ type: 'conversation', id }), () => {});
      relireListePlusTard();
      return r;
    }
    const bloques = () => contactsTous.filter(c => c.bloque).map(c => Object.assign(vuePersonne(c), { bloque: true }));
    async function bloquer(uid) { await A.bloquer(uid); await rafraichirContacts(); relireListePlusTard(); }
    async function debloquer(uid) { await A.debloquer(uid); await rafraichirContacts(); relireListePlusTard(); }
    async function deconnecterAutres() {
      const sub = await abonnementLocal();                 // le nôtre reste ; les abonnements push des AUTRES appareils partent avec leurs sessions
      const r = await A.deconnecterAutres(sub && sub.endpoint);
      return { sessions: r.sessions | 0, appareils: r.appareils | 0, notifications: r.notifications | 0 };
    }
    /* ⛔ pas `| 0` : le quota est de 2 Gio (2 147 483 648 octets), un entier signé sur 32 bits le rendrait NÉGATIF */
    const entierPositif = (x) => Number.isFinite(+x) ? Math.max(0, Math.floor(+x)) : 0;
    async function stockageUtilise() { const r = await A.stockage(); return { utilise: entierPositif(r.utilise), max: entierPositif(r.max) }; }
    async function aPropos() {
      const c = await A.config();
      const jours = c.limites && c.limites.suppression_jours;
      return { version: String(c.version || ''), instance: String(c.instance || ''), limites: Object.assign({}, c.limites && c.limites.pieces), suppressionJours: Number.isInteger(jours) && jours > 0 ? jours : null };
    }

    /* ═══ LES NOTIFICATIONS (capacité `notifications`) ═══════════════════════════════════════════════════════════════════════════════════════════
       ⛔ L'état affiché est celui du NAVIGATEUR et du SERVICE, jamais ce qu'on vient de demander : chaque geste rend l'état relu. Chaque refus a sa phrase (pourquoi, et comment en sortir).
       ⛔ Un abonnement n'est jamais créé sans que la personne l'ait demandé : au démarrage, on ne fait que REDIRE au service un abonnement que ce navigateur porte déjà. */
    let cleVapid;                                          // undefined : pas encore lue ; null : le service n'en publie pas (le push y est désactivé)
    async function clePush() {
      if (cleVapid !== undefined) return cleVapid;
      const c = await A.config();
      cleVapid = c && c.push && typeof c.push.vapid === 'string' && c.push.vapid ? c.push.vapid : null;
      return cleVapid;
    }
    const apercuNotif = () => !!(moiApi && moiApi.prefs && moiApi.prefs.apercu_notif === true);
    /* l'abonnement de ce navigateur, ou null : jamais une erreur (une déconnexion ne dépend pas d'une notification) */
    async function abonnementLocal() {
      try { if (!nav.priseEnCharge().ok || nav.permission() !== 'granted') return null; return await nav.abonnementActuel(); }
      catch (e) { return null; }
    }
    const jsonAbonnement = (sub) => { const j = typeof sub.toJSON === 'function' ? sub.toJSON() : sub; return { endpoint: j.endpoint, keys: { p256dh: j.keys && j.keys.p256dh, auth: j.keys && j.keys.auth } }; };
    async function notifEtat() {
      const sortie = { possible: false, raison: null, permission: 'default', active: false, apercu: apercuNotif(), phrase: '' };
      const pc = nav.priseEnCharge();
      if (!pc.ok) return Object.assign(sortie, { raison: pc.raison, phrase: PHRASES_LOCALES['notif_' + pc.raison] });
      if (!(await clePush())) return Object.assign(sortie, { raison: 'service', phrase: PHRASES_LOCALES.notif_service });
      const permission = nav.permission();
      if (permission === 'denied') return Object.assign(sortie, { raison: 'refusee', permission, phrase: PHRASES_LOCALES.notif_refusee });
      let active = false;
      if (permission === 'granted') { try { active = !!(await nav.abonnementActuel()); } catch (e) { active = false; } }
      return Object.assign(sortie, { possible: true, permission, active });
    }
    async function notifActiver() {
      const e0 = await notifEtat();
      if (!e0.possible) throw erreurLocale('notif_' + (e0.raison === 'refusee' ? 'refusee' : e0.raison || 'navigateur'));
      const cle = await clePush();
      if (e0.permission !== 'granted') {
        let rep; try { rep = await nav.demander(); } catch (e) { rep = 'default'; }
        if (rep === 'denied') throw erreurLocale('notif_refusee');
        if (rep !== 'granted') throw erreurLocale('notif_sans_reponse');
      }
      let sub;
      try {
        const reg = await nav.enregistrer();
        sub = await reg.pushManager.getSubscription();
        const cleAvant = sub ? nav.cleDe(sub) : null;
        if (sub && cleAvant && cleAvant !== cle) { try { await sub.unsubscribe(); } catch (e) { /* tant pis : le subscribe qui suit dira ce qu'il en est */ } sub = null; }   // un abonnement fait avec une autre clé du service ne servirait plus
        if (!sub) sub = await nav.souscrire(reg, cle);
      } catch (e) { throw erreurLocale('notif_abonnement'); }
      try { await A.pushAbonner(jsonAbonnement(sub)); }
      catch (e) { try { await sub.unsubscribe(); } catch (x) { /* rien */ } throw e; }      // ⛔ pas d'abonnement du navigateur que le service ne connaît pas : l'interrupteur mentirait
      return notifEtat();
    }
    async function notifDesactiver() {
      const sub = await nav.abonnementActuel().catch(() => null);
      if (sub) {
        await A.pushDesabonner(sub.endpoint);               // le service d'abord : s'il refuse, rien n'a changé et l'erreur se dit
        try { await sub.unsubscribe(); } catch (e) { /* le service ne lui écrira plus */ }
      }
      return notifEtat();
    }
    async function notifApercu(actif) {
      const m = await A.majMoi({ prefs: { apercu_notif: !!actif } });
      moiApi = m; noter(m);
      return notifEtat();
    }
    async function notifEssai() { const r = await A.pushEssai(); return { appareils: r.appareils | 0, envoyes: r.envoyes | 0 }; }
    /* un abonnement que ce navigateur porte déjà est redit au service (idempotent) : il a pu le perdre (accès rouvert, appareil retiré), et un appareil prêté suit son dernier utilisateur */
    async function reabonner() {
      try {
        if (!nav.priseEnCharge().ok || nav.permission() !== 'granted') return false;
        const sub = await nav.abonnementActuel();
        if (!sub) return false;
        await A.pushAbonner(jsonAbonnement(sub));
        return true;
      } catch (e) { return false; }
    }
    let swEcoute = false;
    function ecouterServiceWorker() {
      if (swEcoute) return;
      swEcoute = true;
      try {
        nav.surMessage((d) => {
          const m = d && d.type === 'ouvrir' && typeof d.url === 'string' ? MOTIF_OUVRIR.exec(d.url) : null;
          if (m && !mort) emettre({ type: 'ouvrir', conv: m[1] });          // seule une adresse de CETTE forme ouvre quelque chose : jamais une adresse venue d'ailleurs
          const r = d && d.type === 'ouvrir' && typeof d.url === 'string' ? MOTIF_OUVRIR_REUNION.exec(d.url) : null;
          if (r && !mort) emettre({ type: 'ouvrir', reunion: r[1] });
          if (d && d.type === 'ouvrir' && typeof d.url === 'string' && MOTIF_OUVRIR_APPELS.test(d.url) && !mort) emettre({ type: 'ouvrir', appels: true });      // la notification d'un appel (sonnerie ou manqué) mène à l'onglet des appels
        });
      } catch (e) { /* un navigateur sans service worker n'a pas de notification à toucher */ }
    }
    /* ── l'acquittement : « j'ai REÇU et MONTRÉ les événements jusqu'à gid ». Seule une page VISIBLE acquitte (une page cachée ne montre rien : la notification doit partir). Une rafale
       d'événements ne fait qu'UNE requête, avec le plus grand identifiant. ── */
    let ackVu = 0, ackEnvoye = 0, ackMinuterie = null;
    function acquitter(gid) {
      if (!Number.isInteger(gid) || gid <= ackEnvoye || mort) return;
      let visible = true; try { visible = nav.visible(); } catch (e) { visible = true; }
      if (!visible) return;
      ackVu = Math.max(ackVu, gid);
      if (ackMinuterie) return;
      ackMinuterie = planifier(async () => {
        ackMinuterie = null;
        const g = ackVu;
        if (mort || g <= ackEnvoye) return;
        try { await A.acquitter(g); ackEnvoye = g; } catch (e) { /* un acquittement perdu ne coûte qu'une notification de trop */ }
      }, delaiAckMs);
    }

    /* ═══ SOURDINE, EXPORT, SUPPRESSION (capacité `compte`) ═══════════════════════════════════════════════════════════════════════════════════════ */
    async function sourdine(id, duree) {
      if (!Object.prototype.hasOwnProperty.call(SOURDINES, duree)) throw erreurLocale('invalide');
      await A.prefs(id, { muet_jusqua: duree === 'off' ? 0 : maintenant() + SOURDINES[duree] });
      await rafraichirDetail(id); await relireListe();
      emettre({ type: 'conversation', id }); emettre({ type: 'liste' });
    }
    async function exporterDonnees() { const r = await A.exporterDonnees(); return { blob: r.blob, nom: r.nom }; }
    async function supprimerCompte() {
      suppressionEnCours = true;
      let r;
      try { r = await A.supprimerCompte(); }
      catch (e) { suppressionEnCours = false; throw e; }
      mort = true; arreter();
      const sub = await nav.abonnementActuel().catch(() => null);          // le service a retiré les abonnements ; ce navigateur n'a plus de raison de garder le sien
      if (sub) { try { await sub.unsubscribe(); } catch (e) { /* rien */ } }
      return { suppression_le: r.suppression_le };
    }

    /* ═══ LES ESPACES PROFESSIONNELS, LEURS CANAUX ET MESSAGES PRO (capacité `espaces`) ══════════════════════════════════════════════════════════════
       ⛔ UN ESPACE EST UNE ENTREPRISE : ses membres se voient entre eux (« Contacts de l'entreprise ») et nulle part ailleurs — aucune recherche par nom, aucun annuaire. Le service décide de tout (rôle,
       formule, places) : ce module rend ce que le service a dit, jamais ce que la page croit avoir demandé. Un refus garde sa forme (`ErreurApi` : `raison` « impaye » ou « perso » pour
       l'administrateur, `portail`, `places`) ; la page DIT le refus, elle n'en invente pas la cause.
       ⛔ Une adresse de paiement (Stripe) n'est rendue que si elle est en https : la page l'ouvre, elle n'ouvre pas n'importe quoi. */
    const FORMULES = ['pro', 'perso', 'impaye'];
    const formuleDe = (f) => FORMULES.includes(f) ? f : 'perso';
    const ADRESSE_HTTPS = /^https:\/\/[^\s"'<>]{4,2000}$/;
    const vueEspaceListe = (x) => ({ id: x.id, nom: x.nom, role: x.role, proprio: !!x.proprio, moiAdmin: x.role === 'admin', membres: x.membres_n | 0 });
    const vueCanal = (k) => ({ id: k.id, nom: k.nom, prive: !!k.prive, membres: k.membres_n | 0 });
    function vueEspace(d) {
      const a = d.admin;
      return { id: d.espace.id, nom: d.espace.nom, proprio: !!d.espace.proprio, role: d.moi.role, moiAdmin: d.moi.role === 'admin', membres: d.membres_n | 0, canaux: (d.canaux || []).map(vueCanal), fonctionsPro: d.fonctions_pro === true,
        admin: a ? { formule: formuleDe(a.formule), motif: String(a.motif || ''), sursisJusqua: Number.isInteger(a.sursis_jusqua) ? a.sursis_jusqua : null, places: Number.isInteger(a.places) ? a.places : null, placesDepassees: a.places_depassees === true, invitations: a.invitations | 0 } : null };
    }
    const espacesChanges = (id) => emettre({ type: 'espaces', id: id || null });
    async function espaces() {
      const r = await A.espaces();
      return { espaces: (r.espaces || []).map(vueEspaceListe), formule: formuleDe(r.formule), abonnementOuvert: r.abonnement_ouvert === true };
    }
    async function espace(id) { return vueEspace(await A.espace(id)); }
    async function espaceCreer(nom) { const d = await A.creerEspace(String(nom || '').trim()); espacesChanges(d.espace.id); return vueEspace(d); }
    async function espaceRenommer(id, nom) { const d = await A.majEspace(id, String(nom || '').trim()); espacesChanges(id); return vueEspace(d); }
    async function espaceTransferer(id, uid) { const d = await A.transfererEspace(id, uid); espacesChanges(id); return vueEspace(d); }
    async function espaceQuitter(id) { await A.quitterEspace(id); await relireListe(); emettre({ type: 'liste' }); espacesChanges(id); }
    async function espaceDissoudre(id) { await A.supprimerEspace(id); await relireListe(); emettre({ type: 'liste' }); espacesChanges(id); }
    /* « Contacts de l'entreprise » : les membres de l'espace, avec leur rôle ; `contact` = déjà dans mes contacts, `moi` = c'est moi */
    async function espaceContacts(id) {
      const r = await A.contactsEspace(id);
      for (const p of r.contacts) noter(p);
      return { espace: { id: r.espace.id, nom: r.espace.nom }, contacts: r.contacts.map(p => Object.assign(vuePersonne(p), { role: p.role === 'admin' ? 'admin' : 'membre', proprio: p.proprio === true, moi: !!p.moi, contact: !!p.contact, statut: p.statut || '', enLigne: enLigne.has(p.id) })) };
    }
    async function membreRole(id, uid, admin) { await A.roleMembreEspace(id, uid, !!admin); espacesChanges(id); }
    /* retirer quelqu'un révoque les liens d'invitation de l'espace (il en connaissait les codes) : la page le dit, l'administrateur en recrée un */
    async function membreRetirer(id, uid) { const r = await A.retirerMembreEspace(id, uid); espacesChanges(id); return { liensRevoques: r && Number.isInteger(r.liens_revoques) ? r.liens_revoques : 0 }; }
    async function invitationCreer(id, o2) {
      const r = await A.creerInvitation(id, o2 || {});
      espacesChanges(id);
      return { code: r.code, expireLe: r.expire_le, max: r.max | 0 };
    }
    async function invitationsRevoquer(id) { const r = await A.revoquerInvitations(id); espacesChanges(id); return r.n | 0; }
    /* l'aperçu d'un lien d'invitation : qui invite et dans quel espace — il n'accepte rien */
    async function invitationLire(code) {
      const a = await A.lireInvitation(code);
      noter(a.par);
      return { de: nomComplet(a.par), espace: { nom: a.espace.nom, membres: a.espace.membres | 0 } };
    }
    async function invitationAccepter(code) {
      const r = await A.accepterInvitation(code);
      await relireListe(); emettre({ type: 'liste' }); espacesChanges(r.espace.id);
      return { deja: !!r.deja, espace: { id: r.espace.id, nom: r.espace.nom } };
    }
    /* un canal : public (tous les membres de l'espace) ou privé (ceux qu'on y met). `canaux` : la liste que le service rend, telle que MOI je la vois. */
    async function canalCreer(id, spec) {
      spec = spec || {};
      const prive = spec.prive === true;
      const r = await A.creerCanal(id, { nom: String(spec.nom || '').trim(), prive, membres: prive ? (spec.membres || []).filter((x, i, t) => typeof x === 'string' && t.indexOf(x) === i) : undefined });
      await relireListe(); emettre({ type: 'liste' }); espacesChanges(id);
      return { id: r.canal.id, nom: r.canal.nom, prive: !!r.canal.prive, canaux: (r.canaux || []).map(vueCanal) };
    }
    async function canalRenommer(id, cid, nom) {
      const r = await A.majCanal(id, cid, String(nom || '').trim());
      await rafraichirDetail(cid).catch(() => {}); await relireListe();
      emettre({ type: 'conversation', id: cid }); emettre({ type: 'liste' }); espacesChanges(id);
      return (r.canaux || []).map(vueCanal);
    }
    async function canalSupprimer(id, cid) {
      const r = await A.supprimerCanal(id, cid);
      convs.delete(cid); await relireListe(); emettre({ type: 'retire', id: cid }); emettre({ type: 'liste' }); espacesChanges(id);
      return (r.canaux || []).map(vueCanal);
    }
    async function canalAjouterMembres(id, cid, uids) { const r = await A.ajouterMembresCanal(id, cid, uids); await rafraichirDetail(cid); emettre({ type: 'conversation', id: cid }); return Array.isArray(r.ajoutes) ? r.ajoutes.length : 0; }
    async function canalRetirerMembre(id, cid, uid) { await A.retirerMembreCanal(id, cid, uid); await rafraichirDetail(cid); emettre({ type: 'conversation', id: cid }); }
    /* ── Messages Pro : l'état d'un espace est lu SANS réseau côté service ; payer et gérer rendent l'adresse de Stripe où la page va ; « J'ai réglé — vérifier » relit chez Stripe ── */
    async function abonnementOffres() {
      const r = await A.offresAbonnement();
      return { ouvert: r.ouvert === true, mode: r.mode === 'live' ? 'live' : 'test', places: { min: (r.places && r.places.min) | 0, max: (r.places && r.places.max) | 0 }, defaut: String(r.defaut || ''),
        offres: (r.offres || []).map(o => ({ id: String(o.id), libelle: String(o.libelle || ''), par: o.par === 'an' ? 'an' : 'mois', eurosParPlace: Number(o.euros_par_place) || 0 })) };
    }
    const vueAbonnement = (r) => ({
      ouvert: r.ouvert === true, mode: r.mode === 'live' ? 'live' : 'test', toutOuvert: r.tout_ouvert === true,
      abonnement: r.abonnement ? { statut: String(r.abonnement.statut || ''), places: r.abonnement.places | 0, finPeriode: Number(r.abonnement.fin_periode) || 0, annule: r.abonnement.annule === true, reluLe: Number(r.abonnement.relu_le) || 0 } : null,
      formule: formuleDe(r.formule), motif: String(r.motif || ''), sursisJusqua: Number.isInteger(r.sursis_jusqua) ? r.sursis_jusqua : null,
      places: Number.isInteger(r.places) ? r.places : null, membres: r.membres | 0, placesDepassees: r.places_depassees === true, paiementEnAttente: r.paiement_en_attente === true, stripeMuet: r.stripe_muet === true });
    const adresseDePaiement = (r) => { if (!r || typeof r.url !== 'string' || !ADRESSE_HTTPS.test(r.url)) throw new OPMSG.ErreurApi('reponse_illisible', 200, 0); return { url: r.url, reprise: r.reprise === true }; };
    async function abonnement(id) { return vueAbonnement(await A.etatAbonnement(id)); }
    async function abonnementPayer(id, spec) { return adresseDePaiement(await A.payerAbonnement(id, { places: spec && spec.places, cycle: spec && spec.cycle })); }
    async function abonnementPortail(id) { return adresseDePaiement(await A.portailAbonnement(id)); }
    async function abonnementRelire(id) { const r = vueAbonnement(await A.relireAbonnement(id)); espacesChanges(id); return r; }

    /* ═══ LES RÉUNIONS PROGRAMMÉES (capacité `reunions`, étape 6) ═══════════════════════════════════════════════════════════════════════════════════════
       Le service rend les heures en millisecondes UTC ; la page les habille dans le fuseau de l'appareil. ⛔ Une réunion ne porte que des IDENTIFIANTS de personnes : la page les habille au moment de
       peindre (`personne(id)`), donc une photo arrivée après coup apparaît sans relire l'agenda. ⛔ La réunion, l'hôte et le rôle viennent du service, jamais d'un champ de la page. */
    const STATUTS_INVITE = ['attente', 'accepte', 'decline', 'peutetre'];
    const statutInvite = (s) => STATUTS_INVITE.indexOf(s) >= 0 ? s : 'attente';
    const listeRappels = (l) => Array.isArray(l) ? l.filter(Number.isInteger) : [];
    const vueMoiReunion = (m) => ({ hote: !!(m && m.hote), statut: statutInvite(m && m.statut), rappels: listeRappels(m && m.rappels), rappelsPerso: !!(m && m.rappels_perso) });
    function vueReunion(r) {
      if (r.hote) noter(r.hote);
      return { id: r.id, conv: r.conv, titre: String(r.titre || ''), lieu: String(r.lieu || ''), debut: r.debut, fin: r.fin, tz: String(r.tz || ''), repetition: String(r.repetition || 'aucune'),
        n: Number.isInteger(r.n) ? r.n : null, jusqua: typeof r.jusqua === 'string' ? r.jusqua : null, annulee: r.annulee === true, version: r.version | 0, rappels: listeRappels(r.rappels),
        hote: r.hote && typeof r.hote.id === 'string' ? r.hote.id : null, illisible: r.illisible === true };
    }
    /* le fuseau de CET appareil est dit au service une fois par séance : les notifications de la personne se composent dans SON fuseau (sans lui, dans celui de la réunion) */
    let fuseauDit = false;
    function direFuseau() {
      if (fuseauDit || !moiApi) return;
      fuseauDit = true;
      let tz = null; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { tz = null; }
      if (typeof tz === 'string' && tz && moiApi.tz !== tz) A.majMoi({ tz }).then((m) => { if (m && m.id === moiApi.id) moiApi = Object.assign({}, moiApi, { tz: m.tz }); }, () => { /* un fuseau qui n'est pas parti repart à la séance suivante */ });
    }
    /* une réunion qu'on ne trouve pas se dit « cette réunion », pas « la conversation » (le service répond la même chose pour une réunion inexistante et pour une réunion dont on n'est pas invité) */
    const pourReunion = async (promesse) => { try { return await promesse; } catch (e) { if (e && e.code === 'introuvable') throw erreurLocale('reunion_introuvable'); throw e; } };
    async function reunions(du, au) {
      direFuseau();
      const r = await A.reunions(du, au);
      return (r.reunions || []).map((x) => {
        for (const p of x.participants || []) noter(p);
        return Object.assign(vueReunion(x), { moi: vueMoiReunion(x.moi), participantsN: x.participants_n | 0, participants: (x.participants || []).map((p) => p.id), occurrences: (x.occurrences || []).map((o) => ({ debut: o.debut, fin: o.fin })) });
      });
    }
    async function reunion(id) {
      direFuseau();
      const d = await pourReunion(A.reunion(id));
      for (const p of d.invites || []) noter(p);
      return Object.assign(vueReunion(d.reunion), {
        moi: vueMoiReunion(d.moi), invites: (d.invites || []).map((p) => ({ id: p.id, statut: statutInvite(p.statut), hote: !!p.hote })), prochaine: d.prochaine ? { debut: d.prochaine.debut, fin: d.prochaine.fin } : null });
    }
    /* ce que la page peut dire d'une réunion : rien d'autre ne part (ni hôte, ni identifiant, ni version) */
    const CHAMPS_REUNION = ['titre', 'lieu', 'debut', 'fin', 'tz', 'repetition', 'jusqua', 'n', 'invites', 'rappels', 'notifier'];
    const corpsReunion = (champs) => { const c = {}; for (const k of CHAMPS_REUNION) if (champs && champs[k] !== undefined) c[k] = champs[k]; return c; };
    const reunionChangee = (id, supprime) => { emettre({ type: 'reunions', id: id || null, supprime: !!supprime }); relireListePlusTard(); };
    async function programmer(champs) {
      direFuseau();
      const d = await A.programmer(corpsReunion(champs));
      for (const p of d.invites || []) noter(p);
      reunionChangee(d.reunion.id);
      return { id: d.reunion.id, conv: d.reunion.conv, nonInvites: Array.isArray(d.non_invites) ? d.non_invites.length : 0 };
    }
    async function modifierReunion(id, champs) { await pourReunion(A.modifierReunion(id, corpsReunion(champs))); reunionChangee(id); }
    async function annulerReunion(id) { await pourReunion(A.annulerReunion(id)); reunionChangee(id); }
    async function supprimerReunion(id, o2) { await pourReunion(A.supprimerReunion(id, { notifier: !(o2 && o2.notifier === false) })); reunionChangee(id, true); }
    async function inviterReunion(id, uids, o2) {
      const r = await pourReunion(A.inviterReunion(id, uids, { notifier: !(o2 && o2.notifier === false) }));
      reunionChangee(id);
      return { ajoutes: Array.isArray(r.ajoutes) ? r.ajoutes.length : 0, nonAjoutes: Array.isArray(r.non_ajoutes) ? r.non_ajoutes.length : 0 };
    }
    async function retirerInviteReunion(id, uid) { await pourReunion(A.retirerInviteReunion(id, uid)); reunionChangee(id); }
    /* la sortie de l'INVITÉ : la réunion disparaît de son agenda et de ses conversations (comme si elle était supprimée, POUR LUI) */
    async function quitterReunion(id) { await pourReunion(A.quitterReunion(id)); reunionChangee(id, true); }
    async function repondreReunion(id, statut) { direFuseau(); await pourReunion(A.repondreReunion(id, statut)); reunionChangee(id); }
    async function rappelsReunion(id, rappels) { direFuseau(); await pourReunion(A.rappelsReunion(id, rappels)); reunionChangee(id); }
    /* le fichier .ics : une adresse de CE service (jamais une adresse venue du service), que la page ouvre par un lien — SANS réseau, donc pas par `A`, dont chaque méthode est enveloppée en asynchrone */
    const adresseIcs = (id, o2) => api0.adresseIcs(id, o2 || {});
    /* l'envoi par courriel est-il ouvert ? vrai/faux, ou null quand on n'a pas pu le savoir (on ne dit « pas encore ouvert » que quand le service l'a DIT) */
    async function courrielOuvert() { try { const c = await A.config(); return c && c.courriel && typeof c.courriel.ouvert === 'boolean' ? c.courriel.ouvert : null; } catch (e) { return null; } }
    async function courrielReunion(id, adresse, o2) {
      const x = { }; if (o2 && Number.isInteger(o2.occurrence)) x.occurrence = o2.occurrence;
      await pourReunion(A.courrielReunion(id, String(adresse || '').trim(), x));
    }

    const rejeter = (code) => () => Promise.reject(erreurLocale(code));
    /* ── les appels à deux (capacité `appels`, étape 7) : le moteur ci-dessus, branché sur le service, les personnes déjà vues et l'acquittement des sonneries ── */
    const moteur = creerMoteurAppels({
      api: A, webrtc: o.webrtc || webrtcReel(racine), maintenant, planifier, annuler, emettre, delais: o.appelsDelais,
      personne, noter, acquitter, nomSupprime: NOM_SUPPRIME, erreurLocale,
      refus: (code, statut, extra) => new OPMSG.ErreurApi(code, statut || 0, 0, extra),
      fermerNotif: (tag) => { if (typeof nav.fermerNotifications === 'function') return Promise.resolve(nav.fermerNotifications(tag)).catch(() => {}); },
    });
    /* ⛔ combien de messages n'ont PAS encore quitté l'appareil (réseau coupé, service muet) : la page les perd quand elle repart de zéro ou qu'on la ferme — rien n'est rangé sur
       l'appareil, c'est voulu —, donc elle DOIT le dire (relectures du gardien, remarque 1, et du testeur, D8). */
    const enAttente = () => file.length;
    const source = {
      capacites: { service: true, connexion: true, photos: true, vocaux: true, fichiers: true, avatars: true, reglages: true, appels: true, appelsMedias: true, appelsGroupe: false, reunions: true, actionsMessage: true, groupeInfos: true, liens: true, presence: true, saisie: true, historique: true, notifications: true, compte: true, espaces: true, texteMax: 8000 },
      demarrer, connexion, deconnexion, verifierSession, arreter, enAttente, reveiller,
      surSessionMorte: (cb) => { suiviMort = cb; },
      /* `presence` : MA présence est-elle montrée ? Coupée, la barre de la page ne doit pas dire « Disponible » avec un point vert (relecture du testeur) : les autres ne me voient plus en ligne. */
      moi: () => moiApi ? Object.assign(vuePersonne(moiApi), { id: moiApi.id, presence: !(moiApi.prefs && moiApi.prefs.presence === false) }) : null,
      contacts: () => contactsApi.map(vueContact).sort((x, y) => x.nom.localeCompare(y.nom, 'fr')),
      personne, rafraichirContacts,
      lister, ouvrir, precedents, envoyer, marquerLu, saisie,
      modifier, supprimer, reagir,
      creerGroupe, ouvrirDirecte, conversationPour, infos, majConversation, retirerMembre, nommerAdmin, ajouterMembres, quitter, lienGroupe,
      lienContact, revoquerLiens, lireLien, accepterLien,
      /* ── les pièces et les réglages ── */
      pieceUrl, pieceBlob, reessayer, abandonner, limitesPieces: limites,
      profil, majProfil, poserPhotoProfil, retirerPhotoProfil, confidentialite, majConfidentialite, bloques, bloquer, debloquer, deconnecterAutres, stockage: stockageUtilise, aPropos,
      /* ── les notifications, la sourdine, l'export, la suppression ── */
      notifEtat, notifActiver, notifDesactiver, notifApercu, notifEssai, sourdine, exporterDonnees, supprimerCompte,
      /* ── les espaces professionnels, leurs canaux, Messages Pro (capacité `espaces`) ── */
      espaces, espace, espaceCreer, espaceRenommer, espaceTransferer, espaceQuitter, espaceDissoudre, espaceContacts, membreRole, membreRetirer,
      invitationCreer, invitationsRevoquer, invitationLire, invitationAccepter,
      canalCreer, canalRenommer, canalSupprimer, canalAjouterMembres, canalRetirerMembre,
      abonnementOffres, abonnement, abonnementPayer, abonnementPortail, abonnementRelire,
      /* ── les réunions programmées (capacité `reunions`) ── */
      reunions, reunion, programmer, modifierReunion, annulerReunion, supprimerReunion, inviterReunion, retirerInviteReunion, quitterReunion, repondreReunion, rappelsReunion, adresseIcs, courrielOuvert, courrielReunion,
      /* ── les appels à deux (capacité `appels`) : l'historique, lancer, l'appel qui sonne ou court (`appel`), répondre, raccrocher ; les pistes que la page remet au moteur et le flux de l'autre qu'elle lit ── */
      appels: (filtre) => moteur.liste(filtre),
      demarrerAppel: (spec) => moteur.lancer(spec),
      appel: (id) => Promise.resolve(moteur.instantane(id)),
      terminerAppel: (id) => moteur.terminer(id),
      repondreAppel: (id, accepte) => moteur.repondre(id, accepte !== false),
      appelPistes: (id, pistes) => moteur.pistes(id, pistes),
      appelFlux: (id) => moteur.flux(id),
      appelActif: () => moteur.actif(),
      appelFermeture: () => moteur.fermeture(),
      ecouter(cb) {
        ecouteurs.push(cb);
        return () => { const i = ecouteurs.indexOf(cb); if (i >= 0) ecouteurs.splice(i, 1); };
      },
    };
    return source;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { creerSourceServeur, creerMoteurAppels, serveursSurs, candidatSur, erreurLocale, initialesDe, couperNom };
  else { racine.OPMSG_creerSourceServeur = creerSourceServeur; racine.OPMSG_SOURCE = creerSourceServeur(); }
})(typeof window !== 'undefined' ? window : globalThis);
