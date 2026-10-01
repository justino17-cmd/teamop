#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════════════════════
#  Déployeur d'OP MESSAGES — posé par `install-msg.sh` dans /opt/opmsg/deployer.sh, possédé par root.
#
#  Usage direct (sur le VPS) :  /opt/opmsg/deployer.sh <beta|prod> <sha de 40 hexadécimaux> [retour]
#  Usage par la CI : la clé `VPS_SSH_KEY_MSG` est à COMMANDE FORCÉE sur ce fichier ; ce que la CI
#  demande (« beta <sha> ») n'arrive que dans SSH_ORIGINAL_COMMAND, et c'est ICI qu'on le valide.
#
#  Ce qu'il fait, dans l'ordre : un verrou, la mise à jour de SON miroir du dépôt, l'export de
#  releases/<sha>, `npm ci` en tant que `opmsg`, la bascule du lien `current`, le redémarrage, puis
#  le contrôle que /health rend LE BON SHA. En cas d'échec : retour au lien précédent.
#
#  ⛔ IL N'AFFICHE JAMAIS DE JOURNAL, NI DE CONFIGURATION. La sortie d'un job GitHub est publique
#  (le dépôt l'est) et conservée 90 jours : ici ne sort que l'état de /health (ok, instance, sha).
#  Le journal du service se lit SUR le VPS, par quelqu'un qui y a accès.
# ══════════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# OPMSG_RACINE : préfixe de chemins pour les BANCS uniquement. ⛔ Sous ssh il est ignoré : un
# chemin ne se décide jamais depuis l'extérieur de la machine.
R="${OPMSG_RACINE:-}"
if [ -n "${SSH_ORIGINAL_COMMAND:-}" ]; then
  R=""
  [ "$#" -eq 0 ] || { echo "refusé : arguments inattendus"; exit 2; }
  case "$SSH_ORIGINAL_COMMAND" in
    *$'\n'*|*$'\r'*) echo "refusé : la demande doit tenir sur une ligne"; exit 2 ;;
  esac
  read -r CIBLE SHA OPTION RESTE <<<"$SSH_ORIGINAL_COMMAND" || true
  [ -z "${RESTE:-}" ] || { echo "refusé : trop de mots dans la demande"; exit 2; }
else
  CIBLE="${1:-}"; SHA="${2:-}"; OPTION="${3:-}"
fi
[[ "$CIBLE" =~ ^(beta|prod)$ ]]       || { echo "refusé : l'instance doit valoir beta ou prod"; exit 2; }
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]]        || { echo "refusé : il faut un SHA complet (40 hexadécimaux)"; exit 2; }
[[ "${OPTION:-}" =~ ^(retour)?$ ]]    || { echo "refusé : seule l'option « retour » existe"; exit 2; }

OPT="$R/opt/opmsg"
ETC="$R/etc/opmsg"
SYSD="$R/etc/systemd/system"
MIROIR="$OPT/repo"
BASE="$OPT/$CIBLE"
LIEN="$BASE/current"
UNITE="teamop-msg@$CIBLE"

# ⛔ « NON INSTALLÉ » SORT EN 0. On peut fusionner le code d'OP MESSAGES avant d'avoir installé le
# service : la CI ne doit pas rougir pour une machine qu'on n'a pas encore préparée. Et la phrase est
# dite, pour qu'un « vert » ne se lise pas comme « déployé ».
if [ ! -f "$SYSD/teamop-msg@.service" ] || [ ! -f "$ETC/$CIBLE.json" ] || [ ! -d "$MIROIR" ] || [ ! -f "$ETC/$CIBLE.env" ]; then
  echo "non installé : OP MESSAGES ($CIBLE) n'est pas installé sur ce serveur — rien n'a été déployé"
  exit 0
fi
PORT="$(sed -n 's/^PORT=\([0-9]\{2,5\}\)$/\1/p' "$ETC/$CIBLE.env" | head -1)"
[ -n "$PORT" ] || { echo "✗ le port de $CIBLE est illisible ($ETC/$CIBLE.env)"; exit 1; }

# ── Un seul déploiement à la fois ─────────────────────────────────────────────────────────
mkdir -p "$OPT"
exec 9>"$OPT/deployer.lock"
flock -w 600 9 || { echo "✗ un autre déploiement d'OP MESSAGES dure depuis plus de 10 minutes"; exit 1; }

# ── 1. Le miroir, à jour — LE SIEN ───────────────────────────────────────────────────────
# ⛔ Jamais /opt/teamop/repo : y avancer `main` ferait avancer les fichiers de `server/` d'OP GESTION
# sur le disque sans redémarrer `teamop-api` — « code neuf sur le disque, ancien en mémoire ».
export GIT_TERMINAL_PROMPT=0
git_miroir() { git -c credential.helper= --git-dir="$MIROIR" "$@"; }
git_miroir fetch --prune --quiet origin
git_miroir cat-file -e "$SHA^{commit}" 2>/dev/null || { echo "✗ le commit ${SHA:0:8} est inconnu du miroir"; exit 1; }
# Seul ce qui est sur `main` se déploie : une branche non relue ne doit pas atteindre le VPS.
git_miroir merge-base --is-ancestor "$SHA" refs/heads/main \
  || { echo "✗ le commit ${SHA:0:8} n'est pas sur main — rien n'est déployé"; exit 1; }

ACTUEL=""
[ -L "$LIEN" ] && ACTUEL="$(basename "$(readlink -f "$LIEN")")"
if [ "$ACTUEL" = "$SHA" ] && [ -f "$BASE/releases/$SHA/.pret" ]; then
  echo "déjà en service : ${SHA:0:8}"
fi
# ⛔ DEUX POUSSÉES RAPPROCHÉES PEUVENT ARRIVER DANS LE DÉSORDRE : A puis B partent, mais le runner de B
# finit avant celui de A. Déployer A ensuite ferait RECULER le service d'un commit. Un SHA plus ancien
# que celui en service est donc ignoré — sauf demande explicite (option « retour »).
if [ -n "$ACTUEL" ] && [ "$ACTUEL" != "$SHA" ] && [ "${OPTION:-}" != "retour" ] \
   && git_miroir cat-file -e "$ACTUEL^{commit}" 2>/dev/null \
   && git_miroir merge-base --is-ancestor "$SHA" "$ACTUEL"; then
  echo "ignoré : ${SHA:0:8} est plus ancien que ${ACTUEL:0:8}, déjà en service (pour reculer, demander « retour »)"
  exit 0
fi

# ── 2. La release : export, dépendances EN TANT QUE opmsg ─────────────────────────────────
DEST="$BASE/releases/$SHA"
if [ ! -f "$DEST/.pret" ]; then
  rm -rf "$DEST"
  mkdir -p "$DEST"
  git_miroir archive --format=tar "$SHA" server-msg | tar -x -C "$DEST" --strip-components=1
  [ -f "$DEST/package.json" ] && [ -f "$DEST/index.js" ] || { rm -rf "$DEST"; echo "✗ ${SHA:0:8} ne porte pas server-msg/package.json et index.js"; exit 1; }
  # ⛔ `npm ci` tourne sous `opmsg`, pas sous root : un script d'installation d'une dépendance
  # compromise s'exécuterait avec les droits de qui l'appelle. Et `--ignore-scripts` : aucun.
  chown -R opmsg:opmsg "$DEST"
  if ! runuser -u opmsg -- env HOME="$DEST" npm_config_cache="$DEST/.npm-cache" \
       npm ci --omit=dev --ignore-scripts --no-audit --no-fund --prefix "$DEST" >/dev/null 2>&1; then
    rm -rf "$DEST"
    echo "✗ npm ci a échoué pour ${SHA:0:8} — rien n'a changé, le service reste sur ${ACTUEL:0:8}"
    exit 1
  fi
  rm -rf "$DEST/.npm-cache"
  # Une fois installée, la release est à root et ne s'écrit plus : le service ne peut pas réécrire
  # son propre code.
  chown -R root:root "$DEST"
  chmod -R go-w "$DEST"
  : > "$DEST/.pret"
fi

# ── 3. Contrôle de /health : le BON SHA, pas seulement « ça répond » ──────────────────────
# Un service qui répond avec l'ANCIEN code (la bascule n'a pas pris, le lanceur lit un autre lien)
# serait « sain » pour un contrôle d'ok:true — c'est la comparaison au SHA qui dit la vérité. Le SHA
# publié peut être abrégé (7 caractères au moins) : on exige qu'il soit le DÉBUT de celui qu'on attend.
# 40 essais d'une seconde : un démarrage à froid de Node (et l'ouverture de la base) tient largement dedans.
# Les bancs le raccourcissent (OPMSG_ESSAIS_SANTE) pour ne pas attendre 40 s par échec simulé ; sous ssh le
# préfixe de bac est ignoré (R vide), donc la valeur de l'extérieur ne compte pas.
ESSAIS_SANTE=40; PAUSE_SANTE=1
[ -z "$R" ] || { ESSAIS_SANTE="${OPMSG_ESSAIS_SANTE:-40}"; PAUSE_SANTE="${OPMSG_PAUSE_SANTE:-1}"; }
verifier() {   # $1 = SHA attendu ; imprime l'état et rend 0 si /health est ok ET porte ce SHA
  local essai=0 corps=""
  while [ "$essai" -lt "$ESSAIS_SANTE" ]; do
    corps="$(curl -sf --max-time 3 "http://127.0.0.1:$PORT/health" 2>/dev/null || true)"
    if [ -n "$corps" ] && printf '%s' "$corps" | node -e '
        let d = ""; process.stdin.on("data", c => d += c).on("end", () => {
          try { const j = JSON.parse(d);
                if (j.ok === true && typeof j.sha === "string" && j.sha.length >= 7 && process.argv[1].startsWith(j.sha)) {
                  console.log("/health : ok=" + j.ok + " instance=" + String(j.instance).replace(/[^a-z]/g, "") + " sha=" + j.sha.slice(0, 8));
                  process.exit(0); } } catch (e) {}
          process.exit(1); });' "$1"; then
      return 0
    fi
    essai=$((essai + 1)); sleep "$PAUSE_SANTE"
  done
  echo "/health : pas de réponse saine avec le sha ${1:0:8} après $ESSAIS_SANTE essais"
  return 1
}

basculer() {   # $1 = dossier de release visé
  ln -sfn "$1" "$LIEN.nouveau"
  mv -T "$LIEN.nouveau" "$LIEN"
}

# ── 4. La bascule, le redémarrage, et le RETOUR ARRIÈRE si ça ne tient pas ───────────────
PRECEDENT=""
[ -n "$ACTUEL" ] && [ "$ACTUEL" != "$SHA" ] && [ -d "$BASE/releases/$ACTUEL" ] && PRECEDENT="$BASE/releases/$ACTUEL"
basculer "$DEST"
AVANT_TXT="${ACTUEL:0:8}"; [ -n "$ACTUEL" ] || AVANT_TXT="première release"
echo "bascule : $AVANT_TXT → ${SHA:0:8}"
OK=0
if systemctl restart "$UNITE" && verifier "$SHA"; then OK=1; fi

if [ "$OK" != "1" ]; then
  echo "⛔ ${SHA:0:8} ne tient pas — retour arrière"
  if [ "$ACTUEL" = "$SHA" ]; then
    # Même code qu'avant : le lien ne bouge pas, il n'y a pas de « précédent » à rejoindre.
    echo "même release qu'avant : rien où revenir — lire le journal SUR le VPS (systemctl status $UNITE)"
  elif [ -n "$PRECEDENT" ]; then
    basculer "$PRECEDENT"
    systemctl restart "$UNITE" || true
    if verifier "$ACTUEL"; then echo "retour arrière réussi : le service est revenu sur ${ACTUEL:0:8}"
    else echo "⛔⛔ le retour arrière ne répond pas non plus — lire le journal SUR le VPS (systemctl status $UNITE)"; fi
  else
    # Première installation : il n'y a rien où revenir. On ne laisse pas tourner un service
    # que le contrôle a refusé.
    rm -f "$LIEN"
    systemctl stop "$UNITE" || true
    echo "première installation en échec : le service est arrêté"
  fi
  exit 1
fi

# Un « précédent » sous la main pour un retour manuel, et le ménage : on garde les quatre dernières
# releases, jamais la courante ni la précédente.
[ -z "$PRECEDENT" ] || ln -sfn "$PRECEDENT" "$BASE/precedent"
find "$BASE/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n +5 | cut -d' ' -f2- \
  | while IFS= read -r vieux; do
      [ "$vieux" = "$DEST" ] || [ "$vieux" = "$PRECEDENT" ] || rm -rf "$vieux"
    done
echo "déployé : $CIBLE ${SHA:0:8}"
