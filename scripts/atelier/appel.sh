#!/usr/bin/env bash
# Lance UNE commande sur le serveur d'atelier par sa porte (scripts/atelier/porte.js), depuis une session Claude du cloud.
#   bash scripts/atelier/appel.sh '<commande>' [délai en secondes, 120 par défaut, 900 au plus]
# La clé n'est PAS ici : elle vit dans les secrets réseau de l'environnement de la session (hôte atelier.teamop.fr, en-tête
# Authorization, type Bearer) ; le proxy remplace la valeur factice ci-dessous. Sans ce secret, la porte répond 401.
# Un travail long se lance en fond (nohup … > fichier 2>&1 &) et se relit ensuite : une réponse ne dure pas plus que le délai.
# ⛔ Jamais de secret en clair dans une commande : la porte écrit le début de chaque commande dans son journal.
set -uo pipefail
HOTE="${ATELIER_HOTE:-atelier.teamop.fr}"; CMD="${1:-}"; DELAI="${2:-120}"
[ -n "$CMD" ] || { echo "usage : bash scripts/atelier/appel.sh '<commande>' [délai]"; exit 2; }
# Commande et réponse passent par des FICHIERS, jamais en argument : au-delà de 128 Ko, un argument est refusé par le système.
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
printf '%s' "$CMD" | DELAI="$DELAI" node -e 'let t="";process.stdin.on("data",d=>t+=d).on("end",()=>process.stdout.write(JSON.stringify({cmd:t,delai:Number(process.env.DELAI)})))' > "$T/corps"
HTTP="$(curl -sS --max-time "$((DELAI + 20))" -X POST -H 'Content-Type: application/json' -H 'Authorization: Bearer cle-posee-par-le-proxy-0000000000' --data-binary "@$T/corps" -o "$T/rep" -w '%{http_code}' "https://$HOTE/porte/exec")" || { echo "✗ la porte ne répond pas"; exit 3; }
if [ "$HTTP" != 200 ]; then echo "✗ la porte a répondu $HTTP : $(head -c 300 "$T/rep")"; exit 4; fi
node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(r.sortie);if(r.coupe)console.error("[sortie coupée : seule la fin est rendue]");if(r.expire)console.error("[commande arrêtée au délai]");process.exit(typeof r.code!=="number"||r.code<0?137:Math.min(255,r.code))' "$T/rep"
