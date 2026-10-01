#!/usr/bin/env node
/* ══ BRANCHER LES SMS (OVHcloud) SUR OP MESSAGES, SANS AFFICHER NI COLLER UN SECRET NULLE PART ══
 *
 * Usage, SUR LE VPS :   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-sms.js
 *   (le fichier de configuration d'une instance : `/etc/opmsg/<instance>.json`, celui que le service lit)
 *
 * ⛔ « ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS » (CLAUDE.md). Les trois secrets d'OVH — la clé d'application, le secret
 * d'application et la clé de consommateur — se SAISISSENT ici, masqués, et vont de ce clavier au fichier : jamais en argument
 * (`ps` les montre à toute la machine, l'historique du shell les garde), jamais affichés, jamais recopiés dans la conversation.
 * Le script n'imprime que des valeurs qui ne sont pas des secrets (nom du service, expéditeur, nombre de crédits restants).
 *
 * ⛔ ET IL ÉPROUVE LES CLÉS AVANT D'ÉCRIRE : il lit l'heure d'OVH (`/auth/time`), puis appelle `GET /sms/{service}` AVEC la
 * signature — des clés fausses, ou un droit manquant, se savent TOUT DE SUITE, avec un message lisible, pas à trois heures du
 * matin dans le premier SMS d'un client. Il n'envoie AUCUN SMS (rien n'est facturé).
 * ⛔ Le fichier n'est réécrit qu'une fois tout validé : temporaire, relecture, renommage — jamais à moitié (l'accolade manquante
 * du 17 septembre). Les budgets en euros ne sont PAS demandés : ils ont des valeurs prudentes par défaut
 * (`sms.budgetJour` 20 €, `sms.budgetPaysJour` 3 €…) et se règlent à la main, en connaissance de cause.
 */
'use strict';
const fs = require('fs');
const { signer, URL_DEFAUT } = require('./sms-ovh');
const { lireConfigSms } = require('./sms-garde');

const CONFIG_PATH = process.env.OPMSG_CONFIG;
const AU_CLAVIER = !!process.stdin.isTTY;

let lignes = null;
function lireToutStdin() {
  return new Promise(resolve => {
    let d = ''; process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => { d += c; });
    process.stdin.on('end', () => resolve(d.split('\n')));
    if (process.stdin.readableEnded) resolve(d.split('\n'));
  });
}
/* Au clavier : saisie masquée. En entrée redirigée (le banc, seule façon d'ÉPROUVER ce programme avant de le confier) : lecture d'un
   bloc, et le programme le DIT — jamais de masque prétendu. Une valeur masquée n'est JAMAIS réécrite à l'écran, même redirigée. */
async function demander(question, masque) {
  if (!AU_CLAVIER) {
    if (lignes === null) lignes = await lireToutStdin();
    const r = String(lignes.length ? lignes.shift() : '').trim();
    process.stdout.write(question + (masque ? '' : r) + '\n');
    return r;
  }
  return lireAuClavier(question, masque);
}
/* ⛔ AU CLAVIER : LECTURE EN MODE BRUT, CARACTÈRE PAR CARACTÈRE, SANS `readline`. La version d'avant masquait la frappe en neutralisant
   `rl._writeToOutput` — mais `readline` REDESSINE « invite + ligne » en entier à chaque retour arrière, flèche gauche ou Ctrl-A : les secrets
   saisis jusque-là s'affichaient EN CLAIR (rejoué sous pty : « Secret d'application (masqué) : secret-banc-… »), et Justin recolle toutes
   ses sorties dans la conversation. Ici RIEN n'est jamais réécrit : ce qui est masqué ne reçoit aucun écho, ni à la frappe, ni à la
   correction ; une valeur visible (nom du service) reçoit l'écho des caractères tapés et de l'effacement, et rien d'autre. Les séquences
   d'échappement (flèches, Début, Fin, Suppr.) sont lues et IGNORÉES ; Ctrl-C abandonne ; Ctrl-U efface la ligne ; un collage de plusieurs
   caractères est traité caractère par caractère. */
function lireAuClavier(question, masque) {
  return new Promise((resolve) => {
    const entree = process.stdin;
    process.stdout.write(question);
    entree.setRawMode(true); entree.resume(); entree.setEncoding('utf8');
    let tampon = '', echappement = 0;   // echappement : 0 aucun, 1 après ESC, 2 dans « ESC [ … » (jusqu'à l'octet final)
    const effacerEcho = (n) => { if (!masque && n > 0) process.stdout.write('\b \b'.repeat(n)); };
    const fini = () => { entree.removeListener('data', surDonnees); entree.setRawMode(false); entree.pause(); process.stdout.write('\n'); resolve(tampon.trim()); };
    function surDonnees(morceau) {
      for (const ch of morceau) {
        const c = ch.codePointAt(0);
        if (echappement === 1) { echappement = ch === '[' || ch === 'O' ? 2 : 0; continue; }
        if (echappement === 2) { if (c >= 0x40 && c <= 0x7e) echappement = 0; continue; }
        if (ch === '\x1b') { echappement = 1; continue; }
        if (ch === '\r' || ch === '\n') { fini(); return; }
        if (ch === '\x03') { entree.setRawMode(false); process.stdout.write('\n✗ Abandon. Rien n\'a été modifié.\n'); process.exit(130); }
        if (ch === '\x7f' || ch === '\b') { if (tampon.length) { tampon = tampon.slice(0, -1); effacerEcho(1); } continue; }
        if (ch === '\x15') { effacerEcho(tampon.length); tampon = ''; continue; }
        if (c < 0x20 || (c >= 0x7f && c < 0xa0)) continue;
        tampon += ch;
        if (!masque) process.stdout.write(ch);
      }
    }
    entree.on('data', surDonnees);
  });
}
const fermer = () => { if (AU_CLAVIER) { try { process.stdin.setRawMode(false); } catch (e) { /* déjà rendu */ } process.stdin.pause(); } };
const echec = (m) => { console.error('\n✗ ' + m + ' Rien n\'a été modifié.'); fermer(); process.exit(1); };

(async () => {
  if (!CONFIG_PATH) echec('OPMSG_CONFIG n\'est pas posé (le fichier de configuration de l\'instance, par exemple /etc/opmsg/beta.json).');
  let config;
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { echec(CONFIG_PATH + ' illisible (' + (e && e.code === 'ENOENT' ? 'introuvable' : 'JSON invalide') + ') — ce script MODIFIE une configuration existante, il n\'en crée pas une neuve.'); }
  if (!config || typeof config !== 'object' || Array.isArray(config)) echec('le fichier doit contenir un objet JSON.');
  const sms = config.sms && typeof config.sms === 'object' && !Array.isArray(config.sms) ? config.sms : {};
  const avant = sms.ovh && typeof sms.ovh === 'object' ? sms.ovh : {};

  console.log('\n══ SMS d\'OP MESSAGES — OVHcloud ══\n');
  if (avant.serviceName) console.log('Une configuration existe déjà (service « ' + avant.serviceName + ' »). Ce script va la remplacer.\n');
  console.log('Il faut cinq valeurs, prises dans la console OVHcloud (voir design/opmessages/INSTALLER-LE-SERVEUR.md, geste « SMS »).');
  if (AU_CLAVIER) console.log('Les trois clés ne s\'afficheront PAS pendant la frappe — c\'est normal.\n');
  else console.log('⚠ Entrée redirigée : les trois clés ne sont pas affichées, mais elles viennent d\'un fichier. Au clavier, elles sont masquées.\n');

  const serviceName = await demander('Nom du service SMS (sms-xx123456-1)  : ', false);
  const expediteur = await demander('Expéditeur (1 à 11 lettres/chiffres) : ', false);
  const appKey = await demander('Clé d\'application (masquée)           : ', true);
  const appSecret = await demander('Secret d\'application (masqué)        : ', true);
  const consumerKey = await demander('Clé de consommateur (masquée)        : ', true);

  if (!serviceName || !expediteur || !appKey || !appSecret || !consumerKey) echec('Une valeur manque.');
  const ovh = { appKey, appSecret, consumerKey, serviceName, expediteur };
  /* La MÊME validation que le démarrage du service : ce qui passe ici démarrera là. */
  let valide;
  try { valide = lireConfigSms({ ovh }, 'prod'); } catch (e) { echec(String(e.message).replace(/^config: /, '')); }
  if (!valide.ovh) echec('identifiants incomplets.');
  const base = process.env.OPMSG_OVH_URL ? process.env.OPMSG_OVH_URL.replace(/\/+$/, '') : URL_DEFAUT;
  if (process.env.OPMSG_OVH_URL) ovh.urlBase = base;   // les bancs seulement : la production refuse toute base autre qu'OVH au démarrage

  /* ── L'épreuve : l'heure d'OVH, puis un appel SIGNÉ qui ne coûte rien ── */
  console.log('\n── Essai des clés (lecture du service, aucun SMS envoyé) ──');
  let ts;
  try {
    const r = await fetch(base + '/auth/time', { signal: AbortSignal.timeout(10000), redirect: 'error' });
    ts = parseInt(String(await r.text()).trim(), 10);
    if (!r.ok || !Number.isFinite(ts)) throw new Error('heure illisible');
  } catch (e) { echec('OVH ne répond pas (réseau, ou adresse d\'API inaccessible depuis ce serveur).'); }
  const url = base + '/sms/' + encodeURIComponent(serviceName);
  let r;
  try {
    r = await fetch(url, {
      headers: { 'X-Ovh-Application': appKey, 'X-Ovh-Consumer': consumerKey, 'X-Ovh-Timestamp': String(ts),
        'X-Ovh-Signature': signer({ appSecret, consumerKey, methode: 'GET', url, corps: '', horodatage: ts }) },
      signal: AbortSignal.timeout(10000), redirect: 'error',
    });
  } catch (e) { echec('l\'appel à OVH a échoué en route.'); }
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  if (r.status === 403) echec('OVH refuse (403) : la clé de consommateur n\'a pas le droit de lire ce service, ou n\'a pas été validée. Créer la clé avec les droits listés dans INSTALLER-LE-SERVEUR.md.');
  if (r.status === 404) echec('OVH ne connaît pas le service « ' + serviceName + ' » (404) : le nom se lit dans la console, sous « SMS ».');
  if (r.status === 401 || r.status === 400) echec('OVH refuse la signature (' + r.status + ') : clé d\'application, secret ou clé de consommateur fausse (ou recopiée avec un espace).');
  if (!r.ok) echec('OVH répond ' + r.status + '.');
  const credits = j && typeof j.creditsLeft === 'number' ? j.creditsLeft : null;
  console.log('✅ clés valides, service joignable' + (credits !== null ? ' — ' + credits + ' crédit(s) restant(s)' : '') + '.');
  if (credits !== null && credits < 100) console.log('⚠ moins de 100 crédits : à recharger avant d\'ouvrir (voir le calcul du coût dans INSTALLER-LE-SERVEUR.md).');

  config.sms = Object.assign({}, sms, { ovh });
  const tmp = CONFIG_PATH + '.tmp-' + process.pid;
  /* ⛔ Créé en 0600 DÈS L'ÉCRITURE (`mode`, flag `wx`) : écrit d'abord avec le umask par défaut (0644, dans un dossier en 0755) puis `chmod`,
     le fichier portait les trois secrets lisibles par tous les comptes de la machine pendant l'intervalle. */
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600, flag: 'wx' });
  fs.chmodSync(tmp, 0o600);
  /* ⛔ LE PROPRIÉTAIRE SUIT LE FICHIER : lancé en root, le renommage donnerait un fichier root:root en 0600, que le service
     (utilisateur `opmsg`) ne pourrait plus lire — il refuserait de démarrer. On recopie le propriétaire de l'ancien. */
  try { const st = fs.statSync(CONFIG_PATH); fs.chownSync(tmp, st.uid, st.gid); } catch (e) { /* hors root, le propriétaire est déjà le bon */ }
  /* Relu ET revalidé AVANT de remplacer : on ne met pas en place une configuration que le service refuserait au démarrage. */
  try { const relu = JSON.parse(fs.readFileSync(tmp, 'utf8')); lireConfigSms(relu.sms, process.env.OPMSG_OVH_URL ? 'beta' : 'prod'); }
  catch (err) { try { fs.unlinkSync(tmp); } catch (e) {} echec('le fichier écrit ne se relit pas, ou le service le refuserait au démarrage.'); }
  fs.renameSync(tmp, CONFIG_PATH);
  fs.chmodSync(CONFIG_PATH, 0o600);
  console.log('✅ ' + CONFIG_PATH + ' mis à jour (chmod 600). Pour finir :   systemctl restart teamop-msg@<instance>');
  console.log('   puis `curl -s https://<domaine>/health` : « sms.mode » doit valoir « ovh ».\n');
  fermer();
})().catch(e => { console.error('✗ ' + (e && e.message ? e.message : 'erreur') + ' Rien n\'a été modifié.'); process.exit(1); });
