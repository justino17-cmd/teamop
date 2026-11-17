#!/bin/bash
# LE DERNIER PASSAGE : rejoue TOUTES les sondes du prototype sur la version réunie, une à la fois, et rend un tableau.
#
#   bash scratchpad/proto-final/tout-rejouer.sh              # tout
#   bash scratchpad/proto-final/tout-rejouer.sh menu mail    # seulement ces familles (préfixe du nom de fichier)
#   SAUF="atelier mail" bash …/tout-rejouer.sh               # tout sauf ces familles
#
# Règles (elles viennent des chutes de la machine du 16 novembre) :
#   - UNE sonde à la fois, au premier plan, avec un délai (DELAI secondes, 590 par défaut) ; le plafond de navigateurs de lib.js
#     fait le reste si d'autres agents travaillent en même temps ;
#   - une famille qui a son « <famille>-tout.sh » est rejouée par LUI (il connaît ses profils) ; sinon chaque « <famille>-*.js »
#     est lancée telle quelle, sauf les outils (commun, outils, kit, captures, explore, mutations, export) ;
#   - le verdict d'une sonde est son CODE DE SORTIE ; le « N ✓ · M ✗ » n'est qu'un affichage (un banc qui imprime son total puis
#     meurt a l'air vert et ne l'est pas — CLAUDE.md) ; une sonde qui n'imprime aucun total est comptée « sans total », à relire ;
#   - le journal complet va HORS du dépôt (dossier temporaire), le tableau final s'imprime et se range dans $SORTIE/tableau.txt.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../.." || exit 1
SORTIE="${SORTIE:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/dernier-passage}"; mkdir -p "$SORTIE"
J="$SORTIE/journal.log"; T="$SORTIE/tableau.txt"; : > "$J"; : > "$T"
DELAI="${DELAI:-590}"
VOULUES="$*"

total_ok=0; total_ko=0; total_muet=0; sondes=0; rouges=""; sans_script=""
note(){ echo "$1" | tee -a "$T"; }
veut(){ # veut <famille> : vrai si la famille est demandée et pas écartée
  local f="$1"; for s in $SAUF; do [ "$s" = "$f" ] && return 1; done
  [ -z "$VOULUES" ] && return 0; for v in $VOULUES; do [ "$v" = "$f" ] && return 0; done; return 1; }
lance(){ # lance <nom affiché> <commande…>
  local nom="$1"; shift; local t0=$(date +%s)
  echo "──────── $nom" >> "$J"
  local s; s=$(timeout "$DELAI" "$@" 2>&1); local code=$?
  echo "$s" >> "$J"
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ *(·)? *[0-9]+ ✗' | tail -1)
  local d=$(( $(date +%s)-t0 )); sondes=$((sondes+1))
  if [ $code -eq 0 ] && [ -n "$b" ]; then total_ok=$((total_ok+1)); note "  ✓ ${d}s  $nom :: $b"
  elif [ $code -eq 0 ] && [ -n "$SANS_TOTAL_OK" ]; then total_ok=$((total_ok+1)); note "  ✓ ${d}s  $nom :: code 0 (ce contrôle n'imprime pas de total)"
  elif [ $code -eq 0 ]; then total_muet=$((total_muet+1)); note "  ? ${d}s  $nom :: code 0 mais AUCUN total imprimé (à relire)"
  else total_ko=$((total_ko+1)); rouges="$rouges\n    $nom (code $code${b:+, $b})"
       note "  ✗ ${d}s  $nom :: code $code ${b:+· $b}$([ $code -eq 124 ] && echo ' · DÉLAI DÉPASSÉ')"
       echo "$s" | grep -E '✗' | grep -vE '^[[:space:]]*[0-9]+ ✓' | head -4 | cut -c1-240 | sed 's/^/        /' | tee -a "$T"; fi; }

famille(){ # famille <dossier> <famille>
  local dos="$1" fam="$2"
  veut "$fam" || return 0
  note ""; note "== $fam ($dos)"
  if [ -f "$dos/$fam-tout.sh" ]; then
    # Le script de la famille imprime une ligne par sonde : on reprend SES lignes, et son code de sortie ne suffit pas
    # (les « -tout.sh » d'avant ne sortaient pas en 1) : toute ligne « code=N » avec N≠0 compte rouge.
    local t0=$(date +%s); local s; s=$(CAP="$SORTIE/$fam" timeout $((DELAI*12)) bash "$dos/$fam-tout.sh" 2>&1); local code=$?
    echo "──────── $fam-tout.sh (code $code)" >> "$J"; echo "$s" >> "$J"
    # Deux écritures existent : « 12s code=0 nom :: 40 ✓ · 0 ✗ » (atelier) et « nom 40 ✓ · 0 ✗ (code 0) » (boîte mail).
    local lignes; lignes=$(echo "$s" | grep -E 'code=[0-9]+ |\(code [0-9]+\)')
    if [ -z "$lignes" ]; then
      sondes=$((sondes+1)); total_ko=$((total_ko+1)); rouges="$rouges\n    $fam-tout.sh : aucune ligne de sonde lue (code $code)"
      note "  ✗ $fam-tout.sh n'a rendu AUCUNE ligne de sonde (code $code) — voir le journal"; return; fi
    while IFS= read -r l; do
      sondes=$((sondes+1))
      local c; c=$(echo "$l" | grep -oE 'code[= ][0-9]+' | grep -oE '[0-9]+' | tail -1)
      if [ "$c" = 0 ] && echo "$l" | grep -qE '[0-9]+ ✓'; then total_ok=$((total_ok+1)); note "  ✓ $l"
      elif [ "$c" = 0 ]; then total_muet=$((total_muet+1)); note "  ? $l  (aucun total)"
      else total_ko=$((total_ko+1)); rouges="$rouges\n    $fam : $(echo "$l" | cut -c1-120)"; note "  ✗ $l"; fi
    done <<< "$lignes"
    [ $code -eq 124 ] && { total_ko=$((total_ko+1)); rouges="$rouges\n    $fam-tout.sh : DÉLAI DÉPASSÉ"; note "  ✗ $fam-tout.sh : DÉLAI DÉPASSÉ, la suite de la famille n'a pas été jouée"; }
    # Une famille dont le script sort rouge sans qu'aucune ligne soit rouge cache quelque chose : on le dit.
    [ $code -ne 0 ] && [ $code -ne 124 ] && ! echo "$lignes" | grep -qE 'code[= ][1-9]' && { total_ko=$((total_ko+1)); rouges="$rouges\n    $fam-tout.sh : code $code sans ligne rouge"; note "  ✗ $fam-tout.sh sort en $code sans ligne rouge — voir le journal"; }
    return
  fi
  # Pas de script de rejeu : on lance ce qui se lance sans argument, et on le DIT (une sonde à arguments n'est alors jouée
  # que sur ses valeurs par défaut — la couverture de la famille est partielle tant que son « -tout.sh » n'existe pas).
  sans_script="$sans_script $fam"; note "  ⚠ pas de $fam-tout.sh : sondes lancées sans argument (couverture partielle)"
  local f
  for f in "$dos/$fam"-*.js; do
    [ -f "$f" ] || continue
    case "$(basename "$f")" in *-commun.js|*-outils.js|*-kit.js|*-captures.js|*-explore.js|*-mutations.js|*-export.js|*-balayage.js) continue;; esac
    lance "$(basename "$f")" node "$f"
  done
  for f in "$dos/$fam"-*.sh; do [ -f "$f" ] || continue; case "$(basename "$f")" in *-tout.sh) continue;; esac; lance "$(basename "$f")" bash "$f"; done
}

familles_de(){ # familles_de <dossier> : les préfixes (avant le premier tiret) des fichiers du dossier
  ls "$1" 2>/dev/null | grep -E '\.(js|sh)$' | sed -E 's/-.*$//' | sort -u; }

note "DERNIER PASSAGE — $(date '+%d/%m %H:%M') — commit $(git rev-parse --short HEAD) — $(git status --short | wc -l) fichier(s) non commité(s)"
note "Pages : $(wc -c < apercu/prototype-op-gestion.html) o (prototype) · $(wc -c < apercu/prototype-documents.html) o (atelier) · $(wc -c < apercu/prototype-courrier.js 2>/dev/null || echo 0) o (courrier)"

# 0. Ce qui ne demande pas de navigateur : compilation des pages, bancs du dépôt.
if veut bancs; then
  note ""; note "== bancs (sans navigateur)"
  SANS_TOTAL_OK=1 lance "compiler-pages.js" node scratchpad/proto-final/sondes/compiler-pages.js
  SANS_TOTAL_OK=1 lance "verifier-syntaxe.js" node scripts/verifier-syntaxe.js
  for n in 835 836 837 1008 2994; do [ -f tests/test-$n.js ] && lance "test-$n.js" node tests/test-$n.js; done
  SANS_TOTAL_OK=1 lance "verif-secrets.sh" bash scripts/verif-secrets.sh
fi

# 1. Les sondes des lots (sondes/), famille par famille ; « compiler » est déjà passé.
for fam in $(familles_de scratchpad/proto-final/sondes); do [ "$fam" = compiler ] && continue; famille scratchpad/proto-final/sondes "$fam"; done
# 2. Les sondes de la campagne (campagne/sondes/), partie par partie.
for fam in $(familles_de scratchpad/proto-final/campagne/sondes); do famille scratchpad/proto-final/campagne/sondes "$fam"; done

note ""
note "TOTAL : $sondes sonde(s) · $total_ok verte(s) · $total_ko ROUGE(S) · $total_muet sans total"
[ -n "$rouges" ] && note "ROUGES :$(echo -e "$rouges")"
[ -n "$sans_script" ] && note "FAMILLES SANS SCRIPT DE REJEU (couverture partielle) :$sans_script"
note "Journal complet : $J"
pgrep -f 'chrome-linux/chrome' >/dev/null && note "⚠ des navigateurs tournent encore (les miens ou ceux d'autres agents) : $(pgrep -fc 'chrome-linux/chrome')"
[ $total_ko -eq 0 ] && [ $total_muet -eq 0 ]
