#!/bin/bash
# Les sondes qui éprouvent la politique de contenu (securite-politique) ou la carte servent les six bibliothèques tierces de la page depuis une COPIE LOCALE
# (le navigateur ne sort jamais) : scratchpad/dep/, hors dépôt — donc effacée à chaque redémarrage de la machine (vu le 17/11 : securite-politique tombait sur
# « la carte a chargé ses trois bibliothèques » = false, sans que la page y soit pour rien). Ce script la RESTAURE si elle manque, et refuse une copie qui n'est pas
# celle que la page attend : l'empreinte sha384 de chaque fichier est comparée à celle écrite dans apercu/prototype-op-gestion.html / prototype-documents.html.
# Sort en 1 si une copie manque ET ne peut pas être téléchargée, ou si l'empreinte diffère.
ICI="$(cd "$(dirname "$0")" && pwd)"; RACINE="$(cd "$ICI/../../.." && pwd)"
D="${DEP_LOCAL:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/dep}"; mkdir -p "$D"
mal=0
for u in https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js \
         https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.css https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.js \
         https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js; do
  f="$D/$(basename "$u")"
  [ -s "$f" ] || curl -sS -m 90 -o "$f" "$u" || { echo "bibliothèques : $(basename "$u") introuvable"; mal=1; continue; }
  h="sha384-$(openssl dgst -sha384 -binary "$f" | openssl base64 -A)"
  if ! grep -qF "$h" "$RACINE/apercu/prototype-op-gestion.html" "$RACINE/apercu/prototype-documents.html"; then echo "bibliothèques : $(basename "$u") n'a pas l'empreinte que la page attend ($h)"; rm -f "$f"; mal=1; fi
done
[ $mal = 0 ] && echo "bibliothèques : six copies locales, empreintes conformes ($D)"
exit $mal
