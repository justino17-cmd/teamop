#!/bin/bash
# Prépare la publication de l'artefact « Prototype OP GESTION » : la page principale SANS son squelette (l'outil Artifact
# l'enveloppe lui-même), dans un dossier HORS du dépôt. Les autres fichiers se publient tels quels, par leur chemin.
#   bash scratchpad/proto-final/preparer-publication.sh [dossier de sortie]
# Puis, par l'outil Artifact (action publish) :
#   url       = https://claude.ai/artifact/8K6fXjo4jRwTs4pFRUUhux
#   file_path = <dossier>/index.html
#   files     = { "prototype-documents.html": "/home/user/teamop/apercu/prototype-documents.html",
#                 "prototype-comptabilite.html": "/home/user/teamop/apercu/prototype-comptabilite.html",
#                 "prototype-paiement.html": "/home/user/teamop/apercu/prototype-paiement.html",
#                 "prototype-courrier.js": "/home/user/teamop/apercu/prototype-courrier.js" }
#   (ne pas repasser « icon » ; « capabilities » : l'omettre garde la déclaration en place)
# Le script REFUSE de préparer une page qui ne compile pas ou qui demande un fichier voisin absent.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../.." || exit 1
SORTIE="${1:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/pub}"; mkdir -p "$SORTIE"
node scratchpad/proto-final/sondes/compiler-pages.js || { echo "✗ une page ne compile pas : rien n'est préparé"; exit 1; }
node - "$SORTIE" <<'JS' || exit 1
const fs = require('fs'), path = require('path'), sortie = process.argv[2];
let s = fs.readFileSync('apercu/prototype-op-gestion.html', 'utf8');
const i = s.indexOf('<body'), j = s.indexOf('>', i);
if (i < 0) { console.log('✗ pas de <body> dans le prototype'); process.exit(1); }
const tete = s.slice(0, i);
const corps = s.slice(j + 1).replace(/\s*<\/body>\s*<\/html>\s*$/, '\n');
// De l'en-tête on garde le titre, les styles, les liens : le squelette (doctype, html, head, méta de base) est reposé par l'outil.
const utile = tete.replace(/<!doctype[^>]*>/i, '').replace(/<html[^>]*>/i, '').replace(/<\/?head>/gi, '')
  .replace(/<meta[^>]*(charset|viewport|robots)[^>]*>/gi, '').replace(/<!--[\s\S]*?-->/g, '').trim();
const page = utile + '\n' + corps;
// Contrôles : un titre, aucun reste de squelette, et chaque fichier voisin demandé par la page existe dans apercu/.
const ko = [];
if (!/<title>[^<]{2,60}<\/title>/.test(page.slice(0, 8192))) ko.push('pas de <title> dans les 8 premiers Ko');
if (/<\/body>|<\/html>|<!doctype/i.test(page)) ko.push('un reste de squelette (doctype, </body> ou </html>)');
const voisins = new Set();
for (const m of page.matchAll(/(?:src|href)=["'](prototype-[a-z-]+\.(?:html|js))/g)) voisins.add(m[1]);
for (const m of page.matchAll(/['"`](prototype-[a-z-]+\.(?:html|js))(?:[?#][^'"`]*)?['"`]/g)) voisins.add(m[1]);
for (const v of voisins) if (!fs.existsSync(path.join('apercu', v))) ko.push('fichier voisin demandé mais absent : ' + v);
const attendus = ['prototype-documents.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'prototype-courrier.js'];
for (const a of attendus) if (!voisins.has(a)) console.log('⚠ la page ne cite pas ' + a + ' (il est pourtant dans la liste à publier)');
for (const v of voisins) if (!attendus.includes(v)) ko.push('fichier voisin HORS de la liste à publier : ' + v + ' — à ajouter au « files » de la publication');
if (ko.length) { for (const k of ko) console.log('✗ ' + k); process.exit(1); }
fs.writeFileSync(path.join(sortie, 'index.html'), page);
console.log('✓ ' + path.join(sortie, 'index.html') + ' : ' + page.length + ' caractères · voisins : ' + [...voisins].join(', '));
JS
for f in prototype-documents.html prototype-comptabilite.html prototype-paiement.html prototype-courrier.js; do printf '  %-32s %s o\n' "$f" "$(wc -c < apercu/$f)"; done
echo "commit $(git rev-parse --short HEAD) · $(git status --short | wc -l) fichier(s) non commité(s)"
