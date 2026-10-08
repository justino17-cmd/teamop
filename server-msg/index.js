#!/usr/bin/env node
/* ══ OP MESSAGES — LE SERVICE (étape 1 : socle, porte bêta, messagerie texte en direct) ═══════
 *
 * Un service À PART, sur le même VPS qu'OP GESTION mais sans rien partager avec lui à
 * l'exécution : son dossier, sa base, sa clé, son utilisateur, son domaine (SERVEUR.md § 3.1).
 * Décision de Justin, 1er octobre 2026 : « OP MESSAGES je veux pas qu'il soit sur Firebase ».
 *
 * ⛔ `server-msg/` N'IMPORTE JAMAIS `server/` — ni son code, ni ses chemins. Le seul pont est la
 * porte bêta, qui APPELLE OP GESTION par HTTP en boucle locale (voir `porte-beta.js`).
 *
 * Démarrage : `OPMSG_CONFIG=… OPMSG_DATA=… OPMSG_INSTANCE=beta|prod [PORT=8091] node index.js`,
 * la clé maître arrive par le credential systemd `kek`. Le service n'écoute QUE sur 127.0.0.1 :
 * c'est le proxy qui parle à Internet.
 *
 * ⛔ AUCUNE EXCEPTION NE LAISSE LE PROCESSUS MOURIR EN SILENCE : un rejet ou une exception non
 * rattrapés sont journalisés par leur NOM seulement (jamais leur message : il peut citer une
 * donnée) puis le processus sort, et `Restart=always` le relance. Un service qui reste
 * à moitié vivant après une erreur est pire qu'un redémarrage.
 * ⛔ LES JOURNAUX N'ONT JAMAIS : d'adresse IP, de nom, de texte de message, de jeton, de mot de
 * passe. `journaliser` n'accepte que des champs nommés d'une liste blanche, de valeurs courtes.
 */
const fs = require('fs'), path = require('path');
const { monitorEventLoopDelay } = require('perf_hooks');
const { charger } = require('./config');
const { creerScelleur } = require('./scelle');
const stockageMod = require('./stockage');
const { creerQuotas } = require('./quotas');
const { creerFlux } = require('./flux');
const { creerPorteBeta } = require('./porte-beta');
const { creerVersionClient } = require('./version-client');
const { construireApp } = require('./app');
const { lireConfigSms, creerGarde } = require('./sms-garde');
const { APPAREIL_ABS_MS } = require('./telephone');
const { creerPieces, creerReservations } = require('./pieces');
const { creerSauvegarde, lireConfigSauvegarde } = require('./sauvegarde');
const { rejouerAuDemarrage } = require('./rejeu');
const { creerPush } = require('./push');
const { creerFormule } = require('./formule');
const { creerFacturation } = require('./facturation');
const { creerPlanificateur } = require('./planificateur');
const { creerCourriel } = require('./courriel');
const { creerAgenda } = require('./routes-agenda');
const { creerAppels } = require('./appels');

const VERSION = '1.9.0-mise-a-jour';
const CHAMPS_JOURNAL = new Set(['quota', 'nom', 'code', 'instance', 'port', 'sha', 'etat', 'n', 'motif', 'route', 'pays', 'gabarit']);   // `gabarit` : le NOM d'un gabarit fixe de courriel de compte (inscription, existe, reinit, change), jamais une adresse   // `pays` : un code pays (« BE »), jamais un numéro — pour dire quel pays passe en bouclier

function journaliser(evt, champs) {
  const o = { t: new Date().toISOString(), evt: String(evt).slice(0, 40) };
  for (const [k, v] of Object.entries(champs || {})) {
    if (!CHAMPS_JOURNAL.has(k)) continue;
    o[k] = typeof v === 'number' || typeof v === 'boolean' ? v : String(v).replace(/[\r\n]/g, ' ').slice(0, 60);
  }
  process.stdout.write(JSON.stringify(o) + '\n');
}

function demarrer(env = process.env) {
  const config = charger(env);   // ⛔ la garde de séparation passe là, avant tout dossier créé
  /* La sauvegarde hors site : un bloc invalide REFUSE le démarrage (une clé égale à la clé maître, un coffre en http, une rétention de 0) — avant
     tout dossier créé, comme la configuration des SMS. Sans bloc : `null`, le module est inerte (rien ne part, rien n'est écrit). */
  const cfgSauvegarde = lireConfigSauvegarde(config.sauvegarde, { instance: config.instance, kek: config.kek });
  fs.mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
  const scelleur = creerScelleur(config.kek);
  const stockage = stockageMod.ouvrir({ chemin: path.join(config.dataDir, 'msg.db'), scelleur, horloge: Date.now });
  const quotas = creerQuotas(Date.now);
  const hub = creerFlux({ stockage, config, horloge: Date.now });
  /* ⛔ LES NOTIFICATIONS PUSH : la paire VAPID de l'instance (fabriquée ou adoptée ici, la privée scellée), la liste blanche des services push, la file d'envoi. Une paire illisible désactive
     le push SANS arrêter le service (`/health` dit `push.actif:false`, la surveillance crie). */
  const push = creerPush({ stockage, hub, config, horloge: Date.now, journaliser });
  /* ⛔ LES PIÈCES : des fichiers scellés par blocs sous `<données>/pieces/<2 caractères>/<id>`, une clé par pièce (dérivée de la clé maître). `piecesEtat` compte ce que /health
     publie : les pièces dont le fichier n'a pas pu être relu (bloc qui ne s'authentifie plus, fichier absent) — la panne silencieuse type, rendue visible. Un fichier à effacer
     (message supprimé pour tous, éphémère échu, photo remplacée, conversation disparue) l'est sans attendre et sans jamais faire échouer le geste : s'il résiste, il reste sans
     ligne, et le balayeur l'efface au passage suivant. */
  const pieces = creerPieces({ dossier: path.join(config.dataDir, 'pieces'), cle: (g, id) => scelleur.deriver(g, 'piece', 'bloc', id), generation: scelleur.generation, bloc: config.pieces.bloc, memoireImages: config.pieces.memoireImages });
  const reservations = creerReservations({ max: config.pieces.quotaPersonne, utilise: (u) => stockage.pieceUtilise(u) });
  const piecesEtat = { illisibles: 0, effacementsRates: 0 };
  const effacerPieces = (ids) => { for (const id of ids || []) pieces.effacer(id).catch(() => { piecesEtat.effacementsRates++; }); };
  /* ⛔ UNE BASE RESTAURÉE REJOUE CE QUI EST À ELLE avant de servir : l'outil de restauration a recopié dans le registre `purge` les effacements qu'il ne sait pas rejouer
     hors ligne et levé un drapeau ; ici le service les rejoue avec ses propres fonctions (un compte effacé ne revient pas). Sans drapeau — tout démarrage ordinaire — rien ne
     s'exécute. Voir `rejeu.js`. */
  rejouerAuDemarrage({ stockage, contexte: { effacerPieces, horloge: Date.now }, journaliser });
  /* ⛔ LES RÉUNIONS D'UN COMPTE EFFACÉ PAR UN CODE D'AVANT : un retour en arrière a pu effacer un compte sans connaître les réunions (une invitation orpheline, une réunion sans hôte). On les répare ICI,
     avant de servir — rejouable, et SANS rien écrire quand il n'y a rien à réparer. Une panne de la réparation ne ferme pas le service : elle se dit (le nom de l'erreur, jamais son message). */
  try {
    const reparees = stockage.reunionsReparer();
    if (reparees.personnes) { effacerPieces(reparees.pieces); journaliser('reunions_reparees', { n: reparees.personnes }); }
  } catch (e) { journaliser('reunions_reparation_echec', { nom: e && (e.code || e.name) }); }
  /* ⛔ LES APPELS D'UN COMPTE EFFACÉ PAR UN CODE D'AVANT : le code d'avant les appels ouvre une base au schéma 8 et efface un compte sans toucher à son historique d'appels. On le refait ICI, avant de servir —
     rejouable, et SANS rien écrire quand il n'y a rien à réparer. */
  let appelsReveil = [];
  try {
    const rep = stockage.appelsReparer();
    if (rep.personnes) { appelsReveil = rep.reveil; journaliser('appels_repares', { n: rep.personnes }); }
  } catch (e) { journaliser('appels_reparation_echec', { nom: e && (e.code || e.name) }); }
  /* ⛔ LA FORMULE ET LA FACTURATION : `formuleDe` est la seule fonction qui décide de Perso, Pro ou impayé (le drapeau de la bêta y est lu, et là seulement) ; la facturation parle à Stripe
     (inerte sans clé, et le dit). Les deux se lisent dans `ctx`, jamais ne se reconstruisent ailleurs. */
  const formule = creerFormule({ stockage, config });
  const facturation = creerFacturation({ stockage, config, formule, journaliser, horloge: Date.now });
  /* ⛔ LES RAPPELS DES RÉUNIONS : UNE instance planifie (le bail), un rappel part UNE seule fois (le registre), l'horloge est injectée. Voir `planificateur.js`. */
  /* L'AGENDA PERSONNEL (`routes-agenda.js`) : ses routes, et ses rappels — envoyés par le planificateur des réunions, qui tient le bail (une seule instance envoie) */
  const agenda = creerAgenda({ stockage, quotas, config, horloge: Date.now, journaliser });
  const planificateur = creerPlanificateur({ stockage, hub, config, horloge: Date.now, journaliser, push, agenda });
  /* ⛔ LE COURRIEL D'INVITATION : inerte sans relais SMTP (`config.courriel`), et le DIT. Le mot de passe du relais reste dans `config` ; `/api/config` ne publie que `courriel.ouvert`. */
  const courriel = creerCourriel({ config, stockage, scelleur, horloge: Date.now, journaliser });
  /* ⛔ LES APPELS À DEUX : le relais (identifiants éphémères, jamais de STUN d'un tiers), les signaux relayés à la seule session liée, le balayeur (sonneries échues, appareils perdus), les pushs. L'horloge est injectée. Voir `appels.js`. */
  const appels = creerAppels({ stockage, hub, push, config, formule, horloge: Date.now, journaliser });
  const porte = config.instance === 'beta' ? creerPorteBeta({ config, quotas, stockage, horloge: Date.now, fermerSessions: hs => { for (const h of hs) hub.fermerSession(h); } }) : null;
  /* Les SMS : la configuration est VALIDÉE ici (un budget négatif, des identifiants à moitié posés, une URL d'OVH étrangère en production
     refusent le démarrage plutôt que de tourner de travers), puis la garde (budgets, emballement, bouclier) et l'envoi par OVH. */
  const sms = creerGarde({ cfg: lireConfigSms(config.sms, config.instance), instance: config.instance, stockage, scelleur, horloge: Date.now, journaliser });
  /* Les instantanés passent par `stockage.instantane` (une connexion lectrice à part) ; le contrôle des copies, lui, se fait dans un processus enfant. */
  const sauvegarde = creerSauvegarde({ cfg: cfgSauvegarde, instance: config.instance, dataDir: config.dataDir, base: { instantane: (vers) => stockage.instantane(vers), sonde: () => stockage.sonde() }, horloge: Date.now, journaliser, disqueMinOctets: config.disqueMinMo * 1048576 });
  const demarreA = Date.now();
  const boucle = monitorEventLoopDelay({ resolution: 20 }); boucle.enable();

  /* Le plancher d'espace libre : sous le seuil, les écritures refusent (503) — ce service ne doit
     JAMAIS priver OP GESTION de disque. Relu toutes les 30 s ; une lecture impossible compte
     comme « pas bas » (on ne coupe pas sur une panne de mesure). */
  let disqueBas = false;
  const libreMo = () => { try { const s = fs.statfsSync(config.dataDir); return Number(s.bavail) * Number(s.bsize) / 1048576; } catch (e) { return Infinity; } };   // une mesure impossible ne coupe personne
  const mesurerDisque = () => {
    try { const s = fs.statfsSync(config.dataDir); disqueBas = (Number(s.bavail) * Number(s.bsize)) / 1048576 < config.disqueMinMo; } catch (e) { disqueBas = false; }
  };
  mesurerDisque();
  const minuteurDisque = setInterval(mesurerDisque, 30000); minuteurDisque.unref();

  /* L'EMPREINTE DE L'INTERFACE SERVIE : `scripts/opmsg-public.js` la pose dans `public/opmsg-ui.js` (douze hexadécimaux calculés sur les fichiers servis). La page ouverte compare
     la SIENNE à celle-ci (`/api/config`) : différentes, une nouvelle version a été déployée pendant qu'elle restait ouverte, et elle propose « Mettre à jour ». Lue une fois, au
     démarrage : c'est la version que CE service sert. Illisible (un dossier public d'avant) : null, et la page ne propose rien. */
  const build = (() => { try { const m = /const OPMSG_BUILD = '([0-9a-f]{12})';/.exec(fs.readFileSync(path.join(__dirname, 'public', 'opmsg-ui.js'), 'utf8')); return m ? m[1] : null; } catch (e) { return null; } })();
  /* LE NUMÉRO DE LA PAGE SERVIE (`OPMSG_VERSION`, posé par le générateur, +1 à chaque empreinte nouvelle) : c'est ce que la Tour
     exige (« Exiger la dernière version »), et ce que la page envoie à chaque écriture (`X-OPM-Version`). Illisible : 0. */
  /* ⛔ LA PORTE DE BANC (`OPMSG_TEST_VERSION_PAGE`) : un banc fait croire que le service sert une page PLUS RÉCENTE que celle du dossier public, pour jouer une page
     restée en arrière. Bêta seulement — en production elle est refusée au démarrage (`config.js`). */
  const versionPageBanc = config.testVersionPage || 0;
  const versionPage = (() => { try { const m = /const OPMSG_VERSION = ([0-9]{1,5});/.exec(fs.readFileSync(path.join(__dirname, 'public', 'opmsg-ui.js'), 'utf8')); return versionPageBanc || (m ? parseInt(m[1], 10) : 0); } catch (e) { return versionPageBanc; } })();
  /* LA VERSION MINIMALE que la Tour pose pour CETTE instance, relue chez OP GESTION (`version-client.js`) */
  const versionClient = creerVersionClient({ config, versionPage, journaliser });
  const ctx = {
    config, stockage, quotas, hub, porte, journaliser, horloge: Date.now, version: VERSION, build, versionPage, versionClient, scelleur, sms,
    pieces, reservations, piecesEtat, effacerPieces, push, formule, facturation, courriel, appels, agenda,
    maxMembres: stockageMod.MAX_MEMBRES, delaiModifMs: stockageMod.DELAI_MODIF_MS,
    disque: { bas: () => disqueBas, libreMo },
    /* ⛔ /health est PUBLIQUE et AGRÉGÉE : des nombres et des états, jamais un identifiant, un
       nom ou un compte de messages (un volume est un journal d'activité). */
    sante: () => ({
      ok: true, instance: config.instance, sha: config.sha, version: VERSION,
      uptimeS: Math.round((Date.now() - demarreA) / 1000),
      base: { ok: true, schema: stockage.schema(), illisibles: stockage.illisibles() },   // des lignes chiffrées qui ne s'ouvrent pas : un nombre, jamais lesquelles
      flux: hub.stats(),
      porte: porte ? porte.etat() : null,
      boucle: { p99Ms: Math.round(boucle.percentile(99) / 1e6 * 10) / 10 },
      disque: { bas: disqueBas },
      quotasRefus: quotas.refus(),
      sms: sms.sante(),   // des nombres : le coût du jour, le pourcentage du budget, les refus par motif — jamais un numéro
      /* ⛔ AGRÉGÉ : combien de pièces, combien d'octets, combien n'ont pas pu être relues, combien de fichiers ont résisté à l'effacement — jamais un identifiant ni un nom */
      pieces: Object.assign(stockage.pieceStats(), { illisibles: piecesEtat.illisibles, effacementsRates: piecesEtat.effacementsRates }),
      sauvegarde: sauvegarde.sante(),   // des nombres et un booléen : jamais un nom de bucket, un chemin, un motif
      push: push.sante(),   // des NOMBRES (et un état) : abonnements, envois et échecs des 24 dernières heures — jamais un point d'accès, une clé ou une personne
      /* ⛔ MESSAGES PRO : minutes depuis lesquelles Stripe est illisible (0 : il l'est, ou rien n'en dépend) — la surveillance crie au-delà de 90 ; le mode et le drapeau de la bêta. Jamais la clé, un
         identifiant de client ou d'abonnement, un espace — et JAMAIS un chiffre COMMERCIAL (combien d'espaces, d'abonnés, d'impayés) : `/health` est PUBLIC, et ces nombres disent à n'importe qui,
         d'un `curl`, où en sont les ventes (relecture du gardien, 3 octobre 2026). Ils se lisent dans le tableau de bord de Stripe, qui les tient déjà. */
      stripeEchecMin: facturation.echecMin(),
      /* ⛔ LES RÉUNIONS PROGRAMMÉES : des NOMBRES et un booléen — jamais une réunion, une personne ou un titre. L'âge du dernier tour du planificateur et ses échecs de suite sont surveillés ; un rappel qui ne part plus se voit là. */
      reunions: planificateur.sante(),
      /* ⛔ LES APPELS : un booléen (le relais est-il installé ?) et des NOMBRES — l'âge du dernier passage du balayeur et ses échecs de suite sont surveillés (un balayeur mort laisserait des gens « occupés » pour toujours). JAMAIS le nombre d'appels
         en cours, ni un appel, ni une personne : c'est une activité, et /health est publique. */
      appels: appels.sante(),
      /* ⛔ `persoAnnulationMin` : l'AGE, en minutes, du plus ancien geste d'abonnement Perso+ d'une personne qui s'en va que Stripe n'a pas confirmé — l'arrêt du renouvellement (suppression DEMANDÉE), son rétablissement (demande
         ANNULÉE) ou la résiliation (compte EFFACÉ) ; 0 : aucun. Un âge, jamais un nombre, ni un genre, ni un identifiant : /health est PUBLIQUE, et « combien d'abonnés » est un chiffre commercial. La surveillance crie
         au-delà d'un jour : une carte prélevée pour quelqu'un qui est parti ne se laisse pas dormir. */
      facturation: { mode: facturation.mode(), toutOuvert: formule.toutOuvert(), persoAnnulationMin: facturation.annulationAttenteMin() },
    }),
  };

  const app = construireApp(ctx);
  const server = app.listen(config.port, '127.0.0.1');
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 70000;
  /* ⛔ UN GROS FICHIER NE TIENT PAS DANS CINQ MINUTES (6 octobre 2026). Node coupe toute requête au bout de `requestTimeout` (300 s par défaut) : un fichier de 5 Go envoyé à 3 Mo/s
     (une demi-heure) était coupé net. Le délai se DÉDUIT des réglages, il ne se recopie pas : le temps d'envoyer le plus gros fichier permis au plus petit débit que la garde laisse
     passer (`fichierMax / depotDebitMin`, plus la grâce) — en dessous, c'est la garde de débit qui coupe, avec sa réponse (408) ; au-dessus, ce délai n'a jamais l'occasion de servir.
     Ce délai ne protège rien d'autre : les en-têtes ont `headersTimeout`, et les autres routes n'acceptent que 64 Ko. */
  server.requestTimeout = Math.ceil(config.pieces.fichierMax / config.pieces.depotDebitMin) * 1000 + config.pieces.depotGraceMs;

  /* ── Les tâches de fond : balayeur d'éphémères, élagage, relecture des accès bêta ───────── */
  const minuteurs = [];
  let tours = 0, reconcilie = false;
  /* ⛔ AUCUN FICHIER SANS LIGNE : un fichier dont la ligne est partie sans que son effacement ait abouti (arrêt du processus entre les deux, suppression de compte en cascade,
     effacement refusé par le disque) est effacé ici, s'il a plus de dix minutes (un fichier qu'un envoi vient de ranger n'a pas forcément encore sa ligne). Les temporaires d'un
     envoi interrompu par un arrêt partent après une heure. */
  async function reconcilierPieces() {
    if (reconcilie) return;
    reconcilie = true;
    try {
      const seuil = Date.now() - 600000;
      for await (const f of pieces.lister()) if (f.mtime < seuil && !stockage.pieceExiste(f.id)) await pieces.effacer(f.id);
      await pieces.nettoyerTmp(3600000);
    } catch (e) { journaliser('balayage_echec', { nom: e && (e.code || e.name) }); }
    finally { reconcilie = false; }
  }
  minuteurs.push(setInterval(() => {
    try {
      const r = stockage.purgerExpires(500);
      for (const c of r.convs) hub.reveiller({ conv: c });
      effacerPieces(r.pieces);                                            // les pièces d'un éphémère échu partent avec lui
      effacerPieces(stockage.piecesOrphelinesPurger(500));                // une pièce jamais envoyée (24 h), une photo de profil jamais posée
      /* ⛔ LES COMPTES DONT LA SUPPRESSION EST ÉCHUE (J+14) : l'identité, les contacts, les notifications, les appareils partent ; les messages restent chez les autres, signés « Compte supprimé ».
         Par petits paquets (un effacement est une transaction) ; ce que la personne a vu s'en aller (groupes quittés, contacts) est dit aux autres tout de suite. */
      /* ⛔ ENVOYER PLUS TARD (8 octobre 2026) : les messages programmés dont l'heure est venue partent, par le MÊME chemin qu'un envoi (`routes.js`, `ctx.programmesTour`) */
      if (ctx.programmesTour) { const g = ctx.programmesTour(25); if (g.envoyes) journaliser('programme_envoye', { n: g.envoyes }); }
      for (const id of stockage.comptesEchus(5)) {
        const e = stockage.compteEffacer(id);
        if (!e.effacee) continue;
        effacerPieces(e.pieces);
        hub.fermerPersonne(id);
        for (const c of e.convs) hub.reveiller({ conv: c });
        if (e.audience.length) hub.emettre(e.audience, 'personne', { uid: id });
        if (e.appels && e.appels.length) hub.reveiller({ uids: e.appels });   // l'autre participant d'un appel que cet effacement a terminé l'apprend tout de suite
        journaliser('compte_efface', { n: e.pieces.length });
        /* ⛔ son abonnement Perso+ s'annule chez Stripe TOUT DE SUITE (la demande est notée dans la transaction de l'effacement ; un échec se rejoue à la passe des dix minutes) */
        facturation.perso.annulationsTraiter();
        /* ⛔ un espace PAYANT que cet effacement a laissé sans membre (un autre membre est parti pendant les quatorze jours) n'est pas dissous — Stripe continuerait de prélever sans plus aucun lien : il se règle à la main, et le journal le DIT (un nombre, jamais un espace) */
        if (e.espacesOrphelins && e.espacesOrphelins.length) journaliser('espace_payant_sans_membre', { n: e.espacesOrphelins.length });
      }
      if (++tours % 10 === 0) {
        reconcilierPieces();
        stockage.journalElaguer();
        /* ⛔ L'élagage des tables du téléphone : sans lui (la fonction existait, personne ne l'appelait), les empreintes de numéros de personnes
           NON inscrites (un code demandé puis jamais prouvé), les recherches et les appareils expirés restaient indéfiniment. Chaque table a sa
           rétention : le journal des SMS garde de quoi calculer l'emballement (7 jours d'historique, un jour de marge), un code expiré part
           au bout d'une heure, les plafonds au bout de deux jours. */
        const t = Date.now(), e = sms.cfg.emballement;
        stockage.smsElaguer({ journalAvant: t - Math.max(e.historiqueMs, 7 * 86400000) - 86400000, codesAvant: t - 3600000, recherchesAvant: t - 2 * 86400000, tentativesAvant: t - 2 * 86400000, appareilsAbsMs: APPAREIL_ABS_MS });
        /* ⛔ les abonnements push d'une personne que plus rien ne connecte (ni session, ni jeton d'appareil) : elle ne reçoit déjà rien (`push.js` → `non_joignable`), ils ne restent pas pour autant */
        const retires = stockage.pushNonJoignablesPurger(APPAREIL_ABS_MS);
        if (retires) journaliser('push_elagage', { n: retires });
      }
    } catch (e) { journaliser('balayage_echec', { nom: e && (e.code || e.name) }); }
  }, config.balayageMs));
  if (porte) {
    let enCours = false;
    minuteurs.push(setInterval(async () => {
      if (enCours) return; enCours = true;
      /* ⛔ un accès coupé dans la Tour perd ses SESSIONS (la porte) et ses ABONNEMENTS PUSH (ici) : sans ça, une personne dont l'accès est fermé recevrait encore, sur son téléphone, « Nouveau message » */
      try { for (const id of await porte.relire()) { stockage.pushSupprimerPersonne(id); hub.fermerPersonne(id); } }
      catch (e) { journaliser('relecture_echec', { nom: e && (e.code || e.name) }); }
      finally { enCours = false; }
    }, config.beta.relectureMs));
  }
  /* ⛔ le minimum de la Tour se relit à la même cadence que les accès bêta ; une relecture à la fois */
  {
    let enCours = false;
    const relireVersion = async () => { if (enCours) return; enCours = true; try { await versionClient.relire(); } finally { enCours = false; } };
    minuteurs.push(setTimeout(relireVersion, 300));
    minuteurs.push(setInterval(relireVersion, config.beta.relectureMs));
  }
  for (const m of minuteurs) m.unref();
  sauvegarde.demarrer();   // inerte sans configuration : aucune minuterie, aucun réseau
  facturation.demarrer();  // inerte sans clé Stripe : sinon une relecture au démarrage, puis toutes les dix minutes pour les espaces abonnés
  appels.demarrer();       // le balayeur d'appels : un premier passage une seconde après le démarrage (les sonneries échues pendant l'arrêt), puis toutes les deux secondes
  if (appelsReveil.length) hub.reveiller({ uids: appelsReveil });
  planificateur.demarrer(); // un premier tour une seconde après le démarrage (un redémarrage rattrape ce qu'un arrêt a laissé), puis un tour toutes les 10 à 15 secondes

  async function arreter() {
    for (const m of minuteurs) clearInterval(m);
    clearInterval(minuteurDisque);
    push.arreter();
    facturation.arreter();
    appels.arreter();
    planificateur.arreter();   // REND le bail : la prochaine instance n'attend pas son échéance
    courriel.arreter();        // ferme la connexion au relais, s'il y en a une
    boucle.disable();
    hub.arreter();
    await sauvegarde.arreter();   // une passe en cours reconnaît l'arrêt (deux secondes au plus) ; ce n'est pas un échec
    await new Promise(r => server.close(() => r()));
    try { server.closeAllConnections(); } catch (e) {}
    stockage.fermer();
  }
  journaliser('demarre', { instance: config.instance, port: config.port, sha: config.sha });
  return { app, server, ctx, arreter, config };
}

module.exports = { demarrer, journaliser, VERSION };

if (require.main === module) {
  let svc;
  try { svc = demarrer(process.env); }
  catch (e) { journaliser('demarrage_refuse', { code: e && e.code ? e.code : 'ERREUR' }); process.stderr.write('OP MESSAGES : ' + (e && e.message ? e.message : 'démarrage impossible') + '\n'); process.exit(1); }
  const fin = (s) => { svc.arreter().finally(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); void s; };
  process.on('SIGTERM', () => fin('SIGTERM'));
  process.on('SIGINT', () => fin('SIGINT'));
  process.on('unhandledRejection', (e) => { journaliser('rejet', { nom: e && (e.code || e.name) }); process.exit(1); });
  process.on('uncaughtException', (e) => { journaliser('exception', { nom: e && (e.code || e.name) }); process.exit(1); });
}
