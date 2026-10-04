/* ══ LES MUTATIONS DES APPELS À DEUX — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » (CLAUDE.md) ═══════════════════════════════════════
   Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il remet, UN PAR UN, les défauts que `tests/test-980` à `984`, `859` (les épingles de la page), `901` à `909`, `911`, `934`,
   `982` et la sonde navigateur `sonde-opmessages-appels.js` gardent :
     A. le SERVICE — des identifiants du relais qui se calculent mal ou se mettent en cache, un STUN d'un tiers en repli, un signal relayé à la mauvaise session ou sans contrôle de l'appareil lié, d'un
        destinataire quelconque, trop gros, en liste ; un appel lancé dans un groupe, vers quelqu'un qu'on ne peut pas écrire, sans plafond par paire ; deux appels pour une personne, un second appareil qui
        vole la réponse, une sonnerie échue encore prise ; un appel manqué sans notification, un historique à l'envers ; un appareil perdu jamais terminé ; un push de sonnerie qui nomme l'appelant, qui n'est
        pas urgent, qui attend cinq secondes, qui part pour un appel fini ; la suppression d'un compte et un blocage qui laissent l'appel courir ; la surveillance qui ne crie plus ; les gardes de route ;
        la politique de permissions du navigateur ;
     B. l'INSTALLATION du relais — un relais TCP permis, des plages refusées absentes, un quota retiré, un journal, un fichier de secrets lisible de tous ;
     C. le MOTEUR de la page — dont ⛔ le défaut que la sonde a trouvé en vrai navigateur (l'appelé ajoutait ses émetteurs AVANT l'offre : la voix de l'appelé n'arrivait jamais), l'offre qui se croise, la
        liaison qui tombe ou ne s'établit pas, le pouls, le raccrochage et l'offre perdus, la page qui se ferme, l'événement qui devance la réponse ou qui se perd, les serveurs, candidats et signaux qu'on ne
        croit pas, le renouvellement des identifiants du relais, l'historique et ses séries, la caméra de l'autre ;
     D. la PAGE — la sonnerie qui ne s'arrête pas, la voix non branchée, les pistes non remises, un appel à plusieurs contacts, la caméra d'un groupe, les avis de fin, la mention d'aperçu qui reparaît, le retournement de la caméra (l'ancienne piste qui reste allumée, toujours la même caméra, le bouton avec une seule caméra)…
   dans une COPIE de l'arbre (jamais dans l'arbre lui-même : le `git checkout` d'après-mutation de CLAUDE.md efface aussi les correctifs non commités), joue les bancs visés, et exige qu'AU MOINS UN tombe
   (code de sortie non nul ou un « ✗ »).

   ⛔ UNE MUTATION DONT LE MOTIF NE TROUVE RIEN EST MAL VISÉE, et le lanceur le DIT au lieu de conclure : il vérifie que le motif se trouve EXACTEMENT UNE fois (`s.replace(motif, autre, 1)` frappe la
   PREMIÈRE occurrence du fichier, pas celle qu'on croit — pris le 22 septembre 2026), que le texte a changé, ET que le fichier muté se lit encore (`node --check`) : une suite qui MEURT sur une faute de
   syntaxe de la mutation a l'air de « tomber » et ne prouve rien.
   ⛔ UNE MUTATION QUI SURVIT n'est pas forcément un banc aveugle : une autre garde peut la neutraliser. Ces mutations-là sont marquées `equivalente` avec leur RAISON : on les joue quand même, et ELLES
   DOIVENT SURVIVRE (« ≡ ») — c'est la preuve que la garde restante tient seule. Si une « équivalente » TOMBE, la raison donnée est fausse : le lanceur le crie.
   ⛔ LA COPIE EST FABRIQUÉE DEPUIS L'ARBRE COMMITÉ OU NON : lancer ce fichier APRÈS `git commit` du correctif, jamais avant (correctif → banc → commit → mutation → `git checkout`).
   Elle emporte aussi `server/` (le VRAI OP GESTION que lancent certains bancs en boucle locale).

   Lancer :  TMPDIR=/un/dossier node tests/mutations-appels.js                 (toutes, hors sondes navigateur)
             NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/mutations-appels.js --sondes     (les mutations jouées par la sonde navigateur : une à la fois, ~2 à 3 minutes chacune)
             node tests/mutations-appels.js A01 C02                              (seulement celles-là)
             node tests/mutations-appels.js --verifier                           (ne joue rien : chaque motif se trouve UNE fois dans l'arbre, chaque banc existe)
             node tests/mutations-appels.js --liste                              (le catalogue)
             --copies=N (défaut 2)   --garder ID (fabrique UNE copie mutée, l'imprime et s'arrête)   --sans-temoin   --temoins (ne joue que les témoins)   --details=FICHIER (tous les ✗ de chaque mutation qui tombe)
   Deux copies en parallèle, un délai par banc ; les sondes une à la fois (deux navigateurs, un service et un coturn se volent le processeur, et la sonde mesure du temps). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn, spawnSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const DELAI_MS = 420000;
const F = { page: 'apercu/opmessages/index.html' };
const BANCS = ['859', '901', '903', '905', '906', '908', '909', '911', '934', '980', '981', '982', '983', '984', 'sonde', 'sondeComplete'];
const SONDE_FICHIER = 'sonde-opmessages-appels.js';
const MUTATIONS = [];
/* [id, nom, [[fichier, ancien, nouveau], …], suites, option] — `ancien` : une chaîne (une seule occurrence). Fabriqué depuis le texte réel des fichiers (chaque motif a été trouvé UNE fois). */
const CATALOGUE = [
  ["A01", "le mot de passe du relais est calculé en SHA-256 au lieu de SHA-1 : coturn refuse tous les appels", [["server-msg/appels.js", "crypto.createHmac('sha1', relais.secret)", "crypto.createHmac('sha256', relais.secret)"]], ["981"]],
  ["A02", "le nom d'utilisateur du relais ne porte plus l'identifiant de la personne : un identifiant volé sert à tout le monde", [["server-msg/appels.js", "const username = expire + ':' + uid;", "const username = String(expire);"]], ["981"]],
  ["A03", "sans relais installé, un serveur STUN d'un tiers (Google) est proposé en repli : l'adresse des appareils sort de nos machines", [["server-msg/appels.js", "if (!r) return { relais: false, ttl_s: 0, serveurs: [] };", "if (!r) return { relais: false, ttl_s: 0, serveurs: [{ urls: ['stun:stun.l.google.com:19302'] }] };"]], ["981"]],
  ["A04", "les identifiants du relais peuvent être mis en cache (plus de `Cache-Control: no-store`)", [["server-msg/routes-appels.js", "    res.set('Cache-Control', 'no-store');\n    res.json(appels.ice(req.moi.id));", "    res.json(appels.ice(req.moi.id));"]], ["981"], {"equivalente": "`app.js` pose `Cache-Control: no-store` sur TOUT le préfixe `/api` (le routeur d'Express ne distingue pas la casse : le préfixe monté, pas la route) — la ligne de la route est une défense en profondeur, que seule la disparition du préfixe mettrait à l'épreuve (et `test-981` relit l'en-tête de la réponse, qui reste vert tant que l'un des deux tient)"}],
  ["A05", "un signal est relayé à la session de CELUI QUI L'ENVOIE au lieu de celle de l'autre", [["server-msg/appels.js", "hub.emettreSession(autre.session, 'signal'", "hub.emettreSession(a.session, 'signal'"]], ["981"]],
  ["A06", "n'importe quel appareil de la personne peut signaler dans l'appel (plus de contrôle de l'appareil LIÉ)", [["server-msg/appels.js", "if (!a.session || a.session !== sessionH) throw erreur('appareil_non_lie');", "if (!a.session) throw erreur('appareil_non_lie');"]], ["981"]],
  ["A07", "le pouls est RELAYÉ à l'autre (il ne doit servir qu'à prouver que l'appareil est là)", [["server-msg/appels.js", "    if (type === 'pouls') return { relaye: false };\n", ""]], ["981"]],
  ["A08", "une sonnerie échue peut encore être prise tant que le balayeur n'est pas passé", [["server-msg/appels.js", "    echoir();                                                 // une sonnerie échue ne se prend plus, même si le balayeur n'est pas encore passé\n", ""]], ["981", "983"]],
  ["A09", "on peut lancer un appel dans un GROUPE (l'appel de groupe est l'étape 8)", [["server-msg/routes-appels.js", "      if (c.conv.type !== 'direct') return refus(res, 409, 'appel_a_deux');             // un groupe, un canal, une réunion : l'appel de groupe est l'étape 8\n", ""]], ["981"]],
  ["A10", "on peut appeler quelqu'un qu'on ne peut pas écrire (pas de contact, un blocage) : un appel révèle qu'on a été bloqué", [["server-msg/routes-appels.js", "    if (!stockage.peutEcrire(moi.id, appele)) return refus(res, 404, 'introuvable');\n", ""]], ["981"]],
  ["A11", "le destinataire d'un signal n'est plus vérifié : on fait relayer une enveloppe vers n'importe qui", [["server-msg/routes-appels.js", " || b.a !== acces.autre) return refus(res, 400, 'champ_invalide');", ") return refus(res, 400, 'champ_invalide');"]], ["981"]],
  ["A12", "la taille d'un signal n'est plus plafonnée à 16 Ko", [["server-msg/routes-appels.js", "      if (Buffer.byteLength(JSON.stringify(d), 'utf8') > SIGNAL_OCTETS_MAX) return refus(res, 413, 'signal_trop_gros');\n", ""]], ["981"]],
  ["A13", "une LISTE est acceptée comme contenu d'un signal (l'enveloppe est { type, donnees } : la page lit des champs)", [["server-msg/routes-appels.js", "typeof b.donnees !== 'object' || Array.isArray(b.donnees)) return", "typeof b.donnees !== 'object') return"]], ["981"]],
  ["A14", "le plafond PAR PAIRE disparaît : faire sonner trente fois la même personne", [["server-msg/routes-appels.js", "    if (!plafond(res, 'appel_paire:' + moi.id + ':' + appele, cfg.parPaireHeure, 3600000)) return;\n", ""]], ["981"]],
  ["A15", "un compte neuf (moins de 24 h) a les mêmes limites qu'un ancien", [["server-msg/routes-appels.js", "const jeune = (moi) => (moi.origine !== 'beta' && horloge() - moi.cree < JOUR) ? 1 / 3 : 1;", "const jeune = (moi) => 1;"]], ["981"]],
  ["A16", "un filtre d'historique inconnu est accepté", [["server-msg/routes-appels.js", "    if (f !== 'tous' && f !== 'manques') return refus(res, 400, 'champ_invalide');\n", ""]], ["981"]],
  ["A17", "une personne déjà dans un appel peut en lancer un second", [["server-msg/stockage.js", "      if (appelActifDe(appelant)) throw erreur('occupe_moi');\n", ""]], ["980", "981"]],
  ["A18", "un appelé déjà dans un appel SONNE quand même (au lieu d'être « occupé »)", [["server-msg/stockage.js", "occupe = appelActifDe(appele) !== null;", "occupe = false;"]], ["980", "981"]],
  ["A19", "un SECOND appareil de l'appelé prend l'appel déjà pris (il est reconnu comme le même)", [["server-msg/stockage.js", "if (accepte && me.session && me.session === session) return", "if (accepte && me.session) return"]], ["980", "981"]],
  ["A20", "une sonnerie échue se prend encore (la vérification de l'échéance disparaît de la réponse)", [["server-msg/stockage.js", "if (a.etat !== 'sonne' || num(a.sonne_jusqua) <= horloge()) throw erreur('appel_fini');", "if (a.etat !== 'sonne') throw erreur('appel_fini');"]], ["980", "981", "983"]],
  ["A21", "n'importe quel appareil raccroche l'appel d'un autre appareil de la même personne", [["server-msg/stockage.js", "      if (me.session && me.session !== session) throw erreur('appareil_non_lie');\n", ""]], ["980", "981"]],
  ["A22", "une sonnerie échue ne fait plus de notification d'appel manqué", [["server-msg/stockage.js", "notif: appelant && appele ? appelNotifManque(r.id, r.type, appelant, appele) : null });", "notif: null });"]], ["980", "983"]],
  ["A23", "un appelant BLOQUÉ laisse quand même une notification d'appel manqué", [["server-msg/stockage.js", "    if (contactBloque(appelant, appele)) return null;\n    const p = personneParId(appelant);", "    const p = personneParId(appelant);"]], ["980", "983"]],
  ["A24", "l'historique « Tous » est rendu du plus ANCIEN au plus récent", [["server-msg/stockage.js", "WHERE p.uid = ? AND a.etat NOT IN ('sonne', 'en_cours') ORDER BY a.cree DESC, a.id DESC LIMIT ?", "WHERE p.uid = ? AND a.etat NOT IN ('sonne', 'en_cours') ORDER BY a.cree ASC, a.id ASC LIMIT ?"]], ["980", "981"]],
  ["A25", "un appareil qui ne donne plus signe de vie ne termine JAMAIS l'appel (le balayeur ne juge plus `perduMs`)", [["server-msg/appels.js", "          if (t - ref <= cfg.perduMs) continue;\n", "          continue;\n"]], ["983"]],
  ["A26", "les signes de vie ne sont plus notés : tout appel est jugé « perdu » dès le premier passage", [["server-msg/appels.js", "const vivre = (id, uid) => { vus.set(cle(id, uid), horloge()); };", "const vivre = () => {};"]], ["983"]],
  ["A27", "la sonnerie attend les cinq secondes d'un message avant de pousser (plus d'`ackMs` propre à l'appel)", [["server-msg/appels.js", "urgence: 'high', ttl: RING_PUSH_TTL_S, ackMs: RING_ACK_MS,", "urgence: 'high', ttl: RING_PUSH_TTL_S,"]], ["983"]],
  ["A28", "le push de sonnerie nomme l'appelant (la charge minimale devient un nom)", [["server-msg/appels.js", "titre: 'OP MESSAGES', corps: 'Appel entrant',", "titre: 'OP MESSAGES', corps: 'Appel de ' + nomAffiche(appelant),"]], ["983"]],
  ["A29", "le push de sonnerie n'est plus urgent (`Urgency: normal` : l'appareil endormi ne sonne pas)", [["server-msg/appels.js", "urgence: 'high', ttl: RING_PUSH_TTL_S, ackMs: RING_ACK_MS,", "urgence: 'normal', ttl: RING_PUSH_TTL_S, ackMs: RING_ACK_MS,"]], ["983"]],
  ["A30", "la sourdine d'une conversation ne coupe plus le push d'un appel manqué", [["server-msg/appels.js", "    if (!notif || notif.sourdine) return;", "    if (!notif) return;"]], ["983"]],
  ["A31", "le push de sonnerie part même si l'appel est déjà fini quand il devrait partir", [["server-msg/appels.js", "        if (!a || a.etat !== 'sonne') return false;", "        if (!a) return false;"]], ["983"]],
  ["A32", "le push de sonnerie garde 30 s de vie même quand il ne reste que 2 s de sonnerie", [["server-msg/appels.js", "        return reste > 0 ? { ttl: Math.min(RING_PUSH_TTL_S, reste) } : false;", "        return { ttl: RING_PUSH_TTL_S };"]], ["983"]],
  ["A33", "la demande de suppression d'un compte ne termine plus son appel en cours", [["server-msg/compte.js", "try { if (ctx.appels) ctx.appels.terminerDe(req.moi.id); }", "try { if (false) ctx.appels.terminerDe(req.moi.id); }"]], ["983"]],
  ["A34", "un blocage ne coupe plus l'appel en cours entre les deux personnes", [["server-msg/routes.js", "try { if (ctx.appels) ctx.appels.bloquer(req.moi.id, u); }", "try { if (false) ctx.appels.bloquer(req.moi.id, u); }"]], ["983"]],
  ["A35", "une charge n'a plus le droit de RACCOURCIR l'attente du push (la sonnerie attend cinq secondes)", [["server-msg/push.js", "const attente = Number.isInteger(charge.ackMs) && charge.ackMs >= 0 ? Math.min(charge.ackMs, pc.ackMs) : pc.ackMs;", "const attente = pc.ackMs;"]], ["983"]],
  ["A36", "la surveillance ne crie plus quand le balayeur d'appels ne passe plus", [[".github/scripts/surveillance-messages.js", "if (typeof j.appels.ageS === 'number' && j.appels.ageS > SEUIL_PLANIF_S) {", "if (false && typeof j.appels.ageS === 'number' && j.appels.ageS > SEUIL_PLANIF_S) {"]], ["934"]],
  ["A37", "le signal d'un appel n'exige plus d'être PARTICIPANT de l'appel (garde S au lieu de AP)", [["server-msg/manifeste.js", "{ id: 'appels.signal',     m: 'POST', p: '/api/appels/:id/signal',                 garde: 'AP' },", "{ id: 'appels.signal',     m: 'POST', p: '/api/appels/:id/signal',                 garde: 'S' },"]], ["905"]],
  ["A38", "répondre à un appel n'exige plus d'être participant de l'appel (garde S au lieu de AP)", [["server-msg/manifeste.js", "{ id: 'appels.repondre',   m: 'POST', p: '/api/appels/:id/repondre',               garde: 'AP' },", "{ id: 'appels.repondre',   m: 'POST', p: '/api/appels/:id/repondre',               garde: 'S' },"]], ["905"]],
  ["A39", "lancer un appel n'exige plus un compte VÉRIFIÉ (garde S au lieu de V)", [["server-msg/manifeste.js", "{ id: 'appels.creer',      m: 'POST', p: '/api/appels',                            garde: 'V' },", "{ id: 'appels.creer',      m: 'POST', p: '/api/appels',                            garde: 'S' },"]], ["905"]],
  ["A40", "la politique de permissions du navigateur interdit la caméra et le micro à la page", [["server-msg/app.js", "'Permissions-Policy': 'camera=(self), microphone=(self)',", "'Permissions-Policy': 'camera=(), microphone=()',"]], ["901", "905", "903", "908", "909"]],
  ["B01", "le relais TCP (RFC 6062) est permis : un client peut ouvrir des connexions TCP depuis notre machine", [["server-msg/install-turn.sh", "  echo \"no-tcp-relay\"\n", "  echo \"# no-tcp-relay\"\n"]], ["982"]],
  ["B02", "les plages refusées ne sont plus écrites : le relais atteint la machine elle-même", [["server-msg/install-turn.sh", "  for plage in \"${REFUSES[@]}\"; do echo \"denied-peer-ip=$plage\"; done\n", ""]], ["982"]],
  ["B03", "le quota par identifiant disparaît : un identifiant ouvre autant d'allocations qu'il veut", [["server-msg/install-turn.sh", "  echo \"user-quota=$USER_QUOTA\"\n", ""]], ["982"]],
  ["B04", "coturn journalise dans un fichier : les identifiants des personnes y resteraient", [["server-msg/install-turn.sh", "  echo \"log-file=/dev/null\"\n", "  echo \"log-file=/var/log/turn.log\"\n"]], ["982"]],
  ["B05", "le modèle de configuration (sans secret : il n'est complété que dans le fichier final) devient lisible de tous", [["server-msg/install-turn.sh", "chmod 600 \"$MODELE\"\n", "chmod 644 \"$MODELE\"\n"]], ["982"], {"equivalente": "le modèle ne porte AUCUN secret — les lignes `static-auth-secret=` sont ajoutées par le programme Node dans le fichier FINAL (0640 root:turnserver, mutation B06) — et il est supprimé quelques lignes plus loin (`rm -f \"$MODELE\"`) : son mode n'expose rien, et aucun banc ne peut le lire pendant la fraction de seconde où il existe"}],
  ["B06", "la configuration de coturn (secrets) devient lisible de tous", [["server-msg/install-turn.sh", "chown root:turnserver \"$COTURN_CONF\"; chmod 640 \"$COTURN_CONF\"", "chown root:turnserver \"$COTURN_CONF\"; chmod 644 \"$COTURN_CONF\""]], ["982"]],
  ["B07", "l'attribut SOFTWARE du serveur est de nouveau écrit (la version de coturn se lit)", [["server-msg/install-turn.sh", "  echo \"no-software-attribute\"\n", ""]], ["982"]],
  ["C01", "⛔ L'APPELÉ ADOPTE SES ÉMETTEURS : il ne prend plus ceux que l'offre fait naître — la voix de l'appelé n'arrive jamais à l'appelant (le défaut TROUVÉ par la sonde en vrai navigateur)", [["server-msg/public/source-serveur.js", "          adopterEmetteurs(c);\n          await appliquerPistes(c);", "          await appliquerPistes(c);"]], ["984"]],
  ["C02", "⛔ le défaut d'origine EN ENTIER : l'appelé crée ses émetteurs avant l'offre (`addTransceiver`) et n'adopte rien — il répond « recvonly » et n'envoie RIEN", [["server-msg/public/source-serveur.js", "      if (c.role === 'appelant') {\n        for (const kind of ['audio', 'video']) {", "      if (true) {\n        for (const kind of ['audio', 'video']) {"], ["server-msg/public/source-serveur.js", "          adopterEmetteurs(c);\n          await appliquerPistes(c);", "          await appliquerPistes(c);"]], ["984"]],
  ["C03", "une liaison tombée (`failed`) ne relance plus rien chez l'appelant", [["server-msg/public/source-serveur.js", "        if (s === 'failed') relancer(c);\n", ""]], ["984"]],
  ["C04", "L'APPELÉ offre aussi quand sa liaison tombe (deux offres peuvent se croiser)", [["server-msg/public/source-serveur.js", "        if (c.role !== 'appelant') return;                                               // l'appelé attend l'offre de l'appelant\n", ""], ["server-msg/public/source-serveur.js", "if (c.fini || c.role !== 'appelant' || !c.pc || c.relance) return;", "if (c.fini || !c.pc || c.relance) return;"]], ["984"]],
  ["C05", "la veille ne raccroche plus une liaison qui ne s'établit pas : l'écran attend pour toujours", [["server-msg/public/source-serveur.js", "c.minVeille = planifier(() => { c.minVeille = null; echec(c); }, T.veille);", "c.minVeille = null;"]], ["984"]],
  ["C06", "le pouls n'est plus envoyé : le service met fin à tout appel au bout de `perduMs`", [["server-msg/public/source-serveur.js", "    function armerPouls(c) {\n      if (c.minPouls) annuler(c.minPouls);", "    function armerPouls(c) {\n      return;\n      if (c.minPouls) annuler(c.minPouls);"]], ["984"]],
  ["C07", "le raccrochage d'une page qui se ferme n'est plus `keepalive` : il part, ou ne part pas, selon le bon vouloir du navigateur", [["server-msg/public/source-serveur.js", "d.api.quitterAppel(c.id, { keepalive: true })", "d.api.quitterAppel(c.id)"]], ["984"]],
  ["C08", "fermer la page REFUSE la sonnerie entrante qu'on n'avait pas prise (un autre appareil pouvait encore répondre)", [["server-msg/public/source-serveur.js", "if (!c || c.fini || !c.local) return false;\n      finir(c, c.vue.etat === 'sonne' ? 'annule' : 'fini', { avis: null });", "if (!c || c.fini) return false;\n      finir(c, c.vue.etat === 'sonne' ? 'annule' : 'fini', { avis: null });"]], ["984"]],
  ["C09", "la sonnerie sous les yeux n'est plus acquittée : le service envoie une notification qui la double", [["server-msg/public/source-serveur.js", "      if (Number.isInteger(gid)) d.acquitter(gid);          // la sonnerie est sous les yeux de la personne (page visible) : le service n'enverra pas de notification qui la doublerait\n", ""]], ["984"]],
  ["C10", "l'événement « en cours » qui devance la réponse de la route est perdu (la liaison ne démarre jamais)", [["server-msg/public/source-serveur.js", "        if (tard && tard !== v && tard.etat !== 'sonne') appliquer(c, tard);            // l'autre a répondu avant que la réponse de la route nous arrive\n", ""]], ["984"]],
  ["C11", "la page ne relit plus l'état quand la sonnerie devrait être finie : un événement de fin perdu laisse sonner pour toujours", [["server-msg/public/source-serveur.js", "      courant = c;\n      c.minSonnerie = planifier(() => { c.minSonnerie = null; relireActif(); }, Math.max(1000, (v.sonne_jusqua - v.debut) || 0) + T.marge);\n", "      courant = c;\n"]], ["984"]],
  ["C12", "un serveur de relais d'un schéma inconnu (`javascript:`) est donné au navigateur", [["server-msg/public/source-serveur.js", "u.length <= 220 && SCHEMA_ICE.test(u))", "u.length <= 220)"]], ["984"]],
  ["C13", "un candidat de 2 000 signes est transmis au navigateur", [["server-msg/public/source-serveur.js", "x.candidate.length > 1000) return null;", "x.candidate.length > 100000) return null;"]], ["984"]],
  ["C14", "une offre de plus de 12 000 signes est appliquée", [["server-msg/public/source-serveur.js", "|| x.sdp.length > SDP_MAX || x.sdp === c.derniereOffre) return;", "|| x.sdp === c.derniereOffre) return;"]], ["984"]],
  ["C15", "les identifiants de relais ne sont pas redemandés au renouvellement (la configuration garde les vieux)", [["server-msg/public/source-serveur.js", "try { if (typeof c.pc.setConfiguration === 'function') c.pc.setConfiguration(Object.assign({}, c.conf, { iceServers: ice.serveurs })); return true; }", "try { return true; }"]], ["984"]],
  ["C16", "l'offre de renouvellement ne dit plus à l'appelé de renouveler AVANT de répondre", [["server-msg/public/source-serveur.js", "      if (renouveler) corps.renouveler = true;\n", ""]], ["984"]],
  ["C17", "un raccrochage perdu (500) ne repart pas : l'autre attend 45 s", [["server-msg/public/source-serveur.js", "if (n >= T.quitter.length || !e || !CODES_RESEAU.includes(e.code)) return null;", "return null;"]], ["984"]],
  ["C18", "une offre perdue (500) ne repart pas : la liaison ne s'établit jamais", [["server-msg/public/source-serveur.js", "if (important && n < T.reessai.length && e && CODES_RESEAU.includes(e.code)) {", "if (false) {"]], ["984"]],
  ["C19", "deux manqués d'affilée de la même personne ne font plus qu'UNE ligne", [["server-msg/public/source-serveur.js", "&& x.membres.length) prec.repetitions++;", "&& false) prec.repetitions++;"]], ["984"]],
  ["C20", "un appel répondu entre deux manqués ne rompt plus la série (« manqué (3) » au lieu de deux lignes)", [["server-msg/public/source-serveur.js", "if (x.sens === 'manque' && prec && prec.sens === 'manque' && prec.membres[0] === x.membres[0]", "if (x.sens === 'manque' && prec && prec.membres[0] === x.membres[0]"]], ["984"]],
  ["C21", "le filtre « Manqués » ne filtre plus", [["server-msg/public/source-serveur.js", "return filtre === 'manques' ? out.filter((x) => x.sens === 'manque') : out;", "return out;"]], ["984"]],
  ["C22", "on peut lancer un appel quand on est déjà dans un appel (le refus local « Tu es déjà dans un appel » disparaît)", [["server-msg/public/source-serveur.js", "if (lancement || (courant && !courant.fini)) throw d.refus('occupe', 409, { moi: true });", "if (false) throw d.refus('occupe', 409, { moi: true });"]], ["984"]],
  ["C23", "un appel à plusieurs n'est plus refusé par le moteur", [["server-msg/public/source-serveur.js", "      if (ids.length > 1) throw d.refus('appel_a_deux', 409);\n", ""]], ["984", "911"]],
  ["C24", "l'état de la caméra n'est plus dit à l'autre", [["server-msg/public/source-serveur.js", "      c.cameraDite = on;\n      signaler(c, 'etat', { camera: on }, false);", "      c.cameraDite = on;"]], ["984"]],
  ["C25", "la notification d'un appel réglé n'est plus retirée de l'écran", [["server-msg/public/source-serveur.js", "      if (d.fermerNotif) { try { d.fermerNotif('appel:' + c.id); } catch (e) { /* une notification qui reste n'est pas un appel qui dure */ } }\n", ""]], ["984"]],
  ["C26", "l'historique n'est plus redit une fois le raccrochage reçu (la ligne manque chez celui qui raccroche)", [["server-msg/public/source-serveur.js", "if (r && r.appel) c.vue = r.appel; d.emettre({ type: 'appels' }); return r && r.appel ? r.appel : null; }", "if (r && r.appel) c.vue = r.appel; return r && r.appel ? r.appel : null; }"]], ["984"]],
  ["C27", "la phrase du refus ne nomme plus celui qui a refusé", [["server-msg/public/source-serveur.js", "case 'refuse': return sortant ? p.nom + ' a refusé l\\'appel.' : null;", "case 'refuse': return sortant ? 'Appel refusé.' : null;"]], ["984"]],
  ["C28", "un navigateur sans connexion pair à pair lance quand même l'appel (et échoue plus tard, sans le dire)", [["server-msg/public/source-serveur.js", "      if (!d.webrtc || typeof d.webrtc.RTCPeerConnection !== 'function') throw d.erreurLocale('appel_navigateur');\n", ""]], ["984", "911"]],
  ["C29", "raccrocher deux fois rend deux enregistrements différents", [["server-msg/public/source-serveur.js", "      if (!c.terminaison) {\n        c.terminaison = (async () => {", "      if (true) {\n        c.terminaison = (async () => {"]], ["984"]],
  ["C30", "une page qui se charge pendant une sonnerie ne la retrouve plus", [["server-msg/public/source-serveur.js", "      if (actif.etat === 'sonne' && actif.sens === 'entrant' && !actif.lie) sonner(actif, null);", ""]], ["984"]],
  ["C31", "un état de caméra qui n'est pas un booléen est pris pour une caméra allumée", [["server-msg/public/source-serveur.js", "typeof x.camera === 'boolean' && x.camera !== c.distantCamera", "x.camera !== c.distantCamera"]], ["984"]],
  ["C32", "le second appareil de la personne ne laisse plus l'appel pris ailleurs", [["server-msg/public/source-serveur.js", "        } else { finir(c, 'pris_ailleurs', { service: true }); return; }", "        } else { return; }"]], ["984"]],
  ["C33", "une liaison perdue après avoir été établie dit « n'a pas pu s'établir » au lieu de « a été perdue »", [["server-msg/public/source-serveur.js", "finir(c, 'echec', { avis: c.etablie ? 'La connexion a été perdue.' : undefined });", "finir(c, 'echec', { avis: undefined });"]], ["984"]],
  ["C34", "une coupure brève relance la liaison tout de suite (plus de délai de grâce)", [["server-msg/public/source-serveur.js", "!== 'completed') relancer(c); }, T.deconnecte);", "!== 'completed') relancer(c); }, 0);"]], ["984"]],
  ["C35", "un appel depuis une conversation envoie l'identifiant d'une personne au lieu de la conversation", [["server-msg/public/source-serveur.js", "Object.assign({ type: spec.video ? 'video' : 'audio' }, conv ? { conv } : { uid: ids[0] })", "Object.assign({ type: spec.video ? 'video' : 'audio' }, { uid: ids[0] })"]], ["984"]],
  ["C36", "les pistes distantes ne sont plus rangées dans le flux de l'autre", [["server-msg/public/source-serveur.js", "        if (!c.flux.getTracks().includes(ev.track)) c.flux.addTrack(ev.track);          // un seul flux pour les deux pistes : l'autre n'associe aucun flux à ses émetteurs\n", ""]], ["984"]],
  ["C37", "la politique « max-bundle » n'est plus demandée au navigateur", [["server-msg/public/source-serveur.js", "const conf = { iceServers: c.serveurs, bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' };", "const conf = { iceServers: c.serveurs, rtcpMuxPolicy: 'require' };"]], ["984"]],
  ["C38", "la caméra est dite allumée dès que la page remet sa piste, avant qu'elle soit sur l'émetteur", [["server-msg/public/source-serveur.js", "const on = !!c.pistes.video && !!c.emetteurs.video && c.emetteurs.video.track === c.pistes.video;", "const on = !!c.pistes.video;"]], ["984"], {"equivalente": "les deux lectures donnent le même état FINAL (l'émetteur reçoit la piste juste après) : la différence est un signal « caméra » parti quelques millisecondes plus tôt chez l'appelé, avant son offre — le banc, qui attend l'état, ne peut pas la distinguer"}],
  ["C39", "un signal d'un AUTRE que le partenaire de l'appel est accepté par le moteur", [["server-msg/public/source-serveur.js", "      if (!de || s.de !== de) return;", "      if (!de) return;"]], ["984"], {"equivalente": "le service ne relaie un signal qu'au partenaire de l'appel et à son appareil lié : `de` est toujours le bon — la garde du moteur est une défense en profondeur que seul un service menteur mettrait à l'épreuve"}],
  ["C40", "un onglet qui n'a ni lancé ni pris l'appel traite les signaux", [["server-msg/public/source-serveur.js", "if (!c || c.fini || c.id !== s.appel || !(c.local || c.accepte)) return;", "if (!c || c.fini || c.id !== s.appel) return;"]], ["984"], {"equivalente": "l'événement « en cours » finit l'entrée de l'autre onglet (`pris_ailleurs`) avant qu'un signal puisse arriver : le service écrit l'événement avant que l'appelant voie « en cours », donc avant son offre — `c.fini` ignore déjà tout signal"}],
  ["C41", "un appel que cet onglet a REFUSÉ se remet à sonner quand une liste plus ancienne arrive (la sonnerie ne regarde plus les appels finis ici)", [["server-msg/public/source-serveur.js", "      if (finis.has(v.id)) return;", "      "]], ["984"]],
  ["C42", "la fin d'un appel n'est plus notée : la mémoire des appels finis ici reste vide", [["server-msg/public/source-serveur.js", "      noterFini(c.id);\n", ""]], ["984"]],
  ["D01", "la page demande micro et caméra à celui qui n'a pas encore répondu (la sonnerie ne s'arrête plus sur `return`)", [["apercu/opmessages/index.html", "annonceAppel('Appel ' + (snap.type === 'video' ? 'vidéo ' : '') + 'entrant de ' + snap.nom); return; }", "annonceAppel('Appel ' + (snap.type === 'video' ? 'vidéo ' : '') + 'entrant de ' + snap.nom); }"]], ["sonde"]],
  ["D02", "un appel entrant ne s'affiche plus tout seul dans la page", [["apercu/opmessages/index.html", "      if (ev.type === 'appel-entrant') surAppelEntrant(ev.id);\n", ""]], ["sonde"]],
  ["D03", "la sonnerie ne s'arrête plus quand on ferme l'écran sans répondre", [["apercu/opmessages/index.html", "    if (A) { A.fini = true; clearInterval(A.minut); arreterPistes(A); }\n    arreterSonnerie();\n", "    if (A) { A.fini = true; clearInterval(A.minut); arreterPistes(A); }\n"]], ["sonde"]],
  ["D04", "la sonnerie ne s'arrête plus quand on répond", [["apercu/opmessages/index.html", "    A.reponse = true; arreterSonnerie();", "    A.reponse = true;"]], ["sonde"]],
  ["D05", "aucune sonnerie n'est lancée pour un appel entrant", [["apercu/opmessages/index.html", "if (snap.entrant) { demarrerSonnerie(); annonceAppel(", "if (snap.entrant) { annonceAppel("]], ["sonde"]],
  ["D06", "la voix de l'autre n'est plus branchée sur l'élément audio", [["apercu/opmessages/index.html", "    lierFluxDistant(A);\n    majStatutAppel();\n  }", "    majStatutAppel();\n  }"]], ["sonde"]],
  ["D07", "les pistes de la page ne sont plus remises au moteur : l'autre n'entend rien", [["apercu/opmessages/index.html", "    majCamera(A);\n    pousserPistes(A);\n    if (A.video && CAP.appelsMedias) compterCameras(A);\n  }", "    majCamera(A);\n    if (A.video && CAP.appelsMedias) compterCameras(A);\n  }"]], ["sonde"]],
  ["D08", "« Nouvel appel » accepte plusieurs contacts (un appel se passe à deux)", [["apercu/opmessages/index.html", "    if (G.mode === 'appel' && CAP.appelsMedias) G.choisis = i < 0 ? [id] : [];            // (version servie) un appel se passe à deux : UN contact, le suivant remplace le précédent\n    else if (i < 0)", "    if (i < 0)"]], ["sonde"]],
  ["D09", "la caméra d'un groupe lance un appel (le service le refuse, mais la page ne le dit plus avant)", [["apercu/opmessages/index.html", "    if (CAP.appelsMedias && c.type !== 'direct') { mot('Les appels à plusieurs arrivent bientôt.'); return; }       // (version servie) un appel se passe à deux ; un groupe, un canal, une réunion : l'étape suivante\n", ""]], ["sonde"]],
  ["D10", "un refus du service à l'appel redevient une phrase générique", [["apercu/opmessages/index.html", "mot(phrase(refus, 'L\\'appel n\\'a pas pu être lancé.')); return false; }", "mot('L\\'appel n\\'a pas pu être lancé.'); return false; }"]], ["sonde"]],
  ["D11", "la page qui se ferme ne coupe plus la liaison ni ne raccroche", [["apercu/opmessages/index.html", "    if (CAP.appelsMedias && typeof source.appelFermeture === 'function') source.appelFermeture();", ""]], ["sonde"]],
  ["D12", "les commandes de l'appel entrant ne s'affichent jamais", [["apercu/opmessages/index.html", "    if (s.entrant) E.setAttribute('data-entrant', '1'); else E.removeAttribute('data-entrant');", "    E.removeAttribute('data-entrant');"]], ["sonde"]],
  ["D13", "« Refuser » ne fait plus rien", [["apercu/opmessages/index.html", "$('appel-refuser').addEventListener('click', () => { const A = etat.appelUI; if (A && A.snap && A.snap.entrant) fermerCouche(); });", "$('appel-refuser').addEventListener('click', () => {});"]], ["sonde"]],
  ["D14", "la mention « Aperçu — les autres participants sont simulés » et le haut-parleur reparaissent dans la version servie", [["apercu/opmessages/index.html", "html[data-service] .appel-mention, html[data-service] #appel-hp { display: none; }\n", ""]], ["sonde"]],
  ["D15", "les avis de fin (« a refusé l'appel », « Pas de réponse. ») ne sont plus dits", [["apercu/opmessages/index.html", "if (snap.etat === 'termine') { if (snap.avis) mot(snap.avis); fermerCouche(); return; }", "if (snap.etat === 'termine') { fermerCouche(); return; }"]], ["sonde"]],
  ["D16", "la caméra de l'AUTRE ne fait plus passer l'appel en vidéo", [["apercu/opmessages/index.html", "    if (mise === 'audio' && CAP.appelsMedias && s.membres[0] && s.membres[0].camera) mise = 'video';       // (version servie) la caméra de l'AUTRE fait aussi passer l'appel en vidéo\n", ""]], ["sondeComplete"]],
  ["D17", "la caméra de la page n'est plus remise au moteur (l'autre ne voit pas l'image)", [["apercu/opmessages/index.html", "source.appelPistes(A.id, { audio: A.audio, video: A.video && A.video.readyState === 'live' ? A.video : null });", "source.appelPistes(A.id, { audio: A.audio, video: null });"]], ["sondeComplete"]],
  ["D18", "« Message » pendant un appel ne raccroche plus", [["apercu/opmessages/index.html", "$('appel-msg').addEventListener('click', () => { const A = etat.appelUI; if (A && A.snap) ouvrirConversationAvec(A.snap.membres.map(m => m.id), A.snap.conv); });", "$('appel-msg').addEventListener('click', () => {});"]], ["sondeComplete"]],
  ["D19", "l'écran « Nouvel appel » garde le titre « Appel de groupe »", [["apercu/opmessages/index.html", "appel ? (CAP.appelsMedias ? 'Nouvel appel' : 'Appel de groupe') : 'Nouveau groupe';", "appel ? 'Appel de groupe' : 'Nouveau groupe';"]], ["sonde"]],
  ["D20", "retourner la caméra n'arrête pas l'ancienne piste (deux pistes vivantes : le voyant reste allumé)", [["apercu/opmessages/index.html", "    try { ancienne.stop(); } catch (e) { /* déjà arrêtée */ }\n    let f = null, dit = '';", "    let f = null, dit = '';"]], ["sondeComplete"]],
  ["D21", "retourner la caméra redemande toujours l'ARRIÈRE (le second retournement ne revient pas à l'avant)", [["apercu/opmessages/index.html", "const vers = A.face === 'environment' ? 'user' : 'environment';", "const vers = 'environment';"]], ["sondeComplete"]],
  ["D22", "la caméra neuve est demandée AVANT d'arrêter l'ancienne (un téléphone n'ouvre pas deux caméras à la fois)", [["apercu/opmessages/index.html", "    try { ancienne.stop(); } catch (e) { /* déjà arrêtée */ }\n    let f = null, dit = '';\n    try { f = await gum({ video: { facingMode: { ideal: vers } } }); A.face = vers; }\n", "    let f = null, dit = '';\n    try { f = await gum({ video: { facingMode: { ideal: vers } } }); A.face = vers; try { ancienne.stop(); } catch (e) { /* déjà arrêtée */ } }\n"]], ["859"]],
  ["D23", "« Retourner la caméra » paraît même avec UNE seule caméra", [["apercu/opmessages/index.html", "A.camera && A.nbCam > 1);", "A.camera && A.nbCam > 0);"]], ["sondeComplete"]],
  ["D24", "le nombre de caméras n'est jamais compté : « Retourner la caméra » ne paraît jamais", [["apercu/opmessages/index.html", "    if (A.video && CAP.appelsMedias) compterCameras(A);\n", ""]], ["sondeComplete"]],
];
for (const [id, nom, edits, suites, o] of CATALOGUE) MUTATIONS.push(Object.assign({ id, nom, edits, suites, sonde: suites.some((s) => s === 'sonde' || s === 'sondeComplete') }, o || {}));

/* ══ LE LANCEUR ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const DOSSIERS_COPIE = ['server-msg', 'server', 'design/opmessages', '.github', 'apercu/opmessages', 'icons', 'scripts'];   // `.github` ENTIER : test-934 lit les workflows autant que les scripts de surveillance
function copier(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copier(s, d); else fs.copyFileSync(s, d);
  }
}
function fabriquerCopie() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-app-'));
  for (const d of DOSSIERS_COPIE) copier(path.join(RACINE, d), path.join(dir, d));
  fs.mkdirSync(path.join(dir, 'tests'));
  for (const f of fs.readdirSync(path.join(RACINE, 'tests'))) if (/^(test-9\d\d|test-859|mutations-opmessages|outils-[\w-]+|bac-messages|bac-turn|bac-webrtc|lib-horloge-msg|mode-site|sonde-opmessages-appels)\.js$/.test(f)) fs.copyFileSync(path.join(RACINE, 'tests', f), path.join(dir, 'tests', f));
  fs.symlinkSync(path.join(RACINE, 'server-msg', 'node_modules'), path.join(dir, 'server-msg', 'node_modules'));
  fs.symlinkSync(path.join(RACINE, 'server', 'node_modules'), path.join(dir, 'server', 'node_modules'));
  return dir;
}
const estSonde = (s) => s === 'sonde' || s === 'sondeComplete';
const nomBanc = (s) => s === 'sonde' ? 'la sonde (rapide)' : s === 'sondeComplete' ? 'la sonde (complète)' : 'test-' + s;
function lancer(dir, suite) {
  return new Promise((resolve) => {
    const sonde = estSonde(suite);
    const f = sonde ? SONDE_FICHIER : fs.readdirSync(path.join(dir, 'tests')).find(x => x.startsWith('test-' + suite) && x.endsWith('.js'));
    /* ⛔ la sonde lance un VRAI Chromium, dont le dossier de profil porte une prise Unix (`SingletonSocket`, 107 octets de chemin au plus) : sous un TMPDIR long (le brouillon d'une session distante),
       « le navigateur ne démarre pas ». La sonde garde donc un TMPDIR COURT (`TMPDIR_SONDE`, par défaut /tmp), les copies, elles, restent où on les met. */
    const env = Object.assign({}, process.env, sonde ? { NODE_PATH: process.env.NODE_PATH || '/opt/node22/lib/node_modules/playwright/node_modules', TMPDIR: process.env.TMPDIR_SONDE || '/tmp' } : {});
    const p = spawn(process.execPath, [path.join(dir, 'tests', f)].concat(suite === 'sonde' ? ['--rapide'] : []), { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], env });
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
      /* ⛔ UN BANC QUI SE TAIT N'EST PAS UN BANC VERT : une promesse qui ne se résout jamais vide la boucle d'évènements et le processus sort en 0, SANS total. Pas de « N ✓ M ✗ » imprimé = le banc est MORT, il TOMBE. */
      if (r.code !== 0 || r.ko === null || r.ko > 0) {
        const ligne = (r.sortie.split('\n').find(l => l.includes('✗')) || r.sortie.split('\n').filter(Boolean).slice(-1)[0] || '').trim().slice(0, 170);
        const lignes = r.sortie.split('\n').filter(l => l.includes('✗')).map(l => l.trim()).slice(0, 14);
        return { id, nom, verdict: 'TOMBE', detail: nomBanc(s) + ' (' + (r.ko === null ? 'MORT, code ' + r.code + ', aucun total imprimé' : r.ko + ' ✗') + ') — ' + ligne, lignes: r.ko === null ? lignes.concat(r.sortie.split('\n').filter(Boolean).slice(-3)) : lignes, mut };
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
        const ok = estSonde(s) ? fs.existsSync(path.join(RACINE, 'tests', SONDE_FICHIER)) : fs.readdirSync(path.join(RACINE, 'tests')).some(x => x.startsWith('test-' + s) && x.endsWith('.js'));
        if (!BANCS.includes(s) || !ok) { mal++; console.log('  ✗ ' + mut.id + ' : le banc « ' + s + ' » n\'existe pas'); }
      }
      if (!!mut.sonde !== mut.suites.some(estSonde)) { mal++; console.log('  ✗ ' + mut.id + ' : ses bancs et son drapeau `sonde` ne disent pas la même chose'); }
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-app-verif-'));
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
  const avecSonde = liste.some(x => x.suites.some(estSonde));
  /* les mutations jouées par la sonde ne se lancent pas en parallèle : deux navigateurs et deux services se volent le processeur, et la sonde mesure du temps */
  const copies = Array.from({ length: avecSonde ? 1 : Math.min(NB_COPIES, liste.length) }, fabriquerCopie);
  const nettoyer = () => { for (const d of copies) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } } };
  process.on('SIGINT', () => { nettoyer(); process.exit(130); });
  /* ⛔ LE TÉMOIN. Une suite qui MEURT dans la copie (un fichier que la copie n'emporte pas, un `require` qui échoue) a l'air de « tomber » à chaque mutation, sans rien prouver. Chaque banc visé
     tourne donc d'abord, UNE fois, sur une copie INTACTE : s'il n'y est pas vert, rien n'est joué et la sortie dit pourquoi. */
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
  if (args.includes('--temoins')) { nettoyer(); process.exit(0); }       // seulement les témoins : de quoi savoir, avant d'attendre une heure, que chaque banc visé tourne dans une copie
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
