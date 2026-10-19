#!/usr/bin/env node
/* ══ POSER LES CLÉS YOUSIGN — SAISIE MASQUÉE, JAMAIS D'ÉCHO ═════════════════════════════════════════════════════════════════
 * Usage (sur le VPS, en root) :
 *   node configurer-yousign.js <beta|prod>             pose la clé API et le secret du webhook, puis redémarre le service
 *   node configurer-yousign.js <beta|prod> verifier    ressaisis (masqué) : DIT « identique » ou « différent », n'affiche rien d'autre
 *   node configurer-yousign.js <beta|prod> tester      demande à Yousign si la clé est acceptée (affiche un statut, jamais la clé)
 *
 * ⛔ ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS (CLAUDE.md) : Justin recolle toutes ses sorties dans la conversation. Un secret va du
 * gestionnaire de mots de passe / du tableau de bord Yousign à ce terminal en SAISIE MASQUÉE (aucun écho, même pour la correction), puis
 * dans /etc/opcourrier/<instance>.json (0600). Jamais en argument (`ps` le montre), jamais dans l'historique du shell, jamais affiché.
 * Une valeur se saisit DEUX fois : deux saisies différentes n'écrivent rien. Ce fichier n'écrit que « posé », « inchangé », « identique »,
 * « différent » — jamais une valeur, pas même sa longueur.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { demander, fermer } = require('./saisie');

const args = process.argv.slice(2);
const instance = args[0], action = args[1] || 'poser';
if (!/^(beta|prod)$/.test(instance || '') || !/^(poser|verifier|tester)$/.test(action)) {
  console.error('Usage : node configurer-yousign.js <beta|prod> [verifier|tester]'); process.exit(2);
}
const chemin = process.env.OPCOURRIER_CONFIG || '/etc/opcourrier/' + instance + '.json';

function lireConfig() {
  try { return JSON.parse(fs.readFileSync(chemin, 'utf8')); }
  catch (e) { console.error('✗ configuration illisible : ' + chemin + ' (' + (e.code || 'JSON invalide') + ') — lance d\'abord install-courrier.sh'); process.exit(1); }
}
function ecrireConfig(c) {
  const st = fs.statSync(chemin), tmp = chemin + '.tmp' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(c, null, 2) + '\n', { mode: 0o600 });
  try { fs.chownSync(tmp, st.uid, st.gid); } catch (e) { /* pas root : le propriétaire reste celui qui écrit */ }
  fs.renameSync(tmp, chemin);
}
const egal = (a, b) => { const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };
const lisible = (s) => /^\S{16,512}$/.test(s) && !/[\u0000-\u001f]/.test(s);

async function saisieDouble(nom, existant) {
  const a = await demander('  ' + nom + ' (saisie masquée' + (existant ? ', vide = inchangé' : '') + ') : ', true);
  if (!a) { if (existant) return null; console.error('✗ ' + nom + ' : rien saisi.'); process.exit(1); }
  if (!lisible(a)) { console.error('✗ ' + nom + ' : 16 caractères au moins, sans espace.'); process.exit(1); }
  const b = await demander('  ' + nom + ' — ressaisis pour vérifier : ', true);
  if (!egal(a, b)) { console.error('✗ Les deux saisies de « ' + nom + ' » diffèrent. Rien n\'a été modifié.'); process.exit(1); }
  return a;
}

(async () => {
  const c = lireConfig(); c.yousign = c.yousign || {};
  if (action === 'poser') {
    console.log('Instance ' + instance + ' — ' + chemin);
    const env = (await demander('  Environnement Yousign : « sandbox » (bac à sable) ou « production » [' + (c.yousign.sandbox === false ? 'production' : 'sandbox') + '] : ', false)).toLowerCase();
    if (env && !/^(sandbox|production)$/.test(env)) { console.error('✗ « sandbox » ou « production ».'); process.exit(1); }
    const cle = await saisieDouble('Clé API Yousign', !!c.yousign.cleApi);
    const sec = await saisieDouble('Secret du webhook', !!c.yousign.secretWebhook);
    if (env) c.yousign.sandbox = env !== 'production';
    if (cle) c.yousign.cleApi = cle;
    if (sec) c.yousign.secretWebhook = sec;
    ecrireConfig(c);
    console.log('✓ posé' + (cle ? ' : clé API' : ' (clé API inchangée)') + (sec ? ' + secret du webhook' : ' (secret inchangé)') + ' · environnement : ' + (c.yousign.sandbox === false ? 'PRODUCTION' : 'bac à sable'));
    const { spawnSync } = require('child_process');
    const r = process.env.OPCOURRIER_SANS_REDEMARRAGE ? { status: 1 } : spawnSync('systemctl', ['restart', 'opcourrier-' + instance], { stdio: 'ignore' });
    console.log(r.status === 0 ? '✓ service redémarré.' : 'ℹ redémarre le service : systemctl restart opcourrier-' + instance);
  } else if (action === 'verifier') {
    const cle = await demander('  Clé API Yousign (masquée) : ', true);
    const sec = await demander('  Secret du webhook (masqué) : ', true);
    console.log('  clé API : ' + (!cle ? 'non saisie' : !c.yousign.cleApi ? 'AUCUNE posée' : egal(cle, c.yousign.cleApi) ? 'identique' : 'DIFFÉRENTE'));
    console.log('  secret du webhook : ' + (!sec ? 'non saisi' : !c.yousign.secretWebhook ? 'AUCUN posé' : egal(sec, c.yousign.secretWebhook) ? 'identique' : 'DIFFÉRENT'));
  } else {
    if (!c.yousign.cleApi) { console.error('✗ aucune clé API posée.'); process.exit(1); }
    const { creerYousign } = require('./yousign');
    const urlApi = c.yousign.urlApi || (c.yousign.sandbox === false ? 'https://api.yousign.app' : 'https://api-sandbox.yousign.app');
    try { await creerYousign({ cleApi: c.yousign.cleApi, urlApi }).tester(); console.log('✓ Yousign accepte la clé (' + (c.yousign.sandbox === false ? 'PRODUCTION' : 'bac à sable') + ').'); }
    catch (e) { console.error('✗ Yousign refuse ou ne répond pas : ' + (e.statut ? 'statut ' + e.statut : 'pas de réponse') + (e.statut === 401 ? ' (clé fausse, ou clé de production sur le bac à sable : l\'inverse ne marche pas non plus)' : '') + '.'); process.exitCode = 1; }
  }
  fermer();
})();
