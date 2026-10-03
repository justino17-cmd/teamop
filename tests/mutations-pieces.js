/* ══ LES MUTATIONS DES PIÈCES — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » (CLAUDE.md) ═══════════════════════════════════
   Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il remet, UN PAR UN, les défauts que `tests/test-942`,
   `943` et `944` (et la sonde `sonde-opmessages-pieces.js`) gardent — un droit de lecture oublié, une longueur non exigée, un type jugé sur la parole du
   client, un fichier servi « en ligne », une clé de bloc sans son numéro, un EXIF gardé, un quota qui ne compte pas, un message effacé dont le fichier reste,
   une présence qui n'est pas réciproque, une pièce relue pour rien, une mémoire qui ne se vide pas, un `| 0` qui rend le quota négatif… — dans une COPIE de
   l'arbre (jamais dans l'arbre lui-même : le `git checkout` d'après-mutation de CLAUDE.md efface aussi les correctifs non commités), joue les bancs visés, et
   exige qu'AU MOINS UN tombe (code de sortie non nul ou un « ✗ »).

   ⛔ UNE MUTATION DONT LE MOTIF NE TROUVE RIEN EST MAL VISÉE, et le lanceur le DIT au lieu de conclure : il vérifie que le motif se trouve EXACTEMENT UNE fois
   (`s.replace(motif, autre, 1)` frappe la PREMIÈRE occurrence du fichier, pas celle qu'on croit — pris le 22 septembre 2026) ET que le texte a changé.
   ⛔ UNE MUTATION QUI SURVIT n'est pas forcément un banc aveugle : une autre garde peut la neutraliser (le gardien d'`instantanerVers`, 19 septembre). Le lanceur nomme
   la survivante ; on regarde alors si le COMPORTEMENT a changé avant d'en conclure quoi que ce soit sur le banc. Et l'inverse : une mutation qui ne casse RIEN alors
   que le défaut est réel veut dire « le banc ne joue pas ce cas » — elle a servi à ajouter les contrôles qui manquaient.
   ⛔ LA COPIE EST FABRIQUÉE DEPUIS L'ARBRE COMMITÉ OU NON : lancer ce fichier APRÈS `git commit` du correctif, jamais avant.

   Lancer :  node tests/mutations-pieces.js                 (toutes, hors sondes navigateur)
             node tests/mutations-pieces.js --sondes        (les mutations de la page, jouées par la sonde navigateur — il faut NODE_PATH=…/playwright/node_modules)
             node tests/mutations-pieces.js P03 K05         (seulement celles-là)
             node tests/mutations-pieces.js --verifier      (ne joue rien : vérifie que chaque motif se trouve UNE fois dans l'arbre)
   Trois copies en parallèle, un délai par banc. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');

const RACINE = path.join(__dirname, '..');
const NB_COPIES = 3, DELAI_MS = 300000;
const F = {
  inst: 'server-msg/install-msg.sh',
  rp: 'server-msg/routes-pieces.js', app: 'server-msg/app.js', stock: 'server-msg/stockage.js', pz: 'server-msg/pieces.js', flux: 'server-msg/flux.js', routes: 'server-msg/routes.js',
  index: 'server-msg/index.js', src: 'server-msg/public/source-serveur.js', api: 'server-msg/public/api.js', page: 'apercu/opmessages/index.html',
};
const MUTATIONS = [];
/* m(id, nom, fichier, ancien, nouveau, suites) — `ancien` : une chaîne, ou une expression régulière (une seule occurrence, `$1` permis dans `nouveau`) */
const m = (id, nom, fichier, ancien, nouveau, suites, o) => MUTATIONS.push(Object.assign({ id, nom, edits: [[fichier, ancien, nouveau]], suites }, o || {}));
const m2 = (id, nom, edits, suites, o) => MUTATIONS.push(Object.assign({ id, nom, edits, suites }, o || {}));

/* ── LES DROITS DE LECTURE : une pièce ne se lit que si le message qui la porte se lit ── */
m('P01', 'une photo reste lisible par qui n\'était pas encore dans le groupe quand elle est arrivée (depuis_seq ignoré)', F.stock, 'if (!m || r.attachee < m.depuis_seq) return null;', 'if (!m) return null;', ['943']);
m('P02', 'une pièce reste lisible alors que son message est marqué supprimé (la ligne de la pièce traîne encore : droit de lire ≠ effacement)', F.stock, 'if (!msg || msg.supprime_le || (msg.expire_ts !== null && msg.expire_ts <= t)) return null;', 'if (!msg || (msg.expire_ts !== null && msg.expire_ts <= t)) return null;', ['943']);
m('P44', 'une pièce reste lisible alors que son message éphémère est échu et que le balayeur n\'a pas encore passé', F.stock, 'if (!msg || msg.supprime_le || (msg.expire_ts !== null && msg.expire_ts <= t)) return null;', 'if (!msg || msg.supprime_le) return null;', ['943']);
m('P03', 'une pièce reste lisible après « supprimer pour moi » (le masque n\'est pas regardé)', F.stock, "    if (Q('SELECT 1 AS x FROM msg_masque WHERE conv = ? AND seq = ? AND uid = ?').get(r.conv, r.attachee, uid)) return null;\n", '', ['943']);
m('P04', 'une pièce pas encore envoyée est lisible par tous les membres (elle devrait être à son dépositaire seul)', F.stock, 'if (r.attachee === null) return r.proprio === uid && r.expire !== null && r.expire > t ? rang() : null;', 'if (r.attachee === null) return rang();', ['943']);
m('P05', 'la photo de profil d\'une personne se lit même sans être son contact (ni bloqué, ni étranger regardés)', F.stock, 'return peutVoir(uid, pers.id) && avatarPour(uid, pers.id, id) ? rang() : null;', 'return rang();', ['943']);
m('P06', 'la garde J laisse passer une pièce qui n\'est pas visible (le refus 404 est retiré)', F.app, /if \(!p\) return refus\(res, 404, 'introuvable'\);\n(\s*)req\.piece = p; next\(\);/, 'req.piece = p; next();', ['905']);
/* ── CE QU'UN MESSAGE PEUT CITER : sa pièce à lui, du bon genre, de la bonne conversation, non encore envoyée, non échue ── */
m('P07', 'un message cite la pièce D\'UN AUTRE (le propriétaire n\'est plus vérifié)', F.stock, 'AND proprio = ? AND conv = ? AND genre = ?', 'AND ? IS NOT NULL AND conv = ? AND genre = ?', ['943']);
m('P08', 'un message cite une pièce déposée pour UNE AUTRE conversation', F.stock, 'AND proprio = ? AND conv = ? AND genre = ?', 'AND proprio = ? AND ? IS NOT NULL AND genre = ?', ['943']);
m('P09', 'une photo est citée comme vocal (le genre n\'est plus vérifié)', F.stock, 'AND proprio = ? AND conv = ? AND genre = ?', 'AND proprio = ? AND conv = ? AND ? IS NOT NULL', ['943']);
/* ⚠️ retirer SEULEMENT `attachee IS NULL` est une mutation ÉQUIVALENTE (mesurée : elle survit) : une pièce attachée n'a plus d'échéance (`expire = NULL` dans la même instruction), et `expire IS NOT NULL` — comme
   `expire > ?` — la refuse déjà. Trois gardes pour une seule règle : on les retire TOUTES pour voir si le banc joue le cas « déjà envoyée ». */
m('P10', 'une pièce déjà envoyée peut être citée de nouveau (les trois conditions d\'attachement retirées : rien ne l\'en empêche)', F.stock, 'AND attachee IS NULL AND expire IS NOT NULL AND expire > ?', 'AND ? IS NOT NULL', ['943']);
m('P11', 'une pièce échue (déposée il y a plus de 24 h) peut encore être citée', F.stock, 'AND attachee IS NULL AND expire IS NOT NULL AND expire > ?', 'AND attachee IS NULL AND ? IS NOT NULL', ['943']);
/* ── LE DÉPÔT : longueur obligatoire, maximum jugé avant de lire, type de la requête, plafonds ── */
m('P12', 'le dépôt n\'exige plus de Content-Length (l\'envoi fractionné passe)', F.rp, "if (req.headers['transfer-encoding'] !== undefined || typeof cl !== 'string' || !/^\\d{1,13}$/.test(cl)) return refus(res, 411, 'longueur_requise');", '', ['943']);
m('P13', 'le maximum n\'est plus jugé AVANT de lire (un corps de 100 Mo annoncé est lu)', F.rp, "if (taille > max) return refus(res, 413, 'piece_trop_lourde', { max });", '', ['943']);
m('P14', 'le type de la REQUÊTE n\'est plus exigé (octet-stream)', F.rp, "if (!/^application\\/octet-stream\\s*(;|$)/i.test(String(req.headers['content-type'] || ''))) return refus(res, 415, 'type_refuse');", '', ['943']);
m('P15', 'le lecteur JSON redevient le lecteur du dépôt d\'une pièce', F.app, "(req.method === 'POST' && /^\\/api\\/pieces\\/?$/i.test(req.path)) ? next() : lecteurJson(req, res, next)", 'lecteurJson(req, res, next)', ['943']);
m('P16', 'le plancher d\'espace disque n\'arrête plus un dépôt', F.rp, "if (ctx.disque.libreMo() - (octetsAnnonces + taille) / Mo < config.disqueMinMo) return refus(res, 503, 'disque_plein');", '', ['943']);
m('P17', 'le plafond d\'envois par heure n\'est plus tenu', F.rp, /(const p = quotas\.essai\('piece:' \+ uid[^\n]*\n\s*)if \(!p\.ok\) \{[^\n]*\}/, '$1', ['943']);
m('P18', 'plus de limite aux envois en même temps', F.rp, 'if (enCours >= pc.simultanes || (parPers.get(uid) || 0) >= pc.parPersonne) return null;', '', ['943']);
m('P19', 'le quota par personne ne compte plus (la réservation accepte tout)', F.pz, 'if (deja + reserve + octetsDemandes > max) return { ok: false, utilise: deja, max };', '', ['942', '943']);
/* ── LE TYPE SE JUGE AUX OCTETS ; CE QUI EST SERVI EN LIGNE EST UNE IMAGE OU UN SON ── */
m('P20', 'un vocal est accepté quels que soient ses octets (le son n\'est plus jugé)', F.pz, "if (genre === 'vocal') { const m = mimeAudio(tete); return m ? { mime: m, famille: 'audio' } : null; }", "if (genre === 'vocal') { return { mime: mimeAudio(tete) || 'audio/webm', famille: 'audio' }; }", ['942', '943']);
m2('P21', 'un fichier est servi selon sa signature : un PNG déposé comme fichier sort en image « en ligne »', [[F.pz, "if (genre === 'fichier') return { mime: 'application/octet-stream', famille: 'fichier' };", "if (genre === 'fichier') return { mime: mimeImage(tete) || 'application/octet-stream', famille: 'fichier' };"],
  [F.pz, "const enLigne = (genre, mime) => genre !== 'fichier' && (", 'const enLigne = (genre, mime) => ('] ], ['942', '943']);
m('P22', 'tout est servi « inline » (plus de pièce jointe pour un fichier)', F.pz, "if (inline) return 'inline';", "return 'inline';", ['942', '943']);
m('P23', 'le nom d\'une pièce jointe n\'est plus assaini dans l\'en-tête (retour à la ligne, guillemets, barres)', F.pz, /\.replace\(\/\[\\u0000-\\u001f[^\]]*\]\/g, '_'\)/, '', ['942', '943']);
m('P24', 'le nom d\'un fichier est rangé tel que le client l\'a donné (ni barres, ni contrôles ôtés à l\'entrée)', F.rp, "nom = couperNom(nettoyerNom(lu).replace(/[\\/\\\\]/g, '_'), NOM_MAX).trim();", 'nom = String(lu).slice(0, NOM_MAX);', ['943']);
m('P25', 'la politique de sécurité « sandbox » de la pièce servie est retirée', F.rp, "      'Content-Security-Policy': \"sandbox; default-src 'none'\",\n", '', ['943']);
/* ⚠️ retirer SEUL l'en-tête de la route des pièces est une mutation ÉQUIVALENTE (mesurée : elle survit) : `app.js` pose `nosniff` sur TOUTES les réponses. Les deux posent la même règle ; on retire les deux. */
m2('P26', 'plus aucun nosniff sur une pièce servie (ni sur la route des pièces, ni dans l\'enveloppe du service : les deux posent le même en-tête)', [[F.rp, "      'X-Content-Type-Options': 'nosniff',\n", ''], [F.app, "      'X-Content-Type-Options': 'nosniff',\n", '']], ['943', '903']);
m('P27', 'la plage demandée est ignorée (toujours le fichier entier)', F.rp, 'const m = /^bytes=(\\d*)-(\\d*)$/.exec(String(rg).trim());', 'const m = null;', ['943']);
m('P28', 'le service n\'autorise plus le micro à la page (Permissions-Policy)', F.app, 'camera=(), microphone=(self)', 'camera=(), microphone=()', ['903']);
/* ── LE SCELLAGE PAR BLOCS ET LES MÉTADONNÉES ── */
m('P29', 'la clé de bloc ne lie plus le numéro du bloc ni le drapeau « dernier » (blocs échangeables, fichier tronqué à une frontière)', F.pz, "const aad = (id, i, dernier) => Buffer.from(id + '|' + i + '|' + (dernier ? 'd' : 'n'), 'utf8');", 'const aad = (id) => Buffer.from(id, \'utf8\');', ['942']);
m('P30', 'l\'EXIF (GPS, appareil) d\'un JPEG est gardé', F.pz, "if (mime === 'image/jpeg') return nettoyerJpeg(b);", "if (mime === 'image/jpeg') return b;", ['942', '943']);
m('P31', 'un PNG garde ses textes et son EXIF', F.pz, 'if (!CHUNKS_PNG_RETIRES.has(type)) o += b.copy(sortie, o, i, i + 12 + long);', 'o += b.copy(sortie, o, i, i + 12 + long);', ['942']);
m('P32', 'un WebP garde son EXIF et son XMP', F.pz, "if (type !== 'EXIF' && type !== 'XMP ') {", 'if (true) {', ['942']);
/* ── LES PIÈCES PARTENT AVEC CE QUI LES PORTE ── */
m('P33', '« supprimer pour tous » n\'efface plus le fichier de la pièce', F.routes, '    effacer(r.pieces);   // ⛔ « pour tous » efface aussi les pièces du message, fichier compris\n', '', ['943']);
m('P34', 'le dernier membre qui part n\'emporte plus les pièces de la conversation', F.routes, '    effacer(r.pieces);   // le dernier membre part : la conversation et ses pièces avec elle\n', '', ['943']);
m('P35', 'un message éphémère échu laisse son fichier sur le disque', F.index, /      effacerPieces\(r\.pieces\);[^\n]*\n/, '', ['943']);
m('P36', 'une pièce jamais envoyée (24 h) ou une photo de profil jamais posée n\'est plus ôtée', F.index, /      effacerPieces\(stockage\.piecesOrphelinesPurger\(500\)\);[^\n]*\n/, '', ['943']);
m('P45', 'la ligne d\'une pièce jamais envoyée (24 h) part, mais son FICHIER reste sur le disque (le balayeur n\'appelle plus l\'effacement)', F.index, 'effacerPieces(stockage.piecesOrphelinesPurger(500));', 'stockage.piecesOrphelinesPurger(500);', ['943']);
m('P46', 'une pièce jamais envoyée reste lisible par son dépositaire après son échéance de 24 h (tant que le balayeur n\'a pas passé)', F.stock, 'if (r.attachee === null) return r.proprio === uid && r.expire !== null && r.expire > t ? rang() : null;', 'if (r.attachee === null) return r.proprio === uid ? rang() : null;', ['943']);
m('P37', 'une pièce illisible n\'est plus comptée dans /health', F.rp, "ctx.piecesEtat.illisibles++; ctx.journaliser('piece_illisible', { nom: 'fichier_absent' });", "ctx.journaliser('piece_illisible', { nom: 'fichier_absent' });", ['943']);
/* ── LA CONFIDENTIALITÉ RÉCIPROQUE ── */
m('P38', 'celui qui coupe sa présence voit encore celle des autres', F.routes, 'const jeVois = !(req.moi.prefs && req.moi.prefs.presence === false);', 'const jeVois = true;', ['943']);
m('P39', 'la présence d\'une personne qui l\'a coupée est quand même diffusée', F.flux, '    if (!presenceVisible(uid)) return;\n    emettre(stockage.contactsActifs(uid).filter(presenceVisible)', '    emettre(stockage.contactsActifs(uid).filter(presenceVisible)', ['943']);
m('P40', 'la présence est diffusée à des contacts qui ont coupé la leur', F.flux, 'emettre(stockage.contactsActifs(uid).filter(presenceVisible), \'presence\'', 'emettre(stockage.contactsActifs(uid), \'presence\'', ['943']);
m('P41', 'le « Lu » d\'une personne qui a coupé ses confirmations est montré aux autres', F.stock, '(r.id === viewer || (accuses(prefs) && jeVois)) ? r.lu_seq : null', 'r.lu_seq', ['943']);
m('P42', 'celui qui a coupé ses confirmations reçoit encore celles des autres (événement « lu »)', F.stock, "        if (u !== uid && typeof accusesVus === 'function' && !accusesVus()) return null;\n", '', ['943']);
m('P43', 'l\'événement « lu » d\'une personne qui a coupé ses confirmations part quand même à tous', F.stock, 'accuses((personneParId(uid) || {}).prefs) ? null : uid', 'null', ['943']);

/* ── LE CLIENT : api.js et source-serveur.js ── */
m('K01', 'un renvoi redépose les pièces déjà déposées', F.src, '          if (x.id) continue;\n', '', ['944']);
m('K02', 'un texte écrit pendant le dépôt d\'une photo passe devant elle', F.src, /          if \(p\.enVol\) \{ planifierFile\(0\); break; \}[^\n]*\n/, '', ['944']);
m('K03', 'la mémoire des pièces n\'a plus de borne', F.src, 'while (cachePieces.size > cacheMax || octetsCache > cacheOctetsMax) {', 'while (false) {', ['944']);
m('K04', 'l\'arrêt ne rend plus les adresses blob: (elles survivent à la session)', F.src, '      for (const e of cachePieces.values()) revoquerUrl(e.url);\n      cachePieces.clear();', '      cachePieces.clear();', ['944']);
m('K05', 'un message supprimé par l\'autre ne libère pas ses pièces ici', F.src, '          const m = c.messages.find(x => x.seq === d.seq); if (m) oublierMeta(m.meta);\n', '', ['944']);
m('K06', 'l\'ouverture lit d\'avance TOUTES les photos (plus de borne à 30)', F.src, 'const PHOTOS_AUTO = 30, VOCAUX_AUTO = 6,', 'const PHOTOS_AUTO = 1000, VOCAUX_AUTO = 6,', ['944']);
m('K07', 'un fichier téléchargé est aussi gardé en mémoire', F.src, "return (await A.lirePiece(id)).blob; };", "const b = (await A.lirePiece(id)).blob; poserCache(id, creerUrl(b), b.size); return b; };", ['944']);
m('K08', 'le 413 HTML d\'un relais redevient « erreur inconnue »', F.api, "if (opts && opts.piece && r.status === 413 && code === 'inconnue') {", 'if (false) {', ['944']);
m('K09', 'un espace de stockage plein (402) redit « réessaie dans un instant »', F.api, "super(code === 'quota_atteint' && statut === 402 ? MESSAGES.quota_stockage : dire(code));", 'super(dire(code));', ['944']);
m('K10', 'un fichier trop lourd n\'est plus jugé avant d\'ouvrir une connexion', F.src, "      for (const x of lesPieces(p)) if (x.blob.size > max) throw new OPMSG.ErreurApi('piece_trop_lourde', 413, 0, { max });\n", '', ['944']);
m('K11', 'l\'image qu\'on vient d\'envoyer est relue du service (son adresse n\'est plus adoptée)', F.src, "          if (x.url && (p.type === 'photo' || p.type === 'vocal')) poserCache(x.id, x.url, x.blob.size);\n", '', ['944']);
m('K12', 'l\'espace utilisé repasse par `| 0` (le quota de 2 Gio devient NÉGATIF) — le défaut que test-944 a trouvé', F.src, '{ utilise: entierPositif(r.utilise), max: entierPositif(r.max) }', '{ utilise: r.utilise | 0, max: r.max | 0 }', ['944']);
m('K13', 'le nom d\'un fichier n\'est plus assaini côté appareil (la barre passe)', F.src, ".replace(/[\\/\\\\]/g, '_').trim(), 120) || 'fichier'", ".trim(), 120) || 'fichier'", ['944']);
m('K14', 'un message refusé après coup ne libère pas les adresses de ses pièces', F.src, '            lesPieces(p).forEach(x => { if (x.id && cachePieces.has(x.id)) liberer(x.id); else if (x.url) revoquerUrl(x.url); });', '', ['944']);
m('K15', 'un profil qui change n\'est plus relu (l\'événement `personne` est ignoré)', F.src, '      personne: (d) => {\n', '      personne: (d) => {\n        return;\n', ['944']);
m('K16', 'le client n\'écoute plus l\'événement `personne`', F.api, "'presence', 'personne', 'resync'];", "'presence', 'resync'];", ['944']);
m('K17', 'la photo de profil qu\'on vient de choisir est relue du service', F.src, '      poserCache(piece, creerUrl(blob), blob.size);', '', ['944']);

/* ── LA RELECTURE DU TESTEUR, CÔTÉ APPAREIL ET SERVICE : ce que la personne voit d'un envoi qui n'est pas parti, et ce qu'on lui dit ── */
m('T01', 'un nom de fichier long est coupé NET côté appareil (l\'extension « .pdf » disparaît : le fichier téléchargé n\'a plus de type)', F.src, "    return signes.slice(0, signes.length - ext.length).slice(0, max - ext.length).join('') + ext.join('');", "    return signes.slice(0, max).join('');", ['944']);
m('T02', 'l\'en-tête de téléchargement coupe le nom net à 120 signes (l\'extension se perd, côté service)', F.pz, "const propre = couperNom(mots.join(''), 120) || 'fichier';", "const propre = mots.slice(0, 120).join('') || 'fichier';", ['942']);
m('T03', 'la durée d\'un vocal est de nouveau arrondie vers le haut (1:05 devient 1:06, 0:01 devient 0:02)', F.src, 'Math.min(600, Math.floor(v.dur))', 'Math.min(600, Math.ceil(v.dur))', ['944']);
m('T04', 'la phrase d\'un refus redit « réessaie » deux fois (« Réessaie dans un instant. (réessaie dans 20 s). »)', F.api, ".replace(/\\s*R[ée]essaie[^.]*\\.$/i, '')", '', ['944']);
m('T05', 'un refus qui peut réussir plus tard (429, 402, 503, 408) jette la pièce (la personne rechoisit sa photo)', F.src, 'const retentable = (e) => !!e && (e.statut === 429 || e.statut === 402 || e.statut === 503 || e.statut === 408);', 'const retentable = (e) => false;', ['944']);
m('T06', 'une panne ne se dit plus du tout (« En attente de connexion… » est le seul signe)', F.src, "function direPanne(p, e) {\n      if (!p.type || p.dit) return;\n      p.dit = true;", "function direPanne(p, e) {\n      return;\n      p.dit = true;", ['944']);
m('T07', 'une panne se redit à CHAQUE renvoi (un avis toutes les trois secondes)', F.src, 'if (!p.type || p.dit) return;', 'if (!p.type) return;', ['944']);
m('T08', 'un renvoi qui vient d\'échouer ne redit pas l\'écran (« Envoi… » reste affiché alors que rien ne part)', F.src, "direPanne(p, e); planifierFile(p.essais); emettre({ type: 'conversation', id: p.conv }); break; }", 'direPanne(p, e); planifierFile(p.essais); break; }', ['944']);
m('T09', '« Envoi… » se montre dès qu\'une tentative démarre, même un renvoi qui échoue en quelques millisecondes (21 requêtes en 12 s sous un « Envoi… » permanent)', F.src, 'const envoi = !!p.enVol && !p.echec && (p.essais === 0 || maintenant() - p.debutEssai >= DELAI_ENVOI_VU_MS);', 'const envoi = !!p.enVol && !p.echec;', ['944']);
m('T10', 'la onzième photo est abandonnée en silence (on garde les dix premières, rien n\'est dit)', F.src, "if (liste.length > PHOTOS_PAR_MESSAGE) throw erreurLocale('trop-de-photos');", 'if (liste.length > PHOTOS_PAR_MESSAGE) liste.length = PHOTOS_PAR_MESSAGE;', ['944']);
m('T11', 'moi() ne dit plus si MA présence est montrée (la barre de la page dit « Disponible » pour toujours)', F.src, ', presence: !(moiApi.prefs && moiApi.prefs.presence === false) }) : null', ' }) : null', ['944']);
m('T12', 'régler sa présence ne redit pas l\'écran (la barre garde l\'ancien état jusqu\'au prochain rafraîchissement)', F.src, "accuses: r.accuses }); emettre({ type: 'moi' });", 'accuses: r.accuses });', ['944']);
m('T13', 'une pièce qui vient d\'être mise en échec ne redessine pas la bulle (la phrase ne paraît pas)', F.src, "p.echec = { phrase: phraseDe(e), code: e && e.code, statut: e && e.statut };\n      emettre({ type: 'conversation', id: p.conv });", 'p.echec = { phrase: phraseDe(e), code: e && e.code, statut: e && e.statut };', ['944']);
m('T14', '« Réessayer » remet la pièce en état mais ne relance rien (rien ne part)', F.src, "      p.echec = null; p.essais = 0; p.dit = false;\n      emettre({ type: 'conversation', id: p.conv });\n      viderFile();\n      return true;", "      p.echec = null; p.essais = 0; p.dit = false;\n      emettre({ type: 'conversation', id: p.conv });\n      return true;", ['944']);
m('T15', '« Annuler » retire la pièce mais garde son adresse locale (la mémoire de l\'image n\'est jamais rendue)', F.src, "const p = file[i]; file.splice(i, 1);\n      lesPieces(p).forEach(x => { if (x.id && cachePieces.has(x.id)) liberer(x.id); else if (x.url) revoquerUrl(x.url); });\n", "const p = file[i]; file.splice(i, 1);\n", ['944']);
m('T16', 'une pièce en échec repart toute seule au prochain passage de la file (la personne n\'a plus la main)', F.src, /          if \(p\.echec\) continue;[^\n]*\n/, '', ['944']);
m('T17', 'un renvoi qui DURE ne redit jamais l\'écran (il n\'y a pas de rendez-vous à 400 ms : « Envoi… » ne paraît jamais)', F.src, /      if \(p\.essais > 0\) planifier\([^\n]*\n/, '', ['944']);
m('T18', 'le délai entre deux essais est plat (1,5 s, sans augmenter) : le réseau coupé reçoit une requête toutes les 1,5 s, pour toujours', F.src, 'Math.min(30000, 1500 * Math.pow(2, Math.min(n, 4)))', '1500', ['944']);
m('T19', 'un texte écrit pendant qu\'une pièce attend la personne reste derrière elle (bloqué par un « Réessayer » jamais touché)', F.src, "if (file.some(x => x.conv === id && !x.echec)) { file.push(p); emettre", "if (file.some(x => x.conv === id)) { file.push(p); emettre", ['944']);
m('T20', 'la bulle d\'une pièce en échec ne porte pas sa phrase (rien n\'explique pourquoi elle n\'est pas partie)', F.src, "      if (p.echec) v.echec = p.echec.phrase;\n", '', ['944']);
m('T21', 'l\'avis qui dit l\'échec d\'une pièce (la personne peut être sur une autre rubrique) n\'est plus émis', F.src, /      const \[sujet, accord\] = sujetEnvoi\(p\);\n      emettre\(\{ type: 'avis', texte: sujet \+ ' n\\'a pas pu être ' \+ accord \+ ' : ' \+ p\.echec\.phrase \}\);\n/, '', ['944']);
m('T22', 'le 408 d\'un envoi trop lent n\'a plus sa phrase (retombe sur « erreur inconnue »)', F.api, /    envoi_trop_lent: [^\n]*\n/, '', ['944']);
m('T23', 'l\'événement `personne` de MOI-MÊME ne relit plus mon profil (réglée sur un autre appareil, la présence masquée n\'est jamais dite à celui-ci)', F.src, "if (estMoi(d.uid)) api0.moi().then(m => { moiApi = m; noter(m); emettre({ type: 'moi' }); }, () => {});\n", '', ['944']);

/* ── LE PROXY (jouée par la sonde d'un VRAI nginx : il faut OPMSG_NGINX ; sans lui, « NON JOUÉE ») ── */
m('P47', 'le bloc des pièces du proxy est ramené à 1 Mo (une photo réduite à 250 Ko passe, un fichier de 20 Mo non)', 'server-msg/install-msg.sh', '        client_max_body_size 26m;', '        client_max_body_size 1m;', ['proxy']);
/* ── B2, A3, A2 : CE QUE LE PROXY ÉCRIT, COMPTE ET TAMPONNE. Chaque mutation est jouée par la sonde du VRAI nginx d'abord (le comportement), puis par test-931 (le texte) ; sans nginx, test-931 seul. ── */
m('P82', 'le bloc 443 écrit de nouveau un journal d\'accès (l\'adresse, la requête entière : conversations, pièces, noms de fichiers)', F.inst, "voir le bloc du port 80.\n    access_log off;\n", "voir le bloc du port 80.\n", ['proxy', '931']);
m('P83', 'les refus de débit reviennent au niveau « error » du journal d\'erreurs (adresse et requête de chaque refusé)', F.inst, "    access_log off;\n    limit_req_log_level warn;\n    limit_conn_log_level warn;\n\n    # ⛔ 64 Ko", "    access_log off;\n    limit_conn_log_level warn;\n\n    # ⛔ 64 Ko", ['proxy', '931']);
m('P84', 'le plafond de débit compte de nouveau par adresse (un client à 2^64 adresses dans son /64 repart à zéro à chaque adresse)', F.inst, 'limit_req_zone \\$opmsg_reseau_$INSTANCE zone=opmsg_$INSTANCE:10m rate=20r/s;', 'limit_req_zone \\$binary_remote_addr zone=opmsg_$INSTANCE:10m rate=20r/s;', ['proxy', '931']);
m('P85', 'la table du réseau ne reconnaît plus les adresses IPv6 complètes (quatre groupes explicites) : chaque adresse a sa clé', F.inst, '    \\"~*^([0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}):\\" \\$1;\n', '', ['proxy', '931']);
m('P86', 'la table du réseau ne reconnaît plus « :: » après deux groupes (2001:db8::5 garde son adresse entière)', F.inst, '    \\"~*^([0-9a-f]{1,4}:[0-9a-f]{1,4})::\\" \\"\\$1:0:0\\";\n', '', ['proxy', '931']);
m('P87', 'le dépôt n\'a plus de plafond GLOBAL de connexions (vingt-quatre réseaux remplissent le disque de nginx, qui est aussi celui d\'OP GESTION)', F.inst, '        limit_conn opmsg_depots_$INSTANCE 24;\n', '', ['proxy', '931']);
m('P88', 'le dépôt compte ses connexions par adresse au lieu du réseau (treize adresses d\'un /64 passent au lieu de douze)', F.inst, 'limit_conn_zone \\$opmsg_reseau_$INSTANCE zone=opmsg_conn_$INSTANCE:10m;', 'limit_conn_zone \\$binary_remote_addr zone=opmsg_conn_$INSTANCE:10m;', ['proxy', '931']);
m('P89', 'la lecture d\'une pièce est de nouveau tamponnée sur le disque de nginx (le tampon ET la limite de fichier temporaire retirés)', F.inst, '        proxy_buffering off;\n        proxy_max_temp_file_size 0;\n', '', ['proxy', '931']);
m('P90', 'le bloc de la lecture d\'une pièce disparaît (la route générale, tamponnée, la sert)', F.inst, /    location \^~ \/api\/pieces\/ \{[^}]*\}\n\n/, '', ['proxy', '931']);
m('P91', 'la limite de fichier temporaire de la lecture est retirée (ceinture et bretelles : le tampon éteint suffit à la sonde, le texte exige les deux)', F.inst, '        proxy_max_temp_file_size 0;\n', '', ['931']);
m('P92', 'la lecture compte ses connexions sur la zone du DÉPÔT (douze lectures en cours refuseraient un dépôt)', F.inst, '        limit_conn opmsg_lec_conn_$INSTANCE 64;\n', '        limit_conn opmsg_conn_$INSTANCE 64;\n', ['931']);

/* ── B1 : UNE IMAGE BOURRÉE DE MORCEAUX VIDES (relecture du gardien) ── */
m('P48', 'le plafond de segments JPEG est retiré (2,9 M de segments vides passent)', F.pz, "    if (++segments > SEGMENTS_JPEG_MAX) throw erreur('type_refuse');\n", '', ['942', '943']);
m('P49', 'le plafond de morceaux PNG est retiré (1 M de morceaux vides passent)', F.pz, "    if (++morceaux > MORCEAUX_MAX) throw erreur('type_refuse');\n", '', ['942']);
m('P50', 'le plafond de blocs WebP est retiré (1,5 M de blocs vides passent)', F.pz, "    if (++blocs > MORCEAUX_MAX) throw erreur('type_refuse');\n", '', ['942']);
m('P51', 'le plafond GLOBAL de mémoire d\'images est retiré (toute image se réserve, quelle que soit la réserve)', F.pz, '    if (memoire + n > memoireImages) return null;\n', '', ['942', '943']);
m('P52', 'la réserve de mémoire pleine n\'est plus dite « dans un instant » (429) : le dépôt échoue en 500', F.rp, /        if \(c === 'occupe'\) \{[^\n]*\n/, '', ['943']);
m('P53', 'la réserve de mémoire n\'est jamais RENDUE après un dépôt (elle se vide de proche en proche)', F.pz, '      } finally { rendre(); }', '      } finally { /* oublié */ }', ['942', '943']);

/* ── LA LISTE BLANCHE DES SEGMENTS JPEG, LE GIF NETTOYÉ (remarque 2 du gardien) ── */
m('P54', 'tout segment APP0 est gardé tel quel (la miniature JFXX et celle du segment JFIF restent)', F.pz, "else if (m === 0xE0 && long >= 16 && b.toString('latin1', i + 2, i + 7) === 'JFIF\\0') {", "else if (m === 0xE0) { o += b.copy(sortie, o, i - 2, i + long); } else if (m === 0xE0 && long >= 16) {", ['942']);
m('P55', 'tout segment APP2 est gardé (FlashPix et index MPF restent, plus seulement le profil ICC)', F.pz, " && long >= 14 && b.toString('latin1', i + 2, i + 14) === 'ICC_PROFILE\\0')", ')', ['942']);
m('P56', 'le segment JFIF est gardé tel quel : sa miniature intégrée reste', F.pz, "else if (m === 0xE0 && long >= 16 && b.toString('latin1', i + 2, i + 7) === 'JFIF\\0') {", "else if (m === 0xE0 && long >= 16 && b.toString('latin1', i + 2, i + 7) === 'JFIF\\0') { o += b.copy(sortie, o, i - 2, i + long); } else if (false) {", ['942']);
m('P57', 'un GIF n\'est plus nettoyé (commentaires et XMP restent)', F.pz, "  if (mime === 'image/gif') return nettoyerGif(b);\n", '', ['942']);
m('P58', 'le segment Adobe (APP14) est retiré avec le reste : un CMYK s\'afficherait à l\'envers', F.pz, " else if (m === 0xEE && long >= 7 && ", " else if (m === 0xEE && false && ", ['942']);
m('P59', 'les commentaires GIF sont gardés', F.pz, 'let garder = etiquette === 0xF9;', 'let garder = etiquette === 0xF9 || etiquette === 0xFE;', ['942']);
m('P60', 'toute extension d\'application GIF est gardée (le XMP aussi)', F.pz, "garder = id === 'NETSCAPE2.0' || id === 'ANIMEXTS1.0';", 'garder = true;', ['942']);

/* ── B2 : LE NOM D'UN FICHIER NE VOYAGE PLUS DANS L'ADRESSE ── */
m('P61', 'l\'ancien paramètre d\'adresse `?nom=` est de nouveau accepté (le nom revient dans les journaux d\'accès)', F.rp, "    if (q.nom !== undefined) return refus(res, 400, 'champ_invalide');\n", '', ['943']);
m('P62', 'l\'en-tête du nom n\'a plus de plafond de longueur', F.rp, "if (typeof brut !== 'string' || !brut || brut.length > 2048)", "if (typeof brut !== 'string' || !brut)", ['943']);
m('P63', 'un nom long est coupé sans garder son extension (« .pdf » disparaît)', F.pz, "return signes.slice(0, signes.length - ext.length).slice(0, max - ext.length).join('') + ext.join('');", 'return signes.slice(0, max).join(\'\');', ['942', '943']);
/* ── A1 : UNE COURSE LECTURE / SUPPRESSION N'EST PAS UNE PIÈCE ABÎMÉE ── */
m('P64', 'une lecture dont le fichier a été emporté avec sa ligne (suppression pendant la lecture) est quand même comptée « illisible »', F.rp, "if (stockage.pieceExiste(p.id)) { ctx.piecesEtat.illisibles++; ctx.journaliser('piece_illisible', { nom: 'fichier_absent' }); }", "{ ctx.piecesEtat.illisibles++; ctx.journaliser('piece_illisible', { nom: 'fichier_absent' }); }", ['943']);
m('P65', 'un fichier qui disparaît PENDANT la lecture parce que la pièce vient d\'être supprimée est compté « illisible »', F.rp, "if (stockage.pieceExiste(p.id)) { ctx.piecesEtat.illisibles++; ctx.journaliser('piece_illisible', { nom: e && e.code }); }", "{ ctx.piecesEtat.illisibles++; ctx.journaliser('piece_illisible', { nom: e && e.code }); }", ['943']);
/* ── REMARQUE 7 : LE DROIT D'UN DÉPOSITAIRE NE SURVIT PAS À SON APPARTENANCE ── */
m('P66', 'celui qui a posé la photo d\'un groupe puis l\'a quitté (ou en a été retiré) la lit toujours', F.stock, "if (r.conv && Q('SELECT 1 AS x FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(r.conv, uid)) return rang();", "if (r.conv && (r.proprio === uid || Q('SELECT 1 AS x FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(r.conv, uid))) return rang();", ['943']);
m('P67', 'une photo de profil déposée il y a plus de 24 h, jamais posée, se lit encore de son dépositaire (le balayeur n\'a pas passé)', F.stock, 'if (r.expire !== null) return r.proprio === uid && r.expire > t ? rang() : null;', 'if (r.expire !== null) return r.proprio === uid ? rang() : null;', ['943']);
m('P68', 'le dépositaire ne lit plus sa photo de profil avant de l\'avoir posée (l\'aperçu de la fenêtre « Photo de profil » casserait)', F.stock, 'if (r.expire !== null) return r.proprio === uid && r.expire > t ? rang() : null;', 'if (r.expire !== null) return null;', ['943']);
/* ── REMARQUE 1 : LA SANDBOX COUVRE TOUT LE PRÉFIXE /api/pieces, REFUS COMPRIS ── */
m('P69', 'les refus de /api/pieces* répondent avec la politique de la page (la sandbox ne couvre plus que la pièce servie)', F.app, "'Content-Security-Policy': /^\\/api\\/pieces/i.test(req.path) ? CSP_PIECE : CSP_PAGE,", "'Content-Security-Policy': CSP_PAGE,", ['943']);
m('P70', 'le motif de la sandbox distingue la casse (/API/PIECES/… échappe à la sandbox alors que le routeur répond)', F.app, "'Content-Security-Policy': /^\\/api\\/pieces/i.test(req.path) ? CSP_PIECE : CSP_PAGE,", "'Content-Security-Policy': /^\\/api\\/pieces/.test(req.path) ? CSP_PIECE : CSP_PAGE,", ['943']);
/* ── REMARQUE 3 : LE PLANCHER DE DISQUE SOUSTRAIT LES DÉPÔTS EN COURS ── */
m('P71', 'le plancher de disque ne regarde que le dépôt qui arrive (seize dépôts qui tiennent chacun vident le disque ensemble)', F.rp, 'if (ctx.disque.libreMo() - (octetsAnnonces + taille) / Mo < config.disqueMinMo)', 'if (ctx.disque.libreMo() - taille / Mo < config.disqueMinMo)', ['943']);
m('P72', 'un dépôt fini ou abandonné ne rend pas ses octets annoncés (le plancher se bouche petit à petit, jusqu\'au redémarrage)', F.rp, 'sorti = true; enCours--; octetsAnnonces -= taille;', 'sorti = true; enCours--;', ['943']);
/* ── A4 : UN ENVOI QUI N'AVANCE PAS NE TIENT PAS UNE PLACE ── */
m('P73', 'la route ne passe plus le débit minimal à `deposer` (un envoi lent tient sa place jusqu\'au délai de Node)', F.rp, 'attendu: taille, debitMin: pc.depotDebitMin, graceMs: pc.depotGraceMs });', 'attendu: taille });', ['943']);
m('P74', 'la grâce n\'est plus un crédit : le débit est exigé depuis le premier octet, un envoi lent mais honnête est coupé', F.pz, 'recus < (ecoule - graceMs) * debitMin / 1000', 'recus < ecoule * debitMin / 1000', ['942', '943']);
m('P75', 'la garde ne compte aucun octet reçu : un envoi qui avance est coupé comme un envoi arrêté', F.pz, 'compter(n) { recus += n; }', 'compter(n) { }', ['942', '943']);
m('P76', '`deposer` n\'arrête plus la minuterie de la garde à la sortie (refusé tôt, réussi) : une minuterie par envoi survit, pour toujours', F.pz, 'try { return await deposerLu({ id, genre, flux, max, attendu, garde }); } finally { if (garde) garde.arreter(); }', 'try { return await deposerLu({ id, genre, flux, max, attendu, garde }); } finally { }', ['942']);
m('P77', 'un envoi coupé répond 500 au lieu de 408 « envoi_trop_lent » (le client ne peut pas dire « envoi trop lent »)', F.rp, "refus(res, 408, 'envoi_trop_lent');", "refus(res, 500, 'envoi_trop_lent');", ['943']);
m('P78', 'un envoi coupé (ou refusé) ne rend pas sa réservation de quota', F.rp, '} finally { place.liberer(); sortir(); }', '} finally { sortir(); }', ['943']);
m('P79', 'un envoi coupé (ou refusé) ne rend pas sa place « par personne » et « en même temps »', F.rp, '} finally { place.liberer(); sortir(); }', '} finally { place.liberer(); }', ['943']);
/* ── A2 : UN LECTEUR LENT NE TIENT PAS UN FICHIER OUVERT ── */
m('P80', 'le service attend sans fin un lecteur dont la connexion reste pleine (le fichier ouvert et la connexion restent pris)', F.rp, "const attente = setTimeout(() => { fini(); couper('attente'); }, pc.lectureAttenteMs);", 'const attente = setTimeout(() => {}, pc.lectureAttenteMs);', ['943']);
m('P81', 'une lecture n\'a pas de durée maximale : un lecteur qui lit un filet tient son fichier pour toujours', F.rp, "const butoir = setTimeout(() => couper('duree'), pc.lectureMaxMs);", 'const butoir = setTimeout(() => {}, pc.lectureMaxMs);', ['943']);
m('K18', 'l\'appareil remet le nom du fichier dans l\'adresse du dépôt', F.api, "rq({ conv: x.conv, genre: x.genre })", "rq({ conv: x.conv, genre: x.genre, nom: x.nom })", ['944']);
m('K19', 'l\'appareil n\'envoie plus le nom du fichier du tout', F.api, "        if (x.nom !== undefined && x.nom !== null) h['X-OPM-Nom'] = encodeURIComponent(String(x.nom));\n", '', ['944']);

/* ── LA PAGE (jouée par la sonde navigateur : lancer avec --sondes) ── */
const G = { sonde: true };
const GS = (sections) => ({ sonde: true, env: { SONDE_SECTIONS: sections, SONDE_ARRET: '1' } });      // ne joue que ces sections de la sonde, et s'arrête au premier échec
m('G01', '« Envoi… » ne se voit plus (le message en cours dit toujours « En attente de connexion… »)', F.page, "m.echec ? null : m.envoi ? 'Envoi…' : 'En attente de connexion…'", "m.echec ? null : 'En attente de connexion…'", ['sonde'], GS('1'));
m('G02', 'le fichier téléchargé perd son nom', F.page, 'a.download = m.fichier.nom;', "a.download = 'fichier';", ['sonde'], GS('2'));
m('G03', 'une photo n\'est plus ramenée à 250 Ko', F.page, 'reduireImage(f, 1600, .82, 250 * 1024, lim.gifMax)', 'reduireImage(f, 1600, .82, undefined, lim.gifMax)', ['857', 'sonde'], GS('1'));
m('G04', 'le refus d\'un réglage reste affiché après la réussite suivante', F.page, 'nette(); reg.occupe = true; reg.confErreur = \'\'; peindreConf();', 'nette(); reg.occupe = true; peindreConf();', ['sonde'], GS('4,5'));
/* ── LA RELECTURE DU TESTEUR, CÔTÉ PAGE (jouée par la sonde : onze photos, GIF, proportions, photo indisponible, pièce refusée, présence, durée du vocal) ── */
m('G05', 'la onzième photo disparaît de nouveau sans un mot (l\'avis des photos écartées n\'est plus posé)', F.page, "    if (dits.length) avis(dits.join(' '));\n", '', ['sonde'], GS('6b'));
m('G06', 'un GIF est de nouveau ramené à une image fixe (le passage tel quel est coupé)', F.page, '    if (gifMax > 0 && await estGif(fichier)) {', '    if (false) {', ['sonde'], GS('6b'));
m('G07', 'un GIF trop lourd devient une image fixe sans le dire', F.page, "      gifTropLourd = true;\n", "      gifTropLourd = false;\n", ['sonde'], GS('6b'));
m('G08', 'une photo seule perd ses proportions (plus de boîte posée : le 200 × 150 recadré revient)', F.page, "    if (!(w > 0 && h > 0)) return '';\n", "    return '';\n", ['sonde'], GS('6b'));
m('G09', 'une photo seule est de nouveau RECADRÉE dans sa boîte (cover : un panorama est coupé)', F.page, '.photos.une .photo img { object-fit: contain; }', '.photos.une .photo img { object-fit: cover; }', ['sonde'], GS('6b'));
m('G10', 'la boîte d\'une photo seule n\'a plus de plancher (une image minuscule devient un point, un panorama une ficelle)', F.page, 'const lg = Math.max(UNE_PLANCHER, Math.round(w * k)), ht = Math.max(UNE_PLANCHER, Math.round(h * k));', 'const lg = Math.round(w * k), ht = Math.round(h * k);', ['sonde'], GS('6b'));
m('G11', 'une photo indisponible redevient une icône sans un mot', F.page, "icone('i-image') + '<span class=\"photo-etat\" aria-hidden=\"true\">Photo indisponible</span></span>';", "icone('i-image') + '</span>';", ['sonde'], GS('6b'));
m('G12', 'la case d\'une photo indisponible perd sa largeur minimale (le texte se casse au milieu d\'un mot dans une case de 72 px)', F.page, 'padding: 6px; min-width: 118px; text-align: center; }', 'padding: 6px; text-align: center; }', ['sonde'], GS('6b'));
m('G13', '« Réessayer » ne fait plus rien', F.page, "if (re) { if (typeof source.reessayer === 'function' && source.reessayer(re.dataset.reessayer)) masquerAvis(); return; }", 'if (re) { return; }', ['sonde'], GS('6b'));
m('G14', '« Annuler » ne fait plus rien', F.page, "if (an) { if (typeof source.abandonner === 'function') source.abandonner(an.dataset.annuler); return; }", 'if (an) { return; }', ['sonde'], GS('6b'));
m('G15', 'une pièce en échec ne montre plus sa phrase ni ses deux boutons (la bulle seule, sans rien)', F.page, "    if (m.attente && m.echec && typeof source.reessayer === 'function') h += echecHtml(m);\n", '', ['sonde'], GS('6b'));
m('G16', 'une pièce en échec porte de nouveau un statut « En attente de connexion… » par-dessus sa phrase', F.page, "(m.attente ? (m.echec ? null : m.envoi ? 'Envoi…' : 'En attente de connexion…')", "(m.attente ? (m.envoi ? 'Envoi…' : 'En attente de connexion…')", ['sonde'], GS('6b'));
m('G17', 'la barre latérale dit « Disponible » même quand MA présence est coupée', F.page, "$('moi-statut-texte').textContent = masquee ? 'Présence masquée' : 'Disponible';", "$('moi-statut-texte').textContent = 'Disponible';", ['sonde'], GS('6b'));
m('G18', 'la durée de la bulle d\'un vocal est arrondie vers le haut (le compteur montrait 0:01, la bulle dit 0:02)', F.page, 'url, dur: msVu / 1000, bars', 'url, dur: Math.ceil(msVu / 1000), bars', ['sonde'], GS('3'));

/* ══ LE LANCEUR ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const DOSSIERS_COPIE = ['server-msg', 'design/opmessages', '.github/scripts', 'apercu/opmessages', 'icons', 'scripts'];
function copier(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copier(s, d); else fs.copyFileSync(s, d);
  }
}
function fabriquerCopie() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-pieces-'));
  for (const d of DOSSIERS_COPIE) copier(path.join(RACINE, d), path.join(dir, d));
  fs.mkdirSync(path.join(dir, 'tests'));
  for (const f of fs.readdirSync(path.join(RACINE, 'tests'))) if (/^(test-9\d\d|outils-[\w-]+|bac-messages|lib-horloge-msg|mode-site|sonde-opmessages-pieces|sonde-proxy-nginx|mutations-opmessages|test-85\d)\.js$/.test(f)) fs.copyFileSync(path.join(RACINE, 'tests', f), path.join(dir, 'tests', f));
  fs.symlinkSync(path.join(RACINE, 'server-msg', 'node_modules'), path.join(dir, 'server-msg', 'node_modules'));
  return dir;
}
function lancer(dir, suite, envPropre) {
  return new Promise((resolve) => {
    const sonde = suite === 'sonde', proxy = suite === 'proxy';
    const f = sonde ? 'sonde-opmessages-pieces.js' : proxy ? 'sonde-proxy-nginx.js' : fs.readdirSync(path.join(dir, 'tests')).find(x => x.startsWith('test-' + suite) && x.endsWith('.js'));
    const env = Object.assign({}, process.env, sonde ? { NODE_PATH: process.env.NODE_PATH || '/opt/node22/lib/node_modules/playwright/node_modules' } : {}, envPropre || {});
    const p = spawn(process.execPath, [path.join(dir, 'tests', f)], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], env });
    let sortie = ''; p.stdout.on('data', d => { sortie += d; }); p.stderr.on('data', d => { sortie += d; });
    const minuteur = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà mort */ } }, DELAI_MS);
    p.on('close', (code) => { clearTimeout(minuteur); const ko = (sortie.match(/(\d+) ✗/g) || []).pop(); resolve({ code, ko: ko ? parseInt(ko, 10) : null, sortie, suite }); });
  });
}
/* applique UNE modification à un texte : exactement une occurrence, et le texte doit changer */
function appliquer(src, a, b) {
  if (a instanceof RegExp) {
    const n = (src.match(new RegExp(a.source, a.flags.includes('g') ? a.flags : a.flags + 'g')) || []).length;
    if (n !== 1) return { erreur: n === 0 ? 'le motif ne se trouve pas' : 'le motif se trouve ' + n + ' fois' };
    const t = src.replace(a, b);
    return t === src ? { erreur: 'le texte n\'a pas changé' } : { texte: t };
  }
  const n = src.split(a).length - 1;
  if (n !== 1) return { erreur: n === 0 ? 'le motif ne se trouve pas' : 'le motif se trouve ' + n + ' fois' };
  const t = src.replace(a, () => b);
  return t === src ? { erreur: 'le texte n\'a pas changé' } : { texte: t };
}
/* ⛔ LES ORIGINAUX SONT FIGÉS AU DÉPART. `muter` relisait le fichier de l'ARBRE à chaque mutation : modifier un fichier du service pendant qu'un lot tournait en arrière-plan faisait jouer les
   dernières mutations sur un texte différent de celui des copies. Les copies sont faites au départ ; les originaux aussi. */
const FIGES = new Map();
function figer(liste) { for (const mut of liste) for (const [fichier] of mut.edits) if (!FIGES.has(fichier)) FIGES.set(fichier, fs.readFileSync(path.join(RACINE, fichier), 'utf8')); }
function muter(racine, mut) {
  const originaux = new Map();
  for (const [fichier, a, b] of mut.edits) {
    const chemin = path.join(racine, fichier);
    const base = originaux.has(fichier) ? fs.readFileSync(chemin, 'utf8') : (FIGES.has(fichier) ? FIGES.get(fichier) : fs.readFileSync(path.join(RACINE, fichier), 'utf8'));
    if (!originaux.has(fichier)) originaux.set(fichier, base);
    const r = appliquer(base, a, b);
    if (r.erreur) return { erreur: r.erreur + ' (' + fichier + ')' };
    fs.writeFileSync(chemin, r.texte);
  }
  return { originaux };
}
function restaurer(dir, originaux) { for (const [fichier, texte] of originaux) fs.writeFileSync(path.join(dir, fichier), texte); }

async function jouer(mut, dir) {
  const { id, nom } = mut;
  /* sans binaire nginx la sonde du proxy ne se joue pas : une mutation qui n'a QU'ELLE est « non jouée » ; une qui a aussi une suite de texte (test-931) se joue sur celle-là, et le dit */
  const sansNginx = !process.env.OPMSG_NGINX, suites = mut.suites.filter(x => x !== 'proxy' || !sansNginx), sondeLaissee = sansNginx && mut.suites.includes('proxy');
  if (!suites.length) return { id, nom, verdict: 'NON JOUÉE', detail: 'il faut un binaire nginx (OPMSG_NGINX=/chemin/nginx) — voir l\'en-tête de tests/sonde-proxy-nginx.js' };
  const r0 = muter(dir, mut);
  if (r0.erreur) return { id, nom, verdict: 'MAL VISÉE', detail: r0.erreur };
  try {
    /* une mutation de la page : la page servie se régénère depuis la page mutée (c'est elle que la sonde sert) */
    if (mut.edits.some(e => e[0] === F.page)) await new Promise((ok) => { const p = spawn(process.execPath, [path.join(dir, 'scripts', 'opmsg-public.js')], { cwd: dir, stdio: 'ignore' }); p.on('close', ok); });
    const verts = [];
    for (const s of suites) {
      const r = await lancer(dir, s, s === 'sonde' ? mut.env : undefined);      // une mutation de la page ne rejoue que les sections qui la gardent, et s'arrête au premier échec
      if (r.code !== 0 || (r.ko !== null && r.ko > 0)) {
        const ligne = (r.sortie.split('\n').find(l => l.includes('✗')) || r.sortie.split('\n').filter(Boolean).slice(-1)[0] || '').trim().slice(0, 150);
        return { id, nom, verdict: 'TOMBE', detail: (s === 'sonde' ? 'la sonde' : s === 'proxy' ? 'la sonde du proxy' : 'test-' + s) + ' (' + (r.ko === null ? 'mort, code ' + r.code : r.ko + ' ✗') + ') — ' + ligne };
      }
      verts.push(s);
    }
    return { id, nom, verdict: 'SURVIT', detail: 'vert : ' + verts.join(', ') + (sondeLaissee ? ' (la sonde du proxy n\'a pas été jouée : pas de nginx)' : '') };
  } finally {
    restaurer(dir, r0.originaux);
    if (mut.edits.some(e => e[0] === F.page)) await new Promise((ok) => { const p = spawn(process.execPath, [path.join(dir, 'scripts', 'opmsg-public.js')], { cwd: dir, stdio: 'ignore' }); p.on('close', ok); });
  }
}

(async () => {
  const args = process.argv.slice(2);
  if (args.includes('--verifier')) {
    let mal = 0;
    for (const mut of MUTATIONS) for (const [fichier, a, b] of mut.edits) {
      const r = appliquer(fs.readFileSync(path.join(RACINE, fichier), 'utf8'), a, b);
      if (r.erreur) { mal++; console.log('  ✗ ' + mut.id + ' · ' + mut.nom + ' → MAL VISÉE · ' + r.erreur + ' (' + fichier + ')'); }
    }
    console.log('\n' + (MUTATIONS.length - mal) + '/' + MUTATIONS.length + ' motifs trouvés exactement une fois');
    process.exit(mal ? 1 : 0);
  }
  const ids = args.filter(x => !x.startsWith('--'));
  /* --garder ID : fabrique UNE copie, y applique la mutation, l'IMPRIME et s'arrête — pour regarder à la main pourquoi une survivante survit (lancer le banc dans la copie, avec sa sortie entière) */
  if (args.includes('--garder')) {
    const mut = MUTATIONS.find(x => x.id === ids[0]);
    if (!mut) { console.log('mutation inconnue : ' + ids[0]); process.exit(2); }
    const dir = fabriquerCopie(), r = muter(dir, mut);
    if (r.erreur) { console.log('mal visée : ' + r.erreur); process.exit(2); }
    console.log(dir); process.exit(0);
  }
  const sondes = args.includes('--sondes');
  const liste = ids.length ? MUTATIONS.filter(x => ids.includes(x.id)) : MUTATIONS.filter(x => !!x.sonde === sondes);
  if (!liste.length) { console.log('aucune mutation à jouer'); process.exit(2); }
  /* les mutations jouées par la sonde ne se lancent pas en parallèle : trois navigateurs et trois services se volent le processeur, et la sonde mesure du temps */
  figer(liste);
  const copies = Array.from({ length: sondes ? 1 : Math.min(NB_COPIES, liste.length) }, fabriquerCopie);
  /* ⛔ LE TÉMOIN. Une suite qui MEURT dans la copie (un fichier que la copie n'emporte pas, un `require` qui échoue) a l'air de « tomber » à chaque mutation, sans rien prouver : pris le 2 octobre 2026
     sur G03, que test-857 « faisait tomber » en mourant de `MODULE_NOT_FOUND` sur sa première ligne. Chaque banc visé tourne donc d'abord, UNE fois, sur une copie INTACTE : s'il n'y est pas vert, rien n'est
     joué et la sortie dit pourquoi. */
  if (!args.includes('--sans-temoin')) {
    const visees = Array.from(new Set(liste.flatMap(x => x.suites))).filter(x => x !== 'proxy' || process.env.OPMSG_NGINX);
    for (const sv of visees) {
      const r = await lancer(copies[0], sv);
      if (r.code !== 0 || (r.ko !== null && r.ko > 0) || r.ko === null) {
        console.log('⛔ le TÉMOIN ' + (sv === 'sonde' ? 'de la sonde' : sv === 'proxy' ? 'de la sonde du proxy' : 'test-' + sv) + ' n\'est pas vert sur une copie INTACTE (code ' + r.code + ') — aucune mutation n\'est jouée.\n' + r.sortie.split('\n').filter(Boolean).slice(-14).join('\n'));
        for (const d of copies) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } }
        process.exit(2);
      }
    }
    console.log('témoins verts sur une copie intacte : ' + visees.map(x => x === 'sonde' ? 'la sonde' : x === 'proxy' ? 'la sonde du proxy' : 'test-' + x).join(', ') + '\n');
  }
  const file = liste.slice(), resultats = [];
  await Promise.all(copies.map(async (dir) => {
    for (;;) {
      const mut = file.shift(); if (!mut) return;
      const r = await jouer(mut, dir);
      resultats.push(r);
      console.log((r.verdict === 'TOMBE' ? '  ✓ ' : r.verdict === 'NON JOUÉE' ? '  – ' : '  ✗ ') + r.id + ' · ' + r.nom + ' → ' + r.verdict + ' · ' + r.detail);
    }
  }));
  for (const d of copies) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } }
  const jouees = resultats.filter(r => r.verdict !== 'NON JOUÉE'), nonJouees = resultats.filter(r => r.verdict === 'NON JOUÉE');
  const tombees = jouees.filter(r => r.verdict === 'TOMBE').length;
  console.log('\n' + tombees + '/' + jouees.length + ' mutations tombent' + (tombees === jouees.length ? '' : ' — LES AUTRES : ' + jouees.filter(r => r.verdict !== 'TOMBE').map(r => r.id + ' (' + r.verdict + ')').join(', ')) + (nonJouees.length ? ' · ' + nonJouees.length + ' NON JOUÉE(S) : ' + nonJouees.map(r => r.id).join(', ') : ''));
  process.exit(tombees === jouees.length ? 0 : 1);
})();
