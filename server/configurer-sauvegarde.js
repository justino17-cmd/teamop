#!/usr/bin/env node
/* ══ BRANCHER LA SAUVEGARDE HORS SITE, SANS COLLER UN SECRET NULLE PART ══════════════════════
 *
 * Usage, SUR LE VPS :   node /opt/teamop/repo/server/configurer-sauvegarde.js
 *
 * ⛔ POURQUOI CE SCRIPT EXISTE PLUTÔT QU'UN `nano config.json`. Le 17 septembre 2026, deux
 * choses se sont passées le même jour et ce fichier répond aux deux :
 *   · une clé d'hébergeur de 94 caractères est passée EN CLAIR dans une conversation, et a dû
 *     être considérée comme brûlée — un secret se saisit, il ne se colle pas ailleurs ;
 *   · une édition de `config.json` à la main a été interrompue et a laissé le fichier SANS SON
 *     ACCOLADE FERMANTE : le serveur a refusé de démarrer. Ici, le fichier n'est réécrit qu'une
 *     fois tout validé, par fichier temporaire puis renommage — jamais à moitié.
 *
 * ⛔ ET IL ÉPROUVE LE COFFRE AVANT D'ÉCRIRE QUOI QUE CE SOIT : il dépose un petit objet, le
 * relit, le compare, l'efface. Des identifiants faux sont connus TOUT DE SUITE, avec un message
 * lisible — pas à trois heures du matin, dans un journal que personne ne lit.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), readline = require('readline');
const s3mod = require('./s3');
const { cleDepuis } = require('./sauvegarde');

const CONFIG_PATH = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';

/* La saisie masquée : rien ne s'affiche, rien ne reste dans l'historique du terminal. On
   n'utilise pas d'argument de ligne de commande pour un secret — `ps` les montre à tout le
   monde sur la machine, et l'historique du shell les garde. */
function demander(question, masque) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (masque) {
      const ecrire = rl._writeToOutput;
      rl._writeToOutput = function (s) { if (s.includes(question)) ecrire.call(rl, s); else ecrire.call(rl, ''); };
      rl.question(question, r => { rl._writeToOutput = ecrire; process.stdout.write('\n'); rl.close(); resolve(String(r).trim()); });
    } else {
      rl.question(question, r => { rl.close(); resolve(String(r).trim()); });
    }
  });
}

(async () => {
  let config = {};
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { console.error('✗ ' + CONFIG_PATH + ' illisible : ' + e.message + '\n  (ce script MODIFIE une configuration existante, il n\'en crée pas une neuve)'); process.exit(1); }

  const avant = config.sauvegarde || {};
  console.log('\n══ Sauvegarde hors site de TeamOP ══\n');
  if (avant.bucket) console.log('Une configuration existe déjà (coffre « ' + avant.bucket + ' »). Ce script va la remplacer.\n');
  console.log('Il faut quatre valeurs, prises dans la console de l\'hébergeur d\'objets.');
  console.log('Les deux clés ne s\'afficheront PAS pendant la frappe — c\'est normal.\n');

  const endpoint = await demander('Endpoint (ex. https://s3.eu-central-4.ionoscloud.com) : ', false);
  const bucket = await demander('Nom du coffre (bucket)                              : ', false);
  const region = (await demander('Région [eu-central-4]                               : ', false)) || 'eu-central-4';
  const accessKey = await demander('Access Key (masquée)                                : ', true);
  const secretKey = await demander('Secret Key (masquée)                                : ', true);

  if (!endpoint || !bucket || !accessKey || !secretKey) { console.error('\n✗ Une valeur manque. Rien n\'a été modifié.'); process.exit(1); }
  if (!/^https?:\/\//.test(endpoint)) { console.error('\n✗ L\'endpoint doit commencer par https://. Rien n\'a été modifié.'); process.exit(1); }

  const conf = Object.assign({ prefixe: 'teamop/', garder: 30, heureUTC: 3 }, avant, { endpoint, bucket, region, accessKey, secretKey });

  /* La clé de chiffrement : gardée si elle existe déjà (la changer rendrait TOUTES les archives
     précédentes illisibles — c'est la même règle que le sel de synchronisation de l'application,
     et elle se paie aussi cher). Générée une seule fois sinon. */
  const neuve = !cleDepuis(conf.cle);
  if (neuve) conf.cle = crypto.randomBytes(32).toString('hex');

  console.log('\n── Essai du coffre (dépôt, relecture, effacement) ──');
  const client = s3mod.client(conf);
  const temoin = Buffer.from('teamop-essai-' + Date.now());
  const cleEssai = (conf.prefixe || '') + '.essai-configuration';
  const p = await client.poser('', cleEssai, temoin);
  if (!p.ok) {
    console.error('✗ DÉPÔT REFUSÉ (HTTP ' + p.statut + '). Rien n\'a été écrit dans config.json.');
    console.error('  403 : clés fausses, ou pas le droit d\'écrire dans ce coffre.');
    console.error('  404 : le coffre n\'existe pas sous ce nom, ou la région ne correspond pas.');
    console.error('  Un nom d\'hôte introuvable : vérifier l\'endpoint (il change selon la région).');
    process.exit(1);
  }
  const l = await client.lire('', cleEssai);
  /* ⛔ ON RELIT ET ON COMPARE. Un coffre en écriture seule accepte le dépôt et rend 403 à la
     lecture : la sauvegarde partirait tous les jours et ne serait jamais restaurable. C'est
     précisément la panne muette que ce projet ne veut plus jamais avoir. */
  if (!l.ok || !l.corps.equals(temoin)) {
    console.error('✗ RELECTURE IMPOSSIBLE' + (l.statut ? ' (HTTP ' + l.statut + ')' : '') + ' — le dépôt a marché mais pas la lecture.');
    console.error('  Les droits doivent couvrir la LECTURE autant que l\'écriture, sinon la sauvegarde ne sera jamais restaurable.');
    console.error('  Rien n\'a été écrit dans config.json.');
    await client.effacer('', cleEssai);
    process.exit(1);
  }
  const e = await client.effacer('', cleEssai);
  if (!e.ok) console.log('⚠ l\'objet d\'essai n\'a pas pu être effacé (droit de suppression manquant ?) — la rétention ne marchera pas non plus.');
  console.log('✅ coffre joignable : dépôt, relecture identique, effacement.');

  config.sauvegarde = conf;
  const tmp = CONFIG_PATH + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2));
  fs.chmodSync(tmp, 0o600);
  /* Relu AVANT de remplacer : on ne met pas en place une configuration qu'on n'a pas su
     reparser. C'est la panne du 17 septembre (accolade manquante) rendue impossible. */
  try { JSON.parse(fs.readFileSync(tmp, 'utf8')); }
  catch (err) { fs.unlinkSync(tmp); console.error('✗ le fichier écrit ne se relit pas — rien n\'a été remplacé.'); process.exit(1); }
  fs.renameSync(tmp, CONFIG_PATH);
  fs.chmodSync(CONFIG_PATH, 0o600);
  console.log('✅ ' + CONFIG_PATH + ' mis à jour (chmod 600).');

  if (neuve) {
    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ⛔ LA CLÉ DE CHIFFREMENT DES SAUVEGARDES — À RECOPIER MAINTENANT            ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n   ' + conf.cle + '\n');
    console.log('   Range-la dans ton gestionnaire de mots de passe, PAS sur ce serveur.');
    console.log('   Elle vit aussi dans config.json — donc DANS les archives. Le jour où ce VPS');
    console.log('   est perdu, config.json est perdu avec lui : sans cette copie, les sauvegardes');
    console.log('   ne sont plus que du bruit, définitivement. C\'est le seul moment où elle');
    console.log('   s\'affiche.\n');
  } else {
    console.log('\n   (clé de chiffrement existante conservée — la changer rendrait toutes les');
    console.log('    archives déjà déposées illisibles)');
  }

  console.log('Pour finir :');
  console.log('   systemctl restart teamop-api');
  console.log('   curl -s localhost:8080/health | grep -o \'"sauvegarde":{[^}]*}\'');
  console.log('   # puis, une fois la première sauvegarde faite :');
  console.log('   node /opt/teamop/repo/server/restaurer.js essai\n');
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
