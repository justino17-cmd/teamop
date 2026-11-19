#!/bin/bash
# AGENTS RETIRÉS (19 novembre 2026). Il n'y a plus de clé Claude « agents » : le serveur n'a qu'UNE clé Anthropic
# (anthropic.cleApi, set-claude.sh : Devis IA, assistant devis, traduction, Expliquer/Proposer de la Tour).
# Ce script ne POSE plus rien : il propose de SUPPRIMER agents.cleApi de config.json si elle y traîne encore.
# Rien n'est affiché de la clé (seulement sa présence). Écriture atomique, chmod 600. Redémarrer teamop-api ensuite.
#
# Usage : ssh -t root@IP "cd /opt/teamop/repo && git pull -q && bash server/set-agents.sh"
set -u
CONF="${TEAMOP_CONFIG:-/opt/teamop/config.json}"
echo ""
echo "=== Agents IA : RETIRÉS le 19 novembre 2026 ==="
echo "Le serveur n'appelle plus Anthropic pour les agents (config.agents.retires vaut true par défaut)."
python3 - "$CONF" <<'PYEOF'
import json, sys, os, tempfile
chemin = sys.argv[1]
try:
    c = json.load(open(chemin))
except Exception:
    print("❌ Configuration illisible : rien n'est touché."); sys.exit(1)
a = c.get('agents') if isinstance(c.get('agents'), dict) else {}
if not a.get('cleApi'):
    print("Aucune clé « agents » dans la configuration : rien à supprimer."); sys.exit(0)
print("Une clé « agents.cleApi » est encore dans la configuration (non affichée).")
try:
    rep = input("La SUPPRIMER de config.json ? [o/N] ").strip().lower()
except EOFError:
    rep = ''
if rep not in ('o', 'oui', 'y', 'yes'):
    print("Rien n'a été changé."); sys.exit(0)
del a['cleApi']
c['agents'] = a
rep_dir = os.path.dirname(os.path.abspath(chemin))
fd, tmp = tempfile.mkstemp(dir=rep_dir, prefix='.config-')
with os.fdopen(fd, 'w') as f:
    json.dump(c, f, indent=2); f.write('\n')
os.chmod(tmp, 0o600)
os.replace(tmp, chemin)
print("✅ agents.cleApi supprimée. Redémarrer le service : systemctl restart teamop-api")
print("   (pense à la révoquer aussi dans la Console Anthropic)")
PYEOF
