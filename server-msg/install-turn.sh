#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════════════════════════
#  Installation du RELAIS D'APPELS d'OP MESSAGES (coturn) — à lancer APRÈS install-msg.sh, en root.
#
#  Usage :   bash install-turn.sh beta          (ou prod — l'instance doit déjà être installée)
#
#  Conception : design/opmessages/SERVEUR.md § 3.5 et § Étape 7. Mode d'emploi, geste par geste :
#  design/opmessages/INSTALLER-LE-SERVEUR.md (« Le relais d'appels »).
#
#  Pourquoi un relais : deux téléphones sur deux réseaux ne se joignent pas toujours directement (pare-feu
#  d'entreprise, réseau mobile). Le relais fait passer leurs paquets chiffrés ; il ne lit jamais une image
#  ni un son. Sans lui, un appel passe seulement quand les deux appareils se joignent tout seuls — la page le dit.
#
#  Ce que fait ce script, dans l'ordre :
#    1. installe coturn (le paquet de la distribution) s'il manque ;
#    2. obtient le certificat du relais (TLS sur 5349), sauf si le DNS ou nginx ne le permettent pas — alors
#       le relais marche SANS TLS (3478 seulement) et le script le DIT ;
#    3. tire le SECRET PARTAGÉ au hasard, ICI, et l'écrit dans la configuration de coturn ET dans celle de l'instance
#       (/etc/opmsg/<instance>.json, chmod 600) ;
#    4. démarre coturn, puis le CONTRÔLE (outils/verifier-relais.js : une allocation réussit, un mauvais identifiant
#       est refusé, 127.0.0.1 et les réseaux privés sont refusés, une adresse publique est acceptée) ;
#    5. SEULEMENT SI le contrôle est vert : ouvre les ports du pare-feu (ufw, s'il est actif) et relance l'instance.
#
#  ⛔ CE SCRIPT NE TOUCHE JAMAIS À OP GESTION : ni ses dossiers, ni son unité, ni le bloc de son API dans le proxy.
#
#  ⛔ ET IL N'AFFICHE JAMAIS UN SECRET (règle du 24 septembre 2026 : « on ne fait jamais afficher un secret sur le VPS —
#  Justin recolle toutes ses sorties dans la conversation »). Le secret naît dans un processus Node, passe d'un fichier
#  à l'autre sans traverser le shell, et ne figure ni dans un argument (visible par `ps`), ni dans l'environnement,
#  ni dans une variable de ce script. Tout ce que ce script lance et qui touche un secret passe par un masqueur.
#
#  ⛔ IL EST REJOUABLE. Le secret existant est REPRIS (jamais retiré au sort de nouveau : les appels en cours et
#  l'autre instance continueraient avec l'ancien) ; une configuration identique n'est pas réécrite ; coturn et
#  l'instance ne sont relancés que si quelque chose a changé ; les règles du pare-feu ne se dupliquent pas.
#
#  ⛔ CE QUE LE RELAIS NE DOIT JAMAIS ATTEINDRE : LA MACHINE ELLE-MÊME. Sans les `denied-peer-ip` ci-dessous,
#  une personne connectée pourrait demander au relais d'envoyer des paquets à 127.0.0.1:8080 (OP GESTION), au service
#  de métadonnées de l'hébergeur (169.254.169.254) ou aux voisins du réseau privé. Trois pièges MESURÉS sur coturn 4.6.1 :
#    · la notation CIDR (10.0.0.0/8) n'est PAS lue : coturn la prend pour un NOM D'HÔTE et ignore la règle, sans refuser
#      de démarrer. Seules les plages « début-fin » sont lues ;
#    · une plage IPv6 qui COMMENCE à « :: » avale aussi les adresses IPv4 publiques (le relais refuserait tout) ;
#    · un réglage inconnu, une plage illisible ou une valeur absurde n'empêchent PAS coturn de démarrer.
#  C'est pourquoi l'étape 4 contrôle les EFFETS, et pourquoi tests/test-982.js relit chaque ligne de cette configuration.
#
#  Variables (toutes facultatives) :
#    OPMSG_RACINE          préfixe de tous les chemins — UNIQUEMENT pour les bancs (bac à sable)
#    OPMSG_TURN_HOTE       le nom du relais, tel que les pages le connaissent (défaut : turn.teamop.fr — un enregistrement DNS « turn »)
#    OPMSG_TURN_IP         l'adresse PUBLIQUE du VPS, seulement s'il est derrière une traduction d'adresses (certains hébergeurs)
#    OPMSG_TURN_SANS_TLS   « oui » pour ne pas chercher de certificat (le relais ne parle alors que sur 3478)
# ════════════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

INSTANCE="${1:-}"
case "$INSTANCE" in
  beta|prod) ;;
  *) echo "usage : bash install-turn.sh <beta|prod>"; exit 2 ;;
esac
HOTE="${OPMSG_TURN_HOTE:-turn.teamop.fr}"
IP_PUBLIQUE="${OPMSG_TURN_IP:-}"
SANS_TLS="${OPMSG_TURN_SANS_TLS:-}"

# Un nom ou une adresse qui vient de l'environnement finit dans un fichier lu par root : on n'y laisse passer que ce qui en a la forme.
[[ "$HOTE" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]] || { echo "✗ nom du relais illisible"; exit 2; }
[ -z "$IP_PUBLIQUE" ] || [[ "$IP_PUBLIQUE" =~ ^[0-9a-fA-F:.]+$ ]] || { echo "✗ adresse publique illisible"; exit 2; }

# ── Les réglages. Les ports sont ceux que Justin ouvre dans le panneau de l'hébergeur (INSTALLER-LE-SERVEUR.md). ──────
PORT_TURN=3478
PORT_TLS=5349
PORT_MIN=49160
PORT_MAX=49999
# Plafonds du relais (SERVEUR.md § 3.5) : au plus 8 allocations par identifiant, 300 en tout, 500 ko/s par session et 12,5 Mo/s pour l'ensemble
# (100 Mbit/s : une trentaine d'appels vidéo RELAYÉS à la fois — la plupart des appels passent directement et ne coûtent rien ici).
USER_QUOTA=8
TOTAL_QUOTA=300
MAX_BPS=500000
BPS_CAPACITE=12500000
# ⛔ Les adresses vers lesquelles le relais REFUSE de relayer : des PLAGES « début-fin » (jamais de /masque), IPv4 d'abord.
REFUSES=(
  "0.0.0.0-0.255.255.255"            # « ce réseau »
  "10.0.0.0-10.255.255.255"          # privé
  "100.64.0.0-100.127.255.255"       # partage d'adresses des opérateurs
  "127.0.0.0-127.255.255.255"        # la machine elle-même : OP GESTION, OP MESSAGES, tout ce qui écoute en local
  "169.254.0.0-169.254.255.255"      # lien local : le service de métadonnées de l'hébergeur y vit
  "172.16.0.0-172.31.255.255"        # privé
  "192.0.0.0-192.0.0.255"            # protocoles de l'IETF
  "192.168.0.0-192.168.255.255"      # privé
  "198.18.0.0-198.19.255.255"        # bancs d'essai de réseaux
  "224.0.0.0-255.255.255.255"        # multicast, réservé, diffusion
  "::1-::1"                          # IPv6 : la machine elle-même
  "::ffff:0:0-::ffff:ffff:ffff"      # IPv6 : une IPv4 écrite en IPv6 (contournerait la liste ci-dessus)
  "64:ff9b::-64:ff9b::ffff:ffff"     # IPv6 : NAT64 (idem)
  "fc00::-fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"   # IPv6 : réseaux privés
  "fe80::-febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff"   # IPv6 : lien local
  "2001::-2001:0:ffff:ffff:ffff:ffff:ffff:ffff"      # IPv6 : Teredo (embarque une IPv4)
  "2002::-2002:ffff:ffff:ffff:ffff:ffff:ffff:ffff"   # IPv6 : 6to4 (embarque une IPv4)
)

# ── Les chemins. Tous sous $R, qui est VIDE sur le VPS : seuls les bancs le posent. ───────────────────────────────
R="${OPMSG_RACINE:-}"
OPT="$R/opt/opmsg"
ETC="$R/etc/opmsg"
CONFIG="$ETC/$INSTANCE.json"
COTURN_CONF="$R/etc/turnserver.conf"
CERTS_REEL="/etc/coturn/certs"
CERTS="$R$CERTS_REEL"
SYSD="$R/etc/systemd/system"
LE="$R/etc/letsencrypt"
NGX="$R/etc/nginx"
ACME_REEL="/var/www/opmsg-acme"
ACME="$R$ACME_REEL"
UNITE="teamop-msg@$INSTANCE"

if [ -z "$R" ] && [ "$(id -u)" != "0" ]; then echo "✗ à lancer en root"; exit 1; fi
[ -f "$CONFIG" ] || { echo "✗ l'instance $INSTANCE n'est pas installée ($CONFIG est absent) : lancer d'abord install-msg.sh $INSTANCE"; exit 1; }
command -v node >/dev/null || { echo "✗ node est absent du VPS"; exit 1; }

# Rien de ce qui touche un secret ne s'affiche tel quel : tout mot de 40 caractères « d'identifiant » ou plus est masqué.
masquer() { sed -E 's/[A-Za-z0-9_-]{40,}/[masqué]/g'; }
actif() { systemctl is-active --quiet "$1"; }

echo "── OP MESSAGES · relais d'appels · instance $INSTANCE · $HOTE"

# ── 1. coturn ─────────────────────────────────────────────────────────────────────────────────────────────────
# Le paquet DÉMARRE coturn dès qu'il est installé, avec une configuration vide : on l'arrête aussitôt, il ne doit pas écouter avant la nôtre.
if ! command -v turnserver >/dev/null 2>&1; then
  echo "   coturn : installation"
  apt-get install -y -qq coturn >/dev/null
  systemctl stop coturn >/dev/null 2>&1 || true
fi
command -v turnserver >/dev/null 2>&1 || { echo "✗ coturn n'est pas installé après apt-get : on s'arrête avant de rien écrire"; exit 1; }

# ── 2. Le certificat du relais (TLS sur 5349) ─────────────────────────────────────────────────────────────────
# Sans lui le relais reste utile (3478 en UDP et en TCP) ; avec lui, les réseaux d'entreprise qui ne laissent passer que du TLS peuvent aussi appeler.
AVEC_TLS=non
ecrire_ngx() {   # $1 = fichier, $2 = lien (ou vide), $3 = contenu. Sauvegarde l'ancien, écrit, VALIDE ; sinon restaure et rend 1.
  local cible="$1" lien="$2" sauve=""
  mkdir -p "$(dirname "$cible")"
  [ -f "$cible" ] && { sauve="$cible.avant"; cp "$cible" "$sauve"; }
  printf '%s' "$3" > "$cible"
  [ -z "$lien" ] || { mkdir -p "$(dirname "$lien")"; ln -sfn "$cible" "$lien"; }
  if ! nginx -t >/dev/null 2>&1; then
    echo "   ⛔ nginx refuse la configuration (nginx -t) — rien n'est rechargé, mon fichier est remis comme avant."
    if [ -n "$sauve" ]; then mv "$sauve" "$cible"; else rm -f "$cible"; [ -z "$lien" ] || rm -f "$lien"; fi
    return 1
  fi
  [ -z "$sauve" ] || rm -f "$sauve"
  systemctl reload nginx
}
if [ "$SANS_TLS" = "oui" ]; then
  echo "   TLS : écarté (OPMSG_TURN_SANS_TLS=oui) — le relais ne parlera que sur $PORT_TURN"
else
  if [ ! -s "$LE/live/$HOTE/fullchain.pem" ] || [ ! -s "$LE/live/$HOTE/privkey.pem" ]; then
    CERTBOT_POSSIBLE=non
    if actif nginx; then
      if command -v certbot >/dev/null 2>&1 || apt-get install -y -qq certbot >/dev/null 2>&1; then CERTBOT_POSSIBLE=oui; fi
    fi
    if [ "$CERTBOT_POSSIBLE" = "oui" ]; then
      echo "   certificat pour $HOTE…"
      # Let's Encrypt prouve que le nom est à nous par le port 80 : un bloc nginx MINIMAL, qui ne sert que la preuve (le relais, lui, ne passe pas par nginx).
      if [ -d "$NGX/sites-available" ]; then CIBLE_NGX="$NGX/sites-available/opmsg-turn.conf"; LIEN_NGX="$NGX/sites-enabled/opmsg-turn.conf"
      else CIBLE_NGX="$NGX/conf.d/opmsg-turn.conf"; LIEN_NGX=""; fi
      mkdir -p "$ACME"
      BLOC_ACME="# Posé par server-msg/install-turn.sh — réécrit à chaque installation, ne pas éditer à la main.
# Le SEUL fichier d'OP MESSAGES pour ce nom : il ne sert que la preuve de Let's Encrypt. Aucun journal d'accès (SERVEUR.md § 3.6).
server {
    listen 80;
    listen [::]:80;
    server_name $HOTE;
    access_log off;
    location /.well-known/acme-challenge/ { root $ACME_REEL; }
    location / { return 404; }
}
"
      if ecrire_ngx "$CIBLE_NGX" "$LIEN_NGX" "$BLOC_ACME"; then
        if ! certbot certonly --webroot -w "$ACME_REEL" -d "$HOTE" -m contact@teamop.fr --agree-tos --non-interactive --keep-until-expiring >/dev/null 2>&1; then
          echo "   ⚠️ le certificat n'a pas pu être obtenu : le DNS de $HOTE pointe-t-il sur CE serveur ? Le relais est installé SANS TLS ; relance ce script une fois le DNS en place."
        fi
      else
        echo "   ⚠️ pas de certificat (le bloc nginx a été refusé) : le relais est installé SANS TLS."
      fi
    else
      echo "   ⚠️ pas de certificat : il faut nginx actif et certbot (si un autre proxy tient le port 80, voir INSTALLER-LE-SERVEUR.md) — le relais est installé SANS TLS."
    fi
  fi
  if [ -s "$LE/live/$HOTE/fullchain.pem" ] && [ -s "$LE/live/$HOTE/privkey.pem" ]; then
    AVEC_TLS=oui
    # coturn tourne sous son propre compte (turnserver) : il ne lit pas /etc/letsencrypt (root seul). On lui range UNE copie, lisible par son groupe,
    # et un crochet de renouvellement la rafraîchit à chaque renouvellement du certificat.
    mkdir -p "$CERTS"
    chown root:turnserver "$CERTS"; chmod 750 "$CERTS"
    for f in fullchain privkey; do
      cp -L "$LE/live/$HOTE/$f.pem" "$CERTS/$f.pem.nouveau"
      chown root:turnserver "$CERTS/$f.pem.nouveau"; chmod 640 "$CERTS/$f.pem.nouveau"
      mv "$CERTS/$f.pem.nouveau" "$CERTS/$f.pem"
    done
    mkdir -p "$LE/renewal-hooks/deploy"
    HOOK="$LE/renewal-hooks/deploy/opmsg-turn.sh"
    cat > "$HOOK.nouveau" <<'CROCHET'
#!/bin/sh
# Posé par server-msg/install-turn.sh — rend le certificat renouvelé au relais (coturn), qui le relit sans couper les appels (SIGUSR2).
set -eu
case " ${RENEWED_DOMAINS:-} " in *" @HOTE@ "*) ;; *) exit 0 ;; esac
D=/etc/coturn/certs
cp -L "$RENEWED_LINEAGE/fullchain.pem" "$D/fullchain.pem.nouveau"
cp -L "$RENEWED_LINEAGE/privkey.pem" "$D/privkey.pem.nouveau"
chown root:turnserver "$D/fullchain.pem.nouveau" "$D/privkey.pem.nouveau"
chmod 640 "$D/fullchain.pem.nouveau" "$D/privkey.pem.nouveau"
mv "$D/fullchain.pem.nouveau" "$D/fullchain.pem"
mv "$D/privkey.pem.nouveau" "$D/privkey.pem"
systemctl kill --signal=SIGUSR2 coturn || systemctl restart coturn
CROCHET
    sed -i "s/@HOTE@/$HOTE/" "$HOOK.nouveau"
    mv "$HOOK.nouveau" "$HOOK"
    chown root:root "$HOOK"; chmod 755 "$HOOK"
  fi
fi
if [ "$AVEC_TLS" = "oui" ]; then echo "   TLS : oui ($PORT_TLS)"; else echo "   TLS : non — le relais ne parle que sur $PORT_TURN"; fi

# ── 3. La configuration de coturn (sans le secret) — le secret y est ajouté par le programme Node ci-dessous ──────────────
MODELE="$COTURN_CONF.modele"
mkdir -p "$(dirname "$COTURN_CONF")"
{
  echo "# Posé par server-msg/install-turn.sh — réécrit à chaque installation, ne pas éditer à la main."
  echo "# Le relais d'appels d'OP MESSAGES (design/opmessages/SERVEUR.md § 3.5). Ce fichier porte le secret partagé : root et le compte coturn seuls le lisent."
  echo ""
  echo "# ── qui l'atteint ──"
  echo "listening-port=$PORT_TURN"
  if [ "$AVEC_TLS" = "oui" ]; then echo "tls-listening-port=$PORT_TLS"; fi
  if [ -n "$IP_PUBLIQUE" ]; then echo "external-ip=$IP_PUBLIQUE"; fi
  echo "min-port=$PORT_MIN"
  echo "max-port=$PORT_MAX"
  echo "realm=$HOTE"
  echo "server-name=$HOTE"
  echo ""
  echo "# ── l'authentification : des identifiants ÉPHÉMÈRES (schéma REST), calculés par le service avec le secret partagé ──"
  echo "use-auth-secret"
  echo "fingerprint"
  echo "no-software-attribute"
  echo ""
  echo "# ── ce que le relais ne fait PAS ──"
  echo "no-cli"
  echo "no-tcp-relay"
  echo "no-multicast-peers"
  echo "no-dtls"
  if [ "$AVEC_TLS" = "oui" ]; then
    echo "cert=$CERTS_REEL/fullchain.pem"
    echo "pkey=$CERTS_REEL/privkey.pem"
    echo "no-tlsv1"
    echo "no-tlsv1_1"
  else
    echo "no-tls"
  fi
  echo ""
  echo "# ── les adresses vers lesquelles il REFUSE de relayer (plages « début-fin » : coturn ne lit pas la notation /masque) ──"
  for plage in "${REFUSES[@]}"; do echo "denied-peer-ip=$plage"; done
  echo ""
  echo "# ── les plafonds ──"
  echo "user-quota=$USER_QUOTA"
  echo "total-quota=$TOTAL_QUOTA"
  echo "max-bps=$MAX_BPS"
  echo "bps-capacity=$BPS_CAPACITE"
  echo ""
  echo "# ── aucune trace : le journal de coturn porte l'adresse de chaque appareil et l'identifiant de chaque personne (SERVEUR.md § 3.6) ──"
  echo "no-stdout-log"
  echo "log-file=/dev/null"
  echo "simple-log"
  echo ""
  echo "# ── le secret partagé, une ligne par instance installée (ajoutée par le script, jamais affichée) ──"
} > "$MODELE"
chmod 600 "$MODELE"

# ── 4. Le secret : tiré au hasard ICI, écrit dans les DEUX configurations, jamais affiché ──────────────────────────────
# Un seul programme Node : le secret ne traverse ni le shell, ni un argument, ni l'environnement. Il REPREND celui que l'instance porte déjà
# (rejouer ce script ne casse ni les appels en cours ni l'autre instance) et réunit en fin de fichier les secrets de TOUTES les instances posées.
# Il n'écrit une configuration que si elle change, par un fichier temporaire puis un renommage, en 0600 (instance) et 0640 (coturn).
# Ce qu'il imprime : des mots d'état, jamais une valeur.
[ ! -f "$CONFIG.avant-turn" ] || rm -f "$CONFIG.avant-turn"
cp -p "$CONFIG" "$CONFIG.avant-turn"
chmod 600 "$CONFIG.avant-turn"
if ! ETAT="$(INSTANCE="$INSTANCE" ETC="$ETC" CONFIG_INSTANCE="$CONFIG" COTURN_CONF="$COTURN_CONF" MODELE="$MODELE" HOTE="$HOTE" PORT_TURN="$PORT_TURN" PORT_TLS="$PORT_TLS" AVEC_TLS="$AVEC_TLS" \
  node - <<'PROGRAMME'
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), e = process.env;
const RE_SECRET = /^[A-Za-z0-9_-]{32,128}$/;
const lire = (p) => { try { const j = JSON.parse(fs.readFileSync(p, "utf8")); return j && typeof j === "object" && !Array.isArray(j) ? j : null; } catch (x) { return null; } };
const ecrire = (p, texte, mode) => { const t = p + ".nouveau"; fs.writeFileSync(t, texte, { mode: mode }); fs.renameSync(t, p); };
try {
  const cfg = lire(e.CONFIG_INSTANCE);
  if (!cfg) { console.log("configuration-illisible"); process.exit(3); }
  const appels = (cfg.appels && typeof cfg.appels === "object" && !Array.isArray(cfg.appels)) ? cfg.appels : {};
  const ancien = (appels.relais && typeof appels.relais === "object" && !Array.isArray(appels.relais)) ? appels.relais : {};
  const repris = typeof ancien.secret === "string" && RE_SECRET.test(ancien.secret);
  const secret = repris ? ancien.secret : crypto.randomBytes(48).toString("base64url");
  const relais = { hote: e.HOTE, port: Number(e.PORT_TURN), portTls: e.AVEC_TLS === "oui" ? Number(e.PORT_TLS) : null, secret: secret, ttlS: Number.isInteger(ancien.ttlS) ? ancien.ttlS : 3600 };
  const neuve = Object.assign({}, cfg, { appels: Object.assign({}, appels, { relais: relais }) });
  const texte = JSON.stringify(neuve, null, 2) + "\n";
  const changeInstance = fs.readFileSync(e.CONFIG_INSTANCE, "utf8") !== texte;
  if (changeInstance) ecrire(e.CONFIG_INSTANCE, texte, 0o600);
  const secrets = [];
  for (const inst of ["beta", "prod"]) {
    const c = inst === e.INSTANCE ? neuve : lire(path.join(e.ETC, inst + ".json"));
    const s = c && c.appels && c.appels.relais && c.appels.relais.secret;
    if (typeof s === "string" && RE_SECRET.test(s)) secrets.push(s);
  }
  const conf = fs.readFileSync(e.MODELE, "utf8") + secrets.map((s) => "static-auth-secret=" + s + "\n").join("");
  let existant = null;
  try { existant = fs.readFileSync(e.COTURN_CONF, "utf8"); } catch (x) { existant = null; }
  const changeCoturn = existant !== conf;
  if (changeCoturn) ecrire(e.COTURN_CONF, conf, 0o640);
  console.log("cle=" + (repris ? "repris" : "nouveau") + " instance=" + (changeInstance ? "change" : "inchange") + " coturn=" + (changeCoturn ? "change" : "inchange") + " secrets=" + secrets.length);
} catch (x) {
  console.log("erreur-" + (x && x.code ? String(x.code).replace(/[^A-Z_]/g, "") : "inconnue"));
  process.exit(1);
}
PROGRAMME
)"; then
  rm -f "$MODELE"
  mv "$CONFIG.avant-turn" "$CONFIG" 2>/dev/null || true
  echo "⛔ la configuration n'a pas pu être écrite ($(printf '%s' "$ETAT" | masquer)) — rien n'est changé, le service n'est pas touché."
  exit 1
fi
rm -f "$MODELE"
echo "   $(printf '%s' "$ETAT" | masquer)"
# Les droits d'abord, le démarrage ensuite : l'instance lit sa configuration sous son compte, coturn la sienne sous le sien.
chown opmsg:opmsg "$CONFIG"; chmod 600 "$CONFIG"
chown root:turnserver "$COTURN_CONF"; chmod 640 "$COTURN_CONF"
case "$ETAT" in *"coturn=change"*) CHANGE_COTURN=oui ;; *) CHANGE_COTURN=non ;; esac
case "$ETAT" in *"instance=change"*) CHANGE_INSTANCE=oui ;; *) CHANGE_INSTANCE=non ;; esac

# Des limites de ressources et un compte sans privilège de plus : si le relais s'emballe, c'est lui qui ploie, pas OP GESTION (même machine).
# (Pas de bac à sable plus serré : coturn énumère les interfaces par netlink et lit sa base locale ; ce qu'on ne peut pas éprouver ici ne se pose pas.)
mkdir -p "$SYSD/coturn.service.d"
printf '%s\n' '[Service]' 'NoNewPrivileges=true' 'RestrictRealtime=true' 'LockPersonality=true' 'MemoryMax=512M' 'CPUWeight=20' 'IOWeight=20' 'LimitNOFILE=8192' > "$SYSD/coturn.service.d/opmsg.conf.nouveau"
if [ -f "$SYSD/coturn.service.d/opmsg.conf" ] && cmp -s "$SYSD/coturn.service.d/opmsg.conf.nouveau" "$SYSD/coturn.service.d/opmsg.conf"; then
  rm -f "$SYSD/coturn.service.d/opmsg.conf.nouveau"
else
  mv "$SYSD/coturn.service.d/opmsg.conf.nouveau" "$SYSD/coturn.service.d/opmsg.conf"
  chmod 644 "$SYSD/coturn.service.d/opmsg.conf"
  systemctl daemon-reload
  CHANGE_COTURN=oui
fi

# ── 5. Démarrer coturn, puis le CONTRÔLER avant d'ouvrir quoi que ce soit ───────────────────────────────────────────
systemctl enable coturn >/dev/null 2>&1 || true
if [ "$CHANGE_COTURN" = "oui" ] || ! actif coturn; then systemctl restart coturn || true; fi
for _ in 1 2 3 4 5 6 7 8 9 10; do actif coturn && break; sleep 1; done
# ⛔ ÉCHEC = FERMÉ : un relais qu'on n'a pas pu éprouver ne reste pas en route, et l'instance ne garde pas la configuration qui y mène (ses pages demanderaient des
# identifiants pour un relais absent ou défaillant). Le secret reste écrit dans le fichier de coturn (root et son compte seuls) : la relance reprend là.
annuler() {   # $1 = ce qu'il faut dire
  systemctl stop coturn >/dev/null 2>&1 || true
  if [ -f "$CONFIG.avant-turn" ]; then mv "$CONFIG.avant-turn" "$CONFIG"; chown opmsg:opmsg "$CONFIG"; chmod 600 "$CONFIG"; fi
  echo "$1"
  exit 1
}
if ! actif coturn; then
  annuler "⛔ coturn n'a pas démarré avec cette configuration. Il est arrêté, rien n'est ouvert dans le pare-feu, l'instance n'a pas été relancée : OP MESSAGES continue comme avant. Voir :  systemctl status coturn --no-pager | head -5"
fi
VERIF="$OPT/$INSTANCE/current/outils/verifier-relais.js"
if [ ! -f "$VERIF" ]; then
  annuler "⛔ le contrôle du relais est absent ($VERIF) : la version d'OP MESSAGES en service est antérieure aux appels. On n'ouvre pas un relais qu'on n'a pas éprouvé — déploie d'abord la version avec les appels (merge sur main, la CI déploie), puis relance ce script : il reprendra là où il en est."
fi
echo "── Contrôle du relais (ce serveur contre lui-même)…"
if ! OPMSG_CONFIG="$CONFIG" node "$VERIF" "$INSTANCE" 2>&1 | masquer; then
  echo ""
  annuler "⛔ Le relais ne fait pas ce qu'il doit (voir les ✗ ci-dessus). Il est ARRÊTÉ, RIEN n'est ouvert dans le pare-feu, l'instance n'a pas été relancée. Un ✗ sur un « REFUSE » veut dire qu'une règle de configuration n'est pas lue."
fi

# ── 6. Le pare-feu du VPS (s'il est actif) ; celui de l'hébergeur, c'est Justin qui l'ouvre ──────────────────────────────
if command -v ufw >/dev/null 2>&1; then
  ETAT_UFW="$(LC_ALL=C ufw status 2>/dev/null || true)"
  case "$ETAT_UFW" in
    "Status: active"*)
      REGLES=("$PORT_TURN/udp" "$PORT_TURN/tcp")
      if [ "$AVEC_TLS" = "oui" ]; then REGLES+=("$PORT_TLS/tcp"); fi
      REGLES+=("$PORT_MIN:$PORT_MAX/udp")
      for regle in "${REGLES[@]}"; do ufw allow "$regle" comment opmsg-turn >/dev/null; done
      echo "   pare-feu du VPS (ufw) : ports du relais ouverts" ;;
    *) echo "   pare-feu du VPS (ufw) : inactif — rien à y ouvrir" ;;
  esac
else
  echo "   pare-feu du VPS : pas d'ufw — rien à y ouvrir"
fi

# ── 7. L'instance lit sa configuration au démarrage : elle est relancée si quelque chose a changé, puis on lui demande si elle voit le relais ──────────────
PORT_SERVICE="$(sed -n 's/^PORT=//p' "$ETC/$INSTANCE.env" 2>/dev/null || true)"
[[ "$PORT_SERVICE" =~ ^[0-9]{2,5}$ ]] || PORT_SERVICE=""
voit_le_relais() {
  [ -n "$PORT_SERVICE" ] || return 1
  PORT_SERVICE="$PORT_SERVICE" node - <<'SONDE'
const h = require("http");
const q = h.get({ host: "127.0.0.1", port: Number(process.env.PORT_SERVICE), path: "/health", timeout: 3000 }, (r) => {
  let b = ""; r.on("data", (d) => { b += d; });
  r.on("end", () => { try { const j = JSON.parse(b); process.exit(j && j.appels && j.appels.turn === true ? 0 : 2); } catch (x) { process.exit(3); } });
});
q.on("error", () => process.exit(4));
q.on("timeout", () => { q.destroy(); process.exit(5); });
SONDE
}
if ! actif "$UNITE"; then
  echo "   l'instance ($UNITE) ne tourne pas : elle lira le relais à son prochain démarrage."
  rm -f "$CONFIG.avant-turn"
else
  if [ "$CHANGE_INSTANCE" = "oui" ] || ! voit_le_relais; then
    systemctl restart "$UNITE" || true
    for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do voit_le_relais && break; sleep 1; done
  fi
  if voit_le_relais; then
    echo "   ✓ l'instance voit le relais (/health : appels.turn)"
    rm -f "$CONFIG.avant-turn"
  elif actif "$UNITE" && [ -n "$PORT_SERVICE" ]; then
    # Le service répond mais ne dit pas avoir un relais : une version d'avant les appels, ou une configuration qu'il a refusée. On remet l'ancienne : OP MESSAGES doit tourner.
    echo "⛔ l'instance a redémarré mais ne voit pas le relais. La configuration d'avant est remise et l'instance relancée : OP MESSAGES tourne comme avant."
    mv "$CONFIG.avant-turn" "$CONFIG"; chown opmsg:opmsg "$CONFIG"; chmod 600 "$CONFIG"
    systemctl restart "$UNITE" || true
    exit 1
  elif ! actif "$UNITE"; then
    echo "⛔ l'instance ne repart pas avec cette configuration. La configuration d'avant est remise et l'instance relancée."
    mv "$CONFIG.avant-turn" "$CONFIG"; chown opmsg:opmsg "$CONFIG"; chmod 600 "$CONFIG"
    systemctl restart "$UNITE" || true
    exit 1
  else
    echo "   ⚠️ le port du service est illisible ($ETC/$INSTANCE.env) : le /health n'a pas pu être consulté — vérifie « appels.turn » à la main."
    rm -f "$CONFIG.avant-turn"
  fi
fi

echo ""
echo "✓ Le relais d'appels est en place pour $INSTANCE."
echo "   À ouvrir dans le PANNEAU DE L'HÉBERGEUR (le pare-feu du VPS vient d'être réglé) : TCP et UDP $PORT_TURN, TCP $PORT_TLS, UDP $PORT_MIN-$PORT_MAX."
echo "   De l'extérieur (ton Mac) :  nc -vz $HOTE $PORT_TURN   puis   openssl s_client -connect $HOTE:$PORT_TLS -brief < /dev/null   — rien de secret ne s'y affiche."
