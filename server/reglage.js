#!/usr/bin/env node
/* ══ LES DEUX INTERRUPTEURS DE LA SORTIE DE FIREBASE, SANS OUVRIR LA CONFIGURATION ═══════════════
 *
 * Le jour J, deux réglages de `/opt/teamop/config.json` changent, à des jours d'écart :
 *   · `comptes.actif`          → true   le jour J, AVANT la publication (le portail parle au serveur)
 *   · `documents.copieFirebase`→ false  à J+30, après un inventaire complet (plus rien ne se copie)
 *
 * ⛔ POURQUOI UN SCRIPT ET PAS « OUVRE LE FICHIER ». Ce fichier porte les secrets du serveur (clés
 * Stripe, SMTP, sauvegarde, Firebase). L'ouvrir dans un éditeur depuis un téléphone, c'est risquer
 * une virgule qui empêche le service de redémarrer — et l'afficher, c'est le faire atterrir dans une
 * conversation (CLAUDE.md : « ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS »). Ce script :
 *   · ne touche QUE ces deux clés (liste fermée), et refuse tout le reste ;
 *   · écrit à côté puis renomme (un fichier tronqué = un serveur qui ne démarre plus) ;
 *   · garde les droits 600 ;
 *   · n'affiche QUE la valeur du réglage, jamais une ligne de la configuration.
 *
 * Usage (sur le VPS, en root) :
 *   node /opt/teamop/repo/server/reglage.js comptes.actif=true
 *   node /opt/teamop/repo/server/reglage.js documents.copieFirebase=false
 * puis : systemctl restart teamop-api
 */
'use strict';
const fs = require('fs');

const CONFIG_PATH = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';
/* La liste FERMÉE : un interrupteur de plus s'ajoute ici, en connaissance de cause. */
const PERMIS = {
  'comptes.actif': ['true', 'false'],
  'documents.copieFirebase': ['true', 'false'],
};

function regler(chemin, arg) {
  const m = /^([A-Za-z]+\.[A-Za-z]+)=(true|false)$/.exec(String(arg || ''));
  if (!m || !PERMIS[m[1]] || PERMIS[m[1]].indexOf(m[2]) < 0)
    return { ok: false, message: 'réglage refusé — seuls ' + Object.keys(PERMIS).map(k => k + '=true|false').join(', ') + ' sont permis' };
  let texte;
  try { texte = fs.readFileSync(chemin, 'utf8'); }
  catch (e) { return { ok: false, message: 'configuration illisible (' + (e.code || 'erreur') + ') — rien n\'a changé' }; }
  let config;
  try { config = JSON.parse(texte); }
  catch (e) { return { ok: false, message: 'configuration qui n\'est pas du JSON valide — rien n\'a changé' }; }
  const [bloc, cle] = m[1].split('.'), valeur = m[2] === 'true';
  const avant = config[bloc] && typeof config[bloc] === 'object' ? config[bloc][cle] : undefined;
  config[bloc] = Object.assign({}, (config[bloc] && typeof config[bloc] === 'object') ? config[bloc] : {}, { [cle]: valeur });
  const tmp = chemin + '.tmp-reglage';
  try {
    fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600 });
    fs.chmodSync(tmp, 0o600);
    fs.renameSync(tmp, chemin);
    fs.chmodSync(chemin, 0o600);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (x) {}
    return { ok: false, message: 'écriture impossible (' + (e.code || 'erreur') + ') — rien n\'a changé' };
  }
  return { ok: true, message: m[1] + ' : ' + (avant === undefined ? '(absent)' : String(avant)) + ' → ' + String(valeur)
    + '\nRedémarre le service pour qu\'il le prenne : systemctl restart teamop-api' };
}

if (require.main === module) {
  const r = regler(CONFIG_PATH, process.argv[2]);
  console.log((r.ok ? '✅ ' : '✗ ') + r.message);
  process.exit(r.ok ? 0 : 1);
}
module.exports = { regler, PERMIS };
