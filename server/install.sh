#!/bin/bash
# ══════════════════════════════════════════════════════════════
#  Installation du serveur TeamOP (Ubuntu 24.04)
#  Usage : curl -fsSL https://teamop.fr/server/install.sh | bash
#  Installe : Node.js 22, l'API TeamOP (push + e-mails), Caddy (HTTPS auto)
# ══════════════════════════════════════════════════════════════
set -e
export DEBIAN_FRONTEND=noninteractive

DOMAIN="${TEAMOP_DOMAIN:-api.teamop.fr}"
REPO="https://github.com/justino17-cmd/teamop.git"

echo "── [1/6] Mises à jour système…"
apt-get update -qq && apt-get upgrade -y -qq

echo "── [2/6] Installation de Node.js 22…"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi
apt-get install -y -qq git ca-certificates

echo "── [3/6] Installation de Caddy (HTTPS automatique)…"
if ! command -v caddy >/dev/null; then
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy
fi

echo "── [4/6] Téléchargement de l'API TeamOP…"
mkdir -p /opt/teamop/data
if [ -d /opt/teamop/repo/.git ]; then
  git -C /opt/teamop/repo pull -q
else
  git clone -q --depth 1 "$REPO" /opt/teamop/repo
fi
cd /opt/teamop/repo/server
npm install --omit=dev --silent

echo "── [5/6] Configuration (clés générées une seule fois)…"
if [ ! -f /opt/teamop/config.json ]; then
  VAPID=$(node -e "const w=require('web-push');const k=w.generateVAPIDKeys();console.log(k.publicKey+' '+k.privateKey)")
  PUB=$(echo "$VAPID" | cut -d' ' -f1)
  PRIV=$(echo "$VAPID" | cut -d' ' -f2)
  KEY=$(openssl rand -hex 24)
  # Code d'accès de l'assistant devis : généré ici, jamais écrit dans le dépôt.
  # C'est ce code que l'équipe saisit une fois par appareil dans OP GESTION.
  SECRET_DEVIS=$(openssl rand -hex 8)
  # Clé de chiffrement des sauvegardes hors site : générée une seule fois, ici, et JAMAIS
  # dans le dépôt. Le coffre lui-même (endpoint, bucket, clés d'accès) se branche ensuite
  # avec `node server/configurer-sauvegarde.js`, qui l'éprouve avant d'écrire quoi que ce soit.
  # Tant que le coffre est vide, le module se monte INERTE : rien ne part nulle part.
  SAUV=$(openssl rand -hex 32)
  cat > /opt/teamop/config.json <<EOF
{
  "vapidPublicKey": "$PUB",
  "vapidPrivateKey": "$PRIV",
  "apiKey": "$KEY",
  "contactEmail": "contact@teamop.fr",
  "origins": ["https://teamop.fr", "https://www.teamop.fr"],
  "mailPreuveExigee": true,
  "piecesMaxOctets": 5368709120,
  "piecesMaxTotal": 64424509440,
  "piecesPlancherDisque": 10737418240,
  "piecesMaxNombre": 40000,
  "smtp": {},
  "github": {
    "depot": "justino17-cmd/teamop",
    "token": "",
    "expire": ""
  },
  "sauvegarde": {
    "cle": "$SAUV",
    "endpoint": "",
    "bucket": "",
    "accessKey": "",
    "secretKey": "",
    "region": "eu-central-4",
    "prefixe": "teamop/",
    "garder": 30,
    "heureUTC": 3
  },
  "anthropic": {
    "cleApi": "",
    "secretDevis": "$SECRET_DEVIS",
    "quotaJour": 100
  }
}
EOF
  chmod 600 /opt/teamop/config.json
fi

cat > /etc/systemd/system/teamop-api.service <<'EOF'
[Unit]
Description=TeamOP API (push + e-mails)
After=network.target

[Service]
WorkingDirectory=/opt/teamop/repo/server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=3
User=root
Environment=PORT=8080
# ⛔ LA CLÉ MAÎTRE DU SOCLE VIT HORS DE /opt, ET C'EST TOUT L'INTÉRÊT. Un instantané IONOS est
# une image de VOLUME, un disque volé aussi : ranger la clé dans l'arborescence qu'elle protège
# ne protège que d'un disque éteint qu'on aurait démonté à la main. systemd la charge depuis
# /etc/teamop/kek (chmod 600) et la dépose dans un répertoire éphémère, effacé à l'arrêt du
# service — le serveur la lit par $CREDENTIALS_DIRECTORY et ne la voit nulle part ailleurs.
LoadCredential=teamop_kek:/etc/teamop/kek

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    reverse_proxy 127.0.0.1:8080
}
EOF

# ══ LA CLÉ MAÎTRE DU SOCLE ═══════════════════════════════════════════════════════════════════
# ⛔ SANS ELLE, CE N'EST PAS LE SOCLE QUI CASSE EN PREMIER, CE SONT LES QUATRE PORTES DE LA TOUR.
# Le jour où `socle.actif` passe à true, `socleCouper()` appelle une fonction qui exige la clé :
# suspendre, fermer un client, supprimer une entreprise et « repartir à neuf » remontent alors
# un échec — c'est-à-dire que fermer une entreprise devient impossible. D'où : on la pose À
# L'INSTALLATION, avant que quiconque puisse allumer le drapeau.
# ⛔ ON NE LA RÉGÉNÈRE JAMAIS SI ELLE EXISTE. Une clé neuve sur des bases existantes rendrait
# les données de toutes les entreprises définitivement illisibles — c'est exactement ce que le
# serveur refuse de faire au démarrage, et une réinstallation ne doit pas pouvoir contourner ce
# refus en silence.
echo "── Clé maître du socle…"
mkdir -p /etc/teamop
chmod 700 /etc/teamop
if [ -s /etc/teamop/kek ]; then
  echo "  clé déjà présente — ON N'Y TOUCHE PAS (la régénérer rendrait les données illisibles)"
else
  node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" > /etc/teamop/kek
  chmod 600 /etc/teamop/kek
  echo ""
  echo "  ⛔⛔ CLÉ MAÎTRE GÉNÉRÉE — À METTRE EN SÉQUESTRE MAINTENANT, PAS PLUS TARD :"
  echo ""
  echo "      $(cat /etc/teamop/kek)"
  echo ""
  echo "  Sans elle, un VPS perdu = des sauvegardes définitivement illisibles. Le nuage ne"
  echo "  stocke que du chiffré. La ranger dans DEUX endroits distincts (gestionnaire de mots"
  echo "  de passe + copie scellée hors ligne), puis vérifier qu'on sait la relire."
  echo ""
fi

echo "── [6/6] Démarrage des services…"
systemctl daemon-reload
systemctl enable --now teamop-api
systemctl restart caddy

sleep 2
echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ Serveur TeamOP installé !"
echo "════════════════════════════════════════════════════════"
echo ""
echo "  Test local : $(curl -s http://127.0.0.1:8080/health || echo 'API pas encore prête, attendre 10 s')"
echo ""
echo "  Clé publique push (VAPID) à donner à Claude :"
node -e "console.log('  '+JSON.parse(require('fs').readFileSync('/opt/teamop/config.json')).vapidPublicKey)"
echo ""
echo "  ── Assistant devis ─────────────────────────────────────"
node -e "
const c=JSON.parse(require('fs').readFileSync('/opt/teamop/config.json'));
const a=c.anthropic||{};
if(!a.secretDevis){
  console.log('  Bloc absent de config.json. Ajoute-le (exemple, remplace les valeurs) :');
  console.log('    \"anthropic\": {');
  console.log('      \"cleApi\": \"sk-ant-api03-EXEMPLE-remplace-moi\",');
  console.log('      \"secretDevis\": \"EXEMPLE-code-equipe\",');
  console.log('      \"quotaJour\": 100');
  console.log('    }');
} else {
  console.log('  Code d\\'accès équipe (à saisir une fois par appareil) : '+a.secretDevis);
  console.log(a.cleApi ? '  Clé Anthropic : configurée.'
    : '  Clé Anthropic MANQUANTE — colle-la dans anthropic.cleApi de /opt/teamop/config.json,');
  if(!a.cleApi) console.log('  puis : systemctl restart teamop-api');
}
" 2>/dev/null || echo "  (config.json illisible)"
echo ""
echo "  ── Sauvegarde hors site ────────────────────────────────────────"
node -e "
const c=JSON.parse(require('fs').readFileSync('/opt/teamop/config.json'));
const s=c.sauvegarde||{};
if(!s.bucket){
  console.log('  ⛔ PAS ENCORE BRANCHÉE — les données de ce serveur ne sont copiées nulle part.');
  console.log('     node /opt/teamop/repo/server/configurer-sauvegarde.js');
  console.log('     (il demande les 4 valeurs du coffre, les éprouve, puis affiche UNE FOIS');
  console.log('      la clé de chiffrement à ranger hors de ce serveur)');
} else {
  console.log('  Coffre configuré. Éprouver la restauration :');
  console.log('     node /opt/teamop/repo/server/restaurer.js essai');
}
" 2>/dev/null || echo "  (config.json illisible)"
echo ""
echo "  ⚠️  Vérifie que le DNS 'api.teamop.fr' pointe vers CE serveur,"
echo "      puis teste :  https://$DOMAIN/health"
echo "════════════════════════════════════════════════════════"
