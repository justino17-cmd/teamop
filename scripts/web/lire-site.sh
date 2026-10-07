#!/usr/bin/env bash
# ══ LIRE UN SITE — Crawl4AI, installé à la première utilisation ═══════════════════════════════════════════════════════════
# Justin, 7 octobre 2026 : « je le veux quand je travaille avec mon iPhone et mon Mac ». Le même outil sert dans une session
# Claude (le conteneur du cloud, depuis l'iPhone comme depuis le Mac) et sur le Mac lui-même : il s'installe tout seul, une fois,
# dans un environnement à part (jamais dans le dépôt ni dans le système), puis il lit.
#
#   bash scripts/web/lire-site.sh https://exemple.fr                 → le texte de la page, en markdown propre
#   bash scripts/web/lire-site.sh https://exemple.fr --liens          → la liste des liens de la page (internes d'abord)
#   bash scripts/web/lire-site.sh https://exemple.fr --pages 10       → la page et jusqu'à 10 pages du même site
#
# ⛔ Ce qu'on lit, on le lit comme un visiteur : robots.txt et conditions du site respectés, pas de données sensibles, et des
#    coordonnées de personnes seulement pour un usage professionnel qu'elles peuvent refuser (RGPD) — voir LISEZMOI.md.
set -euo pipefail

ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="${TEAMOP_WEB_ENV:-$HOME/.cache/teamop-web}"
PY="$ENV/bin/python"

if [ ! -x "$PY" ] || ! "$PY" -c "import crawl4ai" 2>/dev/null; then
  echo "Première utilisation : installation de Crawl4AI dans $ENV (une minute environ)…" >&2
  python3 -m venv "$ENV"
  "$PY" -m pip install -q --upgrade pip
  "$PY" -m pip install -q crawl4ai
  if [ -d /opt/pw-browsers ]; then
    # ⛔ Le conteneur du cloud fournit SON Chromium (on ne le télécharge pas) : on prend la version de Playwright qui le connaît.
    # La version se lit sur le nom du dossier (chromium-1194 = Playwright 1.56) — table tenue ici, à compléter si le conteneur change.
    REV="$(ls /opt/pw-browsers | sed -n 's/^chromium-\([0-9]*\)$/\1/p' | sort -n | tail -1)"
    case "$REV" in
      1194) "$PY" -m pip install -q "playwright==1.56.0" ;;
      *) echo "⚠️ Chromium $REV du conteneur : version de Playwright inconnue ici, on garde celle de Crawl4AI." >&2 ;;
    esac
  else
    # Sur un Mac (ou tout poste) : Playwright télécharge son navigateur, une fois.
    "$PY" -m playwright install chromium
  fi
  echo "Installé." >&2
fi

if [ -d /opt/pw-browsers ]; then export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers; fi
exec "$PY" -I "$ICI/lire_site.py" "$@"
