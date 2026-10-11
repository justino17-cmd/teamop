#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════════════════════════
#  Installation de la TRANSCRIPTION DES VOCAUX d'OP MESSAGES (whisper.cpp) — à lancer APRÈS install-msg.sh, en root.
#
#  Usage :   bash install-transcription.sh beta              (ou prod — l'instance doit déjà être installée)
#            bash install-transcription.sh beta retirer      (tout enlever : « Voir la transcription » disparaît, rien d'autre ne change)
#
#  Décisions de Justin du 11 octobre 2026 : « possible de faire une transcription écrite, comme sur Instagram » — le calcul se fait SUR NOTRE SERVEUR
#  (aucune voix ne sort de la machine, pas de sous-traitant), ouvert à tous en bêta, à la DEMANDE (« Voir la transcription »). Les modules :
#  server-msg/transcription.js (le service), server-msg/transcripteur.js (l'ouvrier). Le mode d'emploi : design/opmessages/INSTALLER-LE-SERVEUR.md
#  (« La transcription des vocaux »).
#
#  Ce que fait ce script, dans l'ordre :
#    1. vérifie tout ce dont il a besoin AVANT d'écrire quoi que ce soit (l'instance, sa version, la mémoire et le disque de la machine) ;
#    2. compile whisper.cpp depuis ses SOURCES, au commit épinglé ci-dessous (le commit récupéré est comparé au commit attendu : un autre n'est pas
#       compilé), et installe ffmpeg (paquet Ubuntu) — une seule fois pour les deux instances ;
#    3. télécharge le modèle de reconnaissance et celui de détection de parole, et VÉRIFIE leur empreinte (un fichier qui ne correspond pas n'est
#       pas gardé) ;
#    4. un compte système à l'ouvrier, sans shell ni dossier ; tire le SECRET partagé au hasard, ICI, et l'écrit dans la configuration de l'ouvrier ET
#       dans celle de l'instance (jamais affiché) ;
#    5. démarre l'ouvrier dans son unité (`opmsg-transcrire@<instance>`) — AUCUN réseau (il n'écoute qu'une socket Unix, que seule l'instance joint),
#       mémoire et calcul bornés, ses fichiers de travail en mémoire vive — puis le CONTRÔLE (outils/verifier-transcription.js : il refuse qui n'a pas le secret, et transcrit pour de vrai l'échantillon
#       de whisper.cpp, un discours public de 1961) ;
#    6. relance l'instance et attend qu'elle voie l'ouvrier (/health : transcription.ok).
#  Une étape ratée défait TOUT (ÉCHEC = FERMÉ) : la transcription est retirée, OP MESSAGES continue comme avant — et le script dit pourquoi.
#
#  ⛔ CE SCRIPT NE TOUCHE JAMAIS À OP GESTION : ni ses dossiers, ni son unité, ni nginx (l'ouvrier n'écoute qu'une socket Unix, aucun port).
#  ⛔ IL N'AFFICHE JAMAIS UN SECRET (règle du 24 septembre 2026 : Justin recolle toutes ses sorties dans la conversation). Le secret naît dans un
#  processus Node, passe d'un fichier à l'autre sans traverser le shell, et ne figure ni dans un argument, ni dans l'environnement, ni dans une
#  variable de ce script.
#  ⛔ IL EST REJOUABLE : whisper.cpp et les modèles déjà là et intacts ne sont ni recompilés ni retéléchargés ; le secret existant est REPRIS ; une
#  configuration identique n'est pas réécrite ; l'ouvrier et l'instance ne sont relancés que si quelque chose a changé.
#
#  Une instance à part de l'autre : deux ouvriers, deux comptes, deux secrets, deux sockets — la bêta ne peut rien sur la production (seule l'unité de
#  l'instance reçoit le groupe de SON ouvrier, par un complément d'unité). Le programme et les modèles sont partagés (en lecture seule, possédés par root).
#
#  Variables (toutes facultatives) :
#    OPMSG_RACINE                 préfixe de tous les chemins — UNIQUEMENT pour les bancs (bac à sable)
#    OPMSG_TRANSCRIPTION_MODELES  un dossier qui contient déjà les deux modèles (si le VPS n'atteint pas huggingface.co) — leur empreinte est vérifiée pareil
#    OPMSG_TRANSCRIPTION_THREADS  le nombre de cœurs de calcul de l'ouvrier (1 à 8 ; défaut : 2, ou 1 sur une machine à un cœur)
# ════════════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

INSTANCE="${1:-}"
GESTE="${2:-installer}"
# ⛔ UNE SOCKET UNIX, PAS UN PORT (relecture du gardien, 11 octobre 2026) : un port de la boucle locale se SQUATTE — un processus de la machine qui le prenait
# pendant un redémarrage de l'ouvrier recevait le secret et les octets des vocaux. La socket vit dans le dossier d'exécution de l'unité (0750, groupe de
# l'ouvrier) ; seule l'unité de l'instance reçoit ce groupe. tests/test-1002.js relit ce chemin.
case "$INSTANCE" in
  beta|prod) SOCKET_REEL="/run/opmsg-transcrire-$INSTANCE/ouvrier.sock" ;;
  *) echo "usage : bash install-transcription.sh <beta|prod> [retirer]"; exit 2 ;;
esac
case "$GESTE" in installer|retirer) ;; *) echo "usage : bash install-transcription.sh <beta|prod> [retirer]"; exit 2 ;; esac

# ── whisper.cpp et ses modèles : la version, le commit, les empreintes ───────────────────────────────────────────────────────────────────────────
# ⛔ Relevés le 11 octobre 2026 : le commit de la publication v1.9.5, compilé dans le conteneur de développement, et les deux modèles retéléchargés, leur
# empreinte recalculée, puis ÉPROUVÉS sur de vrais vocaux en français (7 et 15 secondes de parole : ~9 et ~10 s de calcul sur 2 cœurs, ~470 Mo de mémoire).
# Changer de version ou de modèle, c'est changer ces lignes ET remesurer (temps, mémoire, qualité du français) avant de rien promettre.
WHISPER_VERSION="1.9.5"
WHISPER_COMMIT="d1be6fde11ac6e0407606b4e42fe72d34add8037"
WHISPER_DEPOT="https://github.com/ggml-org/whisper.cpp"
MODELE_NOM="ggml-small-q5_1.bin"
MODELE_EMPREINTE="ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb"
MODELE_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$MODELE_NOM"
VAD_NOM="ggml-silero-v6.2.0.bin"
VAD_EMPREINTE="2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987"
VAD_URL="https://huggingface.co/ggml-org/whisper-vad/resolve/main/$VAD_NOM"
# ⛔ La machine porte aussi OP GESTION : en dessous, on ne pose rien. La mémoire de l'unité est plafonnée à 1 200 Mo (le modèle en prend ~470 en calcul).
MEMOIRE_TOTALE_MIN_MO=1800
MEMOIRE_LIBRE_MIN_MO=800
DISQUE_LIBRE_MIN_MO=1500

R="${OPMSG_RACINE:-}"
# (les bancs seuls — une racine factice — posent la socket dans leur bac à sable : sur le VPS, OPMSG_RACINE est vide et cette ligne ne fait rien)
SOCKET="$SOCKET_REEL"
if [ -n "$R" ] && [ -n "${OPMSG_TRANSCRIPTION_SOCKET_BANC:-}" ]; then SOCKET="$OPMSG_TRANSCRIPTION_SOCKET_BANC"; fi
OPT="$R/opt/opmsg"
ETC="$R/etc/opmsg"
CONFIG="$ETC/$INSTANCE.json"
W_DIR_REEL="/opt/opmsg/whisper/$WHISPER_VERSION-${WHISPER_COMMIT:0:12}"
W_DIR="$R$W_DIR_REEL"
M_DIR_REEL="/opt/opmsg/whisper/modeles"
M_DIR="$R$M_DIR_REEL"
TR_CONF_REEL="/etc/opmsg/transcrire-$INSTANCE.json"
TR_CONF="$R$TR_CONF_REEL"
FFMPEG_REEL="/usr/bin/ffmpeg"
COMPTE="opmsg-transcrire-$INSTANCE"
UNITE_TR="opmsg-transcrire@$INSTANCE"
SYSD="$R/etc/systemd/system"
OUVRIER="$OPT/$INSTANCE/current/transcripteur.js"
VERIF="$OPT/$INSTANCE/current/outils/verifier-transcription.js"
UNITE="teamop-msg@$INSTANCE"
# le complément d'unité de l'INSTANCE : le groupe de son ouvrier, et seulement le sien (l'unité elle-même appartient à install-msg.sh, qui la réécrit)
COMPLEMENT="$SYSD/teamop-msg@$INSTANCE.service.d/transcription.conf"

if [ -z "$R" ] && [ "$(id -u)" != "0" ]; then echo "✗ à lancer en root"; exit 1; fi
[ -f "$CONFIG" ] || { echo "✗ l'instance $INSTANCE n'est pas installée ($CONFIG est absent) : lancer d'abord install-msg.sh $INSTANCE"; exit 1; }
command -v node >/dev/null || { echo "✗ node est absent du VPS"; exit 1; }
[ -n "$R" ] || [ -x /usr/bin/node ] || { echo "✗ /usr/bin/node est absent : l'unité de l'ouvrier le lance par ce chemin (comme celle du service)"; exit 1; }

# Rien de ce qui touche un secret ne s'affiche tel quel : tout mot de 40 caractères « d'identifiant » ou plus est masqué.
masquer() { sed -E 's/[A-Za-z0-9_-]{40,}/[masqué]/g'; }
actif() { systemctl is-active --quiet "$1"; }
# ce que systemd a retenu de la FIN de l'ouvrier — « Result=signal ExecMainStatus=31 » : un appel système refusé ; « Result=exit-code ExecMainStatus=1 » : il a jeté au
# démarrage. ⛔ Jamais le journal (test-930) : la sortie de ce script est recollée telle quelle, et le journal du VPS porte des identifiants.
finOuvrier() { systemctl show -p Result -p ExecMainStatus "$UNITE_TR" 2>/dev/null | tr '\n' ' ' | sed 's/ *$//'; }

PORT_SERVICE="$(sed -n 's/^PORT=//p' "$ETC/$INSTANCE.env" 2>/dev/null || true)"
[[ "$PORT_SERVICE" =~ ^[0-9]{2,5}$ ]] || PORT_SERVICE=""

# ── Les gestes que le script sait faire, utilisés par l'installation, par l'échec (qui défait tout) et par « retirer » ──────────────────────────────
# (1) les deux configurations : poser ou retirer `transcription` dans celle de l'instance, et écrire celle de l'ouvrier. Un seul programme Node, qui ne
#     reçoit que des chemins, des identifiants de compte et des nombres : le secret n'en sort jamais. Ce qu'il imprime : des mots d'état.
configurer() {   # $1 = poser | retirer → imprime l'état ; sort ≠ 0 si une configuration n'a pas pu être écrite
  MODE="$1" CONFIG_INSTANCE="$CONFIG" TR_CONF="$TR_CONF" SOCKET="$SOCKET" THREADS="${THREADS:-1}" \
  PROPRIO="$(id -u opmsg 2>/dev/null || true):$(id -g opmsg 2>/dev/null || true)" GROUPE_OUVRIER="$(getent group "$COMPTE" 2>/dev/null | cut -d: -f3 || true)" \
  WHISPER="$W_DIR_REEL/whisper-cli" MODELE="$M_DIR_REEL/$MODELE_NOM" VAD="$M_DIR_REEL/$VAD_NOM" FFMPEG="$FFMPEG_REEL" \
  node - <<'PROGRAMME'
"use strict";
const fs = require("fs"), crypto = require("crypto"), e = process.env;
const RE_SECRET = /^[A-Za-z0-9_-]{32,128}$/;
const lire = (p) => { try { const j = JSON.parse(fs.readFileSync(p, "utf8")); return j && typeof j === "object" && !Array.isArray(j) ? j : null; } catch (x) { return null; } };
/* ⛔ le fichier temporaire a son propriétaire AVANT le renommage (relecture du gardien) : sinon la configuration de l'instance restait à root le temps du
   `chown` du shell, et une instance relancée dans cette fenêtre ne pouvait plus la lire */
const [pu, pg] = String(e.PROPRIO || "").split(":").map((x) => (/^\d+$/.test(x) ? Number(x) : null));
const go = /^\d+$/.test(e.GROUPE_OUVRIER || "") ? Number(e.GROUPE_OUVRIER) : null;
const root = typeof process.getuid === "function" && process.getuid() === 0;
const ecrire = (p, texte, mode, uid, gid) => { const t = p + ".nouveau"; fs.writeFileSync(t, texte, { mode: mode }); if (root && uid !== null && gid !== null) fs.chownSync(t, uid, gid); fs.renameSync(t, p); };
try {
  const cfg = lire(e.CONFIG_INSTANCE);
  if (!cfg) { console.log("configuration-illisible"); process.exit(3); }
  const avant = fs.readFileSync(e.CONFIG_INSTANCE, "utf8");
  if (e.MODE === "retirer") {
    let etat = "instance=inchange";
    if ("transcription" in cfg) {
      const sans = Object.assign({}, cfg); delete sans.transcription;
      ecrire(e.CONFIG_INSTANCE, JSON.stringify(sans, null, 2) + "\n", 0o600, pu, pg);
      etat = "instance=change";
    }
    let ouvrier = "inchange";
    try { fs.unlinkSync(e.TR_CONF); ouvrier = "retire"; } catch (x) { if (x.code !== "ENOENT") throw x; }
    console.log(etat + " ouvrier=" + ouvrier);
    process.exit(0);
  }
  const ancien = (cfg.transcription && typeof cfg.transcription === "object" && !Array.isArray(cfg.transcription)) ? cfg.transcription : {};
  const repris = typeof ancien.secret === "string" && RE_SECRET.test(ancien.secret);
  const secret = repris ? ancien.secret : crypto.randomBytes(48).toString("base64url");
  /* les réglages posés à la main (dureeMaxS, file, essais, parHeure…) sont GARDÉS : le script ne pose que l'adresse et le secret */
  const garde = {};
  for (const k of ["dureeMaxS", "file", "parPersonne", "budgetHeureS", "essais", "parHeure", "sondeMs", "delaiSondeMs", "delaiBaseMs", "delaiParSMs"]) if (Number.isInteger(ancien[k])) garde[k] = ancien[k];
  const tr = Object.assign({ url: "unix:" + e.SOCKET, secret: secret }, garde);
  const texte = JSON.stringify(Object.assign({}, cfg, { transcription: tr }), null, 2) + "\n";
  const changeInstance = avant !== texte;
  if (changeInstance) ecrire(e.CONFIG_INSTANCE, texte, 0o600, pu, pg);
  /* la configuration de l'ouvrier : ses programmes, ses modèles, sa socket, son nombre de cœurs — et le MÊME secret. ⛔ Sa durée maximale est CELLE DU SERVICE
     (relecture du gardien : sans elle, l'ouvrier acceptait 600 s pendant que le service en promettait 300 — un vocal à durée déclarée fausse tenait l'ouvrier
     vingt minutes) ; 300, le défaut du service (`TRANSCRIPTION_DEFAUT`, config.js — test-1002 compare les deux) */
  const dureeMaxS = Number.isInteger(garde.dureeMaxS) ? garde.dureeMaxS : 300;
  const ouvrierTxt = JSON.stringify({ secret: secret, socket: e.SOCKET, whisper: e.WHISPER, modele: e.MODELE, vad: e.VAD, ffmpeg: e.FFMPEG,
    threads: Math.max(1, Math.min(8, Number(e.THREADS) || 1)), faisceau: 1, dureeMaxS: dureeMaxS }, null, 2) + "\n";
  let existant = null;
  try { existant = fs.readFileSync(e.TR_CONF, "utf8"); } catch (x) { existant = null; }
  const changeOuvrier = existant !== ouvrierTxt;
  if (changeOuvrier) ecrire(e.TR_CONF, ouvrierTxt, 0o640, go === null ? null : 0, go);
  /* des mots d'état, jamais une valeur (écrits en paires clé/mot : un « secret= » suivi d'un texte entre guillemets ressemble, pour scripts/verif-secrets.sh, à un secret en dur) */
  const etat = { secret: repris ? "repris" : "nouveau", instance: changeInstance ? "change" : "inchange", ouvrier: changeOuvrier ? "change" : "inchange" };
  console.log(Object.keys(etat).map((k) => k + "=" + etat[k]).join(" "));
} catch (x) {
  console.log("erreur-" + (x && x.code ? String(x.code).replace(/[^A-Z_]/g, "") : "inconnue"));
  process.exit(1);
}
PROGRAMME
}
# (2) l'instance voit-elle l'ouvrier ? (/health : configurée, et sa sonde a répondu) — ou, pour « retirer », ne le voit-elle plus ?
sante_transcription() {   # $1 = oui | non → 0 si /health dit ce qu'on attend
  [ -n "$PORT_SERVICE" ] || return 1
  ATTENDU="$1" PORT_SERVICE="$PORT_SERVICE" node - <<'SONDE'
const h = require("http");
const q = h.get({ host: "127.0.0.1", port: Number(process.env.PORT_SERVICE), path: "/health", timeout: 3000 }, (r) => {
  let b = ""; r.on("data", (d) => { b += d; });
  r.on("end", () => {
    try {
      const t = (JSON.parse(b) || {}).transcription || {};
      const voit = t.configuree === true && t.ok === true;
      process.exit((process.env.ATTENDU === "oui" ? voit : t.configuree !== true) ? 0 : 2);
    } catch (x) { process.exit(3); }
  });
});
q.on("timeout", () => { q.destroy(); process.exit(4); });
q.on("error", () => process.exit(5));
SONDE
}
attendre_sante() { for _ in $(seq 1 30); do sante_transcription "$1" && return 0; sleep 1; done; return 1; }

# L'instance a-t-elle CHARGÉ la transcription ? (son /health la dit configurée) — alors, et alors seulement, elle est relancée pour l'oublier.
relancer_sans_transcription() {
  actif "$UNITE" || return 0
  sante_transcription non && return 0
  systemctl restart "$UNITE" || true
  attendre_sante non || echo "   ⚠️ l'instance ne dit pas encore « sans transcription » sur /health"
}
# TOUT RETIRER, dans l'ordre qui ne coupe personne au milieu d'un geste : l'instance d'abord (plus aucune demande neuve), puis l'ouvrier. Utilisé par
# « retirer » ET par l'échec d'une installation (ÉCHEC = FERMÉ). Le programme et les modèles restent (ils ne font rien seuls, et l'autre instance s'en sert peut-être).
tout_retirer() {
  local etat
  # le groupe de l'ouvrier quitte l'instance d'abord : sa relance (ci-dessous) l'oublie avec la transcription
  if [ -f "$COMPLEMENT" ]; then rm -f "$COMPLEMENT"; rmdir "$(dirname "$COMPLEMENT")" 2>/dev/null || true; systemctl daemon-reload || true; fi
  if etat="$(configurer retirer)"; then
    case "$etat" in *"instance=change"*) chown opmsg:opmsg "$CONFIG" 2>/dev/null || true; chmod 600 "$CONFIG" ;; esac
    relancer_sans_transcription
  else
    echo "   ⚠️ la configuration de l'instance n'a pas pu être relue ($(printf '%s' "$etat" | masquer)) : « transcription » est peut-être encore dans $CONFIG"
  fi
  systemctl stop "$UNITE_TR" >/dev/null 2>&1 || true
  systemctl disable "$UNITE_TR" >/dev/null 2>&1 || true
  rm -f "$TR_CONF" "$TR_CONF.nouveau"
}

if [ "$GESTE" = "retirer" ]; then
  echo "── OP MESSAGES · transcription des vocaux · instance $INSTANCE · RETRAIT"
  tout_retirer
  echo "✓ La transcription est retirée de $INSTANCE : « Voir la transcription » n'est plus proposé (les textes déjà transcrits restent avec leur vocal)."
  echo "   Le programme et les modèles restent dans /opt/opmsg/whisper (l'autre instance s'en sert peut-être). Quand plus aucune ne s'en sert :  rm -rf /opt/opmsg/whisper"
  exit 0
fi

echo "── OP MESSAGES · transcription des vocaux · instance $INSTANCE"

# ── 1. TOUT VÉRIFIER AVANT D'ÉCRIRE ───────────────────────────────────────────────────────────────────────────────────────────────────────────
[ -n "$PORT_SERVICE" ] || { echo "✗ le port du service est illisible ($ETC/$INSTANCE.env) : relancer install-msg.sh $INSTANCE"; exit 1; }
if [ ! -f "$OUVRIER" ] || [ ! -f "$VERIF" ]; then
  echo "✗ la version d'OP MESSAGES en service est antérieure à la transcription ($OUVRIER ou $VERIF est absent) : déploie d'abord la version à jour (merge sur main, la CI déploie), puis relance ce script"
  exit 1
fi
# (les bancs seuls — une racine factice — présentent leur propre /proc/meminfo : sur le VPS, OPMSG_RACINE est vide et c'est celui du noyau)
MEMINFO=/proc/meminfo
if [ -n "$R" ] && [ -n "${OPMSG_MEMINFO_BANC:-}" ]; then MEMINFO="$OPMSG_MEMINFO_BANC"; fi
MEM_TOTALE="$(awk '/^MemTotal:/ { print int($2 / 1024) }' "$MEMINFO" 2>/dev/null || echo 0)"
MEM_LIBRE="$(awk '/^MemAvailable:/ { print int($2 / 1024) }' "$MEMINFO" 2>/dev/null || echo 0)"
[[ "$MEM_TOTALE" =~ ^[0-9]+$ ]] || MEM_TOTALE=0
[[ "$MEM_LIBRE" =~ ^[0-9]+$ ]] || MEM_LIBRE=0
if [ "$MEM_TOTALE" -lt "$MEMOIRE_TOTALE_MIN_MO" ]; then
  echo "✗ la machine a $MEM_TOTALE Mo de mémoire : il en faut au moins $MEMOIRE_TOTALE_MIN_MO (elle porte aussi OP GESTION, et le modèle en prend ~470 en calcul) — rien n'est posé"
  exit 1
fi
if [ "$MEM_LIBRE" -lt "$MEMOIRE_LIBRE_MIN_MO" ]; then
  echo "✗ il ne reste que $MEM_LIBRE Mo de mémoire disponible : il en faut au moins $MEMOIRE_LIBRE_MIN_MO pour l'ouvrier — rien n'est posé"
  exit 1
fi
mkdir -p "$R/opt"
DISQUE_LIBRE="$(df -Pm "$R/opt" 2>/dev/null | awk 'NR == 2 { print $4 }' || echo 0)"
[[ "$DISQUE_LIBRE" =~ ^[0-9]+$ ]] || DISQUE_LIBRE=0
if [ "$DISQUE_LIBRE" -lt "$DISQUE_LIBRE_MIN_MO" ] && ! { [ -x "$W_DIR/whisper-cli" ] && [ -f "$M_DIR/$MODELE_NOM" ]; }; then
  echo "✗ il ne reste que $DISQUE_LIBRE Mo sur le disque de /opt : il en faut au moins $DISQUE_LIBRE_MIN_MO (la compilation, ffmpeg et le modèle) — rien n'est posé"
  exit 1
fi
NPROC="$(nproc 2>/dev/null || echo 1)"
[[ "$NPROC" =~ ^[0-9]+$ ]] || NPROC=1
THREADS="${OPMSG_TRANSCRIPTION_THREADS:-}"
if [ -z "$THREADS" ]; then if [ "$NPROC" -ge 2 ]; then THREADS=2; else THREADS=1; fi; fi
[[ "$THREADS" =~ ^[1-8]$ ]] || { echo "✗ OPMSG_TRANSCRIPTION_THREADS doit être un nombre de 1 à 8"; exit 1; }
echo "   machine : $NPROC cœur(s), $MEM_TOTALE Mo de mémoire ($MEM_LIBRE disponibles), $DISQUE_LIBRE Mo libres sur /opt · l'ouvrier calculera sur $THREADS cœur(s)"

# ── 2. FFMPEG, puis WHISPER.CPP compilé depuis ses sources, au commit épinglé ──────────────────────────────────────────────────────────────────
if [ ! -x "$R$FFMPEG_REEL" ]; then
  echo "   ffmpeg : installation (paquet Ubuntu)"
  apt-get install -y -qq --no-install-recommends ffmpeg >/dev/null || true
fi
[ -x "$R$FFMPEG_REEL" ] || { echo "✗ ffmpeg n'est pas installé après apt-get : on s'arrête avant de rien écrire"; exit 1; }

# ⛔ whisper.cpp est compilé pour CE processeur (GGML_NATIVE : sans lui, le calcul est plusieurs fois plus lent) — un VPS migré vers un processeur plus ancien
# ferait « instruction illégale » (relecture du gardien). Les capacités du processeur sont donc relevées à la compilation : si elles changent, on recompile.
CPU_EMPREINTE="$( (grep -m1 -E '^(flags|Features)' /proc/cpuinfo 2>/dev/null || echo inconnu) | sha256sum | cut -c1-16)"
programme_intact() {
  [ -x "$W_DIR/whisper-cli" ] && [ -f "$W_DIR/whisper-cli.sha256" ] && [ "$(cat "$W_DIR/commit" 2>/dev/null)" = "$WHISPER_COMMIT" ] && [ -f "$W_DIR/jfk.wav" ] \
    && [ "$(cat "$W_DIR/cpu" 2>/dev/null)" = "$CPU_EMPREINTE" ] \
    && [ "$(sha256sum "$W_DIR/whisper-cli" | cut -d' ' -f1)" = "$(cat "$W_DIR/whisper-cli.sha256")" ]
}
# ⛔ la récupération et la compilation tournent SANS privilège (relecture du gardien : même au commit épinglé, un script de construction n'a pas à tourner en root) —
# le compte `nobody`, dans un dossier qui lui appartient ; seule la copie du résultat se fait en root. (Les bancs, racine factice, lancent leurs faux outils tels quels.)
sans_privilege() { if [ -z "$R" ]; then setpriv --reuid=nobody --regid=nogroup --clear-groups -- env HOME="$TMPD" "$@"; else "$@"; fi; }
if programme_intact; then
  echo "   whisper.cpp $WHISPER_VERSION : déjà là, intact"
else
  echo "   whisper.cpp $WHISPER_VERSION : compilation depuis les sources (quelques minutes)"
  for p in git cmake g++ make; do command -v "$p" >/dev/null 2>&1 || { apt-get install -y -qq --no-install-recommends git cmake build-essential ca-certificates >/dev/null || true; break; }; done
  for p in git cmake g++ make; do command -v "$p" >/dev/null 2>&1 || { echo "✗ $p n'est pas installé après apt-get : whisper.cpp ne peut pas se compiler — rien n'est posé"; exit 1; }; done
  [ -n "$R" ] || command -v setpriv >/dev/null 2>&1 || { echo "✗ setpriv est absent (paquet util-linux) : la compilation ne tournera pas en root — rien n'est posé"; exit 1; }
  TMPD="$(mktemp -d)"
  trap 'rm -rf "$TMPD"' EXIT
  [ -n "$R" ] || chown nobody:nogroup "$TMPD"
  sans_privilege git init -q "$TMPD/src"
  sans_privilege git -C "$TMPD/src" remote add origin "$WHISPER_DEPOT"
  sans_privilege git -C "$TMPD/src" fetch -q --depth 1 origin "$WHISPER_COMMIT" 2>"$TMPD/git.log" || { echo "✗ le commit $WHISPER_COMMIT de whisper.cpp n'a pas pu être récupéré (réseau ?) :"; tail -3 "$TMPD/git.log"; exit 1; }
  sans_privilege git -C "$TMPD/src" checkout -q FETCH_HEAD
  RECU="$(sans_privilege git -C "$TMPD/src" rev-parse HEAD)"
  [ "$RECU" = "$WHISPER_COMMIT" ] || { echo "✗ le commit récupéré ($RECU) n'est pas celui qui est épinglé ($WHISPER_COMMIT) : rien n'est compilé"; exit 1; }
  if ! sans_privilege cmake -S "$TMPD/src" -B "$TMPD/build" -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF \
       -DWHISPER_SDL2=OFF -DWHISPER_CURL=OFF -DGGML_NATIVE=ON >"$TMPD/cmake.log" 2>&1; then
    echo "✗ la configuration de la compilation a échoué :"; tail -5 "$TMPD/cmake.log"; exit 1
  fi
  if ! sans_privilege cmake --build "$TMPD/build" -j "$NPROC" --target whisper-cli >"$TMPD/build.log" 2>&1; then
    echo "✗ la compilation a échoué :"; tail -5 "$TMPD/build.log"; exit 1
  fi
  [ -x "$TMPD/build/bin/whisper-cli" ] || { echo "✗ la compilation n'a pas produit whisper-cli"; exit 1; }
  rm -rf "$W_DIR.nouveau"; mkdir -p "$W_DIR.nouveau"
  cp "$TMPD/build/bin/whisper-cli" "$W_DIR.nouveau/whisper-cli"
  cp "$TMPD/src/samples/jfk.wav" "$W_DIR.nouveau/jfk.wav"
  cp "$TMPD/src/LICENSE" "$W_DIR.nouveau/LICENSE"
  sha256sum "$W_DIR.nouveau/whisper-cli" | cut -d' ' -f1 > "$W_DIR.nouveau/whisper-cli.sha256"
  printf '%s\n' "$WHISPER_COMMIT" > "$W_DIR.nouveau/commit"
  printf '%s\n' "$CPU_EMPREINTE" > "$W_DIR.nouveau/cpu"
  rm -rf "$W_DIR"; mv "$W_DIR.nouveau" "$W_DIR"
  rm -rf "$TMPD"; trap - EXIT
fi
chown -R root:root "$W_DIR"; chmod 755 "$W_DIR" "$W_DIR/whisper-cli"; chmod 644 "$W_DIR/jfk.wav" "$W_DIR/LICENSE" "$W_DIR/whisper-cli.sha256" "$W_DIR/commit" "$W_DIR/cpu"
programme_intact || { echo "✗ whisper.cpp n'est pas intact après son installation : rien n'est posé"; exit 1; }

# ── 3. LES MODÈLES, leur empreinte VÉRIFIÉE ──────────────────────────────────────────────────────────────────────────────────────────────────────
# (les bancs seuls — une racine factice — peuvent présenter leurs propres modèles : sur le VPS, OPMSG_RACINE est vide et ces lignes ne font rien)
if [ -n "$R" ] && [ -n "${OPMSG_TRANSCRIPTION_EMPREINTE_MODELE_BANC:-}" ]; then MODELE_EMPREINTE="$OPMSG_TRANSCRIPTION_EMPREINTE_MODELE_BANC"; fi
if [ -n "$R" ] && [ -n "${OPMSG_TRANSCRIPTION_EMPREINTE_VAD_BANC:-}" ]; then VAD_EMPREINTE="$OPMSG_TRANSCRIPTION_EMPREINTE_VAD_BANC"; fi
mkdir -p "$M_DIR"; chown root:root "$M_DIR"; chmod 755 "$M_DIR"
poser_modele() {   # $1 = nom, $2 = adresse, $3 = empreinte attendue
  local dest="$M_DIR/$1" tmp="$M_DIR/.$1.telechargement"
  if [ -f "$dest" ] && [ "$(sha256sum "$dest" | cut -d' ' -f1)" = "$3" ]; then echo "   modèle $1 : déjà là, intact"; return 0; fi
  rm -f "$tmp"
  if [ -n "${OPMSG_TRANSCRIPTION_MODELES:-}" ]; then
    cp "$OPMSG_TRANSCRIPTION_MODELES/$1" "$tmp" 2>/dev/null || { echo "✗ le modèle $1 est absent de $OPMSG_TRANSCRIPTION_MODELES"; return 1; }
  else
    echo "   modèle $1 : téléchargement"
    curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --tlsv1.2 --retry 3 --max-time 1800 -o "$tmp" "$2" \
      || { rm -f "$tmp"; echo "✗ le modèle $1 n'a pas pu être téléchargé ($2)"; return 1; }
  fi
  if [ "$(sha256sum "$tmp" | cut -d' ' -f1)" != "$3" ]; then rm -f "$tmp"; echo "✗ le modèle $1 ne porte pas l'empreinte attendue : il n'est pas gardé"; return 1; fi
  chmod 644 "$tmp"; mv "$tmp" "$dest"
}
poser_modele "$MODELE_NOM" "$MODELE_URL" "$MODELE_EMPREINTE" || exit 1
poser_modele "$VAD_NOM" "$VAD_URL" "$VAD_EMPREINTE" || exit 1

# ÉCHEC = FERMÉ — défini AVANT d'écrire quoi que ce soit : les pièges posés après l'écriture des configurations l'appellent.
annuler() {   # $1 = ce qu'il faut dire. ÉCHEC = FERMÉ : tout ce que la transcription a posé est défait.
  trap - HUP INT TERM ERR
  set +e
  echo ""
  echo "$1"
  echo "── Retour en arrière : la transcription est retirée, OP MESSAGES continue comme avant."
  # Une PREMIÈRE installation (la configuration d'avant n'avait pas de transcription) : elle revient OCTET POUR OCTET. Une réinstallation : la transcription en est retirée.
  if [ -f "$CONFIG.avant-transcription" ] && ! avait_transcription "$CONFIG.avant-transcription"; then
    mv "$CONFIG.avant-transcription" "$CONFIG"; chown opmsg:opmsg "$CONFIG" 2>/dev/null || true; chmod 600 "$CONFIG"
  fi
  rm -f "$CONFIG.avant-transcription"
  tout_retirer
  exit 1
}
avait_transcription() { node -e 'try { const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); process.exit(c && c.transcription ? 0 : 1); } catch (e) { process.exit(2); }' "$1"; }

# ── 4. LE COMPTE DE L'OUVRIER, LES DEUX CONFIGURATIONS (le secret partagé) ───────────────────────────────────────────────────────────────────────
if ! id -u "$COMPTE" >/dev/null 2>&1; then
  useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin --user-group "$COMPTE"
fi
[ ! -f "$CONFIG.avant-transcription" ] || rm -f "$CONFIG.avant-transcription"
cp -p "$CONFIG" "$CONFIG.avant-transcription"; chmod 600 "$CONFIG.avant-transcription"
if ! ETAT="$(THREADS="$THREADS" configurer poser)"; then
  mv "$CONFIG.avant-transcription" "$CONFIG" 2>/dev/null || true
  chown opmsg:opmsg "$CONFIG" 2>/dev/null || true; chmod 600 "$CONFIG"
  echo "⛔ la configuration n'a pas pu être écrite ($(printf '%s' "$ETAT" | masquer)) — rien n'est changé, le service n'est pas touché."
  exit 1
fi
echo "   $(printf '%s' "$ETAT" | masquer)"
# ⛔ À PARTIR D'ICI, LES CONFIGURATIONS SONT ÉCRITES : une coupure (session SSH perdue, Ctrl-C) ou une commande qui échoue défait TOUT (relecture du gardien) —
# sinon l'instance chargeait la transcription à son prochain redémarrage sans ouvrier prouvé, et la copie `.avant-transcription` (tous les secrets de
# l'instance) restait sur le disque.
trap 'annuler "⛔ installation interrompue : rien n'"'"'est laissé à moitié."' HUP INT TERM
trap 'annuler "⛔ une étape a échoué (ligne $LINENO) : rien n'"'"'est laissé à moitié."' ERR
chown opmsg:opmsg "$CONFIG"; chmod 600 "$CONFIG"
chown "root:$COMPTE" "$TR_CONF"; chmod 640 "$TR_CONF"
case "$ETAT" in *"ouvrier=change"*) CHANGE_OUVRIER=oui ;; *) CHANGE_OUVRIER=non ;; esac
case "$ETAT" in *"instance=change"*) CHANGE_INSTANCE=oui ;; *) CHANGE_INSTANCE=non ;; esac

# ── 5. L'UNITÉ, LE DÉMARRAGE — puis le CONTRÔLE ─────────────────────────────────────────────────────────────────────────────────────────────────
mkdir -p "$SYSD"
# Le bac à sable de l'unité, et pourquoi chaque ligne :
#  · un compte à lui, aucun privilège (CapabilityBoundingSet vide), NoNewPrivileges ; le disque en lecture seule (ProtectSystem=strict), sauf son dossier d'exécution ;
#  · PrivateNetwork + RestrictAddressFamilies=AF_UNIX : AUCUN réseau, pas même la boucle locale — il n'écoute que sa socket Unix (un vocal forgé qui ferait
#    déraper ffmpeg ne pourrait rien envoyer nulle part, ni joindre l'API d'OP GESTION ou l'autre instance) ;
#  · RuntimeDirectory (0750, groupe de l'ouvrier) : la socket, et les fichiers de travail en mémoire vive, chacun dans un dossier 0700, effacés avec l'unité —
#    aucune voix en clair sur le disque ; LimitCORE=0 pour la même raison (un plantage de ffmpeg écrirait l'audio déchiffré dans un vidage mémoire) ;
#  · /etc/opmsg remplacé par un dossier vide où seule SA configuration est montée : les configurations des instances (leurs secrets) n'existent pas pour lui ;
#  · SystemCallFilter : les appels d'un service ordinaire, sans les privilégiés — la couche principale contre une faille d'un décodeur sur un fichier hostile
#    (un appel refusé rend EPERM ; le CONTRÔLE ci-dessous transcrit pour de vrai sous ce filtre, et un filtre trop strict défait l'installation) ;
#  · ProtectProc=invisible : les processus d'OP GESTION et du service lui sont cachés ;
#  · MemoryMax=1200M sans échange, OOMScoreAdjust=500, CPUQuota=200 %, CPUWeight/IOWeight bas, Nice=10 : si une transcription s'emballe, c'est elle qui ploie
#    (et c'est elle que la mémoire épuisée tue en premier), pas OP GESTION ;
#  · les données des deux instances sont INACCESSIBLES (en plus de leurs droits) ; pas de MemoryDenyWriteExecute : V8 compile à chaud, il en mourrait.
printf '%s\n' "# Posé par server-msg/install-transcription.sh — réécrit à chaque installation, ne pas éditer à la main." \
  '[Unit]' 'Description=OP MESSAGES — transcription des vocaux (instance %i)' '' \
  '[Service]' 'Type=simple' 'User=opmsg-transcrire-%i' 'Group=opmsg-transcrire-%i' 'WorkingDirectory=/' \
  'Environment=NODE_ENV=production' 'Environment=OPMSG_TRANSCRIRE_CONFIG=/etc/opmsg/transcrire-%i.json' \
  'ExecStart=/usr/bin/node /opt/opmsg/%i/current/transcripteur.js' 'Restart=always' 'RestartSec=2' 'UMask=0077' \
  'RuntimeDirectory=opmsg-transcrire-%i' 'RuntimeDirectoryMode=0750' \
  'NoNewPrivileges=true' 'ProtectSystem=strict' 'PrivateTmp=true' 'ProtectHome=true' 'PrivateDevices=true' 'PrivateNetwork=true' \
  'ProtectKernelTunables=true' 'ProtectKernelModules=true' 'ProtectKernelLogs=true' 'ProtectControlGroups=true' 'ProtectClock=true' 'ProtectHostname=true' 'ProtectProc=invisible' \
  'RestrictAddressFamilies=AF_UNIX' 'RestrictNamespaces=true' 'RestrictRealtime=true' 'RestrictSUIDSGID=true' 'LockPersonality=true' \
  'SystemCallArchitectures=native' 'SystemCallFilter=@system-service' 'SystemCallFilter=~@privileged @mount @swap @reboot @raw-io @obsolete @debug @cpu-emulation @module @clock' 'SystemCallErrorNumber=EPERM' \
  'CapabilityBoundingSet=' 'AmbientCapabilities=' \
  'IPAddressDeny=any' \
  'TemporaryFileSystem=/etc/opmsg:ro' 'BindReadOnlyPaths=/etc/opmsg/transcrire-%i.json' \
  'InaccessiblePaths=-/opt/opmsg/beta/data -/opt/opmsg/prod/data' \
  'LimitCORE=0' 'OOMScoreAdjust=500' \
  'MemoryMax=1200M' 'MemorySwapMax=0' 'CPUQuota=200%' 'CPUWeight=10' 'IOWeight=10' 'Nice=10' 'TasksMax=32' 'LimitNOFILE=256' '' \
  '[Install]' 'WantedBy=multi-user.target' > "$SYSD/opmsg-transcrire@.service.nouveau"
if [ -f "$SYSD/opmsg-transcrire@.service" ] && cmp -s "$SYSD/opmsg-transcrire@.service.nouveau" "$SYSD/opmsg-transcrire@.service"; then
  rm -f "$SYSD/opmsg-transcrire@.service.nouveau"
else
  mv "$SYSD/opmsg-transcrire@.service.nouveau" "$SYSD/opmsg-transcrire@.service"; chmod 644 "$SYSD/opmsg-transcrire@.service"
  systemctl daemon-reload
  CHANGE_OUVRIER=oui
fi
# Le complément de l'unité de l'INSTANCE : le groupe de son ouvrier (pour joindre la socket), et seulement le sien — l'autre instance ne le reçoit pas.
mkdir -p "$(dirname "$COMPLEMENT")"
printf '%s\n' "# Posé par server-msg/install-transcription.sh — retiré par « retirer ». Ne pas éditer à la main." '[Service]' "SupplementaryGroups=$COMPTE" > "$COMPLEMENT.nouveau"
if [ -f "$COMPLEMENT" ] && cmp -s "$COMPLEMENT.nouveau" "$COMPLEMENT"; then
  rm -f "$COMPLEMENT.nouveau"
else
  mv "$COMPLEMENT.nouveau" "$COMPLEMENT"; chmod 644 "$COMPLEMENT"
  systemctl daemon-reload
  CHANGE_INSTANCE=oui
fi
systemctl enable "$UNITE_TR" >/dev/null 2>&1 || true
if [ "$CHANGE_OUVRIER" = "oui" ] || ! actif "$UNITE_TR"; then systemctl restart "$UNITE_TR" || true; fi
for _ in $(seq 1 10); do actif "$UNITE_TR" && break; sleep 1; done
actif "$UNITE_TR" || annuler "⛔ l'ouvrier de transcription n'a pas démarré. Voir :  systemctl status $UNITE_TR --no-pager | head -5"
# ⛔ « actif » ne veut pas dire « prêt » (11 octobre 2026, sur le VPS : « socket … absente ») : pour un Type=simple, systemd rend la main dès le LANCEMENT
# du processus, et le contrôle partait avant que Node ait chargé et ouvert sa socket. On attend la socket (20 s au plus) — et un ouvrier qui meurt
# au démarrage (une configuration refusée, un appel système filtré) se dit ici, avec la commande qui montre pourquoi, au lieu d'un contrôle qui échoue.
for _ in $(seq 1 40); do [ -S "$SOCKET" ] && break; actif "$UNITE_TR" || break; sleep 0.5; done
if [ ! -S "$SOCKET" ]; then
  if actif "$UNITE_TR"; then
    annuler "⛔ l'ouvrier tourne mais n'a pas ouvert sa socket en 20 s. Voir :  systemctl status $UNITE_TR --no-pager | head -5"
  else
    annuler "⛔ l'ouvrier de transcription s'est arrêté au démarrage ($(finOuvrier)). Voir :  systemctl status $UNITE_TR --no-pager | head -5"
  fi
fi
echo "── Contrôle de l'ouvrier (il refuse qui n'a pas le secret, et transcrit l'échantillon de whisper.cpp)…"
OPMSG_TRANSCRIRE_CONFIG="$TR_CONF" node "$VERIF" "$INSTANCE" "$W_DIR/jfk.wav" 2>&1 | masquer \
  || annuler "⛔ l'ouvrier ne fait pas ce qu'il doit (voir les ✗ ci-dessus) : rien n'est proposé aux personnes."

# ── 6. L'INSTANCE : relancée si sa configuration a changé, puis on lui demande si elle voit l'ouvrier ─────────────────────────────────────────────
if ! actif "$UNITE"; then
  annuler "⛔ l'instance ($UNITE) ne tourne pas : on ne peut pas prouver qu'elle voit l'ouvrier. Démarre-la, puis relance ce script."
fi
if [ "$CHANGE_INSTANCE" = "oui" ] || ! sante_transcription oui; then
  systemctl restart "$UNITE" || true
fi
attendre_sante oui || annuler "⛔ l'instance a redémarré mais ne voit pas l'ouvrier (/health : transcription.ok). Voir :  systemctl status $UNITE --no-pager | head -5"
echo "   ✓ l'instance voit l'ouvrier (/health : transcription.ok)"

rm -f "$CONFIG.avant-transcription"
echo ""
echo "✓ La transcription des vocaux est en place pour $INSTANCE : sous chaque vocal, « Voir la transcription » (recharger la page)."
echo "   Un vocal se transcrit une fois, sur cette machine, et le texte est partagé par tous ceux qui peuvent l'écouter. Aucune voix ne sort du serveur."
echo "   L'ouvrier :  systemctl status $UNITE_TR --no-pager | head -5   — son journal ne contient ni texte ni voix."
echo "   Tout retirer :  bash install-transcription.sh $INSTANCE retirer"
