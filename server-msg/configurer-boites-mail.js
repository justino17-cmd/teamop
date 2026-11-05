#!/usr/bin/env node
/* ══ OUVRIR LES BOÎTES MAIL D'OP MESSAGES, ET POSER LES IDENTIFIANTS GOOGLE / MICROSOFT, SANS AFFICHER NI COLLER UN SECRET ═══════════
 *
 * Usage, SUR LE VPS, en root :
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-boites-mail.js ouvrir       allume la rubrique Courrier (mot de passe d'application)
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-boites-mail.js google       pose l'application Google  (« Continuer avec Google »)
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-boites-mail.js microsoft    pose l'application Microsoft (« Continuer avec Microsoft »)
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-boites-mail.js retirer google|microsoft|tout   retire un fournisseur, ou ferme tout
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-boites-mail.js --verifier    relit ce qui est posé (sans rien afficher de secret)
 * puis :   systemctl restart teamop-msg@<instance>
 *
 * ⛔ « ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS » (CLAUDE.md). Le SECRET CLIENT de l'application se SAISIT ici, masqué (`saisie.js`), et va de ce clavier au fichier : jamais en argument (`ps`
 * et l'historique du shell le montreraient), jamais affiché, jamais recopié dans la conversation. Le script n'imprime que des verdicts, la LONGUEUR du secret, et l'adresse de retour (une adresse
 * publique, celle qu'on déclare chez Google et Microsoft). Un « Identifiant de l'application » (client ID) n'est pas un secret : il se tape visible.
 * ⛔ Le fichier n'est réécrit qu'une fois tout validé par le MÊME code que le démarrage du service (`boitesMailConfig`) : temporaire (0600 dès sa création), propriétaire conservé, relu, TOUTES les
 * autres clés vérifiées intactes, puis renommé — jamais à moitié. Un bloc invalide REFUSERAIT le démarrage du service : on le sait ici, pas à minuit.
 * ⛔ Chez Microsoft, on colle souvent l'ID DU SECRET (un GUID) au lieu de sa VALEUR : refusé, avec la phrase qui dit où trouver la bonne colonne.
 */
'use strict';
const fs = require('fs');
const { demander, fermer } = require('./saisie');
const { boitesMailConfig } = require('./config');

const CONFIG_PATH = process.env.OPMSG_CONFIG;
const ARGS = process.argv.slice(2);
const echec = (m) => { console.error('\n✗ ' + m + ' Rien n\'a été modifié.'); fermer(); process.exit(1); };
const sansPrefixe = (e) => String(e && e.message ? e.message : e).replace(/^config: /, '');

function origineDe(config) {
  const l = Array.isArray(config.origines) ? config.origines : (typeof config.origine === 'string' && config.origine ? [config.origine] : []);
  return l.length ? String(l[0]) : null;
}
function ecrire(config, apres) {
  const tmp = CONFIG_PATH + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(apres, null, 2), { mode: 0o600, flag: 'wx' });
  fs.chmodSync(tmp, 0o600);
  try { const st = fs.statSync(CONFIG_PATH); fs.chownSync(tmp, st.uid, st.gid); } catch (e) { /* hors root, le propriétaire est déjà le bon */ }
  try {
    const relu = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    const origines = origineDe(relu);
    if (relu.boitesMail) boitesMailConfig({ boitesMail: relu.boitesMail }, 'prod', origines ? [origines] : null);
    for (const k of new Set(Object.keys(config).concat(Object.keys(relu)))) if (k !== 'boitesMail' && JSON.stringify(relu[k]) !== JSON.stringify(config[k])) throw new Error('clé ' + k + ' changée');
  } catch (err) { try { fs.unlinkSync(tmp); } catch (e) { /* déjà parti */ } echec('le fichier écrit ne se relit pas, ou une autre clé aurait changé, ou le service le refuserait au démarrage.'); }
  fs.renameSync(tmp, CONFIG_PATH);
  fs.chmodSync(CONFIG_PATH, 0o600);
}
function etat(config) {
  const b = config.boitesMail;
  const o = origineDe(config);
  console.log('   rubrique Courrier : ' + (b && b.ouvert === true ? 'OUVERTE' : 'fermée'));
  console.log('   Google            : ' + (b && b.oauth && b.oauth.google ? 'posé (identifiant de ' + String(b.oauth.google.clientId).length + ' caractères, secret non affiché)' : 'non posé'));
  console.log('   Microsoft         : ' + (b && b.oauth && b.oauth.microsoft ? 'posé (identifiant de ' + String(b.oauth.microsoft.clientId).length + ' caractères, secret non affiché)' : 'non posé'));
  const red = (b && b.redirection) || (o ? o + '/api/boites-mail/oauth/retour' : null);
  console.log('   adresse de retour à déclarer chez Google et Microsoft : ' + (red || '(aucune origine configurée : ajoute "boitesMail.redirection")'));
}

(async () => {
  if (!CONFIG_PATH) { console.error('✗ OPMSG_CONFIG n\'est pas défini (le fichier de configuration de l\'instance, par exemple /etc/opmsg/beta.json).'); process.exit(1); }
  const cmd = String(ARGS[0] || '').toLowerCase();
  let config;
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { echec(CONFIG_PATH + ' est illisible (' + (e && e.code ? e.code : 'JSON invalide') + ').'); }
  const avant = config.boitesMail && typeof config.boitesMail === 'object' && !Array.isArray(config.boitesMail) ? config.boitesMail : {};
  const origines = origineDe(config);
  const valider = (b) => { try { boitesMailConfig({ boitesMail: b }, 'prod', origines ? [origines] : null); } catch (e) { echec(sansPrefixe(e)); } };

  if (cmd === '--verifier' || cmd === 'verifier') {
    console.log('\n══ Boîtes mail d\'OP MESSAGES — ce qui est posé ══');
    if (config.boitesMail !== undefined) valider(config.boitesMail);
    etat(config); fermer(); return;
  }
  if (cmd === 'ouvrir') {
    const apres = Object.assign({}, config, { boitesMail: Object.assign({}, avant, { ouvert: true }) });
    valider(apres.boitesMail); ecrire(config, apres);
    console.log('\n✅ La rubrique Courrier est ouverte (mot de passe d\'application). Ensuite :   systemctl restart teamop-msg@<instance>'); etat(apres); fermer(); return;
  }
  if (cmd === 'retirer') {
    const f = String(ARGS[1] || '').toLowerCase();
    if (!['google', 'microsoft', 'tout'].includes(f)) echec('Usage : retirer google|microsoft|tout.');
    let apres;
    if (f === 'tout') { apres = Object.assign({}, config); delete apres.boitesMail; }
    else {
      const oauth = Object.assign({}, avant.oauth || {}); delete oauth[f];
      apres = Object.assign({}, config, { boitesMail: Object.assign({}, avant, { oauth }) });
      valider(apres.boitesMail);
    }
    ecrire(config, apres);
    console.log('\n✅ Retiré (' + f + '). Les boîtes déjà reliées restent en base mais ce fournisseur ne se renouvelle plus : à reconnecter. Ensuite :   systemctl restart teamop-msg@<instance>'); etat(apres); fermer(); return;
  }
  if (cmd === 'google' || cmd === 'microsoft') {
    const nom = cmd === 'google' ? 'Google Cloud' : 'Microsoft (Azure / Entra)';
    console.log('\n══ Connexion des boîtes ' + (cmd === 'google' ? 'Gmail / Google Workspace' : 'Outlook / Microsoft 365') + ' ══\n');
    console.log('Deux valeurs, prises dans ' + nom + '. Le secret ne s\'affichera PAS pendant la frappe — c\'est normal.');
    console.log('Adresse de retour à déclarer chez ' + (cmd === 'google' ? 'Google' : 'Microsoft') + ' : ' + (avant.redirection || (origines ? origines + '/api/boites-mail/oauth/retour' : '(aucune origine configurée)')) + '\n');
    const clientId = await demander('Identifiant de l\'application (client ID)  : ', false);
    const clientSecret = await demander('Secret client (masqué)                    : ', true);
    if (!clientId || !clientSecret) echec('Une valeur manque.');
    if (/\s/.test(clientId) || clientId.length < 8 || clientId.length > 200) echec('L\'identifiant ne ressemble pas à un client ID (pas d\'espace, 8 à 200 caractères).');
    if (/\s/.test(clientSecret) || clientSecret.length < 8 || clientSecret.length > 400) echec('Le secret ne ressemble pas à un secret client.');
    if (cmd === 'microsoft' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientSecret)) echec('Ceci ressemble à l\'« ID du secret » (un GUID), pas à sa VALEUR. Dans Azure, copie la colonne « Valeur », visible une seule fois à la création.');
    const oauth = Object.assign({}, avant.oauth || {}, { [cmd]: { clientId, clientSecret } });
    const apres = Object.assign({}, config, { boitesMail: Object.assign({}, avant, { ouvert: true, oauth }) });
    valider(apres.boitesMail); ecrire(config, apres);
    console.log('\n✅ ' + nom + ' posé (identifiant de ' + clientId.length + ' caractères, secret de ' + clientSecret.length + ' caractères, non affiché). La rubrique Courrier est ouverte. Ensuite :   systemctl restart teamop-msg@<instance>');
    console.log('   Vérifie :   curl -s https://<domaine>/api/config   →   "boitesMail":{"ouvert":true,"oauth":{"' + cmd + '":true,…}}'); etat(apres); fermer(); return;
  }
  console.error('Usage : configurer-boites-mail.js ouvrir | google | microsoft | retirer google|microsoft|tout | --verifier'); fermer(); process.exit(1);
})().catch((e) => { console.error('✗ ' + (e && e.message ? e.message : 'erreur') + ' Rien n\'a été modifié.'); process.exit(1); });
