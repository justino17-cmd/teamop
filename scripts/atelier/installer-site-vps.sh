#!/usr/bin/env bash
# LE GESTE ROOT DE L'ÉTAPE 3 du départ de GitHub (le site teamop.fr servi par le serveur des clients). SUR LE SERVEUR DES CLIENTS.
#   bash installer-site-vps.sh            → met à jour /usr/local/sbin/teamop-deployer (il apprend « site ») et prépare Caddy, SANS l'activer
#   bash installer-site-vps.sh --activer  → recharge Caddy : à faire SEULEMENT quand teamop.fr pointe déjà vers ce serveur chez OVH
#                                           (sinon Caddy n'obtient pas de certificat et réessaie de plus en plus lentement).
# Rien n'est touché si Caddy refuse la configuration (caddy validate). Une copie du Caddyfile d'avant est gardée.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "✗ à lancer en root, sur le serveur des clients"; exit 1; }
ICI="$(cd "$(dirname "$0")" && pwd)"
[ -d /opt/teamop/repo/.git ] || { echo "✗ /opt/teamop/repo n'est pas là : ce n'est pas le serveur des clients"; exit 1; }
command -v caddy >/dev/null || { echo "✗ Caddy n'est pas installé ici"; exit 1; }
CF=/etc/caddy/Caddyfile; [ -f "$CF" ] || { echo "✗ $CF introuvable"; exit 1; }
bash -n "$ICI/vps-deployer.sh"

install -o root -g root -m 755 "$ICI/vps-deployer.sh" /usr/local/sbin/teamop-deployer
echo "✅ teamop-deployer mis à jour (sait maintenant recevoir le site)"
mkdir -p /opt/teamop/site && chmod 755 /opt/teamop/site

install -o root -g root -m 644 "$ICI/caddy-teamop-site.caddy" /etc/caddy/teamop-site.caddy
# On valide le Caddyfile AVEC l'import dans une copie : le vrai Caddyfile ne reçoit l'import qu'à l'activation (un redémarrage de Caddy
# avant le changement de DNS ne doit pas lui faire chercher un certificat qu'il ne peut pas obtenir).
ESSAI="$(mktemp /etc/caddy/.essai-XXXXXX)"; trap 'rm -f "$ESSAI"' EXIT
{ grep -vx 'import /etc/caddy/teamop-site.caddy' "$CF"; printf '\n%s\n' 'import /etc/caddy/teamop-site.caddy'; } > "$ESSAI"
caddy validate --config "$ESSAI" --adapter caddyfile >/dev/null 2>&1 || { echo "✗ Caddy refuse la configuration : rien n'est changé"; caddy validate --config "$ESSAI" --adapter caddyfile 2>&1 | tail -5; exit 1; }
echo "✅ configuration du site prête et validée par Caddy"

if [ "${1:-}" = "--activer" ]; then
  MOI="$(curl -s4 --max-time 5 https://api.ipify.org || true)"
  # On demande aux serveurs DNS d'OVH EUX-MÊMES (pas au cache local, qui peut garder l'ancienne réponse une heure).
  VU=""; for NS in ns200.anycast.me dns200.anycast.me; do
    command -v dig >/dev/null && VU="$(dig +short +time=3 +tries=1 A teamop.fr @"$NS" | grep -E '^[0-9.]+$' | sort -u | tr '\n' ' ' | sed 's/ $//')"
    [ -n "$VU" ] && break
  done
  [ -n "$VU" ] || VU="$(getent ahostsv4 teamop.fr | awk '{print $1; exit}')"
  [ -n "$MOI" ] && [ "$VU" = "$MOI" ] || { echo "✗ teamop.fr pointe vers ${VU:-?}, pas vers ce serveur (${MOI:-?}) : changer d'abord le DNS chez OVH, puis relancer avec --activer"; exit 1; }
  [ -s /opt/teamop/site/actuel/index.html ] || { echo "✗ le site n'est pas encore arrivé dans /opt/teamop/site/actuel"; exit 1; }
  if ! grep -qx 'import /etc/caddy/teamop-site.caddy' "$CF"; then
    cp -a "$CF" "$CF.avant-site-$(date +%Y%m%d-%H%M%S)"
    printf '\n%s\n' 'import /etc/caddy/teamop-site.caddy' >> "$CF"
  fi
  systemctl reload caddy
  echo "✅ Caddy rechargé : teamop.fr est servi par ce serveur (le certificat s'obtient dans la minute)"
else
  echo "(Caddy n'est PAS activé pour le site : relancer avec --activer une fois le DNS de teamop.fr changé chez OVH)"
fi
