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
m('P16', 'le plancher d\'espace disque n\'arrête plus un dépôt', F.rp, "if (ctx.disque.libreMo() - taille / Mo < config.disqueMinMo) return refus(res, 503, 'disque_plein');", '', ['943']);
m('P17', 'le plafond d\'envois par heure n\'est plus tenu', F.rp, /(const p = quotas\.essai\('piece:' \+ uid[^\n]*\n\s*)if \(!p\.ok\) \{[^\n]*\}/, '$1', ['943']);
m('P18', 'plus de limite aux envois en même temps', F.rp, 'if (enCours >= pc.simultanes || (parPers.get(uid) || 0) >= pc.parPersonne) return null;', '', ['943']);
m('P19', 'le quota par personne ne compte plus (la réservation accepte tout)', F.pz, 'if (deja + reserve + octetsDemandes > max) return { ok: false, utilise: deja, max };', '', ['942', '943']);
/* ── LE TYPE SE JUGE AUX OCTETS ; CE QUI EST SERVI EN LIGNE EST UNE IMAGE OU UN SON ── */
m('P20', 'un vocal est accepté quels que soient ses octets (le son n\'est plus jugé)', F.pz, "if (genre === 'vocal') { const m = mimeAudio(tete); return m ? { mime: m, famille: 'audio' } : null; }", "if (genre === 'vocal') { return { mime: mimeAudio(tete) || 'audio/webm', famille: 'audio' }; }", ['942', '943']);
m2('P21', 'un fichier est servi selon sa signature : un PNG déposé comme fichier sort en image « en ligne »', [[F.pz, "if (genre === 'fichier') return { mime: 'application/octet-stream', famille: 'fichier' };", "if (genre === 'fichier') return { mime: mimeImage(tete) || 'application/octet-stream', famille: 'fichier' };"],
  [F.pz, "const enLigne = (genre, mime) => genre !== 'fichier' && (", 'const enLigne = (genre, mime) => ('] ], ['942', '943']);
m('P22', 'tout est servi « inline » (plus de pièce jointe pour un fichier)', F.pz, "if (inline) return 'inline';", "return 'inline';", ['942', '943']);
m('P23', 'le nom d\'une pièce jointe n\'est plus assaini dans l\'en-tête (retour à la ligne, guillemets, barres)', F.pz, /\.replace\(\/\[\\u0000-\\u001f[^\]]*\]\/g, '_'\)/, '', ['942', '943']);
m('P24', 'le nom d\'un fichier est rangé tel que le client l\'a donné (ni barres, ni contrôles ôtés à l\'entrée)', F.rp, "nom = Array.from(nettoyerNom(q.nom).replace(/[\\/\\\\]/g, '_')).slice(0, NOM_MAX).join('').trim();", 'nom = String(q.nom).slice(0, NOM_MAX);', ['943']);
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
m('K13', 'le nom d\'un fichier n\'est plus assaini côté appareil (la barre passe)', F.src, ".replace(/[\\/\\\\]/g, '_').trim()).slice(0, 120)", '.trim()).slice(0, 120)', ['944']);
m('K14', 'un message refusé après coup ne libère pas les adresses de ses pièces', F.src, '            lesPieces(p).forEach(x => { if (x.id && cachePieces.has(x.id)) liberer(x.id); else if (x.url) revoquerUrl(x.url); });', '', ['944']);
m('K15', 'un profil qui change n\'est plus relu (l\'événement `personne` est ignoré)', F.src, '      personne: (d) => {\n', '      personne: (d) => {\n        return;\n', ['944']);
m('K16', 'le client n\'écoute plus l\'événement `personne`', F.api, "'presence', 'personne', 'resync'];", "'presence', 'resync'];", ['944']);
m('K17', 'la photo de profil qu\'on vient de choisir est relue du service', F.src, '      poserCache(piece, creerUrl(blob), blob.size);', '', ['944']);

/* ── LE PROXY (jouée par la sonde d'un VRAI nginx : il faut OPMSG_NGINX ; sans lui, « NON JOUÉE ») ── */
m('P47', 'le bloc des pièces du proxy est ramené à 1 Mo (une photo réduite à 250 Ko passe, un fichier de 20 Mo non)', 'server-msg/install-msg.sh', '        client_max_body_size 26m;', '        client_max_body_size 1m;', ['proxy']);

/* ── B1 : UNE IMAGE BOURRÉE DE MORCEAUX VIDES (relecture du gardien) ── */
m('P48', 'le plafond de segments JPEG est retiré (2,9 M de segments vides passent)', F.pz, "    if (++segments > SEGMENTS_JPEG_MAX) throw erreur('type_refuse');\n", '', ['942', '943']);
m('P49', 'le plafond de morceaux PNG est retiré (1 M de morceaux vides passent)', F.pz, "    if (++morceaux > MORCEAUX_MAX) throw erreur('type_refuse');\n", '', ['942']);
m('P50', 'le plafond de blocs WebP est retiré (1,5 M de blocs vides passent)', F.pz, "    if (++blocs > MORCEAUX_MAX) throw erreur('type_refuse');\n", '', ['942']);
m('P51', 'le plafond GLOBAL de mémoire d\'images est retiré (toute image se réserve, quelle que soit la réserve)', F.pz, '    if (memoire + n > memoireImages) return null;\n', '', ['942', '943']);
m('P52', 'la réserve de mémoire pleine n\'est plus dite « dans un instant » (429) : le dépôt échoue en 500', F.rp, /        if \(c === 'occupe'\) \{[^\n]*\n/, '', ['943']);
m('P53', 'la réserve de mémoire n\'est jamais RENDUE après un dépôt (elle se vide de proche en proche)', F.pz, '      } finally { rendre(); }', '      } finally { /* oublié */ }', ['942', '943']);

/* ── LA PAGE (jouée par la sonde navigateur : lancer avec --sondes) ── */
const G = { sonde: true };
m('G01', '« Envoi… » ne se voit plus (le message en cours dit toujours « En attente de connexion… »)', F.page, "(m.envoi ? 'Envoi…' : 'En attente de connexion…')", "'En attente de connexion…'", ['sonde'], G);
m('G02', 'le fichier téléchargé perd son nom', F.page, 'a.download = m.fichier.nom;', "a.download = 'fichier';", ['sonde'], G);
m('G03', 'une photo n\'est plus ramenée à 250 Ko', F.page, 'reduireImage(f, 1600, .82, 250 * 1024)', 'reduireImage(f, 1600, .82)', ['857', 'sonde'], G);
m('G04', 'le refus d\'un réglage reste affiché après la réussite suivante', F.page, 'nette(); reg.occupe = true; reg.confErreur = \'\'; peindreConf();', 'nette(); reg.occupe = true; peindreConf();', ['sonde'], G);

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
function lancer(dir, suite) {
  return new Promise((resolve) => {
    const sonde = suite === 'sonde', proxy = suite === 'proxy';
    const f = sonde ? 'sonde-opmessages-pieces.js' : proxy ? 'sonde-proxy-nginx.js' : fs.readdirSync(path.join(dir, 'tests')).find(x => x.startsWith('test-' + suite) && x.endsWith('.js'));
    const env = Object.assign({}, process.env, sonde ? { NODE_PATH: process.env.NODE_PATH || '/opt/node22/lib/node_modules/playwright/node_modules' } : {});
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
  const { id, nom, suites } = mut;
  if (suites.includes('proxy') && !process.env.OPMSG_NGINX) return { id, nom, verdict: 'NON JOUÉE', detail: 'il faut un binaire nginx (OPMSG_NGINX=/chemin/nginx) — voir l\'en-tête de tests/sonde-proxy-nginx.js' };
  const r0 = muter(dir, mut);
  if (r0.erreur) return { id, nom, verdict: 'MAL VISÉE', detail: r0.erreur };
  try {
    /* une mutation de la page : la page servie se régénère depuis la page mutée (c'est elle que la sonde sert) */
    if (mut.edits.some(e => e[0] === F.page)) await new Promise((ok) => { const p = spawn(process.execPath, [path.join(dir, 'scripts', 'opmsg-public.js')], { cwd: dir, stdio: 'ignore' }); p.on('close', ok); });
    const verts = [];
    for (const s of suites) {
      const r = await lancer(dir, s);
      if (r.code !== 0 || (r.ko !== null && r.ko > 0)) {
        const ligne = (r.sortie.split('\n').find(l => l.includes('✗')) || r.sortie.split('\n').filter(Boolean).slice(-1)[0] || '').trim().slice(0, 150);
        return { id, nom, verdict: 'TOMBE', detail: (s === 'sonde' ? 'la sonde' : 'test-' + s) + ' (' + (r.ko === null ? 'mort, code ' + r.code : r.ko + ' ✗') + ') — ' + ligne };
      }
      verts.push(s);
    }
    return { id, nom, verdict: 'SURVIT', detail: 'vert : ' + verts.join(', ') };
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
