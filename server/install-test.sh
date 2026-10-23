#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════════════════════
#  Installation de l'ESPACE DE TEST (test.teamop.fr) sur le VPS — en root, UNE fois, rejouable.
#
#  Usage :   bash /root/install-test.sh
#            bash /root/install-test.sh stripe        (redemander la clé Stripe de test, puis recréer/retrouver les dix tarifs de test)
#            bash /root/install-test.sh motdepasse    (changer le mot de passe des pages)
#  Mode d'emploi, geste par geste : design/ESPACE-DE-TEST.md.
#
#  Décision de Justin (23 octobre 2026) : « toute modification, site, application, la Tour, je veux
#  des espaces de test, et après on pousse ». Un MÊME code serveur (server/index.js) tourne à côté de
#  la production, sur un autre port, avec sa configuration, ses données, sa clé maître et son
#  utilisateur à lui. Les courriels y sont captés (rien ne part), Stripe y est en mode TEST.
#
#  ⛔ CE SCRIPT NE TOUCHE JAMAIS À LA PRODUCTION. Il n'écrit rien dans /opt/teamop/data, ni dans
#  /opt/teamop/config.json, ni dans /opt/teamop/repo, ni dans /etc/teamop/kek ; il ne relance ni
#  n'arrête `teamop-api` ; il ne touche pas aux blocs nginx d'api.teamop.fr et de teamop.fr. La seule
#  chose qu'il LIT de la production est la clé des agents (agents.cleApi), copiée par jq sans passer
#  par l'écran ni par une ligne de commande. `tests/test-2989.js` lit ce fichier ET le joue dans un bac
#  à sable, et exige que la production sorte du bac à sable octet pour octet identique.
#
#  ⛔ IL N'AFFICHE JAMAIS UN SECRET (règle de CLAUDE.md : Justin recolle toutes ses sorties dans la
#  conversation). La clé Stripe de test et le mot de passe des pages se saisissent
#  EN MASQUÉ ; la clé maître de test, la clé des routes d'essai et la paire VAPID naissent ici et ne
#  sont écrites que dans leur fichier (0600 / 0640). Aucun secret ne passe par une ligne de commande
#  (visible par `ps`) : jq les reçoit par l'environnement de son seul processus.
#
#  ⛔ IL EST REJOUABLE. Deux passages donnent le même état : la configuration existante est
#  COMPLÉTÉE, jamais remplacée ; la clé maître de test n'est jamais régénérée si des données de test
#  existent (même règle que server/poser-cle.js) ; un fichier nginx identique n'est pas rechargé.
#
#  Variables (toutes facultatives) :
#    TEAMOP_TEST_BRANCHE   branche à mettre en essai la première fois (défaut : main)
#    TEAMOP_TEST_DOMAINE   défaut test.teamop.fr
#    TEAMOP_TEST_PORT      port local du serveur de test (défaut 8095 — ⚠️ PAS 8090 : voir plus bas)
#    TEAMOP_TEST_DEPOT     dépôt à mettre en miroir (défaut : GitHub)
#    TEAMOP_TEST_RACINE    préfixe de tous les chemins — UNIQUEMENT pour les bancs (bac à sable)
#    TEAMOP_TEST_ENTREE    d'où lire les saisies — UNIQUEMENT pour les bancs (sinon : le terminal)
# ══════════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

DOMAINE="${TEAMOP_TEST_DOMAINE:-test.teamop.fr}"
# ⚠️ 8095 et non 8090 : 8090 est le port que `install-msg.sh prod` réserve à OP MESSAGES (et
# `install-courrier.sh` le refuse pour la même raison). Le prendre ici ferait échouer, le jour de
# « publie OP MESSAGES », l'installation de la production — sur « adresse déjà utilisée ».
PORT="${TEAMOP_TEST_PORT:-8095}"
BRANCHE="${TEAMOP_TEST_BRANCHE:-main}"
DEPOT="${TEAMOP_TEST_DEPOT:-https://github.com/justino17-cmd/teamop.git}"
[[ "$DOMAINE" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]] || { echo "✗ domaine illisible"; exit 2; }
[[ "$PORT" =~ ^[0-9]{4,5}$ ]]                          || { echo "✗ port illisible"; exit 2; }
case "$PORT" in 8080|8090|8091|8092|8192|8193|7880|7881|3478|5349) echo "✗ le port $PORT appartient à un autre service de ce VPS"; exit 2 ;; esac
[[ "$BRANCHE" =~ ^[A-Za-z0-9._/-]{1,100}$ ]]           || { echo "✗ nom de branche illisible"; exit 2; }

REDEMANDER=" "
for mot in "$@"; do
  case "$mot" in
    stripe|motdepasse) REDEMANDER="$REDEMANDER$mot " ;;
    *) echo "usage : bash install-test.sh [stripe] [motdepasse]"; exit 2 ;;
  esac
done

# ── Les chemins. Tous sous $R, qui est VIDE sur le VPS : seuls les bancs le posent. ───────────
R="${TEAMOP_TEST_RACINE:-}"
OPT="$R/opt/teamop/test"
MIROIR="$OPT/repo"
DATA="$OPT/data"
CONFIG="$OPT/config.json"
MONITOR="$OPT/monitor.json"
LIEN_PAGES="$OPT/pages"
PAGES_D="$OPT/pages.d"
ETC="$R/etc/teamop"
KEK="$ETC/kek-test"
SYSD="$R/etc/systemd/system"
UNITE="teamop-api-test"
FICHIER_UNITE="$SYSD/$UNITE.service"
NGX="$R/etc/nginx"
HTPASSWD="$NGX/teamop-test.htpasswd"
LE="$R/etc/letsencrypt"
ACME_REEL="/var/www/teamop-test-acme"
ACME="$R$ACME_REEL"
# La seule lecture de la production : la clé des agents. En lecture seule, jamais réécrite.
PROD_CONFIG="$R/opt/teamop/config.json"
ENTREE="/dev/tty"
[ -z "$R" ] || ENTREE="${TEAMOP_TEST_ENTREE:-/dev/tty}"

if [ -z "$R" ] && [ "$(id -u)" != "0" ]; then echo "✗ à lancer en root"; exit 1; fi

EN_TANT_QUE() { runuser -u teamoptest -- "$@"; }
export GIT_TERMINAL_PROMPT=0
a_demander() { case "$REDEMANDER" in *" $1 "*) return 0 ;; esac; return 1; }
config_a() { [ -f "$CONFIG" ] && jq -e "$1" "$CONFIG" >/dev/null 2>&1; }   # la config existante répond-elle vrai ?

# ══ 1. Ce qu'il faut sur la machine ═══════════════════════════════════════════════════════════
echo "── [1/9] La machine…"
actif() { systemctl is-active --quiet "$1"; }
command -v nginx >/dev/null && actif nginx || {
  echo "  ✗ nginx n'est pas actif sur ce serveur (Caddy ?). L'espace de test se pose avec nginx."
  echo "    Rien n'a été changé."; exit 1; }
command -v node >/dev/null && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] || {
  echo "  ✗ Node 22 ou plus est requis (le serveur utilise des modules récents). Rien n'a été changé."; exit 1; }
MANQUE=""
for c in git curl jq openssl; do command -v "$c" >/dev/null || MANQUE="$MANQUE $c"; done
[ -z "$MANQUE" ] || { echo "  installation de :$MANQUE"; apt-get install -y -qq $MANQUE ca-certificates >/dev/null; }
command -v certbot >/dev/null || { echo "  installation de certbot"; apt-get install -y -qq certbot >/dev/null; }
echo "  nginx actif, Node $(node -v), git, jq, openssl, certbot présents"

# ══ 2. Les saisies — TOUTES d'abord : si l'une manque, on s'arrête avant d'avoir rien changé ══
echo "── [2/9] Ce que je te demande (rien de ce que tu tapes ne s'affiche)…"
ENTREE_OUVERTE=0
ouvrir_entree() {
  [ "$ENTREE_OUVERTE" = "1" ] && return 0
  ( : <"$ENTREE" ) 2>/dev/null || { echo "  ✗ pas de terminal pour te poser les questions : lance ce script dans une session ssh normale."; exit 1; }
  exec 8<"$ENTREE"
  ENTREE_OUVERTE=1
}
lire_masque() {   # $1 = libellé, $2 = « oui » pour une double saisie. Résultat dans REPONSE. N'AFFICHE JAMAIS ce qui est tapé.
  local a="" b=""
  ouvrir_entree
  printf '  %s : ' "$1" >&2
  IFS= read -r -s -u 8 a || true
  printf '\n' >&2
  if [ "${2:-}" = "oui" ] && [ -n "$a" ]; then
    printf '  Encore une fois : ' >&2
    IFS= read -r -s -u 8 b || true
    printf '\n' >&2
    [ "$a" = "$b" ] || { REPONSE=""; return 1; }
  fi
  REPONSE="$a"
}
STRIPE_SK=""; MDP=""
if a_demander stripe || ! config_a '(.stripe.secretKey // "") | test("^(sk|rk)_test_")'; then
  echo "  Clé Stripe de TEST (tableau de bord Stripe, en mode test → Développeurs → Clés API → « Clé secrète »)."
  echo "  Elle commence par sk_test_. Entrée seule = je la poserai plus tard (les paiements de test restent éteints)."
  essai=0
  while [ "$essai" -lt 3 ]; do
    lire_masque "Clé secrète Stripe de test" non || true
    case "$REPONSE" in
      "") echo "  → pas de clé Stripe pour l'instant (relance plus tard : bash install-test.sh stripe)"; break ;;
      sk_live_*|rk_live_*) echo "  ⛔ C'est une clé de PRODUCTION (live). L'espace de test n'accepte QUE le mode test. Rien n'est enregistré."; REPONSE="" ;;
      *) if [[ "$REPONSE" =~ ^(sk|rk)_test_[A-Za-z0-9]{16,}$ ]]; then STRIPE_SK="$REPONSE"; echo "  → clé de test reçue (${REPONSE:0:8}…, ${#REPONSE} caractères)"; break
         else echo "  ✗ Ce n'est pas une clé secrète de test (sk_test_ suivi de lettres et chiffres)."; fi ;;
    esac
    essai=$((essai + 1))
  done
  REPONSE=""
fi
if a_demander motdepasse || [ ! -s "$HTPASSWD" ]; then
  echo "  Mot de passe des PAGES de test (identifiant : essai). Au moins 10 caractères, à ton choix."
  essai=0
  while [ "$essai" -lt 3 ]; do
    if lire_masque "Mot de passe des pages" oui && [ "${#REPONSE}" -ge 10 ]; then MDP="$REPONSE"; break; fi
    echo "  ✗ Les deux saisies diffèrent, ou moins de 10 caractères. Recommence."
    essai=$((essai + 1))
  done
  REPONSE=""
  [ -n "$MDP" ] || { echo "  ✗ Pas de mot de passe valable après 3 essais — rien n'a été installé."; exit 1; }
fi
[ "$ENTREE_OUVERTE" = "0" ] || exec 8<&-
echo "  saisies terminées"

# ══ 3. Un compte à part, des dossiers à part ══════════════════════════════════════════════════
echo "── [3/9] Le compte « teamoptest » et ses dossiers (tout sous /opt/teamop/test)…"
# Un compte SYSTÈME sans connexion : le code d'une branche pas encore relue ne tourne pas en root,
# et ne peut lire ni les données ni la configuration de la production.
id teamoptest >/dev/null 2>&1 \
  || useradd --system --user-group --home-dir /opt/teamop/test --no-create-home --shell /usr/sbin/nologin teamoptest
mkdir -p "$OPT" "$OPT/releases" "$PAGES_D" "$MIROIR" "$DATA"
chmod 755 "$OPT" "$OPT/releases" "$PAGES_D"
chown teamoptest:teamoptest "$MIROIR" "$DATA"
chmod 700 "$DATA"
# ⛔ monitor.json : le serveur le range à côté de SA configuration (server/index.js, MONITOR_PATH =
# dirname(TEAMOP_CONFIG)/monitor.json), donc dans /opt/teamop/test, qui appartient à root. Il porte les
# comptes de la Tour (patron, collaborateur), les incidents et le journal. Sans ce fichier à lui, le service
# (ProtectSystem=strict, écriture bornée à data/) ne pourrait pas le créer : monSave() avale l'erreur, et la
# Tour de test perdrait ses comptes à chaque redémarrage. On le crée VIDE s'il manque, JAMAIS on ne
# l'écrase (un second passage garde ce que le service y a rangé), et l'unité le nomme dans ReadWritePaths.
if [ ! -e "$MONITOR" ]; then ( umask 077; printf '{}\n' > "$MONITOR" ); fi
chown teamoptest:teamoptest "$MONITOR"
chmod 600 "$MONITOR"
echo "  /opt/teamop/test prêt"

# ══ 4. Le miroir du dépôt — LE SIEN ═══════════════════════════════════════════════════════════
echo "── [4/9] Le code (miroir du dépôt, branche « $BRANCHE »)…"
# ⛔ Jamais /opt/teamop/repo : y avancer le code ferait avancer la production sur le disque sans la redémarrer.
if [ ! -d "$MIROIR/.git" ]; then
  EN_TANT_QUE git clone --quiet "$DEPOT" "$MIROIR" || { echo "  ✗ le clone a échoué — le VPS joint-il GitHub ? Rien d'autre n'a été fait."; exit 1; }
fi
EN_TANT_QUE git -c credential.helper= -C "$MIROIR" fetch --prune --quiet origin \
  || { echo "  ✗ git fetch a échoué — le VPS joint-il GitHub ?"; exit 1; }
SHA="$(EN_TANT_QUE git -C "$MIROIR" rev-parse --verify --quiet "refs/remotes/origin/$BRANCHE^{commit}" || true)"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "  ✗ la branche « $BRANCHE » n'existe pas sur GitHub (poussée ?). Relance avec TEAMOP_TEST_BRANCHE=<la bonne>."; exit 1; }
EN_TANT_QUE git -c credential.helper= -C "$MIROIR" checkout --quiet --force --detach "$SHA"
[ -f "$MIROIR/server/deployer-test.sh" ] && [ -f "$MIROIR/server/nginx-teamop-test.conf" ] \
  || { echo "  ✗ la branche « $BRANCHE » ne porte pas l'espace de test (server/deployer-test.sh). Choisis la branche qui le porte (TEAMOP_TEST_BRANCHE)."; exit 1; }
echo "  miroir à jour : ${SHA:0:8}"

# ══ 5. La clé maître de TEST ══════════════════════════════════════════════════════════════════
echo "── [5/9] La clé maître de test (/etc/teamop/kek-test)…"
# ⛔ MÊME RÈGLE QUE server/poser-cle.js : ON NE GÉNÈRE JAMAIS UNE CLÉ NEUVE SUR DES BASES EXISTANTES.
# Une clé neuve sur un socle déjà chiffré rend ses données définitivement illisibles. Ici ce ne sont que
# des données de test — mais le refus protège aussi d'un /etc écrasé, et la sortie est dite en clair.
bases_de_test() { find "$DATA/socle" -maxdepth 2 -name base.db 2>/dev/null | grep -q . || [ -e "$DATA/socle-annuaire.db" ]; }
if [ -s "$KEK" ]; then
  grep -qE '^[0-9a-fA-F]{64}$' "$KEK" || { echo "  ✗ $KEK existe mais n'est pas une clé de 64 hexadécimaux — je n'y touche pas."; exit 1; }
  echo "  clé déjà posée : on n'y touche pas"
else
  if bases_de_test; then
    echo "  ⛔ des bases de test chiffrées existent et la clé de test est ABSENTE."
    echo "     Générer une clé neuve les rendrait illisibles. Ce sont des données JETABLES : pour repartir"
    echo "     de zéro, supprime-les (et seulement elles) :   rm -rf /opt/teamop/test/data/*   puis relance ce script."
    exit 1
  fi
  [ -d "$ETC" ] || { mkdir -p "$ETC"; chmod 700 "$ETC"; }
  ( umask 077; openssl rand -hex 32 > "$KEK.nouveau" )
  chmod 600 "$KEK.nouveau"
  mv -T "$KEK.nouveau" "$KEK"
  echo "  clé de test générée (elle n'est affichée nulle part, et n'a pas à être mise au séquestre : les données de test sont jetables)"
fi

# ══ 6. La configuration de test ═══════════════════════════════════════════════════════════════
echo "── [6/9] La configuration de test (/opt/teamop/test/config.json)…"
# Complétée, jamais remplacée : une clé déjà tirée (espaceTestCle, VAPID, apiKey) reste la même.
VAPID_JSON=""
if ! config_a '(.vapidPublicKey // "") != "" and (.vapidPrivateKey // "") != ""'; then
  VAPID_JSON="$(node -e '
    const c = require("crypto");
    const k = c.generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ format: "jwk" });
    const b = s => Buffer.from(s, "base64url");
    console.log(JSON.stringify({ vapidPublicKey: Buffer.concat([Buffer.from([4]), b(k.x), b(k.y)]).toString("base64url"), vapidPrivateKey: k.d }));')"
fi
SRC_AVANT=/dev/null; [ -f "$CONFIG" ] && SRC_AVANT="$CONFIG"
SRC_PROD=/dev/null;  [ -f "$PROD_CONFIG" ] && SRC_PROD="$PROD_CONFIG"
CONFIG_NEUVE="$(
  NOUVELLE_CLE="$(openssl rand -hex 32)" NOUVEL_APIKEY="$(openssl rand -hex 24)" NOUVEAU_CODE_DEVIS="$(openssl rand -hex 8)" \
  VAPID="$VAPID_JSON" STRIPE_SK="$STRIPE_SK" ORIGINE="https://$DOMAINE" \
  jq -n --slurpfile avant "$SRC_AVANT" --slurpfile prod "$SRC_PROD" '
    def v(x): (env[x] // "");
    ($avant[0] // {})
    | .contactEmail = (.contactEmail // "essai@exemple-essai.fr")
    | .apiKey = (if (.apiKey // "") != "" then .apiKey else v("NOUVEL_APIKEY") end)
    | .origins = [v("ORIGINE")]
    | .mailPreuveExigee = true
    | .smtp = (.smtp // {})
    | (if v("VAPID") != "" then (v("VAPID") | fromjson) as $k | .vapidPublicKey = $k.vapidPublicKey | .vapidPrivateKey = $k.vapidPrivateKey else . end)
    | .espaceTest = true
    | .espaceTestCle = (if ((.espaceTestCle // "") | test("^[0-9a-f]{64}$")) then .espaceTestCle else v("NOUVELLE_CLE") end)
    | .espaceTestOrigine = v("ORIGINE")
    | .courrielsCaptes = true
    | .agents = ((.agents // {}) | .plafondMoisTotal = 10
        | .cleApi = (if (.cleApi // "") != "" then .cleApi else ($prod[0].agents.cleApi // "") end))
    | .stripe = ((.stripe // {})
        | (if v("STRIPE_SK") != "" then .secretKey = v("STRIPE_SK") else . end))
    | .anthropic = (.anthropic // { cleApi: "", secretDevis: v("NOUVEAU_CODE_DEVIS"), quotaJour: 100 })'
)"
# ⛔ Garde-fous AVANT d'écrire : le mode test est posé, et aucune clé de production n'a pu entrer.
printf '%s' "$CONFIG_NEUVE" | jq -e '.espaceTest == true and .courrielsCaptes == true and (.espaceTestCle | test("^[0-9a-f]{64}$"))' >/dev/null \
  || { echo "  ✗ la configuration de test calculée est incohérente — rien n'est écrit."; exit 1; }
if printf '%s' "$CONFIG_NEUVE" | jq -e '(.stripe.secretKey // "") | test("live")' >/dev/null; then
  echo "  ⛔ la configuration de test porte une clé Stripe de production — rien n'est écrit. Relance : bash install-test.sh stripe"; exit 1
fi
( umask 077; printf '%s\n' "$CONFIG_NEUVE" > "$CONFIG.nouveau" )
# root le possède, teamoptest le LIT (groupe) : le service n'a pas à réécrire sa configuration.
chown root:teamoptest "$CONFIG.nouveau"
chmod 640 "$CONFIG.nouveau"
mv -T "$CONFIG.nouveau" "$CONFIG"
CONFIG_NEUVE=""
echo "  configuration écrite (chmod 640, groupe teamoptest) : courriels captés, agents plafonnés à 10 $/mois"
config_a '(.agents.cleApi // "") != ""' \
  && echo "  clé des agents : copiée depuis la production (sans l'afficher)" \
  || echo "  ⚠️ pas de clé d'agents trouvée dans la production (agents.cleApi) : les agents resteront muets en test"
config_a '(.stripe.secretKey // "") | test("^(sk|rk)_test_")' \
  && echo "  Stripe : clé de test en place" \
  || echo "  ⚠️ Stripe : pas de clé de test — les paiements de test sont éteints (bash install-test.sh stripe)"
# Les tarifs de TEST : les dix tarifs de production n'existent pas en mode test (« No such price »). `stripe-essai-prix.js` crée chez
# Stripe, en mode test, leurs équivalents (retrouvés par clé de recherche s'ils existent : rejouable) et écrit la table
# `stripe.prixEssai` dans la configuration, d'où le serveur de test et le fabricant des pages la lisent. Il refuse tout ce qui n'est pas
# une clé de test. Une panne de Stripe n'arrête pas l'installation : le reste de l'espace de test se joue sans le paiement.
if config_a '(.stripe.secretKey // "") | test("^(sk|rk)_test_")'; then
  if a_demander stripe || ! config_a '((.stripe.prixEssai // {}) | length) == 10'; then
    if [ ! -f "$MIROIR/server/stripe-essai-prix.js" ]; then
      echo "  ⚠️ cette branche ne porte pas server/stripe-essai-prix.js : les tarifs de test ne sont pas créés, le paiement de test n'aboutira pas"
    elif SORTIE_PRIX="$(TEAMOP_CONFIG="$CONFIG" node "$MIROIR/server/stripe-essai-prix.js" 2>&1)"; then
      printf '%s\n' "$SORTIE_PRIX" | tail -n 3 | sed 's/^/  /'
      echo "  tarifs de test : prêts (table écrite dans la configuration, clé non affichée)"
    else
      printf '%s\n' "$SORTIE_PRIX" | tail -n 5 | sed 's/^/    /'
      echo "  ⚠️ les tarifs de test n'ont pas pu être créés (voir ci-dessus) : le paiement de test n'aboutira pas. Relance : bash install-test.sh stripe"
    fi
    SORTIE_PRIX=""
  else
    echo "  tarifs de test : déjà en place (10 dans la configuration)"
  fi
fi

# ══ 7. Le service ═════════════════════════════════════════════════════════════════════════════
echo "── [7/9] Le service « $UNITE » (127.0.0.1:$PORT)…"
# La clé de test est posée plus haut : l'unité qui la lit vient APRÈS (systemd refuse de démarrer une
# unité dont une source de LoadCredential manque — leçon de server/poser-cle.js).
# · User=teamoptest, ProtectSystem=strict : le service n'écrit QUE dans /opt/teamop/test/data ;
# · InaccessiblePaths : la production, son annuaire, sa configuration et sa clé lui sont invisibles,
#   même si une règle de droits se trompait un jour ;
# · TEAMOP_FB_ADMIN pointe un fichier qui n'existe pas : sans cette ligne, le serveur lirait la clé
#   d'administration Firebase de la PRODUCTION (/opt/teamop/firebase-admin.json) et pourrait agir dessus ;
# · EnvironmentFile : le commit servi (écrit par deployer-test.sh), que le serveur peut publier.
UNITE_TEXTE="[Unit]
Description=TeamOP API — ESPACE DE TEST (jamais la production)
After=network.target

[Service]
User=teamoptest
Group=teamoptest
WorkingDirectory=/opt/teamop/test/current/server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=3
Environment=PORT=$PORT
Environment=NODE_ENV=production
Environment=TEAMOP_CONFIG=/opt/teamop/test/config.json
Environment=TEAMOP_DATA=/opt/teamop/test/data
Environment=TEAMOP_FB_ADMIN=/opt/teamop/test/firebase-admin.json
EnvironmentFile=-/opt/teamop/test/commit.env
LoadCredential=teamop_kek:/etc/teamop/kek-test
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/opt/teamop/test/data /opt/teamop/test/monitor.json
InaccessiblePaths=-/opt/teamop/data -/opt/teamop/config.json -/opt/teamop/repo -/opt/teamop/firebase-admin.json -/etc/teamop

[Install]
WantedBy=multi-user.target
"
mkdir -p "$SYSD"
RECHARGER=0
if [ "$(cat "$FICHIER_UNITE" 2>/dev/null || true)" != "${UNITE_TEXTE%$'\n'}" ]; then
  printf '%s' "$UNITE_TEXTE" > "$FICHIER_UNITE.nouveau"
  mv -T "$FICHIER_UNITE.nouveau" "$FICHIER_UNITE"
  RECHARGER=1
fi
[ "$RECHARGER" = "0" ] || systemctl daemon-reload
systemctl enable "$UNITE" >/dev/null 2>&1 || true
echo "  unité posée (elle démarre au premier déploiement, étape 9)"

# ══ 8. nginx et le certificat ═════════════════════════════════════════════════════════════════
echo "── [8/9] nginx : $DOMAINE (pages derrière mot de passe, /api/ vers le serveur de test)…"
# Le mot de passe des pages : un hachage apr1 (compris par nginx), jamais le mot de passe lui-même.
if [ -n "$MDP" ]; then
  mkdir -p "$NGX"
  ( umask 027; printf 'essai:%s\n' "$(printf '%s' "$MDP" | openssl passwd -apr1 -stdin)" > "$HTPASSWD.nouveau" )
  getent group www-data >/dev/null 2>&1 && chgrp www-data "$HTPASSWD.nouveau"
  chmod 640 "$HTPASSWD.nouveau"
  mv -T "$HTPASSWD.nouveau" "$HTPASSWD"
  MDP=""
  echo "  mot de passe des pages enregistré (identifiant : essai)"
else
  echo "  mot de passe des pages déjà en place"
fi
# Les pages avant le premier déploiement : un lien vers un petit mot d'attente.
if [ ! -e "$LIEN_PAGES" ]; then
  mkdir -p "$PAGES_D/vide"
  printf '%s\n' '<!doctype html><meta charset="utf-8"><title>Espace de test</title><p>Espace de test installé — le premier déploiement n est pas encore passé.</p>' > "$PAGES_D/vide/essais.html"
  chmod -R a+rX "$PAGES_D/vide"
  ln -sfn pages.d/vide "$LIEN_PAGES"
fi
mkdir -p "$ACME"

# `http2 on;` n'existe qu'à partir de nginx 1.25.1 ; avant, c'est un mot de la ligne `listen`.
# Ubuntu 24.04 livre 1.24 : écrire la forme neuve ferait échouer `nginx -t` sur un serveur sain.
V="$(nginx -v 2>&1 | sed -n 's|.*nginx/\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\).*|\1 \2 \3|p')"
read -r VM VN VP <<<"${V:-1 24 0}"
if [ $((VM*10000 + VN*100 + VP)) -ge 12501 ]; then H2_LISTEN=""; H2_ON="    http2 on;"; else H2_LISTEN=" http2"; H2_ON=""; fi
rendre() {   # remplace les trous du modèle ; rien d'autre n'entre dans le fichier
  sed -e "s|@@DOMAINE@@|$DOMAINE|g" -e "s|@@PORT@@|$PORT|g" -e "s|@@ACME@@|$ACME_REEL|g" \
      -e "s|@@PAGES@@|/opt/teamop/test/pages|g" -e "s|@@HTPASSWD@@|/etc/nginx/teamop-test.htpasswd|g" \
      -e "s|@@LETSENCRYPT@@|/etc/letsencrypt|g" -e "s|@@H2_LISTEN@@|$H2_LISTEN|g" -e "s|@@H2_ON@@|$H2_ON|g"
}
MODELE="$MIROIR/server/nginx-teamop-test.conf"
if [ -d "$NGX/sites-available" ]; then CIBLE_NGX="$NGX/sites-available/teamop-test.conf"; LIEN_NGX="$NGX/sites-enabled/teamop-test.conf"
else CIBLE_NGX="$NGX/conf.d/teamop-test.conf"; LIEN_NGX=""; fi
mkdir -p "$(dirname "$CIBLE_NGX")"
ecrire_ngx() {   # $1 = contenu. Sauvegarde l'ancien, écrit, VALIDE ; sinon restaure et s'arrête. Identique = rien à faire.
  local sauve=""
  if [ -f "$CIBLE_NGX" ] && [ "$(cat "$CIBLE_NGX")" = "${1%$'\n'}" ]; then return 0; fi
  [ -f "$CIBLE_NGX" ] && { sauve="$CIBLE_NGX.avant"; cp "$CIBLE_NGX" "$sauve"; }
  printf '%s' "$1" > "$CIBLE_NGX"
  [ -z "$LIEN_NGX" ] || { mkdir -p "$(dirname "$LIEN_NGX")"; ln -sfn "$CIBLE_NGX" "$LIEN_NGX"; }
  if ! nginx -t >/dev/null 2>&1; then
    echo "  ⛔ nginx refuse la configuration (nginx -t) — rien n'est rechargé, mon fichier est remis comme avant."
    if [ -n "$sauve" ]; then mv "$sauve" "$CIBLE_NGX"; else rm -f "$CIBLE_NGX"; [ -z "$LIEN_NGX" ] || rm -f "$LIEN_NGX"; fi
    nginx -t 2>&1 | head -5 || true
    exit 1
  fi
  [ -z "$sauve" ] || rm -f "$sauve"
  systemctl reload nginx
}
if [ ! -s "$LE/live/$DOMAINE/fullchain.pem" ]; then
  # Première phase : le port 80 seul, pour que Let's Encrypt puisse valider. nginx refuserait de
  # charger un bloc 443 dont le certificat n'existe pas encore.
  getent ahostsv4 "$DOMAINE" >/dev/null 2>&1 || {
    echo "  ✗ $DOMAINE ne se résout pas encore : la ligne DNS n'est pas posée, ou pas propagée."
    echo "    Pose l'enregistrement A (voir design/ESPACE-DE-TEST.md, étape 1), attends quelques minutes, relance ce script."
    echo "    Tout ce qui précède est fait et ne sera pas refait."; exit 1; }
  ecrire_ngx "$(sed '/^# ==== HTTPS/,$d' "$MODELE" | rendre)"
  echo "  certificat Let's Encrypt pour $DOMAINE…"
  if ! SORTIE="$(certbot certonly --webroot -w "$ACME_REEL" -d "$DOMAINE" -m contact@teamop.fr \
         --agree-tos --non-interactive --keep-until-expiring --deploy-hook "systemctl reload nginx" 2>&1)"; then
    echo "  ⛔ Le certificat n'a pas pu être obtenu. Le DNS de $DOMAINE pointe-t-il sur CE serveur ?"
    printf '%s\n' "$SORTIE" | tail -n 5 | sed 's/^/    /'
    echo "    (le port 80 est prêt ; relance ce script une fois le DNS en place)"
    exit 1
  fi
fi
ecrire_ngx "$(rendre < "$MODELE")"
echo "  nginx à jour"

# ══ 9. Le premier déploiement ═════════════════════════════════════════════════════════════════
echo "── [9/9] Premier déploiement de « $BRANCHE » (${SHA:0:8})…"
if ! bash "$MIROIR/server/deployer-test.sh" "$SHA" "$BRANCHE"; then
  echo ""
  echo "  ⛔ L'installation est faite, mais le PREMIER DÉPLOIEMENT a échoué (voir plus haut)."
  echo "     Rien de la production n'a bougé. Recolle ce qui précède dans la conversation."
  exit 1
fi

echo ""
echo "── Vérifications locales"
H="$(curl -s --max-time 10 "http://127.0.0.1:$PORT/health" 2>/dev/null || true)"
printf '%s' "$H" | jq -e '.ok == true' >/dev/null 2>&1 && echo "  ✓ le serveur de test répond (/health ok)" || echo "  ✗ le serveur de test ne répond pas sur 127.0.0.1:$PORT"
CODE_PAGES="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAINE/essais.html" 2>/dev/null || true)"
[ "$CODE_PAGES" = "401" ] && echo "  ✓ les pages demandent le mot de passe (401 sans lui)" || echo "  ✗ les pages répondent $CODE_PAGES au lieu de 401 — le mot de passe n'est pas posé ?"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ Espace de test installé."
echo "════════════════════════════════════════════════════════════════"
echo "  Ouvre :  https://$DOMAINE/essais.html"
echo "  Identifiant : essai   ·   mot de passe : celui que tu viens de choisir"
echo "  Chaque demande de fusion qui touche le dépôt y arrive d'elle-même (workflow « Espace de test »)."
echo "════════════════════════════════════════════════════════════════"
