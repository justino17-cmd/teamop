/* ══ LES ROUTES DES PIÈCES — DÉPOSER, LIRE, PHOTO DE PROFIL, ESPACE UTILISÉ (étape 4) ════════════════════════════════════════
 *
 *   POST /api/pieces?conv=<id>&genre=photo|vocal|fichier             V  corps BINAIRE (application/octet-stream), Content-Length OBLIGATOIRE ; le NOM d'un fichier : en-tête `X-OPM-Nom` (encodé)
 *   POST /api/pieces?genre=avatar                                    V  une photo de profil (d'une personne ou d'un groupe) : pas de conversation
 *   GET  /api/pieces/:id                                             J  lit une pièce (Range) — 404 si on n'y a pas droit, jamais 403
 *   POST /api/moi/avatar  {piece|null}                               S  pose ou retire MA photo de profil
 *   GET  /api/moi/stockage                                           S  {utilise, max} : l'espace que mes pièces occupent
 *
 * Comme `telephone.js`, ce fichier branche ses gestionnaires dans le tableau de `routes.js` (`installerPieces`) : une fonction par ligne
 * du manifeste. Le contenu des pièces vit dans `pieces.js` (disque, scellé par blocs) ; les lignes dans `stockage.js` (tout le SQL).
 *
 * ⛔ DANS CET ORDRE, SANS RIEN LIRE DU CORPS AVANT : le genre et la conversation (404 si on n'en est pas membre, 403 dans un groupe
 * d'annonces), le type de contenu de la requête, le plafond d'envois par heure (429), `Content-Length` (411 s'il manque ou si l'envoi
 * est fractionné), le maximum du genre (413), l'espace libre du disque (503), le quota de la personne (402) et le nombre d'envois en
 * même temps (429). Un dépôt refusé ne coûte donc ni mémoire ni disque, et un corps de 100 Mo annoncé pour un maximum de 12 reçoit son
 * 413 AVANT d'avoir été lu. Le corps est ensuite lu AU FIL DE L'EAU (`pieces.deposer`) : le type est jugé sur les premiers octets, le
 * plafond s'applique encore (un client qui ment sur sa longueur s'arrête au maximum), et un envoi interrompu ne laisse rien.
 * ⛔ LE TYPE SE JUGE AUX OCTETS, PAS AU CLIENT : le service ne lit ni le `Content-Type` du fichier ni son nom pour décider de ce qu'il est
 * (le type de la REQUÊTE doit seulement être application/octet-stream).
 * ⛔ UNE PIÈCE SE SERT EN SÛRETÉ : `nosniff`, `Content-Security-Policy: sandbox; default-src 'none'` (même ouverte directement, une pièce
 * n'exécute rien), `Cache-Control: private, no-store`, « inline » SEULEMENT pour une image ou un son jugés aux octets — tout le reste, y
 * compris tout « fichier », en `application/octet-stream` + `attachment`. Jamais de SVG ni de HTML servi en ligne.
 * ⛔ AUCUN NOM DE FICHIER, AUCUN IDENTIFIANT COMPLET DE PIÈCE DANS UN JOURNAL (SERVEUR.md § 3.6) : seuls des compteurs vont à /health. Et RIEN de tout cela dans une ADRESSE : le journal d'accès du proxy
 * écrit la ligne de requête entière — le nom d'un fichier voyageait dans `?nom=` (relecture du gardien, B2). Il est maintenant dans l'en-tête `X-OPM-Nom` (encodé en pourcentage), et l'ancien paramètre
 * est REFUSÉ (400) : un client d'avant qui l'enverrait encore le saurait au lieu de le voir silencieusement ignoré. Le bloc nginx de l'instance n'écrit plus de journal d'accès (`install-msg.sh`).
 */
'use strict';
const { ID_PIECE, enLigne, dispositionDe, couperNom, gardeDebit } = require('./pieces');
const { ID_CONV, nettoyerNom } = require('./routes');

const Mo = 1048576, JOUR = 86400000;
const GENRES_CONV = ['photo', 'vocal', 'fichier'];
const NOM_MAX = 120;

function installerPieces(H, ctx) {
  const { config, stockage, quotas, hub, horloge, pieces, reservations } = ctx;
  const pc = config.pieces;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  const maxDe = { photo: pc.photoMax, vocal: pc.vocalMax, fichier: pc.fichierMax, avatar: pc.avatarMax };
  const jeune = (moi) => (moi.origine !== 'beta' && horloge() - moi.cree < JOUR) ? 1 / 3 : 1;   // un compte de moins de 24 h a des limites plus basses (comme les messages)

  /* Chaque gestionnaire est protégé ici : une exception (ou un rejet) devient une réponse 500 propre, jamais un processus qui tombe. */
  const garder = (f) => (req, res, next) => {
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch((e) => erreurStockage(res, e, next)); }
    catch (e) { erreurStockage(res, e, next); }
  };
  function erreurStockage(res, e, next) {
    if (res.headersSent) { try { res.destroy(); } catch (x) { /* déjà fermée */ } return; }
    switch (e && e.code) {
      case 'piece_inconnue': return refus(res, 404, 'piece_inconnue');
      case 'introuvable': return refus(res, 404, 'introuvable');
      default: return next(e);
    }
  }

  /* ── les envois en cours : au plus `simultanes` pour le service et `parPersonne` pour une personne ── */
  /* `octetsAnnonces` : la somme des tailles ANNONCÉES des envois acceptés et pas encore finis — ce que le disque va recevoir et que `libreMo()` ne montre pas encore (relecture du gardien, remarque 3) */
  let enCours = 0, octetsAnnonces = 0;
  const parPers = new Map();
  function entrerDepot(uid, taille) {
    if (enCours >= pc.simultanes || (parPers.get(uid) || 0) >= pc.parPersonne) return null;
    enCours++; octetsAnnonces += taille; parPers.set(uid, (parPers.get(uid) || 0) + 1);
    let sorti = false;
    return () => { if (sorti) return; sorti = true; enCours--; octetsAnnonces -= taille; const n = (parPers.get(uid) || 1) - 1; if (n > 0) parPers.set(uid, n); else parPers.delete(uid); };
  }

  /* ══ RECOPIER UNE PIÈCE (TRANSFÉRER, 9 octobre 2026) ═════════════════════════════════
     Une photo, un vocal ou un fichier transférés ne se PARTAGENT pas : le droit de les lire dépend de leur conversation. On relit la pièce (déchiffrée bloc à bloc, `pieces.lire`)
     et on la redépose sous un NOUVEL identifiant, scellée avec SA clé, dans la conversation d'arrivée — avec TOUTES les gardes d'un dépôt, dans le même ordre : le plafond de
     dépôts par heure, le maximum du genre, le plancher de disque (envois en cours compris), les envois simultanés, le quota de stockage de celui qui transfère. Le type est rejugé
     aux octets et les métadonnées retirées une seconde fois (`pieces.deposer`) : une recopie n'est pas une porte de côté. `source` : la ligne que `pieceVisible` a rendue pour CETTE
     personne (la route l'a déjà jugée lisible). → { id, taille } ; lève une erreur portant `code` (quota_atteint, quota_stockage, piece_trop_lourde, disque_plein) sinon. */
  ctx.copierPiece = async ({ moi, source, conv }) => {
    const uid = moi.id, genre = source.genre, taille = source.taille;
    const err = (code) => Object.assign(new Error(code), { code });
    if (!GENRES_CONV.includes(genre) || !(taille > 0)) throw err('transfert_refuse');
    const plafond = Object.assign({ max: pc.depotsHeure, fenetreMs: 3600000 }, config.quotas.piece || {});
    if (!quotas.essai('piece:' + uid, Math.max(1, Math.floor(plafond.max * jeune(moi))), plafond.fenetreMs).ok) throw err('quota_atteint');
    if (taille > maxDe[genre]) throw err('piece_trop_lourde');
    if (ctx.disque.libreMo() - (octetsAnnonces + taille) / Mo < config.disqueMinMo) throw err('disque_plein');
    const sortir = entrerDepot(uid, taille);
    if (!sortir) throw err('quota_atteint');
    const place = reservations.essayer(uid, taille);
    if (!place.ok) { sortir(); throw err('quota_stockage'); }        // l'espace de celui qui transfère est plein (le dépôt dit 402 quota_atteint, portée « stockage »)
    const id = stockage.nouvelId('f');
    try {
      let r;
      try { r = await pieces.deposer({ id, genre, flux: pieces.lire(source.id), max: maxDe[genre], attendu: taille }); }
      catch (e) { await pieces.effacer(id).catch(() => {}); throw e && e.code === 'trop_gros' ? err('piece_trop_lourde') : e; }
      try { stockage.pieceCreer({ id, proprio: uid, conv, genre, taille: r.taille, mime: r.mime, nom: source.nom || null, ttlMs: pc.orphelineMs }); }
      catch (e) { await pieces.effacer(id).catch(() => {}); throw e; }
      return { id, taille: r.taille };
    } finally { place.liberer(); sortir(); }
  };

  /* ══ DÉPOSER ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  H['pieces.deposer'] = garder(async (req, res) => {
    const uid = req.moi.id, q = req.query;
    const genre = typeof q.genre === 'string' ? q.genre : '';
    if (genre !== 'avatar' && !GENRES_CONV.includes(genre)) return refus(res, 400, 'champ_invalide');
    let conv = null;
    if (genre === 'avatar') {
      if (q.conv !== undefined) return refus(res, 400, 'champ_invalide');
    } else {
      if (q.conv === undefined) return refus(res, 400, 'champ_invalide');
      /* ⛔ comme la garde « membre » : une conversation mal formée, inexistante, ou dont on n'est pas membre — même 404 */
      const r = typeof q.conv === 'string' && ID_CONV.test(q.conv) ? stockage.convPourMembre(q.conv, uid) : null;
      if (!r) return refus(res, 404, 'introuvable');
      conv = q.conv;
      /* on ne dépose pas dans une conversation où l'on n'a plus le droit d'écrire (directe bloquée ou sans contact, groupe d'annonces) */
      if (!stockage.ecritureAutorisee(conv, uid)) return refus(res, 404, 'introuvable');
      if (r.conv.type === 'direct' && stockage.invitationEtat(conv, uid) === 'envoyee') return refus(res, 403, 'invitation_texte');     // une invitation qui attend : du texte seul (`routes.js`)
      if (r.conv.type === 'groupe' && r.conv.annonces_seules && r.moi.role !== 'admin') return refus(res, 403, 'annonces_seules');
    }
    /* ⛔ le nom d'un fichier vient d'un EN-TÊTE, jamais de l'adresse (B2) : `?nom=` est refusé quel que soit le genre */
    if (q.nom !== undefined) return refus(res, 400, 'champ_invalide');
    let nom = null;
    if (genre === 'fichier') {
      const brut = req.headers['x-opm-nom'];
      if (typeof brut !== 'string' || !brut || brut.length > 2048) return refus(res, 400, 'champ_invalide');
      let lu; try { lu = decodeURIComponent(brut); } catch (e) { return refus(res, 400, 'champ_invalide'); }
      nom = couperNom(nettoyerNom(lu).replace(/[\/\\]/g, '_'), NOM_MAX).trim();
      if (!nom) return refus(res, 400, 'champ_invalide');
    }
    if (!/^application\/octet-stream\s*(;|$)/i.test(String(req.headers['content-type'] || ''))) return refus(res, 415, 'type_refuse');

    /* le plafond d'envois par heure : compté dès que la demande est bien formée (un refus de taille ou de type coûte aussi du débit) */
    const plafond = Object.assign({ max: pc.depotsHeure, fenetreMs: 3600000 }, config.quotas.piece || {});
    const p = quotas.essai('piece:' + uid, Math.max(1, Math.floor(plafond.max * jeune(req.moi))), plafond.fenetreMs);
    if (!p.ok) { res.set('Retry-After', String(p.retry)); return refus(res, 429, 'quota_atteint', { retry: p.retry }); }

    /* ⛔ LA LONGUEUR EST OBLIGATOIRE : sans elle on ne sait pas, avant de lire, si l'envoi tiendra dans le maximum, le quota et le disque. Un envoi fractionné
       (`Transfer-Encoding: chunked`) n'a pas de longueur : 411. */
    const cl = req.headers['content-length'];
    if (req.headers['transfer-encoding'] !== undefined || typeof cl !== 'string' || !/^\d{1,13}$/.test(cl)) return refus(res, 411, 'longueur_requise');
    const taille = parseInt(cl, 10);
    if (taille === 0) return refus(res, 400, 'champ_invalide');
    const max = maxDe[genre];
    if (taille > max) return refus(res, 413, 'piece_trop_lourde', { max });

    /* le plancher d'espace libre : ce service ne doit JAMAIS priver OP GESTION de disque — l'envoi annoncé ne doit pas le faire passer sous le seuil.
       ⛔ …et les envois DÉJÀ ACCEPTÉS non plus (remarque 3 du gardien) : chacun, jugé seul contre l'espace libre d'à présent, tient sous le plancher ; seize de 25 Mo ensemble, non — l'espace
       libre ne baisse qu'à mesure que les octets arrivent. On soustrait donc la taille annoncée de tous les envois en cours. Compter l'annonce entière double-compte ce qui est déjà écrit :
       on se trompe du côté prudent, pour au plus `simultanes` × le maximum (400 Mo). */
    if (ctx.disque.libreMo() - (octetsAnnonces + taille) / Mo < config.disqueMinMo) return refus(res, 503, 'disque_plein');

    const sortir = entrerDepot(uid, taille);
    if (!sortir) { res.set('Retry-After', '5'); return refus(res, 429, 'quota_atteint', { retry: 5, portee: 'simultane' }); }
    const place = reservations.essayer(uid, taille);
    if (!place.ok) { sortir(); return refus(res, 402, 'quota_atteint', { portee: 'stockage', utilise: place.utilise, max: place.max }); }

    const id = stockage.nouvelId('f');
    try {
      let r;
      try { r = await pieces.deposer({ id, genre, flux: req, max, attendu: taille, debitMin: pc.depotDebitMin, graceMs: pc.depotGraceMs }); }
      catch (e) {
        const c = e && e.code;
        if (c === 'trop_gros') return refus(res, 413, 'piece_trop_lourde', { max });
        if (c === 'trop_lent') {
          /* ⛔ UN ENVOI QUI N'AVANCE PAS REND SA PLACE (A4) : 408, la connexion se ferme derrière la réponse (`Connection: close` — le reste du corps ne sera jamais lu, la connexion ne
             peut pas resservir), et le `finally` ci-dessous rend la place ET la réservation de quota. La réponse part AVANT la fermeture : un client qui continue d'envoyer la lit
             (`test-943` § 11, un octet toutes les 100 ms). Fermer une connexion dont le corps n'est pas lu envoie un RST ; un envoi qui n'avance pas n'a presque rien d'en attente, le cas
             d'un RST qui efface la réponse est celui d'un envoi RAPIDE, que cette garde ne coupe jamais. */
          res.set('Connection', 'close');
          ctx.journaliser('piece_depot_lent', {});
          return refus(res, 408, 'envoi_trop_lent');
        }
        if (c === 'type_refuse') return refus(res, 415, 'type_refuse');
        if (c === 'occupe') { res.set('Retry-After', '2'); return refus(res, 429, 'quota_atteint', { retry: 2, portee: 'simultane' }); }   // trop d'images en cours de nettoyage : dans un instant
        if (c === 'vide' || c === 'incomplet') return refus(res, 400, 'champ_invalide');
        if (req.aborted || req.destroyed || res.destroyed) return;        // le client s'en est allé : rien n'a été écrit (pieces.deposer a abandonné), personne à qui répondre
        throw e;
      }
      try {
        stockage.pieceCreer({ id, proprio: uid, conv, genre, taille: r.taille, mime: r.mime, nom, ttlMs: pc.orphelineMs });
      } catch (e) { await pieces.effacer(id).catch(() => {}); throw e; }
      res.status(201).json({ id, taille: r.taille, mime: r.mime });
    } finally { place.liberer(); sortir(); }
  });

  /* ══ LIRE ══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  /* `req.piece` est posé par la garde J : la pièce que CETTE personne a le droit de lire (sinon 404 avant d'arriver ici). */
  /* ── GET /api/pieces/:id/suivi  V : qui a reçu, lu, ouvert ou téléchargé MA pièce (l'auteur seul ; tout autre — et une pièce qui n'existe pas — reçoit le même 404) ── */
  H['pieces.suivi'] = garder((req, res) => {
    const id = req.params.id;
    if (!ID_PIECE.test(id)) return refus(res, 404, 'introuvable');
    if (!quotas.essai('piece_suivi:' + req.moi.id, 120, 60000).ok) return refus(res, 429, 'quota_atteint');
    const s = stockage.pieceSuivi(id, req.moi.id);
    if (!s) return refus(res, 404, 'introuvable');
    res.json(s);
  });
  H['pieces.lire'] = garder(async (req, res) => {
    const p = req.piece, total = p.taille;
    /* le fichier doit être là ET annoncer la taille que la base annonce — sinon la ligne ment (fichier perdu, remplacé) : on le dit à /health, on ne sert rien */
    const reel = await pieces.taille(p.id);
    if (reel === null || reel !== total) {
      /* ⛔ UNE COURSE LECTURE / SUPPRESSION N'EST PAS UNE PIÈCE ABÎMÉE (relecture du gardien, A1). La garde J a laissé passer la lecture, puis « supprimer pour tous » (ou un éphémère échu) a effacé la
         ligne ET le fichier avant qu'on l'ouvre : le fichier manque, mais sa ligne aussi — personne n'a perdu quoi que ce soit. Seule une ligne qui EXISTE ENCORE avec un fichier qui manque est une perte :
         sans cette relecture, 40 courses faisaient compter 300 pièces « illisibles » et l'alarme de la surveillance restait allumée pour toujours. */
      if (stockage.pieceExiste(p.id)) { ctx.piecesEtat.illisibles++; ctx.journaliser('piece_illisible', { nom: 'fichier_absent' }); }
      return refus(res, 404, 'introuvable');
    }

    let debut = 0, fin = total - 1, partiel = false;
    const rg = req.headers.range;
    if (rg !== undefined) {
      /* une seule plage « bytes=a-b », « bytes=a- » ou « bytes=-n » ; plusieurs plages, ou un en-tête illisible : ignorés, on sert tout (RFC 7233 § 3.1) */
      const m = /^bytes=(\d*)-(\d*)$/.exec(String(rg).trim());
      if (m && (m[1] !== '' || m[2] !== '')) {
        const non = () => { res.set('Content-Range', 'bytes */' + total); return refus(res, 416, 'plage_invalide'); };
        if (m[1] === '') {
          const n = parseInt(m[2], 10);
          if (!(n > 0)) return non();
          debut = Math.max(0, total - n);
        } else {
          debut = parseInt(m[1], 10);
          if (debut >= total) return non();
          if (m[2] !== '') { fin = Math.min(parseInt(m[2], 10), total - 1); if (fin < debut) return non(); }
        }
        partiel = true;
      }
    }
    res.status(partiel ? 206 : 200);
    res.set({
      'Content-Type': p.mime,
      'Content-Length': String(fin - debut + 1),
      'Accept-Ranges': 'bytes',
      'Content-Disposition': dispositionDe(enLigne(p.genre, p.mime), p.nom),
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (partiel) res.set('Content-Range', 'bytes ' + debut + '-' + fin + '/' + total);
    if (req.method === 'HEAD') return res.end();
    /* le SUIVI DU DOCUMENT (migration 15) : toute lecture, par quelqu'un d'autre que l'auteur, d'une pièce de conversation — dédoublonnée à la minute par le stockage (une rafale de
       plages ne compte qu'une fois, et `Range: bytes=1-` ne passe pas inaperçu : relecture du gardien, C1). ⛔ Une PHOTO ou un VOCAL n'est noté que si la personne a ses confirmations
       de lecture ALLUMÉES au moment où elle l'ouvre (C5) : coupées, rien n'est gardé qui réapparaîtrait le jour où elle les rallume. Un FICHIER téléchargé est toujours noté — c'est
       dit sur la carte du fichier et dans les réglages. Une base qui refuse d'écrire ne prive personne de son fichier. */
    const noteOk = p.genre === 'fichier' || !(req.moi.prefs && req.moi.prefs.accuses === false);
    if (p.conv && p.genre !== 'avatar' && p.proprio !== req.moi.id && noteOk) { try { stockage.pieceAccesNoter(p.id, req.moi.id); } catch (e) { ctx.journaliser('piece_suivi_echec', {}); } }
    /* ⛔ UN LECTEUR LENT NE TIENT PAS UN FICHIER OUVERT (A2) : chaque lecture garde deux descripteurs (la connexion et le fichier). Sans tampon devant le service, un client qui ne lit plus
       — ou qui lit un octet de temps en temps — les garde pour toujours. Deux butoirs : l'attente d'un `drain` (la connexion pleine ne se vide plus) et la durée totale de la lecture
       (celui qui lit juste assez vite pour ne jamais s'arrêter). Le fichier est rendu par la fin du générateur. */
    let coupee = null;
    const couper = (raison) => { if (coupee) return; coupee = raison; ctx.journaliser('piece_lecture_coupee', { motif: raison }); try { res.destroy(); } catch (x) { /* déjà fermée */ } };
    const butoir = setTimeout(() => couper('duree'), pc.lectureMaxMs); if (butoir.unref) butoir.unref();
    /* ⛔ ET UN DÉBIT MINIMAL, AU SEAU PLAFONNÉ (relecture du gardien, 6 octobre 2026, A2) : depuis qu'un fichier va jusqu'à 5 Go, la durée totale vaut six heures — un lecteur qui laisse
       sa connexion se vider un peu toutes les 29 s tenait deux descripteurs six heures, et quelques adresses bloquaient toutes les lectures du service. Ce qui part compte (un bloc
       accepté par la connexion) ; le temps vide le seau au débit minimal ; vide, la lecture est coupée — le même seau que le dépôt (`gardeDebit`), une avance ne se capitalise pas. */
    const gl = gardeDebit({ debitMin: pc.lectureDebitMin, graceMs: pc.lectureAttenteMs });
    gl.vigile.catch(() => couper('lent'));
    try {
      for await (const bloc of pieces.lire(p.id, debut, fin)) {
        if (res.destroyed || res.writableEnded) return;                     // le client est parti : on arrête de déchiffrer
        gl.compter(bloc.length);
        if (coupee) return;
        if (!res.write(bloc)) {
          await new Promise((ok) => {
            const attente = setTimeout(() => { fini(); couper('attente'); }, pc.lectureAttenteMs);
            const f = () => fini();
            const fini = () => { clearTimeout(attente); res.off('drain', f); res.off('close', f); ok(); };
            res.on('drain', f); res.on('close', f);
          });
          if (coupee) return;
        }
      }
      res.end();
    } catch (e) {
      /* un bloc qui ne s'authentifie pas : les en-têtes sont partis, on coupe net (le client reçoit un fichier incomplet, jamais des octets faux) et on le COMPTE — sauf si la pièce a été effacée
         pendant qu'on la lisait (même course que ci-dessus : sa ligne n'existe plus) */
      if (stockage.pieceExiste(p.id)) { ctx.piecesEtat.illisibles++; ctx.journaliser('piece_illisible', { nom: e && e.code }); }
      try { res.destroy(); } catch (x) { /* déjà fermée */ }
    } finally { clearTimeout(butoir); gl.arreter(); }
  });

  /* ══ MA PHOTO DE PROFIL ═════════════════════════════════════════════════════════════════════════════════════════════════ */
  H['moi.avatar'] = garder((req, res) => {
    const b = corps(req);
    if (!Object.prototype.hasOwnProperty.call(b, 'piece')) return refus(res, 400, 'champ_invalide');
    const piece = b.piece;
    if (piece !== null && !(typeof piece === 'string' && ID_PIECE.test(piece))) return refus(res, 400, 'champ_invalide');
    const plafond = Object.assign({ max: 30, fenetreMs: 3600000 }, config.quotas.moi_avatar || {});
    const p = quotas.essai('moi_avatar:' + req.moi.id, plafond.max, plafond.fenetreMs);
    if (!p.ok) { res.set('Retry-After', String(p.retry)); return refus(res, 429, 'quota_atteint', { retry: p.retry }); }
    const r = stockage.avatarPersonnePoser(req.moi.id, piece);                // lève `piece_inconnue` : la pièce d'un autre, un fichier, une photo déjà posée, une pièce échue
    ctx.effacerPieces(r.pieces);                                              // l'ancienne photo : le fichier part avec sa ligne
    hub.personneChangee(req.moi.id);                                          // contacts, co-membres et mes autres appareils relisent mon profil
    res.json({ ok: true, moi: stockage.personneParId(req.moi.id) });
  });

  /* ══ L'ESPACE UTILISÉ ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
  H['moi.stockage'] = garder((req, res) => res.json({ utilise: stockage.pieceUtilise(req.moi.id), max: pc.quotaPersonne }));

  return { enCours: () => enCours, octetsAnnonces: () => octetsAnnonces };
}

module.exports = { installerPieces, GENRES_CONV, NOM_MAX };
