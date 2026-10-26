#!/bin/bash
# Pose (ou retire) l'EMPREINTE SHA-256 du jeton du pont de Pauline dans /opt/teamop/config.json.
# L'empreinte n'est PAS un secret : c'est ce que « python3 pauline-releve.py --fabriquer-jeton » imprime sur le Mac. Le JETON, lui, n'arrive jamais ici.
# Usage : ssh -t root@api.teamop.fr "cd /opt/teamop/repo && git pull -q && bash server/set-pauline.sh"
set -e
CONFIG="${TEAMOP_CONFIG:-/opt/teamop/config.json}"   # TEAMOP_CONFIG : pour le banc d'essai seulement

echo ""
echo "=== Pont de Pauline (relevé envoyé depuis le Mac) ==="
CUR=$(python3 -c "import json;print('posée' if (json.load(open('$CONFIG')).get('pauline') or {}).get('jetonSha256') else 'non posée — le pont est fermé (503)')" 2>/dev/null || echo "?")
echo "Empreinte actuelle : $CUR"
echo ""
read -r -p "Empreinte SHA-256 du jeton (64 caractères ; « retirer » ferme le pont ; Entrée = ne rien changer) : " EMP

if [ -z "$EMP" ]; then
  echo "Rien n'a été changé."
  exit 0
fi

if [ "$EMP" != "retirer" ]; then
  EMP=$(echo "$EMP" | tr 'A-F' 'a-f' | tr -d '[:space:]')
  if ! echo "$EMP" | grep -Eq '^[0-9a-f]{64}$'; then
    echo "❌ Ce n'est pas une empreinte SHA-256 (64 caractères hexadécimaux). Rien n'a été changé."
    exit 1
  fi
fi

python3 - "$EMP" "$CONFIG" <<'PYEOF'
import json, os, sys
emp = sys.argv[1]
chemin = sys.argv[2]
with open(chemin) as f:
    c = json.load(f)
if emp == 'retirer':
    c.pop('pauline', None)
    print('pont fermé : pauline retiré de la configuration')
else:
    p = c.get('pauline') if isinstance(c.get('pauline'), dict) else {}
    p['jetonSha256'] = emp
    c['pauline'] = p
    print('jetonSha256 posée (empreinte, pas le jeton)')
# écriture atomique, mêmes droits que l'original (600) : un arrêt en cours d'écriture ne doit pas tronquer la configuration du serveur
tmp = chemin + '.tmp'
fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, 'w') as f:
    json.dump(c, f, indent=2)
os.replace(tmp, chemin)
os.chmod(chemin, 0o600)
PYEOF

systemctl restart teamop-api
sleep 2
if curl -s http://127.0.0.1:8080/health | grep -q '"ok":true'; then
  echo "✅ Serveur redémarré."
else
  echo "❌ Le serveur ne répond pas — montre cette sortie à Claude"
fi
