#!/usr/bin/env node
/* ══ VÉRIFIER LE SERVEUR DE VISIO (LiveKit) — CE QUE L'INSTALLATION PROUVE AVANT D'EXPOSER QUOI QUE CE SOIT ═════════════════════════════════════
 *
 * Usage, sur le VPS, en root (le fichier de l'instance n'est lisible que par root et par le service) — `install-sfu.sh` le lance lui-même, dans cet ordre :
 *
 *      node /opt/opmsg/<instance>/current/outils/verifier-visio.js beta                       LiveKit, en boucle locale
 *      node /opt/opmsg/<instance>/current/outils/verifier-visio.js beta --public              le chemin /rtc, par le nom public (nginx)
 *      node /opt/opmsg/<instance>/current/outils/verifier-visio.js beta --avis <port>         les avis de LiveKit, jusqu'au service
 *
 * Ce que ça répond, ligne à ligne, ✓ ou ✗ :
 *   · (sans option) LiveKit répond à sa sonde (« OK ») ; NOTRE paire de clés ouvre son API d'administration ; une clé FAUSSE y est refusée (401 : il vérifie
 *     les signatures, il n'ouvre pas à tout le monde) ; sa signalisation REFUSE qui n'a pas de jeton et accepte un jeton du service ;
 *   · (--public) par `https://<domaine de l'instance>` — donc par le DNS, le certificat et nginx : `/rtc/validate` répond de LiveKit (401 sans jeton, 200 avec), et
 *     son API d'administration n'est PAS exposée (`/twirp/…` tombe sur le service, pas sur LiveKit) ;
 *   · (--avis) une salle de contrôle ouverte puis fermée : LiveKit envoie ses avis au service, qui les ACCEPTE (signés de notre secret, sur le corps exact) —
 *     `visio.avisRecus` de /health monte, `visio.avisRefuses` ne bouge pas. Sans ces avis, une personne retirée d'une salle pourrait y revenir avec le jeton que
 *     LiveKit lui rafraîchit, et personne ne la remettrait dehors.
 *
 * ⛔ AUCUN SECRET NE S'AFFICHE : ni la clé, ni le secret, ni un jeton. Justin recolle toutes les sorties du VPS dans la conversation (règle du 24 septembre 2026) :
 * la sortie de ce fichier ne porte que des ✓/✗, des codes de réponse et des nombres. Une erreur de configuration dit CE QUI manque, jamais la valeur.
 * Aucune dépendance : `fetch` (Node 22), et les jetons du module du service (`visio.js`, `signer`) — ceux que LiveKit acceptera des pages.
 */
'use strict';
const fs = require('fs'), crypto = require('crypto'), http = require('http');

const DELAI_MS = 5000;

async function requete(url, init) {
  try {
    const r = await fetch(url, Object.assign({ signal: AbortSignal.timeout(DELAI_MS), redirect: 'manual' }, init || {}));
    return { statut: r.status, type: r.headers.get('content-type') || '', corps: (await r.text()).slice(0, 2000) };
  } catch (e) { return { statut: 0, type: '', corps: '', erreur: e && e.cause && e.cause.code ? e.cause.code : (e && e.name) || 'erreur' }; }
}
const ditStatut = (r) => r.statut ? 'HTTP ' + r.statut : 'injoignable (' + String(r.erreur).replace(/[^A-Za-z_]/g, '') + ')';

/* les jetons : une échéance courte, jamais sans échéance (les mêmes règles que `visio.js`) */
function fabrique(V, cle, secret) {
  return (droits, secretAutre) => {
    const t = Math.floor(Date.now() / 1000);
    return V.signer(Object.assign({ iss: cle, nbf: t - 5, exp: t + 60 }, droits), secretAutre || secret);
  };
}
const twirp = (interne, methode, corps, jeton) => requete(interne + '/twirp/livekit.RoomService/' + methode, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jeton }, body: JSON.stringify(corps || {}) });

async function controlesLocaux(v, instance, jeton) {
  const res = [];
  const sonde = await requete(v.interne + '/');
  res.push({ nom: 'LiveKit répond à sa sonde, en boucle locale', ok: sonde.statut === 200 && sonde.corps.trim() === 'OK', detail: ditStatut(sonde) });
  const ouvert = await twirp(v.interne, 'ListRooms', {}, jeton({ video: { roomList: true } }));
  res.push({ nom: 'NOTRE paire de clés ouvre son API d\'administration', ok: ouvert.statut === 200 && /"rooms"/.test(ouvert.corps), detail: ditStatut(ouvert) });
  const faux = await twirp(v.interne, 'ListRooms', {}, jeton({ video: { roomList: true } }, crypto.randomBytes(48).toString('base64url')));
  res.push({ nom: '⛔ une clé FAUSSE y est refusée (401 : il vérifie les signatures)', ok: faux.statut === 401, detail: ditStatut(faux) });
  const sansJeton = await requete(v.interne + '/rtc/validate');
  res.push({ nom: '⛔ sa signalisation REFUSE qui n\'a pas de jeton (401)', ok: sansJeton.statut === 401, detail: ditStatut(sansJeton) });
  const salle = instance + '-controle-' + crypto.randomBytes(4).toString('hex');
  const avecJeton = await requete(v.interne + '/rtc/validate?access_token=' + encodeURIComponent(jeton({ sub: 'controle', video: { roomJoin: true, room: salle } })));
  res.push({ nom: 'et accepte un jeton du service (200)', ok: avecJeton.statut === 200, detail: ditStatut(avecJeton) });
  return res;
}

async function controlesPublics(v, instance, jeton) {
  const res = [];
  const base = v.url.replace(/^ws/, 'http');
  if (!/^https:\/\//.test(base)) return [{ nom: 'l\'adresse publique de la visio est en https', ok: false, detail: 'elle ne l\'est pas : la page la joint en wss://' }];
  const sansJeton = await requete(base + '/rtc/validate');
  res.push({ nom: base.replace(/^https:\/\//, '') + '/rtc mène à LiveKit (401 sans jeton, en texte — pas une réponse du service)', ok: sansJeton.statut === 401 && /^text\/plain/.test(sansJeton.type), detail: ditStatut(sansJeton) + (sansJeton.statut ? ', ' + (sansJeton.type.split(';')[0] || 'sans type') : '') });
  const salle = instance + '-controle-' + crypto.randomBytes(4).toString('hex');
  const avecJeton = await requete(base + '/rtc/validate?access_token=' + encodeURIComponent(jeton({ sub: 'controle', video: { roomJoin: true, room: salle } })));
  res.push({ nom: 'un jeton du service y passe (200 : nginx relaie l\'adresse entière)', ok: avecJeton.statut === 200, detail: ditStatut(avecJeton) });
  const admin = await twirp(base, 'ListRooms', {}, jeton({ video: { roomList: true } }));
  res.push({ nom: '⛔ son API d\'administration n\'est PAS exposée (/twirp tombe sur le service, pas sur LiveKit)', ok: admin.statut !== 0 && admin.statut !== 200 && !/"rooms"/.test(admin.corps), detail: ditStatut(admin) });
  return res;
}

function sante(port) {
  return new Promise((ok) => {
    const q = http.get({ host: '127.0.0.1', port, path: '/health', timeout: DELAI_MS }, (r) => {
      let b = ''; r.on('data', (d) => { b += d; });
      r.on('end', () => { try { const v = (JSON.parse(b) || {}).visio || {}; ok({ recus: v.avisRecus, refuses: v.avisRefuses, ok: v.ok === true }); } catch (e) { ok(null); } });
    });
    q.on('error', () => ok(null));
    q.on('timeout', () => { q.destroy(); ok(null); });
  });
}

async function controlesAvis(v, instance, jeton, port) {
  const res = [];
  const avant = await sante(port);
  const lisible = !!avant && Number.isInteger(avant.recus) && Number.isInteger(avant.refuses);
  res.push({ nom: 'le service publie ses compteurs d\'avis (/health : visio.avisRecus, visio.avisRefuses)', ok: lisible, detail: avant ? 'compteurs absents : une version d\'avant' : 'service injoignable' });
  if (!lisible) return res;
  const salle = instance + '-controle-' + crypto.randomBytes(4).toString('hex');
  const ouverte = await twirp(v.interne, 'CreateRoom', { name: salle, empty_timeout: 30 }, jeton({ video: { roomCreate: true } }));
  res.push({ nom: 'une salle de contrôle s\'ouvre', ok: ouverte.statut === 200, detail: ditStatut(ouverte) });
  const fermee = await twirp(v.interne, 'DeleteRoom', { room: salle }, jeton({ video: { roomCreate: true } }));
  res.push({ nom: 'et se ferme', ok: fermee.statut === 200, detail: ditStatut(fermee) });
  let apres = null;
  for (let i = 0; i < 40; i++) {
    apres = await sante(port);
    if (apres && Number.isInteger(apres.recus) && apres.recus > avant.recus) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  const recus = apres && Number.isInteger(apres.recus) ? apres.recus - avant.recus : 0;
  const refuses = apres && Number.isInteger(apres.refuses) ? apres.refuses - avant.refuses : 0;
  res.push({ nom: '⛔ ses avis arrivent au service ET y sont acceptés (signés de notre secret)', ok: recus >= 1, detail: recus + ' avis accepté(s) en 10 s' + (refuses ? ', ' + refuses + ' refusé(s) : la clé de LiveKit et celle du service ne sont pas la même paire' : '') });
  res.push({ nom: '⛔ aucun avis refusé pendant le contrôle', ok: refuses === 0, detail: refuses + ' refusé(s)' });
  return res;
}

/* ── la ligne de commande ─────────────────────────────────────────────────────────────── */
async function principal(argv) {
  const instance = argv[0], mode = argv[1] || '';
  if ((instance !== 'beta' && instance !== 'prod') || !['', '--public', '--avis'].includes(mode)) { console.log('usage : node verifier-visio.js <beta|prod> [--public | --avis <port du service>]'); return 2; }
  const port = mode === '--avis' ? Number(argv[2]) : 0;
  if (mode === '--avis' && !(Number.isInteger(port) && port > 0 && port < 65536)) { console.log('usage : node verifier-visio.js <beta|prod> --avis <port du service>'); return 2; }
  const chemin = process.env.OPMSG_CONFIG || '/etc/opmsg/' + instance + '.json';
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(chemin, 'utf8')); }
  catch (e) { console.log('✗ la configuration de l\'instance ' + instance + ' est illisible (' + (e && e.code === 'ENOENT' ? 'absente' : e && e.code === 'EACCES' ? 'droits : lancer en root' : 'JSON invalide') + ')'); return 1; }
  const { appelsConfig } = require('../config');
  const V = require('../visio');
  let v;
  try { v = appelsConfig(cfg, instance).visio; } catch (e) { console.log('✗ ' + String(e.message).replace(/^config: /, '')); return 1; }
  if (!v) { console.log('✗ aucun serveur de visio n\'est configuré pour ' + instance + ' : lancer install-sfu.sh ' + instance); return 1; }
  const jeton = fabrique(V, v.cle, v.secret);
  console.log('── Le serveur de visio de l\'instance ' + instance + (mode === '--public' ? ', par son nom public' : mode === '--avis' ? ', ses avis jusqu\'au service' : ', en boucle locale'));
  const res = mode === '--public' ? await controlesPublics(v, instance, jeton) : mode === '--avis' ? await controlesAvis(v, instance, jeton, port) : await controlesLocaux(v, instance, jeton);
  let mal = 0;
  for (const c of res) {
    console.log((c.ok ? '  ✓ ' : '  ✗ ') + c.nom + (c.ok || !c.detail ? '' : ' — ' + c.detail));
    if (!c.ok) mal++;
  }
  console.log(mal ? '\n⛔ ' + mal + ' contrôle(s) en échec.' : '\n✓ Le serveur de visio fait ce qu\'il doit.');
  if (mode === '--public') console.log('   (Ce contrôle part de CE serveur : il ne dit pas si ses ports d\'image sont ouverts dans le panneau de l\'hébergeur — voir INSTALLER-LE-SERVEUR.md.)');
  return mal ? 1 : 0;
}

module.exports = { controlesLocaux, controlesPublics, controlesAvis, fabrique, principal };
if (require.main === module) principal(process.argv.slice(2)).then((c) => process.exit(c), () => { console.log('✗ erreur inattendue'); process.exit(1); });
