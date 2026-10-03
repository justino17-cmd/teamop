/* ══ LES ROUTES DES PIÈCES — DÉPOSER, LIRE, PHOTO DE PROFIL, ESPACE UTILISÉ (étape 4) ════════════════════════════════════════
 *
 *   POST /api/pieces?conv=<id>&genre=photo|vocal|fichier&nom=<nom>   V  corps BINAIRE (application/octet-stream), Content-Length OBLIGATOIRE
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
 * ⛔ AUCUN NOM DE FICHIER, AUCUN IDENTIFIANT COMPLET DE PIÈCE DANS UN JOURNAL (SERVEUR.md § 3.6) : seuls des compteurs vont à /health.
 */
'use strict';
const { ID_PIECE, enLigne, dispositionDe } = require('./pieces');
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
  let enCours = 0;
  const parPers = new Map();
  function entrerDepot(uid) {
    if (enCours >= pc.simultanes || (parPers.get(uid) || 0) >= pc.parPersonne) return null;
    enCours++; parPers.set(uid, (parPers.get(uid) || 0) + 1);
    let sorti = false;
    return () => { if (sorti) return; sorti = true; enCours--; const n = (parPers.get(uid) || 1) - 1; if (n > 0) parPers.set(uid, n); else parPers.delete(uid); };
  }

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
      if (r.conv.type === 'groupe' && r.conv.annonces_seules && r.moi.role !== 'admin') return refus(res, 403, 'annonces_seules');
    }
    let nom = null;
    if (genre === 'fichier') {
      if (typeof q.nom !== 'string') return refus(res, 400, 'champ_invalide');
      nom = Array.from(nettoyerNom(q.nom).replace(/[\/\\]/g, '_')).slice(0, NOM_MAX).join('').trim();
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

    /* le plancher d'espace libre : ce service ne doit JAMAIS priver OP GESTION de disque — l'envoi annoncé ne doit pas le faire passer sous le seuil */
    if (ctx.disque.libreMo() - taille / Mo < config.disqueMinMo) return refus(res, 503, 'disque_plein');

    const sortir = entrerDepot(uid);
    if (!sortir) { res.set('Retry-After', '5'); return refus(res, 429, 'quota_atteint', { retry: 5, portee: 'simultane' }); }
    const place = reservations.essayer(uid, taille);
    if (!place.ok) { sortir(); return refus(res, 402, 'quota_atteint', { portee: 'stockage', utilise: place.utilise, max: place.max }); }

    const id = stockage.nouvelId('f');
    try {
      let r;
      try { r = await pieces.deposer({ id, genre, flux: req, max, attendu: taille }); }
      catch (e) {
        const c = e && e.code;
        if (c === 'trop_gros') return refus(res, 413, 'piece_trop_lourde', { max });
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
  H['pieces.lire'] = garder(async (req, res) => {
    const p = req.piece, total = p.taille;
    /* le fichier doit être là ET annoncer la taille que la base annonce — sinon la ligne ment (fichier perdu, remplacé) : on le dit à /health, on ne sert rien */
    const reel = await pieces.taille(p.id);
    if (reel === null || reel !== total) { ctx.piecesEtat.illisibles++; ctx.journaliser('piece_illisible', { nom: 'fichier_absent' }); return refus(res, 404, 'introuvable'); }

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
    try {
      for await (const bloc of pieces.lire(p.id, debut, fin)) {
        if (res.destroyed || res.writableEnded) return;                     // le client est parti : on arrête de déchiffrer
        if (!res.write(bloc)) await new Promise((ok) => { const f = () => { res.off('drain', f); res.off('close', f); ok(); }; res.on('drain', f); res.on('close', f); });
      }
      res.end();
    } catch (e) {
      /* un bloc qui ne s'authentifie pas : les en-têtes sont partis, on coupe net (le client reçoit un fichier incomplet, jamais des octets faux) et on le COMPTE */
      ctx.piecesEtat.illisibles++; ctx.journaliser('piece_illisible', { nom: e && e.code });
      try { res.destroy(); } catch (x) { /* déjà fermée */ }
    }
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

  return { enCours: () => enCours };
}

module.exports = { installerPieces, GENRES_CONV, NOM_MAX };
