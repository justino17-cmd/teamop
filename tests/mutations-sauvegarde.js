/* ══ LES MUTATIONS DE LA SAUVEGARDE HORS SITE — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » ═══════════
   (CLAUDE.md). Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il remet, UN PAR UN, les
   défauts que `tests/test-950` et `test-951` gardent — un archive en clair, une clé de sauvegarde égale à la clé maître, une relecture qui
   lit le fichier LOCAL, une archive non relue laissée au coffre, une rétention qui vide tout ou ne retire rien, un registre des purges
   qu'on ne rejoue pas, des pièces renvoyées à chaque passe, un /health qui ment, une restauration qui écrase sans drapeau, un secret qui
   s'affiche, un coffre qui n'est pas éprouvé avant d'écrire… — dans une COPIE de l'arbre (jamais dans l'arbre : le `git checkout`
   d'après-mutation de CLAUDE.md efface aussi les correctifs non commités), joue les suites visées, et exige qu'AU MOINS UNE tombe
   (code de sortie non nul ou un « ✗ »).

   ⛔ UNE MUTATION DONT LE MOTIF NE TROUVE RIEN EST MAL VISÉE, et le lanceur le DIT au lieu de conclure (`s.replace(motif, autre, 1)` frappe
   la PREMIÈRE occurrence du fichier, pas celle qu'on croit) : il vérifie que chaque motif se trouve UNE SEULE FOIS, et que le texte change.
   ⛔ Une mutation qui survit n'est pas forcément un banc aveugle : elle peut être neutralisée par une autre garde. Le lanceur nomme la
   survivante ; on regarde alors si le COMPORTEMENT a changé avant de conclure.
   ⛔ Plusieurs motifs pour une mutation (`[[ancien, nouveau], …]`) quand le défaut est une moitié d'accord : retirer le chiffrement des
   deux côtés à la fois (sinon l'archive ne se rouvre jamais et tout tombe, pour une autre raison que celle qu'on éprouve).

   Lancer :  node tests/mutations-sauvegarde.js            (toutes)
             node tests/mutations-sauvegarde.js S01 R03    (seulement celles-là)
             node tests/mutations-sauvegarde.js --viser    (ne joue rien : vérifie seulement que chaque motif se trouve une fois)
   Une exécution par mutation, un délai par suite (300 s), deux copies en parallèle (les suites mesurent des temps : pas plus). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');

const RACINE = path.join(__dirname, '..');
const NB_COPIES = 2, DELAI_MS = 300000;
const F = {
  sauv: 'server-msg/sauvegarde.js', stock: 'server-msg/stockage.js', rest: 'server-msg/outils/restaurer.js', conf: 'server-msg/configurer-sauvegarde.js',
  saisie: 'server-msg/saisie.js', index: 'server-msg/index.js', cfg: 'server-msg/config.js', s3: 'server-msg/lib/s3.js', coffre: 'server-msg/coffre.js', rejeu: 'server-msg/rejeu.js', surv: '.github/scripts/surveillance-messages.js',
};
/* [id, nom, fichier, [[ancien, nouveau], …], suites visées (dans l'ordre : on s'arrête à la première qui tombe)] */
const MUTATIONS = [
  /* ── L'archive : chiffrée, liée, authentifiée ── */
  ['S01', 'l\'archive n\'est plus CHIFFRÉE (le chiffreur et le déchiffreur laissent passer)', F.sauv, [
    ["  const chiffreur = crypto.createCipheriv('aes-256-gcm', cle, iv);\n  chiffreur.setAAD(entete);\n", "  const chiffreur = new Transform({ transform(c, e, cb) { cb(null, c); } }); chiffreur.getAuthTag = () => Buffer.alloc(TAILLE_TAG);\n"],
    ["  const dechiffreur = crypto.createDecipheriv('aes-256-gcm', cle, h.iv);\n  dechiffreur.setAAD(h.entete);\n  dechiffreur.setAuthTag(tag);\n", "  const dechiffreur = new Transform({ transform(c, e, cb) { cb(null, c); } });\n"],
  ], ['950', '951']],
  ['S02', 'la clé de sauvegarde peut être la clé MAÎTRE (la configuration l\'accepte)', F.sauv, [["if (Buffer.isBuffer(kek) && kek.length === 32 && crypto.timingSafeEqual(cle, kek)) throw refuse(", 'if (false) throw refuse(']], ['950', '951']],
  ['S09', 'les données associées (l\'en-tête) ne sont plus liées au chiffrement : une archive rebaptisée s\'ouvre', F.sauv, [["  chiffreur.setAAD(entete);\n", ''], ["  dechiffreur.setAAD(h.entete);\n", '']], ['950']],
  ['S26', 'une archive d\'une AUTRE instance n\'est plus refusée avant déchiffrement', F.sauv, [["if (attendu && attendu.instance && h.meta.instance !== attendu.instance) throw erreur('instance-differente');", '']], ['950']],

  /* ── La relecture : ce qu'on retélécharge, pas le fichier local ── */
  ['S03', 'la « relecture » lit le fichier LOCAL au lieu de ce que le coffre rend', F.sauv,
    [["const relu = await client.lireCleVers(cleObjet, relue);", "const relu = (fs.copyFileSync(archive, relue), { ok: true, octets: faite.octets, empreinte: faite.empreinte });"]], ['950', '951']],
  ['S04', 'l\'archive non relue RESTE au coffre (l\'effacement est cru réussi)', F.sauv,
    [["try { retire = !!(await client.effacerCle(cleObjet)).ok; } catch (e) { retire = false; }", 'retire = true;']], ['950', '951']],
  ['S21', 'les comptes de lignes de l\'archive relue ne sont plus comparés à ceux de l\'instantané', F.sauv,
    [["if (JSON.stringify(reouverte.lignes) !== JSON.stringify(copie.lignes) || reouverte.schema !== copie.schema || reouverte.journalMax !== copie.journalMax || reouverte.temoin !== copie.temoin) {", 'if (false) {']], ['950']],
  ['S20', 'une copie VIDÉE par rapport à la base vivante passe pour bonne', F.sauv,
    [["if (avant.nonVides[t] === true && apres.nonVides[t] === true && !(copie.lignes && copie.lignes[t] > 0)) return 'copie-vide-' + t;", '']], ['950']],
  ['S18', 'le marqueur de dépôt n\'est plus écrit avant l\'envoi (une passe tuée laisse un objet que personne ne retire)', F.sauv,
    [["      etat.depot = { cle: cleObjet, ts: t0 };\n      ecrireEtat();\n", '']], ['950']],
  ['S19', 'un arrêt du service compte comme un ÉCHEC (la surveillance crierait à chaque déploiement)', F.sauv,
    [["if (motif === 'arret') { ecrireEtat(); journaliser('sauvegarde', { etat: 'arret' }); return { ok: false, motif: 'arret', baseOk }; }", '']], ['950']],
  ['S14', 'la garde de place disque est retirée (une copie pourrait remplir le disque du service)', F.sauv,
    [["if (libre < poids * 2.5 + 64 * 1048576 + disqueMinOctets) return noter(false, 'disque-insuffisant');", '']], ['950']],

  /* ── La rétention : le seul endroit qui efface ── */
  ['S05', 'la rétention efface TOUT, même les trois plus récentes', F.sauv, [["return miens.slice(garde).filter(a => a.ts < limite).map(a => a.cle);", 'return miens.map(a => a.cle);']], ['950']],
  ['S06', 'la rétention n\'efface plus RIEN (le coffre grossit sans fin)', F.sauv, [["return miens.slice(garde).filter(a => a.ts < limite).map(a => a.cle);", 'return [];']], ['950']],
  ['S07', 'un réglage de 0 jour n\'est plus ramené à 14 : il vide le coffre', F.sauv, [["const j = Number.isFinite(jours) && jours >= 1 ? jours : 14;", 'const j = Number.isFinite(jours) ? jours : 14;']], ['950']],
  ['S08', 'la configuration accepte une rétention de 0 jour', F.sauv, [["entier(c, 'retentionJours', 14, 1, 365)", "entier(c, 'retentionJours', 14, 0, 365)"]], ['950', '951']],

  /* ── Les pièces : un miroir qui ne vide jamais le coffre ── */
  ['S10', 'les pièces sont renvoyées à CHAQUE passage', F.sauv, [["if (auCoffre.get(l.rel) === l.taille) bilan.dejaLa++; else aEnvoyer.push(l);", 'aEnvoyer.push(l);']], ['950']],
  ['S15', 'une pièce manquante est retirée du coffre dès le premier passage (plus de « deux passes de suite »)', F.sauv,
    [["const candidates = Object.keys(absentes).filter(rel => vusAvant[rel] !== undefined);", 'const candidates = Object.keys(absentes);']], ['950']],
  ['S16', 'un dossier de pièces VIDE vide le coffre (un montage raté ressemble à ça)', F.sauv, [["const dossierVide = !locales.some(l => l.taille > 0) && auCoffre.size > 0;", 'const dossierVide = false;']], ['950']],
  ['S17', 'la garde de « suppression massive » des pièces est retirée', F.sauv, [["} else if (candidates.length > Math.max(200, Math.floor(auCoffre.size / 2))) {", '} else if (false) {']], ['950']],
  ['S28', 'le miroir envoie TOUT fichier non caché, dépôts EN COURS (`tmp/…`) compris — ils restaient au coffre puis REVENAIENT à la restauration (A5)', F.sauv, [
    ["    if (!d.isDirectory() || !/^[0-9a-f]{2}$/.test(d.name)) { ignorees++; continue; }", "    if (!d.isDirectory()) { ignorees++; continue; }"],
    ["const pieceRelOk = (rel) => typeof rel === 'string' && PIECE_REL.test(rel) && rel.slice(5, 7) === rel.slice(0, 2);", "const pieceRelOk = (rel) => typeof rel === 'string';"]], ['950', '951']],
  ['S29', 'un nom de pièce rangé dans le MAUVAIS dossier est pris pour une pièce (le service ne la trouverait jamais)', F.sauv, [["PIECE_REL.test(rel) && rel.slice(5, 7) === rel.slice(0, 2);", "PIECE_REL.test(rel);"]], ['950']],

  /* ── /health et journaux ── */
  ['S11', '/health ment : l\'âge de la dernière copie vaut toujours 0', F.sauv, [["ageH: s ? Math.round((t - s.ts) / 360000) / 10 : null,", 'ageH: 0,']], ['950', '951']],
  ['S12', '/health ment : les échecs de suite ne sont jamais publiés', F.sauv, [["echecs: etat.echecs || 0,", 'echecs: 0,']], ['950', '951']],
  ['S13', 'le journal du service reçoit le nom du bucket et la clé d\'accès', F.sauv,
    [["journaliser('sauvegarde', { etat: ok ? 'ok' : 'echec', motif: motif || '', n: Math.round(((extra && extra.octets) || 0) / 1024) });",
      "journaliser('sauvegarde', { etat: ok ? 'ok' : 'echec', motif: motif || '', n: Math.round(((extra && extra.octets) || 0) / 1024), nom: cfg.coffre.bucket + ' ' + cfg.coffre.accessKey });"]], ['950', '951']],

  /* ── La configuration ── */
  ['S23', 'un coffre en http:// vers Internet est accepté (la signature voyagerait en clair)', F.sauv,
    [["if (!boucleLocale && !/^https:\\/\\/[A-Za-z0-9.-]+(:\\d{1,5})?$/.test(endpoint)) throw refuse(", 'if (false) throw refuse(']], ['950', '951']],
  ['S24', 'le préfixe de l\'AUTRE instance est accepté (la bêta écrirait — et effacerait — chez la production)', F.sauv,
    [["if (prefixe === autre + '/' || prefixe.startsWith(autre + '/')) throw refuse(", 'if (false) throw refuse(']], ['950', '951']],
  ['S25', 'une clé « 0000… » est acceptée comme clé de sauvegarde', F.sauv, [["if (new Set(String(c.cle).toLowerCase()).size < 8) throw refuse(", 'if (false) throw refuse(']], ['950', '951']],
  ['S30', 'l\'ENVOI repasse par le `fetch` du client d\'origine : l\'archive entière tient en mémoire (A4 — 300 Mo d\'archive, 328 Mo de service)', F.coffre,
    [["    poserCleFlux: (cle, chemin, octets, empreinteHex, tempsMax) => poserFichier(conf, cle, chemin, octets, empreinteHex, tempsMax, muetMs),\n", "    poserCleFlux: base.poserCleFlux,\n"]], ['950']],
  ['S31', 'la LECTURE ne coupe plus un coffre muet (jusqu\'à une heure d\'attente, la sauvegarde en cours)', F.coffre,
    [["      req.setTimeout(muetMs, () => echec({ ok: false, statut: 0 }, 'le coffre ne répond plus'));\n", '']], ['950']],
  ['S32', 'l\'ENVOI ne coupe plus un coffre muet', F.coffre, [["      req.setTimeout(muetMs, () => echec(0, 'le coffre ne répond plus'));\n", '']], ['950']],
  ['S27', 'le client S3 n\'est plus la copie exacte de celui d\'OP GESTION', F.s3, [["const region = conf.region || 'eu-central-4';", "const region = conf.region || 'eu-central-5';"]], ['950']],

  /* ── Le stockage : l'instantané et le rejeu des purges ── */
  ['K01', 'l\'instantané est une COPIE BRUTE du fichier (le journal WAL, où vivent les dernières écritures, est ignoré)', F.stock,
    [["const pages = await sqlite.backup(lecteur, vers, { rate: PAS_UNIQUE });", 'fs.copyFileSync(chemin, vers); const pages = 0;']], ['950']],
  ['K02', 'l\'instantané se fait par PETITS PAS (mesuré : sous écritures, la copie ne finit pas)', F.stock, [["{ rate: PAS_UNIQUE }", '{ rate: 1 }']], ['950']],
  ['K03', 'le rejeu des purges ne retire plus les messages éphémères', F.stock, [["bilan.messagesRetires += Number(retirer.run(r.objet).changes);", '']], ['950']],
  ['K04', 'le rejeu des purges ne recopie plus le registre dans la copie', F.stock,
    [["bilan.ajoutees += Number(recopier.run(r.objet, genre, Number(r.quand) || 0, r.objet, genre).changes);", '']], ['950']],
  ['K05', 'un genre de purge INCONNU efface quand même (dans le doute, on efface moins)', F.stock,
    [["        } else {\n          bilan.ignorees++;\n        }", "        } else {\n          bilan.ignorees++; retirer.run(r.objet);\n        }"]], ['950']],
  ['K06', 'le contrôle d\'une copie accepte un fichier vide (ce que laisse un disque plein)', F.stock,
    [["if (taille < 512) return { ok: false, motif: 'fichier vide ou tronqué (' + taille + ' octets)' };", '']], ['950']],
  ['K07', 'le contrôle d\'une copie ne lance plus quick_check', F.stock,
    [["if (verdicts.length !== 1 || verdicts[0] !== 'ok') return { ok: false, motif: ('quick_check : ' + verdicts.slice(0, 3).join(' ; ')).slice(0, 160) };", '']], ['950']],

  /* ── La restauration ── */
  ['R01', 'la restauration ÉCRASE une base existante sans `--ecraser`', F.rest, [["if (existantes.length && !ecraser) throw echec(", 'if (false) throw echec(']], ['950', '951']],
  ['R02', 'la restauration ne vérifie plus que le service est ARRÊTÉ', F.rest, [["if (actif.status === 0) throw echec(", 'if (false) throw echec(']], ['950', '951']],
  ['R03', 'l\'ancienne base est EFFACÉE au lieu d\'être mise de côté', F.rest,
    [["for (const f of existantes) fs.renameSync(path.join(dest, f), path.join(dest, f + marque));", 'for (const f of existantes) fs.rmSync(path.join(dest, f), { force: true });']], ['950', '951']],
  ['R04', 'l\'essai ne rejoue pas le registre des purges', F.rest,
    [["    const p = ouvrir.copie.rejouerPurge(base, reg.registre);\n    dire('  purge rejouée : ' + p.lues", "    const p = { lues: 0, messagesRetires: 0, messagesBlanchis: 0, pieces: [], ignorees: 0, ajoutees: 0 };\n    dire('  purge rejouée : ' + p.lues"]], ['950']],
  ['R05', 'la vraie restauration ne rejoue pas le registre des purges (un message effacé REVIENT)', F.rest,
    [["    const p = ouvrir.copie.rejouerPurge(base, reg.registre);\n    dire('  purge rejouée : ' + p.messagesRetires", "    const p = { lues: 0, messagesRetires: 0, messagesBlanchis: 0, pieces: [], ignorees: 0, ajoutees: 0 };\n    dire('  purge rejouée : ' + p.messagesRetires"]], ['950']],
  ['R06', 'l\'essai ne vérifie plus que la clé maître OUVRE la base restaurée', F.rest, [["const cm = verifierCleMaitre(base, ctx.kekChemin);", 'const cm = { verifiee: true, ok: true };']], ['950', '951']],
  ['R07', 'un essai réussi n\'écrit plus sa date (/health ne passera jamais à essaiJours: 0)', F.rest,
    [["ecrireEssai(ctx.dataDir, { okTs: Date.now(), archive: 'base/' + cible.nom + SAUV.SUFFIXE, schema: r.meta.schema, lignes: v.total, cleMaitreVerifiee: true, pieces: pieces.vraies.length, piecesSansFichier: sansFichier });", '']], ['950', '951']],
  ['R08', 'un nom de pièce suspect (sortie du dossier, dépôt en cours) est restauré', F.rest,
    [["if (!SAUV.pieceRelOk(p.rel)) { refusees++; continue; }", '']], ['950']],
  ['R14', 'la restauration ne pose plus les droits des pièces (0700 / 0600) : l\'umask de l\'outil en décide', F.rest,
    [["    donner(dest + '.partiel', 0o600);\n", ''], ["    fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });\n    for (const d of [racine, path.dirname(dest)]) if (!dossiersPoses.has(d)) { donner(d, 0o700); dossiersPoses.add(d); }\n", "    fs.mkdirSync(path.dirname(dest), { recursive: true });\n"]], ['950']],
  ['R09', 'un essai RATÉ efface la date du dernier essai réussi', F.rest,
    [["ecrireEssai(ctx.dataDir, { echecTs: Date.now(), echecMotif: String(e.message).slice(0, 120) });", "ecrireEssai(ctx.dataDir, { okTs: null, echecTs: Date.now(), echecMotif: String(e.message).slice(0, 120) });"]], ['951', '950']],
  ['R10', 'la restauration ne remonte plus quand une archive plus récente est abîmée (B2 : le geste du guide § 9 échoue)', F.rest,
    [["    } catch (e) {\n      const motif = e && e.sortie ? e.message : 'archive illisible';", "    } catch (e) {\n      throw e;\n      const motif = e && e.sortie ? e.message : 'archive illisible';"]], ['950']],
  ['R11', 'un registre des purges INCONNU est accepté sans `--sans-purge` (les messages supprimés reviennent en silence)', F.rest, [["  if (!sansPurge) {\n", "  if (false) {\n"]], ['950']],
  ['R12', 'le plafond d\'archives essayées pour lire le registre est retiré (téléchargements sans fin)', F.rest, [["for (const a of plusRecentes.slice(0, ESSAIS_REGISTRE)) {", "for (const a of plusRecentes) {"]], ['950']],
  ['R13', 'un refus laisse derrière lui le dossier de destination qu\'il avait créé', F.rest, [["    if (creeParNous) { try { fs.rmdirSync(dest); }", "    if (false) { try { fs.rmdirSync(dest); }"]], ['950']],

  /* ── Gardien, 3 octobre 2026 : l'arriéré, l'ordre des pièces, l'horloge, le disque ── */
  ['S33', 'un ARRIÉRÉ de pièces compte comme un succès (« ok, ageH 0 », puis une restauration à lignes sans fichier — A1)', F.sauv,
    [["    else if (bilan.restantes > 0) { bilan.ok = false; bilan.motif = 'pieces-arriere-' + bilan.restantes; }\n", '']], ['950', '951']],
  ['S34', 'les pièces repartent APRÈS l\'archive de base (une base posée sans ses pièces — A1)', F.sauv, [
    ["      try { pieces = await sauverPieces(t0); } catch (e) { pieces = { bilan: { ok: false, motif: 'pieces-exception' }, elaguer: async () => {} }; }\n      if (arret) return noter(false, 'arret');\n", ''],
    ["      if (pieces) { try { await pieces.elaguer(); } catch (e) { /* le miroir se réessaie à la passe suivante : rien n'a été perdu */ } }\n", "      try { pieces = await sauverPieces(t0); } catch (e) { pieces = null; }\n      if (pieces) { try { await pieces.elaguer(); } catch (e) { /* le miroir se réessaie à la passe suivante : rien n'a été perdu */ } }\n"]], ['950', '951']],
  ['S35', 'le miroir EFFACE avant que la base de la passe soit relue (une pièce supprimée depuis la dernière archive saine devient irrécupérable)', F.sauv,
    [["      if (arret) return noter(false, 'arret');\n\n      /* ── 3. Le dépôt.", "      if (pieces) { try { await pieces.elaguer(); } catch (e) { /* mutation */ } }\n      if (arret) return noter(false, 'arret');\n\n      /* ── 3. Le dépôt."]], ['950']],
  ['S36', 'la rétention n\'est plus gardée par l\'horloge du COFFRE : un saut de +20 jours élague l\'historique (A2)', F.sauv,
    [["        if (ecart !== null && ecart > ECART_HORLOGE_MAX_MS) {", "        if (false) {"]], ['950', '951']],
  ['S37', '`due` croit une date du futur : plus aucune sauvegarde pendant vingt jours après un saut d\'horloge (A2)', F.sauv,
    [["etat.baseTs === undefined || futur(etat.baseTs) || maintenant - etat.baseTs >= cfg.intervalleMs;", "etat.baseTs === undefined || maintenant - etat.baseTs >= cfg.intervalleMs;"]], ['950', '951']],
  ['S38', 'un échec daté du futur retient la reprise (le délai de reprise se compte depuis une date négative — A2)', F.sauv,
    [["if (d && !d.baseOk && !futur(d.ts) && maintenant - d.ts < cfg.retryMs) return false;", "if (d && !d.baseOk && maintenant - d.ts < cfg.retryMs) return false;"]], ['950']],
  ['S39', '/health écrête l\'âge à 0 : un âge NÉGATIF (horloge en désordre) passe pour une sauvegarde toute fraîche (A2)', F.sauv,
    [["ageH: s ? Math.round((t - s.ts) / 360000) / 10 : null,", "ageH: s ? Math.max(0, Math.round((t - s.ts) / 360000) / 10) : null,"]], ['950']],
  ['S40', 'le plancher d\'espace libre du service n\'est plus compté dans le précontrôle de disque (remarque 1)', F.sauv,
    [["if (libre < poids * 2.5 + 64 * 1048576 + disqueMinOctets) return noter(false, 'disque-insuffisant');", "if (libre < poids * 2.5 + 64 * 1048576) return noter(false, 'disque-insuffisant');"]], ['950']],
  ['S41', 'l\'archive reste sur le disque pendant la relecture (le pic de disque repasse à trois fois la base)', F.sauv,
    [["      try { fs.rmSync(archive, { force: true }); } catch (e) { /* libère la place avant la relecture : le pic de disque est de deux fois la base, pas trois */ }\n", '']], ['950']],
  ['S42', 'la relue reste sur le disque pendant le contrôle de sa base déchiffrée', F.sauv,
    [["      try { fs.rmSync(relue, { force: true }); } catch (e) { /* la base déchiffrée suffit au contrôle */ }\n", '']], ['950']],
  ['S43', 'le journal et la mémoire partagée (`-wal`, `-shm`) d\'une copie restent sur le disque quand la copie part', F.sauv,
    [["for (const sfx of ['', '-wal', '-shm']) { try { fs.rmSync(f + sfx, { force: true }); }", "for (const sfx of ['']) { try { fs.rmSync(f + sfx, { force: true }); }"]], ['950']],
  ['W06', 'index.js ne passe plus le plancher d\'espace libre du service au module de sauvegarde', F.index,
    [["horloge: Date.now, journaliser, disqueMinOctets: config.disqueMinMo * 1048576 });", "horloge: Date.now, journaliser });"]], ['951']],
  ['V07', 'la surveillance ne crie plus sur un âge NÉGATIF (une horloge en désordre éteint toute alarme)', F.surv,
    [["    if (typeof j.sauvegarde.ageH === 'number' && j.sauvegarde.ageH < -SEUIL_HORLOGE_H) {", "    if (false) {"]], ['934']],
  ['R15', 'un essai SANS clé maître vérifiée remet la date de /health à zéro (remarque 4)', F.rest,
    [["      if (ctx.dataDir && !cm.verifiee) {", "      if (false) {"]], ['950']],
  ['R16', 'une archive d\'un schéma PLUS RÉCENT que le code est ouverte (remarque 5)', F.rest,
    [["  if (Number.isFinite(o.meta.schema) && o.meta.schema > SCHEMA_CODE) {", "  if (false) {"]], ['950']],
  ['R17', 'l\'essai ne vérifie plus la place avant de télécharger : ENOSPC « inattendu » (remarque 9)', F.rest,
    [["  verifierPlace(ctx.tmpParent,", "  (() => {})(ctx.tmpParent,"]], ['950']],
  ['R18', 'la restauration ne vérifie plus la place avant de télécharger', F.rest,
    [["    verifierPlace(dest, cible.octets * 2.5,", "    (() => {})(dest, cible.octets * 2.5,"]], ['950']],
  ['R19', 'l\'essai ne compare plus les lignes de pièces de la base aux fichiers du coffre (A1)', F.rest,
    [["    const sansFichier = idsPieces.filter(id => !auCoffre.has(relDePiece(id))).length;", "    const sansFichier = 0;"]], ['950']],
  ['R20', 'la restauration ne compte plus les lignes de pièces sans fichier (A1)', F.rest,
    [["      pieces.sansFichier = idsPieces.filter(id => !fs.existsSync(path.join(dest, 'pieces', ...relDePiece(id).split('/')))).length;", "      pieces.sansFichier = 0;"]], ['950']],

  /* ── Gardien, 3 octobre 2026 (A3) : une restauration ne ressuscite rien ── */
  ['K08', 'supprimer une conversation ne se NOTE plus : une restauration la ramène avec tous ses messages', F.stock,
    [["      if (num(Q('DELETE FROM conversation WHERE id = ?').run(id).changes) > 0) Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(id, 'conversation', horloge());   // les membres, messages, réactions, pièces suivent (ON DELETE CASCADE)", "      Q('DELETE FROM conversation WHERE id = ?').run(id);"]], ['950', '951']],
  ['K09', 'le rejeu hors ligne ne connaît plus le genre « conversation »', F.stock, [["        } else if (genre === 'conversation') {", "        } else if (genre === 'conversation_x') {"]], ['950']],
  ['K10', 'le rejeu hors ligne ne connaît plus le genre « appareil »', F.stock, [["        } else if (genre === 'appareil') {", "        } else if (genre === 'appareil_x') {"]], ['950']],
  ['K11', 'déconnecter UN appareil ne se note plus (il revient d\'une archive plus ancienne)', F.stock,
    [["      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'appareil', ? FROM appareil_tel WHERE h = ?`).run(horloge(), h);\n", '']], ['950']],
  ['K12', '« déconnecter les autres appareils » ne se note plus', F.stock,
    [["      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'appareil', ? FROM appareil_tel WHERE personne = ? AND h <> ?`).run(horloge(), id, garderH || '');\n", '']], ['950']],
  ['K13', 'déconnecter TOUS les appareils d\'une personne ne se note plus', F.stock,
    [["      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'appareil', ? FROM appareil_tel WHERE personne = ?`).run(horloge(), id);\n", '']], ['950']],
  ['K14', 'l\'appareil chassé par le onzième ne se note plus', F.stock,
    [["      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'appareil', ? FROM appareil_tel WHERE personne = ? AND h NOT IN (SELECT h FROM appareil_tel WHERE personne = ? ORDER BY vu DESC, cree DESC LIMIT ?)`).run(t, personne, personne, APPAREILS_MAX);\n", '']], ['950']],
  ['K15', 'la restauration ne vide plus les sessions : l\'ancien cookie d\'une déconnexion répond de nouveau 200', F.stock,
    [["      try { bilan.sessions = Number(d.prepare('DELETE FROM session').run().changes); }", "      try { bilan.sessions = 0; }"]], ['950', '951']],
  ['K16', 'la restauration ne lève plus le drapeau du rejeu par le service', F.stock,
    [["      d.prepare('INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run('rejeu_service', String(Date.now()));\n", '']], ['950', '951']],
  ['K17', 'le rejeu retire aussi un appareil RELIÉ après sa révocation (le jeton du même nom, mais un autre appareil)', F.stock,
    [["d.prepare('DELETE FROM appareil_tel WHERE h = ? AND cree <= ?')", "d.prepare('DELETE FROM appareil_tel WHERE h = ? AND cree <= ? + 999999999999')"]], ['950']],
  ['K18', 'un genre écrit dans `purge` n\'est plus déclaré (la garde de code doit le voir : un genre neuf oblige à trancher)', F.stock,
    [["  appareil: 'copie',           // un jeton d'appareil révoqué (déconnexion, « déconnecter les autres », onzième appareil) — l'empreinte, jamais le jeton\n", '']], ['950']],
  ['K19', 'le magasin ne voit plus le drapeau du rejeu : le service redémarre sur la base restaurée sans rien rejouer', F.stock,
    [["const rejeuAFaire = () => metaLire('rejeu_service') !== null;", "const rejeuAFaire = () => false;"]], ['950', '951']],
  ['K20', 'le drapeau du rejeu ne se baisse jamais : chaque démarrage rejouerait tout', F.stock,
    [["const rejeuTermine = () => { Q('DELETE FROM meta WHERE k = ?').run('rejeu_service'); };", "const rejeuTermine = () => {};"]], ['950', '951']],
  ['R21', 'la vraie restauration ne vide plus les sessions', F.rest,
    [["    const ap = ouvrir.copie.apresRestauration(base);\n    dire('  sessions retirées : ' + ap.sessions + ' (chacun se reconnecte", "    const ap = { sessions: 0 };\n    dire('  sessions retirées : ' + ap.sessions + ' (chacun se reconnecte"]], ['950', '951']],
  ['R22', 'l\'essai ne joue plus le vidage des sessions sur sa copie', F.rest,
    [["    const ap = ouvrir.copie.apresRestauration(base);\n    dire('  sessions retirées : ' + ap.sessions + ' (une session", "    const ap = { sessions: 0 };\n    dire('  sessions retirées : ' + ap.sessions + ' (une session"]], ['950']],
  ['R23', 'le service rejoue le registre à CHAQUE démarrage, drapeau ou non', F.rejeu, [["  if (!aFaire) return bilan;\n", '']], ['950']],
  ['R24', 'un rejeu qui échoue baisse quand même le drapeau (l\'effacement raté ne sera jamais retenté)', F.rejeu,
    [["  if (bilan.echecs === 0) { try { stockage.rejeuTermine();", "  if (true) { try { stockage.rejeuTermine();"]], ['950']],
  ['R25', 'un nom de genre hérité du prototype (« constructor ») est appelé comme une fonction du rejeu', F.rejeu,
    [["if (!Object.prototype.hasOwnProperty.call(genres, e.genre) || typeof genres[e.genre] !== 'function') continue;", "if (typeof genres[e.genre] !== 'function') continue;"]], ['950']],
  ['R26', 'une fonction de rejeu asynchrone est acceptée (une promesse perdue : un effacement qu\'on croit fait)', F.rejeu,
    [["      if (r && typeof r.then === 'function') throw new Error('rejeu-asynchrone');   // le démarrage est synchrone : une promesse perdue serait un effacement qu'on croirait fait\n", '']], ['950']],
  ['R27', '`liste` ne marque plus une archive dont le nom est daté du FUTUR (après un saut d\'horloge, la « plus récente » n\'est plus la plus fraîche)', F.rest,
    [["+ ageTexte(a.ts) + (nomDuFutur(a) ? noteDuFutur(a) : '')));", "+ ageTexte(a.ts)));"]], ['950']],
  ['W07', 'le service ne rejoue plus rien au démarrage sur une base restaurée (le câblage d\'index.js)', F.index,
    [["  rejouerAuDemarrage({ stockage, contexte: { effacerPieces, horloge: Date.now }, journaliser });\n", '']], ['951']],

  /* ── configurer-sauvegarde.js et la saisie ── */
  ['C01', 'le coffre n\'est plus ÉPROUVÉ avant d\'écrire la configuration', F.conf, [["  await eprouverCoffre(valide);\n", '']], ['951']],
  ['C02', 'la saisie masquée refait ÉCHO au clavier (un secret s\'affiche)', F.saisie, [["        if (!masque) process.stdout.write(ch);", '        process.stdout.write(ch);']], ['951']],
  ['C03', 'la saisie redirigée RÉÉCRIT un secret à l\'écran', F.saisie, [["process.stdout.write(question + (masque ? '' : r) + '\\n');", "process.stdout.write(question + r + '\\n');"]], ['951']],
  ['C04', 'le fichier temporaire des secrets n\'est plus créé en 0600', F.conf, [["{ mode: 0o600, flag: 'wx' }", "{ flag: 'wx' }"]], ['951']],
  ['C05', 'le PROPRIÉTAIRE de l\'ancien fichier n\'est plus recopié (le service ne pourrait plus le lire)', F.conf,
    [["  try { const st = fs.statSync(CONFIG_PATH); fs.chownSync(tmp, st.uid, st.gid); } catch (e) { /* hors root, le propriétaire est déjà le bon */ }\n", '']], ['951']],
  ['C06', 'les deux saisies de la clé de sauvegarde ne sont plus comparées', F.conf, [["  if (cle1 !== cle2) {", '  if (false) {']], ['951']],
  ['C07', 'remplacer une clé ou un coffre ne demande plus « oui »', F.conf, [["    if (rep !== 'oui') echec('Pas de « oui » : abandon.');", '']], ['951']],
  ['C08', 'les AUTRES clés de la configuration ne sont pas conservées', F.conf,
    [["  const neuve = Object.assign({}, config, { sauvegarde: bloc });", '  const neuve = { instance: config.instance, sauvegarde: bloc };']], ['951']],
  ['C09', 'le rythme et la rétention déjà réglés sont perdus à chaque reconfiguration', F.conf,
    [["  const bloc = Object.assign({}, avant || {}, {", '  const bloc = Object.assign({}, {']], ['951']],
  ['C10', '`--verifier` ne compare que les LONGUEURS', F.conf, [["  if (saisie === posee) { console.log('✓ identique'); return; }", "  if (saisie.length === posee.length) { console.log('✓ identique'); return; }"]], ['951']],
  ['C11', 'le script IMPRIME la clé de sauvegarde saisie', F.conf, [["  const bloc = Object.assign({}, avant || {}, {", "  console.log('clé : ' + cle1);\n  const bloc = Object.assign({}, avant || {}, {"]], ['951']],
  ['C12', 'le script n\'exige plus 64 caractères hexadécimaux pour la clé', F.conf,
    [["  if (!SAUV.cleDepuis(cle1)) echec(", "  if (false) echec("]], ['951']],

  /* ── Le câblage du service (la couture qu'un banc de module ne voit pas) ── */
  ['W01', 'le service ne DÉMARRE jamais la sauvegarde', F.index, [["  sauvegarde.demarrer();   // inerte sans configuration : aucune minuterie, aucun réseau\n", '']], ['951']],
  ['W02', '/health ne publie plus le bloc `sauvegarde`', F.index, [["      sauvegarde: sauvegarde.sante(),   // des nombres et un booléen : jamais un nom de bucket, un chemin, un motif\n", '']], ['903', '951']],
  ['W03', 'le service ne compare plus la clé de sauvegarde à la clé maître au démarrage', F.index,
    [["const cfgSauvegarde = lireConfigSauvegarde(config.sauvegarde, { instance: config.instance, kek: config.kek });", "const cfgSauvegarde = lireConfigSauvegarde(config.sauvegarde, { instance: config.instance, kek: null });"]], ['951']],
  ['W04', 'la configuration du service IGNORE le bloc `sauvegarde`', F.cfg, [["    sauvegarde: cfg.sauvegarde === undefined ? null : cfg.sauvegarde,", '    sauvegarde: null,']], ['951']],
  ['W05', 'le service n\'attend plus la fin de la passe en cours quand il s\'arrête', F.index,
    [["    await sauvegarde.arreter();   // une passe en cours reconnaît l'arrêt (deux secondes au plus) ; ce n'est pas un échec\n", '']], ['951']],

  /* ── La surveillance ── */
  ['V01', 'la surveillance ne crie plus à 2 h sans copie', F.surv, [["const SEUIL_SAUVEGARDE_H = 2;", 'const SEUIL_SAUVEGARDE_H = 200;']], ['934']],
  ['V02', 'deux échecs de suite ne font plus crier', F.surv, [["const SEUIL_SAUVEGARDE_ECHECS = 2;", 'const SEUIL_SAUVEGARDE_ECHECS = 20;']], ['934', '951']],
  ['V03', 'aucun essai de restauration depuis 35 jours ne fait plus crier en production', F.surv, [["const SEUIL_ESSAI_JOURS = 35;", 'const SEUIL_ESSAI_JOURS = 3500;']], ['934']],
  ['V04', 'la BÊTA (jetable) crie aussi sur l\'essai de restauration', F.surv, [["if (j.instance === 'prod' && j.sauvegarde.configuree === true) {", 'if (j.sauvegarde.configuree === true) {']], ['934']],
  ['V05', 'une sauvegarde « configurée mais jamais réussie » ne crie plus', F.surv, [["if (j.sauvegarde.configuree === true && j.sauvegarde.ageH === null) p.push(", 'if (false) p.push(']], ['934']],
  ['V06', 'le champ `sauvegarde.echecs` n\'est plus déclaré surveillé', F.surv,
    [["  'sauvegarde.echecs',     // deux passes ratées de suite : le coffre refuse, la relecture échoue, le disque manque — on le sait AVANT que l'âge ne grimpe\n", '']], ['934', '951']],
];

const DOSSIERS_COPIE = ['server-msg', 'design/opmessages', '.github/scripts'];
function copier(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copier(s, d); else fs.copyFileSync(s, d);
  }
}
function fabriquerCopie() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-sauv-'));
  for (const d of DOSSIERS_COPIE) copier(path.join(RACINE, d), path.join(dir, d));
  fs.mkdirSync(path.join(dir, 'server'));
  fs.copyFileSync(path.join(RACINE, 'server', 's3.js'), path.join(dir, 'server', 's3.js'));   // `test-950` compare la copie de `lib/s3.js` à celui-là
  fs.mkdirSync(path.join(dir, 'tests'));
  for (const f of fs.readdirSync(path.join(RACINE, 'tests'))) if (/^(test-9\d\d|outils-msg|outils-tel|outils-pieces|outils-sauvegarde|bac-messages|lib-horloge-msg|mode-site)\.js$/.test(f)) fs.copyFileSync(path.join(RACINE, 'tests', f), path.join(dir, 'tests', f));
  fs.symlinkSync(path.join(RACINE, 'server-msg', 'node_modules'), path.join(dir, 'server-msg', 'node_modules'));
  return dir;
}
function lancer(dir, suite) {
  return new Promise((resolve) => {
    const f = fs.readdirSync(path.join(dir, 'tests')).find(x => x.startsWith('test-' + suite) && x.endsWith('.js'));
    const p = spawn(process.execPath, [path.join(dir, 'tests', f)], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let sortie = ''; p.stdout.on('data', d => { sortie += d; }); p.stderr.on('data', d => { sortie += d; });
    const minuteur = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà parti */ } }, DELAI_MS);
    p.on('close', (code) => { clearTimeout(minuteur); const ko = (sortie.match(/(\d+) ✗/g) || []).pop(); resolve({ code, ko: ko ? parseInt(ko, 10) : null, sortie, suite }); });
  });
}

/* Applique les paires à `original` : chacune doit se trouver UNE FOIS dans le texte tel qu'il est à ce moment-là. */
function muter(original, paires) {
  let texte = original;
  for (const [ancien, nouveau] of paires) {
    const n = texte.split(ancien).length - 1;
    if (n !== 1) return { erreur: n === 0 ? 'le motif ne se trouve pas : ' + JSON.stringify(ancien.slice(0, 70)) : 'le motif se trouve ' + n + ' fois : ' + JSON.stringify(ancien.slice(0, 70)) };
    texte = texte.replace(ancien, () => nouveau);
  }
  if (texte === original) return { erreur: 'le texte n\'a pas changé' };
  return { texte };
}

async function jouer(m, dir) {
  const [id, nom, fichier, paires, suites] = m;
  const cible = path.join(dir, fichier), original = fs.readFileSync(path.join(RACINE, fichier), 'utf8');
  const r0 = muter(original, paires);
  if (r0.erreur) return { id, nom, verdict: 'MAL VISÉE', detail: r0.erreur };
  fs.writeFileSync(cible, r0.texte);
  try {
    const verts = [];
    for (const s of suites) {
      const r = await lancer(dir, s);
      if (r.code !== 0 || (r.ko !== null && r.ko > 0)) {
        /* Les premiers contrôles qui tombent (pas seulement le premier) : un banc qui meurt, ou qui tombe sur une course sans rapport avec le
           défaut remis, ne prouve pas qu'il le GARDE — il faut pouvoir lire POURQUOI la mutation tombe. */
        const tombes = r.sortie.split('\n').filter(l => /^\s*✗/.test(l)).map(l => l.trim().replace(/\s+/g, ' ').slice(0, 110));
        const ligne = (tombes.length ? tombes.slice(0, 3).join(' || ') : (r.sortie.split('\n').filter(Boolean).slice(-1)[0] || '').trim().slice(0, 150));
        return { id, nom, verdict: 'TOMBE', detail: 'test-' + s + ' (' + (r.ko === null ? 'mort, code ' + r.code : r.ko + ' ✗') + ') — ' + ligne };
      }
      verts.push(s);
    }
    return { id, nom, verdict: 'SURVIT', detail: 'vert : ' + verts.join(', ') };
  } finally { fs.writeFileSync(cible, original); }
}

(async () => {
  const args = process.argv.slice(2);
  const viser = args.includes('--viser');
  const demande = args.filter(a => !a.startsWith('--'));
  const liste = demande.length ? MUTATIONS.filter(m => demande.includes(m[0])) : MUTATIONS;
  if (!liste.length) { console.log('aucune mutation à jouer'); process.exit(2); }
  const ids = MUTATIONS.map(m => m[0]);
  if (new Set(ids).size !== ids.length) { console.log('✗ identifiants de mutation en double'); process.exit(2); }

  if (viser) {
    /* Ne joue rien : un motif qui ne se trouve pas, ou deux fois, est une mutation qui ne mordrait pas — ou mordrait ailleurs. */
    let mal = 0;
    for (const m of liste) {
      const r = muter(fs.readFileSync(path.join(RACINE, m[2]), 'utf8'), m[3]);
      if (r.erreur) { mal++; console.log('  ✗ ' + m[0] + ' · ' + m[1] + ' → MAL VISÉE · ' + r.erreur); }
    }
    console.log('\n' + (liste.length - mal) + '/' + liste.length + ' mutations bien visées');
    process.exit(mal ? 1 : 0);
  }

  const copies = Array.from({ length: Math.min(NB_COPIES, liste.length) }, fabriquerCopie);
  const file = liste.slice(), resultats = [];
  await Promise.all(copies.map(async (dir) => {
    for (;;) {
      const m = file.shift(); if (!m) return;
      const r = await jouer(m, dir);
      resultats.push(r);
      console.log((r.verdict === 'TOMBE' ? '  ✓ ' : '  ✗ ') + r.id + ' · ' + r.nom + ' → ' + r.verdict + ' · ' + r.detail);
    }
  }));
  for (const d of copies) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } }
  const tombees = resultats.filter(r => r.verdict === 'TOMBE').length;
  console.log('\n' + tombees + '/' + resultats.length + ' mutations tombent' + (tombees === resultats.length ? '' : ' — LES AUTRES : ' + resultats.filter(r => r.verdict !== 'TOMBE').map(r => r.id + ' (' + r.verdict + ')').join(', ')));
  process.exit(tombees === resultats.length ? 0 : 1);
})();
