/* ══ LES MUTATIONS DES RÉUNIONS PROGRAMMÉES — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » (CLAUDE.md) ═══════════════════════════════
   Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il remet, UN PAR UN, les défauts que `tests/test-970` à `976`, `905`, `906`, `934`,
   `941`, `950` et la sonde navigateur `sonde-opmessages-reunions.js` gardent — l'heure d'une série calculée en ajoutant 7 × 24 h, une heure absente ou vécue deux fois lue de travers,
   un `UNTIL` en heure locale, un titre qui ouvre une ligne du fichier .ics ; une réunion qui se lit sans y être invité, un invité qui modifie, un changement d'horaire qui laisse
   « décliné » celui qui ne peut plus venir ; un rappel qui part deux fois, un bail qui ne s'éteint jamais, un rappel du passé renvoyé après une restauration ; un effacement qui
   revient d'une archive d'avant, un rejeu qui écrit une ligne de plus au registre ; un courriel qui part sans son plafond, une pièce jointe qui n'est pas la bonne, un secret affiché ;
   une route sans sa garde, un code d'erreur que l'écran ne sait pas dire — dans une COPIE de l'arbre (jamais dans l'arbre lui-même : le `git checkout` d'après-mutation de CLAUDE.md
   efface aussi les correctifs non commités), joue les bancs visés, et exige qu'AU MOINS UN tombe (code de sortie non nul ou un « ✗ »).

   ⛔ UNE MUTATION DONT LE MOTIF NE TROUVE RIEN EST MAL VISÉE, et le lanceur le DIT au lieu de conclure : il vérifie que le motif se trouve EXACTEMENT UNE fois
   (`s.replace(motif, autre, 1)` frappe la PREMIÈRE occurrence du fichier, pas celle qu'on croit — pris le 22 septembre 2026), que le texte a changé, ET que le fichier
   muté se lit encore (`node --check`) : une suite qui MEURT sur une faute de syntaxe de la mutation a l'air de « tomber » et ne prouve rien.
   ⛔ UNE MUTATION QUI SURVIT n'est pas forcément un banc aveugle : une autre garde peut la neutraliser (une garde de route ET une garde du stockage ; deux contrôles de la règle annuelle
   d'un fuseau). Ces mutations-là sont marquées `equivalente` : on les joue quand même, et ELLES DOIVENT SURVIVRE (« ≡ ») — c'est la preuve que la garde restante tient seule. Le défaut RÉEL
   s'écrit alors avec LES DEUX retirées (`m2`). Si une « équivalente » TOMBE, la raison donnée est fausse : le lanceur le crie.
   ⛔ LA COPIE EST FABRIQUÉE DEPUIS L'ARBRE COMMITÉ OU NON : lancer ce fichier APRÈS `git commit` du correctif, jamais avant (correctif → banc → commit → mutation → `git checkout`).
   Elle emporte aussi `server/` (le VRAI OP GESTION que lancent certains bancs en boucle locale).

   Lancer :  TMPDIR=/un/dossier node tests/mutations-reunions.js                 (toutes, hors sondes navigateur)
             NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/mutations-reunions.js --sondes     (les mutations jouées par la sonde navigateur)
             node tests/mutations-reunions.js I01 S05                             (seulement celles-là)
             node tests/mutations-reunions.js --verifier                         (ne joue rien : chaque motif se trouve UNE fois dans l'arbre, chaque banc existe)
             node tests/mutations-reunions.js --liste                            (le catalogue)
             --copies=N (défaut 2)   --garder ID (fabrique UNE copie mutée, l'imprime et s'arrête)   --sans-temoin   --temoins (ne joue que les témoins)   --details=FICHIER (tous les ✗ de chaque mutation qui tombe)
   Deux copies en parallèle, un délai par banc ; les sondes une à la fois (deux navigateurs et deux services se volent le processeur, et la sonde mesure du temps). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn, spawnSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const DELAI_MS = 300000;
const F = {
  cal: 'server-msg/calendrier.js', ics: 'server-msg/ics.js', stock: 'server-msg/stockage.js', app: 'server-msg/app.js', man: 'server-msg/manifeste.js',
  routes: 'server-msg/routes.js', reu: 'server-msg/routes-reunions.js', outils: 'server-msg/reunions-outils.js', plan: 'server-msg/planificateur.js', mail: 'server-msg/courriel.js', conf: 'server-msg/config.js', index: 'server-msg/index.js',
  compte: 'server-msg/compte.js', rejeu: 'server-msg/rejeu.js', surv: '.github/scripts/surveillance-messages.js',
  src: 'server-msg/public/source-serveur.js', api: 'server-msg/public/api.js', page: 'apercu/opmessages/index.html', cfgmail: 'server-msg/configurer-courriel.js',
};
const BANCS = ['901', '905', '906', '934', '941', '950', '970', '971', '972', '973', '974', '975', '976', 'sonde'];
const SONDE_FICHIER = 'sonde-opmessages-reunions.js';
const MUTATIONS = [];
/* m(id, nom, fichier, ancien, nouveau, suites) — `ancien` : une chaîne, ou une expression régulière (une seule occurrence, `$1` permis dans `nouveau`) */
const m = (id, nom, fichier, ancien, nouveau, suites, o) => MUTATIONS.push(Object.assign({ id, nom, edits: [[fichier, ancien, nouveau]], suites }, o || {}));
const m2 = (id, nom, edits, suites, o) => MUTATIONS.push(Object.assign({ id, nom, edits, suites }, o || {}));
const EQ = (raison) => ({ equivalente: raison });
const SONDE = { sonde: true };

/* ══ 1. LE CALENDRIER — l'heure d'une réunion se calcule dans SON fuseau (calendrier.js) ═════════════════════════════════════════════════════════════════════ */
m('C01', '« 1 jour avant » redevient 24 heures exactes : le rappel de la veille d\'un jour de bascule tombe à la mauvaise heure locale', F.cal,
  "if (avantMin !== 1440) return debut - avantMin * MIN;", "return debut - avantMin * MIN;", ['970', '971']);
m('C02', 'une heure locale qui N\'EXISTE PAS (le trou de mars) est lue avec le décalage d\'APRÈS le trou : la réunion de 02:30 tombe une heure trop tard', F.cal,
  "if (!bons.length) return naif - avant;", "if (!bons.length) return naif - apres;", ['970', '971']);
m('C03', 'une heure vécue DEUX FOIS (la nuit d\'octobre) est lue à sa seconde passe : l\'agenda de la personne la lira à la première', F.cal,
  "return Math.min.apply(null, bons);", "return Math.max.apply(null, bons);", ['970', '971']);
m('C04', 'la boucle d\'occurrences s\'arrête à 5 000 périodes : une série quotidienne sans fin disparaît en silence au bout de quatorze ans', F.cal,
  "const PERIODES_MAX = 40000;", "const PERIODES_MAX = 5000;", ['970']);
m('C05', 'le 31 d\'une série mensuelle est DÉCALÉ au 30 (au dernier jour du mois) au lieu d\'être sauté', F.cal,
  "return anc.j <= joursDansMois(a, m) ? { a, m, j: anc.j } : null;", "return { a, m, j: Math.min(anc.j, joursDansMois(a, m)) };", ['970', '971']);
m('C06', 'la fin d\'une série par DATE exclut son dernier jour (la limite est l\'instant 23:59:59 locale, pas minuit)', F.cal,
  "if (limite !== null && t > limite) break;\n    if (t >= du", "if (limite !== null && t > limite - 86400000) break;\n    if (t >= du", ['970', '971']);
m('C07', 'la fin d\'une série par date n\'est plus appliquée à l\'instant (seul le jour compte, avec un jour de marge)', F.cal,
  "if (limite !== null && t > limite) break;\n    if (t >= du", "if (t >= du", ['970', '971']);
m('C08', '`derniereDate` ignore la limite par NOMBRE : une série de quatre fois a une fin lointaine (le fichier décrirait trop d\'années)', F.cal,
  "    if (s.n && valides >= s.n) break;\n    if (nJusqua !== null && numeroJour(d) > nJusqua) break;", "    if (nJusqua !== null && numeroJour(d) > nJusqua) break;", ['970']);
m('C09', 'une date qui n\'existe pas (le 31 avril) est acceptée par la lecture d\'une heure locale', F.cal,
  "p.j > joursDansMois(p.a, p.m) || p.h > 23", "p.h > 23", ['970']);

/* ══ 2. LE FICHIER .ICS — ce que l'agenda de la personne lira (ics.js) ═════════════════════════════════════════════════════════════════════════════════════════ */
m('I01', 'UNTIL s\'écrit en heure LOCALE alors que DTSTART porte un fuseau (la RFC l\'exige en UTC) : l\'agenda coupe la série au mauvais instant', F.ics,
  "parties.push('UNTIL=' + enUtc(cal.limiteDe(s)));", "parties.push('UNTIL=' + enLocal(cal.limiteDe(s), r.tz));", ['971']);
m('I02', 'UNTIL et COUNT s\'écrivent ENSEMBLE quand la série porte les deux limites (la RFC l\'interdit : certains agendas refusent le fichier)', F.ics,
  "if (s.n && s.jusqua) parties.push('COUNT=' + cal.compter(s, s.n + 1));", "if (false) parties.push('COUNT=' + cal.compter(s, s.n + 1));", ['971']);
m('I03', 'avec les deux limites, COUNT vaut le nombre DEMANDÉ et non le nombre d\'occurrences réelles : la série dépasse sa date de fin', F.ics,
  "parties.push('COUNT=' + cal.compter(s, s.n + 1));", "parties.push('COUNT=' + s.n);", ['971']);
m('I04', '« 1 jour avant » d\'une série devient la durée exacte de 24 heures (l\'agenda sonne à la mauvaise heure le jour d\'un changement d\'heure)', F.ics,
  "const declenche = m === 1440 && serie ? '-P1D'", "const declenche = m === 1440 && false ? '-P1D'", ['971']);
m('I05', 'l\'identifiant d\'une occurrence est celui de sa série : l\'importer remplace toute la série par cette seule date', F.ics,
  "if (r.rep !== 'aucune') uid += '-' + enUtc(debut).replace(/[^0-9TZ]/g, '');", "", ['971']);
m('I06', 'le pliage à 75 octets coupe un caractère UTF-8 en deux (un émoji, une lettre accentuée à cheval sur la limite)', F.ics,
  "if (fin < buf.length) while (fin > debut && (buf[fin] & 0xC0) === 0x80) fin--;", "", ['971']);
m('I07', 'les lignes de suite comptent 75 octets en plus de l\'espace de tête : 76 octets, hors limite', F.ics,
  "const max = morceaux.length === 0 ? 75 : 74;", "const max = morceaux.length === 0 ? 75 : 75;", ['971']);
m('I08', 'le point-virgule d\'un titre n\'est plus échappé : il ouvre un paramètre de propriété', F.ics,
  ".replace(/;/g, '\\\\;')", "", ['971']);
m('I09', 'la virgule d\'un titre n\'est plus échappée : elle sépare deux valeurs', F.ics,
  ".replace(/,/g, '\\\\,')", "", ['971']);
m('I10', 'la barre oblique inverse d\'un titre n\'est plus échappée : « a\\nb » tapé par la personne devient un saut de ligne dans l\'agenda', F.ics,
  "l.replace(/\\\\/g, '\\\\\\\\')", "l", ['971']);
m('I11', 'un retour chariot SEUL n\'est plus un saut de ligne : il passe dans le fichier et ouvre une ligne', F.ics,
  ".replace(/\\r\\n|\\r|\\u0085|\\u2028|\\u2029/g, '\\n')", ".replace(/\\r\\n|\\u0085|\\u2028|\\u2029/g, '\\n')", ['971']);
m('I12', 'les caractères de contrôle d\'un titre ne sont plus retirés', F.ics,
  ".replace(/[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]/g, '')", "", ['971']);
m('I13', 'une SÉRIE est écrite en UTC, sans fuseau ni VTIMEZONE : l\'agenda la décale d\'une heure à chaque changement d\'heure', F.ics,
  "event.push('DTSTART;TZID=' + r.tz + ':' + enLocal(debut, r.tz),", "event.push('DTSTART:' + enUtc(debut),", ['971']);
m('I14', 'la règle annuelle d\'un changement d\'heure européen devient « le PREMIER dimanche » au lieu du dernier', F.ics,
  "return { mois: l0.getUTCMonth() + 1, jour: l0.getUTCDay(), rang: -1 };", "return { mois: l0.getUTCMonth() + 1, jour: l0.getUTCDay(), rang: 1 };", ['971']);
m('I15', 'le signe des décalages négatifs se perd dans le VTIMEZONE (New York à l\'est de Greenwich)', F.ics,
  "return (ms < 0 ? '-' : '+') + p2(Math.floor(m / 60)) + p2(m % 60);", "return '+' + p2(Math.floor(m / 60)) + p2(m % 60);", ['971']);
m('I16', 'le jour de la semaine d\'une série hebdomadaire n\'est plus écrit (BYDAY) : un agenda naïf ne sait plus quel jour répéter', F.ics,
  "parties.push('FREQ=WEEKLY', 'BYDAY=' + JOURS[cal.jourSemaine(c)]);", "parties.push('FREQ=WEEKLY');", ['971']);
m('I17', 'le jour du mois d\'une série mensuelle n\'est plus écrit (BYMONTHDAY) : le 31 retombe sur le jour du début', F.ics,
  "else parties.push('FREQ=MONTHLY', 'BYMONTHDAY=' + c.j);", "else parties.push('FREQ=MONTHLY');", ['971']);
m('I18', 'une réunion ANNULÉE s\'exporte encore « confirmée » : l\'agenda ne la barre pas', F.ics,
  "event.push('STATUS:' + (r.annulee ? 'CANCELLED' : 'CONFIRMED'), 'TRANSP:OPAQUE');", "event.push('STATUS:CONFIRMED', 'TRANSP:OPAQUE');", ['971']);
m('I19', 'la version de la réunion (SEQUENCE) ne monte plus : l\'agenda ne remplace pas l\'événement qu\'il avait', F.ics,
  "'SEQUENCE:' + (r.version | 0)]", "'SEQUENCE:0']", ['971']);
m('I20', 'un rappel que le service ne connaît pas (7 minutes, un texte) entre dans le fichier', F.ics,
  "(o.rappels || []).filter((m) => cal.RAPPELS_PERMIS.includes(m)).sort((a, b) => a - b)", "(o.rappels || []).sort((a, b) => a - b)", ['971']);
m('I21', 'les changements de décalage sont sondés tous les 90 jours : deux changements proches (le ramadan du Maroc) échappent', F.ics,
  "const n = Math.min(t + 7 * cal.JOUR, a), on", "const n = Math.min(t + 90 * cal.JOUR, a), on", ['971']);
m('I22', 'le VTIMEZONE n\'a plus d\'état de départ : un agenda qui lit une heure avant le premier changement devine', F.ics,
  "composant(genreDepart, o0, o0, de, ['DTSTART:19700101T000000']);", "", ['971']);
m('I23', 'la fin d\'une série est écrite en UTC quand son début est local : la durée change d\'un agenda à l\'autre', F.ics,
  "'DTEND;TZID=' + r.tz + ':' + enLocal(fin, r.tz)", "'DTEND:' + enUtc(fin)", ['971']);
m('I24', 'le nom du fichier garde ses accents (« é » devient « - » au lieu de « e »)', F.ics,
  ".normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')", "", ['971']);
m('I25', 'le nom du fichier n\'est plus borné : un titre de 300 lettres fait un nom de 300 lettres', F.ics,
  ".slice(0, 40).replace(/-+$/, '')", ".replace(/-+$/, '')", ['971']);
m('I26', 'le VTIMEZONE ne décrit que dix ans, même pour une série bornée plus loin : au-delà, l\'agenda garde le dernier décalage connu', F.ics,
  "const a1 = derniere ? Math.min(a0 + 30, derniere.a) : a0 + 10;", "const a1 = a0 + 10;", ['971']);
m('I27', 'un fuseau inconnu produit quand même un fichier (avec un décalage inventé)', F.ics,
  "if (cal.tzValide(r.tz) === null) return null;", "", ['971']);
m('I28', 'un instant qui n\'est pas une occurrence de la série est servi comme la série entière', F.ics,
  "if (!occ) return null;", "if (!occ) return fichier(r, Object.assign({}, o, { occurrence: null }));", ['971']);
m('I29', 'une règle annuelle est déduite d\'UN SEUL changement', F.ics,
  "if (trs.length < 2) return null;", "if (trs.length < 1) return null;", ['971']);
m('I30', 'la règle annuelle ne vérifie plus que les changements tombent le même jour de la semaine (une date fixe passe pour « le dimanche »)', F.ics,
  "|| d.getUTCDay() !== l0.getUTCDay() ||", "||", ['971']);
m('I31', 'les changements vers l\'été et vers l\'hiver n\'ont plus besoin d\'être en nombre égal pour déduire une règle', F.ics,
  "&& vers(true).length === vers(false).length) {", ") {", ['971'],
  EQ('`regleAnnuelle` refuse déjà un sens qui n\'a qu\'un changement (« moins de deux ») : les deux gardes se neutralisent'));
m2('I32', 'les DEUX gardes ensemble — une règle déduite d\'un seul changement ET sans égalité entre les sens : Vancouver (heure d\'été permanente) reçoit une règle annuelle pour un retour à l\'hiver qui n\'existe plus',
  [[F.ics, "if (trs.length < 2) return null;", "if (trs.length < 1) return null;"], [F.ics, "&& vers(true).length === vers(false).length) {", ") {"]], ['971']);
m('I33', 'la règle annuelle ne vérifie plus l\'HEURE du changement', F.ics,
  "|| !memeHeure(d)) return null;", ") return null;", ['971']);
m('I34', 'la règle annuelle ne vérifie plus que les décalages (avant, après) sont les mêmes d\'une année à l\'autre', F.ics,
  "if (tr.avant !== premier.avant || tr.apres !== premier.apres || d.getUTCMonth()", "if (d.getUTCMonth()", ['971']);
m('I35', 'le « n-ième dimanche » n\'exige plus un rang CONSTANT (Jérusalem : tantôt le quatrième vendredi, tantôt le cinquième)', F.ics,
  "if (trs.every((tr) => rang(localAvant(tr)) === r0)) return", "if (true) return", ['971']);
m('I36', 'le « dernier dimanche » est jugé sur le premier changement seulement', F.ics,
  "if (trs.every((tr) => dernier(localAvant(tr)))) return", "if (dernier(localAvant(trs[0]))) return", ['971']);

/* ══ 3. LE STOCKAGE DES RÉUNIONS — ce qui est rangé, ce qui s'efface, ce qui se rejoue (stockage.js, migration 7) ══════════════════════════════════════════════ */
m('S01', 'le bail du planificateur n\'est plus refusé à une AUTRE instance tant qu\'il vit : deux instances envoient les rappels', F.stock,
  "if (b && b.proprietaire !== proprietaire && num(b.expire) > t) return false;", "if (false) return false;", ['972']);
m('S02', 'le bail ne EXPIRE jamais : une instance morte sans le rendre bloque tous les rappels pour toujours', F.stock,
  "if (b && b.proprietaire !== proprietaire && num(b.expire) > t) return false;", "if (b && b.proprietaire !== proprietaire) return false;", ['972']);
m('S03', 'rendre un bail l\'efface même quand il appartient à une autre instance', F.stock,
  "DELETE FROM planif_bail WHERE id = 1 AND proprietaire = ?", "DELETE FROM planif_bail WHERE id = 1 AND ? IS NOT NULL", ['972']);
m('S04', 'le registre des rappels REMPLACE au lieu d\'ignorer : un rappel se renvoie à chaque passage', F.stock,
  "INSERT OR IGNORE INTO rappel(reunion, occurrence, uid, avant, ts)", "INSERT OR REPLACE INTO rappel(reunion, occurrence, uid, avant, ts)", ['972']);
m('S05', 'la notification d\'un rappel part même quand il était déjà parti (la ligne du registre n\'est plus consultée)', F.stock,
  "      if (num(r.changes) !== 1) return null;\n      return notifCreer({ uid, type: 'reunion_rappel'", "      return notifCreer({ uid, type: 'reunion_rappel'", ['972']);
m('S06', 'un changement d\'horaire ne remet plus les réponses « en attente » : celui qui avait décliné l\'ancienne heure manque la nouvelle', F.stock,
  "      if (horaire) Q(`UPDATE reunion_invite SET statut = 'attente', repondu = NULL WHERE reunion = ? AND uid <> ?`).run(id, r.hote);\n", "", ['972']);
m('S07', 'un changement d\'horaire remet AUSSI l\'hôte « en attente »', F.stock,
  "SET statut = 'attente', repondu = NULL WHERE reunion = ? AND uid <> ?", "SET statut = 'attente', repondu = NULL WHERE reunion = ? AND ? IS NOT NULL", ['972']);
m('S08', '`horaire_le` avance à chaque modification, même celle du seul titre : un rappel dû pendant un arrêt devient « jamais dû »', F.stock,
  "nouveau.rappels, t, horaire ? t : num(r.horaire_le),", "nouveau.rappels, t, t,", ['972']);
m('S09', 'annuler ne se note plus au registre des purges : une restauration d\'une archive d\'avant rend la réunion active à ceux qui s\'y rendraient', F.stock,
  "      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(id, 'reunion_annulee', t);\n", "", ['972', '950']);
m('S10', 'annuler garde la prochaine occurrence : le planificateur rappelle encore une réunion annulée', F.stock,
  "UPDATE reunion SET annulee = 1, prochain = NULL, version = version + 1, maj = ? WHERE id = ?", "UPDATE reunion SET annulee = 1, version = version + 1, maj = ? WHERE id = ?", ['972']);
m('S11', 'supprimer ne dit plus à chaque participant que la réunion n\'existe plus (plus d\'événement adressé)', F.stock,
  "      for (const u of participants) journalAjouter('reunion', null, u, id);\n", "", ['972']);
m('S12', 'supprimer ne note plus la conversation au registre : une restauration d\'une archive d\'avant ramène la réunion et son chat', F.stock,
  "const x = convSupprimer(r.conv);   // notée au registre", "const x = convSupprimer(r.conv, { noter: false });   // notée au registre", ['972', '950']);
m('S13', 'retirer un invité ne se note plus (`reunion_invite`) : une archive d\'avant le remet dans la réunion', F.stock,
  "      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(id + '|' + uid + '|' + t, 'reunion_invite', t);\n      membreRetirer(", "      membreRetirer(", ['972']);
m('S14', 'retirer un invité ne le prévient plus (plus d\'événement adressé) : la réunion reste dans son agenda', F.stock,
  "      journalAjouter('reunion', null, uid, id);\n      return { gid: journalAjouter('reunion', r.conv, null, id) };", "      return { gid: journalAjouter('reunion', r.conv, null, id) };", ['972']);
m('S15', 'on peut retirer l\'HÔTE de sa propre réunion', F.stock,
  "      if (uid === r.hote) throw erreur('hote_non_retirable');\n", "", ['972']);
m('S16', 'l\'hôte répond à sa propre réunion (et peut se mettre « décliné » : plus de rappel pour lui)', F.stock,
  "      if (uid === r.hote) throw erreur('hote_reponse');\n", "", ['972']);
m('S17', 'on répond encore à une réunion annulée', F.stock,
  "      if (r.annulee) throw erreur('reunion_annulee');\n      if (i.statut === statut)", "      if (i.statut === statut)", ['972']);
m('S18', 'un invité modifie la réunion (la garde défensive du stockage ne vérifie plus l\'hôte)', F.stock,
  "if (r.hote !== par) throw erreur('interdit');\n      if (r.annulee) throw erreur('reunion_annulee');\n      const t = horloge();\n      const ancienTitre", "if (r.annulee) throw erreur('reunion_annulee');\n      const t = horloge();\n      const ancienTitre", ['972']);
m('S19', 'un invité annule la réunion', F.stock,
  "if (r.hote !== par) throw erreur('interdit');\n      if (r.annulee) return { change: false, gid: 0 };", "if (r.annulee) return { change: false, gid: 0 };", ['972']);
m('S20', 'un invité supprime la réunion', F.stock,
  "if (r.hote !== par) throw erreur('interdit');\n      const participants = reunionParticipants(id);", "const participants = reunionParticipants(id);", ['972']);
m('S21', 'on modifie une réunion annulée', F.stock,
  "if (r.hote !== par) throw erreur('interdit');\n      if (r.annulee) throw erreur('reunion_annulee');\n      const t = horloge();", "if (r.hote !== par) throw erreur('interdit');\n      const t = horloge();", ['972']);
m('S22', 'un compte effacé ne passe plus par ses réunions : l\'hôte effacé garde la sienne, l\'invité effacé y figure encore', F.stock,
  "      const reunions = reunionsQuitterTout(uid, { rejeu });\n      pieces.push(...reunions.pieces); convs.push(...reunions.convs);\n", "", ['972']);
m('S23', 'le rejeu d\'un effacement ÉCRIT au registre la sortie d\'un invité (une ligne de plus, rejouée contre des gens qui y étaient encore)', F.stock,
  "      if (!rejeu) Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(x.id + '|' + uid + '|' + t, 'reunion_invite', t);", "      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(x.id + '|' + uid + '|' + t, 'reunion_invite', t);", ['972']);
m('S24', 'le rejeu d\'un effacement écrit au registre la sortie de la conversation', F.stock,
  "        if (!rejeu) sortieNoter(x.conv, uid, t, false);", "        sortieNoter(x.conv, uid, t, false);", ['972']);
m('S25', 'le rejeu d\'un effacement note la suppression d\'une réunion que la COPIE réduit à l\'hôte effacé', F.stock,
  "convSupprimer(r.conv, { noter: !rejeu }).pieces); convs.push(r.conv); continue; }", "convSupprimer(r.conv, { noter: true }).pieces); convs.push(r.conv); continue; }", ['972']);
m('S26', 'la relève de l\'hôte ne préfère plus celui qui a ACCEPTÉ : le plus ancien invité prend la réunion, répondu ou non', F.stock,
  "ORDER BY (i.statut = 'accepte') DESC, i.cree, i.rowid LIMIT 1", "ORDER BY i.cree, i.rowid LIMIT 1", ['972']);
m('S27', 'la relève de l\'hôte peut tomber sur quelqu\'un qui a DÉCLINÉ', F.stock,
  "WHERE i.reunion = ? AND i.uid <> ? AND i.statut <> 'decline' AND p.etat = 'actif' ORDER BY (i.statut = 'accepte') DESC", "WHERE i.reunion = ? AND i.uid <> ? AND p.etat = 'actif' ORDER BY (i.statut = 'accepte') DESC", ['972']);
m('S28', 'le successeur de l\'hôte n\'est pas promu administrateur de la conversation : personne ne peut plus la gérer', F.stock,
  "      Q(`UPDATE membre SET role = 'admin' WHERE conv = ? AND uid = ?`).run(r.conv, suivant.uid);\n      Q(`UPDATE reunion_invite SET statut = 'accepte'", "      Q(`UPDATE reunion_invite SET statut = 'accepte'", ['972']);
m('S29', 'une réunion sans successeur n\'est plus supprimée à l\'effacement de son hôte : elle reste à un compte effacé', F.stock,
  "if (!suivant) { pieces.push(...convSupprimer(r.conv, { noter: !rejeu }).pieces); convs.push(r.conv); continue; }", "if (!suivant) { continue; }", ['972']);
m('S30', 'le rejeu hors ligne de `reunion_invite` retire aussi une invitation PLUS RÉCENTE que le retrait (la personne réinvitée disparaît)', F.stock,
  "DELETE FROM reunion_invite WHERE reunion = ? AND uid = ? AND cree <= ?", "DELETE FROM reunion_invite WHERE reunion = ? AND uid = ? AND ? IS NOT NULL", ['972']);
m('S31', 'le rejeu hors ligne de `reunion_annulee` annule sans retirer la prochaine occurrence', F.stock,
  "UPDATE reunion SET annulee = 1, prochain = NULL WHERE id = ? AND annulee = 0", "UPDATE reunion SET annulee = 1 WHERE id = ? AND annulee = 0", ['972']);
m('S32', 'une restauration garde le BAIL copié : l\'instance du sinistre, ou une échéance lointaine, bloque le service restauré', F.stock,
  "try { bilan.bails = Number(d.prepare('DELETE FROM planif_bail').run().changes); }", "try { bilan.bails = 0; }", ['972']);
m('S33', 'une restauration ne pose pas `rappels_depuis` : les rappels du passé se renvoient', F.stock,
  "      d.prepare('INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run('rappels_depuis', String(maintenant));\n", "", ['972']);
m('S34', 'l\'événement `reunion` ne dit plus qu\'une réunion n\'existe plus : la personne retirée la garde dans son agenda', F.stock,
  "data: r ? { id: r.id, conv: r.conv, version: num(r.version) } : { id: j.ref, supprime: true } };", "data: { id: j.ref, conv: j.conv, version: 0 } };", ['972']);
m('S35', 'une réunion se lit sans en être invité', F.stock,
  "Q('SELECT statut, rappels FROM reunion_invite WHERE reunion = ? AND uid = ?').get(id, uid);", "Q('SELECT statut, rappels FROM reunion_invite WHERE reunion = ? AND (uid = ? OR 1 = 1)').get(id, uid);", ['972']);
m('S36', 'le nom de la conversation d\'une réunion est rangé EN CLAIR (le titre est un nom de client ou de chantier)', F.stock,
  "VALUES(?, 'reunion', ?, ?, ?, ?)`).run(conv, sceller('conversation', 'nom_ch', conv + '|nom', titre), t, hote, t);", "VALUES(?, 'reunion', ?, ?, ?, ?)`).run(conv, titre, t, hote, t);", ['972']);
m('S37', 'on n\'invite plus plus de 101 personnes (le plafond de cent saute)', F.stock,
  "const INVITES_MAX = 100;", "const INVITES_MAX = 101;", ['972']);
m('S38', 'une réunion FINIE ou annulée compte dans les trois cents d\'un hôte', F.stock,
  "FROM reunion WHERE hote = ? AND annulee = 0 AND prochain IS NOT NULL').get(hote).n) >= REUNIONS_HOTE_MAX", "FROM reunion WHERE hote = ?').get(hote).n) >= REUNIONS_HOTE_MAX", ['972']);
m('S39', 'le plafond d\'un hôte passe à trois cent un', F.stock,
  "const REUNIONS_HOTE_MAX = 300;", "const REUNIONS_HOTE_MAX = 301;", ['972']);
m('S40', 'le plafond du courriel par destinataire se compte sur la fenêtre du COMPTE (24 h) : un destinataire en reçoit plus de deux par semaine', F.stock,
  "FROM courrier_envoi WHERE dest_h = ? AND ts >= ?').get(destH, depuis.destinataire).n", "FROM courrier_envoi WHERE dest_h = ? AND ts >= ?').get(destH, depuis.compte).n", ['972']);
m('S41', 'la liste de l\'agenda perd les séries commencées avant la fenêtre', F.stock,
  "AND (r.rep <> 'aucune' OR r.fin > ?) ORDER BY r.debut, r.id LIMIT 600", "AND (r.fin > ?) ORDER BY r.debut, r.id LIMIT 600", ['972']);
m('S42', 'la liste des conversations ne dit plus de quelle réunion est une conversation de réunion', F.stock,
  "      if (l.type === 'reunion' && l.reunion_id) o.reunion = l.reunion_id;", "", ['972']);
m('S43', 'les notifications d\'une invitation à une réunion gardent le prénom de l\'hôte effacé', F.stock,
  ": r.type === 'reunion_invitation' ? 'Un compte supprimé vous a invité à une réunion.'", ": r.type === 'reunion_invitation_x' ? 'Un compte supprimé vous a invité à une réunion.'", ['972']);
m('S44', 'un rappel est jugé valable après le début de l\'occurrence (la charge push ne se re-juge plus)', F.stock,
  "return !r.annulee && r.statut !== 'decline' && num(occurrence) > horloge();", "return !r.annulee && r.statut !== 'decline';", ['972']);
m('S45', 'le planificateur rappelle aussi ceux qui ont DÉCLINÉ', F.stock,
  "WHERE i.reunion = ? AND i.statut <> 'decline' AND p.etat = 'actif' ORDER BY i.cree, i.uid`).all(id)", "WHERE i.reunion = ? AND p.etat = 'actif' ORDER BY i.cree, i.uid`).all(id)", ['972']);
m('S46', 'le planificateur lit aussi les réunions ANNULÉES (la garde de la lecture seule, l\'annulation ayant remis `prochain` à NULL)', F.stock,
  "WHERE annulee = 0 AND prochain IS NOT NULL AND prochain <= ?", "WHERE prochain IS NOT NULL AND prochain <= ?", ['972'], EQ('`annulee = 0` double `prochain IS NOT NULL` : l\'annulation remet `prochain` à NULL (S10) — la garde restante tient seule ; le défaut réel retire LES DEUX (S10 + S46)'));
m2('S10+S46', 'annuler garde sa prochaine occurrence ET le planificateur ne regarde plus `annulee` : une réunion ANNULÉE est rappelée à ses invités', [
  [F.stock, "UPDATE reunion SET annulee = 1, prochain = NULL, version = version + 1, maj = ? WHERE id = ?", "UPDATE reunion SET annulee = 1, version = version + 1, maj = ? WHERE id = ?"],
  [F.stock, "WHERE annulee = 0 AND prochain IS NOT NULL AND prochain <= ?", "WHERE prochain IS NOT NULL AND prochain <= ?"]], ['972']);
m('S47', 'l\'export des données ne distingue plus l\'hôte de l\'invité', F.stock,
  "role: x.hote === uid ? 'hote' : 'invite'", "role: 'invite'", ['972']);
m('S48', 'le registre des rappels ne s\'élague jamais (il grossit pour toujours)', F.stock,
  "DELETE FROM rappel WHERE occurrence < ?", "DELETE FROM rappel WHERE occurrence < 0 AND ? IS NOT NULL", ['972']);
m('S49', 'les réponses des invités ne se partent plus d\'un événement : une réponse change sans que la page de l\'hôte le sache', F.stock,
  "      Q('UPDATE reunion_invite SET statut = ?, repondu = ? WHERE reunion = ? AND uid = ?').run(statut, horloge(), id, uid);\n      return { change: true, gid: journalAjouter('reunion', r.conv, null, id) };", "      Q('UPDATE reunion_invite SET statut = ?, repondu = ? WHERE reunion = ? AND uid = ?').run(statut, horloge(), id, uid);\n      return { change: true, gid: 0 };", ['972']);
m('S50', 'les invités d\'une réunion neuve ne sont plus « en attente » mais « accepte » : l\'hôte croit à des réponses qu\'on n\'a pas données', F.stock,
  "      for (const u of uids) Q(`INSERT INTO reunion_invite(reunion, uid, statut, invite_par, cree) VALUES(?, ?, 'attente', ?, ?)`).run(id, u, hote, t);", "      for (const u of uids) Q(`INSERT INTO reunion_invite(reunion, uid, statut, invite_par, cree) VALUES(?, ?, 'accepte', ?, ?)`).run(id, u, hote, t);", ['972']);
m('S51', 'l\'hôte d\'une réunion neuve n\'est pas administrateur de sa conversation', F.stock,
  "VALUES(?, ?, 'admin', 1, ?)`).run(conv, hote, t);", "VALUES(?, ?, 'membre', 1, ?)`).run(conv, hote, t);", ['972']);
m('S52', 'inviter une personne DÉJÀ invitée la réinscrit (la ligne en double fait échouer l\'envoi)', F.stock,
  "if (u === par || Q('SELECT 1 AS x FROM reunion_invite WHERE reunion = ? AND uid = ?').get(id, u)) continue;", "if (u === par) continue;", ['972']);

/* ── les trois listes écrites à la main, et les genres de purge neufs (test-950 les compare) ── */
m('L01', 'la copie ne compte plus les réunions (`TABLES_COMPTEES`) : une sauvegarde qui les perdrait toutes passerait', F.stock,
  "'abonnement', 'reunion', 'reunion_invite', 'rappel', 'planif_bail', 'courrier_envoi'];", "'abonnement', 'reunion_invite', 'rappel', 'planif_bail', 'courrier_envoi'];", ['950']);
m('L02', 'la sonde de la base vivante ne regarde plus les invitations (`sonde().nonVides`)', F.stock,
  "        reunion_invite: non(() => Q('SELECT 1 FROM reunion_invite LIMIT 1')),\n", "", ['950']);
m('L03', 'le comptage de la copie (`lignesDe`) oublie le registre des rappels : chaque sauvegarde tombe dès le premier rappel', F.stock,
  "    rappel: n(() => d.prepare('SELECT COUNT(*) AS n FROM rappel')),\n", "", ['950']);
m('L04', 'le genre de purge `reunion_invite` n\'est plus déclaré : l\'effacement s\'écrit mais aucune restauration ne le rejoue', F.stock,
  "  reunion_invite: 'copie',     // un invité retiré", "  // reunion_invite: 'copie',     // un invité retiré", ['950']);
m('L05', 'le genre de purge `reunion_annulee` n\'est plus déclaré', F.stock,
  "  reunion_annulee: 'copie',    // une réunion ANNULÉE", "  // reunion_annulee: 'copie',    // une réunion ANNULÉE", ['950']);
m('L06', 'le rejeu hors ligne ne connaît plus `reunion_invite` (compté « ignoré » : l\'invité retiré revient)', F.stock,
  "} else if (genre === 'reunion_invite') {", "} else if (genre === 'reunion_invite_x') {", ['950', '972']);
m('L07', 'le rejeu hors ligne ne connaît plus `reunion_annulee` : la réunion annulée redevient active', F.stock,
  "} else if (genre === 'reunion_annulee') {", "} else if (genre === 'reunion_annulee_x') {", ['950', '972']);


/* ══ 2. LES ROUTES — programmer est Pro, l'hôte seul agit, un non-invité ne voit rien, les notifications se taisent où il faut (routes-reunions.js, app.js, manifeste.js, routes.js, compte.js, reunions-outils.js) ═══ */
m('R01', 'programmer n\'est plus une fonction Pro : une personne Perso programme des réunions', F.man,
  /(id: 'reunions\.creer',[^}]*garde: 'V'), pro: true/, "$1", ['973', '905']);
m('R02', 'les invités d\'une programmation ne passent plus par `peutEcrire` : un étranger, un collègue bloqué, un identifiant inconnu sont « invités »', F.reu,
  "const ok = voulus.filter(u => stockage.peutEcrire(hote.id, u)), non_invites = voulus.filter(u => !ok.includes(u));", "const ok = voulus, non_invites = [];", ['973']);
m('R03', '« inviter » après coup ne passe plus par `peutEcrire` (le bloqué et l\'étranger entrent)', F.reu,
  "const ok = u.filter(x => stockage.peutEcrire(hote.id, x)), non_ajoutes = u.filter(x => !ok.includes(x));", "const ok = u, non_ajoutes = [];", ['973']);
m('R04', 'une heure locale du trou du changement d\'heure est acceptée et décalée sans le dire', F.reu,
  /\n    if \(cal\.formaterLocal\(t, tz\) !== valeur\) return \{ erreur: 'heure_inexistante' \};[^\n]*/, "", ['973']);
m('R05', 'une fin avant (ou égale à) le début est acceptée', F.reu,
  "    if (!(fin > debut)) return { erreur: 'fin_avant_debut' };\n", "", ['973']);
m('R06', 'une réunion de plus de 30 jours est acceptée', F.reu,
  "    if (fin - debut > DUREE_MAX) return { erreur: 'reunion_trop_longue' };\n", "", ['973']);
m('R07', 'une fin de répétition AVANT le début de la série est acceptée', F.reu,
  "if (cal.numeroJour(dl) < cal.numeroJour(d0) || dl.a > d0.a + 10)", "if (dl.a > d0.a + 10)", ['973']);
m('R08', 'une fin de répétition à plus de dix ans est acceptée (une série quotidienne de 40 000 périodes)', F.reu,
  "if (cal.numeroJour(dl) < cal.numeroJour(d0) || dl.a > d0.a + 10)", "if (cal.numeroJour(dl) < cal.numeroJour(d0))", ['973']);
m('R09', 'un rappel hors de la liste (7 minutes, un an) est accepté', F.reu,
  "|| !v.every(x => cal.RAPPELS_PERMIS.includes(x))) return null;", "|| false) return null;", ['973']);
m('R10', 'les rappels ne sont plus triés ni dédoublonnés', F.reu,
  "return Array.from(new Set(v)).sort((a, b) => a - b);", "return v;", ['973']);
m('R11', 'sans rappels dans le corps, une réunion n\'en a plus aucun (le défaut de 15 minutes disparaît)', F.reu,
  "let rappels = base ? base.rappels : [15];", "let rappels = base ? base.rappels : [];", ['973']);
m('R12', '« Notifier les invités : non » n\'est plus lu : les invités sont toujours prévenus', F.reu,
  "const notifierVoulu = (b) => b.notifier === undefined ? true : b.notifier === true;", "const notifierVoulu = (b) => true;", ['973']);
m('R13', 'l\'invitation s\'écrit dans le fuseau de l\'HÔTE (Cleo, à New York, lit l\'heure de Paris)', F.reu,
  "texte: texteInvitation(hote, desc, personne(u), quand)", "texte: texteInvitation(hote, desc, hote, quand)", ['973']);
m('R14', 'un simple réglage de RAPPEL prévient les invités d\'une modification', F.reu,
  "if (r.change && (r.horaire || r.titre || r.lieu) && notifierVoulu(b)) {", "if (r.change && notifierVoulu(b)) {", ['973']);
m('R15', 'modifier ne prévient plus personne', F.reu,
  "if (r.change && (r.horaire || r.titre || r.lieu) && notifierVoulu(b)) {", "if (false) {", ['973']);
m('R16', 'l\'annulation lit « Notifier : non » : une réunion annulée en silence', F.reu,
  "      prevenirAnnulation(hote, avant, stockage.reunionParticipants(id));\n    }\n    res.json(vue(hote.id, id));", "      if (notifierVoulu(corps(req))) prevenirAnnulation(hote, avant, stockage.reunionParticipants(id));\n    }\n    res.json(vue(hote.id, id));", ['973']);
m('R17', 'l\'annulation prévient aussi l\'hôte (de son propre geste)', F.reu,
  "    for (const u of participants) {\n      if (u === hote.id) continue;\n      notif.notifier({ uid: u, type: 'reunion_annulee'", "    for (const u of participants) {\n      notif.notifier({ uid: u, type: 'reunion_annulee'", ['973']);
m('R18', 'supprimer une réunion à venir ne prévient plus ses invités : elle disparaît de leur agenda sans un mot', F.reu,
  "if (aVenir && notifierVoulu(b)) prevenirAnnulation(hote, avant, r.participants);", "if (false) prevenirAnnulation(hote, avant, r.participants);", ['973']);
m('R19', 'supprimer prévient aussi pour une réunion déjà ANNULÉE ou PASSÉE (un second message, ou un message absurde)', F.reu,
  "const aVenir = !avant.annulee && prochainDe(serieDe(avant), horloge()) !== null;", "const aVenir = true;", ['973']);
m('R20', 'supprimer ne lit plus « Notifier : non »', F.reu,
  "if (aVenir && notifierVoulu(b)) prevenirAnnulation(hote, avant, r.participants);", "if (aVenir) prevenirAnnulation(hote, avant, r.participants);", ['973']);
m('R21', 'on peut « répondre » `attente` : une réponse qui défait la réponse', F.reu,
  "const STATUTS = ['accepte', 'decline', 'peutetre'];", "const STATUTS = ['accepte', 'decline', 'peutetre', 'attente'];", ['973']);
m('R22', 'la réponse prend la personne dans le CORPS : Ben répond « décline » à la place de Cleo', F.reu,
  "stockage.reunionRepondre({ id, uid: req.moi.id, statut: s })", "stockage.reunionRepondre({ id, uid: (corps(req).uid || req.moi.id), statut: s })", ['973']);
m('R23', 'les rappels se règlent pour la personne du CORPS : Ben règle ceux de Cleo', F.reu,
  "stockage.reunionRappelsPoser({ id, uid: req.moi.id, rappels: r })", "stockage.reunionRappelsPoser({ id, uid: (corps(req).uid || req.moi.id), rappels: r })", ['973']);
m('R24', 'l\'hôte d\'une programmation vient du CORPS : Ana programme au nom d\'Eve', F.reu,
  "const b = corps(req), hote = req.moi;", "const b = corps(req), hote = (b.hote && stockage.personneParId(b.hote)) || req.moi;", ['973']);
m('R25', 'la fenêtre de l\'agenda n\'est plus bornée à 62 jours', F.reu,
  "|| au - du > FENETRE_MAX) return refus(res, 400, 'fenetre_invalide');", ") return refus(res, 400, 'fenetre_invalide');", ['973']);
m('R26', 'l\'agenda garde une occurrence qui FINIT à l\'instant où la fenêtre commence (ou qui commence quand elle finit)', F.reu,
  ".filter(o => o.fin > du && o.debut < au);", ".filter(o => o.fin >= du && o.debut <= au);", ['973']);
m('R27', 'la fenêtre par défaut ne commence plus la VEILLE : la réunion de ce matin disparaît de l\'agenda', F.reu,
  "const du = q.du === undefined ? horloge() - JOUR : ent(q.du);", "const du = q.du === undefined ? horloge() : ent(q.du);", ['973']);
m('R28', 'le fichier .ics s\'ouvre dans le navigateur au lieu d\'être téléchargé', F.reu,
  "'Content-Disposition': 'attachment; filename=\"'", "'Content-Disposition': 'inline; filename=\"'", ['973']);
m('R29', 'le fichier .ics n\'a plus de plafond (60 par minute)', F.reu,
  "    if (!plafond(res, 'ics', req.moi.id, { max: 60, fenetreMs: 60000 })) return;\n", "", ['973']);
m('R30', 'programmer n\'a plus de plafond (30 par heure et par personne)', F.reu,
  "    if (!plafond(res, 'reunion', hote.id, { max: 30, fenetreMs: 3600000 })) return;\n", "", ['973']);
m('R31', 'le fichier de la personne porte les rappels de l\'HÔTE (les siens sont ignorés)', F.reu,
  "const opts = { maintenant: horloge(), rappels: rr.moi.rappels };", "const opts = { maintenant: horloge(), rappels: rr.reunion.rappels };", ['973']);
m('R32', 'le fichier .ics peut être mis en cache (une réunion modifiée reste l\'ancienne chez la personne)', F.reu,
  ", 'Cache-Control': 'no-store' });\n    res.send(texte);", " });\n    res.send(texte);", ['973']);
m('R33', 'une occurrence demandée est ignorée : le fichier est toujours celui de la série', F.reu,
  "      opts.occurrence = parseInt(q.occurrence, 10);\n", "", ['973']);
m('R34', 'une occurrence qui n\'en est pas une rend un fichier VIDE (200) au lieu de dire `occurrence_inconnue`', F.reu,
  "    if (texte === null) return refus(res, 404, 'occurrence_inconnue');\n", "", ['973']);
m('R35', 'le plafond de 300 réunions n\'est plus traduit : une erreur du stockage devient une panne (500)', F.reu,
  " trop_de_reunions: [409, 'trop_de_reunions'],", "", ['973']);
m('R36', 'une réunion annulée répond 400 au lieu de 409 (l\'écran la confond avec un champ invalide)', F.reu,
  "reunion_annulee: [409, 'reunion_annulee']", "reunion_annulee: [400, 'reunion_annulee']", ['973']);
m('R37', 'l\'hôte « retiré » de sa propre réunion répond 403 au lieu de 409', F.reu,
  "hote_non_retirable: [409, 'hote_non_retirable']", "hote_non_retirable: [403, 'hote_non_retirable']", ['973']);
m('R38', 'la fenêtre de l\'agenda accepte un nombre décimal (« 1.5 »)', F.reu,
  "const q = req.query || {}, ent = (x) => /^\\d{1,15}$/.test(String(x)) ? parseInt(x, 10) : null;", "const q = req.query || {}, ent = (x) => /^[\\d.]{1,15}$/.test(String(x)) ? parseFloat(x) : null;", ['973']);

/* les gardes R et H (app.js) et la ligne de la matrice */
m('R40', 'la garde R n\'exige plus d\'être invité : le laissez-passer n\'est plus posé (une panne pour tous)', F.app,
  "garde.R = garde.S.concat([reunionDuParticipant]);", "garde.R = garde.S;", ['973', '905']);
m('R41', 'la garde H n\'exige plus d\'être l\'HÔTE : un invité modifie, annule, supprime', F.app,
  "garde.H = garde.V.concat([reunionDuParticipant, (req, res, next) => req.reunion.hote ? next() : refus(res, 403, 'interdit')]);", "garde.H = garde.V.concat([reunionDuParticipant]);", ['973', '905']);
m('R42', 'un non-invité reçoit 403 au lieu du 404 d\'une réunion inexistante : l\'existence de la réunion se devine', F.app,
  "stockage.reunionAcces(id, req.moi.id) : null;\n    if (!r) return refus(res, 404, 'introuvable');", "stockage.reunionAcces(id, req.moi.id) : null;\n    if (!r) return refus(res, 403, 'interdit');", ['973', '905']);
m('R43', 'la ligne `reunions.modifier` du manifeste ne demande plus l\'hôte (garde R)', F.man,
  /(id: 'reunions\.modifier',[^}]*garde: )'H'/, "$1'R'", ['973', '905']);
m('R44', 'la ligne `reunions.supprimer` du manifeste ne demande plus l\'hôte (garde R)', F.man,
  /(id: 'reunions\.supprimer',[^}]*garde: )'H'/, "$1'R'", ['973', '905']);
m('R45', 'la ligne `reunions.ics` du manifeste demande un abonnement Pro à celui qui télécharge', F.man,
  /(id: 'reunions\.ics',[^}]*garde: 'R')/, "$1, pro: true", ['973', '905']);
m('R46', 'quitter la conversation d\'une réunion est de nouveau permis (l\'invité sort du chat sans se décliner)', F.routes,
  "    if (c.type === 'reunion') return refus(res, 409, 'reunion_quitter');\n", "", ['973']);
m('R47', 'l\'export des données ne porte plus les réunions de la personne', F.compte,
  / \+ ',"reunions":' \+ J\(stockage\.exportReunions\(uid\)[^\n]*?\)\)\) \+ ',"conversations":\['/, " + ',\"conversations\":['", ['973']);

/* les textes et les notifications (reunions-outils.js) */
m('R50', 'l\'invitation dit l\'heure du fuseau de la RÉUNION, pas celui de la personne qui la reçoit', F.outils,
  "' vous a invité à une réunion : ' + cal.dire(t, fuseauDe(p, r.tz))", "' vous a invité à une réunion : ' + cal.dire(t, r.tz)", ['973']);
m('R51', 'une modification d\'horaire ne dit plus l\'heure : « a modifié la réunion » pour tout', F.outils,
  "const texteModification = (hote, r, p, t, horaire) => horaire\n", "const texteModification = (hote, r, p, t, horaire) => false\n", ['973']);
m('R52', 'la SOURDINE de la conversation ne coupe plus le push d\'une modification', F.outils,
  "sourdine: type === 'reunion_modifiee' }", "sourdine: false }", ['973']);
m('R53', 'une annulation est re-jugée sur la réunion à l\'instant de partir : supprimée entre-temps, elle ne part pas', F.outils,
  /\n        if \(type === 'reunion_annulee'\) return true;[^\n]*/, "", ['973']);
m('R54', 'toutes les notifications d\'une réunion portent la même étiquette (deux réunions se remplacent sur le téléphone)', F.outils,
  "tag: 'reunion:' + reunion,", "tag: 'reunion',", ['973']);
m('R55', 'la charge MINIMALE du push dit le texte entier : l\'invité qui n\'a pas activé l\'aperçu lit le titre, l\'hôte et l\'heure', F.outils,
  "corps: PUSH_CORPS[type] || 'Réunion',", "corps: texte,", ['973']);
m('R56', 'la notification ne dit plus QUI elle nomme (`auteur`) : l\'effacement de l\'hôte laisse son nom dans la notification', F.outils,
  "stockage.notifCreer({ uid, type, titre, texte, cible: reunion, auteur })", "stockage.notifCreer({ uid, type, titre, texte, cible: reunion })", ['973']);
m('R57', 'l\'annulation ne part plus en push : seule la notification dans l\'application reste', F.outils,
  "      if (!ctx.push) return;\n", "      if (!ctx.push || type === 'reunion_annulee') return;\n", ['973']);

/* les phrases que la page sait dire (api.js) */
m('R60', 'le refus `heure_inexistante` n\'a plus de phrase : la page dirait « Erreur » à qui choisit 02:30 le jour du changement d\'heure', F.api,
  /\n    heure_inexistante: '[^\n]*/, "", ['906']);
m('R61', 'le refus `reunion_quitter` n\'a plus de phrase', F.api,
  /\n    reunion_quitter: '[^\n]*/, "", ['906']);
m('R62', 'le refus `trop_de_reunions` n\'a plus de phrase', F.api,
  /\n    trop_de_reunions: '[^\n]*/, "", ['906']);

/* le laissez-passer et la charge re-jugée (stockage.js) */
m('S60', 'le laissez-passer des gardes dit que tout invité est l\'hôte', F.stock,
  "return r ? { id: r.id, conv: r.conv, hote: r.hote === uid, annulee: !!r.annulee, statut: r.statut } : null;", "return r ? { id: r.id, conv: r.conv, hote: true, annulee: !!r.annulee, statut: r.statut } : null;", ['972', '973', '905']);
m('S61', 'le laissez-passer des gardes ne vérifie plus l\'invitation (jointure gauche) : un étranger passe', F.stock,
  "i.statut AS statut FROM reunion u JOIN reunion_invite i ON i.reunion = u.id AND i.uid = ? WHERE u.id = ?", "i.statut AS statut FROM reunion u LEFT JOIN reunion_invite i ON i.reunion = u.id AND i.uid = ? WHERE u.id = ?", ['972', '973', '905']);
m('S62', 'la sourdine de la conversation ne coupe plus la charge d\'une modification', F.stock,
  "if (sourdine === true) {", "if (false) {", ['972', '973']);
m('S63', 'une sourdine ÉCHUE coupe encore les modifications', F.stock,
  "num(m.muet_jusqua) > horloge()) return false; }", "num(m.muet_jusqua) > 0) return false; }", ['972']);
m('S64', 'le résultat d\'une modification ne dit plus si le LIEU a changé : la route ne prévient plus d\'un changement de salle', F.stock,
  "return { change: true, horaire, titre: titreChange, lieu: lieuChange, gid:", "return { change: true, horaire, titre: titreChange, lieu: false, gid:", ['972', '973']);
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-reu-'));
  for (const d of DOSSIERS_COPIE) copier(path.join(RACINE, d), path.join(dir, d));
  fs.mkdirSync(path.join(dir, 'tests'));
  for (const f of fs.readdirSync(path.join(RACINE, 'tests'))) if (/^(test-9\d\d|outils-[\w-]+|bac-messages|lib-horloge-msg|mode-site|sonde-opmessages-reunions)\.js$/.test(f)) fs.copyFileSync(path.join(RACINE, 'tests', f), path.join(dir, 'tests', f));
  fs.symlinkSync(path.join(RACINE, 'server-msg', 'node_modules'), path.join(dir, 'server-msg', 'node_modules'));
  fs.symlinkSync(path.join(RACINE, 'server', 'node_modules'), path.join(dir, 'server', 'node_modules'));
  return dir;
}
const nomBanc = (s) => s === 'sonde' ? 'la sonde' : 'test-' + s;
function lancer(dir, suite) {
  return new Promise((resolve) => {
    const sonde = suite === 'sonde';
    const f = sonde ? SONDE_FICHIER : fs.readdirSync(path.join(dir, 'tests')).find(x => x.startsWith('test-' + suite) && x.endsWith('.js'));
    /* ⛔ la sonde lance un VRAI Chromium, dont le dossier de profil porte une prise Unix (`SingletonSocket`, 107 octets de chemin au plus) : sous un TMPDIR long (le brouillon d'une session distante),
       « le navigateur ne démarre pas ». La sonde garde donc un TMPDIR COURT (`TMPDIR_SONDE`, par défaut /tmp), les copies, elles, restent où on les met. */
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
        const ok = s === 'sonde' ? fs.existsSync(path.join(RACINE, 'tests', SONDE_FICHIER)) : fs.readdirSync(path.join(RACINE, 'tests')).some(x => x.startsWith('test-' + s) && x.endsWith('.js'));
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-reu-verif-'));
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
