#!/bin/bash
# Configuration Stripe du serveur TeamOP (paiement avec quantité automatique + codes promo)
# Usage : ssh -t root@IP "cd /opt/teamop/repo && git pull -q && bash server/set-stripe.sh"
set -e

echo "La clé secrète se trouve sur dashboard.stripe.com/apikeys (« Clé secrète », commence par sk_live_)."
read -s -p "Colle ta clé secrète Stripe : " K
echo ""
case "$K" in sk_live_*|rk_live_*) ;; *) echo "❌ Ce n'est pas une clé secrète (elle doit commencer par sk_live_). Rien n'a été modifié."; exit 1;; esac

# ⛔ ON COMPLÈTE LE BLOC « stripe », ON NE LE REMPLACE PAS (17 octobre 2026). L'ancienne version écrivait
# `c['stripe'] = {'secretKey': …}` : changer la clé effaçait en silence `apiVersion` (la version d'API figée,
# `server/set-stripe-version.sh`) — et les appels se remettaient à suivre la version du tableau de bord.
# La clé passe par l'ENVIRONNEMENT du seul processus python, plus par sa ligne de commande (lisible par `ps`).
TEAMOP_CLE_STRIPE="$K" python3 - "${TEAMOP_CONFIG:-/opt/teamop/config.json}" <<'PYEOF'
import json, os, sys
chemin = sys.argv[1]
c = json.load(open(chemin))
s = c.get('stripe') if isinstance(c.get('stripe'), dict) else {}
s['secretKey'] = os.environ['TEAMOP_CLE_STRIPE']
c['stripe'] = s
json.dump(c, open(chemin, 'w'), indent=2)
print('Configuration enregistrée.')
PYEOF

systemctl restart teamop-api
sleep 2
H=$(curl -s http://127.0.0.1:8080/health)
echo ""
echo "État du serveur : $H"
if echo "$H" | grep -q '"stripe":true'; then
  echo "✅ Le paiement automatique Stripe est ACTIF."
else
  echo "❌ Stripe n'est pas actif — relance ce script."
fi
