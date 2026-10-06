/* ══ LES GESTIONNAIRES DE ROUTES — L'API D'OP MESSAGES (étape 1) ══════════════════════════════
 *
 * Une fonction par ligne du manifeste (`manifeste.js`). Les gardes (session, membre,
 * administrateur) sont posées par `app.js` AVANT d'arriver ici : un gestionnaire reçoit
 * `req.moi` (la personne, relue en base) et, pour M et A, `req.conv` (la conversation vue par
 * SON membre). Aucun gestionnaire ne lit une identité dans le corps.
 *
 * ⛔ L'IDENTITÉ ET L'APPARTENANCE VIENNENT DE LA SESSION ET DE LA BASE, JAMAIS DU CORPS : un
 * `{auteur:…}` ou `{uid:…}` envoyé pour se faire passer pour un autre est ignoré — l'auteur d'un
 * message est `req.moi.id`, point.
 * ⛔ UN OBJET SANS DROIT RÉPOND 404 : on ne dit pas si une conversation existe à qui n'en est pas
 * membre. Les codes de refus sont tous des chaînes courtes (`error:'code'`) que la page sait
 * dire (`public/api.js`, `MESSAGES`) — un refus muet fait croire à une panne (leçon `_mailboxes`).
 * ⛔ Tout texte venu d'un tiers (nom, message) est rendu tel quel : la protection contre le HTML
 * est côté page (`textContent`), pas ici — mais les caractères de contrôle et les marques
 * bidirectionnelles sont retirés des noms (un nom ne doit pas retourner le texte qui le suit).
 */
const crypto = require('crypto');
const { cleReseau } = require('./quotas');
const { ID_PIECE } = require('./pieces');
const { SUPPRESSION_DELAI_MS } = require('./compte');
const { REUNION_PERSONNES_MAX } = require('./formule');

const ID_CONV = /^c_[0-9a-f]{32}$/, ID_PERS = /^p_[0-9a-f]{32}$/, CID = /^[A-Za-z0-9_-]{8,64}$/, CODE = /^[A-Za-z0-9_-]{20,64}$/;
const EPHEMERES = [0, 86400, 604800, 7776000];
const MSG_MAX = 8000, SESSION_MS = 30 * 86400000, JOUR = 86400000;
const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|‍|️|⃣){1,12}$/u;
const LANGUES = /^[a-z]{2}(-[A-Z]{2})?$/;
const PREFS_PERSONNE = ['presence', 'apercu_notif', 'accuses'];
const TYPES_ENVOI = ['texte', 'photo', 'vocal', 'fichier'];
const PHOTOS_MAX = 10, BARRES_MAX = 64, DUREE_VOCAL_MAX = 600, COTE_MAX = 20000;

const CTRL_NOM = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const nettoyerNom = (s) => String(s).replace(CTRL_NOM, '').replace(/\s+/g, ' ').trim();
const nettoyerTexte = (s) => String(s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029]/g, '');
/* Un message qui ne montre RIEN (espaces, marques de largeur nulle, marques bidirectionnelles) n'est pas un message : il
   ferait une bulle vide, ou retournerait le texte qui suit. */
const INVISIBLE = /^[\s\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff\u00ad]*$/u;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
const entier = (x) => Number.isInteger(x) ? x : null;

function creerHandlers(ctx) {
  const { stockage, hub, quotas, config, porte, horloge } = ctx;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  /* Les FICHIERS des pièces dont une ligne vient de partir (`pieces.js`) : effacés après coup, sans attendre, sans jamais faire échouer le geste. */
  const effacer = (ids) => { if (ids && ids.length && typeof ctx.effacerPieces === 'function') ctx.effacerPieces(ids); };

  /* Un plafond : `true` si on peut continuer ; sinon la réponse 429 + `Retry-After` est déjà partie. */
  function plafond(res, nom, cle, def, facteur = 1) {
    const q = Object.assign({}, def, config.quotas[nom] || {});
    const max = Math.max(1, Math.floor(q.max * facteur));
    const r = quotas.essai(nom + ':' + cle, max, q.fenetreMs);
    if (r.ok) return true;
    res.set('Retry-After', String(r.retry));
    refus(res, 429, 'quota_atteint', { retry: r.retry });
    return false;
  }
  /* Un compte public de moins de 24 h a des limites plus basses (SERVEUR.md § 3.6). Un accès bêta
     n'est pas un compte public : ses testeurs ne sont pas des inconnus. */
  const facteurJeune = (moi) => (moi.origine !== 'beta' && horloge() - moi.cree < JOUR) ? 1 / 3 : 1;

  function erreurStockage(res, e) {
    switch (e && e.code) {
      case 'introuvable': return refus(res, 404, 'introuvable');
      case 'interdit': return refus(res, 403, 'interdit');
      case 'delai': return refus(res, 409, 'delai_depasse');
      case 'type': return refus(res, 409, 'type_invalide');
      case 'vide': return refus(res, 400, 'champ_invalide');   // un message texte vidé par une modification (seule une légende se retire)
      case 'groupe_plein': return refus(res, 409, 'groupe_plein');
      case 'dernier_admin': return refus(res, 409, 'dernier_admin');
      case 'conversation_directe': return refus(res, 409, 'conversation_directe');
      case 'lien_invalide': return refus(res, 410, 'lien_invalide');
      case 'lien_propre': return refus(res, 409, 'lien_propre');
      case 'piece_inconnue': return refus(res, 404, 'piece_inconnue');
      case 'canal_public': return refus(res, 409, 'canal_public');
      default: throw e;
    }
  }

  const cookieTexte = (valeur, maxAge) =>
    config.cookie.nom + '=' + valeur + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + maxAge + (config.cookie.secure ? '; Secure' : '');
  function ouvrirSession(res, personne, appareil) {
    const jeton = 'opm_' + crypto.randomBytes(32).toString('base64url');
    const evincees = stockage.sessionAjouter({ h: sha(jeton), personne, appareil: typeof appareil === 'string' ? nettoyerNom(appareil).slice(0, 40) : null, ttlMs: SESSION_MS });
    /* ⛔ Une session évincée ferme SON flux : supprimée de la base, elle recevait encore les messages pendant 24 h. */
    for (const h of evincees) hub.fermerSession(h);
    res.append('Set-Cookie', cookieTexte(jeton, SESSION_MS / 1000));
  }

  function detail(uid, id) {
    const r = stockage.convPourMembre(id, uid); if (!r) return null;
    const membres = stockage.membresDetail(id, uid);
    const conversation = Object.assign({}, r.conv, { membres_n: membres.length });
    if (r.conv.type === 'direct') { const a = membres.find(m => m.id !== uid); if (a) conversation.autre = { id: a.id, prenom: a.prenom, nom: a.nom, avatar: a.avatar }; }
    return { conversation, membres, moi: r.moi };
  }
  const nomAffiche = (p) => (p.prenom + ' ' + p.nom).trim() || 'Quelqu\'un';
  /* ⛔ Ce qui part en notification PUSH, parmi les notifications de l'application : un ajout à un groupe et un nouveau contact. Une mention n'en fait pas : le message qui la porte part déjà. La
     charge est MINIMALE (« Vous avez été ajouté à un groupe ») ; le nom du groupe et de celui qui l'a ajouté ne partent que pour qui a activé l'aperçu (`push.js`). */
  function chargePush(type, titre, texte, cible) {
    if (type === 'groupe_ajoute') return { type: 'groupe', tag: 'groupe:' + cible, url: ID_CONV.test(String(cible)) ? '/#messages/' + cible : '/', titre: 'OP MESSAGES', corps: 'Vous avez été ajouté à un groupe', detail: { titre, corps: texte } };
    if (type === 'contact_ajoute') return { type: 'contact', tag: 'contact', url: '/', titre: 'OP MESSAGES', corps: 'Nouveau contact', detail: { titre: 'Nouveau contact', corps: texte } };
    return null;
  }
  function notifier(uid, type, titre, texte, cible, auteur) {
    try {
      const n = stockage.notifCreer({ uid, type, titre, texte, cible, auteur });
      hub.reveiller({ uids: [uid] });
      const c = ctx.push ? chargePush(type, titre, texte, cible) : null;
      if (c) ctx.push.pousser(uid, c, { gid: n.gid });
    } catch (e) { /* une notification ratée ne défait pas le geste */ }
  }
  const codeLien = () => crypto.randomBytes(16).toString('base64url');
  const bornes = (b, defMax, defJours, maxMax) => {
    const max = b.max === undefined ? defMax : entier(b.max), jours = b.jours === undefined ? defJours : entier(b.jours);
    return (max !== null && max >= 1 && max <= maxMax && jours !== null && jours >= 1 && jours <= 30) ? { max, jours } : null;
  };

  const H = {};

  /* ── Service ─────────────────────────────────────────────────────────────────────────── */
  H['config'] = (req, res) => res.json({
    /* `version_client` : le numéro de la page que CE service sert ; `min_client` : celui en dessous duquel il refuse d'écrire (le plancher du fichier,
       ou celui que la Tour a posé pour cette instance). Une page sous `min_client` se met à jour d'elle-même, sans « Plus tard ». */
    version: ctx.version, build: ctx.build || null, instance: config.instance,
    min_client: ctx.versionClient ? ctx.versionClient.exige() : config.minClient, version_client: ctx.versionPage || 0,
    limites: {
      message_max: MSG_MAX, membres_max: ctx.maxMembres, nom_groupe_max: 80, modif_ms: ctx.delaiModifMs, ephemeres: EPHEMERES,
      /* le nombre de PERSONNES d'une réunion (organisateur compris) : Perso+ comme Pro, jamais plus (`formule.js`, une seule constante) — la page l'écrit, elle ne le recopie pas. Un appel de GROUPE n'est pas concerné. */
      reunion_personnes: REUNION_PERSONNES_MAX,
      /* le délai entre la demande de suppression d'un compte et son effacement : la page le DIT avant de demander la confirmation (elle ne le recopie pas) */
      suppression_jours: Math.round(SUPPRESSION_DELAI_MS / JOUR),
      /* les maximums des pièces, en octets : la page les lit pour refuser AVANT d'envoyer (« trop lourd, 12 Mo au plus ») au lieu de laisser le service répondre 413 */
      pieces: { photo_max: config.pieces.photoMax, vocal_max: config.pieces.vocalMax, fichier_max: config.pieces.fichierMax, avatar_max: config.pieces.avatarMax, par_message: PHOTOS_MAX, quota: config.pieces.quotaPersonne },
    },
    /* la clé publique VAPID de CETTE instance (la page s'abonne avec elle) ; `null` quand le push est désactivé (paire illisible) — la page dit alors « indisponible » */
    push: { vapid: ctx.push ? ctx.push.cle() : null },
    /* l'envoi des invitations par courriel est-il ouvert ? (un relais SMTP configuré) — un booléen, jamais l'hôte, l'identifiant ou l'adresse d'expédition : la page dit « pas encore ouvert » */
    courriel: { ouvert: !!(ctx.courriel && ctx.courriel.ouvert()) },
    /* le compte par adresse e-mail (« comme Discord ») : la page montre « Créer un compte » seulement si les inscriptions sont ouvertes ET un relais configuré ; la connexion par adresse,
       elle, existe dès qu'il peut y avoir un compte (un relais configuré) — un booléen chacun, rien d'autre */
    comptes: { inscription: !!(ctx.compteCourriel && ctx.compteCourriel.inscriptionOuverte()), courriel: !!(ctx.courriel && ctx.courriel.ouvert()) },
    /* les appels à deux : le relais est-il installé (un booléen — jamais son adresse, ni son secret) ? la page dit alors, en cas d'échec, que l'appel ne passe que si les deux appareils se joignent directement.
       `sonnerie_s` : combien de temps un appel sonne avant d'être « manqué » (la page l'écrit à l'appelant, elle ne le recopie pas). */
    appels: { relais: !!(ctx.appels && ctx.appels.relais()), sonnerie_s: Math.round(config.appels.sonnerieMs / 1000) },
  });

  H['beta.entrer'] = async (req, res) => {
    const b = corps(req);
    const r = await porte.entrer({ login: b.login, pass: b.pass, ip: req.ip });
    if (r.retry) res.set('Retry-After', String(r.retry));
    if (r.statut !== 200) return res.status(r.statut).json(r.corps);
    /* ⛔ SE RECONNECTER AVANT L'ÉCHÉANCE ANNULE LA SUPPRESSION du compte (décidée par la personne, J+14) : la connexion qui réussit le DIT (`suppression_annulee`), la page l'écrit */
    const annulee = stockage.suppressionAnnuler(r.personne.id);
    /* … et son abonnement Perso+ se renouvelle de nouveau (sauf s'il avait été arrêté par elle avant sa demande) : le rétablissement est noté dans la transaction de l'annulation, il part chez Stripe sans qu'on l'attende */
    if (annulee) { try { if (ctx.facturation) ctx.facturation.perso.annulationsTraiter(); } catch (e) { /* noté : la passe des dix minutes le rejoue */ } }
    ouvrirSession(res, r.personne.id, b.appareil);
    res.json(annulee ? { ok: true, moi: r.personne, suppression_annulee: true } : { ok: true, moi: r.personne });
  };

  H['compte.deconnexion'] = (req, res) => {
    /* ⛔ SE DÉCONNECTER RETIRE AUSSI LA NOTIFICATION DE CET APPAREIL. La page donne son point d'accès (`endpoint`, facultatif) : l'abonnement part dans la même requête que la session. Sans
       cela, un navigateur déconnecté recevrait encore « Nouveau message » — et on ne peut plus rien demander une fois la session morte. Seul un point d'accès de CETTE personne se retire. */
    const e = corps(req).endpoint;
    if (ctx.push && typeof e === 'string' && e.length > 0 && e.length <= 2048) { try { ctx.push.desabonner(req.moi.id, e); } catch (x) { /* la déconnexion ne dépend pas d'une notification */ } }
    stockage.sessionSupprimer(req.sessionH);
    hub.fermerSession(req.sessionH);
    res.append('Set-Cookie', cookieTexte('', 0));
    res.json({ ok: true });
  };

  H['moi'] = (req, res) => res.json({ moi: req.moi, notifications_non_lues: stockage.notifNonLues(req.moi.id) });

  H['moi.maj'] = (req, res) => {
    const b = corps(req), c = {};
    if (!plafond(res, 'moi_maj', req.moi.id, { max: 60, fenetreMs: 3600000 })) return;
    if (b.prenom !== undefined) { if (typeof b.prenom !== 'string') return refus(res, 400, 'champ_invalide'); const v = nettoyerNom(b.prenom); if (!v || v.length > 60) return refus(res, 400, 'champ_invalide'); c.prenom = v; }
    if (b.nom !== undefined) { if (typeof b.nom !== 'string') return refus(res, 400, 'champ_invalide'); const v = nettoyerNom(b.nom); if (v.length > 60) return refus(res, 400, 'champ_invalide'); c.nom = v; }
    if (b.statut !== undefined) { if (typeof b.statut !== 'string') return refus(res, 400, 'champ_invalide'); const v = nettoyerNom(b.statut); if (v.length > 140) return refus(res, 400, 'champ_invalide'); c.statut = v; }
    if (b.langue !== undefined) { if (typeof b.langue !== 'string' || !LANGUES.test(b.langue)) return refus(res, 400, 'champ_invalide'); c.langue = b.langue; }
    if (b.tz !== undefined) {
      if (typeof b.tz !== 'string' || b.tz.length > 64) return refus(res, 400, 'champ_invalide');
      try { new Intl.DateTimeFormat('fr', { timeZone: b.tz }); } catch (e) { return refus(res, 400, 'champ_invalide'); }
      c.tz = b.tz;
    }
    if (b.prefs !== undefined) {
      if (!b.prefs || typeof b.prefs !== 'object' || Array.isArray(b.prefs)) return refus(res, 400, 'champ_invalide');
      const p = Object.assign({}, req.moi.prefs);
      for (const k of PREFS_PERSONNE) if (b.prefs[k] !== undefined) { if (typeof b.prefs[k] !== 'boolean') return refus(res, 400, 'champ_invalide'); p[k] = b.prefs[k]; }
      c.prefs = p;
    }
    const moi = stockage.personneMaj(req.moi.id, c);
    /* ⛔ ce que les AUTRES doivent apprendre tout de suite : un nom ou un statut changé (les contacts relisent mon profil), la présence ou les accusés coupés ou rendus */
    if (c.prenom !== undefined || c.nom !== undefined || c.statut !== undefined) hub.personneChangee(moi.id);
    if (c.prefs !== undefined) hub.reglagesChanges(moi.id, req.moi.prefs, moi.prefs);
    res.json({ moi });
  };

  H['flux'] = (req, res) => {
    const r = hub.ouvrir({ uid: req.moi.id, h: req.sessionH, ip: req.ip, req, res, lastId: req.headers['last-event-id'] !== undefined ? req.headers['last-event-id'] : req.query.depuis });
    if (!r.ok) { res.set('Retry-After', String(r.retry)); refus(res, 429, r.code, { retry: r.retry }); }
  };

  H['sync'] = (req, res) => {
    const max = stockage.journalMax();
    /* ⛔ jamais le compteur global (`max`) dans la réponse : le dernier identifiant qui concerne CETTE personne (relecture du gardien, remarque 3) */
    if (req.query.depuis === undefined) return res.json({ gid: stockage.gidVisible(req.moi.id), evenements: [], resync: false, plein: false });
    if (!/^\d{1,15}$/.test(String(req.query.depuis))) return refus(res, 400, 'champ_invalide');
    const n = parseInt(req.query.depuis, 10), min = stockage.journalMin();
    const perdu = n > max || (min === null ? n < max : min > n + 1);
    if (perdu) return res.json({ gid: stockage.gidVisible(req.moi.id), evenements: [], resync: true, plein: false });
    const r = stockage.evenementsPour(req.moi.id, n, 200);
    res.json({ gid: r.dernier, evenements: r.evenements, resync: false, plein: r.plein });
  };

  /* ── Notifications dans l'application ────────────────────────────────────────────────── */
  H['notif.liste'] = (req, res) => res.json({ notifications: stockage.notifListe(req.moi.id, 50), non_lues: stockage.notifNonLues(req.moi.id) });
  H['notif.lues'] = (req, res) => {
    const b = corps(req);
    if (b.toutes === true) return res.json({ ok: true, n: stockage.notifLues(req.moi.id, null) });
    if (!Array.isArray(b.ids) || b.ids.length > 200 || !b.ids.every(x => typeof x === 'string' && /^n_[0-9a-f]{32}$/.test(x))) return refus(res, 400, 'champ_invalide');
    res.json({ ok: true, n: stockage.notifLues(req.moi.id, b.ids) });
  };

  /* ── Contacts ────────────────────────────────────────────────────────────────────────── */
  H['contacts'] = (req, res) => {
    /* ⛔ LA PRÉSENCE EST RÉCIPROQUE : qui a coupé la sienne ne voit celle de personne (et personne ne voit la sienne : `flux.js`) */
    const jeVois = !(req.moi.prefs && req.moi.prefs.presence === false);
    const liste = stockage.contactsDe(req.moi.id).map(c => {
      const p = stockage.personneParId(c.id);
      const visible = jeVois && c.mutuel && !c.bloque && p && !(p.prefs && p.prefs.presence === false) && !stockage.contactBloque(req.moi.id, c.id);
      return Object.assign({}, c, { en_ligne: !!(visible && hub.enLigne(c.id)) });
    });
    res.json({ contacts: liste });
  };

  H['contacts.lien'] = (req, res) => {
    const b = bornes(corps(req), 1, 7, 20);
    if (!b) return refus(res, 400, 'champ_invalide');
    if (!plafond(res, 'lien', req.moi.id, { max: 20, fenetreMs: 3600000 })) return;
    const code = codeLien();
    stockage.lienCreer({ h: sha(code), genre: 'contact', cible: null, par: req.moi.id, ttlMs: b.jours * JOUR, max: b.max });
    res.status(201).json({ code, expire_le: horloge() + b.jours * JOUR });
  };

  H['liens.lire'] = (req, res) => {
    if (!plafond(res, 'lien_ip', cleReseau(req.ip), { max: 60, fenetreMs: 60000 })) return;
    const c = corps(req).code;
    if (typeof c !== 'string' || !CODE.test(c)) return refus(res, 410, 'lien_invalide');
    const a = stockage.lienApercu(sha(c));
    if (!a) return refus(res, 410, 'lien_invalide');
    res.json({ apercu: a });
  };

  H['liens.accepter'] = (req, res) => {
    if (!plafond(res, 'lien_ip', cleReseau(req.ip), { max: 60, fenetreMs: 60000 })) return;
    const c = corps(req).code;
    if (typeof c !== 'string' || !CODE.test(c)) return refus(res, 410, 'lien_invalide');
    const r = stockage.lienAccepter({ h: sha(c), uid: req.moi.id });
    if (r.genre === 'contact') {
      const p = stockage.personneParId(r.par);
      if (!r.deja) notifier(r.par, 'contact_ajoute', 'Nouveau contact', nomAffiche(req.moi) + ' est maintenant dans vos contacts.', req.moi.id, req.moi.id);
      return res.json({ genre: 'contact', deja: r.deja, contact: { id: p.id, prenom: p.prenom, nom: p.nom } });
    }
    if (r.gid) hub.reveiller({ conv: r.conv });
    res.json(Object.assign({ genre: 'groupe', deja: r.deja }, detail(req.moi.id, r.conv)));
  };

  const cibleContact = (req, res) => {
    const u = corps(req).uid;
    if (typeof u !== 'string' || !ID_PERS.test(u) || u === req.moi.id) { refus(res, 400, 'champ_invalide'); return null; }
    return u;
  };
  H['contacts.retirer'] = (req, res) => {
    const u = cibleContact(req, res); if (!u) return;
    /* Un blocage que NOUS avons posé n'est pas levé par un retrait : « bloquer et retirer » est un geste valable. */
    const l = stockage.contactLigne(req.moi.id, u);
    if (!stockage.contactRetirer(req.moi.id, u) && !(l && l.etat === 'bloque')) return refus(res, 404, 'introuvable');
    res.json({ ok: true });
  };
  H['contacts.bloquer'] = (req, res) => {
    const u = cibleContact(req, res); if (!u) return;
    /* un contact, ou quelqu'un qu'on voit sans l'avoir en contact (un collègue d'un espace, un membre d'un groupe) : la ligne de blocage est créée si elle manque — un inconnu reste « introuvable » */
    if (!stockage.contactBloquer(req.moi.id, u)) return refus(res, 404, 'introuvable');
    /* ⛔ un blocage coupe aussi l'appel en cours entre les deux personnes (« un blocage coupe messages, appels et présence ») : celui qui harcèle ne continue pas par la voix */
    try { if (ctx.appels) ctx.appels.bloquer(req.moi.id, u); } catch (e) { /* le blocage est posé : un appel qui ne se coupe pas est repris par le balayeur */ }
    res.json({ ok: true });
  };
  H['contacts.debloquer'] = (req, res) => {
    const u = cibleContact(req, res); if (!u) return;
    if (!stockage.contactDebloquer(req.moi.id, u)) return refus(res, 404, 'introuvable');
    res.json({ ok: true });
  };

  H['personnes.lire'] = (req, res) => {
    const id = req.params.id;
    if (!ID_PERS.test(id) || !stockage.peutVoir(req.moi.id, id)) return refus(res, 404, 'introuvable');
    /* ⛔ Qui nous a bloqués ne se laisse pas lire : on ne voit plus le profil de celui qui nous a bloqués. L'inverse reste vrai. */
    const contre = stockage.contactLigne(id, req.moi.id);
    if (contre && contre.etat === 'bloque') return refus(res, 404, 'introuvable');
    const p = stockage.personneParId(id); if (!p) return refus(res, 404, 'introuvable');
    res.json({ personne: { id: p.id, prenom: p.prenom, nom: p.nom, statut: p.statut, avatar: p.avatar, contact: !!stockage.contactLigne(req.moi.id, id) } });
  };

  /* ── Conversations ───────────────────────────────────────────────────────────────────── */
  H['conv.liste'] = (req, res) => res.json({ conversations: stockage.convListe(req.moi.id) });

  H['conv.directe'] = (req, res) => {
    const u = cibleContact(req, res); if (!u) return;
    /* Pas de contact, ou un blocage dans un sens ou dans l'autre : 404, comme si la personne
       n'existait pas — on ne dit pas à qui nous a bloqué qu'il l'est. */
    if (!stockage.peutEcrire(req.moi.id, u)) return refus(res, 404, 'introuvable');   // un contact mutuel, ou un collègue d'un même espace (« Contacts de l'entreprise ») — jamais quelqu'un qui a bloqué
    const r = stockage.convDirecteObtenir(req.moi.id, u);
    res.status(r.cree ? 201 : 200).json(detail(req.moi.id, r.id));
  };

  H['conv.groupe'] = (req, res) => {
    const b = corps(req);
    if (typeof b.nom !== 'string') return refus(res, 400, 'champ_invalide');
    const nom = nettoyerNom(b.nom);
    if (!nom || Array.from(nom).length > 80) return refus(res, 400, 'champ_invalide');
    if (!Array.isArray(b.membres) || b.membres.length > ctx.maxMembres - 1 || !b.membres.every(x => typeof x === 'string' && ID_PERS.test(x))) return refus(res, 400, 'champ_invalide');
    if (b.annonces_seules !== undefined && typeof b.annonces_seules !== 'boolean') return refus(res, 400, 'champ_invalide');
    const eph = b.ephemere_s === undefined ? 0 : b.ephemere_s;
    if (!EPHEMERES.includes(eph)) return refus(res, 400, 'champ_invalide');
    /* la photo du groupe : une pièce de genre « avatar » déposée par le créateur (`POST /api/pieces?genre=avatar`), jamais posée */
    let avatar = null;
    if (b.avatar_piece !== undefined && b.avatar_piece !== null) { if (typeof b.avatar_piece !== 'string' || !ID_PIECE.test(b.avatar_piece)) return refus(res, 400, 'champ_invalide'); avatar = b.avatar_piece; }
    if (!plafond(res, 'groupe', req.moi.id, { max: 20, fenetreMs: 3600000 }, facteurJeune(req.moi))) return;
    /* Seuls des contacts mutuels sont ajoutés d'office ; les autres sont RENDUS (`non_ajoutes`)
       pour que l'écran dise « envoie-leur un lien » — jamais d'ajout de force. */
    const voulus = Array.from(new Set(b.membres)).filter(u => u !== req.moi.id);
    const ajoutes = voulus.filter(u => stockage.peutEcrire(req.moi.id, u));
    const non_ajoutes = voulus.filter(u => !ajoutes.includes(u));
    const r = stockage.convCreerGroupe({ createur: req.moi.id, nom, membres: ajoutes, annonces_seules: b.annonces_seules === true, ephemere_s: eph, avatar_piece: avatar });
    hub.reveiller({ conv: r.id });
    for (const u of ajoutes) notifier(u, 'groupe_ajoute', nom, nomAffiche(req.moi) + ' vous a ajouté au groupe.', r.id, req.moi.id);
    res.status(201).json(Object.assign({ non_ajoutes }, detail(req.moi.id, r.id)));
  };

  H['conv.lire'] = (req, res) => res.json(detail(req.moi.id, req.conv.conv.id));

  H['conv.maj'] = (req, res) => {
    const b = corps(req), c = req.conv.conv, o = {};
    if (b.nom !== undefined) {
      if (c.type !== 'groupe' || typeof b.nom !== 'string') return refus(res, 400, 'champ_invalide');
      const nom = nettoyerNom(b.nom); if (!nom || Array.from(nom).length > 80) return refus(res, 400, 'champ_invalide');
      o.nom = nom;
    }
    if (b.annonces_seules !== undefined) { if (c.type !== 'groupe' || typeof b.annonces_seules !== 'boolean') return refus(res, 400, 'champ_invalide'); o.annonces_seules = b.annonces_seules; }
    if (b.ephemere_s !== undefined) { if (!EPHEMERES.includes(b.ephemere_s)) return refus(res, 400, 'champ_invalide'); o.ephemere_s = b.ephemere_s; }
    /* la photo du groupe (un administrateur) : `null` la retire, une pièce de genre « avatar » déposée par lui la pose ; un message système le trace */
    if (b.avatar_piece !== undefined) {
      if (c.type !== 'groupe' || (b.avatar_piece !== null && !(typeof b.avatar_piece === 'string' && ID_PIECE.test(b.avatar_piece)))) return refus(res, 400, 'champ_invalide');
      o.avatar_piece = b.avatar_piece;
    }
    if (b.avatar !== undefined) return refus(res, 400, 'champ_invalide');   // l'ancien nom du champ : il s'appelle `avatar_piece`
    const r = stockage.convMaj(Object.assign({ conv: c.id, par: req.moi.id }, o));
    effacer(r.pieces);
    if (r.change) hub.reveiller({ conv: c.id });
    res.json(detail(req.moi.id, c.id));
  };

  const listeUids = (v, max) => Array.isArray(v) && v.length >= 1 && v.length <= max && v.every(x => typeof x === 'string' && ID_PERS.test(x)) ? Array.from(new Set(v)) : null;
  H['conv.membres.ajouter'] = (req, res) => {
    const c = req.conv.conv;
    if (c.type !== 'groupe') return refus(res, 409, 'conversation_directe');
    const u = listeUids(corps(req).uids, 50); if (!u) return refus(res, 400, 'champ_invalide');
    const ok = u.filter(x => stockage.peutEcrire(req.moi.id, x)), non_ajoutes = u.filter(x => !ok.includes(x));
    const r = ok.length ? stockage.membresAjouter({ conv: c.id, par: req.moi.id, uids: ok, max: ctx.maxMembres }) : { ajoutes: [], gid: 0 };
    if (r.gid) hub.reveiller({ conv: c.id });
    for (const x of r.ajoutes) notifier(x, 'groupe_ajoute', c.nom || 'Groupe', nomAffiche(req.moi) + ' vous a ajouté au groupe.', c.id, req.moi.id);
    res.json({ ajoutes: r.ajoutes, non_ajoutes });
  };

  H['conv.membres.retirer'] = (req, res) => {
    const c = req.conv.conv, u = corps(req).uid;
    if (c.type !== 'groupe') return refus(res, 409, 'conversation_directe');
    if (typeof u !== 'string' || !ID_PERS.test(u)) return refus(res, 400, 'champ_invalide');
    if (u === req.moi.id) return refus(res, 400, 'champ_invalide');   // on se retire par « quitter »
    stockage.membreRetirer({ conv: c.id, par: req.moi.id, uid: u });
    hub.reveiller({ conv: c.id, uids: [u] });
    res.json({ ok: true });
  };

  H['conv.admins'] = (req, res) => {
    const c = req.conv.conv, b = corps(req);
    if (c.type !== 'groupe') return refus(res, 409, 'conversation_directe');
    if (typeof b.uid !== 'string' || !ID_PERS.test(b.uid) || typeof b.admin !== 'boolean') return refus(res, 400, 'champ_invalide');
    const r = stockage.membreRole({ conv: c.id, par: req.moi.id, uid: b.uid, admin: b.admin });
    if (r.gid) hub.reveiller({ conv: c.id });
    res.json({ ok: true });
  };

  H['conv.lien'] = (req, res) => {
    const c = req.conv.conv;
    if (c.type !== 'groupe') return refus(res, 409, 'conversation_directe');
    const b = bornes(corps(req), 20, 7, 100);
    if (!b) return refus(res, 400, 'champ_invalide');
    if (!plafond(res, 'lien', req.moi.id, { max: 20, fenetreMs: 3600000 })) return;
    const code = codeLien();
    stockage.lienCreer({ h: sha(code), genre: 'groupe', cible: c.id, par: req.moi.id, ttlMs: b.jours * JOUR, max: b.max });
    res.status(201).json({ code, expire_le: horloge() + b.jours * JOUR });
  };

  /* Révoquer les liens d'invitation : ceux du groupe (administrateur) ou les miens, de contact. Le nombre révoqué est rendu. */
  H['conv.liens.revoquer'] = (req, res) => {
    if (req.conv.conv.type !== 'groupe') return refus(res, 409, 'conversation_directe');
    res.json({ ok: true, n: stockage.liensRevoquerGroupe(req.conv.conv.id) });
  };
  H['contacts.liens.revoquer'] = (req, res) => res.json({ ok: true, n: stockage.liensRevoquerContact(req.moi.id) });

  H['conv.quitter'] = (req, res) => {
    const c = req.conv.conv;
    /* ⛔ ON NE QUITTE PAS LA CONVERSATION D'UNE RÉUNION : on y est parce qu'on est invité — décliner l'invitation est le geste (la réponse « décline » ne retire pas du fil, mais plus aucun rappel ne part), et l'hôte
       l'annule ou la supprime. La quitter laisserait une invitation sans conversation. */
    if (c.type === 'reunion') return refus(res, 409, 'reunion_quitter');
    /* ⛔ UN CANAL N'EST PAS UN GROUPE : public, il compte tous les membres de l'espace (on en sort avec l'espace, ou on le met en sourdine) ; privé, on le quitte sans que personne soit
       promu à sa place — le rôle dans un canal est le rôle dans l'espace. */
    const r = c.type === 'canal' ? stockage.canalQuitter({ conv: c.id, uid: req.moi.id }) : stockage.membreQuitter({ conv: c.id, uid: req.moi.id });
    effacer(r.pieces);   // le dernier membre part : la conversation et ses pièces avec elle
    if (!r.vide) hub.reveiller({ conv: c.id, uids: [req.moi.id] }); else hub.reveiller({ uids: [req.moi.id] });
    res.json({ ok: true });
  };

  H['conv.prefs'] = (req, res) => {
    const b = corps(req), o = {};
    if (b.muet_jusqua !== undefined) { const v = entier(b.muet_jusqua); if (v === null || v < 0 || v > horloge() + 10 * 365 * JOUR) return refus(res, 400, 'champ_invalide'); o.muet_jusqua = v; }
    if (b.epingle !== undefined) { if (typeof b.epingle !== 'boolean') return refus(res, 400, 'champ_invalide'); o.epingle = b.epingle; }
    if (b.archive !== undefined) { if (typeof b.archive !== 'boolean') return refus(res, 400, 'champ_invalide'); o.archive = b.archive; }
    if (!Object.keys(o).length) return refus(res, 400, 'champ_invalide');
    stockage.membrePrefs(Object.assign({ conv: req.conv.conv.id, uid: req.moi.id }, o));
    hub.reveiller({ uids: [req.moi.id] });
    res.json({ ok: true });
  };

  H['conv.lu'] = (req, res) => {
    const s = entier(corps(req).seq);
    if (s === null || s < 0) return refus(res, 400, 'champ_invalide');
    const r = stockage.membreLu({ conv: req.conv.conv.id, uid: req.moi.id, seq: s });
    if (r.gid) hub.reveiller({ conv: req.conv.conv.id });
    res.json({ lu_seq: r.lu_seq });
  };

  /* La saisie n'est JAMAIS stockée : un événement éphémère, 1 par 2 s, aux autres membres. */
  H['conv.saisie'] = (req, res) => {
    const a = corps(req).actif;
    if (typeof a !== 'boolean') return refus(res, 400, 'champ_invalide');
    /* ⛔ Une directe bloquée (ou sans contact mutuel) ne reçoit plus rien, pas même une frappe : même règle que l'envoi. */
    if (!stockage.ecritureAutorisee(req.conv.conv.id, req.moi.id)) return refus(res, 404, 'introuvable');
    if (!plafond(res, 'saisie', req.moi.id + ':' + req.conv.conv.id, { max: 1, fenetreMs: 2000 })) return;
    hub.emettre(stockage.membresActifs(req.conv.conv.id).filter(u => u !== req.moi.id), 'saisie', { conv: req.conv.conv.id, uid: req.moi.id, actif: a });
    res.json({ ok: true });
  };

  /* ── Messages ────────────────────────────────────────────────────────────────────────── */
  H['msg.liste'] = (req, res) => {
    const q = req.query, o = {};
    for (const k of ['avant_seq', 'apres_seq', 'limite']) if (q[k] !== undefined && !/^\d{1,15}$/.test(String(q[k]))) return refus(res, 400, 'champ_invalide');
    if (q.avant_seq !== undefined && q.apres_seq !== undefined) return refus(res, 400, 'champ_invalide');
    if (q.avant_seq !== undefined) o.avantSeq = parseInt(q.avant_seq, 10);
    if (q.apres_seq !== undefined) o.apresSeq = parseInt(q.apres_seq, 10);
    if (q.limite !== undefined) o.limite = parseInt(q.limite, 10);
    res.json(stockage.messagesDe(req.conv.conv.id, req.moi.id, o));
  };

  /* ⛔ LES PIÈCES D'UN MESSAGE se lisent ici, bornées, et jamais crues sur parole : la route ne sait que des identifiants (le stockage vérifie qu'ils sont à l'envoyeur, du bon
     genre, de la bonne conversation, non attachés), des dimensions (entiers bornés), une durée et des barres de forme d'onde (calculées sur l'appareil : leur nombre et leurs valeurs
     sont bornés — une onde de dix mille barres ne se range pas). Le NOM et la TAILLE d'un fichier ne viennent pas du corps : ils viennent de la pièce. → { pieces, vocal } ou null. */
  const idPiece = (x) => typeof x === 'string' && ID_PIECE.test(x);
  function lirePieces(type, b) {
    if (type === 'photo') {
      if (!Array.isArray(b.pieces) || b.pieces.length < 1 || b.pieces.length > PHOTOS_MAX) return null;
      const pieces = [];
      for (const p of b.pieces) {
        if (!p || typeof p !== 'object' || !idPiece(p.id) || !Number.isInteger(p.w) || !Number.isInteger(p.h) || p.w < 1 || p.h < 1 || p.w > COTE_MAX || p.h > COTE_MAX) return null;
        pieces.push({ id: p.id, w: p.w, h: p.h });
      }
      if (new Set(pieces.map(p => p.id)).size !== pieces.length) return null;
      return { pieces, vocal: null };
    }
    if (!idPiece(b.piece)) return null;
    if (type === 'fichier') return { pieces: [{ id: b.piece }], vocal: null };
    const dur = b.dur;
    if (typeof dur !== 'number' || !Number.isFinite(dur) || dur <= 0 || dur > DUREE_VOCAL_MAX) return null;
    if (!Array.isArray(b.bars) || b.bars.length < 1 || b.bars.length > BARRES_MAX || !b.bars.every(n => Number.isInteger(n) && n >= 0 && n <= 100)) return null;
    return { pieces: [{ id: b.piece }], vocal: { dur: Math.round(dur * 10) / 10, bars: b.bars.slice() } };
  }
  H['msg.envoyer'] = (req, res) => {
    const b = corps(req), conv = req.conv.conv;
    if (typeof b.cid !== 'string' || !CID.test(b.cid)) return refus(res, 400, 'champ_invalide');
    const type = b.type === undefined ? 'texte' : b.type;
    if (typeof type !== 'string' || !TYPES_ENVOI.includes(type)) return refus(res, 400, 'champ_invalide');
    let texte = null, pj = null;
    if (type === 'texte') {
      if (typeof b.texte !== 'string') return refus(res, 400, 'champ_invalide');
      if (b.texte.length > MSG_MAX * 2) return refus(res, 413, 'trop_long');
      texte = nettoyerTexte(b.texte);
      if (INVISIBLE.test(texte)) return refus(res, 400, 'champ_invalide');
      if (Array.from(texte).length > MSG_MAX) return refus(res, 413, 'trop_long');
    } else {
      pj = lirePieces(type, b);
      if (!pj) return refus(res, 400, 'champ_invalide');
      /* ⛔ LA LÉGENDE D'UNE PHOTO (Justin, 6 octobre 2026 : « quand j'envoie une photo, il faudrait pouvoir mettre un texte en dessous, comme WhatsApp ») : facultative,
         les mêmes règles qu'un message (nettoyée, pas d'invisible seul, `MSG_MAX` signes), scellée comme lui. Vide ou absente : une photo sans légende, comme avant.
         Seulement pour une photo : un vocal ou un fichier n'en portent pas. */
      if (type === 'photo' && b.texte !== undefined && b.texte !== null) {
        if (typeof b.texte !== 'string') return refus(res, 400, 'champ_invalide');
        if (b.texte.length > MSG_MAX * 2) return refus(res, 413, 'trop_long');   // le même refus que le texte d'un message (relecture du gardien)
        const t = nettoyerTexte(b.texte);
        if (Array.from(t).length > MSG_MAX) return refus(res, 413, 'trop_long');
        texte = INVISIBLE.test(t) ? null : t;
      } else if (b.texte !== undefined && b.texte !== null && b.texte !== '') return refus(res, 400, 'champ_invalide');
    }
    let repondA = null;
    if (b.reponse_a !== undefined && b.reponse_a !== null) {
      repondA = entier(b.reponse_a);
      if (repondA === null || repondA < 1) return refus(res, 400, 'champ_invalide');
      if (repondA < req.conv.moi.depuis_seq || !stockage.messageExiste(conv.id, repondA)) return refus(res, 404, 'message_inconnu');
    }
    /* Écrire à un compte SUPPRIMÉ : on le DIT (410), au lieu d'un « introuvable » qui ferait croire à une panne — la page montrait déjà « Compte supprimé » */
    if (conv.type === 'direct' && stockage.autreSupprime(conv.id, req.moi.id)) return refus(res, 410, 'compte_supprime');
    /* Une directe n'accepte plus d'écriture sans contact mutuel ni dans un blocage. */
    if (!stockage.ecritureAutorisee(conv.id, req.moi.id)) return refus(res, 404, 'introuvable');
    if (conv.type === 'groupe' && conv.annonces_seules && req.conv.moi.role !== 'admin') return refus(res, 403, 'annonces_seules');
    if (!plafond(res, 'msg', req.moi.id, { max: 60, fenetreMs: 60000 }, facteurJeune(req.moi))) return;
    const r = stockage.messageEnvoyer({ conv: conv.id, auteur: req.moi.id, cid: b.cid, type, texte, repondA, pieces: pj && pj.pieces, vocal: pj && pj.vocal });
    if (r.deja) return res.status(200).json({ deja: true, seq: r.seq, ts: r.ts, id: r.id });
    hub.reveiller({ conv: conv.id });
    /* ⛔ LA NOTIFICATION PUSH suit le message : aux membres qui ont un appareil abonné, sans l'auteur, sans les conversations en sourdine ; elle attend l'acquittement d'une page ouverte (`push.js`) */
    try { if (ctx.push) ctx.push.message({ conv: conv.id, seq: r.seq, gid: r.gid, auteur: req.moi.id, nomAuteur: nomAffiche(req.moi), nomConv: conv.nom, groupe: conv.type !== 'direct', type, texte }); } catch (e) { /* une notification ratée ne défait pas l'envoi */ }
    if (Array.isArray(b.mentions)) {
      const membres = new Set(stockage.membresActifs(conv.id));
      for (const u of Array.from(new Set(b.mentions.slice(0, 20)))) {
        if (typeof u === 'string' && ID_PERS.test(u) && u !== req.moi.id && membres.has(u)) notifier(u, 'mention', conv.nom || nomAffiche(req.moi), nomAffiche(req.moi) + ' vous a mentionné.', conv.id, req.moi.id);
      }
    }
    res.status(201).json({ seq: r.seq, ts: r.ts, id: r.id });
  };

  const seqCorps = (req, res) => {
    const s = entier(corps(req).seq);
    if (s === null || s < 1) { refus(res, 400, 'champ_invalide'); return null; }
    return s;
  };
  H['msg.modifier'] = (req, res) => {
    const s = seqCorps(req, res); if (s === null) return;
    const t = corps(req).texte;
    if (typeof t !== 'string') return refus(res, 400, 'champ_invalide');
    if (t.length > MSG_MAX * 2) return refus(res, 413, 'trop_long');
    const texte = nettoyerTexte(t);
    if (Array.from(texte).length > MSG_MAX) return refus(res, 413, 'trop_long');
    /* un texte vide n'est permis qu'à la LÉGENDE d'une photo : c'est la retirer (relecture du gardien) — `messageModifier` refuse le vide pour un message texte */
    const vide = INVISIBLE.test(texte);
    const r = stockage.messageModifier({ conv: req.conv.conv.id, seq: s, auteur: req.moi.id, texte: vide ? null : texte });
    hub.reveiller({ conv: req.conv.conv.id });
    res.json({ ok: true, modifie: r.modifie });
  };
  H['msg.supprimer'] = (req, res) => {
    const s = seqCorps(req, res); if (s === null) return;
    const pour = corps(req).pour;
    if (pour !== 'moi' && pour !== 'tous') return refus(res, 400, 'champ_invalide');
    const admin = (req.conv.conv.type === 'groupe' || req.conv.conv.type === 'canal') && req.conv.moi.role === 'admin';   // l'administrateur d'un canal (celui de l'espace) modère comme celui d'un groupe
    const r = stockage.messageSupprimer({ conv: req.conv.conv.id, seq: s, uid: req.moi.id, pour, admin });
    effacer(r.pieces);   // ⛔ « pour tous » efface aussi les pièces du message, fichier compris
    if (r.gid) hub.reveiller(pour === 'moi' ? { uids: [req.moi.id] } : { conv: req.conv.conv.id });
    res.json({ ok: true });
  };
  H['msg.reagir'] = (req, res) => {
    const s = seqCorps(req, res); if (s === null) return;
    const e = corps(req).emoji;
    if (typeof e !== 'string' || (e !== '' && !EMOJI.test(e))) return refus(res, 400, 'champ_invalide');
    if (!stockage.ecritureAutorisee(req.conv.conv.id, req.moi.id)) return refus(res, 404, 'introuvable');
    const r = stockage.messageReagir({ conv: req.conv.conv.id, seq: s, uid: req.moi.id, emoji: e });
    hub.reveiller({ conv: req.conv.conv.id });
    res.json({ ok: true, reactions: r.reactions });
  };

  /* Tout ce qui touche la base peut lever un code de stockage : on le traduit en réponse. Un
     code inconnu (une vraie panne) part à `next` — le gestionnaire d'erreurs d'`app.js` répond
     500 sans rien dire de l'intérieur. Les gestionnaires asynchrones (la porte bêta) passent
     par la même porte : sans elle, un rejet non rattrapé ferait tomber le processus. */
  for (const k of Object.keys(H)) {
    const f = H[k];
    H[k] = (req, res, next) => {
      const traduire = (e) => { try { erreurStockage(res, e); } catch (e2) { next(e2); } };
      try {
        const r = f(req, res);
        if (r && typeof r.catch === 'function') return r.catch(traduire);
        return r;
      } catch (e) { return traduire(e); }
    };
  }
  return H;
}

module.exports = { creerHandlers, ID_CONV, ID_PERS, CID, CODE, nettoyerNom, nettoyerTexte, MSG_MAX, EPHEMERES };
