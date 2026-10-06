#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════════════════════
#  Installation d'OP MESSAGES sur le VPS — UNE INSTANCE À LA FOIS (beta ou prod), en root.
#
#  Usage :   bash install-msg.sh beta
#            OPMSG_PUBLIE=oui bash install-msg.sh prod      (⛔ seulement sur « publie OP MESSAGES »)
#
#  Conception : design/opmessages/SERVEUR.md § 3.1 (réseau), § 3.10 (déploiement).
#  Mode d'emploi, geste par geste : design/opmessages/INSTALLER-LE-SERVEUR.md.
#
#  ⛔ CE SCRIPT NE TOUCHE JAMAIS À OP GESTION. Il n'écrit rien sous /opt/teamop, ni sous
#  /etc/teamop, ne relance ni `teamop-api` ni le bloc d'`api.teamop.fr` du proxy : OP MESSAGES a
#  son utilisateur, son miroir du dépôt, ses dossiers, son unité, son fichier de proxy. Les deux
#  applications ne partagent que la machine (décision de Justin, 22 septembre 2026).
#
#  ⛔ ET IL N'AFFICHE JAMAIS UN SECRET. Règle du 24 septembre 2026 : « on ne fait jamais afficher un
#  secret sur le VPS — Justin recolle toutes ses sorties dans la conversation ». Donc :
#    · la clé maître n'est JAMAIS générée ici (elle s'afficherait) : elle naît dans le gestionnaire
#      de mots de passe de Justin et se saisit ICI en masqué, deux fois ; toute sortie de
#      `poser-cle.js` passe par un masqueur qui efface 64 hexadécimaux de suite ;
#    · la paire VAPID de la configuration s'écrit dans le fichier (chmod 600) sans passer par l'écran ;
#    · la clé SSH de déploiement : ici n'arrive que sa moitié PUBLIQUE (la privée reste chez Justin
#      puis dans le secret GitHub `VPS_SSH_KEY_MSG_BETA` ou `VPS_SSH_KEY_MSG_PROD`, une clé par instance).
#
#  ⛔ IL EST REJOUABLE. Deux passages donnent le même état : la configuration existante n'est pas
#  réécrite, la clé n'est pas retouchée, un fichier de proxy identique n'est pas relancé pour rien.
#
#  Variables (toutes facultatives, hors OPMSG_PUBLIE pour prod) :
#    OPMSG_RACINE        préfixe de tous les chemins — UNIQUEMENT pour les bancs (bac à sable)
#    OPMSG_DEPOT         dépôt à mettre en miroir (défaut : GitHub)
#    OPMSG_DOMAINE       domaine de l'instance (défaut : msg-beta.teamop.fr / msg.teamop.fr)
#    OPMSG_PORT          port local (défaut : 8091 pour beta, 8090 pour prod)
#    OPMSG_PROXY         nginx | caddy — à poser si les deux tournent, ou si aucun ne se détecte
#    OPMSG_CLE_PUBLIQUE  la ligne PUBLIQUE de la clé de déploiement (sinon on la demande)
# ══════════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

INSTANCE="${1:-}"
case "$INSTANCE" in
  beta) PORT_DEFAUT=8091; DOMAINE_DEFAUT="msg-beta.teamop.fr" ;;
  prod) PORT_DEFAUT=8090; DOMAINE_DEFAUT="msg.teamop.fr" ;;
  *) echo "usage : bash install-msg.sh <beta|prod>"; exit 2 ;;
esac
PORT="${OPMSG_PORT:-$PORT_DEFAUT}"
DOMAINE="${OPMSG_DOMAINE:-$DOMAINE_DEFAUT}"
DEPOT="${OPMSG_DEPOT:-https://github.com/justino17-cmd/teamop.git}"

# Un domaine ou un port qui vient de l'environnement finit dans un fichier de proxy lu par root :
# on n'y laisse passer que ce qui ressemble à un nom d'hôte et à un numéro.
[[ "$DOMAINE" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]] || { echo "✗ domaine illisible"; exit 2; }
[[ "$PORT" =~ ^[0-9]{2,5}$ ]] || { echo "✗ port illisible"; exit 2; }

# ⛔ LA PRODUCTION NE S'INSTALLE QUE SUR LA PHRASE DE JUSTIN. La conception (§ 3.1) : l'unité prod est
# « non installée tant que Justin n'a pas dit « publie OP MESSAGES » ». Le drapeau traduit cette
# phrase en geste : sans lui, lancer le script sur prod par erreur ne fait rien.
if [ "$INSTANCE" = "prod" ] && [ "${OPMSG_PUBLIE:-}" != "oui" ]; then
  echo "⛔ prod : l'instance de production ne s'installe que sur la phrase « publie OP MESSAGES »."
  echo "   Rien n'a été fait. Voir design/opmessages/INSTALLER-LE-SERVEUR.md."
  exit 1
fi

# ── Les chemins. Tous sous $R, qui est VIDE sur le VPS : seuls les bancs le posent. ───────────
R="${OPMSG_RACINE:-}"
OPT="$R/opt/opmsg"
ETC="$R/etc/opmsg"
SYSD="$R/etc/systemd/system"
NGX="$R/etc/nginx"
CDY="$R/etc/caddy"
LE="$R/etc/letsencrypt"
ACME_REEL="/var/www/opmsg-acme"
ACME="$R$ACME_REEL"
SSHD="$R/root/.ssh"
MIROIR="$OPT/repo"
DATA="$OPT/$INSTANCE/data"
KEK="$ETC/$INSTANCE.kek"
CONFIG="$ETC/$INSTANCE.json"
UNITE="teamop-msg@$INSTANCE"

if [ -z "$R" ] && [ "$(id -u)" != "0" ]; then echo "✗ à lancer en root"; exit 1; fi

echo "── OP MESSAGES · instance $INSTANCE · $DOMAINE (port local $PORT)"

# ── 1. Ce qu'il faut déjà avoir ────────────────────────────────────────────────────────────
# Node 22.5 au moins : le service range tout dans `node:sqlite`. On ne l'installe pas ici — le VPS
# d'OP GESTION en a déjà un, et en poser un second par-dessus ferait bouger celui d'OP GESTION.
command -v node >/dev/null || { echo "✗ node est absent du VPS"; exit 1; }
NODE_MAJ="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJ" -ge 22 ] || { echo "✗ Node $NODE_MAJ : il faut Node 22 ou plus (node:sqlite)"; exit 1; }
command -v git >/dev/null || apt-get install -y -qq git ca-certificates

# ── 2. L'utilisateur système, et ses dossiers ──────────────────────────────────────────────
# Non root, sans shell, sans dossier personnel : le service ne peut rien d'autre que lire son code
# et écrire dans SON dossier de données.
if ! id opmsg >/dev/null 2>&1; then
  useradd --system --no-create-home --home-dir /opt/opmsg --shell /usr/sbin/nologin --user-group opmsg
  echo "   utilisateur opmsg créé"
fi
mkdir -p "$OPT/$INSTANCE/releases" "$DATA" "$ETC"
chmod 755 "$OPT" "$OPT/$INSTANCE" "$OPT/$INSTANCE/releases" "$ETC"
chown root:root "$OPT" "$OPT/$INSTANCE" "$OPT/$INSTANCE/releases" "$ETC"
# Les données : à lui seul, et à personne d'autre (pas même lisibles par un autre compte du VPS).
chown opmsg:opmsg "$DATA"
chmod 700 "$DATA"

# ── 3. Le miroir du dépôt — LE SIEN, jamais /opt/teamop/repo ──────────────────────────────
# ⛔ La proposition « sobre » faisait un `git merge --ff-only` dans le clone d'OP GESTION : cela
# aurait fait avancer les fichiers de `server/` sur le disque SANS redémarrer `teamop-api` — le pire
# état, « code neuf sur le disque, ancien en mémoire ». Un clone à part, des releases à part.
# Sans blobs (`blob:none`) : l'historique de ce dépôt pèse plus d'un gigaoctet à cause des pages.
# Seuls les fichiers de `server-msg/` seront jamais lus, et ils se chargent à la demande.
if [ ! -d "$MIROIR" ]; then
  echo "   miroir du dépôt : clonage"
  GIT_TERMINAL_PROMPT=0 git -c credential.helper= clone --bare --quiet --filter=blob:none "$DEPOT" "$MIROIR"
fi
git --git-dir="$MIROIR" remote set-url origin "$DEPOT"
git --git-dir="$MIROIR" config remote.origin.fetch '+refs/heads/main:refs/heads/main'
git --git-dir="$MIROIR" config remote.origin.promisor true
git --git-dir="$MIROIR" config remote.origin.partialclonefilter blob:none
GIT_TERMINAL_PROMPT=0 git -c credential.helper= --git-dir="$MIROIR" fetch --quiet origin
SHA_MAIN="$(git --git-dir="$MIROIR" rev-parse refs/heads/main)"

# Les sources de l'installation sortent du miroir à `main` : le déployeur et la pose de clé qu'on
# installe sont ceux du dépôt, pas ceux d'un fichier qui traînerait dans /root.
SRC="$(mktemp -d)"
trap 'rm -rf "$SRC"' EXIT
git --git-dir="$MIROIR" archive --format=tar refs/heads/main server-msg | tar -x -C "$SRC"
[ -f "$SRC/server-msg/deployer.sh" ]  || { echo "✗ main ne porte pas server-msg/deployer.sh"; exit 1; }
[ -f "$SRC/server-msg/poser-cle.js" ] || { echo "✗ main ne porte pas server-msg/poser-cle.js"; exit 1; }

# ── 4. La configuration — créée SI ABSENTE, jamais réécrite ───────────────────────────────
# Elle porte la paire VAPID de CETTE instance (chaque instance a la sienne : un abonnement push
# de la bêta ne doit pas se retrouver dans la production). Générée avec `crypto`, écrite dans le
# fichier, et ABSENTE de l'écran.
if [ ! -f "$CONFIG" ]; then
  OPMSG_CFG_CHEMIN="$CONFIG" OPMSG_CFG_INSTANCE="$INSTANCE" OPMSG_CFG_DOMAINE="$DOMAINE" OPMSG_CFG_PORT="$PORT" \
  node -e '
    const fs = require("fs"), crypto = require("crypto"), e = process.env;
    const ecdh = crypto.createECDH("prime256v1"); ecdh.generateKeys();
    const b64u = (b) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    // ⚠️ getPrivateKey() rend les octets SANS le zéro de tête : un cas sur 256, la clé privée fait 31 octets,
    // et web-push la refuse ("private key should be 32 bytes"). On la complète à 32.
    const priv = ecdh.getPrivateKey();
    const priv32 = Buffer.concat([Buffer.alloc(32 - priv.length), priv]);
    const cfg = {
      instance: e.OPMSG_CFG_INSTANCE,
      domaine: e.OPMSG_CFG_DOMAINE,
      origine: "https://" + e.OPMSG_CFG_DOMAINE,
      port: Number(e.OPMSG_CFG_PORT),
      contactEmail: "contact@teamop.fr",
      vapidPublicKey: b64u(ecdh.getPublicKey()),
      vapidPrivateKey: b64u(priv32)
    };
    const tmp = e.OPMSG_CFG_CHEMIN + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
    fs.renameSync(tmp, e.OPMSG_CFG_CHEMIN);'
  echo "   configuration créée : $CONFIG"
else
  echo "   configuration déjà là : on n'y touche pas"
fi
# Le service tourne sous opmsg : il doit pouvoir la lire, et personne d'autre.
chown opmsg:opmsg "$CONFIG"
chmod 600 "$CONFIG"

# Le port est une valeur non secrète : un fichier d'environnement à part, que lit l'unité ET le
# déployeur (qui contrôle /health sur ce port).
printf 'PORT=%s\n' "$PORT" > "$ETC/$INSTANCE.env"
chown root:root "$ETC/$INSTANCE.env"
chmod 644 "$ETC/$INSTANCE.env"

# ── 5. La clé maître ───────────────────────────────────────────────────────────────────────
# ⛔ ON NE LA GÉNÈRE JAMAIS ICI. `poser-cle.js` de `server/` l'affiche une fois « pour le
# séquestre » : sur ce VPS, c'est précisément ce que la règle du 24 septembre interdit. La clé naît
# donc dans le gestionnaire de mots de passe de Justin, et se saisit ici en MASQUÉ, deux fois.
# ⛔ ET CE SCRIPT NE DÉCIDE PAS S'IL FAUT UNE CLÉ : `poser-cle.js` décide (il refuse de régénérer
# quand une base existe — la leçon de `install.sh` du 19 septembre). Ici on ne regarde l'existence
# du fichier que pour savoir s'il faut DEMANDER une saisie, jamais pour décider de générer.
masquer() { sed -E 's/[0-9A-Fa-f]{64}/[clé masquée]/g'; }
poser_cle() {
  # Mêmes noms que `server/poser-cle.js` (TEAMOP_*), préfixe OPMSG_ : sur le VPS ils valent les
  # chemins par défaut ; les bancs les détournent vers leur bac à sable.
  # ⛔ LA CLÉ ARRIVE SUR L'ENTRÉE STANDARD (`--stdin`), JAMAIS EN ARGUMENT : un argument se lit dans `ps` par tout compte du VPS.
  # (Le contrat avec `server-msg/poser-cle.js` : « <instance> --stdin » et la clé sur l'entrée ; « <instance> » seul pour constater.)
  # `pipefail` (posé en tête) fait échouer la ligne si l'outil échoue, pas seulement le masqueur.
  local cle="${1:-}"
  if ! { if [ -n "$cle" ]; then printf '%s\n' "$cle"; fi; } | OPMSG_KEK_DIR="$ETC" OPMSG_DATA="$DATA" OPMSG_DROPIN_DIR="$SYSD/$UNITE.service.d" \
       node "$SRC/server-msg/poser-cle.js" "$INSTANCE" ${cle:+--stdin} 2>&1 | masquer; then
    echo ""
    echo "  ⛔ Installation INTERROMPUE — voir le message ci-dessus."
    echo "     Le service n'a pas été (re)démarré : rien n'est cassé, rien n'est perdu."
    exit 1
  fi
}
echo "── Clé maître…"
if [ -s "$KEK" ]; then
  poser_cle
else
  if [ -e "$DATA/msg.db" ]; then
    echo "  ⛔ Des données existent ici et la clé est ABSENTE : c'est un INCIDENT, pas une installation."
    echo "     Il faut la clé du séquestre — celle de la dernière copie rangée."
  fi
  K1=""; K2=""
  read -rsp "  Colle la clé maître (64 hexadécimaux, rien ne s'affiche), puis Entrée : " K1 || true; echo
  read -rsp "  Colle-la une seconde fois, pour être sûr de la copie : " K2 || true; echo
  K1="${K1//[[:space:]]/}"; K2="${K2//[[:space:]]/}"; K1="${K1,,}"; K2="${K2,,}"   # espaces, tabulations, retour chariot d'un collage
  if [ -z "$K1" ]; then
    echo "  ⛔ Aucune clé saisie. On ne la génère pas ici : elle s'afficherait sur ce VPS."
    echo "     Sur ton Mac :  openssl rand -hex 32 | pbcopy   (rien ne s'affiche ; colle dans ton gestionnaire)"
    echo "     puis relance ce script et colle-la quand il la demande."
    exit 1
  fi
  [[ "$K1" =~ ^[0-9a-f]{64}$ ]] || { echo "  ✗ Ce n'est pas 64 hexadécimaux (longueur lue : ${#K1}). Rien n'est écrit."; exit 1; }
  [ "$K1" = "$K2" ] || { echo "  ✗ Les deux saisies diffèrent. Rien n'est écrit."; exit 1; }
  poser_cle "$K1"
  K1=""; K2=""
fi
[ -s "$KEK" ] || { echo "✗ la clé n'est pas là après poser-cle.js — on s'arrête avant d'installer l'unité"; exit 1; }

# ── 6. L'unité systemd (modèle) et ses deux petits fichiers ────────────────────────────────
# ⛔ L'unité ne porte PAS `LoadCredential` : c'est le drop-in de `poser-cle.js` qui le pose, APRÈS
# l'écriture de la clé (test-729 : systemd refuse de démarrer une unité dont une source de
# `LoadCredential` manque). On a donc posé la clé AVANT d'écrire ce fichier.
#
# Le durcissement, et pourquoi chaque ligne :
#  · User=opmsg + CapabilityBoundingSet vide : aucun privilège, même volé ;
#  · NoNewPrivileges, ProtectSystem=strict : le disque est en lecture seule SAUF `ReadWritePaths` ;
#  · PrivateTmp, ProtectHome, PrivateDevices : ni /tmp partagé, ni les dossiers personnels, ni /dev ;
#  · RestrictAddressFamilies : pas de socket brute ni de netlink ;
#  · MemoryMax=1G, CPUWeight/IOWeight bas : si OP MESSAGES s'emballe, c'est lui qui ploie, pas
#    OP GESTION (même machine) ;
#  · pas de MemoryDenyWriteExecute : V8 compile à chaud, il en mourrait.
UNITE_TXT='[Unit]
Description=OP MESSAGES (instance %i)
Documentation=https://github.com/justino17-cmd/teamop/blob/main/design/opmessages/SERVEUR.md
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=opmsg
Group=opmsg
WorkingDirectory=/opt/opmsg/%i/current
Environment=NODE_ENV=production
Environment=OPMSG_INSTANCE=%i
Environment=OPMSG_CONFIG=/etc/opmsg/%i.json
Environment=OPMSG_DATA=/opt/opmsg/%i/data
EnvironmentFile=/etc/opmsg/%i.env
ExecStart=/opt/opmsg/lancer.sh
Restart=always
RestartSec=3
UMask=0077

NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/opmsg/%i/data
PrivateTmp=true
ProtectHome=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=true
RestrictRealtime=true
LockPersonality=true
SystemCallArchitectures=native
CapabilityBoundingSet=
AmbientCapabilities=
MemoryMax=1G
CPUWeight=20
IOWeight=20
LimitNOFILE=8192

[Install]
WantedBy=multi-user.target
'
printf '%s' "$UNITE_TXT" > "$SYSD/teamop-msg@.service.nouveau"
mv "$SYSD/teamop-msg@.service.nouveau" "$SYSD/teamop-msg@.service"
chmod 644 "$SYSD/teamop-msg@.service"

# Le lanceur : il pose OPMSG_SHA (le SHA de la release en cours, lu sur le lien `current`) pour que
# `/health` dise quel code tourne VRAIMENT — c'est ce que le déployeur compare. Aucune copie du SHA
# à tenir à jour : le lien est la seule vérité.
cat > "$OPT/lancer.sh.nouveau" <<'LANCEUR'
#!/bin/sh
set -eu
case "${OPMSG_INSTANCE:-}" in beta|prod) ;; *) echo "OPMSG_INSTANCE illisible" >&2; exit 2 ;; esac
cd "$(readlink -f "/opt/opmsg/$OPMSG_INSTANCE/current")"
OPMSG_SHA="$(basename "$PWD")"
export OPMSG_SHA
exec /usr/bin/node index.js
LANCEUR
mv "$OPT/lancer.sh.nouveau" "$OPT/lancer.sh"
chown root:root "$OPT/lancer.sh"
chmod 755 "$OPT/lancer.sh"

# Le déployeur — celui du dépôt, possédé par root : c'est lui que la clé SSH de la CI a le droit de
# lancer, et personne d'autre que root ne doit pouvoir le réécrire.
cp "$SRC/server-msg/deployer.sh" "$OPT/deployer.sh.nouveau"
mv "$OPT/deployer.sh.nouveau" "$OPT/deployer.sh"
chown root:root "$OPT/deployer.sh"
chmod 755 "$OPT/deployer.sh"

# ── 7. La clé SSH de la CI, à COMMANDE FORCÉE ──────────────────────────────────────────────
# Chaque clé de déploiement (`VPS_SSH_KEY_MSG_BETA`, `VPS_SSH_KEY_MSG_PROD`) ne peut rien faire d'autre que lancer le déployeur POUR SON INSTANCE : `restrict` coupe terminal,
# redirections de ports, agent et X11 ; `command=` remplace ce que le client demande (il n'arrive au
# déployeur que dans SSH_ORIGINAL_COMMAND, que celui-ci valide). Une clé volée dans GitHub ne donne
# donc PAS un shell root.
# ⛔ On ne reçoit ici que la moitié PUBLIQUE. La privée est faite chez Justin et part dans le secret.
mkdir -p "$SSHD"; chmod 700 "$SSHD"
AUTH="$SSHD/authorized_keys"
touch "$AUTH"; chmod 600 "$AUTH"
MARQUE="opmsg-deploiement-$INSTANCE"   # une ligne PAR instance : la clé de la bêta et celle de la production coexistent
PUB="${OPMSG_CLE_PUBLIQUE:-}"
if [ -z "$PUB" ] && ! grep -q " $MARQUE\$" "$AUTH"; then
  read -rp "  Colle la ligne PUBLIQUE de la clé de déploiement (ssh-ed25519 AAAA…, rien de secret), ou Entrée pour plus tard : " PUB || true
fi
if [ -n "$PUB" ]; then
  RE_PUB='^(ssh-ed25519|ecdsa-sha2-nistp256|ssh-rsa) [A-Za-z0-9+/=]+( [^"]*)?$'
  [[ "$PUB" =~ $RE_PUB ]] \
    || { echo "  ✗ ce n'est pas une clé publique SSH sur une ligne (ssh-ed25519 AAAA…). Rien n'est écrit."; exit 1; }
  TYPE="${PUB%% *}"; RESTE="${PUB#* }"; BLOB="${RESTE%% *}"
  LIGNE="restrict,command=\"/opt/opmsg/deployer.sh --seulement=$INSTANCE\" $TYPE $BLOB $MARQUE"
  # Une seule ligne à nous, remplacée à chaque passage : deux passages ne la dupliquent pas.
  grep -v " $MARQUE\$" "$AUTH" > "$AUTH.nouveau" || true
  printf '%s\n' "$LIGNE" >> "$AUTH.nouveau"
  mv "$AUTH.nouveau" "$AUTH"; chmod 600 "$AUTH"
  echo "   clé de déploiement posée (commande forcée) : ${LIGNE%% $TYPE*} $TYPE …"
elif grep -q " $MARQUE\$" "$AUTH"; then
  echo "   clé de déploiement déjà posée"
else
  echo "   ⚠️ pas de clé de déploiement : la CI ne pourra pas déployer. Relance avec OPMSG_CLE_PUBLIQUE=…"
  echo "      (la ligne à ajouter est : restrict,command=\"/opt/opmsg/deployer.sh --seulement=$INSTANCE\" ssh-ed25519 <clé publique> $MARQUE)"
fi

# ── 8. Le proxy : LE SIEN, dans un fichier à part, validé AVANT d'être rechargé ───────────────
actif() { systemctl is-active --quiet "$1"; }
if [ -n "${OPMSG_PROXY:-}" ]; then
  PROXY="$OPMSG_PROXY"
  [ "$PROXY" = nginx ] || [ "$PROXY" = caddy ] || { echo "✗ OPMSG_PROXY doit valoir nginx ou caddy"; exit 2; }
elif actif nginx && actif caddy; then
  echo "✗ nginx ET caddy sont actifs : lequel tient les ports 80 et 443 ? Relance avec OPMSG_PROXY=nginx ou OPMSG_PROXY=caddy."; exit 1
elif actif nginx; then PROXY=nginx
elif actif caddy; then PROXY=caddy
else
  echo "✗ aucun proxy actif (ni nginx ni caddy). Relance avec OPMSG_PROXY=… une fois le proxy en route."; exit 1
fi
echo "── Proxy : $PROXY"

if [ "$PROXY" = nginx ]; then
  # `sites-available` quand il existe (c'est là qu'est posé le bloc d'api.teamop.fr), sinon `conf.d`.
  if [ -d "$NGX/sites-available" ]; then CIBLE_NGX="$NGX/sites-available/opmsg-$INSTANCE.conf"; LIEN_NGX="$NGX/sites-enabled/opmsg-$INSTANCE.conf"
  else CIBLE_NGX="$NGX/conf.d/opmsg-$INSTANCE.conf"; LIEN_NGX=""; fi
  mkdir -p "$(dirname "$CIBLE_NGX")" "$ACME"

  # `http2 on;` n'existe qu'à partir de nginx 1.25.1 ; avant, c'est un mot de la ligne `listen`.
  # Ubuntu 24.04 livre 1.24 : écrire la forme neuve ferait échouer `nginx -t` sur un serveur sain.
  V="$(nginx -v 2>&1 | sed -n 's|.*nginx/\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\).*|\1 \2 \3|p')"
  read -r VM VN VP <<<"${V:-1 24 0}"
  if [ $((VM*10000 + VN*100 + VP)) -ge 12501 ]; then LISTEN_H2=""; H2_ON="    http2 on;"; else LISTEN_H2=" http2"; H2_ON=""; fi

  BLOC_HTTP="# Posé par server-msg/install-msg.sh — réécrit à chaque installation, ne pas éditer à la main.
# Ce fichier est LE SEUL qu'OP MESSAGES pose dans nginx : le bloc de l'API d'OP GESTION n'est pas touché.
# ⛔ LA CLÉ DES PLAFONDS EST LE RÉSEAU, PAS L'ADRESSE (relecture du gardien, A3). Le service compte par réseau — l'adresse IPv4 entière, les 64 premiers bits d'une adresse IPv6
# (cleReseau) — parce qu'une personne dispose de 2^64 adresses dans SON /64 : une zone par \$binary_remote_addr laissait chaque adresse du /64 repartir à zéro.
# Cette table recopie la règle sur la forme TEXTUELLE que nginx donne (compressée) : quatre groupes explicites, ou « :: » après trois ou deux groupes ; le reste (IPv4,
# boucle locale, formes rares) garde l'adresse entière. Un banc la rejoue avec un VRAI nginx (tests/sonde-proxy-nginx.js).
map \$remote_addr \$opmsg_reseau_$INSTANCE {
    default \$remote_addr;
    \"~*^([0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}):\" \$1;
    \"~*^([0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4})::\" \"\$1:0\";
    \"~*^([0-9a-f]{1,4}:[0-9a-f]{1,4})::\" \"\$1:0:0\";
}
# ⛔ Un plafond de débit par réseau AVANT le service (relecture du gardien, point 8) : le service a ses propres plafonds, mais
# des envois lents et nombreux atteignaient Node directement (8 192 descripteurs). 20 requêtes par seconde et par réseau,
# 60 de rafale ; le flux SSE (une seule requête longue par onglet) n'y passe pas.
limit_req_zone \$opmsg_reseau_$INSTANCE zone=opmsg_$INSTANCE:10m rate=20r/s;
limit_req_status 429;
# Les connexions SIMULTANÉES, une zone par usage (deux emplacements sur la même zone additionneraient leurs compteurs : douze lectures en cours refuseraient un dépôt).
#   · le dépôt d'une pièce (2 Go) est TAMPONNÉ sur le disque de nginx avant que le service puisse dire 401 : par réseau, ET pour tout le monde (A3 — le disque est celui d'OP GESTION aussi) ;
#   · la lecture d'une pièce, SANS tampon (A2) : chaque lecteur lent tient une connexion du service et un fichier ouvert tant qu'il est là.
limit_conn_zone \$opmsg_reseau_$INSTANCE zone=opmsg_conn_$INSTANCE:10m;
limit_conn_zone \$server_name zone=opmsg_depots_$INSTANCE:1m;
limit_conn_zone \$opmsg_reseau_$INSTANCE zone=opmsg_lec_conn_$INSTANCE:10m;
limit_conn_zone \$server_name zone=opmsg_lectures_$INSTANCE:1m;
limit_conn_status 429;
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAINE;
    # ⛔ AUCUN JOURNAL D'ACCÈS (relecture du gardien, B2 — SERVEUR.md § 3.6 : « jamais d'adresse, de nom, de texte, de nom de fichier »). Le format par défaut écrit l'adresse de
    # chaque visiteur et la ligne de requête entière : identifiants de conversations et de pièces dans les adresses. Posé DANS nos blocs : celui d'OP GESTION n'est pas touché.
    # Les refus de débit se consignent d'ordinaire au niveau « error » avec l'adresse et la requête ; au niveau « warn » le journal d'erreurs (qui s'arrête à « error ») ne les écrit plus.
    access_log off;
    limit_req_log_level warn;
    limit_conn_log_level warn;
    # Let's Encrypt doit pouvoir poser sa preuve, même quand tout le reste redirige.
    location /.well-known/acme-challenge/ { root $ACME_REEL; }
    location / { return 301 https://$DOMAINE\$request_uri; }
}
"
  # ⛔ Le flux SSE : sans `proxy_buffering off`, nginx retient les évènements jusqu'à remplir un
  # tampon, et « Lu » arrive par paquets ; sans `proxy_read_timeout` long, il coupe un flux muet à
  # 60 s. ⛔ `X-Forwarded-For` est ÉCRASÉ par `\$remote_addr`, jamais complété : `req.ip` du service
  # (trust proxy 1) prend la dernière entrée, et un en-tête fourni par le client se falsifie.
  BLOC_HTTPS="server {
    listen 443 ssl$LISTEN_H2;
    listen [::]:443 ssl$LISTEN_H2;
$H2_ON
    server_name $DOMAINE;
    ssl_certificate     /etc/letsencrypt/live/$DOMAINE/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAINE/privkey.pem;
    # ⛔ Aucun journal d'accès, et les refus de débit hors du journal d'erreurs (B2) — voir le bloc du port 80.
    access_log off;
    limit_req_log_level warn;
    limit_conn_log_level warn;

    # ⛔ 64 Ko, corps TAMPONNÉ (le défaut de nginx) : le service refuse déjà au-delà de 64 Ko tout ce qui est JSON. Un corps de 110 Mo
    # non tamponné tenait un descripteur de Node ouvert pendant tout l'envoi d'un client lent.
    client_max_body_size 64k;

    # ⛔ L'EXCEPTION DES PIÈCES (étape 4) : SA route seulement, jamais le reste du service. 2100 Mo = le plus gros maximum du service (un
    # fichier : 2 Go, comme WhatsApp — décision de Justin, 6 octobre 2026) plus une marge ; au-delà, nginx répond 413 tout seul, avant même de lire le corps. Le corps reste TAMPONNÉ (pas de
    # « proxy_request_buffering off ») : un client lent ne tient pas un descripteur de Node pendant tout son envoi — et un envoi fractionné
    # arrive au service avec sa longueur. ⚠️ Si « pieces.fichierMax » est relevé au-delà de 2 Go dans la configuration, cette ligne doit suivre.
    # ⛔ DEUX PLAFONDS DE CONNEXIONS (A3) : 12 par réseau, et 24 pour tout le monde — 24 × 2,1 Go = 50 Go au plus sur le disque de nginx, qui est aussi celui d'OP GESTION
    # (115 Go, 5 % occupés le 6 octobre 2026). ⚠️ Un disque plus petit, ou un « fichierMax » plus haut : baisser ce 24 plutôt que de laisser le tampon remplir le disque.
    # ⚠️ Un envoi qui trottine (un octet toutes les 59 s) tient une de ces 24 places : c'est la limite connue de ce plafond — SERVEUR.md § 4.4. Si « pieces.simultanes » est relevé, la suivre.
    location = /api/pieces {
        limit_req zone=opmsg_$INSTANCE burst=20 nodelay;
        limit_conn opmsg_conn_$INSTANCE 12;
        limit_conn opmsg_depots_$INSTANCE 24;
        client_max_body_size 2100m;
        client_body_timeout 60s;
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Connection \"\";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # ⛔ LA LECTURE D'UNE PIÈCE, SANS TAMPON (A2) : par défaut nginx recopie la réponse du service dans un fichier temporaire (jusqu'à 1 Go !) dès que le client lit moins vite que le service
    # n'écrit — vingt-cinq Mo par lecteur lent, sur le disque d'OP GESTION. Sans tampon, c'est le service qui attend (et qui coupe, pieces.lectureAttenteMs et lectureMaxMs) ;
    # proxy_max_temp_file_size 0 ferme la porte même si quelqu'un rallume le tampon. Plafonds de connexions SÉPARÉS de ceux du dépôt : 64 par réseau (une galerie de photos ouvre
    # plusieurs dizaines de requêtes d'un coup en HTTP/2) et 256 en tout.
    location ^~ /api/pieces/ {
        limit_req zone=opmsg_$INSTANCE burst=60 nodelay;
        limit_conn opmsg_lec_conn_$INSTANCE 64;
        limit_conn opmsg_lectures_$INSTANCE 256;
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Connection \"\";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_max_temp_file_size 0;
        proxy_read_timeout 120s;
        send_timeout 60s;
    }

    location = /api/flux {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Connection \"\";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
        gzip off;
        proxy_read_timeout 3700s;
        proxy_send_timeout 3700s;
    }

    location / {
        limit_req zone=opmsg_$INSTANCE burst=60 nodelay;
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Connection \"\";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90s;
    }
}
"
  ecrire_ngx() {   # $1 = contenu. Sauvegarde l'ancien, écrit, VALIDE ; sinon restaure et s'arrête.
    local sauve=""
    [ -f "$CIBLE_NGX" ] && { sauve="$CIBLE_NGX.avant"; cp "$CIBLE_NGX" "$sauve"; }
    printf '%s' "$1" > "$CIBLE_NGX"
    [ -z "$LIEN_NGX" ] || { mkdir -p "$(dirname "$LIEN_NGX")"; ln -sfn "$CIBLE_NGX" "$LIEN_NGX"; }
    if ! nginx -t >/dev/null 2>&1; then
      echo "  ⛔ nginx refuse la configuration (nginx -t) — rien n'est rechargé, mon fichier est remis comme avant."
      if [ -n "$sauve" ]; then mv "$sauve" "$CIBLE_NGX"; else rm -f "$CIBLE_NGX"; [ -z "$LIEN_NGX" ] || rm -f "$LIEN_NGX"; fi
      nginx -t 2>&1 | head -5 || true
      exit 1
    fi
    [ -z "$sauve" ] || rm -f "$sauve"
    systemctl reload nginx
  }
  if [ ! -s "$LE/live/$DOMAINE/fullchain.pem" ]; then
    # Première phase : le port 80 seul, pour que Let's Encrypt puisse valider. nginx refuserait de
    # charger un bloc 443 dont le certificat n'existe pas encore.
    echo "── Certificat pour $DOMAINE…"
    command -v certbot >/dev/null || apt-get install -y -qq certbot
    ecrire_ngx "$BLOC_HTTP"
    if ! certbot certonly --webroot -w "$ACME_REEL" -d "$DOMAINE" -m contact@teamop.fr \
         --agree-tos --non-interactive --keep-until-expiring >/dev/null 2>&1; then
      echo "  ⛔ Le certificat n'a pas pu être obtenu. Le DNS de $DOMAINE pointe-t-il sur CE serveur ?"
      echo "     (le port 80 est prêt ; relance ce script une fois le DNS en place)"
      exit 1
    fi
  fi
  ecrire_ngx "$BLOC_HTTP
$BLOC_HTTPS"
else
  # Caddy : un fichier à nous, et UNE ligne `import` ajoutée au Caddyfile — le bloc d'api.teamop.fr
  # n'est pas touché. Caddy obtient le certificat tout seul.
  CADDYFILE="$CDY/Caddyfile"
  [ -f "$CADDYFILE" ] || { echo "✗ $CADDYFILE est introuvable"; exit 1; }
  mkdir -p "$CDY/opmsg"
  FICHIER_CDY="$CDY/opmsg/$INSTANCE.caddy"
  cp "$CADDYFILE" "$CADDYFILE.avant-opmsg"
  [ ! -f "$FICHIER_CDY" ] || cp "$FICHIER_CDY" "$FICHIER_CDY.avant"
  cat > "$FICHIER_CDY" <<CADDY
# Posé par server-msg/install-msg.sh — réécrit à chaque installation, ne pas éditer à la main.
$DOMAINE {
    # 64 Ko au plus pour tout (le service refuse déjà au-delà), SAUF le dépôt d'une pièce : 2100 Mo, le plus gros maximum du service (un fichier :
    # 2 Go) plus une marge — si « pieces.fichierMax » est relevé au-delà, cette ligne doit suivre. Deux emplacements qui s'excluent : deux
    # « request_body » posés sur la même requête se cumuleraient, et le plus petit gagnerait. Pas de plafond de débit ici : Caddy n'en a pas
    # sans greffon, c'est celui du service qui protège.
    @pasPieces not path /api/pieces
    request_body @pasPieces {
        max_size 64KB
    }
    @pieces path /api/pieces
    request_body @pieces {
        max_size 2100MB
    }
    reverse_proxy 127.0.0.1:$PORT {
        # Le flux SSE ne doit pas être retenu dans un tampon.
        flush_interval -1
        # X-Forwarded-For ÉCRASÉ par l'adresse vue ici, jamais complété (req.ip, trust proxy 1).
        header_up X-Forwarded-For {remote_host}
    }
}
CADDY
  grep -qxF 'import /etc/caddy/opmsg/*.caddy' "$CADDYFILE" || printf '\nimport /etc/caddy/opmsg/*.caddy\n' >> "$CADDYFILE"
  if ! caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1; then
    echo "  ⛔ Caddy refuse la configuration (caddy validate) — rien n'est rechargé, tout est remis comme avant."
    mv "$CADDYFILE.avant-opmsg" "$CADDYFILE"
    if [ -f "$FICHIER_CDY.avant" ]; then mv "$FICHIER_CDY.avant" "$FICHIER_CDY"; else rm -f "$FICHIER_CDY"; fi
    exit 1
  fi
  rm -f "$CADDYFILE.avant-opmsg" "$FICHIER_CDY.avant"
  systemctl reload caddy
fi

# ── 9. Démarrage au boot, et premier déploiement ───────────────────────────────────────────
systemctl daemon-reload
systemctl enable "$UNITE" >/dev/null 2>&1 || true
echo "── Premier déploiement (main = ${SHA_MAIN:0:8})…"
# ⛔ Le déployeur affiche l'état de /health et rien d'autre (ni journal, ni configuration) :
# Justin recolle cette sortie dans la conversation.
if OPMSG_RACINE="$R" "$OPT/deployer.sh" "$INSTANCE" "$SHA_MAIN"; then
  echo ""
  echo "✓ OP MESSAGES ($INSTANCE) installé."
else
  echo ""
  echo "⛔ Installation faite, mais le déploiement a échoué — voir ci-dessus. Le service est resté sur l'état d'avant."
  exit 1
fi
