/* ══ LES MUTATIONS DU PUSH, DE L'EXPORT ET DE LA SUPPRESSION — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » (CLAUDE.md) ═════════════
   Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il remet, UN PAR UN, les défauts que `tests/test-955`, `956`, `957`, `958`,
   `941`, `905` et la sonde navigateur `sonde-opmessages-push.js` gardent — une liste blanche de services push retirée, jugée par « contient », ouvrant le http ou suivant
   une redirection ; un aperçu qui part sans que la personne l'ait demandé ; une sourdine, un auteur, un membre parti qui reçoivent encore ; un acquittement trop large ou trop
   vieux ; la clé privée VAPID en clair ; l'abonnement d'une autre personne qu'on peut retirer ; un 410 qui ne retire rien ; une suppression qui laisse une session, un jeton, un
   abonnement, un lien d'invitation, un numéro ; un export sans quota, qui ne rend pas son créneau, qui montre ce que la personne ne voit pas ; un service worker qui ouvre une
   adresse d'ailleurs ; une politique de page sans `manifest-src`… — dans une COPIE de l'arbre (jamais dans l'arbre lui-même : le `git checkout` d'après-mutation de CLAUDE.md
   efface aussi les correctifs non commités), joue les bancs visés, et exige qu'AU MOINS UN tombe (code de sortie non nul ou un « ✗ »).

   ⛔ UNE MUTATION DONT LE MOTIF NE TROUVE RIEN EST MAL VISÉE, et le lanceur le DIT au lieu de conclure : il vérifie que le motif se trouve EXACTEMENT UNE fois
   (`s.replace(motif, autre, 1)` frappe la PREMIÈRE occurrence du fichier, pas celle qu'on croit — pris le 22 septembre 2026), que le texte a changé, ET que le fichier
   muté se lit encore (`node --check`) : une suite qui MEURT sur une faute de syntaxe de la mutation a l'air de « tomber » et ne prouve rien.
   ⛔ UNE MUTATION QUI SURVIT n'est pas forcément un banc aveugle : une autre garde peut la neutraliser. Ce service juge plusieurs règles DEUX FOIS — à l'envoi et au moment de
   partir (la sourdine, le membre parti), à la demande et au balayeur (la session coupée, le jeton d'appareil refusé) — et retirer UNE des deux gardes ne change rien de visible.
   Ces mutations-là sont marquées `equivalente` : on les joue quand même, et ELLES DOIVENT SURVIVRE (« ≡ ») — c'est la preuve que la garde restante tient seule. Le défaut
   RÉEL s'écrit alors avec LES DEUX retirées (R05, R07, D02). Si une « équivalente » TOMBE, la raison donnée est fausse : le lanceur le crie.
   ⛔ LA COPIE EST FABRIQUÉE DEPUIS L'ARBRE COMMITÉ OU NON : lancer ce fichier APRÈS `git commit` du correctif, jamais avant.

   Lancer :  TMPDIR=/un/dossier node tests/mutations-push.js                 (toutes, hors sondes navigateur)
             NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/mutations-push.js --sondes     (les mutations jouées par la sonde navigateur)
             node tests/mutations-push.js L01 R05                              (seulement celles-là)
             node tests/mutations-push.js --verifier                           (ne joue rien : chaque motif se trouve UNE fois dans l'arbre, chaque banc existe)
             node tests/mutations-push.js --liste                              (le catalogue)
             --copies=N (défaut 2)   --garder ID (fabrique UNE copie mutée, l'imprime et s'arrête)   --sans-temoin   --details=FICHIER (tous les ✗ de chaque mutation qui tombe)
   Deux copies en parallèle, un délai par banc. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn, spawnSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const DELAI_MS = 300000;
const F = {
  push: 'server-msg/push.js', rpush: 'server-msg/routes-push.js', compte: 'server-msg/compte.js', stock: 'server-msg/stockage.js', routes: 'server-msg/routes.js',
  tel: 'server-msg/telephone.js', index: 'server-msg/index.js', conf: 'server-msg/config.js', app: 'server-msg/app.js', man: 'server-msg/manifeste.js',
  src: 'server-msg/public/source-serveur.js', api: 'server-msg/public/api.js', sw: 'server-msg/public/sw.js', man_pwa: 'server-msg/public/manifest.webmanifest',
  gen: 'scripts/opmsg-public.js', page: 'apercu/opmessages/index.html',
};
const BANCS = ['905', '941', '955', '956', '957', '958', 'sonde'];
const MUTATIONS = [];
/* m(id, nom, fichier, ancien, nouveau, suites) — `ancien` : une chaîne, ou une expression régulière (une seule occurrence, `$1` permis dans `nouveau`) */
const m = (id, nom, fichier, ancien, nouveau, suites, o) => MUTATIONS.push(Object.assign({ id, nom, edits: [[fichier, ancien, nouveau]], suites }, o || {}));
const m2 = (id, nom, edits, suites, o) => MUTATIONS.push(Object.assign({ id, nom, edits, suites }, o || {}));
const EQ = (raison) => ({ equivalente: raison });
const SONDE = { sonde: true };

/* ══ 1. LA LISTE BLANCHE DES SERVICES PUSH — un point d'accès est une adresse que le service APPELLE à la demande d'un inconnu (SSRF) ═══════════════════════ */
m('L01', 'la liste blanche des services push est retirée : n\'importe quel hôte en https est appelé', F.push, "if (!hoteAutorise(u.hostname)) return non('hote');", '', ['955', '956']);
m('L02', 'un suffixe est jugé par « contient » : push.apple.com.evil.fr et evilpush.apple.com passent', F.push,
  "if (h.length > suf.length && h.endsWith(suf) && h.slice(0, -suf.length).split('.').every(l => ETIQUETTE.test(l))) return true;", 'if (h.includes(suf.slice(1))) return true;', ['955']);
m('L03', 'un hôte exact est jugé par « contient » : fcm.googleapis.com.evil.fr et x.fcm.googleapis.com passent', F.push, 'if (HOTES_EXACTS.includes(h)) return true;', 'if (HOTES_EXACTS.some(x => h.includes(x))) return true;', ['955']);
m('L04', 'les étiquettes devant un suffixe ne sont plus validées (« -x.push.apple.com » passe)', F.push, " && h.slice(0, -suf.length).split('.').every(l => ETIQUETTE.test(l))", '', ['955']);
m2('L05', 'le http est accepté (le schéma n\'est plus exigé, et la forme canonique se juge avec le schéma reçu)', [[F.push, "if (u.protocol !== 'https:') return non('schema');", ''], [F.push, "if (!canon('https:')) return non('forme');", 'if (!canon(u.protocol)) return non(\'forme\');']], ['955', '956']);
m('L06', 'un port explicite est accepté (https://fcm.googleapis.com:8443/…)', F.push, "if (u.port !== '') return non('port');", '', ['955']);
m2('L07', 'des identifiants dans l\'adresse sont acceptés (https://user:mdp@fcm.googleapis.com/… — ni refus ni forme canonique pour les arrêter)', [[F.push, "if (u.username || u.password) return non('identifiants');", ''], [F.push, "if (!canon('https:')) return non('forme');", '']], ['955']);
m('L08', 'la forme canonique n\'est plus exigée (majuscules, port 443 écrit, point final : on appelle autre chose que ce qu\'on a contrôlé)', F.push, "if (!canon('https:')) return non('forme');", '', ['955']);
m('L09', 'la liste blanche n\'est plus re-vérifiée à l\'ENVOI : une ligne ancienne vers un hôte refusé depuis est appelée', F.push, 'const a = analyserEndpoint(abo.endpoint, pc.testHote);', 'const a = { ok: true, url: new URL(abo.endpoint) };', ['955', '956']);
m('L10', 'le transport SUIT une redirection (un service push compromis renvoie vers 127.0.0.1:8080)', F.push, 'let lus = 0;',
  "if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { try { const s = http.request(res.headers.location, { method: 'POST' }, (r2) => fin({ statut: r2.statusCode })); s.on('error', () => fin({ statut: 0, erreur: 'reseau' })); s.end(); } catch (e) { fin({ statut: 0 }); } return; }\n        let lus = 0;", ['955', '956']);
m('L11', 'un nom admis qui se résout en adresse PRIVÉE est appelé (le nom n\'est plus jugé qu\'à sa forme)', F.push, "if (liste.some(adressePrivee)) return cb(Object.assign(new Error('adresse_privee'), { code: 'ADRESSE_PRIVEE' }));", '', ['955']);
m('L12', 'une IPv4 « mappée » en IPv6 (::ffff:127.0.0.1) n\'est plus reconnue comme privée', F.push,
  'if (o.slice(0, 10).every(x => x === 0) && ((o[10] === 0xff && o[11] === 0xff) || (o[10] === 0 && o[11] === 0))) return privee4(o[12], o[13], o[14]);', 'if (false) return false;', ['955']);
m('L13', 'la borne haute de 172.16/12 est ratée d\'un cran (172.31.255.255 n\'est plus privée)', F.push, '(a === 172 && b >= 16 && b <= 31)', '(a === 172 && b >= 16 && b <= 30)', ['955']);
m('L14', 'la borne de la multidiffusion est mal écrite : 142.250.x (Google) devient « privée » et TOUS les envois vers FCM se taisent', F.push, 'a === 127 || a >= 224', 'a === 127 || a >= 24', ['955']);
m('L15', 'la porte de banc du service push est acceptée en PRODUCTION (une variable oubliée dans une unité systemd en ferait un client HTTP local)', F.conf,
  "if (porte && instance !== 'beta') throw err('OPMSG_TEST_PUSH (porte de test du service push) est refusée en production');", '', ['956']);
m('L16', 'la porte de banc accepte n\'importe quel hôte (plus seulement 127.0.0.1:<port>)', F.conf, String.raw`if (porte && !/^127\.0\.0\.1:\d{2,5}$/.test(porte)) throw err('OPMSG_TEST_PUSH doit valoir 127.0.0.1:<port>');`, '', ['956']);
m('L17', 'une clé VAPID privée qui n\'est pas celle de la publique est acceptée au démarrage (tous les envois seraient refusés, sans une ligne d\'erreur)', F.conf,
  String.raw`if (!derivee || !derivee.equals(bp)) throw err('la clé VAPID privée n\'est pas celle de la publique');`, '', ['956']);

/* ══ 2. QUI REÇOIT QUOI, ET QUAND — la charge minimale, l'aperçu seulement voulu, jamais l'auteur, jamais une conversation coupée ═══════════════════════════ */
m('R01', 'l\'aperçu part sans que la personne l\'ait activé (le nom et le texte sur l\'écran verrouillé)', F.push, 'const apercu = !!(moi && moi.prefs && moi.prefs.apercu_notif === true) && charge.detail;', 'const apercu = charge.detail;', ['955', '956']);
m('R02', 'l\'aperçu est activé PAR DÉFAUT (un réglage jamais touché compte comme « oui »)', F.push, 'moi.prefs.apercu_notif === true) && charge.detail;', 'moi.prefs.apercu_notif !== false) && charge.detail;', ['955', '956']);
m('R03', 'la charge de base d\'un message porte son texte (la notification minimale n\'est plus « Nouveau message »)', F.push, "renotify: true, titre: 'OP MESSAGES', corps: 'Nouveau message',", "renotify: true, titre: 'OP MESSAGES', corps: resume,", ['955', '956']);
m('R04', 'l\'auteur d\'un message reçoit la notification de son propre message', F.stock, 'm.quitte_le IS NULL AND m.uid <> ? AND m.muet_jusqua <= ?', 'm.quitte_le IS NULL AND ? IS NOT NULL AND m.muet_jusqua <= ?', ['956']);
m2('R05', 'une conversation en sourdine notifie quand même (ni le tri des destinataires, ni le jugement au moment de partir ne regardent la sourdine)',
  [[F.stock, 'AND m.muet_jusqua <= ? AND m.depuis_seq <= ? ORDER BY m.uid', 'AND ? IS NOT NULL AND m.depuis_seq <= ? ORDER BY m.uid'], [F.stock, 'if (!m || m.muet_jusqua > horloge() || seq < m.depuis_seq) return false;', 'if (!m || seq < m.depuis_seq) return false;']], ['956']);
m('R06', 'une sourdine posée PENDANT l\'attente de l\'acquittement n\'est pas re-jugée au moment de partir', F.stock, 'if (!m || m.muet_jusqua > horloge() || seq < m.depuis_seq) return false;', 'if (!m || seq < m.depuis_seq) return false;', ['955', '956']);
m2('R07', 'un membre qui a QUITTÉ la conversation reçoit encore ses messages (ni le tri des destinataires, ni le jugement au moment de partir ne regardent s\'il est parti)',
  [[F.stock, 'WHERE m.conv = ? AND m.quitte_le IS NULL AND m.uid <> ?', 'WHERE m.conv = ? AND m.uid <> ?'],
    [F.stock, "const m = Q('SELECT depuis_seq, muet_jusqua FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);", "const m = Q('SELECT depuis_seq, muet_jusqua FROM membre WHERE conv = ? AND uid = ?').get(conv, uid);"]], ['955', '956']);
m('R08', 'plus aucun jugement au moment de partir (sourdine, conversation quittée, message supprimé « pour tous » pendant l\'attente)', F.push,
  "if (typeof charge.valide === 'function') { let v = false; try { v = !!charge.valide(); } catch (e) { v = false; } if (!v) return { envoyes: 0, appareils: 0, raison: 'plus_valable' }; }", '', ['955', '956']);
m('R09', 'un message supprimé « pour tous » PENDANT l\'attente part quand même (le texte supprimé arriverait sur l\'écran verrouillé)', F.stock,
  'return !!x && !x.supprime_le && (x.expire_ts === null || x.expire_ts > horloge());', 'return !!x && (x.expire_ts === null || x.expire_ts > horloge());', ['955', '956']);
m('R10', 'sourdine filtrée par le tri des destinataires SEUL (le jugement au moment de partir la regarde aussi)', F.stock, 'AND m.muet_jusqua <= ? AND m.depuis_seq <= ? ORDER BY m.uid', 'AND ? IS NOT NULL AND m.depuis_seq <= ? ORDER BY m.uid', ['956'],
  EQ('le jugement au moment de partir (`pushMessageEncore`) refuse déjà une conversation en sourdine'));
m('R11', 'membre parti filtré par le tri des destinataires SEUL (le jugement au moment de partir le regarde aussi)', F.stock, 'WHERE m.conv = ? AND m.quitte_le IS NULL AND m.uid <> ?', 'WHERE m.conv = ? AND m.uid <> ?', ['956'],
  EQ('le jugement au moment de partir (`pushMessageEncore`) ne trouve plus la ligne d\'un membre parti'));

/* ── CE QUI POUSSE : un message, un ajout à un groupe, un nouveau contact, un nouvel appareil — et la charge MINIMALE de chacun ── */
m('R12', 'un message n\'envoie plus aucune notification', F.routes,
  "if (ctx.push) ctx.push.message({ conv: conv.id, seq: r.seq, gid: r.gid, auteur: req.moi.id, nomAuteur: nomAffiche(req.moi), nomConv: conv.nom, groupe: conv.type !== 'direct', type, texte });", '', ['956']);
m('R13', 'un ajout à un groupe n\'envoie plus de notification', F.routes, 'if (c) ctx.push.pousser(uid, c, { gid: n.gid });', '', ['956']);
m('R14', 'un nouveau contact n\'envoie plus de notification', F.tel,
  "if (ctx.push) ctx.push.pousser(id, { type: 'contact', tag: 'contact', url: '/', titre: 'OP MESSAGES', corps: 'Nouveau contact', detail: { titre: 'Nouveau contact', corps: texteN } }, { gid: n.gid });", '', ['956']);
m('R15', '« Nouvel appareil connecté » ne prévient plus les AUTRES appareils (la sécurité ne passe plus par le push)', F.tel,
  "if (ctx.push) ctx.push.pousser(p.id, { type: 'appareil', tag: 'appareil', url: '/', renotify: true, titre: 'Nouvel appareil connecté', corps: 'Si ce n\\'est pas vous, déconnectez les autres appareils.' }, { gid: n.gid });", '', ['956', '957']);
m('R16', 'la charge d\'un nouveau contact porte son nom (sans que l\'aperçu soit activé)', F.tel, "corps: 'Nouveau contact', detail:", 'corps: texteN, detail:', ['956']);
m('R17', 'la charge d\'un ajout à un groupe porte le nom du groupe et de celui qui l\'a ajouté (sans que l\'aperçu soit activé)', F.routes, "titre: 'OP MESSAGES', corps: 'Vous avez été ajouté à un groupe', detail:", "titre: 'OP MESSAGES', corps: texte, detail:", ['956']);

/* ══ 3. L'ACQUITTEMENT — une notification ne double pas une page sous les yeux, et ne la remplace jamais quand la page est cachée ═══════════════════════════ */
m('A01', 'n\'importe quel acquittement couvre n\'importe quel événement (un vieil accusé étouffe la notification d\'un message récent)', F.push, 'return !!e && e.gid >= gid; };', 'return !!e; };', ['955', '956']);
m('A02', 'un acquittement plus ANCIEN remplace un plus récent (la page recule)', F.push, 'acquittes.set(uid, { gid: e ? Math.max(e.gid, gid) : gid, t: horloge() });', 'acquittes.set(uid, { gid, t: horloge() });', ['955']);
m('A03', 'une page qui a acquitté ne retient plus la notification : elle part quand même, doublon', F.push, "if (acquitte(uid, a.gid)) { ok({ envoyes: 0, raison: 'acquittee' }); return; }", '', ['955', '956']);
m('A04', 'un acquittement n\'est plus borné par le journal (une page qui se trompe étouffe TOUTES les notifications à venir)', F.rpush, 'push.acquitter(req.moi.id, Math.min(g, stockage.journalMax()));', 'push.acquitter(req.moi.id, g);', ['956']);
m('A05', 'sans flux ouvert la notification attend quand même l\'acquittement (cinq secondes de retard pour une personne qui n\'a aucune page ouverte)', F.push,
  'if (charge.immediat === true || ouverts === 0) return partir(uid, charge)', 'if (charge.immediat === true) return partir(uid, charge)', ['955', '956']);
m('A06', 'un flux ouvert ne retient plus rien : la notification part toujours tout de suite (doublon avec la page visible)', F.push,
  'if (charge.immediat === true || ouverts === 0) return partir(uid, charge)', 'if (true) return partir(uid, charge)', ['955', '956']);
m('A07', 'plusieurs messages d\'une conversation pendant l\'attente font plusieurs notifications (la mémoire d\'attente est perdue)', F.push,
  'if (deja) { deja.gid = Math.max(deja.gid, gid); deja.charge = charge; return deja.promesse; }', '', ['955']);
m('A08', 'une notification sans identifiant d\'événement est tenue pour déjà acquittée (elle ne partira jamais)', F.push, 'const gid = Number.isInteger(o.gid) ? o.gid : Infinity;', 'const gid = Number.isInteger(o.gid) ? o.gid : 0;', ['955']);

/* ══ 4. LA PAIRE VAPID — propre à l'instance, privée SCELLÉE, jamais changée (un abonnement est lié à la clé publique qui l'a créé) ═════════════════════════ */
m2('V01', 'la clé privée VAPID est rangée en CLAIR dans la base (plus scellée)',
  [[F.stock, "metaPoser('vapid_priv_ch', sceller('meta', 'vapid_priv', 'vapid', privee).toString('base64'));", "metaPoser('vapid_priv_ch', Buffer.from(privee, 'utf8').toString('base64'));"],
    [F.stock, "try { privee = ouvrirS('meta', 'vapid_priv', 'vapid', Buffer.from(ch, 'base64')); } catch (e) { throw erreur('vapid_illisible'); }", "try { privee = Buffer.from(ch, 'base64').toString('utf8'); } catch (e) { throw erreur('vapid_illisible'); }"]], ['955']);
m2('V02', 'la première paire VAPID ne gagne plus : une paire neuve est fabriquée à chaque démarrage (tous les abonnements existants seraient refusés)',
  [[F.push, 'let paire = stockage.pushVapidLire();', 'let paire = null;'], [F.stock, 'const deja = pushVapidLire();\n      if (deja) return deja;', 'const deja = null;']], ['955', '956']);

/* ══ 5. LES ABONNEMENTS — un appareil, une personne ; ce qui part avec l'accès ; ce que le service push dit ═══════════════════════════════════════════════════ */
m('S01', 'on peut retirer l\'abonnement D\'UNE AUTRE personne (le propriétaire n\'est plus vérifié)', F.stock, "'DELETE FROM push WHERE endpoint_h = ? AND uid = ?'", "'DELETE FROM push WHERE endpoint_h = ? AND ? IS NOT NULL'", ['956']);
m('S02', 'un 404 du service push ne retire plus l\'abonnement (seul le 410 le fait)', F.push, 'if (r.statut === 404 || r.statut === 410) {', 'if (r.statut === 410) {', ['955', '956']);
m('S03', 'un 410 du service push ne retire plus l\'abonnement (l\'appareil disparu est réessayé indéfiniment)', F.push, 'if (r.statut === 404 || r.statut === 410) {', 'if (r.statut === 404) {', ['955', '956']);
m('S04', 'les échecs ne se comptent jamais : un service push qui ne répond plus garde l\'abonnement pour toujours', F.push,
  "    compter('echecs');\n    return { ok: false, retire: stockage.pushEchec(abo.id, pc.echecsMax).retire };", "    compter('echecs');\n    return { ok: false, retire: false };", ['955']);
m('S05', 'un envoi réussi ne remet pas le compteur d\'échecs à zéro (cinq échecs ESPACÉS retirent un appareil qui marche)', F.push, "stockage.pushOk(abo.id); compter('envoyes');", "compter('envoyes');", ['955']);
m('S06', 'un seul échec retire l\'abonnement (le seuil de cinq de suite est perdu)', F.stock, 'if (r.echecs + 1 >= max) {', 'if (true) {', ['955', '956']);
m('S07', 'le plafond de dix appareils par personne n\'est plus tenu', F.stock,
  "const retires = num(Q('DELETE FROM push WHERE uid = ? AND id NOT IN (SELECT id FROM push WHERE uid = ? ORDER BY cree DESC, id DESC LIMIT ?)').run(uid, uid, max).changes);", 'const retires = 0;', ['955', '956']);
m('S08', 'un appareil ne suit plus son dernier utilisateur : un point d\'accès déjà inscrit pour quelqu\'un d\'autre lui reste (les notifications de l\'ancien propriétaire arrivent sur le téléphone du nouveau)',
  F.stock, 'ON CONFLICT(endpoint_h) DO UPDATE SET uid = excluded.uid, endpoint_ch', 'ON CONFLICT(endpoint_h) DO UPDATE SET endpoint_ch', ['955', '956']);
m2('S09', 'le point d\'accès d\'un appareil est rangé en CLAIR dans la base (plus scellé)',
  [[F.stock, "sceller('push', 'endpoint_ch', aadPush(h, uid, 'endpoint'), endpoint)", "Buffer.from(endpoint, 'utf8')"],
    [F.stock, "const endpoint = ouvrirOuNull('push', 'endpoint_ch', aadPush(r.endpoint_h, uid, 'endpoint'), r.endpoint_ch);", "const endpoint = Buffer.from(r.endpoint_ch).toString('utf8');"]], ['955']);
m('S10', 'se déconnecter laisse l\'abonnement de CET appareil (un navigateur déconnecté recevrait encore « Nouveau message »)', F.routes,
  "if (ctx.push && typeof e === 'string' && e.length > 0 && e.length <= 2048) { try { ctx.push.desabonner(req.moi.id, e); } catch (x) { /* la déconnexion ne dépend pas d'une notification */ } }", '', ['956']);
m('S11', '« Déconnecter les autres appareils » ne retire AUCUN abonnement (un téléphone perdu, session coupée, reçoit encore)', F.tel,
  "const notifications = stockage.pushRetirerAutres(req.moi.id, typeof b.endpoint === 'string' ? b.endpoint : null);", 'const notifications = 0;', ['956']);
m('S12', '« Déconnecter les autres appareils » retire AUSSI l\'abonnement de l\'appareil d\'où l\'on le demande', F.stock, "if (typeof garder === 'string' && garder.length > 0 && garder.length <= 2048) return", 'if (false) return', ['956']);
m('S13', 'un accès bêta coupé dans la Tour garde ses abonnements (la personne reçoit encore « Nouveau message » sur son téléphone)', F.index, 'stockage.pushSupprimerPersonne(id); hub.fermerPersonne(id);', 'hub.fermerPersonne(id);', ['956']);
m('S14', 'la notification d\'essai n\'est plus plafonnée à trois par heure', F.rpush, "if (!plafond(res, 'push_essai', req.moi.id, { max: 3, fenetreMs: 3600000 })) return;", '', ['956']);
m('S15', 'l\'inscription d\'un appareil n\'est plus plafonnée par heure', F.rpush, "if (!plafond(res, 'push_abonner', req.moi.id, { max: 60, fenetreMs: 3600000 })) return;", '', ['956']);
m('S16', 'la route d\'inscription d\'un appareil devient publique (plus de garde de session)', F.man, /(id: 'push\.abonner',\s+m: 'POST', p: '\/api\/push\/abonner',\s+garde: ')S(')/, '$1P$2', ['905', '956']);

/* ══ 6. SUPPRIMER SON COMPTE — tout ce qui connecte la personne est coupé à l'instant ; se reconnecter annule ; l'effacement laisse une ligne VIDE ═════════════ */
m('D01', 'la suppression ne coupe pas les sessions (la personne reste connectée pendant les quatorze jours)', F.stock, "const sessions = num(Q('DELETE FROM session WHERE personne = ?').run(uid).changes);", 'const sessions = 0;', ['957']);
m2('D02', 'un jeton d\'appareil suffit à se reconnecter SANS code après la demande de suppression (le jeton n\'est pas coupé, et ni la reconnexion automatique ni la route des appareils ne le refusent)',
  [[F.stock, "const appareils = num(Q('DELETE FROM appareil_tel WHERE personne = ?').run(uid).changes);", 'const appareils = 0;'],
    [F.tel, "if (ap && p && p.id === ap.personne && p.etat === 'actif' && p.suppression_le === null) {", "if (ap && p && p.id === ap.personne && p.etat === 'actif') {"],
    [F.tel, "if (!p || p.etat !== 'actif' || stockage.suppressionLe(p.id) !== null) return refus(res, 401, 'appareil_inconnu');", "if (!p || p.etat !== 'actif') return refus(res, 401, 'appareil_inconnu');"]], ['957']);
m('D03', 'la suppression ne coupe pas les abonnements push (le compte « en sursis » reçoit encore ses notifications)', F.stock, "const push = num(Q('DELETE FROM push WHERE uid = ?').run(uid).changes);", 'const push = 0;', ['957']);
m('D04', 'les liens d\'invitation d\'une personne qui s\'en va restent valables (ils ramènent des inconnus vers un compte condamné)', F.stock, "Q('UPDATE lien SET revoque = 1 WHERE par = ? AND revoque = 0').run(uid);", '', ['957']);
m('D05', 'se reconnecter par la porte bêta n\'annule pas la suppression', F.routes, 'const annulee = stockage.suppressionAnnuler(r.personne.id);', 'const annulee = false;', ['957']);
m('D06', 'se reconnecter avec le code reçu par SMS n\'annule pas la suppression', F.tel, 'const annulee = !nouveau && p.suppression_le !== null && stockage.suppressionAnnuler(p.id);', 'const annulee = false;', ['957']);
m('D07', 'l\'effacement ne libère pas le numéro (le numéro reste attaché à la ligne vide : il ne peut plus s\'inscrire)', F.stock, 'UPDATE personne SET email_h = NULL, email_ch = NULL, verifie_le = NULL,', 'UPDATE personne SET email_ch = NULL, verifie_le = NULL,', ['957']);
m('D08', 'l\'effacement laisse le prénom et le nom', F.stock, "prenom = '', nom = '', avatar_piece = NULL, statut = '',", "avatar_piece = NULL, statut = '',", ['957']);
m('D09', 'l\'effacement emporte AUSSI les messages que la personne a envoyés, chez les autres (leur historique serait troué)', F.stock,
  "Q('DELETE FROM notification WHERE uid = ?').run(uid);", "Q('DELETE FROM notification WHERE uid = ?').run(uid);\n      Q('UPDATE message SET supprime_le = ?, corps_ch = NULL, meta_ch = NULL WHERE auteur = ?').run(horloge(), uid);", ['957']);
m('D10', 'les photos déposées mais jamais envoyées restent après l\'effacement', F.stock, "for (const r of Q('SELECT id FROM piece WHERE proprio = ? AND expire IS NOT NULL').all(uid)) pieces.push(...pieceEffacerLigne(r.id));", '', ['957'],
  EQ('une pièce jamais envoyée expire au bout de 24 h et le balayeur des orphelines l\'emporte : à J+14 il n\'en reste aucune (la ligne du code est une ceinture, pas une bretelle)'));
m('D11', 'la photo de profil reste après l\'effacement', F.stock, 'if (p.avatar_piece) pieces.push(...pieceEffacerLigne(p.avatar_piece));', '', ['957']);
m('D12', 'le balayeur efface les lignes mais laisse les FICHIERS (photos, vocaux) d\'un compte effacé sur le disque', F.index, 'effacerPieces(e.pieces);', '', ['957']);
m('D13', 'on peut écrire à un compte supprimé (le message part dans le vide, sans que l\'expéditeur le sache)', F.routes, "if (conv.type === 'direct' && stockage.autreSupprime(conv.id, req.moi.id)) return refus(res, 410, 'compte_supprime');", '', ['957', '958']);
m('D14', 'un compte dont la suppression est programmée reste TROUVABLE par numéro', F.tel, "p.etat === 'actif' && p.suppression_le === null && p.id !== uid && p.trouvable === 'tous'", "p.etat === 'actif' && p.id !== uid && p.trouvable === 'tous'", ['957']);
m('D15', 'un compte dont la suppression est programmée peut être AJOUTÉ comme contact depuis une recherche faite avant', F.tel, 'stockage.contactBloque(uid, id) || stockage.suppressionLe(id) !== null) {', 'stockage.contactBloque(uid, id)) {', ['957']);
m('D16', 'la confirmation (le mot SUPPRIMER) devient facultative : une requête isolée supprime un compte', F.compte, "if (corps(req).confirmation !== 'SUPPRIMER') return refus(res, 400, 'confirmation_requise');", '', ['957']);
m('D17', 'la suppression ne ferme pas les flux ouverts : la personne continue de recevoir ses messages pendant le sursis', F.compte, 'hub.fermerPersonne(req.moi.id);', '', ['957']);
m('D18', 'un disque plein retient la suppression du compte (le plancher d\'espace disque refuse aussi ce geste)', F.app, String.raw`compte\/(deconnexion|supprimer)|flux\/ack`, String.raw`compte\/(deconnexion)|flux\/ack`, ['957']);
m('D19', 'la route de suppression devient publique (plus de garde de session)', F.man, /(id: 'compte\.supprimer',\s+m: 'POST', p: '\/api\/compte\/supprimer',\s+garde: ')S(')/, '$1P$2', ['905', '957']);
m('D20', 'l\'effacement n\'écrit pas la ligne de purge (une sauvegarde restaurée ressusciterait le compte effacé)', F.stock, "Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(uid, 'compte', horloge());", '', ['957']);
/* ⛔ D21, D22, D23 : la RAISON d'équivalence que j'avais écrite était fausse — le banc joue chaque couche À PART (il remet le jeton en base à la main, puis demande à chaque route), et il compte les jetons restants. Mesuré : elles tombent. */
m('D21', 'le jeton d\'appareil reste en base APRÈS la demande de suppression (les deux refus qui suivent tiennent seuls)', F.stock, "const appareils = num(Q('DELETE FROM appareil_tel WHERE personne = ?').run(uid).changes);", 'const appareils = 0;', ['957']);
m('D22', 'la route des appareils reconnaît un compte dont la suppression est programmée (le jeton est coupé, la reconnexion automatique refuse)', F.tel,
  "if (!p || p.etat !== 'actif' || stockage.suppressionLe(p.id) !== null) return refus(res, 401, 'appareil_inconnu');", "if (!p || p.etat !== 'actif') return refus(res, 401, 'appareil_inconnu');", ['957']);
m('D23', 'la reconnexion automatique reconnaît un compte dont la suppression est programmée (le jeton est coupé, la route des appareils refuse)', F.tel,
  "if (ap && p && p.id === ap.personne && p.etat === 'actif' && p.suppression_le === null) {", "if (ap && p && p.id === ap.personne && p.etat === 'actif') {", ['957']);

m('D24', 'la liste des conversations ne marque plus l\'autre d\'une conversation directe comme « compte supprimé » (le nom vide s\'afficherait tel quel)', F.stock, "if (a.etat === 'supprime') o.autre.supprime = true;", '', ['957', '958']);
m('D25', 'la page de messages ne dit plus quels auteurs sont des comptes supprimés (la page ne peut pas le deviner : elle ne connaît que les membres actifs)', F.stock, "if (e && e.etat === 'supprime') supprimes.push(id);", '', ['957', '958']);

/* ══ 7. EXPORTER SES DONNÉES — ce que la personne voit, rien de plus ; un par jour ; un fichier qui s'écrit au fil de l'eau, plafonné ═════════════════════════ */
m('X01', 'l\'export n\'a plus de quota : un export à chaque requête, le geste le plus coûteux d\'une personne', F.compte, "if (!essai.ok) { res.set('Retry-After', String(essai.retry)); return refus(res, 429, 'export_quotidien', { retry: essai.retry }); }", '', ['957']);
m('X02', 'un export abandonné en route ne rend pas son créneau (24 h d\'attente pour un fichier jamais reçu)', F.compte, 'quotas.rembourser(cle);', '', ['957']);
m('X03', 'le plafond de taille ne coupe plus une conversation en cours d\'écriture', F.compte, 'if (total > plafondOctets) { coupe = true; break; }', '', ['957']);
m('X04', 'le plafond de taille ne coupe plus la liste des conversations', F.compte, "if (total > plafondOctets) { tronque = 'conversations'; break; }", '', ['957']);
m('X05', 'l\'export contient les messages d\'AVANT l\'arrivée de la personne dans le groupe', F.stock,
  'WHERE x.conv = ? AND x.seq >= ? AND x.seq > ? AND (x.expire_ts IS NULL OR x.expire_ts > ?)', 'WHERE x.conv = ? AND ? IS NOT NULL AND x.seq > ? AND (x.expire_ts IS NULL OR x.expire_ts > ?)', ['957']);
m('X06', 'l\'export contient les messages que la personne a supprimés « pour moi »', F.stock,
  /AND NOT EXISTS \(SELECT 1 FROM msg_masque k WHERE k\.conv = x\.conv AND k\.seq = x\.seq AND k\.uid = \?\)(\s+ORDER BY x\.seq ASC LIMIT \?)/, 'AND ? IS NOT NULL$1', ['957']);
m('X07', 'l\'export n\'est plus un téléchargement (`attachment`) : le navigateur l\'affiche dans l\'onglet', F.compte, String.raw`'Content-Disposition': 'attachment; filename="opmessages-export-' + jour + '.json"'`, "'Content-Disposition': 'inline'", ['957']);
m('X08', 'l\'export ne dit plus « Compte supprimé » pour l\'auteur d\'un compte effacé', F.compte, "(supprimes.has(m.auteur) ? 'Compte supprimé' : null)", 'null', ['957']);
m('X09', 'l\'export n\'est plus limité à deux en même temps pour le service', F.compte, "if (exportsEnCours >= EXPORT_SIMULTANES) { res.set('Retry-After', '30'); return refus(res, 429, 'quota_atteint', { retry: 30 }); }", '', ['957']);
m2('X10', 'l\'export est mis en cache (plus de `Cache-Control: no-store` sur le fichier de TOUTES les données d\'une personne : ni sur la route, ni dans l\'enveloppe du service)',
  [[F.compte, ", 'Cache-Control': 'no-store' });", ' });'], [F.app, "app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });", '']], ['957']);
m('X12', 'l\'export est mis en cache : la route ne pose plus `no-store` elle-même (l\'enveloppe du service le pose déjà sur tout /api)', F.compte, ", 'Cache-Control': 'no-store' });", ' });', ['957'],
  EQ('`app.js` pose `Cache-Control: no-store` sur TOUTE réponse de /api : l\'en-tête de la route est une redondance (comme `nosniff` des pièces)'));
m('X11', 'l\'export liste aussi les conversations quittées (la liste des identifiants ne filtre plus)', F.stock, 'SELECT conv FROM membre WHERE uid = ? AND quitte_le IS NULL ORDER BY conv', 'SELECT conv FROM membre WHERE uid = ? ORDER BY conv', ['957'],
  EQ('`convPourMembre` ne rend rien pour une conversation quittée : l\'export la saute'));

/* ══ 8. LE CLIENT — le module de données de la page et son client d'API ═══════════════════════════════════════════════════════════════════════════════════ */
m('C01', 'une page CACHÉE acquitte ce qu\'elle ne montre pas (la notification serait étouffée alors que personne n\'a rien vu)', F.src, 'if (!visible) return;', '', ['958']);
m('C02', 'le navigateur garde son abonnement quand le service refuse de l\'inscrire (l\'interrupteur mentirait)', F.src, "catch (e) { try { await sub.unsubscribe(); } catch (x) { /* rien */ } throw e; }", 'catch (e) { throw e; }', ['958']);
m('C03', 'une suppression de compte se signale comme une « session morte » (le flux se ferme, la page annonce une session expirée au lieu de la suppression)', F.src, 'if (mort || suppressionEnCours) return;', 'if (mort) return;', ['958']);
m('C04', 'une notification touchée ouvre n\'importe quelle adresse qui CONTIENT une conversation (l\'ancre de l\'adresse est perdue)', F.src, String.raw`const MOTIF_OUVRIR = /^\/#messages\/(c_[0-9a-f]{32})$/;`, String.raw`const MOTIF_OUVRIR = /(c_[0-9a-f]{32})/;`, ['958']);
m('C05', 'activer ne regarde plus si c\'est possible ici (iPhone hors écran d\'accueil, navigateur sans push, autorisation refusée) : il demande l\'autorisation quand même', F.src,
  "if (!e0.possible) throw erreurLocale('notif_' + (e0.raison === 'refusee' ? 'refusee' : e0.raison || 'navigateur'));", '', ['958']);
m('C06', 'désactiver ne prévient pas le service (le navigateur se désabonne, le service continue d\'écrire dans le vide)', F.src, 'await A.pushDesabonner(sub.endpoint);', '', ['958']);
m('C07', 'se déconnecter ne donne pas le point d\'accès de l\'appareil (l\'abonnement reste chez le service)', F.src, 'await api0.deconnexion(sub && sub.endpoint);', 'await api0.deconnexion();', ['958']);
m('C08', '« Déconnecter les autres appareils » ne donne pas le point d\'accès de CET appareil (il perd lui aussi ses notifications)', F.src, 'const r = await A.deconnecterAutres(sub && sub.endpoint);', 'const r = await A.deconnecterAutres();', ['958']);
m('C09', 'au démarrage, l\'abonnement que ce navigateur porte déjà n\'est plus redit au service', F.src, /\n      reabonner\(\);[^\n]*/, '', ['958']);
m('C10', 'la page n\'écoute plus le service worker (toucher une notification n\'ouvre plus rien)', F.src, /      ecouterServiceWorker\(\);\n/, '', ['958']);
/* ⛔ L'acquittement est protégé TROIS fois contre le doublon : à l'entrée (`gid <= ackEnvoye`), par la minuterie de groupement (`ackMinuterie`), et au départ de la minuterie (`g <= ackEnvoye`). Retirer une seule garde ne change rien de visible
   (C18, C19 : équivalentes, elles doivent survivre) ; le défaut réel en retire DEUX. */
m2('C11', 'une rafale d\'événements fait autant d\'acquittements (ni la minuterie de groupement, ni la garde au départ de la minuterie)',
  [[F.src, 'if (ackMinuterie) return;', ''], [F.src, 'if (mort || g <= ackEnvoye) return;', 'if (mort) return;']], ['958']);
m2('C12', 'un acquittement déjà envoyé est renvoyé (ni la garde à l\'entrée, ni la garde au départ de la minuterie)',
  [[F.src, 'if (!Number.isInteger(gid) || gid <= ackEnvoye || mort) return;', 'if (!Number.isInteger(gid) || mort) return;'], [F.src, 'if (mort || g <= ackEnvoye) return;', 'if (mort) return;']], ['958']);
m('C18', 'la minuterie de groupement des acquittements est perdue (la garde au départ de la minuterie rattrape)', F.src, 'if (ackMinuterie) return;', '', ['958'],
  EQ('chaque minuterie qui se déclenche voit `g <= ackEnvoye` et ne fait rien : une seule requête part quand même'));
m('C19', 'un acquittement déjà envoyé est ré-armé à l\'entrée (la garde au départ de la minuterie rattrape)', F.src, 'if (!Number.isInteger(gid) || gid <= ackEnvoye || mort) return;', 'if (!Number.isInteger(gid) || mort) return;', ['958'],
  EQ('la minuterie voit `g <= ackEnvoye` et ne fait rien : aucune requête ne part'));
m('C13', 'la demande de suppression n\'envoie plus le mot de confirmation (le service la refuse toujours)', F.api, "supprimerCompte: () => appel('POST', '/api/compte/supprimer', { confirmation: 'SUPPRIMER' }),", "supprimerCompte: () => appel('POST', '/api/compte/supprimer', {}),", ['958']);
m('C14', 'le client ne transmet plus l\'identifiant de l\'événement à la page (elle n\'a plus rien à acquitter)', F.api, "if (typeof g[nom] === 'function') g[nom](d, ev.lastEventId ? parseInt(ev.lastEventId, 10) : null);", "if (typeof g[nom] === 'function') g[nom](d);", ['958']);
m('C15', 'la sourdine de « 8 heures » dure une heure', F.src, "'8h': 8 * 3600000", "'8h': 3600000", ['958']);
m('C16', 'la sourdine « toujours » dépasse les dix ans que le service accepte (elle serait refusée)', F.src, 'tj: 9 * 365 * 86400000', 'tj: 11 * 365 * 86400000', ['958']);
m('C17', 'la phrase de l\'iPhone ne dit plus de rouvrir l\'application depuis son icône (l\'écran d\'accueil ne suffit pas : il faut la lancer depuis là)', F.src, ', puis rouvre-le depuis son icône.', '.', ['958']);

/* ── L'ADAPTATEUR RÉEL DU NAVIGATEUR (`navigateurReel`) : test-958 le remplace par un faux navigateur, seule la sonde l'exerce dans un VRAI navigateur ── */
m('C20', 'un iPhone hors écran d\'accueil n\'est plus reconnu : l\'interrupteur grisé ne dit plus d\'ajouter la page à l\'écran d\'accueil', F.src, "return { ok: false, raison: iOS() && !autonome() ? 'ios' : 'navigateur' };", "return { ok: false, raison: 'navigateur' };", ['sonde'], SONDE);
m('C21', 'une page CACHÉE se dit visible (l\'adaptateur du navigateur ne lit plus la visibilité) : elle acquitte ce qu\'elle ne montre pas', F.src, "visible: () => !doc || doc.visibilityState === 'visible',", 'visible: () => true,', ['sonde'], SONDE);
m('C22', 'le service worker est demandé à une adresse qui n\'existe pas (l\'enregistrement échoue, aucune notification ne peut s\'activer)', F.src, "await nav.serviceWorker.register('/sw.js', { scope: '/' });", "await nav.serviceWorker.register('/sw2.js', { scope: '/' });", ['sonde'], SONDE);
m('C23', 'l\'abonnement du navigateur n\'est plus « visible seulement » (Chrome le refuse : un push silencieux)', F.src, 'userVisibleOnly: true', 'userVisibleOnly: false', ['sonde'], SONDE);

/* ══ 9. LE SERVICE WORKER, LE MANIFESTE, LA POLITIQUE DE LA PAGE, LE GÉNÉRATEUR ═══════════════════════════════════════════════════════════════════════════ */
m('W01', 'le générateur ne refuse plus un sw.js qui s\'interpose entre la page et le réseau (fetch, cache, importScripts…)', F.gen,
  String.raw`if (/addEventListener\(\s*['"]fetch['"]|\bonfetch\b|\bcaches\b|\bimportScripts\b|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b/.test(codeSw)) jette(`, 'if (false) jette(', ['941']);
m('W02', 'la politique de la page n\'a plus `manifest-src` : le navigateur refuse de lire le manifeste, sans une erreur visible (l\'en-tête du service)', F.app, "worker-src 'self'; manifest-src 'self'; ", "worker-src 'self'; ", ['956']);
m('W03', 'la politique de la page générée n\'a plus `manifest-src` (le générateur)', F.gen, "worker-src 'self'; manifest-src 'self'; connect-src 'self'", "worker-src 'self'; connect-src 'self'", ['941']);
m('W04', 'le sw.js installé écoute `fetch` : il s\'interpose et pourrait servir une page périmée (le générateur le refuse)', F.sw, "self.addEventListener('install', () => { self.skipWaiting(); });",
  "self.addEventListener('install', () => { self.skipWaiting(); });\nself.addEventListener('fetch', (e) => { e.respondWith(fetch(e.request)); });", ['941', '956']);
m('W05', 'le manifeste n\'est plus « standalone » (l\'application s\'ouvrirait dans un onglet : pas de push sur iPhone)', F.man_pwa, '"display": "standalone"', '"display": "browser"', ['941']);
m('W06', 'le vrai sw.js ouvre une adresse d\'ailleurs (l\'origine de l\'adresse n\'est plus comparée)', F.sw, "return u.origin === self.location.origin ? u.pathname + u.search + u.hash : '/';", 'return u.pathname + u.search + u.hash;', ['sonde'], SONDE);
m('W07', 'le vrai sw.js ne passe plus l\'adresse de la notification par `adresseSure` quand on la TOUCHE', F.sw,
  'const url = adresseSure(event.notification.data && event.notification.data.url);', 'const url = event.notification.data && event.notification.data.url;', ['sonde'], SONDE);
m('W08', 'le vrai sw.js ne montre rien quand la charge est illisible (Safari retirerait l\'abonnement d\'un push silencieux)', F.sw,
  'try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }', 'try { d = event.data ? event.data.json() : {}; } catch (e) { return; }', ['sonde'], SONDE);
m('W09', 'le vrai sw.js n\'a plus d\'étiquette : deux messages de la même conversation empilent deux notifications', F.sw, "tag: texte(d.tag, 'opmsg', 80),", 'tag: undefined,', ['sonde'], SONDE);
m('W10', 'le vrai sw.js ne fait plus passer la fenêtre au premier plan avec la conversation : il ne prévient plus la page', F.sw, "c.postMessage({ type: 'ouvrir', url });", '', ['sonde'], SONDE);

/* ══ 10. LA PAGE (jouée par la sonde navigateur : lancer avec --sondes) ═════════════════════════════════════════════════════════════════════════════════ */
m('G01', 'toucher une notification n\'ouvre plus la conversation (l\'évènement du service worker est ignoré par la page)', F.page, "if (ev.type === 'ouvrir') ouvrirConvId(ev.conv);", '', ['sonde'], SONDE);
m('G02', 'on peut écrire à un compte supprimé : le compositeur ne se ferme plus', F.page, "c.supprime ? 'Ce compte a été supprimé : tu ne peux plus lui écrire.' : (c.annoncesSeulement", '(c.annoncesSeulement', ['sonde'], SONDE);
m('G03', 'le bouton « Oui, supprimer mon compte » n\'est plus grisé tant que la case n\'est pas cochée', F.page, 'id="sp-oui" aria-disabled="true">Oui, supprimer mon compte', 'id="sp-oui">Oui, supprimer mon compte', ['sonde'], SONDE);
m('G04', 'le verdict d\'un export ne s\'efface pas à l\'essai suivant (un refus reste affiché à côté d\'une réussite)', F.page, "reg.exportOccupe = true; reg.exportMsg = ''; reg.exportErreur = ''; peindreCompte();", 'reg.exportOccupe = true; peindreCompte();', ['sonde'], SONDE);
m('G05', 'la reconnexion qui annule la suppression ne le dit plus (« Bon retour »)', F.page, "if (motif === 'suppression_annulee') avis(PHRASES_MOTIF.suppression_annulee);", '', ['sonde'], SONDE);
m('G06', 'l\'écran de connexion qui suit une suppression ne dit plus la date d\'effacement', F.page, "etat.dateSuppression = m === 'suppression' ? d : 0;", 'etat.dateSuppression = 0;', ['sonde'], SONDE);
m('G07', 'toucher un interrupteur de notification « impossible ici » (iPhone hors écran d\'accueil, navigateur sans push, autorisation refusée) fait quelque chose', F.page, "if (quoi === 'sw' && !reg.notif.possible) return;", '', ['sonde'], SONDE);

/* ══ LE LANCEUR ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-push-'));
  for (const d of DOSSIERS_COPIE) copier(path.join(RACINE, d), path.join(dir, d));
  fs.mkdirSync(path.join(dir, 'tests'));
  for (const f of fs.readdirSync(path.join(RACINE, 'tests'))) if (/^(test-9\d\d|outils-[\w-]+|bac-messages|lib-horloge-msg|mode-site|sonde-opmessages-push|test-85\d)\.js$/.test(f)) fs.copyFileSync(path.join(RACINE, 'tests', f), path.join(dir, 'tests', f));
  fs.symlinkSync(path.join(RACINE, 'server-msg', 'node_modules'), path.join(dir, 'server-msg', 'node_modules'));
  return dir;
}
const nomBanc = (s) => s === 'sonde' ? 'la sonde' : 'test-' + s;
function lancer(dir, suite) {
  return new Promise((resolve) => {
    const sonde = suite === 'sonde';
    const f = sonde ? 'sonde-opmessages-push.js' : fs.readdirSync(path.join(dir, 'tests')).find(x => x.startsWith('test-' + suite) && x.endsWith('.js'));
    /* ⛔ la sonde lance un VRAI Chromium, dont le dossier de profil porte une prise Unix (`SingletonSocket`, 107 octets de chemin au plus) : sous un TMPDIR long (le brouillon d'une session distante),
       « le navigateur ne démarre pas » — pris en lançant ce fichier avec TMPDIR=<brouillon>. La sonde garde donc un TMPDIR COURT (`TMPDIR_SONDE`, par défaut /tmp), les copies, elles, restent où on les met. */
    const env = Object.assign({}, process.env, sonde ? { NODE_PATH: process.env.NODE_PATH || '/opt/node22/lib/node_modules/playwright/node_modules', TMPDIR: process.env.TMPDIR_SONDE || '/tmp' } : {});
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
/* le fichier muté se lit-il encore ? (une suite qui meurt sur une faute de syntaxe de la mutation a l'air de « tomber ») */
function syntaxe(chemin) {
  if (!/\.js$/.test(chemin)) return null;
  const r = spawnSync(process.execPath, ['--check', chemin], { encoding: 'utf8', timeout: 20000 });
  return r.status === 0 ? null : String(r.stderr || r.error || 'illisible').split('\n').filter(Boolean).slice(0, 3).join(' | ').slice(0, 220);
}
function muter(racine, mut) {
  const originaux = new Map();
  for (const [fichier, a, b] of mut.edits) {
    const chemin = path.join(racine, fichier);
    const base = originaux.has(fichier) ? fs.readFileSync(chemin, 'utf8') : fs.readFileSync(path.join(RACINE, fichier), 'utf8');
    if (!originaux.has(fichier)) originaux.set(fichier, base);
    const r = appliquer(base, a, b);
    if (r.erreur) return { erreur: r.erreur + ' (' + fichier + ')', originaux };
    fs.writeFileSync(chemin, r.texte);
  }
  for (const fichier of originaux.keys()) { const s = syntaxe(path.join(racine, fichier)); if (s) return { erreur: 'la mutation casse la syntaxe de ' + fichier + ' : ' + s, originaux }; }
  return { originaux };
}
function restaurer(dir, originaux) { for (const [fichier, texte] of originaux) fs.writeFileSync(path.join(dir, fichier), texte); }
const regenerer = (dir) => new Promise((ok) => { const p = spawn(process.execPath, [path.join(dir, 'scripts', 'opmsg-public.js')], { cwd: dir, stdio: 'ignore' }); p.on('close', ok); });

async function jouer(mut, dir) {
  const { id, nom, suites } = mut;
  const r0 = muter(dir, mut);
  if (r0.erreur) { restaurer(dir, r0.originaux); return { id, nom, verdict: 'MAL VISÉE', detail: r0.erreur, mut }; }
  try {
    /* une mutation de la page : la page servie se régénère depuis la page mutée (c'est elle que la sonde sert) */
    if (mut.edits.some(e => e[0] === F.page)) await regenerer(dir);
    const verts = [];
    for (const s of suites) {
      const r = await lancer(dir, s);
      /* ⛔ UN BANC QUI SE TAIT N'EST PAS UN BANC VERT : une promesse qui ne se résout jamais vide la boucle d'évènements et le processus sort en 0, SANS total (pris sur A05 : test-955 attendait
         une minuterie factice que la mutation avait rendue nécessaire — il sortait « proprement » au milieu d'une section). Pas de « N ✓ M ✗ » imprimé = le banc est MORT, il TOMBE. */
      if (r.code !== 0 || r.ko === null || r.ko > 0) {
        const ligne = (r.sortie.split('\n').find(l => l.includes('✗')) || r.sortie.split('\n').filter(Boolean).slice(-1)[0] || '').trim().slice(0, 170);
        const lignes = r.sortie.split('\n').filter(l => l.includes('✗')).map(l => l.trim()).slice(0, 14);
        return { id, nom, verdict: 'TOMBE', detail: nomBanc(s) + ' (' + (r.ko === null ? 'MORT, code ' + r.code + ', aucun total imprimé' : r.ko + ' ✗') + ') — ' + ligne, lignes: r.ko === null ? r.sortie.split('\n').filter(Boolean).slice(-6) : lignes, mut };
      }
      verts.push(s);
    }
    return { id, nom, verdict: 'SURVIT', detail: 'vert : ' + verts.map(nomBanc).join(', '), mut };
  } finally {
    restaurer(dir, r0.originaux);
    if (mut.edits.some(e => e[0] === F.page)) await regenerer(dir);
  }
}

(async () => {
  const args = process.argv.slice(2);
  const ids = args.filter(x => !x.startsWith('--'));
  const copiesDemandees = (args.find(x => x.startsWith('--copies=')) || '').slice(9);
  const NB_COPIES = /^\d+$/.test(copiesDemandees) ? Math.max(1, parseInt(copiesDemandees, 10)) : 2;
  const fichierDetails = (args.find(x => x.startsWith('--details=')) || '').slice(10) || null;   // le détail des ✗ de chaque mutation qui tombe : de quoi vérifier qu'elle tombe POUR LA BONNE RAISON
  if (args.includes('--liste')) {
    for (const x of MUTATIONS) console.log(x.id + (x.sonde ? ' [sonde]' : '') + (x.equivalente ? ' [≡]' : '') + ' · ' + x.suites.map(nomBanc).join('+') + ' · ' + x.nom);
    console.log('\n' + MUTATIONS.length + ' mutations (' + MUTATIONS.filter(x => x.equivalente).length + ' équivalentes, ' + MUTATIONS.filter(x => x.sonde).length + ' par la sonde)');
    process.exit(0);
  }
  if (args.includes('--verifier')) {
    let mal = 0;
    const vus = new Set();
    for (const mut of MUTATIONS) {
      if (vus.has(mut.id)) { mal++; console.log('  ✗ ' + mut.id + ' : identifiant en double'); }
      vus.add(mut.id);
      for (const s of mut.suites) {
        const ok = s === 'sonde' ? fs.existsSync(path.join(RACINE, 'tests', 'sonde-opmessages-push.js')) : fs.readdirSync(path.join(RACINE, 'tests')).some(x => x.startsWith('test-' + s) && x.endsWith('.js'));
        if (!BANCS.includes(s) || !ok) { mal++; console.log('  ✗ ' + mut.id + ' : le banc « ' + s + ' » n\'existe pas'); }
      }
      if (!!mut.sonde !== mut.suites.includes('sonde')) { mal++; console.log('  ✗ ' + mut.id + ' : ses bancs et son drapeau `sonde` ne disent pas la même chose'); }
      /* les motifs d'une mutation à plusieurs modifications du MÊME fichier se jugent l'un après l'autre sur le texte déjà modifié : on rejoue le chemin du lanceur sur un texte en mémoire */
      const textes = new Map();
      for (const [fichier, a, b] of mut.edits) {
        const base = textes.has(fichier) ? textes.get(fichier) : fs.readFileSync(path.join(RACINE, fichier), 'utf8');
        const r = appliquer(base, a, b);
        if (r.erreur) { mal++; console.log('  ✗ ' + mut.id + ' · ' + mut.nom + ' → MAL VISÉE · ' + r.erreur + ' (' + fichier + ')'); break; }
        textes.set(fichier, r.texte);
      }
    }
    /* la syntaxe de chaque mutation de fichier .js se contrôle dans une copie jetable, comme le lanceur le fait avant de jouer */
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-push-verif-'));
    try {
      for (const mut of MUTATIONS) {
        const originaux = new Map();
        for (const [fichier] of mut.edits) if (!originaux.has(fichier)) { fs.mkdirSync(path.dirname(path.join(tmp, fichier)), { recursive: true }); fs.copyFileSync(path.join(RACINE, fichier), path.join(tmp, fichier)); originaux.set(fichier, true); }
        const r = muter(tmp, mut);
        if (r.erreur && !/ne se trouve pas|se trouve \d+ fois|n'a pas changé/.test(r.erreur)) { mal++; console.log('  ✗ ' + mut.id + ' · ' + r.erreur); }
        if (r.originaux) restaurer(tmp, r.originaux);
      }
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    console.log('\n' + (MUTATIONS.length - mal) + '/' + MUTATIONS.length + ' mutations : motifs trouvés exactement une fois, fichiers lisibles, bancs présents');
    process.exit(mal ? 1 : 0);
  }
  /* --garder ID : fabrique UNE copie, y applique la mutation, l'IMPRIME et s'arrête — pour regarder à la main pourquoi une survivante survit (lancer le banc dans la copie, avec sa sortie entière) */
  if (args.includes('--garder')) {
    const mut = MUTATIONS.find(x => x.id === ids[0]);
    if (!mut) { console.log('mutation inconnue : ' + ids[0]); process.exit(2); }
    const dir = fabriquerCopie(), r = muter(dir, mut);
    if (r.erreur) { console.log('mal visée : ' + r.erreur); process.exit(2); }
    if (mut.edits.some(e => e[0] === F.page)) await regenerer(dir);
    console.log(dir); process.exit(0);
  }
  const sondes = args.includes('--sondes');
  const liste = ids.length ? MUTATIONS.filter(x => ids.includes(x.id)) : MUTATIONS.filter(x => !!x.sonde === sondes);
  if (!liste.length) { console.log('aucune mutation à jouer'); process.exit(2); }
  const avecSonde = liste.some(x => x.suites.includes('sonde'));
  /* les mutations jouées par la sonde ne se lancent pas en parallèle : deux navigateurs et deux services se volent le processeur, et la sonde mesure du temps */
  const copies = Array.from({ length: avecSonde ? 1 : Math.min(NB_COPIES, liste.length) }, fabriquerCopie);
  const nettoyer = () => { for (const d of copies) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } } };
  process.on('SIGINT', () => { nettoyer(); process.exit(130); });
  /* ⛔ LE TÉMOIN. Une suite qui MEURT dans la copie (un fichier que la copie n'emporte pas, un `require` qui échoue) a l'air de « tomber » à chaque mutation, sans rien prouver : pris le 2 octobre 2026
     sur G03 de mutations-pieces, que test-857 « faisait tomber » en mourant de `MODULE_NOT_FOUND` sur sa première ligne. Chaque banc visé tourne donc d'abord, UNE fois, sur une copie INTACTE :
     s'il n'y est pas vert, rien n'est joué et la sortie dit pourquoi. */
  if (!args.includes('--sans-temoin')) {
    const visees = Array.from(new Set(liste.flatMap(x => x.suites)));
    for (const sv of visees) {
      const r = await lancer(copies[0], sv);
      if (r.code !== 0 || r.ko === null || r.ko > 0) {
        console.log('⛔ le TÉMOIN de ' + nomBanc(sv) + ' n\'est pas vert sur une copie INTACTE (code ' + r.code + ') — aucune mutation n\'est jouée.\n' + r.sortie.split('\n').filter(Boolean).slice(-14).join('\n'));
        nettoyer(); process.exit(2);
      }
    }
    console.log('témoins verts sur une copie intacte : ' + visees.map(nomBanc).join(', ') + '\n');
  }
  const file = liste.slice(), resultats = [];
  await Promise.all(copies.map(async (dir) => {
    for (;;) {
      const mut = file.shift(); if (!mut) return;
      const r = await jouer(mut, dir);
      resultats.push(r);
      if (fichierDetails) { try { fs.appendFileSync(fichierDetails, r.id + ' · ' + r.verdict + ' · ' + r.detail + '\n' + (r.lignes || []).map(l => '      ' + l.slice(0, 230)).join('\n') + (r.lignes && r.lignes.length ? '\n' : '')); } catch (e) { /* le journal détaillé est facultatif */ } }
      const signe = r.verdict === 'MAL VISÉE' ? '  ✗ ' : mut.equivalente ? (r.verdict === 'SURVIT' ? '  ≡ ' : '  ✗ ') : (r.verdict === 'TOMBE' ? '  ✓ ' : '  ✗ ');
      console.log(signe + r.id + ' · ' + r.nom + ' → ' + (mut.equivalente && r.verdict === 'SURVIT' ? 'SURVIT comme prévu (' + mut.equivalente + ')' : mut.equivalente && r.verdict === 'TOMBE' ? 'TOMBE ALORS QU\'ELLE DEVRAIT SURVIVRE (la raison donnée est fausse : « ' + mut.equivalente + ' ») · ' + r.detail : r.verdict + ' · ' + r.detail));
    }
  }));
  nettoyer();
  const reelles = resultats.filter(r => !r.mut.equivalente), equivalentes = resultats.filter(r => r.mut.equivalente);
  const tombees = reelles.filter(r => r.verdict === 'TOMBE').length;
  const autres = reelles.filter(r => r.verdict !== 'TOMBE');
  const equivOk = equivalentes.filter(r => r.verdict === 'SURVIT').length;
  const equivMal = equivalentes.filter(r => r.verdict !== 'SURVIT');
  console.log('\n' + tombees + '/' + reelles.length + ' mutations tombent' + (autres.length ? ' — LES AUTRES : ' + autres.map(r => r.id + ' (' + r.verdict + ')').join(', ') : '')
    + (equivalentes.length ? ' · ' + equivOk + '/' + equivalentes.length + ' équivalentes survivent comme prévu' + (equivMal.length ? ' — ANOMALIES : ' + equivMal.map(r => r.id + ' (' + r.verdict + ')').join(', ') : '') : ''));
  process.exit(!autres.length && !equivMal.length ? 0 : 1);
})();
