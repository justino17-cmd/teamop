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
const { cleDepuis, monterSauvegarde } = require('./sauvegarde');

const CONFIG_PATH = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';

/* La saisie masquée : rien ne s'affiche, rien ne reste dans l'historique du terminal. On
   n'utilise pas d'argument de ligne de commande pour un secret — `ps` les montre à tout le
   monde sur la machine, et l'historique du shell les garde.

   ⛔ ET ELLE NE MARCHE QU'AVEC UN VRAI TERMINAL, ce qui a failli rendre ce programme
   invérifiable. Premier jet : `terminal: true` en dur. Lancé avec une entrée redirigée — la
   seule façon de l'éprouver de bout en bout avant de le confier à quelqu'un — il s'arrêtait
   à la deuxième question, sans un mot. On aurait donc découvert ses défauts EN DIRECT sur le
   VPS, ce qui est précisément ce que ce projet refuse de faire. `terminal` suit maintenant
   `isTTY` : au clavier, le masquage ; en entrée redirigée, une lecture simple, et on le DIT
   pour que personne ne croie ses secrets masqués alors qu'ils viennent d'un fichier. */
const AU_CLAVIER = !!process.stdin.isTTY;

/* ⛔ DEUX CHEMINS DE LECTURE, ET IL A FALLU TROIS ESSAIS POUR L'ADMETTRE. Au clavier, readline
   avec masquage. En entrée redirigée — la seule façon d'ÉPROUVER ce programme avant de le
   confier à quelqu'un — `rl.question()` ne répond QU'UNE FOIS : mesuré sur une reproduction
   minimale, la première question reçoit sa réponse, la deuxième ne rend jamais la main, et le
   programme s'arrête sans un mot. Deux corrections successives (le `terminal:true` en dur, puis
   une interface par question) n'ont rien changé parce qu'aucune ne visait la vraie cause.
   La troisième la vise : quand l'entrée n'est pas un clavier, on la lit ENTIÈREMENT d'un bloc
   et on distribue les lignes. Plus de rappel, plus de flux, rien à réarmer.
   ⚠️ Le chemin redirigé sert à l'épreuve, pas à l'exploitation : sur le VPS c'est un vrai
   clavier, donc le masquage, et le programme le dit quand ce n'est pas le cas. */
let rl = null, lignes = null;
if (AU_CLAVIER) rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

function lireToutStdin() {
  return new Promise(resolve => {
    let d = ''; process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => { d += c; });
    process.stdin.on('end', () => resolve(d.split('\n')));
    /* Entrée fermée d'emblée (aucune redirection, pas de clavier) : on ne reste pas suspendu. */
    if (process.stdin.readableEnded) resolve(d.split('\n'));
  });
}

async function demander(question, masque) {
  if (!AU_CLAVIER) {
    if (lignes === null) lignes = await lireToutStdin();
    const r = lignes.length ? lignes.shift() : '';
    process.stdout.write(question + String(r).trim() + '\n');
    return String(r).trim();
  }
  return new Promise(resolve => {
    if (masque) {
      const ecrire = rl._writeToOutput;
      rl._writeToOutput = function (s) { if (s.includes(question)) ecrire.call(rl, s); else ecrire.call(rl, ''); };
      rl.question(question, r => { rl._writeToOutput = ecrire; process.stdout.write('\n'); resolve(String(r).trim()); });
    } else {
      rl.question(question, r => resolve(String(r).trim()));
    }
  });
}
const fermer = () => { if (rl) rl.close(); };

(async () => {
  let config = {};
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { console.error('✗ ' + CONFIG_PATH + ' illisible : ' + e.message + '\n  (ce script MODIFIE une configuration existante, il n\'en crée pas une neuve)'); process.exit(1); }

  const avant = config.sauvegarde || {};
  console.log('\n══ Sauvegarde hors site de TeamOP ══\n');
  if (avant.bucket) console.log('Une configuration existe déjà (coffre « ' + avant.bucket + ' »). Ce script va la remplacer.\n');
  console.log('Il faut quatre valeurs, prises dans la console de l\'hébergeur d\'objets.');
  if (AU_CLAVIER) console.log('Les deux clés ne s\'afficheront PAS pendant la frappe — c\'est normal.\n');
  else console.log('⚠ Entrée redirigée : les valeurs ne sont PAS masquées. Au clavier, elles le sont.\n');

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
  const p = await client.poserCle(cleEssai, temoin);
  if (!p.ok) {
    console.error('✗ DÉPÔT REFUSÉ (HTTP ' + p.statut + '). Rien n\'a été écrit dans config.json.');
    console.error('  403 : clés fausses, ou pas le droit d\'écrire dans ce coffre.');
    console.error('  404 : le coffre n\'existe pas sous ce nom, ou la région ne correspond pas.');
    console.error('  Un nom d\'hôte introuvable : vérifier l\'endpoint (il change selon la région).');
    process.exit(1);
  }
  const l = await client.lireCle(cleEssai);
  /* ⛔ ON RELIT ET ON COMPARE. Un coffre en écriture seule accepte le dépôt et rend 403 à la
     lecture : la sauvegarde partirait tous les jours et ne serait jamais restaurable. C'est
     précisément la panne muette que ce projet ne veut plus jamais avoir. */
  if (!l.ok || !l.corps.equals(temoin)) {
    console.error('✗ RELECTURE IMPOSSIBLE' + (l.statut ? ' (HTTP ' + l.statut + ')' : '') + ' — le dépôt a marché mais pas la lecture.');
    console.error('  Les droits doivent couvrir la LECTURE autant que l\'écriture, sinon la sauvegarde ne sera jamais restaurable.');
    console.error('  Rien n\'a été écrit dans config.json.');
    await client.effacerCle(cleEssai);
    process.exit(1);
  }
  const e = await client.effacerCle(cleEssai);
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

  /* ⛔ LA PREMIÈRE SAUVEGARDE SE LANCE MAINTENANT, PAS À 3 H DU MATIN. Sans ça, on configure
     le soir et on apprend le lendemain — ou pas — si la chaîne entière fonctionne. Le pire
     moment pour découvrir qu'une sauvegarde ne part pas est celui où on en a besoin ; le
     meilleur est celui où on vient de la brancher et où on a encore le terminal ouvert. Elle
     passe par le module RÉEL, le même que la minuterie : ce qui marche ici marchera la nuit. */
  const rep = (await demander('\nLancer une première sauvegarde maintenant ? [O/n] ', false)).toLowerCase();
  if (rep === 'n' || rep === 'non') {
    console.log('\nD\'accord. Elle partira d\'elle-même cette nuit. Pour finir :');
    console.log('   systemctl restart teamop-api');
    console.log('   node /opt/teamop/repo/server/restaurer.js essai   # une fois la première faite\n');
    fermer(); return;
  }

  console.log('\n── Première sauvegarde (fabrication, dépôt, RELECTURE) ──');
  console.log('   Sur une grosse installation, ça peut prendre une minute ou deux.');
  const DATA_DIR = process.env.TEAMOP_DATA || '/opt/teamop/data';
  const mod = monterSauvegarde(null, { config, DATA_DIR, CONFIG_PATH });
  if (!mod.actif) { console.error('✗ le module se monte inerte alors que la configuration vient d\'être écrite — à signaler, ce ne devrait pas arriver.'); process.exit(1); }
  const r = await mod.lancer('configuration');
  if (!r.ok) {
    /* On ne maquille pas un échec en « c'est configuré ». La configuration, elle, est bien
       écrite : c'est la sauvegarde qui n'est pas passée, et le motif dit laquelle des étapes. */
    console.error('\n✗ LA PREMIÈRE SAUVEGARDE A ÉCHOUÉ — motif : ' + r.motif);
    console.error('  La configuration est écrite ; c\'est la sauvegarde qui n\'est pas passée.');
    console.error('  « depot-… » : le coffre a refusé l\'envoi (droits d\'écriture, ou coffre plein).');
    console.error('  « relecture-… » : envoi accepté, lecture refusée — les droits doivent couvrir LES DEUX,');
    console.error('  sinon la sauvegarde ne sera jamais restaurable.');
    console.error('  « empreinte-differente » / « taille-differente » : ce qui est relu n\'est pas ce qui a été envoyé.');
    process.exit(1);
  }
  console.log('✅ sauvegarde déposée ET RELUE : ' + Math.round((r.octets || 0) / 1024) + ' Kio, ' + (r.entrees || 0) + ' entrées, en ' + Math.round((r.ms || 0) / 1000) + ' s.');

  console.log('\nPour finir :');
  console.log('   systemctl restart teamop-api');
  console.log('   curl -s localhost:8080/health | grep -o \'"sauvegarde":{[^}]*}\'');
  console.log('\n⛔ ET SURTOUT, LE CONTRÔLE QUI COMPTE VRAIMENT — rouvrir ce qu\'on vient d\'écrire :');
  console.log('   node /opt/teamop/repo/server/restaurer.js essai');
  console.log('   (à refaire une fois par trimestre : une sauvegarde qu\'on n\'a jamais su rouvrir');
  console.log('    est une croyance, pas une sauvegarde)\n');
})().then(fermer, e => { console.error('✗ ' + e.message); fermer(); process.exit(1); });
