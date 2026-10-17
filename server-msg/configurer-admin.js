#!/usr/bin/env node
/* ══ POSER LE SECRET D'ADMINISTRATION D'OP MESSAGES, SANS L'AFFICHER NI LE COLLER NULLE PART ═════════════════════════════════════════════
 *
 * Ce secret ouvre les routes `/api/admin/*` (`admin.js`) : la console interne (la Tour) les lit par le relais d'api.teamop.fr, qui parle à ce service en boucle locale et
 * présente le secret dans l'en-tête `X-OPM-Admin`. Sans lui, ces routes sont INERTES (404). Le contrat des routes est dans l'en-tête d'`admin.js`.
 *
 * Usage, SUR LE VPS, en root :
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-admin.js              (poser ou remplacer le secret)
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-admin.js --verifier   (comparer une valeur collée à celle qui est posée — rien ne s'affiche)
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-admin.js --retirer    (fermer l'administration : les routes redeviennent INERTES)
 *   (le fichier de configuration d'une instance : `/etc/opmsg/<instance>.json`, celui que le service lit)
 *
 * ⛔⛔ LA MÊME VALEUR DOIT ÊTRE POSÉE CÔTÉ api.teamop.fr (le relais l'envoie dans `X-OPM-Admin`). Deux services, un secret : si les deux ne portent pas la même valeur, la console OP MESSAGES
 * ne reçoit que des 404 (le service journalise `admin_refus` avec le motif `faux`, jamais la valeur). Comment s'y prendre sans jamais l'afficher ni la recopier dans une conversation :
 *   1. la FABRIQUER ailleurs que sur le VPS, directement dans le presse-papiers, sans l'écran : sur le Mac, `openssl rand -hex 32 | pbcopy` ; la ranger tout de suite dans le gestionnaire de
 *      mots de passe (c'est lui qui la garde) ;
 *   2. la COLLER ici, à l'invite masquée ; puis la coller de la même façon dans l'outil de configuration du relais, côté OP GESTION ;
 *   3. ÉPROUVER la copie : `--verifier` (ici) compare une valeur collée à celle qui est posée et dit « identique » ou « différent » — il n'affiche rien d'autre. Les deux côtés disent aussi
 *      la même EMPREINTE COURTE (les huit premiers signes du SHA-256 du secret : elle ne permet pas de retrouver le secret, elle permet de voir que deux copies sont jumelles).
 * Une invite laissée VIDE fabrique un secret au hasard ICI et ne le montre à personne : il ferme de fait la porte (aucun relais ne le connaît) tant que la même valeur n'est pas collée
 * des deux côtés — c'est une rotation « à blanc », pas un moyen de transporter un secret. Pour le transporter, c'est le gestionnaire de mots de passe.
 *
 * ⛔ « ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS » (CLAUDE.md). Le secret se SAISIT ici, masqué (`saisie.js` : même un retour arrière, une flèche ou un collage ne le réaffichent),
 * et va de ce clavier au fichier : jamais en argument (`ps` le montre à toute la machine, l'historique du shell le garde), jamais affiché, jamais dans un message d'erreur.
 * ⛔ Le fichier n'est réécrit qu'une fois tout validé : temporaire (0600 dès sa création), propriétaire de l'ancien conservé, relu et revalidé par le MÊME code que le démarrage du service
 * (`adminConfig`), toutes les AUTRES clés vérifiées intactes, puis renommé — jamais à moitié. Le service ne relit sa configuration qu'au démarrage : `systemctl restart teamop-msg@<instance>`.
 * ⛔ Le service REFUSE de démarrer avec un secret égal à sa clé maître : ce script ne connaît pas cette clé (elle arrive par le credential systemd), le refus se lit donc au redémarrage.
 */
'use strict';
const fs = require('fs'), crypto = require('crypto');
const { demander, fermer } = require('./saisie');
const { adminConfig, RE_SECRET } = require('./admin');

const CONFIG_PATH = process.env.OPMSG_CONFIG;
const ARGS = process.argv.slice(2);
const VERIFIER = ARGS.includes('--verifier'), RETIRER = ARGS.includes('--retirer');

const echec = (m, rienModifie) => { console.error('\n✗ ' + m + (rienModifie === false ? '' : ' Rien n\'a été modifié.')); fermer(); process.exit(1); };
const sansPrefixe = (e) => String(e && e.message ? e.message : e).replace(/^config: /, '');
const empreinte = (secret) => crypto.createHash('sha256').update(secret.toLowerCase()).digest();
/* huit signes du SHA-256 : de quoi reconnaître une copie jumelle, pas de quoi retrouver le secret */
const courte = (secret) => empreinte(secret).toString('hex').slice(0, 8);

/* Écrit `apres` à la place de la configuration : temporaire en 0600 dès la création, propriétaire conservé, relu et revalidé, AUTRES clés intactes, puis renommé. `attendu` : le secret que la relecture doit retrouver (null : le bloc doit avoir disparu). */
function ecrire(avant, apres, attendu) {
  const tmp = CONFIG_PATH + '.tmp-' + process.pid;
  /* ⛔ Créé en 0600 DÈS L'ÉCRITURE (`mode`, flag `wx`) : écrit d'abord avec le umask par défaut puis `chmod`, le fichier portait le secret lisible par tous les comptes de la machine pendant l'intervalle. */
  fs.writeFileSync(tmp, JSON.stringify(apres, null, 2), { mode: 0o600, flag: 'wx' });
  fs.chmodSync(tmp, 0o600);
  /* ⛔ LE PROPRIÉTAIRE SUIT LE FICHIER : lancé en root, le renommage donnerait un fichier root:root en 0600, que le service (utilisateur `opmsg`) ne pourrait plus lire — il refuserait de démarrer. */
  try { const st = fs.statSync(CONFIG_PATH); fs.chownSync(tmp, st.uid, st.gid); } catch (e) { /* hors root, le propriétaire est déjà le bon */ }
  try {
    const relu = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    const valide = adminConfig(relu, null);
    if (attendu === null ? valide !== null : (valide === null || !crypto.timingSafeEqual(valide.empreinte, empreinte(attendu)))) throw new Error('bloc admin différent de celui qu\'on a voulu écrire');
    for (const k of new Set(Object.keys(avant).concat(Object.keys(relu)))) if (k !== 'admin' && JSON.stringify(relu[k]) !== JSON.stringify(avant[k])) throw new Error('clé ' + k + ' changée');
  } catch (err) { try { fs.unlinkSync(tmp); } catch (e) { /* déjà parti */ } echec('le fichier écrit ne se relit pas, ou une autre clé aurait changé, ou le service le refuserait au démarrage.'); }
  fs.renameSync(tmp, CONFIG_PATH);
  fs.chmodSync(CONFIG_PATH, 0o600);
}

(async () => {
  if (!CONFIG_PATH) echec('OPMSG_CONFIG n\'est pas posé (le fichier de configuration de l\'instance, par exemple /etc/opmsg/beta.json).');
  for (const a of ARGS) if (a !== '--verifier' && a !== '--retirer') echec('option inconnue (« --verifier » et « --retirer » sont les seules).');
  if (VERIFIER && RETIRER) echec('« --verifier » et « --retirer » ne vont pas ensemble.');
  let config;
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { echec(CONFIG_PATH + ' illisible (' + (e && e.code === 'ENOENT' ? 'introuvable' : 'JSON invalide') + ') — ce script MODIFIE une configuration existante, il n\'en crée pas une neuve.'); }
  if (!config || typeof config !== 'object' || Array.isArray(config)) echec('le fichier doit contenir un objet JSON.');
  const pose = config.admin !== undefined && config.admin !== null;

  /* ── --verifier : relire ce qui est posé, et comparer une valeur collée — sans rien afficher ── */
  if (VERIFIER) {
    let valide;
    try { valide = adminConfig({ admin: config.admin }, null); } catch (e) { echec('la configuration de l\'administration est REFUSÉE par le service : ' + sansPrefixe(e), false); }
    if (valide === null) echec('rien à vérifier : aucun secret n\'est posé, l\'administration est INERTE (les routes répondent 404). Pour le poser, relancer ce script sans « --verifier ».', false);
    console.log('Un secret est posé et le service l\'accepterait. Empreinte courte : ' + valide.empreinte.toString('hex').slice(0, 8) + '.');
    const colle = await demander('Valeur à comparer (masquée ; vide = seulement relire la configuration) : ', true);
    if (colle) {
      if (!RE_SECRET.test(colle)) echec('la valeur collée n\'est pas 64 caractères hexadécimaux.', false);
      if (!crypto.timingSafeEqual(valide.empreinte, empreinte(colle))) echec('DIFFÉRENT : la valeur collée n\'est pas celle qui est posée (empreinte courte de la valeur collée : ' + courte(colle) + ').', false);
      console.log('✅ identique : la valeur collée est celle qui est posée.');
    }
    fermer();
    return;
  }

  /* ── --retirer : fermer l'administration ── */
  if (RETIRER) {
    if (!pose) echec('aucun secret n\'est posé : l\'administration est déjà INERTE.', false);
    const apres = Object.assign({}, config); delete apres.admin;
    ecrire(config, apres, null);
    console.log('✅ ' + CONFIG_PATH + ' mis à jour (chmod 600) : plus de secret, les routes d\'administration répondent 404. Pour finir :   systemctl restart teamop-msg@<instance>\n');
    fermer();
    return;
  }

  /* ── poser ── */
  console.log('\n══ ADMINISTRATION d\'OP MESSAGES — le secret de la console interne ══\n');
  if (pose) console.log('Un secret existe déjà. Ce script va le remplacer (le relais de la console devra recevoir la nouvelle valeur).\n');
  console.log('Collez les 64 caractères hexadécimaux, FABRIQUÉS AILLEURS que sur ce serveur (sur le Mac : `openssl rand -hex 32 | pbcopy`, rangés dans le gestionnaire de mots de passe).');
  console.log('Ils ne s\'afficheront PAS pendant la frappe — c\'est normal. Vide = en fabriquer un ICI, que personne ne verra (voir l\'en-tête de ce script : cela ferme la porte).\n');
  let secret = await demander('Secret d\'administration (masqué) : ', true);
  let fabrique = false;
  if (!secret) { secret = crypto.randomBytes(32).toString('hex'); fabrique = true; }
  if (!RE_SECRET.test(secret)) echec('Le secret est 64 caractères hexadécimaux (0-9, a-f).');
  const secretMinuscule = secret.toLowerCase();
  /* La MÊME validation que le démarrage du service : ce qui passe ici démarrera là. */
  try { adminConfig({ admin: { secret: secretMinuscule } }, null); } catch (e) { echec(sansPrefixe(e)); }
  ecrire(config, Object.assign({}, config, { admin: { secret: secretMinuscule } }), secretMinuscule);
  console.log('✅ ' + CONFIG_PATH + ' mis à jour (chmod 600). Empreinte courte du secret : ' + courte(secretMinuscule) + '.');
  if (fabrique) console.log('   Ce secret a été fabriqué ICI et n\'a été montré à personne : aucun relais ne le connaît, les routes d\'administration restent fermées de fait. Pour les ouvrir, relancer ce script et coller une valeur que vous gardez.');
  else console.log('   Posez la MÊME valeur côté relais de la console (OP GESTION), puis comparez les empreintes courtes — ou relancez ce script avec --verifier.');
  console.log('   Pour finir :   systemctl restart teamop-msg@<instance>   puis la console OP MESSAGES doit répondre (GET /api/admin/sante par le relais).\n');
  fermer();
})().catch((e) => { console.error('✗ ' + (e && e.message ? e.message : 'erreur') + ' Rien n\'a été modifié.'); process.exit(1); });
