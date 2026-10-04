/* ══ LES MUTATIONS DES RÉUNIONS PROGRAMMÉES — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » (CLAUDE.md) ═══════════════════════════════
   Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il remet, UN PAR UN, les défauts que `tests/test-970` à `976`, `905`, `906`, `934`,
   `941`, `950` et la sonde navigateur `sonde-opmessages-reunions.js` gardent — l'heure d'une série calculée en ajoutant 7 × 24 h, une heure absente ou vécue deux fois lue de travers,
   un `UNTIL` en heure locale, un titre qui ouvre une ligne du fichier .ics ; une réunion qui se lit sans y être invité, un invité qui modifie, un changement d'horaire qui laisse
   « décliné » celui qui ne peut plus venir ; un rappel qui part deux fois, un bail qui ne s'éteint jamais, un rappel du passé renvoyé après une restauration ; un effacement qui
   revient d'une archive d'avant, un rejeu qui écrit une ligne de plus au registre ; un courriel qui part sans son plafond, une pièce jointe qui n'est pas la bonne, un secret affiché ;
   une route sans sa garde, un code d'erreur que l'écran ne sait pas dire ; et, côté page, une adresse de fichier qui passe par l'enveloppe asynchrone, un fuseau qu'on ne dit pas au service, une adresse tapée perdue au redessin, un bouton
   qui reste grisé, une date que la fiche garde après un changement d'horaire, un lieu « javascript: » devenu lien, une heure lue dans le fuseau de la réunion au lieu de celui de l'appareil, un refus d'ICI qui n'en est plus un, un retour d'historique rejoué pendant qu'il est en vol (la fiche ouverte au doigt quitte l'application), une disparition apprise de quatre côtés qui ferme la fiche quatre fois — dans une COPIE de l'arbre (jamais dans l'arbre lui-même : le `git checkout` d'après-mutation de CLAUDE.md
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
m('C10', 'la « prochaine occurrence » ne part plus du début de la série : une réunion à plus de 100 jours n\'a aucune prochaine (ni rappel, ni avertissement à la suppression)', F.cal,
  "const du = Math.max(inclus ? t : t + 1, s.debut);", "const du = inclus ? t : t + 1;", ['970', '973']);

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
  "      if (neufs < 1) return null;\n      return notifCreer({ uid, type: 'reunion_rappel'", "      return notifCreer({ uid, type: 'reunion_rappel'", ['972']);
m('S65', 'plusieurs délais échus pour la même personne : seul le premier est noté au registre, les autres repartent au tour suivant (deux notifications, puis une troisième)', F.stock,
  "neufs += num(Q('INSERT OR IGNORE INTO rappel(reunion, occurrence, uid, avant, ts) VALUES(?, ?, ?, ?, ?)').run(reunion, occurrence, uid, a, horloge()).changes);", "{ neufs += num(Q('INSERT OR IGNORE INTO rappel(reunion, occurrence, uid, avant, ts) VALUES(?, ?, ?, ?, ?)').run(reunion, occurrence, uid, a, horloge()).changes); break; }", ['972', '974']);
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
m('S42', 'la liste des conversations ne dit plus de quelle réunion est une conversation de réunion', F.stock,
  "      if (l.type === 'reunion' && l.reunion_id) o.reunion = l.reunion_id;", "", ['972']);
m('S43', 'les notifications d\'une invitation à une réunion gardent le prénom de l\'hôte effacé', F.stock,
  ": r.type === 'reunion_invitation' ? 'Un compte supprimé vous a invité à une réunion.'", ": r.type === 'reunion_invitation_x' ? 'Un compte supprimé vous a invité à une réunion.'", ['972']);
m('S44', 'un rappel est jugé valable après le début de l\'occurrence (la charge push ne se re-juge plus)', F.stock,
  "return !r.annulee && r.statut !== 'decline' && num(occurrence) > horloge();", "return !r.annulee && r.statut !== 'decline';", ['972']);
m('S45', 'le planificateur rappelle aussi ceux qui ont DÉCLINÉ', F.stock,
  "WHERE i.reunion = ? AND i.statut <> 'decline' AND p.etat = 'actif' ORDER BY i.cree, i.uid`).all(id)", "WHERE i.reunion = ? AND p.etat = 'actif' ORDER BY i.cree, i.uid`).all(id)", ['972', '974']);
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
m('R32', 'le fichier .ics peut être mis en cache (une réunion modifiée reste l\'ancienne chez la personne) — l\'en-tête de la ROUTE seulement', F.reu,
  ", 'Cache-Control': 'no-store' });\n    res.send(texte);", " });\n    res.send(texte);", ['973'],
  EQ('le préfixe `/api` pose déjà `no-store` sur toute réponse (app.js) : la garde restante tient seule ; le défaut réel retire LES DEUX (R32 + la ligne d\'app.js)'));
m2('R32+A', 'le fichier .ics peut être mis en cache : ni l\'en-tête de la route, ni celui du préfixe `/api`', [
  [F.reu, ", 'Cache-Control': 'no-store' });\n    res.send(texte);", " });\n    res.send(texte);"],
  [F.app, "  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });\n", ""]], ['973']);
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

/* ══ 3. LE PLANIFICATEUR — un rappel part une fois, à son heure, à la bonne personne, et rien ne part qui n'a plus de sens (planificateur.js, config.js, index.js, surveillance) ═══════════════════════ */
m('P01', 'un rappel part dès qu\'on regarde la réunion, sans attendre son échéance', F.plan,
  "if (echeance < plancher || echeance > t) continue;", "if (echeance < plancher) continue;", ['974']);
m('P02', 'un rappel part aussi pour une occurrence qui a COMMENCÉ (un rappel pour une réunion en cours)', F.plan,
  "if (o.debut <= t) { bilan.abandonnes += dus.length; continue; }", "", ['974']);
m('P03', 'l\'abandon n\'est plus compté (ni dans le bilan, ni dans la santé)', F.plan,
  "if (o.debut <= t) { bilan.abandonnes += dus.length; continue; }", "if (o.debut <= t) { continue; }", ['974']);
m('P04', 'l\'abandon n\'est plus journalisé : un rappel abandonné disparaît sans un mot', F.plan,
  "    if (bilan.abandonnes) journal('rappel_abandonne', { n: bilan.abandonnes });   // abandonné, jamais en silence\n", "", ['974']);
m('P05', 'l\'arrivée de la personne et son propre réglage ne bornent plus ses rappels (un invité tardif reçoit un « 15 minutes avant » déjà passé)', F.plan,
  "const plancher = Math.max(plancherReunion, p.cree, p.rappels_le);", "const plancher = plancherReunion;", ['974']);
m('P06', 'un changement d\'HORAIRE ne borne plus les rappels (celui d\'une échéance antérieure au changement part quand même)', F.plan,
  "const plancherReunion = Math.max(r.horaire_le, depuis);", "const plancherReunion = depuis;", ['974']);
m('P07', 'la restauration d\'une base ne borne plus les rappels : ceux d\'avant le sinistre repartent', F.plan,
  "const plancherReunion = Math.max(r.horaire_le, depuis);", "const plancherReunion = r.horaire_le;", ['974']);
m('P09', 'les rappels réglés par la personne sont ignorés : tout le monde garde le réglage de la réunion', F.plan,
  "const avants = p.rappels !== null ? p.rappels : r.defaut;", "const avants = r.defaut;", ['974']);
m('P10', 'plusieurs délais échus font plusieurs notifications (un seul est noté, les autres repartent au tour suivant)', F.plan,
  "avants: dus, titre: r.titre", "avants: [dus[0]], titre: r.titre", ['974']);
m('P12', '« 1 jour avant » se compte en 24 heures exactes : le rappel de la veille d\'un jour de bascule tombe à la mauvaise heure', F.plan,
  "const echeance = cal.echeanceRappel(o.debut, a, r.tz);", "const echeance = o.debut - a * 60000;", ['974']);
m('P13', 'la prochaine occurrence n\'est plus recalculée : une réunion finie reste « à rappeler » et son abandon se recompte à chaque tour', F.plan,
  "    if (prochain !== r.prochain) stockage.reunionProchainPoser(r.id, prochain);\n", "", ['974']);
m('P14', 'le planificateur ne regarde plus que les occurrences d\'APRÈS maintenant : celles qui ont commencé pendant un arrêt ne sont ni vues, ni comptées', F.plan,
  "const du = r.prochain !== null && r.prochain < t ? r.prochain : t;", "const du = t;", ['974']);
m('P15', 'l\'horizon n\'est plus que d\'une heure : le rappel « 1 jour avant » n\'est jamais regardé', F.plan,
  "const HORIZON_MS = 27 * HEURE;", "const HORIZON_MS = 1 * HEURE;", ['974']);
m('P16', 'les réunions qui commencent dans l\'heure ne sont plus toujours regardées : elles passent par la rotation', F.plan,
  "const URGENT_MS = 65 * 60000;", "const URGENT_MS = 0;", ['974']);
m('P18', 'le bail n\'est plus pris : toute instance se croit la seule', F.plan,
  "etat.actif = !!stockage.bailPrendre({ proprietaire: identite, ttlMs: cfg.bailMs });", "etat.actif = true;", ['974']);
m('P19', 'un arrêt propre ne rend plus le bail : la suivante attend son échéance', F.plan,
  "    try { stockage.bailRendre(identite); } catch (e) { /* la base est peut-être déjà fermée */ }\n", "", ['974']);
m('P21', 'les échecs de suite ne retombent jamais à zéro (la surveillance crierait pour toujours après une panne passée)', F.plan,
  "etat.echecs = erreur ? etat.echecs + 1 : 0;", "etat.echecs = etat.echecs + (erreur ? 1 : 0);", ['974']);
m('P23', 'le registre des rappels s\'élague jusqu\'à MAINTENANT : les rappels d\'hier, qui protègent encore un envoi, partent', F.plan,
  "stockage.rappelsElaguer(t - RAPPELS_GARDES_MS);", "stockage.rappelsElaguer(t);", ['974']);
m('P24', 'les envois de courriel ne sont plus élagués : le registre grossit pour toujours', F.plan,
  " stockage.courrierElaguer(t - COURRIER_GARDE_MS);", "", ['974']);
m('P25', 'l\'élagage se fait à CHAQUE tour (toutes les douze secondes) au lieu de chaque heure', F.plan,
  "if (t - etat.dernierElagage >= ELAGAGE_PERIODE_MS) {", "if (true) {", ['974']);
m('P26', 'la santé ne dit plus l\'âge du dernier tour : la surveillance ne peut plus voir une boucle morte', F.plan,
  "    etat.dernierTour = horloge();\n", "", ['974']);
m('P27', 'la santé ne compte plus les abandons', F.plan,
  "    etat.abandonnes += bilan.abandonnes; etat.envoyes += bilan.envoyes;\n", "    etat.envoyes += bilan.envoyes;\n", ['974']);
m('P30', 'le tour lève au lieu de rendre un bilan : une exception dans une minuterie tue le service', F.plan,
  "    } catch (e) { erreur = true; journal('planif_echec', { nom: nomDe(e) }); }\n    etat.echecs", "    } catch (e) { throw e; }\n    etat.echecs", ['974']);
m('P31', 'la date de la restauration n\'est plus lue : un rappel d\'avant le sinistre repart', F.plan,
  "    const n = v === null || v === undefined ? 0 : parseInt(v, 10);", "    const n = 0;", ['974']);
m('P33', 'le réglage de rappels d\'une personne n\'est plus daté : un réglage fait après l\'échéance déclenche quand même le rappel caduc', F.stock,
  "rappels_le: x.rappels_le === null || x.rappels_le === undefined ? 0 : num(x.rappels_le)", "rappels_le: 0", ['974']);
m('P34', 'le changement d\'horaire n\'est plus daté dans le planning : une échéance antérieure au changement est due', F.stock,
  "defaut: listeEntiers(r.rappels), horaire_le: num(r.horaire_le),", "defaut: listeEntiers(r.rappels), horaire_le: 0,", ['974']);
m('P35', 'les rappels par défaut de la réunion sont perdus : seuls ceux qu\'une personne a choisis elle-même partent', F.stock,
  "defaut: listeEntiers(r.rappels), horaire_le:", "defaut: [], horaire_le:", ['974']);
m('P36', 'le jugement d\'un rappel poussé garde la durée de vie de vingt-quatre heures : un téléphone éteint sonne à midi pour une réunion de dix heures', F.outils,
  "return type === 'reunion_rappel' ? { ttl: Math.max(0, Math.floor((occurrence - horloge()) / 1000)) } : true;", "return type === 'reunion_rappel' ? { ttl: 86400 } : true;", ['974']);
m('P37', 'un rappel ne renotifie plus (il remplace silencieusement la notification précédente de la réunion)', F.outils,
  "renotify: type === 'reunion_rappel',", "renotify: false,", ['974']);

/* la configuration et le branchement */
m('K01', 'la production accepte un tour de moins de dix secondes (un réglage de banc qui martèle la base)', F.conf,
  "planificateurMs: prod ? [10000, 15000] : [50, 300000]", "planificateurMs: [50, 300000]", ['974']);
m('K02', 'la production accepte un tour de plus de quinze secondes (un rappel de 5 minutes avec une minute de retard)', F.conf,
  "planificateurMs: prod ? [10000, 15000] : [50, 300000]", "planificateurMs: prod ? [10000, 3600000] : [50, 300000]", ['974']);
m('K03', 'un bail plus court que deux tours est accepté (il expire entre deux renouvellements)', F.conf,
  "  if (o.bailMs < 2 * o.planificateurMs) throw err(", "  if (false) throw err(", ['974']);
m('K04', 'la section `reunions` de la configuration n\'est plus lue : le planificateur démarre sans réglage', F.conf,
  "    reunions: reunionsConfig(cfg, instance),\n", "", ['974', '934']);
m('N01', 'le planificateur n\'est jamais démarré : plus aucun rappel ne part', F.index,
  "  planificateur.demarrer(); // un premier tour", "  // planificateur.demarrer(); // un premier tour", ['974']);
m('N02', 'un arrêt du service ne rend plus le bail du planificateur (la prochaine instance attend son échéance)', F.index,
  "    planificateur.arreter();   // REND le bail : la prochaine instance n'attend pas son échéance\n", "", ['974']);
m('N03', '/health ne publie plus l\'état du planificateur : la surveillance ne voit plus une boucle morte', F.index,
  /\n      reunions: planificateur\.sante\(\),/, "", ['974']);
m('R70', 'une réunion programmée par la route n\'enregistre pas sa prochaine occurrence : le planificateur ne la verra jamais', F.reu,
  "    const prochain = prochainDe(v.serie, horloge());\n    const r = stockage.reunionCreer(", "    const prochain = null;\n    const r = stockage.reunionCreer(", ['974']);
m('R71', 'modifier l\'horaire par la route n\'enregistre pas la nouvelle prochaine occurrence : le rappel de la nouvelle heure ne part jamais', F.reu,
  "const prochain = v.horaire ? prochainDe(v.serie, horloge()) : undefined;", "const prochain = undefined;", ['974']);

/* la surveillance */
m('V01', 'la surveillance ne regarde plus l\'âge du dernier tour du planificateur : une boucle morte ne crie pas', F.surv,
  "if (typeof j.reunions.ageS === 'number' && j.reunions.ageS > SEUIL_PLANIF_S) {", "if (false) {", ['934']);
m('V02', 'la surveillance ne crie qu\'au-delà de vingt-sept heures sans tour (le seuil de cinq minutes devient absurde)', F.surv,
  "const SEUIL_PLANIF_S = 300;", "const SEUIL_PLANIF_S = 100000;", ['934']);
m('V03', 'la surveillance ne regarde plus les échecs de suite du planificateur', F.surv,
  "if (typeof j.reunions.echecs === 'number' && j.reunions.echecs >= SEUIL_PLANIF_ECHECS) {", "if (false) {", ['934']);
m('V04', 'le champ `reunions.ageS` n\'est plus déclaré surveillé : le /health vivant le trouve sans décision', F.surv,
  "  'reunions.ageS',         // le dernier tour du planificateur date de plus de cinq minutes", "  // 'reunions.ageS',         // le dernier tour du planificateur date de plus de cinq minutes", ['934']);
/* ── 4. LE COURRIEL D'INVITATION (courriel.js, la route, la configuration, l'outil) — joué par test-975 (et test-905 pour les gardes) ─────────────────────────────────────────────── */

/* l'adresse */
m('E01', 'une adresse de moins de six signes (« a@b.c ») est acceptée', F.mail, "a.length < 6 || ", "", ['975']);
m('E02', 'une adresse de plus de 254 signes dont toutes les parties sont permises est acceptée', F.mail, "a.length > 254 || ", "", ['975']);
m('E03', 'la garde explicite des signes dangereux (blancs, sauts de ligne, < > ( ) , ; : \\ ") est retirée', F.mail, "/[\\s\\u0000-\\u001f\\u007f<>(),;:\\\\\"]/.test(a) || ", "", ['975'],
  EQ('`RE_ADRESSE_MEL` refuse déjà les mêmes signes (sa classe de caractères ne les contient pas) : les deux gardes se neutralisent ; la paire E03+E04 prouve que ce sont de vraies gardes'));
m('E04', 'la forme `nom@domaine.tld` n\'est plus vérifiée (`RE_ADRESSE_MEL`) : « @exemple.fr », « a@@exemple.fr » passent', F.mail, "!RE_ADRESSE_MEL.test(a) || ", "", ['975']);
m2('E03+E04', 'ni la garde des signes dangereux ni la forme : un saut de ligne dans l\'adresse (« …\\r\\nBcc: x@… ») ouvrirait un en-tête', [
  [F.mail, "/[\\s\\u0000-\\u001f\\u007f<>(),;:\\\\\"]/.test(a) || ", ""], [F.mail, "!RE_ADRESSE_MEL.test(a) || ", ""]], ['975']);
m('E05', 'le dernier segment peut être numérique (« nom@127.0.0.1 » est une boîte)', F.mail, " || !/\\.[A-Za-z][A-Za-z0-9-]*$/.test(a)", "", ['975']);
m('E06', 'ce qui n\'est pas du texte n\'est plus écarté AVANT `trim()` (un nombre lève)', F.mail, "  if (typeof brut !== 'string') return null;\n", "", ['975']);
m('E07', 'les blancs de bord de l\'adresse ne sont plus retirés', F.mail, "const a = brut.trim();", "const a = brut;", ['975']);

/* la boîte comptée */
m('E09', 'le domaine n\'est plus passé en minuscules', F.mail, "a.slice(i + 1).toLowerCase();", "a.slice(i + 1);", ['975']);
m('E10', 'l\'« +étiquette » n\'est plus retirée : « nom+a@x.fr » et « nom@x.fr » sont deux boîtes', F.mail, "sans = local.replace(/\\+.*$/, '');", "sans = local;", ['975']);

/* les plafonds */
m('E12', 'dix courriels par 24 heures deviennent onze', F.mail, "const COMPTE_MAX = 10,", "const COMPTE_MAX = 11,", ['975']);
m('E13', 'deux courriels par boîte et par semaine deviennent trois', F.mail, "const DEST_MAX = 2,", "const DEST_MAX = 3,", ['975']);
m('E14', 'la fenêtre du compte passe de 24 heures à 48', F.mail, "COMPTE_FENETRE_MS = JOUR;", "COMPTE_FENETRE_MS = 2 * JOUR;", ['975']);
m('E15', 'la fenêtre d\'une boîte passe de sept à six jours', F.mail, "DEST_FENETRE_MS = 7 * JOUR;", "DEST_FENETRE_MS = 6 * JOUR;", ['975']);
m('E16', 'le plafond du compte n\'est atteint qu\'au-delà (`>` au lieu de `>=`)', F.mail, "if (n.compte >= COMPTE_MAX)", "if (n.compte > COMPTE_MAX)", ['975']);
m('E17', 'le plafond d\'une boîte n\'est atteint qu\'au-delà', F.mail, "if (n.destinataire >= DEST_MAX)", "if (n.destinataire > DEST_MAX)", ['975']);
m2('E18', 'la boîte est jugée avant le compte : un compte plein qui écrit à une boîte pleine reçoit le mauvais motif', [
  [F.mail, "    if (n.compte >= COMPTE_MAX) throw erreur('courriel_quota_compte');\n    if (n.destinataire >= DEST_MAX) throw erreur('courriel_quota_destinataire');\n",
    "    if (n.destinataire >= DEST_MAX) throw erreur('courriel_quota_destinataire');\n    if (n.compte >= COMPTE_MAX) throw erreur('courriel_quota_compte');\n"]], ['975']);
m('E19', 'la fenêtre du compte est décalée d\'une milliseconde : à l\'instant PILE où le plus ancien aurait 24 heures, il ne compte plus', F.mail, "compte: t - COMPTE_FENETRE_MS,", "compte: t - COMPTE_FENETRE_MS + 1,", ['975']);
m('E20', 'la fenêtre d\'une boîte est décalée d\'une milliseconde', F.mail, "destinataire: t - DEST_FENETRE_MS }", "destinataire: t - DEST_FENETRE_MS + 1 }", ['975']);
m2('E21', 'la place est prise APRÈS l\'envoi (deux demandes simultanées pour la dernière place passent toutes les deux)', [
  [F.mail, "    const reserve = stockage.courrierNoter({ uid, destH });         // RÉSERVÉ avant de partir : le plafond se prend dans le même souffle qu'il se vérifie\n", "    let reserve = null;\n"],
  [F.mail, "    journal('courriel', { etat: 'envoye' });\n    return { ok: true };", "    reserve = stockage.courrierNoter({ uid, destH });\n    journal('courriel', { etat: 'envoye' });\n    return { ok: true };"]], ['975']);
m('E22', 'un relais qui refuse ne rend plus la place : la panne du relais consomme les plafonds', F.mail, "      stockage.courrierRetirer(reserve);                            // le relais a refusé : la place est rendue\n", "", ['975']);
m('E23', 'la boîte est comptée sur l\'adresse telle qu\'écrite (la normalisation n\'est plus appliquée)', F.mail, "scelleur.hmac('courrier', 'destinataire', normalisee(adresse))", "scelleur.hmac('courrier', 'destinataire', adresse)", ['975']);
m('E24', 'l\'adresse normalisée est rangée EN CLAIR à la place de son empreinte', F.mail, "const destH = scelleur.hmac('courrier', 'destinataire', normalisee(adresse));", "const destH = normalisee(adresse);", ['975']);

/* le journal et les erreurs */
m('E25', 'le journal d\'un échec porte le MESSAGE du relais (qui peut citer un compte) au lieu du nom du refus', F.mail, "nom: (e && (e.code || e.name)) || 'Erreur'", "nom: (e && e.message) || 'Erreur'", ['975']);
m('E26', 'un échec du relais remonte tel quel (son code, son texte) au lieu de « courriel_echec »', F.mail, "      throw erreur('courriel_echec');", "      throw e;", ['975']);
m('E27', 'le journal d\'un envoi réussi porte l\'adresse du destinataire', F.mail, "journal('courriel', { etat: 'envoye' });", "journal('courriel', { etat: 'envoye', adresse });", ['975']);

/* le message */
m('E28', 'le nom affiché de l\'expéditeur ne suit plus le réglage', F.mail, "from: { name: cfg.nom, address: cfg.de }", "from: { name: 'OP MESSAGES', address: cfg.de }", ['975']);
m('E29', 'l\'adresse d\'expédition est l\'identifiant du compte', F.mail, "from: { name: cfg.nom, address: cfg.de }", "from: { name: cfg.nom, address: cfg.utilisateur || cfg.de }", ['975']);
m('E30', 'l\'objet est le titre de la réunion (écrit par l\'hôte) au lieu de l\'objet fixe', F.mail, "subject: SUJET,", "subject: reunion.titre,", ['975']);
m('E31', 'le corps part en HTML au lieu du texte simple', F.mail, "text: corpsDuMessage(", "html: corpsDuMessage(", ['975']);
m('E32', 'la pièce jointe n\'est plus déclarée comme un calendrier', F.mail, "contentType: 'text/calendar; charset=utf-8; method=PUBLISH'", "contentType: 'application/octet-stream'", ['975']);
m('E33', 'le type de la pièce jointe perd son paramètre `method=PUBLISH` (que le fichier déclare en METHOD:PUBLISH)', F.mail, "contentType: 'text/calendar; charset=utf-8; method=PUBLISH'", "contentType: 'text/calendar; charset=utf-8'", ['975']);
m('E34', 'le nom du fichier joint est le titre brut de la réunion', F.mail, "filename: ics.nom({ titre: reunion.titre })", "filename: reunion.titre + '.ics'", ['975']);
m('E35', 'les en-têtes qui découragent les réponses automatiques sont retirés', F.mail, "        headers: { 'X-Auto-Response-Suppress': 'All', 'Auto-Submitted': 'auto-generated' },\n", "", ['975']);
m('E36', 'le message part aussi en copie au destinataire (Cc)', F.mail, "to: adresse, subject: SUJET,", "to: adresse, cc: adresse, subject: SUJET,", ['975']);
m('E37', 'un fichier d\'UNE occurrence dit quand même que la série se répète', F.mail, "corpsDuMessage(hote, reunion, quand, occurrence === undefined || occurrence === null)", "corpsDuMessage(hote, reunion, quand, true)", ['975']);
m('E38', 'le texte d\'une série dit sa PREMIÈRE occurrence au lieu de la prochaine', F.mail, "(cal.premiereApres({ debut: reunion.debut, fin: reunion.fin, tz: reunion.tz, rep: reunion.repetition, n: reunion.n, jusqua: reunion.jusqua }, t, true) || { debut: reunion.debut }).debut", "reunion.debut", ['975']);
m('E39', 'le texte ne dit plus le fuseau de la réunion', F.mail, " + ' (heure de ' + r.tz + ')'", "", ['975']);
m('E40', 'l\'heure du texte est dite en UTC au lieu du fuseau de la réunion', F.mail, "cal.dire(t, fuseauDe(null, r.tz))", "cal.dire(t, 'UTC')", ['975']);
m('E41', 'le texte ne dit plus qu\'on peut ignorer le message', F.mail, "Si vous ne connaissez pas cette personne, ignorez-le : rien n\\'est inscrit à votre nom.", "", ['975']);
m('E42', 'l\'occurrence inconnue n\'est plus refusée : un courriel part avec un fichier vide', F.mail, "    if (fichier === null) throw erreur('occurrence_inconnue');\n", "", ['975']);
m('E43', 'un service sans relais n\'est plus inerte : l\'envoi tente quand même', F.mail, "const ouvert = () => cfg.mode === 'smtp';", "const ouvert = () => true;", ['975']);
m('E44', 'l\'envoi ne vérifie plus que le relais est ouvert (l\'adresse est jugée d\'abord)', F.mail, "  async function envoyer({ uid, hote, destinataire, reunion, occurrence }) {\n    if (!ouvert()) throw erreur('courriel_non_ouvert');\n", "  async function envoyer({ uid, hote, destinataire, reunion, occurrence }) {\n", ['975']);
m('E45', '`verifier` ne se connecte plus au relais : il répond « vérifié » sans essayer', F.mail, "    await transporter().verify();\n", "", ['975']);

/* le canal */
m('E46', 'TLS implicite (« ssl ») n\'est plus demandé à la connexion', F.mail, "secure: cfg.securite === 'ssl'", "secure: false", ['975']);
m('E47', 'STARTTLS n\'est plus EXIGÉ : un relais qui ne l\'offre pas reçoit l\'identifiant et le mot de passe en clair', F.mail, "requireTLS: cfg.securite === 'starttls'", "requireTLS: false", ['975']);
m('E48', '« aucune » n\'interdit plus STARTTLS : le relais qui l\'offre est chiffré malgré le choix de l\'exploitant', F.mail, "ignoreTLS: cfg.securite === 'aucune'", "ignoreTLS: false", ['975']);
m('E49', 'un relais sans identifiant reçoit quand même une tentative d\'authentification', F.mail, "auth: cfg.utilisateur !== null ? { user: cfg.utilisateur, pass: cfg.motDePasse } : undefined,", "auth: { user: cfg.utilisateur, pass: cfg.motDePasse },", ['975']);
m('E50', 'le mot de passe et l\'identifiant sont permutés', F.mail, "{ user: cfg.utilisateur, pass: cfg.motDePasse }", "{ user: cfg.motDePasse, pass: cfg.utilisateur }", ['975']);
m('E51', 'le relais joint est toujours 127.0.0.2, pas celui qu\'on a configuré', F.mail, "host: cfg.hote, port: cfg.port,", "host: '127.0.0.2', port: cfg.port,", ['975']);
m('E52', 'le port configuré n\'est plus lu', F.mail, "host: cfg.hote, port: cfg.port,", "host: cfg.hote, port: 25,", ['975']);
m('E53', 'un relais muet est attendu trente secondes (le délai de salutation ne suit plus le réglage)', F.mail, "greetingTimeout: cfg.timeoutMs,", "greetingTimeout: 30000,", ['975'],
  EQ('nodemailer pose le délai de PRISE (`socket.setTimeout`) dès la connexion, avant la salutation : un relais muet échoue au même instant par ce délai-là (E54 est joué par le relais qui gèle APRÈS la salutation)'));
m('E54', 'un relais qui gèle en pleine conversation est attendu dix minutes (le délai de prise ne suit plus le réglage)', F.mail, "socketTimeout: cfg.timeoutMs,", "socketTimeout: 600000,", ['975']);
m('E55', 'le délai de connexion ne suit plus le réglage', F.mail, "connectionTimeout: cfg.timeoutMs,", "connectionTimeout: 120000,", ['975'],
  EQ('la connexion TCP à 127.0.0.1 est immédiate ; un délai de connexion ne se joue pas sans un routeur qui avale les paquets — le délai de salutation (E53) et de prise (E54) sont joués'));
m('E56', 'le transport peut lire un fichier du disque comme pièce jointe', F.mail, "disableFileAccess: true,", "disableFileAccess: false,", ['975'],
  EQ('aucun chemin n\'atteint une pièce jointe : le contenu est une chaîne que ce service fabrique ; la garde est une défense en profondeur'));
m('E57', 'le transport peut lire une adresse web comme pièce jointe', F.mail, "disableUrlAccess: true,", "disableUrlAccess: false,", ['975'],
  EQ('idem E56 : aucune adresse web n\'atteint une pièce jointe ; défense en profondeur'));
m('E58', 'la version minimale de TLS n\'est plus posée', F.mail, ", tls: { minVersion: 'TLSv1.2' }", "", ['975'],
  EQ('le défaut de Node 22 est déjà TLS 1.2 : la ligne protège d\'un défaut futur ou d\'une option de processus (`--tls-min-v1.0`), ce que le banc ne rejoue pas'));
m('E59', 'l\'arrêt ne ferme plus le transport', F.mail, "if (transport && typeof transport.close === 'function') transport.close();", "", ['975'],
  EQ('un transport sans pool ferme chaque connexion après son envoi : `close()` n\'a rien à fermer'));

/* la route */
m('E60', 'la route ne dit plus que le courriel n\'est pas ouvert avant de juger l\'adresse', F.reu, "    if (!courriel || !courriel.ouvert()) return refus(res, 503, 'courriel_non_ouvert');\n", "", ['975']);
m('E61', 'la route laisse le module juger l\'adresse : une adresse fausse consomme le plafond par minute', F.reu, "typeof b.destinataire !== 'string' || !adresseValide(b.destinataire)", "typeof b.destinataire !== 'string'", ['975']);
m('E62', 'une occurrence négative n\'est plus refusée par la route (le module répond 404 au lieu de 400)', F.reu, "if (!Number.isInteger(b.occurrence) || b.occurrence < 0) return refus(res, 400, 'champ_invalide');", "if (!Number.isInteger(b.occurrence)) return refus(res, 400, 'champ_invalide');", ['975']);
m('E63', 'le plafond par minute des courriels est retiré', F.reu, "    if (!plafond(res, 'courriel', hote.id, { max: 5, fenetreMs: 60000 })) return;\n", "", ['975']);
m('E64', 'le plafond par minute passe de cinq à six', F.reu, "plafond(res, 'courriel', hote.id, { max: 5, fenetreMs: 60000 })", "plafond(res, 'courriel', hote.id, { max: 6, fenetreMs: 60000 })", ['975']);
m('E65', 'le plafond par minute ne se remplit jamais (fenêtre d\'une milliseconde)', F.reu, "plafond(res, 'courriel', hote.id, { max: 5, fenetreMs: 60000 })", "plafond(res, 'courriel', hote.id, { max: 5, fenetreMs: 1 })", ['975']);
m('E66', 'le plafond par minute est commun à tous les hôtes (une clé unique)', F.reu, "plafond(res, 'courriel', hote.id, { max: 5, fenetreMs: 60000 })", "plafond(res, 'courriel', 'tous', { max: 5, fenetreMs: 60000 })", ['975']);
m('E67', 'une réunion annulée s\'envoie encore', F.reu, "    if (reunion.annulee) return refus(res, 409, 'reunion_annulee');\n    if (occurrence === undefined && prochainDe", "    if (occurrence === undefined && prochainDe", ['975']);
m('E68', 'une réunion finie s\'envoie encore', F.reu, "    if (occurrence === undefined && prochainDe(serieDe(reunion), horloge()) === null) return refus(res, 409, 'reunion_passee');\n", "", ['975']);
m('E69', 'la route rend aussi l\'adresse du destinataire', F.reu, "    await courriel.envoyer({ uid: hote.id, hote, destinataire: b.destinataire, reunion, occurrence });\n    res.json({ ok: true });", "    await courriel.envoyer({ uid: hote.id, hote, destinataire: b.destinataire, reunion, occurrence });\n    res.json({ ok: true, destinataire: b.destinataire });", ['975']);
m('E70', 'un relais absent répond 500 au lieu de 503', F.reu, "if (!courriel || !courriel.ouvert()) return refus(res, 503, 'courriel_non_ouvert');", "if (!courriel || !courriel.ouvert()) return refus(res, 500, 'courriel_non_ouvert');", ['975']);
m('E71', 'une adresse fausse répond 422 au lieu de 400', F.reu, "|| !adresseValide(b.destinataire)) return refus(res, 400, 'courriel_invalide');", "|| !adresseValide(b.destinataire)) return refus(res, 422, 'courriel_invalide');", ['975']);
m('E72', 'le plafond du compte répond 403 au lieu de 429', F.reu, "courriel_quota_compte: [429, 'courriel_quota_compte']", "courriel_quota_compte: [403, 'courriel_quota_compte']", ['975']);
m('E73', 'le plafond d\'une boîte répond 403 au lieu de 429', F.reu, "courriel_quota_destinataire: [429, 'courriel_quota_destinataire']", "courriel_quota_destinataire: [403, 'courriel_quota_destinataire']", ['975']);
m('E74', 'un relais qui refuse répond 500 au lieu de 502', F.reu, "courriel_echec: [502, 'courriel_echec']", "courriel_echec: [500, 'courriel_echec']", ['975']);
m('E75', 'une occurrence inconnue répond 400 au lieu de 404', F.reu, "occurrence_inconnue: [404, 'occurrence_inconnue']", "occurrence_inconnue: [400, 'occurrence_inconnue']", ['975']);

/* le manifeste, /api/config, le montage */
m('E76', 'un simple invité peut envoyer l\'invitation (garde R au lieu de H)', F.man, "{ id: 'reunions.courriel', m: 'POST', p: '/api/reunions/:id/courriel',            garde: 'H' }", "{ id: 'reunions.courriel', m: 'POST', p: '/api/reunions/:id/courriel',            garde: 'R' }", ['975', '905']);
m('E77', 'l\'envoi par courriel devient une fonction Pro', F.man, "{ id: 'reunions.courriel', m: 'POST', p: '/api/reunions/:id/courriel',            garde: 'H' }", "{ id: 'reunions.courriel', m: 'POST', p: '/api/reunions/:id/courriel',            garde: 'H', pro: true }", ['905']);
m('E78', '/api/config dit toujours que le courriel n\'est pas ouvert', F.routes, "courriel: { ouvert: !!(ctx.courriel && ctx.courriel.ouvert()) },", "courriel: { ouvert: false },", ['975']);
m('E79', '/api/config dit toujours que le courriel est ouvert', F.routes, "courriel: { ouvert: !!(ctx.courriel && ctx.courriel.ouvert()) },", "courriel: { ouvert: true },", ['975']);
m('E80', '/api/config publie aussi l\'adresse d\'expédition', F.routes, "courriel: { ouvert: !!(ctx.courriel && ctx.courriel.ouvert()) },", "courriel: { ouvert: !!(ctx.courriel && ctx.courriel.ouvert()), de: ctx.config.courriel.de },", ['975']);
m('E81', 'le courriel n\'est plus donné aux routes (`ctx.courriel` absent)', F.index, "push, formule, facturation, courriel,", "push, formule, facturation,", ['975']);
m('E82', 'l\'arrêt du service ne ferme plus le courriel', F.index, "    courriel.arreter();        // ferme la connexion au relais, s'il y en a une\n", "", ['975'],
  EQ('idem E59 : aucune connexion ne reste ouverte entre deux envois'));

/* la configuration */
m('E83', 'un hôte vide n\'est plus pris pour « pas de relais » (le service refuse de démarrer)', F.conf, "brut.hote === null || brut.hote === '') {", "brut.hote === null) {", ['975']);
m('E84', 'un réglage de relais sans hôte ne refuse plus le démarrage (le bloc à moitié posé passe pour inerte)', F.conf, "    for (const k of ['port', 'securite', 'utilisateur', 'mot_de_passe', 'de']) if (brut[k] !== undefined && brut[k] !== null && brut[k] !== '') throw err('courriel.' + k + ' sans courriel.hote : un bloc à moitié posé refuse le démarrage');\n", "", ['975']);
m('E85', 'l\'hôte n\'est plus contrôlé (une espace, un saut de ligne, une adresse web)', F.conf, "typeof brut.hote !== 'string' || !RE_HOTE.test(brut.hote)", "typeof brut.hote !== 'string'", ['975']);
m('E86', 'la sécurité par défaut est « ssl » au lieu de « starttls »', F.conf, "brut.securite === undefined ? 'starttls' : brut.securite", "brut.securite === undefined ? 'ssl' : brut.securite", ['975']);
m('E87', 'une sécurité inconnue est acceptée', F.conf, "if (!SECURITES.includes(securite)) throw", "if (false) throw", ['975']);
m('E88', '« aucune » est acceptée en production vers n\'importe quel hôte', F.conf, "if (securite === 'aucune' && instance === 'prod' && !local) throw", "if (false) throw", ['975']);
m('E89', '« aucune » est refusée même vers un relais local (127.0.0.1, localhost)', F.conf, "const local = o.hote === '127.0.0.1' || o.hote === 'localhost';", "const local = false;", ['975']);
m('E90', 'les ports par défaut sont permutés (ssl 587, starttls 465)', F.conf, "(securite === 'ssl' ? 465 : securite === 'starttls' ? 587 : 25)", "(securite === 'ssl' ? 587 : securite === 'starttls' ? 465 : 25)", ['975']);
m('E91', 'les bornes du port sont élargies d\'un cran de chaque côté (0 et 65536 passent)', F.conf, "port < 1 || port > 65535", "port < 0 || port > 65536", ['975']);
m('E92', 'un identifiant sans mot de passe (ou l\'inverse) est accepté', F.conf, "  if ((o.utilisateur === null) !== (o.motDePasse === null)) throw err('courriel.utilisateur et courriel.mot_de_passe vont ensemble (l\\'un sans l\\'autre ne ferait rien)');\n", "", ['975']);
m('E93', 'un texte sur deux lignes est accepté (identifiant, mot de passe, nom)', F.conf, " || /[\\u0000-\\u001f\\u007f]/.test(v)", "", ['975']);
m('E94', 'la longueur maximale d\'un texte est ignorée', F.conf, "typeof v !== 'string' || v.length > max ||", "typeof v !== 'string' ||", ['975']);
m('E95', 'l\'adresse d\'expédition n\'est plus exigée ni validée', F.conf, "  if (de === null || !RE_ADRESSE_MEL.test(de)) throw err('courriel.de doit être l\\'adresse d\\'expédition (nom@domaine) : sans elle, le courriel n\\'a pas d\\'expéditeur');\n", "", ['975']);
m('E96', 'un délai de moins d\'une seconde est accepté', F.conf, "brut.timeoutMs < 1000", "brut.timeoutMs < 0", ['975']);
m('E97', 'un délai de plus de soixante secondes est accepté', F.conf, "brut.timeoutMs > 60000", "brut.timeoutMs > 6000000", ['975']);
m('E98', 'le mot de passe devient énumérable : un `JSON.stringify(config)` l\'emporte', F.conf, "{ value: o.motDePasse, enumerable: false, writable: false, configurable: false }", "{ value: o.motDePasse, enumerable: true, writable: false, configurable: false }", ['975']);
m('E99', 'le nom affiché par défaut n\'est plus « OP MESSAGES »', F.conf, "de: null, nom: 'OP MESSAGES', timeoutMs: 15000 }", "de: null, nom: 'MESSAGES', timeoutMs: 15000 }", ['975']);
m('E100', 'un bloc qui est une liste est accepté (pris pour un bloc vide)', F.conf, "if (!brut || typeof brut !== 'object' || Array.isArray(brut)) throw err('courriel doit être un objet');", "if (!brut || typeof brut !== 'object') throw err('courriel doit être un objet');", ['975']);
m('E101', 'le service ne lit plus la section `courriel` de la configuration', F.conf, "    courriel: courrielConfig(cfg, instance),\n", "", ['975']);

/* l'outil */
m('E102', 'l\'outil valide avec les règles de la BÊTA : « aucune » vers un relais distant passe', F.cfgmail, "  try { valide = courrielConfig({ courriel: brut }, 'prod'); } catch (e) { echec(sansPrefixe(e)); }", "  try { valide = courrielConfig({ courriel: brut }, 'beta'); } catch (e) { echec(sansPrefixe(e)); }", ['975']);
m('E103', 'l\'outil n\'éprouve plus le relais avant d\'écrire (un mot de passe faux est écrit)', F.cfgmail, "  if (pourquoi) echec('essai du relais : ' + pourquoi);\n", "", ['975']);
m('E104', '`--verifier` ne sort plus en erreur quand le relais refuse', F.cfgmail, "    if (pourquoi) echec('essai du relais : ' + pourquoi, false);\n", "", ['975']);
m('E105', '`--verifier` ne dit plus qu\'aucun relais n\'est configuré', F.cfgmail, "    if (valide.mode !== 'smtp') echec('rien à vérifier : aucun relais n\\'est configuré, l\\'envoi par courriel est INERTE (la page le dit). Pour le poser, relancer ce script sans « --verifier ».', false);\n", "", ['975']);
m('E106', 'le mot de passe saisi est réécrit à l\'écran (la saisie n\'est plus masquée)', F.cfgmail, "await demander('Mot de passe d\\'APPLICATION (masqué)         : ', true)", "await demander('Mot de passe d\\'APPLICATION (masqué)         : ', false)", ['975']);
m('E107', 'l\'identifiant saisi est réécrit à l\'écran', F.cfgmail, "await demander('Identifiant du compte (masqué, vide = aucun) : ', true)", "await demander('Identifiant du compte (masqué, vide = aucun) : ', false)", ['975']);
m('E108', 'l\'outil imprime le texte de la réponse du relais (qui peut citer un compte)', F.cfgmail, "function diagnostic(e) {\n", "function diagnostic(e) {\n  if (e && e.message) return String(e.message);\n", ['975']);
m('E109', 'un identifiant refusé n\'est plus dit « identifiant ou mot de passe refusé »', F.cfgmail, "if (c === 'EAUTH') return", "if (c === 'EAUTHX') return", ['975']);
m('E110', 'un relais qui refuse la connexion n\'est plus dit tel', F.cfgmail, "if (/ECONNREFUSED|EHOSTUNREACH|ENETUNREACH/.test(m)) return", "if (false) return", ['975']);
m2('E111', 'le fichier de configuration est écrit lisible par tous (0644)', [
  [F.cfgmail, "{ mode: 0o600, flag: 'wx' }", "{ mode: 0o644, flag: 'wx' }"], [F.cfgmail, "fs.chmodSync(tmp, 0o600);", "fs.chmodSync(tmp, 0o644);"], [F.cfgmail, "fs.chmodSync(CONFIG_PATH, 0o600);", "fs.chmodSync(CONFIG_PATH, 0o644);"]], ['975']);
m('E112', 'le délai de connexion déjà posé est perdu à chaque nouvelle pose', F.cfgmail, "  if (avant.timeoutMs !== undefined) brut.timeoutMs = avant.timeoutMs;\n", "", ['975']);
m('E113', 'les autres clés du fichier de configuration sont perdues', F.cfgmail, "const apres = Object.assign({}, config, { courriel: brut });", "const apres = { courriel: brut };", ['975']);
m('E114', 'un port qui n\'est pas un nombre n\'est plus refusé AVANT la validation', F.cfgmail, "if (!/^\\d{1,5}$/.test(port)) echec('Le port est un nombre entre 1 et 65535.'); ", "", ['975']);
m('E115', 'la sécurité laissée vide vaut « aucune » (le défaut ne chiffre plus)', F.cfgmail, "|| 'starttls';", "|| 'aucune';", ['975']);
m('E116', 'une option inconnue est ignorée (l\'outil se lance et écrit)', F.cfgmail, "  for (const a of ARGS) if (a !== '--verifier') echec('option inconnue (« --verifier » est la seule).');\n", "", ['975']);
m('E117', 'un identifiant sans mot de passe n\'est plus refusé par l\'outil lui-même', F.cfgmail, "  if (utilisateur && !motDePasse) echec('Un identifiant sans mot de passe ne ferait rien.');\n", "", ['975']);
m('E118', 'l\'outil n\'exige plus l\'hôte ni l\'adresse d\'expédition', F.cfgmail, "  if (!hote || !de) echec('Une valeur manque (l\\'hôte et l\\'adresse d\\'expédition sont obligatoires).');\n", "", ['975']);

/* ── 5. L'INTERFACE (le module de données de la page, puis la page elle-même) — le module est joué par test-976, la page par la SONDE navigateur ─────────────────────────────────── */

/* le module de données : ce que la page appelle */
m('U01', 'l\'adresse du fichier .ics passe par l\'enveloppe asynchrone de l\'API : la page met « [object Promise] » dans un lien', F.src,
  "const adresseIcs = (id, o2) => api0.adresseIcs(id, o2 || {});", "const adresseIcs = (id, o2) => A.adresseIcs(id, o2 || {});", ['976']);
m('U02', 'le fuseau de l\'appareil n\'est plus dit à l\'entrée : on invite quelqu\'un qui n\'a pas ouvert l\'onglet, et sa notification dit l\'heure de PARIS', F.src,
  /\n      direFuseau\(\);[^\n]*dès l'entrée[^\n]*\n/, "\n", ['976']);
m('U03', 'une panne de lecture de la configuration devient « pas encore ouvert » (faux) au lieu de « on ne sait pas » (null)', F.src,
  "typeof c.courriel.ouvert === 'boolean' ? c.courriel.ouvert : null; } catch (e) { return null; } }", "typeof c.courriel.ouvert === 'boolean' ? c.courriel.ouvert : null; } catch (e) { return false; } }", ['976']);
m('U04', 'le module dit « ouvert » sans avoir lu la réponse du service', F.src,
  "typeof c.courriel.ouvert === 'boolean' ? c.courriel.ouvert : null; } catch", "typeof c.courriel.ouvert === 'boolean' ? true : null; } catch", ['976']);
m('U05', 'une réunion introuvable redit « la conversation » (le refus générique) : la page ne sait plus de quoi elle parle', F.src,
  "if (e && e.code === 'introuvable') throw erreurLocale('reunion_introuvable'); throw e;", "throw e;", ['976']);
m('U06', 'l\'adresse que le service worker demande d\'ouvrir n\'est plus ancrée au début : une adresse d\'un AUTRE site qui finit par /#reunions/<id> ouvre une fiche', F.src,
  "const MOTIF_OUVRIR_REUNION = /^\\/#reunions\\/(r_[0-9a-f]{32})$/;", "const MOTIF_OUVRIR_REUNION = /\\/#reunions\\/(r_[0-9a-f]{32})$/;", ['976']);
m('U07', 'l\'adresse que le service worker demande d\'ouvrir n\'est plus ancrée à la fin : « …/<id>/x » ouvre la fiche', F.src,
  "const MOTIF_OUVRIR_REUNION = /^\\/#reunions\\/(r_[0-9a-f]{32})$/;", "const MOTIF_OUVRIR_REUNION = /^\\/#reunions\\/(r_[0-9a-f]{32})/;", ['976']);
m('U08', 'la phrase système d\'un changement d\'horaire redevient « modifié la réunion » : la personne ne sait pas que SA réponse est repartie à zéro', F.src,
  "(m.meta.horaire ? ' changé l\\'horaire de la réunion' : ' modifié la réunion')", "(' modifié la réunion')", ['976']);
m('U09', 'la phrase système d\'une annulation dit autre chose que « annulé la réunion »', F.src,
  "' annulé la réunion';", "' quitté la réunion';", ['976']);
m('U10', 'la liste ne dit plus de quelle réunion une conversation est la conversation : le titre ne peut plus mener à la fiche', F.src,
  "reunion: c.type === 'reunion' && typeof c.reunion === 'string' ? c.reunion : null,\n      };", "reunion: null,\n      };", ['976']);
m('U11', 'l\'aperçu d\'une conversation de réunion dont le dernier message est une phrase système dit « Activité du groupe »', F.src,
  "(canal ? 'Activité du canal' : c.type === 'reunion' ? 'Activité de la réunion' : 'Activité du groupe')", "(canal ? 'Activité du canal' : 'Activité du groupe')", ['976']);
m('U12', 'l\'événement `reunion` du flux n\'est plus relayé à la page : l\'hôte ne sait pas qu\'on a répondu avant de recharger', F.src,
  "reunion: (d) => { emettre({ type: 'reunions', id: d && typeof d.id === 'string' ? d.id : null, supprime: !!(d && d.supprime) }); relireListePlusTard(); },", "reunion: (d) => { relireListePlusTard(); },", ['976']);
m('U13', 'la liste blanche des champs d\'une réunion laisse passer l\'hôte (la page pourrait dire « l\'organisateur est X »)', F.src,
  "const CHAMPS_REUNION = ['titre',", "const CHAMPS_REUNION = ['hote', 'titre',", ['976']);
m('U14', 'supprimer ne transmet plus le choix « Prévenir les invités » : tout le monde est prévenu, quoi qu\'on ait éteint', F.src,
  "A.supprimerReunion(id, { notifier: !(o2 && o2.notifier === false) })", "A.supprimerReunion(id, { notifier: true })", ['976', 'sonde'], SONDE);

/* la page : le formulaire, la fiche, l'agenda */
m('U20', 'une réunion supprimée ou une personne retirée redit « Cette réunion a été supprimée » : faux pour la personne qu\'on a seulement retirée', F.page,
  "    mot(F.sortie || PHRASE_REUNION_PERDUE);\n", "    mot(F.sortie || 'Cette réunion a été supprimée.');\n", ['sonde'], SONDE);
m('U21', 'l\'adresse tapée ne survit au redessin que si le champ a le focus : toucher « Cette date » la perd', F.page,
  "const ch = $('rc-adresse'), champ = ch && corps.contains(ch) ? { v: ch.value, focus: actif === ch, a: ch.selectionStart } : null;",
  "const champ = actif && corps.contains(actif) && actif.id === 'rc-adresse' ? { v: actif.value, focus: true, a: actif.selectionStart } : null;", ['sonde'], SONDE);
m('U22', 'un envoi réussi laisse son bouton grisé : le deuxième courriel ne peut plus partir', F.page,
  "          b.removeAttribute('aria-disabled');\n          mot('Invitation envoyée par courriel');", "          mot('Invitation envoyée par courriel');", ['sonde'], SONDE);
m('U23', 'la date choisie dans l\'agenda n\'est plus revérifiée : après un changement d\'horaire la fiche parle d\'un jour qui n\'existe plus', F.page,
  "if (F.occurrence && d.repetition !== 'aucune' && F.occVersion !== d.version) {", "if (false) {", ['sonde'], SONDE);
m('U24', 'le titre de la conversation d\'une réunion ouvre les infos d\'un groupe, pas la réunion', F.page,
  "if (CAP.reunions && rc) { declencheur = $('conv-titre');", "if (false && rc) { declencheur = $('conv-titre');", ['sonde'], SONDE);
m('U25', 'l\'événement `reunions` ne redessine plus la fiche ouverte : l\'hôte ne voit la réponse de Bruno qu\'en la fermant', F.page,
  "reunionDisparue(reu.fiche); else rendreFiche();", "reunionDisparue(reu.fiche);", ['sonde'], SONDE);
m('U26', 'l\'organisateur se voit proposer de répondre à sa propre réunion', F.page,
  "if (!hote && !d.annulee) s += '<div class=\"rubrique\"><span>Ta réponse</span>", "if (!d.annulee) s += '<div class=\"rubrique\"><span>Ta réponse</span>", ['sonde'], SONDE);
m('U27', 'un invité voit les gestes de l\'organisateur (modifier, annuler, supprimer, courriel)', F.page,
  "    if (hote) {\n      s += '<div class=\"rubrique\"><span>Organisateur</span></div>';", "    if (true) {\n      s += '<div class=\"rubrique\"><span>Organisateur</span></div>';", ['sonde'], SONDE);
m('U28', 'un lieu qui commence par « javascript: » devient un lien', F.page,
  "const estUrl = t => /^https?:\\/\\/[^\\s<>\"'`]{1,280}$/i.test(String(t || ''));", "const estUrl = t => /^[a-z]+:[^\\s<>\"'`]{1,280}$/i.test(String(t || ''));", ['sonde'], SONDE);
m('U29', 'le lien du lieu perd « noreferrer » : l\'adresse de la fiche (avec l\'identifiant de la réunion) part chez le site du lieu', F.page,
  "target=\"_blank\" rel=\"noopener noreferrer\">' + esc(d.lieu)", "target=\"_blank\" rel=\"noopener\">' + esc(d.lieu)", ['sonde'], SONDE);
m('U30', 'l\'agenda écrit l\'heure du fuseau de la RÉUNION et non celle de l\'appareil : Bruno, à New York, lit 14:00', F.page,
  "'<span class=\"reunion-heure\">' + esc(FMT_HEURE.format(o.debut)) + '<small>' + esc(FMT_HEURE.format(o.fin)) + '</small></span>'", "'<span class=\"reunion-heure\">' + esc(heureDans(o.debut, r.tz)) + '<small>' + esc(heureDans(o.fin, r.tz)) + '</small></span>'", ['sonde'], SONDE);
m('U31', '« Notifier les invités » éteint est envoyé comme allumé', F.page,
  "else if (act === 'form-notifier') { reu.form.notifier = !reu.form.notifier;", "else if (act === 'form-notifier') { reu.form.notifier = true;", ['sonde'], SONDE);
m('U32', 'modifier envoie le titre même quand il n\'a pas changé (et réécrit donc ce qu\'un autre venait de changer)', F.page,
  "if (c.titre !== I.titre) ch.titre = c.titre;", "ch.titre = c.titre;", ['sonde'], SONDE);
m('U33', 'la portée du courriel est inversée : « Cette date » envoie toute la série', F.page,
  "{ occurrence: F.courriel.serie ? undefined : occurrenceCourante() }", "{ occurrence: F.courriel.serie ? occurrenceCourante() : undefined }", ['sonde'], SONDE);
m('U34', 'annuler n\'attend plus la confirmation : le premier toucher annule', F.page,
  "else if (act === 'annuler-demander') { F.confirme = 'annuler'; await relire(); }", "else if (act === 'annuler-demander') { b.setAttribute('aria-disabled', 'true'); await source.annulerReunion(id); F.confirme = null; await relire(); }", ['sonde'], SONDE);
m('U35', 'un identifiant d\'adresse n\'est plus vérifié : « #reunions/r_zz » ouvre une feuille et part au service', F.page,
  "const ID_REUNION = /^r_[0-9a-f]{32}$/;", "const ID_REUNION = /^r_/;", ['sonde'], SONDE);

/* ── 6. L'INTERFACE, SUITE — les refus d'ICI, le jour du mois, les collègues d'un espace — joués par la SONDE navigateur ────────────────────────────────────────────────────── */
m('U36', '« tous les mois » un 31 : la page ne dit plus que les mois sans 31 sont sautés', F.page,
  "saute = rep === 'mensuelle' && jour >= 29;", "saute = false;", ['sonde'], SONDE);
m('U37', 'la remarque des mois sautés commence au 30 : un 29 n\'est plus signalé (février)', F.page,
  "saute = rep === 'mensuelle' && jour >= 29;", "saute = rep === 'mensuelle' && jour >= 30;", ['sonde'], SONDE);
m('U38', 'la remarque des mois sautés commence au 28 : un 28 est signalé à tort', F.page,
  "saute = rep === 'mensuelle' && jour >= 29;", "saute = rep === 'mensuelle' && jour >= 28;", ['sonde'], SONDE);
m('U39', 'le formulaire de programmation ne relit plus les collègues : un espace créé depuis le dernier formulaire n\'y paraît pas', F.page,
  /\n    if \(!id\) reu\.colleagues = null;[^\n]*\n/, "\n", ['sonde'], SONDE);
m('U40', 'la fiche ne relit plus les collègues à l\'ouverture : quelqu\'un qui a quitté l\'espace reste proposé à l\'invitation', F.page,
  "function ouvrirFicheEtat(id) { reu.colleagues = null; reu.fiche = {", "function ouvrirFicheEtat(id) { reu.fiche = {", ['sonde'], SONDE);
m('U41', '« Peut-être » s\'écrit « En attente » chez l\'organisateur : il ne sait pas les distinguer', F.page,
  "peutetre: 'Peut-être' };", "peutetre: 'En attente' };", ['sonde'], SONDE);
m('U42', 'changer le début ne déplace plus la fin : une fin avant le début reste dans le formulaire', F.page,
  "if (b && f && f <= b) { const dureeMs", "if (false) { const dureeMs", ['sonde'], SONDE);
m('U43', 'le titre vide n\'est plus refusé ICI : la demande part au service', F.page,
  "if (!titre) { erreurInfo('Donne un titre à la réunion.'); $('rf-titre').focus(); return null; }", "", ['sonde'], SONDE);
m('U44', 'une fin avant le début n\'est plus refusée ICI : la demande part au service', F.page,
  "if (fin <= debut) { erreurInfo('La fin de la réunion doit tomber après son début.'); $('rf-fin').focus(); return null; }", "", ['sonde'], SONDE);
m('U45', 'un nombre de réunions de 1 n\'est plus refusé ICI : la demande part au service', F.page,
  "if (!Number.isInteger(n) || n < 2 || n > 1000) {", "if (!Number.isInteger(n) || n < 1 || n > 1000) {", ['sonde'], SONDE);

/* ── 7. LA RELECTURE DU GARDIEN (3 octobre 2026) : le saut du calendrier, le budget d'un tour, l'agenda d'un invité et sa sortie, l'hôte bloqué, Gmail, la réparation — et les entrées d'avant dont le motif a changé ── */
m("X01", "le calendrier ne saute plus à la fenêtre : une série quotidienne commencée en 2000 est reparcourue depuis son premier jour (9 800 périodes) — les résultats sont les mêmes, seul le décompte le voit", F.cal,
  "if (s.rep === 'quotidienne') { const k = Math.max(0, nMin - numeroJour(anc)); return { k, valides: k }; }", "if (s.rep === 'quotidienne') { return { k: 0, valides: 0 }; }", ["970"]);
m("X02", "après le saut quotidien, le RANG des occurrences est faux (les rangs sautés ne sont plus comptés) : « après N fois » s'arrête trop tard", F.cal,
  "{ const k = Math.max(0, nMin - numeroJour(anc)); return { k, valides: k }; }", "{ const k = Math.max(0, nMin - numeroJour(anc)); return { k, valides: 0 }; }", ["970"]);
m("X03", "le saut hebdomadaire démarre une semaine trop tard : une occurrence du bord de la fenêtre disparaît", F.cal,
  "Math.ceil((nMin - numeroJour(anc)) / 7)", "Math.ceil((nMin - numeroJour(anc)) / 7) + 1", ["970"]);
m("X04", "le saut mensuel démarre un mois trop tard : les occurrences du mois de la fenêtre disparaissent", F.cal,
  "(dMin.m - 1) - idx0 - 1);", "(dMin.m - 1) - idx0 + 1);", ["970"]);
m("X05", "le décompte des mois qui ont un 31 se trompe d'un (7 par année devient 8) : le rang d'un « tous les mois le 31 » dérive", F.cal,
  "n += j === 31 ? 7 : j === 30 ? 11 :", "n += j === 31 ? 8 : j === 30 ? 11 :", ["970"]);
m("X06", "la fin d'une série n'a plus sa journée de marge : une série qui finit ce soir peut être écartée de l'agenda avant sa dernière occurrence", F.cal,
  "+ (s.fin - s.debut) + JOUR;", "+ (s.fin - s.debut);", ["970"]);
m("X07", "une réunion simple n'a plus de fin de série (NULL) : elle reste « sans fin » dans l'agenda de ses invités", F.cal,
  "if (s.rep === 'aucune') return s.fin;", "if (s.rep === 'aucune') return null;", ["970", "973"]);
m("X10", "le budget en rappels n'arrête plus le tour : un tour envoie tout, comme avant (34 secondes de service gelé sur trois cents grosses réunions)", F.plan,
  "(bilan.envoyes >= budget || montre() - debut >= tempsMax)", "(montre() - debut >= tempsMax)", ["974"]);
m("X11", "le plafond de TEMPS n'arrête plus le tour : seul le nombre de rappels le borne", F.plan,
  "(bilan.envoyes >= budget || montre() - debut >= tempsMax)", "(bilan.envoyes >= budget)", ["974"]);
m("X12", "un tour peut ne regarder AUCUNE réunion (le temps est déjà écoulé au premier regard) : le planificateur tourne à vide pour toujours", F.plan,
  "const plein = () => bilan.reunions > 0 && (", "const plein = () => (", ["974"]);
m("X13", "un tour coupé ne retient pas où il s'est arrêté : le suivant repasse sur les réunions déjà finies avant d'avancer", F.plan,
  "if (plein()) { etat.curseurs[nom] = derniere; return 'plein'; }", "if (plein()) { return 'plein'; }", ["974"]);
m("P17", "la rotation ne tourne pas (la clé de reprise est toujours effacée) : les mêmes réunions occupent la place pour toujours", F.plan,
  "etat.curseurs[nom] = bout ? null : derniere;", "etat.curseurs[nom] = null;", ["974"]);
m("X14", "chaque rappel redevient sa propre transaction (un COMMIT, un fsync par rappel) : trente mille COMMIT dans un tour", F.stock,
  "function rappelsEnvoyer(lot) { return tx(() => lot.map(x => rappelEnvoyer(x))); }", "function rappelsEnvoyer(lot) { return lot.map(x => rappelEnvoyer(x)); }", ["972", "974"]);
m("X15", "les réunions urgentes ne sont plus plafonnées par tour : 100 000 réunions regardées d'un trait", F.plan,
  "max: urgentesPlafond }", "max: 100000 }", ["974"]);
m("X16", "le tour qui suit un tour coupé attend douze secondes comme les autres : un arriéré se rattrape en minutes", F.plan,
  "planifier(b.coupe ? Math.min(SUITE_MS, cfg.planificateurMs) : cfg.planificateurMs)", "planifier(cfg.planificateurMs)", ["974"]);
m("X17", "le retard ne se dit plus au début (aucune ligne de journal quand le planificateur est en retard)", F.plan,
  "journal('planif_retard', { etat: 'debut', n: bilan.envoyes });", "", ["974"]);
m("X18", "la fin du retard ne se dit plus", F.plan,
  "etat.enRetard = false; journal('planif_retard', { etat: 'fin' });", "etat.enRetard = false;", ["974"]);
m("X19", "le registre d'une réunion perd les personnes : tous les délais semblent à envoyer à chaque tour", F.stock,
  "s.add(num(r.occurrence) + '|' + r.uid + '|' + num(r.avant));", "s.add(num(r.occurrence) + '|' + num(r.avant));", ["972"]);
m("X20", "la clé de reprise est inclusive : la dernière réunion regardée est regardée de nouveau au tour suivant", F.stock,
  "AND (prochain > ? OR (prochain = ? AND id > ?))", "AND (prochain > ? OR (prochain = ? AND id >= ?))", ["972"]);
m("X21", "la borne basse des lointaines est inclusive : une réunion à l'instant exact de la frontière est regardée dans les deux listes", F.stock,
  "AND prochain <= ? AND prochain > ? AND (prochain > ?", "AND prochain <= ? AND prochain >= ? AND (prochain > ?", ["972"]);
m("X22", "la liste par tranches lit aussi les réunions ANNULÉES (l'annulation ayant remis `prochain` à NULL)", F.stock,
  "SELECT id, prochain FROM reunion WHERE annulee = 0 AND prochain IS NOT NULL", "SELECT id, prochain FROM reunion WHERE prochain IS NOT NULL", ["974"], EQ('`annulee = 0` double `prochain IS NOT NULL` : l\'annulation remet `prochain` à NULL — la garde restante tient seule ; le défaut réel retire LES DEUX (X22b)'));
m2("X22b", "annuler garde sa prochaine occurrence ET le planificateur ne regarde plus `annulee` : une réunion ANNULÉE est rappelée à ses invités", [
  [F.stock, "UPDATE reunion SET annulee = 1, prochain = NULL, version = version + 1, maj = ? WHERE id = ?", "UPDATE reunion SET annulee = 1, version = version + 1, maj = ? WHERE id = ?"],
  [F.stock, "SELECT id, prochain FROM reunion WHERE annulee = 0 AND prochain IS NOT NULL", "SELECT id, prochain FROM reunion WHERE prochain IS NOT NULL"]], ["974"]);
m("X23", "le nombre de rappels par tour accepte zéro", F.conf,
  "rappelsParTour: [1, 100000]", "rappelsParTour: [0, 100000]", ["974"]);
m("X24", "le temps d'un tour peut aller jusqu'à dix minutes (le réglage serait lui-même le gel qu'il empêche)", F.conf,
  "tourMaxMs: [10, 5000]", "tourMaxMs: [10, 600000]", ["974"]);
m("X25", "le nombre d'urgentes accepte cent millions", F.conf,
  "urgentesMax: [1, 100000]", "urgentesMax: [1, 100000000]", ["974"]);
m("X26", "les valeurs de départ du budget changent (2 000 rappels deviennent 20)", F.conf,
  "rappelsParTour: 2000, tourMaxMs: 1000, urgentesMax: 2000 };", "rappelsParTour: 20, tourMaxMs: 1000, urgentesMax: 2000 };", ["974"]);
m("X27", "le budget de la configuration n'est plus lu : seul un paramètre de banc le règle", F.plan,
  "entier(rappelsParTour !== undefined ? rappelsParTour : cfg.rappelsParTour, RAPPELS_PAR_TOUR)", "entier(rappelsParTour, RAPPELS_PAR_TOUR)", ["974"]);
m("X27b", "le plafond de temps de la configuration n'est plus lu : seul un paramètre de banc le règle", F.plan,
  "entier(tourMaxMs !== undefined ? tourMaxMs : cfg.tourMaxMs, TOUR_MAX_MS)", "entier(tourMaxMs, TOUR_MAX_MS)", ["974"]);
m("X27c", "le plafond des urgentes de la configuration n'est plus lu : seul un paramètre de banc le règle", F.plan,
  "entier(urgentesMax !== undefined ? urgentesMax : cfg.urgentesMax, URGENTES_PAR_TOUR)", "entier(urgentesMax, URGENTES_PAR_TOUR)", ["974"]);
m("S41", "la liste de l'agenda perd les séries commencées avant la fenêtre", F.stock,
  "AND (r.rep <> 'aucune' OR r.fin > ?) AND (r.fin_serie IS NULL", "AND (r.fin > ?) AND (r.fin_serie IS NULL", ["972"]);
m("S46", "le planificateur lit aussi les réunions ANNULÉES (la garde de la lecture seule, l'annulation ayant remis `prochain` à NULL)", F.stock,
  "SELECT id FROM reunion WHERE annulee = 0 AND prochain IS NOT NULL", "SELECT id FROM reunion WHERE prochain IS NOT NULL", ["972"], EQ('`annulee = 0` double `prochain IS NOT NULL` : l\'annulation remet `prochain` à NULL (S10) — la garde restante tient seule ; le défaut réel retire LES DEUX (S10 + S46)'));
m2("S10+S46", "annuler garde sa prochaine occurrence ET le planificateur ne regarde plus `annulee` : une réunion ANNULÉE est rappelée à ses invités", [
  [F.stock, "UPDATE reunion SET annulee = 1, prochain = NULL, version = version + 1, maj = ? WHERE id = ?", "UPDATE reunion SET annulee = 1, version = version + 1, maj = ? WHERE id = ?"],
  [F.stock, "SELECT id FROM reunion WHERE annulee = 0 AND prochain IS NOT NULL", "SELECT id FROM reunion WHERE prochain IS NOT NULL"]], ["972"]);
m("R56", "la notification ne dit plus QUI elle nomme (`auteur`) : l'effacement de l'hôte laisse son nom dans la notification", F.outils,
  "stockage.notifCreer({ uid, type, titre, texte, cible: reunion, auteur, remplacer: type === 'reunion_modifiee' })", "stockage.notifCreer({ uid, type, titre, texte, cible: reunion, remplacer: type === 'reunion_modifiee' })", ["973"]);
m("P08", "le planificateur ne consulte plus le registre avant d'envoyer (la ligne du registre fait seule le travail)", F.plan,
  "          if (partis.has(o.debut + '|' + p.uid + '|' + a)) continue;               // déjà parti\n", "", ["974"], EQ('`rappelEnvoyer` est idempotent (INSERT OR IGNORE, aucune notification si TOUS les délais sont déjà notés) : la garde restante tient seule ; le défaut réel retire LES DEUX (P08 + S05)'));
m2("P08+S05", "plus aucun registre : un rappel dû repart à CHAQUE tour", [
  [F.plan, "          if (partis.has(o.debut + '|' + p.uid + '|' + a)) continue;               // déjà parti\n", ""],
  [F.stock, "      if (neufs < 1) return null;\n      return notifCreer({ uid, type: 'reunion_rappel'", "      return notifCreer({ uid, type: 'reunion_rappel'"]], ["974"]);
m("P11", "le texte d'un rappel s'écrit dans le fuseau de la RÉUNION, pas dans celui de la personne", F.plan,
  "texteRappel(r, gens.get(p.uid), o.debut, t)", "texteRappel(r, null, o.debut, t)", ["974"]);
m("P20", "une réunion qui lève arrête le tour : les réunions suivantes ne sont pas regardées", F.plan,
  "try { traiter(x.id, t, restauree, bilan); } catch (e) { erreur = true; journal('planif_echec', { nom: nomDe(e) }); }", "traiter(x.id, t, restauree, bilan);", ["974"]);
m("P22", "une panne est journalisée avec le MESSAGE de l'erreur (qui peut citer une donnée) au lieu de son nom", F.plan,
  "try { traiter(x.id, t, restauree, bilan); } catch (e) { erreur = true; journal('planif_echec', { nom: nomDe(e) }); }", "try { traiter(x.id, t, restauree, bilan); } catch (e) { erreur = true; journal('planif_echec', { nom: e && e.message }); }", ["974"]);
m("P28", "le rappel n'est plus poussé hors de l'application (seule la notification dans l'application reste)", F.plan,
  "        notifieur.pousser({ uid: aEnvoyer[i].uid, type: 'reunion_rappel', reunion: r.id, titre: r.titre, texte: aEnvoyer[i].texte, gid: n.gid, occurrence: aEnvoyer[i].occurrence });\n", "", ["974"]);
m("P29", "le rappel ne réveille plus le flux de la personne : il n'arrive qu'au prochain rafraîchissement", F.plan,
  "      if (prevenus.size) hub.reveiller({ uids: Array.from(prevenus) });\n", "", ["974"]);
m("E08", "la partie locale n'est plus passée en minuscules : « Nom@x.fr » et « nom@x.fr » sont deux boîtes", F.mail,
  "let l = (sans || local).toLowerCase(), d =", "let l = (sans || local), d =", ["975"]);
m("E11", "une partie locale faite de la seule étiquette s'efface : toutes les adresses « +x@d.fr » tombent dans la même boîte", F.mail,
  "let l = (sans || local).toLowerCase()", "let l = (sans).toLowerCase()", ["975"]);
m2("X30", "les séries TERMINÉES ne sont plus écartées en SQL (`fin_serie`) : elles reviennent remplir l'agenda d'un invité", [
  [F.stock, " AND (r.fin_serie IS NULL OR r.fin_serie > ?)", ""],
  [F.stock, ".all(uid, au, du, du)", ".all(uid, au, du)"]], ["972"]);
m("X31", "l'agenda se classe de nouveau par le DÉBUT de la série : 600 séries anciennes vivantes masquent l'invitation d'aujourd'hui", F.stock,
  "ORDER BY (r.prochain IS NULL), r.prochain, r.debut, r.id LIMIT 600", "ORDER BY r.debut, r.id LIMIT 600", ["972"]);
m("X32", "une série qui finit EXACTEMENT au début de la fenêtre y touche encore (borne inclusive)", F.stock,
  "OR r.fin_serie > ?)", "OR r.fin_serie >= ?)", ["972"]);
m("X33", "la création ne pose pas `fin_serie` : toute réunion naît « sans fin »", F.stock,
  "jusqua || null, finSerie === undefined ? null : finSerie, JSON.stringify(rappels)", "jusqua || null, null, JSON.stringify(rappels)", ["972"]);
m("X34", "un changement d'horaire ne réécrit pas `fin_serie` : une série raccourcie reste ouverte, une série prolongée est écartée trop tôt", F.stock,
  "horaire ? (finSerie === undefined ? null : finSerie) : (r.fin_serie", "(r.fin_serie", ["972"]);
m("X35", "« Quitter la réunion » ne se note pas au registre des effacements : une archive d'avant remet la personne dans la réunion", F.stock,
  "      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(id + '|' + uid + '|' + t, 'reunion_invite', t);\n      if (Q('SELECT 1 AS x FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(r.conv, uid)) membreQuitter", "      if (Q('SELECT 1 AS x FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(r.conv, uid)) membreQuitter", ["972"]);
m("X36", "« Quitter la réunion » laisse la personne dans la conversation de la réunion : elle lit encore tout", F.stock,
  "      if (Q('SELECT 1 AS x FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(r.conv, uid)) membreQuitter({ conv: r.conv, uid });   // note `groupe_membre`, écrit « a quitté la réunion »\n", "", ["972"]);
m("X37", "l'hôte peut « quitter » sa propre réunion : elle reste sans hôte", F.stock,
  "      if (uid === r.hote) throw erreur('hote_non_quittable');\n", "", ["972", "905"]);
m("X38", "« Quitter la réunion » laisse l'invitation : la personne la voit toujours dans son agenda", F.stock,
  "      if (uid === r.hote) throw erreur('hote_non_quittable');\n      const t = horloge();\n      Q('DELETE FROM reunion_invite WHERE reunion = ? AND uid = ?').run(id, uid);\n", "      if (uid === r.hote) throw erreur('hote_non_quittable');\n      const t = horloge();\n", ["972"]);
m("X39", "celui qui quitte n'est pas prévenu par un événement adressé : son agenda garde la réunion jusqu'au prochain rafraîchissement", F.stock,
  "      journalAjouter('reunion', null, uid, id);\n      return { gid: journalAjouter('reunion', r.conv, null, id), conv: r.conv, hote: r.hote };", "      return { gid: journalAjouter('reunion', r.conv, null, id), conv: r.conv, hote: r.hote };", ["972"]);
m("X40", "la route ne pose pas la fin de série à la création", F.reu,
  ", prochain, finSerie: cal.finDeSerie(v.serie) });", ", prochain });", ["973"]);
m("X41", "la route ne réécrit pas la fin de série quand l'horaire change", F.reu,
  "{ prochain, finSerie: cal.finDeSerie(v.serie) } : {}", "{ prochain } : {}", ["973"]);
m("X42", "le refus « l'hôte ne quitte pas » n'a pas son code HTTP : il devient une erreur 500", F.reu,
  "hote_non_quittable: [409, 'hote_non_quittable'], ", "", ["973", "905"]);
m("X43", "la route « quitter » est gardée comme une route d'hôte (H) : l'invité ne peut plus partir", F.man,
  "{ id: 'reunions.quitter',  m: 'POST', p: '/api/reunions/:id/quitter',              garde: 'R' }", "{ id: 'reunions.quitter',  m: 'POST', p: '/api/reunions/:id/quitter',              garde: 'H' }", ["905"]);
m("X44", "la route « quitter » ne réveille plus personne : l'organisateur ne voit partir l'invité qu'au prochain rafraîchissement", F.reu,
  "    hub.reveiller({ conv: r.conv, uids: [req.moi.id] });\n    res.json({ ok: true });", "    res.json({ ok: true });", ["sonde"], SONDE);
m("X50", "une notification d'un auteur bloqué part quand même (invitation, modification, annulation)", F.outils,
  "      if (auteur && stockage.contactBloque(auteur, uid)) return null;\n", "", ["973"]);
m("X51", "une modification ne remplace plus la précédente non lue : deux cents modifications font deux cents notifications", F.outils,
  "remplacer: type === 'reunion_modifiee' })", "remplacer: false })", ["973"]);
m("X52", "le remplacement efface aussi les notifications déjà LUES (l'historique de la personne)", F.stock,
  "AND cible = ? AND lue = 0').run(uid, type, cible);", "AND cible = ?').run(uid, type, cible);", ["972"]);
m("X53", "le remplacement ne regarde plus de QUELLE réunion il s'agit : la modification d'une réunion efface celle d'une autre", F.stock,
  "WHERE uid = ? AND type = ? AND cible = ? AND lue = 0').run(uid, type, cible);", "WHERE uid = ? AND type = ? AND lue = 0').run(uid, type);", ["972"]);
m("X54", "le remplacement n'a jamais lieu", F.stock,
  "if (remplacer === true && cible) Q('DELETE FROM notification", "if (false && cible) Q('DELETE FROM notification", ["972", "973"]);
m("X55", "les modifications d'une réunion ne sont plus plafonnées", F.reu,
  "    if (!plafond(res, 'reunion_modif', id, { max: 20, fenetreMs: 3600000 }, 'trop_de_modifications')) return;\n", "", ["973", "976"]);
m("X56", "le plafond des modifications est compté par HÔTE : modifier une réunion en bloque toutes les autres", F.reu,
  "plafond(res, 'reunion_modif', id, {", "plafond(res, 'reunion_modif', hote.id, {", ["973"]);
m("X57", "le refus du plafond dit « trop de demandes » au lieu de « trop de modifications » : l'écran ne sait plus dire pourquoi", F.reu,
  "refus(res, 429, code || 'quota_atteint', { retry: r.retry });", "refus(res, 429, 'quota_atteint', { retry: r.retry });", ["973", "976"]);
m("X58", "vingt modifications par heure deviennent vingt et une", F.reu,
  "{ max: 20, fenetreMs: 3600000 }, 'trop_de_modifications'", "{ max: 21, fenetreMs: 3600000 }, 'trop_de_modifications'", ["973", "976"]);
m("X60", "les points de la partie locale d'une adresse Gmail comptent : « j.dupont » et « jdupont » sont deux boîtes pour le plafond de deux par semaine", F.mail,
  "l = l.replace(/\\./g, '') || l;", "l = l;", ["975"]);
m("X61", "googlemail.com n'est pas ramené à gmail.com : la même boîte écrite autrement échappe au plafond", F.mail,
  "if (d === 'gmail.com' || d === 'googlemail.com')", "if (d === 'gmail.com')", ["975"]);
m("X62", "le domaine de Gmail est reconnu par sa fin (« notgmail.com » perd ses points)", F.mail,
  "if (d === 'gmail.com' || d === 'googlemail.com')", "if (/gmail\\.com$/.test(d) || d === 'googlemail.com')", ["975"]);
m("X63", "le démarrage ne répare plus rien : une réunion dont l'hôte a été effacé par un code d'avant reste sans hôte", F.index,
  "const reparees = stockage.reunionsReparer();", "const reparees = { personnes: 0, pieces: [] };", ["973"]);
m("X64", "la réparation ne cherche plus les hôtes effacés (seulement les invités)", F.stock,
  "SELECT r.hote AS uid FROM reunion r JOIN personne p ON p.id = r.hote WHERE p.etat = 'supprime')", "SELECT r.hote AS uid FROM reunion r JOIN personne p ON p.id = r.hote WHERE p.etat = 'supprime' AND 0)", ["972", "973"]);
m("X65", "la réparation ne cherche plus les invités effacés (seulement les hôtes)", F.stock,
  "SELECT i.uid AS uid FROM reunion_invite i JOIN personne p ON p.id = i.uid WHERE p.etat = 'supprime'", "SELECT i.uid AS uid FROM reunion_invite i JOIN personne p ON p.id = i.uid WHERE p.etat = 'supprime' AND 0", ["972"]);
m("X70", "« Quitter la réunion » confirmé ne quitte rien : la fiche se ferme, le service garde l'invitation", F.page,
  "F.sortie = 'Tu as quitté la réunion'; await source.quitterReunion(id); reunionDisparue(F); return; }", "F.sortie = 'Tu as quitté la réunion'; reunionDisparue(F); return; }", ["sonde"], SONDE);
m("X71", "toucher « Quitter la réunion » quitte tout de suite, sans demander confirmation", F.page,
  "else if (act === 'quitter-demander') { F.confirme = 'quitter'; await relire(); }", "else if (act === 'quitter-demander') { b.setAttribute('aria-disabled', 'true'); F.sortie = 'Tu as quitté la réunion'; await source.quitterReunion(id); reunionDisparue(F); return; }", ["sonde"], SONDE);
m("X72", "l'organisateur voit « Quitter la réunion » dans sa propre fiche", F.page,
  "if (!hote) s += '<div class=\"rubrique\"><span>Invité</span></div>'", "if (true) s += '<div class=\"rubrique\"><span>Invité</span></div>'", ["sonde"], SONDE);
m("X73", "le module de données ne dit pas à la page que la réunion a disparu pour celui qui la quitte", F.src,
  "await pourReunion(A.quitterReunion(id)); reunionChangee(id, true); }", "await pourReunion(A.quitterReunion(id)); }", ["976"], EQ('le service dit la MÊME chose par un événement adressé au quitteur (SSE) : la page l\'apprend par lui ; l\'émission locale n\'est que la ceinture quand le flux est lent ou coupé — la garde restante tient seule'));
m("X74", "le client du service appelle la route des retraits (« retirer ») au lieu de « quitter »", F.api,
  "quitterReunion: (id) => appel('POST', '/api/reunions/' + e(id) + '/quitter')", "quitterReunion: (id) => appel('POST', '/api/reunions/' + e(id) + '/retirer')", ["976"]);
m("X75", "la phrase du plafond de modifications manque : l'écran dit une erreur générique", F.api,
  "    trop_de_modifications: 'Cette réunion vient", "    trop_de_modifications_x: 'Cette réunion vient", ["976"]);
m("X76", "la phrase « l'organisateur ne quitte pas » manque", F.api,
  "    hote_non_quittable: 'L\\'organisateur", "    hote_non_quittable_x: 'L\\'organisateur", ["976"]);

/* ── 8. LA FICHE OUVERTE AU DOIGT SE FERME UNE FOIS (3 octobre 2026, l'essai au navigateur du testeur) : un retour d'historique n'est jamais rejoué tant qu'il est en vol, et une disparition que la page
      apprend de plusieurs côtés (le geste, la source, le flux, la relecture) ferme la fiche UN SEUL coup, avec la phrase du geste. Toutes sont jouées par la partie D de la sonde (`SEULES=D` la joue seule). ── */
m("Y01", "rendreEntree ne note plus le retour en vol : un second « fermer » (deux touchers, un événement du flux) rejoue history.back() — la fiche ouverte au doigt quitte l'application", F.page,
  "    if (retourEnVol) return;\n", "", ["sonde"], SONDE);
m("Y02", "le retour joué (popstate) ne lève plus la marque : seul le filet de 1,5 s la lève — la fiche rouverte aussitôt ne se referme plus au premier toucher", F.page,
  "window.addEventListener('popstate', () => { retourEnVol = false; clearTimeout(filetRetour); });", "window.addEventListener('popstate', () => {});", ["sonde"], SONDE);
m("Y03", "le filet de 1,5 s est retiré : un retour que le navigateur ne rend jamais fige la fermeture de toute couche pour de bon", F.page,
  "    clearTimeout(filetRetour); filetRetour = setTimeout(() => { retourEnVol = false; }, 1500);\n", "", ["sonde"], SONDE);
m("Y04", "la marque de la fiche (`fermee`) n'est plus posée : chaque nouvelle de la disparition redit sa phrase (trois toasts pour une suppression) — le retour, lui, n'est rendu qu'une fois (Y01 le garde)", F.page,
  "    if (!F || F.fermee) return;\n", "    if (!F) return;\n", ["sonde"], SONDE);
m("Y05", "« Supprimer » confirmé n'annonce plus sa phrase AVANT l'attente : l'événement du flux arrive le premier et l'organisateur lit « n'existe plus » à celui qui vient de supprimer", F.page,
  "F.sortie = 'Réunion supprimée'; await source.supprimerReunion(", "await source.supprimerReunion(", ["sonde"], SONDE);
m("Y06", "« Quitter la réunion » confirmé n'annonce plus sa phrase AVANT l'attente : celui qui part lit « n'existe plus, ou tu n'y es plus invité »", F.page,
  "F.sortie = 'Tu as quitté la réunion'; await source.quitterReunion(id); reunionDisparue(F); return; }", "await source.quitterReunion(id); reunionDisparue(F); return; }", ["sonde"], SONDE);
m("Y07", "un geste refusé garde sa phrase annoncée : la réunion supprimée plus tard AILLEURS se ferme sur « Réunion supprimée » au lieu de « n'existe plus »", F.page,
  "catch (er) { if (F) F.sortie = null; b.removeAttribute('aria-disabled');", "catch (er) { b.removeAttribute('aria-disabled');", ["sonde"], SONDE);
m("Y08", "la relecture d'une fiche qui se ferme n'est plus évitée (`rendreFiche` ne regarde plus `fermee`)", F.page,
  "    if (F.fermee) return;  ", "    if (false) return;  ", ["sonde"],
  Object.assign({}, SONDE, EQ('la relecture retrouve « introuvable » et appelle `reunionDisparue`, que SA marque (`fermee`, Y04) rend sans effet : la garde de `rendreFiche` n\'économise qu\'une lecture, aucun comportement n\'en change')));
m("Y09", "`reunionDisparue` ferme la couche d'en dessous quand la feuille n'est plus la fiche (fermée à la main pendant l'attente du geste)", F.page,
  "    if (ouvertePour(F.id) && reu.fiche === F) fermerCouche();\n", "    fermerCouche();\n", ["sonde"],
  Object.assign({}, SONDE, EQ('NON JOUÉE par la sonde, qui ouvre la fiche depuis l\'agenda : il n\'y a aucune couche dessous, `fermerCouche()` n\'y fait rien. La garde protège la conversation d\'une réunion ouverte DERRIÈRE la fiche ; la réunion disparue emporte sa conversation (le service la retire), donc le cas n\'a pas d\'effet visible — dit, pas prouvé')));
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
