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
# la politique de contenu et celle du référent (S10 de l'audit de sécurité) : la même que celle des trois pages voisines ; une variable entre guillemets doubles, parce qu'elle porte des apostrophes
# ⚠️ UNE différence avec les trois pages voisines : cette page charge les treize polices du compositeur (feuille de fonts.googleapis.com, fichiers de
# fonts.gstatic.com). Sans ces deux hôtes dans style-src et font-src, le choix d'une police ne change plus rien (vu le 17 novembre : la politique
# posée telle quelle les aurait bloquées même si la feuille était restée).
POLITIQUE="default-src 'none'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; img-src 'self' data: blob: https://tiles.openfreemap.org https://server.arcgisonline.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' blob: https://tiles.openfreemap.org https://server.arcgisonline.com; frame-src 'self' blob: data:; worker-src blob:; media-src 'self' blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'"
printf '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="%s"><meta name="referrer" content="same-origin"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"></head><body>\n' "$POLITIQUE" > "$CIBLE.tmp"
cat "$SRC" >> "$CIBLE.tmp"; printf '\n</body>\n</html>\n' >> "$CIBLE.tmp"
mv "$CIBLE.tmp" "$CIBLE"; echo "✓ $CIBLE ($(wc -c < "$CIBLE") octets)"
