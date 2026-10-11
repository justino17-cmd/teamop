/* ⛔ CE QUE CE FICHIER GARDE — L'OUVRIER DE TRANSCRIPTION ET LE MODULE QUI LUI PARLE (11 octobre 2026, « une transcription écrite, comme sur Instagram »).

   Deux pièces, montées SEULES, leurs dépendances remplacées (famille 1 : la logique d'une pièce) :
     1. `server-msg/transcripteur.js`, l'ouvrier, VRAIMENT lancé sur la boucle locale avec de FAUX `ffmpeg` et `whisper-cli` (des scripts qui notent leurs arguments
        et font ce qu'on leur demande : écrire un WAV, rendre un texte, échouer, traîner, laisser un enfant derrière eux) ;
     2. `server-msg/transcription.js`, le module du service : sa file, sa sonde, son appel — avec un faux `fetch`, un faux stockage, de fausses pièces.
   La couture des deux avec le service et la page, c'est `test-1000` ; l'installation, `test-1002` ; une vraie transcription par le vrai whisper.cpp, la sonde
   d'installation (`outils/verifier-transcription.js`) sur le VPS.

   Les contrôles marqués ⛔ gardent ce dont la perte ne se verrait pas :
     · L'OUVRIER REFUSE qui n'a pas le secret (la boucle locale est partagée par tous les processus de la machine) ;
     · RIEN DU CONTENU DANS LE JOURNAL (ni texte ni langue) et AUCUN FICHIER DE TRAVAIL NE RESTE (une voix en clair sur le disque) ;
     · UN PROGRAMME QUI TRAÎNE EST TUÉ AVEC SES ENFANTS (le délai tue le groupe) ; ffmpeg ne lit que des fichiers (`-protocol_whitelist file`) ;
     · UN TRAVAIL À LA FOIS, côté ouvrier (503) ET côté module (la file) ;
     · CE QUE WHISPER « ENTEND » DANS LE SILENCE ne devient pas un texte (« Merci d'avoir regardé ») ;
     · LE SECRET ne sort jamais : ni dans une erreur de configuration, ni dans `JSON.stringify` de la configuration du service, ni dans `/health` ;
     · `/health` NE CRIE PAS pour une sonde ratée isolée (un redémarrage), mais pour deux ; et jamais « ok » avant la première sonde réussie ;
     · L'OUVRIER D'UN CODE D'AVANT est prié de sortir (une fois par minute au plus, jamais pendant un travail). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const { creerOuvrier, lireConfig, nettoyerTexte } = require(path.join(T.SERVICE, 'transcripteur.js'));
const { creerTranscription } = require(path.join(T.SERVICE, 'transcription.js'));
const { transcriptionConfig } = require(path.join(T.SERVICE, 'config.js'));
const dort = (ms) => new Promise(r => setTimeout(r, ms));
setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const SECRET = 'S3cr3t-BANC-' + 'Qz'.repeat(20);          // 52 signes, hors du motif hexadécimal d'une empreinte
const TEXTE = 'Bonjour JETON-QWZK on se voit demain au chantier';
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-transcrire-'));
const travail = path.join(bac, 'run'); fs.mkdirSync(travail);
const ctl = path.join(bac, 'ctl'); fs.mkdirSync(ctl);
/* LE FAUX ffmpeg : il note ses arguments ; l'entrée « FORMAT-KO » ne se lit pas ; sinon il écrit un WAV de N secondes (« DUREE=N » dans l'entrée, 2 par défaut) */
const FFMPEG = path.join(bac, 'ffmpeg');
fs.writeFileSync(FFMPEG, `#!/bin/bash
printf '%s\\n' "$*" >> "${ctl}/ffmpeg.args"
in=""; prev=""; for a in "$@"; do [ "$prev" = "-i" ] && in="$a"; prev="$a"; out="$a"; done
grep -q FORMAT-KO "$in" && exit 1
n=$(grep -o 'DUREE=[0-9]*' "$in" | head -1 | cut -d= -f2); [ -n "$n" ] || n=2
head -c $((44 + n * 32000)) /dev/zero > "$out"
exit 0
`, { mode: 0o755 });
/* LE FAUX whisper-cli (node par son chemin absolu : l'ouvrier ne passe que PATH=/usr/bin:/bin aux programmes, et node n'y est pas toujours) : il note ses arguments et écrit <base>.json avec le texte du fichier de contrôle ; « ECHEC » sort en 1, « LENT » laisse un enfant et traîne, « JSON-KO » écrit n'importe quoi */
const WHISPER = path.join(bac, 'whisper-cli');
fs.writeFileSync(WHISPER, `#!/bin/bash
printf '%s\\n' "$*" >> "${ctl}/whisper.args"
base=""; prev=""; for a in "$@"; do [ "$prev" = "-of" ] && base="$a"; prev="$a"; done
mode=$(cat "${ctl}/mode" 2>/dev/null)
case "$mode" in
  ECHEC) exit 1 ;;
  LENT) sleep 300 & echo $! > "${ctl}/enfant.pid"; sleep 300 ;;
  JSON-KO) echo "pas du json" > "$base.json"; exit 0 ;;
esac
t=$(cat "${ctl}/texte" 2>/dev/null)
lg=$(cat "${ctl}/langue" 2>/dev/null); [ -n "$lg" ] || lg=fr
"${process.execPath}" -e 'process.stdout.write(JSON.stringify({ result: { language: process.argv[2] }, transcription: [{ text: " " + process.argv[1] }] }))' "$t" "$lg" > "$base.json"
`, { mode: 0o755 });
const MODELE = path.join(bac, 'modele.bin'); fs.writeFileSync(MODELE, 'faux modèle');
const VAD = path.join(bac, 'vad.bin'); fs.writeFileSync(VAD, 'faux vad');
const ecrireCtl = (n, t) => fs.writeFileSync(path.join(ctl, n), t);
const lireCtl = (n) => { try { return fs.readFileSync(path.join(ctl, n), 'utf8'); } catch (e) { return ''; } };
const viderCtl = () => { for (const f of fs.readdirSync(ctl)) fs.rmSync(path.join(ctl, f), { force: true }); };

function requete(port, methode, chemin, { corps, entetes } = {}) {
  return new Promise((ok) => {
    const q = http.request({ host: '127.0.0.1', port, method: methode, path: chemin, headers: Object.assign({}, entetes || {}, corps ? { 'content-length': corps.length } : {}) }, (r) => {
      let b = ''; r.on('data', d => { b += d; }); r.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (e) { j = null; } ok({ statut: r.statusCode, json: j }); });
    });
    q.on('error', (e) => ok({ statut: 0, erreur: e.code }));
    if (corps) q.end(corps); else q.end();
  });
}
const AUTH = { authorization: 'Bearer ' + SECRET };

(async () => {
  try {
    /* ═══ 1. LA CONFIGURATION DE L'OUVRIER ═══════════════════════════════════════════════════════════════════ */
    console.log('\n── 1001 · la configuration de l\'ouvrier');
    const cfgOk = { secret: SECRET, port: 7860, whisper: WHISPER, modele: MODELE, ffmpeg: FFMPEG, vad: VAD };
    const fcfg = (o) => { const p = path.join(bac, 'cfg-' + Math.random().toString(36).slice(2) + '.json'); fs.writeFileSync(p, JSON.stringify(o)); return p; };
    const lu = lireConfig(fcfg(cfgOk));
    v('une configuration complète se lit, avec ses défauts (2 cœurs, faisceau 1, la boucle locale)', [lu.port, lu.threads, lu.faisceau, lu.hote, lu.dureeMaxS], [7860, 2, 1, '127.0.0.1', 600]);
    const erreurs = [];
    for (const [nom, o] of [['sans secret', Object.assign({}, cfgOk, { secret: undefined })], ['secret court', Object.assign({}, cfgOk, { secret: 'court' })], ['port privilégié', Object.assign({}, cfgOk, { port: 80 })],
      ['chemin relatif', Object.assign({}, cfgOk, { whisper: 'whisper-cli' })], ['cœurs hors bornes', Object.assign({}, cfgOk, { threads: 64 })], ['vad relatif', Object.assign({}, cfgOk, { vad: 'vad.bin' })],
      ['secret ET port faux', Object.assign({}, cfgOk, { port: 'x', secret: SECRET + '!' })]]) {
      try { lireConfig(fcfg(o)); erreurs.push(nom + ':acceptee'); } catch (e) { erreurs.push(e.code === 'CONFIG' ? (String(e.message).includes(SECRET) ? nom + ':FUITE' : 'refusee') : nom + ':' + e.code); }
    }
    v('⛔ chaque configuration fausse est refusée, et AUCUN message d\'erreur ne cite le secret', erreurs, Array(7).fill('refusee'));

    /* ═══ 2. CE QUE WHISPER « ENTEND » DANS LE SILENCE ═════════════════════════════════════════════════════════ */
    console.log('\n── 1001 · le nettoyage du texte');
    v('⛔ un générique de vidéo appris par le modèle, seul, ne devient pas un texte', ['Sous-titres réalisés par la communauté d\'Amara.org', 'Merci d\'avoir regardé !', ' [BLANK_AUDIO] ', '♪♪', 'Thank you.', '(Musique)'].map(nettoyerTexte), ['', '', '', '', '', '']);
    v('le même mot au milieu d\'un vrai message reste', nettoyerTexte('Merci d\'avoir regardé le devis, je passe demain'), 'Merci d\'avoir regardé le devis, je passe demain');
    v('les annotations et les caractères de contrôle partent, les espaces se resserrent', nettoyerTexte('  Bonjour\u0007 [silence]  à   demain  '), 'Bonjour à demain');

    /* ═══ 3. L'OUVRIER, VRAIMENT LANCÉ ═══════════════════════════════════════════════════════════════════════ */
    console.log('\n── 1001 · l\'ouvrier sur la boucle locale (faux ffmpeg, faux whisper-cli)');
    const port = await T.portLibre();
    const journalOuvrier = [];
    const cfg = lireConfig(fcfg(Object.assign({}, cfgOk, { port, delaiWhisperBaseMs: 1500, delaiWhisperParSMs: 0, octetsMax: 65536, dureeMaxS: 60 })));
    const o = creerOuvrier(cfg, { journal: (issue, ms) => journalOuvrier.push(JSON.stringify({ issue, ms })), dossierTravail: travail });
    let quitte = 0; o.surQuitter(() => { quitte++; });
    await o.ecouter();

    v('⛔ sans secret : 401, et rien ne se calcule', (await requete(port, 'GET', '/sante')).statut, 401);
    v('⛔ un secret faux : 401', (await requete(port, 'GET', '/sante', { entetes: { authorization: 'Bearer ' + SECRET.slice(0, -1) + 'x' } })).statut, 401);
    v('⛔ un transcrire sans secret : 401, et ffmpeg n\'a pas été lancé', [(await requete(port, 'POST', '/transcrire', { corps: Buffer.from('DUREE=2') })).statut, lireCtl('ffmpeg.args')], [401, '']);
    const s1 = await requete(port, 'GET', '/sante', { entetes: AUTH });
    v('avec le secret, la sonde répond : prête, libre, et l\'empreinte du code qui la porte', [s1.statut, s1.json && s1.json.ok, s1.json && s1.json.occupe, typeof (s1.json && s1.json.sha)], [200, true, false, 'string']);
    fs.renameSync(MODELE, MODELE + '.parti');
    v('le modèle absent : la sonde dit « pas prête »', (await requete(port, 'GET', '/sante', { entetes: AUTH })).json.ok, false);
    fs.renameSync(MODELE + '.parti', MODELE);
    v('une adresse inconnue : 404', (await requete(port, 'GET', '/autre', { entetes: AUTH })).statut, 404);

    viderCtl(); ecrireCtl('texte', TEXTE); ecrireCtl('langue', 'fr');
    const r1 = await requete(port, 'POST', '/transcrire', { corps: Buffer.from('VOCAL DUREE=3'), entetes: Object.assign({ 'x-langue': 'fr' }, AUTH) });
    v('un vocal se transcrit : le texte, la langue', [r1.statut, r1.json && r1.json.ok, r1.json && r1.json.texte, r1.json && r1.json.langue], [200, true, TEXTE, 'fr']);
    const aF = lireCtl('ffmpeg.args'), aW = lireCtl('whisper.args');
    vrai('⛔ ffmpeg ne lit que des fichiers locaux (`-protocol_whitelist file`), sans vidéo, sans métadonnées, en 16 kHz mono', /-protocol_whitelist file /.test(aF) && /-vn -sn -dn -map_metadata -1 -ar 16000 -ac 1 /.test(aF) && /-nostdin/.test(aF));
    vrai('whisper reçoit la langue, 2 cœurs, un faisceau de 1, la détection de parole, et rend du JSON', / -l fr /.test(aW) && / -t 2 /.test(aW) && / -bs 1 -bo 1 /.test(aW) && /--vad --vad-model /.test(aW) && / -oj /.test(aW));
    v('⛔ aucun fichier de travail ne reste (une voix en clair sur le disque)', fs.readdirSync(travail), []);
    vrai('⛔ le journal dit l\'issue et le temps — jamais le texte ni la langue', journalOuvrier.length === 1 && /"issue":"ok"/.test(journalOuvrier[0]) && !journalOuvrier.join().includes('JETON-QWZK') && !/"fr"/.test(journalOuvrier.join()));

    viderCtl(); ecrireCtl('texte', TEXTE);
    await requete(port, 'POST', '/transcrire', { corps: Buffer.from('DUREE=1'), entetes: Object.assign({ 'x-langue': 'fr;rm -rf /' }, AUTH) });
    vrai('une langue illisible devient « fr » (rien d\'autre n\'atteint les arguments de whisper)', / -l fr /.test(lireCtl('whisper.args')) && !/rm -rf/.test(lireCtl('whisper.args')));

    viderCtl(); ecrireCtl('texte', '[BLANK_AUDIO]');
    const rv = await requete(port, 'POST', '/transcrire', { corps: Buffer.from('DUREE=2'), entetes: AUTH });
    v('⛔ un vocal sans parole : texte VIDE, et pas de langue (un texte inventé serait pire qu\'aucun)', [rv.statut, rv.json.texte, rv.json.langue], [200, '', null]);
    viderCtl(); ecrireCtl('texte', 'Merci d\'avoir regardé');
    v('⛔ ce que whisper entend dans le silence, seul : texte vide', (await requete(port, 'POST', '/transcrire', { corps: Buffer.from('DUREE=2'), entetes: AUTH })).json.texte, '');

    viderCtl();
    v('un fichier que ffmpeg ne sait pas lire : 400 « format », et whisper n\'est pas lancé', [(await requete(port, 'POST', '/transcrire', { corps: Buffer.from('FORMAT-KO'), entetes: AUTH })).json, lireCtl('whisper.args')], [{ error: 'format' }, '']);
    v('un corps vide : 400', (await requete(port, 'POST', '/transcrire', { corps: Buffer.alloc(0), entetes: Object.assign({ 'content-length': 0 }, AUTH) })).statut, 400);
    v('⛔ un corps plus lourd que le plafond : 413, annoncé ou non', [(await requete(port, 'POST', '/transcrire', { corps: Buffer.alloc(70000, 65), entetes: AUTH })).statut], [413]);
    viderCtl(); ecrireCtl('mode', 'ECHEC');
    v('whisper qui échoue : 500, et l\'étape est nommée', (await requete(port, 'POST', '/transcrire', { corps: Buffer.from('DUREE=1'), entetes: AUTH })).json, { error: 'echec', etape: 'whisper' });
    viderCtl(); ecrireCtl('mode', 'JSON-KO');
    v('une sortie illisible : 500 « sortie »', (await requete(port, 'POST', '/transcrire', { corps: Buffer.from('DUREE=1'), entetes: AUTH })).json, { error: 'echec', etape: 'sortie' });

    viderCtl(); ecrireCtl('mode', 'LENT');
    const lent = requete(port, 'POST', '/transcrire', { corps: Buffer.from('DUREE=1'), entetes: AUTH });
    await T.attendre(() => lireCtl('enfant.pid'), 4000, 20);
    const occ = await requete(port, 'POST', '/transcrire', { corps: Buffer.from('DUREE=1'), entetes: AUTH });
    const sOcc = await requete(port, 'GET', '/sante', { entetes: AUTH });
    v('⛔ un travail à la fois : le deuxième reçoit 503 « occupe », et la sonde le dit', [occ.statut, occ.json && occ.json.error, sOcc.json.occupe], [503, 'occupe', true]);
    const rl = await lent;
    v('whisper qui traîne au-delà de son délai : 504 « delai »', rl.json, { error: 'delai', etape: 'whisper' });
    const pidEnfant = Number(lireCtl('enfant.pid'));
    /* mort = plus là, ou zombie (tué, pas encore ramassé par son nouveau parent) ; on laisse au noyau le temps de livrer le signal */
    const mort = () => { try { process.kill(pidEnfant, 0); } catch (e) { return true; } try { return /^\d+ \(.*\) Z /.test(fs.readFileSync('/proc/' + pidEnfant + '/stat', 'utf8')); } catch (e) { return true; } };
    vrai('⛔ l\'enfant qu\'il avait lancé est tué avec lui (le délai tue le GROUPE de processus)', pidEnfant > 0 && await T.attendre(mort, 3000, 20));
    v('et l\'ouvrier est de nouveau libre', (await requete(port, 'GET', '/sante', { entetes: AUTH })).json.occupe, false);
    v('⛔ aucun fichier de travail ne reste, même après un délai', fs.readdirSync(travail), []);

    v('« quitter » répond, puis l\'ouvrier sort (le service le demande quand il tourne sur un code d\'avant)', [(await requete(port, 'POST', '/quitter', { entetes: AUTH })).statut, await T.attendre(() => quitte === 1, 2000, 10)], [200, true]);
    await o.fermer();

    /* ═══ 4. LA CONFIGURATION CÔTÉ SERVICE ═══════════════════════════════════════════════════════════════════ */
    console.log('\n── 1001 · la configuration du service (`transcription`)');
    v('sans bloc : pas de transcription', transcriptionConfig({}, 'beta'), null);
    const tc = transcriptionConfig({ transcription: { url: 'http://127.0.0.1:7860/', secret: SECRET } }, 'prod');
    v('un bloc complet : l\'adresse, et les défauts (5 min au plus, 8 en file, 3 essais, 30 par heure)', [tc.url, tc.dureeMaxS, tc.file, tc.essais, tc.parHeure], ['http://127.0.0.1:7860', 300, 8, 3, 30]);
    vrai('⛔ le secret se lit mais ne se sérialise pas (`JSON.stringify`, `Object.keys`)', tc.secret === SECRET && !JSON.stringify(tc).includes(SECRET) && !Object.keys(tc).includes('secret'));
    const refus = [];
    for (const t of [{ url: 'http://10.0.0.4:7860', secret: SECRET }, { url: 'https://127.0.0.1:7860', secret: SECRET }, { url: 'http://127.0.0.1:80', secret: SECRET }, { url: 'http://127.0.0.1:7860', secret: 'court' },
      { url: 'http://127.0.0.1:7860', secret: SECRET, dureeMaxS: 3600 }, { url: 'http://exemple.fr:7860', secret: SECRET }]) {
      try { transcriptionConfig({ transcription: t }, 'prod'); refus.push('acceptee'); } catch (e) { refus.push(String(e.message).includes(SECRET) ? 'FUITE' : 'refusee'); }
    }
    v('⛔ une adresse hors de la boucle locale, un secret faux, une borne dépassée : refusés, sans citer le secret', refus, Array(6).fill('refusee'));

    /* ═══ 5. LE MODULE DU SERVICE ═══════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 1001 · le module du service : sa sonde, sa file, son appel');
    const inerte = creerTranscription({ cfg: null });
    v('sans configuration : rien ne se propose, rien ne part, et /health le dit', [inerte.configure, inerte.actif(), inerte.placeLibre(), inerte.mettreEnFile({ conv: 'c', seq: 1 }), inerte.sante()],
      [false, false, false, false, { configuree: false, ok: false, file: 0, faites: 0, vides: 0, echecs: 0, echecsSonde: 0 }]);

    /* un faux fetch : `/sante` répond ce qu'on lui dit ; `/transcrire` est RETENU jusqu'à ce que le banc le relâche */
    const appels = [], tenus = [];
    let santeRep = { statut: 200, json: { ok: true, sha: 'abc1234', occupe: false } };
    const appeler = async (url, init) => {
      const chemin = url.replace('http://127.0.0.1:7860', ''), h = init.headers || {};
      appels.push({ chemin, methode: init.method, auth: h.authorization, langue: h['x-langue'], signal: !!init.signal, corps: init.body ? Buffer.from(init.body).toString() : null });
      if (chemin === '/sante') { if (santeRep === 'panne') throw new TypeError('fetch failed'); return new Response(JSON.stringify(santeRep.json), { status: santeRep.statut }); }
      if (chemin === '/quitter') return new Response('{"ok":true}', { status: 200 });
      return new Promise((ok) => tenus.push(ok));
    };
    const poses = [], reveils = [];
    const stockage = { transcriptionPoser: (x) => { poses.push(x); return { gid: x.seq === 99 ? 0 : 10 + poses.length }; }, transcriptionsInterrompues: () => { stockage.repris = (stockage.repris || 0) + 1; return 2; } };
    const pieces = { lire: async function* (id) { if (id === 'f_lourd') { yield Buffer.alloc(800); yield Buffer.alloc(800); return; } yield Buffer.from('OCTETS-' + id); } };
    let maintenant = 1000000;
    const journal = [];
    const M = creerTranscription({ cfg: { url: 'http://127.0.0.1:7860', secret: SECRET, dureeMaxS: 300, file: 2, essais: 3, parHeure: 30, sondeMs: 3600000, delaiSondeMs: 1000, delaiBaseMs: 1000, delaiParSMs: 10 },
      stockage, pieces, hub: { reveiller: (x) => reveils.push(x.conv) }, octetsMax: 1000, sha: 'abc1234', horloge: () => maintenant, appeler, journal: (x) => journal.push(x) });
    v('configurée, mais jamais « active » ni « ok » avant la première sonde réussie', [M.configure, M.actif(), M.sante().ok], [true, false, false]);
    await M.sonder();
    v('la sonde répond : active, ok', [M.actif(), M.sante().ok], [true, true]);
    vrai('⛔ la sonde présente le secret, et seulement dans l\'en-tête', appels[0].auth === 'Bearer ' + SECRET && appels[0].chemin === '/sante');
    santeRep = 'panne'; await M.sonder();
    v('⛔ une sonde ratée isolée (un redémarrage) : plus « active » (rien ne part vers elle), mais /health ne crie pas encore', [M.actif(), M.sante().ok, M.sante().echecsSonde], [false, true, 1]);
    await M.sonder();
    v('deux sondes ratées de suite : /health dit « pas ok »', [M.sante().ok, M.sante().echecsSonde], [false, 2]);
    santeRep = { statut: 200, json: { ok: true, sha: 'abc1234', occupe: false } }; await M.sonder();
    v('elle revient : tout repart', [M.actif(), M.sante().ok, M.sante().echecsSonde], [true, true, 0]);
    const s = JSON.stringify(M.sante());
    v('⛔ /health est publique : des nombres et des booléens, rien d\'autre (ni adresse, ni secret)', [Object.keys(M.sante()), s.includes(SECRET) || s.includes('127.0.0.1')], [['configuree', 'ok', 'file', 'faites', 'vides', 'echecs', 'echecsSonde'], false]);

    /* la file : un travail à la fois, les doublons ignorés, la place comptée (le travail en cours compris) */
    const nAvant = appels.length;
    M.mettreEnFile({ conv: 'c_a', seq: 1, piece: 'f_un', dur: 4, langue: 'fr-FR' });
    M.mettreEnFile({ conv: 'c_a', seq: 1, piece: 'f_un', dur: 4, langue: 'fr-FR' });
    M.mettreEnFile({ conv: 'c_a', seq: 2, piece: 'f_deux', dur: 2, langue: 'zz-ZZ!' });
    await T.attendre(() => tenus.length === 1, 2000, 5);
    await dort(30);
    v('⛔ un travail à la fois : un seul appel à l\'ouvrier part, le doublon n\'est pas mis en file', [tenus.length, M.sante().file], [1, 2]);
    v('la file pleine (2, le travail en cours compris) : plus de place', M.placeLibre(), false);
    const t1 = appels.slice(nAvant).find(a => a.chemin === '/transcrire');
    vrai('l\'appel porte les octets de LA pièce, le secret, la langue de l\'auteur (« fr-FR » → « fr »), et un délai', t1.corps === 'OCTETS-f_un' && t1.auth === 'Bearer ' + SECRET && t1.langue === 'fr' && t1.signal);
    tenus.shift()(new Response(JSON.stringify({ ok: true, texte: '  ' + TEXTE + ' ', langue: 'fr' }), { status: 200 }));
    await T.attendre(() => tenus.length === 1, 2000, 5);
    v('le premier fini : son texte est posé (rogné) et la conversation réveillée ; le second part ALORS', [poses[0], reveils, tenus.length], [{ conv: 'c_a', seq: 1, etat: 'prete', texte: TEXTE, langue: 'fr' }, ['c_a'], 1]);
    const t2 = appels.filter(a => a.chemin === '/transcrire')[1];
    v('une langue illisible chez l\'auteur part en « fr »', t2.langue, 'fr');
    tenus.shift()(new Response(JSON.stringify({ ok: true, texte: '', langue: null }), { status: 200 }));
    await T.attendre(() => poses.length === 2, 2000, 5);
    v('un texte vide : « vide »', [poses[1].etat, poses[1].texte], ['vide', null]);

    M.mettreEnFile({ conv: 'c_b', seq: 3, piece: 'f_trois', dur: 2 });
    await T.attendre(() => tenus.length === 1, 2000, 5);
    tenus.shift()(new Response(JSON.stringify({ error: 'delai', etape: 'whisper' }), { status: 504 }));
    await T.attendre(() => poses.length === 3, 2000, 5);
    v('un délai de l\'ouvrier (504) : « échec » — l\'ouvrier, lui, reste actif (un vocal long ne dit rien de sa santé)', [poses[2].etat, M.actif()], ['echec', true]);
    M.mettreEnFile({ conv: 'c_b', seq: 4, piece: 'f_quatre', dur: 2 });
    await T.attendre(() => tenus.length === 1, 2000, 5);
    tenus.shift()(new Response(JSON.stringify({ error: 'echec', etape: 'whisper_absent' }), { status: 500 }));
    await T.attendre(() => poses.length === 4, 2000, 5);
    v('une panne de l\'ouvrier (500) : « échec », et il n\'est plus actif jusqu\'à la prochaine sonde', [poses[3].etat, M.actif()], ['echec', false]);
    await M.sonder();
    M.mettreEnFile({ conv: 'c_b', seq: 5, piece: 'f_lourd', dur: 2 });
    await T.attendre(() => poses.length === 5, 2000, 5);
    v('⛔ une pièce plus lourde que le plafond d\'un vocal n\'est pas envoyée : « échec », l\'ouvrier reste actif', [poses[4].etat, M.actif(), tenus.length], ['echec', true, 0]);
    M.mettreEnFile({ conv: 'c_b', seq: 99, piece: 'f_parti', dur: 2 });
    await T.attendre(() => tenus.length === 1, 2000, 5);
    const nReveils = reveils.length;
    tenus.shift()(new Response(JSON.stringify({ ok: true, texte: 'x', langue: 'fr' }), { status: 200 }));
    await T.attendre(() => poses.length === 6, 2000, 5); await dort(20);
    v('un vocal supprimé pendant le calcul (le stockage n\'a rien posé) : personne n\'est réveillé', reveils.length, nReveils);
    v('le journal du module : des issues, jamais un texte', [journal.filter(x => !['prete', 'vide', 'echec'].includes(x)), journal.some(x => String(x).includes('JETON-QWZK'))], [[], false]);

    /* l'ouvrier d'un code d'AVANT : prié de sortir — une fois par minute au plus, jamais pendant un travail */
    santeRep = { statut: 200, json: { ok: true, sha: 'def5678', occupe: false } };
    const nq = () => appels.filter(a => a.chemin === '/quitter').length;
    await M.sonder();
    v('⛔ l\'ouvrier tourne sur un autre code que le service : prié de sortir (systemd le relance sur le code déployé), et pas « actif » d\'ici là', [nq(), M.actif()], [1, false]);
    await M.sonder();
    v('une seconde sonde dans la minute ne le redemande pas', nq(), 1);
    maintenant += 61000;
    M.mettreEnFile({ conv: 'c_c', seq: 6, piece: 'f_six', dur: 2 });
    await T.attendre(() => tenus.length === 1, 2000, 5);
    await M.sonder();
    v('⛔ pendant un travail, on ne le prie pas de sortir (le calcul serait perdu)', nq(), 1);
    tenus.shift()(new Response(JSON.stringify({ ok: true, texte: 'x', langue: 'fr' }), { status: 200 }));
    await T.attendre(() => poses.length === 7, 2000, 5); await dort(20);
    await M.sonder();
    v('le travail fini, il l\'est', nq(), 2);

    M.demarrer();
    v('au démarrage : les calculs interrompus par un arrêt passent en échec (dits, retentables)', stockage.repris, 1);
    M.arreter();
    v('arrêté : plus rien ne se met en file', M.mettreEnFile({ conv: 'c_d', seq: 7, piece: 'f_sept', dur: 1 }), false);
  } catch (e) {
    console.log('  ✗ le banc a jeté : ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) { /* déjà parti */ }
  }
  fin();
})();
