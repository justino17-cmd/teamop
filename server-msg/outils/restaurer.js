#!/usr/bin/env node
/* ══ RESTAURER UNE SAUVEGARDE D'OP MESSAGES — L'AUTRE MOITIÉ, SANS LAQUELLE LA PREMIÈRE NE VAUT RIEN ══════════════════════════
 *
 * Imité de `server/restaurer.js` (OP GESTION), JAMAIS importé. Une sauvegarde qu'on n'a jamais su rouvrir n'est pas une sauvegarde :
 * c'est une croyance. Ce script est écrit pour être lancé un jour de calme, pour de faux, afin de savoir qu'il marchera le jour où il
 * faudra — et chaque exercice RÉUSSI est daté (`sauvegarde-essai.json`), ce que `/health` publie (`sauvegarde.essaiJours`).
 *
 * Usage, SUR LE VPS, en root :
 *
 *   OPMSG_CONFIG=/etc/opmsg/beta.json OPMSG_DATA=/opt/opmsg/beta/data node outils/restaurer.js essai
 *   OPMSG_CONFIG=… node outils/restaurer.js liste
 *   OPMSG_CONFIG=… node outils/restaurer.js restaurer --vers <dossier> [--date AAAA-MM-JJ[THH[:MM]]] [--ecraser] [--sans-pieces]
 *
 *   essai      restaure la DERNIÈRE archive (ou celle d'une date) dans un dossier JETABLE : télécharge, déchiffre, rouvre la base,
 *              la contrôle (`quick_check`, comptage des lignes de chaque table), REJOUE le registre des purges, vérifie que la clé
 *              maître de ce serveur ouvre la base, relit un échantillon de pièces — puis efface son dossier. Réussi, il écrit la date.
 *   liste      ce que contient le coffre : les archives (date, taille) et le nombre de pièces. Rien d'autre.
 *   restaurer  la VRAIE restauration, dans `--vers`. ⛔ Elle n'écrase JAMAIS une base existante sans `--ecraser`, et même avec elle
 *              elle MET DE CÔTÉ l'ancienne (`msg.db.avant-restauration-…`) au lieu de l'effacer. Elle refuse tant que le service tourne.
 *
 * ⛔ RIEN DE CE QUE CE SCRIPT AFFICHE N'EST UN SECRET, et tout peut être recollé dans la conversation (règle du 24 septembre 2026) :
 * des nombres, des dates, le nom d'une archive (`base/2026-10-02T14-03-00-123Z.msgbak`) — jamais une clé, un nom de bucket, une
 * adresse de coffre, un chemin de configuration. Les clés se LISENT (fichier de configuration, variables d'environnement) et ne
 * sont jamais réécrites à l'écran, pas même dans un message d'erreur.
 *
 * ⛔ LA CLÉ. Elle est lue dans la configuration (`sauvegarde.cle`) ou dans `OPMSG_SAUV_CLE`. Sur un VPS mort, la configuration n'existe
 * plus : c'est le SEUL cas qui compte vraiment, et c'est pour ça que la clé de sauvegarde vit AUSSI dans le gestionnaire de mots de
 * passe de Justin. Le coffre se donne alors par `OPMSG_SAUV_COFFRE=endpoint,bucket,accessKey,secretKey[,région]` et l'instance par
 * `OPMSG_INSTANCE`. ⚠️ DEUX CLÉS sont nécessaires pour que la base restaurée serve à quelque chose : celle-ci, et la clé MAÎTRE
 * (`/etc/opmsg/<instance>.kek`), qui n'est pas dans l'archive : sans elle, le service refuse de démarrer sur la base restaurée.
 */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const SAUV = require('../sauvegarde');
const { ouvrir } = require('../stockage');
const { creerScelleur } = require('../scelle');
const s3mod = require('../lib/s3');

const mio = (o) => (o / 1048576).toFixed(1) + ' Mio';
const ageTexte = (ts) => { const h = (Date.now() - ts) / 3600000; return h < 48 ? 'il y a ' + h.toFixed(1) + ' h' : 'il y a ' + Math.round(h / 24) + ' j'; };
const echec = (message, code = 1) => Object.assign(new Error(message), { sortie: code });

/* ══ LE CONTEXTE : la configuration, le coffre, la clé ═════════════════════════════════════════════════════════════════════════ */
function charger(env) {
  const parDefaut = !!(env.OPMSG_SAUV_COFFRE && env.OPMSG_SAUV_CLE);
  let json = {};
  if (env.OPMSG_CONFIG) {
    try { json = JSON.parse(fs.readFileSync(env.OPMSG_CONFIG, 'utf8')) || {}; }
    catch (e) { if (!parDefaut) throw echec('OPMSG_CONFIG est illisible. Sur un serveur perdu, donne OPMSG_SAUV_CLE, OPMSG_SAUV_COFFRE et OPMSG_INSTANCE.'); }
  } else if (!parDefaut) {
    throw echec('OPMSG_CONFIG n\'est pas posé (le fichier de configuration de l\'instance, par exemple /etc/opmsg/beta.json).');
  }
  const instance = env.OPMSG_INSTANCE || (json && json.instance);
  const bloc = json && json.sauvegarde && typeof json.sauvegarde === 'object' ? Object.assign({}, json.sauvegarde) : null;
  if (!bloc && !parDefaut) throw echec('la sauvegarde n\'est pas configurée sur cette instance (aucun bloc « sauvegarde » dans la configuration).');
  const b = bloc || {};
  if (env.OPMSG_SAUV_CLE) b.cle = env.OPMSG_SAUV_CLE;
  if (env.OPMSG_SAUV_COFFRE) {
    const [endpoint, bucket, accessKey, secretKey, region] = String(env.OPMSG_SAUV_COFFRE).split(',');
    Object.assign(b, { endpoint, bucket, accessKey, secretKey }, region ? { region } : {});
  }
  delete b.intervalleMs;   // le rythme n'est pas l'affaire de ce script, et la valeur des bancs n'est admise que pour la bêta
  let cfg;
  try { cfg = SAUV.lireConfigSauvegarde(b, { instance, kek: null }); }
  catch (e) { throw echec(String(e.message).replace(/^config: /, '')); }
  const client = s3mod.client(cfg.coffre);
  if (!client) throw echec('le coffre est incomplet (adresse, nom, clé d\'accès et clé secrète sont tous nécessaires).');
  return {
    cfg, client, instance, dataDir: env.OPMSG_DATA || null,
    kekChemin: env.OPMSG_KEK_FILE || path.join('/etc/opmsg', instance + '.kek'),
    systemctl: env.OPMSG_SYSTEMCTL || 'systemctl',   // les bancs y mettent un faux : l'outil ne doit pas dépendre de la machine
    tmpParent: env.OPMSG_ESSAI_DIR || os.tmpdir(),
  };
}

/* ══ CHOISIR L'ARCHIVE ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
/* « La plus récente » ou « la plus récente à cette date-là ou avant ». Une date s'écrit AAAA-MM-JJ, avec une heure (THH) ou des minutes
   (THH:MM) : la précision qu'on donne est la précision qu'on veut — « 2026-10-02 » est la FIN de cette journée. */
function borneDeDate(date) {
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2})(?:[:-](\d{2})(?:[:-](\d{2}))?)?)?Z?$/.exec(String(date).trim());
  if (!m) return null;
  const borne = m[1] + 'T' + (m[2] || '23') + '-' + (m[3] || '59') + '-' + (m[4] || '59') + '-999Z';
  return SAUV.dateDeNom(borne) === null ? null : borne;
}
function choisir(archives, date) {
  if (!date) return archives[0] || null;
  const borne = borneDeDate(date);
  if (!borne) throw echec('la date doit s\'écrire AAAA-MM-JJ, AAAA-MM-JJTHH ou AAAA-MM-JJTHH:MM.', 2);
  return archives.find(a => a.nom <= borne) || null;
}

/* ══ TÉLÉCHARGER ET OUVRIR ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
/* Télécharge `cle` et la rouvre dans `vers` (la base). Rend { octets (de l'archive), meta, base (octets déchiffrés) }. Les erreurs sont
   des messages lisibles SANS secret ; une archive qui ne s'ouvre pas dit pourquoi (clé fausse ou archive abîmée, autre instance…). */
async function recuperer(ctx, archive, vers) {
  const brut = vers + '.archive';
  const r = await ctx.client.lireCleVers(archive.cle, brut);
  if (!r.ok) throw echec('téléchargement impossible : ' + (r.absente ? 'objet absent' : 'HTTP ' + r.statut));
  if (Number.isFinite(archive.octets) && r.octets !== archive.octets) { fs.rmSync(brut, { force: true }); throw echec('l\'archive téléchargée n\'a pas la taille annoncée par le coffre (' + r.octets + ' au lieu de ' + archive.octets + ' octets).'); }
  try {
    const o = await SAUV.ouvrirArchive(brut, ctx.cfg.cle, vers, { instance: ctx.instance, date: SAUV.isoDeNom(archive.nom) });
    return { octets: r.octets, meta: o.meta, base: o.octets };
  } catch (e) {
    const dit = {
      'dechiffrement-impossible': 'déchiffrement impossible — la clé de sauvegarde est fausse, ou l\'archive est abîmée ou modifiée',
      'instance-differente': 'cette archive est celle d\'une AUTRE instance (beta ou prod)',
      'date-differente': 'la date écrite dans l\'archive n\'est pas celle de son nom — archive rebaptisée ?',
      'entete-absent': 'ce fichier n\'est pas une archive d\'OP MESSAGES', 'entete-illisible': 'l\'en-tête de l\'archive est illisible',
      'version-inconnue': 'format d\'archive inconnu', 'trop-courte': 'archive trop courte pour être valable',
    }[e && e.code] || 'archive illisible';
    throw echec(dit);
  } finally { fs.rmSync(brut, { force: true }); }
}

/* ══ LA CLÉ MAÎTRE : ouvre-t-elle CETTE base ? ═══════════════════════════════════════════════════════════════════════════════
   Ce n'est pas le contrôle d'une sauvegarde, c'est celui d'une RESTAURATION : l'archive la plus intacte du monde ne sert à rien si la clé
   maître que le serveur porte n'ouvre pas ce qu'elle contient (clé régénérée par erreur, volume restauré sans sa clé…). On le
   constate sur une COPIE (l'ouverture migre le schéma), avec le témoin de clé que le service pose à la création. Fichier de clé absent :
   on le DIT et l'exercice passe — il ne prouve alors que l'intégrité, et c'est écrit. */
function verifierCleMaitre(base, kekChemin) {
  let hex;
  try { hex = fs.readFileSync(kekChemin, 'utf8').trim(); } catch (e) { return { verifiee: false, motif: 'fichier de clé absent' }; }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return { verifiee: false, motif: 'fichier de clé illisible' };
  const copie = base + '.cle-maitre';
  fs.copyFileSync(base, copie);
  let S = null;
  try {
    S = ouvrir({ chemin: copie, scelleur: creerScelleur(Buffer.from(hex, 'hex')), horloge: Date.now });
    return { verifiee: true, ok: true };
  } catch (e) {
    return { verifiee: true, ok: false, motif: e && e.code === 'cle_incorrecte' ? 'la clé maître de ce serveur n\'ouvre PAS cette base' : 'la base ne s\'ouvre pas avec la clé maître' };
  } finally {
    try { if (S) S.fermer(); } catch (e) { /* déjà fermée */ }
    for (const s of ['', '-wal', '-shm']) fs.rmSync(copie + s, { force: true });
    for (const f of fs.readdirSync(path.dirname(copie))) if (f.startsWith(path.basename(copie) + '.avant-v')) fs.rmSync(path.join(path.dirname(copie), f), { force: true });
  }
}

/* ══ LES PIÈCES ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
async function listerPieces(ctx) {
  const pre = ctx.cfg.prefixe + SAUV.DOSSIER_PIECES;
  const r = await ctx.client.lister(pre);
  if (!r.ok) return { ok: false, statut: r.statut };
  const pieces = [];
  for (const o of r.objets || []) if (typeof o.cle === 'string' && o.cle.startsWith(pre)) pieces.push({ cle: o.cle, rel: o.cle.slice(pre.length), octets: o.octets });
  return { ok: true, pieces };
}
/* Un échantillon réparti sur toute la liste : des pièces anciennes et récentes, pas les vingt premières. */
function echantillonner(liste, n) {
  if (liste.length <= n) return liste.slice();
  const pris = [];
  for (let i = 0; i < n; i++) pris.push(liste[Math.floor(i * liste.length / n)]);
  return pris;
}
/* Relit des pièces du coffre : présentes, de la taille annoncée, non vides. ⚠️ Elle ne prouve PAS qu'elles s'ouvrent (elles sont scellées
   par la clé maître, d'une façon que ce script ne connaît pas) : elle prouve qu'elles sont revenues intactes d'octets. */
async function releverPieces(ctx, pieces, dossier) {
  const tmp = path.join(dossier, 'piece.relue');
  let relues = 0, manquantes = 0;
  for (const p of pieces) {
    const r = await ctx.client.lireCleVers(p.cle, tmp);
    if (r.ok && r.octets === p.octets && r.octets > 0) relues++; else manquantes++;
  }
  fs.rmSync(tmp, { force: true });
  return { relues, manquantes };
}
/* Remet TOUTES les pièces dans `racine`, sans jamais en écraser une de même taille ni sortir du dossier (un nom qui contiendrait « .. »
   ou une barre arrière est refusé : le coffre est une entrée de confiance limitée). */
async function restaurerPieces(ctx, pieces, racine) {
  let remises = 0, dejaLa = 0, refusees = 0;
  for (const p of pieces) {
    const segs = p.rel.split('/');
    if (!segs.length || segs.some(s => !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s))) { refusees++; continue; }
    const dest = path.join(racine, ...segs);
    try { if (fs.statSync(dest).size === p.octets) { dejaLa++; continue; } } catch (e) { /* absente */ }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const r = await ctx.client.lireCleVers(p.cle, dest + '.partiel');
    if (!r.ok || r.octets !== p.octets) { fs.rmSync(dest + '.partiel', { force: true }); throw echec('une pièce n\'est pas revenue intacte du coffre (HTTP ' + (r.statut || 'absente') + ').'); }
    fs.renameSync(dest + '.partiel', dest);
    remises++;
  }
  return { remises, dejaLa, refusees };
}
/* Retire de la copie les fichiers des pièces que le registre des purges a emportées. */
function retirerFichiersPieces(racine, ids) {
  let n = 0;
  if (!ids.length) return 0;
  const aRetirer = new Set(ids);
  const descendre = (d) => {
    let entrees = []; try { entrees = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entrees) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) descendre(p); else if (aRetirer.has(e.name)) { fs.rmSync(p, { force: true }); n++; }
    }
  };
  descendre(racine);
  return n;
}

/* ══ LA DATE DU DERNIER EXERCICE RÉUSSI — ce que `/health` publie ════════════════════════════════════════════════════════════ */
/* Écrite à côté de l'état du service, en fichier temporaire puis renommage. Le service tourne sous un autre utilisateur que ce script
   (root) : le fichier prend le propriétaire du dossier de données, sinon le service ne pourrait pas le lire. Il ne contient aucun
   secret — une date, le nom d'une archive, des nombres. Un exercice RATÉ n'efface pas la date du dernier réussi : il note le sien. */
function ecrireEssai(dataDir, patch) {
  const chemin = path.join(dataDir, SAUV.NOM_ESSAI);
  let actuel = {};
  try { actuel = JSON.parse(fs.readFileSync(chemin, 'utf8')) || {}; } catch (e) { actuel = {}; }
  const tmp = chemin + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(Object.assign({}, actuel, patch, { v: 1 })), { mode: 0o640 });
  try { const st = fs.statSync(dataDir); fs.chownSync(tmp, st.uid, st.gid); } catch (e) { /* hors root, le propriétaire est déjà le bon */ }
  fs.renameSync(tmp, chemin);
}

/* ══ LES COMMANDES ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
async function liste(ctx, dire) {
  const arch = await SAUV.listerArchives(ctx.client, ctx.cfg.prefixe);
  if (!arch.ok) throw echec('liste impossible : HTTP ' + arch.statut);
  const pieces = await listerPieces(ctx);
  if (!arch.archives.length) dire('Le coffre est VIDE — aucune sauvegarde de base n\'a jamais été déposée.');
  else {
    dire(arch.archives.length + ' archive(s) de base — la plus récente en tête :');
    arch.archives.forEach((a, i) => dire('  ' + (i === 0 ? '→' : ' ') + ' base/' + a.nom + SAUV.SUFFIXE + '   ' + mio(a.octets) + '   ' + ageTexte(a.ts)));
  }
  dire('pièces au coffre : ' + (pieces.ok ? pieces.pieces.length + ' (' + mio(pieces.pieces.reduce((a, p) => a + p.octets, 0)) + ')' : 'liste impossible (HTTP ' + pieces.statut + ')'));
  return arch.archives;
}

async function essai(ctx, { date, echantillon = 20 }, dire) {
  const arch = await SAUV.listerArchives(ctx.client, ctx.cfg.prefixe);
  if (!arch.ok) throw echec('liste impossible : HTTP ' + arch.statut);
  if (!arch.archives.length) throw echec('le coffre est VIDE — aucune sauvegarde n\'a jamais été déposée. Il faut attendre la première (ou chercher pourquoi elle ne part pas).');
  const cible = choisir(arch.archives, date);
  if (!cible) throw echec('aucune archive à cette date ou avant.');
  const recente = arch.archives[0], laDerniere = cible.cle === recente.cle;
  dire('→ essai de restauration sur base/' + cible.nom + SAUV.SUFFIXE + ' (' + mio(cible.octets) + ', ' + ageTexte(cible.ts) + ')' + (laDerniere ? '' : ' — PAS la plus récente'));

  const dossier = fs.mkdtempSync(path.join(ctx.tmpParent, 'opmsg-essai-'));
  try {
    const base = path.join(dossier, 'msg.db');
    const r = await recuperer(ctx, cible, base);
    dire('  téléchargée (' + mio(r.octets) + '), déchiffrée et décompressée (' + mio(r.base) + ', schéma ' + r.meta.schema + ').');

    const v = ouvrir.copie.controlerFichier(base);
    if (!v.ok) throw echec('la base restaurée est ILLISIBLE : ' + v.motif);
    if (!v.temoin) throw echec('la base restaurée n\'a pas de témoin de clé : ce n\'est pas une base d\'OP MESSAGES.');
    dire('  base saine (quick_check : ok) — ' + v.total + ' ligne(s) : ' + Object.entries(v.lignes).filter(([, n]) => n).map(([t, n]) => t + ' ' + n).join(', ') + '.');

    /* Le registre des purges de l'archive la PLUS RÉCENTE (il sait tout ce que les plus anciennes ignorent), appliqué à la copie. */
    let registre;
    if (laDerniere) registre = ouvrir.copie.purgeLire(base);
    else {
      const autre = path.join(dossier, 'recente.db');
      await recuperer(ctx, recente, autre);
      registre = ouvrir.copie.purgeLire(autre);
      fs.rmSync(autre, { force: true });
    }
    const p = ouvrir.copie.rejouerPurge(base, registre);
    dire('  purge rejouée : ' + p.lues + ' ligne(s) lue(s), ' + p.messagesRetires + ' message(s) retiré(s), ' + p.messagesBlanchis + ' effacé(s) pour tous, ' + p.pieces.length + ' pièce(s), ' + p.ignorees + ' ignorée(s).');

    const cm = verifierCleMaitre(base, ctx.kekChemin);
    if (!cm.verifiee) dire('  ⚠ clé maître NON vérifiée (' + cm.motif + ') : cet exercice prouve l\'intégrité de la sauvegarde, pas qu\'elle s\'ouvre avec la clé de ce serveur.');
    else if (!cm.ok) throw echec(cm.motif + '. Sans la bonne clé maître, rien ne sera lisible — retrouver celle du gestionnaire de mots de passe AVANT de croire cette sauvegarde.');
    else dire('  clé maître : la base restaurée s\'ouvre avec la clé de ce serveur.');

    const pieces = await listerPieces(ctx);
    let sondage = null;
    if (!pieces.ok) throw echec('liste des pièces impossible : HTTP ' + pieces.statut);
    if (!pieces.pieces.length) dire('  pièces : aucune au coffre (normal tant que les pièces ne sont pas en service).');
    else {
      sondage = await releverPieces(ctx, echantillonner(pieces.pieces, echantillon), dossier);
      dire('  pièces : ' + pieces.pieces.length + ' au coffre, ' + sondage.relues + ' relue(s) sur ' + (sondage.relues + sondage.manquantes) + ' en échantillon' + (sondage.manquantes ? ', ' + sondage.manquantes + ' MANQUANTE(S) ou abîmée(s)' : '') + '.');
      if (sondage.manquantes) throw echec('des pièces du coffre ne sont pas revenues intactes.');
    }

    if (laDerniere) {
      if (ctx.dataDir) {
        ecrireEssai(ctx.dataDir, { okTs: Date.now(), archive: 'base/' + cible.nom + SAUV.SUFFIXE, schema: r.meta.schema, lignes: v.total, cleMaitreVerifiee: !!cm.verifiee, pieces: pieces.pieces.length });
        dire('\n✅ CETTE SAUVEGARDE EST RESTAURABLE. Exercice enregistré : /health dira « essaiJours: 0 ».');
      } else dire('\n✅ CETTE SAUVEGARDE EST RESTAURABLE. (OPMSG_DATA n\'est pas posé : la date de l\'exercice n\'est PAS enregistrée.)');
    } else dire('\n✅ CETTE ARCHIVE EST RESTAURABLE. (Ce n\'était pas la plus récente : la date de l\'exercice publiée par /health n\'est pas modifiée.)');
    return { ok: true, archive: cible.nom, laDerniere, lignes: v.total, purge: p, cleMaitre: cm, pieces: sondage };
  } catch (e) {
    if (ctx.dataDir && laDerniere) { try { ecrireEssai(ctx.dataDir, { echecTs: Date.now(), echecMotif: String(e.message).slice(0, 120) }); } catch (x) { /* l'échec de l'exercice reste le sujet */ } }
    throw e;
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}

async function restaurerVers(ctx, { vers, date, ecraser, sansPieces }, dire) {
  if (!vers) throw echec('usage : restaurer --vers <dossier> [--date …] [--ecraser] [--sans-pieces]', 2);
  const dest = path.resolve(vers);
  const arch = await SAUV.listerArchives(ctx.client, ctx.cfg.prefixe);
  if (!arch.ok) throw echec('liste impossible : HTTP ' + arch.statut);
  if (!arch.archives.length) throw echec('le coffre est VIDE.');
  const cible = choisir(arch.archives, date);
  if (!cible) throw echec('aucune archive à cette date ou avant.');

  /* ⛔ ON N'ÉCRASE JAMAIS UNE BASE QUI VIT. Écraser les données d'un serveur qui tourne est une opération qu'on fait à la main, en
     conscience, service ARRÊTÉ — pas une option qu'on lance à 4 h du matin en panique. */
  const existantes = ['msg.db', 'msg.db-wal', 'msg.db-shm'].filter(f => fs.existsSync(path.join(dest, f)));
  if (existantes.length && !ecraser) throw echec('une base existe déjà dans ce dossier. Rien n\'a été touché. Pour la remplacer (elle sera MISE DE CÔTÉ, jamais effacée) : ajouter --ecraser, service arrêté.');
  if (existantes.length) {
    const actif = spawnSync(ctx.systemctl, ['is-active', '--quiet', 'teamop-msg@' + ctx.instance]);
    if (actif.status === 0) throw echec('le service tourne encore : l\'arrêter d\'abord (systemctl stop teamop-msg@' + ctx.instance + '). Rien n\'a été touché.');
  }
  fs.mkdirSync(dest, { recursive: true });
  const chantier = fs.mkdtempSync(path.join(dest, '.restauration-'));
  try {
    dire('→ restauration de base/' + cible.nom + SAUV.SUFFIXE + ' (' + mio(cible.octets) + ', ' + ageTexte(cible.ts) + ')');
    const base = path.join(chantier, 'msg.db');
    const r = await recuperer(ctx, cible, base);
    dire('  téléchargée et déchiffrée (' + mio(r.base) + ', schéma ' + r.meta.schema + ').');
    const recente = arch.archives[0];
    let registre;
    if (cible.cle === recente.cle) registre = ouvrir.copie.purgeLire(base);
    else {
      const autre = path.join(chantier, 'recente.db');
      await recuperer(ctx, recente, autre);
      registre = ouvrir.copie.purgeLire(autre);
      fs.rmSync(autre, { force: true });
    }
    const p = ouvrir.copie.rejouerPurge(base, registre);
    dire('  purge rejouée : ' + p.messagesRetires + ' message(s) retiré(s), ' + p.messagesBlanchis + ' effacé(s) pour tous, ' + p.pieces.length + ' pièce(s).');
    const v = ouvrir.copie.controlerFichier(base);
    if (!v.ok) throw echec('la base restaurée est ILLISIBLE : ' + v.motif + ' — rien n\'est remis en place.');
    dire('  base saine (quick_check : ok), ' + v.total + ' ligne(s).');

    let pieces = null;
    if (!sansPieces) {
      const lp = await listerPieces(ctx);
      if (!lp.ok) throw echec('liste des pièces impossible : HTTP ' + lp.statut);
      pieces = await restaurerPieces(ctx, lp.pieces, path.join(dest, 'pieces'));
      const retirees = retirerFichiersPieces(path.join(dest, 'pieces'), p.pieces);
      dire('  pièces : ' + pieces.remises + ' remise(s), ' + pieces.dejaLa + ' déjà là, ' + retirees + ' retirée(s) par la purge' + (pieces.refusees ? ', ' + pieces.refusees + ' REFUSÉE(S) (nom suspect)' : '') + '.');
    } else dire('  pièces : non restaurées (--sans-pieces).');

    /* La mise en place : l'ancienne base est mise de côté, la nouvelle prend sa place (même système de fichiers : un renommage). */
    const marque = '.avant-restauration-' + new Date().toISOString().replace(/[:.]/g, '-');
    for (const f of existantes) fs.renameSync(path.join(dest, f), path.join(dest, f + marque));
    fs.renameSync(base, path.join(dest, 'msg.db'));
    fs.chmodSync(path.join(dest, 'msg.db'), 0o600);
    try { const st = fs.statSync(dest); fs.chownSync(path.join(dest, 'msg.db'), st.uid, st.gid); } catch (e) { /* hors root */ }
    dire('\n✅ BASE RESTAURÉE dans ' + dest + (existantes.length ? ' (l\'ancienne est à côté : *' + marque + ')' : '') + '.');
    dire('   Avant de redémarrer le service :');
    dire('   · la clé MAÎTRE doit être celle d\'origine (/etc/opmsg/' + ctx.instance + '.kek) : sans elle le service refuse de démarrer sur cette base ;');
    if (pieces) dire('   · si les fichiers appartiennent à root : chown -R opmsg:opmsg sur le dossier des données ;');
    dire('   · puis : systemctl start teamop-msg@' + ctx.instance + ' et vérifier /health.');
    return { ok: true, archive: cible.nom, lignes: v.total, purge: p, pieces };
  } finally { fs.rmSync(chantier, { recursive: true, force: true }); }
}

/* ══ LA LIGNE DE COMMANDE ════════════════════════════════════════════════════════════════════════════════════════════════════ */
function lireOptions(args) {
  const o = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--ecraser') o.ecraser = true;
    else if (a === '--sans-pieces') o.sansPieces = true;
    else if (a === '--vers' || a === '--date' || a === '--echantillon') { o[a.slice(2)] = args[++i]; if (o[a.slice(2)] === undefined) throw echec(a + ' attend une valeur.', 2); }
    else if (a.startsWith('--')) throw echec('option inconnue : ' + a.replace(/[^A-Za-z-]/g, ''), 2);
    else o._.push(a);
  }
  return o;
}

async function main(argv, env, dire = (l) => console.log(l)) {
  const o = lireOptions(argv);
  const commande = o._[0];
  if (!['liste', 'essai', 'restaurer'].includes(commande)) throw echec('commandes : liste · essai · restaurer --vers <dossier> [--date …] [--ecraser] [--sans-pieces]', 2);
  const ctx = charger(env || process.env);
  if (commande === 'liste') { await liste(ctx, dire); return 0; }
  if (commande === 'essai') { await essai(ctx, { date: o.date, echantillon: o.echantillon ? Math.max(1, parseInt(o.echantillon, 10) || 20) : 20 }, dire); return 0; }
  await restaurerVers(ctx, { vers: o.vers, date: o.date, ecraser: o.ecraser, sansPieces: o.sansPieces }, dire);
  return 0;
}

if (require.main === module) {
  main(process.argv.slice(2), process.env).then((code) => process.exit(code), (e) => {
    console.error('\n⛔ ' + (e && e.sortie ? e.message : 'échec inattendu (' + (e && (e.code || e.name) || 'erreur') + ')'));
    process.exit(e && e.sortie ? e.sortie : 1);
  });
}
module.exports = { main, charger, choisir, borneDeDate, essai, restaurerVers, liste, verifierCleMaitre, ecrireEssai, echantillonner, retirerFichiersPieces };
