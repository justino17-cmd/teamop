#!/usr/bin/env bash
# Assemble le site PUBLIC de teamop.fr dans un dossier à part (par défaut `_site`).
#
# Pourquoi : GitHub Pages servait la RACINE du dépôt, donc tout ce qui y vit. Mesuré le
# 17 octobre 2026 : https://teamop.fr/CLAUDE.md, /REPRISE.md, /.claude/agents/gardien.md et
# /firestore.rules répondaient 200 — l'architecture du serveur, les revues de sécurité et le
# parcours des données des clients, lisibles par n'importe qui. Le site se publie désormais
# depuis ce dossier (`.github/workflows/publication-site.yml`).
#
# ⛔ C'EST UNE LISTE BLANCHE. Un fichier interne ajouté demain à la racine ne part pas en ligne
# par défaut ; une page neuve, si : les pages, scripts et manifestes de la racine entrent par
# leur FORME (*.html, *.js, *.webmanifest), sans toucher à ce fichier. Un DOSSIER neuf servi,
# lui, s'ajoute ici — `tests/test-1008.js` refuse une page qui pointe vers un fichier absent.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="${1:-_site}"
rm -rf "$DEST"
mkdir -p "$DEST"

# La racine : pages, scripts servis, manifestes, et ce que le domaine attend (CNAME, robots…).
# ⚠️ `rubriques-choix.css` (la grille « Vos rubriques ») est NOMMÉ : un .css de la racine n'entre pas par sa forme, et une page qui le charge
#    sans lui serait cassée chez le client (23 octobre 2026).
# ⛔ `metiers.json` n'est PAS publié (relecture du 23 octobre 2026) : c'est le référentiel de travail — ce que chaque métier n'a pas encore
#    (`aCreer`, `aVerifier`), les notes, les métiers écartés, les `pourquoi` de chaque métier fermé. Servi à https://teamop.fr/metiers.json,
#    n'importe qui y lisait la feuille de route de 23 métiers (« aucun seuil de CO dans l'application de chauffage »). Aucune page ne le
#    charge : l'espace client, la page de paiement et la Tour lisent `GET /api/metiers` (déjà filtré : métiers OUVERTS seulement, sans notes),
#    le serveur le lit dans le dépôt cloné (`../metiers.json`) et `scripts/site-marine.js` à la génération. `tests/test-1008.js` exige son absence.
for f in *.html *.js *.webmanifest rubriques-choix.css favicon.ico robots.txt llms.txt index.md sitemap.xml CNAME .nojekyll; do
  [ -f "$f" ] || continue
  case "$f" in
    beta-build.js) continue ;;   # fabrique beta.html depuis app.html : un outil, pas une page
    demo-build.js) continue ;;   # fabrique demo.html depuis app.html : un outil, pas une page
  esac
  cp "$f" "$DEST/"
done

# Les dossiers servis tels quels. `.well-known` porte assetlinks.json (l'application Android). `blog` : les pages FABRIQUÉES
# par scripts/blog.js (24 octobre 2026) — ses sources, `contenu/blog/`, restent hors du site.
for d in icons vitrine sons screenshots apercu blog .well-known; do
  [ -d "$d" ] && cp -R "$d" "$DEST/"
done

# ⛔ La garde : rien d'interne n'entre, même caché dans un dossier servi. Un fichier de ce genre
# arrêté ici est une décision à prendre (le servir exprès, ou le ranger ailleurs), jamais à taire.
# ⚠ UNE seule exception aux .md : `./index.md`, le jumeau Markdown de l'accueil, FABRIQUÉ par scripts/site-marine.js (21 octobre 2026) —
# nommé par son chemin : un autre index.md, plus bas, reste refusé.
interdits=$(cd "$DEST" && find . -path ./index.md -prune -o \( -name '*.md' -o -name '*.rules' -o -name '.claude' \
  -o -name '.github' -o -name '.githooks' -o -name '.mcp.json' -o -name 'skills-lock.json' \
  -o -name 'server' -o -name 'server-msg' -o -name 'tests' -o -name 'scratchpad' \) -print)
if [ -n "$interdits" ]; then
  echo "::error::fichiers internes dans le site assemblé — rien ne part :" >&2
  echo "$interdits" >&2
  exit 1
fi
echo "Site assemblé dans $DEST : $(find "$DEST" -type f | wc -l) fichiers."
