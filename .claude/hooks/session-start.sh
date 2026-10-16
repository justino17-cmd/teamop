#!/bin/bash
# Démarrage d'une session Claude Code DISTANTE (web, application) : installe ce que la CI installe,
# pour que les bancs s'exécutent au lieu de se sauter.
#
# ⛔ Pourquoi : sans `server/node_modules`, les suites qui montent le VRAI serveur (726, 735, 641…) écrivent
# « 0 ✓ 0 ✗ » et ont l'air vertes sans avoir rien exécuté — mesuré le 16 octobre 2026 dans une session
# distante. Même chose pour `server-msg/node_modules` (OP MESSAGES) et ESLint (`test-818`). Les trois étapes
# recopient celles de `.github/workflows/ci.yml` : si la CI change, ce fichier change avec elle.
#
# Rien sur le Mac de Justin (`CLAUDE_CODE_REMOTE` absent) : ses copies ont leurs propres dépendances.
# `npm ci` et non `npm install` : `npm install` peut réécrire `package-lock.json`, et un arbre sale au
# démarrage fausse tout `git status` de la session. On ne réinstalle que si le verrou a changé
# (empreinte rangée dans `node_modules/`) : le conteneur est mis en cache après ce script, le démarrage
# suivant ne refait rien.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

racine="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

installer() {  # $1 = dossier, la suite = options de npm ci
  local dossier="$racine/$1"; shift
  [ -f "$dossier/package-lock.json" ] || return 0
  local empreinte; empreinte="$(sha256sum "$dossier/package-lock.json" | cut -d' ' -f1)"
  if [ -f "$dossier/node_modules/.empreinte-verrou" ] && [ "$(cat "$dossier/node_modules/.empreinte-verrou")" = "$empreinte" ]; then
    echo "[démarrage] $(basename "$dossier") : dépendances déjà à jour"
    return 0
  fi
  echo "[démarrage] $(basename "$dossier") : npm ci $*"
  npm ci "$@" --no-audit --no-fund --loglevel=error --prefix "$dossier"
  echo "$empreinte" > "$dossier/node_modules/.empreinte-verrou"
}

installer server --omit=dev
installer server-msg --omit=dev --ignore-scripts

# Même version que `ci.yml` et `verification.yml`, épinglée.
if [ "$(eslint --version 2>/dev/null || true)" != "v10.1.0" ]; then
  echo "[démarrage] ESLint 10.1.0"
  npm install -g eslint@10.1.0 --no-audit --no-fund --loglevel=error
fi

# `require('eslint')` de test-818 trouve le paquet global par NODE_PATH, comme dans la CI.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export NODE_PATH=\"$(npm root -g)\"" >> "$CLAUDE_ENV_FILE"
fi
