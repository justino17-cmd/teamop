#!/bin/bash
# Règle l'adresse qui reçoit les e-mails de SÉCURITÉ de la Tour : le code d'une suppression, l'avis
# qui suit chaque suppression, le code des mots de passe provisoires refaits en lot.
#
# Elle doit être lue par TOI SEUL : pas une boîte que la Tour relève (la boîte support, une boîte de
# la Messagerie). Sinon une session de la Tour volée y lirait le code qu'on lui demande — et, au-delà
# de trois entreprises supprimées en 24 heures, le serveur refuse d'envoyer un code inutile : la
# suppression attend le lendemain.
#
# Rien de secret n'est affiché : l'adresse actuelle apparaît masquée (c***@exemple.fr).
# Usage : ssh -t root@api.teamop.fr "cd /opt/teamop/repo && git pull -q && bash server/set-securite.sh"
set -e
CONFIG=/opt/teamop/config.json
DATA=/opt/teamop/data

echo ""
echo "=== E-mails de sécurité de la Tour (code et avis des suppressions) ==="
python3 - "$CONFIG" "$DATA" <<'PYEOF'
import json, os, sys
conf, data = sys.argv[1], sys.argv[2]
c = json.load(open(conf))
def nue(s):
    s = str(s or '').strip()
    if s.endswith('>') and '<' in s:
        s = s[s.rindex('<') + 1:-1]
    return s.strip().lower()
def masque(a):
    i = a.find('@')
    return (a[0] + '***@' + a[i + 1:]) if i > 0 else '(aucune)'
smtp = c.get('smtp') or {}
d = nue(c.get('securiteEmail') or c.get('notifDemandes') or smtp.get('from') or smtp.get('user'))
lues = set()
try:
    lues.add(nue(json.load(open(os.path.join(data, 'support-box.json'))).get('email')))
except Exception:
    pass
try:
    for b in json.load(open(os.path.join(data, 'mail-boites.json'))):
        lues.add(nue(b.get('email')))
except Exception:
    pass
print('Adresse actuelle            :', masque(d) if d else '(aucune — rien ne se supprime)')
print('Réglée à part (securiteEmail):', 'oui' if c.get('securiteEmail') else 'non')
print('La Tour relève cette boîte  :', 'OUI — le code y serait lisible depuis la Tour' if d and d in lues else 'non')
PYEOF
echo ""
read -p "Nouvelle adresse, lue par toi seul (Entrée = ne rien changer) : " EMAIL

if [ -z "$EMAIL" ]; then
  echo "Rien n'a été changé."
  exit 0
fi

python3 - "$CONFIG" "$DATA" "$EMAIL" <<'PYEOF'
import json, os, re, sys
conf, data, email = sys.argv[1], sys.argv[2], sys.argv[3].strip()
if not re.match(r'^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$', email):
    print("❌ Ce n'est pas une adresse e-mail — rien n'a été changé.")
    sys.exit(1)
lues = set()
try:
    lues.add(str(json.load(open(os.path.join(data, 'support-box.json'))).get('email') or '').strip().lower())
except Exception:
    pass
try:
    for b in json.load(open(os.path.join(data, 'mail-boites.json'))):
        lues.add(str(b.get('email') or '').strip().lower())
except Exception:
    pass
if email.lower() in lues:
    print("❌ La Tour relève déjà cette boîte : le code y serait lisible depuis la Tour. Choisis une adresse que toi seul lis — rien n'a été changé.")
    sys.exit(1)
with open(conf) as f:
    c = json.load(f)
c['securiteEmail'] = email
tmp = conf + '.tmp'
with open(tmp, 'w') as f:
    json.dump(c, f, indent=2)
os.chmod(tmp, 0o600)
os.replace(tmp, conf)
i = email.find('@')
print('securiteEmail réglée :', email[0] + '***@' + email[i + 1:])
PYEOF

systemctl restart teamop-api
sleep 2
if curl -s http://127.0.0.1:8080/health | grep -q '"ok":true'; then
  echo "✅ Serveur redémarré — la ligne ci-dessous dit ce que le serveur en pense (aucune adresse n'y figure) :"
  journalctl -u teamop-api --since "-1min" --no-pager | grep -m1 "suppressions de la Tour" || echo "(ligne pas encore écrite — relance : journalctl -u teamop-api | grep 'suppressions de la Tour' | tail -1)"
else
  echo "❌ Le serveur ne répond pas — montre cette sortie à Claude"
fi
