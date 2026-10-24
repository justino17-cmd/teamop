#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════════════════════
#  Déployeur de l'ESPACE DE TEST — met un commit en essai sur test.teamop.fr.
#
#  ⛔ CE FICHIER VIT EN /usr/local/sbin/deployer-test (root:root, 0755), POSÉ PAR `server/install-test.sh` — JAMAIS dans un dossier que
#  le compte `teamoptest` peut écrire, et jamais relancé depuis une release (relecture adverse, 23 octobre 2026 : le déployeur d'avant se
#  relançait depuis le commit déployé, c'est-à-dire qu'une demande de fusion choisissait le script que root allait exécuter). Un déployeur
#  corrigé dans une demande de fusion ne sert qu'après une RÉINSTALLATION VOULUE (`bash /root/install-test.sh`, qui le retélécharge au
#  commit exact, par son SHA). Racine sur la branche = racine sur la machine : c'est le prix, et il est payé une fois, par Justin, les yeux ouverts.
#
#  Usage (sur le VPS, en root) :   deployer-test <sha de 40 hexadécimaux> <branche>
#          (par la CI)         :   clé SSH à COMMANDE FORCÉE `deployer-test --ssh`, la demande arrive dans SSH_ORIGINAL_COMMAND (« <sha> <branche> »)
#          (contrôle)          :   deployer-test --sonde        la cellule tient-elle ? (appelé par l'installeur avant le premier déploiement)
#  Appelé par `.github/workflows/deploiement-test.yml` (environnement protégé `essai-test`) et par `server/install-test.sh`.
#  Mode d'emploi : design/ESPACE-DE-TEST.md.
#
#  ⛔ CE SCRIPT NE TOUCHE JAMAIS À LA PRODUCTION. Il n'écrit rien dans /opt/teamop/data, ni dans
#  /opt/teamop/config.json, ni dans /opt/teamop/repo, ne relance ni n'arrête `teamop-api` : tout ce
#  qu'il crée vit sous /opt/teamop/test, et le seul service qu'il relance est `teamop-api-test`.
#  `tests/test-2988.js` lit ce fichier et refuse toute écriture hors de cet espace.
#
#  Ce qu'il fait, dans l'ordre — et RIEN n'est basculé tant que tout ce qui précède n'a pas réussi :
#    1. un verrou (un seul déploiement à la fois) ;
#    2. la mise à jour de SON miroir du dépôt (fetch du commit demandé, rien d'autre) ;
#    3. l'export du commit dans releases/<sha> (git archive → tar) et `npm ci`, chacun dans une CELLULE ;
#    4. la fabrication des pages dans un dossier NEUF (`scripts/essais-build.js`), dans une cellule, avec les tests de la modification
#       s'ils existent (`essais/parcours.json` du commit) ;
#    5. SEULEMENT ALORS la bascule du code (lien `current`), le redémarrage, le contrôle de /health ;
#       s'il ne répond pas sain : RETOUR au code d'avant, dit en toutes lettres ;
#    6. la bascule des pages (lien `pages`, par renommage : atomique), puis le ménage.
#  Un déploiement raté laisse donc l'ancien en service, et le DIT.
#
#  ⛔ LA CELLULE (`cellule`, relecture adverse du 23 octobre 2026). Tout ce qui exécute ou décompresse le CODE D'UNE BRANCHE (tar, npm ci, la
#  fabrication des pages) tourne dans une unité systemd éphémère (`systemd-run`), sous `teamoptest`, avec : un système de fichiers en lecture
#  seule SAUF le seul dossier qu'elle doit écrire ; la production, ses sauvegardes, les clés et les certificats INVISIBLES ; pas de privilèges
#  (NoNewPrivileges) ; et PAS DE RÉSEAU sauf pour `npm ci` (qui va chercher ses paquets). Avant, ces étapes passaient par un simple `runuser` :
#  le code d'une branche voyait tout le disque et pouvait sortir par le réseau. `deployer-test --sonde` le vérifie sur la machine réelle.
#  Si `systemd-run` manque ou refuse, le déploiement ÉCHOUE : on ne retombe jamais sur un `runuser` nu.
#
#  ⛔ IL N'AFFICHE JAMAIS UN JOURNAL NI UNE CONFIGURATION. La sortie d'un job GitHub est publique (le
#  dépôt l'est) et conservée 90 jours. La fabrication des pages connaît la clé des routes d'essai
#  (`espaceTestCle`) : sa sortie va dans un fichier du VPS (build.log, 0600), jamais à l'écran.
#
#  Variable pour les BANCS seulement : TEAMOP_TEST_RACINE (préfixe de tous les chemins). ⛔ Sous ssh elle est IGNORÉE : un chemin
#  ne se décide jamais depuis l'extérieur de la machine.
# ══════════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail

SONDE=0
if [ -n "${SSH_ORIGINAL_COMMAND:-}" ]; then
  # Appelé par la clé de la CI. ⛔ Cette clé est bornée à CE script par la ligne `command=` d'authorized_keys ; ce que le client demande
  # n'arrive que dans SSH_ORIGINAL_COMMAND, et c'est ICI qu'on le valide. Une clé sans cette borne (ligne écrite à la main) est refusée.
  R=""
  [ "$#" -eq 1 ] && [ "${1:-}" = "--ssh" ] || { echo "refusé : cette clé ne sert qu'à mettre un commit en essai (deployer-test --ssh)"; exit 2; }
  case "$SSH_ORIGINAL_COMMAND" in
    *$'\n'*|*$'\r'*) echo "refusé : la demande doit tenir sur une ligne"; exit 2 ;;
  esac
  read -r SHA BRANCHE RESTE <<<"$SSH_ORIGINAL_COMMAND" || true
  [ -z "${RESTE:-}" ] || { echo "refusé : trop de mots dans la demande (« <sha> <branche> » attendu)"; exit 2; }
else
  R="${TEAMOP_TEST_RACINE:-}"
  if [ "${1:-}" = "--sonde" ]; then
    SONDE=1; SHA=""; BRANCHE=""
    [ "$#" -eq 1 ] || { echo "refusé : usage : deployer-test --sonde"; exit 2; }
  else
    SHA="${1:-}"
    BRANCHE="${2:-}"
    [ "$#" -eq 2 ] || { echo "refusé : usage : deployer-test <sha> <branche>"; exit 2; }
  fi
fi
if [ "$SONDE" = "0" ]; then
  [[ "$SHA" =~ ^[0-9a-f]{40}$ ]]               || { echo "refusé : il faut un SHA complet (40 hexadécimaux)"; exit 2; }
  [[ "$BRANCHE" =~ ^[A-Za-z0-9._/-]{1,100}$ ]] || { echo "refusé : nom de branche illisible (lettres, chiffres, . _ / - seulement)"; exit 2; }
fi

OPT="$R/opt/teamop/test"
MIROIR="$OPT/repo"
RELEASES="$OPT/releases"
PAGES_D="$OPT/pages.d"
LIEN="$OPT/current"
LIEN_PAGES="$OPT/pages"
CONFIG="$OPT/config.json"
DATA="$OPT/data"
UNITE="teamop-api-test"
FICHIER_UNITE="$R/etc/systemd/system/$UNITE.service"
COURT="${SHA:0:8}"

# ── La cellule : tout ce qui touche au code d'une branche passe par ici, et par nulle part ailleurs ────────────────────────
# Ce que la cellule ne voit JAMAIS (le `-` devant chaque chemin : « ignorer s'il n'existe pas ») : la production d'OP GESTION (données, configuration,
# fichier de la Tour, dépôt, clé d'administration Firebase), celle d'OP MESSAGES et d'OP Courrier, la clé maître et les certificats, les
# configurations des deux proxys (le mot de passe des pages y est), et le dossier de root. Les chemins sont ABSOLUS même dans un banc : ce sont ceux de la vraie machine.
INVISIBLES="-/opt/teamop/data -/opt/teamop/config.json -/opt/teamop/monitor.json -/opt/teamop/repo -/opt/teamop/firebase-admin.json -/opt/opmsg -/opt/opcourrier -/etc/teamop -/etc/letsencrypt -/etc/nginx -/etc/caddy -/root"
# Les mêmes, plus ce que ces étapes-là n'ont aucune raison de lire : la configuration de TEST (clés d'essai, Stripe de test, clé des agents) et ses données.
INVISIBLES_STRICT="$INVISIBLES -/opt/teamop/test/config.json -/opt/teamop/test/data -/opt/teamop/test/monitor.json"
cellule() {   # cellule <oui|non : réseau> <dossier de travail> <dossier inscriptible> <invisibles> [VAR=valeur…] -- commande…
  local reseau="$1" cwd="$2" rw="$3" invisibles="$4"; shift 4
  local env=()
  while [ "$#" -gt 0 ] && [ "$1" != "--" ]; do env+=( -E "$1" ); shift; done
  [ "${1:-}" = "--" ] || { echo "✗ cellule : « -- » attendu avant la commande"; return 2; }
  shift
  local net=yes; [ "$reseau" != "oui" ] || net=no
  systemd-run --quiet --wait --pipe --collect \
    -p User=teamoptest -p Group=teamoptest \
    -p NoNewPrivileges=yes -p PrivateTmp=yes -p PrivateDevices=yes -p ProtectHome=yes -p ProtectSystem=strict \
    -p ProtectKernelTunables=yes -p ProtectKernelModules=yes -p ProtectControlGroups=yes -p RestrictSUIDSGID=yes \
    -p "PrivateNetwork=$net" -p "WorkingDirectory=$cwd" -p "ReadWritePaths=$rw" -p "InaccessiblePaths=$invisibles" \
    ${env[@]+"${env[@]}"} -- "$@"
}

# ── 0. Le contrôle de la cellule (--sonde) : elle tient, ou on ne déploie rien ────────────────────────────────────────────
if [ "$SONDE" = "1" ]; then
  command -v systemd-run >/dev/null 2>&1 || { echo "✗ systemd-run est absent : la cellule ne peut pas exister, rien ne sera déployé"; exit 1; }
  # Le script est écrit EN TOUTES LETTRES (rien n'est calculé depuis l'extérieur). Il tourne dans une cellule SANS réseau, dossier inscriptible : un dossier jetable.
  SONDE_DOSSIER="$OPT/sonde.d"
  rm -rf "$SONDE_DOSSIER"; mkdir -p "$SONDE_DOSSIER"; chown teamoptest:teamoptest "$SONDE_DOSSIER"
  # shellcheck disable=SC2016
  SCRIPT_SONDE='fuite=0
for p in /opt/teamop/data /opt/teamop/config.json /opt/teamop/monitor.json /opt/teamop/repo /opt/teamop/firebase-admin.json /etc/teamop /etc/letsencrypt /etc/nginx /root; do
  if [ -r "$p" ] || [ -x "$p" ]; then echo "  ✗ visible depuis la cellule : $p"; fuite=1; fi
done
if ( : > "$1/ecriture-hors-cellule" ) 2>/dev/null; then echo "  ✗ la cellule peut écrire HORS de son dossier ($1)"; rm -f "$1/ecriture-hors-cellule"; fuite=1; fi
if ( : > "$2/permis" ) 2>/dev/null; then rm -f "$2/permis"; else echo "  ✗ la cellule ne peut pas écrire dans SON dossier"; fuite=1; fi
if ( exec 3<>/dev/tcp/1.1.1.1/53 ) 2>/dev/null; then echo "  ✗ la cellule a du RÉSEAU"; fuite=1; fi
[ "$fuite" = 0 ] && echo "  la cellule tient" || true
exit $fuite'
  CODE_SONDE=0
  cellule non "$SONDE_DOSSIER" "$SONDE_DOSSIER" "$INVISIBLES_STRICT" -- bash -c "$SCRIPT_SONDE" teamop-sonde "$MIROIR" "$SONDE_DOSSIER" || CODE_SONDE=$?
  rm -rf "$SONDE_DOSSIER"
  if [ "$CODE_SONDE" != "0" ]; then
    echo "✗ la cellule NE TIENT PAS (code $CODE_SONDE) : le code d'une branche pourrait voir ou atteindre ce qu'il ne doit pas. Rien ne sera déployé. Recolle ce message."
    exit 1
  fi
  echo "✓ la cellule tient : production invisible, écriture bornée à son dossier, pas de réseau"
  exit 0
fi

# ⛔ « NON INSTALLÉ » SORT EN 0. On peut fusionner ce code avant que Justin ait installé l'espace de
# test : la CI ne doit pas rougir pour une machine qu'on n'a pas encore préparée. Et la phrase est
# dite, pour qu'un « vert » ne se lise pas comme « déployé ».
if [ ! -f "$FICHIER_UNITE" ] || [ ! -d "$MIROIR" ] || [ ! -f "$CONFIG" ]; then
  echo "non installé : l'espace de test n'est pas installé sur ce serveur — rien n'a été déployé"
  exit 0
fi
PORT="$(sed -n 's/^Environment=PORT=\([0-9]\{2,5\}\)$/\1/p' "$FICHIER_UNITE" | head -1)"
[ -n "$PORT" ] || { echo "✗ le port du serveur de test est illisible ($FICHIER_UNITE)"; exit 1; }
command -v systemd-run >/dev/null 2>&1 || { echo "✗ systemd-run est absent : on ne lance jamais le code d'une branche hors de sa cellule — rien n'a changé, l'ancien reste en service"; exit 1; }

# ── 1. Un seul déploiement à la fois ──────────────────────────────────────────────────────
mkdir -p "$OPT"
exec 9>"$OPT/deployer.lock"
flock -w 600 9 || { echo "✗ un autre déploiement de l'espace de test dure depuis plus de 10 minutes"; exit 1; }

# Git ne lance jamais le code d'une branche (fetch, cat-file, archive) : il tourne sous `teamoptest`, dans SON miroir.
EN_TANT_QUE() { runuser -u teamoptest -- "$@"; }
export GIT_TERMINAL_PROMPT=0
git_miroir() { EN_TANT_QUE git -c credential.helper= -C "$MIROIR" "$@"; }

# ── 2. Le miroir, à jour — LE SIEN ────────────────────────────────────────────────────────
# ⛔ Jamais /opt/teamop/repo : y avancer `main` ferait avancer les fichiers de `server/` de la
# production sur le disque sans redémarrer `teamop-api` — « code neuf sur le disque, ancien en mémoire ».
# Le commit demandé s'obtient d'abord par son SHA (GitHub l'accepte pour tout commit d'une branche),
# sinon par toutes les branches.
if ! git_miroir cat-file -e "$SHA^{commit}" 2>/dev/null; then
  git_miroir fetch --quiet origin "$SHA" 2>/dev/null \
    || git_miroir fetch --quiet origin '+refs/heads/*:refs/remotes/origin/*' 2>/dev/null \
    || { echo "✗ git fetch a échoué — le dépôt est-il joignable depuis le VPS ? L'ancien reste en service."; exit 1; }
fi
git_miroir cat-file -e "$SHA^{commit}" 2>/dev/null \
  || { echo "✗ le commit $COURT est inconnu du miroir (poussé sur GitHub ? branche d'un autre dépôt ?) — L'ancien reste en service."; exit 1; }

ACTUEL=""
[ -L "$LIEN" ] && ACTUEL="$(basename "$(readlink "$LIEN")")"
PAGES_ACTUELLES=""
[ -L "$LIEN_PAGES" ] && PAGES_ACTUELLES="$(readlink "$LIEN_PAGES")"

# ── 3. La release : export et dépendances, chacun dans sa cellule ─────────────────────────
DEST="$RELEASES/$SHA"
if [ ! -f "$DEST/.pret" ]; then
  echo "  (le code et ses dépendances s'installent : compte une à deux minutes, rien ne s'affiche pendant ce temps)"
  rm -rf "$DEST"
  mkdir -p "$DEST"
  chown teamoptest:teamoptest "$DEST"
  # git archive lit le dépôt (sous teamoptest) ; tar DÉCOMPRESSE le code de la branche : c'est lui qui est en cellule, écriture bornée à la release, sans réseau.
  if ! git_miroir archive --format=tar "$SHA" | cellule non "$DEST" "$DEST" "$INVISIBLES_STRICT" -- tar -x -C "$DEST"; then
    rm -rf "$DEST"
    echo "✗ l'export de $COURT a échoué — rien n'a changé, l'ancien reste en service (${ACTUEL:0:8})"
    exit 1
  fi
  if [ ! -f "$DEST/server/package.json" ] || [ ! -f "$DEST/server/index.js" ]; then
    rm -rf "$DEST"
    echo "✗ $COURT ne porte pas server/package.json et server/index.js — rien n'a changé, l'ancien reste en service"
    exit 1
  fi
  # `--ignore-scripts` : aucun script d'installation ne s'exécute (le serveur n'en a pas besoin). Le réseau est ouvert (le registre npm), rien d'autre ne l'est.
  if ! cellule oui "$DEST" "$DEST" "$INVISIBLES_STRICT" HOME="$DEST" npm_config_cache="$DEST/.npm-cache" -- \
       npm ci --omit=dev --ignore-scripts --no-audit --no-fund --prefix "$DEST/server" >/dev/null 2>&1; then
    rm -rf "$DEST"
    echo "✗ npm ci a échoué pour $COURT — rien n'a changé, l'ancien reste en service (${ACTUEL:0:8})"
    exit 1
  fi
  rm -rf "$DEST/.npm-cache"
  : > "$DEST/.pret"
fi

# ── 4. Les pages, dans un dossier NEUF ────────────────────────────────────────────────────
# Le fabricant lit la configuration de test (la clé des routes d'essai s'imprime dans les liens de
# `essais.html`) : sa sortie ne va JAMAIS à l'écran — voir l'en-tête.
STAMP="$(date +%Y%m%d%H%M%S)"
PAGES_NEUVES="$PAGES_D/$STAMP-$COURT"
JOURNAL_BUILD="$OPT/build.log"
mkdir -p "$PAGES_D"
rm -rf "$PAGES_NEUVES"
mkdir -p "$PAGES_NEUVES"
chown teamoptest:teamoptest "$PAGES_NEUVES"
: > "$JOURNAL_BUILD"; chmod 600 "$JOURNAL_BUILD"; chown teamoptest:teamoptest "$JOURNAL_BUILD"
if [ ! -f "$DEST/scripts/essais-build.js" ]; then
  rm -rf "$PAGES_NEUVES"
  echo "✗ $COURT ne porte pas scripts/essais-build.js (le fabricant des pages de test) — rien n'a changé, l'ancien reste en service"
  exit 1
fi
# Les tests PROPRES À CETTE MODIFICATION : un fichier du commit, donc porté par la demande de fusion (`essais/parcours.json`). Sans lui, la page de test
# le DIT (« Aucun test propre à cette modification n'est fourni ») — jamais un parcours de base qu'on prendrait pour celui de la modification.
ARGS_PARCOURS=()
if [ -f "$DEST/essais/parcours.json" ]; then
  ARGS_PARCOURS=( --parcours "$DEST/essais/parcours.json" )
  echo "tests de la modification : essais/parcours.json"
else
  echo "tests de la modification : aucun (pas de essais/parcours.json dans ce commit) — la page de test le dit"
fi
CODE=0
cellule non "$DEST" "$PAGES_NEUVES" "$INVISIBLES" TEAMOP_CONFIG="$CONFIG" TEAMOP_DATA="$DATA" -- \
    node scripts/essais-build.js "$PAGES_NEUVES" "$SHA" "$BRANCHE" ${ARGS_PARCOURS[@]+"${ARGS_PARCOURS[@]}"} >"$JOURNAL_BUILD" 2>&1 || CODE=$?
if [ "$CODE" != "0" ] || [ ! -f "$PAGES_NEUVES/essais.html" ]; then
  rm -rf "$PAGES_NEUVES"
  echo "✗ la fabrication des pages a échoué (code $CODE) — rien n'a changé, l'ancien reste en service (${ACTUEL:0:8})"
  echo "  la raison est dans $JOURNAL_BUILD, SUR le VPS (elle n'est pas recopiée ici : ce journal est public)"
  exit 1
fi
chmod -R a+rX "$PAGES_NEUVES"

# ── 5. Le code : bascule, redémarrage, contrôle — et RETOUR si ça ne tient pas ────────────
ESSAIS_SANTE=40; PAUSE_SANTE=1
[ -z "$R" ] || { ESSAIS_SANTE="${TEAMOP_TEST_ESSAIS_SANTE:-40}"; PAUSE_SANTE="${TEAMOP_TEST_PAUSE_SANTE:-1}"; }
verifier() {   # $1 = SHA attendu ; imprime l'état et rend 0 si /health est ok (et, s'il publie un sha, le bon)
  local essai=0 corps=""
  while [ "$essai" -lt "$ESSAIS_SANTE" ]; do
    corps="$(curl -sf --max-time 3 "http://127.0.0.1:$PORT/health" 2>/dev/null || true)"
    if [ -n "$corps" ] && printf '%s' "$corps" | jq -e --arg s "$1" \
         '.ok == true and ((.sha // "") == "" or ($s | startswith(.sha)))' >/dev/null 2>&1; then
      echo "/health : ok"
      return 0
    fi
    essai=$((essai + 1)); sleep "$PAUSE_SANTE"
  done
  echo "/health : pas de réponse saine après $ESSAIS_SANTE essais"
  return 1
}
basculer() {   # $1 = dossier de release visé ; renommage : le lien n'est jamais absent
  ln -sfn "$1" "$LIEN.nouveau"
  mv -T "$LIEN.nouveau" "$LIEN"
}
poser_commit() {   # $1 = sha, $2 = branche — lu par l'unité (EnvironmentFile) ; le serveur peut le publier
  printf 'TEAMOP_COMMIT=%s\nTEAMOP_BRANCHE=%s\n' "$1" "$2" > "$OPT/commit.env.nouveau"
  mv -T "$OPT/commit.env.nouveau" "$OPT/commit.env"
}
ANCIEN_COMMIT_ENV=""
[ -f "$OPT/commit.env" ] && ANCIEN_COMMIT_ENV="$(cat "$OPT/commit.env")"

PRECEDENT=""
[ -n "$ACTUEL" ] && [ "$ACTUEL" != "$SHA" ] && [ -d "$RELEASES/$ACTUEL" ] && PRECEDENT="$RELEASES/$ACTUEL"
basculer "$DEST"
poser_commit "$SHA" "$BRANCHE"
AVANT_TXT="${ACTUEL:0:8}"; [ -n "$ACTUEL" ] || AVANT_TXT="première release"
echo "bascule du code : $AVANT_TXT → $COURT"
OK=0
if systemctl restart "$UNITE" && verifier "$SHA"; then OK=1; fi

if [ "$OK" != "1" ]; then
  rm -rf "$PAGES_NEUVES"
  echo "⛔ $COURT ne tient pas — retour arrière"
  if [ "$ACTUEL" = "$SHA" ]; then
    # Même code qu'avant : le lien n'a pas bougé, il n'y a pas de « précédent » à rejoindre — et on ne
    # le retire surtout pas, ce serait éteindre un espace de test qui marchait.
    echo "même release qu'avant : rien où revenir — lire le journal SUR le VPS : journalctl -u $UNITE -n 50"
  elif [ -n "$PRECEDENT" ]; then
    basculer "$PRECEDENT"
    if [ -n "$ANCIEN_COMMIT_ENV" ]; then printf '%s\n' "$ANCIEN_COMMIT_ENV" > "$OPT/commit.env.nouveau"; mv -T "$OPT/commit.env.nouveau" "$OPT/commit.env"; fi
    systemctl restart "$UNITE" || true
    if verifier "$ACTUEL"; then echo "retour arrière réussi : l'ancien code est revenu en service (${ACTUEL:0:8}), les pages n'ont pas bougé"
    else echo "⛔⛔ le retour arrière ne répond pas non plus — lire le journal SUR le VPS : journalctl -u $UNITE -n 50"; fi
  else
    # Première installation : il n'y a rien où revenir. On ne laisse pas tourner un service que le
    # contrôle a refusé.
    rm -f "$LIEN"
    systemctl stop "$UNITE" || true
    echo "première installation en échec : le service de test est arrêté — lire le journal SUR le VPS : journalctl -u $UNITE -n 50"
  fi
  exit 1
fi

# Les routes d'essai existent-elles dans ce commit ? (Une branche d'avant le mode test n'en a pas : ce
# n'est pas une erreur, c'est une information. Sans clé, une route montée répond 403 ; absente, 404.)
ROUTES="absentes (ce commit ne porte pas le mode test)"
CODE_ROUTE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$PORT/api/essais/courriels" 2>/dev/null || true)"
case "$CODE_ROUTE" in 401|403) ROUTES="présentes (fermées sans la clé : $CODE_ROUTE)" ;; 200) ROUTES="⚠️ ouvertes SANS clé (200) — à corriger" ;; esac

# ── 6. Les pages : bascule par renommage, puis le ménage ──────────────────────────────────
if [ -e "$LIEN_PAGES" ] && [ ! -L "$LIEN_PAGES" ]; then
  # Une seule fois : le dossier d'avant (l'installeur pose un LIEN, pas un dossier). On le range à part.
  mv "$LIEN_PAGES" "$PAGES_D/ancien-$STAMP"
fi
ln -sfn "$PAGES_NEUVES" "$LIEN_PAGES.nouveau"
mv -T "$LIEN_PAGES.nouveau" "$LIEN_PAGES"
printf '%s %s %s\n' "$SHA" "$BRANCHE" "$STAMP" > "$OPT/commit-servi.nouveau"
mv -T "$OPT/commit-servi.nouveau" "$OPT/commit-servi"

[ -z "$PRECEDENT" ] || ln -sfn "$PRECEDENT" "$OPT/precedent"
# Le ménage : on garde les trois dernières releases et les trois dernières fabrications de pages,
# jamais la courante, la précédente, ni les pages servies.
find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n +4 | cut -d' ' -f2- \
  | while IFS= read -r vieux; do
      [ "$vieux" = "$DEST" ] || [ "$vieux" = "$PRECEDENT" ] || rm -rf "$vieux"
    done
find "$PAGES_D" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n +4 | cut -d' ' -f2- \
  | while IFS= read -r vieux; do
      [ "$vieux" = "$PAGES_NEUVES" ] || [ "$vieux" = "$PAGES_ACTUELLES" ] || rm -rf "$vieux"
    done

if ! grep -q "${SHA:0:7}" "$PAGES_NEUVES/essais.html" 2>/dev/null; then
  echo "⚠️ essais.html ne cite pas le commit ${SHA:0:7} — vérifier la fabrication des pages"
fi
echo "routes d'essai : $ROUTES"
echo "déployé : $BRANCHE $COURT — https://test.teamop.fr/essais.html"
