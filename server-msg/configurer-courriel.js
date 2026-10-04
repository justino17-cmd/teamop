#!/usr/bin/env node
/* ══ BRANCHER LE COURRIEL (LES INVITATIONS AUX RÉUNIONS) SUR OP MESSAGES, SANS AFFICHER NI COLLER UN SECRET NULLE PART ══
 *
 * Usage, SUR LE VPS, en root :
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-courriel.js              (poser ou remplacer le relais)
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-courriel.js --verifier   (relire la configuration posée et essayer le relais)
 *   (le fichier de configuration d'une instance : `/etc/opmsg/<instance>.json`, celui que le service lit)
 *
 * ⛔ « ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS » (CLAUDE.md). L'IDENTIFIANT et le MOT DE PASSE du compte de messagerie se SAISISSENT ici, masqués (`saisie.js` : même un retour arrière, une
 * flèche ou un collage ne les réaffichent), et vont de ce clavier au fichier : jamais en argument (`ps` les montre à toute la machine, l'historique du shell les garde), jamais affichés,
 * jamais recopiés dans la conversation. Le script n'imprime que ce qui peut se recoller : l'hôte, le port, le mode de sécurité, l'adresse d'expédition (celle que les destinataires lisent
 * de toute façon), des verdicts. Pour un compte de messagerie ordinaire, c'est un MOT DE PASSE D'APPLICATION (jamais le mot de passe principal de la boîte).
 *
 * ⛔ ET IL ÉPROUVE LE RELAIS AVANT D'ÉCRIRE : une connexion, la sécurité demandée, l'authentification — et RIEN d'autre (aucun courriel ne part, rien n'est compté). Un identifiant faux, un mauvais
 * port, un mode de sécurité qui ne correspond pas (« ssl » sur le port 587) se savent TOUT DE SUITE, avec une phrase lisible — jamais le texte de la réponse du relais, qui peut citer un compte.
 * ⛔ Le fichier n'est réécrit qu'une fois tout validé : temporaire (0600 dès sa création), propriétaire de l'ancien conservé, relu et revalidé par le MÊME code que le démarrage du service
 * (`courrielConfig`), toutes les AUTRES clés vérifiées intactes, puis renommé — jamais à moitié (l'accolade manquante du 17 septembre). Le délai de connexion a une valeur prudente par défaut
 * et n'est pas demandé ; une configuration déjà posée le garde.
 * ⛔ EN PRODUCTION le canal est CHIFFRÉ : « aucune » n'est accepté que vers un relais local (127.0.0.1, localhost) — le script applique la règle de la production, quelle que soit l'instance.
 */
'use strict';
const fs = require('fs');
const { demander, fermer } = require('./saisie');
const { courrielConfig } = require('./config');
const { creerCourriel } = require('./courriel');

const CONFIG_PATH = process.env.OPMSG_CONFIG;
const ARGS = process.argv.slice(2);
const VERIFIER = ARGS.includes('--verifier');

const echec = (m, rienModifie) => { console.error('\n✗ ' + m + (rienModifie === false ? '' : ' Rien n\'a été modifié.')); fermer(); process.exit(1); };
const sansPrefixe = (e) => String(e && e.message ? e.message : e).replace(/^config: /, '');

/* Ce que dit un refus du relais, SANS citer sa réponse (elle peut nommer le compte) : le code de nodemailer — et, pour une erreur de prise (ESOCKET), le nom du refus du système que son message
   porte (nodemailer remplace le code d'origine par le sien) —, traduits en phrase. Le texte lui-même n'est JAMAIS imprimé. */
function diagnostic(e) {
  const c = e && e.code ? String(e.code) : '', m = e && e.message ? String(e.message) : '';
  if (c === 'EAUTH') return 'le relais refuse l\'identifiant ou le mot de passe (ou n\'offre aucune authentification à cet endroit) : pour un compte de messagerie ordinaire, c\'est un mot de passe d\'APPLICATION qu\'il faut, pas le mot de passe principal.';
  if (c === 'ETIMEDOUT') return 'le relais ne répond pas dans le délai (hôte ou port faux, ou pare-feu entre ce serveur et lui).';
  if (c === 'EDNS' || /ENOTFOUND|EAI_AGAIN/.test(m)) return 'le nom du relais ne se résout pas (faute de frappe dans l\'hôte ?).';
  if (/ECONNREFUSED|EHOSTUNREACH|ENETUNREACH/.test(m)) return 'le relais refuse la connexion (hôte ou port faux, ou le relais n\'écoute pas là).';
  if (c === 'ETLS' || c === 'EREQUIRETLS' || /certificate|SSL|TLS|handshake|wrong version|altnames/i.test(m)) return 'la connexion chiffrée n\'a pas pu s\'établir : mauvais mode pour ce port (« ssl » va avec 465, « starttls » avec 587), certificat du relais refusé, ou le relais n\'offre pas le chiffrement demandé.';
  if (c === 'ECONNECTION' || c === 'ESOCKET') return 'la connexion au relais a échoué (hôte ou port faux, ou le relais n\'écoute pas là).';
  return 'le relais a refusé la vérification' + (/^[A-Z_]{3,24}$/.test(c) ? ' (code ' + c + ')' : '') + '.';
}

/* Essaie le relais (une connexion, la sécurité, l'authentification) : rend `null` s'il répond, sinon la phrase qui dit pourquoi. Aucun courriel ne part. */
async function essayer(valide) {
  const courriel = creerCourriel({ config: { courriel: valide } });
  try { await courriel.verifier(); return null; }
  catch (e) { return diagnostic(e); }
  finally { courriel.arreter(); }
}
const dire = (valide) => (valide.hote + ':' + valide.port + ', sécurité « ' + valide.securite + ' », ' + (valide.utilisateur !== null ? 'avec identifiant' : 'sans identifiant') + ', expéditeur ' + valide.de);

(async () => {
  if (!CONFIG_PATH) echec('OPMSG_CONFIG n\'est pas posé (le fichier de configuration de l\'instance, par exemple /etc/opmsg/beta.json).');
  for (const a of ARGS) if (a !== '--verifier') echec('option inconnue (« --verifier » est la seule).');
  let config;
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { echec(CONFIG_PATH + ' illisible (' + (e && e.code === 'ENOENT' ? 'introuvable' : 'JSON invalide') + ') — ce script MODIFIE une configuration existante, il n\'en crée pas une neuve.'); }
  if (!config || typeof config !== 'object' || Array.isArray(config)) echec('le fichier doit contenir un objet JSON.');
  const avant = config.courriel && typeof config.courriel === 'object' && !Array.isArray(config.courriel) ? config.courriel : {};

  /* ── --verifier : relire ce qui est posé, et essayer le relais ── */
  if (VERIFIER) {
    let valide;
    try { valide = courrielConfig({ courriel: config.courriel }, 'prod'); } catch (e) { echec('la configuration du courriel est REFUSÉE par le service : ' + sansPrefixe(e), false); }
    if (valide.mode !== 'smtp') echec('rien à vérifier : aucun relais n\'est configuré, l\'envoi par courriel est INERTE (la page le dit). Pour le poser, relancer ce script sans « --verifier ».', false);
    console.log('Relais configuré : ' + dire(valide) + '.');
    const pourquoi = await essayer(valide);
    if (pourquoi) echec('essai du relais : ' + pourquoi, false);
    console.log('✅ le relais répond et accepte l\'identifiant — aucun courriel n\'a été envoyé.');
    fermer();
    return;
  }

  console.log('\n══ COURRIEL d\'OP MESSAGES — les invitations aux réunions ══\n');
  if (avant.hote) console.log('Un relais existe déjà (' + avant.hote + '). Ce script va le remplacer.\n');
  console.log('Il faut le relais SMTP de la boîte qui enverra les invitations (voir design/opmessages/INSTALLER-LE-SERVEUR.md, geste « Courriel »).');
  console.log('L\'identifiant et le mot de passe ne s\'afficheront PAS pendant la frappe — c\'est normal. Un identifiant vide = un relais sans authentification (local).\n');

  const hote = await demander('Hôte du relais (smtp.exemple.fr)         : ', false);
  const securite = (await demander('Sécurité (starttls, ssl ou aucune)       : ', false)) || 'starttls';
  const port = await demander('Port (vide : celui de la sécurité)       : ', false);
  const utilisateur = await demander('Identifiant du compte (masqué, vide = aucun) : ', true);
  const motDePasse = utilisateur ? await demander('Mot de passe d\'APPLICATION (masqué)         : ', true) : '';
  const de = await demander('Adresse d\'expédition (nom@domaine)       : ', false);
  const nom = await demander('Nom affiché (vide : OP MESSAGES)          : ', false);

  if (!hote || !de) echec('Une valeur manque (l\'hôte et l\'adresse d\'expédition sont obligatoires).');
  if (utilisateur && !motDePasse) echec('Un identifiant sans mot de passe ne ferait rien.');
  const brut = { hote, securite, de };
  if (port) { if (!/^\d{1,5}$/.test(port)) echec('Le port est un nombre entre 1 et 65535.'); brut.port = parseInt(port, 10); }
  if (utilisateur) { brut.utilisateur = utilisateur; brut.mot_de_passe = motDePasse; }
  if (nom) brut.nom = nom;
  if (avant.timeoutMs !== undefined) brut.timeoutMs = avant.timeoutMs;
  /* La MÊME validation que le démarrage du service : ce qui passe ici démarrera là. */
  let valide;
  try { valide = courrielConfig({ courriel: brut }, 'prod'); } catch (e) { echec(sansPrefixe(e)); }

  /* ── L'épreuve : une connexion, la sécurité, l'authentification — aucun courriel ── */
  console.log('\n── Essai du relais (connexion et authentification, aucun courriel envoyé) ──');
  const pourquoi = await essayer(valide);
  if (pourquoi) echec('essai du relais : ' + pourquoi);
  console.log('✅ ' + dire(valide) + ' : le relais répond' + (valide.utilisateur !== null ? ' et accepte l\'identifiant' : '') + '.');

  const apres = Object.assign({}, config, { courriel: brut });
  const tmp = CONFIG_PATH + '.tmp-' + process.pid;
  /* ⛔ Créé en 0600 DÈS L'ÉCRITURE (`mode`, flag `wx`) : écrit d'abord avec le umask par défaut (0644, dans un dossier en 0755) puis `chmod`, le fichier portait le mot de passe lisible par tous les
     comptes de la machine pendant l'intervalle. */
  fs.writeFileSync(tmp, JSON.stringify(apres, null, 2), { mode: 0o600, flag: 'wx' });
  fs.chmodSync(tmp, 0o600);
  /* ⛔ LE PROPRIÉTAIRE SUIT LE FICHIER : lancé en root, le renommage donnerait un fichier root:root en 0600, que le service (utilisateur `opmsg`) ne pourrait plus lire — il refuserait de démarrer. */
  try { const st = fs.statSync(CONFIG_PATH); fs.chownSync(tmp, st.uid, st.gid); } catch (e) { /* hors root, le propriétaire est déjà le bon */ }
  /* Relu, revalidé et comparé AVANT de remplacer : le service accepterait ce bloc, et toutes les AUTRES clés du fichier sont intactes. */
  try {
    const relu = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    courrielConfig({ courriel: relu.courriel }, 'prod');
    for (const k of new Set(Object.keys(config).concat(Object.keys(relu)))) if (k !== 'courriel' && JSON.stringify(relu[k]) !== JSON.stringify(config[k])) throw new Error('clé ' + k + ' changée');
  } catch (err) { try { fs.unlinkSync(tmp); } catch (e) { /* déjà parti */ } echec('le fichier écrit ne se relit pas, ou une autre clé aurait changé, ou le service le refuserait au démarrage.'); }
  fs.renameSync(tmp, CONFIG_PATH);
  fs.chmodSync(CONFIG_PATH, 0o600);
  console.log('✅ ' + CONFIG_PATH + ' mis à jour (chmod 600). Pour finir :   systemctl restart teamop-msg@<instance>');
  console.log('   puis `curl -s https://<domaine>/api/config` : « courriel.ouvert » doit valoir true — et envoyer une invitation à ta propre adresse depuis une réunion.\n');
  fermer();
})().catch((e) => { console.error('✗ ' + (e && e.message ? e.message : 'erreur') + ' Rien n\'a été modifié.'); process.exit(1); });
