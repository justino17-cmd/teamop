/* ══ LE DOCUMENT D'ÉQUIPE, RANGÉ CHEZ NOUS — LA SORTIE DE FIREBASE ══════════════════════════
 *
 * Décision de Justin, 25 septembre 2026 : « moi je veux que quand j'envoie la mise à jour c'est
 * que Firebase soit supprimé », puis « on envoie la mise à jour pour le public, sans délai ».
 *
 * ⛔ ON DÉMÉNAGE LE COFFRE, ON NE LE RECONVERTIT PAS. Le plan du socle (`PLAN-OP-SOCLE.md`)
 * éclate la base en lignes, et c'est la bonne cible — mais pas en un seul geste un jour de
 * publication. Relevé le 25 septembre en préparant la copie :
 *   · la 695 garde des photos EN CLAIR dans les fiches (« data:image/… », sans identifiant) ;
 *     `syncSortirPieces` ne sort que le format déposé, donc elles partiraient dans les lignes ;
 *   · une intervention à plusieurs photos dépasse `CORPS_MAX` (512 Ko scellés, `socle.js`) :
 *     refusée par le serveur, donc ABSENTE pour tous les appareils ;
 *   · l'identifiant d'une pièce est donné par le serveur au dépôt, sur un contenu chiffré avec
 *     un vecteur aléatoire : la même photo convertie ici et sur un téléphone aurait deux
 *     identifiants, donc deux copies d'une fiche à la même date et deux empreintes — un conflit.
 * Ce module range donc EXACTEMENT ce que Firestore rangeait : un document par entreprise, tel que
 * l'appareil l'a chiffré avec la clé d'équipe, remplacé EN ENTIER à chaque envoi — ce que faisait
 * `_fbDoc.set()`. Toute la logique de fusion reste dans l'application : c'est celle qu'ELAN
 * emploie depuis des mois, éprouvée par des pannes réelles. On change le TRANSPORT, pas les
 * données. Le socle reste disponible pour plus tard, sans Firebase et sans date imposée.
 *
 * ⛔ TROIS GESTES, CEUX QUE L'APPLICATION FAISAIT À FIRESTORE, ET AUCUN AUTRE :
 *   · `POST /api/doc/lire`     — `_fbDoc.get()` ;
 *   · `POST /api/doc/ecrire`   — `_fbDoc.set(doc)`, ou `set({ver,verNum},{merge:true})` ;
 *   · `POST /api/doc/attendre` — `onSnapshot` : une attente longue, rendue dès qu'une écriture
 *     arrive, ou au bout de `ATTENTE_MS` sans rien (l'appareil repose alors la question).
 * Le serveur ne DÉCHIFFRE rien pour servir : il range et rend des octets. Il le POURRAIT (la clé
 * de chaque entreprise est dans l'annuaire, voir `pieces.js`), il n'en a pas besoin ici.
 *
 * ⛔ LA COPIE DEPUIS FIREBASE SE FAIT AU PREMIER ACCÈS, ET UN ÉCHEC N'EST JAMAIS « VIDE ».
 * Un document absent d'ici est cherché chez Firebase, recopié tel quel, et gardé À PART
 * (`<t>.firebase.json`) en plus d'être la version 1. Si la copie échoue (réseau, clé
 * d'administration absente, 5xx), on rend 503 et l'appareil réessaie : rendre « vide » ferait
 * croire à l'application que l'équipe est NEUVE — elle poserait un compte de départ et
 * pousserait sa propre base comme base de l'équipe. C'est la confusion que ce dépôt a payée deux
 * fois (`_mailboxes`, `syncDecrypt`) : `null` veut dire « on ne sait pas », jamais « rien ».
 * Seul un 404 de Firestore dit « cette entreprise n'a jamais rien écrit ».
 * ⚠️ Le jour où le projet Firebase est supprimé, `config.documents.copieFirebase` passe à
 * `false` : sans ce réglage, chaque NOUVELLE entreprise tomberait sur une copie impossible.
 *
 * ⛔ ET L'ÉCRITURE ATTEND LA COPIE. Une écriture qui trouverait la place vide sans avoir demandé
 * à Firebase écraserait la base de l'équipe par celle d'un seul appareil — la copie paresseuse
 * passe donc aussi par `ecrire`, sous le même verrou que `lire`.
 *
 * ⛔ AUCUNE PORTE NEUVE : `sauvRefus(t, kh)`, la même garde que les copies de sauvegarde et les
 * pièces jointes. Elle refuse l'espace de repli, un espace FERMÉ (pas suspendu : une suspension
 * est un état de facturation, décision de Justin du 20 septembre 2026), un espace inconnu et une
 * clé fausse. On y ajoute la clé PARTAGÉE (409), comme `/api/op/session` : une clé écrite en
 * clair dans `app.html` ne prouve rien.
 * ⚠️ LES ESPACES TECHNIQUES DE LA BÊTA passent sans preuve, exactement comme la règle
 * `elanB_teams` de `firestore.rules` : leur clé est publique, la bêta ne porte jamais de données
 * d'entreprise, et la refuser couperait l'outil de développement sans rien protéger. Ils restent
 * bornés et ne partagent aucun fichier avec une entreprise.
 * ⛔⛔ BORNÉS COMME FIRESTORE LES BORNAIT — ET C'EST UNE QUESTION DE SERVEUR, PAS DE BÊTA.
 * Relecture `gardien`, 25 septembre 2026, MESURÉ sur le vrai serveur : sans aucune clé, un
 * document de 5,4 Mo écrit sur `opgestion-beta`, 200 attentes ouvertes, puis une seconde écriture
 * — et le serveur ENTIER gelait 10,5 s (15,3 s avec des lecteurs lents), sa mémoire passant de
 * 120 Mo à 1,15 Go. Chaque attente refaisait `res.json` du document (encodage ET empreinte
 * d'Express) : 200 fois 5,4 Mo. Toutes les entreprises attendaient derrière. Deux parades :
 *   · la réponse s'encode UNE FOIS par version (`corpsDe`) et part telle quelle à chaque attente,
 *     par paquets de huit en rendant la main entre deux (`notifier`) ;
 *   · la bêta retrouve les bornes de Firestore : 1 Mio par document (la limite qu'elle vivait
 *     déjà chez Google), 30 attentes, des quotas à sa taille (une équipe de développement).
 * ⚠️ Ce qui reste ouvert, et qui l'était chez Google : n'importe qui peut réécrire le document
 * de la bêta (sa clé est publique) ou épuiser ses quotas pour une heure. Entrer dans la bêta
 * passe toujours par `/api/beta/login`, vérifié par le serveur : un compte posé dans ce document
 * n'ouvre pas la bêta à qui n'y a pas d'accès.
 * Mesuré après correctif (`scratchpad/mesure-b1.js`) : la même attaque est refusée (413) ; au
 * plafond de la bêta, l'écriture prend 98 ms ; et une VRAIE entreprise au pire (5,4 Mo, 200
 * appareils) écrit en 0,53 s au lieu de 14,7 s, mémoire 128 → 161 Mo au lieu de 1,19 Go.
 *
 * ⛔ ÉCRITURE PAR FICHIER TEMPORAIRE PUIS RENOMMAGE, et la version d'avant gardée (`.prec`).
 * Un document tronqué, c'est une entreprise qui repart de rien au prochain appareil qui lit. Et
 * un fichier ILLISIBLE n'est pas un document absent : 503, compteur, et la surveillance le dit.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* Comme `/api/op/flux` : sous les 60 s de nginx, largement. `TEAMOP_DOC_ATTENTE_MS` ne sert qu'aux
   bancs (une attente de 25 s par essai les rendrait interminables), et reste BORNÉ : aucun réglage
   ne peut dépasser 25 s, donc aucun ne peut faire couper l'attente par nginx. */
const ATTENTE_MS = Math.min(25000, Math.max(200, parseInt(process.env.TEAMOP_DOC_ATTENTE_MS, 10) || 25000));
const DOC_MAX = 5500000;               // caractères de JSON — sous les 6 Mo d'`express.json`
const DOC_MAX_TECHNIQUE = 1048576;     // la bêta : la limite d'un document Firestore, qu'elle vivait déjà
const ATTENTES_MAX = 200;              // attentes ouvertes par espace (borne mémoire)
const ATTENTES_MAX_TECHNIQUE = 30;     // une équipe de développement, pas une entreprise
/* Par espace et par heure : lectures, écritures, attentes. Un téléphone qui écoute repose sa
   question toutes les 25 s (144 par heure) ; une écriture réveille tous les appareils. */
/* ⛔ 26 septembre 2026 (vérification de A à Z) : « a: 20000 » ne tenait pas une entreprise de 15 appareils. Une
   écriture réveille TOUS les appareils à l'écoute, donc les attentes croissent comme N × écritures, pas 144 × N :
   15 appareils, deux gestes par minute chacun → 27 600 attentes projetées à l'heure, budget épuisé en 43 min, puis
   la synchro de toute l'entreprise freinée jusqu'à la fin de l'heure (fenêtre fixe). 100 000 couvrent une trentaine
   d'appareils à 2 000 écritures par heure ; la lecture suit l'écriture (une relecture avant chaque envoi) plus les
   reprises. Ce sont des bornes contre un emballement, pas un tarif : le seau PAR IP (index.js) reste la garde
   contre un tiers. Et chaque refus se COMPTE (`quotaRefus1h`), la surveillance le lit. `tests/test-819.js`. */
const QUOTAS = { l: 20000, e: 6000, a: 100000 };
const QUOTAS_TECHNIQUE = { l: 1500, e: 2000, a: 5000 };
/* ⛔ LA COPIE DEPUIS FIREBASE A UN DÉLAI TOTAL — jeton, lecture ET corps. Elle tient le verrou de
   l'espace : un Firestore qui envoie ses en-têtes puis se tait gardait l'entreprise bloquée
   jusqu'au redémarrage (mesuré par `gardien` : lecture et écriture toujours pendantes à 41 s). */
const COPIE_MS = Math.min(30000, Math.max(500, parseInt(process.env.TEAMOP_DOC_COPIE_MS, 10) || 30000));   // réglable par les bancs, jamais au-delà
/* ⛔ LA PREMIÈRE VERSION QUI N'ÉCRIT PLUS CHEZ FIREBASE. Tant que Firestore n'a pas confirmé un
   minimum au moins égal, une v695 peut encore y écrire APRÈS notre copie : deux copies de
   l'équipe qui divergent (`gardien`, C4). La copie attend donc que la porte de version soit
   fermée chez Google — et le dit (503 `attente_version`, compté pour la surveillance). */
const VERSION_SANS_FIREBASE = 748;
const ESPACES_TECHNIQUES = ['opgestion-beta', 'elan-gestion-beta'];
/* Les champs que l'application écrit (`syncPush`, et la fusion de version). Firestore acceptait
   n'importe quoi ; ici, un champ inconnu est refusé — c'est un document d'équipe, pas un casier. */
const CHAMPS = { enc: 'texte', iv: 'texte', salt: 'texte', z: 'nombre', ts: 'nombre', writer: 'texte',
  at: 'texte', by: 'texte', ver: 'texte', verNum: 'entier' };
const TEXTE_MAX = { iv: 200, salt: 200, writer: 120, at: 40, by: 200, ver: 40 };

function monterDocuments(app, d) {
  const { DATA_DIR, sauvRefus, cleEstPublique, quotaOk, monStr, versionMin, fbLireDocument, config } = d;
  const annuaireIllisible = d.annuaireIllisible || (() => false);
  const versionFirestore = d.versionFirestore || (() => 0);
  const DIR = path.join(DATA_DIR, 'documents');
  fs.mkdirSync(DIR, { recursive: true });

  const memo = new Map();       // t → { v, doc, maj } ; absent de la Map = pas encore lu
  const attentes = new Map();   // t → Set d'attentes ouvertes
  const verrous = new Map();    // t → promesse de la dernière opération sérialisée
  const quotas = new Map();
  const compte = { copies: 0, ecritures: 0 };
  /* ⛔ DES ÉCHECS RÉCENTS, PAS UN TOTAL. Un compteur cumulé ne repart à zéro qu'au redémarrage :
     un seul échec passager ferait crier la surveillance TOUTES LES HEURES jusqu'au prochain
     déploiement — la leçon de `mailRefus` (CLAUDE.md). On garde des horodatages, bornés, et
     `/health` publie ce qui tombe dans la dernière heure. */
  const recents = { copie: [], illisible: [], ecriture: [], attente: [], quota: [] };
  const noter = (k) => { const a = recents[k]; a.push(Date.now()); if (a.length > 500) a.splice(0, a.length - 500); };
  const dansLHeure = (k) => { const lim = Date.now() - 3600000; return recents[k].filter(ts => ts > lim).length; };

  const technique = t => ESPACES_TECHNIQUES.includes(t);
  /* ⛔ COUPER LA COPIE NE SE DÉCLARE PAS, ÇA SE PROUVE (`gardien`, C3). Avec `copieFirebase:false`,
     une entreprise sans fichier ici passait pour NEUVE — or une entreprise qu'aucun appareil n'a
     rouverte depuis la bascule n'a PAS encore de fichier, et son document vit toujours chez
     Google. L'appareil qui la rouvrirait prendrait la branche « espace neuf » et pousserait sa
     base comme celle de l'équipe. Le réglage n'est donc suivi que si un INVENTAIRE complet existe :
     chaque entreprise de l'annuaire recopiée ou confirmée absente de Firebase
     (`POST /api/monitor/documents/inventaire`, à lancer AVANT d'éteindre Firebase). Sans lui, la
     copie reste active, `/health` le montre (`copieFirebase: true`), et le journal le dit. */
  const INVENTAIRE = path.join(DIR, 'inventaire.json');
  let invCache;   // undefined : pas encore lu ; null : absent ou illisible
  const inventaire = () => {
    if (invCache === undefined) { try { const o = JSON.parse(fs.readFileSync(INVENTAIRE, 'utf8')); invCache = (o && typeof o === 'object' && o.espaces) ? o : null; } catch (e) { invCache = null; } }
    return invCache;
  };
  const coupureDemandee = () => !!(config && config.documents && config.documents.copieFirebase === false);
  const copieActive = () => !(coupureDemandee() && inventaire() && inventaire().complet === true);
  if (coupureDemandee() && copieActive()) console.error('⛔ documents : copieFirebase:false IGNORÉ — aucun inventaire complet (POST /api/monitor/documents/inventaire). La copie depuis Firebase reste active.');
  /* Un nom de fichier sûr. La garde de clé passe AVANT et refuse déjà tout espace inconnu ;
     celle-ci empêche qu'un identifiant, même connu, puisse jamais désigner un autre chemin. */
  const nomSur = t => /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(t);
  const chemin = (t, suffixe) => path.join(DIR, t + (suffixe || '') + '.json');

  function porte(t, kh) {
    if (!t || !nomSur(t)) return { code: 400, error: 'espace invalide', motif: 'identite' };
    if (technique(t)) return null;
    /* Un annuaire ILLISIBLE n'est pas un annuaire vide (voir `espacesIllisible`, index.js) : sans
       cette ligne, TOUTES les entreprises recevaient « espace inconnu » (404) — et leurs appareils
       le prenaient pour un refus. C'est une panne du serveur : 503, on réessaie (`gardien`, N6). */
    if (annuaireIllisible()) return { code: 503, error: 'annuaire des entreprises illisible sur le serveur — réessaie', motif: 'annuaire' };
    const r = sauvRefus(t, kh, 'synchro');
    if (r) {
      const motif = r.code === 404 ? 'inconnu' : /repli/.test(r.error) ? 'repli' : /ferm/.test(r.error) ? 'ferme' : 'cle';
      return { code: r.code, error: r.error, motif };
    }
    if (cleEstPublique(t)) return { code: 409, motif: 'cle_partagee',
      error: 'Cette entreprise utilise encore la clé de synchronisation partagée. Elle doit recevoir sa propre clé.' };
    return null;
  }

  /* ⛔ SÉRIALISÉ PAR ESPACE. Deux appareils qui lisent en même temps une place vide lanceraient
     deux copies depuis Firebase, et une écriture arrivée ENTRE les deux serait effacée par la
     seconde. Une chaîne de promesses par espace, jamais un verrou global : une entreprise lente
     ne doit pas faire attendre les autres. */
  function verrou(t, fn) {
    const avant = verrous.get(t) || Promise.resolve();
    const suite = avant.then(fn, fn);
    const fin = suite.catch(() => {});
    verrous.set(t, fin);
    fin.then(() => { if (verrous.get(t) === fin) verrous.delete(t); });
    return suite;
  }

  function lireFichier(p) {
    try { return fs.readFileSync(p, 'utf8'); }
    catch (e) { if (e.code === 'ENOENT') return null; noter('illisible'); throw Object.assign(new Error('lecture'), { code: 'ILLISIBLE' }); }
  }
  const entreeValide = (brut) => { let e = null; try { e = JSON.parse(brut); } catch (x) { return null; }
    return (e && typeof e === 'object' && e.v > 0 && e.doc && typeof e.doc === 'object' && !Array.isArray(e.doc)) ? e : null; };
  /* Rend `null` quand le document n'existe pas, JETTE quand il existe et ne se lit pas.
     Un redémarrage entre les deux renommages laisse `.prec` seul : c'est la dernière version
     complète, et c'est elle qu'on sert plutôt que de croire l'entreprise vide.
     ⛔ ET UN PRINCIPAL ABÎMÉ SE RABAT AUSSI SUR `.prec` (`gardien`, N5). Refuser (503) arrêtait la
     synchro de toute l'entreprise jusqu'à ce que quelqu'un répare le disque — un samedi, personne.
     `.prec` est la version d'avant : au pire une écriture manque, et l'appareil qui l'a faite la
     porte encore dans sa base, qu'il fusionnera. La version servie est PLUS BASSE : les appareils
     relisent (c'est le chemin d'une restauration). Le compteur `illisibles1h` crie quand même. */
  function charger(t) {
    if (memo.has(t)) return memo.get(t);
    const brut = lireFichier(chemin(t));
    const brutPrec = () => lireFichier(chemin(t, '.prec'));
    if (brut === null) {
      const bp = brutPrec(); if (bp === null) return null;
      const ep = entreeValide(bp);
      if (!ep) { noter('illisible'); throw Object.assign(new Error('document illisible'), { code: 'ILLISIBLE' }); }
      memo.set(t, ep); return ep;
    }
    const e = entreeValide(brut);
    if (e) { memo.set(t, e); return e; }
    noter('illisible');
    let ep = null; try { const bp = brutPrec(); ep = bp === null ? null : entreeValide(bp); } catch (x) { ep = null; }
    if (!ep) throw Object.assign(new Error('document illisible'), { code: 'ILLISIBLE' });
    console.error('documents : un document d\'équipe abîmé — la version précédente est servie');
    memo.set(t, ep);
    return ep;
  }
  function ecrireAtomique(p, contenu) {
    const tmp = p + '.tmp-' + process.pid + '-' + crypto.randomBytes(4).toString('hex');
    const fd = fs.openSync(tmp, 'w', 0o600);
    try { fs.writeSync(fd, contenu); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    return tmp;
  }
  function ranger(t, e) {
    const p = chemin(t);
    const tmp = ecrireAtomique(p, JSON.stringify(e));
    try {
      if (fs.existsSync(p)) fs.renameSync(p, chemin(t, '.prec'));
      fs.renameSync(tmp, p);
    } catch (x) { try { fs.unlinkSync(tmp); } catch (_e) {} throw x; }
    memo.set(t, e);
  }

  /* ⛔ LA RÉPONSE S'ENCODE UNE FOIS PAR VERSION, ET PART TELLE QUELLE (voir l'en-tête, B1). Même
     tampon pour chaque attente réveillée, chaque lecture, chaque retardataire : ni `JSON.stringify`
     ni empreinte d'Express répétés, et aucune copie en mémoire par lecteur lent (le tampon est
     partagé). La clé est l'ENTRÉE elle-même, pas son numéro : après un repli sur `.prec`, une
     écriture peut reprendre un numéro déjà servi, avec un autre contenu. */
  const corps = new Map();   // t → { e, buf }
  function corpsDe(t, e) {
    const c = corps.get(t);
    if (c && c.e === e) return c.buf;
    const buf = Buffer.from(JSON.stringify({ v: e.v, doc: e.doc }), 'utf8');
    corps.set(t, { e, buf });
    return buf;
  }
  function envoyer(res, buf) {
    if (res.headersSent) return;
    res.status(200);
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res.set('Content-Length', String(buf.length));
    res.end(buf);
  }
  /* ⛔ PAR PAQUETS, EN RENDANT LA MAIN ENTRE DEUX. Même encodée une seule fois, chaque réponse est
     RECOPIÉE par le noyau dans le tampon d'envoi de sa connexion (jusqu'à quelques Mo chacune) :
     mesuré le 25 septembre 2026, 200 appareils et un document de 5,4 Mo gelaient encore le
     serveur 4,4 s d'un seul bloc (0,5 s sans personne à l'écoute) ; en paquets, 0,53 s. Entre deux
     paquets, les autres entreprises passent. */
  const PAQUET = 8;
  function notifier(t, e) {
    const s = attentes.get(t);
    if (!s) return;
    attentes.delete(t);
    const buf = corpsDe(t, e);
    const liste = Array.from(s);
    for (const a of liste) clearTimeout(a.minuteur);
    const paquet = (i) => {
      for (const a of liste.slice(i, i + PAQUET)) a.envoyer(buf);
      if (i + PAQUET < liste.length) setImmediate(() => paquet(i + PAQUET));
    };
    paquet(0);
  }

  /* La copie depuis Firebase. Rend l'entrée copiée, `{ vide: true }` quand Firebase n'a jamais eu
     de document pour cet espace, `{ attente: true }` quand la porte de version n'est pas encore
     fermée chez Google, `null` quand on n'a PAS PU savoir. `force` : l'inventaire, qui vérifie
     même quand la copie est coupée. */
  const DELAI = {};
  async function copierDepuisFirebase(t, force) {
    if (!force && !copieActive()) {
      /* Coupée, ET prouvée par l'inventaire : une entreprise qu'il a vue AVEC un document chez
         Google, et qui n'a plus de fichier ici, n'est pas neuve — on ne sait pas, 503. */
      /* ⛔ SEUL « document » VEUT DIRE « ON NE SAIT PAS » (`gardien`, C3). Une entreprise que
         l'inventaire a classée FERMÉE (`ignore`) a vu son document effacé chez Google à la
         fermeture : rouverte plus tard, elle repart vide — la traiter comme inconnue la laissait
         en 503 pour toujours, Google éteint. */
      const inv = inventaire();
      if (inv && inv.espaces && Object.prototype.hasOwnProperty.call(inv.espaces, t) && inv.espaces[t] === 'document') { noter('copie'); return null; }
      return { vide: true };
    }
    if (!technique(t) && (+versionFirestore() || 0) < VERSION_SANS_FIREBASE) { noter('attente'); return { attente: true }; }
    let r = null;
    const lecture = (async () => { try { return await fbLireDocument(technique(t) ? 'elanB_teams' : 'elan_teams', t); } catch (e) { return null; } })();
    let minuteur = null;
    const delai = new Promise(ok => { minuteur = setTimeout(() => ok(DELAI), COPIE_MS); if (minuteur.unref) minuteur.unref(); });
    /* Une lecture qui répond APRÈS le délai est abandonnée : son résultat n'est jamais rangé —
       le verrou est rendu, une écriture a pu passer entre-temps. */
    try { r = await Promise.race([lecture, delai]); } finally { clearTimeout(minuteur); }
    if (r === DELAI) { noter('copie'); console.error('documents : copie depuis Firebase abandonnée au bout de ' + (COPIE_MS / 1000) + ' s'); return null; }
    if (!r) { noter('copie'); return null; }
    if (!r.existe) return { vide: true };
    const champs = (r.champs && typeof r.champs === 'object') ? r.champs : {};
    const e = { v: 1, doc: champs, maj: Date.now(), copieFirebase: true };
    try {
      /* L'original, À PART et jamais réécrit : c'est la preuve de ce que Firebase contenait le
         jour de la copie, et le point de retour si la nouvelle version devait être retirée. */
      const pf = chemin(t, '.firebase');
      if (!fs.existsSync(pf)) {
        const tmp = ecrireAtomique(pf, JSON.stringify({ champs, majFirebase: r.majFirebase || '', copieLe: Date.now() }));
        fs.renameSync(tmp, pf);
      }
      ranger(t, e);
    } catch (x) { noter('copie'); console.error('documents : copie depuis Firebase non rangée —', x.code || 'erreur'); return null; }
    compte.copies++;
    console.log('documents : un document d\'équipe copié depuis Firebase (' + Math.round(JSON.stringify(champs).length / 1024) + ' Ko)');
    return e;
  }
  /* Le document de l'espace, copie paresseuse comprise. Rend l'entrée, `null` pour une équipe
     neuve, et JETTE (`ILLISIBLE` / `COPIE`) quand on ne sait pas. */
  async function obtenir(t, force) {
    const e = charger(t);
    if (e) return e;
    const c = await copierDepuisFirebase(t, force);
    if (c === null) throw Object.assign(new Error('copie impossible'), { code: 'COPIE' });
    if (c.attente) throw Object.assign(new Error('copie en attente de la version'), { code: 'ATTENTE' });
    return c.vide ? null : c;
  }

  function champsValides(doc, fusion) {
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return 'document attendu';
    const cles = Object.keys(doc);
    for (const k of cles) {
      /* ⛔ `CHAMPS[k]` seul laissait passer `toString`, `constructor`, `valueOf`… — hérités
         d'Object.prototype, donc « connus » (`gardien`, C5, mesuré : rangés puis resservis). */
      const genre = Object.prototype.hasOwnProperty.call(CHAMPS, k) ? CHAMPS[k] : '';
      if (!genre) return 'champ inconnu';
      const v = doc[k];
      if (genre === 'texte' && typeof v !== 'string') return 'champ ' + k + ' : texte attendu';
      if (genre === 'texte' && TEXTE_MAX[k] && v.length > TEXTE_MAX[k]) return 'champ ' + k + ' trop long';
      if (genre === 'nombre' && !(typeof v === 'number' && isFinite(v))) return 'champ ' + k + ' : nombre attendu';
      if (genre === 'entier' && !Number.isInteger(v)) return 'champ ' + k + ' : entier attendu';
    }
    if (!Number.isInteger(doc.verNum)) return 'verNum requis';
    if (fusion) { if (cles.some(k => k !== 'ver' && k !== 'verNum')) return 'une fusion ne porte que la version'; }
    else if (!(doc.enc && doc.iv && doc.salt)) return 'document chiffré attendu (enc, iv, salt)';
    return '';
  }

  const refuser = (res, code, error, motif, plus) => res.status(code).json(Object.assign({ error, motif }, plus || {}));
  const erreurDe = (res, x) => {
    if (x && x.code === 'PORTE') return refuser(res, x.refus.code, x.refus.error, x.refus.motif);
    if (x && x.code === 'ATTENTE') return refuser(res, 503, 'la copie attend que la version minimale soit exigée — réessaie', 'attente_version');
    if (x && x.code === 'COPIE') return refuser(res, 503, 'copie depuis Firebase impossible pour le moment — réessaie', 'copie');
    return refuser(res, 503, 'document illisible sur le serveur', 'illisible');
  };
  /* ⛔ LA PORTE SE REVÉRIFIE SOUS LE VERROU (`gardien`, C6). Une lecture ou une écriture acceptée
     à l'entrée peut attendre plusieurs secondes derrière une copie lente ; si l'entreprise est
     fermée ou supprimée pendant ce temps, son `ranger()` la faisait RENAÎTRE après l'effacement
     — alors que la suppression promet « plus rien n'est enregistré ». Toutes les portes qui
     effacent retirent l'entreprise de l'annuaire (ou la ferment) AVANT d'effacer. */
  const porteSousVerrou = (t, kh) => { const r = porte(t, kh); if (r) throw Object.assign(new Error('porte'), { code: 'PORTE', refus: r }); };

  /* Le budget PAR ESPACE se compte APRÈS la preuve : compté avant, n'importe qui épuiserait le
     quota d'une entreprise en tapant son identifiant (la règle de `op-socle.js`). Les plafonds
     sont larges : un téléphone qui écoute repose sa question toutes les 25 s, et un bureau
     entier partage une seule adresse IP. */
  /* un refus de budget se COMPTE : sans lui, une entreprise freinée par son quota ne se voyait nulle part */
  const budget = (cle, t) => { const ok = quotaOk(quotas, cle + ':' + t, (technique(t) ? QUOTAS_TECHNIQUE : QUOTAS)[cle], 3600000);
    if (!ok) noter('quota'); return ok; };

  app.post('/api/doc/lire', async (req, res) => {
    const b = req.body || {};
    const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
    const refus = porte(t, kh); if (refus) return refuser(res, refus.code, refus.error, refus.motif);
    if (!budget('l', t)) return refuser(res, 429, 'trop de lectures — réessaie plus tard', 'quota');
    try {
      const e = await verrou(t, () => { porteSousVerrou(t, kh); return obtenir(t); });
      if (e) return envoyer(res, corpsDe(t, e));
      res.set('Cache-Control', 'no-store');
      res.json({ v: 0, doc: null });
    } catch (x) { erreurDe(res, x); }
  });

  app.post('/api/doc/ecrire', async (req, res) => {
    const b = req.body || {};
    const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
    const refus = porte(t, kh); if (refus) return refuser(res, refus.code, refus.error, refus.motif);
    const fusion = b.fusion === true;
    const doc = b.doc;
    const faute = champsValides(doc, fusion);
    if (faute) return refuser(res, 400, faute, 'forme');
    const max = technique(t) ? DOC_MAX_TECHNIQUE : DOC_MAX;
    let taille = 0; try { taille = JSON.stringify(doc).length; } catch (x) { taille = Infinity; }
    if (taille > max) return refuser(res, 413, 'document trop lourd', 'poids', { max });
    /* ⛔ LA PORTE DE VERSION, CELLE QUE LA RÈGLE FIRESTORE TENAIT (`versionOk()`) : en dessous du
       minimum exigé depuis la Tour, l'écriture est refusée. Sans elle, un appareil resté en
       arrière écrirait un format que les autres ne savent plus lire. */
    const min = +versionMin() || 0;
    if (min && doc.verNum < min) return refuser(res, 426, 'version trop ancienne — mets l\'application à jour', 'version', { min });
    if (!budget('e', t)) return refuser(res, 429, 'trop d\'écritures — réessaie plus tard', 'quota');
    try {
      const r = await verrou(t, async () => {
        porteSousVerrou(t, kh);
        const e = await obtenir(t);
        let neuf;
        if (fusion) {
          const base = e ? e.doc : {};
          /* Une fusion qui ne change rien ne fait pas une version : chaque appareil annonce sa
             version à chaque démarrage, et chaque version réveille TOUS les appareils à l'écoute. */
          if (e && Object.keys(doc).every(k => base[k] === doc[k])) return { v: e.v, inchange: true };
          neuf = Object.assign({}, base, doc);
        } else neuf = Object.assign({}, doc);
        const entree = { v: (e ? e.v : 0) + 1, doc: neuf, maj: Date.now() };
        try { ranger(t, entree); }
        catch (x) { noter('ecriture'); console.error('documents : écriture non rangée —', x.code || 'erreur'); throw Object.assign(new Error('écriture'), { code: 'ECRITURE' }); }
        compte.ecritures++;
        notifier(t, entree);
        return { v: entree.v };
      });
      res.json(Object.assign({ ok: true }, r));
    } catch (x) {
      if (x && x.code === 'ECRITURE') return refuser(res, 503, 'écriture impossible sur le serveur', 'ecriture');
      erreurDe(res, x);
    }
  });

  app.post('/api/doc/attendre', async (req, res) => {
    const b = req.body || {};
    const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
    const refus = porte(t, kh); if (refus) return refuser(res, refus.code, refus.error, refus.motif);
    if (!budget('a', t)) return refuser(res, 429, 'trop d\'attentes — réessaie plus tard', 'quota');
    const connu = parseInt(b.v, 10) || 0;
    let e;
    try { e = charger(t); } catch (x) { return erreurDe(res, x); }
    const v = e ? e.v : 0;
    if (v > connu) return envoyer(res, corpsDe(t, e));   // déjà en retard : tout de suite
    const s = attentes.get(t) || (attentes.set(t, new Set()), attentes.get(t));
    if (s.size >= (technique(t) ? ATTENTES_MAX_TECHNIQUE : ATTENTES_MAX)) return res.json({ v, inchange: true });
    const a = { minuteur: null, rendre: null, envoyer: null };
    a.rendre = (o) => { if (!res.headersSent) res.json(o); };
    a.envoyer = (buf) => envoyer(res, buf);
    a.minuteur = setTimeout(() => { s.delete(a); if (!s.size && attentes.get(t) === s) attentes.delete(t); a.rendre({ v, inchange: true }); }, ATTENTE_MS);
    if (a.minuteur.unref) a.minuteur.unref();
    /* Un onglet fermé ne doit laisser ni minuteur ni réponse en l'air.
       ⛔ `res.on('close')`, JAMAIS `req.on('close')` — MESURÉ le 25 septembre 2026, banc figé :
       sur une requête POST, Node émet `close` sur la REQUÊTE dès que son corps est lu, c'est-à-dire
       tout de suite, par `express.json`. L'attente se retirait elle-même à l'instant où elle
       était posée, et plus aucune écriture ne la réveillait : l'appareil restait sourd, sans
       erreur. `/api/op/flux` n'a pas ce piège parce qu'il est en GET, sans corps. La RÉPONSE,
       elle, ne se ferme que quand on a répondu ou que la connexion tombe. */
    res.on('close', () => { clearTimeout(a.minuteur); s.delete(a); if (!s.size && attentes.get(t) === s) attentes.delete(t); });
    s.add(a);
  });

  /* ⛔ FERMER OU SUPPRIMER UNE ENTREPRISE EFFACE AUSSI SON DOCUMENT ICI — le pendant exact de
     l'effacement de `elan_teams/<t>` chez Firebase. Les attentes ouvertes sont rendues : les
     appareils reposent leur question et tombent sur le refus de `sauvRefus`.
     ⛔ SOUS LE VERROU DE L'ESPACE (`gardien`, C6) : effacé hors verrou, un `ranger()` déjà en
     file derrière une copie lente passait APRÈS et recréait le fichier. Rend une promesse. Et les
     restes d'une écriture interrompue (`.json.tmp-…`) partent avec le reste. */
  function effacerMaintenant(t) {
    let fait = false;
    for (const suf of ['', '.prec', '.firebase']) {
      try { fs.unlinkSync(chemin(t, suf)); fait = true; } catch (e) { if (e.code !== 'ENOENT') console.error('documents : effacement incomplet —', e.code || 'erreur'); }
    }
    try {
      const prefixes = [t + '.json.tmp-', t + '.prec.json.tmp-', t + '.firebase.json.tmp-'];
      for (const f of fs.readdirSync(DIR)) if (prefixes.some(x => f.startsWith(x))) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
    } catch (e) {}
    memo.delete(t); corps.delete(t);
    const s = attentes.get(t);
    if (s) { attentes.delete(t); for (const a of s) { clearTimeout(a.minuteur); a.rendre({ v: 0, inchange: true }); } }
    return fait;
  }
  function effacer(t) {
    if (!t || !nomSur(t)) return Promise.resolve(false);
    return verrou(t, () => effacerMaintenant(t)).catch(() => false);
  }

  /* ⛔ L'INVENTAIRE, À LANCER AVANT D'ÉTEINDRE FIREBASE (voir `copieActive`, C3). Chaque
     entreprise de l'annuaire, une par une, sous son verrou : déjà ici, recopiée maintenant, ou
     confirmée ABSENTE chez Google (un 404 qui nomme son document). Une seule entreprise qu'on
     n'a pas pu vérifier, et l'inventaire n'est pas complet : `copieFirebase:false` reste ignoré.
     Réservé au patron (`monPatronStrict`), et la réponse ne compte que des nombres. */
  if (d.monPatronStrict && d.espacesConnus) app.post('/api/monitor/documents/inventaire', d.monPatronStrict, async (req, res) => {
    const liste = Array.from(new Set((d.espacesConnus() || []).filter(t => t && nomSur(t) && !technique(t))));
    const espaces = {}; let documents = 0, absents = 0, echecs = 0, ignores = 0;
    for (const t of liste) {
      /* Une entreprise FERMÉE (ou l'espace de repli) ne se recopie pas chez nous : ses données
         devaient partir avec elle. `sauvRefus` sans clé dit « fermé » ou « repli » AVANT de
         regarder la clé ; toute autre réponse (clé absente, inconnu) laisse passer l'inventaire. */
      const r0 = sauvRefus(t, '', 'synchro');
      if (r0 && r0.code === 403 && /repli|ferm/.test(r0.error || '')) { espaces[t] = 'ignore'; ignores++; continue; }
      try {
        const e = await verrou(t, () => obtenir(t, true));
        if (e) { espaces[t] = 'document'; documents++; } else { espaces[t] = 'absent'; absents++; }
      } catch (x) { espaces[t] = 'echec'; echecs++; }
    }
    const inv = { le: Date.now(), complet: echecs === 0, espaces };
    /* ⛔ UN INVENTAIRE COMPLET NE SE REMPLACE JAMAIS PAR UN INVENTAIRE INCOMPLET (`gardien`, C2).
       Relancé APRÈS l'extinction de Google, il échoue pour chaque entreprise sans fichier ici : il
       réécrivait `complet:false` par-dessus la preuve, la copie redevenait active, et toute
       entreprise neuve prenait 503 `copie` pour toujours. On garde la preuve, et on le DIT. */
    const avant = inventaire();
    if (!inv.complet && avant && avant.complet === true) {
      console.error('documents : inventaire incomplet (' + echecs + ' échec(s)) — le précédent, complet, est CONSERVÉ');
      return res.status(409).json({ ok: false, error: 'inventaire_incomplet_conserve', complet: false, precedentComplet: true,
        entreprises: liste.length, documents, absents, ignores, echecs });
    }
    try { const tmp = ecrireAtomique(INVENTAIRE, JSON.stringify(inv)); fs.renameSync(tmp, INVENTAIRE); invCache = inv; }
    catch (x) { console.error('documents : inventaire non écrit —', x.code || 'erreur'); return res.status(500).json({ error: 'inventaire non écrit' }); }
    console.log('documents : inventaire —', liste.length, 'entreprise(s),', documents, 'document(s),', absents, 'absente(s),', ignores, 'fermée(s),', echecs, 'échec(s)');
    res.json({ ok: true, complet: inv.complet, entreprises: liste.length, documents, absents, ignores, echecs });
  });

  /* Pour `/health` : des compteurs et des booléens, jamais un identifiant d'espace. */
  function sante() {
    return { actif: true, copieFirebase: copieActive(), copiesEchec1h: dansLHeure('copie'), illisibles1h: dansLHeure('illisible'),
      ecrituresEchec1h: dansLHeure('ecriture'), copiesEnAttente1h: dansLHeure('attente'), quotaRefus1h: dansLHeure('quota') };
  }

  return { effacer, sante, ESPACES_TECHNIQUES, ATTENTE_MS, DOC_MAX,
    _pourBanc: { charger, memo, compte, corps } };
}

/* ⛔ LA FORME DES VALEURS FIRESTORE (API REST), DÉPLIÉE UNE FOIS, ICI. Un `integerValue` arrive
   en TEXTE ; le lire comme tel ferait comparer « 1695 » à 1695 et tout document paraîtrait
   différent. */
function valeurFirestore(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return !!v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o = {}; const f = (v.mapValue && v.mapValue.fields) || {}; for (const k of Object.keys(f)) o[k] = valeurFirestore(f[k]); return o; }
  if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(valeurFirestore);
  return null;
}
function champsFirestore(fields) {
  const o = {};
  for (const k of Object.keys(fields || {})) o[k] = valeurFirestore(fields[k]);
  return o;
}

module.exports = { monterDocuments, champsFirestore, valeurFirestore, ESPACES_TECHNIQUES, ATTENTE_MS, DOC_MAX };
