#!/bin/bash
# Fabrique, depuis la source unique de l'atelier (page.source), les deux pages qui en vivent :
#   apercu/prototype-documents.html : l'atelier servi DANS le prototype OP GESTION (squelette des pages voisines) ;
#   <dossier temporaire>/essai.html : la page seule, pour les sondes (jamais dans le dépôt).
# Jamais de retouche à la main de la copie : on corrige page.source, puis on relance cette commande.
set -e
ICI="$(cd "$(dirname "$0")" && pwd)"; RACINE="$(cd "$ICI/../../.." && pwd)"
SRC="$ICI/page.source"; CIBLE="${1:-$RACINE/apercu/prototype-documents.html}"
# la source doit compiler AVANT d'écraser la copie : une page qui ne compile pas est une page blanche
node -e '
const s=require("fs").readFileSync(process.argv[1],"utf8");
const sc=[...s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
if(!sc.length){ console.error("✗ aucun script dans la source"); process.exit(1) }
for(const x of sc){ try{ new Function(x) }catch(e){ console.error("✗ la source ne compile pas : "+e.message); process.exit(1) } }
' "$SRC"
printf '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"></head><body>\n' > "$CIBLE.tmp"
cat "$SRC" >> "$CIBLE.tmp"; printf '\n</body>\n</html>\n' >> "$CIBLE.tmp"
mv "$CIBLE.tmp" "$CIBLE"; echo "✓ $CIBLE ($(wc -c < "$CIBLE") octets)"
