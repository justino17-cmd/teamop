#!/usr/bin/env node
/* ══ OUVRIR (OU REFERMER) LE CADRE : LA TOUR AFFICHE OP MESSAGES BÊTA DANS UNE PAGE ═══════════════════════════════════════════════════════════════
 *
 * Justin, 28 octobre 2026 : « je veux OP MESSAGES avec les mêmes fonctions que OP MESSAGES Pro » dans la rubrique Messagerie de la Tour. La Tour affiche donc la vraie page d'OP MESSAGES
 * bêta dans un cadre (iframe) au lieu de la recoder. Pour que le navigateur l'accepte, la page doit dire QUI peut l'encadrer : `frame-ancestors https://teamop.fr` (au lieu de `'none'`).
 * Cela s'écrit dans UN bloc de la configuration d'OP MESSAGES, et nulle part ailleurs :
 *      "encadrement": { "parents": ["https://teamop.fr"] }
 * Ce script le pose, le vérifie ou le retire. Il ne touche à AUCUNE autre clé, et ne manipule aucun secret : il n'y a rien à masquer ni à copier.
 *
 * Usage, SUR LE VPS, en root :
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-cadre.js              (poser)
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-cadre.js --verifier   (le service accepterait-il ce fichier ? que dit-il ?)
 *   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-cadre.js --retirer    (refermer : `frame-ancestors 'none'`, comme avant)
 *
 * ⛔ BÊTA SEULEMENT. Le service REFUSE de démarrer avec ce bloc en production (`config.js`, `encadrementConfig`) : ce script refuse donc tout fichier qui n'est pas celui de la bêta
 *    (`beta.json`, ou `OPMSG_INSTANCE=beta`), AVANT d'écrire — poser ce bloc dans `prod.json` ferait tomber la vraie messagerie des clients au prochain redémarrage.
 * ⛔ La MÊME validation que le démarrage du service, et la seule (`encadrementConfig`) : ce qui passe ici démarrera là.
 * ⛔ Le service ne relit sa configuration qu'au démarrage : `systemctl restart teamop-msg@beta`. Puis, pour VOIR l'effet (sans rien afficher de secret) :
 *      curl -sI https://msg-beta.teamop.fr/ | grep -i -E 'content-security-policy|x-frame-options'
 *    La CSP doit porter `frame-ancestors https://teamop.fr`, et AUCUN `X-Frame-Options` ne doit paraître : un tel en-tête, posé par le proxy, interdirait le cadre malgré la CSP.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { encadrementConfig, PARENTS_POSSIBLES } = require('./config');

const CHEMIN = process.env.OPMSG_CONFIG;
const ARGS = process.argv.slice(2);
const VERIFIER = ARGS.includes('--verifier'), RETIRER = ARGS.includes('--retirer');
const PARENTS = PARENTS_POSSIBLES;   // la liste vit dans le CODE de `config.js` (une seule origine) : cet outil ne nomme aucun domaine, il allume ce que le service permet

const echec = (m, rienModifie) => { console.error('\n✗ ' + m + (rienModifie === false ? '' : ' Rien n\'a été modifié.')); process.exit(1); };
const sansPrefixe = (e) => String(e && e.message ? e.message : e).replace(/^config: /, '');

function lire() {
  let j;
  try { j = JSON.parse(fs.readFileSync(CHEMIN, 'utf8')); }
  catch (e) { echec('OP MESSAGES (' + CHEMIN + ') illisible (' + (e && e.code === 'ENOENT' ? 'introuvable' : 'JSON invalide') + ') — ce script MODIFIE une configuration existante, il n\'en crée pas une neuve.'); }
  if (!j || typeof j !== 'object' || Array.isArray(j)) echec('le fichier doit contenir un objet JSON.');
  return j;
}

/* Écrit `apres` à la place du fichier : temporaire en 0600 dès la création, propriétaire conservé, relu, validé par le service, AUTRES clés intactes, puis renommé. */
function ecrire(avant, apres) {
  const tmp = CHEMIN + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(apres, null, 2), { mode: 0o600, flag: 'wx' });
  fs.chmodSync(tmp, 0o600);
  try { const st = fs.statSync(CHEMIN); fs.chownSync(tmp, st.uid, st.gid); } catch (e) { /* hors root, le propriétaire est déjà le bon */ }
  try {
    const relu = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    encadrementConfig(relu, 'beta');
    for (const k of new Set(Object.keys(avant).concat(Object.keys(relu)))) if (k !== 'encadrement' && JSON.stringify(relu[k]) !== JSON.stringify(avant[k])) throw new Error('clé ' + k + ' changée');
  } catch (err) { try { fs.unlinkSync(tmp); } catch (e) { /* déjà parti */ } throw new Error('le fichier écrit ne se relit pas, ou une autre clé aurait changé, ou le service le refuserait au démarrage.'); }
  fs.renameSync(tmp, CHEMIN);
  fs.chmodSync(CHEMIN, 0o600);
}

try {
  if (!CHEMIN) echec('OPMSG_CONFIG n\'est pas posé (la configuration d\'OP MESSAGES bêta, /etc/opmsg/beta.json).');
  for (const a of ARGS) if (a !== '--verifier' && a !== '--retirer') echec('option inconnue (« --verifier » et « --retirer » sont les seules).');
  if (VERIFIER && RETIRER) echec('« --verifier » et « --retirer » ne vont pas ensemble.');
  const instance = process.env.OPMSG_INSTANCE || path.basename(CHEMIN).replace(/\.json$/, '');
  if (instance !== 'beta') echec('ce fichier n\'est pas celui de la bêta (« ' + path.basename(CHEMIN) + ' »). Le cadre ne s\'ouvre QUE sur la bêta : en production le service refuserait de démarrer.');
  const cfg = lire();

  if (VERIFIER) {
    let p;
    try { p = encadrementConfig(cfg, 'beta'); } catch (e) { echec('le bloc `encadrement` est REFUSÉ par le service : ' + sansPrefixe(e), false); }
    if (p === null) { console.log('Cadre FERMÉ : aucun bloc `encadrement` — la page garde `frame-ancestors \'none\'`.'); return; }
    console.log('✅ Cadre OUVERT à : ' + p.join(', ') + ' (le service accepte ce fichier). Le redémarrage du service est nécessaire pour qu\'il le lise.');
    return;
  }

  if (RETIRER) {
    if (cfg.encadrement === undefined) echec('le cadre est déjà fermé (aucun bloc `encadrement`).', false);
    const sans = Object.assign({}, cfg); delete sans.encadrement;
    ecrire(cfg, sans);
    console.log('✅ ' + CHEMIN + ' mis à jour (chmod 600) : plus de bloc `encadrement`, la page redevient non encadrable. Pour finir :   systemctl restart teamop-msg@beta\n');
    return;
  }

  const neuf = Object.assign({}, cfg, { encadrement: { parents: PARENTS.slice() } });
  try { if (encadrementConfig(neuf, 'beta') === null) throw new Error('bloc inerte'); } catch (e) { echec(sansPrefixe(e)); }
  ecrire(cfg, neuf);
  console.log('✅ ' + CHEMIN + ' mis à jour (chmod 600) : la page peut être encadrée par ' + PARENTS.join(', ') + ' et par personne d\'autre. Pour finir :');
  console.log('   systemctl restart teamop-msg@beta');
  console.log('   curl -sI <adresse de la bêta>/ | grep -i -E \'content-security-policy|x-frame-options\'     (la CSP porte « frame-ancestors » suivi du site ci-dessus ; aucun X-Frame-Options)\n');
} catch (e) {
  console.error('✗ ' + (e && e.message ? e.message : 'erreur') + ' Rien n\'a été modifié.');
  process.exit(1);
}
