#!/usr/bin/env node
/* ══ BRANCHER LA SAUVEGARDE HORS SITE D'OP MESSAGES, SANS AFFICHER NI COLLER UN SECRET NULLE PART ══
 *
 * Usage, SUR LE VPS, en root :
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-sauvegarde.js              (poser ou remplacer la sauvegarde)
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-sauvegarde.js --verifier   (relire une copie de la clé)
 *   (le fichier de configuration d'une instance : `/etc/opmsg/<instance>.json`, celui que le service lit)
 *
 * Imité de `server/configurer-sauvegarde.js` (OP GESTION), JAMAIS importé — avec UNE différence qui n'est pas de goût : celui d'OP
 * GESTION FABRIQUE la clé de chiffrement et l'IMPRIME à l'écran (« c'est le seul moment où elle s'affiche »). C'est exactement ce que la
 * règle du 24 septembre 2026 interdit : Justin recolle toutes ses sorties dans la conversation, et le 24 septembre une paire de clés du
 * coffre a dû être remplacée pour avoir été affichée une fois. Ici la clé de sauvegarde NAÎT sur son Mac (`openssl rand -hex 32 | pbcopy`,
 * rien ne s'affiche), va dans son gestionnaire de mots de passe, puis au VPS en SAISIE MASQUÉE. Ce programme n'en génère aucune et
 * n'en affiche aucune.
 *
 * ⛔ « ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS » (CLAUDE.md). Les trois secrets de la sauvegarde — la clé d'accès du coffre, sa clé
 * secrète et la clé de CHIFFREMENT des archives — se saisissent masqués (`saisie.js` : même un retour arrière, une flèche ou un collage
 * ne font rien paraître) et vont de ce clavier au fichier : jamais en argument (`ps` les montre à toute la machine, l'historique du
 * shell les garde), jamais affichés, jamais recopiés dans la conversation. Ce qui s'affiche peut se recoller : l'adresse du coffre, le
 * nom du bucket, la région, des longueurs, des verdicts.
 *
 * ⛔ LA CLÉ DE SAUVEGARDE SE SAISIT DEUX FOIS, ET LA SECONDE VIENT D'AILLEURS : la première depuis le presse-papiers, la seconde RELUE dans le
 * gestionnaire de mots de passe. Une clé mal copiée dans le gestionnaire est la panne la plus bête et la plus chère — des archives qu'on
 * ne pourra jamais ouvrir —, et on ne s'en apercevrait que le jour du sinistre. Les deux saisies doivent être identiques ; sinon rien n'est
 * écrit. `--verifier` refait cette comparaison plus tard, contre ce que le serveur utilise, pour chaque copie (papier compris).
 *
 * ⛔ LA CLÉ DE SAUVEGARDE N'EST JAMAIS LA CLÉ MAÎTRE (`/etc/opmsg/<instance>.kek`) : la perte, ou la fuite, d'une seule des deux ne doit pas
 * emporter l'autre. Le service refuse de démarrer avec deux clés égales — donc ce script le refuse AVANT d'écrire, au lieu de laisser
 * une panne de démarrage à la place d'un message. Pour comparer il lit la clé maître SANS l'afficher ; s'il ne peut pas la lire, il
 * s'arrête (une comparaison qu'on saute en silence n'est pas une comparaison).
 *
 * ⛔ ET IL ÉPROUVE LE COFFRE AVANT D'ÉCRIRE : il dépose un petit objet sous le VRAI préfixe de l'instance (un droit limité à un dossier
 * se voit là), le relit et compare l'empreinte, le retrouve dans la liste, puis l'efface. Des identifiants faux, un droit qui manque
 * (lecture, liste, effacement — chacun rend la sauvegarde inutile à sa façon) se savent TOUT DE SUITE, avec un message lisible — pas à
 * trois heures du matin dans un journal que personne ne lit. Aucune base, aucune archive, aucune pièce n'est touchée.
 * ⛔ Le fichier n'est réécrit qu'une fois tout validé : temporaire (0600 dès sa création), propriétaire de l'ancien conservé, relu et
 * revalidé par le MÊME code que le démarrage du service, toutes les AUTRES clés vérifiées intactes, puis renommé — jamais à moitié
 * (l'accolade manquante du 17 septembre). Le rythme et la rétention (14 jours) ont des valeurs prudentes par défaut et ne sont pas
 * demandés ; une configuration déjà posée les garde.
 */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { demander, fermer, AU_CLAVIER } = require('./saisie');
const SAUV = require('./sauvegarde');
const s3mod = require('./lib/s3');

const CONFIG_PATH = process.env.OPMSG_CONFIG;
const ARGS = process.argv.slice(2);
const VERIFIER = ARGS.includes('--verifier');

const echec = (m) => { console.error('\n✗ ' + m + ' Rien n\'a été modifié.'); fermer(); process.exit(1); };
/* Une clé telle qu'on la copie à la main : espaces, retours et majuscules n'y comptent pas (le papier se recopie par groupes). */
const normaliser = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();

/* La clé maître, lue SANS être affichée : sert à refuser une clé de sauvegarde qui lui serait égale. `null` si elle ne se lit pas. */
function lireKek(instance) {
  const chemin = process.env.OPMSG_KEK_FILE || path.join('/etc/opmsg', instance + '.kek');
  try { return SAUV.cleDepuis(fs.readFileSync(chemin, 'utf8')); } catch (e) { return null; }
}

/* Ce que dit un refus du coffre, sans jamais citer une valeur : le statut HTTP seul, et ce qu'il veut dire en pratique. */
function diagnostic(statut) {
  if (statut === 400) return 'le coffre a refusé la requête (400) : presque toujours un nom de bucket mal écrit, ou une région qui ne correspond pas à l\'adresse.';
  if (statut === 401 || statut === 403) return 'le coffre refuse l\'accès (' + statut + ') : clé d\'accès ou clé secrète fausse (ou recopiée avec un espace), ou paire sans le droit voulu sur CE bucket.';
  if (statut === 404) return 'le coffre ne connaît pas ce bucket (404) : son nom, ou la région qui doit correspondre à l\'adresse.';
  if (!statut) return 'le coffre n\'a pas répondu (réseau, délai dépassé, ou adresse introuvable depuis ce serveur — l\'adresse change selon la région).';
  return 'le coffre répond ' + statut + '.';
}

/* ══ --verifier : la copie qu'on a sous les yeux est-elle la clé que le serveur utilise ? ═══════════════════════════════════════ */
async function verifier({ instance, avant, kek }) {
  console.log('\n══ Relire une copie de la clé de sauvegarde (' + instance + ') — sans l\'afficher ══\n');
  if (!avant) echec('aucune sauvegarde n\'est configurée dans ce fichier : il n\'y a rien à comparer.');
  const posee = SAUV.cleDepuis(avant.cle) ? normaliser(avant.cle) : null;
  if (!posee) echec('la clé du fichier n\'a pas la forme attendue (64 hexadécimaux) : lance d\'abord ce script sans option pour la poser.');
  try { SAUV.lireConfigSauvegarde(avant, { instance, kek }); console.log('✓ la configuration du fichier est valide : le service la lira.'); }
  catch (e) { console.error('✗ la configuration du fichier serait REFUSÉE au démarrage : ' + String(e.message).replace(/^config: /, '')); fermer(); process.exit(1); }
  console.log('Cette commande compare ta copie (gestionnaire de mots de passe, papier) à la clé que le serveur utilise. Elle ne dit que le verdict.');
  if (AU_CLAVIER) console.log('Rien ne s\'affiche pendant la frappe — c\'est normal. Les espaces et les majuscules n\'y comptent pas.\n');
  const saisie = normaliser(await demander('Colle (ou tape) la clé de sauvegarde, puis Entrée (masquée) : ', true));
  console.log('longueur : ' + saisie.length + ' (attendu 64)');
  fermer();
  if (saisie === posee) { console.log('✓ identique'); return; }
  let i = 0; while (i < 64 && saisie[i] !== undefined && saisie[i] === posee[i]) i++;
  console.log('✗ différente — première différence : caractère n° ' + (i + 1));
  if (kek && saisie === kek.toString('hex')) console.log('⛔ attention : cette copie est celle de la clé MAÎTRE, pas celle de la sauvegarde. Ce sont deux entrées distinctes du gestionnaire.');
  process.exit(1);
}

/* ══ l'épreuve du coffre : dépôt, relecture, liste, effacement — sous le VRAI préfixe, avant d'écrire quoi que ce soit ═════════════ */
async function eprouverCoffre(valide) {
  const client = s3mod.client(valide.coffre);
  if (!client) echec('le coffre est incomplet (adresse, bucket, clé d\'accès et clé secrète sont tous nécessaires).');
  const cle = valide.prefixe + 'essai-configuration-' + crypto.randomBytes(6).toString('hex') + '.tmp';
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'opmsg-config-'));
  let pose = false, efface = false;
  const nettoyer = async () => {
    try { if (pose && !efface) await client.effacerCle(cle); } catch (e) { /* le message dit déjà que l'objet d'essai peut rester */ }
    fs.rmSync(dossier, { recursive: true, force: true });
  };
  const abandonner = async (m) => { await nettoyer(); echec(m); };
  try {
    /* Un contenu au hasard (8 Kio) : un coffre qui rendrait autre chose que ce qu'on lui a confié se voit à l'empreinte. */
    const temoin = path.join(dossier, 'temoin.bin');
    const contenu = crypto.randomBytes(8192);
    fs.writeFileSync(temoin, contenu, { mode: 0o600 });
    const empreinte = crypto.createHash('sha256').update(contenu).digest('hex');

    const p = await client.poserCleFlux(cle, temoin, contenu.length, empreinte, 30000);
    if (!p.ok) await abandonner('DÉPÔT REFUSÉ — ' + diagnostic(p.statut));
    pose = true;

    /* ⛔ ON RELIT ET ON COMPARE. Un coffre en écriture seule accepte le dépôt et rend 403 à la lecture : la sauvegarde partirait toutes
       les heures et ne serait jamais restaurable — la panne muette que ce projet ne veut plus jamais avoir. */
    const sortie = path.join(dossier, 'relu.bin');
    const l = await client.lireCleVers(cle, sortie, 30000);
    if (!l.ok) await abandonner('RELECTURE IMPOSSIBLE — le dépôt a marché mais pas la lecture' + (l.statut ? ' (HTTP ' + l.statut + ')' : '') + '. Les droits doivent couvrir la LECTURE autant que l\'écriture, sinon la sauvegarde ne se restaurera jamais.');
    if (l.octets !== contenu.length || l.empreinte !== empreinte) await abandonner('RELECTURE DIFFÉRENTE — le coffre a rendu un autre contenu que celui qu\'on lui a confié (empreinte différente).');

    const liste = await client.lister(valide.prefixe);
    if (!liste.ok) await abandonner('LISTE REFUSÉE' + (liste.statut ? ' (HTTP ' + liste.statut + ')' : '') + ' — sans elle, ni la rétention ni la restauration ne savent ce que contient le coffre.');
    if (!liste.objets.some(o => o.cle === cle && o.octets === contenu.length)) await abandonner('LISTE INCOMPLÈTE — l\'objet qu\'on vient de déposer n\'apparaît pas dans la liste du coffre sous « ' + valide.prefixe + ' ».');

    const e = await client.effacerCle(cle);
    if (!e.ok) await abandonner('EFFACEMENT REFUSÉ' + (e.statut ? ' (HTTP ' + e.statut + ')' : '') + ' — la rétention ne pourrait jamais retirer une vieille archive et le coffre grossirait sans fin. L\'objet d\'essai « ' + cle + ' » est resté au coffre : à retirer à la main.');
    efface = true;
  } catch (e) {
    /* Ce qui arrive ici n'est PAS un refus du coffre (le client les rend en valeur, et `abandonner` quitte) : c'est le disque local, ou un
       défaut de ce programme. On le dit sans citer le message — il pourrait porter un chemin. */
    await nettoyer();
    echec('l\'essai du coffre a échoué en route (' + (e && e.code ? e.code : 'erreur') + ').');
  }
  await nettoyer();
}

/* ══ écrire la configuration : temporaire, relue, revalidée, renommée ═════════════════════════════════════════════════════════ */
function ecrire(config, bloc, { instance, kek }) {
  const sansBloc = (o) => { const c = Object.assign({}, o); delete c.sauvegarde; return JSON.stringify(c); };
  const attendu = sansBloc(config);
  const neuve = Object.assign({}, config, { sauvegarde: bloc });
  const tmp = CONFIG_PATH + '.tmp-' + process.pid;
  /* ⛔ Créé en 0600 DÈS L'ÉCRITURE (`mode`, flag `wx`) : écrit d'abord avec le umask par défaut puis `chmod`, le fichier portait les secrets
     lisibles par tous les comptes de la machine pendant l'intervalle. */
  fs.writeFileSync(tmp, JSON.stringify(neuve, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  fs.chmodSync(tmp, 0o600);
  /* ⛔ LE PROPRIÉTAIRE SUIT LE FICHIER : lancé en root, le renommage donnerait un fichier root:root en 0600, que le service (utilisateur
     `opmsg`) ne pourrait plus lire — il refuserait de démarrer. On recopie le propriétaire de l'ancien. */
  try { const st = fs.statSync(CONFIG_PATH); fs.chownSync(tmp, st.uid, st.gid); } catch (e) { /* hors root, le propriétaire est déjà le bon */ }
  /* Relu ET revalidé AVANT de remplacer : on ne met pas en place une configuration que le service refuserait au démarrage, ni une qui
     aurait touché une autre clé que la sauvegarde. */
  try {
    const relu = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    SAUV.lireConfigSauvegarde(relu.sauvegarde, { instance, kek });
    if (sansBloc(relu) !== attendu) throw new Error('une autre clé a changé');
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (e) { /* déjà parti */ }
    echec('le fichier écrit ne se relit pas comme prévu, ou le service le refuserait au démarrage.');
  }
  fs.renameSync(tmp, CONFIG_PATH);
  fs.chmodSync(CONFIG_PATH, 0o600);
}

/* ══ le programme ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(async () => {
  for (const a of ARGS) if (a !== '--verifier') echec('option inconnue (« --verifier » est la seule).');
  if (!CONFIG_PATH) echec('OPMSG_CONFIG n\'est pas posé (le fichier de configuration de l\'instance, par exemple /etc/opmsg/beta.json).');
  let config;
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { echec(CONFIG_PATH + ' illisible (' + (e && e.code === 'ENOENT' ? 'introuvable' : 'JSON invalide') + ') — ce script MODIFIE une configuration existante, il n\'en crée pas une neuve.'); }
  if (!config || typeof config !== 'object' || Array.isArray(config)) echec('le fichier doit contenir un objet JSON.');
  /* L'instance : celle que le fichier écrit par l'installation porte (« instance »), ou — à défaut — celle de l'environnement, comme le service
     (`OPMSG_INSTANCE`). Si les deux parlent et se contredisent, on s'arrête : écrire la sauvegarde de la production dans le fichier de la
     bêta est la faute qu'un nom de préfixe ne rattrape pas. */
  const instance = config.instance || process.env.OPMSG_INSTANCE;
  if (instance !== 'beta' && instance !== 'prod') echec('le fichier ne dit pas de quelle instance il est (« instance » : beta ou prod).');
  if (config.instance && process.env.OPMSG_INSTANCE && config.instance !== process.env.OPMSG_INSTANCE) echec('le fichier dit « ' + config.instance + ' » et OPMSG_INSTANCE dit « ' + process.env.OPMSG_INSTANCE + ' » : une des deux est fausse.');
  const avant = config.sauvegarde && typeof config.sauvegarde === 'object' && !Array.isArray(config.sauvegarde) ? config.sauvegarde : null;
  const kek = lireKek(instance);

  if (VERIFIER) return verifier({ instance, avant, kek });

  console.log('\n══ Sauvegarde hors site d\'OP MESSAGES (' + instance + ') ══\n');
  if (avant) console.log('Une sauvegarde est déjà configurée. Ce script va la remplacer (le rythme et la rétention déjà réglés sont conservés).\n');
  console.log('Il faut sept saisies, prises dans la console de l\'hébergeur d\'objets et dans ton gestionnaire de mots de passe (voir');
  console.log('design/opmessages/INSTALLER-LE-SERVEUR.md, geste « Sauvegarde »). Trois ne sont pas des secrets (adresse, bucket, région) ;');
  console.log('trois en sont (clé d\'accès et clé secrète du coffre, clé de sauvegarde), et la clé de sauvegarde se saisit deux fois.');
  if (AU_CLAVIER) console.log('Les secrets ne s\'afficheront PAS pendant la frappe — c\'est normal.\n');
  else console.log('⚠ Entrée redirigée : les secrets ne sont pas affichés, mais ils viennent d\'un fichier. Au clavier, ils sont masqués.\n');

  /* La clé maître d'abord : sans elle, on ne peut pas garantir que la clé de sauvegarde en est différente, et le service refuserait de démarrer. */
  if (!kek) echec('la clé maître n\'est pas lisible ici (' + (process.env.OPMSG_KEK_FILE ? 'le fichier donné par OPMSG_KEK_FILE' : '/etc/opmsg/' + instance + '.kek') + ') : sans elle, on ne peut pas vérifier que la clé de sauvegarde en est DIFFÉRENTE. Ce script se lance en root, sur le serveur.');

  const endpoint = await demander('Adresse du coffre (https://…)              : ', false);
  const bucket = await demander('Nom du bucket                              : ', false);
  const region = (await demander('Région [eu-central-4]                      : ', false)) || 'eu-central-4';
  const accessKey = await demander('Clé d\'accès du coffre (masquée)           : ', true);
  const secretKey = await demander('Clé secrète du coffre (masquée)           : ', true);
  const cle1 = normaliser(await demander('Clé de sauvegarde (masquée)                 : ', true));
  const cle2 = normaliser(await demander('La même, RELUE dans le gestionnaire (masquée): ', true));

  if (!endpoint || !bucket || !accessKey || !secretKey || !cle1 || !cle2) echec('Une valeur manque.');

  /* ⛔ ON VÉRIFIE LA FORME AVANT D'ALLER DÉRANGER LE COFFRE (appris en direct le 18 septembre 2026, première mise en service d'OP GESTION :
     « Object Storage », le nom du MENU de l'hébergeur, tapé comme nom de bucket, et l'adresse complète comme région — un refus nu du coffre,
     trois causes possibles dont aucune n'était la bonne). Chaque refus dit exactement quoi corriger. */
  if (cle1 !== cle2) {
    let i = 0; while (i < 64 && cle1[i] !== undefined && cle1[i] === cle2[i]) i++;
    echec('Les deux saisies de la clé de sauvegarde ne sont pas identiques (longueurs ' + cle1.length + ' et ' + cle2.length + ', première différence au caractère n° ' + (i + 1) + '). Une des deux copies est fausse : ne rien poser avant de savoir laquelle.');
  }
  if (!SAUV.cleDepuis(cle1)) echec('La clé de sauvegarde doit faire 64 caractères hexadécimaux (longueur saisie : ' + cle1.length + ').');
  if (SAUV.cleDepuis(cle1).equals(kek)) echec('⛔ C\'est la clé MAÎTRE que tu as saisie, pas celle de la sauvegarde. Ce sont deux entrées distinctes du gestionnaire de mots de passe : la sauvegarde a sa PROPRE clé, une clé NEUVE tirée sur ton Mac comme la clé maître (voir le guide, geste « Sauvegarde »).');
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) {
    echec('Ce n\'est pas un nom de bucket valable. Un nom de bucket s\'écrit en minuscules, sans espace ni accent (lettres, chiffres, tirets, points) : c\'est le nom que TU as donné au bucket à sa création, pas le nom du menu de l\'hébergeur.');
  }
  if (!/^[a-z]{2}-[a-z]+-\d+$/.test(region)) {
    echec('Ce n\'est pas une région. Une région s\'écrit comme « eu-central-4 » : ce n\'est PAS l\'adresse du coffre, et elle doit correspondre à cette adresse.');
  }

  const bloc = Object.assign({}, avant || {}, { endpoint, bucket, region, accessKey, secretKey, cle: cle1 });
  let valide;
  /* La MÊME validation que le démarrage du service : ce qui passe ici démarrera là. */
  try { valide = SAUV.lireConfigSauvegarde(bloc, { instance, kek }); } catch (e) { echec(String(e.message).replace(/^config: /, '')); }

  /* Remplacer une clé, ou un coffre, n'est pas un geste anodin : les archives déjà déposées restent chiffrées avec l'ANCIENNE clé, et
     celles de l'ancien coffre y restent. On le dit, et on demande « oui » en toutes lettres. */
  const cleAvant = avant ? SAUV.cleDepuis(avant.cle) : null;
  const changeCle = !!(cleAvant && !cleAvant.equals(valide.cle));
  const changeCoffre = !!(avant && (String(avant.endpoint || '').replace(/\/+$/, '') !== valide.coffre.endpoint || avant.bucket !== valide.coffre.bucket || (avant.prefixe !== undefined ? String(avant.prefixe) : instance + '/') !== valide.prefixe));
  if (changeCle || changeCoffre) {
    console.log('\n⚠ Tu remplaces une sauvegarde qui existe déjà :');
    if (changeCle) console.log('   · la clé de sauvegarde est DIFFÉRENTE : les archives déjà au coffre restent chiffrées avec l\'ANCIENNE clé. Garde-la dans le gestionnaire de mots de passe, nommée comme telle, jusqu\'à ce qu\'elles soient sorties de la rétention (' + valide.retentionJours + ' jours).');
    if (changeCoffre) console.log('   · le coffre (ou son dossier) est DIFFÉRENT : les archives de l\'ancien y restent, rien n\'y est effacé.');
    const rep = (await demander('Tape « oui » pour continuer (autre chose : on s\'arrête) : ', false)).toLowerCase();
    if (rep !== 'oui') echec('Pas de « oui » : abandon.');
  }

  console.log('\n── Essai du coffre (dépôt, relecture, liste, effacement — d\'un petit objet d\'essai, sous « ' + valide.prefixe + ' ») ──');
  await eprouverCoffre(valide);
  console.log('✅ coffre joignable : dépôt, relecture identique, liste, effacement.');

  ecrire(config, bloc, { instance, kek });
  const domaine = typeof config.domaine === 'string' && /^[A-Za-z0-9.-]+$/.test(config.domaine) ? config.domaine : '<domaine>';
  console.log('✅ ' + CONFIG_PATH + ' mis à jour (chmod 600). Rythme : une sauvegarde toutes les ' + Math.round(valide.intervalleMs / 60000) + ' min, gardées ' + valide.retentionJours + ' jours.');
  console.log('\nPour finir, dans cet ordre :');
  console.log('   1. systemctl restart teamop-msg@' + instance);
  console.log('   2. au bout d\'une minute ou deux :   curl -s https://' + domaine + '/health');
  console.log('      « sauvegarde » doit dire "configuree":true, puis "ageH" un nombre (la première sauvegarde est partie ET relue).');
  console.log('   3. l\'essai de restauration (il écrit la date que /health publie) :');
  console.log('      OPMSG_CONFIG=' + CONFIG_PATH + ' OPMSG_DATA=/opt/opmsg/' + instance + '/data node /opt/opmsg/' + instance + '/current/outils/restaurer.js essai');
  console.log('   4. relire chaque COPIE de la clé de sauvegarde (gestionnaire, papier) :   OPMSG_CONFIG=' + CONFIG_PATH + ' node /opt/opmsg/' + instance + '/current/configurer-sauvegarde.js --verifier\n');
  fermer();
})().catch(e => { console.error('✗ ' + (e && e.message ? e.message : 'erreur') + ' Rien n\'a été modifié.'); fermer(); process.exit(1); });
