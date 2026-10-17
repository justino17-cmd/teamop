#!/bin/bash
# Fige la version de l'API Stripe utilisée par le serveur TeamOP (en-tête Stripe-Version, `stripeEntetes` dans index.js).
# Usage : ssh -t root@IP "cd /opt/teamop/repo && git pull -q && bash server/set-stripe-version.sh"
#
# ⚠️ On recopie la version DU COMPTE, telle que le tableau de bord Stripe l'affiche (Développeurs → « Version de l'API »),
# jamais une autre : en figer une différente changerait la forme des réponses que lit le serveur.
# Après l'écriture, le script vérifie que Stripe ACCEPTE la version (une route qui l'envoie doit répondre 200). Sinon il
# remet la configuration d'avant, redémarre, et le dit — une version refusée couperait tous les appels à Stripe.
set -u
CONF="${TEAMOP_CONFIG:-/opt/teamop/config.json}"

read -r -p "Version de l'API Stripe du compte (exemple : 2026-09-30.endive) : " V
if ! printf '%s' "$V" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}(\.[a-z]+)?$'; then
  echo "❌ Forme inattendue (attendu : 2026-09-30 ou 2026-09-30.nom). Rien n'a été modifié."
  exit 1
fi

cp -p "$CONF" "$CONF.avant-version"   # la configuration d'avant, droits compris (chmod 600)

python3 - "$CONF" "$V" <<'PYEOF'
import json, os, sys
chemin, v = sys.argv[1], sys.argv[2]
c = json.load(open(chemin))
s = c.get('stripe') if isinstance(c.get('stripe'), dict) else {}
if not s.get('secretKey'):
    print("❌ Aucune clé Stripe dans la configuration : lancer d'abord server/set-stripe.sh. Rien n'a été modifié.")
    sys.exit(2)
s['apiVersion'] = v
c['stripe'] = s
# temporaire puis renommage, AUX DROITS de l'original : la configuration porte des secrets (chmod 600)
tmp = chemin + '.tmp'
with open(tmp, 'w') as f:
    json.dump(c, f, indent=2)
os.chmod(tmp, os.stat(chemin).st_mode & 0o777)
os.replace(tmp, chemin)
print('Version écrite : ' + v)
PYEOF
[ $? -eq 0 ] || exit 1

systemctl restart teamop-api
sleep 2
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/api/stripe/prices)
if [ "$code" = "200" ]; then
  echo "✅ Stripe accepte la version $V : elle est figée."
else
  echo "❌ Stripe refuse la version $V (réponse $code). Retour à la configuration d'avant."
  cp -p "$CONF.avant-version" "$CONF"
  systemctl restart teamop-api
  exit 1
fi
