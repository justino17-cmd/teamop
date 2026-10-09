/* ══ LES MUTATIONS DES APPELS À PLUSIEURS ET DES SALLES — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » (CLAUDE.md) ═════════════════════════════════════════
   Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il remet, UN PAR UN, les défauts que `tests/test-986` à `990`, `905` (la matrice d'accès), `987` (les routes) et la
   sonde navigateur `sonde-opmessages-groupe.js` gardent. Même lanceur que `mutations-appels.js` (la copie jetable, le témoin, le délai par banc, « mal visée » dite et non comptée) ; un autre catalogue :
     S. le SERVICE — entrer (la capacité, le verrou, l'exclusion, le droit jugé à chaque entrée, la salle d'attente, l'intérim d'une salle sans maître), l'hôte (la succession, l'organisateur qui reprend la main,
        admettre dans la capacité, retirer un co-hôte ou l'hôte), les gardes de route (hôte seul, hôte ou co-hôte, participant) ;
     T. le SIGNAL et l'ÉPHÉMÈRE d'une salle — relayé à la bonne session, entre présents seulement, la limite de 2 Ko, le sondage, les réactions, le partage permis ;
     R. les RÉUNIONS — la fenêtre d'ouverture, l'aperçu public (rien d'un participant, limité), le lien (annulation, fin, renouvellement noté au registre des purges) ;
     P. le MOTEUR de la page (test-990) — qui offre, les candidats d'une liaison quittée, le plafond de débit, la liaison refaite, le pouls, le seuil de la parole, ⛔ l'événement qui devance la réponse HTTP,
        ⛔ l'épingle et le minuteur de celui qui les pose ;
     U. l'ÉCRAN, jugé par la SONDE (les blocs choisis : `sonde:1,5` ne rejoue que l'appel à quatre et l'hôte).
   Lancer :  TMPDIR=/un/dossier node tests/mutations-groupe.js                 (toutes, hors sondes navigateur)
             NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/mutations-groupe.js --sondes     (les mutations jouées par la sonde : une à la fois, quelques minutes chacune)
             node tests/mutations-groupe.js S01 P07                              (seulement celles-là)
             node tests/mutations-groupe.js --verifier                           (ne joue rien : chaque motif se trouve UNE fois dans l'arbre, chaque banc existe)
             node tests/mutations-groupe.js --liste                              (le catalogue)
             --copies=N (défaut 2)   --garder ID   --sans-temoin   --temoins   --details=FICHIER
   ⛔ Lancer APRÈS `git commit` du correctif, jamais avant (correctif → banc → commit → mutation → `git checkout`) : la copie est fabriquée depuis l'arbre, commité ou non. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn, spawnSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const DELAI_MS = 900000;
const F = { page: 'apercu/opmessages/index.html' };
const BANCS = ['905', '909', '945', '986', '987', '988', '989', '990', 'sonde'];
const SONDE_FICHIER = 'sonde-opmessages-groupe.js';
const MUTATIONS = [];
/* [id, nom, [[fichier, ancien, nouveau], …], suites, option] — `ancien` : une chaîne (une seule occurrence). */
const CATALOGUE = [
  /* ── S. LE SERVICE : entrer, la salle, l'hôte ── */
  ["S01", "la capacité n'est plus jugée à l'entrée : une cinquième personne entre dans une salle vidéo pleine", [["server-msg/stockage.js", "      if (!attend && sallePresents(id) >= num(a.capacite)) throw Object.assign(erreur('appel_complet'), { max: num(a.capacite) });   // la page DIT combien la salle porte (4, 6, 12, 25…)\n", ""]], ["986", "987"]],
  ["S02", "le verrou n'est plus jugé : on entre dans une salle verrouillée", [["server-msg/stockage.js", "      if (a.verrou && !pouvoir) throw erreur('verrouillee');\n", ""]], ["986", "987"]],
  ["S03", "le verrou arrête AUSSI l'hôte et les co-hôtes (ils ne rentrent plus dans leur propre salle)", [["server-msg/stockage.js", "if (a.verrou && !pouvoir) throw erreur('verrouillee');", "if (a.verrou) throw erreur('verrouillee');"]], ["986", "990"]],
  ["S04", "un exclu peut revenir (la ligne « exclu » n'est plus lue à l'entrée)", [["server-msg/stockage.js", "      if (p && p.statut === 'exclu') throw erreur('exclu');\n", ""]], ["986", "987", "990"]],
  ["S05", "le droit n'est plus jugé à CHAQUE entrée : quelqu'un qu'on a retiré du groupe rentre dans la salle", [["server-msg/stockage.js", "      if (!droit) throw erreur('introuvable');\n", ""]], ["986"]],
  ["S06", "la salle d'attente est ignorée : tout le monde entre directement", [["server-msg/stockage.js", "      const attend = !!a.attente && !pouvoir;", "      const attend = false;"]], ["986", "987"]],
  ["S07", "une salle peut rester SANS MAÎTRE : le premier qui entre dans la salle d'une réunion ouverte avant l'organisateur n'en devient plus l'intérim", [["server-msg/stockage.js", "const grade = (hoteReunion || !detenteur) ? GRADE_HOTE : (p ? num(p.grade) : 0)", "const grade = hoteReunion ? GRADE_HOTE : (p ? num(p.grade) : 0)"]], ["986"]],
  ["S08", "l'hôte qui part passe la main au plus ancien, sans préférer un co-hôte", [["server-msg/stockage.js", "ORDER BY grade DESC, entre, uid LIMIT 1`).get(id, uid);", "ORDER BY entre, uid LIMIT 1`).get(id, uid);"]], ["986"]],
  ["S09", "l'organisateur qui arrive en retard ne reprend plus la main (celui qui la tenait à sa place la garde)", [["server-msg/stockage.js", "      if (hoteReunion && !attend) Q(`UPDATE appel_part SET grade = ? WHERE appel = ? AND uid <> ? AND grade = ?`).run(GRADE_COHOTE, id, uid, GRADE_HOTE);\n", ""]], ["986"]],
  ["S10", "un second appareil de la même personne peut entrer dans une salle où elle est déjà présente (plus de « pris sur un autre appareil »)", [["server-msg/stockage.js", "        throw erreur('appel_pris');\n      }\n      if (p && p.statut === 'attente' && p.session === session)", "        return { deja: true, attente: false, gids: {}, vue: appelVue(uid, id), etat: a.etat };\n      }\n      if (p && p.statut === 'attente' && p.session === session)"]], ["986"]],
  ["S11", "admettre « tout le monde » dépasse la capacité de la salle", [["server-msg/stockage.js", "        if (sallePresents(id) >= num(a.capacite)) break;\n", ""]], ["986"]],
  ["S12", "un co-hôte peut retirer un autre co-hôte (seul l'hôte le peut)", [["server-msg/stockage.js", "      if (num(p.grade) >= GRADE_COHOTE && num(moi.grade) < GRADE_HOTE) throw erreur('interdit');\n", ""]], ["986"]],
  ["S13", "on peut retirer l'hôte lui-même", [["server-msg/stockage.js", "      if (num(p.grade) >= GRADE_HOTE) throw erreur('interdit');\n", ""]], ["986"]],
  ["S14", "le co-hôte se nomme par un co-hôte (la garde de la route passe de « hôte seul » à « hôte ou co-hôte »)", [["server-msg/manifeste.js", "{ id: 'salles.cohote',     m: 'POST', p: '/api/salles/:id/cohote',                 garde: 'SO' }", "{ id: 'salles.cohote',     m: 'POST', p: '/api/salles/:id/cohote',                 garde: 'SH' }"]], ["905", "987"]],
  ["S15", "« Terminer pour tous » est ouvert aux co-hôtes", [["server-msg/manifeste.js", "{ id: 'salles.terminer',   m: 'POST', p: '/api/salles/:id/terminer',               garde: 'SO' }", "{ id: 'salles.terminer',   m: 'POST', p: '/api/salles/:id/terminer',               garde: 'SH' }"]], ["905", "987"]],
  ["S16", "un simple participant peut demander à couper le micro d'un autre (la garde passe de « hôte » à « participant »)", [["server-msg/manifeste.js", "{ id: 'salles.couper_micro', m: 'POST', p: '/api/salles/:id/couper_micro',          garde: 'SH' }", "{ id: 'salles.couper_micro', m: 'POST', p: '/api/salles/:id/couper_micro',          garde: 'SP' }"]], ["905", "987"]],
  ["S17", "un simple participant peut en retirer un autre", [["server-msg/manifeste.js", "{ id: 'salles.exclure',    m: 'POST', p: '/api/salles/:id/exclure',                garde: 'SH' }", "{ id: 'salles.exclure',    m: 'POST', p: '/api/salles/:id/exclure',                garde: 'SP' }"]], ["905", "987"]],
  ["S18", "un simple participant peut afficher le bandeau « REC » chez tous", [["server-msg/manifeste.js", "{ id: 'salles.rec',        m: 'POST', p: '/api/salles/:id/rec',                    garde: 'SH' }", "{ id: 'salles.rec',        m: 'POST', p: '/api/salles/:id/rec',                    garde: 'SP' }"]], ["905", "987"]],
  ["S19", "quelqu'un qui n'est pas dans la salle peut la lire (la garde de lecture passe de « participant » à « connecté »)", [["server-msg/manifeste.js", "{ id: 'salles.lire',       m: 'GET',  p: '/api/salles/:id',                        garde: 'SP' }", "{ id: 'salles.lire',       m: 'GET',  p: '/api/salles/:id',                        garde: 'S' }"]], ["905"]],
  ["S20", "un groupe de plus de douze personnes lance quand même un appel (plus de 409 `groupe_trop_grand`)", [["server-msg/routes-appels.js", "        if (autres.length + 1 > cfg.groupeInvitesMax + 1) return refus(res, 409, 'groupe_trop_grand', { max: cfg.groupeInvitesMax });\n", ""]], ["987"]],
  /* ⛔ la VERSION d'une vue de salle (`rev`, 9 octobre 2026 — la sonde de groupe : une vue d'avant le geste « Enregistrer », arrivée après sa réponse, arrêtait l'enregistrement de l'hôte) */
  ["S21", "⛔ la vue d'une salle ne porte plus sa version (`rev` toujours 0 : la page reprend la règle d'avant, et une vue d'avant remplace la plus récente)", [["server-msg/stockage.js", "rev: termine ? 0 : appelRev(uid, a.id),", "rev: 0,"]], ["986", "990"]],
  ["S22", "⛔ la version d'une vue est le compteur GLOBAL du journal (ce que la personne n'a pas le droit de connaître : combien d'événements le service a écrits)", [["server-msg/stockage.js", "rev: termine ? 0 : appelRev(uid, a.id),", "rev: termine ? 0 : journalMax(),"]], ["986"]],
  ["S23", "la version d'une vue est le dernier événement de la salle adressé à N'IMPORTE QUI (un identifiant qu'elle ne reçoit pas)", [["server-msg/stockage.js", "SELECT gid FROM journal WHERE uid = ? AND genre = 'appel' AND ref = ? ORDER BY gid DESC LIMIT 1`).get(uid, id);", "SELECT gid FROM journal WHERE (uid = ? OR 1) AND genre = 'appel' AND ref = ? ORDER BY gid DESC LIMIT 1`).get(uid, id);"]], ["986"]],
  ["AR1", "⛔ une conversation archivée ne revient plus quand on y écrit (un message de travail dormirait aux Archivées)", [["server-msg/stockage.js", "    if (type !== 'systeme') Q('UPDATE membre SET archive = 0 WHERE conv = ? AND archive = 1 AND quitte_le IS NULL AND (uid = ? OR muet_jusqua <= ?)').run(conv, auteur, ts);\n", ""]], ["909"]],
  ["AR2", "une conversation archivée ET en sourdine revient quand même (la sourdine ne compte plus)", [["server-msg/stockage.js", "AND (uid = ? OR muet_jusqua <= ?)').run(conv, auteur, ts);", "AND (uid = ? OR ? > 0)').run(conv, auteur, ts);"]], ["909"]],
  ["AR3", "un message SYSTÈME (un nom qui change) ressort une conversation archivée", [["server-msg/stockage.js", "    if (type !== 'systeme') Q('UPDATE membre SET archive = 0", "    if (true) Q('UPDATE membre SET archive = 0"]], ["909"]],
  /* ── TR. « TRANSFÉRER » (9 octobre 2026, relecture adverse) : le service, la couture par les vraies api.js et source-serveur.js — test-945 ── */
  /* TR1 : le verrou SEUL retiré survit, et c'est juste — le nettoyage d'une copie arrivée en double (`s2.deja`) rend le même état final (un message, une copie) ; le verrou n'épargne que le TRAVAIL
     (ne pas recopier 5 Go une seconde fois). La mutation retire donc les deux gardes ensemble : sans elles, deux envois simultanés laissent une copie orpheline. */
  ["TR1", "⛔ deux envois SIMULTANÉS du même geste recopient deux fois et laissent une copie orpheline (ni verrou, ni nettoyage du doublon)", [["server-msg/routes.js", "    if (transfertsEnCours.has(cle)) return refus(res, 409, 'transfert_en_cours');\n", ""], ["server-msg/routes.js", "      if (s2.deja) { for (const c of copies) effacer(stockage.pieceEffacerLigne(c.id)); resultats.push(", "      if (s2.deja) { resultats.push("]], ["945"]],
  ["TR2", "le renvoi d'une photo recopie la pièce et la laisse orpheline (ni contrôle « déjà parti » avant la copie, ni nettoyage après)", [["server-msg/routes.js", "      if (stockage.messageDejaEnvoye(t, uid, b.cid)) { resultats.push({ conv: t, ok: true, deja: true }); continue; }", "      if (false) { continue; }"], ["server-msg/routes.js", "      if (s2.deja) { for (const c of copies) effacer(stockage.pieceEffacerLigne(c.id)); resultats.push(", "      if (s2.deja) { resultats.push("]], ["945"]],
  ["TR3", "⛔ la copie d'un fichier « gardé 3 jours » devient permanente (l'échéance de l'original n'est plus reprise)", [["server-msg/routes.js", "transfere: true, expireMax: m.expire });", "transfere: true });"]], ["945"]],
  ["TR4", "la légende d'une photo TRANSFÉRÉE se modifie", [["server-msg/stockage.js", "if (mt && mt.tr === 1) throw erreur('type'); }", "}"]], ["945"]],
  ["TR5", "⛔ la source ignore l'identifiant d'envoi de la feuille (un nouvel essai double ce qui est parti)", [["server-msg/public/source-serveur.js", "typeof cid === 'string' && /^[0-9a-f]{32}$/.test(cid) ? cid : OPMSG.nouveauCid()", "OPMSG.nouveauCid()"]], ["945"]],
  ["TR6", "toutes refusées : la source jette la première raison seule", [["server-msg/public/source-serveur.js", "catch (e) { if (e && Array.isArray(e.resultats) && e.resultats.length) r = { resultats: e.resultats }; else throw e; }", "catch (e) { throw e; }"]], ["945"]],
  ["TR7", "l'erreur de l'API perd la liste des destinations", [["server-msg/public/api.js", "this.resultats = extra && Array.isArray(extra.resultats) ?", "this.resultats = false ?"]], ["945"]],
  ["TR8", "« Transféré » n'est plus lu par la source (meta.tr)", [["server-msg/public/source-serveur.js", "m.meta.tr === 1) v.transfere = true;", "m.meta.tr === 99) v.transfere = true;"]], ["945"]],
  ["TR9", "la raison d'une destination refusée perd sa phrase", [["server-msg/public/source-serveur.js", "phrase: error ? OPMSG.dire(error) : null", "phrase: null"]], ["945"]],
  ["TR10", "l'API appelle une route qui n'existe pas", [["server-msg/public/api.js", "'/messages/transferer', { seq, vers, cid })", "'/messages/transfert', { seq, vers, cid })"]], ["945"]],
  ["TR11", "⛔ un message d'AVANT mon arrivée se transfère", [["server-msg/stockage.js", "    if (!m || seq < m.depuis_seq) return null;\n    const r = Q(`SELECT x.auteur AS auteur, x.type AS type, x.corps_ch", "    if (!m) return null;\n    const r = Q(`SELECT x.auteur AS auteur, x.type AS type, x.corps_ch"]], ["945"]],
  ["TR12", "⛔ un message ÉCHU se transfère encore", [["server-msg/stockage.js", "x.expire_ts AS expire_ts FROM message x\n                 WHERE x.conv = ? AND x.seq = ? AND (x.expire_ts IS NULL OR x.expire_ts > ?)", "x.expire_ts AS expire_ts FROM message x\n                 WHERE x.conv = ? AND x.seq = ? AND (x.expire_ts IS NULL OR x.expire_ts > ? OR 1)"]], ["945"]],
  ["TR13", "⛔ un message SUPPRIMÉ pour tous se transfère encore", [["server-msg/stockage.js", "    if (!r || r.supprime_le) return null;\n    const texte = r.corps_ch ? ouvrirOuNull('message', 'corps_ch'", "    if (!r) return null;\n    const texte = r.corps_ch ? ouvrirOuNull('message', 'corps_ch'"]], ["945"]],
  ["TR14", "une FICHE de contact part vers une invitation qui attend (jugée comme du texte)", [["server-msg/routes.js", "const typeRegle = k === 'contact' ? 'contact' : m.type;", "const typeRegle = m.type;"]], ["945"]],
  /* ── T. LE SIGNAL ET L'ÉPHÉMÈRE D'UNE SALLE ── */
  ["T01", "le signal d'une salle est relayé à la session de CELUI QUI L'ENVOIE", [["server-msg/appels.js", "      hub.emettreSession(t.session, 'signal', { appel: a.id, de: moi.id, type, donnees: donnees === undefined ? null : donnees });\n      return { relaye: true };\n    }\n    if (a.etat !== 'en_cours')", "      hub.emettreSession(a.session, 'signal', { appel: a.id, de: moi.id, type, donnees: donnees === undefined ? null : donnees });\n      return { relaye: true };\n    }\n    if (a.etat !== 'en_cours')"]], ["987", "988", "990"]],
  ["T02", "un exclu, un parti ou un participant à la porte peut ENVOYER un signal (le relais ne se limite plus aux présents)", [["server-msg/appels.js", "if (a.statut !== 'present' || typeof cible !== 'string' || cible === moi.id) throw erreur('appel_pas_en_cours');", "if (typeof cible !== 'string' || cible === moi.id) throw erreur('appel_pas_en_cours');"]], ["987", "988"]],
  ["T03", "un signal est relayé à quelqu'un qui n'est plus présent (le destinataire n'est plus jugé)", [["server-msg/appels.js", "if (!t || t.statut !== 'present' || !t.session) throw erreur('appel_pas_en_cours');\n      hub.emettreSession(t.session, 'signal'", "if (!t || !t.session) throw erreur('appel_pas_en_cours');\n      hub.emettreSession(t.session, 'signal'"]], ["987", "988"]],
  ["T04", "la limite des 2 Ko d'un événement éphémère disparaît", [["server-msg/routes-salles.js", "    if (tailleEvt(b.donnees) > EVT_OCTETS_MAX) return refus(res, 413, 'evt_trop_gros');\n", ""]], ["987"]],
  ["T05", "un participant ouvre un sondage (plus réservé à l'hôte et aux co-hôtes)", [["server-msg/appels.js", "      if (d.op === 'ouvrir') {\n        if (!hote) throw erreur('interdit');\n", "      if (d.op === 'ouvrir') {\n"]], ["987"]],
  ["T06", "on vote encore dans un sondage fermé", [["server-msg/appels.js", "if (!s || !s.ouvert || d.id !== s.id ||", "if (!s || d.id !== s.id ||"]], ["987"]],
  ["T07", "n'importe quelle chaîne passe pour une réaction (la liste fermée disparaît des DEUX endroits qui la jugent)", [["server-msg/appels.js", "    if (!REACTIONS.includes(emoji)) throw erreur('champ_invalide');\n", ""], ["server-msg/routes-salles.js", "if (typeof emoji !== 'string' || !REACTIONS.includes(emoji)) return refus(res, 400, 'champ_invalide');", "if (typeof emoji !== 'string') return refus(res, 400, 'champ_invalide');"]], ["987", "988"]],
  ["T08", "un participant annonce un partage d'écran que l'hôte n'a pas permis", [["server-msg/routes-salles.js", "    if (b.partage === true && !req.appel.partage_ok && req.appel.grade < 1) return refus(res, 403, 'partage_interdit');\n", ""]], ["987"]],
  ["T09", "sortir d'une salle laisse la main levée de la personne (l'éphémère n'est plus oublié)", [["server-msg/appels.js", "    const avait = e.mains.delete(uid); e.etats.delete(uid);", "    const avait = false; e.etats.delete(uid);"]], ["988"]],
  /* ── R. LES RÉUNIONS : la fenêtre, le lien ── */
  ["R01", "on entre dans la salle d'une réunion à n'importe quelle heure (la fenêtre d'ouverture n'est plus jugée)", [["server-msg/routes-reunions.js", "    if (!fenetreRejoindre(reunion, horloge())) return refus(res, 409, 'reunion_hors_horaire', { ouvre_a: prochaineOuverture(reunion, horloge()) });\n    if (!plafond(res, 'rejoindre_reunion'", "    if (!plafond(res, 'rejoindre_reunion'"]], ["989"]],
  ["R02", "l'aperçu public du lien dit aussi QUI organise (rien d'un participant ne doit en sortir)", [["server-msg/routes-reunions.js", "res.json({ reunion: { titre: r.titre, debut: p.debut, fin: p.fin, en_cours: !!f, attente: !!r.attente }, compte_requis: true });", "res.json({ reunion: { titre: r.titre, debut: p.debut, fin: p.fin, en_cours: !!f, attente: !!r.attente, hote: r.hote }, compte_requis: true });"]], ["989"]],
  ["R03", "l'aperçu public n'est plus limité par réseau", [["server-msg/routes-reunions.js", "    if (!q.ok) { res.set('Retry-After', String(q.retry)); return refus(res, 429, 'quota_atteint', { retry: q.retry }); }\n    const code = corps(req).code;", "    const code = corps(req).code;"]], ["989"]],
  ["R04", "une réunion ANNULÉE garde un lien qui marche", [["server-msg/stockage.js", "    const b = reunionBrute(r.id); if (!b || b.annulee) return null;\n    /* `fin_serie`", "    const b = reunionBrute(r.id); if (!b) return null;\n    /* `fin_serie`"]], ["989"]],
  ["R05", "le lien d'une réunion seule survit des semaines à sa fin (le jour de marge devient trente)", [["server-msg/stockage.js", "    const grace = r.rep === 'aucune' ? LIEN_GRACE_MS : 0;", "    const grace = r.rep === 'aucune' ? 30 * LIEN_GRACE_MS : 0;"]], ["989"]],
  ["R06", "renouveler le lien ne note plus l'ancien au registre des purges : une restauration lui rend la porte", [["server-msg/stockage.js", "      if (r.code_h) Q('INSERT INTO purge(objet, genre, quand) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM purge WHERE objet = ? AND genre = ?)').run(r.code_h, 'reunion_lien', t, r.code_h, 'reunion_lien');\n", ""]], ["989"]],
  ["R07", "le lien se renouvelle sans plafond (dix par heure et par réunion)", [["server-msg/routes-reunions.js", "    if (!plafond(res, 'reunion_lien', req.reunion.id, { max: 10, fenetreMs: 3600000 })) return;\n", ""]], ["989"]],
  /* ── P. LE MOTEUR DE LA PAGE (test-990) ── */
  ["P01", "les DEUX bouts d'une paire font l'offre (le plus petit identifiant n'est plus le seul à offrir)", [["server-msg/public/source-serveur.js", "uid, gen: gen || 0, offrant: moi() < uid, lien: null", "uid, gen: gen || 0, offrant: true, lien: null"]], ["990"]],
  ["P02", "les candidats d'une liaison que l'autre a quittée sont encore ajoutés (le `lien` n'est plus comparé)", [["server-msg/public/source-serveur.js", "if (!pr.pc || (x.lien && pr.lien && x.lien !== pr.lien)) return;", "if (!pr.pc) return;"]], ["990"]],
  ["P03", "le débit n'est plus plafonné par liaison", [["server-msg/public/source-serveur.js", "            if (p.encodings[0].maxBitrate === max) continue;\n            p.encodings[0].maxBitrate = max;\n            await s.setParameters(p);", "            continue;"]], ["990"]],
  ["P04", "la liaison d'une personne qui revient n'est plus REFAITE (sa génération n'est plus comparée)", [["server-msg/public/source-serveur.js", "if (!p || (p.gen && pr.gen && p.gen !== pr.gen)) { fermerPair(c, pr); c.pairs.delete(uid); }", "if (!p) { fermerPair(c, pr); c.pairs.delete(uid); }"]], ["990"]],
  ["P05", "le pouls ne part plus (l'appareil passe pour perdu au bout de 45 s)", [["server-msg/public/source-serveur.js", "        try { await d.api.signalAppel(c.id, null, 'pouls'); }", "        try { await Promise.resolve(); }"]], ["990"]],
  ["P06", "le seuil de la parole est inversé : on s'allume en silence", [["server-msg/public/source-serveur.js", "        if (niveau > T.seuilParle) c.tenus.set(pr.uid, t + T.tenuParle);", "        if (niveau <= T.seuilParle) c.tenus.set(pr.uid, t + T.tenuParle);"]], ["990"]],
  ["P07", "⛔ le défaut trouvé par la sonde : l'événement qui devance la réponse HTTP raccroche la personne au moment où elle répond", [["server-msg/public/source-serveur.js", "        if (c.reponse && (st === 'present' || st === 'attente')) return;\n", ""]], ["990"]],
  ["P08", "la demande de couper le micro n'est jamais acquittée (elle se rejoue à chaque cliché)", [["server-msg/public/source-serveur.js", "    function accuserMicro(id) { const c = courant; if (c && c.id === id) { c.demandeMicro = null; emettreAppel(c); } }", "    function accuserMicro(id) { const c = courant; if (c && c.id === id) { emettreAppel(c); } }"]], ["990"]],
  ["P09", "⛔ l'épingle et le minuteur que je pose ne reviennent plus dans MON cliché", [["server-msg/public/source-serveur.js", "      if ((nom === 'evt' || nom === 'annot') && r && r.ev) surSalleEvt(r.ev);", "      if ((nom === 'evt' || nom === 'annot') && r && r.ev) { /* rien */ }"]], ["990"]],
  ["P10", "⛔ la route rend l'événement à celui qui l'a posé : sans lui, le cliché de l'hôte ne bouge pas", [["server-msg/routes-salles.js", "    res.json({ ok: true, ev });", "    res.json({ ok: true });"]], ["987", "990"]],
  ["P11", "la liaison d'une paire n'est plus créée au signal qui devance la liste des présents", [["server-msg/public/source-serveur.js", "        pr = pairNeuve(s.de, 0); c.pairs.set(s.de, pr); demarrerPair(c, pr);\n      }\n      if (!pr.pret)", "        return;\n      }\n      if (!pr.pret)"]], ["990"]],
  ["P12", "⛔ le repli donne TOUTES les adresses de relais d'emblée (deux allocations par liaison relayée chez coturn : le quota ne tient plus à quatre)", [["server-msg/public/source-serveur.js", "      if (pr.relaisTout) return c.ice.serveurs;\n", "      return c.ice.serveurs;\n"]], ["990"]],
  ["P13", "⛔ la seconde adresse (le TLS) n'arrive jamais : un réseau qui bloque l'UDP ne joint personne", [["server-msg/public/source-serveur.js", "if (!c.fini && !pr.etablie && pr.pc) elargirRelais(c, pr); }, T.toutApres);", "}, T.toutApres);"]], ["990"]],
  ["P14", "⛔ l'offre ne dit pas « toutes les adresses » : l'autre côté, dont la minuterie ne sonne pas, ne l'apprend jamais", [["server-msg/public/source-serveur.js", "relais: pr.relais ? 1 : 0, tout: pr.relaisTout ? 1 : 0 }, true);", "relais: pr.relais ? 1 : 0, tout: 0 }, true);"]], ["990"]],
  ["P15", "⛔ le petit signal d'état ne dit pas « toutes les adresses » : l'offrant, dont la minuterie ne sonne pas, ne l'apprend jamais", [["server-msg/public/source-serveur.js", "signaler(c, pr, 'etat', { lien: pr.lien, relais: 1, tout: 1 }, true);", "signaler(c, pr, 'etat', { lien: pr.lien, relais: 1 }, true);"]], ["990"]],
  ["P16", "⛔ les offres qui devancent ma réponse sont JETÉES (l'offrant ne les renvoie que plus tard, son repli passe avant)", [["server-msg/public/source-serveur.js", "if (c.entrant && c.reponse) { if (c.enAvance.length < 200) c.enAvance.push(s); return; }", "if (c.entrant && c.reponse) return;"]], ["990"]],
  ["P17", "⛔ les offres gardées pendant ma réponse ne sont jamais rejouées", [["server-msg/public/source-serveur.js", "for (const sg of c.enAvance.splice(0)) surSignal(sg);", "c.enAvance.length = 0;"]], ["990"]],
  /* ⛔ UNE VUE D'AVANT NE REMPLACE PAS LA PLUS RÉCENTE (9 octobre 2026). Trois gardes, qui se COUVRENT : retirer seule celle de `surAppel`, de `reprendre` ou de `memoriser` ne fait rien tomber — `appliquer`
     arrête la vue d'avant derrière elles (mesuré : 102 ✓ 0 ✗ pour chacune). Ce n'est pas un banc aveugle : retirées AVEC celle d'`appliquer`, elles tombent (P19, P20). */
  ["P18", "⛔ une vue d'AVANT, rendue après la réponse du geste suivant, remplace la plus récente (la garde d'`appliquer`) : l'enregistrement de l'hôte s'éteint", [["server-msg/public/source-serveur.js", "if (c.fini || perimee(c, v)) return;\n      const avant = c.vue;", "if (c.fini) return;\n      const avant = c.vue;"]], ["990"]],
  ["P19", "⛔ … par le flux en retard sur la réponse d'un geste (les gardes d'`appliquer` ET de `surAppel`)", [["server-msg/public/source-serveur.js", "if (c.fini || perimee(c, v)) return;\n      const avant = c.vue;", "if (c.fini) return;\n      const avant = c.vue;"], ["server-msg/public/source-serveur.js", "      if (plusVieille(v, dernieres.get(v.id))) return true;          // une vue d'avant celle qu'on a déjà lue : rien n'en sort (ni état, ni sonnerie)\n", ""]], ["990"]],
  ["P20", "⛔ … par la liste des appels lue avant le geste et rendue après lui (les gardes d'`appliquer` ET de `reprendre`)", [["server-msg/public/source-serveur.js", "if (c.fini || perimee(c, v)) return;\n      const avant = c.vue;", "if (c.fini) return;\n      const avant = c.vue;"], ["server-msg/public/source-serveur.js", "      if (plusVieille(actif, dernieres.get(actif.id))) return;       // la liste des appels lue AVANT un événement qui l'a doublée\n", ""]], ["990"]],
  ["P21", "la version tenue n'est jamais relevée (elle reste celle de l'entrée : une vue d'avant le dernier geste passe)", [["server-msg/public/source-serveur.js", "c.vue = v; noterVue(v);\n      if (revDe(v) > c.rev) c.rev = revDe(v);\n", "c.vue = v; noterVue(v);\n"]], ["990"]],
  ["P22", "une vue de MÊME version est refusée (la réponse d'un geste, que son propre événement a devancée, ne s'applique plus)", [["server-msg/public/source-serveur.js", "const perimee = (c, v) => revDe(v) > 0 && revDe(v) < (c.rev || 0);\n    const dernieres = new Map();", "const perimee = (c, v) => revDe(v) > 0 && revDe(v) <= (c.rev || 0);\n    const dernieres = new Map();"]], ["990"]],
  /* ── U. L'ÉCRAN, jugé par la sonde (blocs choisis : le reste de la réunion n'y est pas rejoué) ── */
  ["U01", "⛔ la demande de couper le micro n'est plus HONORÉE par la page (le bandeau le dirait, le micro resterait ouvert)", [["apercu/opmessages/index.html", "      if (!deja) { A.micro = false; A.audio.enabled = false; pousserPistes(A);", "      if (!deja) { pousserPistes(A);"]], ["sonde:1,5"]],
  ["U02", "⛔ le bouton « Partager l'écran » paraît sur un iPhone (le navigateur n'y sait pas le faire)", [["apercu/opmessages/index.html", "typeof navigator.mediaDevices.getDisplayMedia === 'function') && !/iPhone|iPod/.test(navigator.userAgent || '');", "typeof navigator.mediaDevices.getDisplayMedia === 'function');"]], ["sonde:1,4"]],
  ["U03", "⛔ en salle d'attente, la page demande déjà le micro et la caméra", [["apercu/opmessages/index.html", "    if (!s.attente && !A.mediasDemandes) acquerirMedias(A, s.type === 'video');", "    if (!A.mediasDemandes) acquerirMedias(A, s.type === 'video');"]], ["sonde:1,5"]],
  ["U04", "⛔ la pastille « nouveau message » du bouton Discussion n'a plus de point de départ (le fil à l'entrée)", [["apercu/opmessages/index.html", "    if (s.conv && !s.attente && !X.discutee) { X.discutee = true; salleDiscussionCharger(A, true); }", "    if (false) { X.discutee = true; }"]], ["sonde:1,2"]],
  ["U05", "⛔ le refus d'une sonnerie (salle pleine) ne dit plus pourquoi : « Appel manqué. »", [["server-msg/public/source-serveur.js", "finir(c, 'manque', { avis: e.dit && typeof e.phrase === 'function' ? e.phrase() : undefined, service: false });", "finir(c, 'manque', { avis: undefined, service: false });"]], ["sonde:1"]],
];
for (const [id, nom, edits, suites, o] of CATALOGUE) MUTATIONS.push(Object.assign({ id, nom, edits, suites, sonde: suites.some((s) => s === 'sonde' || s.startsWith('sonde:')) }, o || {}));

/* ══ LE LANCEUR ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const PREMIERE = new Set([]);          // propre aux mutations des appels à deux : ici chaque motif est unique
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-grp-'));
  for (const d of DOSSIERS_COPIE) copier(path.join(RACINE, d), path.join(dir, d));
  fs.mkdirSync(path.join(dir, 'tests'));
  for (const f of fs.readdirSync(path.join(RACINE, 'tests'))) if (/^(test-9\d\d|test-859|mutations-opmessages|outils-[\w-]+|bac-messages|bac-turn|bac-webrtc|lib-horloge-msg|mode-site|sonde-opmessages-groupe)\.js$/.test(f)) fs.copyFileSync(path.join(RACINE, 'tests', f), path.join(dir, 'tests', f));
  fs.symlinkSync(path.join(RACINE, 'server-msg', 'node_modules'), path.join(dir, 'server-msg', 'node_modules'));
  fs.symlinkSync(path.join(RACINE, 'server', 'node_modules'), path.join(dir, 'server', 'node_modules'));
  return dir;
}
const estSonde = (s) => s === 'sonde' || s.startsWith('sonde:');          // « sonde:1,5 » : la sonde, qui ne joue que ces blocs (SEULEMENT) — les blocs 1 à 7 forment UNE réunion, mais 1 et 5 se jouent seuls
const nomBanc = (s) => estSonde(s) ? 'la sonde (blocs ' + (s.split(':')[1] || 'tous') + ')' : 'test-' + s;
function lancer(dir, suite) {
  return new Promise((resolve) => {
    const sonde = estSonde(suite);
    const f = sonde ? SONDE_FICHIER : fs.readdirSync(path.join(dir, 'tests')).find(x => x.startsWith('test-' + suite) && x.endsWith('.js'));
    /* ⛔ la sonde lance un VRAI Chromium, dont le dossier de profil porte une prise Unix (`SingletonSocket`, 107 octets de chemin au plus) : sous un TMPDIR long (le brouillon d'une session distante),
       « le navigateur ne démarre pas ». La sonde garde donc un TMPDIR COURT (`TMPDIR_SONDE`, par défaut /tmp), les copies, elles, restent où on les met. */
    const env = Object.assign({}, process.env, sonde ? { NODE_PATH: process.env.NODE_PATH || '/opt/node22/lib/node_modules/playwright/node_modules', TMPDIR: process.env.TMPDIR_SONDE || '/tmp', SEULEMENT: suite.split(':')[1] || '' } : {});
    const p = spawn(process.execPath, [path.join(dir, 'tests', f)], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], env });
    let sortie = ''; p.stdout.on('data', d => { sortie += d; }); p.stderr.on('data', d => { sortie += d; });
    const minuteur = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà mort */ } }, DELAI_MS);
    p.on('close', (code) => { clearTimeout(minuteur); const ko = (sortie.match(/(\d+) ✗/g) || []).pop(); resolve({ code, ko: ko ? parseInt(ko, 10) : null, sortie, suite }); });
  });
}
/* applique UNE modification à un texte : exactement une occurrence, et le texte doit changer */
function appliquer(src, a, b, premiere) {
  if (a instanceof RegExp) {
    const n = (src.match(new RegExp(a.source, a.flags.includes('g') ? a.flags : a.flags + 'g')) || []).length;
    if (n !== 1) return { erreur: n === 0 ? 'le motif ne se trouve pas' : 'le motif se trouve ' + n + ' fois' };
    const t = src.replace(a, b);
    return t === src ? { erreur: 'le texte n\'a pas changé' } : { texte: t };
  }
  const n = src.split(a).length - 1;
  if (n !== 1 && !(premiere && n > 1)) return { erreur: n === 0 ? 'le motif ne se trouve pas' : 'le motif se trouve ' + n + ' fois' };
  const t = src.replace(a, () => b);                       // `replace` d'une chaîne ne touche que la première occurrence
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
    const r = appliquer(base, a, b, PREMIERE.has(mut.id));
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
        if (!BANCS.includes(estSonde(s) ? 'sonde' : s) || !ok) { mal++; console.log('  ✗ ' + mut.id + ' : le banc « ' + s + ' » n\'existe pas'); }
      }
      if (!!mut.sonde !== mut.suites.some(estSonde)) { mal++; console.log('  ✗ ' + mut.id + ' : ses bancs et son drapeau `sonde` ne disent pas la même chose'); }
      /* les motifs d'une mutation à plusieurs modifications du MÊME fichier se jugent l'un après l'autre sur le texte déjà modifié : on rejoue le chemin du lanceur sur un texte en mémoire */
      const textes = new Map();
      for (const [fichier, a, b] of mut.edits) {
        const base = textes.has(fichier) ? textes.get(fichier) : fs.readFileSync(path.join(RACINE, fichier), 'utf8');
        const r = appliquer(base, a, b, PREMIERE.has(mut.id));
        if (r.erreur) { mal++; console.log('  ✗ ' + mut.id + ' · ' + mut.nom + ' → MAL VISÉE · ' + r.erreur + ' (' + fichier + ')'); break; }
        textes.set(fichier, r.texte);
      }
    }
    /* la syntaxe de chaque mutation de fichier .js se contrôle dans une copie jetable, comme le lanceur le fait avant de jouer */
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-grp-verif-'));
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
    const visees = Array.from(new Set(liste.flatMap(x => x.suites.map(s => estSonde(s) ? 'sonde:1,2,4,5' : s))));          // un seul témoin pour la sonde : le plus large des blocs joués
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
