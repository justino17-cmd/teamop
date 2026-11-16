#!/bin/bash
# Assemble le prototype d'OP MESSAGES (côté Pro) depuis ses parties.
#   bash design/opmessages/prototype/assembler.sh [fichier-artefact]
#   · apercu/prototype-op-messages.html : la page du dépôt — elle charge le VRAI apercu/opcourrier.js à côté d'elle et porte en ligne la source de
#     DÉMONSTRATION du courrier (copie de scratchpad/courrier/source-demo.js, que le site ne sert pas) ;
#   · [fichier-artefact], si donné : la même page tout en ligne, sans doctype (une page d'artefact ne charge aucun fichier voisin).
# Puis : node apple/OPMessages/synchroniser.js (la page embarquée du projet Xcode).
set -e
cd "$(dirname "$0")"
DEPOT="$(cd ../../.. && pwd)"
style() { echo '<style>'; cat 10-style.css 12-annoter.css; echo '</style>'; }
moi() { echo '<script>'; cat 15-icones.js 20-coeur.js 30-vues.js 40-direct.js 45-annoter.js 50-gestes.js; echo '</script>'; }
demo() { echo '<script>'; echo '/* Source de DÉMONSTRATION du courrier : copie de scratchpad/courrier/source-demo.js (noms et adresses inventés). Ne pas modifier ici. */'; cat "$DEPOT/scratchpad/courrier/source-demo.js"; echo '</script>'; }
{ cat <<'T'
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#f2f2f7">
<title>Prototype OP MESSAGES</title>
<!-- Aperçu de travail (16 novembre 2026) : le PROTOTYPE d'OP MESSAGES, CÔTÉ PRO, refait de A à Z à la demande de Justin (« refais tout, style
     Apple », « concentre-toi sur le côté pro »). Les rubriques sont celles de la vraie application : Tableau de bord, Messages, Contacts, Appels,
     Réunions, Agenda, Courrier, et le Profil. DONNÉES ENTIÈREMENT FICTIVES (« Clim Services 17 », adresses en .example), aucun appel à un serveur,
     rien ne s'enregistre. Ce n'est PAS OP MESSAGES : la vraie page est servie par server-msg/.
     ⛔ CETTE PAGE EST FABRIQUÉE : ses parties sont dans design/opmessages/prototype/ (assembler.sh). On modifie les parties, jamais ce fichier.
     ⛔ LE COURRIER N'EST PAS UNE MAQUETTE (Justin : « la boîte mail, je veux celle qui était ») : la rubrique monte le VRAI module opcourrier.js,
     chargé à côté de cette page, avec sa source de démonstration. -->
T
style; echo '</head>'; echo '<body>'; cat 60-corps.html; echo '<script src="opcourrier.js"></script>'; demo; moi; echo '</body></html>'; } > "$DEPOT/apercu/prototype-op-messages.html"
if [ -n "$1" ]; then { echo '<title>Prototype OP MESSAGES</title>'; echo '<meta name="theme-color" content="#f2f2f7">'; style; cat 60-corps.html; echo '<script>'; cat "$DEPOT/opcourrier.js"; echo '</script>'; demo; moi; } > "$1"; fi
node -e "
const s=require('fs').readFileSync('$DEPOT/apercu/prototype-op-messages.html','utf8');const m=[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)];m.forEach(x=>new Function(x[1]));console.log('syntaxe OK',m.length,'blocs,',s.length,'octets');"
