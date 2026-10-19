#!/bin/bash
# Pose la clé Claude DÉDIÉE aux agents IA de l'équipe (server/agents.js) : config.json → agents.cleApi.
#
# C'est une clé À PART de celle du Devis IA (set-claude.sh → anthropic.cleApi), créée dans l'espace de travail
# « Agents Team OP » de la Console (limite de dépense posée là-bas). Deux clés, parce que : la limite des agents ne
# doit pas couper les devis des clients, et si l'une fuit on ne remplace que celle-là. Le script REFUSE donc une clé
# identique à celle du Devis IA.
#
# ⛔ La clé se saisit EN SAISIE MASQUÉE et ne s'affiche JAMAIS : ni à l'écran, ni dans la ligne de commande d'un
# processus (elle passe par l'entrée standard de Python, pas par un argument que `ps` montrerait). On ne dit que sa
# longueur. On la VÉRIFIE auprès d'Anthropic avant d'écrire : une clé qu'on n'a pas essayée est une clé dont on ne
# sait rien.
#
# Rien ne LIT encore agents.cleApi (le socle `server/agents.js` ne fait agir personne) : aucun redémarrage, donc aucun
# risque pour le serveur en service. Le premier agent qui s'en servira le dira.
#
# Usage : ssh -t root@IP "cd /opt/teamop/repo && git pull -q && bash server/set-agents.sh"
set -u
CONF="${TEAMOP_CONFIG:-/opt/teamop/config.json}"

echo ""
echo "=== Clé Claude des AGENTS (espace de travail « Agents Team OP ») ==="
python3 - "$CONF" <<'PYEOF'
import json, sys
try:
    c = json.load(open(sys.argv[1]))
except Exception:
    print("❌ Configuration illisible : rien n'est touché."); sys.exit(1)
a = c.get('agents') if isinstance(c.get('agents'), dict) else {}
k = a.get('cleApi') or ''
print('Clé actuelle :', ('posée (' + str(len(k)) + ' caractères)') if k else '(aucune)')
PYEOF
[ $? -eq 0 ] || exit 1
echo ""
read -rsp "Clé des agents (rien ne s'affiche, Entrée = ne rien changer) : " CLE
echo ""
if [ -z "$CLE" ]; then echo "Rien n'a été changé."; exit 0; fi
if ! printf '%s' "$CLE" | grep -Eq '^sk-ant-[A-Za-z0-9_-]{20,}$'; then
  echo "❌ Cela ne ressemble pas à une clé Anthropic (elle commence par sk-ant-, sans espace). Rien n'a été écrit."; exit 1
fi

# Elle doit différer de la clé du Devis IA (voir plus haut). Comparée sans jamais être affichée.
if printf '%s' "$CLE" | python3 -c "
import json, sys
cle = sys.stdin.read()
try:
    c = json.load(open('$CONF'))
except Exception:
    sys.exit(0)
k = ((c.get('anthropic') or {}).get('cleApi')) or ''
sys.exit(3 if k and k == cle else 0)
"; then :; else
  echo "❌ C'est la clé du Devis IA. Les agents ont leur propre clé (espace « Agents Team OP »). Rien n'a été écrit."; exit 1
fi

echo "Vérification auprès d'Anthropic…"
CODE=$(printf 'header = "x-api-key: %s"\n' "$CLE" | curl -s -o /dev/null -w '%{http_code}' -m 20 -K - \
  https://api.anthropic.com/v1/models -H "anthropic-version: 2023-06-01")
case "$CODE" in
  200) echo "✅ Clé acceptée par Anthropic." ;;
  401|403) echo "❌ Anthropic refuse cette clé (HTTP $CODE) : expirée, révoquée ou recopiée incomplète. Rien n'a été écrit."; exit 1 ;;
  000) echo "❌ Anthropic injoignable depuis ce serveur. Rien n'a été écrit."; exit 1 ;;
  *) echo "❌ Réponse inattendue d'Anthropic (HTTP $CODE). Rien n'a été écrit."; exit 1 ;;
esac

# Écriture : temporaire CRÉÉ en 600 puis renommage — la configuration porte tous les secrets du serveur, jamais
# un instant lisible par tous, jamais à moitié écrite. La clé arrive par l'entrée standard.
ECRIRE=$(cat <<'PYEOF'
import json, os, sys
chemin = sys.argv[1]
cle = sys.stdin.read().strip()
if not cle:
    print("❌ Clé vide à l'écriture : rien n'est touché."); sys.exit(2)
c = json.load(open(chemin))
a = c.get('agents') if isinstance(c.get('agents'), dict) else {}
a['cleApi'] = cle
c['agents'] = a
tmp = chemin + '.tmp'
try:
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as f:
        json.dump(c, f, indent=2)
    os.chmod(tmp, os.stat(chemin).st_mode & 0o777)
    os.replace(tmp, chemin)
finally:
    if os.path.exists(tmp):
        os.remove(tmp)
print('agents.cleApi =', len(cle), 'caractères')
PYEOF
)
# `python3 -c` et non `python3 - <<EOF` : un heredoc remplacerait l'entrée standard, par laquelle arrive la clé.
printf '%s' "$CLE" | python3 -c "$ECRIRE" "$CONF"
[ $? -eq 0 ] || { echo "❌ Écriture impossible : montre cette sortie à Claude."; exit 1; }
echo "✅ Clé des agents posée. Les agents restent À L'ARRÊT : rien ne tourne tant que tu ne les mets pas en brouillon."
