#!/usr/bin/env node
/* ══ POSER LE PONT DES AGENTS (TOUR ↔ OP MESSAGES), SANS AFFICHER LE SECRET NI LE COLLER NULLE PART ═══════════════════════════════════════════════
 *
 * Le pont (`pont-agents.js` côté OP MESSAGES, `pont-messages.js` côté Tour) tient sur UN secret et sur DEUX fichiers de configuration de la MÊME machine :
 *   · celui d'OP MESSAGES (`OPMSG_CONFIG`, par exemple /etc/opmsg/beta.json) reçoit `pont: { actif: true, secretSha256, justin }` — l'EMPREINTE du secret, jamais le secret ;
 *   · celui de la Tour (`TEAMOP_CONFIG`, par exemple /opt/teamop/config.json) reçoit `opmsgPont: { secret }` — le secret, que la Tour présente en en-tête.
 * Ce script écrit les deux d'un seul geste : il n'y a donc RIEN à copier d'un fichier à l'autre, et le secret peut être FABRIQUÉ ICI sans que personne ne le voie
 * (Entrée à l'invite) — le bon choix, puisque les deux fichiers sont sur cette machine.
 *
 * Usage, SUR LE VPS, en root :
 *   OPMSG_CONFIG=/etc/opmsg/beta.json TEAMOP_CONFIG=/opt/teamop/config.json node /opt/opmsg/beta/current/configurer-pont.js              (poser ou remplacer)
 *   OPMSG_CONFIG=… TEAMOP_CONFIG=… node …/configurer-pont.js --verifier   (les deux fichiers se correspondent-ils ? rien ne s'affiche que l'empreinte courte)
 *   OPMSG_CONFIG=… TEAMOP_CONFIG=… node …/configurer-pont.js --retirer    (fermer le pont : les deux blocs sont retirés, la messagerie de la Tour reste seule)
 * Il demande l'identifiant de l'accès bêta de Justin (visible : `b` + hexadécimaux, celui que l'onglet « Accès » de la Tour affiche — ce n'est pas un secret) puis le secret (masqué).
 *
 * ⛔ « ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS » (CLAUDE.md). Le secret se SAISIT ici, masqué (`saisie.js`), ou se fabrique ici ; il va du clavier (ou du hasard) aux fichiers :
 * jamais en argument (`ps` le montre), jamais affiché, jamais dans un message d'erreur. Seule l'empreinte COURTE (huit signes du SHA-256) se lit : elle permet de voir que deux copies sont jumelles.
 * ⛔ Chaque fichier n'est réécrit qu'une fois tout validé : temporaire (0600 dès sa création), propriétaire de l'ancien conservé, relu et revalidé par le MÊME code que le démarrage du service
 * (`pontConfig`), toutes les AUTRES clés vérifiées intactes, puis renommé — jamais à moitié. Si le second fichier ne s'écrit pas, le premier est remis comme il était.
 * ⛔ Le service ne relit sa configuration qu'au démarrage : `systemctl restart teamop-msg@beta` PUIS `systemctl restart teamop-api` (la Tour réessaie si OP MESSAGES n'est pas encore là).
 * ⛔ Le service REFUSE de démarrer avec une empreinte égale à celle de l'administration, ou hors de la bêta : ce script le refuse AVANT d'écrire.
 */
'use strict';
const fs = require('fs'), crypto = require('crypto');
const { demander, fermer } = require('./saisie');
const { pontConfig } = require('./pont-agents');
const { adminConfig, RE_SECRET } = require('./admin');

const OPM = process.env.OPMSG_CONFIG, TOUR = process.env.TEAMOP_CONFIG;
const ARGS = process.argv.slice(2);
const VERIFIER = ARGS.includes('--verifier'), RETIRER = ARGS.includes('--retirer');
const RE_ACCES = /^b[0-9a-f]{6,32}$/;

const echec = (m, rienModifie) => { console.error('\n✗ ' + m + (rienModifie === false ? '' : ' Rien n\'a été modifié.')); fermer(); process.exit(1); };
const sansPrefixe = (e) => String(e && e.message ? e.message : e).replace(/^config: /, '');
const empreinte = (secret) => crypto.createHash('sha256').update(String(secret).toLowerCase()).digest();
const courte = (buf) => (Buffer.isBuffer(buf) ? buf : empreinte(buf)).toString('hex').slice(0, 8);

function lire(chemin, nom) {
  let j;
  try { j = JSON.parse(fs.readFileSync(chemin, 'utf8')); }
  catch (e) { echec(nom + ' (' + chemin + ') illisible (' + (e && e.code === 'ENOENT' ? 'introuvable' : 'JSON invalide') + ') — ce script MODIFIE une configuration existante, il n\'en crée pas une neuve.'); }
  if (!j || typeof j !== 'object' || Array.isArray(j)) echec(nom + ' : le fichier doit contenir un objet JSON.');
  return j;
}

/* Écrit `apres` à la place de `chemin` : temporaire en 0600 dès la création, propriétaire conservé, relu, `controle(relu)` doit passer, AUTRES clés intactes (`cle` : la seule qui change), puis renommé. */
function ecrire(chemin, avant, apres, cle, controle) {
  const tmp = chemin + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(apres, null, 2), { mode: 0o600, flag: 'wx' });
  fs.chmodSync(tmp, 0o600);
  try { const st = fs.statSync(chemin); fs.chownSync(tmp, st.uid, st.gid); } catch (e) { /* hors root, le propriétaire est déjà le bon */ }
  try {
    const relu = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    controle(relu);
    for (const k of new Set(Object.keys(avant).concat(Object.keys(relu)))) if (k !== cle && JSON.stringify(relu[k]) !== JSON.stringify(avant[k])) throw new Error('clé ' + k + ' changée');
  } catch (err) { try { fs.unlinkSync(tmp); } catch (e) { /* déjà parti */ } throw new Error('le fichier écrit ne se relit pas, ou une autre clé aurait changé, ou le service le refuserait au démarrage.'); }
  fs.renameSync(tmp, chemin);
  fs.chmodSync(chemin, 0o600);
}
/* Remet un fichier tel qu'il était (le premier est déjà renommé quand le second échoue). */
function remettre(chemin, octets) {
  try { const st = fs.statSync(chemin); fs.writeFileSync(chemin, octets, { mode: 0o600 }); fs.chownSync(chemin, st.uid, st.gid); fs.chmodSync(chemin, 0o600); } catch (e) { /* le message de l'échec le dit */ }
}

/* le bloc d'OpMsg tel que le service le jugerait, ou null s'il est absent/éteint ; une erreur est un refus du service */
function blocOpm(config) {
  const admin = (() => { try { return adminConfig(config, null); } catch (e) { return null; } })();
  return pontConfig(config, 'beta', admin && admin.empreinte);
}

(async () => {
  if (!OPM) echec('OPMSG_CONFIG n\'est pas posé (la configuration d\'OP MESSAGES, par exemple /etc/opmsg/beta.json).');
  if (!TOUR) echec('TEAMOP_CONFIG n\'est pas posé (le config.json de la Tour).');
  for (const a of ARGS) if (a !== '--verifier' && a !== '--retirer') echec('option inconnue (« --verifier » et « --retirer » sont les seules).');
  if (VERIFIER && RETIRER) echec('« --verifier » et « --retirer » ne vont pas ensemble.');
  const opm = lire(OPM, 'OP MESSAGES'), tour = lire(TOUR, 'la Tour');
  const octetsOpm = fs.readFileSync(OPM);

  /* ── --verifier ── */
  if (VERIFIER) {
    let b;
    try { b = blocOpm(opm); } catch (e) { echec('la configuration du pont, côté OP MESSAGES, est REFUSÉE par le service : ' + sansPrefixe(e), false); }
    const st = tour.opmsgPont && typeof tour.opmsgPont === 'object' ? tour.opmsgPont : null;
    if (b === null && !st) echec('rien à vérifier : le pont n\'est posé d\'aucun des deux côtés (il est INERTE). Pour le poser, relancer ce script sans « --verifier ».', false);
    if (b === null) echec('la Tour porte un secret, mais OP MESSAGES n\'a pas de bloc `pont` actif : le pont ne passera pas (404 de l\'autre côté).', false);
    if (!st || typeof st.secret !== 'string' || !/^[0-9a-f]{64}$/.test(st.secret.toLowerCase())) echec('OP MESSAGES porte un pont, mais la Tour n\'a pas de secret valable (`opmsgPont.secret`) : elle ne lui parle pas.', false);
    if (!crypto.timingSafeEqual(b.empreinte, empreinte(st.secret))) echec('DIFFÉRENTS : le secret de la Tour n\'est pas celui dont OP MESSAGES garde l\'empreinte (empreintes courtes : ' + courte(st.secret) + ' côté Tour, ' + courte(b.empreinte) + ' côté OP MESSAGES). Relancer ce script sans « --verifier ».', false);
    console.log('✅ jumelles : la Tour et OP MESSAGES portent le même secret. Empreinte courte : ' + courte(b.empreinte) + '. Accès de Justin : ' + b.justin + '.');
    const colle = await demander('Valeur à comparer aussi (masquée ; vide = rien de plus) : ', true);
    if (colle) {
      if (!RE_SECRET.test(colle)) echec('la valeur collée n\'est pas 64 caractères hexadécimaux.', false);
      if (!crypto.timingSafeEqual(b.empreinte, empreinte(colle))) echec('DIFFÉRENT : la valeur collée n\'est pas celle qui est posée (empreinte courte de la valeur collée : ' + courte(colle) + ').', false);
      console.log('✅ identique : la valeur collée est celle qui est posée.');
    }
    fermer();
    return;
  }

  /* ── --retirer ── */
  if (RETIRER) {
    if (opm.pont === undefined && tour.opmsgPont === undefined) echec('le pont n\'est posé d\'aucun des deux côtés : il est déjà INERTE.', false);
    const sansPont = Object.assign({}, opm); delete sansPont.pont;
    const sansSecret = Object.assign({}, tour); delete sansSecret.opmsgPont;
    ecrire(OPM, opm, sansPont, 'pont', (r) => { if (r.pont !== undefined) throw new Error('pont encore là'); });
    try { ecrire(TOUR, tour, sansSecret, 'opmsgPont', (r) => { if (r.opmsgPont !== undefined) throw new Error('secret encore là'); }); }
    catch (e) { remettre(OPM, octetsOpm); throw e; }
    console.log('✅ ' + OPM + ' et ' + TOUR + ' mis à jour (chmod 600) : plus de pont, la messagerie de la Tour reste seule. Pour finir :   systemctl restart teamop-msg@beta   puis   systemctl restart teamop-api\n');
    fermer();
    return;
  }

  /* ── poser ── */
  console.log('\n══ PONT DES AGENTS — la messagerie de la Tour dans OP MESSAGES ══\n');
  const deja = opm.pont && typeof opm.pont === 'object' && !Array.isArray(opm.pont) && typeof opm.pont.justin === 'string' && RE_ACCES.test(opm.pont.justin) ? opm.pont.justin : null;
  if (opm.pont !== undefined || tour.opmsgPont !== undefined) console.log('Un pont est déjà posé. Ce script va le remplacer (les deux fichiers ensemble : la Tour et OP MESSAGES resteront jumelles).\n');
  console.log('L\'identifiant de l\'accès bêta de Justin : `b` + des hexadécimaux, dans l\'onglet « Accès » de la Tour (ce n\'est pas un secret).');
  let justin = await demander('Accès bêta de Justin' + (deja ? ' (Entrée = ' + deja + ')' : '') + ' : ', false);
  if (!justin && deja) justin = deja;
  if (!RE_ACCES.test(justin)) echec('l\'identifiant d\'un accès bêta commence par « b » suivi de 6 à 32 hexadécimaux (celui que la Tour affiche).');
  console.log('\nLe secret : 64 hexadécimaux. Le mieux est de LAISSER VIDE : il est alors fabriqué ici, écrit dans les deux fichiers et montré à personne.');
  console.log('(Pour en coller un, fabriqué ailleurs — `openssl rand -hex 32 | pbcopy` — il ne s\'affichera pas pendant la frappe.)\n');
  let secret = await demander('Secret du pont (masqué ; vide = en fabriquer un ici) : ', true);
  let fabrique = false;
  if (!secret) { secret = crypto.randomBytes(32).toString('hex'); fabrique = true; }
  secret = secret.toLowerCase();
  if (!RE_SECRET.test(secret)) echec('le secret n\'est pas 64 caractères hexadécimaux.');
  /* un secret copié d'un exemple (« abab… », « 0000… ») : 64 hexadécimaux tirés au hasard portent toujours bien plus de huit signes différents — la même règle que l'administration */
  if (new Set(secret).size < 8) echec('le secret est trop régulier (il doit être tiré au hasard).');
  const neufOpm = Object.assign({}, opm, { pont: { actif: true, secretSha256: empreinte(secret).toString('hex'), justin } });
  const neufTour = Object.assign({}, tour, { opmsgPont: Object.assign({}, tour.opmsgPont && typeof tour.opmsgPont === 'object' && !Array.isArray(tour.opmsgPont) ? tour.opmsgPont : {}, { secret }) });
  /* La MÊME validation que le démarrage du service, et la seule : ce qui passe ici démarrera là. */
  try { if (blocOpm(neufOpm) === null) throw new Error('bloc inerte'); } catch (e) { echec(sansPrefixe(e)); }
  ecrire(OPM, opm, neufOpm, 'pont', (r) => { const b = blocOpm(r); if (b === null || !crypto.timingSafeEqual(b.empreinte, empreinte(secret)) || b.justin !== justin) throw new Error('pont différent de celui qu\'on a voulu écrire'); });
  try { ecrire(TOUR, tour, neufTour, 'opmsgPont', (r) => { if (!r.opmsgPont || r.opmsgPont.secret !== secret) throw new Error('secret différent de celui qu\'on a voulu écrire'); }); }
  catch (e) { remettre(OPM, octetsOpm); throw e; }
  console.log('✅ ' + OPM + ' et ' + TOUR + ' mis à jour (chmod 600). Empreinte courte du secret, ' + courte(secret) + ' (la même dans les deux fichiers).');
  if (fabrique) console.log('   Le secret a été fabriqué ICI et n\'a été montré à personne — c\'est voulu : il n\'a pas à voyager.');
  console.log('   Pour finir :   systemctl restart teamop-msg@beta   puis   systemctl restart teamop-api   puis   node …/configurer-pont.js --verifier\n');
  fermer();
})().catch((e) => { console.error('✗ ' + (e && e.message ? e.message : 'erreur') + ' Rien n\'a été modifié.'); process.exit(1); });
