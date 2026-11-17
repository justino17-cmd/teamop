// Compile le JavaScript de chaque page du prototype (ou de celles passées en argument). verifier-syntaxe.js ne lit pas apercu/ :
// une page qui ne compile pas est une page BLANCHE, et deux lots fusionnés sans conflit peuvent déclarer deux fois le même nom.
// Par défaut : les QUATRE pages du prototype et ses modules .js (17 novembre : seul le prototype était compilé par défaut —
// l'atelier, la Comptabilité, le Paiement et le module de courrier pouvaient mourir sans que ce contrôle, que chaque agent
// lance avant de pousser, le voie).
const fs = require('fs'), path = require('path'), vm = require('vm');
const dossier = path.join(__dirname, '..', '..', '..', 'apercu');
const DEFAUT = ['prototype-op-gestion.html', 'prototype-documents.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'prototype-courrier.js'];
const pages = process.argv.slice(2).length ? process.argv.slice(2) : DEFAUT.filter(p => fs.existsSync(path.join(dossier, p)));
let ko = 0;
// Une page attendue qui manque est un défaut (le prototype la charge) : on le dit au lieu de la sauter en silence.
if (!process.argv.slice(2).length) for (const p of DEFAUT) if (!fs.existsSync(path.join(dossier, p))) { ko++; console.log('✗', p, ': ABSENTE d\'apercu/'); }
// Un chemin absolu se lit tel quel : c'est ce qui permet d'éprouver ce contrôle sur une COPIE cassée, hors du dépôt.
for (const p of pages) { const s = fs.readFileSync(path.isAbsolute(p) ? p : path.join(dossier, p), 'utf8'); let n = 0;
  if (/\.js$/.test(p)) { try { new vm.Script(s, { filename: p }); console.log('✓', p, ': module compilé (' + s.length + ' caractères)'); } catch (e) { ko++; console.log('✗', p, ':', e.message); } continue; }
  for (const m of s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) { n++; try { new Function(m[1]); } catch (e) { ko++; console.log('✗', p, 'script', n, ':', e.message); } }
  console.log(n ? '✓' : '✗', p, ':', n, 'script(s) compilé(s)'); if (!n) ko++; }
process.exit(ko ? 1 : 0);
