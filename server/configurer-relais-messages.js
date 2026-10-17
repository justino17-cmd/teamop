#!/usr/bin/env node
/* ══ POSER LE SECRET DU RELAIS VERS OP MESSAGES, SANS L'AFFICHER NI LE COLLER NULLE PART ══════════════════════
 *
 * La console OP MESSAGES de la Tour lit l'administration d'OP MESSAGES par un relais d'api.teamop.fr
 * (`/api/monitor/messages/admin/*`, server/index.js), qui présente un secret dans l'en-tête `X-OPM-Admin`. Le service
 * d'OP MESSAGES porte la MÊME valeur (son outil `configurer-admin.js`, de son côté) : deux services, un secret.
 *
 * Usage, SUR LE VPS, en root :
 *   node /opt/teamop/repo/server/configurer-relais-messages.js beta               (poser ou remplacer le secret de la bêta)
 *   node /opt/teamop/repo/server/configurer-relais-messages.js prod               (… de la version publique)
 *   node /opt/teamop/repo/server/configurer-relais-messages.js beta --verifier    (comparer une valeur collée à celle qui est posée)
 *   node /opt/teamop/repo/server/configurer-relais-messages.js beta --retirer     (fermer le relais de cette instance)
 * puis `systemctl restart teamop-api` : le serveur ne relit sa configuration qu'au démarrage.
 *
 * ⛔ « ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS » (CLAUDE.md) — et Justin recolle toutes ses sorties dans la
 * conversation. Le secret se SAISIT ici, masqué, et va du clavier au fichier : jamais en argument (`ps` le montre à
 * toute la machine), jamais affiché, jamais dans un message d'erreur. Ce qui s'affiche : une EMPREINTE COURTE (les huit
 * premiers signes du SHA-256 du secret en minuscules) — la même que dit `configurer-admin.js` côté OP MESSAGES : elle ne
 * permet pas de retrouver le secret, elle permet de voir que deux copies sont jumelles.
 * Le secret se FABRIQUE ailleurs (sur le Mac : `openssl rand -hex 32 | pbcopy`), se range dans le gestionnaire de mots
 * de passe, et se colle des deux côtés.
 * ⛔ Le fichier n'est réécrit qu'une fois tout validé : temporaire en 0600, relu, les AUTRES clés vérifiées intactes,
 * puis renommé — jamais à moitié (la panne du 17 septembre 2026 : une accolade perdue, un serveur qui ne démarre plus).
 * Et il ÉPROUVE la paire : après l'écriture, il demande `/api/admin/sante` au service en boucle locale avec le secret
 * posé, et dit si OP MESSAGES l'accepte — un secret différent des deux côtés se voit ICI, pas dans la Tour. */
'use strict';
const fs = require('fs'), crypto = require('crypto'), readline = require('readline');

const CONFIG_PATH = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';
const ARGS = process.argv.slice(2);
const INSTANCE = ARGS.find(a => a === 'beta' || a === 'prod');
const VERIFIER = ARGS.includes('--verifier'), RETIRER = ARGS.includes('--retirer');
/* même règle que `urlBanc` (server/index.js) : une adresse de banc ne vise que 127.0.0.1 */
const urlBanc = (v, defaut) => (typeof v === 'string' && /^http:\/\/127\.0\.0\.1:\d{2,5}(\/|$)/.test(v)) ? v : defaut;
const URL_MSG = INSTANCE === 'prod' ? urlBanc(process.env.TEAMOP_MSG_PROD_URL, 'http://127.0.0.1:8090') : urlBanc(process.env.TEAMOP_MSG_BETA_URL, 'http://127.0.0.1:8091');
const RE_SECRET = /^[0-9a-fA-F]{64}$/;
const courte = s => crypto.createHash('sha256').update(String(s).toLowerCase()).digest('hex').slice(0, 8);

/* La saisie masquée — même mécanique que `configurer-sauvegarde.js` (voir son en-tête : au clavier le masquage, en
   entrée redirigée une lecture d'un bloc, qui sert à ÉPROUVER ce programme, et qu'on DIT non masquée). */
const AU_CLAVIER = !!process.stdin.isTTY;
let rl = null, lignes = null;
if (AU_CLAVIER) rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
function lireToutStdin() {
  return new Promise(resolve => {
    let d = ''; process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => { d += c; });
    process.stdin.on('end', () => resolve(d.split('\n')));
    if (process.stdin.readableEnded) resolve(d.split('\n'));
  });
}
async function demanderMasque(question) {
  if (!AU_CLAVIER) {
    if (lignes === null) lignes = await lireToutStdin();
    const r = lignes.length ? lignes.shift() : '';
    process.stdout.write(question + '(lu, non affiché)\n');
    return String(r).trim();
  }
  return new Promise(resolve => {
    const ecrire = rl._writeToOutput;
    rl._writeToOutput = function (s) { if (s.includes(question)) ecrire.call(rl, s); else ecrire.call(rl, ''); };
    rl.question(question, r => { rl._writeToOutput = ecrire; process.stdout.write('\n'); resolve(String(r).trim()); });
  });
}
const fermer = () => { if (rl) rl.close(); };
const echec = m => { console.error('\n✗ ' + m + ' Rien n\'a été modifié.'); fermer(); process.exit(1); };

function ecrire(config) {
  const tmp = CONFIG_PATH + '.tmp-' + process.pid;
  const avant = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.chmodSync(tmp, 0o600);
  let relu;
  try { relu = JSON.parse(fs.readFileSync(tmp, 'utf8')); } catch (e) { fs.unlinkSync(tmp); echec('le fichier écrit ne se relit pas.'); }
  /* toutes les AUTRES clés intactes : ce script ne touche que `messagesAdmin` */
  const sans = o => { const c = Object.assign({}, o); delete c.messagesAdmin; return JSON.stringify(c); };
  if (sans(relu) !== sans(avant)) { fs.unlinkSync(tmp); echec('une autre clé de la configuration aurait changé.'); }
  try { const st = fs.statSync(CONFIG_PATH); fs.chownSync(tmp, st.uid, st.gid); } catch (e) {}
  fs.renameSync(tmp, CONFIG_PATH);
  fs.chmodSync(CONFIG_PATH, 0o600);
}

async function eprouver(secret) {
  try {
    const r = await fetch(URL_MSG + '/api/admin/sante', { headers: { 'X-OPM-Admin': secret, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(4000) });
    if (r.ok) return '✅ OP MESSAGES (' + INSTANCE + ') ACCEPTE ce secret : la console OP MESSAGES de la Tour pourra lire son administration.';
    if (r.status === 404) return '⚠ OP MESSAGES (' + INSTANCE + ') REFUSE ce secret (404) — il n\'a pas la même valeur, ou son administration n\'est pas ouverte. Côté OP MESSAGES : `configurer-admin.js --verifier`, puis comparer les empreintes courtes.';
    return '⚠ OP MESSAGES (' + INSTANCE + ') a répondu ' + r.status + ' — la paire n\'est pas éprouvée.';
  } catch (e) { return '⚠ OP MESSAGES (' + INSTANCE + ') injoignable en boucle locale (' + URL_MSG.replace(/^http:\/\//, '') + ') — la paire n\'est pas éprouvée.'; }
}

(async () => {
  if (!INSTANCE) { console.error('Usage : node configurer-relais-messages.js <beta|prod> [--verifier|--retirer]'); process.exit(1); }
  let config;
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { console.error('✗ ' + CONFIG_PATH + ' illisible — ce script MODIFIE une configuration existante, il n\'en crée pas une neuve.'); process.exit(1); }
  const ma = config.messagesAdmin && typeof config.messagesAdmin === 'object' ? config.messagesAdmin : {};
  const pose = RE_SECRET.test(String(ma[INSTANCE] || '')) ? String(ma[INSTANCE]).toLowerCase() : '';
  console.log('\n══ Relais de la Tour vers OP MESSAGES (' + INSTANCE + ') ══');
  console.log(pose ? 'Un secret est posé (empreinte courte ' + courte(pose) + ').' : 'Aucun secret posé : le relais de cette instance est fermé (503 « relais non configuré »).');

  if (RETIRER) {
    if (!pose) { console.log('Rien à retirer.'); fermer(); return; }
    delete ma[INSTANCE]; config.messagesAdmin = ma;
    if (!Object.keys(ma).length) delete config.messagesAdmin;
    ecrire(config); fermer();
    console.log('✅ Secret retiré. Après `systemctl restart teamop-api`, la console OP MESSAGES de la Tour dira « relais non configuré ».');
    return;
  }
  if (!AU_CLAVIER) console.log('⚠ Entrée redirigée : la valeur est lue sans masquage (au clavier, elle est masquée).');
  const v = (await demanderMasque('Secret (64 signes hexadécimaux, masqué) : ')).toLowerCase();
  if (!RE_SECRET.test(v)) echec('ce n\'est pas un secret de 64 signes hexadécimaux.');

  if (VERIFIER) {
    fermer();
    if (!pose) { console.log('Aucun secret posé : rien à comparer.'); process.exit(1); }
    const a = crypto.createHash('sha256').update(v).digest(), b = crypto.createHash('sha256').update(pose).digest();
    const pareil = crypto.timingSafeEqual(a, b);
    console.log(pareil ? '✅ identique (empreinte courte ' + courte(v) + ').' : '✗ différent : la valeur collée n\'est pas celle qui est posée (empreinte courte de la valeur collée : ' + courte(v) + ').');
    process.exit(pareil ? 0 : 1);
  }
  ma[INSTANCE] = v; config.messagesAdmin = ma;
  ecrire(config); fermer();
  console.log('✅ ' + CONFIG_PATH + ' mis à jour (chmod 600) — empreinte courte ' + courte(v) + ', la même doit paraître côté OP MESSAGES.');
  console.log(await eprouver(v));
  console.log('Reste : `systemctl restart teamop-api` (le serveur relit sa configuration au démarrage).');
})().catch(e => { console.error('✗ ' + (e && e.message ? e.message.replace(/[0-9a-f]{64}/gi, '(masqué)') : 'erreur')); fermer(); process.exit(1); });
