#!/bin/bash
# Fige la version de l'API Stripe utilisée par le serveur TeamOP (en-tête Stripe-Version, `stripeEntetes` dans index.js).
# Usage : ssh -t root@IP "cd /opt/teamop/repo && git pull -q && bash server/set-stripe-version.sh"
#
# ⚠️ On recopie la version DU COMPTE, telle que le tableau de bord Stripe l'affiche (Développeurs → « Version de l'API »),
# jamais une autre : en figer une différente changerait la forme des réponses que lit le serveur.
# Le script vérifie que Stripe répond AVANT (sinon rien n'est touché : la panne n'est pas la version), puis APRÈS ; si Stripe
# ne répond plus avec la version, il remet la configuration d'avant — une version refusée couperait tous les appels à Stripe.
# Relu par `gardien` le 17 octobre 2026 : attente du redémarrage (pas un délai fixe), écritures par temporaire en 600,
# aucune copie des secrets laissée sur le disque.
set -u
CONF="${TEAMOP_CONFIG:-/opt/teamop/config.json}"
ICI="$(cd "$(dirname "$0")" && pwd)"
SAUVE="$CONF.avant-version"

attendre_serveur() {   # le serveur répond-il ? jusqu'à 30 s après un redémarrage
  for _ in $(seq 1 30); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/health)" = "200" ] && return 0
    sleep 1
  done
  return 1
}
tarifs() { curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/api/stripe/prices; }
restaurer() {   # copie vers un temporaire puis renommage : jamais de config.json à moitié écrit
  cp -p "$SAUVE" "$CONF.tmp" && mv -f "$CONF.tmp" "$CONF"
  systemctl restart teamop-api
  if attendre_serveur; then echo "   Configuration d'avant remise, le serveur répond."
  else echo "   ⛔ Configuration d'avant remise, mais le serveur ne répond pas : systemctl status teamop-api"; fi
  rm -f "$SAUVE"
}

if ! grep -q 'function stripeEntetes(' "$ICI/index.js"; then
  echo "❌ Le serveur de ce dossier ne sait pas encore figer la version (git pull ?). Rien n'a été modifié."; exit 1
fi
read -r -p "Version de l'API Stripe du compte (exemple : 2026-09-30.endive) : " V
if ! printf '%s' "$V" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}(\.[a-z]+)?$'; then
  echo "❌ Forme inattendue (attendu : 2026-09-30 ou 2026-09-30.nom). Rien n'a été modifié."; exit 1
fi
avant=$(tarifs)
if [ "$avant" != "200" ]; then
  echo "❌ Stripe ne répond pas correctement AVANT tout changement (réponse $avant) : clé absente ou révoquée, Stripe en panne ?"
  echo "   Ce n'est pas la version. Rien n'a été modifié."; exit 1
fi

cp -p "$CONF" "$SAUVE"   # la configuration d'avant, droits compris (600) — supprimée à la fin, quoi qu'il arrive
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
# temporaire CRÉÉ en 600 (la configuration porte des secrets : jamais lisible par tous, même un instant), puis renommage
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
print('Version écrite : ' + v)
PYEOF
if [ $? -ne 0 ]; then rm -f "$SAUVE"; exit 1; fi

systemctl restart teamop-api
if ! attendre_serveur; then
  echo "❌ Le serveur ne répond plus après le redémarrage. Retour à la configuration d'avant."
  restaurer; exit 1
fi
apres=$(tarifs)
if [ "$apres" = "200" ]; then
  rm -f "$SAUVE"
  echo "✅ Stripe accepte la version $V : elle est figée."
else
  echo "❌ Stripe répondait avant, et plus avec la version $V (réponse $apres) : elle est refusée. Retour à la configuration d'avant."
  restaurer; exit 1
fi
