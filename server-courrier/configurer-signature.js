#!/usr/bin/env node
/* ══ RÉGLER LA SIGNATURE MAISON — SAISIE MASQUÉE, JAMAIS D'ÉCHO ═════════════════════════════════════════════════════════
 * Usage (sur le VPS, en root) :
 *   node configurer-signature.js <beta|prod>               pose l'adresse publique des liens et la boîte SMTP qui envoie le code ; le mot de passe se saisit MASQUÉ, deux fois
 *   node configurer-signature.js <beta|prod> tester        se connecte au SMTP et dit « accepté » ou « refusé » (statut seulement ; n'envoie AUCUN courriel)
 *   node configurer-signature.js <beta|prod> verifier      ressaisis le mot de passe (masqué) : DIT « identique » ou « différent », rien d'autre
 *   node configurer-signature.js <beta|prod> allumer       fait servir la signature par le moteur INTERNE (refusé tant que l'adresse et le SMTP ne sont pas posés)
 *   node configurer-signature.js <beta|prod> eteindre      revient à Yousign (le réglage d'avant)
 *
 * ⛔ ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS (CLAUDE.md) : le mot de passe SMTP va de ton gestionnaire de mots de passe à ce terminal en saisie masquée,
 * puis dans /etc/opcourrier/<instance>.json (0600). Jamais en argument, jamais dans l'historique du shell, jamais affiché. Ce fichier n'écrit que « posé »,
 * « inchangé », « identique », « différent », « accepté », « refusé » — jamais le mot de passe ni l'identifiant (saisis masqués). Le nom du serveur, l'adresse
 * publique, le port et l'expéditeur ne sont pas des secrets : ils s'affichent comme on les tape, et c'est tout.
 * ⛔ Le moteur interne est ÉTEINT par défaut (`signature.moteur` absent = Yousign) : poser les réglages n'allume rien. Seul « allumer » le fait.
 */
'use strict';
const fs = require('fs'), crypto = require('crypto');
const { demander, fermer } = require('./saisie');

const args = process.argv.slice(2);
const instance = args[0], action = args[1] || 'poser';
if (!/^(beta|prod)$/.test(instance || '') || !/^(poser|tester|verifier|allumer|eteindre)$/.test(action)) {
  console.error('Usage : node configurer-signature.js <beta|prod> [tester|verifier|allumer|eteindre]'); process.exit(2);
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
function redemarrer() {
  const { spawnSync } = require('child_process');
  const r = process.env.OPCOURRIER_SANS_REDEMARRAGE ? { status: 1 } : spawnSync('systemctl', ['restart', 'opcourrier-' + instance], { stdio: 'ignore' });
  console.log(r.status === 0 ? '✓ service redémarré.' : 'ℹ redémarre le service : systemctl restart opcourrier-' + instance);
}
const urlValide = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || (x.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(x.hostname)); } catch (e) { return false; } };

(async () => {
  const c = lireConfig(); c.signature = c.signature || {};
  const sg = c.signature, sm = sg.smtp && typeof sg.smtp === 'object' ? sg.smtp : null;
  if (action === 'poser') {
    console.log('Instance ' + instance + ' — ' + chemin + ' (la signature maison reste ' + (sg.moteur === 'interne' ? 'ALLUMÉE' : 'éteinte') + ')');
    const url = (await demander('  Adresse publique des liens de signature (https://…, sans / final)' + (sg.urlPublique ? ' [vide = inchangée]' : '') + ' : ', false)).replace(/\/+$/, '');
    if (url && !urlValide(url)) { console.error('✗ adresse refusée : https obligatoire (http n\'est admis qu\'en boucle locale).'); process.exit(1); }
    if (!url && !sg.urlPublique) { console.error('✗ adresse publique : rien saisi.'); process.exit(1); }
    const hote = await demander('  Serveur SMTP (nom de machine)' + (sm ? ' [vide = inchangé]' : '') + ' : ', false);
    if (!hote && !sm) { console.error('✗ serveur SMTP : rien saisi.'); process.exit(1); }
    const portTxt = await demander('  Port [' + (sm && sm.port ? 'inchangé' : '587') + '] : ', false);
    if (portTxt && !/^\d{2,5}$/.test(portTxt)) { console.error('✗ port : un nombre.'); process.exit(1); }
    const secu = (await demander('  Connexion chiffrée d\'emblée (port 465) ? oui/non [' + (sm && sm.secure ? 'oui' : 'non') + '] : ', false)).toLowerCase();
    const id = await demander('  Identifiant SMTP (saisie masquée' + (sm && sm.user ? ', vide = inchangé' : '') + ') : ', true);   // un identifiant de connexion ne s'affiche pas non plus
    const de = await demander('  Expéditeur affiché (ex. TeamOP Signature <signature@teamop.fr>)' + (sm && sm.from ? ' [vide = inchangé]' : '') + ' : ', false);
    if (de && !/@/.test(de)) { console.error('✗ expéditeur : une adresse e-mail est attendue.'); process.exit(1); }
    const a = await demander('  Mot de passe SMTP (saisie masquée' + (sm && sm.pass ? ', vide = inchangé' : '') + ') : ', true);
    let pass = null;
    if (a) { const b = await demander('  Mot de passe SMTP — ressaisis pour vérifier : ', true); if (!egal(a, b)) { console.error('✗ Les deux saisies diffèrent. Rien n\'a été modifié.'); process.exit(1); } pass = a; }
    else if (!sm || !sm.pass) { console.error('✗ mot de passe SMTP : rien saisi.'); process.exit(1); }
    if (url) sg.urlPublique = url;
    const n = Object.assign({}, sm || {});
    if (hote) n.host = hote; if (portTxt) n.port = Number(portTxt); if (secu) n.secure = secu === 'oui'; if (id) n.user = id; if (de) n.from = de; if (pass) n.pass = pass;
    if (!n.port) n.port = n.secure ? 465 : 587;
    sg.smtp = n; ecrireConfig(c);
    console.log('✓ posé : adresse publique' + (url ? '' : ' (inchangée)') + ', boîte SMTP' + (pass ? ' + mot de passe' : ' (mot de passe inchangé)') + '. La signature maison est ' + (sg.moteur === 'interne' ? 'ALLUMÉE' : 'éteinte') + ' — « allumer » pour la servir.');
    redemarrer();
  } else if (action === 'verifier') {
    const a = await demander('  Mot de passe SMTP (masqué) : ', true);
    console.log('  mot de passe SMTP : ' + (!a ? 'non saisi' : !(sm && sm.pass) ? 'AUCUN posé' : egal(a, sm.pass) ? 'identique' : 'DIFFÉRENT'));
  } else if (action === 'tester') {
    if (!(sm && sm.host && sm.from)) { console.error('✗ aucune boîte SMTP posée.'); process.exit(1); }
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({ host: sm.host, port: Number(sm.port) || (sm.secure ? 465 : 587), secure: !!sm.secure, auth: sm.user ? { user: sm.user, pass: sm.pass } : undefined, tls: { minVersion: 'TLSv1.2' }, connectionTimeout: 10000, greetingTimeout: 10000 });
    try { await t.verify(); console.log('✓ le serveur SMTP accepte la connexion et l\'identification (aucun courriel envoyé).'); }
    catch (e) { console.error('✗ le serveur SMTP refuse ou ne répond pas : ' + (e.responseCode ? 'statut ' + e.responseCode : e.code ? 'code ' + e.code : 'pas de réponse') + '.'); process.exit(1); }
  } else if (action === 'allumer') {
    if (!sg.urlPublique) { console.error('✗ pose d\'abord l\'adresse publique des liens (action « poser »).'); process.exit(1); }
    if (!(sm && sm.host && sm.from)) { console.error('✗ pose d\'abord la boîte SMTP qui envoie le code (action « poser »).'); process.exit(1); }
    sg.moteur = 'interne'; ecrireConfig(c);
    console.log('✓ la signature maison est ALLUMÉE (Yousign n\'est plus appelé).'); redemarrer();
  } else {
    sg.moteur = 'yousign'; ecrireConfig(c);
    console.log('✓ la signature maison est ÉTEINTE : retour à Yousign.'); redemarrer();
  }
  fermer();
})();
