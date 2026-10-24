#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════════════════════
#  Installation de l'ESPACE DE TEST (test.teamop.fr) sur le VPS — en root, UNE fois, rejouable.
#
#  Usage :   bash /root/install-test.sh
#            bash /root/install-test.sh stripe        (redemander la clé Stripe de test, puis recréer/retrouver les dix tarifs de test)
#            bash /root/install-test.sh anthropic     (redemander la clé Anthropic DÉDIÉE à l'espace de test)
#            bash /root/install-test.sh motdepasse    (changer le mot de passe des pages)
#            bash /root/install-test.sh cle           (poser une autre clé PUBLIQUE de déploiement pour la CI)
#  Mode d'emploi, geste par geste : design/ESPACE-DE-TEST.md.
#
#  Décision de Justin (23 octobre 2026) : « toute modification, site, application, la Tour, je veux
#  des espaces de test, et après on pousse ». Un MÊME code serveur (server/index.js) tourne à côté de
#  la production, sur un autre port, avec sa configuration, ses données, sa clé maître et son
#  utilisateur à lui. Les courriels y sont captés (rien ne part), Stripe y est en mode TEST.
#
#  ⛔ CE SCRIPT NE TOUCHE JAMAIS À LA PRODUCTION. Il n'écrit rien dans /opt/teamop/data, ni dans
#  /opt/teamop/config.json, ni dans /opt/teamop/repo, ni dans /etc/teamop/kek ; il ne relance ni
#  n'arrête `teamop-api` ; il ne touche pas aux blocs nginx / Caddy d'api.teamop.fr et de teamop.fr.
#  La production n'est LUE que pour deux choses : refuser que la clé Anthropic de test soit celle de la production (comparaison, jamais affichée),
#  et vérifier que le compte de test ne peut PAS lire ses fichiers (`test -r`, rien n'est modifié : si c'est le cas, le script s'arrête et dit quoi corriger).
#  `tests/test-2989.js` lit ce fichier ET le joue dans un bac à sable, et exige que la production sorte du bac à sable octet pour octet identique.
#
#  ⛔ ROOT N'EXÉCUTE JAMAIS CE QUE LE COMPTE DE TEST PEUT ÉCRIRE (relecture adverse, 23 octobre 2026). Les quatre fichiers que root pose ou lance — le déployeur
#  (/usr/local/sbin/deployer-test), le modèle nginx, le modèle Caddy, le créateur de tarifs Stripe — sont TÉLÉCHARGÉS ici, par root, à l'adresse du commit EXACT
#  (`raw.githubusercontent.com/<dépôt>/<sha complet>/…` : immuable, pas de cache périmé), le SHA étant lu par `git ls-remote` (root, réseau) ; jamais lus dans le miroir du dépôt,
#  que le compte de test écrit. Le miroir ne sert qu'à git.
#
#  ⛔ IL N'AFFICHE JAMAIS UN SECRET (règle de CLAUDE.md : Justin recolle toutes ses sorties dans la
#  conversation). La clé Stripe de test, la clé Anthropic de test et le mot de passe des pages se saisissent
#  EN MASQUÉ ; la clé maître de test, la clé des routes d'essai et la paire VAPID naissent ici et ne
#  sont écrites que dans leur fichier (0600 / 0640). La clé publique de déploiement n'est pas un secret : elle se colle en clair. Aucun secret ne passe par une
#  ligne de commande (visible par `ps`) : jq les reçoit par l'environnement de son seul processus, openssl et htpasswd par l'entrée standard.
#
#  ⛔ IL EST REJOUABLE. Deux passages donnent le même état : la configuration existante est
#  COMPLÉTÉE, jamais remplacée ; la clé maître de test n'est jamais régénérée si des données de test
#  existent (même règle que server/poser-cle.js) ; un fichier nginx / Caddy identique n'est pas rechargé.
#  ⛔ Et rejouer NE CHANGE PAS la branche en essai : sans `TEAMOP_TEST_BRANCHE`, le dernier geste redéploie le commit DÉJÀ servi (lu dans /opt/teamop/test/commit-servi),
#  pas `main` — une demande de fusion en cours d'essai n'est pas remplacée par un simple changement de clé Stripe.
#
#  Variables (toutes facultatives) :
#    TEAMOP_TEST_BRANCHE   branche à mettre en essai (défaut : main la première fois ; ensuite le commit déjà servi)
#    TEAMOP_TEST_DOMAINE   défaut test.teamop.fr
#    TEAMOP_TEST_PORT      port local du serveur de test (défaut 8095 — ⚠️ PAS 8090 : voir plus bas)
#    TEAMOP_TEST_PROXY     nginx | caddy — à poser si les deux tournent, ou si aucun ne se détecte
#    TEAMOP_TEST_DEPOT     dépôt GitHub à mettre en miroir (défaut : celui de TeamOP)
#    TEAMOP_TEST_RACINE    préfixe de tous les chemins — UNIQUEMENT pour les bancs (bac à sable)
#    TEAMOP_TEST_ENTREE    d'où lire les saisies — UNIQUEMENT pour les bancs (sinon : le terminal)
#    TEAMOP_TEST_DISQUE_MIN_KO   espace libre exigé, en Ko (défaut 3 145 728 = 3 Go)
# ══════════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

DOMAINE="${TEAMOP_TEST_DOMAINE:-test.teamop.fr}"
# ⚠️ 8095 et non 8090 : 8090 est le port que `install-msg.sh prod` réserve à OP MESSAGES (et
# `install-courrier.sh` le refuse pour la même raison). Le prendre ici ferait échouer, le jour de
# « publie OP MESSAGES », l'installation de la production — sur « adresse déjà utilisée ».
PORT="${TEAMOP_TEST_PORT:-8095}"
BRANCHE_ARG="${TEAMOP_TEST_BRANCHE:-}"   # posée À LA MAIN : sinon un rejeu garde le commit déjà en essai
BRANCHE="${BRANCHE_ARG:-main}"
DEPOT="${TEAMOP_TEST_DEPOT:-https://github.com/justino17-cmd/teamop.git}"
DISQUE_MIN_KO="${TEAMOP_TEST_DISQUE_MIN_KO:-3145728}"
[[ "$DOMAINE" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]] || { echo "✗ domaine illisible"; exit 2; }
[[ "$PORT" =~ ^[0-9]{4,5}$ ]]                          || { echo "✗ port illisible"; exit 2; }
case "$PORT" in 8080|8090|8091|8092|8192|8193|7880|7881|3478|5349) echo "✗ le port $PORT appartient à un autre service de ce VPS"; exit 2 ;; esac
[[ "$BRANCHE" =~ ^[A-Za-z0-9._/-]{1,100}$ ]]           || { echo "✗ nom de branche illisible"; exit 2; }
DEPOT_NU="${DEPOT%.git}"
[[ "$DEPOT_NU" =~ ^https://github\.com/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]] || { echo "✗ le dépôt doit être une adresse GitHub (https://github.com/<qui>/<quoi>)"; exit 2; }
RAW="https://raw.githubusercontent.com/${DEPOT_NU#https://github.com/}"

REDEMANDER=" "
for mot in "$@"; do
  case "$mot" in
    stripe|motdepasse|anthropic|cle) REDEMANDER="$REDEMANDER$mot " ;;
    *) echo "usage : bash install-test.sh [stripe] [anthropic] [motdepasse] [cle]"; exit 2 ;;
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
SBIN="$R/usr/local/sbin"
DEPLOYEUR="$SBIN/deployer-test"
SSHD="$R/root/.ssh"
AUTH="$SSHD/authorized_keys"
MARQUE_SSH="teamop-essai-deploiement"
NGX="$R/etc/nginx"
HTPASSWD="$NGX/teamop-test.htpasswd"
CDY="$R/etc/caddy"
FICHIER_CDY_MDP="$CDY/teamop-test/essai.hash"
LE="$R/etc/letsencrypt"
ACME_REEL="/var/www/teamop-test-acme"
ACME="$R$ACME_REEL"
# La production n'est LUE que pour deux choses (voir l'en-tête) : comparer une clé, vérifier un droit.
PROD_CONFIG="$R/opt/teamop/config.json"
ENTREE="/dev/tty"
[ -z "$R" ] || ENTREE="${TEAMOP_TEST_ENTREE:-/dev/tty}"
PAUSE=2; [ -z "$R" ] || PAUSE=0

if [ -z "$R" ] && [ "$(id -u)" != "0" ]; then echo "✗ à lancer en root"; exit 1; fi

EN_TANT_QUE() { runuser -u teamoptest -- "$@"; }
export GIT_TERMINAL_PROMPT=0
a_demander() { case "$REDEMANDER" in *" $1 "*) return 0 ;; esac; return 1; }
config_a() { [ -f "$CONFIG" ] && jq -e "$1" "$CONFIG" >/dev/null 2>&1; }   # la config existante répond-elle vrai ?

# ══ 1. Ce qu'il faut sur la machine ═══════════════════════════════════════════════════════════
echo "── [1/9] La machine…"
actif() { systemctl is-active --quiet "$1"; }
# Le proxy qui tient les ports 80 et 443 : nginx OU Caddy (le VPS d'OP MESSAGES et d'OP Courrier est servi par Caddy — REPRISE.md, 7 octobre 2026 : « avant de donner un geste de
# proxy, demander lequel tourne »). Même détection que server-msg/install-msg.sh. Un doute n'écrit rien.
if [ -n "${TEAMOP_TEST_PROXY:-}" ]; then
  PROXY="$TEAMOP_TEST_PROXY"
  [ "$PROXY" = nginx ] || [ "$PROXY" = caddy ] || { echo "  ✗ TEAMOP_TEST_PROXY doit valoir nginx ou caddy"; exit 2; }
  command -v "$PROXY" >/dev/null && actif "$PROXY" || { echo "  ✗ $PROXY n'est pas actif sur ce serveur. Rien n'a été changé."; exit 1; }
else
  N=0; C=0
  command -v nginx >/dev/null && actif nginx && N=1
  command -v caddy >/dev/null && actif caddy && C=1
  if [ "$N" = 1 ] && [ "$C" = 1 ]; then
    echo "  ✗ nginx ET Caddy sont actifs : lequel tient les ports 80 et 443 ? Relance avec TEAMOP_TEST_PROXY=nginx ou TEAMOP_TEST_PROXY=caddy. Rien n'a été changé."; exit 1
  elif [ "$N" = 1 ]; then PROXY=nginx
  elif [ "$C" = 1 ]; then PROXY=caddy
  else
    echo "  ✗ aucun proxy actif (ni nginx ni Caddy) : l'espace de test a besoin de celui qui tient les ports 80 et 443. Relance avec TEAMOP_TEST_PROXY=… une fois le proxy en route. Rien n'a été changé."; exit 1
  fi
fi
command -v node >/dev/null && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] || {
  echo "  ✗ Node 22 ou plus est requis (le serveur utilise des modules récents). Rien n'a été changé."; exit 1; }
for c in systemd-run runuser flock; do
  command -v "$c" >/dev/null || { echo "  ✗ « $c » est absent : il faut systemd et util-linux (la cellule où tourne le code d'une branche). Rien n'a été changé."; exit 1; }
done
MANQUE=""
for c in git curl jq openssl; do command -v "$c" >/dev/null || MANQUE="$MANQUE $c"; done
[ -z "$MANQUE" ] || { echo "  installation de :$MANQUE"; apt-get install -y -qq $MANQUE ca-certificates >/dev/null; }
if [ "$PROXY" = nginx ]; then
  command -v certbot >/dev/null || { echo "  installation de certbot"; apt-get install -y -qq certbot >/dev/null; }
else
  command -v htpasswd >/dev/null || { echo "  installation de htpasswd (apache2-utils)"; apt-get install -y -qq apache2-utils >/dev/null; }
fi
# Le miroir complet, trois releases de ~100 Mo avec leurs dépendances, trois jeux de pages : on exige de la place AVANT, pas un échec à moitié.
REF_DISQUE=""; for d in "$OPT" "$R/opt/teamop" "$R/opt" "$R" /; do [ -d "$d" ] && { REF_DISQUE="$d"; break; }; done
LIBRE_KO="$(df -Pk "$REF_DISQUE" 2>/dev/null | awk 'NR==2 {print $4}')"
if [[ "$LIBRE_KO" =~ ^[0-9]+$ ]] && [ "$LIBRE_KO" -lt "$DISQUE_MIN_KO" ]; then
  echo "  ✗ il reste $((LIBRE_KO / 1024)) Mo libres sur le disque ($((DISQUE_MIN_KO / 1024)) Mo exigés pour le miroir, les releases et les pages). Rien n'a été changé."; exit 1
fi
echo "  proxy : $PROXY · Node $(node -v), git, jq, openssl présents · $((${LIBRE_KO:-0} / 1024)) Mo libres"

# ══ 2. Les saisies — TOUTES d'abord : si l'une manque, on s'arrête avant d'avoir rien changé ══
echo "── [2/9] Ce que je te demande (les secrets ne s'affichent pas quand tu les tapes)…"
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
lire_clair() {   # $1 = libellé. Pour ce qui n'est PAS un secret (la clé PUBLIQUE de déploiement). Résultat dans REPONSE.
  local a=""
  ouvrir_entree
  printf '  %s : ' "$1" >&2
  IFS= read -r -u 8 a || true
  REPONSE="$a"
}
STRIPE_SK=""; ANTHROPIC_SK=""; MDP=""; PUB_TYPE=""; PUB_BLOB=""
if a_demander stripe || ! config_a '(.stripe.secretKey // "") | test("^(sk|rk)_test_")'; then
  echo "  Clé Stripe de TEST (tableau de bord Stripe, en mode test → Développeurs → Clés API → « Clé secrète » standard, pas une clé restreinte)."
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
if a_demander anthropic || ! config_a '(.agents.cleApi // "") != ""'; then
  echo "  Clé Anthropic DÉDIÉE à l'espace de test (console Anthropic → un espace de travail « test » avec une limite de dépense mensuelle de 10 $ — c'est CETTE limite, chez Anthropic,"
  echo "  qui plafonne vraiment la dépense : jamais la clé de la production). Elle commence par sk-ant-. Entrée seule = les agents resteront muets en test."
  essai=0
  while [ "$essai" -lt 3 ]; do
    lire_masque "Clé Anthropic de l'espace de test" non || true
    if [ -z "$REPONSE" ]; then echo "  → pas de clé Anthropic pour l'instant (relance plus tard : bash install-test.sh anthropic)"; break; fi
    if [[ ! "$REPONSE" =~ ^sk-ant-[A-Za-z0-9_-]{20,}$ ]]; then echo "  ✗ Ce n'est pas une clé Anthropic (sk-ant- suivi de lettres, chiffres, - et _)."
    # ⛔ Jamais la clé de la production : le plafond de 10 $ du serveur de test est un plafond de CODE, qu'une branche pourrait contourner — la limite de la clé, elle, est chez Anthropic.
    elif [ -f "$PROD_CONFIG" ] && K="$REPONSE" jq -e '[(.agents.cleApi // ""), (.anthropic.cleApi // "")] | map(select(. != "")) | index(env.K) != null' "$PROD_CONFIG" >/dev/null 2>&1; then
      echo "  ⛔ C'est la clé de la PRODUCTION. L'espace de test exécute le code de branches pas encore relues : il lui faut sa propre clé, avec sa propre limite de dépense. Rien n'est enregistré."
    else ANTHROPIC_SK="$REPONSE"; echo "  → clé reçue (${REPONSE:0:7}…, ${#REPONSE} caractères)"; break; fi
    essai=$((essai + 1))
  done
  REPONSE=""
fi
if a_demander motdepasse || { [ "$PROXY" = nginx ] && [ ! -s "$HTPASSWD" ]; } || { [ "$PROXY" = caddy ] && [ ! -s "$FICHIER_CDY_MDP" ]; }; then
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
if a_demander cle || ! grep -q " $MARQUE_SSH\$" "$AUTH" 2>/dev/null; then
  echo "  Clé PUBLIQUE de déploiement pour la CI (ssh-ed25519 AAAA…) : celle que tu as faite sur ton Mac (fichier .pub). Ce n'est PAS un secret, tu peux la coller en clair."
  echo "  Entrée seule = la CI ne pourra pas encore mettre une demande de fusion en essai (relance plus tard : bash install-test.sh cle)."
  essai=0
  while [ "$essai" -lt 3 ]; do
    lire_clair "Clé publique de déploiement"
    if [ -z "$REPONSE" ]; then echo "  → pas de clé de déploiement pour l'instant"; break; fi
    if [[ "$REPONSE" == *"PRIVATE KEY"* ]]; then echo "  ⛔ C'est une clé PRIVÉE. Ne la colle jamais : il faut le fichier qui finit par .pub. Rien n'est enregistré."
    elif [[ "$REPONSE" =~ ^(ssh-ed25519|ecdsa-sha2-nistp256|ssh-rsa)\ ([A-Za-z0-9+/]{60,}={0,3})(\ [^\"\\\']*)?$ ]]; then PUB_TYPE="${BASH_REMATCH[1]}"; PUB_BLOB="${BASH_REMATCH[2]}"; echo "  → clé publique reçue ($PUB_TYPE)"; break
    else echo "  ✗ Ce n'est pas une clé publique SSH sur une ligne (ssh-ed25519 AAAA…)."; fi
    essai=$((essai + 1))
  done
  REPONSE=""
fi
[ "$ENTREE_OUVERTE" = "0" ] || exec 8<&-
echo "  saisies terminées"

# ══ 3. Un compte à part, des dossiers à part ══════════════════════════════════════════════════
echo "── [3/9] Le compte « teamoptest » et ses dossiers (tout sous /opt/teamop/test)…"
# Un compte SYSTÈME sans connexion : le code d'une branche pas encore relue ne tourne pas en root,
# et ne doit lire ni les données ni la configuration de la production.
id teamoptest >/dev/null 2>&1 \
  || useradd --system --user-group --home-dir /opt/teamop/test --no-create-home --shell /usr/sbin/nologin teamoptest
# ⛔ LE COMPTE DE TEST NE DOIT PAS POUVOIR LIRE LA PRODUCTION (relecture adverse, 23 octobre 2026). Le dépôt ne fixe aucun mode pour `/opt/teamop/data` ni `monitor.json` :
# `tour-sessions.json` (les jetons de session VIVANTS de la Tour) y est écrit sans mode, `monitor.json` (les comptes de la Tour) aussi. Si ces droits sont ceux par défaut, le code d'une
# branche — service de test, fabrication des pages — y lirait un jeton de patron de la production. On le MESURE (`test -r`, `test -x` sous le compte de test, rien n'est modifié ni affiché) ;
# si c'est le cas, on s'arrête AVANT d'avoir installé quoi que ce soit, et on dit les deux commandes à passer. (/opt/teamop lui-même reste traversable : nginx doit atteindre /opt/teamop/test/pages.)
lisible_par_test() { [ -e "$1" ] && { EN_TANT_QUE test -r "$1" || EN_TANT_QUE test -x "$1"; }; }
FUITES=""
for p in "$R/opt/teamop/data" "$R/opt/teamop/data/tour-sessions.json" "$R/opt/teamop/monitor.json" "$PROD_CONFIG" "$R/opt/teamop/firebase-admin.json" "$R/etc/teamop/kek" "$R/etc/teamop"; do
  lisible_par_test "$p" && FUITES="$FUITES ${p#"$R"}"
done
if [ -n "$FUITES" ]; then
  echo "  ⛔ Le compte « teamoptest » PEUT LIRE des fichiers de la PRODUCTION :${FUITES}"
  echo "     Le code d'une branche en essai tourne sous ce compte : il y lirait, par exemple, un jeton de session de la Tour de production. Rien d'autre n'a été installé."
  echo "     Corrige (rien ne s'affiche de leur contenu), puis relance ce script :"
  case "$FUITES" in *"/opt/teamop/data"*)         echo "       chmod 700 /opt/teamop/data" ;; esac
  case "$FUITES" in *"/opt/teamop/monitor.json"*) echo "       chmod 600 /opt/teamop/monitor.json" ;; esac
  case "$FUITES" in *"/opt/teamop/config.json"*)  echo "       chmod 600 /opt/teamop/config.json" ;; esac
  case "$FUITES" in *"/opt/teamop/firebase-admin.json"*) echo "       chmod 600 /opt/teamop/firebase-admin.json" ;; esac
  case "$FUITES" in *"/etc/teamop"*)              echo "       chmod 700 /etc/teamop" ;; esac
  echo "     (PAS de chmod sur /opt/teamop lui-même : nginx / Caddy doivent le traverser jusqu'aux pages de test. Le service de production tourne en root : ces droits ne le gênent pas.)"
  exit 1
fi
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
echo "  /opt/teamop/test prêt, et la production n'est lisible ni du compte de test (test -r) ni de sa cellule"

# ══ 4. Le code : le miroir de git, et LES FICHIERS DE ROOT — téléchargés au commit exact ══════
echo "── [4/9] Le code (miroir du dépôt, branche « $BRANCHE ») et les fichiers que root pose…"
echo "  (compte une minute : le dépôt se télécharge, rien ne s'affiche pendant ce temps)"
# Le SHA de la branche est lu PAR ROOT, sur le réseau, jamais dans le miroir : c'est lui qui décide ce que root va poser.
SRC_SHA="$(git ls-remote "$DEPOT" "refs/heads/$BRANCHE" 2>/dev/null | awk 'NR==1 {print $1}')"
[[ "$SRC_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "  ✗ la branche « $BRANCHE » n'existe pas sur GitHub (poussée ?). Relance avec TEAMOP_TEST_BRANCHE=<la bonne>."; exit 1; }
# ⛔ Jamais /opt/teamop/repo : y avancer le code ferait avancer la production sur le disque sans la redémarrer.
if [ ! -d "$MIROIR/.git" ]; then
  EN_TANT_QUE git clone --quiet "$DEPOT" "$MIROIR" || { echo "  ✗ le clone a échoué — le VPS joint-il GitHub ? Rien d'autre n'a été fait."; exit 1; }
fi
EN_TANT_QUE git -c credential.helper= -C "$MIROIR" fetch --prune --quiet origin \
  || { echo "  ✗ git fetch a échoué — le VPS joint-il GitHub ?"; exit 1; }
echo "  miroir à jour (il ne sert qu'à git : rien n'y est exécuté)"
SRC_ROOT="$(mktemp -d)"
trap 'rm -rf "$SRC_ROOT"' EXIT
telecharger() {   # $1 = chemin dans le dépôt, $2 = fichier de sortie — au commit EXACT (SRC_SHA)
  curl -fsSL --max-time 60 -o "$2" "$RAW/$SRC_SHA/$1" 2>/dev/null && [ -s "$2" ]
}
for f in deployer-test.sh nginx-teamop-test.conf caddy-teamop-test.caddy stripe-essai-prix.js; do
  telecharger "server/$f" "$SRC_ROOT/$f" \
    || { echo "  ✗ server/$f est introuvable au commit ${SRC_SHA:0:8} de « $BRANCHE » (GitHub injoignable, ou cette branche ne porte pas l'espace de test). Choisis la branche qui le porte (TEAMOP_TEST_BRANCHE). Rien d'installé côté root."; exit 1; }
done
bash -n "$SRC_ROOT/deployer-test.sh" && grep -q "Déployeur de l'ESPACE DE TEST" "$SRC_ROOT/deployer-test.sh" \
  || { echo "  ✗ le déployeur téléchargé n'est pas celui de l'espace de test — rien n'est posé."; exit 1; }
grep -q '@@DOMAINE@@' "$SRC_ROOT/nginx-teamop-test.conf" && grep -q '^# ==== HTTPS' "$SRC_ROOT/nginx-teamop-test.conf" \
  && grep -q '@@DOMAINE@@' "$SRC_ROOT/caddy-teamop-test.caddy" && node --check "$SRC_ROOT/stripe-essai-prix.js" 2>/dev/null \
  || { echo "  ✗ un fichier téléchargé (modèle nginx, modèle Caddy, créateur de tarifs) n'a pas la forme attendue — rien n'est posé."; exit 1; }
mkdir -p "$SBIN"
cp "$SRC_ROOT/deployer-test.sh" "$DEPLOYEUR.nouveau"
chown root:root "$DEPLOYEUR.nouveau"
chmod 0755 "$DEPLOYEUR.nouveau"
mv -T "$DEPLOYEUR.nouveau" "$DEPLOYEUR"
echo "  déployeur de root posé : /usr/local/sbin/deployer-test (commit ${SRC_SHA:0:8}) — une demande de fusion ne peut plus le réécrire ; il ne change qu'en relançant ce script"
# La clé SSH de la CI, à COMMANDE FORCÉE : `restrict` coupe terminal, redirections de ports, agent et X11 ; `command=` remplace ce que le client demande (il n'arrive au déployeur que dans
# SSH_ORIGINAL_COMMAND, que celui-ci valide). Une clé volée dans GitHub ne donne PAS un shell root. On ne reçoit ici que la moitié PUBLIQUE ; la privée est faite chez Justin et part dans le secret GitHub.
mkdir -p "$SSHD"; chmod 700 "$SSHD"
touch "$AUTH"; chmod 600 "$AUTH"
if [ -n "$PUB_BLOB" ]; then
  LIGNE="restrict,command=\"/usr/local/sbin/deployer-test --ssh\" $PUB_TYPE $PUB_BLOB $MARQUE_SSH"
  # Une seule ligne à nous, remplacée à chaque passage : deux passages ne la dupliquent pas.
  grep -v " $MARQUE_SSH\$" "$AUTH" > "$AUTH.nouveau" || true
  printf '%s\n' "$LIGNE" >> "$AUTH.nouveau"
  mv -T "$AUTH.nouveau" "$AUTH"; chmod 600 "$AUTH"
  echo "  clé de déploiement de la CI posée (commande forcée : elle ne sait lancer que le déployeur de l'espace de test)"
elif grep -q " $MARQUE_SSH\$" "$AUTH"; then
  echo "  clé de déploiement de la CI déjà posée"
else
  echo "  ⚠️ pas de clé de déploiement : la CI ne pourra pas mettre une demande de fusion en essai (bash install-test.sh cle)"
fi

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
    echo "     de zéro, supprime-les (et seulement elles — garde le fichier agents-budget.json, il retient la dépense du mois) :"
    echo "       find /opt/teamop/test/data -mindepth 1 ! -name agents-budget.json -delete   puis relance ce script."
    echo "     (rm -rf /opt/teamop/test/data/* marche aussi, mais remet à zéro le compteur de dépense des agents.)"
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
# ⛔ La clé Anthropic de test est CELLE QU'ON LUI A DONNÉE, jamais celle de la production : l'ancienne version la copiait depuis /opt/teamop/config.json, où tout code de branche
# (service de test, fabrication des pages) pouvait la lire. Si une configuration d'avant porte encore la clé de la production, elle est VIDÉE ici (comparaison avec `$prod`, rien n'est affiché).
CONFIG_NEUVE="$(
  NOUVELLE_CLE="$(openssl rand -hex 32)" NOUVEL_APIKEY="$(openssl rand -hex 24)" NOUVEAU_CODE_DEVIS="$(openssl rand -hex 8)" \
  VAPID="$VAPID_JSON" STRIPE_SK="$STRIPE_SK" ANTHROPIC_SK="$ANTHROPIC_SK" ORIGINE="https://$DOMAINE" \
  jq -n --slurpfile avant "$SRC_AVANT" --slurpfile prod "$SRC_PROD" '
    def v(x): (env[x] // "");
    ([($prod[0].agents.cleApi // ""), ($prod[0].anthropic.cleApi // "")] | map(select(. != ""))) as $clesProd
    | ($avant[0] // {})
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
        | .cleApi = (if v("ANTHROPIC_SK") != "" then v("ANTHROPIC_SK") elif ((.cleApi // "") | IN($clesProd[])) then "" else (.cleApi // "") end))
    | .stripe = ((.stripe // {})
        | (if v("STRIPE_SK") != "" then .secretKey = v("STRIPE_SK") else . end))
    | .anthropic = ((.anthropic // { cleApi: "", secretDevis: v("NOUVEAU_CODE_DEVIS"), quotaJour: 100 })
        | .cleApi = (if ((.cleApi // "") | IN($clesProd[])) then "" else (.cleApi // "") end))'
)"
# ⛔ Garde-fous AVANT d'écrire : le mode test est posé, et aucune clé de production n'a pu entrer.
printf '%s' "$CONFIG_NEUVE" | jq -e '.espaceTest == true and .courrielsCaptes == true and (.espaceTestCle | test("^[0-9a-f]{64}$"))' >/dev/null \
  || { echo "  ✗ la configuration de test calculée est incohérente — rien n'est écrit."; exit 1; }
if printf '%s' "$CONFIG_NEUVE" | jq -e '(.stripe.secretKey // "") | test("live")' >/dev/null; then
  echo "  ⛔ la configuration de test porte une clé Stripe de production — rien n'est écrit. Relance : bash install-test.sh stripe"; exit 1
fi
if [ -f "$PROD_CONFIG" ] && printf '%s' "$CONFIG_NEUVE" | jq -e --slurpfile prod "$PROD_CONFIG" '[(.agents.cleApi // ""), (.anthropic.cleApi // "")] | map(select(. != "")) as $a | ([($prod[0].agents.cleApi // ""), ($prod[0].anthropic.cleApi // "")] | map(select(. != ""))) as $p | any($a[]; IN($p[]))' >/dev/null; then
  echo "  ⛔ la configuration de test porte une clé Anthropic de la PRODUCTION — rien n'est écrit. Relance : bash install-test.sh anthropic"; exit 1
fi
( umask 077; printf '%s\n' "$CONFIG_NEUVE" > "$CONFIG.nouveau" )
# root le possède, teamoptest le LIT (groupe) : le service n'a pas à réécrire sa configuration.
chown root:teamoptest "$CONFIG.nouveau"
chmod 640 "$CONFIG.nouveau"
mv -T "$CONFIG.nouveau" "$CONFIG"
CONFIG_NEUVE=""
echo "  configuration écrite (chmod 640, groupe teamoptest) : courriels captés, agents plafonnés à 10 $/mois"
config_a '(.agents.cleApi // "") != ""' \
  && echo "  clé des agents : celle de l'espace de test (la limite de 10 $/mois est CHEZ Anthropic, sur cette clé)" \
  || echo "  ⚠️ pas de clé Anthropic de test : les agents resteront muets en test (bash install-test.sh anthropic)"
config_a '(.stripe.secretKey // "") | test("^(sk|rk)_test_")' \
  && echo "  Stripe : clé de test en place" \
  || echo "  ⚠️ Stripe : pas de clé de test — les paiements de test sont éteints (bash install-test.sh stripe)"
# Les tarifs de TEST : les dix tarifs de production n'existent pas en mode test (« No such price »). `stripe-essai-prix.js` crée chez
# Stripe, en mode test, leurs équivalents (retrouvés par clé de recherche s'ils existent : rejouable) et écrit la table
# `stripe.prixEssai` dans la configuration, d'où le serveur de test et le fabricant des pages la lisent. Il refuse tout ce qui n'est pas
# une clé de test. Une panne de Stripe n'arrête pas l'installation : le reste de l'espace de test se joue sans le paiement.
# Le script lancé ici est celui TÉLÉCHARGÉ au commit exact (root le lance : il ne vient pas du miroir).
if config_a '(.stripe.secretKey // "") | test("^(sk|rk)_test_")'; then
  if a_demander stripe || ! config_a '((.stripe.prixEssai // {}) | length) == 10'; then
    if SORTIE_PRIX="$(TEAMOP_CONFIG="$CONFIG" node "$SRC_ROOT/stripe-essai-prix.js" 2>&1)"; then
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
# · User=teamoptest, ProtectSystem=strict : le service n'écrit QUE dans /opt/teamop/test/data et monitor.json ;
# · InaccessiblePaths : la production (données, configuration, FICHIER DE LA TOUR, dépôt, OP MESSAGES, OP Courrier), les clés, les certificats et les proxys lui sont invisibles,
#   même si une règle de droits se trompait un jour ;
# · TEAMOP_FB_ADMIN pointe un fichier qui n'existe pas : sans cette ligne, le serveur lirait la clé
#   d'administration Firebase de la PRODUCTION (/opt/teamop/firebase-admin.json) et pourrait agir dessus ;
# · EnvironmentFile : le commit servi (écrit par deployer-test), que le serveur peut publier.
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
InaccessiblePaths=-/opt/teamop/data -/opt/teamop/config.json -/opt/teamop/monitor.json -/opt/teamop/repo -/opt/teamop/firebase-admin.json -/opt/opmsg -/opt/opcourrier -/etc/teamop -/etc/letsencrypt -/etc/nginx -/etc/caddy -/root

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

# ══ 8. Le proxy et le certificat ══════════════════════════════════════════════════════════════
echo "── [8/9] $PROXY : $DOMAINE (pages derrière mot de passe, /api/ vers le serveur de test)…"
# Les pages avant le premier déploiement : un lien vers un petit mot d'attente.
if [ ! -e "$LIEN_PAGES" ]; then
  mkdir -p "$PAGES_D/vide"
  printf '%s\n' '<!doctype html><meta charset="utf-8"><title>Espace de test</title><p>Espace de test installé — le premier déploiement n est pas encore passé.</p>' > "$PAGES_D/vide/essais.html"
  chmod -R a+rX "$PAGES_D/vide"
  ln -sfn pages.d/vide "$LIEN_PAGES"
fi
dns_pret() {
  getent ahostsv4 "$DOMAINE" >/dev/null 2>&1 || {
    echo "  ✗ $DOMAINE ne se résout pas encore : la ligne DNS n'est pas posée, ou pas propagée."
    echo "    Pose l'enregistrement A (voir design/ESPACE-DE-TEST.md, étape 2), attends quelques minutes, relance ce script."
    echo "    Tout ce qui précède est fait et ne sera pas refait."; exit 1; }
}
if [ "$PROXY" = nginx ]; then
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
  MODELE="$SRC_ROOT/nginx-teamop-test.conf"
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
    dns_pret
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
else
  # Caddy : un fichier à nous, et UNE ligne `import` ajoutée au Caddyfile — le bloc d'api.teamop.fr n'est pas touché. Caddy obtient le certificat tout seul (pas de certbot).
  # Même discipline que server-msg/install-msg.sh : sauvegarde, `caddy validate` AVANT de recharger, tout remis comme avant si Caddy refuse.
  CADDYFILE="$CDY/Caddyfile"
  [ -f "$CADDYFILE" ] || { echo "  ✗ $CADDYFILE est introuvable — le Caddyfile de ce serveur n'est pas là où je l'attends. Rien n'est écrit côté proxy."; exit 1; }
  mkdir -p "$CDY/teamop-test"
  FICHIER_CDY="$CDY/teamop-test/test.caddy"
  # Le mot de passe des pages : un hachage bcrypt fait par htpasswd, le mot de passe lui-même arrive par l'ENTRÉE STANDARD (jamais sur une ligne de commande).
  if [ -n "$MDP" ]; then
    HACHAGE="$(printf '%s' "$MDP" | htpasswd -n -B -i -C 10 essai)"
    [[ "$HACHAGE" =~ ^essai:\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{40,}$ ]] || { echo "  ✗ htpasswd n'a pas rendu un hachage bcrypt — le mot de passe n'est pas enregistré, rien n'est écrit."; exit 1; }
    ( umask 027; printf '%s\n' "${HACHAGE#essai:}" > "$FICHIER_CDY_MDP.nouveau" )
    getent group caddy >/dev/null 2>&1 && chgrp caddy "$FICHIER_CDY_MDP.nouveau"
    chmod 640 "$FICHIER_CDY_MDP.nouveau"
    mv -T "$FICHIER_CDY_MDP.nouveau" "$FICHIER_CDY_MDP"
    HACHAGE=""; MDP=""
    echo "  mot de passe des pages enregistré (identifiant : essai)"
  else
    echo "  mot de passe des pages déjà en place"
  fi
  # `basic_auth` n'existe que depuis Caddy 2.8 ; avant, c'est `basicauth` (Ubuntu 24.04 livre 2.6).
  CV="$(caddy version 2>/dev/null | sed -n 's/^v\{0,1\}2\.\([0-9]\{1,\}\)\..*/\1/p' | head -1)"
  if [ "${CV:-0}" -ge 8 ]; then BASIC=basic_auth; else BASIC=basicauth; fi
  HACHAGE_PAGES="$(cat "$FICHIER_CDY_MDP")"
  rendre_caddy() {
    sed -e "s|@@DOMAINE@@|$DOMAINE|g" -e "s|@@PORT@@|$PORT|g" -e "s|@@PAGES@@|/opt/teamop/test/pages|g" -e "s|@@BASIC@@|$BASIC|g" -e "s|@@HASH@@|$HACHAGE_PAGES|g"
  }
  RENDU="$(rendre_caddy < "$SRC_ROOT/caddy-teamop-test.caddy")"
  LIGNE_IMPORT='import /etc/caddy/teamop-test/*.caddy'
  if [ -f "$FICHIER_CDY" ] && [ "$(cat "$FICHIER_CDY")" = "$RENDU" ] && grep -qxF "$LIGNE_IMPORT" "$CADDYFILE"; then
    echo "  Caddy à jour (rien à changer)"
  else
    [ -f "$FICHIER_CDY" ] || dns_pret   # Caddy demande son certificat dès qu'il charge le site : sans DNS il échouerait en boucle
    cp "$CADDYFILE" "$CADDYFILE.avant-test"
    [ ! -f "$FICHIER_CDY" ] || cp "$FICHIER_CDY" "$FICHIER_CDY.avant"
    ( umask 027; printf '%s\n' "$RENDU" > "$FICHIER_CDY" )
    getent group caddy >/dev/null 2>&1 && chgrp caddy "$FICHIER_CDY"
    chmod 640 "$FICHIER_CDY"
    grep -qxF "$LIGNE_IMPORT" "$CADDYFILE" || printf '\n%s\n' "$LIGNE_IMPORT" >> "$CADDYFILE"
    if ! caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1; then
      echo "  ⛔ Caddy refuse la configuration (caddy validate) — rien n'est rechargé, tout est remis comme avant."
      mv "$CADDYFILE.avant-test" "$CADDYFILE"
      if [ -f "$FICHIER_CDY.avant" ]; then mv "$FICHIER_CDY.avant" "$FICHIER_CDY"; else rm -f "$FICHIER_CDY"; fi
      exit 1
    fi
    rm -f "$CADDYFILE.avant-test" "$FICHIER_CDY.avant"
    systemctl reload caddy
    echo "  Caddy à jour (le certificat est demandé à Let's Encrypt par Caddy lui-même, à la première visite)"
  fi
  RENDU=""; HACHAGE_PAGES=""
fi

# ══ 9. Le premier déploiement ═════════════════════════════════════════════════════════════════
# D'abord on VÉRIFIE LA CELLULE sur cette machine : si le code d'une branche pouvait voir la production ou sortir par le réseau, rien n'est déployé.
echo "── [9/9] La cellule, puis le déploiement…"
if ! "$DEPLOYEUR" --sonde; then
  echo ""
  echo "  ⛔ La cellule où tournent les branches ne tient pas : rien n'est déployé. Recolle ce qui précède dans la conversation."
  exit 1
fi
# ⛔ Rejouer ne remplace pas la demande de fusion en cours d'essai : sans TEAMOP_TEST_BRANCHE posée à la main, on redéploie le commit DÉJÀ servi (même branche, même SHA).
# C'est nécessaire de toute façon : le serveur doit redémarrer pour relire une clé Stripe ou Anthropic neuve, et les pages se refabriquent avec la nouvelle table de tarifs.
D_SHA="$SRC_SHA"; D_BR="$BRANCHE"; D_TXT="Premier déploiement de « $BRANCHE » (${SRC_SHA:0:8})"
if [ -z "$BRANCHE_ARG" ] && [ -s "$OPT/commit-servi" ]; then
  read -r S_SHA S_BR _ < "$OPT/commit-servi" || true
  if [[ "${S_SHA:-}" =~ ^[0-9a-f]{40}$ ]] && [[ "${S_BR:-}" =~ ^[A-Za-z0-9._/-]{1,100}$ ]]; then
    D_SHA="$S_SHA"; D_BR="$S_BR"; D_TXT="Redéploiement du commit DÉJÀ en essai (« $S_BR », ${S_SHA:0:8}) — la branche en cours d'essai ne change pas"
  fi
fi
echo "  $D_TXT…"
echo "  (compte 1 à 3 minutes : le code et ses dépendances s'installent, rien ne s'affiche pendant ce temps — ne coupe pas)"
if ! "$DEPLOYEUR" "$D_SHA" "$D_BR"; then
  echo ""
  echo "  ⛔ L'installation est faite, mais le PREMIER DÉPLOIEMENT a échoué (voir plus haut)."
  echo "     Rien de la production n'a bougé. Recolle ce qui précède dans la conversation."
  exit 1
fi

echo ""
echo "── Vérifications locales"
H="$(curl -s --max-time 10 "http://127.0.0.1:$PORT/health" 2>/dev/null || true)"
printf '%s' "$H" | jq -e '.ok == true' >/dev/null 2>&1 && echo "  ✓ le serveur de test répond (/health ok)" || echo "  ✗ le serveur de test ne répond pas sur 127.0.0.1:$PORT"
# Caddy demande son certificat à la première visite : on laisse quelques secondes avant de conclure que les pages ne répondent pas.
CODE_PAGES=""
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  CODE_PAGES="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAINE/essais.html" 2>/dev/null || true)"
  [ "$CODE_PAGES" = "401" ] && break
  [ "$PROXY" = caddy ] || break
  sleep "$PAUSE"
done
[ "$CODE_PAGES" = "401" ] && echo "  ✓ les pages demandent le mot de passe (401 sans lui)" || echo "  ✗ les pages répondent $CODE_PAGES au lieu de 401 — le mot de passe n'est pas posé, ou le certificat n'est pas encore obtenu ?"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ Espace de test installé."
echo "════════════════════════════════════════════════════════════════"
echo "  Ouvre :  https://$DOMAINE/essais.html"
echo "  Identifiant : essai   ·   mot de passe : celui que tu viens de choisir"
if grep -q " $MARQUE_SSH\$" "$AUTH" 2>/dev/null; then
  echo "  Chaque demande de fusion du dépôt arrive ici après TON approbation de l'environnement « essai-test » (workflow « Espace de test »)."
else
  echo "  ⚠️ La CI ne peut pas encore déployer ici : il manque la clé publique de déploiement (bash install-test.sh cle)."
fi
echo "════════════════════════════════════════════════════════════════"
