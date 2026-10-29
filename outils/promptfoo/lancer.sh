#!/usr/bin/env bash
# Évaluation des prompts des agents de la Tour avec promptfoo — LE SEUL point d'entrée (28 octobre 2026). Voir LISEZMOI.md.
#
#   bash outils/promptfoo/lancer.sh installer             installe promptfoo (version FIXÉE) hors du dépôt
#   bash outils/promptfoo/lancer.sh preuve                les 32 cas avec les réponses écrites à la main : la bonne passe, la mauvaise tombe (sans clé, sans réseau)
#   bash outils/promptfoo/lancer.sh estimer [--complet]   le coût annoncé, sans rien envoyer
#   bash outils/promptfoo/lancer.sh reel [--complet] [--oui]   l'évaluation RÉELLE, sur le VPS : modèle des agents, petit jeu, coût annoncé puis confirmé
#
# ⛔ Ce script pose, AVANT promptfoo : la coupure de la télémétrie, des mises à jour, du partage et de la génération distante ; le garde-réseau (garde-reseau.js : aucune connexion hors
#    de la liste, et celle-ci est VIDE hors évaluation réelle, puis api.anthropic.com seul) ; un dossier de travail hors du dépôt. Les réglages ne suffisent pas à eux seuls — voir
#    l'en-tête de garde-reseau.js : promptfoo envoie encore un évènement « telemetry disabled » quand on le coupe.
# ⛔ La clé de l'API n'est jamais lue ici : le fournisseur la lit dans la configuration du serveur, au moment de l'appel, et ne l'écrit nulle part. Ce script ne fait JAMAIS `set -x`,
#    `env`, `printenv` ni `cat` de la configuration.
set -euo pipefail

readonly PF_VERSION="0.125.1"
RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$RACINE/outils/promptfoo"
PF_DIR="${TEAMOP_PF_DIR:-$HOME/.teamop-promptfoo}"
SORTIES="${TEAMOP_PF_SORTIE:-$PF_DIR/sorties}"
PLAFOND_USD="${TEAMOP_PF_PLAFOND_USD:-2}"

utilisation() { sed -n '3,8p' "$0" | sed 's/^# \{0,1\}//'; }
echoerr() { printf '%s\n' "$*" >&2; }

installer() {
  command -v node >/dev/null 2>&1 || { echoerr "node est absent : rien à installer"; exit 1; }
  mkdir -p "$PF_DIR"
  if [ ! -f "$PF_DIR/package.json" ]; then printf '{"name":"teamop-promptfoo","private":true}\n' > "$PF_DIR/package.json"; fi
  local bin="$PF_DIR/node_modules/.bin/promptfoo"
  if [ -x "$bin" ] && [ "$("$bin" --version 2>/dev/null || true)" = "$PF_VERSION" ]; then echo "promptfoo $PF_VERSION déjà installé dans $PF_DIR"; return 0; fi
  echo "Installation de promptfoo $PF_VERSION dans $PF_DIR (hors du dépôt, sans scripts d'installation)"
  # --ignore-scripts : aucun script d'une dépendance ne s'exécute à l'installation ; --save-exact : la version ne bouge jamais d'elle-même
  ( cd "$PF_DIR" && npm install "promptfoo@$PF_VERSION" --save-exact --ignore-scripts --no-audit --no-fund >/dev/null )
  [ "$("$bin" --version 2>/dev/null || true)" = "$PF_VERSION" ] || { echoerr "promptfoo $PF_VERSION ne répond pas après l'installation"; exit 1; }
}

# Les réglages communs. $1 : les hôtes permis par le garde-réseau (vide = aucun hôte distant).
preparer() {
  local hotes="$1"
  local bin="$PF_DIR/node_modules/.bin/promptfoo"
  [ -x "$bin" ] || installer
  mkdir -p "$PF_DIR/donnees" "$SORTIES"
  chmod 700 "$PF_DIR" "$SORTIES" 2>/dev/null || true
  export PROMPTFOO_DISABLE_TELEMETRY=1 PROMPTFOO_DISABLE_UPDATE=1 PROMPTFOO_DISABLE_SHARING=1
  export PROMPTFOO_DISABLE_REMOTE_GENERATION=1 PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION=1 PROMPTFOO_DISABLE_REDTEAM_MODERATION=1
  export PROMPTFOO_CONFIG_DIR="$PF_DIR/donnees"
  export TEAMOP_PF_HOTES="$hotes"
  # on AJOUTE au NODE_OPTIONS existant (le conteneur de travail y pose déjà --use-openssl-ca) au lieu de le remplacer
  export NODE_OPTIONS="${NODE_OPTIONS:-} --require \"$DIR/garde-reseau.js\""
}

# Une évaluation. $1 : mode (simule|reel) ; $2 : fichier de sortie ; les arguments suivants vont à promptfoo.
evaluer() {
  local mode="$1" sortie="$2"; shift 2
  local rc=0
  ( cd "$DIR" && TEAMOP_PF_MODE="$mode" "$PF_DIR/node_modules/.bin/promptfoo" eval -c promptfooconfig.yaml --no-cache --no-share --no-table -o "$sortie" "$@" ) || rc=$?
  # promptfoo sort en 100 quand des cas tombent : c'est une réponse, pas une panne ; toute autre valeur non nulle en est une
  if [ "$rc" -ne 0 ] && [ "$rc" -ne 100 ]; then echoerr "promptfoo a échoué (code $rc) avant de rendre un résultat"; exit 1; fi
  return 0
}

cmd_preuve() {
  preparer ""
  local stamp; stamp="$(date +%Y%m%d-%H%M%S)"
  local bonne="$SORTIES/preuve-bonne-$stamp.json" mauvaise="$SORTIES/preuve-mauvaise-$stamp.json"
  echo "── 1/2 · les réponses BONNES (écrites à la main) : toutes les assertions doivent passer ──"
  TEAMOP_PF_QUALITE=bonne evaluer simule "$bonne" >/dev/null 2>"$SORTIES/preuve-bonne-$stamp.log"
  node "$DIR/resume.js" "$bonne" --attendu bonne
  echo
  echo "── 2/2 · les réponses MAUVAISES (écrites à la main) : chacune doit tomber, sur les assertions que le cas nomme ──"
  TEAMOP_PF_QUALITE=mauvaise evaluer simule "$mauvaise" >/dev/null 2>"$SORTIES/preuve-mauvaise-$stamp.log"
  node "$DIR/resume.js" "$mauvaise" --attendu mauvaise
  echo
  local bloques; bloques="$(cat "$SORTIES"/preuve-*-"$stamp.log" | grep -c 'garde-réseau' || true)"
  echo "Garde-réseau : $bloques tentative(s) de connexion distante refusée(s) pendant la preuve (aucune ne doit atteindre le réseau)."
  echo "Résultats gardés dans $SORTIES (hors du dépôt)."
}

cmd_estimer() {
  local jeu="petit"; [ "${1:-}" = "--complet" ] && jeu="complet"
  node "$DIR/estimer.js" --jeu "$jeu"
}

cmd_reel() {
  local jeu="petit" oui=0
  for a in "$@"; do case "$a" in --complet) jeu="complet" ;; --oui) oui=1 ;; *) echoerr "option inconnue : $a"; exit 2 ;; esac; done
  local config="${TEAMOP_CONFIG:-/opt/teamop/config.json}"
  [ -r "$config" ] || { echoerr "$config est illisible : l'évaluation réelle se lance sur le VPS (la clé des agents y vit, jamais ici)"; exit 1; }
  # la présence d'une clé se vérifie SANS l'afficher : le code de sortie seul répond
  if ! node -e "require(process.argv[1]).lireCle()" "$DIR/fournisseur-teamop.js" >/dev/null 2>&1; then
    echoerr "aucune clé trouvée dans le champ ${TEAMOP_PF_CLE_CHAMP:-agents.cleApi} de $config (la clé des agents, celle de cerveau.js)"; exit 1
  fi
  node "$DIR/estimer.js" --jeu "$jeu" || { echoerr "Estimation impossible : rien n'est envoyé."; exit 1; }
  local haute; haute="$(node "$DIR/estimer.js" --jeu "$jeu" --json | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).borneHauteUsd)")"
  if node -e "process.exit(Number(process.argv[1]) > Number(process.argv[2]) ? 0 : 1)" "$haute" "$PLAFOND_USD"; then
    echoerr "La borne haute ($haute \$) dépasse le plafond de cette évaluation ($PLAFOND_USD \$ : TEAMOP_PF_PLAFOND_USD). Rien n'est envoyé."; exit 1
  fi
  echo "Ce qui part : le prompt de chaque cas (cas fictifs, aucun courriel ni dossier de client) à api.anthropic.com, et rien nulle part ailleurs."
  if [ "$oui" -ne 1 ]; then
    [ -t 0 ] || { echoerr "Pas de terminal pour confirmer : relancer avec --oui si le coût annoncé convient."; exit 1; }
    local rep; read -r -p "Lancer l'évaluation réelle ? (oui/non) " rep
    [ "$rep" = "oui" ] || { echo "Abandon : rien n'est envoyé."; exit 0; }
  fi
  preparer "api.anthropic.com"
  local sortie; sortie="$SORTIES/reel-$(date +%Y%m%d-%H%M%S).json"
  local filtre=(); [ "$jeu" = "petit" ] && filtre=(--filter-metadata jeu=petit)
  evaluer reel "$sortie" ${filtre[@]+"${filtre[@]}"} >/dev/null 2>"$sortie.log"
  echo
  node "$DIR/resume.js" "$sortie" --attendu libre || { echo "Détail et prompts réels : $sortie (hors du dépôt)."; exit 1; }
  echo "Résultats gardés dans $sortie (hors du dépôt)."
}

case "${1:-}" in
  installer) installer ;;
  preuve) cmd_preuve ;;
  estimer) shift; cmd_estimer "$@" ;;
  reel) shift; cmd_reel "$@" ;;
  *) utilisation; exit 2 ;;
esac
