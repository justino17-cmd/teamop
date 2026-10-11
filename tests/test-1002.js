/* ⛔ CE QUE CE FICHIER GARDE — QUE `install-transcription.sh` POSE UN OUVRIER DE TRANSCRIPTION QUI FAIT CE QU'IL DOIT, SANS JAMAIS AFFICHER NI FAIRE FUIR LE SECRET, ET QU'IL ÉCHOUE FERMÉ.

   `server-msg/install-transcription.sh` (le geste de Justin sur le VPS) est JOUÉ ici de bout en bout dans un bac à sable : une racine factice (`OPMSG_RACINE`), un PATH réduit,
   de FAUX binaires qui notent chaque appel (arguments ET environnement) — `git` et `cmake` (une compilation qui produit un faux whisper-cli), `curl` (de faux modèles),
   `apt-get` (un faux ffmpeg), `systemctl`, `useradd`… — et un faux /health de l'instance. Mais l'OUVRIER est le VRAI (`transcripteur.js`, démarré par le faux systemctl) et
   le CONTRÔLE est le VRAI (`outils/verifier-transcription.js`) : ce que le script prouve avant d'ouvrir quoi que ce soit est vraiment prouvé, contre le vrai protocole.

   Ce qu'on prouve, et pourquoi chaque ligne existe :
     1. ⛔ LE SECRET : tiré au hasard, ÉCRIT dans les deux configurations (l'instance 0600, l'ouvrier 0640) — le MÊME des deux côtés — et ABSENT de la sortie du script, de chaque
        argument et de l'environnement de chaque binaire qu'il a lancé. Le même, REPRIS, à la seconde exécution.
     2. ⛔ CE QUI EST COMPILÉ ET TÉLÉCHARGÉ : le commit récupéré doit être le commit épinglé (sinon rien n'est compilé ni écrit) ; un modèle qui ne porte pas son empreinte n'est
        pas gardé ; tout passe en https, redirections comprises.
     3. ⛔ LE BAC À SABLE DE L'UNITÉ : aucune sortie réseau (IPAddressDeny=any, la boucle locale seule), disque en lecture seule, aucun privilège, fichiers de travail en mémoire
        vive, mémoire et calcul bornés, données des instances inaccessibles.
     4. ⛔ L'ORDRE : l'ouvrier démarré → contrôlé (le vrai contrôle, contre le vrai ouvrier) → l'instance relancée → elle voit l'ouvrier. Jamais l'instance avant la preuve.
     5. ⛔ ÉCHEC = FERMÉ, à CHAQUE étape : la transcription est retirée (configuration de l'instance remise octet pour octet à une première installation, ouvrier arrêté, sa
        configuration effacée), l'instance relancée sans elle si elle l'avait chargée.
     6. ⛔ RIEN N'EST POSÉ sur une machine trop petite, ni sous une version du service d'avant la transcription.
     7. ⛔ REJOUABLE : deux exécutions de suite laissent le MÊME disque, et la seconde ne recompile rien, ne retélécharge rien, ne relance ni l'ouvrier ni l'instance.
     8. « retirer » défait tout ; deux INSTANCES ont deux secrets, deux comptes, deux configurations. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http'), net = require('net');
const { spawn, spawnSync } = require('child_process');
const { banc, sansCommentaires, RACINE } = require('./bac-messages.js');
const { reel } = require('./bac-turn.js');
const t = banc();
const { v, vrai } = t;
const SCRIPT = path.join(RACINE, 'server-msg', 'install-transcription.sh');
const lire = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } };
const RE_SECRET = /^[A-Za-z0-9_-]{32,128}$/;
const COMMIT = 'd1be6fde11ac6e0407606b4e42fe72d34add8037';
const W_REL = 'opt/opmsg/whisper/1.9.5-d1be6fde11ac';
console.log('\n── 1002 · install-transcription.sh, joué dans un bac à sable ──');

const OUTILS_REELS = ['bash', 'sh', 'sed', 'cp', 'mv', 'rm', 'mkdir', 'chmod', 'ln', 'cat', 'cmp', 'dirname', 'tr', 'cut', 'head', 'tail', 'grep', 'awk', 'sha256sum', 'mktemp', 'seq', 'printf', 'setsid'];
const PROLOGUE = '#!/bin/bash\nE="$BAC_ETAT"; echo "${0##*/} $*" >> "$E/appels.log"; export -p >> "$E/env.log"\n';
function fauxOutils(b) {
  const NODE = process.execPath;
  return {
    /* systemctl : l'unité de l'OUVRIER démarre le VRAI transcripteur.js (sa configuration lue telle que le script l'a écrite, les chemins posés sous la racine factice) ;
       celle de l'INSTANCE note la configuration qu'elle a LUE à son redémarrage */
    systemctl: PROLOGUE + `cmd="$1"; shift || true
[ "\${1:-}" = "--quiet" ] && shift
unite="\${1:-}"
case "$cmd" in
  is-active)
    case "$unite" in
      opmsg-transcrire@*) p=$(cat "$E/pid-$unite" 2>/dev/null); [ -n "$p" ] && kill -0 "$p" 2>/dev/null ;;
      teamop-msg@*) [ -f "$E/unite-actif" ] ;;
      *) false ;;
    esac ;;
  restart|start)
    case "$unite" in
      opmsg-transcrire@*)
        i="\${unite#opmsg-transcrire@}"
        p=$(cat "$E/pid-$unite" 2>/dev/null); [ -n "$p" ] && kill "$p" 2>/dev/null; rm -f "$E/pid-$unite"
        [ -f "$BAC_R/etc/systemd/system/opmsg-transcrire@.service" ] || exit 1
        [ -f "$E/ouvrier-refuse" ] && exit 1
        "${NODE}" -e 'const fs=require("fs"),[f,r,o]=process.argv.slice(1);const c=JSON.parse(fs.readFileSync(f,"utf8"));for(const k of ["whisper","modele","vad","ffmpeg"]) if(c[k]) c[k]=r+c[k];fs.writeFileSync(o,JSON.stringify(c));' "$BAC_R/etc/opmsg/transcrire-$i.json" "$BAC_R" "$E/ouvrier-$i.json" || exit 1
        mkdir -p "$E/run-$i"
        OPMSG_TRANSCRIRE_CONFIG="$E/ouvrier-$i.json" RUNTIME_DIRECTORY="$E/run-$i" setsid "${NODE}" "$BAC_R/opt/opmsg/$i/current/transcripteur.js" >> "$E/ouvrier-$i.log" 2>&1 < /dev/null &
        echo $! > "$E/pid-$unite"
        for _ in $(seq 1 100); do grep -q '"demarre":true' "$E/ouvrier-$i.log" 2>/dev/null && break; grep -q 'impossible\\|illisible\\|obligatoire' "$E/ouvrier-$i.log" 2>/dev/null && break; "${NODE}" -e 'setTimeout(()=>{},30)'; done ;;
      teamop-msg@*) i="\${unite#teamop-msg@}"; : > "$E/unite-actif"; cp "$BAC_R/etc/opmsg/$i.json" "$E/config-lue-$i.json" ;;
    esac ;;
  stop)
    case "$unite" in opmsg-transcrire@*) p=$(cat "$E/pid-$unite" 2>/dev/null); [ -n "$p" ] && kill "$p" 2>/dev/null; rm -f "$E/pid-$unite" ;; esac ;;
  *) : ;;
esac
`,
    /* git : un dépôt factice — « git-refuse » : le réseau ne joint pas GitHub ; « git-autre-commit » : le dépôt rend un AUTRE commit que celui demandé */
    git: PROLOGUE + `if [ "$1" = "init" ]; then mkdir -p "\${@: -1}"; exit 0; fi
[ "$1" = "-C" ] && { d="$2"; shift 2; }
case "$1" in
  remote) exit 0 ;;
  fetch) [ -f "$E/git-refuse" ] && { echo "fatal: unable to access" >&2; exit 128; }
         mkdir -p "$d/samples"; cp "$E/jfk.wav" "$d/samples/jfk.wav"; echo "MIT (factice)" > "$d/LICENSE"
         c="\${@: -1}"; [ -f "$E/git-autre-commit" ] && c=0000000000000000000000000000000000000000; echo "$c" > "$d/.commit"; exit 0 ;;
  checkout) exit 0 ;;
  rev-parse) cat "$d/.commit" ;;
esac
`,
    /* cmake : la configuration, puis une « compilation » qui pose le faux whisper-cli dans build/bin */
    cmake: PROLOGUE + `if [ "$1" = "--build" ]; then [ -f "$E/build-refuse" ] && { echo "error: compilation simulée en échec" >&2; exit 2; }; mkdir -p "$2/bin"; cp "$E/whisper-cli" "$2/bin/whisper-cli"; chmod 755 "$2/bin/whisper-cli"; exit 0; fi
[ -f "$E/cmake-refuse" ] && { echo "CMake Error simulée" >&2; exit 1; }
exit 0
`,
    'g++': PROLOGUE, make: PROLOGUE,
    /* curl : un modèle factice, servi d'après le nom demandé — « curl-refuse » : huggingface injoignable */
    curl: PROLOGUE + `[ -f "$E/curl-refuse" ] && exit 22
o=""; u=""; while [ $# -gt 0 ]; do if [ "$1" = "-o" ]; then o="$2"; shift; fi; u="$1"; shift; done
[ -n "$o" ] || exit 2
cp "$E/modeles/\${u##*/}" "$o"
`,
    /* apt-get : il « installe » ffmpeg (le faux, qui écrit un WAV) — « apt-refuse » : le paquet ne s'installe pas */
    'apt-get': PROLOGUE + `[ -f "$E/apt-refuse" ] && exit 100
for a in "$@"; do if [ "$a" = "ffmpeg" ]; then mkdir -p "$BAC_R/usr/bin"; cp "$E/ffmpeg" "$BAC_R/usr/bin/ffmpeg"; chmod 755 "$BAC_R/usr/bin/ffmpeg"; fi; done
exit 0
`,
    useradd: PROLOGUE + `n=""; for a in "$@"; do n="$a"; done; : > "$E/compte-$n"
`,
    chown: PROLOGUE, sleep: PROLOGUE,
    nproc: PROLOGUE + 'echo 4\n',
    df: PROLOGUE + `echo "Filesystem 1048576-blocks Used Available Capacity Mounted on"; echo "/dev/vda1 80000 10000 $(cat "$E/disque-libre" 2>/dev/null || echo 50000) 20% /"
`,
    id: `#!/bin/bash
E="$BAC_ETAT"
if [ "$1" = "-u" ] && [ -n "\${2:-}" ]; then case "$2" in opmsg-transcrire-*) [ -f "$E/compte-$2" ] && { echo 996; exit 0; }; exit 1 ;; esac; fi
exec "${reel('id') || '/usr/bin/id'}" "$@"
`,
  };
}

function bac() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'opmsg-transcrire-'));
  const b = { d, R: path.join(d, 'racine'), E: path.join(d, 'etat'), bin: path.join(d, 'bin'), serveurs: [], ports: {} };
  for (const x of [b.R, b.E, b.bin, path.join(b.E, 'modeles')]) fs.mkdirSync(x, { recursive: true });
  for (const o of OUTILS_REELS) { const p = reel(o); if (p) fs.symlinkSync(p, path.join(b.bin, o)); }
  fs.symlinkSync(process.execPath, path.join(b.bin, 'node'));
  for (const [nom, txt] of Object.entries(fauxOutils(b))) fs.writeFileSync(path.join(b.bin, nom), txt, { mode: 0o755 });
  /* le faux ffmpeg (il écrit un WAV de 2 s) et le faux whisper-cli (il rend la phrase de l'échantillon — ou celle de « whisper-texte ») : ceux que le VRAI ouvrier lancera */
  fs.writeFileSync(path.join(b.E, 'ffmpeg'), `#!/bin/bash\nout=""; for a in "$@"; do out="$a"; done; head -c 64044 /dev/zero > "$out"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(b.E, 'whisper-cli'), `#!/bin/bash
base=""; prev=""; for a in "$@"; do [ "$prev" = "-of" ] && base="$a"; prev="$a"; done
t="And so, my fellow Americans, ask not what your country can do for you"
[ -f "${b.E}/whisper-texte" ] && t=$(cat "${b.E}/whisper-texte")
"${process.execPath}" -e 'process.stdout.write(JSON.stringify({ result: { language: "en" }, transcription: [{ text: process.argv[1] }] }))' "$t" > "$base.json"
`, { mode: 0o755 });
  fs.writeFileSync(path.join(b.E, 'jfk.wav'), 'RIFF-faux-echantillon');
  b.modeles = { small: Buffer.from('modele-small-factice-' + crypto.randomBytes(8).toString('hex')), vad: Buffer.from('vad-factice-' + crypto.randomBytes(8).toString('hex')) };
  fs.writeFileSync(path.join(b.E, 'modeles', 'ggml-small-q5_1.bin'), b.modeles.small);
  fs.writeFileSync(path.join(b.E, 'modeles', 'ggml-silero-v6.2.0.bin'), b.modeles.vad);
  b.emp = { small: crypto.createHash('sha256').update(b.modeles.small).digest('hex'), vad: crypto.createHash('sha256').update(b.modeles.vad).digest('hex') };
  fs.writeFileSync(path.join(b.E, 'meminfo'), 'MemTotal:        4000000 kB\nMemFree:          900000 kB\nMemAvailable:    2500000 kB\n');
  fs.mkdirSync(path.join(b.R, 'etc', 'opmsg'), { recursive: true });
  fs.writeFileSync(path.join(b.E, 'appels.log'), ''); fs.writeFileSync(path.join(b.E, 'env.log'), '');
  b.instance = (nom, opts = {}) => {
    const dom = 'msg-' + nom + '.teamop.fr';
    b.ports[nom] = 20000 + crypto.randomInt(0, 10000);
    const cfg = { instance: nom, domaine: dom, origine: 'https://' + dom, port: b.ports[nom], contactEmail: 'contact@teamop.fr', vapidPublicKey: 'BANC-PUBLIQUE', vapidPrivateKey: 'BANC-PRIVEE' };
    fs.writeFileSync(path.join(b.R, 'etc', 'opmsg', nom + '.json'), JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
    fs.writeFileSync(path.join(b.R, 'etc', 'opmsg', nom + '.env'), 'PORT=' + b.ports[nom] + '\n');
    fs.copyFileSync(path.join(b.R, 'etc', 'opmsg', nom + '.json'), path.join(b.E, 'config-lue-' + nom + '.json'));
    fs.writeFileSync(path.join(b.E, 'unite-actif'), '');
    if (opts.version !== 'ancienne') {
      const cur = path.join(b.R, 'opt', 'opmsg', nom, 'current');
      fs.mkdirSync(path.join(cur, 'outils'), { recursive: true });
      fs.copyFileSync(path.join(RACINE, 'server-msg', 'transcripteur.js'), path.join(cur, 'transcripteur.js'));
      fs.copyFileSync(path.join(RACINE, 'server-msg', 'outils', 'verifier-transcription.js'), path.join(cur, 'outils', 'verifier-transcription.js'));
    }
  };
  b.config = (nom) => { try { return JSON.parse(fs.readFileSync(path.join(b.R, 'etc', 'opmsg', nom + '.json'), 'utf8')); } catch (e) { return null; } };
  b.trConf = (nom) => { try { return JSON.parse(fs.readFileSync(path.join(b.R, 'etc', 'opmsg', 'transcrire-' + nom + '.json'), 'utf8')); } catch (e) { return null; } };
  b.octets = (rel) => lire(path.join(b.R, rel));
  b.existe = (rel) => fs.existsSync(path.join(b.R, rel));
  b.mode = (rel) => { try { return (fs.statSync(path.join(b.R, rel)).mode & 0o777).toString(8); } catch (e) { return null; } };
  b.journal = () => lire(path.join(b.E, 'appels.log')).split('\n').filter(Boolean);
  b.env = () => lire(path.join(b.E, 'env.log'));
  b.drapeau = (n, on = true) => { const p = path.join(b.E, n); if (on) fs.writeFileSync(p, ''); else fs.rmSync(p, { force: true }); };
  b.ecrireEtat = (n, txt) => fs.writeFileSync(path.join(b.E, n), txt);
  b.ouvrierVivant = (nom) => { const p = Number(lire(path.join(b.E, 'pid-opmsg-transcrire@' + nom)) || 0); if (!p) return false; try { process.kill(p, 0); return true; } catch (e) { return false; } };
  /* le /health de l'instance : la transcription « vue » d'après la configuration LUE au dernier redémarrage (« health-ko » : configurée mais l'ouvrier ne répond pas) */
  b.serveur = (nom) => new Promise((ok) => {
    const s = http.createServer((q, r) => {
      if (q.url !== '/health') { r.statusCode = 404; r.end(); return; }
      let cfg = {}; try { cfg = JSON.parse(lire(path.join(b.E, 'config-lue-' + nom + '.json'))); } catch (e) { /* pas encore */ }
      const configuree = !!cfg.transcription;
      const transcription = configuree ? { configuree: true, ok: !fs.existsSync(path.join(b.E, 'health-ko')), file: 0, faites: 0, vides: 0, echecs: 0, echecsSonde: 0 } : { configuree: false, ok: false };
      r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, instance: nom, transcription }));
    });
    s.listen(b.ports[nom], '127.0.0.1', () => { b.serveurs.push(s); ok(); });
  });
  b.portLibre = () => new Promise((ok) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
  b.lancer = (args, env) => new Promise((ok) => {
    const e = Object.assign({ PATH: b.bin, LC_ALL: 'C.UTF-8', HOME: b.d, TMPDIR: b.d, BAC_ETAT: b.E, BAC_R: b.R, OPMSG_RACINE: b.R, OPMSG_MEMINFO_BANC: path.join(b.E, 'meminfo'),
      OPMSG_TRANSCRIPTION_EMPREINTE_MODELE_BANC: b.emp.small, OPMSG_TRANSCRIPTION_EMPREINTE_VAD_BANC: b.emp.vad, OPMSG_TRANSCRIPTION_PORT_BANC: String(b.portOuvrier) }, env || {});
    const p = spawn(reel('bash'), [SCRIPT].concat(args), { env: e, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (x) => { out += x; }); p.stderr.on('data', (x) => { err += x; });
    const garde = setTimeout(() => { try { p.kill('SIGKILL'); } catch (x) { /* fini */ } }, 90000);
    p.on('close', (status) => { clearTimeout(garde); ok({ status, out, err }); });
  });
  /* l'état du disque, fichier par fichier (empreinte + droits) : deux installations de suite doivent laisser le MÊME */
  b.etat = () => {
    const out = {};
    (function parcourir(dir) {
      for (const n of fs.readdirSync(dir).sort()) {
        const p = path.join(dir, n), rel = path.relative(b.R, p), st = fs.lstatSync(p);
        if (st.isDirectory()) { out[rel + '/'] = (st.mode & 0o777).toString(8); parcourir(p); }
        else out[rel] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16) + ' ' + (st.mode & 0o777).toString(8);
      }
    })(b.R);
    return out;
  };
  b.fin = () => {
    for (const s of b.serveurs) { try { s.close(); } catch (e) { /* fermé */ } }
    for (const f of fs.readdirSync(b.E).filter(n => n.startsWith('pid-'))) { const p = Number(lire(path.join(b.E, f))); if (p) { try { process.kill(p); } catch (e) { /* parti */ } } }
    try { fs.rmSync(b.d, { recursive: true, force: true }); } catch (e) { /* déjà parti */ }
  };
  return b;
}
const index = (journal, re) => journal.findIndex(l => re.test(l));
const compte = (journal, re) => journal.filter(l => re.test(l)).length;

(async () => {
  /* ═══════ 0. LE FICHIER LUI-MÊME ═══════ */
  vrai('le script existe', fs.existsSync(SCRIPT));
  {
    const code = sansCommentaires(lire(SCRIPT));
    vrai('population : le code du script n\'est pas vide une fois les commentaires retirés', code.split('\n').filter(l => l.trim()).length > 120);
    vrai('⛔ le commit de whisper.cpp est ÉPINGLÉ (celui de la v1.9.5), et le commit récupéré lui est COMPARÉ avant toute compilation', code.includes('WHISPER_COMMIT="' + COMMIT + '"') && /\[ "\$RECU" = "\$WHISPER_COMMIT" \] \|\|/.test(code));
    vrai('⛔ les empreintes des deux modèles sont ÉPINGLÉES', code.includes('MODELE_EMPREINTE="ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb"') && code.includes('VAD_EMPREINTE="2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987"'));
    vrai('⛔ les portes des bancs (empreintes, port, mémoire) ne s\'ouvrent QU\'AVEC une racine factice', ['OPMSG_TRANSCRIPTION_EMPREINTE_MODELE_BANC', 'OPMSG_TRANSCRIPTION_EMPREINTE_VAD_BANC', 'OPMSG_TRANSCRIPTION_PORT_BANC', 'OPMSG_MEMINFO_BANC']
      .every(n => new RegExp('if \\[ -n "\\$R" \\] && \\[ -n "\\$\\{' + n + ':-\\}" \\]').test(code) && code.split(n).length - 1 === 2));
    vrai('⛔ le téléchargement : https seulement, redirections comprises, vers un FICHIER vérifié — jamais un tuyau vers un interpréteur', /curl --fail[^\n]*--proto '=https' --proto-redir '=https' --tlsv1\.2[^\n]*-o "\$tmp"/.test(code) && !/curl[^\n|]*\|\s*(ba)?sh/.test(code));
    vrai('⛔ le secret n\'est jamais dans un argument ni dans l\'environnement : le programme Node ne reçoit que des chemins, des ports et un mode', !/SECRET\s*=/.test(code.replace(/RE_SECRET\s*=/g, '')) && !/--secret/.test(code));
    vrai('⛔ rien ne touche à OP GESTION ni à nginx (l\'ouvrier n\'écoute que la boucle locale)', !/teamop-api|\/opt\/teamop|\/etc\/teamop|nginx|ufw/.test(code));
    const unite = (code.match(/'\[Service\]'[\s\S]*?'\[Install\]'/) || [''])[0];
    for (const l of ['IPAddressDeny=any', 'IPAddressAllow=localhost', 'NoNewPrivileges=true', 'ProtectSystem=strict', 'CapabilityBoundingSet=', 'RuntimeDirectory=opmsg-transcrire-%i', 'MemoryMax=1200M', 'MemorySwapMax=0', 'PrivateTmp=true', 'ProtectHome=true', 'RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX', 'User=opmsg-transcrire-%i'])
      vrai('⛔ l\'unité porte « ' + l + ' »', unite.includes("'" + l + "'"));
    vrai('⛔ et les données des deux instances lui sont inaccessibles', unite.includes('-/opt/opmsg/beta/data -/opt/opmsg/prod/data'));
    v('les ports de l\'ouvrier, instance par instance (la boucle locale seulement)', [/beta\) PORT_OUVRIER=7860 ;;/.test(code), /prod\) PORT_OUVRIER=7861 ;;/.test(code)], [true, true]);
    const r = spawnSync('bash', ['-n', SCRIPT], { encoding: 'utf8' });
    v('bash -n', [r.status, String(r.stderr).trim()], [0, '']);
  }

  /* ═══════ 1. UNE PREMIÈRE INSTALLATION ═══════ */
  console.log('\nUne première installation');
  let b = bac();
  try {
    b.instance('beta'); await b.serveur('beta'); b.portOuvrier = await b.portLibre();
    const avant = b.octets('etc/opmsg/beta.json');
    const r = await b.lancer(['beta']);
    v('le script réussit', [r.status, /✓ La transcription des vocaux est en place pour beta/.test(r.out)], [0, true]);
    if (r.status !== 0) console.log(r.out.split('\n').slice(-15).join('\n') + '\n' + r.err.slice(-800));
    const c = b.config('beta'), w = b.trConf('beta'), sec = c && c.transcription && c.transcription.secret;
    v('la configuration de l\'instance porte l\'ouvrier : la boucle locale et un secret', [c && c.transcription && c.transcription.url, RE_SECRET.test(sec || '')], ['http://127.0.0.1:' + b.portOuvrier, true]);
    vrai('le reste de la configuration de l\'instance est intact', JSON.stringify(Object.assign({}, c, { transcription: undefined })) === JSON.stringify(Object.assign(JSON.parse(avant), { transcription: undefined })));
    v('⛔ la configuration de l\'ouvrier : le MÊME secret, son port, les chemins RÉELS du VPS, 2 cœurs, un faisceau de 1',
      w && [w.secret === sec, w.port, w.whisper, w.modele, w.vad, w.ffmpeg, w.threads, w.faisceau],
      [true, b.portOuvrier, '/' + W_REL + '/whisper-cli', '/opt/opmsg/whisper/modeles/ggml-small-q5_1.bin', '/opt/opmsg/whisper/modeles/ggml-silero-v6.2.0.bin', '/usr/bin/ffmpeg', 2, 1]);
    v('⛔ les droits : l\'instance 0600, l\'ouvrier 0640 (lisible de son compte seul, par son groupe)', [b.mode('etc/opmsg/beta.json'), b.mode('etc/opmsg/transcrire-beta.json')], ['600', '640']);
    const tout = r.out + r.err, env = b.env(), args = b.journal().join('\n');
    vrai('⛔ le secret n\'est NI dans la sortie du script, NI dans un argument, NI dans l\'environnement d\'un programme lancé', !!sec && !tout.includes(sec) && !args.includes(sec) && !env.includes(sec));
    vrai('whisper.cpp est posé : le programme, son empreinte, le commit, l\'échantillon', b.existe(W_REL + '/whisper-cli') && b.existe(W_REL + '/whisper-cli.sha256') && (b.octets(W_REL + '/commit') || '').trim() === COMMIT && b.existe(W_REL + '/jfk.wav'));
    vrai('les deux modèles sont posés, intacts', b.octets('opt/opmsg/whisper/modeles/ggml-small-q5_1.bin') === b.modeles.small.toString() && b.octets('opt/opmsg/whisper/modeles/ggml-silero-v6.2.0.bin') === b.modeles.vad.toString());
    const J = b.journal();
    vrai('la compilation : le commit demandé par son empreinte, une construction statique, sans serveur ni tests', J.some(l => /^git -C \S+ fetch -q --depth 1 origin d1be6fde11ac6e0407606b4e42fe72d34add8037$/.test(l)) && J.some(l => /^cmake -S .* -DBUILD_SHARED_LIBS=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF /.test(l)));
    vrai('⛔ le téléchargement des modèles : en https, redirections comprises', compte(J, /^curl --fail .*--proto =https --proto-redir =https --tlsv1\.2 .*huggingface\.co/) === 2);
    vrai('un compte système à l\'ouvrier, sans shell', J.some(l => /^useradd --system --no-create-home --home-dir \/nonexistent --shell \/usr\/sbin\/nologin --user-group opmsg-transcrire-beta$/.test(l)));
    vrai('l\'ouvrier tourne (le VRAI transcripteur.js)', b.ouvrierVivant('beta'));
    vrai('⛔ le VRAI contrôle a passé : il refuse sans secret, et l\'échantillon est transcrit (le mot « country »)', /✓ l'ouvrier refuse qui ne présente pas le secret/.test(r.out) && /✓ il transcrit l'échantillon de whisper\.cpp/.test(r.out) && /fait ce qu'il doit/.test(r.out));
    const iOuvrier = index(J, /^systemctl restart opmsg-transcrire@beta$/), iInstance = index(J, /^systemctl restart teamop-msg@beta$/);
    vrai('⛔ L\'ORDRE : l\'ouvrier démarré et contrôlé AVANT de relancer l\'instance', iOuvrier >= 0 && iInstance > iOuvrier && r.out.indexOf('Contrôle de l\'ouvrier') < r.out.indexOf('l\'instance voit l\'ouvrier'));
    vrai('l\'instance a relu sa configuration (elle porte la transcription)', !!JSON.parse(lire(path.join(b.E, 'config-lue-beta.json'))).transcription);
    vrai('aucun fichier de travail laissé dans le dossier d\'exécution de l\'ouvrier', fs.readdirSync(path.join(b.E, 'run-beta')).length === 0);
    const unite = b.octets('etc/systemd/system/opmsg-transcrire@.service') || '';
    vrai('l\'unité posée : le vrai transcripteur.js, par /usr/bin/node, depuis le code déployé', /^ExecStart=\/usr\/bin\/node \/opt\/opmsg\/%i\/current\/transcripteur\.js$/m.test(unite) && /^Environment=OPMSG_TRANSCRIRE_CONFIG=\/etc\/opmsg\/transcrire-%i\.json$/m.test(unite));

    /* ═══════ 2. REJOUABLE ═══════ */
    console.log('\nUne deuxième exécution : rien ne change');
    const e1 = b.etat(), n1 = b.journal().length;
    const r2 = await b.lancer(['beta']);
    const J2 = b.journal().slice(n1);
    v('elle réussit', r2.status, 0);
    v('⛔ le disque est le MÊME, octet pour octet, droit pour droit', b.etat(), e1);
    v('⛔ le secret est REPRIS', b.config('beta').transcription.secret, sec);
    v('⛔ rien n\'est recompilé, retéléchargé, ni relancé', [compte(J2, /^git |^cmake |^curl /), compte(J2, /^systemctl restart/)], [0, 0]);
    vrai('… et elle le dit', /déjà là, intact/.test(r2.out) && /secret=repris instance=inchange ouvrier=inchange/.test(r2.out));

    /* ═══════ 3. RETIRER ═══════ */
    console.log('\n« retirer »');
    const n2 = b.journal().length;
    const r3 = await b.lancer(['beta', 'retirer']);
    const J3 = b.journal().slice(n2);
    v('il réussit', r3.status, 0);
    v('⛔ la configuration de l\'instance revient OCTET POUR OCTET à celle d\'avant, celle de l\'ouvrier est effacée', [b.octets('etc/opmsg/beta.json') === avant, b.existe('etc/opmsg/transcrire-beta.json')], [true, false]);
    vrai('l\'ouvrier est arrêté et désactivé, l\'instance relancée pour oublier la transcription', !b.ouvrierVivant('beta') && J3.includes('systemctl stop opmsg-transcrire@beta') && J3.includes('systemctl disable opmsg-transcrire@beta') && J3.includes('systemctl restart teamop-msg@beta'));
    vrai('le programme et les modèles restent (l\'autre instance s\'en sert peut-être)', b.existe(W_REL + '/whisper-cli') && b.existe('opt/opmsg/whisper/modeles/ggml-small-q5_1.bin'));
  } finally { b.fin(); }

  /* ═══════ 4. ÉCHEC = FERMÉ ═══════ */
  console.log('\nÉchec = fermé, à chaque étape');
  const cas = [
    { nom: 'le dépôt rend un AUTRE commit', drapeau: 'git-autre-commit', rien: true, dit: /n'est pas celui qui est épinglé/ },
    { nom: 'GitHub injoignable', drapeau: 'git-refuse', rien: true, dit: /n'a pas pu être récupéré/ },
    { nom: 'la compilation échoue', drapeau: 'build-refuse', rien: true, dit: /la compilation a échoué/ },
    { nom: 'huggingface injoignable', drapeau: 'curl-refuse', rien: true, dit: /n'a pas pu être téléchargé/ },
    { nom: 'un modèle qui ne porte pas son empreinte', avant: (b) => fs.writeFileSync(path.join(b.E, 'modeles', 'ggml-small-q5_1.bin'), 'modele-trafique'), rien: true, dit: /ne porte pas l'empreinte attendue/ },
    { nom: 'ffmpeg ne s\'installe pas', drapeau: 'apt-refuse', rien: true, dit: /ffmpeg n'est pas installé/ },
    { nom: 'une machine à 1 Go de mémoire', avant: (b) => b.ecrireEtat('meminfo', 'MemTotal:        1000000 kB\nMemAvailable:     600000 kB\n'), rien: true, dit: /il en faut au moins 1800/ },
    { nom: 'un disque presque plein', avant: (b) => b.ecrireEtat('disque-libre', '300'), rien: true, dit: /il en faut au moins 1500/ },
    { nom: 'une version du service d\'avant la transcription', version: 'ancienne', rien: true, dit: /antérieure à la transcription/ },
    { nom: 'l\'ouvrier ne démarre pas', drapeau: 'ouvrier-refuse', dit: /l'ouvrier de transcription n'a pas démarré/ },
    { nom: 'l\'ouvrier ne transcrit pas l\'échantillon (le contrôle échoue)', avant: (b) => b.ecrireEtat('whisper-texte', 'un texte sans le mot attendu'), dit: /l'ouvrier ne fait pas ce qu'il doit/ },
    { nom: 'l\'instance relancée ne voit pas l\'ouvrier', drapeau: 'health-ko', dit: /ne voit pas l'ouvrier/ },
  ];
  for (const k of cas) {
    b = bac();
    try {
      b.instance('beta', { version: k.version }); await b.serveur('beta'); b.portOuvrier = await b.portLibre();
      if (k.drapeau) b.drapeau(k.drapeau);
      if (k.avant) k.avant(b);
      const avant = b.octets('etc/opmsg/beta.json');
      const r = await b.lancer(['beta']);
      const J = b.journal();
      const ferme = r.status === 1 && b.octets('etc/opmsg/beta.json') === avant && !b.existe('etc/opmsg/transcrire-beta.json') && !b.ouvrierVivant('beta') && !b.existe('etc/opmsg/beta.json.avant-transcription');
      v('⛔ ' + k.nom + ' : le script s\'arrête, le DIT, et la configuration de l\'instance reste OCTET POUR OCTET', [ferme, k.dit.test(r.out)], [true, true]);
      if (!ferme || !k.dit.test(r.out)) console.log(r.out.split('\n').slice(-8).join('\n'));
      if (k.rien) vrai('   … rien n\'est écrit avant la cause (ni unité, ni compte, ni configuration de l\'ouvrier), et l\'instance n\'est pas touchée', !b.existe('etc/systemd/system/opmsg-transcrire@.service') && compte(J, /^useradd /) === 0 && compte(J, /^systemctl restart teamop-msg@/) === 0);
      else vrai('   … l\'ouvrier est arrêté et désactivé, rien n\'est laissé à moitié', J.includes('systemctl stop opmsg-transcrire@beta') && J.includes('systemctl disable opmsg-transcrire@beta'));
      if (k.drapeau === 'git-autre-commit' || k.drapeau === 'build-refuse') vrai('   … et aucun programme n\'est posé', !b.existe(W_REL + '/whisper-cli'));
      if (k.nom.startsWith('un modèle')) vrai('   … et le modèle faux n\'est pas gardé', !b.existe('opt/opmsg/whisper/modeles/ggml-small-q5_1.bin') && !fs.readdirSync(path.join(b.R, 'opt/opmsg/whisper/modeles')).some(n => n.startsWith('.')));
    } finally { b.fin(); }
  }

  /* ═══════ 5. DEUX INSTANCES ═══════ */
  console.log('\nDeux instances : deux secrets, deux comptes, un seul programme');
  b = bac();
  try {
    b.instance('beta'); b.instance('prod'); await b.serveur('beta'); await b.serveur('prod');
    b.portOuvrier = await b.portLibre(); const rb = await b.lancer(['beta']);
    b.portOuvrier = await b.portLibre(); const n = b.journal().length; const rp = await b.lancer(['prod']);
    const Jp = b.journal().slice(n);
    v('les deux installations réussissent', [rb.status, rp.status], [0, 0]);
    const sb = b.config('beta').transcription.secret, sp = b.config('prod').transcription.secret;
    vrai('⛔ deux secrets différents, chacun dans SA configuration d\'ouvrier', sb !== sp && b.trConf('beta').secret === sb && b.trConf('prod').secret === sp);
    vrai('deux comptes', fs.existsSync(path.join(b.E, 'compte-opmsg-transcrire-beta')) && fs.existsSync(path.join(b.E, 'compte-opmsg-transcrire-prod')));
    vrai('la seconde ne recompile ni ne retélécharge (le programme et les modèles sont partagés)', compte(Jp, /^git |^cmake |^curl /) === 0);
  } finally { b.fin(); }
})().then(() => t.fin(), (e) => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; });
