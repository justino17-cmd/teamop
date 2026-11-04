#!/usr/bin/env node
/* ══ POSER LES IDENTIFIANTS OAuth (Microsoft, Google) SANS COLLER UN SECRET NULLE PART ════════════════════
 *
 * Usage, SUR LE VPS :   node /opt/teamop/repo/server/configurer-oauth.js microsoft
 *                       node /opt/teamop/repo/server/configurer-oauth.js google
 * puis :                systemctl restart teamop-api
 *
 * Même règle que `configurer-sauvegarde.js` : le secret client se SAISIT au clavier, masqué — jamais en argument (`ps` et
 * l'historique du shell le montreraient), jamais dans une conversation, jamais dans le dépôt. Le fichier de configuration
 * n'est réécrit qu'une fois tout validé, par temporaire puis renommage (chmod 600) : jamais à moitié.
 * Le script n'affiche JAMAIS le secret, ni avant ni après : seulement « posé » et sa longueur.
 */
'use strict';
const fs = require('fs'), readline = require('readline');
const CONFIG_PATH = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';
const F = String(process.argv[2] || '').toLowerCase();
if (!['microsoft', 'google'].includes(F)) { console.error('Usage : node configurer-oauth.js microsoft|google'); process.exit(1); }
const AU_CLAVIER = !!process.stdin.isTTY;
let rl = null, lignes = null;
if (AU_CLAVIER) rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
const lireToutStdin = () => new Promise(r => { let d = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', c => d += c); process.stdin.on('end', () => r(d.split('\n'))); if (process.stdin.readableEnded) r(d.split('\n')); });
async function demander(question, masque) {
  if (!AU_CLAVIER) { if (lignes === null) lignes = await lireToutStdin(); const r = String(lignes.length ? lignes.shift() : '').trim(); process.stdout.write(question + (masque ? '(masqué)' : r) + '\n'); return r; }
  return new Promise(resolve => {
    if (masque) { const ecrire = rl._writeToOutput; rl._writeToOutput = function (s) { if (s.includes(question)) ecrire.call(rl, s); else ecrire.call(rl, ''); };
      rl.question(question, r => { rl._writeToOutput = ecrire; process.stdout.write('\n'); resolve(String(r).trim()); }); }
    else rl.question(question, r => resolve(String(r).trim()));
  });
}
(async () => {
  let config;
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { console.error('✗ ' + CONFIG_PATH + ' illisible : ' + e.message + ' — rien n\'a été modifié.'); process.exit(1); }
  const nom = F === 'microsoft' ? 'Microsoft (Azure / Entra)' : 'Google Cloud';
  console.log('\n══ Connexion des boîtes ' + (F === 'microsoft' ? 'Outlook / Microsoft 365' : 'Gmail / Google Workspace') + ' ══\n');
  console.log('Deux valeurs, prises dans ' + nom + ' (voir server/OAUTH-BOITES.md).');
  if (AU_CLAVIER) console.log('Le secret ne s\'affichera PAS pendant la frappe — c\'est normal.\n'); else console.log('⚠ Entrée redirigée : le secret n\'est pas masqué à la saisie.\n');
  const clientId = await demander('Identifiant de l\'application (client ID) : ', false);
  const clientSecret = await demander('Secret client (masqué)                   : ', true);
  if (rl) rl.close();
  if (!clientId || !clientSecret) { console.error('\n✗ Une valeur manque. Rien n\'a été modifié.'); process.exit(1); }
  if (/\s/.test(clientId) || clientId.length < 8 || clientId.length > 200) { console.error('\n✗ L\'identifiant ne ressemble pas à un client ID (pas d\'espace, 8 à 200 caractères). Rien n\'a été modifié.'); process.exit(1); }
  if (/\s/.test(clientSecret) || clientSecret.length < 8 || clientSecret.length > 400) { console.error('\n✗ Le secret ne ressemble pas à un secret client. Rien n\'a été modifié.'); process.exit(1); }
  /* Chez Microsoft, on colle souvent l'ID DU SECRET (un GUID) au lieu de sa VALEUR : le refus serait obscur au premier essai. */
  if (F === 'microsoft' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientSecret)) {
    console.error('\n✗ Ceci ressemble à l\'« ID du secret » (un GUID), pas à sa VALEUR. Dans Azure, copie la colonne « Valeur », visible une seule fois à la création. Rien n\'a été modifié.'); process.exit(1); }
  config.oauth = config.oauth || {};
  config.oauth[F] = { clientId, clientSecret };
  const tmp = CONFIG_PATH + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2)); fs.chmodSync(tmp, 0o600);
  JSON.parse(fs.readFileSync(tmp, 'utf8'));   // relu avant de remplacer : jamais un fichier cassé à la place du bon
  fs.renameSync(tmp, CONFIG_PATH); fs.chmodSync(CONFIG_PATH, 0o600);
  console.log('\n✅ ' + nom + ' posé (secret de ' + clientSecret.length + ' caractères, non affiché). Redémarre : systemctl restart teamop-api');
  console.log('   Vérifie ensuite : curl -s https://api.teamop.fr/health  → "oauth":{"' + F + '":true,…}');
})();
