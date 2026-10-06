/* ══ LE CLIENT D'OP MESSAGES — LA COUTURE ENTRE UNE INTERFACE ET LE SERVICE ═════════════════
 *
 * L'interface (la page minimale de l'étape 1, puis la vraie interface de Justin) n'appelle JAMAIS
 * `fetch` ni `EventSource` elle-même : elle appelle ce module. C'est lui qui connaît les routes, les
 * en-têtes, la forme des réponses et les codes de refus — de sorte que les écrans validés ne se
 * réécrivent pas le jour où une route change.
 *
 * ⛔ UN `fetch` NE JETTE PAS SUR UN 4xx. Chaque appel regarde `r.ok` ET lit le code d'erreur du
 * service : un écran qui annonce « envoyé » sur un 400, un 429 ou une coupure ment (c'est arrivé au
 * portail d'OP GESTION, 6 cas faux sur 9). Tout refus devient une `ErreurApi` portant `.code`,
 * `.statut`, `.retry` et un `.message` FRANÇAIS que l'écran peut montrer tel quel (`dire()`).
 * ⛔ UN REFUS DOIT SAVOIR SE DIRE : `MESSAGES` a une phrase pour CHAQUE code que le service peut
 * rendre (`tests/test-906.js` le recense dans le code du service) — un refus muet fait croire à une
 * panne. Et une réussite n'efface pas une erreur d'ailleurs : l'écran remet son verdict à zéro à
 * chaque essai.
 * ⛔ DEUX EN-TÊTES À CHAQUE ÉCRITURE : `Content-Type: application/json` ET `X-OPM: 1` (un formulaire
 * d'un autre site ne peut pas le poser), le cookie de session partant tout seul (même origine).
 * ⛔ AUCUN JETON ICI : le cookie de session est `HttpOnly`, le JavaScript de la page ne le voit
 * jamais — c'est voulu (une injection de script ne peut pas le voler).
 *
 * Le module s'exécute aussi sous Node (les bancs lui injectent `fetch` et `EventSource`) : il ne
 * touche ni `window` ni `document`.
 */
(function (racine) {
  'use strict';

  const MESSAGES = {
    champ_invalide: 'Une information est incorrecte ou manquante.',
    session_requise: 'Ta session a expiré. Reconnecte-toi.',
    adresse_non_confirmee: 'Confirme ton adresse e-mail pour faire cela.',
    interdit: 'Tu n\'as pas le droit de faire cela ici.',
    introuvable: 'Introuvable (la conversation a peut-être été supprimée ou tu n\'y es plus).',
    message_inconnu: 'Le message auquel tu réponds n\'existe plus.',
    quota_atteint: 'Trop de demandes en peu de temps. Réessaie dans un instant.',
    trop_d_essais: 'Trop d\'essais de connexion. Réessaie dans quelques minutes.',
    identifiants: 'Identifiant ou mot de passe incorrect.',
    acces_coupe: 'Cet accès a été coupé. Demande à l\'équipe de le rouvrir.',
    verrouille: 'Accès temporairement verrouillé après plusieurs échecs. Réessaie dans un moment.',
    porte_indisponible: 'La connexion est momentanément indisponible. Réessaie plus tard.',
    origine_refusee: 'Cette page n\'est pas autorisée à envoyer cette demande.',
    entete_requis: 'Demande refusée : mets la page à jour puis réessaie.',
    annonces_seules: 'Seuls les administrateurs peuvent écrire dans ce groupe.',
    trop_long: 'Ce message est trop long.',
    trop_gros: 'La demande est trop volumineuse.',
    json_invalide: 'La demande est illisible. Réessaie.',
    requete_invalide: 'La demande est mal formée.',
    lien_invalide: 'Ce lien n\'est plus valable (expiré, révoqué ou déjà utilisé).',
    lien_propre: 'C\'est ton propre lien : envoie-le à quelqu\'un d\'autre.',
    delai_depasse: 'Un message ne se modifie plus après 15 minutes.',
    type_invalide: 'Cette action n\'est pas possible sur ce type de message.',
    groupe_plein: 'Ce groupe a atteint sa taille maximale.',
    dernier_admin: 'Un groupe garde toujours un administrateur : nomme-en un autre d\'abord.',
    conversation_directe: 'Cette action n\'existe pas dans une conversation à deux.',
    disque_plein: 'Le service est momentanément en lecture seule. Réessaie plus tard.',
    trop_de_flux: 'Trop d\'onglets ouverts sur ce compte. Ferme-en un.',
    /* les pièces (photos, vocaux, fichiers, photo de profil) */
    longueur_requise: 'L\'envoi n\'a pas dit sa taille : mets la page à jour, puis réessaie.',
    piece_trop_lourde: 'Ce fichier est trop lourd.',
    envoi_trop_lent: 'L\'envoi s\'est arrêté en route (connexion trop lente) : vérifie ton réseau, puis réessaie.',
    type_refuse: 'Ce type de fichier n\'est pas accepté ici : une photo doit être une image (JPEG, PNG, WebP ou GIF), un vocal un son.',
    piece_inconnue: 'Cette pièce n\'existe plus (elle a expiré ou a été supprimée) : renvoie-la.',
    plage_invalide: 'La partie demandée du fichier n\'existe pas.',
    quota_stockage: 'Ton espace de stockage est plein : supprime des messages qui contiennent des photos ou des fichiers, puis réessaie.',
    /* les notifications push, l'export des données, la suppression du compte */
    service_push_refuse: 'Le service de notification de ce navigateur n\'est pas pris en charge par OP MESSAGES.',
    push_indisponible: 'Les notifications sont momentanément indisponibles sur ce service.',
    confirmation_requise: 'La suppression du compte doit être confirmée.',
    export_quotidien: 'Tu as déjà exporté tes données aujourd\'hui : un export par jour.',
    compte_supprime: 'Ce compte a été supprimé : tu ne peux plus lui écrire.',
    /* l'identifiant « Prénom#1234 », le numéro et les demandes de contact */
    identifiant_invalide: 'Tape l\'identifiant en entier : le prénom, « # » et les chiffres (par exemple Camille#4821), ou un numéro de téléphone.',
    numero_invalide: 'Ce numéro de téléphone n\'est pas valable : écris-le avec l\'indicatif du pays (+33…).',
    recherches_plafond: 'Tu as fait beaucoup de recherches aujourd\'hui : réessaie plus tard.',
    ajouts_plafond: 'Tu as envoyé beaucoup de demandes aujourd\'hui : réessaie demain.',
    demandes_plafond: 'Tu as déjà beaucoup de demandes en attente : retires-en quelques-unes, ou attends qu\'on te réponde.',
    identifiant_plein: 'Impossible de te donner un identifiant avec ce prénom pour l\'instant : réessaie plus tard.',
    /* les espaces professionnels, leurs canaux, Messages Pro et l'abonnement. ⛔ Aucune promesse que le service ne tient pas : « fonction Pro » ne dit pas POURQUOI (seul l'administrateur le lit, dans
       l'état de l'abonnement), et « l'abonnement n'est pas encore ouvert » est la vérité d'un service sans clé de paiement. */
    formule_requise: 'Cette fonction fait partie de Messages Pro.',
    /* le forfait d'une PERSONNE : les réunions s'organisent avec lui, les rejoindre reste gratuit. ⛔ Le NOM du forfait et son prix viennent du service (l'écran les compose depuis `/api/moi/perso-plus`) : ces phrases ne les écrivent pas. */
    formule_deja_incluse: 'Ton espace est déjà en Messages Pro, qui comprend les réunions : un forfait personnel ne t\'apporterait rien de plus.',
    trop_d_espaces: 'Limite atteinte : trois espaces dont tu es propriétaire, vingt dont tu es membre.',
    trop_de_canaux: 'Cet espace a atteint son nombre maximal de canaux (100).',
    membre_inconnu: 'Cette personne ne fait pas partie de l\'espace.',
    canal_public: 'Un canal public réunit tous les membres de l\'espace : on y entre et on en sort avec l\'espace.',
    proprio: 'Le propriétaire ne peut ni quitter son espace ni changer de rôle : transfère d\'abord la propriété à un autre membre.',
    destinataire_invalide: 'Cette personne ne peut pas recevoir la propriété de l\'espace (compte supprimé ou en cours de suppression).',
    espace_indisponible: 'Cet espace ne peut pas accueillir de nouveau membre pour l\'instant : demande à son administrateur.',
    places_epuisees: 'Toutes les places de l\'abonnement sont prises : ajoute des places (Réglages › Abonnement › Gérer) avant d\'inviter quelqu\'un.',
    abonnement_actif: 'Un abonnement court encore pour cet espace : résilie-le (Réglages › Abonnement › Gérer) avant de supprimer l\'espace.',
    espace_abonne: 'Tu es le seul membre d\'un espace qui a un abonnement en cours : résilie-le ou confie l\'espace à quelqu\'un, puis supprime ton compte.',
    paiement_en_cours: 'Un paiement a été commencé pour cet espace et on n\'en connaît pas l\'issue : touche « J\'ai réglé — vérifier » (Réglages › Abonnement), ou réessaie dans un moment (une page de paiement non réglée expire au bout de 24 heures).',
    abonnement_non_ouvert: 'L\'abonnement n\'est pas encore ouvert.',
    places_invalides: 'Le nombre de places est incorrect (au moins le nombre de membres, 500 au plus).',
    offre_inconnue: 'Cette offre n\'existe pas.',
    adresse_requise: 'Pour payer, il faut une adresse e-mail confirmée sur ton compte.',
    abonnement_existant: 'Cet espace a déjà un abonnement : change les places ou la carte depuis « Gérer l\'abonnement ».',
    pas_d_abonnement: 'Cet espace n\'a pas encore d\'abonnement à gérer.',
    abonnement_pris: 'Cet abonnement est déjà rattaché à un autre espace.',
    stripe_muet: 'Le service de paiement ne répond pas. Rien n\'est changé : réessaie dans un moment.',
    paiement_indisponible: 'Le paiement n\'a pas pu être préparé. Réessaie plus tard.',
    /* les réunions programmées (étape 6) : chaque refus que l'agenda peut rendre a sa phrase. ⛔ Aucune promesse que le service ne tient pas (« Rejoindre » n'existe pas encore). */
    titre_vide: 'Donne un titre à la réunion.',
    fin_avant_debut: 'La fin de la réunion doit tomber après son début.',
    heure_invalide: 'Cette date ou cette heure n\'est pas valable.',
    heure_inexistante: 'Cette heure n\'existe pas ce jour-là (changement d\'heure) : choisis-en une autre.',
    fuseau_inconnu: 'Ce fuseau horaire n\'est pas connu.',
    repetition_invalide: 'Cette répétition n\'existe pas.',
    fin_repetition_invalide: 'La fin de la répétition est incorrecte : une date après le début (dans les dix ans), ou entre 2 et 1 000 fois.',
    rappel_invalide: 'Ce rappel n\'existe pas (5 minutes, 15 minutes, 1 heure ou 1 jour avant, quatre au plus).',
    reunion_trop_longue: 'Une réunion programmée ne dépasse pas 30 jours.',
    fenetre_invalide: 'La période demandée est incorrecte (62 jours au plus).',
    trop_d_invites: 'Une réunion compte 100 invités au plus.',
    /* le nombre de PERSONNES d'une réunion (organisateur compris) est dit par le service (`max`, voir `ErreurApi.phrase`) : cette phrase-ci n'est que le repli quand il ne l'a pas dit */
    reunion_pleine: 'Cette réunion a atteint son nombre maximal de personnes, organisateur compris.',
    trop_de_reunions: 'Tu as atteint le nombre maximal de réunions à venir (300) : supprime-en une.',
    reunion_annulee: 'Cette réunion est annulée : elle ne se modifie plus.',
    hote_non_retirable: 'L\'organisateur ne se retire pas de sa réunion : annule-la ou supprime-la.',
    hote_non_quittable: 'L\'organisateur ne quitte pas sa réunion : annule-la ou supprime-la.',
    trop_de_modifications: 'Cette réunion vient d\'être modifiée vingt fois en une heure. Réessaie dans quelques minutes.',
    hote_reponse: 'Tu organises cette réunion : tu n\'as pas à y répondre.',
    reunion_quitter: 'On ne quitte pas la conversation d\'une réunion toute seule : ouvre la réunion et choisis « Quitter la réunion ».',
    occurrence_inconnue: 'Cette date ne fait pas partie de la réunion.',
    /* l'invitation par courriel : chaque refus a sa phrase, et aucune ne promet ce que le service ne tient pas (« l'envoi par courriel n'est pas encore ouvert » est la vérité d'un service sans relais) */
    courriel_non_ouvert: 'L\'envoi par courriel n\'est pas encore ouvert.',
    /* le compte par adresse e-mail (« comme Discord ») */
    inscription_fermee: 'La création de compte n\'est pas encore ouverte.',
    mdp_faible: 'Ce mot de passe se devine trop facilement. Choisis-en un d\'au moins 10 caractères, sans ton prénom, ton adresse ni une suite comme « azerty » ou « 123456 ».',
    conditions_requises: 'Coche la case : il faut avoir au moins 15 ans et accepter les conditions d\'utilisation.',
    reseau_plafond: 'Trop de demandes depuis ce réseau. Réessaie plus tard.',
    code_recent: 'Un code vient de partir. Attends une minute avant d\'en redemander un.',
    courriel_plafond: 'Trop de codes demandés pour cette adresse. Réessaie plus tard.',
    code_invalide: 'Ce code n\'est pas le bon, ou il a expiré. Vérifie-le, ou demande-en un nouveau.',
    code_plafond: 'Trop de codes faux. Réessaie dans une heure.',
    identifiants_plafond: 'Trop d\'essais de connexion sur ce compte. Réessaie plus tard, ou choisis « Mot de passe oublié ? » : un code partira à ton adresse.',
    service_occupe: 'Le service est très demandé en ce moment. Réessaie dans quelques secondes.',
    courriel_invalide: 'Cette adresse courriel n\'est pas valable.',
    courriel_quota_compte: 'Tu as déjà envoyé dix invitations par courriel ces dernières 24 heures : réessaie plus tard.',
    courriel_quota_destinataire: 'Cette adresse a déjà reçu deux invitations de ta part cette semaine : réessaie dans quelques jours.',
    courriel_echec: 'Le courriel n\'a pas pu partir. Il n\'est pas compté dans tes envois : réessaie dans un moment.',
    reunion_passee: 'Cette réunion est terminée : il n\'y a plus rien à envoyer.',
    /* les appels à deux (étape 7) : chaque refus que l'appel peut rendre a sa phrase. ⛔ Aucune promesse que le service ne tient pas (l'appel de groupe n'existe pas encore ; le relais n'est pas toujours installé). */
    occupe: 'Cette personne est déjà dans un appel. Réessaie dans un moment.',
    appel_a_deux: 'Cette conversation n\'a pas d\'appel : une réunion a sa salle (« Rejoindre »), un canal n\'appelle personne.',
    /* les appels à plusieurs et les salles (étape 8) : chaque refus a sa phrase. ⛔ Aucune promesse que le service ne tient pas (couper le micro d'un autre n'est qu'une DEMANDE). */
    appel_complet: 'La salle est pleine : quatre personnes au plus en vidéo, six en audio.',
    verrouillee: 'L\'hôte a verrouillé la salle : personne ne peut plus y entrer.',
    exclu: 'L\'hôte t\'a retiré de cette salle : tu ne peux pas y revenir.',
    groupe_trop_grand: 'Ce groupe compte trop de monde pour un appel (douze personnes au plus avec toi). Programme une réunion, ou choisis les personnes à appeler.',
    partage_interdit: 'L\'hôte n\'autorise pas le partage d\'écran.',
    evt_trop_gros: 'Ce message est trop gros pour la salle (2 Ko au plus).',
    reunion_hors_horaire: 'Cette réunion n\'est pas ouverte : on y entre de quinze minutes avant son début à trois heures après sa fin.',
    appele_sature: 'Cette personne reçoit beaucoup d\'appels en ce moment. Réessaie plus tard.',
    appel_pris: 'Cet appel a déjà été pris sur un autre appareil.',
    appel_fini: 'Cet appel est déjà terminé.',
    appareil_non_lie: 'Cet appel se passe sur un autre de tes appareils.',
    appel_pas_en_cours: 'L\'appel n\'est pas encore en cours.',
    signal_trop_gros: 'Un message de mise en relation est trop gros pour être envoyé.',
    erreur_interne: 'Une erreur est survenue de notre côté. Réessaie.',
    serveur: 'Le service ne répond pas correctement. Réessaie dans un instant.',
    reseau: 'Pas de connexion au service. Vérifie ton réseau.',
    reponse_illisible: 'Le service a répondu quelque chose d\'inattendu. Réessaie.',
    inconnue: 'Une erreur inattendue est survenue.',
  };
  const dire = (code) => MESSAGES[code] || MESSAGES.inconnue;

  /* Une attente lisible : « 40 s », « 15 min ». */
  const attenteLisible = (s) => s < 90 ? s + ' s' : s < 5400 ? Math.ceil(s / 60) + ' min' : Math.ceil(s / 3600) + ' h';   // « 40 s », « 15 min », « 20 h » (l'export, qui ne se refait qu'une fois par jour)
  /* Un nombre d'octets en mots : « 12 Mo », « 850 Ko ». */
  const tailleLisible = (o) => o >= 1048576 ? (Math.round(o / 104857.6) / 10).toString().replace('.', ',') + ' Mo' : o >= 1024 ? Math.round(o / 1024) + ' Ko' : o + ' o';
  class ErreurApi extends Error {
    constructor(code, statut, retry, extra) {
      /* ⛔ `quota_atteint` veut dire DEUX choses : 429 « trop de demandes en peu de temps » (réessaie dans un instant) et 402 « ton espace de stockage est plein » (supprime
         des pièces). Le statut les distingue ; la phrase aussi — dire « réessaie dans un instant » à quelqu'un dont l'espace est plein serait une fausse promesse. */
      super(code === 'quota_atteint' && statut === 402 ? MESSAGES.quota_stockage : dire(code));
      this.name = 'ErreurApi'; this.code = code; this.statut = statut || 0; this.retry = retry || 0;
      /* le maximum d'une pièce (octets), quand le service le dit (413) : l'écran écrit « 12 Mo au plus » */
      this.max = extra && Number.isInteger(extra.max) ? extra.max : 0;
      /* ce que le service ajoute à un refus d'ABONNEMENT : POURQUOI une fonction Pro refuse (`impaye` : le paiement est en retard ; `perso` : l'espace n'a pas d'abonnement — que le seul
         administrateur reçoit), le lien du portail de facturation (`abonnement_existant`), les places et les membres (`places_epuisees`), le minimum de places (`places_invalides`). Chacun est lu
         avec son type : un champ qui n'a pas la forme attendue n'existe pas. Le lien du portail n'est gardé que s'il est en https — l'écran l'ouvre, il n'ouvre pas n'importe quoi. */
      this.raison = extra && (extra.raison === 'impaye' || extra.raison === 'perso' || extra.raison === 'organisateur') ? extra.raison : '';
      /* `offre` : QUEL forfait ouvrirait la fonction refusée (« perso_plus » : celui d'une PERSONNE, pour organiser une réunion ou tenir les outils d'une salle) — l'écran propose alors la feuille de ce forfait au lieu de
         dire « fonction Pro ». `abonnementOuvert` : un bouton « S'abonner » mènerait-il quelque part ? Lus avec leur type, comme le reste : un champ qui n'a pas la forme attendue n'existe pas. */
      this.offre = extra && extra.offre === 'perso_plus' ? 'perso_plus' : '';
      this.abonnementOuvert = !!(extra && extra.abonnement_ouvert === true);
      this.portail = extra && typeof extra.portail === 'string' && /^https:\/\/[^\s]{4,2000}$/.test(extra.portail) ? extra.portail : '';
      this.places = extra && Number.isInteger(extra.places) ? extra.places : 0;
      this.membres = extra && Number.isInteger(extra.membres) ? extra.membres : 0;
      this.min = extra && Number.isInteger(extra.min) ? extra.min : 0;
      /* `occupe` : vrai quand c'est MOI qui suis déjà dans un appel (peut-être sur un autre appareil), faux quand c'est l'autre — la phrase n'est pas la même */
      this.moi = !!(extra && extra.moi === true);
      /* ⛔ `dit` : cette erreur a une phrase FRANÇAISE que l'écran peut montrer telle quelle. Une erreur d'ailleurs (une exception de la page
         elle-même) ne porte pas ce drapeau : l'écran n'affiche alors qu'une phrase générique, jamais le message technique. */
      this.dit = true;
    }
    /* La phrase, avec l'attente quand le service l'a donnée (`Retry-After`) : « Trop de demandes en peu de temps (réessaie dans 20 s). »
       ⛔ UNE SEULE INVITATION À RÉESSAYER : la phrase du service finit par « Réessaie dans un instant. » ; ajouter « (réessaie dans 20 s) » derrière la disait deux fois, et « dans un instant »
       contredisait « 20 s » (relecture du testeur). Quand l'attente est connue, elle REMPLACE la clause de la phrase. */
    phrase() {
      if (this.code === 'occupe' && this.moi) return 'Tu es déjà dans un appel (peut-être sur un autre de tes appareils).';
      if (this.code === 'piece_trop_lourde' && this.max > 0) return this.message.replace(/\.$/, '') + ' (' + tailleLisible(this.max) + ' au plus).';
      if (this.code === 'reunion_pleine' && this.max > 0) return 'Une réunion compte ' + this.max + ' personnes au plus, organisateur compris : celle-ci est complète.';
      if (this.code === 'formule_requise' && this.offre === 'perso_plus') return this.raison === 'organisateur' ? 'Cet outil est réservé aux réunions : l\'organisateur de cet appel n\'a pas de forfait pour les organiser.'
        : this.raison === 'impaye' ? 'Ton paiement n\'est pas passé : mets ta carte à jour (Réglages › Abonnement) pour organiser des réunions. Rejoindre une réunion où tu es invité reste gratuit.'
        : 'Les réunions s\'organisent avec un forfait (Réglages › Abonnement). Rejoindre une réunion où tu es invité reste gratuit.';
      if (!(this.retry > 0)) return this.message;
      const sans = this.message.replace(/\s*R[ée]essaie[^.]*\.$/i, '').replace(/\.$/, '');
      return sans + ' (réessaie dans ' + attenteLisible(this.retry) + ').';
    }
  }

  /* Un identifiant d'envoi unique : c'est lui qui rend un renvoi inoffensif (le service ne crée
     jamais deux messages pour le même `cid`). */
  function nouveauCid(rand) {
    const c = rand || (typeof crypto !== 'undefined' ? crypto : null);
    if (c && typeof c.randomUUID === 'function') return c.randomUUID().replace(/-/g, '');
    let s = '';
    for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }

  /* Range un message dans une liste triée par `seq`, sans doublon : un événement livré « au moins
     une fois » ne doit pas faire paraître deux fois la même bulle. */
  function fusionner(liste, msg) {
    const i = liste.findIndex(m => m.seq === msg.seq);
    if (i >= 0) { liste[i] = Object.assign({}, liste[i], msg); return liste; }
    liste.push(msg); liste.sort((a, b) => a.seq - b.seq);
    return liste;
  }

  const EVENEMENTS = ['message', 'message_modifie', 'message_supprime', 'reaction', 'conversation', 'retire', 'lu', 'notification', 'saisie', 'presence', 'personne', 'espace', 'reunion', 'appel', 'signal', 'salle_evt', 'resync'];

  function creer(opts) {
    const o = opts || {};
    const base = String(o.base || '').replace(/\/+$/, '');
    const f = o.fetch || (typeof fetch !== 'undefined' ? fetch.bind(typeof window !== 'undefined' ? window : undefined) : null);
    const ES = o.EventSource || (typeof EventSource !== 'undefined' ? EventSource : null);
    if (!f) throw new Error('fetch indisponible');

    /* La réponse d'une route : le JSON d'une réussite, ou une `ErreurApi` qui se dit. `opts.piece` : c'est le dépôt d'une pièce — un relais (nginx) qui refuse le poids avant que le
       service ne voie le corps répond 413 en HTML, ce qui veut dire « trop lourd » (avec le maximum que la page connaît : `opts.max`), jamais « inconnue ». */
    async function jsonDe(r, opts) {
      let txt = '', j = null;
      try { txt = await r.text(); } catch (e) { txt = ''; }
      try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = null; }
      if (!r.ok) {
        const retry = parseInt(r.headers && r.headers.get ? (r.headers.get('Retry-After') || '') : '', 10) || (j && j.retry) || 0;
        let code = j && typeof j.error === 'string' && MESSAGES[j.error] ? j.error : (r.status >= 500 ? 'serveur' : 'inconnue');
        let extra = j;
        if (opts && opts.piece && r.status === 413 && code === 'inconnue') { code = 'piece_trop_lourde'; extra = opts.max > 0 ? { max: opts.max } : null; }
        throw new ErreurApi(code, r.status, retry, extra);
      }
      /* 2xx mais pas du JSON : un relais qui a répondu à la place du service n'est pas une réussite. */
      if (j === null || typeof j !== 'object') throw new ErreurApi('reponse_illisible', r.status, 0);
      return j;
    }
    async function appel(methode, chemin, corps, opts) {
      const h = { Accept: 'application/json' };
      const init = { method: methode, headers: h, credentials: 'same-origin', cache: 'no-store' };
      if (opts && opts.keepalive === true) init.keepalive = true;   // un raccrochage lancé quand la page se ferme doit PARTIR quand même (c'est tout le but)
      if (methode !== 'GET') { h['Content-Type'] = 'application/json'; h['X-OPM'] = '1'; init.body = JSON.stringify(corps === undefined ? {} : corps); }
      let r;
      try { r = await f(base + chemin, init); }
      catch (e) { throw new ErreurApi('reseau', 0, 0); }
      return jsonDe(r);
    }
    const e = encodeURIComponent;
    const rq = (obj) => { const p = Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => e(k) + '=' + e(v)).join('&'); return p ? '?' + p : ''; };

    const api = {
      base, appel,
      config: () => appel('GET', '/api/config'),
      /* le compte par adresse e-mail (« comme Discord ») — routes publiques : la session est posée par la réponse (cookie) */
      melInscrire: (champs) => appel('POST', '/api/mel/inscrire', champs),
      melConfirmer: (courriel, code) => appel('POST', '/api/mel/confirmer', { courriel, code }),
      melConnexion: (courriel, mdp) => appel('POST', '/api/mel/connexion', { courriel, mdp }),
      melOubli: (courriel) => appel('POST', '/api/mel/oubli', { courriel }),
      melReinit: (courriel, code, mdp) => appel('POST', '/api/mel/reinit', { courriel, code, mdp }),
      /* « Mettre à jour » : relit SANS CACHE les fichiers de l'application (liste FIXE, de cette origine : jamais une adresse reçue), en disant combien d'octets sont arrivés.
         La page recharge ensuite : le navigateur ne relit que ce qu'il vient de recevoir. Un refus ou une coupure jette `ErreurApi` comme le reste. */
      relireApplication: async (surProgres) => {
        const FICHIERS = ['/', '/opmsg-ui.js', '/source-serveur.js', '/api.js'];
        const dire = typeof surProgres === 'function' ? surProgres : () => {};
        let recu = 0;
        for (let i = 0; i < FICHIERS.length; i++) {
          let r;
          try { r = await f(base + FICHIERS[i], { credentials: 'same-origin', cache: 'reload' }); }
          catch (e2) { throw new ErreurApi('reseau', 0, 0); }
          if (!r.ok) throw new ErreurApi(r.status >= 500 ? 'serveur' : 'inconnue', r.status, 0);
          const total = +(r.headers && r.headers.get ? r.headers.get('content-length') : 0) || 0;
          if (r.body && r.body.getReader) {
            const lecteur = r.body.getReader(); let ici = 0;
            for (;;) {
              let morceau;
              try { morceau = await lecteur.read(); } catch (e2) { throw new ErreurApi('reseau', 0, 0); }
              if (morceau.done) break;
              ici += morceau.value.length; recu += morceau.value.length;
              dire((i + (total ? Math.min(1, ici / total) : 0.5)) / FICHIERS.length, recu);
            }
          } else { try { recu += (await r.arrayBuffer()).byteLength; } catch (e2) { throw new ErreurApi('reseau', 0, 0); } }
          dire((i + 1) / FICHIERS.length, recu);
        }
        return { octets: recu };
      },
      /* La porte bêta : identifiant et mot de passe de la Tour. Rend la personne connectée. */
      connexionBeta: async (login, pass) => {
        const r = await appel('POST', '/api/beta/entrer', { login, pass });
        /* se reconnecter avant l'échéance ANNULE la suppression du compte : le service le dit, la personne doit l'apprendre (`suppression_annulee` accompagne la personne rendue) */
        return r.suppression_annulee === true ? Object.assign({}, r.moi, { suppression_annulee: true }) : r.moi;
      },
      /* `endpoint` : le point d'accès push de CET appareil (facultatif) — il part avec la session, dans la même requête */
      deconnexion: (endpoint) => appel('POST', '/api/compte/deconnexion', typeof endpoint === 'string' && endpoint ? { endpoint } : undefined),
      moi: async () => (await appel('GET', '/api/moi')).moi,
      majMoi: async (champs) => (await appel('POST', '/api/moi/maj', champs)).moi,
      contacts: async () => (await appel('GET', '/api/contacts')).contacts,
      lienContact: (o2) => appel('POST', '/api/contacts/lien', o2 || {}),
      lireLien: async (code) => (await appel('POST', '/api/liens/lire', { code })).apercu,
      accepterLien: (code) => appel('POST', '/api/liens/accepter', { code }),
      retirerContact: (uid) => appel('POST', '/api/contacts/retirer', { uid }),
      bloquer: (uid) => appel('POST', '/api/contacts/bloquer', { uid }),
      debloquer: (uid) => appel('POST', '/api/contacts/debloquer', { uid }),
      /* l'identifiant « Prénom#1234 » EXACT ou un numéro EXACT (jamais un nom seul), puis une DEMANDE que la personne accepte */
      contactParIdentifiant: (identifiant) => appel('POST', '/api/contacts/identifiant', { identifiant }),
      contactParNumero: (numero) => appel('POST', '/api/contacts/chercher', { numero }),
      demanderContact: (id) => appel('POST', '/api/contacts/demander', { id }),
      demandesContact: () => appel('GET', '/api/contacts/demandes'),
      repondreDemande: (id, accepter) => appel('POST', '/api/contacts/demandes/repondre', { id, accepter: accepter === true }),
      annulerDemande: (id) => appel('POST', '/api/contacts/demandes/annuler', { id }),
      personne: async (id) => (await appel('GET', '/api/personnes/' + e(id))).personne,
      conversations: async () => (await appel('GET', '/api/conversations')).conversations,
      directe: (uid) => appel('POST', '/api/conversations/directe', { uid }),
      groupe: (champs) => appel('POST', '/api/conversations/groupe', champs),
      conversation: (id) => appel('GET', '/api/conversations/' + e(id)),
      majConversation: (id, champs) => appel('POST', '/api/conversations/' + e(id) + '/maj', champs),
      ajouterMembres: (id, uids) => appel('POST', '/api/conversations/' + e(id) + '/membres/ajouter', { uids }),
      retirerMembre: (id, uid) => appel('POST', '/api/conversations/' + e(id) + '/membres/retirer', { uid }),
      admin: (id, uid, admin) => appel('POST', '/api/conversations/' + e(id) + '/admins', { uid, admin }),
      lienGroupe: (id, o2) => appel('POST', '/api/conversations/' + e(id) + '/lien', o2 || {}),
      /* Révoquer les codes d'invitation : ceux du groupe (administrateur), ou mes liens de contact. */
      revoquerLiensGroupe: (id) => appel('POST', '/api/conversations/' + e(id) + '/liens/revoquer'),
      revoquerLiensContact: () => appel('POST', '/api/contacts/liens/revoquer'),
      quitter: (id) => appel('POST', '/api/conversations/' + e(id) + '/quitter'),
      prefs: (id, champs) => appel('POST', '/api/conversations/' + e(id) + '/prefs', champs),
      messages: (id, q) => appel('GET', '/api/conversations/' + e(id) + '/messages' + rq(q)),
      /* Un envoi porte un `cid` : si la réponse se perd, `envoyer(id, texte, {cid})` avec le MÊME cid
         rend `deja:true` et ne crée rien de plus. */
      envoyer: async (id, texte, o2) => {
        const x = o2 || {}, cid = x.cid || nouveauCid();
        const r = await appel('POST', '/api/conversations/' + e(id) + '/messages', { cid, texte, reponse_a: x.reponse_a, mentions: x.mentions });
        return Object.assign({ cid }, r);
      },
      /* Un message qui cite des pièces DÉJÀ déposées : `type` photo (`pieces:[{id,w,h}]`), vocal (`piece`, `dur`, `bars`) ou fichier (`piece`). Même `cid` que l'envoi d'avant
         = un renvoi inoffensif (`deja:true`) : la réponse perdue d'un envoi réussi ne crée pas de second message. */
      envoyerPieces: async (id, type, champs, o2) => {
        const x = o2 || {}, cid = x.cid || nouveauCid();
        const r = await appel('POST', '/api/conversations/' + e(id) + '/messages', Object.assign({ cid, type, reponse_a: x.reponse_a }, champs));
        return Object.assign({ cid }, r);
      },
      modifier: (id, seq, texte) => appel('POST', '/api/conversations/' + e(id) + '/messages/modifier', { seq, texte }),
      supprimer: (id, seq, pour) => appel('POST', '/api/conversations/' + e(id) + '/messages/supprimer', { seq, pour: pour || 'tous' }),
      reagir: (id, seq, emoji) => appel('POST', '/api/conversations/' + e(id) + '/messages/reagir', { seq, emoji }),
      marquerLu: (id, seq) => appel('POST', '/api/conversations/' + e(id) + '/lu', { seq }),
      saisie: (id, actif) => appel('POST', '/api/conversations/' + e(id) + '/saisie', { actif: !!actif }),
      notifications: () => appel('GET', '/api/notifications'),
      notificationsLues: (ids) => appel('POST', '/api/notifications/lues', ids ? { ids } : { toutes: true }),
      sync: (depuis) => appel('GET', '/api/sync' + rq({ depuis })),

      /* ── Les pièces (photos, vocaux, fichiers, photo de profil) ──
         ⛔ Le corps d'un dépôt est BINAIRE (`application/octet-stream`, jamais du JSON ni un formulaire) et sa longueur est connue d'avance : un `Blob` la porte, un flux ne la
         porterait pas (le service répond 411). Le type n'est pas dit : le service le juge aux octets. `conv` + `genre` (photo|vocal|fichier) + `nom` (fichier) pour une conversation,
         `genre: 'avatar'` seul pour une photo de profil (d'une personne ou d'un groupe). Rend `{ id, taille, mime }`. */
      deposer: async (corps, o2) => {
        const x = o2 || {};
        const h = { Accept: 'application/json', 'Content-Type': 'application/octet-stream', 'X-OPM': '1' };
        /* ⛔ le NOM d'un fichier voyage dans un en-tête (encodé en pourcentage), jamais dans l'adresse : une adresse se retrouve dans le journal d'accès d'un proxy */
        if (x.nom !== undefined && x.nom !== null) h['X-OPM-Nom'] = encodeURIComponent(String(x.nom));
        let r;
        try { r = await f(base + '/api/pieces' + rq({ conv: x.conv, genre: x.genre }), { method: 'POST', headers: h, credentials: 'same-origin', cache: 'no-store', body: corps }); }
        catch (er) { throw new ErreurApi('reseau', 0, 0); }
        return jsonDe(r, { piece: true, max: x.max });
      },
      /* Lit une pièce : `{ blob, type }`. Un refus (404 : elle n'existe plus, ou on n'a pas le droit — le service ne distingue pas) devient une `ErreurApi`. */
      lirePiece: async (id) => {
        let r;
        try { r = await f(base + '/api/pieces/' + e(id), { method: 'GET', credentials: 'same-origin', cache: 'no-store' }); }
        catch (er) { throw new ErreurApi('reseau', 0, 0); }
        if (!r.ok) await jsonDe(r);                                   // jette toujours : ErreurApi avec la phrase du refus
        let blob;
        try { blob = await r.blob(); } catch (er) { throw new ErreurApi('reseau', 0, 0); }
        return { blob, type: (r.headers && r.headers.get ? r.headers.get('Content-Type') : '') || '' };
      },
      poserAvatar: (piece) => appel('POST', '/api/moi/avatar', { piece: piece === undefined ? null : piece }),
      stockage: () => appel('GET', '/api/moi/stockage'),
      confidentialite: () => appel('GET', '/api/moi/confidentialite'),
      majConfidentialite: (champs) => appel('POST', '/api/moi/confidentialite', champs),
      /* `endpoint` : le point d'accès push de CET appareil (facultatif) — il reste, ceux des autres appareils partent avec leurs sessions */
      deconnecterAutres: (endpoint) => appel('POST', '/api/moi/appareils/deconnecter', typeof endpoint === 'string' && endpoint ? { endpoint } : undefined),

      /* ── Les notifications push, l'acquittement, l'export des données, la suppression du compte ── */
      pushAbonner: (sub) => appel('POST', '/api/push/abonner', { sub }),
      pushDesabonner: (endpoint) => appel('POST', '/api/push/desabonner', { endpoint }),
      pushEssai: () => appel('POST', '/api/push/essai'),
      /* « j'ai REÇU et MONTRÉ les événements jusqu'à gid » : la page visible l'envoie, et la notification qui doublerait ce qu'elle montre ne part pas */
      acquitter: (gid) => appel('POST', '/api/flux/ack', { gid }),
      /* L'export : un FICHIER. Le corps n'est pas lu comme du JSON de réponse (il est gros, et la page n'en fait rien) : on rend le `Blob` et le nom que le service propose. Un refus (429 : un
         par jour) est une `ErreurApi` comme les autres. */
      exporterDonnees: async () => {
        let r;
        try { r = await f(base + '/api/compte/export', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-OPM': '1' }, credentials: 'same-origin', cache: 'no-store', body: '{}' }); }
        catch (er) { throw new ErreurApi('reseau', 0, 0); }
        if (!r.ok) await jsonDe(r);                                   // jette toujours : ErreurApi avec la phrase du refus
        let blob;
        try { blob = await r.blob(); } catch (er) { throw new ErreurApi('reseau', 0, 0); }   // un fichier coupé en route n'est pas un export
        const cd = (r.headers && r.headers.get ? r.headers.get('Content-Disposition') : '') || '';
        const m = /filename="([A-Za-z0-9._-]{1,80})"/.exec(cd);
        return { blob, nom: m ? m[1] : 'opmessages-export.json' };
      },
      /* programme la suppression du compte à 14 jours et coupe tout : rend `{ ok, suppression_le }` (la date, en millisecondes) */
      supprimerCompte: () => appel('POST', '/api/compte/supprimer', { confirmation: 'SUPPRIMER' }),

      /* ── Les espaces professionnels, leurs membres, leurs invitations, leurs canaux (étape 5) ──
         ⛔ L'espace se dit dans l'ADRESSE, jamais dans le corps : le service le relit de la base et de la session. Les confirmations de suppression (`SUPPRIMER`) sont posées ICI, une seule fois :
         l'écran qui les demande à la personne ne connaît pas le mot que le service attend. */
      espaces: () => appel('GET', '/api/espaces'),
      creerEspace: (nom) => appel('POST', '/api/espaces', { nom }),
      espace: (id) => appel('GET', '/api/espaces/' + e(id)),
      majEspace: (id, nom) => appel('POST', '/api/espaces/' + e(id) + '/maj', { nom }),
      transfererEspace: (id, uid) => appel('POST', '/api/espaces/' + e(id) + '/transferer', { uid }),
      supprimerEspace: (id) => appel('POST', '/api/espaces/' + e(id) + '/supprimer', { confirmation: 'SUPPRIMER' }),
      quitterEspace: (id) => appel('POST', '/api/espaces/' + e(id) + '/quitter'),
      /* « Contacts de l'entreprise » : les membres de MON espace et personne d'autre */
      contactsEspace: (id) => appel('GET', '/api/espaces/' + e(id) + '/contacts'),
      roleMembreEspace: (id, uid, admin) => appel('POST', '/api/espaces/' + e(id) + '/membres/role', { uid, admin: !!admin }),
      retirerMembreEspace: (id, uid) => appel('POST', '/api/espaces/' + e(id) + '/membres/retirer', { uid }),
      /* un lien d'invitation : `{ max, jours }` au plus ; le code n'existe en clair que dans la réponse */
      creerInvitation: (id, o2) => appel('POST', '/api/espaces/' + e(id) + '/invitations', o2 || {}),
      revoquerInvitations: (id) => appel('POST', '/api/espaces/' + e(id) + '/invitations/revoquer'),
      lireInvitation: async (code) => (await appel('POST', '/api/invitations/lire', { code })).apercu,
      accepterInvitation: (code) => appel('POST', '/api/invitations/accepter', { code }),
      creerCanal: (id, champs) => appel('POST', '/api/espaces/' + e(id) + '/canaux', champs),
      majCanal: (id, cid, nom) => appel('POST', '/api/espaces/' + e(id) + '/canaux/' + e(cid) + '/maj', { nom }),
      supprimerCanal: (id, cid) => appel('POST', '/api/espaces/' + e(id) + '/canaux/' + e(cid) + '/supprimer', { confirmation: 'SUPPRIMER' }),
      ajouterMembresCanal: (id, cid, uids) => appel('POST', '/api/espaces/' + e(id) + '/canaux/' + e(cid) + '/membres/ajouter', { uids }),
      retirerMembreCanal: (id, cid, uid) => appel('POST', '/api/espaces/' + e(id) + '/canaux/' + e(cid) + '/membres/retirer', { uid }),
      /* Messages Pro : les offres (publiques), l'état d'un espace (sans réseau), le paiement et le portail (le propriétaire seul), la relecture chez Stripe */
      offresAbonnement: () => appel('GET', '/api/facturation/offres'),
      etatAbonnement: (id) => appel('GET', '/api/espaces/' + e(id) + '/facturation/etat'),
      payerAbonnement: (id, champs) => appel('POST', '/api/espaces/' + e(id) + '/facturation/paiement', champs),
      portailAbonnement: (id) => appel('POST', '/api/espaces/' + e(id) + '/facturation/portail'),
      relireAbonnement: (id) => appel('POST', '/api/espaces/' + e(id) + '/facturation/relire'),
      /* Le forfait d'une PERSONNE : son état (sans réseau), le paiement (le corps ne nomme qu'un rythme), le portail, « J'ai réglé — vérifier ». ⛔ La personne est CELLE DE LA SESSION : aucune de ces routes ne reçoit d'identifiant. */
      persoPlusEtat: () => appel('GET', '/api/moi/perso-plus'),
      persoPlusPayer: (champs) => appel('POST', '/api/moi/perso-plus/paiement', champs),
      persoPlusPortail: () => appel('POST', '/api/moi/perso-plus/portail'),
      persoPlusRelire: () => appel('POST', '/api/moi/perso-plus/relire'),

      /* ── Les appels à deux, audio et vidéo (étape 7) ──
         ⛔ L'appel se dit dans l'ADRESSE, jamais dans le corps ; la personne appelée vient d'une conversation directe (`conv`) ou d'un identifiant (`uid`), jamais des deux. Les identifiants du relais sont
         ÉPHÉMÈRES (une heure) : on les redemande à chaque appel, on ne les range nulle part. Un signal est une enveloppe `{ a, type, donnees }` que le service relaie sans la lire ; `pouls` n'est pas relayé. */
      ice: () => appel('GET', '/api/ice'),
      appels: (filtre) => appel('GET', '/api/appels' + rq({ filtre })),
      lancerAppel: (champs) => appel('POST', '/api/appels', champs),
      repondreAppel: (id, accepte) => appel('POST', '/api/appels/' + e(id) + '/repondre', { accepte: !!accepte }),
      quitterAppel: (id, opts) => appel('POST', '/api/appels/' + e(id) + '/quitter', undefined, opts),
      signalAppel: (id, a, type, donnees) => appel('POST', '/api/appels/' + e(id) + '/signal', donnees === undefined ? { a, type } : { a, type, donnees }),
      /* ── Les salles (étape 8) : entrer, ce que l'hôte décide, ce que les participants se disent. L'identifiant de la salle est celui de l'appel. ── */
      rejoindreAppel: (id) => appel('POST', '/api/appels/' + e(id) + '/rejoindre'),
      salle: (id) => appel('GET', '/api/salles/' + e(id)),
      salleAdmettre: (id, o2) => appel('POST', '/api/salles/' + e(id) + '/admettre', o2 || {}),
      salleRefuser: (id, uid) => appel('POST', '/api/salles/' + e(id) + '/refuser', { uid }),
      salleExclure: (id, uid) => appel('POST', '/api/salles/' + e(id) + '/exclure', { uid }),
      salleVerrouiller: (id, actif) => appel('POST', '/api/salles/' + e(id) + '/verrouiller', { actif: !!actif }),
      salleAttente: (id, actif) => appel('POST', '/api/salles/' + e(id) + '/salle_attente', { actif: !!actif }),
      salleCouperMicro: (id, o2) => appel('POST', '/api/salles/' + e(id) + '/couper_micro', o2 || {}),
      sallePartage: (id, actif) => appel('POST', '/api/salles/' + e(id) + '/partage', { actif: !!actif }),
      salleRec: (id, actif) => appel('POST', '/api/salles/' + e(id) + '/rec', { actif: !!actif }),
      salleCohote: (id, uid, actif) => appel('POST', '/api/salles/' + e(id) + '/cohote', { uid, actif: !!actif }),
      salleTerminer: (id) => appel('POST', '/api/salles/' + e(id) + '/terminer'),
      salleMain: (id, actif) => appel('POST', '/api/salles/' + e(id) + '/main', { actif: !!actif }),
      salleReaction: (id, emoji) => appel('POST', '/api/salles/' + e(id) + '/reaction', { emoji }),
      salleEtat: (id, champs) => appel('POST', '/api/salles/' + e(id) + '/etat', champs),
      salleEvt: (id, k, donnees) => appel('POST', '/api/salles/' + e(id) + '/evt', { k, donnees }),
      /* la salle d'une réunion programmée, et son lien d'invité (le code va dans le FRAGMENT de l'adresse : il ne passe jamais dans les journaux du proxy) */
      rejoindreReunion: (id, type) => appel('POST', '/api/reunions/' + e(id) + '/rejoindre', type ? { type } : {}),
      lienReunion: (id) => appel('POST', '/api/reunions/' + e(id) + '/lien'),
      renouvelerLienReunion: (id) => appel('POST', '/api/reunions/' + e(id) + '/lien/renouveler'),
      apercuReunion: (code) => appel('POST', '/api/reunions/apercu', { code }),
      rejoindreReunionParCode: (code, type) => appel('POST', '/api/reunions/rejoindre', type ? { code, type } : { code }),

      /* ── Les réunions programmées (étape 6) ──
         ⛔ La réunion se dit dans l'ADRESSE, jamais dans le corps : le service la relit de la base et de la session. L'heure se dit en millisecondes UTC, ou en heure LOCALE « 2026-10-26T14:00 »
         avec un fuseau (`tz`) : le service fait autorité sur le fuseau (une heure qui n'existe pas le jour d'un changement d'heure est refusée, `heure_inexistante`). */
      reunions: (du, au) => appel('GET', '/api/reunions' + rq({ du, au })),
      programmer: (champs) => appel('POST', '/api/reunions', champs),
      reunion: (id) => appel('GET', '/api/reunions/' + e(id)),
      modifierReunion: (id, champs) => appel('POST', '/api/reunions/' + e(id) + '/modifier', champs),
      annulerReunion: (id) => appel('POST', '/api/reunions/' + e(id) + '/annuler'),
      supprimerReunion: (id, o2) => appel('POST', '/api/reunions/' + e(id) + '/supprimer', o2 || {}),
      inviterReunion: (id, uids, o2) => appel('POST', '/api/reunions/' + e(id) + '/inviter', Object.assign({ uids }, o2 || {})),
      retirerInviteReunion: (id, uid) => appel('POST', '/api/reunions/' + e(id) + '/retirer', { uid }),
      quitterReunion: (id) => appel('POST', '/api/reunions/' + e(id) + '/quitter'),
      repondreReunion: (id, statut) => appel('POST', '/api/reunions/' + e(id) + '/reponse', { statut }),
      rappelsReunion: (id, rappels) => appel('POST', '/api/reunions/' + e(id) + '/rappels', { rappels }),
      /* l'invitation par courriel à quelqu'un qui n'a pas OP MESSAGES (le fichier .ics en pièce jointe) : l'adresse n'est ni rangée ni rendue par le service */
      courrielReunion: (id, destinataire, o2) => appel('POST', '/api/reunions/' + e(id) + '/courriel', Object.assign({ destinataire }, o2 || {})),
      /* l'adresse du fichier .ics (la page le télécharge par un lien : le cookie de session suit) — une occurrence (son début, en millisecondes), ou toute la série */
      adresseIcs: (id, o2) => base + '/api/reunions/' + e(id) + '/ics' + rq(o2 && o2.occurrence ? { occurrence: o2.occurrence } : { serie: 1 }),

      /* Le temps réel. `gestionnaires` : une fonction par événement (`message`, `lu`, `saisie`,
         `presence`, `notification`, `conversation`, `retire`, `resync`…) + `ouvert()`, `erreur(e)` et `reseau('perdu'|'ok')`.
         Rend `{ fermer, dernierId }`. Le navigateur reconnecte tout seul en renvoyant
         `Last-Event-ID` ; si le service REFUSE (session coupée, trop d'onglets) l'EventSource se
         ferme pour de bon : on reconnecte alors à la main, avec le dernier identifiant vu, sauf si la
         session est morte — là on le DIT (`session_requise`) et on s'arrête.
         ⛔ UN REFUS DU FLUX SE DIT. Un `EventSource` ne rend jamais le statut ni le corps d'un refus : un 429 `trop_de_flux` (cinq onglets
         ouverts, ou le plafond par réseau) ne laissait à la page qu'un silence — « connectée », sans temps réel, et rien à l'écran
         (relecture du gardien, remarque 2). Quand il se ferme, on LIT la réponse par un `fetch` du même flux (refermé aussitôt s'il
         s'ouvre) et on dit son code. `reseau('perdu')` à la première coupure, `reseau('ok')` à la reprise : la page peut afficher
         « reconnexion… » au lieu de se taire.
         ⛔ UNE CONNEXION À MOITIÉ MORTE SE DÉTECTE PAR SON SILENCE (relecture du testeur, D3). Un câble débranché, un NAT expiré, une veille : la
         socket reste « ouverte » des minutes, `onerror` ne vient jamais, et la personne ne voit plus rien arriver SANS qu'aucun bandeau ne le dise
         (mesuré : 90 s sans le message de l'autre, ni bandeau, ni reprise). Le service pousse un événement `pouls` toutes les `pouls_ms` (dit dans
         `bonjour`) ; passé 2,5 fois ce rythme sans AUCUNE trame, la page ferme, dit `reseau('perdu')` et rouvre avec `Last-Event-ID`. `rouvrir()`
         (retour sur l'onglet, réseau revenu) fait la même chose quand une pulsation est en retard — ou toujours avec `{ force: true }`. */
      ecouter(gestionnaires) {
        if (!ES) throw new Error('EventSource indisponible');
        const g = gestionnaires || {};
        /* L'attente avant de reconnecter à la main : 2, 4, 8… secondes, plafonnée à 30 (réglable : les bancs la raccourcissent). */
        const attente = typeof o.attente === 'function' ? o.attente : (n) => Math.min(30000, 1000 * Math.pow(2, Math.min(n, 5)));
        let es = null, ferme = false, dernier = null, essais = 0, minuterie = null, enPanne = false, dernierRefus = null;
        let poulsMs = 0, veille = null, vuA = Date.now();
        /* le silence tolérable : 2,5 pulsations ; avant que le service ait dit son rythme (`bonjour`), 45 s (le rythme de production est de 20 s) */
        const silenceMax = () => (typeof o.silenceMs === 'number' ? o.silenceMs : (poulsMs > 0 ? Math.max(poulsMs * 2.5, 800) : 45000));
        const armer = () => { vuA = Date.now(); if (veille) clearTimeout(veille); if (ferme) return; veille = setTimeout(silence, silenceMax()); if (veille && veille.unref) veille.unref(); };
        /* le flux s'est tu : on le tient pour mort, on le DIT, on rouvre (le navigateur ne le ferait jamais : pour lui il est ouvert) */
        function silence() {
          if (ferme) return;
          try { es && es.close(); } catch (x) {}
          coupure();
          essais++;
          if (minuterie) clearTimeout(minuterie);
          minuterie = setTimeout(ouvrir, attente(essais > 1 ? essais : 0)); if (minuterie && minuterie.unref) minuterie.unref();
        }
        const dit = (code, retry) => { if (typeof g.erreur === 'function') g.erreur(new ErreurApi(code, 0, retry || 0)); };
        const coupure = () => { if (!enPanne) { enPanne = true; if (typeof g.reseau === 'function') g.reseau('perdu'); } };
        function ouvrir() {
          if (ferme) return;
          if (minuterie) { clearTimeout(minuterie); minuterie = null; }
          if (es) { try { es.close(); } catch (x) {} }
          es = new ES(base + '/api/flux' + (dernier !== null ? '?depuis=' + dernier : ''));
          armer();
          es.onopen = () => { armer(); essais = 0; dernierRefus = null; if (enPanne) { enPanne = false; if (typeof g.reseau === 'function') g.reseau('ok'); } if (typeof g.ouvert === 'function') g.ouvert(); };
          for (const nom of EVENEMENTS) {
            es.addEventListener(nom, (ev) => {
              armer();
              if (ev.lastEventId) dernier = parseInt(ev.lastEventId, 10);
              let d = null; try { d = ev.data ? JSON.parse(ev.data) : null; } catch (x) { return; }
              /* l'identifiant de l'événement (`id:` de la trame) accompagne la donnée : c'est ce que la page ACQUITTE une fois l'événement montré */
              if (typeof g[nom] === 'function') g[nom](d, ev.lastEventId ? parseInt(ev.lastEventId, 10) : null);
            });
          }
          es.addEventListener('bonjour', (ev) => { try { const d = JSON.parse(ev.data); if (dernier === null && Number.isInteger(d.gid)) dernier = d.gid; if (d.pouls_ms > 0) poulsMs = d.pouls_ms; } catch (x) {} armer(); });
          es.addEventListener('pouls', () => armer());
          /* `resync` dit aussi le rythme (une reprise trop ancienne n'a pas de `bonjour`) */
          es.addEventListener('resync', (ev) => { try { const d = JSON.parse(ev.data); if (d.pouls_ms > 0) poulsMs = d.pouls_ms; } catch (x) {} });
          /* `fin` : le service ferme exprès (session coupée, durée) — on ne reconnecte pas aveuglément. */
          es.addEventListener('fin', () => { try { es.close(); } catch (x) {} verifierPuisReconnecter(); });
          es.onerror = () => {
            if (ferme) return;
            coupure();
            /* readyState 0 : le navigateur reconnecte seul. 2 : refus du service, on prend le relais. */
            if (es.readyState === 2) verifierPuisReconnecter();
          };
        }
        /* Lit la réponse du flux sans le garder : `null` s'il s'ouvre (on le referme tout de suite), sinon le code du refus. */
        async function sonder() {
          const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
          try {
            const r = await f(base + '/api/flux' + (dernier !== null ? '?depuis=' + dernier : ''), { method: 'GET', headers: { Accept: 'text/event-stream' }, credentials: 'same-origin', cache: 'no-store', signal: ctl ? ctl.signal : undefined });
            if (r.status === 200) { if (ctl) ctl.abort(); return null; }
            let j = null; try { j = await r.json(); } catch (x) { j = null; }
            const retry = parseInt(r.headers && r.headers.get ? (r.headers.get('Retry-After') || '') : '', 10) || (j && j.retry) || 0;
            return { code: j && typeof j.error === 'string' && MESSAGES[j.error] ? j.error : (r.status >= 500 ? 'serveur' : 'inconnue'), retry };
          } catch (x) { return { code: 'reseau', retry: 0 }; }
        }
        async function verifierPuisReconnecter() {
          if (ferme) return;
          if (veille) { clearTimeout(veille); veille = null; }   // la reprise ci-dessous rouvre : la garde du silence repart avec le flux neuf
          try { await api.moi(); }
          catch (x) { if (x && x.code === 'session_requise') { dit('session_requise'); return; } }
          const refus = await sonder();
          if (ferme) return;
          if (refus && refus.code === 'session_requise') { dit('session_requise'); return; }
          /* Un refus se dit UNE fois par épisode (la reprise suivante, si elle échoue pareil, ne le répète pas). */
          if (refus && refus.code !== dernierRefus) { dernierRefus = refus.code; dit(refus.code, refus.retry); }
          essais++;
          minuterie = setTimeout(ouvrir, attente(essais));
          if (minuterie && minuterie.unref) minuterie.unref();
        }
        ouvrir();
        return {
          fermer() { ferme = true; if (minuterie) clearTimeout(minuterie); if (veille) clearTimeout(veille); try { es && es.close(); } catch (x) {} },
          dernierId: () => dernier,
          /* La page revient (onglet visible, réseau revenu) : si une pulsation est EN RETARD le flux est suspect, on le rouvre tout de suite ; `force` rouvre sans regarder.
             Rend `true` quand il a rouvert. Un flux sain (une trame il y a moins d'une pulsation et demie) n'est pas touché : rouvrir à chaque changement d'onglet userait les
             cinq flux par personne. */
          rouvrir(opt) {
            if (ferme) return false;
            const force = !!(opt && opt.force);
            if (!force && Date.now() - vuA < Math.max(poulsMs * 1.5, 500)) return false;
            ouvrir();   // pas de bandeau « perdu » ici : s'il se rouvre, rien n'a été vu ; s'il échoue, `onerror` le dit
            return true;
          },
        };
      },
    };
    return api;
  }

  const api = { creer, dire, MESSAGES, ErreurApi, nouveauCid, fusionner, EVENEMENTS, tailleLisible };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else racine.OPMSG = api;
})(typeof window !== 'undefined' ? window : globalThis);
