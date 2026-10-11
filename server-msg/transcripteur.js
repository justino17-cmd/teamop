'use strict';
/* ══ L'OUVRIER DE TRANSCRIPTION — « possible de faire une transcription écrite, comme sur Instagram » (Justin, 11 octobre 2026) ══════════════════════════════════════════════════
 *
 * Un processus À PART, dans SA propre unité systemd (`opmsg-transcrire@<instance>`, posée par `install-transcription.sh`), avec son propre compte système : le service lui envoie les
 * octets d'un vocal (déjà déchiffrés), il les passe à ffmpeg (WAV 16 kHz mono) puis à whisper.cpp (`whisper-cli`), et rend le texte. Rien d'autre : pas de base, pas de clé, pas de réseau.
 *
 * ⛔ POURQUOI PAS UN PROCESSUS ENFANT DU SERVICE : un enfant hérite du cgroup du service (MemoryMax=1G, que le modèle mangerait à moitié) ET de ses droits — or le service lit la clé maître
 *    (`$CREDENTIALS_DIRECTORY/kek`). Un fichier audio forgé qui ferait déraper ffmpeg aurait, dans le service, accès à la clé de toutes les conversations. Ici, ffmpeg tourne sous un
 *    compte qui ne peut rien lire du service, sans aucune sortie réseau (l'unité le refuse), dans une mémoire et un temps de calcul bornés.
 * ⛔ AUCUNE VOIX EN CLAIR SUR LE DISQUE : les fichiers de travail vont dans le dossier d'exécution de l'unité (`RUNTIME_DIRECTORY`, un tmpfs en mémoire vive), un dossier par travail,
 *    effacé dans un `finally` — et l'unité, arrêtée, emporte le dossier entier.
 * ⛔ UN TRAVAIL À LA FOIS : un deuxième reçoit 503 `occupe` (le service tient la file). Chaque programme a son délai (SIGKILL au groupe de processus) ; aucun ne passe par un shell.
 * ⛔ RIEN DU CONTENU DANS LE JOURNAL : ni le texte, ni la langue, ni la taille exacte — une ligne dit l'issue (`ok`, `vide`, `echec` et le NOM de l'étape), et le temps.
 *
 * ⛔ UNE SOCKET UNIX, PAS UN PORT (relecture du gardien, 11 octobre 2026) : un port de la boucle locale se SQUATTE — un processus de la machine qui le prend pendant un redémarrage
 *    recevait le secret et les octets des vocaux. La socket vit dans le dossier d'exécution de l'unité (0750, groupe de l'ouvrier, dont le compte du service est membre) : seul le
 *    service la joint, et l'unité n'a plus AUCUN réseau (`PrivateNetwork`). Un port reste possible pour les bancs.
 *
 * Le protocole (HTTP sur la socket, chaque requête porte `Authorization: Bearer <secret>`) :
 *   GET  /sante        → 200 { ok, sha, occupe }          `ok` : les trois programmes et le modèle sont là, exécutables / lisibles
 *   POST /transcrire   → 200 { ok:true, texte, langue }   corps : les octets du vocal ; en-tête `X-Langue` (fr, en, … ou auto)
 *                        → 503 occupe · 413 trop_lourd (octets) ou trop_long (durée MESURÉE, jamais celle annoncée) · 400 format (ffmpeg n'a rien su lire) · 504 delai · 500 echec
 *   POST /quitter      → 200 puis sortie : le service le demande quand l'ouvrier tourne sur un code d'AVANT le sien (l'unité le relance aussitôt sur le code déployé)
 *
 * La configuration : un fichier JSON (`OPMSG_TRANSCRIRE_CONFIG`, posé par l'installation, lisible de ce compte seul) — voir `lireConfig`. Lancer à la main (essai) :
 *   OPMSG_TRANSCRIRE_CONFIG=/chemin/transcrire.json node transcripteur.js
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const OCTETS_MAX_DEFAUT = 10485760;                 // 10 Mo : le plafond d'un vocal côté service (`pieces.vocalMax`)
const DUREE_MAX_DEFAUT = 600;                       // le plafond d'un vocal côté service (`DUREE_VOCAL_MAX`)
/* ⛔ LES LANGUES QUE WHISPER CONNAÎT (sa table `g_lang`) : une autre (« zz » d'un profil) le faisait sortir en erreur — et le service prenait cette erreur pour une panne de
   l'ouvrier, coupant la transcription de tout le monde (relecture du gardien). Une langue inconnue devient « auto » (whisper la détecte). */
const LANGUES = new Set(('en zh de es ru ko fr ja pt tr pl ca nl ar sv it id hi fi vi he uk el ms cs ro da hu ta no th ur hr bg lt la mi ml cy sk te fa lv bn sr az sl kn et mk br eu is hy ' +
  'ne mn bs kk sq sw gl mr pa si km sn yo so af oc ka be tg sd gu am yi lo uz fo ht ps tk nn mt sa lb my bo tl mg as tt haw ln ha ba jw su yue').split(' '));
const langueOuvrier = (x) => { const l = String(x || '').toLowerCase().trim(); return l === 'auto' || LANGUES.has(l) ? l : 'auto'; };
/* ⛔ ce que ffmpeg a le droit de lire : les conteneurs d'un vocal (WebM/Matroska de Chrome, MP4 de Safari, Ogg de Firefox, MP3, AAC, WAV) — un fichier qui se déguise (un
   « concat » derrière un en-tête ID3) n'est pas ouvert du tout, au lieu de compter sur `safe=1` (relecture du gardien, essayé avec ffmpeg 6.1) */
const FORMATS = 'matroska,webm,ogg,mov,mp4,m4a,mp3,aac,wav';

/* ⛔ CE QUE WHISPER « ENTEND » DANS LE SILENCE : des génériques de vidéos appris à l'entraînement. La détection de parole (VAD, Silero) en retire presque tout ; ce qui passe encore se
   reconnaît ici — UNIQUEMENT quand c'est TOUT le texte (« merci d'avoir regardé » au milieu d'un vrai message reste). Un vocal sans parole rend un texte VIDE, que la page dit
   « Aucune parole reconnue » : un texte inventé serait pire qu'une absence de texte. */
/* ⛔ SEULEMENT LES GÉNÉRIQUES DE VIDÉOS : « Merci ! », « Thank you », « merci à tous » sont de VRAIS vocaux, très courants — les écarter disait « Aucune parole reconnue »
   pour un message qu'on venait d'entendre (relectures du gardien et du relecteur). Le silence, lui, est l'affaire de la détection de parole (`--vad`). */
const PHRASES_FANTOMES = [
  'sous-titres réalisés par la communauté d\'amara.org', 'sous-titres réalisés para la communauté d\'amara.org', 'sous-titrage st\' 501', 'sous-titrage société radio-canada',
  'sous-titrage fr', 'sous-titres par', 'merci d\'avoir regardé', 'merci d\'avoir regardé cette vidéo', 'abonnez-vous', 'abonnez-vous à la chaîne',
  'thank you for watching', 'thanks for watching', 'please subscribe',
];
const ANNOTATIONS = /\[(?:blank_audio|silence|musique|music|bruit|applaudissements|rires|inaudible|son|sound)\]|\((?:musique|music|silence|rires|applaudissements|inaudible)\)|[♪♫]+/gi;
const norme = (t) => t.normalize('NFC').toLowerCase().replace(/[’]/g, '\'').replace(/[\s.!?…,;:«»"-]+$/g, '').replace(/^[\s.!?…,;:«»"-]+/g, '').replace(/\s+/g, ' ').trim();
/* « >> » : la marque d'un changement de locuteur que whisper recopie des sous-titres (mesuré le 11 octobre 2026 : en tête de 4 vocaux sur 38 avec « small ») — ce n'est pas
   un mot qu'on a dit */
const LOCUTEUR = /(^|\s)>>+(?=\s|$)/g;
function nettoyerTexte(brut) {
  const t = String(brut || '').replace(ANNOTATIONS, ' ').replace(LOCUTEUR, ' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const n = norme(t);
  if (!n || PHRASES_FANTOMES.some(p => norme(p) === n)) return '';
  return t;
}

function lireConfig(chemin) {
  let c;
  try { c = JSON.parse(fs.readFileSync(chemin, 'utf8')); } catch (e) { throw Object.assign(new Error('configuration illisible'), { code: 'CONFIG' }); }
  const err = (m) => Object.assign(new Error('configuration : ' + m), { code: 'CONFIG' });
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw err('un objet JSON est attendu');
  if (typeof c.secret !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(c.secret)) throw err('secret absent ou mal formé (32 à 128 caractères)');   // ⛔ jamais la valeur dans le message
  /* une SOCKET (le VPS) ou un port de la boucle locale (les bancs) — l'un des deux, jamais les deux */
  const port = c.port === undefined || c.port === null ? null : c.port, socket = c.socket === undefined || c.socket === null ? null : c.socket;
  if ((port === null) === (socket === null)) throw err('une socket (chemin absolu) OU un port, l\'un des deux');
  if (port !== null && (!Number.isInteger(port) || port < 1024 || port > 65535)) throw err('port : un entier entre 1024 et 65535');
  if (socket !== null && (typeof socket !== 'string' || !path.isAbsolute(socket) || socket.length > 100 || /\.\.|[^A-Za-z0-9/._-]/.test(socket))) throw err('socket : un chemin absolu court, sans « .. »');
  for (const k of ['whisper', 'modele', 'ffmpeg']) if (typeof c[k] !== 'string' || !path.isAbsolute(c[k])) throw err(k + ' : un chemin absolu');
  if (c.vad !== undefined && c.vad !== null && (typeof c.vad !== 'string' || !path.isAbsolute(c.vad))) throw err('vad : un chemin absolu, ou absent');
  const ent = (k, def, min, max) => { const v = c[k] === undefined ? def : c[k]; if (!Number.isInteger(v) || v < min || v > max) throw err(k + ' : un entier entre ' + min + ' et ' + max); return v; };
  return {
    secret: c.secret, port, socket, hote: '127.0.0.1',
    whisper: c.whisper, modele: c.modele, ffmpeg: c.ffmpeg, vad: c.vad || null,
    threads: ent('threads', 2, 1, 32), faisceau: ent('faisceau', 1, 1, 8),
    octetsMax: ent('octetsMax', OCTETS_MAX_DEFAUT, 1024, 268435456), dureeMaxS: ent('dureeMaxS', DUREE_MAX_DEFAUT, 1, 3600),
    /* les délais : ffmpeg (un décodage de vocal prend une fraction de seconde) et whisper (une base fixe, plus un temps par seconde d'audio — mesuré le 11 octobre 2026 :
       « large-v3-turbo-q8_0 » en faisceau de 5 sur 2 cœurs, ~12 s fixes puis ~0,45 s par seconde d'audio ; 1 min en ~35 s, 2 min en ~65 s — le délai en laisse ~4 fois) */
    delaiFfmpegMs: ent('delaiFfmpegMs', 30000, 1000, 600000), delaiWhisperBaseMs: ent('delaiWhisperBaseMs', 60000, 1000, 1800000), delaiWhisperParSMs: ent('delaiWhisperParSMs', 2000, 0, 60000),
    sortieMax: ent('sortieMax', 1048576, 4096, 16777216),
  };
}

/* lancer un programme SANS shell, dans son propre groupe (le délai tue le groupe entier : un enfant de ffmpeg ne survit pas), stdout/stderr bornés */
function lancer(cmd, args, { delaiMs, entree = null, sortieMax = 1048576, cwd } = {}) {
  return new Promise((resolve) => {
    let fini = false, sortie = [], taille = 0, erreur = '';
    const p = spawn(cmd, args, { cwd, stdio: [entree === null ? 'ignore' : 'pipe', 'pipe', 'pipe'], detached: true, env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' } });
    const tuer = () => { try { process.kill(-p.pid, 'SIGKILL'); } catch (e) { try { p.kill('SIGKILL'); } catch (e2) { /* déjà parti */ } } };
    const minuteur = setTimeout(() => { if (!fini) { fini = true; tuer(); resolve({ code: null, delai: true, sortie: Buffer.alloc(0), erreur: '' }); } }, delaiMs);
    p.stdout.on('data', (d) => { taille += d.length; if (taille <= sortieMax) sortie.push(d); else if (!fini) { fini = true; clearTimeout(minuteur); tuer(); resolve({ code: null, tropLong: true, sortie: Buffer.alloc(0), erreur: '' }); } });
    p.stderr.on('data', (d) => { if (erreur.length < 4000) erreur += d.toString('utf8').slice(0, 4000 - erreur.length); });
    p.on('error', (e) => { if (!fini) { fini = true; clearTimeout(minuteur); resolve({ code: null, absent: e && e.code === 'ENOENT', sortie: Buffer.alloc(0), erreur: '' }); } });
    p.on('close', (code, signal) => { if (!fini) { fini = true; clearTimeout(minuteur); resolve({ code, signal: signal || null, sortie: Buffer.concat(sortie), erreur }); } });
    if (entree !== null) { p.stdin.on('error', () => { /* le programme a fermé son entrée : son code le dira */ }); p.stdin.end(entree); }
  });
}

function egalSecret(entete, secret) {
  const m = /^Bearer ([A-Za-z0-9_-]{1,256})$/.exec(String(entete || ''));
  if (!m) return false;
  const a = crypto.createHash('sha256').update(m[1]).digest(), b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

function creerOuvrier(cfg, { journal = () => {}, horloge = Date.now, dossierTravail } = {}) {
  const racine = dossierTravail || process.env.RUNTIME_DIRECTORY || os.tmpdir();
  const sha = path.basename(path.dirname(fs.realpathSync(__filename)));        // le dossier de la release qui porte CE fichier (`releases/<sha>`) : le service compare au sien
  let occupe = false, quitter = null;

  const pret = () => {
    const x = (f) => { try { fs.accessSync(f, fs.constants.X_OK); return true; } catch (e) { return false; } };
    const r = (f) => { try { fs.accessSync(f, fs.constants.R_OK); return fs.statSync(f).size > 0; } catch (e) { return false; } };
    return x(cfg.whisper) && x(cfg.ffmpeg) && r(cfg.modele) && (cfg.vad === null || r(cfg.vad));
  };

  async function transcrire(octets, langue) {
    const t0 = horloge();
    const dossier = fs.mkdtempSync(path.join(racine, 't-'));
    try {
      fs.chmodSync(dossier, 0o700);
      const entree = path.join(dossier, 'entree'), wav = path.join(dossier, 'audio.wav'), base = path.join(dossier, 'texte');
      fs.writeFileSync(entree, octets, { mode: 0o600 });
      /* ffmpeg : seulement des fichiers locaux (`-protocol_whitelist`), pas de vidéo ni de sous-titres ni de données, ni les métadonnées ; la durée et la taille de SORTIE bornées */
      /* ⛔ on décode UNE seconde de plus que le plafond : un vocal plus long que lui est REFUSÉ (413 trop_long), jamais tronqué en silence — sa durée annoncée par l'appareil
         ne compte pas (relecture du gardien : un vocal de dix minutes annoncé « 1 s » occupait l'ouvrier bien au-delà de ce que le service attendait) */
      const f = await lancer(cfg.ffmpeg, ['-hide_banner', '-nostdin', '-loglevel', 'error', '-threads', '1', '-protocol_whitelist', 'file', '-format_whitelist', FORMATS, '-t', String(cfg.dureeMaxS + 1), '-i', entree,
        '-vn', '-sn', '-dn', '-map_metadata', '-1', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', '-fs', String((cfg.dureeMaxS + 1) * 32000 + 4096), '-f', 'wav', wav], { delaiMs: cfg.delaiFfmpegMs, sortieMax: 65536, cwd: dossier });
      if (f.absent) return { statut: 500, corps: { error: 'echec', etape: 'ffmpeg_absent' } };
      if (f.delai) return { statut: 504, corps: { error: 'delai', etape: 'ffmpeg' } };
      let tailleWav = 0; try { tailleWav = fs.statSync(wav).size; } catch (e) { tailleWav = 0; }
      if (f.code !== 0 || tailleWav <= 44) return { statut: 400, corps: { error: 'format' } };
      if ((tailleWav - 44) / 32000 > cfg.dureeMaxS + 0.5) return { statut: 413, corps: { error: 'trop_long' } };
      const duree = Math.min(cfg.dureeMaxS, Math.max(1, Math.ceil((tailleWav - 44) / 32000)));      // la durée RÉELLE (le WAV que ffmpeg a écrit), jamais celle que l'appareil a annoncée
      const args = ['-m', cfg.modele, '-f', wav, '-l', langue, '-t', String(cfg.threads), '-bs', String(cfg.faisceau), '-bo', String(cfg.faisceau), '-nt', '-np', '-oj', '-of', base];
      if (cfg.vad) args.push('--vad', '--vad-model', cfg.vad);
      const w = await lancer(cfg.whisper, args, { delaiMs: cfg.delaiWhisperBaseMs + duree * cfg.delaiWhisperParSMs, sortieMax: cfg.sortieMax, cwd: dossier });
      if (w.absent) return { statut: 500, corps: { error: 'echec', etape: 'whisper_absent' } };
      if (w.delai) return { statut: 504, corps: { error: 'delai', etape: 'whisper' } };
      /* tué par un signal (SIGKILL : le plafond de mémoire de l'unité) : le JOURNAL le dit (relecture du gardien, 11 octobre 2026 — sinon rien ne distinguait un débordement
         de mémoire d'un plantage) ; la réponse au service, elle, ne change pas */
      if (w.code !== 0) return { statut: 500, corps: { error: 'echec', etape: 'whisper' }, signal: w.signal };
      let j = null;
      try { const brut = fs.readFileSync(base + '.json'); if (brut.length <= cfg.sortieMax) j = JSON.parse(brut.toString('utf8')); } catch (e) { j = null; }
      if (!j || !Array.isArray(j.transcription)) return { statut: 500, corps: { error: 'echec', etape: 'sortie' } };
      const texte = nettoyerTexte(j.transcription.map(s => (s && typeof s.text === 'string' ? s.text : '')).join(' '));
      const lg = !texte ? null : j.result && typeof j.result.language === 'string' && /^[a-z]{2,3}$/.test(j.result.language) ? j.result.language : (langue !== 'auto' ? langue : null);      // un vocal sans parole n'a pas de langue
      return { statut: 200, corps: { ok: true, texte, langue: lg, ms: horloge() - t0 } };      // `ms` : pour le service ; le JOURNAL n'en garde que des secondes
    } finally {
      try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) { /* le tmpfs de l'unité part avec elle */ }
    }
  }

  function repondre(res, statut, corps) {
    const b = Buffer.from(JSON.stringify(corps));
    res.writeHead(statut, { 'content-type': 'application/json; charset=utf-8', 'content-length': b.length, 'cache-control': 'no-store' });
    res.end(b);
  }

  const serveur = http.createServer((req, res) => {
    if (!egalSecret(req.headers.authorization, cfg.secret)) { req.resume(); return repondre(res, 401, { error: 'non_autorise' }); }
    const url = String(req.url || '').split('?')[0];
    if (req.method === 'GET' && url === '/sante') { req.resume(); return repondre(res, 200, { ok: pret(), sha, occupe }); }
    if (req.method === 'POST' && url === '/quitter') { req.resume(); repondre(res, 200, { ok: true }); if (quitter) setImmediate(quitter); return; }
    if (req.method !== 'POST' || url !== '/transcrire') { req.resume(); return repondre(res, 404, { error: 'introuvable' }); }
    const langue = langueOuvrier(req.headers['x-langue'] || 'fr');
    const annonce = Number(req.headers['content-length']);
    if (Number.isFinite(annonce) && annonce > cfg.octetsMax) { req.resume(); return repondre(res, 413, { error: 'trop_lourd' }); }
    if (occupe) { req.resume(); return repondre(res, 503, { error: 'occupe' }); }
    occupe = true;
    const morceaux = []; let taille = 0, coupe = false;
    req.on('data', (d) => { if (coupe) return; taille += d.length; if (taille > cfg.octetsMax) { coupe = true; occupe = false; repondre(res, 413, { error: 'trop_lourd' }); req.destroy(); } else morceaux.push(d); });
    req.on('error', () => { if (!coupe) { coupe = true; occupe = false; } });
    req.on('end', async () => {
      if (coupe) return;
      if (!taille) { occupe = false; return repondre(res, 400, { error: 'format' }); }
      let r;
      try { r = await transcrire(Buffer.concat(morceaux), langue); }
      catch (e) { r = { statut: 500, corps: { error: 'echec', etape: 'interne' } }; }
      finally { occupe = false; }
      journal(r.statut === 200 ? (r.corps.texte ? 'ok' : 'vide') : r.corps.error + (r.corps.etape ? ':' + r.corps.etape : '') + (r.signal && /^SIG[A-Z0-9]+$/.test(r.signal) ? ':' + r.signal : ''), Math.round((r.corps.ms || 0) / 1000));      // des SECONDES : le temps de calcul suit la durée du vocal, le journal n'en dit pas plus
      repondre(res, r.statut, r.corps);
    });
  });
  serveur.requestTimeout = 0;               // un calcul peut durer : ce sont les délais de chaque programme qui bornent
  serveur.headersTimeout = 10000;
  return {
    serveur, transcrire, pret, nettoyerTexte,
    /* la socket : une ancienne (un arrêt brutal) est retirée avant d'écouter ; la neuve est en 0660 — le groupe de l'ouvrier, dont le service est membre, et personne d'autre */
    ecouter: () => new Promise((resolve, reject) => {
      serveur.once('error', reject);
      if (cfg.socket) {
        try { fs.unlinkSync(cfg.socket); } catch (e) { if (e.code !== 'ENOENT') return reject(e); }
        serveur.listen(cfg.socket, () => { try { fs.chmodSync(cfg.socket, 0o660); } catch (e) { return reject(e); } resolve(serveur.address()); });
      } else serveur.listen(cfg.port, cfg.hote, () => resolve(serveur.address()));
    }),
    fermer: () => new Promise((resolve) => serveur.close(() => resolve())),
    surQuitter: (f) => { quitter = f; },
  };
}

module.exports = { creerOuvrier, lireConfig, nettoyerTexte, langueOuvrier, PHRASES_FANTOMES, FORMATS };

if (require.main === module) {
  const chemin = process.env.OPMSG_TRANSCRIRE_CONFIG;
  if (!chemin) { process.stderr.write('OPMSG_TRANSCRIRE_CONFIG est obligatoire\n'); process.exit(2); }
  let cfg;
  try { cfg = lireConfig(chemin); } catch (e) { process.stderr.write(String(e.message) + '\n'); process.exit(2); }
  const journal = (issue, s) => process.stdout.write(JSON.stringify({ t: new Date().toISOString(), transcription: issue, s }) + '\n');
  const o = creerOuvrier(cfg, { journal });
  o.surQuitter(() => { o.fermer().then(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); });
  o.ecouter().then((a) => process.stdout.write(JSON.stringify({ t: new Date().toISOString(), demarre: true, socket: !!cfg.socket, pret: o.pret() }) + '\n'),
    (e) => { process.stderr.write('écoute impossible : ' + (e && e.code) + '\n'); process.exit(1); });
  for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { o.fermer().then(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); });
}
