#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════════════════════════
#  Installation du SERVEUR DE VISIO d'OP MESSAGES (LiveKit) — à lancer APRÈS install-msg.sh, en root.
#
#  Usage :   bash install-sfu.sh beta              (ou prod — l'instance doit déjà être installée)
#            bash install-sfu.sh beta retirer      (tout enlever : les salles repassent en maille, rien d'autre ne change)
#
#  Décision de Justin du 8 octobre 2026 : « oui plus en vidéo et audio ». Le module : server-msg/visio.js. Le mode d'emploi, geste par geste :
#  design/opmessages/INSTALLER-LE-SERVEUR.md (« Le serveur de visio »). L'essai sur de vrais téléphones : design/opmessages/ESSAI-VISIO.md.
#
#  Pourquoi : en maille, chaque téléphone envoie son image à CHACUN des autres — au-delà de 4 en vidéo (6 en audio), un téléphone en 4G ne suit plus.
#  Le serveur de visio reçoit UNE image de chacun et la renvoie aux autres : une salle tient alors 12 personnes en vidéo, 25 en audio (valeurs de
#  départ, À MESURER sur de vrais téléphones avant de rien promettre). ⚠️ Contrairement au relais (coturn), il DÉCHIFFRE les flux pour les renvoyer :
#  l'image et la voix passent en clair dans sa mémoire, sur NOTRE machine, sans jamais être écrites ni enregistrées — « chiffré en transit », pas de
#  bout en bout (SERVEUR.md, questions 4, 40 et 62).
#
#  Ce que fait ce script, dans l'ordre :
#    1. vérifie tout ce dont il a besoin AVANT d'écrire quoi que ce soit (l'instance, sa version, le bloc HTTPS de nginx, l'adresse publique) ;
#    2. télécharge LiveKit depuis sa page de publication et VÉRIFIE l'empreinte de l'archive, épinglée ci-dessous (une archive qui ne correspond pas
#       n'est pas ouverte) ; un compte système à lui, sans shell ni dossier ;
#    3. tire la CLÉ et le SECRET au hasard, ICI, et les écrit dans la configuration de LiveKit ET dans celle de l'instance (jamais affichés) ;
#    4. démarre LiveKit derrière son PARE-FEU SORTANT (visio-pare-feu.sh, rejoué par systemd avant chaque démarrage), puis le CONTRÔLE
#       (outils/verifier-visio.js : la sonde répond, notre clé ouvre l'API, une fausse est refusée, la signalisation exige un jeton) ;
#    5. branche le chemin /rtc dans le bloc HTTPS de l'instance (nginx) et contrôle, par le nom public, qu'il mène bien à LiveKit ;
#    6. relance l'instance, attend qu'elle voie la visio (/health), puis PROUVE que les avis de LiveKit lui arrivent signés (sans eux, une personne
#       retirée d'une salle pourrait y revenir avec le jeton que LiveKit lui rafraîchit) ;
#    7. SEULEMENT ALORS : ouvre ses deux ports dans le pare-feu du VPS (ufw, s'il est actif).
#  Une étape ratée défait TOUT (ÉCHEC = FERMÉ) : la visio est retirée, OP MESSAGES continue comme avant, en maille — et le script dit pourquoi.
#
#  ⛔ CE SCRIPT NE TOUCHE JAMAIS À OP GESTION : ni ses dossiers, ni son unité, ni le bloc de son API dans nginx. Dans nginx, il ne touche que le
#  fichier de l'INSTANCE (trois lignes entre deux marques : un `include`) et un fichier à lui.
#  ⛔ IL N'AFFICHE JAMAIS UN SECRET (règle du 24 septembre 2026 : Justin recolle toutes ses sorties dans la conversation). Le secret naît dans un
#  processus Node, passe d'un fichier à l'autre sans traverser le shell, et ne figure ni dans un argument, ni dans l'environnement, ni dans une
#  variable de ce script.
#  ⛔ IL EST REJOUABLE : la clé existante est REPRISE ; une configuration identique n'est pas réécrite ; LiveKit et l'instance ne sont relancés que si
#  quelque chose a changé ; les lignes de nginx et les règles du pare-feu ne se dupliquent pas.
#
#  Une instance à part de l'autre : deux LiveKit, deux comptes, deux clés, deux chaînes de pare-feu — la bêta ne peut rien sur la production.
#  Les deux ports PUBLICS de l'instance (l'image) sont à ouvrir AUSSI dans le panneau de l'hébergeur, AVANT de lancer ce script : sans eux, la
#  signalisation passe (443) mais aucune image, et une salle par la visio ne s'établit pas.
#
#  Variables (toutes facultatives) :
#    OPMSG_RACINE          préfixe de tous les chemins — UNIQUEMENT pour les bancs (bac à sable)
#    OPMSG_VISIO_IP        l'adresse IPv4 PUBLIQUE du VPS, si celle de sa route par défaut est privée (un hébergeur qui traduit les adresses)
#    OPMSG_VISIO_ARCHIVE   le chemin d'une archive de LiveKit déjà téléchargée (si le VPS n'atteint pas GitHub) — son empreinte est vérifiée pareil
# ════════════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

INSTANCE="${1:-}"
GESTE="${2:-installer}"
# ⛔ LES PORTS, instance par instance. La signalisation (HTTP) n'écoute qu'en boucle locale ; TCP et UDP sont publics. La surveillance horaire frappe au
# port TCP de chaque instance (.github/scripts/surveillance-messages.js, VISIO_PORTS_TCP) : tests/test-934.js relit cette table et compare.
case "$INSTANCE" in
  beta) PORT_HTTP=7880; PORT_TCP=7881; PORT_UDP=7882 ;;
  prod) PORT_HTTP=7890; PORT_TCP=7891; PORT_UDP=7892 ;;
  *) echo "usage : bash install-sfu.sh <beta|prod> [retirer]"; exit 2 ;;
esac
case "$GESTE" in installer|retirer) ;; *) echo "usage : bash install-sfu.sh <beta|prod> [retirer]"; exit 2 ;; esac

# ── LiveKit : la version, et l'empreinte de chaque archive publiée ─────────────────────────────────────────────────────────────────────────────
# ⛔ Relues dans le `checksums.txt` de la publication v1.13.7 le 8 octobre 2026 — l'archive amd64 retéléchargée, son empreinte recalculée, et son binaire
# ÉPROUVÉ par les bancs contre le module du service (tests/test-953.js, LIVEKIT_SERVER_BIN). Une archive qui ne porte pas EXACTEMENT la sienne n'est pas
# ouverte. Changer de version, c'est changer ces trois lignes ET rejouer les bancs et la sonde au navigateur contre le nouveau binaire.
VERSION="1.13.7"
declare -A EMPREINTES=(
  [amd64]="6634aeeb2fb1366b6723708ae4320b9d5408106a4c63457c5e845ae3979c90e2"
  [arm64]="5d167fdf52cf43c0c72972f25325364479f41f854bfef651056eab2504da5de9"
)
# ⛔ Le plafond de la MACHINE (elle porte aussi OP GESTION) : au-delà de 20 Mo/s (160 Mbit/s) reçus et envoyés, LiveKit n'admet plus personne de neuf —
# les salles en cours continuent. Une salle de 12 en vidéo en consomme de l'ordre de 60 Mbit/s (À MESURER : ESSAI-VISIO.md).
DEBIT_MAX=20000000

R="${OPMSG_RACINE:-}"
OPT="$R/opt/opmsg"
ETC="$R/etc/opmsg"
CONFIG="$ETC/$INSTANCE.json"
LK_DIR_REEL="/opt/opmsg/livekit/$VERSION"
LK_DIR="$R$LK_DIR_REEL"
LK_CONF_REEL="/etc/opmsg/visio-$INSTANCE.yaml"
LK_CONF="$R$LK_CONF_REEL"
COMPTE="opmsg-visio-$INSTANCE"
CHAINE="OPMSG-VISIO-${INSTANCE^^}"
UNITE_VISIO="opmsg-visio-$INSTANCE"
SYSD="$R/etc/systemd/system"
NGX="$R/etc/nginx"
EXTRAIT_REEL="/etc/nginx/opmsg/visio-$INSTANCE.locations"
EXTRAIT="$R$EXTRAIT_REEL"
PF_REEL="/usr/local/sbin/opmsg-visio-pare-feu"
PF_BIN="$R$PF_REEL"
PF_SRC="$OPT/$INSTANCE/current/visio-pare-feu.sh"
VERIF="$OPT/$INSTANCE/current/outils/verifier-visio.js"
UNITE="teamop-msg@$INSTANCE"
MARQUE_DEBUT="# >>> opmsg-visio : posé par install-sfu.sh, retiré par « install-sfu.sh $INSTANCE retirer » — ne pas éditer à la main"
MARQUE_FIN="# <<< opmsg-visio"
if [ -d "$NGX/sites-available" ]; then NGX_INSTANCE="$NGX/sites-available/opmsg-$INSTANCE.conf"; else NGX_INSTANCE="$NGX/conf.d/opmsg-$INSTANCE.conf"; fi

if [ -z "$R" ] && [ "$(id -u)" != "0" ]; then echo "✗ à lancer en root"; exit 1; fi
[ -f "$CONFIG" ] || { echo "✗ l'instance $INSTANCE n'est pas installée ($CONFIG est absent) : lancer d'abord install-msg.sh $INSTANCE"; exit 1; }
command -v node >/dev/null || { echo "✗ node est absent du VPS"; exit 1; }

# Rien de ce qui touche un secret ne s'affiche tel quel : tout mot de 40 caractères « d'identifiant » ou plus est masqué.
masquer() { sed -E 's/[A-Za-z0-9_-]{40,}/[masqué]/g'; }
actif() { systemctl is-active --quiet "$1"; }

PORT_SERVICE="$(sed -n 's/^PORT=//p' "$ETC/$INSTANCE.env" 2>/dev/null || true)"
[[ "$PORT_SERVICE" =~ ^[0-9]{2,5}$ ]] || PORT_SERVICE=""

# ── Les quatre gestes que le script sait faire, utilisés par l'installation, par l'échec (qui défait tout) et par « retirer » ──────────────────────
# (1) la configuration de l'instance : poser ou retirer `appels.visio`. Un seul programme Node, qui ne reçoit que des chemins, des ports et des noms :
#     le secret n'en sort jamais. Ce qu'il imprime : des mots d'état.
configurer_instance() {   # $1 = poser | retirer → imprime l'état ; sort ≠ 0 si la configuration n'a pas pu être écrite
  MODE="$1" CONFIG_INSTANCE="$CONFIG" LK_CONF="$LK_CONF" MODELE="${MODELE:-}" PORT_HTTP="$PORT_HTTP" PORT_SERVICE="$PORT_SERVICE" \
  node - <<'PROGRAMME'
"use strict";
const fs = require("fs"), crypto = require("crypto"), e = process.env;
const RE_SECRET = /^[A-Za-z0-9_-]{32,128}$/, RE_CLE = /^[A-Za-z0-9_-]{6,64}$/, RE_DOMAINE = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;
const lire = (p) => { try { const j = JSON.parse(fs.readFileSync(p, "utf8")); return j && typeof j === "object" && !Array.isArray(j) ? j : null; } catch (x) { return null; } };
const ecrire = (p, texte, mode) => { const t = p + ".nouveau"; fs.writeFileSync(t, texte, { mode: mode }); fs.renameSync(t, p); };
try {
  const cfg = lire(e.CONFIG_INSTANCE);
  if (!cfg) { console.log("configuration-illisible"); process.exit(3); }
  const avant = fs.readFileSync(e.CONFIG_INSTANCE, "utf8");
  const appels = (cfg.appels && typeof cfg.appels === "object" && !Array.isArray(cfg.appels)) ? cfg.appels : {};
  if (e.MODE === "retirer") {
    if (!("visio" in appels)) { console.log("instance=inchange"); process.exit(0); }
    const sans = Object.assign({}, appels); delete sans.visio;
    ecrire(e.CONFIG_INSTANCE, JSON.stringify(Object.assign({}, cfg, { appels: sans }), null, 2) + "\n", 0o600);
    console.log("instance=change");
    process.exit(0);
  }
  if (typeof cfg.domaine !== "string" || !RE_DOMAINE.test(cfg.domaine)) { console.log("domaine-illisible"); process.exit(3); }
  const ancien = (appels.visio && typeof appels.visio === "object" && !Array.isArray(appels.visio)) ? appels.visio : {};
  const repris = typeof ancien.cle === "string" && RE_CLE.test(ancien.cle) && typeof ancien.secret === "string" && RE_SECRET.test(ancien.secret);
  const cle = repris ? ancien.cle : "OP" + crypto.randomBytes(8).toString("hex");
  const secret = repris ? ancien.secret : crypto.randomBytes(48).toString("base64url");
  /* les réglages de capacité posés à la main (maxVideo, maxAudio…) sont GARDÉS : le script ne pose que l'adresse et la paire de clés */
  const garde = {};
  for (const k of ["maxVideo", "maxAudio", "ttlS", "sondeMs", "delaiMs"]) if (Number.isInteger(ancien[k])) garde[k] = ancien[k];
  const visio = Object.assign({ url: "wss://" + cfg.domaine, interne: "http://127.0.0.1:" + Number(e.PORT_HTTP), cle: cle, secret: secret }, garde);
  const texte = JSON.stringify(Object.assign({}, cfg, { appels: Object.assign({}, appels, { visio: visio }) }), null, 2) + "\n";
  const changeInstance = avant !== texte;
  if (changeInstance) ecrire(e.CONFIG_INSTANCE, texte, 0o600);
  /* la configuration de LiveKit : le modèle (écrit par le script, sans secret) + la paire de clés + l'adresse des avis (le service, en boucle locale) */
  const conf = fs.readFileSync(e.MODELE, "utf8") +
    "keys:\n  \"" + cle + "\": \"" + secret + "\"\n" +
    "webhook:\n  api_key: \"" + cle + "\"\n  urls:\n    - \"http://127.0.0.1:" + Number(e.PORT_SERVICE) + "/api/visio/avis\"\n";
  let existant = null;
  try { existant = fs.readFileSync(e.LK_CONF, "utf8"); } catch (x) { existant = null; }
  const changeLk = existant !== conf;
  if (changeLk) ecrire(e.LK_CONF, conf, 0o640);
  console.log("cle=" + (repris ? "reprise" : "nouvelle") + " instance=" + (changeInstance ? "change" : "inchange") + " livekit=" + (changeLk ? "change" : "inchange"));
} catch (x) {
  console.log("erreur-" + (x && x.code ? String(x.code).replace(/[^A-Z_]/g, "") : "inconnue"));
  process.exit(1);
}
PROGRAMME
}
# (2) la ligne `include` dans le bloc HTTPS de l'instance, entre deux marques, juste après la ligne de sa clé TLS (une ancre qui n'existe que dans ce bloc).
#     Sauvegarde, écrit, VALIDE (nginx -t) ; sinon remet le fichier comme avant et rend 1.
nginx_valider_ou_remettre() {   # $1 = fichier, $2 = sa sauvegarde
  if ! nginx -t >/dev/null 2>&1; then
    mv "$2" "$1"
    return 1
  fi
  rm -f "$2"
  systemctl reload nginx
}
inserer_include() {
  grep -qF "include $EXTRAIT_REEL;" "$NGX_INSTANCE" && return 0
  cp -p "$NGX_INSTANCE" "$NGX_INSTANCE.avant-visio"
  ANCRE="    ssl_certificate_key /etc/letsencrypt/live/$DOMAINE/privkey.pem;" L1="    $MARQUE_DEBUT" L2="    include $EXTRAIT_REEL;" L3="    $MARQUE_FIN" \
    awk '{ print } $0 == ENVIRON["ANCRE"] { print ENVIRON["L1"]; print ENVIRON["L2"]; print ENVIRON["L3"] }' "$NGX_INSTANCE.avant-visio" > "$NGX_INSTANCE.nouveau"
  cat "$NGX_INSTANCE.nouveau" > "$NGX_INSTANCE"; rm -f "$NGX_INSTANCE.nouveau"
  nginx_valider_ou_remettre "$NGX_INSTANCE" "$NGX_INSTANCE.avant-visio"
}
retirer_include() {   # rend 0 s'il n'y a rien à retirer
  [ -f "$NGX_INSTANCE" ] || return 0
  grep -qF "$MARQUE_DEBUT" "$NGX_INSTANCE" || grep -qF "include $EXTRAIT_REEL;" "$NGX_INSTANCE" || return 0
  cp -p "$NGX_INSTANCE" "$NGX_INSTANCE.avant-visio"
  D="$MARQUE_DEBUT" F="$MARQUE_FIN" I="include $EXTRAIT_REEL;" \
    awk 'index($0, ENVIRON["D"]) { saute = 1 } !saute && !index($0, ENVIRON["I"]) { print } index($0, ENVIRON["F"]) { saute = 0 }' "$NGX_INSTANCE.avant-visio" > "$NGX_INSTANCE.nouveau"
  cat "$NGX_INSTANCE.nouveau" > "$NGX_INSTANCE"; rm -f "$NGX_INSTANCE.nouveau"
  nginx_valider_ou_remettre "$NGX_INSTANCE" "$NGX_INSTANCE.avant-visio"
}
# (3) l'instance voit-elle la visio ? (/health : configurée, et sa sonde a répondu) — ou, pour « retirer », ne la voit-elle plus ?
sante_visio() {   # $1 = oui | non → 0 si /health dit ce qu'on attend
  [ -n "$PORT_SERVICE" ] || return 1
  ATTENDU="$1" PORT_SERVICE="$PORT_SERVICE" node - <<'SONDE'
const h = require("http");
const q = h.get({ host: "127.0.0.1", port: Number(process.env.PORT_SERVICE), path: "/health", timeout: 3000 }, (r) => {
  let b = ""; r.on("data", (d) => { b += d; });
  r.on("end", () => {
    try {
      const v = (JSON.parse(b) || {}).visio || {};
      const voit = v.configuree === true && v.ok === true;
      process.exit((process.env.ATTENDU === "oui" ? voit : v.configuree !== true) ? 0 : 2);
    } catch (x) { process.exit(3); }
  });
});
q.on("error", () => process.exit(4));
q.on("timeout", () => { q.destroy(); process.exit(5); });
SONDE
}
attendre_sante() { for _ in $(seq 1 20); do sante_visio "$1" && return 0; sleep 1; done; return 1; }
# (4) les ports du pare-feu du VPS
ufw_actif() { command -v ufw >/dev/null 2>&1 && case "$(LC_ALL=C ufw status 2>/dev/null || true)" in "Status: active"*) true ;; *) false ;; esac; }

# L'instance a-t-elle CHARGÉ la visio ? (son /health la dit configurée) — alors, et alors seulement, elle est relancée pour l'oublier : une instance qui ne l'a jamais lue
# n'est pas interrompue pour rien.
relancer_sans_visio() {
  actif "$UNITE" || return 0
  sante_visio non && return 0
  systemctl restart "$UNITE" || true
  attendre_sante non || echo "   ⚠️ l'instance ne dit pas encore « sans visio » sur /health"
}
# TOUT RETIRER, dans l'ordre qui ne coupe personne au milieu d'un geste : l'instance d'abord (plus aucune salle neuve ne part en visio), puis le chemin /rtc,
# puis LiveKit, puis ses ports. Utilisé par « retirer » ET par l'échec d'une installation (ÉCHEC = FERMÉ). Le binaire reste (il ne fait rien seul).
tout_retirer() {
  local etat
  if etat="$(configurer_instance retirer)"; then
    case "$etat" in *"instance=change"*) chown opmsg:opmsg "$CONFIG" 2>/dev/null || true; chmod 600 "$CONFIG" ;; esac
    relancer_sans_visio
  else
    echo "   ⚠️ la configuration de l'instance n'a pas pu être relue ($(printf '%s' "$etat" | masquer)) : « appels.visio » est peut-être encore dans $CONFIG"
  fi
  retirer_include || echo "   ⚠️ nginx refuse sa configuration sans la ligne de la visio : elle est remise — voir  nginx -t"
  rm -f "$EXTRAIT"
  systemctl stop "$UNITE_VISIO" >/dev/null 2>&1 || true
  systemctl disable "$UNITE_VISIO" >/dev/null 2>&1 || true
  if [ -f "$SYSD/$UNITE_VISIO.service" ]; then rm -f "$SYSD/$UNITE_VISIO.service"; systemctl daemon-reload; fi
  rm -f "$LK_CONF" "$LK_CONF.modele"
  if ufw_actif; then
    ufw delete allow "$PORT_TCP/tcp" >/dev/null 2>&1 || true
    ufw delete allow "$PORT_UDP/udp" >/dev/null 2>&1 || true
  fi
}

if [ "$GESTE" = "retirer" ]; then
  echo "── OP MESSAGES · serveur de visio · instance $INSTANCE · retrait"
  tout_retirer
  echo ""
  echo "✓ Le serveur de visio de $INSTANCE est retiré : les salles repassent en maille (4 en vidéo, 6 en audio). Ses ports peuvent être refermés dans le panneau de l'hébergeur : TCP $PORT_TCP, UDP $PORT_UDP."
  exit 0
fi

echo "── OP MESSAGES · serveur de visio · instance $INSTANCE"

# ── 1. TOUT VÉRIFIER AVANT D'ÉCRIRE ───────────────────────────────────────────────────────────────────────────────────────────────────────────
DOMAINE="$(CONFIG_INSTANCE="$CONFIG" node -e 'try { const c = JSON.parse(require("fs").readFileSync(process.env.CONFIG_INSTANCE, "utf8")); process.stdout.write(String(c && c.domaine || "")); } catch (e) {}')"
[[ "$DOMAINE" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]] || { echo "✗ le domaine de l'instance est illisible dans $CONFIG"; exit 1; }
[ -n "$PORT_SERVICE" ] || { echo "✗ le port du service est illisible ($ETC/$INSTANCE.env) : relancer install-msg.sh $INSTANCE"; exit 1; }
actif nginx || { echo "✗ nginx n'est pas actif : le chemin /rtc se pose dans le bloc HTTPS de l'instance, servi par nginx (Caddy n'est pas pris en charge par ce script)"; exit 1; }
[ -f "$NGX_INSTANCE" ] || { echo "✗ le bloc nginx de l'instance est absent ($NGX_INSTANCE) : relancer install-msg.sh $INSTANCE"; exit 1; }
N_ANCRE="$(grep -cxF "    ssl_certificate_key /etc/letsencrypt/live/$DOMAINE/privkey.pem;" "$NGX_INSTANCE" || true)"
[ "$N_ANCRE" = "1" ] || { echo "✗ le bloc HTTPS de $DOMAINE est introuvable (ou en double) dans $NGX_INSTANCE : relancer install-msg.sh $INSTANCE"; exit 1; }
if [ ! -f "$PF_SRC" ] || [ ! -f "$VERIF" ]; then
  echo "✗ la version d'OP MESSAGES en service est antérieure au serveur de visio ($PF_SRC ou $VERIF est absent) : déploie d'abord la version à jour (merge sur main, la CI déploie), puis relance ce script"
  exit 1
fi
case "$(uname -m)" in
  x86_64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "✗ processeur non pris en charge ($(uname -m)) : LiveKit est publié pour amd64 et arm64"; exit 1 ;;
esac
EMPREINTE_ATTENDUE="${EMPREINTES[$ARCH]}"
# (les bancs seuls — une racine factice — peuvent présenter leur propre archive : sur le VPS, OPMSG_RACINE est vide et cette ligne ne fait rien)
if [ -n "$R" ] && [ -n "${OPMSG_VISIO_EMPREINTE_BANC:-}" ]; then EMPREINTE_ATTENDUE="$OPMSG_VISIO_EMPREINTE_BANC"; fi
# L'adresse PUBLIQUE annoncée aux participants : celle de la route par défaut (une recherche dans la table de routage : rien n'est envoyé), sinon OPMSG_VISIO_IP.
IP_PUBLIQUE="${OPMSG_VISIO_IP:-}"
if [ -z "$IP_PUBLIQUE" ]; then IP_PUBLIQUE="$(ip -4 route get 192.0.2.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -1 || true)"; fi
[[ "$IP_PUBLIQUE" =~ ^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$ ]] || { echo "✗ l'adresse IPv4 publique du VPS est illisible : relancer avec  OPMSG_VISIO_IP=<son adresse publique>"; exit 1; }
A="${BASH_REMATCH[1]}"; B="${BASH_REMATCH[2]}"
for x in "${BASH_REMATCH[@]:1}"; do [ "$x" -le 255 ] || { echo "✗ l'adresse publique $IP_PUBLIQUE n'est pas une adresse IPv4"; exit 1; }; done
if [ "$A" = 10 ] || [ "$A" = 127 ] || [ "$A" = 0 ] || { [ "$A" = 172 ] && [ "$B" -ge 16 ] && [ "$B" -le 31 ]; } || { [ "$A" = 192 ] && [ "$B" = 168 ]; } \
   || { [ "$A" = 169 ] && [ "$B" = 254 ]; } || { [ "$A" = 100 ] && [ "$B" -ge 64 ] && [ "$B" -le 127 ]; } || [ "$A" -ge 224 ]; then
  echo "✗ l'adresse de la route par défaut ($IP_PUBLIQUE) n'est pas publique : l'hébergeur traduit les adresses — relancer avec  OPMSG_VISIO_IP=<l'adresse publique du VPS>"
  exit 1
fi
# Le PARE-FEU SORTANT de la visio pose ses règles avec `iptables` : sans lui, LiveKit ne démarre pas (échec = fermé). On l'installe ICI s'il manque, avant d'écrire quoi que ce soit.
if ! command -v iptables >/dev/null 2>&1; then echo "   iptables : installation"; apt-get install -y -qq iptables >/dev/null || true; fi
command -v iptables >/dev/null 2>&1 || { echo "✗ iptables n'est pas installé après apt-get : le pare-feu de la visio ne peut pas se poser, on s'arrête avant de rien écrire"; exit 1; }
if ! command -v curl >/dev/null 2>&1 && [ -z "${OPMSG_VISIO_ARCHIVE:-}" ]; then apt-get install -y -qq curl >/dev/null || true; fi
echo "   adresse publique annoncée : $IP_PUBLIQUE · ports : TCP $PORT_TCP, UDP $PORT_UDP (et $PORT_HTTP en boucle locale)"

# ── 2. LIVEKIT : l'archive VÉRIFIÉE, puis un compte à lui ──────────────────────────────────────────────────────────────────────────────────────
binaire_intact() {
  [ -x "$LK_DIR/livekit-server" ] && [ -f "$LK_DIR/livekit-server.sha256" ] && [ "$(cat "$LK_DIR/archive.sha256" 2>/dev/null)" = "$EMPREINTE_ATTENDUE" ] \
    && [ "$(sha256sum "$LK_DIR/livekit-server" | cut -d' ' -f1)" = "$(cat "$LK_DIR/livekit-server.sha256")" ]
}
CHANGE_LK=non
if binaire_intact; then
  echo "   LiveKit $VERSION : déjà là, intact"
else
  TMPD="$(mktemp -d)"
  trap 'rm -rf "$TMPD"' EXIT
  if [ -n "${OPMSG_VISIO_ARCHIVE:-}" ]; then
    cp "$OPMSG_VISIO_ARCHIVE" "$TMPD/livekit.tar.gz" || { echo "✗ l'archive $OPMSG_VISIO_ARCHIVE est illisible"; exit 1; }
  else
    echo "   LiveKit $VERSION : téléchargement"
    curl -fsSL --proto '=https' --tlsv1.2 --max-time 600 -o "$TMPD/livekit.tar.gz" "https://github.com/livekit/livekit/releases/download/v$VERSION/livekit_${VERSION}_linux_${ARCH}.tar.gz" \
      || { echo "✗ le téléchargement de LiveKit a échoué (le VPS atteint-il github.com ?) — rien n'est installé. Sinon : télécharger l'archive ailleurs et relancer avec OPMSG_VISIO_ARCHIVE=<chemin>"; exit 1; }
  fi
  RECUE="$(sha256sum "$TMPD/livekit.tar.gz" | cut -d' ' -f1)"
  if [ "$RECUE" != "$EMPREINTE_ATTENDUE" ]; then
    echo "⛔ l'archive de LiveKit n'a PAS l'empreinte attendue — elle n'est pas ouverte, rien n'est installé."
    echo "   attendue : $EMPREINTE_ATTENDUE"
    echo "   reçue    : $RECUE"
    exit 1
  fi
  tar -xzf "$TMPD/livekit.tar.gz" -C "$TMPD" livekit-server || { echo "✗ l'archive vérifiée ne contient pas livekit-server — rien n'est installé"; exit 1; }
  [ "$("$TMPD/livekit-server" --version 2>/dev/null || true)" = "livekit-server version $VERSION" ] || { echo "✗ le binaire extrait ne se dit pas « livekit-server version $VERSION » — rien n'est installé"; exit 1; }
  mkdir -p "$LK_DIR"
  cp "$TMPD/livekit-server" "$LK_DIR/livekit-server.nouveau"; chmod 755 "$LK_DIR/livekit-server.nouveau"; mv "$LK_DIR/livekit-server.nouveau" "$LK_DIR/livekit-server"
  sha256sum "$LK_DIR/livekit-server" | cut -d' ' -f1 > "$LK_DIR/livekit-server.sha256"
  printf '%s\n' "$EMPREINTE_ATTENDUE" > "$LK_DIR/archive.sha256"
  chown -R root:root "$LK_DIR"; chmod 755 "$LK_DIR"
  rm -rf "$TMPD"; trap - EXIT
  CHANGE_LK=oui
  echo "   LiveKit $VERSION : installé (empreinte de l'archive vérifiée)"
fi
if ! id -u "$COMPTE" >/dev/null 2>&1; then
  useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin --user-group "$COMPTE"
  echo "   compte système $COMPTE : créé"
fi

# ── 3. LA CONFIGURATION DE LIVEKIT (sans le secret) — la paire de clés y est ajoutée par le programme Node, qui écrit AUSSI celle de l'instance ───────
# Les serveurs STUN que LiveKit donnerait aux pages : JAMAIS ceux de Google ni de Twilio (son défaut). Le relais de l'instance s'il est installé, sinon
# l'adresse de l'instance sur le port du relais (une adresse qui ne répond pas tant que coturn n'y est pas). Les pages passent de toute façon leur propre liste.
STUN="$(CONFIG_INSTANCE="$CONFIG" node -e 'try { const r = JSON.parse(require("fs").readFileSync(process.env.CONFIG_INSTANCE, "utf8")).appels.relais; if (r && /^[a-z0-9.-]+$/.test(r.hote) && Number.isInteger(r.port)) process.stdout.write(r.hote + ":" + r.port); } catch (e) {}')"
[ -n "$STUN" ] || STUN="$DOMAINE:3478"
[[ "$STUN" =~ ^[a-z0-9.-]+:[0-9]{2,5}$ ]] || STUN="$DOMAINE:3478"
mkdir -p "$(dirname "$LK_CONF")"
MODELE="$LK_CONF.modele"
{
  echo "# Posé par server-msg/install-sfu.sh — réécrit à chaque installation, ne pas éditer à la main."
  echo "# Le serveur de visio de l'instance $INSTANCE (LiveKit $VERSION). Ce fichier porte la clé et le secret : root et le compte $COMPTE seuls le lisent."
  echo ""
  echo "# ── la signalisation : en boucle locale SEULEMENT (nginx la relaie sur /rtc ; le service y parle pour l'administration) ──"
  echo "port: $PORT_HTTP"
  echo "bind_addresses:"
  echo "  - \"127.0.0.1\""
  echo ""
  echo "# ── l'image et la voix : deux ports publics, rien d'autre (ni plage de ports, ni TURN intégré) ──"
  echo "rtc:"
  echo "  tcp_port: $PORT_TCP"
  echo "  udp_port: $PORT_UDP"
  echo "  # l'adresse publique est POSÉE : ni découverte par STUN (un service extérieur), ni candidats de STUN pour le serveur lui-même"
  echo "  use_external_ip: false"
  echo "  node_ip: \"$IP_PUBLIQUE\""
  echo "  stun_servers:"
  echo "    - \"$STUN\""
  echo ""
  echo "# ── les salles naissent de l'entrée d'une personne munie d'un jeton du service, qui porte aussi leur capacité et leurs délais ──"
  echo "room:"
  echo "  empty_timeout: 60"
  echo "  departure_timeout: 20"
  echo ""
  echo "# ── le plafond de la MACHINE (elle porte aussi OP GESTION) : au-delà, plus personne de neuf n'entre ; les salles en cours continuent ──"
  echo "limit:"
  echo "  bytes_per_sec: $DEBIT_MAX"
  echo ""
  echo "# ── aucune trace de personne : au niveau « error », LiveKit n'écrit ni identité, ni salle, ni adresse en fonctionnement normal (mesuré sur 1.13.7) ──"
  echo "logging:"
  echo "  level: error"
  echo "  pion_level: error"
  echo ""
  echo "# ── la paire de clés et l'adresse des avis (ajoutées par le script, jamais affichées) ──"
} > "$MODELE"
chmod 600 "$MODELE"
[ ! -f "$CONFIG.avant-visio" ] || rm -f "$CONFIG.avant-visio"
cp -p "$CONFIG" "$CONFIG.avant-visio"; chmod 600 "$CONFIG.avant-visio"
if ! ETAT="$(MODELE="$MODELE" configurer_instance poser)"; then
  rm -f "$MODELE"
  mv "$CONFIG.avant-visio" "$CONFIG" 2>/dev/null || true
  echo "⛔ la configuration n'a pas pu être écrite ($(printf '%s' "$ETAT" | masquer)) — rien n'est changé, le service n'est pas touché."
  exit 1
fi
rm -f "$MODELE"
echo "   $(printf '%s' "$ETAT" | masquer)"
chown opmsg:opmsg "$CONFIG"; chmod 600 "$CONFIG"
chown "root:$COMPTE" "$LK_CONF"; chmod 640 "$LK_CONF"
case "$ETAT" in *"livekit=change"*) CHANGE_LK=oui ;; esac
case "$ETAT" in *"instance=change"*) CHANGE_INSTANCE=oui ;; *) CHANGE_INSTANCE=non ;; esac

# ── 4. LE PARE-FEU SORTANT, L'UNITÉ, LE DÉMARRAGE — puis le CONTRÔLE, avant d'exposer quoi que ce soit ─────────────────────────────────────────────
annuler() {   # $1 = ce qu'il faut dire. ÉCHEC = FERMÉ : tout ce que la visio a posé est défait, OP MESSAGES repasse en maille.
  echo ""
  echo "$1"
  echo "── Retour en arrière : la visio est retirée, OP MESSAGES continue en maille."
  # Une PREMIÈRE installation (la configuration d'avant n'avait pas de visio) : elle revient OCTET POUR OCTET. Une réinstallation : la visio en est retirée.
  if [ -f "$CONFIG.avant-visio" ] && ! avait_visio "$CONFIG.avant-visio"; then
    mv "$CONFIG.avant-visio" "$CONFIG"; chown opmsg:opmsg "$CONFIG" 2>/dev/null || true; chmod 600 "$CONFIG"
  fi
  rm -f "$CONFIG.avant-visio"
  tout_retirer
  exit 1
}
avait_visio() { node -e 'try { const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); process.exit(c && c.appels && c.appels.visio ? 0 : 1); } catch (e) { process.exit(2); }' "$1"; }
mkdir -p "$(dirname "$PF_BIN")" "$SYSD"
if [ ! -f "$PF_BIN" ] || ! cmp -s "$PF_SRC" "$PF_BIN"; then
  cp "$PF_SRC" "$PF_BIN.nouveau"; chmod 755 "$PF_BIN.nouveau"; mv "$PF_BIN.nouveau" "$PF_BIN"
  CHANGE_LK=oui
fi
# Le bac à sable de l'unité : seulement ce qui ne gêne pas un serveur de médias (il énumère ses interfaces par netlink, n'écrit rien sur le disque).
printf '%s\n' "# Posé par server-msg/install-sfu.sh — réécrit à chaque installation, ne pas éditer à la main." \
  '[Unit]' "Description=OP MESSAGES — serveur de visio (LiveKit $VERSION) de l'instance $INSTANCE" 'After=network-online.target' 'Wants=network-online.target' '' \
  '[Service]' "User=$COMPTE" "Group=$COMPTE" \
  "Environment=OPMSG_VISIO_UTILISATEUR=$COMPTE" "Environment=OPMSG_VISIO_CHAINE=$CHAINE" \
  "ExecStartPre=+$PF_REEL start" "ExecStart=$LK_DIR_REEL/livekit-server --config $LK_CONF_REEL" "ExecStopPost=+$PF_REEL stop" \
  'Restart=on-failure' 'RestartSec=5' \
  'NoNewPrivileges=true' 'PrivateTmp=true' 'ProtectSystem=full' 'ProtectHome=true' 'ProtectKernelTunables=true' 'ProtectKernelModules=true' 'ProtectControlGroups=true' \
  'RestrictSUIDSGID=true' 'RestrictRealtime=true' 'LockPersonality=true' 'MemoryMax=1G' 'CPUWeight=20' 'IOWeight=20' 'LimitNOFILE=65536' '' \
  '[Install]' 'WantedBy=multi-user.target' > "$SYSD/$UNITE_VISIO.service.nouveau"
if [ -f "$SYSD/$UNITE_VISIO.service" ] && cmp -s "$SYSD/$UNITE_VISIO.service.nouveau" "$SYSD/$UNITE_VISIO.service"; then
  rm -f "$SYSD/$UNITE_VISIO.service.nouveau"
else
  mv "$SYSD/$UNITE_VISIO.service.nouveau" "$SYSD/$UNITE_VISIO.service"; chmod 644 "$SYSD/$UNITE_VISIO.service"
  systemctl daemon-reload
  CHANGE_LK=oui
fi
systemctl enable "$UNITE_VISIO" >/dev/null 2>&1 || true
if [ "$CHANGE_LK" = "oui" ] || ! actif "$UNITE_VISIO"; then systemctl restart "$UNITE_VISIO" || true; fi
for _ in $(seq 1 10); do actif "$UNITE_VISIO" && break; sleep 1; done
actif "$UNITE_VISIO" || annuler "⛔ LiveKit n'a pas démarré avec cette configuration. Voir :  systemctl status $UNITE_VISIO --no-pager | head -5"
OPMSG_VISIO_UTILISATEUR="$COMPTE" OPMSG_VISIO_CHAINE="$CHAINE" "$PF_BIN" verifier >/dev/null 2>&1 \
  || annuler "⛔ le pare-feu sortant de la visio n'est pas dans le noyau : LiveKit pourrait envoyer de l'UDP aux services de cette machine. Voir :  systemctl status $UNITE_VISIO --no-pager | head -5"
echo "── Contrôle du serveur de visio (ce serveur contre lui-même)…"
OPMSG_CONFIG="$CONFIG" node "$VERIF" "$INSTANCE" 2>&1 | masquer \
  || annuler "⛔ LiveKit ne fait pas ce qu'il doit (voir les ✗ ci-dessus) : rien n'est exposé."

# ── 5. LE CHEMIN /rtc DANS LE BLOC HTTPS DE L'INSTANCE (nginx), puis le contrôle PAR LE NOM PUBLIC ──────────────────────────────────────────────────
mkdir -p "$(dirname "$EXTRAIT")"
cat > "$EXTRAIT.nouveau" <<EXTRAIT_NGINX
# Posé par server-msg/install-sfu.sh — réécrit à chaque installation, ne pas éditer à la main. Retiré par « install-sfu.sh $INSTANCE retirer ».
# Le SERVEUR DE VISIO (LiveKit) dans le bloc HTTPS de $DOMAINE : sa signalisation (/rtc, /rtc/v1, en WebSocket) et le contrôle qu'en fait la page
# quand une liaison échoue (…/validate). RIEN d'autre de LiveKit n'est exposé : ni son API d'administration (/twirp), ni sa page d'accueil.
# ⛔ Le jeton d'entrée voyage dans l'adresse (« ?access_token=… ») : AUCUN journal d'accès. Ni l'adresse des participants (pas d'X-Forwarded-For) :
# LiveKit n'en a pas besoin pour la signalisation, et ce qu'il ne reçoit pas, il ne peut pas l'écrire.
location ~ ^/rtc(/v1)?(/validate)?\$ {
    access_log off;
    limit_req zone=opmsg_$INSTANCE burst=20 nodelay;
    proxy_pass http://127.0.0.1:$PORT_HTTP;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$http_connection;
    proxy_set_header Host \$host;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
    add_header X-Content-Type-Options nosniff always;
    add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none'" always;
}
EXTRAIT_NGINX
NGX_CHANGE=non
if [ -f "$EXTRAIT" ] && cmp -s "$EXTRAIT.nouveau" "$EXTRAIT"; then rm -f "$EXTRAIT.nouveau"; else mv "$EXTRAIT.nouveau" "$EXTRAIT"; chmod 644 "$EXTRAIT"; NGX_CHANGE=oui; fi
if grep -qF "include $EXTRAIT_REEL;" "$NGX_INSTANCE"; then
  if [ "$NGX_CHANGE" = "oui" ]; then
    nginx -t >/dev/null 2>&1 || annuler "⛔ nginx refuse le chemin /rtc (nginx -t). Voir :  nginx -t"
    systemctl reload nginx
  fi
else
  inserer_include || annuler "⛔ nginx refuse sa configuration avec le chemin /rtc (nginx -t) — son fichier est remis comme avant."
  echo "   nginx : chemin /rtc posé dans le bloc de $DOMAINE"
fi
echo "── Contrôle du chemin /rtc, par le nom public…"
OPMSG_CONFIG="$CONFIG" node "$VERIF" "$INSTANCE" --public 2>&1 | masquer \
  || annuler "⛔ https://$DOMAINE/rtc ne mène pas à LiveKit (voir les ✗ ci-dessus)."

# ── 6. L'INSTANCE : relancée si sa configuration a changé, puis on lui demande si elle voit la visio — et si les AVIS de LiveKit lui arrivent ────────
if ! actif "$UNITE"; then
  annuler "⛔ l'instance ($UNITE) ne tourne pas : on ne peut pas prouver qu'elle voit la visio ni qu'elle reçoit ses avis. Démarre-la, puis relance ce script."
fi
if [ "$CHANGE_INSTANCE" = "oui" ] || ! sante_visio oui; then
  systemctl restart "$UNITE" || true
fi
attendre_sante oui || annuler "⛔ l'instance a redémarré mais ne voit pas la visio (/health : visio.ok). Voir :  systemctl status $UNITE --no-pager | head -5"
echo "   ✓ l'instance voit la visio (/health : visio.ok)"
echo "── Contrôle des avis de LiveKit (une salle de contrôle ouverte puis fermée)…"
OPMSG_CONFIG="$CONFIG" node "$VERIF" "$INSTANCE" --avis "$PORT_SERVICE" 2>&1 | masquer \
  || annuler "⛔ les avis de LiveKit n'arrivent pas au service, ou n'y sont pas acceptés : une personne retirée d'une salle pourrait y revenir."

# ── 7. LE PARE-FEU DU VPS (s'il est actif) ; celui de l'hébergeur, c'est Justin qui l'ouvre ─────────────────────────────────────────────────────────
if ufw_actif; then
  ufw allow "$PORT_TCP/tcp" comment "opmsg-visio-$INSTANCE" >/dev/null
  ufw allow "$PORT_UDP/udp" comment "opmsg-visio-$INSTANCE" >/dev/null
  echo "   pare-feu du VPS (ufw) : TCP $PORT_TCP et UDP $PORT_UDP ouverts"
else
  echo "   pare-feu du VPS (ufw) : inactif ou absent — rien à y ouvrir"
fi

rm -f "$CONFIG.avant-visio"
echo ""
echo "✓ Le serveur de visio est en place pour $INSTANCE : au-delà de 4 en vidéo (6 en audio), une salle neuve passe par lui."
echo "   Capacité de départ : 12 en vidéo, 25 en audio par salle — À MESURER sur de vrais téléphones (design/opmessages/ESSAI-VISIO.md) avant de rien promettre."
echo "   Dans le PANNEAU DE L'HÉBERGEUR, ces deux ports doivent être ouverts : TCP $PORT_TCP et UDP $PORT_UDP (sinon aucune image ne passe)."
echo "   De l'extérieur (ton Mac) :  nc -vz $DOMAINE $PORT_TCP   — rien de secret ne s'y affiche."
echo "   Tout retirer :  bash install-sfu.sh $INSTANCE retirer"
