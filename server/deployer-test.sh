#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════════════════════
#  Déployeur de l'ESPACE DE TEST — met un commit en essai sur test.teamop.fr.
#
#  Usage (sur le VPS, en root) :   /opt/teamop/test/repo/server/deployer-test.sh <sha de 40 hexadécimaux> <branche>
#  Appelé par `.github/workflows/deploiement-test.yml` à chaque poussée d'une demande de fusion, et par
#  `server/install-test.sh` pour le premier déploiement. Mode d'emploi : design/ESPACE-DE-TEST.md.
#
#  ⛔ CE SCRIPT NE TOUCHE JAMAIS À LA PRODUCTION. Il n'écrit rien dans /opt/teamop/data, ni dans
#  /opt/teamop/config.json, ni dans /opt/teamop/repo, ne relance ni n'arrête `teamop-api` : tout ce
#  qu'il crée vit sous /opt/teamop/test, et le seul service qu'il relance est `teamop-api-test`.
#  `tests/test-2988.js` lit ce fichier et refuse toute écriture hors de cet espace.
#
#  Ce qu'il fait, dans l'ordre — et RIEN n'est basculé tant que tout ce qui précède n'a pas réussi :
#    1. un verrou (un seul déploiement à la fois) ;
#    2. la mise à jour de SON miroir du dépôt (fetch du commit demandé, rien d'autre) ;
#    3. l'export du commit dans releases/<sha> (git archive) et `npm ci` EN TANT QUE `teamoptest` ;
#    4. si le déployeur de CE commit diffère de celui qui tourne, on repasse la main au plus récent
#       (le miroir garde le déployeur du jour de l'installation : sans ça, corriger ce fichier dans
#       une demande de fusion ne servirait qu'après une réinstallation) ;
#    5. la fabrication des pages dans un dossier NEUF (`scripts/essais-build.js`) ;
#    6. SEULEMENT ALORS la bascule du code (lien `current`), le redémarrage, le contrôle de /health ;
#       s'il ne répond pas sain : RETOUR au code d'avant, dit en toutes lettres ;
#    7. la bascule des pages (lien `pages`, par renommage : atomique), puis le ménage.
#  Un déploiement raté laisse donc l'ancien en service, et le DIT.
#
#  ⛔ IL N'AFFICHE JAMAIS UN JOURNAL NI UNE CONFIGURATION. La sortie d'un job GitHub est publique (le
#  dépôt l'est) et conservée 90 jours. La fabrication des pages connaît la clé des routes d'essai
#  (`espaceTestCle`) : sa sortie va dans un fichier du VPS (build.log, 0600), jamais à l'écran.
#
#  Variable pour les BANCS seulement : TEAMOP_TEST_RACINE (préfixe de tous les chemins).
# ══════════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail

SHA="${1:-}"
BRANCHE="${2:-}"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]]            || { echo "refusé : il faut un SHA complet (40 hexadécimaux)"; exit 2; }
[[ "$BRANCHE" =~ ^[A-Za-z0-9._/-]{1,100}$ ]] || { echo "refusé : nom de branche illisible (lettres, chiffres, . _ / - seulement)"; exit 2; }
[ "$#" -eq 2 ] || { echo "refusé : usage : deployer-test.sh <sha> <branche>"; exit 2; }

R="${TEAMOP_TEST_RACINE:-}"
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

# ⛔ « NON INSTALLÉ » SORT EN 0. On peut fusionner ce code avant que Justin ait installé l'espace de
# test : la CI ne doit pas rougir pour une machine qu'on n'a pas encore préparée. Et la phrase est
# dite, pour qu'un « vert » ne se lise pas comme « déployé ».
if [ ! -f "$FICHIER_UNITE" ] || [ ! -d "$MIROIR" ] || [ ! -f "$CONFIG" ]; then
  echo "non installé : l'espace de test n'est pas installé sur ce serveur — rien n'a été déployé"
  exit 0
fi
PORT="$(sed -n 's/^Environment=PORT=\([0-9]\{2,5\}\)$/\1/p' "$FICHIER_UNITE" | head -1)"
[ -n "$PORT" ] || { echo "✗ le port du serveur de test est illisible ($FICHIER_UNITE)"; exit 1; }

# ── 1. Un seul déploiement à la fois ──────────────────────────────────────────────────────
mkdir -p "$OPT"
exec 9>"$OPT/deployer.lock"
flock -w 600 9 || { echo "✗ un autre déploiement de l'espace de test dure depuis plus de 10 minutes"; exit 1; }

# Tout ce qui touche au code ou aux dépendances tourne EN TANT QUE `teamoptest`, jamais en root :
# un script d'installation d'une dépendance, ou un fabricant de pages venu d'une branche pas encore
# relue, ne doit pas disposer des droits de qui l'appelle.
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

# ── 3. La release : export, dépendances EN TANT QUE teamoptest ────────────────────────────
DEST="$RELEASES/$SHA"
if [ ! -f "$DEST/.pret" ]; then
  rm -rf "$DEST"
  mkdir -p "$DEST"
  chown teamoptest:teamoptest "$DEST"
  if ! git_miroir archive --format=tar "$SHA" | EN_TANT_QUE tar -x -C "$DEST"; then
    rm -rf "$DEST"
    echo "✗ l'export de $COURT a échoué — rien n'a changé, l'ancien reste en service (${ACTUEL:0:8})"
    exit 1
  fi
  if [ ! -f "$DEST/server/package.json" ] || [ ! -f "$DEST/server/index.js" ]; then
    rm -rf "$DEST"
    echo "✗ $COURT ne porte pas server/package.json et server/index.js — rien n'a changé, l'ancien reste en service"
    exit 1
  fi
  # `--ignore-scripts` : aucun script d'installation ne s'exécute (le serveur n'en a pas besoin).
  if ! EN_TANT_QUE env HOME="$DEST" npm_config_cache="$DEST/.npm-cache" \
       npm ci --omit=dev --ignore-scripts --no-audit --no-fund --prefix "$DEST/server" >/dev/null 2>&1; then
    rm -rf "$DEST"
    echo "✗ npm ci a échoué pour $COURT — rien n'a changé, l'ancien reste en service (${ACTUEL:0:8})"
    exit 1
  fi
  rm -rf "$DEST/.npm-cache"
  : > "$DEST/.pret"
fi

# ── 4. Le déployeur de CE commit, s'il diffère ────────────────────────────────────────────
if [ -z "${TEAMOP_TEST_RELANCE:-}" ] && [ -f "$DEST/server/deployer-test.sh" ] \
   && ! cmp -s "$0" "$DEST/server/deployer-test.sh"; then
  echo "le déployeur de $COURT diffère de celui qui tourne — on repasse la main au plus récent"
  TEAMOP_TEST_RELANCE=1 exec bash "$DEST/server/deployer-test.sh" "$SHA" "$BRANCHE"
fi

# ── 5. Les pages, dans un dossier NEUF ────────────────────────────────────────────────────
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
CODE=0
( cd "$DEST" && EN_TANT_QUE env TEAMOP_CONFIG="$CONFIG" TEAMOP_DATA="$DATA" \
    node scripts/essais-build.js "$PAGES_NEUVES" "$SHA" "$BRANCHE" ) >"$JOURNAL_BUILD" 2>&1 || CODE=$?
if [ "$CODE" != "0" ] || [ ! -f "$PAGES_NEUVES/essais.html" ]; then
  rm -rf "$PAGES_NEUVES"
  echo "✗ la fabrication des pages a échoué (code $CODE) — rien n'a changé, l'ancien reste en service (${ACTUEL:0:8})"
  echo "  la raison est dans $JOURNAL_BUILD, SUR le VPS (elle n'est pas recopiée ici : ce journal est public)"
  exit 1
fi
chmod -R a+rX "$PAGES_NEUVES"

# ── 6. Le code : bascule, redémarrage, contrôle — et RETOUR si ça ne tient pas ────────────
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

# ── 7. Les pages : bascule par renommage, puis le ménage ──────────────────────────────────
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
# Le miroir suit ce qui vient d'être servi : le prochain déploiement lance alors le déployeur du jour sans
# avoir à lui repasser la main (étape 4), et une réinstallation repart d'un miroir à jour. Sans danger pour
# le script qui tourne : soit il vient de la release (relancé à l'étape 4), soit il est identique à celui du
# commit (le dépôt ne réécrit pas un fichier qui ne change pas). Un échec ici n'est pas un échec du déploiement.
git_miroir checkout --quiet --force --detach "$SHA" >/dev/null 2>&1 || true
echo "routes d'essai : $ROUTES"
echo "déployé : $BRANCHE $COURT — https://test.teamop.fr/essais.html"
